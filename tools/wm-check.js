'use strict';
/* 0.8.0 5단계 파수꾼 · 수도승 트리 점검 (10월 17일). 실행: node tools/wm-check.js
   docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md의 규칙이 엔진에서 그대로 일하는지 본다.
   1 강화 노드가 모두 적용되고 금지선(무조건 비용 바꾸기 없음, 조건 어휘) · 2 노드 비용(skCost가 노드 ys를 읽음) · 3 파수꾼(방어 보호막 · 받아낸 몫 상한 · 흔들리는 방패 · 쌓인 벽 · 🔄 조건 · 달군 방패 · 산사태) ·
   4 수도승(기의 그릇 · 열린 단전 · 참회의 무게 · 비운 그릇 · 부동의 맹세 · 철산고 · 천지 정지 · 넘치는 기운)
   5 사냥꾼(10월 18일, docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md): 51노드 · 금지선 · [전환] 하나 · 비용 · 시작 스킬 태그(lb) · 조건 link · focus>=n · linkFast · 외길 사냥꾼 전환 ·
     이어 쏘기 숙련 · 끝까지 쫓는 자 · 넘겨받는 추적 · 끝맺는 연계 · 손에 익은 활 · 이어 당기는 활(두 번째 차례) · 기본 공격 버프(바꿔 쏘기 · 덧화살 · 가시 · 하늘 가르기의 기간 · 겹침 · 다시 걸기 · 버림 · 전투 끝) · 결정 7
   6 원소술사(10월 18일, 같은 문서 3절 · 8절 결정 9–12): 51노드 · 고리 · 금지선 · [전환] 하나 · 비용 · 공명 처치 환급(행동 끝 열충격 포함) · 시작 노드 · 패시브 배치 · 고정 피해(불의 학도 행동마다 한 번 · 남는 울림 열충격마다) ·
     끊어진 영창(라운드 한도 밖, 전투마다 2번) · 잿불의 길 · 얼음 심장(대가 포함) · 서리 무게 노드 · 열충격 배수 노드 · 회복 · 스태미나 노드 · 원소 장막 · kw 할인 */
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
for (const c of ['warden', 'monk']) {
  const A = E.atBuild(c); let nu = 0, ns = 0;
  ok(!A.tmp, c + ': 직업 트리(임시 트리 아님)');
  for (const id in A.nodes) { const u = A.nodes[id]; if (u.kind === 'skill') { ns++; assert([2, 3, 4].includes(u.ys), c + ' 비용 ' + id); continue; } if (u.kind !== 'upgrade') continue; nu++;
    const m = u.mod; assert(!(m.set && ('ys' in m.set || 'cd' in m.set || 'cost' in m.set || 'killRecharge' in m.set)), c + ' 무조건 비용 · 환급 바꾸기 금지 ' + id);
    if (m.cond) assert(m.cond.off === 1 && /^(ward>=\d+|ki>=\d+|stance|kw:\w+>=\d+)$/.test(m.cond.when), c + ' 조건 어휘 ' + id);
    const s = E.skOf({ build: c, aup: [id], pn: [] }, u.on); assert(s !== E.SK2[u.on] && s.ups.includes(id), c + ' 실제 스킬 ' + id);
    for (const x of m.fxSet || []) { const e = s.fx.find(y => y.k === x.k && (x.s == null || y.s === x.s)); for (const k in x) if (k !== 'k' && k !== 's') assert.equal(e[k], x[k], c + ' fxSet ' + id + ' ' + k); } }
  ok(c === 'warden' ? ns === 25 && nu === 27 : ns === 24 && nu === 29, c + ': 노드 수(파수꾼 25 + 27, 수도승 24 + 29)');
  const tr = Object.values(A.nodes).filter(x => x.kind === 'upgrade'); const conv = {}; for (const u of tr) if (u.mod.set && ('time' in u.mod.set || 'tgt' in u.mod.set)) conv[u.on] = (conv[u.on] || 0) + 1;
  ok(Object.values(conv).every(v => v <= 1), c + ': 같은 스킬에 빠르기 · 대상을 바꾸는 [전환] 강화는 하나뿐(결정 6)');
}
ok(JSON.stringify(E.SK2.w_flare.fx) === JSON.stringify([{ k: 'wardBurn', mul: 3, max: 8 }, { k: 'brk', n: 3 }, { k: 'bigx', mul: 1.5 }]), '강화는 원래 스킬 데이터를 바꾸지 않음');

// ===== 2) 노드 비용 (결정 1: skCost가 노드 ys를 읽음) =====
{ const p = { build: 'warden', aup: [], pn: [] }; ok(skCost(E.SK2.w_flare) === 3 && skCost(E.skOf(p, 'w_flare')) === 2, '보호막 터뜨리기: 쿨타임 변환 3, 트리 노드 2');
  const ps = { build: 'spellblade', aup: [], pn: [] }; const A = E.atBuild('spellblade'); ok(Object.keys(A.nodes).filter(id => A.nodes[id].kind === 'skill').every(id => skCost(E.skOf(ps, id)) === skCost(E.SK2[id])), '마검사는 노드 비용과 쿨타임 변환이 모두 같음(바뀌는 것 없음)'); }

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
{ const { p, b, es } = fight('warden', { own: ['lg1C', 'lg2L'], act: ['w_raise', 'w_flare', 'w_shove', 'w_stand'], eq: ['w_flare', 'w_shove', 'w_stand'] }); ok(p.pn.includes('n_wd_stack'), '쌓인 벽 노드');
  const nSt = () => b.log.filter(x => /쌓인 벽/.test(x.m || x.t || '')).length; const act = (id, w) => { E.runUntilPlayer(b); p.ward = w; p.ys = 5; p.st = p.stMax; const c0 = nSt(); E.playerAct(b, id, es[0].id); return nSt() - c0; };
  ok(act('w_bash', 20) === 0, '쌓인 벽: 유산 2 공격(방패 치기)에는 보호막을 쓰지 않음(검토 1-1)');
  ok(act('heavy', 20) === 1, '쌓인 벽: 강공격이면 보호막 5를 써서 +12%');
  ok(act('heavy', 14) === 0, '쌓인 벽: 보호막 15 미만이면 쓰지 않음');
  ok(act('w_flare', 20) === 0, '쌓인 벽: 보호막을 태우는 스킬에는 쓰지 않음'); }
{ const { p, b } = fight('warden', { act: ['w_raise', 'w_shove', 'w_kindle'], eq: ['w_kindle'] }); p.ward = 0; p.ys = 3; E.playerAct(b, 'w_kindle'); ok(b.rec.some(x => x.k === 'ys' && x.src === 'refund'), '작열 방벽: 보호막 0일 때 쓰면 유산 +1(결정 4)'); }
{ const { p, b } = fight('warden', { act: ['w_raise', 'w_shove', 'w_kindle'], eq: ['w_kindle'] }); p.ward = 5; p.ys = 3; E.playerAct(b, 'w_kindle'); ok(!b.rec.some(x => x.k === 'ys' && x.src === 'refund'), '작열 방벽: 보호막이 있으면 환급 없음'); }
{ const { p, b, es } = fight('warden', { act: ['f_sweep', 'f_cleave'], eq: ['f_cleave'] }); es[0].hp = 1; p.ys = 3; E.playerAct(b, 'f_cleave'); ok(b.rec.some(x => x.k === 'ys' && x.src === 'refund'), '넓게 베기: 쓰러뜨리면 유산 +1(결정 4)'); }
{ const { p, b } = fight('warden', { act: ['w_raise', 'w_flare', 'wu_heat'], eq: ['w_flare'] }); p.ward = 20; ok(yc(b, 'w_flare') === 1, '달군 방패: 보호막 20 이상이면 2 → 1'); p.ward = 19; ok(yc(b, 'w_flare') === 2, '달군 방패: 19면 2'); }
{ const { p, b, es } = fight('warden', { act: ['s_knock', 's_gap', 's_dig', 's_ruin', 'su_slide'], eq: ['s_ruin'] }); const h0 = es[0].hp, k0 = es[0].brk || 0; p.ys = 5; E.playerAct(b, 's_ruin', es[0].id); ok(es[0].hp === h0 && (es[0].brk || 0) - k0 >= 50 || es[0].s.broken, '산사태: 무너지지 않은 적이면 피해 없이 붕괴 50'); }
{ const { p, b, es } = fight('warden', { act: ['s_knock', 's_gap', 's_dig', 's_ruin', 'su_slide'], eq: ['s_ruin'] }); E.addS(b, es[0], 'broken', 2); const h0 = es[0].hp; p.ys = 5; E.playerAct(b, 's_ruin', es[0].id); ok(es[0].hp < h0, '산사태: 무너진 적에게는 박살 그대로'); }
{ const { p } = fight('warden', { act: ['w_raise', 'wu_wil'], eq: ['w_raise'] }); const s = E.skOf(p, 'w_raise'); ok(s.fx.find(e => e.k === 'ward').wil === 1, '받쳐 든 방패: 보호막 +의지'); }
{ const { p, b } = fight('warden', { ks: ['pwK9'] }); ok(p.pn.includes('ks_wd_drop'), '방패를 내린 자'); p.guard = 1; p.ward = 0; const hp0 = p.hp; enemyHit(b, b.en[0], 10); ok(Math.abs(hp0 - p.hp - 7) < 0.01, '방패를 내린 자: 방어가 30%만 줄임(10 → 7)'); }
{ const { p } = fight('warden', { ks: ['suK9'] }); ok(E.wardMax(p) === Math.round(p.hpMax * 0.4), '영원한 성벽: 보호막 상한 40%'); }

