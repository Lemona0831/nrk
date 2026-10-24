'use strict';
/* 적 문법 점검 (0.8.0 A0, 1막 재설계 ① 적 문법 엔진 · data/foes.js · js/30-enemy-ai.js)
   1. 정의: 등급별 패턴 수(2~4, 보스는 단계마다) · 예고 문장 · 대답 태그 · 기록 문장(log.see · log.down) 빠짐 · 무리마다 "누구부터"(SQUAD_ASK)
   2. 문법 ①: 예고한 행동 = 실행한 행동(끊기 · 무너짐 · 단계 전환으로 취소된 것만 예외). 전투 N번(기본 1000)에서 teleMis 0이어야 한다
   3. 문법 ②: 대답할 수 없는 예고 0. 문법을 아직 켜지 않은 챕터(FOE_GRAMMAR)는 teleVoid 기록을, 켠 챕터는 teleSkip(바꿔 고름)을 센다
   1-1. G-1 강적 시계: 강적마다 FOE_CLOCK 정의 · 마지막 경고 · 파국 · 답 태그 2종류 이상(내용은 비공개 문서 참조). 전투에서는 경고 없이 온 파국 0
   4. 갑옷 · 방패 단위 시험, 챕터 장치 틀(가짜 장치를 잠깐 꽂아 훅 다섯 · 칩 · 도움말이 도는지 보고 뺀다)
   쓰기: node tools/foe-check.js [--fights 1000] [--ch 1]. 위반이 있으면 표를 찍고 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.'; { const i = process.argv.indexOf('--ch'); if (i > 0 && +process.argv[i + 1] > 1) process.env.DG_FROM = process.argv[i + 1]; } // dgqa가 읽어 들일 때 DG_FROM을 고정하므로 require 전에(그 챕터에서 시작)
const H = require('./uqtest/_h.js'); const { E, R_, D } = H;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NF = +arg('--fights', 1000), CH = +arg('--ch', 1);
const FOES = R_('FOES'), TELE_T = R_('TELE_T'), TELE_WAIT = R_('TELE_WAIT'), TELE_MOVE = R_('TELE_MOVE'), SQUADS = R_('SQUADS'), SQUAD_ASK = R_('SQUAD_ASK'), FOE_GRAMMAR = R_('FOE_GRAMMAR'), FOE_CLOCK = R_('FOE_CLOCK');
const V = []; const bad = (kind, id, what) => V.push({ kind, id, what });
if (CH === 2) R_('ch2ClockReg')(); // G-1: 2챕터도 같다(첫 2챕터 전투 ch2Setup에서 들어간다)
if (CH === 3) R_('w3ClockReg')(); // G-1: 3챕터 시계 정의는 js/25보다 먼저 읽혀 첫 3챕터 전투(w3Setup)에서 FOE_CLOCK에 들어간다. 정의 점검 전에 넣는다

/* 1. 정의 */
const grade = {};
for (const id in FOES) {
  const F = FOES[id]; if ((F.ch || 1) !== CH || F.unused) continue;
  const pats = Array.isArray(F.pat) ? [F.pat] : Object.values(F.pat || {}); const moves = p => new Set(p.map(k => TELE_MOVE[k] || k)).size; // 모으기 → 큰 한 방 같은 것은 한 수
  (grade[F.grade] = grade[F.grade] || []).push(id + ' ' + pats.map(moves).join('/') + (F.phInherit ? '(3단계는 1단계 순환 + 희생)' : '') + (F.elite ? ' + 필살기 ' + F.elite.n : ''));
  if (F.grade === 'strong') { const K = FOE_CLOCK[id]; if (!K) bad('시계', id, '없음'); else { if (typeof K.warn !== 'function') bad('시계', id, '마지막 경고 없음'); if (typeof K.doom !== 'function') bad('시계', id, '파국 없음'); if (!(K.max >= 2)) bad('시계', id, '칸 ' + K.max); if (new Set(K.ans || []).size < 2) bad('시계', id, '답 태그 ' + new Set(K.ans || []).size + '종류(2 이상)'); } }
  if (F.grade === 'strong') { if (pats[0].length < 4) bad('패턴 수', id, '강적 ' + pats[0].length + '개(4 이상)'); }
  else for (const p of pats) if (F.grade !== 'add' && (moves(p) < (F.grade === 'boss' ? 1 : 2) || moves(p) > 4)) bad('패턴 수', id, moves(p) + '수(2~4)');
  if (F.grade === 'elite' && !(F.elite && F.elite.ult && F.elite.ult.length)) bad('정예 필살기', id, '없음');
  if (F.elite) for (const k of F.elite.ult) if (!(F.tele && F.tele[k]) && !TELE_T[k]) bad('예고 문장', id, k);
  for (const k of new Set(pats.flat())) {
    if (!(F.tele && F.tele[k]) && !TELE_T[k]) bad('예고 문장', id, k);
    const A = F.ans && F.ans[k]; if (!Array.isArray(A) || (!A.length && k !== 'none' && !TELE_WAIT.includes(k))) bad('대답 태그', id, k);
  }
  if (F.grade !== 'add') for (const f of ['see', 'down']) if (!(F.log && F.log[f])) bad('기록 문장', id, 'log.' + f);
}
for (const s of SQUADS) if ((s.ch || 1) === CH && !SQUAD_ASK[s.id]) bad('누구부터', s.id, 'SQUAD_ASK 없음');

