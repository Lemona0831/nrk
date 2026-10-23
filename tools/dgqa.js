/* ===== 던전 자동 테스터 (0.6, 기획서 11.11절)
   next/의 게임 코드 전체(엔진 + 던전·장비·레벨·이벤트 화면 코드)를 Node의 vm에서 그대로 돌린다.
   문 고르기, 장비 끼우기, 이벤트, 레벨 능력치는 성향별 규칙으로, 전투 행동은 qa.js의 성향(heuristic·lookahead)으로 고른다.
   쓰러지면 끝(다시 하기 없음). 1챕터 보스를 넘으면 완주.
   실행: node tools/dgqa.js [성향·직업마다 판 수=20] [결과 파일=tools/dgqa.json] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.env.DGDIR || '.'; // 돌릴 게임 폴더 (저장본 점검은 지인 사이트 코드 '.'로 저장본을 만든다)
require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, 'extract-engine.js'), DIR]); // 테스터의 판단(qa.js)이 쓰는 엔진 사본을 지금 코드로 새로 만든다
const Q = require('./qa.js');
const { PERSONAS, heuristic, lookahead, sigRule, rng, hazePick } = Q;

function loadGame() {
  const dir = path.resolve(__dirname, '..', DIR);
  const PS = require('./pagesrc.js'); const data = PS.pageData(dir), script = PS.pageScript(dir); // 한 파일 · 나눈 파일 모두 같은 글자
  const ctx = { console, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(data + '\n' + script + '\n;this.__G = G;', ctx, { filename: DIR + '/index.html' });
  // 화면·저장·소리는 끈다
  vm.runInContext('Object.assign(this, { bagUsed: typeof bagUsed !== "undefined" ? bagUsed : null, BAG_MAX: typeof BAG_MAX !== "undefined" ? BAG_MAX : 12, CHAPTERS: typeof CHAPTERS !== "undefined" ? CHAPTERS : null, CONS: typeof CONS !== "undefined" ? CONS : null, UNLOCK: typeof UNLOCK !== "undefined" ? UNLOCK : {}, LOOT: typeof LOOT !== "undefined" ? LOOT : null, STAT_KEYS: typeof STAT_KEYS !== "undefined" ? STAT_KEYS : null, LV_XP_: typeof LV_XP !== "undefined" ? LV_XP : null, poolOk_: typeof poolOk !== "undefined" ? poolOk : () => true, STAT_REC: typeof STAT_REC !== "undefined" ? STAT_REC : null, STAT_START: typeof STAT_START !== "undefined" ? STAT_START : null, LV_POINTS: typeof LV_POINTS !== "undefined" ? LV_POINTS : 2, isLower, chOf: typeof chOf !== "undefined" ? chOf : null, ITEMS, EVENTS, ROOM_TYPES, BUILDS, tplKind, SKILLS2: typeof SKILLS2 !== "undefined" ? SKILLS2 : null, TREE2: typeof TREE2 !== "undefined" ? TREE2 : null, SK2: typeof SK2 !== "undefined" ? SK2 : null, EQUIP_SLOTS2: typeof EQUIP_SLOTS2 !== "undefined" ? EQUIP_SLOTS2 : 4, PT: typeof PT !== "undefined" ? PT : null, PT_TILT: typeof PT_TILT !== "undefined" ? PT_TILT : null, ptWhy: typeof ptWhy !== "undefined" ? ptWhy : null, atWhy: typeof atWhy !== "undefined" ? atWhy : null, ptOpenIds: typeof ptOpenIds !== "undefined" ? ptOpenIds : null, ringOpen: typeof ringOpen !== "undefined" ? ringOpen : null, ksInfo: typeof ksInfo !== "undefined" ? ksInfo : null, AT_PTS: typeof AT_PTS !== "undefined" ? AT_PTS : null });', ctx); // const 값은 밖에서 읽을 수 있게 꺼내 둔다
  vm.runInContext(`toast = () => {}; scheduleSync = () => {}; syncRun = async () => false; pushRank = async () => {}; saveLocal = () => true; sfx = () => {};`, ctx);
  vm.runInContext('var window = { scrollTo() { }, innerWidth: 1280, innerHeight: 800, scrollY: 0, addEventListener() { } };', ctx); // 정산·상점 버튼이 부르는 창 함수만 둔다
  return ctx;
}
const G0 = loadGame();
const run_ = code => vm.runInContext(code, G0);
if (process.env.HEAVY_17 != null) run_(process.env.HEAVY_17 === '1' ? 'HEAVY_V2 = 1.7; HEAVY_COST = 35' : 'HEAVY_V2 = 1.5; HEAVY_COST = 40'); // M4(D11) 강공격 A/B: 1이면 ×1.7 · 35, 0이면 ×1.5 · 40
if (process.env.BRK_BASIC0 != null || process.env.HEAVY_BRK) run_('BRK_RULE.basic0 = ' + (process.env.BRK_BASIC0 === '0' ? 'false' : process.env.BRK_BASIC0 != null ? 'true' : 'BRK_RULE.basic0') + '; ' + (process.env.HEAVY_BRK ? 'BRK_RULE.heavyMul = ' + (+process.env.HEAVY_BRK) + '; ' : '') + 'for (const k in PTREE) delete PTREE[k];'); if (process.env.BRK_BASIC0 != null || process.env.HEAVY_BRK) { const R = require('./eng.gen.js').BRK_RULE; if (R) { R.basic0 = run_('BRK_RULE.basic0'); R.heavyMul = run_('BRK_RULE.heavyMul'); } } // M5-7 붕괴 규칙 측정: BRK_BASIC0=1 켬 · 0 끔, HEAVY_BRK 강공격 붕괴 배율
if (process.env.GEAR8 != null) { run_('GEAR8.on = ' + (process.env.GEAR8 !== '0')); const E8 = require('./eng.gen.js').GEAR8; if (E8) E8.on = process.env.GEAR8 !== '0'; } // M6-1 장비 틀 스위치(gear8): 1 켬 · 0 끔
if (process.env.DG_NOAF) run_('G8GEN.noAf = 1'); if (process.env.DG_NOWPNAF) run_('G8GEN.noWpnAf = 1'); // M6-3 측정: 기반만 · 무기 접사 없음
if (process.env.CFG) run_(process.env.CFG); // 시험할 수치: CFG='DIFF[1].upper.dmg=1.3; BOSSES.abbot.mult=7'
/* M7-2 측정 스위치 YS_BLOCK=pre: 막기 대응(방어로 받아 냄 · 되받기)의 유산을, 받아 낸 공격이 큰 예고(YS_PRE_K · 겨눈 한 발)일 때만 준다. 실제 게임 엔진에만 걸고 한 수 앞 계산(eng.gen.js)은 그대로 */
if (process.env.YS_BLOCK === 'pre') run_(`(function () { const H = hurtPlayer, Y = ysResp; let pre = 0; const isPre = e => !!(e && e.intent && (YS_PRE_K.includes(e.intent.k) || e.intent.aimed));
  hurtPlayer = function (b, raw, o) { const s = pre; pre = isPre(o && o.src); try { return H.apply(this, arguments); } finally { pre = s; } };
  ysResp = function (b, why) { return why === '막기' && !pre ? 0 : Y.apply(this, arguments); }; })()`);
if (process.env.HUNT_BRIDGE) run_("{ const u = ATREE_DEF.hunter.ups.find(x => x[0] === 'hu_link3'); u[8].cond.when = 'linkFast'; u[7] = '연계로 쓰거나, 이번 차례에 빠른 기동 스킬을 먼저 썼으면 비용 −1(바닥 1, 라운드에 한 번).'; }");
if (process.env.ASN_SHADOW_VAR) { Q.asnShadowVar(run_('ATREE_DEF'), run_('AT_GONE'), process.env.ASN_SHADOW_VAR); run_('delete ATREE.assassin; SKC.clear()'); } // 10월 18일 0.8.0 5단계 측정 변형(원거리 초안 10절 결정 3): 암살자 그림자 old · rush(qa.js asnShadowVar). 10월 18일 0.8.0 5단계 마무리: swap은 기본 데이터가 되어 바꾸지 않는다 // 0.8.0 5단계 측정 변형(원거리 초안 8절 보완 2): 이어 묶는 화살 = 연계이거나 이번 차례에 빠른 기동 스킬을 먼저 씀. 기본값 아님
/* 10월 17일 측정 도구 보완: 판 기록마다 꼬리표(out.meta: 게임 · 도구 지문, 시드, 성향, 직업, 시작 챕터, 변형, 행동을 바꾸는 환경 변수)를 남기고,
   실패 · 중단(out.fails: 예외 · 행동 한도 · 걸음 한도 · 방 없음 · 창 한도)을 글이 아닌 칸으로도 남긴다. tools/measure-validate.js가 읽는다 */
const MM = require('./measure-meta.js'); const REV = MM.revision(path.resolve(__dirname, '..', DIR));
const SKE = require('./skeval.js').makeSkEval(G0, run_); // 강화를 반영한 스킬 값 (장착 고르기)
const failOf = (out, k, o) => { (out.fails = out.fails || []).push(Object.assign({ k }, o || {})); };

const PREF = { assassin: 'int', scar: 'str', priest: 'int', berserker: 'str', hunter: 'dex', arcanist: 'int', templar: 'str', warlock: 'int' };
const FIGHT = ['normal', 'ambush', 'strong', 'treasure', 'trial'];
const THINK = k => k === 'expert' || k === 'explorer'; // 한 수 앞을 계산하는 성향(전투 판단 방식)
const MEASURE = 'careful'; // 목표의 "사고하는 유저" = 신중 (10월 2일 만든 사람 결정: 예고를 읽고 막고, 자원과 길을 관리하는 성향)

/* 장비 점수: 바뀌는 수치의 합(11.11절 "비교 점수") */
/* 0.8.0 M6-2 새 장비(gear8) 고르기: item-score V(js/19 g8V) + "지금 빌드" 꼬리표가 맞으면 ×1.15. 반지는 V가 낮은 쪽 칸 */
const F8C = {}; const F8 = k => F8C[k] || (F8C[k] = run_(k));
const g8On = () => run_('GEAR8.on');
function g8Val(run, it) { if (!it || !F8('isG8')(it)) return 0; const v = G0.g8V(it); return F8('g8Fits')(it, G0.g8BuildTags(run)) ? v * 1.15 : v; }
function g8SlotOf(run, it) { const k = F8('g8Slot')(it); if (k !== 'ring') return k; const a = run.inv[run.eqU.ring1], b = run.inv[run.eqU.ring2]; if (!a) return 'ring1'; if (!b) return 'ring2'; return g8Val(run, a) <= g8Val(run, b) ? 'ring1' : 'ring2'; }
function g8Delta(run, it, sl) { const cur = run.eqU[sl] && run.inv[run.eqU[sl]]; return g8Val(run, it) - g8Val(run, cur); }
/* 다시 굴리기(6-4): V가 오를 것 같을 때만 — 가장 낮은 접사의 V가 그 등급 한 접사 몫의 75% 아래면 굴린다(한 상점에 두 번까지) */
function g8RerollPhase(pk, r, run) {
  if (!g8On() || !(THINK(pk) || pk === 'careful')) return; const IV = F8('ITEM_V'), AF = F8('AFFIX');
  for (let k = 0; k < 2; k++) { let best = null;
    for (const sl of ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2', 'flask']) { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; if (!it || !F8('isG8')(it) || it.uq || !(it.af || []).length || F8('g8RerollWhy')(run, it)) continue;
      const B = F8('g8Band')(it.g, it.ch), share = (B[0] + B[1]) / 2 / (it.ax ? 3 : it.af.length);
      it.af.forEach((a, i) => { const v = G0.g8VAf(a.id, a.v, it.ch); if (v < share * 0.75 && (!best || v / share < best.q)) best = { it, i, q: v / share }; }); }
    if (!best) break; click('reroll', best.it.uid + ':' + best.i); }
}
function gearScore(st) { return st.hp * 0.6 + st.mp * 0.25 + st.st * 0.25 + st.basic * 3 + st.heavy * 1.5 + st.flask * 120; }

/* 문 고르기 (성향별) */
function pickDoor(pk, run, r) {
  if (OPT.policy?.pickDoor) return OPT.policy.pickDoor(run, r);
  const P = PERSONAS[pk]; const p = run.p; const h = p.hp / p.hpMax; const fl = p.flask.life;
  const low = G0.isLower(run.room, run.ch);
  const loss = { normal: 0.22, ambush: 0.3, treasure: 0.3, trial: 0.45, strong: low ? 0.75 : 0.5 };
  const gain = { normal: 3, ambush: 3.3, treasure: 5, trial: 5, strong: 6, spring: 0, shrine: 1.5, altar: 1, event: 1.5, fate: 1.2, market: 1.4, checkpoint: 1.1, smugstall: 1.4 };
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
      v = t === 'spring' ? (1 - h) * 12 + (3 - fl) : gain[t] + (t === 'altar' && d.altar === 'gold' && (run.gold || 0) < altarCost(run) ? -3 : 0);
      if (pk === 'explorer' && (t === 'event' || t === 'altar')) v += 1.5;
      if (pk === 'reckless') v -= 1.5;
    }
    return v + r() * (THINK(pk) ? 0.8 : 2);
  });
  return sc.indexOf(Math.max(...sc));
}

/* 갈래길 고르기 (0.6a.2, 10월 4일): 험한 길 · 큰 길 · 샛길. 생명력과 플라스크를 보고 성향대로 */
function pickPath(pk, run, r) { const k = OPT.policy?.pickPath ? OPT.policy.pickPath(run, r) : pickPath0(pk, run, r); return k === 'quiet' && ((run.marks && run.marks.includes('noquiet')) || ((run.ch || 1) === 3 && run.dg && run.dg.oath)) ? 'main' : k; } /* A3 수비대의 맹세도 */ /* 표식 noquiet이면 샛길은 막혀 있다 */
function pickPath0(pk, run, r) {
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
    if (OPT.policy?.sheet && OPT.policy.sheet(S, run, r)) {
      while (!G.sheet && G.dropQ && G.dropQ.length) G0.nextDrop();
      continue;
    }
    if (S.kind === 'drop') {
      const it = run.inv[S.data.uid]; const n8 = F8('isG8')(it); const kind = G0.tplKind(it.tpl); const sl = n8 ? g8SlotOf(run, it) : kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind;
      const d = n8 ? g8Delta(run, it, sl) : gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p)); /* 0.8.0 M6-2: 새 장비는 V + 지금 빌드 */
      const act = n8 ? !!it.uq : !!G0.ITEMS[it.tpl].act; const fit = n8 ? F8('g8Fits')(it, G0.g8BuildTags(run)) : G0.classFit(run.p, it.tpl);
      const hl = it.g === 'h' || it.g === 'l'; const why = G0.equipWhy ? G0.equipWhy(run, it.uid, sl) : ''; /* 2챕터 영웅 · 전설: 성향과 상관없이 끼어 본다(초보 빼고). 전설은 하나만(equipWhy) */
      let eq;
      if (hl && !why && pk !== 'novice' && d > -10) eq = true;
      else if (THINK(pk)) eq = d > 0.5 || (act && fit && d > -6) || (act && r() < P.curious * 0.4 && d > -3);
      else if (pk === 'novice') eq = r() < 0.5;
      else eq = d > 2 || (act && r() < P.curious * 0.5);
      if (why) eq = false;
      if (eq) click('dropequip', it.uid, { s: sl }); else click('dropkeep');
    } else if (S.kind === 'choice') {
      const o = S.data.offer; let k;
      if (o.length && typeof o[0] === 'object') { const sc = x => g8Delta(run, x, g8SlotOf(run, x)); k = (THINK(pk) ? o.slice().sort((a, b) => sc(b) - sc(a))[0] : o[Math.floor(r() * o.length)]).uid; } /* 0.8.0 M6-2: 새 장비 상자 */
      else k = THINK(pk) ? (o.find(x => G0.classFit(run.p, x)) || o[0]) : o[Math.floor(r() * o.length)];
      click('choose', k);
    } else if (S.kind === 'bagfull') { const keep = u => run.inv[u] && ['h', 'l'].includes(run.inv[u].g); click(run.bag.length ? 'bfdrop' : 'bfskip', run.bag.find(u => !keep(u)) || run.bag[0]); } /* 영웅 · 전설은 버리지 않는다 */
    else if (S.kind === 'alloc') { allocAuto(pk, r, run); } /* 10월 16일 0.8.0 2단계: 배분 흐름(옛 세이브 옮기기 · 만들기) */
    else if (S.kind === 'offer') { click('offerpick', run.bag[0]); }
    else if (S.kind === 'ks') { spendPassive(pk, r); click('kspick', ksChoice(pk, r, run)); } /* 큰 각인 (1 · 2챕터 정산 뒤, 3챕터 야영지) */
    else if (S.kind === 'swap') { click('swapskip'); }
    else if (S.kind === 'patrol') { const P = run.patrolPend || { cons: [] }; const ptOk = ((run.patrolPt || {})[run.ch || 1] || 0) < run_('AMBUSH').ptMax; const pt = ptOk && ((THINK(pk) || pk === 'careful') ? true : r() < 0.5); click('patrolpick', pt || !P.cons.length ? 'pt' : P.cons[Math.floor(r() * P.cons.length)]); } /* 0.8.0 6단계: 순찰대 보상 — 신중 · 숙련은 패시브 포인트가 남았으면 그것, 초보 · 대충은 반반 */
    else if (S.kind === 'consfull') { run_('ask = () => true'); click('cptake'); } // 10월 14일 개편 5단계: 전리품 화면(자리가 없는 것은 두고 간다) // 스킬 바꾸기: 단계 3에서 성향별로
    else { G.sheet = null; }
    while (!G.sheet && G.dropQ && G.dropQ.length) G0.nextDrop();
  }
  if (G.sheet && CUR) { CUR.bugs.push('창 40번 안에 닫히지 않음 ' + G.sheet.kind); failOf(CUR, 'sheetcap', { kind: G.sheet.kind, room: G.run && G.run.room }); } /* 10월 17일: 전에는 말없이 넘어갔다 */
}

