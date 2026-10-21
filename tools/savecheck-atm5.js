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
  try { const run = reopen(save, n); const total = run_('atTotal')(run); const ok1 = run.atree.own.length === 0 && run.atree.pts === total && run.atree.atv === 9 && run.skills.every(id => st.includes(id)); const got = run.atree.pts;
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} ${build}: 옛 임시 노드 ${old.join(' ')} → 거둠, 남은 포인트 ${pts0} → ${got}(그 레벨 총량 ${total}), 장착 시작 스킬만, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ ' + build + ': 예외 ' + e.message); bad++; }
}
{ const save = saveOf('spellblade', 72000); if (save) { n++; delete save.atree.atv; const own0 = save.atree.own.slice(), pts0 = save.atree.pts; const run = reopen(save, n); const ok = JSON.stringify(run.atree.own) === JSON.stringify(own0) && run.atree.pts === pts0 && run.atree.atv === 9;
  console.log(`${ok ? '✓' : '✗'} spellblade: 노드 ${own0.join(' ') || '없음'} 유지, 포인트 ${pts0} → ${run.atree.pts}`); if (!ok) bad++; } }
/* M5-0 보정 4(10월 20일): 마검사 갈래 칸을 잘랐다. atv 2 판에 자른 칸(피의 낙인 · 혈풍참 · 작열검)을 찍어 둔 것처럼 만들고 이어 한다 → 그 포인트 환급, 장착에서 빠짐, 남은 노드 유지, 판 끝까지 오류 0 */
{ const save = saveOf('spellblade', 73000); if (!save) { console.log('✗ spellblade 자른 칸: 저장본을 뜨지 못함'); bad++; } else { n++;
  const cut = ['sb_bloodmark', 'sb_whirl', 'sb_heated'], keep = ['sb_bleedcut', 'sb_ember']; save.atree.atv = 2; save.atree.own = keep.concat(cut); const pts0 = 1; save.atree.pts = pts0; save.skills = ((run_('TREE2').spellblade || {}).starters || []).concat(['sb_bloodmark', 'sb_ember']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '부채꼴 칸 정리') || {}; const pts1 = run.atree.pts; const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(keep) && pts1 === run_('atTotal')(run) - keep.length && rf.refund === cut.length && JSON.stringify(rf.gone) === JSON.stringify(cut) && run.atree.atv === 9 && !run.skills.includes('sb_bloodmark') && run.skills.includes('sb_ember');
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} spellblade 자른 칸: ${cut.join(' ')} → 거둠(환급 기록 ${rf.refund}), 포인트 ${pts1} = 총량 − 남은 ${keep.length}칸, 장착에서 빠짐, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ spellblade 자른 칸: 예외 ' + e.message); bad++; } } }
/* M5-0 보정 5(10월 20일): atv 3 판에 피의 반향(트리에서 뺌)과 1고리 갈림 둘(마갑참 · 마갑탄)을 찍어 둔 것처럼 만든다 → 피의 반향 · 나중에 찍은 마갑탄 환급 */
{ const save = saveOf('spellblade', 74000); if (!save) { console.log('✗ spellblade 보정 5: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 3; save.atree.own = ['sb_bleedcut', 'sb_bladeward', 'sb_bolt', 'sb_bloodecho', 'sbu_counter']; /* 그 레벨 총량 안: 남는 칸은 셋 */ save.atree.pts = 0; delete save.atree.vsel; save.skills = ((run_('TREE2').spellblade || {}).starters || []).concat(['sb_bolt', 'sb_bloodecho', 'sb_bladeward']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '빌드 규격 2판') || {}; const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['sb_bleedcut', 'sb_bladeward', 'sv_bladeward']) && !(run.atree.vsel || {}).sv_bladeward && rf.refund === 2 && run.atree.atv === 9 && !run.skills.includes('sb_bolt') && !run.skills.includes('sb_bloodecho') && run.skills.includes('sb_bladeward');
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} spellblade 보정 5: 피의 반향 · 나중에 찍은 마갑탄 거둠(환급 ${rf.refund}), 옛 강화 맞받아 베기 → 마갑참 변형 자리(고르지 않음), 남은 ${run.atree.own.join(' ')}, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ spellblade 보정 5: 예외 ' + e.message); bad++; } } }
/* M5-0c(10월 20일 만든 사람): 마검사 액티브 재설계. atv 4 판에 트리에서 빠진 칸(염화 부여)과 빠진 변형(혈인 연참)을 찍어 둔 것처럼 만든다 → 그 칸 · 그 변형 자리의 포인트 환급, 제시는 새 규칙(변형 둘)으로 */
{ const save = saveOf('spellblade', 75000); if (!save) { console.log('✗ spellblade 재설계: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 4; save.atree.own = ['sb_bleedcut', 'sv_bleedcut', 'sb_ember', 'sb_kindle']; save.atree.vsel = { sv_bleedcut: 'sbu_chain' }; save.atree.pts = 0; save.offer = { v: 1, seed: 1, vars: { sv_bleedcut: ['sbu_chain', 'sbv_bleedcut_fast'] }, combos: ['sb_bloodfist', 'sb_tricolor'], fins: { AB: 'sb_searburst' }, mut: null }; save.skills = ((run_('TREE2').spellblade || {}).starters || []).concat(['sb_kindle', 'sb_ember']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '마검사 재설계') || {}; const pts1 = run.atree.pts;
    const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['sb_bleedcut', 'sb_ember']) && rf.refund === 2 && JSON.stringify(rf.gone) === JSON.stringify(['sv_bleedcut', 'sb_kindle']) && pts1 === run_('atTotal')(run) - 2 && run.atree.atv === 9 && !Object.keys(run.atree.vsel || {}).length && !run.skills.includes('sb_kindle') && run.skills.includes('sb_ember') && run.offer.vars.sv_bleedcut.slice(0, 2).join() === 'sbv_bleedcut_fast,sbv_bleedcut_burn' && !Object.keys(run.offer.fins).length;
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} spellblade 재설계(atv 4 → 5): 빠진 칸 염화 부여 · 빠진 변형 혈인 연참 자리 거둠(환급 ${rf.refund}), 포인트 ${pts1} = 총량 − 남은 2칸, 새 제시(변형 둘 · 승부수 후보 없음), 장착에서 빠짐, 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ spellblade 재설계: 예외 ' + e.message); bad++; } } }
/* M5-1(10월 20일 만든 사람): 파수꾼 재설계. atv 5 판에 옛 사다리 칸(방패 세우기)과 옛 강화(받쳐 든 방패 wu_wil)를 찍어 둔 것처럼 만든다 → 그 둘 환급, 개기식 · 방패 밀치기는 남음 */
{ const save = saveOf('warden', 76000); if (!save) { console.log('✗ warden 재설계: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 5; save.atree.own = ['f_sweep', 'w_raise', 'wu_wil', 'w_shove']; delete save.atree.vsel; save.atree.pts = 0; delete save.offer; save.skills = ((run_('TREE2').warden || {}).starters || []).concat(['w_raise', 'f_sweep']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '파수꾼 재설계') || {}; const pts1 = run.atree.pts;
    const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['f_sweep', 'w_shove']) && rf.refund === 2 && JSON.stringify(rf.gone) === JSON.stringify(['w_raise', 'wu_wil']) && pts1 === run_('atTotal')(run) - 2 && run.atree.atv === 9 && !run.skills.includes('w_raise') && run.skills.includes('f_sweep') && run.offer && run.offer.vars.sv_f_sweep && run.offer.vars.sv_f_sweep.length === 2;
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} warden 재설계(atv 5 → 7): 옛 칸 방패 세우기 · 옛 강화 받쳐 든 방패 거둠(환급 ${rf.refund}), 포인트 ${pts1} = 총량 − 남은 2칸, 새 제시(변형 둘), 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ warden 재설계: 예외 ' + e.message); bad++; } } }
/* M5-2(10월 20일 만든 사람): 수도승 재설계. atv 6 판에 옛 사다리 칸(기 모으기)과 옛 강화(깊은 호흡 mu_deep)를 찍어 둔 것처럼 만든다 → 그 둘 환급, 연환권 · 호흡은 남음 */
{ const save = saveOf('monk', 77000); if (!save) { console.log('✗ monk 재설계: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 6; save.atree.own = ['m_yeonhwan', 'm_breath', 'mu_deep', 'm_hoheup']; delete save.atree.vsel; save.atree.pts = 0; delete save.offer; save.skills = ((run_('TREE2').monk || {}).starters || []).concat(['m_breath', 'm_yeonhwan']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '수도승 재설계') || {}; const pts1 = run.atree.pts;
    const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['m_yeonhwan', 'm_hoheup']) && rf.refund === 2 && JSON.stringify(rf.gone) === JSON.stringify(['m_breath', 'mu_deep']) && pts1 >= 0 && run.atree.atv === 9 && !run.skills.includes('m_breath') && run.skills.includes('m_yeonhwan') && run.offer && run.offer.vars.sv_m_yeonhwan && run.offer.vars.sv_m_yeonhwan.length === 2;
    if (!ok1 && process.env.SC_DBG) console.log(JSON.stringify({ own: run.atree.own, rf, tot: run_("atTotal")(run), pts1, atv: run.atree.atv, sk: run.skills, of: run.offer && run.offer.vars.sv_m_yeonhwan }));
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} monk 재설계(atv 6 → 7): 옛 칸 기 모으기 · 옛 강화 깊은 호흡 거둠(환급 ${rf.refund}), 포인트 ${pts1}, 새 제시(변형 둘), 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ monk 재설계: 예외 ' + e.message); bad++; } } }
/* M5-3(10월 20일 만든 사람): 암살자 재설계. atv 7 판에 옛 칸(독니 a_fang)과 옛 강화(깊은 독니 au_fang)를 찍어 둔 것처럼 만든다 → 그 둘 환급, 독 바른 칼 · 독침은 남음 */
{ const save = saveOf('assassin', 78000); if (!save) { console.log('✗ assassin 재설계: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 7; save.atree.own = ['a_dokkal', 'a_fang', 'au_fang', 'a_dokchim']; delete save.atree.vsel; save.atree.pts = 0; delete save.offer; save.skills = ((run_('TREE2').assassin || {}).starters || []).concat(['a_fang', 'a_dokkal']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '암살자 재설계') || {}; const pts1 = run.atree.pts;
    const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['a_dokkal', 'a_dokchim']) && rf.refund === 2 && JSON.stringify(rf.gone) === JSON.stringify(['a_fang', 'au_fang']) && pts1 >= 0 && run.atree.atv === 9 && !run.skills.includes('a_fang') && run.skills.includes('a_dokkal') && run.offer && run.offer.vars.sv_a_dokkal && run.offer.vars.sv_a_dokkal.length === 2;
    if (!ok1 && process.env.SC_DBG) console.log(JSON.stringify({ own: run.atree.own, rf, tot: run_("atTotal")(run), pts1, atv: run.atree.atv, sk: run.skills, of: run.offer && run.offer.vars.sv_a_dokkal }));
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} assassin 재설계(atv 7 → 8): 옛 칸 독니 · 옛 강화 깊은 독니 거둠(환급 ${rf.refund}), 포인트 ${pts1}, 새 제시(변형 둘), 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ assassin 재설계: 예외 ' + e.message); bad++; } } }
/* M5-4(10월 21일 만든 사람): 사냥꾼 재설계. atv 8 판에 옛 칸(사냥감 지정 h_prey)과 옛 강화(표적 고정 hu_lock)를 찍어 둔 것처럼 만든다 → 그 둘 환급, 꿰뚫는 화살 · 엄폐는 남음 */
{ const save = saveOf('hunter', 79000); if (!save) { console.log('✗ hunter 재설계: 저장본을 뜨지 못함'); bad++; } else { n++;
  save.atree.atv = 8; save.atree.own = ['h5_pierce', 'h_prey', 'hu_lock', 'h5_cover']; delete save.atree.vsel; save.atree.pts = 0; delete save.offer; save.skills = ((run_('TREE2').hunter || {}).starters || []).concat(['h_prey', 'h5_pierce']);
  try { const run = reopen(save, n); const rf = run.atree.log.find(x => x.why === '사냥꾼 재설계') || {}; const pts1 = run.atree.pts;
    const ok1 = JSON.stringify(run.atree.own) === JSON.stringify(['h5_pierce', 'h5_cover']) && rf.refund === 2 && JSON.stringify(rf.gone) === JSON.stringify(['h_prey', 'hu_lock']) && pts1 >= 0 && run.atree.atv === 9 && !run.skills.includes('h_prey') && run.skills.includes('h5_pierce') && run.offer && run.offer.vars.sv_h5_pierce && run.offer.vars.sv_h5_pierce.length === 2;
    if (!ok1 && process.env.SC_DBG) console.log(JSON.stringify({ own: run.atree.own, rf, pts1, atv: run.atree.atv, sk: run.skills, of: run.offer && run.offer.vars.sv_h5_pierce }));
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(900 + n), out); const ok2 = !out.bugs.length;
    console.log(`${ok1 && ok2 ? '✓' : '✗'} hunter 재설계(atv 8 → 9): 옛 칸 사냥감 지정 · 옛 강화 표적 고정 거둠(환급 ${rf.refund}), 포인트 ${pts1}, 새 제시(변형 둘), 판 끝 ${G.scr} 오류 ${out.bugs.length}`); if (!(ok1 && ok2)) bad++;
  } catch (e) { console.log('✗ hunter 재설계: 예외 ' + e.message); bad++; } } }
console.log(`at-m5: 저장본 ${n}개, 실패 ${bad}`); process.exitCode = bad ? 1 : 0;
