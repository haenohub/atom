# 웹 주소로 바로 플레이

플레이 주소: **https://haenohub.github.io/atom/**

GitHub Pages를 처음 한 번 활성화한 뒤에는 Codespaces를 켜거나 명령어를 입력할 필요가 없다. 즐겨찾기에 저장한 플레이 주소를 열면 된다. 게임 업데이트를 GitHub의 `codex/aetherwild-v0.1.0` 브랜치에 올리면 자동 검사 → 빌드 → 같은 주소에 배포가 실행된다. 배포가 완료된 뒤 게임 페이지를 새로고침한다.

## 최초 한 번만 설정

1. 저장소 소유자 계정으로 [Settings → Pages](https://github.com/haenohub/atom/settings/pages)를 연다.
2. **Build and deployment → Source**에서 **GitHub Actions**를 선택한다.
3. [Actions → Play AETHERWILD](https://github.com/haenohub/atom/actions/workflows/pages.yml)에서 가장 최근 실행을 연다. 활성화 전에 실패한 실행이라면 **Re-run all jobs**를 누른다.
4. `build`와 `deploy`가 초록색으로 완료되면 위 플레이 주소를 연다. GitHub의 게시까지 몇 분 걸릴 수 있다.

`github-pages` 환경의 배포 브랜치 제한 때문에 실패했다면 [Settings → Environments](https://github.com/haenohub/atom/settings/environments)의 `github-pages`에서 `codex/aetherwild-v0.1.0` 브랜치를 허용한다.

## 기존 세이브 가져오기

저장은 브라우저와 주소별로 보관하므로 Codespaces의 저장이 새 주소에 자동으로 옮겨지지는 않는다. 기존 게임의 설정에서 **저장 파일 내보내기**를 누르고, 새 플레이 주소의 게임 설정에서 **저장 파일 가져오기**로 불러온다. 이 작업은 가져오려는 저장 칸마다 진행한다. 같은 플레이 주소에서는 기존 5칸 자동 저장을 계속 사용한다.

## 배포 구성

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml)은 Node.js 22에서 잠금 파일로 의존성을 설치하고 규칙 검사와 Vite 빌드를 실행한다. 검사가 실패하면 배포하지 않는다. GitHub 공식 Pages 아티팩트와 배포 액션으로 `dist`만 게시하므로 ZIP·소스·의존성 폴더는 웹에 배포하지 않는다. 문서나 다운로드 파일만 수정한 커밋은 배포를 생략한다.

Vite의 상대 경로 설정(`base: './'`)을 유지하므로 `/atom/` 하위 경로에서도 모델 재질·아이콘·초상화가 로드된다. 새 서비스 워커나 별도 캐시를 추가하지 않아 업데이트는 배포 후 새로고침으로 받는다. ZIP 실행 방식도 계속 사용할 수 있다.
