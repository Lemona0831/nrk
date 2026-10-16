'use strict';
/* 0.6a.2 직업 (v2: 재사용 대기 스킬, 트리, 마나 없음) */
const isV2 = p => !!(p && BUILDS[p.build] && BUILDS[p.build].v2);
const CLASS_KEYS = () => Object.keys(BUILDS).filter(k => !BUILDS[k].tut && !BUILDS[k].soon && unlOpen(k)); // 고를 수 있는 직업 (수련장 견습생, 만드는 중인 직업, 아직 열리지 않은 숨겨진 직업 제외)
const ALL_CLASS_KEYS = () => Object.keys(BUILDS).filter(k => !BUILDS[k].tut && !BUILDS[k].soon); // 기록 · 결과 보기용(잠긴 직업도)
/* 숨겨진 직업 해금 (10월 7일): 계정 셈과 열림 (data/classes.js UNLOCK) */
const unlLocked = () => typeof UNLOCK === 'undefined' ? [] : Object.keys(UNLOCK).filter(k => BUILDS[k] && !BUILDS[k].soon && !unlOpen(k));
function unlData() { const d = G.data; if (!d.unl) d.unl = { c: {}, open: {} }; if (!d.unl.c) d.unl.c = {}; if (!d.unl.open) d.unl.open = {}; return d.unl; }
function unlOpen(k) { if (typeof UNLOCK === 'undefined' || !UNLOCK[k]) return true; const d = typeof G !== 'undefined' && G.data; return !!(d && (d.unlAll || (d.unl && d.unl.open && d.unl.open[k]))); }
/* 표식 도전 (data/dungeon.js MARKS, 10월 8일): 표식이 없으면 아래 도우미는 모두 아무 일도 하지 않는다 */
const markOn = (run, id) => !!(run && run.marks && run.marks.indexOf(id) >= 0);
const markPts = ids => (ids || []).reduce((a, k) => a + (MARKS[k] ? MARKS[k].pt : 0), 0);
function markEnemies(en, marks) {
  for (const e of en) {
    const f = e.role === 'boss' ? (marks.indexOf('boss') >= 0 ? MARKS.boss.hp : 1) : (e.summoned || e.role === 'root' || marks.indexOf('hp') < 0 ? 1 : MARKS.hp.hp);
    if (f !== 1) { e.hpMax = Math.round(e.hpMax * f); e.hp = Math.min(e.hpMax, Math.round(e.hp * f)); }
  }
}
function unlAdd(b, key, n) {
  if (typeof UNLOCK === 'undefined' || !Object.keys(UNLOCK).length || typeof G === 'undefined' || !G.data) return;
  if (b && b.ctx && (b.ctx.tut || b.ctx.scen || b.ctx.test)) return;
  const U = unlData(); U.c[key] = (U.c[key] || 0) + (n || 1);
  for (const k of Object.keys(UNLOCK)) {
    const L = UNLOCK[k]; if (U.open[k] || !BUILDS[k] || BUILDS[k].soon) continue;
    if ((L.need || []).some(x => (U.c[x.c] || 0) >= x.n)) { U.open[k] = Date.now(); (U.news = U.news || []).push(k); if (b) logp(b, 'crit', L.open || '숨겨진 직업이 열렸습니다'); toast(L.open || '숨겨진 직업이 열렸습니다'); }
  }
  saveLocal();
}
function unlNewsHtml() { const U = G.data && G.data.unl; if (!U || !U.news || !U.news.length) return ''; return U.news.filter(k => UNLOCK[k] && BUILDS[k]).map(k => `<p class="unlnews">🔓 ${esc(UNLOCK[k].open || '')} 새 직업 ${esc(BUILDS[k].n)}을(를) 고를 수 있습니다.</p>`).join(''); }
function unlNewsSeen() { const U = G.data && G.data.unl; if (U && U.news && U.news.length) { U.news = []; saveLocal(); } }
const SK2 = {}; for (const k in SKILLS2) for (const s of SKILLS2[k]) SK2[s.id] = s;
for (const s of TUT_SKILLS) SK2[s.id] = s; // 수련장 견습생의 스킬(data/tutorial.js)
/* 사라진 규칙(마나, 주문·캔트립, 옛 점화·냉각의 시간당 피해, 옛 직업 스킬)에 묶여 v2 직업에게 효과가 없는 장비 (npm run items, 10월 3일 06a2에서 발동 0).
   아이템 손보기(개편 기획 1절) 전까지 드롭과 상점에서 뺀다. 장비 점검(tools/itemcheck.js)은 그대로 이 장비들을 시험해 실패로 보인다 */
