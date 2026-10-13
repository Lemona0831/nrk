'use strict';
/* 적에게 걸린 소모품 효과 표시 점검 (10월 14일): 표식 분필·흩뿌리는 성물·연막 등을 쓰면 그 적 카드에 칩이 생기고,
   설명 창이 열리며, 효과가 쓰이면 칩이 사라진다. 실행: node tools/cons-marks-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS })'); E.render = () => { };
const p = E.mkPlayer('warden', {}); p.hp = p.hpMax = 9999; const run = { build: 'warden', p, cons: [], bag: [], inv: {} };
const b = E.roomBattle(p, { ch: 1, lv: 1, en: [['bruiser', 0], ['archer', 1]] }, null, 3); b.queue = ['p']; G.b = b; G.run = run;
const [front, back] = [b.en.find(e => e.row === 'front'), b.en.find(e => e.row === 'back')];
const card = e => E.stsHtml(e, b, true);
const ok = [];
assert(!card(front).includes('cmark'), '처음에는 칩 없음');
E.consApply(b, run, { id: 'chalk', g: 'n' }, front); assert(card(front).includes('표식 +'), '표식 칩');
E.consApply(b, run, { id: 'relic', g: 'n' }, null); assert(card(front).includes('다음 공격 −10%') && card(back).includes('다음 공격 −10%'), '성물 칩(모든 적)');
const blind = Object.keys(E.CONS).find(k => E.CONS[k].k === 'blind'); E.consApply(b, run, { id: blind, g: 'n' }, null); assert(card(back).includes('빗나감') && !card(front).includes('빗나감'), '연막은 후열만');
ok.push('칩 생김');
const info = E.infoHtml('cmark:' + front.id + ':red'); assert(info.includes('10% 줄어듭니다') && info.includes('소모품으로 건 효과'), '설명 창');
assert.equal(E.infoHtml('cmark:' + front.id + ':nosuch'), ''); ok.push('설명 창');
E.hurtPlayer(b, 50, { src: front, single: 1 }); assert(!card(front).includes('다음 공격 −'), '공격에 쓰이면 사라짐');
E.hurtEnemy(b, front, 1, { single: 1 }); assert(!card(front).includes('표식 +'), '맞으면 표식이 사라짐'); ok.push('쓰이면 사라짐');
console.log('소모품 효과 표시 점검 통과: ' + ok.join(' · '));
