#!/usr/bin/env bash
# build-site.sh — Assemble website content from source docs, then build with MkDocs.
# Usage: ./scripts/build-site.sh [--serve]
set -euo pipefail
cd "$(dirname "$0")/.."

WEBSITE_DIR="website"

echo "==> Copying plan docs..."
mkdir -p "$WEBSITE_DIR/plan"
for f in plan/*.md; do
    cp "$f" "$WEBSITE_DIR/plan/$(basename "$f")"
done

echo "==> Converting paper LaTeX sections + figures..."
mkdir -p "$WEBSITE_DIR/paper"
python3 scripts/convert_paper.py

echo "==> Building MkDocs site..."
if [ "${1:-}" = "--serve" ]; then
    mkdocs serve
else
    mkdocs build
fi

echo "==> Done! Site output in site/"
