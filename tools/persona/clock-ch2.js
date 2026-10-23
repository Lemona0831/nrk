'use strict';
/* 0.8.0 G-1 2챕터 강적 시계 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련 성향에서, 시계가 마지막 경고 칸일 때 부른다).
   { 강적 id: (b, e, G0, r) => [행동, 대상] | null } — 2판: 한 행동으로 드는 결정적 답 가운데 가장 싼 것. 지금 들 답이 없으면 null(다음 차례에 다시 본다).
   규칙의 뜻은 비공개 문서 참조 */
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
const dmgAct = x => x.id === 'basic' || x.id === 'heavy' || !!(x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const dmgN = x => x.id === 'heavy' ? 1.6 : x.id === 'basic' ? 1 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'dmg' ? f.n : 0), 0) / 4 : 0; // 기본 공격 한 번에 견준 대략의 크기
const costOf = x => x.id === 'basic' ? 0 : x.id === 'dodge' || x.id === 'guard' ? 1 : x.id === 'heavy' ? 2 : /^flask/.test(x.id) ? 4 : 3;
const cheap = L => L.slice().sort((x, y) => costOf(x) - costOf(y))[0] || null;
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee' && x.id !== 'sig');
const pick = (x, t) => x ? [x.id, x.aoe || x.self ? null : t.id] : null;
function breaks(b, G0, t, x) { if (!t || !t.alive || (t.s && t.s.broken) || t.under || x.self || !G0.canTarget(b, t, x)) return false; const k = brkOf(x); return k > 0 && t.brk + k * (1 + 0.01 * (G0.stat ? G0.stat(b.p, 'str') : 0)) >= t.brkMax; }
const breakOn = (b, G0, L, t) => pick(cheap(L.filter(x => breaks(b, G0, t, x))), t);
const aoeHit = (L, f) => cheap(L.filter(x => x.aoe && dmgAct(x) && (!f || f(x))));
const bigOn = (b, G0, L, t, need) => { const c = L.filter(x => !x.self && !x.aoe && dmgAct(x) && G0.canTarget(b, t, x) && dmgN(x) >= need); return pick(cheap(c), t); };
const dodgeOn = (b, G0, L, e) => { const d = L.find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
const HURTS = ['attack', 'heavy', 'combo', 'shadowstab'];
const hurts = e => !!(e.intent && HURTS.includes(e.intent.k));
const CHAMP_BIG_N = 1.3; // 챔피언(13타)의 최대 생명력 10% ≈ 기본 공격 1.3번
module.exports = {
  ledger(b, e, G0) { // 무너뜨리기 · 빚 갚기
    const L = acts(b, G0); return breakOn(b, G0, L, e) || (L.find(x => x.id === 'paydebt') ? ['paydebt', null] : null);
  },
  champion(b, e, G0) { // 챔피언 공격 흘리기 · 무너뜨리기 · 한 행동으로 큰 피해
    const L = acts(b, G0);
    return (hurts(e) && dodgeOn(b, G0, L, e)) || breakOn(b, G0, L, e) || bigOn(b, G0, L, e, CHAMP_BIG_N);
  },
  lampthief(b, e, G0) { // 찌르기 흘리기 · 숨은 도둑을 광역으로 · 등불 기름
    const L = acts(b, G0);
    if (hurts(e)) { const d = dodgeOn(b, G0, L, e); if (d) return d; }
    if (e.under) { const a = aoeHit(L); if (a) return [a.id, null]; }
    return L.find(x => x.id === 'lampoil') ? ['lampoil', null] : null;
  },
  captain(b, e, G0) { // 덩치 무너뜨리기 · 셋을 함께 광역 · 석궁 쓰러뜨리기
    const L = acts(b, G0), al = G0.alive(b); const th = al.find(x => x.role === 'thug'), xb = al.find(x => x.role === 'xbow');
    if (th) { const br = breakOn(b, G0, L, th); if (br) return br; }
    const a = aoeHit(L, x => !xb || !x.s || x.s.tgt !== 'front'); if (a) return [a.id, null];
    if (xb && xb.hp <= xb.hpMax * 0.35) { const h = bigOn(b, G0, L, xb, 0); if (h) return h; }
    return null;
  },
  merchant(b, e, G0) { // 저울 무너뜨리기 · 청구서 갚기 · 거래 받기
    const L = acts(b, G0);
    return breakOn(b, G0, L, e) || (L.find(x => x.id === 'paydebt') ? ['paydebt', null] : null) || (L.find(x => x.id === 'tradeyes') ? ['tradeyes', null] : null);
  },
};
