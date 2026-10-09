/* 챕터 선물 점검 (10월 10일, 숨겨진 직업 2의 2챕터 보강): 06a2의 게임 코드를 vm에서 돌려 확인한다.
   직업마다 챕터에 들어설 때 받는 깨달음(data/awakening.js CH_GIFT)이 한 번만 주어지고, 효과가 그 챕터에서만 일하며, 다른 직업은 받지 않는지 본다.
   실행: node tools/giftcheck.js (실패 0이어야 한다) */
process.env.DGDIR = process.env.DGDIR || '06a2';
const D = require('./dgqa.js'); const G0 = D.G0; const run_ = D.run_; const G = G0.__G;
let fail = 0, pass = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('실패:', m); } };
G0.__rnd = D.rng(41); run_('Math.random = __rnd');
const GIFT = run_('CH_GIFT'), AWK_MAP = run_('AWK_MAP'), AWK_LIST = run_('AWK_LIST');
ok(Object.keys(GIFT).join() === '2' && Object.keys(GIFT[2]).join() === 'confessor', '선물 표는 2챕터의 숨겨진 직업 2 하나');
ok(AWK_MAP.g_cf2 && AWK_MAP.g_cf2.g === 'gift' && !AWK_LIST.some(a => a.id === 'g_cf2'), '선물은 제시 목록 AWK_LIST에 들지 않는다');
const fresh = build => { G.data = G0.blankData(); G.data.unlAll = 1; G.data.seenCoach = true; G.cre = { name: 'chk' }; G.dropQ = []; G.b = null; G.sheet = null; G0.startRun(build); return G.run; };
{ const run = fresh('confessor'); ok(!(run.awk || []).includes('g_cf2'), '1챕터에는 선물이 없다');
  ok(!run_('awkAvail')(run).some(a => a.id === 'g_cf2'), '깨달음 제시에는 나오지 않는다');
  run.ch = 1; G0.enterChapter(run); ok(run.ch === 2 && run.awk.includes('g_cf2') && run.p.awk.includes('g_cf2'), '2챕터에 들어서면 받는다');
  ok(run.awkLog.filter(x => x.gift).length === 1, '받은 기록 하나');
  G0.enterChapter(run); ok(run.ch === 3 && run.awk.filter(x => x === 'g_cf2').length === 1, '3챕터에 들어서도 더 받지 않는다');
  const old = fresh('confessor'); old.ch = 2; old.awk = []; old.p.awk = []; run_('dgFix')(old); ok(old.awk.includes('g_cf2') && old.p.awk.includes('g_cf2'), '이미 2챕터인 옛 저장본은 이어하기에서 받는다');
  run_('dgFix')(old); ok(old.awk.filter(x => x === 'g_cf2').length === 1, '이어하기를 거듭해도 하나'); }
const heal = ch => { const run = fresh('confessor'); const p = run.p; p.awk = ['g_cf2']; const r = { type: 'normal', ch, floor: 3, lv: 5, en: [['bruiser', 0]], names: run_('ENEMY_NAMES[' + ch + ']'), mods: [], tough: [], swift: [], path: 'main' }; const b = G0.roomBattle(p, r, null, 7); p.hp = p.hpMax * 0.5; const h0 = p.hp; run_('fxRun')(p, 'onSkill', b, p, { id: 'x' }); return (p.hp - h0) / p.hpMax; };
ok(Math.abs(heal(2) - 0.012) < 1e-9, '2챕터에서 스킬을 쓰면 최대 생명력의 1.2% 회복 (' + heal(2) + ')');
ok(heal(1) === 0 && heal(3) === 0, '1 · 3챕터에서는 회복하지 않는다');
for (const k of Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && k !== 'confessor')) { const run = fresh(k); run.ch = 1; G0.enterChapter(run); ok(!(run.awk || []).length, k + '는 선물을 받지 않는다'); }
console.log(`챕터 선물 점검 ${pass + fail}건, 실패 ${fail}건`); process.exitCode = fail ? 1 : 0;
