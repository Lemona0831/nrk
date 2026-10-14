'use strict';
/* 소모품 창 점검 (10월 14일 개편): 같은 종류는 한 줄로 합치되 칸 수와 칸마다 든 수가 보이고, 쓰기는 가장 적게 든 칸부터 덜며,
   줄을 펼쳐야 즐겨찾기·칸별 버리기가 나온다. 맨 위 가방 칸 그림은 칸마다 하나씩, 빈 칸까지 CONS_BAG개.
   실행: node tools/cons-sheet-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS_BAG, CONS })');
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; E.ask = () => true; D.run_('toast = () => {}');
const run = { build: 'hunter', p: E.mkPlayer('hunter', {}), bag: [], inv: {}, cons: [], consV: 3, pouch: {}, gold: 0, stats: {}, rooms: [] };
E.initGear(run); G.run = run; G.data = {}; G.b = null;
E.consAdd(run, 'herb', 'n', 8); E.consAdd(run, 'flash', 'n', 2); run.p.hp = 1;
const sheet = () => E.sheetParts(G.sheet)[1];
G.sheet = { kind: 'cons', data: {} };
let h = sheet(); const ok = [];
// 1. 가방 칸 그림: 칸마다 하나, 빈 칸까지 5개
assert.equal((h.match(/class="cc[ "]/g) || []).length, E.CONS_BAG); assert.equal((h.match(/cc e"/g) || []).length, E.CONS_BAG - run.cons.length);
assert(h.includes('가방 3/5칸')); assert(h.includes('<small>5/5</small>') && h.includes('<small>3/5</small>')); ok.push('가방 칸 그림');
// 2. 약초 두 칸이 한 줄, 칸 수와 칸마다 든 수
assert.equal((h.match(/data-a="consrow"/g) || []).length, 2, '종류마다 한 줄'); assert(h.includes('약초 묶음 ×8')); assert(h.includes('2칸 · 5/5 · 3/5')); ok.push('한 줄 + 칸 표시');
// 3. 쓰기는 가장 적게 든 칸부터
const small = run.cons.findIndex(c => c.id === 'herb' && c.n === 3); assert(h.includes(`data-a="consuse" data-k="${small}"`)); D.click('consuse', String(small));
assert.deepEqual(run.cons.filter(c => c.id === 'herb').map(c => c.n), [5, 2]); ok.push('적게 든 칸부터 덜기');
// 4. 펼치기 전에는 즐겨찾기·버리기가 없다, 펼치면 칸마다 버리기
h = sheet(); assert(!h.includes('data-a="consfav"') && !h.includes('data-a="consdiscard"'));
run.cons.forEach(c => c.fresh = true); D.click('consrow', 'herb:n'); h = sheet();
assert(run.cons.filter(c => c.id === 'herb').every(c => !c.fresh), '펼치면 새로 얻음 표시를 지운다'); assert(run.cons.find(c => c.id === 'flash').fresh, '다른 종류는 그대로');
assert.equal((h.match(/data-a="consdiscard"/g) || []).length, 2); assert(h.includes('1번 칸 · 5/5개') && h.includes('2번 칸 · 2/5개')); assert(h.includes('data-a="consfav"')); ok.push('펼침: 즐겨찾기·칸별 버리기');
D.click('consdiscard', String(run.cons.findIndex(c => c.id === 'herb' && c.n === 2))); assert.deepEqual(run.cons.filter(c => c.id === 'herb').map(c => c.n), [5]); ok.push('한 칸만 버리기');
D.click('consrow', 'herb:n'); assert.equal(G.sheet.data.open, null); ok.push('다시 누르면 접힘');
// 5. 찾기는 🔍를 눌러야 나온다
assert(!sheet().includes('id="consquery"')); D.click('consfind'); assert(sheet().includes('id="consquery"')); D.click('consfind'); assert(!sheet().includes('id="consquery"')); ok.push('찾기 접기');
// 6. 전투 중: 대상이 여럿이면 펼친 줄에만 대상 칩, 버리기는 잠김
const b = E.roomBattle(run.p, { ch: 1, lv: 1, en: [['bruiser', 0], ['bruiser', 0]] }, null, 1); b.queue = ['p']; G.b = b; G.sheet = { kind: 'cons', data: {} };
h = sheet(); assert(!h.includes('data-a="constarget"')); assert(h.includes('이번 차례 0/'));
D.click('consrow', 'flash:n'); h = sheet(); const fl = E.CONS.flash;
if (fl.tgt === 'enemy' && E.consTargets(b, fl).length > 1) assert(h.includes('data-a="constarget"'), '펼친 줄의 대상 칩');
assert(/data-a="consdiscard"[^>]*disabled/.test(h), '전투 중 버리기 잠김'); ok.push('전투 중 대상·버리기');
console.log('소모품 창 점검 통과: ' + ok.join(' · '));
