'use strict';
/* 0.8.0 M6-1 암살자 고유 15 (as_h1–h9 · as_r1–r6) 단위 시험: 같은 장면을 규칙만 · 대가만 · 기반만으로 돌려 차이를 본다 */
module.exports = H => {
  const { E, R_, ok, st } = H; const PT = R_('poisonTotal'), addPoison = R_('addPoison'), stat = R_('stat');
  const F = (id, only, o) => H.fight('assassin', Object.assign({ uq: [id], only }, o || {}));
  const lost = e => e.hpMax - e.hp, near = (a, b, t) => Math.abs(a - b) <= (t || 0.02) * Math.max(1, Math.abs(b));
  const psn = (f, e, n) => addPoison(f.b, e, n, 1);
  const basicOn = (id, only, o, pre) => { const f = F(id, only, o); if (pre) pre(f); H.act(f, 'basic', f.es[0]); return f; };
  /* 터뜨리기 한 번: 대상 중독 n을 걸고 스킬을 쓴다 → { f, e0 피해, e1 피해 } */
  const burst = (id, only, sk, n, en) => { const f = F(id, only, { act: [sk], en: en || ['bruiser', 'bruiser'] }); if (n) psn(f, f.es[0], n); H.act(f, sk, f.es[0]); return { f, d0: lost(f.es[0]), d1: f.es[1] ? lost(f.es[1]) : 0 }; };
  const parryHit = (id, only, sk) => { const f = F(id, only, { act: sk ? [sk] : [], en: ['bruiser'] }); const e = f.es[0]; e.intent = { k: 'attack' }; H.act(f, sk || 'dodge', e); H.enemyHit(f, e, 10); return f; };

  // as_h1 독니 단검
  { const r = basicOn('as_h1', 'rule'), n = basicOn('as_h1', 'none'); ok(st(r.es[0], 'poison') === 1 && !(st(n.es[0], 'poison') > 0), '독니 단검 규칙: 기본 공격이 맞히면 중독 +1 — ' + st(r.es[0], 'poison')); H.cover('as_h1', 'rule');
    const c = basicOn('as_h1', 'cost'); ok(near(lost(c.es[0]) / lost(n.es[0]), 0.85), '독니 단검 대가: 기본 공격 피해 −15% — ' + (lost(c.es[0]) / lost(n.es[0])).toFixed(3)); H.cover('as_h1', 'cost'); }
  // as_h2 안개 장갑
  { const run = (only, sk) => { const f = F('as_h2', only, { act: [sk] }); H.act(f, sk, f.es[0]); return st(f.es[0], 'poison'); };
    ok(run('rule', 'a_dokan') === run('none', 'a_dokan') + 1, '안개 장갑 규칙: 전열 모두를 치는 독안개의 중독 +1 — ' + run('rule', 'a_dokan') + ' / ' + run('none', 'a_dokan')); H.cover('as_h2', 'rule');
    const f = F('as_h2', 'cost'); ok(run('cost', 'a_dokkal') === run('none', 'a_dokkal') - 1 && R_('uqSkPsn')(f.b, { tgt: 'melee' }, 1) === 1 && run('cost', 'a_dokan') === run('none', 'a_dokan'), '안개 장갑 대가: 한 적을 치는 독 바른 칼의 중독 −1(바닥 1, 전열 스킬은 그대로)'); H.cover('as_h2', 'cost'); }
  // as_h3 투척 장갑
  { const r = burst('as_h3', 'rule', 'a_gyeokjjil', 5), n = burst('as_h3', 'none', 'a_gyeokjjil', 5), n0 = burst('as_h3', 'none', 'a_gyeokjjil', 0); const bd = n.d0 - n0.d0;
    ok(n.d1 === 0 && near(r.d1, bd * 0.3, 0.03), '투척 장갑 규칙: 터뜨리기 피해의 30%가 곁의 적에게 — ' + r.d1.toFixed(1) + ' / ' + (bd * 0.3).toFixed(1)); H.cover('as_h3', 'rule');
    const c = burst('as_h3', 'cost', 'a_gyeokjjil', 5); const want = 5 * 3 * (1 + 0.01 * stat(n.f.p, 'str'));
    ok(near(n.f.es[0].brk - c.f.es[0].brk, want, 0.02) && near(c.d0, n.d0), '투척 장갑 대가: 터뜨리기의 붕괴(중독 × 3)가 없다, 피해는 그대로 — ' + (n.f.es[0].brk - c.f.es[0].brk).toFixed(1)); H.cover('as_h3', 'cost'); }
  // as_h4 격발 단검
  { const r = burst('as_h4', 'rule', 'a_gyeokjjil', 5), n = burst('as_h4', 'none', 'a_gyeokjjil', 5), want = 5 * 3 * (1 + 0.01 * stat(n.f.p, 'str'));
    const rr = burst('as_h4', 'rule', 'a_gyeokpyo', 5), rn = burst('as_h4', 'none', 'a_gyeokpyo', 5);
    ok(near(r.f.es[0].brk - n.f.es[0].brk, want) && near(rr.f.es[0].brk, rn.f.es[0].brk), '격발 단검 규칙: 근접 터뜨리기가 붕괴 +(터뜨린 중독 5 × 3), 원거리는 그대로 — ' + (r.f.es[0].brk - n.f.es[0].brk).toFixed(1)); H.cover('as_h4', 'rule');
    const c = burst('as_h4', 'cost', 'a_gyeokpyo', 5), c0 = burst('as_h4', 'cost', 'a_gyeokpyo', 0), n0 = burst('as_h4', 'none', 'a_gyeokpyo', 0), cm = burst('as_h4', 'cost', 'a_gyeokjjil', 5);
    ok(near((c.d0 - c0.d0) / (rn.d0 - n0.d0), 0.8) && near(c0.d0, n0.d0) && near(cm.d0, n.d0), '격발 단검 대가: 원거리 터뜨리기 피해 −20%(표창 피해 · 근접 터뜨리기는 그대로) — ' + ((c.d0 - c0.d0) / (rn.d0 - n0.d0)).toFixed(3)); H.cover('as_h4', 'cost'); }
  // as_h5 그림자 외투
  { const r = parryHit('as_h5', 'rule', 'a_heulbe'), n = parryHit('as_h5', 'none', 'a_heulbe');
    ok(lost(n.es[0]) > 0 && near(lost(r.es[0]) / lost(n.es[0]), 2), '그림자 외투 규칙: 흘려 베기의 반격이 두 번 — ' + (lost(r.es[0]) / lost(n.es[0])).toFixed(3)); H.cover('as_h5', 'rule');
    const red = only => { const f = F('as_h5', only, { en: ['bruiser'] }); H.act(f, 'dodge', f.es[0]); return f.p.dodgeRed; };
    ok(near(red('none') - red('cost'), 0.1, 0.001), '그림자 외투 대가: 흘리기로 줄이는 피해 −10%p(70% → 60%) — ' + red('none').toFixed(3) + ' → ' + red('cost').toFixed(3)); H.cover('as_h5', 'cost'); }
  // as_h6 등 뒤의 송곳
  { const r = basicOn('as_h6', 'rule', { en: ['archer'] }), n = basicOn('as_h6', 'none', { en: ['archer'] });
    ok(r.es[0].row === 'back' && near(lost(r.es[0]) / lost(n.es[0]), 1.5), '등 뒤의 송곳 규칙: 후열 적을 치는 기본 공격 +50% — ' + (lost(r.es[0]) / lost(n.es[0])).toFixed(3)); H.cover('as_h6', 'rule');
    const c = basicOn('as_h6', 'cost'), m = basicOn('as_h6', 'none'), cb = basicOn('as_h6', 'cost', { en: ['archer'] });
    ok(near(lost(c.es[0]) / lost(m.es[0]), 0.9) && near(lost(cb.es[0]), lost(n.es[0])), '등 뒤의 송곳 대가: 전열 적을 치는 기본 공격 −10%(후열은 그대로) — ' + (lost(c.es[0]) / lost(m.es[0])).toFixed(3)); H.cover('as_h6', 'cost'); }
  // as_h7 만독 반지
  { const run = only => basicOn('as_h7', only, { hp: 30 }, f => { psn(f, f.es[0], 8); f.es[0].hp = 1; });
    const r = run('rule'), n = run('none'); ok(!r.es[0].alive && st(r.es[1], 'poison') === 4 && !(st(n.es[1], 'poison') > 0), '만독 반지 규칙: 중독 8인 적이 쓰러지면 곁의 적에게 중독 4 — ' + st(r.es[1], 'poison')); H.cover('as_h7', 'rule');
    const cap = only => { const f = F('as_h7', only); psn(f, f.es[0], 30); return st(f.es[0], 'poison'); };
    ok(cap('cost') === 15 && cap('none') === 20, '만독 반지 대가: 중독 상한 20 → 15 — ' + cap('cost')); H.cover('as_h7', 'cost'); }
  // as_h8 암영의 목걸이
  { const dot = only => { const f = F('as_h8', only); f.p.asSt = { hide: 1 }; const d = E.hurtPlayer(f.b, 5, { dot: 1, label: '중독' }); f.p.asSt.hide = 0; const d2 = E.hurtPlayer(f.b, 5, { dot: 1, label: '중독' }); return [d, d2]; };
    const r = dot('rule'), n = dot('none'); ok(r[0] === 0 && n[0] > 0 && near(r[1], n[1]), '암영의 목걸이 규칙: 숨은 동안 지속 피해 0(숨지 않으면 그대로) — ' + r.join(' / ') + ' · ' + n.join(' / ')); H.cover('as_h8', 'rule');
    const c = F('as_h8', 'cost'), m = F('as_h8', 'none'); ok(Math.abs(c.p.hpMax - Math.round(m.p.hpMax * 0.9)) <= 1, '암영의 목걸이 대가: 최대 생명력 −10% — ' + m.p.hpMax + ' → ' + c.p.hpMax); H.cover('as_h8', 'cost'); }
  // as_h9 잔영 장갑
  { const run = (only, after) => { const f = parryHit('as_h9', only); const e = f.es[0]; const h0 = e.hp; H.act(f, 'basic', e); const d1 = h0 - e.hp; const h1 = e.hp; H.act(f, 'basic', e); const d2 = h1 - e.hp; return { f, d1, d2 }; };
    const r = run('rule'), n = run('none'); ok(near(r.d1 / n.d1, 2) && near(r.d2, n.d2), '잔영 장갑 규칙: 흘려 낸 다음 차례 첫 기본 공격이 두 번(둘째 기본 공격은 한 번) — ' + (r.d1 / n.d1).toFixed(3));
    const nr = (() => { const f = F('as_h9', 'rule', { en: ['bruiser'] }); const h0 = f.es[0].hp; H.act(f, 'basic', f.es[0]); return h0 - f.es[0].hp; })(); ok(near(nr, n.d2), '잔영 장갑 규칙: 흘려 내지 않으면 한 번'); H.cover('as_h9', 'rule');
    const taken = only => { const f = parryHit('as_h9', only); const e = f.es[0]; H.act(f, 'basic', e); const a = H.enemyHit(f, e, 10); H.act(f, 'basic', e); const b2 = H.enemyHit(f, e, 10); return [a, b2]; };
    const u = taken('uq'), w = taken('rule'), c = taken('cost'); ok(near(u[0] / w[0], 1.15) && near(u[1], w[1]) && near(c[0], w[0]), '잔영 장갑 대가: 두 번 친 차례(뒤따르는 적의 차례) 받는 피해 +15%, 다음 차례 · 두 번 치지 않으면 그대로 — ' + (u[0] / w[0]).toFixed(3)); H.cover('as_h9', 'cost'); }
  // as_r1 녹슨 독침
  { const r = basicOn('as_r1', 'rule'), n = basicOn('as_r1', 'none'), c = basicOn('as_r1', 'cost');
    ok(st(r.es[0], 'poison') === 3 && !(st(n.es[0], 'poison') > 0), '녹슨 독침 규칙: 기본 공격이 중독 3을 건다 — ' + st(r.es[0], 'poison')); H.cover('as_r1', 'rule');
    ok(lost(c.es[0]) === 0 && lost(n.es[0]) > 0, '녹슨 독침 대가: 기본 공격 피해 0 — ' + lost(c.es[0])); H.cover('as_r1', 'cost'); }
  // as_r2 미끄러운 가죽
  { const r = F('as_r2', 'rule'), n = F('as_r2', 'none'); const dc = R_('dodgeCost');
    const st0 = (() => { r.p.st = 30; r.b.stepMode = true; E.playerAct(r.b, 'dodge', r.es[0].id); return r.p.st; })();
    ok(dc(r.p) === 0 && dc(n.p) > 0 && st0 >= 30, '미끄러운 가죽 규칙: 흘리기 스태미나 0 — ' + dc(n.p) + ' → ' + dc(r.p)); H.cover('as_r2', 'rule');
    const red = only => { const f = F('as_r2', only, { en: ['bruiser'] }); H.act(f, 'dodge', f.es[0]); return f.p.dodgeRed; };
    ok(near(red('none') - red('cost'), 0.2, 0.001), '미끄러운 가죽 대가: 흘리기로 줄이는 피해 −20%p — ' + red('none').toFixed(3) + ' → ' + red('cost').toFixed(3)); H.cover('as_r2', 'cost'); }
  // as_r3 두 번 터뜨리는 손
  { const r = burst('as_r3', 'rule', 'a_gyeokjjil', 6), n = burst('as_r3', 'none', 'a_gyeokjjil', 6);
    ok(st(r.f.es[0], 'poison') === 3 && !(st(n.f.es[0], 'poison') > 0) && near(r.d0, n.d0), '두 번 터뜨리는 손 규칙: 터뜨리기가 중독 6의 절반만 없앤다(남은 3, 피해는 그대로) — ' + st(r.f.es[0], 'poison')); H.cover('as_r3', 'rule');
    const c = burst('as_r3', 'cost', 'a_gyeokjjil', 6), c0 = burst('as_r3', 'cost', 'a_gyeokjjil', 0), n0 = burst('as_r3', 'none', 'a_gyeokjjil', 0);
    ok(near((c.d0 - c0.d0) / (n.d0 - n0.d0), 0.65) && near(c0.d0, n0.d0), '두 번 터뜨리는 손 대가: 터뜨리기 피해 −35%(찌르기 피해는 그대로) — ' + ((c.d0 - c0.d0) / (n.d0 - n0.d0)).toFixed(3)); H.cover('as_r3', 'cost'); }
  // as_r4 독의 염주
  { const run = (only, sk) => { const f = F('as_r4', only, { act: ['a_dokkal'] }); f.p.ys = 9; f.p.st = 50; f.b.stepMode = true; E.playerAct(f.b, sk, f.es[0].id); return f.p.st; };
    ok(run('rule', 'a_dokkal') - run('none', 'a_dokkal') === 5 && run('rule', 'basic') === run('none', 'basic'), '독의 염주 규칙: 독을 건 행동에 스태미나 +5(한 행동에 한 번, 독을 걸지 않으면 없음)'); H.cover('as_r4', 'rule');
    ok(F('as_r4', 'cost').p.stMax === F('as_r4', 'none').p.stMax - 15, '독의 염주 대가: 최대 스태미나 −15'); H.cover('as_r4', 'cost'); }
  // as_r5 암살자의 인장
  { const low = f => { f.es[0].hp = Math.floor(f.es[0].hpMax * 0.3); f.es[0].hpMax0 = f.es[0].hp; };
    const d = f => f.es[0].hpMax0 - f.es[0].hp;
    const r = basicOn('as_r5', 'rule', {}, low), n = basicOn('as_r5', 'none', {}, low), rh = basicOn('as_r5', 'rule'), nh = basicOn('as_r5', 'none');
    ok(near(d(r) / d(n), 1.25) && near(lost(rh.es[0]), lost(nh.es[0])), '암살자의 인장 규칙: 생명력 35% 이하인 적에게 피해 +25%(그 위는 그대로) — ' + (d(r) / d(n)).toFixed(3)); H.cover('as_r5', 'rule');
    const c = basicOn('as_r5', 'cost'), cl = basicOn('as_r5', 'cost', {}, low);
    ok(near(lost(c.es[0]) / lost(nh.es[0]), 0.95) && near(d(cl), d(n)), '암살자의 인장 대가: 35% 위의 적에게 −5%(낮은 적은 그대로) — ' + (lost(c.es[0]) / lost(nh.es[0])).toFixed(3)); H.cover('as_r5', 'cost'); }
  // as_r6 독액 플라스크
  { const run = only => { const f = F('as_r6', only); f.p.flask.life = Math.max(1, f.p.flask.life || 0); f.p.hp = 1; H.act(f, 'flaskL'); return f; };
    const r = run('rule'), n = run('none'), c = run('cost');
    ok(r.es.every(e => st(e, 'poison') === 3) && n.es.every(e => !(st(e, 'poison') > 0)), '독액 플라스크 규칙: 마시면 모든 적에게 중독 3'); H.cover('as_r6', 'rule');
    ok(near((c.p.hp - 1) / (n.p.hp - 1), 0.75), '독액 플라스크 대가: 생명력 플라스크 회복 −25% — ' + ((c.p.hp - 1) / (n.p.hp - 1)).toFixed(3)); H.cover('as_r6', 'cost'); }
};
