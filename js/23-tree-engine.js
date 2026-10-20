'use strict';
/* ===== 0.8.0 두 트리 엔진 (10월 16일 0.8.0 2단계, docs/제안/0.8.0-1단계-트리설계-2026-10-16.md) =====
   패시브(run.ptree = { own, free, ks, pts, log }) · 액티브(run.atree = { own, pts, log }) · 장착(run.skills, 4칸) · 큰 각인(run.ksPending · run.ksOffer · run.ksGot).
   능력치는 시작 노드 + 찍은 노드(보너스 노드 포함)의 stat 합이고, run.stats에 넣어 applyStats로 쓴다. 중간 노드 · 큰 각인 효과는 p.pn(효과 키)로 fxList에 들어간다.
   한 칸씩 되돌리기는 배분 흐름(run.alloc: 캐릭터 만들기 · 옛 세이브 옮기기)의 그 단계에서만, 그 밖에는 상점 되돌리기만 */
const PTREE = {}, ATREE = {};
const PT_POS = ['1C', '2L', '2R', '3L', '3R', '4L', '4R', '5L', '5R', '6L', '6R', '7L', '7R', '8L', '8R'];
const ptRingOf = r => r <= 3 ? 1 : r <= 6 ? 2 : 3;
const PT_STATN = { str: '힘', dex: '민첩', int: '지능', con: '체력', wil: '의지' };
function ptAtkStat(cls) { return cls === 'assassin' || cls === 'hunter' ? 'dex' : cls === 'elementalist' || cls === 'bloodmage' ? 'int' : 'str'; } // 2-2: 스킬 성장 능력치
function ptSmallOf(cls, d, lane) {
  const C = PT_CLS[cls];
  if (d === 'pw') { if (C && C['pw' + lane]) return { stat: Object.assign({}, C['pw' + lane]) }; return { stat: { [ptAtkStat(cls)]: 2 } }; }
  if (d === 'sv') return { stat: { con: 2 } }; if (d === 'su') return { stat: { wil: 2 } }; if (d === 'ag') return { stat: { dex: 2 } };
  if (d === 'ct') return { sm: 'brk' }; return { sm: 'st' };
}
const ptSmallTxt = o => o.stat ? Object.entries(o.stat).map(([k, v]) => PT_STATN[k] + ' +' + v).join(' · ') : o.sm === 'brk' ? '주는 붕괴 +' + Math.round(PT.smallBrk * 100) + '%' : '스태미나 +' + PT.smallSt;
const pnTxt = k => (typeof AWK_MAP !== 'undefined' && AWK_MAP[k]) || PN_TXT[k] || KS_LIST[k] || { n: k, d: '' };
const ptPoolHas = k => PT.dirs.some(d => PT_POOL[d].r2.includes(k) || PT_POOL[d].r3.includes(k));
/* 패시브 트리 만들기 (2-3 틀): 방향마다 일반 15 + 큰 각인 자리 2, 다리 R3 → 시계 방향 이웃 L3 · R6 → 이웃 L6 */
function ptBuild(cls) {
  if (PTREE[cls]) return PTREE[cls];
  const C = PT_CLS[cls], tilt = PT_TILT[cls] || {}, N = {}; const tmp = C ? 0 : 1;
  const add = (id, o) => { N[id] = Object.assign({ id, links: [], cost: 1 }, o); if (tmp) N[id].tmp = 1; return N[id]; };
  const link = (a, b) => { if (!N[a] || !N[b]) throw new Error('ptree link ' + a + '-' + b); if (!N[a].links.includes(b)) N[a].links.push(b); if (!N[b].links.includes(a)) N[b].links.push(a); };
  add('S', { kind: 'start', ring: 1, pos: { r: 0, lane: 'C' }, cost: 0, stat: Object.assign({}, PT_START[cls] || {}), n: '시작', d: '직업 기본 능력치' });
  for (const d of PT.dirs) {
    const nt = PT_TILT_N[tilt[d] || 'B'].concat(['5L', '5R', '7L', '7R']); const content = {};
    if (C) { for (const pos of nt) if (C.nodes[d + pos]) content[pos] = C.nodes[d + pos]; }
    else { // 임시 트리 (10월 16일 0.8.0 2단계): 직업 갈래 각인 → 공용 2고리 → 공용 3고리 순서로 기계적으로 채운다. 없으면 작은 노드
      const q12 = ((PT_CLSAWK[cls] || {})[d] || []).concat(PT_POOL[d].r2), q3 = PT_POOL[d].r3.slice();
      for (const pos of nt) { const r = +pos[0]; const k = r >= 7 ? (q3.shift() || q12.shift()) : q12.shift(); if (k) content[pos] = k; }
    }
    for (const pos of PT_POS) {
      const r = +pos[0], lane = pos[1], id = d + pos, k = content[pos];
      const base = { dir: d, ring: ptRingOf(r), pos: { r, lane } };
      if (k) { const T = pnTxt(k); add(id, Object.assign(base, { kind: 'notable', fx: k, n: T.n, d: T.d, pool: ptPoolHas(k) ? 'common' : 'class' })); }
      else { const sm = ptSmallOf(cls, d, lane); const xf = C && C.smallFx && C.smallFx[id]; /* 10월 17일 보완 2: 효과가 붙은 작은 노드(마검사 화력 C1 양손의 마검) */
        add(id, Object.assign(base, { kind: 'small', n: xf ? pnTxt(xf).n : ptSmallTxt(sm), d: ptSmallTxt(sm) + '.' + (xf ? ' ' + pnTxt(xf).d : '') }, sm, xf ? { fx: xf } : {})); }
    }
    if (typeof PT_BASIC !== 'undefined' && PT_BASIC[d]) PT_POS.map(pos => N[d + pos]).filter(x => x && x.kind === 'small' && x.ring === 1 && !x.fx).slice(0, PT_BASIC[d].length).forEach((x, i) => { const k = PT_BASIC[d][i], T = pnTxt(k); delete x.stat; Object.assign(x, { fx: k, n: T.n, d: T.d, basic: 1 }); }); // 0.8.0 M4 평타 축
    const ks = C ? [C.ks[d + 'K5'], C.ks[d + 'K9']] : KS_TMP[d];
    [5, 9].forEach((r, i) => { const k = ks[i], K = KS_LIST[k]; add(d + 'K' + r, { kind: 'keystone', dir: d, ring: r === 5 ? 2 : 3, pos: { r, lane: 'C' }, cost: 0, fx: k, n: K.n, d: K.d, pay: K.pay || null, pool: K.cls ? 'class' : 'common' }); });
    if (C && C.ks2 && C.ks2[d + 'K5b']) { const o = C.ks2[d + 'K5b'], K = KS_LIST[o.fx]; add(d + 'K5b', { kind: 'keystone', dir: d, ring: 2, pos: { r: 6, lane: 'C' }, cost: 0, fx: o.fx, n: K.n, d: K.d, pay: K.pay || null, pool: 'class', areq: o.req, bound: K.bound }); } // 0.8.0 M5-0 경계 큰 각인
  }
  PT.dirs.forEach((d, i) => {
    const nx = PT.dirs[(i + 1) % PT.dirs.length], x = p => d + p;
    link('S', x('1C')); link(x('1C'), x('2L')); link(x('1C'), x('2R')); link(x('2L'), x('3L')); link(x('2R'), x('3R')); link(x('3R'), nx + '3L');
    link(x('3L'), x('4L')); link(x('3R'), x('4R')); link(x('4L'), x('5L')); link(x('4R'), x('5R')); link(x('5L'), x('6L')); link(x('5R'), x('6R')); link(x('K5'), x('4L')); link(x('K5'), x('4R')); if (N[x('K5b')]) { link(x('K5b'), x('5L')); link(x('K5b'), x('5R')); } link(x('6R'), nx + '6L');
    link(x('6L'), x('7L')); link(x('6R'), x('7R')); link(x('7L'), x('8L')); link(x('7R'), x('8R')); link(x('K9'), x('8L')); link(x('K9'), x('8R'));
  });
  for (const id in N) N[id].links.sort();
  return (PTREE[cls] = { cls, nodes: N, tmp, kind: 'p' });
}
/* 액티브 트리 만들기: ATREE_DEF. 0.8.0 M5-0(10월 19일 만든 사람 D14): 임시 트리는 폐기했다(ATREE_DEF가 없는 직업은 시작 노드만, 찍어 둔 포인트는 atMigrateM5가 돌려준다).
   부채꼴(sec, 전면 개편 2-1): 갈래 A 0° · B 120° · C 240°, 경계 AB 60° · BC 180° · CA 300°. 행의 둘째 칸(갈래 이름)을 sec가 부채꼴로 바꾼다.
   스킬 행 [id, 갈래, 고리, 반지름, 칸, 이웃, 비용, { requires }]: requires가 있으면 그 노드가 모두 열려야 연다(경계 입구 = 양쪽 갈래의 1고리 개시 노드) */
