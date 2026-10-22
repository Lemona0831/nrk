'use strict';
/* 0.8.0 M6-1 접사 엔진 점검: 접사 효과 꼴(js/17 g8AfFx)마다 대표 접사가 실제 전투에서 문장대로 드는가. 실행: node tools/affix-check.js
   같은 장면을 접사 없이 · 접사를 끼고 두 번 돌려 차이를 본다(장비 기반 수치는 같게) */
const H = require('./uqtest/_h.js'); const { E, R_, ok, act, enemyHit, st } = H;
const it = (af, base) => E.mkItem8({ base: base || 'blade', g: 'r', ch: 1, b: 0, af });
function fightA(build, af, o) {
  o = o || {}; const f = H.fight(build, Object.assign({}, o, { uq: [] })); const run = f.run;
  if (af) { const x = it(af, o.base); run.inv[x.uid] = x; run.eqU[o.slot || 'weapon'] = x.uid; }
  else { const x = it([], o.base); run.inv[x.uid] = x; run.eqU[o.slot || 'weapon'] = x.uid; }
  const p = run.p, hp = p.hp; E.applyGear(run); p.hp = p.hpMax; p.st = p.stMax; return f;
}
const dmgOf = (f, id, e) => { e = e || f.es[0]; const h0 = e.hp; act(f, id, e); return h0 - e.hp; };
const brkOf = (f, id, e) => { e = e || f.es[0]; const b0 = e.brk; act(f, id, e); return e.brk - b0; };
// 기본 공격 피해 +N (hitAdd)
{ const a = dmgOf(fightA('warden', null), 'basic'), b = dmgOf(fightA('warden', [['basicDmg', 3]]), 'basic'); ok(b - a > 2.5 && b - a < 4, '기본 공격 피해 +3: ' + a.toFixed(1) + ' → ' + b.toFixed(1)); }
// 강공격 피해 +N% (dmgP, maxOf)
{ const a = dmgOf(fightA('warden', null), 'heavy'), b = dmgOf(fightA('warden', [['heavyDmg', 40]]), 'heavy'); ok(Math.abs(b / a - 1.4) < 0.02, '강공격 피해 +40%: ×' + (b / a).toFixed(3)); }
// 강공격 붕괴 +N (brk)
{ const f0 = fightA('warden', null), a = brkOf(f0, 'heavy'), b = brkOf(fightA('warden', [['heavyBrk', 20]]), 'heavy'); ok(b - a >= 20, '강공격 붕괴 +20: ' + a.toFixed(1) + ' → ' + b.toFixed(1)); }
// 기본 공격이 출혈 1을 건다 (kw, basicHit)
{ const f = fightA('warden', [['basicSt_bleed', 1]]); act(f, 'basic'); ok(st(f.es[0], 'bleed') >= 1, '기본 공격이 출혈 1을 건다'); }
// 정예 · 강적 · 보스에게 +N% (조건 big)
{ const mk = af => fightA('warden', af, { setup: (run, es) => { es[0].elite = 1; } }); const a = dmgOf(mk(null), 'basic'), b = dmgOf(mk([['vsBig', 30]]), 'basic'); ok(Math.abs(b / a - 1.3) < 0.02, '정예에게 +30%: ×' + (b / a).toFixed(3)); }
// 같은 묶음이 아닌 % 둘: 큰 쪽만(maxOf) — 정예 +30% · 첫 라운드 +45%
{ const mk = af => fightA('warden', af, { slot: 'ring1', base: 'ring', setup: (run, es) => { es[0].elite = 1; } }); const a = dmgOf(mk(null), 'basic');
  const f = fightA('warden', [['vsBig', 30]], { slot: 'ring1', base: 'ring', setup: (run, es) => { es[0].elite = 1; } }); const x = it([['firstRound', 45]], 'seal'); f.run.inv[x.uid] = x; f.run.eqU.ring2 = x.uid; E.applyGear(f.run); const b = dmgOf(f, 'basic');
  ok(Math.abs(b / a - 1.45) < 0.02, '% 둘(정예 +30 · 첫 라운드 +45): 큰 쪽만 ×' + (b / a).toFixed(3)); }
