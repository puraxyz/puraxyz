#!/usr/bin/env bash
# Setup script for Pura OpenClaw skill.
# Generates an API key, writes it to .env, and optionally configures
# OpenClaw to route its own LLM calls through the Pura gateway.

set -euo pipefail

GATEWAY_URL="${PURA_GATEWAY_URL:-https://api.pura.xyz}"

if [[ -n "${PURA_API_KEY:-}" ]]; then
  echo "PURA_API_KEY already set: ${PURA_API_KEY:0:13}..."
else
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
fi

# Configure OpenClaw to route its own inference through Pura
OPENCLAW_CONFIG="${HOME}/.openclaw/openclaw.json"
if [[ -f "$OPENCLAW_CONFIG" ]]; then
  if command -v jq &>/dev/null; then
    # Set the custom base URL so OpenClaw's own LLM calls go through Pura
    jq '.models.providers += [{"name": "pura", "baseUrl": "'"${GATEWAY_URL}/api"'", "apiKey": "'"${PURA_API_KEY}"'"}]' \
      "$OPENCLAW_CONFIG" > "${OPENCLAW_CONFIG}.tmp" && mv "${OPENCLAW_CONFIG}.tmp" "$OPENCLAW_CONFIG"
    echo "OpenClaw configured to route through Pura gateway."
  else
    echo "jq not found — skipping OpenClaw config. Add Pura as a provider manually in $OPENCLAW_CONFIG"
  fi
else
  echo "OpenClaw config not found at $OPENCLAW_CONFIG — run 'openclaw onboard' first."
fi

echo "Setup complete. Test with: curl ${GATEWAY_URL}/api/chat -H 'Authorization: Bearer ${PURA_API_KEY:0:13}...' -d '{\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}'"
