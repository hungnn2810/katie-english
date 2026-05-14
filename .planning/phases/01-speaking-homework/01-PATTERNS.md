# Phase 1: Speaking Homework (Continuation) - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/game/game.scoring.ts` | utility | transform | itself (D-05 patch only) | exact |
| `backend/src/bfa/bfa.service.ts` | service | request-response | itself (D-22 patch only) | exact |
| `backend/src/bfa/bfa.dto.ts` | model | — | itself (D-20 type change) | exact |
| `backend/src/game/game.controller.ts` | controller | request-response | itself + existing `saveSpeakingResult` endpoint | exact |
| `backend/src/game/game.service.ts` | service | request-response | `saveSpeakingResult` method in same file | exact |
| `backend/src/homework/image.controller.ts` | controller | file-I/O | `game.controller.ts` streaming endpoints | role-match |
| `bfa-service/main.py` | service | streaming / transform | itself — `/transcribe` endpoint + `/align` endpoint | exact |
| `frontend/app/teacher/homework/[id]/try/page.tsx` | component | request-response | `frontend/app/game/session/[id]/page.tsx` (`upload` state) | role-match |
| `frontend/app/game/session/[id]/page.tsx` | component | request-response | itself (D-16 results block patch) | exact |

---

## Pattern Assignments

### `backend/src/game/game.scoring.ts` — D-05: replace bare `includes()` in `calcFreeSpeak`

**Analog:** itself

**Current broken line** (line 75):
```typescript
const matched = kws.filter((kw) => text.includes(kw)).length;
```

**Imports pattern** (lines 1-12 — no imports needed; `levenshtein` is already defined in the same file at lines 1-12):
```typescript
// levenshtein() is already exported from line 1 — reuse directly in matchesKeyword()
export function levenshtein(a: string, b: string): number { ... }
```

**tokenize() helper** (lines 14-19 — reuse the existing private tokenizer):
```typescript
function tokenize(text: string): string[] {
  return text.toLowerCase().trim()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
```

**Core pattern — new `matchesKeyword` helper + updated `calcFreeSpeak`** (replace lines 65-81):
```typescript
// New private helper — insert before calcFreeSpeak
function matchesKeyword(transcript: string, kw: string): boolean {
  // Step 1: word-boundary regex (escape special regex chars first)
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escaped}\\b`, 'i').test(transcript)) return true;
  // Step 2: Levenshtein fuzzy fallback at >= 0.75 similarity
  const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);
  return words.some((w) => {
    const maxLen = Math.max(w.length, kw.length);
    if (maxLen === 0) return false;
    return (1 - levenshtein(w, kw) / maxLen) >= 0.75;
  });
}

// Updated calcFreeSpeak — only the inner filter line changes
export function calcFreeSpeak(
  transcript: string,
  keywords: string,
): { score: number; matchedWords: number; totalWords: number } {
  const kws = keywords
    .split(',')
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean);
  if (kws.length === 0) return { score: 0, matchedWords: 0, totalWords: 0 };
  const text = transcript.toLowerCase();
  const matched = kws.filter((kw) => matchesKeyword(text, kw)).length;  // FIXED
  return {
    score: Math.round((matched / kws.length) * 100),
    matchedWords: matched,
    totalWords: kws.length,
  };
}
```

**Error handling:** No try/catch needed — pure computation. Same as existing function.

---

### `backend/src/bfa/bfa.service.ts` — D-22: fix MIME extension mapping

**Analog:** itself

**Current broken pattern** (lines 18 and 33 — identical in both `align()` and `transcribe()` methods):
```typescript
const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
```

**Replacement pattern** — extract a helper, apply in both methods:
```typescript
// Add above the class declaration (or as a private static method inside)
function mimeToExt(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  return 'wav';
}
```

Apply in both methods (line 18 in `align()`, line 33 in `transcribe()`):
```typescript
// Before:
const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
// After:
const ext = mimeToExt(mimeType);
```

**Full file structure** (lines 1-43 — import block unchanged):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData = require('form-data');
import { BfaAlignResult, WhisperXResult } from './bfa.dto';
```

