'use strict';
/* 0.8.0 M5-0 마검사 경계 점검 (10월 19일). 실행: node tools/sb-bound-check.js
   혈염(합치기 · 차례 피해 · 정화 불가 · 교대 보호막 없음), 경계 스킬 아홉, 비용 1은 교대 아님, 경계 입구 requires, 경계 큰 각인 셋(동작 · 입구를 연 판만 후보) */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R = D.run_;
let n = 0; const FAIL = []; const ok = (c, m) => { if (!c) FAIL.push(m); else n++; };
const stk = (u, k) => (u.s[k] ? u.s[k].stacks : 0); const U = R('SB_BOUND');
function fight(skills, pn, ens) {
  const p = E.mkPlayer('spellblade', {}, {}, skills || []); p.pn = (pn || []).slice(); const es = (ens || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i));
  for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; e.row = 'front'; e.intent = { k: 'attack' }; }
  const b = E.newBattle(p, es, {}); b.rngF = () => 0.5; b.stepMode = false; p.pn = (pn || []).slice(); E.runUntilPlayer(b); p.ys = 5; return { p, b, es };
}
const act = (b, id, t) => { for (const e of b.en) if (e.alive && !e.intent) e.intent = { k: 'attack' }; E.playerAct(b, id, t ? t.id : null); };
// 혈염: 합치기 · 차례 피해 · 정화 불가
{ const { p, b, es } = fight(['sb_searcut']); E.addS(b, es[0], 'bleed', 3); E.addS(b, es[0], 'ignite', 2); p.ys = 5; act(b, 'sb_searcut', es[0]);
  ok(b.rec.some(x => x.k === 'sear' && x.n === 5) && stk(es[0], 'sear') >= 4 && !stk(es[0], 'bleed') && !stk(es[0], 'ignite'), '혈염: 벨 때 걸려 있던 출혈 3 · 화상 2를 혈염 5로 합침(적이 한 번 움직여 지금 ' + stk(es[0], 'sear') + ')');
  const h0 = es[0].hp, s0 = stk(es[0], 'sear'); R('kwSear')(b, es[0]); ok(es[0].hp < h0 && stk(es[0], 'sear') === s0 - 1, '혈염: 행동할 때마다 피해, 1 감소');
  ok(!R('KW_BAD').includes('sear'), '혈염은 해로운 상태 목록(정화 · 막음 대상)에 없음'); }
{ const { p, b, es } = fight(['sb_searcut']); E.addS(b, es[0], 'bleed', 3); p.ys = 5; act(b, 'sb_searcut', es[0]); ok(!stk(es[0], 'sear') && stk(es[0], 'bleed') > 0, '혈염: 둘 중 하나만 있으면 합치지 않음'); }
// 혈염 걸린 적이 있으면 교대 보호막 없음
{ const { p, b, es } = fight(['sb_ember']); E.addS(b, es[1], 'sear', 3); p.ward = 0; act(b, 'basic', es[0]); p.ys = 5; act(b, 'sb_ember', es[0]); ok(!(p.ward > 0), '혈염 걸린 적이 있는 동안 교대 보호막 없음');
  const f2 = fight(['sb_ember']); f2.p.ward = 0; act(f2.b, 'basic', f2.es[0]); f2.p.ys = 5; act(f2.b, 'sb_ember', f2.es[0]); ok(f2.p.ward > 0, '혈염이 없으면 교대 보호막 그대로'); }
