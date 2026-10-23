// 업데이트 통합판(0.8.0) 문장과 판 이름을 코드 값과 대조한다 (10월 11일 0.7.0, 10월 23일 M8에서 0.8.0으로). tools/helpcheck.js가 읽는다.
// 값은 문장에서 베끼지 않고 게임 상수 · 데이터에서 계산한다.
// 0.7.0 통합 항목은 지난 공개판의 기록이다. 그때의 값(24층, 쿨타임, 세 갈래 트리 …)을 적은 글이라 지금 코드와 대조하지 않고 출처 'changelog-070'으로 따로 세어 이력으로 닫는다.
module.exports = function (api) {
  const { E, add, note } = api; const fs = require('fs'), path = require('path');
  const pct = v => Math.round(v * 100);
  const S = 'changelog';
  const rowsOf = ent => { const rows = []; (ent.top || []).forEach((t, i) => rows.push({ id: 'top:' + i, text: t })); (ent.groups || []).forEach((g, gi) => g.items.forEach((t, i) => rows.push({ id: 'g' + gi + ':' + i, text: t }))); return rows; };
  api.source(S, rowsOf(E("CHANGELOG.find(c => c.v === '0.8.0')")));
  api.source('changelog-070', rowsOf(E("CHANGELOG.find(c => c.v === '0.7.0')")));
  api.noteRest('changelog-070', '이력: 0.7.0 공개판 통합 항목(그때의 값). 0.8.0에서 층 · 트리 · 자원 · 장비가 바뀌어 지금 코드와 대조하지 않는다');
  const has = (f, s) => fs.readFileSync(path.join(api.ROOT, f), 'utf8').includes(s);
  const JS = f => fs.readFileSync(path.join(api.ROOT, 'js', f), 'utf8');

  /* ===== 판 이름: 화면에 보이는 모든 판 표시가 VERSION과 CHANGE_VER에서 나온다 ===== */
  api.source('version', [{ id: 'title', text: E('VERSION') + ' 나락의 유산' }]);
  add('version', '나락의 유산', '상수: VERSION=' + E('VERSION') + ', CHANGE_VER=' + E('CHANGE_VER') + ' (맨 위 통합 항목 = VERSION), 타이틀 · 탭 제목 · 리모콘 제목이 VERSION',
    E => E('VERSION') === '0.8.0' && E('CHANGE_VER') === E('VERSION') && E('CHANGELOG[0].groups') != null && has('index.html', '<title>나락의 유산 · ' + E('VERSION') + '</title>') && has('remote.html', '나락의 유산 ' + E('VERSION') + '</title>') && has('js/44-screens-account.js', '<span class="ver">${esc(VERSION)}</span>') && has('js/76-sound-render.js', "'나락의 유산 · ' + VERSION"));

  /* ===== 0.8.0 통합 항목 ===== */
  note(S, '1막이 세 챕터로 새로 짜였습니다', '막 이름(1막). 챕터 이름 · 장치는 아래 1막 항목에서 대조');
  add(S, '저주받은 수도원, 어둠이 가라앉은 거리, 성벽 아래이고', '데이터: CHAPTERS 셋 · CH_DEVICE = 기도 · 등불 · 경보', E => E('[1,2,3].map(c => CHAPTERS[c].n).join()') === '저주받은 수도원,어둠이 가라앉은 거리,성벽 아래' && E('CHAPTERS[4]') === undefined && E('[1,2,3].map(c => CH_DEVICE[c].id).join()') === 'prayer,lamp,alarm');
  for (const f of ['0.8.0은 새로 시작합니다', '0.7.0의 캐릭터와 세이브, 계정 진행은 이어지지 않습니다']) add(S, f, '상수: RSEASON.cur=' + E("typeof RSEASON !== 'undefined' ? RSEASON.cur : ''") + ', 저장 키 SKEY=' + E('SKEY') + '(0.7.0의 nrk_062_v1은 읽지 않음, SKEY_OLD)', E => E('RSEASON.cur') === '0.8.0' && E('SKEY') !== 'nrk_062_v1' && E("SKEY_OLD.includes('nrk_062_v1')"));
  add(S, '챕터마다 16층입니다', 'FLOORS=' + E('FLOORS') + ' · PATH_AT=' + E('PATH_AT.join()') + ' · FLOOR_CAMP=' + E('FLOOR_CAMP') + ' · FLOOR_BOSS=' + E('FLOOR_BOSS'), E => E('FLOORS') === 16 && E('PATH_AT.join()') === '4,9,12' && E('FLOOR_CAMP') === 8 && E('FLOOR_BOSS') === 16);
  add(S, '4 · 9 · 12층에 갈림길', 'PATH_AT · FLOOR_CAMP · FLOOR_BOSS, 실행: fixedRoom(8)=야영지 · fixedRoom(16)=보스', E => E('PATH_AT.join()') === '4,9,12' && E('fixedRoom(FLOOR_CAMP).type') === 'camp' && E('fixedRoom(FLOOR_BOSS).type') === 'boss');
  add(S, '2고리는 1챕터 야영지, 3고리는 2챕터 야영지에서 열립니다', 'PT.ring · ringCampOpen(want = 챕터 + 1)', E => E('JSON.stringify(PT.ring)') === '{"1":0,"2":1,"3":2}' && E('ringCampOpen.toString()').includes('const want = Math.min(3, (run.ch || 1) + 1)'));
  add(S, '레벨이 오르면 패시브 포인트 2와 액티브 포인트 1을 얻습니다', 'PT.pts.lv=' + E('PT.pts.lv') + ' · AT_PTS.lv=' + E('AT_PTS.lv') + ', 소스: gainXp', E => E('PT.pts.lv') === 2 && E('AT_PTS.lv') === 1 && E('gainXp.toString()').includes('run.ptree.pts += PT.pts.lv * up; run.atree.pts += AT_PTS.lv * up;'));
  add(S, '승부수는 3고리 끝의 유산 4 스킬로, 직업마다 셋입니다', '데이터: 공개 직업마다 대사 스킬 셋, 3고리 · 유산 4 · 대가', E => E(`CLASS_KEYS().every(k => { const A = atBuild(k), L = SKILLS2[k].filter(s => s.line); return L.length === 3 && L.every(s => A.nodes[s.id] && A.nodes[s.id].ring === 3 && A.nodes[s.id].ys === 4 && !!s.pay); })`));
  add(S, '유산은 모든 스킬이 함께 쓰고 최대 5입니다', 'YUSAN.cap=' + E('YUSAN.cap') + ' · turn=' + E('YUSAN.turn') + ' · resp=' + E('YUSAN.resp'), E => E('YUSAN.cap') === 5 && E('YUSAN.turn') === 1 && E('YUSAN.resp') === 1);
  add(S, '강공격은 붕괴 40을 채웁니다', 'BRK_RULE.basic0=' + E('BRK_RULE.basic0') + ' · heavyMul=' + E('BRK_RULE.heavyMul') + ' (강공격 35 × 1.15 = 40.25, 반올림 40)', E => E('BRK_RULE.basic0') === true && Math.round(35 * E('BRK_RULE.heavyMul')) === 40 && JS('32-player-action.js').includes('* (BRK_RULE.basic0 ? BRK_RULE.heavyMul : 1)'));
  add(S, '고급은 1개, 희귀는 2개, 영웅은 2개에', 'G8GEN.afN=' + E('JSON.stringify(G8GEN.afN)') + ', 고유 등급은 희귀 · 영웅뿐, 생성 등급표에 전설 없음', E => E('JSON.stringify(G8GEN.afN)') === '{"n":0,"m":1,"r":2,"h":2}' && E('[...new Set(Object.values(UNIQUE).map(u => u.g))].sort().join()') === 'h,r' && E('[1,2,3].every(c => !G8GEN.grade[c].l)'));
  add(S, '같은 장비를 굴릴수록 값이 1.6배씩 오르고', 'G8GEN.reroll.n=' + E('G8GEN.reroll.n') + ', 소스: g8RerollWhy가 이름 있는 장비를 막는다', E => E('G8GEN.reroll.n') === 1.6 && E('g8RerollWhy.toString()').includes('it.uq ?'));
  add(S, '"전투의 첫 스킬은 유산 −1"로 바뀌었습니다', '데이터: AFFIX.ysStart(목걸이, 뒷이름 계승) 문장, 소스: ysFirst 할인 1(skCostAt)', E => E('AFFIX.ysStart.txt') === '전투의 첫 스킬은 유산 −1' && E('AFFIX.ysStart.fx.k') === 'ysFirst' && E('AFFIX.ysStart.back') === '계승' && E('AFFIX.ysStart.slot.join()') === 'amulet' && JS('17-gear8.js').includes("case 'ysFirst': sum('ysFirst', 1)"));
  add(S, '큰 각인은 찍은 곳에서 3칸 안의 자리만 제시합니다', 'PT.ksN=' + E('PT.ksN') + ', 소스: ksOfferMake가 x.d <= PT.ksN', E => E('PT.ksN') === 3 && E('ksOfferMake.toString()').includes('x.d <= PT.ksN'));
  note(S, '1막 난이도를 맞췄습니다', '막 이름(1막). 체력 배율 문장은 숫자 없이 방향만 적었다(M7-3 보고서)');
};
