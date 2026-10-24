'use strict';
/* 0.8.0 M5-7 붕괴 규칙 점검 (10월 21일 만든 사람 결정). 실행: node tools/brk-check.js
   BRK_RULE.basic0(켬 · 끔)에서: 기본 공격 붕괴 0(연타 · 분신 포함) · 강공격 붕괴 그대로(× heavyMul) · 반격은 붕괴를 채움 ·
   "기본 공격 붕괴" 효과(장비 · 패시브 · 태세 · 다음 기본 공격 붕괴)는 같은 자리에서 강공격 붕괴 · 제어 방향 스킬 붕괴 노드(작은 셋 · 중간 하나) · 문장 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, RULE = R_('BRK_RULE'), B0 = RULE.basic0, HM = RULE.heavyMul;
const setRule = on => { RULE.basic0 = on; R_('for (const k in PTREE) delete PTREE[k]'); };
function fight(build, o) {
  o = o || {}; G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun(build); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.ptree.own.push(...(o.own || [])); run.ptree.ks.push(...(o.ks || [])); E.ptSync(run);
  run.atree.own = (o.act || []).slice(); run.skills = (o.act || []).filter(id => (E.atBuild(build).nodes[id] || {}).kind === 'skill').slice(-4); E.atSync(run);
  if (o.eq) for (const k in o.eq) run.p.eq[k] = o.eq[k];
  const es = (o.en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; e.brkMax = 99999; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const sf = f => 1 + 0.01 * R_('stat')(f.p, 'str'); // addBreak의 힘 배율
const act = (f, id, e) => { f.p.ys = 9; f.p.st = f.p.stMax; f.p.cd = {}; f.b.stepMode = true; const t = e || f.es[0]; const b0 = t.brk; E.playerAct(f.b, id, t.id); f.b.stepMode = false; return t.brk - b0; };
try {
  // 끔(기준선): 기본 공격 붕괴 10
  setRule(false);
  { const f = fight('warden'); const v = act(f, 'basic'); ok(Math.abs(v - 10 * sf(f)) < 1e-6, '끔: 기본 공격 붕괴 10(지금, 힘 배율 뒤 ' + v.toFixed(1) + ')'); }
  // 켬
  setRule(true);
  { const f = fight('warden'); ok(act(f, 'basic') === 0, '켬: 기본 공격 붕괴 0'); const h = act(f, 'heavy', f.es[1]); ok(Math.abs(h / sf(f) - (35 + 5 * Math.floor(R_('stat')(f.p, 'str') / 10)) * RULE.heavyMul) < 1e-6, '켬: 강공격 붕괴 35 × 배율 ' + RULE.heavyMul + ' (' + h.toFixed(1) + ')'); }
  { RULE.heavyMul = 1.2; const f = fight('warden'); const h = act(f, 'heavy'); RULE.heavyMul = 1; const h1 = act(fight('warden'), 'heavy'); RULE.heavyMul = HM; ok(Math.abs(h / h1 - 1.2) < 1e-6, '강공격 붕괴 배율 HEAVY_BRK 1.2 (' + h1.toFixed(1) + ' → ' + h.toFixed(1) + ')'); }
  { const f = fight('warden', { eq: { weapon: 'rustsword' } }); const h0 = act(fight('warden'), 'heavy'); ok(act(f, 'basic') === 0 && Math.abs(act(f, 'heavy', f.es[1]) - h0 - 2 * sf(f)) < 1e-6, '녹슨 장검: 기본 공격 붕괴 +2 → 강공격 붕괴 +2'); }
  { const f = fight('warden', { own: ['pw1C', 'pw2R'] }); const has = f.p.pn.includes('n_bs_brk'); const h = act(f, 'heavy'), h0 = act(fight('warden', { own: ['pw1C'] }), 'heavy'); ok(has && Math.abs(h - h0 - RULE.bsHeavy * sf(f)) < 1e-6, '패시브 n_bs_brk: 강공격 붕괴 +' + RULE.bsHeavy + ' (' + h0.toFixed(1) + ' → ' + h.toFixed(1) + ')'); }
  { const f = fight('warden', { act: ['s_astance'] }); act(f, 's_astance'); f.b.stepMode = false; E.runUntilPlayer(f.b); ok(act(f, 'basic', f.es[1]) === 0, '공격 태세: 기본 공격 붕괴 +10 → 기본 공격은 0'); E.runUntilPlayer(f.b); const h = act(f, 'heavy', f.es[1]), h0 = act(fight('warden'), 'heavy'); ok(h > h0 + 5, '공격 태세: 강공격에는 붕괴 +' + (h - h0).toFixed(1)); }
  // 반격은 붕괴를 채운다(흘려 베기 · 칼춤 = 추가 기본 공격 extra)
  { const f = fight('assassin'); const e = f.es[0]; const b0 = e.brk; R_('asExtraBasic')(f.b, e, '반격', 1, 0); ok(Math.abs(e.brk - b0 - 10 * sf(f)) < 1e-6, '반격(추가 기본 공격)은 붕괴 10을 채운다(' + (e.brk - b0).toFixed(1) + ')'); }
  // 패시브 스킬 붕괴 노드
  { const T = E.ptBuild('warden'); ok(['ct4L', 'ct6L', 'ct8L'].every(id => T.nodes[id].sm === 'skb') && ['ct4R', 'ct6R', 'ct8R'].every(id => T.nodes[id].sm === 'brk') && T.nodes.ct5L.fx === 'n_ct_skbrk', '제어 방향: 작은 노드 셋 스킬 붕괴, 중간 노드 하나(ct5L) 스킬 붕괴'); }
  for (const c of ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist']) { const cnt = () => { const T = E.ptBuild(c), k = Object.values(T.nodes).filter(x => x.dir === 'ct'); return [k.length, k.filter(x => x.kind === 'small').length, k.filter(x => x.kind === 'notable').length, T]; }; setRule(false); const a = cnt(); setRule(true); const b2 = cnt();
    ok(a[0] === b2[0] && a[1] === b2[1] && a[2] === b2[2] && b2[3].nodes.ct5L.fx === 'n_ct_skbrk' && Object.values(b2[3].nodes).filter(x => x.sm === 'skb').length === 3, c + ': 제어 방향 노드 ' + b2[0] + '(작은 ' + b2[1] + ' · 중간 ' + b2[2] + ') 그대로, 스킬 붕괴 작은 셋 · 중간 하나'); }
  { const sk = 'w_bash'; const f0 = fight('warden'); const a0 = act(f0, sk); const f1 = fight('warden', { own: ['ct1C', 'ct2L', 'ct3R', 'ct4L', 'ct5L'] }); const a1 = act(f1, sk);
    const ex = (1 + RULE.skbS) * (1 + RULE.skbM) * Math.pow(1 + R_('PT').smallBrk, 2); ok(a1 / a0 > 1.15, '스킬 붕괴 노드: 스킬(방패 치기) 붕괴 ' + a0.toFixed(1) + ' → ' + a1.toFixed(1) + ' (작은 붕괴 둘 · 스킬 붕괴 작은 하나 · 중간 하나, 기대 ×' + ex.toFixed(3) + ')');
    const h0 = act(fight('warden'), 'heavy'), h1 = act(fight('warden', { own: ['ct1C', 'ct2L', 'ct3R', 'ct4L', 'ct5L'] }), 'heavy'); ok(Math.abs(h1 / h0 - Math.pow(1 + R_('PT').smallBrk, 2)) < 0.02, '스킬 붕괴 노드는 강공격에 들지 않음(주는 붕괴 작은 둘만)'); }
  // 문장
  { const t = R_('actInfo')(fight('warden').p, 'basic'); ok(/붕괴를 채우지 않는다\(반격 · 강공격 · 스킬은 채운다\)/.test(t), '전투 정보: 기본 공격 붕괴 문장'); }
  ok(R_('PN_TXT').n_bs_brk.n === '강공격 붕괴 +' + RULE.bsHeavy && R_('PN_TXT').n_ct_skbrk.n === '스킬 붕괴 +' + Math.round(RULE.skbM * 100) + '%' && /강공격으로 맞히면 붕괴 \+10/.test(R_('KS_LIST').ks_sharp.d), '패시브 · 큰 각인 문장(강공격 붕괴)');
} finally { setRule(B0); RULE.heavyMul = HM; }
console.log('brk-check: ' + n + '개 통과');