/* 2 · 3. 전투 N번 */
const seen = new WeakMap(); let fights = 0, last = null; const cnt = { teleMis: {}, teleVoid: {}, teleSkip: {} }; let eact = 0; const dev = { prayStart: 0, prayDone: 0, prayCut: 0 }; const clk = { add: 0, warn: 0, doom: 0, back: 0, noWarn: {} }, clkOpen = new WeakMap();
const scan = b => { if (!b || !b.rec) return; let i = seen.get(b) || 0; for (; i < b.rec.length; i++) { const r = b.rec[i]; if (r.k === 'eact') eact++; if (dev[r.k] != null) dev[r.k]++; if (/^clk/.test(r.k)) { const o = clkOpen.get(b) || {}; clkOpen.set(b, o); if (r.k === 'clk') clk.add++; else if (r.k === 'clkback') clk.back++; else if (r.k === 'clkwarn') { clk.warn++; o[r.foe] = 1; } else if (r.k === 'clkdoom') { clk.doom++; if (!o[r.foe]) clk.noWarn[r.foe] = (clk.noWarn[r.foe] || 0) + 1; o[r.foe] = 0; } } if (cnt[r.k]) { const key = (r.foe || r.role) + ' ' + (r.from || r.i) + (r.to ? '→' + r.to : '') + (r.tags != null ? ' (쓸 수 있던 대답: ' + r.tags + ')' : ''); cnt[r.k][key] = (cnt[r.k][key] || 0) + 1; } } seen.set(b, i); };
D.OPT.onTurn = G => { const b = G.b; if (b !== last) { if (last) scan(last); last = b; fights++; } }; D.OPT.chapters = 1;
const CLS = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'], PK = ['careful', 'casual', 'expert', 'basic'];
for (let s = 0; fights < NF && s < 400; s++) for (const c of CLS) { if (fights >= NF) break; try { D.playChar(PK[s % PK.length], c, 5000 + 13 * s); } catch (e) { bad('판 예외', c, String(e && e.message).slice(0, 80)); } }
if (last) scan(last); D.OPT.onTurn = null;
const sum = o => Object.values(o).reduce((a, x) => a + x, 0);
for (const k in cnt.teleMis) bad('문법 ①', k, cnt.teleMis[k] + '번');
for (const k in cnt.teleVoid) bad('문법 ②', k, cnt.teleVoid[k] + '번');
for (const k in clk.noWarn) bad('시계 문법', k, '경고 없이 온 파국 ' + clk.noWarn[k] + '번');

