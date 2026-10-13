'use strict';
/* 보스 처치 속도·대응 측정 (10월 14일). 직업이 보스를 몇 번의 행동에 쓰러뜨리는지, 보스 예고에 대응하는지 잰다.
   점수나 승률이 아니라 "판단이 생략되는 경로가 있는가"를 보는 진단이다. 규칙·수치는 바꾸지 않는다.
   - 게임의 지금 세기(SIT_REAL=1), 장비 없음, 합법 능력치 예산(statRecommend), 갈래 기둥 빌드(sitqa.buildOf)
   - 장착: 사람처럼 고른 장착(equipFor) + 열린 칸 가운데 무작위 4칸 조합(REPS개). 시작 스킬 2개는 항상 낀다
   - 모드 normal: 생존 그대로. immortal: 생명력을 크게 늘려 죽지 않게 하고 순수한 처치 속도(잠재력)를 본다
   실행: SIT_CLS=hunter SIT_CH=1 node tools/boss-pace.js [조합 수=24] [DGDIR=. | 06a2]  → JSON 한 줄씩
   지표: acts(처치까지 내 행동 수), cum4·cum5(행동 4·5번째까지 보스 생명력을 깎은 비율), tele(보스가 예고한 강타 수), resp(내가 막거나 피하거나 끊은 수) */
process.env.DGDIR = process.env.DGDIR || '06a2'; process.env.SIT_REAL = '1';
const S = require('./sitqa.js'); const D = require('./dgqa.js'); const Q = require('./qa.js'); const SITS = require('./situations.js');
const G0 = S.G0, run_ = D.run_;
const CLS = process.env.SIT_CLS, CH = +(process.env.SIT_CH || 1), REPS = +(process.argv[2] || 24), PK = process.env.PK || 'careful';
const SIT = (CH >= 3 ? SITS.SIT3 : CH >= 2 ? SITS.SIT2 : SITS.SIT).find(x => x.room && x.room.boss && x.cat === '거구' && /챕터 보스 레벨/.test(x.n));
const LVS = CH >= 3 ? [16] : CH >= 2 ? [10] : [5];
const T = G0.TREE2[CLS], SKL = G0.SKILLS2[CLS];
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function fightPace(bd, eq, seed, immortal) {
  const r = D.rng(seed); G0.__rnd = D.rng(seed * 31 + 7); run_('Math.random = __rnd');
  const st = S.statsOf(bd.lv); const p = G0.mkPlayer(CLS, {}, st, T.starters.concat(eq)); p.lv = bd.lv; G0.applyStats(p, st);
  if (immortal) { p.hpMax *= 60; } p.hp = p.hpMax; p.st = p.stMax;
  const room = JSON.parse(JSON.stringify(SIT.room)); const bossKind = room.boss; room.boss = true; room.lv = SIT.lv[bd.lv] || SIT.lv[Object.keys(SIT.lv)[0]]; room.floor = 13;
  if (CH >= 2) { room.ch = CH; room.names = run_('ENEMY_NAMES')[CH]; } room.en = room.en || [];
  const b = G0.roomBattle(p, room, bossKind, seed); b.rngF = r; b.stepMode = false;
  const P = Q.PERSONAS[PK]; const mem = {}; let n = 0;
  while (!b.over && n++ < 250) {
    const sr = r() < (P.mech || 0.5) ? Q.sigRule(b, r) : null;
    let [a, t] = D.ch2Pre(b, P, r) || D.ch3Pre(b, P, r) || sr || (P.look ? Q.lookahead(b, P, r) : Q.heuristic(b, P, r, mem));
    [a, t] = D.ch2Post(b, P, r, a, t);
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[0].id; t = null; }
    try { G0.playerAct(b, a, t); } catch (e) { return { bug: e.message }; }
  }
  const boss = b.en.find(x => x.boss) || {}; const hpMax = boss.hpMax || 1;
  let idx = 0, dmg = 0; const cum = {}; let tele = 0, resp = 0;
  for (const x of b.rec) {
    if (x.k === 'act') { idx++; if (['guard', 'dodge', 'parry'].includes(x.a)) resp++; }
    else if (x.k === 'dealt' && x.role === 'boss') { dmg += x.d || 0; cum[idx] = dmg; }
    else if (x.k === 'bigfire' && x.role === 'boss') tele++;
    else if (x.k === 'break' && x.role === 'boss') resp++;
  }
  const at = k => { let v = 0; for (let i = 1; i <= k; i++) if (cum[i] != null) v = cum[i]; return Math.min(1, v / hpMax); };
  return { win: b.over === 'win' ? 1 : 0, acts: idx, rounds: b.round || 0, cum3: at(3), cum4: at(4), cum5: at(5), tele, resp, hp: b.p.hp / b.p.hpMax, phase: boss.phase || 1 };
}
function combos(open, k, rnd, n) { const out = [], seen = new Set(); let guard = 0; while (out.length < n && guard++ < n * 20) { const a = open.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } const c = a.slice(0, Math.min(k, a.length)).sort(); const key = c.join(); if (!seen.has(key)) { seen.add(key); out.push(c); } } return out; }
const rows = [];
for (const lv of LVS) for (const br of T.branches) for (const col of [0, 1]) {
  const bd = S.buildOf(br, col, lv); const rnd = mulberry(lv * 1000 + col * 7 + br.length);
  const sets = [['사람', S.equipFor(bd, SIT)]].concat(combos(bd.open, G0.EQUIP_SLOTS2, rnd, REPS).map((c, i) => ['무작위' + i, c]));
  for (const [name, eq] of sets) for (const immortal of [false, true]) {
    const o = fightPace(bd, eq, 7000 + lv * 13 + col, immortal); if (o.bug) { rows.push({ bug: o.bug }); continue; }
    rows.push(Object.assign({ cls: CLS, ch: CH, lv, br, col, set: name === '사람' ? '사람' : '무작위', immortal: immortal ? 1 : 0, eq: eq.join('+') }, o));
  }
}
for (const r of rows) console.log(JSON.stringify(r));
