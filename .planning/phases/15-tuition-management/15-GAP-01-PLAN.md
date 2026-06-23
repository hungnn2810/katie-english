---
phase: "15"
plan: GAP-01
type: execute
wave: 1
depends_on: []
gap_closure: true
files_modified:
  - frontend/app/admin/tuition/_components/TuitionConfigForm.tsx
  - frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx
  - frontend/app/admin/tuition/_components/TuitionReportTable.tsx
  - frontend/app/teacher/tuition/page.tsx
autonomous: true
requirements:
  - TUITION-01
  - TUITION-03
  - TUITION-04
  - TUITION-05
  - TUITION-06

must_haves:
  truths:
    - "TuitionConfigForm accepts optional getTuitionConfigFn and updateTuitionConfigFn props that default to admin-portal-api imports"
    - "GenerateRecordsModal accepts optional createTuitionRecordsFn prop that defaults to admin-portal-api import"
    - "TuitionReportTable accepts optional getTuitionReportFn prop that defaults to admin-portal-api import"
    - "Teacher tuition page passes teacher-tuition-api functions as props to all three shared components"
    - "Admin tuition page continues to work without modification (no props passed = admin defaults used)"
    - "Teacher role users can load tuition config, generate records, and view report using teacher JWT"
  artifacts:
    - path: "frontend/app/admin/tuition/_components/TuitionConfigForm.tsx"
      provides: "Dependency-injected config form; optional fn props with admin defaults"
      contains: "getTuitionConfigFn"
    - path: "frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx"
      provides: "Dependency-injected modal; optional fn prop with admin default"
      contains: "createTuitionRecordsFn"
    - path: "frontend/app/admin/tuition/_components/TuitionReportTable.tsx"
      provides: "Dependency-injected report table; optional fn prop with admin default"
      contains: "getTuitionReportFn"
    - path: "frontend/app/teacher/tuition/page.tsx"
      provides: "Teacher page passing teacher-tuition-api functions as props"
      contains: "getTuitionConfig"
  key_links:
    - from: "frontend/app/teacher/tuition/page.tsx"
      to: "frontend/lib/teacher-tuition-api.ts"
      via: "named import"
      pattern: "from.*teacher-tuition-api"
    - from: "frontend/app/teacher/tuition/page.tsx"
      to: "TuitionConfigForm"
      via: "getTuitionConfigFn prop"
      pattern: "getTuitionConfigFn=\\{getTuitionConfig\\}"
    - from: "frontend/app/teacher/tuition/page.tsx"
      to: "GenerateRecordsModal"
      via: "createTuitionRecordsFn prop"
      pattern: "createTuitionRecordsFn=\\{createTuitionRecords\\}"
    - from: "frontend/app/teacher/tuition/page.tsx"
      to: "TuitionReportTable"
      via: "getTuitionReportFn prop"
      pattern: "getTuitionReportFn=\\{getTuitionReport\\}"
---

<objective>
Close Gap 1 (Frontend): teacher portal tuition components call adminAuthHeaders() instead of teacher JWT auth.

Three shared components (TuitionConfigForm, GenerateRecordsModal, TuitionReportTable) import API functions hardcoded from admin-portal-api.ts, which injects adminAuthHeaders() (reads localStorage.admin_token — never set for teachers). The fix uses dependency injection via optional function props: each component accepts optional API function overrides defaulting to the admin-portal-api versions (preserving admin page behavior unchanged), and the teacher tuition page passes the identical-signature functions from teacher-tuition-api.ts (which injects authHeaders() / localStorage.token).

Purpose: Satisfy D-06 (LOCKED) — TEACHER role must access the tuition module. Backend already accepts TEACHER via TeacherOrAdminGuard. This plan completes the frontend side so teacher users can load config, generate records, and view reports with their own JWT.

Output: Modified TuitionConfigForm.tsx, GenerateRecordsModal.tsx, TuitionReportTable.tsx (optional fn props added), and modified teacher/tuition/page.tsx (passes teacher-tuition-api functions as props). Admin page unchanged.
</objective>

