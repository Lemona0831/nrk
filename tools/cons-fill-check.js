'use strict';
/* 상점 소모품 "N개 사기" 점검 (10월 14일): 부분 묶음의 빈자리 또는 한 묶음을 한 번에 사되,
   골드·가방 공간을 넘지 않고, 실패하면 아무것도 바뀌지 않으며, 구매 기록은 한 개씩 남는지 본다.
   10월 14일 개편 1단계: 소모품 가방(CONS_BAG칸)이 장비 가방과 나뉘어, 빈칸은 다른 소모품으로 채워 만든다.
   실행: node tools/cons-fill-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS_BAG, consUsed })');
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; G.data = {}; G.busy = false;
const PRICE = 12;
function run(id, stacks, free = 0, gold = 10000) { const filler = id === 'stone' ? 'crowbar' : 'stone'; const fillers = Array(Math.max(0, E.CONS_BAG - stacks.length - free)).fill(0).map(() => ({ id: filler, g: 'n', n: E.CONS[filler].max })); return { build: 'hunter', p: E.mkPlayer('hunter', {}), phase: 'shop', bag: [], inv: {}, cons: stacks.concat(fillers), consV: 2, pouch: {}, gold, stats: {}, shop: { stock: [], cons: [{ id, price: PRICE }], log: [] } }; }
const mine = (r, id) => r.cons.filter(c => c.id === id);
const state = r => JSON.stringify({ cons: r.cons, bag: r.bag, gold: r.gold, shop: r.shop });
const fill = r => { G.run = r; D.click('consbuyfill', '0'); };
const total = (r, id) => r.cons.filter(c => c.id === id).reduce((n, c) => n + c.n, 0);
let cases = 0;
for (const [id, C] of Object.entries(E.CONS).filter(([, d]) => d.use !== 'none')) {
  const M = C.max;
  // 1) 빈 가방: 새 묶음 한 칸을 가득 채운다
  { const r = run(id, [], 1); const x = r.shop.cons[0]; assert.equal(E.consFillN(r, x), M);
    if (M >= 2) assert(E.consFillBtn(r, x, 0).includes('consbuyfill') && E.consFillBtn(r, x, 0).includes(M + '개 사기'));
    fill(r); assert.equal(total(r, id), M); assert.equal(mine(r, id).length, 1); assert.equal(r.gold, 10000 - PRICE * M); assert.equal(r.shop.log.filter(x => x.a === 'consbuy').length, M, '기록은 한 개씩'); cases++; }
  // 2) 부분 묶음: 그 묶음의 빈자리만 채운다 (가방 칸을 더 쓰지 않는다)
  for (let n = 1; n < M - 1; n++) { const r = run(id, [{ id, g: 'n', n }], 1); fill(r); assert.equal(r.cons[0].n, M); assert.equal(mine(r, id).length, 1); assert.equal(E.consUsed(r), E.CONS_BAG - 1); assert.equal(r.gold, 10000 - PRICE * (M - n)); cases++; }
  // 3) 빈자리가 1개뿐이면 버튼이 없다
  if (M >= 2) { const r = run(id, [{ id, g: 'n', n: M - 1 }]); assert.equal(E.consFillN(r, r.shop.cons[0]), 1); assert.equal(E.consFillBtn(r, r.shop.cons[0], 0), ''); cases++; }
  // 4) 골드가 모자라면 가진 만큼만
  if (M >= 3) { const r = run(id, [], 1, PRICE * 2 + 5); fill(r); assert.equal(total(r, id), 2); assert.equal(r.gold, 5); cases++; }
  // 5) 골드가 한 개 값도 안 되면 아무것도 바뀌지 않는다
  { const r = run(id, [], 1, PRICE - 1); const before = state(r); fill(r); assert.equal(state(r), before); cases++; }
  // 6) 가방이 가득 차고 묶음도 가득이면 아무것도 바뀌지 않는다
  { const r = run(id, [{ id, g: 'n', n: M }]); const before = state(r); assert.equal(E.consFillN(r, r.shop.cons[0]), 0); fill(r); assert.equal(state(r), before); cases++; }
  // 7) 일반·고급은 합치지 않는다: 고급 묶음만 부분이고 빈 칸이 없으면 못 산다
  if (C.vm != null && M >= 2) { const r = run(id, [{ id, g: 'm', n: 1 }]); const before = state(r); fill(r); assert.equal(state(r), before); cases++; }
  // 8) 상점이 아닐 때는 사지 못한다
  { const r = run(id, [], 1); r.phase = 'run'; const before = state(r); fill(r); assert.equal(state(r), before); cases++; }
}
console.log('상점 소모품 N개 사기: 새 묶음·부분 묶음·골드 부족·공간 없음·일반/고급 분리·상점 밖 차단, 구매 기록 한 개씩 (' + cases + '조건, 판매품 뺀 소모품 ' + Object.values(E.CONS).filter(d => d.use !== 'none').length + '종) 통과');
