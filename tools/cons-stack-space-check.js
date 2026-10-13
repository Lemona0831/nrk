'use strict';
/* 소모품 묶음·공간 점검. 10월 14일 개편 1단계로 다시 썼다: 소모품 가방은 장비 가방과 따로 CONS_BAG칸이고,
   한 칸에 담기는 수(max)는 무게로 정한다. 판매품은 가방이 아니라 전리품 주머니로 간다(tools/cons-bag-check.js).
   검사: 같은 종류·등급의 빈자리부터 채우기, 빈 칸에 새 묶음, 공간·골드 부족이면 아무것도 바뀌지 않기, 일반·고급 분리,
   보상(consGrant)의 넘친 몫 보류와 나중 수령, 저장 후 다시 불러와도 같은 판정. 실행: node tools/cons-stack-space-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS_BAG, consUsed, consGrade })');
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; G.data = {}; G.busy = false;
const PRICE = 12;
// 소모품 가방에서 free칸만 비워 둔다(나머지는 다른 소모품으로 채운다). 장비 가방은 늘 비어 있다
function run(id, stacks, free = 0, gold = 10000) {
  const filler = id === 'charm' ? 'knot' : 'charm';
  const fill = Array(Math.max(0, E.CONS_BAG - stacks.length - free)).fill(0).map(() => ({ id: filler, g: 'n', n: E.CONS[filler].max }));
  return { build: 'hunter', p: E.mkPlayer('hunter', {}), phase: 'shop', bag: [], inv: {}, cons: stacks.concat(fill), consV: 3, pouch: {}, gold, stats: {}, shop: { stock: [], cons: [{ id, price: PRICE }], log: [] } };
}
const state = r => JSON.stringify({ cons: r.cons, gold: r.gold, shop: r.shop, pend: r.consPending || [] });
const buy = r => { G.run = r; D.click('consbuy', '0'); };
const mine = (r, id, g) => r.cons.filter(c => c.id === id && (!g || E.consGrade(id, c.g) === g));
let cases = 0, grantCases = 0; const usable = Object.entries(E.CONS).filter(([, d]) => d.use !== 'none');
for (const [id, C] of usable) {
  const M = C.max;
  // 1) 가방이 꽉 찬 채로 부분 묶음의 빈자리만 채운다 (등급 누락 저장본도 일반으로 본다)
  for (const grade of ['n', undefined]) for (let n = 1; n < M; n++) {
    const r = run(id, [{ id, g: grade, n }]), before = state(r);
    assert.equal(E.consSpace(r, id, 'n').capacity, M - n); assert.equal(state(r), before, '공간 조회는 저장본을 바꾸지 않는다');
    for (let k = n; k < M; k++) { buy(r); assert.equal(r.cons[0].n, k + 1); assert.equal(E.consUsed(r), E.CONS_BAG); }
    assert.equal(r.gold, 10000 - PRICE * (M - n)); assert.equal(r.cons[0].g, 'n');
    const full = state(r); buy(r); assert.equal(state(r), full, '공간이 없으면 골드·기록·개수 불변'); cases++;
  }
  // 2) 꽉 찬 묶음 + 빈 칸 하나 → 새 묶음
  { const r = run(id, [{ id, g: 'n', n: M }], 1); buy(r); assert.equal(mine(r, id).length, 2); assert.equal(mine(r, id)[1].n, 1); assert.equal(E.consUsed(r), E.CONS_BAG);
    for (let k = 1; k < M; k++) buy(r); assert.equal(mine(r, id)[1].n, M); assert.equal(r.gold, 10000 - PRICE * M); cases++;
    const restored = JSON.parse(JSON.stringify(r)); assert.equal(E.consSpace(restored, id, 'n').capacity, 0); mine(restored, id)[1].n--; buy(restored); assert.equal(mine(restored, id)[1].n, M); cases++; }
  // 3) 일반·고급은 합치지 않는다
  if (C.vm != null) { const r = run(id, [{ id, g: 'm', n: 1 }]); assert(E.consBuyWhy(r, r.shop.cons[0])); const before = state(r); buy(r); assert.equal(state(r), before); cases++; }
  // 4) 골드가 모자라면 아무것도 바뀌지 않는다
  { const r = run(id, [], 1, PRICE - 1); const before = state(r); buy(r); assert.equal(state(r), before); cases++; }
  // 5) 보상: 빈자리만큼 받고 넘친 몫은 보류, 자리가 나면 받는다
  for (const grade of C.vm != null ? ['n', 'm'] : ['n']) for (let n = 1; n < M; n++) {
    const r = run(id, [{ id, g: grade, n }]);
    assert.equal(E.consGrant(r, id, grade, M - n + 2), 2); assert.equal(r.cons[0].n, M); assert.equal(r.cons[0].g, grade);
    assert.equal(r.consPending[0].n, 2); assert.equal(r.consGainLog[0].received, M - n); assert.equal(r.consGainLog[0].pending, 2);
    const saved = JSON.parse(JSON.stringify(r)); saved.cons[0].n = M - 1; assert.equal(E.consPendingTry(saved), false); assert.equal(saved.cons[0].n, M); assert.equal(saved.consPending[0].n, 1);
    saved.cons[0].n--; assert.equal(E.consPendingTry(saved), true); assert.equal(saved.cons[0].n, M); assert.equal(saved.consPending.length, 0); grantCases++;
  }
  if (C.vm != null) for (const grade of ['n', 'm']) {
    const other = grade === 'n' ? 'm' : 'n', r = run(id, [{ id, g: grade, n: 1 }]);
    assert.equal(E.consSpace(r, id, other).capacity, 0); assert.equal(E.consGrant(r, id, other, 1), 1); assert.equal(r.cons[0].n, 1);
    assert.equal(r.consPending[0].g, other); assert.equal(E.consPendingTry(r), false);
    r.cons.pop(); assert.equal(E.consPendingTry(r), true); const o = mine(r, id, other); assert.equal(o.length, 1); assert.equal(o[0].n, 1); grantCases++;
  }
}
// 약초 25개 = 5칸(무게 1), 상점 표시
{ const herbs = run('herb', Array.from({ length: 5 }, () => ({ id: 'herb', g: 'n', n: 5 }))); assert.equal(E.consUsed(herbs), 5); assert.equal(E.consSpace(herbs, 'herb', 'n').capacity, 0); }
{ const r = run('herb', [], 5); r.ch = 1; r.p.build = 'hunter'; r.eqU = {}; r.cons = Array.from({ length: 5 }, () => ({ id: 'herb', g: 'n', n: 5 })); G.run = r; const html = E.vShop(); assert(html.includes('소모품 가방 5/5칸'), '상점의 소모품 가방 표시'); }
// 옛 즐겨찾기 키(등급 없음)도 산 뒤 일반으로 맞춘다
{ const r = run('herb', [{ id: 'herb', n: 1 }]); r.consFav = ['herb:undefined']; buy(r); assert.equal(r.consFav[0], 'herb:n'); }
console.log(JSON.stringify({ passed: true, items: usable.length, cases, grantCases, total: cases + grantCases }));