// ===== 4) 수도승 =====
{ const { p, b } = fight('monk', { own: ['lg1C'] }); ok(kiCapOf(p) === 6, '기의 그릇: 기 상한 6'); E.addS(b, p, 'empower', 9); ok(st(p, 'empower') === 6, '기는 6에서 멈춤'); }
{ const { p, b } = fight('monk', { act: ['m_breath', 'm_flow', 'm_barrage', 'm_kifist', 'm_rush', 'm_release', 'mu_open'], eq: ['m_release'] }); E.addS(b, p, 'empower', 5); ok(yc(b, 'm_release') === 3, '열린 단전: 기 5 이상이면 4 → 3'); p.s.empower.stacks = 4; ok(yc(b, 'm_release') === 4, '기 4면 4'); }
{ const { p, b } = fight('monk', { act: ['m_iron', 'm_answer', 'm_shove', 'm_karma', 'mu_karma'], eq: ['m_karma'] }); ok(yc(b, 'm_karma') === 4, '참회의 무게: 자세가 없으면 4');
  p.stance = { dmg: 6 }; ok(yc(b, 'm_karma') === 3, '자세가 있으면 3(검토 2-1: 기를 깎지 않음)'); E.addS(b, p, 'empower', 4); p.ys = 5; const k0 = st(p, 'empower'); E.playerAct(b, 'm_karma');
  const sp = b.rec.filter(x => x.k === 'yspend').pop(); ok(sp && sp.cost === 3 && k0 === 4, '자세는 내 차례 첫 행동에서 풀려도 그 차례 비용은 3, 기비례는 그대로'); }
{ const { p, b, es } = fight('monk', { ks: ['pwK9'] }); p.guard = 1; const k0 = st(p, 'empower'); enemyHit(b, es[0], 5); enemyHit(b, es[1], 5); ok(st(p, 'empower') - k0 === 1, '비운 그릇: 되받기로 얻는 기는 내 차례 사이 한 번(검토 2-2)'); }
{ const { p, b } = fight('monk', { ks: ['svK9'], act: ['m_iron', 'm_retort'], eq: ['m_retort'] }); ok(!okA(b, 'm_retort') && okA(b, 'm_brace'), '부동의 맹세: ⚡ 공격 스킬(되치기)은 못 쓰고 ⚡ 자세는 씀'); p.stance = { dmg: 6 }; const hp0 = p.hp; enemyHit(b, b.en[0], 10); ok(Math.abs(hp0 - p.hp - 8.8) < 0.01, '부동의 맹세: 자세 동안 받는 직접 피해 −12%'); }
{ const { p, b } = fight('monk', { act: ['m_iron', 'mu_ironmtn'], eq: ['m_iron'] }); p.ys = 5; E.playerAct(b, 'm_iron'); ok(p.stance && p.stance.red === 0.25, '철산고: 쇠기둥 자세에 피해 감소 25%'); const hp0 = p.hp; enemyHit(b, b.en[0], 10); ok(Math.abs(hp0 - p.hp - 7.5) < 0.01, '철산고: 10 → 7.5'); }
{ const { p, b, es } = fight('monk', { act: ['m_point', 'm_siphon', 'm_cut', 'm_stillpt', 'mu_world'], eq: ['m_stillpt'] }); E.addS(b, es[0], 'chill', 2); E.addS(b, es[0], 'weak', 1); const k0 = st(p, 'empower'); p.ys = 5; E.playerAct(b, 'm_stillpt', es[0].id); ok(st(p, 'empower') - k0 >= 1, '천지 정지: 둔화 · 약화 둘 다 걸린 적이면 기 +2(▶가 1을 써서 순 +1 이상)'); }
{ const { p, b, es } = fight('monk', { own: ['lg1C', 'lg2L', 'lg3L', 'lg4R', 'lg5R', 'lg6R', 'lg7R'] }); ok(p.pn.includes('n_mk_spill'), '넘치는 기운 노드'); E.addS(b, p, 'empower', 9); p.guard = 1; p.st = 10; enemyHit(b, es[0], 5); ok(p.st > 10, '넘치는 기운: 상한에 막힌 기 → 스태미나'); }
// ===== 5) 사냥꾼 (10월 18일, docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-2 · 2-5 · 2-6 · 2-6a · 8절) =====
{ const A = E.atBuild('hunter'); const N = Object.values(A.nodes); const sk = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.kind === 'upgrade');
  ok(!A.tmp && sk.length === 24 && up.length === 27, '사냥꾼: 직업 트리, 스킬 24 + 강화 27 = 51노드');
  for (const u of up) { const m = u.mod; assert(!(m.set && ('ys' in m.set || 'cd' in m.set || 'cost' in m.set || 'killRecharge' in m.set)), '사냥꾼 무조건 비용 · 환급 바꾸기 금지 ' + u.id);
    if (m.cond) assert(m.cond.off === 1 && /^(link|focus>=\d+)$/.test(m.cond.when), '사냥꾼 조건 어휘 ' + u.id);
    const s = E.skOf({ build: 'hunter', aup: [u.id], pn: [] }, u.on); assert(s !== E.SK2[u.on] && s.ups.includes(u.id), '사냥꾼 실제 스킬 ' + u.id);
    for (const x of m.fxSet || []) { const e = s.fx.find(y => y.k === x.k && (x.s == null || y.s === x.s)); for (const k in x) if (k !== 'k' && k !== 's') assert.equal(e[k], x[k], '사냥꾼 fxSet ' + u.id + ' ' + k); } }
  ok(true, '사냥꾼: 강화 27개가 모두 실제 스킬을 바꾸고, 조건 어휘는 link · focus>=n뿐');
  const conv = {}; for (const u of up) if (u.mod.set && ['time', 'tgt', 'hits'].some(k => k in u.mod.set)) conv[u.on] = (conv[u.on] || 0) + 1;
  const CV = ['hu_throat', 'hu_spray', 'hu_scatter', 'hu_crimson', 'hu_dash', 'hu_wedge']; const cvOn = CV.map(id => A.nodes[id].on); // 원거리 초안 2-6 성격 열의 [전환] 여섯
  ok(Object.values(conv).every(v => v <= 1) && new Set(cvOn).size === CV.length && Object.keys(conv).every(on => cvOn.includes(on)), '사냥꾼: 같은 스킬에 [전환] 강화는 하나뿐(숨통 겨누기 · 난사 · 흩뿌리는 화살 · 붉은 폭우 · 질주 · 얼음 쐐기가 모두 다른 스킬)');
  const c = { 2: 0, 3: 0, 4: 0 }; for (const s of sk) c[s.ys]++; ok(c[2] === 4 && c[3] === 17 && c[4] === 3, '사냥꾼: 트리 비용 2 / 3 / 4 = 4 / 17 / 3칸');
  const p0 = { build: 'hunter', aup: [], pn: [] }; ok(skCost(E.SK2.h_burst) === 4 && skCost(E.skOf(p0, 'h_burst')) === 3 && sk.filter(s => s.id !== 'h_burst').every(s => skCost(E.skOf(p0, s.id)) === skCost(E.SK2[s.id])), '추적 터뜨리기만 쿨타임 변환 4 → 노드 3(결정 4), 나머지는 변환값 그대로');
  ok(['hu_link1', 'hu_link2', 'hu_link3'].map(id => A.nodes[id].on).join() === 'h_burst,h_double,h_hobble', '연계 할인은 갈래마다 1고리 유산 3 스킬 하나(추적 터뜨리기 · 연속 사격 · 발 묶는 화살)');
  ok(E.SK2.h_gap.killRecharge === 1 && !E.SK2.h_gap.fx.some(f => f.k === 'hasten') && !sk.some(s => E.SK2[s.id].fx.some(f => f.k === 'hasten')), '🔄 정리: 빈틈 쏘기는 처치 환급, 트리에 무조건 🔄 없음');
  { const s = E.skOf({ build: 'hunter', aup: ['hu_ankle'], pn: [] }, 'h_leg'); const o = s.fx.find(f => f.k === 'onCutBreak'); ok(o && o.haste === 1 && !o.hasten, '발목 끊기: 끊으면 가속 1만(유산 환급 없음)'); }
  ok(R_('AT_GONE').hunter.length === 6 && R_('AT_GONE').hunter.every(id => E.SK2[id] && !A.nodes[id]), '빠진 스킬 여섯(AT_GONE)'); }
{ const run = newRun('hunter'); ok(run.stats.dex === 8 && run.stats.con === 4 && !run.stats.str, '시작 노드 민첩 8 · 체력 4(결정 3)');
  const P = E.ptBuild('hunter'); ok(P.nodes.pw1C.fx === 'k_hn2' && P.nodes.pw3L.fx === 'n_hn_pull' && P.nodes.pwK9.fx === 'ks_hn_solo' && P.nodes.lgK9.fx === 'ks_hn_chase' && P.nodes.ag1C.fx === 'k_hn3' && P.nodes.lg2L.fx === 'k_hn1', '패시브 배치: 손에 익은 활 · 이어 당기는 활 · 외길 사냥꾼 · 끝까지 쫓는 자 · 가벼운 발 · 놓치지 않는 눈'); }
