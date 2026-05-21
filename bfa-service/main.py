import asyncio
import concurrent.futures
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

import whisperx
from bournemouth_aligner import PhonemeTimestampAligner
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from prometheus_client import Counter, Histogram, generate_latest

logger = logging.getLogger("bfa_service")
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(_handler)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(json.dumps({"event": "startup_warmup_begin"}))
    get_whisperx_model()
    get_aligner()
    logger.info(json.dumps({"event": "startup_warmup_complete", "whisperx_loaded": _whisperx_model is not None}))
    yield


app = FastAPI(lifespan=lifespan)

MAX_UPLOAD_BYTES = int(os.getenv("BFA_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
MAX_EXPECTED_PHONEMES = int(os.getenv("BFA_MAX_EXPECTED_PHONEMES", "200"))
FFMPEG_TIMEOUT = int(os.getenv("BFA_FFMPEG_TIMEOUT", "30"))
VOLUMEDETECT_TIMEOUT = int(os.getenv("BFA_VOLUME_TIMEOUT", "10"))
ESPEAK_TIMEOUT = int(os.getenv("BFA_ESPEAK_TIMEOUT", "5"))
BFA_CONCURRENCY = int(os.getenv("BFA_CONCURRENCY", "1"))
MAX_WORD_LENGTH = int(os.getenv("BFA_MAX_WORD_LENGTH", "200"))
MAX_TARGET_TEXT_LENGTH = int(os.getenv("BFA_MAX_TARGET_TEXT_LENGTH", "2000"))
ENERGY_THRESHOLD_DB = float(os.getenv("BFA_ENERGY_THRESHOLD_DB", "-50.0"))
TRANSCRIPTION_MATCH_THRESHOLD = float(os.getenv("BFA_TRANSCRIPTION_MATCH_THRESHOLD", "0.5"))
MIN_WORD_SCORE = int(os.getenv("BFA_MIN_WORD_SCORE", "70"))

REQUEST_SEMAPHORE = asyncio.Semaphore(BFA_CONCURRENCY)
THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=2)

REQUEST_COUNT = Counter(
    "bfa_request_total",
    "Total requests",
    ["endpoint", "method", "status"],
)
REQUEST_LATENCY = Histogram(
    "bfa_request_latency_seconds",
    "Request latency in seconds",
    ["endpoint", "method"],
)

IPA_TO_SIMPLIFIED: dict[str, str] = {
    # 2-char sequences — diphthongs and affricates
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
    # additional affricates / approximants
    "ɫ": "l",    # velarized/dark l
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
    # Single chars — stops
    "k": "c",
    "c": "c",
    "ɡ": "g",   # IPA script-g (U+0261) — aligner/espeak always emit this, not ASCII g
    "g": "g",   # ASCII g fallback
    "t": "t",
    "d": "d",
    "p": "p",
    "b": "b",
    # Single chars — fricatives/affricates
    "s": "s",
    "z": "z",
    "f": "f",
    "v": "v",
    "h": "h",
    "ʃ": "sh",
    "ʒ": "zh",
    "θ": "th",
    "ð": "th",
    # Single chars — nasals/liquids/glides
    "l": "l",
    "r": "r",
    "ɹ": "r",   # rhotic approximant (aligner uses ɹ not r)
    "ɾ": "t",   # alveolar flap (American English "t" between vowels)
    "m": "m",
    "n": "n",
    "ŋ": "ng",
    "w": "w",
    "j": "y",
    # Single chars — r-colored vowels
    "ɚ": "er",  # r-colored schwa (American English unstressed "er")
    "ɜ": "er",  # open-mid central (her)
    "ɝ": "er",  # r-colored mid central (American her)
    # Single chars — vowels
    "æ": "a",
    "ʌ": "a",
    "ə": "a",
    "ɐ": "a",   # near-open central (en-us unstressed syllables)
    "ɑ": "a",
    "ɛ": "e",
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


@lru_cache(maxsize=512)
def espeak_phonemes(word: str) -> List[str]:
    try:
        preset = os.getenv("BFA_PRESET", "en-us")
        espeak_voice = "en-us" if "en-us" in preset else preset
        proc = subprocess.run(
            ["espeak-ng", "-v", espeak_voice, "--ipa", "-q", word],
            capture_output=True, text=True, timeout=ESPEAK_TIMEOUT,
        )
        if proc.returncode != 0:
            return []
        out = proc.stdout.strip()
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


# Phoneme pairs that are acoustically similar — substitution costs 0.5, yielding "similar" feedback.
# Prioritises confusion pairs common for Vietnamese learners (l/r, th/t, th/d, v/b).
_SIMILAR_PAIRS: frozenset = frozenset({
    frozenset({"p", "b"}),
    frozenset({"t", "d"}),
    frozenset({"k", "g"}),
    frozenset({"f", "v"}),
    frozenset({"s", "z"}),
    frozenset({"sh", "zh"}),
    frozenset({"ch", "j"}),
    frozenset({"m", "n"}),
    frozenset({"n", "ng"}),
    frozenset({"l", "r"}),
    frozenset({"th", "d"}),
    frozenset({"th", "t"}),
    frozenset({"v", "b"}),
    frozenset({"i", "e"}),
    frozenset({"a", "e"}),
    frozenset({"oo", "o"}),
    frozenset({"er", "a"}),
    frozenset({"ar", "a"}),
    frozenset({"or", "o"}),
})


def _phoneme_cost(a: str, b: str) -> float:
    if a == b:
        return 0.0
    if frozenset({a, b}) in _SIMILAR_PAIRS:
        return 0.5
    return 1.0


def score_alignment(expected: List[str], aligned: List[str]) -> tuple[int, List[dict]]:
    m, n = len(expected), len(aligned)
    dp = [[0.0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = float(i)
    for j in range(n + 1):
        dp[0][j] = float(j)
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = _phoneme_cost(expected[i - 1], aligned[j - 1])
            dp[i][j] = min(
                dp[i - 1][j - 1] + cost,  # match / substitute
                dp[i - 1][j] + 1.0,       # missing
                dp[i][j - 1] + 1.0,       # extra
            )

    ops: list[dict] = []
    i, j = m, n
    EPS = 1e-9
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = _phoneme_cost(expected[i - 1], aligned[j - 1])
            if abs(dp[i][j] - (dp[i - 1][j - 1] + cost)) < EPS:
                status = "correct" if cost == 0.0 else ("similar" if cost < 1.0 else "substituted")
                ops.append({"status": status, "expected": expected[i - 1], "aligned": aligned[j - 1]})
                i -= 1
                j -= 1
                continue
        if i > 0 and (j == 0 or abs(dp[i][j] - (dp[i - 1][j] + 1.0)) < EPS):
            ops.append({"status": "missing", "expected": expected[i - 1], "aligned": None})
            i -= 1
        else:
            ops.append({"status": "extra", "expected": None, "aligned": aligned[j - 1]})
            j -= 1
    ops.reverse()

    distance = dp[m][n]
    denom = float(max(m, n, 1))
    score = max(0, round((1.0 - distance / denom) * 100))
    return score, ops


def error_payload(word: str, message: str) -> dict:
    return {
        "success": False,
        "phonemes": [],
        "score": 0,
        "feedback": [{"status": "error", "message": message, "expected": None, "aligned": None}],
        "word": word,
    }


def has_sufficient_energy(wav_path: Path, threshold_db: float = ENERGY_THRESHOLD_DB) -> bool:
    """Return True if audio has speech-level energy (not silence/noise)."""
    proc = subprocess.run(
        [
            "ffmpeg", "-i", str(wav_path),
            "-af", "volumedetect",
            "-vn", "-sn", "-dn",
            "-f", "null", "/dev/null",
        ],
        capture_output=True, text=True, timeout=VOLUMEDETECT_TIMEOUT,
    )
    for line in proc.stderr.splitlines():
        if "mean_volume" in line:
            try:
                db = float(line.split(":")[-1].strip().replace(" dB", ""))
                return db > threshold_db
            except ValueError:
                pass
    return False


_whisperx_model = None
_whisperx_lock = threading.Lock()

_WHISPERX_MODEL_SIZE = os.getenv("WHISPERX_MODEL", "tiny")
_WHISPERX_DEVICE = "cpu"
_WHISPERX_COMPUTE_TYPE = "int8"


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()
    response = None
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration = time.time() - start_time
        endpoint = request.url.path
        method = request.method
        REQUEST_COUNT.labels(endpoint=endpoint, method=method, status=str(status_code)).inc()
        REQUEST_LATENCY.labels(endpoint=endpoint, method=method).observe(duration)
        logger.info(
            json.dumps(
                {
                    "event": "request",
                    "request_id": request_id,
                    "method": method,
                    "path": endpoint,
                    "status": status_code,
                    "duration_ms": round(duration * 1000, 2),
                }
            )
        )
        if response is not None:
            response.headers["x-request-id"] = request_id


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception(
        json.dumps(
            {
                "event": "error",
                "request_id": request_id,
                "path": request.url.path,
                "message": str(exc),
            }
        )
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
    )


def get_whisperx_model():
    global _whisperx_model
    if _whisperx_model is not None:
        return _whisperx_model
    with _whisperx_lock:
        if _whisperx_model is None:
            _whisperx_model = whisperx.load_model(
                _WHISPERX_MODEL_SIZE, _WHISPERX_DEVICE, compute_type=_WHISPERX_COMPUTE_TYPE
            )
    return _whisperx_model


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
    async with REQUEST_SEMAPHORE:
        return await _align_impl(audio, word, expected_phonemes)


async def _align_impl(
    audio: UploadFile,
    word: str,
    expected_phonemes: str,
):
    try:
        expected: List[str] = json.loads(expected_phonemes)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid expected_phonemes: {exc}") from exc

    if not isinstance(expected, list):
        raise HTTPException(status_code=400, detail="expected_phonemes must be a JSON array")

    if len(expected) > MAX_EXPECTED_PHONEMES:
        raise HTTPException(status_code=413, detail="expected_phonemes is too large")

    if len(word) > MAX_WORD_LENGTH:
        raise HTTPException(status_code=400, detail="word is too long")

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    raw_bytes = await audio.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large")

    return await asyncio.to_thread(
        _align_sync,
        raw_bytes,
        suffix,
        word,
        expected,
    )


def _transcribe_wav(wav_path: Path, word: str) -> str:
    """Run WhisperX transcription on a prepared WAV file. Returns transcript text or ''."""
    try:
        model = get_whisperx_model()
        audio_data = whisperx.load_audio(str(wav_path))
        # batch_size=1 is optimal for short single-word clips on CPU — larger batches add overhead
        result = model.transcribe(audio_data, batch_size=1, language="en")
        return " ".join(s.get("text", "").strip() for s in result.get("segments", [])).strip()
    except Exception as exc:
        logger.warning(json.dumps({"event": "transcription_error", "word": word, "error": str(exc)}))
        return ""


def _run_alignment(
    wav_path: Path,
    word: str,
    expected: List[str],
    espeak_fallback: bool,
    skip_energy_check: bool = False,
) -> dict:
    """Run forced alignment on a prepared 16kHz mono WAV file and return the align response dict.

    Shared by _align_sync and _analyze_sync so that alignment logic is not duplicated.
    Returns the same dict shape as POST /align (success, phonemes, score, feedback, word, espeak_fallback).
    On any internal failure, returns error_payload(word, ...) with espeak_fallback absent/False.
    skip_energy_check: set True when caller already verified energy to avoid a second ffmpeg subprocess.
    """
    if not skip_energy_check and not has_sufficient_energy(wav_path):
        return error_payload(word, "No speech detected in audio")

    aligner = get_aligner()
    audio_data = aligner.load_audio(str(wav_path))
    result = aligner.process_sentence(word, audio_data)

    segments = result.get("segments") if isinstance(result, dict) else None
    if not segments:
        return error_payload(word, "No alignment segments produced")

    phoneme_ts = segments[0].get("phoneme_ts") if isinstance(segments[0], dict) else None
    if not phoneme_ts:
        return error_payload(word, "No phoneme timestamps produced")

    silence_labels = {"-", "SIL", "sil", "sp", "spn", "<eps>", ""}
    aligned_phonemes: List[dict] = []
    for entry in phoneme_ts:
        if not isinstance(entry, dict):
            continue
        label = str(entry.get("ipa_label") or entry.get("phoneme_label") or "").strip()
        if not label or label in silence_labels:
            continue
        symbol = normalize_ipa(label)
        if not symbol or symbol in silence_labels:
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
        if op["status"] in ("correct", "similar", "substituted", "extra") and aligned_idx < len(aligned_phonemes):
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


def _align_sync(
    raw_bytes: bytes,
    suffix: str,
    word: str,
    expected: List[str],
):
    # Fall back to espeak-ng when no phoneme data in DB
    espeak_fallback = False
    if not expected:
        expected = espeak_phonemes(word)
        espeak_fallback = bool(expected)

    work_dir = Path(tempfile.mkdtemp(prefix="bfa_"))
    try:
        raw_path = work_dir / f"input{suffix}"
        with open(raw_path, "wb") as f:
            f.write(raw_bytes)

        # Normalize to 16kHz mono WAV — handles m4a, webm, opus, mp4, etc.
        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1", "-y", str(wav_path)],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT,
        )
        if conv.returncode != 0:
            return error_payload(word, f"Audio conversion failed: {conv.stderr.decode()[:200]}")

        return _run_alignment(wav_path, word, expected, espeak_fallback)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    async with REQUEST_SEMAPHORE:
        return await _transcribe_impl(audio)


async def _transcribe_impl(audio: UploadFile):
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    raw_bytes = await audio.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large")

    return await asyncio.to_thread(_transcribe_sync, raw_bytes, suffix)


def _transcribe_sync(raw_bytes: bytes, suffix: str):
    work_dir = Path(tempfile.mkdtemp(prefix="whisperx_"))
    try:
        raw_path = work_dir / f"input{suffix}"
        with open(raw_path, "wb") as f:
            f.write(raw_bytes)

        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1", "-t", "300", "-y", str(wav_path)],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT,
        )
        if conv.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Audio conversion failed: {conv.stderr.decode()[:200]}")

        if not has_sufficient_energy(wav_path):
            return {"text": ""}

        model = get_whisperx_model()
        audio_data = whisperx.load_audio(str(wav_path))
        result = model.transcribe(audio_data, batch_size=16, language="en")

        text = " ".join(s.get("text", "").strip() for s in result.get("segments", []))
        return {"text": text.strip()}
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


@app.post("/analyze")
async def analyze(
    audio: UploadFile = File(...),
    word: str = Form(...),
    expected_phonemes: str = Form(...),
):
    async with REQUEST_SEMAPHORE:
        return await _analyze_impl(audio, word, expected_phonemes)


async def _analyze_impl(
    audio: UploadFile,
    word: str,
    expected_phonemes: str,
):
    try:
        expected: List[str] = json.loads(expected_phonemes)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid expected_phonemes: {exc}") from exc

    if not isinstance(expected, list):
        raise HTTPException(status_code=400, detail="expected_phonemes must be a JSON array")

    if len(expected) > MAX_EXPECTED_PHONEMES:
        raise HTTPException(status_code=413, detail="expected_phonemes is too large")

    if len(word) > MAX_WORD_LENGTH:
        raise HTTPException(status_code=400, detail="word is too long")

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    raw_bytes = await audio.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large")

    return await asyncio.to_thread(_analyze_sync, raw_bytes, suffix, word, expected)


def _analyze_sync(
    raw_bytes: bytes,
    suffix: str,
    word: str,
    expected: List[str],
):
    # Fall back to espeak-ng when no phoneme data in DB
    espeak_fallback = False
    if not expected:
        expected = espeak_phonemes(word)
        espeak_fallback = bool(expected)

    work_dir = Path(tempfile.mkdtemp(prefix="bfa_analyze_"))
    try:
        raw_path = work_dir / f"input{suffix}"
        with open(raw_path, "wb") as f:
            f.write(raw_bytes)

        # Normalize to 16kHz mono WAV — use -t 300 for long-form transcription support
        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1", "-t", "300", "-y", str(wav_path)],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT,
        )
        if conv.returncode != 0:
            err = f"Audio conversion failed: {conv.stderr.decode()[:200]}"
            return {**error_payload(word, err), "transcription": {"text": ""}}

        if not has_sufficient_energy(wav_path):
            return {**error_payload(word, "No speech detected in audio"), "transcription": {"text": ""}}

        # Run transcription and alignment in parallel — they share the same WAV but are independent.
        # skip_energy_check=True avoids a redundant ffmpeg volumedetect subprocess in _run_alignment.
        transcribe_fut = THREAD_POOL.submit(_transcribe_wav, wav_path, word)
        align_fut = THREAD_POOL.submit(_run_alignment, wav_path, word, expected, espeak_fallback, True)
        transcription_text = transcribe_fut.result()
        align_result = align_fut.result()

        # Re-score using what whisperx actually heard (forced aligner labels always
        # match expected lexicon, so alignment score is always 100% regardless of
        # what the student said). Transcription-based phonemes reflect actual speech.
        if transcription_text and align_result.get("success"):
            spoken_phonemes: List[str] = []
            for w in transcription_text.lower().split():
                spoken_phonemes.extend(espeak_phonemes(w))
            if spoken_phonemes:
                t_score, t_ops = score_alignment(expected, spoken_phonemes)
                align_result["score"] = t_score
                align_result["feedback"] = t_ops

        # Merge transcription into the alignment result
        align_result["transcription"] = {"text": transcription_text}
        return align_result
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _tokenize_target(text: str) -> List[str]:
    cleaned = re.sub(r"[^\w\s']", " ", text.lower())
    return [w for w in cleaned.split() if w]


def _speaking_error_payload(target_text: str, message: str) -> dict:
    words = _tokenize_target(target_text)
    return {
        "success": False,
        "transcription": {"text": ""},
        "words": [
            {
                "word": w,
                "phonemes": [],
                "score": 0,
                "feedback": [{"status": "error", "message": message, "expected": None, "aligned": None}],
            }
            for w in words
        ],
        "overall_score": 0,
        "matched_words": 0,
        "total_words": len(words),
    }


def _extract_per_word_results(word_segments: List[dict], target_words: List[str]) -> dict:
    silence_labels = {"-", "SIL", "sil", "sp", "spn", "<eps>", ""}
    word_results = []
    for seg, word in zip(word_segments, target_words):
        phoneme_ts = seg.get("phoneme_ts") or []
        aligned_phonemes: List[dict] = []
        for entry in phoneme_ts:
            if not isinstance(entry, dict):
                continue
            label = str(entry.get("ipa_label") or entry.get("phoneme_label") or "").strip()
            if not label or label in silence_labels:
                continue
            symbol = normalize_ipa(label)
            if not symbol or symbol in silence_labels:
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

        expected = espeak_phonemes(word)
        aligned_symbols = [p["symbol"] for p in aligned_phonemes]

        if not aligned_phonemes:
            score, ops = 0, [{"status": "error", "message": "No phonemes aligned", "expected": None, "aligned": None}]
        else:
            score, ops = score_alignment(expected, aligned_symbols)
            aligned_idx = 0
            enriched_ops = []
            for op in ops:
                entry = {**op}
                if op["status"] in ("correct", "similar", "substituted", "extra") and aligned_idx < len(aligned_phonemes):
                    ph = aligned_phonemes[aligned_idx]
                    entry["start"] = ph["start"]
                    entry["end"] = ph["end"]
                    entry["duration"] = ph["duration"]
                    aligned_idx += 1
                enriched_ops.append(entry)
            ops = enriched_ops

        word_results.append({
            "word": word,
            "phonemes": aligned_phonemes,
            "expected_phonemes": expected,
            "aligned_phonemes": aligned_symbols,
            "score": score,
            "feedback": ops,
        })
    return {"success": True, "words": word_results, "error": None}


def _partition_flat_alignment(
    flat_phoneme_ts: List[dict],
    target_words: List[str],
    silence_labels: set,
) -> dict:
    word_expected = [(w, espeak_phonemes(w)) for w in target_words]
    total_expected = sum(len(ph) for _, ph in word_expected)

    content = [
        e for e in flat_phoneme_ts
        if isinstance(e, dict) and
           str(e.get("ipa_label") or e.get("phoneme_label") or "").strip() not in silence_labels
    ]

    word_results = []
    pos = 0
    for word, expected in word_expected:
        if total_expected > 0:
            count = round(len(expected) / total_expected * len(content))
        else:
            count = max(1, len(content) // len(target_words)) if target_words else 0
        slice_ = content[pos: pos + count]
        pos += count

        aligned_phonemes = []
        for entry in slice_:
            label = str(entry.get("ipa_label") or entry.get("phoneme_label") or "").strip()
            symbol = normalize_ipa(label)
            if not symbol or symbol in silence_labels:
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

        aligned_symbols = [p["symbol"] for p in aligned_phonemes]
        if aligned_phonemes:
            score, ops = score_alignment(expected, aligned_symbols)
        else:
            score, ops = 0, [{"status": "error", "message": "No phonemes in slice", "expected": None, "aligned": None}]

        word_results.append({
            "word": word,
            "phonemes": aligned_phonemes,
            "expected_phonemes": expected,
            "aligned_phonemes": aligned_symbols,
            "score": score,
            "feedback": ops,
        })
    return {"success": True, "words": word_results, "error": None}


def _run_speaking_alignment(wav_path: Path, target_text: str) -> dict:
    aligner = get_aligner()
    audio_data = aligner.load_audio(str(wav_path))

    target_words = _tokenize_target(target_text)
    if not target_words:
        return {"success": False, "words": [], "error": "Empty target text after tokenization"}

    result = aligner.process_sentence(target_text, audio_data)
    segments = result.get("segments") if isinstance(result, dict) else None
    if not segments:
        return {"success": False, "words": [], "error": "No alignment segments produced"}

    silence_labels = {"-", "SIL", "sil", "sp", "spn", "<eps>", ""}

    word_segments = []
    for seg in segments:
        if not isinstance(seg, dict):
            continue
        phoneme_ts = seg.get("phoneme_ts") or []
        content_phonemes = [
            e for e in phoneme_ts
            if isinstance(e, dict) and
               str(e.get("ipa_label") or e.get("phoneme_label") or "").strip() not in silence_labels
        ]
        if content_phonemes:
            word_segments.append(seg)

    if len(word_segments) == len(target_words):
        return _extract_per_word_results(word_segments, target_words)
    elif len(segments) == 1:
        flat_phonemes = segments[0].get("phoneme_ts") or []
        return _partition_flat_alignment(flat_phonemes, target_words, silence_labels)
    else:
        logger.warning(json.dumps({
            "event": "speaking_segment_mismatch",
            "target_words": len(target_words),
            "segments": len(word_segments),
        }))
        mappable = min(len(word_segments), len(target_words))
        partial = _extract_per_word_results(word_segments[:mappable], target_words[:mappable])
        for w in target_words[mappable:]:
            expected = espeak_phonemes(w)
            partial["words"].append({
                "word": w,
                "phonemes": [],
                "expected_phonemes": expected,
                "aligned_phonemes": [],
                "score": 0,
                "feedback": [{"status": "error", "message": "No alignment segment", "expected": None, "aligned": None}],
            })
        partial["success"] = True
        return partial


def _analyze_speaking_sync(
    raw_bytes: bytes,
    suffix: str,
    target_text: str,
    mode: str,
) -> dict:
    work_dir = Path(tempfile.mkdtemp(prefix="bfa_speaking_"))
    try:
        raw_path = work_dir / f"input{suffix}"
        with open(raw_path, "wb") as f:
            f.write(raw_bytes)

        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1", "-t", "300", "-y", str(wav_path)],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT,
        )
        if conv.returncode != 0:
            err = f"Audio conversion failed: {conv.stderr.decode()[:200]}"
            return _speaking_error_payload(target_text, err)

        if not has_sufficient_energy(wav_path):
            return _speaking_error_payload(target_text, "No speech detected in audio")

        transcribe_fut = THREAD_POOL.submit(_transcribe_wav, wav_path, target_text)
        align_fut = THREAD_POOL.submit(_run_speaking_alignment, wav_path, target_text)
        transcription_text = transcribe_fut.result()
        align_result = align_fut.result()

        if not align_result["success"]:
            return _speaking_error_payload(target_text, align_result.get("error", "Alignment failed"))

        word_results = align_result["words"]

        if transcription_text and mode == "SCRIPT_MATCH":
            spoken_words = _tokenize_target(transcription_text)
            for i, word_result in enumerate(word_results):
                spoken_word = spoken_words[i] if i < len(spoken_words) else ""
                if spoken_word:
                    spoken_phonemes = espeak_phonemes(spoken_word)
                    if spoken_phonemes:
                        expected = word_result["expected_phonemes"]
                        t_score, t_ops = score_alignment(expected, spoken_phonemes)
                        word_result["score"] = t_score
                        word_result["feedback"] = t_ops

        total_phonemes = sum(len(w["expected_phonemes"]) for w in word_results)
        if total_phonemes > 0:
            weighted_sum = sum(w["score"] * len(w["expected_phonemes"]) for w in word_results)
            overall_score = round(weighted_sum / total_phonemes)
        else:
            overall_score = 0

        matched_words = sum(1 for w in word_results if w["score"] >= MIN_WORD_SCORE)

        response_words = [
            {
                "word": wr["word"],
                "phonemes": wr["phonemes"],
                "score": wr["score"],
                "feedback": wr["feedback"],
            }
            for wr in word_results
        ]

        return {
            "success": True,
            "transcription": {"text": transcription_text},
            "words": response_words,
            "overall_score": overall_score,
            "matched_words": matched_words,
            "total_words": len(word_results),
        }
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


@app.post("/analyze-speaking")
async def analyze_speaking(
    audio: UploadFile = File(...),
    target_text: str = Form(...),
    mode: str = Form(default="SCRIPT_MATCH"),
):
    async with REQUEST_SEMAPHORE:
        return await _analyze_speaking_impl(audio, target_text, mode)


async def _analyze_speaking_impl(
    audio: UploadFile,
    target_text: str,
    mode: str,
):
    if mode not in ("SCRIPT_MATCH", "FREE_SPEAK"):
        raise HTTPException(status_code=400, detail="mode must be SCRIPT_MATCH or FREE_SPEAK")

    target_text = target_text.strip()
    if not target_text:
        raise HTTPException(status_code=400, detail="target_text is required")

    if len(target_text) > MAX_TARGET_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="target_text is too long")

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    raw_bytes = await audio.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large")

    return await asyncio.to_thread(_analyze_speaking_sync, raw_bytes, suffix, target_text, mode)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": {
            "whisperx": _whisperx_model is not None,
            "aligner": get_aligner.cache_info().currsize > 0,
        },
        "dependencies": {
            "ffmpeg": shutil.which("ffmpeg") is not None,
            "espeak_ng": shutil.which("espeak-ng") is not None,
        },
    }


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain; version=0.0.4")
