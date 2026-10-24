'use strict';
/* 0.8.0 M5-4 사냥꾼 재설계 점검 (10월 20일 만든 사람 설계지 2판). 실행: node tools/hn-check.js
   연계 = 빠른 행동(① 보통 스킬만 · ② 기본 공격 · 시작 스킬은 연계를 만들지도 끊지도 않음 · ③ 다른 갈래 · ④ 이어 쏘기 숙련 두 번) · 외길 사냥꾼 그대로 ·
   몸 빼기는 대응 충전 없음 · 큰 적의 강타는 절반만 피함 · 가속은 개전 · 질풍난사만 · 승부수 셋과 대가 · 새 효과 · 결합 칸 · 한 줄 설명 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, U = R_('HN5_BOUND'), st = R_('st'), fx = R_('fxAdd');
function fight(act, en, hp, pn) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('hunter'); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = act.slice(); run.skills = act.filter(id => (E.atBuild('hunter').nodes[id] || {}).kind === 'skill').slice(0, 4); E.atSync(run); if (pn) run.p.pn = (run.p.pn || []).concat(pn);
  const es = (en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = hp || 5000; e.dmg = 1; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const A = (b, id) => E.actionList(b).find(x => x.id === id) || {};
const use = (b, id, t) => { b.p.ys = 9; b.p.st = b.p.stMax; const t0 = b.turnIdx; E.playerAct(b, id, t); return b.turnIdx === t0; }; // 차례가 이어졌는가
const lost = e => e.hpMax - e.hp;
// 연계 = 빠른 행동
{ const f = fight(['h5_pierce', 'h5_volley', 'h5_cover'], ['bruiser']); const e = f.es[0];
  ok(!use(f.b, 'h5_pierce', e.id), '첫 갈래 스킬(보통)은 차례를 끝냄'); E.runUntilPlayer(f.b);
  ok(A(f.b, 'h5_volley').ok && /⚡/.test(R_('hnLinkFastOk')(f.b, A(f.b, 'h5_volley')) ? '⚡' : ''), '다른 갈래(연사)는 연계 빠른 행동');
  ok(use(f.b, 'h5_volley', e.id), '연계: 연속 사격(보통)이 빠른 행동이 되어 차례가 이어짐');
  ok(!R_('hnLinkFastOk')(f.b, A(f.b, 'h5_pierce')), '④ 연계 빠른 행동은 내 차례에 한 번');
  ok(!use(f.b, 'h5_pierce', e.id), '두 번째 연계는 주 행동(차례가 끝남), 유산은 둘 다 냄'); }
{ const f = fight(['h5_pierce', 'h5_volley'], ['bruiser'], 5000, ['n_hn_linkup']); const e = f.es[0]; use(f.b, 'h5_pierce', e.id); E.runUntilPlayer(f.b);
  ok(use(f.b, 'h5_volley', e.id) && use(f.b, 'h5_pierce', e.id), '④ 이어 쏘기 숙련: 연계 빠른 행동 내 차례에 두 번'); }
{ const f = fight(['h5_pierce', 'h5_heavy', 'h5_volley'], ['bruiser']); const e = f.es[0]; use(f.b, 'h5_volley', e.id); E.runUntilPlayer(f.b);
  ok(!use(f.b, 'h5_heavy', e.id), '① 느린 스킬(무거운 화살)은 연계여도 주 행동'); }
{ const f = fight(['h5_pierce', 'h5_volley'], ['bruiser']); const e = f.es[0]; use(f.b, 'h5_pierce', e.id); E.runUntilPlayer(f.b); use(f.b, 'basic', e.id); E.runUntilPlayer(f.b); use(f.b, 'h_aim', e.id); E.runUntilPlayer(f.b);
  ok(f.p.lastBr === '저격' && use(f.b, 'h5_volley', e.id), '② 기본 공격 · 시작 스킬은 연계를 만들지도 끊지도 않음(저격 → 기본 공격 → 겨눠 쏘기 → 연사 = 연계)'); }
{ const f = fight(['h5_pierce', 'h5_heavy'], ['bruiser']); const e = f.es[0]; use(f.b, 'h5_pierce', e.id); E.runUntilPlayer(f.b); ok(!R_('linkOn')(f.b, A(f.b, 'h5_heavy')), '③ 같은 갈래는 연계 아님'); }
{ const f = fight(['h5_pierce', 'h5_heavy'], ['bruiser']); const e = f.es[0]; use(f.b, 'h5_pierce', e.id); E.runUntilPlayer(f.b); use(f.b, 'h_step', e.id); ok(f.p.lastBr === '저격' && !R_('linkOn')(f.b, A(f.b, 'h5_heavy')), '② 시작 스킬(물러서며 쏘기)은 갈래 꼬리표가 있어도 연계를 만들지도 끊지도 않음'); }
{ const f = fight(['h5_pierce'], ['bruiser']); const e = f.es[0]; f.p.lastBr = '연사'; f.b.stepMode = true; const h0 = e.hp; E.playerAct(f.b, 'h5_pierce', e.id); const d1 = h0 - e.hp;
  const g = fight(['h5_pierce'], ['bruiser']); g.b.stepMode = true; const h1 = g.es[0].hp; E.playerAct(g.b, 'h5_pierce', g.es[0].id);
  ok(Math.abs(d1 - (h1 - g.es[0].hp)) < 0.01, '연계 피해 +30%는 없어짐(연계여도 같은 피해) — ' + Math.round(d1)); }
// 몸 빼기: 대응 충전 없음 · 큰 적의 강타는 절반
{ const f = fight(['h5_dodge'], ['bruiser']); const e = f.es[0]; f.p.evade = 1; const ys0 = f.p.ys = 3; f.b.cur = null; R_('hurtPlayer')(f.b, 10, { src: e }); ok(f.p.evade === 0 && f.p.ys === ys0, '몸 빼기로 피하면 대응 충전 없음(회피만)'); }
{ const f = fight([], ['bruiser']); const e = f.es[0]; e.strong = 1; f.p.evade = 1; const h0 = f.p.hp; f.b.cur = null; R_('hurtPlayer')(f.b, 20, { src: e, charged: 1 }); ok(f.p.evade === 0 && h0 - f.p.hp > 0 && h0 - f.p.hp < 20, '강적의 강타는 몸 빼기로 절반만 피함 — ' + (h0 - f.p.hp)); }
// 가속: 개전 · 질풍난사만
{ const f = fight(['h5_gale'], ['bruiser']); ok(f.b.pDouble === f.b.round, '개전 가속: 첫 라운드 두 번'); use(f.b, 'basic', f.es[0].id); use(f.b, 'basic', f.es[0].id); E.runUntilPlayer(f.b); ok(f.b.pDouble !== f.b.round, '둘째 라운드는 가속 없음'); }
{ const f = fight(['h5_gale'], ['bruiser']); use(f.b, 'basic', f.es[0].id); f.p.evade = 1; f.p.st = f.p.stMax; f.b.stepMode = true; use(f.b, 'h5_gale'); ok(f.p.hnSt.gale === 3 && f.p.evade === 0, '질풍난사: 3라운드, 몸 빼기를 지움');
  ok(Math.abs(fx(f.p, 'inP', f.b, f.p, {}) + U.galeIn) < 1e-9, '대가: 받는 피해 +20%'); ok(!A(f.b, 'guard').ok, '대가: 방어 불가');
  f.b.stepMode = false; E.runUntilPlayer(f.b); ok(f.b.pDouble === f.b.round && f.p.hnSt.gale === 2, '다음 라운드 두 번 움직임(가속)'); const e = f.es[0]; const h0 = e.hp; f.b.stepMode = true; E.playerAct(f.b, 'basic', e.id); f.b.stepMode = false;
  ok(f.b.log.slice(-6).some(x => /덧쏜 화살/.test(x.m) || /에게 [\d.]+ 피해/.test(x.m)) && h0 - e.hp > 0, '기본 공격이 두 발'); }
// 승부수: 만궁 · 혈향의 덫
{ const f = fight(['h5_mangung'], ['bruiser']); const e = f.es[0]; f.p.focus = { id: e.id, n: 2 }; f.b.stepMode = true; use(f.b, 'h5_mangung'); ok(f.p.hnSt.draw && Math.abs(fx(f.p, 'inP', f.b, f.p, {}) + U.drawIn) < 1e-9, '만궁: 당기는 동안 받는 피해 +30%(표적이 됨)');
  f.b.stepMode = false; E.runUntilPlayer(f.b); ok(A(f.b, 'hn_shot').ok, '다음 차례: 만궁 쏘기'); const M = E.SK2.h5_mangung.fx[0]; const fn = f.p.focus && f.p.focus.id === e.id ? f.p.focus.n : 0; const h0 = e.hp; f.b.stepMode = true; E.playerAct(f.b, 'hn_shot', e.id);
  const want = R_('outDmg')(f.b, R_('wpnDmg')(f.p) * (M.mul + M.per * fn), { weapon: 1 }); ok(h0 - e.hp > want * 0.9, '추적한 적에게 무기 피해의 ' + M.mul + '배 + 겹마다 ' + M.per + '배 — ' + Math.round(h0 - e.hp) + ' / ' + Math.round(want));
  ok(!f.p.hnSt.draw, '쏘면 당김이 풀림'); }
{ const f = fight(['h5_mangung'], ['bruiser']); use(f.b, 'h5_mangung'); E.runUntilPlayer(f.b); use(f.b, 'basic', f.es[0].id); E.runUntilPlayer(f.b); ok(!A(f.b, 'hn_shot').ok, '만궁 쏘기는 당긴 다음 차례에만'); }
{ const f = fight(['h5_trap'], ['bruiser', 'bruiser']); const hp0 = f.p.hp; f.b.stepMode = true; use(f.b, 'h5_trap'); ok(hp0 - f.p.hp === Math.round(f.p.hpMax * U.trapHp), '혈향의 덫: 쓰는 즉시 생명력 −15%');
  for (const e of f.es) e.intent = { k: 'attack' }; f.b.stepMode = false; E.runUntilPlayer(f.b); if (G.run && f.b.queue && f.b.queue[0] === 'p') { f.b.stepMode = true; E.playerAct(f.b, 'guard'); f.b.stepMode = false; E.runUntilPlayer(f.b); } const tr = f.es.filter(e => e.hnTrapR != null);
  ok(tr.length >= 1 && tr.every(e => (e.stun || 0) >= 1 || e.stunned) && f.p.focus && f.p.focus.n >= 3, '나를 친 적은 다음 행동을 놓치고 추적 3겹');
  const g = fight(['h5_trap']); g.p.hp = Math.floor(g.p.hpMax * 0.15); ok(!A(g.b, 'h5_trap').ok, '생명력 15% 이하면 쓸 수 없음'); }
// 새 효과
{ const f = fight(['h5_nock'], ['bruiser']); use(f.b, 'h5_nock'); ok(f.p.hnSt.nock && f.p.hnSt.nock.n === E.SK2.h5_nock.fx[0].n, '화살 재기: 다음 기본 공격 n번'); const e = f.es[0]; const n0 = f.b.log.length; use(f.b, 'basic', e.id);
  ok(f.b.log.slice(n0).some(x => /덧쏜 화살/.test(x.m) || x.m.includes('에게')), '기본 공격이 두 발'); }
{ const f = fight(['h5_lock', 'h5_prey'], ['bruiser']); const e = f.es[0]; f.p.focus = { id: e.id, n: 2 }; use(f.b, 'h5_lock'); const h0 = e.hp; f.b.stepMode = true; E.playerAct(f.b, 'basic', e.id); const d1 = h0 - e.hp;
  const g = fight(['h5_prey'], ['bruiser']); g.p.focus = { id: g.es[0].id, n: 2 }; g.b.stepMode = true; const h1 = g.es[0].hp; E.playerAct(g.b, 'basic', g.es[0].id); const d0 = h1 - g.es[0].hp;
  ok(d1 / d0 > 1.2, '표적 고정: 기본 공격이 대상 추적 겹마다 더 셈 — ' + Math.round(d0) + ' → ' + Math.round(d1)); }
{ const f = fight(['h5_volley'], ['bruiser', 'archer', 'bruiser']); const n0 = f.b.log.length; use(f.b, 'h5_volley', f.es[0].id); const hit = f.es.filter(e => e.hp < e.hpMax).length; ok(hit >= 2, '연속 사격: 발마다 다른 적(' + hit + '명)'); }
{ const f = fight(['h5_windstep', 'h5_leg'], ['bruiser']); use(f.b, 'h5_windstep'); f.p.evade = 1; f.b.cur = null; R_('hurtPlayer')(f.b, 10, { src: f.es[0] }); ok(f.p.hnSt.windDisc === 1 && R_('skCostAt')(f.b, E.SK2.h5_leg).c === Math.max(1, R_('skCost')(E.SK2.h5_leg) - 1), '바람 걸음: 피하면 다음 기동 스킬 유산 −1'); }
{ const f = fight(['h5_windveil'], ['bruiser']); use(f.b, 'h5_windveil'); f.p.evade = 0; f.b.cur = null; R_('hurtPlayer')(f.b, 5, { src: f.es[0] }); ok(f.p.evade === 1, '바람의 장막: 맞으면 몸 빼기 1'); R_('hurtPlayer')(f.b, 5, { src: f.es[0] }); R_('hurtPlayer')(f.b, 5, { src: f.es[0] }); ok(f.p.evade === 0, '라운드에 한 번'); }
{ const f = fight(['h5_endhunt'], ['bruiser', 'bruiser'], 30); use(f.b, 'h5_endhunt', f.es[0].id); const [e0, e1] = f.es; f.p.focus = { id: e0.id, n: 3 }; e0.hp = 1; f.b.stepMode = true; E.playerAct(f.b, 'basic', e0.id);
  ok(!e0.alive && f.p.focus.id === e1.id && f.p.focus.n >= 3, '끝없는 사냥: 추적한 적이 쓰러지면 추적이 다음 적에게'); }
{ const f = fight(['h5_sky'], ['bruiser']); const e = f.es[0]; f.p.focus = { id: e.id, n: 3 }; f.b.stepMode = true; const h0 = e.hp; E.playerAct(f.b, 'h5_sky', e.id); const d3 = h0 - e.hp; const g = fight(['h5_sky'], ['bruiser']); g.b.stepMode = true; const h1 = g.es[0].hp; E.playerAct(g.b, 'h5_sky', g.es[0].id);
  ok(d3 > (h1 - g.es[0].hp), '하늘 가르기: 추적 3겹이면 무기 피해의 3배 — ' + Math.round(h1 - g.es[0].hp) + ' → ' + Math.round(d3)); }
{ const f = fight(['h5_bloodrain'], ['bruiser', 'bruiser']); E.addS(f.b, f.es[0], 'bleed', 2); use(f.b, 'h5_bloodrain'); ok(lost(f.es[0]) > 0 && lost(f.es[1]) === 0, '피의 비: 출혈 걸린 적에게만'); }
// 결합 칸
{ const f = fight(['h5_chase', 'h5_dodge'], ['bruiser']); use(f.b, 'h5_chase'); f.p.evade = 1; f.p.focus = null; f.b.cur = null; R_('hurtPlayer')(f.b, 10, { src: f.es[0] }); ok(f.p.focus && f.p.focus.id === f.es[0].id && f.p.focus.n >= 1, '추격: 피할 때마다 그 적에게 추적 +1'); }
{ const f = fight(['h5_scent'], ['bruiser']); use(f.b, 'h5_scent'); const e = f.es[0]; E.addS(f.b, e, 'bleed', 2); f.p.focus = null; f.b.stepMode = true; E.playerAct(f.b, 'basic', e.id); ok(f.p.focus.n >= 2, '피 냄새: 출혈 걸린 적을 맞히면 추적 +1'); }
{ const f = fight(['h5_frozen'], ['bruiser']); use(f.b, 'h5_frozen'); const e = f.es[0]; E.addS(f.b, e, 'chill', 2); const h0 = e.hp; f.b.stepMode = true; E.playerAct(f.b, 'basic', e.id); const d1 = h0 - e.hp; const g = fight([], ['bruiser']); const e2 = g.es[0]; E.addS(g.b, e2, 'chill', 2); g.b.stepMode = true; const h1 = e2.hp; E.playerAct(g.b, 'basic', e2.id);
  ok(Math.abs(d1 / (h1 - e2.hp) - E.SK2.h5_frozen.fx[0].mul) < 0.15, '얼어붙은 사냥감: 둔화 걸린 적에게 기본 공격 ×' + E.SK2.h5_frozen.fx[0].mul); }
// 한 줄 설명 · 승부수
{ const A2 = E.atBuild('hunter'); for (const x of Object.values(A2.nodes).filter(x => x.kind === 'skill')) { const s = E.SK2[x.id], d = E.skBody(s); ok(!/\s{2}/.test(d) && d.length > 4 && (s.line || d.replace(/ (비용 1로 )?쓰면 다음 차례 유산 충전 없음\.$/, '').length <= R_('MK_DESC_MAX')), s.n + ' 한 줄 설명: ' + d); }
  ok(E.SK2.h5_mangung.cut === 'blade' && E.SK2.h5_gale.cut === 'guard' && E.SK2.h5_trap.cut === 'arcane', '컷인: 만궁 검 · 질풍난사 방어 · 혈향의 덫 마법'); }
console.log('hn-check: ' + n + '개 통과');
