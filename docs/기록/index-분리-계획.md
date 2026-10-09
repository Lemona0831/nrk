# 06a2/index.html 분리 계획 (10월 9일)

06a2/index.html은 7,600줄 한 파일이다(CSS 705줄, 스크립트 6,879줄, 글자 96만 자). 전투 화면 편집기, 화면 단순화, 직업 고침을 안전하게 하려고 파일을 나눈다. 이 문서는 **나누기 전에 할 수 있는 준비**다. 실제 나누기는 수도승 규칙 작업과 전투 UI 작업이 합쳐진 뒤에 한다. 이 브랜치는 06a2/index.html을 건드리지 않았다(도구 · 문서 · CLAUDE.md 한 줄만 바꿨다).

기준 커밋은 94926fd(main, 0.6a.2-87)다. 줄 번호는 그 커밋의 index.html 줄이다. 줄 번호는 곧 낡으므로 자를 곳은 **줄 맨 앞 표식 글자**로 적었고(tools/splitplan.js), 지도는 언제든 `node tools/splitmap.js 06a2`로 다시 뽑는다.

## 1. 한눈에

- 방식: 모듈을 쓰지 않는 평범한 스크립트(`<script src="js/NN-이름.js">`)와 `<link rel="stylesheet" href="css/NN-이름.css">`. file://와 GitHub Pages에서 지금처럼 돌고, 전역을 지금처럼 공유한다.
- 파일 수: js 30개(10 ~ 90번대), css 7개.
- **순서는 바꾸지 않는다.** 파일을 순서대로 이으면 원래 `<script>` 글자와 한 자도 다르지 않아야 하기 때문이다(3절). 그래서 "비슷한 것끼리 모으기"는 이번에 하지 않는다. 나눈 뒤에 문장 단위로 옮기는 일은 별도 작업이다(8절).
- 증명 도구: `tools/splitcheck.js`가 이은 글자가 원본과 같은지 본다. 자르는 도구는 `tools/splitsite.js`다. 둘 다 이 브랜치에서 시험을 마쳤다(10절).
- 읽는 도구: 모든 도구는 `tools/pagesrc.js`(`pageScript` · `pageData` · `pageCss`)로 스크립트를 읽는다. 한 파일이든 나눈 파일이든 같은 글자를 얻는다(9절).

## 2. 지금 index.html의 모양

| 줄 | 내용 |
| --- | --- |
| 1 ~ 7 | 머리말(title, 글꼴 링크) |
| 8 ~ 712 | `<style>` 하나. 위에서 아래로 덮어쓰는 층 |
| 713 ~ 717 | `</head><body>`, `#root` · `#live` · `#pvdesc` |
| 718 ~ 733 | `config.js`와 `data/*.js` 15개 `<script src>` |
| 734 ~ 7612 | `<script>` 하나(최상위 문장 845개). 734줄은 태그 줄이고 735줄부터 글이다 |
| 7613 ~ 7615 | `</body></html>` |

스크립트 안은 엔진이 앞(735 ~ 3965), 화면이 뒤(3966 ~ 7612)다. 다만 화면과 엔진 도우미가 섞여 있다(예: 도움말 표 HELP가 3966줄에 있고, 저장소 어댑터가 5714줄에 있고, 시험 전투 설정이 6504줄 근처에 있다).

## 3. 이어 붙인 글이 원본과 같아야 하는 까닭

나누기를 "기계적"으로 하려고 다음을 요구한다.

1. js 파일을 `<script>` 순서대로 이으면 원래 `<script>` 안쪽 글자와 **한 자도 다르지 않다**. 예외는 하나뿐이다: 둘째 파일부터 맨 앞에 `'use strict';` 한 줄을 붙이고, 비교할 때 그 줄만 뺀다. 이 줄이 없으면 둘째 파일부터 엄격 모드가 풀린다(`'use strict'`는 스크립트마다 따로 적용된다).
2. css 파일을 `<link>` 순서대로 이으면 `<style>` 안쪽 글자와 한 자도 다르지 않다(예외 없음).
3. index.html의 나머지(머리말 · body · data 태그)는 그대로이고, `<style>` 한 덩어리가 `<link>` 줄들로, `<script>` 한 덩어리가 `<script src>` 줄들로 바뀔 뿐이다.
4. js 파일 하나하나가 혼자서도 문법에 맞아야 한다(문장 한가운데를 자르지 않았다는 증거). css는 파일마다 중괄호가 맞아야 한다.

이 네 가지는 `tools/splitcheck.js`가 모두 점검하고, 어긋나면 처음 다른 곳의 파일 · 줄 · 글자를 보여 준다.

## 4. 목표 배치

```
06a2/
  index.html            머리말 + body + data 태그 + css 링크 7줄 + js 태그 30줄
  css/10-base.css ... css/70-battle-hud.css
  js/10-skills-engine.js ... js/90-boot.js
  data/*.js             그대로
```

`config.js`와 `data/*.js`는 지금처럼 먼저 읽힌다. `js/`는 그 뒤에 번호 순서로 읽힌다. 번호는 10씩 띄웠고(끼워 넣을 자리), 50번은 일부러 비웠다.

### 4.1 JS 파일 표

