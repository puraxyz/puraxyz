#!/usr/bin/env bash
# Setup script for Pura OpenClaw skill.
# Generates an API key and writes it to .env if not already set.

set -euo pipefail

GATEWAY_URL="${PURA_GATEWAY_URL:-https://api.pura.xyz}"

if [[ -n "${PURA_API_KEY:-}" ]]; then
  echo "PURA_API_KEY already set: ${PURA_API_KEY:0:13}..."
  exit 0
fi

echo "Generating Pura API key..."
RESPONSE=$(curl -s -X POST "${GATEWAY_URL}/api/keys" \
  -H "Content-Type: application/json" \
  -d '{"label":"openclaw-agent"}')

KEY=$(echo "$RESPONSE" | grep -o '"key":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -z "$KEY" ]]; then
  echo "Failed to generate key. Response: $RESPONSE"
  exit 1
fi

echo "Generated key: ${KEY:0:13}..."
echo "export PURA_API_KEY=\"$KEY\"" >> "${HOME}/.env"
export PURA_API_KEY="$KEY"
echo "Key saved to ~/.env"
