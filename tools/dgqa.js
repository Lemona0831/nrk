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
  vm.runInContext('Object.assign(this, { bagUsed: typeof bagUsed !== "undefined" ? bagUsed : null, BAG_MAX: typeof BAG_MAX !== "undefined" ? BAG_MAX : 12, CHAPTERS: typeof CHAPTERS !== "undefined" ? CHAPTERS : null, CONS: typeof CONS !== "undefined" ? CONS : null, UNLOCK: typeof UNLOCK !== "undefined" ? UNLOCK : {}, LOOT: typeof LOOT !== "undefined" ? LOOT : null, STAT_KEYS: typeof STAT_KEYS !== "undefined" ? STAT_KEYS : null, LV_XP_: typeof LV_XP !== "undefined" ? LV_XP : null, poolOk_: typeof poolOk !== "undefined" ? poolOk : () => true, STAT_REC: typeof STAT_REC !== "undefined" ? STAT_REC : null, STAT_START: typeof STAT_START !== "undefined" ? STAT_START : null, LV_POINTS: typeof LV_POINTS !== "undefined" ? LV_POINTS : 2, isLower, chOf: typeof chOf !== "undefined" ? chOf : null, ITEMS, EVENTS, ROOM_TYPES, BUILDS, tplKind, SKILLS2: typeof SKILLS2 !== "undefined" ? SKILLS2 : null, TREE2: typeof TREE2 !== "undefined" ? TREE2 : null, SK2: typeof SK2 !== "undefined" ? SK2 : null, EQUIP_SLOTS2: typeof EQUIP_SLOTS2 !== "undefined" ? EQUIP_SLOTS2 : 4 });', ctx); // const 값은 밖에서 읽을 수 있게 꺼내 둔다
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
  const gain = { normal: 3, ambush: 3.3, treasure: 5, trial: 5, strong: 6, spring: 0, shrine: 1.5, altar: 1, event: 1.5, fate: 1.2 };
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
  if (process.env.PATH_FIX) return process.env.PATH_FIX; /* 10월 8일(7단계): 길 고정(rough · main · quiet). 없으면 아래 그대로 */
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
      const hl = it.g === 'h' || it.g === 'l'; const why = G0.equipWhy ? G0.equipWhy(run, it.uid, sl) : ''; /* 2챕터 영웅 · 전설: 성향과 상관없이 끼어 본다(초보 빼고). 전설은 하나만(equipWhy) */
      let eq;
      if (hl && !why && pk !== 'novice' && d > -10) eq = true;
      else if (THINK(pk)) eq = d > 0.5 || (act && fit && d > -6) || (act && r() < P.curious * 0.4 && d > -3);
      else if (pk === 'novice') eq = r() < 0.5;
      else eq = d > 2 || (act && r() < P.curious * 0.5);
      if (why) eq = false;
      if (eq) click('dropequip', it.uid, { s: sl }); else click('dropkeep');
    } else if (S.kind === 'choice') {
      const o = S.data.offer; const k = THINK(pk) ? (o.find(x => G0.classFit(run.p, x)) || o[0]) : o[Math.floor(r() * o.length)];
      click('choose', k);
    } else if (S.kind === 'bagfull') { const keep = u => run.inv[u] && ['h', 'l'].includes(run.inv[u].g); click(run.bag.length ? 'bfdrop' : 'bfskip', run.bag.find(u => !keep(u)) || run.bag[0]); } /* 영웅 · 전설은 버리지 않는다 */
    else if (S.kind === 'stats') {
      const pref = PREF[run.build];
      const KEYS = G0.STAT_KEYS || ['str', 'dex', 'int']; S.data.alloc = S.data.alloc || Object.fromEntries(KEYS.map(k => [k, 0]));
      if (G0.statRecommend && G0.STAT_REC && G0.STAT_REC[run.build] && pk !== 'novice') { const add = G0.statRecommend(run.build, Object.fromEntries(KEYS.map(k => [k, (run.stats[k] || 0)])), S.data.pts); for (const k of KEYS) S.data.alloc[k] += add[k] || 0; }
      else for (let i = 0; i < S.data.pts; i++) { const k = pk === 'novice' || r() > 0.65 ? KEYS[Math.floor(r() * KEYS.length)] : pref; S.data.alloc[k]++; }
      click('statok');
    } else if (S.kind === 'offer') { click('offerpick', run.bag[0]); }
    else if (S.kind === 'awk') { click('awkpick', awkChoice(pk, r, run)); } /* 깨달음 (2챕터 이후에만 뜬다) */
    else if (S.kind === 'swap') { click('swapskip'); } // 스킬 바꾸기: 단계 3에서 성향별로
    else { G.sheet = null; }
    while (!G.sheet && G.dropQ && G.dropQ.length) G0.nextDrop();
  }
}