아래 표는 `node tools/splitmap.js 06a2 --md`가 만든 것이다(기준 커밋 94926fd). "앞 파일에서 읽음"은 이 파일이 앞 번호 파일의 이름을 읽는 수(번호×이름 수), "뒤 파일에서 읽음"은 뒤 번호 파일의 이름을 읽는 수다. 뒤 파일 것을 읽는 것은 모두 **함수 안**이라 부를 때만 일어난다(5절).

| 파일 | index.html 줄 | 줄 수 | 문장 | 이름 | 큰 이름 | 앞 파일에서 읽음 | 뒤 파일에서 읽음(부를 때) | data |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | ---: |
| `js/10-skills-engine.js` | 734-1065 | 332 | 34 | 34 | runSkill2 · genSkill · itemFits · addPoison | - | 12×25 14×1 20×15 22×5 24×6 32×6 | 9 |
| `js/12-state-class-rules.js` | 1066-1297 | 232 | 71 | 71 | elemShock · cfCleanse · elemPreview · cfTake | 10×2 | 14×3 16×1 20×14 22×1 24×3 30×1 32×4 | 5 |
| `js/14-chapter-bodies.js` | 1298-1644 | 347 | 67 | 67 | ch3Act · ch3Badge · ch3Text · ch3Tick | 10×1 12×3 | 16×2 20×7 24×3 30×3 32×1 34×2 66×1 | 23 |
| `js/16-item-effects.js` | 1645-2308 | 664 | 49 | 47 | IFX2 · IFX3 · IFX · IFX_AWK | 10×2 12×3 14×4 | 20×13 22×1 24×5 32×2 34×1 | 0 |
| `js/20-battle-state.js` | 2309-2460 | 152 | 51 | 51 | newBattle · mkPlayer · mkEnemy · mkBoss | 10×5 12×6 14×3 16×5 | 22×2 24×2 30×1 34×2 | 13 |
| `js/22-class-tree-rules.js` | 2461-2580 | 120 | 36 | 35 | chargeEv · treeWhy · unlAdd · treeFix | 20×2 | 62×3 68×1 | 10 |
| `js/24-clock-damage.js` | 2581-2916 | 336 | 25 | 25 | hurtPlayer · hurtEnemy · tickOnce · addS | 10×6 12×19 14×16 16×4 20×25 22×4 | 26×2 30×5 32×2 34×2 62×1 | 11 |
| `js/26-consumables-loot.js` | 2917-3082 | 166 | 19 | 19 | consApply · consWhyNot · consTargets · grantDrops | 10×1 12×1 14×2 20×9 24×4 | 30×1 32×2 34×1 66×1 68×1 | 6 |
| `js/30-enemy-ai.js` | 3083-3467 | 385 | 26 | 26 | enemyAct · intentText0 · intentBadge0 · decideIntent | 10×3 12×7 14×27 16×1 20×7 22×2 24×6 26×2 | 32×1 34×1 53×1 | 7 |
| `js/32-player-action.js` | 3468-3820 | 353 | 18 | 18 | playerAct · actionList · addBreak · finishPlayer | 10×18 12×25 14×5 16×2 20×22 22×3 24×14 30×2 | 34×4 | 4 |
| `js/34-rounds-setup.js` | 3821-3965 | 145 | 20 | 19 | roomBattle · scenBattle · stepWorld · roundOrder | 10×4 12×1 14×4 20×10 22×2 24×4 30×2 32×3 | - | 21 |
| `js/40-help.js` | 3966-4146 | 181 | 7 | 6 | HELP · vGuide · vHelpBody · HELPM | 12×5 14×3 20×4 22×1 | 62×2 | 14 |
| `js/42-chrome-map.js` | 4147-4282 | 136 | 15 | 15 | vRoom · menuItems · vPlayerPanel · vRunMap | 10×2 12×1 20×1 22×3 24×1 40×1 | 46×1 53×2 62×2 64×1 66×5 70×1 76×1 | 22 |
| `js/44-screens-account.js` | 4283-4556 | 274 | 40 | 40 | vDash06 · vCreate · vTitle · markKit | 10×4 20×1 22×8 26×1 40×1 | 62×7 64×8 66×3 72×1 74×4 76×1 | 25 |
| `js/46-screens-shop.js` | 4557-4733 | 177 | 35 | 35 | gambleDraw · vShop · genShop · rollSlotItem | 10×2 12×1 20×1 22×4 26×3 42×1 44×1 | 62×2 64×15 66×5 68×2 76×1 | 12 |
| `js/48-tutorial-screens.js` | 4734-4809 | 76 | 13 | 13 | vTutHub · tutSheet · vTutOffer · COACH | 34×2 | 62×3 64×1 68×1 76×2 | 3 |
| `js/52-battle-hud.js` | 4810-5025 | 216 | 18 | 18 | vBattle · consScore · vRecent · consQuick | 10×3 12×8 14×6 20×5 22×1 24×1 26×4 30×3 32×3 34×1 42×3 48×4 | 53×14 62×3 64×1 68×3 70×4 | 10 |
| `js/53-battle-parts.js` | 5026-5289 | 264 | 29 | 29 | stsHtml · previewText · skillHint0 · cfHint | 10×7 12×21 20×6 22×2 32×3 34×3 | 62×5 70×2 | 1 |
| `js/54-info-popups.js` | 5290-5549 | 260 | 20 | 20 | infoHtml · initPop · actSim · pvShow | 10×5 12×8 14×2 20×11 22×4 24×1 30×1 32×9 34×1 53×5 | 60×1 62×3 66×3 70×2 | 16 |
| `js/60-text-layer.js` | 5550-5713 | 164 | 2 | 1 | INFO2 | 12×6 14×3 40×1 53×1 54×3 | - | 7 |
| `js/62-storage-sync.js` | 5714-5913 | 200 | 37 | 37 | readAcct · initSite · vAcct · sbDb | 10×1 20×1 22×1 44×1 | 64×1 76×1 | 0 |
| `js/64-run-equipment.js` | 5914-6184 | 271 | 55 | 55 | vEquip · reviveRun · startRun · compareHtml | 10×3 12×1 20×9 22×6 26×1 34×2 44×2 46×1 62×5 | 66×4 68×2 70×1 76×2 | 12 |
| `js/66-dungeon-flow.js` | 6185-6503 | 319 | 56 | 57 | battleContinue · mkRoom · enterRoom · syncRun | 10×3 12×1 14×3 20×7 22×5 26×2 34×2 44×3 46×2 62×5 64×10 | 68×4 76×2 | 43 |
| `js/68-ui-services.js` | 6504-6626 | 123 | 23 | 23 | vTestSetup · scenNext · testRoom · scenAxes | 12×2 20×5 22×2 34×2 52×1 54×1 62×6 64×3 66×2 | 76×1 | 20 |
| `js/70-act-end-screens.js` | 6627-6766 | 140 | 24 | 24 | animate · vSurvey · doAct · vFinal | 10×2 12×2 22×2 30×1 32×3 34×2 42×1 44×1 48×1 53×1 54×1 62×4 64×6 66×1 68×3 | 72×1 76×1 | 7 |
| `js/72-skill-tree-screen.js` | 6767-6946 | 180 | 11 | 12 | sheetParts · vTreeBranch · vTreeDetail · vTreeView | 10×3 12×4 20×1 22×5 24×1 26×4 40×1 44×2 46×2 48×1 62×3 64×13 66×1 70×1 | 76×2 | 16 |
| `js/74-results-viewer.js` | 6947-7162 | 216 | 17 | 17 | vDash · aggregate · collectNotes · loadDash | 10×3 22×1 42×1 62×6 66×2 68×1 70×1 | 76×1 | 4 |
| `js/76-sound-render.js` | 7163-7330 | 168 | 23 | 23 | render · vSettings · sndSync · fitDecide | 10×1 40×1 42×3 44×7 46×3 48×2 52×1 54×2 62×3 66×1 68×1 70×6 72×1 74×2 | - | 2 |
| `js/80-events.js` | 7331-7592 | 262 | 2 | 2 | onClick · onKey | 10×2 12×4 20×3 22×8 26×3 42×1 44×7 46×8 48×4 54×3 62×8 64×15 66×24 68×10 70×3 72×1 74×5 76×10 | - | 10 |
| `js/90-boot.js` | 7593-7612 | 20 | 2 | 0 | | 42×2 44×1 52×1 54×2 62×5 64×3 66×2 68×1 70×2 72×1 74×2 76×5 80×2 | - | 0 |

