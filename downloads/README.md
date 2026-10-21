# AETHERWILD v0.3 — 게임 다운로드

**[AETHERWILD-v0.3.0.zip 바로 다운로드](https://github.com/haenohub/atom/raw/refs/heads/codex/aetherwild-v0.1.0/downloads/AETHERWILD-v0.3.0.zip)**

파일 화면이 열리면 **Download raw file**(다운로드 아이콘)을 누르세요. 소스 코드, 빌드된 게임, 새 그래픽 에셋, 개발 문서, 테스트와 실행 안내가 들어 있습니다.

압축을 풀고 `aetherwild` 폴더에서 실행하세요.

```bash
bash play.sh
```

Codespaces에서는 **포트(Ports) → 5173 → 브라우저에서 열기**를 선택하세요. 포함된 빌드는 Python 3가 있으면 Node 의존성을 설치하지 않아도 실행됩니다.

같은 Codespaces에서 이전 버전을 실행 중이라면 **Ctrl+C**로 서버를 종료하고 다음을 실행하세요. 작업 중인 파일 변경이 있다면 먼저 보존하세요.

```bash
git switch codex/aetherwild-v0.1.0
git pull --ff-only
bash play.sh
```

소스 변경을 감지하면 `play.sh`가 빌드를 갱신합니다. 브라우저를 새로고침하세요. 기존 브라우저 저장 데이터는 유지됩니다.

- 전사: 좌클릭 연속 베기 / 숫자 키 스킬 모션
- NPC: 야영지에서 E로 대화 → 의뢰 수락 → 목표 달성 → 같은 NPC에게 완료 보고
- 전리품: 바닥의 주머니에 다가가 E로 획득 · 미수거 주머니는 저장
- 궁수: 숫자 키로 화살 장전 → 좌클릭을 누르고 당기기 → 놓아 발사
- 마법사: 숫자 키로 범위 선택 → 지면을 겨누고 좌클릭 확정 → 우클릭 취소

기존 v0.1/v0.2 패키지도 이 폴더에 보관합니다. v0.3 체크섬은 `AETHERWILD-v0.3.0.zip.sha256` 파일로 제공합니다.
