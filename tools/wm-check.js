'use strict';
/* 0.8.0 5단계 파수꾼 · 수도승 트리 점검 (10월 17일). 실행: node tools/wm-check.js
   docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md의 규칙이 엔진에서 그대로 일하는지 본다.
   1 강화 노드가 모두 적용되고 금지선(무조건 비용 바꾸기 없음, 조건 어휘) · 2 노드 비용(skCost가 노드 ys를 읽음) · 3 파수꾼(방어 보호막 · 받아낸 몫 상한 · 흔들리는 방패 · 쌓인 벽 · 🔄 조건 · 달군 방패 · 산사태) ·
   4 수도승(기의 그릇 · 열린 단전 · 참회의 무게 · 비운 그릇 · 부동의 맹세 · 철산고 · 천지 정지 · 넘치는 기운)
   5 사냥꾼(10월 18일, docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md): 51노드 · 금지선 · [전환] 하나 · 비용 · 시작 스킬 태그(lb) · 조건 link · focus>=n · linkFast · 외길 사냥꾼 전환 ·
     이어 쏘기 숙련 · 끝까지 쫓는 자 · 넘겨받는 추적 · 끝맺는 연계 · 손에 익은 활 · 이어 당기는 활(두 번째 차례) · 기본 공격 버프(바꿔 쏘기 · 덧화살 · 가시 · 하늘 가르기의 기간 · 겹침 · 다시 걸기 · 버림 · 전투 끝) · 결정 7
   6 원소술사(M5-5 재설계 뒤: 새 트리 규격 한 줄 · 시작 노드 · 패시브 배치 · 패시브 노드 시험은 새 칸으로 — 고정 피해(불의 학도 행동마다 한 번 · 남는 울림 열충격마다) ·
     끊어진 영창(끊기 · 무너뜨리기 · 먼저 치우기, 라운드 한도 밖, 전투마다 2번) · 잿불의 길 · 얼음 심장(대가 포함) · 서리 무게 노드(−20%, 큰 공격 포함) · 열충격 배수 노드 · 회복 · 스태미나 노드
   7 암살자(M5-3 재설계 뒤: 새 트리 규격 한 줄 · 패시브 노드 시험은 새 칸으로 — 중독 상한 · 독의 군주 · 그림자 맹세 · 흘려 냄 표시 · 얇은 그림자 · 피하는 몸 · 흘린 숨 · 남은 독의 온기 · 무너뜨리는 독 · 끊는 칼끝 · 깨진 틈 찌르기 · 연이은 흘림 · 독 기억 · 무르익은 독).
     옛 칸 비용 할인 · 옛 강화 · 측정 변형(ASN_SHADOW_VAR) 시험은 옛 칸이 트리에서 빠져 지웠다 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const f = name => R_(name); const stat = f('stat'), wdGuardWard = f('wdGuardWard'), skCost = f('skCost'), st = f('st'), kiCapOf = f('kiCapOf');
const G = E.__G;
function newRun(build) { G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun(build); const run = G.run; delete run.alloc; G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run'; return run; }
/* 노드를 직접 연다(찍기 규칙은 tree-check가 본다). own: 패시브 id, act: 액티브 id(스킬 · 강화), eq: 장착 */
function fight(build, o) {
  o = o || {}; const run = newRun(build); run.clears = 2; run.lv = 16;
  run.ptree.own.push(...(o.own || [])); run.ptree.ks.push(...(o.ks || [])); E.ptSync(run);
  run.atree.own = (o.act || []).slice(); run.skills = (o.eq || []).slice(); E.atSync(run);
  const es = (o.en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const yc = (b, id) => (E.actionList(b).find(x => x.id === id) || {}).yc;
const okA = (b, id) => !!(E.actionList(b).find(x => x.id === id) || {}).ok;
const enemyHit = (b, e, raw, x) => { const cur = b.cur; b.cur = null; const d = E.hurtPlayer(b, raw, Object.assign({ src: e }, x || {})); b.cur = cur; return d; };

// ===== 1) 강화 노드 · 금지선 =====
/* 0.8.0 M5-1(10월 20일): 파수꾼은 재설계로 강화 노드 대신 변형(M5-0c 규격)이 됐다. 파수꾼 트리 규칙은 tools/tree-check.js, 태세 · 승부수 · 결합 칸은 tools/wd-check.js */
{ const A = E.atBuild('warden'), N = Object.values(A.nodes); ok(!A.tmp && N.filter(x => x.kind === 'skill').length === 39 && N.filter(x => x.slot).length === 36 && N.filter(x => x.kind === 'skill').every(x => [1, 2, 3, 4].includes(x.ys)), 'warden: 재설계 트리(스킬 노드 39 · 변형 자리 36, 비용 1–4)'); }
/* 0.8.0 M5-2(10월 20일): 수도승도 재설계로 강화 노드 대신 변형이 됐다. 수도승 트리 규칙은 tools/tree-check.js, 새 효과 · 승부수 · 결합 칸은 tools/mk-check.js */
{ const A = E.atBuild('monk'), N = Object.values(A.nodes); ok(!A.tmp && N.filter(x => x.kind === 'skill').length === 39 && N.filter(x => x.slot).length === 36 && N.filter(x => x.kind === 'skill').every(x => [1, 2, 3, 4].includes(x.ys)), 'monk: 재설계 트리(스킬 노드 39 · 변형 자리 36, 비용 1–4)'); }
ok(JSON.stringify(E.SK2.w_flare.fx) === JSON.stringify([{ k: 'wardBurn', mul: 2.6, max: 8 }, { k: 'brk', n: 3 }, { k: 'bigx', mul: 1.5 }]), '강화는 원래 스킬 데이터를 바꾸지 않음');

// ===== 2) 노드 비용 (결정 1: skCost가 노드 ys를 읽음) =====
{ const p = { build: 'warden', aup: [], pn: [] }; ok(skCost(E.skOf(p, 'w_flare')) === 2, '보호막 터뜨리기: 트리 노드 2(0.8.0 M5-0부터 쿨타임 변환표 없음)');
  const ps = { build: 'spellblade', aup: [], pn: [] }; const A = E.atBuild('spellblade'); ok(Object.keys(A.nodes).filter(id => A.nodes[id].kind === 'skill').every(id => skCost(E.skOf(ps, id)) === A.nodes[id].ys), '마검사: 스킬 비용은 노드 ys 그대로(M5-0)'); }

// ===== 3) 파수꾼 =====
{ const { p, b } = fight('warden', { own: ['su1C', 'su2L'] }); const w = stat(p, 'wil'); ok(w === 6 && p.pn.includes('n_wd_will'), '다진 의지: 의지 6(시작 4 + 작은 노드 2)');
  ok(Math.abs(wdGuardWard(p) - (6 + 0.5 * w)) < 1e-9, '방어 보호막 기본값 6 + 의지 × 0.5');
  p.ward = 0; E.playerAct(b, 'guard'); ok(Math.abs(p.ward - (6 + 0.5 * w) * (1 + 0.02 * w)) < 0.01 || p.ward < (6 + 0.5 * w) * (1 + 0.02 * w), '방어하면 (6 + 의지 × 0.5) × (1 + 0.02 × 의지)(적 차례 피해 전)'); }
{ const { p, b } = fight('warden', { own: ['sv1C', 'sv2L', 'sv3L'] }); p.hp = p.hpMax * 0.4; ok(Math.abs(wdGuardWard(p) - 12) < 1e-9, '버팀목: 생명력 50% 이하에서 방어 보호막 6 → 12'); p.hp = p.hpMax; ok(wdGuardWard(p) === 6, '버팀목: 50% 넘으면 그대로'); }
{ const { p, b, es } = fight('warden', { own: ['sv1C'] }); p.guard = 1; p.ward = 0; const R = b.ysR || 0;
  enemyHit(b, es[0], 10); ok(Math.abs(p.ward - 2.5) < 0.01, '받아낸 몫: 공격 10을 방어로 5 줄이면 보호막 +2.5(맞은 뒤)');
  for (let i = 0; i < 6; i++) enemyHit(b, es[0], 10); ok(b.heldN <= 10 + 1e-9 && b.heldR === R, '받아낸 몫: 적 차례마다 10까지(검토 1-2)');
  b.ysR = R + 1; p.ward = 0; es[1].row = 'back'; enemyHit(b, es[1], 10); ok(Math.abs(b.heldN - 1.25) < 0.01, '받아낸 몫: 후열 공격은 절반(직업 약점 유지)');
  p.guard = 0; const w0 = p.ward; enemyHit(b, es[0], 10); ok(b.heldN === 1.25 && p.ward <= w0, '방어하지 않으면 받아낸 몫 없음'); }
{ const { p, b, es } = fight('warden', { own: ['ct1C', 'ct2L', 'ct3L'] }); p.guard = 1; const k0 = es[0].brk || 0; enemyHit(b, es[0], 10); enemyHit(b, es[0], 10); ok((es[0].brk || 0) - k0 > 0 && (es[0].brk || 0) - k0 < 20, '흔들리는 방패: 방어 중 전열 적의 공격에 붕괴, 적 차례마다 한 번'); }
{ const { p, b, es } = fight('warden', { own: ['lg1C', 'lg2L'], act: ['w_dstance', 's_slam', 'w_flare', 'w_shove', 'w_stand'], eq: ['w_flare', 'w_shove', 'w_stand'] }); ok(p.pn.includes('n_wd_stack'), '쌓인 벽 노드');
  const nSt = () => b.log.filter(x => /쌓인 벽/.test(x.m || x.t || '')).length; const act = (id, w) => { E.runUntilPlayer(b); p.ward = w; p.ys = 5; p.st = p.stMax; const c0 = nSt(); E.playerAct(b, id, es[0].id); return nSt() - c0; };
  ok(act('w_bash', 20) === 0, '쌓인 벽: 유산 2 공격(방패 치기)에는 보호막을 쓰지 않음(검토 1-1)');
  ok(act('heavy', 20) === 1, '쌓인 벽: 강공격이면 보호막 5를 써서 +12%');
  ok(act('heavy', 14) === 0, '쌓인 벽: 보호막 15 미만이면 쓰지 않음');
  ok(act('w_flare', 20) === 0, '쌓인 벽: 보호막을 태우는 스킬에는 쓰지 않음'); }
/* M5-1: 옛 사다리 칸(작열 방벽 · 넓게 베기 · 달군 방패 · 산사태 · 받쳐 든 방패) 시험은 그 칸이 트리에서 빠져 지웠다(스킬 데이터는 남음) */
{ const { p, b } = fight('warden', { ks: ['pwK9'] }); ok(p.pn.includes('ks_wd_drop'), '방패를 내린 자'); p.guard = 1; p.ward = 0; const hp0 = p.hp; enemyHit(b, b.en[0], 10); ok(Math.abs(hp0 - p.hp - 7) < 0.01, '방패를 내린 자: 방어가 30%만 줄임(10 → 7)'); }
{ const { p } = fight('warden', { ks: ['suK9'] }); ok(E.wardMax(p) === Math.round(p.hpMax * 0.4), '영원한 성벽: 보호막 상한 40%'); }

// ===== 4) 수도승 =====
{ const { p, b } = fight('monk', { own: ['lg1C'] }); ok(kiCapOf(p) === 6, '기의 그릇: 기 상한 6'); E.addS(b, p, 'empower', 9); ok(st(p, 'empower') === 6, '기는 6에서 멈춤'); }
/* M5-2: 옛 사다리 칸의 강화(열린 단전 · 참회의 무게 · 철산고 · 천지 정지) 시험은 그 칸이 트리에서 빠져 지웠다(스킬 데이터는 남음) */
{ const { p, b, es } = fight('monk', { ks: ['pwK9'] }); p.guard = 1; const k0 = st(p, 'empower'); enemyHit(b, es[0], 5); enemyHit(b, es[1], 5); ok(st(p, 'empower') - k0 === 1, '비운 그릇: 되받기로 얻는 기는 내 차례 사이 한 번(검토 2-2)'); }
{ const { p, b } = fight('monk', { ks: ['svK9'], act: ['m_jeomhyeol'], eq: ['m_jeomhyeol'] }); ok(!okA(b, 'm_jeomhyeol') && okA(b, 'm_brace'), '부동의 맹세: ⚡ 공격 스킬(점혈)은 못 쓰고 ⚡ 자세는 씀'); p.stance = { dmg: 6 }; const hp0 = p.hp; enemyHit(b, b.en[0], 10); ok(Math.abs(hp0 - p.hp - 8.8) < 0.01, '부동의 맹세: 자세 동안 받는 직접 피해 −12%'); }
{ const { p, b, es } = fight('monk', { own: ['lg1C', 'lg2L', 'lg3L', 'lg4R', 'lg5R', 'lg6R', 'lg7R'] }); ok(p.pn.includes('n_mk_spill'), '넘치는 기운 노드'); E.addS(b, p, 'empower', 9); p.guard = 1; p.st = 10; enemyHit(b, es[0], 5); ok(p.st > 10, '넘치는 기운: 상한에 막힌 기 → 스태미나'); }
// ===== 5) 사냥꾼 =====
/* 0.8.0 M5-4(10월 21일): 사냥꾼도 재설계로 강화 노드 대신 변형이 됐다. 트리 규칙은 tools/tree-check.js, 연계 빠른 행동 · 몸 빼기 · 승부수 · 새 효과는 tools/hn-check.js.
   옛 칸의 연계 할인 · 끝없는 사냥 할인 · 가속 두 번째 차례 · 옛 칸(전환 사격 · 연속 사격 · 가시 화살 · 하늘 가르기)의 기본 공격 버프 시험은 그 칸이 트리에서 빠져 지웠다(스킬 데이터는 남음) */
{ const A = E.atBuild('hunter'), N = Object.values(A.nodes); ok(!A.tmp && N.filter(x => x.kind === 'skill').length === 39 && N.filter(x => x.slot).length === 36 && N.filter(x => x.kind === 'skill').every(x => [1, 2, 3, 4].includes(x.ys)), 'hunter: 재설계 스킬 39 · 변형 자리 36, 비용 1–4');
  ok(['h_prey', 'h_burst', 'h_switch', 'h_double', 'h_doom', 'hu_link1'].every(id => (E.SK2[id] || id.startsWith('hu_')) && !A.nodes[id] && R_('AT_GONE').hunter.includes(id)), '옛 칸 · 옛 강화는 트리에서 빠지고(AT_GONE) 스킬 데이터는 남음(옛 판 환급)'); }
{ const run = newRun('hunter'); ok(run.stats.dex === 8 && run.stats.con === 4 && !run.stats.str, '시작 노드 민첩 8 · 체력 4(결정 3)');
  const P = E.ptBuild('hunter'); ok(P.nodes.pw1C.fx === 'k_hn2' && P.nodes.pw3L.fx === 'n_hn_pull' && P.nodes.pwK9.fx === 'ks_hn_solo' && P.nodes.lgK9.fx === 'ks_hn_chase' && P.nodes.ag1C.fx === 'k_hn3' && P.nodes.lg2L.fx === 'k_hn1', '패시브 배치: 손에 익은 활 · 이어 당기는 활 · 외길 사냥꾼 · 끝까지 쫓는 자 · 가벼운 발 · 놓치지 않는 눈');
  ok(P.nodes.agK9.fx === 'ks_flow', 'M5-4: 기민 K9는 흘림새(먼저 움직임 = 전투 시작 가속을 뺌, 가속은 개전 · 질풍난사만)'); }
const linkOn = R_('linkOn'), soloOn = R_('soloOn'), focusCapOf = R_('focusCapOf');
const actOf = (b, id) => E.actionList(b).find(x => x.id === id);
const hfight = o => { const f = fight('hunter', o); const q = f.b.queue; if (q && q[0] === 'p' && q[1] === 'p') q.splice(1, 1); delete f.p.s.haste; f.b.pDouble = 0; return f; }; // 개전 가속(1라운드 두 차례)을 뺀 판: 라운드 셈을 단순하게. 10월 18일 0.8.0 5단계 결정 1부터 1라운드가 가속 라운드(pDouble 1)라 그 표시도 지운다
const hit = (b, id, e) => { b.stepMode = true; const h = e ? e.hp : 0; E.playerAct(b, id, e ? e.id : undefined); const d = e ? h - e.hp : 0; b.stepMode = false; if (b.waiting) E.runUntilPlayer(b); return d; }; // 내 행동의 피해만(적 차례 · 출혈 전)
{ ok(E.SK2.h_aim.lb === '저격' && E.SK2.h_step.lb === '기동' && E.SK2.h_aim.b === '시작', '시작 스킬 태그는 남음(표시용)');
  const { p, b, es } = hfight({}); hit(b, 'h_step', es[1]); ok(p.lastBr == null, 'M5-4: 시작 스킬은 lastBr을 바꾸지 않음(연계를 만들지도 끊지도 않음, 설계지 2-②)');
  hit(b, 'basic', es[0]); ok(p.lastBr == null, '기본 공격도 lastBr을 지우지도 바꾸지도 않음'); hit(b, 'guard'); ok(p.lastBr == null, '방어도 그대로'); }
{ const { p, b, es } = hfight({ ks: ['pwK9'], act: ['h5_pierce', 'h5_volley'], eq: ['h5_pierce', 'h5_volley'] }); ok(p.pn.includes('ks_hn_solo'), '외길 사냥꾼 큰 각인'); p.lastBr = '연사';
  ok(!linkOn(b, actOf(b, 'h5_pierce')) && !soloOn(b, actOf(b, 'h5_pierce')), '외길: 다른 갈래 이어 쓰기는 연계가 아님(빠른 행동 없음)'); p.lastBr = '저격';
  ok(soloOn(b, actOf(b, 'h5_pierce')), '외길: 같은 갈래를 바로 이어 쓰면 ⇉ +20%');
  const dS = hit(b, 'h5_pierce', es[0]); const f2 = hfight({ act: ['h5_pierce'], eq: ['h5_pierce'] }); ok(Math.abs(dS / hit(f2.b, 'h5_pierce', f2.es[0]) - 1.2) < 1e-6, '외길: 그 스킬 피해 +20%(그대로)'); }
{ const { p } = hfight({ own: ['lg5R'] }); ok(R_('hnLinkMax')(p) === 2 && R_('hnLinkMax')(hfight({}).p) === 1, 'M5-4 이어 쏘기 숙련: 연계 빠른 행동 내 차례에 1 → 2번'); }
{ const { p, b, es } = hfight({ ks: ['lgK9'] }); ok(focusCapOf(p) === 4, '끝까지 쫓는 자: 추적 상한 4'); for (let i = 0; i < 5; i++) hit(b, 'basic', es[0]); ok(p.focus.n === 4, '같은 적을 다섯 번 치면 4겹');
  const f2 = hfight({}); for (let i = 0; i < 5; i++) hit(f2.b, 'basic', f2.es[0]); ok(f2.p.focus.n === 3, '큰 각인이 없으면 3겹'); }
{ const { p, b, es } = hfight({ own: ['lg3R'] }); p.focus = { id: es[0].id, n: 3 }; es[0].hp = 1; hit(b, 'basic', es[0]); ok(!es[0].alive && p.hnPass === 1, '넘겨받는 추적: 3겹 적을 쓰러뜨리면 넘김 표시');
  hit(b, 'basic', es[1]); ok(p.focus.id === es[1].id && p.focus.n === 2 && !p.hnPass, '다음에 친 다른 적은 1겹에서 시작(맞은 뒤 2겹)'); }
{ const { p, b, es } = hfight({ own: ['lg7R'], act: ['h5_pierce', 'h5_gale'], eq: ['h5_gale'] }); const IF = R_('IFX_NODE'); b.actN = 7; b.hnLinkA = 7; ok(IF.n_hn_finale.hitP(b, p, es[0], {}, { skill: 1, id: 'h5_gale' }) === 0.12 && IF.n_hn_finale.hitP(b, p, es[0], {}, { skill: 1, id: 'h5_pierce' }) === 0, '끝맺는 연계: 연계로 쓴 유산 4 스킬만 +12%'); b.hnLinkA = 6; ok(IF.n_hn_finale.hitP(b, p, es[0], {}, { skill: 1, id: 'h5_gale' }) === 0, '연계가 아니면 없음'); }
const basicD = (o, fn) => { const f = hfight(o); if (fn) fn(f); return { d: hit(f.b, 'basic', f.es[1]), f }; };
const d0 = basicD().d;
{ const k = basicD({ own: ['pw1C'] }).d; ok(Math.abs(k / d0 - 1.12) < 1e-6, '손에 익은 활: 기본 공격 +12%(10% → 12%)');
  const x = basicD({ own: ['pw3L'] }, f => { f.b.hnLinkT = f.b.turnIdx; f.b.hnLinkN = 1; }); ok(Math.abs(x.d / d0 - 1.15) < 1e-6, 'M5-4 이어 당기는 활: 연계 빠른 행동을 쓴 차례의 기본 공격 +15%');
  { const f = hfight({ own: ['pw3L'] }); f.b.hnLinkT = f.b.turnIdx; f.b.hnLinkN = 1; f.p.st = 10; f.b.stepMode = true; E.playerAct(f.b, 'basic', f.es[1].id); ok(f.p.st === 15, '이어 당기는 활: 맞히면 스태미나 +5'); }
  const y = basicD({ own: ['pw3L'] }); ok(Math.abs(y.d / d0 - 1) < 1e-6, '이어 당기는 활: 연계 빠른 행동이 없던 차례에는 없음'); }
/* M5-4: 옛 칸(전환 사격 · 연속 사격 · 가시 화살 · 화살 폭우)의 기본 공격 버프 시험은 칸이 빠져 지웠다. 버프 엔진(hnBbufSet · hnBasicBuf)은 새 칸(덧화살 · 표적 고정)이 쓰고 tools/hn-check.js가 본다 */
// ===== 6) 원소술사 (10월 18일 원거리 초안의 패시브 노드 · M5-5 재설계 뒤 새 칸으로) =====
/* 0.8.0 M5-5(10월 21일): 원소술사도 재설계로 강화 노드 대신 변형이 됐다. 트리 규칙은 tools/tree-check.js, 원소 전환 · 빙결 · 서리 무게 · 승부수 · 새 효과는 tools/el-check.js.
   옛 칸 시험(51노드 · [전환] · 공명 처치 환급 · 원소 장막 · kw 할인 · 결정타 셋 · 3타 불똥)은 칸이 트리에서 빠져 지웠다(스킬 데이터는 남음). 패시브 노드 시험은 새 칸으로 */
{ const A = E.atBuild('elementalist'), N = Object.values(A.nodes); ok(!A.tmp && N.filter(x => x.kind === 'skill').length === 39 && N.filter(x => x.slot).length === 36 && N.filter(x => x.kind === 'skill').every(x => [1, 2, 3, 4].includes(x.ys)), 'elementalist: 새 트리(스킬 39 · 변형 자리 36, 비용 1–4)');
  ok(['e_kindle', 'e_resonate', 'e_overload', 'eu_veil', 'e_ember', 'e_touch'].every(id => (E.SK2[id] || id.startsWith('eu_')) && !A.nodes[id] && R_('AT_GONE').elementalist.includes(id)), '옛 칸 · 옛 강화 · 옛 시작 스킬은 트리에서 빠지고(AT_GONE) 스킬 데이터는 남음'); }
{ const run = newRun('elementalist'); const S = run.stats; ok(S.int === 9 && S.con === 3 && S.wil === 2 && (S.str || 0) + (S.dex || 0) === 0, '시작 노드 지능 9 · 체력 3 · 의지 2(14, 결정 9)');
  E.ptBuy(run, 'pw1C'); E.ptBuy(run, 'pw2L'); ok(run.stats.int === 9 && run.p.pn.includes('n_bs_dmg'), '화력 1고리 작은 노드는 평타 노드(M4, 지능 그대로 9, C1은 번지는 열)');
  const P = E.ptBuild('elementalist'), K = R_('KS_LIST'); ok(!P.tmp && P.nodes.pw1C.fx === 'k_el1' && P.nodes.ct1C.fx === 'k_el2' && P.nodes.lg2L.fx === 'k_el3' && P.nodes.lg3R.fx === 'n_el_echo' && P.nodes.pw3L.fx === 'n_el_student' && P.nodes.ct3L.fx === 'n_el_chanthand', '패시브 배치: 번지는 열 · 굳는 서리 · 남는 울림 · 이어지는 울림 · 불의 학도 · 영창 끊는 손');
  ok(P.nodes.ctK5.fx === 'ks_el_cut' && P.nodes.pwK9.fx === 'ks_el_ember' && P.nodes.svK9.fx === 'ks_el_heart' && P.nodes.ctK5.ring === 2, '직업 큰 각인 셋: 끊어진 영창(제어 K5, 2고리) · 잿불의 길 · 얼음 심장(결정 11)');
  const ks = Object.values(P.nodes).filter(n => n.kind === 'keystone'); const IFXN = R_('IFX_NODE'); ok(ks.filter(n => K[n.fx].resp && !IFXN[n.fx].ysChan).map(n => n.fx).sort().join() === 'ks_double,ks_el_cut' && ks.filter(n => IFXN[n.fx].ysChan).length === 3 && ks.filter(n => K[n.fx].pay).length === 6 && !ks.some(n => n.fx === 'ks_heavy' || n.fx === 'ks_breaker'), '대응 큰 각인: 통로 밖 둘(끊어진 영창 + 겹 대응), 통로 셋(M4, 무너뜨린 숨은 K9), 대가 여섯, 무거운 갑주 · 무너뜨리는 자 없음');
  ok(P.nodes.pw7L.pool === 'common' && P.nodes.pw7R.pool === 'common', '화력 3고리는 공용 둘(인플레이션 막기)');
  ok(/열충격 피해 \+3/.test(P.nodes.lg2L.d) && /스태미나가 6/.test(P.nodes.lg3R.d), '남는 울림은 효과를 바꾸고, 옛 효과(스태미나 +6)는 이어지는 울림으로'); }
const IFE = R_('IFX_NODE'), elGuardOf = R_('elGuardOf');
const efight = o => fight('elementalist', o);
const eHit = (o, id, prep) => { const f = efight(o); if (prep) prep(f); f.p.ys = 5; const h = f.es.map(e => e.hp); f.b.stepMode = true; E.playerAct(f.b, id, f.es[0].id); return { d: f.es.map((e, i) => h[i] - e.hp), f }; };
const lastShock = b => b.rec.filter(r => r.k === 'shock').pop();
const setEl = (b, e, I, C) => { if (I) E.addS(b, e, 'ignite', I); if (C) E.addS(b, e, 'chill', C); };
// 고정 피해(flatAdd): 배율을 모두 곱한 뒤 더한다
{ const A0 = { act: ['e5_firebolt', 'e5_sparks'], eq: ['e5_firebolt', 'e5_sparks'] }, A1 = Object.assign({ own: ['pw3L'] }, A0);
  const d = (o, id, prep) => eHit(o, id, prep).d; const sum = a => a.reduce((x, y) => x + y, 0);
  const em0 = d(A0, 'e5_firebolt')[0], em1 = d(A1, 'e5_firebolt')[0]; ok(Math.abs(em1 - em0 - 3) < 1e-6, '불의 학도: 화염탄 +3(' + em0.toFixed(1) + ' → ' + em1.toFixed(1) + ')');
  ok(Math.abs(sum(d(A1, 'e5_sparks')) - sum(d(A0, 'e5_sparks')) - 3) < 1e-6, '불의 학도: 모두 치는 스킬(불똥 세례)도 첫 대상 하나에만 +3');
  const vu = f => E.addS(f.b, f.es[0], 'vuln', 2); ok(Math.abs(d(A1, 'e5_firebolt', vu)[0] - d(A0, 'e5_firebolt', vu)[0] - 3) < 1e-6, '불의 학도: 취약(×1.25)을 곱한 뒤 더한다(+3 그대로)');
  ok(Math.abs(d(A1, 'basic')[0] - d(A0, 'basic')[0]) < 1e-6, '불의 학도: 기본 공격에는 없음(스킬만)');
  { const two = o => { const f = efight(o); f.p.ys = 5; f.b.stepMode = true; const h0 = f.es[0].hp; E.playerAct(f.b, 'e5_bolt', f.es[0].id); const h1 = f.es[0].hp; E.playerAct(f.b, 'e5_firebolt', f.es[0].id); return [h0 - h1, h1 - f.es[0].hp]; };
    const x = two(A1), y = two(A0); ok(Math.abs(x[0] - y[0] - 3) < 1e-6 && Math.abs(x[1] - y[1] - 3) < 1e-6, '불의 학도: ⚡ 행동(마력탄)과 ▶ 행동(화염탄)은 행동마다 따로 +3'); } }
{ const shk = (o, I, C, prep) => { const f = efight(o); setEl(f.b, f.es[0], I, C); if (prep) prep(f); const h = f.es[0].hp; f.b.stepMode = true; E.playerAct(f.b, 'guard'); return { d: h - f.es[0].hp, f }; };
  const a = shk({}, 3, 2), b2 = shk({ own: ['lg2L'] }, 3, 2); ok(lastShock(a.f.b) && Math.abs(b2.d - a.d - 3) < 1e-6, '남는 울림: 열충격 피해 +3(' + a.d.toFixed(1) + ' → ' + b2.d.toFixed(1) + ', 내 방어 행동 끝에도)');
  const c2 = shk({ own: ['lg2L'] }, 10, 3), c0 = shk({}, 10, 3); ok(Math.abs(c2.d - c0.d - 3) < 1e-6 && c0.d > a.d * 2, '남는 울림: T가 커도 +3 그대로(고정 피해는 묽어진다)');
  const arcF = o => { const f = efight(Object.assign({ act: ['e5_weave', 'e5_catalyst', 'e5_arc'], eq: ['e5_arc'] }, o)); setEl(f.b, f.es[0], 3, 0); f.p.ys = 5; const h = f.es.map(e => e.hp); f.b.stepMode = true; E.playerAct(f.b, 'e5_arc', f.es[0].id); return f.es.map((e, i) => h[i] - e.hp); };
  const r0 = arcF({}), r3 = arcF({ own: ['lg2L'] }); ok(r0[1] > 0 && Math.abs(r3[1] - r0[1]) < 1e-6 && Math.abs(r3[0] - r0[0] - 3) < 1e-6, '남는 울림: 번진 열충격에는 없음(열충격마다 한 번)');
  const sp = arcF({ own: ['lg5R'] }); ok(Math.abs(sp[1] / r0[1] - 1.15) < 1e-6, '번지는 울림: 번진 열충격 ×1.15');
  { const f = efight({ own: ['lg5R'], act: ['e5_weave', 'e5_catalyst', 'e5_arc'], eq: ['e5_arc'] }); ok(IFE.n_el_spread.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e5_arc' }) === 0.15 && IFE.n_el_spread.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e5_firebolt' }) === 0, '번지는 울림: 번짐 칸(튀는 충격)의 직접 피해 +15%, 다른 칸은 없음'); }
  { const f = efight({ own: ['lg2L'] }); setEl(f.b, f.es[0], 3, 2); const v = E.elemPreview(f.b, E.SK2.e5_icespear, f.es[0]), g = efight({}); setEl(g.b, g.es[0], 3, 2); const w = E.elemPreview(g.b, E.SK2.e5_icespear, g.es[0]); ok(Math.abs(v.d - w.d - 3) < 1e-6, '미리 보기(버튼 · 테스터)도 남는 울림 +3을 셈'); }
  const brk = f => E.addS(f.b, f.es[0], 'broken', 2);
  const k0 = shk({}, 3, 2, brk), k1 = shk({ own: ['ct5R'] }, 3, 2, brk), k2 = shk({ own: ['ct5R'] }, 3, 2); ok(Math.abs(k1.d / k0.d - 1.2) < 1e-6 && Math.abs(k2.d - a.d) < 1e-6, '깨진 얼음: 무너진 적에게만 열충격 ×1.2');
  ok(Math.abs(shk({ ks: ['pwK9'] }, 3, 2).d / a.d - 0.7) < 1e-6, '잿불의 길의 대가: 열충격 피해 −30%');
  { const st0 = shk({}, 3, 2).f.p.st, st1 = shk({ own: ['lg3R'] }, 3, 2).f.p.st; ok(st1 - st0 === 6, '이어지는 울림: 열충격이 일어나면 스태미나 +6'); }
  { const f = efight({ own: ['su3L'] }); setEl(f.b, f.es[0], 3, 2); f.p.hp = f.p.hpMax * 0.5; const h = f.p.hp; f.b.stepMode = true; E.playerAct(f.b, 'guard'); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.01) < 1e-6, '식은 숨: 열충격이 일어나면 최대 생명력 1% 회복');
    for (let i = 0; i < 6; i++) IFE.n_el_coolbreath.onShock(f.b, f.p); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.05) < 1e-6, '식은 숨: 전투마다 5%까지'); } }
