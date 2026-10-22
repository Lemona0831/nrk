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
function newRun(build, o) { G.data = E.blankData(); G.data.unlAll = 1; G.cre = Object.assign({ name: 't' }, o || {}); G.dropQ = []; G.b = null; G.sheet = null; E.startRun(build); const run = G.run; delete run.alloc; if (!(o && o.keepOffer)) delete run.offer; /* 보정 5: 제시는 따로 점검한다 */ G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run'; return run; }

// ===== 1) 스키마: 9직업 =====
for (const c of CLS) {
  const P = E.ptBuild(c), A = E.atBuild(c), ids = Object.keys(P.nodes);
  for (const T of [P, A]) for (const id in T.nodes) { const x = T.nodes[id]; for (const y of x.links) { assert(T.nodes[y], c + ' ' + id + ' → 없는 ' + y); assert(T.nodes[y].links.includes(id), c + ' 한쪽 연결 ' + id + '-' + y); } if (id !== 'S' && !x.reqTags) assert(x.links.length > 0, c + ' 고아 ' + id); } /* M5-0 보정 5: 결합 칸(reqTags)은 이웃 없이 꼬리표로 열린다 */
  ok(true, c + ': 연결이 모두 양방향, 고아 없음');
  for (const T of [P, A]) { const d = bfs(T, 'S'), free = id => T.nodes[id].reqTags || (T.nodes[id].slot && T.nodes[T.nodes[id].on].reqTags); assert.equal(Object.keys(d).filter(id => !free(id)).length, Object.keys(T.nodes).filter(id => !free(id)).length, c + ' 시작에서 닿지 않는 노드(결합 칸 제외)'); for (const k of [1, 2, 3]) { const dk = bfs(T, 'S', nd => nd.ring <= k); for (const id in T.nodes) if (T.nodes[id].ring <= k && !T.nodes[id].reqTags && !(T.nodes[id].slot && T.nodes[T.nodes[id].on].reqTags)) assert(dk[id] != null, c + ' ' + id + ' 고리 ' + k + ' 안에서 이어지지 않음'); } }
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
  const W7 = { pw2L: '피 맛', pw3R: '밴 불씨', pw5L: '벼린 눈', pw5R: '교대의 칼끝', pw7L: '흩는 손', pw7R: '마무리 칼', ct2L: '박자 끊기', ct3R: '예고 깨기', ct5L: R_('BRK_RULE').basic0 ? R_('PN_TXT').n_ct_skbrk.n : '균열 읽기', /* M5-7 붕괴 규칙: 제어 2고리 중간 노드 스킬 붕괴 */ ct5R: '무너진 틈', ct7L: '무거운 손', ct7R: '흐트러진 자세',
    ag2L: '흘린 칼끝', ag3R: '가벼운 칼', ag5L: '각오', ag5R: '먼 주문', ag7L: '가벼운 걸음', ag7R: '단숨', lg1C: '교대의 박자', lg3L: '칼에 새긴 주문', lg5L: '넘친 숨', lg5R: '세 박자', lg7L: '가득 찬 그릇', lg7R: '마력 순환',
    su2L: '겹친 갑주', su3R: '남는 마력', su5L: '승전의 숨', su5R: '두꺼운 주문 방패', su7L: '남는 온기', su7R: '피의 갑주', sv3L: '마력 갑주', sv5L: '질긴 살갗', sv5R: '보호막 아래', sv7L: '쇠 같은 몸', sv7R: '버티는 이' };
  for (const id in W7) assert.equal(nm(id), W7[id], '7-4 ' + id); const nts = Object.values(P.nodes).filter(x => x.kind === 'notable'); ok(nts.length === 35 && nts.every(x => W7[x.id]), '마검사 중간 노드 35개가 7-4 표와 같음');
  const K7 = { pwK5: '날 선 손', pwK9: '마검 과부하', ctK5: '무너뜨린 숨', ctK9: '끊는 박자', agK5: '흘린 숨', agK9: '먼저 움직임', lgK5: '깊은 샘', lgK9: '겹 대응', suK5: '피의 순환', suK9: '피를 두른 갑주', svK5: '막아 낸 숨', svK9: '철벽' }; // 0.8.0 M4 배치
  for (const id in K7) assert.equal(nm(id), K7[id], '큰 각인 ' + id); ok(Object.values(P.nodes).filter(x => x.kind === 'keystone' && x.pay).length === 4, '큰 각인 12, 대가 있는 것 4');
  ok(P.nodes.pw2L.stat == null && P.nodes.pw2R.fx === 'n_bs_dmg' && P.nodes.pw2R.stat == null && P.nodes.pw3L.fx === 'n_bs_brk' && P.nodes.pw1C.stat.str === 1 && P.nodes.pw1C.stat.int === 1 && P.nodes.ct1C.sm === 'brk' && P.nodes.lg2L.sm === 'st' && P.nodes.sv1C.stat.con === 2 && P.nodes.su1C.stat.wil === 2 && P.nodes.ag1C.fx === 'n_bs_dmg2' && P.nodes.ag2R.fx === 'n_bs_st' && P.nodes.ag3L.stat.dex === 2, '작은 노드: 화력 · 기민 1고리 앞 두 칸은 평타 노드(M4), 화력 C 힘1 지능1, 제어 붕괴, 계승 스태미나, 생존 체력, 유지력 의지, 기민 민첩');
  ok(JSON.stringify(P.nodes.S.stat) === JSON.stringify({ str: 5, int: 5, con: 3, wil: 1 }), '시작 노드 힘5 지능5 체력3 의지1(4단계: 12 → 14점)');
  /* 0.8.0 M5-0 보정 4(10월 20일 만든 사람): 여섯 부채꼴 같은 크기. 옛 5단계 8-2 · 8-3 표(22칸 + 강화 23)는 이 규격으로 바뀌었다 */
  const BOUND_ATK_WAIT = [], atkWait = []; // 보정 5(만든 사람 결정): 피막 · 불씨 갑주도 공격 칸(베기)으로 바꿔 경계마다 공격 2
  const SECN = { A: [], AB: [], B: [], BC: [], C: [], CA: [] }; for (const x of Object.values(A.nodes)) if (x.sec) SECN[x.sec].push(x);
  const skOfSec = k => SECN[k].filter(x => x.kind === 'skill'), upOfSec = k => SECN[k].filter(x => x.kind === 'upgrade');
  for (const k of ['A', 'B', 'C']) { const S6 = skOfSec(k), r = n => S6.filter(x => x.ring === n); ok(S6.length === 7 && upOfSec(k).length === 7 && upOfSec(k).every(u => u.slot && u.vars.length === 2), A.sec[k] + ': 갈래 스킬 노드 7(찍을 수 있는 칸 6) · 스킬마다 변형 자리 하나에 변형 둘(M5-0c) (' + S6.length + ' · ' + upOfSec(k).length + ')');
    const op = r(1).filter(x => x.ys === 2); ok(r(1).length === 3 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op.length === 2 && op[0].excl === op[1].id && op[1].excl === op[0].id && r(2).length === 2 && r(2).every(x => x.ys >= 2 && x.ys <= 3) && r(3).length === 2 && r(3).every(x => x.ys >= 3 && x.ys <= 4), A.sec[k] + ': 1고리 첫 스킬 둘(둘 중 하나, 보정 5) + 리듬 1, 2고리 2칸(2–3), 3고리 2칸(3–4)');
    /* M5-0c 길 둘: 첫 스킬 쌍이 길 a · b를 고르고 2고리 · 3고리가 길마다 한 칸, 길 a는 왼쪽(L) · 길 b는 오른쪽(R). 2고리는 어느 첫 스킬에서든, 3고리는 어느 2고리에서든 */
    ok([1, 2, 3].every(g => { const L = r(g).filter(x => x.path); return L.length === 2 && L.map(x => x.path).sort().join() === 'a,b' && L.every(x => (x.path === 'a') === /L/.test(x.pos.lane)); }) && r(2).every(x => op.every(o => x.links.includes(o.id))) && r(3).every(x => r(2).every(y => x.links.includes(y.id))) && ['a', 'b'].every(w => E.SK2[r(1).find(x => x.path === w).id].kind !== E.SK2[r(2).find(x => x.path === w).id].kind), A.sec[k] + ': 길 a · b(1고리 쌍 → 2고리 → 3고리, a 왼쪽 · b 오른쪽, 1고리 · 2고리는 베기 · 주문 엇갈림 — 만든 사람 답), ' + ['a', 'b'].map(w => w + ' ' + [1, 2, 3].map(g => r(g).find(x => x.path === w).n).join(' → ')).join(' / ')); }
  for (const k of ['AB', 'BC', 'CA']) { const S5 = skOfSec(k), r = n => S5.filter(x => x.ring === n), fin4 = S5.filter(x => x.ys === 4); ok(!S5.some(x => x.finOf) && fin4.length === 1 && E.SK2[fin4[0].id].line, A.sec[k] + ': 승부수는 대사 승부수 하나(후보 제도 폐지, M5-0c) — ' + fin4.map(x => x.n).join()); ok(S5.length === 5 && upOfSec(k).length === 5 && upOfSec(k).every(u => u.slot && u.vars.length === 2), A.sec[k] + ': 경계 스킬 5 · 변형 자리 5(변형 둘씩) (' + S5.length + ' · ' + upOfSec(k).length + ')');
    ok(!r(1).length && r(2).map(x => x.ys).join() === '2,2' && r(3).map(x => x.ys).sort().join() === '3,3,4' && r(2).filter(x => x.requires).length === 1, A.sec[k] + ': 2고리 입구 + 둘째(2 · 2), 3고리 둘 + 승부수(3 · 3 · 4), 1고리 없음');
    const ent = r(2).find(x => x.requires), two = r(2).find(x => !x.requires), fin = r(3).find(x => x.ys === 4), mid = r(3).filter(x => x.ys === 3);
    ok(two.links.includes(ent.id) && mid.every(x => x.links.includes(two.id)) && mid.every(x => fin.links.includes(x.id)), A.sec[k] + ': 입구 → 둘째 → 3고리 둘 → 승부수로 이어짐');
    /* M5-0 보정 5(만든 사람): 경계 5칸 = 공격 2 · 강화/방어 2 · 승부수 1. 공격 = 적을 겨누고 피해를 주는 칸 */
    const atk = S5.filter(x => x.ys !== 4 && E.SK2[x.id].tgt !== 'self').length; /* M5-0c(만든 사람 표): 공격 = 적을 겨누는 칸(달아오른 칼날은 피해 없이 상태를 더하는 공격 칸) */ const msg = A.sec[k] + ': 공격 ' + atk + ' · 강화/방어 ' + (4 - atk) + ' · 승부수 1';
    if (BOUND_ATK_WAIT.includes(k)) atkWait.push(msg); else ok(atk === 2, msg); }
  { const sk = Object.values(A.nodes).filter(x => x.kind === 'skill'), up = Object.values(A.nodes).filter(x => x.kind === 'upgrade'); ok(sk.length === 39 && up.length === 36 && Object.keys(A.vars).length === 75 && Object.values(A.vars).filter(v => v.mut).length === 3, '마검사 스킬 노드 39(갈래 21 · 경계 15 · 결합 3) + 변형 자리 36 · 변형 72 + 변종 3 (M5-0c, ' + sk.length + ' + ' + up.length + ' · ' + Object.keys(A.vars).length + ')');
    /* M5-0c 변형: 자리마다 깊게(deep) 하나 · 잇기(link) 하나. 잇기는 그 스킬에 없던 다른 빌드의 꼬리표를 하나 이상 더한다. 깊게의 순수 숫자 변형은 갈래마다 둘까지 */
    const NUMK = ['dmg', 'brk', 'exploit', 'kwx', 'lowx', 'brokenx', 'st', 'imbue', 'ward', 'wardDmg', 'stam'], BRIDGE = ['출혈', '화상', '보호막', '흘리기', '기본공격연동', '교대'], STG = D.run_('SB_TAGS'), pureN = {};
    for (const u of up) { const V = u.vars.map(v => A.vars[v]); ok(V.map(v => v.v).sort().join() === 'deep,link', u.id + ': 깊게 하나 · 잇기 하나'); const lk = V.find(v => v.v === 'link'); ok(lk.tags.some(g => BRIDGE.includes(g) && !(STG[u.on] || []).includes(g)), u.id + ' 잇기 ' + lk.n + ': 없던 꼬리표 ' + lk.tags.filter(g => !(STG[u.on] || []).includes(g)).join() + ' 더함');
      const dp = V.find(v => v.v === 'deep'), m = dp.mod; if (!m.set && !m.cond && [...(m.fxSet || []), ...(m.fxAdd || [])].every(f => NUMK.includes(f.k))) pureN[u.br] = (pureN[u.br] || 0) + 1; }
    ok(Object.values(pureN).every(n => n <= 2), '깊게의 순수 숫자 변형 갈래마다 둘까지 ' + JSON.stringify(pureN));
    /* 이름 규칙(M5-0c 만든 사람): 한 직업 안 같은 이름 0, 상태 · 부채꼴(경계) 이름과 같은 스킬 이름 0 */
    const nm = sk.map(x => x.n).concat(Object.values(A.vars).map(v => v.n)), dup = nm.filter((x, i) => nm.indexOf(x) !== i), SN = Object.values(D.run_('SNAMES')).concat(Object.values(A.sec)); const clash = sk.filter(x => SN.includes(x.n)).map(x => x.n);
    ok(!dup.length && !clash.length, '마검사 트리 이름 겹침 0(스킬 · 변형), 상태 · 부채꼴 이름과 같은 스킬 0' + (dup.length || clash.length ? ' — ' + dup.concat(clash).join(', ') : '')); }
  if (atkWait.length) console.log('경계 공격 칸 판정 대기(만든 사람 결정): ' + atkWait.join(' / '));
  { const CUT = ['sb_whirl', 'sb_heated', 'sb_snuff', 'sb_rebound', 'sb_sunder', 'sb_bloodecho', 'sb_ashhand', /* M5-0c */ 'sb_redwind', 'sb_deluge', 'sb_kindle', 'sb_tome', 'sb_unravel', 'sb_turn', 'sb_searspread', 'sb_searburst', 'sb_atone', 'sb_ashstorm']; ok(CUT.every(id => !A.nodes[id] && E.SK2[id]), '트리에 없는 칸(스킬 데이터는 남음, M5-0c: 붉은 바람 · 혈우 낙하 · 염화 부여 · 불의 서 · 마력 교란 · 회류참 · 핏불 번짐 · 승부수 후보 셋): ' + CUT.join(' '));
    ok(['sbu_graze', 'sbu_scarlet', 'sbu_thirst', 'sbu_exec', 'sbu_fog', 'sbu_whet', 'sbu_ash', 'sbu_rush', 'sbu_coil', 'sbu_firefall', 'sbu_twin', 'sbu_measure', 'sbu_rhythm', 'sbu_coda'].every(id => !A.nodes[id]), '자른 강화 14'); }
  { const ent = ['sb_bloodfire', 'sb_bloodmail', 'sb_heatmail'].map(id => A.nodes[id]); const budget = 2 + 5 + 3; /* 보정 5: 변형 자리를 다 열면 2 + 5 + 5 = 12 */ ok(ent.every(x => x.requires.length === 2 && x.requires.every(g => Array.isArray(g) && g.length === 2)) && budget <= E.AT_PTS.start + E.AT_PTS.lv * 15, '경계 빌드 포인트: 양쪽 개시 2 + 경계 5 + 강화 3 = ' + budget + '점, Lv16 ' + (E.AT_PTS.start + E.AT_PTS.lv * 15) + '점 안'); }
  { const U = D.run_('SB_BOUND'), T = id => E.SK2[id].fx.map(e => e.txt || '').join(' ');
    ok(T('sb_hotedge').includes('화상 +' + U.crossN) && T('sb_shackle').includes('붕괴 +' + U.shackleBrk) && T('sb_embercut').includes(U.emberCutBurn + '까지') && T('sb_cindermail').includes('화상 ' + U.cinderIgn) && T('sb_film').includes(Math.round(U.filmPer * 100) + '%') && T('sb_embermail').includes('화상 ' + U.emberIgn), '경계 문장의 숫자가 SB_BOUND와 같음'); }
}



// ===== 0.8.0 M5-1 파수꾼 재설계(10월 20일 만든 사람 설계지 + 07:40 보완): M5-0c 규격 그대로 =====
{ const A = E.atBuild('warden'), N = Object.values(A.nodes), SK = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.slot);
  ok(JSON.stringify(A.sec) === JSON.stringify({ A: '성벽', AB: '공성추', B: '파쇄', BC: '기둥 파쇄', C: '전열 장악', CA: '용맹의 투지' }), '파수꾼 부채꼴 여섯: 성벽 · 공성추 · 파쇄 · 기둥 파쇄 · 전열 장악 · 용맹의 투지');
  ok(SK.length === 39 && up.length === 36 && Object.keys(A.vars).length === 72, '파수꾼 스킬 노드 39(갈래 21 · 경계 15 · 결합 3) + 변형 자리 36 · 변형 72');
  for (const k of ['A', 'B', 'C']) { const S6 = SK.filter(x => x.sec === k), r = n => S6.filter(x => x.ring === n), op = r(1).filter(x => x.ys === 2);
    ok(S6.length === 7 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op[0].excl === op[1].id && r(2).length === 2 && r(3).length === 2, A.sec[k] + ': 1고리 첫 스킬 둘(길) + 리듬 1, 2고리 2 · 3고리 2');
    ok([1, 2, 3].every(g => r(g).filter(x => x.path).map(x => x.path).sort().join() === 'a,b'), A.sec[k] + ': 길 a · b — ' + ['a', 'b'].map(w => [1, 2, 3].map(g => r(g).find(x => x.path === w).n).join(' → ')).join(' / ')); }
  ok(['w_dstance', 's_astance'].every(id => A.nodes[id].ring === 1 && A.nodes[id].path === 'a' && E.SK2[id].fx.some(e => e.k === 'wdStance')) && A.nodes.w_shieldhit.path === 'b' && A.nodes.s_slam.path === 'b' && A.nodes.f_sweep.path === 'a' && A.nodes.f_chainblade.path === 'b', '1고리: 성벽 수비 태세 / 방패 가격, 파쇄 공격 태세 / 내리 찍기, 전열 장악 개기식 / 사슬의 검(만든 사람)');
  ok(A.nodes.w_pray.ring === 1 && A.nodes.s_regret.ring === 1 && A.nodes.f_stomp.ring === 1 && E.SK2.w_pray.n === '신성한 기도' && E.SK2.s_regret.n === '회한의 검' && E.SK2.f_stomp.n === '발 구르기', '리듬 칸: 신성한 기도 · 회한의 검 · 발 구르기(만든 사람)');
  for (const k of ['AB', 'BC', 'CA']) { const S5 = SK.filter(x => x.sec === k), fin = S5.filter(x => x.ys === 4); const atk = S5.filter(x => x.ys !== 4 && E.SK2[x.id].tgt !== 'self').length;
    ok(S5.length === 5 && fin.length === 1 && E.SK2[fin[0].id].line && atk === 2, A.sec[k] + ': 경계 5칸(공격 2 · 강화/방어 2 · 대사 승부수 ' + (fin[0] && fin[0].n) + ')'); }
  ok(E.SK2.w_siege.line === '「지키지 못하는 성벽 따위, 이 나락에서는 사치임이 분명하구나.」' && E.SK2.s_quake.line === '「네놈들의 방어선을, 쳐부숴주마.」' && E.SK2.w_valor.line === '「이 몸이 물러설 장소 따위. 이미 사라진지 오래렸다.」' && E.SK2.w_siege.cut === 'blade' && E.SK2.w_valor.cut === 'guard', '승부수 대사 셋(만든 사람 문장 그대로) · 컷인 종류');
  const STG = D.run_('WD_TAGS'), BRIDGE = ['보호막', '붕괴', '태세', '기본공격연동', '원거리', '광역'], pureN = {};
  for (const u of up) { const V = u.vars.map(v => A.vars[v]); ok(V.length === 2 && V.map(v => v.v).sort().join() === 'deep,link', u.id + ': 깊게 하나 · 잇기 하나'); const lk = V.find(v => v.v === 'link'); ok(lk.tags.some(g => BRIDGE.includes(g) && !(STG[u.on] || []).includes(g)), u.id + ' 잇기 ' + lk.n + ': 없던 꼬리표 더함');
    const m = V.find(v => v.v === 'deep').mod; if (!m.set && !m.cond && [...(m.fxSet || []), ...(m.fxAdd || [])].every(f => ['dmg', 'brk', 'st', 'ward', 'wardFill', 'thorn', 'wdPray', 'wdMarch', 'wdNextBrk', 'wardBurn'].includes(f.k))) pureN[u.br] = (pureN[u.br] || 0) + 1; }
  ok(Object.values(pureN).every(n => n <= 2), '파수꾼 깊게의 순수 숫자 변형 갈래마다 둘까지 ' + JSON.stringify(pureN));
  const nm = SK.map(x => x.n).concat(Object.values(A.vars).map(v => v.n)), dup = nm.filter((x, i) => nm.indexOf(x) !== i), SNv = Object.values(D.run_('SNAMES')).concat(Object.values(A.sec)), clash = SK.filter(x => SNv.includes(x.n) || x.n === '자세').map(x => x.n);
  ok(!dup.length && !clash.length, '파수꾼 이름 겹침 0, 상태 · 부채꼴 · 수도승 "자세"와 같은 스킬 이름 0' + (dup.length || clash.length ? ' — ' + dup.concat(clash).join(', ') : ''));
  ok(['w_turncoat', 's_hammerhand', 'f_chainpull'].every(id => A.nodes[id].reqTags) && A.nodes.w_turncoat.reqTags.태세 === 2 && A.nodes.f_chainpull.reqTags.원거리 === 1, '결합 칸 셋(돌아선 방패 태세 2 · 쇠망치 손 기본공격연동 2 · 붕괴 1 · 사슬 끌기 원거리 1 · 보호막 1)');
  ok(A.nodes.sv_w_dstance && A.nodes.sv_s_astance && A.nodes.sv_w_dstance.on === 'w_dstance', '변형 자리 id는 스킬 id 전체(sv_w_dstance · sv_s_astance가 겹치지 않음)'); }

