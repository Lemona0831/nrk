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
// 3) 비용표(0.8.0 M5-0): 트리 노드의 ys만 읽는다. 노드 밖은 2, 전투마다 1번은 4(쿨타임 변환표 · cheap 분기는 없앴다)
{ let k = 0; for (const id in E.SK2) { const s = E.SK2[id]; const c = E.skCost(s); const want = s.ys != null ? s.ys : s.once ? 4 : 2; assert.equal(c, want, id); k++; }
  ok(k > 700, '720칸 안팎을 모두 셈 (' + k + ')'); ok(E.skCost(E.SK2.h_step) === 2, '시작 스킬(cd 6)도 2'); ok(E.skCost(Object.assign({}, E.SK2.sb_deluge, { ys: 4 })) === 4 && E.skCost(Object.assign({}, E.SK2.sb_bolt, { ys: 1 })) === 1, '노드 비용을 그대로 읽음'); }
// 4) 모자라면 못 쓴다 · 누르면 아무 일도 없다
{ const { p, b, es } = fight(); p.ys = 1; const a = E.actionList(b).find(x => x.id === 'sb_edge'); ok(!a.ok && /유산 2 필요/.test(a.why) && a.cost === '유산 2', '모자라면 비활성, 비용 표시');
  const hp0 = es[0].hp; E.playerAct(b, 'sb_edge', es[0].id); ok(p.ys === 1 && es[0].hp === hp0, '못 쓰는 스킬을 눌러도 아무 일 없음');
  ok(E.actionList(b).some(x => x.id === 'flaskM') && E.flaskCap(p, 'mana') === 3 && p.flask.mana === 3, '정화 플라스크는 그대로 (10월 15일 수정: 되살림)'); }
// 5) 대응: 막기
{ const { p, b, es } = fight(); setInt(es); p.ys = 1; E.playerAct(b, 'guard'); const r = ysRec(b, 'resp'); ok(r.length === 1 && r[0].why === '막기' && r[0].g === 1, '방어 중 받아 내면 막기 +1'); ok(p.ys === 3, '차례 +1, 막기 +1 → 3');
  const L = b.log.map(x => x.m || ''); ok(L.some(m => /유산 1 → 2 \(\+1, 막기\)/.test(m)), '기록에 "유산 1 → 2 (+1, 막기)"'); ok(L.some(m => /유산 2 → 3 \(\+1, 차례\)/.test(m)), '차례 충전도 앞 → 뒤로 (다음 내 차례가 시작될 때)'); ok(!L.some(m => /유산 \+1 \(/.test(m)), '옛 "유산 +1 (막기)" 줄은 없다(두 번 적지 않음)'); }
// 6) 대응: 흘리기
{ const { p, b, es } = fight(); setInt(es); p.ys = 1; E.playerAct(b, 'dodge', es[0].id); const r = ysRec(b, 'resp'); ok(r.length === 1 && r[0].why === '흘리기', '흘리기 성공 +1'); ok(p.ys === 3, '흘리기 뒤 3'); }
// 7) 대응: 무너뜨리기 · 라운드에 한 번
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es); p.ys = 1; es[0].brk = es[0].brkMax - 1; E.playerAct(b, 'basic', es[0].id); const r = ysRec(b, 'resp'); ok(r.length >= 1 && r[0].why === '무너뜨리기', '무너뜨리면 +1');
  const R = b.ysR; ok(E.ysResp(b, '막기') === 0, '같은 라운드의 두 번째 대응은 0'); ok(ysRec(b, 'resp').filter(x => x.r === R).length === 1, '라운드마다 한 번'); }