(첫 파일의 시작 734는 `<script>` 태그가 있던 줄이다. 파일 맨 앞이 빈 줄이 되고 글은 735줄부터다.)

### 4.2 구역과 뜻

| 번호대 | 구역 | 파일 |
| --- | --- | --- |
| 10 ~ 16 | 엔진 데이터와 규칙: 스킬 실행, 직업 규칙 도우미, 2 · 3챕터 몸, 장비 효과 표 | 10, 12, 14, 16 |
| 20 ~ 34 | 전투 엔진: 상태 만들기, 직업 · 트리 규칙, 시계 · 피해, 소모품 · 전리품, 적 AI, 플레이어 행동, 라운드 | 20, 22, 24, 26, 30, 32, 34 |
| 40 | 도움말 표(HELP) | 40 |
| 42 ~ 48 | 화면: 헤더 · 지도, 타이틀 · 만들기 · 랭킹, 정산 · 상점, 수련장 | 42, 44, 46, 48 |
| 52 ~ 54 | **전투 화면(HUD)** | 52, 53, 54 |
| 60 | 텍스트층 IT | 60 |
| 62 | 저장 · 동기화 · 로그인 | 62 |
| 64 ~ 66 | 런 · 장비 · 던전 흐름 | 64, 66 |
| 68 ~ 74 | 화면 서비스, 행동 구동 · 끝 화면, 스킬 트리, 결과 보기 | 68, 70, 72, 74 |
| 76 | 소리 · 설정 · render | 76 |
| 80 | 이벤트 처리 | 80 |
| 90 | 시작 | 90 |

**이름이 비슷한 파일을 한곳에 모으지 못한 것**이 있다. 도움말 표(40)가 화면 쪽 한가운데에 있고, 저장소(62)가 전투 화면 뒤에 있고, 시험 전투 설정(68)이 던전 흐름 뒤에 있다. 순서를 바꾸지 않는 약속 때문이다. 8절에서 어떻게 옮길지 적었다.

