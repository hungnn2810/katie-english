import difflib
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

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "whisper-large-v3-turbo")
GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

MAX_UPLOAD_BYTES = int(os.getenv("BFA_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
MIN_WORD_SCORE = int(os.getenv("BFA_MIN_WORD_SCORE", "70"))
AUDIO_MIN_DURATION_S = float(os.getenv("BFA_MIN_DURATION_S", "0.5"))
AUDIO_MAX_DURATION_S = float(os.getenv("BFA_MAX_DURATION_S", "15.0"))
ENERGY_THRESHOLD_DB  = float(os.getenv("BFA_ENERGY_THRESHOLD_DB", "-50.0"))

# Phonetically similar pairs (ARPAbet-ish symbols)
_SIMILAR_PAIRS = {
    frozenset(["r", "l"]),
    frozenset(["b", "p"]),
    frozenset(["d", "t"]),
    frozenset(["g", "k"]),
    frozenset(["v", "f"]),
    frozenset(["z", "s"]),
    frozenset(["dʒ", "tʃ"]),
    frozenset(["ð", "θ"]),
    frozenset(["æ", "ɛ"]),
    frozenset(["ɪ", "iː"]),
    frozenset(["ʊ", "uː"]),
    frozenset(["ɒ", "ɔː"]),
    frozenset(["m", "n"]),
    frozenset(["n", "ŋ"]),
}


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


def _groq_transcribe(wav_path: Path, prompt: Optional[str] = None) -> dict:
    """Call Groq Whisper API. Returns {text, words[{word, start, end}]}."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")
    with open(wav_path, "rb") as f:
        data = {
            "model": GROQ_MODEL,
            "language": "en",
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
        }
        if prompt:
            data["prompt"] = prompt
        resp = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": ("audio.wav", f, "audio/wav")},
            data=data,
            timeout=30,
        )
    if not resp.ok:
        raise RuntimeError(f"Groq API error {resp.status_code}: {resp.text}")
    return resp.json()


def _g2p(text: str) -> List[str]:
    """Convert text to phoneme sequence using espeak via phonemizer."""
    try:
        from phonemizer import phonemize
        phonemes_str = phonemize(
            text.lower().strip(),
            backend="espeak",
            language="en-us",
            with_stress=False,
            preserve_punctuation=False,
            njobs=1,
        )
        return [p for p in re.split(r'\s+', phonemes_str.strip()) if p]
    except Exception as e:
        logger.warning(f"G2P failed for '{text}': {e}")
        return list(text.lower().replace(" ", ""))


def _is_similar(a: str, b: str) -> bool:
    return frozenset([a, b]) in _SIMILAR_PAIRS


def _score_phonemes(expected: List[str], actual: List[str]) -> List[dict]:
    ops = []
    matcher = difflib.SequenceMatcher(None, expected, actual, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                ops.append({"status": "correct", "expected": expected[i1 + k], "aligned": actual[j1 + k]})
        elif tag == "replace":
            exp_chunk = expected[i1:i2]
            act_chunk = actual[j1:j2]
            max_len = max(len(exp_chunk), len(act_chunk))
            for k in range(max_len):
                e = exp_chunk[k] if k < len(exp_chunk) else None
                a = act_chunk[k] if k < len(act_chunk) else None
                if e and a:
                    status = "similar" if _is_similar(e, a) else "substituted"
                    ops.append({"status": status, "expected": e, "aligned": a})
                elif e:
                    ops.append({"status": "missing", "expected": e, "aligned": None})
                else:
                    ops.append({"status": "extra", "expected": None, "aligned": a})
        elif tag == "delete":
            for e in expected[i1:i2]:
                ops.append({"status": "missing", "expected": e, "aligned": None})
        elif tag == "insert":
            for a in actual[j1:j2]:
                ops.append({"status": "extra", "expected": None, "aligned": a})
    return ops


def _distribute_timestamps(word_start: float, word_end: float, phoneme_ops: List[dict]) -> List[dict]:
    present = [op for op in phoneme_ops if op["status"] != "missing"]
    if not present:
        return phoneme_ops
    dur = (word_end - word_start) / len(present)
    result = []
    idx = 0
    for op in phoneme_ops:
        if op["status"] == "missing":
            result.append({**op, "start": None, "end": None, "duration": None})
        else:
            start = word_start + idx * dur
            result.append({**op, "start": round(start, 4), "end": round(start + dur, 4), "duration": round(dur, 4)})
            idx += 1
    return result


def _calc_score(ops: List[dict]) -> int:
    if not ops:
        return 0
    scored = [op for op in ops if op["status"] != "extra"]
    if not scored:
        return 0
    correct = sum(1 for op in scored if op["status"] in ("correct", "similar"))
    return round(correct / len(scored) * 100)


@app.get("/health")
def health():
    return {"status": "ok", "groq_key_set": bool(GROQ_API_KEY)}


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

        try:
            groq_result = _groq_transcribe(wav_path, prompt=word)
        except Exception as e:
            logger.warning(f"Groq ASR failed: {e}")
            groq_result = {"text": "", "words": []}

        transcript = groq_result.get("text", "").strip()

        # D-04: ASR confidence gate
        if not transcript or re.search(r'[a-zA-Z]', transcript) is None:
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

        groq_words = groq_result.get("words", [])
        word_start = groq_words[0].get("start", 0.0) if groq_words else 0.0
        word_end = groq_words[-1].get("end", 1.0) if groq_words else 1.0

        expected_ph = _g2p(word)
        actual_ph = _g2p(transcript) if transcript else []

        raw_ops = _score_phonemes(expected_ph, actual_ph)
        ops = _distribute_timestamps(word_start, word_end, raw_ops)
        score = _calc_score(ops)

        phonemes = [
            {
                "symbol": op["expected"] or op["aligned"],
                "ipa": op["expected"] or op["aligned"],
                "start": op.get("start") or 0.0,
                "end": op.get("end") or 0.0,
                "duration": op.get("duration") or 0.0,
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

        prompt = target_text if mode == "SCRIPT_MATCH" else None
        try:
            groq_result = _groq_transcribe(wav_path, prompt=prompt)
        except Exception as e:
            logger.warning(f"Groq ASR failed: {e}")
            groq_result = {"text": "", "words": []}

        transcript = groq_result.get("text", "").strip()

        # D-04: ASR confidence gate
        if not transcript or re.search(r'[a-zA-Z]', transcript) is None:
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

        groq_words = groq_result.get("words", [])

        target_words = target_text.split()
        word_results = []
        for i, tw in enumerate(target_words):
            gw = groq_words[i] if i < len(groq_words) else None
            w_start = gw.get("start", i * 0.5) if gw else i * 0.5
            w_end = gw.get("end", w_start + 0.4) if gw else w_start + 0.4
            actual_word = gw.get("word", "").strip(".,!?").lower() if gw else ""

            exp_ph = _g2p(tw)
            act_ph = _g2p(actual_word) if actual_word else []
            raw_ops = _score_phonemes(exp_ph, act_ph)
            ops = _distribute_timestamps(w_start, w_end, raw_ops)
            word_score = _calc_score(ops)
            phonemes = [
                {"symbol": op["expected"] or op["aligned"], "ipa": op["expected"] or op["aligned"],
                 "start": op.get("start") or 0.0, "end": op.get("end") or 0.0, "duration": op.get("duration") or 0.0}
                for op in ops if op["status"] != "missing"
            ]
            word_results.append({"word": tw, "phonemes": phonemes, "score": word_score, "feedback": ops})

        matched = sum(1 for w in word_results if w["score"] >= MIN_WORD_SCORE)
        overall = _calc_score([op for wr in word_results for op in wr["feedback"]])

        return {
            "success": True,
            "transcription": {"text": transcript},
            "words": word_results,
            "overall_score": overall,
            "matched_words": matched,
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
            groq_result = _groq_transcribe(wav_path)
        except Exception as e:
            logger.warning(f"Groq transcribe failed: {e}")
            return {"text": "", "words": []}

        words = [
            {"word": w.get("word", ""), "start": w.get("start", 0.0),
             "end": w.get("end", 0.0), "score": 1.0}
            for w in groq_result.get("words", [])
        ]
        return {"text": groq_result.get("text", "").strip(), "words": words}


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