// ===== 0.8.0 M5-2 수도승 액티브 재설계(10월 20일 만든 사람 설계지 2판) =====
{ const A = E.atBuild('monk'), N = Object.values(A.nodes), SK = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.slot), SK2 = E.SK2;
  ok(JSON.stringify(A.sec) === JSON.stringify({ A: '철권', AB: '반탄', B: '부동', BC: '역혈', C: '혈도', CA: '파혈' }), '수도승 부채꼴 여섯: 철권 · 반탄 · 부동 · 역혈 · 혈도 · 파혈');
  ok(SK.length === 39 && up.length === 36 && Object.keys(A.vars).length === 72, '수도승 스킬 노드 39(갈래 21 · 경계 15 · 결합 3) + 변형 자리 36 · 변형 72');
  for (const k of ['A', 'B', 'C']) { const S6 = SK.filter(x => x.sec === k), r = n => S6.filter(x => x.ring === n), op = r(1).filter(x => x.ys === 2);
    ok(S6.length === 7 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op[0].excl === op[1].id && r(2).length === 2 && r(3).length === 2, A.sec[k] + ': 1고리 첫 스킬 둘(길) + 리듬 1, 2고리 2 · 3고리 2');
    ok([1, 2, 3].every(g => r(g).filter(x => x.path).map(x => x.path).sort().join() === 'a,b'), A.sec[k] + ': 길 a · b — ' + ['a', 'b'].map(w => [1, 2, 3].map(g => r(g).find(x => x.path === w).n).join(' → ')).join(' / ')); }
  const nm = id => SK2[id].n; ok([['m_yeonhwan', '연환권', 'a'], ['m_bunggwon', '붕권', 'b'], ['m_geumgang', '금강 자세', 'a'], ['m_yusu', '유수 자세', 'b'], ['m_jeomhyeol', '점혈', 'a'], ['m_sahyeol', '사혈', 'b']].every(([id, n, w]) => nm(id) === n && A.nodes[id].ring === 1 && A.nodes[id].path === w), '1고리 길(설계지): 철권 연환권 / 붕권, 부동 금강 자세 / 유수 자세, 혈도 점혈 / 사혈');
  ok(nm('m_hoheup') === '호흡' && nm('m_balgyeong') === '발경' && nm('m_maek') === '맥 짚기' && [['m_cheonsu', '천수연타'], ['m_eungchuk', '기공 응축'], ['m_baekbo', '백보신권'], ['m_myeolgak', '멸각'], ['m_cheolsan', '철산고'], ['m_budong', '부동심'], ['m_cheongeun', '천근추'], ['m_bulgoe', '금강불괴'], ['m_bongswae', '혈맥 봉쇄'], ['m_talgi', '탈기'], ['m_poswae', '사혈 폭쇄'], ['m_talhon', '탈혼수']].every(([id, n]) => nm(id) === n), '리듬 칸 호흡 · 발경 · 맥 짚기, 2 · 3고리 이름(설계지)');
  for (const k of ['AB', 'BC', 'CA']) { const S5 = SK.filter(x => x.sec === k), fin = S5.filter(x => x.ys === 4); const atk = S5.filter(x => x.ys !== 4 && SK2[x.id].tgt !== 'self').length;
    ok(S5.length === 5 && fin.length === 1 && SK2[fin[0].id].line && atk === 2, A.sec[k] + ': 경계 5칸(공격 2 · 강화/방어 2 · 대사 승부수 ' + (fin[0] && fin[0].n) + ')'); }
  ok(SK2.m_yeokcheon.line === '「쳐라. 네놈이 휘두른 그 힘이, 곧 나의 주먹이 될 터이니.」' && SK2.m_cheonmang.line === '「나를 친 그 손이, 이미 너의 숨통을 내게 쥐여 주었음을 알지 못하는구나.」' && SK2.m_ilji.line === '「단 한 점이면 족하다. 무너지는 것은, 언제나 안에서부터이니.」' && SK2.m_yeokcheon.cut === 'guard' && SK2.m_cheonmang.cut === 'arcane' && SK2.m_ilji.cut === 'blade', '승부수 대사 셋(만든 사람 문장 그대로) · 컷인 종류(역천권 방어 · 천망 마법 · 일지멸맥 검)');
  ok(SK2.m_yeokcheon.pay === '방어 불가, 받는 피해 +30%.' && SK2.m_cheonmang.pay === '되받기 피해 0.' && SK2.m_ilji.pay === '생명력 10%, 3차례 기를 얻지 못함.', '승부수 대가(설계지 문장)');
  const STG = R_('MK_TAGS'), BRIDGE = ['기', '되받기', '자세', '둔화', '봉인', '붕괴', '기본공격연동', '광역', '원거리'], pureN = {};
  for (const u of up) { const V = u.vars.map(v => A.vars[v]); ok(V.length === 2 && V.map(v => v.v).sort().join() === 'deep,link', u.id + ': 깊게 하나 · 잇기 하나'); const lk = V.find(v => v.v === 'link'); ok(lk.tags.some(g => BRIDGE.includes(g) && !(STG[u.on] || []).includes(g)), u.id + ' 잇기 ' + lk.n + ': 없던 꼬리표 더함');
    const m = V.find(v => v.v === 'deep').mod; if (!m.set && !m.cond && [...(m.fxSet || []), ...(m.fxAdd || [])].every(f => ['dmg', 'brk', 'st', 'stam'].includes(f.k))) pureN[u.br] = (pureN[u.br] || 0) + 1; }
  ok(Object.values(pureN).every(n => n <= 2), '수도승 깊게의 순수 숫자 변형 갈래마다 둘까지 ' + JSON.stringify(pureN));
  const nms = SK.map(x => x.n).concat(Object.values(A.vars).map(v => v.n)), dup = nms.filter((x, i) => nms.indexOf(x) !== i), SNv = Object.values(R_('SNAMES')).concat(Object.values(A.sec)), clash = SK.filter(x => SNv.includes(x.n)).map(x => x.n);
  ok(!dup.length && !clash.length, '수도승 이름 겹침 0, 상태 · 부채꼴과 같은 스킬 이름 0' + (dup.length || clash.length ? ' — ' + dup.concat(clash).join(', ') : ''));
  ok(A.nodes.m_samjae.reqTags.기 === 2 && A.nodes.m_samjae.reqTags.되받기 === 1 && A.nodes.m_yeokryu.reqTags.둔화 === 1 && A.nodes.m_yeokryu.reqTags.기본공격연동 === 1 && A.nodes.m_bultoe.reqTags.자세 === 1 && A.nodes.m_bultoe.reqTags.붕괴 === 1, '결합 칸 셋(삼재권 기 2 · 되받기 1, 역류 둔화 1 · 기본공격연동 1, 불퇴 자세 1 · 붕괴 1)');
  ok(R_('MONK').ctrMax === 2, '되받기 기본 한도 2(만든 사람 결정 10월 20일)');
  const NEWST = ['chillCut', 'freeze', 'chillShatter', 'chillSpread']; ok(SK.every(x => !SK2[x.id].fx.some(e => NEWST.includes(e.k))) && Object.values(A.vars).every(v => ![...(v.mod.fxSet || []), ...(v.mod.fxAdd || [])].some(e => NEWST.includes(e.k))), '사냥꾼 · 원소술사의 둔화 계열 키를 쓰지 않음(수도승 문서 A절)');
  /* 칸 설명은 한 줄(만든 사람): 수도승부터 효과 문장 40자 넘으면 경고. 승부수(대사가 있는 칸)는 만든 사람 문장 그대로라 뺀다 */
  const MAX = R_('MK_DESC_MAX'), long = []; for (const x of SK) { const s = SK2[x.id]; if (s.line) continue; const d = E.skBody(s); if (d.length > MAX) long.push(s.n + '(' + d.length + ')'); }
  for (const v of Object.values(A.vars)) if (v.d && v.d.length > MAX) long.push(v.n + '(' + v.d.length + ')');
  if (long.length) console.warn('경고: 수도승 설명 ' + MAX + '자 넘음 — ' + long.join(', ')); else n++; }

