'use strict';
/* 0.8.0 M6-1 고유 장비 105 단위 시험: 규칙과 대가가 문장대로 동작하는가(만든 사람 확정 10월 20일, data/uniques.js · js/18-unique-rules.js).
   실행: node tools/unique-check.js [직업...]. 직업마다 tools/uqtest/<직업>.js가 고유마다 규칙 · 대가를 시험하고 H.cover(id)로 표시한다 */
const H = require('./uqtest/_h.js');
const CLS = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist', 'common'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : CLS;
const U = H.R_('UNIQUE'); const cov = {};
H.cover = (id, part) => { (cov[id] = cov[id] || {})[part] = 1; };
for (const c of want) { try { require('./uqtest/' + c + '.js')(H); } catch (e) { H.C.fail.push(c + ': ' + (e && e.stack || e)); } }
const ids = Object.keys(U).filter(id => want.includes(U[id].cls === 'all' ? 'common' : U[id].cls));
const miss = ids.filter(id => !(cov[id] && cov[id].rule && cov[id].cost));
const noFx = ids.filter(id => !(H.R_('UQFX')[id] && H.R_('UQFX')[id].rule && H.R_('UQFX')[id].cost));
console.log('unique-check: 시험 ' + H.C.n + '개 통과 · 실패 ' + H.C.fail.length + ' · 고유 ' + (ids.length - miss.length) + '/' + ids.length + ' 규칙 · 대가 시험됨' + (noFx.length ? ' · 효과 없음 ' + noFx.length : ''));
for (const m of H.C.fail) console.log('  실패: ' + m);
if (miss.length) console.log('  시험 없음: ' + miss.join(' '));
if (H.C.fail.length || miss.length || noFx.length) process.exit(1);
