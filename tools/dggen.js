/* ===== 던전 생성 점검 (0.6b 단계 1, 기획서 11.3절 문을 뽑는 규칙, 11.12절 2챕터)
   1) 챕터마다 던전을 N번 만들어(문은 무작위로 고름) 규칙 위반을 센다.
   2) 여덟 직업이 1챕터 → 정산 → 상점 → 설문 → 2챕터 → 정산까지 전투를 강제로 이기며 지나간다. 오류를 센다.
   실행: node tools/dggen.js [N=10000] */
const N = +(process.argv[2] || 10000);
const { G0, run_, rng, click, handleSheets } = require('./dgqa.js');
const G = G0.__G;
const C_ = ch => run_(`chOf(${ch})`), roomMax = run_('roomMax');
const FIGHTS = ['normal', 'ambush', 'strong', 'treasure', 'trial'], RESTS = ['spring', 'shrine', 'altar', 'event'];
let bad = 0; const errs = {};
const fail = (k, ex) => { bad++; errs[k] = errs[k] || { n: 0, ex }; errs[k].n++; };

function genCheck(ch, seed) {
  G0.__rnd = rng(seed); run_('Math.random = __rnd');
  const C = C_(ch); const run = { id: 'gen', ch, p: { lv: 1 }, gold: 0, lv: 1, rooms: [], bag: [], inv: {}, acts: [], drops: [], swaps: [], deaths: [] };
  G.data = G0.blankData(); G.run = run; G0.dgInit(run);
  const seen = { u: {}, l: {} };
  for (let f = 1; f <= C.floors; f++) {
    if (f > 1) G0.advanceFloor();
    if (run.room !== f) { fail('층 번호', f + '≠' + run.room); return; }
    const fx = G0.fixedRoom(f, ch);
    const want = f === C.camp ? 'camp' : f === C.spring ? 'spring' : f === C.boss ? 'boss' : null;
    if (want) {
      if (!run.cur || run.cur.type !== want || run.doors) fail('고정 층', ch + '챕터 ' + f + '층 ' + (run.cur && run.cur.type));
      if (want === 'boss' && run.cur.lv !== C.mlvTop) fail('보스 레벨', run.cur.lv);
      run.cur = null; continue;
    }
    if (fx) fail('고정 층이 아님', f);
    const D = run.doors || []; const ts = D.map(d => d.type);
    const half = G0.isLower(f, ch) ? 'l' : 'u';
    if (D.length !== 3) fail('문 셋', ch + '챕터 ' + f + '층 ' + D.length);
    const nn = ts.filter(t => t !== 'normal'); if (new Set(nn).size !== nn.length) fail('같은 유형', ts.join());
    if (!ts.some(t => FIGHTS.includes(t))) fail('전투 방 없음', ts.join());
    for (const d of D) {
      if (d.ch !== ch) fail('방 챕터', d.ch);
      if (d.lv !== G0.mlvOf(f, ch)) fail('몬스터 레벨', f + ':' + d.lv);
      if (FIGHTS.includes(d.type) && !(d.en && d.en.length)) fail('적 없음', d.type);
      seen[half][d.type] = 1;
    }
    if (f === 1 && !(ts[0] === 'normal' && ts[1] === 'normal' && ['treasure', 'shrine'].includes(ts[2]))) fail('1층 규칙', ts.join());
    if (f === C.lower && !(ts[0] === 'normal' && ['ambush', 'strong'].includes(ts[1]) && RESTS.includes(ts[2]))) fail('하층 첫 층 규칙', ts.join());
    for (const [t, at, h] of [['spring', C.forceAt[0], 'u'], ['strong', C.forceAt[0], 'u'], ['spring', C.forceAt[1], 'l'], ['strong', C.forceAt[1], 'l']])
      if (f === at && !seen[h][t] && G0.typeOk(run, t, f)) fail('보정: ' + t + ' ' + h, ch + '챕터 ' + f + '층');
    const i = Math.floor(G0.__rnd() * D.length); G0.chooseDoor(i);
    const d = run.dg;
    for (const t of Object.keys(d.counts)) if (d.counts[t] > roomMax(t, ch)) fail('최대 개수 ' + t, ch + '챕터 ' + d.counts[t]);
    if (d.strong.u > C.strongHalf || d.strong.l > C.strongHalf) fail('강적 반 최대', JSON.stringify(d.strong));
    if (new Set(d.events).size !== d.events.length) fail('이벤트 중복', d.events.join());
    run.cur = null;
  }
}
const t0 = Date.now();
for (const ch of [1, 2]) for (let s = 0; s < N; s++) genCheck(ch, 100 + s * 7 + ch * 100003);
console.log(`던전 생성 ${N}번 × 2챕터, ${((Date.now() - t0) / 1000).toFixed(0)}초, 규칙 위반 ${bad}건`);
for (const k in errs) console.log('  ' + k + ': ' + errs[k].n + '건 (예: ' + errs[k].ex + ')');

