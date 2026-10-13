# 공개 배포

공개 코드는 저장소 루트이고 `main` 브랜치가 https://lemona0831.github.io/nrk/ 에 그대로 배포됩니다. 개발본 `06a2/`는 2026-10-14에 삭제했습니다(실제 게임과 저장·서버를 공유한 채 공개 주소에서 열리고 있었습니다).

테스트 사이트: https://lemona0831.github.io/nrk-test/ (저장소 `Lemona0831/nrk-test`). 만드는 법: `node tools/build-test-site.js ../nrk-test-site` 뒤 그 폴더에서 커밋·푸시. 실제 게임과 브라우저 저장소가 분리되고 계정·랭킹이 꺼진다.

공개 전의 큰 개편은 `main`이 아닌 별도 브랜치(예: `overhaul`)에서 진행하고, 시험은 테스트 사이트(저장 키 분리·클라우드 끔·검색 차단)에서 합니다. 개편이 끝나면 `main`에 합쳐 공개합니다.

게임의 HTML·JS·CSS·데이터를 바꾼 뒤에는 `node tools/stamp-release.js`를 실행합니다. 생성된 `index.html`과 `release.json`도 변경 파일과 함께 커밋합니다. `node tools/stamp-release.js --check`가 통과해야 합니다. 이 과정은 자동 업데이트 감지와 파일별 브라우저 캐시 갱신에 필요합니다. `config.js`는 수정·스테이징하지 않습니다.

시험 도구(`tools/`)는 기본으로 루트 코드를 읽습니다(`DGDIR`를 주지 않으면 `.`).

개인 기록 JSON, 이미지 시안, 점검 산출물은 사용자 요청 없이 스테이징하지 않습니다.
