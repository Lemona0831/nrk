'use strict';
/* S-2 유산 1 회복 칸 점검 (10월 24일 만든 사람 결정). 실행: node tools/ys-heal-check.js
   규칙: 유산 1짜리 스킬이 생명력을 회복하면 다음 내 차례 시작의 유산 충전이 없다(긴 전투의 +2도). 대응 · 다른 충전은 그대로.
   1 대상: 직업 여섯의 유산 1 칸 가운데 회복 칸은 신성한 기도(변형 깊은 기도 · 기도의 막 포함)뿐
   2 설명: 칸 설명 끝에 "쓰면 다음 차례 유산 충전 없음."
   3 동작: 쓴 다음 차례 충전 없음 → 그다음 차례는 다시 +1, 긴 전투 +2도 없음, 대응 충전은 그대로, 회복 없는 유산 1 칸은 그대로
   4 유산 0이면 고를 수 없다(테스터는 ok인 행동만 고른다) */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, ysHealSk = R_('ysHealSk'), ysResp = R_('ysResp'), YUSAN = R_('YUSAN'), SK = R_('SKILLS2'), AT = R_('ATREE_DEF');
function fight(act, eq) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('warden'); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = act.slice(); run.skills = (eq || act.filter(id => (E.atBuild('warden').nodes[id] || {}).kind === 'skill')).slice(0, 4); E.atSync(run);
  const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 0; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const A = (b, id) => E.actionList(b).find(x => x.id === id) || {};
const turnG = (b, k0) => b.rec.slice(k0).filter(x => x.k === 'ys' && x.src === 'turn').reduce((a, x) => a + (x.g || 0), 0); // 그동안 든 차례 충전
const noTurn = (b, k0) => b.rec.slice(k0).some(x => x.k === 'ys' && x.src === 'noturn');
const step = (b, id, t) => { b.p.st = b.p.stMax; const k0 = b.rec.length; E.playerAct(b, id, t); E.runUntilPlayer(b); return k0; };

// 1 대상: 직업 여섯의 유산 1 칸
{ const six = ['warden', 'monk', 'assassin', 'hunter', 'elementalist', 'spellblade'], hit = [];
  for (const c of six) { const byId = Object.fromEntries(SK[c].map(s => [s.id, s])); for (const r of AT[c].skills) if (r[6] === 1 && ysHealSk(Object.assign({}, byId[r[0]], { ys: 1 }))) hit.push(r[0]); }
  ok(hit.join() === 'w_pray', '유산 1 회복 칸은 신성한 기도 하나: ' + hit.join());
  ok(!ysHealSk(Object.assign({}, SK.warden.find(s => s.id === 'w_pray'), { ys: 2 })), '비용 2면 규칙 밖'); }
// 2 설명
for (const v of [null, 'wv_pr_more', 'wv_pr_ward']) {
  const { b, run } = fight(['w_shieldhit', 'w_pray', 'sv_w_pray']); if (v) { run.atree.vsel = { sv_w_pray: v }; E.atSync(run); }
  const a = A(b, 'w_pray'); ok(a.yc === 1 && /쓰면 다음 차례 유산 충전 없음\.$/.test(a.d), (v || '기본') + ': 설명 끝 "쓰면 다음 차례 유산 충전 없음." (' + a.d + ')');
  const s2 = A(b, 'w_shieldhit'); ok(!/충전 없음/.test(s2.d), '방패 가격(유산 2)에는 붙지 않음'); }
// 3 동작
{ const { p, b, es } = fight(['w_shieldhit', 'w_pray', 's_slam', 's_regret']);
  p.ys = 1; p.hp = 50; let k0 = step(b, 'basic', es[0].id); ok(turnG(b, k0) === YUSAN.turn, '기본 공격 뒤 차례 충전 +' + YUSAN.turn + ' (' + turnG(b, k0) + ')');
  p.ys = 2; const hp0 = p.hp; k0 = step(b, 'w_pray'); ok(p.hp > hp0, '신성한 기도로 생명력 회복');
  ok(turnG(b, k0) === 0 && noTurn(b, k0) && p.ys === 1, '신성한 기도를 쓴 다음 차례 충전 없음(유산 2 → 1 그대로): ' + p.ys);
  ok(b.log.some(x => /신성한 기도를 써서 다음 차례 유산 충전 없음/.test(x.m)), '전투 기록에 남음');
  k0 = step(b, 'basic', es[0].id); ok(turnG(b, k0) === YUSAN.turn && !noTurn(b, k0), '그다음 차례는 다시 +' + YUSAN.turn);
  p.ys = 2; k0 = step(b, 's_regret', es[0].id); ok(turnG(b, k0) === YUSAN.turn, '회복 없는 유산 1 칸(회한의 검)은 충전 그대로');
  p.ys = 2; step(b, 'w_pray'); p.ys = 0; ok(!A(b, 'w_pray').ok, '유산 0이면 신성한 기도를 고를 수 없음(테스터는 ok인 행동만)'); }
{ const { p, b, es } = fight(['w_shieldhit', 'w_pray']); p.ys = 2; const k0 = b.rec.length; E.playerAct(b, 'w_pray'); ok(!b.ysPend && !b.ysNoTurn, '차례가 끝날 때 다음 차례 충전이 0으로 잡힘');
  const y = p.ys; b.ysRespR = -1; ysResp(b, '방어'); ok(p.ys === y + YUSAN.resp, '대응 충전은 그대로 +' + YUSAN.resp); E.runUntilPlayer(b); ok(turnG(b, k0) === 0, '대응을 받아도 차례 충전은 없음'); }
if (YUSAN.longFrom > 0) { const { p, b } = fight(['w_shieldhit', 'w_pray']); b.ysTurnN = YUSAN.longFrom + 1; p.ys = 2; const k0 = step(b, 'w_pray'); ok(turnG(b, k0) === 0 && p.ys === 1, '긴 전투(+2)에서도 충전 없음: ' + p.ys); }
console.log('ys-heal-check: ' + n + '개 통과');
