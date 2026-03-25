#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODE=""
BASE_REF="${BASE_REF:-origin/main}"
HEAD_REF="${HEAD_REF:-HEAD}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/run-verification-gates.sh --mode pr [--base <ref>] [--head <ref>]
  bash scripts/run-verification-gates.sh --mode release

Modes:
  pr       Run PR smoke gates and conditionally run targeted E2E checks by changed paths.
  release  Run full release gates and operational checks.

Options:
  --mode   Required. One of: pr, release
  --base   Optional. Base ref for changed-file detection (default: origin/main)
  --head   Optional. Head ref for changed-file detection (default: HEAD)
  -h, --help  Show this help message
EOF
}

run_in_root() {
  echo "[RUN] $*"
  (
    cd "$PROJECT_ROOT"
    "$@"
  )
}

resolve_runtime_path() {
  local path_value="$1"
  local base_dir="${2:-$PROJECT_ROOT}"

  if [[ "$path_value" == "~/"* ]]; then
    printf '%s\n' "$HOME/${path_value#"~/"}"
    return
  fi

  if [[ "$path_value" = /* ]]; then
    printf '%s\n' "$path_value"
    return
  fi

  printf '%s\n' "$base_dir/$path_value"
}

resolve_app_data_root() {
  if [[ -n "${APP_DATA_ROOT:-}" ]]; then
    resolve_runtime_path "$APP_DATA_ROOT" "$PROJECT_ROOT/apps/web"
    return
  fi

  printf '%s\n' "$HOME/Library/Application Support/study-project"
}

resolve_app_backup_root() {
  if [[ -n "${APP_BACKUP_ROOT:-}" ]]; then
    resolve_runtime_path "$APP_BACKUP_ROOT" "$PROJECT_ROOT/apps/web"
    return
  fi

  printf '%s\n' "$HOME/Library/Application Support/study-project-backups"
}

resolve_wrong_note_storage_root() {
  if [[ -n "${WRONG_NOTE_STORAGE_ROOT:-}" ]]; then
    resolve_runtime_path "$WRONG_NOTE_STORAGE_ROOT" "$PROJECT_ROOT/apps/web"
    return
  fi

  printf '%s\n' "$(resolve_app_data_root)/wrong-notes"
}

prepare_runtime_directories() {
  local wrong_note_storage_root
  local wrong_note_backup_root

  wrong_note_storage_root="$(resolve_wrong_note_storage_root)"
  wrong_note_backup_root="$(resolve_app_backup_root)"

  run_in_root mkdir -p \
    apps/web/.tmp/test-data/wrong-notes \
    apps/web/.tmp/test-backups \
    "$wrong_note_storage_root" \
    "$wrong_note_backup_root"
}

prepare_database() {
  prepare_runtime_directories
  run_in_root pnpm -C apps/web prisma:generate
  run_in_root pnpm -C apps/web exec prisma migrate deploy
  run_in_root pnpm -C apps/web prisma:seed
}

require_mode() {
  if [[ -z "$MODE" ]]; then
    echo "[ERROR] --mode is required."
    usage
    exit 1
  fi

  if [[ "$MODE" != "pr" && "$MODE" != "release" ]]; then
    echo "[ERROR] Unsupported mode: $MODE"
    usage
    exit 1
  fi
}

resolve_changed_files() {
  local ref_output=""
  local working_tree_output=""
  local staged_output=""
  local untracked_output=""

  if git -C "$PROJECT_ROOT" rev-parse --verify "$BASE_REF" >/dev/null 2>&1 && \
    git -C "$PROJECT_ROOT" rev-parse --verify "$HEAD_REF" >/dev/null 2>&1; then
    ref_output="$(git -C "$PROJECT_ROOT" diff --name-only "$BASE_REF...$HEAD_REF" || true)"
  elif git -C "$PROJECT_ROOT" rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    ref_output="$(git -C "$PROJECT_ROOT" diff --name-only HEAD~1...HEAD || true)"
  else
    ref_output="$(git -C "$PROJECT_ROOT" diff --name-only HEAD || true)"
  fi

  working_tree_output="$(git -C "$PROJECT_ROOT" diff --name-only || true)"
  staged_output="$(git -C "$PROJECT_ROOT" diff --name-only --cached || true)"
  untracked_output="$(git -C "$PROJECT_ROOT" ls-files --others --exclude-standard || true)"

  printf '%s\n%s\n%s\n%s\n' "$ref_output" "$working_tree_output" "$staged_output" "$untracked_output" | sed '/^$/d' | sort -u
}

run_pr_mode() {
  local changed_files
  local run_wrong_note_e2e="false"

  prepare_database
  run_in_root pnpm lint
  run_in_root pnpm typecheck
  run_in_root pnpm build
  run_in_root pnpm test
  run_in_root bash scripts/check-doc-links.sh

  changed_files="$(resolve_changed_files)"

  if [[ -n "$changed_files" ]]; then
    if printf '%s\n' "$changed_files" | grep -Eq '^apps/web/src/app/api/v1/(student/)?wrong-notes|^apps/web/src/app/api/v1/student-workbooks/|^apps/web/src/app/api/v1/(student/)?workbook-progress/|^apps/web/src/app/api/v1/workbook-templates/|^apps/web/src/components/wrong-notes/|^apps/web/src/modules/wrong-note/|^apps/web/src/modules/workbook/|^apps/web/src/app/\(protected\)/(dashboard|student/dashboard)/'; then
      run_wrong_note_e2e="true"
    fi
  fi

  if [[ "$run_wrong_note_e2e" == "true" ]]; then
    run_in_root pnpm -C apps/web exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/wrong-note-dashboard.spec.ts
  else
    echo "[SKIP] Targeted wrong-note E2E not required by changed paths."
  fi
}

run_release_mode() {
  local wrong_note_storage_root
  wrong_note_storage_root="$(resolve_wrong_note_storage_root)"
  local wrong_note_backup_root
  wrong_note_backup_root="$(resolve_app_backup_root)"
  local size_kb
  local threshold_kb=$((2 * 1024 * 1024))

  prepare_database
  run_in_root pnpm lint
  run_in_root pnpm typecheck
  run_in_root pnpm build
  run_in_root pnpm test
  run_in_root pnpm test:e2e
  run_in_root pnpm -C apps/web run wrong-note:storage:audit -- --json
  run_in_root bash scripts/check-doc-links.sh

  echo "[CHECK] test -d $wrong_note_storage_root"
  if [[ ! -d "$wrong_note_storage_root" ]]; then
    echo "[ERROR] Wrong-note storage directory not found: $wrong_note_storage_root"
    exit 1
  fi

  echo "[CHECK] test -d $wrong_note_backup_root"
  if [[ ! -d "$wrong_note_backup_root" ]]; then
    echo "[ERROR] Wrong-note backup directory not found: $wrong_note_backup_root"
    exit 1
  fi

  echo "[CHECK] du -sk $wrong_note_storage_root"
  size_kb="$(du -sk "$wrong_note_storage_root" | awk '{print $1}')"
  echo "[INFO] Wrong-note storage size: ${size_kb}KB (threshold: ${threshold_kb}KB)"

  if (( size_kb > threshold_kb )); then
    echo "[HOLD] Wrong-note storage exceeds 2GB threshold. Release should be conditionally held."
    exit 3
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --base)
      BASE_REF="${2:-}"
      shift 2
      ;;
    --head)
      HEAD_REF="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_mode

if [[ "$MODE" == "pr" ]]; then
  run_pr_mode
else
  run_release_mode
fi

echo "[OK] Verification gates completed (${MODE} mode)."
