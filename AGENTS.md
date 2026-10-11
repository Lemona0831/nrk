# 공개 배포

공개 코드는 루트, 개발본은 06a2입니다. 대응 파일을 함께 수정합니다.

게임의 HTML·JS·CSS·데이터를 바꾼 뒤에는 `node tools/stamp-release.js`를 실행합니다. 생성된 양쪽 `index.html`과 `release.json`도 변경 파일과 함께 커밋합니다. `node tools/stamp-release.js --check`가 통과해야 합니다. 이 과정은 자동 업데이트 감지와 파일별 브라우저 캐시 갱신에 필요합니다. `config.js`는 수정·스테이징하지 않습니다.

개인 기록 JSON, 이미지 시안, 점검 산출물은 사용자 요청 없이 스테이징하지 않습니다.
