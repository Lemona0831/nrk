'use strict';
/* 0.8.0 2단계 트리 엔진 점검 (10월 16일, 10월 17일 4단계 만든 사람 보완 5가지를 끝에 더함). 실행: node tools/tree-check.js
   1 스키마(9직업 패시브 · 액티브: 양방향 연결, 시작에서 닿음, 고리 잠금 안에서 이어짐, 고아 없음, 비용, 효과 키) · 2 마검사 트리가 1단계 문서 7 · 8절과 같음 ·
   3 찍기 규칙 · 4 능력치 · 5 큰 각인(거리 N, 동점 규칙, 보너스 노드, 때: 1 · 2챕터 정산, 3챕터 야영지) · 6 강화 금지선과 조건부 할인 · 7 상점 되돌리기 · 8 경험치 곡선 · 9 옛 세이브 옮기기(9-5 + 10-4 단계 잠금 · 확정 저장) */
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
  const kb = Object.values(P.nodes).filter(x => x.kind === 'keystone' && x.areq).length; ok(kinds.start === 1 && kinds.keystone - kb === 12 && kinds.small + kinds.notable === 90 && kb === (c === 'spellblade' ? 3 : 0), c + ': 패시브 일반 90 + 큰 각인 자리 12 + 시작 1 (+ 경계 큰 각인 자리: 마검사 3, M5-0)');
  const dist = bfs(P, 'S'); const W = { '1C': 1, '2L': 2, '2R': 2, '3L': 3, '3R': 3, '4L': 4, '4R': 4, K5: 5, '5L': 5, '5R': 5, '6L': 6, '6R': 6, '7L': 7, '7R': 7, '8L': 8, '8R': 8, K9: 9 };
  for (const d of PT.dirs) for (const pos in W) { assert.equal(dist[d + pos], W[pos], c + ' 거리 ' + d + pos); const nd = P.nodes[d + pos]; assert.equal(nd.ring, pos[0] === 'K' ? (pos === 'K5' ? 2 : 3) : (+pos[0] <= 3 ? 1 : +pos[0] <= 6 ? 2 : 3), c + ' 고리 ' + d + pos); }
  ok(true, c + ': 시작에서의 거리 · 고리 표(2-3)');
  for (const id of ids) { const nd = P.nodes[id]; if (nd.kind === 'keystone') assert(nd.cost === 0 && IFX_NODE[nd.fx] && KS_LIST[nd.fx], c + ' 큰 각인 ' + id); else if (nd.kind !== 'start') assert(nd.cost === 1, c + ' 비용 ' + id); if (nd.kind === 'notable') assert(IFX_NODE[nd.fx] || IFX_AWK[nd.fx], c + ' 효과 키 ' + nd.fx); if (nd.kind === 'small') assert(nd.stat || nd.sm || nd.basic, c + ' 작은 노드 ' + id); } // 0.8.0 M4: 평타 노드(basic)는 능력치 대신 효과
  const fx = ids.map(id => P.nodes[id].fx).filter(Boolean); ok(new Set(fx).size === fx.length, c + ': 같은 효과는 트리에 한 번');
  ok(fx.filter(k => KS_LIST[k] && KS_LIST[k].resp && !(IFX_NODE[k] && IFX_NODE[k].ysChan)).length <= 2, c + ': 대응 충전을 바꾸는 큰 각인은 둘까지(4-3, 방향별 유산 통로 Y4는 따로)'); ok(fx.filter(k => IFX_NODE[k] && IFX_NODE[k].ysChan).length <= 3, c + ': 유산 통로 큰 각인은 방향마다 하나(M4 Y4)');
  ok(!fx.some(k => ['a_purse', 'a_memory', 'a_flow'].includes(k)), c + ': 빠진 옛 각인(불룩한 주머니 · 샘의 기억 · 흘림새 각인)이 없음');
  const st = Object.values(P.nodes.S.stat).reduce((a, v) => a + v, 0); ok(st === (c === 'spellblade' || c === 'elementalist' ? 14 : 12), c + ': 시작 노드 능력치 12(마검사는 4단계 초반 피해 점검으로 14, 원소술사는 원거리 초안 결정 9로 14)'); // 10월 18일 0.8.0 5단계 원소술사 지능 9 · 체력 3 · 의지 2
  const tilt = PT_TILT[c]; for (const d of PT.dirs) { const first = Math.min(...['1C', '2L', '2R', '3L', '3R'].filter(p => P.nodes[d + p].kind === 'notable').map(p => dist[d + p])); const want = { A: 1, B: 2, C: 3 }[tilt[d]]; if (!P.tmp) assert.equal(first, want, c + ' 기울기 ' + d); else assert(first === Infinity || first >= want, c + ' 임시 기울기 ' + d); }
  ok(true, c + ': 기울기(첫 중간 노드까지 거리) ' + (P.tmp ? '임시 트리는 그 거리보다 가깝지 않음' : '표대로'));
  for (const id in A.nodes) { const nd = A.nodes[id]; if (nd.kind === 'start') continue; assert(nd.cost === 1 && [1, 2, 3].includes(nd.ring), c + ' 액티브 ' + id); if (nd.kind === 'skill') assert(E.SK2[id] && !E.SK2[id].start, c + ' 스킬 ' + id); else { assert(nd.links.includes(nd.on) && A.nodes[nd.on].kind === 'skill', c + ' 강화가 그 스킬과 이웃 ' + id); } if (nd.links.includes('S')) assert.equal(nd.ring, 1, c + ' 가운데 이웃은 1고리 ' + id); }
  ok(true, c + ': 액티브 노드(스킬은 지금 칸, 강화는 그 스킬과 이웃, 비용 1)');
  { const REAL = ['spellblade', 'warden', 'monk', 'hunter', 'elementalist', 'assassin']; ok(!!P.tmp === !REAL.includes(c) && !A.tmp && (REAL.includes(c) || Object.keys(A.nodes).length === 1), c + ': 패시브 임시 트리는 직업 초안 밖 직업만, 액티브 임시 트리는 폐기(0.8.0 M5-0 D14: 숨겨진 직업은 시작 노드만)'); } // 0.8.0 5단계 (사냥꾼 · 원소술사 · 암살자: 10월 18일)
}