// 핏불 싣기: 출혈 · 화상을 함께 싣고 다음 베기가 건다
{ const { p, b, es } = fight(['sb_bloodfire']); act(b, 'sb_bloodfire'); ok(p.edge && p.edge.s === 'bleed' && p.edge.also && p.edge.also[0].s === 'ignite', '핏불 싣기: 칼에 출혈 · 화상'); act(b, 'basic', es[0]); ok(stk(es[0], 'bleed') >= 1 && stk(es[0], 'ignite') >= 2 && b.log.some(x => /출혈 3 · 화상 4/.test(x.m || '')), '다음 베기가 출혈 · 화상을 함께 건다(적이 한 번 움직여 출혈 −1)'); }
// 겁화
{ const { p, b, es } = fight(['sb_kalpa']); p.ward = 10; act(b, 'sb_kalpa'); ok(p.ward === 0 && p.sbSt.blaze === 3, '겁화: 보호막 소실, 3차례'); E.addS(b, es[0], 'bleed', 2); act(b, 'basic', es[0]); ok(stk(es[0], 'sear') > 0, '겁화: 베기마다 혈염');
  const fx = R('fxAdd'); ok(Math.abs(fx(p, 'hitP', b, p, es[0], {}, { id: 'basic' }) - U.blazeHit) < 1e-9 && U.blazeHit === 0.6 && Math.abs(fx(p, 'inP', b, p, {}) + 0.3) < 1e-9, '겁화: 주는 피해 +60%, 받는 피해 +30%'); }
// 피의 갑주
{ const { p, b, es } = fight(['sb_bloodmail']); E.addS(b, es[0], 'bleed', 2); E.addS(b, es[1], 'bleed', 2); p.ward = 0; act(b, 'sb_bloodmail'); ok(b.log.some(x => /피의 갑주: 출혈 걸린 적 2 → 보호막 \+/.test(x.m || '')) && p.ward > 8, '피의 갑주: 출혈 걸린 적 둘 → 보호막 +17씩(직업 보호막 상한까지)'); }
// 피막
{ const { p, b, es } = fight(['sb_film']); act(b, 'sb_film'); p.ward = 20; const o = { src: es[0] }; R('sbWardHit')(b, p, o, 6); ok(stk(es[0], 'bleed') === 8, '피막: 받아낸 6의 125% → 출혈 8(출혈 상한 10)'); }
// 죄인의 벽
{ const { p, b, es } = fight(['sb_sinwall']); p.hp = p.hpMax; p.ward = 0; act(b, 'sb_sinwall'); const pay = p.hpMax * 0.15; const L = b.log.map(x => x.m || '').find(m => /죄인의 벽: 생명력/.test(m)) || ''; const mm = /생명력 ([\d.]+)을 바쳐 보호막 \+([\d.]+)/.exec(L); ok(mm && Math.abs(+mm[1] - pay) < 0.6 && Math.abs(+mm[2] - 3 * pay) < 1.6, '죄인의 벽: 생명력 15%를 바쳐 3배 보호막 (' + L + ')'); p.ward = 0; R('sbWardHit')(b, p, { src: es[0] }, 1); ok(es.every(e => stk(e, 'bleed') === 5), '죄인의 벽이 깨지면 전열 모두 출혈 5'); }
// 달군 갑주 · 잿불 갑주
{ const { p, b, es } = fight(['sb_heatmail']); p.ward = 12; act(b, 'sb_heatmail'); ok(p.ward === 0 && p.sbSt.heatNext, '달군 갑주: 보호막을 태움'); const fx = R('fxAdd'); ok(Math.abs(fx(p, 'hitP', b, p, es[0], {}, { id: 'basic' }) - 1.8) < 1e-9 && fx(p, 'hitP', b, p, es[0], {}, { id: 'heavy' }) === 0, '다음 기본 공격 ×2.8(강공격은 아님)'); act(b, 'basic', es[0]); ok(!p.sbSt.heatNext, '한 번 쓰면 사라짐'); }
{ const { p, b, es } = fight(['sb_embermail']); act(b, 'sb_embermail'); p.ward = 10; act(b, 'basic', es[0]); ok(stk(es[0], 'ignite') >= 4, '잿불 갑주: 보호막이 있으면 기본 공격에 화상 5'); }
// 불의 몸
{ const { p, b, es } = fight(['sb_firebody']); p.ys = 5; p.ward = 0; act(b, 'sb_firebody'); ok(p.ys === 0 && p.sbSt.fireBody === 3 && b.log.some(x => /불의 몸: 유산 1을 모두 태워 보호막 \+8/.test(x.m || '')), '불의 몸: 남은 유산 1을 태워 보호막 +8, 유산 0'); ok(R('ysAdd')(b, 2, 'turn', '차례') === 0 && p.ys === 0, '그동안 유산이 차지 않음');
  ok(E.addS(b, p, 'ignite', 3) === 0 && !stk(p, 'ignite'), '받는 화상 무효'); const fx = R('fxAdd'); ok(Math.abs(fx(p, 'hitP', b, p, es[0], {}, { id: 'heavy' }) - 0.8) < 1e-9, '기본 공격 · 강공격 ×1.8'); }