---

### `backend/src/bfa/bfa.dto.ts` — D-20: make `words` optional in `WhisperXResult`

**Analog:** itself

**Current** (lines 26-29):
```typescript
export interface WhisperXResult {
  text: string;
  words: WhisperXWord[];
}
```

**Required change** (make `words` optional — BFA `/transcribe` no longer returns it after D-20):
```typescript
export interface WhisperXResult {
  text: string;
  words?: WhisperXWord[];   // optional: alignment removed from /transcribe (D-20)
}
```

`WhisperXWord` interface (lines 19-24) stays unchanged.

---

### `backend/src/game/game.controller.ts` — D-13/D-15: add `POST /game/homework/:id/try-speak`

**Analog:** existing `saveSpeakingResult` endpoint in same file (lines 43-50)

**Imports pattern** (lines 1-10 — add `ParseIntPipe` already imported; no new imports):
```typescript
import {
  Controller, Get, Post, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, UseGuards, Res, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
```

**Auth guard pattern** (line 11 — class-level decorator, all endpoints inherit it):
```typescript
@UseGuards(AuthGuard)
@Controller('game')
export class GameController {
```

**Core pattern — new endpoint** (insert after `saveSpeakingResult`, before `completeSession`):
```typescript
@Post('homework/:id/try-speak')
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
trySpeakingHomework(
  @Param('id', ParseIntPipe) hwId: number,
  @UploadedFile() audio?: Express.Multer.File,
) {
  return this.service.trySpeakingHomework(hwId, audio?.buffer, audio?.mimetype);
}
```

**Pattern reference** — mirrors `saveSpeakingResult` endpoint exactly (lines 43-50):
```typescript
@Post('session/:id/speaking-result')
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
saveSpeakingResult(
  @Param('id', ParseIntPipe) id: number,
  @UploadedFile() audio?: Express.Multer.File,
) {
  return this.service.saveSpeakingResult(id, audio?.buffer, audio?.mimetype);
}
```

---

### `backend/src/game/game.service.ts` — D-13/D-15: add `trySpeakingHomework` method

**Analog:** `saveSpeakingResult` method in same file (lines 35-61)

**Imports pattern** (lines 1-7 — add `HomeworkRepository` import):
```typescript
// GameModule does NOT import HomeworkModule — HomeworkRepository is not exported.
// Simplest fix: use PrismaService directly in GameService for a single findUnique,
// OR add HomeworkRepository to game.module.ts imports (preferred — see Module note below).
// Preferred approach: inject PrismaService (already available via PrismaModule in GameModule):
import { PrismaService } from '../prisma/prisma.service';
```

**Constructor injection** (line 13-17 — add PrismaService if HomeworkRepository not available):
```typescript
constructor(
  private readonly repo: GameRepository,
  private readonly storage: StorageService,
  private readonly bfa: BfaService,
  private readonly prisma: PrismaService,   // add for direct homework lookup
) {}
```

**Core pattern — new service method** (insert after `saveSpeakingResult`):
```typescript
async trySpeakingHomework(hwId: number, audioBuffer?: Buffer, mimeType?: string) {
  // Load homework directly — no session involved
  const hw = await this.prisma.homework.findUnique({
    where: { id: hwId },
    select: { type: true, speakingMode: true, speakingText: true, speakingPictureUrl: true },
  });
  if (!hw) throw new NotFoundException(`Homework ${hwId} not found`);
  if (hw.type !== 'SPEAKING') throw new BadRequestException('Homework is not a SPEAKING type');
  if (!hw.speakingText) throw new BadRequestException('Homework has no speaking text');

  let transcribedText = '';
  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
      transcribedText = result.text;
      this.logger.log(`[try-speak hw=${hwId}] WhisperX: "${transcribedText}"`);
    } catch (err) {
      this.logger.warn(`[try-speak hw=${hwId}] WhisperX error: ${(err as Error).message}`);
    }
  }

  const { score, matchedWords, totalWords } = hw.speakingMode === 'FREE_SPEAK'
    ? calcFreeSpeak(transcribedText, hw.speakingText)
    : calcSpeakingScore(transcribedText, hw.speakingText);
  this.logger.log(`[try-speak hw=${hwId}] score=${score} matched=${matchedWords}/${totalWords}`);

  // No DB write — preview only (D-15)
  return {
    score,
    matchedWords,
    totalWords,
    transcribedText,
    speakingMode: hw.speakingMode,
    speakingPictureUrl: hw.speakingPictureUrl,
  };
}
```

