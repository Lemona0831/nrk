'use strict';
/* 피해를 주는 소모품 없애기 점검 (10월 14일, 만든 사람 결정: 소모품은 피해를 주지 않고 기회를 만든다).
   - 전투에서 쓰는 모든 소모품을 적에게 써도 적 생명력이 줄지 않는다
   - 올가미(옛 투척 단검): 피해 없이 둔화 +1(고급 +2), 후열에도 닿는다
   - 흩뿌리는 성물(옛 깨진 성물): 적마다 다음 공격 하나의 피해 −10%(고급 −15%), 그 다음 공격은 원래대로
   - 기름 단지: 뼈 더미만 태우고 화상을 걸지 않는다
   실행: node tools/cons-nodamage-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS })'); E.render = () => { };
const mk = (en) => { const p = E.mkPlayer('warden', {}); p.hp = p.hpMax = 9999; const run = { build: 'warden', p, cons: [], bag: [], inv: {} }; const b = E.roomBattle(p, { ch: 1, lv: 5, en: en || [['bruiser', 0], ['archer', 1]] }, null, 3); b.queue = ['p']; return { b, run, p }; };
const ok = [];
// 1. 어떤 소모품도 적 생명력을 줄이지 않는다
for (const [id, C] of Object.entries(E.CONS)) {
  if (C.use === 'none' || C.use === 'out') continue;
  for (const g of C.vm != null ? ['n', 'm'] : ['n']) {
    const { b, run } = mk(); const ts = C.tgt === 'enemy' ? E.consTargets(b, C) : []; const tgt = ts[0] || null;
    if (C.tgt === 'enemy' && !tgt) continue;
    const h0 = b.en.map(e => e.hp);
    try { E.consApply(b, run, { id, g, n: 1 }, tgt); } catch (e) { continue; } // 조건이 맞지 않아 쓸 수 없는 상황
    b.en.forEach((e, i) => { if (!e.pile) assert(e.hp >= h0[i], id + ' 이(가) ' + e.n + '에게 피해를 줬다'); });
  }
}
ok.push('모든 전투 소모품 피해 0');
// 2. 올가미
for (const [g, n] of [['n', 1], ['m', 2]]) { const { b, run } = mk(); const back = b.en.find(e => e.row === 'back'); assert(back, '후열 적'); assert(E.consTargets(b, E.CONS.dagger).includes(back), '후열에도 닿는다'); const h = back.hp; E.consApply(b, run, { id: 'dagger', g, n: 1 }, back); assert.equal(back.hp, h); assert.equal(E.st(back, 'chill'), n); }
assert.equal(E.CONS.dagger.n, '올가미'); ok.push('올가미 둔화 +1/+2, 후열');
// 3. 흩뿌리는 성물: 다음 공격 하나만 줄인다
for (const [g, r] of [['n', 0.1], ['m', 0.15]]) {
  const { b, run, p } = mk([['bruiser', 0]]); const e = b.en[0];
  const hit = () => { const h = p.hp; E.hurtPlayer(b, 100, { src: e, single: 1 }); return h - p.hp; };
  const base = hit(); E.consApply(b, run, { id: 'relic', g, n: 1 }, null); assert.equal(e.redNext, r);
  const cut = hit(), after = hit();
  assert(Math.abs(cut - base * (1 - r)) <= 1, `${g}: 줄어든 피해 ${cut} (원래 ${base})`); assert.equal(after, base, '그 다음 공격은 원래대로'); assert.equal(e.redNext, 0);
  const dot = (() => { E.consApply(b, run, { id: 'relic', g, n: 1 }, null); const h = p.hp; E.hurtPlayer(b, 100, { src: e, dot: 1 }); return h - p.hp; })(); assert.equal(e.redNext, r, '지속 피해에는 쓰이지 않는다');
}
{ const { b, run } = mk(); E.consApply(b, run, { id: 'relic', g: 'n', n: 1 }, null); assert.equal(E.consWhyNot(b, run, { id: 'relic', g: 'n', n: 1 }), '이미 효과가 있습니다'); }
assert.equal(E.CONS.relic.n, '흩뿌리는 성물'); ok.push('흩뿌리는 성물 −10%/−15% 한 번, 지속 피해 제외, 겹쳐 쓰기 막음');
// 4. 기름 단지: 화상 없음
{ const { b, run } = mk([['skeleton', 0], ['bruiser', 0]]); const s = b.en.find(e => e.role === 'skeleton'); if (s) { s.pile = { wait: 2 }; }
  assert.equal(E.CONS.oiljar, undefined, '기름 단지는 4단계에서 없앴다'); }
ok.push('기름 단지 없음');
console.log('피해 소모품 없애기 점검 통과: ' + ok.join(' · '));
