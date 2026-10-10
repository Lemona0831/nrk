/* ===== 아이템 효과 점검 (0.6 1챕터 풀, 0.6a.2 2챕터 · 3챕터 풀) =====
   아이템마다 직업에 끼워 무작위로 싸우게 하고, 효과가 실제로 일어났는지(FXHIT) 센다.
   고정 수치 효과(최대치, 플라스크, 비용)는 끼우기 전후 값을 비교한다.
   2챕터 풀(CH2_POOL)은 2챕터 적 · 방 특성이 있는 방(ROOMS2)에서 싸운다. fits가 있는 장비는 그 직업으로만 센다.
   3챕터 풀(CH3_POOL)은 3챕터 적 · 방 특성이 있는 방(ROOMS3: 잠복 · 화염 강화 · 붕대 · 아지랑이 · 한낮 열기 · 모래폭풍 · 오아시스 그늘 · 불씨 화로)에서 싸우고, 화상 · 출혈 · 약화를 안고 시작한다.
   실행: node tools/extract-engine.js 06a2 && node tools/itemcheck.js [--ch=1|2|3] [--only=id,id] (기본: 있는 풀 모두) */
const E = require('./eng.gen.js');
const { BUILDS, ROOMS, ITEMS } = E;
const IFX = E.IFX, FXHIT = E.FXHIT;
const CH_ARG = (process.argv.find(a => a.startsWith('--ch=')) || '').slice(5);
const POOLS = [[1, E.CH1_POOL]].concat(E.CH2_POOL ? [[2, E.CH2_POOL]] : []).concat(E.CH3_POOL ? [[3, E.CH3_POOL]] : []).filter(([c]) => !CH_ARG || String(c) === CH_ARG);
/* 2챕터 방: 해골 · 주술사 · 뼈벽 · 땅속 · 부푼 시체 · 신속 · 방 특성(썩은 공기 · 물 · 무너진 납골벽). 낮은 레벨로 두어 싸움이 길게 이어지게 한다 */
const ROOMS2 = [
  { n: '2-1', ch: 2, lv: 2, en: [['skeleton'], ['skeleton'], ['healer']] },
  { n: '2-2', ch: 2, lv: 2, en: [['bruiser'], ['hexer'], ['hexer']] },
  { n: '2-3', ch: 2, lv: 2, en: [['bruiser'], ['mason'], ['archer']] },
  { n: '2-4', ch: 2, lv: 2, en: [['burrower'], ['burrower'], ['archer']] },
  { n: '2-5', ch: 2, lv: 2, en: [['skeleton', 1], ['bloat'], ['hexer']], mods: ['rotair'] },
  { n: '2-6', ch: 2, lv: 2, en: [['bruiser', 1], ['skeleton'], ['healer']], swift: [0], mods: ['flooded'] },
  { n: '2-7', ch: 2, lv: 2, en: [['thief'], ['pyre'], ['bloat']], mods: ['bonepile'] },
  { n: '2-8', ch: 2, lv: 2, en: [['skeleton'], ['mason'], ['shield']] },
];
/* 3챕터 방: 잠복 · 화염 강화 · 붕대 · 아지랑이 · 한낮 · 모래폭풍 · 오아시스 그늘 · 불씨 화로. 낮은 레벨로 두어 싸움이 길게 이어지게 한다 */
const NAMES3 = E.ENEMY_NAMES ? E.ENEMY_NAMES[3] : undefined;
const ROOMS3 = [
  { n: '3-1', ch: 3, lv: 2, en: [['lurker'], ['bruiser'], ['archer']] },
  { n: '3-2', ch: 3, lv: 2, en: [['ember'], ['bruiser', 1], ['shield']], fire: [1] },
  { n: '3-3', ch: 3, lv: 2, en: [['wrapped'], ['wrapped'], ['healer']] },
  { n: '3-4', ch: 3, lv: 2, en: [['mirage'], ['bruiser'], ['bruiser']], mods: ['haze'] },
  { n: '3-5', ch: 3, lv: 2, en: [['bruiser'], ['archer'], ['archer']], mods: ['noon'] },
  { n: '3-6', ch: 3, lv: 2, en: [['bruiser'], ['shield'], ['archer']], mods: ['sandstorm'] },
  { n: '3-7', ch: 3, lv: 2, en: [['wrapped'], ['ember'], ['lurker']], mods: ['shade'] },
  { n: '3-8', ch: 3, lv: 2, en: [['bruiser'], ['thief'], ['healer']], mods: ['brazier'], fire: [0] },
];
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const slotOf = k => { const s = ITEMS[k].slot; return s === 'ring1' || s === 'ring2' ? 'ring1' : s; };
function player(build, k, r) {
  const SK = Object.keys(E.skillMap(build)); const sk = []; while (sk.length < 3) { const x = SK[Math.floor(r() * SK.length)]; if (!sk.includes(x)) sk.push(x); }
  const p = E.mkPlayer(build, {}, { str: 2, dex: 2, int: 2 }, sk);
  if (k) { p.eq[slotOf(k)] = k; E.applyStats(p, p.stat); p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; for (const f of ['life', 'mana', 'stam']) p.flask[f] = Math.min(p.flask[f], E.flaskCap(p, f)); }
  return p;
}
const bad = [];
function fight(build, k, seed, ch) {
  const r = rng(seed); const p = player(build, k, r);
  const rooms = ch === 3 ? ROOMS3 : ch === 2 ? ROOMS2 : [0, 1, 2, 3, 4, 6, 7, 8].map(i => ROOMS[i]);
  for (let ri = 0; ri < rooms.length; ri++) {
    if (ch >= 2) for (const f of ['life', 'mana', 'stam']) p.flask[f] = E.flaskCap(p, f); /* 2 · 3챕터 방은 플라스크를 채워 방 특성 · 적과 함께 마시는 효과를 시험한다 */
    const b = E.roomBattle(p, rooms[ri], 'mother', seed + ri); b.rngF = r;
    if (r() < 0.3) { p.s.weak = { stacks: 1, until: b.t + 2, dur: 2 }; } // 정화·플라스크 효과를 시험할 디버프
    if (ch === 2 && r() < 0.5) { p.s.poison = { stacks: 6, until: 9999, dur: 9999 }; p.s.vuln = { stacks: 2, until: 9999, dur: 9999 }; p.s.bleed = { stacks: 3, until: 9999, dur: 9999 }; p.s.weak = { stacks: 2, until: 9999, dur: 9999 }; } /* 2챕터: 해로운 상태 여럿을 안고 시작해 조이기 · 지우기 · 옮기기 장비를 시험한다 */
    if (ch === 3 && r() < 0.5) { p.s.ignite = { stacks: 3, until: 9999, dur: 9999 }; p.s.bleed = { stacks: 2, until: 9999, dur: 9999 }; p.s.weak = { stacks: 1, until: 9999, dur: 9999 }; } /* 3챕터: 화상 · 출혈 · 약화를 안고 시작해 화상 · 지우기 · 옮기기 장비를 시험한다 */
    let n = 0;
    while (!b.over && n++ < 160) {
      const L = E.actionList(b).filter(a => a.ok && a.id !== 'flee');
      if (!L.length) break;
      // 생명력이 낮으면 플라스크, 아니면 무작위
      let a = p.hp < p.hpMax * 0.35 && L.find(x => x.id === 'flaskL') || L[Math.floor(r() * L.length)];
      const ts = E.alive(b).filter(e => E.canTarget(b, e, a));
      E.playerAct(b, a.id, ts.length ? ts[Math.floor(r() * ts.length)].id : null);
      if ([p.hp, p.mp, p.st].some(v => typeof v !== 'number' || isNaN(v))) { bad.push(k + ': 수치가 숫자가 아님'); return; }
      if (p.hp > p.hpMax + 1e-6 || p.mp > p.mpMax + 1e-6) { bad.push(k + ': 최대치를 넘음'); return; }
    }
    if (b.over === 'lose') { p.hp = p.hpMax; } // 계속 시험하려고 되살린다
    E.endBattleCarry(p);
  }
}
/* 고정 수치 효과: 끼우기 전후 비교 */
function staticCheck(k) {
  const f = IFX[k]; if (!f) return null; const out = [];
  const SB = BUILDS.templar ? 'templar' : Object.keys(BUILDS)[0]; // 0.6a.2 시험판(06a2)에는 성전사가 없다
  const a = player(SB, null, rng(1)), b = player(SB, k, rng(1));
  if (f.st) { if (f.st.hp && Math.sign(E.calcHpMax(b) - E.calcHpMax(a)) !== Math.sign(f.st.hp)) out.push('최대 생명력'); if (f.st.mp && Math.sign(E.calcMpMax(b) - E.calcMpMax(a)) !== Math.sign(f.st.mp)) out.push('최대 마나'); if (f.st.st && Math.sign(E.calcStMax(b) - E.calcStMax(a)) !== Math.sign(f.st.st)) out.push('최대 스태미나'); }
  if (f.hpMul && !(E.calcHpMax(b) < E.calcHpMax(a))) out.push('생명력 배율');
  if ((f.heal || f.healMul) && Math.abs(E.flaskHealFrac(b) - E.flaskHealFrac(a)) < 1e-9) out.push('플라스크 회복');
  if (f.cap) for (const fk in f.cap) if (E.flaskCap(b, fk) - E.flaskCap(a, fk) !== f.cap[fk]) out.push('플라스크 한도');
  if (f.cost && !f.condCost) { const ids = ['heavy', 'guard', 'dodge']; const fn = { heavy: E.heavyCost, guard: E.guardCost, dodge: E.dodgeCost }; if (!ids.some(id => fn[id](b) !== fn[id](a)) && k !== 'gravespade' && k !== 'wardcharm') out.push('행동 비용'); }
  return out;
}
const UI_ONLY = { copperjug: '스태미나 플라스크 양', pilgcloak: '샘 회복(화면)', pilgtoken: '샘 회복(화면)', pilgcanteen: '샘 충전(화면)', rustykey: '보물 방 골드(단계 6·9)', tonic: '스태미나 플라스크 양', baptism: '방을 이기면 충전(전투 밖, dgqa)' };
const res = [];
/* 무작위 전투에서는 보호막 최대치로 라운드를 끝내기 어렵다.
   무작위 발동 수와 구분하여, 효과의 명시된 조건과 열기 변화량을 검사한다. */
