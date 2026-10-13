'use strict';
/* 소모품 사용 규칙 점검 (10월 14일 개편 2단계): 한 차례 1개, 한 전투 5개(가혹 3개), 넉넉한 손은 한 전투 +2,
   방 특성 끄기 · 전리품 늘리기 챕터당 3번(가혹 2번), 연기 폭탄 챕터당 2번(가혹 1번), 챕터가 바뀌면 다시 센다.
   실행: node tools/cons-rules-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS, CONS_TURN, CONS_FIGHT, CONS_CH, consFightOf, consChUsed, consChLim })');
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; D.run_('toast = () => {}'); E.checkEnd = () => { }; G.data = {};
const ok = [];
assert.equal(E.CONS_TURN, 1); assert.equal(JSON.stringify(E.CONS_FIGHT), JSON.stringify({ normal: 5, hard: 3 }));
function setup(mode, awk) {
  const p = E.mkPlayer('warden', {}); p.hp = p.hpMax = 9999; p.awk = awk || [];
  const run = { build: 'warden', mode, ch: 1, p, cons: [], consV: 3, pouch: {}, bag: [], inv: {}, room: 1 };
  E.consAdd(run, 'flash', 'n', 2); E.consAdd(run, 'flash', 'n', 2); E.consAdd(run, 'flash', 'n', 2); E.consAdd(run, 'flash', 'n', 2); E.consAdd(run, 'flash', 'n', 2);
  const b = E.roomBattle(p, { ch: 1, lv: 1, en: [['bruiser', 0], ['bruiser', 0]] }, null, 3); b.queue = ['p']; G.b = b; G.run = run;
  return { p, run, b };
}
const useFlash = (b, run) => E.consUse(b, run, run.cons.findIndex(c => c.id === 'flash'), null);
const nextTurn = b => { b.consN = 0; };
// 1. 한 차례 1개
{ const { b, run } = setup('normal'); assert.equal(useFlash(b, run), ''); assert.equal(useFlash(b, run), '이번 차례에 1개를 썼습니다'); assert.equal(b.consF, 1); ok.push('차례당 1개'); }
// 2. 한 전투 5개 / 가혹 3개 / 넉넉한 손 +2
for (const [mode, awk, cap] of [['normal', [], 5], ['hard', [], 3], ['normal', ['a_pouch'], 7], ['hard', ['a_pouch'], 5]]) {
  const { b, run, p } = setup(mode, awk); assert.equal(E.consFightOf(p, run), cap, mode + ' ' + awk);
  for (let i = 0; i < cap; i++) { assert.equal(useFlash(b, run), '', mode + ' ' + (i + 1) + '번째'); nextTurn(b); }
  assert.equal(useFlash(b, run), '이번 전투에 ' + cap + '개를 모두 썼습니다'); assert.equal(b.consF, cap);
  const b2 = E.roomBattle(p, { ch: 1, lv: 1, en: [['bruiser', 0]] }, null, 4); b2.queue = ['p']; assert.equal(useFlash(b2, run), '', '다음 전투는 다시 0부터');
}
ok.push('전투당 5/3, 넉넉한 손 7/5, 다음 전투 초기화');
// 3. 챕터당 횟수: 전리품 늘리기
for (const [mode, lim] of [['normal', 3], ['hard', 2]]) {
  const { p, run } = setup(mode); run.cons = []; E.consAdd(run, 'reliq', 'n', 4);
  const fight = () => { const b = E.roomBattle(p, { ch: 1, lv: 1, en: [['bruiser', 0]] }, null, 5); b.queue = ['p']; return E.consUse(b, run, run.cons.findIndex(c => c.id === 'reliq'), null); };
  for (let i = 0; i < lim; i++) assert.equal(fight(), '', mode + ' 성물함 ' + (i + 1));
  assert.equal(fight(), '이번 챕터에 ' + lim + '번을 모두 썼습니다'); assert.equal(E.consChUsed(run, E.CONS.reliq), lim);
  run.ch = 2; assert.equal(E.consChUsed(run, E.CONS.reliq), 0, '챕터가 바뀌면 0'); assert.equal(fight(), '', '새 챕터에서 다시 쓴다');
}
ok.push('전리품 늘리기 챕터당 3/2, 챕터 초기화');
// 4. 연기 폭탄 2/1, 방 특성 끄기는 종류(모래 주머니 · 등잔 기름)를 합쳐 센다
assert.equal(E.consChLim({ mode: 'normal' }, E.CONS.smokebomb), 2); assert.equal(E.consChLim({ mode: 'hard' }, E.CONS.smokebomb), 1);
{ const run = { mode: 'normal', ch: 1, consCh: { ch: 1, unmod: 3 } }; assert.equal(E.consChUsed(run, E.CONS.sandbag), 3); assert(E.CONS.sandbag.mods.includes('dark'), '어둠도 모래 주머니로'); }
assert.equal(E.consChLim({}, E.CONS.herb), 0, '약초는 챕터 제한 없음'); ok.push('연기 폭탄 2/1, 방 특성 끄기 합산');
// 5. 화면: 소모품 창 머리와 빠른 사용 줄
{ const { b, run } = setup('hard'); run.cons.pop(); G.sheet = { kind: 'cons', data: {} }; const h = E.sheetParts(G.sheet)[1]; assert(h.includes('이번 차례 0/1개') && h.includes('이번 전투 0/3개'));
  E.consAdd(run, 'reliq', 'n', 1); const h2 = E.sheetParts(G.sheet)[1]; assert(h2.includes('이번 챕터 0/2번'), '횟수 제한 소모품 줄');
  const q = E.consQuick(b, { qcons: 1 }); assert(q.includes('전투 0/3')); ok.push('창 머리·줄·빠른 사용 줄 표시'); }
// 6. 각인 설명
assert(D.run_("AWK_MAP.a_pouch.d").includes('한 전투') || D.run_("(typeof AWK_MAP !== 'undefined' ? AWK_MAP : {}).a_pouch") === undefined);
console.log('소모품 사용 규칙 점검 통과: ' + ok.join(' · '));
