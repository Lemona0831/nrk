// 소모품 · 각인 · 장비 문장의 숫자를 코드 값과 대조한다 (tools/helpcheck.js 모듈, 출처 이름은 items- 로 시작)
//   items-cons    : 06a2/data/consumables.js의 소모품 효과 문장(일반 · 고급 값 둘 다). consApply를 실제 전투에서 돌려 얻은 수치와 대조
//   items-consmsg : consApply가 전투 기록에 남기는 숫자 문장
//   items-awk     : 06a2/data/awakening.js 각인 문장. IFX_AWK 효과 함수를 흉내 낸 상황에서 불러 얻은 값과 대조
//   items-equip   : 장비(ITEMS 전체: items.js 예전 25 + items_ch1 · ch2 · ch3)의 act · cost 문장. 문장의 숫자를 효과 표(IFX)의 숫자에서 찾고(자동),
//                   IFX 밖 엔진에 박힌 예전 장비 28종은 엔진 소스의 해당 줄을 찾아 대조한다(HAND)
//   items-ui      : 상점 · 가방 화면의 고정 문장 가운데 장비와 얽힌 숫자
// 장비 자동 대조는 "문장의 숫자(또는 그 퍼센트 · 곱 · 절반 꼴)가 그 장비 효과 코드 안에 숫자 그대로 있는가"를 본다. 효과가 실제로 일어나는지는 tools/itemcheck.js와 item3check.js가 따로 본다.
const vm = require('vm'), path = require('path');
module.exports = function (api) {
  const E = api.E, ctx = api.ctx;
  const PS = require('./pagesrc.js'); const SRC = PS.pageScript(path.join(api.ROOT, '06a2'));
  const split = t => String(t).split(/(?<=[.?!])\s+(?=\S)/).map(s => s.trim()).filter(Boolean);
  const hasNum = s => /\d/.test(s.replace(/[1-3]\s*챕터/g, '').replace(/[1-3]\s*·\s*[1-3]\s*챕터/g, ''));
  const rd = v => Math.round(v * 1e6) / 1e6;
  const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
  const srcHas = s => SRC.includes(s);

  // ---------- 측정 도구 (게임 코드 안에서 돈다)
  vm.runInContext(`
function __hcMk() { const sk = Object.keys(skillMap('hunter')).slice(0, 3); const p = mkPlayer('hunter', {}, { str: 2, dex: 2, int: 2 }, sk); const b = roomBattle(p, ROOMS[0], 'mother', 5); return { p, b, run: { p, doors: [], dg: {}, room: 0 } }; }
function __hcS(u, k, n) { u.s[k] = { stacks: n, until: 9999, dur: 9999 }; }
function __hcCons() {
  const o = {}; let X;
  const heal = (id, g) => { X = __hcMk(); X.p.hp = 1; if (X.p.s) X.p.s.ignite = { stacks: 2, until: 9999, dur: 9999 }; consApply(X.b, X.run, { id, g }, null); return (X.p.hp - 1) / X.p.hpMax; };
  o.herb = [heal('herb', 'n'), heal('herb', 'm')]; o.bread = [heal('bread', 'n'), heal('bread', 'm')]; o.sap = [heal('sap', 'n'), heal('sap', 'm')]; o.sapIgn = (() => { X = __hcMk(); X.p.hp = 1; __hcS(X.p, 'ignite', 3); consApply(X.b, X.run, { id: 'sap', g: 'n' }, null); return st(X.p, 'ignite'); })();
  o.healMul = (() => { X = __hcMk(); return healMul(X.p); })();
  o.leaf = (() => { X = __hcMk(); X.p.st = 0; consApply(X.b, X.run, { id: 'leaf', g: 'n' }, null); return X.p.st; })();
  const aoe = g => { X = __hcMk(); const h0 = X.b.en.map(e => e.hp); consApply(X.b, X.run, { id: 'relic', g }, null); return X.b.en.map((e, i) => h0[i] - e.hp); };
  o.relic = [aoe('n'), aoe('m')]; o.lv = (() => { X = __hcMk(); return X.b.ctx.lv || 1; })(); o.lvMul = (() => { X = __hcMk(); return consLvMul(X.b); })();
  const dart = g => { X = __hcMk(); const t = X.b.en[0]; const h = t.hp; consApply(X.b, X.run, { id: 'dagger', g }, t); return h - t.hp; };
  o.dagger = [dart('n'), dart('m')];
  const brk = (id, g) => { X = __hcMk(); const t = X.b.en[0]; const b0 = t.brk; consApply(X.b, X.run, { id, g }, t); return t.brk - b0; };
  o.flash = [brk('flash', 'n'), brk('flash', 'm')]; o.pick = brk('pick', 'n');
  X = __hcMk(); consApply(X.b, X.run, { id: 'whet', g: 'n' }, null); o.whet = X.p.whet;
  X = __hcMk(); { const t = X.b.en[0]; consApply(X.b, X.run, { id: 'chalk', g: 'n' }, t); o.chalk = t.markDmg; }
  X = __hcMk(); consApply(X.b, X.run, { id: 'charm', g: 'n' }, null); o.charm = X.p.nextRed;
  X = __hcMk(); consApply(X.b, X.run, { id: 'oiljar', g: 'n' }, null); o.oil = X.b.en.map(e => st(e, 'ignite'));
  X = __hcMk(); __hcS(X.p, 'weak', 3); __hcS(X.p, 'bleed', 2); consApply(X.b, X.run, { id: 'mugwort', g: 'n' }, null); o.mug = [st(X.p, 'weak'), st(X.p, 'bleed')];
  X = __hcMk(); X.b.en.forEach(e => { e.under = 1; }); consApply(X.b, X.run, { id: 'tamper', g: 'n' }, null); o.tamper = X.b.en.map(e => st(e, 'vuln'));
  X = __hcMk(); { const t = X.b.en[0]; consApply(X.b, X.run, { id: 'frostmoss', g: 'n' }, t); o.slow = st(t, 'chill'); }
  X = __hcMk(); X.b.heat = 60; consApply(X.b, X.run, { id: 'awning', g: 'n' }, null); o.cool = 60 - X.b.heat;
  o.turn = (() => { X = __hcMk(); return consTurnOf(X.p); })();
  return JSON.stringify(o);
}
function __hcAwk() {
  const A = IFX_AWK, o = {};
  const f = fn => { const X = __hcMk(); X.b.actN = 1; return fn(X.b, X.p, X.b.en[0], X); };
  o.breath = f((b, p) => { A.a_breath.onStart(b, p); return st(p, 'protect'); });
  o.vigor = f((b, p, e, X) => { p.hp = 1; A.a_vigor.onWin(X.run); return (p.hp - 1) / p.hpMax; });
  o.pouch = f((b, p) => { const a = consTurnOf(p); p.awk = ['a_pouch']; return [a, consTurnOf(p)]; });
  o.gap = f((b, p, e) => { A.a_gap.onStart(b, p); const z = A.a_gap.brk(b, p); A.a_gap.onKill(b, p, e); return [z, A.a_gap.brk(b, p)]; });
  o.flow = f((b, p) => { const id = p.skills[0]; p.cd = {}; p.cd[id] = 3; A.a_flow.onParry(b, p, { intent: { k: 'heavy' } }); return 3 - p.cd[id]; });
  o.flowSmall = f((b, p) => { const id = p.skills[0]; p.cd = {}; p.cd[id] = 3; A.a_flow.onParry(b, p, { intent: { k: 'attack' } }); return 3 - p.cd[id]; });
  o.skin = A.a_skin.inP(); o.eye = A.a_eye.hitP(); o.smolder = A.a_smolder.dotP(); o.shell = A.a_shell.wardP(); o.clear = A.a_clear.blockAdd();
  o.gulp = A.a_gulp.stamMul; o.iron = A.a_iron.hpMul; o.light = A.a_light.regen; o.purse = A.a_purse.goldMul; o.heavyhand = A.a_heavyhand.brkMul(); o.brew = A.a_brew.heal; o.memory = A.a_memory.spring;
  o.warmth = f((b, p, e) => { p.hp = 1; A.a_warmth.onKill(b, p, e); return (p.hp - 1) / p.hpMax; });
  o.ember = f((b, p) => { p.hp = p.hpMax * 0.3; const on = A.a_ember.hitP(b, p); p.hp = p.hpMax * 0.31; return [on, A.a_ember.hitP(b, p)]; });
  o.stand = f((b, p, e) => [A.a_stand.inP(b, p, { src: { elite: 1 } }), A.a_stand.inP(b, p, { src: { role: 'boss' } }), A.a_stand.inP(b, p, { src: {} }), A.a_stand.inP(b, p, { dot: 1, src: { elite: 1 } })]);
  o.point = f((b, p, e) => [A.a_point.hitP(b, p, e, { single: 1 }, { skill: 1 }), A.a_point.hitP(b, p, e, { aoe: 1 }, { skill: 1 })]);
  o.scatter = f((b, p, e) => [A.a_scatter.hitP(b, p, e, { aoe: 1 }), A.a_scatter.hitP(b, p, e, {})]);
  const two = (id, mk, hook) => f((b, p, e) => { const r = []; for (const on of [true, false]) { mk(b, p, e, on); r.push(A[id][hook || 'hitP'](b, p, e, {}, mk.c)); } return r; });
  const stk = (u, k, n) => { if (n) __hcS(u, k, n); else delete u.s[k]; };
  o.as1 = [3, 2].map(n => f((b, p, e) => { stk(e, 'poison', n); return A.k_as1.hitP(b, p, e); }));
  o.as2 = f((b, p, e) => [A.k_as2.hitP(b, p, e, {}, { id: 'x', s: { fx: [{ k: 'burst' }] } }), A.k_as2.hitP(b, p, e, {}, { id: 'x', s: { fx: [{ k: 'drain' }] } }), A.k_as2.hitP(b, p, e, {}, { id: 'x', s: { fx: [{ k: 'dmg' }] } })]);
  o.as3 = f((b, p) => { p.st = 0; A.k_as3.onParry(b, p); return p.st; });
  o.wd1 = f((b, p, e) => { p.ward = 5; const a = A.k_wd1.hitP(b, p, e); p.ward = 0; return [a, A.k_wd1.hitP(b, p, e)]; });
  o.wd2 = f((b, p, e) => { __hcS(e, 'broken', 1); const a = A.k_wd2.hitP(b, p, e); delete e.s.broken; return [a, A.k_wd2.hitP(b, p, e)]; });
  o.wd3 = f((b, p, e) => { e.row = 'front'; const a = A.k_wd3.hitP(b, p, e); e.row = 'back'; return [a, A.k_wd3.hitP(b, p, e)]; });
  o.hn1 = f((b, p, e) => { p.focus = { id: e.id, n: 1 }; const a = A.k_hn1.hitP(b, p, e); p.focus = null; return [a, A.k_hn1.hitP(b, p, e)]; });
  o.hn2 = f((b, p, e) => [A.k_hn2.hitP(b, p, e, {}, { id: 'basic' }), A.k_hn2.hitP(b, p, e, {}, { id: 'heavy' })]);
  o.hn3 = f((b, p) => { p.st = 0; A.k_hn3.onEvade(b, p); return p.st; });
  o.el1 = [3, 2].map(n => f((b, p, e) => { stk(e, 'ignite', n); return A.k_el1.hitP(b, p, e); }));
  o.el2 = f((b, p, e) => { stk(e, 'chill', 1); const a = A.k_el2.brk(b, p, e); stk(e, 'chill', 0); return [a, A.k_el2.brk(b, p, e)]; });
  o.el3 = f((b, p) => { p.st = 0; A.k_el3.onShock(b, p); return p.st; });
  o.sb1 = f((b, p, e) => { stk(e, 'bleed', 2); const a = A.k_sb1.hitP(b, p, e); stk(e, 'bleed', 0); return [a, A.k_sb1.hitP(b, p, e)]; });
  o.sb2 = A.k_sb2.dotP(); o.sb3 = A.k_sb3.wardP();
  o.mk1 = f((b, p, e) => [A.k_mk1.hitP(b, p, e, {}, { id: 'heavy' }), A.k_mk1.hitP(b, p, e, {}, { id: 'basic' })]);
  o.mk2 = f((b, p) => { p.guard = 1; const a = A.k_mk2.inP(b, p, {}); p.guard = 0; return [a, A.k_mk2.inP(b, p, {})]; });
  o.mk3 = f((b, p, e) => { stk(e, 'chill', 1); const a = A.k_mk3.hitP(b, p, e); stk(e, 'chill', 0); return [a, A.k_mk3.hitP(b, p, e)]; });
  o.bu1 = f((b, p, e) => { stk(e, 'bleed', 2); const a = A.k_bu1.hitP(b, p, e); stk(e, 'bleed', 0); return [a, A.k_bu1.hitP(b, p, e)]; });
  o.bu2 = f((b, p) => { p.hp = p.hpMax * 0.5; const a = A.k_bu2.hitP(b, p); p.hp = p.hpMax * 0.51; return [a, A.k_bu2.hitP(b, p)]; });
  o.bu3 = f((b, p, e) => { p.hp = 1; A.k_bu3.onKill(b, p, e); return (p.hp - 1) / p.hpMax; });
  o.cf1 = f((b, p) => { p.hp = 1; A.k_cf1.onCleanse(b, p, 1); return (p.hp - 1) / p.hpMax; });
  o.cf2 = f((b, p, e) => { stk(e, 'weak', 1); const a = A.k_cf2.hitP(b, p, e); stk(e, 'weak', 0); return [a, A.k_cf2.hitP(b, p, e)]; });
  o.cf3 = f((b, p) => { stk(p, 'weak', 1); const a = A.k_cf3.inP(b, p, {}); stk(p, 'weak', 0); return [a, A.k_cf3.inP(b, p, {})]; });
  o.bm1 = f((b, p, e) => { stk(e, 'poison', 1); const a = A.k_bm1.hitP(b, p, e); stk(e, 'poison', 0); return [a, A.k_bm1.hitP(b, p, e)]; });
  o.bm2 = A.k_bm2.bHealP();
  o.bm3 = f((b, p) => { p.hp = p.hpMax * 0.7; const a = A.k_bm3.hitP(b, p); p.hp = p.hpMax * 0.71; return [a, A.k_bm3.hitP(b, p)]; });
  o.gcf2 = f((b, p) => { p.hp = 1; b.ctx.ch = 2; A.g_cf2.onSkill(b, p); const a = (p.hp - 1) / p.hpMax; p.hp = 1; b.ctx.ch = 1; A.g_cf2.onSkill(b, p); return [a, (p.hp - 1) / p.hpMax]; });
  o.spring = 0.5 * (1 + A.a_memory.spring);
  return JSON.stringify(o);
}
function __hcBlob(k) { return JSON.stringify(IFX[k], (kk, v) => typeof v === 'function' ? v.toString() : v) || ''; }
`, ctx);
  const CM = JSON.parse(E('__hcCons()')), AM = JSON.parse(E('__hcAwk()'));

  // ---------- 소모품
  const CONS = E('JSON.stringify(Object.keys(CONS).map(k => ({ k, v: CONS[k].v, vm: CONS[k].vm, d: CONS[k].d(CONS[k].v), dm: CONS[k].vm != null ? CONS[k].d(CONS[k].vm) : null })))');
  const consRows = [];
  for (const c of JSON.parse(CONS)) { consRows.push({ id: c.k, text: c.d }); if (c.dm != null) consRows.push({ id: c.k + ':고급', text: c.dm }); }
  api.source('items-cons', consRows);
  const C = (find, ev, fn) => api.add('items-cons', find, ev, fn);
  const lvM = CM.lv, lvK = CM.lvMul; // 1레벨 전투에서 consLvMul은 1
  C('최대 생명력의 12%를 회복합니다.', 'consApply heal: 약초 v 0.12 → 생명력 비율 ' + CM.herb[0].toFixed(3), () => near(CM.herb[0], 0.12) && E('CONS.herb.v') === 0.12);
  C('최대 생명력의 20%를 회복합니다.', 'heal: 약초 고급 vm와 마른 빵 v (소수 비율 0.2)', () => near(CM.herb[1], 0.2) && near(CM.bread[0], 0.2));
  C('최대 생명력의 30%를 회복합니다.', 'heal: 마른 빵 고급 vm 0.3', () => near(CM.bread[1], 0.3));
  C('스태미나 +30.', 'consApply stam: 각성 잎 v 30 → 스태미나 +' + CM.leaf, () => CM.leaf === 30);
  C('적 모두에게 피해 8.', 'consApply aoe: 1레벨 전투에서 적마다 −' + CM.relic[0].join(','), () => lvK === 1 && CM.relic[0].every(x => near(x, 8, 0.01)));
  C('적 모두에게 피해 13.', 'aoe 고급: 적마다 −' + CM.relic[1].join(','), () => lvK === 1 && CM.relic[1].every(x => near(x, 13, 0.01)));
  C('한 적에게 피해 12.', 'consApply dart: 투척 단검 −' + CM.dagger[0], () => near(CM.dagger[0], 12, 0.01));
  C('한 적에게 피해 20.', 'dart 고급: −' + CM.dagger[1], () => near(CM.dagger[1], 20, 0.01));
  C('한 적에게 붕괴 +30.', 'consApply brk: 섬광 가루 붕괴 +' + CM.flash[0].toFixed(1) + '(스탯 배율 포함)', () => near(CM.flash[0], 30, 30 * 0.03));
  C('한 적에게 붕괴 +45.', 'brk 고급: 붕괴 +' + CM.flash[1].toFixed(1), () => near(CM.flash[1], 45, 45 * 0.03));
  C('다음 공격 피해 +25%.', 'p.whet=0.25 · hurtEnemy d *= 1 + p.whet', () => near(CM.whet, 0.25) && srcHas('if (!o.dot && b.cur && b.p.whet) { d *= 1 + b.p.whet; b.p.whet = 0; }'));
  C('한 적이 받는 다음 피해 +30%.', 'e.markDmg=0.3 · hurtEnemy d *= 1 + e.markDmg', () => near(CM.chalk, 0.3) && srcHas('if (!o.dot && e.markDmg) { d *= 1 + e.markDmg; e.markDmg = 0; }'));
  C('다음에 받는 공격 하나의 피해 −40%.', 'p.nextRed=0.4 · hurtPlayer d *= 1 − p.nextRed', () => near(CM.charm, 0.4) && srcHas('if (!o.dot && o.src && p.nextRed) { d *= 1 - p.nextRed; p.nextRed = 0; }'));
  C('적 모두에게 화상 2를 겁니다.', 'burnpiles: 적 모두 화상 ' + CM.oil.join(','), () => CM.oil.length > 0 && CM.oil.every(x => x === 2));
  C('종류마다 1씩 줄어듭니다.', 'trim: 약화 3→' + CM.mug[0] + ', 출혈 2→' + CM.mug[1], () => CM.mug[0] === 2 && CM.mug[1] === 1);
  C('끌려 나온 적은 취약 1을 받습니다.', 'unearth: 취약 ' + CM.tamper.join(','), () => CM.tamper.every(x => x === 1));
  C('뼈벽 하나에 붕괴 30을 줍니다.', 'wallbreak addBreak 30 → 붕괴 +' + CM.pick.toFixed(1), () => near(CM.pick, 30, 30 * 0.03));
  C('한 적에게 둔화 2를 겁니다.', 'slow: 둔화 ' + CM.slow, () => CM.slow === 2);
  C('이 전투의 열기를 30 내립니다.', 'cool: 열기 60 → ' + (60 - CM.cool), () => CM.cool === 30 && E('CONS.awning.v') === 30);
  C('최대 생명력의 8%를 회복하고 화상을 모두 지웁니다.', 'healcure: 선인장 수액 v 0.08, 화상 3 → ' + CM.sapIgn, () => near(CM.sap[0], 0.08) && CM.sapIgn === 0);
  C('최대 생명력의 12%를 회복하고 화상을 모두 지웁니다.', 'healcure 고급 vm 0.12', () => near(CM.sap[1], 0.12));
  api.note('items-cons', '레벨이 오를수록', '레벨 배율은 1.15 꼴이 아닌 설명(숫자 없음)');

  // 전투 기록 문장 (consApply가 남김)
  const msgs = [['burnpiles', '적 모두 화상 2'], ['trim', '해로운 상태가 종류마다 1씩 준다'], ['wallbreak', '에게 붕괴 +30'], ['slow', '에게 둔화 2']];
  api.source('items-consmsg', msgs.map(([k, t]) => ({ id: k, text: SRC.includes(t) ? t : '(소스에 없음) ' + t })));
  api.add('items-consmsg', '적 모두 화상 2', 'consApply burnpiles addS ignite 2', () => CM.oil.every(x => x === 2) && srcHas("addS(b, e, 'ignite', 2); return '뼈 더미 '"));
  api.add('items-consmsg', '종류마다 1씩 준다', 'consApply trim kwDec 1', () => CM.mug[0] === 2 && CM.mug[1] === 1);
  api.add('items-consmsg', '붕괴 +30', 'consApply wallbreak addBreak 30', () => near(CM.pick, 30, 1) && srcHas("addBreak(b, tgt, 30); return tgt.n + '에게 붕괴 +30'"));
  api.add('items-consmsg', '둔화 2', 'consApply slow addS chill 2', () => CM.slow === 2);

  // ---------- 각인
  const awk = JSON.parse(E('JSON.stringify(AWK_LIST.concat(AWK_GIFT).map(a => ({ id: a.id, d: a.d })))'));
  api.source('items-awk', awk.map(a => ({ id: a.id, text: a.d })));
  const W = (find, ev, fn) => api.add('items-awk', find, ev, fn);
  const A = AM;
  W('보호 1을 얻습니다', 'a_breath onStart addS protect 1 → ' + A.breath, () => A.breath === 1);
  W('방을 이기면 최대 생명력의 4%를 회복', 'a_vigor onWin 0.04 → ' + A.vigor.toFixed(3), () => near(A.vigor, 0.04));
  W('한 차례에 4개까지', 'consTurnOf: CONS_TURN ' + E('CONS_TURN') + ' → a_pouch 후 ' + A.pouch[1], () => A.pouch[0] === E('CONS_TURN') && A.pouch[1] === 4);
  W('붕괴가 5 늘어납니다', 'a_gap onKill awkBrk 5 → brk() ' + A.gap[1], () => A.gap[0] === 0 && A.gap[1] === 5);
  W('쿨타임이 가장 많이 남은 스킬 하나가 1 짧아집니다', 'a_flow onParry fxCdMax: 큰 공격 −' + A.flow + ', 평소 공격 −' + A.flowSmall, () => A.flow === 1 && A.flowSmall === 0);
  W('받는 피해가 4% 줄어듭니다', 'a_skin inP 0.04', () => near(A.skin, 0.04));
  W('주는 직접 피해가 5% 늘어납니다', 'a_eye hitP 0.05', () => near(A.eye, 0.05));
  W('내가 건 지속 피해가 10% 늘어납니다', 'a_smolder · k_sb2 dotP 0.10', () => near(A.smolder, 0.1) && near(A.sb2, 0.1));
  W('얻는 보호막이 12% 늘어납니다', 'a_shell · k_sb3 wardP 0.12', () => near(A.shell, 0.12) && near(A.sb3, 0.12));
  W('막음이 1 늘어납니다', 'a_clear blockAdd 1 (기본 막음 2)', () => A.clear === 1 && srcHas('const nb = 2 + fxAdd(p, \'blockAdd\', p)'));
  W('회복이 20% 늘어납니다', 'a_gulp stamMul 1.2 · flaskS STAM_FLASK × stamMul', () => near(A.gulp, 1.2) && srcHas("STAM_FLASK * fxVal(p, 'stamMul', 1"));
  W('최대 생명력의 1.5%를 회복', 'a_warmth onKill 0.015 → ' + A.warmth.toFixed(4), () => near(A.warmth, 0.015));
  W('최대 생명력이 5% 늘어납니다', 'a_iron hpMul 1.05', () => near(A.iron, 1.05));
  W('스태미나가 2 더 찹니다', 'a_light regen 2 · tick p.st + ST_REGEN + regen', () => A.light === 2 && srcHas("p.st = Math.min(p.stMax, p.st + ST_REGEN + rg)"));
  W('얻는 골드가 8% 늘어납니다', 'a_purse goldMul 1.08 · gainGold', () => near(A.purse, 1.08) && srcHas("const m = fxVal(run.p, 'goldMul', 1"));
  W('주는 붕괴가 10% 늘어납니다', 'a_heavyhand brkMul 1.1', () => near(A.heavyhand, 1.1));
  W('회복이 3%p 늘어납니다', 'a_brew heal 0.03 · flaskHealFrac 합산(기본 0.3)', () => near(A.brew, 0.03) && srcHas("fxVal(p, 'heal', 0, (a, v) => a + v)"));
  W('생명력이 30% 이하이면 주는 직접 피해가 12% 늘어납니다', 'a_ember 30% 이하 → ' + A.ember.join('/'), () => near(A.ember[0], 0.12) && A.ember[1] === 0);
  W('정예 · 강적 · 보스에게서 받는 피해가 6% 줄어듭니다', 'a_stand inP 정예 ' + A.stand[0] + ' 보스 ' + A.stand[1] + ' 보통 ' + A.stand[2], () => near(A.stand[0], 0.06) && near(A.stand[1], 0.06) && A.stand[2] === 0 && A.stand[3] === 0);
  W('한 적 대상 스킬의 피해가 6% 늘어납니다', 'a_point hitP 단일 스킬 0.06', () => near(A.point[0], 0.06) && A.point[1] === 0);
  W('광역 공격의 피해가 8% 늘어납니다', 'a_scatter hitP 광역 0.08', () => near(A.scatter[0], 0.08) && A.scatter[1] === 0);
  W('샘에서 쉴 때의 회복이 40% 늘어납니다', 'a_memory spring 0.4 · 회복 0.5 × (1+0.4) = ' + A.spring, () => near(A.memory, 0.4) && srcHas("const sp = 0.5 * (1 + fxVal(p, 'spring', 0"));
  W('중독 3 이상인 적에게 주는 직접 피해가 8%', 'k_as1 중독 3 이상 ' + A.as1.join('/'), () => near(A.as1[0], 0.08) && A.as1[1] === 0);
  W('독을 터뜨리거나 먹는 스킬의 피해가 10%', 'k_as2 burst · drain 0.10', () => near(A.as2[0], 0.1) && near(A.as2[1], 0.1) && A.as2[2] === 0);
  W('흘리기에 성공하면 스태미나가 6 찹니다', 'k_as3 onParry fxStam 6 → ' + A.as3, () => A.as3 === 6);
  W('보호막이 있으면 주는 직접 피해가 8%', 'k_wd1 ' + A.wd1.join('/'), () => near(A.wd1[0], 0.08) && A.wd1[1] === 0);
  W('무너진 적에게 주는 직접 피해가 10%', 'k_wd2 ' + A.wd2.join('/'), () => near(A.wd2[0], 0.1) && A.wd2[1] === 0);
  W('전열 적에게 주는 직접 피해가 6%', 'k_wd3 ' + A.wd3.join('/'), () => near(A.wd3[0], 0.06) && A.wd3[1] === 0);
  W('추적 중인 적에게 주는 직접 피해가 8%', 'k_hn1 ' + A.hn1.join('/'), () => near(A.hn1[0], 0.08) && A.hn1[1] === 0);
  W('기본 공격의 피해가 10%', 'k_hn2 ' + A.hn2.join('/'), () => near(A.hn2[0], 0.1) && A.hn2[1] === 0);
  W('몸을 빼 피하면 스태미나가 6 찹니다', 'k_hn3 onEvade fxStam 6 → ' + A.hn3, () => A.hn3 === 6);
  W('화상 3 이상인 적에게 주는 직접 피해가 8%', 'k_el1 화상 3 이상 ' + A.el1.join('/'), () => near(A.el1[0], 0.08) && A.el1[1] === 0);
  W('둔화된 적에게 주는 붕괴가 4 늘어납니다', 'k_el2 brk 4 ' + A.el2.join('/'), () => A.el2[0] === 4 && A.el2[1] === 0);
  W('열충격이 일어나면 스태미나가 6 찹니다', 'k_el3 onShock fxStam 6 → ' + A.el3, () => A.el3 === 6);
  W('출혈된 적에게 주는 직접 피해가 6% 늘어납니다', 'k_sb1 · k_bu1 hitP 0.06', () => near(A.sb1[0], 0.06) && A.sb1[1] === 0 && near(A.bu1[0], 0.06) && A.bu1[1] === 0);
  W('강공격의 피해가 8% 늘어납니다', 'k_mk1 heavy 0.08', () => near(A.mk1[0], 0.08) && A.mk1[1] === 0);
  W('방어하는 동안 받는 피해가 4% 줄어듭니다', 'k_mk2 inP 0.04 (방어 중)', () => near(A.mk2[0], 0.04) && A.mk2[1] === 0);
  W('둔화된 적에게 주는 직접 피해가 6% 늘어납니다', 'k_mk3 hitP 0.06', () => near(A.mk3[0], 0.06) && A.mk3[1] === 0);
  W('생명력이 절반 이하이면 주는 직접 피해가 8%', 'k_bu2 50% 이하 ' + A.bu2.join('/'), () => near(A.bu2[0], 0.08) && A.bu2[1] === 0);
  W('적을 쓰러뜨리면 최대 생명력의 2%를 회복', 'k_bu3 onKill 0.02 → ' + A.bu3.toFixed(4), () => near(A.bu3, 0.02));
  W('해로운 상태를 지우면 최대 생명력의 2%를 회복', 'k_cf1 onCleanse 0.02 → ' + A.cf1.toFixed(4), () => near(A.cf1, 0.02));
  W('해로운 상태가 걸린 적에게 주는 직접 피해가 6%', 'k_cf2 ' + A.cf2.join('/'), () => near(A.cf2[0], 0.06) && A.cf2[1] === 0);
  W('내게 해로운 상태가 걸려 있으면 받는 피해가 4%', 'k_cf3 ' + A.cf3.join('/'), () => near(A.cf3[0], 0.04) && A.cf3[1] === 0);
  W('중독된 적에게 주는 직접 피해가 6%', 'k_bm1 ' + A.bm1.join('/'), () => near(A.bm1[0], 0.06) && A.bm1[1] === 0);
  W('흡혈과 먹기로 얻는 회복이 10% 늘어납니다', 'k_bm2 bHealP 0.10', () => near(A.bm2, 0.1));
  W('생명력이 70% 이하이면 주는 직접 피해가 6%', 'k_bm3 70% 이하 ' + A.bm3.join('/'), () => near(A.bm3[0], 0.06) && A.bm3[1] === 0);
  W('스킬을 쓸 때마다 최대 생명력의 1.2%를 회복', 'g_cf2 onSkill 2챕터 0.012 → ' + A.gcf2.map(x => x.toFixed(4)).join('/'), () => near(A.gcf2[0], 0.012) && A.gcf2[1] === 0);

  // ---------- 장비
  const ITEMS = JSON.parse(E('JSON.stringify(Object.keys(ITEMS).map(k => ({ k, act: ITEMS[k].act || "", cost: ITEMS[k].cost || "", ifx: !!IFX[k], off: V2_OFF.includes(k) })))'));
  const rows = [], sent = {}; // 문장 → 가진 장비
  for (const it of ITEMS) for (const part of ['act', 'cost']) { const t = it[part]; if (!t) continue; rows.push({ id: it.k + ':' + part, text: t }); sent[it.k] = (sent[it.k] || []).concat(split(t)); }
  api.source('items-equip', rows);
  const numsOf = s => [...s.replace(/[1-3]\s*챕터/g, '').matchAll(/\d+(?:\.\d+)?/g)].map(m => +m[0]);
  const lits = s => { const o = new Set(); for (const m of s.matchAll(/\d+(?:\.\d+)?/g)) o.add(rd(+m[0])); return o; };
  const blob = {}; const blobOf = k => blob[k] || (blob[k] = lits(E('__hcBlob(' + JSON.stringify(k) + ')')));
  const candOf = n => [n, n / 100, 1 - n / 100, 1 + n / 100, n / 10, 100 / n].map(rd); // 12% → 0.12 · 0.88 · 1.12, 1/10 단위, 20%마다 → 곱 5
  const withProducts = L => { const a = [...L]; const o = new Set(L); for (const x of a) for (const y of a) o.add(rd(x * y)); return o; }; // 한 번 4% × 최대 3번 = 최대 12% 같은 꼴
  // IFX 밖(엔진에 박힌) 예전 장비: 문장의 숫자마다 소스에서 찾을 줄 (모두 06a2/js)
  const HAND = {
    twinblades: ["const hd = outDmg(b, heavyBase(p), { weapon: 1 }) * 0.6;", "twinblades: { cost: (p, id) => id === 'heavy' ? 10 : 0 }"],
    hook: ["p.eq.weapon === 'hook' && o.weapon) d *= 0.85"],
    plate: ["p.eq.armor === 'plate' && !o.dot) p.counter += d * 0.3", "p.eq.armor === 'plate' ? 0.9"],
    witness: ["(p.eq.amulet === 'witness' ? 10 : 0)"],
    chalice: ["p.eq.flask === 'chalice' ? 0.9"],
    pulse: ["(p.eq.ring1 === 'pulse' || p.eq.ring2 === 'pulse')) d *= 1.35"],
    twin: ["d * 0.5, { single: 1, melee: melee1, label: '첫 날' }", "d * 0.5, { single: 1, melee: melee1, label: '둘째 날' }", "p.eq.weapon === 'twin' ? 0.8 : 1"],
    maul: ["(p.eq.weapon === 'maul' ? 20 : 0)", "p.eq.weapon === 'maul' && isV2(p) ? 10 : 0"],
    thorns: ["p.eq.armor === 'thorns' && o.src && o.src.alive && !o.dot && o.src.row === 'front') hurtEnemy(b, o.src, 2", "p.eq.armor === 'cloak' || p.eq.armor === 'thorns' ? 0.95"],
    cloak: ["(p.eq.armor === 'cloak' ? 0.15 : 0)", "Math.min(0.9, (p.build === 'assassin'", "p.eq.armor === 'cloak' || p.eq.armor === 'thorns' ? 0.95"],
    bloodpact: ["p.eq.amulet === 'bloodpact' && p.hp < p.hpMax * 0.5) d *= 1.2", "p.eq.amulet === 'bloodpact' ? 0.85 : 1"],
    sigil: ["u.mp = Math.min(u.mpMax, u.mp + 4)", "(p.eq.amulet === 'sigil' ? 15 : 0)"],
    fury: ["hasIt(p, 'fury')) d *= 1.1", "if (p.furyNext && !o.ctr) { d *= 1.1;"],
    focusring: ["hasIt(b.p, 'focusring')) d *= o.aoe ? 0.7 : 1.07"],
    venomring: ["hasIt(p, 'venomring')) addPoison(b, tgt, 1, 1)", "(hasIt(p, 'venomring') ? 0.9 : 1)"],
    boilflask: ["outDmg(b, 5, {}), { aoe: 1, fire: 1, label: '끓는 플라스크' }", "p.eq.flask === 'boilflask' ? 0.75"],
    chaingl: ["addBreak(b, b.chainTgt, 20)", "(p.eq.gloves === 'chaingl' ? 10 : 0)"],
    ragechain: ["d *= 1 + 0.04 * p.rcN", "p.rcN = Math.min(5, (p.rcN || 0) + 1)", "p.eq.gloves === 'ragechain' ? 0.6 : 0.5"],
    markamu: ["addS(b, b.markTgt, 'vuln', 2)", "d *= 0.9; b.p.mk", "if (b.p.mk.n >= 3)"],
    resostone: ["b.echoMul *= 1.06", "hasIt(p, 'resostone') && id === p.lastSkillId ? 2 : 0"],
    wardcrest: ["p.eq.armor === 'wardcrest') d *= 0.85", "p.eq.armor === 'wardcrest' ? 0.95"],
    vpouch: ["hasIt(b.p, 'vpouch')) d *= 1.15", "(p.eq.gloves === 'vpouch' ? 10 : 0)"],
    bloodoil: ["p.eq.flask === 'bloodoil' ? 0.7 : 1", "p.eq.flask === 'bloodoil' ? 0.8"],
    rosary: ["p.mp + 3 * n", "p.eq.amulet === 'rosary' ? 0.97"],
    scarcharm: ["Math.min(10, b.p.scar * 0.15)", "Math.max(0.05, r - 0.05)"],
    echo: ["b.echoMul = 1 + 0.04 * p.echoN", "Math.min(3, (p.echoN"],
    vanguard: ["addBreak(b, b.vanguardTgt, 20)", "(p.eq.amulet === 'vanguard' ? 20 : 0)"],
    knot: ["p.eq.gloves === 'knot' && (id === 'burst' || id === 'release') ? 2 : 0", "const keep = knot ? Math.floor(n / 2) : 0"],
    ledger: ["p.hpMax * 0.04 * hpCostMul(p)"],
  };
  const PL = {};
  const verify = (k, s) => {
    const ns = numsOf(s); if (!ns.length) return true;
    if (HAND[k]) return HAND[k].every(x => srcHas(x));
    const L = PL[k] || (PL[k] = withProducts(blobOf(k))); return ns.every(n => n === 1 || candOf(n).some(v => L.has(v))); // 1은 "한 번 · 하나"라 코드에 숫자로 안 적힌 것이 있어 통과
  };
  const D = new Set(); for (const k in sent) for (const s of sent[k]) if (hasNum(s)) D.add(s);
  for (const s of D) {
    const owners = Object.keys(sent).filter(k => sent[k].some(x => x.includes(s)));
    const hand = owners.filter(k => HAND[k]).length;
    api.add('items-equip', s, '장비 ' + owners.length + '종: 숫자 ' + numsOf(s).join('·') + (hand ? ' ← 엔진 소스 줄(HAND) ' + hand + '종' : ' ← IFX 효과 값') + ' (' + owners.slice(0, 3).join(',') + (owners.length > 3 ? ' 외' : '') + ')', () => owners.every(k => verify(k, s)));
  }

  // ---------- 상점 · 가방 고정 문장
  const ui = [
    ['shop:sell', '살 때 값의 25%를 받습니다. 낀 장비는 먼저 빼야 팝니다.'],
    ['shop:respec', '능력치 다시 나누기: 나눈 N점을 거두어 처음부터 다시 나눕니다. 값은 레벨 × 10골드입니다.'],
  ];
  api.source('items-ui', ui.map(([id, t]) => ({ id, text: t })));
  api.add('items-ui', '살 때 값의 25%', 'sellOf = floor(priceOf × 0.25), 전설은 LEG_SELL ' + E('LEG_SELL') + ' 고정', () => srcHas("Math.floor(priceOf(it.g, it.ch) * 0.25)"));
  api.add('items-ui', '레벨 × 10골드', 'vShop cost = lv × 10, respec 값', () => srcHas("const cost = (run.lv || 1) * 10") && /respec[\s\S]{0,400}\(run\.lv \|\| 1\) \* 10|\(run\.lv \|\| 1\) \* 10[\s\S]{0,2000}respec/.test(SRC));
};