/* 10월 16일 0.8.0 2단계 찍기 정책 =====
   패시브: 가까운 축(기울기 A) → 보통(B) → 멂(C) 순으로, 아직 없는 중간 노드까지의 최단 길을 한 칸씩 찍는다(점수 = 길 칸 수 + 방향 순위 × 1.5, 같으면 화력 · 생존 · 계승 · 유지력 · 제어 · 기민 순). 초보는 아무 칸이나.
   큰 각인: KS_PREF 순서에서 가장 앞인 후보(초보는 아무것이나). 되돌리기는 하지 않는다 */
const DIR_PREF = ['pw', 'sv', 'lg', 'su', 'ct', 'ag'];
function dirRank(build) { const T = G0.PT_TILT[build] || {}; const tr = { A: 0, B: 1, C: 2 }; return d => (tr[T[d] || 'B']) + DIR_PREF.indexOf(d) * 0.01; }
function ptPathTo(run, T, target) { // 열린 노드에서 target까지 열린 고리의 노드만 지나는 최단 길 (얻지 않은 큰 각인 자리는 지나지 않는다)
  const open = new Set(G0.ptOpenIds(run)); const par = {}; const q = [...open].sort(); const seen = new Set(q);
  while (q.length) { const x = q.shift(); if (x === target) break; if (T.nodes[x].kind === 'keystone' && !open.has(x)) continue; for (const y of T.nodes[x].links) { if (seen.has(y) || !G0.ringOpen(run, T.nodes[y].ring)) continue; seen.add(y); par[y] = x; q.push(y); } }
  if (!seen.has(target)) return null; const path = []; for (let x = target; !open.has(x); x = par[x]) path.unshift(x); return path;
}
/* 10월 18일 0.8.0 5단계(원거리 초안 10절 결정 2) 생존 · 유지력 바닥: 직업 트리(임시 트리 아님)에서 가진 중간 노드 가운데 생존 · 유지력(sv · su) 중간 노드가 셋에 하나 밑이면
   (생존 · 유지력 수 < ⌊가진 중간 노드 수 / 3⌋), 다음 목표를 생존 · 유지력 중간 노드 가운데에서 같은 점수(길 칸 수 + 방향 순위)로 고른다. 닿을 것이 없으면 원래대로.
   중간 노드 수로 세므로 길 칸을 찍는 동안 목표가 바뀌지 않는다. 큰 각인 길로 공짜로 얻은 중간 노드도 센다. PT_SURV_OLD=1이면 끈다(옛 찍기)
   10월 18일 0.8.0 5단계 마무리(원거리 초안 11-8의 3): 바닥은 2고리가 열린 뒤(1챕터 보스를 넘은 뒤)부터 건다. 1고리만 열린 동안은 옛 찍기와 같다(1챕터 근접 숙련 하락 28 → 21 · 38 → 31을 되돌림).
     2고리가 열리면 그때까지 가진 중간 노드 전체로 다시 세므로 3챕터 몫(30% 안팎)은 그대로 맞춘다. PT_SURV_RING1=1이면 1고리부터 건다(3da63fd 그대로) */
const PT_SURV_DIR = ['sv', 'su'];
function ptSurvNeed(run, T, open) {
  if (process.env.PT_SURV_OLD || T.tmp) return false; if (!process.env.PT_SURV_RING1 && !G0.ringOpen(run, 2)) return false; let n = 0, s = 0;
  for (const id of open) { const nd = T.nodes[id]; if (!nd || nd.kind !== 'notable') continue; n++; if (PT_SURV_DIR.includes(nd.dir)) s++; }
  return s < Math.floor(n / 3);
}
function spendPassive(pk, r) {
  if (OPT.policy?.spendPassive) return OPT.policy.spendPassive(G0.__G.run, r);
  const run = G0.__G.run; if (!run || !run.ptree) return; const T = G0.ptBuild(run.build); const rk = dirRank(run.build); let n = 0;
  while (run.ptree.pts > 0 && n++ < 60) {
    const can = Object.keys(T.nodes).filter(id => !G0.ptWhy(run, id)); if (!can.length) break;
    if (pk === 'novice') { G0.ptBuy(run, can[Math.floor(r() * can.length)]); continue; }
    const open = new Set(G0.ptOpenIds(run)); let best = null; const sv = ptSurvNeed(run, T, open);
    for (let pass = sv ? 0 : 1; pass < 2 && !best; pass++) for (const id of Object.keys(T.nodes)) { const nd = T.nodes[id]; if (nd.kind !== 'notable' || open.has(id) || !G0.ringOpen(run, nd.ring) || (pass === 0 && !PT_SURV_DIR.includes(nd.dir))) continue; const p = ptPathTo(run, T, id); if (!p || !p.length) continue; const sc = p.length + rk(nd.dir) * 1.5 + r() * 0.3; if (!best || sc < best.sc) best = { sc, p }; }
    const pick = best && can.includes(best.p[0]) ? best.p[0] : can.sort((a, b) => rk(T.nodes[a].dir) - rk(T.nodes[b].dir) || T.nodes[a].pos.r - T.nodes[b].pos.r)[0];
    if (G0.ptBuy(run, pick)) break;
  }
}
const KS_PREF = ['ks_deep', 'ks_wall', 'ks_sb_blood', 'ks_cycle', 'ks_crystal', 'ks_el_cut', 'ks_breaker', 'ks_first', 'ks_sb_beat', 'ks_glass', 'ks_flow', 'ks_hammer', 'ks_sb_over', 'ks_brim', 'ks_dry', 'ks_heavy', 'ks_double', 'ks_bare']; // 10월 18일 0.8.0 5단계(원거리 초안 10절 결정 5): 끊어진 영창(원소술사 제어 K5)을 제어 큰 각인 무너뜨리는 자 바로 앞에 둔다(전에는 목록에 없어 0/80판)
/* 큰 각인 선호 (0.8.0 M4, 10월 19일): 성향별 표 tools/persona/ks-pref.json. order = 표 순서대로(같은 순위 근처는 조금 흔듦), weighted = 순위 가중 무작위, random = 무작위.
   표에 없는 성향(공격적 · 탐험가)은 숙련 표를 쓴다. 옛 KS_PREF 한 줄은 깊은 샘이 1위라 K5 71–97%가 깊은 샘이었다(M3 BD-1) */
