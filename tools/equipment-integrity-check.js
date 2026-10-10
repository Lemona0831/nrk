'use strict';
process.env.DGDIR = '06a2';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, V = D.run_;
let count = 0;
function fresh(build) {
  const r = { build, p: E.mkPlayer(build, {}), bag: [], swaps: [], room: 0, cons: [] };
  E.initGear(r); return r;
}
function invariant(r) {
  E.__gearRun = r;
  assert(V('gearCheck(__gearRun)'), '장비 소유 위치 중복 또는 유실');
  for (const k of ['hp', 'mp', 'st']) {
    assert(Number.isFinite(r.p[k]) && r.p[k] >= 0 && r.p[k] <= r.p[k + 'Max'], k + ' 범위');
  }
}
for (const build of V('Object.keys(TREE2)')) for (const tpl of Object.keys(E.ITEMS)) for (const bonus of [0, V('GRADE')[E.ITEMS[tpl].g || 'n'].hi]) {
  const chapter = [1, 2, 3].find(ch => V('poolOf')(ch).includes(tpl)) || 1;
  const r = fresh(build), it = E.mkItem(tpl, { b: bonus, ch: chapter });
  r.p.hp = Math.round(r.p.hpMax / 2); r.p.st = r.p.stMax / 2;
  assert(E.addItem(r, it));
  const slot = E.tplKind(tpl) === 'ring' ? 'ring1' : E.tplKind(tpl);
  const old = r.eqU[slot], hpFrac = r.p.hp / r.p.hpMax, stFrac = r.p.st / r.p.stMax;
  assert.equal(E.equipUid(r, it.uid, slot), '');
  assert.equal(r.eqU[slot], it.uid); assert.equal(r.p.eq[slot], tpl);
  if (old) assert(r.bag.includes(old));
  assert(Math.abs(r.p.hp - r.p.hpMax * hpFrac) <= 0.500001);
  assert(Math.abs(r.p.st - r.p.stMax * stFrac) < 1e-6);
  invariant(r);
  if (slot !== 'weapon') {
    E.__gearSlot = slot;
    assert.equal(V('unequipUid(__gearRun,__gearSlot)'), '');
    assert(r.bag.includes(it.uid)); assert.equal(r.eqU[slot], null); invariant(r);
  }
  count++;
}
const r = fresh('assassin'), legs = Object.keys(E.ITEMS).filter(k => E.ITEMS[k].g === 'l');
const a = E.mkItem(legs[0], { b: 0 }), b = E.mkItem(legs.find(k => E.tplKind(k) !== E.tplKind(a.tpl)), { b: 0 });
E.addItem(r, a); E.addItem(r, b);
const slot = it => E.tplKind(it.tpl) === 'ring' ? 'ring1' : E.tplKind(it.tpl);
assert.equal(E.equipUid(r, a.uid, slot(a)), '');
const before = JSON.stringify(r); assert(E.equipUid(r, b.uid, slot(b))); assert.equal(JSON.stringify(r), before);
invariant(r);
let drops = 0;
for (const build of V('Object.keys(TREE2)')) for (let ch = 1; ch <= 3; ch++) {
  const q = fresh(build); q.ch = ch; q.legSeen = [];
  for (const grade of (ch === 1 ? ['n', 'm', 'r'] : ['n', 'm', 'r', 'h', 'l'])) for (let i = 0; i < 60; i++) {
    const k = E.dropKey(q, grade);
    assert(E.ITEMS[k], build + ' / ' + ch + ' / ' + grade + ' / ' + k); assert(E.poolOk_(q.p, k), '직업에 맞지 않거나 제외된 장비 드롭');
    drops++;
  }
}
const full = fresh('assassin');
while (E.bagUsed(full) < E.BAG_MAX) assert(E.addItem(full, E.mkItem('start_armor', { b: 0 })));
const extra = E.mkItem('start_armor', { b: 0 }), snapshot = JSON.stringify(full);
assert.equal(E.addItem(full, extra), false); assert.equal(JSON.stringify(full), snapshot);
E.__gearRun = full; assert(V('unequipUid(__gearRun,"armor")')); assert.equal(JSON.stringify(full), snapshot);
assert.equal(E.equipUid(full, full.bag[0], 'armor'), ''); invariant(full);
console.log('장착·해제·소유 위치·자원 비율:', count, '직업×장비 통과, 전설 중복·가방 한도 통과, 드롭 적합성:', drops, '통과');