### 4.3 자를 곳 표식

각 파일이 시작하는 줄의 맨 앞 글자는 tools/splitplan.js에 있다. 일부만 옮기면 다음과 같다. 전부는 `node tools/splitmap.js 06a2 --cuts`로 볼 수 있다.

| 파일 | 시작 표식 |
| --- | --- |
| 12 | `/* ================= 상태 생성 =================` |
| 14 | `/* ===== 2챕터 몸과 역할` |
| 16 | `function codexHit(b, id, key)` |
| 20 | `const fxList = p =>` |
| 22 | `/* 0.6a.2 직업 (v2: 재사용 대기 스킬, 트리, 마나 없음) */` |
| 24 | `function addS(b, u, k, dur, stacks, max) {` |
| 26 | `/* ===== 소모품 (10월 4일, data/consumables.js) =====` |
| 30 | `/* ================= 적 의도 (4.5, 규칙 기반) =================` |
| 32 | `/* ================= 플레이어 행동 (4.2) =================` |
| 34 | `/* ===== 0.6a.2 라운드` |
| 40 | `/* ===== 가이드 · 용어 사전` |
| 42 | `/* ---------- 헤더 ----------` |
| 44 | `/* ===== 타이틀 (진행 중인 캐릭터가 없으면` |
| 46 | `/* ===== 정산과 상점 (기획서 11.7절) =====` |
| 48 | `/* ===== 한 화면 전투 배치 (창 크기에 맞춤) =====` |
| 52 | `function incHtml(b) {` |
| 53 | `/* ===== 표시 규칙: T 숨기기` |
| 54 | `/* ---------- 설명 창 내용 ----------` |
| 60 | `/* ===== 텍스트 정립` |
| 62 | `/* ===== B0 화면 · 기록 · 결과 보기 =====` |
| 64 | `/* ---------- 런 ----------` |
| 66 | `/* ===== 던전과 갈림길 (기획서 11.3절) =====` |
| 68 | `/* 되묻기: confirm 문장도 조사를 고른다` |
| 70 | `/* ---------- 행동 ----------` |
| 72 | `/* ===== 0.6a.2 스킬 트리 화면` |
| 74 | `/* ---------- 결과 보기 (소유자)` |
| 76 | `/* ===== 소리: 화면에 맞는 음악` |
| 80 | `function onClick(ev) {` |
| 90 | `if (typeof document !== 'undefined') {` |

규칙: 표식은 줄 맨 앞에서 **한 곳에만** 있어야 하고, 최상위 문장 사이여야 한다. 두 작업이 합쳐진 뒤 표식이 사라졌거나 둘이 되면 `--cuts`가 알려 준다. 그때는 splitplan.js의 표식만 고친다.

### 4.4 CSS 파일

CSS는 위에서 아래로 덮어쓰는 층이 쌓인 것이라(같은 선택자가 여러 번 나온다) 순서가 뜻이다. 그래서 층 경계에서 자른다.

| 파일 | index.html 줄 | 줄 수 | 내용 | 시작 표식 |
| --- | --- | ---: | --- | --- |
| `css/10-base.css` | 8 ~ 78 | 71 | 색 · 글꼴 · 버튼 · 카드 · 막대, 첫 층의 전투 · 시트 · 알림 | (파일 맨 앞) |
| `css/20-battle-layout.css` | 79 ~ 227 | 149 | 전투 한 화면 배치(fit · 격자), 줄(lane), 행동판, 순서표, 전투 보기 | `.app{max-width:1180px}` |
| `css/30-screens.css` | 228 ~ 382 | 155 | 메모, 행동 중 표시, 캐릭터 만들기, 스킬 트리, 수련장, 설문, 소식 | `.notes{display:grid;gap:6px` |
| `css/40-sheets-dungeon-shop.css` | 383 ~ 499 | 117 | 시트(PC), 장비 창, 던전, 메뉴 막대, 타이틀, 페이지, 정산 · 상점 | `/* PC: 고르는 창과 설정 창은 화면 가운데에` |
| `css/50-phone.css` | 500 ~ 570 | 71 | 휴대폰 배치 | `/* ===== 휴대폰 (10월 2일 대폭 정리)` |
| `css/60-accessibility.css` | 571 ~ 662 | 92 | 접근성 · 가독성 1 · 2차 | `/* ===== 10월 7일 접근성 · 가독성` |
| `css/70-battle-hud.css` | 663 ~ 712 | 50 | 10월 9일 전투 UI와 휴대폰 전장 높이 | `/* ===== 10월 9일 UI: 전투 화면` |

자를 줄이 중괄호 · 주석 밖인지는 `--cuts`가 본다. 전투 화면 CSS는 20, 50, 60, 70에 흩어져 있다. 나눈 뒤 전투 화면 편집기를 만들 때 "전투 화면 층"만 한 파일로 모으는 일은 8절의 후속 작업이다(CSS는 순서가 뜻이므로 모을 때 덮어쓰는 순서를 시험해야 한다).

## 5. 전투 화면(HUD) 경계