// 불태우기 계열: 잿불의 길(+1 더) · 거센 불길(5 이상 +10%)
{ const bo = (o, I) => { const f = efight({ own: o.own, ks: o.ks, act: ['e5_firebolt', 'e5_burnout'].concat(o.act || []), eq: ['e5_burnout'] }); setEl(f.b, f.es[0], I, 0); f.p.ys = 5; const h = f.es[0].hp; f.b.stepMode = true; E.playerAct(f.b, 'e5_burnout', f.es[0].id); return h - f.es[0].hp; };
  { const f = efight({ act: ['e5_firebolt', 'e5_burnout'], eq: ['e5_burnout'] }); const per = 5 * R_('dotMul')(f.p); ok(Math.abs(bo({ ks: ['pwK9'] }, 5) - bo({}, 5) - per) < 1e-6, '잿불의 길: 태운 화상 1마다 +1 더(불태우기 +3 → +4)'); }
  ok(Math.abs(bo({ own: ['pw5R'] }, 5) / bo({}, 5) - 1.1) < 1e-6 && Math.abs(bo({ own: ['pw5R'] }, 4) / bo({}, 4) - 1) < 1e-6, '거센 불길: 화상 5 이상을 지우면 그 공격 +10%, 4면 없음'); }
// 서리 무게 · 얼음 심장 · 서리 껍질
{ const g = o => { const f = efight(o); E.addS(f.b, f.es[0], 'chill', 2); const h = f.p.hp; enemyHit(f.b, f.es[0], 10); const n = h - f.p.hp; const h2 = f.p.hp; enemyHit(f.b, f.es[0], 10, { charged: 1 }); return [n, h2 - f.p.hp, f]; };
  const [n0, c0] = g({}), [n1] = g({ own: ['sv5R'] }), [n2, c2, f2] = g({ ks: ['svK9'], act: ['e5_firebolt'], eq: ['e5_firebolt'] }), [n3, c3] = g({ own: ['sv3L'] });
  ok(Math.abs(n0 - 8) < 0.01 && Math.abs(c0 - 8) < 0.01, 'M5-5 서리 무게: 둔화된 적의 공격 10 → 8, 강타도 8(큰 공격 포함)');
  ok(Math.abs(n1 - 7.5) < 0.01 && Math.abs(elGuardOf(efight({ own: ['sv5R'] }).p) - 0.25) < 1e-9, '무뎌진 칼날: −20% → −25%');
  ok(Math.abs(n2 - 6.5) < 0.01 && Math.abs(c2 - 6.5) < 0.01, '얼음 심장: −35%(큰 공격 포함)');
  ok(Math.abs(n3 - 7.6) < 0.01 && Math.abs(c3 - 7.6) < 0.01, '서리 껍질: 둔화된 적에게서 받는 직접 피해 −5%(강타에도)');
  { const b = f2.b, p = f2.p, e = f2.es[1]; b.stepMode = true; p.ys = 5; E.playerAct(b, 'e5_firebolt', e.id); ok(st(e, 'ignite') === 2, '얼음 심장의 대가: 화염탄 화상 3 → 2'); E.addS(b, f2.es[0], 'ignite', 1); ok(st(f2.es[0], 'ignite') === 1, '거는 화상 1은 1(최소 1)');
    ok(E.elemPreview(b, E.SK2.e5_firebolt, f2.es[0]).I === 2, '미리 보기도 화상 −1(타격이 화상 1을 쓰고 화염탄 3 → 2)'); }
  { const f = efight({ act: ['e5_firebolt'], eq: ['e5_firebolt'] }); f.b.stepMode = true; f.p.ys = 5; E.playerAct(f.b, 'e5_firebolt', f.es[1].id); ok(st(f.es[1], 'ignite') === 3, '얼음 심장이 없으면 화상 3 그대로'); } }