const linkOn = R_('linkOn'), soloOn = R_('soloOn'), skCondMet = R_('skCondMet'), hnLinkMul = R_('hnLinkMul'), focusCapOf = R_('focusCapOf');
const actOf = (b, id) => E.actionList(b).find(x => x.id === id);
const hfight = o => { const f = fight('hunter', o); const q = f.b.queue; if (q && q[0] === 'p' && q[1] === 'p') q.splice(1, 1); delete f.p.s.haste; return f; }; // 개전 가속(1라운드 두 차례)을 뺀 판: 라운드 셈을 단순하게
const hit = (b, id, e) => { b.stepMode = true; const h = e ? e.hp : 0; E.playerAct(b, id, e ? e.id : undefined); const d = e ? h - e.hp : 0; b.stepMode = false; if (b.waiting) E.runUntilPlayer(b); return d; }; // 내 행동의 피해만(적 차례 · 출혈 전)
const lastHb = b => b.rec.filter(r => r.k === 'hnb').pop() || {};
{ ok(E.SK2.h_aim.lb === '저격' && E.SK2.h_step.lb === '기동' && E.SK2.h_aim.b === '시작', '시작 스킬 태그: 겨눠 쏘기 저격 · 물러서며 쏘기 기동(트리 가운데 자리는 시작 그대로)');
  const { p, b, es } = hfight({}); hit(b, 'h_step', es[1]); ok(p.lastBr === '기동', '물러서며 쏘기가 lastBr을 기동으로');
  ok(linkOn(b, actOf(b, 'h_aim')), '그다음 겨눠 쏘기는 연계'); const dL = hit(b, 'h_aim', es[0]); ok(p.lastBr === '저격', '겨눠 쏘기가 lastBr을 저격으로');
  const f2 = hfight({}); const d1 = hit(f2.b, 'h_aim', f2.es[0]); ok(Math.abs(dL / d1 - 1.3) < 1e-6, '시작 스킬도 연계 피해 +30%');
  hit(b, 'basic', es[0]); ok(p.lastBr === '저격', '기본 공격은 lastBr을 지우지도 바꾸지도 않음(결정 2)'); hit(b, 'guard'); ok(p.lastBr === '저격', '방어도 그대로'); }
{ const { p, b, es } = hfight({ act: ['h_prey', 'h_burst', 'hu_link1'], eq: ['h_burst'] }); p.lastBr = '저격'; ok(yc(b, 'h_burst') === 3, '이어 쏘는 화살: 직전 갈래가 같으면 3'); p.lastBr = '기동'; ok(yc(b, 'h_burst') === 2, '직전 갈래가 다르면(연계) 3 → 2');
  p.lastBr = null; ok(yc(b, 'h_burst') === 3, '직전 갈래가 없으면 3'); p.lastBr = '연사'; p.ys = 5; hit(b, 'h_burst', es[0]); const sp = b.rec.filter(x => x.k === 'yspend').pop(); ok(sp.cost === 2 && b.condUsed.hu_link1 === b.ysR, '연계로 쓰면 유산 2를 내고 이번 라운드 한도를 씀');
  p.lastBr = '기동'; ok(R_('skCostAt')(b, E.skOf(p, 'h_burst')).c === 3, '같은 라운드에 두 번째는 할인 없음(라운드에 한 번)'); }
{ const { p, b, es } = hfight({ act: ['h_prey', 'h_burst', 'h_doom', 'hu_unend'], eq: ['h_doom'] }); p.focus = { id: es[0].id, n: 3 }; ok(yc(b, 'h_doom') === 3, '끝없는 사냥: 대상 추적 3겹이면 4 → 3');
  p.focus.n = 2; ok(yc(b, 'h_doom') === 4, '2겹이면 4'); p.focus = { id: es[1].id, n: 3 }; ok(skCondMet(b, E.skOf(p, 'h_doom'), { when: 'focus>=3' }, es[0]) === false && skCondMet(b, E.skOf(p, 'h_doom'), { when: 'focus>=3' }, es[1]) === true, 'focus>=n은 고른 대상의 추적'); }
{ const { p, b, es } = hfight({}); const s = E.SK2.h_hobble, c = { off: 1, when: 'linkFast' }; p.lastBr = '기동'; ok(!skCondMet(b, s, { when: 'link' }) && !skCondMet(b, s, c), 'linkFast(보완 2): 같은 갈래면 거짓');
  hit(b, 'h_step', es[0]); ok(b.hnFastMob === b.turnIdx && skCondMet(b, s, c) && !skCondMet(b, s, { when: 'link' }), 'linkFast: 이번 차례에 빠른 기동 스킬(물러서며 쏘기)을 먼저 썼으면 참, link는 거짓');
  p.lastBr = '저격'; ok(skCondMet(b, s, c) && skCondMet(b, s, { when: 'link' }), 'linkFast: 연계여도 참'); ok(R_("ATREE_DEF.hunter.ups.find(x => x[0] === 'hu_link3')[8].cond.when") === 'link', '기본 데이터는 link 그대로(HUNT_BRIDGE=1일 때만 linkFast)'); }
{ const { p, b, es } = hfight({ ks: ['pwK9'], act: ['h_prey', 'h_burst', 'hu_link1'], eq: ['h_burst'] }); ok(p.pn.includes('ks_hn_solo'), '외길 사냥꾼 큰 각인'); p.lastBr = '기동';
  ok(!linkOn(b, actOf(b, 'h_aim')) && !soloOn(b, actOf(b, 'h_aim')), '외길: 다른 갈래 이어 쓰기는 연계가 아님(+30% 사라짐)'); ok(yc(b, 'h_burst') === 3, '외길: 연계 할인도 일하지 않음'); p.lastBr = '저격';
  ok(soloOn(b, actOf(b, 'h_aim')) && yc(b, 'h_burst') === 2, '외길: 같은 갈래를 바로 이어 쓰면 ⇉ +20%, 연계 할인 강화는 같은 갈래 이어 쓰기 −1(보완 1)');
  const dS = hit(b, 'h_aim', es[0]); const f2 = hfight({}); ok(Math.abs(dS / hit(f2.b, 'h_aim', f2.es[0]) - 1.2) < 1e-6, '외길: 그 스킬 피해 +20%'); }
{ const { p } = hfight({ own: ['lg5R'] }); ok(Math.abs(hnLinkMul(p) - 0.38) < 1e-9 && Math.abs(hnLinkMul(hfight({}).p) - 0.3) < 1e-9, '이어 쏘기 숙련: 연계 +30% → +38%'); }
{ const { p, b, es } = hfight({ ks: ['lgK9'] }); ok(focusCapOf(p) === 4, '끝까지 쫓는 자: 추적 상한 4'); for (let i = 0; i < 5; i++) hit(b, 'basic', es[0]); ok(p.focus.n === 4, '같은 적을 다섯 번 치면 4겹');
  const f2 = hfight({}); for (let i = 0; i < 5; i++) hit(f2.b, 'basic', f2.es[0]); ok(f2.p.focus.n === 3, '큰 각인이 없으면 3겹'); }
{ const { p, b, es } = hfight({ own: ['lg3R'] }); p.focus = { id: es[0].id, n: 3 }; es[0].hp = 1; hit(b, 'basic', es[0]); ok(!es[0].alive && p.hnPass === 1, '넘겨받는 추적: 3겹 적을 쓰러뜨리면 넘김 표시');
  hit(b, 'basic', es[1]); ok(p.focus.id === es[1].id && p.focus.n === 2 && !p.hnPass, '다음에 친 다른 적은 1겹에서 시작(맞은 뒤 2겹)'); }
{ const { p, b, es } = hfight({ own: ['lg7R'] }); const IF = R_('IFX_NODE'); b.actN = 7; b.hnLinkA = 7; ok(IF.n_hn_finale.hitP(b, p, es[0], {}, { skill: 1, id: 'h_doom' }) === 0.12 && IF.n_hn_finale.hitP(b, p, es[0], {}, { skill: 1, id: 'h_burst' }) === 0, '끝맺는 연계: 연계로 쓴 유산 4 스킬만 +12%'); b.hnLinkA = 6; ok(IF.n_hn_finale.hitP(b, p, es[0], {}, { skill: 1, id: 'h_doom' }) === 0, '연계가 아니면 없음'); }
const basicD = (o, fn) => { const f = hfight(o); if (fn) fn(f); return { d: hit(f.b, 'basic', f.es[1]), f }; };
const d0 = basicD().d;
{ const k = basicD({ own: ['pw1C'] }).d; ok(Math.abs(k / d0 - 1.12) < 1e-6, '손에 익은 활: 기본 공격 +12%(10% → 12%)');
  const x = basicD({ own: ['pw3L'] }, f => { f.b.extraTurn = 1; }); ok(Math.abs(x.d / d0 - 1.15) < 1e-6, '이어 당기는 활: 가속의 두 번째 차례 기본 공격 +15%');
  { const f = hfight({ own: ['pw3L'] }); f.b.extraTurn = 1; f.p.st = 10; f.b.stepMode = true; E.playerAct(f.b, 'basic', f.es[1].id); ok(f.p.st === 15, '이어 당기는 활: 맞히면 스태미나 +5'); }
  const y = basicD({ own: ['pw3L'] }); ok(Math.abs(y.d / d0 - 1) < 1e-6, '이어 당기는 활: 보통 차례에는 없음');
  const xd = x.f.b.rec.filter(r => r.k === 'dealt' && r.a === '기본 공격'), yd = y.f.b.rec.filter(r => r.k === 'dealt' && r.a === '기본 공격'); ok(xd.length && xd[0].x2 === 1 && yd.length && !yd[0].x2, '판 기록: 두 번째 차례에 준 피해 표시(x2)'); }
{ const { p, b, es } = hfight({ act: ['h_switch'], eq: ['h_switch'] }); const R0 = b.ysR || 0; hit(b, 'h_switch', es[0]); ok(p.bbuf.swap && p.bbuf.swap.until === b.ysR && b.ysR === R0 + 1 && p.hnLastT === es[0].id, '전환 사격: 바꿔 쏘기를 이번 라운드 끝까지 켜고, 직전에 친 적 = 그 대상');
  const bl0 = st(es[1], 'bleed'); b.stepMode = true; const h0 = es[1].hp; E.playerAct(b, 'basic', es[1].id); const dB = h0 - es[1].hp; const blG = st(es[1], 'bleed') - bl0; b.stepMode = false; E.runUntilPlayer(b);
  ok(Math.abs(dB / d0 - 1.5) < 1e-6 && blG === 2, '바꿔 쏘기: 다른 적을 친 기본 공격 ×1.5 · 출혈 2'); ok(b.rec.some(r => r.k === 'bbuf' && r.s === 'swap' && r.w === 'use'), '기록: 버프를 씀');
  const n0 = b.rec.filter(r => r.k === 'hnb').length; hit(b, 'basic', es[0]); ok(!p.bbuf && b.rec.filter(r => r.k === 'hnb').length === n0, '다음 라운드에는 꺼짐(이번 라운드 끝까지)'); }
{ const { p, b, es } = hfight({ act: ['h_switch'], eq: ['h_switch'] }); hit(b, 'h_switch', es[0]); b.stepMode = true; E.playerAct(b, 'basic', es[0].id); ok(lastHb(b).m === 1 && st(es[0], 'bleed') === 0, '바꿔 쏘기: 직전에 친 적과 같은 적이면 배수 · 출혈 없음'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'hu_hound'], eq: ['h_switch'] }); hit(b, 'h_switch', es[0]); ok(p.bbuf.swap.until === b.ysR + 1, '물어뜯는 화살: 다음 라운드 끝까지'); hit(b, 'guard'); hit(b, 'basic', es[1]);
  ok(p.bbuf && p.bbuf.swap && lastHb(b).m === 1.5, '다음 라운드 기본 공격도 받음'); hit(b, 'guard'); ok(!p.bbuf, '그다음 라운드에는 꺼짐'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'h_double'], eq: ['h_double'] }); const R0 = (b.ysR || 0) + 1; hit(b, 'h_double', es[0]); ok(p.bbuf.extra.until === R0 + 1, '연속 사격: 덧화살이 다음 라운드가 끝날 때까지(결정 5)');
  const d = hit(b, 'basic', es[0]); const hb = lastHb(b); ok(hb.m === 1 && Math.abs(d / (d0 * 1.05) - 1.5) < 1e-6 && st(es[0], 'bleed') === 0, '덧화살: 같은 적에게 그 기본 공격의 50%를 더함(모든 배수 뒤, 출혈 없음)');
  ok(p.focus.id === es[0].id && p.focus.n === 2, '덧화살은 한 공격의 일부라 추적은 한 겹만(연속 사격 1 + 기본 공격 1)'); hit(b, 'guard'); ok(!p.bbuf, '다다음 라운드에는 꺼짐'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'h_double', 'hu_turn'], eq: ['h_switch', 'h_double'] }); hit(b, 'h_switch', es[0]); hit(b, 'h_double', es[0]); hit(b, 'basic', es[1]);
  const hb = lastHb(b); ok(Math.abs(hb.m - 1.3) < 1e-9 && hb.x > 0, '선회 사격: 덧화살이 켜진 동안 다른 적이면 ×1.3(바꿔 쏘기는 이번 라운드에 끝나 곱하지 않음)'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'h_double', 'hu_turn'], eq: ['h_switch', 'h_double'] }); hit(b, 'h_double', es[0]); hit(b, 'h_switch', es[0]); hit(b, 'basic', es[1]);
  const hb = lastHb(b); ok(Math.abs(hb.m - 1.5 * 1.3) < 1e-9 && hb.x > 0, '서로 다른 버프는 곱한다: 바꿔 쏘기 ×1.5 × 선회 ×1.3, 덧화살 +50%'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'h_rain', 'h_barb'], eq: ['h_barb'] }); hit(b, 'h_barb', es[0]); ok(p.bbuf.barb.until === b.ysR + 1, '가시 화살: 2라운드(이번 + 다음)');
  b.stepMode = true; const bl = st(es[1], 'bleed'); E.playerAct(b, 'basic', es[1].id); const g = st(es[1], 'bleed') - bl; b.stepMode = false; E.runUntilPlayer(b); ok(g === 2 && lastHb(b).m === 1, '가시: 기본 공격 출혈 +2(배수 없음)'); hit(b, 'guard'); ok(!p.bbuf, '3라운드째에는 꺼짐'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'h_rain', 'h_barb', 'hu_rend'], eq: ['h_barb'] }); hit(b, 'h_barb', es[0]); ok(p.bbuf.barb.until === b.ysR + 2 && p.bbuf.barb.bleed === 3, '찢는 화살: 출혈 +3, 3라운드'); }
{ const { p, b, es } = hfight({ act: ['h_switch'], eq: ['h_switch'] }); hit(b, 'h_switch', es[0]); p.ys = 5; b.bonusUsed = 0; hit(b, 'h_switch', es[1]); ok(p.bbuf.swap.mul === 1.5 && b.rec.filter(r => r.k === 'bbuf' && r.w === 'on').length === 2 && b.rec.some(r => r.k === 'bbuf' && r.w === 're'), '같은 버프를 다시 걸면 기간만 새로(겹쳐 쌓지 않음, ×1.5 그대로)'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'hu_hound'], eq: ['h_switch'] }); hit(b, 'h_switch', es[0]); hit(b, 'guard'); p.st = p.stMax; hit(b, 'heavy', es[1]); ok(!b.rec.some(r => r.k === 'hnb') && p.bbuf.swap && !p.bbuf.swap.used, '강공격은 버프를 받지 않음(기본 공격만)');
  hit(b, 'guard'); ok(!p.bbuf && b.rec.some(r => r.k === 'bbuf' && r.s === 'swap' && r.w === 'waste'), '한 번도 못 쓰고 끝나면 버림(waste)으로 기록'); }
{ const { p, b, es } = hfight({ act: ['h_switch', 'h_rain', 'h_deluge', 'hu_sky'], eq: ['h_deluge'] }); p.ys = 5; b.stepMode = true; E.playerAct(b, 'h_deluge'); ok(p.bbuf.sky && p.bbuf.sky.mul === 1.3 && p.bbuf.sky.until === b.ysR, '하늘 가르기: 쓴 뒤 이번 라운드 기본 공격 ×1.3');
  ok(E.skOf(p, 'h_deluge').fx.some(f => f.k === 'hastex' && f.mul === 1.6), '하늘 가르기: 가속 라운드 ×1.6'); E.endBattleCarry(p); ok(!p.bbuf, '전투가 끝나면 버프는 모두 사라짐(규칙 6)'); }
{ const { p, b, es } = hfight({ act: ['h_switch'], eq: ['h_switch'] }); hit(b, 'h_switch', es[0]); G.sel = es[1].id; G.b = b; const t = R_('skillHint')(b, actOf(b, 'basic')); ok(/⇄×1\.5/.test(t) && /출혈\+2/.test(t), '기본 공격 버튼 아랫줄에 켜진 버프를 보임: ' + t); G.sel = es[0].id; const t2 = R_('skillHint')(b, actOf(b, 'basic')); ok(/⇄ 다른 적/.test(t2), '직전에 친 적을 고르면 "⇄ 다른 적": ' + t2); G.sel = null; G.b = null; }
{ const { p, b, es } = hfight({ act: ['h_switch'], eq: ['h_switch'] }); hit(b, 'h_switch', es[0]); hit(b, 'guard'); G.b = b; G.sel = es[1].id; ok(p.bbuf && R_('skillHint')(b, actOf(b, 'basic')) === '', '새 차례 첫 행동 전에는 이번 라운드로 끝난 버프를 버튼에 보이지 않음'); G.sel = null; G.b = null; }
{ const s = E.SK2; ok(s.h_switch.fx.find(f => f.k === 'dmg').n === 4 && s.h_double.fx.find(f => f.k === 'dmg').n === 4 && s.h_barb.fx.find(f => f.k === 'dmg').n === 8, '결정 7: 시동 스킬 자체 피해 8 → 4 · 7 → 4 · 12 → 8, 버프 수치는 그대로');
  const sc = id => { const r = E.skScore(s[id]); return r.V / r.B - 1; }; ok(Math.abs(sc('h_switch')) <= 0.08 && Math.abs(sc('h_barb')) <= 0.08 && sc('h_double') > -0.1 && sc('h_double') < 0, '결정 7: 버프 값을 넣은 줄 예산 전환 사격 · 가시 화살 ±8% 안, 연속 사격 −9%(정수 피해로 가장 가까움)'); }
{ const sk = R_('skBody')(E.SK2.h_double); ok(/덧화살/.test(sk) && /다음 라운드가 끝날 때까지/.test(sk), '설명 문장: 연속 사격'); }
// ===== 6) 원소술사 (10월 18일, docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 3-2 · 3-3 · 3-5 · 3-6 · 8절 결정 9–12) =====
{ const A = E.atBuild('elementalist'); const N = Object.values(A.nodes); const sk = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.kind === 'upgrade');
  ok(!A.tmp && sk.length === 24 && up.length === 27, '원소술사: 직업 트리, 스킬 24 + 강화 27 = 51노드');
  const rg = { 1: 0, 2: 0, 3: 0 }; for (const x of sk.concat(up)) rg[x.ring]++; ok(rg[1] === 12 && rg[2] === 25 && rg[3] === 14, '원소술사: 1고리 12 · 2고리 25 · 3고리 14');
  for (const u of up) { const m = u.mod; assert(!(m.set && ('ys' in m.set || 'cd' in m.set || 'cost' in m.set || 'killRecharge' in m.set)), '원소술사 무조건 비용 · 환급 바꾸기 금지 ' + u.id);
    if (m.cond) assert(m.cond.off === 1 && /^kw:\w+>=\d+$/.test(m.cond.when), '원소술사 조건 어휘 ' + u.id);
    const s = E.skOf({ build: 'elementalist', aup: [u.id], pn: [] }, u.on); assert(s !== E.SK2[u.on] && s.ups.includes(u.id), '원소술사 실제 스킬 ' + u.id);
    for (const x of m.fxSet || []) { const e = s.fx.find(y => y.k === x.k && (x.s == null || y.s === x.s)); for (const k in x) if (k !== 'k' && k !== 's') assert.equal(e[k], x[k], '원소술사 fxSet ' + u.id + ' ' + k); } }
  ok(true, '원소술사: 강화 27개가 모두 실제 스킬을 바꾸고, 조건 어휘는 kw:상태>=n뿐');
  const CV = ['eu_hell', 'eu_tundra', 'eu_avalanche', 'eu_polar', 'eu_steam', 'eu_chain', 'eu_back']; const cvOn = CV.map(id => A.nodes[id].on); // 3-6 성격 열의 [전환] 일곱
  const conv = {}; for (const u of up) if (u.mod.set && ['time', 'tgt'].some(k => k in u.mod.set)) conv[u.on] = (conv[u.on] || 0) + 1;
  ok(new Set(cvOn).size === CV.length && Object.keys(conv).every(on => cvOn.includes(on)) && Object.values(conv).every(v => v <= 1), '원소술사: 같은 스킬에 [전환] 강화는 하나뿐(겁화 · 영구 동토 · 눈사태 · 극성 뒤집기 · 증기 폭발 · 연쇄 충격 · 역화가 모두 다른 스킬)');
  const c = { 2: 0, 3: 0, 4: 0 }; for (const s of sk) c[s.ys]++; ok(c[2] === 9 && c[3] === 12 && c[4] === 3, '원소술사: 트리 비용 2 / 3 / 4 = 9 / 12 / 3칸');
  const p0 = { build: 'elementalist', aup: [], pn: [] }; ok(sk.every(s => skCost(E.skOf(p0, s.id)) === skCost(E.SK2[s.id])), '원소술사: 비용은 모두 쿨타임 변환값 그대로(다른 칸 0)');
  ok(['e_kindle', 'e_sparks', 'e_burnout', 'e_bind', 'e_crack', 'e_bite', 'e_weave', 'e_catalyst', 'e_firewave'].map(id => skCost(E.skOf(p0, id))).join() === '2,3,3,2,2,3,2,3,3', '1고리 비용: 불꽃 2 · 3 · 3, 서리 2 · 2 · 3, 공명 2 · 3 · 3');
  ok(E.SK2.e_resonate.killRecharge === 1 && E.SK2.e_resonate.krShock === 1 && !E.SK2.e_resonate.fx.some(f => f.k === 'hasten') && !sk.some(s => E.SK2[s.id].fx.some(f => f.k === 'hasten')), '🔄 정리: 공명은 처치 환급(행동 끝 열충격 포함), 트리에 무조건 🔄 없음(불길 증폭 · 빙벽 화살은 뺌)');
  ok(['e_sunfall', 'e_coffin', 'e_overload'].every(id => A.nodes[id].ys === 4 && A.nodes[id].ring === 3) && !A.nodes.e_critical && A.nodes.eu_chain.src.includes('e_critical'), '결정타 셋(태양 낙하 · 얼음 관 · 과부하 ×2), 임계는 연쇄 충격의 출처로만(결정 12)');
  ok(R_('AT_GONE').elementalist.length === 9 && R_('AT_GONE').elementalist.every(id => E.SK2[id] && !A.nodes[id]), '빠진 스킬 아홉(AT_GONE)');
  ok(/행동 끝 열충격 포함/.test(R_('skBody')(E.SK2.e_resonate)) && /영창을 끊으면 나에게 보호 2/.test(R_('skBody')(E.skOf({ build: 'elementalist', aup: ['eu_veil'], pn: [] }, 'e_disrupt'))), '설명 문장: 공명 처치 환급 · 원소 장막'); }
{ const run = newRun('elementalist'); const S = run.stats; ok(S.int === 9 && S.con === 3 && S.wil === 2 && (S.str || 0) + (S.dex || 0) === 0, '시작 노드 지능 9 · 체력 3 · 의지 2(14, 결정 9)');
  E.ptBuy(run, 'pw1C'); E.ptBuy(run, 'pw2L'); ok(run.stats.int === 11, '화력 작은 노드는 지능 +2(C1은 번지는 열)');
  const P = E.ptBuild('elementalist'), K = R_('KS_LIST'); ok(!P.tmp && P.nodes.pw1C.fx === 'k_el1' && P.nodes.ct1C.fx === 'k_el2' && P.nodes.lg2L.fx === 'k_el3' && P.nodes.lg3R.fx === 'n_el_echo' && P.nodes.pw3L.fx === 'n_el_student' && P.nodes.ct3L.fx === 'n_el_chanthand', '패시브 배치: 번지는 열 · 굳는 서리 · 남는 울림 · 이어지는 울림 · 불의 학도 · 영창 끊는 손');
  ok(P.nodes.ctK5.fx === 'ks_el_cut' && P.nodes.pwK9.fx === 'ks_el_ember' && P.nodes.svK9.fx === 'ks_el_heart' && P.nodes.ctK5.ring === 2, '직업 큰 각인 셋: 끊어진 영창(제어 K5, 2고리) · 잿불의 길 · 얼음 심장(결정 11)');
  const ks = Object.values(P.nodes).filter(n => n.kind === 'keystone'); ok(ks.filter(n => K[n.fx].resp).length === 2 && ks.filter(n => K[n.fx].pay).length === 5 && !ks.some(n => n.fx === 'ks_heavy' || n.fx === 'ks_breaker'), '대응 큰 각인 둘(흘림새 + 끊어진 영창), 대가 다섯, 무거운 갑주 · 무너뜨리는 자 없음');
  ok(P.nodes.pw7L.pool === 'common' && P.nodes.pw7R.pool === 'common', '화력 3고리는 공용 둘(인플레이션 막기)');
  ok(/열충격 피해 \+3/.test(P.nodes.lg2L.d) && /스태미나가 6/.test(P.nodes.lg3R.d), '남는 울림은 효과를 바꾸고, 옛 효과(스태미나 +6)는 이어지는 울림으로'); }
