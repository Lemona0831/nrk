'use strict';
/* 0.8.0 G-1 1챕터 강적 시계 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련 성향에서, 시계가 한 칸 남았을 때 부른다).
   { 강적 id: (b, e, G0, r) => [행동, 대상] | null } — 가진 수단 가운데 싼 것부터. 규칙의 뜻은 비공개 문서 참조 */
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
const dmgAct = x => x.id === 'basic' || x.id === 'heavy' || !!(x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const costOf = x => x.id === 'basic' ? 0 : x.id === 'dodge' || x.id === 'guard' ? 1 : x.id === 'heavy' ? 2 : /^flask/.test(x.id) ? 4 : 3;
const cheap = L => L.slice().sort((x, y) => costOf(x) - costOf(y))[0] || null;
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee' && x.id !== 'sig');
const pick = (x, t) => x ? [x.id, x.aoe || x.self ? null : t.id] : null;
/* 이 행동 하나로 t가 무너지는가 */
function breaks(b, G0, t, x) { if (!t || !t.alive || (t.s && t.s.broken) || x.self || !G0.canTarget(b, t, x)) return false; const k = brkOf(x); return k > 0 && t.brk + k * (1 + 0.01 * (G0.stat ? G0.stat(b.p, 'str') : 0)) >= t.brkMax; }
const breakOn = (b, G0, L, t) => pick(cheap(L.filter(x => breaks(b, G0, t, x))), t);
const aoeHit = L => cheap(L.filter(x => x.aoe && dmgAct(x)));
const hitOn = (b, G0, L, t, f) => pick(cheap(L.filter(x => !x.self && !x.aoe && dmgAct(x) && G0.canTarget(b, t, x) && (!f || f(x)))), t);
const prep = (b, G0, L, e) => { const d = L.find(x => x.id === 'dodge'); if (d && G0.canTarget(b, e, d)) return ['dodge', e.id]; return L.find(x => x.id === 'guard') ? ['guard', null] : null; };
const HURTS = ['attack', 'heavy'];
module.exports = {
  bellringer(b, e, G0) {
    const L = acts(b, G0), bell = G0.alive(b).find(x => x.bell); if (!bell) return null;
    if (e.intent && e.intent.k === 'ring') { const d = L.find(x => x.id === 'dodge'); if (d && G0.canTarget(b, e, d)) return ['dodge', e.id]; }
    if (bell.hp <= 1) { const h = hitOn(b, G0, L, bell); if (h) return h; }
    const hb = hitOn(b, G0, L, bell, x => brkOf(x) >= 15); if (hb) return hb;
    const a = aoeHit(L); if (a) return [a.id, null];
    return breakOn(b, G0, L, e) || hitOn(b, G0, L, bell);
  },
  pilgrim(b, e, G0) {
    const L = acts(b, G0); const br = breakOn(b, G0, L, e); if (br) return br;
    return e.intent && HURTS.includes(e.intent.k) ? prep(b, G0, L, e) : null;
  },
  bishop(b, e, G0) {
    const L = acts(b, G0); const cs = G0.alive(b).filter(x => x.corpse).sort((x, y) => x.hp - y.hp);
    if (e.intent && e.intent.k === 'raise') { const br = breakOn(b, G0, L, e); if (br) return br; }
    if (cs.length >= 2) { const a = aoeHit(L); if (a) return [a.id, null]; }
    for (const c of cs) { const h = hitOn(b, G0, L, c); if (h) return h; }
    return breakOn(b, G0, L, e);
  },
  cantor(b, e, G0) {
    const L = acts(b, G0); const br = breakOn(b, G0, L, e); if (br) return br;
    const a = aoeHit(L); if (a) return [a.id, null];
    const ch = G0.alive(b).filter(x => x !== e && x.role !== 'root' && !x.corpse).sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax);
    for (const c of ch) { const h = hitOn(b, G0, L, c); if (h) return h; }
    return null;
  },
  scribe(b, e, G0) {
    const L = acts(b, G0); const br = breakOn(b, G0, L, e); if (br) return br;
    return L.find(x => x.id === 'flaskM') ? ['flaskM', null] : null;
  },
};