// 끊어진 영창: 끊기 · 무너뜨리기 · 먼저 치우기에 성공하면 대응 +1 더(라운드 한도 밖, 전투마다 2번). 10월 18일 0.8.0 5단계 결정 5로 넓힘(전에는 영창 끊기 · 열충격 무너뜨리기)
{ const cutN = b => b.rec.filter(r => r.k === 'ys' && r.why === '끊어진 영창').length;
  const chantBrk = (b, e) => { e.intent = { k: 'chanting' }; b.cur = { id: 'basic' }; E.addBreak(b, e, 9999); b.cur = null; };
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; p.ys = 0; chantBrk(b, es[0]); ok(p.ys === 2 && cutN(b) === 1, '끊어진 영창: 영창을 끊으면 대응 +1(끊기)과 +1 더');
    chantBrk(b, es[1]); ok(p.ys === 3 && cutN(b) === 2, '같은 라운드 두 번째 끊기: 대응 한도에 막혀도 +1 더(라운드 한도 밖)');
    chantBrk(b, es[0]); ok(p.ys === 3 && cutN(b) === 2, '전투마다 2번까지(세 번째는 없음)'); }
  { const f = efight({}); f.p.ys = 0; chantBrk(f.b, f.es[0]); ok(f.p.ys === 1 && cutN(f.b) === 0, '큰 각인이 없으면 대응 +1만'); }
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; p.ys = 0; es[0].intent = { k: 'attack' }; b.cur = { id: 'basic' }; E.addBreak(b, es[0], 9999); b.cur = null; ok(p.ys === 2 && cutN(b) === 1, '영창이 아닌 적을 붕괴로 무너뜨려도 +1 더(10월 18일 결정 5: 무너뜨리기)'); }
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; p.ys = 0; es[0].intent = { k: 'attack' }; setEl(b, es[0], 3, 2); es[0].brk = es[0].brkMax - 1; b.stepMode = true; E.playerAct(b, 'guard'); ok(es[0].s.broken && p.ys === 2 && cutN(b) === 1, '열충격으로 무너뜨리면 대응 +1(무너뜨리기)과 +1 더'); }
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; es[0].chant = { taken: 0, need: 1 }; es[0].intent = { k: 'chanting' }; b.stepMode = true; p.ys = 0; E.playerAct(b, 'basic', es[0].id); ok(!es[0].chant && cutN(b) === 1, '쌓인 상처로 영창이 끊겨도 +1 더'); }
  { const f = efight({ own: ['ag5R'] }); f.p.st = 10; const st0 = f.p.st; f.es[0].intent = { k: 'chanting' }; f.b.cur = { id: 'basic' }; E.addBreak(f.b, f.es[0], 9999); f.b.cur = null; ok(f.p.st - st0 === 10, '흩어진 주의: 영창을 끊으면 스태미나 +10');
    f.es[1].intent = { k: 'attack' }; const s1 = f.p.st; f.b.cur = { id: 'basic' }; E.addBreak(f.b, f.es[1], 9999); f.b.cur = null; ok(f.p.st === s1, '영창이 아닌 무너뜨리기에는 없음'); }
  { const f = efight({ own: ['ct3L'] }); f.es[0].intent = { k: 'chanting' }; ok(IFE.n_el_chanthand.brk(f.b, f.p, f.es[0]) === 10, '영창 끊는 손: 영창 중인 적에게 붕괴 +10'); f.es[0].intent = { k: 'heavy' }; ok(IFE.n_el_chanthand.brk(f.b, f.p, f.es[0]) === 0, '강타 예고에는 없음(끊기 칸은 영창에만, 강타 약점 유지)'); } }