**Error handling pattern** (matches `saveSpeakingResult` lines 44-52 — try/catch around BFA, warn and continue):
```typescript
try {
  const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
  transcribedText = result.text;
} catch (err) {
  this.logger.warn(`[try-speak hw=${hwId}] WhisperX error: ${(err as Error).message}`);
}
```

**Module note:** `GameModule` (game.module.ts line 9) imports `PrismaModule` already — `PrismaService` is available for injection. No module changes needed if using `PrismaService` directly.

---

### `backend/src/homework/image.controller.ts` — D-18: commit as-is

**Status:** File already complete at lines 1-22. No code changes needed — only git staging.

**File content for reference** (lines 1-22):
```typescript
import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';

@Controller('homework/image')
export class ImageController {
  constructor(private readonly storage: StorageService) {}

  @Get(':key(*)')
  async serveImage(@Param('key') key: string, @Res() res: Response) {
    try {
      const meta = await this.storage.getObjectMeta(key);
      const contentType = (meta.metaData?.['content-type'] as string | undefined) ?? 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      const stream = await this.storage.getObject(key);
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Image not found');
    }
  }
}
```

**Module registration:** Already registered in `HomeworkModule` (homework.module.ts line 13):
```typescript
controllers: [HomeworkController, ImageController],
```

---

### `bfa-service/main.py` — D-20 / D-21 / D-23: three targeted patches

**Analog:** itself

#### D-20: Remove `whisperx.align()` from `/transcribe` (lines 342-386)

**Current broken block** (lines 367-384) — delete entirely:
```python
model_a, metadata = get_whisperx_align_model()
result = whisperx.align(result["segments"], model_a, metadata, audio_data, _WHISPERX_DEVICE)

words = []
for segment in result.get("segments", []):
    for w in segment.get("words", []):
        word_text = str(w.get("word", "")).strip()
        if not word_text:
            continue
        words.append({
            "word": word_text,
            "start": round(float(w.get("start", 0.0)), 3),
            "end": round(float(w.get("end", 0.0)), 3),
            "score": round(float(w.get("score", 0.0)), 3),
        })

text = " ".join(s.get("text", "").strip() for s in result.get("segments", []))
return {"text": text.strip(), "words": words}
```

**Replacement** — two lines in place of the deleted block:
```python
text = " ".join(s.get("text", "").strip() for s in result.get("segments", []))
return {"text": text.strip()}
```

**Also delete** the now-dead globals and function (lines 207-230):
- Line 207: `_whisperx_align_model = None`
- Line 208: `_whisperx_metadata = None`
- Lines 224-230: `def get_whisperx_align_model(): ...`

**Pattern reference:** `/align` endpoint (lines 239-339) shows the correct temp-dir + ffmpeg + early-return pattern to keep for `/transcribe`.

#### D-21: Add 5-minute / 100MB cap at the top of `/transcribe` handler

**Insertion point:** After `async def transcribe(audio: UploadFile = File(...)):` (line 343), before `work_dir = ...` (line 344).

**Pattern — matches FastAPI UploadFile read pattern** (modeled on line 349 `await audio.read()`):
```python
MAX_TRANSCRIBE_SIZE = 100 * 1024 * 1024  # 100 MB

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Size cap — read into memory first, reject early
    content = await audio.read()
    if len(content) > MAX_TRANSCRIBE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")

    work_dir = Path(tempfile.mkdtemp(prefix="whisperx_"))
    try:
        suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
        raw_path = work_dir / f"input{suffix}"
        raw_path.write_bytes(content)   # use content bytes, not audio.read() again

        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1",
             "-t", "300",   # 5-minute cap enforced at decode time (D-21)
             "-y", str(wav_path)],
            capture_output=True, timeout=30,
        )
        ...
```