const KSP = JSON.parse(fs.readFileSync(path.join(__dirname, 'persona', 'ks-pref.json'), 'utf8'));
function ksPick(key, r, run) {
  const offer = run.ksOffer || []; if (!offer.length) return undefined; const P = KSP[key] || KSP.expert;
  if (P.mode === 'random') return offer[Math.floor(r() * offer.length)];
  const T = G0.ptBuild(run.build); const rank = id => { const i = P.order.indexOf(T.nodes[id].fx); return i < 0 ? P.order.length + 5 : i; };
  if (P.mode === 'weighted') { const w = offer.map(id => 1 / (1 + rank(id))); let x = r() * w.reduce((a, v) => a + v, 0); for (let i = 0; i < offer.length; i++) { x -= w[i]; if (x <= 0) return offer[i]; } return offer[offer.length - 1]; }
  const sc = offer.map(id => [id, rank(id) + r() * 0.5]); return sc.sort((x, y) => x[1] - y[1])[0][0];
}
function ksChoice(pk, r, run) {
  if (OPT.policy?.ksChoice) return OPT.policy.ksChoice(run, r); // M3: 정책 모듈 성향의 큰 각인
  return ksPick(pk, r, run);
}
/* 배분 흐름 시트(옛 세이브 옮기기): 패시브 → 큰 각인 → 액티브를 정책대로 찍고 확정 */
function allocAuto(pk, r, run) {
  for (let k = 0; k < 20 && G0.__G.sheet && G0.__G.sheet.kind === 'alloc'; k++) {
    const st = run.alloc && run.alloc.step; run_('ask = () => true');
    if (st === 'i') click('allocgo'); else if (st === 'p') { spendPassive(pk, r); click('allocnext'); } else if (st === 'k') { G0.ksEnsureOffer(run); click('kspick', ksChoice(pk, r, run)); } else if (st === 'a') { spendTree(pk, r); click('allocok'); } else break;
  }
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
let CUR_OUT = null; // A2 측정: 지금 판의 기록(이벤트 선택)
function restRoom(pk, run, r) {
  if (OPT.policy?.restRoom && OPT.policy.restRoom(run, r)) return;
  const R = run.cur; const p = run.p; const h = p.hp / p.hpMax;
  if (R.type === 'camp' && process.env.DG_UQ && (G0.__G.run.ch || 1) === 1 && !G0.__G.run.uqGiven) { const run = G0.__G.run, it = G0.mkUq(process.env.DG_UQ, 1), U = run_('UNIQUE')[process.env.DG_UQ]; const sl = U.slot === 'ring' ? (run.eqU.ring1 ? 'ring2' : 'ring1') : U.slot; run.inv[it.uid] = it; run.bag.push(it.uid); G0.equipUid(run, it.uid, sl); G0.applyGear(run); run.uqGiven = 1; (run.uqSeen = run.uqSeen || []).push(process.env.DG_UQ); } /* M6-3 고유 존재감: 1챕터 야영지에서 그 고유를 지급해 끼운다(4-2) */
  if (R.type === 'camp') { click('rest'); handleSheets(pk, r); const C = G0.campInit(G0.__G.run); const hx = C.cons.findIndex(x => x.id === 'herb'); if (pk !== 'novice' && hx >= 0) for (let k = 0; k < 3; k++) click('consbuy', String(hx), { s: 'camp' }); return click('campleave'); } // 10월 14일 개편 5단계: 정비 시간
  if (R.type === 'spring') return click('rest');
  if (R.type === 'shrine') return click('shrine', pk === 'novice' ? (r() < 0.5 ? 1 : 0) : 1);
  if (R.type === 'fate') return fatePick(pk, run, r);
  if (R.type === 'altar') {
    const can = R.altar === 'gold' ? (run.gold || 0) >= altarCost(run) : /* 10월 18일: 전에는 40으로 두어 2 · 3챕터(비용이 더 큼)에서 '골드가 모자랍니다'를 되풀이하다 걸음 한도에 걸렸다 */ R.altar === 'offer' ? run.bag.length > 0 : R.altar === 'ash' ? (run.cons || []).filter(c => G0.CONS[c.id].use !== 'none' && G0.CONS[c.id].price > 6).reduce((a, c) => a + c.n, 0) >= 6 : true;
    const want = R.altar === 'blood' || R.altar === 'scale' || R.altar === 'oath' ? (THINK(pk) ? h > 0.6 : r() < 0.5) : can; // A3 맹세는 피 제단처럼 // 3챕터 재의 제단은 태울 것이 넉넉할 때만
    return click('altar', can && want ? 1 : 0);
  }
  if (R.type === 'market') { const M = run_('MARKET'), g = run.gold || 0, S = G0.marketStock(run, R); const k = pk === 'novice' ? null : S.uq && g >= M.uq.gold + 40 ? 'uq-gold' : g >= M.bundle.gold + 20 && r() < 0.6 ? 'bundle' : null; return k ? click('mkbuy', k) : click('mkleave'); } // A2 암시장
  if (R.type === 'smugstall') { const M = run_('SMUG3'), g = run.gold || 0, S = G0.smugStock(run, R); const k = pk === 'novice' ? null : g >= M.hero.gold + 30 ? 'hero-gold' : S.uq.length && g >= M.uq.gold + 30 ? 'uq-0' : g >= M.inner.gold + 20 && !run.dg.inner && r() < 0.3 ? 'inner' : g >= M.info.gold + 20 && r() < 0.15 ? 'info' : null; return k ? click('smbuy', k) : click('smleave'); } // A3 밀수꾼의 좌판
  if (R.type === 'checkpoint') { const g = run.gold || 0, C = run_('CHECK3'); const o = pk === 'novice' ? ['toll', 'refuse', 'sneak'][Math.floor(r() * 3)] : g >= C.toll + 40 && (THINK(pk) || pk === 'careful') && r() < 0.5 ? 'toll' : h > 0.6 && r() < 0.5 ? 'refuse' : 'sneak'; if (CUR_OUT) (CUR_OUT.evLog = CUR_OUT.evLog || []).push({ id: 'checkpoint3', o: o === 'toll' && g < C.toll ? 'sneak' : o }); return click('event', o === 'toll' && g < C.toll ? 'sneak' : o); } // A3 검문소
  if (R.type === 'event') {
    const E0 = G0.EVENTS.find(x => x.id === R.event);
    const ok = E0.opts.filter(o => !G0.ch2EvDis(run, E0, o) && !G0.w3EvDis(run, E0, o) && !((E0.id === 'reliquary' && o.id === 'force' && p.st < 40) || (E0.id === 'buried' && o.id === 'dig' && p.st < 50) || (E0.id === 'monk' && o.id === 'feed' && !(p.flask.life + p.flask.mana + (p.flask.stam || 0)))));
    let o = ok[Math.floor(r() * ok.length)];
    if (THINK(pk) || pk === 'careful') { // 위험한 선택은 생명력이 넉넉할 때만
      const safe = ok.filter(x => !(x.id === 'drink' && h < 0.5) && !(x.id === 'chase' && h < 0.6) && !(x.id === 'do' && h < 0.6) && !(x.id === 'loot' && h < 0.5) && !((E0.ch || 1) >= 3 && ((['pull', 'take', 'dig', 'hasten', 'climb', 'answer', 'drink'].includes(x.id) && h < 0.6) || (x.id === 'draw' && h < 0.7)))); // 3챕터 위험한 선택 (1 · 2챕터 이벤트는 그대로: 종탑의 줄도 id가 pull이다)
      if (safe.length) o = pk === 'careful' ? safe[safe.length - 1] : safe[Math.floor(r() * safe.length)];
    }
    if (CUR_OUT) (CUR_OUT.evLog = CUR_OUT.evLog || []).push({ id: E0.id, o: o.id }); // A2 측정: 이벤트 선택 분포
    return click('event', o.id);
  }
}

const OPT = { snap: false, onStep: null, onTurn: null, chapters: 1, policy: null }; // policy는 기록 기반 시험의 선택 훅. null이면 기존 성향·난수·판단을 그대로 사용한다.
/* 소모품 (0.6a.2, 10월 4일): 사람처럼 상황에 맞는 것을 쓴다(초보는 거의 쓰지 않는다). 한 차례 최대 수는 엔진이 막는다 */
function useCons(pk, r, b, run) {
  if (OPT.policy?.useCons) return OPT.policy.useCons(b, run, r);
  if (!G0.consUse || !G0.CONS || !run.cons || !run.cons.length) return;
  const aware = THINK(pk) ? 0.9 : pk === 'novice' ? 0.15 : 0.5; const p = run.p; const al = G0.alive(b).filter(e => e.role !== 'root'); const sk = (u, k) => (u.s[k] ? u.s[k].stacks : 0);
  const it = (e, ...k) => e.intent && (k.includes(e.intent.k) || (k.includes('aimed') && e.intent.aimed));
  const want = c => { const D = G0.CONS[c.id]; switch (D.k) {
    case 'heal': return c.id === 'herb' ? p.hp < p.hpMax * 0.2 && !p.flask.life : p.hp < p.hpMax * 0.35 && (!p.flask.life || r() < 0.5); // 10월 14일 개편 3단계: 약초는 플라스크 재료라 위급할 때만
    case 'stam': return p.st < 30;
    case 'cure': return sk(p, D.s) >= ({ bleed: 4, poison: 6, ignite: 3, weak: 2, vuln: 2, chill: 1 }[D.s] || 3) || (D.s === 'poison' && sk(p, 'poison') >= 3 && al.some(e => e.foe === 'well' && it(e, 'charge', 'heavy'))); // 2챕터: 우물이 열리기 전에는 중독 3부터 지운다
    case 'interrupt': return (al.some(e => it(e, 'heavy', 'aimed')) && !p.dodge) || al.some(e => it(e, 'noon'));
    case 'blind': return al.some(e => e.row === 'back' && it(e, 'aimed'));
    case 'unevade': { const f = al.filter(e => e.row === 'front'); return f.length > 0 && f.every(e => e.evading); }
    case 'decoy': return al.some(e => e.countering);
    case 'unguard': return al.some(e => e.guarding || e.evading || e.braced);
    case 'unbless': return al.some(e => e.s.empower && it(e, 'attack', 'heavy'));
    case 'noheal': return al.some(e => e.role === 'healer' && it(e, 'heal'));
    case 'hinder': return al.some(e => (e.role === 'healer' && it(e, 'heal')) || (e.role === 'summoner' && it(e, 'summon')));
    case 'cleanse': { const k = G0.consWorst(p); return !!k && sk(p, k) >= 3; }
    case 'nosummon': return al.some(e => e.role === 'summoner' && it(e, 'summon'));
    case 'antisteal': return al.some(e => e.role === 'thief' && it(e, 'steal'));
    case 'sticky': return al.some(e => e.role === 'thief' && it(e, 'flee'));
    case 'aoe': return al.length >= 3 && r() < 0.4;
    case 'dart': return al.some(e => e.row === 'back' && ['healer', 'summoner'].includes(e.role)) && G0.frontBlocked(b) && r() < 0.5;
    case 'brk': return al.some(e => (e.elite || e.strong || e.role === 'boss') && it(e, 'charge', 'heavy'));
    case 'mark': return r() < 0.1;
    case 'guard1': return al.some(e => it(e, 'heavy', 'explode', 'burn')) && p.hp < p.hpMax * 0.6;
    case 'halfboom': return al.some(e => it(e, 'explode', 'burn')) || (b.heatWarn != null && b.heatWarn <= (b.round || 0));
    case 'block': return al.some(e => e.intent && (e.intent.bleed || it(e, 'curse', 'explode', 'burn')));
    case 'unmod': return true;
    case 'escape': return p.hp < p.hpMax * 0.15 && !p.flask.life;
    case 'lootx': return al.length >= 3 && r() < 0.5;
    case 'norise': return al.some(e => e.pile && e.pile.wait <= 1);
    case 'burnpiles': return al.filter(e => e.pile).length >= 2;
    case 'trim': return ['poison', 'bleed', 'ignite', 'weak', 'vuln'].filter(k => sk(p, k) > 0).length >= 2 && al.some(e => e.role === 'hexer' || e.foe === 'knight');
    case 'unearth': return al.some(e => e.under);
    case 'wallbreak': return al.some(e => e.role === 'bonewall') && al.some(e => e.row === 'back' && e.role !== 'bonewall');
    case 'slow': return al.some(e => e.swift || ((e.strong || e.role === 'boss') && it(e, 'charge'))) && r() < 0.5;
    case 'nobloat': return al.some(e => e.role === 'bloat');
    case 'cool': return b.heat != null && (b.heat >= 70 || (b.heatWarn != null && b.heatWarn <= (b.round || 0))); // 3챕터 (10월 7일)
    case 'unhaze': return al.some(e => e.foe === 'dancer' && e.haze >= 1 && it(e, 'charge')) || al.reduce((a, e) => a + (e.haze || 0), 0) >= 3;
    case 'rewind': return al.some(e => (e.foe === 'sundial' && (e.clock || 0) <= 1) || (e.foe === 'colossus' && e.glow >= 2) || (e.foe === 'reaper' && e.embers >= 4) || (e.chant && it(e, 'chanting', 'mchanting')));
    case 'healcure': return (p.hp < p.hpMax * 0.45 && (!p.flask.life || r() < 0.5)) || sk(p, 'ignite') >= 4;
    case 'flare': return !!(b.al && b.al.on && b.al.n < b.al.cap && b.al.next <= (b.round || 0) + 1 && al.length >= 2); // A3
    case 'holyw': return (p.taint || 0) >= 2 || al.some(e => (e.taint || 0) >= 3);
    default: return false; } };
  for (let k = 0; k < 3; k++) { const i = run.cons.findIndex(c => G0.CONS[c.id].use !== 'none' && !G0.consWhyNot(b, run, c, null) && r() < aware && want(c)); if (i < 0) break; G0.consUse(b, run, i, null); if (b.over) break; }
}
function useConsOut(pk, run, r) {
  if (OPT.policy?.useConsOut) return OPT.policy.useConsOut(run, r);
  if (!G0.consUse || !G0.CONS || !run.cons) return; const p = run.p;
  if (G0.consBrew) for (const id of ['herb', 'leaf']) for (let k = 0; k < 6 && (pk !== 'novice' || r() < 0.3); k++) if (G0.consBrew(run, id)) break; // 10월 14일 개편 3단계: 약초 · 각성 잎은 플라스크 재료
  for (let k = 0; k < 6 && p.hp < p.hpMax * 0.6 && (pk !== 'novice' || r() < 0.3); k++) { const i = run.cons.findIndex(c => G0.CONS[c.id].k === 'heal' && !(c.id === 'herb' && G0.consBrewOf && p.flask.life < G0.flaskCap(p, 'life')) && !G0.consWhyNot(null, run, c, null)); if (i < 0) break; G0.consUse(null, run, i, null); } // 약초는 플라스크가 가득 찼을 때만 바로 먹는다
}
const countBy = a => a.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
/* 전투 한 번의 기록 (10월 5일, 목표 7단계 지표: 사망 원인 · 예고 뒤 대응 · 받은 피해 출처 · 행동 종류 · 스킬 사용) */
function fightRec(R, b, run, hpIn, acts) {
  const hits = b.rec.filter(x => x.k === 'hit'); const src = {};
  for (const h of hits) { const k = (h.dot ? 'dot:' : '') + (h.src || 'none') + (h.charged ? ':big' : ''); src[k] = Math.round(((src[k] || 0) + h.d) * 10) / 10; }
  const used = countBy(b.rec.filter(x => x.k === 'act').map(x => x.a));
  const rec = { f: run.room, ch: run.ch || 1, t: R.type, sq: R.squad, foe: R.foe, mods: (R.mods || []).join('+') || undefined, path: R.path, res: b.over, hpIn: Math.round(hpIn * 100), hpOut: Math.round(run.p.hp / run.p.hpMax * 100), net: Math.round(hpIn * 100) - Math.round(run.p.hp / run.p.hpMax * 100), /* 0.8.0 6단계 승인 정정: 순손실 = hpIn − hpOut(최대 생명력 %p)이 주 지표, 총피해(tk)는 보조 */ rounds: b.round || 0, acts, src, used, brk: b.rec.filter(x => x.k === 'break').length, cut: b.rec.filter(x => x.k === 'break' && x.cut).length, blk: b.rec.filter(x => x.k === 'block').length, parried: hits.filter(h => h.parried).length, guarded: hits.filter(h => h.guard).length, cons: b.rec.filter(x => x.k === 'cons').length, big: b.rec.filter(x => x.k === 'bigfire').length, bigNoTurn: b.rec.filter(x => x.k === 'bigfire' && x.gap < 1).map(x => x.role + ':' + x.i + ':' + x.gap) };
  if (b.al) rec.al = { on: b.al.on ? 1 : 0, n: b.al.n, d: b.al.delayed ? 1 : 0 }; // A3 측정: 경보 울림 · 종 표식 늦춤
  if (R.type === 'strong') { const n = k => b.rec.filter(x => x.k === k).length; rec.clk = { doom: n('clkdoom'), warn: n('clkwarn'), back: n('clkback'), add: n('clk') }; } // G-1 측정: 강적 시계(파국 · 마지막 경고 · 되감기 · 칸 더하기 횟수)
  if ((b.ctx.ch || 1) === 3) { const dl = b.rec.filter(x => x.k === 'dealt'); rec.dl = Math.round(dl.reduce((a, x) => a + x.d, 0)); rec.pa = b.rec.filter(x => x.k === 'act').length; rec.hp3 = b.en.filter(e => (!e.elite || e.strong) && !e.tough && !e.summoned && !['bonfire', 'rampart', 'brick', 'barricade'].includes(e.role)).map(e => [e.role === 'boss' ? e.boss : e.foe || e.role, Math.round(e.hpMax), e.strong ? 1 : 0, Math.round(e.asRaw || 0), Math.round(e.asReal || 0)]); } // A3 측정: 타수 표(체력 ÷ 행동 하나의 피해)
  if (b.armCut || b.rec.some(x => x.k === 'shieldBlk')) { const dl = b.rec.filter(x => x.k === 'dealt'); rec.as = { cut: Math.round(b.armCut || 0), blk: b.rec.filter(x => x.k === 'shieldBlk').reduce((a, x) => a + (x.n || 1), 0), dealt: Math.round(dl.reduce((a, x) => a + x.d, 0)), pa: b.rec.filter(x => x.k === 'act').length }; } // A3 측정: 갑옷 · 방패가 더한 타수
  if (b.mkTr) { rec.mkTr = b.mkTr; const C = b.rec.filter(x => x.k === 'ctr'); rec.mkCtr = C.length; rec.mkCtrD = Math.round(C.reduce((a, x) => a + (x.d || 0), 0)); } // M5-2: 되받기 횟수 · 피해(MK_TRACE)
  if (BUILDLOG && b.actDmg) rec.actDmg = b.actDmg;
  if (b.p.build === 'assassin' && b.asBursts && process.env.AS_TRACE) rec.asB = b.asBursts;
  if (b.p.build === 'hunter') rec.hn5 = { lf: b.hnLf || 0, lfD: Math.round(b.hnLfD || 0), turns: b.turnIdx || 0, after: b.hnAfterC || {}, y0: hits.filter(h => h.y0).length }; // M5-4: 연계 빠른 행동 수 · 몫 · 연계 뒤 주 행동 · 유산 0으로 맞음 // M5-3: 터뜨린 중독 크기(설계지 6-0 터뜨림 분포)
  if (b.p.build === 'elementalist') { const F = b.rec.filter(x => x.k === 'freeze'), C2 = countBy(b.rec.filter(x => x.k === 'ch2').map(x => x.a)), SH = b.rec.filter(x => x.k === 'shock'); rec.el5 = { frz: F.filter(x => !x.big).length, frzBig: F.filter(x => x.big).length, shock: SH.length, shockD: Math.round(SH.reduce((a, x) => a + (x.dmg || 0), 0)), ch2: C2, turns: b.turnIdx || 0 }; } // M5-5: 빙결 · 열충격 수, 둔화 2인 적 앞의 고르기(얼리기 · 깨기 · 열충격)
  if (process.env.DG_LOGBOSS && R.type === 'boss') rec.log = b.log.map(x => x.m); // 보스전 로그(조사용)
  if (BUILDLOG) { const en = b.en.filter(e => e.role !== 'root'); rec.nEn = en.length; rec.nBack = en.filter(e => e.row === 'back').length; rec.nBig = en.filter(e => e.elite || e.role === 'boss' || e.strong || e.big).length; } // M5-0 보정 5 상황 표(무리 · 거구 · 후열)
  { const y = G0.ysSum ? G0.ysSum(b) : null; if (y) rec.ys = { sp: y.sp, use: y.use, w: y.w, g: Object.values(y.ch || {}).reduce((a, v) => a + v, 0), ch: y.ch }; } // M4: ch = 충전 출처별 든 양(차례 · 대응 이유 · 통로 각인 · 환급 · 장비) // 0.8.0 6단계 유산 리듬: 비용별 횟수 · 쓴 합 · 상한에 막힌 양(넘침) · 든 양
  rec.tk = b.damageStats ? Math.round(100 * b.damageStats.taken / b.p.hpMax) : null; // 0.8.0 6단계: 총피해(회복 전 받은 피해 합, 최대 생명력 %) 보조 지표
  if (b.p.build === 'warden') { const gw = b.log.map(x => /방패를 세운다\. 보호막 \+(\d+)/.exec(x.m || '')).filter(Boolean).map(m => +m[1]); const S = b.wdS || []; const dir = hits.filter(h => !h.dot);
    rec.wd = { g: gw.length, gw: gw.reduce((a, v) => a + v, 0), held: Math.round(b.rec.filter(x => x.k === 'held').reduce((a, x) => a + (x.n || 0), 0) * 10) / 10, gHit: dir.filter(h => h.guard).length, gTaken: Math.round(dir.filter(h => h.guard).reduce((a, h) => a + h.d, 0) * 10) / 10, oHit: dir.filter(h => !h.guard).length, oTaken: Math.round(dir.filter(h => !h.guard).reduce((a, h) => a + h.d, 0) * 10) / 10, turns: S.length, half: S.filter(v => v >= 50).length, hpMax: b.p.hpMax, wil: G0.stat ? G0.stat(b.p, 'wil') : null, ng: (b.wdSG || []).length, ngW: (b.wdSG || []).reduce((s, x) => s + x[0], 0), ngP: (b.wdSG || []).reduce((s, x) => s + x[1], 0) }; } // 0.8.0 5단계 방어 측정(2-10): 방어 횟수 · 방어 보호막 합 · 받아낸 몫 · 방어 중/아닐 때 받은 직접 피해 · 보호막 상한 50% 이상인 내 차례
  if (b.p.build === 'hunter') { const dl = b.rec.filter(x => x.k === 'dealt' && !x.dot && !x.bank); const hb = b.rec.filter(x => x.k === 'hnb'); const bf = b.rec.filter(x => x.k === 'bbuf'); const by = w => countBy(bf.filter(x => x.w === w).map(x => x.s)); const sum = a => Math.round(a.reduce((m, x) => m + (x.d || 0), 0) * 10) / 10;
    const end = {}; for (const [k, v] of Object.entries(b.p.bbuf || {})) if (!v.used && v.until >= (b.ysR || 0)) end[k] = 1;
    rec.hn = { all: sum(dl), basic: sum(dl.filter(x => x.a === '기본 공격')), x2: sum(dl.filter(x => x.x2)), x2basic: sum(dl.filter(x => x.x2 && x.a === '기본 공격')), bbHit: hb.length, bbD: sum(hb), xtra: Math.round(hb.reduce((m, x) => m + (x.x || 0), 0) * 10) / 10, on: by('on'), use: by('use'), waste: by('waste'), re: by('re'), end, link: b.rec.filter(x => x.k === 'ysdisc' && /^hu_link/.test(x.by || '')).length }; } // 0.8.0 5단계 측정(원거리 초안 2-9의 9 · 10, 2-10): 직접 피해 · 기본 공격 피해 · 가속의 두 번째 차례 피해 · 버프 켬/씀/버림/다시 걺/끝에 남음 · 연계 할인
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
/* 0.8.0 A1 1챕터 장치 판단: 기도하는 적이 있으면 그 적을 붕괴가 큰 행동(없으면 한 적 공격)으로 친다. 장치가 있는 전투에서만 난수를 쓴다 */
function devPre(b, P, r) {
  const pr = b.prayer && !b.prayer.done && G0.alive(b).find(e => e.id === b.prayer.id); if (!pr || r() >= (P.mech || 0.5) + 0.2) return null;
  const L = G0.actionList(b).filter(x => x.ok && !x.self && x.id !== 'flee' && G0.canTarget(b, pr, x));
  const brkOf = x => x.id === 'heavy' ? 35 : x.v2 ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
  const c = L.filter(x => brkOf(x) > 0).sort((x, y) => brkOf(y) - brkOf(x))[0] || L.find(x => x.v2 && !x.aoe && x.s.fx.some(f => f.k === 'dmg')) || L.find(x => x.id === 'basic');
  return c ? [c.id, c.aoe ? null : pr.id] : null;
}
/* 0.8.0 A2 2챕터 판단: 거래창 · 빚 갚기 · 등불 기름 · 바르도의 등불(칩과 카드를 보고 할 만한 것만). 2챕터 전투에서만 난수를 쓴다 */
function streetPre(b, P, r) {
  if (!G0.isCh2(b)) return null; const L = G0.actionList(b); const p = b.p, al = G0.alive(b);
  if (b.trade === 'ask' && L.some(x => x.id === 'tradeyes')) return [!IGN.includes('merchant') && (p.hp < p.hpMax * 0.5 || r() < 0.3) ? 'tradeyes' : 'tradeno', null]; // G-1: 상인을 무시한 판은 거래(답)를 받지 않는다
  /* G-1: 빚 갚기는 시계(clockPre)로 답한다 */
  const oil = L.find(x => x.id === 'lampoil' && x.ok); if (oil && !(IGN.includes('lampthief') && al.some(e => e.foe === 'lampthief')) && (al.some(e => e.foe === 'lampthief' && e.under) || b.ctx.boss || al.some(e => e.strong)) && r() < (P.mech || 0.5) + 0.2) return ['lampoil', null];
  const lamps = al.filter(e => e.role === 'lantern'), lamp = lamps.find(e => e.lit && !e.last); if (lamp && lamps.filter(e => e.lit).length >= 4 && !al.some(e => e.boss === 'bardo' && e.intent && e.intent.k === 'relight') && r() < (P.mech || 0.5) + 0.1) { /* 켜진 등불이 많을 때만 깨고, 다시 켜는 사이에는 바르도를 친다 */ const A = L.filter(x => x.ok && !x.self && x.id !== 'flee' && G0.canTarget(b, lamp, x)); const brkOf = x => x.id === 'heavy' ? 35 : x.v2 ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0; const c = A.filter(x => brkOf(x) > 0).sort((x, y) => brkOf(y) - brkOf(x))[0]; if (c) return [c.id, c.aoe ? null : lamp.id]; }
  return null;
}
/* 0.8.0 M7-1 신중 성향의 예고 답하기(A1 답 ①, 10월 22일): 내 다음 차례 전에 강적 · 보스의 큰 한 방(아이콘 hv · 피해 숫자 있음)이 오면
   ① 이 행동으로 그 적의 붕괴 게이지를 채울 수 있으면 붕괴 행동 ② 한 적만 노리는 공격이면 흘리기 ③ 아니면 방어. 사람의 실수 몫으로 ANS_P(0.95)만큼만.
   기믹 대상: 1챕터 큰 종(종지기가 있으면 종부터 친다). 봉화 · 부품 · 벽돌 · 종 표식은 w3Pre, 등불은 streetPre, 기도는 devPre, 수도사는 아래 대상 바꾸기(신중 0.9) */
const ANS_P = 0.95; const ANS_PART = process.env.ANS_PART ? process.env.ANS_PART.split(',') : ['ans']; // M7-1: 예고 답하기(ans)만 기본. 큰 종(bell) · 수도사 0.9(monk)는 갈라보기에서 손해라 스위치로만(보고서 M7-1 2절)
const brkOfA = x => x.id === 'heavy' ? 35 : x.v2 ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
function bigIncoming(b) {
  const pv = G0.previewAfter(b, 1).map(x => x.e); const out = [];
  for (const e of pv) { if (!e || !e.alive || !(e.strong || e.role === 'boss') || !e.intent) continue; const F = G0.foeDef(b, e), A = F && F.ans && F.ans[e.intent.k]; if (A && !A.some(x => x === 'guard' || x === 'parry')) continue; /* M7-1: 방어 · 흘리기로 받는 예고만(조준 · 장전 같은 준비는 숫자가 있어도 뺀다) */ const bd = G0.intentBadge(b, e); if (bd && bd.cls === 'hv' && +String(bd.num).replace(/[^\d.]/g, '') > 0 && !out.includes(e)) out.push(e); }
  return out;
}
function answerPick(b, e, L) { // 끊기 → 흘리기 → 방어
  const br = L.filter(x => !x.self && G0.canTarget(b, e, x) && brkOfA(x) > 0 && e.brk + brkOfA(x) * (1 + 0.01 * (G0.stat ? G0.stat(b.p, 'str') : 0)) >= e.brkMax).sort((x, y) => brkOfA(y) - brkOfA(x))[0];
  if (br) return [br.id, br.aoe ? null : e.id];
  const single = !(e.intent && (e.intent.aoe || ['firerain', 'taintwave'].includes(e.intent.k)));
  const dg = L.find(x => x.id === 'dodge'); if (single && dg && G0.canTarget(b, e, dg)) return ['dodge', e.id];
  const A = e.intent && (G0.foeDef(b, e) || {}).ans, ak = A && A[e.intent.k]; // G-1: 방어가 대답이 아닌 예고(공성추 발사 · 한 발)에는 방어를 고르지 않는다
  if ((!ak || ak.includes('guard')) && L.find(x => x.id === 'guard')) return ['guard', null];
  return null;
}
const ANS_DEF = ['parry', 'parryBuff', 'guard', 'ward', 'wardFill', 'dodge', 'stance', 'protect', 'evade', 'block'];
/* 고른 행동이 이미 대응인가: 방어 · 흘리기 · 방어 스킬(보호막 · 보호 · 태세 · 흘리기 류) · 그 적을 이 행동으로 끊는 붕괴 */
function answered(b, e, a, t) {
  if (a === 'guard' || a === 'dodge') return true; const act = G0.actionList(b).find(x => x.id === a); if (!act) return false;
  if (act.v2 && act.s && act.s.fx.some(f => ANS_DEF.includes(f.k) || (f.k === 'st' && ['protect', 'block'].includes(f.s)))) return true;
  return (t === e.id || act.aoe) && brkOfA(act) > 0 && e.brk + brkOfA(act) >= e.brkMax;
}
/* M7-1 예고 답하기: 테스터가 원래대로 고른 행동이 대응이 아닐 때만 끊기 → 흘리기 → 방어로 바꾼다(직업의 더 나은 대응은 그대로 둔다) */
function answerPost(b, P, r, pk, a, t) {
  if (pk !== 'careful' || process.env.ANS_OFF || !ANS_PART.includes('ans')) return [a, t]; const big = bigIncoming(b); if (!big.length) return [a, t];
  const e = big.sort((x, y) => (y.brk / y.brkMax) - (x.brk / x.brkMax))[0]; if (answered(b, e, a, t) || r() >= ANS_P) return [a, t];
  const x = answerPick(b, e, G0.actionList(b).filter(y => y.ok && y.id !== 'flee')); return x || [a, t];
}
let BELL_EV = null, BELL_CLK = null;
function answerPre(b, P, r, pk) { // 기믹 대상: 1챕터 큰 종(다음 라운드에 울리거나 반쯤 깨졌을 때)
  if (pk !== 'careful' || process.env.ANS_OFF || (BELL_CLK != null ? BELL_CLK : (BELL_CLK = run_('typeof FOE_CLOCK !== "undefined" && !!FOE_CLOCK.bellringer')))) return null; /* G-1: 종지기는 시계(clockPre)로 답한다 */ const L = G0.actionList(b).filter(x => x.ok && x.id !== 'flee');
  const bell = G0.alive(b).find(e => e.bell) && G0.alive(b).find(e => e.foe === 'bellringer');
  const bl0 = bell && G0.alive(b).find(e => e.bell); const ringNext = bell && ((b.tick || 0) + 1) % (BELL_EV != null ? BELL_EV : (BELL_EV = run_('STRONG.bellEvery') || 3)) === 0; // 종은 다음 라운드에 울리거나 반쯤 깨졌을 때만(매 차례 치면 오히려 손해, M7-1 갈라보기)
  if (ANS_PART.includes('bell') && bell && (ringNext || bl0.hp < bl0.hpMax * 0.5) && r() < 0.9) { const bl = bl0; const c = L.filter(x => !x.self && G0.canTarget(b, bl, x) && (x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s.fx.some(f => f.k === 'dmg')))).sort((x, y) => (y.v2 ? 1 : 0) - (x.v2 ? 1 : 0))[0]; if (c) return [c.id, c.aoe ? null : bl.id]; }
  return null;
}
/* M7-1(10월 22일): 무시 시험에서 기믹 물체를 일찍 부수러 가면 오히려 손해(수비대장 27.5% 대 무시 99%)라, 곧 터질 봉화(칸 1) · 곧 날아올 공성추(75%) · 마지막 벽돌만 부순다 */
/* 0.8.0 A3 3챕터 판단(사람이 화면을 보고 할 만한 것만): 틈 막기 · 종 표식 · 봉화 · 부품 · 벽돌 · 조준하는 명사수 · 벽돌을 쌓는 루를 붕괴로. 3챕터 전투에서만 난수를 쓴다 */
const W3O = ['bonfire', 'rampart', 'brick', 'barricade']; const W3OFF = (process.env.W3PRE_OFF || '').split(','); // M7-1 조사 스위치: mk(조준하는 명사수 무너뜨리기)
function w3Pre(b, P, r, pk) {
  if (!G0.isW3(b)) return null; const al = G0.alive(b); const L = () => G0.actionList(b).filter(x => x.ok && x.id !== 'flee');
  const brkOf = x => x.id === 'heavy' ? 35 : x.v2 ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk : 0), 0) : 0;
  const brkOn = (e, min) => { const c = L().filter(x => !x.self && G0.canTarget(b, e, x) && brkOf(x) >= (min || 1)).sort((x, y) => brkOf(y) - brkOf(x))[0]; return c ? [c.id, c.aoe ? null : e.id] : null; };
  const m = (P.mech || 0.5);
  if ((b.ctx.mods || []).includes('rift') && !b.riftSealed && (b.round || 0) <= 2 && r() < m + 0.2) { const s = L().find(x => x.id === 'sealrift'); if (s) return ['sealrift', null]; }
  const clk = (pk === 'careful' || pk === 'expert') && al.some(e => e.strong && e.clk); // G-1 2판: 신중 · 숙련은 시계 강적 방에서 봉화 · 벽돌 · 명사수를 시계(clockPre)로만 답한다
  const fire = !clk && al.filter(e => e.role === 'bonfire').sort((x, y) => x.fuse - y.fuse)[0]; if (fire && fire.fuse <= 1 && r() < m + 0.2) { const a = brkOn(fire); if (a) return a; }
  const bricks = clk ? [] : al.filter(e => e.role === 'brick'), brick = bricks[0]; if (brick && bricks.length <= 1 && r() < m + 0.3) { const a = brkOn(brick); if (a) return a; }
  const mk = !clk && al.find(e => e.foe === 'marksman' && e.intent && ['aimx', 'oneshot'].includes(e.intent.k)); if (mk && !W3OFF.includes('mk') && r() < m + 0.2) { const a = brkOn(mk, 15); if (a) return a; }
  const lu = al.find(e => e.boss === 'lu' && e.intent && e.intent.k === 'rebuild'); if (lu && r() < m + 0.2) { const a = brkOn(lu, 15); if (a) return a; }
  const bm = b.al && b.al.on && !b.al.delayed && al.find(e => e.id === b.bellMark); if (bm && bm.brk + 35 >= bm.brkMax && r() < m) { const a = brkOn(bm, 20); if (a) return a; }
  return null;
}
let OLD3V = null; const old3On = () => (OLD3V == null ? (OLD3V = !!run_('OLD3')) : OLD3V);
/* 3챕터 판단 (10월 7일, 비공개 문서의 테스터 판단 가운데 사람이 화면을 보고 할 만한 것만). 3챕터 전투에서만 난수를 쓴다: 1 · 2챕터 측정은 그대로다 */
function ch3Pre(b, P, r) {
  if (!(((b.ctx && b.ctx.ch) || 1) >= 3) || !old3On()) return null; // A3: 옛 재의 사막 판단은 OLD3일 때만
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
/* 무시 시험(M3, 10월 19일): DG_IGNORE=<기믹 키>[,…]. 키 = 강적 id(foe) 또는 보스 id. 행동을 고르는 동안만 그 적의 예고를 평범한 공격으로 보이게 하고,
   고른 뒤 그대로 되돌린다(게임 상태는 바뀌지 않는다). 그 기믹을 모르는 사람이 얼마나 지는지 잰다 */
const IGN = (process.env.DG_IGNORE || '').split(',').filter(Boolean);
const BUILDLOG = !!process.env.DG_BUILDLOG; // M3: 빌드 표(tools/buildmix.js)용 기록을 더한다. 끄면 결과 파일은 그대로
const IGN_OBJ = { beaconlord: 'bonfire', siege: 'rampart', wallcap: 'brick', bardo: 'lantern' }; // M7-1: 무시한 강적 · 보스의 기믹 물체도 고르는 동안 가린다(큰 종과 같은 방식)
function maskIgn(b) { const saved = []; const objR = IGN.map(k => IGN_OBJ[k]).filter(Boolean); const hid = b.en.filter(e => e.alive && ((IGN.includes('bellringer') && e.bell) || objR.includes(e.role)) && b.en.some(o => o.alive && !o.bell && !objR.includes(o.role) && o.role !== 'root')); for (const e of hid) e.alive = false; /* A1: 종지기를 무시하면 큰 종도 노리지 않는다 */ for (const e of b.en) { if (!e.alive || !(IGN.includes(e.foe) || IGN.includes(e.boss) || IGN.includes(e.bossKind))) continue; saved.push([e, e.intent]); if (e.intent && e.intent.k !== 'attack') e.intent = Object.assign({}, e.intent, { k: 'attack' }); } return () => { for (const [e, it] of saved) e.intent = it; for (const e of hid) e.alive = true; }; }
/* 0.8.0 M5-0 보정(10월 20일 만든 사람): 마검사 성향 전부. 이어진 교대(sbRun ≥ 1) 중이면 리듬 칸(비용 1)을 쓰지 않고 교대를 잇는 행동을 쓴다.
   직전이 주문이면 기본 공격(안 되면 강공격), 직전이 베기면 쓸 수 있는 비용 2 이상 주문. 이을 행동이 없으면 그대로 둔다(비용 1은 교대를 끊지도 잇지도 않는다).
   유산이 상한이라는 이유만으로 리듬 칸을 고르지 않는다(전에 있던 상한 판단은 뺐다) */
function sbRhythmGate(b, a, t) {
  const p = b.p; if (p.build !== 'spellblade' || !((p.sbRun || 0) >= 1) || !p.sbLast) return null;
  const L = G0.actionList(b); const act = L.find(x => x.id === a); if (!act || !act.v2 || !act.s || G0.skCost(act.s) !== 1) return null;
  const alt = p.sbLast === 'spell' ? (L.find(x => x.id === 'basic' && x.ok) || L.find(x => x.id === 'heavy' && x.ok)) : L.find(x => x.ok && x.v2 && x.s && x.s.kind === 'spell' && G0.skCost(x.s) >= 2);
  if (!alt) return null; if (alt.s && alt.s.tgt === 'self') return [alt.id, null];
  const e0 = b.en.find(e => e.id === t); const tt = e0 && e0.alive && G0.canTarget(b, e0, alt) ? t : (G0.alive(b).find(e => G0.canTarget(b, e, alt)) || {}).id;
  return tt ? [alt.id, tt] : null;
}
/* 0.8.0 G-1 강적 시계(js/25): 신중 · 숙련은 시계를 읽고 답한다 — 칸이 한 칸 남았으면(경고) 그 라운드 답을 먼저, 답이 여럿이면 가진 수단 중 가장 싼 것.
   강적마다 답 고르기는 tools/persona/clock-ch1~3.js({ 강적 id: (b, e, G0, r) => [행동, 대상] | null }). 무시(DG_IGNORE)한 강적은 보지 않는다 */
const CLOCK_ANS = Object.assign({}, ...[1, 2, 3].map(n => { try { return require('./persona/clock-ch' + n + '.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; return {}; } }));
const CLOCK_AHEAD = Math.max(1, +(process.env.CLOCK_AHEAD || 1)); // G-1 갈라보기: 2면 한 칸 일찍(마지막 경고 한 칸 전부터) 답한다
const CLOCK_PKS = (process.env.CLOCK_PK || 'careful,expert,casual').split(','); // 시계를 읽는 성향(G-2 만든 사람 결정 10월 24일: 대충은 마지막 경고에 절반만 반응)
const CLOCK_P = { casual: process.env.CLOCK_CASUAL_P != null ? +process.env.CLOCK_CASUAL_P : 0.5 }; // 성향별 반응 확률(없으면 1). 경고 한 번에 한 번만 굴린다
function clockPre(b, P, r, pk) {
  if (!CLOCK_PKS.includes(pk) || process.env.CLOCK_OFF) return null;
  for (const e of G0.alive(b)) { const C = e.clk; if (!C || C.perm || IGN.includes(e.foe) || !CLOCK_ANS[e.foe] || C.n < C.max - CLOCK_AHEAD) continue; const p = CLOCK_P[pk] != null ? CLOCK_P[pk] : 1; if (p < 1) { if (!C.reactD || C.reactD.w !== C.warnN) C.reactD = { w: C.warnN, ok: r() < p }; if (!C.reactD.ok) continue; } const x = CLOCK_ANS[e.foe](b, e, G0, r); if (x) return x; }
  return null;
}
function fightCur(pk, r, mem, out) {
  const P = PERSONAS[pk]; const G = G0.__G;
  { const run0 = G.run, R0 = run0.cur; if (R0 && (run0.ch || 1) === 2 && (R0.mods || []).includes('dark') && (run0.oil || 0) > 0 && pk !== 'novice' && (THINK(pk) || pk === 'careful' || ['strong', 'ambush'].includes(R0.type) || r() < 0.6)) { run0.oil--; R0.lit = 1; out.oilUse = (out.oilUse || 0) + 1; } } // A2 어두운 방은 기름이 있으면 대개 밝힌다
  G0.enterRoom(); for (let k = 0; !G.b && G.sheet && k < 4; k++) { handleSheets(pk, r); G0.enterRoom(); } // M5-0: 전투 중 저장본을 이어 한 뒤 받을 큰 각인이 남았으면 enterRoom이 고르기 창을 먼저 연다
  const b = G.b; b.stepMode = false; let n = 0; let stall = 0, lastHp = Infinity; let stuckN = 0;
  // 10월 5일: 전투 난수를 테스터 판단 난수와 나눈다(판단 규칙 하나를 바꿔도 전투 운은 그대로 남아 비교가 깨끗하다). LEGACY_RNG=1이면 예전처럼 같은 난수
  b.rngF = process.env.LEGACY_RNG ? r : rng(((out.seed || 1) * 7919 + (G.run.room || 0) * 131 + (G.run.ch || 1) * 100003 + (out.acts || 0)) | 0);
  if (OPT.policy?.battleStart) OPT.policy.battleStart(b, G.run);
  if (process.env.PN_OFF) { const off = process.env.PN_OFF.split(','); b.p.pn = (b.p.pn || []).filter(k => !off.includes(k)); } // 0.8.0 5단계 측정 변형: 이 전투에서 끌 노드 효과(예: PN_OFF=n_wd_held,n_wd_will). 찍기 · 길은 그대로
  while (!b.over && n++ < 300) {
    useCons(pk, r, b, G.run); if (b.over) break;
    const unIgn = IGN.length ? maskIgn(b) : null;
    let a, t;
    if (OPT.policy?.chooseAction) {
      [a, t] = OPT.policy.chooseAction(b, G.run, n);
    } else {
    const sr = r() < (P.mech || 0.5) ? sigRule(b, r) : null;
    const ck = clockPre(b, P, r, pk); // G-1: 시계 답을 골랐으면 예고 답하기(answerPost)가 덮지 않는다
    [a, t] = ck || answerPre(b, P, r, pk) || devPre(b, P, r) || streetPre(b, P, r) || ch2Pre(b, P, r) || w3Pre(b, P, r, pk) || ch3Pre(b, P, r) || sr || (P.look && hazePick(b)) || (P.look ? lookahead(b, P, r) : heuristic(b, P, r, mem)); // 0.8.0 5단계: 숙련의 신기루 대응(수도승)
    [a, t] = ch2Post(b, P, r, a, t);
    if (!ck) [a, t] = answerPost(b, P, r, pk, a, t); // M7-1 신중 성향 예고 답하기
    // 보스를 깎지 못한 채 버티기만 하면 사람은 밀어붙인다 (한 수 앞만 보는 계산이 페이즈 전환을 피하는 것을 막는다)
    const bs = b.en.find(e => e.role === 'boss' && e.alive);
    if (bs) { if (bs.hp < lastHp - 0.5) stall = 0; else stall++; lastHp = bs.hp;
      if (stall >= 3 && b.p.hp > b.p.hpMax * 0.5 && ['guard', 'dodge', 'sig'].includes(a)) { const L = G0.actionList(b).filter(x => x.ok && !x.pull && !['guard', 'dodge', 'flee', 'flaskL', 'flaskM', 'flaskS', 'sig'].includes(x.id)); if (L.length) { a = L[Math.floor(r() * L.length)].id; t = null; } } }
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[0].id; t = null; }
    if (P.look && r() < P.err) { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[Math.floor(r() * L.length)].id; t = null; }
    else if (r() < (THINK(pk) || (pk === 'careful' && !process.env.ANS_OFF && ANS_PART.includes('monk')) ? 0.9 : P.healerFirst)) { // 보스전 기믹에 사람이 하는 대응 (비공개 문서). M7-1: 신중도 0.9
      const act = G0.actionList(b).find(x => x.id === a); const monk = G0.alive(b).filter(e => e.monk && act && G0.canTarget(b, e, act)).sort((x, y) => (y.role === 'healer') - (x.role === 'healer'))[0];
      if (monk && act && act.tgt !== false && !(b.p.build === 'assassin' && !process.env.ASN_PARRY_OLD && (a === 'dodge' || (act.s && act.s.fx.some(f => f.k === 'parry'))))) t = monk.id; /* 암살자(10월 8일): 흘리기는 공격하는 적에게 건다. 치유 수도사로 바꾸면 흘리기가 엉뚱한 적에게 걸린다(출처: 비공개 문서 보스, 암살자 그림자 칸). ASN_PARRY_OLD=1이면 끈다 */
    }
    if (stuckN >= 2 && !process.env.NO_STUCK_FIX) { const Lk = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); const gd = Lk.find(x => x.id === 'guard') || Lk[0]; if (gd) { a = gd.id; t = null; } } /* 10월 8일: 같은 행동을 해도 차례가 흐르지 않으면(땅속의 적만 남고 단일 대상 행동뿐일 때) 사람처럼 방어로 차례를 넘긴다 */
    }
    if (OPT.policy?.filterAction) { const x = OPT.policy.filterAction(b, G.run, a, t, n); if (x) [a, t] = x; } // M4: 정책 모듈이 고른 행동의 일부만 바꾼다(평타 성향: 공격 행동만)
    { const g = sbRhythmGate(b, a, t); if (g) { [a, t] = g; if (BUILDLOG) out.rhGate = (out.rhGate || 0) + 1; } } // M5-0 보정: 마검사 리듬 칸은 이어진 교대를 끊지 않을 때만
    if (unIgn) unIgn();
    if (OPT.onTurn) OPT.onTurn(G, n);
    if (process.env.MK_TRACE && b.p.build === 'monk') (b.mkTr = b.mkTr || []).push([a, G0.st(b.p, 'empower'), b.p.ys, b.turnIdx]); // 0.8.0 5단계: 수도승 행동 · 기 · 유산 흐름(행동 직전)
    if (b.p.build === 'warden' && b.wdT !== b.turnIdx && G0.wardMax) { b.wdT = b.turnIdx; (b.wdS = b.wdS || []).push(Math.round(100 * (b.p.ward || 0) / Math.max(1, G0.wardMax(b.p)))); if (b.wdGd) { b.wdGd = 0; (b.wdSG = b.wdSG || []).push([Math.round(b.p.ward || 0), Math.round(100 * (b.p.ward || 0) / Math.max(1, G0.wardMax(b.p)))]); } } // 보조 지표(10월 17일): 방어한 다음 내 차례의 보호막(값 · 상한 %)
    if (b.p.build === 'warden' && a === 'guard') b.wdGd = 1; // 0.8.0 5단계: 내 차례 첫 행동 때 보호막 / 상한(%)
    const progKey = b.turnIdx + ':' + (b.round || 0) + ':' + b.log.length;
    const dl0 = BUILDLOG && b.damageStats ? b.damageStats.dealt : 0; const bx0 = b.asBasicX || 0; const hT0 = b.turnIdx, hL0 = b.hnLinkT === b.turnIdx ? (b.hnLinkN || 0) : 0; // M5-4 연계 빠른 행동 기록
    if (b.p.build === 'hunter' && b.hnPend === b.turnIdx) { b.hnPend = null; const k = ['basic', 'guard'].includes(a) ? a : a === 'dodge' ? 'guard' : (G0.SK2[a] ? 'skill' : 'other'); (b.hnAfterC = b.hnAfterC || {})[k] = (b.hnAfterC[k] || 0) + 1; }
    try { G0.playerAct(b, a, t); } catch (e) { if (process.env.DG_STACK) console.error(e.stack); out.bugs.push('예외 ' + e.message + ' @' + a); failOf(out, 'exception', { msg: String(e.message).slice(0, 200), act: a, room: G.run.room, ch: G.run.ch || 1 }); b.over = 'lose'; }
    if (BUILDLOG && b.damageStats) { const k = a; const bx = Math.min(b.damageStats.dealt - dl0, (b.asBasicX || 0) - bx0); (b.actDmg = b.actDmg || {})[k] = Math.round(((b.actDmg[k] || 0) + b.damageStats.dealt - dl0 - (k !== 'basic' && bx > 0 ? bx : 0)) * 10) / 10; if (k !== 'basic' && bx > 0) b.actDmg.basic = Math.round(((b.actDmg.basic || 0) + bx) * 10) / 10; } // M5-3: 흘려 베기 반격 · 칼춤은 기본 공격(판정 ①)이라 평타 몫으로 // M3 빌드 표: 행동별 준 피해(DG_BUILDLOG=1일 때만 기록)
    if (b.p.build === 'hunter' && b.hnLinkT === hT0 && (b.hnLinkN || 0) > hL0) { b.hnLf = (b.hnLf || 0) + 1; if (b.damageStats) b.hnLfD = (b.hnLfD || 0) + b.damageStats.dealt - dl0; b.hnPend = hT0; }
    stuckN = progKey === b.turnIdx + ':' + (b.round || 0) + ':' + b.log.length ? stuckN + 1 : 0;
    out.acts++;
    if (OPT.policy?.afterAction) OPT.policy.afterAction(b, G.run, a, t);
  }
  if (!b.over) { out.bugs.push('300행동 안에 끝나지 않음 ' + G.run.room); failOf(out, 'actcap', { room: G.run.room, ch: G.run.ch || 1, t: (G.run.cur || {}).type, rounds: b.round || 0, acted: b.rec.filter(x => x.k === 'act').length, stuck: stuckN }); /* acted: 실제로 받아들여진 행동 수(300보다 훨씬 적으면 멈춤), stuck: 끝에 이어진 '차례가 흐르지 않은 행동' 수 */ b.over = 'lose'; }
  if (OPT.policy?.battleEnd) OPT.policy.battleEnd(b, G.run);
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
/* 재현성 (10월 17일 0.8.0 4단계 재검증): 판을 만들기 전에 게임 안의 난수와 시계를 시드로 고정한다.
   startRun은 run.seed = Date.now() % 100000을 쓰고, 큰 각인 제시 순서(ksCands의 ksHash)가 이 값을 읽는다. 시계를 그대로 두면 같은 시드 · 같은 정책이어도
   판을 돌린 시각에 따라 큰 각인 제시가 달라져 트리 · 장착 · 전투가 갈렸다(같은 시드 두 번 돌리기에서 1챕터부터 판의 29%, 3챕터 시작 판의 100%가 달랐다).
   게임 안 시계는 시드에서 나온 값부터 부를 때마다 1ms씩 간다(장비 uid · 기록 시각도 이 시계). DG_REALCLOCK=1이면 예전처럼 실제 시각 */
function seedWorld(seed) {
  G0.__rnd = rng(seed * 31 + 7); run_('Math.random = __rnd');
  if (process.env.DG_REALCLOCK) { run_('if (globalThis.__realNow) Date.now = __realNow'); return; }
  const h = (Math.imul((seed | 0) ^ 0x9e3779b9, 2654435761) >>> 0) % 100000; G0.__t0 = 1767225600000 + h; // 1767225600000은 100000의 배수라 run.seed = h + (startRun 전까지 부른 수)
  run_('if (!globalThis.__realNow) globalThis.__realNow = Date.now; { let t = __t0; Date.now = () => t++; }');
}
/* 정책 모듈 성향 (M3, 10월 19일): PERSONAS에 없는 이름. 판단은 모듈(tools/persona/<이름>.js)이 하고, 모듈이 덮지 않는 판단(문 · 상점 · 이벤트)은 신중으로 돈다.
   기록의 성향 이름만 그 이름이다. 기존 성향의 결과는 그대로 */
const PERSONA_MOD = { basic: './persona/basic.js' };
function playChar(pk, build, seed) {
  if (!PERSONA_MOD[pk]) return playChar0(pk, build, seed);
  const prev = OPT.policy, prevId = OPT.polId; OPT.policy = require(PERSONA_MOD[pk])(module.exports, G0); OPT.polId = 'persona:' + pk;
  try { OPT.persona = pk; const o = playChar0('careful', build, seed); o.pk = pk; if (o.meta) o.meta.pk = pk; return o; } finally { OPT.policy = prev; OPT.polId = prevId; OPT.persona = null; }
}
function playChar0(pk, build, seed) {
  const P = PERSONAS[pk]; const r = rng(seed);
  seedWorld(seed);
  const G = G0.__G;
  G.data = G0.blankData(); G.data.seenFoe = { abbot: 1, bellringer: 1, pilgrim: 1 }; G.data.seenBoss = { abbot: 1 }; G.data.seenCoach = true; G.data.unlAll = 1; /* 숨겨진 직업도 고를 수 있게(어느 직업을 잴지는 DG_LOCK이 정한다) */
  G.cre = { name: 'qa' }; G.dropQ = []; G.b = null; G.sheet = null;
  if (process.env.MODE === 'hard') { G0.__G.data.hardOpen = 1; G0.__G.cre = { mode: 'hard' }; } /* 10월 8일: MODE=hard이면 가혹으로 만든다 */
  if (MARKCH) G0.__G.cre = Object.assign(G0.__G.cre || {}, { mark: { ch: MARKCH, ids: MARK_IDS, mode: process.env.MODE === 'hard' ? 'hard' : 'normal' } }); /* 표식 도전: 화면과 같은 startRun 안의 markSetup이 레벨 · 꾸러미 · 표식을 정한다 */
  G0.startRun(build);
  const run = G.run; if (OPT.persona) run.persona = OPT.persona;
  if (run.offer) { run.seed = (seed * 7919 + 17) % 100000; delete run.offer; run_('atOfferInit')(run); } /* M5-0 보정 5 P4: 제시는 판 시드로(같은 시드 = 같은 제시) */ G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run';
  delete run.alloc; // 10월 16일 0.8.0 2단계: 만들기 배분 흐름 대신 정책으로 바로 찍는다(능력치 = 시작 노드 + 패시브 노드)
  spendPassive(pk, r); while (run.ksPending > 0) { G0.ksEnsureOffer(run); if (!run.ksOffer) break; G0.ksTake(run, ksChoice(pk, r, run)); spendPassive(pk, r); } spendTree(pk, r); G0.treeSync(run); run.p.hp = run.p.hpMax; run.p.mp = run.p.mpMax; run.p.st = run.p.stMax;
  if (OPT.policy?.start) OPT.policy.start(run, r);
  const out = { pk, build, seed, res: 'lose', floor: 0, lv: 1, rooms: [], bossHp: null, bugs: [], acts: 0, fights: [] }; CUR_OUT = out;
  out.meta = MM.rowMeta(REV, { seed, pk, build, from: FROM, chapters: OPT.chapters, variant: OPT.variant, pol: OPT.polId });
  if (MARKCH) { out.marks = (run.marks || []).slice(); out.markCh = run.markCh; out.markPts = run.markPts || 0; }
  if (FROM > 1 && !MARKCH) jumpTo(pk, r, FROM);
  return playLoop(pk, r, out);
}
/* DG_FROM=3 (10월 7일): 앞 챕터를 깬 캐릭터를 흉내 내 그 챕터 1층에서 시작한다. AI가 2챕터를 거의 깨지 못해(완주 0~3%) 3챕터를 재려면 따로 세운다.
   레벨은 챕터 시작 레벨(2챕터 Lv5, 3챕터 Lv10, 기획서 11.4), 능력치는 추천 배분, 트리는 성향대로, 장비는 앞 챕터 장비(슬롯마다 고급, 무기 · 갑옷은 희귀), 소모품 약초 셋과 무작위 셋, 생명력 · 플라스크 가득 */
const MARKCH = +(process.env.MARKCH || 0); const MARK_IDS = (process.env.MARKS || '').split(',').filter(Boolean); /* 표식 도전(10월 8일): MARKCH=2|3 챕터에서 새 캐릭터로 시작(엔진 startRun이 G.cre.mark로 만든다), MARKS=표식 id 쉼표. 표식 없이 MARKCH만 주면 같은 시작의 대조군 */
const FROM = +(process.env.DG_FROM || process.env.MARKCH || 1);
function jumpTo(pk, r, ch) {
  const G = G0.__G, run = G.run; const lv = ch >= 3 ? 11 : 6; // 10월 16일 0.8.0 2단계: 새 곡선의 챕터 끝 레벨(Lv6 · Lv11)
  if (process.env.DG_JUMP === 'chrono' && run.ptree) { /* 10월 17일 4단계 재검증: 레벨을 하나씩 올리며(gainXp) 그때 열린 고리에만 찍고, 앞 챕터 보스를 이긴 레벨(Lv6 · Lv11)에 깬 챕터 +1 · 정산 큰 각인(그 레벨 포인트는 고리가 열린 뒤). 기본(없음)은 Lv를 한 번에 올리고 고리를 모두 연 채 찍는다 */
    const clrAt = [6, 11].slice(0, ch - 1);
    for (let L = 2; L <= lv; L++) { G0.gainXp(run, G0.LV_XP_[L - 1] - (run.xp || 0)); const c = clrAt.indexOf(L) + 1;
      if (c) { run.clears = c; run.ch = c; spendPassive(pk, r); if (G0.ksGrant(run, 'b' + c)) { G0.ksEnsureOffer(run); if (run.ksOffer) G0.ksTake(run, ksChoice(pk, r, run)); } }
      spendTree(pk, r); }
    G0.treeSync(run);
  } else { run.lv = lv; run.xp = G0.LV_XP_[lv - 1]; run.p.lv = lv; run.clears = ch - 1; G0.ptFix(run); G0.treeSync(run); }
  G0.initGear(run);
  for (const sl of ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2']) {
    const kind = sl === 'ring1' || sl === 'ring2' ? 'ring' : sl; const g = sl === 'weapon' || sl === 'armor' ? 'r' : 'm';
    if (g8On()) { const it = G0.g8Gen(run, { slot: kind, g, ch: ch - 1, own: true, noUq: true }); run.inv[it.uid] = it; run.bag.push(it.uid); G0.equipUid(run, it.uid, sl); continue; } /* 0.8.0 M6-2 */
    const owned = Object.values(run.inv).map(x => x.tpl); const pool = G0.poolOf(ch - 1).filter(k => G0.ITEMS[k] && G0.ITEMS[k].kind !== 'start' && G0.tplKind(k) === kind && G0.poolOk_(run.p, k) && !owned.includes(k));
    const fit = pool.filter(k => G0.itemFits(run.p, k) && (G0.ITEMS[k].g || 'n') === g); const any = pool.filter(k => (G0.ITEMS[k].g || 'n') === g); const L = fit.length ? fit : any.length ? any : pool; if (!L.length) continue;
    const it = G0.mkItem(L[Math.floor(r() * L.length)], { ch: ch - 1 }); run.inv[it.uid] = it; run.bag.push(it.uid); G0.equipUid(run, it.uid, sl);
  }
  for (const k of (process.env.DG_GIVE || '').split(',').filter(Boolean)) { const kind = G0.tplKind(k); const sl = kind === 'ring' ? 'ring2' : kind; const it = G0.mkItem(k, { ch }); run.inv[it.uid] = it; run.bag.push(it.uid); G0.equipUid(run, it.uid, sl); } // 통제 시험(DG_GIVE=장비id,…): 정한 장비를 처음부터 끼워 같은 씨앗의 안 낀 판과 짝지어 잰다(장비마다 효과 재기, 선택 편향 없음)
  for (const u of run.bag.slice()) G0.discardUid(run, u); // 뺀 시작 장비는 버린다
  const ids = Object.keys(G0.CONS).filter(k => (G0.CONS[k].ch || 1) < ch && G0.CONS[k].use !== 'none'); G0.consAdd(run, 'herb', 'n', 3); for (let k = 0; k < 3; k++) G0.consAdd(run, ids[Math.floor(r() * ids.length)], 'n', 1);
  G0.applyGear(run); run.p.hp = run.p.hpMax; run.p.st = run.p.stMax; run.p.flask.life = run.p.flaskMax; run.p.flask.mana = run.p.flaskMax; run.p.flask.stam = run.p.flaskMax; run.gold = 0;
  if (process.env.DG_KIT === 'game') { /* 0.8.0 6단계 C-3: 게임의 챕터 시작 꾸러미(MARK_KIT)로 시작한다. 무기 · 갑옷은 셋 가운데 장비 점수가 가장 높은 것. 그다음 앞 챕터 정산 뒤 상점에서 테스터의 상점 정책대로 산다(자연 판과 같은 자리) */
    for (const u of Object.values(run.eqU || {})) if (u) G0.discardUid(run, u); G0.initGear(run); run.cons = []; G0.markKit(run, ch); run.markShop = 0;
    for (const sl of ['weapon', 'armor']) { const o = run.kitPick && run.kitPick.opts[sl]; if (!o || !o.tpl.length) continue; const sc = tpl => { if (o.its) return g8Val(run, o.its[tpl]); /* 0.8.0 M6-2 */ const it = G0.mkItem(tpl, { g: o.g, ch: ch - 1 }); run.inv[it.uid] = it; const v = gearScore(G0.simEquip(run, it.uid, sl)); delete run.inv[it.uid]; return v; }; const best = o.tpl.slice().sort((a, b) => sc(b) - sc(a))[0]; G0.kitPick(sl, best); }
    run.kitPick = null; G0.applyGear(run); run.p.hp = run.p.hpMax; run.p.st = run.p.stMax;
    const c0 = run.ch; run.ch = ch - 1; G0.genShop(run); run.phase = 'shop'; G0.__G.scr = 'shop'; shopPhase(pk, r); run.ch = c0; run.shop = null; run.phase = null; G0.__G.scr = 'run'; G0.__G.sheet = null; }
  if (process.env.DG_JUMP !== 'chrono' && !process.env.KS_ACT_OLD) { run.ch = ch - 1; spendTree(pk, r); G0.treeSync(run); } /* 10월 18일 0.8.0 5단계(원거리 초안 10절 결정 4): 큰 각인 제시가 연 액티브 스킬(유산 4가 있는가)을 보므로, 앞 챕터를 깬 캐릭터처럼 액티브를 먼저 찍고 정산 큰 각인을 받는다. 전에는 Lv1에 찍은 2점만 연 채 받았다. KS_ACT_OLD=1이면 예전 순서 */
  for (let c = 1; c < ch; c++) { run.ch = c; spendPassive(pk, r); if (G0.ksGrant(run, 'b' + c)) { G0.ksEnsureOffer(run); if (run.ksOffer) G0.ksTake(run, ksChoice(pk, r, run)); } } /* 정산 뒤의 큰 각인 (앞 챕터를 깬 캐릭터 흉내) */
  spendPassive(pk, r); spendTree(pk, r); G0.treeSync(run); G0.applyGear(run); run.p.hp = run.p.hpMax; run.p.st = run.p.stMax;
  run.ch = ch - 1; run.phase = 'wait'; G0.enterChapter(run);
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
    const it = run.inv[res.it.uid]; const n8 = F8('isG8')(it); const kind = G0.tplKind(it.tpl); const sl = n8 ? g8SlotOf(run, it) : kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind;
    const d = n8 ? g8Delta(run, it, sl) : gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p)); const hl = it.g === 'h' || it.g === 'l'; const why = G0.equipWhy(run, it.uid, sl);
    if (!why && ((hl && d > -10) || d > 0.5)) { G0.equipUid(run, it.uid, sl); G0.applyGear(run); }
  }
}
/* 상점: 끼우면 나아지는 장비를 골드 안에서 산다. 신중·숙련·탐험가는 가장 나은 것부터, 나머지는 무작위로 */
const altarCost = run => { try { return run_('altarGold')(run); } catch (e) { return 40; } }; // 골드 제단 비용(챕터마다 다름)은 게임 값을 읽는다
function shopPhase(pk, r) {
  if (OPT.policy?.shop) return OPT.policy.shop(G0.__G.run, r);
  const G = G0.__G, run = G.run, S = run.shop; if (!S) return;
  const delta = it => { if (F8('isG8')(it)) { const sl = g8SlotOf(run, it); return { sl, d: g8Delta(run, it, sl) }; } /* 0.8.0 M6-2 */ const kind = G0.tplKind(it.tpl); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind; const had = !!run.inv[it.uid]; run.inv[it.uid] = it; const d = gearScore(G0.simEquip(run, it.uid, sl)) - gearScore(G0.gearStats(run.p)); if (!had) delete run.inv[it.uid]; return { d: d + (G0.classFit(run.p, it.tpl) && G0.ITEMS[it.tpl].act ? 2 : 0), sl }; };
  for (let n = 0; n < 6; n++) {
    const opts = S.stock.map((x, i) => Object.assign({ i }, x)).filter(o => !o.sold && o.price <= (run.gold || 0) && (G0.bagUsed ? G0.bagUsed(run) : run.bag.length) < (G0.BAG_MAX || 12)).map(o => Object.assign(o, delta(o.it))).map(o => (o.it.g === 'h' && (o.d += 4), o)).filter(o => o.d > 0.5); /* 영웅 칸: 효과가 크다고 보고 더 친다 */
    if (!opts.length) break;
    const o = THINK(pk) || pk === 'careful' ? opts.sort((a, b) => b.d - a.d)[0] : opts[Math.floor(r() * opts.length)];
    click('buy', o.i); const uid = o.it.uid; if (run.bag.includes(uid)) G0.equipUid(run, uid, o.sl);
    G0.applyGear(run);
  }
  gamblePhase(pk, r);
  g8RerollPhase(pk, r, run); G0.applyGear(run);
}
/* 0.6a.2 트리: 포인트가 있으면 성향대로 연다. 숙련·탐험가·신중은 한 갈래에 몰고(깊은 칸), 나머지는 아무 칸이나.
   연 스킬은 빈칸에 끼우고, 칸이 차면 가장 낮은 등급과 바꾼다 */
const TIER_N = { 기본: 0, 하급: 0, 중급: 1, 상급: 2, 궁극: 3 };
const ROWN = s => s.row || TIER_N[s.tier] + 1; // 0.6a.2 사다리: 줄이 깊을수록 높다
/* 숨겨진 직업 3의 주 경로 (C5): 줄마다 연다. BM_VAR=1이면 역병 · 혈약은 다섯째 칸으로 포식 1줄 왼쪽(피 거두기)을 연다(변형 판) */
const BM_PATH = { 역병: ['v_spill', 'v_host', 'v_gust', 'v_marsh', 'v_veil', 'v_carry', 'v_vector', 'v_pollen', 'v_black', 'v_pandemic'], 포식: ['v_reap', 'v_plant', 'v_replant', 'v_nibble', 'v_swarm', 'v_supper', 'v_deepreap', 'v_gather', 'v_teat', 'v_hunger'], 혈약: ['v_spear', 'v_cut', 'v_thorn', 'v_heart', 'v_oath', 'v_rupture', 'v_impale', 'v_covenant', 'v_burstheart', 'v_last'] };
/* 숨겨진 직업 3 보스 장착 (비공개 문서 D3 "대안 장착은 측정에서 주 장착이 보스 50%에 못 미칠 때 먼저 본다" · F4-10 "보스는 붕괴 칸 하나, 약화 비례 · 퍼뜨리기는 약화를 거는 칸과 짝").
   실제 세기(수도원장 ×10 · 지하묘지 군주 ×10, 장비 없음)에서 주 경로(역병 오른쪽 퍼뜨리기 · 혈약 왼쪽 붕괴)는 보스를 거의 못 이긴다: 1챕터 혈약 0% · 역병 47%, 2챕터 역병 0%.
   문서의 대안 기둥(역병 독 안개 · 핏빛 안개 쪽, 혈약 약화 쪽)과 짝 규칙으로 고른 경로 · 장착이다. BM_LOAD_OLD=1이면 예전 경로 · 장착 */
const BM_PATH2 = { 역병: ['v_fog', 'v_mist', 'v_host', 'v_gust', 'v_marsh', 'v_veil', 'v_choke', 'v_cloud', 'v_pollen', 'v_black', 'v_rotland'], 혈약: ['v_curse', 'v_cut', 'v_fervor', 'v_creep', 'v_oath', 'v_fade', 'v_offering', 'v_covenant', 'v_witherall', 'v_pact'] };
function bmLoad(run, br) {
  if (process.env.BM_LOAD_OLD || run.build !== 'bloodmage' || (run.ch || 1) >= 3) return null; const open = run.atree.own;
  const pref = br === '혈약' ? (open.includes('v_fade') ? ['v_curse', 'v_creep', 'v_fade', 'v_covenant', 'v_oath'] : ['v_curse', 'v_cut', 'v_fervor', 'v_oath', 'v_creep']) : br === '역병' ? ['v_fog', 'v_mist', 'v_host', 'v_cloud', 'v_veil', 'v_gust', 'v_marsh'] : null;
  if (!pref) return null; const eq = pref.filter(id => open.includes(id)).slice(0, G0.EQUIP_SLOTS2);
  for (const id of open.slice().sort((a, b) => ROWN(G0.SK2[b]) - ROWN(G0.SK2[a]))) { if (eq.length >= G0.EQUIP_SLOTS2) break; if (!eq.includes(id)) eq.push(id); }
  return eq;
}
/* 암살자 격발 장착 (10월 9일, docs/직업/암살자.md D-2 격발 "가장 위협이 큰 적 하나에 심고, 강타 예고가 뜨면 붕괴 칸으로 끊은 뒤 터뜨린다", C-5 격발 장착, F-2 "독을 쓰는 칸을 끼웠으면 독을 거는 칸도 하나는 끼운다").
   테스터는 연 칸 가운데 줄이 깊은 넷을 끼워서 독 사냥 · 거두기 · 급소 터뜨리기처럼 독이 있어야 크게 때리는 칸만 남고, 독을 거는 칸도 큰 적용 터뜨리기(독 격발 · 터뜨리는 일격)도 빠졌다.
   심고(독을 거는 칸: 중독 5 이상, 터뜨리기가 아닌 것, 쿨타임이 짧은 것 먼저) · 끊고(붕괴 칸: 무너뜨리는 독 · 붕괴 독침 · 끊어 내기 · 붕괴 뇌관, 줄이 깊은 것) · 터뜨리는(터뜨리기 칸 가운데 큰 적 배수가 있는 것, 줄이 깊은 것 둘) 넷으로 채운다.
   실제 세기 재의 여왕 · 지하묘지의 군주(장비 없음)에서 같은 연 칸으로 테스터 장착은 0~50%, 이 장착은 87~100%다(근거: docs/직업/암살자.md F-5 10월 9일). 난수를 쓰지 않는다. ASN_LOAD_OLD=1이면 끈다 */
function asnLoad(run, eq) {
  if (process.env.ASN_LOAD_OLD || run.build !== 'assassin' || run.focus !== '격발') return;
  const S = id => G0.SK2[id]; const has = (id, f) => S(id).fx.some(f); const open = run.atree.own.slice();
  const src = id => has(id, e => e.k === 'poison' && e.n >= 5) && !has(id, e => e.k === 'burst');
  const brk = id => has(id, e => e.k === 'brkPer' || (e.k === 'brk' && e.n >= 50) || e.k === 'cutx') && !has(id, e => e.k === 'burst');
  const bur = id => has(id, e => e.k === 'burst') && has(id, e => e.k === 'bigx');
  const pick = [];
  const add = (ids) => { for (const id of ids) { if (pick.length >= G0.EQUIP_SLOTS2) break; if (!pick.includes(id)) pick.push(id); } };
  add(open.filter(src).sort((a, c) => S(a).cd - S(c).cd || S(c).fx.find(e => e.k === 'poison').n - S(a).fx.find(e => e.k === 'poison').n).slice(0, 1));
  add(open.filter(brk).sort((a, c) => ROWN(S(c)) - ROWN(S(a))).slice(0, 1));
  add(open.filter(bur).sort((a, c) => ROWN(S(c)) - ROWN(S(a))).slice(0, 2));
  add(eq.slice().sort((a, c) => ROWN(S(c)) - ROWN(S(a)))); // 빈 칸은 지금 끼운 칸 가운데 줄이 깊은 것으로
  add(open.slice().sort((a, c) => ROWN(S(c)) - ROWN(S(a))));
  eq.length = 0; eq.push(...pick);
}
function bmPathNext(run, br) {
  if (!process.env.BM_LOAD_OLD && BM_PATH2[br]) { for (const id of BM_PATH2[br]) if (!run.atree.own.includes(id)) return G0.SK2[id] && !G0.atWhy(run, id) ? G0.SK2[id] : null; return null; }
  const L = (BM_PATH[br] || []).slice(); if (process.env.BM_VAR && br !== '포식' && run.atree.own.length === 4 && !run.atree.own.includes('v_reap')) return G0.SK2.v_reap && !G0.atWhy(run, 'v_reap') ? G0.SK2.v_reap : null;
  for (const id of L) if (!run.atree.own.includes(id)) return G0.SK2[id] && !G0.atWhy(run, id) ? G0.SK2[id] : null;
  return null;
}
function spendTree(pk, r) {
  if (OPT.policy?.spendTree) return OPT.policy.spendTree(G0.__G.run, r);
  const G = G0.__G, run = G.run; spendPassive(pk, r); if (!run.atree || !(run.atree.pts > 0)) return; // 10월 16일 0.8.0 2단계: 패시브를 먼저 찍고 액티브
  const A = G0.atBuild(run.build); const T = G0.TREE2[run.build];
  run.focus = run.focus || (process.env.FOCUS && T.branches.includes(process.env.FOCUS) ? process.env.FOCUS : T.branches[Math.floor(r() * T.branches.length)]); // FOCUS=갈래 이름으로 고정해 잴 수 있다
  if (!A.tmp) return spendTreeUp(pk, r, run, A);
  const all = G0.SKILLS2[run.build].filter(s => A.nodes[s.id]); // 임시 트리: 지금 사다리 그대로라 옛 정책을 그대로 쓴다
  for (let n = 0; n < 20 && run.atree.pts > 0; n++) {
    const can = all.filter(s => !G0.atWhy(run, s.id));
    if (!can.length) break;
    const focus = THINK(pk) || pk === 'careful';
    let br = run.focus; if (run.build === 'hunter' && focus) { if (br === '기동') br = run.focus = r() < 0.5 ? '저격' : '연사'; const opened = b0 => run.atree.own.filter(id => (G0.SK2[id] || {}).b === b0).length; br = opened('기동') <= opened(run.focus) ? '기동' : run.focus; } // 사냥꾼(10월 5일): 피해 갈래 하나와 기동을 번갈아 (한 갈래를 몰아 찍으면 오히려 약하다)
    let pool = focus ? (can.filter(s => s.b === br).length ? can.filter(s => s.b === br) : can) : can;
    if (run.build === 'assassin' && focus && br === '그림자' && !process.env.SH_RANDOM) { /* 암살자 그림자(10월 8일): 왼쪽 기둥(피해 칸)만 내려간다 */ const lp = pool.filter(s => all.filter(x => x.b === s.b && x.row === s.row)[0] === s); if (lp.length) pool = lp; }
    if (run.build === 'elementalist' && focus && br === '공명' && !process.env.ELEM_PATH_OLD) { /* 원소술사 공명(10월 9일): 왼쪽 엮기 기둥만 */ const lp = pool.filter(s => all.filter(x => x.b === s.b && x.row === s.row)[0] === s); if (lp.length) pool = lp; }
    const root = focus && !(run.build === 'hunter' && !process.env.HUNT_ROOT_OLD) ? pool.filter(x => ROWN(x) === 1 && x.b === br) : [];
    const bmS = run.build === 'bloodmage' && focus ? bmPathNext(run, br) : null;
    const s = bmS ? bmS : root.length ? root[0] : focus ? pool.sort((x, y) => ROWN(y) - ROWN(x) || r() - 0.5)[0] : pool[Math.floor(r() * pool.length)];
    if (G0.atBuy(run, s.id)) break;
    const eq = run.skills.filter(x => x !== s.id); // atBuy가 빈 칸에 끼운 것은 빼고 옛 규칙으로 다시 끼운다
    if (eq.length < G0.EQUIP_SLOTS2) eq.push(s.id);
    else {
      const keepEv = run.build === 'hunter' && process.env.HUNT_DODGE ? (id => { const k = G0.SK2[id]; return k.fx.some(e => e.k === 'evade') && !k.once; }) : null;
      const cand = eq.map((id, i) => [i, ROWN(G0.SK2[id])]).filter(x => !(keepEv && keepEv(eq[x[0]]) && eq.filter(keepEv).length === 1 && !keepEv(s.id)));
      const lo = (cand.length ? cand : eq.map((id, i) => [i, ROWN(G0.SK2[id])])).sort((x, y) => x[1] - y[1])[0]; if (lo[1] < ROWN(s) || r() < 0.3) eq[lo[0]] = s.id; }
    { const bl = focus ? bmLoad(run, br) : null; if (bl) { eq.length = 0; eq.push(...bl); } }
    asnLoad(run, eq);
    run.skills = eq; G0.atSync(run);
  }
}
/* 강화 노드가 있는 트리(마검사): 주 갈래의 스킬과, 끼운 스킬의 강화를 먼저. 4칸은 강화가 많이 붙은 스킬 · 깊은 고리부터, ⚔ · ✦를 하나 이상씩 */
/* 0.8.0 5단계 측정 도구 보완 1 (10월 17일): [전환] 강화(빠르기 · 대상 · 타수를 바꾸는 강화)는 손해가 함께 온다. 전에는 장착 스킬의 강화로 점수 5를 받아 먼저 찍혔다
   (수도승 깊은 호흡: 기 모으기가 주 행동이 됨). 이제 (1) 빠르게 바뀌면 빠른 칸을 다툴 빠른 스킬이 장착에 둘 이상(시작 스킬 포함) 있을 때 손해,
   (2) 빠른 칸을 잃으면(빠름 → 보통 · 느림) 한 차례 값이 30% 넘게 올라야, (3) 그 밖에는 5% 넘게 올라야 이득으로 본다(skeval perTurn, 그 스킬의 다른 강화를 낀 채).
   이득이면 다른 노드보다 뒤(점수 0.3 + 고리), 손해면 찍지 않는다. 신중 · 숙련만 판단하고 초보는 예전처럼. CONV_OLD=1이면 예전 점수 */
const CONV_K = ['time', 'tgt', 'hits'];
const isConv = nd => nd.kind === 'upgrade' && !!(nd.mod && ((nd.mod.set && CONV_K.some(k => k in nd.mod.set)) || nd.mod.conv)); // 10월 18일 0.8.0 5단계 암살자: set 없는 [전환](둔한 독 · 끓는 피 · 독 묻은 칼막이)은 데이터의 conv 표시로 안다
function convGain(run, nd) {
  const base = G0.SK2[nd.on], set = nd.mod.set || {};
  if (set.time === 'fast' && base.time !== 'fast') { const fastN = G0.v2Equip(run).filter(id => id !== nd.on && ((G0.skOf(run.p, id) || {}).time === 'fast')).length; if (fastN >= 2) return false; }
  const ups = SKE.upsOf(run, nd.on); const a = SKE.evalSkill(SKE.pFor(run, nd.on, ups), nd.on), c = SKE.evalSkill(SKE.pFor(run, nd.on, ups.concat([nd.id])), nd.on); if (!a || !c) return false;
  const need = base.time === 'fast' && set.time && set.time !== 'fast' ? 1.3 : 1.05;
  return c.perTurn > 0 && c.perTurn >= Math.max(0, a.perTurn) * need;
}
/* 0.8.0 M5-0 목표 부채꼴 (10월 19일): 부채꼴 트리(A.sec)가 있는 직업은 판을 시작할 때 목표 부채꼴 하나를 정한다(tools/persona/sector-pref.json, DG_SECTOR가 먼저).
   갈래 목표 = 그 갈래에 집중(예전 focus). 경계 목표 = 양쪽 갈래의 1고리 개시 노드 → 경계 입구 → 경계 3고리, 남는 포인트는 양쪽 갈래.
   반반(XX_HALF) = 양쪽 갈래에 반씩, 경계 칸은 찍지 않는다(경계 가치 비교용) */
const SECP = JSON.parse(fs.readFileSync(path.join(__dirname, 'persona', 'sector-pref.json'), 'utf8'));
/* 0.8.0 M5-0c 길 고정(10월 20일): DG_PATH=B:a — 목표 부채꼴을 그 갈래로 두고, 그 갈래의 다른 길 칸(스킬과 그 변형 자리)은 찍지 않는다. 리듬 칸 · 다른 부채꼴은 평소대로 */
const PATHSW = (process.env.DG_PATH || '').split(':'); const pathBan = A => PATHSW[1] ? Object.keys(A.nodes).filter(id => { const n = A.nodes[id], k = n.slot ? A.nodes[n.on] : n; return k && k.sec === PATHSW[0] && k.path && k.path !== PATHSW[1]; }) : [];
function sectorPick(pk, r, run, A) {
  if (run.sector) return run.sector; const env = process.env.DG_SECTOR || (PATHSW[1] ? PATHSW[0] : ''); const keys = Object.keys(A.sec);
  if (env) run.sector = env; else { const P = SECP[run.persona || pk] || SECP.careful; if (P.mode === 'fixed') run.sector = P.sec; else if (P.mode === 'random') run.sector = keys[Math.floor(r() * keys.length)]; else { const w = keys.map(k => (P.w || {})[k] != null ? P.w[k] : 1); let x = r() * w.reduce((a, v) => a + v, 0); run.sector = keys[keys.length - 1]; for (let i = 0; i < keys.length; i++) { x -= w[i]; if (x <= 0) { run.sector = keys[i]; break; } } } }
  return run.sector;
}
const secAdj = s => s.replace('_HALF', '').length === 2 ? s.replace('_HALF', '').split('') : [s]; // 경계 AB → 갈래 A · B
function secScore(run, A, id) {
  const S = run.sector, nd = A.nodes[id]; if (!S) return 0; const half = /_HALF$/.test(S), base = S.replace('_HALF', ''), adj = secAdj(S), bound = base.length === 2;
  if (!bound) return nd.sec === base ? 10 : 0;
  if (half) return nd.sec === base ? -50 : adj.includes(nd.sec) ? 8 : 0;
  const entry = Object.values(A.nodes).find(x => x.sec === base && x.requires); if (entry && entry.requires.flat().includes(id)) return 14; // 보정 5: 갈래마다 첫 스킬 둘 중 어느 쪽이든
  /* M5-0 보정 4: 경계 목표는 입구 → 둘째 → 3고리 둘 → 승부수 순, 경계 강화는 그 뒤(아래 점수에 고리 × 0.5가 더해진다) */
  if (nd.sec === base) return nd.kind === 'upgrade' ? 8 : nd.ys === 4 ? 10.5 : nd.ring === 3 ? 12.5 : 14.5; // 차이를 성향 난수(신중 · 숙련 1)보다 크게
  return adj.includes(nd.sec) ? 5 : 0;
}
/* M5-0 보정 5 P3: 결합 칸은 꼬리표가 맞아 찍을 수 있게 되면 목표 부채꼴보다 먼저(만든 사람 결정 10월 20일, 처음에는 9점으로 목표 다음이었다) */
const comboScore = (A, id) => A.nodes[id] && A.nodes[id].reqTags ? 30 : null;
/* M5-0 보정 5: 변형 자리를 열 때 고를 변형(v2Pick). 평타 성향은 기본 공격 연동 > 싣기 꼬리표 먼저, 다른 성향은 제시된 것 가운데 판 난수로 */
function varPick(run, A, slot, pk, r) { const off = run_('atVarsOffered')(run, slot); if (!off.length) return undefined; const V = run_('atBuild')(run.build).vars;
  if ((run.persona || pk) === 'basic') { for (const tg of ['기본공격연동', '싣기']) { const c = off.find(v => (V[v].tags || []).includes(tg)); if (c) return c; } }
  return off[Math.floor(r() * off.length)]; }
const atBuyV = (run, A, id, pk, r) => G0.atBuy(run, id, A.nodes[id] && A.nodes[id].slot ? varPick(run, A, id, pk, r) : undefined);
function spendTreeUp(pk, r, run, A) {
  const focus = THINK(pk) || pk === 'careful'; const convJudge = !process.env.CONV_OLD && pk !== 'novice';
  if (A.sec) sectorPick(pk, r, run, A);
  for (let n = 0; n < 20 && run.atree.pts > 0; n++) {
    const ban = (process.env.BAN_UP || '').split(',').filter(Boolean).concat(A.sec ? pathBan(A) : []), force = (process.env.FORCE_UP || '').split(',').filter(Boolean); // 0.8.0 5단계 측정 변형: 찍지 않을 · 먼저 찍을 액티브 노드(같은 포인트 예산)
    const can = Object.keys(A.nodes).filter(id => !G0.atWhy(run, id) && !ban.includes(id)); if (!can.length) break;
    const eqd = G0.v2Equip(run);
    { const fz = can.find(id => force.includes(id) && eqd.includes(A.nodes[id].on)); if (fz) { if (atBuyV(run, A, fz, pk, r)) break; sbEquip(run, A); continue; } }
    const cv = {}; const convOk = id => (id in cv ? cv[id] : (cv[id] = !!(eqd.includes(A.nodes[id].on) && convGain(run, A.nodes[id])))); // 결정적 판단(난수를 쓰지 않는다)
    const sc = id => { const nd = A.nodes[id]; const rr = r() * (pk === 'novice' ? 20 : 1); if (convJudge && isConv(nd)) return convOk(id) ? 0.3 + nd.ring * 0.1 + rr * 0.1 : -1; let v = comboScore(A, id) != null ? comboScore(A, id) : (A.sec ? (focus || process.env.DG_SECTOR || PATHSW[1] ? secScore(run, A, id) : 0) : (focus && nd.br === run.focus ? 10 : 0)) + nd.ring * 0.5; v += nd.kind === 'skill' ? ((run.skills || []).length < G0.EQUIP_SLOTS2 ? 4 : 1) : (eqd.includes(nd.on) ? 5 : 0.5); if (A.sec && run.sector && (focus || process.env.DG_SECTOR || PATHSW[1]) && /^[A-C]{2}$/.test(run.sector) && nd.sec === run.sector) v = 100 + secScore(run, A, id) + nd.ring * 0.5; /* M5-0 보정 4: 경계 목표의 경계 칸은 순서 점수만(입구 → 둘째 → 3고리 둘 → 승부수 → 강화) */ return v + rr; }; // 난수는 예전과 같이 부를 때마다 한 번
    const id = can.sort((a, b) => sc(b) - sc(a))[0]; if (convJudge && isConv(A.nodes[id]) && !convOk(id)) break; if (atBuyV(run, A, id, pk, r)) break;
    sbEquip(run, A);
  }
}
/* 10월 17일 측정 도구 보완: 장착 점수는 강화를 반영한 실제 스킬의 한 차례 값(tools/skeval.js: skScore · 실제 유산 · 조건부 할인 · 처치 환급) + 주 갈래 1.5.
   전에는 강화 수 × 2 + 고리 + 주 갈래 1.5였다(강화가 스킬을 얼마나 바꾸는지 · 유산 비용을 보지 않았다). EQUIP_OLD=1이면 예전 점수 */
function sbEquipScore(run, A) {
  const foc = id => (A.sec && run.sector ? (A.nodes[id].sec === run.sector.replace('_HALF', '') && !/_HALF$/.test(run.sector) ? 1.5 : secAdj(run.sector).includes(A.nodes[id].sec) ? 0.75 : 0) : A.nodes[id].br === run.focus ? 1.5 : 0); // M5-0: 목표 부채꼴
  if (process.env.EQUIP_OLD) { const ups = id => run.atree.own.filter(u => A.nodes[u].on === id).length; return id => ups(id) * 2 + A.nodes[id].ring + foc(id); }
  const m = {}; return id => (m[id] != null ? m[id] : (m[id] = SKE.evalRun(run, id).perTurn + foc(id)));
}
function sbEquip(run, A) {
  const own = run.atree.own.filter(id => A.nodes[id].kind === 'skill');
  const sc = sbEquipScore(run, A);
  let eq = own.slice().sort((a, b) => sc(b) - sc(a)).slice(0, G0.EQUIP_SLOTS2);
  if (A.sec && run.sector) { const tg = run.sector.replace('_HALF', ''), half = /_HALF$/.test(run.sector), adj = secAdj(run.sector), bound = tg.length === 2; // M5-0: 목표 빌드를 따르는 사람 — 경계 목표면 그 경계 스킬을 먼저. M5-0 보정(10월 20일): 리듬 칸(비용 1)을 반드시 끼우던 규칙은 뺐다(약한 칸이 네 칸 중 하나를 차지해 마갑 신중 1챕터 71 → 30%). 리듬 칸은 점수대로만 끼운다
    const bd = bound && !half ? own.filter(id => A.nodes[id].sec === tg).sort((a, b) => ((G0.SK2[b].tgt !== 'self') - (G0.SK2[a].tgt !== 'self')) || sc(b) - sc(a)) : []; /* 보정 5: 경계 공격 칸을 장착 우선 */ void adj;
    const must = bd.slice(0, G0.EQUIP_SLOTS2 - 1); /* M5-0 보정 4: 경계 스킬이 다섯이 되어 셋까지만 먼저(한 칸은 점수대로, 죄인의 피 다섯 칸은 모두 자기 강화) */ eq = must.concat(eq.filter(id => !must.includes(id)).concat(own.filter(id => !must.includes(id) && !eq.includes(id)))).slice(0, G0.EQUIP_SLOTS2); }
  if (run.build === 'spellblade') for (const k of ['spell', 'cut']) if (eq.length >= G0.EQUIP_SLOTS2 && !eq.some(id => G0.SK2[id].kind === k)) { const c = own.filter(id => G0.SK2[id].kind === k && !eq.includes(id)).sort((a, b) => sc(b) - sc(a))[0]; if (c) { const lo = eq.filter(id => G0.SK2[id].kind !== k).sort((a, b) => sc(a) - sc(b))[0]; eq[eq.indexOf(lo)] = c; } }
  run.skills = eq; G0.atSync(run);
}
/* 지금 G.run을 성향대로 끝(쓰러짐 또는 정산)까지 진행한다 */
let CUR = null; // 지금 진행 중인 판의 기록 (창 한도 기록용)
function playLoop(pk, r, out) {
  const G = G0.__G, run = G.run; const mem = {}; CUR = out; let guard = 0;
  for (; guard < 240; guard++) {
    if (OPT.onStep) OPT.onStep(G);
    if (G.scr === 'dead') { out.res = 'lose'; break; }
    if (G.scr === 'settle') {
      if ((run.ch || 1) >= OPT.chapters) { out.res = 'clear'; break; }
      (out.chs = out.chs || []).push({ ch: run.ch, lv: run.lv, gold: run.settle.total, bossHp: out.bossHp, bossLv: out.bossLv });
      betweenChapters(pk, r, out); out.bossHp = null; out.bossLv = null; continue;
    }
    handleSheets(pk, r); spendTree(pk, r);
    if (!run.cur && run.cross) { const k = pickPath(pk, run, r); (out.paths = out.paths || []).push(k); G0.choosePath(k); continue; }
    if (!run.cur && run.doors && (run.ch || 1) === 3 && run.doors.length < 4 && pk !== 'novice' && run.doors.every(d => !['spring', 'shrine', 'event', 'strong'].includes(d.type))) { const li = (run.cons || []).findIndex(c => G0.CONS[c.id] && G0.CONS[c.id].k === 'ladder' && !G0.consWhyNot(null, run, c, null)); if (li >= 0 && r() < 0.5) G0.consUse(null, run, li, null); } // A3 줄사다리
    if (!run.cur && run.doors) { const i = pickDoor(pk, run, r); out.rooms.push(run.doors[i].type); G0.chooseDoor(i); continue; }
    const R = run.cur; if (!R) { out.bugs.push('방이 없음 ' + run.room); failOf(out, 'noroom', { room: run.room, ch: run.ch || 1 }); break; }
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
  if (guard >= 240) { out.bugs.push('240걸음 안에 판이 끝나지 않음 ' + run.room); failOf(out, 'stepcap', { room: run.room, ch: run.ch || 1, scr: G.scr }); } /* 10월 17일: 전에는 말없이 쓰러짐(lose)으로 남았다 */
  out.steps = guard; CUR = null;
  out.floor = run.room; out.ch = run.ch || 1; out.lv = run.lv; out.gold = run.gold;
  if (OPT.detail && run.atree) { const A = G0.atBuild(run.build); const cnt = {}; for (const id of run.atree.own) { const b0 = (A.nodes[id] || {}).br; if (b0) cnt[b0] = (cnt[b0] || 0) + 1; } const top = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0]; out.branch = run.build === 'hunter' && run.focus ? run.focus : top ? top[0] : null; out.branchN = top ? top[1] : 0; out.branchOf = run.atree.own.length; out.mode = run.mode || 'normal'; } /* 10월 8일(7단계): 갈래(트리 칸을 가장 많이 연 갈래) · 연 칸 수 · 모드를 판마다 남긴다 */
  if (run.sector) out.sector = run.sector; // M5-0 목표 부채꼴
  if (BUILDLOG) { out.ksLog = (run.ksLog || []).filter(x => x.id).map(x => ({ id: x.id, offer: x.offer, ch: x.ch, room: x.room })); out.atLog = (run.atree && run.atree.log || []).filter(x => x.id).map(x => [x.id, x.ch, x.room]); } // M5-0 빌드 기록: 큰 각인 제시 · 선택, 액티브 찍은 챕터 · 층
  if (run.ptree) out.ks = run.ptree.ks.slice(); if ((run.awk || []).length) out.awk = run.awk.slice(); { const ft = (run.rooms || []).filter(x => x.type === 'fate'); if (ft.length) out.fate = ft.map(x => x.took ? (x.ok ? '+' : '-') + x.took : 'skip'); } /* 각인 · 운명의 저울 (없으면 칸을 두지 않아 1챕터 결과 파일은 그대로) */
  { const hl = (run.drops || []).filter(x => x.g === 'h' || x.g === 'l').map(x => x.item + ':' + x.g + ':' + (x.ch || 1) + (x.boss ? ':boss' : '')); if (hl.length) out.hl = hl; } /* 영웅 · 전설을 얻은 기록 (없으면 칸을 두지 않아 1챕터 결과 파일은 그대로) */
  if (run.inv && run.eqU && g8On()) { let va = 0, vb = 0; for (const sl of ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2', 'flask']) { const it = run.inv[run.eqU[sl]]; if (!it || !F8('isG8')(it)) continue; const b0 = G0.g8VBase(it); vb += b0; va += G0.g8V(it) - b0; } out.g8v = { af: Math.round(va * 10) / 10, base: Math.round(vb * 10) / 10 }; out.g8eq = {}; for (const sl of ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2', 'flask']) { const it = run.inv[run.eqU[sl]]; if (it && F8('isG8')(it)) out.g8eq[sl] = it.uq ? 'uq:' + it.uq : it.tpl + '|' + F8('g8Afs')(it).map(a => F8('AFFIX')[a.id].fam).sort().join(','); } } /* M6-3: 판 끝에 낀 장비의 V(K 실측) */
  if (OPT.detail) { out.cons = (run.consLog || []).length; out.consIds = countBy((run.consLog || []).map(x => x.id)); out.loot = (run.lootLog || []).reduce((a, x) => ({ gold: a.gold + (x.gold || 0), lost: a.lost + (x.lost || 0), n: a.n + Object.values(x.got || {}).reduce((m, v) => m + v, 0) }), { gold: 0, lost: 0, n: 0 }); out.tree = run.atree ? run.atree.own.slice() : null; if (run.atree && run.atree.vsel && Object.keys(run.atree.vsel).length) out.vsel = Object.assign({}, run.atree.vsel); if (run.offer) out.offer = run.offer; if (run.atree && run_('typeof runTags') === 'function') out.tags = run_('runTags')(run); /* M5-0 보정 5: 변형 · 제시 · 꼬리표(BD-9) */ out.patrol = run.patrolLog || null; out.chLog = run.chLog || null; /* 0.8.0 6단계: 순찰대 보상 고른 것 · 챕터에 들어설 때의 레벨 · 골드 · 장비 등급 · 소모품(C-1) */ out.ptree = run.ptree ? { own: run.ptree.own.slice(), free: run.ptree.free.slice(), ks: run.ptree.ks.slice() } : null; out.equip = (run.skills || []).slice(); out.flaskLeft = Object.assign({}, run.p.flask); out.pathsTaken = (run.pathLog || []).map(x => x.path); } out.gear = Object.values(run.inv).filter(x => run.eqU && Object.values(run.eqU).includes(x.uid)).map(x => x.tpl + ':' + x.g);
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
  const want = []; // 10월 17일: 이 조각이 돌릴 판 목록(기대) — 결과 옆 <파일>.manifest.json에 남겨 measure-validate.js가 빠진 판을 찾는다
  for (const pk of Object.keys(PERSONAS).filter(k => !PKF || PKF.includes(k))) for (const build of Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && (!G0.BUILDS[k].soon || process.env.DG_SOON) && (!G0.UNLOCK[k] || process.env.DG_LOCK || (CLSF && CLSF.includes(k))) && (!CLSF || CLSF.includes(k)))) for (let s = 0; s < N; s++) { if ((job++ % SN) !== SI) continue; want.push({ pk, build, seed: SEED0 + s * 13 }); }
  fs.writeFileSync(file + '.manifest.json', JSON.stringify(manifestOf(want)));
  for (const w of want) { try { runs.push(playChar(w.pk, w.build, w.seed)); } catch (e) { runs.push(crashRow(w, e)); } } /* 판 밖 예외도 판 하나의 실패로 남기고 다음 판을 돈다 */
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
    if (OPT.chapters > 1 || FROM > 1) console.log(`== ${ch}챕터 (${ch === FROM ? (FROM > 1 ? (MARKCH ? '표식 도전 ' + MARKCH + '챕터 시작 [' + MARK_IDS.join('+') + ']' : (ch - 1) + '챕터를 깬 캐릭터를 흉내 낸 시작') : '모든 캐릭터') : (ch - 1) + '챕터를 깬 캐릭터'} ${R.length}명)`);
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
  { const V = require('./measure-validate.js'); const rep = V.validate([{ file, rows: runs }], { manifests: [manifestOf(want)] }); console.log(V.summaryText(rep, { short: true })); }
}
/* 기대 판 목록 (measure-validate.js 형식): 묶음(성향 · 직업)마다 시드. 변형 · 시작 챕터 · 챕터 수 · 환경 변수는 조각 전체에 하나 */
function manifestOf(want) {
  const g = {}; for (const w of want) { const k = [w.pk, w.build].join('|'); (g[k] = g[k] || { pk: w.pk, build: w.build, seeds: [] }).seeds.push(w.seed); }
  return { tool: 'dgqa', rev: REV.id, variant: OPT.variant || process.env.DG_VARIANT || 'base', from: FROM, chapters: OPT.chapters, env: REV.env, groups: Object.values(g) };
}
/* 판 밖 예외(창 처리 · 트리 찍기 등)로 판이 끝나지 못한 경우의 기록 */
function crashRow(w, e) { const o = { pk: w.pk, build: w.build, seed: w.seed, res: 'crash', floor: 0, lv: 0, rooms: [], bugs: ['판 밖 예외 ' + e.message], acts: 0, fights: [] }; o.meta = MM.rowMeta(REV, { seed: w.seed, pk: w.pk, build: w.build, from: FROM, chapters: OPT.chapters, variant: OPT.variant, pol: OPT.polId }); failOf(o, 'crash', { msg: String(e.message).slice(0, 200), stack: String(e.stack || '').split('\n').slice(1, 3).join(' | ') }); CUR = null; return o; }
module.exports = { answerPre, answerPost, clockPre, answerPick, answered, bigIncoming, varPick, sectorPick, secScore, ksPick, manifestOf, crashRow, REV, SKE, sbEquip, sbEquipScore, spendPassive, ptSurvNeed, playChar, playLoop, handleSheets, click, replayBoss, OPT, G0, run_, PERSONAS, rng, ch2Pre, ch2Post, ch3Pre, seedWorld };