// 앞선 주문 · 가벼운 손 · 고른 원소 · 녹는 서리
{ const f = efight({ own: ['ag2L'] }); f.b.turnIdx = 0; ok(IFE.n_el_first.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e5_bolt' }) === 0.12 && IFE.n_el_first.hitP(f.b, f.p, f.es[0], {}, { id: 'basic' }) === 0, '앞선 주문: 전투 첫 내 차례의 스킬 +12%(기본 공격 없음)'); f.b.turnIdx = 1; ok(IFE.n_el_first.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e5_bolt' }) === 0, '두 번째 차례부터 없음'); }
{ const lt = (own, id, I) => { const f = efight({ own, act: ['e5_firebolt', 'e5_icespear', 'e5_weave'], eq: ['e5_icespear', 'e5_weave', 'e5_firebolt'] }); f.p.elSt.el = 'ice'; if (I) setEl(f.b, f.es[0], I, 0); f.p.st = 10; f.p.ys = 5; f.b.stepMode = true; E.playerAct(f.b, id, f.es[0].id); return f.p.st; };
  ok(lt(['ag3R'], 'e5_bolt') - lt([], 'e5_bolt') === 4 && lt(['ag3R'], 'e5_icespear') === lt([], 'e5_icespear'), '가벼운 손: ⚡ 스킬(얼음 마력탄)로 둔화를 걸면 스태미나 +4, ▶ 스킬(얼음 창)은 없음');
  ok(lt(['lg7R'], 'e5_weave') - lt([], 'e5_weave') === 6 && lt(['lg7R'], 'e5_firebolt') === lt([], 'e5_firebolt'), '고른 원소: 한 행동에 화상 · 둔화를 둘 다 걸면(원소 엮기) 스태미나 +6, 하나면 없음'); }
{ const f = efight({ own: ['su5R'] }); f.p.rime = { chill: { n: 2, times: 8 } }; f.p.hp = f.p.hpMax * 0.5; const h = f.p.hp; enemyHit(f.b, f.es[0], 0); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.01) < 1e-6 && st(f.es[0], 'chill') === 2, '녹는 서리: 되얼림이 발동하면 최대 생명력 1% 회복');
  for (let i = 0; i < 6; i++) enemyHit(f.b, f.es[0], 0); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.04) < 1e-6, '녹는 서리: 전투마다 4%까지'); }