// ===== 2) 마검사 = 1단계 문서 7 · 8절 =====
{ const P = E.ptBuild('spellblade'), A = E.atBuild('spellblade'); const nm = id => P.nodes[id].n;
  const W7 = { pw2L: '피 맛', pw3R: '밴 불씨', pw5L: '벼린 눈', pw5R: '교대의 칼끝', pw7L: '흩는 손', pw7R: '마무리 칼', ct2L: '박자 끊기', ct3R: '예고 깨기', ct5L: '균열 읽기', ct5R: '무너진 틈', ct7L: '무거운 손', ct7R: '흐트러진 자세',
    ag2L: '흘린 칼끝', ag3R: '가벼운 칼', ag5L: '각오', ag5R: '먼 주문', ag7L: '가벼운 걸음', ag7R: '단숨', lg1C: '교대의 박자', lg3L: '칼에 새긴 주문', lg5L: '넘친 숨', lg5R: '세 박자', lg7L: '가득 찬 그릇', lg7R: '마력 순환',
    su2L: '겹친 갑주', su3R: '남는 마력', su5L: '승전의 숨', su5R: '두꺼운 주문 방패', su7L: '남는 온기', su7R: '피의 갑주', sv3L: '마력 갑주', sv5L: '질긴 살갗', sv5R: '보호막 아래', sv7L: '쇠 같은 몸', sv7R: '버티는 이' };
  for (const id in W7) assert.equal(nm(id), W7[id], '7-4 ' + id); const nts = Object.values(P.nodes).filter(x => x.kind === 'notable'); ok(nts.length === 35 && nts.every(x => W7[x.id]), '마검사 중간 노드 35개가 7-4 표와 같음');
  const K7 = { pwK5: '날 선 손', pwK9: '마검 과부하', ctK5: '무너뜨린 숨', ctK9: '끊는 박자', agK5: '흘린 숨', agK9: '먼저 움직임', lgK5: '깊은 샘', lgK9: '겹 대응', suK5: '피의 순환', suK9: '피를 두른 갑주', svK5: '막아 낸 숨', svK9: '철벽' }; // 0.8.0 M4 배치
  for (const id in K7) assert.equal(nm(id), K7[id], '큰 각인 ' + id); ok(Object.values(P.nodes).filter(x => x.kind === 'keystone' && x.pay).length === 4, '큰 각인 12, 대가 있는 것 4');
  ok(P.nodes.pw2L.stat == null && P.nodes.pw2R.fx === 'n_bs_dmg' && P.nodes.pw2R.stat == null && P.nodes.pw3L.fx === 'n_bs_brk' && P.nodes.pw1C.stat.str === 1 && P.nodes.pw1C.stat.int === 1 && P.nodes.ct1C.sm === 'brk' && P.nodes.lg2L.sm === 'st' && P.nodes.sv1C.stat.con === 2 && P.nodes.su1C.stat.wil === 2 && P.nodes.ag1C.fx === 'n_bs_dmg2' && P.nodes.ag2R.fx === 'n_bs_st' && P.nodes.ag3L.stat.dex === 2, '작은 노드: 화력 · 기민 1고리 앞 두 칸은 평타 노드(M4), 화력 C 힘1 지능1, 제어 붕괴, 계승 스태미나, 생존 체력, 유지력 의지, 기민 민첩');
  ok(JSON.stringify(P.nodes.S.stat) === JSON.stringify({ str: 5, int: 5, con: 3, wil: 1 }), '시작 노드 힘5 지능5 체력3 의지1(4단계: 12 → 14점)');
  /* 0.8.0 M5-0 보정 4(10월 20일 만든 사람): 여섯 부채꼴 같은 크기. 옛 5단계 8-2 · 8-3 표(22칸 + 강화 23)는 이 규격으로 바뀌었다 */
  const BOUND_ATK_WAIT = ['BC', 'CA'], atkWait = []; // 보정 5 명령대로 둘째 칸만 바꾸면 죄인의 피 · 유산의 불은 공격 1(만든 사람 결정 대기)
  const SECN = { A: [], AB: [], B: [], BC: [], C: [], CA: [] }; for (const x of Object.values(A.nodes)) if (x.sec) SECN[x.sec].push(x);
  const skOfSec = k => SECN[k].filter(x => x.kind === 'skill'), upOfSec = k => SECN[k].filter(x => x.kind === 'upgrade');
  for (const k of ['A', 'B', 'C']) { const S6 = skOfSec(k), r = n => S6.filter(x => x.ring === n); ok(S6.length === 7 && upOfSec(k).length === 7 && upOfSec(k).every(u => u.slot && u.vars.length === 3), A.sec[k] + ': 갈래 스킬 노드 7(찍을 수 있는 칸 6) · 스킬마다 변형 자리 하나에 변형 셋(보정 5) (' + S6.length + ' · ' + upOfSec(k).length + ')');
    const op = r(1).filter(x => x.ys === 2); ok(r(1).length === 3 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op.length === 2 && op[0].excl === op[1].id && op[1].excl === op[0].id && r(2).length === 2 && r(2).every(x => x.ys >= 2 && x.ys <= 3) && r(3).length === 2 && r(3).every(x => x.ys >= 3 && x.ys <= 4), A.sec[k] + ': 1고리 첫 스킬 둘(둘 중 하나, 보정 5) + 리듬 1, 2고리 2칸(2–3), 3고리 2칸(3–4)'); }
  for (const k of ['AB', 'BC', 'CA']) { const S5 = skOfSec(k), r = n => S5.filter(x => x.ring === n); ok(S5.length === 5 && upOfSec(k).length === 5 && upOfSec(k).every(u => u.slot && u.vars.length === 3), A.sec[k] + ': 경계 스킬 5 · 변형 자리 5(변형 셋씩) (' + S5.length + ' · ' + upOfSec(k).length + ')');
    ok(!r(1).length && r(2).map(x => x.ys).join() === '2,2' && r(3).map(x => x.ys).sort().join() === '3,3,4' && r(2).filter(x => x.requires).length === 1, A.sec[k] + ': 2고리 입구 + 둘째(2 · 2), 3고리 둘 + 승부수(3 · 3 · 4), 1고리 없음');
    const ent = r(2).find(x => x.requires), two = r(2).find(x => !x.requires), fin = r(3).find(x => x.ys === 4), mid = r(3).filter(x => x.ys === 3);
    ok(two.links.includes(ent.id) && mid.every(x => x.links.includes(two.id)) && mid.every(x => fin.links.includes(x.id)), A.sec[k] + ': 입구 → 둘째 → 3고리 둘 → 승부수로 이어짐');
    /* M5-0 보정 5(만든 사람): 경계 5칸 = 공격 2 · 강화/방어 2 · 승부수 1. 공격 = 적을 겨누고 피해를 주는 칸 */
    const atk = S5.filter(x => x.ys !== 4 && E.SK2[x.id].tgt !== 'self' && E.SK2[x.id].fx.some(e => ['dmg', 'wardDmg'].includes(e.k))).length; const msg = A.sec[k] + ': 공격 ' + atk + ' · 강화/방어 ' + (4 - atk) + ' · 승부수 1';
    if (BOUND_ATK_WAIT.includes(k)) atkWait.push(msg); else ok(atk === 2, msg); }
  { const sk = Object.values(A.nodes).filter(x => x.kind === 'skill'), up = Object.values(A.nodes).filter(x => x.kind === 'upgrade'); ok(sk.length === 36 && up.length === 36 && Object.keys(A.vars).length === 108, '마검사 스킬 노드 36(1고리 갈림 셋 더) + 변형 자리 36 · 변형 108 (' + sk.length + ' + ' + up.length + ' · ' + Object.keys(A.vars).length + ')'); }
  if (atkWait.length) console.log('경계 공격 칸 판정 대기(만든 사람 결정): ' + atkWait.join(' / '));
  { const CUT = ['sb_whirl', 'sb_heated', 'sb_snuff', 'sb_rebound', 'sb_sunder', 'sb_bloodecho', 'sb_ashhand']; ok(CUT.every(id => !A.nodes[id] && E.SK2[id]), '트리에 없는 칸(스킬 데이터는 남음, 보정 5에서 피의 낙인 · 회류참 되살림, 피의 반향 · 재 묻은 손 교체): ' + CUT.join(' '));
    ok(['sbu_graze', 'sbu_scarlet', 'sbu_thirst', 'sbu_exec', 'sbu_fog', 'sbu_whet', 'sbu_ash', 'sbu_rush', 'sbu_coil', 'sbu_firefall', 'sbu_twin', 'sbu_measure', 'sbu_rhythm', 'sbu_coda'].every(id => !A.nodes[id]), '자른 강화 14'); }
  { const ent = ['sb_bloodfire', 'sb_bloodmail', 'sb_heatmail'].map(id => A.nodes[id]); const budget = 2 + 5 + 3; /* 보정 5: 변형 자리를 다 열면 2 + 5 + 5 = 12 */ ok(ent.every(x => x.requires.length === 2 && x.requires.every(g => Array.isArray(g) && g.length === 2)) && budget <= E.AT_PTS.start + E.AT_PTS.lv * 15, '경계 빌드 포인트: 양쪽 개시 2 + 경계 5 + 강화 3 = ' + budget + '점, Lv16 ' + (E.AT_PTS.start + E.AT_PTS.lv * 15) + '점 안'); }
  { const U = D.run_('SB_BOUND'), T = id => E.SK2[id].fx.map(e => e.txt || '').join(' ');
    ok(T('sb_hotedge').includes('화상 +' + U.crossN) && T('sb_shackle').includes('붕괴 +' + U.shackleBrk) && T('sb_embercut').includes(U.emberCutBurn + '까지') && T('sb_cindermail').includes('화상 ' + U.cinderIgn) && T('sb_film').includes(Math.round(U.filmPer * 100) + '%') && T('sb_embermail').includes('화상 ' + U.emberIgn), '경계 문장의 숫자가 SB_BOUND와 같음'); }
}



