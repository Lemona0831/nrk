'use strict';
/* S-5 2번 전투 끌기 · 피하기 점검 (10월 24일). 실행: node tools/stall-check.js [라운드=100] [--json 파일]
   진짜 방(mkRoom → roomBattle)을 끌기 성향으로 라운드 수만큼 몰고, 싸움이 끝나는지 · 광폭이 오는지 · 강적 시계가 파국에 닿는지를 적는다.
   성향: turtle(방어 → 흘리기 → 쉼) · parry(흘리기 → 방어 → 쉼) · zero(공격하지만 주는 피해 0) · evade(사냥꾼 몸 빼기 스킬) · stasis(원소술사 영겁의 정적) · hide(암살자 무영살) · flee(도망만).
   imm: 내 차례마다 생명력을 가득 채우고 쓰러지지 않게 한다(시계가 오래 끌렸을 때 어떻게 되는지 보려고). 쉼(pass)은 게임 행동이 아니다: 아무 효과 없는 행동 하나(방어 · 흘리기 없이 차례만 넘김)로 센다.
   버그(멈춤 · NaN · 음수 · 칸 넘침 · 라운드가 안 넘어감)가 있으면 1로 끝난다. 설계 질문(광폭 없음 · 끝없는 끌기)은 표로만 적는다 */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'); const E = D.G0, R_ = D.run_, G = E.__G;
