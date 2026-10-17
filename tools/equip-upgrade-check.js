'use strict';
/* 강화를 반영한 장착 점검 (10월 17일 측정 도구 보완, docs/검증/0.8.0-측정도구-보완-2026-10-17.md)
   1) 강화 노드마다: 그 강화를 끼운 실제 스킬의 값(tools/skeval.js: skScore · 실제 유산 skCost · 조건부 할인 · 처치 환급)이 기본 스킬의 값과 다르다
   2) 유산 비용: 빠른 칸을 유산 1로 하는 규칙(YUSAN.cheap)을 잠시 켜면 "빠른 칸이 되는 강화"(스치는 칼)의 실제 유산이 2 → 1로 바뀌고 값에 든다
   3) 던전 테스터 장착(dgqa sbEquip): 만든 예에서 강화 하나를 더하면 그 스킬이 장착에 들어온다. 예전 점수(강화 수 × 2 + 고리)와 지금 점수가 갈리는 예도 하나
   4) 50상황 장착(sitqa equipFor): 실제 캐릭터(treeBuild)를 주면 강화로 바뀐 대상(마검 연무: 전열 모두)을 보고 무리 상황에서 고른다. 캐릭터 없이(기본 스킬)는 못 본다
   실행: node tools/equip-upgrade-check.js */
process.env.DGDIR = process.env.DGDIR || '.'; process.env.SIT_CLS = process.env.SIT_CLS || 'spellblade';
const assert = require('assert');
const S = require('./sitqa.js'); const D = require('./dgqa.js'); const SITS = require('./situations.js');
const G0 = D.G0, SKE = D.SKE, run_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; console.log('  ok ' + m); };
const r1 = x => Math.round(x * 10) / 10;

console.log('1) 강화마다 실제 스킬의 값');
const fake = cls => ({ build: cls, p: { pn: [], sbLead: null }, atree: { own: [] } });
const clsUp = Object.keys(G0.BUILDS).filter(c => !G0.BUILDS[c].tut && SKE.hasUps(c)); ok(clsUp.length >= 1, '강화 노드가 있는 트리: ' + clsUp.join(', '));
for (const cls of clsUp) {
  const A = G0.atBuild(cls); const ups = Object.keys(A.nodes).filter(u => A.nodes[u].kind === 'upgrade'); let k = 0;
  for (const u of ups) {
    const on = A.nodes[u].on; const b = SKE.evalSkill(SKE.pFor(fake(cls), on, []), on), e = SKE.evalSkill(SKE.pFor(fake(cls), on, [u]), on);
    const diff = Math.abs(e.E - b.E) > 1e-9 || Math.abs(e.net - b.net) > 1e-9 || e.cost !== b.cost || Math.abs(e.costEff - b.costEff) > 1e-9;
    assert(diff, cls + ' ' + u + ': 강화를 끼워도 값이 같음'); k++;
    console.log(`     ${u.padEnd(14)} → ${on.padEnd(13)} 값 E ${r1(b.E)} → ${r1(e.E)} · net ${r1(b.net)} → ${r1(e.net)} · 유산 ${b.cost}(실제 ${r1(b.costEff)}) → ${e.cost}(실제 ${r1(e.costEff)}) · 한 차례 ${r1(b.perTurn)} → ${r1(e.perTurn)}`);
  }
  ok(k === ups.length, `${cls} 강화 ${k}/${ups.length}개 모두 값이 기본과 다름`);
}
{ const e = SKE.evalSkill(SKE.pFor(fake('spellblade'), 'sb_sunder', ['sbu_measure']), 'sb_sunder'), b = SKE.evalSkill(SKE.pFor(fake('spellblade'), 'sb_sunder', []), 'sb_sunder');
  ok(e.E === b.E && e.disc > 0 && e.costEff < b.costEff && e.perTurn > b.perTurn, `조건부 할인(교차 일섬): 효과 값은 같고 실제 유산 ${r1(b.costEff)} → ${r1(e.costEff)}, 한 차례 값 ${r1(b.perTurn)} → ${r1(e.perTurn)}`); }

console.log('2) 유산 비용은 강화를 적용한 실제 스킬의 skCost');
{ const Y = run_('YUSAN'); const c0 = Y.cheap; Y.cheap = 1;
  try { const b = SKE.evalSkill(SKE.pFor(fake('spellblade'), 'sb_turn', []), 'sb_turn'), e = SKE.evalSkill(SKE.pFor(fake('spellblade'), 'sb_turn', ['sbu_rhythm']), 'sb_turn');
    ok(b.cost === 1 && e.cost === 2 && e.cost === G0.skCost(G0.skOf(SKE.pFor(fake('spellblade'), 'sb_turn', ['sbu_rhythm']), 'sb_turn')), `YUSAN.cheap을 켜면 회류참(빠른 칸, 유산 ${b.cost})이 마검 연무(보통 빠르기)로 유산 ${e.cost}가 되고, 값은 그 비용으로 센다(한 차례 ${r1(b.perTurn)} → ${r1(e.perTurn)})`); }
  finally { Y.cheap = c0; } }

