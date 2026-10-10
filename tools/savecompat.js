/* ===== 옛 저장본 → 현재 코드 이어하기 점검 (10월 10일 0.6a.2-95, 완료 조건 7번)
   옛 커밋의 06a2 코드를 꺼내 Node vm에서 돌려 여러 시점의 이어 하기 저장본(G.data.cur)을 만들고, 지금 코드(06a2/)로 이어 가 본다.
   앞서 tools/save_compat*.py(Playwright)는 0.6a.2-51 코드로 방 사이 · 정산 · 상점 · 전투 도중만 다뤘다. 이 도구는 그 밖의 시점을 다룬다:
   설문 단계, 2챕터 방 사이 · 전투 도중, 3챕터, 해금 2 · 3, 가혹 · 표식, 각인 고르는 중 · 도박 뒤 상점 · 운명의 저울.
   node tools/savecompat.js all [라벨…]   : 옛 커밋을 꺼내(git archive) 저장본을 만들고 현재 코드로 점검한다
   node tools/savecompat.js make <라벨> <옛 06a2 폴더>   : (내부) 옛 코드로 저장본을 만든다
   node tools/savecompat.js check [라벨…] : (내부) 이미 만든 저장본을 현재 코드로 점검한다
   저장본 파일은 저장소 밖(임시 폴더)에 둔다. 만든 뒤 tools/eng.gen.js를 06a2로 되돌린다. */
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const TMP = process.env.SAVECOMPAT_DIR || path.join(os.tmpdir(), 'nrk-savecompat');
// 옛 커밋 목록: label은 시나리오 묶음 이름. sha 시점의 코드에 없는 기능은 시나리오가 건너뛴다.
const SPECS = [
  { label: 'ch2', sha: '27ddb58', what: '2챕터 엔진 직후(0.6a.2-44, 10월 7일 02:50)', from: 2, builds: null, kinds: ['walk', 'end'] },
  { label: 'h23', sha: 'fed100b', what: '해금 2 · 3 직업이 들어온 직후(0.6a.2-54, 10월 7일 23:52)', from: 1, builds: ['confessor', 'bloodmage'], kinds: ['walk', 'clear'] },
  { label: 'h23c2', sha: 'fed100b', what: '같은 코드로 2챕터에서 시작', from: 2, builds: ['confessor', 'bloodmage'], kinds: ['walk', 'end'] },
  { label: 'ch3', sha: 'f221cb1', what: '3챕터 · 도박 · 각인 · 가혹이 있던 때(0.6a.2-65, 10월 8일 09:23)', from: 3, builds: null, kinds: ['walk', 'end'] },
  { label: 'gam', sha: 'f221cb1', what: '같은 코드로 2챕터를 깬 직후 상점 · 각인 · 도박 · 운명의 저울', from: 2, builds: ['assassin', 'warden', 'hunter', 'spellblade', 'confessor'], kinds: ['gamble', 'fate'] },
  { label: 'hard', sha: '8e3a281', what: '가혹 모드(0.6a.2-68, 10월 8일 13:38)', from: 1, builds: ['assassin', 'monk', 'bloodmage'], kinds: ['walk'], env: { MODE: 'hard' } },
  { label: 'mark', sha: '8e3a281', what: '표식 도전 2 · 3챕터(0.6a.2-68)', from: 2, builds: ['assassin', 'warden', 'hunter'], kinds: ['walk'], env: { MARKCH: '2', MARKS: 'dmg,hp,flask' } },
  { label: 'mark3', sha: '8e3a281', what: '표식 도전 3챕터 가혹', from: 3, builds: ['spellblade', 'monk'], kinds: ['walk'], env: { MARKCH: '3', MARKS: 'elite,boss', MODE: 'hard' } },
];
const sfile = l => path.join(TMP, 'saves_' + l + '.json');

function loadDriver() { return require('./dgqa.js'); }