// ===== M5-0 보정 5: 고리는 야영지에서 연다 =====
{ const run = newRun('spellblade'); const ro = D.run_('ringOpen'), rc = D.run_('ringCampOpen');
  ok(!ro(run, 2) && !ro(run, 3), '새 판: 2 · 3고리 잠김'); run.ch = 1; ok(rc(run) === 2 && ro(run, 2) && !ro(run, 3) && run.ringNew === 1, '1챕터 야영지: 2고리가 열리고 트리 버튼 강조');
  ok(rc(run) === 0, '같은 야영지를 다시 지나도 그대로'); run.ch = 2; ok(rc(run) === 3 && ro(run, 3), '2챕터 야영지: 3고리');
  const r2 = newRun('spellblade'); r2.clears = 1; ok(ro(r2, 2) && !ro(r2, 3), '1챕터를 깬 판(옛 판 · 챕터 시작)은 2고리 그대로'); }

// ===== M5-0 보정 5: 1고리 갈림 · 경계 입구(둘 중 어느 쪽이든) =====
{ const run = newRun('spellblade'); run.atree.pts = 9; ok(E.atBuy(run, 'sb_bloodmark') === null && /같은 자리의 다른 첫 스킬/.test(atWhy(run, 'sb_bleedcut')), '피의 낙인을 찍으면 혈흔 베기는 잠김');
  ok(E.atBuy(run, 'sb_blooddrop') === null, '리듬 칸은 둘 중 어느 쪽에서도'); ok(E.atBuy(run, 'sb_flamecut') === null && /같은 자리/.test(atWhy(run, 'sb_ember')), '염화 베기를 찍으면 불씨 투척은 잠김');
  run.clears = 1; ok(!atWhy(run, 'sb_bloodfire'), '피의 낙인 + 염화 베기로도 혈염 입구가 열림'); ok(/양쪽 갈래/.test(atWhy(run, 'sb_bloodmail')), '마갑 첫 스킬이 없으면 죄인의 피 입구는 잠김'); }

// ===== M5-0 보정 5: 변형 강화 =====
{ const run = newRun('spellblade'); run.atree.pts = 9; const vs = f('atVarSet'); E.atBuy(run, 'sb_bleedcut'); ok(/제시되지 않은/.test(E.atBuy(run, 'sv_bleedcut', 'sbv_mark_fast')), '다른 스킬의 변형은 못 고름');
  ok(E.atBuy(run, 'sv_bleedcut', 'sbv_bleedcut_fast') === null && E.skOf(run.p, 'sb_bleedcut').time === 'fast', '변형 자리를 열며 하나를 고르면 그 스킬에 적용');
  ok(/야영지/.test(vs(run, 'sv_bleedcut', 'sbu_chain')) && run.atree.vsel.sv_bleedcut === 'sbv_bleedcut_fast', '야영지가 아니면 바꿀 수 없음'); run.cur = { type: 'camp' }; const p0 = run.atree.pts;
  ok(vs(run, 'sv_bleedcut', 'sbu_chain') === null && run.atree.pts === p0 && E.skOf(run.p, 'sb_bleedcut').killRecharge === 1 && E.skOf(run.p, 'sb_bleedcut').time !== 'fast', '야영지에서 바꾸면 포인트는 그대로, 새 변형이 적용');
  run.offer = { vars: { sv_bleedcut: ['sbu_chain', 'sbv_bleedcut_front'] } }; ok(/제시되지 않은/.test(vs(run, 'sv_bleedcut', 'sbv_bleedcut_fast')), '제시되지 않은 변형으로는 못 바꿈');
  delete run.atree.vsel.sv_bleedcut; E.treeSync(run); ok(!run.p.aup.length && !E.skOf(run.p, 'sb_bleedcut').killRecharge, '고르지 않은 자리(옛 판)는 일하지 않음'); }

