'use strict';
/* 보스 단계 최소 체류 점검 (10월 14일, 만든 사람 결정): 마지막 단계에서 정한 수(BOSS_DWELL.last)만큼 움직이기 전에는 쓰러지지 않고,
   여왕은 1 · 2단계에서도 정한 수(mid)만큼 움직인 뒤에 전환을 예고한다. 단계를 넘기는 행동과 숨 고르기는 세지 않는다.
   화면: 보스 상태 줄과 카드에 "버티는 중". 실행: node tools/boss-dwell-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), { G0: E, run_: V } = require('./dgqa.js');
E.render = () => { };
const ok = [];
const CH = { abbot: 1, cryptlord: 2, queen: 3, bardo: 2, lu: 3 };
/* M8(10월 23일): 군주 · 여왕은 0.8.0 A2 · A3에서 data/archive로 옮겨졌다. 지금 보스(수도원장 · 바르도 · 루)로 마지막 단계 체류를 보고, 군주 · 여왕 전용 확인(전환 예고 · 쌓인 피해 문턱)은 그 보스가 있을 때만 돈다 */
const HAS = k => V('typeof BOSSES.' + k + ' !== "undefined" && typeof BOSS_DWELL.' + k + ' !== "undefined"');
const OLD = HAS('cryptlord') && HAS('queen');
function setup(boss, phase) {
  const p = E.mkPlayer('warden', {}, {}); p.hp = p.hpMax = 100000; const ch = CH[boss];
  const b = E.roomBattle(p, { ch, lv: 4 * ch, floor: 24, names: V('ENEMY_NAMES[' + ch + ']'), boss: 1 }, boss, 300);
  const e = b.en.find(x => x.boss === boss); e.phase = phase; e.phAct = {}; b.turnIdx = 5; for (const x of b.en) if (x !== e) { x.alive = false; x.hp = 0; } E.__G.b = b;
  return { b, e };
}
for (const boss of ['abbot', 'cryptlord', 'queen', 'bardo', 'lu'].filter(HAS)) {
  const need = V('BOSS_DWELL.' + boss + '.last');
  const { b, e } = setup(boss, 3);
  E.hurtEnemy(b, e, 1e7, { aoe: 1 }); assert(!b.over && e.alive && e.hp === 1, boss + ': 마지막 단계 첫 행동 전에 쓰러짐');
  assert(E.stsHtml(e, b, true).includes('버티는 중'), boss + ': 카드 표시'); assert(E.infoHtml('bdwell:' + e.id).includes('마지막 단계'), boss + ': 설명 창');
  let guard = 0; while (((e.phAct || {})[3] || 0) < need && guard++ < 20) { b.turnIdx++; e.stun = 0; if (e.under) { e.under = 0; e.qPrep = 0; } E.enemyAct(b, e); if (((e.phAct || {})[3] || 0) < need) { E.hurtEnemy(b, e, 1e7, { aoe: 1 }); assert(!b.over, boss + ': ' + need + '번 전에 쓰러짐'); } }
  assert(e.phAct[3] >= need); assert(!E.stsHtml(e, b, true).includes('버티는 중'), boss + ': 체류를 채우면 표시가 사라진다');
  E.hurtEnemy(b, e, 1e7, { aoe: 1 }); assert.equal(b.over, 'win', boss + ': 체류 뒤에는 쓰러진다');
  ok.push(boss + ' 마지막 ' + need + '번');
}
// 숨 고르기와 전환 행동은 세지 않는다
{ const { b, e } = setup('abbot', 3); e.intent = { k: 'rest' }; b.turnIdx++; E.enemyAct(b, e); assert.equal((e.phAct || {})[3] || 0, 0, '숨 고르기는 세지 않는다'); }
// 여왕 1단계: 문턱에 닿아도 mid번 움직이기 전에는 전환을 예고하지 않는다
if (OLD) { const mid = V('BOSS_DWELL.queen.mid'); const { b, e } = setup('queen', 1); e.intent = { k: 'attack' }; E.hurtEnemy(b, e, 1e7, { aoe: 1 }); assert.equal(e.qNext, 'qrise');
  let acts = 0;
  for (let k = 0; k < 10 && e.intent.k !== 'qrise'; k++) { b.turnIdx++; e.stun = 0; if (e.under) { e.under = 0; e.qPrep = 0; } E.enemyAct(b, e); acts = (e.phAct || {})[1] || 0; if (e.intent.k !== 'qrise') assert(acts < mid || e.intent.k === 'heavy', '체류를 채웠는데 전환을 미룸(모으던 강타를 내리치는 것만 예외)'); }
  assert.equal(e.intent.k, 'qrise'); assert(acts >= mid, '전환 예고 전 행동 ' + acts); assert.equal(e.phase, 1);
  ok.push('여왕 전환 전 ' + mid + '번'); }
