'use strict';
/* 0.8.0 2단계 트리 엔진 점검 (10월 16일). 실행: node tools/tree-check.js
   1 스키마(9직업 패시브 · 액티브: 양방향 연결, 시작에서 닿음, 고리 잠금 안에서 이어짐, 고아 없음, 비용, 효과 키) · 2 마검사 트리가 1단계 문서 7 · 8절과 같음 ·
   3 찍기 규칙 · 4 능력치 · 5 큰 각인(거리 N, 동점 규칙, 길 덤, 때: 1 · 2챕터 정산, 3챕터 야영지) · 6 강화 금지선과 조건부 할인 · 7 상점 되돌리기 · 8 경험치 곡선 · 9 옛 세이브 옮기기(9-5 + 10-4 단계 잠금 · 확정 저장) */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const PT = R_('PT'), LV_XP = R_('LV_XP'), IFX_NODE = R_('IFX_NODE'), IFX_AWK = R_('IFX_AWK'), KS_LIST = R_('KS_LIST'), PT_TILT = R_('PT_TILT'), AT_PTS = R_('AT_PTS'), MARK_START = R_('MARK_START'), FLOOR_CAMP = R_('FLOOR_CAMP'), TREE_RESET = R_('TREE_RESET');
const f = name => R_(name); const ptWhy = f('ptWhy'), atWhy = f('atWhy'), ptOpenIds = f('ptOpenIds'), ringOpen = f('ringOpen'), ksInfo = f('ksInfo'), ptResetCost = f('ptResetCost'), atResetCost = f('atResetCost'), ysCapOf = f('ysCapOf');
const CLS = Object.keys(E.BUILDS).filter(k => !E.BUILDS[k].tut && E.BUILDS[k].v2);
const bfs = (T, from, okNode) => { const d = { [from]: 0 }, q = [from]; while (q.length) { const x = q.shift(); for (const y of T.nodes[x].links) if (d[y] == null && (!okNode || okNode(T.nodes[y]))) { d[y] = d[x] + 1; q.push(y); } } return d; };
const G = E.__G;
function newRun(build, o) { G.data = E.blankData(); G.data.unlAll = 1; G.cre = Object.assign({ name: 't' }, o || {}); G.dropQ = []; G.b = null; G.sheet = null; E.startRun(build); const run = G.run; delete run.alloc; G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run'; return run; }

// ===== 1) 스키마: 9직업 =====
for (const c of CLS) {
  const P = E.ptBuild(c), A = E.atBuild(c), ids = Object.keys(P.nodes);
  for (const T of [P, A]) for (const id in T.nodes) { const x = T.nodes[id]; for (const y of x.links) { assert(T.nodes[y], c + ' ' + id + ' → 없는 ' + y); assert(T.nodes[y].links.includes(id), c + ' 한쪽 연결 ' + id + '-' + y); } if (id !== 'S') assert(x.links.length > 0, c + ' 고아 ' + id); }
  ok(true, c + ': 연결이 모두 양방향, 고아 없음');
  for (const T of [P, A]) { const d = bfs(T, 'S'); assert.equal(Object.keys(d).length, Object.keys(T.nodes).length, c + ' 시작에서 닿지 않는 노드'); for (const k of [1, 2, 3]) { const dk = bfs(T, 'S', nd => nd.ring <= k); for (const id in T.nodes) if (T.nodes[id].ring <= k) assert(dk[id] != null, c + ' ' + id + ' 고리 ' + k + ' 안에서 이어지지 않음'); } }
  ok(true, c + ': 모든 노드가 시작에서 닿고, 고리 k 노드는 고리 k 이하만 지나 닿음');
  const kinds = ids.reduce((m, id) => (m[P.nodes[id].kind] = (m[P.nodes[id].kind] || 0) + 1, m), {});
  ok(kinds.start === 1 && kinds.keystone === 12 && kinds.small + kinds.notable === 90, c + ': 패시브 일반 90 + 큰 각인 자리 12 + 시작 1');
  const dist = bfs(P, 'S'); const W = { '1C': 1, '2L': 2, '2R': 2, '3L': 3, '3R': 3, '4L': 4, '4R': 4, K5: 5, '5L': 5, '5R': 5, '6L': 6, '6R': 6, '7L': 7, '7R': 7, '8L': 8, '8R': 8, K9: 9 };
  for (const d of PT.dirs) for (const pos in W) { assert.equal(dist[d + pos], W[pos], c + ' 거리 ' + d + pos); const nd = P.nodes[d + pos]; assert.equal(nd.ring, pos[0] === 'K' ? (pos === 'K5' ? 2 : 3) : (+pos[0] <= 3 ? 1 : +pos[0] <= 6 ? 2 : 3), c + ' 고리 ' + d + pos); }
  ok(true, c + ': 시작에서의 거리 · 고리 표(2-3)');
  for (const id of ids) { const nd = P.nodes[id]; if (nd.kind === 'keystone') assert(nd.cost === 0 && IFX_NODE[nd.fx] && KS_LIST[nd.fx], c + ' 큰 각인 ' + id); else if (nd.kind !== 'start') assert(nd.cost === 1, c + ' 비용 ' + id); if (nd.kind === 'notable') assert(IFX_NODE[nd.fx] || IFX_AWK[nd.fx], c + ' 효과 키 ' + nd.fx); if (nd.kind === 'small') assert(nd.stat || nd.sm, c + ' 작은 노드 ' + id); }
  const fx = ids.map(id => P.nodes[id].fx).filter(Boolean); ok(new Set(fx).size === fx.length, c + ': 같은 효과는 트리에 한 번');
  ok(fx.filter(k => KS_LIST[k] && KS_LIST[k].resp).length <= 2, c + ': 대응 충전을 바꾸는 큰 각인은 둘까지(4-3)');
  ok(!fx.some(k => ['a_purse', 'a_memory', 'a_flow'].includes(k)), c + ': 빠진 옛 각인(불룩한 주머니 · 샘의 기억 · 흘림새 각인)이 없음');
  const st = Object.values(P.nodes.S.stat).reduce((a, v) => a + v, 0); ok(st === 12, c + ': 시작 노드 능력치 12');
  const tilt = PT_TILT[c]; for (const d of PT.dirs) { const first = Math.min(...['1C', '2L', '2R', '3L', '3R'].filter(p => P.nodes[d + p].kind === 'notable').map(p => dist[d + p])); const want = { A: 1, B: 2, C: 3 }[tilt[d]]; if (!P.tmp) assert.equal(first, want, c + ' 기울기 ' + d); else assert(first === Infinity || first >= want, c + ' 임시 기울기 ' + d); }
  ok(true, c + ': 기울기(첫 중간 노드까지 거리) ' + (P.tmp ? '임시 트리는 그 거리보다 가깝지 않음' : '표대로'));
  for (const id in A.nodes) { const nd = A.nodes[id]; if (nd.kind === 'start') continue; assert(nd.cost === 1 && [1, 2, 3].includes(nd.ring), c + ' 액티브 ' + id); if (nd.kind === 'skill') assert(E.SK2[id] && !E.SK2[id].start, c + ' 스킬 ' + id); else { assert(nd.links.includes(nd.on) && A.nodes[nd.on].kind === 'skill', c + ' 강화가 그 스킬과 이웃 ' + id); } if (nd.links.includes('S')) assert.equal(nd.ring, 1, c + ' 가운데 이웃은 1고리 ' + id); }
  ok(true, c + ': 액티브 노드(스킬은 지금 칸, 강화는 그 스킬과 이웃, 비용 1)');
  ok(!!P.tmp === (c !== 'spellblade') && !!A.tmp === (c !== 'spellblade'), c + ': 임시 트리 표시(tmp)는 마검사만 없음');
}

// ===== 2) 마검사 = 1단계 문서 7 · 8절 =====
{ const P = E.ptBuild('spellblade'), A = E.atBuild('spellblade'); const nm = id => P.nodes[id].n;
  const W7 = { pw2L: '피 맛', pw3R: '밴 불씨', pw5L: '벼린 눈', pw5R: '교대의 칼끝', pw7L: '흩는 손', pw7R: '마무리 칼', ct2L: '박자 끊기', ct3R: '예고 깨기', ct5L: '균열 읽기', ct5R: '무너진 틈', ct7L: '무거운 손', ct7R: '흐트러진 자세',
    ag2L: '흘린 칼끝', ag3R: '가벼운 칼', ag5L: '각오', ag5R: '먼 주문', ag7L: '가벼운 걸음', ag7R: '단숨', lg1C: '교대의 박자', lg3L: '칼에 새긴 주문', lg5L: '넘친 숨', lg5R: '세 박자', lg7L: '가득 찬 그릇', lg7R: '마력 순환',
    su2L: '겹친 갑주', su3R: '남는 마력', su5L: '승전의 숨', su5R: '두꺼운 주문 방패', su7L: '남는 온기', su7R: '피의 갑주', sv3L: '마력 갑주', sv5L: '질긴 살갗', sv5R: '보호막 아래', sv7L: '쇠 같은 몸', sv7R: '버티는 이' };
  for (const id in W7) assert.equal(nm(id), W7[id], '7-4 ' + id); const nts = Object.values(P.nodes).filter(x => x.kind === 'notable'); ok(nts.length === 35 && nts.every(x => W7[x.id]), '마검사 중간 노드 35개가 7-4 표와 같음');
  const K7 = { pwK5: '결정의 칼', pwK9: '마검 과부하', ctK5: '망치의 길', ctK9: '끊는 박자', agK5: '먼저 움직임', agK9: '흘림새', lgK5: '깊은 샘', lgK9: '넘치는 그릇', suK5: '피의 순환', suK9: '피를 두른 갑주', svK5: '철벽', svK9: '무거운 갑주' };
  for (const id in K7) assert.equal(nm(id), K7[id], '큰 각인 ' + id); ok(Object.values(P.nodes).filter(x => x.kind === 'keystone' && x.pay).length === 4, '큰 각인 12, 대가 있는 것 4');
  ok(P.nodes.pw2L.stat == null && P.nodes.pw2R.stat.int === 2 && P.nodes.pw3L.stat.str === 2 && P.nodes.pw1C.stat.str === 1 && P.nodes.pw1C.stat.int === 1 && P.nodes.ct1C.sm === 'brk' && P.nodes.lg2L.sm === 'st' && P.nodes.sv1C.stat.con === 2 && P.nodes.su1C.stat.wil === 2 && P.nodes.ag1C.stat.dex === 2, '작은 노드: 화력 L 힘 · R 지능 · C 힘1 지능1, 제어 붕괴, 계승 스태미나, 생존 체력, 유지력 의지, 기민 민첩');
  ok(JSON.stringify(P.nodes.S.stat) === JSON.stringify({ str: 4, int: 4, con: 3, wil: 1 }), '시작 노드 힘4 지능4 체력3 의지1');
  const S8 = [['sb_bleedcut', '혈인', 2, 1, 1, 'C', ['S', 'sb_boil', 'sb_bloodmark', 'sbu_chain', 'sbu_graze']], ['sb_boil', '혈인', 2, 1, 2, 'L', ['sb_bleedcut', 'sb_taste', 'sbu_boil']], ['sb_bloodmark', '혈인', 3, 1, 2, 'R', ['sb_bleedcut', 'sb_redwind', 'sbu_scarlet']],
    ['sb_taste', '혈인', 2, 2, 3, 'L', ['sb_boil', 'sb_whirl', 'sbu_thirst']], ['sb_redwind', '혈인', 3, 2, 3, 'R', ['sb_bloodmark', 'sb_deluge', 'sbu_gale']], ['sb_whirl', '혈인', 2, 2, 4, 'L', ['sb_taste', 'sb_deluge', 'sbu_exec']], ['sb_deluge', '혈인', 4, 3, 5, 'C', ['sb_redwind', 'sb_whirl', 'sbu_fog']],
    ['sb_ember', '염검', 2, 1, 1, 'C', ['S', 'sb_kindle', 'sb_char', 'sb_snuff', 'sbu_flare', 'sbu_brand']], ['sb_kindle', '염검', 2, 1, 2, 'L', ['sb_ember', 'sb_heated', 'sbu_whet']], ['sb_char', '염검', 2, 1, 2, 'R', ['sb_ember', 'sb_tome', 'sbu_ash']],
    ['sb_heated', '염검', 2, 2, 3, 'L', ['sb_kindle', 'sbu_rush']], ['sb_snuff', '염검', 3, 2, 3, 'C', ['sb_ember', 'sb_hellfire', 'sbu_coil']], ['sb_tome', '염검', 3, 2, 3, 'R', ['sb_char', 'sb_hellfire', 'sbu_chainf']], ['sb_hellfire', '염검', 4, 3, 5, 'C', ['sb_snuff', 'sb_tome', 'sbu_firefall']],
    ['sb_bladeward', '마갑', 2, 1, 1, 'C', ['S', 'sb_bolt', 'sb_unravel', 'sb_turn', 'sbu_counter']], ['sb_bolt', '마갑', 2, 1, 2, 'L', ['sb_bladeward', 'sb_shell', 'sb_rebound', 'sbu_barrage']], ['sb_unravel', '마갑', 2, 1, 2, 'R', ['sb_bladeward', 'sb_sunder']],
    ['sb_turn', '마갑', 2, 2, 3, 'C', ['sb_bladeward', 'sb_finale', 'sbu_rhythm', 'sbu_coda']], ['sb_shell', '마갑', 3, 2, 3, 'LL', ['sb_bolt']], ['sb_rebound', '마갑', 2, 2, 3, 'L', ['sb_bolt', 'sbu_twin']], ['sb_sunder', '마갑', 2, 2, 3, 'R', ['sb_unravel', 'sb_finale', 'sbu_measure']], ['sb_finale', '마갑', 4, 3, 5, 'C', ['sb_turn', 'sb_sunder', 'sbu_release']]];
  for (const [id, br, ys, ring, r, lane, ln] of S8) { const x = A.nodes[id]; assert(x && x.kind === 'skill' && x.br === br && x.ys === ys && x.ring === ring && x.pos.r === r && x.pos.lane === lane, '8-2 ' + id); assert.equal(JSON.stringify(x.links.slice().sort()), JSON.stringify(ln.slice().sort()), '8-2 이웃 ' + id); assert.equal(E.skCost(E.SK2[id]), ys, '유산 비용이 skCost 기준표와 같음 ' + id); }
  ok(true, '마검사 스킬 노드 22개: 갈래 · 유산 · 고리 · 자리 · 이웃이 8-2 표와 같음');
  const U8 = [['sbu_chain', 'sb_bleedcut', 1, 1, 'LL'], ['sbu_graze', 'sb_bleedcut', 1, 1, 'RR'], ['sbu_boil', 'sb_boil', 2, 3, 'LL'], ['sbu_scarlet', 'sb_bloodmark', 3, 5, 'RR'], ['sbu_thirst', 'sb_taste', 3, 5, 'LL'], ['sbu_gale', 'sb_redwind', 2, 4, 'RR'], ['sbu_exec', 'sb_whirl', 2, 4, 'LL'], ['sbu_fog', 'sb_deluge', 3, 6, 'C'],
    ['sbu_flare', 'sb_ember', 1, 1, 'LL'], ['sbu_brand', 'sb_ember', 1, 1, 'RR'], ['sbu_whet', 'sb_kindle', 3, 5, 'LL'], ['sbu_ash', 'sb_char', 2, 3, 'RR'], ['sbu_rush', 'sb_heated', 2, 4, 'LL'], ['sbu_coil', 'sb_snuff', 2, 4, 'C'], ['sbu_chainf', 'sb_tome', 2, 4, 'RR'], ['sbu_firefall', 'sb_hellfire', 3, 6, 'C'],
    ['sbu_counter', 'sb_bladeward', 1, 1, 'LL'], ['sbu_barrage', 'sb_bolt', 2, 4, 'LL'], ['sbu_twin', 'sb_rebound', 2, 4, 'L'], ['sbu_measure', 'sb_sunder', 2, 4, 'R'], ['sbu_rhythm', 'sb_turn', 2, 4, 'C'], ['sbu_coda', 'sb_turn', 3, 5, 'L'], ['sbu_release', 'sb_finale', 3, 6, 'C']];
  for (const [id, on, ring, r, lane] of U8) { const x = A.nodes[id]; assert(x && x.kind === 'upgrade' && x.on === on && x.ring === ring && x.pos.r === r && x.pos.lane === lane, '8-3 ' + id); }
  ok(Object.keys(A.nodes).length === 46, '마검사 액티브 45노드 + 가운데');
  const rc = [1, 2, 3].map(k => Object.values(A.nodes).filter(x => x.ring === k && x.kind !== 'start').length); ok(rc.join() === '14,21,10', '고리별 14 · 21 · 10 (' + rc + ')');
  const yc = [2, 3, 4].map(k => S8.filter(x => x[2] === k).length); ok(yc.join() === '14,5,3', '유산 2 · 3 · 4 = 14 · 5 · 3 (8-2 표 그대로. 문서 아래 줄의 "15 · 4 · 3" 합계는 표와 맞지 않는다)');
  const br = ['혈인', '염검', '마갑'].map(b => [Object.values(A.nodes).filter(x => x.br === b && x.kind === 'skill').length, Object.values(A.nodes).filter(x => x.br === b && x.kind === 'upgrade').length].join('+')); ok(br.join() === '7+8,7+8,8+7', '갈래 혈인 7+8 · 염검 7+8 · 마갑 8+7');
}

// ===== 3) 찍기 규칙 =====
{ const run = newRun('spellblade'); const T = E.ptBuild('spellblade');
  ok(run.tv === 2 && run.ptree.pts === 6 && run.atree.pts === 1 && run.ptree.own.length === 0, '새 캐릭터: 트리 판 2, 패시브 6 · 액티브 1');
  ok(!ptWhy(run, 'lg1C') && ptWhy(run, 'lg2L') === '이웃한 노드를 먼저 열어야 합니다', '시작 이웃은 찍고, 떨어진 노드는 못 찍음');
  ok(/챕터 보상/.test(ptWhy(run, 'lgK5')), '큰 각인 자리는 포인트로 못 찍음');
  for (const id of ['lg1C', 'lg2L', 'lg3L']) assert.equal(E.ptBuy(run, id), null, id); ok(/2고리/.test(ptWhy(run, 'lg4L')), '2고리는 1챕터 보스 전에 잠김');
  run.clears = 1; ok(!ptWhy(run, 'lg4L'), '1챕터를 깨면 2고리'); run.clears = 0; run.markCh = 2; ok(!ptWhy(run, 'lg4L'), '표식 도전 2챕터 시작은 1챕터를 깬 것으로 침'); delete run.markCh;
  ok(run.ptree.pts === 3, '찍으면 포인트가 준다'); for (const id of ['pw1C', 'pw2L', 'pw2R']) E.ptBuy(run, id); ok(run.ptree.pts === 0 && ptWhy(run, 'pw3L') === '포인트가 없습니다', '포인트가 없으면 못 찍음');
  ok(/패시브 단계에서만/.test(E.ptRefund(run, 'pw2R')), '배분 흐름 밖에서는 한 칸 되돌리기가 없음');
  run.alloc = { mode: 'create', step: 'p' }; ok(/이어져/.test(E.ptRefund(run, 'lg2L')), '되돌리면 끊기는 노드는 못 되돌림'); ok(E.ptRefund(run, 'lg3L') === null && run.ptree.pts === 1, '끝 노드는 되돌림 · 포인트 +1'); delete run.alloc;
  ok(!atWhy(run, 'sb_bleedcut') && atWhy(run, 'sb_boil') === '이웃한 노드를 먼저 열어야 합니다', '액티브도 이웃 규칙');
  E.atBuy(run, 'sb_bleedcut'); ok(run.atree.pts === 0 && run.skills.includes('sb_bleedcut') && run.p.skills.includes('sb_bleedcut'), '연 스킬은 빈 칸에 장착'); run.atree.pts = 3; E.atBuy(run, 'sb_boil'); ok(/2고리/.test(atWhy(run, 'sb_taste')), '액티브 2고리 잠금');
  E.atBuy(run, 'sbu_graze'); ok(run.p.aup.includes('sbu_graze') && E.skOf(run.p, 'sb_bleedcut').time === 'fast', '강화는 끼운 스킬에 적용');
  E.atEquip(run, 'sb_bleedcut'); ok(!run.p.aup.includes('sbu_graze') && E.skOf(run.p, 'sb_bleedcut').time === 'normal', '스킬을 빼면 강화는 일하지 않음');
  ok(E.v2Equip(run).length === 3, '장착 = 시작 둘 + 끼운 스킬'); run.atree.own.push('sb_bloodmark', 'sb_ember', 'sb_bladeward', 'sb_kindle'); for (const id of ['sb_bleedcut', 'sb_bloodmark', 'sb_ember', 'sb_bladeward']) if (!run.skills.includes(id)) E.atEquip(run, id); ok(/가득/.test(E.atEquip(run, 'sb_kindle')), '장착은 4칸(시작 2 + 4 = 6)'); ok(E.v2Equip(run).length === 6, '6칸');
}
// ===== 4) 능력치 = 노드 합 =====
{ const run = newRun('spellblade'); const p = run.p; const hp0 = p.hpMax, st0 = p.stMax;
  ok(JSON.stringify(run.stats) === JSON.stringify({ str: 4, dex: 0, int: 4, con: 3, wil: 1 }) && E.stat(p, 'str') === 4, '시작 능력치 = 시작 노드');
  E.ptBuy(run, 'sv1C'); ok(run.stats.con === 5 && p.hpMax === hp0 + 6, '체력 +2 → 생명력 +6');
  E.ptBuy(run, 'lg1C'); E.ptBuy(run, 'lg2L'); ok(p.stMax === st0 + 6 && E.fxStat(p, 'st') === 6, '계승 작은 노드 스태미나 +6');
  E.ptBuy(run, 'ct1C'); ok(Math.abs(E.fxMul(p, 'brkMul', {}, p, {}, null) - 1.03) < 1e-9, '제어 작은 노드 붕괴 ×1.03');
  ok(p.pn.includes('n_sb_altbeat'), '중간 노드 효과가 p.pn으로 fxList에 들어감');
  E.ptBuy(run, 'pw1C'); E.ptBuy(run, 'pw2R'); ok(run.stats.str === 5 && run.stats.int === 7, '화력 C1 힘1 지능1, R2 지능 2');
  const run2 = newRun('hunter'); E.ptBuy(run2, 'pw1C'); E.ptBuy(run2, 'pw2L'); ok(run2.stats.dex === 7, '사냥꾼 화력 작은 노드는 공격 능력치(민첩)');
}
// ===== 5) 큰 각인 =====
{ const run = newRun('spellblade'); run.lv = 6; E.ptFix(run); run.clears = 1; run.seed = 77; run.ch = 1;
  for (const id of ['lg1C', 'lg2L', 'lg3L', 'pw1C', 'pw2R', 'pw3R', 'su1C', 'su2L', 'ct1C', 'ct2L']) assert.equal(E.ptBuy(run, id), null, id);
  ok(E.ksGrant(run, 'b1') && !E.ksGrant(run, 'b1') && run.ksPending === 1, '같은 때는 한 번만 준다');
  const off = E.ksEnsureOffer(run); const C = off.map(id => ksInfo(run, id)); ok(off.length === 3, '셋을 보인다');
  ok(C.every(c => c.d <= PT.ksN), '모두 3칸 안: ' + C.map(c => c.id + ':' + c.d).join(' '));
  ok(new Set(C.map(c => c.dir)).size === 3, '셋은 서로 다른 방향');
  ok(C[0].d <= C[1].d && C[1].d <= C[2].d, '거리 오름차순'); ok(JSON.stringify(E.ksOfferMake(run)) === JSON.stringify(off), '같은 시드면 같은 셋');
  ok(off.includes('lgK5') && off.includes('pwK5'), 'L3 · R3에서 2칸인 계승 · 화력 K5가 들어감');
  const pick = off[0], info = ksInfo(run, pick); const open0 = ptOpenIds(run).length;
  ok(E.ksTake(run, pick) === null && run.ptree.ks.includes(pick) && info.path.every(x => run.ptree.free.includes(x) || ptOpenIds(run).includes(x)) && ptOpenIds(run).length === open0 + 1 + info.path.length, '고르면 최단 길이 덤으로 열림(' + info.path.join(',') + ')');
  ok(run.ksPending === 0 && run.ksOffer === null && run.ptree.pts === 6, '받을 것 0, 포인트는 쓰지 않음(16 − 10)');
  const P = E.ptBuild('spellblade'); const d = (() => { const dd = {}; for (const x of ptOpenIds(run)) dd[x] = 0; const q = ptOpenIds(run).slice(); while (q.length) { const x = q.shift(); if (P.nodes[x].kind === 'keystone' && !ptOpenIds(run).includes(x)) continue; for (const y of P.nodes[x].links) if (dd[y] == null && ringOpen(run, P.nodes[y].ring)) { dd[y] = dd[x] + 1; q.push(y); } } return dd; })();
  ok(E.ksCands(run).every(c => c.d === d[c.id] && c.path.length === c.d - 1), '거리는 열린 노드 전체에서의 최단 칸 수, 길은 거리 − 1칸');
  // 3칸 안이 모자라면 4칸 이상으로 채운다: 시작 노드만 연 캐릭터
  const r2 = newRun('spellblade'); r2.clears = 1; E.ksGrant(r2, 'b1'); const o2 = E.ksEnsureOffer(r2); ok(o2.length === 3 && o2.every(id => ksInfo(r2, id).d === 5), '찍은 곳이 없어도 셋(거리 5)');
  ok(E.ksCands(r2).every(c => P.nodes[c.id].ring === 2), '닫힌 고리의 자리는 후보가 아님');
}
// 때: 1 · 2챕터 정산 뒤, 3챕터 야영지 (흐름)
{ const run = newRun('warden'); R_('ask = () => true');
  run.phase = 'settle'; run.ch = 1; run.clears = 1; E.startSettle(run); G.scr = 'settle'; D.click('settleok'); ok(run.ksGot.b1 && run.ksPending === 1 && G.sheet && G.sheet.kind === 'ks', '1챕터 정산을 확정하면 큰 각인 창');
  D.click('kspick', run.ksOffer[0]); ok(run.ptree.ks.length === 1 && !G.sheet, '고르면 창이 닫힘');
  run.ch = 3; run.room = FLOOR_CAMP - 1; run.cur = null; E.advanceFloor(); ok(run.ksGot.c3 && run.ksPending === 1, '3챕터 야영지에 들어서면 하나 더'); G.sheet = null; G.b = null; G.dropQ = []; E.nextDrop(); ok(G.sheet && G.sheet.kind === 'ks', '전리품을 다 받으면 큰 각인 창이 뜸'); G.sheet = null;
  const r3 = newRun('warden'); r3.ch = 2; r3.room = FLOOR_CAMP - 1; E.advanceFloor(); ok(!r3.ksGot.c3 && !r3.ksPending, '2챕터 야영지는 주지 않음');
  const r4 = newRun('warden'); r4.phase = 'settle'; r4.ch = 3; r4.clears = 3; E.startSettle(r4); G.scr = 'settle'; D.click('settleok'); ok(!r4.ksPending, '3챕터 정산은 주지 않음(야영지에서 받음)');
  const r5 = newRun('warden', { mark: { ch: 3, ids: [], mode: 'normal' } }); ok(r5.lv === MARK_START[3].lv && r5.ksPending === 2 && r5.ptree.pts === 6 + 2 * 10, '표식 도전 3챕터: Lv11 · 패시브 26 · 큰 각인 2번');
}
// ===== 6) 강화 금지선과 조건부 할인 =====
{ const A = E.atBuild('spellblade'); let nc = 0;
  for (const id in A.nodes) { const u = A.nodes[id]; if (u.kind !== 'upgrade') continue; const m = u.mod; assert(!(m.set && ('ys' in m.set || 'cd' in m.set || 'cost' in m.set)), '무조건 비용 바꾸기 금지 ' + id); if (m.cond) { nc++; assert(m.cond.off === 1 && /^(resp|alt2|kw:\w+>=\d+)$/.test(m.cond.when), '조건 어휘 ' + id); }
    const p = { build: 'spellblade', aup: [id], pn: [] }; const s = E.skOf(p, u.on); assert(s !== E.SK2[u.on] && s.ups.includes(id), '실제 스킬 ' + id); for (const x of m.fxSet || []) { const e = s.fx.find(y => y.k === x.k && (x.s == null || y.s === x.s)); for (const k in x) if (k !== 'k' && k !== 's') assert.equal(e[k], x[k], 'fxSet ' + id + ' ' + k); } }
  ok(nc === 3, '조건부 할인 강화는 셋(끓는 피 · 불길 잇기 · 교차 일섬)'); ok(Object.values(A.nodes).filter(x => x.kind === 'upgrade' && x.mod.set && x.mod.set.killRecharge).length === 1, '환급 강화는 하나(혈인 연참), 처치 조건');
  ok(JSON.stringify(E.SK2.sb_bleedcut.fx) === JSON.stringify([{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 4 }]), '강화는 원래 스킬 데이터를 바꾸지 않음');
  const fight = (ups, eq) => { const run = newRun('spellblade'); run.atree.own = Object.keys(A.nodes).filter(x => x !== 'S'); run.skills = eq; E.atSync(run); run.p.aup = ups.slice(); const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; } const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { p: run.p, b, es }; };
  { const { p, b, es } = fight(['sbu_boil'], ['sb_boil']); const a0 = E.actionList(b).find(x => x.id === 'sb_boil'); ok(a0.yc === 2, '대응 전 혈염 비용 2'); E.ysResp(b, '막기'); ok(E.actionList(b).find(x => x.id === 'sb_boil').yc === 1, '대응 충전을 받은 라운드에 비용 1');
    p.ys = 5; E.playerAct(b, 'sb_boil'); ok(b.rec.filter(x => x.k === 'yspend').pop().cost === 1, '할인된 값으로 냄'); ok(E.actionList(b).find(x => x.id === 'sb_boil').yc === 2, '같은 내 차례에 두 번째는 할인 없음'); }
  { const { p, b, es } = fight(['sbu_chainf'], ['sb_tome']); E.addS(b, es[1], 'ignite', 6); ok(E.actionList(b).find(x => x.id === 'sb_tome').yc === 2, '화상 5 이상인 적이 있으면 불의 서 3 → 2'); p.ys = 2; E.playerAct(b, 'sb_tome', es[0].id); const sp = b.rec.filter(x => x.k === 'yspend').pop(); ok(sp && sp.cost === 2 && b.rec.filter(x => x.k === 'act').pop().a === 'sb_tome', '유산 2면 조건이 맞는 대상으로 씀'); }
  { const { p, b, es } = fight(['sbu_measure'], ['sb_sunder']); p.sbLast = 'cut'; p.sbRun = 1; ok(E.actionList(b).find(x => x.id === 'sb_sunder').yc === 1, '이어진 교대 2번째면 균열 주문 2 → 1(바닥 1)'); p.sbRun = 0; ok(E.actionList(b).find(x => x.id === 'sb_sunder').yc === 2, '교대 첫 번째면 2'); }
  { const p = { build: 'spellblade', aup: ['sbu_coda', 'sbu_rhythm'], pn: [] }; const s = E.skOf(p, 'sb_turn'); ok(s.tgt === 'front' && s.fx.filter(e => e.k === 'alt').length === 2, '한 스킬에 강화 둘(마검 연무 · 마검 종곡)'); }
  { const { p, b, es } = fight(['sbu_counter'], ['sb_bladeward']); p.sbLast = 'spell'; E.playerAct(b, 'sb_bladeward', es[0].id); const L = b.log.map(x => x.m || ''); ok(L.some(m => /^⇄ 교대: 보호막 \+4$/.test(m)) && L.some(m => /^⇄ 교대: 보호막 \+4 \(/.test(m)), '맞받아 베기: 교대면 강화의 보호막 +4와 직업 교대 보호막 +4'); }
}
// ===== 7) 상점 되돌리기 =====
{ const run = newRun('spellblade'); run.lv = 5; run.ch = 2; E.ptFix(run); run.clears = 1; for (const id of ['lg1C', 'lg2L', 'lg3L']) E.ptBuy(run, id); E.ksGrant(run, 'b1'); E.ksEnsureOffer(run); E.ksTake(run, 'lgK5'); const fr = run.ptree.free.slice();
  ok(ptResetCost(run) === 50, '패시브 값 = 레벨 × 10'); E.ptReset(run); ok(run.ptree.own.length === 0 && run.ptree.pts === 14 && run.ptree.ks.includes('lgK5') && JSON.stringify(run.ptree.free) === JSON.stringify(fr), '되돌려도 큰 각인 · 길 덤은 남음');
  ok(!ptWhy(run, 'lg5L') || !/이웃/.test(ptWhy(run, 'lg5L')), '남은 길 덤 옆을 찍을 수 있음(섬도 열린 노드)');
  E.atBuy(run, 'sb_bleedcut'); E.atBuy(run, 'sb_boil'); ok(atResetCost(run) === Math.round(2 * TREE_RESET.cell * 1.5), '액티브 값 = 연 노드 × 25 × 1.5^(챕터−1)'); E.atReset(run); ok(run.atree.own.length === 0 && run.skills.length === 0 && run.atree.pts === 5, '액티브 되돌리기: 포인트 돌려받고 장착도 빠짐');
  E.atBuy(run, 'sb_ember'); E.atBuy(run, 'sb_kindle'); ok(E.atRefundLeaf(run) === 'sb_kindle' && run.atree.own.join() === 'sb_ember', '잊힌 스승의 묘비: 끝 노드 가운데 가장 바깥 것');
}
// ===== 8) 경험치 곡선 =====
{ ok(JSON.stringify(LV_XP) === JSON.stringify([0, 40, 100, 190, 330, 520, 740, 970, 1210, 1450, 1700, 2000, 2340, 2720, 3120, 3540]), 'LV_XP 새 값 16칸(5-3)');
  ok(MARK_START[2].lv === 6 && MARK_START[3].lv === 11, '표식 도전 시작 레벨 6 · 11');
  const run = newRun('monk'); const up = E.gainXp(run, 99999); ok(run.lv === 16 && up === 15, '상한 Lv16'); ok(run.ptree.pts === 36 && run.atree.pts === 16, 'Lv16에 패시브 36 · 액티브 16');
  const r2 = newRun('monk'); E.gainXp(r2, 520); ok(r2.lv === 6 && r2.ptree.pts === 16 && r2.atree.pts === 6, 'Lv6에 패시브 16 · 액티브 6'); }
// ===== 9) 옛 세이브 옮기기 =====
function oldRun(build, o) { // 0.7 꼴 판: 능력치 · 옛 트리 · 옛 각인, tv 없음
  const run = newRun(build); delete run.tv; delete run.ptree; delete run.atree; delete run.ksGot; delete run.ksPending; run.p.pn = []; run.p.psm = {}; run.p.aup = [];
  Object.assign(run, { stats: { str: 10, dex: 5, int: 10, con: 8, wil: 5 }, statPending: 0, statBase: 20, statGrowth: 3, tree: { pts: 0, open: ['sb_bleedcut', 'sb_boil', 'sb_taste', 'sb_sweepcut', 'sb_ember', 'sb_kindle', 'sb_heated'], spent: {} }, skills: ['sb_sweepcut', 'sb_taste', 'sb_bleedcut'], awk: ['a_eye', 'k_sb1'] }, o || {}); return run; }
{ const run = oldRun('spellblade', { lv: 7, xp: 760, ch: 2, clears: 1, room: 3 }); ok(E.treeMigrate08(run), '옮기기 실행');
  ok(run.ptree.pts === 18 && run.atree.pts === 7 && run.ksPending === 1, '9-5 1: Lv7 · 2챕터 → 패시브 18(6 + 2 × 6) · 액티브 7 · 큰 각인 1');
  ok(run.awk.length === 0 && run.awkOld.join() === 'a_eye,k_sb1' && JSON.stringify(run.stats) === JSON.stringify({ str: 4, dex: 0, int: 4, con: 3, wil: 1 }), '옛 각인 뺌, 능력치 = 시작 노드 12');
  ok(!run.tree && run.treeOld.open.length === 7 && run.skillsOld.join() === 'sb_sweepcut,sb_taste,sb_bleedcut' && run.skills.length === 0 && run.mig08 && run.mig08.lv === 7, '옛 트리 · 장착은 기록으로');
  ok(!E.treeMigrate08(Object.assign(run, { tv: 2 })), 'tv 2면 다시 옮기지 않음'); }
{ const run = oldRun('spellblade', { lv: 7, xp: 660, ch: 2, clears: 1 }); E.treeMigrate08(run); ok(run.lv === 7 && run.xp === 740, '9-5 2: 옛 Lv7(경험치 660)은 레벨을 지키고 경험치를 새 문턱 740으로'); }
{ const run = oldRun('spellblade', { lv: 4, xp: 400, ch: 1, clears: 0 }); E.treeMigrate08(run); ok(run.lv === 5 && run.xp === 400, '새 곡선의 레벨이 높으면 그 레벨(경험치는 그대로)'); }
for (const [room, want] of [[13, 3], [11, 2], [12, 3]]) { const run = oldRun('warden', { lv: 12, xp: 2000, ch: 3, clears: 2, room }); E.treeMigrate08(run); assert.equal(run.ksPending, want, '3챕터 ' + room + '층'); }
ok(true, '9-5 4: 3챕터 13층 3번, 11층 2번, 12층 야영지 3번');
{ const run = oldRun('warden', { lv: 10, xp: 1350, ch: 3, clears: 0, markCh: 3, room: 1 }); E.treeMigrate08(run); ok(run.ksPending === 2 && run.ksGot.b1 && run.ksGot.b2, '9-5 5: 표식 도전 3챕터 1층 → 2번'); }
{ const run = oldRun('warden', { lv: 6, xp: 520, ch: 1, clears: 1, phase: 'settle', room: 24 }); E.treeMigrate08(run); ok(run.ksPending === 1 && run.ksGot.b1, '정산 중 판: 이번 보스가 든 큰 각인 1번, 정산을 확정해도 더 주지 않음'); run.tv = 2; E.ptInit(run); ok(!E.ksGrant(run, 'b1'), '같은 때를 다시 주지 않음'); }
// 9-5 3 · 6 · 10-4: 전투 중 저장 → 방 처음, 단계 잠금, 확정할 때만 저장
{ const run = newRun('spellblade'); G.data.cur = null; run.room = 3; run.cur = { type: 'normal', floor: 3, squad: 'pack', en: [['bruiser'], ['bruiser'], ['bruiser']], gold: 10 }; E.saveCur();
  E.enterRoom(); const b = G.b; ok(b && b.en.length === 3 && run.entry, '전투 시작(적 셋)'); run.entry.hp = run.p.hpMax * 0.8; b.en[0].alive = false; b.en[0].hp = 0; run.p.hp = run.p.hpMax * 0.4; E.saveBattle(); ok(G.data.cur.battle, '전투 중 저장');
  // 0.7 꼴로 되돌린다
  const c = G.data.cur; delete c.tv; delete c.ptree; delete c.atree; delete c.ksGot; c.stats = { str: 9, dex: 3, int: 9, con: 9, wil: 5 }; c.tree = { pts: 0, open: ['sb_bleedcut'], spent: {} }; c.skills = ['sb_bleedcut']; c.awk = []; c.lv = 3; c.xp = 120;
  const saved = JSON.stringify(G.data.cur); G.b = null; G.run = null; E.resumeRun();
  ok(G.sheet && G.sheet.kind === 'alloc' && G.run.alloc.step === 'i' && !G.run.battle && !G.b, '불러오면 배분 흐름(안내부터), 전투는 버림');
  ok(Math.abs(G.run.p.hp / G.run.p.hpMax - 0.8) < 0.02 && G.run.cur && G.run.cur.en.length === 3, '9-5 3: 방에 들어설 때 생명력 80%, 같은 방(적 셋)');
  ok(JSON.stringify(G.data.cur) === saved, '확정 전에는 저장본 그대로');
  D.click('closebg'); ok(G.sheet && G.sheet.kind === 'alloc', '닫기(바깥 누르기)가 없음');
  D.click('allocgo'); ok(G.run.alloc.step === 'p', '패시브 단계'); D.click('ptbuy', 'lg1C'); D.click('ptbuy', 'lg2L'); ok(G.run.ptree.own.length === 2, '찍기'); D.click('ptref', 'lg2L'); ok(G.run.ptree.own.length === 1, '이 단계에서는 되돌리기');
  for (const id of ['lg2L', 'lg3L', 'pw1C', 'pw2L']) D.click('ptbuy', id); R_('ask = () => true'); D.click('allocnext'); ok(G.run.alloc.step === 'a', '받을 큰 각인이 없으면 액티브로');
  ok(/패시브 단계에서만/.test(E.ptRefund(G.run, 'pw2L')) && G.run.ptree.own.includes('pw2L'), '10-4: 다음 단계로 넘어가면 패시브를 되돌릴 수 없음');
  D.click('atbuy', 'sb_bleedcut'); ok(G.run.skills.includes('sb_bleedcut'), '옛 장착 스킬을 다시 열면 끼움'); ok(JSON.stringify(G.data.cur) === saved, '확정 전 저장본 그대로(9-5 6)');
  const snap = JSON.parse(saved); G.run = null; G.sheet = null; G.data.cur = snap; E.resumeRun(); ok(G.run.alloc && G.run.alloc.step === 'i' && G.run.ptree.own.length === 0, '확정 전에 다시 불러오면 처음부터 다시 옮김');
  D.click('allocgo'); for (const id of ['lg1C', 'lg2L', 'pw1C']) D.click('ptbuy', id); D.click('allocnext'); D.click('atbuy', 'sb_bleedcut'); D.click('allocok');
  ok(!G.sheet && G.data.cur.tv === 2 && !G.data.cur.battle && G.data.cur.ptree.own.length === 3 && G.data.cur.skills.join() === 'sb_bleedcut', '확정하면 저장(tv 2)');
  ok(G.scr === 'run' && G.run.cur && G.run.cur.type === 'normal' && !G.b, '확정 뒤 같은 방 앞(다시 싸움)');
  const after = JSON.stringify(G.data.cur); G.run = null; G.sheet = null; E.resumeRun(); ok(!G.sheet && !G.run.alloc && G.run.ptree.own.length === 3 && G.run.stats.dex === 0 && G.run.stats.int === 5, '확정 뒤 다시 불러오면 바뀌지 않음(능력치는 노드로 다시 셈)'); void after;
}
// 큰 각인 단계 잠금 (옮기기: 패시브 → 큰 각인 → 액티브)
{ const run = newRun('spellblade'); Object.assign(run, { lv: 6, xp: 520, ch: 2, clears: 1, room: 2, phase: null, cur: null, doors: null }); delete run.tv; delete run.ptree; delete run.atree; delete run.ksGot; delete run.ksPending; run.tree = { pts: 0, open: [], spent: {} }; G.data.cur = JSON.parse(JSON.stringify(run)); G.run = null; G.sheet = null; E.resumeRun();
  D.click('allocgo'); for (const id of ['lg1C', 'lg2L', 'lg3L']) D.click('ptbuy', id); R_('ask = () => true'); D.click('allocnext'); ok(G.run.alloc.step === 'k' && G.run.ksOffer && G.run.ksOffer.length === 3, '옮기기: 큰 각인 단계에서 셋');
  ok(/패시브 단계에서만/.test(E.ptRefund(G.run, 'lg3L')), '큰 각인 단계에서 패시브 되돌리기 없음'); D.click('kspick', G.run.ksOffer.includes('lgK5') ? 'lgK5' : G.run.ksOffer[0]); ok(G.run.alloc.step === 'a' && G.run.ptree.ks.length === 1, '고르면 액티브 단계'); ok(/패시브 단계에서만/.test(E.ptRefund(G.run, 'lg3L')), '길 덤을 받은 뒤 패시브 노드를 뺄 수 없음(10-4)'); D.click('allocok'); ok(G.data.cur.tv === 2 && G.data.cur.ptree.ks.length === 1, '확정 저장'); }
// 캐릭터 만들기 흐름
{ G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 'm' }; G.sheet = null; G.b = null; E.startRun('spellblade'); ok(G.sheet && G.sheet.kind === 'alloc' && G.run.alloc.step === 'p' && G.creating, '만들기: 패시브 단계부터');
  D.click('ptbuy', 'lg1C'); D.click('ptref', 'lg1C'); ok(G.run.ptree.pts === 6, '만드는 동안 한 칸 되돌리기'); D.click('ptbuy', 'lg1C'); R_('ask = () => true'); D.click('allocnext'); D.click('atbuy', 'sb_ember'); D.click('allocok');
  ok(!G.creating && G.data.cur && G.data.cur.tv === 2 && G.data.cur.skills.join() === 'sb_ember' && G.run.p.hp === G.run.p.hpMax, '확정하면 캐릭터를 만들고 저장'); }
