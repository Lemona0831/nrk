'use strict';
/* 0.8.0 M6-1 마검사 고유 15 (sb_h1~h9 · sb_r1~r6): 규칙은 only 'rule' 대 'none', 대가는 'cost' 대 'none'으로 같은 장면을 두 번 돌려 본다 */
module.exports = H => {
  const { E, R_, ok, fight, act, next, enemyHit, st } = H;
  const B = 'spellblade';
  const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1e-6 : t);
  const go = (f, id, e) => { if (!act(f, id, e)) next(f); }; // 행동 하나 · 차례가 끝나면 적 차례까지
  const raw = (f, id, e) => { const b = f.b; b.stepMode = true; const t0 = b.turnIdx; E.playerAct(b, id, e == null ? null : e.id); b.stepMode = false; return b.turnIdx === t0; }; // 유산 · 스태미나를 채우지 않는 행동. 차례가 이어지면 true
  const dmgOf = (f, e, fn) => { const h0 = e.hp; fn(); return h0 - e.hp; };
  const recN = (f, k) => f.b.rec.filter(x => x.k === k);
  const W = (id, only, o) => fight(B, Object.assign({ uq: [id], only }, o || {}));

  // sb_h1 처형자의 인장
  { const run = (only, bl) => { const f = W('sb_h1', only); E.addS(f.b, f.es[0], 'bleed', bl); return dmgOf(f, f.es[0], () => act(f, 'basic', f.es[0])); };
    ok(near(run('rule', 5) - run('none', 5), 5, 1e-6), '처형자의 인장: 출혈 5 → 베기 피해 +5');
    ok(near(run('rule', 10) - run('none', 10), 8, 1e-6), '처형자의 인장: 상한 +8');
    ok(near(run('rule', 0), run('none', 0)), '처형자의 인장: 출혈 없으면 그대로'); H.cover('sb_h1', 'rule');
    const ld = only => { const f = W('sb_h1', only, { act: ['sb_boil'] }); act(f, 'sb_boil', f.es[0]); return f.p.edge && f.p.edge.n; };
    const lc = only => { const f = W('sb_h1', only); R_('sbLoad')(f.b, f.p, 'bleed', 1); const a = f.p.edge.n; f.p.edge = null; R_('sbLoad')(f.b, f.p, 'ignite', 3); return [a, f.p.edge.n]; };
    { const n0 = ld('none'); ok(n0 >= 2 && ld('cost') === n0 - 1, '처형자의 인장 대가: 칼에 싣는 출혈 ' + n0 + ' → ' + (n0 - 1)); } // M7-2: 싣는 양은 직업 기준 옮김으로 바뀐다. 대가는 −1
    ok(lc('cost')[0] === 1 && lc('cost')[1] === 3, '처형자의 인장 대가: 바닥 1 · 화상은 그대로'); H.cover('sb_h1', 'cost'); }

  // sb_h2 피 먹는 장검
  { const run = only => { const f = W('sb_h2', only, { act: ['sb_boil'] }); go(f, 'sb_boil', f.es[0]); go(f, 'basic', f.es[0]); const e1 = !!f.p.edge; const b0 = st(f.es[1], 'bleed'); go(f, 'basic', f.es[1]); return { e1, b1: st(f.es[1], 'bleed') - b0 }; };
    const r = run('rule'), n = run('none');
    ok(r.e1 && !n.e1, '피 먹는 장검: 칼에 실은 출혈이 건 뒤에도 남는다'); ok(r.b1 > 0 && n.b1 === 0, '피 먹는 장검: 다음 베기도 다시 건다'); H.cover('sb_h2', 'rule');
    const hp = only => W('sb_h2', only).p.hpMax; ok(near(hp('cost'), hp('none') * 0.9, 1), '피 먹는 장검 대가: 최대 생명력 −10%'); H.cover('sb_h2', 'cost'); }

  // sb_h3 불씨 장갑
  { const run = only => { const f = W('sb_h3', only, { act: ['sb_ember'], en: ['bruiser', 'archer'] }); const h = f.es.map(e => e.hp); act(f, 'sb_ember', f.es[0]); return f.es.map((e, i) => h[i] - e.hp); };
    const r = run('rule'), n = run('none'), c = run('cost');
    ok(r[0] > 0 && near(r[1], r[0] * 0.5, 1e-6) && n[1] === 0, '불씨 장갑: 한 적 주문이 뒤 후열 적에게 절반'); H.cover('sb_h3', 'rule');
    ok(near(c[0], n[0] * 0.9, 1e-6), '불씨 장갑 대가: 주문 스킬 피해 −10%');
    const bc = only => { const f = W('sb_h3', only); return dmgOf(f, f.es[0], () => act(f, 'basic', f.es[0])); }; ok(near(bc('cost'), bc('none')), '불씨 장갑 대가: 베기는 그대로'); H.cover('sb_h3', 'cost'); }

  // sb_h4 잿불 검
  { const run = only => { const f = W('sb_h4', only); act(f, 'basic', f.es[0]); return st(f.es[0], 'ignite'); };
    ok(run('rule') === 1 && run('none') === 0, '잿불 검: 베기가 맞히면 화상 +1'); H.cover('sb_h4', 'rule');
    const me = only => { const f = W('sb_h4', only); E.addS(f.b, f.p, 'ignite', 2); return st(f.p, 'ignite'); };
    ok(me('cost') === 3 && me('none') === 2, '잿불 검 대가: 내게 걸리는 화상 +1'); H.cover('sb_h4', 'cost'); }

  // sb_h5 마갑 핵
  { const run = only => { const f = W('sb_h5', only, { act: ['sb_bolt'] }); f.p.ward = 100; act(f, 'sb_bolt', f.es[0]); const x = recN(f, 'wardSpend')[0]; return x && x.bonus; };
    ok(run('none') === 12 && run('rule') === 24, '마갑 핵: 보호막 비례 피해 상한 12 → 24'); H.cover('sb_h5', 'rule');
    const wm = only => { const f = W('sb_h5', only); return [R_('wardMax')(f.p), f.p.hpMax]; }; const c = wm('cost'), n = wm('none');
    ok(n[0] === Math.round(n[1] * 0.15) && c[0] === Math.round(c[1] * 0.10), '마갑 핵 대가: 보호막 상한 15% → 10%'); H.cover('sb_h5', 'cost'); }

  // sb_h6 교차 손가락
  { const run = (only, id) => { const f = W('sb_h6', only, { act: ['sb_ember'] }); go(f, 'sb_ember', f.es[0]); const b0 = f.es[0].brk; go(f, id, f.es[0]); return { d: f.es[0].brk - b0, g: (recN(f, 'alt')[0] || {}).g, str: R_('stat')(f.p, 'str') }; };
    const r = run('rule', 'sb_edge'), n = run('none', 'sb_edge');
    ok(near(r.d - n.d, 12 * (1 + 0.01 * r.str), 1e-6), '교차 손가락: 교대한 베기 붕괴 +12');
    const rh = run('rule', 'heavy'), nh = run('none', 'heavy'); ok(near(rh.d - nh.d, 12 * (1 + 0.01 * rh.str), 1e-6), '교차 손가락: 교대한 강공격도 +12');
    const rb = run('rule', 'basic'), nb = run('none', 'basic'); ok(rb.d === 0 && nb.d === 0, '교차 손가락: 기본 공격은 붕괴 없음(M5-7)');
    const f2 = W('sb_h6', 'rule', { act: ['sb_ember'] }); const b0 = f2.es[0].brk; go(f2, 'sb_edge', f2.es[0]); const nf = W('sb_h6', 'none', { act: ['sb_ember'] }); const n0 = nf.es[0].brk; go(nf, 'sb_edge', nf.es[0]);
    ok(near(f2.es[0].brk - b0, nf.es[0].brk - n0), '교차 손가락: 교대가 아니면 그대로'); H.cover('sb_h6', 'rule');
    ok(n.g === 4 && run('cost', 'sb_edge').g === 2, '교차 손가락 대가: 교대 보호막 4 → 2'); H.cover('sb_h6', 'cost'); }

  // sb_h7 겁화의 재
  { const run = only => { const f = W('sb_h7', only); f.es[0].s.sear = { stacks: 4, until: 1e9, dur: 1e9 }; const h = f.es.map(e => e.hp); R_('kwSear')(f.b, f.es[0]); return f.es.map((e, i) => h[i] - e.hp); };
    const r = run('rule'), n = run('none');
    ok(r[0] > 0 && near(r[1], r[0] * 0.5, 1e-6) && n[1] === 0 && near(r[0], n[0]), '겁화의 재: 혈염 피해의 절반이 곁의 적에게'); H.cover('sb_h7', 'rule');
    const tk = (only, sear) => { const f = W('sb_h7', only); f.p.ward = 0; if (sear) f.es[1].s.sear = { stacks: 3, until: 1e9, dur: 1e9 }; return enemyHit(f, f.es[0], 10); };
    ok(near(tk('cost', 1), tk('none', 1) * 1.1, 1e-6) && near(tk('cost', 0), tk('none', 0)), '겁화의 재 대가: 혈염 걸린 적이 있으면 받는 피해 +10%'); H.cover('sb_h7', 'cost'); }

  // sb_h8 죄인의 사슬 갑옷
  { const run = (only, w) => { const f = W('sb_h8', only); f.p.ward = w; enemyHit(f, f.es[0], 20); return f.es.map(e => st(e, 'bleed')); };
    const r = run('rule', 5), n = run('none', 5), k = run('rule', 50);
    ok(r.every(x => x === 2) && n.every(x => x === 0), '죄인의 사슬 갑옷: 보호막이 깨지면 전열 모두 출혈 2'); ok(k.every(x => x === 0), '죄인의 사슬 갑옷: 깨지지 않으면 없음'); H.cover('sb_h8', 'rule');
    const hp = only => W('sb_h8', only).p.hpMax; ok(near(hp('cost'), hp('none') * 0.88, 1), '죄인의 사슬 갑옷 대가: 최대 생명력 −12%'); H.cover('sb_h8', 'cost'); }

  // sb_h9 타는 플라스크
  { const run = only => { const f = W('sb_h9', only); f.p.ward = 0; f.p.ys = 3; f.p.hp = 50; raw(f, 'flaskL'); return { w: f.p.ward || 0, ys: R_('ysNow')(f.p) }; };
    const r = run('rule'), n = run('none'), c = run('cost'), u = run('uq');
    ok(r.w === 12 && n.w === 0 && r.ys === 3, '타는 플라스크: 남은 유산 3 → 보호막 +12'); H.cover('sb_h9', 'rule');
    ok(c.ys === 0 && n.ys === 3 && c.w === 0, '타는 플라스크 대가: 마시면 유산을 모두 태운다'); ok(u.w === 12 && u.ys === 0, '타는 플라스크: 태우기 전에 센다'); H.cover('sb_h9', 'cost'); }

  // sb_r1 양날의 교대검
  { const run = only => { const f = W('sb_r1', only); go(f, 'sb_edge', f.es[0]); go(f, 'basic', f.es[0]); const a1 = recN(f, 'alt').length; go(f, 'sb_edge', f.es[0]); const a2 = recN(f, 'alt').length; go(f, 'basic', f.es[0]); go(f, 'basic', f.es[0]); return [a1, a2, recN(f, 'alt').length]; };
    const r = run('rule'), n = run('none');
    ok(r[0] === 1 && n[0] === 0, '양날의 교대검: 베기 뒤 기본 공격이 교대'); ok(r[1] === 2 && n[1] === 0, '양날의 교대검: 기본 공격 뒤 베기도 교대'); ok(r[2] === 3, '양날의 교대검: 기본 공격끼리는 교대 아님'); H.cover('sb_r1', 'rule');
    const bd = only => { const f = W('sb_r1', only); return dmgOf(f, f.es[0], () => act(f, 'basic', f.es[0])); }; ok(near(bd('cost'), bd('none') * 0.85, 1e-6), '양날의 교대검 대가: 기본 공격 피해 −15%'); H.cover('sb_r1', 'cost'); }

  // sb_r2 낙인 흉갑
  { const run = only => { const f = W('sb_r2', only, { act: ['sb_ember'] }); f.p.ward = 0; go(f, 'sb_ember', f.es[0]); go(f, 'sb_edge', f.es[0]); return (recN(f, 'alt')[0] || {}).g; };
    ok(run('rule') === 8 && run('none') === 4, '낙인 흉갑: 교대 보호막 4 → 8'); H.cover('sb_r2', 'rule');
    const wm = only => { const f = W('sb_r2', only); return [R_('wardMax')(f.p), f.p.hpMax]; }; const c = wm('cost');
    ok(c[0] === Math.round(c[1] * 0.10) && wm('none')[0] === Math.round(wm('none')[1] * 0.15), '낙인 흉갑 대가: 보호막 상한 15% → 10%'); H.cover('sb_r2', 'cost'); }

  // sb_r3 붉은 손
  { const run = (only, id) => { const f = W('sb_r3', only, { act: ['sb_ember'] }); act(f, id, f.es[0]); const x = recN(f, 'yspend')[0]; const s = R_('skOf')(f.p, id); return { c: x && x.cost, again: R_('skCostAt')(f.b, s).c }; };
    const r = run('rule', 'sb_edge'), n = run('none', 'sb_edge');
    ok(n.c === 2 && r.c === 1, '붉은 손: 베기 스킬 유산 2 → 1'); ok(r.again === 2, '붉은 손: 내 차례에 한 번');
    ok(run('rule', 'sb_ember').c === 2, '붉은 손: 주문은 깎지 않음'); H.cover('sb_r3', 'rule');
    ok(run('cost', 'sb_ember').c === 3 && run('none', 'sb_ember').c === 2 && run('cost', 'sb_edge').c === 2, '붉은 손 대가: 주문 스킬 유산 2 → 3'); H.cover('sb_r3', 'cost'); }

  // sb_r4 두 숨의 목걸이
  { const run = only => { const f = W('sb_r4', only); f.p.ward = 0; f.p.ys = 2; const c1 = raw(f, 'sb_edge', f.es[0]); const w1 = f.p.ward || 0; if (!c1) next(f); f.p.ward = 0; f.p.ys = 2; raw(f, 'sb_edge', f.es[0]); return [w1, f.p.ward || 0]; };
    const r = run('rule'), n = run('none');
    ok(r[0] === 12 && n[0] === 0, '두 숨의 목걸이: 유산이 0이 되면 보호막 +12'); ok(r[1] === 0, '두 숨의 목걸이: 전투에 한 번'); H.cover('sb_r4', 'rule');
    const sm = only => W('sb_r4', only).p.stMax; ok(sm('none') - sm('cost') === 15, '두 숨의 목걸이 대가: 최대 스태미나 −15'); H.cover('sb_r4', 'cost'); }

  // sb_r5 칼날의 반지
  { const run = only => { const f = W('sb_r5', only, { act: ['sb_boil'] }); go(f, 'sb_boil', f.es[0]); go(f, 'basic', f.es[0]); const bl = st(f.es[0], 'bleed'); const d = dmgOf(f, f.es[0], () => act(f, 'basic', f.es[0])); const d1 = dmgOf(f, f.es[1], () => act(f, 'basic', f.es[1])); return { bl, d, d1 }; };
    const r = run('rule'), n = run('none');
    ok(r.bl > 0 && near(r.d, n.d * 1.2, 1e-6), '칼날의 반지: 칼로 건 상태가 걸린 적에게 기본 공격 +20%'); ok(near(r.d1, n.d1), '칼날의 반지: 다른 적은 그대로'); H.cover('sb_r5', 'rule');
    const ld = only => { const f = W('sb_r5', only, { act: ['sb_flamecut'] }); act(f, 'sb_flamecut', f.es[0]); return f.p.edge && f.p.edge.n; };
    { const n0 = ld('none'); ok(n0 >= 2 && ld('cost') === n0 - 1, '칼날의 반지 대가: 칼에 싣기 ' + n0 + ' → ' + (n0 - 1)); }
    const fl = W('sb_r5', 'cost'); R_('sbLoad')(fl.b, fl.p, 'ignite', 1); ok(fl.p.edge.n === 1, '칼날의 반지 대가: 바닥 1'); H.cover('sb_r5', 'cost'); }

  // sb_r6 핏빛 플라스크
  { const run = only => { const f = W('sb_r6', only); f.p.hp = 30; const h0 = f.p.hp; raw(f, 'flaskL'); return { e: f.p.edge, h: f.p.hp - h0 }; };
    const r = run('rule'), n = run('none'), c = run('cost');
    ok(r.e && r.e.s === 'bleed' && r.e.n === 4 && !n.e, '핏빛 플라스크: 마시면 칼에 출혈 4'); H.cover('sb_r6', 'rule');
    ok(near(c.h, n.h * 0.8, 0.01) && !c.e, '핏빛 플라스크 대가: 생명력 플라스크 회복 −20%'); H.cover('sb_r6', 'cost'); }
};
