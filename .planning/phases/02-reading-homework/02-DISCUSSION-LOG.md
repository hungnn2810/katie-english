# Phase 2: Reading Homework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 02-reading-homework
**Areas discussed:** Data model for activities, Matching activity UX, Fill-in-blank design, Teacher creation flow

---

## Data Model for Activities

| Option | Description | Selected |
|--------|-------------|----------|
| New tables | ReadingActivity + MatchPair + FillBlank + FillBlankChoice | ✓ |
| Reuse existing tables | Shoe-horn into HomeworkPart/HomeworkWord | |

**User's choice:** New tables

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add READING to HomeworkType | Same Homework table, same assignment/session flow | ✓ |
| Separate model | New ReadingHomework table, duplicates infrastructure | |

**User's choice:** Add READING to HomeworkType enum

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single ReadingResult per session | totalItems, correctItems, score. Per-activity detail deferred to Phase 3 | ✓ |
| Per-activity results now | ReadingActivityResult per activity from the start | |

**User's choice:** Single ReadingResult per session

---

| Option | Description | Selected |
|--------|-------------|----------|
| New reading game page | frontend/app/game/reading/[id]/page.tsx | ✓ |
| Extend existing session page | Add READING items to 710-line existing page | |

**User's choice:** New reading game page

---

## Matching Activity UX

| Option | Description | Selected |
|--------|-------------|----------|
| All-at-once grid | Images top row, words bottom row. Click to pair. Correct=green lock, wrong=shake | ✓ |
| One image at a time | Single image center, word choices below, move to next | |

**User's choice:** All-at-once grid

---

| Option | Description | Selected |
|--------|-------------|----------|
| 2–6 pairs per activity | Enforced by teacher creation UI | ✓ |
| No hard limit | Teacher decides | |

**User's choice:** 2–6 pairs per activity

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-advance | Brief celebration then next activity automatically | ✓ |
| Explicit Next button | Student taps to advance | |

**User's choice:** Auto-advance after all pairs locked

---

| Option | Description | Selected |
|--------|-------------|----------|
| Randomized each session | Shuffle words on load | ✓ |
| Fixed order | Words in teacher-defined order | |

**User's choice:** Randomized each session

---

## Fill-in-blank Design

| Option | Description | Selected |
|--------|-------------|----------|
| One sentence, one blank | Multiple items per activity, one ___ per sentence | ✓ |
| Paragraph with multiple blanks | Single text block with multiple gaps | |

**User's choice:** One sentence with one blank per item

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 choices | One correct + two distractors | |
| 4 choices | One correct + three distractors | |
| Teacher decides per item | Teacher specifies exactly which words appear | ✓ |

**User's choice:** Teacher decides per item

---

| Option | Description | Selected |
|--------|-------------|----------|
| One sentence at a time | Immediate feedback, auto-advance | ✓ |
| All sentences visible, submit at end | Fill all then submit | |

**User's choice:** One sentence at a time

---

| Option | Description | Selected |
|--------|-------------|----------|
| Shake + keep trying | Multiple attempts, no score penalty | |
| Shake + mark wrong, advance | One shot — wrong = 0 for that item | ✓ |

**User's choice:** Shake + mark wrong, advance (one shot per blank)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single session score: correct/total | Combined across all activities | ✓ |
| Per-activity score averaged | Average of per-activity scores | |

**User's choice:** Single session score across all items

---

| Option | Description | Selected |
|--------|-------------|----------|
| Correct if eventually paired correctly | Final state counts, wrong attempts don't penalize | ✓ |
| First-attempt-only correct | Any wrong attempt = 0 for that pair | |

**User's choice:** Final state counts for matching

---

## Teacher Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated creation page | /teacher/homework/create/reading — full page editor | ✓ |
| Extend existing modal | Add reading to existing HomeworkModal | |

**User's choice:** Dedicated creation page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Up/Down arrow buttons | Simple ↑↓ per activity card | |
| Drag and drop | @dnd-kit/core drag-and-drop | ✓ |

**User's choice:** Drag-and-drop via @dnd-kit/core

---

| Option | Description | Selected |
|--------|-------------|----------|
| Upload per pair | One image upload per pair | |
| Upload all at once | Bulk multi-select upload | ✓ |

**User's choice:** Bulk image upload; filename pre-fills word label (editable)

---

| Option | Description | Selected |
|--------|-------------|----------|
| @dnd-kit/core | Lighter, actively maintained, ~15kb | ✓ |
| react-beautiful-dnd | More familiar but in maintenance mode | |

**User's choice:** @dnd-kit/core

---

| Option | Description | Selected |
|--------|-------------|----------|
| Filename becomes default word, teacher edits | Pre-fill from filename, editable | ✓ |
| Blank word field, teacher types each | No pre-fill | |

**User's choice:** Filename pre-fills word label

---

## Claude's Discretion

- Exact animation implementation for pair lock (green flash duration, shake keyframe)
- Celebration moment between activities (style and duration)
- Specific layout/card styling on creation page
- Whether to show activity index ("Activity 1 of 3") during student gameplay
- Error state if student loads a READING session with no activities

## Deferred Ideas

- Per-activity score breakdown on result screen (READ-07 → Phase 3)
- Teacher editing reading homework after creation (Phase 3 unified dashboard)
- Per-item correct/wrong DB storage (Phase 3 needs this)
- Retry for wrong fill-blank answers (v2 if teacher feedback demands it)
- Drag-and-drop for pair ordering within a matching activity
- Teacher "try" mode for reading homework preview (Phase 3 consideration)
