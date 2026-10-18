'use strict';
// 선택 정책이 기본 QA 판단을 섞지 않고 실제 던전·자원 처리를 사용하는지 확인.
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, Q = require('./qa.js');
E.render = E.saveRunLocal = E.saveCur = () => {};
const counts = { starts: 0, before: 0, after: 0, battles: 0, ended: 0, cons: 0, doors: 0, paths: 0 };
D.OPT.chapters = 3; D.OPT.detail = true;
D.OPT.policy = {
  start(run) { counts.starts++; assert.equal(JSON.stringify(run.stats), JSON.stringify(E.ptStats(run))); assert.equal(run.ptree.pts, 0); assert.equal(run.tv, 2); }, // 10월 16일 0.8.0 2단계: 능력치 = 시작 노드 + 찍은 패시브 노드
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
// 10월 18일 0.8.0 5단계(원거리 초안 10절 결정 2): 테스터 패시브 찍기의 생존 · 유지력 바닥. 직업 트리는 생존 · 유지력 중간 노드 ≥ ⌊(중간 노드 − 1) / 3⌋(마지막 길을 다 못 찍었을 수 있음), PT_SURV_OLD=1이면 옛 찍기, 임시 트리는 그대로
const svAt = (cls, old, clears, lv) => { const o0 = process.env.PT_SURV_OLD; if (old) process.env.PT_SURV_OLD = '1'; else delete process.env.PT_SURV_OLD; let got = null;
  D.OPT.policy = { start(run) { run.lv = run.p.lv = lv || 11; run.clears = clears == null ? 2 : clears; Object.assign(run.ptree, { own: [], free: [], ks: [] }); E.ptFix(run); D.spendPassive('careful', D.rng(7)); const T = E.ptBuild(cls);
    const nt = E.ptOpenIds(run).map(id => T.nodes[id]).filter(n => n.kind === 'notable'); got = { n: nt.length, s: nt.filter(n => n.dir === 'sv' || n.dir === 'su').length, left: run.ptree.pts, tmp: T.tmp, ids: E.ptOpenIds(run).sort().join() }; throw new Error('svstop'); } };
  try { D.playChar('careful', cls, 51000); } catch (e) { if (e.message !== 'svstop') throw e; } finally { D.OPT.policy = null; if (o0 == null) delete process.env.PT_SURV_OLD; else process.env.PT_SURV_OLD = o0; } return got; };
for (const cls of ['hunter', 'elementalist', 'assassin', 'spellblade', 'monk']) { const a = svAt(cls, 0), o = svAt(cls, 1); assert.equal(a.left, 0); assert(a.s >= Math.floor((a.n - 1) / 3) && a.s >= 3, cls + ' 생존 · 유지력 ' + JSON.stringify(a)); assert(o.s <= a.s && (cls === 'monk' || o.s < a.s), cls + ' 옛 찍기 ' + JSON.stringify(o)); }
for (const cls of ['elementalist', 'hunter']) assert.equal(svAt(cls, 1).s, 0); // 옛 찍기: 원소술사 · 사냥꾼은 생존 · 유지력 0(9-4 E-1)
{ const a = svAt('butcher', 0), o = svAt('butcher', 1); assert(a.tmp); assert.deepEqual(a, o); } // 임시 트리는 바뀌지 않는다
if (!process.env.PT_SURV_RING1) for (const cls of ['spellblade', 'monk', 'hunter']) assert.deepEqual(svAt(cls, 0, 0, 5), svAt(cls, 1, 0, 5), cls + ' 1고리만 열렸을 때(Lv5)는 옛 찍기와 같다'); // 10월 18일 0.8.0 5단계 마무리: 바닥은 2고리부터
console.log('선택 훅·행동/대상·연속 던전·전투 자원 검사·장비별 충전 한도·패시브 생존 바닥 통과');
