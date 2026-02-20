# Development Plan

- Plan Version: v1.0
- Start Baseline: 2026-02-20

## 1. Milestones

1. M0: 설계/문서화 완료
- 산출물: PRD, 아키텍처, 테스트/리뷰 전략, 상태관리 문서

2. M1: 기반 구축
- Next.js 프로젝트 초기화
- DB/Prisma/인증/기본 레이아웃

3. M2: 핵심 데이터 입력
- 문제집/학습지 입력
- 단원별 정오답 입력
- 오답 이미지 업로드 + 카테고리 분류

4. M3: 대시보드 MVP
- 진도 대비 성취도
- 단원별 약점 시각화
- 오답 유형 분포

5. M4: 검증/안정화
- 테스트 강화
- 로컬 배포 안정화
- 사용자 피드백 반영

## 1.1 M1 Scope Lock (2026-02-20)

포함 범위:

- pnpm 워크스페이스 + Next.js 16(App Router) + Tailwind 4 + ESLint/Prettier
- PostgreSQL 대상 Prisma 스키마/마이그레이션/시드 파일
- 커스텀 JWT + HttpOnly 쿠키 기반 인증(`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`)
- 학생 기본 API(`GET /api/v1/students`, `POST /api/v1/students`) + 소유권 가드 스캐폴딩
- 기본 로그인/대시보드 셸 화면과 보호 라우팅
- Unit/Integration/E2E smoke 테스트 게이트

비포함 범위:

- Redis/BullMQ, MinIO, Caddy 운영 구성
- 오답 이미지 업로드 API 및 대시보드 분석 API 구현
- M2 이후 도메인(문제집/시도/오답 입력) 기능 상세

## 2. MVP 작업 우선순위

- P0: 인증/학생 프로필/커리큘럼
- P0: 시도/문항/오답 저장
- P0: 대시보드 핵심 3개 차트
- P1: 리포트/추천 메시지
- P2: 고급 분석/자동화

## 3. 리스크

- 한국 수학 진도 데이터 버전 동기화 필요
- 권한/소유권 검증 누락 시 데이터 노출 위험
- 모바일 UX 복잡도 증가 가능

## 4. 대응

- asOfDate 기반 커리큘럼 버전 관리
- 보호자-학생 소유권 검증 규칙을 API 공통 가드로 강제
- 카테고리 가이드 문구 통일
- 모바일 우선 디자인 리뷰 주기 고정
