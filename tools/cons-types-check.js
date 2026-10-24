'use strict';
/* 소모품 20종 정리 점검 (10월 14일 개편 4단계): 새 소모품(정화 약 · 방해 부적), 챕터 전용 드롭(석회 가루 2챕터 · 거울 조각 3챕터),
   코드가 이름으로 주는 소모품이 모두 있는지. 실행: node tools/cons-types-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), fs = require('fs'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS, CONS_GONE })'); /* M8(10월 23일): FIRST_GIFT3 · 석회 가루 · 거울 조각은 옛 2 · 3챕터와 함께 data/archive로(A2 · A3). 새 챕터 소모품 기준으로 고쳤다 */ E.render = () => { }; G.data = {};
const ok = [];
const mk = (en, ch) => { const p = E.mkPlayer('warden', {}); p.hp = p.hpMax = 9999; const run = { build: 'warden', p, cons: [], bag: [], inv: {}, ch: ch || 1 }; const b = E.roomBattle(p, { ch: ch || 1, lv: 1, en: en || [['bruiser', 0]] }, null, 3); b.queue = ['p']; G.b = b; G.run = run; return { b, run, p }; };
// 1. 정화 약: 가장 많이 쌓인 해로운 상태 하나를 2 줄인다
{ const { b, run, p } = mk(); assert.equal(E.consWhyNot(b, run, { id: 'cleanse', g: 'n', n: 1 }), '해로운 상태가 없습니다');
  E.addS(b, p, 'bleed', 2); E.addS(b, p, 'poison', 5); const poison0 = E.st(p, 'poison'), bleed0 = E.st(p, 'bleed');
  assert.equal(E.consWhyNot(b, run, { id: 'cleanse', g: 'n', n: 1 }), ''); E.consApply(b, run, { id: 'cleanse', g: 'n' }, null);
  assert.equal(E.st(p, 'poison'), poison0 - 2, '많이 쌓인 중독을 2 줄인다'); assert.equal(E.st(p, 'bleed'), bleed0, '다른 상태는 그대로'); }
ok.push('정화 약');
// 2. 방해 부적: 치유하는 적 · 소환하는 적만 고르고 다음 치유/소환을 막는다
{ const { b, run } = mk([['bruiser', 0], ['healer', 1]]); const ts = E.consTargets(b, E.CONS.hinder); assert(ts.length === 1 && ts[0].role === 'healer', '치유하는 적만');
  E.consApply(b, run, { id: 'hinder', g: 'n' }, ts[0]); assert.equal(ts[0].noHeal, 1); assert.equal(E.consTargets(b, E.CONS.hinder).length, 0, '이미 막힌 적은 다시 고르지 않는다'); }
{ const { b, run } = mk([['bruiser', 0], ['summoner', 1]]); const t = E.consTargets(b, E.CONS.hinder)[0]; assert(t && t.role === 'summoner'); E.consApply(b, run, { id: 'hinder', g: 'n' }, t); assert.equal(t.noSummon, 1); }
{ const { b, run } = mk([['bruiser', 0]]); assert(E.consWhyNot(b, run, { id: 'hinder', g: 'n', n: 1 }), '대상이 없으면 못 쓴다'); }
ok.push('방해 부적');
// 3. 챕터 전용은 그 챕터에서만 떨어진다
for (const ch of [1, 2, 3]) {
  const { b } = mk([['bruiser', 0]], ch); const seen = new Set(); let s = 1; b.rngF = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 3000; i++) { b.drops = []; const e = Object.assign({}, b.en[0], { elite: 1 }); E.rollDrops0(b, e); for (const d of b.drops) if (d.cons) seen.add(d.cons); }
  assert.equal(seen.has('smokecan'), ch >= 2, ch + '챕터 연막탄(2챕터부터)'); assert.equal(seen.has('flare'), ch === 3, ch + '챕터 신호탄(3챕터만)');
  for (const id of seen) assert(E.CONS[id], '없는 소모품이 떨어짐: ' + id);
}
ok.push('챕터 전용 드롭');
// 4. 코드가 이름으로 주는 소모품, 처음 만난 방 보상, 없앤 소모품의 행선지가 모두 있다
const src = ['js/80-events.js', 'js/44-screens-account.js', 'js/66-dungeon-flow.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
for (const m of src.matchAll(/cons(?:Grant|Add)\([^,]+,\s*'([a-z]+)'/g)) assert(E.CONS[m[1]], '코드가 주는 소모품이 없음: ' + m[1]);
for (const [id, [, to]] of Object.entries(E.CONS_GONE)) { assert(!E.CONS[id], '없앤 소모품이 남아 있음: ' + id); if (to) assert(E.CONS[to], id + ' → 없는 소모품 ' + to); }
assert(E.CONS.herb.vm == null, '고급 약초 없음');
ok.push('이름 참조 · 행선지');
// 5. 상점: 챕터 전용은 다음 챕터 것만, 모래 주머니는 드물게(만든 사람 결정: 끄기는 두고 등장률을 낮춘다)
{ let sand = 0, lime3 = 0, N = 400; for (let i = 0; i < N; i++) for (const ch of [1, 2]) { const run = { ch, mode: 'normal', p: E.mkPlayer('hunter', {}), build: 'hunter', bag: [], inv: {}, cons: [], eqU: {}, gold: 0, pouch: {} }; G.run = run; E.genShop(run); const ids = run.shop.cons.map(x => x.id); if (ids.includes('sandbag')) sand++; if (ch === 1 && ids.includes('flare')) lime3++; }
  assert.equal(lime3, 0, '1챕터 끝 상점(다음은 2챕터)은 3챕터 전용 신호탄을 팔지 않는다'); const rate = sand / (N * 2); assert(rate > 0.015 && rate < 0.4, '모래 주머니 상점 진열률 ' + rate); } // A2 · A3로 진열 후보가 늘어 진열률이 4–5%대로 내려왔다(하한 5% → 1.5%)
assert.equal(E.CONS.sandbag.dw, 0.2);
ok.push('상점 진열 · 모래 주머니 등장률');
console.log('소모품 20종 정리 점검 통과: ' + ok.join(' · '));