// ===== 3) 찍기 규칙 =====
{ const run = newRun('spellblade'); const T = E.ptBuild('spellblade');
  ok(run.tv === 2 && run.ptree.pts === 6 && run.atree.pts === 2 && run.ptree.own.length === 0, '새 캐릭터: 트리 판 2, 패시브 6 · 액티브 2');
  ok(!ptWhy(run, 'lg1C') && ptWhy(run, 'lg2L') === '이웃한 노드를 먼저 열어야 합니다', '시작 이웃은 찍고, 떨어진 노드는 못 찍음');
  ok(/챕터 보상/.test(ptWhy(run, 'lgK5')), '큰 각인 자리는 포인트로 못 찍음');
  for (const id of ['lg1C', 'lg2L', 'lg3L']) assert.equal(E.ptBuy(run, id), null, id); ok(/2고리/.test(ptWhy(run, 'lg4L')), '2고리는 1챕터 보스 전에 잠김');
  run.clears = 1; ok(!ptWhy(run, 'lg4L'), '1챕터를 깨면 2고리'); run.clears = 0; run.markCh = 2; ok(!ptWhy(run, 'lg4L'), '표식 도전 2챕터 시작은 1챕터를 깬 것으로 침'); delete run.markCh;
  ok(run.ptree.pts === 3, '찍으면 포인트가 준다'); for (const id of ['pw1C', 'pw2L', 'pw2R']) E.ptBuy(run, id); ok(run.ptree.pts === 0 && ptWhy(run, 'pw3L') === '포인트가 없습니다', '포인트가 없으면 못 찍음');
  ok(/패시브 단계에서만/.test(E.ptRefund(run, 'pw2R')), '배분 흐름 밖에서는 한 칸 되돌리기가 없음');
  run.alloc = { mode: 'create', step: 'p' }; ok(/이어져/.test(E.ptRefund(run, 'lg2L')), '되돌리면 끊기는 노드는 못 되돌림'); ok(E.ptRefund(run, 'lg3L') === null && run.ptree.pts === 1, '끝 노드는 되돌림 · 포인트 +1'); delete run.alloc;
  ok(!atWhy(run, 'sb_bleedcut') && atWhy(run, 'sb_blooddrop') === '이웃한 노드를 먼저 열어야 합니다', '액티브도 이웃 규칙');
  E.atBuy(run, 'sb_bleedcut'); ok(run.atree.pts === 1 && run.skills.includes('sb_bleedcut') && run.p.skills.includes('sb_bleedcut'), '연 스킬은 빈 칸에 장착'); run.atree.pts = 3; E.atBuy(run, 'sb_blooddrop'); ok(/2고리/.test(atWhy(run, 'sb_boil')), '액티브 2고리 잠금(M5-0 보정 4: 1고리는 개시 + 리듬)');
  E.atBuy(run, 'sv_bleedcut', 'sbu_chain'); ok(run.atree.own.includes('sv_bleedcut') && run.atree.vsel.sv_bleedcut === 'sbu_chain' && run.p.aup.includes('sbu_chain') && E.skOf(run.p, 'sb_bleedcut').killRecharge === 1, '강화는 끼운 스킬에 적용');
  E.atEquip(run, 'sb_bleedcut'); ok(!run.p.aup.includes('sbu_chain') && !E.skOf(run.p, 'sb_bleedcut').killRecharge, '스킬을 빼면 강화는 일하지 않음');
  ok(E.v2Equip(run).length === 3, '장착 = 시작 둘 + 끼운 스킬'); run.atree.own.push('sb_spark', 'sb_ember', 'sb_bladeward', 'sb_kindle'); for (const id of ['sb_bleedcut', 'sb_spark', 'sb_ember', 'sb_bladeward']) if (!run.skills.includes(id)) E.atEquip(run, id); ok(/가득/.test(E.atEquip(run, 'sb_kindle')), '장착은 4칸(시작 2 + 4 = 6)'); ok(E.v2Equip(run).length === 6, '6칸');
}
// ===== 4) 능력치 = 노드 합 =====
{ const run = newRun('spellblade'); const p = run.p; const hp0 = p.hpMax, st0 = p.stMax;
  ok(JSON.stringify(run.stats) === JSON.stringify({ str: 5, dex: 0, int: 5, con: 3, wil: 1 }) && E.stat(p, 'str') === 5, '시작 능력치 = 시작 노드');
  E.ptBuy(run, 'sv1C'); ok(run.stats.con === 5 && p.hpMax === hp0 + 6, '체력 +2 → 생명력 +6');
  E.ptBuy(run, 'lg1C'); E.ptBuy(run, 'lg2L'); ok(p.stMax === st0 + 6 && E.fxStat(p, 'st') === 6, '계승 작은 노드 스태미나 +6');
  E.ptBuy(run, 'ct1C'); ok(Math.abs(E.fxMul(p, 'brkMul', {}, p, {}, null) - 1.03) < 1e-9, '제어 작은 노드 붕괴 ×1.03');
  ok(p.pn.includes('n_sb_altbeat'), '중간 노드 효과가 p.pn으로 fxList에 들어감');
  E.ptBuy(run, 'pw1C'); E.ptBuy(run, 'pw2R'); ok(run.stats.str === 6 && run.stats.int === 6 && run.p.pn.includes('n_bs_dmg'), '화력 C1 힘1 지능1, R2는 평타 노드(M4, 시작 힘 5 · 지능 5)');
  const run2 = newRun('hunter'); E.ptBuy(run2, 'pw1C'); E.ptBuy(run2, 'pw2L'); ok(run2.stats.dex === 8 && run2.p.pn.includes('n_bs_dmg'), '사냥꾼 화력 1고리 작은 노드는 평타 노드(M4, 민첩 그대로 8)'); // 0.8.0 5단계 원거리 초안 결정 3: 시작 민첩 8 + 화력 L2 작은 노드 2 (C1은 손에 익은 활)
}
// ===== 5) 큰 각인 =====
{ const run = newRun('spellblade'); run.lv = 6; E.ptFix(run); run.clears = 1; run.seed = 77; run.ch = 1;
  for (const id of ['lg1C', 'lg2L', 'lg3L', 'pw1C', 'pw2R', 'pw3R', 'su1C', 'su2L', 'ct1C', 'ct2L']) assert.equal(E.ptBuy(run, id), null, id);
  ok(E.ksGrant(run, 'b1') && !E.ksGrant(run, 'b1') && run.ksPending === 1, '같은 때는 한 번만 준다');
  { const o4 = E.ksOfferMake(run); ok(o4.length === 3 && o4.includes('pwK5') && E.ptBuild(run.build).nodes.pwK5.fx === 'ks_sharp', '화력 K5는 날 선 손(M4). 결정의 칼이 빠져 유산 4 스킬 조건 없이 제시됨: ' + o4.join(' ')); }
  run.atree.own.push('sb_deluge'); // 10월 18일 0.8.0 5단계: 아래 제시 규칙 점검은 유산 4 스킬(혈인 혈우 낙하 sb_deluge)을 연 캐릭터로 본다
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
  for (const id in A.vars) { const u = A.vars[id]; const m = u.mod; assert(!(m.set && ('ys' in m.set || 'cd' in m.set || 'cost' in m.set)), '무조건 비용 바꾸기 금지 ' + id); if (m.cond) { nc++; assert(m.cond.off === 1 && /^(resp|alt2|ward>=\d+|kw:\w+>=\d+(&kw:\w+>=\d+)?)$/.test(m.cond.when), '조건 어휘 ' + id); /* 0.8.0 M5-0: 경계 강화 표준 "양쪽 갈래 상태가 모두 있으면"(kw & kw), 보유 보호막(ward>=n) */ }
    const p = { build: 'spellblade', aup: [id], pn: [] }; const s = E.skOf(p, u.on); assert(s !== E.SK2[u.on] && s.ups.includes(id), '실제 스킬 ' + id); for (const x of m.fxSet || []) { const e = s.fx.find(y => y.k === x.k && (x.s == null || y.s === x.s)); for (const k in x) if (k !== 'k' && k !== 's') assert.equal(e[k], x[k], 'fxSet ' + id + ' ' + k); } }
  ok(nc >= 30, '조건부 할인 변형 ' + nc + '개(대응 · 교대 · 상태 · 보호막 조건, 보정 5)'); ok(Object.values(A.vars).filter(x => x.mod.set && x.mod.set.killRecharge).every(x => /쓰러뜨리면/.test(x.d)), '처치 환급 변형은 처치 조건을 적음');
  ok(JSON.stringify(E.SK2.sb_bleedcut.fx) === JSON.stringify([{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 4 }]), '강화는 원래 스킬 데이터를 바꾸지 않음');
  const fight = (ups, eq) => { const run = newRun('spellblade'); run.clears = 2; run.atree.own = Object.keys(A.nodes).filter(x => x !== 'S'); run.skills = eq; E.atSync(run); run.p.aup = ups.slice(); const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; } const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { p: run.p, b, es }; };
  { const { p, b, es } = fight(['sbu_boil'], ['sb_boil']); const a0 = E.actionList(b).find(x => x.id === 'sb_boil'); ok(a0.yc === 2, '대응 전 혈염 비용 2'); E.ysResp(b, '막기'); ok(E.actionList(b).find(x => x.id === 'sb_boil').yc === 1, '대응 충전을 받은 라운드에 비용 1');
    p.ys = 5; E.playerAct(b, 'sb_boil'); ok(b.rec.filter(x => x.k === 'yspend').pop().cost === 1, '할인된 값으로 냄'); ok(E.actionList(b).find(x => x.id === 'sb_boil').yc === 2, '같은 내 차례에 두 번째는 할인 없음'); }
  { const { p, b, es } = fight(['sbu_chainf'], ['sb_tome']); E.addS(b, es[1], 'ignite', 6); ok(E.actionList(b).find(x => x.id === 'sb_tome').yc === 2, '화상 5 이상인 적이 있으면 불의 서 3 → 2'); p.ys = 2; E.playerAct(b, 'sb_tome', es[0].id); const sp = b.rec.filter(x => x.k === 'yspend').pop(); ok(sp && sp.cost === 2 && b.rec.filter(x => x.k === 'act').pop().a === 'sb_tome', '유산 2면 조건이 맞는 대상으로 씀'); }
  { const { p, b, es } = fight(['sbu_spread_sear'], ['sb_searspread']); ok(E.actionList(b).find(x => x.id === 'sb_searspread').yc === 3, '혈염 걸린 적이 없으면 핏불 번짐 3'); E.addS(b, es[1], 'sear', 3); ok(E.actionList(b).find(x => x.id === 'sb_searspread').yc === 2, '혈염 걸린 적이 있으면 3 → 2(M5-0 보정 4 번지는 혈흔)'); }
  { const p = { build: 'spellblade', aup: ['sbu_flare', 'sbu_brand'], pn: [] }; const s = E.skOf(p, 'sb_ember'); ok(s.fx.some(e => e.k === 'imbue' && e.s === 'ignite') && s.fx.some(e => e.k === 'kwx' && e.s === 'ignite'), '한 스킬에 강화 둘(불꽃 탄 · 불의 표식)'); }
  { const { p, b, es } = fight(['sbu_counter'], ['sb_bladeward']); p.sbLast = 'spell'; E.playerAct(b, 'sb_bladeward', es[0].id); const L = b.log.map(x => x.m || ''); ok(L.some(m => /^⇄ 교대: 보호막 \+4$/.test(m)) && L.some(m => /^⇄ 교대: 보호막 \+4 \(/.test(m)), '맞받아 베기: 교대면 강화의 보호막 +4와 직업 교대 보호막 +4'); }
}
// ===== 7) 상점 되돌리기 =====
{ const run = newRun('spellblade'); run.lv = 5; run.ch = 2; E.ptFix(run); run.clears = 1; for (const id of ['lg1C', 'lg2L', 'lg3L']) E.ptBuy(run, id); E.ksGrant(run, 'b1'); E.ksEnsureOffer(run); E.ksTake(run, 'lgK5'); const fr = run.ptree.free.slice();
  ok(ptResetCost(run) === 50, '패시브 값 = 레벨 × 10'); E.ptReset(run); ok(run.ptree.own.length === 0 && run.ptree.pts === 14 && run.ptree.ks.includes('lgK5') && JSON.stringify(run.ptree.free) === JSON.stringify(fr), '되돌려도 큰 각인 · 보너스 노드은 남음');
  ok(!ptWhy(run, 'lg5L') || !/이웃/.test(ptWhy(run, 'lg5L')), '남은 보너스 노드 옆을 찍을 수 있음(섬도 열린 노드)');
  E.atBuy(run, 'sb_bleedcut'); E.atBuy(run, 'sb_boil'); ok(atResetCost(run) === Math.round(2 * TREE_RESET.cell * 1.5), '액티브 값 = 연 노드 × 25 × 1.5^(챕터−1)'); E.atReset(run); ok(run.atree.own.length === 0 && run.skills.length === 0 && run.atree.pts === 6, '액티브 되돌리기: 포인트 돌려받고 장착도 빠짐');
  E.atBuy(run, 'sb_ember'); E.atBuy(run, 'sb_kindle'); ok(E.atRefundLeaf(run) === 'sb_kindle' && run.atree.own.join() === 'sb_ember', '잊힌 스승의 묘비: 끝 노드 가운데 가장 바깥 것');
}
// ===== 8) 경험치 곡선 =====
{ ok(JSON.stringify(LV_XP) === JSON.stringify([0, 40, 100, 190, 330, 520, 740, 970, 1210, 1450, 1700, 2000, 2340, 2720, 3120, 3540]), 'LV_XP 새 값 16칸(5-3)');
  ok(MARK_START[2].lv === 6 && MARK_START[3].lv === 11, '표식 도전 시작 레벨 6 · 11');
  const run = newRun('monk'); const up = E.gainXp(run, 99999); ok(run.lv === 16 && up === 15, '상한 Lv16'); ok(run.ptree.pts === 36 && run.atree.pts === 17, 'Lv16에 패시브 36 · 액티브 17');
  const r2 = newRun('monk'); E.gainXp(r2, 520); ok(r2.lv === 6 && r2.ptree.pts === 16 && r2.atree.pts === 7, 'Lv6에 패시브 16 · 액티브 7'); }
