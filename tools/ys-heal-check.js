'use strict';
/* S-2 유산 1 회복 칸 점검 (10월 24일 만든 사람 결정). 실행: node tools/ys-heal-check.js
   규칙: 유산 1짜리 스킬이 생명력을 회복하면 다음 내 차례 시작의 유산 충전이 없다(긴 전투의 +2도). 대응 · 다른 충전은 그대로.
   1 대상: 직업 여섯의 유산 1 칸 가운데 회복 칸은 신성한 기도(변형 깊은 기도 · 기도의 막 포함)뿐
   2 설명: 칸 설명 끝에 "쓰면 다음 차례 유산 충전 없음."
   3 동작: 쓴 다음 차례 충전 없음 → 그다음 차례는 다시 +1, 긴 전투 +2도 없음, 대응 충전은 그대로, 회복 없는 유산 1 칸은 그대로
   4 유산 0이면 고를 수 없다(테스터는 ok인 행동만 고른다)
   S-5(10월 24일 만든 사람): 실제로 낸 비용(skCostAt)이 1 이하면 모두(접사 · 고유 · 장비 할인 포함), 태세 끄기 · 바꾸기는 뺀다. 할인으로 1이 될 수 있는 칸은 설명 끝 "비용 1로 쓰면 …" */
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
  ok(hit.join() === 'w_pray,h5_cover,h5_dodge', '유산 1 칸 대상(S-3에서 보호 · 회피까지): ' + hit.join());
  ok(!ysHealSk(Object.assign({}, SK.warden.find(s => s.id === 'w_pray'), { ys: 2 })), '비용 2면 규칙 밖'); }
// 2 설명
for (const v of [null, 'wv_pr_more', 'wv_pr_ward']) {
  const { b, run } = fight(['w_shieldhit', 'w_pray', 'sv_w_pray']); if (v) { run.atree.vsel = { sv_w_pray: v }; E.atSync(run); }
  const a = A(b, 'w_pray'); ok(a.yc === 1 && /쓰면 다음 차례 유산 충전 없음\.$/.test(a.d), (v || '기본') + ': 설명 끝 "쓰면 다음 차례 유산 충전 없음." (' + a.d + ')');
  const s2 = A(b, 'w_shieldhit'); ok(!/충전 없음/.test(s2.d) && !/충전 없음/.test(s2.cost), '방패 가격(유산 2, 할인 없음): 카드 · 버튼에 충전 없음이 붙지 않음 (' + s2.d + ')'); }
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