**Note:** `-t 300` in the ffmpeg command (already used for conversion) enforces the 5-minute cap without a separate ffprobe call. This matches the existing ffmpeg call pattern at line 352-356.

#### D-23: Fix `espeak_phonemes()` blocking call in async `/align` handler

**Current synchronous call** (line 256):
```python
expected = espeak_phonemes(word)
```

**Required change — add async wrapper function** (insert after `espeak_phonemes()` definition at line 133):
```python
async def espeak_phonemes_async(word: str) -> List[str]:
    """Wrap blocking subprocess in asyncio.to_thread for async safety."""
    return await asyncio.to_thread(espeak_phonemes, word)
```

**Import addition** at top of file (after existing imports):
```python
import asyncio
```

**Replace the call** at line 256 (inside `/align` which is already `async def`):
```python
# Before:
expected = espeak_phonemes(word)
# After:
expected = await espeak_phonemes_async(word)
```

**Pattern reference:** FastAPI `async def align(...)` at line 239 — the handler is already async, so `await` is valid there.

---

### `frontend/app/teacher/homework/[id]/try/page.tsx` — D-13/D-14/D-15: full rewrite to file-upload + BFA

**Analog:** `frontend/app/game/session/[id]/page.tsx` — `pageState === 'upload'` block (lines 372-438) and `handleSpeakingUpload` (lines 342-361)

**Imports pattern** — replace the current import block (lines 1-6) with:
```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getHomework } from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
```

**State pattern** — replace camera/speech state with file-upload state (modeled on session page lines 84-91):
```typescript
type PageState = 'loading' | 'ready' | 'uploading' | 'results' | 'error';

// Retain hw state for speaking mode + picture + text
const [hw, setHw] = useState<HomeworkItem | null>(null);
const [uploadFile, setUploadFile] = useState<File | null>(null);
const [tryResult, setTryResult] = useState<{
  score: number; matchedWords: number; totalWords: number;
  transcribedText: string; speakingMode: string | null;
  speakingPictureUrl: string | null;
} | null>(null);
```

**New `trySpeakingHomework` API call** (to add to `frontend/lib/admin-api.ts`):
```typescript
export async function trySpeakingHomework(hwId: number, audio: File): Promise<{
  score: number; matchedWords: number; totalWords: number;
  transcribedText: string; speakingMode: string | null;
  speakingPictureUrl: string | null;
}> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('audio', audio, audio.name);
  const res = await fetch(`${API_URL}/game/homework/${hwId}/try-speak`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}
```

**Upload handler pattern** (modeled on `handleSpeakingUpload` at session page lines 342-361):
```typescript
async function handleTrySpeak() {
  if (!uploadFile) return;
  setPageState('uploading');
  try {
    const r = await trySpeakingHomework(hwId, uploadFile);
    setTryResult(r);
    setPageState('results');
  } catch (err) {
    console.error('[try-speak] failed:', err);
    setPageState('error');
  }
}
```

**Upload UI pattern** (copy from session page lines 409-432 — `<input type="file" accept="video/*,audio/*">`):
```tsx
<label className="flex flex-col items-center gap-3 w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/30 py-8 px-4 hover:border-white/60 transition-colors"
  style={{ background: 'rgba(255,255,255,0.06)' }}>
  <span className="text-3xl">{uploadFile ? '✅' : '📁'}</span>
  {uploadFile ? (
    <div className="text-center">
      <p className="text-white font-semibold text-sm">{uploadFile.name}</p>
      <p className="text-white/50 text-xs mt-0.5">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
    </div>
  ) : (
    <p className="text-white/70 text-sm font-medium text-center">Tap to select your recording</p>
  )}
  <input type="file" accept="video/*,audio/*" className="hidden"
    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
</label>
```