// 유산 상한 · 큰 각인 훅
{ const run = newRun('spellblade'); run.clears = 2; run.ptree.ks.push('lgK5', 'lgK9'); E.ptSync(run); ok(ysCapOf(run.p) === 8, '유산 상한은 큰 각인으로만, 최대 5 + 3 = 8'); const es = [E.mkEnemy('bruiser', false, 0)]; es[0].hp = es[0].hpMax = 5000; const b = E.newBattle(run.p, es, {}); b.stepMode = false; b.rngF = () => 0.5; E.runUntilPlayer(b); ok(run.p.ys === 8, '전투 시작 값도 상한과 같이'); }
{ const run = newRun('spellblade'); run.clears = 2; run.ptree.ks.push('svK9'); E.ptSync(run); const es = [E.mkEnemy('bruiser', false, 0)]; const b = E.newBattle(run.p, es, {}); b.stepMode = false; E.runUntilPlayer(b); ok(!E.actionList(b).find(x => x.id === 'dodge').ok, '무거운 갑주: 흘리기를 쓸 수 없음'); }
{ const run = newRun('spellblade'); run.clears = 2; run.ptree.ks.push('suK9'); E.ptSync(run); ok(E.wardMax(run.p) === Math.round(run.p.hpMax * 0.22), '피를 두른 갑주: 보호막 상한 22%'); }
// 노드 훅: 교대의 박자(교대 보호막 5) · 마검 과부하(교대 보호막 없음) · 넘친 숨(상한에 막힌 대응을 다음 차례에 +1)
function nodeFight(keys) { const run = newRun('spellblade'); run.clears = 2; for (const k of keys) { const id = Object.keys(E.ptBuild('spellblade').nodes).find(x => E.ptBuild('spellblade').nodes[x].fx === k); (E.ptBuild('spellblade').nodes[id].kind === 'keystone' ? run.ptree.ks : run.ptree.free).push(id); } E.ptSync(run); const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 0; } const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { p: run.p, b, es }; }
{ const { p, b, es } = nodeFight(['n_sb_altbeat']); p.sbLast = 'spell'; E.playerAct(b, 'basic', es[0].id); ok(b.rec.some(x => x.k === 'alt' && Math.abs(x.g - 5) < 0.01), '교대의 박자: 교대 보호막 4 → 5'); }
{ const { p, b, es } = nodeFight(['ks_sb_over']); p.sbLast = 'spell'; E.playerAct(b, 'basic', es[0].id); ok(!b.rec.some(x => x.k === 'alt'), '마검 과부하: 교대 보호막을 얻지 않음'); }
{ const { p, b, es } = nodeFight(['n_overflow']); p.ys = 5; E.ysResp(b, '막기'); ok(b.ysOvfPend === 1, '넘친 숨: 상한에 막힌 대응을 기억'); p.ys = 2; for (const e of es) e.intent = { k: 'attack' }; E.playerAct(b, 'guard'); E.playerAct(b, 'basic', es[0].id); ok(b.rec.some(x => x.k === 'ys' && x.src === 'overflow' && x.g === 1), '다음 내 차례 시작에 유산 +1'); E.ysResp(b, '막기'); ok(!b.ysOvfPend || b.ysOvfUsed, '전투마다 1번'); }
console.log('tree-check: ' + n + '개 통과');
