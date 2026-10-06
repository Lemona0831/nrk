/* ===== 던전 자동 테스터 (0.6, 기획서 11.11절)
   next/의 게임 코드 전체(엔진 + 던전·장비·레벨·이벤트 화면 코드)를 Node의 vm에서 그대로 돌린다.
   문 고르기, 장비 끼우기, 이벤트, 레벨 능력치는 성향별 규칙으로, 전투 행동은 qa.js의 성향(heuristic·lookahead)으로 고른다.
   쓰러지면 끝(다시 하기 없음). 1챕터 보스를 넘으면 완주.
   실행: node tools/dgqa.js [성향·직업마다 판 수=20] [결과 파일=tools/dgqa.json] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.env.DGDIR || 'next'; // 돌릴 게임 폴더 (저장본 점검은 지인 사이트 코드 '.'로 저장본을 만든다)
require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, 'extract-engine.js'), DIR]); // 테스터의 판단(qa.js)이 쓰는 엔진 사본을 지금 코드로 새로 만든다
const Q = require('./qa.js');
const { PERSONAS, heuristic, lookahead, sigRule, rng } = Q;

function loadGame() {
  const dir = path.join(__dirname, '..', DIR);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const data = [...html.matchAll(/<script src="(data\/[^"]+\.js)"><\/script>/g)].map(m => fs.readFileSync(path.join(dir, m[1]), 'utf8')).join('\n');
  const i = html.indexOf('<script>'); const j = html.indexOf('</script>', i);
  const ctx = { console, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(data + '\n' + html.slice(i + 8, j) + '\n;this.__G = G;', ctx, { filename: 'next/index.html' });
  // 화면·저장·소리는 끈다
  vm.runInContext('Object.assign(this, { bagUsed: typeof bagUsed !== "undefined" ? bagUsed : null, BAG_MAX: typeof BAG_MAX !== "undefined" ? BAG_MAX : 12, CHAPTERS: typeof CHAPTERS !== "undefined" ? CHAPTERS : null, CONS: typeof CONS !== "undefined" ? CONS : null, LOOT: typeof LOOT !== "undefined" ? LOOT : null, STAT_KEYS: typeof STAT_KEYS !== "undefined" ? STAT_KEYS : null, STAT_REC: typeof STAT_REC !== "undefined" ? STAT_REC : null, STAT_START: typeof STAT_START !== "undefined" ? STAT_START : null, LV_POINTS: typeof LV_POINTS !== "undefined" ? LV_POINTS : 2, isLower, chOf: typeof chOf !== "undefined" ? chOf : null, ITEMS, EVENTS, ROOM_TYPES, BUILDS, tplKind, SKILLS2: typeof SKILLS2 !== "undefined" ? SKILLS2 : null, TREE2: typeof TREE2 !== "undefined" ? TREE2 : null, SK2: typeof SK2 !== "undefined" ? SK2 : null, EQUIP_SLOTS2: typeof EQUIP_SLOTS2 !== "undefined" ? EQUIP_SLOTS2 : 4 });', ctx); // const 값은 밖에서 읽을 수 있게 꺼내 둔다
  vm.runInContext(`toast = () => {}; scheduleSync = () => {}; syncRun = async () => false; pushRank = async () => {}; saveLocal = () => true; sfx = () => {};`, ctx);
  vm.runInContext('var window = { scrollTo() { }, innerWidth: 1280, innerHeight: 800, scrollY: 0, addEventListener() { } };', ctx); // 정산·상점 버튼이 부르는 창 함수만 둔다
  return ctx;
}
const G0 = loadGame();
const run_ = code => vm.runInContext(code, G0);
if (process.env.CFG) run_(process.env.CFG); // 시험할 수치: CFG='DIFF[1].upper.dmg=1.3; BOSSES.abbot.mult=7'

const PREF = { assassin: 'int', scar: 'str', priest: 'int', berserker: 'str', hunter: 'dex', arcanist: 'int', templar: 'str', warlock: 'int' };
const FIGHT = ['normal', 'ambush', 'strong', 'treasure', 'trial'];
const THINK = k => k === 'expert' || k === 'explorer'; // 한 수 앞을 계산하는 성향(전투 판단 방식)
const MEASURE = 'careful'; // 목표의 "사고하는 유저" = 신중 (10월 2일 만든 사람 결정: 예고를 읽고 막고, 자원과 길을 관리하는 성향)

/* 장비 점수: 바뀌는 수치의 합(11.11절 "비교 점수") */
function gearScore(st) { return st.hp * 0.6 + st.mp * 0.25 + st.st * 0.25 + st.basic * 3 + st.heavy * 1.5 + st.flask * 120; }

/* 문 고르기 (성향별) */
function pickDoor(pk, run, r) {
  const P = PERSONAS[pk]; const p = run.p; const h = p.hp / p.hpMax; const fl = p.flask.life;
  const low = G0.isLower(run.room, run.ch);
  const loss = { normal: 0.22, ambush: 0.3, treasure: 0.3, trial: 0.45, strong: low ? 0.75 : 0.5 };
  const gain = { normal: 3, ambush: 3.3, treasure: 5, trial: 5, strong: 6, spring: 0, shrine: 1.5, altar: 1, event: 1.5 };
  const sc = run.doors.map(d => {
    const t = d.type; let v;
    if (pk === 'novice') return r();
    if (FIGHT.includes(t)) {
      const L = loss[t] * (d.mods && d.mods.length ? 1.15 : 1) * (1 - fl * 0.08);
      const left = h - L;
      if (THINK(pk) || pk === 'careful') v = left < 0.2 ? -10 + left : gain[t] - L * (4 + 6 * (1 - P.risk)) * (h < 0.5 ? 2 : 1);
      else if (pk === 'reckless') v = gain[t] * 1.4 - L * 3;
      else v = gain[t] - L * 6 * (h < 0.4 ? 2.5 : 1);
    } else {
      v = t === 'spring' ? (1 - h) * 12 + (3 - fl) : gain[t] + (t === 'altar' && d.altar === 'gold' && (run.gold || 0) < 40 ? -3 : 0);
      if (pk === 'explorer' && (t === 'event' || t === 'altar')) v += 1.5;
      if (pk === 'reckless') v -= 1.5;
    }
    return v + r() * (THINK(pk) ? 0.8 : 2);
  });
  return sc.indexOf(Math.max(...sc));
}

