# 사내 온보딩 AI 에이전트 프론트엔드

Vite + React + TypeScript 기반의 온보딩 AI 에이전트 프론트엔드입니다.
백엔드 `project`의 FastAPI `/api/v1` API와 연동합니다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

기본 백엔드 주소는 `VITE_API_BASE_URL=http://localhost:8000` 입니다.

## Docker Compose 실행

```bash
cp .env.example .env
docker compose up -d --build
```

프론트 컨테이너는 Nginx로 정적 빌드 결과를 서빙하며 `http://localhost:5173`에서 접근합니다.
백엔드와 같은 `onboarding_net` 외부 네트워크를 사용하므로, 먼저 DB compose가 네트워크를 만든 상태여야 합니다.

## 인증 방식

- 로그인 응답의 `access_token`, `refresh_token`을 localStorage에 저장합니다.
- API 요청은 access token을 `Authorization: Bearer` 헤더로 전송합니다.
- 401 응답이 오면 refresh token으로 `/api/v1/users/refresh`를 한 번 호출하고 원 요청을 재시도합니다.
- 로그아웃 시 localStorage를 비우고 `/api/v1/users/logout`으로 서버 refresh 세션을 폐기합니다.

이 방식은 로컬 HTTP 개발 전용입니다. 운영/HTTPS 환경에서는 HttpOnly Cookie 방식으로 전환을 권장합니다.

## 주요 화면

- `/login`: 로그인
- `/register`: 회원가입
- `/`: 문서 업로드, 체크포인트 저장, SSE 채팅 대시보드