<execution_context>
@J:/sources/katie-english/.claude/get-shit-done/workflows/execute-plan.md
@J:/sources/katie-english/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@J:/sources/katie-english/.planning/phases/15-tuition-management/15-CONTEXT.md
@J:/sources/katie-english/frontend/lib/teacher-tuition-api.ts
@J:/sources/katie-english/frontend/app/admin/tuition/_components/TuitionConfigForm.tsx
@J:/sources/katie-english/frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx
@J:/sources/katie-english/frontend/app/admin/tuition/_components/TuitionReportTable.tsx
@J:/sources/katie-english/frontend/app/teacher/tuition/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add optional API function props to the three shared tuition components</name>
  <files>
    frontend/app/admin/tuition/_components/TuitionConfigForm.tsx,
    frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx,
    frontend/app/admin/tuition/_components/TuitionReportTable.tsx
  </files>
  <read_first>
    - frontend/app/admin/tuition/_components/TuitionConfigForm.tsx — full file; understand prop interface at line 16-24, getTuitionConfig call at line 39, updateTuitionConfig call at line 64
    - frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx — full file; understand prop interface at line 16-25, createTuitionRecords call at line 36
    - frontend/app/admin/tuition/_components/TuitionReportTable.tsx — full file; understand prop interface at line 42-54, getTuitionReport call at line 69
    - frontend/lib/teacher-tuition-api.ts — confirms exact function signatures to match (getTuitionConfig, updateTuitionConfig, createTuitionRecords, getTuitionReport)
  </read_first>
  <action>
    Modify all three components to accept optional API function props with admin-portal-api defaults. The admin page does NOT pass these props, so defaults must exactly preserve current behavior.

    --- TuitionConfigForm.tsx ---

    Extend the props interface to add two optional function props:
      getTuitionConfigFn?: (classId: number) => Promise&lt;TuitionConfig&gt;
      updateTuitionConfigFn?: (classId: number, data: CreateTuitionConfigInput) => Promise&lt;TuitionConfig&gt;

    Add default values in the destructure (after classId, onClose, onSaved):
      getTuitionConfigFn = getTuitionConfig,
      updateTuitionConfigFn = updateTuitionConfig,

    Replace all two call sites:
      - line 39: getTuitionConfig(classId) → getTuitionConfigFn(classId)
      - line 64: updateTuitionConfig(classId, form) → updateTuitionConfigFn(classId, form)

    The import at lines 3-7 stays unchanged (provides the default values):
      import { getTuitionConfig, updateTuitionConfig, CreateTuitionConfigInput } from '@/lib/admin-portal-api';

    Do NOT add the TuitionConfig type import — it is already re-exported by admin-portal-api.ts and used as the return type.

    --- GenerateRecordsModal.tsx ---

    Extend the props interface to add one optional function prop:
      createTuitionRecordsFn?: (data: GenerateRecordsInput) => Promise&lt;TuitionRecord[]&gt;

    Add GenerateRecordsInput and TuitionRecord to the existing admin-portal-api import:
      import { createTuitionRecords, GenerateRecordsInput, TuitionRecord } from '@/lib/admin-portal-api';

    Add default value in the destructure:
      createTuitionRecordsFn = createTuitionRecords,

    Replace the call site at line 36:
      createTuitionRecords({ classId, month, year }) → createTuitionRecordsFn({ classId, month, year })

    --- TuitionReportTable.tsx ---

    Extend the props interface to add one optional function prop:
      getTuitionReportFn?: (params: { classId: number; month: number; year: number; statuses?: string[] }) => Promise&lt;TuitionReportItem[]&gt;

    Add default value in the destructure:
      getTuitionReportFn = getTuitionReport,

    Replace the call site at line 69:
      getTuitionReport({ classId, month, year, statuses: ... }) → getTuitionReportFn({ classId, month, year, statuses: ... })

    The import at line 4 stays unchanged (provides the default value).

    CRITICAL CONSTRAINT: Do not modify frontend/app/admin/tuition/page.tsx. Admin page must continue working with zero changes — the default prop values guarantee this.
  </action>
  <verify>
    <automated>cd J:/sources/katie-english/frontend && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <acceptance_criteria>
    - TuitionConfigForm props interface contains getTuitionConfigFn and updateTuitionConfigFn (both optional with correct signatures)
    - TuitionConfigForm destructure uses these two fn props (not the direct imports) inside the component body
    - GenerateRecordsModal props interface contains createTuitionRecordsFn (optional with correct signature)
    - GenerateRecordsModal destructure uses createTuitionRecordsFn inside the component body
    - TuitionReportTable props interface contains getTuitionReportFn (optional with correct signature)
    - TuitionReportTable destructure uses getTuitionReportFn inside the component body
    - All three files still import from admin-portal-api (imports unchanged or extended only)
    - npx tsc --noEmit exits 0 with no type errors
  </acceptance_criteria>
  <done>
    All three shared components accept optional API function props that default to admin-portal-api imports, and use those fn props in their call sites. TypeScript compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire teacher-tuition-api functions into teacher tuition page props</name>
  <files>frontend/app/teacher/tuition/page.tsx</files>
  <read_first>
    - frontend/app/teacher/tuition/page.tsx — full file; understand existing imports (lines 1-20) and where TuitionConfigForm (line 107), GenerateRecordsModal (line 126), TuitionReportTable (line 164) are used
    - frontend/lib/teacher-tuition-api.ts — full file; confirm exact export names: getTuitionConfig, updateTuitionConfig, createTuitionRecords, getTuitionReport
  </read_first>
  <action>
    Add one new import statement to teacher/tuition/page.tsx, immediately after the existing component imports (after line 20):

      import {
        getTuitionConfig,
        updateTuitionConfig,
        createTuitionRecords,
        getTuitionReport,
      } from '@/lib/teacher-tuition-api';

    Then pass the teacher API functions as props to the three shared components:

    1. TuitionConfigForm (around line 107):
       Add props getTuitionConfigFn={getTuitionConfig} and updateTuitionConfigFn={updateTuitionConfig}
       Result:
         &lt;TuitionConfigForm
           classId={classId}
           onClose={() => {}}
           onSaved={() => {}}
           getTuitionConfigFn={getTuitionConfig}
           updateTuitionConfigFn={updateTuitionConfig}
         /&gt;

    2. GenerateRecordsModal (around line 126):
       Add prop createTuitionRecordsFn={createTuitionRecords}
       Result:
         &lt;GenerateRecordsModal
           open={generateOpen}
           classId={classId}
           onClose={() => setGenerateOpen(false)}
           onSaved={() => {}}
           createTuitionRecordsFn={createTuitionRecords}
         /&gt;

    3. TuitionReportTable (around line 164):
       Add prop getTuitionReportFn={getTuitionReport}
       Result:
         &lt;TuitionReportTable
           classId={classId}
           month={reportMonth}
           year={reportYear}
           getTuitionReportFn={getTuitionReport}
         /&gt;

    The import from '@/lib/teacher-tuition-api' exports getTuitionConfig/updateTuitionConfig/createTuitionRecords/getTuitionReport with identical signatures to admin-portal-api but using authHeaders() (teacher JWT from localStorage.token).

    Do NOT remove or alter any existing import. The new import must be named explicitly (no wildcard) to ensure tree-shaking and to avoid shadowing the existing admin-portal-api re-exports inside teacher-tuition-api.ts.
  </action>
  <verify>
    <automated>cd J:/sources/katie-english/frontend && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <acceptance_criteria>
    - frontend/app/teacher/tuition/page.tsx contains import from '@/lib/teacher-tuition-api' with getTuitionConfig, updateTuitionConfig, createTuitionRecords, getTuitionReport
    - TuitionConfigForm JSX in teacher page includes getTuitionConfigFn={getTuitionConfig} and updateTuitionConfigFn={updateTuitionConfig}
    - GenerateRecordsModal JSX in teacher page includes createTuitionRecordsFn={createTuitionRecords}
    - TuitionReportTable JSX in teacher page includes getTuitionReportFn={getTuitionReport}
    - frontend/app/admin/tuition/page.tsx is NOT modified (git diff shows no changes to that file)
    - npx tsc --noEmit exits 0 with no type errors
  </acceptance_criteria>
  <done>
    Teacher tuition page imports from teacher-tuition-api and passes all four teacher-auth functions as props to the three shared components. Admin page is untouched. TypeScript compiles without errors.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Teacher JWT → /admin/tuition/* | Teacher sends token from localStorage.token; backend TeacherOrAdminGuard validates role |
| Prop injection | Parent (teacher page) supplies API functions to child components; children cannot escape injected fn scope |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15G-01 | Spoofing | authHeaders() in teacher-tuition-api.ts | accept | Reads localStorage.token (set at login by teacher auth flow); same trust level as admin_token for admin flow; backend validates JWT signature |
| T-15G-02 | Elevation of Privilege | Default prop values in shared components | mitigate | Defaults point to adminAuthHeaders() path; teacher page explicitly overrides with teacher auth path; admin page uses defaults — no cross-contamination possible at runtime |
| T-15G-SC | Tampering | npm/pip/cargo installs | accept | No new packages installed — uses existing teacher-tuition-api.ts and authHeaders() already in codebase |
</threat_model>

<verification>
After both tasks:

1. TypeScript build passes:
   cd J:/sources/katie-english/frontend && npx tsc --noEmit

2. Admin page not modified:
   git diff frontend/app/admin/tuition/page.tsx
   (must show no changes)

3. Teacher page imports teacher-tuition-api:
   grep -n "teacher-tuition-api" frontend/app/teacher/tuition/page.tsx
   (must return at least one line)

4. All four fn props wired in teacher page:
   grep -n "TuitionConfigFn\|createTuitionRecordsFn\|getTuitionReportFn" frontend/app/teacher/tuition/page.tsx
   (must return lines for getTuitionConfigFn, updateTuitionConfigFn, createTuitionRecordsFn, getTuitionReportFn)

5. Components accept fn props:
   grep -n "getTuitionConfigFn\|updateTuitionConfigFn" frontend/app/admin/tuition/_components/TuitionConfigForm.tsx
   grep -n "createTuitionRecordsFn" frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx
   grep -n "getTuitionReportFn" frontend/app/admin/tuition/_components/TuitionReportTable.tsx
   (each must return multiple lines — prop interface declaration + default assignment + call site)
</verification>

<success_criteria>
1. TuitionConfigForm, GenerateRecordsModal, and TuitionReportTable each expose optional API function props (defaulting to admin-portal-api) so their call sites use the injected function, not the hardcoded import.
2. Teacher tuition page imports getTuitionConfig, updateTuitionConfig, createTuitionRecords, getTuitionReport from teacher-tuition-api and passes them as props to all three components.
3. Admin tuition page (frontend/app/admin/tuition/page.tsx) has zero modifications — git diff shows no changes.
4. npx tsc --noEmit exits 0 with no type errors across the frontend.
5. Teacher role users invoking the tuition page will have their API calls authenticated with the teacher JWT (localStorage.token via authHeaders()), not the admin token — closing D-06 gap on the frontend side.
</success_criteria>

<output>
Create .planning/phases/15-tuition-management/15-GAP-01-SUMMARY.md when done.

## Artifacts this phase produces

### Modified Files
- `frontend/app/admin/tuition/_components/TuitionConfigForm.tsx` — adds optional props getTuitionConfigFn and updateTuitionConfigFn; call sites use props; admin default values preserve existing behavior
- `frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx` — adds optional prop createTuitionRecordsFn; call site uses prop; admin default value preserves existing behavior
- `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` — adds optional prop getTuitionReportFn; call site uses prop; admin default value preserves existing behavior
- `frontend/app/teacher/tuition/page.tsx` — adds import from teacher-tuition-api; passes getTuitionConfigFn, updateTuitionConfigFn, createTuitionRecordsFn, getTuitionReportFn props to the three components

### Unchanged Files (intentionally)
- `frontend/app/admin/tuition/page.tsx` — zero modifications; relies on default prop values in the three components
- `frontend/lib/teacher-tuition-api.ts` — already correct; no changes needed
- `frontend/lib/admin-portal-api.ts` — already correct; no changes needed
</output>