// ===== 7) 암살자 =====
/* 0.8.0 M5-3(10월 20일): 암살자도 재설계로 강화 노드 대신 변형이 됐다. 암살자 트리 규칙은 tools/tree-check.js, 새 효과 · 승부수 · 결합 칸 · 그림자 판정은 tools/as-check.js.
   옛 칸의 비용 할인(그림자 걸음 · 목을 긋는 그림자 · 맹독의 끝 · 맹독 뇌관) · 옛 강화(되받아치기 · 독 묻은 칼막이 · 연막 · 흘림의 춤 · 그림자 역습 · 격발 강화) 시험은 그 칸이 트리에서 빠져 지웠다(스킬 데이터는 남음) */
{ const A = E.atBuild('assassin'), N = Object.values(A.nodes); ok(!A.tmp && N.filter(x => x.kind === 'skill').length === 39 && N.filter(x => x.slot).length === 36 && N.filter(x => x.kind === 'skill').every(x => [1, 2, 3, 4].includes(x.ys)), 'assassin: 재설계 스킬 39 · 변형 자리 36, 비용 1–4');
  ok(['a_fang', 'a_deflect', 'a_burst', 'a_siphon', 'a_shadow', 'a_cataclysm', 'a_umbra'].every(id => E.SK2[id] && !A.nodes[id] && R_('AT_GONE').assassin.includes(id)), '옛 칸은 트리에서 빠지고(AT_GONE) 스킬 데이터는 남음(옛 판 환급)'); }
{ const run = newRun('assassin'); const S = run.stats; ok(S.dex === 5 && S.int === 4 && S.con === 3 && (S.str || 0) + (S.wil || 0) === 0, '시작 노드 민첩 5 · 지능 4 · 체력 3 그대로(4-6)');
  E.ptBuy(run, 'pw1C'); ok(run.stats.dex === 5 && run.p.pn.includes('n_bs_dmg'), '화력 1고리 작은 노드는 평타 노드(M4, 민첩 그대로 5)');
  const P = E.ptBuild('assassin'), K = R_('KS_LIST'); ok(!P.tmp && P.nodes.pw2L.fx === 'k_as1' && P.nodes.lg1C.fx === 'k_as2' && P.nodes.ag1C.fx === 'k_as3' && P.nodes.pw3R.fx === 'n_as_gap' && P.nodes.lg5R.fx === 'n_as_store' && P.nodes.lg7R.fx === 'n_as_link', '패시브 배치: 깊은 독 · 터지는 독 · 그림자 숨 · 흘려 낸 틈 · 독의 저장고 · 이어진 그림자');
  ok(P.nodes.pwK9.fx === 'ks_as_lord' && P.nodes.svK9.fx === 'ks_as_oath' && P.nodes.pwK9.ring === 3 && P.nodes.svK9.ring === 3, '직업 큰 각인 둘: 독의 군주(화력 K9) · 그림자 맹세(생존 K9)');
  const ks = Object.values(P.nodes).filter(n => n.kind === 'keystone'); const IFXN = R_('IFX_NODE'); ok(ks.filter(n => K[n.fx].resp && !IFXN[n.fx].ysChan).map(n => n.fx).join() === 'ks_double' && ks.filter(n => IFXN[n.fx].ysChan).length === 3 && ks.filter(n => K[n.fx].pay).length === 7 && !ks.some(n => n.fx === 'ks_heavy') && ks.filter(n => K[n.fx].cls === 'assassin').length === 2, '대응 큰 각인: 통로 밖은 겹 대응 하나, 통로 셋(M4), 대가 일곱, 무거운 갑주 없음(그림자 맹세로 바꿈)');
  const nt = Object.values(P.nodes).filter(n => n.kind === 'notable'); ok(nt.length === 35 && nt.filter(n => n.pool === 'class').length === 18, '중간 노드 35(직업 18 · 공용 17)'); }
