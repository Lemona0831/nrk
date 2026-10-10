'use strict';
/* ===== 던전과 갈림길 (기획서 11.3절) =====
   run.room = 지금 층(1~19). run.doors = 이 층의 문 셋, run.cur = 고른 방. run.dg = 챕터 동안의 집계(유형별 횟수, 본 유형, 이벤트, 강적).
   run.buffs = { 성소·이벤트 버프: 남은 방 수 }, run.next = 다음 전투 방에 걸리는 것, run.gold = 모은 골드(정산은 단계 9) */
function floorName(f) { const c3 = typeof G !== 'undefined' && G.run && (G.run.ch || 1) >= 3; return f === FLOOR_CAMP ? (c3 ? '오아시스 야영지' : '야영지') : f === FLOOR_BOSS ? (c3 ? '재의 왕좌' : '보스') : f > FLOORS ? '끝' : c3 ? floorBand3(f).n + ' ' + f + '층' : (isLower(f) ? '하층 ' : '상층 ') + f + '층'; } // 3챕터는 해의 흐름 띠 이름
const pickR = a => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function dgInit(run) {
  if (run.dg) return;
  run.dg = { counts: {}, seen: {}, last: null, events: [], strong: { u: 0, l: 0 }, force: null, foes: [] };
  run.room = 1; run.cur = null; run.path = 'main'; run.dgv = 2; run.gold = run.gold || 0; run.lv = run.lv || 1; run.xp = run.xp || 0; run.p.lv = run.lv; run.buffs = {}; run.next = {}; run.doorLog = [];
  run.doors = genDoors(run, 1);
}
function typeOk(run, t, f) {
  const T = ROOM_TYPES[t], d = run.dg; if (!T || f < T.from) return false;
  if (t === 'fate') return false; /* 운명의 저울은 genDoors가 따로 끼운다 */
  if ((d.counts[t] || 0) >= ((chData(run.ch).roomMax || {})[t] || T.max)) return false; // 3챕터: 매복 최대 6
  if (t === 'strong' && d.strong[isLower(f) ? 'l' : 'u'] >= STRONG_PER_HALF) return false;
  if (t === 'strong' && f < (chData(run.ch).strongFrom || T.from)) return false; // 2챕터는 4층부터
  if (t === 'strong' && !STRONG_FOES.some(x => inCh(x, run.ch))) return false; // 그 챕터 강적이 아직 없으면
  if (t === 'strong' && (run.ch || 1) >= 3 && !STRONG_FOES.some(x => inCh(x, run.ch) && strong3Ok(run, x, f))) return false; // 3챕터: 그 축을 만나기 전에는 강적 문이 나오지 않는다(5.1절 2번)
  if (t === 'event' && EVENTS.filter(e => inCh(e, run.ch)).every(e => d.events.includes(e.id))) return false;
  return true;
}
function pickType(run, f, not, only) {
  const d = run.dg; const opts = Object.keys(ROOM_TYPES).filter(t => !not.includes(t) && typeOk(run, t, f) && (!only || only.includes(t)));
  if (!opts.length) return null;
  const PW = pathOf(run.path, run.mode).w; const ws = opts.map(t => ((chData(run.ch).roomW || {})[t] || ROOM_TYPES[t].w) * (t === d.last ? 0.5 : 1) * (t === 'strong' && isLower(f) ? 1.3 : 1) * (PW[t] || 1) * (t === 'strong' && markOn(run, 'strong') ? MARKS.strong.w : 1));
  let x = Math.random() * ws.reduce((a, v) => a + v, 0); for (let i = 0; i < opts.length; i++) { x -= ws[i]; if (x <= 0) return opts[i]; } return opts[opts.length - 1];
}
const FIGHTS = ['normal', 'ambush', 'strong', 'treasure', 'trial'];
const RESTS = ['spring', 'shrine', 'altar', 'event'];
function genDoors(run, f) {
  const d = run.dg; const half = isLower(f) ? 'l' : 'u'; let types = [];
  const need = t => typeOk(run, t, f) && !types.includes(t) && types.push(t);
  if (f === 1) types = ['normal', 'normal', typeOk(run, 'treasure', f) && Math.random() < 0.5 ? 'treasure' : 'shrine'];
  else if (f === FLOOR_CAMP + 1) { types = ['normal']; const t2 = pickType(run, f, types, ['ambush', 'strong']); if (t2) types.push(t2); const t3 = pickType(run, f, types, RESTS); if (t3) types.push(t3); }
  else {
    if (d.force) { need(d.force); d.force = null; } // 종탑의 줄 · 뼈 피리 · 해를 앞당긴다(강적), 묻힌 문(보물)
    if ((f === 7 && !d.seen.strongu) || (f === FLOOR_CAMP + 7 && !d.seen.strongl)) need('strong'); // 반쯤 왔는데 강적을 못 봤으면 (샘은 억지로 넣지 않는다)
  }
  while (types.length < 3) { const t = pickType(run, f, types); if (!t) break; types.push(t); }
  while (types.length < 3) types.push('normal');
  if (!types.some(t => FIGHTS.includes(t))) types[2] = 'normal';
  for (const t of types) d.seen[t + half] = true;
  let force = null; if ((run.ch || 1) >= 3) { force = Object.keys(INTRO_AT3).find(k => (INTRO_AT3[k] === f || INTRO_AT3[k] + 1 === f) && !introOk3(run, k)) || null; if (force && !types.includes('normal')) types[2] = 'normal'; } // 3챕터 처음 만남 문(그 층에서 놓치면 다음 층에 한 번 더)
  else if ((run.ch || 1) >= 2 && typeof INTRO_AT !== 'undefined') { force = Object.keys(INTRO_AT).find(k => INTRO_AT[k] === f && !introOk(run, k)) || null; if (force && !types.includes('normal')) types[2] = 'normal'; } // 처음 만남 보장 문 (2챕터)
  if ((run.ch || 1) >= FATE.from && f > 1 && (d.counts.fate || 0) < FATE.max && !types.includes('fate') && Math.random() < FATE.p) { const rs = types.map((t, i) => RESTS.includes(t) ? i : -1).filter(i => i >= 0); if (rs.length) types[rs[Math.floor(Math.random() * rs.length)]] = 'fate'; } /* 운명의 저울 (2챕터부터): 쉬는 문 하나를 바꾼다 */
  let used = 0; return types.map(t => mkRoom(run, t, f, t === 'normal' && force && !used++ ? { force } : null));
}
/* 테마 무리 고르기: 지난 방의 무리와 이 층의 다른 문에 나온 무리는 빼고, 압박이 센 무리는 험한 길에서 잦게 */
function pickSquad(run, f) {
  const d = run.dg; if (!d.fsq || d.fsqF !== f) { d.fsq = []; d.fsqF = f; }
  const pw = { rough: 1.6, quiet: 0.5 }[run.path] || 1;
  const ws = SQUADS.map(s => !inCh(s, run.ch) || (s.from && f < s.from) || !(isLower(f) ? s.low : s.up) || ((low => low.filter(x => !introOk(run, x[0])).length >= 2)(isLower(f) ? s.low : s.up)) || d.fsq.includes(s.id) || s.id === d.lastSquad ? 0 : s.w * (s.press ? pw : 1)); // 챕터가 다른 무리, 아직 나오지 않을 층, 처음 보는 새 역할이 둘 이상인 조합 무리는 무게 0
  let x = Math.random() * ws.reduce((a, v) => a + v, 0), pick = SQUADS[0]; for (let i = 0; i < SQUADS.length; i++) { x -= ws[i]; if (x <= 0 && ws[i] > 0) { pick = SQUADS[i]; break; } }
  d.fsq.push(pick.id); return pick;
}
function rollMods(n, ch) { const ks = Object.keys(ROOM_MODS).filter(k => k !== 'calm' && (!ROOM_MODS[k].chs || ROOM_MODS[k].chs.includes(ch || 1))); /* 고요(마나 회복)는 마나가 없는 0.6a.2 직업에게 효과가 없어 뽑지 않는다 (10월 5일) */ const out = []; while (out.length < n) { const k = pickR(ks); if (!out.includes(k)) out.push(k); } return out; }
const NEWR = ['skeleton', 'hexer', 'mason', 'burrower', 'bloat']; // 2챕터 새 역할: 처음 만나기 전에는 변주 칸 · 조합에 끼지 않는다
const INTRO_SQ = { skeleton: 'bonepatrol', hexer: 'knot', burrower: 'burrow', mason: 'masonry', bloat: 'diggers' }; // 처음 만남 보장 문의 무리
const introOk = (run, role) => !((run.ch || 1) >= 3 ? NEWR3 : NEWR).includes(role) || !!((run.dg && run.dg.intro) || {})[role];
const introOk3 = (run, k) => !!((run.dg && run.dg.intro) || {})[k]; // 3챕터: 처음 만남 문의 역할 · 특성을 이번 챕터에서 만났는가
function mkRoom(run, t, f, opt) {
  opt = opt || {};
  const T = ROOM_TYPES[t], low = isLower(f), P = pathOf(run.path, run.mode); const ch = run.ch || 1; const r = { type: t, floor: f, ch, lv: mlvOf(f, ch), names: ENEMY_NAMES[ch] || ENEMY_NAMES[1], path: run.path || 'main' };
  if (T.fight) {
    if (t === 'strong') { const chA = STRONG_FOES.filter(x => inCh(x, ch)); const chB = chA.filter(x => (low || x.upper !== 0) && (!x.from || f >= x.from) && (!x.needs || x.needs.every(r => introOk(run, r)))); const chF = chB.length ? chB : chA; /* 하층 전용 강적, 호위의 새 역할을 아직 못 만났으면 뽑지 않는다 */ const unused = chF.filter(x => !run.dg.foes.includes(x.id)); const foe = pickR(unused.length ? unused : chF); r.en = JSON.parse(JSON.stringify(foe.en)); r.strong = foe.n; r.foe = foe.id; }
    else if (t === 'treasure') r.en = JSON.parse(JSON.stringify(pickR(ch >= 3 && ENC.treasure3 ? ENC.treasure3 : ch >= 2 && ENC.treasure2 ? ENC.treasure2 : ENC.treasure)));
    else { const sq = opt.force && SQUADS.find(x => x.id === (ch >= 3 ? INTRO_SQ3 : INTRO_SQ)[opt.force] && inCh(x, ch)) || pickSquad(run, f); r.squad = sq.id; r.en = JSON.parse(JSON.stringify(low ? sq.low : sq.up)); if (opt.force === 'bloat' && sq.vary) { r.en[sq.vary[0]][0] = 'bloat'; r.intro = 'bloat'; } else if (sq.vary && Math.random() < SQUAD_VARY) { const [vi, pool] = sq.vary; const pl = pool.filter(x => introOk(run, x) || x === opt.force); if (r.en[vi] && pl.length) r.en[vi][0] = pickR(pl); } if (opt.force) r.intro = opt.force; } // 테마 무리 + 변주 (10월 4일). 2챕터: 처음 만남 보장 문, 아직 만나지 않은 새 역할은 변주에 끼지 않는다
    if (ch >= 3) { const fm = opt.force && MOD3_NEW.includes(opt.force) ? opt.force : null; r.mods = t === 'trial' ? rollMods3(run, 2, f, fm) : t !== 'strong' && (fm || Math.random() < chData(ch).modChance[low ? 'lower' : 'upper']) ? rollMods3(run, 1, f, fm) : []; } // 3챕터 특성 (띠 · 길 무게, 처음 만남 문)
    else if (t === 'trial') r.mods = rollMods(2, ch);
    else if (t !== 'strong' && Math.random() < MOD_CHANCE[low ? 'lower' : 'upper']) r.mods = rollMods(1, ch);
    else r.mods = [];
    if (markOn(run, 'trait') && t !== 'strong') { const ex = ch >= 3 ? rollMods3(run, 1, f, null) : rollMods(1, ch); for (const k of ex) if (!r.mods.includes(k)) r.mods.push(k); } // 표식 trait: 방 특성 하나 더
    if (t === 'ambush') { r.ambush = 1; let k = AMBUSH.elite; for (const x of r.en) if (k > 0 && !x[1] && x[0] !== 'bomber') { x[1] = 1; k--; } } // 매복: 정예 하나 더
    r.tough = r.en.map((x, k) => x[1] && !(r.strong && k === 0) ? k : -1).filter(k => k >= 0 && Math.random() < TOUGH_CHANCE[low ? 'lower' : 'upper'] * (markOn(run, 'elite') ? MARKS.elite.mul : 1)); // 정예에게 강인 (표식 elite: 접사 확률 배율) (강적 본인은 제외)
    if (ch >= 3) { if (!r.ambush) { const sw = [], fi = []; r.tough = r.tough.filter(k => { const o = [['tough', AFFIX_W3.tough]].concat(f >= SWIFT.from ? [['swift', AFFIX_W3.swift]] : []).concat(f >= FIRE_AFFIX.from ? [['fire', AFFIX_W3.fire * (run.path === 'rough' ? 1.5 : 1)]] : []); let x = Math.random() * o.reduce((a, c) => a + c[1], 0); let pk = o[0][0]; for (const c of o) { x -= c[1]; if (x <= 0) { pk = c[0]; break; } } if (pk === 'swift') sw.push(k); if (pk === 'fire') fi.push(k); return pk === 'tough'; }); r.swift = sw; r.fire = fi; } } // 3챕터 접사: 강인 · 신속 · 화염 강화(15층부터), 매복은 강인만
    else if (ch >= 2 && f >= SWIFT.from && !r.ambush) { r.swift = r.tough.filter(() => Math.random() < SWIFT.share); r.tough = r.tough.filter(k => !r.swift.includes(k)); } // 신속 접사: 접사의 절반, 매복은 강인만
    r.gold = Math.round(rint(T.gold[0], T.gold[1]) * P.gold * (chData(ch).gold || 1) * (run.mode === 'hard' ? MODES.hard.gold : 1));
    r.risk = Math.max(1, Math.min(4, T.risk + (low ? 1 : 0) + P.risk));
    r.hide = Math.random() < HIDE_REWARD ? 1 : 0;
    if (ch >= 3 && (run.dg.reveal || []).includes(f)) r.hide = 0; // 사막 나침반 · 왕의 해시계
  }
  if (t === 'shrine') r.shrine = pickR(SHRINES.filter(x => !x.chs || x.chs.includes(ch))).id;
  if (t === 'altar') r.altar = pickR(ALTARS.filter(x => !x.chs || x.chs.includes(ch))).id;
  if (t === 'event') { const chE = EVENTS.filter(e => inCh(e, ch)); const left = chE.filter(e => !run.dg.events.includes(e.id)); r.event = (pickR(left) || chE[0]).id; }
  return r;
}
function fixedRoom(f) { const ch = (G.run && G.run.ch) || 1; return f === FLOOR_CAMP ? { type: 'camp', floor: f, ch } : f === FLOOR_BOSS ? { type: 'boss', floor: f, boss: 1, ch, lv: mlvOf(f, ch) } : null; }
function chooseDoor(i) {
  const run = G.run, d = run.dg; const r = run.doors && run.doors[i]; if (!r) return;
  d.counts[r.type] = (d.counts[r.type] || 0) + 1; d.last = r.type; if (r.squad) d.lastSquad = r.squad;
  if (r.type === 'strong') { d.strong[isLower(r.floor) ? 'l' : 'u']++; d.foes.push(r.foe); }
  if (r.type === 'event') d.events.push(r.event);
  run.doorLog.push({ floor: run.room, offered: run.doors.map(x => x.type + (x.mods && x.mods.length ? '+' + x.mods.join('+') : '')), picked: i, t: Date.now() });
  run.cur = r; run.doors = null; saveRunLocal(); saveCur(); render();
}
/* 방을 마치면 다음 층으로. 성소·이벤트 버프는 방 하나를 지날 때마다 줄어든다 */
function advanceFloor() {
  const run = G.run;
  for (const k in run.buffs) { run.buffs[k]--; if (run.buffs[k] <= 0) delete run.buffs[k]; }
  run.room++; run.cur = fixedRoom(run.room);
  if ((run.ch || 1) >= 3 && run.room <= FLOORS) { const bd = floorBand3(run.room), pv = floorBand3(run.room - 1); if (bd !== pv) toast(bd.n + '. ' + bd.line); } // 3챕터: 해의 흐름 띠에 들어설 때 한 줄
  if (!run.cur && PATH_AT.includes(run.room)) { run.cross = { floor: run.room }; run.doors = null; } // 갈래길: 길을 고른 뒤 문이 나온다
  else run.doors = run.cur ? null : genDoors(run, run.room);
  saveRunLocal(); saveCur();
}
function choosePath(id) {
  const run = G.run; if (!run.cross || !PATHS[id]) return;
  if (id === 'quiet' && markOn(run, 'noquiet')) return; // 표식 noquiet
  run.path = id; (run.pathLog = run.pathLog || []).push({ floor: run.room, path: id, t: Date.now() }); run.cross = null;
  run.doors = genDoors(run, run.room); saveRunLocal(); saveCur(); render();
}
/* 옛 저장본(19층)을 24층 틀로 옮긴다: 상층 그대로, 야영지 9 → 12, 하층 10~17 → 13~20, 샘 18 → 23, 보스 19 → 24 */
function dgFix(run) {
  if (run && !run.mode) run.mode = 'normal'; /* 가혹 모드: 옛 저장본은 일반 */
  if (run && !run.legSeen) run.legSeen = []; /* 2챕터 장비: 이 런에서 나온 전설 (같은 전설은 한 번만) */
  if (run && !run.awk) run.awk = []; /* 깨달음: 옛 저장본은 없음 (p.awk는 깨달음을 얻을 때 맞춘다) */
  if (run && run.p && (run.ch || 1) >= 2) for (let c = 2; c <= run.ch; c++) chGift(run, c, true); /* 챕터 선물: 이미 그 챕터에 들어선 옛 저장본도 받는다 */
  if (!run || !run.dg || run.dgv === 2) return;
  const m = f => f <= 8 ? f : f === 9 ? FLOOR_CAMP : f <= 17 ? f + 3 : f === 18 ? FLOOR_BOSS - 1 : FLOOR_BOSS;
  run.room = m(run.room || 1); if (run.cur && run.cur.floor) run.cur.floor = m(run.cur.floor); for (const d of run.doors || []) if (d.floor) d.floor = m(d.floor);
  run.path = run.path || 'main'; run.dgv = 2;
}
/* 전리품을 차례로 하나씩 건넨다 (방마다 여러 개일 수 있다) */
function rollGrade(minG) { const x = Math.random() * 100; let g = x < 50 ? 'n' : x < 90 ? 'm' : 'r'; if (minG === 'm' && g === 'n') g = Math.random() < 0.8 ? 'm' : 'r'; if (minG === 'r') g = 'r'; return g; }
/* 2챕터부터의 장비 등급 확률 (장비-경제.md 5.1절). room: 일반 · 매복, big: 강적 · 시련 · 보물, boss: 챕터 보스. 표가 없는 챕터(1챕터)는 예전 그대로 rollGrade · 희귀 */
const DROP_G = { 2: { room: { n: 58, m: 30, r: 10, h: 1.8, l: 0.2 }, big: { r: 88, h: 10, l: 2 }, boss: { r: 60, h: 32, l: 8 } }, 3: { room: { n: 50, m: 32, r: 14, h: 3.4, l: 0.6 }, big: { r: 88, h: 10, l: 2 }, boss: { r: 60, h: 32, l: 8 } } };
const OLD_DROP = 0.1; /* 2챕터부터 드롭의 10%는 이전 챕터 풀에서 (평범 · 고급 · 희귀만) */
function rollGradeCh(ch, src) { const T = DROP_G[ch || 1] && DROP_G[ch || 1][src]; if (!T) return src === 'room' ? rollGrade() : 'r'; const hard = G.run && G.run.mode === 'hard'; const W = g => (hard && (g === 'h' || g === 'l') ? MODES.hard.hero : 1) * (T[g] || 0); let x = Math.random() * (hard ? ['n', 'm', 'r', 'h', 'l'].reduce((q, g) => q + W(g), 0) : 100); /* 가혹: 영웅 · 전설 확률 ×1.5 (나머지는 그만큼 줄어든다) */ for (const g of ['n', 'm', 'r', 'h', 'l']) { if (!T[g]) continue; if (x < W(g)) return g; x -= W(g); } return 'r'; }
function dropKey(run, g, not) {
  const owned = Object.values(run.inv || {}).map(x => x.tpl); not = not || [];
  let src = poolOf(run.ch); if ((run.ch || 1) >= 2 && 'nmr'.includes(g) && Math.random() < OLD_DROP) src = poolOf(run.ch - 1);
  const base = src.filter(k => poolOk(run.p, k));
  if (g === 'l') { const seen = run.legSeen || []; if (!base.some(k => ITEMS[k].g === 'l' && !seen.includes(k) && !not.includes(k))) g = 'h'; else not = not.concat(seen); } /* 같은 전설은 한 런에 한 번 */
  let c = base.filter(k => (ITEMS[k].g || 'n') === g && !owned.includes(k) && !not.includes(k)); if (!c.length) c = base.filter(k => (ITEMS[k].g || 'n') === g && !not.includes(k));
  const fit = c.filter(k => itemFits(run.p, k)); const pool = Math.random() < 0.3 && fit.length ? fit : c; const k = pickR(pool);
  if (k && ITEMS[k] && ITEMS[k].g === 'l') run.legSeen = (run.legSeen || []).concat([k]);
  return k;
}
/* 챕터 보스를 이기면 장비 하나 (표가 있는 챕터만, 정산 화면에 보인다) */
function bossLoot(run) { if (!DROP_G[run.ch || 1]) return null; const it = mkItem(dropKey(run, rollGradeCh(run.ch, 'boss'))); it.g = ITEMS[it.tpl].g || 'n'; if (!addItem(run, it)) return { tpl: it.tpl, g: it.g, lost: 1 }; run.drops.push({ room: run.room, item: it.tpl, g: it.g, b: it.b, boss: 1, ch: run.ch || 1 }); return { tpl: it.tpl, g: it.g }; }
function queueDrops(list) { G.dropQ = (G.dropQ || []).concat(list); nextDrop(); }
function nextDrop() {
  const run = G.run; if (G.winSumShown) { G.winSum = null; G.winSumShown = false; }
  if (!run || !G.dropQ || !G.dropQ.length) { G.winSum = null; render(); return; }
  const it = G.dropQ.shift(); if (it.chest) { openSheet('choice', { offer: it.chest, room: it.room, chest: 1 }); if (G.winSum) G.winSumShown = true; return; } run.drops.push({ room: run.room, item: it.tpl, g: it.g, b: it.b, ch: run.ch || 1 }); giveItem(it); if (G.winSum) G.winSumShown = true;
}
function gainXp(run, n) {
  run.xp = (run.xp || 0) + n; let up = 0;
  while (run.lv < LV_XP.length && run.xp >= LV_XP[run.lv]) { run.lv++; up++; }
  if (up) { if (run.tree) run.tree.pts += up; const p = run.p; const before = p.hpMax, mpb = p.mpMax; p.lv = run.lv; applyGear(run); p.hp = Math.min(p.hpMax, p.hp + (p.hpMax - before)); p.mp = Math.min(p.mpMax, p.mp + (p.mpMax - mpb)); (run.lvLog = run.lvLog || []).push({ lv: run.lv, room: run.room, t: Date.now() }); }
  return up;
}
function gainGold(run, n, why) { const m = fxVal(run.p, 'goldMul', 1, (a, v) => a * v); const g = Math.round(n * m); run.gold = (run.gold || 0) + g; sfx('coin'); toast((why ? why + '. ' : '') + '골드 +' + g); return g; }