/* ===== S-3(10월 24일 만든 사람): 보호 · 보호막 · 회피까지 넓힘, 변형의 조건 할인으로 1이 되어 쓴 때도 ===== */
const ysCondSk = R_('ysCondSk'), atSlotId = R_('atSlotId');
function fightC(cls, act, vsel, af) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun(cls); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  const N = E.atBuild(cls).nodes; run.atree.own = act.concat(Object.keys(vsel || {}).map(id => atSlotId(id))); run.skills = act.filter(id => (N[id] || {}).kind === 'skill').slice(0, 4);
  run.atree.vsel = Object.fromEntries(Object.entries(vsel || {}).map(([id, v]) => [atSlotId(id), v])); E.atSync(run);
  if (af) { const it = E.mkItem8({ base: 'gloves', g: 'r', ch: 3, b: 0, af: [af] }); run.inv[it.uid] = it; run.eqU.gloves = it.uid; E.applyGear(run, true); run.p.hp = run.p.hpMax = E.calcHpMax(run.p); } // S-5: 접사 장갑 하나
  const es = ['bruiser', 'bruiser'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 0; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
// 대상: 직업 여섯의 유산 1 칸(기본) + 변형으로 보호막을 얻는 칸
{ const six = ['warden', 'monk', 'assassin', 'hunter', 'elementalist', 'spellblade'], hit = [], vhit = [];
  for (const c of six) { const byId = Object.fromEntries(SK[c].map(s => [s.id, s])); for (const r of AT[c].skills) { if (r[6] !== 1) continue; const s = Object.assign({}, byId[r[0]], { ys: 1 }); if (ysHealSk(s)) hit.push(r[0]);
    for (const v of (AT[c].vars || {})[r[0]] || []) { const m = v[3] || {}; const fx = s.fx.map(e => Object.assign({}, e)).concat((m.fxAdd || []).map(e => Object.assign({}, e))); if (!ysHealSk(s) && ysHealSk(Object.assign({}, s, { fx }))) vhit.push(r[0] + '+' + v[0]); } } }
  ok(hit.join() === 'w_pray,h5_cover,h5_dodge', 'S-3 유산 1 칸 대상: 신성한 기도 · 엄폐 · 몸 빼기: ' + hit.join());
  ok(vhit.join() === 'f_stomp+wv_stp_ward,sb_spark+sbv_spark_ward', 'S-3 변형으로 걸리는 칸: 발 디딘 방패 · 불티 방패: ' + vhit.join()); }
// 사냥꾼 엄폐 · 몸 빼기
for (const id of ['h5_cover', 'h5_dodge']) { const { p, b, es } = fightC('hunter', [id]); while (b.turnIdx < 3) step(b, 'basic', es[0].id); /* 개전 가속(한 번 더 움직임, 차례 충전 없음)을 먼저 지난다 */ const a = A(b, id); ok(a.yc === 1 && /쓰면 다음 차례 유산 충전 없음\.$/.test(a.d), id + ': 설명 끝 (' + a.d + ')');
  p.ys = 2; const k0 = step(b, id); ok(turnG(b, k0) === 0 && noTurn(b, k0), id + ': 쓴 다음 차례 충전 없음');
  const k1 = step(b, 'basic', es[0].id); ok(turnG(b, k1) === YUSAN.turn, id + ': 그다음 차례는 다시 +' + YUSAN.turn); }
// 발 구르기: 기본은 그대로, 발 디딘 방패 변형이면 걸림
{ const { b, es } = fightC('warden', ['f_sweep', 'f_stomp']); ok(!/충전 없음/.test(A(b, 'f_stomp').d), '발 구르기(기본)에는 붙지 않음'); b.p.ys = 2; const k0 = step(b, 'f_stomp'); ok(turnG(b, k0) === YUSAN.turn, '발 구르기(기본)는 충전 그대로'); }
{ const { b } = fightC('warden', ['f_sweep', 'f_stomp'], { f_stomp: 'wv_stp_ward' }); ok(/쓰면 다음 차례 유산 충전 없음\.$/.test(A(b, 'f_stomp').d), '발 디딘 방패: 설명 끝'); b.p.ys = 2; const k0 = step(b, 'f_stomp'); ok(turnG(b, k0) === 0, '발 디딘 방패: 충전 없음'); }
// 조건 할인 변형: 태세의 버팀(버티기, 태세가 켜져 있으면 2 → 1)
{ const { p, b } = fightC('warden', ['w_dstance', 'w_shieldhit', 'w_stand'], { w_stand: 'wv_st_wst' }); const a = A(b, 'w_stand'); ok(ysCondSk(a.s), '태세의 버팀: 조건 할인 보호막 칸');
  ok(/비용 1로 쓰면 다음 차례 유산 충전 없음\.$/.test(a.d), '태세의 버팀: 설명 끝 "비용 1로 쓰면 …" (' + a.d + ')');
  p.ys = 5; let k0 = step(b, 'w_stand'); ok(a.yc === 2 && turnG(b, k0) === YUSAN.turn, '태세가 꺼져 있어 비용 2로 쓰면 충전 그대로');
  p.ys = 5; step(b, 'w_dstance'); ok(A(b, 'w_stand').yc === 1, '태세를 켜면 버티기 비용 1'); p.ys = 3; k0 = step(b, 'w_stand'); ok(turnG(b, k0) === 0 && noTurn(b, k0), '비용 1로 쓰면 다음 차례 충전 없음'); }
/* ===== S-5(10월 24일 만든 사람): 실제로 낸 비용 1 이하면 할인 출처를 가리지 않는다. 태세 끄기 · 바꾸기(비용 0, wdOff · wdTurn)는 뺀다 ===== */
{ const { b } = fightC('warden', ['w_dstance', 'w_shieldhit', 'w_stand']); ok(!/충전 없음/.test(A(b, 'w_stand').d), '버티기(변형 없음, 유산 2): 카드 끝 문장 없음(쓸 때만 알림) (' + A(b, 'w_stand').d + ')'); }
{ const { p, b } = fightC('warden', ['w_dstance', 'w_shieldhit', 'w_stand'], null, ['costOnce_보호막', 1]); const a = A(b, 'w_stand'); ok(a.yc === 1, '아끼는 장갑(costOnce 보호막): 버티기 비용 2 → 1 (' + a.yc + ')'); ok(a.noT === 1 && / · 충전 없음$/.test(a.cost) && !/충전 없음/.test(a.d), '할인으로 1이 되면 카드가 아니라 전투 버튼에 "충전 없음" (' + a.cost + ')');
  p.ys = 5; let k0 = step(b, 'w_stand'); ok(turnG(b, k0) === 0 && noTurn(b, k0), '접사 할인으로 비용 1로 쓰면 다음 차례 충전 없음(S-3 우회 막기)'); }
{ const { p, b, es } = fightC('warden', ['w_dstance', 'w_shieldhit', 'w_stand'], { w_dstance: 'wv_ds_ward' }); ok(!/충전 없음/.test(A(b, 'w_dstance').d) && !A(b, 'w_dstance').noT, '굳은 태세(보호막 +8, 유산 2): 카드 · 버튼에 충전 없음 없음');
  p.ys = 5; let k0 = step(b, 'w_dstance'); step(b, 'basic', es[0].id); ok(turnG(b, k0) === YUSAN.turn, '태세를 켜며 비용 2를 내면 충전 그대로'); /* 수비 태세는 빠른 행동: 기본 공격으로 차례를 끝낸다 */
  ok(A(b, 'w_dstance').yc === 0 && !A(b, 'w_dstance').noT, '켜진 태세 끄기는 비용 0, 버튼에 충전 없음 없음'); p.ys = 3; k0 = step(b, 'w_dstance'); step(b, 'basic', es[0].id); ok(turnG(b, k0) === YUSAN.turn && !noTurn(b, k0), '태세 끄기(비용 0, wdOff)는 새 보호가 아니라 충전 그대로'); }
{ const src = R_('ysSpend.toString()'); ok(src.includes("ca.by !== 'wdOff' && ca.by !== 'wdTurn'"), '돌아선 방패의 태세 바꾸기(wdTurn)도 뺀다(소스)'); }
/* 10월 24일: 고유 붉은 손(주문 유산 +1)이 비용 1 보호 주문을 2로 올리면 카드 끝 문장도 사라진다 */
{ const { p, b } = fightC('spellblade', ['sb_bolt', 'sb_shard', 'sb_ember', 'sb_spark'], { sb_spark: 'sbv_spark_ward' }); const a0 = A(b, 'sb_spark'); ok(a0.yc === 1 && /쓰면 다음 차례 유산 충전 없음\.$/.test(a0.d) && a0.noT === 1, '불티 방패(주문 · 보호막 · 비용 1): 끝 문장 + 버튼 충전 없음 (' + a0.cost + ')');
  { const run = G.run, it = E.mkUq('sb_r3'); run.inv[it.uid] = it; run.eqU.gloves = it.uid; E.applyGear(run, true); } const sk = R_('skOf')(G.run.p, 'sb_spark'); ok(sk.ysUp === 1 && !R_('ysHealSk')(sk) && !/충전 없음/.test(R_('skBody')(sk)), '붉은 손(주문 +1)을 끼면 비용 2: 카드 끝 문장 없음'); }
console.log('ys-heal-check: ' + n + '개 통과');