// M5-0 보정 4 경계 새 칸 여섯
{ const { p, b, es } = fight(['sb_hotedge']); E.addS(b, es[0], 'bleed', 3); p.ys = 5; const i0 = stk(es[0], 'ignite'); act(b, 'sb_hotedge', es[0]); ok(stk(es[0], 'ignite') >= i0 + U.crossN - 1 && b.log.some(x => /달아오른 칼날: .*화상 4/.test(x.m || '')), '달아오른 칼날: 출혈 걸린 적에게 화상 +4');
  const f2 = fight(['sb_hotedge']); E.addS(f2.b, f2.es[0], 'ignite', 3); f2.p.ys = 5; act(f2.b, 'sb_hotedge', f2.es[0]); ok(stk(f2.es[0], 'bleed') >= U.crossN - 1, '화상 걸린 적에게 출혈 +4'); }
{ const { p, b, es } = fight(['sb_searspread'], null, ['bruiser', 'bruiser', 'bruiser']); E.addS(b, es[0], 'sear', 4); es[0].hp = 1; p.ys = 5; act(b, 'sb_searspread', es[0]); ok(!es[0].alive && es.slice(1).every(e => stk(e, 'sear') >= 3), '핏불 번짐: 혈염 걸린 적을 쓰러뜨리면 곁의 적에게 그 혈염');
  const f2 = fight(['sb_searspread']); f2.es[0].hp = 1; f2.p.ys = 5; act(f2.b, 'sb_searspread', f2.es[0]); ok(!stk(f2.es[1], 'sear'), '혈염이 없던 적이면 번지지 않음'); }
{ const { p, b, es } = fight(['sb_sinstrike']); p.ys = 5; p.ward = 12; const h0 = es[0].hp; act(b, 'sb_sinstrike', es[0]); ok(h0 - es[0].hp > 8 && stk(es[0], 'bleed') >= 1 && p.ward >= 9 /* 적 둘이 1씩 친 몫만 줄고 쓰지 않음 */, '죄인의 일격(보정 5): 보호막에 비례한 피해 + 출혈, 보호막은 쓰지 않음'); }
{ const { p, b, es } = fight(['sb_shackle']); p.ys = 5; act(b, 'sb_shackle'); ok(p.sbSt.shackle, '피의 족쇄: 전투 동안 켜짐'); E.addS(b, es[0], 'bleed', 3); es[0].brk = 0; es[0].brkMax = 1000; p.guard = 1; R('hurtPlayer')(b, 20, { src: es[0], charged: 1 }); ok(es[0].brk >= U.shackleBrk, '출혈 걸린 적의 강타를 막아 내면 붕괴 +90 (' + es[0].brk + ')');
  es[1].brk = 0; es[1].brkMax = 1000; R('hurtPlayer')(b, 20, { src: es[1], charged: 1 }); ok(es[1].brk < 1, '출혈이 없으면 그대로'); es[0].brk = 0; R('hurtPlayer')(b, 20, { src: es[0] }); ok(es[0].brk < 1, '강타가 아니면 그대로'); }
{ const { p, b, es } = fight(['sb_embercut']); p.ys = 5; p.ward = 10; delete es[0].s.ignite; act(b, 'sb_embercut', es[0]); ok(p.ward <= 4 + 1 && stk(es[0], 'ignite') >= U.emberCutBurn - 1, '잿불 베기(보정 5): 보호막 6을 태워 화상 6'); const f2 = fight(['sb_embercut']); f2.p.ys = 5; f2.p.ward = 2; act(f2.b, 'sb_embercut', f2.es[0]); ok(stk(f2.es[0], 'ignite') <= 2, '보호막이 적으면 그만큼만'); }
{ const { p, b, es } = fight(['sb_cindermail']); p.ys = 5; act(b, 'sb_cindermail'); ok(p.sbSt.cinderMail, '불씨 갑주: 전투 동안 켜짐'); for (const e of es) delete e.s.ignite; p.ward = 10; R('sbWardHit')(b, p, { src: es[0] }, 5); ok(es.filter(e => e.row === 'front').every(e => stk(e, 'ignite') === U.cinderIgn), '보호막이 깎이면 전열에 화상 2'); }
// 비용 1: 교대 아님
{ const { p, b, es } = fight(['sb_shard', 'sb_ember']); act(b, 'basic', es[0]); ok(p.sbLast === 'cut', '베기 뒤 직전 종류 베기'); p.ys = 5; p.ward = 0; act(b, 'sb_shard', es[0]); ok(p.sbLast === 'cut' && !(p.ward > 0), '마력 파편(비용 1 주문)은 교대가 아님: 직전 종류 그대로, 교대 보호막 없음'); act(b, 'sb_ember', es[0]); ok(p.ward > 0, '그다음 주문(비용 2)은 교대'); }
// 경계 입구 requires
{ const run = (() => { E.__G.data = E.blankData(); E.__G.cre = { name: 'b' }; E.startRun('spellblade'); const r = E.__G.run; delete r.alloc; E.__G.sheet = null; E.__G.creating = false; r.lv = 10; r.clears = 1; E.ptFix(r); return r; })();
  ok(/양쪽 갈래/.test(R('atWhy')(run, 'sb_bloodfire')), '경계 입구: 양쪽 첫 노드 전에는 못 엶'); E.atBuy(run, 'sb_ember'); ok(/양쪽 갈래/.test(R('atWhy')(run, 'sb_bloodfire')), '한쪽만으로는 못 엶'); E.atBuy(run, 'sb_bleedcut'); ok(!R('atWhy')(run, 'sb_bloodfire'), '양쪽을 열면 엶');
  run.clears = 2; run.ptree.pts = 40; run.ksPending = 1; const offerHas = () => R('ksCands')(run).some(c => c.id === 'ctK5b'); ok(!offerHas(), '경계 큰 각인: 입구 전에는 후보 아님'); E.atBuy(run, 'sb_bloodfire'); ok(offerHas(), '입구를 열면 후보'); }
