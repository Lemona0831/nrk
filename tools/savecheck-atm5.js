'use strict';
/* 0.8.0 M5-0 세이브 점검 (10월 19일): 임시 액티브 트리 폐기(D14). node tools/savecheck.js at-m5
   숨겨진 직업(임시 트리였던 직업) 판에 옛 임시 트리 노드를 찍어 둔 것처럼 만들고(atv 없음) 이어 하기로 연다 → 포인트 환급, 장착은 시작 스킬, 판 끝까지 오류 0.
   마검사 판(기존 노드 유지)은 환급 없음 */
const D = require('./dgqa.js'); const { G0, OPT, playChar, playLoop, handleSheets, rng, run_ } = D;
const G = G0.__G; let bad = 0, n = 0;
function saveOf(build, seed) { let save = null; OPT.chapters = 1; OPT.onStep = G1 => { if (!save && G1.run.room >= 3 && G1.run.doors && G.data.cur) save = JSON.parse(JSON.stringify(G.data.cur)); }; for (let s = 0; s < 6 && !save; s++) { try { playChar('careful', build, seed + s * 11); } catch (e) { } } OPT.onStep = null; return save; }
function reopen(save, i) { G0.__rnd = rng(500 + i); run_('Math.random = __rnd'); G.data = G0.blankData(); G.data.unlAll = 1; G.data.cur = save; G.run = null; G.b = null; G.sheet = null; G.dropQ = []; run_('toast = () => {}'); G0.resumeRun(); return G.run; }
for (const build of ['butcher', 'confessor', 'bloodmage']) {
  const save = saveOf(build, 71000); if (!save) { console.log('✗ ' + build + ': 저장본을 뜨지 못함'); bad++; continue; } n++;
  const old = (run_('SKILLS2')[build] || []).filter(s => !s.start).slice(0, 3).map(s => s.id); const st = (run_('TREE2')[build] || {}).starters || [];
  delete save.atree.atv; save.atree.own = old.slice(); save.atree.pts = Math.max(0, (save.atree.pts || 0) - old.length); save.skills = st.concat(old.slice(0, 2)); const pts0 = save.atree.pts;
  try { const run = reopen(save, n); const total = run_('atTotal')(run); const ok1 = run.atree.own.length === 0 && run.atree.pts === total && run.atree.atv === 4 && run.skills.every(id => st.includes(id)); const got = run.atree.pts;
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} ${build}: 옛 임시 노드 ${old.join(' ')} → 거둠, 남은 포인트 ${pts0} → ${got}(그 레벨 총량 ${total}), 장착 시작 스킬만, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ ' + build + ': 예외 ' + e.message); bad++; }
}
{ const save = saveOf('spellblade', 72000); if (save) { n++; delete save.atree.atv; const own0 = save.atree.own.slice(), pts0 = save.atree.pts; const run = reopen(save, n); const ok = JSON.stringify(run.atree.own) === JSON.stringify(own0) && run.atree.pts === pts0 && run.atree.atv === 4;
  console.log(`${ok ? '✓' : '✗'} spellblade: 노드 ${own0.join(' ') || '없음'} 유지, 포인트 ${pts0} → ${run.atree.pts}`); if (!ok) bad++; } }
/* M5-0 보정 4(10월 20일): 마검사 갈래 칸을 잘랐다. atv 2 판에 자른 칸(피의 낙인 · 혈풍참 · 작열검)을 찍어 둔 것처럼 만들고 이어 한다 → 그 포인트 환급, 장착에서 빠짐, 남은 노드 유지, 판 끝까지 오류 0 */
{ const save = saveOf('spellblade', 73000); if (!save) { console.log('✗ spellblade 자른 칸: 저장본을 뜨지 못함'); bad++; } else { n++;
  const cut = ['sb_bloodmark', 'sb_whirl', 'sb_heated'], keep = ['sb_bleedcut', 'sb_ember']; save.atree.atv = 2; save.atree.own = keep.concat(cut); const pts0 = 1; save.atree.pts = pts0; save.skills = ((run_('TREE2').spellblade || {}).starters || []).concat(['sb_bloodmark', 'sb_ember']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '부채꼴 칸 정리') || {}; const pts1 = run.atree.pts; const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(keep) && pts1 === run_('atTotal')(run) - keep.length && rf.refund === cut.length && JSON.stringify(rf.gone) === JSON.stringify(cut) && run.atree.atv === 4 && !run.skills.includes('sb_bloodmark') && run.skills.includes('sb_ember');
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} spellblade 자른 칸: ${cut.join(' ')} → 거둠(환급 기록 ${rf.refund}), 포인트 ${pts1} = 총량 − 남은 ${keep.length}칸, 장착에서 빠짐, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ spellblade 자른 칸: 예외 ' + e.message); bad++; } } }
/* M5-0 보정 5(10월 20일): atv 3 판에 피의 반향(트리에서 뺌)과 1고리 갈림 둘(마갑참 · 마갑탄)을 찍어 둔 것처럼 만든다 → 피의 반향 · 나중에 찍은 마갑탄 환급 */
{ const save = saveOf('spellblade', 74000); if (!save) { console.log('✗ spellblade 보정 5: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 3; save.atree.own = ['sb_bleedcut', 'sb_bladeward', 'sb_bolt', 'sb_bloodecho', 'sbu_counter']; /* 그 레벨 총량 안: 남는 칸은 셋 */ save.atree.pts = 0; delete save.atree.vsel; save.skills = ((run_('TREE2').spellblade || {}).starters || []).concat(['sb_bolt', 'sb_bloodecho', 'sb_bladeward']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '빌드 규격 2판') || {}; const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['sb_bleedcut', 'sb_bladeward', 'sv_bladeward']) && !(run.atree.vsel || {}).sv_bladeward && rf.refund === 2 && run.atree.atv === 4 && !run.skills.includes('sb_bolt') && !run.skills.includes('sb_bloodecho') && run.skills.includes('sb_bladeward');
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} spellblade 보정 5: 피의 반향 · 나중에 찍은 마갑탄 거둠(환급 ${rf.refund}), 옛 강화 맞받아 베기 → 마갑참 변형 자리(고르지 않음), 남은 ${run.atree.own.join(' ')}, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ spellblade 보정 5: 예외 ' + e.message); bad++; } } }
console.log(`at-m5: 저장본 ${n}개, 실패 ${bad}`); process.exitCode = bad ? 1 : 0;