전투 화면을 그리는 함수는 **52, 53, 54** 세 파일에 연속으로 있다(4810 ~ 5549줄). 편집기는 이 옆에 둔다.

| 파일 | 내용 | 바깥으로 내놓는 이름 |
| --- | --- | --- |
| `52-battle-hud.js` | `vBattle`(전투 화면 한 장), `vRecent` · `whyHtml`(최근 기록), `consQuick` · `consScore`(소모품 바로 쓰기), `heatHtml`, `hpPops` · `popHtml` · `incHtml`(피해 숫자 · 예상 피해), `onTip` | 다른 파일이 읽는 것: `vBattle`(76 render, 90 boot), `whyText`(68). 나머지는 모두 이 파일 안에서만 쓴다 |
| `53-battle-parts.js` | 전투 화면의 조각: 버튼 미리 보기 글(`skillHint*` · 직업별 `*Hint`), 행동 미리 보기 수(`previewAfter` · `previewText` · `myTurnsUntil`), 상태 칩(`stsHtml` · `stsWords`), 적 순번 · 생명력 막대(`enSlots` · `eordHtml` · `ehpBar`), 행동 칸 `slotHtml`, 순서표 `vOrder` | 52가 14개를 읽는다. 30(적 AI)이 `previewAfter`, 42가 `buildRes` · `stsHtml`, 54가 `cfKwHtml` · `speedWord` · `previewText` · `previewAfter` · `leftTurns`를 읽는다 |
| `54-info-popups.js` | 설명 창(`infoHtml` · `showPop` · `initPop`), 막대 위 행동 미리 보기(`actSim` · `pvShow` · `initPv`) | 60(텍스트층)이 `SDESC` · `AINFO` · `RINFO`를 덮어쓰고, 90이 `initPop` · `initPv`를 부른다 |

전투 화면이 **바깥에서** 읽는 것(편집기가 알아야 할 입력)은 `node tools/splitmap.js 06a2 --detail=52-battle`로 뽑는다. 요약:

- 상태: `G`(62), `st` · `alive` · `frontBlocked`(20), `fixJosa`, `esc`(62)
- 규칙 값: `HUNT` · `linkOn` · `wallUp`(12), `heatRise` · `queenOf` · `isCh3` · `ENRAGE`(14), `pSpeed`(24), `noFast`(34)
- 행동: `actionList` · `canTarget` · `guardOf`(32), `intentText` · `intentBadge` · `incomingEst`(30), `consTarget` · `consWhyNot`(26)
- 화면 이웃: `AGROUP` · `ASHORT` · `mbar`(42), `vTutGoal` · `vTutOver` · `vCoach`(48), `inm`(64), `focusLine` · `sbLine`(68), `shownHp` · `actTarget` · `PACE`(70)

전투 화면 쪽인데 다른 파일에 있는 것(나눈 뒤 옮길 후보, 8절): `shownHp` · `bar` · `animate` · `doAct`(70, 행동 구동), `focusLine` · `sbLine`(68), `AGROUP` · `ASHORT` · `ATIP` · `mbar` · `vPlayerPanel`(42), 수련장의 전투 위 줄 `vTutGoal` · `vTutOver` · `vCoach`(48), 설명 창 문장 덮어쓰기(60).

## 6. 불러올 때의 위험 (먼저 정의되어야 하는 것)

`node tools/splitmap.js 06a2`가 한 파일 전체를 파서(node에 들어 있는 acorn)로 읽어 계산한다. 눈으로 센 표가 아니다. 위험은 세 가지다.

| 종류 | 뜻 | 지금 순서에서 |
| --- | --- | --- |
| TDZ | 불러올 때 실행되는 코드(최상위, 바로 실행되는 함수, 불러올 때 부르는 함수 안)가 **뒤에서 정의되는 const · let · class**를 읽는다. 읽는 순간 ReferenceError | 0건 |
| VAR | 같은 일을 var로 한다. undefined를 읽는다 | 0건 |
| SPLIT | 불러올 때 실행되는 코드가 **뒤 파일의 function 선언**을 쓴다. 한 스크립트 안에서는 선언이 끌어올려져 되지만 파일이 나뉘면 안 된다 | 0건 |

그러므로 **지금 순서 그대로 자르면 위험이 없다**. 이어 붙인 글이 같으므로 당연하지만, 도구가 자를 곳을 정하는 규칙(최상위 문장 사이)도 같이 본다.

분석기는 자체 시험이 있다: `node tools/splitmap.js 06a2 --selftest`. 합성 소스에서 TDZ 4건과 VAR 1건을 잡고, 지연 호출 · 콜백 · 함수 안의 지역 이름은 잡지 않으며, 파일이 갈리면 function 선언도 SPLIT으로 잡는지 본다.

참고로 센 것: 앞 파일의 함수 안에서 뒤 파일의 이름을 읽는 곳 646곳. 부를 때만 일어나므로 안전하다. 콜백으로 뒤의 const를 읽는 곳은 0곳이다.

### 6.1 순서를 바꾸면 깨지는 곳 (고정 간선)

`node tools/splitmap.js 06a2 --order`는 불러올 때 실행되는 코드가 다른 파일에서 읽는 이름을 낸다. 이 간선이 있으면 그 두 파일의 순서를 바꿀 수 없다.

