'use strict';
/* ===== 0.6a.2 라운드 (10월 3일 만든 사람 요청: 턴이 분명한 기준으로 움직이게, 기획서 12.7절) =====
   라운드마다 살아 있는 모두(나와 적)가 한 번씩 정해진 순서로 행동한다. 순서는 무리(가속 → 보통 → 둔화·느린 행동 뒤·매복 첫 라운드의 나) 안에서
   속도가 높은 쪽 먼저, 같으면 나 먼저, 그다음 적이 놓인 순서. 속도 1.5 이상인 적은 라운드 끝에 한 번 더 움직인다.
   라운드가 끝나면 중독, 스태미나, 보스 시계, 광폭화를 처리한다(tickOnce). b.t는 지난 라운드 수다 */
const RND_TWICE = 1.5;
/* 느린 맥박(0.6a.2 라운드): 내 차례에 빠른 칸이 없다. 빠른 행동도 주 행동처럼 차례를 끝낸다 (10월 3일: 옛 대가 "내 차례가 덜 자주 온다"가 라운드에서는 순서만 뒤로 미뤘다) */
const noFast = p => isV2(p) && (p.eq.ring1 === 'pulse' || p.eq.ring2 === 'pulse');
function roundOrder(b, consume, slowMe) {
  const p = b.p; const al = alive(b).filter(e => e.role !== 'root' && e.role !== 'candle' && e.role !== 'bonewall' && e.role !== 'crown' && !e.pile);
  const grp = (u, isP) => { if (isP && (b.ambushR && (b.round || 0) === 0)) return 2; if (isP && !u.s.chill && fxList(u).some(([, f]) => f.first)) return 0; if (!isP && u.quick) return 0; if (u.s.haste) return 0; if (u.s.chill) return 2; return 1; };
  const ents = [{ id: 'p', g: grp(p, true), sp: pSpeed(b), i: -1 }].concat(al.map((e, i) => ({ id: e.id, g: grp(e, false), sp: eSpeed(b, e), i })));
  ents.sort((a, c) => a.g - c.g || c.sp - a.sp || a.i - c.i);
  const out = ents.slice(); for (const x of ents) if (x.id !== 'p' && x.sp >= RND_TWICE) out.push(Object.assign({}, x, { twice: 1 })); // 두 번 움직이는 적
  if (p.s.haste && p.build === 'hunter') { const i = out.findIndex(x => x.id === 'p'); out.splice(i + 1, 0, Object.assign({}, out[i], { extra: 1 })); if (consume) b.pDouble = (b.round || 0) + 1; } // 가속 (10월 5일 만든 사람 결정): 사냥꾼 전용, 라운드 맨 앞에서 두 번 연달아 움직인다(한 라운드에 한 번). 두 번째 차례는 쿨타임이 줄지 않는다
  if (consume) {
    for (const x of ents) { const u = x.id === 'p' ? p : b.en.find(e => e.id === x.id); if (!u) continue;
      if (x.g === 0 && u.s.haste) kwDec(u, 'haste'); if (x.g === 2 && u.s.chill) { if (x.id !== 'p' && p.build === 'elementalist') u.chillR = b.round; if (x.id !== 'p') u.slowR = b.round; kwDec(u, 'chill'); } /* 원소술사 서리 무게: 둔화로 맨 뒤에 선 라운드는 둔화가 0이 되어도 무뎌진다 */ if (x.id !== 'p') u.quick = 0; }
    b.ambushR = 0;
  }
  return out;
}
function startRound(b) { for (const e of alive(b)) if (e.swift && !e.s.chill && !e.s.broken && !e.s.haste) e.s.haste = { stacks: 1, until: KW_FOREVER, dur: KW_FOREVER }; /* 신속: addS를 쓰지 않는다(내가 건 둔화를 지우지 않게) */ b.round = (b.round || 0) + 1; b.queue = roundOrder(b, true).map(x => x.id); b.roundAll = b.queue.slice(); b.bonusUsed = 0; if ((b.ctx.ch || 1) >= 3) ch3Round(b); }
function endRound(b) { b.t = b.tick + 1; tickOnce(b); }
/* 순서 안의 자리: 이번 라운드 남은 줄 → 다음 라운드 (흘릴 적 고르기, 미리 보기) */
function actIdx(b, e) { const q = (b.queue || []).filter(id => id !== 'p'); const i = q.indexOf(e.id); if (i >= 0) return i; const j = roundOrder(b, false).map(x => x.id).indexOf(e.id); return j >= 0 ? q.length + j : 99; }
/* 한 번에 하나씩: 적 한 명의 행동 또는 내 차례 도달 */
function stepWorld(b) {
  if (b.over) { b.waiting = false; return 'over'; }
  if (!b.queue) startRound(b);
  for (let n = 0; n < 200; n++) {
    if (!b.queue.length) { endRound(b); if (b.over) { b.waiting = false; return 'over'; } startRound(b); }
    const id = b.queue[0];
    if (id === 'p') { b.waiting = false; b.lastActor = null; return 'player'; }
    b.queue.shift();
    const e = b.en.find(x => x.id === id);
    if (!e || !e.alive || e.role === 'root' || e.pile || e.role === 'bonewall' || e.role === 'crown') continue;
    b.lastActor = e.id; enemyAct(b, e); if (b.p.build === 'elementalist') elemShock(b, 'enemy'); // 되얼림 · 불꽃 외투 · 장비가 적 차례에 원소를 건 경우
    if (b.over) { b.waiting = false; return 'over'; }
    return 'acted';
  }
  return 'acted';
}
/* 다음 플레이어 차례까지 진행 */
function runUntilPlayer(b) {
  let guardN = 0;
  while (!b.over && guardN++ < 2000) { const r = stepWorld(b); if (r !== 'acted') return; }
}
/* 순서표: 이번 라운드에 남은 순서와 다음 라운드 */
function preview(b) {
  const nm = id => id === 'p' ? '나' : ((b.en.find(e => e.id === id) || {}).n || '');
  const cur = (b.queue || []).filter(id => id === 'p' || (b.en.find(e => e.id === id) || {}).alive).map((id, k) => ({ id, n: nm(id), me: id === 'p', now: k === 0, r: b.round || 1 }));
  const nxt = roundOrder(b, false).map(x => ({ id: x.id, n: nm(x.id), me: x.id === 'p', r: (b.round || 1) + 1 }));
  return cur.concat(nxt);
}