// 수도원장 · 군주는 1 · 2단계 체류가 없다(지금과 같다)
// 10월 15일: 쌓인 피해가 들어가도 단계를 건너뛰지 않게 1 · 2단계에도 체류가 있다. 문턱에 닿아도 mid번 움직이기 전에는 전환하지 않는다
for (const boss of ['abbot', 'cryptlord'].filter(HAS)) { const mid = V('BOSS_DWELL.' + boss + '.mid'); assert(mid >= 1, boss + ' 중간 체류'); const { b, e } = setup(boss, 2); E.hurtEnemy(b, e, 1e7, { aoe: 1 }); assert.equal(e.phase, 2); let k = 0; while (e.phase === 2 && k++ < 12) { b.turnIdx++; e.stun = 0; E.enemyAct(b, e); if (e.phase === 2) continue; } assert.equal(e.phase, 3, boss + ' 전환'); assert(((e.phAct || {})[2] || 0) >= mid, boss + ' 2단계에서 ' + mid + '번 움직인 뒤 전환: ' + JSON.stringify(e.phAct)); }
console.log('보스 단계 최소 체류 점검 통과: ' + ok.join(' · ') + ' · 숨 고르기 제외 · 수도원장/군주 중간 단계 체류');
// 전투 기록: 막힌 피해는 따로 보인다(10월 15일). 기록 줄의 숫자(첫 "N 피해")는 실제로 들어간 피해
if (OLD) { const { b, e } = setup('cryptlord', 3); const hp0 = e.hp; E.hurtEnemy(b, e, 5000, { single: 1 }); const m = b.log.filter(x => /쌓임/.test(x.m)).pop();
  assert(m && /에게 [0-9.]+ 피해 \(쌓임 [0-9.]+ · 버티는 중\)/.test(m.m), '기록: ' + (m && m.m)); assert.equal(+(/([0-9.]+) 피해/.exec(m.m)[1]), Math.round((hp0 - 1) * 10) / 10, '앞 숫자는 들어간 피해');
  const { b: b2, e: e2 } = setup('cryptlord', 1); e2.hp = Math.round(e2.hpMax * 0.6) + 50; E.hurtEnemy(b2, e2, 5000, { single: 1 }); assert(b2.log.some(x => /\(쌓임 [0-9.]+ · 단계 문턱\)/.test(x.m)), '문턱');
  const { b: b3, e: e3 } = setup('cryptlord', 1); E.hurtEnemy(b3, e3, 10, { single: 1 }); assert(!b3.log.some(x => /쌓임/.test(x.m)), '보통 피해에는 붙지 않는다');
  console.log('전투 기록 막힌 피해 표시 통과'); }
// 쌓인 피해(10월 15일, 만든 사람 결정): 막힌 피해는 버리지 않고 쌓였다가, 보스가 차례를 마쳐 문이 열리면 들어간다. 피해 배율은 다시 붙지 않고 다음 문턱에서 다시 멈춘다
if (OLD) { const { b, e } = setup('cryptlord', 3); E.hurtEnemy(b, e, 5000, { single: 1 }); assert(e.bank > 4000, '쌓임 ' + e.bank); assert(E.stsHtml(e, b, true).includes('쌓인 피해'), '카드 표시');
  b.turnIdx++; e.stun = 0; E.enemyAct(b, e); assert.equal(b.over, 'win', '마지막 단계: 한 번 움직이면 쌓인 피해로 쓰러진다'); assert(b.log.some(x => /쌓였던 피해가/.test(x.m))); }
if (OLD) { const { b, e } = setup('cryptlord', 1); e.hp = Math.round(e.hpMax * 0.6) + 10; e.s.vuln = { stacks: 3, until: 9999, dur: 9999 }; E.hurtEnemy(b, e, e.hpMax, { single: 1 }); const bank0 = e.bank; assert(bank0 > 0); assert.equal(e.lordNext, 'throne');
  for (let k = 0; k < 6 && e.phase === 1; k++) { b.turnIdx++; e.stun = 0; E.enemyAct(b, e); }
  assert.equal(e.phase, 2, '전환'); assert(Math.abs(e.hp - Math.round(e.hpMax * 0.3)) <= 1, '쌓인 피해가 들어가 다음 문턱(30%)에서 다시 멈춘다: ' + e.hp / e.hpMax); assert(e.bank > 0 && e.bank < bank0, '남은 몫은 다시 쌓인다'); assert.equal(e.lordNext, 'collapse');
  const dealt = b.rec.filter(x => x.bank).reduce((a, x) => a + x.d, 0); assert(Math.abs(dealt + e.bank - bank0) <= 1, '배율이 다시 붙지 않는다(들어간 몫 + 남은 몫 = 쌓였던 몫)'); }
console.log(OLD ? '쌓인 피해: 표시 · 문이 열리면 들어감 · 다음 문턱에서 다시 쌓임 · 배율 중복 없음 통과' : '쌓인 피해 · 기록 문턱 · 여왕 전환 예고 확인은 군주 · 여왕이 보관돼 건너뜀(바르도 · 루용 확인은 0.8.x로 이월)');
