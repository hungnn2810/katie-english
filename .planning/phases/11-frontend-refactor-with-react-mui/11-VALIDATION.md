---
phase: 11
slug: frontend-refactor-with-react-mui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — `npm run build` is the primary automated gate (no frontend test framework in project) |
| **Config file** | `frontend/package.json` (build script) |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build`
- **Before `/gsd:verify-work`:** Full build must pass clean
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | FE-01 | — | MUI packages from npm registry only | build | `cd frontend && npm install && npm run build` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | FE-01, FE-02 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | FE-01, FE-02 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | FE-03 | — | Auth logic in layout.tsx untouched | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | FE-03 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-02-03 | 02 | 2 | FE-03 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 2 | FE-04 | — | minWidth: 1024 preserved on game pages | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-03-02 | 03 | 2 | FE-04 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-03-03 | 03 | 2 | FE-04 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-04-01 | 04 | 2 | FE-05 | — | Auth logic in admin layout untouched | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-04-02 | 04 | 2 | FE-05 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 11-04-03 | 04 | 2 | FE-05 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — `npm run build` is the designated gate per project conventions and RESEARCH.md Validation Architecture.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Teacher flows (homework creation, assignment, dashboard) visually match pre-migration | FE-03 | No E2E test suite exists | Smoke test: login as teacher → create homework → assign → view dashboard table |
| Student game screens preserve color states and minWidth:1024 | FE-04 | Visual correctness | Load `/game/session/*` → verify PhonemeChips show 4 color states; resize to 1024px min |
| Admin forms show validation/error states | FE-05 | Visual correctness | Submit admin form with invalid input → verify MUI error helperText appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (`npm run build` after each task)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no MISSING references — build gate covers all tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