const asR = R_, ysResp = f('ysResp'), parryRed = f('parryRed'), parryBigOf = R_('parryBigOf'), psnCapOf = R_('psnCapOf');
const afight = o => { const f = fight('assassin', o); for (const e of f.es) e.brkMax = 1000; return f; };
const aAct = (f, id, e) => { f.b.stepMode = true; f.p.ys = 5; const h = (e || f.es[0]).hp; E.playerAct(f.b, id, (e || f.es[0]).id); return h - (e || f.es[0]).hp; };
const near = (a, b2) => Math.abs(a - b2) < 1e-6;
// 중독 상한 훅
{ const cap = o => { const f = afight(o); E.addPoison(f.b, f.es[0], 40, 1); return st(f.es[0], 'poison'); };
  ok(cap({}) === 20 && cap({ own: ['lg5R'] }) === 24 && cap({ ks: ['pwK9'] }) === 30 && cap({ own: ['lg5R'], ks: ['pwK9'] }) === 30 && R_('KW').poison === 20, '중독 상한: 20 · 독의 저장고 24 · 독의 군주 30(둘 다면 30), KW.poison은 20 그대로');
  const f = afight({ ks: ['pwK9'] }); E.addPoison(f.b, f.p, 40, 0); ok(st(f.p, 'poison') === 20 && psnCapOf(f.p) === 30 && psnCapOf(afight({}).p) === 20, '내가 받는 중독은 20 그대로(내가 거는 독만)');
  const Q = require('./qa.js'); ok(Q.qaPoisonBurst(f.p, { s: E.SK2.a_cataclysm }, 30) > Q.qaPoisonBurst(afight({}).p, { s: E.SK2.a_cataclysm }, 30), '테스터 터뜨리기 어림(qa.js)도 노드의 상한을 읽음'); }
// 독의 군주의 대가 · 그림자 맹세
{ const f0 = afight({ act: ['a_heulbe'], eq: ['a_heulbe'] }), f1 = afight({ ks: ['pwK9'], act: ['a_heulbe'], eq: ['a_heulbe'] });
  ok(near(parryRed(f0.p) - parryRed(f1.p), 0.15) && near(parryRed(f0.p), 0.7 + 0.005 * stat(f0.p, 'dex')), '독의 군주의 대가: 공통 흘리기 감소분 −15%p(70% → 55% + 민첩)');
  aAct(f0, 'a_heulbe'); aAct(f1, 'a_heulbe'); ok(near(f0.p.dodgeRed, 0.8) && near(f1.p.dodgeRed, 0.65), '독의 군주의 대가: 흘리기 스킬도 80% → 65%(흘려 베기)'); }
{ const f0 = afight({}), f1 = afight({ ks: ['svK9'] }), f2 = afight({ own: ['ag3L'] }), f3 = afight({ own: ['ag3L'], ks: ['svK9'] }); const dc = f => E.dodgeCost(f.p);
  ok(dc(f0) === 25 && dc(f0) - dc(f1) === 10 && dc(f0) - dc(f2) === 4 && dc(f0) - dc(f3) === 14, '흘리기 스태미나: 25, 그림자 맹세 −10, 그림자 발 −4(함께 −14)'); }
{ const pz = (o, n) => { const f = afight(o); E.addPoison(f.b, f.es[0], n, 1); return st(f.es[0], 'poison'); };
  ok(pz({ ks: ['svK9'] }, 6) === 4 && pz({ ks: ['svK9'] }, 7) === 5 && pz({ ks: ['svK9'] }, 2) === 1 && pz({ ks: ['svK9'] }, 1) === 1 && pz({}, 6) === 6, '그림자 맹세의 대가: 거는 독 −30% 반올림, 최소 1(6 → 4, 7 → 5, 2 → 1, 1 → 1)');
  const f = afight({ ks: ['svK9'], act: ['a_dokkal'], eq: ['a_dokkal'] }); aAct(f, 'a_dokkal'); ok(st(f.es[0], 'poison') === 3, '그림자 맹세의 대가: 독 바른 칼 4 → 3');
  const g = afight({ ks: ['svK9'] }); E.addPoison(g.b, g.p, 6, 0); ok(st(g.p, 'poison') === 6, '내가 받는 독은 줄지 않음'); }
/* M5-3: 흘려 베기의 반격은 기본 공격(판정 ①)이라 그림자 맹세의 흘리기 스킬 피해 +15%를 받지 않는다(새 트리에 흘려 낸 피해를 주는 흘리기 스킬이 없음) */
{ const cm = o => { const f = afight(Object.assign({ act: ['a_gyeonu'], eq: ['a_gyeonu'] }, o)); f.b.stepMode = true; E.playerAct(f.b, 'a_gyeonu'); f.b.cur = null; E.setParry(f.b, f.es[0], null, null); const h = f.es[0].hp; enemyHit(f.b, f.es[0], 10); return h - f.es[0].hp; };
  ok(cm({}) > 0 && near(cm({ ks: ['svK9'] }), cm({})), '그림자 맹세: 공통 흘리기(칼끝 겨누기 +14)에는 +15% 없음(흘리기 스킬만)'); }
// 10월 18일 0.8.0 5단계 마무리(만든 사람 결정, 쓰러짐 우선): 흘려 낸 칼끝 · 독 · 붕괴 · 출혈은 줄어든 피해를 받은 뒤, 살아 있을 때만 들어간다. 흘리기의 다른 몫(대응 +1 · 흘려 냄 표시 · 강타 붕괴 +25)은 그대로
{ const last = (hp, raw) => { const f = afight({ act: ['a_gyeonu'], eq: ['a_gyeonu'] }); for (const e of f.es.slice(1)) { e.alive = false; e.hp = 0; } aAct(f, 'a_gyeonu'); f.b.cur = null; E.setParry(f.b, f.es[0], null, null); const e = f.es[0]; e.hp = 1; f.p.hp = hp; const k0 = e.brk || 0, n0 = f.b.rec.length;
    enemyHit(f.b, e, raw, { charged: 1 }); const R = f.b.rec.slice(n0); return { over: f.b.over, hp: f.p.hp, alive: e.alive, brk: (e.brk || 0) - k0, resp: R.some(x => x.k === 'ys' && x.why === '흘리기'), mark: f.p.asParT != null, iHit: R.findIndex(x => x.k === 'hit'), iRip: R.findIndex(x => x.k === 'dealt' && x.a === '흘려 낸 칼끝') }; };
  const L = last(1, 100), W = last(1000, 100);
  ok(L.over === 'lose' && L.hp === 0 && L.alive && L.iRip < 0 && L.resp && L.mark && L.brk >= 25, '흘려 낸 칼끝이 마지막 적을 쓰러뜨려도 줄어든 피해로 내가 쓰러지면 짐(쓰러짐 우선), 대응 · 표시 · 붕괴는 그대로 ' + JSON.stringify(L));
  ok(W.over === 'win' && !W.alive && W.iHit >= 0 && W.iRip > W.iHit && W.resp, '살아 있으면 칼끝이 맞은 기록 다음에 들어가 이긴다 ' + JSON.stringify(W)); }
