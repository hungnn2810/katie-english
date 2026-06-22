---
phase: 17
slug: import-classes-tuition-books-students-homework
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x + ts-jest |
| **Config file** | `backend/package.json` (`jest` key) |
| **Quick run command** | `cd backend && npx jest --testPathPattern import --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern import --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | — | — | Module/DTO scaffolding only | integration | `cd backend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | IMPORT-01 to IMPORT-05 | — | collect-all errors, no partial import | unit | `cd backend && npx jest import.service --no-coverage` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | IMPORT-06, IMPORT-07 | — | non-.xlsx rejected 400; template buffer returned | unit | `cd backend && npx jest import.controller --no-coverage` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | — | — | API helper types/fetch correctness | unit | `cd frontend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | IMPORT-08, IMPORT-09 | — | pages render, nav wires | manual + tsc | `cd frontend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/import/import.service.spec.ts` — stubs for IMPORT-01 through IMPORT-05
- [ ] `backend/src/import/import.controller.spec.ts` — stubs for IMPORT-06, IMPORT-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin /admin/import page renders, nav item visible | IMPORT-08 | No component tests planned for frontend pages | Navigate to /admin/import; verify page title and upload UI |
| Teacher /teacher/import page renders, nav item visible | IMPORT-09 | No component tests planned for frontend pages | Navigate to /teacher/import; verify page title and upload UI |
| Template download returns valid .xlsx | IMPORT-06 | File content best verified in Excel | Click Download Template, open in Excel, confirm 3 sheets with example rows |
| Successful import creates DB records | IMPORT-01 to IMPORT-05 | E2E DB verification | Upload valid filled template; verify classes, students, homework appear in respective list pages |
| Duplicate class/student returns error list | IMPORT-02, IMPORT-03 | UI error table display | Upload file with a duplicate class name; verify error table shows the row number and message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
