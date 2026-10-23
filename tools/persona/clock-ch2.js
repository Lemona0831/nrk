'use strict';
/* 0.8.0 G-1 2챕터 강적 시계 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련 성향에서, 시계가 마지막 경고 칸일 때 부른다).
   { 강적 id: (b, e, G0, r) => [행동, 대상] | null } — 한 행동으로 드는 결정적 답 가운데 가장 싼 것(경비대장 · 챔피언은 3판). 지금 들 답이 없으면 null(다음 차례에 다시 본다).
   규칙의 뜻은 비공개 문서 참조 */
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
const dmgAct = x => x.id === 'basic' || x.id === 'heavy' || !!(x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const costOf = x => x.id === 'basic' ? 0 : x.id === 'dodge' || x.id === 'guard' ? 1 : x.id === 'heavy' ? 2 : /^flask/.test(x.id) ? 4 : 3;
const cheap = L => L.slice().sort((x, y) => costOf(x) - costOf(y))[0] || null;
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee' && x.id !== 'sig');
const pick = (x, t) => x ? [x.id, x.aoe || x.self ? null : t.id] : null;
function breaks(b, G0, t, x) { if (!t || !t.alive || (t.s && t.s.broken) || t.under || x.self || !G0.canTarget(b, t, x)) return false; const k = brkOf(x); return k > 0 && t.brk + k * (1 + 0.01 * (G0.stat ? G0.stat(b.p, 'str') : 0)) >= t.brkMax; }
const breakOn = (b, G0, L, t) => pick(cheap(L.filter(x => breaks(b, G0, t, x))), t);
const aoeHit = (L, f) => cheap(L.filter(x => x.aoe && dmgAct(x) && (!f || f(x))));
const dodgeOn = (b, G0, L, e) => { const d = L.find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
const HURTS = ['attack', 'heavy', 'combo', 'shadowstab', 'muster'];
const hurts = e => !!(e.intent && HURTS.includes(e.intent.k));
module.exports = {
  ledger(b, e, G0) { // 무너뜨리기 · 빚 갚기
    const L = acts(b, G0); return breakOn(b, G0, L, e) || (L.find(x => x.id === 'paydebt') ? ['paydebt', null] : null);
  },
  champion(b, e, G0) { // 3판: 챔피언 공격 흘리기 · 챔피언 무너뜨리기(큰 한 방은 평소 되감기라 고르지 않는다)
    const L = acts(b, G0);
    return (hurts(e) && dodgeOn(b, G0, L, e)) || breakOn(b, G0, L, e);
  },
  lampthief(b, e, G0) { // 찌르기 흘리기 · 숨은 도둑을 광역으로 · 등불 기름
    const L = acts(b, G0);
    if (hurts(e)) { const d = dodgeOn(b, G0, L, e); if (d) return d; }
    if (e.under) { const a = aoeHit(L); if (a) return [a.id, null]; }
    return L.find(x => x.id === 'lampoil') ? ['lampoil', null] : null;
  },
  captain(b, e, G0) { // 3판: 대장의 호령에 흘리기 · 대장 본체 무너뜨리기(덩치 · 석궁 · 광역은 평소 되감기라 고르지 않는다)
    const L = acts(b, G0);
    return (e.intent && e.intent.k === 'muster' && dodgeOn(b, G0, L, e)) || breakOn(b, G0, L, e);
  },
  merchant(b, e, G0) { // 저울 무너뜨리기 · 청구서 갚기 · 거래 받기
    const L = acts(b, G0);
    return breakOn(b, G0, L, e) || (L.find(x => x.id === 'paydebt') ? ['paydebt', null] : null) || (L.find(x => x.id === 'tradeyes') ? ['tradeyes', null] : null);
  },
};
