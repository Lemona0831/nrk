// 업데이트 통합판(0.7.0) 문장과 판 이름을 코드 값과 대조한다 (10월 11일, 0.7.0). tools/helpcheck.js가 읽는다.
// 값은 문장에서 베끼지 않고 게임 상수 · 데이터에서 계산한다. 숫자를 한글로 쓴 줄(일곱 장면, 여섯 직업)도 같이 닫는다.
module.exports = function (api) {
  const { E, add, note } = api; const fs = require('fs'), path = require('path');
  const S = 'changelog';
  const ent = E('CHANGELOG.find(c => c.groups)');
  const rows = [];
  (ent.top || []).forEach((t, i) => rows.push({ id: 'top:' + i, text: t }));
  ent.groups.forEach((g, gi) => g.items.forEach((t, i) => rows.push({ id: 'g' + gi + ':' + i, text: t })));
  api.source(S, rows);
  const has = (f, s) => fs.readFileSync(path.join(api.ROOT, '06a2', f), 'utf8').includes(s);

  /* ===== 판 이름: 화면에 보이는 모든 판 표시가 VERSION과 CHANGE_VER에서 나온다 ===== */
  api.source('version', [{ id: 'title', text: E('VERSION') + ' 나락의 유산' }]);
  add('version', '나락의 유산', '상수: VERSION=' + E('VERSION') + ', CHANGE_VER=' + E('CHANGE_VER') + ' (VERSION으로 시작), 타이틀 · 탭 제목 · 리모콘 제목이 VERSION',
    E => E('CHANGE_VER').startsWith(E('VERSION')) && E('VERSION') === '0.7.0' && has('index.html', '<title>나락의 유산 · ' + E('VERSION') + '</title>') && has('remote.html', '나락의 유산 ' + E('VERSION') + '</title>') && has('js/44-screens-account.js', '<span class="ver">${esc(VERSION)}</span>') && has('js/76-sound-render.js', "'나락의 유산 · ' + VERSION"));
  add(S, '0.6a의 직업과 스킬은', '판 이름(0.6a), 규칙이 아님', () => true);

  /* ===== 통합 항목의 구조 ===== */
  add(S, '챕터 1 · 2 · 3', '데이터: CHAPTERS 이름 셋(저주받은 수도원 · 잊힌 지하묘지 · 재의 사막 유적)', E => E('[1,2,3].map(c => CHAPTERS[c].n).join()') === '저주받은 수도원,잊힌 지하묘지,재의 사막 유적' && E('CHAPTERS[4]') === undefined);
  add(S, '챕터마다 24층', '상수: FLOOR_BOSS=' + E('FLOOR_BOSS') + ' (마지막 층이 보스), 챕터 셋 모두 같은 층 구조', E => E('FLOOR_BOSS') === 24 && E('[1,2,3].every(c => isLower(23, c) && !isLower(11, c) && !!BOSSES[CHAPTERS[c].boss])'));
  add(S, '직업은 암살자, 파수꾼, 사냥꾼, 원소술사, 마검사, 수도승 여섯', '데이터: CLASS_KEYS() = 여섯(숨겨진 직업 제외)', E => E('CLASS_KEYS().join()') === 'assassin,warden,hunter,elementalist,spellblade,monk' && E('ALL_CLASS_KEYS().length') > 6);
  add(S, '적이 30% 더 아프게', '상수: MODES.hard.dmg=' + E('MODES.hard.dmg') + ', 보상 loot · gold · xp > 1, 열림 조건 hardOpen(1챕터 보스)', E => E('MODES.hard.dmg') === 1.3 && E('MODES.hard.loot') > 1 && E('MODES.hard.gold') > 1 && E('MODES.hard.xp') > 1 && has('js/66-dungeon-flow.js', 'G.data.hardOpen = 1'));
  add(S, '랭킹은 일반과 따로 매깁니다', '소스: 랭킹 rmode 일반 · 가혹', E => has('js/78-records-ui.js', 'rankMode') || has('js/74-results-viewer.js', 'rankMode') || E('typeof modeTag') === 'function');
  add(S, '3챕터 보스를 이기면 표식 도전이 열립니다', '소스: markOpen()은 G.data.markOpen, 열림은 3챕터 보스 승리(markWin)', E => E('markOpen.toString()').includes('markOpen') && E('markWin.toString()').length > 0);
  add(S, '일곱 장면', '데이터: TUT.length=' + E('TUT.length'), E => E('TUT.length') === 7);
  add(S, '쿨타임으로 씁니다', '상수: EQUIP_SLOTS2=' + E('EQUIP_SLOTS2') + ' (4칸), BUILDS.assassin.v2는 마나 없음', E => E('EQUIP_SLOTS2') === 4 && !!E('BUILDS.assassin.v2') && !E('BUILDS.assassin.mp'));
  add(S, '연 스킬 중 4칸을 끼워', '상수: EQUIP_SLOTS2=' + E('EQUIP_SLOTS2'), E => E('EQUIP_SLOTS2') === 4);
  note(S, '만들 때 15점을 나누고 레벨마다 2점', '0.7.0 출시 이력. 0.7.0-5부터 능력치 지급량 3점이며 현재 도움말과 성장 시험에서 대조');
  add(S, '포인트는 만들 때 1점이고', 'TREE2 pts=1, 레벨마다 +1', E => E('Object.values(TREE2).every(T => T.pts === 1)') && E(`(() => { const run = { build: "assassin", lv: 10, tree: { pts: 0, open: [], spent: {} } }; treeFix(run); return run.tree.pts; })()`) === 0 && E(`(() => { const run = { build: "assassin", lv: 10, tree: { pts: 30, open: [], spent: {} } }; treeFix(run); return run.tree.pts; })()`) === 10);
  add(S, '순서 줄에서 차례를 미리 봅니다', '소스: 순서 줄 vOrder', E => E('typeof vOrder') === 'function');
  add(S, '능력치는 힘, 민첩, 지능, 체력, 의지 다섯입니다', '상수: STAT_KEYS=' + E('STAT_KEYS.join()') + ', STAT_START=' + E('STAT_START') + ', LV_POINTS=' + E('LV_POINTS'), E => E('STAT_KEYS.join()') === 'str,dex,int,con,wil' && E('STAT_START') === 15 && E('LV_POINTS') === 3);
  add(S, '2챕터 장비 203종과 3챕터 장비 200종', '데이터: poolOf(2).length=' + E('poolOf(2).length') + ', poolOf(3).length=' + E('poolOf(3).length'), E => E('poolOf(2).length') === 203 && E('poolOf(3).length') === 200);
  add(S, '영웅과 전설 등급은 2챕터부터', '데이터: DROP_G에 1챕터 칸이 없고 2챕터 영웅 · 전설 확률 > 0', E => E('DROP_G[1]') === undefined && E('DROP_G[2].room.h') > 0 && E('DROP_G[2].room.l') > 0);
  add(S, '2챕터부터 상점의 봉인된 꾸러미', '상수: GAMBLE.from · FATE.from · AWK.campFrom = 2', E => E('GAMBLE.from') === 2 && E('FATE.from') === 2 && E('AWK.campFrom') === 2);
  add(S, '전투 화면은 간단 · 보통 · 자세히', '상수: HUD_NAMES, HUD_DEFAULT=' + E('HUD_DEFAULT'), E => E('HUD_NAMES.join()') === 'simple,normal,full' && E('HUD_DEFAULT') === 'simple');
  add(S, '끔 · 약하게 · 보통 · 강하게 네 단계', '데이터: VFX_OPTS=' + E('VFX_OPTS.map(o => o[1]).join()'), E => E('VFX_OPTS.map(o => o[1]).join()') === '끔,약하게,보통,강하게');
  add(S, '도움말을 아홉 묶음으로', '데이터: HELP_GROUPS.length=' + E('HELP_GROUPS.length') + ', 모든 항목에 묶음', E => E('HELP_GROUPS.length') === 9 && E('HELP.every(h => HELP_GROUPS.some(g => g[0] === h.g))'));
  add(S, '마지막 층에 보스가 있습니다', '상수: FLOOR_BOSS=24', E => E('FLOOR_BOSS') === 24);
};
