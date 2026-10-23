'use strict';
/* G-1 3챕터 강적 시계: 테스터의 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련에서 시계가 마지막 칸 앞일 때 부른다).
   (b, e, G0, r) → [행동 id, 대상 id] | null. 가장 값싼 답 하나(비공개 문서 참조) */
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee');
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk || 0 : 0), 0) : 0;
const dmgOf = x => x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const pick = (x, t) => [x.id, x.aoe ? null : t ? t.id : null];
const ready = (b, G0, t, f) => acts(b, G0).filter(x => !x.self && G0.canTarget(b, t, x) && f(x));
/* 붕괴 행동 고르기: 끝낼 수 있으면 그 가운데 가장 작은 것, 아니면 가장 큰 것 */
function brkOn(b, G0, t, finishOnly) {
  const need = (t.brkMax || 0) - (t.brk || 0); const L = ready(b, G0, t, x => brkOf(x) > 0).sort((x, y) => brkOf(x) - brkOf(y));
  const fin = L.find(x => brkOf(x) >= need); if (fin) return pick(fin, t); if (finishOnly || !L.length) return null; return pick(L[L.length - 1], t);
}
const guard = (b, G0) => { const g = acts(b, G0).find(x => x.id === 'guard'); return g ? ['guard', null] : null; };
const parry = (b, G0, e) => { const d = acts(b, G0).find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
module.exports = {
  beaconlord(b, e, G0) {
    const f = G0.alive(b).filter(x => x.role === 'bonfire').sort((x, y) => x.fuse - y.fuse || y.brk - x.brk)[0]; if (!f) return null;
    const fin = brkOn(b, G0, f, 1); if (fin) return fin;
    if (e.intent && e.intent.k === 'pourbeacon') return guard(b, G0) || brkOn(b, G0, f);
    return brkOn(b, G0, f);
  },
  siege(b, e, G0) {
    const part = G0.alive(b).find(x => x.role === 'rampart'); const fin = part && brkOn(b, G0, part, 1); if (fin) return fin;
    if (e.intent && e.intent.k === 'launch') { const p = parry(b, G0, e); if (p) return p; }
    return brkOn(b, G0, e, 1) || (part && brkOn(b, G0, part)) || null;
  },
  speaker(b, e, G0) {
    const R = G0.alive(b).filter(x => x.role === 'rioter' && !x.strong).sort((x, y) => x.hp - y.hp);
    if (R.length) { const a = acts(b, G0).find(x => x.aoe && !x.self && dmgOf(x)); if (a) return [a.id, null]; }
    for (const x of R) { const L = ready(b, G0, x, dmgOf); const h = L.find(y => y.id === 'heavy') || L.find(y => y.id === 'basic') || L[0]; if (h) return pick(h, x); }
    return brkOn(b, G0, e, 1);
  },
  marksman(b, e, G0) {
    const fin = brkOn(b, G0, e, 1); if (fin) return fin;
    if (e.intent && e.intent.k === 'oneshot') { const p = parry(b, G0, e); if (p) return p; }
    const L = ready(b, G0, e, x => dmgOf(x) && (x.aoe || x.ranged || (x.v2 && x.s && x.s.tgt === 'ranged'))); return L.length ? pick(L[0], e) : null;
  },
  wallcap(b, e, G0) {
    const fl = acts(b, G0).find(x => x.id === 'flaskM'); if (fl && (b.p.taint || 0) > 0) return ['flaskM', null];
    const K = G0.alive(b).filter(x => x.role === 'brick' && !x.fallen).sort((x, y) => (y.brk || 0) - (x.brk || 0)); if (!K.length) return null;
    for (const k of K) { const a = brkOn(b, G0, k, 1); if (a) return a; }
    return brkOn(b, G0, K[0]);
  },
};