/* ================= 전투 구성 ================= */
/* 전투 난수: 상태를 b.rngS 숫자에 두어 전투를 저장했다가 그대로 이어 갈 수 있게 한다 (mulberry와 같은 수열) */
function battleRng(b) { return function () { let s = b.rngS | 0; s = s + 0x6D2B79F5 | 0; b.rngS = s; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function setRng(b, seed) { b.rngS = seed | 0; b.rngF = battleRng(b); }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* 방 한 칸의 전투. room = { en, boss, mods[], ambush, strong(이름), buffs{}, pre{} } (11.3절) */
function roomBattle(player, room, bossKind, seed) {
  let en;
  if (room.boss) {
    const bs = mkBoss(bossKind, 1, room.lv || 1); en = [bs];
    if (bossKind === 'cryptlord') for (let i = 0; i < LORD.guards; i++) en.push(lordGuard(room.lv || 1, 50 + i, room.ch || 2)); // 근위 해골 둘(경험치 0)
    if (bossKind === 'queen') { const c = mkEnemy('crown', 0, 60, { lv: room.lv || 1, name: (ENEMY_NAMES[3] || {}).crown }); c.hpMax = Math.max(1, Math.round(bs.hpMax * QUEEN.crownHp)); c.hp = c.hpMax; c.summoned = true; c.xpCh = 0; c.brkMax = 1; c.intent = { k: 'none' }; c.info = '재의 왕관. 움직이지 않는다.'; en.push(c); } // 3챕터 재의 여왕의 왕관
    if (bossKind === 'tree') for (let i = 0; i < 3; i++) en.push(mkEnemy('root', 0, 50 + i));
  } else en = room.en.map((x, i) => mkEnemy(x[0], x[1], i, { lv: room.lv || 1, name: room.names && room.names[x[0]], tough: !!(room.tough && room.tough.includes(i)) }));
  if (!room.boss && room.floor) { const D = diffOf(room.ch)[isLower(room.floor) ? 'lower' : 'upper'], P = pathOf(room.path, room.mode); for (const e of en) { e.hpMax = Math.round(e.hpMax * D.hp * P.hp); e.hp = e.hpMax; e.dmg *= D.dmg * P.dmg; } }
  if (room.ambush && !room.boss) for (const e of en) { e.hpMax = Math.round(e.hpMax * AMBUSH.hp); e.hp = e.hpMax; e.dmg *= AMBUSH.dmg; } // 매복: 일반과 강적 사이
  if (room.strong && en[0]) { const e = en[0]; e.strong = true; e.foe = room.foe; const low = isLower(room.floor || 0); e.n = room.strong; e.hpMax = Math.round(e.hpMax * STRONG.hp * (low ? STRONG.lowerHp : 1)); e.hp = e.hpMax; { const F = STRONG_FOES.find(x => x.id === room.foe) || {}; e.hpMax = Math.round(e.hpMax * (F.hp || 1)); e.hp = e.hpMax; e.dmg *= F.dmg || 1; } e.dmg *= STRONG.dmg * (low ? STRONG.lowerDmg : 1); e.bigMul = HIT_REF(e.lv || 1) * STRONG.big / e.dmg; e.info = '강적. 무엇을 하는지는 겪어 보아야 안다.'; }
  if (room.foe === 'bellringer') { const bell = mkEnemy('root', 0, 60, { lv: room.lv || 1 }); bell.n = '큰 종'; bell.ico = '🔔'; bell.bell = 1; bell.hpMax = Math.round(bell.hpMax * 1.2); bell.hp = bell.hpMax; bell.info = '큰 종. 후열. 스스로는 움직이지 않는다.'; en.push(bell); }
  { const C = chData(room.ch); let hx = 0; for (const e of en) { e.xpCh = (C.xp || 1) * (room.mode === 'hard' ? MODES.hard.xp : 1); if (e.role === 'hexer') e.hexOff = hx++; } for (const k of room.swift || []) { const e = en[k]; if (e && !e.strong) { e.swift = 1; e.hpMax = Math.round(e.hpMax * SWIFT.hp); e.hp = e.hpMax; } } }
  if (room.mode === 'hard') for (const e of en) if (e.role !== 'root') { e.hpMax = Math.round(e.hpMax * MODES.hard.hp); e.hp = Math.min(e.hpMax, Math.round(e.hp * MODES.hard.hp)); } /* 가혹: 적 생명력 배율(지금 ×1) (피해 ×1.3은 hurtPlayer) */
  if (room.marks) markEnemies(en, room.marks); /* 표식 도전: 적 생명력 · 보스 생명력 */
  const mods = room.mods || [];
  if (mods.includes('bonepile')) { const D = diffOf(room.ch)[isLower(room.floor || 0) ? 'lower' : 'upper'], P = pathOf(room.path, room.mode); for (let k = 0; k < 2; k++) { const s = mkEnemy('skeleton', 0, 70 + k, { lv: room.lv || 1, name: room.names && room.names.skeleton }); s.hpMax = Math.round(s.hpMax * D.hp * P.hp); s.dmg *= D.dmg * P.dmg; s.rose = 1; s.summoned = true; s.pile = { wait: RISE.wait, born: -1 }; s.hp = Math.max(1, Math.round(s.hpMax * RISE.pile)); s.intent = { k: 'none' }; en.push(s); } } // 무너진 납골벽: 이미 한 번 일어선 해골로 친다(경험치 · 전리품 없음)
  if (mods.includes('narrow') || mods.includes('alley')) { let f = 0; for (const e of en) if (e.row === 'front' && e.role !== 'boss') { f++; if (f > 2) e.row = 'back'; } }
  player.bt = Object.assign({}, room.buffs || {});
  const b = newBattle(player, en, Object.assign({ boss: !!room.boss, bossKind, mods, ambush: !!room.ambush, lv: room.lv || 1, names: room.names || null, lower: isLower(room.floor || 0), ch: room.ch || 1, mode: room.mode || 'normal' }, room.marks ? { marks: room.marks } : null));
  if (mods.includes('flooded')) { addS(b, player, 'chill', 1); for (const e of en) if (e.role !== 'root') addS(b, e, 'chill', 1); logp(b, 'sys', '발목까지 물이 찬다. 모두 둔화 1'); }
  if (!room.boss && room.floor) b.lootMul = (room.ambush ? AMBUSH.loot : 1) * pathOf(room.path, room.mode).loot * (room.mode === 'hard' ? MODES.hard.loot : 1); // 매복은 전리품 1.5배, 길마다 배율 (10월 4일)
  setRng(b, seed || 7);
  const pre = room.pre || {};
  if (pre.weak) addS(b, player, 'weak', pre.weak); if (pre.vuln) addS(b, player, 'vuln', pre.vuln); if (pre.poison) addPoison(b, player, pre.poison, 0);
  if ((room.ch || 1) >= 3) { ch3Setup(b, room); if (pre.ignite) addS(b, player, 'ignite', pre.ignite); if (pre.chill) addS(b, player, 'chill', pre.chill); if (pre.bleed) addS(b, player, 'bleed', pre.bleed); } // 3챕터: 열기 · 아지랑이 · 붕대 · 화염 강화 · 강적 값, 이벤트가 붙인 시작 상태
  if (room.ambush) { b.ambushR = 1; logp(b, 'bad', '어둠 속에서 적이 먼저 덮친다. 첫 라운드에 내가 맨 뒤다'); }
  runUntilPlayer(b);
  return b;
}
const hasMod = (b, k) => !!(b.ctx && b.ctx.mods && b.ctx.mods.includes(k));
const hasBt = (p, k) => !!(p.bt && p.bt[k]);
function scenBattle(build, sc) {
  const p = mkPlayer(build, {});
  if (sc.p.hp) p.hp = Math.round(p.hpMax * sc.p.hp);
  if (sc.p.mp) p.mp = Math.round(p.mpMax * sc.p.mp);
  if (sc.p.st != null) p.st = sc.p.st;
  const en = [];
  if (sc.boss) en.push(mkBoss(sc.boss, sc.bossHp));
  sc.en.forEach((x, i) => en.push(mkEnemy(x[0], x[1], i, x[2])));
  if (sc.boss) { en[0].phase = sc.bossHp <= .35 ? 3 : sc.bossHp <= .7 ? 2 : 1; }
  const b = newBattle(p, en, { scen: sc.id, boss: !!sc.boss });
  for (let i = 0; i < en.length; i++) { const o = sc.en[i - (sc.boss ? 1 : 0)]; if (o && o[2] && o[2].intent) en[i].intent = { k: o[2].intent, tgt: o[2].intent === 'heal' ? en.find(x => x.role === 'shield') && en.find(x => x.role === 'shield').id : null }; }
  if (sc.p.poison) p.s.poison = { stacks: sc.p.poison, until: POISON_FOREVER, dur: POISON_FOREVER };
  if (sc.p.scar && scarRate(p) > 0) p.scar = sc.p.scar;
  for (const k in (sc.p.s || {})) p.s[k] = { stacks: sc.p.s[k], until: 3, dur: 3 };
  for (let i = 0; i < en.length; i++) { const o = sc.en[i - (sc.boss ? 1 : 0)]; if (o && o[2] && o[2].poison) en[i].s.poison = { stacks: o[2].poison, until: POISON_FOREVER, dur: POISON_FOREVER }; }
  setRng(b, 11);
  runUntilPlayer(b);
  return b;
}
/* 0.6a.2 수련장 (data/tutorial.js): 직업 없는 견습생, 장면마다 정해진 적과 쓸 수 있는 행동 */
function tutBattle(L) {
  const p = mkPlayer('novice', {}); const P0 = L.p || {};
  if (P0.hp) p.hp = Math.round(p.hpMax * P0.hp);
  if (P0.fl) Object.assign(p.flask, P0.fl);
  const en = L.en.map((x, i) => mkEnemy(x[0], x[1], i, x[2]));
  const b = newBattle(p, en, { tut: L.id, safe: !!L.safe, allow: L.allow || null });
  setRng(b, 7);
  runUntilPlayer(b);
  return b;
}
/* 장면 목표를 이뤘는가 (기록 b.rec과 전장을 본다) */
const TUT_CHECK = {
  t1: b => b.over === 'win',
  t2: b => b.rec.some(x => x.k === 'hit' && x.charged && x.parried),
  t3: b => b.rec.some(x => x.k === 'break' && x.cut),
  t4: b => !b.en.some(e => e.role === 'archer' && e.alive),
  t5: b => b.rec.some(x => x.k === 'block'),
  t6: b => b.over === 'win',
};
function endBattleCarry(p) {
  p.bt = {}; p.rcN = 0; p.mk = null; p.fxSpell = 0; p.fxScar = 0; p.fxPen = 0; p.fxHunt = null; p.fxHeavyDisc = 0; p.fxImmune = 0; p.fxQuick = 0; p.fxQuickNext = 0; p.fxCond = 0; p.fxFlaskDmg = 0; p.brace = 0; p.tookSince = 0; p.tookLast = 0;
  p.ward = 0; p.thorn = null; p.evade = 0; p.lastBr = null; p.evadeCtr = null; p.evadeHz = null; p.quickTurns = 0; p.foresee = null; p.focus = null; p.lastSkillId = null; p.echoN = 0; p.furyNext = 0; p.retal = 0; p.sigCd = 0; p.focusRes = 0;
  // 방 사이 이월 (4.2): 생명력·마나·플라스크 유지, 스태미나는 50%까지 회복, 전투 상태 해제
  if (p.build === 'monk') { p.stance = null; p.ctrN = 0; }
  p.st = Math.max(p.st, 50); p.exhaust = 0; p.s = {}; p.guard = 0; p.dodge = 0; p.stun = 0; p.counter = 0; p.reflux = null; p.rage = 0;
  if (p.build === 'spellblade') { p.edge = null; p.sbLast = null; p.sbRun = 0; } // 마검사: 칼은 전투가 끝나면 빈다
  if (p.build === 'confessor') { p.selfN = {}; p.selfBad = null; } // 숨겨진 직업 2
  if (p.build === 'bloodmage') p.payCut = []; // 숨겨진 직업 3: 값 깎기는 전투가 끝나면 사라진다
}

if (typeof module !== 'undefined') module.exports = { BUILDS, ITEMS, ROOMS, BOSSES, SCEN, SEASONS, SLOT_N, ROLES, mkPlayer, roomBattle, scenBattle, tutBattle, TUT_CHECK, playerAct, actionList, alive, canTarget, intentText, preview, endBattleCarry, pSpeed, st, VERSION };

