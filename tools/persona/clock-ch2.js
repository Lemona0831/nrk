'use strict';
/* 0.8.0 G-1 2챕터 강적 시계 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련 성향에서, 시계가 한 칸 남았을 때 부른다).
   { 강적 id: (b, e, G0, r) => [행동, 대상] | null } — 가진 수단 가운데 싼 것부터. 규칙의 뜻은 비공개 문서 참조 */
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
const dmgAct = x => x.id === 'basic' || x.id === 'heavy' || !!(x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const dmgN = x => x.id === 'heavy' ? 1.6 : x.id === 'basic' ? 1 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'dmg' ? f.n : 0), 0) / 4 : 0; // 대략의 크기(고르는 순서에만)
const costOf = x => x.id === 'basic' ? 0 : x.id === 'dodge' || x.id === 'guard' ? 1 : x.id === 'heavy' ? 2 : /^flask/.test(x.id) ? 4 : 3;
const cheap = L => L.slice().sort((x, y) => costOf(x) - costOf(y))[0] || null;
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee' && x.id !== 'sig');
const pick = (x, t) => x ? [x.id, x.aoe || x.self ? null : t.id] : null;
function breaks(b, G0, t, x) { if (!t || !t.alive || (t.s && t.s.broken) || t.under || x.self || !G0.canTarget(b, t, x)) return false; const k = brkOf(x); return k > 0 && t.brk + k * (1 + 0.01 * (G0.stat ? G0.stat(b.p, 'str') : 0)) >= t.brkMax; }
const breakOn = (b, G0, L, t) => pick(cheap(L.filter(x => breaks(b, G0, t, x))), t);
const aoeHit = L => cheap(L.filter(x => x.aoe && dmgAct(x)));
const hitOn = (b, G0, L, t, f) => pick(cheap(L.filter(x => !x.self && !x.aoe && dmgAct(x) && G0.canTarget(b, t, x) && (!f || f(x)))), t);
const bigOn = (b, G0, L, t) => { const c = L.filter(x => !x.self && !x.aoe && dmgAct(x) && G0.canTarget(b, t, x)).sort((x, y) => dmgN(y) - dmgN(x))[0]; return pick(c, t); };
const dodgeOn = (b, G0, L, e) => { const d = L.find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
const HURTS = ['attack', 'heavy', 'combo', 'shadowstab'];
module.exports = {
  ledger(b, e, G0) {
    const L = acts(b, G0); const br = breakOn(b, G0, L, e); if (br) return br;
    return L.find(x => x.id === 'paydebt') ? ['paydebt', null] : null;
  },
  champion(b, e, G0) {
    const L = acts(b, G0); const br = breakOn(b, G0, L, e); if (br) return br;
    if (e.intent && HURTS.includes(e.intent.k)) { const d = dodgeOn(b, G0, L, e); if (d) return d; }
    return bigOn(b, G0, L, e);
  },
  lampthief(b, e, G0) {
    const L = acts(b, G0);
    if (L.find(x => x.id === 'lampoil')) return ['lampoil', null];
    if (e.under) { const a = aoeHit(L); if (a) return [a.id, null]; }
    if (e.intent && e.intent.k === 'shadowstab') { const d = dodgeOn(b, G0, L, e); if (d) return d; }
    return e.under ? null : breakOn(b, G0, L, e) || hitOn(b, G0, L, e);
  },
  captain(b, e, G0) {
    const L = acts(b, G0), al = G0.alive(b); const th = al.find(x => x.role === 'thug'), xb = al.find(x => x.role === 'xbow');
    if (th) { const br = breakOn(b, G0, L, th); if (br) return br; }
    const a = aoeHit(L); if (a) return [a.id, null];
    if (xb && xb.hp <= xb.hpMax * 0.35) { const h = bigOn(b, G0, L, xb); if (h) return h; }
    return null;
  },
  merchant(b, e, G0) {
    const L = acts(b, G0); const br = breakOn(b, G0, L, e); if (br) return br;
    if (L.find(x => x.id === 'tradeyes') && b.p.hp < b.p.hpMax * 0.6) return ['tradeyes', null];
    return null;
  },
};
