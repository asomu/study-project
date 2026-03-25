#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="${PROJECT_ROOT}/docs"
HAS_RG="false"

if command -v rg >/dev/null 2>&1; then
  HAS_RG="true"
else
  echo "[INFO] ripgrep (rg) not found; falling back to grep." >&2
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

find_absolute_project_paths() {
  if [[ "$HAS_RG" == "true" ]]; then
    rg -n --glob '*.md' -o '/Users/mark/Documents/project/study-project/[A-Za-z0-9_./-]+' "$DOCS_DIR" \
      | awk -F: '{print $1"|"$2"|"$3}'
    return
  fi

  grep -RInoE --include='*.md' '/Users/mark/Documents/project/study-project/[A-Za-z0-9_./-]+' "$DOCS_DIR" \
    | awk -F: '{print $1"|"$2"|"$3}'
}

find_markdown_links() {
  local markdown_link_regex='\[[^]]+\]\(([^)]+)\)'

  if [[ "$HAS_RG" == "true" ]]; then
    rg -n --glob '*.md' '\[[^]]+\]\(([^)]+)\)' "$DOCS_DIR" \
      | sed -E 's/^([^:]+):([0-9]+):.*\[[^]]+\]\(([^)]+)\).*$/\1|\2|\3/'
    return
  fi

  while IFS=':' read -r file line content; do
    remaining="$content"

    while [[ "$remaining" =~ $markdown_link_regex ]]; do
      echo "${file}|${line}|${BASH_REMATCH[1]}"
      remaining="${remaining#*"${BASH_REMATCH[0]}"}"
    done
  done < <(grep -RInE --include='*.md' '\[[^]]+\]\(([^)]+)\)' "$DOCS_DIR")
}

# 1) Check absolute project paths used in docs text/backticks.
while IFS='|' read -r file line raw; do
  path="$raw"
  [[ -z "$path" ]] && continue
  check_path "$file" "$line" "$path"
done < <(find_absolute_project_paths)

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
done < <(find_markdown_links)

if [[ "$fail_count" -gt 0 ]]; then
  echo "[FAIL] Broken links/paths: $fail_count"
  exit 1
fi

echo "[OK] No broken links/paths found in docs."