const V2_OFF = ['pilgstaff', 'candlestaff', 'acolyterelic', 'confwand', 'penwhip', 'monkrobe', 'oathplate', 'candlegloves', 'archerbracer', 'poisoner', 'viperskin', 'woodsymbol', 'worrybeads', 'ashmedal', 'obsidianring', 'lapisring', 'oathbreaker', 'thornrod', 'candlewick', 'hereticstaff', 'belllongbow', 'crowfeather', 'abysseye', 'tinring', 'siegering',
  // 10월 3일 더함: 마나만 주는 장비(마나가 없어 아무 일도 없다), 옛 독 격발·상흔 방출에만 붙는 잔향의 매듭, 생명력 플라스크가 지우지 않아 대가만 남는 역류의 성배,
  // 재사용 대기 때문에 같은 스킬을 이어 쓸 수 없는 메아리 반지, 출혈을 거는 수단이 쇠못 장갑뿐인 굽은 낫(출혈을 거는 직업이 들어오면 되돌린다)
  'silverwand', 'bonenecklace', 'bonecharm', 'herbflask', 'knot', 'chalice', 'echo', 'sickle'];
const V2_ON = { butcher: ['sickle'] }; // V2_OFF 가운데 그 직업에게는 되돌리는 장비 (굽은 낫: 출혈을 거는 직업)
/* 10월 15일 유산 1차 시제품: 유산으로 옮기면 차례 충전을 두 배로 만드는 공허의 반지를 드롭 · 상점에서 뺀다 (정화 플라스크는 같은 날 되살렸다) */
const YS_OFF = ['voidring'];
const poolOk = (p, k) => !(isV2(p) && YS_OFF.includes(k)) && !(isV2(p) && V2_OFF.includes(k) && !(V2_ON[p.build] || []).includes(k)) && !(ITEMS[k] && ITEMS[k].fits && !ITEMS[k].fits.includes(p.build)); /* fits: 그 직업에서만 일어나는 2챕터 장비 */
/* 10월 15일 유산 1차 시제품 (쿨타임을 대신한다, 설계안 2절 · data/classes.js YUSAN): 스킬은 유산(p.ys)을 쓴다. 전투를 가득 찬 채 시작하고,
   내 차례가 끝날 때 +1(가속 두 번째 차례는 빼고. 10월 16일부터 그 +1은 다음 내 차례가 시작될 때 들어온다: YUSAN.turnAtStart), 대응(막기 · 흘리기 · 무너뜨리기 · 끊기 · 먼저 치우기)에 성공하면 +1을 라운드에 한 번 받는다.
   라운드(b.ysR) = 내 차례 시작부터 다음 내 차례 시작 전까지(playerAct가 차례의 첫 행동에서 센다). 전투마다 1번(once)인 스킬은 쓰면 그 전투 동안 p.cd[id] = CD_USED로 남는다(p.cd는 이 표시에만 쓴다).
   🔄 쿨타임 당기기 · 처치 다시 쓰기는 "유산 +1, 라운드에 한 번"으로 바꿨다(1차 시제품 변환, ysRefund). 장비의 쿨타임 효과는 ysItem(라운드에 한 번) */