if (process.argv[2] === 'make') {
  const label = process.argv[3]; const spec = SPECS.find(s => s.label === label);
  const D = loadDriver(); const { G0, OPT, playChar, handleSheets, click, rng, run_ } = D; const G = G0.__G;
  const saves = []; const notes = [];
  if (run_('typeof AWK') === 'undefined') run_('var AWK = { settleFrom: 99, campFrom: 99, offer: 3 }'); // 각인이 없던 옛 코드에서도 dgqa의 챕터 건너뛰기가 돌게 한다(없는 기능은 쓰지 않는다)
  const clone = x => JSON.parse(JSON.stringify(x));
  const take = why => { try { if (G0.saveCur) G0.saveCur(); } catch (e) { } if (G.data && G.data.cur && G.run) saves.push({ label, why, build: G.run.build, ch: G.run.ch || 1, cur: clone(G.data.cur) }); };
  const KEYS = G0.CLASS_KEYS ? G0.CLASS_KEYS() : Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && !G0.BUILDS[k].soon);
  const builds = (spec.builds || KEYS).filter(b => G0.BUILDS[b]);
  class Stop extends Error { }
  const walk = (build, seed) => {
    let got = {};
    OPT.onStep = G => { const f = G.run.room; if (!got.mid && f >= 5 && G.run.doors) { got.mid = 1; take('방 사이 ' + f + '층'); } if (!got.low && f >= 13 && G.run.doors) { got.low = 1; take('방 사이 ' + f + '층(하층)'); } if (!got.path && G.run.cross && !G.run.cur) { got.path = 1; take('갈래길 앞 ' + f + '층'); } if (got.mid && got.low && got.fight && got.path) throw new Stop(); };
    OPT.onTurn = (G, n) => { if (!got.fight && n === 3 && G.run.room >= 3) { got.fight = 1; G0.saveBattle(); take('전투 중 ' + G.run.room + '층'); } };
    try { playChar('expert', build, seed); } catch (e) { if (!(e instanceof Stop)) notes.push(build + ' walk: ' + e.message); }
    OPT.onStep = OPT.onTurn = null;
  };
  // 첫 걸음에서 멈춰 직접 상태를 만든다(앞 챕터를 깬 직후 상점 같은 것). onStep의 첫 호출은 1층 문 고르기 앞이다.
  const at1 = (build, seed, fn) => { OPT.onStep = G => { OPT.onStep = null; fn(G); throw new Stop(); }; try { playChar('expert', build, seed); } catch (e) { if (!(e instanceof Stop)) notes.push(build + ': ' + e.message); } OPT.onStep = null; };
  for (const [i, build] of builds.entries()) {
    for (const kind of spec.kinds) {
      try {
        if (kind === 'walk') { for (let s = 0; s < 6 && saves.filter(x => x.build === build).length < 3; s++) walk(build, 4100 + i * 31 + s); }
        if (kind === 'clear') { // 1챕터를 깬 판을 찾아 정산 → 상점 → 설문 → 2챕터 대기까지 저장
          for (let s = 0; s < 60; s++) {
            const n0 = saves.length; const out = playChar('expert', build, 9000 + i * 101 + s * 7);
            if (out.res !== 'clear') { saves.length = n0; continue; }
            take('정산'); click('settleok'); handleSheets('expert', rng(1)); take('상점'); click('shopleave'); take('챕터 설문'); G0.finishSurvey({ fun: 4, note: '' }); take('2챕터 대기'); break;
          }
        }
        if (kind === 'end' || kind === 'gamble' || kind === 'fate') {
          at1(build, 5200 + i, G => {
            const run = G.run;
            if (kind === 'end') { take('챕터 첫 방 앞 ' + (run.ch || 1) + '챕터'); return; }
            if (kind === 'fate') {
              if (!G0.ROOM_TYPES.fate) { notes.push('fate: 이 코드에 운명의 저울이 없음'); return; }
              run.doors[0] = G0.mkRoom(run, 'fate', run.room); take('운명의 저울 문 앞'); G0.chooseDoor(0); take('운명의 저울 방');
              const bag = run.bag.map(u => run.inv[u]).filter(Boolean); if (bag.length) { click('fate', bag[0].uid); take('운명의 저울 결과 창'); }
              return;
            }
            // gamble: 정산 → 각인 → 상점 → 도박 → 떠남 → 설문
            run.rooms.push({ room: 24, type: 'boss', res: 'win', ch: run.ch || 1 }); G0.startSettle(run); take('정산 ' + run.ch + '챕터'); click('settleok');
            if (G.sheet && G.sheet.kind === 'awk') { take('각인 고르는 중'); click('awkpick', (run.awkOffer || [])[0]); take('각인 고른 뒤'); }
            handleSheets('expert', rng(2)); if (run.phase === 'shop') { take('상점 ' + run.ch + '챕터'); run.gold = Math.max(run.gold || 0, 600); const slot = (run_('GAMBLE.slots') || [])[0]; if (slot) { click('gamble', slot); take('도박 뒤 상점'); handleSheets('expert', rng(3)); take('도박 장비 처리 뒤 상점'); } }
            click('shopleave'); take('챕터 설문 ' + run.ch + '챕터'); G0.finishSurvey({ fun: 4, note: '' }); take('다음 챕터 대기');
          });
        }
      } catch (e) { notes.push(build + ' ' + kind + ': ' + e.message); }
    }
  }
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(sfile(label), JSON.stringify({ label, v: run_('VERSION'), builds, saves, notes }));
  const by = {}; saves.forEach(x => { by[x.why.replace(/ \d+층.*/, '').replace(/ \d챕터/, '')] = (by[x.why.replace(/ \d+층.*/, '').replace(/ \d챕터/, '')] || 0) + 1; });
  console.log('[' + label + '] ' + run_('VERSION') + ' 저장본 ' + saves.length + '개', JSON.stringify(by), notes.length ? '메모: ' + notes.slice(0, 4).join(' | ') : '');
  process.exit(0);
}

