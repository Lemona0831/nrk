'use strict';
/* 보스 단계 최소 체류 점검 (10월 14일, 만든 사람 결정): 마지막 단계에서 정한 수(BOSS_DWELL.last)만큼 움직이기 전에는 쓰러지지 않고,
   여왕은 1 · 2단계에서도 정한 수(mid)만큼 움직인 뒤에 전환을 예고한다. 단계를 넘기는 행동과 숨 고르기는 세지 않는다.
   화면: 보스 상태 줄과 카드에 "버티는 중". 실행: node tools/boss-dwell-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), { G0: E, run_: V } = require('./dgqa.js');
E.render = () => { };
const ok = [];
const CH = { abbot: 1, cryptlord: 2, queen: 3 };
function setup(boss, phase) {
  const p = E.mkPlayer('warden', {}, {}); p.hp = p.hpMax = 100000; const ch = CH[boss];
  const b = E.roomBattle(p, { ch, lv: 4 * ch, floor: 24, names: V('ENEMY_NAMES[' + ch + ']'), boss: 1 }, boss, 300);
  const e = b.en.find(x => x.boss === boss); e.phase = phase; e.phAct = {}; b.turnIdx = 5; for (const x of b.en) if (x !== e) { x.alive = false; x.hp = 0; } E.__G.b = b;
  return { b, e };
}
for (const boss of ['abbot', 'cryptlord', 'queen']) {
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
{ const mid = V('BOSS_DWELL.queen.mid'); const { b, e } = setup('queen', 1); e.intent = { k: 'attack' }; E.hurtEnemy(b, e, 1e7, { aoe: 1 }); assert.equal(e.qNext, 'qrise');
  let acts = 0;
  for (let k = 0; k < 10 && e.intent.k !== 'qrise'; k++) { b.turnIdx++; e.stun = 0; if (e.under) { e.under = 0; e.qPrep = 0; } E.enemyAct(b, e); acts = (e.phAct || {})[1] || 0; if (e.intent.k !== 'qrise') assert(acts < mid || e.intent.k === 'heavy', '체류를 채웠는데 전환을 미룸(모으던 강타를 내리치는 것만 예외)'); }
  assert.equal(e.intent.k, 'qrise'); assert(acts >= mid, '전환 예고 전 행동 ' + acts); assert.equal(e.phase, 1);
  ok.push('여왕 전환 전 ' + mid + '번'); }
// 수도원장 · 군주는 1 · 2단계 체류가 없다(지금과 같다)
assert.equal(V('BOSS_DWELL.abbot.mid'), 0); assert.equal(V('BOSS_DWELL.cryptlord.mid'), 0);
console.log('보스 단계 최소 체류 점검 통과: ' + ok.join(' · ') + ' · 숨 고르기 제외 · 수도원장/군주 중간 단계는 그대로');
// 전투 기록: 막힌 피해는 따로 보인다(10월 15일). 기록 줄의 숫자(첫 "N 피해")는 실제로 들어간 피해
{ const { b, e } = setup('cryptlord', 3); const hp0 = e.hp; E.hurtEnemy(b, e, 5000, { single: 1 }); const m = b.log.filter(x => /막힘/.test(x.m)).pop();
  assert(m && /에게 [0-9.]+ 피해 \(막힘 [0-9.]+ · 버티는 중\)/.test(m.m), '기록: ' + (m && m.m)); assert.equal(+(/([0-9.]+) 피해/.exec(m.m)[1]), Math.round((hp0 - 1) * 10) / 10, '앞 숫자는 들어간 피해');
  const { b: b2, e: e2 } = setup('cryptlord', 1); e2.hp = Math.round(e2.hpMax * 0.6) + 50; E.hurtEnemy(b2, e2, 5000, { single: 1 }); assert(b2.log.some(x => /\(막힘 [0-9.]+ · 단계 문턱\)/.test(x.m)), '문턱');
  const { b: b3, e: e3 } = setup('cryptlord', 1); E.hurtEnemy(b3, e3, 10, { single: 1 }); assert(!b3.log.some(x => /막힘/.test(x.m)), '보통 피해에는 붙지 않는다');
  console.log('전투 기록 막힌 피해 표시 통과'); }
