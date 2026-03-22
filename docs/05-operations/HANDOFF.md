# Session Handoff

## Latest Update (2026-03-22)

- Done:
  - M10 closeout cleanup 완료
    - guardian dashboard의 문제집 템플릿 카탈로그와 학생 배정 목록을 분리
    - 배정되지 않은 템플릿도 수정/활성 관리 가능하도록 UI 정리
    - workbook progress dashboard가 선택 학년에 해당 workbook이 없을 때 `selectedWorkbook = null`을 반환하도록 수정
    - workbook integration, mocked e2e, real smoke, build, lint, doc link 재검증 완료
  - M10 workbook progress + wrong-note workbook link 완료
    - guardian workbook template 등록/활성 관리 API와 대시보드 UI 추가
    - guardian student workbook 배정/보관 API와 대시보드 UI 추가
    - student/guardian 공통 workbook progress dashboard 추가
      - 대상 학년 선택
      - 문제집 선택
      - summary KPI
      - 단원별 완료 단계 수 bar chart
      - `단원 x 단계` matrix
      - 셀 클릭 즉시 `시작전 -> 진행중 -> 완료 -> 시작전` 상태 변경
    - `wrong_notes.student_workbook_id`, `wrong_notes.workbook_template_stage_id` 추가
    - 학생 오답 업로드/상세 수정에서 문제집 + 단계 optional 연결 지원
    - 오답 카드/상세에서 연결된 문제집명/출판사/단계명 표시
  - wrong-note 단원 선택 커리큘럼 현재 기준 재정비 완료
    - wrong-note `curriculum_nodes`를 2026-03-22 현재 적용 버전 기준으로 재구성
    - 중1/중2는 `2022.12`, 중3은 `2015.09` active catalog로 반영
    - 학년·학기별 대표 단원을 현재 교과과정 기준으로 확장해 콤보박스 선택 폭 보강
    - 단원 근거 문서 `docs/06-data/MIDDLE_MATH_CURRENT_CURRICULUM_2026-03-22.md` 추가
  - M9 wrong-note local storage hardening 완료
    - wrong-note 이미지를 repo 내부 `public/uploads/wrong-notes`가 아니라 `~/Library/Application Support/study-project/wrong-notes`에 저장하도록 전환
    - student/guardian guarded image GET route 추가
    - `wrong_notes.image_path`는 storage key를 저장하고 API 응답 `imagePath`는 guarded image URL을 반환하도록 직렬화 규칙 변경
    - legacy `/uploads/wrong-notes/...` 값은 read-only 호환 유지
    - missing image placeholder UI 추가
    - storage audit / backup script 추가
    - verification gate를 새 저장소 정책에 맞게 갱신
  - 검증 완료
    - `pnpm -C apps/web exec prisma migrate dev --name workbook_progress`
    - `pnpm -C apps/web exec vitest run tests/unit/workbook-service.test.ts`
    - `pnpm -C apps/web exec vitest run tests/integration/workbook-routes.test.ts`
    - `pnpm -C apps/web exec vitest run --config vitest.real.config.ts tests/real-integration/workbook-progress-real.test.ts`
    - `pnpm -C apps/web prisma:seed`
    - `pnpm -C apps/web exec vitest run tests/integration/curriculum-route.test.ts`
    - `pnpm -C apps/web exec vitest run --config vitest.real.config.ts tests/real-integration/wrong-notes-real.test.ts tests/real-integration/demo-seed-real.test.ts`
    - `pnpm -C apps/web exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/wrong-note-dashboard.spec.ts`
    - `pnpm -C apps/web exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/wrong-note-real-smoke.spec.ts`
    - `pnpm -C apps/web typecheck`
    - `pnpm -C apps/web lint`
    - `pnpm -C apps/web exec vitest run tests/unit/mistake-note-upload.test.ts tests/unit/wrong-note-service.test.ts`
    - `pnpm -C apps/web exec vitest run tests/integration/wrong-notes-routes.test.ts`
    - `pnpm -C apps/web exec vitest run --config vitest.real.config.ts tests/real-integration/wrong-notes-real.test.ts`
    - `pnpm -C apps/web exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/wrong-note-dashboard.spec.ts`
    - `pnpm -C apps/web exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/wrong-note-real-smoke.spec.ts`
    - `pnpm -C apps/web build`
    - `pnpm -C apps/web run wrong-note:storage:audit -- --json`
    - `pnpm -C apps/web run wrong-note:storage:backup`
    - `bash scripts/check-doc-links.sh`
  - 문서 동기화 완료
    - `PRD`
    - `SYSTEM_ARCHITECTURE`
    - `DATA_MODEL`
    - `API_SPEC_V1`
    - `DEVELOPMENT_PLAN`
    - `DECISION_LOG`
    - `PROJECT_STATUS`
    - `HANDOFF`
    - `CONTEXT_INDEX`
- In Progress:
  - 없음
- Blocked:
  - 없음
- Next:
  - guardian workbook template 수정 UX를 prompt 기반에서 inline 편집으로 다듬을지 결정
  - storage audit 결과를 주기 점검 루틴으로 정리
  - backup 보관 주기와 복구 절차를 운영 체크리스트에 고정
  - 레거시 wrong-answer/study 제거 여부 결정

## Session Start Checklist

1. `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md` 요약 확인
2. `/Users/mark/Documents/project/study-project/docs/INDEX.md` 네비게이션 확인
3. `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` 확인
4. `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` 최신 결정 확인
5. 현재 작업 범위가 `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`와 일치하는지 점검