**"Preview Mode — Results not saved" banner pattern** (keep from current try page lines 251-253):
```tsx
<div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-semibold mb-6 tracking-wide uppercase">
  Preview Mode — Results not saved
</div>
```

**Results pattern** (modeled on current try page results block lines 244-294, adapted for BFA response):
```tsx
// In results state: show banner, score, transcript, matchedWords/totalWords for FREE_SPEAK
if (pageState === 'results' && tryResult) {
  const isFreespeak = tryResult.speakingMode === 'FREE_SPEAK';
  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg }}>
          <div className="max-w-xl mx-auto">
            {/* Preview banner */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-semibold mb-6 tracking-wide uppercase">
              Preview Mode — Results not saved
            </div>
            {/* Score */}
            <div className="text-center mb-8">
              <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(tryResult.score) }}>
                {tryResult.score}%
              </div>
              {isFreespeak && (
                <p className="text-white/60 text-sm mt-2">
                  Keywords matched: {tryResult.matchedWords}/{tryResult.totalWords}
                </p>
              )}
            </div>
            {/* Transcript */}
            {tryResult.transcribedText && (
              <div className="bg-white/10 rounded-2xl px-5 py-4 mb-6">
                <p className="text-white/60 text-xs uppercase font-semibold mb-1">Transcript</p>
                <p className="text-white italic">"{tryResult.transcribedText}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGate>
  );
}
```

**Auth pattern** (matches current try page throughout — `<AuthGate requiredRole="TEACHER">`):
```tsx
<AuthGate requiredRole="TEACHER">
  {() => ( ... )}
</AuthGate>
```

---

### `frontend/app/game/session/[id]/page.tsx` — D-16: FREE_SPEAK result screen update

**Analog:** itself — patch the speaking branch in the `pageState === 'results'` block (lines 553-568)

**Current speaking branch** (lines 553-568) — replace the generic speaking result card:
```tsx
// CURRENT (lines 553-568) — no image, no keyword count
} : (
  <div>
    <div className="text-white/60 text-xs font-semibold uppercase mb-2">🎤 Speaking</div>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-white font-medium text-sm mb-1">{item.text}</div>
        <div className="text-white/70 text-sm">
          You said: <span className="text-white italic">"{item.transcribed || '—'}"</span>
        </div>
      </div>
      <div className="text-2xl font-black tabular-nums shrink-0" style={{ color: scoreHexColor(item.score) }}>
        {item.score}%
      </div>
    </div>
  </div>
)}
```

**Required replacement** (D-16 — show image prominently for FREE_SPEAK, add "Keywords matched: N/N"):
```tsx
} : (
  <div>
    <div className="text-white/60 text-xs font-semibold uppercase mb-2">🎤 Speaking</div>
    {/* FREE_SPEAK: show picture prominently */}
    {speakHw?.speakingMode === 'FREE_SPEAK' && item.pictureUrl && (
      <div className="rounded-xl overflow-hidden border border-white/20 mb-3 max-h-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.pictureUrl} alt="Speaking prompt" className="w-full object-contain" />
      </div>
    )}
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        {/* FREE_SPEAK: do NOT show raw keyword list (D-16) */}
        {speakHw?.speakingMode !== 'FREE_SPEAK' && (
          <div className="text-white font-medium text-sm mb-1">{item.text}</div>
        )}
        <div className="text-white/70 text-sm">
          You said: <span className="text-white italic">"{item.transcribed || '—'}"</span>
        </div>
        {/* FREE_SPEAK: show keyword match count from SpeakingResult */}
        {speakHw?.speakingMode === 'FREE_SPEAK' && results?.speakingResults?.[0] && (
          <div className="text-white/60 text-xs mt-1">
            Keywords matched: {results.speakingResults[0].matchedWords}/{results.speakingResults[0].totalWords}
          </div>
        )}
      </div>
      <div className="text-2xl font-black tabular-nums shrink-0" style={{ color: scoreHexColor(item.score) }}>
        {item.score}%
      </div>
    </div>
  </div>
)}
```

