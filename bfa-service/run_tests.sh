#!/usr/bin/env bash
# BFA service test runner
# Usage:
#   ./run_tests.sh              — unit tests only (no service needed)
#   ./run_tests.sh integration  — unit + integration (requires BFA service)
#   ./run_tests.sh report       — unit + full results report tables
#   BFA_URL=http://host:3002 ./run_tests.sh integration

set -euo pipefail

BFA_URL="${BFA_URL:-http://localhost:3002}"
MODE="${1:-unit}"

cd "$(dirname "$0")"

echo ""
echo "══════════════════════════════════════════"
echo "  BFA TEST RUNNER"
echo "══════════════════════════════════════════"
echo ""

# ── Unit tests (always run, no service required) ─────────────────────────────
echo "▶ Unit tests (pure functions, no service)"
python3 -m pytest test_bfa.py -v
echo ""

if [[ "$MODE" == "unit" ]]; then
    echo "✓ Unit tests done. Pass 'integration' or 'report' to run against a live service."
    exit 0
fi

# ── Service health check ──────────────────────────────────────────────────────
echo "▶ Checking BFA service at $BFA_URL ..."
if ! curl -sf "$BFA_URL/health" > /dev/null 2>&1; then
    echo ""
    echo "✗ BFA service not reachable at $BFA_URL"
    echo ""
    echo "  Start it with Docker:"
    echo "    docker run -p 3002:8000 <bfa-image>"
    echo ""
    echo "  Or start locally:"
    echo "    uvicorn main:app --port 3002"
    echo ""
    exit 1
fi

HEALTH=$(curl -sf "$BFA_URL/health")
echo "  Health: $HEALTH"
echo ""

# ── Integration tests ─────────────────────────────────────────────────────────
if [[ "$MODE" == "integration" ]]; then
    echo "▶ Integration tests (/analyze + /analyze-speaking)"
    BFA_URL="$BFA_URL" python3 -m pytest test_bfa_integration.py -v \
        --ignore-glob="*report*" \
        -k "not report"
fi

# ── Report mode ───────────────────────────────────────────────────────────────
if [[ "$MODE" == "report" ]]; then
    echo "▶ /analyze results report (all 59 samples)"
    BFA_URL="$BFA_URL" python3 -m pytest \
        "test_bfa_integration.py::test_bfa_results_report" -v -s

    echo ""
    echo "▶ /analyze-speaking results report"
    BFA_URL="$BFA_URL" python3 -m pytest \
        "test_bfa_integration.py::test_analyze_speaking_report" -v -s
fi

echo ""
echo "✓ Done."
