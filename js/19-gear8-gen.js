'use strict';
/* ===== 0.8.0 M6-2 장비 생성 · 상점 · 다시 굴리기 (만든 사람 확정 10월 20일, 설계 nrk-private M6-장비-설계 6절) =====
   한 개를 굴리는 순서(6-2, 시드 재현 — 굴림은 Math.random, 측정 도구가 판마다 시드를 건다):
   1 슬롯(자리 분포) → 2 등급(챕터 확률표 + 자리 보정) → 3 직업(내 직업 60% · 공용 40%) → 4 고유?(희귀 20% · 영웅 35%, 판에 안 나온 것)
   → 5 기반(직업에 맞는 모양 · 등급 보너스 b) → 6 접사(등급 수, 같은 묶음 둘 금지, "지금 빌드" 자리면 첫 접사는 빌드 꼬리표와 맞는 것, 영웅 축은 축 풀)
   → 7 값(단 = 챕터 범위 안) → 8 점수(V가 등급 띠 밖이면 값을 다시, 최대 5번, 그래도 밖이면 가장 가까운 값으로) → 9 이름(js/17).
   "지금 빌드"(6-3, CLASS_FIT 폐기): 패시브 포인트 상위 2방향의 꼬리표 ∪ 장착 스킬의 꼬리표 ∪ 찍은 결합 칸 꼬리표. 장비의 접사 꼬리표와 겹치면 맞음 */
