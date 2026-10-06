/* 특정 상황 50종으로 직업 스킬 균형을 잰다 (0.6a.2, 10월 3일 만든 사람 요청)
   06a2의 게임 코드를 그대로 돌리고(dgqa.js의 loadGame), 갈래마다 두 기둥(왼쪽 칸만 / 오른쪽 칸만 따라 내려간 빌드)을 Lv5·Lv10으로 만들어
   tools/situations.js의 50상황에서 싸운다. 전투 판단은 qa.js의 성향(기본 신중, PK=expert 등)을 쓴다.
   결과: 빌드·범주별 승률, 갈래 평균 차이, 기둥 차이, 갈래 성격(TREE2.profile)과 맞는지.
   실행: DGDIR=06a2 node tools/sitqa.js [상황마다 판 수=12] [직업=assassin]
   판 수 (10월 3일): 같은 코드를 씨앗만 바꿔 재면 6판은 범주 점수가 ±3쯤, 12판도 ±2쯤 흔들린다. 기준 ±4 근처의 칸은 12판 이상으로 본다
   기준 (docs/0.6a.2-암살자-스킬.md 1절):
     점수 = 이기면 40 + 남은 생명력 비율 × 40 + 빠르기 × 20(3라운드 안 20, 23라운드 0), 지면 0 (상황마다 판 평균)
     1) 갈래 평균 점수 차이 ≤ 6 (Lv5, Lv10 각각)
     2) 갈래의 강한 범주는 세 갈래 평균보다 +4 이상, 약한 범주는 −4 이하
     3) 같은 갈래의 두 기둥 차이 ≤ 10
     4) 직업 전체 약점은 직업 전체 평균보다 −4 이하
     5) 보스전 이길 수단 (10월 3일 만든 사람 원칙): 갈래마다 보스를 이기는 장착이 하나는 있다(두 기둥 가운데 하나라도 승률 50% 이상).
        난도가 높아도 이길 수단이 정해져 있으면 플레이어는 그 수단을 찾아 움직일 수 있다. 기본 장착이 문턱 아래면 연 스킬 4칸의 모든 조합을 싸워 본다 */
process.env.DGDIR = process.env.DGDIR || '06a2';
const D = require('./dgqa.js');
const Q = require('./qa.js');
const SITS = require('./situations.js'); const SIT_CH = +(process.env.SIT_CH || 1); const SIT = SIT_CH >= 2 ? SITS.SIT2 : SITS.SIT; const SIT_CATS = SITS.SIT_CATS; // 10월 7일: SIT_CH=2면 2챕터 50상황
const G0 = D.G0; const run_ = D.run_;
/* 기준 세기 (10월 3일): 50상황은 갈래끼리의 상대 균형을 재는 고정 시험이다. 던전 난이도(DIFF·보스 배수)를 바꿔도 기준이 움직이지 않게,
   균형을 맞춘 날의 세기(하층 체력 ×1.05·피해 ×0.9, 수도원장 ×6·피해 ×1.6)로 고정한다. 던전 전체 난이도는 dgqa.js로 따로 맞춘다.
   SIT_REAL=1이면 게임의 지금 세기 그대로 잰다(참고용) */