/* 갈래길 고르기 (0.6a.2, 10월 4일): 험한 길 · 큰 길 · 샛길. 생명력과 플라스크를 보고 성향대로 */
function pickPath(pk, run, r) {
  const p = run.p; const h = p.hp / p.hpMax; const fl = p.flask.life;
  if (pk === 'novice') return ['rough', 'main', 'quiet'][Math.floor(r() * 3)];
  if (!THINK(pk) && r() < 0.15) return ['rough', 'main', 'quiet'][Math.floor(r() * 3)];
  if (pk === 'reckless') return h < 0.3 ? 'main' : 'rough';
  if (pk === 'careful') return h < 0.6 || fl < 1 ? 'quiet' : 'main';
  if (pk === 'casual') return h < 0.4 ? 'quiet' : 'main';
  if (pk === 'explorer') return h < 0.4 ? 'quiet' : 'rough';
  return h < 0.45 || fl < 1 ? 'quiet' : h > 0.8 && fl >= 2 ? 'rough' : 'main'; // 숙련
}

/* 창(시트) 처리: 전리품, 상자, 가방, 능력치, 제단 */
function click(a, k, extra) { const ds = Object.assign({ a }, k != null ? { k: String(k) } : {}, extra || {}); const el = { dataset: ds, checked: false, closest: () => null }; G0.onClick({ target: { closest: () => el } }); }
function handleSheets(pk, r) {
  const G = G0.__G; const P = PERSONAS[pk];
  for (let n = 0; n < 40 && G.sheet; n++) {
    const S = G.sheet, run = G.run;
    if (S.kind === 'drop') {
      const it = run.inv[S.data.uid]; const kind = G0.tplKind(it.tpl); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind;
      const d = gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p));
      const act = !!G0.ITEMS[it.tpl].act; const fit = G0.classFit(run.p, it.tpl);
      let eq;
      if (THINK(pk)) eq = d > 0.5 || (act && fit && d > -6) || (act && r() < P.curious * 0.4 && d > -3);
      else if (pk === 'novice') eq = r() < 0.5;
      else eq = d > 2 || (act && r() < P.curious * 0.5);
      if (eq) click('dropequip', it.uid, { s: sl }); else click('dropkeep');
    } else if (S.kind === 'choice') {
      const o = S.data.offer; const k = THINK(pk) ? (o.find(x => G0.classFit(run.p, x)) || o[0]) : o[Math.floor(r() * o.length)];
      click('choose', k);
    } else if (S.kind === 'bagfull') { click(run.bag.length ? 'bfdrop' : 'bfskip', run.bag[0]); }
    else if (S.kind === 'stats') {
      const pref = PREF[run.build];
      const KEYS = G0.STAT_KEYS || ['str', 'dex', 'int']; S.data.alloc = S.data.alloc || Object.fromEntries(KEYS.map(k => [k, 0]));
      if (G0.statRecommend && G0.STAT_REC && G0.STAT_REC[run.build] && pk !== 'novice') { const add = G0.statRecommend(run.build, Object.fromEntries(KEYS.map(k => [k, (run.stats[k] || 0)])), S.data.pts); for (const k of KEYS) S.data.alloc[k] += add[k] || 0; }
      else for (let i = 0; i < S.data.pts; i++) { const k = pk === 'novice' || r() > 0.65 ? KEYS[Math.floor(r() * KEYS.length)] : pref; S.data.alloc[k]++; }
      click('statok');
    } else if (S.kind === 'offer') { click('offerpick', run.bag[0]); }
    else if (S.kind === 'swap') { click('swapskip'); } // 스킬 바꾸기: 단계 3에서 성향별로
    else { G.sheet = null; }
    while (!G.sheet && G.dropQ && G.dropQ.length) G0.nextDrop();
  }
}

/* 이벤트·제단·성소 고르기 */
function restRoom(pk, run, r) {
  const R = run.cur; const p = run.p; const h = p.hp / p.hpMax;
  if (R.type === 'camp' || R.type === 'spring') return click('rest');
  if (R.type === 'shrine') return click('shrine', pk === 'novice' ? (r() < 0.5 ? 1 : 0) : 1);
  if (R.type === 'altar') {
    const can = R.altar === 'gold' ? (run.gold || 0) >= 40 : R.altar === 'offer' ? run.bag.length > 0 : true;
    const want = R.altar === 'blood' ? (THINK(pk) ? h > 0.6 : r() < 0.5) : can;
    return click('altar', can && want ? 1 : 0);
  }
  if (R.type === 'event') {
    const E0 = G0.EVENTS.find(x => x.id === R.event);
    const ok = E0.opts.filter(o => !((E0.id === 'reliquary' && o.id === 'force' && p.st < 40) || (E0.id === 'monk' && o.id === 'feed' && !(p.flask.life + p.flask.mana + (p.flask.stam || 0)))));
    let o = ok[Math.floor(r() * ok.length)];
    if (THINK(pk) || pk === 'careful') { // 위험한 선택은 생명력이 넉넉할 때만
      const safe = ok.filter(x => !(x.id === 'drink' && h < 0.5) && !(x.id === 'chase' && h < 0.6) && !(x.id === 'do' && h < 0.6) && !(x.id === 'loot' && h < 0.5));
      if (safe.length) o = pk === 'careful' ? safe[safe.length - 1] : safe[Math.floor(r() * safe.length)];
    }
    return click('event', o.id);
  }
}