/* 4-1. 갑옷 · 방패 */
const T = []; const t = (c, m) => { if (!c) T.push(m); };
{
  const f = H.fight('warden', { en: ['bruiser'], setup: (run, es) => { es[0].armor = 3; es[0].shield = 0; es[0].shieldMax = 0; } }); const b = f.b, e = f.es[0]; b.cur = null;
  let h0 = e.hp; E.hurtEnemy(b, e, 12, { single: 1 }); t(Math.abs(h0 - e.hp - 9) < 1e-6, '갑옷 3: 12 → 9가 아니라 ' + (h0 - e.hp));
  h0 = e.hp; E.hurtEnemy(b, e, 3, { single: 1 }); t(Math.abs(h0 - e.hp - 1) < 1e-6, '갑옷 3: 3 → 1(1/3)이 아니라 ' + (h0 - e.hp));
  h0 = e.hp; E.hurtEnemy(b, e, 6, { dot: 1 }); t(Math.abs(h0 - e.hp - 6) < 1e-6, '지속 피해는 갑옷 무시: 6이 아니라 ' + (h0 - e.hp));
  t(R_('foeASHtml')(b, e).includes('farm'), '갑옷 칩이 없다');
  e.brk = e.brkMax - 0.5; E.addBreak(b, e, 50); t(e.armorOff === 1, '무너졌는데 갑옷이 그대로');
  h0 = e.hp; E.hurtEnemy(b, e, 12, { single: 1 }); t(h0 - e.hp > 11.9, '벗겨진 뒤에도 갑옷이 깎는다: ' + (h0 - e.hp));
}
{
  const f = H.fight('warden', { en: ['bruiser'], setup: (run, es) => { es[0].armor = 0; es[0].shield = es[0].shieldMax = 3; } }); const b = f.b, e = f.es[0]; b.cur = null;
  b.actN = 100; let h0 = e.hp; E.hurtEnemy(b, e, 10, { single: 1 }); t(e.hp === h0 && e.shield === 2, '방패: 한 적 공격을 막고 한 겹(' + e.shield + ')');
  E.hurtEnemy(b, e, 10, { single: 1 }); t(e.hp === h0 && e.shield === 2, '방패: 막은 행동의 둘째 타격도 막고 겹은 그대로(' + e.shield + ')');
  b.actN = 101; h0 = e.hp; E.hurtEnemy(b, e, 10, { aoe: 1 }); t(e.hp < h0 && e.shield === 2, '방패: 광역은 지나간다');
  h0 = e.hp; E.hurtEnemy(b, e, 5, { dot: 1 }); t(e.hp < h0 && e.shield === 2, '방패: 지속 피해는 지나간다');
  b.actN = 102; b.cur = { id: 'heavy' }; E.hurtEnemy(b, e, 10, { single: 1 }); b.cur = null; t(e.shield === 0, '방패: 강공격은 두 겹(' + e.shield + ')');
  t(R_('foeASHtml')(b, e).includes('fshd'), '방패 칸이 없다');
  const f2 = H.fight('warden', { en: ['bruiser'] }); t(R_('foeASHtml')(f2.b, f2.es[0]) === '', '1챕터 적에게 갑옷 · 방패 칩이 보인다');
}
/* 4-2. 챕터 장치 틀 */
const CHD = R_('CH_DEVICE'); const fired = {}; const hooks = ['onRoomStart', 'onRoundEnd', 'onFoeBreak', 'onFoeDown', 'onRoomEnd'];
const REAL = CHD[CH]; t(CHD[3] === R_('ALARM_DEV'), '3챕터 장치가 「경보」가 아니다'); t(CHD[2] === R_('LAMP_DEV'), '2챕터 장치가 「등불」이 아니다');
CHD[CH] = { id: 'test', n: '시험 장치', help: '시험용 도움말 한 줄', chip: b => 'T' + (b.tick || 0) }; for (const h of hooks) CHD[CH][h] = () => { fired[h] = (fired[h] || 0) + 1; };
let chip = '', help = null; D.OPT.onTurn = G => { if (!chip) chip = R_('chDevChip')(G.b); if (help == null) { const g = R_('G'); const gb = g.b; g.b = G.b; help = R_('infoHtml') ? String(R_('infoHtml')('chdev') || '') : ''; g.b = gb; } };
try { D.playChar('careful', 'warden', 5000); } catch (e) { T.push('가짜 장치 판 예외: ' + e.message); } D.OPT.onTurn = null;
CHD[CH] = REAL;
for (const h of hooks) t(fired[h] > 0, '장치 훅이 불리지 않았다: ' + h);
t(chip.includes('시험 장치'), '장치 칩이 그려지지 않았다'); t(help.includes('시험용 도움말 한 줄'), '장치 도움말 한 줄이 보이지 않는다');
t(R_('chDevOf')({ ctx: { ch: CH } }) === REAL, '가짜 장치를 뺀 뒤 ' + CH + '챕터 장치가 돌아오지 않았다');
/* 4-3. 1챕터 장치 「끝나지 않은 기도」(A1) */
if (CH === 1) {
  const PD = R_('PRAYER_DEV'), DP = R_('DEV_PRAYER'); t(REAL === PD, '1챕터 장치가 끝나지 않은 기도가 아니다');
  const mk = () => { const f = H.fight('warden', { en: ['bruiser', 'archer', 'darkmage'], hp: 100 }); f.b.ctx.room = 'normal'; f.b.ctx.floor = 5; f.b.rngF = () => 0; PD.onRoomStart(f.b); return f; };
  { const f = mk(), b = f.b, dm = f.es[2]; t(b.prayer && b.prayer.id === dm.id && dm.praying, '기도: 후열의 검은 기도사가 먼저 뽑히지 않았다');
    t(PD.chip(b) === '0/' + DP.need, '기도 칩 글이 "0/3"이 아니다(장치 이름 「끝나지 않은 기도」 뒤에 붙음, M8): ' + PD.chip(b));
    for (let k = 0; k < DP.need; k++) PD.onRoundEnd(b); t(b.prayer.done && f.es.every(e => Math.abs(e.barrier - Math.round(e.hpMax * DP.ward)) < 1e-6), '기도 완성: 적 모두 보호막 15%가 아니다');
    const e0 = f.es[0], h0 = e0.hp, bar = e0.barrier; b.cur = null; E.hurtEnemy(b, e0, bar + 5, { single: 1 }); t(Math.abs(h0 - e0.hp - 5) < 1e-6 && !(e0.barrier > 0), '보호막이 피해를 먼저 받지 않는다');
    PD.onRoundEnd(b); t(f.es[1].barrier === Math.round(f.es[1].hpMax * DP.ward), '보호막이 두 번 생겼다(한 번만)'); }
  { const f = mk(), b = f.b, dm = f.es[2]; const g0 = H.G.run.gold || 0; dm.brk = dm.brkMax - 0.5; E.addBreak(b, dm, 50); t(b.prayer.cut && !dm.praying && (H.G.run.gold || 0) === g0 + DP.gold, '무너뜨려 끊기: 끊기지 않았거나 골드 +5가 아니다');
    PD.onRoundEnd(b); PD.onRoundEnd(b); PD.onRoundEnd(b); t(!f.es.some(e => e.barrier > 0), '끊긴 뒤에도 기도가 찬다'); }
  { const f = H.fight('warden', { en: ['bruiser', 'archer'] }); f.b.ctx.room = 'normal'; f.b.ctx.floor = 1; f.b.rngF = () => 0; PD.onRoomStart(f.b); t(!f.b.prayer, '1층에서 기도가 시작됐다'); }
  { const f = H.fight('warden', { en: ['bruiser', 'archer'] }); f.b.ctx.room = 'ambush'; f.b.ctx.floor = 5; f.b.rngF = () => 0; PD.onRoomStart(f.b); t(!f.b.prayer, '일반 방이 아닌 곳에서 기도가 시작됐다'); }
}

