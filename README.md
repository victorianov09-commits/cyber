# CYBER DUEL

React + TypeScript + Vite로 만드는 한국어 사이버보안 교육 게임입니다.

## 시작하기

Node.js 22.12 이상(권장: 24)에서 다음 명령을 실행하세요.

```sh
npm ci
npm run dev
```

- `npm run build`: TypeScript 검사와 배포 파일 생성 (`dist/`)
- `npm run preview`: 빌드 결과 확인

## 현재 구현

- 반응형 메인 화면, 왼쪽 메뉴, 프로젝트 소개
- 5단계 미션 로드맵 화면 (게임 플레이는 준비 중)
- 입문자를 위한 보안 아카데미 안내
- 해시 경로로 화면 이동 및 뒤로 가기 지원

## GitHub Pages

Vite의 기본 경로는 `/cyber/`입니다. 해시 라우팅을 사용하여 하위 화면에서 새로고침해도 서버의 별도 경로 처리가 필요하지 않습니다.

GitHub 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 선택하세요. 변경사항을 `main`에 올리면 `.github/workflows/deploy.yml`이 빌드 후 배포합니다. 저장소 이름을 바꾸면 `vite.config.ts`의 `base`도 바꿔야 합니다.

현재 게임은 교육용 화면 단계입니다. 실제 공격이나 외부 시스템 대상 실습 기능은 제공하지 않습니다.