- `34-rounds-setup`(끝의 `module.exports`)이 20, 24, 30, 32, 10의 이름을 읽는다.
- `40-help`: HELP 표는 템플릿 글에 숫자를 넣으려고 `ELEM` · `MONK` · `TELE` · `CHANT` · `STAM_FLASK`(12), `ST_REGEN` · `HEAVY_V2` · `WARD` · `PARRY_BIG`(20), `EKW` · `PRIEST` · `ENRAGE`(14), `TREE_RESET`(22)을 불러올 때 읽는다. 값이 있는 파일들 **뒤**여야 한다.
- `60-text-layer`: 불러올 때 `GUIDE_STEPS`(40), `SDESC` · `AINFO` · `RINFO`(54), `CF_KW`(53), `HUNT` · `MONK` · `ELEM` · `TELE`(12), `EKW` · `PRIEST` · `SUMMON`(14)을 읽고 덮어쓴다. 40, 53, 54 **뒤**여야 한다.
- `90-boot`: 거의 모든 파일(렌더 함수 전부). 맨 끝.

**보낸 요청의 예시 순서가 안 되는 까닭:** 예시는 `50-text-layer`를 `55-help` 앞에 두었다. 텍스트층이 도움말 표의 `GUIDE_STEPS`를 불러올 때 읽으므로 그 순서면 ReferenceError가 난다(const의 TDZ). 또 도움말도 엔진 값 파일들 뒤여야 한다. 이 계획은 원래 순서를 지켜 이 문제를 피했다. 화면별 묶음(70 / 71 / 72 화면 파일)도 원래 순서대로 이어지지 않아서 이번에는 쓰지 않았다.

## 7. 나눈 뒤 알아 둘 일 (엄격 모드, 함수 끌어올림)

- 엄격 모드: 둘째 파일부터 `'use strict';` 첫 줄. 안 붙이면 그 파일은 느슨한 모드로 돌아 `this`와 암묵 전역이 달라진다. splitcheck가 이 줄이 있는지 본다.
- 함수 끌어올림: 한 스크립트 안에서는 아래쪽 function 선언을 위에서 쓸 수 있었다. 나뉘면 **다른 파일의** function은 그 파일이 읽힌 뒤에만 쓸 수 있다. 불러올 때 실행되는 코드가 뒤 파일 함수를 쓰면 SPLIT이다. 나눈 뒤 새 코드를 쓸 때 이 규칙을 지킨다: 최상위에서 바로 실행하는 코드는 80, 90번대에만 둔다.
- 전역 공유: `const` · `let` · `class`는 스크립트가 달라도 전역 렉시컬 범위를 함께 쓴다(뒤 파일에서 읽힌다). `window.이름`으로는 안 읽힌다는 점만 지금과 같다.
- 한 파일에서 던지면 그 파일의 나머지만 멈추고 다음 `<script>`는 읽힌다. 불러올 때 오류가 나면 뒤 파일들이 연쇄로 `ReferenceError`를 낸다. 처음 오류를 본다.
- 속도: 요청 30 + 7이 늘지만 모두 같은 곳에 있는 작은 정적 파일이다. GitHub Pages에서 문제가 되는 크기가 아니다. 캐시가 파일마다 따로 걸려 오히려 고칠 때 덜 내려받는다.

## 8. 나눈 뒤의 후속 (이번 증명의 범위 밖)

나누기 커밋은 **글자를 한 자도 바꾸지 않는다**. 아래는 나눈 뒤 따로 하는 일이다. 문장을 파일 사이로 옮기는 일이라 SPLIT · TDZ를 `splitmap`으로 다시 확인해야 한다.

1. 전투 화면 조각 모으기: 5절의 "전투 화면 쪽인데 다른 파일에 있는 것"을 52 ~ 54 옆으로 옮긴다.
2. 도움말 표(40)와 텍스트층(60)을 설정 · 문장 파일 쪽으로 모은다. 6.1의 간선을 지켜야 한다.
3. 전투 화면 CSS를 20, 50, 60, 70에서 모은다. 덮어쓰는 순서를 헤드리스 화면으로 비교한다.
4. `splitplan.js`의 번호대는 그대로 두고 파일을 더 쪼갤 수 있다(예: 16-item-effects를 챕터별로).

## 9. 도구 변경 (나누기 전 · 후 모두 같은 결과)

새 도구:

| 도구 | 하는 일 |
| --- | --- |
| `tools/pagesrc.js` | `pageScript(dir)` · `pageData(dir)` · `pageCss(dir)` · `pageLayout(dir)`. 한 파일이든 나눈 파일이든 같은 글자를 돌려준다. 폴더는 저장소 기준 이름이나 절대 경로 |
| `tools/splitplan.js` | 자를 곳 표식 목록(js 30, css 7) |
| `tools/splitmap.js` | 지도 · 위험 · 의존 표. `--list` `--cuts` `--md` `--detail=파일` `--names=이름` `--defs` `--order` `--selftest` |
| `tools/splitsite.js` | 계획대로 자른다(`--out=`으로 다른 폴더에 시험할 수 있다). 글자는 바꾸지 않는다 |
| `tools/splitcheck.js` | 이은 글자가 원본과 같은지 증명한다 |