function roomDef() { const run = G.run; return run.cur || fixedRoom(run.room) || {}; }
function statNext(p, k) {
  const s = stat(p, k), B = BUILDS[p.build]; const up = Object.assign({}, p, { stat: Object.assign({}, p.stat, { [k]: s + 1 }) });
  if (k === 'str') return `생명력 ${calcHpMax(p)} → ${calcHpMax(up)}, 무기 공격 피해 +${s}% → +${s + 1}%, 내가 채우는 붕괴 +${s}% → +${s + 1}%` + ((s + 1) % 10 === 0 ? '. 10점: 강공격 붕괴 +5' : '');
  if (k === 'dex') return `스태미나 ${calcStMax(p)} → ${calcStMax(up)}, 흘리기 감소 ${Math.round(parryRed(p) * 1000) / 10}% → ${Math.round(parryRed(up) * 1000) / 10}%, 빠르기 +${(s * 0.5).toFixed(1)}% → +${((s + 1) * 0.5).toFixed(1)}%` + ((s + 1) % 10 === 0 ? '. 10점: 흘리기 스태미나 −1' : '');
  if (k === 'con') return `생명력 ${calcHpMax(p)} → ${calcHpMax(up)}`;
  if (k === 'wil') return `보호막으로 얻는 양과 회복 +${s * 2}% → +${(s + 1) * 2}%, 해로운 상태를 버틸 확률 ${Math.min(25, s)}% → ${Math.min(25, s + 1)}%`;
  return (isV2(p) ? '' : `마나 ${calcMpMax(p)} → ${calcMpMax(up)}, `) + `지속 피해와 정화 피해 +${s * 2}% → +${(s + 1) * 2}%` + ((s + 1) % 10 === 0 && !isV2(p) ? '. 10점: 독 격발 붕괴 +5' : '');
}
/* 3챕터 이벤트의 "다음 전투" (11.1절): 다음 일반 · 매복 전투에만 붙는다 */
function next3Room(room, n3) {
  if (!n3 || !Object.keys(n3).length) return;
  if (n3.pre) room.pre = Object.assign({}, room.pre || {}, n3.pre);
  if (n3.herald) { room.en = (room.en || []).concat([['bruiser', 1]]); room.fire = (room.fire || []).concat([room.en.length - 1]); }
  if (n3.ambush && !room.ambush) room.ambush = 1;
  if (n3.noon) { room.mods = (room.mods || []).filter(m => m !== 'noon').concat(['noon']); room.heat0 = n3.noon; }
}
/* 3챕터: 처음 만난 위협의 방을 이기면 그 상황을 푸는 소모품 하나 (5.1절 5번) */
function firstGift3(run, b, R) {
  run.dg.gift = run.dg.gift || {}; const keys = b.en.map(e => e.role).concat(R.mods || []);
  for (const k of keys) if (FIRST_GIFT3[k] && !run.dg.gift[k]) { run.dg.gift[k] = 1; if (k === 'haze') run.dg.gift.mirage = 1; if (k === 'mirage') run.dg.gift.haze = 1; if (!consAdd(run, FIRST_GIFT3[k], 'n', 1)) toast('처음 겪은 것의 답: ' + CONS[FIRST_GIFT3[k]].ico + ' ' + CONS[FIRST_GIFT3[k]].n); }
}
const ashOk = c => CONS[c.id].use !== 'none' && CONS[c.id].price > 6; // 재의 제단에 태울 수 있는 것 (파는 것 · 돌멩이 제외)
function burnCons(run, n) { if ((run.cons || []).filter(ashOk).reduce((a, c) => a + c.n, 0) < n) return false; for (let k = 0; k < n; k++) { const c = run.cons.find(ashOk); c.n--; if (c.n <= 0) run.cons.splice(run.cons.indexOf(c), 1); } return true; }
/* 2챕터 이벤트 · 제단 도우미 (10월 5일) */
const EVBUFF = { snuff: ['꺼진 촛불', '받는 화상 피해 0, 대신 주는 피해 −5%.'], procession: ['장례 행렬', '받는 직접 피해 −10%, 주는 피해 −10%.'], ashcover: ['재를 덮어 주었다', '받는 직접 피해 −5%.'], herald: ['전령에게 무릎 꿇었다', '받는 화상 피해 0, 대신 주는 피해 −5%.'] }; // 이벤트로 얻는 몇 방 동안의 효과
const altarGold = run => { const A = ALTARS.find(x => x.id === 'gold'); const v = A && A.cost ? A.cost[Math.min(A.cost.length, run.ch || 1) - 1] : 40; return v; };
function n3pre(run, k, n) { run.next3 = run.next3 || {}; run.next3.pre = Object.assign({}, run.next3.pre); run.next3.pre[k] = (run.next3.pre[k] || 0) + n; } // 3챕터 이벤트: 다음 일반 · 매복 전투의 시작 상태
function takeCons(run, n) { const pool = (run.cons || []).filter(c => CONS[c.id].use !== 'none'); if (pool.reduce((a, c) => a + c.n, 0) < n) return false; for (let k = 0; k < n; k++) { const c = run.cons.find(x => CONS[x.id].use !== 'none'); c.n--; if (c.n <= 0) run.cons.splice(run.cons.indexOf(c), 1); } return true; }
function giveChCons(run, ch) { const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) === ch && CONS[k].use !== 'none'); if (!ids.length) return; const id = pickR(ids); consAdd(run, id, 'n', 1); }
function refundDeepest(run) { const t = run.tree; if (!t || !t.open.length) return null; const isPar = id => t.open.some(o => SK2[o] && (SK2[o].par || []).includes(id) && !(SK2[o].par || []).some(x => x !== id && t.open.includes(x))); const c = t.open.filter(id => SK2[id] && !isPar(id)).sort((a, b) => (SK2[b].row || 0) - (SK2[a].row || 0))[0]; if (!c) return null; t.open = t.open.filter(x => x !== c); t.pts++; t.spent[SK2[c].b] = Math.max(0, (t.spent[SK2[c].b] || 0) - 1); run.skills = (run.skills || []).filter(x => x !== c); if (run.p) run.p.skills = v2Equip(run); (run.treeLog = run.treeLog || []).push({ room: run.room, id: c, refund: 'master', t: Date.now() }); return c; }
function enterRoom() {
  const run = G.run; const R = roomDef(); const p = run.p; if (!R.type) return;
  if (!ROOM_TYPES[R.type] || !ROOM_TYPES[R.type].fight) { if (R.type !== 'boss') return; }
  const nx = run.next || {}; const room = Object.assign({}, R, { buffs: Object.assign({}, run.buffs), pre: nx.pre || null, mode: run.mode || 'normal' });
  if (run.marks && run.marks.length) room.marks = run.marks; // 표식 도전
  const n3 = ['normal', 'ambush'].includes(R.type) ? (run.next3 || {}) : {}; next3Room(room, n3); if (['normal', 'ambush'].includes(R.type)) { run.next3Used = n3; run.next3 = {}; } else run.next3Used = null; // 3챕터 이벤트의 "다음 전투": 다음 일반 · 매복 전투에만
  if (nx.chase && R.type !== 'boss') { room.en = (room.en || []).concat([['bruiser']]); }
  if (nx.coffin && R.type !== 'boss') room.en = (room.en || []).concat([['skeleton', 1]]); // 봉인된 관
  if (nx.block && R.type !== 'boss') room.en = (room.en || []).concat([['bruiser']]); // 장례 행렬을 막아섰다
  run.entry = JSON.parse(JSON.stringify(p));
  run.entryHp = p.hp / p.hpMax; run.entryFl = p.flask.life + p.flask.mana + (p.flask.stam || 0);
  G.b = roomBattle(p, room, run.boss, run.room * 7 + 3); G.b.stepMode = true; fdetFresh();
  { run.dg.intro = run.dg.intro || {}; G.data.seenRole = G.data.seenRole || {}; for (const e of G.b.en.concat((R.mods || []).map(m => ({ role: m })))) { const k = e.swift ? 'swift' : e.fire ? 'fire' : e.role; run.dg.intro[e.role] = 1; for (const kk of [e.role, k]) if (typeof ROLE_INTRO !== 'undefined' && ROLE_INTRO[kk] && !G.data.seenRole[kk]) { G.data.seenRole[kk] = 1; logp(G.b, 'sys', '처음 만남 · ' + ((ENEMY_NAMES[run.ch || 1] || {})[kk] || (ROOM_MODS[kk] || {}).n || { swift: '신속', fire: '화염 강화' }[kk] || kk) + '. ' + ROLE_INTRO[kk][0] + ' ' + ROLE_INTRO[kk][1]); if (typeof toast === 'function') toast(ROLE_INTRO[kk][1]); } } } // 2챕터 새 역할을 처음 만나면 한 번 알린다
  if (nx.chase) { const e = G.b.en[G.b.en.length - 1]; if (e) e.n = '굶주린 수도사'; }
  run.nextUsed = nx; run.next = {}; saveBattle();
  G.data.seenBoss = G.data.seenBoss || {};
  const fid = R.boss ? run.boss : R.foe; G.data.seenFoe = G.data.seenFoe || {};
  if (fid && FOE_INTRO[fid] && !G.data.seenFoe[fid]) { G.data.seenFoe[fid] = 1; G.b.firstFoe = 1; codexMeet(fid); saveLocal(); setTimeout(() => openSheet('bossinfo', { foe: fid }), 30); }
  else if (R.boss && !FOE_INTRO[run.boss] && !G.data.seenBoss[run.boss]) { G.data.seenBoss[run.boss] = 1; saveLocal(); setTimeout(() => openSheet('bossinfo', { boss: run.boss }), 30); }
  G.sel = null; render();
}
function afterBattle() {
  const b = G.b, run = G.run, p = run.p;
  codexMerge(b);
  const rec = { ch: run.ch || 1, type: (G.run.cur || {}).type || '', squad: (G.run.cur || {}).squad || undefined, foe: (G.run.cur || {}).foe || undefined, mods: (G.run.cur || {}).mods || [], gear: run.eqU ? EQ_SLOTS.map(sl => { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; return it ? it.tpl + ':' + it.g : null; }) : null, room: run.room, res: b.over, acts: b.turnIdx, t: Math.round(b.t * 10) / 10, hpIn: r1(run.entryHp), hpOut: r1(p.hp / p.hpMax), flIn: run.entryFl, flOut: p.flask.life + p.flask.mana, item: Object.values(p.eq).filter(Boolean) };
  run.rooms.push(rec);
  for (const x of b.rec) run.acts.push(Object.assign({ r: run.room }, x));
  if (b.over === 'lose') { run.deaths.push(run.room); }
}
function battleContinue() {
  const b = G.b, run = G.run, R = roomDef();
  afterBattle();
  if (b.over === 'lose') {
    const acts = b.rec.filter(x => x.k === 'act').slice(-3).map(x => x.a); const hl = (b.hits3 || []).slice(-3);
    run.grave = { kill: hl.length ? hl[hl.length - 1] : null, hits: hl, id: run.id, cname: run.cname || '', lv: run.lv || 1, room: run.room, roomN: floorName(run.room) + (run.cur && ROOM_TYPES[run.cur.type] ? ' ' + ROOM_TYPES[run.cur.type].n + ' 방' : ''), build: run.build, name: G.data.name || '', eq: Object.values(run.p.eq).filter(Boolean), last: acts, stats: Object.assign({}, run.stats), at: Date.now() };
    if (b.heatLog && b.ctx.bossKind === 'queen') run.grave.heat = Object.assign({}, b.heatLog); if ((run.ch || 1) >= 3) run.grave.ch = run.ch;
    G.data.graves = [run.grave].concat(G.data.graves || []).slice(0, 20);
    run.result = 'lose'; run.sealed = 1; clearCur(); pushRank(run, 'dead');
    G.scr = 'dead'; saveRunLocal(); clearTimeout(syncT); syncRun(run).then(render); render(); return;
  }
  endBattleCarry(run.p);
  G.b = null;
  if (b.over === 'flee') { saveRunLocal(); saveCur(); toast('방 밖으로 물러났습니다. 이 방을 이겨야 앞으로 갈 수 있습니다'); render(); return; }
  if (R.boss && b.over === 'win') { grantDrops(run, b); const up = gainXp(run, Math.round(b.xp || 0)); if (up) run.statPending = (run.statPending || 0) + LV_POINTS * up; run.clears = (run.clears || 0) + 1; G.data.hardOpen = 1; run.result = 'win'; /* 0.6a.2: 챕터 돌파 포인트 2는 없앴다(레벨마다 1점, Lv10에 10점) */ run.rooms.push({ room: run.room, type: 'boss', res: 'win' }); if (run.markCh) markWin(run); else run.goalNews = goalsRecord(run); const bl = bossLoot(run); startSettle(run); if (bl) run.settle.loot = bl; G.scr = 'settle'; saveRunLocal(); saveCur(); pushRank(run, 'clear'); render(); return; } // 정산부터는 이어 하기가 정산 화면으로 돌아온다(보스를 다시 싸우지 않는다)
  if (R.boss) { run.result = 'flee'; run.sealed = 1; clearCur(); G.scr = 'survey'; saveRunLocal(); render(); return; }
  // 승리 보상 (11.3절): 골드, 장비
  const nu = run.nextUsed || {}; run.nextUsed = null;
  if (b.rotted) { run.next = run.next || {}; run.next.pre = Object.assign({}, run.next.pre, { poison: ((run.next.pre || {}).poison || 0) + 3 }); toast('썩은 기운이 몸에 남았습니다. 다음 전투에 중독 3'); }
  const g0 = run.gold || 0, nLL = (run.lootLog || []).length;
  grantDrops(run, b);
  const lootE = (run.lootLog || []).length > nLL ? run.lootLog[run.lootLog.length - 1] : null;
  fxRun(run.p, 'onWin', run);
  const xpGot = Math.round(b.xp || 0); const lvUp = gainXp(run, xpGot);
  const nu3 = run.next3Used || {}; run.next3Used = null; if ((run.ch || 1) >= 3) firstGift3(run, b, R);
  let gold = (R.gold || 0) * (R.mods && (R.mods.includes('bell') || R.mods.includes('drums')) ? 1.5 : 1) + (nu.chase ? 20 : 0) + (nu.block ? 30 : 0) + (R.type === 'treasure' ? fxVal(run.p, 'treasureGold', 0, (a, v) => a + v) : 0);
  if (gold) gainGold(run, gold, ROOM_TYPES[R.type].n + ' 방을 넘었습니다');
  G.winSum = { gold: Math.round((run.gold || 0) - g0), xp: xpGot, lv: lvUp ? run.lv : 0, got: lootE ? lootE.got : {}, lost: lootE ? lootE.lost : 0 }; // 화면 요약용(규칙에 쓰지 않는다)
  const drops = []; const t = R.type;
  const PU = pathOf(R.path, G.run && G.run.mode).up || 0; const pg = g => PU > 0 && g !== 'r' && g !== 'h' && g !== 'l' && Math.random() < PU ? (g === 'n' ? 'm' : 'r') : PU < 0 && g !== 'n' && g !== 'h' && g !== 'l' && Math.random() < -PU ? (g === 'r' ? 'm' : 'n') : g; /* 영웅 · 전설은 길로 오르내리지 않는다 */ // 길: 장비 등급 한 단계 오르내림 (10월 4일)
  if (t === 'normal' || t === 'ambush') drops.push(mkItem(dropKey(run, pg(rollGradeCh(run.ch, 'room'))), { g: undefined }));
  if (t === 'strong') drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'big')))); /* 강적은 희귀 이상 보장 (10월 4일, 2챕터부터 영웅 · 전설도) */
  if (t === 'trial') drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'big'))));
  if (nu.coffin) drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'big'))));
  if (nu3.herald) drops.push(mkItem(dropKey(run, 'r'))); // 여왕의 전령에게 칼을 뽑았다
  for (let k = 0; k < (nu.extraDrop || 0); k++) drops.push(mkItem(dropKey(run, pg(rollGradeCh(run.ch, 'room')))));
  for (const it of drops) it.g = ITEMS[it.tpl].g || 'n';
  advanceFloor();
  const q = []; if (t === 'treasure') { const a = dropKey(run, rollGradeCh(run.ch, 'big')), b2 = dropKey(run, pg(rollGradeCh(run.ch, 'room')), [a]); q.push({ chest: [a, b2], room: run.room - 1 }); }
  q.push(...drops);
  if (lvUp && typeof sfx === 'function') sfx('b_levelup'); if (xpGot) toast('경험치 +' + xpGot + (lvUp ? ' · 레벨 ' + run.lv + ' 달성' : ''));
  if (lvUp) { G.dropQ = (G.dropQ || []).concat(q); openSheet('stats', { pts: LV_POINTS * lvUp, why: '레벨 ' + run.lv + ' · 능력치 ' + LV_POINTS * lvUp + '점' }); saveRunLocal(); saveCur(); return; }
  queueDrops(q);
}

