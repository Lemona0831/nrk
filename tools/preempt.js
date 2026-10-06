/* 사냥꾼 연속 두 행동 가설 검증 (목표 3단계, 10월 7일)
   node tools/preempt.js <직업> <variant: double|order> <판 수> [mix]
   double = 지금 엔진(가속이면 라운드 맨 앞에서 두 번), order = 가속이 순서만 앞으로(다른 직업과 같은 가속)
   지표: 승률 · 점수(sitqa와 같은 식), 라운드당 준 피해 · 내 행동 수, 선제(아직 움직이지 않은 적을 그 라운드 행동 전에 쓰러뜨리거나 큰 공격을 끊음) */
const cls = process.argv[2] || 'hunter', variant = process.argv[3] || 'double', N = +(process.argv[4] || 4), MIX = process.argv[5] === 'mix';
process.env.SIT_CLS = cls; process.env.DGDIR = process.env.DGDIR || '06a2';
const root = require('path').join(__dirname, '..');
const Sq = require(root + '/tools/sitqa.js'); const Q = require(root + '/tools/qa.js'); const D = require(root + '/tools/dgqa.js');
const { SIT } = require(root + '/tools/situations.js');
const G0 = Sq.G0; const run_ = D.run_;
if (variant === 'order') {
  const src = G0.roundOrder.toString(); const a = src.indexOf("if (p.s.haste && p.build === 'hunter')"); const z = src.indexOf('if (consume) {', a);
  if (a < 0 || z < 0) throw new Error('roundOrder 모양이 바뀜');
  run_('roundOrder = ' + src.slice(0, a) + src.slice(z));
}
const BIG = ['heavy', 'charge', 'burn', 'chant', 'chanting', 'explode', 'fuse', 'erupt', 'reflect', 'aim', 'sacrifice', 'retprep'];
const T = G0.TREE2[cls];
function fight(bd, sit, seed) {
  const r = D.rng(seed); G0.__rnd = D.rng(seed * 31 + 7); run_('Math.random = __rnd');
  const st = Sq.statsOf(bd.lv); const p = G0.mkPlayer(cls, {}, st, T.starters.concat(Sq.equipFor(bd, sit))); p.lv = bd.lv; G0.applyStats(p, st); p.hp = p.hpMax; p.st = p.stMax;
  const sp = sit.p || {}; if (sp.hp) p.hp = Math.round(p.hpMax * sp.hp); if (sp.st != null) p.st = sp.st; for (const k in (sp.s || {})) p.s[k] = { stacks: sp.s[k], until: 1e9, dur: 1e9 };
  const room = JSON.parse(JSON.stringify(sit.room)); const bossKind = room.boss || null; if (room.boss) room.boss = true;
  room.lv = (sit.lv && sit.lv[bd.lv]) || Sq.MLV[bd.lv]; room.floor = 13; if (!room.en) room.en = [];
  const b = G0.roomBattle(p, room, bossKind, seed); b.rngF = r; b.stepMode = true;
  const P = Q.PERSONAS[process.env.PK || 'careful']; const mem = {}; let n = 0; const m = { acts: 0, preKill: 0, preCut: 0, dealt: 0, doubles: 0 };
  G0.runUntilPlayer && b.waiting && (b.waiting = false);
  while (!b.over && n++ < 250) {
    const pend = (b.queue || []).filter(id => id !== 'p').map(id => b.en.find(e => e.id === id)).filter(e => e && e.alive && e.intent);
    const snap = pend.map(e => ({ e, big: BIG.includes(e.intent.k), atk: G0.intentBadge ? ['atk', 'hv'].includes((G0.intentBadge(b, e) || {}).cls) : true }));
    const ehp = b.en.reduce((s, e) => s + Math.max(0, e.alive ? e.hp : 0), 0); const wasDouble = b.pDouble === b.round;
    let [a, t] = D.ch2Pre(b, P, r) || (r() < (P.mech || 0.5) ? Q.sigRule(b, r) : null) || (P.look ? Q.lookahead(b, P, r) : Q.heuristic(b, P, r, mem));
    [a, t] = D.ch2Post(b, P, r, a, t);
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && x.id !== 'flee'); a = L[0].id; t = null; }
    try { G0.playerAct(b, a, t); } catch (e) { return { win: 0, bug: e.message }; }
    m.acts++; if (wasDouble) m.doubles++;
    m.dealt += Math.max(0, ehp - b.en.reduce((s, e) => s + Math.max(0, e.alive ? e.hp : 0), 0));
    for (const x of snap) { if (!x.e.alive) { if (x.atk || x.big) m.preKill++; } else if (x.big && !(x.e.intent && BIG.includes(x.e.intent.k))) m.preCut++; }
    if (b.waiting && !b.over) { b.waiting = false; G0.runUntilPlayer(b); }
  }
  return { win: b.over === 'win' ? 1 : 0, hp: b.p.hp / b.p.hpMax, rounds: b.round || 0, m };
}
const mixOpen = lv => { // 기동과 저격 · 연사를 번갈아(사다리: 갈래마다 윗줄부터)
  const out = []; const brs = cls === 'hunter' ? ['기동', '저격'] : T.branches.slice(0, 2); const rows = { [brs[0]]: 0, [brs[1]]: 0 };
  for (let k = 0; k < Math.min(lv, 10); k++) { const br = brs[k % 2]; rows[br]++; const row = G0.SKILLS2[cls].filter(s => s.b === br && s.row === rows[br]); if (row[0]) out.push(row[0].id); }
  return out; };