// ===== 0.8.0 M5-3 암살자 액티브 재설계(10월 20일 만든 사람 설계지 4판) =====
{ const A = E.atBuild('assassin'), N = Object.values(A.nodes), SK = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.slot), SK2 = E.SK2;
  ok(JSON.stringify(A.sec) === JSON.stringify({ A: '독사', AB: '독화', B: '격발', BC: '암영', C: '그림자', CA: '잔영' }), '암살자 부채꼴 여섯: 독사 · 독화 · 격발 · 암영 · 그림자 · 잔영');
  ok(SK.length === 39 && up.length === 36 && Object.keys(A.vars).length === 72, '암살자 스킬 노드 39(갈래 21 · 경계 15 · 결합 3) + 변형 자리 36 · 변형 72');
  for (const k of ['A', 'B', 'C']) { const S6 = SK.filter(x => x.sec === k), r = n => S6.filter(x => x.ring === n), op = r(1).filter(x => x.ys === 2);
    ok(S6.length === 7 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op[0].excl === op[1].id && r(2).length === 2 && r(3).length === 2, A.sec[k] + ': 1고리 첫 스킬 둘(길) + 리듬 1, 2고리 2 · 3고리 2');
    ok([1, 2, 3].every(g => r(g).filter(x => x.path).map(x => x.path).sort().join() === 'a,b'), A.sec[k] + ': 길 a · b — ' + ['a', 'b'].map(w => [1, 2, 3].map(g => r(g).find(x => x.path === w).n).join(' → ')).join(' / ')); }
  const nm = id => SK2[id].n; ok([['a_dokkal', '독 바른 칼', 'a'], ['a_dokan', '독안개', 'b'], ['a_gyeokpyo', '격발 표창', 'a'], ['a_gyeokjjil', '격발 찌르기', 'b'], ['a_heulbe', '흘려 베기', 'a'], ['a_balbgi', '그림자 밟기', 'b']].every(([id, n, w]) => nm(id) === n && A.nodes[id].ring === 1 && A.nodes[id].path === w), '1고리 길(설계지): 독사 독 바른 칼 / 독안개, 격발 격발 표창 / 격발 찌르기, 그림자 흘려 베기 / 그림자 밟기');
  ok(nm('a_dokchim') === '독침' && nm('a_bangul') === '독 한 방울' && nm('a_gyeonu') === '칼끝 겨누기' && [['a_godok', '고독'], ['a_beonji', '독 번지기'], ['a_maengdok', '맹독'], ['a_yeokbyeong', '역병'], ['a_dokpyo', '독 표창'], ['a_dokssae', '독 쐐기'], ['a_yeonswae', '연쇄 격발'], ['a_gyeolsan', '독 결산'], ['a_heulkal', '흘린 칼'], ['a_hugyeol', '후열 기습'], ['a_kalchum', '그림자 칼춤'], ['a_cheohyeong', '그림자 처형']].every(([id, n]) => nm(id) === n), '리듬 칸 독침 · 독 한 방울 · 칼끝 겨누기, 2 · 3고리 이름(설계지)');
  ok(['a_vital', 'a_slip'].every(id => SK2[id].start) && JSON.stringify(R_('TREE2').assassin.starters) === JSON.stringify(['a_vital', 'a_slip']), '시작 스킬 그대로(급소 찌르기 · 몸 빼기)');
  for (const k of ['AB', 'BC', 'CA']) { const S5 = SK.filter(x => x.sec === k), fin = S5.filter(x => x.ys === 4); const atk = S5.filter(x => x.ys !== 4 && SK2[x.id].tgt !== 'self').length;
    ok(S5.length === 5 && fin.length === 1 && SK2[fin[0].id].line && atk === 2, A.sec[k] + ': 경계 5칸(공격 2 · 강화/방어 2 · 대사 승부수 ' + (fin[0] && fin[0].n) + ')'); }
  ok(SK2.a_mandok.line === '「피어나라. 한 송이도 남김없이 아름다울 기생화를.」' && SK2.a_muyeong.line === '「보이지 않는 칼이야말로, 가장 깊이 박히는 법이렸다.」' && SK2.a_janyeong.line === '「그림자는 하나가 아니다. 네가 벤 것은, 처음부터 내가 아니었으니.」' && SK2.a_mandok.cut === 'arcane' && SK2.a_muyeong.cut === 'blade' && SK2.a_janyeong.cut === 'guard', '승부수 대사 셋(만든 사람 문장 그대로) · 컷인 종류(만독개화 마법 · 무영살 검 · 잔영난무 방어)');
  ok(SK2.a_mandok.pay === '쓰는 즉시 지금 생명력에서 최대 생명력의 15%를 잃는다(최대치는 그대로). 지금 생명력이 최대치의 15% 이하면 쓸 수 없다.' && SK2.a_muyeong.pay === '숨은 차례에는 아무것도 못 한다. 벤 뒤 2차례 흘리기를 못 한다.' && SK2.a_janyeong.pay === '그동안 받는 피해 +20%, 끝난 뒤 2차례 스태미나가 차지 않는다.', '승부수 대가(설계지 문장)');
  const ULT = ['asBloom', 'asHide', 'asZan'], PS = e => e.k === 'poison' || (e.poison > 0); ok(SK.every(x => !SK2[x.id].fx.some(e => ULT.includes(e.k)) || x.ys === 4) && Object.values(A.vars).every(v => ![...(v.mod.fxSet || []), ...(v.mod.fxAdd || [])].some(e => (e.k === 'asHide' || e.k === 'asZan') && PS(e))) && !SK2.a_muyeong.fx.some(PS) && !SK2.a_janyeong.fx.some(PS), '새 상태(숨음 · 분신 · 모아 터뜨리기)는 승부수에만, 승부수 가운데 독은 만독개화만(변형 포함)');
  const STG = R_('AS_TAGS'), BRIDGE = ['중독', '터뜨리기', '흘리기', '후열', '기본공격연동', '붕괴', '광역', '원거리'], pureN = {};
  for (const u of up) { const V = u.vars.map(v => A.vars[v]); ok(V.length === 2 && V.map(v => v.v).sort().join() === 'deep,link', u.id + ': 깊게 하나 · 잇기 하나'); const lk = V.find(v => v.v === 'link'); ok(lk.tags.some(g => BRIDGE.includes(g) && !(STG[u.on] || []).includes(g)), u.id + ' 잇기 ' + lk.n + ': 없던 꼬리표 더함');
    const m = V.find(v => v.v === 'deep').mod; if (!m.set && !m.cond && [...(m.fxSet || []), ...(m.fxAdd || [])].every(f => ['dmg', 'brk', 'st', 'stam'].includes(f.k))) pureN[u.br] = (pureN[u.br] || 0) + 1; }
  ok(Object.values(pureN).every(n => n <= 2), '암살자 깊게의 순수 숫자 변형 갈래마다 둘까지 ' + JSON.stringify(pureN));
  const nms = SK.map(x => x.n).concat(Object.values(A.vars).map(v => v.n)), dup = nms.filter((x, i) => nms.indexOf(x) !== i), SNv = Object.values(R_('SNAMES')).concat(Object.values(A.sec)), clash = SK.filter(x => SNv.includes(x.n) && x.n !== '역병').map(x => x.n); // 역병: 설계지 이름 그대로(같은 이름의 상태가 있음 — M5-3 보고서)
  ok(!dup.length && !clash.length, '암살자 이름 겹침 0, 상태 · 부채꼴과 같은 스킬 이름 0(설계지 이름 역병 빼고)' + (dup.length || clash.length ? ' — ' + dup.concat(clash).join(', ') : ''));
  ok(A.nodes.a_dokni.reqTags.중독 === 2 && A.nodes.a_dokni.reqTags.기본공격연동 === 1 && A.nodes.a_heuldok.reqTags.흘리기 === 1 && A.nodes.a_heuldok.reqTags.중독 === 1 && A.nodes.a_dwikkot.reqTags.터뜨리기 === 1 && A.nodes.a_dwikkot.reqTags.후열 === 1, '결합 칸 셋(독니 중독 2 · 기본공격연동 1, 흘린 독 흘리기 1 · 중독 1, 등 뒤의 꽃 터뜨리기 1 · 후열 1)');
  ok(SK2.a_gyeokjjil.fx.find(e => e.k === 'burst').mul === 1.5 && SK2.a_godok.fx.find(e => e.k === 'grow').mul === 2 && R_('AS_BOUND').virMin === 10 && R_('AS_BOUND').bloomHp === 0.15 && R_('AS_BOUND').zanIn === 0.2 && R_('AS_BOUND').hideNoParry === 2 && R_('AS_BOUND').zanNoStam === 2, '설계지 숫자: 격발 찌르기 1.5배 · 고독 ×2 · 맹독 10 · 대가 15% · +20% · 2차례');
  /* 칸 설명은 한 줄(만든 사람): 효과 문장 40자 넘으면 경고. 승부수(대사가 있는 칸)는 만든 사람 문장 그대로라 뺀다 */
  const MAX = R_('MK_DESC_MAX'), long = []; for (const x of SK) { const s = SK2[x.id]; if (s.line) continue; const d = E.skBody(s); if (d.length > MAX) long.push(s.n + '(' + d.length + ')'); }
  for (const v of Object.values(A.vars)) if (v.d && v.d.length > MAX) long.push(v.n + '(' + v.d.length + ')');
  if (long.length) console.warn('경고: 암살자 설명 ' + MAX + '자 넘음 — ' + long.join(', ')); else n++; }

