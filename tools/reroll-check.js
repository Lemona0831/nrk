'use strict';
/* 새로 고침 · 다시 굴리기 점검 (S-4 공개 전 점검 1번, 10월 24일)
   결과가 저장되기 전에 페이지를 새로 불러오면 다른 결과를 받을 수 있는 자리가 있는지 본다. 전투는 판 난수(b.rngS)와 누르기 전 저장(commitAct)으로 이미 막혀 있다.
   한 브라우저의 localStorage 하나를 두고 탭(vm 문맥)을 여러 개 띄운다. 탭마다 Math.random 씨앗이 달라서, 새로 연 탭이 결과를 다시 만들면 값이 달라진다.
   - 새로 고침: 탭 A에서 화면을 그리거나(진열 · 문) 누른 뒤(이벤트 · 보상 · 상점) 저장본만으로 탭 B를 새로 띄워 [이어 하기]를 누른다. A의 판과 B의 판이 같아야 한다
   - 두 탭: 두 탭이 같은 저장본에서 같은 보상 창을 연 채로 각각 고른다. 먼저 저장한 쪽만 남고, 늦은 탭은 낡은 탭이 되어 저장하지 못해야 한다
   - 뒤로 가기: 이 게임은 주소 기록(history)을 쓰지 않는다. 뒤로 가기는 페이지를 떠나는 것이라 새로 고침과 같고, 되살아난 페이지(bfcache)는 pageshow에서 저장본과 맞춰 본다
   쓰기: node tools/reroll-check.js [게임 폴더=.]  다시 굴릴 수 있는 자리가 하나라도 있으면 표를 찍고 1로 끝난다 */
