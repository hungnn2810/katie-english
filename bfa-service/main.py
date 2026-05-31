import json
import logging
import math
import os
import re
import struct
import subprocess
import tempfile
import uuid
import wave
from pathlib import Path
from typing import List, Optional

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from langdetect import detect_langs

logger = logging.getLogger("bfa_service")
logging.basicConfig(format="%(message)s", level=logging.INFO)

app = FastAPI()

AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "eastus")
AZURE_PHONEME_CORRECT_THRESHOLD = int(os.getenv("AZURE_PHONEME_CORRECT_THRESHOLD", "80"))
AZURE_PHONEME_SIMILAR_THRESHOLD = int(os.getenv("AZURE_PHONEME_SIMILAR_THRESHOLD", "50"))

MAX_UPLOAD_BYTES = int(os.getenv("BFA_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
MIN_WORD_SCORE = int(os.getenv("BFA_MIN_WORD_SCORE", "70"))
AUDIO_MIN_DURATION_S = float(os.getenv("BFA_MIN_DURATION_S", "0.5"))
AUDIO_MAX_DURATION_S = float(os.getenv("BFA_MAX_DURATION_S", "15.0"))
ENERGY_THRESHOLD_DB  = float(os.getenv("BFA_ENERGY_THRESHOLD_DB", "-50.0"))


def _safe_suffix(filename: Optional[str]) -> str:
    raw = Path(filename or "audio.webm").suffix or ".webm"
    if re.fullmatch(r'\.[a-zA-Z0-9]{1,10}', raw):
        return raw
    return ".webm"


def _to_wav(input_path: Path, output_path: Path) -> None:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(input_path),
         "-af", "loudnorm=I=-16:LRA=11:TP=-1.5",
         "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
         "-f", "wav", str(output_path)],
        capture_output=True, timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()}")


def _wav_duration_s(wav_path: Path) -> float:
    with wave.open(str(wav_path), 'rb') as wf:
        return wf.getnframes() / wf.getframerate()


def _rms_dbfs(wav_path: Path) -> float:
    with wave.open(str(wav_path), 'rb') as wf:
        raw = wf.readframes(wf.getnframes())
    samples = struct.unpack(f'{len(raw) // 2}h', raw)
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) if samples else 0
    if rms == 0:
        return -100.0
    return 20 * math.log10(rms / 32768)


