---
phase: 11
slug: frontend-react-mui-refactor
status: active
created: 2026-06-05
design_system_root: "Katie English Design System/"
---

# Phase 11 — UI Design Contract

> Source of truth: `Katie English Design System/` at project root.
> This file summarizes the design tokens for executor reference.

---

## Design System

| Property | Value |
|----------|-------|
| Component library | MUI v9 (@mui/material) |
| Icon library | lucide-react (2px stroke, outline) |
| Font | Inter (Google Fonts) |
| CSS framework | MUI sx + Emotion (no Tailwind) |

---

## Color Tokens

Defined in `Katie English Design System/colors_and_type.css` as CSS vars.
MUI theme counterparts in `frontend/lib/theme.ts`.

### Brand Palette
| Token | Hex | Role |
|-------|-----|------|
| `--primary` | `#4F9DFF` | Admin accent / base primary |
| `--secondary` | `#6ED6C1` | Mint — secondary actions |
| `--accent` | `#FFD166` | Yellow — medium score / warning |
| `--highlight` | `#FF7B7B` | Coral — error / low score |
| `--purple` | `#A78BFA` | Student primary accent |
| `--pink` | `#FF9BD2` | |
| `--green` | `#7BD88F` | High score / success |
| `--teacher-accent` | `#F0623A` | Teacher portal accent |

### Surfaces
| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#F7F9FC` | Light portal background |
| `--card` | `#FFFFFF` | Card background |
| `--border` | `#E2E8F0` | Dividers, card borders |
| `--sidebar` | `#0C1220` | Sidebar / auth left panel |
| `--game-bg` | `#2D0B2E` | Student game stage |
| `--game-bg-alt` | `#1F0821` | Game stage alt |

### Text
| Token | Hex | Role |
|-------|-----|------|
| `--fg1` | `#0F172A` | Primary text |
| `--fg2` | `#64748B` | Secondary text |
| `--fg3` | `#94A3B8` | Muted / tertiary |
| `--fg-on-dark` | `#FFFFFF` | Text on dark surfaces |

### Score Colors
| Score | Color |
|-------|-------|
| ≥ 80% | `#7BD88F` (green) |
| 50–79% | `#FFD166` (yellow) |
| < 50% | `#FF7B7B` (coral) |

### Kid Card Gradients (6-cycle)
```
1: linear-gradient(135deg, #F97316, #FBBF24)  — orange → yellow
2: linear-gradient(135deg, #EC4899, #F472B6)  — pink → light pink
3: linear-gradient(135deg, #8B5CF6, #A78BFA)  — violet → lavender
4: linear-gradient(135deg, #10B981, #34D399)  — emerald → mint
5: linear-gradient(135deg, #EF4444, #F87171)  — red → coral
6: linear-gradient(135deg, #06B6D4, #67E8F9)  — cyan → sky
```

---

## Typography

Inter font. Buttons: weight 600, no text-transform.
Headings: weight 900, tight negative tracking (−0.02 to −0.03em).

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 48px | 900 | Kid greeting hero |
| Page title | 26px | 900 | Teacher/Admin page header |
| h1 | 30px | 900 | Section headings |
| h2 | 20px | 700 | Sub-headings |
| h3 | 16px | 700 | Card headings |
| Section label | 11px | 700 | Sidebar group labels (uppercase, 0.1em tracking) |
| Body | 14px | 400 | Content |
| Caption | 12px | 400 | Meta, timestamps |
| Stat number | 30px | 900 | Stat cards |
| Score | 72px | 700 | Results screen |
| Button | 15px | 600 | All buttons |

---

## Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 4px | Base MUI unit |
| `--radius-sm` | 8px | Inputs, search fields |
| `--radius-md` | 12px | Nav items, chips, buttons, icon wells |
| `--radius-lg` | 16px | Cards (white), Paper |
| `--radius-xl` | 24px | Kid gradient cards |
| `--radius-pill` | 999px | Badges, status chips |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-1` | `0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)` | Default card |
| `--shadow-3` | `0 4px 12px rgba(15,23,42,0.10)` | Hover card |
| `--shadow-4` | `0 6px 16px rgba(15,23,42,0.12)` | Elevated |
| `--shadow-8` | `0 12px 28px rgba(15,23,42,0.18)` | Kid floating cards |

---

## Spacing (MUI 8px base)

| Token | Value |
|-------|-------|
| 1 | 8px |
| 2 | 16px |
| 3 | 24px |
| 4 | 32px |
| 5 | 40px |

---

## Portal Layouts

### Student Game (mobile-first)
- Full-screen `#2D0B2E` background
- No sidebar
- Concentric-circle arc decoration (white, ~7% opacity) behind content
- Centered, max-width ~430px on desktop
- Large touch targets (min 44px)
- Bottom-safe-area padding on mobile

### Teacher / Admin (desktop SPA)
- Fixed 240px dark sidebar (`#0C1220`)
- Sidebar: logo block → nav groups → footer copyright
- Nav item active state: 3px accent left-rail + accent-tint background
- Main area: `#F7F9FC` background
- Page header: 32px padding, breadcrumb (12px/fg2) + title (26px/900) + avatar menu
- Content area: `0 32px 32px` padding

---

## Component Patterns

### Staff Card
```
background: #fff
border: 1px solid #E2E8F0
borderRadius: 16px
shadow: --shadow-1
hover: translateY(-2px) + --shadow-3
padding: 22px (stat cards), varies (table cards overflow:hidden)
```

### Kid Homework Card
```
background: gradient (6-cycle)
borderRadius: 24px
padding: 20px
shadow: --shadow-8
hover: scale(1.03)
transition: 0.15s
```

### Status Chips
```
borderRadius: 999px (pill)
fontWeight: 700
fontSize: 12px
padding: 4px 10px
```

Homework type colors:
| Type | Chip bg | Chip text | Icon |
|------|---------|-----------|------|
| PHONICS | `#FFF7ED` | `#F97316` | hash |
| SPEAKING | `#FDF2F8` | `#EC4899` | mic |
| VOCABULARY | `#F5F3FF` | `#8B5CF6` | image |
| LISTEN | `#ECFEFF` | `#06B6D4` | headphones |
| READING | `#F0FDF4` | `#16A34A` | book-open |

### Stat Card Icon Well
| Portal | Well bg | Icon color |
|--------|---------|------------|
| Teacher Classes | `#FFF2EF` | `#F0623A` |
| Teacher Students | `#F0FDFB` | `#6ED6C1` |
| Teacher Homework | `#F5F3FF` | `#A78BFA` |
| Admin Teachers | `#EFF6FF` | `#4F9DFF` |
| Admin Classes | `#F0FDFB` | `#6ED6C1` |
| Admin Students | `#F5F3FF` | `#A78BFA` |
| Admin Homework | `#FFF7ED` | `#F97316` |

### Table Shell
```
Card overflow:hidden
Header row: bg #F8FAFC, padding 12px 22px
Header text: 11px, 700, uppercase, letterSpacing 0.06em, color #94A3B8
Data row: padding 14px 22px, border-bottom 1px #E2E8F0 (except last)
Data text: 14px
```

### Record Button States
- idle: 104px circle, white border 0.3 opacity, mic icon
- recording: 104px, red border `#ef4444`, ping animation ring, stop square inside
- scoring: 104px, spinner (white, 4px border)
- done: 104px, green border `#34d399`, check icon

---

## Copywriting

Student-facing: Vietnamese ("Bắt đầu →", "Nộp bài!", "Thử lại →")
Teacher/Admin: English, sentence-case
Empty states:
- Student: "Hôm nay chưa có bài tập!" / "Quay lại sau khi cô giao bài nhé."
- Teacher sessions: "No sessions yet" (icon: video)

---

## Design Kit Reference Files

For all implementation decisions, read the actual JSX first:
- Student screens: `Katie English Design System/ui_kits/student/screens.jsx`
- Teacher screens: `Katie English Design System/ui_kits/teacher/screens.jsx`
- Admin screens: `Katie English Design System/ui_kits/admin/screens.jsx`
- Component patterns: `*/ui.jsx` files in each kit folder