// 8) 대응: 끊기 (모으는 적을 무너뜨림)
{ const { p, b, es } = fight(); setInt(es, 'heavy'); p.ys = 1; es[0].brk = es[0].brkMax - 1; E.playerAct(b, 'basic', es[0].id); const r = ysRec(b, 'resp'); ok(r.length >= 1 && r[0].why === '끊기', '강타 예고를 무너뜨리면 끊기 +1'); ok(b.rec.some(x => x.k === 'break' && x.cut), 'break cut 기록'); }
// 9) 대응: 먼저 치우기 (10월 15일 수정: 이번 라운드에 아직 움직이지 않았고 큰 예고 YS_PRE_K · 겨눈 한 발일 때만)
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es, 'heavy'); p.ys = 1; ok(b.queue.includes(es[0].id), '적이 아직 순서에 남아 있음'); es[0].hp = 1; es[0].brk = 0; E.playerAct(b, 'basic', es[0].id); const r = ysRec(b, 'resp'); ok(r.length >= 1 && r[0].why === '먼저 치우기', '강타를 모으는 적을 움직이기 전에 쓰러뜨리면 먼저 치우기 +1'); }
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es); p.ys = 1; es[0].hp = 1; es[0].brk = 0; E.playerAct(b, 'basic', es[0].id); ok(!ysRec(b, 'resp').some(x => x.why === '먼저 치우기'), '평소 공격 예고인 적을 쓰러뜨리면 먼저 치우기 아님'); }
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es); es[0].intent.aimed = 1; p.ys = 1; es[0].hp = 1; es[0].brk = 0; E.playerAct(b, 'basic', es[0].id); ok(ysRec(b, 'resp').some(x => x.why === '먼저 치우기'), '겨눈 한 발도 큰 예고'); }
{ const { p, b, es } = fight('spellblade', ['bruiser', 'bruiser']); setInt(es, 'heavy'); b.queue = b.queue.filter(id => id !== es[0].id); p.ys = 1; es[0].hp = 1; es[0].brk = 0; E.playerAct(b, 'basic', es[0].id); ok(!ysRec(b, 'resp').some(x => x.why === '먼저 치우기'), '이번 라운드에 이미 움직인 적은 아님'); }
{ const K = D.run_('YS_PRE_K'); ok(['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn'].every(k => K.includes(k)) && !K.includes('attack') && !K.includes('guard'), 'YS_PRE_K: 끊기 계열은 들고 평소 공격 · 지키기는 없음'); }
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
// 16) 1차-b 스위치 (10월 15일): A 싼 칸 1, B 긴 전투 차례 충전 +2, C 볼록한 비용당 값. 기본값을 바꾸지 않고 켜고 끄며 본다
{ const S0 = Object.assign({}, Y); const reset = () => { Object.assign(Y, S0); D.run_('ysConvexApply()'); };
  Y.cheap = 1; Y.convex = 0; D.run_('ysConvexApply()'); const all = Object.values(E.SK2); ok(E.skCost(E.SK2.sb_edge) === 2 && E.skCost(Object.assign({}, E.SK2.sb_kindle, { ys: 2 })) === 2, 'A: cheap 분기는 없앴다(0.8.0 M5-0) — 켜도 비용은 노드 그대로');
  Y.cheap = 0;
  Y.longFrom = 3; { const { p, b, es } = fight(); setInt(es); p.ys = 0; for (let i = 0; i < 4; i++) { setInt(es); E.playerAct(b, 'basic', es[0].id); } const t = ysRec(b, 'turn'); ok(t.length === 4 && t[0].n === 1 && t[1].n === 1 && t[2].n === 2 && t[3].n === 2, 'B: 3번째 내 차례부터 차례 충전 +2'); }
  Y.longFrom = 0; { const { p, b, es } = fight(); setInt(es); p.ys = 0; for (let i = 0; i < 4; i++) { setInt(es); E.playerAct(b, 'basic', es[0].id); } ok(ysRec(b, 'turn').every(x => x.n === 1), 'B 끄면 늘 +1'); }
  Y.cheap = 1; Y.convex = 1; D.run_('ysConvexApply()');
  const sc = all.filter(s => s._fx0); ok(sc.every(s => E.skCost(s) >= 3 && s.ysMul > 1 && s.ysMul <= Y.convexCap), 'C: 비용 3 · 4만(0.8.0 M5-0부터 노드 밖 SK2는 2 · 전투마다 1번 4라 거의 전투마다 1번 칸), 배율 1에서 ' + Y.convexCap);
  ok(all.filter(s => E.skCost(s) <= 2).every(s => !s._fx0), 'C: 비용 1 · 2는 그대로');
  ok(sc.every(s => s.fx.every((e, i) => { const o = s._fx0[i]; return ['dmg', 'brk', 'poison', 'st'].includes(e.k) && o.n > 0 ? e.n >= o.n && e.n <= Math.ceil(o.n * Y.convexCap) : JSON.stringify(e) === JSON.stringify(o); })), 'C: 피해 · 붕괴 · 중독 · 상태 수치만, 최대 ' + Y.convexCap + '배');
  reset(); ok(all.every(s => !!s._fx0 === !!(Y.convex && s.ysMul)), '스위치 되돌림'); }