function controlledCheck(k) {
  if (k !== 'bulwarkring') return null;
  const p = player('warden', k, rng(1));
  const b = E.roomBattle(p, ROOMS3[4], 'mother', 1);
  b.heat = 50; p.ward = E.wardMax(p);
  const fired = IFX[k].onRound(b, p);
  const positive = fired === 1 && b.heat === 48;
  b.heat = 50; p.ward = E.wardMax(p) - 1;
  const belowFull = !IFX[k].onRound(b, p) && b.heat === 50;
  b.heat = null; p.ward = E.wardMax(p);
  const noHeat = !IFX[k].onRound(b, p) && b.heat === null;
  return positive && belowFull && noHeat;
}
const t0 = Date.now();
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
for (const [ch, POOL] of POOLS) for (const k of POOL.filter(x => !ONLY.length || ONLY.includes(x))) {
  for (const key in FXHIT) delete FXHIT[key];
  const before = bad.length;
  let seed = 100;
  const CLS = Object.keys(BUILDS).filter(x => !BUILDS[x].tut && (!ITEMS[k].fits || ITEMS[k].fits.includes(x))); /* fits: 그 직업에서만 일어나는 효과 */
  for (const build of CLS) for (let i = 0; i < 4; i++) fight(build, k, seed += 13, ch);
  if (!(FXHIT[k] > 0) && IFX[k]) for (const build of CLS) for (let i = 0; i < 12; i++) fight(build, k, seed += 13, ch); // 조건이 드문 효과는 더 싸워 본다
  const hits = FXHIT[k] || 0; const st = staticCheck(k); const f = IFX[k];
  const controlled = hits === 0 ? controlledCheck(k) : null;
  const kind = !f ? '예전 아이템(엔진 직접)' : UI_ONLY[k] ? UI_ONLY[k] : (Object.keys(f).every(x => ['st', 'hpMul', 'heal', 'healMul', 'cap', 'cost', 'stamMul', 'flaskCleanse', 'goldMul', 'treasureGold', 'spring', 'springLife', 'manaToHp', 'deathSave'].includes(x)) ? '고정 수치' : '전투 효과');
  const ok = bad.length === before && (!f || UI_ONLY[k] || hits > 0 || controlled === true || (st && st.length === 0 && kind === '고정 수치')) && !(st && st.length);
  if (controlled !== null) console.log('조건 지정 검사: ' + k + ' ' + (controlled ? '통과' : '실패') + ' (무작위 발동 ' + hits + '회, 보호막 최대에서 라운드 끝 열기 50 → 48)');
  res.push({ k, ch, n: ITEMS[k].n, g: ITEMS[k].g, kind, hits, fail: st && st.length ? st.join(', ') : '', ok });
  if (res.length % 25 === 0) console.log('진행: ' + res.length + '종 점검, 현재 ' + ch + '챕터 (' + ((Date.now() - t0) / 1000).toFixed(1) + '초)');
}
const OFF = E.V2_OFF || []; // 0.6a.2(06a2): 사라진 규칙에 묶여 드롭·상점에서 뺀 장비는 실패로 세지 않고 따로 보인다
const fails = res.filter(x => !x.ok && !OFF.includes(x.k)); const offs = res.filter(x => !x.ok && OFF.includes(x.k));
for (const x of res) if (!x.ok || process.argv.includes('-v')) console.log((x.ok ? 'ok  ' : OFF.includes(x.k) ? 'off ' : 'FAIL') + ' ' + x.ch + '챕터 ' + x.k.padEnd(14) + ' ' + x.n + ' [' + x.kind + '] 발동 ' + x.hits + (x.fail ? ' 비교 실패: ' + x.fail : ''));
for (const [ch] of POOLS) { const R = res.filter(x => x.ch === ch); const F = fails.filter(x => x.ch === ch); const O = offs.filter(x => x.ch === ch); console.log(ch + '챕터 풀: 아이템 ' + R.length + '종, 통과 ' + (R.length - F.length - O.length) + ', 실패 ' + F.length + (O.length ? ', 드롭에서 뺀 장비(V2_OFF) 발동 0: ' + O.length : '')); }
console.log('아이템 ' + res.length + '종, 통과 ' + (res.length - fails.length - offs.length) + ', 실패 ' + fails.length + (OFF.length ? ', 드롭에서 뺀 장비(V2_OFF) 가운데 발동 0: ' + offs.length + '/' + OFF.length : '') + ', 이상 상태 ' + bad.length + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + '초)');
if (bad.length) console.log(bad.slice(0, 10).join('\n'));
process.exitCode = fails.length || bad.length ? 1 : 0;