/* 깨달음 고르기: 지금 파는 갈래의 직업 깨달음 > 다른 직업 깨달음 > 공용(성향 순서). 초보는 무작위 */
const AWK_MAP_ = run_('typeof AWK_MAP !== "undefined" ? AWK_MAP : {}');
const AWK_COMMON = ['a_eye', 'a_skin', 'a_vial', 'a_stand', 'a_vigor', 'a_breath', 'a_shell', 'a_iron', 'a_ember', 'a_point', 'a_scatter', 'a_smolder', 'a_flow', 'a_gap', 'a_resolve', 'a_pouch', 'a_clear', 'a_gulp', 'a_warmth', 'a_light', 'a_heavyhand', 'a_brew', 'a_purse', 'a_memory'];
function awkChoice(pk, r, run) {
  const offer = run.awkOffer || []; if (pk === 'novice') return offer[Math.floor(r() * offer.length)];
  const sc = id => { const a = AWK_MAP_[id]; return (a.g === 'cls' ? (a.br === run.focus ? 100 : 20) : 40 - AWK_COMMON.indexOf(id)) + r() * 0.5; };
  return offer.slice().sort((x, y) => sc(y) - sc(x))[0];
}
/* 운명의 저울: 쓸모없는 평범 · 고급(직업에 맞지 않고 끼지 않은 것)만 올린다. 초보는 절반쯤 아무거나 */
function fatePick(pk, run, r) {
  const GR = { n: 0, m: 1, r: 2 };
  const bag = run.bag.map(u => run.inv[u]).filter(x => x && !G0.fateCan(run, x));
  let c = bag.filter(x => (x.g === 'n' || x.g === 'm') && !G0.classFit(run.p, x.tpl)).sort((a, b) => GR[a.g] - GR[b.g])[0];
  if (pk === 'novice' && bag.length && r() < 0.5) c = bag[Math.floor(r() * bag.length)];
  return c ? click('fate', c.uid) : click('fateskip');
}
/* 이벤트·제단·성소 고르기 */
function restRoom(pk, run, r) {
  const R = run.cur; const p = run.p; const h = p.hp / p.hpMax;
  if (R.type === 'camp' || R.type === 'spring') return click('rest');
  if (R.type === 'shrine') return click('shrine', pk === 'novice' ? (r() < 0.5 ? 1 : 0) : 1);
  if (R.type === 'fate') return fatePick(pk, run, r);
  if (R.type === 'altar') {
    const can = R.altar === 'gold' ? (run.gold || 0) >= 40 : R.altar === 'offer' ? run.bag.length > 0 : R.altar === 'ash' ? (run.cons || []).filter(c => G0.CONS[c.id].use !== 'none' && G0.CONS[c.id].price > 6).reduce((a, c) => a + c.n, 0) >= 6 : true;
    const want = R.altar === 'blood' || R.altar === 'scale' ? (THINK(pk) ? h > 0.6 : r() < 0.5) : can; // 3챕터 재의 제단은 태울 것이 넉넉할 때만
    return click('altar', can && want ? 1 : 0);
  }
  if (R.type === 'event') {
    const E0 = G0.EVENTS.find(x => x.id === R.event);
    const ok = E0.opts.filter(o => !((E0.id === 'reliquary' && o.id === 'force' && p.st < 40) || (E0.id === 'buried' && o.id === 'dig' && p.st < 50) || (E0.id === 'monk' && o.id === 'feed' && !(p.flask.life + p.flask.mana + (p.flask.stam || 0)))));
    let o = ok[Math.floor(r() * ok.length)];
    if (THINK(pk) || pk === 'careful') { // 위험한 선택은 생명력이 넉넉할 때만
      const safe = ok.filter(x => !(x.id === 'drink' && h < 0.5) && !(x.id === 'chase' && h < 0.6) && !(x.id === 'do' && h < 0.6) && !(x.id === 'loot' && h < 0.5) && !((E0.ch || 1) >= 3 && ((['pull', 'take', 'dig', 'hasten'].includes(x.id) && h < 0.6) || (x.id === 'draw' && h < 0.7)))); // 3챕터 위험한 선택 (1 · 2챕터 이벤트는 그대로: 종탑의 줄도 id가 pull이다)
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
    case 'interrupt': return (al.some(e => e.role !== 'boss' && it(e, 'heavy', 'aimed')) && !p.dodge) || al.some(e => it(e, 'noon'));
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
    case 'halfboom': return al.some(e => it(e, 'explode', 'burn')) || (b.heatWarn != null && b.heatWarn <= (b.round || 0));
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
    case 'cool': return b.heat != null && (b.heat >= 70 || (b.heatWarn != null && b.heatWarn <= (b.round || 0))); // 3챕터 (10월 7일)
    case 'unhaze': return al.reduce((a, e) => a + (e.haze || 0), 0) >= 3 || al.some(e => e.foe === 'dancer' && e.haze >= 2 && it(e, 'charge'));
    case 'rewind': return al.some(e => (e.foe === 'sundial' && (e.clock || 0) <= 1) || (e.foe === 'colossus' && e.glow >= 2) || (e.foe === 'reaper' && e.embers >= 4) || (e.chant && it(e, 'chanting', 'mchanting')));
    case 'healcure': return (p.hp < p.hpMax * 0.45 && (!p.flask.life || r() < 0.5)) || sk(p, 'ignite') >= 4;
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
/* 3챕터 판단 (10월 7일, 비공개 문서의 테스터 판단 가운데 사람이 화면을 보고 할 만한 것만). 3챕터 전투에서만 난수를 쓴다: 1 · 2챕터 측정은 그대로다 */
function ch3Pre(b, P, r) {
  if (!(((b.ctx && b.ctx.ch) || 1) >= 3)) return null;
  const al = G0.alive(b); const q = al.find(e => e.boss === 'queen'); const crown = al.find(e => e.role === 'crown');
  const hot = (b.heat || 0) >= 80 || (b.heatWarn != null && b.heatWarn <= (b.round || 0) + 1); if (crown) crown.crownHot = hot ? 1 : 0; // qa.js enemyPrio: 열기가 높거나 예고가 뜨면 왕관을 먼저
  const L = () => G0.actionList(b).filter(x => x.ok && x.id !== 'flee');
  const hitOn = (e, fast) => { const c = L().filter(x => !x.self && G0.canTarget(b, e, x) && (x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s.fx.some(f => f.k === 'dmg')))); return (fast && c.find(x => x.v2 && x.time <= 0.6)) || c.find(x => x.v2 && !x.aoe) || c.find(x => x.id === 'basic') || null; };
  { const er = al.find(e => e.under && e.intent && e.intent.k === 'erupt'); if (er && b.prepTurn !== b.turnIdx && r() < (P.parry || 0.3) + 0.2) { const d = L().find(x => x.id === 'dodge'); if (d && G0.canTarget(b, er, d)) return ['dodge', er.id]; } } // 솟구칠 적을 흘린다
  if (b.heatWarn != null && b.heatWarn <= (b.round || 0) && b.prepTurn !== b.turnIdx && r() < (P.guard || 0.3) + 0.3) { const g = L().find(x => x.id === 'guard'); if (g) return ['guard', null]; } // 열풍 · 재폭풍 예고: 막는다
  if (q && crown && hot && r() < (P.mech || 0.5) + 0.2) { const a = hitOn(crown, 1); if (a) return [a.id, a.aoe ? null : crown.id]; } // 열기가 높으면 왕관
  if (q && q.under) { const m = al.find(e => e.role === 'maid' && e.chant); if (m && r() < (P.mech || 0.5) + 0.2) { const a = hitOn(m, 0); if (a) return [a.id, a.aoe ? null : m.id]; } } // 여왕이 숨으면 영창하는 시녀
  return null;
}
const ACT_G = (b, a) => { if (a === 'basic' || a === 'heavy') return 'wpn'; if (a === 'guard' || a === 'dodge') return 'prep'; const x = G0.actionList(b).find(y => y.id === a); return x && x.v2 ? (x.s.tgt === 'self' && !x.s.fx.some(f => f.k === 'dmg') ? 'prep' : 'skill') : null; };
function ch2Post(b, P, r, a, t) {
  if (!b.carve || !b.carve.g) return [a, t]; const g = ACT_G(b, a); if (!g || !(b.carve.g[g] < 1) || r() >= (P.mech || 0.5) + 0.2) return [a, t]; // 군주가 이름을 새긴 행동은 힘이 빠지므로 다른 종류를 쓴다
  const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee' && !['flaskL', 'flaskM', 'flaskS', 'sig'].includes(x.id) && !(b.carve.g[ACT_G(b, x.id)] < 1));
  const atk = L.filter(x => !x.self && (x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s.fx.some(f => f.k === 'dmg'))));
  const pick = (atk.length ? atk : L)[0]; if (!pick) return [a, t];
  if (pick.self || pick.aoe) return [pick.id, null];
  const tg = G0.alive(b).filter(e => !e.pile && e.role !== 'bonewall' && G0.canTarget(b, e, pick)).sort((x, y) => ((y.role === 'boss') - (x.role === 'boss')) || (x.hp - y.hp))[0] || G0.alive(b).find(e => G0.canTarget(b, e, pick));
  return tg ? [pick.id, tg.id] : [a, t];
}
/* 지금 방에 들어가 성향대로 싸운다 */
function fightCur(pk, r, mem, out) {
  const P = PERSONAS[pk]; const G = G0.__G;
  G0.enterRoom(); const b = G.b; b.stepMode = false; let n = 0; let stall = 0, lastHp = Infinity; let stuckN = 0;
  // 10월 5일: 전투 난수를 테스터 판단 난수와 나눈다(판단 규칙 하나를 바꿔도 전투 운은 그대로 남아 비교가 깨끗하다). LEGACY_RNG=1이면 예전처럼 같은 난수
  b.rngF = process.env.LEGACY_RNG ? r : rng(((out.seed || 1) * 7919 + (G.run.room || 0) * 131 + (G.run.ch || 1) * 100003 + (out.acts || 0)) | 0);
  while (!b.over && n++ < 300) {
    useCons(pk, r, b, G.run); if (b.over) break;
    const sr = r() < (P.mech || 0.5) ? sigRule(b, r) : null;
    let [a, t] = ch2Pre(b, P, r) || ch3Pre(b, P, r) || sr || (P.look && !(process.env.HUNT_HEUR && b.p.build === 'hunter') ? lookahead(b, P, r) : heuristic(b, P, r, mem));
    [a, t] = ch2Post(b, P, r, a, t);
    // 보스를 깎지 못한 채 버티기만 하면 사람은 밀어붙인다 (한 수 앞만 보는 계산이 페이즈 전환을 피하는 것을 막는다)
    const bs = b.en.find(e => e.role === 'boss' && e.alive);
    if (bs) { if (bs.hp < lastHp - 0.5) stall = 0; else stall++; lastHp = bs.hp;
      if (stall >= 3 && b.p.hp > b.p.hpMax * 0.5 && ['guard', 'dodge', 'sig'].includes(a)) { const L = G0.actionList(b).filter(x => x.ok && !x.pull && !['guard', 'dodge', 'flee', 'flaskL', 'flaskM', 'flaskS', 'sig'].includes(x.id)); if (L.length) { a = L[Math.floor(r() * L.length)].id; t = null; } } }
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[0].id; t = null; }
    if (P.look && r() < P.err) { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[Math.floor(r() * L.length)].id; t = null; }
    else if (r() < (THINK(pk) ? 0.9 : P.healerFirst)) { // 보스전 기믹에 사람이 하는 대응 (비공개 문서)
      const act = G0.actionList(b).find(x => x.id === a); const monk = G0.alive(b).filter(e => e.monk && act && G0.canTarget(b, e, act)).sort((x, y) => (y.role === 'healer') - (x.role === 'healer'))[0];
      if (monk && act && act.tgt !== false && !(b.p.build === 'assassin' && (a === 'dodge' || (act.s && act.s.fx.some(f => f.k === 'parry'))))) t = monk.id; /* 암살자(10월 8일): 흘리기는 공격하는 적에게 건다. 치유 수도사로 바꾸면 흘리기가 엉뚱한 적에게 걸린다(비공개 문서 보스 그림자: 강타를 흘리고 원거리로 치유 수도사) */
    }
    if (OPT.onTurn) OPT.onTurn(G, n);
    if (stuckN >= 2 && !process.env.NO_STUCK_FIX) { const Lk = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); const gd = Lk.find(x => x.id === 'guard') || Lk[0]; if (gd) { a = gd.id; t = null; } } /* 10월 8일: 같은 행동을 해도 차례가 흐르지 않으면(땅속의 적만 남고 단일 대상 행동뿐일 때) 사람처럼 방어로 차례를 넘긴다 */
    const progKey = b.turnIdx + ':' + (b.round || 0) + ':' + b.log.length;
    try { G0.playerAct(b, a, t); } catch (e) { out.bugs.push('예외 ' + e.message + ' @' + a); b.over = 'lose'; }
    stuckN = progKey === b.turnIdx + ':' + (b.round || 0) + ':' + b.log.length ? stuckN + 1 : 0;
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
  G.data = G0.blankData(); G.data.seenFoe = { abbot: 1, bellringer: 1, pilgrim: 1 }; G.data.seenBoss = { abbot: 1 }; G.data.seenCoach = true; G.data.unlAll = 1; /* 숨겨진 직업도 고를 수 있게(어느 직업을 잴지는 DG_LOCK이 정한다) */
  G.cre = { name: 'qa' }; G.dropQ = []; G.b = null; G.sheet = null;
  if (process.env.MODE === 'hard') { G0.__G.data.hardOpen = 1; G0.__G.cre = { mode: 'hard' }; } /* 10월 8일: MODE=hard이면 가혹으로 만든다 */
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
  if (FROM > 1) jumpTo(pk, r, FROM);
  return playLoop(pk, r, out);
}
/* DG_FROM=3 (10월 7일): 앞 챕터를 깬 캐릭터를 흉내 내 그 챕터 1층에서 시작한다. AI가 2챕터를 거의 깨지 못해(완주 0~3%) 3챕터를 재려면 따로 세운다.
   레벨은 챕터 시작 레벨(2챕터 Lv5, 3챕터 Lv10, 기획서 11.4), 능력치는 추천 배분, 트리는 성향대로, 장비는 앞 챕터 장비(슬롯마다 고급, 무기 · 갑옷은 희귀), 소모품 약초 셋과 무작위 셋, 생명력 · 플라스크 가득 */