const IFE = R_('IFX_NODE'), elGuardOf = R_('elGuardOf');
const efight = o => fight('elementalist', o);
const eHit = (o, id, prep) => { const f = efight(o); if (prep) prep(f); f.p.ys = 5; const h = f.es.map(e => e.hp); f.b.stepMode = true; E.playerAct(f.b, id, f.es[0].id); return { d: f.es.map((e, i) => h[i] - e.hp), f }; };
const lastShock = b => b.rec.filter(r => r.k === 'shock').pop();
const setEl = (b, e, I, C) => { if (I) E.addS(b, e, 'ignite', I); if (C) E.addS(b, e, 'chill', C); };
// 고정 피해(flatAdd): 배율을 모두 곱한 뒤 더한다
{ const A0 = { act: ['e_kindle', 'e_sparks', 'e_weave', 'e_firewave'], eq: ['e_kindle', 'e_sparks', 'e_firewave'] }, A1 = Object.assign({ own: ['pw3L'] }, A0);
  const d = (o, id, prep) => eHit(o, id, prep).d; const sum = a => a.reduce((x, y) => x + y, 0);
  const em0 = d(A0, 'e_ember')[0], em1 = d(A1, 'e_ember')[0]; ok(Math.abs(em1 - em0 - 3) < 1e-6, '불의 학도: 불씨 화살 +3(' + em0.toFixed(1) + ' → ' + em1.toFixed(1) + ')');
  ok(Math.abs(d(A1, 'e_sparks')[0] - d(A0, 'e_sparks')[0] - 3) < 1e-6, '불의 학도: 3타 스킬도 첫 타격에만 +3(행동마다 한 번)');
  ok(Math.abs(sum(d(A1, 'e_firewave')) - sum(d(A0, 'e_firewave')) - 3) < 1e-6, '불의 학도: 모두 치는 스킬도 첫 대상 하나에만 +3');
  const vu = f => E.addS(f.b, f.es[0], 'vuln', 2); ok(Math.abs(d(A1, 'e_ember', vu)[0] - d(A0, 'e_ember', vu)[0] - 3) < 1e-6, '불의 학도: 취약(×1.25)을 곱한 뒤 더한다(+3 그대로)');
  ok(Math.abs(d(A1, 'basic')[0] - d(A0, 'basic')[0]) < 1e-6, '불의 학도: 기본 공격에는 없음(스킬만)');
  { const two = o => { const f = efight(o); f.p.ys = 5; f.b.stepMode = true; const h0 = f.es[0].hp; E.playerAct(f.b, 'e_kindle', f.es[0].id); const h1 = f.es[0].hp; E.playerAct(f.b, 'e_sparks', f.es[0].id); return [h0 - h1, h1 - f.es[0].hp]; };
    const x = two(A1), y = two(A0); ok(Math.abs(x[0] - y[0] - 3) < 1e-6 && Math.abs(x[1] - y[1] - 3) < 1e-6, '불의 학도: ⚡ 행동과 ▶ 행동은 행동마다 따로 +3'); } }
{ const shk = (o, I, C, prep) => { const f = efight(o); setEl(f.b, f.es[0], I, C); if (prep) prep(f); const h = f.es[0].hp; f.b.stepMode = true; E.playerAct(f.b, 'guard'); return { d: h - f.es[0].hp, f }; };
  const a = shk({}, 3, 2), b2 = shk({ own: ['lg2L'] }, 3, 2); ok(lastShock(a.f.b) && Math.abs(b2.d - a.d - 3) < 1e-6, '남는 울림: 열충격 피해 +3(' + a.d.toFixed(1) + ' → ' + b2.d.toFixed(1) + ', 내 방어 행동 끝에도)');
  const c2 = shk({ own: ['lg2L'] }, 10, 3), c0 = shk({}, 10, 3); ok(Math.abs(c2.d - c0.d - 3) < 1e-6 && c0.d > a.d * 2, '남는 울림: T가 커도 +3 그대로(고정 피해는 묽어진다)');
  const arcF = o => { const f = efight(Object.assign({ act: ['e_weave', 'e_firewave', 'e_arc'], eq: ['e_arc'] }, o)); setEl(f.b, f.es[0], 3, 0); f.p.ys = 5; const h = f.es.map(e => e.hp); f.b.stepMode = true; E.playerAct(f.b, 'e_arc', f.es[0].id); return f.es.map((e, i) => h[i] - e.hp); };
  const r0 = arcF({}), r3 = arcF({ own: ['lg2L'] }); ok(r0[1] > 0 && Math.abs(r3[1] - r0[1]) < 1e-6 && Math.abs(r3[0] - r0[0] - 3) < 1e-6, '남는 울림: 번진 열충격에는 없음(열충격마다 한 번)');
  const sp = arcF({ own: ['lg5R'] }); ok(Math.abs(sp[1] / r0[1] - 1.15) < 1e-6, '번지는 울림: 번진 열충격 ×1.15');
  { const f = efight({ own: ['lg5R'], act: ['e_weave', 'e_firewave', 'e_arc'], eq: ['e_arc'] }); ok(IFE.n_el_spread.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e_arc' }) === 0.15 && IFE.n_el_spread.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e_ember' }) === 0, '번지는 울림: 번짐 칸(튀는 충격)의 직접 피해 +15%, 다른 칸은 없음'); }
  { const f = efight({ own: ['lg2L'] }); setEl(f.b, f.es[0], 3, 2); const v = E.elemPreview(f.b, E.SK2.e_touch, f.es[0]), g = efight({}); setEl(g.b, g.es[0], 3, 2); const w = E.elemPreview(g.b, E.SK2.e_touch, g.es[0]); ok(Math.abs(v.d - w.d - 3) < 1e-6, '미리 보기(버튼 · 테스터)도 남는 울림 +3을 셈'); }
  const brk = f => E.addS(f.b, f.es[0], 'broken', 2);
  const k0 = shk({}, 3, 2, brk), k1 = shk({ own: ['ct5R'] }, 3, 2, brk), k2 = shk({ own: ['ct5R'] }, 3, 2); ok(Math.abs(k1.d / k0.d - 1.2) < 1e-6 && Math.abs(k2.d - a.d) < 1e-6, '깨진 얼음: 무너진 적에게만 열충격 ×1.2');
  ok(Math.abs(shk({ ks: ['pwK9'] }, 3, 2).d / a.d - 0.7) < 1e-6, '잿불의 길의 대가: 열충격 피해 −30%');
  { const st0 = shk({}, 3, 2).f.p.st, st1 = shk({ own: ['lg3R'] }, 3, 2).f.p.st; ok(st1 - st0 === 6, '이어지는 울림: 열충격이 일어나면 스태미나 +6'); }
  { const f = efight({ own: ['su3L'] }); setEl(f.b, f.es[0], 3, 2); f.p.hp = f.p.hpMax * 0.5; const h = f.p.hp; f.b.stepMode = true; E.playerAct(f.b, 'guard'); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.01) < 1e-6, '식은 숨: 열충격이 일어나면 최대 생명력 1% 회복');
    for (let i = 0; i < 6; i++) IFE.n_el_coolbreath.onShock(f.b, f.p); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.05) < 1e-6, '식은 숨: 전투마다 5%까지'); } }
