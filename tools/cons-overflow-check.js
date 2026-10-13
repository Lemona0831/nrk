'use strict';
/* 소모품이 넘칠 때(보류 보상) 점검. 10월 14일 개편 1단계로 다시 썼다: 소모품 가방(5칸)이 장비 가방과 나뉘어,
   넘친 소모품은 기존 소모품 묶음을 버리거나 두고 가는 것으로만 해결한다. 장비를 버리는 경로는 막혀 있어야 한다.
   실행: node tools/cons-overflow-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS_BAG, consUsed })');
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; E.ask = () => true;
const run = { build: 'hunter', p: E.mkPlayer('hunter', {}), bag: [], cons: [], consV: 3, pouch: {}, swaps: [], rooms: [], drops: [] };
E.initGear(run); G.run = run; G.data = {}; G.b = null;
for (const id of ['charm', 'knot', 'hookrope', 'chalk', 'hinder']) E.consAdd(run, id, 'n', E.CONS[id].max);
assert.equal(E.consUsed(run), E.CONS_BAG);
const gear0 = run.bag.length; E.addItem(run, E.mkItem('cloak')); const lockedGear = run.bag[run.bag.length - 1];
assert.equal(E.consGrant(run, 'herb', 'n', 2), 2, '가방이 차면 보류'); assert.equal(run.consPending[0].n, 2);
// 장비를 버리는 경로는 막혀 있다(장비만 잃지 않게)
G.sheet = { kind: 'consfull', data: {} }; D.click('cpreplace', lockedGear, { s: 'gear' });
assert.equal(run.bag.length, gear0 + 1, '장비가 그대로'); assert.equal(run.consPending[0].n, 2);
// 이어 하기에서도 보류가 남는다
G.run = JSON.parse(JSON.stringify(run)); G.sheet = { kind: 'consfull', data: {} };
E.ask = () => false; D.click('cpreplace', '0', { s: 'cons' }); assert.equal(G.run.cons[0].id, 'charm', '확인을 취소하면 그대로');
E.ask = () => true; D.click('cpreplace', '0', { s: 'cons' });
assert(G.run.cons.some(c => c.id === 'herb' && c.n === 2), '묶음을 버리고 약초를 챙김'); assert(!G.run.cons.some(c => c.id === 'charm')); assert.equal(G.run.consPending.length, 0);
assert.equal(E.consGrant(G.run, 'herb', 'n', 1), 0); assert(G.run.cons.some(c => c.id === 'herb' && c.n === 3), '가득 차도 같은 묶음에 합친다');
E.consGrant(G.run, 'cleanse', 'n', 1); G.sheet = { kind: 'consfull', data: {} }; D.click('cpskip');
assert.equal(G.run.consPending.length, 0); assert(!G.run.cons.some(c => c.id === 'cleanse'), '두고 가기');
// 판매품은 넘치지 않고 주머니로
assert.equal(E.consGrant(G.run, 'silver', 'n', 3), 0); assert.equal(G.run.pouch.silver, 3); assert.equal(G.run.consPending.length, 0);
console.log('소모품 보류·저장 복원·장비 버리기 차단·확인 취소·묶음 교체·합치기·두고 가기·판매품 주머니 통과');