const CD_USED = 999;
function resetCharges(p) { p.cd = {}; p.cdJust = null; p.hsAt = {}; p.ys = YUSAN.start; p.pbuf = null; p.dodgeRed = 0; p.dodgeOn = null; if (p.build === 'spellblade') { p.sbLast = null; p.sbRun = 0; p.edge = null; } if (p.build === 'bloodmage') p.payCut = []; } // 마검사: 직전 종류 · 이어진 교대 · 칼은 전투마다 새로. 숨겨진 직업 3: 값 깎기도
const ysNow = p => p.ys == null ? YUSAN.start : p.ys;
/* 유산 더하기 (상한까지). src: turn · resp · refund · item · flask. g = 실제로 든 양(0이면 상한에 막혀 버려짐) */
function ysAdd(b, n, src, why) {
  const p = b.p; if (!isV2(p) || b.over) return 0; p.ys = ysNow(p); const y0 = p.ys; const g = Math.max(0, Math.min(n, YUSAN.cap - p.ys)); p.ys += g;
  if (b.rec) b.rec.push({ k: 'ys', t: r1(b.t), src, why, n, g, ys: p.ys, r: b.ysR || 0 });
  if (g > 0) logp(b, 'good', '유산 ' + y0 + ' → ' + p.ys + ' (+' + g + ', ' + why + ')'); // 10월 16일: 앞 → 뒤 값으로 (차례 충전도 적는다)
  return g;
}
/* 대응 +1: 라운드에 한 번(다섯 수단이 한도를 함께 쓴다). 상한에 막혀도 그 라운드의 대응으로 센다 */
function ysResp(b, why) { if (!b || !isV2(b.p) || b.over) return 0; const R = b.ysR || 0; if (b.ysRespR === R) return 0; b.ysRespR = R; return ysAdd(b, YUSAN.resp, 'resp', why); }
/* 🔄 · 처치 다시 쓰기 → 유산 +1, 라운드에 한 번 (10월 15일 1차 시제품 변환: 같은 갈래 쿨타임 −n · 바로 다시 쓰기를 대신한다) */
function ysRefund(b, why) { if (!b || !isV2(b.p) || b.over) return 0; const R = b.ysR || 0; if (b.ysRefR === R) return 0; b.ysRefR = R; return ysAdd(b, YUSAN.refund, 'refund', why); }
/* 장비의 "쿨타임이 가장 많이 남은 스킬 −1" → 유산 +1, 라운드에 한 번 (모든 장비가 한도를 함께 쓴다). 든 것이 없으면 0 */
function ysItem(b, why) { if (!b || !isV2(b.p) || b.over) return 0; const R = b.ysR || 0; if (b.ysItemR === R) return 0; const g = ysAdd(b, YUSAN.item, 'item', why || '장비'); if (g) b.ysItemR = R; return g; }
/* 유산을 깎는 효과(침묵의 종 · 독 거두는 손의 대가): 0 아래로 내려가지 않는다 */
function ysLose(b, n, why) { const p = b.p; if (!isV2(p)) return 0; p.ys = ysNow(p); const l = Math.min(n, p.ys); p.ys -= l; if (b.rec) b.rec.push({ k: 'ys', t: r1(b.t), src: 'lose', why, g: -l, ys: p.ys, r: b.ysR || 0 }); if (l) logp(b, 'bad', '유산 ' + (p.ys + l) + ' → ' + p.ys + ' (−' + l + ', ' + why + ')'); return l; }
/* 스킬 쓰기: 비용을 낸다(숨겨진 직업 3의 피로 당기기는 bmPull이 모자란 몫을 먼저 채운다) */
function ysSpend(b, s) { const p = b.p; const c = skCost(s); const w = b.ysPullW || 0; b.ysPullW = 0; const y0 = ysNow(p) - w; p.ys = Math.max(0, ysNow(p) - c); if (s.once) p.cd[s.id] = CD_USED; if (b.rec) b.rec.push({ k: 'yspend', t: r1(b.t), id: s.id, cost: c, ys: p.ys, r: b.ysR || 0 });
  logp(b, 'sys', '유산 ' + y0 + ' → ' + p.ys + ' (−' + (c - w) + (w ? ', 모자란 ' + w + '은(는) 피로' : '') + ', ' + s.n + ')'); } // 10월 16일: 쓴 유산도 앞 → 뒤로 적는다