const vm = require('vm'), path = require('path');
const pages = require('./pagesrc');
const dir = path.resolve(__dirname, '..', process.argv[2] || '.');
const SRC = pages.pageData(dir) + '\n' + pages.pageScript(dir) + '\n;this.__G = G;';
const store = new Map(); // 같은 브라우저(출처)의 localStorage — 탭끼리 나눠 쓴다
const tabs = [];
const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let clock = 1767225600000;
/* 탭 하나를 연다(= 페이지를 새로 불러온다). 저장본은 store에서 읽는다 */
function open(seed) {
  const T = { seed, on: {}, alive: true };
  const ls = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => { store.set(k, v); for (const o of tabs) if (o !== T && o.alive) for (const f of o.on.storage || []) f({ key: k, newValue: v }); }, removeItem: k => { store.delete(k); } };
  const ctx = { console, module: { exports: {} }, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, localStorage: ls, sessionStorage: { getItem: () => null, setItem: () => { } } };
  vm.createContext(ctx); vm.runInContext(SRC, ctx, { filename: 'index.html' });
  ctx.__rnd = rng(seed); ctx.__on = T.on; ctx.__T = T;
  vm.runInContext(`Math.random = __rnd; { let t = ${clock += 1e6}; Date.now = () => t++; }
    var window = { scrollTo() { }, innerWidth: 1280, innerHeight: 800, scrollY: 0, addEventListener(k, f) { (__on[k] = __on[k] || []).push(f); } }; var location = { reload() { __T.reloaded = 1; } };
    toast = () => { }; sfx = () => { }; playTick = () => { }; ask = () => true; G.data = loadLocal(); if (typeof tabWatch === 'function') tabWatch();`, ctx);
  T.ctx = ctx; T.G = ctx.__G; T.run_ = c => vm.runInContext(c, ctx); T.key = T.run_('SKEY'); tabs.push(T); return T;
}
const close = T => { T.alive = false; };
function click(T, a, k, extra) { const ds = Object.assign({ a }, k != null ? { k: String(k) } : {}, extra || {}); const el = { dataset: ds, checked: false, closest: () => null }; T.ctx.onClick({ target: { closest: () => el } }); }
/* 판에서 새로 고침에 살아남아야 할 것(보이는 결과)만 꺼낸다 */
const ids = o => Object.keys(o || {}).sort();
function snap(T) {
  const G = T.G, r = G.run; if (!r) return 'no run';
  const pick = x => x == null ? null : JSON.parse(JSON.stringify(x));
  return JSON.stringify({ room: r.room, ch: r.ch, phase: r.phase || null, cur: pick(r.cur), doors: pick(r.doors), cross: pick(r.cross), segDoors: pick(r.segDoors), camp: pick(r.camp), shop: r.shop ? pick({ stock: r.shop.stock, cons: r.shop.cons, gamble: r.shop.gamble }) : null,
    gold: r.gold, eq: pick(r.eqU), cons: pick(r.cons), consPending: pick(r.consPending), patrolPend: pick(r.patrolPend), gearPending: pick(r.gearPending),
    /* 가진 장비 + 아직 건넬 장비(줄 · 상자): 다시 연 탭은 남은 줄을 바로 건네므로 둘을 합쳐 본다 */
    items: ids(r.inv).map(u => [u, r.inv[u].g, pick(r.inv[u].af)]).concat((G.dropQ || []).filter(x => !x.chest).map(x => [x.uid, x.g, pick(x.af)])).sort((x, y) => x[0] < y[0] ? -1 : 1),
    chests: (G.dropQ || []).filter(x => x.chest).map(x => x.chest.map(y => y.uid || y)).concat(G.sheet && G.sheet.kind === 'choice' ? [G.sheet.data.offer.map(y => y.uid || y)] : []),
    next: pick(r.next), buffs: pick(r.buffs), dg: pick(r.dg), rooms: (r.rooms || []).length, hp: Math.round(r.p.hp), st: Math.round(r.p.st), flask: pick(r.p.flask), oil: r.oil || 0 });
}
/* 탭 A에서 판을 만들고 저장한다(만들기 배분은 건너뛴다: 테스터와 같다) */
function newRun(T, build) {
  const G = T.G; G.data = T.ctx.blankData(); G.data.seenFoe = { abbot: 1, bellringer: 1, pilgrim: 1 }; G.data.seenBoss = { abbot: 1 }; G.data.seenCoach = true; G.data.unlAll = 1; G.data.tutSeen = 1;
  G.cre = { name: '점검' }; T.ctx.startRun(build || 'assassin'); const run = G.run;
  G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run'; delete run.alloc; T.ctx.treeSync(run); T.ctx.applyGear(run); run.p.hp = run.p.hpMax; run.p.st = run.p.stMax;
  T.ctx.saveRunLocal(); T.ctx.saveCur(); return run;
}
/* 판의 자리를 바꾸고 저장한다(이어 하기 자료 = 저장본) */
const commit = T => { T.ctx.saveRunLocal(); T.ctx.saveCur(); };
/* 새로 고침: 저장본만으로 새 탭을 열고 [이어 하기] */
function reload(seed) { const B = open(seed); if (!B.G.data.cur) return B; B.ctx.resumeRun(); return B; }
const R = []; // { path, ok, how }
let seedN = 100;
function check(name, setup, act, how) {
  for (const t of tabs) close(t); tabs.length = 0; store.clear();
  let ok = false, why = '';
  try {
    const A = open(seedN += 7); setup(A); commit(A); act(A); const a = snap(A);
    close(A); const B = reload(seedN += 7); const b = snap(B);
    ok = a === b; if (!ok) { const ka = JSON.parse(a), kb = JSON.parse(b); why = Object.keys(ka).filter(k => JSON.stringify(ka[k]) !== JSON.stringify(kb[k])).join(','); }
  } catch (e) { why = '예외 ' + e.message.slice(0, 120); }
  R.push({ path: name, ok, how, why });
}
const room = (T, t, f, ch, extra) => { const run = T.G.run; run.ch = ch || run.ch || 1; run.room = f; run.cur = Object.assign(T.ctx.mkRoom(run, t, f), extra || {}); run.doors = null; run.cross = null; return run.cur; };
const g8 = (T, sl, g) => { const run = T.G.run; const it = T.ctx.g8Gen(run, { slot: sl, g: g || 'r', ch: run.ch || 1, own: true, noUq: true }); run.inv[it.uid] = it; run.bag.push(it.uid); return it; };
/* 전투를 바로 이긴 것으로 친다(방 보상 경로만 본다) */
function winRoom(T) {
  const G = T.G; T.ctx.enterRoom(); for (let k = 0; !G.b && G.sheet && k < 4; k++) { G.sheet = null; T.ctx.enterRoom(); }
  const b = G.b; for (const e of b.en) { e.hp = 0; e.alive = false; } b.over = 'win'; T.ctx.saveBattle(); T.ctx.battleContinue();
  for (let k = 0; k < 6 && G.sheet && G.sheet.kind === 'consfull'; k++) click(T, 'cptake');
}

