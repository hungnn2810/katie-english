import io
import math
import shutil
import struct
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app, _wav_duration_s, _rms_dbfs, _to_wav

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_wav(duration_s: float, amplitude: int = 10000, freq: int = 440, sample_rate: int = 16000) -> bytes:
    """Return in-memory PCM 16-bit mono WAV bytes."""
    num_samples = int(duration_s * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit = 2 bytes
        wf.setframerate(sample_rate)
        if amplitude == 0:
            samples = struct.pack(f'{num_samples}h', *([0] * num_samples))
        else:
            import math as _math
            samples = struct.pack(
                f'{num_samples}h',
                *[int(amplitude * _math.sin(2 * _math.pi * freq * i / sample_rate)) for i in range(num_samples)],
            )
        wf.writeframes(samples)
    return buf.getvalue()


def write_wav_to_tmp(tmp_path: Path, bytes_: bytes) -> Path:
    """Write bytes to tmp_path/fixture.wav and return the path."""
    p = tmp_path / "fixture.wav"
    p.write_bytes(bytes_)
    return p


def _copy_to_wav(input_path: Path, output_path: Path) -> None:
    """Fake _to_wav that copies the file in place (input is already a valid WAV).
    Handles the case where input_path == output_path (both .wav extension).
    """
    if input_path.resolve() != output_path.resolve():
        shutil.copy2(str(input_path), str(output_path))
    # else: already in place — no-op


# ---------------------------------------------------------------------------
# Unit tests — helpers (must pass in RED state)
# ---------------------------------------------------------------------------

def test_wav_duration_helper(tmp_path):
    wav_bytes = make_wav(1.0)
    p = write_wav_to_tmp(tmp_path, wav_bytes)
    dur = _wav_duration_s(p)
    assert abs(dur - 1.0) < 1e-3, f"Expected ~1.0s, got {dur}"


def test_rms_dbfs_silence(tmp_path):
    wav_bytes = make_wav(1.0, amplitude=0)
    p = write_wav_to_tmp(tmp_path, wav_bytes)
    result = _rms_dbfs(p)
    assert result == -100.0, f"Expected -100.0 for silence, got {result}"


def test_rms_dbfs_loud(tmp_path):
    wav_bytes = make_wav(1.0, amplitude=20000, freq=1000)
    p = write_wav_to_tmp(tmp_path, wav_bytes)
    result = _rms_dbfs(p)
    assert -30.0 < result < 0.0, f"Expected dBFS in (-30, 0) for loud signal, got {result}"


def test_loudnorm_flag_present(monkeypatch, tmp_path):
    """Verify _to_wav passes loudnorm flag to ffmpeg."""
    captured_args = []

    class FakeResult:
        returncode = 0
        stderr = b""

    def fake_run(args, **kwargs):
        captured_args.extend(args)
        # Pre-create output so the function doesn't fail downstream
        return FakeResult()

    import main as main_module
    monkeypatch.setattr(main_module.subprocess, "run", fake_run)

    in_path = tmp_path / "in.wav"
    out_path = tmp_path / "out.wav"
    # Write a dummy input file
    in_path.write_bytes(make_wav(0.5))
    # Pre-create the output path so downstream callers don't fail
    out_path.write_bytes(b"")

    _to_wav(in_path, out_path)

    assert "-af" in captured_args, f"-af flag missing from ffmpeg args: {captured_args}"
    loudnorm_found = any("loudnorm=I=-16:LRA=11:TP=-1.5" in str(a) for a in captured_args)
    assert loudnorm_found, f"loudnorm string missing from ffmpeg args: {captured_args}"


# ---------------------------------------------------------------------------
# Integration tests — length gate (RED at Task 1 commit — gates not yet wired)
# ---------------------------------------------------------------------------

def test_audio_too_short_returns_400(tmp_path, monkeypatch):
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    wav_bytes = make_wav(0.3)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    body = response.json()
    assert body == {
        "success": False,
        "error": "audio_too_short",
        "message": "Recording too short — hold the button longer",
    }, f"Unexpected body: {body}"


def test_audio_too_long_returns_400(tmp_path, monkeypatch):
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    wav_bytes = make_wav(16.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    body = response.json()
    assert body == {
        "success": False,
        "error": "audio_too_long",
        "message": "Recording too long — keep it under 15 seconds",
    }, f"Unexpected body: {body}"


def test_recording_too_noisy_returns_200(tmp_path, monkeypatch):
    """Silent (all-zero) 1s WAV should trigger energy gate before Groq is called."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    def groq_should_not_be_called(*args, **kwargs):
        raise AssertionError("_groq_transcribe should not be called for silent audio")

    monkeypatch.setattr(main_module, "_groq_transcribe", groq_should_not_be_called)

    wav_bytes = make_wav(1.0, amplitude=0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()
    assert body == {
        "success": False,
        "error": "recording_too_noisy",
        "message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé",
    }, f"Unexpected body: {body}"


# ---------------------------------------------------------------------------
# Integration tests — Task 2 additions (GREEN after gates wired)
# ---------------------------------------------------------------------------

def test_speech_not_detected_empty(monkeypatch, tmp_path):
    """Empty transcript from Groq triggers speech_not_detected gate."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(main_module, "_groq_transcribe", lambda *a, **kw: {"text": "", "words": []})

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()
    assert body == {
        "success": False,
        "error": "speech_not_detected",
        "message": "Không nghe rõ — nói to hơn nhé",
    }, f"Unexpected body: {body}"


def test_speech_not_detected_no_alpha(monkeypatch, tmp_path):
    """Transcript with no alphabetic chars triggers speech_not_detected gate."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(main_module, "_groq_transcribe", lambda *a, **kw: {"text": "@@@ ### ???", "words": []})

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "success": False,
        "error": "speech_not_detected",
        "message": "Không nghe rõ — nói to hơn nhé",
    }, f"Unexpected body: {body}"


def test_wrong_language_vietnamese(monkeypatch, tmp_path):
    """Vietnamese transcript triggers wrong_language gate."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(
        main_module, "_groq_transcribe",
        lambda *a, **kw: {"text": "xin chào bạn tôi", "words": []},
    )

    # Stub langdetect to reliably return Vietnamese
    LangStub = type("L", (object,), {"lang": "vi", "prob": 0.99})
    monkeypatch.setattr(main_module, "detect_langs", lambda text: [LangStub()])

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "success": False,
        "error": "wrong_language",
        "message": "Please speak in English",
    }, f"Unexpected body: {body}"


