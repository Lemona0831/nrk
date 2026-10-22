'use strict';
/* 0.8.0 M6-1 수도승 고유 15 단위 시험 (tools/unique-check.js monk). 규칙은 only 'rule' 대 'none', 대가는 'cost' 대 'none'으로 같은 장면을 돌려 비교한다 */
module.exports = H => {
  const { R_, E, ok, fight, act, enemyHit, st } = H;
  const setKi = R_('setKi'), ctr = R_('monkCounter'), ctrMax = R_('monkCtrMax'), kiCap = R_('kiCapOf');
  const near = (a, b, t) => Math.abs(a - b) < (t || 0.02);
  const lost = e => e.hpMax - e.hp;
  const F = (uq, only, o) => fight('monk', Object.assign({ uq: [uq], only }, o || {}));
  // 되받기 한 번의 피해(기 0, 자세 덤 10)
  const ctrDmg = (uq, only) => { const f = F(uq, only); setKi(f.p, 0); f.p.stance = { dmg: 10 }; f.b.cur = null; const e = f.es[0]; ctr(f.b, { src: e }); return lost(e); };
  // 받는 피해(적 공격 raw 10)
  const taken = (uq, only, prep) => { const f = F(uq, only); if (prep) prep(f); return enemyHit(f, f.es[0], 10); };

  /* mk_h1 끊이지 않는 붕대 */
  { const run = only => { const f = F('mk_h1', only, { act: ['m_yeonhwan'] }); setKi(f.p, 4); act(f, 'm_yeonhwan'); act(f, 'basic'); const L = f.b.log.find(x => /연환권: 기본 공격이 \d+타/.test(x.m)); return L ? +/(\d+)타/.exec(L.m)[1] : 0; };
    const r = run('rule'), n = run('none'); ok(n === 8 && r === 10, '끊이지 않는 붕대: 기 4면 연환권 추가 타 +2 (' + n + ' → ' + r + '타)'); H.cover('mk_h1', 'rule');
    const c = ctrDmg('mk_h1', 'cost'), z = ctrDmg('mk_h1', 'none'); ok(z > 0 && near(c / z, 0.8), '끊이지 않는 붕대 대가: 되받기 피해 −20% (' + (c / z).toFixed(3) + ')'); H.cover('mk_h1', 'cost'); }

  /* mk_h2 붕권의 권갑 */
  { const run = (only, k) => { const f = F('mk_h2', only, { act: ['m_bunggwon'] }); setKi(f.p, k); act(f, 'm_bunggwon'); return { f, d: lost(f.es[0]) }; };
    const r = run('rule', 4).d, n = run('none', 4).d; ok(near(r / n, 2.2 / 1.8), '붕권의 권갑: 기 4를 쏟으면 ×1.8 → ×2.2 (' + (r / n).toFixed(3) + ')');
    ok(near(run('rule', 0).d / run('none', 0).d, 1), '붕권의 권갑: 쏟은 기가 없으면 그대로'); H.cover('mk_h2', 'rule');
    const hit = (only, k) => { const { f } = run(only, k); act(f, 'basic'); const d1 = enemyHit(f, f.es[0], 10); H.next(f); act(f, 'basic'); const d2 = enemyHit(f, f.es[0], 10); return [d1, d2]; };
    const c = hit('cost', 4), z = hit('none', 4), c0 = hit('cost', 0);
    ok(near(c[0] / z[0], 1.15) && near(c[1] / z[1], 1) && near(c0[0] / z[0], 1), '붕권의 권갑 대가: 기를 쏟은 다음 적 차례만 받는 피해 +15% (' + (c[0] / z[0]).toFixed(3) + ', 다음 차례 ' + (c[1] / z[1]).toFixed(3) + ')'); H.cover('mk_h2', 'cost'); }

  /* mk_h3 금강 가사 */
  { const run = only => { const f = F('mk_h3', only); const m = ctrMax(f.p); f.p.stance = { dmg: 1 }; f.p.ctrN = 0; for (let i = 0; i < 4; i++) enemyHit(f, f.es[0], 1); return [m, f.p.ctrN]; };
    const r = run('rule'), n = run('none'); ok(n[0] === 2 && r[0] === 3 && n[1] === 2 && r[1] === 3, '금강 가사: 되받기 한도 2 → 3 (실제 ' + n[1] + ' → ' + r[1] + '번)'); H.cover('mk_h3', 'rule');
    ok(near(taken('mk_h3', 'cost') / taken('mk_h3', 'none'), 1.08), '금강 가사 대가: 받는 피해 +8%'); H.cover('mk_h3', 'cost'); }

  /* mk_h4 흐르는 물의 가사 */
  { const t = (only, n) => taken('mk_h4', only, f => { f.p.ctrN = n; }); const z = t('none', 0);
    ok(near(t('rule', 0) / z, 1) && near(t('rule', 2) / t('none', 2), 0.9) && near(t('rule', 6) / t('none', 6), 0.8), '흐르는 물의 가사: 되받은 수마다 받는 피해 −5%(상한 −20%)');
    const seq = only => { const f = F('mk_h4', only); f.p.stance = { dmg: 1 }; f.p.ctrN = 0; const a = enemyHit(f, f.es[0], 10); const c = enemyHit(f, f.es[0], 10); return [a, c]; };
    const sr = seq('rule'), sn = seq('none'); ok(near(sr[0] / sn[0], 1) && near(sr[1] / sn[1], 0.95), '흐르는 물의 가사: 첫 되받기 뒤 그 차례 다음 공격 −5%'); H.cover('mk_h4', 'rule');
    const c = ctrDmg('mk_h4', 'cost'), z2 = ctrDmg('mk_h4', 'none'); ok(near(c / z2, 0.7), '흐르는 물의 가사 대가: 되받기 피해 −30% (' + (c / z2).toFixed(3) + ')'); H.cover('mk_h4', 'cost'); }

  /* mk_h5 점혈 반지 */
  { const run = only => { const f = F('mk_h5', only, { act: ['m_jeomhyeol'] }); setKi(f.p, 0); const e = f.es[0], o = f.es[1]; e.intent = { k: 'heal' }; act(f, 'm_jeomhyeol', e); const sealed = e.intent.k === 'attack';
      const h0 = e.hp; act(f, 'basic', e); const d = h0 - e.hp; H.next(f); setKi(f.p, 0); const g0 = o.hp; act(f, 'basic', o); return { sealed, d, d2: g0 - o.hp }; };
    const r = run('rule'), n = run('none'); ok(r.sealed && n.sealed && near(r.d / n.d, 1.25) && near(r.d2 / n.d2, 1), '점혈 반지: 봉인한 적에게 +25%, 봉인 안 한 적은 그대로 (' + (r.d / n.d).toFixed(3) + ')');
    { const f = F('mk_h5', 'rule'); const e = f.es[0]; f.p.mkSt = { cheon: 3, cheonN: { [e.id]: 4 }, cheonSeal: {} }; R_('mkCheonHit')(f.b, e); ok(e.uqSeal === 1, '점혈 반지: 천망 봉인도 봉인한 적'); }
    H.cover('mk_h5', 'rule');
    const bas = only => { const f = F('mk_h5', only, { act: ['m_jeomhyeol'] }); setKi(f.p, 0); act(f, 'basic'); const a = lost(f.es[0]); H.next(f); setKi(f.p, 0); const h1 = f.es[1].hp; act(f, 'm_jeomhyeol', f.es[1]); return [a, h1 - f.es[1].hp]; };
    const c = bas('cost'), z = bas('none'); ok(near(c[0] / z[0], 0.9) && near(c[1] / z[1], 1), '점혈 반지 대가: 기본 공격 피해 −10%, 스킬은 그대로 (' + (c[0] / z[0]).toFixed(3) + ')'); H.cover('mk_h5', 'cost'); }

  /* mk_h6 탈기의 염주 (M7-3 새 규칙, 만든 사람 확정 10월 22일): 둔화 걸린 적을 치면 기 +1 더, 라운드에 두 번까지 */
  { const run = (only, chill) => { const f = F('mk_h6', only); setKi(f.p, 0); const e = f.es[0]; if (chill) E.addS(f.b, e, 'chill', 3); f.b.round = 1; const hit = () => R_('fxRun')(f.p, 'onHit', f.b, f.p, e, {}, { id: 'basic' }); for (let i = 0; i < 3; i++) hit(); const a = st(f.p, 'empower'); f.b.round = 2; hit(); return [a, st(f.p, 'empower') - a]; };
    const r = run('rule', 1), n = run('none', 1), u = run('rule', 0); ok(r[0] - n[0] === 2 && r[1] - n[1] === 1 && u[0] === n[0], '탈기의 염주: 둔화 걸린 적을 치면 기 +1 더, 라운드에 두 번까지(세 번 쳐서 +' + (r[0] - n[0]) + ', 다음 라운드 +' + (r[1] - n[1]) + ', 둔화 없으면 그대로)'); H.cover('mk_h6', 'rule');
    const c = F('mk_h6', 'cost'), z = F('mk_h6', 'none'); setKi(c.p, 9); ok(kiCap(z.p) === 5 && kiCap(c.p) === 4 && st(c.p, 'empower') === 4, '탈기의 염주 대가: 기 상한 5 → 4'); H.cover('mk_h6', 'cost'); }

  /* mk_h7 반탄의 가사 */
  { const run = only => { const f = F('mk_h7', only); const e = f.es[0]; const k0 = e.brk || 0; f.p.stance = { dmg: 1 }; f.b.cur = null; ctr(f.b, { src: e }); return (e.brk || 0) - k0; };
    const r = run('rule'), n = run('none'); ok(n > 0 && near(r / n, 2), '반탄의 가사: 되받기 붕괴 10 → 20 (' + n + ' → ' + r + ')'); H.cover('mk_h7', 'rule');
    const s = (only, on) => taken('mk_h7', only, f => { f.p.stance = on ? { dmg: 1 } : null; });
    ok(near(s('cost', 1) / s('none', 1), 1.1) && near(s('cost', 0) / s('none', 0), 1), '반탄의 가사 대가: 자세 중에만 받는 피해 +10%'); H.cover('mk_h7', 'cost'); }

  /* mk_h8 역혈의 고리 */
  { const run = only => { const f = F('mk_h8', only); const e = f.es[1]; enemyHit(f, e, 5); const a = st(e, 'chill'); const g = f.es[0]; f.b.cur = null; R_('hurtPlayer')(f.b, 5, { dot: 1, src: g }); return [a, st(g, 'chill')]; };
    const r = run('rule'), n = run('none'); ok(r[0] === 1 && n[0] === 0 && r[1] === 0, '역혈의 고리: 나를 직접 친 적에게 둔화 1(지속 피해는 아님)'); H.cover('mk_h8', 'rule');
    const c = F('mk_h8', 'cost').p.hpMax, z = F('mk_h8', 'none').p.hpMax; ok(Math.abs(c - Math.round(z * 0.9)) <= 1, '역혈의 고리 대가: 최대 생명력 −10% (' + z + ' → ' + c + ')'); H.cover('mk_h8', 'cost'); }

  /* mk_h9 일점의 권갑 */
  { const run = (only, ch, k) => { const f = F('mk_h9', only, { act: ['m_bunggwon'] }); setKi(f.p, k); if (ch) E.addS(f.b, f.es[0], 'chill', ch); act(f, 'm_bunggwon'); return lost(f.es[0]); };
    ok(near(run('rule', 2, 3) / run('none', 2, 3), 1.3) && near(run('rule', 0, 3) / run('none', 0, 3), 1) && near(run('rule', 2, 0) / run('none', 2, 0), 1), '일점의 권갑: 둔화된 적에게 기를 쏟으면 둔화 1마다 +15%(둔화 2 → +30%, 둔화 없거나 쏟은 기 없으면 그대로)'); H.cover('mk_h9', 'rule');
    const aoe = (only, id) => { const f = F('mk_h9', only, { act: [id] }); setKi(f.p, 0); act(f, id); return lost(f.es[0]); };
    ok(near(aoe('cost', 'm_talhon') / aoe('none', 'm_talhon'), 0.8) && near(aoe('cost', 'm_sahyeol') / aoe('none', 'm_sahyeol'), 1), '일점의 권갑 대가: 여럿을 치는 스킬(탈혼수) −20%, 한 적 스킬은 그대로'); H.cover('mk_h9', 'cost'); }

  /* mk_r1 철사 붕대 */
  { const bas = (only, k) => { const f = F('mk_r1', only); setKi(f.p, k); act(f, 'basic'); return lost(f.es[0]); };
    const fast = only => { const f = F('mk_r1', only, { act: ['m_sahyeol'] }); setKi(f.p, 0); act(f, 'm_sahyeol'); return lost(f.es[0]); };
    ok(near(bas('rule', 0) / bas('none', 0), 1.1) && near(bas('rule', 1) / bas('none', 1), 1) && near(fast('rule') / fast('none'), 1), '철사 붕대: 기 없는 ▶ 공격 +10%(기가 실리면 · ⚡ 공격은 그대로)'); H.cover('mk_r1', 'rule');
    ok(near(bas('cost', 1) / bas('none', 1), 1.2 / 1.25) && near(bas('cost', 0) / bas('none', 0), 1), '철사 붕대 대가: 기를 쓴 ▶ 공격 ×1.25 → ×1.20'); H.cover('mk_r1', 'cost'); }

  /* mk_r2 무쇠 가사 */
  { const run = only => { const f = F('mk_r2', only); const e = f.es[1]; e.row = 'back'; f.p.stance = { dmg: 1 }; f.p.ctrN = 0; const h0 = e.hp; enemyHit(f, e, 5); return [f.p.ctrN, h0 - e.hp]; };
    const r = run('rule'), n = run('none'); ok(r[0] === 1 && r[1] > 0 && n[0] === 0, '무쇠 가사: 후열 적의 공격도 되받는다'); H.cover('mk_r2', 'rule');
    const c = ctrDmg('mk_r2', 'cost'), z = ctrDmg('mk_r2', 'none'); ok(near(c / z, 0.75), '무쇠 가사 대가: 되받기 피해 −25% (' + (c / z).toFixed(3) + ')'); H.cover('mk_r2', 'cost'); }

  /* mk_r3 호흡 장갑 */
  { const run = only => { const f = F('mk_r3', only, { act: ['m_yeonhwan', 'm_hoheup'] }); act(f, 'm_hoheup'); return { ys: f.p.ys, spent: f.b.rec.filter(x => x.k === 'yspend' && x.id === 'm_hoheup').map(x => x.cost)[0] }; };
    const r = run('rule'), n = run('none'); ok(n.spent > 0 && r.spent === 0 && r.ys - n.ys === n.spent, '호흡 장갑: 호흡 유산 ' + n.spent + ' → 0'); H.cover('mk_r3', 'rule');
    ok(F('mk_r3', 'none').p.stMax - F('mk_r3', 'cost').p.stMax === 20, '호흡 장갑 대가: 최대 스태미나 −20'); H.cover('mk_r3', 'cost'); }

  /* mk_r4 기의 염주 */
  { ok(st(F('mk_r4', 'rule').p, 'empower') === 2 && st(F('mk_r4', 'none').p, 'empower') === 0, '기의 염주: 전투 시작 기 2'); H.cover('mk_r4', 'rule');
    const c = F('mk_r4', 'cost').p.ys, z = F('mk_r4', 'none').p.ys; ok(z - c === 1, '기의 염주 대가: 전투 시작 유산 −1 (' + z + ' → ' + c + ')'); H.cover('mk_r4', 'cost'); }

  /* mk_r5 되받는 반지 */
  { const run = (only, hp) => { const f = F('mk_r5', only); setKi(f.p, 0); const e = f.es[0]; e.hp = hp; f.p.stance = { dmg: 10 }; f.b.cur = null; ctr(f.b, { src: e }); return st(f.p, 'empower'); };
    ok(run('rule', 1) - run('none', 1) === 2 && run('rule', 5000) === run('none', 5000), '되받는 반지: 되받기로 쓰러뜨리면 기 +2(못 쓰러뜨리면 없음)'); H.cover('mk_r5', 'rule');
    ok(near(taken('mk_r5', 'cost') / taken('mk_r5', 'none'), 1.05), '되받는 반지 대가: 받는 피해 +5%'); H.cover('mk_r5', 'cost'); }

  /* mk_r6 선정의 물 */
  { const run = only => { const f = F('mk_r6', only); setKi(f.p, 0); f.p.hp = 1; const h0 = f.p.hp; act(f, 'flaskL'); return { k: st(f.p, 'empower'), h: f.p.hp - h0 }; };
    const r = run('rule'), n = run('none'); ok(r.k === 3 && n.k === 0, '선정의 물: 마시면 기 +3'); H.cover('mk_r6', 'rule');
    const c = run('cost'); ok(near(c.h / n.h, 0.7, 0.03), '선정의 물 대가: 생명력 플라스크 회복 −30% (' + Math.round(n.h) + ' → ' + Math.round(c.h) + ')'); H.cover('mk_r6', 'cost'); }
};