// ===== 9) 옛 세이브 옮기기 =====
function oldRun(build, o) { // 0.7 꼴 판: 능력치 · 옛 트리 · 옛 각인, tv 없음
  const run = newRun(build); delete run.tv; delete run.ptree; delete run.atree; delete run.ksGot; delete run.ksPending; run.p.pn = []; run.p.psm = {}; run.p.aup = []; run.dgv = 2; // 0.8.0 6단계: 0.7 판은 24층 틀(dgv 2)
  Object.assign(run, { stats: { str: 10, dex: 5, int: 10, con: 8, wil: 5 }, statPending: 0, statBase: 20, statGrowth: 3, tree: { pts: 0, open: ['sb_bleedcut', 'sb_boil', 'sb_taste', 'sb_sweepcut', 'sb_ember', 'sb_kindle', 'sb_heated'], spent: {} }, skills: ['sb_sweepcut', 'sb_taste', 'sb_bleedcut'], awk: ['a_eye', 'k_sb1'] }, o || {}); return run; }
{ const run = oldRun('spellblade', { lv: 7, xp: 760, ch: 2, clears: 1, room: 3 }); ok(E.treeMigrate08(run), '옮기기 실행');
  ok(run.ptree.pts === 18 && run.atree.pts === 8 && run.ksPending === 1, '9-5 1: Lv7 · 2챕터 → 패시브 18(6 + 2 × 6) · 액티브 8(2 + 6) · 큰 각인 1');
  ok(run.awk.length === 0 && run.awkOld.join() === 'a_eye,k_sb1' && JSON.stringify(run.stats) === JSON.stringify({ str: 5, dex: 0, int: 5, con: 3, wil: 1 }), '옛 각인 뺌, 능력치 = 시작 노드(마검사 14)');
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
  const after = JSON.stringify(G.data.cur); G.run = null; G.sheet = null; E.resumeRun(); ok(!G.sheet && !G.run.alloc && G.run.ptree.own.length === 3 && G.run.stats.dex === 0 && G.run.stats.int === 6, '확정 뒤 다시 불러오면 바뀌지 않음(능력치는 노드로 다시 셈)'); void after;
}
// 큰 각인 단계 잠금 (옮기기: 패시브 → 큰 각인 → 액티브)
{ const run = newRun('spellblade'); Object.assign(run, { lv: 6, xp: 520, ch: 2, clears: 1, room: 2, phase: null, cur: null, doors: null }); delete run.tv; delete run.ptree; delete run.atree; delete run.ksGot; delete run.ksPending; run.tree = { pts: 0, open: [], spent: {} }; G.data.cur = JSON.parse(JSON.stringify(run)); G.run = null; G.sheet = null; E.resumeRun();
  D.click('allocgo'); for (const id of ['lg1C', 'lg2L', 'lg3L']) D.click('ptbuy', id); R_('ask = () => true'); D.click('allocnext'); ok(G.run.alloc.step === 'k' && G.run.ksOffer && G.run.ksOffer.length === 3, '옮기기: 큰 각인 단계에서 셋');
  ok(/패시브 단계에서만/.test(E.ptRefund(G.run, 'lg3L')), '큰 각인 단계에서 패시브 되돌리기 없음'); D.click('kspick', G.run.ksOffer.includes('lgK5') ? 'lgK5' : G.run.ksOffer[0]); ok(G.run.alloc.step === 'a' && G.run.ptree.ks.length === 1, '고르면 액티브 단계'); ok(/패시브 단계에서만/.test(E.ptRefund(G.run, 'lg3L')), '보너스 노드을 받은 뒤 패시브 노드를 뺄 수 없음(10-4)'); D.click('allocok'); ok(G.data.cur.tv === 2 && G.data.cur.ptree.ks.length === 1, '확정 저장'); }