// ===== 0.8.0 M5-4 사냥꾼 액티브 재설계(10월 20일 만든 사람 설계지 2판) =====
{ const A = E.atBuild('hunter'), N = Object.values(A.nodes), SK = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.slot), SK2 = E.SK2;
  ok(JSON.stringify(A.sec) === JSON.stringify({ A: '저격', AB: '명궁', B: '연사', BC: '유격', C: '기동', CA: '잠복' }), '사냥꾼 부채꼴 여섯: 저격 · 명궁 · 연사 · 유격 · 기동 · 잠복');
  ok(SK.length === 39 && up.length === 36 && Object.keys(A.vars).length === 72, '사냥꾼 스킬 노드 39(갈래 21 · 경계 15 · 결합 3) + 변형 자리 36 · 변형 72');
  for (const k of ['A', 'B', 'C']) { const S6 = SK.filter(x => x.sec === k), r = n => S6.filter(x => x.ring === n), op = r(1).filter(x => x.ys === 2);
    ok(S6.length === 7 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op[0].excl === op[1].id && r(2).length === 2 && r(3).length === 2, A.sec[k] + ': 1고리 첫 스킬 둘(길) + 리듬 1, 2고리 2 · 3고리 2');
    ok([1, 2, 3].every(g => r(g).filter(x => x.path).map(x => x.path).sort().join() === 'a,b'), A.sec[k] + ': 길 a · b — ' + ['a', 'b'].map(w => [1, 2, 3].map(g => r(g).find(x => x.path === w).n).join(' → ')).join(' / ')); }
  const nm = id => SK2[id].n; ok([['h5_pierce', '꿰뚫는 화살', 'a'], ['h5_prey', '사냥감 지정', 'b'], ['h5_volley', '연속 사격', 'a'], ['h5_nock', '화살 재기', 'b'], ['h5_counter', '받아넘기기', 'a'], ['h5_leg', '다리 쏘기', 'b']].every(([id, n, w]) => nm(id) === n && A.nodes[id].ring === 1 && A.nodes[id].path === w), '1고리 길(설계지): 저격 꿰뚫는 화살 / 사냥감 지정, 연사 연속 사격 / 화살 재기, 기동 받아넘기기 / 다리 쏘기');
  ok(nm('h5_cover') === '엄폐' && nm('h5_harass') === '견제 사격' && nm('h5_dodge') === '몸 빼기' && [['h5_heavy', '무거운 화살'], ['h5_lock', '표적 고정'], ['h5_sky', '하늘 가르기'], ['h5_endhunt', '끝없는 사냥'], ['h5_rain', '화살비'], ['h5_barb', '덧화살'], ['h5_bloodrain', '피의 비'], ['h5_endless', '끝없는 화살'], ['h5_windstep', '바람 걸음'], ['h5_stop', '멈춰 세우기'], ['h5_windveil', '바람의 장막'], ['h5_icecage', '얼음 감옥']].every(([id, n]) => nm(id) === n), '리듬 칸 엄폐 · 견제 사격 · 몸 빼기(숨 돌리는 칸), 2 · 3고리 이름(설계지)');
  ok(SK2.h5_cover.time !== 'fast' && SK2.h5_harass.time !== 'fast' && SK2.h5_dodge.time !== 'fast' && SK2.h5_heavy.time === 'slow', '리듬 칸은 주 행동, 무거운 화살은 느림(연계여도 주 행동)');
  ok(JSON.stringify(R_('TREE2').hunter.starters) === JSON.stringify(['h_aim', 'h_step']), '시작 스킬 그대로(겨눠 쏘기 · 물러서며 쏘기)');
  for (const k of ['AB', 'BC', 'CA']) { const S5 = SK.filter(x => x.sec === k), fin = S5.filter(x => x.ys === 4); const atk = S5.filter(x => x.ys !== 4 && SK2[x.id].tgt !== 'self').length;
    ok(S5.length === 5 && fin.length === 1 && SK2[fin[0].id].line && atk === 2 && A.sec[k] !== fin[0].n, A.sec[k] + ': 경계 5칸(공격 2 · 강화/방어 2 · 대사 승부수 ' + (fin[0] && fin[0].n) + ', 경계 이름과 다름)'); }
  ok(SK2.h5_mangung.line === '「한 호흡이면 족하다. 끝까지 당긴 시위는, 결코 빗나가지 않으니.」' && SK2.h5_gale.line === '「바람보다 빠르게, 비보다 많이. 사냥은 이제부터다.」' && SK2.h5_trap.line === '「피 냄새를 맡고 온 짐승이, 덫을 피하는 법은 없지.」' && SK2.h5_mangung.cut === 'blade' && SK2.h5_gale.cut === 'guard' && SK2.h5_trap.cut === 'arcane', '승부수 대사 셋(만든 사람 문장 그대로) · 컷인 종류(만궁 검 · 질풍난사 방어 · 혈향의 덫 마법)');
  ok(SK2.h5_mangung.pay === '당기는 차례에는 아무것도 못 하고, 그동안 받는 피해 +30%.' && SK2.h5_gale.pay === '그동안 몸 빼기 · 방어 불가, 받는 피해 +20%.' && SK2.h5_trap.pay === '깔 때 지금 생명력에서 최대치의 15%를 미끼로 흘린다(15% 이하면 못 씀).', '승부수 대가(설계지 문장)');
  const ULT = ['hnDraw', 'hnGale', 'hnTrap'], HASTE = e => ['hastex', 'hasteSpend', 'quickTurns', 'quick', 'hasten'].includes(e.k) || ((e.k === 'st' || e.k === 'meSt') && e.s === 'haste') || e.haste || e.hasten, VF = v => [...(v.mod.fxSet || []), ...(v.mod.fxAdd || [])];
  ok(SK.every(x => !SK2[x.id].fx.some(e => ULT.includes(e.k)) || x.ys === 4), '새 상태(시위 당김 · 질풍 · 덫)는 승부수에만');
  ok(SK.every(x => !SK2[x.id].fx.some(HASTE)) && Object.values(A.vars).every(v => !VF(v).some(HASTE)), '가속을 주거나 쓰는 효과가 트리 칸 · 변형에 없음(가속은 개전 · 질풍난사만)');
  const STG = R_('HN_TAGS'), BRIDGE = ['추적', '출혈', '둔화', '몸 빼기', '기본공격연동', '광역', '붕괴', '보호'], pureN = {};
  for (const u of up) { const V = u.vars.map(v => A.vars[v]); ok(V.length === 2 && V.map(v => v.v).sort().join() === 'deep,link', u.id + ': 깊게 하나 · 잇기 하나'); const lk = V.find(v => v.v === 'link'); ok(lk.tags.some(g => BRIDGE.includes(g) && !(STG[u.on] || []).includes(g)), u.id + ' 잇기 ' + lk.n + ': 없던 꼬리표 더함');
    const m = V.find(v => v.v === 'deep').mod; if (!m.set && !m.cond && [...(m.fxSet || []), ...(m.fxAdd || [])].every(f => ['dmg', 'brk', 'st', 'stam'].includes(f.k))) pureN[u.br] = (pureN[u.br] || 0) + 1; }
  ok(Object.values(pureN).every(n => n <= 2), '사냥꾼 깊게의 순수 숫자 변형 갈래마다 둘까지 ' + JSON.stringify(pureN));
  const nms = SK.map(x => x.n).concat(Object.values(A.vars).map(v => v.n)), dup = nms.filter((x, i) => nms.indexOf(x) !== i), SNv = Object.values(R_('SNAMES')).concat(Object.values(A.sec)), clash = SK.filter(x => SNv.includes(x.n)).map(x => x.n);
  ok(!dup.length && !clash.length, '사냥꾼 이름 겹침 0, 상태 · 부채꼴과 같은 스킬 이름 0' + (dup.length || clash.length ? ' — ' + dup.concat(clash).join(', ') : ''));
  ok(A.nodes.h5_chase.reqTags.추적 === 1 && A.nodes.h5_chase.reqTags['몸 빼기'] === 1 && A.nodes.h5_scent.reqTags.출혈 === 1 && A.nodes.h5_scent.reqTags.추적 === 1 && A.nodes.h5_frozen.reqTags.둔화 === 2 && A.nodes.h5_frozen.reqTags.기본공격연동 === 1, '결합 칸 셋(추격 추적 1 · 몸 빼기 1, 피 냄새 출혈 1 · 추적 1, 얼어붙은 사냥감 둔화 2 · 기본공격연동 1)');
  ok(R_('HN5_BOUND').trapHp === 0.15 && R_('HN5_BOUND').drawIn === 0.3 && R_('HN5_BOUND').galeIn === 0.2 && R_('HN5_BOUND').trapFocus === 3, '설계지 숫자: 대가 15% · +30% · +20% · 추적 3겹');
  /* 칸 설명은 한 줄(만든 사람): 효과 문장 40자 넘으면 경고. 승부수(대사가 있는 칸)는 만든 사람 문장 그대로라 뺀다 */
  const MAX = R_('MK_DESC_MAX'), long = []; for (const x of SK) { const s = SK2[x.id]; if (s.line) continue; const d = E.skBody(s); if (d.length > MAX) long.push(s.n + '(' + d.length + ')'); }
  for (const v of Object.values(A.vars)) if (v.d && v.d.length > MAX) long.push(v.n + '(' + v.d.length + ')');
  if (long.length) console.warn('경고: 사냥꾼 설명 ' + MAX + '자 넘음 — ' + long.join(', ')); else n++; }

