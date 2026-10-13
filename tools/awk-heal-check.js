'use strict';
/* 각인이 실제로 회복에 반영되는지 (10월 14일). 숨겨진 직업 3의 "먹기 회복 +10%" 각인이 독 먹기 회복을 늘리고,
   장비 피 짜는 손(출혈 먹기 +20%, 다른 직업용)는 이 직업의 먹기에 끼어들지 않는지 본다.
   실행: DGDIR=. node tools/awk-heal-check.js   (DGDIR=06a2 로 개발본) */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), { G0: E } = require('./dgqa.js');
function healOnce(awk, eq) {
  const p = E.mkPlayer('bloodmage', eq || {}, {}, ['v_taint', 'v_drink']); p.awk = awk; p.hp = Math.round(p.hpMax * 0.3);
  const b = E.roomBattle(p, { en: [['bruiser']], lv: 3, floor: 5 }, null, 41); b.stepMode = false;
  const e = b.en[0]; e.s.poison = { stacks: 2, until: 1e9, dur: 1e9 };
  const h0 = p.hp; E.playerAct(b, 'v_drink', e.id); return p.hp - h0;
}
const base = healOnce([]), withAwk = healOnce(['k_bm2']);
assert(base > 0, '독 먹기 회복이 0');
assert(Math.abs(withAwk / base - 1.10) < 0.02, '각인 +10%가 반영되지 않음: ' + base + ' → ' + withAwk);
const withWringer = healOnce([], { gloves: 'wringer' });
assert(Math.abs(withWringer - base) < 1e-9, '피 짜는 손이 이 직업의 먹기에 끼어듦: ' + base + ' → ' + withWringer);
console.log('먹기 회복 각인 반영: ' + base.toFixed(2) + ' → ' + withAwk.toFixed(2) + ' (+10%), 피 짜는 손은 끼어들지 않음 — 통과');
