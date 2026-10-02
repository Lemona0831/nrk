/* ===== 저장본 이주 점검 (0.6b 단계 0, 구현계획 "0.6a 저장본이 오류 없이 열린다")
   지인 사이트(루트, 0.6a) 코드로 여러 시점의 이어 하기 저장본을 만들고, next/ 코드로 열어 끝까지 이어 가 본다.
   node tools/savecheck.js make   → 루트 코드로 저장본을 만든다 (tools/saves06a.json, 저장소에 올리지 않는다)
   node tools/savecheck.js check  → next/ 코드로 저장본마다 이어 하기를 누르고, 성향대로 끝까지 진행한다 */
const fs = require('fs'), path = require('path');
const mode = process.argv[2] || 'check';
const FILE = path.join(__dirname, 'saves06a.json');
if (mode === 'make') process.env.DGDIR = '.';
const D = require('./dgqa.js');
const { G0, OPT, playChar, playLoop, handleSheets, click, rng, run_ } = D;
const BUILDS = Object.keys(G0.BUILDS);
run_('var window = { scrollTo() { }, innerWidth: 1280, innerHeight: 800, scrollY: 0, addEventListener() { } };'); // 화면이 없는 vm에서 정산·상점 버튼이 부르는 창 함수만 둔다

if (mode === 'make') {
  const saves = [];
  const take = (G, why) => { if (G.data.cur) saves.push({ why, build: G.run.build, cur: JSON.parse(JSON.stringify(G.data.cur)) }); };
  BUILDS.forEach((build, i) => {
    let got = {};
    OPT.onStep = G => { const f = G.run.room; if (!got.mid && f >= 5 && G.run.doors) { got.mid = 1; take(G, '방 사이 ' + f + '층'); } if (!got.low && f >= 12 && G.run.doors) { got.low = 1; take(G, '방 사이 ' + f + '층'); } };
    OPT.onTurn = (G, n) => { if (!got.fight && n === 3 && G.run.room >= 3) { got.fight = 1; G0.saveBattle(); take(G, '전투 중 ' + G.run.room + '층'); } };
    // 보스까지 가는 판을 찾을 때까지 숙련으로 돌린다
    for (let s = 0; s < 40; s++) {
      got = {}; const n0 = saves.length;
      const out = playChar('expert', build, 9000 + i * 101 + s * 7);
      if (out.res !== 'clear') { saves.length = n0; continue; }
      const G = G0.__G; take(G, '정산');
      click('settleok'); handleSheets('expert', rng(1)); take(G, '상점');
      click('shopleave'); take(G, '챕터 설문');
      G0.finishSurvey({ fun: 4, note: '' }); take(G, '2챕터 대기');
      break;
    }
  });
  OPT.onStep = OPT.onTurn = null;
  fs.writeFileSync(FILE, JSON.stringify({ v: run_('VERSION'), at: Date.now(), saves }));
  console.log('저장본 ' + saves.length + '개 → ' + path.relative(process.cwd(), FILE));
  const by = {}; saves.forEach(x => { const k = x.why.replace(/ \d+층/, ''); by[k] = (by[k] || 0) + 1; }); console.log(by);
} else {
  const { saves } = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const G = G0.__G; let bad = 0, done = 0;
  saves.forEach((sv, i) => {
    const errs = [];
    try {
      G0.__rnd = rng(700 + i); run_('Math.random = __rnd');
      G.data = G0.blankData(); G.data.cur = JSON.parse(JSON.stringify(sv.cur)); G.run = null; G.b = null; G.sheet = null; G.dropQ = [];
      G0.resumeRun();
      if (!G.run) throw new Error('이어 하기 뒤 캐릭터가 없음');
      const ph = G.run.phase || 'run';
      if (G.scr === 'run') {
        if (G.b && !G.b.over) { // 전투 중 저장본: 남은 전투를 마저 한다
          let n = 0; while (!G.b.over && n++ < 300) { const L = G0.actionList(G.b).filter(x => x.ok && x.id !== 'flee'); G0.playerAct(G.b, L[0].id, null); }
          G0.battleContinue(); handleSheets('expert', rng(i));
        }
        const out = { bugs: [], rooms: [], acts: 0 }; playLoop('expert', rng(800 + i), out);
        errs.push(...out.bugs);
      } else if (!['settle', 'shop', 'survey', 'wait'].includes(G.scr)) errs.push('화면 ' + G.scr + ' (단계 ' + ph + ')');
      G0.render();
    } catch (e) { errs.push('예외 ' + (e && e.message)); }
    done++;
    if (errs.length) { bad++; console.log('✗ ' + sv.build + ' ' + sv.why + ': ' + errs.slice(0, 3).join(' / ')); }
  });
  console.log(`저장본 ${done}개 열기, 오류 ${bad}개`);
  process.exitCode = bad ? 1 : 0;
}
