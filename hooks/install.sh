#!/usr/bin/env bash
# hooks/install.sh — Register the pre-push hook in a git repository.
#
# Usage: ./hooks/install.sh [repo-root]
#
# Copies hooks/pre-push into <repo-root>/.git/hooks/pre-push and makes it
# executable. Defaults to the repository containing this script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${1:-$(cd "$SCRIPT_DIR/.." && pwd)}"

HOOK_SRC="$SCRIPT_DIR/pre-push"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-push"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Error: $REPO_ROOT is not a git repository (no .git directory)" >&2
  exit 1
fi

if [ ! -f "$HOOK_SRC" ]; then
  echo "Error: source hook not found: $HOOK_SRC" >&2
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "Installed pre-push hook to $HOOK_DST"