고친 도구(읽는 방법만 바꿨고 나머지는 그대로):

| 도구 | 바뀐 곳 |
| --- | --- |
| `tools/extract-engine.js` | `<script>` 슬라이스 대신 `pageData` · `pageScript`. 폴더에 절대 경로도 허용 |
| `tools/dgqa.js` `loadGame` | 같음. sitqa · qa · itemcheck · item3check · ch3check · ch2check · dggen · savecheck는 dgqa 또는 `eng.gen.js`를 거치므로 따로 고칠 것이 없다 |
| `tools/docsync.js` | 같음 |
| `tools/gamblesim.js` | 같음 |
| `tools/release.py` | `js/` · `css/` 폴더가 있으면 함께 복사(next/용. 06a2는 이 도구를 쓰지 않는다) |
| `tools/smoke_site.py` | 바꾸지 않았다. file://로 페이지를 열 뿐이라 배치와 상관없다. 폴더 인자에 절대 경로도 된다 |

## 10. 증명 결과

**나누기 시험(사본):** 저장소 밖 작업 폴더에서 도구를 고친 사본을 `splitsite.js`로 제자리에서 나눈 뒤(js 30개 · css 7개) `splitcheck.js`를 돌렸다. 결과: 스크립트 745,525자 / 원본 745,525자, CSS 81,878자 / 원본 81,878자, 나머지 HTML 같음, 파일마다 문법 통과, 고아 없음. "나눔 점검 통과".

**증명이 잡아내는지(어긋나게 만든 시험 7가지):** 한 글자 바꿈, `'use strict'` 줄 빠짐, 문장 한가운데에서 자름(이은 글자는 같음), CSS 한 글자, index.html 나머지 한 글자, 연결 안 된 파일, 태그 순서 바꿈. 모두 종료 코드 1과 처음 다른 곳(파일 · 줄)을 냈다. 바꾼 것이 없으면 통과한다.

**도구가 두 배치에서 같은 결과를 내는지:** 기준은 도구를 고치기 전 사본의 결과다. 같은 시험을 (가) 도구를 고친 지금 브랜치(한 파일)와 (나) 나눈 사본에서 돌려 견주었다.

| 점검 | 한 파일(고친 도구) | 나눈 사본 |
| --- | --- | --- |
| `extract-engine.js 06a2`가 만드는 `tools/eng.gen.js` | 바이트 같음 | 바이트 같음 |
| `itemcheck.js --ch=1`(12종 `-v`) | 12/12, 실패 0 (출력은 시간 표시만 다름) | 같음 |
| `DGDIR=06a2 ch3check.js` | 41/41 | 같음(로그 같음) |
| `DGDIR=06a2 item3check.js` | 240/240 | 같음(로그 같음) |
| `CLS=assassin,warden DGDIR=06a2 dgqa.js 40` 결과 파일 | 바이트 같음 | 바이트 같음 |
| `smoke_site.py 06a2` | errs [] | errs [] (브라우저가 js/ · css/ 파일로 사이트를 열었다) |
| `docsync.js --check` | 같음 | 같음 |

`splitmap.js`는 나눈 사본에서도 같은 지도(위험 0)와 자를 곳 정상을 냈다.

## 11. index.html 글자를 읽거나 인용하는 다른 곳