function retryRoom() {
  const run = G.run; run.p = JSON.parse(JSON.stringify(run.entry)); G.b = null; G.scr = 'run';
  if (roomDef().block) { openBlock(true); return; }
  render();
}
function endRun(result) { const run = G.run; run.result = run.result || result; run.sealed = 1; clearCur(); G.scr = 'survey'; render(); }
const CHUNK = 250;
function runMeta(run, status) {
  const r = runRecord(run); delete r.acts;
  r.status = status || run.status || 'progress'; r.actsN = run.acts.length; r.chunks = Math.ceil(run.acts.length / CHUNK); r.updatedAt = Date.now();
  return r;
}
let syncT = 0, syncBusy = false;
function scheduleSync() { clearTimeout(syncT); syncT = setTimeout(() => { if (G.run) syncRun(G.run); }, 1500); }
async function syncRun(run, status) {
  if (status) run.status = status;
  if (!G.db || !G.uid || G.conn === 'readonly') { G.sync = CONN_MSG[G.conn] || CONN_MSG.nodb; return false; }
  if (syncBusy) { scheduleSync(); return false; }
  syncBusy = true;
  try {
    const base = 'playtest/' + G.uid + '/' + COL.runs + '/' + run.id;
    await G.db.doc('playtest/' + G.uid).set(testerMeta());
    const from = Math.floor((run.syncedActs || 0) / CHUNK), to = Math.ceil(run.acts.length / CHUNK);
    for (let c = from; c < to; c++) await G.db.doc(base + '/acts/c' + String(c).padStart(3, '0')).set({ i: c, a: run.acts.slice(c * CHUNK, (c + 1) * CHUNK) });
    run.syncedActs = run.acts.length;
    await G.db.doc(base).set(runMeta(run));
    G.sync = '기록을 보냈습니다 (' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ').';
    return true;
  } catch (e) {
    if (e && /grant|permission|writer|denied|forbidden/i.test(String(e.code || e.message || ''))) { G.conn = 'readonly'; G.sync = CONN_MSG.readonly; return false; }
    G.sync = '기록을 보내지 못했습니다(' + (e && e.code || '오류') + '). 이 브라우저에는 남아 있으니, 첫 화면의 "기록 보내기 코드"로 전달해 주세요.'; return false;
  } finally { syncBusy = false; }
}
function saveRunLocal() {
  const run = G.run; if (!run) return;
  scheduleSync();
  const rec = runRecord(run);
  const i = G.data.runs.findIndex(x => x.id === run.id);
  if (i >= 0) G.data.runs[i] = rec; else G.data.runs.push(rec);
  saveLocal();
}
function runRecord(run) {
  return Object.assign({ discards: run.discards || [], inv: run.inv ? Object.values(run.inv).map(x => ({ tpl: x.tpl, g: x.g, b: x.b })) : null, id: run.id, v: VERSION, build: run.build, boss: run.boss, startedAt: run.startedAt, endedAt: run.endedAt || null, result: run.result, roomReached: run.room, deaths: run.deaths, rooms: run.rooms, acts: run.acts.slice(-900), swaps: run.swaps, blockPicked: run.blockPicked, drops: run.drops, survey: run.survey, stats: run.stats || null, statLog: run.statLog || [], choices: run.choices || [], skills: run.skills || null, skillLog: run.skillLog || [], cname: run.cname || '', ch: run.ch || 1, clears: run.clears || 0, lv: run.lv || 1, xp: Math.round(run.xp || 0), gold: run.gold || 0, playMs: Math.round(run.playMs || 0), doorLog: run.doorLog || [], settle: run.settle || null, shop: run.shop ? { log: run.shop.log, stock: run.shop.stock.map(x => ({ tpl: x.it.tpl, g: x.it.g, price: x.price, sold: x.sold })) } : null, eq7: run.eqU ? EQ_SLOTS.map(sl => { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; return it ? it.tpl + ':' + it.g : null; }) : null, phase: run.phase || '', surveys: run.surveys || null, awk: run.awk || [], awkLog: run.awkLog || [], gambleN: run.gambleN || 0 }, run.markCh ? { marks: run.marks || [], markCh: run.markCh, markPts: run.markPts || 0, mode: run.mode || 'normal' } : null);
}
async function finishSurvey(ans) {
  const run = G.run;
  if (run.phase === 'clearsv') { // 챕터를 깬 설문: 캐릭터는 2챕터를 기다린다
    run.surveys = Object.assign({}, run.surveys, { ['ch' + (run.ch || 1)]: ans }); run.survey = ans; run.phase = 'wait'; G.scr = 'wait'; saveRunLocal(); saveCur(); render();
    pushRank(run, 'clear'); clearTimeout(syncT); await syncRun(run, 'clear' + (run.ch || 1)); render(); return;
  }
  run.survey = ans; run.endedAt = Date.now(); saveRunLocal();
  pushRank(run, run.result === 'lose' ? 'dead' : run.result === 'abandon' ? 'abandon' : undefined);
  G.data.prog[run.build + '_' + run.boss] = (G.data.prog[run.build + '_' + run.boss] || 0) + 1; clearCur();
  G.scr = 'title'; render();
  clearTimeout(syncT); await syncRun(run, 'done'); G.run = null; render();
  if (!G.db || G.conn !== 'ok') openSheet('code', { auto: 1 });
}