// 최대 생명력 · 최대 스태미나 (stat)
{ const a = fightA('warden', null, { slot: 'armor', base: 'plate' }).p.hpMax, b = fightA('warden', [['hp', 20]], { slot: 'armor', base: 'plate' }).p.hpMax; ok(b - a === 20, '최대 생명력 +20: ' + a + ' → ' + b); }
{ const a = fightA('warden', null, { slot: 'amulet', base: 'amulet' }).p.stMax, b = fightA('warden', [['stMax', 25]], { slot: 'amulet', base: 'amulet' }).p.stMax; ok(b - a === 25, '최대 스태미나 +25: ' + a + ' → ' + b); }
// 강공격 스태미나 −N (cost)
{ const hc = R_('heavyCost'); const a = hc(fightA('warden', null).p), b = hc(fightA('warden', [['heavyStam', 10]]).p); ok(a - b === 10, '강공격 스태미나 −10: ' + a + ' → ' + b); }
// 보호막이 있으면 받는 피해 −N% (inR, maxOf)
{ const mk = af => { const f = fightA('warden', af, { slot: 'armor', base: 'plate' }); f.p.ward = 50; return f; }; const f0 = mk(null), f1 = mk([['wardRed', 20]]);
  const w0 = f0.p.ward, w1 = f1.p.ward; enemyHit(f0, f0.es[0], 30); enemyHit(f1, f1.es[0], 30); const t0 = w0 - f0.p.ward + (f0.p.hpMax - f0.p.hp), t1 = w1 - f1.p.ward + (f1.p.hpMax - f1.p.hp); ok(Math.abs(t1 / t0 - 0.8) < 0.03, '보호막이 있으면 받는 피해 −20%: ×' + (t1 / t0).toFixed(3)); }
// 방어 중 받는 피해 −N% 더 (u_guardRed)
{ const mk = af => { const f = fightA('assassin', af, { slot: 'armor', base: 'leather' }); f.p.guard = 1; return f; }; const f0 = mk(null), f1 = mk([['guardRed', 10]]); enemyHit(f0, f0.es[0], 40); enemyHit(f1, f1.es[0], 40);
  const t0 = f0.p.hpMax - f0.p.hp, t1 = f1.p.hpMax - f1.p.hp; ok(t0 > 0 && Math.abs(t1 / t0 - 0.9) < 0.04, '방어 중 받는 피해 −10% 더: ×' + (t1 / t0).toFixed(3)); }
// 흘리기로 줄이는 피해 +N%p (u_parryRed)
{ const pr = R_('parryRed'); const a = pr(fightA('assassin', null, { slot: 'armor', base: 'leather' }).p), b = pr(fightA('assassin', [['parryRed', 15]], { slot: 'armor', base: 'leather' }).p); ok(Math.abs(b - a - 0.15) < 1e-9 || b === 0.9, '흘리기로 줄이는 피해 +15%p: ' + a.toFixed(2) + ' → ' + b.toFixed(2)); }
// 라운드마다 스태미나 +N (stam, round)
{ const f = fightA('warden', [['stRegen', 5]], { slot: 'amulet', base: 'amulet' }); f.p.st = 10; H.R_('fxRun')(f.p, 'onRound', f.b, f.p); ok(f.p.st === 15, '라운드마다 스태미나 +5'); }
// 생명력 플라스크 회복 +N%p (heal)
{ const fh = R_('flaskHealFrac'); const a = fh(fightA('warden', null, { slot: 'flask', base: 'flask' }).p), b = fh(fightA('warden', [['heal', 15]], { slot: 'flask', base: 'flask' }).p); ok(Math.abs(b - a - 0.15) < 1e-9, '플라스크 회복 +15%p: ' + a.toFixed(2) + ' → ' + b.toFixed(2)); }
// 플라스크 칸 +1 (cap)
{ const fc = R_('flaskCap'); const a = fc(fightA('warden', null, { slot: 'flask', base: 'flask' }).p, 'life'), b = fc(fightA('warden', [['flaskSlot', 1]], { slot: 'flask', base: 'flask' }).p, 'life'); ok(b - a === 1, '플라스크 칸 +1'); }
// [꼬리표] 스킬 유산 −1(내 차례에 한 번) (u_costOnce): 파수꾼 개기식(광역)
{ const mk = af => fightA('warden', af, { slot: 'gloves', base: 'gauntlet', act: ['f_sweep'] }); const ca = R_('skCostAt'), s = R_('SK2').f_sweep;
  const a = ca(mk(null).b, s).c, f = mk([['costOnce_광역', 1]]), b = ca(f.b, s).c; f.b.condUsed = { g8co: f.b.ysR || 0 }; const c = ca(f.b, s).c; ok(b === Math.max(1, a - 1) && c === a, '광역 스킬 유산 −1(내 차례에 한 번): ' + a + ' → ' + b + ', 쓴 뒤 ' + c); }
