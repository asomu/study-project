#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="${PROJECT_ROOT}/docs"

if ! command -v rg >/dev/null 2>&1; then
  echo "[ERROR] ripgrep (rg) is required." >&2
  exit 2
fi

fail_count=0

check_path() {
  local ref_file="$1"
  local ref_line="$2"
  local target="$3"

  if [[ ! -e "$target" ]]; then
    echo "[BROKEN] ${ref_file}:${ref_line} -> ${target}"
    fail_count=$((fail_count + 1))
  fi
}

# 1) Check absolute project paths used in docs text/backticks.
while IFS='|' read -r file line raw; do
  path="$raw"
  [[ -z "$path" ]] && continue
  check_path "$file" "$line" "$path"
done < <(
  rg -n --glob '*.md' -o '/Users/mark/Documents/project/study-project/[A-Za-z0-9_./-]+' "$DOCS_DIR" \
    | awk -F: '{print $1"|"$2"|"$3}'
)

# 2) Check markdown links that are local files.
while IFS='|' read -r file line link; do
  [[ -z "$link" ]] && continue

  # Skip anchors/external links/mail/tel.
  if [[ "$link" =~ ^# ]] || [[ "$link" =~ ^https?:// ]] || [[ "$link" =~ ^mailto: ]] || [[ "$link" =~ ^tel: ]]; then
    continue
  fi

  # Strip optional anchor fragment.
  link="${link%%#*}"

  if [[ "$link" = /* ]]; then
    target="$link"
  else
    target="$(cd "$(dirname "$file")" && pwd)/$link"
  fi

  check_path "$file" "$line" "$target"
done < <(
  rg -n --glob '*.md' '\[[^]]+\]\(([^)]+)\)' "$DOCS_DIR" \
    | sed -E 's/^([^:]+):([0-9]+):.*\[[^]]+\]\(([^)]+)\).*$/\1|\2|\3/'
)

if [[ "$fail_count" -gt 0 ]]; then
  echo "[FAIL] Broken links/paths: $fail_count"
  exit 1
fi

echo "[OK] No broken links/paths found in docs."
