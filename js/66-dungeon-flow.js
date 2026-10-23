'use strict';
/* ===== 던전과 갈림길 (기획서 11.3절) =====
   run.room = 지금 층(1~19). run.doors = 이 층의 문 셋, run.cur = 고른 방. run.dg = 챕터 동안의 집계(유형별 횟수, 본 유형, 이벤트, 강적).
   run.buffs = { 성소·이벤트 버프: 남은 방 수 }, run.next = 다음 전투 방에 걸리는 것, run.gold = 모은 골드(정산은 단계 9) */
const floorBands = ch => chData(ch).bands || (old3(ch) ? BANDS3 : null); // A2: 층 띠는 챕터 데이터(2챕터) 또는 BANDS3(3챕터)
const floorBandOf = (ch, f) => { const B = floorBands(ch); return B ? B.find(x => f <= x.to) || B[B.length - 1] : null; };
function floorName(f) { const chN = typeof G !== 'undefined' && G.run ? (G.run.ch || 1) : 1; if (chN === 2 || (chN === 3 && !OLD3)) return f > FLOORS ? '끝' : f === FLOOR_CAMP || f === FLOOR_BOSS ? floorBandOf(chN, f).n : floorBandOf(chN, f).n + ' ' + f + '층'; return floorName0(f); }
function floorName0(f) { const c3 = typeof G !== 'undefined' && G.run && old3(G.run.ch); return f === FLOOR_CAMP ? (c3 ? '오아시스 야영지' : '야영지') : f === FLOOR_BOSS ? (c3 ? '재의 왕좌' : '보스') : f > FLOORS ? '끝' : c3 ? floorBand3(f).n + ' ' + f + '층' : (isLower(f) ? '하층 ' : '상층 ') + f + '층'; } // 3챕터는 해의 흐름 띠 이름
const pickR = a => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function dgInit(run) {
  if (run.dg) return;
  run.dg = { counts: {}, seen: {}, last: null, events: [], strong: { u: 0, l: 0 }, force: null, foes: [] };
  run.room = 1; run.cur = null; run.path = 'main'; run.dgv = 3; run.gold = run.gold || 0; run.lv = run.lv || 1; run.xp = run.xp || 0; run.p.lv = run.lv; run.buffs = {}; run.next = {}; run.doorLog = [];
  run.segDoors = genSeg(run, 0, 'main'); run.doors = segDoorsAt(run, 1); // 0.8.0 6단계: 구간 1(큰 길)도 미리 만든다
}
/* 0.8.0 6단계 A-1 · A-3 · A-4 (docs/제안/0.8.0-6단계-던전개편-설계초안-2026-10-18.md): 구간 하나(SEGS[si])의 층마다 문 셋을 미리 만든다.
   갈림길에서 길 셋마다 부르고, 고른 길의 문을 그대로 쓴다(판에 저장되므로 다시 불러와도 같다). 만드는 동안 바뀐 집계(run.dg)와 길은 되돌린다.
   강적: 1챕터 구간 1은 0, 그 밖의 구간은 강적 문이 있는 층이 하나 이상(만들 수 있으면) · 둘까지. 한 층의 문은 서로 다른 종류라 강적 층에도 다른 문 둘이 있다 */