const OPT = { snap: false, onStep: null, onTurn: null, chapters: 1 }; // chapters: 몇 챕터까지 이어 갈지 (2면 1챕터를 깬 뒤 정산·상점·설문을 지나 2챕터로) // onStep(G): 방과 방 사이마다, onTurn(G, n): 전투 행동마다 (저장본 점검)
/* 소모품 (0.6a.2, 10월 4일): 사람처럼 상황에 맞는 것을 쓴다(초보는 거의 쓰지 않는다). 한 차례 최대 수는 엔진이 막는다 */
function useCons(pk, r, b, run) {
  if (!G0.consUse || !G0.CONS || !run.cons || !run.cons.length) return;
  const aware = THINK(pk) ? 0.9 : pk === 'novice' ? 0.15 : 0.5; const p = run.p; const al = G0.alive(b).filter(e => e.role !== 'root'); const sk = (u, k) => (u.s[k] ? u.s[k].stacks : 0);
  const it = (e, ...k) => e.intent && (k.includes(e.intent.k) || (k.includes('aimed') && e.intent.aimed));
  const want = c => { const D = G0.CONS[c.id]; switch (D.k) {
    case 'heal': return p.hp < p.hpMax * 0.35 && (!p.flask.life || r() < 0.5);
    case 'stam': return p.st < 30;
    case 'cure': return sk(p, D.s) >= ({ bleed: 4, poison: 6, ignite: 3, weak: 2, vuln: 2, chill: 1 }[D.s] || 3) || (D.s === 'poison' && sk(p, 'poison') >= 3 && al.some(e => e.foe === 'well' && it(e, 'charge', 'heavy'))); // 2챕터: 우물이 열리기 전에는 중독 3부터 지운다
    case 'interrupt': return al.some(e => e.role !== 'boss' && it(e, 'heavy', 'aimed')) && !p.dodge;
    case 'blind': return al.some(e => e.row === 'back' && it(e, 'aimed'));
    case 'unevade': { const f = al.filter(e => e.row === 'front'); return f.length > 0 && f.every(e => e.evading); }
    case 'decoy': return al.some(e => e.countering);
    case 'unguard': return al.some(e => e.guarding);
    case 'unbless': return al.some(e => e.s.empower && it(e, 'attack', 'heavy'));
    case 'noheal': return al.some(e => e.role === 'healer' && it(e, 'heal'));
    case 'nosummon': return al.some(e => e.role === 'summoner' && it(e, 'summon'));
    case 'antisteal': return al.some(e => e.role === 'thief' && it(e, 'steal'));
    case 'sticky': return al.some(e => e.role === 'thief' && it(e, 'flee'));
    case 'aoe': return al.length >= 3 && r() < 0.4;
    case 'dart': return al.some(e => e.row === 'back' && ['healer', 'summoner'].includes(e.role)) && G0.frontBlocked(b) && r() < 0.5;
    case 'brk': return al.some(e => (e.elite || e.strong || e.role === 'boss') && it(e, 'charge', 'heavy'));
    case 'whet': return r() < 0.15;
    case 'mark': return r() < 0.1;
    case 'guard1': return al.some(e => it(e, 'heavy', 'explode', 'burn')) && p.hp < p.hpMax * 0.6;
    case 'halfboom': return al.some(e => it(e, 'explode', 'burn'));
    case 'block': return al.some(e => e.intent && (e.intent.bleed || it(e, 'curse', 'explode', 'burn')));
    case 'unmod': return true;
    case 'escape': return p.hp < p.hpMax * 0.15 && !p.flask.life;
    case 'lootx': return al.length >= 3 && r() < 0.5;
    case 'norise': return al.some(e => e.pile && !e.norise) && (al.some(e => e.foe === 'collector') || al.some(e => e.pile && e.pile.wait <= 1));
    case 'burnpiles': return al.filter(e => e.pile).length >= 2;
    case 'trim': return ['poison', 'bleed', 'ignite', 'weak', 'vuln'].filter(k => sk(p, k) > 0).length >= 2 && al.some(e => e.role === 'hexer' || e.foe === 'knight');
    case 'unearth': return al.some(e => e.under);
    case 'wallbreak': return al.some(e => e.role === 'bonewall') && al.some(e => e.row === 'back' && e.role !== 'bonewall');
    case 'slow': return al.some(e => e.swift || ((e.strong || e.role === 'boss') && it(e, 'charge'))) && r() < 0.5;
    case 'nobloat': return al.some(e => e.role === 'bloat');
    default: return false; } };
  for (let k = 0; k < 3; k++) { const i = run.cons.findIndex(c => G0.CONS[c.id].use !== 'none' && !G0.consWhyNot(b, run, c, null) && r() < aware && want(c)); if (i < 0) break; G0.consUse(b, run, i, null); if (b.over) break; }
}
function useConsOut(pk, run, r) {
  if (!G0.consUse || !G0.CONS || !run.cons) return; const p = run.p;
  for (let k = 0; k < 6 && p.hp < p.hpMax * 0.6 && (pk !== 'novice' || r() < 0.3); k++) { const i = run.cons.findIndex(c => G0.CONS[c.id].k === 'heal' && !G0.consWhyNot(null, run, c, null)); if (i < 0) break; G0.consUse(null, run, i, null); }
}
const countBy = a => a.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
/* 전투 한 번의 기록 (10월 5일, 목표 7단계 지표: 사망 원인 · 예고 뒤 대응 · 받은 피해 출처 · 행동 종류 · 스킬 사용) */
function fightRec(R, b, run, hpIn, acts) {
  const hits = b.rec.filter(x => x.k === 'hit'); const src = {};
  for (const h of hits) { const k = (h.dot ? 'dot:' : '') + (h.src || 'none') + (h.charged ? ':big' : ''); src[k] = Math.round(((src[k] || 0) + h.d) * 10) / 10; }
  const used = countBy(b.rec.filter(x => x.k === 'act').map(x => x.a));
  const rec = { f: run.room, ch: run.ch || 1, t: R.type, sq: R.squad, foe: R.foe, mods: (R.mods || []).join('+') || undefined, path: R.path, res: b.over, hpIn: Math.round(hpIn * 100), hpOut: Math.round(run.p.hp / run.p.hpMax * 100), rounds: b.round || 0, acts, src, used, brk: b.rec.filter(x => x.k === 'break').length, cut: b.rec.filter(x => x.k === 'break' && x.cut).length, blk: b.rec.filter(x => x.k === 'block').length, parried: hits.filter(h => h.parried).length, guarded: hits.filter(h => h.guard).length, cons: b.rec.filter(x => x.k === 'cons').length, big: b.rec.filter(x => x.k === 'bigfire').length, bigNoTurn: b.rec.filter(x => x.k === 'bigfire' && x.gap < 1).map(x => x.role + ':' + x.i + ':' + x.gap) };
  if (b.over === 'lose') { const last = hits[hits.length - 1] || {}; const big = hits.slice(-3).filter(h => h.charged); rec.death = { by: (last.dot ? 'dot:' : '') + (last.src || 'none'), big: !!last.charged, bigIn3: big.length, lastD: last.d, st: Math.round(b.p.st), fl: Object.assign({}, b.p.flask), consLeft: (run.cons || []).reduce((a, c) => a + c.n, 0) }; }
  return rec;
}
/* 2챕터 판단 (10월 7일, 비공개 문서의 대처 가운데 사람이 화면을 보고 할 만한 것만). 2챕터에만 있는 것이 판에 있을 때만 난수를 써서 1챕터 측정은 그대로다 */
function ch2Pre(b, P, r) {
  const al = G0.alive(b); const col = al.find(e => e.foe === 'collector'); const piles = al.filter(e => e.pile);
  for (const e of piles) e.pileCol = col ? 1 : 0; // 수집가가 있으면 더미를 먼저 흩는다(qa.js enemyPrio)
  if (col && piles.length && col.intent && col.intent.k === 'pick' && r() < (P.mech || 0.5) + 0.2) { // 줍기 예고: 더미를 흩는다(광역이면 한 번에)
    const L = G0.actionList(b).filter(x => x.ok && !x.self && x.id !== 'flee'); const aoe = piles.length >= 2 && L.find(x => x.aoe && x.v2);
    if (aoe) return [aoe.id, null];
    const one = L.filter(x => ['basic'].includes(x.id) || (x.v2 && x.time <= 0.6)).find(x => G0.canTarget(b, piles[0], x)); if (one) return [one.id, piles[0].id];
  }
  const wall = al.find(e => e.lordWall); // 군주의 뼈벽: 붕괴가 큰 행동으로 부순다(벽은 붕괴 게이지가 차면 곧바로 부서진다)
  if (wall && r() < (P.mech || 0.5) + 0.2) {
    const L = G0.actionList(b).filter(x => x.ok && !x.self && x.id !== 'flee' && G0.canTarget(b, wall, x));
    const brkOf = x => x.id === 'heavy' ? 35 : x.v2 ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
    const c = L.filter(x => brkOf(x) >= 25).sort((x, y) => brkOf(y) - brkOf(x))[0]; if (c) return [c.id, c.aoe ? null : wall.id];
  }
  return null;
}
const ACT_G = (b, a) => { if (a === 'basic' || a === 'heavy') return 'wpn'; if (a === 'guard' || a === 'dodge') return 'prep'; const x = G0.actionList(b).find(y => y.id === a); return x && x.v2 ? (x.s.tgt === 'self' && !x.s.fx.some(f => f.k === 'dmg') ? 'prep' : 'skill') : null; };
function ch2Post(b, P, r, a, t) {
  if (!b.carve || !b.carve.g) return [a, t]; const g = ACT_G(b, a); if (!g || !(b.carve.g[g] < 1) || r() >= (P.mech || 0.5) + 0.2) return [a, t]; // 군주가 이름을 새긴 행동은 힘이 빠지므로 다른 종류를 쓴다
  const L = G0.actionList(b).filter(x => x.ok && x.id !== 'flee' && !['flaskL', 'flaskM', 'flaskS', 'sig'].includes(x.id) && !(b.carve.g[ACT_G(b, x.id)] < 1));
  const atk = L.filter(x => !x.self && (x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s.fx.some(f => f.k === 'dmg'))));
  const pick = (atk.length ? atk : L)[0]; if (!pick) return [a, t];
  if (pick.self || pick.aoe) return [pick.id, null];
  const tg = G0.alive(b).filter(e => !e.pile && e.role !== 'bonewall' && G0.canTarget(b, e, pick)).sort((x, y) => ((y.role === 'boss') - (x.role === 'boss')) || (x.hp - y.hp))[0] || G0.alive(b).find(e => G0.canTarget(b, e, pick));
  return tg ? [pick.id, tg.id] : [a, t];
}
/* 지금 방에 들어가 성향대로 싸운다 */
function fightCur(pk, r, mem, out) {
  const P = PERSONAS[pk]; const G = G0.__G;
  G0.enterRoom(); const b = G.b; b.stepMode = false; let n = 0; let stall = 0, lastHp = Infinity;
  // 10월 5일: 전투 난수를 테스터 판단 난수와 나눈다(판단 규칙 하나를 바꿔도 전투 운은 그대로 남아 비교가 깨끗하다). LEGACY_RNG=1이면 예전처럼 같은 난수
  b.rngF = process.env.LEGACY_RNG ? r : rng(((out.seed || 1) * 7919 + (G.run.room || 0) * 131 + (G.run.ch || 1) * 100003 + (out.acts || 0)) | 0);
  while (!b.over && n++ < 300) {
    useCons(pk, r, b, G.run); if (b.over) break;
    const sr = r() < (P.mech || 0.5) ? sigRule(b, r) : null;
    let [a, t] = ch2Pre(b, P, r) || sr || (P.look ? lookahead(b, P, r) : heuristic(b, P, r, mem));
    [a, t] = ch2Post(b, P, r, a, t);
    // 보스를 깎지 못한 채 버티기만 하면 사람은 밀어붙인다 (한 수 앞만 보는 계산이 페이즈 전환을 피하는 것을 막는다)
    const bs = b.en.find(e => e.role === 'boss' && e.alive);
    if (bs) { if (bs.hp < lastHp - 0.5) stall = 0; else stall++; lastHp = bs.hp;
      if (stall >= 3 && b.p.hp > b.p.hpMax * 0.5 && ['guard', 'dodge', 'sig'].includes(a)) { const L = G0.actionList(b).filter(x => x.ok && !['guard', 'dodge', 'flee', 'flaskL', 'flaskM', 'flaskS', 'sig'].includes(x.id)); if (L.length) { a = L[Math.floor(r() * L.length)].id; t = null; } } }
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && x.id !== 'flee'); a = L[0].id; t = null; }
    if (P.look && r() < P.err) { const L = G0.actionList(b).filter(x => x.ok && x.id !== 'flee'); a = L[Math.floor(r() * L.length)].id; t = null; }
    else if (r() < (THINK(pk) ? 0.9 : P.healerFirst)) { // 보스전 기믹에 사람이 하는 대응 (비공개 문서)
      const act = G0.actionList(b).find(x => x.id === a); const monk = G0.alive(b).filter(e => e.monk && act && G0.canTarget(b, e, act)).sort((x, y) => (y.role === 'healer') - (x.role === 'healer'))[0];
      if (monk && act && act.tgt !== false) t = monk.id;
    }
    if (OPT.onTurn) OPT.onTurn(G, n);
    try { G0.playerAct(b, a, t); } catch (e) { out.bugs.push('예외 ' + e.message + ' @' + a); b.over = 'lose'; }
    out.acts++;
  }
  if (!b.over) { out.bugs.push('300행동 안에 끝나지 않음 ' + G.run.room); b.over = 'lose'; }
  return b;
}
/* 보스 앞 저장본으로 보스전만 다시 한다 */
function replayBoss(pk, snap, seed) {
  const G = G0.__G; G0.__rnd = rng(seed * 17 + 3); run_('Math.random = __rnd');
  G.run = JSON.parse(snap); G.scr = 'run'; G.b = null; G.sheet = null; G.dropQ = [];
  const out = { bugs: [], acts: 0 }; const b = fightCur(pk, rng(seed), {}, out);
  const bs = b.en.find(e => e.role === 'boss');
  return { win: b.over === 'win', hp: bs ? Math.max(0, bs.hp) / bs.hpMax : 0, enr: !!b.enrage, turns: b.turnIdx, left: b.p.hp / b.p.hpMax };
}
function playChar(pk, build, seed) {
  const P = PERSONAS[pk]; const r = rng(seed);
  G0.__rnd = rng(seed * 31 + 7); run_('Math.random = __rnd');
  const G = G0.__G;
  G.data = G0.blankData(); G.data.seenFoe = { abbot: 1, bellringer: 1, pilgrim: 1 }; G.data.seenBoss = { abbot: 1 }; G.data.seenCoach = true;
  G.cre = { name: 'qa' }; G.dropQ = []; G.b = null; G.sheet = null;
  G0.startRun(build);
  const run = G.run; G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run';
  // 스킬과 능력치 (qa.js와 같은 규칙)
  const SKM = G0.skillMap(build); const ids = Object.keys(SKM); let skills;
  if (G0.BUILDS[build].v2) skills = run.skills.slice(); // 0.6a.2: 트리의 시작 스킬로 시작하고 포인트로 연다(spendTree)
  else if (THINK(pk) || pk === 'novice') skills = ids.slice().sort(() => r() - 0.5).slice(0, 3);
  else { const ex = ids.filter(id => SKM[id].excl).sort(() => r() - 0.5); const home = ids.filter(id => SKM[id].home === build); const other = ids.filter(id => !SKM[id].excl && SKM[id].home !== build).sort(() => r() - 0.5); skills = ex.slice(0, 1 + Math.floor(r() * 2)).concat(home).concat(other).slice(0, 3); }
  run.skills = skills.slice(); run.p.skills = G0.BUILDS[build].v2 ? G0.v2Equip(run) : skills.slice(); // 0.6a.2: 시작 스킬은 늘 끼운다
  const pref = PREF[build]; const KEYS = G0.STAT_KEYS || ['str', 'dex', 'int']; const st = Object.fromEntries(KEYS.map(k => [k, 0]));
  if (G0.statRecommend && G0.STAT_REC && G0.STAT_REC[build]) { // 0.6a.2 능력치 다섯: 추천 배분을 쓰되 초보 · 일부는 아무렇게나
    const n0 = G0.STAT_START || 6; const rec = G0.statRecommend(build, st, n0); for (const k of KEYS) st[k] = rec[k] || 0; for (let i = 0; i < n0; i++) if (pk === 'novice' || r() > 0.75) { const from = KEYS.filter(k => st[k] > 0)[Math.floor(r() * KEYS.filter(k => st[k] > 0).length)]; st[from]--; st[KEYS[Math.floor(r() * KEYS.length)]]++; }
  } else for (let i = 0; i < 6; i++) st[pk === 'novice' || r() > 0.6 ? ['str', 'dex', 'int'][Math.floor(r() * 3)] : pref]++;
  run.stats = st; G0.applyStats(run.p, st); run.p.hp = run.p.hpMax; run.p.mp = run.p.mpMax; run.p.st = run.p.stMax;
  const out = { pk, build, seed, res: 'lose', floor: 0, lv: 1, rooms: [], bossHp: null, bugs: [], acts: 0, fights: [] };
  return playLoop(pk, r, out);
}
/* 챕터 사이: 정산 확정 → 상점(성향대로 산다) → 설문 → 다음 챕터 */
function betweenChapters(pk, r) {
  const G = G0.__G, run = G.run;
  click('settleok'); handleSheets(pk, r);
  shopPhase(pk, r);
  click('shopleave'); G0.finishSurvey({ fun: 4 }); click('nextch');
}
/* 상점: 끼우면 나아지는 장비를 골드 안에서 산다. 신중·숙련·탐험가는 가장 나은 것부터, 나머지는 무작위로 */
function shopPhase(pk, r) {
  const G = G0.__G, run = G.run, S = run.shop; if (!S) return;
  const delta = it => { const kind = G0.tplKind(it.tpl); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind; const had = !!run.inv[it.uid]; run.inv[it.uid] = it; const d = gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p)); if (!had) delete run.inv[it.uid]; return { d: d + (G0.classFit(run.p, it.tpl) && G0.ITEMS[it.tpl].act ? 2 : 0), sl }; };
  for (let n = 0; n < 6; n++) {
    const opts = S.stock.map((x, i) => Object.assign({ i }, x)).filter(o => !o.sold && o.price <= (run.gold || 0) && (G0.bagUsed ? G0.bagUsed(run) : run.bag.length) < (G0.BAG_MAX || 12)).map(o => Object.assign(o, delta(o.it))).filter(o => o.d > 0.5);
    if (!opts.length) break;
    const o = THINK(pk) || pk === 'careful' ? opts.sort((a, b) => b.d - a.d)[0] : opts[Math.floor(r() * opts.length)];
    click('buy', o.i); const uid = o.it.uid; if (run.bag.includes(uid)) G0.equipUid(run, uid, o.sl);
    G0.applyGear(run);
  }
}
/* 0.6a.2 트리: 포인트가 있으면 성향대로 연다. 숙련·탐험가·신중은 한 갈래에 몰고(깊은 칸), 나머지는 아무 칸이나.
   연 스킬은 빈칸에 끼우고, 칸이 차면 가장 낮은 등급과 바꾼다 */
