'use strict';
/* 상점 소모품 재고 점검 (10월 14일 개편 5-2, 설계안 6절): 약초 재고 5개(가혹 3개), 다른 소모품 4종은 종류마다 2개,
   다 팔리면 못 사고, N개 사기도 재고를 넘지 않는다. 실행: node tools/cons-shop-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS })'); E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; D.run_('toast = () => {}'); G.data = {};
const ok = [];
const mk = (mode, ch) => { const run = { build: 'hunter', mode, ch: ch || 1, p: E.mkPlayer('hunter', {}), bag: [], inv: {}, cons: [], consV: 3, pouch: {}, gold: 5000, eqU: {}, stats: {}, rooms: [] }; G.run = run; E.genShop(run); run.phase = 'shop'; return run; };
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
// 야영지 정비(5-3): 물가 1.2에서 1.8배, 약초 + 3종, 판매품은 들어갈 때 골드로, 쉬어도 남고 직접 떠난다
{ const muls = new Set(); for (let i = 0; i < 300; i++) { const run = mk('normal', 1); run.phase = null; run.room = 12; run.camp = null; const C = E.campInit(run); muls.add(C.mul); assert(C.mul >= 1.2 && C.mul <= 1.8); assert.equal(C.cons.length, 4); assert.equal(C.cons[0].left, 5); assert(C.cons.slice(1).every(x => x.left === 1)); for (const x of C.cons) assert.equal(x.price, Math.round(E.CONS[x.id].price * C.mul)); }
  assert.equal(muls.size, 7, '1.2에서 1.8까지 일곱 단계'); }
{ const run = mk('hard', 2); run.phase = null; run.room = 12; run.camp = null; run.pouch = { silver: 2 }; const g0 = run.gold; const C = E.campInit(run); assert.equal(C.cons[0].left, 3, '가혹 약초 3'); assert.equal(run.gold, g0 + E.CONS.silver.sell * 2, '판매품을 판다'); assert.equal(E.campInit(run), C, '같은 야영지에서는 다시 만들지 않는다');
  const x = C.cons[1]; assert.equal(E.consBuyWhy(run, x), ''); assert.equal(E.consBuy(run, x), ''); assert.equal(x.left, 0); assert.equal(E.consBuyWhy(run, x), '다 팔렸습니다'); assert.equal(C.log.length, 1, '야영지 기록');
  G.run = run; run.cur = { type: 'camp', floor: 12 }; const p = run.p; p.hp = 1; const lf = p.flask.life = 0; D.run_('roomDef = () => G.run.cur; advanceFloor = () => { G.run.left = 1 }; awkOpen = () => {}'); E.ask = () => false;
  D.click('rest'); assert.equal(p.hp, Math.min(p.hpMax, 1 + p.hpMax * D.run_('CAMP_REST.hp')), '0.8.0 6단계: 쉬기는 최대 생명력의 CAMP_REST.hp만큼'); assert.equal(C.rested, 1); assert(!run.left, '쉬어도 떠나지 않는다'); const hp = p.hp; D.click('rest'); assert.equal(C.rested, 1, '두 번 쉬지 않는다');
  D.click('campleave'); assert.equal(run.left, 1, '떠난다'); assert.equal(run.camp, null); assert.equal(run.campHist.length, 1); assert(run.rooms.some(r => r.type === 'camp' && r.rested === 1)); }
{ const run = mk('normal', 1); run.phase = null; run.room = 12; run.camp = null; G.run = run; run.cur = { type: 'camp', floor: 12 }; E.campInit(run); delete run.left; E.ask = () => false; D.click('campleave'); assert(!run.left, '쉬지 않고 떠나려면 묻고, 취소하면 남는다'); E.ask = () => true; D.click('campleave'); assert.equal(run.left, 1); }
ok.push('야영지 물가 · 진열 · 판매품 · 쉬기 · 떠나기');
console.log('상점 재고 점검 통과: ' + ok.join(' · '));