// 캐릭터 만들기 흐름
{ G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 'm' }; G.sheet = null; G.b = null; E.startRun('spellblade'); ok(G.sheet && G.sheet.kind === 'alloc' && G.run.alloc.step === 'p' && G.creating, '만들기: 패시브 단계부터');
  D.click('ptbuy', 'lg1C'); D.click('ptref', 'lg1C'); ok(G.run.ptree.pts === 6, '만드는 동안 한 칸 되돌리기'); D.click('ptbuy', 'lg1C'); R_('ask = () => true'); D.click('allocnext'); D.click('atbuy', 'sb_ember'); D.click('allocok');
  ok(!G.creating && G.data.cur && G.data.cur.tv === 2 && G.data.cur.skills.join() === 'sb_ember' && G.run.p.hp === G.run.p.hpMax, '확정하면 캐릭터를 만들고 저장'); }
// 유산 상한 · 큰 각인 훅
{ const run = newRun('spellblade'); run.clears = 2; run.ptree.ks.push('lgK5', 'lgK9'); E.ptSync(run); ok(ysCapOf(run.p) === 6, '유산 상한은 큰 각인으로만, 최대 5 + 1 = 6(M4: 넘치는 그릇 삭제, 계승 K9는 겹 대응)'); const es = [E.mkEnemy('bruiser', false, 0)]; es[0].hp = es[0].hpMax = 5000; const b = E.newBattle(run.p, es, {}); b.stepMode = false; b.rngF = () => 0.5; E.runUntilPlayer(b); ok(run.p.ys === 4, '전투 시작 값: 깊은 샘 +1, 겹 대응 −2 → 4'); }
{ const run = newRun('spellblade'); run.clears = 2; const h0 = run.p.hpMax; run.ptree.ks.push('svK9'); E.ptSync(run); ok(E.ptBuild('spellblade').nodes.svK9.fx === 'ks_wall' && run.p.hpMax > h0, '생존 K9는 철벽(M4: 밀린 K5를 같은 방향 K9로, 무거운 갑주는 빠짐): 최대 생명력 ' + h0 + ' → ' + run.p.hpMax); }
{ const run = newRun('spellblade'); run.clears = 2; run.ptree.ks.push('suK9'); E.ptSync(run); ok(E.wardMax(run.p) === Math.round(run.p.hpMax * 0.25), '피를 두른 갑주: 보호막 상한 25%(10월 17일 보완 4, 22 → 25)'); }
// 노드 훅: 교대의 박자(교대 보호막 5) · 마검 과부하(교대 보호막 없음) · 넘친 숨(상한에 막힌 대응을 다음 차례에 +1)
function nodeFight(keys) { const run = newRun('spellblade'); run.clears = 2; for (const k of keys) { const id = Object.keys(E.ptBuild('spellblade').nodes).find(x => E.ptBuild('spellblade').nodes[x].fx === k); (E.ptBuild('spellblade').nodes[id].kind === 'keystone' ? run.ptree.ks : run.ptree.free).push(id); } E.ptSync(run); const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 0; } const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { p: run.p, b, es }; }
{ const { p, b, es } = nodeFight(['n_sb_altbeat']); p.sbLast = 'spell'; E.playerAct(b, 'basic', es[0].id); ok(b.rec.some(x => x.k === 'alt' && Math.abs(x.g - 5) < 0.01), '교대의 박자: 교대 보호막 4 → 5'); }
{ const { p, b, es } = nodeFight(['ks_sb_over']); p.sbLast = 'spell'; E.playerAct(b, 'basic', es[0].id); ok(!b.rec.some(x => x.k === 'alt'), '마검 과부하: 교대 보호막을 얻지 않음'); }
{ const { p, b, es } = nodeFight(['n_overflow']); p.ys = 5; E.ysResp(b, '막기'); ok(b.ysOvfPend === 1, '넘친 숨: 상한에 막힌 대응을 기억'); p.ys = 2; for (const e of es) e.intent = { k: 'attack' }; E.playerAct(b, 'guard'); E.playerAct(b, 'basic', es[0].id); ok(b.rec.some(x => x.k === 'ys' && x.src === 'overflow' && x.g === 1), '다음 내 차례 시작에 유산 +1'); E.ysResp(b, '막기'); ok(!b.ysOvfPend || b.ysOvfUsed, '전투마다 1번'); }
// 10월 17일 만든 사람 보완 5가지
{ const skCostAt = f('skCostAt'), skOf = f('skOf');
  { const { p, b, es } = nodeFight(['n_sb_altbeat']); p.sbLast = 'cut'; p.ys = 5; E.playerAct(b, 'sb_aegis'); E.playerAct(b, 'basic', es[0].id); ok(b.rec.filter(x => x.k === 'alt').length === 1 && b.rec.some(x => x.k === 'alt2x') && b.altDisc === 1, '보완 1: 한 차례 두 번 교대 → 교대 보호막은 한 번, 두 번째에 덤(+3)과 다음 스킬 할인');
    const mk3 = Object.assign({}, E.SK2.sb_bloodmark, { ys: 3 }); ok(skCostAt(b, skOf(p, 'sb_edge')).c === 2 && skCostAt(b, mk3).c === 2, '두 번 교대 다음 유산 3 · 4 스킬 비용 −1(3 → 2), 유산 2 스킬은 그대로(4단계 조정 SB_ALT2.min 3)');
    b.altDisc = 1; const sp = f('ysSpend'); p.ys = 5; sp(b, mk3); ok(!b.altDisc && b.rec.some(x => x.k === 'ysdisc' && x.by === 'altDbl'), '할인은 한 번 쓰면 없어짐'); }
  { const { p, b, es } = nodeFight([]); p.sbLast = 'cut'; p.ys = 5; E.playerAct(b, 'sb_aegis'); E.playerAct(b, 'basic', es[0].id); ok(!b.rec.some(x => x.k === 'alt2x') && !b.altDisc, '교대의 박자가 없으면 두 번 교대 덤 없음'); } }
{ const sbd = f('skillBaseDamage'); const run = newRun('spellblade'); const p = run.p; const s0 = sbd(p, E.SK2.sb_edge, 10), sp0 = sbd(p, E.SK2.sb_ember, 10); E.ptBuy(run, 'pw1C'); const st = run.stats;
  ok(E.ptBuild('spellblade').nodes.pw1C.kind === 'small' && p.pn.includes('n_sb_hybrid'), '보완 2: 양손의 마검은 화력 C1 작은 노드(힘 +1 · 지능 +1)에 붙음, 자리 · 종류 그대로');
  ok(Math.abs(sbd(p, E.SK2.sb_edge, 10) - 10 * (1 + (st.str + 0.3 * st.int) * 0.04)) < 1e-9 && Math.abs(sbd(p, E.SK2.sb_ember, 10) - 10 * (1 + (st.int + 0.3 * st.str) * 0.04)) < 1e-9 && s0 < sbd(p, E.SK2.sb_edge, 10), '베기는 지능의 30%, 주문은 힘의 30%를 더함'); }
{ const run = newRun('spellblade'); run.lv = 6; E.ptFix(run); E.ptBuy(run, 'lg1C'); E.ptBuy(run, 'lg2L'); E.ptBuy(run, 'lg3L'); const skOf = f('skOf');
  run.clears = 2; /* M5-0 보정 4: 갈래 2고리는 1챕터 뒤 */ for (const id of ['sb_bleedcut', 'sb_boil']) E.atBuy(run, id); E.atBuy(run, 'sb_ember'); E.treeSync(run); ok(run.p.sbLead === '혈인' && skOf(run.p, 'sb_edge').fx.some(e => e.k === 'st' && e.s === 'bleed' && e.n === 1), '보완 3: 혈인이 가장 많으면 마검 베기가 출혈 1');
  E.atBuy(run, 'sb_kindle'); E.treeSync(run); ok(run.p.sbLead === null && !skOf(run.p, 'sb_edge').fx.some(e => e.k === 'st'), '가장 많은 갈래가 둘이면 없음');
  E.atBuy(run, 'sb_char'); E.treeSync(run); ok(run.p.sbLead === '염검' && skOf(run.p, 'sb_aegis').fx.some(e => e.k === 'imbue' && e.s === 'ignite' && e.soft), '염검이면 주문 방패가 칼에 화상 1(칼이 비었을 때)');
  const w0 = E.SK2.sb_aegis.fx.find(e => e.k === 'ward').n; const run2 = newRun('spellblade'); run2.lv = 6; run2.clears = 2; E.ptFix(run2); for (const id of ['lg1C', 'lg2L', 'lg3L']) E.ptBuy(run2, id); for (const id of ['sb_bladeward', 'sb_unravel']) E.atBuy(run2, id); E.treeSync(run2); ok(skOf(run2.p, 'sb_aegis').fx.find(e => e.k === 'ward').n === w0 + 2, '마갑이면 주문 방패 보호막 +2');
  const run3 = newRun('spellblade'); run3.lv = 6; run3.clears = 2; E.ptFix(run3); for (const id of ['sb_bleedcut', 'sb_boil']) E.atBuy(run3, id); E.treeSync(run3); ok(!skOf(run3.p, 'sb_edge').fx.some(e => e.k === 'st'), '칼에 새긴 주문이 없으면 시작 스킬 그대로'); }
{ const skCostAt = f('skCostAt'), skOf = f('skOf'); const { p, b, es } = nodeFight(['ks_sb_over']); p.sbLast = 'cut'; const kinds = ['spell', 'cut', 'spell'];
  for (const k of kinds) { p.ys = 5; E.playerAct(b, k === 'spell' ? 'sb_aegis' : 'basic', k === 'cut' ? es[0].id : undefined); if (b.waiting === false && !b.over) E.runUntilPlayer(b); }
  ok(b.ovDisc === 1 && b.rec.some(x => x.k === 'ovready'), '보완 4: 마검 과부하, 교대 셋을 이으면 할인 준비'); ok(skCostAt(b, Object.assign({}, E.SK2.sb_finale, { ys: 4 })).c === 1 && skCostAt(b, skOf(p, 'sb_edge')).c === 2, '다음 유산 4 스킬 4 → 1(바닥 1), 다른 비용은 그대로');
  const hitP = IFX_NODE.ks_sb_over.hitP; ok(hitP({ sbAlt: true }) === 0.5 && hitP({ sbAlt: false }) === 0, '교대한 행동 피해 +50%(4단계 조정, 만든 사람 값 35%)'); }
{ const { p } = nodeFight(['ks_sb_blood']); ok(Math.round(p.ward) >= 6, '보완 4: 피를 두른 갑주, 전투 시작 보호막 6'); }
{ const run = newRun('spellblade'); run.lv = 16; run.clears = 2; E.ptFix(run); const A = E.atBuild('spellblade'); for (const id of ['sb_bladeward', 'sb_unravel', 'sb_finale']) assert.equal(E.atBuy(run, id), null, id); assert.equal(E.atBuy(run, 'sv_finale', 'sbu_release'), null, 'sv_finale'); run.skills = ['sb_finale']; E.treeSync(run);
  const s = f('skOf')(run.p, 'sb_finale'); ok(s.fx.findIndex(e => e.k === 'wardFirst') >= 0 && s.fx.find(e => e.k === 'wardFirst').n === 18, '보완 5: 갑주 해방은 먼저 보호막 18을 두름(M5-0 보정 4: 마갑 전개는 비용 3 · 보호막 27이 되어 숫자로 적는다)');
  const es = [E.mkEnemy('bruiser', false, 0)]; es[0].hp = es[0].hpMax = 5000; es[0].dmg = 0; const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); run.p.ward = 0; run.p.ys = 5; const hp0 = es[0].hp; E.playerAct(b, 'sb_finale', es[0].id);
  ok(es[0].hp < hp0 && run.p.ward < 1 && b.log.some(x => /먼저 마갑 전개/.test(x.m)) && b.log.some(x => /보호막 18을 태운다/.test(x.m)), '보호막이 없어도 두르고 나서 모두 태워 친다'); }
