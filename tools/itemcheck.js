/* ===== 아이템 효과 점검 (0.6 1챕터 풀) =====
   아이템마다 여덟 직업에 끼워 무작위로 싸우게 하고, 효과가 실제로 일어났는지(FXHIT) 센다.
   고정 수치 효과(최대치, 플라스크, 비용)는 끼우기 전후 값을 비교한다.
   실행: node tools/extract-engine.js && node tools/itemcheck.js */
const E = require('./eng.gen.js');
const { BUILDS, ROOMS, ITEMS } = E;
const IFX = E.IFX, FXHIT = E.FXHIT, POOL = E.CH1_POOL;
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const slotOf = k => { const s = ITEMS[k].slot; return s === 'ring1' || s === 'ring2' ? 'ring1' : s; };
function player(build, k, r) {
  const SK = Object.keys(E.skillMap(build)); const sk = []; while (sk.length < 3) { const x = SK[Math.floor(r() * SK.length)]; if (!sk.includes(x)) sk.push(x); }
  const p = E.mkPlayer(build, {}, { str: 2, dex: 2, int: 2 }, sk);
  if (k) { p.eq[slotOf(k)] = k; E.applyStats(p, p.stat); p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; for (const f of ['life', 'mana', 'stam']) p.flask[f] = Math.min(p.flask[f], E.flaskCap(p, f)); }
  return p;
}
const bad = [];
function fight(build, k, seed) {
  const r = rng(seed); const p = player(build, k, r);
  const rooms = [0, 1, 2, 3, 4, 6, 7, 8];
  for (const ri of rooms) {
    const b = E.roomBattle(p, ROOMS[ri], 'mother', seed + ri); b.rngF = r;
    if (r() < 0.3) { p.s.weak = { stacks: 1, until: b.t + 2, dur: 2 }; } // 정화·플라스크 효과를 시험할 디버프
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
  if (f.st) { if (f.st.hp && Math.sign(E.calcHpMax(b) - E.calcHpMax(a)) !== Math.sign(f.st.hp)) out.push('최대 생명력'); if (f.st.mp && Math.sign(E.calcMpMax(b) - E.calcMpMax(a)) !== Math.sign(f.st.mp)) out.push('최대 마나'); if (f.st.st && E.calcStMax(b) - E.calcStMax(a) < 1) out.push('최대 스태미나'); }
  if (f.hpMul && !(E.calcHpMax(b) < E.calcHpMax(a))) out.push('생명력 배율');
  if ((f.heal || f.healMul) && Math.abs(E.flaskHealFrac(b) - E.flaskHealFrac(a)) < 1e-9) out.push('플라스크 회복');
  if (f.cap) for (const fk in f.cap) if (E.flaskCap(b, fk) - E.flaskCap(a, fk) !== f.cap[fk]) out.push('플라스크 한도');
  if (f.cost) { const ids = ['heavy', 'guard', 'dodge']; const fn = { heavy: E.heavyCost, guard: E.guardCost, dodge: E.dodgeCost }; if (!ids.some(id => fn[id](b) !== fn[id](a)) && k !== 'gravespade' && k !== 'wardcharm') out.push('행동 비용'); }
  return out;
}
const UI_ONLY = { pilgcloak: '샘 회복(화면)', pilgtoken: '샘 회복(화면)', pilgcanteen: '샘 충전(화면)', rustykey: '보물 방 골드(단계 6·9)', tonic: '스태미나 플라스크 양' };
const res = [];
const t0 = Date.now();
for (const k of POOL) {
  for (const key in FXHIT) delete FXHIT[key];
  const before = bad.length;
  let seed = 100;
  for (const build of Object.keys(BUILDS).filter(x => !BUILDS[x].tut)) for (let i = 0; i < 4; i++) fight(build, k, seed += 13);
  if (!(FXHIT[k] > 0) && IFX[k]) for (const build of Object.keys(BUILDS).filter(x => !BUILDS[x].tut)) for (let i = 0; i < 12; i++) fight(build, k, seed += 13); // 조건이 드문 효과는 더 싸워 본다
  const hits = FXHIT[k] || 0; const st = staticCheck(k); const f = IFX[k];
  const kind = !f ? '예전 아이템(엔진 직접)' : UI_ONLY[k] ? UI_ONLY[k] : (Object.keys(f).every(x => ['st', 'hpMul', 'heal', 'healMul', 'cap', 'cost', 'stamMul', 'flaskCleanse', 'goldMul', 'treasureGold', 'spring', 'springLife', 'manaToHp', 'deathSave'].includes(x)) ? '고정 수치' : '전투 효과');
  const ok = bad.length === before && (!f || UI_ONLY[k] || hits > 0 || (st && st.length === 0 && kind === '고정 수치')) && !(st && st.length);
  res.push({ k, n: ITEMS[k].n, g: ITEMS[k].g, kind, hits, fail: st && st.length ? st.join(', ') : '', ok });
}
const fails = res.filter(x => !x.ok);
for (const x of res) if (!x.ok || process.argv.includes('-v')) console.log((x.ok ? 'ok  ' : 'FAIL') + ' ' + x.k.padEnd(14) + ' ' + x.n + ' [' + x.kind + '] 발동 ' + x.hits + (x.fail ? ' 비교 실패: ' + x.fail : ''));
console.log('아이템 ' + res.length + '종, 통과 ' + (res.length - fails.length) + ', 실패 ' + fails.length + ', 이상 상태 ' + bad.length + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + '초)');
if (bad.length) console.log(bad.slice(0, 10).join('\n'));
process.exitCode = fails.length || bad.length ? 1 : 0;
