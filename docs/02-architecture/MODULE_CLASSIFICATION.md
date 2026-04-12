# Module Classification

- Last Updated: 2026-04-12
- Scope: `apps/web/src/modules`
- Goal: 현재 런타임에 필요한 모듈과 남아 있는 레거시 흔적을 구분한다.

## 1. Active Modules

| Module | Status | Notes |
| --- | --- | --- |
| `auth` | Active | guardian signup/login, student activation, JWT/cookie auth |
| `curriculum` | Active | grade/semester/unit validation and curriculum lookup |
| `demo` | Active | current WrongNote + Workbook demo seed/clear support |
| `shared` | Active | shared utilities including wrong-note storage handling |
| `students` | Active | guardian student management and invite/reset flows |
| `workbook` | Active | template, assignment, progress matrix, summary/bar logic |
| `wrong-note` | Active | current product source of truth for wrong-note domain |

## 2. Removed Leftover Directories

| Module | Status | Notes |
| --- | --- | --- |
| `analytics` | Removed | Empty leftover directory removed during recovery cleanup. |
| `assessment` | Removed | Empty leftover directory removed during recovery cleanup. |
| `mistake-note` | Removed | Empty leftover directory removed after current storage logic moved to `shared`. |
| `study` | Removed | Empty leftover directory removed after runtime cleanup. |

## 3. Interpretation Rule

- For current audits, use two states only:
  - Active
  - Removed leftover

## 4. Cleanup Recommendation

1. Keep future cleanup batches updating `PROJECT_STRUCTURE.md`, `PROJECT_STATUS.md`, and `HANDOFF.md` in the same session.