const SIT_REAL = !!process.env.SIT_REAL;
if (!SIT_REAL) run_('DIFF.lower = { hp: 1.05, dmg: 0.9 }; BOSSES.abbot.mult = 6; BOSSES.abbot.dmgMul = 1.6; if (typeof CHAPTERS !== "undefined" && CHAPTERS[2] && CHAPTERS[2].diff) CHAPTERS[2].diff.lower = { hp: 0.92, dmg: 0.62 };'); // 2챕터 기준 세기는 10월 7일 게임 값(하층 ×0.92 · ×0.62, 보스 군주도 그날 값)
const ENAMES = run_('typeof ENEMY_NAMES !== "undefined" ? ENEMY_NAMES : {}');
const MAIN = require.main === module; const MIX = {};
const TH = { cat: 0.04, parity: 0.06, col: 0.10, means: 0.5 }; // 기준 문턱 (점수 100점 만점): 강함 +4 이상·약함 −4 이하(세 갈래 평균 대비), 갈래 평균 차이 6 이하, 기둥 차이 10 이하
const N = +((MAIN && process.argv[2]) || 12); const CLS = (MAIN && process.argv[3]) || process.env.SIT_CLS || 'assassin'; const PK = process.env.PK || 'careful';
const LVS = SIT_CH >= 2 ? [7, 10] : [5, 10]; const MLV = SIT_CH >= 2 ? { 7: 7, 10: 9 } : { 5: +(process.env.MLV5 || 6), 10: +(process.env.MLV10 || 9) }; // 내 레벨 → 상황의 몬스터 레벨: 그 챕터 끝 몬스터 레벨(기획서 11.4절: 1챕터 1~4, 2챕터 5~8)보다 1~2 높게(점수가 너무 높으면 강점·약점이 묻힌다)
const SKL = G0.SKILLS2[CLS]; const T = G0.TREE2[CLS];

