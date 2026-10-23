'use strict';
/* 0.8.0 G-1 2챕터 강적 시계 점검 (js/15-chapter2.js CH2_CLOCK 다섯, 틀은 js/25). 실행: node tools/clock-ch2-check.js
   강적마다: 시계가 있다 · 답이 두 종류 이상 · 한 칸 남으면 마지막 경고 · 다 차면 파국(정한 세기) · 답마다 되감김/멈춤 · 보상 · 답 수단이 모두 막히면 멈춤.
   규칙의 뜻은 비공개 문서 참조. 실패가 있으면 1로 끝난다 */
const H = require('./uqtest/_h.js'); const { E, R_, ok } = H;
R_('ch2ClockReg')(); const FC = R_('FOE_CLOCK'), X = R_('FOE_X'), PA = R_('ch2PlayerAct');
const st = (u, k) => R_('st')(u, k);
function mk(foe, en, setup) {
  const f = H.fight('assassin', { en, hp: 400, ctx: { ch: 2, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = foe; for (const x of es) x.brkMax = 100; if (setup) setup(run, es); } });
  const b = f.b; b.cur = null; b.rngF = () => 0.5; b.fcNoWait = 1; /* 한 차례 안에서 파국까지 채워 보는 시험 */ b.ctx.ch = 2; b.ctx.mods = []; const e = f.es[0]; e.clk = null; E.fcInit(b, e); e.under = 0; e.stabOut = 0; e.thQ = 0; b.log = []; b.duel = 0; b.trade = null; const p = b.p; // 처음 runUntilPlayer에서 움직인 것은 지운다
  p.hp = p.hpMax; p.stun = 0; p.guard = 0; p.dodge = 0; p.ward = 0; p.evade = 0; for (const k of Object.keys(p.s)) delete p.s[k];
  return { f, b, e, p, run: f.run, es: f.es };
}
const act = (b, e, k) => { e.intent = { k }; e.teleTurn = -1; e.stun = 0; E.enemyAct(b, e); };
const warns = b => b.log.filter(l => /^⚠/.test(l.m)).length;
const breakIt = (b, x) => { b.cur = null; x.brk = x.brkMax - 0.5; E.addBreak(b, x, 50); };
const near = (a, x, tol) => Math.abs(a - x) <= (tol || 0.03);
const full = p => { p.hp = p.hpMax; return p.hp; };
const lost = (p, h0) => (h0 - p.hp) / p.hpMax;
const myHit = (b, t, d, o) => { b.actN = (b.actN || 0) + 1; b.cur = { id: 'basic' }; E.hurtEnemy(b, t, d, Object.assign({ single: 1 }, o || {})); b.cur = null; };
const foeHit = (b, src, raw) => { b.actN = (b.actN || 0) + 1; return E.hurtPlayer(b, raw, { src, single: 1, label: 't' }); };
function common(id) {
  const D = FC[id]; ok(!!D, id + ': 정의 없음'); if (!D) return;
  ok(new Set(D.ans || []).size >= 2, id + ': 답 종류 < 2');
  const TAGS = ['brk', 'aoe', 'ranged', 'dot', 'kill', 'parry', 'guard', 'cons', 'gold']; ok((D.ans || []).every(t => TAGS.includes(t)), id + ': 태그 ' + D.ans);
  ok(typeof D.warn === 'function' && typeof D.doom === 'function' && typeof D.blocked === 'function', id + ': warn · doom · blocked');
}
const R = {};
/* ---------- 빚 장부의 주인 ---------- */
common('ledger');
{
  const x = mk('ledger', ['dun', 'thug']); const { b, e, p, run } = x; const th = x.es[1]; const K = X.ledger;
  foeHit(b, th, 1); b.actN--; foeHit(b, th, 1); ok(e.clk.n === 1, 'ledger 1: ' + e.clk.n);
  b.ysSpent = (b.ysSpent || 0) + 2; E.fcEv(b, 'onSkill', p, {}, null); ok(e.clk.n === 2, 'ledger 2: ' + e.clk.n);
  foeHit(b, th, 1); foeHit(b, e, 1); ok(e.clk.n === 4 && warns(b) === 1, 'ledger 3: ' + e.clk.n + ' ' + warns(b));
  ok(E.fcChip(b, e).includes('4/' + K.max), 'ledger chip');
  run.gold = 100; ok(E.actionList(b).some(a => a.id === 'paydebt' && a.ok), 'ledger 4: 행동 없음');
  PA(b, 'paydebt'); ok(e.clk.n === 4 - K.payBack && run.gold === 100 - K.pay, 'ledger 5: ' + e.clk.n + ' ' + run.gold);
  e.clk.n = K.max - 1; const eq0 = Object.assign({}, run.eqU); const h0 = full(p); foeHit(b, th, 0.01);
  const sz = run.seized || []; const sl = sz[0] && sz[0].sl; const d = lost(p, h0);
  ok(e.clk.doomN === 1 && sz.length === 1 && !run.eqU[sl] && eq0[sl] === sz[0].uid, 'ledger 6: ' + JSON.stringify(sz));
  ok(near(d, K.doom), 'ledger 7: ' + d.toFixed(3)); ok(e.clk.n === 0, 'ledger 8: ' + e.clk.n); R.ledger = (d * 100).toFixed(1) + '% · ' + sl;
  E.hurtEnemy(b, e, 99999, { single: 1 }); ok(!e.alive && !run.seized && run.eqU[sl] === eq0[sl], 'ledger 9');
}
{ // 무너뜨리기 · 보상 · 멈춤 · 이름 · 전투 끝
  const x = mk('ledger', ['dun', 'thug']); const { b, e, p, run } = x;
  e.clk.n = 3; breakIt(b, e); ok(e.clk.n === 0 && e.stun >= 1 && st(e, 'vuln') >= X.ledger.vuln, 'ledger 10: ' + e.clk.n + ' ' + e.stun);
  p.stun = 1; foeHit(b, x.es[1], 1); ok(e.clk.n === 0 && e.clk.stop === 1, 'ledger 11'); p.stun = 0;
  e.clk = null; b.ledgerMark = 1; E.fcEv(b, 'onRoomStart'); ok(e.clk.n === X.ledger.mark, 'ledger 12: ' + (e.clk && e.clk.n));
  e.clk.n = X.ledger.max - 1; foeHit(b, x.es[1], 0.01); ok(run.seized && run.seized.length === 1, 'ledger 13');
  R_('LAMP_DEV').onRoomEnd(b, 'lose'); ok(!run.seized, 'ledger 14');
}
/* ---------- 투기장 챔피언 ---------- */
common('champion');
{
  const x = mk('champion', ['loser', 'hound']); const { b, e, p } = x; const K = X.champion;
  E.fcEv(b, 'onRoundEnd'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 2, 'champion 1: ' + e.clk.n);
  E.fcEv(b, 'onAct', p, 'guard', { id: 'guard' }, null); ok(e.clk.n === 2 + K.coward && warns(b) === 1, 'champion 2: ' + e.clk.n);
  let h0 = full(p); E.fcEv(b, 'onRoundEnd'); let d = lost(p, h0); ok(e.clk.doomN === 1 && e.clk.n === 0 && near(d, K.doom), 'champion 3: ' + d.toFixed(3)); R.champion = (d * 100).toFixed(1) + '%';
  e.clk.n = K.max - 1; h0 = full(p); p.guard = 1; E.fcEv(b, 'onRoundEnd'); d = lost(p, h0); p.guard = 0; ok(near(d, K.doom / 2), 'champion 4: ' + d.toFixed(3)); R.champion += ' · 방어 ' + (d * 100).toFixed(1) + '%';
  e.clk.n = 3; myHit(b, e, e.hpMax * (K.big + 0.01)); ok(e.clk.n === 3 - K.bigBack, 'champion 5: ' + e.clk.n);
  e.clk.n = 3; b.actN++; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, e.hpMax * K.big * 0.6, { single: 1 }); E.hurtEnemy(b, e, e.hpMax * K.big * 0.6, { single: 1 }); b.cur = null; ok(e.clk.n === 3 - K.bigBack, 'champion 6: ' + e.clk.n);
  e.clk.n = 2; p.dodge = e.id; foeHit(b, e, 2); ok(e.clk.n === 2 - K.parryBack, 'champion 7: ' + e.clk.n);
  e.clk.n = 4; e.hp = e.hpMax; breakIt(b, e); ok(e.clk.n === 0 && e.booArm === 1, 'champion 8');
  const m = R_('ch2FoeOut'); ok(near(m(b, e), 1 - K.boo, 1e-9), 'champion 9: ' + m(b, e)); e.stun = 0; E.fcEv(b, 'onFoeAct', e); ok(near(m(b, e), 1 - K.boo, 1e-9), 'champion 10'); E.fcEv(b, 'onFoeAct', e); ok(m(b, e) === 1, 'champion 11');
  p.stun = 1; e.clk.n = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'champion 12'); p.stun = 0;
  E.fcEv(b, 'onAct', p, 'h_dodge', { id: 'h_dodge', v2: 1, s: { fx: [{ k: 'evade', n: 1 }] } }, null); ok(e.clk.n === 1 + K.coward, 'champion 13: ' + e.clk.n);
}
/* ---------- 등불 도둑 ---------- */
common('lampthief');
{
  const x = mk('lampthief', ['fence', 'xbow']); const { b, e, p, run } = x; const K = X.lampthief;
  act(b, e, 'douselamp'); ok(e.clk.n === 1 && b.ctx.mods.includes('dark') && e.under === 1, 'lampthief 1');
  ok(e.intent && e.intent.k === 'shadowstab' && e.stabOut === 1, 'lampthief 2: ' + (e.intent && e.intent.k));
  ok(E.canTarget(b, e, { id: 'dodge' }) && !E.canTarget(b, e, { id: 'basic' }), 'lampthief 3');
  p.dodge = e.id; e.teleTurn = -1; E.enemyAct(b, e); ok(!e.under && st(e, 'vuln') >= K.vuln && e.noHideR >= (b.round || 0) + K.reveal - 0, 'lampthief 4');
  act(b, e, 'douselamp'); ok(e.clk.n === 2 && warns(b) === 1 && !e.under, 'lampthief 5: ' + e.clk.n + ' ' + e.under);
  e.noHideR = -1; e.under = 1; myHit(b, e, 3, { aoe: 1 }); ok(e.clk.n === 1 && !e.under, 'lampthief 6: ' + e.clk.n);
  e.clk.n = 2; run.oil = 1; ok(E.actionList(b).some(a => a.id === 'lampoil'), 'lampthief 7'); PA(b, 'lampoil'); ok(e.clk.n === 0 && !b.ctx.mods.includes('dark') && run.oil === 0, 'lampthief 8');
  e.clk.n = 2; e.noHideR = -1; act(b, e, 'douselamp'); ok(e.clk.perm === 1 && e.clk.doomN === 1 && e.under === 1 && b.ctx.mods.includes('dark'), 'lampthief 9');
  ok(e.intent.k === 'shadowstab', 'lampthief 10'); const h0 = full(p); e.teleTurn = -1; E.enemyAct(b, e); const d = lost(p, h0); ok(near(d, K.stab) && e.under === 1, 'lampthief 11: ' + d.toFixed(3)); R.lampthief = '끝까지 · 찌르기 ' + (d * 100).toFixed(1) + '%';
  run.oil = 1; ok(!E.actionList(b).some(a => a.id === 'lampoil'), 'lampthief 12'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.perm === 1 && E.fcChip(b, e).includes('perm'), 'lampthief 13');
  E.fcEv(b, 'onCounter', p, e, 3); ok(!e.under, 'lampthief 14');
}
{ // 멈춤
  const x = mk('lampthief', ['fence', 'xbow']); const { b, e, p } = x; p.stun = 1; act(b, e, 'douselamp'); ok(e.clk.n === 0 && e.clk.stop === 1, 'lampthief 15');
}
/* ---------- 장터 경비대장 ---------- */
common('captain');
{
  const x = mk('captain', ['dun', 'thug', 'xbow'], () => { }); const { b, e, p } = x; b.capForm = 1; const [, th, xb] = x.es; const K = X.captain;
  E.fcEv(b, 'onRoundEnd'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 2 && warns(b) === 1, 'captain 1: ' + e.clk.n);
  let h0 = full(p); E.fcEv(b, 'onRoundEnd'); let d = lost(p, h0); const sum = K.doom.reduce((a, v) => a + v, 0);
  ok(e.clk.doomN === 1 && e.clk.n === 0 && near(d, sum), 'captain 2: ' + d.toFixed(3)); R.captain = (d * 100).toFixed(1) + '%';
  e.clk.n = 2; b.actN++; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 1, { aoe: 1 }); E.hurtEnemy(b, th, 1, { aoe: 1 }); E.hurtEnemy(b, xb, 1, { aoe: 1 }); b.cur = null; ok(e.clk.n === 1, 'captain 3: ' + e.clk.n);
  e.clk.n = 2; breakIt(b, th); ok(e.clk.n === 0 && b.formBroken === 1 && e.stun >= 1 && st(e, 'vuln') >= K.vuln && e.intent.k === 'formation', 'captain 4');
  E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'captain 5'); act(b, e, 'formation'); ok(!b.formBroken, 'captain 6'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'captain 7');
  e.clk.n = 2; E.hurtEnemy(b, xb, 99999, { single: 1 }); ok(e.clk.n === 1, 'captain 8: ' + e.clk.n);
  e.clk.n = K.max - 1; h0 = full(p); E.fcEv(b, 'onRoundEnd'); d = lost(p, h0); ok(near(d, K.doom[0] + K.doom[1]), 'captain 9: ' + d.toFixed(3)); R.captain += ' · 석궁 없이 ' + (d * 100).toFixed(1) + '%';
  p.stun = 1; e.clk.n = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'captain 10'); p.stun = 0;
  E.hurtEnemy(b, th, 99999, { single: 1 }); ok(e.clk.n === 0 && b.formBroken === 1, 'captain 11'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'captain 12');
}
/* ---------- 계약 상인 ---------- */
common('merchant');
{
  const x = mk('merchant', ['fence', 'thug']); const { b, e, p, run } = x; const K = X.merchant;
  b.trade = 'ask'; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'merchant 1');
  b.trade = 'no'; for (let i = 0; i < K.max - 1; i++) E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === K.max - 1 && warns(b) === 1, 'merchant 2: ' + e.clk.n);
  run.gold = 100; const h0 = full(p); E.fcEv(b, 'onRoundEnd'); const d = lost(p, h0); ok(e.clk.doomN === 1 && e.clk.n === 0 && run.gold === 100 - Math.floor(100 * K.gold) && near(d, K.doom), 'merchant 3: ' + d.toFixed(3) + ' ' + run.gold); R.merchant = (d * 100).toFixed(1) + '% · 골드 ' + (100 - run.gold);
  e.clk.n = 2; breakIt(b, e); ok(e.clk.n === 0 && e.stun >= 1 && st(e, 'vuln') >= K.vuln, 'merchant 4');
  p.stun = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'merchant 5'); p.stun = 0;
  e.clk.n = 3; e.intent = { k: 'charge' }; ok(E.actionList(b).some(a => a.id === 'tradeyes' && a.ok), 'merchant 6'); PA(b, 'tradeyes');
  ok(e.clk.n === 0 && b.trade === 'yes' && b.tradeHp === 1 && e.intent.k === 'recover', 'merchant 7'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'merchant 8');
}
/* ---------- 테스터 답 고르기(tools/persona/clock-ch2.js) ---------- */
{
  const PS = require('./persona/clock-ch2.js'); const r = () => 0.5;
  ok(['ledger', 'champion', 'lampthief', 'captain', 'merchant'].every(k => typeof PS[k] === 'function'), 'persona: 다섯');
  { const x = mk('ledger', ['dun', 'thug']); x.e.clk.n = 4; x.e.brk = 0; x.run.gold = 100; const a = PS.ledger(x.b, x.e, E, r); ok(a && a[0] === 'paydebt', 'persona ledger ' + JSON.stringify(a)); x.e.brk = x.e.brkMax - 1; const a2 = PS.ledger(x.b, x.e, E, r); ok(a2 && a2[1] === x.e.id && a2[0] !== 'paydebt', 'persona ledger 2 ' + JSON.stringify(a2)); }
  { const x = mk('champion', ['loser', 'hound']); x.e.clk.n = 4; x.e.brk = 0; x.e.intent = { k: 'attack' }; const a = PS.champion(x.b, x.e, E, r); ok(a && a[0] === 'dodge' && a[1] === x.e.id, 'persona champion ' + JSON.stringify(a)); x.e.intent = { k: 'duel' }; const a2 = PS.champion(x.b, x.e, E, r); ok(a2 && a2[0] !== 'guard' && a2[1] === x.e.id, 'persona champion 2 ' + JSON.stringify(a2)); }
  { const x = mk('lampthief', ['fence', 'xbow']); x.e.clk.n = 2; x.b.ctx.mods.push('dark'); x.run.oil = 1; const a = PS.lampthief(x.b, x.e, E, r); ok(a && a[0] === 'lampoil', 'persona lampthief ' + JSON.stringify(a)); x.run.oil = 0; x.e.under = 1; x.e.intent = { k: 'shadowstab' }; x.e.stabOut = 1; const a2 = PS.lampthief(x.b, x.e, E, r); ok(a2 && (a2[0] === 'dodge' || E.actionList(x.b).find(y => y.id === a2[0] && y.aoe)), 'persona lampthief 2 ' + JSON.stringify(a2)); }
  { const x = mk('captain', ['dun', 'thug', 'xbow']); x.b.capForm = 1; x.e.clk.n = 2; const th = x.es[1]; th.brk = th.brkMax - 1; const a = PS.captain(x.b, x.e, E, r); ok(a && a[1] === th.id, 'persona captain ' + JSON.stringify(a)); }
  { const x = mk('merchant', ['fence', 'thug']); x.b.trade = 'no'; x.e.clk.n = 3; x.e.brk = 0; x.p.hp = x.p.hpMax * 0.4; const a = PS.merchant(x.b, x.e, E, r); ok(a && a[0] === 'tradeyes', 'persona merchant ' + JSON.stringify(a)); }
}
/* 평소 공격 배율(공통) */
ok(R_('STRONG_GIM').dmg === 0.8, '공통: 평소 공격 배율');
console.log('clock-ch2-check: 통과 ' + H.C.n + ' · 실패 ' + H.C.fail.length);
for (const k in R) console.log('  ' + k + ': ' + R[k]);
for (const m of H.C.fail) console.log('  실패: ' + m);
if (H.C.fail.length) process.exit(1);
