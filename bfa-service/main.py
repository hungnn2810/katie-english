import json
import re
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Form
from sentence_transformers import SentenceTransformer, util

_minilm_model: Optional[SentenceTransformer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _minilm_model
    # Eager load — ~3s on first start. Subsequent requests are fast.
    _minilm_model = SentenceTransformer('all-MiniLM-L6-v2')
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "minilm_loaded": _minilm_model is not None,
    }


@app.post("/score-semantic")
async def score_semantic(
    student_text: str = Form(...),
    expected_text: str = Form(...),
    keywords: str = Form("[]"),  # JSON array string
):
    if _minilm_model is None:
        return {"semantic_score": 0.0, "matched_keywords": []}

    # WR-03: guard against arbitrarily large inputs that could OOM the worker
    MAX_TEXT_LEN = 2000
    if len(student_text) > MAX_TEXT_LEN or len(expected_text) > MAX_TEXT_LEN:
        return {"semantic_score": 0.0, "matched_keywords": []}

    # WR-04: guard against malformed keywords JSON
    try:
        kw_list: list[str] = json.loads(keywords)
        if not isinstance(kw_list, list):
            kw_list = []
    except json.JSONDecodeError:
        kw_list = []

    # Semantic similarity via cosine distance of sentence embeddings
    emb_student = _minilm_model.encode(student_text, convert_to_tensor=True)
    emb_expected = _minilm_model.encode(expected_text, convert_to_tensor=True)
    semantic_score = float(util.cos_sim(emb_student, emb_expected)[0][0])
    semantic_score = max(0.0, min(1.0, semantic_score))

    # Keyword matching — word-boundary regex (per D-04)
    matched = [
        kw for kw in kw_list
        if re.search(r'\b' + re.escape(kw.lower()) + r'\b', student_text.lower())
    ]

    return {
        "semantic_score": round(semantic_score, 4),
        "matched_keywords": matched,
    }