// ===== 0.8.0 M5-5 원소술사 액티브 재설계(10월 20일 만든 사람 설계지 2판) =====
{ const A = E.atBuild('elementalist'), N = Object.values(A.nodes), SK = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.slot), SK2 = E.SK2;
  ok(JSON.stringify(A.sec) === JSON.stringify({ A: '불꽃', AB: '빙염', B: '서리', BC: '정적', C: '마력', CA: '마염' }), '원소술사 부채꼴 여섯: 불꽃 · 빙염 · 서리 · 정적 · 마력 · 마염(공명 없앰)');
  ok(SK.length === 39 && up.length === 36 && Object.keys(A.vars).length === 72, '원소술사 스킬 노드 39(갈래 21 · 경계 15 · 결합 3) + 변형 자리 36 · 변형 72');
  for (const k of ['A', 'B', 'C']) { const S6 = SK.filter(x => x.sec === k), r = n => S6.filter(x => x.ring === n), op = r(1).filter(x => x.ys === 2);
    ok(S6.length === 7 && r(1).map(x => x.ys).sort().join() === '1,2,2' && op[0].excl === op[1].id && r(2).length === 2 && r(3).length === 2, A.sec[k] + ': 1고리 첫 스킬 둘(길) + 리듬 1, 2고리 2 · 3고리 2');
    ok([1, 2, 3].every(g => r(g).filter(x => x.path).map(x => x.path).sort().join() === 'a,b'), A.sec[k] + ': 길 a · b — ' + ['a', 'b'].map(w => [1, 2, 3].map(g => r(g).find(x => x.path === w).n).join(' → ')).join(' / ')); }
  const nm = id => SK2[id].n, path = (a, b) => a.every((id, i) => A.nodes[id].path === b && A.nodes[id].ring === i + 1);
  ok(path(['e5_charge', 'e5_volley', 'e5_arcane'], 'a') && path(['e5_barrier', 'e5_mirror', 'e5_ward'], 'b') && ['마력 응축', '마력 연사', '비전 일격', '마력 방벽', '거울 장막', '마력 결계'].join() === ['e5_charge', 'e5_volley', 'e5_arcane', 'e5_barrier', 'e5_mirror', 'e5_ward'].map(nm).join(), '마력 길(설계지): 평타 마력 응축 → 마력 연사 → 비전 일격 / 버팀 마력 방벽 → 거울 장막 → 마력 결계');
  ok([['e5_firebolt', '화염탄'], ['e5_sparks', '불똥 세례'], ['e5_cloak', '불꽃 외투'], ['e5_burnout', '불태우기'], ['e5_spread', '번지는 불'], ['e5_inferno', '대화재'], ['e5_hongryeon', '홍련'], ['e5_icespear', '얼음 창'], ['e5_frostarmor', '서리 갑옷'], ['e5_rimefrost', '서릿발'], ['e5_crack', '서리 균열'], ['e5_icewall', '얼음 장벽'], ['e5_shatter', '빙결 파쇄'], ['e5_coldwave', '한파'], ['e5_mark', '약화의 표식'], ['e5_weave', '원소 엮기'], ['e5_catalyst', '촉매'], ['e5_arc', '튀는 충격'], ['e5_storm', '원소 폭풍'], ['e5_avatar', '빙염의 화신'], ['e5_stasis', '영겁의 정적'], ['e5_meteor', '천화']].every(([id, n]) => nm(id) === n), '설계지 이름 그대로(홍련 · 영겁의 정적 · 천화)');
  ok(JSON.stringify(R_('TREE2').elementalist.starters) === JSON.stringify(['e5_bolt', 'e5_switch']) && nm('e5_bolt') === '마력탄' && nm('e5_switch') === '원소 전환' && SK2.e5_switch.time === 'fast' && SK2.e5_switch.ys === 1, '시작 스킬 마력탄 · 원소 전환(빠른 행동 · 유산 1)');
  const SHK = id => SK2[id].fx.some(e => (e.k === 'shockx' || e.k === 'elCat' || e.k === 'elAvatar')); ok(SK.filter(x => SHK(x.id)).every(x => x.sec === 'AB'), '열충격을 키우는 칸은 빙염 경계에만');
  for (const k of ['AB', 'BC', 'CA']) { const S5 = SK.filter(x => x.sec === k), fin = S5.filter(x => x.ys === 4); const atk = S5.filter(x => x.ys !== 4 && SK2[x.id].tgt !== 'self').length;
    ok(S5.length === 5 && fin.length === 1 && SK2[fin[0].id].line && atk === (k === 'AB' ? 3 : 2) && A.sec[k] !== fin[0].n, A.sec[k] + ': 경계 5칸(공격 ' + (k === 'AB' ? '3 · 강화 1(설계지)' : '2 · 강화/방어 2') + ' · 대사 승부수 ' + (fin[0] && fin[0].n) + ', 경계 이름과 다름)'); }
  ok(SK2.e5_avatar.line === '「불도 얼음도, 이 몸 안에서는 하나일 뿐이니.」' && SK2.e5_stasis.line === '「모든 것이 멈춘 이 한순간만이, 나락에서 유일한 고요로구나.」' && SK2.e5_meteor.line === '「타올라라. 이 나락에 내린 불의 비가, 너희의 마지막 하늘이 될 터이니.」' && SK2.e5_avatar.cut === 'arcane' && SK2.e5_stasis.cut === 'guard' && SK2.e5_meteor.cut === 'blade', '승부수 대사 셋(만든 사람 문장 그대로) · 컷인 종류(화신 마법 · 정적 방어 · 천화 검)');
  const ULT = ['elAvatar', 'elStasis', 'elMeteor']; ok(SK.every(x => !SK2[x.id].fx.some(e => ULT.includes(e.k)) || x.ys === 4), '새 상태(화신 · 정적 · 천화)는 승부수에만');
  const STG = R_('EL_TAGS'), BRIDGE = ['화상', '둔화', '취약', '보호', '기본공격연동', '광역', '붕괴', '열충격'], pureN = {}, VF = v => [...(v.mod.fxSet || []), ...(v.mod.fxAdd || [])];
  for (const u of up) { const V = u.vars.map(v => A.vars[v]); ok(V.length === 2 && V.map(v => v.v).sort().join() === 'deep,link', u.id + ': 깊게 하나 · 잇기 하나'); const lk = V.find(v => v.v === 'link'); ok(lk.tags.some(g => BRIDGE.includes(g) && !(STG[u.on] || []).includes(g)), u.id + ' 잇기 ' + lk.n + ': 없던 꼬리표 더함');
    const m = V.find(v => v.v === 'deep').mod; if (!m.set && !m.cond && VF({ mod: m }).every(f => ['dmg', 'brk', 'st', 'stam'].includes(f.k))) pureN[u.br] = (pureN[u.br] || 0) + 1; }
  ok(Object.values(pureN).every(n => n <= 2), '원소술사 깊게의 순수 숫자 변형 갈래마다 둘까지 ' + JSON.stringify(pureN));
  const nms = SK.map(x => x.n).concat(Object.values(A.vars).map(v => v.n)), dup = nms.filter((x, i) => nms.indexOf(x) !== i), SNv = Object.values(R_('SNAMES')).concat(Object.values(A.sec)), clash = SK.filter(x => SNv.includes(x.n)).map(x => x.n);
  ok(!dup.length && !clash.length, '원소술사 이름 겹침 0, 상태 · 부채꼴과 같은 스킬 이름 0' + (dup.length || clash.length ? ' — ' + dup.concat(clash).join(', ') : ''));
  ok(A.nodes.e5_frostember.reqTags.둔화 === 2 && A.nodes.e5_frostember.reqTags.화상 === 1 && A.nodes.e5_frostwall.reqTags.보호 === 1 && A.nodes.e5_frostwall.reqTags.둔화 === 1 && A.nodes.e5_manafire.reqTags.기본공격연동 === 1 && A.nodes.e5_manafire.reqTags.화상 === 1, '결합 칸 셋(얼어붙은 불씨 둔화 2 · 화상 1, 서리 방벽 보호 1 · 둔화 1, 마염 화살 기본공격연동 1 · 화상 1)');
  ok(R_('EL5_BOUND').frzBrk === 40 && R_('EL5_BOUND').avatarHp === 0.05 && R_('EL5_BOUND').meteorHp === 0.5 && R_('EL5_BOUND').stasisChill === 3 && R_('ELEM').guard === 0.2, '설계지 숫자: 빙결 붕괴 +40 · 화신 5% · 천화 절반 · 정적 둔화 3 · 서리 무게 −20%');
  const MAX = R_('MK_DESC_MAX'), long = []; for (const x of SK) { const s = SK2[x.id]; if (s.line) continue; const d = E.skBody(s); if (d.length > MAX) long.push(s.n + '(' + d.length + ')'); }
  for (const v of Object.values(A.vars)) if (v.d && v.d.length > MAX) long.push(v.n + '(' + v.d.length + ')');
  if (long.length) console.warn('경고: 원소술사 설명 ' + MAX + '자 넘음 — ' + long.join(', ')); else n++; }

