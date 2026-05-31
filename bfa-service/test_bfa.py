import io
import math
import shutil
import struct
import unittest.mock as mock
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app, _wav_duration_s, _rms_dbfs, _to_wav, _map_phoneme_ops

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
# Mock Azure response fixtures
# ---------------------------------------------------------------------------

MOCK_PA_RESPONSE = {
    "RecognitionStatus": "Success",
    "DisplayText": "cat.",
    "NBest": [{
        "Lexical": "cat",
        "PronunciationAssessment": {"AccuracyScore": 90.0, "FluencyScore": 95.0, "PronScore": 91.0},
        "Words": [{
            "Word": "cat",
            "Offset": 1000000,
            "Duration": 4000000,
            "PronunciationAssessment": {"AccuracyScore": 90.0, "ErrorType": "None"},
            "Phonemes": [
                {"Phoneme": "k", "PronunciationAssessment": {"AccuracyScore": 95.0}, "Offset": 1000000, "Duration": 800000},
                {"Phoneme": "ae", "PronunciationAssessment": {"AccuracyScore": 85.0}, "Offset": 1800000, "Duration": 1200000},
                {"Phoneme": "t", "PronunciationAssessment": {"AccuracyScore": 92.0}, "Offset": 3000000, "Duration": 800000},
            ]
        }]
    }]
}


def _mock_response(data: dict, status: int = 200):
    m = mock.MagicMock()
    m.ok = (status < 400)
    m.status_code = status
    m.json.return_value = data
    return m


# ---------------------------------------------------------------------------
# Unit tests — helpers
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
        return FakeResult()

    import main as main_module
    monkeypatch.setattr(main_module.subprocess, "run", fake_run)

    in_path = tmp_path / "in.wav"
    out_path = tmp_path / "out.wav"
    in_path.write_bytes(make_wav(0.5))
    out_path.write_bytes(b"")

    _to_wav(in_path, out_path)

    assert "-af" in captured_args, f"-af flag missing from ffmpeg args: {captured_args}"
    loudnorm_found = any("loudnorm=I=-16:LRA=11:TP=-1.5" in str(a) for a in captured_args)
    assert loudnorm_found, f"loudnorm string missing from ffmpeg args: {captured_args}"


# ---------------------------------------------------------------------------
# Unit tests — _map_phoneme_ops
# ---------------------------------------------------------------------------

def test_map_phoneme_ops_correct():
    """All phonemes with AccuracyScore >= 80 should be 'correct'."""
    word_data = {
        "PronunciationAssessment": {"AccuracyScore": 90.0, "ErrorType": "None"},
        "Phonemes": [
            {"Phoneme": "k", "PronunciationAssessment": {"AccuracyScore": 95.0}, "Offset": 1000000, "Duration": 800000},
            {"Phoneme": "ae", "PronunciationAssessment": {"AccuracyScore": 85.0}, "Offset": 1800000, "Duration": 1200000},
            {"Phoneme": "t", "PronunciationAssessment": {"AccuracyScore": 92.0}, "Offset": 3000000, "Duration": 800000},
        ]
    }
    ops = _map_phoneme_ops(word_data)
    assert len(ops) == 3
    for op in ops:
        assert op["status"] == "correct", f"Expected 'correct', got '{op['status']}' for phoneme '{op['expected']}'"
        assert op["aligned"] == op["expected"]
        assert op["start"] is not None
        assert op["end"] is not None
        assert op["duration"] is not None


def test_map_phoneme_ops_thresholds():
    """Test threshold boundary values: 79->similar, 80->correct, 49->substituted, 50->similar."""
    word_data = {
        "PronunciationAssessment": {"AccuracyScore": 60.0, "ErrorType": "None"},
        "Phonemes": [
            {"Phoneme": "k", "PronunciationAssessment": {"AccuracyScore": 79.0}, "Offset": 0, "Duration": 500000},
            {"Phoneme": "ae", "PronunciationAssessment": {"AccuracyScore": 80.0}, "Offset": 500000, "Duration": 500000},
            {"Phoneme": "t", "PronunciationAssessment": {"AccuracyScore": 49.0}, "Offset": 1000000, "Duration": 500000},
            {"Phoneme": "s", "PronunciationAssessment": {"AccuracyScore": 50.0}, "Offset": 1500000, "Duration": 500000},
        ]
    }
    ops = _map_phoneme_ops(word_data)
    assert ops[0]["status"] == "similar",      f"79 -> expected 'similar', got '{ops[0]['status']}'"
    assert ops[1]["status"] == "correct",      f"80 -> expected 'correct', got '{ops[1]['status']}'"
    assert ops[2]["status"] == "substituted",  f"49 -> expected 'substituted', got '{ops[2]['status']}'"
    assert ops[3]["status"] == "similar",      f"50 -> expected 'similar', got '{ops[3]['status']}'"


# ---------------------------------------------------------------------------
# Integration tests — length gate
# ---------------------------------------------------------------------------

def test_length_gate_too_short(tmp_path, monkeypatch):
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    wav_bytes = make_wav(0.3)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body == {
        "success": False,
        "error": "audio_too_short",
        "message": "Recording too short — hold the button longer",
    }, f"Unexpected body: {body}"