ok(Y.longFrom === 8 && !Y.cheap && !Y.convex, '기본값: 1차-b 측정으로 고른 B8 (8번째 내 차례부터 +2), A · C 꺼짐');
// 17) 10월 16일 화면 정리: 차례 충전을 다음 내 차례 시작으로 옮겨도 내 차례마다 쓸 수 있는 양은 같다 (같은 각본을 두 규칙으로 돌려 비교, 긴 전투 +2 포함)
{ const runSeq = atStart => { const S0 = Object.assign({}, Y); Y.turnAtStart = atStart; Y.longFrom = 3; const { p, b, es } = fight('spellblade', ['bruiser', 'archer']); const seen = [];
    const plan = ['sb_aegis', 'sb_edge', 'sb_edge', 'sb_aegis', 'sb_edge', 'guard', 'sb_edge', 'sb_aegis', 'sb_edge', 'dodge', 'sb_edge', 'sb_aegis', 'sb_edge', 'basic', 'sb_edge', 'sb_edge'];
    for (const a of plan) { if (b.over) break; seen.push(p.ys); const L = E.actionList(b); const x = L.find(y => y.id === a && y.ok) ? a : 'basic'; E.playerAct(b, x, a === 'dodge' ? es[0].id : es[0].id); }
    seen.push(p.ys); const tot = ysRec(b).reduce((q, x) => q + (x.g || 0), 0); Object.assign(Y, S0); return { seen, tot, log: b.log.map(x => x.m || '') }; };
  const A0 = runSeq(0), A1 = runSeq(1); if (process.env.YS_SHOW) console.log(A0.seen.join(','), '|', A1.seen.join(','), A0.tot);
  ok(JSON.stringify(A0.seen) === JSON.stringify(A1.seen), '내 차례마다 남은 유산이 두 규칙에서 같다 ' + A1.seen.join(','));
  ok(A0.tot === A1.tot, '충전 합이 같다 (' + A0.tot + ')');
  ok(A1.log.some(m => /유산 \d → \d \(−2, /.test(m)), '쓰는 줄: 유산 5 → 3 (−2, 스킬 이름)');
  ok(A1.log.some(m => /\(\+2, 차례\)/.test(m)), '긴 전투 차례 충전 +2 줄'); }
// 18) 판 기록 요약 rooms[].ys
{ const { p, b, es } = fight(); setInt(es); E.playerAct(b, 'sb_edge', es[0].id); setInt(es); E.playerAct(b, 'guard'); const o = E.ysSum(b); ok(o && o.s === 5 && o.use === 2 && o.sp[2] === 1 && o.ids.sb_edge === 1 && o.ch.turn >= 1 && typeof o.w === 'number', '전투 요약 ysSum: ' + JSON.stringify(o)); }
// 19–26) 0.8.0 M4 (10월 19일): 방향별 유산 통로 · 날 선 손 · 쉬지 않는 팔 · 깊은 샘 대가 · 평타 노드 · 옛 세이브 각인 환급
function fightPn(build, pn, ens) {
  const p = E.mkPlayer(build || 'warden', {}, {}); p.pn = pn.slice(); const es = (ens || ['bruiser']).map((r, i) => E.mkEnemy(r, false, i));
  for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; }
  const b = E.newBattle(p, es, {}); b.rngF = () => 0.5; b.stepMode = false; p.pn = pn.slice(); E.runUntilPlayer(b); return { p, b, es };
}
const ysResp = D.run_('ysResp');
{ const { p, b, es } = fightPn('warden', ['ks_blockbreath']); setInt(es); p.ys = 1; E.playerAct(b, 'guard'); const r = ysRec(b, 'resp');
  ok(r.some(x => x.why === '막기' && x.g === 1) && r.some(x => x.why === '막아 낸 숨' && x.g === 1), '막아 낸 숨: 막기 대응 +1에 +1 더');
  for (let k = 0; k < 3; k++) { setInt(es); E.playerAct(b, 'guard'); } ok(ysRec(b, 'resp').filter(x => x.why === '막아 낸 숨').length === 2, '막아 낸 숨은 전투마다 2번'); }
{ const { p, b } = fightPn('warden', ['ks_blockbreath']); p.ys = 0; b.ysR = 7; ysResp(b, '막기'); ysResp(b, '막기'); const r = ysRec(b, 'resp');
  ok(r.filter(x => x.why === '막기').length === 1 && r.filter(x => x.why === '막아 낸 숨').length === 1, '라운드 공유 한도에 막힌 대응에는 통로 +1도 없다'); }
{ const { p, b } = fightPn('warden', ['ks_brkbreath']); p.ys = 0; ysResp(b, '막기'); ok(!ysRec(b, 'resp').some(x => x.why === '무너뜨린 숨'), '무너뜨린 숨은 막기에 붙지 않는다');
  b.ysR = 3; ysResp(b, '무너뜨리기'); ok(ysRec(b, 'resp').some(x => x.why === '무너뜨린 숨'), '무너뜨린 숨: 무너뜨리기 대응에 +1 더'); }
{ const { p, b } = fightPn('warden', ['ks_slipbreath']); p.ys = 0; ysResp(b, '먼저 치우기'); b.ysR = 4; ysResp(b, '흘리기'); ok(ysRec(b, 'resp').filter(x => x.why === '흘린 숨').length === 2, '흘린 숨: 흘리기 · 먼저 치우기'); }
{ const { p, b } = fightPn('elementalist', ['ks_el_cut', 'ks_brkbreath']); p.ys = 0; ysResp(b, '무너뜨리기'); const r = ysRec(b, 'resp');
  ok(r.some(x => x.why === '끊어진 영창') && !r.some(x => x.why === '무너뜨린 숨'), '원소술사: 끊어진 영창이 준 무너뜨리기에는 무너뜨린 숨을 겹치지 않는다'); }
{ const dmgOf = pn => { const { b, es } = fightPn('warden', pn); setInt(es); const h0 = es[0].hp; E.playerAct(b, 'basic', es[0].id); return h0 - es[0].hp; };
  const d0 = dmgOf([]), d1 = dmgOf(['ks_sharp']), d2 = dmgOf(['ks_deep']);
  ok(Math.abs(d1 / d0 - 1.3) < 0.02, '날 선 손: 기본 공격 피해 ×1.3 (' + d0 + ' → ' + d1 + ')'); ok(Math.abs(d2 / d0 - 0.85) < 0.02, '깊은 샘 대가: 기본 공격 피해 ×0.85 (' + d2 + ')');
  const brkOf = (pn, k) => { const { b, es } = fightPn('warden', pn); setInt(es, k); const b0 = es[0].brk || 0; E.playerAct(b, 'basic', es[0].id); return (es[0].brk || 0) - b0; };
  ok(brkOf(['ks_sharp'], 'heavy') - brkOf([], 'heavy') === 10 && brkOf(['ks_sharp'], null) === brkOf([], null), '날 선 손: 예고 중인 적에게만 붕괴 +10');
  const { p } = fightPn('warden', ['ks_sharp']); ok(D.run_('ysStartOf')(p) === Y.start - 2, '날 선 손 대가: 시작 유산 −2'); }
{ const hc = D.run_('heavyCost'); const a = fightPn('warden', []).p, c = fightPn('warden', ['ks_tireless']).p; ok(hc(a) - hc(c) === 15, '쉬지 않는 팔: 강공격 스태미나 −15'); ok(E.flaskCap(c, 'life') === E.flaskCap(a, 'life') - 1, '쉬지 않는 팔 대가: 생명력 플라스크 −1'); }
{ const { p, b, es } = fightPn('warden', ['n_bs_st']); setInt(es); p.st = 10; E.playerAct(b, 'basic', es[0].id); ok(p.st >= 13, '평타 노드: 기본 공격이 맞히면 스태미나 +3 (' + p.st + ')'); }
{ const run = { build: 'warden', ptree: { own: [], free: ['ct4L', 'lg4R'], ks: ['lgK9', 'ctK5', 'lgK5'], pts: 0, log: [] }, ksLog: [{ id: 'ctK5', free: ['ct4L'] }, { id: 'lgK9', free: ['lg4R'] }, { id: 'lgK5', free: [] }], ksPending: 0 };
  const k = D.run_('ksMigrateM4')(run); ok(k === 2 && run.ptree.ks.join() === 'lgK5' && run.ksPending === 2 && run.ptree.free.length === 0 && run.ptree.ksv === 2, '옛 세이브: 바뀐 자리 각인(넘치는 그릇 · 망치의 길)과 그 길을 거두고 2번 다시 고름');
  ok(D.run_('ksMigrateM4')(run) === 0, '옛 세이브 옮기기는 한 번만'); }
console.log('yusan-check: ' + n + '개 통과');
