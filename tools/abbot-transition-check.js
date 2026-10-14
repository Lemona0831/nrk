'use strict';
/* 1챕터 보스의 단계 전환 점검 (10월 14일).
   큰 피해 한 번이 단계를 건너뛰거나 단계 전환 없이 보스를 쓰러뜨리지 않아야 한다.
   문턱을 넘친 피해는 버리고, 보스가 예고한 행동을 마친 뒤 한 단계씩만 넘어간다. (2·3챕터 보스는 이미 같은 규칙: tools/queen-transition-check.js)
   실행: DGDIR=. node tools/abbot-transition-check.js   (DGDIR=06a2 로 개발본) */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), { G0: E, run_: V } = require('./dgqa.js');
function setup(phase) {
  const p = E.mkPlayer('warden', {}, {}); p.hp = p.hpMax = 100000;
  const b = E.roomBattle(p, { ch: 1, lv: 4, floor: 24, names: V('ENEMY_NAMES[1]'), boss: 1 }, 'abbot', 300);
  const e = b.en.find(x => x.boss === 'abbot'); e.phase = phase; b.turnIdx = 5;
  const th = phase === 1 ? 0.65 : 0.3; e.hp = Math.round(e.hpMax * th) + 1;
  return { b, e };
}
let n = 0;
for (const dot of [false, true]) {
  // 1단계에서 큰 피해: 쓰러지거나 단계를 건너뛰면 안 된다
  let { b, e } = setup(1);
  E.hurtEnemy(b, e, 100000, { aoe: 1, dot });
  assert(e.alive && e.hp > 0, '큰 직격에 1단계 보스가 쓰러짐 (dot=' + dot + ')'); assert(!b.over, '전투가 끝남');
  assert.equal(e.phase, 1, '전환은 보스가 행동을 마친 뒤에 일어나야 한다');
  E.enemyAct(b, e);
  assert.equal(e.phase, 2, '1단계 → 2단계 한 단계만');
  assert(e.alive && !b.over);
  // 2단계에서 큰 피해: 3단계를 거치지 않고 쓰러지면 안 된다
  ({ b, e } = setup(2));
  E.hurtEnemy(b, e, 100000, { aoe: 1, dot });
  assert(e.alive && e.hp > 0, '큰 직격에 2단계 보스가 쓰러짐 (dot=' + dot + ')'); assert(!b.over);
  assert.equal(e.phase, 2);
  E.enemyAct(b, e);
  assert.equal(e.phase, 3, '2단계 → 3단계');
  // 3단계: 휴식이 아닌 행동을 한 번 하기 전에는 쓰러지지 않는다(단계 최소 체류, 10월 14일). 한 번 움직인 뒤에는 쓰러진다
  E.hurtEnemy(b, e, 100000, { aoe: 1 }); assert(!b.over && e.hp === 1, '3단계 첫 행동 전에는 버틴다');
  for (let k = 0; k < 4 && !((e.phAct || {})[3] > 0); k++) { b.turnIdx++; E.enemyAct(b, e); }
  assert(e.phAct[3] >= 1, '휴식이 아닌 행동을 했다');
  E.hurtEnemy(b, e, 100000, { aoe: 1 });
  assert.equal(b.over, 'win', '3단계에서 한 번 움직인 뒤에는 쓰러져야 한다');
  n++;
}
// 1단계에서 한 번에 두 문턱을 넘는 피해: 2단계를 거쳐야 한다
{
  const { b, e } = setup(1); E.hurtEnemy(b, e, e.hpMax * 0.9, { aoe: 1 });
  assert.equal(e.phase, 1); E.enemyAct(b, e); assert.equal(e.phase, 2, '두 문턱을 한 번에 넘어도 2단계를 거친다'); n++;
}
console.log('수도원장 단계 전환: 큰 직격·지속 피해로 단계 건너뛰기·단계 전환 없는 처치 방지, 3단계 정상 처치 (' + n + '개 조건) 통과');
