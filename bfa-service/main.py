import json
import os
import shutil
import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import List

from bournemouth_aligner import PhonemeTimestampAligner
from fastapi import FastAPI, File, Form, HTTPException, UploadFile

app = FastAPI()

IPA_TO_SIMPLIFIED: dict[str, str] = {
    # 3-char sequences (checked first)
    # 2-char sequences — diphthongs
    "tʃ": "ch",
    "dʒ": "j",
    "eɪ": "e",   # long a (American)
    "aɪ": "i",   # long i
    "ɔɪ": "oi",
    "aʊ": "ou",
    "oʊ": "o",   # long o (American)
    "əʊ": "o",   # long o (British espeak)
    "uː": "oo",
    "iː": "i",
    # r-colored vowels (aligner outputs these as 2-char units)
    "ɑɹ": "ar",
    "ɔɹ": "or",
    "ɛɹ": "er",
    "ɪɹ": "er",
    "ʊɹ": "er",
    "ɜɹ": "er",
    "ɝɹ": "er",
    "aɹ": "ar",
    "oɹ": "or",
    # Single chars
    "k": "c",
    "c": "c",
    "t": "t",
    "d": "d",
    "g": "g",
    "p": "p",
    "b": "b",
    "s": "s",
    "z": "z",
    "f": "f",
    "v": "v",
    "h": "h",
    "l": "l",
    "r": "r",
    "ɹ": "r",   # rhotic approximant (aligner uses ɹ not r)
    "ɾ": "t",   # alveolar flap (American English "t" between vowels)
    "ɚ": "er",  # r-colored schwa (American English unstressed "er")
    "m": "m",
    "n": "n",
    "w": "w",
    "j": "y",
    "ŋ": "ng",
    "ʃ": "sh",
    "ʒ": "zh",
    "θ": "th",
    "ð": "th",
    "ɑ": "a",
    "æ": "a",
    "ʌ": "a",
    "ə": "a",
    "ɛ": "e",
    "ɜ": "er",  # open-mid central (her)
    "ɝ": "er",  # r-colored mid central (American her)
    "ɪ": "i",
    "ɨ": "i",
    "i": "i",
    "ɔ": "o",
    "ɒ": "o",
    "o": "o",
    "ʊ": "oo",
    "u": "oo",
}


def normalize_ipa(label: str) -> str:
    normalized = label.strip().lower()
    normalized = (
        normalized
        .replace("ˈ", "")
        .replace("ˌ", "")
        .replace("ː", "")
        .replace("ˑ", "")
    )
    return IPA_TO_SIMPLIFIED.get(normalized, normalized)


def espeak_phonemes(word: str) -> List[str]:
    try:
        preset = os.getenv("BFA_PRESET", "en-us")
        espeak_voice = "en-us" if "en-us" in preset else preset
        out = subprocess.run(
            ["espeak-ng", "-v", espeak_voice, "--ipa", "-q", word],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
        # strip stress, length, syllable boundary markers
        for ch in "ˈˌːˑ. ":
            out = out.replace(ch, "")
        phonemes: List[str] = []
        i = 0
        while i < len(out):
            matched = False
            for size in (3, 2):
                chunk = out[i: i + size]
                if chunk in IPA_TO_SIMPLIFIED:
                    phonemes.append(IPA_TO_SIMPLIFIED[chunk])
                    i += size
                    matched = True
                    break
            if not matched:
                sym = normalize_ipa(out[i])
                if sym:
                    phonemes.append(sym)
                i += 1
        return phonemes
    except Exception:
        return []


def score_alignment(expected: List[str], aligned: List[str]) -> tuple[int, List[dict]]:
    m, n = len(expected), len(aligned)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if expected[i - 1] == aligned[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])

    ops: list[dict] = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and expected[i - 1] == aligned[j - 1]:
            ops.append({"status": "correct", "expected": expected[i - 1], "aligned": aligned[j - 1]})
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops.append({"status": "substituted", "expected": expected[i - 1], "aligned": aligned[j - 1]})
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append({"status": "missing", "expected": expected[i - 1], "aligned": None})
            i -= 1
        else:
            ops.append({"status": "extra", "expected": None, "aligned": aligned[j - 1]})
            j -= 1
    ops.reverse()

    distance = dp[m][n]
    denom = max(m, n, 1)
    score = max(0, round((1 - distance / denom) * 100))
    return score, ops


