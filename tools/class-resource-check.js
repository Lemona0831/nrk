'use strict';
// 상태 객체·연속 타격·비율 채우기·초과 피해가 실제 자원 계산에 연결되는지 검사.
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict');
const D = require('./dgqa.js'), E = D.G0;
const close = (a, b, msg) => assert(Math.abs(a - b) < 1e-7, msg + ': ' + a + '/' + b);
function setup(build, stats = {}, eq = {}) {
  const p = E.mkPlayer(build, eq, stats), e = E.mkEnemy('bruiser', false, 0);
  e.hp = e.hpMax = 1000000;
  const b = E.newBattle(p, [e], {}); b.rngF = () => .99;
  p.hp = p.hpMax; p.ward = 0; delete p.s.haste;
  return { p, e, b };
}
const originalHit = E.hurtEnemy;
let hasteCases = 0;
try {
  for (const s of E.SKILLS2.hunter.filter(s => s.fx.some(f => f.k === 'hasteSpend'))) {
    const mul = s.fx.find(f => f.k === 'hasteSpend').mul;
    const values = [];
    for (const stacks of [0, 1, 2]) {
      const { p, e, b } = setup('hunter', { dex: 10 });
      p.focus = { id: e.id, n: 3 };
      if (stacks) E.addS(b, p, 'haste', stacks);
      const hits = [];
      E.hurtEnemy = (b, e, n, o) => { hits.push(n); return originalHit(b, e, n, o); };
      E.runSkill2(b, E.v2Static(s), e);
      assert.equal(E.st(p, 'haste'), Math.max(0, stacks - 1), s.id + ' 한 번만 소모');
      assert.equal(hits.length, s.hits || 1, s.id + ' 타격 수');
      values.push(hits); hasteCases++;
    }
    for (let h = 0; h < values[0].length; h++) {
      close(values[1][h], values[0][h] * mul, s.id + ' 타격 ' + h + ' 배율');
      close(values[2][h], values[1][h], s.id + ' 겹 수가 추가 배율을 만들지 않음');
    }
    const { p, b } = setup('hunter'); E.addS(b, p, 'haste', 2);
    E.runSkill2(b, E.v2Static(s), null);
    assert.equal(E.st(p, 'haste'), 2, s.id + ' 대상 없음은 소모하지 않음'); hasteCases++;
  }
} finally { E.hurtEnemy = originalHit; }
let fillCases = 0;
for (const build of ['warden', 'spellblade']) {
  for (const s of E.SKILLS2[build].filter(s => s.fx.some(f => f.k === 'wardFill'))) {
    for (const wil of [0, 10, 30, 50]) for (const fraction of [0, .25, .9, 1]) {
      const { p, e, b } = setup(build, { con: 10, wil });
      const cap = E.wardMax(p), before = cap * fraction;
      const goal = Math.round(cap * (s.fx.find(f => f.k === 'wardFill').to || 1));
      p.ward = before;
      E.runSkill2(b, E.v2Static(s), e);
      close(p.ward, Math.max(before, goal), s.id + ' 목표까지, 기존 보호막 보존'); fillCases++;
    }
  }
}
const font = D.run_('IFX.wardfont');
for (const wil of [0, 20, 50]) for (const fraction of [0, .25, .8]) {
  const { p, b } = setup('spellblade', { con: 10, wil });
  const cap = E.wardMax(p), before = cap * fraction; p.ward = before;
  font.onFlask(b, p, 'life'); close(p.ward, before, '생명력 플라스크는 채우지 않음');
  font.onFlask(b, p, 'mana'); close(p.ward, Math.max(before, Math.round(cap * .5)), '장비 비율 채우기');
  fillCases++;
}
// 고정값 생성과 교대의 기존 규칙도 보존한다.
for (const wil of [0, 20]) {
  const { p, b } = setup('spellblade', { con: 20, wil });
  close(E.addWard(b, p, 4, undefined, true), 4, '고정 생성은 의지 제외');
  p.ward = 0; close(E.addWard(b, p, 7), 7 * (1 + wil * .02), '일반 생성은 의지 적용');
}
let damageCases = 0;
for (const eq of [{}, { ring1: 'twicering' }, { amulet: 'deadrosary' }]) {
  for (const dot of [false, true]) for (const amount of [2, 500]) {
    const { p, e, b } = setup('butcher', {}, eq); p.hp = 5;
    E.hurtPlayer(b, amount, { src: e, dot });
    assert((p.tookAcc || 0) <= 5, '남은 생명력을 넘는 자원 없음');
    close(p.tookAcc || 0, dot ? 0 : b.damageStats.taken, '실제 직접 피해만 자원으로');
    if (eq.ring1 && amount === 500) assert.equal(p.hp, 1, '되살리는 장비 기능 보존');
    damageCases++;
  }
}
console.log(JSON.stringify({ passed: true, hasteCases, fillCases, damageCases }));