const AT_SEC = { A: 0, AB: 60, B: 120, BC: 180, C: 240, CA: 300 }, AT_SEC_BOUND = ['AB', 'BC', 'CA'];
const AT_TIER_RING = { 하급: 1, 중급: 2, 상급: 3, 궁극: 3 };
function atBuild(cls) {
  if (ATREE[cls]) return ATREE[cls];
  const D = ATREE_DEF[cls], N = {}, V = {}, T2 = TREE2[cls] || { branches: [], starters: [] };
  const add = (id, o) => { N[id] = Object.assign({ id, links: [], cost: 1 }, o); return N[id]; };
  const link = (a, b) => { if (!N[a] || !N[b]) throw new Error('atree link ' + a + '-' + b); if (!N[a].links.includes(b)) N[a].links.push(b); if (!N[b].links.includes(a)) N[b].links.push(a); };
  add('S', { kind: 'start', ring: 1, pos: { r: 0, lane: 'C' }, cost: 0, n: '시작 스킬', d: T2.starters.map(id => SK2[id] ? SK2[id].n : id).join(' · ') });
  const secOf = {}; if (D && D.sec) for (const k in D.sec) secOf[D.sec[k]] = k;
  if (D) {
    for (const [id, br, ring, r, lane, , ys, ex] of D.skills) add(id, Object.assign({ kind: 'skill', br, ring, pos: { r, lane }, ys, n: SK2[id].n }, secOf[br] ? { sec: secOf[br] } : {}, ex && ex.requires ? { requires: ex.requires.slice() } : {}, ex && ex.excl ? { excl: ex.excl } : {}, ex && ex.reqTags ? { reqTags: Object.assign({}, ex.reqTags), ang: ex.ang } : {}, ex && ex.finOf ? { finOf: ex.finOf } : {}, ex && ex.path ? { path: ex.path } : {})); /* M5-0c: 갈래 칸의 길(a · b) */
    for (const [id, br, ring, r, lane, on, n, d, mod, src] of D.ups || []) add(id, Object.assign({ kind: 'upgrade', br, ring, pos: { r, lane }, on, n, d, mod, src }, secOf[br] ? { sec: secOf[br] } : {}));
    for (const [id, , , , , ln] of D.skills) for (const x of ln) link(id, x);
    for (const u of D.ups || []) link(u[0], u[5]);
    /* M5-0 보정 5 P2 변형 강화: 스킬마다 변형 자리 노드(sv_*, 포인트 1)와 변형 셋(V). 고른 변형은 run.atree.vsel[자리] */
    if (D.vars && D.vars.sb_mutants) for (const [vid, n, d, mod, tags, ex] of D.vars.sb_mutants) V[vid] = Object.assign({ id: vid, slot: 'sv_' + ex.on.slice(3), n, d, mod, tags: tags || [] }, ex); // P4 (d) 변종: 자리의 변형 목록에는 없고 제시에만 섞인다
    if (D.vars) for (const sid in D.vars) { const sk = N[sid]; if (!sk) continue; const slot = 'sv_' + sid.slice(3);
      add(slot, Object.assign({ kind: 'upgrade', slot: 1, br: sk.br, ring: sk.ring, pos: { r: sk.pos.r, lane: sk.pos.lane }, on: sid, n: SK2[sid].n + ' 변형', d: '변형 둘 가운데 하나를 고릅니다. 야영지에서 바꿀 수 있습니다(포인트는 그대로).', mod: {}, vars: D.vars[sid].map(v => v[0]) }, sk.sec ? { sec: sk.sec } : {})); link(slot, sid);
      for (const [vid, n, d, mod, tags, ex] of D.vars[sid]) V[vid] = Object.assign({ id: vid, on: sid, slot, n, d, mod, tags: tags || [] }, ex || {}); }
  }
  for (const id in N) N[id].links.sort();
  return (ATREE[cls] = { cls, nodes: N, vars: V, tmp: 0, kind: 'a', br: T2.branches.slice(), sec: D && D.sec ? Object.assign({}, D.sec) : null });
}
/* ---- 공통 규칙 ---- */
const ptTotal = run => PT.pts.start + PT.pts.lv * Math.max(0, (run.lv || 1) - 1) + ((run.ptree && run.ptree.bonus) || 0); // bonus: 이벤트 · 제단의 패시브 포인트(옛 능력치 1점)
function ptBonus(run, n, why) { ptInit(run); run.ptree.bonus = (run.ptree.bonus || 0) + n; run.ptree.pts += n; run.ptree.log.push({ bonus: n, why, t: Date.now() }); if (typeof toast === 'function') toast(why + ': 패시브 포인트 +' + n); }
const atTotal = run => AT_PTS.start + AT_PTS.lv * Math.max(0, (run.lv || 1) - 1);
const clearsEff = run => (run.clears || 0) + (run.markCh ? run.markCh - 1 : 0); // 표식 도전은 시작 챕터 앞을 깬 것으로 친다(1-5)
/* M5-0 보정 5(10월 20일 만든 사람): 2고리는 1챕터 야영지, 3고리는 2챕터 야영지에서 연다(액티브 · 패시브 같은 규칙). run.ringCamp = 야영지에서 연 가장 바깥 고리.
   표식 도전 · 챕터 시작 꾸러미 판은 지금처럼 시작 챕터 기준(clearsEff), 진행 중인 옛 판은 다음 야영지에서 열린다 */
const ringOpen = (run, ring) => clearsEff(run) >= (PT.ring[ring] || 0) || (run.ringCamp || 1) >= ring;
const RING_WHY = { 2: '2고리는 1챕터 야영지에서 열립니다', 3: '3고리는 2챕터 야영지에서 열립니다' };
function ringCampOpen(run) { if (!run || !run.ptree) return 0; const want = Math.min(3, (run.ch || 1) + 1); const was = [2, 3].filter(k => ringOpen(run, k)).length; run.ringCamp = Math.max(run.ringCamp || 1, want); const now = [2, 3].filter(k => ringOpen(run, k)).length; if (now > was) { run.ringNew = 1; if (typeof toast === 'function') toast('새 고리가 열렸다: ' + (now + 1) + '고리'); return now + 1; } return 0; }
function ptInit(run) { if (!run.ptree) run.ptree = { own: [], free: [], ks: [], pts: ptTotal(run), log: [], ksv: 2 }; if (!run.atree) run.atree = { own: [], pts: atTotal(run), log: [], atv: 5 }; if (!run.ksGot) run.ksGot = {}; if (run.ksPending == null) run.ksPending = 0; return run; }
const ptOpenIds = run => ['S'].concat(run.ptree.own, run.ptree.free, run.ptree.ks);
const atOpenIds = run => ['S'].concat(run.atree.own);
const ptSpent = run => run.ptree.own.reduce((a, id) => a + ((ptBuild(run.build).nodes[id] || {}).cost || 0), 0);
/* 열린 노드(roots에서 열린 노드만 지나 닿는가) */
function treeReach(T, open, roots) { const S = new Set(open), seen = new Set(roots.filter(x => S.has(x))), q = [...seen]; while (q.length) { const x = q.shift(); for (const y of T.nodes[x].links) if (S.has(y) && !seen.has(y)) { seen.add(y); q.push(y); } } return seen; }
function treeWhyBuy(run, T, openIds, pts, id) {
  const n = T.nodes[id]; if (!n || n.kind === 'start') return '없는 노드입니다';
  if (openIds.includes(id)) return '이미 열렸습니다';
  if (n.kind === 'keystone') return '큰 각인은 챕터 보상으로만 얻습니다';
  if (!ringOpen(run, n.ring)) return RING_WHY[n.ring] || '아직 열 수 없는 고리입니다';
  if (T.kind === 'a' && run && run.offer && atAbsent(run, id)) return '이번 판에는 없는 칸입니다'; // M5-0 보정 5 P4
  if (n.excl && openIds.includes(n.excl)) return '같은 자리의 다른 첫 스킬을 이미 골랐습니다'; // M5-0 보정 5: 1고리 갈림(둘 중 하나)
  if (n.requires) { if (!n.requires.every(x => Array.isArray(x) ? x.some(y => openIds.includes(y)) : openIds.includes(x))) return '양쪽 갈래의 첫 노드를 먼저 열어야 합니다'; } // 0.8.0 M5-0: 경계 입구(보정 5: 갈래마다 첫 스킬 둘 중 어느 쪽이든)
  else if (n.reqTags) { const w = atTagsWhy(run, n); if (w) return w; } // M5-0 보정 5 P3 결합 칸: 이웃이 아니라 꼬리표
  else if (!n.links.some(x => openIds.includes(x))) return '이웃한 노드를 먼저 열어야 합니다';
  if (pts < (n.cost || 0)) return '포인트가 없습니다';
  return null;
}
const ptWhy = (run, id) => treeWhyBuy(run, ptBuild(run.build), ptOpenIds(run), run.ptree.pts, id);
const atWhy = (run, id) => treeWhyBuy(run, atBuild(run.build), atOpenIds(run), run.atree.pts, id);
function ptBuy(run, id) { const why = ptWhy(run, id); if (why) return why; const n = ptBuild(run.build).nodes[id]; run.ptree.own.push(id); run.ptree.pts -= n.cost; run.ptree.log.push({ id, lv: run.lv || 1, ch: run.ch || 1, room: run.room, t: Date.now() }); ptSync(run); return null; }
/* M5-0 보정 5 P4 판마다 다른 제시(만든 사람 결정 D17): 판 시작 때 run.seed로 정한다. 갈래 스킬은 고정.
   변형은 자리마다 셋 중 둘, 결합 칸은 셋 중 둘, 경계 승부수는 부채꼴마다 후보 둘 중 하나, 판마다 10%로 변종 하나가 제시에 섞인다. 저장(run.offer)
   M5-0c(10월 20일 만든 사람): 변형은 스킬마다 둘이고 둘 다 제시(무작위 없음), 승부수 후보 제도 폐지(대사 승부수 셋이 늘 나온다). 결합 칸 셋 중 둘 · 10% 변종(변형 셋째로 더함)은 그대로 */
