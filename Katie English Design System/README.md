# Katie English — Design System

**Katie English** is a web platform where Vietnamese primary-school teachers assign
English **phonics homework** to young students (ages 6–12). Students complete homework
as interactive, game-like sessions; teachers create the homework and review AI-scored
results; school admins manage teachers, students and classes.

The product is built as **three distinct portals**, each with its own audience, device
target, and visual register:

| Portal | Audience | Device | Accent | Feel |
|---|---|---|---|---|
| **Student Game** | Kids 6–12 | Mobile-first | Purple `#A78BFA` on wine `#2D0B2E` | Fun, energetic, big touch targets, Quizizz-like |
| **Teacher** | Busy teachers | Desktop | Orange-red `#F0623A` | Professional, efficient, dense sidebar app |
| **Admin** | School admins | Desktop | Blue `#4F9DFF` | Functional, data-dense |

Five homework types run through the student game: **Phonics** (pronounce words, mic +
AI score), **Speaking** (free speech or read-aloud, AI score), **Reading** (passage +
comprehension), **Vocabulary by Image** (pick the word for a picture), and
**Listen & Answer** (audio clip + questions).

---

## Sources

This design system was reverse-engineered from the product's frontend codebase. The
reader is encouraged to explore it further to build higher-fidelity work:

- **GitHub:** https://github.com/hungnn2810/katie-english
  - Frontend: Next.js 14 (App Router) + **MUI v9** (Material UI) + Emotion, **lucide-react** icons. (The repo README mentions Tailwind, but it was migrated to a MUI theme — see `frontend/lib/theme.ts`.)
  - Design tokens lifted from `frontend/lib/colors.ts`, `frontend/lib/theme.ts`, `frontend/lib/student-theme.ts`.
  - Shells: `frontend/components/{TeacherShell,AdminShell}.tsx`. Screens: `frontend/app/{game,teacher,admin,login}/…`.
  - A copy of the relevant source files is preserved under `frontend/` in this project for reference.

> **Localization note.** The brief specifies the **student** portal copy should be in
> **Vietnamese** ("Bắt đầu →", "Nộp bài!", "Thử lại →"). The live codebase is mostly
> English with Vietnamese already appearing in student-facing feedback (e.g.
> *"Bấm lâu hơn nhé — ghi âm quá ngắn"*, *"Có lỗi — thử lại nhé"*). The Student UI kit
> here uses **Vietnamese** per the brief; Teacher/Admin kits use **English** as in the
> codebase. Flag if you'd prefer a single language across the board.

---

## CONTENT FUNDAMENTALS

Copy splits sharply by audience — the same product speaks two different voices.

**Student (kid) voice — warm, playful, second person, Vietnamese.**
- Direct address and encouragement: *"Hi, Mai!"*, *"Ready to learn something awesome today?"*, *"Let's Go!"*, *"Try Again"*, *"Next →"*.
- Vietnamese equivalents per brief: *"Bắt đầu →"*, *"Nộp bài!"*, *"Thử lại →"*, *"Hôm nay chưa có bài tập!"*.
- Always rewarding, never punishing. Errors are gentle nudges, not failures: *"Bấm lâu hơn nhé"* (hold a bit longer), *"Nói to hơn nhé"* (speak up). The empty state is a celebration: *"All done! No homework right now!"*
- Exclamation marks, big numbers, emoji-free (icons do the emotional lifting). Title Case on buttons.

**Teacher / Admin voice — concise, professional, task-oriented, English.**
- Noun-phrase labels and clear verbs: *"Total Classes"*, *"Assign Homework"*, *"Manage Students"*, *"View Sessions"*, *"Create and schedule classes"*.
- Sentence-case helper text, no exclamation. Breadcrumbs read *"Teacher Portal › Homework"*.
- Status is plain and factual: *"3 pending registration approvals"*, *"No upcoming classes"*, *"in 2h"*, *"tomorrow"*.

**Across both:** no jargon, no emoji as UI. Numbers are concrete ("Best: 92%", "148").
Tone is encouraging on the student side and quietly efficient on the staff side.

---

## VISUAL FOUNDATIONS

**Two visual worlds, one brand.** The staff portals (Teacher, Admin) are a clean,
light **productivity app**: white cards on a `#F7F9FC` canvas, a fixed dark navy
sidebar, restrained accent color, tight type. The student portal is a **game**: a dark
wine-purple stage, full-gradient floating tiles, oversized Black-weight type, and
bouncy hover/press. They share the Inter typeface, the color palette, the Lucide icon
set, and the "K" monogram — that's what keeps them one product.