// ===== 이벤트 결과(Math.random) =====
check('이벤트 · 성물함 비틀어 열기(깨어남)', A => { newRun(A); room(A, 'event', 3, 1, { event: 'reliquary' }); A.G.run.p.st = 100; }, A => { A.run_('Math.random = () => 0'); click(A, 'event', 'force'); }, '깨어남도 saveCur');
check('이벤트 · 성물함 비틀어 열기(안 깨어남)', A => { newRun(A); room(A, 'event', 3, 1, { event: 'reliquary' }); A.G.run.p.st = 100; }, A => { A.run_('Math.random = () => 0.99'); click(A, 'event', 'force'); }, '누를 때 굴리고 advanceFloor가 저장');
check('이벤트 · 2챕터 등불 가게(70%)', A => { newRun(A); room(A, 'event', 3, 2, { event: 'lampshop' }); }, A => click(A, 'event', 'open'), '누를 때 굴리고 저장');
check('이벤트 · 2챕터 지갑(깨어남)', A => { newRun(A); room(A, 'event', 3, 2, { event: 'wallet' }); }, A => { A.run_('Math.random = () => 0'); click(A, 'event', 'pick'); }, '깨어남도 saveCur');
check('이벤트 · 3챕터 검문소 몰래 지나기', A => { newRun(A); room(A, 'checkpoint', 3, 3); }, A => click(A, 'event', 'sneak'), '누를 때 굴리고 저장');
check('이벤트 · 3챕터 통행세(다음 층 문 엿보기)', A => { newRun(A); A.G.run.ch = 3; A.G.run.room = 2; A.G.run.segDoors = A.ctx.genSeg(A.G.run, 0, 'main'); room(A, 'checkpoint', 2, 3); A.G.run.gold = 200; }, A => click(A, 'event', 'toll'), '누를 때 굴리고 저장');
check('제단 · 피의 제단(장비)', A => { newRun(A); room(A, 'altar', 3, 1, { altar: 'blood' }); }, A => click(A, 'altar', '1'), '장비는 건넬 때 저장');
check('운명의 저울', A => { newRun(A); A.G.run.ch = 2; const it = g8(A, 'gloves', 'm'); room(A, 'fate', 5, 2); A.__u = it.uid; }, A => click(A, 'fate', A.__u), '누를 때 굴리고 advanceFloor가 저장');

// ===== 방 보상 고르기 =====
check('보상 · 일반 방 장비 둘(뒤 장비는 줄에)', A => { newRun(A); room(A, 'normal', 3, 1); A.G.run.next = { extraDrop: 1 }; }, A => winRoom(A), '건넬 전리품 줄(run.dropQ)도 저장');
check('보상 · 보물 방 상자 고르기', A => { newRun(A); room(A, 'treasure', 3, 1); }, A => winRoom(A), '상자(chestPend)를 보이기 전에 저장');
check('보상 · 상자에서 고른 뒤', A => { newRun(A); room(A, 'treasure', 3, 1); }, A => { winRoom(A); const S = A.G.sheet; if (S && S.kind === 'choice') click(A, 'choose', S.data.offer[0].uid); }, '고르면 giveItem이 저장');
check('보상 · 순찰대(소모품 셋 · 포인트)', A => { newRun(A); room(A, 'ambush', 5, 1); }, A => winRoom(A), 'patrolPend는 창 앞에서 저장');