function genSeg(run, si, path) {
  const [a, b] = SEGS[si]; const d0 = JSON.stringify(run.dg), p0 = run.path; const out = {};
  try {
    run.path = path; for (let f = a; f <= b; f++) out[f] = genDoors(run, f);
    const fl = Object.keys(out).map(Number), sf = () => fl.filter(f => out[f].some(r => r.type === 'strong'));
    const swap = (f, k, t) => { out[f] = out[f].slice(); out[f][k] = mkRoom(run, t, f); };
    if ((run.ch || 1) === 1 && si === 0) { for (const f of sf()) swap(f, out[f].findIndex(r => r.type === 'strong'), 'normal'); }
    else {
      if (!sf().length) { run.dg.strongS = {}; const cand = fl.filter(f => f > 1 && typeOk(run, 'strong', f)); if (cand.length) { const f = cand[Math.floor(Math.random() * cand.length)]; const ds = out[f]; const k = ds.findIndex(r => r.type === 'normal'); swap(f, k >= 0 ? k : ds.length - 1, 'strong'); } }
      while (sf().length > STRONG_PER_SEG) { const f = sf()[sf().length - 1]; swap(f, out[f].findIndex(r => r.type === 'strong'), 'normal'); }
    }
    { let mk = 0; for (const f of fl) { const k = out[f].findIndex(r => r.type === 'market'); if (k >= 0 && mk++) swap(f, k, 'normal'); } } // A2 암시장은 구간에 하나
    if ((run.ch || 1) === 3) for (const ty of ['checkpoint', 'smugstall']) { let mk = 0; for (const f of fl) { const k = out[f].findIndex(r => r.type === ty); if (k >= 0 && mk++) swap(f, k, 'normal'); } } // A3 검문소 · 좌판도 구간에 하나
  } finally { run.dg = JSON.parse(d0); run.path = p0; }
  return out;
}
/* 미리 만든 구간의 문(없으면 그 자리에서 만든다). 구간 안에서 생긴 강제 문(종탑의 줄 · 묻힌 문 등)은 그 층의 일반 문 하나를 바꿔 넣는다 */
function segDoorsAt(run, f) {
  const s = run.segDoors && run.segDoors[f]; if (!s) return genDoors(run, f);
  const d = run.dg; let ds = s.slice(); if (d.force && !ds.some(r => r.type === d.force)) { const k = ds.findIndex(r => r.type === 'normal'); ds[k >= 0 ? k : ds.length - 1] = mkRoom(run, d.force, f); } d.force = null;
  return ds;
}
function typeOk(run, t, f) {
  const T = ROOM_TYPES[t], d = run.dg; if (!T || f < T.from) return false;
  if (t === 'fate') return false; /* 운명의 저울은 genDoors가 따로 끼운다 */
  if ((d.counts[t] || 0) >= ((chData(run.ch).roomMax || {})[t] || T.max)) return false; // 3챕터: 매복 최대 6
  if (t === 'strong' && ((d.strongS || {})[segOf(f)] || 0) >= STRONG_PER_SEG) return false; // 0.8.0 6단계: 구간마다 둘까지(전에는 상 · 하층 셋)
  if (t === 'strong' && f < (chData(run.ch).strongFrom || T.from)) return false; // 2챕터는 4층부터
  if (t === 'strong' && !STRONG_FOES.some(x => inCh(x, run.ch))) return false; // 그 챕터 강적이 아직 없으면
  if (t === 'strong' && old3(run.ch) && !STRONG_FOES.some(x => inCh(x, run.ch) && strong3Ok(run, x, f))) return false; // 3챕터: 그 축을 만나기 전에는 강적 문이 나오지 않는다(5.1절 2번)
  if (t === 'event' && EVENTS.filter(e => inCh(e, run.ch) && e.roll !== 0).every(e => d.events.includes(e.id))) return false;
  if ((t === 'market' || t === 'shrine') && !ch2TypeOk(run, t, f)) return false; // A2 암시장 · 닫힌 성소
  if ((t === 'checkpoint' || t === 'smugstall') && !w3TypeOk(run, t, f)) return false; // A3 검문소 · 밀수꾼의 좌판
  return true;
}
function pickType(run, f, not, only) {
  const d = run.dg; const opts = Object.keys(ROOM_TYPES).filter(t => !not.includes(t) && typeOk(run, t, f) && (!only || only.includes(t)));
  if (!opts.length) return null;
  const PW = pathOf(run.path, run.mode).w; const ws = opts.map(t => ((chData(run.ch).roomW || {})[t] || ROOM_TYPES[t].w) * (t === d.last ? 0.5 : 1) * (t === 'strong' && isLower(f) ? 1.3 : 1) * (PW[t] || 1) * (t === 'strong' && markOn(run, 'strong') ? MARKS.strong.w : 1) * (t === 'strong' ? w3StrongMul(run) : 1)); // A3 경보 단계 2 이상: 강적 문 ×1.4
  let x = Math.random() * ws.reduce((a, v) => a + v, 0); for (let i = 0; i < opts.length; i++) { x -= ws[i]; if (x <= 0) return opts[i]; } return opts[opts.length - 1];
}
const FIGHTS = ['normal', 'ambush', 'strong', 'treasure', 'trial'];
const RESTS = ['spring', 'shrine', 'altar', 'event', 'market', 'checkpoint', 'smugstall'];
function genDoors(run, f) {
  const d = run.dg; const half = isLower(f) ? 'l' : 'u'; let types = [];
  const need = t => typeOk(run, t, f) && !types.includes(t) && types.push(t);
  if (f === 1) types = ['normal', 'normal', typeOk(run, 'treasure', f) && Math.random() < 0.5 ? 'treasure' : 'shrine'];
  else if (f === FLOOR_CAMP + 1) { types = ['normal']; const t2 = pickType(run, f, types, ['ambush', 'strong']); if (t2) types.push(t2); const t3 = pickType(run, f, types, RESTS); if (t3) types.push(t3); }
  else {
    if (d.force) { need(d.force); d.force = null; } // 종탑의 줄 · 뼈 피리 · 해를 앞당긴다(강적), 묻힌 문(보물)
    // 0.8.0 6단계: "반쯤 왔는데 강적을 못 봤으면"은 구간마다 강적 층을 보장하는 genSeg가 맡는다
  }
  while (types.length < 3) { const t = pickType(run, f, types); if (!t) break; types.push(t); }
  while (types.length < 3) types.push('normal');
  if (!types.some(t => FIGHTS.includes(t))) types[2] = 'normal';
  for (const t of types) d.seen[t + half] = true;
  let force = null; if (old3(run.ch)) { force = Object.keys(INTRO_AT3).find(k => (INTRO_AT3[k] === f || INTRO_AT3[k] + 1 === f) && !introOk3(run, k)) || null; if (force && !types.includes('normal')) types[2] = 'normal'; } // 3챕터 처음 만남 문(그 층에서 놓치면 다음 층에 한 번 더)
  else if ((run.ch || 1) >= 2 && typeof INTRO_AT !== 'undefined') { force = Object.keys(INTRO_AT).find(k => INTRO_AT[k] === f && !introOk(run, k)) || null; if (force && !types.includes('normal')) types[2] = 'normal'; } // 처음 만남 보장 문 (2챕터)
  if ((run.ch || 1) >= FATE.from && f > 1 && (d.counts.fate || 0) < FATE.max && !types.includes('fate') && Math.random() < FATE.p) { const rs = types.map((t, i) => RESTS.includes(t) ? i : -1).filter(i => i >= 0); if (rs.length) types[rs[Math.floor(Math.random() * rs.length)]] = 'fate'; } /* 운명의 저울 (2챕터부터): 쉬는 문 하나를 바꾼다 */
  let used = 0; return types.map(t => mkRoom(run, t, f, t === 'normal' && force && !used++ ? { force } : null));
}
/* 0.8.0 6단계 A-5: "누구부터 칠지"가 있는 무리 = 전열과 후열(치유 · 소환 · 사수 · 영창 등 후열 역할)이 함께 있는 무리. 일반 방이 줄어든 만큼 남는 일반 방에 이 판단이 있게 한다 */
const SQ_PRIO = 1.5;
const sqPrio = en => !!(en && en.some(x => (ROLES[x[0]] || {}).row === 'back') && en.some(x => (ROLES[x[0]] || {}).row !== 'back'));
/* 테마 무리 고르기: 지난 방의 무리와 이 층의 다른 문에 나온 무리는 빼고, 압박이 센 무리는 험한 길에서 잦게 */
function pickSquad(run, f, t) {
  const d = run.dg; if (!d.fsq || d.fsqF !== f) { d.fsq = []; d.fsqF = f; }
  const pw = { rough: 1.6, quiet: 0.5 }[run.path] || 1; const pwS = s => (s.pw && s.pw[run.path]) || 1; // A2 길마다 무리 가중
  const ws = SQUADS.map(s => !inCh(s, run.ch) || (s.from && f < s.from) || !(isLower(f) ? s.low : s.up) || ((low => low.filter(x => !introOk(run, x[0])).length >= 2)(isLower(f) ? s.low : s.up)) || d.fsq.includes(s.id) || s.id === d.lastSquad || (s.amb && t !== 'ambush') ? 0 : s.w * pwS(s) * w3SquadW(s, f) * (s.press ? pw : 1) * (sqPrio(isLower(f) ? s.low : s.up) ? SQ_PRIO : 1)); // 0.8.0 6단계 A-5: 누구부터 칠지가 있는 무리 ×SQ_PRIO // 챕터가 다른 무리, 아직 나오지 않을 층, 처음 보는 새 역할이 둘 이상인 조합 무리는 무게 0
  let x = Math.random() * ws.reduce((a, v) => a + v, 0), pick = SQUADS[0]; for (let i = 0; i < SQUADS.length; i++) { x -= ws[i]; if (x <= 0 && ws[i] > 0) { pick = SQUADS[i]; break; } }
  d.fsq.push(pick.id); return pick;
}
function rollMods(n, ch) { const ks = Object.keys(ROOM_MODS).filter(k => k !== 'calm' && (!ROOM_MODS[k].chs || ROOM_MODS[k].chs.includes(ch || 1))); /* 고요(마나 회복)는 마나가 없는 0.6a.2 직업에게 효과가 없어 뽑지 않는다 (10월 5일) */ const out = []; while (out.length < n) { const k = pickR(ks); if (!out.includes(k)) out.push(k); } return out; }
const NEWR = ['skeleton', 'hexer', 'mason', 'burrower', 'bloat']; // 2챕터 새 역할: 처음 만나기 전에는 변주 칸 · 조합에 끼지 않는다
const INTRO_SQ = { skeleton: 'bonepatrol', hexer: 'knot', burrower: 'burrow', mason: 'masonry', bloat: 'diggers' }; // 처음 만남 보장 문의 무리
const introOk = (run, role) => !(old3(run.ch) ? NEWR3 : (run.ch || 1) >= 3 ? [] : NEWR).includes(role) || !!((run.dg && run.dg.intro) || {})[role];
const introOk3 = (run, k) => !!((run.dg && run.dg.intro) || {})[k]; // 3챕터: 처음 만남 문의 역할 · 특성을 이번 챕터에서 만났는가
function mkRoom(run, t, f, opt) {
  opt = opt || {};
  const T = ROOM_TYPES[t], low = isLower(f), P = pathOf(run.path, run.mode); const ch = run.ch || 1; const r = { type: t, floor: f, ch, lv: mlvOf(f, ch), names: ENEMY_NAMES[ch] || ENEMY_NAMES[1], path: run.path || 'main' };
  if (T.fight) {
    if (t === 'strong') { const chA = STRONG_FOES.filter(x => inCh(x, ch)); const chB = chA.filter(x => (low || x.upper !== 0) && (!x.from || f >= x.from) && (!x.needs || x.needs.every(r => introOk(run, r)))); const chF = chB.length ? chB : chA; /* 하층 전용 강적, 호위의 새 역할을 아직 못 만났으면 뽑지 않는다 */ const unused = chF.filter(x => !run.dg.foes.includes(x.id)); const foe = pickR(unused.length ? unused : chF); r.en = JSON.parse(JSON.stringify(foe.en)); r.strong = foe.n; r.foe = foe.id; }
    else if (t === 'treasure') r.en = JSON.parse(JSON.stringify(pickR(ch >= 3 && ENC.treasure3 ? ENC.treasure3 : ch >= 2 && ENC.treasure2 ? ENC.treasure2 : ENC.treasure)));
    else { const sq = opt.force && SQUADS.find(x => x.id === (old3(ch) ? INTRO_SQ3 : INTRO_SQ)[opt.force] && inCh(x, ch)) || pickSquad(run, f, t); r.squad = sq.id; r.en = JSON.parse(JSON.stringify(low ? sq.low : sq.up)); if (ch === 2) ch2Squad(run, r, sq, t, f); /* A2 */ if (ch === 3 && !OLD3) w3Squad(run, r, sq, t, f); /* A3 */ if (opt.force === 'bloat' && sq.vary) { r.en[sq.vary[0]][0] = 'bloat'; r.intro = 'bloat'; } else if (sq.vary && Math.random() < SQUAD_VARY) { const [vi, pool] = sq.vary; const pl = pool.filter(x => introOk(run, x) || x === opt.force); if (r.en[vi] && pl.length) r.en[vi][0] = pickR(pl); } if (opt.force) r.intro = opt.force; } // 테마 무리 + 변주 (10월 4일). 2챕터: 처음 만남 보장 문, 아직 만나지 않은 새 역할은 변주에 끼지 않는다
    if (old3(ch)) { const fm = opt.force && MOD3_NEW.includes(opt.force) ? opt.force : null; r.mods = t === 'trial' ? rollMods3(run, 2, f, fm) : t !== 'strong' && (fm || Math.random() < chData(ch).modChance[low ? 'lower' : 'upper']) ? rollMods3(run, 1, f, fm) : []; } // 3챕터 특성 (띠 · 길 무게, 처음 만남 문)
    else if (t === 'trial') r.mods = rollMods(2, ch);
    else if (t !== 'strong' && Math.random() < MOD_CHANCE[low ? 'lower' : 'upper']) r.mods = rollMods(1, ch);
    else r.mods = [];
    if (ch === 2) ch2RoomMods(run, r, t, f); // A2 어둠은 층 띠마다(장치 「등불」)
    if (ch === 3 && !OLD3) w3RoomMods(run, r, t, f); // A3 방 특성 넷(띠 · 길 무게)
    if (markOn(run, 'trait') && t !== 'strong') { const ex = old3(ch) ? rollMods3(run, 1, f, null) : ch === 3 ? w3Mods(run, 1, f) : rollMods(1, ch); for (const k of ex) if (!r.mods.includes(k)) r.mods.push(k); } // 표식 trait: 방 특성 하나 더
    if (t === 'normal' && f >= NORMAL_ROOM.from) { const NR = Object.assign({}, NORMAL_ROOM, NORMAL_ROOM.ch[ch] || {}); let k = (f >= NR.from2 ? NR.elite2 : NR.elite) - r.en.filter(x => x[1]).length; for (const x of r.en) if (k > 0 && !x[1] && x[0] !== 'minion' && x[0] !== 'bomber') { x[1] = 1; k--; } } // 0.8.0 6단계 B-5: 일반 방 정예(2층부터 하나 · 4층부터 둘)
    if (t === 'ambush') { r.ambush = 1; let k = AMBUSH.elite; for (const x of r.en) if (k > 0 && !x[1] && x[0] !== 'bomber') { x[1] = 1; k--; } } // 매복: 정예 하나 더
    r.tough = r.en.map((x, k) => x[1] && !(r.strong && k === 0) ? k : -1).filter(k => k >= 0 && Math.random() < TOUGH_CHANCE[low ? 'lower' : 'upper'] * (markOn(run, 'elite') ? MARKS.elite.mul : 1)); // 정예에게 강인 (표식 elite: 접사 확률 배율) (강적 본인은 제외)
    if (old3(ch)) { if (!r.ambush) { const sw = [], fi = []; r.tough = r.tough.filter(k => { const o = [['tough', AFFIX_W3.tough]].concat(f >= SWIFT.from ? [['swift', AFFIX_W3.swift]] : []).concat(f >= FIRE_AFFIX.from ? [['fire', AFFIX_W3.fire * (run.path === 'rough' ? 1.5 : 1)]] : []); let x = Math.random() * o.reduce((a, c) => a + c[1], 0); let pk = o[0][0]; for (const c of o) { x -= c[1]; if (x <= 0) { pk = c[0]; break; } } if (pk === 'swift') sw.push(k); if (pk === 'fire') fi.push(k); return pk === 'tough'; }); r.swift = sw; r.fire = fi; } } // 3챕터 접사: 강인 · 신속 · 화염 강화(FIRE_AFFIX.from층부터), 순찰대는 강인만
    else if (ch === 3) w3Affix(r, f); /* A3 3챕터 정예 접사(강인 · 대형 · 잠식된 · 경보수) */
    else if (ch === 2) ch2Affix(r, low); /* A2 2챕터 정예 접사(강인 · 지휘 · 장물 두른 · 기름 먹은). 옛 신속 접사는 3챕터만 */ // 신속 접사: 접사의 절반, 매복은 강인만
    r.gold = Math.round(rint(T.gold[0], T.gold[1]) * P.gold * (chData(ch).gold || 1) * (run.mode === 'hard' ? MODES.hard.gold : 1));
    r.risk = Math.max(1, Math.min(4, T.risk + (low ? 1 : 0) + P.risk));
    r.hide = Math.random() < HIDE_REWARD ? 1 : 0;
    if (ch >= 3 && (run.dg.reveal || []).includes(f)) r.hide = 0; // 사막 나침반 · 왕의 해시계
  }
  if (t === 'shrine') r.shrine = pickR(SHRINES.filter(x => !x.chs || x.chs.includes(ch))).id;
  if (t === 'altar') r.altar = pickR(ALTARS.filter(x => !x.chs || x.chs.includes(ch))).id;
  if (t === 'checkpoint') r.event = 'checkpoint3'; // A3 검문소는 이벤트 화면을 빌린다
  if (t === 'event') { const chE = EVENTS.filter(e => inCh(e, ch) && e.roll !== 0); const left = chE.filter(e => !run.dg.events.includes(e.id)); r.event = (pickR(left) || chE[0]).id; }
  return r;
}
function fixedRoom(f) { const ch = (G.run && G.run.ch) || 1; return f === FLOOR_CAMP ? { type: 'camp', floor: f, ch } : f === FLOOR_BOSS ? { type: 'boss', floor: f, boss: 1, ch, lv: mlvOf(f, ch) } : null; }
function chooseDoor(i) {
  const run = G.run, d = run.dg; const r = run.doors && run.doors[i]; if (!r) return;
  d.counts[r.type] = (d.counts[r.type] || 0) + 1; d.last = r.type; if (r.squad) d.lastSquad = r.squad;
  if (r.type === 'strong') { d.strong[isLower(r.floor) ? 'l' : 'u']++; d.strongS = d.strongS || {}; d.strongS[segOf(r.floor)] = (d.strongS[segOf(r.floor)] || 0) + 1; d.foes.push(r.foe); }
  if (r.type === 'event') d.events.push(r.event);
  run.doorLog.push({ floor: run.room, offered: run.doors.map(x => x.type + (x.mods && x.mods.length ? '+' + x.mods.join('+') : '')), picked: i, t: Date.now() });
  run.cur = r; run.doors = null; saveRunLocal(); saveCur(); render();
}
/* 방을 마치면 다음 층으로. 성소·이벤트 버프는 방 하나를 지날 때마다 줄어든다 */
function advanceFloor() {
  const run = G.run;
  for (const k in run.buffs) { run.buffs[k]--; if (run.buffs[k] <= 0) delete run.buffs[k]; }
  run.room++; run.cur = fixedRoom(run.room); if (run.cur && run.cur.type === 'camp' && isV2(run.p)) ringCampOpen(run); /* M5-0 보정 5: 야영지에서 고리가 열린다 */ if (run.cur && run.cur.type === 'camp' && (run.ch || 1) >= 3 && isV2(run.p)) ksGrant(run, 'c3'); if (run.cur && run.cur.type === 'camp' && (run.ch || 1) === 3 && run.dg) run.dg.alSt = 0; /* A3 경보 단계는 야영지에서 0 */ // 10월 16일 0.8.0 2단계: 세 번째 큰 각인은 3챕터 야영지에 들어설 때
  if (floorBands(run.ch || 1) && run.room <= FLOORS) { const bd = floorBandOf(run.ch || 1, run.room), pv = floorBandOf(run.ch || 1, run.room - 1); if (bd !== pv) toast(bd.n + '. ' + bd.line); } // 2 · 3챕터: 층 띠에 들어설 때 한 줄
  if (!run.cur && PATH_AT.includes(run.room)) { run.cross = crossMake(run); run.doors = null; } // 갈래길: 길을 고른 뒤 문이 나온다. 0.8.0 6단계: 길 셋의 다음 구간을 미리 만든다
  else run.doors = run.cur ? null : segDoorsAt(run, run.room);
  saveRunLocal(); saveCur();
}
function choosePath(id) {
  const run = G.run; if (!run.cross || !PATHS[id]) return;
  if (id === 'quiet' && w3NoQuiet(run)) return; // A3 수비대의 맹세
  if (id === 'quiet' && markOn(run, 'noquiet')) return; // 표식 noquiet
  run.path = id; (run.pathLog = run.pathLog || []).push({ floor: run.room, path: id, t: Date.now() }); run.segDoors = (run.cross.segs && run.cross.segs[id]) || null; run.cross = null;
  run.doors = segDoorsAt(run, run.room); saveRunLocal(); saveCur(); render();
}
const crossMake = run => ({ floor: run.room, segs: Object.fromEntries(Object.keys(PATHS).map(id => [id, genSeg(run, segOf(run.room), id)])) });
/* 0.8.0 6단계 A-3: 갈림길 지도에 보이는 문(핵심 문). 일반 · 순찰대 · 보물 · 시련 · 제단은 보이지 않는다(만든 사람 결정 2) */
const MAP_SHOW = ['strong', 'spring', 'event', 'shrine'];
/* 옛 저장본(19층)을 24층 틀로 옮긴다: 상층 그대로, 야영지 9 → 12, 하층 10~17 → 13~20, 샘 18 → 23, 보스 19 → 24 */
function dgFix(run) {
  if (run && !run.mode) run.mode = 'normal'; /* 가혹 모드: 옛 저장본은 일반 */
  if (run && !run.legSeen) run.legSeen = []; /* 2챕터 장비: 이 런에서 나온 전설 (같은 전설은 한 번만) */
  if (run) consBagFix(run); /* 10월 14일: 소모품 가방 분리(옛 저장본 이전) */
  if (run && !run.awk) run.awk = []; /* 각인: 옛 저장본은 없음 (p.awk는 각인을 얻을 때 맞춘다) */
  if (run && run.p && (run.ch || 1) >= 2) for (let c = 2; c <= run.ch; c++) chGift(run, c, true); /* 챕터 선물: 이미 그 챕터에 들어선 옛 저장본도 받는다 */
  if (!run || !run.dg || run.dgv === 3) return;
  if (run.dgv !== 2) { // 19층 → 24층 (옛 옮기기)
    const m = f => f <= 8 ? f : f === 9 ? 12 : f <= 17 ? f + 3 : f === 18 ? 23 : 24;
    run.room = m(run.room || 1); if (run.cur && run.cur.floor) run.cur.floor = m(run.cur.floor); for (const d of run.doors || []) if (d.floor) d.floor = m(d.floor);
    run.path = run.path || 'main'; run.dgv = 2;
  }
  dgTo16(run);
}
/* 0.8.0 6단계(만든 사람 결정 5): 24층 판을 16층 틀로 비례해 옮긴다. 상층 1–11 → 1–7, 야영지 12 → 8, 하층 13–23 → 9–15, 보스 24 → 16.
   다음 방에 들어설 때의 문 · 갈림길은 새 틀로 다시 만든다(고른 방 · 싸우던 방은 그대로 층 번호만) */
