'use strict';
/* 0.8.0 5단계 파수꾼 · 수도승 트리 점검 (10월 17일). 실행: node tools/wm-check.js
   docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md의 규칙이 엔진에서 그대로 일하는지 본다.
   1 강화 노드가 모두 적용되고 금지선(무조건 비용 바꾸기 없음, 조건 어휘) · 2 노드 비용(skCost가 노드 ys를 읽음) · 3 파수꾼(방어 보호막 · 받아낸 몫 상한 · 흔들리는 방패 · 쌓인 벽 · 🔄 조건 · 달군 방패 · 산사태) ·
   4 수도승(기의 그릇 · 열린 단전 · 참회의 무게 · 비운 그릇 · 부동의 맹세 · 철산고 · 천지 정지 · 넘치는 기운) */
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
console.log('wm-check: ' + n + '개 통과');
