'use strict';
/* 소모품 개편 1단계 점검 (10월 14일): 소모품 가방 분리(5칸)·무게 묶음·전리품 주머니·판매가 10%·옛 저장본 이전.
   실행: node tools/cons-bag-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS_BAG, CONS_SLOT_W, consUsed, pouchN, consSell, consGrade, bagUsed, CONS, consName })'); // const로 선언된 이름을 시험에서 읽게 꺼낸다
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; D.run_('toast = () => {}');
const C = E.CONS; const ok = [];
const mkRun = (cons, gearN) => ({ build: 'hunter', p: E.mkPlayer('hunter', {}), phase: null, bag: Array(gearN || 0).fill(0).map((_, i) => 'g' + i), inv: {}, cons: cons || [], consV: 3, pouch: {}, gold: 0, stats: {} });
const tot = (r, id) => (r.cons || []).filter(c => c.id === id).reduce((s, c) => s + c.n, 0);

// 1. 무게와 묶음 크기
assert.equal(E.CONS_BAG, 5); assert.equal(E.CONS_SLOT_W, 5);
for (const [id, w, max] of [['herb', 1, 5], ['leaf', 1, 5], ['charm', 2, 2], ['flash', 2, 2], ['bellshard', 2, 2], ['cleanse', 2, 2], ['hinder', 2, 2], ['sandbag', 3, 1], ['reliq', 3, 1], ['smokebomb', 5, 1]]) { assert.equal(C[id].w, w, id + ' 무게'); assert.equal(C[id].max, max, id + ' 묶음'); }
for (const [k, d] of Object.entries(C)) { if (d.use === 'none') { assert.equal(d.w, 0); continue; } assert(d.w >= 1 && d.w <= 5, k); assert.equal(d.max, Math.floor(5 / d.w), k + ' 묶음 = ⌊5/무게⌋'); }
ok.push('무게·묶음 ' + Object.keys(C).length + '종');

// 2. 소모품 가방 5칸, 장비 가방과 독립
{ const r = mkRun([], 20); assert.equal(E.bagUsed(r), 20); assert.equal(E.consSpace(r, 'herb', 'n').capacity, 25, '장비 가방이 가득해도 소모품 가방은 비어 있다'); assert.equal(E.consAdd(r, 'herb', 'n', 30), 5); assert.equal(E.consUsed(r), 5); assert.equal(tot(r, 'herb'), 25); assert.equal(E.bagUsed(r), 20); ok.push('가방 분리(약초 25개 = 5칸)'); }
{ const r = mkRun([]); E.consAdd(r, 'charm', 'n', 3); assert.equal(E.consUsed(r), 2); assert.deepEqual(r.cons.map(c => c.n), [2, 1]); assert.equal(E.consSpace(r, 'charm', 'n').capacity, 1 + 3 * 2); ok.push('무게 2는 한 칸에 2개'); }
{ const r = mkRun([]); E.consAdd(r, 'smokebomb', 'n', 2); assert.equal(E.consUsed(r), 2); const left = E.consAdd(r, 'herb', 'n', 20); assert.equal(left, 5); assert.equal(E.consUsed(r), 5); ok.push('무게 5는 한 칸에 1개, 가득 차면 남는 수를 돌려줌'); }
{ const r = mkRun([]); E.consAdd(r, 'flash', 'm', 1); E.consAdd(r, 'flash', 'n', 1); assert.equal(E.consUsed(r), 2, '일반·고급은 따로'); ok.push('등급 분리'); }

// 3. 전리품 주머니
{ const r = mkRun([]); const left = E.consAdd(r, 'silver', 'n', 3); assert.equal(left, 0); assert.equal(E.consUsed(r), 0, '판매품은 칸을 차지하지 않음'); assert.equal(r.pouch.silver, 3); assert.equal(E.pouchN(r), 3);
  E.consGrant(r, 'goblet', 'n', 2); assert.equal(r.pouch.goblet, 2); assert.equal((r.consPending || []).length, 0);
  const s = E.pouchSell(r); assert.equal(s.n, 5); assert.equal(s.gold, C.silver.sell * 3 + C.goblet.sell * 2); assert.equal(r.gold, s.gold); assert.equal(E.pouchN(r), 0); ok.push('주머니(칸 없음, 상점에서 골드)'); }
{ G.run = mkRun([]); const r = G.run; r.ch = 1; r.p.build = 'hunter'; r.inv = {}; r.eqU = {}; E.consAdd(r, 'candlest', 'n', 2); const g0 = r.gold; E.genShop(r); assert.equal(E.pouchN(r), 0); assert.equal(r.gold, g0 + C.candlest.sell * 2); ok.push('상점에 들어가면 주머니를 판다'); }

// 4. 판매가 10%
for (const id of ['herb', 'charm', 'smokebomb', 'flash', 'cleanse']) assert.equal(E.consSell({ id, g: 'n' }), Math.max(1, Math.round(C[id].price * 0.1)), id);
assert.equal(E.consSell({ id: 'silver', g: 'n' }), C.silver.sell); ok.push('판매가 10%(판매품은 정해진 값)');

// 5. 옛 저장본 이전
{ const old = { cons: [{ id: 'herb', g: 'n', n: 5 }, { id: 'herb', g: 'n', n: 5 }, { id: 'herb', g: 'm', n: 3 }, { id: 'charm', g: 'n', n: 3 }, { id: 'silver', g: 'n', n: 4 }, { id: 'flash', g: 'm', n: 3 }, { id: 'smokebomb', g: 'n', n: 2 }], consPending: [{ id: 'ring', g: 'n', n: 1 }, { id: 'dagger', g: 'n', n: 2 }], consFav: ['herb:n'], bag: [], inv: {} };
  const want = { 'herb:n': 16, 'charm:n': 3, 'flash:m': 3, 'smokebomb:n': 2, 'dagger:n': 2 }; // 고급 약초 3개 = 약초 6개
  E.consBagFix(old);
  assert.equal(old.consV, 3); assert(E.consUsed(old) <= 5); assert.equal(old.pouch.silver, 4); assert.equal(old.pouch.ring, undefined); /* A2(10월 22일): 부장품 반지(ring)는 옛 2챕터와 함께 data/archive로 — 이제 버려진다 */
  for (const c of old.cons) assert(c.n <= C[c.id].max, c.id + ' 묶음 초과');
  const got = {}; for (const c of old.cons.concat(old.consPending)) got[c.id + ':' + E.consGrade(c.id, c.g)] = (got[c.id + ':' + E.consGrade(c.id, c.g)] || 0) + c.n;
  assert.deepEqual(got, want, '옮긴 뒤 개수(가방 + 보류)가 같아야 한다');
  assert.equal(JSON.stringify(old.consFav), '["herb:n"]', '즐겨찾기 보존');
  const snap = JSON.stringify(old); E.consBagFix(old); assert.equal(JSON.stringify(old), snap, '두 번 불러도 같다');
  ok.push('옛 저장본 이전(개수 보존, 넘친 몫은 보류, 즐겨찾기 보존, 반복 안전)'); }
