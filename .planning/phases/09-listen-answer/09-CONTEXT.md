# Phase 9: Listen & Answer Exercise — Context

**Gathered:** 2026-05-23
**Status:** Ready for planning
**Source:** STATEGY.MD Exercise 2 — Listen and Answer

<domain>
## Phase Boundary

New homework type: `LISTEN`. Teacher creates Q&A items with audio prompts and expected keywords. Student listens, records answer, system scores semantic similarity + pronunciation. Composite score stored.

Key challenge (per STATEGY.MD §1 Exercise 2): Children give truncated answers ("Red." instead of "The cat is red."). Semantic matching must be more forgiving than exact string comparison — sentence-transformers handles this.

Depends on: Phase 5 (BFA transcribe + analyze pipeline), Phase 7 (audio gates), Phase 8 (establishes VOCABULARY type pattern — LISTEN follows same schema extension approach).

Does NOT touch: phonics game, vocabulary game, speaking homework, reading homework, admin portal.

New dependency introduced: `sentence-transformers` (all-MiniLM-L6-v2, 80MB, CPU, Apache-2.0) added to bfa-service.

</domain>

<decisions>
## Implementation Decisions

### D-01: New HomeworkType enum variant
Add `LISTEN` to `HomeworkType` enum in `prisma/schema.prisma`.

### D-02: ListenItem model
```
model ListenItem {
  id           Int      @id @default(autoincrement())
  homeworkId   Int
  homework     Homework @relation("ListenItems", fields: [homeworkId], references: [id], onDelete: Cascade)
  audioUrl     String   // uploaded by teacher or TTS-generated
  keywords     String   // JSON array of expected keywords e.g. ["red", "cat"]
  expectedText String   // full expected answer for semantic scoring
  order        Int      @default(0)
}
```

### D-03: ListenItemResult model
New model (not reusing PhonicsItemResult — different shape):
```
model ListenItemResult {
  id              Int             @id @default(autoincrement())
  sessionId       Int
  session         HomeworkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  itemOrder       Int
  transcript      String          // Groq ASR output
  semanticScore   Float           // 0.0–1.0 from sentence-transformers
  pronScore       Float           // 0.0–100 from BFA on matched keywords
  compositeScore  Float           // semanticScore*0.7 + (pronScore/100)*0.3, stored as 0.0–1.0
  bfaFeedback     String?         // JSON — BFA feedback for matched keywords
}
```

### D-04: Semantic Scoring — OpenAI GPT-4o-mini *(updated 2026-06-11)*
~~sentence-transformers / bfa-service~~ **REPLACED** by OpenAI Chat Completions API.

`BfaService.scoreSemantic()` in `backend/src/bfa/bfa.service.ts` now:
1. **Keyword matching** — local TypeScript regex `\b...\b` (same logic as original Python, deterministic, no API call)
2. **Semantic score** — POST to `https://api.openai.com/v1/chat/completions` with `gpt-4o-mini`, `response_format: json_object`, returns `{"semantic_score": float}`

Env vars required: `OPENAI_API_KEY` (required), `OPENAI_MODEL` (default: `gpt-4o-mini`).
If `OPENAI_API_KEY` not set → `semanticScore=0`, keywords still matched locally.

The Python bfa-service `/score-semantic` endpoint is no longer called by any backend code.

Truncated answer handling: GPT-4o-mini instructed to be lenient ("Red." vs "The cat is red." → 0.7-0.8).

### D-05: Pronunciation Scoring (LISTEN-06)
After semantic scoring, take `matched_keywords` (words student actually said). For each matched keyword, call `bfa.analyze(audio_segment, word, phonemes)`.

Simplification for MVP: instead of audio segmentation per keyword (complex), run BFA on the full student answer audio with `word = " ".join(matched_keywords)` → use `analyze-speaking` endpoint (multi-word mode). This gives per-word pronunciation feedback for matched keywords.

If no keywords matched (semantic_score < 0.3): pronunciation score = 0, skip BFA call.

### D-06: Composite Score Formula
```
composite = semantic_score * 0.7 + (pron_score / 100) * 0.3
```
Stored as `Float` 0.0–1.0 in `ListenItemResult.compositeScore`.
Overall session score = average composite across all items × 100.

