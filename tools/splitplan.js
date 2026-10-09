// index.html 나누기 계획 (docs/기록/index-분리-계획.md). 자를 곳은 줄 번호가 아니라 "줄 맨 앞 글자"로 적는다.
// 다른 작업이 줄을 더하고 빼도 표식만 그대로면 계획이 살아 있다. 점검: node tools/splitmap.js 06a2 --cuts
// 규칙
//   - 파일 순서 = 지금 스크립트 순서. 이어 붙이면 원래 글이 그대로여야 하므로(tools/splitcheck.js) 순서를 바꾸지 않는다.
//   - from은 그 파일이 시작하는 줄의 맨 앞 글자. 스크립트 전체에서 줄 맨 앞에 딱 한 곳에만 있어야 한다. 첫 파일은 null.
//   - 자르는 줄은 최상위 문장 사이여야 한다(문장 한가운데 금지). CSS는 중괄호 밖이어야 한다.
//   - 둘째 파일부터 맨 앞에 `'use strict';` 한 줄이 붙는다(스크립트마다 엄격 모드가 따로이므로). tools/pagesrc.js가 붙일 때 뺀다.
module.exports = {
  script: [
    { file: 'js/10-skills-engine.js', from: null, title: '엔진 머리말, 역할, 스킬 실행(runSkill2), 마검사 · 수도승 도우미, 독, 장비 어울림', group: 'engine' },
    { file: 'js/12-state-class-rules.js', from: '/* ================= 상태 생성 =================', title: '능력치 · 시작 장비, 광역 · 상태 상수, 숨겨진 직업 셋 · 원소술사 · 수도승 규칙 도우미', group: 'engine' },
    { file: 'js/14-chapter-bodies.js', from: '/* ===== 2챕터 몸과 역할', title: '2챕터 몸과 군주, 3챕터 열기 · 강적 · 여왕, 적 행동 상수', group: 'engine' },
    { file: 'js/16-item-effects.js', from: 'function codexHit(b, id, key)', title: '장비 효과 표 IFX · IFX2 · IFX_AWK(깨달음) · IFX3 (거의 데이터)', group: 'engine' },
    { file: 'js/20-battle-state.js', from: 'const fxList = p =>', title: '장비 효과 도우미, 능력치 계산, 플레이어 · 적 · 전투 만들기, 조사, 상태 키워드', group: 'engine' },
    { file: 'js/22-class-tree-rules.js', from: '/* 0.6a.2 직업 (v2: 재사용 대기 스킬, 트리, 마나 없음) */', title: '직업 목록 · 해금 · 표식 도우미, 쿨타임, 스킬 트리 규칙(열기 · 되돌리기 · 초기화)', group: 'engine' },
    { file: 'js/24-clock-damage.js', from: 'function addS(b, u, k, dur, stacks, max) {', title: '상태 걸기, 속도 · 전역 시계 · tickOnce, 피해 처리(hurtPlayer · hurtEnemy), 처치 · 전투 끝', group: 'engine' },
    { file: 'js/26-consumables-loot.js', from: '/* ===== 소모품 (10월 4일, data/consumables.js) =====', title: '소모품 사용 · 전리품 굴리기', group: 'engine' },
    { file: 'js/30-enemy-ai.js', from: '/* ================= 적 의도 (4.5, 규칙 기반) =================', title: '적 의도(decideIntent), 예고 문장 · 아이콘, enemyAct, 수도원장', group: 'engine' },
    { file: 'js/32-player-action.js', from: '/* ================= 플레이어 행동 (4.2) =================', title: '행동 목록(actionList), 피해 계산, playerAct, 붕괴, finishPlayer', group: 'engine' },
    { file: 'js/34-rounds-setup.js', from: '/* ===== 0.6a.2 라운드', title: '라운드 순서, 전투 난수, roomBattle · scenBattle · tutBattle, endBattleCarry, module.exports', group: 'engine' },
    { file: 'js/40-help.js', from: '/* ===== 가이드 · 용어 사전', title: '도움말 표 HELP, 가이드 화면', group: 'help' },
    { file: 'js/42-chrome-map.js', from: '/* ---------- 헤더 ----------', title: '메뉴 · 헤더, 내 상태 줄, 던전 바 · 문 · 갈래길(vRunMap · vRoom)', group: 'screens' },
    { file: 'js/44-screens-account.js', from: '/* ===== 타이틀 (진행 중인 캐릭터가 없으면', title: '타이틀 · 업데이트 내역, 캐릭터 만들기, 계정 목표 · 표식, 랭킹, 기록, 관리자', group: 'screens' },
    { file: 'js/46-screens-shop.js', from: '/* ===== 정산과 상점 (기획서 11.7절) =====', title: '정산, 상점, 도박 · 운명의 저울 · 깨달음, 다음 챕터', group: 'screens' },
    { file: 'js/48-tutorial-screens.js', from: '/* ===== 한 화면 전투 배치 (창 크기에 맞춤) =====', title: '수련장 화면(목표 줄, 설명 창, 허브)', group: 'screens' },
    { file: 'js/52-battle-hud.js', from: 'function incHtml(b) {', title: '전투 화면 vBattle, 열기 칸, 피해 숫자, 최근 기록, 소모품 바로 쓰기', group: 'battle-hud' },
    { file: 'js/53-battle-parts.js', from: '/* ===== 표시 규칙: T 숨기기', title: '전투 화면 조각: 버튼 미리 보기 글, 행동 미리 보기 수, 상태 칩, 적 순번 · 생명력 막대, 행동 칸, 순서표', group: 'battle-hud' },
    { file: 'js/54-info-popups.js', from: '/* ---------- 설명 창 내용 ----------', title: '설명 창 내용 · 동작, 막대 위 행동 미리 보기', group: 'battle-hud' },
    { file: 'js/60-text-layer.js', from: '/* ===== 텍스트 정립', title: '텍스트층 IT(화면 문장 덮어쓰기), INFO2', group: 'text' },
    { file: 'js/62-storage-sync.js', from: '/* ===== B0 화면 · 기록 · 결과 보기 =====', title: '저장 상태 G, 로컬 저장, Supabase 어댑터, 구글 로그인, initCaps', group: 'storage' },
    { file: 'js/64-run-equipment.js', from: '/* ---------- 런 ----------', title: 'startRun, 장비 규칙 · 장비 창, 보스 도감, 포기 · 되살리기, 전투 저장 · 이어하기', group: 'run' },
    { file: 'js/66-dungeon-flow.js', from: '/* ===== 던전과 갈림길 (기획서 11.3절) =====', title: '던전 만들기, 문 · 방, 전리품 · 레벨, 이벤트 도우미, enterRoom · battleContinue, 기록 동기화', group: 'run' },
    { file: 'js/68-ui-services.js', from: '/* 되묻기: confirm 문장도 조사를 고른다', title: '시트 · 알림 · 낭독기, 시험 전투, 고정 상황', group: 'screens' },
    { file: 'js/70-act-end-screens.js', from: '/* ---------- 행동 ----------', title: '행동 구동(doAct · animate), 쓰러짐 · 설문 · 마무리 화면, 시트 내용', group: 'screens' },
    { file: 'js/72-skill-tree-screen.js', from: '/* ===== 0.6a.2 스킬 트리 화면', title: '스킬 트리 화면', group: 'screens' },
    { file: 'js/74-results-viewer.js', from: '/* ---------- 결과 보기 (소유자)', title: '결과 보기(관리자): 내려받기, 집계, 메모, 대시보드', group: 'admin' },
    { file: 'js/76-sound-render.js', from: '/* ===== 소리: 화면에 맞는 음악', title: '소리, 설정 창, render, 한 화면 맞춤, 초점 기억', group: 'render' },
    { file: 'js/80-events.js', from: 'function onClick(ev) {', title: '클릭 · 키 이벤트 처리', group: 'events' },
    { file: 'js/90-boot.js', from: "if (typeof document !== 'undefined') {", title: '시작(이벤트 연결, 첫 render, initCaps), 시험용 내보내기', group: 'boot' },
  ],
  // CSS: 위에서 아래로 덮어쓰는 층이라 순서가 곧 뜻이다. 한 파일에 같은 층의 규칙이 모이게 자른다.
  css: [
    { file: 'css/10-base.css', from: null, title: '바탕: 색 · 글꼴 · 버튼 · 카드 · 막대, 첫 층의 전투 · 시트 · 알림 규칙' },
    { file: 'css/20-battle-layout.css', from: '.app{max-width:1180px}', title: '전투 한 화면 배치(fit · 격자), 줄(lane), 행동판, 순서표, 전투 보기' },
    { file: 'css/30-screens.css', from: '.notes{display:grid;gap:6px', title: '메모, 행동 중 표시, 캐릭터 만들기 · 스킬 칸, 스킬 트리, 수련장, 설문, 소식 · 내역' },
    { file: 'css/40-sheets-dungeon-shop.css', from: '/* PC: 고르는 창과 설정 창은 화면 가운데에', title: '시트(PC), 장비 창, 던전 바 · 문, 메뉴 막대, 타이틀, 캐릭터 만들기, 페이지, 정산 · 상점' },
    { file: 'css/50-phone.css', from: '/* ===== 휴대폰 (10월 2일 대폭 정리)', title: '휴대폰 배치(전투 한 화면 + 아래 행동판)' },
    { file: 'css/60-accessibility.css', from: '/* ===== 10월 7일 접근성 · 가독성', title: '접근성 · 가독성 1차 · 2차 (글자 크기, 미리 보기 무늬, 움직임 줄이기)' },
    { file: 'css/70-battle-hud.css', from: '/* ===== 10월 9일 UI: 전투 화면', title: '10월 9일 전투 화면 UI(미리 보기 · 최근 기록 · 소모품 줄), 휴대폰 전장 높이' },
  ],
};
