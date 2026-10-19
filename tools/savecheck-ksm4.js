'use strict';
/* 0.8.0 M4 세이브 점검 (10월 19일): 큰 각인 배치가 바뀐 뒤 옛 판을 이어 하기.
   node tools/savecheck.js ks-m4
   직업마다 신중으로 1챕터를 깨고 2챕터에 들어선 판을 저장본으로 뜬 뒤, 옛 배치의 자리(계승 K9 = 넘치는 그릇, 제어 K5 = 망치의 길)를 찍어 둔 것처럼 바꾸고(ksv 없음)
   지금 게임의 이어 하기(resumeRun)로 연다. 판정: 그 자리 각인이 거둬지고 그때 연 길도 거둬짐, 큰 각인을 다시 고를 수 있음(ksPending), 판 끝까지 오류 0 */
const D = require('./dgqa.js'); const { G0, OPT, playChar, playLoop, handleSheets, rng, run_ } = D;
const G = G0.__G; const CLS = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
let bad = 0, n = 0;
for (const build of CLS) {
  let save = null; OPT.chapters = 2;
  OPT.onStep = G1 => { if (!save && (G1.run.ch || 1) === 2 && G1.run.room >= 2 && G1.run.doors && G.data.cur) save = JSON.parse(JSON.stringify(G.data.cur)); };
  for (let s = 0; s < 12 && !save; s++) { try { playChar('careful', build, 61000 + s * 17); } catch (e) { } }
  OPT.onStep = null; if (!save) { console.log('✗ ' + build + ': 2챕터 저장본을 뜨지 못함'); bad++; continue; }
  n++; const pt = save.ptree; delete pt.ksv; const plant = ['lgK9', 'ctK5'].filter(id => !pt.ks.includes(id));
  for (const id of plant) { pt.ks.push(id); (save.ksLog = save.ksLog || []).push({ id, free: [], offer: [id], ch: 1, room: 16, t: 1 }); }
  const before = pt.ks.slice(), pend0 = save.ksPending || 0;
  try {
    G0.__rnd = rng(900 + n); run_('Math.random = __rnd');
    G.data = G0.blankData(); G.data.cur = save; G.run = null; G.b = null; G.sheet = null; G.dropQ = [];
    run_('toast = () => {}'); G0.resumeRun(); const run = G.run; if (!run) throw new Error('이어 하기 뒤 판이 없음');
    const T = G0.ptBuild(build); const gone = before.filter(id => !run.ptree.ks.includes(id)); const want = before.filter(id => KS_V1()[build][id] && T.nodes[id].fx !== KS_V1()[build][id]);
    const ok1 = JSON.stringify(gone.sort()) === JSON.stringify(want.sort()) && run.ptree.ksv === 2, ok2 = (run.ksPending || 0) === pend0 + want.length;
    handleSheets('careful', rng(n)); const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 2; playLoop('careful', rng(1000 + n), out);
    const ok3 = !out.bugs.length;
    console.log(`${ok1 && ok2 && ok3 ? '✓' : '✗'} ${build}: 찍어 둔 ${before.join(' ')} → 거둠 ${gone.join(' ') || '없음'}(기대 ${want.join(' ')}), 다시 고를 각인 ${pend0} → ${pend0 + want.length}, 지금 ${run.ptree.ks.join(' ')}, 판 끝 ${G.scr} 오류 ${out.bugs.length}`);
    if (!(ok1 && ok2 && ok3)) bad++;
  } catch (e) { console.log('✗ ' + build + ': 예외 ' + e.message); bad++; }
}
function KS_V1() { return run_('KS_V1'); }
console.log(`ks-m4: 저장본 ${n}개, 실패 ${bad}`); process.exitCode = bad ? 1 : 0;