### D-07: Audio Prompt Source
Teacher can upload an audio file (mp3/wav/webm). TTS generation (text → audio) deferred — requires TTS service integration. For MVP: upload only.

### D-08: Student Game Flow
1. Show Q&A item (image optional, text prompt shown, audio plays automatically)
2. Play button to replay audio
3. Record button → student records answer
4. Submit → transcribe → semantic score → pronunciation score → composite
5. Show result: transcript, matched keywords highlighted, composite score
6. Next item

### D-09: Semantic Score Threshold
If `semantic_score < 0.2`: answer classified as "wrong" — show "hãy thử lại, nghe kỹ câu hỏi nhé". No pronunciation scoring. Composite = 0.

If `semantic_score >= 0.2`: score normally even if low.

### D-10: bfa-service startup — model loading
`sentence-transformers` model loads ~3s on first use. Load eagerly in FastAPI lifespan alongside existing Groq health check. Add to `/health` response: `"minilm_loaded": bool`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `backend/prisma/schema.prisma` — HomeworkType enum + existing result models (pattern reference)
- `backend/src/game/game.service.ts` — `completeSession` branching pattern — LISTEN branch mirrors PHONICS/VOCAB
- `bfa-service/main.py` — Add `/score-semantic` endpoint + sentence-transformers model warm-up
- `bfa-service/requirements.txt` — Add `sentence-transformers==2.7.0`
- `frontend/app/game/session/[id]/page.tsx` — Student game flow pattern reference
- `.planning/phases/08-vocabulary-image/08-CONTEXT.md` — HomeworkType extension pattern (mirrors Phase 8 approach)
- `STATEGY.MD` §1 Exercise 2, §4 semantic similarity row — Requirements source

</canonical_refs>

<specifics>
## bfa-service /score-semantic endpoint

```python
from sentence_transformers import SentenceTransformer, util

_minilm_model: Optional[SentenceTransformer] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _minilm_model
    _minilm_model = SentenceTransformer('all-MiniLM-L6-v2')
    yield

@app.post("/score-semantic")
async def score_semantic(
    student_text: str = Form(...),
    expected_text: str = Form(...),
    keywords: str = Form("[]"),  # JSON array
):
    kw_list = json.loads(keywords)
    
    # Semantic similarity
    emb_student  = _minilm_model.encode(student_text, convert_to_tensor=True)
    emb_expected = _minilm_model.encode(expected_text, convert_to_tensor=True)
    semantic_score = float(util.cos_sim(emb_student, emb_expected)[0][0])
    semantic_score = max(0.0, min(1.0, semantic_score))
    
    # Keyword matching (word-boundary regex)
    matched = [
        kw for kw in kw_list
        if re.search(r'\b' + re.escape(kw.lower()) + r'\b', student_text.lower())
    ]
    
    return {
        "semantic_score": round(semantic_score, 4),
        "matched_keywords": matched,
    }
```

## Composite Score NestJS Side

```typescript
// game.service.ts — LISTEN branch
const semanticResult = await this.bfa.scoreSemanticText(
  transcript, item.expectedText, JSON.parse(item.keywords)
);
const pronResult = semanticResult.semanticScore >= 0.2 && semanticResult.matchedKeywords.length > 0
  ? await this.bfa.analyzeSpeaking(audio, mimeType, semanticResult.matchedKeywords.join(' '))
  : null;
const pronScore = pronResult?.overall_score ?? 0;
const composite = semanticResult.semanticScore * 0.7 + (pronScore / 100) * 0.3;
```

</specifics>

<deferred>
## Deferred Ideas

- TTS audio generation (teacher types text → system generates audio prompt) — requires TTS service
- Audio segmentation per keyword for more precise pronunciation scoring — complex, post-v2
- Image support alongside audio prompt — future enrichment
- CEFR-level keyword weighting — post-v2
- Real-time streaming ASR (WebSocket) for live feedback — out of scope

</deferred>

---

*Phase: 09-listen-answer*
*Context gathered: 2026-05-23 from STATEGY.MD + existing codebase patterns*