// 갈래 스킬 피해 +N% (br:)
{ const mk = af => fightA('warden', af, { slot: 'gloves', base: 'gauntlet', act: ['f_sweep'] }); const a = dmgOf(mk(null), 'f_sweep'), b = dmgOf(mk([['wd_br_line', 40]]), 'f_sweep'); ok(Math.abs(b / a - 1.4) < 0.03, '전열 장악 스킬 피해 +40%: ×' + (b / a).toFixed(3)); }
// 마력탄이 거는 상태 +1 (u_boltSt)
{ const mk = af => fightA('elementalist', af, { base: 'staff' }); const f0 = mk(null), f1 = mk([['el_boltSt', 1]]); act(f0, 'e5_bolt'); act(f1, 'e5_bolt'); ok(st(f1.es[0], 'ignite') - st(f0.es[0], 'ignite') === 1, '마력탄이 거는 상태 +1(화상 ' + st(f0.es[0], 'ignite') + ' → ' + st(f1.es[0], 'ignite') + ')'); }
// 영웅 축: 공격 태세 중 기본 공격 피해 +N (hitAdd · 조건 stance:atk)
{ const mk = af => { const f = fightA('warden', af); f.p.wdSt = Object.assign(f.p.wdSt || {}, { atk: 1 }); return f; }; const a = dmgOf(mk(null), 'basic'), b = dmgOf(mk([['wd_ax_astance', 4]]), 'basic'); ok(b - a > 3, '진격의(공격 태세 중 기본 공격 피해 +4): ' + a.toFixed(1) + ' → ' + b.toFixed(1)); }
/* M7-3 장비 보충(만든 사람 확정 10월 22일): 플라스크 접사 셋 · 계승(전투의 첫 스킬은 유산 −1) */
const fl = (af, o) => fightA('warden', af, Object.assign({ slot: 'flask', base: 'flask' }, o || {}));
// 마시면 다음 해로운 상태 한 번을 막는다(막음 1)
{ const a = fl(null), b = fl([['flaskBlock', 1]]); for (const f of [a, b]) { act(f, 'flaskL'); E.addS(f.b, f.p, 'bleed', 3); } ok(st(a.p, 'bleed') === 3 && st(b.p, 'bleed') === 0, '플라스크 막기: 마신 뒤 출혈 3을 막음(' + st(a.p, 'bleed') + ' → ' + st(b.p, 'bleed') + ')'); }
// 생명력 30% 이하에서 마시면 회복 +N%p
{ const heal = (af, fr) => { const f = fl(af); f.p.hp = Math.round(f.p.hpMax * fr); const h0 = f.p.hp; act(f, 'flaskL'); return (f.p.hp - h0) / f.p.hpMax; };
  const lo = heal([['flaskLow', 20]], 0.25) - heal(null, 0.25), hi = heal([['flaskLow', 20]], 0.6) - heal(null, 0.6); ok(Math.abs(lo - 0.2) < 0.02 && Math.abs(hi) < 1e-9, '플라스크 궁지: 30% 이하에서 회복 +20%p(' + (100 * lo).toFixed(1) + ' · 60%에서 ' + (100 * hi).toFixed(1) + ')'); }
// 마신 뒤 다음 공격 피해 +N%(그 행동만)
{ const two = af => { const f = fl(af); act(f, 'flaskL'); return [dmgOf(f, 'basic'), dmgOf(f, 'basic')]; }; const a = two(null), b = two([['flaskWrath', 30]]);
  ok(Math.abs(b[0] / a[0] - 1.3) < 0.02 && Math.abs(b[1] / a[1] - 1) < 0.02, '플라스크 객기: 다음 공격 +30%, 그다음은 그대로(×' + (b[0] / a[0]).toFixed(3) + ' · ×' + (b[1] / a[1]).toFixed(3) + ')'); }
// 전투의 첫 스킬은 유산 −1(바닥 1), 둘째 스킬부터 그대로
{ const ca = R_('skCostAt'), sk = E.SK2.w_shieldhit; const a = fightA('warden', null, { slot: 'amulet', base: 'amulet' }), b = fightA('warden', [['ysStart', 1]], { slot: 'amulet', base: 'amulet' });
  const c0 = ca(a.b, sk).c, c1 = ca(b.b, sk).c; R_('ysSpend')(b.b, sk); const c2 = ca(b.b, sk).c; ok(c0 === 2 && c1 === 1 && c2 === 2, '계승: 첫 스킬 유산 ' + c0 + ' → ' + c1 + ', 둘째는 ' + c2); }
// 스위치를 끄면(GEAR8.on = false) 새 장비는 들지 않는다 — 기존 장비 길 그대로
{ R_('GEAR8.on = false'); const f = H.fight('warden', {}); ok(!f.p.g8 && !f.p.g8u, '스위치 끔: p.g8 없음'); R_('GEAR8.on = true'); }
console.log('affix-check: ' + H.C.n + '개 통과 · 실패 ' + H.C.fail.length); for (const m of H.C.fail) console.log('  실패: ' + m); if (H.C.fail.length) process.exit(1);