const ysShort = (p, s) => Math.max(0, skCost(s) - ysNow(p)); // 모자란 유산
const ysUsed = (p, s) => !!(s.once && p.cd && p.cd[s.id] > 0); // 전투마다 1번 스킬을 이미 썼는가
/* 강공격 붕괴를 더하는 예고: 큰 행동(모으기 · 강타 · 영창 · 도화선 · 폭발 · 겨누기). 먼저 치우기는 data/classes.js YS_PRE_K */
const YS_BIG_K = ['charge', 'heavy', 'chant', 'chanting', 'burn', 'fuse', 'explode', 'aim'];
const ysBigTele = e => !!(e && e.alive && e.intent && (YS_BIG_K.includes(e.intent.k) || e.intent.aimed));
function ysPreKill(b, e) { // 먼저 치우기 (10월 15일 수정): 내 행동 중에, 이번 라운드 순서에 아직 남은(행동하지 않은) 적이 큰 예고(YS_PRE_K, 겨눈 한 발)를 한 채 쓰러짐
  if (!b.cur || !e.intent || !(YS_PRE_K.includes(e.intent.k) || e.intent.aimed) || e.pile || e.role === 'root' || e.role === 'bonewall') return;
  if (!(b.queue || []).includes(e.id) || (typeof darkHid === 'function' && darkHid(b, e))) return;
  ysResp(b, '먼저 치우기');
}
/* 내 차례 끝: 유산 +1 (상한에 막힌 양은 기록에 g 0으로 남는다). 10월 16일: turnAtStart면 그 +1(긴 전투는 +2)을 b.ysPend에 두었다가 다음 내 차례가 시작될 때 준다(ysTurnStart).
   유산은 내 차례에만 쓰므로 쓸 수 있는 양은 같다. 적 차례의 대응 충전은 그때 바로 든다(상한 5) */
function chargeEv(b, kind) { if (kind !== 'turn') return; b.ysTurnN = (b.ysTurnN || 0) + 1; const long = YUSAN.longFrom > 0 && b.ysTurnN >= YUSAN.longFrom; const n = YUSAN.turn + (long ? 1 : 0); if (YUSAN.turnAtStart) b.ysPend = n; else ysAdd(b, n, 'turn', '차례'); }
function ysTurnStart(b) { const n = b && b.ysPend; if (!n) return; b.ysPend = 0; ysAdd(b, n, 'turn', '차례'); } // 34-rounds-setup stepWorld가 내 차례에 닿을 때, playerAct 첫머리에서도(두 번 주지 않는다)
/* 전투 하나의 유산 요약 (판 기록 rooms[].ys, 기록 보내기 코드에도 남는다): s 시작 · e 끝 · use 쓴 합 · sp 비용별 횟수 · ids 스킬별 횟수 · ch 충전 출처별 든 양 · w 상한에 막힌 양 · pull 피로 당긴 유산 */
function ysSum(b) {
  if (!b || !b.p || !isV2(b.p) || !b.rec) return undefined; const o = { s: YUSAN.start, e: ysNow(b.p), use: 0, sp: {}, ids: {}, ch: {}, w: 0 };
  for (const x of b.rec) { if (x.k === 'yspend') { o.use += x.cost; o.sp[x.cost] = (o.sp[x.cost] || 0) + 1; o.ids[x.id] = (o.ids[x.id] || 0) + 1; }
    else if (x.k === 'ys') { const key = x.src === 'resp' ? x.why : x.src; o.ch[key] = (o.ch[key] || 0) + (x.g || 0); if (x.n > 0) o.w += Math.max(0, x.n - Math.max(0, x.g || 0)); }
    else if (x.k === 'bmpull') o.pull = (o.pull || 0) + (x.cd || 0); }
  return o;
} // 1차-b B: 그 전투의 longFrom번째 내 차례부터 +2 // 갈래 규칙(TREE2.haste)은 10월 3일에 없앴다. 다른 kind는 아무 일도 하지 않는다
/* 🔄 쿨타임 당기기 → 유산 +1 (라운드에 한 번). 부르는 곳은 그대로 두고 여기서 바꾼다 (10월 15일 1차 시제품 변환, n은 쓰지 않는다) */
function hastenBranch(b, br, n, exceptId) { return ysRefund(b, '🔄 ' + (br || '')); }
/* 1차-b C: 볼록한 비용당 값. 직업마다 비용 2 스킬의 한 번 값(skScore E 평균, 전투마다 1번 칸 제외)에 대한 비용 3 · 4의 비를 재고, 목표(3.3/2 · 4.8/2)에 모자라면
   그 직업의 비용 3 · 4 스킬 전부의 피해(dmg) · 붕괴(brk) · 중독(poison) · 적에게 거는 상태(st) 수치에 한 배율(1에서 convexCap)을 곱한다. 원래 fx는 s._fx0에 두고 다시 부르면 되돌린 뒤 다시 잰다 */
