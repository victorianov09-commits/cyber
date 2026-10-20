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

### 한 번만 하는 저장소 설정

1. GitHub 저장소에서 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택하세요. 이 설정은 코드 파일만으로 바뀌지 않으며 저장소 관리자 권한이 필요합니다.
2. 저장소의 **Actions** 사용이 허용되어 있는지 확인하세요.
3. PR을 `main`에 병합하세요. **Actions → Deploy to GitHub Pages**에서 성공 여부를 확인할 수 있습니다. 이미 코드가 `main`에 있다면 **Run workflow**에서 `main`을 선택하여 실행할 수도 있습니다.

배포 성공 후 주소는 https://victorianov09-commits.github.io/cyber/ 입니다. 실제 배포가 완료되기 전에는 페이지가 열리지 않을 수 있습니다.

### 자동 배포가 진행되는 방식

- `main` 대상 PR: `npm ci`로 잠금 파일에 맞게 설치하고 `npm run build`로 TypeScript 검사와 빌드를 실행합니다. PR에서는 사이트를 배포하지 않습니다.
- `main`에 push 또는 PR 병합: 같은 빌드 검사를 통과한 `dist/`를 GitHub Pages에 배포합니다.
- 수동 실행: `main`에서 **Run workflow**를 실행하면 빌드 후 배포합니다. 다른 브랜치는 빌드만 실행합니다.
- 배포 작업에만 Pages 쓰기 권한과 인증 권한을 부여합니다.

저장소 이름을 바꾸면 `vite.config.ts`의 `base`도 바꿔야 합니다.

### 배포용 화면을 로컬에서 확인하기

```sh
npm ci
npm run build
npm run preview
```

터미널에 표시되는 주소의 `/cyber/` 경로를 여세요. 게임 시작하기, 보안 아카데미, 프로젝트 소개를 눌러 이동한 뒤 각 화면에서 새로고침과 뒤로 가기를 확인하세요.

화면 주소는 `/cyber/#/missions`, `/cyber/#/academy`, `/cyber/#/about`입니다. `#` 뒤의 경로는 브라우저가 처리하므로 GitHub Pages가 별도 HTML 파일을 찾다가 404 오류를 내지 않습니다. `/cyber/academy`처럼 `#` 없이 주소를 입력하는 방식은 사용하지 않습니다.

설치 중 npm 캐시 폴더 권한 오류가 발생하는 클라우드 환경에서는 `npm ci --cache /tmp/cyber-npm-cache`로 실행할 수 있습니다.

현재 게임은 교육용 화면 단계입니다. 실제 공격이나 외부 시스템 대상 실습 기능은 제공하지 않습니다.