if (process.argv[2] === 'check') {
  const labels = process.argv.slice(3).length ? process.argv.slice(3) : SPECS.map(s => s.label);
  const D = loadDriver(); const { G0, OPT, playLoop, handleSheets, click, rng, run_ } = D; const G = G0.__G;
  let all = 0, bad = 0; const rows = [];
  // render()는 DOM이 없으면 아무것도 하지 않으므로, 화면 문자열을 만드는 함수(vHeader · 본문 · vSheet)를 직접 불러 글에 undefined · NaN이 섞이는지 본다
  const VIEW = { title: 'vTitle', create: 'vCreate', settle: 'vSettle', shop: 'vShop', wait: 'vWait', rank: 'vRank', records: 'vRecords', goals: 'vGoals', mark: 'vMark', tree: 'vTreePage', dead: 'vDead', survey: 'vSurvey', final: 'vFinal' };
  const views = () => { const out = []; const f = G.scr === 'run' ? (G.b ? 'vBattle' : 'vRunMap') : VIEW[G.scr]; if (f) out.push([f, run_(f + '()')]); out.push(['vHeader', run_('vHeader()')]); out.push(['vSheet', run_('vSheet()')]); return out; };
  const viewErr = tag => { const e = []; try { for (const [n, h] of views()) { const m = /undefined|NaN|\[object|Infinity|null</.exec(String(h || '')); if (m) e.push(tag + ' ' + n + ' 글에 "' + m[0] + '"'); } } catch (x) { e.push(tag + ' 화면 만들기 예외 ' + x.message); } return e; };
  const invariants = run => { const e = []; const T = run.tree; if (T && !(run.marks && run.marks.length) && !run.markCh) { if (T.pts < 0 || T.pts + T.open.length > (run.lv || 1) + 0) e.push('트리 포인트 어긋남 pts ' + T.pts + ' + 연 칸 ' + T.open.length + ' > Lv' + run.lv); } if (G0.bagUsed && G0.bagUsed(run) > run_('BAG_MAX')) e.push('가방이 넘침'); if (run.p && run.p.skills && G0.BUILDS[run.build].v2 && JSON.stringify(run.p.skills) !== JSON.stringify(G0.v2Equip(run))) e.push('장착 스킬이 v2Equip와 다름'); return e; };
  for (const label of labels) {
    if (!fs.existsSync(sfile(label))) { console.log('[' + label + '] 저장본 없음(만들지 못함)'); continue; }
    const F = JSON.parse(fs.readFileSync(sfile(label), 'utf8'));
    F.saves.forEach((sv, i) => {
      const errs = []; const info = [];
      try {
        G0.__rnd = rng(7000 + i); run_('Math.random = __rnd');
        G.data = G0.blankData(); G.data.unlAll = 1; G.data.cur = JSON.parse(JSON.stringify(sv.cur)); G.run = null; G.b = null; G.sheet = null; G.dropQ = []; G.scr = 'title';
        const keys0 = Object.keys(sv.cur.run || sv.cur);
        G0.resumeRun();
        if (!G.run) throw new Error('이어 하기 뒤 캐릭터가 없음');
        const run = G.run; const ph = run.phase || 'run';
        // 숫자 · 구조 점검: NaN, 빠진 칸
        const bad_ = []; for (const k of ['lv', 'xp', 'gold']) if (run[k] != null && !Number.isFinite(run[k])) bad_.push(k); if (!Number.isFinite(run.p.hpMax) || !Number.isFinite(run.p.hp)) bad_.push('hp');
        if (bad_.length) errs.push('숫자 이상 ' + bad_.join(','));
        for (const k of ['mode', 'legSeen', 'awk', 'tree', 'stats', 'cons']) if (run[k] == null && !(k === 'awk' || k === 'legSeen')) errs.push('빠진 칸 run.' + k);
        if (!Array.isArray(run.awk)) errs.push('빠진 칸 run.awk'); if (!Array.isArray(run.legSeen)) errs.push('빠진 칸 run.legSeen');
        info.push(G.scr + (G.sheet ? '+' + G.sheet.kind : '') + '/' + ph);
        errs.push(...invariants(run)); errs.push(...viewErr('이어 직후'));
        if (G.scr === 'run') {
          if (G.b && !G.b.over) { let n = 0; while (!G.b.over && n++ < 400) { const L = G0.actionList(G.b).filter(x => x.ok && x.id !== 'flee'); if (!L.length) break; G0.playerAct(G.b, L[0].id, null); } G0.battleContinue(); handleSheets('expert', rng(i)); }
          else if (G.sheet && G.sheet.kind === 'awk') { click('awkpick', (run.awkOffer || [])[0]); }
          else if (G.sheet) handleSheets('expert', rng(i));
          errs.push(...viewErr('이어 한 뒤'));
          const out = { bugs: [], rooms: [], acts: 0, fights: [] }; OPT.chapters = Math.max(run.ch || 1, 1); playLoop('expert', rng(8000 + i), out); OPT.chapters = 1; errs.push(...out.bugs); info.push('→' + (G.scr === 'settle' ? '챕터 돌파' : G.scr === 'dead' ? '쓰러짐' : G.scr) + ' ' + (G.run.room || 0) + '층 Lv' + G.run.lv);
        } else if (G.scr === 'settle') { click('settleok'); handleSheets('expert', rng(i)); errs.push(...viewErr('정산 뒤')); info.push('→' + G.scr + '/' + (G.run.phase || '')); if (G.run.phase === 'shop') { click('shopleave'); } if (G.run.phase === 'clearsv') G0.finishSurvey({ fun: 4, note: '' }); }
        else if (G.scr === 'shop') { click('shopleave'); G0.finishSurvey({ fun: 4, note: '' }); info.push('→' + G.scr + '/' + (G.run.phase || '')); }
        else if (G.scr === 'survey') { G0.finishSurvey({ fun: 4, note: '' }); info.push('→' + G.scr + '/' + (G.run.phase || '')); }
        else if (G.scr === 'wait') { click('nextch'); if (G.scr !== 'run') errs.push('다음 챕터로 내려가지 못함 ' + G.scr); else { OPT.chapters = (G.run.ch || 1); const out = { bugs: [], rooms: [], acts: 0, fights: [] }; playLoop('expert', rng(8100 + i), out); OPT.chapters = 1; errs.push(...out.bugs); info.push('→다음 챕터 ' + (G.run.ch || 1) + '챕터 ' + (G.scr === 'settle' ? '돌파' : G.scr === 'dead' ? '쓰러짐' : G.scr)); } }
        else errs.push('화면 ' + G.scr + ' (단계 ' + ph + ')');
        errs.push(...viewErr('끝'));
      } catch (e) { errs.push('예외 ' + (e && e.message) + (process.env.SC_STACK ? ' ' + e.stack.split(String.fromCharCode(10)).slice(0,5).join(' < ') : '')); }
      all++; if (errs.length) bad++;
      rows.push({ label, build: sv.build, why: sv.why, ok: !errs.length, info: info.join(' '), errs });
      if (errs.length) console.log('✗ [' + label + '] ' + sv.build + ' ' + sv.why + ': ' + errs.slice(0, 3).join(' / '));
    });
  }
  fs.mkdirSync(TMP, { recursive: true }); fs.writeFileSync(path.join(TMP, 'result.json'), JSON.stringify(rows));
  const by = {}; rows.forEach(r => { const k = r.label; by[k] = by[k] || { n: 0, bad: 0 }; by[k].n++; if (!r.ok) by[k].bad++; });
  console.log('저장본 ' + all + '개 열기, 오류 ' + bad + '개', JSON.stringify(by));
  process.exitCode = bad ? 1 : 0;
}

if (process.argv[2] === 'all') {
  const want = process.argv.slice(3); const specs = want.length ? SPECS.filter(s => want.includes(s.label)) : SPECS;
  fs.mkdirSync(TMP, { recursive: true });
  for (const s of specs) {
    const dir = path.join(TMP, 'code_' + s.sha); const site = path.join(dir, '06a2');
    if (!fs.existsSync(site)) { fs.mkdirSync(dir, { recursive: true }); const tar = cp.spawnSync('git', ['-C', ROOT, 'archive', s.sha, '06a2'], { maxBuffer: 1 << 28 }); if (tar.status) { console.log('[' + s.label + '] git archive 실패 ' + s.sha); continue; } cp.spawnSync('tar', ['-xf', '-', '-C', dir.split(path.sep).join('/')], { input: tar.stdout }); }
    const env = Object.assign({}, process.env, { DGDIR: site, DG_FROM: String(s.from), DG_LOCK: '1', DG_SOON: '1' }, s.env || {});
    const r = cp.spawnSync(process.execPath, [__filename, 'make', s.label], { env, encoding: 'utf8', timeout: 900000 });
    console.log((r.stdout || '').trim() + (r.status ? ' [실패 ' + r.status + '] ' + ((r.stderr || '').split('\n').slice(0, 4).join(' ')) : ''));
  }
  // 옛 코드로 엔진 사본을 덮어썼으니 지금 코드로 되돌린다
  cp.spawnSync(process.execPath, [path.join(__dirname, 'extract-engine.js'), '06a2'], { cwd: ROOT });
  const r2 = cp.spawnSync(process.execPath, [__filename, 'check'].concat(specs.map(s => s.label)), { env: Object.assign({}, process.env, { DGDIR: '06a2' }), encoding: 'utf8', timeout: 1800000 });
  console.log((r2.stdout || '').trim() + ((r2.stderr || '').trim() ? '\n' + r2.stderr.trim().split('\n').slice(0, 6).join('\n') : ''));
  process.exitCode = r2.status || 0;
}