// 경계 큰 각인 셋
{ const { p, b, es } = fight(['sb_ember'], ['ks_sb_sear']); E.addS(b, es[0], 'bleed', 3); p.ys = 5; act(b, 'sb_ember', es[0]); ok(stk(es[0], 'sear') > 0 && !stk(es[0], 'ignite'), '혈염의 각인: 출혈 걸린 적을 주문으로 치면 바로 혈염'); }
{ const { p, b, es } = fight([], ['ks_sb_sin']); p.guard = 1; p.ward = 0; R('hurtPlayer')(b, 40, { src: es[0] }); ok(stk(es[0], 'bleed') >= 5, '죄인의 각인: 막기로 받아낸 피해(약 20)의 30% → 출혈 (' + stk(es[0], 'bleed') + ')'); }
{ const { p, b, es } = fight([], ['ks_sb_ash']); p.ward = 5; R('sbWardHit')(b, p, { src: es[0] }, 5); ok(!p.sbSt.ashNext, '잿불의 각인: 보호막이 남아 있으면 아직'); p.ward = 0; R('sbWardHit')(b, p, { src: es[0] }, 5); ok(p.sbSt.ashNext, '보호막이 0이 되면 다음 기본 공격이 터짐'); const h1 = es[1].hp; act(b, 'basic', es[0]); ok(es[1].hp < h1 && stk(es[1], 'ignite') > 0 && !p.sbSt.ashNext, '기본 공격이 전열에 화염 폭발'); }
if (FAIL.length) { console.log('실패 ' + FAIL.length + ': ' + FAIL.join(' | ')); process.exitCode = 1; }
console.log('sb-bound-check: ' + n + '개 통과');