| 곳 | 어떻게 읽나 | 나눈 뒤 |
| --- | --- | --- |
| tools/extract-engine.js | `<script>` 슬라이스와 `/* ===== 가이드` · `/* ===== 표시 규칙` · `/* 상태 표시` 표식 글 | `pageScript`로 이은 글에서 같은 표식을 찾는다. 이 표식 세 개는 **지우거나 바꾸지 않는다**(40번 파일 맨 앞, 53번 파일 맨 앞, 53번 안의 `/* 상태 표시`). 바꾸려면 extract-engine을 같이 고친다 |
| tools/dgqa.js, docsync.js, gamblesim.js | 정규식으로 `<script src="data/...">`와 `<script>` | pagesrc로 바꿈. 결과 같음 |
| tools/sitqa.js, qa.js 등 | dgqa `loadGame` 또는 `eng.gen.js` | 바꿀 것 없음 |
| tools/release.py | next/용. `split('<script>')[0]`로 머리말을 검사 | next/는 이번에 나누지 않는다. 나눌 때는 검사 줄만 `<script src>` 앞까지로 고친다 |
| tools/smoke_site.py, save_compat*.py, scratchpad의 Playwright 시험 | file://로 열기만 한다 | 그대로 된다 |
| tools/textnum.js, aitell.js | 파일 인자를 받는다. index.html 대신 js 파일을 준다 | 나눈 뒤에는 `06a2/js/40-help.js` 같은 파일을 직접 준다. 나누기 커밋 안에서는 파일이 새로 생겨서 `--base`로 견줄 수 없으니 splitcheck 결과를 근거로 삼는다 |
| docs/직업/*.md의 코드 기준 값 블록 | `docsync.js`가 vm으로 값을 읽는다 | 위와 같이 pagesrc를 거친다. 같음 |
| CLAUDE.md "index.html 구조" | 사람이 읽는 안내, `index.html`의 어느 부분이라는 표현이 많다 | 나누는 날 파일 이름으로 고친다(체크리스트 12절) |
| 작업 기록 문서들(docs/기록/*.md 등) | "index.html의 `함수이름`"처럼 이름으로 인용 | 이름은 그대로 유효하다. 파일 이름만 찾으려면 `node tools/splitmap.js 06a2 --names=이름` |
| docs/조사/A-기획서-대조.md, C-테스터.md | `index.html:2407`처럼 **줄 번호**를 70곳 인용 | 이미 낡은 조사 기록이다(0.6a.2-8x 이전 줄). 고치지 않고 낡은 기록으로 둔다 |
| 06a2/data/*.js 주석 | "index.html보다 먼저 읽힌다" 등 | 나눈 뒤에도 틀리지 않는다(js/보다 먼저 읽힌다). 손대지 않는다 |
| 사이트 루트의 index.html, data/ (0.6a 지인판) | 건드리지 않는다 | 06a2는 아직 루트로 내보내지 않았다. 내보낼 때 `release.py`가 js/ · css/도 복사하고, 루트의 `../config.js` 경로 치환이 `<script src>` 줄에도 먹는지 본다 |

## 12. 나누는 날의 순서

1. 두 작업(수도승 규칙, 전투 UI)이 main에 합쳐졌는지 확인하고 그 위에서 새 브랜치를 판다.
2. `node tools/splitmap.js 06a2 --cuts`. 표식이 하나라도 안 맞으면 `tools/splitplan.js`의 표식만 고친다(자르는 글자는 건드리지 않는다).
3. `node tools/splitmap.js 06a2`로 위험 0을 확인한다. 새로 생긴 오류가 있으면 그 문장이 불러올 때 뒤 정의를 읽는 것이니 고친다.
4. `git rev-parse HEAD`로 원본 리비전을 적어 둔다. `node tools/splitsite.js 06a2 --out=06a2`(제자리 나누기).
5. `node tools/splitcheck.js --orig=<그 리비전>:06a2/index.html --site=06a2`가 통과해야 한다.
6. 같은 값 점검: `node tools/extract-engine.js 06a2` 결과(tools/eng.gen.js)가 나누기 전과 같고, `PYTHONIOENCODING=utf-8 python tools/smoke_site.py 06a2`의 errs가 `[]`, `node tools/docsync.js --check`, `DGDIR=06a2 node tools/ch3check.js`(41/41), `DGDIR=06a2 node tools/item3check.js`(240/240)가 통과하고, 1챕터 던전 표본이 같은 판 결과를 낸다.
7. 헤드리스 브라우저로 전투 화면 스크린샷을 나누기 전과 나눈 뒤 한 장씩 찍어 같은지 본다(file://와 GitHub Pages 미리보기 둘 다).
8. CLAUDE.md "index.html 구조"를 파일 이름으로 고치고, 이 문서에 "나눔 완료"와 커밋을 적는다. 분리 커밋에는 **다른 변경을 섞지 않는다**.
9. 이후 새 작업은 파일 단위로 고친다. 분리 증명(splitcheck)은 그 한 커밋에만 쓴다.

## 13. 남은 위험

- 합칠 때 두 작업이 index.html 안의 표식 문장을 지우거나 바꾸면 계획의 표식이 어긋난다. `--cuts`가 알려 주고 표식만 고치면 된다.
- 두 작업 중 하나가 최상위에 **새로 바로 실행되는 코드**를 더하면 파일 경계를 넘는 읽기가 생길 수 있다. `splitmap`의 위험 목록이 잡는다(TDZ · SPLIT).
- `extract-engine.js`가 의존하는 표식 세 개(11절 표의 extract-engine 줄)는 나누고 나서도 유지해야 한다.
- 이 증명은 나누는 순간의 글자만 보장한다. 나눈 뒤 파일 사이 이동(8절)은 따로 위험을 확인해야 한다.
- 브라우저에서 실제 화면이 같은지는 스모크 시험과 스크린샷으로 본다. 이 브랜치의 시험은 분리된 사본으로 스모크 · 던전 · 장비 점검을 돌려 같음을 확인했다(10절).
- CSS 층 경계는 렌더 결과로 확인했을 뿐 의미 단위로 나눈 것이 아니다. 화면별로 CSS를 모으는 일은 8절 3번이고, 덮어쓰기 순서에 민감하다.

## 14. 나눔 완료 (10월 10일)

원본 리비전 9204966(main, 0.6a.2-91) 위에서 `splitsite.js`로 제자리에 나눴다(js 30개, css 7개). `splitcheck.js` 통과: 스크립트 758,064자와 CSS 83,901자가 원본과 같다. 작업본이 CRLF라 원본도 같은 줄바꿈으로 만들어 `--orig-file`로 견줬다.

같은 값 점검: `extract-engine` 결과 바이트 같음, `docsync` 통과, `ch3check` 41/41, `item3check` 240/240, smoke errs [], 선물 점검 19건, `dgqa`(암살자 · 수도승 · 파수꾼 × 20) 결과 파일이 나누기 전과 바이트 같음.