const FROM = +(process.env.DG_FROM || 1);
function jumpTo(pk, r, ch) {
  const G = G0.__G, run = G.run; const lv = ch >= 3 ? 10 : 5; const up = lv - (run.lv || 1);
  run.lv = lv; run.xp = G0.LV_XP_[lv - 1]; run.p.lv = lv; if (run.tree) run.tree.pts += up;
  const KEYS = G0.STAT_KEYS; const add = G0.statRecommend(run.build, Object.fromEntries(KEYS.map(k => [k, run.stats[k] || 0])), G0.LV_POINTS * up); for (const k of KEYS) run.stats[k] = (run.stats[k] || 0) + (add[k] || 0); G0.applyStats(run.p, run.stats);
  G0.initGear(run);
  for (const sl of ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2']) {
    const kind = sl === 'ring1' || sl === 'ring2' ? 'ring' : sl; const g = sl === 'weapon' || sl === 'armor' ? 'r' : 'm';
    const owned = Object.values(run.inv).map(x => x.tpl); const pool = G0.poolOf(ch - 1).filter(k => G0.ITEMS[k] && G0.ITEMS[k].kind !== 'start' && G0.tplKind(k) === kind && G0.poolOk_(run.p, k) && !owned.includes(k));
    const fit = pool.filter(k => G0.itemFits(run.p, k) && (G0.ITEMS[k].g || 'n') === g); const any = pool.filter(k => (G0.ITEMS[k].g || 'n') === g); const L = fit.length ? fit : any.length ? any : pool; if (!L.length) continue;
    const it = G0.mkItem(L[Math.floor(r() * L.length)], { ch: ch - 1 }); run.inv[it.uid] = it; run.bag.push(it.uid); G0.equipUid(run, it.uid, sl);
  }
  for (const k of (process.env.DG_GIVE || '').split(',').filter(Boolean)) { const kind = G0.tplKind(k); const sl = kind === 'ring' ? 'ring2' : kind; const it = G0.mkItem(k, { ch }); run.inv[it.uid] = it; run.bag.push(it.uid); G0.equipUid(run, it.uid, sl); } // 통제 시험(DG_GIVE=장비id,…): 정한 장비를 처음부터 끼워 같은 씨앗의 안 낀 판과 짝지어 잰다(장비마다 효과 재기, 선택 편향 없음)
  for (const u of run.bag.slice()) G0.discardUid(run, u); // 뺀 시작 장비는 버린다
  const ids = Object.keys(G0.CONS).filter(k => (G0.CONS[k].ch || 1) < ch && G0.CONS[k].use !== 'none'); G0.consAdd(run, 'herb', 'n', 3); for (let k = 0; k < 3; k++) G0.consAdd(run, ids[Math.floor(r() * ids.length)], 'n', 1);
  G0.applyGear(run); run.p.hp = run.p.hpMax; run.p.st = run.p.stMax; run.p.flask.life = run.p.flaskMax; run.p.flask.mana = run.p.flaskMax; run.p.flask.stam = run.p.flaskMax; run.gold = 0;
  spendTree(pk, r);
  for (let c = 1; c < ch; c++) { run.ch = c; if (c >= run_('AWK.settleFrom') && G0.CHAPTERS[c + 1]) { G0.awkGrant(run); run.awkOffer = G0.awkOfferMake(run); if (run.awkOffer.length) G0.awkTake(run, awkChoice(pk, r, run)); else run.awkPending = 0; } } /* 정산 뒤의 깨달음 (앞 챕터를 깬 캐릭터 흉내) */
  run.ch = ch - 1; run.clears = ch - 1; run.phase = 'wait'; G0.enterChapter(run);
}
/* 챕터 사이: 정산 확정 → 상점(성향대로 산다) → 설문 → 다음 챕터 */
function betweenChapters(pk, r, out) {
  const G = G0.__G, run = G.run;
  click('settleok'); handleSheets(pk, r);
  const g0 = run.gold || 0; shopPhase(pk, r);
  if (out && run.shop) (out.shops = out.shops || []).push({ ch: run.ch, gold: g0, left: run.gold || 0, hero: run.shop.stock.some(x => x.hero) ? 1 : 0, buys: (run.shop.log || []).filter(x => x.a === 'buy').map(x => x.tpl + ':' + x.g + ':' + x.price) }); /* 골드 흐름 (2챕터 장비 측정) */
  if (out && run.shop && (run.shop.log || []).some(x => x.a === 'gamble')) out.shops[out.shops.length - 1].gamble = run.shop.log.filter(x => x.a === 'gamble').map(x => x.tpl + ':' + x.g + ':' + x.price + ':' + x.fit); /* 꾸러미를 샀을 때만 */
  click('shopleave'); G0.finishSurvey({ fun: 4 }); click('nextch');
}
/* 봉인된 꾸러미 (2챕터를 넘은 뒤의 상점만): 진열 장비를 산 뒤 남은 골드로. 신중 · 숙련 · 탐험가는 가장 낮은 등급의 칸부터, 나머지는 절반만 산다. 초보는 사지 않는다.
   나온 장비는 전리품 창과 같은 판단으로 낀다(영웅 · 전설은 거의 끼운다) */