const AT_OFFER = { vars: 2, combos: 2, mut: 0.1 };
function atRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function atOfferMake(build, seed) {
  const D = ATREE_DEF[build]; if (!D || !D.vars) return null; const A = atBuild(build), r = atRng((seed | 0) * 2654435761 + build.length * 97 + 7), pick = (L, k) => { const a = L.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
  const o = { v: 1, seed, vars: {}, combos: null, fins: {}, mut: null };
  for (const id of Object.keys(A.nodes).sort()) { const n = A.nodes[id]; if (n.slot) o.vars[id] = n.vars.length > AT_OFFER.vars ? pick(n.vars, AT_OFFER.vars) : n.vars.slice(); }
  const cb = Object.keys(A.nodes).filter(id => A.nodes[id].reqTags).sort(); if (cb.length) o.combos = pick(cb, AT_OFFER.combos).sort();
  const fg = {}; for (const id of Object.keys(A.nodes).sort()) { const f = A.nodes[id].finOf; if (f) (fg[f] = fg[f] || []).push(id); } for (const f in fg) o.fins[f] = pick(fg[f], 1)[0];
  const muts = Object.values(A.vars).filter(v => v.mut && o.vars[v.slot]); if (muts.length && r() < AT_OFFER.mut) { const m = pick(muts.map(v => v.id), 1)[0], s = A.vars[m].slot; o.vars[s] = o.vars[s].length > 2 ? [o.vars[s][0], m] : o.vars[s].concat([m]); o.mut = m; }
  return o; }
function atOfferInit(run) { if (!run || run.offer || !ATREE_DEF[run.build] || !ATREE_DEF[run.build].vars) return run && run.offer; run.offer = atOfferMake(run.build, run.seed || 1); return run.offer; }
/* 이번 판에 없는 칸: 제시되지 않은 결합 칸 · 승부수 후보, 그 칸의 변형 자리 */
function atAbsent(run, id) { const A = atBuild(run.build), n = A.nodes[id], o = run && run.offer; if (!n || !o) return false; const k = n.slot ? A.nodes[n.on] : n; if (!k) return false; if (k.finOf && o.fins && o.fins[k.finOf] !== k.id) return true; if (k.reqTags && o.combos && !o.combos.includes(k.id)) return true; return false; }
/* 결합 칸 조건: 판의 꼬리표 수(runTags)가 reqTags 이상 */
function atTagsWhy(run, n) { if (!n.reqTags) return null; const c = runTags(run); const miss = Object.entries(n.reqTags).filter(([k, v]) => (c[k] || 0) < v); return miss.length ? '꼬리표가 모자랍니다: ' + miss.map(([k, v]) => k + ' ' + (c[k] || 0) + '/' + v).join(' · ') : null; }
/* M5-0 보정 5: 제시된 변형(판마다 둘, run.offer.vars). 제시가 없으면 셋 모두 */
function atVarsOffered(run, slot) { const A = atBuild(run.build), n = A.nodes[slot]; if (!n || !n.slot) return []; const o = run.offer && run.offer.vars && run.offer.vars[slot]; return (o || n.vars).filter(v => A.vars[v]); }
function atVarWhy(run, slot, vid) { const A = atBuild(run.build), n = A.nodes[slot]; if (!n || !n.slot) return '변형 자리가 아닙니다'; if (!atVarsOffered(run, slot).includes(vid)) return '이번 판에 제시되지 않은 변형입니다'; return null; }
/* 변형 바꾸기: 야영지에서(포인트 환급 없이 교체, 전투 중 불가). 고르지 않은 자리(옛 판)도 야영지에서 고른다 */
function atVarSet(run, slot, vid) { if (!run.atree.own.includes(slot)) return '먼저 변형 자리를 열어야 합니다'; const w = atVarWhy(run, slot, vid); if (w) return w; if (!(run.cur && run.cur.type === 'camp')) return '변형은 야영지에서 바꿀 수 있습니다'; (run.atree.vsel = run.atree.vsel || {})[slot] = vid; run.atree.log.push({ id: slot, v: vid, t: Date.now() }); atSync(run); return null; }
function atBuy(run, id, vid) {
  const why = atWhy(run, id); if (why) return why; const n = atBuild(run.build).nodes[id];
  if (n.slot) { const off = atVarsOffered(run, id); vid = vid || off[0]; const w = atVarWhy(run, id, vid); if (w) return w; (run.atree.vsel = run.atree.vsel || {})[id] = vid; } run.atree.own.push(id); run.atree.pts -= n.cost; run.atree.log.push({ id, lv: run.lv || 1, ch: run.ch || 1, room: run.room, t: Date.now() });
  const auto = !(run.alloc && run.alloc.mode === 'mig') || (run.skillsOld || []).includes(id); // 옮기기: 옛 장착 스킬만 자동으로 끼우고 나머지 칸은 비워 둔다(9-3)
  if (n.kind === 'skill' && auto) { run.skills = run.skills || []; if (run.skills.length < EQUIP_SLOTS2 && !run.skills.includes(id)) run.skills.push(id); if (run.alloc && run.alloc.mode === 'mig') { const o = run.skillsOld; run.skills.sort((x, y) => (o.indexOf(x) < 0 ? 99 : o.indexOf(x)) - (o.indexOf(y) < 0 ? 99 : o.indexOf(y))); } } atSync(run); return null;
}
/* 한 칸 되돌리기: 배분 흐름(run.alloc)의 그 단계에서만. 남은 찍은 노드가 모두 시작 · 보너스 노드 · 큰 각인에 이어져 있어야 한다 */
const allocStep = run => run && run.alloc ? run.alloc.step : null;
function ptRefundWhy(run, id) {
  if (allocStep(run) !== 'p') return '캐릭터를 만들거나 포인트를 다시 나누는 화면의 패시브 단계에서만 되돌립니다';
  if (!run.ptree.own.includes(id)) return '포인트로 찍은 노드만 되돌립니다';
  const T = ptBuild(run.build), t = run.ptree, rest = t.own.filter(x => x !== id), open = ['S'].concat(rest, t.free, t.ks);
  const R = treeReach(T, open, ['S'].concat(t.free, t.ks)); const bad = rest.find(x => !R.has(x)); return bad ? T.nodes[bad].n + '이(가) 이 노드에 이어져 있어 먼저 되돌려야 합니다' : null;
}
function ptRefund(run, id) { const why = ptRefundWhy(run, id); if (why) return why; run.ptree.own = run.ptree.own.filter(x => x !== id); run.ptree.pts += ptBuild(run.build).nodes[id].cost; run.ptree.log.push({ id, refund: 1, t: Date.now() }); ptSync(run); return null; }
function atRefundWhy(run, id) {
  if (allocStep(run) !== 'a') return '캐릭터를 만들거나 포인트를 다시 나누는 화면의 액티브 단계에서만 되돌립니다';
  if (!run.atree.own.includes(id)) return '연 노드만 되돌립니다';
  const T = atBuild(run.build), rest = run.atree.own.filter(x => x !== id); const R = treeReach(T, ['S'].concat(rest), ['S']); const bad = rest.find(x => !R.has(x)); return bad ? T.nodes[bad].n + '이(가) 이 노드에 이어져 있어 먼저 되돌려야 합니다' : null;
}
function atRefund(run, id) { const why = atRefundWhy(run, id); if (why) return why; atDrop(run, id); run.atree.log.push({ id, refund: 1, t: Date.now() }); atSync(run); return null; }
function atDrop(run, id) { if (run.atree.vsel) delete run.atree.vsel[id]; run.atree.own = run.atree.own.filter(x => x !== id); run.atree.pts += atBuild(run.build).nodes[id].cost; run.skills = (run.skills || []).filter(x => x !== id); }
/* 끝 노드 하나 (가장 바깥 것부터, 같으면 id 순): 빼도 나머지가 이어져 있는 것 */
function treeLeaf(T, own, roots) { const c = own.filter(id => { const rest = own.filter(x => x !== id); const R = treeReach(T, roots.concat(rest), roots); return rest.every(x => R.has(x)); }); return c.sort((a, b) => (T.nodes[b].pos.r - T.nodes[a].pos.r) || (T.nodes[b].ring - T.nodes[a].ring) || (a < b ? -1 : 1))[0] || null; }
/* 상점 되돌리기 (1-4의 5): 포인트로 찍은 노드만 돌려받고, 큰 각인과 보너스 노드은 남는다. 값은 지금 모델 그대로 */
const ptResetCost = run => (run.lv || 1) * 10;
const atResetCost = run => Math.round((run.atree ? run.atree.own.length : 0) * TREE_RESET.cell * Math.pow(1.5, (run.ch || 1) - 1));
function ptReset(run) { const n = run.ptree.own.length; run.ptree.pts += ptSpent(run); run.ptree.own = []; run.ptree.log.push({ reset: n, lv: run.lv || 1, ch: run.ch || 1, t: Date.now() }); ptSync(run); return n; }
function atReset(run) { const n = run.atree.own.length; run.atree.pts += n; run.atree.own = []; run.atree.vsel = {}; run.skills = []; run.atree.log.push({ reset: n, lv: run.lv || 1, ch: run.ch || 1, t: Date.now() }); atSync(run); return n; }
/* 이벤트 "잊힌 스승의 묘비": 액티브 노드 하나를 돌려준다(끝 노드 가운데 가장 바깥 것) */
function atRefundLeaf(run) { const T = atBuild(run.build); const id = treeLeaf(T, run.atree.own, ['S']); if (!id) return null; atDrop(run, id); run.atree.log.push({ id, refund: 'master', t: Date.now() }); atSync(run); return id; }
/* 불러올 때 포인트 다시 맞추기 (1-8): 넘치면 가장 바깥의 끝 노드부터 되돌린다. 데이터에서 빠진 노드는 지운다 */
function ptFix(run) {
  ptInit(run); const T = ptBuild(run.build), t = run.ptree;
  t.own = [...new Set(t.own.filter(id => T.nodes[id] && T.nodes[id].kind !== 'keystone' && T.nodes[id].kind !== 'start'))]; t.free = [...new Set(t.free.filter(id => T.nodes[id] && !t.own.includes(id)))]; t.ks = [...new Set(t.ks.filter(id => T.nodes[id] && T.nodes[id].kind === 'keystone'))];
  t.pts = ptTotal(run) - ptSpent(run);
  while (t.pts < 0 && t.own.length) { const id = treeLeaf(T, t.own, ['S'].concat(t.free, t.ks)) || t.own[t.own.length - 1]; t.own = t.own.filter(x => x !== id); t.pts += T.nodes[id].cost; t.log.push({ id, refund: 'over', t: Date.now() }); }
  const A = atBuild(run.build), a = run.atree; a.own = [...new Set(a.own.filter(id => A.nodes[id] && A.nodes[id].kind !== 'start'))]; a.pts = atTotal(run) - a.own.length;
  while (a.pts < 0 && a.own.length) { const id = treeLeaf(A, a.own, ['S']) || a.own[a.own.length - 1]; atDrop(run, id); a.log.push({ id, refund: 'over', t: Date.now() }); }
  run.skills = (run.skills || []).filter(id => a.own.includes(id) && A.nodes[id] && A.nodes[id].kind === 'skill').slice(0, EQUIP_SLOTS2);
}
/* 능력치 = 시작 노드 + 찍은 노드 · 보너스 노드의 stat 합 (1-6). 큰 각인은 능력치를 주지 않는다 */
function ptStats(run) { const T = ptBuild(run.build), o = { str: 0, dex: 0, int: 0, con: 0, wil: 0 }; for (const id of ['S'].concat(run.ptree.own, run.ptree.free)) { const n = T.nodes[id]; if (n && n.stat) for (const k in n.stat) o[k] = (o[k] || 0) + n.stat[k]; } return o; }
/* 출처별 능력치 (화면): 시작 · 작은 노드 · 보너스 노드 */
function ptStatSrc(run) { const T = ptBuild(run.build), src = { start: {}, own: {}, free: {} }; const put = (w, n) => { if (n && n.stat) for (const k in n.stat) src[w][k] = (src[w][k] || 0) + n.stat[k]; }; put('start', T.nodes.S); for (const id of run.ptree.own) put('own', T.nodes[id]); for (const id of run.ptree.free) put('free', T.nodes[id]); return src; }
function ptFxKeys(run) { const T = ptBuild(run.build); return ['S'].concat(run.ptree.own, run.ptree.free, run.ptree.ks).map(id => T.nodes[id]).filter(n => n && n.fx).map(n => n.fx); }
function ptSmall(run) { const T = ptBuild(run.build), o = { brk: 0, st: 0 }; for (const id of run.ptree.own.concat(run.ptree.free)) { const n = T.nodes[id]; if (n && n.sm) o[n.sm]++; } return o; }
/* 트리 → 캐릭터: 능력치 · 노드 효과(p.pn · p.psm) · 생명력 비율 유지 */
function ptSync(run) { if (!run.ptree) return; run.stats = ptStats(run); const p = run.p; if (!p) return; p.pn = ptFxKeys(run); p.psm = ptSmall(run); p.awk = (run.awk || []).slice(); applyStats(p, run.stats); }
function atSync(run) { if (!run.atree || !run.p) return; run.p.skills = v2Equip(run); const T = atBuild(run.build), eq = run.p.skills; run.p.aup = run.atree.own.filter(id => T.nodes[id] && T.nodes[id].kind === 'upgrade' && eq.includes(T.nodes[id].on)).map(id => T.nodes[id].slot ? (run.atree.vsel || {})[id] : id).filter(Boolean).sort(); /* M5-0 보정 5: 변형 자리는 고른 변형으로(안 고른 자리는 일하지 않음) */ run.p.sbLead = atLead(run); }
/* 이끄는 갈래 (10월 17일 보완 3, 칼에 새긴 주문): 액티브 포인트를 가장 많이 쓴 갈래. 가장 많은 갈래가 둘 이상이거나 없으면 null */
function atLead(run) { if (run.build !== 'spellblade' || !run.atree) return null; const A = atBuild(run.build), c = {}; for (const id of run.atree.own) { const br = (A.nodes[id] || {}).br; if (br) c[br] = (c[br] || 0) + 1; } const E = Object.entries(c).sort((a, b) => b[1] - a[1]); return E.length && (E.length < 2 || E[0][1] > E[1][1]) ? E[0][0] : null; }
function treeSync(run) { ptInit(run); atOfferInit(run); /* M5-0 보정 5 P4: 제시가 없던 판(옛 판)은 시드로 만든다 */ ptFix(run); ptSync(run); atSync(run); }
/* 장착: 시작 스킬(늘) + 연 스킬 노드 가운데 run.skills(4칸) */
function v2Equip(run) { const T = TREE2[run.build]; const A = run.atree ? atBuild(run.build) : null; const own = run.atree ? run.atree.own : []; return (T ? T.starters : []).concat((run.skills || []).filter(id => A && own.includes(id) && A.nodes[id] && A.nodes[id].kind === 'skill' && !(T && T.starters.includes(id)))).slice(0, (T ? T.starters.length : 0) + EQUIP_SLOTS2); }
function atEquip(run, id) {
  const A = atBuild(run.build); if (!run.atree.own.includes(id) || !A.nodes[id] || A.nodes[id].kind !== 'skill') return '연 스킬만 장착합니다';
  run.skills = run.skills || []; const i = run.skills.indexOf(id); if (i >= 0) run.skills.splice(i, 1); else if (run.skills.length < EQUIP_SLOTS2) run.skills.push(id); else return '장착 칸이 가득 찼습니다. 먼저 하나를 빼 주세요';
  atSync(run); return null;
}
const atSkills = run => run.atree ? run.atree.own.filter(id => (atBuild(run.build).nodes[id] || {}).kind === 'skill') : [];
/* ---- 실제 스킬: 강화를 적용한 스킬 (1-3). 강화는 그 스킬을 끼웠을 때만(p.aup). 패시브 노드의 스킬 바꾸기(PN_SK)도 여기서 ---- */
const PN_SK = { n_sb_thickaegis: { on: 'sb_aegis', fxSet: [{ k: 'ward', add: 3 }] }, // 두꺼운 주문 방패: 주문 방패의 보호막 +3
  /* 0.8.0 5단계 파수꾼 · 수도승: 시작 스킬을 바꾸는 패시브 */
  n_wd_wide: { on: 'w_bash', set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 24 }] }, // 넓은 방패
  n_wd_brace6: { on: 'w_brace', fxSet: [{ k: 'st', s: 'protect', n: 6 }] }, // 단단한 자세
  n_wd_bracewall: { on: 'w_brace', fxAdd: [{ k: 'ward', n: 6 }] }, // 굳은 방패
  n_mk_prestance: { on: 'm_brace', fxSet: [{ k: 'stance', dmg: 12 }] }, // 먼저 잡은 자세
};
/* 칼에 새긴 주문 (10월 17일 보완 3): 이끄는 갈래(p.sbLead)에 따라 시작 스킬을 바꾼다. 화상은 칼이 비어 있을 때만 싣는다(soft) */
const PN_LEAD = { n_sb_edgeadd: { 혈인: { on: 'sb_edge', fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, 염검: { on: 'sb_aegis', fxAdd: [{ k: 'imbue', s: 'ignite', n: 1, soft: 1 }] }, 마갑: { on: 'sb_aegis', fxSet: [{ k: 'ward', add: 2 }] } } };
const pnLead = (p, id) => (p.pn || []).map(k => PN_LEAD[k] && p.sbLead && PN_LEAD[k][p.sbLead]).filter(m => m && m.on === id);
const SKC = new Map();
function skMod(s, m) {
  if (m.set) Object.assign(s, m.set);
  for (const x of m.fxSet || []) { const e = s.fx.find(f => f.k === x.k && (x.s == null || f.s === x.s)); if (!e) throw new Error('fxSet ' + s.id + ' ' + x.k); for (const k in x) if (k === 'add') e.n = (e.n || 0) + x.add; else if (k !== 'k') e[k] = x[k]; }
  for (const x of m.fxDel || []) s.fx = s.fx.filter(f => !(f.k === x.k && (x.s == null || f.s === x.s))); // 0.8.0 5단계: 효과 빼기 (다시 세우는 벽의 보호)
  for (const x of m.fxAdd || []) s.fx.push(Object.assign({}, x));
  if (m.cond) s.cond = (s.cond || []).concat([Object.assign({}, m.cond)]);
}
function skOf(p, id) {
  const base = SK2[id]; if (!base || !p) return base; const A = ATREE_DEF[p.build] ? atBuild(p.build) : null; const node = A && A.nodes[id];
  const upN = u => A && (A.nodes[u] || (A.vars && A.vars[u])); const ups = (p.aup || []).filter(u => upN(u) && upN(u).on === id); /* M5-0 보정 5: 고른 변형(A.vars)도 강화처럼 */ const pk = (p.pn || []).filter(k => PN_SK[k] && PN_SK[k].on === id);
  const pl = pnLead(p, id);
  if (!ups.length && !pk.length && !pl.length && !(node && node.ys != null)) return base;
  const key = p.build + '|' + id + '|' + ups.join(',') + '|' + pk.join(',') + (pl.length ? '|' + p.sbLead : ''); if (SKC.has(key)) return SKC.get(key);
  const s = Object.assign({}, base, { fx: base.fx.map(e => Object.assign({}, e)) }); if (node && node.ys != null) s.ys = node.ys;
  for (const u of ups) { const m = upN(u).mod; skMod(s, m); if (m.cond) s.cond[s.cond.length - 1].id = u; }
  for (const k of pk) skMod(s, PN_SK[k]);
  for (const m of pl) skMod(s, m);
  if (ups.length) s.ups = ups.slice(); SKC.set(key, s); return s;
}
/* 조건부 할인 (1-3): 비용 −off, 바닥 1, 그 강화마다 내 차례(라운드)에 한 번 */
function skCondMet(b, s, c, tgt) {
  const p = b.p; if (c.when === 'resp') return b.ysRespLast != null && b.ysRespLast >= (b.ysR || 0) - 1;
  if (c.when === 'alt2') { if (p.build !== 'spellblade' || !s.kind) return false; const alt = !!p.sbLast && s.kind !== p.sbLast; return (alt ? (p.sbRun || 0) + 1 : 0) >= 2; }
  /* 0.8.0 5단계 내 자원 조건 (1-2절): 보유만 본다. 비용을 낼 때의 값 */
  if ((c.when || '').includes('&')) return c.when.split('&').every(w => skCondMet(b, s, Object.assign({}, c, { when: w }), tgt)); // 0.8.0 M5-0: 두 조건 모두(경계 강화 엉긴 상처)
  const mw = /^ward>=(\d+)$/.exec(c.when || ''); if (mw) return (p.ward || 0) >= +mw[1];
  const mk = /^ki>=(\d+)$/.exec(c.when || ''); if (mk) return st(p, 'empower') >= +mk[1];
  if (c.when === 'stance') return !!(p.stance || (b.mkStHeld != null && b.mkStHeld === b.turnIdx)); // 직전 적 차례를 자세로 맞았다(내 차례 첫 행동에서 자세가 풀려도 그 차례 동안 참)
  const m = /^kw:(\w+)>=(\d+)$/.exec(c.when || ''); if (m) { const ok = e => e && e.alive && st(e, m[1]) >= +m[2]; return tgt ? ok(tgt) : alive(b).some(ok); }
  /* 0.8.0 5단계 사냥꾼 (원거리 초안 2-2 · 8절 보완 1 · 2, 10월 18일): link = 이 스킬이 연계(직전 갈래 lastBr과 다름, 시작 스킬은 lb). 외길 사냥꾼이면 같은 갈래를 바로 이어 씀으로 바뀐다.
     linkFast = link이거나 이번 차례에 빠른 기동 스킬을 먼저 씀(보완 2, 측정 스위치 HUNT_BRIDGE만 씀). focus>=n = 대상의 추적 겹(보유) */
  if (c.when === 'link' || c.when === 'linkFast') { if (p.build !== 'hunter') return false; const br = hnBr(s); const lk = br !== '시작' && !!p.lastBr && (hnSolo(p) ? p.lastBr === br : p.lastBr !== br); return lk || (c.when === 'linkFast' && b.hnFastMob != null && b.hnFastMob === b.turnIdx); }
  const mf = /^focus>=(\d+)$/.exec(c.when || ''); if (mf) { const ok = e => e && e.alive && p.focus && p.focus.id === e.id && p.focus.n >= +mf[1]; return tgt ? ok(tgt) : alive(b).some(ok); }
  return false;
}
function skCostAt(b, s, tgt) {
  const c0 = skCost(s); if (!b) return { c: c0, by: null }; let best = { c: c0, by: null };
  for (const c of s.cond || []) { if (b.condUsed && b.condUsed[c.id || s.id] === (b.ysR || 0)) continue; if (skCondMet(b, s, c, tgt)) { const c1 = Math.max(1, c0 - (c.off || 1)); if (c1 < best.c) { best = { c: c1, by: c.id || s.id }; break; } } }
  /* 10월 17일 보완 1 · 4: 두 번 교대의 다음 스킬 −1(b.altDisc), 마검 과부하 교대 셋의 다음 유산 4 스킬 −3(b.ovDisc). 바닥 1, 가장 큰 할인 하나만 */
  if (b.p && b.p.sbSt && b.p.sbSt.tricolor && s.kind === 'cut' && (b.p.ward || 0) > 0 && !(b.condUsed && b.condUsed.tricolor === (b.ysR || 0)) && alive(b).some(e => stk(e, 'bleed') > 0 && stk(e, 'ignite') > 0)) { const c1 = Math.max(1, c0 - 1); if (c1 < best.c) best = { c: c1, by: 'tricolor' }; } // M5-0 보정 5 결합 칸 삼색검(내 차례에 한 번)
  if (b.ovDisc && c0 >= 4) { const c1 = Math.max(1, c0 - SB_OVER.off); if (c1 < best.c) best = { c: c1, by: 'ksOver' }; }
  if (b.altDisc && c0 >= (SB_ALT2.min || 1)) { const c1 = Math.max(1, c0 - SB_ALT2.off); if (c1 < best.c) best = { c: c1, by: 'altDbl' }; }
  return best;
}
/* ---- 큰 각인 (1-7) ---- */
const ksHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/* 열린 노드 전체에서의 최단 거리와 길 (열린 고리의 노드만, 다른 큰 각인 자리는 지나지 않는다. 이웃은 id 순) */
function ksPaths(run) {
  const T = ptBuild(run.build), open = ptOpenIds(run), dist = {}, par = {}, q = [];
  for (const id of open.slice().sort()) { dist[id] = 0; q.push(id); }
  while (q.length) { const x = q.shift(); if (T.nodes[x].kind === 'keystone' && !open.includes(x)) continue;
    for (const y of T.nodes[x].links) { if (dist[y] != null || !ringOpen(run, T.nodes[y].ring)) continue; dist[y] = dist[x] + 1; par[y] = x; q.push(y); } }
  return { dist, par };
}
function ksCands(run) {
  const T = ptBuild(run.build), { dist, par } = ksPaths(run), ch = run.ch || 1;
  return Object.values(T.nodes).filter(n => n.kind === 'keystone' && !run.ptree.ks.includes(n.id) && ringOpen(run, n.ring) && dist[n.id] != null && (!n.areq || (run.atree && run.atree.own.includes(n.areq)))).map(n => { // 0.8.0 M5-0: 경계 큰 각인은 그 경계 입구를 연 판만
    const path = []; for (let x = par[n.id]; x != null && dist[x] > 0; x = par[x]) path.unshift(x);
    return { id: n.id, dir: n.dir, d: dist[n.id], path, rk: ksHash(n.id + ':' + ((run.seed || 0) + ch)) };
  });
}
/* 셋 고르기: 거리 → 이미 고른 후보와 다른 방향 → 시드 순서. 3칸 안이 모자라면 4, 5칸 …에서 같은 순서로 채운다 */
/* 10월 18일 0.8.0 5단계(원거리 초안 10절 결정 4, 모든 직업): 연 액티브 스킬(시작 스킬 · 찍은 스킬 노드 · 장착)에 유산 4 스킬이 하나도 없으면 결정의 칼(유산 4 스킬 +25%)은 후보에서 뺀다.
   비용은 강화 · 노드 비용을 넣은 skCost(skOf). 빠진 자리는 같은 규칙(거리 → 방향 → 시드)으로 다음 후보가 채운다 */
function ksHasCost4(run) {
  const A = atBuild(run.build), T2 = TREE2[run.build] || { starters: [] }; const own = (run.atree && run.atree.own) || [];
  const p = Object.assign({}, run.p || {}, { build: run.build, aup: own.filter(id => A.nodes[id] && A.nodes[id].kind === 'upgrade') });
  const ids = new Set((T2.starters || []).concat(own.filter(id => A.nodes[id] && A.nodes[id].kind === 'skill'), run.skills || []));
  for (const id of ids) { const s = SK2[id] ? skOf(p, id) : null; if (s && skCost(s) === 4) return true; } return false;
}
function ksOfferMake(run) {
  const T = ptBuild(run.build), no4 = !ksHasCost4(run);
  const C = ksCands(run).filter(x => !(no4 && T.nodes[x.id].fx === 'ks_crystal')).sort((a, b) => a.d - b.d || a.rk - b.rk), out = [];
  while (out.length < PT.ksOffer && C.length) { const d = C[0].d; const grp = C.filter(x => x.d === d); const dirs = out.map(x => x.dir); const pick = grp.find(x => !dirs.includes(x.dir)) || grp[0]; out.push(pick); C.splice(C.indexOf(pick), 1); }
  return out.map(x => x.id);
}
const ksInfo = (run, id) => ksCands(run).find(x => x.id === id) || null;
/* 받는 때: 1 · 2챕터 정산을 확정한 뒤(b1 · b2), 3챕터 야영지에 들어설 때(c3). 같은 때는 한 번만 */
function ksGrant(run, key) { ptInit(run); if (run.ksGot[key]) return false; run.ksGot[key] = Date.now(); run.ksPending = (run.ksPending || 0) + 1; (run.ksLog = run.ksLog || []).push({ grant: key, ch: run.ch || 1, room: run.room, t: Date.now() }); return true; }
function ksEnsureOffer(run) { if (!(run.ksPending > 0)) { run.ksOffer = null; return []; } if (!run.ksOffer || !run.ksOffer.length || run.ksOffer.some(id => run.ptree.ks.includes(id))) run.ksOffer = ksOfferMake(run); if (!run.ksOffer.length) { run.ksPending = 0; run.ksOffer = null; return []; } return run.ksOffer; }
function ksTake(run, id) {
  if (!(run.ksPending > 0) || !(run.ksOffer || []).includes(id) || run.ptree.ks.includes(id)) return '고를 수 없는 큰 각인입니다';
  const c = ksInfo(run, id); if (!c) return '닿을 수 없는 자리입니다';
  const open = ptOpenIds(run); const free = c.path.filter(x => !open.includes(x)); run.ptree.free.push(...free); run.ptree.ks.push(id);
  (run.ksLog = run.ksLog || []).push({ id, free, offer: run.ksOffer.slice(), ch: run.ch || 1, room: run.room, t: Date.now() }); run.ksPending--; run.ksOffer = null; ptSync(run); return null;
}
/* 0.8.0 M5-0(10월 19일 만든 사람 D14): 임시 액티브 트리 폐기. 트리에 없는 노드를 찍어 둔 판은 그 포인트를 돌려주고 장착을 시작 스킬로 되돌린다(run.atree.atv = 2면 끝난 판) */
/* M5-0 보정 4(10월 20일 만든 사람): 마검사 갈래 칸을 6칸으로 잘랐다. atv 3: 없어진 노드와, 그 때문에 시작에서 이어지지 않게 된 노드를 거두고 포인트를 돌려준다 */
/* M5-0 보정 5: 판의 꼬리표 수(찍은 액티브 스킬 · 고른 변형 · 패시브 노드 · 큰 각인). 결합 칸 requires.tags와 BD-9 */
function runTags(run) { const c = {}; const add = L => { for (const t of L || []) c[t] = (c[t] || 0) + 1; };
  if (run.atree) { const A = atBuild(run.build); for (const id of run.atree.own) { const n = A.nodes[id]; if (n && n.kind === 'skill' && SK2[id]) add(SK2[id].tags); } for (const v of Object.values(run.atree.vsel || {})) { const V = A.vars && A.vars[v]; if (V) add(V.tags); } }
  if (run.ptree && typeof PT_TAGS !== 'undefined') { const T = ptBuild(run.build); for (const id of [].concat(run.ptree.own, run.ptree.free, run.ptree.ks)) { const n = T.nodes[id]; if (n && n.fx) add(PT_TAGS[n.fx]); } }
  return c; }
/* M5-0c(10월 20일 만든 사람): 마검사 액티브 재설계. atv 5: 트리에서 빠진 칸 · 빠진 변형을 찍어 둔 판은 그 포인트를 돌려준다(액티브 포인트로).
   빠진 변형 = 고른 변형이 그 자리의 변형 목록에 없는 것(변종은 그 자리 것이면 남긴다). 제시(run.offer)는 새 규칙으로 다시 만들고, 남긴 변종은 제시에 더한다 */
function atMigrateM5(run) {
  if (!run || !run.atree || run.atree.atv >= 5) return 0; const why = run.atree.atv === 4 ? '마검사 재설계' : run.atree.atv === 3 ? '빌드 규격 2판' : run.atree.atv === 2 ? '부채꼴 칸 정리' : '임시 트리 폐기'; run.atree.atv = 5; // M5-0 보정 5: atv 4(경계 둘째 칸 교체 · 1고리 갈림), M5-0c: atv 5
  const A = atBuild(run.build); const own0 = run.atree.own || []; const keep0 = []; const vs = run.atree.vsel || {};
  const varOk = (slot, v) => !v || (A.vars && A.vars[v] && A.vars[v].slot === slot);
  for (const id0 of own0) { const id = !A.nodes[id0] && A.vars && A.vars[id0] ? A.vars[id0].slot : id0; const n = A.nodes[id]; if (!n || keep0.includes(id)) continue; if (n.excl && keep0.includes(n.excl)) continue; if (n.slot && !varOk(id, vs[id])) continue; keep0.push(id); } // 1고리 갈림에서 둘 다 찍힌 옛 판은 먼저 찍은 쪽을 남긴다. 옛 강화(이제 변형)는 그 스킬의 변형 자리를 연 채 변형은 고르지 않음(야영지에서 고름)
  const reach = treeReach(A, ['S'].concat(keep0), ['S']); const keep = keep0.filter(id => reach.has(id) || A.nodes[id].reqTags || (A.nodes[id].slot && A.nodes[A.nodes[id].on].reqTags && keep0.includes(A.nodes[id].on)));
  for (const s in vs) if (!keep.includes(s) || !varOk(s, vs[s])) delete vs[s];
  if (ATREE_DEF[run.build] && ATREE_DEF[run.build].vars && run.offer) { run.offer = atOfferMake(run.build, run.seed || 1); for (const s in vs) { const v = A.vars[vs[s]]; if (v && v.mut && run.offer.vars[s] && !run.offer.vars[s].includes(v.id)) { run.offer.vars[s] = run.offer.vars[s].concat([v.id]); run.offer.mut = v.id; } } }
  const slotOf = id => !A.nodes[id] && A.vars && A.vars[id] ? A.vars[id].slot : id; const gone = own0.filter(id => !keep.includes(slotOf(id))); if (!gone.length) { run.atree.own = keep; return 0; }
  run.atree.own = keep; run.atree.pts = (run.atree.pts || 0) + gone.length; (run.atree.log = run.atree.log || []).push({ refund: gone.length, why, gone: gone.slice(), t: Date.now() });
  const T2 = TREE2[run.build] || { starters: [] }; run.skills = (run.skills || []).filter(id => keep.includes(id) || T2.starters.includes(id)); return gone.length;
}
/* 0.8.0 M4(10월 19일): 큰 각인 배치가 바뀌었다(KS_V1 → PT_CLS). 옛 판에서 찍어 둔 자리의 각인이 바뀌었으면(넘치는 그릇 · 결정의 칼 · 망치의 길 · 먼저 움직임 · 철벽 등)
   그 각인과 그때 공짜로 연 길을 거두고 큰 각인 하나를 다시 고르게 한다(ksPending +1). run.ptree.ksv = 2면 끝난 판 */
function ksMigrateM4(run) {
  if (!run || !run.ptree || run.ptree.ksv === 2) return 0; run.ptree.ksv = 2;
  if (typeof KS_V1 === 'undefined' || !KS_V1[run.build] || !(run.ptree.ks || []).length) return 0;
  const T = ptBuild(run.build), old = KS_V1[run.build]; let n = 0;
  for (const id of run.ptree.ks.slice()) {
    if (!old[id] || !T.nodes[id] || T.nodes[id].fx === old[id]) continue;
    run.ptree.ks = run.ptree.ks.filter(x => x !== id); const L = (run.ksLog || []).filter(x => x.id === id).pop(); if (L && L.free) run.ptree.free = run.ptree.free.filter(x => !L.free.includes(x));
    run.ksPending = (run.ksPending || 0) + 1; run.ksOffer = null; (run.ksRefund = run.ksRefund || []).push({ id, fx: old[id], t: Date.now() }); n++;
  }
  return n;
}
/* ---- 옛 세이브 옮기기 (9절): run.tv가 2가 아니면 불러올 때 한 번. 결과는 배분을 확정할 때 저장한다(부르는 쪽) ---- */
const TV = 2;
const lvOfXp = xp => { let l = 1; while (l < LV_XP.length && xp >= LV_XP[l]) l++; return l; };
function treeMigrate08(run) {
  if (!run || run.tv === TV || !BUILDS[run.build] || !BUILDS[run.build].v2) return false;
  const lv0 = run.lv || 1, xp0 = run.xp || 0;
  run.mig08 = { at: Date.now(), lv: lv0, xp: xp0, stats: run.stats || null, tree: run.tree || null, skills: run.skills || null, awk: run.awk || null, statPending: run.statPending || 0, phase: run.phase || null, ch: run.ch || 1, room: run.room, battle: run.battle ? 1 : 0 };
  const lv = Math.min(LV_XP.length, Math.max(lv0, lvOfXp(xp0))); run.lv = lv; if (lv > lvOfXp(xp0)) run.xp = LV_XP[lv - 1]; if (run.p) run.p.lv = lv;
  for (const k of ['statPending', 'statBase', 'statGrowth', 'markStat', 'awkPending', 'awkOffer']) delete run[k];
  const gifts = Object.values(typeof CH_GIFT !== 'undefined' ? CH_GIFT : {}).flatMap(o => Object.values(o));
  run.awkOld = (run.awk || []).filter(a => !gifts.includes(a)); run.awk = (run.awk || []).filter(a => gifts.includes(a));
  run.ptree = { own: [], free: [], ks: [], pts: ptTotal(run), log: [] }; run.ksGot = {}; run.ksOffer = null;
  const ce = clearsEff(run), ch = run.ch || 1; if (ce >= 1) run.ksGot.b1 = 1; if (ce >= 2) run.ksGot.b2 = 1; if (ch >= 3 && (run.dgv === 3 ? (run.room || 0) : floor24to16(run.room || 0)) >= FLOOR_CAMP) run.ksGot.c3 = 1; /* 0.8.0 6단계: 옛 판의 층은 24층 틀이라 16층 틀로 옮겨 견준다 */
  run.ksPending = Object.keys(run.ksGot).length;
  run.treeOld = run.tree || null; run.skillsOld = (run.skills || []).slice(); run.skills = []; delete run.tree; run.atree = { own: [], pts: atTotal(run), log: [] };
  if (run.battle) { // 전투를 버리고 그 방의 처음으로 (생명력 · 스태미나 · 플라스크는 방에 들어설 때 값, 소모품은 저장된 그대로)
    delete run.battle; if (run.entry) { const keep = run.p; run.p = JSON.parse(JSON.stringify(run.entry)); if (keep) { run.p.lv = lv; } }
    if (run.nextUsed) run.next = Object.assign({}, run.nextUsed, run.next); if (run.next3Used) run.next3 = Object.assign({}, run.next3Used, run.next3); run.nextUsed = null; run.next3Used = null; // 방에 들어설 때 쓴 "다음 전투" 효과는 다시 그 방에
  }
  run.stats = ptStats(run); if (run.p) { run.p.pn = []; run.p.psm = {}; run.p.aup = []; }
  return true;
}
/* 확정 (9-2의 10): 트리 판 2, 능력치 · 장착 */
function treeMigrateDone(run) { run.tv = TV; delete run.alloc; treeSync(run); }
/* ---- 노드 효과 (IFX_NODE: 장비 효과와 같은 꼴. 옛 각인을 옮긴 노드는 IFX_AWK를 그대로 읽는다) ---- */
const ysCapOf = p => YUSAN.cap + fxVal(p, 'ysCap', 0, (a, v) => a + v);
const ysStartOf = p => Math.max(0, YUSAN.start + fxVal(p, 'ysCap', 0, (a, v) => a + v) + fxVal(p, 'ysStart', 0, (a, v) => a + v));
const skCostOfCur = (p, c) => { if (!c || !c.skill) return 0; const s = skOf(p, c.id); return s ? skCost(s) : 0; };
const kindOfCur = c => { const s = c && c.skill ? SK2[c.id] : null; return s ? s.kind : null; };
const IFX_NODE = {
  n_overflow: { ysOverflowBack: 1 },
  n_fullvessel: { hitP: (b, p) => ysNow(p) >= ysCapOf(p) ? 0.06 : 0 },
  n_shaken: { onBreak: (b, p) => { fxStam(p, 8); return 1; } },
  n_sb_altedge: { hitP: b => b.sbAlt ? 0.06 : 0 },
  n_sb_finish: { hitP: (b, p, e) => e.hp <= e.hpMax * 0.3 ? 0.12 : 0 },
  n_sb_beatcut: { brk: b => { if (!(b.sbAlt && b.sbRunNow >= 2) || b.beatCutA === b.actN) return 0; b.beatCutA = b.actN; return 8; } },
  n_sb_telebrk: { brkMul: (b, p, e) => e && e.intent && (YS_PRE_K.includes(e.intent.k) || e.intent.aimed) ? 1.15 : 1 },
  n_sb_gap: { hitP: (b, p, e) => e.s && e.s.broken ? 0.08 : 0 },
  n_sb_stagger: { onBreak: (b, p, e) => { if (b.staggerA === b.actN || !e.alive) return; b.staggerA = b.actN; addS(b, e, 'weak', 1); return 1; } },
  n_sb_parryspell: { onParry: b => { b.psp = 1; b.pspA = null; }, hitP: (b, p, e, o, c) => { if (!b.psp || kindOfCur(c) !== 'spell') return 0; if (b.pspA == null) b.pspA = b.actN; if (b.pspA !== b.actN) { b.psp = 0; b.pspA = null; return 0; } return 0.15; } },
  n_sb_lightcut: { onSkill: (b, p, act) => { if (!act || !act.s || act.s.time !== 'fast' || act.s.kind !== 'cut') return; fxStam(p, 5); return 1; } },
  n_sb_farspell: { onHit: (b, p, e, o, c) => { if (e.row !== 'back' || kindOfCur(c) !== 'spell' || b.farA === b.actN) return; b.farA = b.actN; fxStam(p, 4); return 1; } },
  n_sb_altbeat: { altWardAdd: 1, altDouble: 1 }, // 10월 17일 보완 1: 한 차례 두 번 교대 → 보호막 +3 · 다음 스킬 비용 −1 (sbEnd · skCostAt)
  n_sb_hybrid: { sbCross: 0.3 }, // 10월 17일 보완 2: 베기는 지능의 30%, 주문은 힘의 30%를 공격 능력치에 (skillBaseDamage)
  n_sb_edgeadd: { edgeAdd: () => 1 },
  n_sb_three: { alt3Ys: 1 },
  n_sb_manaloop: { onAltWard: (b, p) => { fxStam(p, 3); return 1; } },
  n_sb_remnant: { onWin: run => { const p = run.p; const v = Math.min(p.hpMax * 0.05, (p.wardLeft || 0) / 2, p.hpMax - p.hp); if (!(v > 0)) return; p.hp += v; return 1; } },
  n_sb_thickaegis: {},
  n_sb_bloodmail: { onKill: (b, p, e) => { if (e.pile || !(stk(e, 'bleed') || st(e, 'ignite'))) return; return addWard(b, p, 5, undefined, true) > 0 ? 1 : 0; } },
  n_sb_manamail: { onStart: (b, p) => { addWard(b, p, 6, undefined, true); return 1; } },
  n_sb_under: { inP: (b, p, o) => p.ward > 0 && !o.dot ? 0.04 : 0 },
  ks_sb_sear: { ksSearSpell: 1 }, ks_sb_sin: { ksSinBlock: 1 }, ks_sb_ash: { ksAshBlast: 1 }, // 0.8.0 M5-0 마검사 경계 큰 각인(js/24 addS · 방어 · js/10 sbWardHit)
  ks_deep: { ysCap: 1, hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.15 : 0 }, // 0.8.0 M4(D10): 대가 기본 공격 −15%
  ks_sharp: { ysCap: -2, hitP: (b, p, e, o, c) => c && c.id === 'basic' ? 0.3 : 0, brk: (b, p, e, c) => c && c.id === 'basic' && e && e.intent && e.intent.k && e.intent.k !== 'attack' ? 10 : 0 }, // 날 선 손
  ks_tireless: { cost: (p, id) => id === 'heavy' ? -15 : 0, cap: { life: -1 } }, // 쉬지 않는 팔
  ks_brkbreath: { ysChan: ['무너뜨리기'] }, ks_slipbreath: { ysChan: ['흘리기', '먼저 치우기'] }, ks_blockbreath: { ysChan: ['막기'] }, // 방향별 유산 통로(ysChanResp)
  n_bs_dmg: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? 0.04 : 0 }, n_bs_dmg2: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? 0.04 : 0 },
  n_bs_brk: { brk: (b, p, e, c) => c && c.id === 'basic' ? 2 : 0 },
  n_bs_st: { onHit: (b, p, e, o, c) => { if (!c || c.id !== 'basic') return; const s0 = p.st; p.st = Math.min(p.stMax, p.st + 3); return p.st > s0 ? 1 : 0; } },
  ks_double: { ysRespMax: 1, ysStart: -2 },
  ks_bare: { ysRespPer: 1, hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.2 : 0 },
  ks_crystal: { hitP: (b, p, e, o, c) => skCostOfCur(p, c) === 4 ? 0.25 : 0 },
  ks_glass: { hitP: () => 0.15, inP: (b, p, o) => !o.dot ? -0.10 : 0 },
  ks_wall: { hpMul: 1.12 },
  ks_heavy: { inP: (b, p, o) => !o.dot ? 0.12 : 0, noParry: 1 },
  ks_cycle: { onKill: (b, p, e) => { if (e.pile) return; const left = p.hpMax * 0.15 - (b.ksCyc || 0); const v = Math.min(p.hpMax * 0.03, left); if (!(v > 0)) return; const g = fxHeal(p, v); b.ksCyc = (b.ksCyc || 0) + v; return g > 0 ? 1 : 0; } },
  ks_dry: { healAll: 1.3, cap: { life: -1 } },
  ks_hammer: { brkMul: () => 1.25, hitP: () => -0.08 },
  ks_breaker: { hitP: (b, p, e) => e.s && e.s.broken ? 0.20 : 0 },
  ks_first: { onStart: (b, p) => { addS(b, p, 'haste', 1); return 1; } },
  ks_flow: { onParry: (b, p, src) => { if (!(src && src.intent && (src.intent.aimed || src.intent.k === 'heavy' || src.intent.k === 'charge')) || (b.ksFlowN || 0) >= 2) return; b.ksFlowN = (b.ksFlowN || 0) + 1; return ysAdd(b, 1, 'resp', '흘림새') > 0 ? 1 : 0; } },
  ks_sb_over: { hitP: b => b.sbAlt ? SB_OVER.hit : 0, noAltWard: 1, ovDisc: 1 }, // 10월 17일 보완 4: +35%, 교대 셋 이으면 다음 유산 4 스킬 −3(바닥 1, 전투마다 1번)
  ks_sb_beat: { brk: b => { if (!(b.sbAlt && b.sbRunNow >= 3) || b.ksBeatR === (b.ysR || 0)) return 0; b.ksBeatR = b.ysR || 0; return 40; } },
  ks_sb_blood: { wardCap: 0.25, onStart: (b, p) => { addWard(b, p, 6, undefined, true); return 1; } }, // 10월 17일 보완 4: 상한 25%, 전투 시작 보호막 6
  /* ---- 0.8.0 5단계 파수꾼 (docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 2-5) ---- */
  n_wd_held: { heldWard: 1 }, // 받아낸 몫 (wdHeld)
  n_wd_low: { guardLow: 1 }, // 버팀목 (wdGuardWard)
  n_wd_will: { guardWil: 1 }, // 다진 의지 (wdGuardWard)
  n_wd_brace6: {}, n_wd_bracewall: {}, n_wd_wide: {}, // 시작 스킬 바꾸기 (PN_SK)
  n_wd_remnant: { onWin: run => { const p = run.p; const v = Math.min(p.hpMax * 0.05, (p.wardLeft || 0) / 3, p.hpMax - p.hp); if (!(v > 0)) return; p.hp += v; return 1; } }, // 남은 벽
  n_wd_breath: { cost: (p, id) => id === 'guard' ? -6 : 0 }, // 숨 고르는 방패: 방어 스태미나 20 → 14
  n_wd_shake: { heldBrk: 1 }, // 흔들리는 방패 (wdHeld)
  n_wd_breakwall: { onBreak: (b, p) => { if (b.wdBwA === b.actN) return; b.wdBwA = b.actN; return addWard(b, p, 6, undefined, true) > 0 ? 1 : 0; } }, // 무너뜨린 자의 벽
  n_wd_turn: { inP: (b, p, o) => o.src && !o.dot && o.src.row === 'back' ? 0.06 : 0 }, // 몸 돌리기
  n_wd_pullhit: { hitP: (b, p, e) => { if (e.pulledA == null || e.pulledA === b.actN) return 0; e.pulledA = null; return 0.15; } }, // 다가서는 방패: 끌어낸 적에게 다음 공격
  n_wd_stack: { hitP: (b, p, e, o, c) => { // 쌓인 벽 (10월 17일 검토 1-1): 유산 3 이상 공격 스킬(태우기 칸 제외) · 강공격만, 보호막 15 이상이면 5를 써서 +12%. 행동마다 한 번
    if (!c || o.ctr) return 0; if (b.wdStA === b.actN) return 0.12; if (b.wdStNo === b.actN) return 0;
    const s = c.skill ? skOf(p, c.id) : null; const ok = c.id === 'heavy' || (s && skCost(s) >= 3 && !s.fx.some(f => f.k === 'wardBurn'));
    if (!ok || (p.ward || 0) < 15) { b.wdStNo = b.actN; return 0; } p.ward -= 5; b.wdStA = b.actN; logp(b, 'good', '쌓인 벽. 보호막 5를 써서 피해 +12%'); return 0.12; } },
  n_wd_respward: { respWard: 1 }, // 막아 든 숨 (ysResp)
  n_wd_ready: { onStart: (b, p) => { addWard(b, p, p.hpMax * 0.06, undefined, true); return 1; } }, // 준비된 방패
  n_wd_fuel: { onSkill: b => { const n = b.burnLast || 0; b.burnLast = 0; if (n < 10) return; fxStam(b.p, 4 * Math.floor(n / 10)); return 1; } }, // 보호막 연료
  n_wd_heavy: { hitP: (b, p, e, o, c) => c && c.id === 'heavy' ? 0.10 : 0, brk: (b, p, e, c) => c && c.id === 'heavy' ? 10 : 0 }, // 무거운 방패
  ks_wd_drop: { hitP: () => 0.15, guardWeak: 1 }, // 방패를 내린 자
  ks_wd_eternal: { wardCap: 0.4, hitP: (b, p, e, o, c) => c && c.skill && (skOf(p, c.id) || { fx: [] }).fx.some(f => f.k === 'wardBurn') ? -0.3 : 0 }, // 영원한 성벽
  /* ---- 0.8.0 5단계 수도승 (3-5) ---- */
  n_mk_loaded: { kiBasic: 1 }, // 실린 주먹 (outDmg)
  n_mk_burst: { kiBurstPer: 1 }, // 터지는 기
  n_mk_last: { hitP: (b, p, e, o, c) => c && c.skill && b.kiTookA === b.actN && st(p, 'empower') === 0 ? 0.12 : 0 }, // 마지막 한 방울
  n_mk_steady: { inP: (b, p, o) => p.stance && o.charged && !o.dot ? 0.15 : 0 }, // 흔들리지 않는 몸
  n_mk_breath: { onCounter: (b, p) => { fxStam(p, 3); return 1; } }, // 고른 숨
  n_mk_cycle: { onWin: run => { const p = run.p; const v = Math.min(p.hpMax * 0.01 * (p.kiLeft || 0), p.hpMax - p.hp); if (!(v > 0)) return; p.hp += v; return 1; } }, // 기의 순환
  n_mk_shake: { ctrBrk: 6 }, // 흔드는 되받기: 되받기 붕괴 10 → 16
  n_mk_seal: { onSeal: (b, p) => { if (b.mkSealA === b.actN) return; b.mkSealA = b.actN; addS(b, p, 'empower', 1); logp(b, 'good', '끊는 손끝. 기 +1'); return 1; } }, // 끊는 손끝
  n_mk_parry: { onParry: (b, p) => { const R = b.ysR || 0; if (b.mkParR === R) return; b.mkParR = R; addS(b, p, 'empower', 1); logp(b, 'good', '흘려 받기. 기 +1'); return 1; } }, // 흘려 받기: 적 차례마다 한 번
  n_mk_prestance: {}, // 먼저 잡은 자세 (PN_SK)
  n_mk_quick: { hitP: (b, p, e, o, c) => c && c.skill && (skOf(p, c.id) || {}).time === 'fast' ? 0.08 : 0 }, // 날랜 손
  n_mk_vessel: { kiCap: 1 }, // 기의 그릇 (kiCapOf)
  n_mk_seed: { onStart: (b, p) => { addS(b, p, 'empower', 1); return 1; } }, // 남은 숨
  n_mk_double: { ctrKi2: 1 }, // 되받은 기세: 한 적 차례의 두 번째 되받기부터 기 +1 더
  n_mk_pool: { hitP: (b, p, e, o) => o && o.ctr && st(p, 'empower') >= kiCapOf(p) ? 0.2 : 0 }, // 고인 기
  n_mk_spill: { kiSpillSt: 4 }, // 넘치는 기운
  ks_mk_empty: { hitP: (b, p, e, o, c) => c && c.skill && (skOf(p, c.id) || { fx: [] }).fx.some(f => f.k === 'kiBurst') ? 0.3 : 0, ctrKiOnce: 1 }, // 비운 그릇 (10월 17일 검토 2-2: 대가는 되받기 기 한 번)
  ks_mk_vow: { inP: (b, p, o) => p.stance && !o.dot ? 0.12 : 0, noFastAtk: 1 }, // 부동의 맹세
  /* ---- 0.8.0 5단계 사냥꾼 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-5, 10월 18일) ---- */
  n_hn_pull: { hitP: (b, p, e, o, c) => c && c.id === 'basic' && b.extraTurn ? 0.15 : 0, onHit: (b, p, e, o, c, d) => { if (!c || c.id !== 'basic' || !b.extraTurn || !(d > 0) || b.hnPullA === b.actN) return; b.hnPullA = b.actN; fxStam(p, 5); return 1; } }, // 이어 당기는 활: 가속의 두 번째 차례 기본 공격(덧화살 포함) +15%, 맞히면 스태미나 +5
  n_hn_breath: { hitP: (b, p, e, o, c) => c && c.skill && hnFocusPre(b, p, e, o) >= HUNT.focusMax ? 0.08 : 0 }, // 사냥감의 숨: 맞히기 전 추적 3겹 이상
  n_hn_tough: { inP: (b, p, o) => !o.dot && p.hp <= p.hpMax * 0.3 ? 0.08 : 0 }, // 질긴 사냥꾼
  n_hn_unavoid: { inP: (b, p, o) => o.aoe || o.spell || o.dot ? 0.08 : 0 }, // 피할 수 없는 것
  n_hn_rest: { onEvade: (b, p) => { if ((b.hnRestN || 0) >= 3) return; b.hnRestN = (b.hnRestN || 0) + 1; return fxHeal(p, p.hpMax * 0.02) > 0 ? 1 : 0; } }, // 숨 고르기: 전투마다 3번
  n_hn_camp: { onWin: run => { const p = run.p; const v = Math.min(p.hpMax * 0.01 * Math.min(4, p.ysLeft || 0), p.hpMax - p.hp); if (!(v > 0)) return; p.hp += v; return 1; } }, // 사냥꾼의 휴식: 남은 유산 1마다 1%(최대 4%)
  n_hn_tele: { hitP: (b, p, e) => e.intent && (YS_PRE_K.includes(e.intent.k) || e.intent.aimed) ? 0.08 : 0 }, // 예고 읽기: 큰 예고(먼저 치우기와 같은 기준)
  n_hn_cutarrow: { onBreak: (b, p) => { if (!b.brkCut || !b.cur || b.hnCutA === b.actN) return; b.hnCutA = b.actN; fxStam(p, 12); return 1; } }, // 끊은 화살: 붕괴로 예고를 끊으면(addBreak의 b.brkCut)
  n_hn_stopgap: { onBreak: (b, p, e) => { if (!b.brkCut || !b.cur) return; e.hnGapA = b.actN; return 1; }, hitP: (b, p, e) => { if (e.hnGapU === b.actN) return 0.15; if (e.hnGapA == null || e.hnGapA === b.actN) return 0; e.hnGapA = null; e.hnGapU = b.actN; return 0.15; } }, // 멈춰 세운 틈: 끊은 적에게 다음 공격(연타는 그 공격 전체)
  n_hn_aside: { onEvade: (b, p) => { p.hnAside = 1; return 1; }, hitP: (b, p, e, o, c) => { if (b.hnAsideU === b.actN) return 0.1; if (!p.hnAside || !c || o.ctr) return 0; p.hnAside = 0; b.hnAsideU = b.actN; return 0.1; } }, // 비켜 선 자리: 피한 다음 내 첫 공격 한 번
  n_hn_quick: { hitP: (b, p, e, o, c) => c && c.skill && (skOf(p, c.id) || {}).time === 'fast' ? 0.08 : 0 }, // 날랜 시위
  n_hn_pass: { onKill: (b, p, e) => { if (e.pile || !p.focus || p.focus.id !== e.id || p.focus.n < HUNT.focusMax) return; p.hnPass = 1; return 1; } }, // 넘겨받는 추적: 다음에 친 다른 적은 추적 1겹에서 (hurtEnemy)
  n_hn_linkup: { hnLinkUp: 1 }, // 이어 쏘기 숙련: 연계 +30% → +38% (hnLinkMul)
  n_hn_finale: { hitP: (b, p, e, o, c) => c && c.skill && b.hnLinkA === b.actN && skCostOfCur(p, c) === 4 ? 0.12 : 0 }, // 끝맺는 연계: 연계로 쓴 유산 4 스킬
  ks_hn_solo: { hnSolo: 1 }, // 외길 사냥꾼 (soloOn · skCondMet link)
  ks_hn_chase: { focusCap: 1 }, // 끝까지 쫓는 자 (focusCapOf)
  /* ---- 10월 18일 0.8.0 5단계 원소술사 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 3-2 · 3-3 · 3-5, 결정 9–11) ----
     flatAdd: hurtEnemy가 배율을 모두 곱한 뒤 더한다(원소술사만). shockMul: 열충격 배수(elemShock, 곱함). elGuard: 서리 무게 더하기(elGuardOf). onChantCut: elCutEv, elCutResp: ysResp → elCutResp. onRime: elemRime */
  n_el_student: { flatAdd: (b, p, e, o, c) => { if (o.dot || !c || !c.skill || b.elStuA === b.actN) return 0; b.elStuA = b.actN; return 3; } }, // 불의 학도: 스킬의 첫 타격 +3(행동마다 한 번)
  n_el_blaze: { hitP: (b, p, e, o, c) => c && c.skill && !o.dot && b.elBurnPre && (b.elBurnPre[e.id] || 0) >= 5 ? 0.10 : 0 }, // 거센 불길: 불태우기 계열이 화상 5 이상을 지우면 그 공격 +10% (b.elBurnPre는 runSkill2가 싣는다)
  n_el_frostskin: { inP: (b, p, o) => o.src && !o.dot && (st(o.src, 'chill') > 0 || o.src.chillR === b.round) ? 0.05 : 0 }, // 서리 껍질: 둔화된 적(서리 무게와 같은 판정)에게서 받는 직접 피해 −5%, 큰 공격에도
  n_el_dull: { elGuard: 0.05 }, // 무뎌진 칼날: 서리 무게 −30% → −35%(평소 공격만)
  n_el_coolbreath: { onShock: (b, p) => { const left = p.hpMax * 0.05 - (b.elCbH || 0); const v = Math.min(p.hpMax * 0.01, left); if (!(v > 0)) return; const g = fxHeal(p, v); b.elCbH = (b.elCbH || 0) + v; return g > 0 ? 1 : 0; } }, // 식은 숨: 열충격마다 1%, 전투마다 5%까지
  n_el_melt: { onRime: (b, p) => { const left = p.hpMax * 0.04 - (b.elMeltH || 0); const v = Math.min(p.hpMax * 0.01, left); if (!(v > 0)) return; const g = fxHeal(p, v); b.elMeltH = (b.elMeltH || 0) + v; return g > 0 ? 1 : 0; } }, // 녹는 서리: 되얼림이 발동할 때마다 1%, 전투마다 4%까지
  n_el_chanthand: { brk: (b, p, e) => e && e.intent && CHANT_K.includes(e.intent.k) ? 10 : 0 }, // 영창 끊는 손: 영창 중(chant · chanting · burn)인 적에게 붕괴 +10
  n_el_cracked: { shockMul: (b, p, e) => e && e.s && e.s.broken ? 1.2 : 1 }, // 깨진 얼음: 무너진 적에게 열충격 +20%
  n_el_first: { hitP: (b, p, e, o, c) => c && c.skill && !o.dot && (b.turnIdx || 0) === 0 ? 0.12 : 0 }, // 앞선 주문: 전투 첫 내 차례(가속의 두 번째 차례는 빼고)의 스킬 +12%
  n_el_light: { onSkill: (b, p, act) => { if (!act || !act.s || act.s.time !== 'fast' || !b.elSt || b.elSt.a !== b.actN || !(b.elSt.ignite || b.elSt.chill)) return; fxStam(p, 4); return 1; } }, // 가벼운 손: ⚡ 스킬로 화상이나 둔화를 걸면 스태미나 +4(행동마다 한 번, b.elSt는 addS가 적는다)
  n_el_scatter: { onChantCut: (b, p) => { fxStam(p, 10); return 1; } }, // 흩어진 주의: 영창을 끊으면 스태미나 +10
  n_el_echo: { onShock: (b, p) => { fxStam(p, 6); return 1; } }, // 이어지는 울림: 옛 남는 울림(k_el3)의 효과
  n_el_spread: { shockMul: (b, p, e, arc) => arc ? 1.15 : 1, hitP: (b, p, e, o, c) => c && c.skill && !o.dot && (skOf(p, c.id) || { fx: [] }).fx.some(f => f.k === 'shockx' && f.arc) ? 0.15 : 0 }, // 번지는 울림: 번진 열충격 · 번짐 칸의 직접 피해 +15%
  n_el_even: { onSkill: b => { if (!b.elSt || b.elSt.a !== b.actN || !b.elSt.ignite || !b.elSt.chill) return; fxStam(b.p, 6); return 1; } }, // 고른 원소: 한 행동에 화상 · 둔화를 둘 다 걸면 스태미나 +6
  ks_el_cut: { elCutResp: 1 }, // 끊어진 영창 (elCutResp: 끊기 · 무너뜨리기 · 먼저 치우기 → 라운드 한도 밖 대응 +1, 전투마다 2번. 10월 18일 0.8.0 5단계 결정 5)
  ks_el_ember: { elBurnPer: 1, shockMul: () => 0.7 }, // 잿불의 길: 태운 화상 1마다 +1 더 · 대가 열충격 −30%
  ks_el_heart: { elGuard: 0.15, elIgnCut: 1 }, // 얼음 심장: 서리 무게 −45% · 대가 거는 화상 −1(최소 1)
  /* ---- 10월 18일 0.8.0 5단계 암살자 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 1-3 · 4-6, 결정 13–17) ----
     값 키는 암살자만 읽는다(asSum · psnCapOf, js/20): psnCap 중독 상한(addPoison) · parryCut 흘리기 감소분 빼기(parryRed · setParry) · parryLow 생명력 50% 이하 흘리기 감소분(setParry) ·
     parryBigCut 강적 · 보스 −20%p 줄이기(parryBigOf) · parryBrk 강타를 흘려 낸 붕괴(hurtPlayer) · drainP 독 흡수 회복(runSkill2) · psnFirst · psnCut 거는 독(asPsnIn) · parrySkP 흘리기 스킬이 흘려 내고 주는 피해(hurtPlayer).
     흘려 냄 표시 p.asParT = 흘려 낸 다음 내 차례(hurtPlayer), 연이은 흘림 p.asChain(공통 흘리기에서 지움), 터뜨려 쓰러뜨림 b.asBurstK(runSkill2), onRespDisc는 ysSpend */
  n_as_gap: { hitP: (b, p, e, o, c) => { if (b.asGapU === b.actN) return 0.1; if (p.asParT == null || p.asParT !== (b.turnIdx || 0) || !isAtkC(c)) return 0; p.asParT = null; b.asGapU = b.actN; return 0.1; } }, // 흘려 낸 틈: 흘려 낸 다음 내 차례 첫 공격(연타 · 광역은 그 공격 전체) +10%, 한 번
  n_as_ripe: { hitP: (b, p, e) => st(e, 'poison') >= 15 ? 0.08 : 0 }, // 무르익은 독: 중독 15 이상
  n_as_thin: { parryLow: 0.05 }, // 얇은 그림자: 생명력 50% 이하일 때 거는 흘리기 +5%p(상한 90%)
  n_as_dodge: { parryBigCut: 0.05 }, // 피하는 몸: 강적 · 보스 −20%p → −15%p
  n_as_drink: { drainP: 0.15 }, // 독 마시는 몸: 독 흡수 계열 회복 +15%
  n_as_breath: { onParry: (b, p) => { const left = p.hpMax * 0.04 - (b.asBrH || 0); const v = Math.min(p.hpMax * 0.01, left); if (!(v > 0)) return; const g = fxHeal(p, v); b.asBrH = (b.asBrH || 0) + v; return g > 0 ? 1 : 0; } }, // 흘린 숨: 흘려 내면 1%, 전투마다 4%까지
  n_as_warm: { onKill: (b, p, e) => { if (!b.asBurstK || e.pile) return; const left = p.hpMax * 0.06 - (b.asWarmH || 0); const v = Math.min(p.hpMax * 0.02, left); if (!(v > 0)) return; const g = fxHeal(p, v); b.asWarmH = (b.asWarmH || 0) + v; return g > 0 ? 1 : 0; } }, // 남은 독의 온기: 터뜨려 쓰러뜨리면 2%, 전투마다 6%까지
  n_as_crush: { brkMul: (b, p, e) => e && st(e, 'poison') >= 10 ? 1.1 : 1 }, // 무너뜨리는 독: 중독 10 이상인 적에게 붕괴 +10%
  n_as_edge: { parryBrk: 10 }, // 끊는 칼끝: 강타를 흘려 내면 붕괴 +25 → +35
  n_as_crack: { hitP: (b, p, e, o) => o && o.burst && e.s && e.s.broken ? 0.2 : 0 }, // 깨진 틈 찌르기: 무너진 적에게 터뜨린 피해 +20%
  n_as_step: { cost: (p, id) => id === 'dodge' ? -4 : 0 }, // 그림자 발: 흘리기 스태미나 −4
  n_as_chain: { onParry: (b, p) => { p.asChain = 1; return 1; }, cost: (p, id) => id === 'dodge' && p.asChain ? -10 : 0 }, // 연이은 흘림: 흘려 낸 다음 공통 흘리기 −10(한 번)
  n_as_mem: { psnFirst: 2 }, // 독 기억: 전투에서 처음 거는 독 +2
  n_as_store: { psnCap: 24 }, // 독의 저장고: 중독 상한 20 → 24
  n_as_link: { onRespDisc: (b, p) => { fxStam(p, 6); return 1; } }, // 이어진 그림자: resp 조건 할인이 들면 스태미나 +6
  ks_as_lord: { psnCap: 30, parryCut: 0.15 }, // 독의 군주: 중독 상한 30 · 대가 흘리기 감소분 70% → 55%(공통 · 스킬)
  ks_as_oath: { cost: (p, id) => id === 'dodge' ? -10 : 0, parrySkP: 0.15, psnCut: 0.3, hitP: (b, p, e, o, c) => c && c.skill && (skOf(p, c.id) || { fx: [] }).fx.some(f => f.k === 'parry') ? 0.15 : 0 }, // 그림자 맹세: 흘리기 스태미나 −10 · 흘리기 스킬 피해 +15% · 대가 거는 독 −30%(최소 1)
};
/* 사냥꾼: 이 타격 전의 추적 겹 (한 적 공격은 hurtEnemy가 겹을 먼저 올리므로 그 전 값, 광역은 올리지 않는다) */
function hnFocusPre(b, p, e, o) { if (!p.focus || p.focus.id !== e.id) return 0; if (o && o.aoe) return p.focus.n; if (b.curSkill && b.focusKey === b.curSkill + ':' + e.id) return b.focusPre || 0; return Math.max(0, p.focus.n - 1); }
const PSM_FX = new Map();
function ptSmallFx(sm) { const key = (sm.brk || 0) + ':' + (sm.st || 0); if (!PSM_FX.has(key)) PSM_FX.set(key, Object.assign(sm.st ? { st: { st: PT.smallSt * sm.st } } : {}, sm.brk ? { brkMul: (() => { const m = Math.pow(1 + PT.smallBrk, sm.brk); return () => m; })() } : {})); return PSM_FX.get(key); }
