'use strict';
// 선택 정책이 기본 QA 판단을 섞지 않고 실제 던전·자원 처리를 사용하는지 확인.
process.env.DGDIR = process.env.DGDIR || '06a2';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, Q = require('./qa.js');
E.render = E.saveRunLocal = E.saveCur = () => {};
const counts = { starts: 0, before: 0, after: 0, battles: 0, ended: 0, cons: 0, doors: 0, paths: 0 };
D.OPT.chapters = 3; D.OPT.detail = true;
D.OPT.policy = {
  start(run) { counts.starts++; assert.equal(E.STAT_KEYS.reduce((n,k) => n + (run.stats[k] || 0), 0), 20); },
  pickDoor(run) { counts.doors++; return run.doors.findIndex(d => d.type === 'normal') < 0 ? 0 : run.doors.findIndex(d => d.type === 'normal'); },
  pickPath() { counts.paths++; return 'main'; },
  useCons() { counts.cons++; },
  battleStart(b) { counts.battles++; assert(b.p.hp > 0); },
  chooseAction(b) {
    const L = E.actionList(b).filter(a => a.ok);
    const basic = L.find(a => a.id === 'basic'), tgt = basic && E.alive(b).find(e => E.canTarget(b, e, basic));
    return tgt ? ['basic', tgt.id] : ['guard', null];
  },
  afterAction(b, run, a) { counts.after++; assert(['basic', 'guard'].includes(a)); const bugs = []; Q.invariants(b, bugs, 'policy'); assert.deepEqual(bugs, []); },
  battleEnd() { counts.ended++; }
};
D.OPT.onTurn = () => { counts.before++; };
const result = D.playChar('careful', 'spellblade', 51000);
assert.deepEqual(result.bugs, []); assert.equal(counts.starts, 1); assert.equal(counts.before, counts.after);
assert.equal(counts.after, result.acts); assert.equal(counts.battles, counts.ended);
assert(counts.battles > 0 && counts.doors > 0 && counts.cons > 0);
// 충전 +1 장비는 정상, 같은 장비로 실제 최대 초과·음수·비정수는 오류.
const p = E.mkPlayer('hunter', {}, {}), en = E.mkEnemy('bruiser', false, 0), b = E.newBattle(p, [en], {});
p.eq.flask = 'wideflask'; p.flask.life = 4;
const check = () => { const bugs = []; Q.invariants(b, bugs, 'flask'); return bugs.filter(x => x.includes('플라스크')); };
assert.equal(check().length, 0); assert.equal(E.flaskCap(p, 'life'), 4);
for (const n of [5, -1, 1.5, NaN]) { p.flask.life = n; assert.equal(check().length, 1); }
p.eq.flask = 'holywater'; p.flask.life = 3; assert.equal(E.flaskCap(p, 'life'), 2); assert.equal(check().length, 1);
p.flask.life = 2; assert.equal(check().length, 0);
console.log('선택 훅·행동/대상·연속 던전·전투 자원 검사·장비별 충전 한도 통과');