// 6. 4단계: 없앤 소모품은 합쳐지는 소모품으로, 갈 곳이 없으면 골드로
{ const old = { consV: 2, gold: 100, cons: [{ id: 'bread', g: 'm', n: 3 }, { id: 'bandage', g: 'n', n: 2 }, { id: 'stone', g: 'n', n: 1 }, { id: 'sap', g: 'n', n: 2 }], consPending: [{ id: 'whet', g: 'n', n: 1 }, { id: 'compass', g: 'n', n: 1 }], consFav: ['bread:m', 'stone:n', 'sap:n'], pouch: { silver: 1 }, shop: { cons: [{ id: 'bread', price: 10 }, { id: 'herb', price: 12 }] }, bag: [], inv: {} };
  E.consBagFix(old); assert.equal(old.consV, 3);
  const got = {}; for (const c of old.cons.concat(old.consPending)) got[c.id] = (got[c.id] || 0) + c.n;
  assert.equal(JSON.stringify(got), JSON.stringify({ herb: 3, cleanse: 2, hookrope: 1, chalk: 1 }), JSON.stringify(got));
  assert.equal(old.gold, 100 + Math.round(14 * 0.1) * 2 + Math.round(12 * 0.1), '선인장 수액 2개 · 사막 나침반 1개는 판매가만큼 골드');
  assert.equal(JSON.stringify(old.consFav), JSON.stringify(['herb:n', 'hookrope:n']), '즐겨찾기도 옮기고 갈 곳 없는 것은 뺀다');
  assert.equal(JSON.stringify(old.shop.cons.map(x => x.id)), '["herb"]', '상점 진열에서 없앤 소모품을 뺀다');
  assert.equal(old.consRetireLog[0].items.length, 6); assert.equal(E.consName({ id: 'bread', g: 'n' }), '마른 빵', '지난 기록은 옛 이름');
  const snap = JSON.stringify(old); E.consBagFix(old); assert.equal(JSON.stringify(old), snap, '두 번 불러도 같다');
  ok.push('4단계 이전(합치기 · 골드 · 즐겨찾기 · 상점 진열 · 옛 이름)'); }
assert.equal(Object.keys(C).filter(k => C[k].use !== 'none').length, 24, '소모품 24종'); ok.push('24종'); // A2 · A3(10월 22일): 2챕터 셋 · 3챕터 셋이 들고 옛 2 · 3챕터 것이 빠져 20 → 24

console.log('소모품 가방 1단계 점검 통과: ' + ok.join(' · '));
