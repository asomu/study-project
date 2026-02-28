# Operations Checklist

- Last Updated: 2026-02-28
- Scope: MVP 로컬 운영(`apps/web`)
- Owner: Team

## 1. Upload Storage Backup Policy

- Source Directory:
  - `/Users/mark/Documents/project/study-project/apps/web/public/uploads/wrong-answers`
- Backup Root:
  - `/Users/mark/Documents/project/study-project/backups/wrong-answers`
- Schedule:
  - 매일 02:00 (Asia/Seoul, KST) 백업 수행
- Retention:
  - 일간 백업: 14일 보관
  - 주간 스냅샷: 8주 보관
  - 월간 스냅샷: 6개월 보관

## 2. Cleanup Policy

- 만료된 일간/주간/월간 백업은 백업 작업 직후 정리한다.
- 삭제 전 최신 백업 1개는 항상 유지한다.
- 수동 정리 시에도 보관 정책(일 14/주 8/월 6)을 초과하지 않도록 동일 기준을 적용한다.

## 3. Alert and Monitoring Thresholds

- 업로드 디렉터리 용량이 2GB를 초과하면 점검한다.
- 백업 실패가 2회 연속 발생하면 우선순위 P1 이슈로 처리한다.
- 이미지 업로드 실패가 하루 3회 이상 발생하면 업로드 경로/권한/디스크 여유 공간을 점검한다.

## 4. External Exposure Preflight Checklist

- TLS:
  - reverse proxy(Caddy) TLS 인증서 적용 여부 확인
- Access Control:
  - 외부 접근 허용 시 IP 제한 또는 인증 게이트 적용 여부 확인
- Auth and Ownership:
  - JWT + HttpOnly 쿠키 정책 유지 여부 확인
  - 보호자-학생 소유권 체인 검증 API 회귀 테스트 통과 확인
- Logging:
  - 인증 실패/권한 거부/업로드 실패 로그가 누락 없이 남는지 확인

## 5. Operational Verification Commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `bash scripts/check-doc-links.sh`
