"""
Unit tests for BFA pure functions.
Run: cd bfa-service && python -m pytest test_bfa.py -v
No external services required — whisperx/fastapi/prometheus stubs applied via sys.modules.

Test data sources:
- Seeded words (backend/prisma/seed.ts): cat=["c","a","t"], dog=["d","o","g"], ship=["sh","i","p"]
- Simplified symbols from IPA_TO_SIMPLIFIED map in main.py (k→c, ʃ→sh, ɪ→i, ɒ→o, ɡ→g)
- Vietnamese learner errors: final-consonant deletion (ship→"shi"), l/r, v/b, th/d, p/b confusion
  (Source: TEFL Academy, Packard Communications Vietnamese pronunciation research)
- Score formula: score = max(0, round((1 - edit_distance / max(len(expected), len(aligned), 1)) * 100))
  Verified: 1 missing in 3-phoneme word → distance=1, denom=3, score=67
            1 similar (cost 0.5) in 1-phoneme word → distance=0.5, denom=1, score=50
"""
import sys
from unittest.mock import MagicMock

# ── Stub all non-stdlib deps before importing main ──────────────────────────
for _mod in [
    "whisperx",
    "bournemouth_aligner",
    "fastapi",
    "fastapi.responses",
    "prometheus_client",
]:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

import main  # noqa: E402 — must come after stubs

# ── Fixtures: seeded word phonemes (matches backend/prisma/seed.ts exactly) ─

CAT   = ["c", "a", "t"]    # /kæt/  — k→c, æ→a, t→t
DOG   = ["d", "o", "g"]    # /dɒg/  — d→d, ɒ→o, ɡ→g
SHIP  = ["sh", "i", "p"]   # /ʃɪp/  — ʃ→sh, ɪ→i, p→p

# ── _phoneme_cost ────────────────────────────────────────────────────────────

def test_phoneme_cost_identical():
    assert main._phoneme_cost("l", "l") == 0.0
    assert main._phoneme_cost("sh", "sh") == 0.0
    assert main._phoneme_cost("c", "c") == 0.0


def test_phoneme_cost_all_similar_pairs():
    """Every pair in _SIMILAR_PAIRS must cost exactly 0.5 in both directions."""
    for pair in main._SIMILAR_PAIRS:
        a, b = tuple(pair)
        assert main._phoneme_cost(a, b) == 0.5, f"Expected 0.5 for ({a!r}, {b!r})"
        assert main._phoneme_cost(b, a) == 0.5, f"Expected 0.5 for ({b!r}, {a!r})"


def test_phoneme_cost_unrelated():
    assert main._phoneme_cost("c", "z") == 1.0
    assert main._phoneme_cost("a", "sh") == 1.0
    assert main._phoneme_cost("sh", "ng") == 1.0


def test_phoneme_cost_vietnamese_confusion_pairs():
    """Spot-check key Vietnamese learner confusion pairs are in _SIMILAR_PAIRS."""
    assert main._phoneme_cost("l", "r") == 0.5   # l/r — most common Vietnamese error
    assert main._phoneme_cost("v", "b") == 0.5   # v/b — "very" → "bery"
    assert main._phoneme_cost("th", "d") == 0.5  # th/d — "this" → "dis"
    assert main._phoneme_cost("th", "t") == 0.5  # th/t — "both" → "bot"
    assert main._phoneme_cost("p", "b") == 0.5   # p/b — voiced/unvoiced pair
    assert main._phoneme_cost("s", "z") == 0.5   # s/z — final consonant confusion


# ── score_alignment — seeded words ──────────────────────────────────────────

def test_seeded_word_cat_perfect():
    score, ops = main.score_alignment(CAT, CAT)
    assert score == 100
    assert len(ops) == 3
    assert all(op["status"] == "correct" for op in ops)


def test_seeded_word_dog_perfect():
    score, ops = main.score_alignment(DOG, DOG)
    assert score == 100
    assert all(op["status"] == "correct" for op in ops)


def test_seeded_word_ship_perfect():
    score, ops = main.score_alignment(SHIP, SHIP)
    assert score == 100
    assert all(op["status"] == "correct" for op in ops)


# ── score_alignment — Vietnamese learner error scenarios ────────────────────

def test_vietnamese_final_consonant_deletion_ship():
    """
    Vietnamese learners often drop final consonants: "ship" → "shi".
    Research: final /p/, /t/, /k/ deletion is the most common Vietnamese ESL error.
    Expected: ["sh","i","p"] | Aligned (spoken): ["sh","i"]
    Missing "p" → distance=1, denom=max(3,2)=3, score=round((1-1/3)*100)=67
    """
    score, ops = main.score_alignment(SHIP, ["sh", "i"])
    statuses = [op["status"] for op in ops]
    assert "missing" in statuses
    missing = [op for op in ops if op["status"] == "missing"]
    assert len(missing) == 1
    assert missing[0]["expected"] == "p"
    assert score == 67


def test_vietnamese_final_consonant_deletion_cat():
    """
    "cat" spoken as "ca" — drops final /t/.
    distance=1, denom=3, score=67
    """
    score, ops = main.score_alignment(CAT, ["c", "a"])
    missing = [op for op in ops if op["status"] == "missing"]
    assert any(op["expected"] == "t" for op in missing)
    assert score == 67


