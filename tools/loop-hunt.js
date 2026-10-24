'use strict';
/* S-5 1 자원 고리 사냥 (10월 24일). 실행: node tools/loop-hunt.js [--jobs 8] [--quick] [--out 파일]
   한 차례에 얻는 것 ≥ 쓰는 것이 되는 행동 묶음을 찾는다. 자원: 유산(p.ys, 상한 YUSAN.cap) · 스태미나(p.st) · 보호막(p.ward) · 생명력(p.hp).
   덮는 것: 공개 여섯 직업 × 빌드(ATREE_DEF 갈래 길 고정 6 = 1고리 첫 스킬 + 가운데 칸 + 그 길의 2 · 3고리, 경계 3 = 둘째 · 3고리 둘 · 승부수) × 변형(없음 · 깊게 모두 · 잇기 모두),
     고유 105(data/uniques.js, 하나씩: 직업 고유는 축이 맞는 빌드 + 길 빌드 하나 돌려 가며, 공용은 여섯 직업 × 길 빌드 하나 돌려 가며),
     접사(data/affixes.js 전부, 맨 위 단 큰 값, 하나씩: 맞는 직업마다 길 빌드 하나 돌려 가며 · 정책은 줄인 묶음 — 표본).
     장비 줄은 같은 빌드 · 정책 · 상대의 장비 없는 줄에 없던 깃발만 적는다.
   정책: 같은 행동 되풀이(하나) 또는 두 행동 번갈아(스킬 · 시작 스킬 · 방어 · 흘리기 · 기본 · 강공격, 플라스크 장비면 플라스크도). 쓸 수 없으면 그 차례는 기본 공격(대체 횟수 fb).
   상대: 일반 = 공격만 하는 허수아비(돌격병 틀, 붕괴 보통), 보스 = 붕괴 없는 보스 허수아비(role boss · 붕괴 상한 1e9). 둘 다 피해는 내 최대 생명력의 12% 고정 · 생명력 1e7 · 광폭 끔. 30라운드.
   깃발: a 적이 거의 매 라운드 쳤는데 생명력이 끝에 시작 이상 · b 매 차례 스킬을 쓰는데 유산이 마르지 않음(쓴 양 > 차례 충전, 차이를 대응 · 처치 · 장비 · 플라스크 충전이 메움) ·
     c 적이 거의 움직이지 못함(행동 < 라운드의 1/3) · d 보호막이 끝없이 자람(5 · 15 · 30라운드로 늘고 상한 위) ·
     e 음수 · NaN · 무한 · 상한 넘김(유산 · 스태미나 · 생명력 · 보호막 · 상태 수치; 죄인의 벽 · 불의 몸 보호막은 문장대로 상한 밖이라 뺀다) 또는 엔진 예외.
   끝 코드: e(분명히 의도 밖)가 남으면 1, 설계 질문(a · b · c · d)만이면 0. 결과 표: scratchpad s5/loops.md(--out으로 바꿈) */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick'), CHILD = process.argv.includes('--child'), JOBS = Math.max(1, +arg('--jobs', 8));
