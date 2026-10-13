'use strict';
/* 테스트 메뉴 점검 (10월 14일): 게임 코드를 vm에서 돌리고 devtools.js를 같은 전역에 올려, 메뉴 동작이 게임 상태를 바꾸는지 본다.
   화면 요소는 가짜로 둔다(배치는 브라우저에서 따로 본다). 실행: node tools/testsite/devtools-check.js */
process.env.DGDIR = process.env.DGDIR || '.';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const D = require('../dgqa.js'); const E = D.G0, G = E.__G;
// 가짜 DOM (메뉴가 만드는 요소는 이 객체 하나로 받아 낸다)
const el = () => { const o = { style: {}, dataset: {}, children: [], value: '', textContent: '', set innerHTML(v) { }, get firstChild() { return o; }, appendChild() { }, addEventListener() { }, setAttribute() { }, querySelector() { return el(); }, click() { } }; return o; };
vm.runInContext('var document = { createElement: () => (' + el.toString() + ')(), head: { appendChild() {} }, body: { appendChild() {} } }; var setInterval = () => 0; var confirm = () => false; var location = { reload() {} }; var localStorage = { removeItem() {} }; this.scrollTo = function () {}; this.innerWidth = 1280; this.innerHeight = 800; this.scrollY = 0; this.addEventListener = function () {}; window = this; /* 던전 테스터의 가짜 window 대신 브라우저처럼 전역을 쓴다 */', E);
const toasts = []; vm.runInContext('toast = m => __toasts.push(m); saveRunLocal = () => true; saveCur = () => true; render = () => {}; openSheet = () => {};', Object.assign(E, { __toasts: toasts }));
vm.runInContext(fs.readFileSync(path.join(__dirname, 'devtools.js'), 'utf8'), E, { filename: 'devtools.js' });
const TM = vm.runInContext('window.TM', E); assert(TM, '메뉴 동작 객체가 없음');
// 캐릭터 하나 만들기
G.data = E.blankData(); G.cre = { name: 'tm' }; E.startRun('warden'); G.scr = 'run';
const run = G.run; const ok = [];
const g0 = run.gold || 0; TM.gold(1000); assert.equal(run.gold, g0 + 1000); ok.push('골드');
TM.hp(0.1); assert.equal(run.p.hp, Math.max(1, Math.round(run.p.hpMax * 0.1))); TM.hp(1); assert.equal(run.p.hp, run.p.hpMax); ok.push('생명력');
run.p.flask.life = 0; TM.flask(); assert(run.p.flask.life >= 3); ok.push('플라스크');
const lv0 = run.lv; TM.level(); assert.equal(run.lv, lv0 + 1); assert(run.statPending >= 3); ok.push('레벨');
TM.floor(12); assert.equal(run.room, 12); assert.equal((run.cur || {}).type, 'camp'); ok.push('야영지 이동');
TM.floor(24); assert.equal(run.room, 24); assert.equal((run.cur || {}).type, 'boss'); ok.push('보스층 이동');
TM.floor(5); assert.equal(run.room, 5); ok.push('층 이동');
const before = (run.cons || []).filter(c => c.id === 'herb').reduce((s, c) => s + c.n, 0); TM.cons('herb', 'n', 3); assert.equal((run.cons || []).filter(c => c.id === 'herb').reduce((s, c) => s + c.n, 0), before + 3); ok.push('소모품');
const k = Object.keys(E.ITEMS).find(x => E.ITEMS[x].slot === 'ring1' && E.ITEMS[x].kind !== 'start'); const bag0 = run.bag.length; TM.item(k, 'r'); assert.equal(run.bag.length, bag0 + 1); assert.equal(run.inv[run.bag[run.bag.length - 1]].g, 'r'); ok.push('장비');
TM.settle(); assert.equal(run.phase, 'settle'); assert.equal(G.scr, 'settle'); ok.push('정산');
// 전투: 적 생명력 1, 무적
run.phase = null; G.scr = 'run'; const p = E.mkPlayer('warden', {}, {}); p.hp = p.hpMax;
G.b = E.roomBattle(p, { en: [['bruiser'], ['archer']], lv: 3, floor: 5 }, null, 7);
TM.weaken(); assert(G.b.en.every(e => !e.alive || e.hp <= 1)); ok.push('적 생명력 1');
TM.god(); const hp0 = G.b.p.hp; vm.runInContext('hurtPlayer(G.b, 50, { src: G.b.en[0], label: "시험" })', E); assert.equal(G.b.p.hp, hp0, '무적인데 피해를 받음'); TM.god(); ok.push('무적');
console.log('테스트 메뉴 점검 통과: ' + ok.join(', '));