// ===== M5-0 보정 5: 고리는 야영지에서 연다 =====
{ const run = newRun('spellblade'); const ro = D.run_('ringOpen'), rc = D.run_('ringCampOpen');
  ok(!ro(run, 2) && !ro(run, 3), '새 판: 2 · 3고리 잠김'); run.ch = 1; ok(rc(run) === 2 && ro(run, 2) && !ro(run, 3) && run.ringNew === 1, '1챕터 야영지: 2고리가 열리고 트리 버튼 강조');
  ok(rc(run) === 0, '같은 야영지를 다시 지나도 그대로'); run.ch = 2; ok(rc(run) === 3 && ro(run, 3), '2챕터 야영지: 3고리');
  const r2 = newRun('spellblade'); r2.clears = 1; ok(ro(r2, 2) && !ro(r2, 3), '1챕터를 깬 판(옛 판 · 챕터 시작)은 2고리 그대로'); }

// ===== M5-0 보정 5: 1고리 갈림 · 경계 입구(둘 중 어느 쪽이든) =====
{ const run = newRun('spellblade'); run.atree.pts = 9; ok(E.atBuy(run, 'sb_bloodmark') === null && /같은 자리의 다른 첫 스킬/.test(atWhy(run, 'sb_bleedcut')), '피의 낙인을 찍으면 혈흔 베기는 잠김');
  ok(E.atBuy(run, 'sb_blooddrop') === null, '리듬 칸은 둘 중 어느 쪽에서도'); ok(E.atBuy(run, 'sb_flamecut') === null && /같은 자리/.test(atWhy(run, 'sb_ember')), '염화 베기를 찍으면 불씨 투척은 잠김');
  run.clears = 1; ok(!atWhy(run, 'sb_bloodfire'), '피의 낙인 + 염화 베기로도 혈염 입구가 열림'); ok(/양쪽 갈래/.test(atWhy(run, 'sb_bloodmail')), '마갑 첫 스킬이 없으면 죄인의 피 입구는 잠김'); }

// ===== M5-0 보정 5: 변형 강화 (M5-0c: 변형 둘) =====
{ const run = newRun('spellblade'); delete run.offer; /* 제시 없음 = 둘 모두 */ run.atree.pts = 9; const vs = f('atVarSet'); E.atBuy(run, 'sb_bleedcut'); ok(/제시되지 않은/.test(E.atBuy(run, 'sv_bleedcut', 'sbv_mark_fast')), '다른 스킬의 변형은 못 고름');
  ok(E.atBuy(run, 'sv_bleedcut', 'sbv_bleedcut_fast') === null && E.skOf(run.p, 'sb_bleedcut').time === 'fast', '변형 자리를 열며 하나를 고르면 그 스킬에 적용');
  ok(/야영지/.test(vs(run, 'sv_bleedcut', 'sbv_bleedcut_burn')) && run.atree.vsel.sv_bleedcut === 'sbv_bleedcut_fast', '야영지가 아니면 바꿀 수 없음'); run.cur = { type: 'camp' }; const p0 = run.atree.pts;
  ok(vs(run, 'sv_bleedcut', 'sbv_bleedcut_burn') === null && run.atree.pts === p0 && E.skOf(run.p, 'sb_bleedcut').fx.some(e => e.k === 'st' && e.s === 'ignite' && e.n === 2) && E.skOf(run.p, 'sb_bleedcut').time !== 'fast', '야영지에서 바꾸면 포인트는 그대로, 새 변형이 적용(잇기: 불붙은 상처 화상 2)');
  run.offer = { vars: { sv_bleedcut: ['sbv_bleedcut_burn'] } }; ok(/제시되지 않은/.test(vs(run, 'sv_bleedcut', 'sbv_bleedcut_fast')), '제시되지 않은 변형으로는 못 바꿈');
  delete run.atree.vsel.sv_bleedcut; E.treeSync(run); ok(!run.p.aup.length && !E.skOf(run.p, 'sb_bleedcut').fx.some(e => e.s === 'ignite'), '고르지 않은 자리(옛 판)는 일하지 않음'); }