console.log('3) 던전 테스터 장착 (dgqa sbEquip)');
D.seedWorld(1); { const G = G0.__G; G.data = G0.blankData(); G.data.unlAll = 1; G.cre = { name: 'chk' }; G.dropQ = []; G.b = null; G.sheet = null; }
G0.startRun('spellblade'); const run = G0.__G.run; delete run.alloc; G0.__G.sheet = null; G0.__G.creating = false; G0.__G.cre = null;
const A = G0.atBuild('spellblade');
const equipWith = (own, old) => { run.atree.own = own.slice(); run.focus = '마갑'; run.skills = []; const o = process.env.EQUIP_OLD; if (old) process.env.EQUIP_OLD = '1'; else delete process.env.EQUIP_OLD; try { D.sbEquip(run, A); } finally { if (o != null) process.env.EQUIP_OLD = o; else delete process.env.EQUIP_OLD; } return run.skills.slice(); };
{ const own = ['sb_bladeward', 'sb_unravel', 'sb_sunder', 'sb_bolt', 'sb_rebound'];
  const e0 = equipWith(own), e1 = equipWith(own.concat(['sbu_twin']));
  console.log('     가진 스킬 ' + own.join(' · '));
  console.log('     강화 없음 → ' + e0.join(' · ')); console.log('     이중 영창(반향 주문 강화) 더함 → ' + e1.join(' · '));
  ok(!e0.includes('sb_rebound') && e1.includes('sb_rebound'), '강화를 더하면 그 스킬(반향 주문)이 장착에 들어온다');
  ok(run.p.aup.includes('sbu_twin'), '장착 뒤 그 강화가 일한다(p.aup)');
  const sc = D.sbEquipScore(run, A); ok(Math.abs(sc('sb_rebound') - (SKE.evalRun(run, 'sb_rebound').perTurn + 1.5)) < 1e-9, '장착 점수 = 강화를 반영한 한 차례 값 + 주 갈래 1.5'); }
{ const own = ['sb_finale', 'sb_bolt', 'sbu_barrage', 'sb_turn', 'sb_shell', 'sb_unravel'];
  const eo = equipWith(own, true), en = equipWith(own, false);
  console.log('     가진 것 ' + own.join(' · ')); console.log('     예전 점수(강화 수 × 2 + 고리) → ' + eo.join(' · ')); console.log('     지금 점수(실제 값) → ' + en.join(' · '));
  const b = SKE.evalBase(run, 'sb_bolt'), u = SKE.evalRun(run, 'sb_bolt');
  ok(eo.includes('sb_bolt') && !en.includes('sb_bolt'), `강화 수만 보면 마갑탄(방벽 포격)을 끼우지만, 실제 값(한 차례 ${r1(b.perTurn)} → ${r1(u.perTurn)})으로는 더 나은 칸이 있다`); }

console.log('4) 50상황 장착 (sitqa equipFor)');
{ run.atree.own = ['sb_bladeward', 'sb_bolt', 'sb_unravel', 'sb_turn', 'sb_sunder', 'sb_rebound', 'sbu_rhythm']; run.focus = '마갑'; run.skills = []; G0.atSync(run);
  const sit = SITS.SIT.find(s => s.id === 2); const bdRun = S.treeBuild(run); const bdBase = Object.assign({}, bdRun, { run: null });
  const eR = S.equipFor(bdRun, sit), eB = S.equipFor(bdBase, sit);
  console.log(`     상황 ${sit.id}(${sit.n}) 실제 캐릭터 → ${eR.join(' · ')} / 기본 스킬로 → ${eB.join(' · ')}`);
  ok(G0.skOf(SKE.pFor(run, 'sb_turn'), 'sb_turn').tgt === 'front' && G0.SK2.sb_turn.tgt !== 'front', '마검 연무: 강화를 끼운 회류참은 전열 모두를 벤다');
  ok(eR[0] === 'sb_turn' && eB[0] !== 'sb_turn', '실제 캐릭터를 주면 무리 상황에서 전열 모두로 바뀐 칸(마검 연무)을 맨 먼저 고른다(기본 스킬로는 한 적 베기라 무리 덤이 없다)');
  ok(JSON.stringify(eR) !== JSON.stringify(eB), '기본 스킬만 보는 예전 길과 고른 것이 다르다'); }
console.log(`강화를 반영한 장착 점검: ${n}개 통과`);