// 불태우기 계열: 잿불의 길(+1 더) · 거센 불길(5 이상 +10%)
{ const bo = (o, I) => { const f = efight({ own: o.own, ks: o.ks, act: ['e_kindle', 'e_burnout'].concat(o.act || []), eq: ['e_burnout'] }); setEl(f.b, f.es[0], I, 0); f.p.ys = 5; const h = f.es[0].hp; f.b.stepMode = true; E.playerAct(f.b, 'e_burnout', f.es[0].id); return h - f.es[0].hp; };
  ok(Math.abs(bo({ ks: ['pwK9'] }, 5) - bo({ act: ['eu_burn'] }, 5)) < 1e-6 && bo({ ks: ['pwK9'] }, 5) > bo({}, 5), '잿불의 길: 태운 화상 1마다 +1 더(+3 → +4는 타오른 만큼과 같은 값)');
  ok(Math.abs(bo({ own: ['pw5R'] }, 5) / bo({}, 5) - 1.1) < 1e-6 && Math.abs(bo({ own: ['pw5R'] }, 4) / bo({}, 4) - 1) < 1e-6, '거센 불길: 화상 5 이상을 지우면 그 공격 +10%, 4면 없음'); }
// 서리 무게 · 얼음 심장 · 서리 껍질
{ const g = o => { const f = efight(o); E.addS(f.b, f.es[0], 'chill', 2); const h = f.p.hp; enemyHit(f.b, f.es[0], 10); const n = h - f.p.hp; const h2 = f.p.hp; enemyHit(f.b, f.es[0], 10, { charged: 1 }); return [n, h2 - f.p.hp, f]; };
  const [n0, c0] = g({}), [n1] = g({ own: ['sv5R'] }), [n2, c2, f2] = g({ ks: ['svK9'] }), [n3, c3] = g({ own: ['sv3L'] });
  ok(Math.abs(n0 - 7) < 0.01 && Math.abs(c0 - 10) < 0.01, '서리 무게: 둔화된 적의 평소 공격 10 → 7, 강타는 10');
  ok(Math.abs(n1 - 6.5) < 0.01 && Math.abs(elGuardOf(efight({ own: ['sv5R'] }).p) - 0.35) < 1e-9, '무뎌진 칼날: −30% → −35%');
  ok(Math.abs(n2 - 5.5) < 0.01 && Math.abs(c2 - 10) < 0.01, '얼음 심장: −45%(평소 공격만, 강타는 그대로)');
  ok(Math.abs(n3 - 6.65) < 0.01 && Math.abs(c3 - 9.5) < 0.01, '서리 껍질: 둔화된 적에게서 받는 직접 피해 −5%(강타에도)');
  { const b = f2.b, p = f2.p, e = f2.es[1]; b.stepMode = true; p.ys = 5; E.playerAct(b, 'e_ember', e.id); ok(st(e, 'ignite') === 2, '얼음 심장의 대가: 불씨 화살 화상 3 → 2'); E.addS(b, f2.es[0], 'ignite', 1); ok(st(f2.es[0], 'ignite') === 1, '거는 화상 1은 1(최소 1)');
    ok(E.elemPreview(b, E.SK2.e_kindle, f2.es[0]).I === 4, '미리 보기도 화상 −1(타격이 화상 1을 쓰고 불붙이기 5 → 4)'); }
  { const f = efight({}); f.b.stepMode = true; f.p.ys = 5; E.playerAct(f.b, 'e_ember', f.es[1].id); ok(st(f.es[1], 'ignite') === 3, '얼음 심장이 없으면 화상 3 그대로'); } }