// 흘려 냄 표시 · 흘려 낸 틈
{ const IFA = R_('IFX_NODE'); const f = afight({ own: ['pw3R'] }); const { b, p, es } = f; E.setParry(b, es[0], null, null); enemyHit(b, es[0], 10); ok(p.asParT === (b.turnIdx || 0), '흘려 내면 흘려 냄 표시(다음 내 차례)를 남김');
  const h = IFA.n_as_gap.hitP; b.actN = 900; ok(near(h(b, p, es[0], {}, { id: 'basic' }), 0.1) && near(h(b, p, es[1], {}, { id: 'basic' }), 0.1), '흘려 낸 틈: 그 차례 첫 공격 +10%(광역 · 연타는 그 공격 전체)');
  b.actN = 901; ok(h(b, p, es[0], {}, { id: 'basic' }) === 0, '흘려 낸 틈: 한 번');
  p.asParT = (b.turnIdx || 0) - 1; ok(h(b, p, es[0], {}, { id: 'basic' }) === 0 && p.asParT != null, '흘려 낸 틈: 다음 내 차례가 지나면 없음');
  const g = o => { const x = afight(o); E.setParry(x.b, x.es[0], null, null); enemyHit(x.b, x.es[0], 10); return aAct(x, 'basic'); }; ok(near(g({ own: ['pw3R'] }) / g({}), 1.1), '흘려 낸 틈: 흘려 낸 뒤 기본 공격 ×1.1(실제 피해)');
  const n = afight({}); E.setParry(n.b, n.es[0], null, null); enemyHit(n.b, n.es[0], 10); ok(near(aAct(n, 'basic'), g({})), '노드가 없으면 표시만 남고 피해는 그대로'); }
// 생존: 얇은 그림자 · 피하는 몸
{ const f = afight({ own: ['sv3L'], act: ['a_heulbe'], eq: ['a_heulbe'] }); const { b, p, es } = f; p.hp = p.hpMax * 0.4; b.stepMode = true; E.playerAct(b, 'dodge', es[0].id); ok(near(p.dodgeRed, parryRed(p) + 0.05), '얇은 그림자: 생명력 50% 이하면 공통 흘리기 +5%p');
  const g = afight({ own: ['sv3L'], act: ['a_heulbe'], eq: ['a_heulbe'] }); g.p.hp = g.p.hpMax * 0.4; aAct(g, 'a_heulbe'); ok(near(g.p.dodgeRed, 0.85), '얇은 그림자: 흘리기 스킬도 80% → 85%');
  const h2 = afight({ own: ['sv3L'] }); h2.p.hp = h2.p.hpMax * 0.6; h2.b.stepMode = true; E.playerAct(h2.b, 'dodge', h2.es[0].id); ok(near(h2.p.dodgeRed, parryRed(h2.p)), '얇은 그림자: 50% 넘으면 그대로');
  const cap = afight({ own: ['sv3L'] }); cap.p.eq.armor = 'cloak'; cap.p.hp = cap.p.hpMax * 0.4; E.setParry(cap.b, cap.es[0], 0.88, null); ok(near(cap.p.dodgeRed, 0.9), '얇은 그림자: 상한 90% 그대로'); }
{ const tk = o => { const f = afight(o); f.es[0].strong = 1; E.setParry(f.b, f.es[0], null, null); const h = f.p.hp; enemyHit(f.b, f.es[0], 20); return [h - f.p.hp, f]; };
  const [a, fa] = tk({}), [c2, fc] = tk({ own: ['sv5R'] }); const r = parryRed(fa.p);
  ok(near(parryBigOf(fc.p, { strong: 1 }), 0.15) && near(parryBigOf(fa.p, { strong: 1 }), 0.2) && parryBigOf(fc.p, {}) === 0, '피하는 몸: 강적 · 보스 −20%p → −15%p(보통 적은 0)');
  ok(near(c2 / a, (1 - (r - 0.15)) / (1 - (r - 0.2))), '피하는 몸: 강적 공격을 흘리면 받는 피해가 그만큼 준다'); }
// 유지력: 흘린 숨 · 남은 독의 온기 (M5-3: 독 흡수가 트리에서 빠져 독 마시는 몸 시험은 지움 — 장비 · 다른 흡수에만 듦)
{ const f = afight({ own: ['su3R'] }); const { b, p, es } = f; p.hp = p.hpMax * 0.5; const h = p.hp; E.setParry(b, es[0], null, null); enemyHit(b, es[0], 0); ok(near(p.hp - h, p.hpMax * 0.01), '흘린 숨: 흘려 내면 최대 생명력 1% 회복');
  for (let i = 0; i < 6; i++) { E.setParry(b, es[0], null, null); enemyHit(b, es[0], 0); } ok(near(p.hp - h, p.hpMax * 0.04), '흘린 숨: 전투마다 4%까지'); }
{ const wm = (o, id) => { const f = afight(Object.assign({ act: ['a_gyeokpyo'], eq: ['a_gyeokpyo'] }, o)); E.addPoison(f.b, f.es[0], 6, 1); f.es[0].hp = id ? 1 : 40; f.p.hp = f.p.hpMax * 0.5; const h = f.p.hp; aAct(f, id || 'a_gyeokpyo'); return [f.p.hp - h, f]; }; // 격발 표창: 피해로는 남고 터뜨린 독(1+…+6)으로 쓰러진다
  const [w1, fw] = wm({ own: ['su5R'] }), [w0] = wm({}), [wb] = wm({ own: ['su5R'] }, 'basic');
  ok(!fw.es[0].alive && near(w1 - w0, fw.p.hpMax * 0.02) && near(wb, 0), '남은 독의 온기: 독을 터뜨려 쓰러뜨리면 2% 회복, 기본 공격 처치는 없음');
  const IFA = R_('IFX_NODE'); fw.b.asBurstK = 1; for (let i = 0; i < 5; i++) IFA.n_as_warm.onKill(fw.b, fw.p, fw.es[1]); fw.b.asBurstK = 0; ok(near(fw.b.asWarmH, fw.p.hpMax * 0.06), '남은 독의 온기: 전투마다 6%까지'); }
// 제어: 무너뜨리는 독 · 끊는 칼끝 · 깨진 틈 찌르기
{ const IFA = R_('IFX_NODE'); const f = afight({ own: ['ct2L'] }); E.addPoison(f.b, f.es[0], 9, 1); ok(IFA.n_as_crush.brkMul(f.b, f.p, f.es[0]) === 1, '무너뜨리는 독: 중독 9면 없음'); E.addPoison(f.b, f.es[0], 1, 1); ok(IFA.n_as_crush.brkMul(f.b, f.p, f.es[0]) === 1.1, '무너뜨리는 독: 중독 10 이상이면 붕괴 ×1.1');
  const bk = o => { const x = afight(o); E.addPoison(x.b, x.es[0], 10, 1); const k = x.es[0].brk || 0; aAct(x, 'basic'); return x.es[0].brk - k; }; ok(near(bk({ own: ['ct2L'] }) / bk({}), 1.1), '무너뜨리는 독: 중독 10 이상인 적에게 기본 공격 붕괴 ×1.1(실제)'); }
{ const pk = o => { const f = afight(o); E.setParry(f.b, f.es[0], null, null); const k = f.es[0].brk || 0; enemyHit(f.b, f.es[0], 10, { charged: 1 }); return f.es[0].brk - k; };
  ok(near(pk({}), 25) && near(pk({ own: ['ct3R'] }), 35), '끊는 칼끝: 강타를 흘려 내면 붕괴 +25 → +35'); }
{ const cr = (o, brk) => { const run = n => { const f = afight(Object.assign({ act: ['a_gyeokjjil'], eq: ['a_gyeokjjil'] }, o)); if (n) E.addPoison(f.b, f.es[0], n, 1); if (brk) E.addS(f.b, f.es[0], 'broken', 2); return aAct(f, 'a_gyeokjjil'); }; return run(6) - run(0); }; // 터뜨린 몫만
  ok(Math.abs(cr({ own: ['ct5R'] }, 1) / cr({}, 1) - 1.2) < 1e-6 && Math.abs(cr({ own: ['ct5R'] }, 0) - cr({}, 0)) < 1e-6, '깨진 틈 찌르기: 무너진 적에게 터뜨린 피해 ×1.2, 무너지지 않은 적은 그대로');
  const IFA = R_('IFX_NODE'); const f = afight({}); E.addS(f.b, f.es[0], 'broken', 2); ok(IFA.n_as_crack.hitP(f.b, f.p, f.es[0], {}) === 0, '깨진 틈 찌르기: 터뜨리기가 아닌 타격에는 없음'); }