// 0.8.0 M5-0 규격(10월 19일, 전면 개편 2절): 부채꼴(sec)로 바뀐 직업은 오류, 아직 사다리인 직업은 보고만(M5-1~5에서 바꾼다)
/* 판정 대기(10월 19일): 만든 사람이 문장(숫자 포함)을 정한 마검사 경계 칸 가운데 값 띠 밖인 것. 문장 그대로 두고, 숫자를 띠에 맞출지 · 띠를 경계에 어떻게 둘지 결정을 기다린다 */
/* M5-0 마감(10월 19일 만든 사람): 숫자만 띠 하한까지 올리기로 해 대기 목록을 비웠다. 이제 경계 칸도 띠 밖이면 실패 */
const BAND_WAIT = [];
/* 띠 예외(10월 20일 만든 사람, M5-0 보정): 마갑탄은 M4대로(빠른 행동, 비용 2) 되돌렸다. 값 식(E)은 빠른 행동의 시간 몫을 세지 않아 비용 2 띠 아래다. 띠 판정과 기준 평균 모두에서 뺀다 */
const BAND_EXEMPT = ['sb_bolt'];
{ const SC = D.run_('skScore'), RING = { 1: [1, 2], 2: [2, 3], 3: [3, 4] }, BAND = { 1: [0.5, 0.65], 2: [0.85, 1.15], 3: [1.5, 1.8], 4: [2.2, 2.6] }, BOUND = ['AB', 'BC', 'CA'];
  const NUMK = ['dmg', 'brk', 'exploit', 'kwx', 'lowx', 'brokenx', 'st', 'imbue', 'ward', 'wardDmg', 'stam'], rep = [];
  for (const c of ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist']) {
    const A = E.atBuild(c), strict = !!A.sec, N = Object.values(A.nodes), S = N.filter(x => x.kind === 'skill'); const bad = [], wait = [];
    for (const x of S) assert(x.ys != null, c + ' 비용 없음 ' + x.id);
    const E_ = x => SC(Object.assign({}, E.SK2[x.id], { ys: x.ys })).E; const two = S.filter(x => x.ys === 2 && (!A.sec || ['A', 'B', 'C'].includes(x.sec)) && !BAND_EXEMPT.includes(x.id)); /* 기준 1.0 = 갈래 부채꼴의 비용 2 평균(경계 칸은 기준을 움직이지 않는다) */ const avg = two.reduce((a, x) => a + E_(x), 0) / two.length;
    for (const x of S) { const R = RING[x.ring]; if (!(x.ys >= R[0] && x.ys <= R[1]) && !(x.ring === 3 && E.SK2[x.id].once)) bad.push('고리 ' + x.id + ' r' + x.ring + ' c' + x.ys);
      const v = E_(x) / avg, B = BAND[x.ys].slice(); if (BOUND.includes(x.sec) && x.ring === 3 && x.ys === 4) B[1] *= 1.1; if (!(v >= B[0] - 1e-9 && v <= B[1] + 1e-9) && !BAND_EXEMPT.includes(x.id)) (BAND_WAIT.includes(x.id) ? wait : bad).push('값 ' + x.id + ' ' + v.toFixed(2) + '@' + x.ys + ' [' + B[0] + '–' + B[1].toFixed(2) + ']'); }
    const numUp = {}; for (const u of (A.vars ? Object.values(A.vars).map(v => Object.assign({ br: A.nodes[v.on].br }, v)) : N.filter(x => x.kind === 'upgrade'))) { const m = u.mod || {}; const pure = !m.set && !m.cond && [...(m.fxSet || []), ...(m.fxAdd || [])].every(f => NUMK.includes(f.k) && !f.when && !f.on); if (pure) numUp[u.br] = (numUp[u.br] || 0) + 1; }
    if (strict) {
      assert.deepEqual(bad, [], c + ' 규격(고리 = 비용, 값 띠)'); n++;
      for (const k of ['A', 'B', 'C']) { const r1 = S.filter(x => x.sec === k && x.ys === 1); ok(r1.length === 1 && r1[0].ring === 1 && E.SK2[r1[0].id].time !== 'fast' && E.SK2[r1[0].id].b === A.sec[k], c + ' ' + A.sec[k] + ': 리듬 칸(비용 1) 1고리에 하나, 주 행동, 갈래 꼬리표 하나'); }
      for (const x of S.filter(x => x.requires)) { const grp = x.requires.map(g => [].concat(g).map(id => A.nodes[id])); const opens = grp.flat(); ok(BOUND.includes(x.sec) && grp.length === 2 && opens.every(o => o && o.kind === 'skill' && o.ring === 1 && o.links.includes('S')) && grp.every(g => new Set(g.map(o => o.sec)).size === 1) && new Set(grp.map(g => g[0].sec)).size === 2 && opens.every(o => x.sec.includes(o.sec)), c + ' 경계 입구 ' + x.id + ': 양쪽 갈래 1고리 첫 스킬(보정 5: 갈래마다 둘 중 어느 쪽이든)'); }
    }
    rep.push(`${c}${strict ? '(규격)' : ''}: 규격 밖 ${bad.length}${wait.length ? ' · 판정 대기 ' + wait.length + ' (' + wait.join(', ') + ')' : ''} · 순수 숫자 강화 갈래별 ${JSON.stringify(numUp)}`);
  }
  console.log('M5-0 규격 보고 — ' + rep.join(' | ')); }
console.log('tree-check: ' + n + '개 통과');
