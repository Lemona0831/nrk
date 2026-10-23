'use strict';
/* 전리품 화면 점검 (10월 14일 개편 5-1, 설계안 5절): 떨어진 쓰는 소모품은 보류에 모아 전리품 화면에서 뺄 것을 고르고,
   판매품 · 골드 · 플라스크는 바로 받는다. 한 전투에서 같은 소모품은 한 번만 나온다(약초 빼고). 실행: node tools/cons-loot-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS })'); E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; E.ask = () => true; D.run_('toast = () => {}'); G.data = {};
const ok = [];
const mkRun = () => { const run = { build: 'hunter', p: E.mkPlayer('hunter', {}), bag: [], inv: {}, cons: [], consV: 3, pouch: {}, gold: 0, room: 3, ch: 1, rooms: [], drops: [] }; E.initGear(run); G.run = run; G.b = null; return run; };
// 1. grantDrops: 쓰는 소모품은 보류(같은 종류는 합침), 판매품은 주머니, 골드는 바로
{ const run = mkRun(); const b = { drops: [{ cons: 'herb', g: 'n' }, { cons: 'herb', g: 'n' }, { cons: 'flash', g: 'm' }, { cons: 'silver', g: 'n' }, { gold: 12 }] };
  E.grantDrops(run, b); assert.equal(run.cons.length, 0, '바로 넣지 않는다'); assert.equal(JSON.stringify(run.consPending.map(c => c.id + c.g + c.n)), '["herbn2","flashm1"]'); assert.equal(run.pouch.silver, 1); assert.equal(run.gold, 12); }
ok.push('보류 · 주머니 · 골드');
// 2. 들어갈 계획: 순서대로, 뺀 것은 0, 저장본은 그대로
{ const run = mkRun(); for (const id of ['charm', 'knot', 'hookrope', 'chalk']) E.consAdd(run, id, 'n', 2); E.consAdd(run, 'herb', 'n', 3);
  const Q = [{ id: 'herb', g: 'n', n: 4 }, { id: 'cleanse', g: 'n', n: 1 }]; const snap = JSON.stringify(run.cons);
  assert.equal(JSON.stringify(E.consFitPlan(run, Q, [])), '[2,0]', '약초는 빈자리 2개만, 정화 약은 칸이 없다'); assert.equal(JSON.stringify(run.cons), snap);
  assert.equal(JSON.stringify(E.consFitPlan(run, Q, [0])), '[0,0]'); }
ok.push('들어갈 계획');
// 3. 화면: 줄마다 상태, 체크 해제, 챙기기 개수, 자리 모자람 안내
{ const run = mkRun(); for (const id of ['charm', 'knot', 'hookrope', 'chalk']) E.consAdd(run, id, 'n', 2); E.consAdd(run, 'herb', 'n', 3);
  run.consPending = [{ id: 'herb', g: 'n', n: 4, loot: 1 }, { id: 'cleanse', g: 'n', n: 1, loot: 1 }]; G.sheet = { kind: 'consfull', data: {} };
  let h = E.sheetParts(G.sheet)[1]; assert(h.includes('2개만 들어감') && h.includes('자리 없음') && h.includes('챙기기 (2개)') && h.includes('자리가 3개 모자랍니다'), '상태 표시');
  D.click('cptoggle', '0'); h = E.sheetParts(G.sheet)[1]; assert(h.includes('두고 감'));
  D.click('cpreplace', '0', { s: 'cons' }); h = E.sheetParts(G.sheet)[1]; assert(/정화 약/.test(h) && h.includes('챙김'), '묶음을 버린 자리에 정화 약이 챙김'); /* 10월 24일 전리품 창 개편: 체크 표시 대신 칸의 상태 글 */ D.click('cptake');
  assert(run.cons.some(c => c.id === 'cleanse'), '묶음을 비운 자리에 정화 약'); assert.equal(run.cons.filter(c => c.id === 'herb').reduce((a, c) => a + c.n, 0), 3, '뺀 약초는 두고 감');
  const log = run.consGainLog.filter(x => x.fromPending); assert.equal(log.length, 2); assert.equal(log[0].skipped, 1); }
ok.push('화면 · 빼기 · 묶음 버리기 · 기록');
// 4. 한 전투에서 같은 소모품은 한 번만(약초 빼고)
{ const p = E.mkPlayer('hunter', {}); const b = E.roomBattle(p, { ch: 1, lv: 1, en: [['bruiser', 0]] }, null, 3); let s = 7; b.rngF = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  let dup = 0, herbRep = 0; for (let t = 0; t < 300; t++) { b.drops = []; b.dropSeen = []; for (let k = 0; k < 4; k++) E.rollDrops0(b, Object.assign({}, b.en[0], { strong: 1 })); const ids = b.drops.filter(d => d.cons).map(d => d.cons); const seen = {}; for (const id of ids) seen[id] = (seen[id] || 0) + 1; for (const [id, n] of Object.entries(seen)) { if (n > 1 && id !== 'herb') dup++; if (n > 1 && id === 'herb') herbRep++; } }
  assert.equal(dup, 0, '약초 말고 겹친 소모품'); assert(herbRep > 0, '약초는 여러 번 나올 수 있다'); }
ok.push('한 전투 같은 소모품 한 번');
console.log('전리품 화면 점검 통과: ' + ok.join(' · '));