def _azure_pa_assess(wav_path: Path, reference_text: str) -> dict:
    """Call Azure Pronunciation Assessment REST API. Returns parsed JSON response."""
    if not AZURE_SPEECH_KEY:
        raise RuntimeError("AZURE_SPEECH_KEY not set")
    url = (
        f"https://{AZURE_SPEECH_REGION}.stt.speech.microsoft.com"
        "/speech/recognition/conversation/cognitiveservices/v1"
    )
    params = {
        "language": "en-US",
        "format": "detailed",
        "pronunciation.referenceText": reference_text,
        "pronunciation.granularity": "Phoneme",
        "pronunciation.gradingSystem": "HundredMark",
        "pronunciation.enableMiscue": "True",
    }
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
    }
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()
    resp = requests.post(url, params=params, headers=headers, data=wav_bytes, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Azure PA error {resp.status_code}: {resp.text}")
    return resp.json()


def _azure_stt(wav_path: Path) -> dict:
    """Call Azure STT only (no pronunciation assessment). Returns parsed JSON."""
    if not AZURE_SPEECH_KEY:
        raise RuntimeError("AZURE_SPEECH_KEY not set")
    url = (
        f"https://{AZURE_SPEECH_REGION}.stt.speech.microsoft.com"
        "/speech/recognition/conversation/cognitiveservices/v1"
    )
    params = {"language": "en-US", "format": "detailed"}
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
    }
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()
    resp = requests.post(url, params=params, headers=headers, data=wav_bytes, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Azure STT error {resp.status_code}: {resp.text}")
    return resp.json()


def _map_phoneme_ops(word_data: dict) -> List[dict]:
    """Map Azure word result to our PhonemeOp list."""
    error_type = word_data.get("PronunciationAssessment", {}).get("ErrorType", "None")
    phonemes = word_data.get("Phonemes", [])
    ops = []
    for p in phonemes:
        symbol = p.get("Phoneme", "")
        score = p.get("PronunciationAssessment", {}).get("AccuracyScore", 0.0)
        offset_ticks = p.get("Offset", 0)
        duration_ticks = p.get("Duration", 0)
        start = round(offset_ticks / 10_000_000, 4)
        dur = round(duration_ticks / 10_000_000, 4)

        if error_type == "Omission":
            status = "missing"
        elif score >= AZURE_PHONEME_CORRECT_THRESHOLD:
            status = "correct"
        elif score >= AZURE_PHONEME_SIMILAR_THRESHOLD:
            status = "similar"
        else:
            status = "substituted"

        ops.append({
            "status": status,
            "expected": symbol,
            "aligned": None if status == "missing" else symbol,
            "start": None if status == "missing" else start,
            "end": None if status == "missing" else round(start + dur, 4),
            "duration": None if status == "missing" else dur,
        })
    return ops


@app.get("/health")
def health():
    return {"status": "ok", "azure_key_set": bool(AZURE_SPEECH_KEY)}


@app.post("/analyze")
async def analyze(
    audio: UploadFile = File(...),
    word: str = Form(...),
    expected_phonemes: str = Form("[]"),
):
    """Phonics single-word assessment."""
    raw = await audio.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "audio too large")

    suffix = _safe_suffix(audio.filename)
    uid = uuid.uuid4().hex
    with tempfile.TemporaryDirectory() as tmp:
        in_path = Path(tmp) / f"{uid}{suffix}"
        wav_path = Path(tmp) / f"{uid}.wav"
        in_path.write_bytes(raw)
        _to_wav(in_path, wav_path)

        # D-01: length gate
        dur = _wav_duration_s(wav_path)
        if dur < AUDIO_MIN_DURATION_S:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": "audio_too_short",
                "message": "Recording too short — hold the button longer",
            })
        if dur > AUDIO_MAX_DURATION_S:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": "audio_too_long",
                "message": "Recording too long — keep it under 15 seconds",
            })

        # D-03: energy/noise gate
        if _rms_dbfs(wav_path) < ENERGY_THRESHOLD_DB:
            return JSONResponse(status_code=200, content={
                "success": False,
                "error": "recording_too_noisy",
                "message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé",
            })

        # Azure PA: ASR + phoneme scoring in one call
        try:
            pa_result = _azure_pa_assess(wav_path, word)
        except Exception as e:
            logger.warning(f"Azure PA failed: {e}")
            return JSONResponse(status_code=200, content={
                "success": False,
                "error": "speech_not_detected",
                "message": "Không nghe rõ — nói to hơn nhé",
            })

        rec_status = pa_result.get("RecognitionStatus", "")
        transcript = pa_result.get("DisplayText", "").strip().rstrip(".")

        # D-04: ASR confidence gate
        if rec_status != "Success" or not transcript or re.search(r'[a-zA-Z]', transcript) is None:
            return JSONResponse(status_code=200, content={
                "success": False,
                "error": "speech_not_detected",
                "message": "Không nghe rõ — nói to hơn nhé",
            })

        # D-05: language mixing detection (skip if < 3 words)
        if len(transcript.split()) >= 3:
            try:
                langs = detect_langs(transcript)
                top = langs[0] if langs else None
                if top is None or top.lang != 'en' or top.prob <= 0.5:
                    return JSONResponse(status_code=200, content={
                        "success": False,
                        "error": "wrong_language",
                        "message": "Please speak in English",
                    })
            except Exception as e:
                logger.warning(f"langdetect failed: {e}")

        nbest = pa_result.get("NBest", [{}])[0]
        word_data_list = nbest.get("Words", [])
        word_data = word_data_list[0] if word_data_list else {}
        word_pa = word_data.get("PronunciationAssessment", {})
        score = int(round(word_pa.get("AccuracyScore", 0)))

        ops = _map_phoneme_ops(word_data)
        phonemes = [
            {
                "symbol": op["expected"],
                "ipa": op["expected"],
                "start": op["start"] or 0.0,
                "end": op["end"] or 0.0,
                "duration": op["duration"] or 0.0,
            }
            for op in ops if op["status"] != "missing"
        ]

        return {
            "success": True,
            "transcription": {"text": transcript},
            "phonemes": phonemes,
            "score": score,
            "feedback": ops,
            "word": word,
            "espeak_fallback": False,
        }


