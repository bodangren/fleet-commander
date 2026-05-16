#!/usr/bin/env bash
# regenerate-api-dts.sh — Regenerate convex/_generated/api.d.ts offline
#
# Usage: ./convex/scripts/regenerate-api-dts.sh
#
# This script scans convex/ for .ts files that export query/mutation functions
# and regenerates the api.d.ts type file. Use when `npx convex dev` is unavailable.
#
# Requires: bash, find, sed

set -euo pipefail

CONVEX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GENERATED_DIR="${CONVEX_DIR}/_generated"
API_DTS="${GENERATED_DIR}/api.d.ts"

if [[ ! -d "$CONVEX_DIR" ]]; then
  echo "Error: convex/ directory not found" >&2
  exit 1
fi

# Collect all .ts files in convex/ (excluding _generated/)
mapfile -t MODULES < <(
  find "$CONVEX_DIR" -name '*.ts' -not -path '*/_generated/*' -not -name '*.test.ts' -not -name '*.d.ts' \
    | sed "s|^${CONVEX_DIR}/||" \
    | sed 's|\.ts$||' \
    | sort
)

if [[ ${#MODULES[@]} -eq 0 ]]; then
  echo "Warning: No modules found in convex/" >&2
fi

# Generate import lines
IMPORTS=""
EXPORTS=""
FIRST=true

for module in "${MODULES[@]}"; do
  # Convert path to JS import (e.g., "lib/validators" -> "lib/validators.js")
  js_import="${module}.js"

  # Convert path to valid identifier (e.g., "lib/validators" -> "lib_validators")
  export_name="${module//\//_}"

  IMPORTS="${IMPORTS}import type * as ${export_name} from \"../${js_import}\";\n"

  if [[ "$FIRST" == "true" ]]; then
    FIRST=false
  else
    EXPORTS="${EXPORTS},\n"
  fi
  EXPORTS="${EXPORTS}    ${export_name}"
done

# Write the api.d.ts file
cat > "$API_DTS" << EOF
/* eslint-disable */
/**
 * Generated \`api\` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\` or \`./convex/scripts/regenerate-api-dts.sh\`.
 * @module
 */

$(echo -e "$IMPORTS")
declare const fullApi: {
$(echo -e "$EXPORTS")
};
declare const fullApiWithMounts: typeof fullApi;
export { fullApi as api, fullApiWithMounts };
EOF

echo "Generated ${API_DTS} with ${#MODULES[@]} modules."