const ROUNDS = +(process.argv.find(a => /^\d+$/.test(a)) || 100); const JI = process.argv.indexOf('--json'); const JOUT = JI > 0 ? process.argv[JI + 1] : null;
const FC = R_('FOE_CLOCK'), ROLES = R_('ROLES'), FLOOR_BOSS = R_('FLOOR_BOSS');
const BUGS = []; const bug = (m) => BUGS.push(m);
R_('globalThis.__zero = 0; { const H = hurtEnemy; hurtEnemy = function (b, e, amt) { if (globalThis.__zero) { arguments[2] = 0; } return H.apply(this, arguments); }; }'); // zero 성향: 적에게 가는 피해를 모두 0으로
const KIT = { hunter: ['h5_dodge', 'h5_hide', 'h5_counter', 'h5_runshot'], assassin: ['a_muyeong', 'a_yeonmak', 'a_heulbe'], elementalist: ['e5_stasis', 'e5_barrier'] };
function newRun(cls, ch, seed) {
  D.seedWorld(seed); G.data = E.blankData(); G.data.unlAll = 1; G.data.seenClk = 1; G.data.seenFoe = {}; G.cre = { name: 'stall' }; G.dropQ = []; G.b = null; G.sheet = null;
  E.startRun(cls); const run = G.run; delete run.alloc; run.ch = ch; run.clears = ch - 1; run.path = 'main'; run.boss = R_('chData')(ch).boss;
  run.dg.intro = {}; for (const k of Object.keys(ROLES)) run.dg.intro[k] = 1;
  const kit = (KIT[cls] || []).filter(id => E.atBuild(cls).nodes[id]); if (kit.length) { run.atree.own = run.atree.own.concat(kit.filter(id => !run.atree.own.includes(id))); run.skills = kit.slice(0, 4); E.atSync(run); }
  run.p.hp = run.p.hpMax; run.p.st = run.p.stMax; return run;
}
function mkRoomFor(run, type, foe, floor) {
  if (type === 'boss') return Object.assign(E.fixedRoom(FLOOR_BOSS), { ch: run.ch, lv: R_('mlvOf')(FLOOR_BOSS, run.ch) });
  for (let k = 0; k < 400; k++) { run.dg.foes = []; const r = E.mkRoom(run, type, floor); if (!foe || r.foe === foe) return r; }
  return null;
}
function battle(run, R, seed) {
  run.room = R.floor || FLOOR_BOSS; run.cur = R; const room = Object.assign({}, R, { buffs: {}, pre: null, mode: 'normal' });
  try { if (run.ch === 2) E.ch2Enter(run, R, room, {}); if (run.ch === 3) E.w3Enter(run, R, room, {}); } catch (x) { }
  const b = E.roomBattle(run.p, room, run.boss, seed); G.b = b; b.stepMode = false; return b;
}
const strongOf = b => b.en.find(e => e.strong && FC[e.foe]);
const act = (b, id) => E.actionList(b).find(a => a.id === id && a.ok);
const bigFoe = b => { const L = E.alive(b).filter(e => R_('realFoe')(e) && !e.under); return L.find(e => e.strong) || L.find(e => e.intent && /attack|heavy|charge|aim|ring|raise|steal|combo/.test(e.intent.k)) || L[0]; };
function pass(b) { const p = b.p; b.prepTurn = b.turnIdx; p.guard = 0; p.dodge = 0; p.brace = 0; b.cur = null; E.finishPlayer(b, 1); }
/* 성향: 이번 차례에 할 행동 [id, 대상] 또는 null(쉼) */
const must = b => E.actionList(b).find(a => a.ok && (a.id === 'tradeno' || /^seize_/.test(a.id))); // 고르기 전에는 다른 행동이 막히는 창(거래 · 차압): 시계가 도는 쪽(거절)을 고른다
const POL = {
  turtle: b => must(b) ? [must(b).id] : act(b, 'guard') ? ['guard'] : act(b, 'dodge') ? ['dodge', bigFoe(b)] : null,
  parry: b => act(b, 'dodge') ? ['dodge', bigFoe(b)] : act(b, 'guard') ? ['guard'] : null,
  zero: b => { const t = bigFoe(b); const h = act(b, 'heavy'); return h && b.p.st > 60 ? ['heavy', t] : ['basic', t]; },
  flee: b => act(b, 'flee') ? ['flee'] : POL.turtle(b),
  evade: b => { for (const id of ['h5_dodge', 'h5_hide', 'h5_counter']) if (act(b, id)) return [id]; return POL.turtle(b); },
  stasis: b => act(b, 'e5_stasis') ? ['e5_stasis'] : POL.turtle(b),
  hide: b => act(b, 'a_muyeong') ? ['a_muyeong'] : act(b, 'a_yeonmak') ? ['a_yeonmak'] : POL.turtle(b),
};
function drive(b, pol, o) {
  o = o || {}; const p = b.p, S = { passes: 0, acts: 0, enrageR: null, hit: [0, 0], skillN: 0, stopN: 0, hang: 0 };
  if (o.imm) b.ctx.safe = 1; if (pol === 'zero') R_('globalThis.__zero = 1'); const s = strongOf(b);
  let lastR = b.round, still = 0, stop0 = 0;
  try {
    while (!b.over && (b.round || 0) <= ROUNDS) {
      if (o.imm) { p.hp = p.hpMax; }
      if (b.enrage && S.enrageR == null) S.enrageR = b.round;
      if (s && s.clk) { if (s.clk.stop && !stop0) S.stopN++; stop0 = s.clk.stop; const C = s.clk; if (!(C.n >= 0 && C.n <= C.max) || Number.isNaN(C.n)) bug(o.tag + ': 시계 칸이 범위 밖 ' + C.n + '/' + C.max); }
      for (const u of [p].concat(b.en)) if (Number.isNaN(u.hp) || (u.alive && u.hp < 0)) bug(o.tag + ': 생명력 NaN/음수 ' + (u.n || 'p') + ' ' + u.hp);
      const m = must(b), a = m ? [m.id] : POL[pol](b); S.acts++;
      if (!a) { S.passes++; pass(b); }
      else { if (/^[a-z]+\d?_/.test(a[0])) S.skillN++; const t0 = b.turnIdx; E.playerAct(b, a[0], a[1] && a[1].id); if (b.turnIdx === t0 && !b.over) { /* 빠른 행동: 차례가 이어진다 */ const a2 = POL.turtle(b); if (a2) E.playerAct(b, a2[0], a2[1] && a2[1].id); else pass(b); } }
      if (b.round === lastR) { if (++still > 40) { bug(o.tag + ': 라운드가 넘어가지 않는다(r' + b.round + ')'); S.hang = 1; break; } } else { still = 0; lastR = b.round; }
      if (o.imm && b.over === 'lose') break;
    }
  } catch (x) { bug(o.tag + ': 예외 ' + (x && x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : x)); }
  R_('globalThis.__zero = 0');
  for (const h of b.rec) if (h.k === 'hit' && !h.dot) S.hit[(h.t || 0) < 40 ? 0 : 1] += h.actual || 0;
  let ee = 0, eeR = null; for (const h of b.rec) if (h.k === 'enrEnd') { ee += h.d || 0; if (eeR == null) eeR = h.r; } // S-5(10월 24일): 광폭의 끝(피할 수 없는 피해)은 따로 센다
  const C = s && s.clk;
  return { over: b.over || '-', round: b.round, enrageR: S.enrageR, passes: S.passes, acts: S.acts, skillN: S.skillN, hp40: +(S.hit[0] / p.hpMax).toFixed(2), hp41: +(S.hit[1] / p.hpMax).toFixed(2),
    ee: +(ee / p.hpMax).toFixed(2), eeR, foe: s ? s.foe : null, doomN: C ? C.doomN : null, warnN: C ? C.warnN : null, n: C ? C.n + '/' + C.max : null, perm: C ? C.perm : null, stopN: S.stopN, foeAlive: s ? s.alive : null, hang: S.hang };
}
const rows = []; const row = (r) => { rows.push(r); };
/* 1) 방 종류 × 챕터 × 끌기 성향(쓰러지지 않게): 싸움이 끝나는가, 광폭이 오는가, 광폭 뒤 받는 피해 */
const TYPES = ['normal', 'ambush', 'treasure', 'trial', 'boss'];
let seed = 5000;
for (const ch of [1, 2, 3]) for (const type of TYPES) for (const [pol, cls] of [['turtle', 'warden'], ['zero', 'warden'], ['hide', 'assassin'], ['stasis', 'elementalist']]) {
  const run = newRun(cls, ch, ++seed); const R = mkRoomFor(run, type, null, type === 'boss' ? FLOOR_BOSS : 10); if (!R) continue;
  const b = battle(run, R, seed); const tag = ch + '챕터 ' + type + ' ' + pol; const x = drive(b, pol, { imm: pol !== 'zero', tag });
  row(Object.assign({ case: 'type', ch, type, pol, cls, imm: pol !== 'zero' ? 1 : 0, en: b.en.filter(e => R_('realFoe')(e)).map(e => e.role + (e.elite ? '*' : '')).join(',') }, x));
}
/* 2) 강적마다 × 끌기 성향(쓰러지지 않게): 시계가 파국에 닿는가 */
const FOES = Object.keys(FC);
for (const foe of FOES) for (const [pol, cls] of [['turtle', 'warden'], ['parry', 'warden'], ['evade', 'hunter'], ['stasis', 'elementalist'], ['hide', 'assassin'], ['zero', 'warden']]) {
  let done = 0;
  for (const ch of [1, 2, 3]) { if (done) break; const run = newRun(cls, ch, ++seed); const R = mkRoomFor(run, 'strong', foe, 12) || mkRoomFor(run, 'strong', foe, 5); if (!R) continue; done = 1;
    const b = battle(run, R, seed); const tag = foe + ' ' + pol; const x = drive(b, pol, { imm: pol !== 'zero', tag });
    row(Object.assign({ case: 'strong', ch, type: 'strong', pol, cls, imm: pol !== 'zero' ? 1 : 0 }, x)); }
}
/* 3) 도망: 강적 방에서 시계가 경고 칸까지 차면 도망 → 같은 방에 다시 들어간다(게임은 같은 씨앗 run.room*7+3). 시계 · 적 생명력 · 내 생명력이 어떻게 되는가 */
for (const foe of FOES) {
  let done = 0;
  for (const ch of [1, 2, 3]) { if (done) break; const run = newRun('warden', ch, ++seed); const R = mkRoomFor(run, 'strong', foe, 12) || mkRoomFor(run, 'strong', foe, 5); if (!R) continue; done = 1;
    const sd = run.room * 7 + 3; let b = battle(run, R, sd), s = strongOf(b); let tries = 0, k = 0, warnAt = null;
    for (; k < 60 && !b.over; k++) { const C = s && s.clk; if (C && C.n >= C.max - 1 && !C.perm) { warnAt = C.n + '/' + C.max; const a = act(b, 'flee'); if (a) { tries++; E.playerAct(b, 'flee'); continue; } } const t = POL.turtle(b); if (t) E.playerAct(b, t[0], t[1] && t[1].id); else pass(b); }
    const fled = b.over === 'flee', hp1 = +(run.p.hp / run.p.hpMax).toFixed(2); const sHp = s ? +(s.hp / s.hpMax).toFixed(2) : null;
    if (fled) R_('endBattleCarry')(run.p);
    const b2 = battle(run, R, sd), s2 = strongOf(b2);
    row({ case: 'flee', ch, type: 'strong', foe, pol: 'flee-at-warn', warnAt, fled, fleeTries: tries, roundOut: b.round, hpOut: hp1, foeHpOut: sHp, clkIn: s2 && s2.clk ? s2.clk.n + '/' + s2.clk.max : '-', foeHpIn: s2 ? +(s2.hp / s2.hpMax).toFixed(2) : null, hpIn: +(run.p.hp / run.p.hpMax).toFixed(2) });
  }
}
/* 4) 경고 뒤 기다림(C.wT): 경고 칸에서 방어 · 흘리기 · 쉼을 되풀이해도 다음 채움에서 파국이 오는가(기다림이 늘 다시 걸리지 않는가) */
{
  const fcAdd = R_('fcAdd'); for (const [id, foe] of [['guard', 'champion'], ['dodge', 'champion'], ['pass', 'champion'], ['guard', 'captain'], ['pass', 'merchant']]) {
    const run = newRun('warden', 2, ++seed); const R = mkRoomFor(run, 'strong', foe, 12) || mkRoomFor(run, 'strong', foe, 5); if (!R) continue; const b = battle(run, R, seed); const s = strongOf(b); if (!s) continue; b.ctx.safe = 1; if (foe === 'merchant') b.trade = 'no';
    E.fcInit(b, s); const C = s.clk; fcAdd(b, s, C.max - 1 - C.n, 'test'); const w0 = C.wT, t0 = b.turnIdx; let doomAt = null;
    for (let k = 0; k < 6 && !doomAt && !b.over; k++) { b.p.hp = b.p.hpMax; if (id === 'pass') pass(b); else { const a = act(b, id); if (a) E.playerAct(b, id, s.id); else pass(b); } if (C.doomN) doomAt = b.turnIdx - t0; }
    row({ case: 'wait', ch: 2, foe, pol: id, wT0: w0, doomAfterTurns: doomAt, wTnow: C.wT });
  }
}
/* 5) 평소 되감기(라운드에 한 번)만 되풀이: 내 차례마다 그 강적의 평소 되감기 하나(시체 · 폭도 쓰러뜨리기, 광역, 큰 한 방 등을 흉내)를 하고 아무것도 막지 않는다. 시계가 파국에 닿는가 */
const ORD = { bishop: 'fc1Ord', cantor: 'fc1Ord', champion: 'ch2Ord', captain: 'ch2Ord', speaker: 'w3Back' };
for (const foe of Object.keys(ORD)) {
  let done = 0; const fn = R_(ORD[foe]);
  for (const ch of [1, 2, 3]) { if (done) break; const run = newRun('warden', ch, ++seed); const R = mkRoomFor(run, 'strong', foe, 12) || mkRoomFor(run, 'strong', foe, 5); if (!R) continue; done = 1;
    const b = battle(run, R, seed), s = strongOf(b); b.ctx.safe = 1; let ordN = 0, minN = 99, maxN = 0;
    for (let k = 0; k < 400 && !b.over && (b.round || 0) <= ROUNDS && s.alive; k++) { b.p.hp = b.p.hpMax; E.fcInit(b, s); const C = s.clk; minN = Math.min(minN, C.n); maxN = Math.max(maxN, C.n);
      if (C.n > 0 && !C.perm) { b.cur = { id: 'basic' }; b.actN = (b.actN || 0) + 1; if (fn(b, s, 'test')) ordN++; b.cur = null; } const m = must(b); if (m) E.playerAct(b, m.id); else pass(b); }
    row({ case: 'ord', ch, foe, ordN, doomN: s.clk.doomN, warnN: s.clk.warnN, round: b.round, minN, maxN, max: s.clk.max });
  }
}
/* 6) 적 하나만 남았을 때: 그 역할이 나에게 피해를 주는가(주지 않으면 내가 치지 않는 한 끝나지 않는다. 광폭은 적의 피해만 키운다) */
const NM = R_('ENEMY_NAMES');
for (const ch of [1, 2, 3]) for (const role of Object.keys(NM[ch] || {})) {
  if (!ROLES[role] || ['root', 'candle', 'lantern', 'bonfire', 'rampart', 'brick', 'barricade', 'crown'].includes(role)) continue;
  const run = newRun('warden', ch, ++seed); const R = { type: 'normal', floor: 10, ch, lv: R_('mlvOf')(10, ch), names: NM[ch], path: 'main', en: [[role, 0]], mods: [], gold: 0 };
  let b; try { b = battle(run, R, seed); } catch (x) { bug('역할 ' + role + ': 방을 만들지 못한다 ' + x); continue; }
  const x = drive(b, 'turtle', { imm: 1, tag: ch + '챕터 ' + role + ' 혼자' }); row(Object.assign({ case: 'role', ch, role }, x));
}
/* 7) 전투 중 바뀐 방 특성이 방 정의에 새지 않는다(10월 24일 S-5 고침, js/34 roomBattle): 등불 도둑 파국의 어둠 · 기름 단지의 기름 바닥 → 도망 → 다시 들어가기 */
{
  const run = newRun('warden', 2, ++seed); const R = mkRoomFor(run, 'strong', 'lampthief', 12); R.mods = (R.mods || []).filter(m => m !== 'dark' && m !== 'oilfloor'); const m0 = JSON.stringify(R.mods);
  const b = battle(run, R, 87), s = strongOf(b); E.fcInit(b, s); b.fcNoWait = 1; R_('fcAdd')(b, s, s.clk.max, 'test'); if (!b.ctx.mods.includes('oilfloor')) b.ctx.mods.push('oilfloor');
  const leak = JSON.stringify(R.mods) !== m0; b.over = 'flee'; R_('endBattleCarry')(run.p); const b2 = battle(run, R, 87);
  const run0 = newRun('warden', 2, seed), b0 = battle(run0, Object.assign({}, R, { mods: JSON.parse(m0) }), 87); // 대조: 처음 들어가는 같은 방(등불 도둑이 첫 라운드에 등불을 끄면 처음부터 어둡다)
  row({ case: 'leak', dark1: b.ctx.mods.includes('dark'), leak, mods2: b2.ctx.mods.join('+'), mods0: b0.ctx.mods.join('+') });
  if (!b.ctx.mods.includes('dark')) bug('등불 도둑 파국: 이 전투가 어두워지지 않았다'); if (leak || b2.ctx.mods.join('+') !== b0.ctx.mods.join('+')) bug('전투 중 바뀐 방 특성이 방 정의에 샜다: ' + JSON.stringify(R.mods) + ' / 다시 들어간 방 ' + JSON.stringify(b2.ctx.mods) + ' / 처음 방 ' + JSON.stringify(b0.ctx.mods));
}
/* 8) S-5(10월 24일 만든 사람) 광폭의 끝: 쓰러지지 않게 하지 않고(진짜 생명력) 끌면 싸움이 라운드 안에 반드시 끝나는가. 끝나지 않으면 버그로 센다 */
for (const ch of [1, 2, 3]) for (const type of ['normal', 'boss']) for (const [pol, cls] of [['turtle', 'warden'], ['hide', 'assassin'], ['stasis', 'elementalist']]) {
  const run = newRun(cls, ch, ++seed); const R = mkRoomFor(run, type, null, type === 'boss' ? FLOOR_BOSS : 10); if (!R) continue;
  const b = battle(run, R, seed); const tag = ch + '챕터 ' + type + ' ' + pol + ' (진짜 생명력)'; const x = drive(b, pol, { imm: 0, tag });
  if (x.over === '-') bug(tag + ': 광폭의 끝이 와도 ' + ROUNDS + '라운드 안에 끝나지 않는다'); row(Object.assign({ case: 'end', ch, type, pol, cls }, x));
}
for (const [ch, role] of [[1, 'shield'], [2, 'thug'], [2, 'chained']]) { // 나에게 피해를 주지 않는 역할 혼자 + 방어만
  const run = newRun('warden', ch, ++seed); const NM2 = R_('ENEMY_NAMES'); const R = { type: 'normal', floor: 10, ch, lv: R_('mlvOf')(10, ch), names: NM2[ch], path: 'main', en: [[role, 0]], mods: [], gold: 0 };
  const b = battle(run, R, seed); const tag = ch + '챕터 ' + role + ' 혼자 turtle (진짜 생명력)'; const x = drive(b, 'turtle', { imm: 0, tag });
  if (x.over === '-') bug(tag + ': 광폭의 끝이 와도 끝나지 않는다'); row(Object.assign({ case: 'end', ch, type: role + ' 혼자', pol: 'turtle', cls: 'warden' }, x));
}
/* 출력 */
const pad = (s, n) => { s = String(s == null ? '' : s); return s + ' '.repeat(Math.max(0, n - s.length)); };
console.log('== 방 종류 × 끌기 (imm: 쓰러지지 않게) ==');
for (const r of rows.filter(r => r.case === 'type')) console.log(pad(r.ch + 'ch ' + r.type, 14) + pad(r.pol, 7) + pad('imm' + r.imm, 5) + pad(r.over + '@r' + r.round, 10) + pad('광폭 r' + r.enrageR, 10) + pad('쉼 ' + r.passes + '/' + r.acts, 10) + pad('받은 피해 ~40:' + r.hp40 + ' 41~:' + r.hp41, 30) + pad('광폭의 끝 ' + (r.eeR != null ? 'r' + r.eeR + ' ' + r.ee : '-'), 18) + r.en);
console.log('== 강적 × 끌기 ==');
for (const r of rows.filter(r => r.case === 'strong')) console.log(pad(r.ch + 'ch ' + r.foe, 16) + pad(r.pol, 7) + pad(r.over + '@r' + r.round, 10) + pad('광폭 r' + r.enrageR, 10) + pad('파국 ' + r.doomN + ' 경고 ' + r.warnN + ' 칸 ' + r.n + (r.perm ? ' perm' : ''), 26) + pad('멈춤 ' + r.stopN, 8) + pad('쉼 ' + r.passes + '/' + r.acts + ' 스킬 ' + r.skillN, 18) + '피해 ~40:' + r.hp40 + ' 41~:' + r.hp41);
console.log('== 도망 → 다시 들어가기 ==');
for (const r of rows.filter(r => r.case === 'flee')) console.log(pad(r.ch + 'ch ' + r.foe, 16) + pad('경고 ' + r.warnAt, 10) + pad('도망 ' + (r.fled ? '성공' : '실패') + ' 시도 ' + r.fleeTries, 16) + pad('r' + r.roundOut, 5) + pad('강적 체력 ' + r.foeHpOut + ' → ' + r.foeHpIn, 20) + pad('시계 → ' + r.clkIn, 12) + '내 체력 ' + r.hpOut + ' → ' + r.hpIn);
console.log('== 경고 뒤 기다림 ==');
for (const r of rows.filter(r => r.case === 'wait')) console.log(pad(r.foe, 10) + pad(r.pol, 7) + 'wT ' + r.wT0 + ' → ' + r.wTnow + ' · 파국까지 내 차례 ' + r.doomAfterTurns);
console.log('== 평소 되감기만 라운드에 한 번 ==');
for (const r of rows.filter(r => r.case === 'ord')) console.log(pad(r.ch + 'ch ' + r.foe, 16) + pad('되감기 ' + r.ordN, 10) + pad('파국 ' + r.doomN + ' 경고 ' + r.warnN, 14) + '칸 ' + r.minN + '~' + r.maxN + '/' + r.max + ' · r' + r.round);
console.log('== 적 하나만 (방어 · 흘리기만, 쓰러지지 않게) ==');
console.log(rows.filter(r => r.case === 'role').map(r => r.ch + 'ch ' + r.role + ' ' + r.hp40 + '/' + r.hp41 + (r.over !== '-' ? ' ' + r.over : '')).join(' · '));
console.log('피해 0인 역할: ' + (rows.filter(r => r.case === 'role' && !(r.hp40 + r.hp41 > 0)).map(r => r.ch + 'ch ' + r.role).join(', ') || '없음'));
console.log('== 광폭의 끝: 진짜 생명력으로 끌기 (S-5) ==');
for (const r of rows.filter(r => r.case === 'end')) console.log(pad(r.ch + 'ch ' + r.type, 16) + pad(r.pol, 7) + pad(r.over + '@r' + r.round, 10) + pad('광폭 r' + r.enrageR, 10) + pad('받은 피해 ~40:' + r.hp40 + ' 41~:' + r.hp41, 30) + '광폭의 끝 ' + (r.eeR != null ? 'r' + r.eeR + ' ' + r.ee : '-'));
for (const r of rows.filter(r => r.case === 'leak')) console.log('== 방 특성 새기 == 파국 뒤 어둠 ' + r.dark1 + ' · 방 정의가 바뀜 ' + r.leak + ' · 다시 들어간 방 [' + r.mods2 + '] · 처음 방 [' + r.mods0 + ']');
if (JOUT) require('fs').writeFileSync(JOUT, JSON.stringify(rows, null, 1));
if (BUGS.length) { console.log('버그 ' + BUGS.length + '\n' + [...new Set(BUGS)].slice(0, 40).join('\n')); process.exit(1); }
console.log('전투 끌기 점검: 버그 없음 (' + rows.length + '건)');