function gamblePhase(pk, r) {
  const G = G0.__G, run = G.run, S = run.shop; const gOn = run_('gambleOn'), gPrice = run_('gamblePrice'); if (!S || !gOn(run) || pk === 'novice') return;
  const GR = { n: 0, m: 1, r: 2, h: 3, l: 4 }; const slots = run_('GAMBLE.slots');
  run_('ask = () => true'); /* 팔 때 묻는 창은 늘 예 */
  for (let n = 0; n < 4; n++) {
    if ((G0.bagUsed ? G0.bagUsed(run) : run.bag.length) >= (G0.BAG_MAX || 12)) { const junk = run.bag.map(u => run.inv[u]).filter(x => x && (x.g === 'n' || x.g === 'm') && !run_('gFit')(run.p, x.tpl)).sort((a, b) => a.g.localeCompare(b.g) || a.uid.localeCompare(b.uid))[0]; if (junk) click('sell', junk.uid); } /* 가방이 가득 차면 직업에 맞지 않는 평범 · 고급 하나를 판다 */
    if ((run.gold || 0) < gPrice(S.ch) || (G0.bagUsed ? G0.bagUsed(run) : run.bag.length) >= (G0.BAG_MAX || 12)) break;
    if (!(THINK(pk) || pk === 'careful' || r() < 0.5)) break;
    const cur = sl => Math.min(...(sl === 'ring' ? ['ring1', 'ring2'] : [sl]).map(e => run.eqU[e] && run.inv[run.eqU[e]] ? GR[run.inv[run.eqU[e]].g] : -1));
    const slot = slots.map(sl => ({ sl, v: cur(sl) + r() * 0.5 })).sort((a, b) => a.v - b.v)[0].sl;
    click('gamble', slot); const res = S.gamble; if (!res || !run.inv[res.it.uid]) break;
    const it = run.inv[res.it.uid]; const kind = G0.tplKind(it.tpl); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind;
    const d = gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p)); const hl = it.g === 'h' || it.g === 'l'; const why = G0.equipWhy(run, it.uid, sl);
    if (!why && ((hl && d > -10) || d > 0.5)) { G0.equipUid(run, it.uid, sl); G0.applyGear(run); }
  }
}
/* 상점: 끼우면 나아지는 장비를 골드 안에서 산다. 신중·숙련·탐험가는 가장 나은 것부터, 나머지는 무작위로 */
function shopPhase(pk, r) {
  const G = G0.__G, run = G.run, S = run.shop; if (!S) return;
  const delta = it => { const kind = G0.tplKind(it.tpl); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind; const had = !!run.inv[it.uid]; run.inv[it.uid] = it; const d = gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p)); if (!had) delete run.inv[it.uid]; return { d: d + (G0.classFit(run.p, it.tpl) && G0.ITEMS[it.tpl].act ? 2 : 0), sl }; };
  for (let n = 0; n < 6; n++) {
    const opts = S.stock.map((x, i) => Object.assign({ i }, x)).filter(o => !o.sold && o.price <= (run.gold || 0) && (G0.bagUsed ? G0.bagUsed(run) : run.bag.length) < (G0.BAG_MAX || 12)).map(o => Object.assign(o, delta(o.it))).map(o => (o.it.g === 'h' && (o.d += 4), o)).filter(o => o.d > 0.5); /* 영웅 칸: 효과가 크다고 보고 더 친다 */
    if (!opts.length) break;
    const o = THINK(pk) || pk === 'careful' ? opts.sort((a, b) => b.d - a.d)[0] : opts[Math.floor(r() * opts.length)];
    click('buy', o.i); const uid = o.it.uid; if (run.bag.includes(uid)) G0.equipUid(run, uid, o.sl);
    G0.applyGear(run);
  }
  gamblePhase(pk, r);
}
/* 0.6a.2 트리: 포인트가 있으면 성향대로 연다. 숙련·탐험가·신중은 한 갈래에 몰고(깊은 칸), 나머지는 아무 칸이나.
   연 스킬은 빈칸에 끼우고, 칸이 차면 가장 낮은 등급과 바꾼다 */
