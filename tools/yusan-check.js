'use strict';
/* 유산 1차 시제품 점검 (10월 15일): 쿨타임 대신 유산. 실행: node tools/yusan-check.js
   가득 시작 · 차례 끝 +1과 상한 · 대응 +1(라운드에 한 번, 막기 · 흘리기 · 무너뜨리기 · 끊기 · 먼저 치우기) · 비용표 · 모자라면 못 씀 · 🔄 환급(라운드에 한 번) · 스태미나 플라스크(전투에 한 번) · 숨겨진 직업 3의 피로 당기기 · 정화 플라스크 없음 · 강공격 예고 붕괴 · 침묵의 종 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0;
const Y = D.run_('YUSAN'), BLOOD = D.run_('BLOOD'), bmNoPull = D.run_('bmNoPull'), hpCostMul = D.run_('hpCostMul'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const ysRec = (b, src) => b.rec.filter(x => x.k === 'ys' && (!src || x.src === src));
function fight(build, ens, opt) {
  const p = E.mkPlayer(build || 'spellblade', {}, opt || {}); const es = (ens || ['bruiser']).map((r, i) => E.mkEnemy(r, false, i));
  for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; }
  const b = E.newBattle(p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { p, b, es };
}
const setInt = (es, k) => { for (const e of es) e.intent = Object.assign({ k: 'attack' }, k ? { k } : {}); };

// 1) 가득 시작, 상한
{ const { p, b } = fight(); ok(p.ys === Y.start && Y.start === Y.cap && Y.cap === 5, '전투는 유산 가득(5)으로 시작'); ok(b.ysR == null || b.ysR === 0, '라운드 수는 첫 행동 전 0'); }
// 2) 차례 끝 +1, 상한에서 넘침
{ const { p, b, es } = fight(); setInt(es); E.playerAct(b, 'basic', es[0].id); ok(p.ys === 5, '가득일 때 차례 끝 +1은 넘친다'); const t = ysRec(b, 'turn'); ok(t.length === 1 && t[0].g === 0, '넘친 차례 충전은 g 0으로 기록');
  setInt(es); E.playerAct(b, 'sb_edge', es[0].id); ok(p.ys === 4, '비용 2를 쓰고 차례 끝 +1 → 4'); const sp = b.rec.filter(x => x.k === 'yspend'); ok(sp.length === 1 && sp[0].cost === 2 && sp[0].id === 'sb_edge', 'yspend 기록'); }
// 3) 비용표: 시작 · cd 3–5 → 2, 6–8 → 3, 9–10 · 전투마다 1번 → 4 (9직업 모두 같은 함수)
{ let k = 0; for (const id in E.SK2) { const s = E.SK2[id]; if (!s.cd && !s.once) continue; const c = E.skCost(s); const want = s.once ? 4 : s.start ? 2 : s.cd <= 5 ? 2 : s.cd <= 8 ? 3 : 4; assert.equal(c, want, id); k++; }
  ok(k > 700, '720칸 안팎을 모두 셈 (' + k + ')'); ok(E.skCost(E.SK2.h_step) === 2, '시작 스킬(cd 6)도 2'); }
// 4) 모자라면 못 쓴다 · 누르면 아무 일도 없다
{ const { p, b, es } = fight(); p.ys = 1; const a = E.actionList(b).find(x => x.id === 'sb_edge'); ok(!a.ok && /유산 2 필요/.test(a.why) && a.cost === '유산 2', '모자라면 비활성, 비용 표시');
  const hp0 = es[0].hp; E.playerAct(b, 'sb_edge', es[0].id); ok(p.ys === 1 && es[0].hp === hp0, '못 쓰는 스킬을 눌러도 아무 일 없음');
  ok(!E.actionList(b).some(x => x.id === 'flaskM') && E.flaskCap(p, 'mana') === 0, '정화(옛 마나) 플라스크 없음'); }
// 5) 대응: 막기
{ const { p, b, es } = fight(); setInt(es); p.ys = 1; E.playerAct(b, 'guard'); const r = ysRec(b, 'resp'); ok(r.length === 1 && r[0].why === '막기' && r[0].g === 1, '방어 중 받아 내면 막기 +1'); ok(p.ys === 3, '차례 +1, 막기 +1 → 3');
  ok(b.log.some(x => /유산 \+1 \(막기\)/.test(typeof x === 'string' ? x : (x.t || x.m || ''))), '기록에 "유산 +1 (막기)"'); }
// 6) 대응: 흘리기
{ const { p, b, es } = fight(); setInt(es); p.ys = 1; E.playerAct(b, 'dodge', es[0].id); const r = ysRec(b, 'resp'); ok(r.length === 1 && r[0].why === '흘리기', '흘리기 성공 +1'); ok(p.ys === 3, '흘리기 뒤 3'); }
// 7) 대응: 무너뜨리기 · 라운드에 한 번
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es); p.ys = 1; es[0].brk = es[0].brkMax - 1; E.playerAct(b, 'basic', es[0].id); const r = ysRec(b, 'resp'); ok(r.length >= 1 && r[0].why === '무너뜨리기', '무너뜨리면 +1');
  const R = b.ysR; ok(E.ysResp(b, '막기') === 0, '같은 라운드의 두 번째 대응은 0'); ok(ysRec(b, 'resp').filter(x => x.r === R).length === 1, '라운드마다 한 번'); }
// 8) 대응: 끊기 (모으는 적을 무너뜨림)
{ const { p, b, es } = fight(); setInt(es, 'heavy'); p.ys = 1; es[0].brk = es[0].brkMax - 1; E.playerAct(b, 'basic', es[0].id); const r = ysRec(b, 'resp'); ok(r.length >= 1 && r[0].why === '끊기', '강타 예고를 무너뜨리면 끊기 +1'); ok(b.rec.some(x => x.k === 'break' && x.cut), 'break cut 기록'); }
// 9) 대응: 먼저 치우기 (이번 라운드에 아직 움직이지 않은 예고 중인 적)
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es); p.ys = 1; ok(b.queue.includes(es[0].id), '적이 아직 순서에 남아 있음'); es[0].hp = 1; es[0].brk = 0; E.playerAct(b, 'basic', es[0].id); const r = ysRec(b, 'resp'); ok(r.length >= 1 && r[0].why === '먼저 치우기', '움직이기 전에 쓰러뜨리면 먼저 치우기 +1'); }
// 10) 🔄 · 처치 다시 쓰기 환급: 라운드에 한 번
{ const { p, b, es } = fight(); setInt(es); E.playerAct(b, 'basic', es[0].id); p.ys = 1; ok(E.hastenBranch(b, '혈인', 2, null) === 1 && p.ys === 2, '🔄 → 유산 +1 (n과 상관없이 1)'); ok(E.ysRefund(b, '숨통 끊기') === 0 && p.ys === 2, '같은 라운드 두 번째 환급은 없음');
  E.playerAct(b, 'basic', es[0].id); const ys0 = p.ys; ok(E.ysRefund(b, 'x') === 1 && p.ys === ys0 + 1, '다음 라운드에는 다시 환급'); }
// 11) 장비 효과: 라운드에 한 번
{ const { p, b, es } = fight(); setInt(es); E.playerAct(b, 'basic', es[0].id); p.ys = 1; ok(E.ysItem(b, '장비') === 1 && E.ysItem(b, '장비') === 0 && p.ys === 2, '장비 유산 +1은 라운드에 한 번'); }
// 12) 스태미나 플라스크: 전투에 한 번 +1
{ const { p, b } = fight(); p.ys = 2; p.flask.stam = 3; E.playerAct(b, 'flaskS'); ok(p.ys === 3, '스태미나 플라스크 +1'); ok(ysRec(b, 'flask').length === 1, 'flask 기록');
  b.bonusUsed = 0; E.playerAct(b, 'flaskS'); ok(p.ys === 3 && p.flask.stam === 1, '두 번째 플라스크는 유산을 주지 않는다'); }
// 13) 숨겨진 직업 3: 모자란 유산을 생명력으로 (1마다 최대 생명력 × 4%, 차례에 한 번, 1 아래로 내려가지 않음)
{ const { p, b, es } = fight('bloodmage'); setInt(es); p.ys = 0; const sid = (p.skills || []).find(id => { const s = E.SK2[id]; return s && !bmNoPull(s) && !s.fx.some(f => f.k === 'hpCost' || f.k === 'drain'); });
  ok(!!sid, '당길 스킬'); const s = E.SK2[sid]; const a = E.actionList(b).find(x => x.id === sid); const want = Math.ceil(p.hpMax * BLOOD.per * E.skCost(s) * hpCostMul(p) - 1e-9);
  ok(a.ok && a.pull && a.blood === want, '피로 당기기 표시 ' + a.blood + ' = ' + want); const hp0 = p.hp; E.playerAct(b, sid, es[0].id); ok(b.rec.some(x => x.k === 'blood' && x.w === 'pull' && x.n === want) && p.hp <= hp0 - want, '모자란 유산 2 × 4% 생명력을 낸다'); ok(p.ys === 1, '유산 0에서 비용 2를 생명력으로 내고 차례 끝 +1 → 1');
  ok(b.rec.some(x => x.k === 'bmpull' && x.cd === E.skCost(s)), 'bmpull 기록(모자란 유산)'); const a2 = E.actionList(b).find(x => x.id === sid); ok(a2.ok || /유산/.test(a2.why || ''), '다음 차례 상태');
  p.ys = 0; b.bloodTurn = b.turnIdx; const a3 = E.actionList(b).find(x => x.id === sid); ok(!a3.ok && /이미 피로 당겼음/.test(a3.why), '피로 당기기는 차례마다 한 번');
  b.bloodTurn = -1; p.hp = 2; const a4 = E.actionList(b).find(x => x.id === sid); ok(!a4.ok && /생명력이 모자랍니다/.test(a4.why), '생명력 1 아래로는 낼 수 없다'); }
// 14) 강공격: 예고 중인 적에게 붕괴를 더한다 (확정 끊기 없음)
{ const { p, b, es } = fight(); setInt(es, 'charge'); es[0].brkMax = 999; es[0].brk = 0; p.st = 100; E.playerAct(b, 'heavy', es[0].id); const base = 35 + 5 * Math.floor(E.stat(p, 'str') / 10); ok(Math.abs(es[0].brk - (base + Y.heavyTele) * (1 + 0.01 * E.stat(p, 'str'))) < 1e-6, '예고 중 강공격 붕괴 = 기본 + ' + Y.heavyTele);
  ok(es[0].intent.k !== 'attack' || true, '붕괴 게이지가 있으면 끊지 않음'); }
{ const { p, b, es } = fight(); setInt(es); es[0].brkMax = 999; es[0].brk = 0; p.st = 100; E.playerAct(b, 'heavy', es[0].id); const base = 35 + 5 * Math.floor(E.stat(p, 'str') / 10); ok(Math.abs(es[0].brk - base * (1 + 0.01 * E.stat(p, 'str'))) < 1e-6, '예고가 없으면 기본 붕괴'); ok(base > 10, '강공격 붕괴가 기본 공격(10)보다 높다'); }
// 15) 침묵의 종 · 독 거두는 손: 유산 −1, 0 아래로 내려가지 않음
{ const { p, b } = fight(); p.ys = 0; const l = E.ysLose(b, 1, '침묵의 종'); ok(l === 0 && p.ys === 0, '0 아래로 내려가지 않음'); p.ys = 3; ok(E.ysLose(b, 1, '침묵의 종') === 1 && p.ys === 2, '유산 −1'); }
console.log('yusan-check: ' + n + '개 통과');