const TIER_N = { 기본: 0, 하급: 0, 중급: 1, 상급: 2, 궁극: 3 };
const ROWN = s => s.row || TIER_N[s.tier] + 1; // 0.6a.2 사다리: 줄이 깊을수록 높다
function spendTree(pk, r) {
  const G = G0.__G, run = G.run; if (!run.tree || !(run.tree.pts > 0)) return;
  const all = G0.SKILLS2[run.build]; const T = G0.TREE2[run.build];
  run.focus = run.focus || (process.env.FOCUS && T.branches.includes(process.env.FOCUS) ? process.env.FOCUS : T.branches[Math.floor(r() * T.branches.length)]); // FOCUS=갈래 이름으로 고정해 잴 수 있다
  for (let n = 0; n < 20 && run.tree.pts > 0; n++) {
    const can = all.filter(s => !G0.treeWhy(run, s.id));
    if (!can.length) break;
    const focus = THINK(pk) || pk === 'careful';
    let br = run.focus; if (run.build === 'hunter' && focus) { if (br === '기동') br = run.focus = r() < 0.5 ? '저격' : '연사'; const opened = b0 => run.tree.open.filter(id => (G0.SK2[id] || {}).b === b0).length; br = opened('기동') <= opened(run.focus) ? '기동' : run.focus; } // 사냥꾼(10월 5일): 피해 갈래 하나와 기동을 번갈아 (한 갈래를 몰아 찍으면 오히려 약하다)
    const pool = focus ? (can.filter(s => s.b === br).length ? can.filter(s => s.b === br) : can) : can;
    const root = focus ? pool.filter(x => ROWN(x) === 1 && x.b === br) : []; // 한 갈래를 파는 사람은 그 갈래의 첫 줄 두 칸부터 연다
    const s = root.length ? root[0] : focus ? pool.sort((x, y) => ROWN(y) - ROWN(x) || r() - 0.5)[0] : pool[Math.floor(r() * pool.length)];
    G0.treeUnlock(run, s.id);
    const eq = run.skills.slice();
    if (eq.length < G0.EQUIP_SLOTS2) eq.push(s.id);
    else { const lo = eq.map((id, i) => [i, ROWN(G0.SK2[id])]).sort((x, y) => x[1] - y[1])[0]; if (lo[1] < ROWN(s) || r() < 0.3) eq[lo[0]] = s.id; }
    run.skills = eq; run.p.skills = G0.v2Equip(run);
  }
}
/* 지금 G.run을 성향대로 끝(쓰러짐 또는 정산)까지 진행한다 */
function playLoop(pk, r, out) {
  const G = G0.__G, run = G.run; const mem = {};
  for (let guard = 0; guard < 240; guard++) {
    if (OPT.onStep) OPT.onStep(G);
    if (G.scr === 'dead') { out.res = 'lose'; break; }
    if (G.scr === 'settle') {
      if ((run.ch || 1) >= OPT.chapters) { out.res = 'clear'; break; }
      (out.chs = out.chs || []).push({ ch: run.ch, lv: run.lv, gold: run.settle.total, bossHp: out.bossHp, bossLv: out.bossLv });
      betweenChapters(pk, r); out.bossHp = null; out.bossLv = null; continue;
    }
    handleSheets(pk, r); spendTree(pk, r);
    if (!run.cur && run.cross) { const k = pickPath(pk, run, r); (out.paths = out.paths || []).push(k); G0.choosePath(k); continue; }
    if (!run.cur && run.doors) { const i = pickDoor(pk, run, r); out.rooms.push(run.doors[i].type); G0.chooseDoor(i); continue; }
    const R = run.cur; if (!R) { out.bugs.push('방이 없음 ' + run.room); break; }
    if (!G0.ROOM_TYPES[R.type] || !G0.ROOM_TYPES[R.type].fight) { if (R.type !== 'boss') { restRoom(pk, run, r); handleSheets(pk, r); continue; } }
    if (R.type === 'boss') { out.bossHp = Math.round(run.p.hp / run.p.hpMax * 100); out.bossLv = run.lv; }
    useConsOut(pk, run, r);
    const hpIn = run.p.hp / run.p.hpMax;
    if (R.type === 'boss' && OPT.snap) out.snap = JSON.stringify(run);
    const acts0 = out.acts; const b = fightCur(pk, r, mem, out);
    out.rooms[out.rooms.length - 1] = (R.type === 'boss' ? 'boss' : out.rooms[out.rooms.length - 1]) + ':' + b.over + ':' + Math.round((hpIn - run.p.hp / run.p.hpMax) * 100);
    if (OPT.detail) out.fights.push(fightRec(R, b, run, hpIn, out.acts - acts0));
    if (R.type === 'boss') { const bs = b.en.find(e => e.role === 'boss'); out.bossEnd = { hp: bs ? Math.round(Math.max(0, bs.hp) / bs.hpMax * 100) : 0, ph: bs ? bs.phase || 1 : 0, turns: b.turnIdx, enr: !!b.enrage, bhp: bs ? Math.round(bs.hpMax) : 0, php: Math.round(run.p.hpMax) }; }
    out.floor = run.room;
    G0.battleContinue();
    handleSheets(pk, r);
  }
  out.floor = run.room; out.ch = run.ch || 1; out.lv = run.lv; out.gold = run.gold;
  if (OPT.detail) { out.cons = (run.consLog || []).length; out.consIds = countBy((run.consLog || []).map(x => x.id)); out.loot = (run.lootLog || []).reduce((a, x) => ({ gold: a.gold + (x.gold || 0), lost: a.lost + (x.lost || 0), n: a.n + Object.values(x.got || {}).reduce((m, v) => m + v, 0) }), { gold: 0, lost: 0, n: 0 }); out.tree = run.tree ? run.tree.open.slice() : null; out.equip = (run.skills || []).slice(); out.flaskLeft = Object.assign({}, run.p.flask); out.pathsTaken = (run.pathLog || []).map(x => x.path); } out.gear = Object.values(run.inv).filter(x => run.eqU && Object.values(run.eqU).includes(x.uid)).map(x => x.tpl + ':' + x.g);
  return out;
}

