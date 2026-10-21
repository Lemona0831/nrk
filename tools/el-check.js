'use strict';
/* 0.8.0 M5-5 원소술사 재설계 점검 (10월 20일 만든 사람 설계지 2판). 실행: node tools/el-check.js
   시작 스킬(마력탄 · 원소 전환, 전투는 불로 시작, 기본 공격은 원소 없음) · 빙결(둔화 3 → 다음 행동을 놓침, 강적 · 보스는 붕괴 +40, 열충격이 먼저, 적 차례에도) ·
   서리 무게 −20%(큰 공격 포함) · 승부수 셋(빙염의 화신 · 영겁의 정적 · 천화)과 대가 · 새 효과 · 결합 칸 · 한 줄 설명 · 옛 판 옮기기 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, U = R_('EL5_BOUND'), st = R_('st'), sbd = R_('skillBaseDamage');
function fight(act, en, hp) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('elementalist'); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = act.slice(); run.skills = act.filter(id => (E.atBuild('elementalist').nodes[id] || {}).kind === 'skill').slice(-4); E.atSync(run); // 뒤의 넷(승부수는 끝에 둔다)
  const es = (en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = hp || 5000; e.dmg = 1; e.brkMax = 99999; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const A = (b, id) => E.actionList(b).find(x => x.id === id) || {};
const use = (b, id, t) => { b.p.ys = 9; b.p.st = b.p.stMax; b.stepMode = true; const t0 = b.turnIdx; E.playerAct(b, id, t); b.stepMode = false; return b.turnIdx === t0; }; // 차례가 이어졌는가(적 차례는 돌리지 않는다)
const next = b => { b.stepMode = false; E.runUntilPlayer(b); };
const enemyHit = (b, e, raw, x) => { const cur = b.cur; b.cur = null; const d = E.hurtPlayer(b, raw, Object.assign({ src: e }, x || {})); b.cur = cur; return d; };
const recN = (b, k, f) => b.rec.filter(r => r.k === k && (!f || f(r))).length;
// 시작 스킬
{ const f = fight([]); const { p, b, es } = f; const e = es[0];
  ok(p.elSt && p.elSt.el === 'fire' && JSON.stringify(p.skills.slice(0, 2)) === JSON.stringify(['e5_bolt', 'e5_switch']), '시작 스킬 마력탄 · 원소 전환, 전투는 불로 시작');
  ok(A(b, 'e5_switch').yc === 1 && A(b, 'e5_switch').time <= 0.6, '원소 전환: 빠른 행동 · 유산 1');
  ok(use(b, 'e5_bolt', e.id) && st(e, 'ignite') === 2 && !st(e, 'chill'), '🔥 마력탄: 화상 2(빠른 행동)'); use(b, 'guard'); next(b);
  ok(use(b, 'e5_switch') && p.elSt.el === 'ice', '원소 전환: 불 → 얼음(빠른 행동, 차례가 이어진다)');
  const e2 = es[1]; ok(!use(b, 'e5_bolt', e2.id) && st(e2, 'chill') === 2 && !st(e2, 'ignite'), '❄ 마력탄: 둔화 2(빠른 칸을 이미 썼으면 주 행동)'); next(b);
  use(b, 'e5_switch'); ok(p.elSt.el === 'fire', '원소 전환: 얼음 → 불');
  const f2 = fight([]); use(f2.b, 'basic', f2.es[0].id); ok(!st(f2.es[0], 'ignite') && !st(f2.es[0], 'chill'), '기본 공격(마력 화살)에는 원소가 없음'); }
{ const f = fight([]); f.p.elSt.el = 'ice'; next(f.b); ok(fight([]).p.elSt.el === 'fire', '새 전투는 다시 불로 시작'); }
// 빙결
{ const f = fight([]); const { p, b, es } = f; const e = es[0]; p.elSt.el = 'ice'; E.addS(b, e, 'chill', 1); use(b, 'e5_bolt', e.id);
  ok(!st(e, 'chill') && e.stun === 1 && recN(b, 'freeze', r => !r.big) === 1, '빙결: 둔화가 가득 차면(3) 다음 행동을 놓치고 둔화가 풀림'); }
{ const f = fight([]); const { p, b, es } = f; const e = es[0]; e.strong = 1; p.elSt.el = 'ice'; E.addS(b, e, 'chill', 1); const b0 = e.brk; use(b, 'e5_bolt', e.id);
  ok(!st(e, 'chill') && !(e.stun > 0) && e.brk - b0 === U.frzBrk && recN(b, 'freeze', r => r.big) === 1, '강적: 얼지 않고 붕괴 +40, 둔화는 풀림'); }
{ const f = fight(['e5_icespear']); const { b, es } = f; const e = es[0]; E.addS(b, e, 'ignite', 2); E.addS(b, e, 'chill', 1); use(b, 'e5_icespear', e.id);
  ok(recN(b, 'shock') === 1 && recN(b, 'freeze') === 0 && !(e.stun > 0), '열충격이 먼저: 화상이 있으면 둔화 3이 되어도 열충격으로 두 상태가 사라지고 얼지 않음'); }
{ const f = fight([]); const { p, b, es } = f; const e = es[0]; E.addS(b, e, 'chill', 2); p.rime = { chill: { n: 1, times: 3 } }; enemyHit(b, e, 0); R_('elemShock')(b, 'enemy');
  ok(!st(e, 'chill') && e.stun === 1 && recN(b, 'freeze', r => r.by === 'enemy') === 1, '적 차례: 되얼림으로 둔화가 가득 차도 빙결(그 적의 다음 행동)'); }
{ const f = fight([]); const { b, es } = f; const e = es[0]; E.addS(b, e, 'chill', 3); const f2 = fight([], ['bruiser']); E.addS(f2.b, f2.es[0], 'chill', 2); f2.b.p.elSt.el = 'ice';
  ok(R_('elemPreview')(f2.b, E.SK2.e5_bolt, f2.es[0]).frz === 1 && R_('elemPreview')(f2.b, E.SK2.e5_firebolt, f2.es[0]).frz === 0, '미리 보기: 이 행동 끝에 얼어붙는지(빙결)'); }
// 서리 무게: −20%, 큰 공격 포함
{ const f = fight([]); const { p, b, es } = f; E.addS(b, es[0], 'chill', 1); const h = p.hp; enemyHit(b, es[0], 10); const n0 = h - p.hp; const h2 = p.hp; enemyHit(b, es[0], 10, { charged: 1 }); const c0 = h2 - p.hp; const h3 = p.hp; enemyHit(b, es[1], 10); const d1 = h3 - p.hp;
  ok(Math.abs(n0 - 8) < 0.01 && Math.abs(c0 - 8) < 0.01 && Math.abs(d1 - 10) < 0.01 && R_('ELEM').guard === 0.2, '서리 무게: 둔화된 적의 공격 10 → 8, 강타도 8, 둔화 없는 적은 10'); }
// 빙염의 화신
{ const f = fight(['e5_firebolt', 'e5_icespear', 'e5_weave', 'e5_catalyst', 'e5_arc', 'e5_storm', 'e5_avatar']); const { p, b, es } = f; const e = es[0];
  ok(!use(b, 'e5_avatar'), '빙염의 화신: 쓰면 차례가 끝남(보통)'); next(b); const h0 = p.hp; p.hp = h0; b.prepTurn = null; use(b, 'basic', e.id);
  ok(Math.abs(h0 - p.hp - Math.round(p.hpMax * U.avatarHp)) < 1.01 || p.hp < h0, '대가: 내 차례마다 최대 생명력 5%'); ok(recN(b, 'shock') >= 1, '화신: 기본 공격도 화상 1 · 둔화 1 → 맞히는 족족 열충격');
  for (let i = 0; i < 3; i++) { next(b); use(b, 'basic', e.id); } ok(!R_('elAvOn')(b) && p.elSt.avatar === 0, '3차례 뒤 끝'); }
// 영겁의 정적
{ const f = fight(['e5_icespear', 'e5_charge', 'e5_frostbolt', 'e5_stillward', 'e5_shardrain', 'e5_stilleye', 'e5_stasis'], ['bruiser', 'bruiser', 'bruiser']); const { p, b, es } = f; es[2].strong = 1; const b2 = es[2].brk;
  use(b, 'e5_stasis'); ok(es[0].stun === 2 && es[1].stun === 2 && !(es[2].stun > 0) && st(es[2], 'chill') === 3 && es[2].brk === b2, '영겁의 정적: 작은 적은 이번 · 다음 라운드 행동을 놓침, 강적은 대신 둔화 3(얼지 않음)');
  ok(p.stun === 1, '대가: 내 다음 차례도 못 함'); const t0 = b.turnIdx; next(b); const L0 = b.log.length; b.stepMode = true; E.playerAct(b, 'basic', es[0].id); ok(b.log.slice(L0).some(x => /행동을 놓친다/.test(x.m)) && p.stun === 0, '다음 차례는 놓침'); }
// 천화
{ const f = fight(['e5_charge', 'e5_firebolt', 'e5_manaflame', 'e5_kindlemana', 'e5_flamelance', 'e5_heatshield', 'e5_meteor']); const { p, b, es } = f; p.hp = 100; p.hpMax = Math.max(p.hpMax, 100); use(b, 'e5_meteor');
  ok(p.hp === 50 && es.every(e => e.hp < e.hpMax && st(e, 'ignite') >= 2), '천화: 지금 생명력의 절반을 바치고 모든 적에게 피해 · 화상 3'); }
// 빙결 파쇄 · 서리 균열 · 번지는 불 · 비전 일격
{ const sh = c => { const f = fight(['e5_icespear', 'e5_crack', 'e5_shatter']); const e = f.es[0]; if (c) E.addS(f.b, e, 'chill', c); use(f.b, 'e5_shatter', e.id); return { d: e.hpMax - e.hp, c: st(e, 'chill'), f }; };
  const a0 = sh(0), a2 = sh(2); ok(Math.abs(a2.d - a0.d - sbd(a2.f.p, E.SK2.e5_shatter, E.SK2.e5_shatter.fx.find(x => x.k === 'elShatter').per * 2)) < 1.01 && a2.c === 0, '빙결 파쇄: 둔화를 모두 지우고 둔화 1마다 피해 +' + E.SK2.e5_shatter.fx.find(x => x.k === 'elShatter').per); }
{ const f = fight(['e5_icespear', 'e5_crack']); const e = f.es[0]; E.addS(f.b, e, 'chill', 2); const b0 = e.brk; use(f.b, 'e5_crack', e.id); ok(e.brk - b0 >= E.SK2.e5_crack.fx.find(x => x.k === 'elChillBrk').per * 2, '서리 균열: 둔화 1마다 붕괴'); }
{ const f = fight(['e5_firebolt', 'e5_spread'], ['bruiser', 'bruiser', 'bruiser']); const e = f.es[0]; E.addS(f.b, e, 'ignite', 6); use(f.b, 'e5_spread', e.id); ok(st(f.es[1], 'ignite') >= 2 && st(f.es[2], 'ignite') >= 2, '번지는 불: 대상 화상 절반을 다른 적 모두에게'); }
{ const ar = v => { const f = fight(['e5_charge', 'e5_volley', 'e5_arcane']); const e = f.es[0]; if (v) E.addS(f.b, e, 'vuln', 1); use(f.b, 'e5_arcane', e.id); return e.hpMax - e.hp; }; ok(ar(1) / ar(0) > 1.9, '비전 일격: 취약 걸린 적에게 ×2(취약 ×1.25와 따로)'); }
// 마력 응축 · 마력 연사 · 불씨 응축 · 마염 화살
{ const f = fight(['e5_charge']); const { p, b, es } = f; const e = es[0]; const h0 = e.hp; use(b, 'basic', e.id); const d0 = h0 - e.hp; next(b);
  use(b, 'e5_charge'); const add = p.elSt.charge.add; const n0 = E.SK2.e5_charge.fx.find(x => x.k === 'elCharge').n; ok(add > 0 && p.elSt.charge.n === n0, '마력 응축: 다음 기본 공격 ' + n0 + '번 피해 +' + add); const h1 = e.hp; use(b, 'basic', e.id); ok(h1 - e.hp > d0 + add * 0.9, '응축한 기본 공격이 더 아프다'); }
{ const f = fight(['e5_charge', 'e5_volley']); const { b, es } = f; const e = es[0]; let h = e.hp; use(b, 'basic', e.id); const d1 = h - e.hp; next(b); use(b, 'e5_volley'); const n0 = f.p.elSt.multi.n; h = e.hp; use(b, 'basic', e.id); ok(Math.abs((h - e.hp) / d1 - 2) < 0.05 && (f.p.elSt.multi ? f.p.elSt.multi.n : 0) === n0 - 1, '마력 연사: 기본 공격이 두 발(남은 횟수 ' + n0 + ' → ' + (n0 - 1) + ')'); }
{ const f = fight(['e5_charge', 'e5_barrier', 'e5_manaflame', 'e5_kindlemana']); const { b, es } = f; use(b, 'e5_kindlemana'); use(b, 'basic', es[0].id); ok(st(es[0], 'ignite') === 2, '불씨 응축: 기본 공격에 화상 2'); }
{ const f = fight(['e5_manafire']); const { b, es } = f; use(b, 'e5_manafire'); E.addS(b, es[0], 'ignite', 2); use(b, 'basic', es[0].id); ok(st(es[0], 'ignite') >= 2 && b.log.some(x => /마염 화살/.test(x.m || '')), '마염 화살: 화상 걸린 적을 기본 공격으로 치면 화상 +1'); }
// 얼어붙은 불씨 · 서리 방벽 · 촉매 · 마력 결계 · 얼음 장벽 · 열기 방패 · 불꽃 외투
{ const f = fight(['e5_frostember', 'e5_firebolt']); const { b, es } = f; use(b, 'e5_frostember'); E.addS(b, es[0], 'chill', 1); E.addS(b, es[1], 'ignite', 1); ok(st(es[1], 'ignite') === 1, '얼어붙은 불씨: 둔화 없는 적은 그대로'); b.cur = { id: 'x' }; E.addS(b, es[0], 'ignite', 1); b.cur = null; ok(st(es[0], 'ignite') === 2, '얼어붙은 불씨: 둔화 걸린 적에게 화상을 걸면 +1'); }
{ const f = fight(['e5_frostwall']); const { p, b, es } = f; use(b, 'e5_frostwall'); enemyHit(b, es[0], 5); ok(!st(es[0], 'chill'), '서리 방벽: 보호 · 보호막이 없으면 없음'); E.addS(b, p, 'protect', 2); enemyHit(b, es[1], 5); ok(st(es[1], 'chill') === 1, '서리 방벽: 보호가 있을 때 나를 친 적에게 둔화 1'); }
{ const sk = cat => { const f = fight(['e5_firebolt', 'e5_icespear', 'e5_weave', 'e5_catalyst']); const e = f.es[0]; if (cat) use(f.b, 'e5_catalyst'); E.addS(f.b, e, 'ignite', 3); use(f.b, 'e5_icespear', e.id); return f.b.rec.filter(r => r.k === 'shock').pop().dmg; };
  ok(Math.abs(sk(1) / sk(0) - E.SK2.e5_catalyst.fx[0].mul) < 0.02, '촉매: 이번 차례 열충격 ×' + E.SK2.e5_catalyst.fx[0].mul); }
{ const f = fight(['e5_charge', 'e5_barrier', 'e5_mirror', 'e5_ward']); const { p, b, es } = f; use(b, 'e5_ward'); const red = E.SK2.e5_ward.fx[0].red; const h = p.hp; enemyHit(b, es[0], 10); ok(Math.abs(h - p.hp - 10 * (1 - red)) < 0.01, '마력 결계: 받는 피해 −' + Math.round(red * 100) + '%'); }
{ const f = fight(['e5_frostarmor', 'e5_icewall']); const { p, b } = f; use(b, 'e5_icewall'); ok(st(p, 'protect') === 3, '얼음 장벽: 쓰면 보호 3'); delete p.s.protect; next(b); b.prepTurn = null; use(b, 'basic', f.es[0].id); ok(st(p, 'protect') >= 2, '얼음 장벽: 내 차례마다 보호를 3까지 다시 채움'); }
{ const f = fight(['e5_heatshield']); const { p, b, es } = f; use(b, 'e5_heatshield'); E.addS(b, es[0], 'ignite', 2); const h = p.hp; enemyHit(b, es[0], 10); const r = E.SK2.e5_heatshield.fx[0].red; ok(Math.abs(h - p.hp - 10 * (1 - r)) < 0.01, '열기 방패: 화상 걸린 적이 주는 피해 −' + Math.round(r * 100) + '%'); const h2 = p.hp; enemyHit(b, es[1], 10); ok(Math.abs(h2 - p.hp - 10) < 0.01, '화상 없는 적은 그대로'); }
{ const f = fight(['e5_firebolt', 'e5_cloak']); const { p, b, es } = f; use(b, 'e5_cloak'); ok(p.rime && p.rime.ignite && p.rime.ignite.until === (b.round || 0) + E.SK2.e5_cloak.fx[0].r - 1, '불꽃 외투: 라운드로 끝나는 되얼림'); enemyHit(b, es[0], 1); ok(st(es[0], 'ignite') === 1, '불꽃 외투: 나를 친 적에게 화상 1'); b.round = (b.round || 0) + 99; enemyHit(b, es[1], 1); ok(!st(es[1], 'ignite') && !p.rime, '라운드가 지나면 끝'); }
// 측정 기록: 둔화 2인 적 앞의 고르기
{ const f = fight(['e5_icespear', 'e5_shatter', 'e5_crack']); const { b, es } = f; E.addS(b, es[0], 'chill', 2); use(b, 'e5_shatter', es[0].id); ok(b.rec.some(r => r.k === 'ch2' && r.a === 'shatter'), '둔화 2인 적에게 빙결 파쇄 = 깨기로 셈'); }
// 옛 판 옮기기: 옛 칸 · 강화 · 옛 시작 스킬 → 돌려받고 새 시작 스킬
{ G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; E.startRun('elementalist'); const run = G.run; delete run.alloc; run.atree.atv = 9; run.atree.own = ['e_kindle', 'e_sparks', 'eu_hell']; run.skills = ['e_ember', 'e_touch', 'e_kindle']; const pts0 = run.atree.pts || 0;
  const got = R_('atMigrateM5')(run); ok(got === 3 && run.atree.pts === pts0 + 3 && run.atree.own.length === 0 && run.atree.atv === 10 && run.atree.log.pop().why === '원소술사 재설계', '옛 판: 옛 칸 · 강화 3개 환급(원소술사 재설계, atv 10)');
  ok(!run.skills.includes('e_ember') && JSON.stringify(R_('v2Equip')(run).slice(0, 2)) === JSON.stringify(['e5_bolt', 'e5_switch']), '옛 시작 스킬은 빠지고 새 시작 스킬(마력탄 · 원소 전환)이 끼워짐'); }
// 한 줄 설명 · 승부수
{ const A2 = E.atBuild('elementalist'); for (const x of Object.values(A2.nodes).filter(x => x.kind === 'skill')) { const s = E.SK2[x.id], d = E.skBody(s); ok(!/\s{2}/.test(d) && d.length > 4 && (s.line || d.length <= R_('MK_DESC_MAX')), s.n + ' 한 줄 설명: ' + d); }
  ok(E.SK2.e5_avatar.cut === 'arcane' && E.SK2.e5_stasis.cut === 'guard' && E.SK2.e5_meteor.cut === 'blade', '컷인: 화신 마법 · 정적 방어 · 천화 검'); }
console.log('el-check: ' + n + '개 통과');