// 끊어진 영창: 영창을 끊거나 열충격으로 무너뜨리면 대응 +1 더(라운드 한도 밖, 전투마다 2번)
{ const cutN = b => b.rec.filter(r => r.k === 'ys' && r.why === '끊어진 영창').length;
  const chantBrk = (b, e) => { e.intent = { k: 'chanting' }; b.cur = { id: 'basic' }; E.addBreak(b, e, 9999); b.cur = null; };
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; p.ys = 0; chantBrk(b, es[0]); ok(p.ys === 2 && cutN(b) === 1, '끊어진 영창: 영창을 끊으면 대응 +1(끊기)과 +1 더');
    chantBrk(b, es[1]); ok(p.ys === 3 && cutN(b) === 2, '같은 라운드 두 번째 끊기: 대응 한도에 막혀도 +1 더(라운드 한도 밖)');
    chantBrk(b, es[0]); ok(p.ys === 3 && cutN(b) === 2, '전투마다 2번까지(세 번째는 없음)'); }
  { const f = efight({}); f.p.ys = 0; chantBrk(f.b, f.es[0]); ok(f.p.ys === 1 && cutN(f.b) === 0, '큰 각인이 없으면 대응 +1만'); }
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; p.ys = 0; es[0].intent = { k: 'attack' }; b.cur = { id: 'basic' }; E.addBreak(b, es[0], 9999); b.cur = null; ok(p.ys === 1 && cutN(b) === 0, '영창이 아닌 적을 붕괴로 무너뜨리면 +1 더 없음'); }
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; p.ys = 0; es[0].intent = { k: 'attack' }; setEl(b, es[0], 3, 2); es[0].brk = es[0].brkMax - 1; b.stepMode = true; E.playerAct(b, 'guard'); ok(es[0].s.broken && p.ys === 2 && cutN(b) === 1, '열충격으로 무너뜨리면 대응 +1(무너뜨리기)과 +1 더'); }
  { const f = efight({ ks: ['ctK5'] }); const { b, p, es } = f; es[0].chant = { taken: 0, need: 1 }; es[0].intent = { k: 'chanting' }; b.stepMode = true; p.ys = 0; E.playerAct(b, 'basic', es[0].id); ok(!es[0].chant && cutN(b) === 1, '쌓인 상처로 영창이 끊겨도 +1 더'); }
  { const f = efight({ own: ['ag5R'] }); f.p.st = 10; const st0 = f.p.st; f.es[0].intent = { k: 'chanting' }; f.b.cur = { id: 'basic' }; E.addBreak(f.b, f.es[0], 9999); f.b.cur = null; ok(f.p.st - st0 === 10, '흩어진 주의: 영창을 끊으면 스태미나 +10');
    f.es[1].intent = { k: 'attack' }; const s1 = f.p.st; f.b.cur = { id: 'basic' }; E.addBreak(f.b, f.es[1], 9999); f.b.cur = null; ok(f.p.st === s1, '영창이 아닌 무너뜨리기에는 없음'); }
  { const vf = intent => { const f = efight({ act: ['e_weave', 'e_firewave', 'e_disrupt', 'eu_veil'], eq: ['e_disrupt'] }); f.es[0].intent = { k: intent }; f.es[0].brk = f.es[0].brkMax - 1; f.p.ys = 5; f.b.stepMode = true; E.playerAct(f.b, 'e_disrupt', f.es[0].id); return st(f.p, 'protect'); };
    ok(vf('chanting') === 2 && vf('attack') === 0, '원소 장막: 원소 교란으로 영창을 끊으면 나에게 보호 2, 끊지 않으면 없음'); }
  { const f = efight({ own: ['ct3L'] }); f.es[0].intent = { k: 'chanting' }; ok(IFE.n_el_chanthand.brk(f.b, f.p, f.es[0]) === 10, '영창 끊는 손: 영창 중인 적에게 붕괴 +10'); f.es[0].intent = { k: 'heavy' }; ok(IFE.n_el_chanthand.brk(f.b, f.p, f.es[0]) === 0, '강타 예고에는 없음(끊기 칸은 영창에만, 강타 약점 유지)'); } }