// ===== 상점 · 진열 =====
check('상점 · 정산 뒤 상점 진열', A => { newRun(A); const run = A.G.run; run.room = 16; run.cur = A.ctx.fixedRoom(16); A.ctx.startSettle(run); A.G.scr = 'settle'; }, A => click(A, 'settleok'), '만들고 바로 저장');
check('상점 · 야영지 상인 진열 · 값 배율', A => { newRun(A); const run = A.G.run; run.room = 8; run.cur = A.ctx.fixedRoom(8); run.camp = null; }, A => A.ctx.vRunMap(), '처음 그릴 때 만들고 바로 저장');
check('상점 · 2챕터 암시장 고유', A => { newRun(A); room(A, 'market', 5, 2); delete A.G.run.cur.stock; }, A => A.ctx.vRunMap(), '처음 그릴 때 만들고 바로 저장');
check('상점 · 2챕터 암시장 꾸러미', A => { newRun(A); room(A, 'market', 5, 2); A.G.run.gold = 999; A.ctx.marketStock(A.G.run, A.G.run.cur); }, A => click(A, 'mkbuy', 'bundle'), '누를 때 굴리고 저장');
check('상점 · 3챕터 밀수꾼 좌판 고유', A => { newRun(A); room(A, 'smugstall', 5, 3); delete A.G.run.cur.stock; }, A => A.ctx.vRunMap(), '처음 그릴 때 만들고 바로 저장');
check('상점 · 봉인된 꾸러미(도박)', A => { newRun(A); const run = A.G.run; run.ch = 2; run.room = 16; run.cur = A.ctx.fixedRoom(16); A.ctx.startSettle(run); A.G.scr = 'settle'; click(A, 'settleok'); run.gold = 999; A.G.sheet = null; }, A => click(A, 'gamble', 'weapon'), '누를 때 굴리고 저장');

// ===== 다시 굴리기 =====
check('다시 굴리기(접사)', A => { newRun(A); const run = A.G.run; run.room = 16; run.cur = A.ctx.fixedRoom(16); A.ctx.startSettle(run); A.G.scr = 'settle'; click(A, 'settleok'); A.G.sheet = null; run.gold = 9999; const it = g8(A, 'gloves', 'r'); A.__k = it.uid + ':0'; }, A => click(A, 'reroll', A.__k), '누를 때 굴리고 저장');

// ===== 갈림길 · 문 =====
check('갈림길 · 길 셋의 다음 구간(지도)', A => { newRun(A); const run = A.G.run; run.room = 3; run.cur = { type: 'spring', floor: 3, ch: 1 }; }, A => click(A, 'rest'), 'advanceFloor가 만들고 저장');
check('갈림길 · 길을 고른 뒤 문', A => { newRun(A); const run = A.G.run; run.room = 3; run.cur = { type: 'spring', floor: 3, ch: 1 }; click(A, 'rest'); }, A => click(A, 'path', 'main'), 'choosePath가 저장');
check('문 · 옛 판(24층)을 옮기며 새로 만든 문', A => { newRun(A); const run = A.G.run; run.dgv = 2; run.room = 6; run.cur = null; run.doors = null; }, A => A.ctx.resumeRun(), '옮긴 뒤 바로 저장');
check('문 · 다음 층 문 셋',A => { newRun(A); const run = A.G.run; run.room = 5; run.cur = { type: 'spring', floor: 5, ch: 1 }; }, A => click(A, 'rest'), 'advanceFloor가 저장');

// ===== 소모품 =====
check('소모품 · 전투 밖에서 쓰기', A => { newRun(A); const run = A.G.run; A.ctx.consAdd(run, 'herb', 'n', 2); run.p.hp = 10; }, A => click(A, 'consuse', String(A.G.run.cons.findIndex(c => c.id === 'herb'))), '난수 없음 · 쓰고 바로 저장');