const G8GEN = {
  grade: { 1: { n: 65, m: 28, r: 7, h: 0 }, 2: { n: 45, m: 35, r: 16, h: 4 }, 3: { n: 30, m: 38, r: 24, h: 8 } }, // 평범/고급/희귀/영웅 %
  uq: { r: 0.2, h: 0.35 }, own: 0.6, afN: { n: 0, m: 1, r: 2, h: 2 },
  slotW: { even: { weapon: 1, armor: 1, gloves: 1, amulet: 1, ring: 1, flask: 1 }, boss: { weapon: 2, armor: 2, gloves: 1, amulet: 1, ring: 1, flask: 1 } },
  reroll: { m: 40, r: 90, h: 200, chMul: 1.5, n: 1.6 },
  aim: { m: [0.65, 1], r: [0.1, 0.45] },
  noAf: 0, noWpnAf: 0, // M6-3 측정 손잡이(DG_NOAF · DG_NOWPNAF): 기반만 · 무기만 접사 없음(K 실측 · 무기 = 평타) // 값을 띠의 이 몫 안으로 겨눈다(못 맞추면 띠 전체) — 챕터 곡선(E4 · 9절): 1챕 희귀 ≈ 2챕 고급, 2챕 희귀 ≈ 3챕 고급 // 다시 굴리기 값 = 기준가(등급) × 1.5^(챕터−1) × 1.6^(그 장비를 굴린 횟수)
  dirTags: { pw: ['기본공격연동'], ct: ['붕괴'], ag: ['흘리기', '몸 빼기'], lg: ['처치'], su: ['보호막', '기'], sv: ['막기', '보호막'] }, // 패시브 방향 → 빌드 꼬리표
};
const G8_ORDER = ['n', 'm', 'r', 'h'];
/* ---- 점수(5절, tools/item-score.js와 같은 식 — item-check가 둘을 맞춰 본다) ---- */
function g8Trig(A) { const T = Object.assign({}, ITEM_V.trig), tg = A.tags || []; if (tg.includes('흘리기') || tg.includes('막기')) Object.assign(T, { parry: ITEM_V.trigTag.parry, guard: ITEM_V.trigTag.guard, guardHit: ITEM_V.trigTag.guardHit }); else if (tg.includes('기본공격연동') && !A.fix) Object.assign(T, { basic: ITEM_V.trigTag.basic, heavy: ITEM_V.trigTag.heavy }); else if (tg.includes('붕괴')) T.heavy = ITEM_V.trigTag.heavy; return T; }
/* M6-3 실측 보정(ITEM_V.obs): 접사 한 점의 값 × 1/af, 그 직업(장비를 얻은 직업 k)이면 × 1/cls. 고정 값 · 상태 겹 접사는 빼고 */
const g8ObsK = (A, cls) => A.fix || ITEM_V.obs.keep.includes(A.vs.u) ? 1 : 1 / ITEM_V.obs.af / ((cls && ITEM_V.obs.cls[cls]) || 1);
const g8ClsC = (A, cls) => A.fix || ITEM_V.obs.keep.includes(A.vs.u) ? 1 : (cls && ITEM_V.obs.cls[cls]) || 1; // 직업 배율: 단 범위에 곱한다
function g8VAf(id, v, t, cls) { return g8VAf0(id, v, t) * g8ObsK(AFFIX[id], cls); }
function g8VAf0(id, v, t) {
  const A = AFFIX[id], S = A.vs, U = ITEM_V.unit, T = g8Trig(A), P = ITEM_V.pool, m = ITEM_V.chMul[(t || 1) - 1], p = S.p == null ? 1 : typeof S.p === 'number' ? S.p : ITEM_V.p[S.p];
  if (S.k === 'flat') return U[S.u] * v * T[S.per] * p * (ITEM_V.scale.includes(S.u) ? m : 1); if (S.k === 'pct') return (v / 100) * P[S.pool] * T[S.per] * p * m;
  if (S.k === 'inr') return U.inRed * (v / 100) * (S.pool ? P[S.pool] * T[S.per] : P.taken) * p * m; if (S.k === 'stat') return U[S.u] * v; return 0;
}
function g8VAfs(list, t, cls) { const seen = {}; let s = 0; for (const a of list) { const A = AFFIX[a.id], k = A.vs.per || A.vs.u || a.id; const n = seen[k] = (seen[k] || 0) + 1; s += g8VAf(a.id, a.v, t, cls) * ITEM_V.ov[Math.min(n, ITEM_V.ov.length) - 1]; } return s; }
function g8VBase(it) { const x = itemBase(it); return x.k === 'wpn' ? x.v * ITEM_V.trig.basic : x.k === 'hp' ? x.v * ITEM_V.unit.hp : x.k === 'st' ? x.v * ITEM_V.unit.st : x.k === 'flask' ? x.v * 100 * ITEM_V.unit.flaskPct : 0; }
const g8Afs = it => (it.af || []).concat(it.ax ? [it.ax] : []);
function g8V(it) { if (!isG8(it)) return 0; const U = it.uq && UNIQUE[it.uq]; return g8VBase(it) + g8VAfs(g8Afs(it), U ? U.ch : it.ch, U ? (U.cls === 'all' ? null : U.cls) : it.k) + (U ? U.vr - U.vc : 0); }
const g8Band = (g, t) => { const m = ITEM_V.chMul[(t || 1) - 1]; return (ITEM_V.band[g] || [0, 0]).map(x => x * m); };
/* ---- 지금 빌드(6-3) ---- */
function g8BuildTags(run) {
  const tags = new Set(), p = run && run.p; if (!p) return tags;
  if (run.ptree && run.ptree.own && run.ptree.own.length) { const T = ptBuild(run.build), c = {}; for (const id of run.ptree.own) { const n = T.nodes[id]; if (n && n.dir) c[n.dir] = (c[n.dir] || 0) + 1; }
    for (const d of Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1)).slice(0, 2)) for (const t of G8GEN.dirTags[d] || []) tags.add(t); }
  for (const id of (p.skills || run.skills || [])) { const s = SK2[id]; if (s && s.tags) for (const t of s.tags) tags.add(t); }
  if (run.atree && run.atree.own) for (const id of run.atree.own) { const s = SK2[id]; if (s && s.b === '결합' && s.tags) for (const t of s.tags) tags.add(t); }
  return tags;
}
const g8ItTags = it => { const t = new Set(); for (const a of g8Afs(it)) for (const x of (AFFIX[a.id] || {}).tags || []) t.add(x); return t; };
const g8Fits = (it, tags) => [...g8ItTags(it)].some(t => tags.has(t));
/* ---- 굴림 ---- */
const g8Pick = (w) => { const ks = Object.keys(w), tot = ks.reduce((a, k) => a + w[k], 0); let x = Math.random() * tot; for (const k of ks) { if (x < w[k]) return k; x -= w[k]; } return ks[ks.length - 1]; };
/* 자리 보정(6-1): room 챕터표 · big(보물방 · 큰 적) 한 단 위 · boss 희귀 이상(3챕터는 영웅) · shop 평범~희귀(영웅은 영웅 칸) */
function g8Grade(ch, where) {
  const T = G8GEN.grade[Math.min(3, Math.max(1, ch || 1))]; let g = g8Pick(where === 'shop' ? { n: T.n, m: T.m, r: T.r } : T);
  const top = (ch || 1) >= 2 ? 'h' : 'r', up = x => G8_ORDER[Math.min(G8_ORDER.indexOf(top), G8_ORDER.indexOf(x) + 1)];
  if (where === 'big') g = up(g); if (where === 'boss') { g = up(g); if (G8_ORDER.indexOf(g) < 2) g = 'r'; if ((ch || 1) >= 3) g = 'h'; }
  return g;
}
function g8Shape(build, slot) { const L = Object.keys(AFFIX_BASE).filter(k => AFFIX_BASE[k].slot === slot && (AFFIX_BASE[k].cls === 'all' || AFFIX_BASE[k].cls.includes(build))); return L[Math.floor(Math.random() * L.length)]; }
function g8Pool(slot, cls, t, g, used, ax, kc) {
  return Object.keys(AFFIX).filter(id => { const A = AFFIX[id]; if (!!A.ax !== !!ax || A.pool === false || !A.slot.includes(slot) || !A.tier[t] || used.includes(A.fam)) return false;
    if (ax ? A.cls !== cls : !(A.cls === 'all' || A.cls === cls)) return false; if (g === 'm') { if (A.pair && A.pair.includes(t)) return false; const B = g8Band('m', t), [lo, hi] = g8Rng(id, t, kc); if (g8VAf(id, lo, t, kc) > B[1] + 1e-9 || g8VAf(id, hi, t, kc) < B[0] - 1e-9) return false; } return true; });
}
const g8Rng = (id, t, cls) => { const c = g8ClsC(AFFIX[id], cls), [lo, hi] = AFFIX[id].tier[t]; return c === 1 ? [lo, hi] : [Math.max(1, Math.round(lo * c)), Math.max(1, Math.round(hi * c))]; };
const g8RollV = (id, t, cls) => { const [lo, hi] = g8Rng(id, t, cls); return lo + Math.floor(Math.random() * (hi - lo + 1)); };
/* 값을 등급 띠 안으로: 다시 굴리기 최대 5번, 그래도 밖이면 가장 가까운 값으로(바꿀 수 있는 접사만) */
function g8Fit(list, t, band, free, cls) {
  const inB = () => { const v = g8VAfs(list, t, cls); return v >= band[0] - 1e-9 && v <= band[1] + 1e-9; };
  for (let k = 0; k < 5 && !inB(); k++) for (const i of free) list[i].v = g8RollV(list[i].id, t, cls);
  for (let guard = 0; guard < 400 && !inB(); guard++) { const v = g8VAfs(list, t, cls), dir = v < band[0] ? 1 : -1; let moved = false;
    for (const i of free) { const [lo, hi] = g8Rng(list[i].id, t, cls); const nv = list[i].v + dir; if (nv >= lo && nv <= hi) { list[i].v = nv; moved = true; if (inB()) break; } } if (!moved) break; }
  return inB();
}
function g8Affixes(slot, cls, t, g, want, kc) {
  const n = G8GEN.afN[g] || 0; if (!n) return { af: [], ax: null };
  for (let tries = 0; tries < 30; tries++) {
    const used = [], af = []; let pairs = 0;
    for (let k = 0; k < n; k++) {
      let P = g8Pool(slot, cls, t, g, used, false, kc).filter(id => !(AFFIX[id].pair && AFFIX[id].pair.includes(t)) || (pairs === 0 && n >= 2));
      if (k === 0 && want && want.size) { const W = P.filter(id => (AFFIX[id].tags || []).some(x => want.has(x))); if (W.length) P = W; }
      if (!P.length) break; const id = g8PickW(P, t); if (AFFIX[id].pair && AFFIX[id].pair.includes(t)) pairs++; used.push(AFFIX[id].fam); af.push({ id, v: g8RollV(id, t, kc) });
    }
    if (af.length < n) continue;
    let ax = null; if (g === 'h') { let P = g8Pool(slot, cls, t, g, [], true, kc); if (want && want.size) { const W = P.filter(id => (AFFIX[id].tags || []).some(x => want.has(x))); if (W.length) P = W; } if (!P.length) continue; const id = g8PickW(P, t); ax = { id, v: g8RollV(id, t, kc) }; }
    const list = af.concat(ax ? [ax] : []), B = g8Band(g, t), W = G8GEN.aim[g]; if (g8Fit(list, t, W ? [B[0] + W[0] * (B[1] - B[0]), B[0] + W[1] * (B[1] - B[0])] : B, list.map((x, i) => i), kc) || g8Fit(list, t, B, list.map((x, i) => i), kc)) return { af: list.slice(0, af.length), ax };
  }
  return null;
}
/* 장비 하나(6-2). o = { slot?, g?, where: room · big · boss · shop · gamble · kit, own?: true(내 직업) · false(공용), want?: 빌드 꼬리표(Set) · true(지금 빌드 보장), noUq? } */
/* A2 챕터 가중 뽑기: 표가 없는 챕터(1 · 3)는 전과 같은 고른 뽑기(난수 한 번) */
function g8PickW(P, ch) { const T = typeof G8_CH !== 'undefined' && G8_CH[ch]; if (!T) return P[Math.floor(Math.random() * P.length)]; const w = P.map(id => T.up.includes(id) ? T.upW : T.down.includes(id) ? T.downW : 1); let x = Math.random() * w.reduce((a, v) => a + v, 0); for (let i = 0; i < P.length; i++) { x -= w[i]; if (x <= 0) return P[i]; } return P[P.length - 1]; }
function g8Gen(run, o) {
  o = o || {}; const ch = Math.min(3, Math.max(1, o.ch || run.ch || 1)), build = run.build;
  const want0 = o.want === true ? g8BuildTags(run) : o.want || null;
  let slot = o.slot || g8Pick(G8GEN.slotW[o.where === 'boss' ? 'boss' : 'even']); let g = o.g || g8Grade(ch, o.where);
  if (!o.slot && want0 && want0.size) { const ok = sl => g8Pool(sl, build, ch, 'm', [], false, build).some(id => (AFFIX[id].tags || []).some(x => want0.has(x))); if (!ok(slot)) { const L = Object.keys(G8GEN.slotW.even).filter(ok); if (L.length) slot = L[Math.floor(Math.random() * L.length)]; } } /* 보장 자리는 빌드 꼬리표 접사가 있는 슬롯으로 */
  if (g === 'l') g = 'h'; if (g === 'h' && ch < 2 && !o.g) g = 'r';
  let own = o.own != null ? o.own : (g === 'h' || Math.random() < G8GEN.own); if (g === 'h') own = true; // 영웅 축은 직업 축이다
  const want = want0;
  const bare = G8GEN.noAf || (G8GEN.noWpnAf && slot === 'weapon'); if (bare) return mkItem8({ base: g8Shape(build, slot), g, ch, b: rollBonus(g) }); /* M6-3 측정: 접사 없이(같은 굴림 순서는 아님) */
  if (!o.noUq && (g === 'r' || g === 'h') && Math.random() < G8GEN.uq[g]) { const u = g8PickUq(run, slot, g, ch, own); if (u) { const it = mkUq(u, ch); (run.uqSeen = run.uqSeen || []).push(u); return it; } }
  const base = g8Shape(build, slot); let g2 = g; if (want && g2 === 'n') g2 = 'm'; // 보장 자리는 접사가 있어야 맞는다
  let A = g8Affixes(slot, own ? build : 'all', ch, g2, want, build); if (!A) { A = g8Affixes(slot, own ? build : 'all', ch, 'm', want, build) || { af: [], ax: null }; g2 = A.af.length ? 'm' : 'n'; }
  const it = mkItem8({ base, g: g2, ch, b: rollBonus(g2), af: A.af.map(a => [a.id, a.v]), ax: A.ax ? [A.ax.id, A.ax.v] : null }); it.k = build; return it; // k: 장비를 얻은 직업(실측 직업 배율 · V)
}
/* 고유 뽑기: 그 슬롯 · 그 등급, 판에 안 나온 것, 내 직업(own) 또는 공용 — 없으면 다른 쪽 */
function g8PickUq(run, slot, g, ch, own) {
  const seen = run.uqSeen || [], ok = c => Object.keys(UNIQUE).filter(id => { const U = UNIQUE[id]; return U.slot === slot && U.g === g && U.ch <= ch && U.cls === c && !seen.includes(id); });
  const L = own ? (ok(run.build).length ? ok(run.build) : ok('all')) : (ok('all').length ? ok('all') : ok(run.build)); return L.length ? L[Math.floor(Math.random() * L.length)] : null;
}
/* ---- 상점(6-1): 챕터 확률표(평범~희귀), "지금 빌드" 1 + 내 직업 1 + 공용 1 이상, 희귀 1 이상, 2챕터부터 영웅 칸(SHOP_HERO) ---- */
function g8ShopStock(run, ch) {
  const L = [g8Gen(run, { ch, where: 'shop', own: true, want: true, noUq: true }), g8Gen(run, { ch, where: 'shop', own: true }), g8Gen(run, { ch, where: 'shop', own: false })];
  if (!L.some(it => it.g === 'r')) L.push(g8Gen(run, { ch, where: 'shop', g: 'r' }));
  const hero = ch >= 2 && Math.random() < SHOP_HERO; while (L.length < (hero ? 5 : 6)) L.push(g8Gen(run, { ch, where: 'shop' }));
  L.sort((a, b) => G8_ORDER.indexOf(a.g) - G8_ORDER.indexOf(b.g)); const out = L.map(it => ({ it, price: priceOf(it.g, ch), sold: 0 }));
  if (hero) out.push({ it: g8Gen(run, { ch, where: 'shop', g: 'h', own: true }), price: priceOf('h', ch), sold: 0, hero: 1 });
  return out;
}
/* ---- 다시 굴리기(6-4): 접사 하나를 같은 묶음을 뺀 풀에서 새로(값도). 고유 · 축 접사는 안 됨. 보장 없음 ---- */
const g8RerollPrice = it => Math.round((G8GEN.reroll[it.g] || 0) * Math.pow(G8GEN.reroll.chMul, (it.ch || 1) - 1) * Math.pow(G8GEN.reroll.n, it.rr || 0));
const g8RerollWhy = (run, it) => !isG8(it) ? '새 장비만 다시 굴립니다' : it.uq ? '이름 있는 장비는 다시 굴리지 않습니다' : !(it.af || []).length ? '접사가 없습니다' : (run.gold || 0) < g8RerollPrice(it) ? '골드가 ' + (g8RerollPrice(it) - (run.gold || 0)) + ' 모자랍니다' : '';
function g8Reroll(run, it, i) {
  if (g8RerollWhy(run, it) || !it.af[i]) return null; const t = it.ch || 1, cls = (AFFIX[it.af[i].id] || {}).cls === 'all' && !it.af.some(a => AFFIX[a.id].cls !== 'all') && !it.ax ? 'all' : run.build;
  const used = it.af.map(a => AFFIX[a.id].fam), pairsElse = it.af.filter((a, k) => k !== i && AFFIX[a.id].pair && AFFIX[a.id].pair.includes(t)).length;
  const kc = it.k || run.build; const P = g8Pool(g8Slot(it), cls, t, it.g, used, false, kc).filter(id => !(AFFIX[id].pair && AFFIX[id].pair.includes(t)) || (!pairsElse && it.af.length >= 2));
  if (!P.length) return null; const price = g8RerollPrice(it); const old = it.af[i];
  for (let k = 0; k < 20; k++) { const id = g8PickW(P, t); const list = g8Afs(it).map(a => ({ id: a.id, v: a.v })); list[i] = { id, v: g8RollV(id, t, kc) }; if (g8Fit(list, t, g8Band(it.g, t), [i], kc) || k === 19) { it.af[i] = list[i]; break; } }
  run.gold -= price; it.rr = (it.rr || 0) + 1; (run.rerolls = run.rerolls || []).push({ ch: run.ch || 1, uid: it.uid, from: old.id + ':' + old.v, to: it.af[i].id + ':' + it.af[i].v, gold: price, t: Date.now() });
  return it.af[i];
}
/* ---- 시작 장비 · 옛 장비(만든 사람 10월 21일: 옛 장비 변환 없음 — 개발 중 세이브의 옛 장비는 그 칸을 비운다) ---- */
function g8StartGear(run) { const mk = sl => mkItem8({ base: g8Shape(run.build, sl), g: 'n', ch: 1, b: 0 }); return { weapon: mk('weapon'), armor: mk('armor'), flask: mk('flask') }; }
function g8Purge(run) {
  if (!GEAR8.on || !run || !run.inv) return 0; let n = 0; if (!run.eqU) { run.eqU = {}; for (const sl of EQ_SLOTS) run.eqU[sl] = null; }
  for (const u of Object.keys(run.inv)) { if (isG8(run.inv[u])) continue; delete run.inv[u]; n++; for (const sl of EQ_SLOTS) if (run.eqU[sl] === u) run.eqU[sl] = null; }
  run.bag = (run.bag || []).filter(u => run.inv[u]);
  if (!run.eqU.weapon) { const w = mkItem8({ base: g8Shape(run.build, 'weapon'), g: 'n', ch: 1, b: 0 }); run.inv[w.uid] = w; run.eqU.weapon = w.uid; } // 무기 칸은 비워 두지 않는다(무기는 다른 무기로만 바꾼다)
  return n;
}