// ===== M5-0 보정 5 P3 · P4: 결합 칸 · 판마다 다른 제시 =====
{ const mk = f('atOfferMake'), A = E.atBuild('spellblade'); const o1 = mk('spellblade', 4242), o2 = mk('spellblade', 4242), o3 = mk('spellblade', 4243);
  ok(JSON.stringify(o1) === JSON.stringify(o2) && JSON.stringify(o1) !== JSON.stringify(o3), '제시는 시드로 재현되고 시드마다 다름');
  ok(Object.keys(o1.vars).length === 36 && Object.entries(o1.vars).every(([s, L]) => L.slice(0, 2).join() === A.nodes[s].vars.join() && L.length === (o1.mut && A.vars[o1.mut].slot === s ? 3 : 2)) && o1.combos.length === 2 && !Object.keys(o1.fins).length, '변형은 둘 다 제시(순서 고정, M5-0c), 결합 칸 셋 중 둘, 승부수 후보 없음');
  let mut = 0, seen = {}; for (let s = 1; s <= 2000; s++) { const o = mk('spellblade', s); if (o.mut) { mut++; seen[o.mut] = 1; const L = o.vars[A.vars[o.mut].slot]; if (L.length !== 3 || L[2] !== o.mut) mut = -9999; } } ok(mut > 140 && mut < 260 && Object.keys(seen).length === 3, '변종은 판마다 10% 안팎(2000판에 ' + mut + '), 셋 모두 나옴, 그 자리 제시에 셋째로 더해짐');
  const run = newRun('spellblade', { keepOffer: 1 }); ok(run.offer && run.offer.v === 1, '새 판은 제시를 가진다'); const miss = ['sb_counterburn', 'sb_bloodfist', 'sb_tricolor'].find(id => !run.offer.combos.includes(id)); run.clears = 2; run.atree.pts = 20;
  ok(/이번 판에는 없는/.test(atWhy(run, miss)), '제시되지 않은 결합 칸은 없음(' + miss + ')'); ok(['sb_kalpa', 'sb_sinwall', 'sb_firebody'].every(id => !/이번 판에는 없는/.test(atWhy(run, id) || '')), '대사 승부수 셋은 늘 나옴(M5-0c)');
  const cb = run.offer.combos[0]; ok(/꼬리표가 모자랍니다/.test(atWhy(run, cb)), '결합 칸은 꼬리표가 모자라면 잠김'); }
{ const run = newRun('spellblade'); run.clears = 2; run.atree.pts = 20; run.offer = { v: 1, vars: {}, combos: ['sb_bloodfist', 'sb_tricolor'], fins: {} }; for (const id of ['sb_bleedcut', 'sb_blooddrop']) E.atBuy(run, id); E.ptBuy(run, 'pw1C'); E.ptBuy(run, 'pw2R'); /* 화력 2R = 기본 공격 피해 노드(n_bs_dmg) */
  const tg = f('runTags')(run); ok(tg['출혈'] >= 2 && tg['기본공격연동'] >= 1, '꼬리표: 액티브 출혈 2 + 패시브 기본 공격 노드 (' + JSON.stringify(tg) + ')'); ok(E.atBuy(run, 'sb_bloodfist') === null, '피 묻은 주먹은 이웃 없이 꼬리표로 열림'); }
{ const run = newRun('spellblade'); run.clears = 2; run.atree.own = Object.keys(E.atBuild('spellblade').nodes).filter(x => x !== 'S'); run.skills = ['sb_bloodfist', 'sb_tricolor', 'sb_bleedcut', 'sb_kalpa']; E.atSync(run); const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; } const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); const p = run.p; p.ys = 9;
  E.playerAct(b, 'sb_bloodfist'); const fx = f('fxAdd'); ok(Math.abs(fx(p, 'hitP', b, p, (E.addS(b, es[0], 'bleed', 3), es[0]), {}, { id: 'basic' }) - 0.6) < 1e-9 && fx(p, 'hitP', b, p, es[1], {}, { id: 'basic' }) === 0, '피 묻은 주먹: 출혈 걸린 적에게 기본 공격 ×1.6(M7-2 직업 기준 옮김: ×1.5 → ×1.6)');
  E.playerAct(b, 'sb_tricolor'); E.addS(b, es[0], 'ignite', 3); p.ward = 5; const sc = f('skCostAt'); ok(sc(b, E.skOf(p, 'sb_bleedcut')).c === 1 && sc(b, E.skOf(p, 'sb_bleedcut')).by === 'tricolor' && p.sbSt.tricolor === 2, '삼색검: 출혈 · 화상 · 보호막이 모두 있으면 베기 스킬 2 → 1(전투에 두 번)'); f('ysSpend')(b, E.skOf(p, 'sb_bleedcut')); ok(p.sbSt.tricolor === 1, '할인을 쓰면 남은 횟수 −1'); p.ward = 0; ok(sc(b, E.skOf(p, 'sb_bleedcut')).c === 2, '보호막이 없으면 그대로'); }

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
  E.atBuy(run, 'sv_bleedcut', 'sbv_bleedcut_fast'); ok(run.atree.own.includes('sv_bleedcut') && run.atree.vsel.sv_bleedcut === 'sbv_bleedcut_fast' && run.p.aup.includes('sbv_bleedcut_fast') && E.skOf(run.p, 'sb_bleedcut').time === 'fast', '변형은 끼운 스킬에 적용');
  E.atEquip(run, 'sb_bleedcut'); ok(!run.p.aup.includes('sbv_bleedcut_fast') && E.skOf(run.p, 'sb_bleedcut').time !== 'fast', '스킬을 빼면 변형은 일하지 않음');
  ok(E.v2Equip(run).length === 3, '장착 = 시작 둘 + 끼운 스킬'); run.atree.own.push('sb_spark', 'sb_ember', 'sb_bladeward', 'sb_brand'); for (const id of ['sb_bleedcut', 'sb_spark', 'sb_ember', 'sb_bladeward']) if (!run.skills.includes(id)) E.atEquip(run, id); ok(/가득/.test(E.atEquip(run, 'sb_brand')), '장착은 4칸(시작 2 + 4 = 6)'); ok(E.v2Equip(run).length === 6, '6칸');
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
  run.atree.own.push('sb_crimson'); // 10월 18일 0.8.0 5단계: 아래 제시 규칙 점검은 유산 4 스킬(M5-0c: 혈인 붉은 처형 sb_crimson)을 연 캐릭터로 본다
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
  // 0.8.0 M7-2: 3칸 안(PT.ksN)만, 보너스 노드 2칸(PT.ksFree)까지. 시작 노드만 연 캐릭터는 가장 가까운 자리가 5칸이라 제시 없이 받을 것만 남는다
  const r2 = newRun('spellblade'); r2.clears = 1; E.ksGrant(r2, 'b1'); const o2 = E.ksEnsureOffer(r2); ok(o2.length === 0 && r2.ksPending === 1 && r2.ksOffer === null && !f('ksCanPick')(r2) && E.ksCands(r2).every(c => c.d === 5), '찍은 곳이 없으면 제시 없이 받을 것 1을 남김(가장 가까운 자리 5칸)');
  for (const id of P.nodes[E.ksCands(r2)[0].path[1]] ? E.ksCands(r2)[0].path.slice(0, 2) : []) E.ptBuy(r2, id); const o3 = E.ksEnsureOffer(r2); ok(o3.length >= 1 && o3.every(id => ksInfo(r2, id).d <= 3 && ksInfo(r2, id).path.length <= 2), '두 칸 찍어 3칸 안에 들면 그때 제시(보너스 노드 2칸까지)');
  ok(E.ksCands(r2).every(c => P.nodes[c.id].ring === 2), '닫힌 고리의 자리는 후보가 아님');
}
// 때: 1 · 2챕터 정산 뒤, 3챕터 야영지 (흐름)
{ const run = newRun('warden'); R_('ask = () => true');
  run.phase = 'settle'; run.ch = 1; run.clears = 1; run.lv = 4; E.ptFix(run); for (const id of E.ksCands(run)[0].path.slice(0, 2)) E.ptBuy(run, id); /* M7-2: 3칸 안에 들게 두 칸 찍어 둔다 */ E.startSettle(run); G.scr = 'settle'; D.click('settleok'); ok(run.ksGot.b1 && run.ksPending === 1 && G.sheet && G.sheet.kind === 'ks', '1챕터 정산을 확정하면 큰 각인 창');
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
  ok(nc >= 15, '조건부 할인 변형 ' + nc + '개(대응 · 교대 · 상태 조건, M5-0c 변형 둘)'); ok(Object.values(A.vars).filter(x => x.mod.set && x.mod.set.killRecharge).every(x => /쓰러뜨리면/.test(x.d)), '처치 환급 변형은 처치 조건을 적음');
  ok(JSON.stringify(E.SK2.sb_bleedcut.fx) === JSON.stringify([{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 5 }]), '강화는 원래 스킬 데이터를 바꾸지 않음');
  const fight = (ups, eq) => { const run = newRun('spellblade'); run.clears = 2; run.atree.own = Object.keys(A.nodes).filter(x => x !== 'S'); run.skills = eq; E.atSync(run); run.p.aup = ups.slice(); const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; } const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { p: run.p, b, es }; };
  { const { p, b, es } = fight(['sbv_bf_resp'], ['sb_bloodfire']); const a0 = E.actionList(b).find(x => x.id === 'sb_bloodfire'); ok(a0.yc === 2, '대응 전 핏불 싣기 비용 2'); E.ysResp(b, '막기'); ok(E.actionList(b).find(x => x.id === 'sb_bloodfire').yc === 1, '대응 충전을 받은 라운드에 비용 1');
    p.ys = 5; E.playerAct(b, 'sb_bloodfire'); ok(b.rec.filter(x => x.k === 'yspend').pop().cost === 1, '할인된 값으로 냄'); ok(E.actionList(b).find(x => x.id === 'sb_bloodfire').yc === 2, '같은 내 차례에 두 번째는 할인 없음'); }
  { const { p, b, es } = fight(['sbv_brand_heat'], ['sb_brand']); E.addS(b, es[1], 'ignite', 6); ok(E.actionList(b).find(x => x.id === 'sb_brand').yc === 1, '화상 3 이상인 적이 있으면 불의 표식 2 → 1(타는 표식)'); p.ys = 1; E.playerAct(b, 'sb_brand', es[0].id); const sp = b.rec.filter(x => x.k === 'yspend').pop(); ok(sp && sp.cost === 1 && b.rec.filter(x => x.k === 'act').pop().a === 'sb_brand', '유산 1이면 조건이 맞는 대상으로 씀'); }
  { const { p, b, es } = fight([], ['sb_searveil']); E.addS(b, es[0], 'sear', 3); p.ward = 0; p.ys = 5; E.playerAct(b, 'sb_searveil'); const L = b.log.map(x => x.m || ''); ok(L.some(m => /^핏불 장막: 혈염 걸린 적 1 → 보호막 \+/.test(m)) && L.some(m => /^핏불 장막\. 보호막 \+/.test(m)), '핏불 장막: 혈염 걸린 적 하나마다 보호막 + 바탕 보호막(상한까지)'); }
  { const { p, b, es } = fight([], ['sb_flamecut']); p.ys = 5; p.edge = null; E.playerAct(b, 'sb_flamecut', es[0].id); ok(p.edge && p.edge.s === 'ignite' && p.edge.n === 4, 'M5-0c: 베기 스킬(염화 베기)도 친 뒤 칼에 싣는다(화상 4, M7-2 직업 기준 옮김 3 → 4)'); }
  { const p = { build: 'spellblade', aup: ['sbv_bleedcut_fast', 'sbv_bleedcut_burn'], pn: [] }; const s = E.skOf(p, 'sb_bleedcut'); ok(s.time === 'fast' && s.fx.some(e => e.k === 'st' && e.s === 'ignite'), '한 스킬에 변형 둘(스치는 칼 · 불붙은 상처)'); }
  { const { p, b, es } = fight(['sbu_counter'], ['sb_bladeward']); p.sbLast = 'spell'; E.playerAct(b, 'sb_bladeward', es[0].id); const L = b.log.map(x => x.m || ''); ok(L.some(m => /^⇄ 교대: 보호막 \+4$/.test(m)) && L.some(m => /^⇄ 교대: 보호막 \+4 \(/.test(m)), '맞받아 베기: 교대면 강화의 보호막 +4와 직업 교대 보호막 +4'); }
}
// ===== 7) 상점 되돌리기 =====
{ const run = newRun('spellblade'); run.lv = 5; run.ch = 2; E.ptFix(run); run.clears = 1; for (const id of ['lg1C', 'lg2L', 'lg3L']) E.ptBuy(run, id); E.ksGrant(run, 'b1'); E.ksEnsureOffer(run); E.ksTake(run, 'lgK5'); const fr = run.ptree.free.slice();
  ok(ptResetCost(run) === 50, '패시브 값 = 레벨 × 10'); E.ptReset(run); ok(run.ptree.own.length === 0 && run.ptree.pts === 14 && run.ptree.ks.includes('lgK5') && JSON.stringify(run.ptree.free) === JSON.stringify(fr), '되돌려도 큰 각인 · 보너스 노드은 남음');
  ok(!ptWhy(run, 'lg5L') || !/이웃/.test(ptWhy(run, 'lg5L')), '남은 보너스 노드 옆을 찍을 수 있음(섬도 열린 노드)');
  E.atBuy(run, 'sb_bleedcut'); E.atBuy(run, 'sb_boil'); ok(atResetCost(run) === Math.round(2 * TREE_RESET.cell * 1.5), '액티브 값 = 연 노드 × 25 × 1.5^(챕터−1)'); E.atReset(run); ok(run.atree.own.length === 0 && run.skills.length === 0 && run.atree.pts === 6, '액티브 되돌리기: 포인트 돌려받고 장착도 빠짐');
  E.atBuy(run, 'sb_ember'); E.atBuy(run, 'sb_brand'); ok(E.atRefundLeaf(run) === 'sb_brand' && run.atree.own.join() === 'sb_ember', '잊힌 스승의 묘비: 끝 노드 가운데 가장 바깥 것');
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
  D.click('allocgo'); for (const id of ['lg1C', 'lg2L', 'lg3L']) D.click('ptbuy', id); R_('ask = () => true'); D.click('allocnext'); ok(G.run.alloc.step === 'k' && G.run.ksOffer && G.run.ksOffer.length >= 1 && G.run.ksOffer.includes('lgK5') && G.run.ksOffer.every(id => ksInfo(G.run, id).d <= 3), '옮기기: 큰 각인 단계에서 3칸 안 후보(M7-2: 셋을 채우려 먼 자리를 넣지 않음)');
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
  E.atBuy(run, 'sb_brand'); E.treeSync(run); ok(run.p.sbLead === null && !skOf(run.p, 'sb_edge').fx.some(e => e.k === 'st'), '가장 많은 갈래가 둘이면 없음');
  E.atBuy(run, 'sb_char'); E.treeSync(run); ok(run.p.sbLead === '염검' && skOf(run.p, 'sb_aegis').fx.some(e => e.k === 'imbue' && e.s === 'ignite' && e.soft), '염검이면 주문 방패가 칼에 화상 1(칼이 비었을 때)');
  const w0 = E.SK2.sb_aegis.fx.find(e => e.k === 'ward').n; const run2 = newRun('spellblade'); run2.lv = 6; run2.clears = 2; E.ptFix(run2); for (const id of ['lg1C', 'lg2L', 'lg3L']) E.ptBuy(run2, id); for (const id of ['sb_bladeward', 'sb_unravel']) E.atBuy(run2, id); E.treeSync(run2); ok(skOf(run2.p, 'sb_aegis').fx.find(e => e.k === 'ward').n === w0 + 2, '마갑이면 주문 방패 보호막 +2');
  const run3 = newRun('spellblade'); run3.lv = 6; run3.clears = 2; E.ptFix(run3); for (const id of ['sb_bleedcut', 'sb_boil']) E.atBuy(run3, id); E.treeSync(run3); ok(!skOf(run3.p, 'sb_edge').fx.some(e => e.k === 'st'), '칼에 새긴 주문이 없으면 시작 스킬 그대로'); }
{ const skCostAt = f('skCostAt'), skOf = f('skOf'); const { p, b, es } = nodeFight(['ks_sb_over']); p.sbLast = 'cut'; const kinds = ['spell', 'cut', 'spell'];
  for (const k of kinds) { p.ys = 5; E.playerAct(b, k === 'spell' ? 'sb_aegis' : 'basic', k === 'cut' ? es[0].id : undefined); if (b.waiting === false && !b.over) E.runUntilPlayer(b); }
  ok(b.ovDisc === 1 && b.rec.some(x => x.k === 'ovready'), '보완 4: 마검 과부하, 교대 셋을 이으면 할인 준비'); ok(skCostAt(b, Object.assign({}, E.SK2.sb_finale, { ys: 4 })).c === 1 && skCostAt(b, skOf(p, 'sb_edge')).c === 2, '다음 유산 4 스킬 4 → 1(바닥 1), 다른 비용은 그대로');
  const hitP = IFX_NODE.ks_sb_over.hitP; ok(hitP({ sbAlt: true }) === 0.5 && hitP({ sbAlt: false }) === 0, '교대한 행동 피해 +50%(4단계 조정, 만든 사람 값 35%)'); }
{ const { p } = nodeFight(['ks_sb_blood']); ok(Math.round(p.ward) >= 6, '보완 4: 피를 두른 갑주, 전투 시작 보호막 6'); }
{ const run = newRun('spellblade'); run.lv = 16; run.clears = 2; E.ptFix(run); const A = E.atBuild('spellblade'); delete run.offer; for (const id of ['sb_bladeward', 'sb_beatcut', 'sb_finale']) assert.equal(E.atBuy(run, id), null, id); assert.equal(E.atBuy(run, 'sv_finale', 'sbu_release'), null, 'sv_finale'); run.skills = ['sb_finale']; E.treeSync(run);
  const s = f('skOf')(run.p, 'sb_finale'); ok(s.fx.findIndex(e => e.k === 'wardFirst') >= 0 && s.fx.find(e => e.k === 'wardFirst').n === 18, '보완 5: 갑주 해방은 먼저 보호막 18을 두름(M5-0 보정 4: 마갑 전개는 비용 3 · 보호막 27이 되어 숫자로 적는다)');
  const es = [E.mkEnemy('bruiser', false, 0)]; es[0].hp = es[0].hpMax = 5000; es[0].dmg = 0; const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); run.p.ward = 0; run.p.ys = 5; const hp0 = es[0].hp; E.playerAct(b, 'sb_finale', es[0].id);
  ok(es[0].hp < hp0 && run.p.ward < 1 && b.log.some(x => /먼저 두른 갑주/.test(x.m)) && b.log.some(x => /보호막 18을 태운다/.test(x.m)), '보호막이 없어도 두르고 나서 모두 태워 친다'); }