def test_language_gate_skipped_under_3_words(monkeypatch, tmp_path):
    """Transcript < 3 words skips langdetect gate; response is success=True."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(
        main_module, "_groq_transcribe",
        lambda *a, **kw: {"text": "hello world", "words": [
            {"word": "hello", "start": 0.0, "end": 0.3},
            {"word": "world", "start": 0.3, "end": 0.6},
        ]},
    )
    # Also mock _g2p to avoid needing espeak-ng
    monkeypatch.setattr(main_module, "_g2p", lambda text: list(text.lower().replace(" ", "")))

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "hello", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True, f"Expected success=True, got: {response.json()}"


def test_happy_path_returns_success(monkeypatch, tmp_path):
    """Valid English clip with mocked Groq and g2p returns success=True with score/phonemes."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(
        main_module, "_groq_transcribe",
        lambda *a, **kw: {"text": "cat", "words": [{"word": "cat", "start": 0.0, "end": 0.4}]},
    )
    monkeypatch.setattr(main_module, "_g2p", lambda text: ["k", "æ", "t"])

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True, f"Expected success=True, got: {body}"
    assert isinstance(body["score"], int), f"score should be int, got: {type(body['score'])}"
    assert isinstance(body["phonemes"], list) and len(body["phonemes"]) > 0, "phonemes should be non-empty list"


def test_gate_order_length_before_groq(monkeypatch, tmp_path):
    """Length gate fires before Groq — monkeypatched Groq raise should NOT propagate."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    def groq_should_not_be_called(*args, **kwargs):
        raise AssertionError("groq should not be called")

    monkeypatch.setattr(main_module, "_groq_transcribe", groq_should_not_be_called)

    wav_bytes = make_wav(0.3)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "audio_too_short", f"Unexpected body: {response.json()}"


# ---------------------------------------------------------------------------
# /analyze-speaking smoke tests
# ---------------------------------------------------------------------------

def test_analyze_speaking_length_gate(monkeypatch, tmp_path):
    """Short clip to /analyze-speaking returns 400 audio_too_short."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    wav_bytes = make_wav(0.3)
    response = client.post(
        "/analyze-speaking",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"target_text": "the cat is black"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "audio_too_short", f"Unexpected body: {response.json()}"


def test_analyze_speaking_noisy_gate(monkeypatch, tmp_path):
    """Silent clip to /analyze-speaking returns 200 recording_too_noisy."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    def groq_should_not_be_called(*args, **kwargs):
        raise AssertionError("_groq_transcribe should not be called for silent audio")

    monkeypatch.setattr(main_module, "_groq_transcribe", groq_should_not_be_called)

    wav_bytes = make_wav(1.0, amplitude=0)
    response = client.post(
        "/analyze-speaking",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"target_text": "the cat is black"},
    )
    assert response.status_code == 200
    assert response.json()["error"] == "recording_too_noisy", f"Unexpected body: {response.json()}"


def test_analyze_speaking_wrong_language(monkeypatch, tmp_path):
    """Vietnamese transcript to /analyze-speaking returns 200 wrong_language."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(
        main_module, "_groq_transcribe",
        lambda *a, **kw: {"text": "xin chào bạn tôi", "words": []},
    )
    LangStub = type("L", (object,), {"lang": "vi", "prob": 0.99})
    monkeypatch.setattr(main_module, "detect_langs", lambda text: [LangStub()])

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze-speaking",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"target_text": "the cat is black"},
    )
    assert response.status_code == 200
    assert response.json()["error"] == "wrong_language", f"Unexpected body: {response.json()}"