@app.post("/analyze-speaking")
async def analyze_speaking(
    audio: UploadFile = File(...),
    target_text: str = Form(...),
    mode: str = Form("SCRIPT_MATCH"),
):
    """Multi-word speaking assessment."""
    raw = await audio.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "audio too large")

    target_text = target_text.strip()
    suffix = _safe_suffix(audio.filename)
    uid = uuid.uuid4().hex
    with tempfile.TemporaryDirectory() as tmp:
        in_path = Path(tmp) / f"{uid}{suffix}"
        wav_path = Path(tmp) / f"{uid}.wav"
        in_path.write_bytes(raw)
        _to_wav(in_path, wav_path)

        # D-01: length gate
        dur = _wav_duration_s(wav_path)
        if dur < AUDIO_MIN_DURATION_S:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": "audio_too_short",
                "message": "Recording too short — hold the button longer",
            })
        if dur > AUDIO_MAX_DURATION_S:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": "audio_too_long",
                "message": "Recording too long — keep it under 15 seconds",
            })

        # D-03: energy/noise gate
        if _rms_dbfs(wav_path) < ENERGY_THRESHOLD_DB:
            return JSONResponse(status_code=200, content={
                "success": False,
                "error": "recording_too_noisy",
                "message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé",
            })

        if mode == "SCRIPT_MATCH":
            # Azure PA with referenceText for pronunciation scoring
            try:
                pa_result = _azure_pa_assess(wav_path, target_text)
            except Exception as e:
                logger.warning(f"Azure PA failed: {e}")
                return JSONResponse(status_code=200, content={
                    "success": False,
                    "error": "speech_not_detected",
                    "message": "Không nghe rõ — nói to hơn nhé",
                })

            rec_status = pa_result.get("RecognitionStatus", "")
            transcript = pa_result.get("DisplayText", "").strip().rstrip(".")

            if rec_status != "Success" or not transcript or re.search(r'[a-zA-Z]', transcript) is None:
                return JSONResponse(status_code=200, content={
                    "success": False,
                    "error": "speech_not_detected",
                    "message": "Không nghe rõ — nói to hơn nhé",
                })

            if len(transcript.split()) >= 3:
                try:
                    langs = detect_langs(transcript)
                    top = langs[0] if langs else None
                    if top is None or top.lang != 'en' or top.prob <= 0.5:
                        return JSONResponse(status_code=200, content={
                            "success": False,
                            "error": "wrong_language",
                            "message": "Please speak in English",
                        })
                except Exception as e:
                    logger.warning(f"langdetect failed: {e}")

            nbest = pa_result.get("NBest", [{}])[0]
            overall_score = int(round(nbest.get("PronunciationAssessment", {}).get("AccuracyScore", 0)))
            azure_words = nbest.get("Words", [])

            target_words = target_text.split()
            word_results = []
            for i, tw in enumerate(target_words):
                aw = azure_words[i] if i < len(azure_words) else {}
                w_score = int(round(aw.get("PronunciationAssessment", {}).get("AccuracyScore", 0)))
                ops = _map_phoneme_ops(aw)
                phonemes = [
                    {"symbol": op["expected"], "ipa": op["expected"],
                     "start": op["start"] or 0.0, "end": op["end"] or 0.0,
                     "duration": op["duration"] or 0.0}
                    for op in ops if op["status"] != "missing"
                ]
                word_results.append({"word": tw, "phonemes": phonemes, "score": w_score, "feedback": ops})

            matched = sum(1 for w in word_results if w["score"] >= MIN_WORD_SCORE)
            return {
                "success": True,
                "transcription": {"text": transcript},
                "words": word_results,
                "overall_score": overall_score,
                "matched_words": matched,
                "total_words": len(target_words),
            }

        else:
            # FREE_SPEAK: STT only, no per-word phoneme feedback
            try:
                stt_result = _azure_stt(wav_path)
            except Exception as e:
                logger.warning(f"Azure STT failed: {e}")
                return JSONResponse(status_code=200, content={
                    "success": False,
                    "error": "speech_not_detected",
                    "message": "Không nghe rõ — nói to hơn nhé",
                })

            rec_status = stt_result.get("RecognitionStatus", "")
            transcript = stt_result.get("DisplayText", "").strip().rstrip(".")

            if rec_status != "Success" or not transcript:
                return JSONResponse(status_code=200, content={
                    "success": False,
                    "error": "speech_not_detected",
                    "message": "Không nghe rõ — nói to hơn nhé",
                })

            nbest = stt_result.get("NBest", [{}])[0]
            azure_words_raw = nbest.get("Words", [])
            target_words = target_text.split()
            word_results = []
            for i, tw in enumerate(target_words):
                aw = azure_words_raw[i] if i < len(azure_words_raw) else {}
                word_results.append({"word": tw, "phonemes": [], "score": 100, "feedback": []})

            return {
                "success": True,
                "transcription": {"text": transcript},
                "words": word_results,
                "overall_score": 100,
                "matched_words": len(target_words),
                "total_words": len(target_words),
            }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """STT only — no scoring."""
    raw = await audio.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "audio too large")

    suffix = _safe_suffix(audio.filename)
    uid = uuid.uuid4().hex
    with tempfile.TemporaryDirectory() as tmp:
        in_path = Path(tmp) / f"{uid}{suffix}"
        wav_path = Path(tmp) / f"{uid}.wav"
        in_path.write_bytes(raw)
        _to_wav(in_path, wav_path)

        try:
            stt_result = _azure_stt(wav_path)
        except Exception as e:
            logger.warning(f"Azure STT failed: {e}")
            return {"text": "", "words": []}

        rec_status = stt_result.get("RecognitionStatus", "")
        if rec_status != "Success":
            return {"text": "", "words": []}

        transcript = stt_result.get("DisplayText", "").strip().rstrip(".")
        nbest = stt_result.get("NBest", [{}])[0]
        azure_words = nbest.get("Words", [])
        words = [
            {
                "word": w.get("Word", ""),
                "start": round(w.get("Offset", 0) / 10_000_000, 4),
                "end": round((w.get("Offset", 0) + w.get("Duration", 0)) / 10_000_000, 4),
                "score": 1.0,
            }
            for w in azure_words
        ]
        return {"text": transcript, "words": words}


@app.post("/align")
async def align(
    audio: UploadFile = File(...),
    word: str = Form(...),
    expected_phonemes: str = Form("[]"),
):
    """Legacy endpoint — delegates to /analyze."""
    result = await analyze(audio=audio, word=word, expected_phonemes=expected_phonemes)
    result_dict = result if isinstance(result, dict) else result.body
    result_dict.pop("transcription", None)
    return result_dict