// 0.8.0 M5-0 규격(10월 19일, 전면 개편 2절): 부채꼴(sec)로 바뀐 직업은 오류, 아직 사다리인 직업은 보고만(M5-1~5에서 바꾼다)
/* 판정 대기(10월 19일): 만든 사람이 문장(숫자 포함)을 정한 마검사 경계 칸 가운데 값 띠 밖인 것. 문장 그대로 두고, 숫자를 띠에 맞출지 · 띠를 경계에 어떻게 둘지 결정을 기다린다 */
/* M5-0 마감(10월 19일 만든 사람): 숫자만 띠 하한까지 올리기로 해 대기 목록을 비웠다. 이제 경계 칸도 띠 밖이면 실패 */
const BAND_WAIT = [];
/* 띠 예외(10월 20일 만든 사람, M5-0 보정): 마갑탄은 M4대로(빠른 행동, 비용 2) 되돌렸다. 값 식(E)은 빠른 행동의 시간 몫을 세지 않아 비용 2 띠 아래다. 띠 판정과 기준 평균 모두에서 뺀다 */
const BAND_EXEMPT = ['sb_bolt', 'w_pray']; /* M5-1: 신성한 기도는 만든 사람 숫자(최대 생명력 2~3%, 수비 태세면 더 세게) 그대로, 리듬 칸 띠 아래 */
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
/* M5-0a 승부수 대사 · 컷인: 대사(line)는 비용 4 승부수에만(아니면 경고), 대사가 있으면 컷인 문법(cut) · 대가(pay)가 있고 효과 글에 「」가 남지 않음 */
{ const SK2 = E.SK2, warn = [], lines = []; for (const c of CLS) for (const s of (E.SKILLS2 && E.SKILLS2[c]) || []) { const x = SK2[s.id] || s; if (!x.line) continue; lines.push(x.id); const an = (E.atBuild(c).nodes || {})[x.id] || {}; if (an.ys !== 4) warn.push(c + ' ' + x.id + '(비용 ' + an.ys + ')');
    assert(['blade', 'guard', 'arcane'].includes(x.cut), x.id + ' 컷인 문법'); assert(/^「.+」$/.test(x.line), x.id + ' 대사 「」'); assert(!(x.fx || []).some(f => /「/.test(f.txt || '')), x.id + ' 효과 글에 대사가 남음'); n++; }
  if (warn.length) console.warn('경고: 승부수가 아닌 스킬에 대사 — ' + warn.join(', '));
  ok(['sb_kalpa', 'sb_sinwall', 'sb_firebody'].every(id => lines.includes(id)), '마검사 승부수 셋에 대사 · 컷인(겁화 검 · 죄인의 벽 방어 · 불의 몸 불·마법)'); }
console.log('tree-check: ' + n + '개 통과');