function buildOf(br, col, lv) {
  const open = [];
  for (let r = 1; r <= Math.min(lv, 10); r++) { const row = SKL.filter(s => s.b === br && s.row === r); if (row[col] || row[0]) open.push((row[col] || row[0]).id); }
  return { br, col, lv, open };
}
/* 끼울 4칸: 문에 보이는 적을 보고 고르는 사람처럼 (후열이 있으면 후열에 닿는 스킬, 셋 이상이면 광역, 강타형이 있으면 흘리기·끊기, 큰 적 하나면 터뜨리기) */
function equipFor(bd, sit) {
  const en = (sit.room.en || []).map(x => x[0]); const big = !!sit.room.boss || en.length <= 1 || !!sit.room.strong;
  const back = en.some(r => ['archer', 'healer', 'summoner'].includes(r)); const many = en.length >= 3; const heavy = en.includes('bruiser') || !!sit.room.boss || !!sit.room.strong; const boom = en.includes('bomber') || en.includes('pyre'); /* 10월 5일: 화형 사제도 끊는 스킬을 반긴다 */
  const has = (s, k) => s.fx.some(e => e.k === k);
  const val = id => { const s = G0.SK2[id]; let v = s.row;
    if (back && s.tgt === 'ranged') v += 6; if (many && (s.tgt === 'front' || s.tgt === 'all' || has(s, 'spread'))) v += 6; if (big && has(s, 'bigx')) v += 4;
    if (heavy && (has(s, 'parry') || has(s, 'parryBuff') || has(s, 'onParry') || has(s, 'cutx') || has(s, 'evade') || has(s, 'evadeCtr') || has(s, 'foresee') || s.fx.some(e => e.k === 'brk' && e.n >= 25))) v += 6; /* 10월 5일: 사냥꾼 피하기 · 예고 읽기도 */ if (boom && (has(s, 'cutx') || s.fx.some(e => e.k === 'brk' && e.n >= 25))) v += 4; if (big && (has(s, 'burst') || has(s, 'grow') || has(s, 'exploit') || has(s, 'lowx'))) v += 2;
    return v; };
  const pick = bd.open.slice().sort((a, c) => val(c) - val(a)).slice(0, G0.EQUIP_SLOTS2);
  // 독을 쓰는 스킬(터뜨리기·키우기·중독 비례)을 끼웠으면 독을 거는 스킬도 하나는 끼운다 (사람은 짝을 맞춘다)
  const pay = id => G0.SK2[id].fx.some(e => ['burst', 'grow', 'exploit', 'brkPer', 'spread', 'drain'].includes(e.k));
  const src = id => G0.SK2[id].fx.some(e => e.k === 'poison' && e.n >= 3);
  if (pick.some(pay) && !pick.some(src)) { const cand = bd.open.filter(id => src(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (cand) { const lo = pick.slice().sort((a, c) => val(a) - val(c))[0]; pick[pick.indexOf(lo)] = cand; } }
  // 파수꾼 (10월 4일): 보호막을 태우는 스킬이 보호막을 얻는 스킬보다 많으면 얻는 스킬로 바꾼다 (태울 보호막이 있어야 한다. 사람은 짝을 맞춘다)
  const burn = id => G0.SK2[id].fx.some(e => e.k === 'wardBurn'); const gain = id => G0.SK2[id].fx.some(e => e.k === 'ward' || e.k === 'wardFill');
  while (pick.filter(burn).length > Math.max(1, pick.filter(gain).length)) { const cand = bd.open.filter(id => gain(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) break; const lo = pick.filter(burn).sort((a, c) => val(a) - val(c))[0]; pick[pick.indexOf(lo)] = cand; }
  // 숨겨진 직업 1 (10월 7일): 나에게 출혈을 거는 스킬은 둘까지 (사람은 대가를 겹쳐 지지 않는다)
  const selfBl = id => G0.SK2[id].fx.some(e => e.k === 'meSt' && e.s === 'bleed');
  while (pick.filter(selfBl).length > 2) { const cand = bd.open.filter(id => !selfBl(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) break; const lo = pick.filter(selfBl).sort((a, c) => val(a) - val(c))[0]; pick[pick.indexOf(lo)] = cand; }
  // 숨겨진 직업 2 (10월 7일, 비공개 문서 F-3 4): 짐 비례 · 사함 칸을 끼우면 고행 칸 하나(상태를 거는 적이 둘 이상이면 빼도 됨), 보호 비례는 정화 칸과 짝,
  // 강화 · 소환 적이 있으면 벗기기 칸, 정화 · 옮기기 칸은 넷 가운데 둘까지 (시작 스킬 고해가 이미 지운다). 다른 직업은 그대로
  if (CLS === 'confessor') {
    const S = id => G0.SK2[id]; const fx = (id, f) => S(id).fx.some(f); const swapIn = (need, ok, keep) => { if (!pick.some(need) || pick.some(ok)) return; const cand = bd.open.filter(id => ok(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) return; const lo = pick.filter(id => !need(id) && !(keep && keep(id))).sort((a, c) => val(a) - val(c))[0]; if (lo) pick[pick.indexOf(lo)] = cand; };
    const bad = ['bleed', 'ignite', 'weak', 'vuln', 'chill']; const fuel = id => fx(id, e => e.k === 'meSt' && bad.includes(e.s)); const usesB = id => fx(id, e => (e.k === 'perDmg' && e.of === 'burden') || (e.k === 'cleanse' && e.offer));
    const srcN = en.filter(r => ['archer', 'darkmage', 'pyre', 'bruiser'].includes(r)).length + (sit.room.boss || sit.room.strong ? 2 : 0);
    if (srcN < 2) swapIn(usesB, fuel);
    swapIn(id => fx(id, e => e.k === 'perDmg' && e.of === 'prot'), id => fx(id, e => e.k === 'cleanse' && !e.offer));
    if (en.some(r => ['healer', 'summoner'].includes(r)) || sit.room.strong || sit.room.boss) { const dis = id => fx(id, e => e.k === 'dispel'); if (!pick.some(dis)) { const cand = bd.open.filter(id => dis(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (cand) { const lo = pick.slice().sort((a, c) => val(a) - val(c))[0]; pick[pick.indexOf(lo)] = cand; } } }
    const pure = id => fx(id, e => e.k === 'cleanse' && !e.offer) || fx(id, e => e.k === 'transfer');
    while (pick.filter(pure).length > 2) { const cand = bd.open.filter(id => !pure(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) break; const lo = pick.filter(pure).sort((a, c) => val(a) - val(c))[0]; pick[pick.indexOf(lo)] = cand; }
  }
  // 원소술사 (10월 7일, 설계 F-3절 10): 물결(모든 적에게 한 원소) 하나를 끼우면 반대 원소의 물결도 하나, 강타 · 보스 상황에는 약화 칸 하나와 열충격 붕괴 ×2 칸 하나 (사람은 짝을 맞춘다). 다른 직업은 그대로
  if (CLS === 'elementalist') {
    const wave = (id, k) => { const s = G0.SK2[id]; return s.tgt === 'all' && s.fx.some(e => e.k === 'st' && e.s === k) && !s.fx.some(e => e.k === 'st' && e.s === (k === 'ignite' ? 'chill' : 'ignite')); };
    const swapIn = (want, keep) => { if (pick.some(want)) return; const cand = bd.open.filter(id => want(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) return; const lo = pick.filter(id => !keep(id)).sort((a, c) => val(a) - val(c))[0]; if (lo) pick[pick.indexOf(lo)] = cand; };
    for (const [k, o] of [['ignite', 'chill'], ['chill', 'ignite']]) if (pick.some(id => wave(id, k))) swapIn(id => wave(id, o), id => wave(id, k));
    if (heavy) { const weak = id => G0.SK2[id].fx.some(e => e.k === 'st' && e.s === 'weak'); const brk2 = id => G0.SK2[id].fx.some(e => e.k === 'shockx' && (e.brk || 1) >= 2); swapIn(weak, id => brk2(id) || weak(id)); swapIn(brk2, id => weak(id) || brk2(id)); }
  }
  // 마검사 (10월 7일, docs/직업/마검사.md F-2의 13): 짝 맞추기(칼 × ↔ 칼에 싣기, 상태 조건 · 상태 비례 ↔ 그 상태를 거는 칸, 퍼뜨리기 ↔ 출혈), 그리고 4칸에 ⚔ 베기 · ✦ 주문을 하나 이상씩(시작 스킬과 합쳐 둘 이상씩)
  if (pick.some(id => G0.SK2[id].kind)) {
    const S = id => G0.SK2[id]; const kd = k => id => S(id).kind === k; const fxs = (id, f) => S(id).fx.some(f);
    const swapIn = (need, ok) => { if (!pick.some(need) || pick.some(ok)) return; const cand = bd.open.filter(id => ok(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) return; const lo = pick.filter(id => !need(id)).sort((a, c) => val(a) - val(c))[0]; if (lo) pick[pick.indexOf(lo)] = cand; };
    swapIn(id => has(S(id), 'edgeX'), id => has(S(id), 'imbue'));
    for (const k of ['bleed', 'ignite']) swapIn(id => fxs(id, e => (e.k === 'kwx' || e.k === 'exploit') && e.s === k), id => fxs(id, e => (e.k === 'st' && e.s === k && S(id).tgt !== 'self') || (e.k === 'imbue' && e.s === k)));
    swapIn(id => has(S(id), 'killSpread'), id => !has(S(id), 'killSpread') && fxs(id, e => e.k === 'st' && e.s === 'bleed'));
    for (const k of ['cut', 'spell']) if (!pick.some(kd(k))) { const cand = bd.open.filter(id => kd(k)(id) && !pick.includes(id)).sort((a, c) => val(c) - val(a))[0]; if (!cand) continue; const lo = pick.filter(id => !kd(k)(id)).sort((a, c) => val(a) - val(c))[0]; if (lo) pick[pick.indexOf(lo)] = cand; }
  }
  return pick;
}
function statsOf(lv) { if (G0.statRecommend && G0.STAT_START) return G0.statRecommend(CLS, {}, G0.STAT_START + G0.LV_POINTS * (lv - 1)); const pts = 6 + 2 * (lv - 1); return { int: Math.ceil(pts / 2), dex: Math.floor(pts / 2), str: 0 }; } // 10월 4일 능력치 다섯: 직업 추천 배분
function fight(bd, sit, seed, eqOver) { // eqOver: 장착을 직접 줄 때(보스전 이길 수단 찾기). 이때는 행동 몫을 세지 않는다
  const r = D.rng(seed); G0.__rnd = D.rng(seed * 31 + 7); run_('Math.random = __rnd');
  const st = statsOf(bd.lv);
  const p = G0.mkPlayer(CLS, {}, st, T.starters.concat(eqOver || equipFor(bd, sit))); p.lv = bd.lv; G0.applyStats(p, st); p.hp = p.hpMax; p.st = p.stMax;
  const sp = sit.p || {}; if (sp.hp) p.hp = Math.round(p.hpMax * sp.hp); if (sp.st != null) p.st = sp.st;
  for (const k in (sp.s || {})) p.s[k] = { stacks: sp.s[k], until: 1e9, dur: 1e9 };
  const room = JSON.parse(JSON.stringify(sit.room)); const bossKind = room.boss || null; if (room.boss) room.boss = true;
  room.lv = (sit.lv && sit.lv[bd.lv]) || MLV[bd.lv]; room.floor = 13; /* 하층 (06a2 24층 틀은 13층부터, next/는 10층부터) */ if (SIT_CH >= 2) { room.ch = SIT_CH; room.names = ENAMES[SIT_CH]; } if (!room.en) room.en = [];
  const b = G0.roomBattle(p, room, bossKind, seed); b.rngF = r; b.stepMode = false;
  const P = Q.PERSONAS[PK]; const mem = {}; let n = 0;
  while (!b.over && n++ < 250) {
    const sr = r() < (P.mech || 0.5) ? Q.sigRule(b, r) : null;
    let [a, t] = D.ch2Pre(b, P, r) || sr || (P.look ? Q.lookahead(b, P, r) : Q.heuristic(b, P, r, mem));
    [a, t] = D.ch2Post(b, P, r, a, t); // 2챕터 판단(dgqa.js와 같다. 1챕터 상황에서는 아무것도 하지 않는다)
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && x.id !== 'flee'); a = L[0].id; t = null; }
    if (!eqOver) { const sk = G0.SK2[a]; const kind = sk ? (sk.start ? 'st' : 'tr') : 'gen'; MIX[bd.lv + bd.br] = MIX[bd.lv + bd.br] || { st: 0, tr: 0, gen: 0 }; MIX[bd.lv + bd.br][kind]++; }
    try { G0.playerAct(b, a, t); } catch (e) { return { win: 0, bug: e.message }; }
  }
  return { win: b.over === 'win' ? 1 : 0, hp: b.p.hp / b.p.hpMax, rounds: b.round || 0, timeout: !b.over, b };
}
module.exports = { buildOf, equipFor, statsOf, fight, MLV, G0 };
if (MAIN) {
const builds = []; for (const lv of LVS) for (const br of T.branches) for (const col of [0, 1]) builds.push(buildOf(br, col, lv));
const res = {}; let bugs = 0, touts = 0;
for (const bd of builds) for (const sit of SIT) {
  let w = 0, hp = 0, rd = 0, sc = 0;
  for (let i = 0; i < N; i++) { const o = fight(bd, sit, 1000 + sit.id * 97 + i * 13); w += o.win; hp += o.win ? o.hp : 0; sc += o.win ? 0.4 + 0.4 * o.hp + 0.2 * Math.max(0, Math.min(1, 1 - ((o.rounds || 0) - 3) / 20)) : 0; rd += o.rounds || 0; if (o.bug) bugs++; if (o.timeout) touts++; }
  res[bd.lv + bd.br + bd.col + ':' + sit.id] = { w: w / N, sc: sc / N, hp: w ? hp / w : 0, rd: rd / N }; // sc: 이기면 40 + 남은 생명력 40 + 빠르기 20(3라운드 안이면 다, 23라운드면 0), 지면 0
}
const pct = v => Math.round(v * 100);
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const MET = process.env.MET || 'sc'; // 기본은 점수(승리 + 남은 생명력). MET=w면 승률
const W = (lv, br, cols, sits) => avg(cols.flatMap(c => sits.map(s => res[lv + br + c + ':' + s.id][MET])));
const WR = (lv, br, sits) => avg([0, 1].flatMap(c => sits.map(s => res[lv + br + c + ':' + s.id].w)));
console.log(`상황 ${SIT.length} × 빌드 ${builds.length} × ${N}판, 성향 ${PK}, 세기 ${SIT_REAL ? "게임의 지금 세기" : "기준 세기(하층 ×1.05·×0.9)"}, 오류 ${bugs}, 시간 초과 ${touts}`);
const verdict = [];
for (const lv of LVS) {
  console.log(`\n== Lv${lv} (몬스터 Lv${MLV[lv]}) — 범주별 ${MET === 'w' ? '승률' : '점수(승리 40 + 남은 생명력 40 + 빠르기 20)'} (두 기둥 평균)`);
  console.log('범주'.padEnd(6) + T.branches.map(b => b.padStart(6)).join('') + '   평균');
  const brAvg = {}; for (const br of T.branches) brAvg[br] = W(lv, br, [0, 1], SIT);
  for (const cat of SIT_CATS) {
    const ss = SIT.filter(s => s.cat === cat); const vs = T.branches.map(br => W(lv, br, [0, 1], ss)); const m = avg(vs);
    const mark = T.branches.map((br, i) => { const pr = (T.profile || {})[br] || {}; const d = vs[i] - m; const want = (pr.strong || []).includes(cat) ? 'S' : (pr.weak || []).includes(cat) ? 'W' : ''; const ok = want === 'S' ? d >= TH.cat : want === 'W' ? d <= -TH.cat : true; if (want) verdict.push({ lv, br, cat, want, d, ok }); return (pct(vs[i]) + (want ? (ok ? want : want.toLowerCase() + '!') : '')).padStart(6); });
    console.log(cat.padEnd(6) + mark.join('') + String(pct(m)).padStart(7));
  }
  { const cp = (T.profile || {}).직업; if (cp) { const all = avg(T.branches.map(br => W(lv, br, [0, 1], SIT))); for (const cat of SIT_CATS) { const want = (cp.strong || []).includes(cat) ? 'S' : (cp.weak || []).includes(cat) ? 'W' : ''; if (!want) continue; const v = avg(T.branches.map(br => W(lv, br, [0, 1], SIT.filter(x => x.cat === cat)))); const d = v - all; const ok = want === 'S' ? d >= TH.cat : d <= -TH.cat; verdict.push({ lv, br: '직업 전체', cat, want, d, ok }); console.log('직업 전체 ' + cat + ' ' + pct(v) + ' (전체 평균 ' + pct(all) + ', ' + (want === 'S' ? '강함' : '약함') + ' 목표) ' + (ok ? '맞음' : '못 맞춤')); } } }
  console.log('승률 ' + T.branches.map(br => br + ' ' + pct(WR(lv, br, SIT)) + '%').join(' · '));
  console.log('갈래 평균 ' + T.branches.map(br => br + ' ' + pct(brAvg[br])).join(' · ') + ` (차이 ${pct(Math.max(...Object.values(brAvg)) - Math.min(...Object.values(brAvg)))}%p)`);
  console.log('행동 몫(갈래 스킬/시작 스킬/공통) ' + T.branches.map(br => { const m = MIX[lv + br] || { st: 0, tr: 0, gen: 1 }; const n = m.st + m.tr + m.gen; return br + ' ' + pct(m.tr / n) + '/' + pct(m.st / n) + '/' + pct(m.gen / n); }).join(' · '));
  console.log('기둥(왼/오) ' + T.branches.map(br => br + ' ' + pct(W(lv, br, [0], SIT)) + '/' + pct(W(lv, br, [1], SIT))).join(' · '));
  verdict.push({ lv, kind: 'parity', d: Math.max(...Object.values(brAvg)) - Math.min(...Object.values(brAvg)), ok: Math.max(...Object.values(brAvg)) - Math.min(...Object.values(brAvg)) <= TH.parity });
  for (const br of T.branches) { const d = Math.abs(W(lv, br, [0], SIT) - W(lv, br, [1], SIT)); verdict.push({ lv, br, kind: 'col', d, ok: d <= TH.col }); }
}
/* 5) 보스전 이길 수단: 기둥마다 기본 장착의 승률을 보고, 문턱 아래면 연 스킬 가운데 4칸의 모든 조합을 짧게(6판) 싸운 뒤 좋은 여섯을 길게(60판 이상) 다시 잰다.
   10월 3일: 3판 거르기 · 24판 다시 재기는 문턱(50%) 근처에서 판마다 ±10%p 흔들려, 거르는 판과 다시 재는 판을 늘렸다 */
const EQ = G0.EQUIP_SLOTS2;
const combos = (arr, k) => { const out = []; const rec = (i, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let j = i; j < arr.length; j++) { cur.push(arr[j]); rec(j + 1, cur); cur.pop(); } }; rec(0, []); return out; };
const winRate = (bd, sit, eq, n, base) => { let w = 0; for (let i = 0; i < n; i++) w += fight(bd, sit, base + i * 13, eq).win; return w / n; };
const nameOf = eq => eq.map(id => G0.SK2[id].n).join(', ');
console.log('\n== 보스전 이길 수단 (기둥 둘 가운데 하나라도 승률 ' + pct(TH.means) + '% 이상인 장착이 있어야 한다)');
for (const sit of SIT.filter(x => x.room.boss)) for (const lv of LVS) for (const br of T.branches) {
  let best = null; const parts = [];
  for (const col of [0, 1]) {
    const bd = builds.find(x => x.lv === lv && x.br === br && x.col === col);
    let pick = { w: res[lv + br + col + ':' + sit.id].w, eq: equipFor(bd, sit), how: '기본 장착' };
    if (pick.w < TH.means && bd.open.length > EQ) {
      const cs = combos(bd.open, EQ).map(eq => ({ eq, w: winRate(bd, sit, eq, 6, 5000 + sit.id * 97) })).sort((a, c) => c.w - a.w).slice(0, 6);
      for (const c of cs) { const w = winRate(bd, sit, c.eq, Math.max(60, N * 4), 7000 + sit.id * 97); if (w > pick.w) pick = { w, eq: c.eq, how: '찾은 장착' }; }
    }
    parts.push((col ? '오' : '왼') + ' ' + pct(pick.w) + '%' + (pick.how === '찾은 장착' ? ' [' + nameOf(pick.eq) + ']' : ''));
    if (!best || pick.w > best.w) best = pick;
  }
  const ok = best.w >= TH.means; verdict.push({ lv, br, kind: 'means', d: best.w, ok });
  console.log('Lv' + lv + ' ' + br.padEnd(4) + parts.join(' · ') + (ok ? '' : '  ← 이길 수단 없음'));
}
const bad = verdict.filter(v => !v.ok);
console.log(`\n기준 ${verdict.length}개 중 통과 ${verdict.length - bad.length}개`);
for (const v of bad) console.log('  못 맞춤: Lv' + v.lv + ' ' + (v.kind === 'parity' ? '갈래 평균 차이 ' + pct(v.d) + '%p' : v.kind === 'col' ? v.br + ' 기둥 차이 ' + pct(v.d) + '%p' : v.kind === 'means' ? v.br + ' 보스전 이길 수단 없음 (가장 좋은 장착 승률 ' + pct(v.d) + '%)' : v.br + ' ' + v.cat + (v.want === 'S' ? ' 강함' : ' 약함') + ' (평균 대비 ' + (v.d >= 0 ? '+' : '') + pct(v.d) + '%p)'));
if (process.env.SITJSON) require('fs').writeFileSync(process.env.SITJSON, JSON.stringify({ res, verdict, builds }));
}
