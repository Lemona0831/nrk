'use strict';
/* 0.8.0 G-1 2챕터 강적 시계 점검 (js/15-chapter2.js CH2_CLOCK 다섯, 틀은 js/25). 실행: node tools/clock-ch2-check.js
   2판: 강적마다 시계가 있다 · 답이 두 종류 이상 · 한 칸 남으면 마지막 경고 · 다 차면 파국(정한 세기) · 마지막 경고 칸에서 결정적 답 하나 → 0칸 + 보상 ·
   경고 칸이 아닐 때의 되감기는 1칸 · 라운드에 한 번 · 답 수단이 모두 막히면 멈춤. 3판(경비대장 · 챔피언): 평소 행동은 경고 칸에서도 1칸(라운드 한 번). 칸 수 · 세기는 FOE_X에서 읽는다. 규칙의 뜻은 비공개 문서 참조. 실패가 있으면 1로 끝난다 */
const H = require('./uqtest/_h.js'); const { E, R_, ok } = H;
R_('ch2ClockReg')(); const FC = R_('FOE_CLOCK'), X = R_('FOE_X'), PA = R_('ch2PlayerAct');
const st = (u, k) => R_('st')(u, k);
function mk(foe, en, setup) {
  const f = H.fight('assassin', { en, hp: 400, ctx: { ch: 2, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = foe; for (const x of es) x.brkMax = 100; if (setup) setup(run, es); } });
  const b = f.b; b.cur = null; b.rngF = () => 0.5; b.fcNoWait = 1; /* 한 차례 안에서 파국까지 채워 보는 시험 */ b.ctx.ch = 2; b.ctx.mods = []; const e = f.es[0]; e.clk = null; E.fcInit(b, e); e.under = 0; e.stabOut = 0; e.thQ = 0; b.log = []; b.duel = 0; b.trade = null; const p = b.p; // 처음 runUntilPlayer에서 움직인 것은 지운다
  p.hp = p.hpMax; p.stun = 0; p.guard = 0; p.dodge = 0; p.ward = 0; p.evade = 0; for (const k of Object.keys(p.s)) delete p.s[k];
  b.round = 10; e.stun = 0; for (const k of Object.keys(e.s)) delete e.s[k];
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
const nr = b => { b.round = (b.round || 0) + 1; }; // 다음 라운드(경고 칸이 아닐 때의 되감기는 라운드에 한 번)
const calm = e => { e.stun = 0; for (const k of Object.keys(e.s)) delete e.s[k]; }; // 보상(무방비 · 취약)을 지운다
const opened = (e, v) => e.stun >= 1 && st(e, 'vuln') >= v;
const W = id => X[id].max - 1; // 마지막 경고 칸
const OFF = id => Math.max(1, X[id].max - 2); // 경고 칸이 아닌 칸(2칸 이상 차 있는 경우를 보려면 max ≥ 4)
function common(id) {
  const D = FC[id]; ok(!!D, id + ': 정의 없음'); if (!D) return;
  ok(new Set(D.ans || []).size >= 2, id + ': 답 종류 < 2');
  const TAGS = ['brk', 'aoe', 'ranged', 'dot', 'kill', 'parry', 'guard', 'cons', 'gold']; ok((D.ans || []).every(t => TAGS.includes(t)), id + ': 태그 ' + D.ans);
  ok(typeof D.warn === 'function' && typeof D.doom === 'function' && typeof D.blocked === 'function', id + ': warn · doom · blocked');
  ok(D.max === X[id].max && X[id].max >= 2, id + ': 칸 수 ' + D.max);
}
/* 경고 칸이 아닐 때: 큰 되감기도 1칸, 같은 라운드 두 번째는 0칸 */
function offCap(id, x, fire) {
  const { b, e } = x; if (X[id].max < 3) return; const n0 = OFF(id); nr(b); e.clk.n = n0; calm(e); fire(); ok(e.clk.n === n0 - 1 && !opened(e, 1), id + ' off 1: ' + e.clk.n);
  if (e.clk.n > 0) { const n1 = e.clk.n; fire(); ok(e.clk.n === n1, id + ' off 2(라운드 한 번): ' + e.clk.n); nr(b); }
}
const R = {};
/* ---------- 빚 장부의 주인 ---------- */
common('ledger');
{
  const x = mk('ledger', ['dun', 'thug']); const { b, e, p, run } = x; const th = x.es[1]; const K = X.ledger;
  foeHit(b, th, 1); b.actN--; foeHit(b, th, 1); ok(e.clk.n === 1, 'ledger 1: ' + e.clk.n);
  b.ysSpent = (b.ysSpent || 0) + 2; E.fcEv(b, 'onSkill', p, {}, null); ok(e.clk.n === 2, 'ledger 2: ' + e.clk.n);
  for (let i = 0; i < 20 && e.clk.n < W('ledger'); i++) foeHit(b, i % 2 ? th : e, 1); ok(e.clk.n === W('ledger') && warns(b) === 1, 'ledger 3: ' + e.clk.n + ' ' + warns(b));
  ok(E.fcChip(b, e).includes(W('ledger') + '/' + K.max), 'ledger chip');
  run.gold = 100; ok(E.actionList(b).some(a => a.id === 'paydebt' && a.ok), 'ledger 4: 행동 없음');
  calm(e); PA(b, 'paydebt'); ok(e.clk.n === 0 && run.gold === 100 - K.pay && opened(e, K.vuln), 'ledger 5(경고 칸 빚 갚기 → 0 · 보상): ' + e.clk.n + ' ' + run.gold + ' ' + e.stun);
  offCap('ledger', x, () => { if (E.actionList(b).some(a => a.id === 'paydebt' && a.ok)) PA(b, 'paydebt'); });
  if (K.max >= 3) { nr(b); e.clk.n = OFF('ledger'); PA(b, 'paydebt'); ok(!E.actionList(b).some(a => a.id === 'paydebt' && a.ok), 'ledger 5b: 같은 라운드에 또 받음'); }
  const dm0 = K.doom; K.doom = Math.min(dm0, 0.9); /* 파국이 생명력 100% 이상이면 시험 캐릭터가 쓰러져 차압을 볼 수 없다 */ nr(b); e.clk.n = W('ledger'); const eq0 = Object.assign({}, run.eqU); const h0 = full(p); foeHit(b, th, 0.01);
  const sz = run.seized || []; const sl = sz[0] && sz[0].sl; const d = lost(p, h0);
  ok(e.clk.doomN === 1 && sz.length === 1 && !run.eqU[sl] && eq0[sl] === sz[0].uid, 'ledger 6: ' + JSON.stringify(sz));
  ok(near(d, K.doom), 'ledger 7: ' + d.toFixed(3)); ok(e.clk.n === 0, 'ledger 8: ' + e.clk.n); K.doom = dm0; R.ledger = (d * 100).toFixed(1) + '% · ' + sl + ' · ' + K.max + '칸(시험은 파국 ' + Math.min(dm0, 0.9) + ')';
  E.hurtEnemy(b, e, 99999, { single: 1 }); ok(!e.alive && !run.seized && run.eqU[sl] === eq0[sl], 'ledger 9');
}
{ // 무너뜨리기 · 보상 · 멈춤 · 이름 · 전투 끝
  const x = mk('ledger', ['dun', 'thug']); const { b, e, p, run } = x;
  e.clk.n = W('ledger'); breakIt(b, e); ok(e.clk.n === 0 && opened(e, X.ledger.vuln), 'ledger 10(경고 칸 무너뜨리기 → 0): ' + e.clk.n + ' ' + e.stun);
  if (X.ledger.max >= 3) { nr(b); e.clk.n = OFF('ledger'); e.brk = 0; delete e.s.broken; breakIt(b, e); ok(e.clk.n === OFF('ledger') - 1, 'ledger 10b(경고 칸 아님 → 1칸): ' + e.clk.n); }
  calm(e); e.clk.n = 0; p.stun = 1; foeHit(b, x.es[1], 1); ok(e.clk.n === 0 && e.clk.stop === 1, 'ledger 11'); p.stun = 0;
  e.clk = null; b.ledgerMark = 1; E.fcEv(b, 'onRoomStart'); ok(e.clk.n === X.ledger.mark, 'ledger 12: ' + (e.clk && e.clk.n));
  { const d1 = X.ledger.doom; X.ledger.doom = Math.min(d1, 0.9); full(p); e.clk.n = W('ledger'); foeHit(b, x.es[1], 0.01); ok(run.seized && run.seized.length === 1, 'ledger 13'); X.ledger.doom = d1; }
  R_('LAMP_DEV').onRoomEnd(b, 'lose'); ok(!run.seized, 'ledger 14');
}
/* ---------- 투기장 챔피언 ---------- */
common('champion');
{ // 3판: 결정적 답은 챔피언 공격 흘리기 · 챔피언 무너뜨리기. 한 행동 큰 피해는 경고 칸에서도 1칸(라운드 한 번)
  const x = mk('champion', ['loser', 'hound']); const { b, e, p } = x; const K = X.champion; b.duel = 1;
  E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'champion 1: ' + e.clk.n);
  E.fcEv(b, 'onAct', p, 'guard', { id: 'guard' }, null); ok(e.clk.n === Math.min(W('champion'), 1 + K.coward) && warns(b) === (1 + K.coward >= W('champion') ? 1 : 0), 'champion 2: ' + e.clk.n);
  e.clk.n = W('champion'); let h0 = full(p); E.fcEv(b, 'onRoundEnd'); let d = lost(p, h0); ok(e.clk.doomN === 1 && e.clk.n === 0 && near(d, K.doom), 'champion 3: ' + d.toFixed(3)); R.champion = (d * 100).toFixed(1) + '% · ' + K.max + '칸';
  e.clk.n = W('champion'); h0 = full(p); p.guard = 1; E.fcEv(b, 'onRoundEnd'); d = lost(p, h0); p.guard = 0; ok(near(d, K.doom / 2), 'champion 4: ' + d.toFixed(3)); R.champion += ' · 방어 ' + (d * 100).toFixed(1) + '%';
  nr(b); e.clk.n = W('champion'); e.booArm = 0; (e.hp = e.hpMax, myHit)(b, e, e.hpMax * (K.big + 0.01)); ok(e.clk.n === W('champion') - 1 && !e.booArm, 'champion 5(경고 칸 큰 한 방 → 1칸만, 보상 없음): ' + e.clk.n);
  e.clk.n = W('champion'); (e.hp = e.hpMax, myHit)(b, e, e.hpMax * (K.big + 0.01)); ok(e.clk.n === W('champion'), 'champion 5b(경고 칸에서도 라운드 한 번): ' + e.clk.n);
  nr(b); e.clk.n = W('champion'); e.booArm = 0; e.hp = e.hpMax; b.actN++; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, e.hpMax * K.big * 0.6, { single: 1 }); E.hurtEnemy(b, e, e.hpMax * K.big * 0.6, { single: 1 }); b.cur = null; ok(e.clk.n === W('champion') - 1 && !e.booArm, 'champion 6(한 행동 여러 타 → 1칸): ' + e.clk.n);
  nr(b); e.clk.n = W('champion'); (e.hp = e.hpMax, myHit)(b, e, e.hpMax * K.big * 0.5); (e.hp = e.hpMax, myHit)(b, e, e.hpMax * K.big * 0.5); ok(e.clk.n === W('champion'), 'champion 6b(두 행동은 아님): ' + e.clk.n);
  nr(b); e.clk.n = W('champion'); e.booArm = 0; p.dodge = e.id; foeHit(b, e, 2); ok(e.clk.n === 0 && e.booArm === 1, 'champion 7(경고 칸 흘리기 → 0 · 야유): ' + e.clk.n);
  nr(b); e.clk.n = W('champion'); e.booArm = 0; p.dodge = x.es[1].id; foeHit(b, x.es[1], 2); ok(e.clk.n === W('champion') && !e.booArm, 'champion 7a(다른 적 흘리기는 아님): ' + e.clk.n);
  nr(b); e.clk.n = 1; e.booArm = 0; (e.hp = e.hpMax, myHit)(b, e, e.hpMax * (K.big + 0.01)); ok(e.clk.n === 0 && !e.booArm, 'champion 7b(경고 칸 아님 → 1칸, 보상 없음): ' + e.clk.n);
  offCap('champion', x, () => (e.hp = e.hpMax, myHit)(b, e, e.hpMax * (K.big + 0.01)));
  nr(b); e.clk.n = W('champion'); e.hp = e.hpMax; e.booArm = 0; breakIt(b, e); ok(e.clk.n === 0 && e.booArm === 1, 'champion 8(경고 칸 무너뜨리기 → 0 · 야유)');
  const m = R_('ch2FoeOut'); ok(near(m(b, e), 1 - K.boo, 1e-9), 'champion 9: ' + m(b, e)); e.stun = 0; E.fcEv(b, 'onFoeAct', e); ok(near(m(b, e), 1 - K.boo, 1e-9), 'champion 10'); E.fcEv(b, 'onFoeAct', e); ok(m(b, e) === 1, 'champion 11');
  p.stun = 1; e.clk.n = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'champion 12'); p.stun = 0;
  e.clk.n = 0; E.fcEv(b, 'onAct', p, 'h_dodge', { id: 'h_dodge', v2: 1, s: { fx: [{ k: 'evade', n: 1 }] } }, null); ok(e.clk.n === Math.min(W('champion'), K.coward), 'champion 13: ' + e.clk.n);
  // 마지막 경고 때 흘릴 공격이 보이게 예고를 바꾼다(새 예고 = 실행)
  calm(e); e.clk.n = W('champion') - 1; e.intent = e.teleSet = { k: 'charge' }; e.teleX = 0; b.log = []; E.fcEv(b, 'onRoundEnd'); ok(warns(b) === 1 && e.intent.k === 'attack' && e.teleSet === e.intent && !e.teleX, 'champion 14(경고 때 공격 예고): ' + e.intent.k);
  e.acts = 2; R_('decideIntent')(b, e); ok(['attack', 'combo', 'heavy'].includes(e.intent.k), 'champion 15(경고 칸에서는 공격 예고): ' + e.intent.k);
  e.clk.n = 0; e.intent = { k: 'attack' }; e.acts = 2; R_('decideIntent')(b, e); ok(e.intent.k === 'charge', 'champion 16(평소 순환 그대로): ' + e.intent.k);
}
/* ---------- 등불 도둑 ---------- */
common('lampthief');
{
  const x = mk('lampthief', ['fence', 'xbow']); const { b, e, p, run } = x; const K = X.lampthief;
  e.clk.n = W('lampthief') - 1; act(b, e, 'douselamp'); ok(e.clk.n === W('lampthief') && warns(b) === 1 && b.ctx.mods.includes('dark') && e.under === 1, 'lampthief 1: ' + e.clk.n);
  ok(e.intent && e.intent.k === 'shadowstab' && e.stabOut === 1, 'lampthief 2: ' + (e.intent && e.intent.k));
  ok(E.canTarget(b, e, { id: 'dodge' }) && !E.canTarget(b, e, { id: 'basic' }), 'lampthief 3');
  p.dodge = e.id; e.teleTurn = -1; E.enemyAct(b, e); ok(e.clk.n === 0 && !e.under && st(e, 'vuln') >= K.vuln && e.noHideR >= (b.round || 0) + K.reveal - 0, 'lampthief 4(경고 칸 찌르기 흘리기 → 0): ' + e.clk.n);
  e.clk.n = W('lampthief') - 1; act(b, e, 'douselamp'); ok(e.clk.n === W('lampthief') && !e.under, 'lampthief 5: ' + e.clk.n + ' ' + e.under);
  e.noHideR = -1; e.under = 1; myHit(b, e, 3, { aoe: 1 }); ok(e.clk.n === 0 && !e.under, 'lampthief 6(경고 칸 광역 → 0): ' + e.clk.n);
  e.clk.n = W('lampthief'); run.oil = 1; b.ctx.mods.push('dark'); ok(E.actionList(b).some(a => a.id === 'lampoil'), 'lampthief 7'); PA(b, 'lampoil'); ok(e.clk.n === 0 && !b.ctx.mods.includes('dark') && run.oil === 0, 'lampthief 8(경고 칸 등불 기름 → 0)');
  offCap('lampthief', x, () => { e.noHideR = -1; e.under = 1; myHit(b, e, 3, { aoe: 1 }); });
  e.clk.n = W('lampthief'); e.noHideR = -1; act(b, e, 'douselamp'); ok(e.clk.perm === 1 && e.clk.doomN === 1 && e.under === 1 && b.ctx.mods.includes('dark'), 'lampthief 9');
  ok(e.intent.k === 'shadowstab', 'lampthief 10'); const h0 = full(p); e.teleTurn = -1; E.enemyAct(b, e); const d = lost(p, h0); ok(near(d, K.stab) && e.under === 1, 'lampthief 11: ' + d.toFixed(3)); R.lampthief = '끝까지 · 찌르기 ' + (d * 100).toFixed(1) + '% · ' + K.max + '칸';
  run.oil = 1; ok(!E.actionList(b).some(a => a.id === 'lampoil'), 'lampthief 12'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.perm === 1 && E.fcChip(b, e).includes('perm'), 'lampthief 13');
  E.fcEv(b, 'onCounter', p, e, 3); ok(!e.under, 'lampthief 14');
}
{ // 멈춤
  const x = mk('lampthief', ['fence', 'xbow']); const { b, e, p } = x; p.stun = 1; act(b, e, 'douselamp'); ok(e.clk.n === 0 && e.clk.stop === 1, 'lampthief 15');
}
/* ---------- 장터 경비대장 ---------- */
common('captain');
{ // 3판: 결정적 답은 대장 본체 무너뜨리기 · 호령에 흘리기. 덩치 무너뜨리기 · 부하 쓰러뜨리기 · 광역은 경고 칸에서도 1칸(라운드 한 번)
  const x = mk('captain', ['dun', 'thug', 'xbow'], () => { }); const { b, e, p } = x; b.capForm = 1; const [, th, xb] = x.es; const K = X.captain;
  e.intent = e.teleSet = { k: 'rally' };
  for (let i = 0; i < W('captain'); i++) E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === W('captain') && warns(b) === 1, 'captain 1: ' + e.clk.n);
  ok(e.intent.k === 'muster' && e.teleSet === e.intent && !e.teleX, 'captain 1b(경고 때 호령 예고): ' + e.intent.k);
  ok(/\d/.test(R_('intentText')(b, e).t) && R_('intentBadge')(b, e).txt === '호령', 'captain 1c(호령 예고 문장 · 숫자)');
  let h0 = full(p); E.fcEv(b, 'onRoundEnd'); let d = lost(p, h0); const sum = K.doom.reduce((a, v) => a + v, 0);
  ok(e.clk.doomN === 1 && e.clk.n === 0 && near(d, sum), 'captain 2: ' + d.toFixed(3)); R.captain = (d * 100).toFixed(1) + '% · ' + K.max + '칸';
  const aoe3 = () => { b.actN++; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 1, { aoe: 1 }); E.hurtEnemy(b, th, 1, { aoe: 1 }); E.hurtEnemy(b, xb, 1, { aoe: 1 }); b.cur = null; };
  nr(b); e.clk.n = W('captain'); calm(e); aoe3(); ok(e.clk.n === W('captain') - 1 && !opened(e, 1) && !b.formBroken, 'captain 3(경고 칸 광역 → 1칸만): ' + e.clk.n);
  e.clk.n = W('captain'); aoe3(); ok(e.clk.n === W('captain'), 'captain 3b(경고 칸에서도 라운드 한 번): ' + e.clk.n);
  offCap('captain', x, aoe3);
  nr(b); e.clk.n = W('captain'); calm(e); breakIt(b, th); ok(e.clk.n === W('captain') - 1 && b.formBroken === 1 && !opened(e, 1), 'captain 4(경고 칸 덩치 무너뜨리기 → 1칸만): ' + e.clk.n);
  e.clk.n = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'captain 5(대형이 깨진 동안 멈춤)'); act(b, e, 'formation'); ok(!b.formBroken, 'captain 6'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 2, 'captain 7');
  nr(b); e.clk.n = W('captain'); calm(e); p.dodge = e.id; act(b, e, 'muster'); ok(e.clk.n === 0 && opened(e, K.vuln), 'captain 8(경고 칸 호령에 흘리기 → 0 · 보상): ' + e.clk.n);
  nr(b); e.clk.n = W('captain'); calm(e); p.dodge = e.id; act(b, e, 'attack'); ok(e.clk.n === W('captain') && !opened(e, 1), 'captain 8b(호령이 아닌 공격 흘리기는 아님): ' + e.clk.n);
  nr(b); e.clk.n = W('captain'); calm(e); breakIt(b, e); ok(e.clk.n === 0 && opened(e, K.vuln), 'captain 9(경고 칸 대장 무너뜨리기 → 0 · 보상): ' + e.clk.n);
  if (K.max >= 3) { nr(b); e.clk.n = OFF('captain'); calm(e); e.brk = 0; delete e.s.broken; b.log = []; breakIt(b, e); ok(e.clk.n === OFF('captain') - 1 && !b.log.some(l => /몸이 빈다/.test(l.m)), 'captain 9b(경고 칸 아님 → 1칸, 보상 없음): ' + e.clk.n); }
  nr(b); e.clk.n = W('captain'); calm(e); E.hurtEnemy(b, xb, 99999, { single: 1 }); ok(e.clk.n === W('captain') - 1 && !opened(e, 1), 'captain 10(경고 칸 석궁 쓰러뜨리기 → 1칸만): ' + e.clk.n);
  e.clk.n = W('captain'); h0 = full(p); E.fcEv(b, 'onRoundEnd'); d = lost(p, h0); ok(near(d, K.doom[0] + K.doom[1]), 'captain 11: ' + d.toFixed(3)); R.captain += ' · 석궁 없이 ' + (d * 100).toFixed(1) + '%';
  p.stun = 1; e.clk.n = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 1, 'captain 12'); p.stun = 0;
  nr(b); e.clk.n = 1; E.hurtEnemy(b, th, 99999, { single: 1 }); ok(e.clk.n === 0 && b.formBroken === 1, 'captain 13(부하가 모두 쓰러지면 대형이 깨진다)'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'captain 14');
}
{ // 덩치가 쓰러져도 석궁이 서 있으면 대형은 남는다(평소 되감기 1칸)
  const x = mk('captain', ['dun', 'thug', 'xbow'], () => { }); const { b, e } = x; b.capForm = 1; const th = x.es[1];
  e.clk.n = W('captain'); E.hurtEnemy(b, th, 99999, { single: 1 }); ok(e.clk.n === W('captain') - 1 && !b.formBroken, 'captain 15: ' + e.clk.n); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === W('captain'), 'captain 16');
}
{ // 마지막 경고 때 덩치는 대장 앞을 막지 않는다 · 몸 빼기로 호령을 피해도 결정적 답
  const x = mk('captain', ['dun', 'thug', 'xbow'], () => { }); const { b, e, p } = x; b.capForm = 1; const th = x.es[1];
  th.guarding = e.id; th.intent = th.teleSet = { k: 'guard', tgt: e.id }; e.clk.n = W('captain') - 1; E.fcEv(b, 'onRoundEnd');
  ok(e.clk.n === W('captain') && !th.guarding && th.intent.k === 'brace' && th.teleSet === th.intent, 'captain 17(경고 때 막아서기 풀림): ' + th.intent.k);
  th.acts = 0; R_('decideIntent')(b, th); ok(!(th.intent.k === 'guard' && th.intent.tgt === e.id), 'captain 18(경고 칸에서 대장을 막지 않는다): ' + JSON.stringify(th.intent));
  calm(e); p.evade = 1; act(b, e, 'muster'); ok(e.clk.n === 0 && opened(e, X.captain.vuln) && !p.evade, 'captain 19(몸 빼기로 호령 피하기 → 0): ' + e.clk.n);
}
/* ---------- 계약 상인 ---------- */
common('merchant');
{
  const x = mk('merchant', ['fence', 'thug']); const { b, e, p, run } = x; const K = X.merchant;
  b.trade = 'ask'; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'merchant 1');
  b.trade = 'no'; for (let i = 0; i < K.max - 1; i++) E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === K.max - 1 && warns(b) === 1, 'merchant 2: ' + e.clk.n);
  run.gold = 100; const h0 = full(p); E.fcEv(b, 'onRoundEnd'); const d = lost(p, h0); ok(e.clk.doomN === 1 && e.clk.n === 0 && run.gold === 100 - Math.floor(100 * K.gold) && near(d, K.doom), 'merchant 3: ' + d.toFixed(3) + ' ' + run.gold); R.merchant = (d * 100).toFixed(1) + '% · 골드 ' + (100 - run.gold) + ' · ' + K.max + '칸';
  nr(b); e.clk.n = W('merchant'); calm(e); breakIt(b, e); ok(e.clk.n === 0 && opened(e, K.vuln), 'merchant 4(경고 칸 저울 무너뜨리기 → 0)');
  p.stun = 1; E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'merchant 5'); p.stun = 0;
  nr(b); e.clk.n = W('merchant'); calm(e); run.gold = 100; ok(E.actionList(b).some(a => a.id === 'paydebt' && a.ok), 'merchant 5b: 청구서 갚기 없음'); PA(b, 'paydebt'); ok(e.clk.n === 0 && run.gold === 100 - K.pay && opened(e, K.vuln), 'merchant 5c(경고 칸 골드 → 0): ' + e.clk.n + ' ' + run.gold);
  run.gold = 100; offCap('merchant', x, () => { if (E.actionList(b).some(a => a.id === 'paydebt' && a.ok)) PA(b, 'paydebt'); });
  nr(b); e.clk.n = W('merchant'); calm(e); e.intent = { k: 'charge' }; ok(E.actionList(b).some(a => a.id === 'tradeyes' && a.ok), 'merchant 6'); PA(b, 'tradeyes');
  ok(e.clk.n === 0 && b.trade === 'yes' && b.tradeHp === 1 && e.intent.k === 'recover' && e.stun >= 1, 'merchant 7(경고 칸 거래 받기 → 0)'); E.fcEv(b, 'onRoundEnd'); ok(e.clk.n === 0, 'merchant 8');
  ok(!E.actionList(b).some(a => a.id === 'paydebt'), 'merchant 9: 거래 뒤 청구서 갚기');
}
/* ---------- 평소 공격 배율(ch2Setup, FOE_X atk) ---------- */
for (const id of ['ledger', 'champion', 'lampthief', 'captain', 'merchant']) {
  const x = mk(id, ['dun', 'thug']); const A = X[id].atk || 1; const d0 = x.e.dmg; x.e.bigMul = 2; R_('ch2Setup')(x.b, { foe: id, strong: x.e.n });
  ok(near(x.e.dmg, d0 * A, 1e-9) && near(x.e.bigMul * x.e.dmg, 2 * d0, 1e-9), id + ': 평소 공격 배율 ' + x.e.dmg + ' / ' + d0);
}
/* ---------- 테스터 답 고르기(tools/persona/clock-ch2.js) ---------- */
{
  const PS = require('./persona/clock-ch2.js'); const r = () => 0.5;
  ok(['ledger', 'champion', 'lampthief', 'captain', 'merchant'].every(k => typeof PS[k] === 'function'), 'persona: 다섯');
  { const x = mk('ledger', ['dun', 'thug']); x.e.clk.n = W('ledger'); x.e.brk = 0; x.run.gold = 100; const a = PS.ledger(x.b, x.e, E, r); ok(a && a[0] === 'paydebt', 'persona ledger ' + JSON.stringify(a)); x.e.brk = x.e.brkMax - 1; const a2 = PS.ledger(x.b, x.e, E, r); ok(a2 && a2[1] === x.e.id && a2[0] !== 'paydebt', 'persona ledger 2 ' + JSON.stringify(a2)); }
  { const x = mk('champion', ['loser', 'hound']); x.e.clk.n = W('champion'); x.e.brk = 0; x.e.intent = { k: 'attack' }; const a = PS.champion(x.b, x.e, E, r); ok(a && a[0] === 'dodge' && a[1] === x.e.id, 'persona champion ' + JSON.stringify(a)); x.e.intent = { k: 'charge' }; const a2 = PS.champion(x.b, x.e, E, r); ok(a2 === null, 'persona champion 2(큰 한 방은 고르지 않는다) ' + JSON.stringify(a2)); x.e.brk = x.e.brkMax - 1; const a3 = PS.champion(x.b, x.e, E, r); ok(a3 && a3[1] === x.e.id && a3[0] !== 'dodge', 'persona champion 3 ' + JSON.stringify(a3)); }
  { const x = mk('lampthief', ['fence', 'xbow']); x.e.clk.n = W('lampthief'); x.b.ctx.mods.push('dark'); x.e.under = 1; x.e.intent = { k: 'shadowstab' }; x.e.stabOut = 1; const a = PS.lampthief(x.b, x.e, E, r); ok(a && a[0] === 'dodge', 'persona lampthief ' + JSON.stringify(a)); x.e.intent = { k: 'douselamp' }; x.run.oil = 1; const a2 = PS.lampthief(x.b, x.e, E, r); ok(a2 && (a2[0] === 'lampoil' || E.actionList(x.b).find(y => y.id === a2[0] && y.aoe)), 'persona lampthief 2 ' + JSON.stringify(a2)); }
  { const x = mk('captain', ['dun', 'thug', 'xbow']); x.b.capForm = 1; x.e.clk.n = W('captain'); const th = x.es[1]; x.e.brk = 0; th.brk = th.brkMax - 1; x.e.intent = { k: 'muster' }; const a = PS.captain(x.b, x.e, E, r); ok(a && a[0] === 'dodge' && a[1] === x.e.id, 'persona captain ' + JSON.stringify(a)); x.e.intent = { k: 'rally' }; const a2 = PS.captain(x.b, x.e, E, r); ok(a2 === null, 'persona captain 2(덩치 무너뜨리기는 고르지 않는다) ' + JSON.stringify(a2)); x.e.brk = x.e.brkMax - 1; const a3 = PS.captain(x.b, x.e, E, r); ok(a3 && a3[1] === x.e.id && a3[0] !== 'dodge', 'persona captain 3 ' + JSON.stringify(a3)); }
  { const x = mk('merchant', ['fence', 'thug']); x.b.trade = 'no'; x.e.clk.n = W('merchant'); x.e.brk = 0; x.run.gold = 0; const a = PS.merchant(x.b, x.e, E, r); ok(a && a[0] === 'tradeyes', 'persona merchant ' + JSON.stringify(a)); x.run.gold = 100; const a2 = PS.merchant(x.b, x.e, E, r); ok(a2 && a2[0] === 'paydebt', 'persona merchant 2 ' + JSON.stringify(a2)); x.e.brk = x.e.brkMax - 1; const a3 = PS.merchant(x.b, x.e, E, r); ok(a3 && a3[1] === x.e.id, 'persona merchant 3 ' + JSON.stringify(a3)); }
}
/* 평소 공격 배율(공통) */
ok(R_('STRONG_GIM').dmg === 0.8, '공통: 평소 공격 배율');
console.log('clock-ch2-check: 통과 ' + H.C.n + ' · 실패 ' + H.C.fail.length);
for (const k in R) console.log('  ' + k + ': ' + R[k]);
for (const m of H.C.fail) console.log('  실패: ' + m);
if (H.C.fail.length) process.exit(1);