const YS_CONVEX_T = { 3: 3.3 / 2, 4: 4.8 / 2 };
function ysConvexApply() {
  for (const k in SKILLS2) for (const s of SKILLS2[k]) if (s._fx0) { s.fx = s._fx0; delete s._fx0; delete s.ysMul; }
  if (!YUSAN.convex) return;
  const sc = (e, m) => { const o = Object.assign({}, e); if (['dmg', 'brk', 'poison'].includes(e.k) && e.n > 0) o.n = Math.round(e.n * m); else if (e.k === 'st' && e.n > 0) o.n = Math.max(e.n, Math.round(e.n * m)); return o; };
  for (const k in SKILLS2) {
    const v = {}; for (const s of SKILLS2[k]) { if (s.once) continue; const c = skCost(s); (v[c] = v[c] || []).push(skScore(s).E); }
    const av = c => v[c] && v[c].length ? v[c].reduce((a, x) => a + x, 0) / v[c].length : NaN; const v2 = av(2); const mul = {};
    for (const c of [3, 4]) { const r = av(c) / v2; mul[c] = Number.isFinite(r) && r > 0 ? clamp(YS_CONVEX_T[c] / r, 1, YUSAN.convexCap) : 1; }
    for (const s of SKILLS2[k]) { const m = mul[skCost(s)]; if (!(m > 1)) continue; s._fx0 = s.fx; s.ysMul = Math.round(m * 1000) / 1000; s.fx = s.fx.map(e => sc(e, m)); }
  }
}
if (YUSAN.convex) ysConvexApply();
const HS_WHY = { poison: '독을 걸었다', kill: '적을 쓰러뜨렸다', parry: '흘려 냈다', break: '정예 이상을 무너뜨렸다' };
/* 스킬 트리 (개편 기획 4절): 포인트 1로 한 칸을 연다. 깊은 등급은 그 갈래에 먼저 쓴 포인트가 있어야 열린다(TREE_GATE). 연 스킬 가운데 4칸을 장착 */
function treeInit(run) { const T = TREE2[run.build]; if (!T) return; run.tree = run.tree || { pts: T.pts || 0, open: [], spent: {} }; }
const treeOwns = (run,id) => !!(run && (SKILLS2[run.build] || []).some(s => s.id === id));
/* 저장본 고치기: 스킬 데이터에서 빠진 칸(10월 3일 재사용 대기 개편: 짧은 격발 → 독 심기, 시작 스킬 바뀜)은 연 칸에서 지우고 포인트를 돌려준다 */
/* 능력치 다섯 전 저장본 (10월 4일): 체력 · 의지를 0으로 더하고, 처음 점수가 6 → 15로 는 몫(9점)을 다음 능력치 창에서 나누게 한다 */
function consFix(run) { if (run && !run.cons) run.cons = []; if (run && typeof consBagFix === 'function') consBagFix(run); } // 10월 14일: 소모품 가방 분리 이전
function statFix(run) {
  consFix(run); if (!run || !run.stats) return;
  if (run.stats.con == null) { run.stats.con = 0; run.stats.wil = 0; run.statPending = (run.statPending || 0) + (STAT_START - 6); run.statBase = STAT_START; if (run.p) applyStats(run.p, run.stats); }
  if (run.statBase !== STAT_START) { const old = run.statBase == null ? 15 : run.statBase; run.statPending = (run.statPending || 0) + Math.max(0, STAT_START - old); run.statBase = STAT_START; }
  if (run.statGrowth !== LV_POINTS) { const old = run.statGrowth == null ? 2 : run.statGrowth; run.statPending = (run.statPending || 0) + Math.max(0, LV_POINTS - old) * Math.max(0, (run.lv || 1) - 1); run.statGrowth = LV_POINTS; }
}
function treeFix(run) {
  const t = run.tree; if (!t) return;
  // 갈래 이름이 바뀌어도 기존 저장본의 투자 포인트를 이어받습니다.
  if (run.build === 'spellblade') { for (const [old, current] of [['피칼날', '혈인'], ['불칼', '염검'], ['주문갑', '마갑']]) { if (t.spent && Object.prototype.hasOwnProperty.call(t.spent, old)) { t.spent[current] = (t.spent[current] || 0) + t.spent[old]; delete t.spent[old]; } } }
  const ok = [...new Set(t.open.filter(id => treeOwns(run,id) && !SK2[id].start))]; const lost = t.open.length - ok.length;
  if (lost > 0) { t.open = ok; t.pts += lost; t.spent = {}; for (const id of ok) t.spent[SK2[id].b] = (t.spent[SK2[id].b] || 0) + 1; }
  run.skills = (run.skills || []).filter(id => ok.includes(id));
  // 포인트 = 레벨(만들 때 1 + 레벨마다 1, 기획서 12.2절). 0.6a.2-9까지는 1챕터를 깨면 2점을 더 주었다: 아직 쓰지 않은 포인트에서 넘친 몫을 거둔다
  const T = TREE2[run.build]; const over = t.pts + t.open.length - ((T && T.pts) || 1) - ((run.lv || 1) - 1);
  if (over > 0) t.pts = Math.max(0, t.pts - over);
  if (run.p) run.p.skills = v2Equip(run);
}
/* 장착: 시작 스킬(늘) + 트리에서 끼운 스킬(run.skills, 4칸까지) */
function v2Equip(run) { const T = TREE2[run.build]; return (T ? T.starters : []).concat((run.skills || []).filter(id => treeOwns(run,id) && run.tree && run.tree.open.includes(id) && !(T && T.starters.includes(id)))).slice(0, (T ? T.starters.length : 0) + EQUIP_SLOTS2); }
/* 사냥꾼 상급 줄 문턱(10월 9일 결정 59 나): 칸에 skip이 있으면 이어진 앞 칸 말고도 같은 갈래의 skip줄 이상 칸을 하나 열었을 때 열 수 있다. skip이 없는 칸(다른 직업)은 아무것도 달라지지 않는다 */
const treeSkipOk = (open, s) => !!(s.skip && open.some(x => SK2[x] && SK2[x].b === s.b && SK2[x].row >= s.skip && SK2[x].row < s.row));
function treeWhy(run, id) {
  const t = run.tree, s = SK2[id]; if (!t || !s) return '없는 스킬';
  if (!treeOwns(run,id)) return '이 직업의 스킬이 아닙니다';
  if (s.start) return '시작 스킬';
  if (t.open.includes(id)) return '이미 열림';
  if (s.par && !s.par.some(x => t.open.includes(x)) && !treeSkipOk(t.open, s)) return '이어진 앞 칸을 먼저 열어야 합니다';
  const chN = (typeof TREE_CH !== 'undefined' ? TREE_CH : {})[s.tier]; if (!chN) return '아직 열 수 없는 등급입니다'; if ((run.ch || 1) < chN) return `${chN}챕터부터 열립니다`; // 10월 3일 만든 사람 결정: 상급 3챕터, 궁극 5챕터. TREE_CH에 없는 등급은 잠근다(설정을 빠뜨려도 1챕터에 열리지 않게)
  const need = TREE_GATE[s.tier] || 0; const sp = t.spent[s.b] || 0;
  if (sp < need) return `${s.b} 갈래에 포인트 ${need}점을 먼저 써야 합니다 (지금 ${sp}점)`;
  if (t.pts < 1) return '포인트가 없습니다';
  return null;
}
/* 보이는 범위: full(다 보임), name(이름만), hidden(?). 기본과 부모가 열린 칸은 다 보이고, 궁극(tease)은 이름만 먼저 보인다 */
function treeVis(run, id) {
  const t = run.tree, s = SK2[id]; if (!t || !s || !treeOwns(run,id)) return 'hidden';
  if (s.start || t.open.includes(id) || !s.par || s.par.some(x => t.open.includes(x)) || treeSkipOk(t.open, s)) return 'full';
  return s.tease ? 'name' : 'hidden';
}
/* 되돌리기 (10월 3일 만든 사람 요청: 캐릭터를 만드는 동안에는 연 칸을 다시 뺄 수 있다). 남은 칸이 앞 칸·등급 조건을 그대로 지켜야 한다 */
function treeRefundWhy(run, id) {
  const t = run.tree, s = SK2[id]; if (!t || !s || !t.open.includes(id)) return '열리지 않은 칸';
  if (!G.creating) return '캐릭터를 만드는 동안에만 되돌릴 수 있습니다';
  const rest = t.open.filter(x => x !== id);
  for (const o of rest) { const so = SK2[o]; if (!so) continue;
    if (so.par && so.par.length && !so.par.some(x => rest.includes(x)) && !treeSkipOk(rest, so)) return so.n + '이(가) 이 칸에 이어져 있어 먼저 되돌려야 합니다';
    if (rest.filter(x => x !== o && SK2[x] && SK2[x].b === so.b).length < (TREE_GATE[so.tier] || 0)) return so.n + '의 등급 조건 때문에 먼저 되돌려야 합니다'; }
  return null;
}
function treeRefund(run, id) {
  const why = treeRefundWhy(run, id); if (why) return why; const s = SK2[id], t = run.tree;
  t.open = t.open.filter(x => x !== id); t.pts++; t.spent[s.b] = Math.max(0, (t.spent[s.b] || 0) - 1); run.skills = (run.skills || []).filter(x => x !== id);
  (run.treeLog = run.treeLog || []).push({ ch: run.ch || 1, room: run.room, id, refund: 1, t: Date.now() }); return null;
}
/* 트리 초기화 (10월 3일 만든 사람 결정: 상점에서 늘 살 수 있다. 능력치 다시 나누기보다 비싸게): 연 칸을 모두 닫고 포인트를 돌려준다. 끼운 트리 스킬도 빠진다(시작 스킬은 그대로).
   값 = 연 칸 수 × TREE_RESET.cell × 챕터 가격 배율(상점 장비 값과 같은 1.5^(챕터−1)). 되돌리는 칸만큼 내고, 칸 하나가 스킬 하나라 능력치 다시 나누기(레벨 × 10)보다 무겁다 */
const TREE_RESET = { cell: 25 };
function treeResetCost(run) { const n = (run.tree && run.tree.open.length) || 0; return Math.round(n * TREE_RESET.cell * Math.pow(1.5, (run.ch || 1) - 1)); }
function treeReset(run) { const t = run.tree; if (!t) return 0; const n = t.open.length; t.pts += n; t.open = []; t.spent = {}; run.skills = []; if (run.p) run.p.skills = v2Equip(run); (run.treeLog = run.treeLog || []).push({ ch: run.ch || 1, room: run.room, reset: n, lv: run.lv, t: Date.now() }); return n; }
function treeUnlock(run, id) { const why = treeWhy(run, id); if (why) return why; const s = SK2[id]; run.tree.pts--; run.tree.open.push(id); run.tree.spent[s.b] = (run.tree.spent[s.b] || 0) + 1; (run.treeLog = run.treeLog || []).push({ ch: run.ch || 1, room: run.room, id, lv: run.lv, t: Date.now() }); return null; }