const TIER_N = { 기본: 0, 하급: 0, 중급: 1, 상급: 2, 궁극: 3 };
const ROWN = s => s.row || TIER_N[s.tier] + 1; // 0.6a.2 사다리: 줄이 깊을수록 높다
/* 숨겨진 직업 3의 주 경로 (C5): 줄마다 연다. BM_VAR=1이면 역병 · 혈약은 다섯째 칸으로 포식 1줄 왼쪽(피 거두기)을 연다(변형 판) */
const BM_PATH = { 역병: ['v_spill', 'v_host', 'v_gust', 'v_marsh', 'v_veil', 'v_carry', 'v_vector', 'v_pollen', 'v_black', 'v_pandemic'], 포식: ['v_reap', 'v_plant', 'v_replant', 'v_nibble', 'v_swarm', 'v_supper', 'v_deepreap', 'v_gather', 'v_teat', 'v_hunger'], 혈약: ['v_spear', 'v_cut', 'v_thorn', 'v_heart', 'v_oath', 'v_rupture', 'v_impale', 'v_covenant', 'v_burstheart', 'v_last'] };
function bmPathNext(run, br) {
  const L = (BM_PATH[br] || []).slice(); if (process.env.BM_VAR && br !== '포식' && run.tree.open.length === 4 && !run.tree.open.includes('v_reap')) return G0.SK2.v_reap && !G0.treeWhy(run, 'v_reap') ? G0.SK2.v_reap : null;
  for (const id of L) if (!run.tree.open.includes(id)) return G0.SK2[id] && !G0.treeWhy(run, id) ? G0.SK2[id] : null;
  return null;
}
function spendTree(pk, r) {
  const G = G0.__G, run = G.run; if (!run.tree || !(run.tree.pts > 0)) return;
  const all = G0.SKILLS2[run.build]; const T = G0.TREE2[run.build];
  run.focus = run.focus || (process.env.FOCUS && T.branches.includes(process.env.FOCUS) ? process.env.FOCUS : T.branches[Math.floor(r() * T.branches.length)]); // FOCUS=갈래 이름으로 고정해 잴 수 있다
  for (let n = 0; n < 20 && run.tree.pts > 0; n++) {
    const can = all.filter(s => !G0.treeWhy(run, s.id));
    if (!can.length) break;
    const focus = THINK(pk) || pk === 'careful';
    let br = run.focus; if (run.build === 'hunter' && focus) { if (br === '기동') br = run.focus = r() < 0.5 ? '저격' : '연사'; const opened = b0 => run.tree.open.filter(id => (G0.SK2[id] || {}).b === b0).length; br = opened('기동') <= opened(run.focus) ? '기동' : run.focus; } // 사냥꾼(10월 5일): 피해 갈래 하나와 기동을 번갈아 (한 갈래를 몰아 찍으면 오히려 약하다)
    let pool = focus ? (can.filter(s => s.b === br).length ? can.filter(s => s.b === br) : can) : can;
    if (run.build === 'assassin' && focus && br === '그림자' && !process.env.SH_RANDOM) { /* 암살자 그림자(10월 8일): 왼쪽 기둥(피해 칸)만 내려간다. 문서 C-5: 오른 기둥은 Lv10 보스 22%, 보스 앞에서 흘리기 준비만 끼우면 진다 */ const lp = pool.filter(s => all.filter(x => x.b === s.b && x.row === s.row)[0] === s); if (lp.length) pool = lp; }
    const root = focus ? pool.filter(x => ROWN(x) === 1 && x.b === br) : []; // 한 갈래를 파는 사람은 그 갈래의 첫 줄 두 칸부터 연다
    const sbPref = x => run.build === 'spellblade' && [3, 5].includes(x.row) && x.tgt === 'self' ? 1 : 0; // 마검사(10월 7일): 3 · 5줄에서는 나에게 쓰는 칸(칼에 싣기 · 채우기)
    const bmS = run.build === 'bloodmage' && focus ? bmPathNext(run, br) : null; // 숨겨진 직업 3 (비공개 문서 C5 · F4-11): 갈래마다 정한 주 경로
    const s = bmS ? bmS : root.length ? root[0] : focus ? pool.sort((x, y) => ROWN(y) - ROWN(x) || sbPref(y) - sbPref(x) || r() - 0.5)[0] : pool[Math.floor(r() * pool.length)];
    G0.treeUnlock(run, s.id);
    const eq = run.skills.slice();
    if (eq.length < G0.EQUIP_SLOTS2) eq.push(s.id);
    else { const lo = eq.map((id, i) => [i, ROWN(G0.SK2[id])]).sort((x, y) => x[1] - y[1])[0]; if (lo[1] < ROWN(s) || r() < 0.3) eq[lo[0]] = s.id; }
    if (run.build === 'spellblade' && eq.length >= G0.EQUIP_SLOTS2) for (const k of ['spell', 'cut']) if (!eq.some(id => G0.SK2[id].kind === k)) { const c = run.tree.open.filter(id => G0.SK2[id].kind === k && !eq.includes(id)).sort((x, y) => ROWN(G0.SK2[y]) - ROWN(G0.SK2[x]))[0]; if (c) { const lo = eq.map((id, i) => [i, ROWN(G0.SK2[id])]).filter(x => G0.SK2[eq[x[0]]].kind !== k).sort((x, y) => x[1] - y[1])[0]; if (lo) eq[lo[0]] = c; } } // 마검사: 4칸에 ⚔ · ✦를 하나 이상씩
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
      betweenChapters(pk, r, out); out.bossHp = null; out.bossLv = null; continue;
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
  if (OPT.detail && run.tree) { const cnt = {}; for (const id of run.tree.open) { const sk = G0.SK2[id]; if (sk) cnt[sk.b] = (cnt[sk.b] || 0) + 1; } const top = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0]; out.branch = run.build === 'hunter' && run.focus ? run.focus : top ? top[0] : null; out.branchN = top ? top[1] : 0; out.branchOf = run.tree.open.length; out.mode = run.mode || 'normal'; } /* 10월 8일(7단계): 갈래(트리 칸을 가장 많이 연 갈래) · 연 칸 수 · 모드를 판마다 남긴다 */
  if ((run.awk || []).length) out.awk = run.awk.slice(); { const ft = (run.rooms || []).filter(x => x.type === 'fate'); if (ft.length) out.fate = ft.map(x => x.took ? (x.ok ? '+' : '-') + x.took : 'skip'); } /* 깨달음 · 운명의 저울 (없으면 칸을 두지 않아 1챕터 결과 파일은 그대로) */
  { const hl = (run.drops || []).filter(x => x.g === 'h' || x.g === 'l').map(x => x.item + ':' + x.g + ':' + (x.ch || 1) + (x.boss ? ':boss' : '')); if (hl.length) out.hl = hl; } /* 영웅 · 전설을 얻은 기록 (없으면 칸을 두지 않아 1챕터 결과 파일은 그대로) */
  if (OPT.detail) { out.cons = (run.consLog || []).length; out.consIds = countBy((run.consLog || []).map(x => x.id)); out.loot = (run.lootLog || []).reduce((a, x) => ({ gold: a.gold + (x.gold || 0), lost: a.lost + (x.lost || 0), n: a.n + Object.values(x.got || {}).reduce((m, v) => m + v, 0) }), { gold: 0, lost: 0, n: 0 }); out.tree = run.tree ? run.tree.open.slice() : null; out.equip = (run.skills || []).slice(); out.flaskLeft = Object.assign({}, run.p.flask); out.pathsTaken = (run.pathLog || []).map(x => x.path); } out.gear = Object.values(run.inv).filter(x => run.eqU && Object.values(run.eqU).includes(x.uid)).map(x => x.tpl + ':' + x.g);
  return out;
}

