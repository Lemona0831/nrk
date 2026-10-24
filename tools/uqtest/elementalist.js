'use strict';
/* 0.8.0 M6-1 원소술사 고유 15 (el_h1~h9 · el_r1~r6) 규칙 · 대가 시험. 같은 장면을 only 'rule' / 'cost' 와 'none'으로 돌려 비교한다 */
module.exports = H => {
  const { E, R_, ok, act, st, enemyHit } = H;
  const F = (id, only, o) => H.fight('elementalist', Object.assign({ uq: [id], only }, o || {}));
  const dmg = e => e.hpMax - e.hp;
  const near = (a, b, t) => Math.abs(a - b) < (t == null ? 0.01 : t);
  const recs = (f, k) => f.b.rec.filter(r => r.k === k);
  const shockNow = f => { f.b.actN = (f.b.actN || 0) + 1; R_('elemShock')(f.b, 'enemy'); }; // 적 차례 끝의 열충격(행동 번호를 새로)
  const hurt = (f, e, raw, x) => { const h = f.p.hp; enemyHit(f, e, raw, x); return h - f.p.hp; };
  // 마력탄 · 스킬 · 기본 공격 피해(새 전투, 첫 적)
  const hitD = (id, only, sk, o) => { const f = F(id, only, o); if (o && o.pre) o.pre(f); act(f, sk, f.es[0]); return dmg(f.es[0]); };

  // el_h1 불의 지팡이: 불 마력탄 화상 +1 · 마력탄 피해 −15%
  { const r = F('el_h1', 'rule'), n = F('el_h1', 'none'); act(r, 'e5_bolt'); act(n, 'e5_bolt');
    ok(st(r.es[0], 'ignite') === 3 && st(n.es[0], 'ignite') === 2, '불의 지팡이: 불 마력탄 화상 2 → 3');
    const r2 = F('el_h1', 'rule'); r2.p.elSt.el = 'ice'; act(r2, 'e5_bolt'); ok(st(r2.es[0], 'chill') === 2 && !st(r2.es[0], 'ignite'), '불의 지팡이: 얼음 마력탄은 그대로(둔화 2)'); H.cover('el_h1', 'rule');
    const c = hitD('el_h1', 'cost', 'e5_bolt'), z = hitD('el_h1', 'none', 'e5_bolt'); ok(near(c / z, 0.85, 0.002), '불의 지팡이 대가: 마력탄 피해 ×0.85');
    ok(near(hitD('el_h1', 'cost', 'basic'), hitD('el_h1', 'none', 'basic')), '불의 지팡이 대가: 기본 공격은 그대로'); H.cover('el_h1', 'cost'); }

  // el_h2 불똥 장갑: 모든 적을 치는 주문의 화상 +1 · 한 적을 치는 주문 피해 −10%
  { const A = { act: ['e5_firebolt', 'e5_sparks'] }; const r = F('el_h2', 'rule', A), n = F('el_h2', 'none', A); act(r, 'e5_sparks'); act(n, 'e5_sparks');
    ok(r.es.every(e => st(e, 'ignite') === 2) && n.es.every(e => st(e, 'ignite') === 1), '불똥 장갑: 불똥 세례 화상 1 → 2(모든 적)');
    const r2 = F('el_h2', 'rule', A); act(r2, 'e5_firebolt'); ok(st(r2.es[0], 'ignite') === 3, '불똥 장갑: 한 적 주문(화염탄)의 화상은 그대로 3'); H.cover('el_h2', 'rule');
    const c = hitD('el_h2', 'cost', 'e5_firebolt', A), z = hitD('el_h2', 'none', 'e5_firebolt', A); ok(near(c / z, 0.9, 0.002), '불똥 장갑 대가: 한 적 주문 피해 ×0.9');
    ok(near(hitD('el_h2', 'cost', 'e5_sparks', A), hitD('el_h2', 'none', 'e5_sparks', A)), '불똥 장갑 대가: 모든 적 주문 피해는 그대로'); H.cover('el_h2', 'cost'); }

  // el_h3 서리 장갑: 얼어붙음 붕괴 +40 → +60 · 서리 무게 −20% → −10%
  { const fz = only => { const f = F('el_h3', only); const e = f.es[0]; e.strong = 1; f.p.elSt.el = 'ice'; E.addS(f.b, e, 'chill', 1); const b0 = e.brk; act(f, 'e5_bolt', e); return { d: e.brk - b0, c: st(e, 'chill'), s: e.stun || 0 }; };
    const r = fz('rule'), n = fz('none'); ok(near(r.d, 60) && near(n.d, 40) && !r.c && !r.s, '서리 장갑: 강적이 얼어붙다 말 때 붕괴 40 → 60'); H.cover('el_h3', 'rule');
    const g = only => { const f = F('el_h3', only); E.addS(f.b, f.es[0], 'chill', 1); return [hurt(f, f.es[0], 10), hurt(f, f.es[1], 10)]; };
    const c = g('cost'), z = g('none'); ok(near(c[0], 9) && near(z[0], 8) && near(c[1], 10), '서리 장갑 대가: 둔화된 적의 공격 10 → 9(전에는 8), 둔화 없는 적 10'); H.cover('el_h3', 'cost'); }

  // el_h4 서리 외투: 나를 직접 친 적에게 둔화 1 · 최대 생명력 −10%
  { const r = F('el_h4', 'rule'), n = F('el_h4', 'none'); enemyHit(r, r.es[0], 5); enemyHit(n, n.es[0], 5); enemyHit(r, r.es[1], 5, { dot: 1 });
    ok(st(r.es[0], 'chill') === 1 && !st(n.es[0], 'chill') && !st(r.es[1], 'chill'), '서리 외투: 나를 직접 친 적에게 둔화 1(지속 피해는 아님)');
    r.p.ward = 999; enemyHit(r, r.es[1], 5); ok(st(r.es[1], 'chill') === 1, '서리 외투: 보호막이 다 받아내도 친 적에게 둔화'); H.cover('el_h4', 'rule');
    const c = F('el_h4', 'cost'), z = F('el_h4', 'none'); ok(Math.abs(c.p.hpMax - z.p.hpMax * 0.9) <= 1 && c.p.hpMax < z.p.hpMax, '서리 외투 대가: 최대 생명력 ×0.9 (' + z.p.hpMax + ' → ' + c.p.hpMax + ')'); H.cover('el_h4', 'cost'); }

  // el_h5 마력 지팡이: 마력 화살 무기 피해 배율 50% → 65% · 주문 스킬 피해 −10%
  { const r = hitD('el_h5', 'rule', 'basic'), n = hitD('el_h5', 'none', 'basic'); ok(near(r / n, 1.3, 0.002), '마력 지팡이: 마력 화살 피해 ×1.3 (무기 피해 50% → 65%)');
    ok(near(hitD('el_h5', 'rule', 'e5_bolt'), hitD('el_h5', 'none', 'e5_bolt')), '마력 지팡이: 마력탄 피해는 그대로'); H.cover('el_h5', 'rule');
    const c = hitD('el_h5', 'cost', 'e5_bolt'), z = hitD('el_h5', 'none', 'e5_bolt'); ok(near(c / z, 0.9, 0.002), '마력 지팡이 대가: 주문 스킬 피해 ×0.9');
    ok(near(hitD('el_h5', 'cost', 'basic'), hitD('el_h5', 'none', 'basic')), '마력 지팡이 대가: 마력 화살은 그대로'); H.cover('el_h5', 'cost'); }

  // el_h6 비전 로브: 보호가 있으면 받는 피해 −10% 더 · 최대 생명력 −8%
  { const g = (only, pr) => { const f = F('el_h6', only); if (pr) E.addS(f.b, f.p, 'protect', 2); return hurt(f, f.es[0], 10); };
    ok(near(g('rule', 1), 6.75) && near(g('none', 1), 7.5) && near(g('rule', 0), 10), '비전 로브: 보호가 있으면 10 → 6.75(보호만 7.5), 보호가 없으면 10'); H.cover('el_h6', 'rule');
    const c = F('el_h6', 'cost'), z = F('el_h6', 'none'); ok(Math.abs(c.p.hpMax - z.p.hpMax * 0.92) <= 1 && c.p.hpMax < z.p.hpMax, '비전 로브 대가: 최대 생명력 ×0.92'); H.cover('el_h6', 'cost'); }

  // el_h7 빙염 반지: 열충격 피해 30%가 곁의 적 하나에게 · 열충격 붕괴 없음
  { const sh = only => { const f = F('el_h7', only, { en: ['bruiser', 'bruiser', 'bruiser'] }); const [a] = f.es; E.addS(f.b, a, 'ignite', 2); E.addS(f.b, a, 'chill', 1); const b0 = a.brk; shockNow(f); return { f, s: recs(f, 'shock'), sp: dmg(f.es[1]), sp2: dmg(f.es[2]), brk: a.brk - b0 }; };
    const r = sh('rule'), n = sh('none'); ok(r.s.length === 1 && r.sp > 0 && near(r.sp, r.s[0].dmg * 0.3, 0.06) && !r.sp2 && !n.sp, '빙염 반지: 열충격 피해의 30%가 곁의 적 하나에게(' + r.s[0].dmg + ' → ' + r1x(r.sp) + ')');
    ok(recs(r.f, 'shock').length === 1, '빙염 반지: 번진 몫은 다시 열충격을 부르지 않음'); H.cover('el_h7', 'rule');
    const c = sh('cost'); ok(c.brk === 0 && n.brk === 12 && near(c.s[0].dmg, n.s[0].dmg), '빙염 반지 대가: 열충격 붕괴 12 → 0, 피해는 그대로'); H.cover('el_h7', 'cost'); }

  // el_h8 정적의 목걸이: 얼어붙은 적이 행동을 놓칠 때 스태미나 +15 · 최대 스태미나 −20
  { const fz = only => { const f = F('el_h8', only); const e = f.es[0]; f.p.elSt.el = 'ice'; E.addS(f.b, e, 'chill', 1); act(f, 'e5_bolt', e); const fr = e.stun === 1; f.p.st = 10; R_('enemyAct')(f.b, e); const s1 = f.p.st; f.p.st = 10; f.es[1].stun = 1; R_('enemyAct')(f.b, f.es[1]); return { fr, s1, s2: f.p.st }; };
    const r = fz('rule'), n = fz('none'); ok(r.fr && r.s1 === 25 && n.s1 === 10 && r.s2 === 10, '정적의 목걸이: 얼어붙은 적이 행동을 놓치면 스태미나 +15(다른 까닭의 멈춤은 아님)'); H.cover('el_h8', 'rule');
    const c = F('el_h8', 'cost'), z = F('el_h8', 'none'); ok(c.p.stMax === z.p.stMax - 20, '정적의 목걸이 대가: 최대 스태미나 −20'); H.cover('el_h8', 'cost'); }

  // el_h9 마염 장갑: 화상 걸린 적에게 마력 화살 +30% · 둔화 걸린 적에게 −10%
  { const ig = f => E.addS(f.b, f.es[0], 'ignite', 2), ch = f => E.addS(f.b, f.es[0], 'chill', 1);
    const d0 = hitD('el_h9', 'none', 'basic'), rI = hitD('el_h9', 'rule', 'basic', { pre: ig }), nI = hitD('el_h9', 'none', 'basic', { pre: ig });
    ok(near(rI - nI, d0 * 0.3, 0.02) && near(hitD('el_h9', 'rule', 'basic'), d0), '마염 장갑: 화상 걸린 적에게 마력 화살 +30%(화상 없으면 그대로)');
    ok(near(hitD('el_h9', 'rule', 'e5_bolt', { pre: ig }), hitD('el_h9', 'none', 'e5_bolt', { pre: ig })), '마염 장갑: 스킬은 그대로'); H.cover('el_h9', 'rule');
    const cC = hitD('el_h9', 'cost', 'basic', { pre: ch }), nC = hitD('el_h9', 'none', 'basic', { pre: ch }); ok(near(cC / nC, 0.9, 0.002) && near(hitD('el_h9', 'cost', 'basic'), d0), '마염 장갑 대가: 둔화 걸린 적에게 마력 화살 ×0.9'); H.cover('el_h9', 'cost'); }

  // el_r1 쌍원소 지팡이: 원소 전환 유산 0 · 마력탄 피해 −20%
  { const yc = f => (E.actionList(f.b).find(x => x.id === 'e5_switch') || {}).yc;
    const r = F('el_r1', 'rule'), n = F('el_r1', 'none'); ok(yc(r) === 0 && yc(n) === 1, '쌍원소 지팡이: 원소 전환 유산 1 → 0');
    act(r, 'e5_switch'); act(n, 'e5_switch'); ok(r.p.ys === 9 && n.p.ys === 8 && r.p.elSt.el === 'ice', '쌍원소 지팡이: 써도 유산이 줄지 않고 원소가 바뀐다'); H.cover('el_r1', 'rule');
    const c = hitD('el_r1', 'cost', 'e5_bolt'), z = hitD('el_r1', 'none', 'e5_bolt'); ok(near(c / z, 0.8, 0.002), '쌍원소 지팡이 대가: 마력탄 피해 ×0.8'); H.cover('el_r1', 'cost'); }

  // el_r2 열기의 로브: 화상 걸린 적이 주는 피해 −15% · 서리 무게 −20% → −10%
  { const g = (only, k) => { const f = F('el_r2', only); if (k) E.addS(f.b, f.es[0], k, 1); return hurt(f, f.es[0], 10); };
    ok(near(g('rule', 'ignite'), 8.5) && near(g('none', 'ignite'), 10) && near(g('rule'), 10), '열기의 로브: 화상 걸린 적의 공격 10 → 8.5, 화상 없으면 10'); H.cover('el_r2', 'rule');
    ok(near(g('cost', 'chill'), 9) && near(g('none', 'chill'), 8), '열기의 로브 대가: 둔화된 적의 공격 8 → 9(서리 무게 −10%)'); H.cover('el_r2', 'cost'); }

  // el_r3 빙결 장갑: 둔화 걸린 적을 기본 공격 · 서리 스킬로 치면 둔화 +2 · 둔화된 적이 주는 피해 감소 없음
  { const A = { act: ['e5_icespear', 'e5_crack', 'e5_mark'] };
    const g = (only, sk, c0) => { const f = F('el_r3', only, A); const e = f.es[0]; if (c0) E.addS(f.b, e, 'chill', c0); act(f, sk, e); return { c: st(e, 'chill'), fz: recs(f, 'freeze').length, s: e.stun || 0 }; };
    const rb = g('rule', 'basic', 1), nb = g('none', 'basic', 1), r0 = g('rule', 'basic', 0);
    ok(rb.fz === 1 && rb.s === 1 && nb.c === 1 && !nb.fz && r0.c === 0, '빙결 장갑: 둔화 1인 적을 기본 공격으로 치면 둔화 +2 → 3(얼어붙음), 둔화 없는 적은 그대로');
    const rk = g('rule', 'e5_crack', 1), nk = g('none', 'e5_crack', 1), rm = g('rule', 'e5_mark', 1);
    ok(rk.fz === 1 && nk.c === 1 && !nk.fz && rm.c === 1 && !rm.fz, '빙결 장갑: 서리 스킬(서리 균열)은 둔화 +2, 다른 갈래(약화의 표식)는 그대로'); H.cover('el_r3', 'rule');
    const h = only => { const f = F('el_r3', only); E.addS(f.b, f.es[0], 'chill', 1); return hurt(f, f.es[0], 10); };
    ok(near(h('cost'), 10) && near(h('none'), 8), '빙결 장갑 대가: 둔화된 적의 공격 감소가 없다(8 → 10)'); H.cover('el_r3', 'cost'); }

  // el_r4 원소 염주: 열충격이 일어날 때 스태미나 +10 · 최대 스태미나 −15
  { const sh = only => { const f = F('el_r4', only); for (const e of f.es) { E.addS(f.b, e, 'ignite', 1); E.addS(f.b, e, 'chill', 1); } f.p.st = 30; shockNow(f); return { s: f.p.st, n: recs(f, 'shock').length }; };
    const r = sh('rule'), n = sh('none'); ok(r.n === 2 && r.s === 50 && n.s === 30, '원소 염주: 열충격마다 스태미나 +10(두 번 → +20)'); H.cover('el_r4', 'rule');
    const c = F('el_r4', 'cost'), z = F('el_r4', 'none'); ok(c.p.stMax === z.p.stMax - 15, '원소 염주 대가: 최대 스태미나 −15'); H.cover('el_r4', 'cost'); }

  // el_r5 촉매 반지: 열충격 피해 +25% · 받는 피해 +8%
  { const sh = only => { const f = F('el_r5', only); const e = f.es[0]; E.addS(f.b, e, 'ignite', 2); E.addS(f.b, e, 'chill', 1); shockNow(f); return recs(f, 'shock')[0].dmg; };
    const r = sh('rule'), n = sh('none'); ok(near(r / n, 1.25, 0.01), '촉매 반지: 열충격 피해 ×1.25 (' + n + ' → ' + r + ')');
    ok(near(hitD('el_r5', 'rule', 'e5_bolt'), hitD('el_r5', 'none', 'e5_bolt')), '촉매 반지: 직접 피해는 그대로'); H.cover('el_r5', 'rule');
    const g = only => { const f = F('el_r5', only); return [hurt(f, f.es[0], 10), hurt(f, f.es[1], 4, { dot: 1 })]; };
    const c = g('cost'), z = g('none'); ok(near(c[0], 10.8) && near(z[0], 10) && near(c[1], 4.32) && near(z[1], 4), '촉매 반지 대가: 받는 피해 ×1.08(직접 · 지속 모두)'); H.cover('el_r5', 'cost'); }

  // el_r6 서리 플라스크: 마시면 모든 적에게 둔화 1 · 생명력 플라스크 회복 −25%
  { const dr = only => { const f = F('el_r6', only, { en: ['bruiser', 'bruiser', 'bruiser'] }); f.p.flask.life = Math.max(1, f.p.flask.life || 0); f.p.hp = 1; act(f, 'flaskL', null); return { f, h: f.p.hp - 1 }; };
    const r = dr('rule'), n = dr('none'); ok(r.f.es.every(e => st(e, 'chill') === 1) && n.f.es.every(e => !st(e, 'chill')), '서리 플라스크: 마시면 모든 적에게 둔화 1'); H.cover('el_r6', 'rule');
    const c = dr('cost'); ok(c.h > 0 && near(c.h / n.h, 0.75, 0.01), '서리 플라스크 대가: 생명력 플라스크 회복 ×0.75 (' + r1x(n.h) + ' → ' + r1x(c.h) + ')'); H.cover('el_r6', 'cost'); }
};
const r1x = v => Math.round(v * 10) / 10;