const OUT = arg('--out', 'C:/Users/ardwi/AppData/Local/Temp/claude/c--Users-ardwi-Downloads-------/48ad23f7-8d1a-4443-a1ab-63f6348dea18/scratchpad/s5/loops.md');
/* 게임 싣기: tools/dgqa.js loadGame과 같은 방식(조각마다 dgqa를 부르면 tools/eng.gen.js를 겹쳐 쓰므로 직접 싣는다) */
function loadGame() {
  const dir = path.resolve(__dirname, '..', process.env.DGDIR || '.'); const PS = require('./pagesrc.js');
  const ctx = { console, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, module: { exports: {} } }; vm.createContext(ctx);
  vm.runInContext(PS.pageData(dir) + '\n' + PS.pageScript(dir) + '\n;this.__G = G;', ctx, { filename: 'index.html' });
  vm.runInContext('toast = () => {}; scheduleSync = () => {}; syncRun = async () => false; pushRank = async () => {}; saveLocal = () => true; sfx = () => {}; var window = { scrollTo() { }, innerWidth: 1280, innerHeight: 800, scrollY: 0, addEventListener() { } };', ctx);
  return ctx;
}
const E = loadGame(), R_ = c => vm.runInContext(c, E), G = E.__G;
const YUSAN = R_('YUSAN'), AT = R_('ATREE_DEF'), AF = R_('AFFIX'), UQ = R_('UNIQUE'), T2 = R_('TREE2'), ysCapOf = R_('ysCapOf'), wardMax = R_('wardMax'), sv = R_('atSlotId');
const SIX = ['warden', 'monk', 'assassin', 'hunter', 'elementalist', 'spellblade'], ROUNDS = 30, HIT = 0.12;
/* 허수아비: 광폭 끔 · 의도는 늘 공격 · 보스 허수아비 정의(이 vm 안에서만) */
R_(`ENRAGE.room = 1e9; ENRAGE.boss = 1e9; ENRAGE.byBoss = {}; BOSSES.lhDummy = { n: '보스 허수아비', ico: '🎯', mult: 10, hit: ${HIT}, d: '' };
{ const DI = decideIntent; decideIntent = function (b, e) { if (e && e.lhDummy) { e.intentPrev = e.intent && e.intent.k; e.intent = { k: 'attack' }; e.teleSet = e.intent; e.teleX = 0; return; } return DI.apply(this, arguments); }; }`);
/* ---- 빌드 ---- */
function builds(cls) {
  const D = AT[cls], out = [], row = id => D.skills.find(r => r[0] === id);
  for (const br in D.paths) for (const pa of ['a', 'b']) { const sk = D.skills.filter(r => r[1] === br && r[2] <= 3 && (!r[7] || !r[7].path || r[7].path === pa)).sort((x, y) => x[2] - y[2] || x[3] - y[3]).map(r => r[0]); out.push({ n: br + ' ' + pa + ' ' + D.paths[br][pa], ax: br + ' · ' + D.paths[br][pa], act: sk }); }
  for (const k of ['AB', 'BC', 'CA']) { const br = D.sec[k], sk = D.skills.filter(r => r[1] === br).sort((x, y) => x[2] - y[2] || x[3] - y[3]).map(r => r[0]); out.push({ n: '경계 ' + br, ax: br, act: sk.slice(1, 5).length === 4 ? [sk[1], sk[2], sk[3], sk[4]] : sk.slice(0, 4) }); } // 둘째 · 3고리 둘 · 승부수
  void row; return out;
}
function vsel(cls, act, kind) { if (!kind) return {}; const V = AT[cls].vars || {}, o = {}; for (const id of act) { const v = (V[id] || []).find(x => (x[5] || {}).v === kind); if (v) o[id] = v[0]; } return o; }
const BLD = Object.fromEntries(SIX.map(c => [c, builds(c)]));
/* ---- 정책 ---- */
function pool(cls, act) { return ['basic', 'heavy', 'guard', 'dodge'].concat(T2[cls].starters, act); }
function polFull(P) { const o = P.map(x => [x]); for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) o.push([P[i], P[j]]); return o; }
function polItem(P, flask) { const sk = P.slice(4), o = P.map(x => [x]); for (const s of sk) for (const d of ['basic', 'guard', 'dodge']) o.push([d, s]); o.push(['guard', 'dodge'], ['basic', 'guard'], ['heavy', 'guard'], ['heavy', 'dodge']); // 짝 순서는 polFull과 같게(장비 없는 줄과 맞춰 본다)
  if (flask) for (const f of ['flaskL', 'flaskM', 'flaskS']) { o.push([f]); o.push(['basic', f]); o.push(['guard', f]); } return o; }