// 기민: 연이은 흘림 · 계승: 독 기억
{ const f = afight({ own: ['ag5R'] }); const { b, p, es } = f; ok(E.dodgeCost(p) === 25, '연이은 흘림: 흘려 내기 전에는 25'); E.setParry(b, es[0], null, null); enemyHit(b, es[0], 10); ok(E.dodgeCost(p) === 15, '연이은 흘림: 흘려 낸 다음 공통 흘리기 25 → 15');
  p.st = 100; b.stepMode = true; E.playerAct(b, 'dodge', es[1].id); ok(p.st === 85 && E.dodgeCost(p) === 25, '연이은 흘림: 한 번 쓰면 25로'); }
{ const f = afight({ own: ['lg3L'] }); E.addPoison(f.b, f.es[0], 3, 1); E.addPoison(f.b, f.es[1], 3, 1); E.addPoison(f.b, f.es[0], 3, 1); ok(st(f.es[0], 'poison') === 8 && st(f.es[1], 'poison') === 3, '독 기억: 전투에서 처음 거는 독 +2(전투마다 한 번)');
  const g = afight({}); E.addPoison(g.b, g.es[0], 3, 1); ok(st(g.es[0], 'poison') === 3, '독 기억이 없으면 그대로'); }
{ const IFA = R_('IFX_NODE'); const f = afight({ own: ['pw5R'] }); E.addPoison(f.b, f.es[0], 14, 1); ok(IFA.n_as_ripe.hitP(f.b, f.p, f.es[0]) === 0, '무르익은 독: 중독 14면 없음'); E.addPoison(f.b, f.es[0], 1, 1); ok(IFA.n_as_ripe.hitP(f.b, f.p, f.es[0]) === 0.08, '무르익은 독: 중독 15 이상이면 +8%'); }
// ===== 8) 10월 18일 0.8.0 5단계 원거리 초안 10절 결정 1 · 3 · 4 · 5 =====
// 결정 1: 가속 라운드(두 번 움직이는 라운드)는 지금 라운드다(b.pDouble === b.round). 전에는 + 1이라 hastex가 그다음 라운드에 붙었다
{ const pierce = (f, ys) => { f.b.stepMode = true; f.p.ys = ys || 5; const e = f.es[0]; const h = e.hp; E.playerAct(f.b, 'h5_pierce', e.id); return h - e.hp; };
  const o = { act: ['h5_pierce'], eq: ['h5_pierce'] };
  const fa = fight('hunter', o), r0 = fa.b.round, pd = fa.b.pDouble, q0 = fa.b.queue.slice(0, 2).join(); pierce(fa);
  ok(r0 === 1 && pd === 1 && q0 === 'p,p', '개전 가속: 1라운드에 두 번 움직이고 그 라운드가 가속 라운드(pDouble 1)');
  E.playerAct(fa.b, 'basic', fa.es[0].id); E.runUntilPlayer(fa.b); ok(fa.b.round === 2 && fa.b.pDouble !== fa.b.round && fa.b.queue.filter(x => x === 'p').length === 1, '2라운드(가속 없음)는 가속 라운드가 아님');
  const fh = hfight(o); E.addS(fh.b, fh.p, 'haste', 1); fh.b.stepMode = true; E.playerAct(fh.b, 'basic', fh.es[0].id); E.runUntilPlayer(fh.b);
  ok(fh.b.round === 2 && fh.b.pDouble === 2 && fh.b.queue[0] === 'p' && fh.b.queue[1] === 'p', '라운드 중에 얻은 가속: 다음 라운드(2)가 가속 라운드');
  /* M5-4: 가속 라운드 배수(hastex) 칸은 트리에서 빠졌다(가속은 개전 · 질풍난사만). 가속 라운드 판정(pDouble)만 본다 */ }
// 결정 4: 큰 각인 제시 — 연 액티브 스킬(시작 · 찍은 스킬 노드 · 장착)에 유산 4가 없으면 결정의 칼을 뺀다(모든 직업)
{ const ksHasCost4 = f('ksHasCost4');
  const mk = (cls, act) => { const run = newRun(cls); run.lv = 16; run.clears = 2; run.seed = 91; run.ch = 2; E.ptFix(run); for (const id of ['pw1C', 'pw2L', 'pw3L', 'pw4L']) assert.equal(E.ptBuy(run, id), null, cls + ' ' + id); run.atree.own = act.slice(); run.skills = act.filter(id => E.atBuild(cls).nodes[id].kind === 'skill').slice(0, 4); E.atSync(run); return run; };
  for (const [cls, a4, a0] of [['assassin', ['a_dokkal', 'a_gyeokpyo', 'a_mandok'], ['a_dokkal', 'a_dokchim', 'a_godok', 'a_maengdok']], ['hunter', ['h5_pierce', 'h5_volley', 'h5_gale'], ['h5_pierce', 'h5_cover']], ['spellblade', ['sb_crimson'], []]]) {
    const r4 = mk(cls, a4), r0 = mk(cls, a0); const P = E.ptBuild(cls); const o4 = E.ksOfferMake(r4), o0 = E.ksOfferMake(r0);
    ok(P.nodes.pwK5.fx === 'ks_sharp' && ksHasCost4(r4) && !ksHasCost4(r0), cls + ': 유산 4 스킬 판정(skCost(skOf)), 화력 K5는 날 선 손(M4)');
    ok(o4.includes('pwK5') && o0.includes('pwK5') && o0.length === 3 && JSON.stringify(E.ksOfferMake(r0)) === JSON.stringify(o0), cls + ': 결정의 칼이 빠져 화력 K5(날 선 손)는 유산 4 스킬과 상관없이 제시(같은 시드면 같은 셋) ' + o4.join(' ') + ' / ' + o0.join(' '));
    ok(E.ksCands(r0).some(c => c.id === 'pwK5'), cls + ': 후보 계산(ksCands · ksInfo)은 그대로, 제시에서만 뺀다'); }
  { const run = mk('assassin', ['a_dokkal', 'a_gyeokpyo']); run.skills = ['a_dokkal', 'a_gyeokpyo']; E.atSync(run); ok(!ksHasCost4(run), '시작 스킬은 유산 2'); run.atree.own.push('a_mandok'); ok(ksHasCost4(run), '찍기만 하고 끼우지 않은 유산 4 스킬도 연 스킬로 셈'); } }
// 결정 5: 끊어진 영창 — 끊기 · 무너뜨리기 · 먼저 치우기만(막기 · 흘리기는 아님), 대응 한도 밖 +1, 전투마다 2번. 테스터 큰 각인 선호에 있음
{ const ysResp = f('ysResp'), cutN = b => b.rec.filter(r => r.k === 'ys' && r.why === '끊어진 영창').length; const KS = R_('KS_LIST');
  for (const why of ['끊기', '무너뜨리기', '먼저 치우기']) { const fe = efight({ ks: ['ctK5'] }); fe.p.ys = 0; ysResp(fe.b, why); ok(fe.p.ys === 2 && cutN(fe.b) === 1, '끊어진 영창: ' + why + ' → 대응 +1과 +1 더'); }
  for (const why of ['막기', '흘리기']) { const fe = efight({ ks: ['ctK5'] }); fe.p.ys = 0; ysResp(fe.b, why); ok(fe.p.ys === 1 && cutN(fe.b) === 0, '끊어진 영창: ' + why + '은(는) +1 더 없음'); }
  { const fe = efight({ ks: ['ctK5'] }); fe.p.ys = 0; ysResp(fe.b, '먼저 치우기'); ysResp(fe.b, '끊기'); ysResp(fe.b, '무너뜨리기'); ok(fe.p.ys === 3 && cutN(fe.b) === 2, '같은 라운드 셋: 대응 한도 1 + 전투마다 2번'); }
  { const fe = efight({ ks: ['ctK5'] }); const { b, p, es } = fe; for (const e of es) e.hp = e.hpMax = 1; es[1].intent = { k: 'heavy' }; b.queue = ['p', es[1].id]; b.stepMode = true; p.ys = 0; E.playerAct(b, 'basic', es[1].id); ok(!es[1].alive && cutN(b) === 1 && b.rec.some(r => r.k === 'ys' && r.why === '먼저 치우기'), '실제 먼저 치우기(강타 예고 적을 그 차례 전에 쓰러뜨림)에도 +1 더'); }
  { const fe = fight('assassin', {}); fe.p.ys = 0; ysResp(fe.b, '끊기'); ok(cutN(fe.b) === 0 && fe.p.ys === 1, '다른 직업에는 없음'); }
  ok(/끊기 · 무너뜨리기 · 먼저 치우기/.test(KS.ks_el_cut.d) && KS.ks_el_cut.resp === 1, '설명: 끊기 · 무너뜨리기 · 먼저 치우기 (대응 큰 각인 표시 그대로)');
  { const KP = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'persona', 'ks-pref.json'), 'utf8')); ok(KP.careful.order.includes('ks_el_cut') && KP.expert.order.indexOf('ks_el_cut') < KP.expert.order.indexOf('ks_hammer') && KP.careful.order.indexOf('ks_deep') >= 3 && KP.basic.order[0] === 'ks_sharp', '테스터 큰 각인 선호표(M4): 끊어진 영창이 들어 있고, 신중 깊은 샘 4위 아래, 평타는 날 선 손 1위'); } }
/* M5-3: 결정 3 측정 변형(ASN_SHADOW_VAR) 시험은 옛 그림자 갈래(옛 칸) 배치를 바꾸는 것이라 새 트리에서 지웠다 */
console.log('wm-check: ' + n + '개 통과');