const builds = [];
for (const lv of (process.env.LVS || '5,10').split(',').map(Number)) {
  if (MIX) { builds.push({ br: 'mix', col: 0, lv, open: mixOpen(lv) }); for (const br of T.branches) builds.push(Sq.buildOf(br, 0, lv)); }
  else for (const br of T.branches) for (const col of [0, 1]) builds.push(Sq.buildOf(br, col, lv));
}
const res = {};
for (const bd of builds) { const k = bd.lv + ':' + bd.br + (MIX ? '' : bd.col); const R = res[k] = res[k] || { n: 0, w: 0, sc: 0, rounds: 0, acts: 0, preKill: 0, preCut: 0, dealt: 0, doubles: 0, bug: 0 };
  for (const sit of SIT) for (let i = 0; i < N; i++) { const o = fight(bd, sit, 1000 + sit.id * 97 + i * 13); R.n++; if (o.bug) { R.bug++; continue; } R.w += o.win; R.sc += o.win ? 0.4 + 0.4 * o.hp + 0.2 * Math.max(0, Math.min(1, 1 - ((o.rounds || 0) - 3) / 20)) : 0; R.rounds += o.rounds; for (const kk of ['acts', 'preKill', 'preCut', 'dealt', 'doubles']) R[kk] += o.m[kk]; } }
const f = (x, d = 1) => x.toFixed(d);
console.log(`${cls} ${variant}${MIX ? ' mix' : ''} N=${N} × ${SIT.length}상황`);
console.log('빌드        승률  점수  라운드  행동/R  피해/R  선제처치/R  선제끊기/R  두번째차례%');
for (const [k, R] of Object.entries(res)) console.log(k.padEnd(10), f(R.w / R.n * 100, 0).padStart(5) + '%', f(R.sc / R.n * 100, 1).padStart(5), f(R.rounds / R.n).padStart(6), f(R.acts / R.rounds, 2).padStart(7), f(R.dealt / R.rounds).padStart(7), f(R.preKill / R.rounds, 3).padStart(10), f(R.preCut / R.rounds, 3).padStart(10), f(R.doubles / R.acts * 100, 0).padStart(9), R.bug ? 'bug ' + R.bug : '');
const all = Object.values(res).reduce((a, R) => { for (const k in R) a[k] = (a[k] || 0) + R[k]; return a; }, {});
console.log('전체'.padEnd(10), f(all.w / all.n * 100, 0).padStart(5) + '%', f(all.sc / all.n * 100, 1).padStart(5), f(all.rounds / all.n).padStart(6), f(all.acts / all.rounds, 2).padStart(7), f(all.dealt / all.rounds).padStart(7), f(all.preKill / all.rounds, 3).padStart(10), f(all.preCut / all.rounds, 3).padStart(10), f(all.doubles / all.acts * 100, 0).padStart(9));
if (process.env.OUTJSON) require('fs').writeFileSync(process.env.OUTJSON, JSON.stringify(res));
