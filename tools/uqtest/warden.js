'use strict';
/* 0.8.0 M6-1 파수꾼 고유 15 (wd_h1~h9 · wd_r1~r6) 단위 시험. 같은 장면을 only 'rule' · 'cost'와 'none'으로 돌려 차이를 본다 */
module.exports = H => {
  const { E, R_, ok } = H, B = 'warden';
  const stat = (p, k) => R_('stat')(p, k), strM = p => 1 + 0.01 * stat(p, 'str'), near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.011 : t);
  const F = (id, only, o) => H.fight(B, Object.assign({ uq: [id], only }, o || {}));
  const dmg = (f, id, e) => { e = e || f.es[0]; const h0 = e.hp; H.act(f, id, e); return h0 - e.hp; };
  const taken = (f, raw) => { const p = f.p; p.ward = 0; p.hp = p.hpMax; const h0 = p.hp; H.enemyHit(f, f.es[0], raw); return h0 - p.hp; };
  const brk = e => e.brk || 0;
  const yc = (f, id) => (E.actionList(f.b).find(x => x.id === id) || {}).yc;

  // wd_h1 문지기의 맹세
  { const gw = R_('wdGuardWard'); const r = F('wd_h1', 'rule', { act: ['w_dstance'] }), n = F('wd_h1', 'none', { act: ['w_dstance'] });
    ok(gw(r.p) === gw(n.p), 'wd_h1 규칙: 태세가 꺼져 있으면 방어 보호막 그대로');
    H.act(r, 'w_dstance'); H.act(n, 'w_dstance'); ok(r.p.wdSt.def && near(gw(r.p) - gw(n.p), 8), 'wd_h1 규칙: 수비 태세 중 방어 보호막 +8'); H.cover('wd_h1', 'rule'); }
  { const c = F('wd_h1', 'cost', { act: ['w_dstance'] }), n = F('wd_h1', 'none', { act: ['w_dstance'] });
    ok(near(taken(c, 10) / taken(n, 10), 1.15), 'wd_h1 대가: 태세가 꺼져 있으면 받는 피해 +15%');
    H.act(c, 'w_dstance'); H.act(n, 'w_dstance'); ok(near(taken(c, 10), taken(n, 10), 1e-9), 'wd_h1 대가: 태세가 켜져 있으면 그대로'); H.cover('wd_h1', 'cost'); }

  // wd_h2 모루 방패
  { const run = (only, w) => { const f = F('wd_h2', only, { act: ['w_shieldhit'] }); f.p.ward = w(f.p); return dmg(f, 'w_shieldhit'); }, big = p => R_('wardMax')(p), small = () => 4;
    ok(run('rule', big) > run('none', big) + 1, 'wd_h2 규칙: 보호막이 많으면 방패 가격 피해가 상한 12 → 22까지 오른다');
    ok(near(run('rule', small), run('none', small), 1e-9), 'wd_h2 규칙: 상한 아래에서는 그대로'); H.cover('wd_h2', 'rule'); }
  { const hc = R_('heavyCost'); ok(hc(F('wd_h2', 'cost').p) - hc(F('wd_h2', 'none').p) === 10, 'wd_h2 대가: 강공격 스태미나 +10'); H.cover('wd_h2', 'cost'); }

  // wd_h3 쇠주먹 장갑
  { const run = (only, on) => { const f = F('wd_h3', only, { act: ['s_astance'] }); if (on) H.act(f, 's_astance'); H.act(f, 'guard'); H.next(f); const e = f.es[1], k0 = brk(e); H.act(f, 'heavy', e); return { d: brk(e) - k0, p: f.p }; };
    const r = run('rule', 1), n = run('none', 1); ok(near(r.d - n.d, 10 * strM(r.p), 0.01), 'wd_h3 규칙: 공격 태세 중 강공격 붕괴 +10');
    ok(near(run('rule', 0).d, run('none', 0).d, 1e-9), 'wd_h3 규칙: 태세가 없으면 그대로'); H.cover('wd_h3', 'rule'); }
  { const c = F('wd_h3', 'cost', { act: ['s_astance'] }), n = F('wd_h3', 'none', { act: ['s_astance'] }); ok(near(taken(c, 10), taken(n, 10), 1e-9), 'wd_h3 대가: 태세가 없으면 받는 피해 그대로');
    H.act(c, 's_astance'); H.act(n, 's_astance'); ok(near(taken(c, 10) / taken(n, 10), 1.1), 'wd_h3 대가: 공격 태세 중 받는 피해 +10%'); H.cover('wd_h3', 'cost'); }

  // wd_h4 성문 파쇄추
  { const run = (only, broken) => { const f = F('wd_h4', only); if (broken) E.addS(f.b, f.es[0], 'broken', 2); return dmg(f, 'heavy'); };
    ok(near(run('rule', 1) / run('none', 1), 1.5), 'wd_h4 규칙: 무너진 적에게 강공격 피해 +50%'); ok(near(run('rule', 0), run('none', 0), 1e-9), 'wd_h4 규칙: 무너지지 않은 적에게는 그대로'); H.cover('wd_h4', 'rule'); }
  { ok(near(dmg(F('wd_h4', 'cost'), 'basic') / dmg(F('wd_h4', 'none'), 'basic'), 0.9), 'wd_h4 대가: 기본 공격 피해 −10%'); H.cover('wd_h4', 'cost'); }

  // wd_h5 휩쓰는 손
  { const run = only => { const f = F('wd_h5', only, { act: ['f_sweep'] }); const k0 = f.es.map(brk); H.act(f, 'f_sweep', f.es[0]); return { d: f.es.map((e, i) => brk(e) - k0[i]), p: f.p }; };
    const r = run('rule'), n = run('none'); ok(r.d.every((x, i) => near(x - n.d[i], 8 * strM(r.p), 0.01)), 'wd_h5 규칙: 전열 모두를 치는 스킬(개기식)이 대상마다 붕괴 +8'); H.cover('wd_h5', 'rule'); }
  { const sk = (only, id) => dmg(F('wd_h5', only, { act: [id] }), id); ok(near(sk('cost', 's_regret') / sk('none', 's_regret'), 0.9), 'wd_h5 대가: 한 적을 치는 스킬 피해 −10%');
    ok(near(sk('cost', 'f_sweep'), sk('none', 'f_sweep'), 1e-9), 'wd_h5 대가: 전열 모두를 치는 스킬은 그대로'); H.cover('wd_h5', 'cost'); }

  // wd_h6 갈고리 사슬검
  { const run = only => { const f = F('wd_h6', only, { act: ['f_chainblade'], en: ['bruiser', 'bruiser', 'bruiser'] }); f.es[1].row = f.es[2].row = 'back'; const h2 = f.es[2].hp; const d1 = dmg(f, 'f_chainblade', f.es[1]); return { d1, d2: h2 - f.es[2].hp }; };
    const r = run('rule'), n = run('none'); ok(n.d2 === 0 && r.d2 > 0 && near(r.d2, r.d1, 1e-9), 'wd_h6 규칙: 사슬의 검이 후열 적 둘을 친다'); H.cover('wd_h6', 'rule'); }
  { const run = only => { const f = F('wd_h6', only, { act: ['f_chainblade'] }); return dmg(f, 'f_chainblade'); }; ok(near(run('cost') / run('none'), 0.8), 'wd_h6 대가: 사슬의 검 피해 −20%'); H.cover('wd_h6', 'cost'); }

  // wd_h7 공성의 인장
  { const run = only => { const f = F('wd_h7', only, { act: ['w_flare'] }); f.p.ward = 8; return dmg(f, 'w_flare'); }; ok(near(run('rule') / run('none'), 3.1 / 2.6), 'wd_h7 규칙: 보호막 터뜨리기 태운 1마다 ×2.6 → ×3.1'); H.cover('wd_h7', 'rule'); }
  { const c = F('wd_h7', 'cost'), n = F('wd_h7', 'none'); ok(near(taken(c, 10) / taken(n, 10), 1.1), 'wd_h7 대가: 보호막이 없으면 받는 피해 +10%');
    c.p.ward = 5; ok(R_('fxAdd')(c.p, 'inP', c.b, c.p, {}) === 0, 'wd_h7 대가: 보호막이 있으면 없음'); H.cover('wd_h7', 'cost'); }

  // wd_h8 도미노 반지
  { const run = only => { const f = F('wd_h8', only, { en: ['bruiser', 'bruiser', 'bruiser'], ebrk: 100 }); f.es[0].brk = 99; H.act(f, 'heavy', f.es[0]); return { f, d: [brk(f.es[1]), brk(f.es[2])] }; };
    const r = run('rule'), n = run('none'); ok(r.f.es[0].s.broken && n.d.every(x => x === 0) && r.d.every(x => near(x, 15 * strM(r.f.p), 0.01)), 'wd_h8 규칙: 적이 무너지면 다른 적 붕괴 +15');
    ok(!r.f.es[1].s.broken, 'wd_h8 규칙: 번진 붕괴는 다시 번지지 않음(한 번)'); H.cover('wd_h8', 'rule'); }
  { const run = only => { const f = F('wd_h8', only); const k0 = brk(f.es[0]); H.act(f, 'heavy'); const a = brk(f.es[0]) - k0; f.p.st = f.p.stMax; H.act(f, 'guard'); const k1 = brk(f.es[1]); E.addBreak(f.b, f.es[1], 10); return { a, g: brk(f.es[1]) - k1 }; };
    const c = run('cost'), n = run('none'); ok(near(c.a / n.a, 0.9) && near(c.g / n.g, 0.9), 'wd_h8 대가: 내가 채우는 붕괴 −10%(내 차례 밖에서도)'); H.cover('wd_h8', 'cost'); }

  // wd_h9 불퇴의 갑주
  { const run = only => { const f = F('wd_h9', only); H.act(f, 'guard'); const th = f.p.thorn && Object.assign({}, f.p.thorn); const h0 = f.es[0].hp; H.enemyHit(f, f.es[0], 5); return { th, d: h0 - f.es[0].hp }; };
    const r = run('rule'), n = run('none'); ok(r.th && r.th.n === 1 && r.th.dmg === 4 && !n.th && r.d > 0 && n.d === 0, 'wd_h9 규칙: 방어하면 가시 1번(피해 4)'); H.cover('wd_h9', 'rule'); }
  { const dc = R_('dodgeCost'); ok(dc(F('wd_h9', 'cost').p) - dc(F('wd_h9', 'none').p) === 10, 'wd_h9 대가: 흘리기 스태미나 +10'); H.cover('wd_h9', 'cost'); }

  // wd_r1 묵직한 철퇴
  { const run = only => { const f = F('wd_r1', only); f.p.ward = 0; H.act(f, 'basic'); return f.p.ward; }; const r = run('rule'); ok(r >= 2 && run('none') === 0, 'wd_r1 규칙: 기본 공격이 맞으면 보호막 +2 (' + r + ')'); H.cover('wd_r1', 'rule'); }
  { ok(near(dmg(F('wd_r1', 'cost'), 'basic') / dmg(F('wd_r1', 'none'), 'basic'), 0.9), 'wd_r1 대가: 기본 공격 피해 −10%'); H.cover('wd_r1', 'cost'); }

  // wd_r2 되비치는 방패갑
  { const run = (only, g) => { const f = F('wd_r2', only); if (g) H.act(f, 'guard'); const k0 = brk(f.es[0]); H.enemyHit(f, f.es[0], 3); return { d: brk(f.es[0]) - k0, p: f.p }; };
    const r = run('rule', 1), n = run('none', 1); ok(near(r.d - n.d, 6 * strM(r.p), 0.01), 'wd_r2 규칙: 방어 중 맞으면(보호막이 받아내도) 그 적 붕괴 +6'); ok(run('rule', 0).d === run('none', 0).d, 'wd_r2 규칙: 방어하지 않으면 없음'); H.cover('wd_r2', 'rule'); }
  { const c = F('wd_r2', 'cost').p.hpMax, n = F('wd_r2', 'none').p.hpMax; ok(Math.abs(c - Math.round(n * 0.92)) <= 1, 'wd_r2 대가: 최대 생명력 −8% (' + n + ' → ' + c + ')'); H.cover('wd_r2', 'cost'); }

  // wd_r3 태세의 장갑
  { const run = only => { const f = F('wd_r3', only, { act: ['w_dstance', 's_astance'] }); const y0 = yc(f, 'w_dstance'); H.act(f, 'w_dstance'); return { y0, y1: yc(f, 's_astance') }; };
    const r = run('rule'), n = run('none'); ok(r.y0 === 2 && n.y1 === 2 && r.y1 === 0, 'wd_r3 규칙: 태세를 바꾸는 데 유산 0(처음 켜기는 2)'); H.cover('wd_r3', 'rule'); }
  { const run = only => { const f = F('wd_r3', only, { act: ['w_dstance', 's_astance'] }); f.p.ward = 0; H.act(f, 'w_dstance'); const w = f.p.ward; const h = f.es.map(e => e.hp), k = f.es.map(brk); H.act(f, 's_astance', f.es[0]); return { w, hit: f.es.some((e, i) => e.hp < h[i] || brk(e) > k[i]) }; };
    const c = run('cost'), n = run('none'); ok(c.w === 0 && n.w > 0 && !c.hit && n.hit, 'wd_r3 대가: 태세를 켤 때의 효과(보호막 · 타격)가 없다'); H.cover('wd_r3', 'cost'); }

  // wd_r4 성벽의 목걸이
  { const run = (only, full) => { const f = F('wd_r4', only); const wm = R_('wardMax')(f.p); f.p.ward = full ? wm : wm - 1; f.p.st = 40; R_('fxRun')(f.p, 'onRound', f.b, f.p); return f.p.st; };
    ok(run('rule', 1) === 46 && run('none', 1) === 40, 'wd_r4 규칙: 보호막이 상한이면 라운드마다 스태미나 +6'); ok(run('rule', 0) === 40, 'wd_r4 규칙: 상한이 아니면 없음'); H.cover('wd_r4', 'rule'); }
  { ok(F('wd_r4', 'cost').p.stMax - F('wd_r4', 'none').p.stMax === -10, 'wd_r4 대가: 최대 스태미나 −10'); H.cover('wd_r4', 'cost'); }

  // wd_r5 참회의 반지
  { const run = (only, hp) => { const f = F('wd_r5', only); f.p.hp = f.p.hpMax * hp; f.p.ward = 0; return R_('addWard')(f.b, f.p, 10); };
    ok(near(run('rule', 0.4) / run('none', 0.4), 1.3), 'wd_r5 규칙: 생명력 절반 아래면 보호막 획득 +30%'); ok(near(run('rule', 0.9), run('none', 0.9), 1e-9), 'wd_r5 규칙: 절반 위면 없음'); H.cover('wd_r5', 'rule');
    ok(near(run('cost', 0.9) / run('none', 0.9), 0.9), 'wd_r5 대가: 생명력 절반 위면 보호막 획득 −10%'); ok(near(run('cost', 0.4), run('none', 0.4), 1e-9), 'wd_r5 대가: 절반 아래면 없음'); H.cover('wd_r5', 'cost'); }

  // wd_r6 쇳물 플라스크
  { const run = only => { const f = F('wd_r6', only); f.p.hp = Math.round(f.p.hpMax * 0.5); f.p.ward = 0; f.p.flask.life = Math.max(1, f.p.flask.life); const h0 = f.p.hp; H.act(f, 'flaskL'); return { w: f.p.ward, h: f.p.hp - h0, p: f.p }; };
    const r = run('rule'), c = run('cost'), n = run('none');
    ok(near(r.w, r.p.hpMax * 0.25, 1e-6) && n.w === 0, 'wd_r6 규칙: 마시면 보호막(최대 생명력의 25%)'); H.cover('wd_r6', 'rule');
    ok(c.h === 0 && n.h > 0, 'wd_r6 대가: 생명력 플라스크로 생명력을 회복하지 못한다'); H.cover('wd_r6', 'cost'); }
};