/* ---- 한 판 ---- */
const NUM = v => typeof v === 'number';
function setup(cls, cfg) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun(cls); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = cfg.act.concat(Object.keys(cfg.vsel || {}).map(sv)); run.skills = cfg.act.slice(0, 4); run.atree.vsel = Object.fromEntries(Object.entries(cfg.vsel || {}).map(([id, v]) => [sv(id), v])); E.atSync(run);
  for (const id of cfg.uq || []) { const it = E.mkUq(id); run.inv[it.uid] = it; const sl = UQ[id].slot; run.eqU[sl === 'ring' ? 'ring1' : sl] = it.uid; }
  for (const [id, v, sl, base] of cfg.af || []) { const it = E.mkItem8({ base, g: 'r', ch: 3, b: 0, af: [[id, v]] }); run.inv[it.uid] = it; run.eqU[sl] = it.uid; }
  E.applyGear(run, true); const p = run.p; p.hpMax = E.calcHpMax(p); p.stMax = E.calcStMax(p); p.hp = p.hpMax; p.st = p.stMax;
  const dmg = Math.round(p.hpMax * HIT * 10) / 10; let e;
  if (cfg.boss) { e = E.mkBoss('lhDummy'); e.brkMax = 1e9; } else e = E.mkEnemy('bruiser', !!cfg.elite, 0); // cfg.elite: 정예 틀(붕괴 상한 100) — 따로 볼 때만
  e.hp = e.hpMax = 1e7; e.dmg = dmg; e.lhDummy = 1;
  const b = E.newBattle(p, [e], cfg.boss ? { boss: 1 } : {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p, b, e, dmg };
}
const BAD = v => !NUM(v) || !isFinite(v) || v < -1e-9;
function scanS(o, w, out) { for (const k in o || {}) { const v = o[k]; if (NUM(v)) { if (!isFinite(v) || v < -1e-9) out.push(w + '.' + k + '=' + v); } else if (v && typeof v === 'object') for (const j in v) if (NUM(v[j]) && (!isFinite(v[j]) || v[j] < -1e-9)) out.push(w + '.' + k + '.' + j + '=' + v[j]); } }
function play(cls, cfg, pol) {
  const f = setup(cls, cfg), { p, b, e } = f; const r = { hp0: p.hp, hpMin: p.hp, ys0: p.ys, fb: 0, skT: 0, acts: 0, bad: [], wAt: {}, ysMin: p.ys, stMin: p.st };
  const sp0 = b.ysSpent || 0; let k = 0, err = null, wRaw = false;
  const chk = w => { const q = []; for (const [n, v] of [['hp', p.hp], ['st', p.st], ['ys', p.ys == null ? 0 : p.ys], ['ward', p.ward || 0], ['e.hp', e.hp], ['e.brk', e.brk || 0]]) if (BAD(v)) q.push(n + '=' + v);
    scanS(p.s, 'p.s', q); scanS(e.s, 'e.s', q);
    if ((p.ys || 0) > ysCapOf(p) + 1e-9) q.push('ys ' + p.ys + ' > 상한 ' + ysCapOf(p)); if (p.st > p.stMax + 1e-6) q.push('st ' + r1(p.st) + ' > ' + p.stMax); if (p.hp > p.hpMax + 1e-6) q.push('hp ' + r1(p.hp) + ' > ' + p.hpMax);
    wRaw = wRaw || b.log.some(x => /^(죄인의 벽|불의 몸):/.test(x.m)); const wm = wardMax(p); if ((p.ward || 0) > wm + 1e-6 && !wRaw) q.push('ward ' + r1(p.ward) + ' > 상한 ' + wm);
    for (const x of q) if (!r.bad.some(y => y.split(' ')[0] === x.split(' ')[0])) r.bad.push(x + ' @' + w); };
  try {
    while (!b.over && (b.round || 0) <= ROUNDS && r.acts < ROUNDS * 6) {
      const want = pol[k % pol.length]; k++; const L = E.actionList(b); let a = L.find(x => x.id === want);
      if (!a || !a.ok) { a = L.find(x => x.id === 'basic'); r.fb++; } if (a.yc != null && a.yc > 0) r.skT++;
      E.playerAct(b, a.id, a.self ? undefined : e.id); E.runUntilPlayer(b); r.acts++;
      r.hpMin = Math.min(r.hpMin, p.hp); r.ysMin = Math.min(r.ysMin, p.ys); r.stMin = Math.min(r.stMin, p.st); for (const R of [5, 15, 30]) if (b.round >= R && r.wAt[R] == null) r.wAt[R] = p.ward || 0;
      chk('R' + b.round + ' ' + a.id);
    }
  } catch (x) { err = String(x && x.stack || x).split('\n').slice(0, 2).join(' ').slice(0, 300); }
  const src = {}, why = {}; let turnPot = 0; for (const x of b.rec) if (x.k === 'ys') { src[x.src] = (src[x.src] || 0) + (x.g || 0); if (x.src === 'turn') turnPot += x.n || 0; else if (x.g > 0) why[x.why] = (why[x.why] || 0) + x.g; } // turnPot: 상한에 막히기 전 차례 충전(긴 전투 +2 포함)
  const eact = b.rec.filter(x => x.k === 'eact').length, rounds = Math.min(ROUNDS, b.round || 0);
  Object.assign(r, { err, rounds, over: !!b.over, hp: p.hp, hpMax: p.hpMax, ys: p.ys, st: p.st, stMax: p.stMax, ward: p.ward || 0, wm: wardMax(p), spend: (b.ysSpent || 0) - sp0, src, why, eact, dmg: f.dmg, stun: b.log.filter(x => /행동을 놓친다/.test(x.m)).length });
  const fl = [];
  if (eact >= ROUNDS * 0.6 && r.hp >= r.hp0 - 1e-6 && !b.over) fl.push('a');
  r.need = r.spend + (p.ys || 0) - r.ys0 - turnPot; // 차례 충전(상한 전) · 시작 유산만으로는 모자라 그 밖 충전이 메운 몫
  if (!r.fb && r.skT === r.acts && r.acts >= ROUNDS && r.need >= 3) fl.push('b');
  if (rounds >= ROUNDS && eact < rounds / 3) fl.push('c');
  if (r.wAt[30] != null && r.wAt[30] > (r.wAt[15] || 0) + 1 && (r.wAt[15] || 0) > (r.wAt[5] || 0) + 1 && r.wAt[30] > r.wm + 1e-6) fl.push('d');
  if (r.bad.length || err) fl.push('e');
  r.fl = fl; return r;
}
const r1 = v => Math.round(v * 10) / 10;
/* ---- 일감 ---- */
function tasks() {
  const T = [], bi = {}; const ENS = [0, 1];
  for (const c of SIX) BLD[c].forEach((B, i) => { for (const vk of ['', 'deep', 'link']) { if (QUICK && vk) continue; for (const pol of polFull(pool(c, B.act))) for (const boss of ENS) T.push({ t: 'B', c, i, vk, pol, boss }); } });
  /* 고유: 직업 고유는 축이 맞는 빌드 + 길 빌드 하나(돌려 가며), 공용은 여섯 직업 × 길 빌드 하나(돌려 가며). 정책은 다 */
  let rot = 0; const uqIds = Object.keys(UQ);
  for (const id of uqIds) { const U = UQ[id], cl = U.cls === 'all' ? SIX : [U.cls];
    for (const c of cl) { const L = BLD[c], m = L.map((B, i) => [B, i]).filter(([B]) => U.axis && (B.ax === U.axis || B.ax.split(' · ')[0] === U.axis)).map(x => x[1]); const want = new Set(m.slice(0, 2)); want.add(rot++ % 6);
      for (const i of want) { const P = pool(c, L[i].act), ps = QUICK ? polItem(P, U.slot === 'flask') : polFull(P).concat(U.slot === 'flask' ? polItem(P, 1).filter(x => /^flask/.test(x[0])) : []); for (const pol of ps) for (const boss of ENS) T.push({ t: 'U', id, c, i, vk: '', pol, boss }); } } }
  /* 접사: 맞는 직업마다 길 빌드 하나(돌려 가며), 줄인 정책(polItem) — 표본 */
  const BASE = { weapon: 'blade', armor: 'cloak', gloves: 'gloves', amulet: 'amulet', ring: 'ring', flask: 'flask' };
  for (const id in AF) { const A = AF[id]; const sl = (A.slot || ['weapon'])[0]; const tiers = Object.values(A.tier || {}); if (!tiers.length) continue; const v = Math.max(...tiers.map(t => Math.max(...t)));
    const cl = A.cls === 'all' ? SIX : [].concat(A.cls).filter(x => SIX.includes(x)); if (QUICK && A.cls === 'all') cl.splice(2);
    for (const c of cl) { const i = rot++ % 6, P = pool(c, BLD[c][i].act); for (const pol of polItem(P, sl === 'flask')) for (const boss of ENS) T.push({ t: 'A', id, v, sl: sl === 'ring' ? 'ring1' : sl, base: BASE[sl] || 'blade', c, i, vk: '', pol, boss }); } }
  void bi; return T;
}
function runTask(x) { const B = BLD[x.c][x.i]; const cfg = { act: B.act, vsel: vsel(x.c, B.act, x.vk), boss: x.boss }; if (x.t === 'U') cfg.uq = [x.id]; if (x.t === 'A') cfg.af = [[x.id, x.v, x.sl, x.base]];
  const r = play(x.c, cfg, x.pol); return { fl: r.fl, n: [r1(r.hp0), r1(r.hpMin), r1(r.hp), r.ys, r.ysMin, r.spend, r.src.turn || 0, (r.src.resp || 0) + (r.src.refund || 0) + (r.src.item || 0) + (r.src.flask || 0) + (r.src.overflow || 0), r1(r.st), r1(r.stMin), r1(r.ward), r.wm, r.eact, r.rounds, r.acts, r.fb, r.stun, r.dmg, r.need], why: r.why, bad: r.bad.slice(0, 3), err: r.err }; }