if (require.main === module) {
  const N = +(process.argv[2] || 20); const file = process.argv[3] || path.join(__dirname, 'dgqa.json');
  OPT.chapters = +(process.argv[4] || 1); // 2: 1챕터를 깬 캐릭터가 2챕터까지 이어 간다
  OPT.detail = process.env.DETAIL !== '0';
  const t0 = Date.now(); const runs = [];
  // 10월 5일 옵션: SEED(씨앗 시작값, 기본 5000), CLS=암살자 키들(쉼표), PK=성향 키들(쉼표), SHARD=i/n(n조각 가운데 i번째만, 0부터), DETAIL=0이면 전투 기록을 빼고 가볍게
  const SEED0 = +(process.env.SEED || 5000); const CLSF = process.env.CLS ? process.env.CLS.split(',') : null; const PKF = process.env.PK ? process.env.PK.split(',') : null;
  const [SI, SN] = (process.env.SHARD || '0/1').split('/').map(Number); let job = 0;
  for (const pk of Object.keys(PERSONAS).filter(k => !PKF || PKF.includes(k))) for (const build of Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && (!G0.BUILDS[k].soon || process.env.DG_SOON) && (!CLSF || CLSF.includes(k)))) for (let s = 0; s < N; s++) { if ((job++ % SN) !== SI) continue; runs.push(playChar(pk, build, SEED0 + s * 13)); }
  fs.writeFileSync(file, JSON.stringify(runs));
  // 요약: 챕터마다 따로 (2챕터는 1챕터를 깬 캐릭터 기준, 기획서 11.12절)
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const passed = (x, ch) => (x.chs || []).some(c => c.ch === ch) || (x.res === 'clear' && (x.ch || 1) === ch);
  const chOf = c => G0.chOf ? G0.chOf(c) : { boss: 19, spring: 18, lower: 10 }; // 루트(0.6a)에는 챕터 틀이 없다
  const isLower = (f, c) => G0.isLower ? G0.isLower(f, c) : f >= chOf(c).lower;
  const where = (x, ch) => passed(x, ch) ? 'clear' : x.floor >= chOf(x.ch).boss ? 'boss' : isLower(x.floor, x.ch) || x.floor === chOf(x.ch).spring ? 'lower' : 'upper';
  console.log(`판 ${runs.length}, ${((Date.now() - t0) / 1000).toFixed(0)}초, 이상 ${runs.reduce((a, x) => a + x.bugs.length, 0)}건`);
  for (let ch = 1; ch <= OPT.chapters; ch++) {
    const R = ch === 1 ? runs : runs.filter(x => passed(x, ch - 1));
    const sum = list => { const c = { clear: 0, upper: 0, lower: 0, boss: 0 }; list.forEach(x => c[where(x, ch)]++); return `완주 ${pct(c.clear, list.length)}% | 쓰러진 곳 상층 ${pct(c.upper, list.length)} 하층 ${pct(c.lower, list.length)} 보스 ${pct(c.boss, list.length)}`; };
    if (OPT.chapters > 1) console.log(`== ${ch}챕터 (${ch === 1 ? '모든 캐릭터' : (ch - 1) + '챕터를 깬 캐릭터'} ${R.length}명)`);
    console.log('전체(6성향 평균):', sum(R));
    const think = R.filter(x => x.pk === MEASURE); console.log('사고하는 유저(신중):', sum(think));
    for (const pk of Object.keys(PERSONAS)) console.log('  ' + PERSONAS[pk].n.padEnd(4), sum(R.filter(x => x.pk === pk)));
    console.log('직업별 (전체 / 신중):');
    for (const b of Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && (!G0.BUILDS[k].soon || process.env.DG_SOON))) { const a = R.filter(x => x.build === b), t = think.filter(x => x.build === b); console.log('  ' + G0.BUILDS[b].n.padEnd(6), pct(a.filter(x => passed(x, ch)).length, a.length) + '% / ' + pct(t.filter(x => passed(x, ch)).length, t.length) + '%'); }
    const bo = R.map(x => { const c = (x.chs || []).find(c => c.ch === ch) || ((x.ch || 1) === ch ? x : null); return c && c.bossHp != null ? { hp: c.bossHp, lv: c.bossLv } : null; }).filter(Boolean);
    console.log(`보스에 닿은 판 ${bo.length}: 들어갈 때 생명력 평균 ${Math.round(bo.reduce((a, x) => a + x.hp, 0) / (bo.length || 1))}%, 레벨 평균 ${(bo.reduce((a, x) => a + x.lv, 0) / (bo.length || 1)).toFixed(1)}, 보스 승률 ${pct(R.filter(x => passed(x, ch)).length, bo.length)}%`);
    if (ch < OPT.chapters) { const P = R.filter(x => passed(x, ch)); const cs = P.map(x => x.chs.find(c => c.ch === ch)); console.log(`넘은 캐릭터: 레벨 평균 ${(cs.reduce((a, c) => a + c.lv, 0) / (cs.length || 1)).toFixed(1)}, 정산 골드 평균 ${Math.round(cs.reduce((a, c) => a + c.gold, 0) / (cs.length || 1))}`); }
  }
  if (OPT.detail && runs.length) { // 10월 5일: 층별 도달 곡선, 사망 원인, 예고된 큰 공격으로 쓰러진 몫
    const reach = []; for (let f = 1; f <= 24; f++) reach.push(pct(runs.filter(x => x.floor >= f || x.res === 'clear').length, runs.length));
    console.log('층별 도달(%):', reach.join(' '));
    const deaths = runs.flatMap(x => x.fights.filter(f => f.death).map(f => Object.assign({ build: x.build }, f)));
    const by = countBy(deaths.map(d => d.t + ' ← ' + d.death.by + (d.death.big ? ' (큰 공격)' : '')));
    console.log('사망 원인(방 ← 마지막 일격):', Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => k + ' ' + n).join(' | '));
    { const F = runs.flatMap(x => x.fights); const nb = F.reduce((a, f) => a + (f.big || 0), 0); const bad = F.flatMap(f => f.bigNoTurn || []); console.log(`예고된 큰 공격 ${nb}번 가운데 예고 뒤 내 차례 없이 나간 것 ${bad.length}번`, bad.length ? countBy(bad) : ''); }
    console.log(`예고된 큰 공격으로 쓰러짐 ${pct(deaths.filter(d => d.death.big).length, deaths.length)}%, 마지막 세 일격 안에 큰 공격 ${pct(deaths.filter(d => d.death.bigIn3).length, deaths.length)}%, 쓰러질 때 생명력 플라스크가 남음 ${pct(deaths.filter(d => d.death.fl && d.death.fl.life > 0).length, deaths.length)}%`);
  }
  const bugs = runs.flatMap(x => x.bugs); if (bugs.length) console.log('이상 예:', bugs.slice(0, 5));
}
module.exports = { playChar, playLoop, handleSheets, click, replayBoss, OPT, G0, run_, PERSONAS, rng, ch2Pre, ch2Post };