/* 옮긴 판의 레벨 따라잡기 (10월 18일 만든 사람 승인 질문 5: 옮긴 판의 보스 도달 레벨이 앵커 −1 안). 24층 곡선의 레벨을 그대로 들고 16층 보스 앞에 서면 모자란다(3챕터 늦은 자리 Lv14.1).
   옮긴 층에서 기대 레벨 = 앞 챕터 끝 앵커 + (이 챕터 끝 앵커 − 앞 앵커) × 층 / 16(내림). 모자라면 그 레벨까지 경험치를 채운다(포인트도 같이) */
const MIG16_LV = [1, 6, 11, 16];
const floor24to16 = f => f >= 24 ? 16 : f === 12 ? 8 : f <= 11 ? Math.max(1, Math.round(f * 7 / 11)) : 8 + Math.max(1, Math.round((f - 12) * 7 / 11));
function dgTo16(run) {
  const m = floor24to16; const r0 = run.room || 1; run.room = m(r0); if (run.cur && run.cur.floor) run.cur.floor = m(run.cur.floor);
  run.dg = Object.assign({ counts: {}, seen: {}, last: null, events: [], strong: { u: 0, l: 0 }, force: null, foes: [] }, run.dg || {}); run.dg.strongS = {}; run.segDoors = null; (run.mig16 = run.mig16 || []).push({ from: r0, to: run.room, lv: run.lv || 1, ch: run.ch || 1, t: Date.now() });
  if (!run.cur) { if (PATH_AT.includes(run.room)) { run.cross = crossMake(run); run.doors = null; } else { run.cross = null; run.doors = genDoors(run, run.room); } }
  { const A = MIG16_LV, ch = Math.min(3, run.ch || 1); const tgt = Math.min(LV_XP.length, Math.floor(A[ch - 1] + (A[ch] - A[ch - 1]) * run.room / FLOOR_BOSS)); const lv0 = run.lv || 1;
    if (lv0 < tgt) { gainXp(run, LV_XP[tgt - 1] - (run.xp || 0)); run.mig16[run.mig16.length - 1].lvTo = run.lv; toast('16층 던전으로 옮기며 레벨을 ' + lv0 + ' → ' + run.lv + '로 맞췄습니다. 트리 포인트도 함께 받았습니다'); } }
  run.dgv = 3;
}
/* 전리품을 차례로 하나씩 건넨다 (방마다 여러 개일 수 있다) */
function rollGrade(minG) { const x = Math.random() * 100; let g = x < 50 ? 'n' : x < 90 ? 'm' : 'r'; if (minG === 'm' && g === 'n') g = Math.random() < 0.8 ? 'm' : 'r'; if (minG === 'r') g = 'r'; return g; }
/* 2챕터부터의 장비 등급 확률 (장비-경제.md 5.1절). room: 일반 · 매복, big: 강적 · 시련 · 보물, boss: 챕터 보스. 표가 없는 챕터(1챕터)는 예전 그대로 rollGrade · 희귀 */
const DROP_G = { 2: { room: { n: 58, m: 30, r: 10, h: 1.8, l: 0.2 }, big: { r: 88, h: 10, l: 2 }, boss: { r: 60, h: 32, l: 8 } }, 3: { room: { n: 50, m: 32, r: 14, h: 3.4, l: 0.6 }, big: { r: 88, h: 10, l: 2 }, boss: { r: 60, h: 32, l: 8 } } };
const OLD_DROP = 0.1; /* 2챕터부터 드롭의 10%는 이전 챕터 풀에서 (평범 · 고급 · 희귀만) */
function rollGradeCh(ch, src) { if (GEAR8.on) return g8Grade(ch, src); /* 0.8.0 M6-2: 챕터 확률표 + 자리 보정(6-1) */ const T = DROP_G[ch || 1] && DROP_G[ch || 1][src]; if (!T) return src === 'room' ? rollGrade() : 'r'; const hard = G.run && G.run.mode === 'hard'; const W = g => (hard && (g === 'h' || g === 'l') ? MODES.hard.hero : 1) * (T[g] || 0); let x = Math.random() * (hard ? ['n', 'm', 'r', 'h', 'l'].reduce((q, g) => q + W(g), 0) : 100); /* 가혹: 영웅 · 전설 확률 ×1.5 (나머지는 그만큼 줄어든다) */ for (const g of ['n', 'm', 'r', 'h', 'l']) { if (!T[g]) continue; if (x < W(g)) return g; x -= W(g); } return 'r'; }
function dropKey(run, g, not) { if (GEAR8.on) return 'g8|' + g; /* 0.8.0 M6-2: 새 장비는 mkItem이 굴린다 */
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
function bossLoot(run) { if (!DROP_G[run.ch || 1]) return null; const it = GEAR8.on ? g8Gen(run, { where: 'boss', g: g8Grade(run.ch, 'boss') }) : mkItem(dropKey(run, rollGradeCh(run.ch, 'boss'))); if (!isG8(it)) it.g = ITEMS[it.tpl].g || 'n'; /* 0.8.0 M6-2: 보스는 무기 · 갑옷 가중, 희귀 이상(3챕터 영웅) */ if (!addItem(run, it)) { run.gearPending = { item: it, then: 'boss' }; return { tpl: it.tpl, g: it.g, pending: 1 }; } run.drops.push({ room: run.room, item: it.tpl, g: it.g, b: it.b, boss: 1, ch: run.ch || 1 }); return { tpl: it.tpl, g: it.g }; }
function queueDrops(list) { G.dropQ = (G.dropQ || []).concat(list); nextDrop(); }
function nextDrop() {
  const run = G.run; if (run && run.gearPending) { openSheet('bagfull', run.gearPending); return; } if (G.winSumShown) { G.winSum = null; G.winSumShown = false; }
  if (run && (run.consPending || []).length) { saveRunLocal(); saveCur(); openSheet('consfull'); return; }
  if (run && run.patrolPend && (!G.dropQ || !G.dropQ.length) && !G.b) { saveRunLocal(); saveCur(); openSheet('patrol', {}); return; } // 0.8.0 6단계 A-6: 전리품을 다 건넨 뒤 순찰대 보상 고르기
  if (!run || !G.dropQ || !G.dropQ.length) { G.winSum = null; render(); if (run) ksOpen(); return; } // 10월 16일 0.8.0 2단계: 3챕터 야영지에 들어서며 받은 큰 각인
  const it = G.dropQ.shift(); if (it.chest) { openSheet('choice', { offer: it.chest, room: it.room, chest: 1 }); if (G.winSum) G.winSumShown = true; return; } run.drops.push({ room: run.room, item: it.tpl, g: it.g, b: it.b, ch: run.ch || 1 }); giveItem(it); if (G.winSum) G.winSumShown = true;
}
function gainXp(run, n) {
  run.xp = (run.xp || 0) + n; let up = 0;
  while (run.lv < LV_XP.length && run.xp >= LV_XP[run.lv]) { run.lv++; up++; }
  if (up) { if (run.ptree) { run.ptree.pts += PT.pts.lv * up; run.atree.pts += AT_PTS.lv * up; } const p = run.p; /* 10월 16일 0.8.0 2단계: 레벨마다 패시브 +2 · 액티브 +1 */ const before = p.hpMax, mpb = p.mpMax; p.lv = run.lv; applyGear(run); p.hp = Math.min(p.hpMax, p.hp + (p.hpMax - before)); p.mp = Math.min(p.mpMax, p.mp + (p.mpMax - mpb)); (run.lvLog = run.lvLog || []).push({ lv: run.lv, room: run.room, t: Date.now() }); }
  return up;
}
function gainGold(run, n, why) { const m = fxVal(run.p, 'goldMul', 1, (a, v) => a * v); const g = Math.round(n * m); run.gold = (run.gold || 0) + g; sfx('coin'); toast((why ? why + '. ' : '') + '골드 +' + g); return g; }

function roomDef() { const run = G.run; return run.cur || fixedRoom(run.room) || {}; }
// 선택해서 읽는 갈래별 투자 안내. 추천 비율·기존 능력치·전투 수치는 바꾸지 않는다.
const STAT_BRANCH_GUIDE = {
  assassin: [
    '민첩은 베기 기본 피해, 지능은 독 피해와 독 격발을 높입니다. 독 흡수의 회복은 의지에 영향을 받습니다.',
    '독을 터뜨리는 피해는 지능 1점마다 기준 피해의 3%씩 성장합니다. 민첩은 함께 쓰는 베기와 흘리기를, 체력은 생존을 보강합니다.',
    '민첩은 베기와 기본·강공격 피해, 흘리기 피해 감소와 최대 스태미나를 높입니다. 기본·강공격은 힘이 더 높으면 힘을 사용합니다.'
  ],
  warden: [
    '의지는 일반 보호막 생성, 체력은 생명력과 보호막 상한을 높입니다. 비율 채우기는 정해진 목표까지만 채웁니다.',
    '힘은 기본 피해와 붕괴를 높입니다. 체력은 생존을 보강하며, 보호막 비례 추가 피해는 스킬 기본 피해와 별도입니다.',
    '힘은 기본 피해와 붕괴를 높입니다. 체력으로 버틸 힘을 보강하고, 민첩은 흘리기와 최대 스태미나에 투자할 때 씁니다.'
  ],
  hunter: [
    '민첩은 기본·강공격과 스킬 기본 피해, 추적을 소모하는 추가 피해를 높입니다. 추적 소모 피해는 1점마다 기준 추가 피해의 2% 증가하며, 추적 수급량은 그대로입니다.',
    '민첩은 각 타격의 기본 피해를 높입니다. 출혈 피해는 지능, 기본·강공격은 힘과 민첩 중 높은 값으로 성장합니다.',
    '민첩은 스킬 기본 피해·흘리기·최대 스태미나를 높입니다. 빠르기는 행동 순서에 영향을 주며 가속 자원과는 별도입니다.'
  ],
  butcher: [
    '힘은 공격 피해, 의지는 회복량을 높입니다. 회복이 한도에 닿으면 의지를 더 올려도 실제 회복량은 늘지 않습니다.',
    '힘은 기본 피해를 높입니다. 체력은 생존과 받은 피해 자원의 상한을 높이지만, 받은 피해 자체를 줄이지는 않습니다.',
    '힘은 직접 피해, 지능은 출혈 피해를 높입니다. 처치 회복은 전투 한도가 있어 적을 계속 쓰러뜨려도 무한히 늘지 않습니다.'
  ],
  elementalist: [
    '주문 기본 피해·화상·화상 소모 피해는 지능으로 성장합니다. 체력으로 생존을, 의지로 회복을 보강합니다.',
    '주문 기본 피해는 지능으로 성장합니다. 둔화 겹 수는 지능만으로 늘지 않으며, 체력과 의지는 생존·회복을 보강합니다.',
    '주문 기본 피해는 지능 1점마다 4%, 열충격 피해는 3%씩 성장합니다. 원소를 쌓는 양과 소비량은 각 스킬의 규칙을 따릅니다.'
  ],
  spellblade: [
    '베기 기본 피해는 힘, 주문과 출혈 피해는 지능으로 성장합니다. 함께 쓰는 베기·주문의 비중을 보고 나누세요.',
    '베기 기본 피해는 힘, 주문과 화상 피해는 지능으로 성장합니다. 기본·강공격의 피해는 힘으로 성장합니다.',
    '의지는 일반 보호막 생성·회복, 체력은 생명력·보호막 상한을 높입니다. 기본 교대는 고정량이며 베기는 힘, 주문은 지능으로 성장합니다.'
  ],
  monk: [
    '힘은 기본 피해와 기 추가 피해를 높입니다. 민첩은 최대 스태미나·흘리기를 보강하며 기 수급량 자체를 늘리지는 않습니다.',
    '힘은 공격·되받기·기 추가 피해를 높입니다. 체력은 버틸 힘을 보강합니다. 민첩만으로 자세의 감소율이 늘지는 않습니다.',
    '힘은 기본 피해와 기 추가 피해를 높입니다. 민첩은 흘리기·최대 스태미나, 체력은 생존을 보강합니다.'
  ],
  confessor: [
    '직접 공격은 힘으로 성장합니다. 의지는 정화 회복·상태 저항에 영향을 주지만 보호 겹 수 자체를 늘리지는 않습니다.',
    '직접 공격은 힘, 옮긴 중독·출혈·화상 피해는 지능으로 성장합니다. 의지의 상태 저항은 적이 건 상태를 받는 데도 영향을 줍니다.',
    '힘은 기본 피해와 짐·정화·사함의 선택된 추가 피해를 높입니다. 체력으로 생존을 보강하며 고행 피해에는 내 지능 보정을 적용하지 않습니다.'
  ],
  bloodmage: [
    '지능은 주문 기본 피해와 중독 피해를 높입니다. 체력은 생존, 의지는 회복을 보강합니다.',
    '지능은 주문 기본 피해와 중독 피해, 의지는 먹기 회복량을 높입니다. 한 번의 회복 상한에 닿으면 실제 회복량은 더 늘지 않습니다.',
    '지능은 주문 기본 피해를 높입니다. 체력은 생존을 보강하지만 최대 생명력 비율로 내는 비용의 절대량도 커집니다.'
  ]
};
function statBranchGuidance(p) {
  return (TREE2[p.build]?.branches || []).map((branch, i) => ({ branch, text: (STAT_BRANCH_GUIDE[p.build] || [])[i] || '' })).filter(x => x.text);
}
// 표시 전용: 장착 스킬과 장비를 유지한 채 같은 능력치에 3점을 더한 비교.
// 전투 실행·회복·보호막 생성 함수를 호출하지 않는다.
function skillWardFromEmpty(p, s) {
  const wd = s.fx.find(e => e.k === 'ward'), wf = s.fx.find(e => e.k === 'wardFill');
  const bonus = fxList(p).reduce((n, [, f]) => n + (f.wardP ? f.wardP(null, p) || 0 : 0), 0);
  const normal = wd ? Math.min(wardMax(p), wd.n * (1 + .02 * stat(p, 'wil')) * (1 + Math.min(FX_CAP, bonus))) : 0;
  return Math.max(normal, wf ? Math.round(wardMax(p) * (wf.to || 1)) : 0);
}
function statGrowthPreview(p, k, points = 3) {
  const up = Object.assign({}, p, { stat: Object.assign({}, p.stat, { [k]: stat(p, k) + points }) });
  const hp = calcHpMax(p); up.hpMax = calcHpMax(up);
  const out = [], pct = (a, b) => r1((b / a - 1) * 100);
  if (hp !== up.hpMax) out.push('최대 생명력 ' + hp + ' → ' + up.hpMax);
  const st0 = calcStMax(p), st1 = calcStMax(up);
  if (st0 !== st1) out.push('최대 스태미나 ' + st0 + ' → ' + st1);
  const skills = (p.skills || []).map(id => SK2[id]).filter(Boolean), damage = [], resource = [], wards = [], costs = [];
  const usesWard = p.build === 'warden' || p.build === 'spellblade' || skills.some(s => s.fx.some(e => ['ward', 'wardFill', 'wardBurn', 'wardDmg'].includes(e.k)));
  if (usesWard && wardMax(p) !== wardMax(up)) out.push('최대 보호막 ' + wardMax(p) + ' → ' + wardMax(up));
  for (const s of skills) {
    const dm = s.fx.find(e => e.k === 'dmg');
    if (dm) { const a = skillBaseDamage(p, s, dm.n), b = skillBaseDamage(up, s, dm.n); if (a > 0 && b > a) damage.push(pct(a, b)); }
    for (const e of s.fx.filter(e => skillResourceGrows(s, e))) {
      const a = skillResourceDamage(p, s, e, 1), b = skillResourceDamage(up, s, e, 1); if (b > a) resource.push(pct(a, b));
    }
    if (['str', 'con', 'wil'].includes(k) && s.fx.some(e => e.k === 'ward' || e.k === 'wardFill')) {
      const a = skillWardFromEmpty(p, s), b = skillWardFromEmpty(up, s);
      if (b !== a || k === 'wil') wards.push(s.n + ' ' + r1(a) + ' → ' + r1(b) + (a === b ? ' (증가 없음)' : ''));
    }
    if (isBm(p) && ['str', 'con'].includes(k) && s.fx.some(e => e.k === 'hpCost')) costs.push(s.n + ' ' + bmHpCost(p, s) + ' → ' + bmHpCost(up, s));
  }
  const range = values => { const a = Math.min(...values), b = Math.max(...values); return a === b ? a + '%' : a + '–' + b + '%'; };
  if (damage.length) out.push('장착 스킬 기본 피해 +' + range(damage));
  if (resource.length) out.push('장착 스킬 자원 추가 피해 +' + range(resource));
  if (wards.length) out.push('보호막 부여량(빈 상태·추가 전투 보정 전): ' + wards.join(', '));
  if (costs.length) out.push('스킬 생명력 비용: ' + costs.join(', '));
  if (k === 'str' || k === weaponGrowthStat(p)) out.push('기본·강공격 피해 +' + pct(1 + weaponStatBonus(p), 1 + weaponStatBonus(up)) + '%');
  if (k === 'dex') out.push('흘리기 감소 ' + r1(parryRed(p) * 100) + '% → ' + r1(parryRed(up) * 100) + '%');
  if (k === 'int') {
    out.push('중독·출혈·화상 배율 +' + pct(dotMul(p), dotMul(up)) + '%');
    if (p.build === 'elementalist' || skills.some(s => s.fx.some(e => e.k === 'burst')))
      out.push((p.build === 'elementalist' ? '열충격' : '독 격발') + ' 피해 +' + pct(triggerDamageMul(p), triggerDamageMul(up)) + '%');
  }
  if (k === 'wil') out.push('일반 보호막 생성·회복 배율 +' + pct(healMul(p), healMul(up)) + '% (상한에 닿기 전)', '상태 저항 ' + Math.min(25, stat(p, k)) + '% → ' + Math.min(25, stat(up, k)) + '%');
  return out.join(' · ');
}
function statNext(p, k) {
  const s = stat(p, k); const up = Object.assign({}, p, { stat: Object.assign({}, p.stat, { [k]: s + 1 }) });
  const weapon = k === 'str' || k === weaponGrowthStat(p) ? `기본·강공격 피해 보너스 +${r1(weaponStatBonus(p) * 100)}% → +${r1(weaponStatBonus(up) * 100)}%, ` : '';
  const skill = (p.skills || []).map(id => SK2[id]).filter(Boolean).some(a => a.fx.some(e => e.k === 'dmg') && skillGrowthStat(a) === k) ? `장착 스킬 기본 피해 +${s * SKILL_STAT_PCT}% → +${(s + 1) * SKILL_STAT_PCT}%, ` : '';
  const focus = p.build === 'hunter' ? `추적 소모 추가 피해 +${s * FOCUS_STAT_PCT}% → +${(s + 1) * FOCUS_STAT_PCT}%, ` : '';
  if (k === 'str') return `생명력 ${calcHpMax(p)} → ${calcHpMax(up)}, ${weapon}${skill}내가 채우는 붕괴 +${s}% → +${s + 1}%` + ((s + 1) % 10 === 0 ? '. 10점: 강공격 붕괴 +5' : '');
  if (k === 'dex') return `스태미나 ${calcStMax(p)} → ${calcStMax(up)}, ${weapon}${skill}${focus}흘리기 감소 ${Math.round(parryRed(p) * 1000) / 10}% → ${Math.round(parryRed(up) * 1000) / 10}%, 빠르기 +${(s * 0.5).toFixed(1)}% → +${((s + 1) * 0.5).toFixed(1)}%` + ((s + 1) % 10 === 0 ? '. 10점: 흘리기 스태미나 −1' : '');
  if (k === 'con') return `생명력 ${calcHpMax(p)} → ${calcHpMax(up)}`;
  if (k === 'wil') return `일반 보호막 생성과 회복 +${s * 2}% → +${(s + 1) * 2}% (상한까지), 해로운 상태를 버틸 확률 ${Math.min(25, s)}% → ${Math.min(25, s + 1)}%`;
  const trigger = p.build === 'elementalist' || (p.skills || []).some(id => SK2[id]?.fx.some(e => e.k === 'burst'))
    ? `, ${p.build === 'elementalist' ? '열충격' : '독 격발'} 피해 +${s * TRIGGER_STAT_PCT}% → +${(s + 1) * TRIGGER_STAT_PCT}%` : '';
  return weapon + skill + (isV2(p) ? '' : `마나 ${calcMpMax(p)} → ${calcMpMax(up)}, `) + `${p.build === 'elementalist' ? '중독·출혈·화상·화상 소모 피해' : isV2(p) ? '중독·출혈·화상 피해' : '지속 피해와 정화 피해'} +${s * 2}% → +${(s + 1) * 2}%` + trigger + ((s + 1) % 10 === 0 && !isV2(p) ? '. 10점: 독 격발 붕괴 +5' : '');
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
  for (const k of keys) if (FIRST_GIFT3[k] && !run.dg.gift[k]) { run.dg.gift[k] = 1; if (k === 'haze') run.dg.gift.mirage = 1; if (k === 'mirage') run.dg.gift.haze = 1; if (!consGrant(run, FIRST_GIFT3[k], 'n', 1)) toast('처음 겪은 것의 답: ' + CONS[FIRST_GIFT3[k]].ico + ' ' + CONS[FIRST_GIFT3[k]].n); }
}
const ashOk = c => CONS[c.id].use !== 'none' && CONS[c.id].price > 6; // 재의 제단에 태울 수 있는 것 (파는 것 · 돌멩이 제외)
function altarConsCost(run, id) {
  let left = id === 'ash' ? 4 : 3; const out = [];
  for (const c of run.cons || []) {
    if (!(id === 'ash' ? ashOk(c) : CONS[c.id].use !== 'none')) continue;
    const n = Math.min(left, c.n); if(n)out.push(consName(c) + ' ×' + n); left -= n; if(!left)break;
  }
  return left ? [] : out;
}
function altarReceipt(run, id, paid, received) {
  const receipt = { room: run.room, ch: run.ch || 1, name: (ALTARS.find(a=>a.id===id)||{}).n || '제단', paid, received };
  run.lastAltar = receipt; return receipt;
}
function altarReceiptHtml(run) {
  const x=run.lastAltar;if(!x)return '';
  return `<details class="card"${run.room===x.room+1?' open':''}><summary>${esc(x.name)} · ${x.ch}챕터 ${x.room}층 거래 결과</summary><p><b>바친 것</b>: ${x.paid.map(esc).join(', ') || '없음'}</p><p><b>받은 것</b>: ${x.received.map(esc).join(', ') || '없음'}</p></details>`;
}
function burnCons(run, n) { if ((run.cons || []).filter(ashOk).reduce((a, c) => a + c.n, 0) < n) return false; for (let k = 0; k < n; k++) { const c = run.cons.find(ashOk); c.n--; if (c.n <= 0) run.cons.splice(run.cons.indexOf(c), 1); } return true; }
/* 2챕터 이벤트 · 제단 도우미 (10월 5일) */
const EVBUFF = { lit: ['가게 등불', '어둠 방이 나오지 않습니다.'], elixir: ['약장수의 병', '주는 피해 +15%.'], elixirB: ['병의 뒤끝', '받는 피해 +10%.'], fog: ['몽롱한 연기', '주는 피해 −15%.'], names: ['벽의 이름들', '전투를 약화 1로 시작합니다.'], snuff: ['꺼진 촛불', '받는 화상 피해 0, 대신 주는 피해 −5%.'], procession: ['장례 행렬', '받는 직접 피해 −10%, 주는 피해 −10%.'], ashcover: ['재를 덮어 주었다', '받는 직접 피해 −5%.'], herald: ['전령에게 무릎 꿇었다', '받는 화상 피해 0, 대신 주는 피해 −5%.'] }; // 이벤트로 얻는 몇 방 동안의 효과
const altarGold = run => { const A = ALTARS.find(x => x.id === 'gold'); const v = A && A.cost ? A.cost[Math.min(A.cost.length, run.ch || 1) - 1] : 40; return v; };
function n3pre(run, k, n) { run.next3 = run.next3 || {}; run.next3.pre = Object.assign({}, run.next3.pre); run.next3.pre[k] = (run.next3.pre[k] || 0) + n; } // 3챕터 이벤트: 다음 일반 · 매복 전투의 시작 상태
/* 가장 많이 찬 플라스크(10월 24일 만든 사람 요청: 둘 이상이 같으면 플레이어가 고른다). flaskTies: 같은 최대 칸 수의 종류들, flaskTake1: 고른 것(없거나 동률 밖이면 첫째)을 한 칸 비운다 */
const FLASK_K = ['life', 'mana', 'stam'], FLASK_KN = { life: '생명력', mana: '정화', stam: '스태미나' };
function flaskTies(p) { const m = Math.max(...FLASK_K.map(k => p.flask[k] || 0)); return m > 0 ? FLASK_K.filter(k => (p.flask[k] || 0) === m) : []; }
function flaskTake1(p, pick) { const T = flaskTies(p), k = T.includes(pick) ? pick : T[0]; if (k) p.flask[k] = Math.max(0, (p.flask[k] || 0) - 1); return k || null; }
const FLASK_PICK_EV = ['monk:feed', 'attic:feed']; // 가장 많이 찬 플라스크 하나를 비우는 이벤트 선택지
function takeCons(run, n) { const pool = (run.cons || []).filter(c => CONS[c.id].use !== 'none'); if (pool.reduce((a, c) => a + c.n, 0) < n) return false; for (let k = 0; k < n; k++) { const c = run.cons.find(x => CONS[x.id].use !== 'none'); c.n--; if (c.n <= 0) run.cons.splice(run.cons.indexOf(c), 1); } return true; }
function giveChCons(run, ch) { const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) === ch && CONS[k].use !== 'none'); if (!ids.length) return; const id = pickR(ids); consGrant(run, id, 'n', 1); }
function refundDeepest(run) { if (!run.atree) return null; return atRefundLeaf(run); } // 10월 16일 0.8.0 2단계: 잊힌 스승의 묘비는 액티브 노드 하나(끝 노드 가운데 가장 바깥 것)
function enterRoom() {
  const run = G.run; const R = roomDef(); const p = run.p; if (!R.type) return;
  if (run.ksPending > 0 && ksOpen()) return; // 10월 16일 0.8.0 2단계: 받을 큰 각인이 있으면 먼저 고른다
  if (!ROOM_TYPES[R.type] || !ROOM_TYPES[R.type].fight) { if (R.type !== 'boss') return; }
  const nx = run.next || {}; const room = Object.assign({}, R, { buffs: Object.assign({}, run.buffs), pre: nx.pre || null, mode: run.mode || 'normal' });
  if (run.marks && run.marks.length) room.marks = run.marks; // 표식 도전
  const n3 = ['normal', 'ambush'].includes(R.type) ? (run.next3 || {}) : {}; next3Room(room, n3); if (['normal', 'ambush'].includes(R.type)) { run.next3Used = n3; run.next3 = {}; } else run.next3Used = null; // 3챕터 이벤트의 "다음 전투": 다음 일반 · 매복 전투에만
  if (nx.chase && R.type !== 'boss') { room.en = (room.en || []).concat([['bruiser']]); }
  if (nx.coffin && R.type !== 'boss') room.en = (room.en || []).concat([['skeleton', 1]]); // 봉인된 관
  if (nx.block && R.type !== 'boss') room.en = (room.en || []).concat([['bruiser']]); // 장례 행렬을 막아섰다
  if (nx.reader && R.type !== 'boss') room.en = (room.en || []).concat([['darkmage']]); // A1 무너진 서고: 번진 글자를 읽고 말았다
  if ((run.ch || 1) === 2) ch2Enter(run, R, room, nx); // A2 등불 기름 · 이벤트 흔적
  if ((run.ch || 1) === 3 && !OLD3) w3Enter(run, R, room, nx); // A3 경보 당김 · 이벤트 흔적
  run.entry = JSON.parse(JSON.stringify(p));
  run.entryFlasks = Object.assign({}, p.flask); run.entryHp = p.hp / p.hpMax; run.entryFl = p.flask.life + p.flask.mana + (p.flask.stam || 0);
  { const cn = id => (run.cons || []).filter(c => c.id === id).reduce((s, c) => s + (c.n || 0), 0); run.entryHerb = cn("herb"); run.entryBread = cn("bread"); run.entryGold = run.gold || 0; run.entryBag = bagUsed(run); }
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
const releaseRev = () => { const m = typeof document !== "undefined" && document.querySelector("meta[name=nrk-release]"); return m && m.content ? m.content.slice(0, 12) : ""; }; // 판 기록에 어느 배포에서 한 전투인지 남긴다
function afterBattle() {
  const b = G.b, run = G.run, p = run.p;
  codexMerge(b);
  const rec = { damageStats: b.damageStats ? Object.assign({}, b.damageStats) : null, ys: ysSum(b), ch: run.ch || 1, type: (G.run.cur || {}).type || '', squad: (G.run.cur || {}).squad || undefined, foe: (G.run.cur || {}).foe || undefined, mods: (G.run.cur || {}).mods || [], gearDetails: adminGearSnapshot(run), stats: Object.assign({}, run.stats), treeOpen: run.atree ? run.atree.own.slice() : null, pOpen: run.ptree ? run.ptree.own.length + run.ptree.free.length : null, skills: (run.skills || []).slice(), gear: run.eqU ? EQ_SLOTS.map(sl => { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; return it ? it.tpl + ':' + it.g : null; }) : null, room: run.room, res: b.over, acts: b.turnIdx, t: Math.round(b.t * 10) / 10, hpIn: r1(run.entryHp), hpOut: r1(p.hp / p.hpMax), flIn: run.entryFl, flOut: p.flask.life + p.flask.mana + (p.flask.stam || 0), flasksIn: Object.assign({}, run.entryFlasks || (run.entry && run.entry.flask) || {}), flasksOut: Object.assign({}, p.flask), hpMax: p.hpMax, herbIn: run.entryHerb, breadIn: run.entryBread, goldIn: run.entryGold, bagIn: run.entryBag, rev: releaseRev(), item: Object.values(p.eq).filter(Boolean) };
  run.rooms.push(rec);
  for (const x of b.rec) run.acts.push(Object.assign({ ch: run.ch || 1, r: run.room }, x));
  if (b.over === 'lose') { run.deaths.push(run.room); }
}
function battleContinue() {
  const b = G.b, run = G.run, R = roomDef();
  afterBattle();
  if (b.over === 'lose') {
    const acts = b.rec.filter(x => x.k === 'act').slice(-3).map(x => x.a); const hl = (b.hits3 || []).slice(-3);
    run.grave = { kill: hl.length ? hl[hl.length - 1] : null, hits: hl, id: run.id, cname: run.cname || '', lv: run.lv || 1, room: run.room, roomN: floorName(run.room) + (run.cur && ROOM_TYPES[run.cur.type] ? ' ' + ROOM_TYPES[run.cur.type].n + ' 방' : ''), build: run.build, name: G.data.name || '', eq: Object.values(run.p.eq).filter(Boolean), last: acts, stats: Object.assign({}, run.stats), at: Date.now() };
    run.grave.resources = { st: r1(run.p.st), life: run.p.flask.life, cleanse: run.p.flask.mana };
    if (b.heatLog && b.ctx.bossKind === 'queen') run.grave.heat = Object.assign({}, b.heatLog); run.grave.ch = run.ch || 1;
    G.data.graves = [run.grave].concat(G.data.graves || []).slice(0, 20);
    run.result = 'lose'; run.sealed = 1; clearCur(); pushRank(run, 'dead');
    G.scr = 'dead'; saveRunLocal(); clearTimeout(syncT); syncRun(run).then(render); render(); return;
  }
  fenceHeld(b); // 0.8.0 M8: 물러나면 적이 쥔 장물은 다음 상점으로(이겼으면 되찾음)
  endBattleCarry(run.p);
  G.b = null;
  if (b.over === 'flee') { saveRunLocal(); saveCur(); toast('방 밖으로 물러났습니다. 이 방을 이겨야 앞으로 갈 수 있습니다'); render(); return; }
  if (R.boss && b.over === 'win') { grantDrops(run, b); const up = gainXp(run, Math.round(b.xp || 0)); if (up) toast('레벨 ' + run.lv + ' · 패시브 +' + PT.pts.lv * up + ' · 액티브 +' + AT_PTS.lv * up); run.clears = (run.clears || 0) + 1; G.data.hardOpen = 1; run.result = 'win'; /* 0.6a.2: 챕터 돌파 포인트 2는 없앴다(레벨마다 1점, Lv10에 10점) */ run.rooms.push({ room: run.room, type: 'boss', res: 'win' }); if (run.markCh) markWin(run); else run.goalNews = goalsRecord(run); const bl = bossLoot(run); startSettle(run); if (bl) run.settle.loot = bl; G.scr = 'settle'; saveRunLocal(); saveCur(); pushRank(run, 'clear'); nextDrop(); return; } // 정산부터는 이어 하기가 정산 화면으로 돌아온다(보스를 다시 싸우지 않는다)
  if (R.boss) { run.result = 'flee'; run.sealed = 1; clearCur(); G.scr = 'survey'; saveRunLocal(); render(); return; }
  // 승리 보상 (11.3절): 골드, 장비
  const nu = run.nextUsed || {}; run.nextUsed = null;
  if (b.rotted) { run.next = run.next || {}; run.next.pre = Object.assign({}, run.next.pre, { poison: ((run.next.pre || {}).poison || 0) + 3 }); toast('썩은 기운이 몸에 남았습니다. 다음 전투에 중독 3'); }
  const g0 = run.gold || 0, nLL = (run.lootLog || []).length;
  grantDrops(run, b);
  const lootE = (run.lootLog || []).length > nLL ? run.lootLog[run.lootLog.length - 1] : null;
  fxRun(run.p, 'onWin', run);
  const xpGot = Math.round(b.xp || 0); const lvUp = gainXp(run, xpGot);
  const nu3 = run.next3Used || {}; run.next3Used = null; if (old3(run.ch)) firstGift3(run, b, R);
  let gold = (R.gold || 0) * (R.mods && (R.mods.includes('bell') || R.mods.includes('drums')) ? 1.5 : 1) + (nu.chase ? 20 : 0) + (nu.block ? 30 : 0) + (R.type === 'treasure' ? fxVal(run.p, 'treasureGold', 0, (a, v) => a + v) : 0);
  if (gold) gainGold(run, gold, ROOM_TYPES[R.type].n + ' 방을 넘었습니다');
  G.winSum = { gold: Math.round((run.gold || 0) - g0), xp: xpGot, lv: lvUp ? run.lv : 0, got: lootE ? lootE.got : {}, lost: lootE ? lootE.lost : 0 }; // 화면 요약용(규칙에 쓰지 않는다)
  const drops = []; const t = R.type;
  const PU = pathOf(R.path, G.run && G.run.mode).up || 0; const pg = g => PU > 0 && g !== 'r' && g !== 'h' && g !== 'l' && Math.random() < PU ? (g === 'n' ? 'm' : 'r') : PU < 0 && g !== 'n' && g !== 'h' && g !== 'l' && Math.random() < -PU ? (g === 'r' ? 'm' : 'n') : g; /* 영웅 · 전설은 길로 오르내리지 않는다 */ // 길: 장비 등급 한 단계 오르내림 (10월 4일)
  if (t === 'normal' || t === 'ambush') drops.push(mkItem(dropKey(run, pg(rollGradeCh(run.ch, 'room'))), { g: undefined }));
  if (R.wake) drops.length = 0; // A1 성물함에서 깨어난 전투: 방 보상 장비 없음
  if (R.wake) ch2WakeWin(run, R, drops); // A2 투기장 링 보상
  if (t === 'strong' && (run.ch || 1) === 2 && run.dg.strongUp) { drops.push(mkItem(dropKey(run, 'h'))); run.dg.strongUp = 0; } // A2 벽의 이름들: 강적 방 보상 한 단계 위
  if (t === 'strong') drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'big')))); /* 강적은 희귀 이상 보장 (10월 4일, 2챕터부터 영웅 · 전설도) */
  if (t === 'trial') drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'big'))));
  if (nu.coffin) drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'big'))));
  if (nu3.herald) drops.push(mkItem(dropKey(run, 'r'))); // 여왕의 전령에게 칼을 뽑았다
  for (let k = 0; k < (nu.extraDrop || 0); k++) drops.push(mkItem(dropKey(run, pg(rollGradeCh(run.ch, 'room')))));
  for (const it of drops) if (!isG8(it)) it.g = ITEMS[it.tpl].g || 'n';
  advanceFloor();
  const q = []; if (t === 'treasure') { const a = dropKey(run, rollGradeCh(run.ch, 'big')), b2 = dropKey(run, pg(rollGradeCh(run.ch, 'room')), [a]); q.push({ chest: GEAR8.on ? [mkItem(a), mkItem(b2)] : [a, b2], room: run.room - 1 }); } /* 0.8.0 M6-2: 상자의 새 장비는 미리 굴려 보여 준다 */
  q.push(...drops);
  if (lvUp && typeof sfx === 'function') sfx('b_levelup'); if (xpGot) toast('경험치 +' + xpGot + (lvUp ? ' · 레벨 ' + run.lv + ' 달성' : ''));
  if (lvUp) toast('레벨 ' + run.lv + ' · 패시브 포인트 +' + PT.pts.lv * lvUp + ' · 액티브 포인트 +' + AT_PTS.lv * lvUp + '. 트리에서 찍습니다'); // 10월 16일 0.8.0 2단계: 능력치 창 대신 트리 포인트(남겨도 된다)
  if (t === 'ambush') run.patrolPend = { cons: patrolCons(run), room: run.room - 1 }; // 0.8.0 6단계 A-6: 순찰대 보상 고르기(전리품 뒤에 창이 뜬다)
  queueDrops(q);
}
/* 순찰대 보상의 소모품 후보 셋: 그 챕터에 나오는 소모품(챙길 수 있는 것) 가운데 서로 다른 셋 */
function patrolCons(run) { const ch = run.ch || 1; const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) <= ch && !(CONS[k].only && CONS[k].only !== ch) && CONS[k].use !== 'none' && (CONS[k].dw == null || CONS[k].dw > 0)); const out = []; while (out.length < 3 && ids.length) out.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]); return out; }
function patrolPick(k) {
  const run = G.run, P = run && run.patrolPend; if (!P) return; const ch = run.ch || 1; run.patrolPt = run.patrolPt || {};
  if (k === 'pt') { if ((run.patrolPt[ch] || 0) >= AMBUSH.ptMax) return; run.patrolPt[ch] = (run.patrolPt[ch] || 0) + 1; ptBonus(run, 1, '순찰대'); }
  else if ((P.cons || []).includes(k)) { consGrant(run, k, 'n', 1); toast(CONS[k].ico + ' ' + consName({ id: k, g: 'n' }) + '을(를) 챙겼습니다'); }
  else return;
  (run.patrolLog = run.patrolLog || []).push({ ch, room: P.room, pick: k, t: Date.now() }); run.patrolPend = null; G.sheet = null; saveRunLocal(); saveCur(); render();
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
  return Object.assign({ playerState: run.p ? { hp: r1(Math.max(0, run.p.hp)), hpMax: run.p.hpMax, st: r1(run.p.st), stMax: run.p.stMax } : null, grave: run.grave || null, combatStats: run.p ? gearStats(run.p) : null, eqDetails: adminGearSnapshot(run), tv: run.tv || 1, ptree: run.ptree ? JSON.parse(JSON.stringify(run.ptree)) : null, atree: run.atree ? JSON.parse(JSON.stringify(run.atree)) : null, ksLog: run.ksLog || [], mig08: run.mig08 || null, tree: run.tree ? JSON.parse(JSON.stringify(run.tree)) : null, treeLog: run.treeLog || [], treeNodes: (SKILLS2[run.build] || []).map(s => ({ id: s.id, n: s.n, b: s.b, row: s.row || 0, tier: s.tier, start: !!s.start, par: s.par || [], head: skHead(s), body: skBody(s) })), cons: run.cons || [], consPending: run.consPending || [], consGainLog: run.consGainLog || [], consLog: run.consLog || [], lootLog: run.lootLog || [], discards: run.discards || [], inv: run.inv ? Object.values(run.inv).map(x => adminItemSnapshot(x)).filter(Boolean) : null, id: run.id, v: VERSION, mode: run.mode || 'normal', build: run.build, boss: run.boss, startedAt: run.startedAt, endedAt: run.endedAt || null, result: run.result, roomReached: run.room, deaths: run.deaths, rooms: run.rooms, acts: run.acts.slice(-900), swaps: run.swaps, blockPicked: run.blockPicked, drops: run.drops, survey: run.survey, stats: run.stats || null, statLog: run.statLog || [], choices: run.choices || [], skills: run.skills || null, skillLog: run.skillLog || [], cname: run.cname || '', ch: run.ch || 1, clears: run.clears || 0, lv: run.lv || 1, xp: Math.round(run.xp || 0), gold: run.gold || 0, playMs: Math.round(run.playMs || 0), doorLog: run.doorLog || [], settle: run.settle || null, shop: run.shop ? { log: run.shop.log, stock: run.shop.stock.map(x => ({ tpl: x.it.tpl, g: x.it.g, price: x.price, sold: x.sold })), cons: (run.shop.cons || []).map(x => ({ id: x.id, price: x.price })) } : null, shopHist: run.shopHist || [], eq7: run.eqU ? EQ_SLOTS.map(sl => { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; return it ? it.tpl + ':' + it.g : null; }) : null, phase: run.phase || '', surveys: run.surveys || null, awk: run.awk || [], awkLog: run.awkLog || [], gambleN: run.gambleN || 0 }, run.markCh ? { marks: run.marks || [], markCh: run.markCh, markPts: run.markPts || 0, mode: run.mode || 'normal' } : null);
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


