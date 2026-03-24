#!/usr/bin/env bash
# Check Pura gateway cost report for the current key.

set -euo pipefail

GATEWAY_URL="${PURA_GATEWAY_URL:-https://api.pura.xyz}"

if [[ -z "${PURA_API_KEY:-}" ]]; then
  echo "PURA_API_KEY not set. Run setup.sh first."
  exit 1
fi

curl -s "${GATEWAY_URL}/api/report" \
  -H "Authorization: Bearer ${PURA_API_KEY}" | python3 -m json.tool 2>/dev/null || \
curl -s "${GATEWAY_URL}/api/report" \
  -H "Authorization: Bearer ${PURA_API_KEY}"