/* 3챕터 요약 (10월 7일): 들어간 수, 방 종류 · 무리 · 강적 · 특성마다 들어간 판과 쓰러진 몫, 예고 위반, 층별 도달 */
function ch3Detail(R, ch) {
  const F = R.flatMap(x => (x.fights || []).filter(f => f.ch === ch).map(f => Object.assign({ build: x.build }, f))); if (!F.length) { console.log('3챕터 전투 기록 없음'); return; }
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0; const tab = key => { const m = {}; for (const f of F) { const k = key(f); if (!k) continue; m[k] = m[k] || { n: 0, d: 0 }; m[k].n++; if (f.res === 'lose') m[k].d++; } return Object.entries(m).sort((x, y) => y[1].d - x[1].d || y[1].n - x[1].n).map(([k, v]) => k + ' ' + v.d + '/' + v.n + ' (' + pct(v.d, v.n) + '%)').join(' · '); };
  console.log('3챕터 방 종류 (쓰러짐/들어감):', tab(f => f.t));
  console.log('3챕터 무리:', tab(f => f.sq));
  console.log('3챕터 강적 · 보스:', tab(f => f.foe || (f.t === 'boss' ? 'queen' : null)));
  console.log('3챕터 특성:', tab(f => f.mods));
  const reach = []; const ent = R.filter(x => (x.fights || []).some(f => f.ch === ch)); for (let f = 1; f <= 24; f++) reach.push(pct(ent.filter(x => (x.ch === ch ? x.floor >= f : true) || x.res === 'clear').length, ent.length));
  console.log(`3챕터에 들어간 캐릭터 ${ent.length}명, 층별 도달(%):`, reach.join(' '));
  const bad = F.flatMap(f => f.bigNoTurn || []); console.log(`3챕터 예고된 큰 공격 ${F.reduce((a, f) => a + (f.big || 0), 0)}번 가운데 예고 뒤 내 차례 없이 나간 것 ${bad.length}번`, bad.length ? countBy(bad) : '');
  const deaths = F.filter(f => f.death); const by = countBy(deaths.map(d => d.t + ' ← ' + d.death.by + (d.death.big ? ' (큰 공격)' : ''))); console.log('3챕터 사망 원인:', Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => k + ' ' + n).join(' | '));
  const bs = F.filter(f => f.t === 'boss'); if (bs.length) console.log(`3챕터 보스전 ${bs.length}번, 이김 ${bs.filter(f => f.res === 'win').length}`);
}
if (require.main === module) {
  const N = +(process.argv[2] || 20); const file = process.argv[3] || path.join(__dirname, 'dgqa.json');
  OPT.chapters = +(process.argv[4] || 1); // 2: 1챕터를 깬 캐릭터가 2챕터까지 이어 간다
  OPT.detail = process.env.DETAIL !== '0';
  const t0 = Date.now(); const runs = [];
  // 10월 5일 옵션: SEED(씨앗 시작값, 기본 5000), CLS=암살자 키들(쉼표), PK=성향 키들(쉼표), SHARD=i/n(n조각 가운데 i번째만, 0부터), DETAIL=0이면 전투 기록을 빼고 가볍게
  const SEED0 = +(process.env.SEED || 5000); const CLSF = process.env.CLS ? process.env.CLS.split(',') : null; const PKF = process.env.PK ? process.env.PK.split(',') : null;
  const [SI, SN] = (process.env.SHARD || '0/1').split('/').map(Number); let job = 0;
  for (const pk of Object.keys(PERSONAS).filter(k => !PKF || PKF.includes(k))) for (const build of Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && (!G0.BUILDS[k].soon || process.env.DG_SOON) && (!G0.UNLOCK[k] || process.env.DG_LOCK || (CLSF && CLSF.includes(k))) && (!CLSF || CLSF.includes(k)))) for (let s = 0; s < N; s++) { if ((job++ % SN) !== SI) continue; runs.push(playChar(pk, build, SEED0 + s * 13)); }
  fs.writeFileSync(file, JSON.stringify(runs));
  // 요약: 챕터마다 따로 (2챕터는 1챕터를 깬 캐릭터 기준, 기획서 11.12절)
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const passed = (x, ch) => (x.chs || []).some(c => c.ch === ch) || (x.res === 'clear' && (x.ch || 1) === ch);
  const chOf = c => G0.chOf ? G0.chOf(c) : { boss: 19, spring: 18, lower: 10 }; // 루트(0.6a)에는 챕터 틀이 없다
  const isLower = (f, c) => G0.isLower ? G0.isLower(f, c) : f >= chOf(c).lower;
  const where = (x, ch) => passed(x, ch) ? 'clear' : x.floor >= chOf(x.ch).boss ? 'boss' : isLower(x.floor, x.ch) || x.floor === chOf(x.ch).spring ? 'lower' : 'upper';
  console.log(`판 ${runs.length}, ${((Date.now() - t0) / 1000).toFixed(0)}초, 이상 ${runs.reduce((a, x) => a + x.bugs.length, 0)}건`);
  for (let ch = FROM; ch <= Math.max(FROM, OPT.chapters); ch++) {
    const R = ch === FROM ? runs : runs.filter(x => passed(x, ch - 1));
    const sum = list => { const c = { clear: 0, upper: 0, lower: 0, boss: 0 }; list.forEach(x => c[where(x, ch)]++); return `완주 ${pct(c.clear, list.length)}% | 쓰러진 곳 상층 ${pct(c.upper, list.length)} 하층 ${pct(c.lower, list.length)} 보스 ${pct(c.boss, list.length)}`; };
    if (OPT.chapters > 1 || FROM > 1) console.log(`== ${ch}챕터 (${ch === FROM ? (FROM > 1 ? (ch - 1) + '챕터를 깬 캐릭터를 흉내 낸 시작' : '모든 캐릭터') : (ch - 1) + '챕터를 깬 캐릭터'} ${R.length}명)`);
    console.log('전체(6성향 평균):', sum(R));
    const think = R.filter(x => x.pk === MEASURE); console.log('사고하는 유저(신중):', sum(think));
    for (const pk of Object.keys(PERSONAS)) console.log('  ' + PERSONAS[pk].n.padEnd(4), sum(R.filter(x => x.pk === pk)));
    console.log('직업별 (전체 / 신중):');
    for (const b of Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && (!G0.BUILDS[k].soon || process.env.DG_SOON))) { const a = R.filter(x => x.build === b), t = think.filter(x => x.build === b); console.log('  ' + G0.BUILDS[b].n.padEnd(6), pct(a.filter(x => passed(x, ch)).length, a.length) + '% / ' + pct(t.filter(x => passed(x, ch)).length, t.length) + '%'); }
    const bo = R.map(x => { const c = (x.chs || []).find(c => c.ch === ch) || ((x.ch || 1) === ch ? x : null); return c && c.bossHp != null ? { hp: c.bossHp, lv: c.bossLv } : null; }).filter(Boolean);
    console.log(`보스에 닿은 판 ${bo.length}: 들어갈 때 생명력 평균 ${Math.round(bo.reduce((a, x) => a + x.hp, 0) / (bo.length || 1))}%, 레벨 평균 ${(bo.reduce((a, x) => a + x.lv, 0) / (bo.length || 1)).toFixed(1)}, 보스 승률 ${pct(R.filter(x => passed(x, ch)).length, bo.length)}%`);
    if (ch >= 3) ch3Detail(R, ch);
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
module.exports = { playChar, playLoop, handleSheets, click, replayBoss, OPT, G0, run_, PERSONAS, rng, ch2Pre, ch2Post, ch3Pre };