const key = x => [x.c, x.i, x.vk, x.pol.join('+'), x.boss].join('|');
/* 설계 질문(10월 24일 S-5 1 판정, 만든 사람 규칙: 의도에 닿는 것은 고치지 않고 가/나로 묻는다). 줄 → 질문 id, 위에서부터 첫 맞는 것 */
const QS = [
  { id: 'Q1', q: w => w.item.includes('costOnce'), t: 'S-3 규칙 우회: 접사 할인으로 비용 1이 된 보호막 칸',
    d: '아끼는 장갑(costOnce_보호막)으로 버티기(보호막 상한 45%까지 채우기)가 비용 1이 되어 매 차례 쓴다. S-3 "유산 1 보호 · 보호막 · 회피 칸 → 다음 차례 충전 없음"은 기본 비용 1과 변형의 조건 할인만 보고 접사 · 고유 할인은 보지 않아 충전이 그대로 든다 → 생명력이 전혀 줄지 않음.',
    a: '가(추천): S-3 충전 없음을 "실제로 낸 비용이 1"인 보호 · 회복 · 보호막 · 회피 칸 모두로(접사 costOnce · 고유 할인 포함, 비용 0인 태세 끄기는 빼고). 설명 끝 문장도 "비용 1로 쓰면 …"으로.', b: '나: 그대로(장갑 칸 하나를 이 할인에 쓴 값으로 본다).' },
  { id: 'Q2', q: w => w.fl.includes('c') && !(w.why['무너뜨리기'] >= 8), t: '빙결 · 영겁의 정적이 정예까지 영구 잠금',
    d: '깊은 얼음 창(둔화 3 = 바로 빙결, 비용 2)을 매 차례, 영겁의 정적(비용 4, 나도 한 차례 쉼)을 격 차례로 쓰면 일반 · 정예 적이 30라운드에 2–3번만 움직인다(정예 따로 시험해도 같음). 긴 전투 +2 충전만으로 비용이 메워진다. 강적 · 보스는 빙결 대신 붕괴라 안 잠긴다. 얼음 우리(족쇄 장갑 · 연계 장갑) · 금강 자세 발경은 일반 적에서만 같은 꼴(정예는 안 잠김).',
    a: '가(추천): 빙결 · 정적으로 행동을 놓친 적은 다음 라운드까지 빙결 · 정적이 다시 걸리지 않음(둔화만 남김).', b: '나: 그대로(정예 이하 잠금은 서리 · 정적 빌드의 보상으로 본다).' },
  { id: 'Q3', q: w => w.why['무너뜨리기'] >= 8 && (w.fl.includes('c') || w.fl.includes('b')), t: '일반 적 붕괴 잠금 + 무너뜨리기 대응이 비용을 메움',
    d: '사슬 장갑(근접 스킬 붕괴 +20) · 교차 손가락 · 휩쓰는 손 · 산 무너뜨리기(붕괴 54) 등으로 일반 적(붕괴 상한 50)을 매 차례 무너뜨리면 적이 한 번도 못 움직이고, 무너뜨리기 대응 +1이 매 라운드 들어 비용 2 스킬을 공짜로 계속 쓴다. 정예(상한 100)를 따로 시험하면 같은 정책으로 잠기지 않고 진다(적 행동 9/16 · 9/12).',
    a: '가: 일반 적도 무너질 때마다 붕괴 상한이 커짐(보스 ×1.5처럼, 예 ×1.3).', b: '나(추천): 그대로. 일반 적은 실제로 몇 차례면 쓰러지고, 정예부터는 잠기지 않는다.' },
  { id: 'Q4', q: w => (w.why['흘리기'] || 0) + (w.why['막기'] || 0) >= 8, t: '흘리기 · 막기 대응 충전이 방어 스킬을 다시 사 줌',
    d: '연막(회피 3 · 보호 18, 빠름, 비용 3)은 몸 빼기마다 흘리기 대응 +1이 들어 차례 충전과 합쳐 값을 메운다 → 한 적 상대로 생명력이 줄지 않음(정예도 같음). 흘려 베기를 매 차례 쓰면 흘리기 대응으로 비용 2를 계속 낸다(생명력은 준다). 수비 태세 보호막 접사 + 굳히기 · 방어도 막기 대응으로 같은 꼴.',
    a: '가: 회피 · 흘리기로 받은 대응 충전은 그 회피를 만든 스킬을 쓴 다음 라운드에는 없음.', b: '나(추천): 그대로. 대응 = 유산이 설계의 중심이고, 적이 둘 이상이면 회피 수가 먼저 닳는다.' },
  { id: 'Q6', q: w => Object.keys(w.why).some(k => /^🔄/.test(k)), t: '쓰면 바로 🔄(유산 +1)인 보호막 칸',
    d: '다시 세우는 벽(보호막 상한 42%까지 채우기, 빠름, 비용 2, 🔄 쓸 때)은 쓰는 순간 다시 쓰기 유산 +1이 들어 실질 비용 1이다. 철벽 · 돌파와 번갈아 매 라운드 쓰면 생명력이 줄지 않는다. 기본 비용이 2라 S-3 충전 없음에도 걸리지 않는다.',
    a: '가: 쓰는 순간의 🔄(on use)이 보호막 · 회복 칸에 붙어 있으면 S-3처럼 다음 차례 충전 없음.', b: '나(추천): 그대로. 경계 공성추 2고리 값으로 의도된 칸이고 한 적 · 고정 피해 시험의 산물에 가깝다(측정에서 공성추 승률만 지켜본다).' },
  { id: 'Q5', q: w => w.fl.includes('a'), t: '한 적 상대 상시 방어(차례 충전만으로)',
    d: '마력 방벽(보호막 28, 빠름, 2) · 숨은 사수(회피 2, 빠름, 2) · 다시 세우는 벽 + 철벽/돌파 · 깊은 몸 빼기(회피 3, 비용 1, S-3 충전 없음이어도) · 바람 걸음 · 굳은 태세(켤 때 +8)를 켜고 끄기로 되풀이 등. 고정 12% 한 적이면 2라운드마다 한 번으로 전부 막는다. 대응 충전 없이 차례 충전만으로 돈다.',
    a: '가: 빠른 보호막 · 회피 칸은 연이은 내 차례에 다시 쓸 수 없음.', b: '나(추천): 그대로. 한 적 · 고정 피해 시험의 산물이고, 적이 둘이거나 예고된 큰 공격(회피 절반 · 보호막 관통)이 오면 깨진다. 깊은 몸 빼기(회피 3 · 비용 1)만 측정에서 따로 본다.' },
];
const qOf = w => (QS.find(Q => Q.q(w)) || {}).id || '-';
if (CHILD) { const [k, N] = [+arg('--child'), +arg('--n')]; const T = tasks(); const out = []; for (let j = k; j < T.length; j += N) out.push([j, runTask(T[j])]); process.send(out, () => process.exit(0)); }
else if (require.main === module) main();
module.exports = { play, setup, BLD, builds, vsel, pool, E, R_ };
async function main() {
  const t0 = Date.now(), T = tasks(); console.log('loop-hunt: 판 ' + T.length + ' · 조각 ' + JOBS + (QUICK ? ' · 빠른 표본' : ''));
  const res = new Array(T.length);
  if (JOBS <= 1) T.forEach((x, j) => { res[j] = runTask(x); });
  else await Promise.all(Array.from({ length: JOBS }, (_, k) => new Promise((ok, no) => { const c = cp.fork(__filename, process.argv.slice(2).filter((a, i, A) => a !== '--jobs' && A[i - 1] !== '--jobs').concat(['--child', String(k), '--n', String(JOBS)]), { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    c.on('message', m => { for (const [j, r] of m) res[j] = r; }); c.on('exit', code => code ? no(new Error('조각 ' + k + ' 끝 코드 ' + code)) : ok()); })));
  const base = new Map(); T.forEach((x, j) => { if (x.t === 'B' && !x.vk) base.set(key(x), res[j]); });
  const rows = [];
  const nm = x => { const B = BLD[x.c][x.i]; return B.n + (x.vk ? ' (' + (x.vk === 'deep' ? '깊게' : '잇기') + ')' : ''); };
  const item = x => x.t === 'U' ? '고유 ' + x.id + ' ' + UQ[x.id].n : x.t === 'A' ? '접사 ' + x.id + ' ' + x.v : '-';
  T.forEach((x, j) => { const r = res[j]; if (!r || !r.fl.length) return; let fl = r.fl; if (x.t !== 'B') { const b0 = base.get(key(x)); fl = fl.filter(f => f === 'e' || !(b0 && b0.fl.includes(f))); } if (!fl.length) return; const w = { x, r, fl, why: r.why || {}, item: item(x) }; w.q = fl.includes('e') ? 'e' : qOf(w); rows.push(w); });
  const cnt = {}; for (const w of rows) for (const f of w.fl) cnt[f] = (cnt[f] || 0) + 1;
  const L = []; L.push('# S-5 1 자원 고리 사냥 (tools/loop-hunt.js, ' + new Date().toISOString().slice(0, 16) + ')', '',
    '판 ' + T.length + ' (빌드 ' + T.filter(x => x.t === 'B').length + ' · 고유 ' + T.filter(x => x.t === 'U').length + ' · 접사 ' + T.filter(x => x.t === 'A').length + ')' + (QUICK ? ' · --quick 표본' : '') + ' · ' + ((Date.now() - t0) / 1000).toFixed(0) + '초. 상대 피해 = 내 최대 생명력 × ' + HIT + ' 고정, 30라운드.',
    '표본: 접사는 직업마다 길 빌드 하나(돌려 가며) · 줄인 정책(하나 + 스킬×방어/흘리기/기본 + 방어 짝 넷), 고유는 축 빌드 + 길 빌드 하나. 장비 줄은 장비 없는 같은 줄에 없던 깃발만.', '',
    '깃발 수: ' + ['a', 'b', 'c', 'd', 'e'].map(f => f + ' ' + (cnt[f] || 0)).join(' · '), '',
    '숫자: 생명력 시작/최저/끝 · 유산 끝/최저 · 쓴 유산 / 든 차례 충전 / 그 밖 충전 · 메운 몫(쓴 + 끝 − 시작 − 상한 전 차례 충전) · 스태미나 끝/최저 · 보호막 끝/상한 · 적 행동/라운드 · 내 행동(대체) · 놓친 행동 · 적 한 번 피해', '');
  /* 설계 질문 요약 */
  L.push('## 설계 질문 (고치지 않음, 가/나)', '');
  for (const Q of QS) { const W = rows.filter(w => w.q === Q.id); if (!W.length) continue; const ex = [...new Set(W.map(w => w.x.c + ' ' + nm(w.x) + (w.item !== '-' ? ' + ' + w.item : '') + ' · ' + w.x.pol.join('+')))];
    L.push('### ' + Q.id + ' ' + Q.t + ' — ' + W.length + '줄', '', Q.d, '', '- ' + Q.a, '- ' + Q.b, '', '대표: ' + ex.slice(0, 8).join(' / ') + (ex.length > 8 ? ' 외 ' + (ex.length - 8) : ''), ''); }
  const fmt = n => n[0] + '/' + n[1] + '/' + n[2] + ' · 유 ' + n[3] + '/' + n[4] + ' · ' + n[5] + '/' + n[6] + '/' + n[7] + ' · 메움 ' + n[18] + ' · 스 ' + n[8] + '/' + n[9] + ' · 막 ' + n[10] + '/' + n[11] + ' · 적 ' + n[12] + '/' + n[13] + ' · ' + n[14] + '(' + n[15] + ') · 놓침 ' + n[16] + ' · 피해 ' + n[17];
  const TITLE = { e: 'e 분명히 의도 밖(음수 · NaN · 무한 · 상한 넘김 · 예외)', d: 'd 보호막이 끝없이 자람', c: 'c 적이 거의 움직이지 못함', b: 'b 매 차례 스킬, 유산이 마르지 않음', a: 'a 적이 매 라운드 치는데 생명력이 줄지 않음' };
  for (const f of ['e', 'd', 'c', 'b', 'a']) { const W = rows.filter(w => w.fl.includes(f)); L.push('## ' + TITLE[f] + ' — ' + W.length + '줄', '');
    if (!W.length) { L.push('없음', ''); continue; }
    /* 같은 직업 · 빌드 · 장비 · 상대에서 정책을 묶는다(줄이 많으면 장비 쪽은 장비마다 한 줄) */
    const g = new Map(); for (const w of W) { const k = [w.x.c, nm(w.x), w.item, w.x.boss].join('|'); if (!g.has(k)) g.set(k, []); g.get(k).push(w); }
    L.push('| 직업 | 빌드 | 장비 | 상대 | 정책(수) | 대표 숫자 | 질문 · 비고 |', '|---|---|---|---|---|---|---|');
    for (const [k, ws] of g) { const [c, bn, it, boss] = k.split('|'); const w0 = ws[0]; const pols = ws.map(w => w.x.pol.join('+')); const wy = Object.entries(w0.why).map(([a, v]) => a + ' ' + v).join(', '); const note = f === 'e' ? (w0.r.err || w0.r.bad.join(' ; ')) : w0.q + (wy ? ' (' + wy + ')' : '');
      L.push('| ' + c + ' | ' + bn + ' | ' + it + ' | ' + (boss === '1' ? '보스' : '일반') + ' | ' + pols.slice(0, 6).join(', ') + (pols.length > 6 ? ' 외 ' + (pols.length - 6) : '') + ' (' + pols.length + ') | ' + fmt(w0.r.n) + ' | ' + note.replace(/\|/g, '/') + ' |'); }
    L.push(''); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, L.join('\n'));
  fs.writeFileSync(OUT.replace(/\.md$/, '.json'), JSON.stringify(rows.map(w => ({ c: w.x.c, b: nm(w.x), item: w.item, boss: w.x.boss, pol: w.x.pol.join('+'), fl: w.fl, q: w.q, why: w.why, n: w.r.n, bad: w.r.bad, err: w.r.err }))));
  console.log('깃발: ' + ['a', 'b', 'c', 'd', 'e'].map(f => f + ' ' + (cnt[f] || 0)).join(' · ') + ' · ' + ((Date.now() - t0) / 1000).toFixed(0) + '초 → ' + OUT);
  process.exit(cnt.e ? 1 : 0);
}