**State availability note:** `speakHw` is set in `useEffect` on load (line 85-89) and is not cleared at results time. `results` is set by `setResults(session)` in `handleSpeakingUpload` (line 346). `results.speakingResults` comes from `GameSession.speakingResults` (already typed in `admin-api.ts` lines 341-352). `item.pictureUrl` is already populated by `handleSpeakingUpload` (line 351: `pictureUrl: speakHw?.speakingPictureUrl ?? undefined`).

---

## Shared Patterns

### Auth Guard (NestJS)
**Source:** `backend/src/game/game.controller.ts` line 11
**Apply to:** New `trySpeakingHomework` endpoint (inherits class-level `@UseGuards(AuthGuard)` — no per-method decorator needed)
```typescript
@UseGuards(AuthGuard)
@Controller('game')
export class GameController { ... }
```

### File Upload Interceptor (NestJS)
**Source:** `backend/src/game/game.controller.ts` lines 43-50
**Apply to:** New `POST /game/homework/:id/try-speak` endpoint
```typescript
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
```

### AuthGate (Frontend)
**Source:** `frontend/app/teacher/homework/[id]/try/page.tsx` lines 200-209
**Apply to:** All render branches in rewritten try page
```tsx
<AuthGate requiredRole="TEACHER">
  {() => ( ... )}
</AuthGate>
```

### BFA Service Error Handling
**Source:** `backend/src/game/game.service.ts` lines 44-52
**Apply to:** `trySpeakingHomework` service method — same try/catch + warn pattern
```typescript
try {
  const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
  transcribedText = result.text;
} catch (err) {
  this.logger.warn(`... WhisperX error: ${(err as Error).message}`);
}
```

### FastAPI Temp-Dir Cleanup
**Source:** `bfa-service/main.py` lines 338-339 and 386 (both endpoints)
**Apply to:** `/transcribe` after D-20/D-21 rewrite — keep `try/finally shutil.rmtree`
```python
finally:
    shutil.rmtree(work_dir, ignore_errors=True)
```

### FormData multipart POST (Frontend API)
**Source:** `frontend/lib/admin-api.ts` lines 136-153 (`saveSpeakingResult`)
**Apply to:** New `trySpeakingHomework` function in `admin-api.ts`
```typescript
const form = new FormData();
form.append('audio', audio, audio.name);
const res = await fetch(`${API_URL}/game/homework/${hwId}/try-speak`, {
  method: 'POST',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: form,
});
```

---

## No Analog Found

All files have close analogs in the codebase. No new libraries or patterns required — see RESEARCH.md "No New Installations Required".

---

## Commit-Only Files (no logic changes)

These files are already correct — they only need git staging:

| File | Status | Note |
|---|---|---|
| `backend/src/homework/image.controller.ts` | New, untracked | Logic confirmed complete at lines 1-22 |
| `bfa-service/Dockerfile` | Modified, untracked | Commit as-is |
| `frontend/app/teacher/homework/[id]/page.tsx` | Modified, untracked | D-12 redesign confirmed done |
| `backend/src/game/game.dto.ts` | Modified, untracked | Commit as-is |
| `backend/src/game/game.repository.ts` | Modified, untracked | Commit as-is |
| `backend/src/game/game.service.spec.ts` | Modified, untracked | Commit after adding test cases for `calcFreeSpeak` and `trySpeakingHomework` |

## Deletion-Only Files (D-24)

```
backend/prisma/migrations/20260507000003_add_speaking_part/
backend/prisma/migrations/20260507000004_add_image_part/
backend/prisma/migrations/20260507000005_add_phonics_results/
backend/prisma/migrations/20260508000001_redesign_homework/
backend/prisma/migrations/20260509000001_homework_parts_words/
```
Run `npx prisma migrate status` first to confirm none are applied to dev DB before deleting.

---

## Metadata

**Analog search scope:** `backend/src/`, `bfa-service/`, `frontend/app/`, `frontend/lib/`
**Files scanned:** 11
**Pattern extraction date:** 2026-05-14
