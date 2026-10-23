'use strict';
/* 0.8.0 G-1 1챕터 강적 시계 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련 성향에서, 시계가 마지막 경고 칸(n ≥ max−1)일 때 부른다).
   { 강적 id: (b, e, G0, r) => [행동, 대상] | null } — 2판: 그 칸에서 한 행동으로 0칸이 되는 답 가운데 가진 수단으로 가장 싼 것. 지금 들 답이 없으면 null(평소대로).
   규칙의 뜻은 비공개 문서 참조 */
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
const dmgAct = x => x.id === 'basic' || x.id === 'heavy' || !!(x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const costOf = x => x.id === 'basic' ? 0 : x.id === 'dodge' || x.id === 'guard' ? 1 : x.id === 'heavy' ? 2 : /^flask/.test(x.id) ? 4 : 3;
const cheap = L => L.slice().sort((x, y) => costOf(x) - costOf(y))[0] || null;
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee' && x.id !== 'sig');
const pick = (x, t) => x ? [x.id, x.aoe || x.self ? null : t.id] : null;
/* 이 행동 하나로 t가 무너지는가 */
function breaks(b, G0, t, x) { if (!t || !t.alive || (t.s && t.s.broken) || x.self || !G0.canTarget(b, t, x)) return false; const k = brkOf(x); return k > 0 && t.brk + k * (1 + 0.01 * (G0.stat ? G0.stat(b.p, 'str') : 0)) >= t.brkMax; }
const breakAct = (b, G0, L, t) => cheap(L.filter(x => breaks(b, G0, t, x)));
const breakOn = (b, G0, L, t) => pick(breakAct(b, G0, L, t), t);
const aoeHit = (L, all) => cheap(L.filter(x => x.aoe && dmgAct(x) && (!all || !x.front)));
const hitAct = (b, G0, L, t, f) => cheap(L.filter(x => !x.self && !x.aoe && dmgAct(x) && G0.canTarget(b, t, x) && (!f || f(x))));
const hitOn = (b, G0, L, t, f) => pick(hitAct(b, G0, L, t, f), t);
const dodgeOn = (b, G0, L, e) => { const d = L.find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
const prep = (b, G0, L, e) => dodgeOn(b, G0, L, e) || (L.find(x => x.id === 'guard') ? ['guard', null] : null);
/* 후보 [행동, 결과] 가운데 가장 싼 것 */
const best = C => { const c = C.filter(x => x && x[0]).sort((x, y) => costOf(x[0]) - costOf(y[0]))[0]; return c ? c[1] : null; };
const HURTS = ['attack', 'heavy'];
module.exports = {
  /* 종지기: 줄을 당기는 차례에 흘리기 · 종에 붕괴 행동(강공격) 한 번 */
  bellringer(b, e, G0) {
    const L = acts(b, G0), bell = G0.alive(b).find(x => x.bell); if (!bell) return null;
    const ring = e.intent && e.intent.k === 'ring';
    const C = [];
    if (ring) { const d = L.find(x => x.id === 'dodge'); if (d && G0.canTarget(b, e, d)) C.push([d, ['dodge', e.id]]); }
    { const h = hitAct(b, G0, L, bell, x => bell.hp <= 1 || x.id === 'heavy' || brkOf(x) >= 15); if (h) C.push([h, pick(h, bell)]); }
    if (ring) { const br = breakAct(b, G0, L, e); if (br) C.push([br, pick(br, e)]); }
    return best(C);
  },
  /* 굶주린 순례자: 그 공격을 흘리거나 막기 · 무너뜨리기 */
  pilgrim(b, e, G0) {
    const L = acts(b, G0);
    if (e.intent && HURTS.includes(e.intent.k)) { const p = prep(b, G0, L, e); if (p) return p; }
    return breakOn(b, G0, L, e);
  },
  /* 납골당 주교: 광역 한 번(시체 모두) · 주교 무너뜨리기. 둘 다 없으면 시체 하나라도 */
  bishop(b, e, G0) {
    const L = acts(b, G0), cs = G0.alive(b).filter(x => x.corpse).sort((x, y) => x.hp - y.hp);
    const C = []; const a = cs.length ? aoeHit(L) : null; if (a) C.push([a, [a.id, null]]); const br = breakAct(b, G0, L, e); if (br) C.push([br, pick(br, e)]);
    const x = best(C); if (x) return x;
    for (const c of cs) { const h = hitOn(b, G0, L, c); if (h) return h; }
    return null;
  },
  /* 성가 조율자: 조율자에게 원거리 · 광역 피해 · 무너뜨리기 · 곁의 적 하나 쓰러뜨리기 */
  cantor(b, e, G0) {
    const L = acts(b, G0), C = [];
    const d = hitAct(b, G0, L, e); if (d) C.push([d, pick(d, e)]);
    const a = aoeHit(L, 1); if (a) C.push([a, [a.id, null]]);
    const br = breakAct(b, G0, L, e); if (br) C.push([br, pick(br, e)]);
    const x = best(C); if (x) return x;
    const ch = G0.alive(b).filter(x => x !== e && x.role !== 'root' && !x.corpse).sort((x, y) => x.hp - y.hp);
    for (const c of ch) { const h = hitOn(b, G0, L, c); if (h) return h; }
    const af = aoeHit(L); return af ? [af.id, null] : null;
  },
  /* 검은 서기관: 그 공격을 흘리기 · 무너뜨리기 · 정화 플라스크 */
  scribe(b, e, G0) {
    const L = acts(b, G0);
    if (e.intent && HURTS.includes(e.intent.k)) { const d = dodgeOn(b, G0, L, e); if (d) return d; }
    const br = breakOn(b, G0, L, e); if (br) return br;
    return L.find(x => x.id === 'flaskM') ? ['flaskM', null] : null;
  },
};
