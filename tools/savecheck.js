/* ===== 저장본 이주 점검 (0.6b 단계 0, 구현계획 "0.6a 저장본이 오류 없이 열린다")
   지인 사이트(루트, 0.6a) 코드로 여러 시점의 이어 하기 저장본을 만들고, next/ 코드로 열어 끝까지 이어 가 본다.
   node tools/savecheck.js make   → 루트 코드로 저장본을 만든다 (tools/saves06a.json, 저장소에 올리지 않는다)
   node tools/savecheck.js check  → next/ 코드로 저장본마다 이어 하기를 누르고, 성향대로 끝까지 진행한다. 2챕터를 기다리던 캐릭터는 2챕터로 내려가 끝까지 */
const fs = require('fs'), path = require('path');
const mode = process.argv[2] || 'check';
/* 0.8.0 6단계(10월 18일 만든 사람 승인, 질문 5): 24층 → 16층 판 옮기기. 옮긴 판의 보스 진입 레벨이 앵커(6 · 11 · 16) − 1 이상인지 본다.
   node tools/savecheck.js floor16 make <저장본.json> [--from3]   (DGDIR=<24층 사본>)
   node tools/savecheck.js floor16 check <저장본.json>
   실제 일은 tools/floor16-migrate-check.js가 한다 */
if (mode === 'floor16') { process.argv.splice(2, 1); require('./floor16-migrate-check.js'); return; }
/* 0.8.0 M4: 큰 각인 배치가 바뀐 옛 판 이어 하기(tools/savecheck-ksm4.js) */
if (mode === 'ks-m4') { require('./savecheck-ksm4.js'); return; }
/* 0.8.0 M5-0: 임시 액티브 트리 폐기 뒤 옛 판 이어 하기(tools/savecheck-atm5.js) */
if (mode === 'at-m5') { require('./savecheck-atm5.js'); return; }
/* 0.8.0 M8 전체 초기화(만든 사람 결정 10월 21일): 기본(check)은 초기화 시험이다 — 0.7.0 브라우저 저장 키(nrk_062_v1)만 있으면 오류 없이 새로 시작하고
   첫 화면에 안내 한 줄, 새 키(nrk_080_v1)가 있으면 그것을 열고, 옛 키는 지우지 않는다. 옛 0.6a 저장본 이주 점검은 node tools/savecheck.js legacy(tools/saves06a.json 필요) */
if (mode === 'check' || mode === 'reset') {
  const D = require('./dgqa.js'), G0 = D.G0, run_ = D.run_; const G = G0.__G; let n = 0; const fail = []; const ok = (c, m) => { n++; if (!c) fail.push(m); };
  const mem = init => { const s = Object.assign({}, init); return { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, _s: s }; };
  const boot = ls => { G0.__ls = ls; run_('localStorage = __ls'); G.resetNote = 0; G.localReadBlocked = false; G.localSaveError = null; G.data = G0.loadLocal(); return G.data; };
  const SK = run_('SKEY'), OLD = run_('SKEY_OLD');
  const old = JSON.stringify({ v: '0.7.0', runs: [{ id: 'r1' }], scen: {}, prog: {}, cur: { build: 'warden', room: 7, ch: 1, lv: 5 }, rank62: { r1: { id: 'r1' } } });
  { const ls = mem({ [OLD[0]]: old }); let d = null, err = null; try { d = boot(ls); } catch (e) { err = e; }
    ok(!err && d && !d.cur && !(d.runs || []).length && d.v === run_('VERSION'), '옛 키만 있으면 빈 새 자료로 시작(오류 없음)');
    ok(G.resetNote === 1, '옛 키가 있으면 안내 깃발'); G.scr = 'title'; let h = ''; try { h = G0.vTitle(); } catch (e) { h = 'ERR ' + e.message; } ok(/0\.8\.0부터 새로 시작합니다/.test(h), '첫 화면에 안내 한 줄');
    ok(ls._s[OLD[0]] === old && !(SK in ls._s), '옛 키는 지우지 않고, 읽기만으로 새 키를 만들지 않음'); }
  { const cur = JSON.stringify({ v: '0.8.0', runs: [{ id: 'n1' }], scen: {}, prog: {}, name: '새' }); const ls = mem({ [OLD[0]]: old, [SK]: cur }); const d = boot(ls);
    ok(d.name === '새' && (d.runs || []).length === 1 && !G.resetNote, '새 키가 있으면 그것을 열고 안내 없음'); G.scr = 'title'; ok(!/0\.8\.0부터 새로 시작합니다/.test(G0.vTitle()), '새 키로 이어 하면 안내 줄 없음'); }
  { const ls = mem({}); const d = boot(ls); ok(!G.resetNote && d && !d.cur, '처음 여는 브라우저는 안내 없이 새로 시작'); }
  { const ls = mem({ [SK]: '{깨짐' }); const d = boot(ls); ok(G.localReadBlocked && d && !d.cur, '새 키가 깨져 있으면 읽기를 막고(덮어쓰지 않음) 빈 자료'); }
  ok(run_('COL.runs') === 'runs80' && run_('BOARD') === 'board80' && run_("RSEASON.key['0.7.0'].rank") === 'rank62', '시즌 키: 기록 runs80 · 기록판 board80 · 랭킹 rank80, 옛 시즌 rank62는 관리자 결과 보기만');
  console.log('savecheck(초기화 시험): ' + n + '개 · 실패 ' + fail.length); for (const m of fail) console.log('  실패: ' + m); process.exitCode = fail.length ? 1 : 0; return;
}
if (mode === 'legacy') process.argv[2] = 'check';
const FILE = path.join(__dirname, 'saves06a.json');
if (mode === 'make') process.env.DGDIR = '.';
const D = require('./dgqa.js');
const { G0, OPT, playChar, playLoop, handleSheets, click, rng, run_ } = D;
const BUILDS = Object.keys(G0.BUILDS);

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
  const G = G0.__G; let bad = 0, done = 0; const wait2 = [];
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
      } else if (G.scr === 'wait') { // 1챕터를 깨고 기다리던 캐릭터: 2챕터로 내려가 끝까지 해 본다
        click('nextch'); if (G.run.ch !== 2 || G.scr !== 'run') errs.push('2챕터로 내려가지 못함');
        else { OPT.chapters = 2; const out = { bugs: [], rooms: [], acts: 0 }; playLoop('expert', rng(900 + i), out); OPT.chapters = 1; errs.push(...out.bugs); wait2.push(G.run.room + '층 ' + (G.scr === 'settle' ? '돌파' : '쓰러짐') + ' Lv' + G.run.lv); }
      } else if (!['settle', 'shop', 'survey'].includes(G.scr)) errs.push('화면 ' + G.scr + ' (단계 ' + ph + ')');
      G0.render();
    } catch (e) { errs.push('예외 ' + (e && e.message)); }
    done++;
    if (errs.length) { bad++; console.log('✗ ' + sv.build + ' ' + sv.why + ': ' + errs.slice(0, 3).join(' / ')); }
  });
  console.log(`저장본 ${done}개 열기, 오류 ${bad}개. 기다리던 캐릭터의 2챕터: ${wait2.join(', ')}`);
  process.exitCode = bad ? 1 : 0;
}
