---
phase: 05-bfa-quality-performance
plan: "06"
subsystem: bfa
tags: [azure, speech-sdk, pronunciation-assessment, refactor]
dependency_graph:
  requires: [05-05]
  provides: [azure-bfa-engine]
  affects: [backend/src/bfa, docker-compose.yml]
tech_stack:
  added: [microsoft-cognitiveservices-speech-sdk, ffmpeg]
  patterns: [azure-pronunciation-assessment, push-stream-audio]
key_files:
  created:
    - backend/src/bfa/azure-audio.util.ts
  modified:
    - backend/src/bfa/bfa.service.ts
    - backend/src/bfa/bfa.dto.ts
    - backend/src/bfa/bfa.service.spec.ts
    - backend/package.json
    - backend/Dockerfile
    - docker-compose.yml
  deleted:
    - bfa-service/ (entire directory)
decisions:
  - "Cast Buffer to ArrayBuffer via unknown for pushStream.write — SDK types declare ArrayBuffer but Node Buffer works at runtime"
  - "Cast pronConfig to any for enableContentAssessmentWithTopic — method exists in SDK v1.37+ but not in TypeScript types"
  - "Use manual jest.mock factory for SDK — auto-mock crashes on SDK module initialization code"
metrics:
  duration_seconds: 394
  completed_date: "2026-05-22"
  tasks_completed: 6
  tasks_total: 6
  files_changed: 7
---

# Phase 05 Plan 06: Replace BFA Engine with Azure Pronunciation Assessment Summary

**One-liner:** Replaced self-hosted Python bfa-service (WhisperX + bournemouth_aligner) with Azure Pronunciation Assessment SDK called directly from NestJS backend via microsoft-cognitiveservices-speech-sdk.

## What Was Built

BfaService now calls the Azure Speech SDK directly — no more Docker bfa-service Python container, no more axios/FormData HTTP calls. Audio is converted to PCM WAV 16kHz via ffmpeg before being pushed through the Azure SDK's PushStream. The service implements all four public methods (analyze, transcribe, analyzeSpeaking, align) with identical return shapes to the old Python service.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install Azure Speech SDK + ffmpeg in Dockerfile + audio util | d4e5479 |
| 2 | Rewrite bfa.service.ts with Azure PA SDK | e2836cf |
| 3 | Add pronScore field to BfaAlignResult dto | e1a3bc2 |
| 4 | Rewrite bfa.service.spec.ts with Azure SDK mock | 331f2f9 |
| 5 | Remove bfa-service from docker-compose.yml | a371f9a |
| 6 | Delete bfa-service directory | e9e56c5 |

## Acceptance Criteria Verified

1. bfa.service.ts imports from microsoft-cognitiveservices-speech-sdk — no axios: PASS
2. analyze() maps Omission->missing, Insertion->extra, >=80->correct, >=50->similar, <50->substituted: PASS
3. Offset/Duration divided by 10_000_000 to get seconds: PASS
4. docker-compose.yml has no bfa: service block: PASS
5. bfa-service/ directory does not exist: PASS
6. All 18 jest tests in bfa.service.spec.ts pass: PASS
7. npx tsc --noEmit passes: PASS

## Final Test Results

Full backend suite: 150 tests passed, 0 failed, 3 test suites.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer-to-ArrayBuffer type cast required for SDK pushStream.write**
- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** Azure SDK declares `pushStream.write(ArrayBuffer)` but Node.js `Buffer` is not assignable to `ArrayBuffer` in strict TypeScript even though it works at runtime
- **Fix:** Cast `wavBuf as unknown as ArrayBuffer` at each pushStream.write callsite
- **Files modified:** backend/src/bfa/bfa.service.ts

**2. [Rule 1 - Bug] enableContentAssessmentWithTopic not in SDK TypeScript types**
- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** The method exists in the SDK at runtime (v1.37+) but is absent from the TypeScript type definitions
- **Fix:** Cast `(pronConfig as any).enableContentAssessmentWithTopic('general')`
- **Files modified:** backend/src/bfa/bfa.service.ts

**3. [Rule 1 - Bug] SDK auto-mock crashes on module initialization**
- **Found during:** Task 4 (jest run)
- **Issue:** `jest.mock('microsoft-cognitiveservices-speech-sdk')` auto-mock triggers SDK initialization code that calls `getProperty` on an undefined object during import
- **Fix:** Replaced auto-mock with manual `jest.mock(module, factory)` that provides all required SDK symbols as jest.fn() instances. Also fixed hoisting issue — jest.mock factories cannot reference outer `const` variables declared before the factory.
- **Files modified:** backend/src/bfa/bfa.service.spec.ts

**4. [Rule 3 - Deviation] Also removed prometheus depends_on bfa**
- **Found during:** Task 5
- **Issue:** `prometheus:` service had `depends_on: - bfa` which would fail after bfa service removal
- **Fix:** Removed `depends_on` from prometheus entirely (it doesn't need to wait for anything)
- **Files modified:** docker-compose.yml

## Known Stubs

None — all methods call Azure SDK directly.

## Threat Flags

None — no new network endpoints or auth paths introduced. Azure Speech Key is passed via environment variable, not hardcoded.

## Self-Check: PASSED
