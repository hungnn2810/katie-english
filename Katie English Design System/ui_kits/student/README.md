# Student Game Portal — UI Kit

High-fidelity recreation of the **Katie English** student experience — the fun,
game-like, **mobile-first**, **Vietnamese** portal where kids (6–12) do homework.
Rebuilt from `frontend/app/game/*` and `frontend/lib/student-theme.ts`.

**Run:** open `index.html`. Everything is rendered inside a phone frame on the wine stage.

## What it covers (full click-through)
`Login → Homework list → [Phonics | Speaking | Vocabulary | Listen] session → Results → back`

- **Login** — class code + name, big squishy "Vào lớp →".
- **Homework list** — "Chào, Mai!" greeting, full-gradient floating cards cycling the 6-gradient set, status pills (Còn 4 ngày / Hạn hôm nay / Tốt nhất: 92%), plus an `empty` state ("Hôm nay chưa có bài tập!").
- **Vocabulary** — image + 4 tappable word choices with correct/wrong feedback.
- **Phonics / Speaking** — the full mic interaction: **ready → tap to record → recording (pulsing red ring) → scoring → done**.
- **Listen & Answer** — waveform audio player + multiple-choice question.
- **Results** — oversized score colored by band (≥80 green / 50–79 yellow / <50 coral) with an encouraging Vietnamese message and a per-item breakdown.

## Components (`ui.jsx`)
- `Phone` — device frame + wine stage + the concentric-arc motif + status bar.
- `KidButton` — big 900-weight button that **scales 0.96 on press**.
- `GameHeader`, `Progress`, `RecordButton` (4 states), `Icon` (Lucide).
- Exposes `S_GRAD`, `CARD_GRADS`, `scoreColor()`.

## Voice & scale
Vietnamese, warm and encouraging ("Sẵn sàng chưa?", "Đang chấm điểm…", "Xong!", "Nộp bài!").
Large touch targets (≥44px), 900-weight type, purple `#A78BFA` accent. Emotion is carried
by Lucide icons, not emoji. The codebase already mixes Vietnamese feedback into this
portal — this kit takes it fully Vietnamese per the design brief.
