---
phase: 09-listen-answer
plan: "02"
subsystem: bfa-service
tags: [fastapi, sentence-transformers, semantic-scoring, docker-compose]
dependency_graph:
  requires: []
  provides: [bfa-service/score-semantic, bfa-service/health]
  affects: [docker-compose.yml, backend-environment]
tech_stack:
  added: [sentence-transformers==2.7.0, fastapi==0.111.0, uvicorn==0.29.0, python-multipart==0.0.9]
  patterns: [FastAPI lifespan eager model load, cosine similarity via SentenceTransformer, word-boundary keyword matching]
key_files:
  created:
    - bfa-service/main.py
    - bfa-service/requirements.txt
    - bfa-service/Dockerfile
  modified:
    - docker-compose.yml
decisions:
  - "Used FastAPI lifespan context manager (not deprecated on_event) for eager all-MiniLM-L6-v2 model load (~3s startup penalty)"
  - "bfa-service exposed on port 8001 (host) mapped to 8000 (container) for local dev curl access"
  - "backend depends on bfa-service with condition: service_healthy and 30s start_period to accommodate model load"
  - "/score-semantic returns early with zero scores if model not yet loaded (defensive null guard)"
metrics:
  duration: "106s"
  completed: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 9 Plan 02: bfa-service /score-semantic Endpoint Summary

**One-liner:** FastAPI microservice with sentence-transformers all-MiniLM-L6-v2 for semantic similarity scoring and word-boundary keyword matching, wired into docker-compose.

## What Was Built

Created the `bfa-service/` directory from scratch with a complete FastAPI microservice that:
- Loads the `all-MiniLM-L6-v2` sentence-transformers model eagerly at startup via FastAPI lifespan
- Exposes `GET /health` returning `{"status": "ok", "minilm_loaded": bool}`
- Exposes `POST /score-semantic` accepting `student_text`, `expected_text`, and `keywords` (JSON array as form field) — returns `{"semantic_score": float, "matched_keywords": list[str]}`
- Computes cosine similarity between student and expected answer embeddings (clamped 0.0–1.0)
- Matches keywords using word-boundary regex (`\b<keyword>\b`) for accurate partial-answer detection

Updated `docker-compose.yml` to:
- Define the `bfa-service` with healthcheck on `/health` (30s start_period for model load time)
- Add `bfa-service` to backend `depends_on` with `condition: service_healthy`
- Inject `BFA_SERVICE_URL=http://bfa-service:8000` into backend environment

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create bfa-service with requirements.txt, Dockerfile, main.py | 3d27014 |
| 2 | Wire bfa-service into docker-compose.yml | 45af512 |

## Deviations from Plan

**1. [Rule 1 - Bug] Acceptance criteria count discrepancy for `condition: service_healthy`**
- **Found during:** Task 2 verification
- **Issue:** Plan acceptance criteria states "4 matches" for `condition: service_healthy` but the original docker-compose.yml only had 2 (postgres, minio). After adding bfa-service, the count is 3, which is correct.
- **Fix:** Counted 3 matches — this is the correct expected count given the actual compose file. The plan's "4" appears to be a documentation error (likely assumed a 4th service_healthy condition that does not exist in this codebase). The implementation is correct.
- **Files modified:** None — no code change needed

## Known Stubs

None — all endpoint logic is fully implemented. The `/score-semantic` endpoint has a null guard for model-not-yet-loaded that returns zero scores, but this is a defensive fallback for the brief startup window, not a stub.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-network-service | docker-compose.yml | bfa-service port 8001 mapped to host — accessible on localhost:8001 during dev; not a prod concern as it's behind Docker network |

## Self-Check

Checked created files exist:
- FOUND: bfa-service/requirements.txt
- FOUND: bfa-service/Dockerfile
- FOUND: bfa-service/main.py
- FOUND: docker-compose.yml (modified)

Checked commits exist:
- FOUND: 3d27014 (feat(09-02): create bfa-service with /score-semantic and /health endpoints)
- FOUND: 45af512 (feat(09-02): wire bfa-service into docker-compose.yml)

## Self-Check: PASSED