/* 4-4. 2챕터(A2): 어둠 · 거래 · 빚 · 등불 · 대형 · 정예 접사 */
if (CH === 2) {
  const fight2 = (en, setup) => { const f = H.fight('warden', { en, hp: 300, setup }); f.b.ctx.ch = 2; f.b.ctx.mods = f.b.ctx.mods || []; f.b.cur = null; return f; };
  { const f = fight2(['dun', 'xbow']); const b = f.b, xb = f.es[1]; b.ctx.mods.push('dark'); xb.intent = { k: 'aim' }; const t1 = R_('intentText0')(b, xb).t; xb.intent = { k: 'evade' }; const t2 = R_('intentText0')(b, xb).t;
    t(/숨을 들이쉰다/.test(t1), '어둠: 후열 큰 공격이 소리로 보이지 않는다(' + t1 + ')'); t(/보이지 않는다/.test(t2), '어둠: 후열 작은 행동이 보인다(' + t2 + ')');
    const bg = R_('intentBadge0')(b, xb); t(bg.txt === '어둠에 가려 안 보임', '어둠: 후열 아이콘이 보인다'); }
  { const f = fight2(['fence', 'thug'], (run, es) => { es[0].strong = true; es[0].foe = 'merchant'; }); const b = f.b; b.trade = 'ask'; const L = E.actionList(b); t(L[0].id === 'tradeyes' && L.some(a => a.id === 'tradeno') && L.filter(a => a.ok).length === 2, '거래창: 받기 · 거절만 고를 수 있어야 한다');
    R_('ch2PlayerAct')(b, 'tradeyes'); t(b.trade === 'yes' && b.tradeHp === 1, '거래를 받았는데 표시가 없다'); const e = f.es[1]; const h0 = e.hp; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 10, { single: 1 }); b.cur = null; t(Math.abs(h0 - e.hp - 12) < 0.01, '거래: 주는 피해 +20%가 아니다(' + (h0 - e.hp) + ')'); }
  { const f = fight2(['dun', 'thug'], (run, es) => { es[0].strong = true; es[0].foe = 'ledger'; }); const b = f.b, e = f.es[0]; e.clk = null; E.fcInit(b, e); const W = e.clk.max - 1; e.clk.n = W; H.G.run.gold = 100; R_('ch2PlayerAct')(b, 'paydebt'); t(e.clk.n === 0 && H.G.run.gold === 70, '빚 장부 시계(G-1 2판): 마지막 경고 칸에서 갚기가 맞지 않다 ' + e.clk.n); e.clk.n = W; e.brk = e.brkMax - 0.5; E.addBreak(b, e, 50); t(e.clk.n === 0, '빚 장부 시계(G-1): 무너뜨렸는데 칸이 남았다'); } // 시계 단위 시험은 tools/clock-ch2-check.js
  { const f = fight2(['dun', 'thug', 'xbow'], (run, es) => { es[0].strong = true; es[0].foe = 'captain'; }); const b = f.b; b.capForm = 1; b.formBroken = 0; const cap = f.es[0], th = f.es[1]; cap.clk = null; E.fcInit(b, cap); const W = cap.clk.max - 1; cap.clk.n = W; let h0 = cap.hp; E.hurtEnemy(b, cap, 10, { single: 1 }); t(h0 - cap.hp > 9.9, '대형(G-1): 대장이 받는 피해가 줄어든다'); th.brk = th.brkMax - 0.5; E.addBreak(b, th, 50); t(b.formBroken === 1 && cap.clk.n === W - 1, '대형(G-1 3판): 덩치가 무너지면 대형이 깨지고 칸은 1칸만 ' + cap.clk.n); } // 시계 단위 시험은 tools/clock-ch2-check.js
  { const f = fight2(['dun']); const b = f.b; const bd = f.es[0]; bd.role = 'boss'; bd.boss = 'bardo'; R_('bardoSetup')(b, bd); const L = b.en.filter(x => x.role === 'lantern'); t(L.length === 5 && L.every(x => x.lit), '바르도: 등불 다섯이 켜진 채 시작하지 않는다'); const l = L[0]; l.brk = l.brkMax - 0.5; E.addBreak(b, l, 50); t(!l.lit && l.alive && bd.relightNext === 1, '등불을 깨면 꺼지고 바르도가 다시 켜려 해야 한다'); t(!R_('realFoe')(l), '등불이 적으로 세어진다(전투가 끝나지 않는다)'); }
  { const f = fight2(['dun', 'dun'], (run, es) => { es[0].cmd = 1; }); const b = f.b; t(Math.abs(R_('ch2FoeOut')(b, f.es[1]) - 1.15) < 1e-9, '지휘: 같은 무리 잡몹 피해 +15%가 아니다'); E.hurtEnemy(b, f.es[0], 9999, { single: 1 }); t(f.es[1].stun >= 1, '지휘하던 정예가 쓰러졌는데 무리가 흔들리지 않는다'); }
  { const f = fight2(['dun']); const b = f.b; b.ctx.mods.push('oilfloor'); const n0 = R_('st')(b.p, 'ignite'); E.addS(b, b.p, 'ignite', 2); t(R_('st')(b.p, 'ignite') - n0 === 3, '기름 바닥: 화상 +1이 아니다'); }
}
/* 4-5. 3챕터(A3): 갑옷 값 · 경보 · 종 표식 · 잠식 · 틈 · 성벽 위 · 강적 */
if (CH === 3) {
  const fight3 = (en, ctx, setup) => { const f = H.fight('warden', { en, hp: 300, setup, ctx: Object.assign({ ch: 3, floor: 10, mods: [] }, ctx || {}) }); f.b.cur = null; return f; };
  const AD = R_('ALARM_DEV'), AL = R_('ALARM'), X3 = R_('CH3X');
  { const f = fight3(['pike', 'wallguard', 'rioter', 'tenman']); const b = f.b; for (const e of f.es) { e.armor = null; R_('foeAS')(b, e); }
    const [pk, wg, ri, tm] = f.es; const L = R_('w3Armor')(b, 'light'), Hh = R_('w3Armor')(b, 'heavy');
    t(L > 0 && Hh > L, '갑옷 값: 가벼움 ' + L + ' · 무거움 ' + Hh);
    t(pk.armor === L && pk.shieldMax === 0, '장창병: 가벼운 갑옷만이 아니다'); t(wg.armor === 0 && wg.shieldMax === 2, '수비병: 방패 2겹만이 아니다'); t(ri.armor === 0 && ri.shieldMax === 0, '폭도에게 갑옷 · 방패가 있다'); t(tm.armor === L && tm.shieldMax === 2, '십인장: 갑옷 + 방패 2겹이 아니다'); }
  { const f = fight3(['pike', 'rioter']); const b = f.b; f.es[0].elite = true; R_('w3Setup')(b, { floor: 10, path: 'main', lv: 12 });
    t(b.al.on && b.al.next === AL.first, '경보: 4라운드 끝이 아니다(' + b.al.next + ')'); t(b.bellMark === f.es[0].id, '종 표식: 정예가 아니다');
    const n0 = b.en.length; b.tick = 3; AD.onRoundEnd(b); t(b.en.length === n0, '경보: 3라운드에 울렸다'); b.tick = 4; AD.onRoundEnd(b); t(b.en.length === n0 + 1 && b.al.n === 1 && b.al.next === 7, '경보: 4라운드 끝 증원 하나 · 다음 7이 아니다');
    for (const k of [7, 10, 13, 16]) { b.tick = k; AD.onRoundEnd(b); } t(b.al.n === AL.cap && b.en.length === n0 + AL.cap, '경보 상한 3이 아니다(' + b.al.n + ')'); }
  { const f = fight3(['pike', 'rioter']); const b = f.b; R_('w3Setup')(b, { floor: 10, path: 'rough', lv: 12 }); t(b.al.next === AL.rough, '망루 길: 3라운드 끝이 아니다');
    const mk = b.en.find(e => e.id === b.bellMark); AD.onFoeBreak(b, mk); AD.onFoeBreak(b, mk); t(b.al.next === AL.rough + 1, '종 표식: 무너지면 +1라운드(한 번만)가 아니다(' + b.al.next + ')'); }
  { const f = fight3(['pike']); const b = f.b; R_('w3Setup')(b, { floor: 10, path: 'main', strong: '봉화대장', foe: 'beaconlord', lv: 12 }); t(!b.al.on, '강적 방에 경보가 있다'); }
  { const f = fight3(['pike', 'rioter']); const b = f.b, e = f.es[0]; R_('taintAdd')(b, e, 9, null); t(e.taint === X3.taintCap, '잠식 상한 5가 아니다'); e.taint = 3; t(Math.abs(R_('w3FoeOut')(b, e) - 1.3) < 1e-9, '잠식 3: 적 피해 ×1.3이 아니다'); b.p.taint = 2; t(Math.abs(R_('w3InMul')(b, {}) - 1.2) < 1e-9, '내 잠식 2: 받는 피해 ×1.2가 아니다'); b.p.taint = 0; }
  { const f = fight3(['pike', 'rioter'], { mods: ['rift'] }); const b = f.b; R_('w3Tick')(b, 1); t(f.es.some(e => e.taint === 1), '재액의 틈: 라운드 끝 잠식이 없다'); R_('w3PlayerAct')(b, 'sealrift'); const s0 = f.es.reduce((a, e) => a + (e.taint || 0), 0); R_('w3Tick')(b, 2); t(f.es.reduce((a, e) => a + (e.taint || 0), 0) === s0, '틈을 막았는데 잠식이 번진다');
    t(!E.actionList(b).some(a => a.id === 'sealrift'), '막은 뒤에도 틈 막기가 보인다'); }
  { const f = fight3(['pike', 'wallxbow'], { mods: ['wall'] }); const b = f.b; const xb = f.es[1]; xb.armor = 0; xb.shield = xb.shieldMax = 0; xb.evading = 0; b.cur = null; const h0 = xb.hp; E.hurtEnemy(b, xb, 10, { single: 1 }); t(Math.abs(h0 - xb.hp - 8) < 0.01, '성벽 위: 후열 직접 피해 −20%가 아니다(' + (h0 - xb.hp) + ')'); }
  { const f = fight3(['bellman', 'rioter', 'rioter']); const b = f.b, s = f.es[0]; s.strong = true; s.foe = 'speaker'; t(Math.abs(R_('w3HitMul')(b, s, {}) - 0.4) < 1e-9, '대변인: 폭도 둘이면 받는 피해 −60%가 아니다'); }
  { const f = fight3(['wallxbow']); const b = f.b, s = f.es[0]; s.strong = true; s.foe = 'marksman'; b.cur = { id: 'basic' }; t(Math.abs(R_('w3HitMul')(b, s, {}) - 0.5) < 1e-9, '명사수: 근접 −50%가 아니다'); t(R_('w3HitMul')(b, s, { aoe: 1 }) === 1, '명사수: 광역도 줄었다'); b.cur = null; }
  { const f = fight3(['pike']); const b = f.b; const s = f.es[0]; s.strong = true; s.foe = 'beaconlord'; R_('w3Setup')(b, { floor: 10, strong: '봉화대장', foe: 'beaconlord', lv: 12 }); const L = b.en.filter(e => e.role === 'bonfire'); t(L.length === R_('FOE_X').beaconlord.fires && L.every(x => x.fuse === R_('FOE_X').beaconlord.fuse), '봉화 수 · 칸이 FOE_X와 다르다'); /* G-1 2판: 값은 FOE_X(비공개 문서 참조) */
    if (L.length === 3) { const h0 = b.p.hp; L[0].fuse = 1; R_('fcEv')(b, 'onRoomStart'); b.turnIdx = (b.turnIdx || 0) + 1; /* G-1: 마지막 경고 다음 차례에 터진다(tools/clock-ch3-check.js) */ R_('w3Act')(b, s, { k: 'pourbeacon' }, 10); t(!L[0].alive && b.p.hp < h0, '칸 0인 봉화가 터지지 않았다'); L[1].brk = L[1].brkMax - 0.5; E.addBreak(b, L[1], 50); t(!L[1].alive, '봉화가 붕괴로 부서지지 않았다'); } }
  t(!R_('isW3')({ ctx: { ch: 2 } }) && !R_('isW3')({ ctx: { ch: 1 } }) && R_('isW3')({ ctx: { ch: 3 } }), 'isW3가 3챕터만이 아니다');
}
/* 보고 */
console.log('foe-check (' + CH + '챕터): 적 ' + Object.keys(FOES).filter(id => (FOES[id].ch || 1) === CH).length + ' · 무리 ' + SQUADS.filter(s => (s.ch || 1) === CH).length + ' · 전투 ' + fights + ' · 적 행동 ' + eact);
for (const g in grade) console.log('  ' + g + ' 패턴 수: ' + grade[g].join(', '));
console.log('  문법 ① 예고 ≠ 실행: ' + sum(cnt.teleMis) + ' · 문법 ② 대답 없는 예고(기록만): ' + sum(cnt.teleVoid) + ' · 바꿔 고름: ' + sum(cnt.teleSkip) + (FOE_GRAMMAR[CH] ? '' : ' (이 챕터는 문법 ②를 아직 켜지 않음 — A1)'));
console.log('  강적 시계: 칸 ' + clk.add + ' · 되감기 ' + clk.back + ' · 마지막 경고 ' + clk.warn + ' · 파국 ' + clk.doom + ' · 경고 없이 온 파국 ' + sum(clk.noWarn));
if (CH === 1) console.log('  끝나지 않은 기도: 시작 ' + dev.prayStart + ' · 완성 ' + dev.prayDone + ' · 끊음 ' + dev.prayCut);
console.log('  갑옷 · 방패 · 장치 시험: 실패 ' + T.length + ' · 장치 훅 ' + hooks.map(h => h + ' ' + (fired[h] || 0)).join(' · '));
for (const m of T) console.log('  실패: ' + m);
if (V.length) { console.log('  위반 ' + V.length + ':'); console.log('  | 종류 | 대상 | 내용 |'); for (const v of V) console.log('  | ' + v.kind + ' | ' + v.id + ' | ' + v.what + ' |'); }
if (V.length || T.length) process.exit(1);
