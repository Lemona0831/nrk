'use strict';
/* 상점 소모품 재고 점검 (10월 14일 개편 5-2, 설계안 6절): 약초 재고 5개(가혹 3개), 다른 소모품 4종은 종류마다 2개,
   다 팔리면 못 사고, N개 사기도 재고를 넘지 않는다. 실행: node tools/cons-shop-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS })'); E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; D.run_('toast = () => {}'); G.data = {};
const ok = [];
const mk = (mode, ch) => { const run = { build: 'hunter', mode, ch: ch || 1, p: E.mkPlayer('hunter', {}), bag: [], inv: {}, cons: [], consV: 3, pouch: {}, gold: 5000, eqU: {}, stats: {} }; G.run = run; E.genShop(run); run.phase = 'shop'; return run; };
for (const [mode, herbN] of [['normal', 5], ['hard', 3]]) for (const ch of [1, 2, 3]) {
  const run = mk(mode, ch), C = run.shop.cons; assert.equal(C.length, 5, '약초 + 4종'); assert.equal(C[0].id, 'herb'); assert.equal(C[0].left, herbN, mode + ' 약초 재고');
  assert(C.slice(1).every(x => x.left === 2), '다른 소모품 2개'); assert.equal(new Set(C.map(x => x.id)).size, 5, '겹치지 않는다');
}
ok.push('진열 5종 · 약초 5/3 · 다른 것 2');
{ const run = mk('hard', 1); const x = run.shop.cons[0]; assert.equal(E.consFillN(run, x), 3, 'N개 사기는 재고까지'); for (let i = 0; i < 3; i++) assert.equal(E.consBuy(run, x), ''); assert.equal(x.left, 0); assert.equal(E.consBuy(run, x), '다 팔렸습니다'); assert.equal(E.consFillN(run, x), 0);
  const y = run.shop.cons[1]; assert.equal(E.consBuy(run, y), ''); assert.equal(E.consBuy(run, y), ''); assert.equal(E.consBuyWhy(run, y), '다 팔렸습니다'); assert(E.vShop().includes('남은 0개')); }
ok.push('다 팔림 · N개 사기 상한 · 표시');
{ const run = mk('normal', 1); run.shop.cons = [{ id: 'herb', price: 12 }]; assert.equal(E.consBuyWhy(run, run.shop.cons[0]), '', '옛 저장본 진열(재고 없음)은 그대로 산다'); }
ok.push('옛 진열 호환');
console.log('상점 재고 점검 통과: ' + ok.join(' · '));
