'use strict';
/* 0.8.0 M6-1 사냥꾼 고유 15 단위 시험 (hn_h1..h9, hn_r1..r6). 같은 장면을 only 'rule' · 'cost'와 'none'으로 돌려 비교한다 */
module.exports = H => {
  const { E, R_, ok, fight, act, next, enemyHit, st } = H; const SK2 = R_('SK2');
  const near = (a, b, t) => Math.abs(a - b) < (t || 1e-6);
  const F = (id, only, o) => fight('hunter', Object.assign({ uq: [id], only }, o || {}));
  const A = (f, id) => E.actionList(f.b).find(x => x.id === id) || {};
  // 장면 하나: 준비(pre) → 행동 → 대상이 받은 피해
  const dmg = (id, only, o, pre, aid, ti) => { const f = F(id, only, o); if (pre) pre(f); const e = f.es[ti || 0]; const h0 = e.hp; act(f, aid, e); return { d: h0 - e.hp, f }; };
  const ratio = (id, part, o, pre, aid, ti) => dmg(id, part, o, pre, aid, ti).d / dmg(id, 'none', o, pre, aid, ti).d;
  const foc = n => f => { f.p.focus = n ? { id: f.es[0].id, n } : null; };
  // 스태미나를 정한 값으로 두고 행동(H.act는 스태미나를 가득 채운다)
  const actSt = (f, id, e, s) => { const b = f.b; b.p.ys = 9; b.p.st = s; b.stepMode = true; E.playerAct(b, id, e.id); b.stepMode = false; };

  // hn_h1 긴 활
  ok(near(ratio('hn_h1', 'rule', {}, foc(3), 'basic'), 1.3), '긴 활: 추적 3겹 적에게 기본 공격 +30%');
  ok(near(ratio('hn_h1', 'rule', {}, foc(2), 'basic'), 1), '긴 활: 2겹이면 그대로'); H.cover('hn_h1', 'rule');
  ok(near(ratio('hn_h1', 'cost', {}, foc(0), 'basic'), 0.9), '긴 활 대가: 추적 없는 적에게 기본 공격 −10%');
  ok(near(ratio('hn_h1', 'cost', {}, foc(1), 'basic'), 1), '긴 활 대가: 추적 있으면 그대로'); H.cover('hn_h1', 'cost');

  // hn_h2 사냥꾼의 인장
  { const sw = f => { f.p.focus = { id: f.es[0].id, n: 2 }; };
    const r = dmg('hn_h2', 'rule', {}, sw, 'basic', 1), n = dmg('hn_h2', 'none', {}, sw, 'basic', 1);
    ok(r.f.p.focus.id === r.f.es[1].id && r.f.p.focus.n === 2 && n.f.p.focus.n === 1, '사냥꾼의 인장: 표적을 바꿔도 1겹이 남아 2겹');
    ok(near(r.d / n.d, 1.05), '사냥꾼의 인장: 바꾼 적에게 첫 공격부터 1겹 몫 +5%');
    const g = F('hn_h2', 'rule', { en: ['bruiser', 'bruiser'] }); g.p.focus = { id: g.es[0].id, n: 3 }; R_('hnFoc')(g.b, g.es[1], 1); ok(g.p.focus.id === g.es[1].id && g.p.focus.n === 2, '사냥꾼의 인장: 효과로 쌓는 추적도 1겹 남김'); H.cover('hn_h2', 'rule'); }
  ok(near(ratio('hn_h2', 'cost', {}, foc(2), 'basic'), 1.08 / 1.10), '사냥꾼의 인장 대가: 겹마다 +5% → +4%'); H.cover('hn_h2', 'cost');

  // hn_h3 속사 장갑
  ok(near(ratio('hn_h3', 'rule', { act: ['h5_volley'], en: ['bruiser'] }, null, 'h5_volley'), 4 / 3), '속사 장갑: 연속 사격 3발 → 4발');
  ok(near(ratio('hn_h3', 'rule', { act: ['h5_aimvol'], en: ['bruiser'] }, null, 'h5_aimvol'), 3 / 2), '속사 장갑: 겨눈 연사 2발 → 3발');
  ok(near(ratio('hn_h3', 'rule', { act: ['h5_pierce'] }, null, 'h5_pierce'), 1), '속사 장갑: 한 발 스킬은 그대로'); H.cover('hn_h3', 'rule');
  ok(near(ratio('hn_h3', 'cost', { act: ['h5_pierce'] }, null, 'h5_pierce'), 0.85), '속사 장갑 대가: 한 발 스킬 −15%');
  ok(near(ratio('hn_h3', 'cost', { act: ['h5_volley'], en: ['bruiser'] }, null, 'h5_volley'), 1), '속사 장갑 대가: 여러 발 스킬은 그대로'); H.cover('hn_h3', 'cost');

  // hn_h4 두 겹 시위
  { const N = SK2.h5_nock.fx.find(x => x.k === 'hnNock').n; const r = F('hn_h4', 'rule', { act: ['h5_nock'] }), n = F('hn_h4', 'none', { act: ['h5_nock'] }); act(r, 'h5_nock'); act(n, 'h5_nock');
    ok(r.p.hnSt.nock.n === N + 1 && n.p.hnSt.nock.n === N, '두 겹 시위: 화살 재기 횟수 ' + N + ' → ' + (N + 1));
    for (let i = 0; i < N; i++) { act(r, 'basic'); next(r); } ok(r.p.hnSt.nock && r.p.hnSt.nock.n === 1, '두 겹 시위: 기본 공격 ' + N + '번 뒤에도 한 번 남음'); H.cover('hn_h4', 'rule'); }
  ok(near(ratio('hn_h4', 'cost', {}, null, 'basic'), 0.9), '두 겹 시위 대가: 기본 공격 −10%'); H.cover('hn_h4', 'cost');

  // hn_h5 바람 외투
  { const ev = f => { f.p.evade = 1; enemyHit(f, f.es[0], 10); };
    const r = dmg('hn_h5', 'rule', {}, ev, 'basic'), n = dmg('hn_h5', 'none', {}, ev, 'basic');
    ok(r.f.p.evade === 0 && near(r.d / n.d, 1.4), '바람 외투: 몸 빼기로 피한 뒤 기본 공격 +40%');
    const e = r.f.es[0]; next(r.f); const h0 = e.hp; act(r.f, 'basic', e); const d2 = h0 - e.hp; next(n.f); const h1 = n.f.es[0].hp; act(n.f, 'basic', n.f.es[0]);
    ok(near(d2 / (h1 - n.f.es[0].hp), 1, 0.02), '바람 외투: 그다음 기본 공격은 그대로(한 번)');
    ok(near(ratio('hn_h5', 'rule', {}, null, 'basic'), 1), '바람 외투: 피하지 않았으면 그대로'); H.cover('hn_h5', 'rule'); }
  { const c = F('hn_h5', 'cost'), n = F('hn_h5', 'none'); ok(c.p.hpMax === Math.round(n.p.hpMax * 0.9) || Math.abs(c.p.hpMax - n.p.hpMax * 0.9) <= 1, '바람 외투 대가: 최대 생명력 −10% (' + n.p.hpMax + ' → ' + c.p.hpMax + ')'); H.cover('hn_h5', 'cost'); }

  // hn_h6 족쇄 장갑
  { const prep = f => { const e = f.es[0]; R_('addS')(f.b, e, 'chill', 1); e.intent = { k: 'heavy' }; };
    const ch = only => { const f = F('hn_h6', only, { act: ['h5_stop'] }); prep(f); act(f, 'h5_stop'); return { c: st(f.es[0], 'chill'), k: f.es[0].intent.k }; };
    const r = ch('rule'), n = ch('none'); ok(r.k === 'attack' && n.k === 'attack' && r.c === n.c + 1, '족쇄 장갑: 멈춰 세우기로 끊으면 둔화 +1 (' + n.c + ' → ' + r.c + ')');
    const bc = only => { const f = F('hn_h6', only, { ebrk: 10 }); prep(f); act(f, 'heavy'); return { c: st(f.es[0], 'chill'), br: !!f.es[0].s.broken }; };
    const r2 = bc('rule'), n2 = bc('none'); ok(r2.br && n2.br && r2.c === n2.c + 1, '족쇄 장갑: 무너뜨려 모으기를 끊어도 둔화 +1');
    const nc = only => { const f = F('hn_h6', only, { act: ['h5_stop'] }); f.es[0].intent = { k: 'heavy' }; f.es[0].brkMax = 10; act(f, 'heavy'); return st(f.es[0], 'chill'); };
    ok(nc('rule') === nc('none'), '족쇄 장갑: 둔화 없는 적을 끊으면 그대로'); H.cover('hn_h6', 'rule'); }
  ok(near(ratio('hn_h6', 'cost', { act: ['h5_pierce'] }, null, 'h5_pierce'), 0.9), '족쇄 장갑 대가: 둔화 없는 적에게 스킬 −10%');
  ok(near(ratio('hn_h6', 'cost', { act: ['h5_pierce'] }, f => R_('addS')(f.b, f.es[0], 'chill', 1), 'h5_pierce'), 1), '족쇄 장갑 대가: 둔화 걸린 적에게는 그대로'); H.cover('hn_h6', 'cost');

  // hn_h7 만궁
  ok(near(ratio('hn_h7', 'rule', { act: ['h5_heavy'] }, null, 'h5_heavy'), 1.25), '만궁: 느린 스킬 +25%');
  ok(near(ratio('hn_h7', 'rule', { act: ['h5_pierce'] }, null, 'h5_pierce'), 1), '만궁: 보통 스킬은 그대로'); H.cover('hn_h7', 'rule');
  ok(near(ratio('hn_h7', 'cost', { act: ['h5_pierce'] }, null, 'h5_pierce'), 0.9), '만궁 대가: 보통 스킬 −10%');
  ok(near(ratio('hn_h7', 'cost', { act: ['h5_heavy'] }, null, 'h5_heavy'), 1), '만궁 대가: 느린 스킬은 그대로'); H.cover('hn_h7', 'cost');

  // hn_h8 질풍 목걸이
  { const run = only => { const f = F('hn_h8', only, { act: ['h5_pierce', 'h5_volley'], en: ['bruiser'] }); const e = f.es[0]; act(f, 'h5_pierce', e); next(f); actSt(f, 'h5_volley', e, 50); const a = f.p.st; const L = f.b.turnIdx; actSt(f, 'h5_pierce', e, 50); return { a, b: f.p.st, x: f.b.turnIdx > L }; };
    const r = run('rule'), n = run('none'); ok(r.a === 60 && n.a === 50, '질풍 목걸이: 연계 빠른 행동 뒤 스태미나 +10');
    ok(r.x && n.x && r.b === n.b, '질풍 목걸이: 연계 빠른 행동이 아니면 그대로'); H.cover('hn_h8', 'rule'); }
  { const c = F('hn_h8', 'cost'), n = F('hn_h8', 'none'); ok(c.p.stMax === n.p.stMax - 20, '질풍 목걸이 대가: 최대 스태미나 −20'); H.cover('hn_h8', 'cost'); }

  // hn_h9 덫 사냥꾼의 반지
  { const r = F('hn_h9', 'rule'), n = F('hn_h9', 'none'); enemyHit(r, r.es[1], 5); enemyHit(n, n.es[1], 5);
    ok(r.p.focus && r.p.focus.id === r.es[1].id && r.p.focus.n === 1 && !n.p.focus, '덫 사냥꾼의 반지: 나를 친 적에게 추적 1겹');
    enemyHit(r, r.es[1], 5); ok(r.p.focus.n === 2, '덫 사냥꾼의 반지: 다시 치면 2겹');
    r.p.evade = 1; enemyHit(r, r.es[0], 5); ok(r.p.focus.id === r.es[1].id, '덫 사냥꾼의 반지: 몸 빼기로 피한 공격은 치지 못함');
    enemyHit(r, r.es[0], 5, { dot: 1 }); ok(r.p.focus.id === r.es[1].id, '덫 사냥꾼의 반지: 지속 피해는 직접이 아님'); H.cover('hn_h9', 'rule'); }
  { const c = F('hn_h9', 'cost'), n = F('hn_h9', 'none'); const dc = enemyHit(c, c.es[0], 10), dn = enemyHit(n, n.es[0], 10); ok(near(dc / dn, 1.08), '덫 사냥꾼의 반지 대가: 받는 피해 +8%'); H.cover('hn_h9', 'cost'); }

  // hn_r1 묵직한 활 (M5-7: BRK_RULE.basic0이 켜져 있으면 기본 공격 붕괴는 이미 0)
  { const B0 = R_('BRK_RULE.basic0');
    const run = (only, b0) => { R_('BRK_RULE.basic0 = ' + b0); try { const f = F('hn_r1', only); act(f, 'basic'); return { c: st(f.es[0], 'chill'), k: f.es[0].brk || 0 }; } finally { R_('BRK_RULE.basic0 = ' + B0); } };
    const r = run('rule', true), n = run('none', true); ok(r.c === 1 && n.c === 0, '묵직한 활: 기본 공격이 둔화 1');
    const r0 = run('rule', false), n0 = run('none', false); ok(r0.k === 0 && n0.k > 0 && r0.c === 1, '묵직한 활: 붕괴 규칙을 꺼도 붕괴 대신 둔화');
    { const f = F('hn_r1', 'rule', { act: ['h5_nock'] }); act(f, 'h5_nock'); act(f, 'basic'); ok(st(f.es[0], 'chill') === 1, '묵직한 활: 화살 재기로 두 발이어도 둔화 1(행동마다 한 번)'); }
    H.cover('hn_r1', 'rule');
    const c0 = run('cost', false); ok(c0.k === 0 && c0.c === 0 && n0.k > 0, '묵직한 활 대가: 기본 공격의 붕괴 0 (붕괴 규칙 끈 측정)');
    const c1 = run('cost', true); ok(c1.k === 0 && n.k === 0, '묵직한 활 대가: M5-7 규칙에서는 이미 0'); H.cover('hn_r1', 'cost'); }

  // hn_r2 사냥꾼의 망토
  { const r = F('hn_r2', 'rule'), n = F('hn_r2', 'none'); r.p.evade = 1; n.p.evade = 1; const dr = enemyHit(r, r.es[0], 10, { aoe: 1 }), dn = enemyHit(n, n.es[0], 10, { aoe: 1 });
    ok(dr === 0 && r.p.evade === 0 && dn > 0 && n.p.evade === 1, '사냥꾼의 망토: 몸 빼기가 여럿을 치는 공격도 피함'); H.cover('hn_r2', 'rule'); }
  { const c = F('hn_r2', 'cost', { act: ['h5_hide'] }), n = F('hn_r2', 'none', { act: ['h5_hide'] }); act(c, 'h5_hide'); act(n, 'h5_hide');
    ok(c.p.evade === 1 && n.p.evade === 2, '사냥꾼의 망토 대가: 몸 빼기 상한 3 → 1'); H.cover('hn_r2', 'cost'); }

  // hn_r3 연계 장갑
  { const r = F('hn_r3', 'rule', { act: ['h5_heavy', 'h5_lock', 'h5_volley'] }), n = F('hn_r3', 'none', { act: ['h5_heavy', 'h5_lock', 'h5_volley'] });
    ok(A(r, 'h5_heavy').time === 1 && A(n, 'h5_heavy').time === 1.5, '연계 장갑: 느린 스킬이 보통 빠르기');
    act(r, 'h5_lock'); act(n, 'h5_lock'); ok(A(r, 'h5_heavy').ok && !A(n, 'h5_heavy').ok, '연계 장갑: 빠른 행동 뒤에도 쓸 수 있음(보통)');
    r.p.lastBr = '연사'; ok(R_('linkOn')(r.b, A(r, 'h5_heavy')) && !R_('hnLinkFastOk')(r.b, A(r, 'h5_heavy')), '연계 장갑: 연계여도 연계 빠른 행동은 되지 않음'); H.cover('hn_r3', 'rule'); }
  ok(near(ratio('hn_r3', 'cost', { act: ['h5_heavy'] }, null, 'h5_heavy'), 0.85), '연계 장갑 대가: 느린 스킬 −15%');
  ok(near(ratio('hn_r3', 'cost', { act: ['h5_pierce'] }, null, 'h5_pierce'), 1), '연계 장갑 대가: 보통 스킬은 그대로'); H.cover('hn_r3', 'cost');

  // hn_r4 개전의 뿔피리
  { const run = only => { const f = F('hn_r4', only, { en: ['bruiser'] }); const r1 = f.b.pDouble === f.b.round; act(f, 'basic'); act(f, 'basic'); next(f); return { r1, r2: f.b.round === 2 && f.b.pDouble === 2 }; };
    const r = run('rule'), n = run('none'); ok(r.r1 && n.r1 && r.r2 && !n.r2, '개전의 뿔피리: 첫 라운드의 두 번 움직임이 둘째 라운드에도'); H.cover('hn_r4', 'rule'); }
  { const c = F('hn_r4', 'cost'), n = F('hn_r4', 'none'), ys = R_('ysStartOf'); ok(ys(c.p) === Math.max(0, ys(n.p) - 2) && ys(c.p) < ys(n.p), '개전의 뿔피리 대가: 전투 시작 유산 −2 (' + ys(n.p) + ' → ' + ys(c.p) + ')'); H.cover('hn_r4', 'cost'); }

  // hn_r5 추적자의 반지
  ok(near(ratio('hn_r5', 'rule', {}, foc(2), 'basic'), 1.16 / 1.10), '추적자의 반지: 추적 겹마다 +5% → +8%'); H.cover('hn_r5', 'rule');
  { const c = F('hn_r5', 'cost'), n = F('hn_r5', 'none'), cap = R_('focusCapOf'); for (let i = 0; i < 4; i++) { act(c, 'basic'); next(c); act(n, 'basic'); next(n); }
    ok(cap(c.p) === 2 && cap(n.p) === 3 && c.p.focus.n === 2 && n.p.focus.n === 3, '추적자의 반지 대가: 추적 상한 3 → 2'); H.cover('hn_r5', 'cost'); }

  // hn_r6 역풍 플라스크
  { const r = F('hn_r6', 'rule'), n = F('hn_r6', 'none'); r.p.hp = n.p.hp = 10; act(r, 'flaskL'); act(n, 'flaskL'); ok(r.p.evade === 2 && !n.p.evade, '역풍 플라스크: 마시면 몸 빼기 2'); H.cover('hn_r6', 'rule'); }
  { const c = F('hn_r6', 'cost'), n = F('hn_r6', 'none'); c.p.hp = n.p.hp = 1; act(c, 'flaskL'); act(n, 'flaskL'); ok(near((c.p.hp - 1) / (n.p.hp - 1), 0.7), '역풍 플라스크 대가: 생명력 플라스크 회복 −30%'); H.cover('hn_r6', 'cost'); }
};