// ===== 두 탭 =====
function twoTabs() {
  for (const t of tabs) close(t); tabs.length = 0; store.clear();
  const out = [];
  { // 같은 상자를 두 탭이 고른다
    const A = open(seedN += 7); newRun(A); room(A, 'treasure', 3, 1); commit(A); winRoom(A);
    const B = reload(seedN += 7); const C = reload(seedN += 7); // A의 상자 창이 저장된 뒤 연 두 탭
    const off = B.G.sheet && B.G.sheet.kind === 'choice' ? B.G.sheet.data.offer : null;
    if (!off) out.push({ path: '두 탭 · 같은 상자', ok: false, how: '', why: '다시 연 탭에 상자가 없다' });
    else {
      click(B, 'choose', off[0].uid); const after = store.get(B.key);
      click(C, 'choose', off[1].uid); const cur = JSON.parse(store.get(B.key)).cur;
      const both = cur && cur.inv && cur.inv[off[0].uid] && cur.inv[off[1].uid], lost = !(cur && cur.inv && cur.inv[off[0].uid]);
      out.push({ path: '두 탭 · 같은 상자에서 각각 고르기', ok: !!C.G.tabStale && store.get(B.key) === after && !both && !lost, how: '늦은 탭은 storage 이벤트로 낡은 탭(저장 안 함)', why: !C.G.tabStale ? '늦은 탭이 낡은 탭이 되지 않았다' : both ? '두 장비가 모두 들어갔다' : lost ? '먼저 고른 장비가 덮였다' : '저장본이 바뀌었다' });
    }
  }
  { // 같은 이벤트를 두 탭이 누른다(늦은 탭의 결과가 먼저 탭의 결과를 덮어 다시 굴리지 못한다)
    for (const t of tabs) close(t); tabs.length = 0; store.clear();
    const A = open(seedN += 7); newRun(A); room(A, 'event', 3, 2, { event: 'lampshop' }); commit(A); close(A);
    const B = reload(seedN += 7), C = reload(seedN += 7);
    click(B, 'event', 'open'); const after = store.get(B.key); click(C, 'event', 'open');
    out.push({ path: '두 탭 · 같은 이벤트를 각각 누르기', ok: !!C.G.tabStale && store.get(B.key) === after, how: '늦은 탭은 저장하지 못한다', why: C.G.tabStale ? '늦은 탭이 저장했다' : '늦은 탭이 낡은 탭이 되지 않았다' });
    // 낡은 탭은 다시 불러오기만 받는다
    click(C, 'tabreload'); out.push({ path: '두 탭 · 낡은 탭의 다시 불러오기', ok: !!C.reloaded, how: 'tabreload → location.reload()', why: '다시 불러오지 않았다' });
  }
  { // 뒤로 가기로 되살아난 탭(bfcache): storage 이벤트를 못 받았어도 pageshow에서 저장본과 맞춰 본다
    for (const t of tabs) close(t); tabs.length = 0; store.clear();
    const A = open(seedN += 7); newRun(A); room(A, 'event', 3, 2, { event: 'lampshop' }); commit(A); close(A);
    const B = reload(seedN += 7), C = reload(seedN += 7); C.alive = false; // C는 얼어 있다(이벤트를 못 받음)
    click(B, 'event', 'open'); const after = store.get(B.key); C.alive = true;
    for (const f of C.on.pageshow || []) f({ persisted: true });
    click(C, 'event', 'open');
    out.push({ path: '뒤로 가기 · 되살아난 탭(bfcache)', ok: !!C.G.tabStale && store.get(B.key) === after, how: 'pageshow에서 저장본과 다르면 낡은 탭', why: C.G.tabStale ? '되살아난 탭이 저장했다' : '되살아난 탭이 낡은 탭이 되지 않았다' });
  }
  return out;
}
try { R.push(...twoTabs()); } catch (e) { R.push({ path: '두 탭', ok: false, how: '', why: '예외 ' + e.message.slice(0, 120) }); }

const bad = R.filter(x => !x.ok);
console.log('| 경로 | 새로 고침 · 두 탭 | 막는 방법 |'); console.log('|---|---|---|');
for (const x of R) console.log('| ' + x.path + ' | ' + (x.ok ? '같은 결과' : '다시 굴림 (' + x.why + ')') + ' | ' + x.how + ' |');
console.log('reroll-check: 경로 ' + R.length + '개 · 다시 굴릴 수 있는 자리 ' + bad.length + ' (' + path.basename(dir) + ')');
process.exit(bad.length ? 1 : 0);