def test_vietnamese_lr_confusion_d01_regression():
    """
    D-01 regression guard: l/r is in _SIMILAR_PAIRS → must produce status='similar'.
    Vietnamese speakers substitute /r/ with /l/ (e.g. "rice" → "lice").
    distance=0.5, denom=1, score=round((1-0.5)*100)=50
    """
    score, ops = main.score_alignment(["r"], ["l"])
    assert len(ops) == 1
    op = ops[0]
    assert op["status"] == "similar", (
        f"D-01 regression: r/l must be 'similar', got {op['status']!r}"
    )
    assert op["expected"] == "r"
    assert op["aligned"] == "l"
    assert score == 50


def test_vietnamese_vb_confusion():
    """
    v/b confusion: "very" /v er e/ spoken as /b er e/.
    Vietnamese lacks /v/, substitutes with /b/ (e.g. "very" → "bery").
    Only first phoneme differs (similar); rest correct.
    """
    score, ops = main.score_alignment(["v", "er", "e"], ["b", "er", "e"])
    assert ops[0]["status"] == "similar"
    assert ops[0]["expected"] == "v"
    assert ops[0]["aligned"] == "b"
    assert ops[1]["status"] == "correct"
    assert ops[2]["status"] == "correct"
    # distance=0.5, denom=3, score=round((1-0.5/3)*100)=round(83.3)=83
    assert score == 83


def test_vietnamese_thd_confusion():
    """
    th/d confusion: "that" /th a t/ spoken as /d a t/.
    Vietnamese lacks dental fricatives /θ,ð/, replaces with /d/.
    """
    score, ops = main.score_alignment(["th", "a", "t"], ["d", "a", "t"])
    assert ops[0]["status"] == "similar"
    assert ops[0]["expected"] == "th"
    assert ops[0]["aligned"] == "d"
    assert score == 83


def test_vietnamese_pb_confusion_ship():
    """
    p/b confusion in initial position: "pig" expected /p i g/ aligned /b i g/.
    p/b are a voiced/unvoiced pair in _SIMILAR_PAIRS.
    """
    score, ops = main.score_alignment(["p", "i", "g"], ["b", "i", "g"])
    assert ops[0]["status"] == "similar"
    assert score == 83


# ── score_alignment — algorithm correctness ──────────────────────────────────

def test_score_alignment_substituted_unrelated():
    """Unrelated phoneme → 'substituted', not 'similar'. score=0 for single phoneme."""
    score, ops = main.score_alignment(["c"], ["z"])
    assert ops[0]["status"] == "substituted"
    assert score == 0


def test_score_alignment_extra_phonemes():
    """Aligned has more phonemes than expected → 'extra' ops with expected=None."""
    score, ops = main.score_alignment(CAT, ["c", "a", "t", "s"])
    extra = [op for op in ops if op["status"] == "extra"]
    assert len(extra) == 1
    assert extra[0]["aligned"] == "s"
    assert extra[0]["expected"] is None


def test_score_alignment_empty_expected_all_extra():
    """Empty expected with aligned phonemes → all 'extra', score=0."""
    score, ops = main.score_alignment([], ["a", "b"])
    assert score == 0
    assert all(op["status"] == "extra" for op in ops)


def test_score_alignment_empty_both():
    """Both empty → score=100, no ops."""
    score, ops = main.score_alignment([], [])
    assert score == 100
    assert ops == []


def test_score_alignment_mixed_correct_similar_missing():
    """
    ship /sh i p/ spoken as /sh e/ — sh correct, i/e similar, p missing.
    i/e pair is in _SIMILAR_PAIRS.
    """
    score, ops = main.score_alignment(SHIP, ["sh", "e"])
    statuses = [op["status"] for op in ops]
    assert "correct" in statuses   # sh
    assert "similar" in statuses   # i→e
    assert "missing" in statuses   # p
    assert 0 < score < 100


# ── normalize_ipa ────────────────────────────────────────────────────────────

def test_normalize_ipa_strips_primary_stress():
    assert "ˈ" not in main.normalize_ipa("ˈæ")


def test_normalize_ipa_strips_length_mark():
    assert "ː" not in main.normalize_ipa("aː")


def test_normalize_ipa_strips_secondary_stress():
    assert "ˌ" not in main.normalize_ipa("ˌɑ")


def test_normalize_ipa_lowercases():
    result = main.normalize_ipa("A")
    assert result == result.lower()


def test_normalize_ipa_maps_k_to_c():
    # IPA /k/ → simplified "c" (IPA_TO_SIMPLIFIED: "k": "c")
    assert main.normalize_ipa("k") == "c"


# ── error_payload ────────────────────────────────────────────────────────────

def test_error_payload_shape():
    payload = main.error_payload("cat", "no speech detected")
    assert payload["success"] is False
    assert payload["word"] == "cat"
    assert payload["score"] == 0
    assert payload["phonemes"] == []
    assert len(payload["feedback"]) == 1
    fb = payload["feedback"][0]
    assert fb["status"] == "error"
    assert "no speech detected" in fb["message"]
    assert fb["expected"] is None
    assert fb["aligned"] is None