// 공명: 이 행동으로 쓰러뜨리면(행동 끝 열충격 포함) 유산 +1
{ const R = { act: ['e_weave', 'e_catalyst', 'e_resonate'], eq: ['e_resonate'] }; const refN = b => b.rec.filter(r => r.k === 'ys' && r.src === 'refund').length;
  const rs = (hp, I, id) => { const f = efight(R); if (I) setEl(f.b, f.es[0], I, 0); if (hp) f.es[0].hp = hp; f.p.ys = 3; f.b.stepMode = true; E.playerAct(f.b, id || 'e_resonate', f.es[0].id); return f; };
  const a = rs(0, 6); const dHit = a.b.rec.filter(r => r.k === 'dealt' && r.a === '공명').reduce((m, r) => m + r.d, 0), sh = lastShock(a.b);
  ok(sh && sh.dmg > 0 && refN(a.b) === 0, '공명: 엮기로 열충격이 나도 쓰러뜨리지 못하면 환급 없음(🔄 열충격 → 처치)');
  ok(refN(rs(1, 0).b) === 1, '공명: 타격으로 쓰러뜨리면 유산 +1');
  const k = rs(dHit + sh.dmg / 2, 6); ok(!k.es[0].alive && lastShock(k.b).kill === 1 && refN(k.b) === 1, '공명: 행동 끝 열충격으로 쓰러뜨려도 유산 +1');
  ok(refN(rs(dHit + sh.dmg / 2, 6, 'e_weave').b) === 0, '다른 엮기 칸(원소 엮기)은 열충격으로 쓰러뜨려도 환급 없음'); }