/* 2) 강제 승리로 끝까지 지나기 */
function forceWin() {
  G0.enterRoom(); const b = G.b;
  for (let k = 0; k < 4; k++) for (const e of b.en) if (e.alive) { e.hp = 0; G0.killEnemy(b, e); } // 해골은 한 번 다시 일어선다
  G0.checkEnd(b); if (b.over !== 'win') throw new Error('강제 승리 실패');
  G0.battleContinue();
}
let walkBad = 0; const lvs = []; let evTurn = 0; const evSeen = {};
for (const build of Object.keys(G0.BUILDS)) {
  const out = [];
  try {
    G0.__rnd = rng(77 + build.length); run_('Math.random = __rnd');
    G.data = G0.blankData(); G.data.seenFoe = { abbot: 1, bellringer: 1, pilgrim: 1, cryptlord: 1 }; G.data.seenBoss = { abbot: 1, cryptlord: 1 }; G.data.seenCoach = true;
    G.cre = { name: 'gen' }; G.dropQ = []; G.b = null; G.sheet = null;
    G0.startRun(build); const run = G.run; G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run';
    const r = rng(5);
    for (let step = 0; step < 200 && !(G.scr === 'settle' && run.ch === 2); step++) {
      handleSheets('expert', r);
      if (G.scr === 'settle') { // 1챕터를 넘었다 → 정산 → 상점 → 설문 → 2챕터
        click('settleok'); handleSheets('expert', r); click('shopleave'); G0.finishSurvey({ fun: 4 });
        if (G.scr !== 'wait') throw new Error('설문 뒤 대기 화면이 아님: ' + G.scr);
        click('nextch'); if (run.ch !== 2 || G.scr !== 'run' || run.room !== 1 || !run.doors) throw new Error('2챕터 입장 실패');
        out.push('2챕터 입장 Lv' + run.lv + ' 골드 ' + run.gold); continue;
      }
      if (!run.cur && run.doors) { G0.chooseDoor(0); continue; }
      const R = run.cur; if (!R) throw new Error('방이 없음 ' + run.ch + '챕터 ' + run.room);
      if (!G0.ROOM_TYPES[R.type] || !G0.ROOM_TYPES[R.type].fight) { if (R.type !== 'boss') { const E0 = R.type === 'event' && G0.EVENTS.find(e => e.id === R.event); click(R.type === 'camp' || R.type === 'spring' ? 'rest' : R.type === 'shrine' ? 'shrine' : R.type === 'altar' ? 'altar' : 'event', E0 ? E0.opts[evTurn++ % E0.opts.length].id : 0); if (G.sheet && G.sheet.kind === 'swap') { const before = run.skills.slice(); click('swapdo', G.sheet.data.offer[0], { s: '0' }); if (run.skills[0] === before[0] || run.p.skills[0] !== run.skills[0]) throw new Error('스킬 바꾸기 실패'); evSeen.swap = (evSeen.swap || 0) + 1; } handleSheets('expert', r); if (G.sheet && G.sheet.kind === 'offer') { evSeen.trade = (evSeen.trade || 0) + 1; click('offerpick', run.bag[0]); handleSheets('expert', r); } if (E0) evSeen[E0.id] = (evSeen[E0.id] || 0) + 1; continue; } }
      forceWin();
    }
    if (!(G.scr === 'settle' && run.ch === 2)) throw new Error('2챕터 정산에 닿지 못함: ' + G.scr + ' ' + run.ch + '챕터 ' + run.room + '층');
    const S = run.settle; lvs.push(run.lv);
    out.push('2챕터 정산 ' + S.lines.map(x => x.n + ' ' + x.v).join(', ') + ' = ' + S.total + ', Lv' + run.lv);
    click('settleok'); handleSheets('expert', r); click('shopleave'); G0.finishSurvey({ fun: 4 });
    if (G.scr !== 'wait' || !/3챕터/.test(G0.curDesc(run))) throw new Error('3챕터 대기가 아님: ' + G0.curDesc(run));
    console.log('✓ ' + G0.BUILDS[build].n + ': ' + out.join(' / '));
  } catch (e) { walkBad++; console.log('✗ ' + build + ': ' + (e && e.message) + ' | ' + out.join(' / ')); }
}
console.log('지나며 고른 이벤트·창:', JSON.stringify(evSeen));
console.log(`끝까지 지나기 8직업, 오류 ${walkBad}개. 2챕터 끝 레벨 ${lvs.join(', ')} (모든 전투 방을 고름)`);
process.exitCode = bad || walkBad ? 1 : 0;
