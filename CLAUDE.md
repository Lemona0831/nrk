# 나락의 유산 — Claude Code 작업 안내

텍스트형 다크 판타지 턴제 ARPG다. 지금 지인 주소는 0.6a(1챕터)다. 지인과 함께 노는 개인 프로젝트이며, 지인 테스트 기록을 읽고 고치는 일을 반복한다. 사이트는 GitHub Pages(https://lemona0831.github.io/nrk/), 기록은 Supabase에 모인다.

## 주소와 개발 흐름 (10월 2일 0.6a 공개)

- 지인 주소(루트 `index.html`, `data/`, `audio/`) = 0.6a 안정판. **루트를 직접 고치지 않는다.**
- 지인 사이트(루트)를 직접 고치는 것은 만든 사람이 승인한 고침만, next/와 같은 문장으로 한다(10월 2일: 기록 내려받기, 방패병, 기다리는 캐릭터, 포기된 깬 캐릭터 되살리기). 0.6b를 공개할 때 next/가 그대로 덮으므로 next/에도 반드시 같은 고침이 있어야 한다
- 개발은 `next/`에서 한다(미리보기 https://lemona0831.github.io/nrk/next/). 지금은 0.6b(2챕터와 성장 시스템, docs/0.6b-구현계획.md, 기획서 11.12절)를 만든다. 지인에게 내보낼 때 `python tools/release.py`로 next/를 루트에 복사하고(`../` 경로를 고침), `python tools/smoke_site.py .`로 루트를 점검한 뒤 커밋한다. 내보낼 때 next/의 `VERSION`과 타이틀 표시를 맞춘다
- B0.5는 `b05/index.html`에 보관(https://lemona0831.github.io/nrk/b05/). 고치지 않는다. B0.5 기록(runs·best 등)은 저장소에 그대로 있고, B0.5 결과 보기도 b05에서 연다
- **0.6a.2 스킬 시험판은 `06a2/`**(https://lemona0831.github.io/nrk/06a2/, 10월 2일 만든 사람 요청). 모든 스킬 체계를 새로 짜기 위해 지인 주소의 0.6a를 그대로 복제한 별도 사이트다(복제 직후 자동 테스트 결과가 루트와 똑같음). 스킬 개편은 여기서 하고, 루트·next/에는 넣지 않는다. next/(0.6b)와 합칠지는 만든 사람이 정한다. 기록이 지인 주소와 섞이지 않게 브라우저 저장 키 `nrk_062_v1`, 저장소 경로 runs62·scen62·survey62, 기록판 칸 best62, 랭킹 칸 rank62를 쓴다. 설정은 `../config.js`, 음악은 루트의 `../audio/`를 함께 쓴다(루트 audio/의 파일 이름이 바뀌면 06a2/data/audio.js도 고친다). `playtest/(uid)` 문서(이름·판 수)는 지인 주소와 같은 문서를 쓴다. 구글 로그인을 쓰려면 Supabase Redirect URLs에 06a2/ 주소를 더해야 한다. 점검: `python tools/smoke_site.py 06a2`, `DGDIR=06a2 node tools/dgqa.js 20`, `node tools/extract-engine.js 06a2`
- 0.6과 B0.5는 같은 사이트라 브라우저 저장소를 함께 쓰지만 저장 키가 달라(0.6 `nrk_06_v1`) 섞이지 않는다. 구글 로그인 돌아오는 주소는 Supabase 설정의 Redirect URLs에 있어야 한다(루트와 next/)
- 계획과 진행 상황: docs/0.6a-구현계획.md. 설계: 기획서 11절. 보스·강적 상세는 저장소 밖 `../nrk-private/보스.md`(공개 저장소에 넣지 말 것)
- 보스·강적의 기믹 설명과 대처법은 공개 파일(기획서, 업데이트 내역, 게임 문장)에 쓰지 않는다. 수도원장 수치는 index.html의 `ABBOT`, 처음 만남·도감 문장은 `next/data/dungeon.js`의 `FOE_INTRO`·`CODEX`(겪은 결과만)
- `next/data/*.js`는 값(직업, 적, 아이템, 1챕터 아이템, 던전·갈림길(dungeon.js), 방, 음악, 업데이트 내역), `next/index.html`은 엔진과 화면이다. data 파일은 index.html보다 먼저 읽힌다
- 챕터 틀: 층 번호(야영지·샘·보스·하층 시작), 몬스터 레벨, 방 최대 개수 배율은 `data/dungeon.js`의 `CHAPTERS`에서만 읽는다(`chOf(ch)`, `isLower(f, ch)`, `mlvOf(f, ch)`, `floorName(f, ch)`). 층 번호를 숫자로 쓰지 않는다. 챕터별 값은 `DIFF[ch]`, `encOf`, `eventsOf`, `foesOf`, `altarsOf`, `modsOf`, `ENEMY_NAMES[ch]`, 장비 풀은 `poolsOf(ch)`
- 저장본에 새 칸을 더할 때는 `migrateRun`(index.html)에서만 채운다. `node tools/savecheck.js check`가 0.6a 저장본 56개(방 사이·전투 중·정산·상점·설문·대기)를 열어 끝까지 이어 가 본다(저장본은 `make`로 루트 코드에서 만든다, 올리지 않는다)
- next/는 B0.5와 기록이 섞이지 않게 브라우저 저장 키(nrk_06_v1), 저장소 경로(runs6·scen6·survey6), 기록판 칸(best6)을 따로 쓴다(`COL`)
- 음악: 원본은 `bgm/`(저장소 제외), 웹용은 `next/audio/`(MP3 96kbps, loudnorm -18). 곡 목록은 `next/data/audio.js`, 화면별 곡은 `musicFor()`(기획서 11.10절 표). 곡은 모두 무료 소스(만든 사람 확인). 소리·설명 창·진행 속도는 메뉴의 "설정" 창(`vSettings`)에서 바꾼다. 새 곡은 imageio-ffmpeg의 ffmpeg로 같은 설정으로 줄인다
- 화면(`G.scr`): title → create(이름·직업·스킬·능력치, `G.cre`) → run → settle → shop → survey → wait(2챕터 준비 중) / dead → survey → title. 페이지 rank·records·admin(`PAGES`, `G.back`으로 돌아감, 관리자는 주소 끝 `#admin`). 메뉴는 `menuItems()`/`vHeader()`. 이어하기는 `run.phase`(settle·shop·clearsv·wait)로 멈춘 화면에 돌아온다
- 랭킹은 저장소 `board/(uid)`의 `rank6`(`pushRank`, 정렬 `rankCmp`). 상점의 "직업에 맞는 것"은 `CLASS_FIT`(data/items.js)
- 테스트 도구는 next/를 읽는다(smoke는 `python tools/smoke_site.py .`로 루트도)

## 파일

| 파일 | 내용 |
| --- | --- |
| index.html, data/, audio/ | 지인 주소의 0.6a. next/에서 `tools/release.py`로 만든다. 직접 고치지 않는다 |
| next/ | 개발판. index.html(엔진·화면) + data/*.js(값) + audio/ |
| b05/ | B0.5 보관본(한 파일). 고치지 않는다 |
| 06a2/ | 0.6a.2 스킬 시험판. 0.6a 복제 + 스킬 개편. index.html + data/*.js (음악은 루트 audio/) |
| config.js | Supabase Project URL과 anon(공개) 키. 만든 사람이 직접 관리한다. **고치지 말 것** |
| tools/ | 자동 테스트. 아래 "테스트" 참고 |
| docs/작업기록.md | 지금까지의 결정, 현재 수치, 남은 문제 |

## index.html 구조 (스크립트 안의 표시)

- 엔진: 파일 앞부분부터 `/* ===== 가이드` 직전까지. BUILDS(직업), EXCL(직업 전용 스킬), SIG(직업 기술), ITEMS, FREE_POOL, itemFits, ROOMS, BOSSES, 전투 계산(hurtPlayer, hurtEnemy, outDmg, playerAct, genSkill)
- 표시 규칙: `/* ===== 표시 규칙` ~ `/* 상태 표시`. 예고 문장, 행동 미리보기
- 텍스트층: `const IT = {`가 있는 즉시 실행 함수. **화면에 보이는 아이템·빌드·스킬·도움말 문장은 여기서 덮어쓴다.** ITEMS 정의의 act/cost보다 이쪽이 화면에 나온다
- 저장: `initCaps`(Claude 저장소), `initSite`·`sbDb`(Supabase). 구글 로그인은 `readAcct`·`socialLogin`·`vAcctBtn`(상단 버튼)·`vAcct`(알림 카드), 결과 보기의 테스터 이름은 `testerLabel`. 경로 구조는 `playtest/<id>/runs/<판>/acts/c000`, `board/<id>`
- 업데이트 내역: `CHANGE_VER`, `CHANGELOG`

## 고칠 때 순서

1. index.html을 고친다. 수치를 바꾸면 **엔진 값, ITEMS 정의, 텍스트층(IT 등), 도움말, 업데이트 내역**을 모두 같은 값으로 맞춘다. 화면 문장과 실제 값이 어긋난 사고가 여러 번 있었다.
2. 테스트를 돌린다(아래). 이상 상태(bugs)는 반드시 0이어야 한다.
3. 균형 기준을 확인한다.
   - 여덟 직업 승률 차이 12%p 이하 (지금 72~82%)
   - 아이템별 "끼운 판 − 안 끼운 판" 승률 차이 대략 ±5%p. 아이템마다 판 수가 적어 오차가 ±2~7%p이므로, 오차를 쫓아 계속 깎지 않는다
   - 특정 빌드용 아이템(잔향의 매듭, 흉터 부적, 독 주머니, 사슬 장갑, 피의 성유, 수호의 문장)은 맞는 빌드끼리 비교한다
4. `CHANGE_VER`를 새 값으로 바꾸고 업데이트 내역(0.6은 `next/data/changelog.js`)에 적는다. 지인이 타이틀과 메뉴에서 본다. 플레이어가 읽는 글이다: 개발 단계·내부 수치(×1.3, 키 이름) 대신 "무엇이 달라졌는지"를 합니다체로 쓴다. 0.6 미리보기 동안은 새 항목을 만들지 말고 맨 위 "0.6a 미리보기" 항목의 알맞은 묶음(`groups`)에 넣거나 고치고, 타이틀 요약(`top`)은 4줄 안팎으로 유지한다. 보스·강적의 대처법은 쓰지 않는다
5. 규칙이나 수치를 바꾸면 도움말(index.html의 `HELP` 표 하나)도 맞춘다. 도움말은 이 표 하나만 쓴다(예전에 다른 곳에서 통째로 덮어써 0.6 도움말이 안 보였다)
6. 휴대폰 폭(390px)에서 전장이 가려지지 않는지 본다. 상단 버튼이 늘면 제목이 세로로 늘어나 전장이 사라진 적이 있다.
7. 커밋하고 푸시한다. 1~2분 뒤 사이트에 반영된다.

## 테스트

- `npm run qa` : 엔진 추출 → 사람 성향 테스터 6종 × 직업 8 × 보스 2 × 40판(3,840판) → 측정. 몇 분 걸린다
- `npm run qa:quick` : 960판 빠른 확인
- `npm run items` : 1챕터 아이템 풀(99종)을 여덟 직업에 끼워 효과가 실제로 일어나는지(FXHIT)와 고정 수치를 점검한다. 실패 0이어야 한다. 새 아이템 효과는 next/index.html의 `IFX` 표에, 이름·문장은 `next/data/items_ch1.js`에 둔다
- `npm run smoke` : 가짜 Supabase로 사이트 흐름 점검(Python Playwright 필요)
- `npm run dg` : 던전 자동 테스터(tools/dgqa.js). next/의 게임 코드 전체를 Node vm에서 돌려 6성향 × 8직업이 1챕터를 끝까지 간다(셋째 인자 2면 정산·상점·설문을 지나 2챕터까지: `node tools/dgqa.js 20 out.json 2`, 2챕터는 1챕터를 깬 캐릭터 기준으로 따로 낸다). `node tools/dggen.js`는 던전 생성 규칙(1만 번 × 챕터)과 8직업 강제 승리 끝까지 지나기를 점검한다. `node tools/ch2check.js`는 2챕터 적·저주·신속·방 특성·이벤트가 실제로 일어나는지 점검한다(문, 장비, 이벤트, 레벨, 쓰러지면 끝). 완주율과 쓰러진 곳(상층·하층·보스)을 낸다. 수치 시험은 `CFG='DIFF[1].upper={hp:1.3,dmg:1.4}; BOSSES.abbot.mult=7' node tools/dgqa.js 20`. 판은 고정 씨앗이라 같은 코드면 결과가 똑같다(구조만 바꾼 뒤에는 결과 파일이 같은지로 확인). `DGDIR=.`이면 루트 코드를 돌린다. 조절 값: `DIFF[챕터]`(data/dungeon.js, 상층·하층 적 배율), `BOSSES.abbot.mult`·`dmgMul`, `ENRAGE`, `TELE.heavy`(적 강타 배율), `ABBOT`
- 직접 짠 브라우저 시험(Playwright로 next/index.html을 file://로 열 때)은 반드시 `config.js`를 빈 파일로 바꿔 읽게 한다: `ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))`. 그러지 않으면 진짜 Supabase에 시험 기록과 랭킹이 쌓인다(10월 2일에 실제로 일어남)
- 테스터 한계: 아이템을 받고도 행동을 바꾸지 못하고, 한 수 앞만 본다. 막힘 해결용 아이템과 회복·방어 스킬의 진짜 가치는 사람 기록으로 판단한다

## 텍스트 기준 (기획서 8.6절)

- 안내·도움말은 합니다체, 한 문장에 한 가지. 버튼은 짧은 동작형. 전투 기록은 현재형 서술 뒤에 수치
- 분위기 한 줄은 규칙 문장과 섞지 않는다
- 줄표(—)로 문장 잇기, 괄호 부연 겹치기, 느낌표, "이(가)" 같은 괄호 조사를 쓰지 않는다. 조사는 fixJosa가 자동으로 고른다

## 절대 하지 말 것

- service_role 키, secret 키, setup.sql, 관리자 암호를 저장소에 넣지 않는다. 저장소는 Public이다
- config.js를 덮어쓰지 않는다
- 지인 기록을 지우지 않는다

## 기록 읽기

만든 사람이 결과 보기의 "전체 기록 내려받기 (JSON)"로 받은 파일을 주면 읽는다. 판마다 rooms(방별 결과), acts(행동), choices(아이템 고르기), swaps(장비 교체와 메모), survey(설문)가 있다. 사람 의견은 survey.extra, survey.issueNote, swaps[].note에 있다.

## 기획서

원본은 docs/기획서.md다. 게임 규칙이나 수치를 바꾸면 같은 작업에서 기획서의 해당 절도 함께 고친다. 예전 Claude 문서판(https://claude.ai/code/artifact/b595f7b4-c6a2-4835-9c76-9e66f3d56590)은 더 이상 기준이 아니다.
