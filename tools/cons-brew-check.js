'use strict';
/* 플라스크 채우기 점검 (10월 14일 개편 3단계): 약초 직접 회복 3%(고급 5%), 각성 잎 +12,
   전투 밖에서 약초 4개(가혹 5개) → 생명력 플라스크 한 칸, 각성 잎 3개(가혹 4개) → 스태미나 플라스크 한 칸, 고급은 2개로 센다.
   전투 중 · 플라스크가 가득 · 재료 부족이면 아무것도 바뀌지 않는다. 실행: node tools/cons-brew-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa'), E = D.G0, G = E.__G;
D.run_('Object.assign(this, { CONS, CONS_BREW, consBrewOf, consBrew })');
E.render = () => { }; E.saveRunLocal = () => { }; E.saveCur = () => { }; D.run_('toast = () => {}'); G.data = {};
const ok = [];
const mk = (mode) => { const p = E.mkPlayer('warden', {}); const run = { build: 'warden', mode, ch: 1, p, cons: [], consV: 3, pouch: {}, bag: [], inv: {}, room: 1 }; G.run = run; G.b = null; return run; };
const tot = (run, id) => run.cons.filter(c => c.id === id).reduce((a, c) => a + c.n, 0);
// 1. 수치
assert.equal(E.CONS.herb.v, 0.03); assert.equal(E.CONS.leaf.v, 12);
{ const run = mk('normal'), p = run.p; p.hp = 1; E.consAdd(run, 'herb', 'n', 1); E.consUse(null, run, 0, null); assert(Math.abs((p.hp - 1) / p.hpMax - 0.03 * E.healMul(p)) < 1e-9, '약초 3%'); }
ok.push('약초 3%, 각성 잎 +12');
// 2. 일반 4개 · 가혹 5개 → 생명력 플라스크 한 칸 / 각성 잎 3 · 4개
for (const [mode, id, need, fk] of [['normal', 'herb', 4, 'life'], ['hard', 'herb', 5, 'life'], ['normal', 'leaf', 3, 'stam'], ['hard', 'leaf', 4, 'stam']]) {
  const run = mk(mode), p = run.p; p.flask[fk] = 0; E.consAdd(run, id, 'n', need - 1);
  const snap = JSON.stringify(run); assert.match(E.consBrew(run, id), /필요합니다/); assert.equal(JSON.stringify(run), snap, '재료가 모자라면 그대로');
  E.consAdd(run, id, 'n', 1 + 2); assert.equal(E.consBrew(run, id), ''); assert.equal(p.flask[fk], 1); assert.equal(tot(run, id), 2, mode + ' ' + id + ' ' + need + '개 사용');
  assert.equal(run.brewLog.length, 1);
}
ok.push('일반 4/3개, 가혹 5/4개');
// 3. 가득 차면 막힘, 전투 중 막힘
{ const run = mk('normal'), p = run.p; p.flask.life = E.flaskCap(p, 'life'); E.consAdd(run, 'herb', 'n', 10); const snap = JSON.stringify(run); assert.match(E.consBrew(run, 'herb'), /가득/); assert.equal(JSON.stringify(run), snap);
  p.flask.life = 0; G.b = { over: false }; assert.equal(E.consBrew(run, 'herb'), '전투 밖에서 채웁니다'); G.b = null; assert.equal(E.consBrew(run, 'herb'), ''); }
ok.push('가득·전투 중 막힘');
// 4. 고급은 2개로 센다, 일반부터 쓴다, 빈 묶음은 칸에서 빠진다
{ const run = mk('normal'), p = run.p; p.flask.life = 0; E.consAdd(run, 'herb', 'm', 2); assert(run.cons.every(c => c.g === 'n'), '4단계: 고급 약초는 없다(일반으로 들어온다)'); E.consAdd(run, 'herb', 'n', 4); assert.equal(E.consBrew(run, 'herb'), ''); assert.equal(tot(run, 'herb'), 2); assert(run.cons.every(c => c.n > 0)); }
ok.push('고급 약초 없음, 빈 묶음 정리');
// 5. 소모품 창: 전투 밖에서 채우기 버튼, 전투 중에는 없음
{ const run = mk('normal'); run.p.flask.life = 0; E.consAdd(run, 'herb', 'n', 4); G.sheet = { kind: 'cons', data: {} };
  let h = E.sheetParts(G.sheet)[1]; assert(/data-a="consbrew" data-k="herb"[^>]*>🧪 채우기/.test(h), '채우기 버튼'); assert(h.includes('4개 → 생명력 플라스크 한 칸'));
  D.click('consbrew', 'herb'); assert.equal(run.p.flask.life, 1); assert.equal(tot(run, 'herb'), 0);
  const b = E.roomBattle(run.p, { ch: 1, lv: 1, en: [['bruiser', 0]] }, null, 3); b.queue = ['p']; G.b = b; E.consAdd(run, 'herb', 'n', 4); h = E.sheetParts(G.sheet)[1]; assert(!h.includes('data-a="consbrew"'), '전투 중에는 버튼 없음'); G.b = null; }
{ const run = mk('normal'); run.p.flask.life = 0; E.consAdd(run, 'herb', 'n', 4); E.consAdd(run, 'herb', 'm', 1); G.sheet = { kind: 'cons', data: {} }; const h = E.sheetParts(G.sheet)[1]; assert.equal((h.match(/data-a="consbrew" data-k="herb"/g) || []).length, 1, '일반 · 고급 약초 줄에 채우기는 한 번'); }
ok.push('창 버튼·클릭·중복 없음');
console.log('플라스크 채우기 점검 통과: ' + ok.join(' · '));
