'use strict';
/* 0.8.0 M6-1 공용 고유(cls all) 15 단위 시험: 같은 장면을 only 'rule' · 'cost'와 'none'으로 돌려 차이를 본다 */
module.exports = H => {
  const { ok, fight, act, next, enemyHit, st, E } = H;
  const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-6) * Math.max(1, Math.abs(b));
  const F = (cls, id, only, o) => fight(cls, Object.assign({ uq: [id], only }, o || {}));
  const lost = e => e.hpMax - e.hp;
  const B20 = p => 20 * (1 + 0.01 * H.R_('stat')(p, 'str')); // 붕괴 +20 (addBreak가 힘으로 곱한다)
  /* 한 행동의 피해(첫 적) */
  const hitBy = (cls, id, only, a, o, pre) => { const f = F(cls, id, only, o); if (pre) pre(f); const e = f.es[0], h0 = e.hp; act(f, a, e); return h0 - e.hp; };

  // 쌍날 단검: 기본 공격이 두 번(50%씩) · 대가 강공격 −20%
  { const f = F('warden', 'cm_twin', 'rule'); act(f, 'basic'); const L = f.b.rec.filter(r => r.k === 'dealt').map(r => r.a);
    const g = F('warden', 'cm_twin', 'none'); act(g, 'basic'); const L0 = g.b.rec.filter(r => r.k === 'dealt');
    ok(L.length === 2 && L[0] === '첫 날' && L[1] === '둘째 날' && L0.length === 1, '쌍날 단검 규칙: 기본 공격 두 번');
    ok(near(lost(f.es[0]), lost(g.es[0]), 0.02), '쌍날 단검 규칙: 두 번 합이 한 번과 같다(50%씩)');
    const t2 = fight('warden', { uq: ['cm_twin', 'cm_mark'], only: 'rule' }); const e2 = t2.es[0]; act(t2, 'basic', e2); next(t2); act(t2, 'basic', e2); ok(st(e2, 'vuln') === 2, '쌍날 단검 규칙: 맞을 때마다 효과가 두 번(표식이 기본 공격 둘째 번에 셋째 타격)');
    H.cover('cm_twin', 'rule'); }
  { const c = hitBy('warden', 'cm_twin', 'cost', 'heavy'), z = hitBy('warden', 'cm_twin', 'none', 'heavy');
    ok(near(c / z, 0.8, 0.01), '쌍날 단검 대가: 강공격 피해 −20% (' + (c / z).toFixed(3) + ')');
    const b1 = hitBy('warden', 'cm_twin', 'cost', 'basic'), b0 = hitBy('warden', 'cm_twin', 'none', 'basic'); ok(near(b1, b0), '쌍날 단검 대가: 기본 공격은 그대로');
    H.cover('cm_twin', 'cost'); }

  // 무거운 망치: 강공격 붕괴 +20 · 대가 강공격 스태미나 +10
  { const f = F('warden', 'cm_maul', 'rule'), g = F('warden', 'cm_maul', 'none'); act(f, 'heavy'); act(g, 'heavy');
    ok(near(f.es[0].brk - g.es[0].brk, B20(f.p)), '무거운 망치 규칙: 강공격 붕괴 +20 (' + (f.es[0].brk - g.es[0].brk) + ')');
    const f2 = F('warden', 'cm_maul', 'rule'), g2 = F('warden', 'cm_maul', 'none'); act(f2, 'basic'); act(g2, 'basic'); ok(f2.es[0].brk === g2.es[0].brk, '무거운 망치 규칙: 기본 공격 붕괴는 그대로');
    H.cover('cm_maul', 'rule'); }
  { const f = F('warden', 'cm_maul', 'cost'), g = F('warden', 'cm_maul', 'none'); act(f, 'heavy'); act(g, 'heavy');
    ok((f.p.stMax - f.p.st) - (g.p.stMax - g.p.st) === 10, '무거운 망치 대가: 강공격 스태미나 +10');
    H.cover('cm_maul', 'cost'); }

  // 끌어내는 갈고리: 강공격이 후열 적을 전열로 · 대가 무기 피해 −15%
  { const back = { setup: (run, es) => { es[1].row = 'back'; } };
    const f = F('warden', 'cm_hook', 'rule', back), g = F('warden', 'cm_hook', 'none', back); act(f, 'heavy', f.es[1]); act(g, 'heavy', g.es[1]);
    ok(f.es[1].row === 'front' && lost(f.es[1]) > 0, '갈고리 규칙: 후열 적을 강공격으로 끌어낸다');
    ok(g.es[1].row === 'back' && lost(g.es[1]) === 0 && lost(g.es[0]) > 0, '갈고리 없음: 후열에 닿지 않는다');
    const f2 = F('warden', 'cm_hook', 'rule', back); act(f2, 'basic', f2.es[1]); ok(f2.es[1].row === 'back', '갈고리 규칙: 기본 공격은 끌어내지 않는다');
    H.cover('cm_hook', 'rule'); }
  { const c = hitBy('warden', 'cm_hook', 'cost', 'basic'), z = hitBy('warden', 'cm_hook', 'none', 'basic'); ok(near(c / z, 0.85, 0.01), '갈고리 대가: 무기 피해 −15% (기본)');
    const c2 = hitBy('warden', 'cm_hook', 'cost', 'heavy'), z2 = hitBy('warden', 'cm_hook', 'none', 'heavy'); ok(near(c2 / z2, 0.85, 0.01), '갈고리 대가: 무기 피해 −15% (강공격)');
    H.cover('cm_hook', 'cost'); }

  // 가시 갑옷: 방어 중 전열 적에게 맞으면 그 적에게 2 · 대가 최대 생명력 −5%
  { const run = (only, guard, row) => { const f = F('warden', 'cm_thorns', only, { setup: (r, es) => { es[0].row = row || 'front'; } }); if (guard) act(f, 'guard'); const h0 = f.es[0].hp; enemyHit(f, f.es[0], 6); return h0 - f.es[0].hp; };
    ok(near(run('rule', 1), 2), '가시 갑옷 규칙: 방어 중 맞으면 그 적에게 2'); ok(run('none', 1) === 0, '가시 없음: 되돌림 없음');
    ok(run('rule', 0) === 0, '가시 갑옷 규칙: 방어하지 않으면 없음'); ok(run('rule', 1, 'back') === 0, '가시 갑옷 규칙: 후열 적은 없음');
    H.cover('cm_thorns', 'rule'); }
  { const c = F('warden', 'cm_thorns', 'cost').p.hpMax, z = F('warden', 'cm_thorns', 'none').p.hpMax; ok(Math.abs(c - z * 0.95) <= 1, '가시 갑옷 대가: 최대 생명력 −5% (' + z + ' → ' + c + ')'); H.cover('cm_thorns', 'cost'); }

  // 그림자 망토: 흘리기 줄임 +15%p(최대 90%) · 대가 최대 생명력 −5%
  { const red = (cls, only) => { const f = F(cls, 'cm_cloak', only); act(f, 'dodge'); return f.p.dodgeRed; };
    const w1 = red('warden', 'rule'), w0 = red('warden', 'none'); ok(near(w1 - w0, 0.15), '그림자 망토 규칙: 흘리기 +15%p (' + w0 + ' → ' + w1 + ')');
    const a1 = red('assassin', 'rule'), a0 = red('assassin', 'none'); ok(near(a1, Math.min(0.9, a0 + 0.15)) && a1 <= 0.9, '그림자 망토 규칙: 암살자 흘리기 +15%p, 상한 90% (' + a0 + ' → ' + a1 + ')');
    const pr = (only) => { const f = F('warden', 'cm_cloak', only); act(f, 'dodge', f.es[0]); return enemyHit(f, f.es[0], 20); };
    ok(pr('rule') < pr('none'), '그림자 망토 규칙: 흘린 공격 피해가 더 준다');
    const sk = only => { const f = F('assassin', 'cm_cloak', only, { act: ['a_heulbe'] }); act(f, 'a_heulbe', f.es[0]); return f.p.dodgeRed; }; const k1 = sk('rule'), k0 = sk('none'); ok(k0 > 0 && near(k1, Math.min(0.9, k0 + 0.15)), '그림자 망토 규칙: 흘리기 스킬도 +15%p, 상한 90% (' + k0 + ' → ' + k1 + ')');
    H.cover('cm_cloak', 'rule'); }
  { const c = F('assassin', 'cm_cloak', 'cost').p.hpMax, z = F('assassin', 'cm_cloak', 'none').p.hpMax; ok(Math.abs(c - z * 0.95) <= 1, '그림자 망토 대가: 최대 생명력 −5%'); H.cover('cm_cloak', 'cost'); }

  // 피의 서약: 생명력이 절반 아래면 주는 피해 +20% · 대가 플라스크 · 스킬로 되찾는 생명력 −15%
  { const low = f => { f.p.hp = f.p.hpMax * 0.4; };
    const c = hitBy('warden', 'cm_bloodpact', 'rule', 'basic', null, low), z = hitBy('warden', 'cm_bloodpact', 'none', 'basic', null, low); ok(near(c / z, 1.2, 0.01), '피의 서약 규칙: 절반 아래 피해 +20%');
    const c2 = hitBy('warden', 'cm_bloodpact', 'rule', 'basic'), z2 = hitBy('warden', 'cm_bloodpact', 'none', 'basic'); ok(near(c2, z2), '피의 서약 규칙: 절반 이상이면 그대로');
    H.cover('cm_bloodpact', 'rule'); }
  { const heal = only => { const f = F('warden', 'cm_bloodpact', only); f.p.hp = 10; act(f, 'flaskL'); return f.p.hp - 10; };
    ok(near(heal('cost') / heal('none'), 0.85, 0.01), '피의 서약 대가: 플라스크 회복 −15%');
    const sk = only => { const f = F('warden', 'cm_bloodpact', only, { act: ['w_pray'] }); f.p.hp = 10; act(f, 'w_pray'); return f.p.hp - 10; };
    const s1 = sk('cost'), s0 = sk('none'); ok(s0 > 0 && near(s1 / s0, 0.85, 0.02), '피의 서약 대가: 스킬 회복 −15% (' + s0 + ' → ' + s1 + ')');
    H.cover('cm_bloodpact', 'cost'); }

  // 분노의 반지: 강타를 맞으면 다음 공격 +10% · 대가 받는 강타 피해 +10%
  { const two = only => { const f = F('warden', 'cm_fury', only); enemyHit(f, f.es[0], 5, { charged: 1 }); const e = f.es[0]; let h = e.hp; act(f, 'basic', e); const d1 = h - e.hp; next(f); h = e.hp; act(f, 'basic', e); return [d1, h - e.hp]; };
    const r = two('rule'), z = two('none'); ok(near(r[0] / z[0], 1.1, 0.01), '분노의 반지 규칙: 강타 뒤 다음 공격 +10%'); ok(near(r[1], z[1], 0.01), '분노의 반지 규칙: 그다음 공격은 그대로');
    const f = F('warden', 'cm_fury', 'rule'); enemyHit(f, f.es[0], 5); const h = f.es[0].hp; act(f, 'basic'); const g = F('warden', 'cm_fury', 'none'); enemyHit(g, g.es[0], 5); const hg = g.es[0].hp; act(g, 'basic');
    ok(near(h - f.es[0].hp, hg - g.es[0].hp), '분노의 반지 규칙: 강타가 아니면 없음');
    H.cover('cm_fury', 'rule'); }
  { const tk = (only, x) => { const f = F('warden', 'cm_fury', only); return enemyHit(f, f.es[0], 10, x); };
    ok(near(tk('cost', { charged: 1 }) / tk('none', { charged: 1 }), 1.1, 0.01), '분노의 반지 대가: 받는 강타 피해 +10%'); ok(near(tk('cost'), tk('none')), '분노의 반지 대가: 강타가 아니면 그대로');
    H.cover('cm_fury', 'cost'); }

  // 수렴의 반지: 한 적 대상 +7% · 대가 여럿을 치는 공격 −30%
  { const c = hitBy('warden', 'cm_focus', 'rule', 'basic'), z = hitBy('warden', 'cm_focus', 'none', 'basic'); ok(near(c / z, 1.07, 0.01), '수렴의 반지 규칙: 한 적 공격 +7%');
    const s1 = hitBy('warden', 'cm_focus', 'rule', 's_slam', { act: ['s_slam'] }), s0 = hitBy('warden', 'cm_focus', 'none', 's_slam', { act: ['s_slam'] }); ok(near(s1 / s0, 1.07, 0.01), '수렴의 반지 규칙: 한 적 스킬 +7%');
    const a1 = hitBy('warden', 'cm_focus', 'rule', 'f_sweep', { act: ['f_sweep'] }), a0 = hitBy('warden', 'cm_focus', 'none', 'f_sweep', { act: ['f_sweep'] }); ok(near(a1, a0), '수렴의 반지 규칙: 여럿을 치는 스킬엔 없음');
    H.cover('cm_focus', 'rule'); }
  { const a1 = hitBy('warden', 'cm_focus', 'cost', 'f_sweep', { act: ['f_sweep'] }), a0 = hitBy('warden', 'cm_focus', 'none', 'f_sweep', { act: ['f_sweep'] }); ok(a0 > 0 && near(a1 / a0, 0.7, 0.01), '수렴의 반지 대가: 여럿을 치는 공격 −30%');
    const c = hitBy('warden', 'cm_focus', 'cost', 'basic'), z = hitBy('warden', 'cm_focus', 'none', 'basic'); ok(near(c, z), '수렴의 반지 대가: 한 적 공격은 그대로');
    H.cover('cm_focus', 'cost'); }

  // 끓는 플라스크: 마시면 모든 적에게 5 · 대가 플라스크 회복 −25%
  { const run = only => { const f = F('warden', 'cm_boil', only); f.p.hp = 10; act(f, 'flaskL'); return f.es.map(lost); };
    const r = run('rule'), z = run('none'); ok(r.every(x => x > 0) && z.every(x => x === 0), '끓는 플라스크 규칙: 마시면 모든 적에게 피해 (' + r.map(x => x.toFixed(1)) + ')');
    const f = F('warden', 'cm_boil', 'rule'); f.p.flask.stam = 1; act(f, 'flaskS'); ok(f.es.every(e => lost(e) === 0), '끓는 플라스크 규칙: 스태미나 플라스크는 아니다');
    H.cover('cm_boil', 'rule'); }
  { const heal = only => { const f = F('warden', 'cm_boil', only); f.p.hp = 10; act(f, 'flaskL'); return f.p.hp - 10; }; ok(near(heal('cost') / heal('none'), 0.75, 0.01), '끓는 플라스크 대가: 회복 −25%'); H.cover('cm_boil', 'cost'); }

  // 사슬 장갑: 근접 스킬로 때리면 붕괴 +20 · 대가 최대 스태미나 −10
  { const bk = (only, a, id) => { const f = F('warden', 'cm_chain', only, { act: a ? [a] : [] }); act(f, id || a); return f.es[0].brk; };
    ok(near(bk('rule', 's_slam') - bk('none', 's_slam'), B20(F('warden', 'cm_chain', 'none').p)), '사슬 장갑 규칙: 근접 스킬 붕괴 +20');
    ok(bk('rule', null, 'heavy') === bk('none', null, 'heavy'), '사슬 장갑 규칙: 강공격엔 없음');
    ok(bk('rule', 'f_chainblade') === bk('none', 'f_chainblade'), '사슬 장갑 규칙: 원거리 스킬엔 없음');
    H.cover('cm_chain', 'rule'); }
  { const c = F('warden', 'cm_chain', 'cost').p.stMax, z = F('warden', 'cm_chain', 'none').p.stMax; ok(z - c === 10, '사슬 장갑 대가: 최대 스태미나 −10'); H.cover('cm_chain', 'cost'); }

  // 추적자의 표식: 같은 적을 세 번 이어 치면 취약 2 · 대가 대상을 바꾼 첫 공격 −10%
  { const three = only => { const f = F('warden', 'cm_mark', only); const e = f.es[0]; const v = []; for (let i = 0; i < 3; i++) { act(f, 'basic', e); v.push(st(e, 'vuln')); if (i < 2) next(f); } return v; };
    const r = three('rule'), z = three('none'); ok(r[0] === 0 && r[1] === 0 && r[2] === 2, '추적자의 표식 규칙: 셋째 타격에 취약 2 (' + r + ')'); ok(z[2] === 0, '표식 없음: 취약 없음');
    const f = F('warden', 'cm_mark', 'rule'); act(f, 'basic', f.es[0]); next(f); act(f, 'basic', f.es[1]); next(f); act(f, 'basic', f.es[0]); ok(st(f.es[0], 'vuln') === 0 && st(f.es[1], 'vuln') === 0, '추적자의 표식 규칙: 이어 치지 않으면 없음');
    H.cover('cm_mark', 'rule'); }
  { const sw = only => { const f = F('warden', 'cm_mark', only); act(f, 'basic', f.es[0]); next(f); const e = f.es[1], h = e.hp; act(f, 'basic', e); const d1 = h - e.hp; next(f); const h2 = e.hp; act(f, 'basic', e); return [d1, h2 - e.hp]; };
    const c = sw('cost'), z = sw('none'); ok(near(c[0] / z[0], 0.9, 0.01), '추적자의 표식 대가: 대상을 바꾼 첫 공격 −10%'); ok(near(c[1], z[1], 0.01), '추적자의 표식 대가: 그다음은 그대로');
    H.cover('cm_mark', 'cost'); }

  // 수호의 문장: 보호막이 남은 동안 받는 피해 −15% · 대가 최대 생명력 −5%
  { const tk = (only, ward) => { const f = F('warden', 'cm_ward', only); f.p.ward = ward; const hp = f.p.hp; enemyHit(f, f.es[0], 20); return (ward - f.p.ward) + (hp - f.p.hp); };
    ok(near(tk('rule', 60) / tk('none', 60), 0.85, 0.01), '수호의 문장 규칙: 보호막 동안 받는 피해 −15%'); ok(near(tk('rule', 0), tk('none', 0)), '수호의 문장 규칙: 보호막이 없으면 그대로');
    H.cover('cm_ward', 'rule'); }
  { const c = F('warden', 'cm_ward', 'cost').p.hpMax, z = F('warden', 'cm_ward', 'none').p.hpMax; ok(Math.abs(c - z * 0.95) <= 1, '수호의 문장 대가: 최대 생명력 −5%'); H.cover('cm_ward', 'cost'); }

  // 느린 맥박: 직접 피해 +35% · 대가 빠른 칸 없음
  { const c = hitBy('warden', 'cm_pulse', 'rule', 'basic'), z = hitBy('warden', 'cm_pulse', 'none', 'basic'); ok(near(c / z, 1.35, 0.01), '느린 맥박 규칙: 직접 피해 +35%');
    const s1 = hitBy('warden', 'cm_pulse', 'rule', 'f_sweep', { act: ['f_sweep'] }), s0 = hitBy('warden', 'cm_pulse', 'none', 'f_sweep', { act: ['f_sweep'] }); ok(near(s1 / s0, 1.35, 0.01), '느린 맥박 규칙: 스킬 직접 피해도 +35%');
    H.cover('cm_pulse', 'rule'); }
  { const fast = only => { const f = F('warden', 'cm_pulse', only); f.p.hp = 10; return act(f, 'flaskL'); };
    ok(fast('none') === true && fast('cost') === false, '느린 맥박 대가: 빠른 행동(플라스크)도 차례를 끝낸다');
    H.cover('cm_pulse', 'cost'); }

  // 선봉의 깃발: 첫 공격이 빠른 행동 + 붕괴 +20 · 대가 최대 스태미나 −20
  { const run = (only, a) => { const f = F('warden', 'cm_vanguard', only); const k1 = act(f, a, f.es[0]); const b1 = f.es[0].brk; next(f); const b0 = f.es[0].brk; const k2 = act(f, a, f.es[0]); return { k1, b1, k2, b2: f.es[0].brk - b0 }; };
    const r = run('rule', 'basic'), z = run('none', 'basic');
    ok(r.k1 === true && z.k1 === false, '선봉의 깃발 규칙: 첫 공격이 빠른 행동(차례가 이어진다)'); ok(near(r.b1 - z.b1, B20(F('warden', 'cm_vanguard', 'none').p)), '선봉의 깃발 규칙: 첫 공격 붕괴 +20');
    ok(r.k2 === false && r.b2 === z.b2, '선봉의 깃발 규칙: 둘째 공격은 그대로');
    const h = run('rule', 'heavy'); ok(h.k1 === true, '선봉의 깃발 규칙: 느린 강공격도 첫 공격이면 빠른 행동');
    const f = F('warden', 'cm_vanguard', 'rule'); f.p.hp = 10; act(f, 'flaskL'); ok(f.p.vanguard === 2, '선봉의 깃발 규칙: 플라스크는 첫 공격이 아니다');
    H.cover('cm_vanguard', 'rule'); }
  { const c = F('warden', 'cm_vanguard', 'cost').p.stMax, z = F('warden', 'cm_vanguard', 'none').p.stMax; ok(z - c === 20, '선봉의 깃발 대가: 최대 스태미나 −20'); H.cover('cm_vanguard', 'cost'); }

  // 성급한 플라스크: 마셔도 차례가 이어진다(주 행동 · 빠른 칸이 남는다) · 대가 회복 −50%, 마실 때마다 스태미나 −10
  { const run = only => { const f = F('warden', 'cm_fastflask', only); f.p.hp = 10; const k1 = act(f, 'flaskL'); const hv = (E.actionList(f.b).find(a => a.id === 'heavy') || {}).ok; f.p.hp = 10; const k2 = act(f, 'flaskL'); return { k1, hv, k2, bu: f.b.bonusUsed }; };
    const r = run('rule'), z = run('none');
    ok(r.k1 && r.k2 && r.hv && !r.bu, '성급한 플라스크 규칙: 두 번 마셔도 차례가 이어지고 느린 행동도 남는다');
    ok(z.k1 && !z.hv && z.k2 === false, '플라스크 기본: 빠른 칸을 써서 두 번째에 차례가 끝난다');
    const f = F('warden', 'cm_fastflask', 'rule'); f.p.hp = 10; act(f, 'flaskL'); ok(act(f, 'basic') === false && f.b.turnIdx === 1, '성급한 플라스크 규칙: 마신 뒤 주 행동으로 차례가 끝난다');
    H.cover('cm_fastflask', 'rule'); }
  { const one = only => { const f = F('warden', 'cm_fastflask', only); f.p.hp = 10; act(f, 'flaskL'); return { h: f.p.hp - 10, s: f.p.stMax - f.p.st }; };
    const c = one('cost'), z = one('none'); ok(near(c.h / z.h, 0.5, 0.01), '성급한 플라스크 대가: 회복 −50%'); ok(c.s - z.s === 10, '성급한 플라스크 대가: 마실 때마다 스태미나 −10');
    H.cover('cm_fastflask', 'cost'); }
};