// 앞선 주문 · 가벼운 손 · 고른 원소 · 녹는 서리
{ const f = efight({ own: ['ag2L'] }); f.b.turnIdx = 0; ok(IFE.n_el_first.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e_ember' }) === 0.12 && IFE.n_el_first.hitP(f.b, f.p, f.es[0], {}, { id: 'basic' }) === 0, '앞선 주문: 전투 첫 내 차례의 스킬 +12%(기본 공격 없음)'); f.b.turnIdx = 1; ok(IFE.n_el_first.hitP(f.b, f.p, f.es[0], {}, { skill: 1, id: 'e_ember' }) === 0, '두 번째 차례부터 없음'); }
{ const lt = (own, id, I) => { const f = efight({ own, act: ['e_weave', 'e_firewave', 'eu_back'], eq: ['e_firewave'] }); if (I) setEl(f.b, f.es[0], I, 0); f.p.st = 10; f.p.ys = 5; f.b.stepMode = true; E.playerAct(f.b, id, f.es[0].id); return f.p.st; };
  ok(lt(['ag3R'], 'e_touch') - lt([], 'e_touch') === 4 && lt(['ag3R'], 'e_ember') === lt([], 'e_ember'), '가벼운 손: ⚡ 스킬(서리 손길)로 둔화를 걸면 스태미나 +4, ▶ 스킬은 없음');
  ok(lt(['lg7R'], 'e_firewave', 3) - lt([], 'e_firewave', 3) === 6 && lt(['lg7R'], 'e_ember') === lt([], 'e_ember'), '고른 원소: 한 행동에 화상 · 둔화를 둘 다 걸면(역화) 스태미나 +6, 하나면 없음'); }
{ const f = efight({ own: ['su5R'] }); f.p.rime = { chill: { n: 2, times: 8 } }; f.p.hp = f.p.hpMax * 0.5; const h = f.p.hp; enemyHit(f.b, f.es[0], 0); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.01) < 1e-6 && st(f.es[0], 'chill') === 2, '녹는 서리: 되얼림이 발동하면 최대 생명력 1% 회복');
  for (let i = 0; i < 6; i++) enemyHit(f.b, f.es[0], 0); ok(Math.abs(f.p.hp - h - f.p.hpMax * 0.04) < 1e-6, '녹는 서리: 전투마다 4%까지'); }
// 조건부 할인 (kw)
{ const { b, es } = efight({ act: ['e_kindle', 'e_burnout', 'e_firebolt', 'e_sunfall', 'eu_sky'], eq: ['e_sunfall'] }); ok(yc(b, 'e_sunfall') === 4, '타는 하늘: 화상 5 미만이면 4'); E.addS(b, es[0], 'ignite', 5); ok(yc(b, 'e_sunfall') === 3, '타는 하늘: 대상 화상 5 이상이면 4 → 3'); }
{ const { b, es } = efight({ act: ['e_bind', 'e_bite', 'e_maul', 'eu_gap'], eq: ['e_maul'] }); E.addS(b, es[0], 'chill', 1); ok(yc(b, 'e_maul') === 3, '얼어붙은 틈: 둔화 1이면 3'); E.addS(b, es[0], 'chill', 1); ok(yc(b, 'e_maul') === 2, '얼어붙은 틈: 둔화 2 이상이면 3 → 2'); }
{ const { p, b, es } = efight({ act: ['e_weave', 'e_catalyst', 'e_overload', 'eu_pole'], eq: ['e_overload'] }); E.addS(b, es[0], 'chill', 2); ok(yc(b, 'e_overload') === 3, '극점: 둔화 2 이상이면 4 → 3');
  ok(E.skOf(p, 'e_overload').fx.find(x => x.k === 'shockx').dmg === 2 && E.skOf({ build: 'elementalist', aup: ['eu_chain'], pn: [] }, 'e_overload').time === 'normal' && E.skOf({ build: 'elementalist', aup: ['eu_chain'], pn: [] }, 'e_overload').fx.find(x => x.k === 'shockx').dmg === 1.6, '과부하 ×2, 연쇄 충격은 보통 빠르기 ×1.6'); }
console.log('wm-check: ' + n + '개 통과');