- **Color.** Playful but controlled. One accent per portal (teacher orange-red, admin blue, student purple) over a shared dark surface (`#0C1220` sidebar, `#2D0B2E` game stage). A bright 8-hue palette (blue, mint, yellow, coral, purple, pink, orange, green) is used sparingly as category color — never more than one or two accents in a single staff view. Kids get *more* color: every homework tile picks from a 6-gradient cycle.
- **Type.** Inter throughout. Headings are heavy — **900 (Black)** with tight negative tracking (−0.02 to −0.03em). Body is 14px/1.5–1.6 in slate. Scores render huge (up to 72px) with `tabular-nums`. Buttons are 600, **no text-transform** (sentence/Title case as written).
- **Backgrounds.** Flat fills, not photography. Staff: near-white `#F7F9FC`. Student stage: solid wine `#2D0B2E` with faint **concentric-circle line arcs** (white stroke, ~7% opacity) bleeding off both edges — the only decorative motif, Quizizz-inspired. Gradients appear on buttons and kid cards (135°), never as page backgrounds in the staff portals.
- **Cards.** Staff cards are white, `1px #E2E8F0` border, **16px** radius, generous 22–24px padding, soft shadow; they **lift** on hover (`translateY(-2px)` + deeper shadow). Kid cards are full-bleed gradient, **24px** radius, heavy float shadow, and **scale 1.05** on hover.
- **Radii.** MUI base unit is **4px**; the student theme bumps it to **6px**. In practice: inputs ~8px, nav items / chips / buttons 12px, cards 16px, kid tiles 24px, badges fully pill (999px).
- **Shadows.** Soft, slate-tinted, never harsh black. A small scale (1 / 3 / 4 / 8); elevation increases on hover. Kid tiles sit at the top of the scale.
- **Borders & dividers.** Hairline `#E2E8F0`. Selected nav items get a 3px accent **left-rail** bar + a 12% accent-tint background.
- **Transparency & blur.** No glassmorphism. On dark surfaces, layered **white alpha** does the work: `rgba(255,255,255,0.1)` panels, `0.25` chips/buttons, `0.2` icon wells. No backdrop blur.
- **Animation.** Functional, quick (0.15s transitions). Defined keyframes: `shake` (wrong answer, 0.4s), `fadeIn`, `slideUp`, and a `ping` ring on the active record button. Hover = lift/scale; press = the phoneme tile **scales to 0.95**. No infinite decorative motion.
- **Hover / press states.** Buttons darken via **opacity 0.9** on hover (the accent color stays, opacity drops) rather than a separate hover color. Nav hovers lighten text + add a faint white wash. Press shrinks (scale 0.95).
- **Imagery vibe.** Imagery is user-supplied (vocab/speaking prompt photos), shown in rounded thumbnails with a subtle border; no global treatment, grain, or duotone.
- **Layout rules.** Staff portals are a **fixed 240px dark sidebar** + scrollable main with a 32px-gutter page header (breadcrumb + 26px Black title + right-aligned avatar menu). Minimum desktop width 1280px for staff. Student is centered, single-column, mobile-first, with a light top bar.

---

## ICONOGRAPHY

- **One system: [Lucide](https://lucide.dev) (`lucide-react`).** Outline icons, **2px stroke**, rounded joins. This is the only icon set in the product. No custom SVG icon library, no icon font, no PNG sprites.
- **Sizing.** 14–16px inline (nav, chips, menu items), 20–24px in stat-card wells, headers, and kid card badges; 28–48px for hero/empty-state glyphs.
- **Color.** Icons inherit text color, or take the portal accent inside tinted wells (`#FFF2EF` orange, `#F0FDFB` mint, `#F5F3FF` violet for teacher stats). On the wine stage they're white.
- **Common glyphs.** `layout-dashboard, school, users, graduation-cap, book-open, video, file-text` (staff nav); `hash` (Phonics), `mic` (Speaking), `image` (Vocabulary), `headphones` (Listen), `book-open` (Reading) — the homework-type system; `trophy, star, play, refresh-cw, party-popper, check-circle-2, zap, calendar, alert-triangle` (student status & feedback); `key-round, log-out, x, chevron-right, arrow-right` (utility).
- **Emoji / unicode.** No emoji used as UI. The single literal glyph is **▶** on the small phoneme audio-play button. There are **no logo or illustration image files** in the repo — the brand mark is a CSS **"K" monogram** in a rounded accent square, recolored per portal.
- **Usage here:** the preview cards and UI kits load Lucide from CDN (`https://unpkg.com/lucide@latest`). For production, use `lucide-react` to match the codebase exactly.

---

## Index — what's in this design system

| File / folder | What it is |
|---|---|
| `README.md` | This file — product context, content & visual foundations, iconography, manifest |
| `colors_and_type.css` | CSS variables for the full color, gradient, type, radii, shadow & spacing system |
| `SKILL.md` | Agent-Skill entry point (for use in Claude Code) |
| `preview/` | 20 Design-System cards (colors, type, spacing, components, brand) — shown in the Design System tab |
| `ui_kits/student/` | Student Game Portal kit — login, homework list, vocab & record session, results |
| `ui_kits/teacher/` | Teacher Portal kit — shell, dashboard, classes/students/homework, create-homework |
| `ui_kits/admin/` | Admin Portal kit — shell, dashboard, teachers/students/classes/homework management |
| `frontend/` | Imported reference source from the GitHub repo (read-only reference) |

No webfont files are bundled — **Inter** is loaded from Google Fonts. No logo/illustration
assets exist in the source (the mark is a CSS monogram), so none are bundled here.
