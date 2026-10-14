'use strict';
/* 소모품 효과 변경 점검 (10월 14일 개편 4-2, 설계안 v2 3절): 종 조각 · 연막 · 방해 부적 · 갈고리 줄 · 미끼 인형 · 빈 성물함 · 석회 가루 · 거울 조각,
   챕터 전용 소모품의 자동 반환. 실행: node tools/cons-effects-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS, RISE, consSell })'); E.render = () => { }; G.data = {}; D.run_('toast = () => {}');
const ok = [];
const mk = (en, ch) => { const p = E.mkPlayer('warden', {}); p.hp = p.hpMax = 9999; const run = { build: 'warden', p, cons: [], bag: [], inv: {}, ch: ch || 1 }; const b = E.roomBattle(p, { ch: ch || 1, lv: 1, en }, null, 3); b.queue = ['p']; b.round = b.round || 1; G.b = b; G.run = run; return { b, run, p }; };
const hit = (b, p, src, o) => { const h = p.hp; E.hurtPlayer(b, 100, Object.assign({ src, single: 1 }, o || {})); return h - p.hp; };
// 1. 종 조각: 끊지 않고, 큰 공격 피해 −20%, 보스도 대상
{ const { b, run, p } = mk([['bruiser', 0]]); const e = b.en[0]; e.intent = { k: 'heavy' }; const base = hit(b, p, e);
  assert(E.consTargets(b, E.CONS.bellshard).includes(e)); E.consApply(b, run, { id: 'bellshard', g: 'n' }, e); assert.equal(e.intent.k, 'heavy', '끊지 않는다');
  const cut = hit(b, p, e); assert(Math.abs(cut - base * 0.8) <= 1, cut + ' vs ' + base); assert.equal(hit(b, p, e), base, '한 번만'); }
{ const { b } = mk([['bruiser', 0]]); const e = b.en[0]; e.role = 'boss'; e.intent = { k: 'heavy' }; assert(E.consTargets(b, E.CONS.bellshard).includes(e), '보스도'); }
ok.push('종 조각');
// 2. 연막: 후열 다음 공격 −20%
{ const { b, run, p } = mk([['bruiser', 0], ['archer', 1]]); const back = b.en.find(e => e.row === 'back'), front = b.en.find(e => e.row === 'front'); const base = hit(b, p, back);
  E.consApply(b, run, { id: 'smoke', g: 'n' }, null); assert(!back.missNext); assert(Math.abs(hit(b, p, back) - base * 0.8) <= 1); assert(!front.redNext, '전열은 그대로');
  assert.equal(E.consWhyNot(b, run, { id: 'smoke', g: 'n', n: 1 }), ''); E.consApply(b, run, { id: 'smoke', g: 'n' }, null); assert.equal(E.consWhyNot(b, run, { id: 'smoke', g: 'n', n: 1 }), '이미 효과가 있습니다'); }
ok.push('연막');
// 3. 방해 부적: 치유량 −50%
{ const { b, run } = mk([['bruiser', 0], ['healer', 1]]); const hl = b.en.find(e => e.role === 'healer'), t = b.en.find(e => e.role !== 'healer');
  const heal = () => { t.hp = 1; hl.intent = { k: 'heal', tgt: t.id }; E.enemyAct(b, hl); return t.hp - 1; };
  const base = heal(); hl.healN = 0; E.consApply(b, run, { id: 'hinder', g: 'n' }, hl); const cut = heal(); assert(base > 0 && Math.abs(cut - base * 0.5) <= 1, cut + ' vs ' + base); assert(!hl.noHeal); }
ok.push('방해 부적 −50%');
// 4. 갈고리 줄: 지키기 · 몸 낮추기 · 버티기 중 하나
{ const { b, run } = mk([['bruiser', 0]]); const e = b.en[0]; e.evading = 1; e.braced = 1; assert(E.consTargets(b, E.CONS.hookrope).includes(e));
  E.consApply(b, run, { id: 'hookrope', g: 'n' }, e); assert.equal(e.evading, 0); assert.equal(e.braced, 1, '하나만'); E.consApply(b, run, { id: 'hookrope', g: 'n' }, e); assert.equal(e.braced, 0); assert(!E.consTargets(b, E.CONS.hookrope).includes(e)); }
ok.push('갈고리 줄');
// 5. 미끼 인형: 이번 라운드 반격 · 후열 사격 −20%, 다음 라운드는 원래대로
{ const { b, run, p } = mk([['bruiser', 0], ['archer', 1]]); const front = b.en.find(e => e.row === 'front'), back = b.en.find(e => e.row === 'back');
  const c0 = hit(b, p, front, { counter: 1 }), s0 = hit(b, p, back), f0 = hit(b, p, front); E.consApply(b, run, { id: 'dummy', g: 'n' }, null);
  assert(Math.abs(hit(b, p, front, { counter: 1 }) - c0 * 0.8) <= 1, '반격'); assert(Math.abs(hit(b, p, back) - s0 * 0.8) <= 1, '후열 사격'); assert.equal(hit(b, p, front), f0, '전열 보통 공격은 그대로');
  b.round++; assert.equal(hit(b, p, back), s0, '다음 라운드는 원래대로'); }
ok.push('미끼 인형');
// 6. 빈 성물함 ×1.5
{ const { b, run } = mk([['bruiser', 0]]); E.consApply(b, run, { id: 'reliq', g: 'n' }, null); assert.equal(b.lootX, 1.5); }
ok.push('빈 성물함 ×1.5');
// 7. 석회 가루: 뼈 더미 +2라운드, 서 있는 해골은 쓰러질 때
{ const { b, run } = mk([['skeleton', 0], ['skeleton', 0]], 2); const [s1, s2] = b.en;
  E.makePile(b, s1); const w0 = s1.pile.wait; E.consApply(b, run, { id: 'lime', g: 'n' }, s1); assert.equal(s1.pile.wait, w0 + 2); assert(s1.alive !== false, '없애지 않는다');
  E.consApply(b, run, { id: 'lime', g: 'n' }, s2); assert.equal(s2.limeDelay, 2); assert(E.stsHtml(s2, b, true).includes('쓰러지면 ' + (E.RISE.wait + 2) + '라운드 뒤 부활 (석회 +2)'), '카드 표시'); E.makePile(b, s2); assert.equal(s2.pile.wait, E.RISE.wait + 2); assert(!s2.limeDelay); }
ok.push('석회 가루 2라운드');
// 7-1. 해골 부활 예고(4-3): 서 있는 해골 카드에 부활 라운드, 화상이면 부활 못 함, 설명 창
{ const { b } = mk([['skeleton', 0]], 2); const s = b.en[0]; let h = E.stsHtml(s, b, true); assert(h.includes('쓰러지면 ' + E.RISE.wait + '라운드 뒤 부활'), h);
  assert(E.infoHtml('skrise:' + s.id).includes('한 번 다시 일어섭니다'));
  E.addS(b, s, 'ignite', 1); h = E.stsHtml(s, b, true); assert(h.includes('지금 쓰러지면 부활 못 함')); assert(E.infoHtml('skrise:' + s.id).includes('화상 상태라'));
  s.rose = 1; assert(!E.stsHtml(s, b, true).includes('skrise'), '이미 일어선 해골은 표시 없음'); }
ok.push('해골 부활 예고');
// 8. 거울 조각: 한 적 · 한 겹
{ const { b, run } = mk([['bruiser', 0], ['bruiser', 0]]); const [a, c] = b.en; a.haze = 2; c.haze = 1; E.consApply(b, run, { id: 'mirror', g: 'n' }, a); assert.equal(a.haze, 1); assert.equal(c.haze, 1); }
ok.push('거울 조각 한 겹');
// 9. 챕터 전용 자동 반환
{ const run = { ch: 2, gold: 0, cons: [{ id: 'lime', g: 'n', n: 2 }, { id: 'herb', g: 'n', n: 3 }], consPending: [{ id: 'lime', g: 'n', n: 1 }] }; run.ch = 3; const r = E.consChRefund(run);
  assert.equal(r.gold, E.consSell({ id: 'lime', g: 'n' }) * 3); assert.equal(run.gold, r.gold); assert.equal(JSON.stringify(run.cons.map(c => c.id)), '["herb"]'); assert.equal(run.consPending.length, 0);
  const keep = { ch: 2, gold: 0, cons: [{ id: 'lime', g: 'n', n: 1 }] }; assert.equal(E.consChRefund(keep).gold, 0, '그 챕터에서는 그대로'); }
ok.push('챕터 전용 반환');
console.log('소모품 효과 변경 점검 통과: ' + ok.join(' · '));