def test_length_gate_too_long(tmp_path, monkeypatch):
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    wav_bytes = make_wav(16.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body == {
        "success": False,
        "error": "audio_too_long",
        "message": "Recording too long — keep it under 15 seconds",
    }, f"Unexpected body: {body}"


def test_energy_gate(tmp_path, monkeypatch):
    """Silent (all-zero) 1s WAV should trigger energy gate before Azure is called."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    wav_bytes = make_wav(1.0, amplitude=0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "success": False,
        "error": "recording_too_noisy",
        "message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé",
    }, f"Unexpected body: {body}"


# ---------------------------------------------------------------------------
# Integration tests — Azure PA scoring
# ---------------------------------------------------------------------------

def test_azure_pa_correct_phonemes(monkeypatch, tmp_path):
    """Mock Azure PA response with all correct phonemes, assert score=90 and ops all 'correct'."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)
    monkeypatch.setattr(main_module, "_azure_pa_assess", lambda wav, ref: MOCK_PA_RESPONSE)

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True, f"Expected success=True, got: {body}"
    assert body["score"] == 90, f"Expected score=90, got {body['score']}"
    for op in body["feedback"]:
        assert op["status"] == "correct", f"Expected 'correct', got '{op['status']}'"


def test_azure_pa_low_score_substituted(monkeypatch, tmp_path):
    """Mock PA response with AccuracyScore=30 phoneme, assert status='substituted'."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    low_score_response = {
        "RecognitionStatus": "Success",
        "DisplayText": "cat.",
        "NBest": [{
            "Lexical": "cat",
            "PronunciationAssessment": {"AccuracyScore": 30.0, "FluencyScore": 50.0, "PronScore": 30.0},
            "Words": [{
                "Word": "cat",
                "Offset": 1000000,
                "Duration": 4000000,
                "PronunciationAssessment": {"AccuracyScore": 30.0, "ErrorType": "None"},
                "Phonemes": [
                    {"Phoneme": "k", "PronunciationAssessment": {"AccuracyScore": 30.0}, "Offset": 1000000, "Duration": 800000},
                ]
            }]
        }]
    }
    monkeypatch.setattr(main_module, "_azure_pa_assess", lambda wav, ref: low_score_response)

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["feedback"][0]["status"] == "substituted", f"Expected 'substituted', got: {body['feedback'][0]['status']}"


def test_azure_pa_similar_score(monkeypatch, tmp_path):
    """Mock PA response with AccuracyScore=65, assert status='similar'."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    similar_response = {
        "RecognitionStatus": "Success",
        "DisplayText": "cat.",
        "NBest": [{
            "Lexical": "cat",
            "PronunciationAssessment": {"AccuracyScore": 65.0, "FluencyScore": 70.0, "PronScore": 65.0},
            "Words": [{
                "Word": "cat",
                "Offset": 1000000,
                "Duration": 4000000,
                "PronunciationAssessment": {"AccuracyScore": 65.0, "ErrorType": "None"},
                "Phonemes": [
                    {"Phoneme": "ae", "PronunciationAssessment": {"AccuracyScore": 65.0}, "Offset": 1000000, "Duration": 1200000},
                ]
            }]
        }]
    }
    monkeypatch.setattr(main_module, "_azure_pa_assess", lambda wav, ref: similar_response)

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["feedback"][0]["status"] == "similar", f"Expected 'similar', got: {body['feedback'][0]['status']}"


def test_azure_pa_omission_word(monkeypatch, tmp_path):
    """Mock word ErrorType='Omission', assert all ops are 'missing'."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    omission_response = {
        "RecognitionStatus": "Success",
        "DisplayText": "cat.",
        "NBest": [{
            "Lexical": "cat",
            "PronunciationAssessment": {"AccuracyScore": 0.0, "FluencyScore": 50.0, "PronScore": 0.0},
            "Words": [{
                "Word": "cat",
                "Offset": 0,
                "Duration": 0,
                "PronunciationAssessment": {"AccuracyScore": 0.0, "ErrorType": "Omission"},
                "Phonemes": [
                    {"Phoneme": "k", "PronunciationAssessment": {"AccuracyScore": 0.0}, "Offset": 0, "Duration": 0},
                    {"Phoneme": "ae", "PronunciationAssessment": {"AccuracyScore": 0.0}, "Offset": 0, "Duration": 0},
                    {"Phoneme": "t", "PronunciationAssessment": {"AccuracyScore": 0.0}, "Offset": 0, "Duration": 0},
                ]
            }]
        }]
    }
    monkeypatch.setattr(main_module, "_azure_pa_assess", lambda wav, ref: omission_response)

    wav_bytes = make_wav(2.0)
    response = client.post(
        "/analyze",
        files={"audio": ("fixture.wav", wav_bytes, "audio/wav")},
        data={"word": "cat", "expected_phonemes": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    for op in body["feedback"]:
        assert op["status"] == "missing", f"Expected 'missing', got '{op['status']}'"
        assert op["aligned"] is None
        assert op["start"] is None


def test_speech_not_detected(monkeypatch, tmp_path):
    """Mock RecognitionStatus='NoMatch' should trigger speech_not_detected gate."""
    import main as main_module
    monkeypatch.setattr(main_module, "_to_wav", _copy_to_wav)

    no_match_response = {
        "RecognitionStatus": "NoMatch",
        "DisplayText": "",
        "NBest": []
    }
    monkeypatch.setattr(main_module, "_azure_pa_assess", lambda wav, ref: no_match_response)

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


# ---------------------------------------------------------------------------
# Integration tests — /analyze-speaking
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

    vi_response = {
        "RecognitionStatus": "Success",
        "DisplayText": "xin chào bạn tôi.",
        "NBest": [{
            "Lexical": "xin chao ban toi",
            "PronunciationAssessment": {"AccuracyScore": 50.0, "FluencyScore": 60.0, "PronScore": 50.0},
            "Words": []
        }]
    }
    monkeypatch.setattr(main_module, "_azure_pa_assess", lambda wav, ref: vi_response)
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