def error_payload(word: str, message: str) -> dict:
    return {
        "success": False,
        "phonemes": [],
        "score": 0,
        "feedback": [{"status": "error", "message": message, "expected": None, "aligned": None}],
        "word": word,
    }


@lru_cache
def get_aligner() -> PhonemeTimestampAligner:
    preset = os.getenv("BFA_PRESET", "en-us")
    return PhonemeTimestampAligner(preset=preset)


@app.post("/align")
async def align(
    audio: UploadFile = File(...),
    word: str = Form(...),
    expected_phonemes: str = Form(...),
):
    try:
        expected: List[str] = json.loads(expected_phonemes)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid expected_phonemes: {exc}") from exc

    if not isinstance(expected, list):
        raise HTTPException(status_code=400, detail="expected_phonemes must be a JSON array")

    # Fall back to espeak-ng when no phoneme data in DB
    espeak_fallback = False
    if not expected:
        expected = espeak_phonemes(word)
        espeak_fallback = bool(expected)

    work_dir = Path(tempfile.mkdtemp(prefix="bfa_"))
    try:
        suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
        raw_path = work_dir / f"input{suffix}"
        with open(raw_path, "wb") as f:
            f.write(await audio.read())

        # Normalize to 16kHz mono WAV — handles m4a, webm, opus, mp4, etc.
        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1", "-y", str(wav_path)],
            capture_output=True,
        )
        if conv.returncode != 0:
            return error_payload(word, f"Audio conversion failed: {conv.stderr.decode()[:200]}")

        aligner = get_aligner()
        audio_data = aligner.load_audio(str(wav_path))
        result = aligner.process_sentence(word, audio_data)

        segments = result.get("segments") if isinstance(result, dict) else None
        if not segments:
            return error_payload(word, "No alignment segments produced")

        phoneme_ts = segments[0].get("phoneme_ts") if isinstance(segments[0], dict) else None
        if not phoneme_ts:
            return error_payload(word, "No phoneme timestamps produced")

        SILENCE_LABELS = {"-", "SIL", "sil", "sp", "spn", "<eps>", ""}
        aligned_phonemes: List[dict] = []
        for entry in phoneme_ts:
            if not isinstance(entry, dict):
                continue
            label = str(entry.get("ipa_label") or entry.get("phoneme_label") or "").strip()
            if not label or label in SILENCE_LABELS:
                continue
            symbol = normalize_ipa(label)
            if not symbol or symbol in SILENCE_LABELS:
                continue
            start_ms = float(entry.get("start_ms", 0.0))
            end_ms = float(entry.get("end_ms", 0.0))
            aligned_phonemes.append({
                "symbol": symbol,
                "ipa": label,
                "start": round(start_ms / 1000, 3),
                "end": round(end_ms / 1000, 3),
                "duration": round((end_ms - start_ms) / 1000, 3),
            })

        if not aligned_phonemes:
            return error_payload(word, "No valid phoneme entries produced")

        aligned_symbols = [p["symbol"] for p in aligned_phonemes]
        score, ops = score_alignment(expected, aligned_symbols)

        feedback: List[dict] = []
        aligned_idx = 0
        for op in ops:
            entry = {**op}
            if op["status"] in ("correct", "substituted", "extra") and aligned_idx < len(aligned_phonemes):
                ph = aligned_phonemes[aligned_idx]
                entry["start"] = ph["start"]
                entry["end"] = ph["end"]
                entry["duration"] = ph["duration"]
                aligned_idx += 1
            feedback.append(entry)

        return {
            "success": True,
            "phonemes": aligned_phonemes,
            "score": score,
            "feedback": feedback,
            "word": word,
            "espeak_fallback": espeak_fallback,
        }
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


@app.get("/health")
def health():
    return {"status": "ok"}
