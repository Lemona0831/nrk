'use strict';
/* ===== 2챕터 몸과 역할 (10월 5일, docs/챕터/2챕터.md 5절) ===== */
const BIGK = ['charge', 'heavy', 'burrow', 'erupt', 'chant', 'chanting', 'burn', 'surgeprep', 'dig', 'noon']; // 한 라운드 큰 공격 상한(G7)이 세는 예고
const hexDmgOf = (b, e) => { const k = HEX.kinds.filter(s => st(b.p, s) > 0).length; return enemyHitEst(b, e) / ROLES.hexer.hit * Math.min(HEX.cap, HEX.base + HEX.per * k); }; // 조이기: 내 해로운 상태 가짓수
const bigPending = (b, e) => alive(b).some(x => x !== e && x.intent && (BIGK.includes(x.intent.k) || (x.intent.k === 'constrict' && hexDmgOf(b, x) >= b.p.hpMax * 0.15))) || (b.heatWarn != null && b.heatWarn >= (b.round || 0)); // 3챕터: 열풍이 예고된 라운드도 큰 공격 하나로 센다
const wallOf = (b, e) => alive(b).find(x => x.role === 'bonewall' && x.wallOf === e.id);
const realFoe = e => e.role !== 'root' && !e.pile && e.role !== 'bonewall' && e.role !== 'crown'; // 전투 끝 판정에서 세는 적 (뼈 더미 · 뼈벽은 빼고)
function buildWall(b, e) {
  if (wallOf(b, e)) return; const w = mkEnemy('bonewall', 0, b.idc++, { lv: e.lv || 1, name: b.ctx.names && b.ctx.names.bonewall });
  w.hpMax = Math.max(1, Math.round(e.hpMax * BWALL.hp)); w.hp = w.hpMax; w.brkMax = BWALL.brk; w.summoned = true; w.wallOf = e.id; w.intent = { k: 'none' }; b.en.push(w);
  logp(b, 'bad', e.n + '이(가) 뼈벽을 쌓는다. 후열이 받는 한 적 대상 피해가 절반이 된다');
}
function makePile(b, e) { // 해골이 쓰러지면 뼈 더미가 된다 (경험치 · 전리품은 마지막에 한 번)
  e.pile = { wait: RISE.wait, born: b.tick }; e.hp = Math.max(1, Math.round(e.hpMax * RISE.pile)); e.intent = { k: 'none' }; e.braced = 0; e.countering = 0; e.evading = 0; e.guarding = null; e.stun = 0; e.brk = 0;
  for (const k of Object.keys(e.s)) if (!['poison', 'bleed'].includes(k)) delete e.s[k];
  logp(b, 'good', e.n + '이(가) 무너진다. 뼈가 아직 꿈틀거린다');
  fxRun(b.p, 'onPile', b, b.p, e);
}
/* ===== 지하묘지의 군주 (2챕터 보스, 상세 · 대처는 비공개 문서) ===== */
function actGroup(p, id, act) { if (id === 'basic' || id === 'heavy') return 'wpn'; if (id === 'guard' || id === 'dodge') return 'prep'; if (act && act.v2) return act.s.tgt === 'self' && !act.s.fx.some(x => x.k === 'dmg') ? 'prep' : 'skill'; return null; }
const CARVE_N = { wpn: '무기', skill: '스킬', prep: '준비' };
const carveMul = (b, g) => (b && b.carve && b.carve.g[g]) || 1;
function lordCounts(b) { const c = { wpn: 0, skill: 0, prep: 0 }; for (const g of b.lordHist || []) c[g]++; return c; }
function lordTop(b) { const c = lordCounts(b); const H = b.lordHist || []; return Object.keys(c).sort((x, y) => (c[y] - c[x]) || (H.lastIndexOf(y) - H.lastIndexOf(x))); }
function lordCarve(b, e, two) {
  const o = lordTop(b), c = lordCounts(b); if (!c[o[0]]) { logp(b, 'sys', e.n + '이(가) 새길 이름을 찾지 못한다'); return; }
  b.carve = { g: { [o[0]]: 1 - LORD.cut }, left: LORD.turns }; if (two && c[o[1]]) b.carve.g[o[1]] = 1 - LORD.cut2;
  logp(b, 'bad', e.n + '이(가) 당신의 ' + Object.keys(b.carve.g).map(g => CARVE_N[g] + '(−' + Math.round((1 - b.carve.g[g]) * 100) + '%)').join(' · ') + '에 이름을 새긴다. 내 차례 ' + LORD.turns + '번 동안'); codexHit(b, 'cryptlord', two ? 'twoname' : 'carve');
}
function cryptIntent(b, e, n) {
  if (e.lordNext) return { k: e.lordNext };
  const c = (e.pn = (e.pn || 0) + 1) - 1, ph = e.phase || 1;
  if (ph === 1) { const s = c % 6; return s === 0 ? { k: 'carve' } : s === 2 ? { k: 'call' } : s === 3 && !b.carve ? { k: 'charge' } : { k: 'attack' }; } // 새김 → 공격 → 부름 → 강타 준비 → 왕의 철퇴 → 공격
  if (ph === 2) { const s = c % 5; return s === 0 ? { k: 'carve' } : s === 1 ? { k: 'hand' } : s === 2 ? { k: 'mend' } : s === 3 && !b.carve ? { k: 'charge' } : { k: 'hand' }; } // 새김 → 무덤의 손 → 벽 보수 → 강타 준비 → 무덤 무너뜨리기
  const s = c % 4; return s === 0 ? { k: 'twocarve' } : s === 1 ? { k: 'call' } : s === 2 && !b.carve ? { k: 'charge' } : { k: 'attack' }; // 두 이름 새김 → 부름 → 강타 준비 → 왕의 철퇴
}
function lordWall(b, e, frac) { const w = mkEnemy('bonewall', 0, b.idc++, { lv: e.lv || 1, name: '뼈벽' }); w.hpMax = Math.max(1, Math.round(e.hpMax * LORD.wallHp)); w.hp = Math.max(1, Math.round(w.hpMax * frac)); w.brkMax = LORD.wallBrk; w.summoned = true; w.wallOf = e.id; w.lordWall = 1; w.intent = { k: 'none' }; b.en.push(w); return w; }
function lordThrone(b, e) { e.lordNext = null; e.phase = 2; e.pn = 0; b.carve = null; e.row = 'back'; for (let i = 0; i < LORD.walls; i++) lordWall(b, e, 1); logp(b, 'crit', e.n + '이(가) 옥좌로 물러난다. 무너진 뼈가 벽이 되어 솟는다'); codexHit(b, 'cryptlord', 'throne'); }
function lordMend(b, e) {
  const ws = alive(b).filter(x => x.lordWall);
  if (ws.length < LORD.walls && !alive(b).some(x => x.pile) && !LORD.mendBare) { logp(b, 'sys', e.n + '이(가) 벽을 다시 쌓으려 하지만 쓸 뼈가 없다'); return; } /* 10월 7일: mendBare 0이면 뼈 더미가 있을 때만 다시 쌓는다 */
  if (ws.length < LORD.walls) { const pl = alive(b).find(x => x.pile); if (pl) { pl.norise = 1; pl.hp = 0; killEnemy(b, pl); } lordWall(b, e, pl ? LORD.mendPile : LORD.mendBare); logp(b, 'bad', e.n + '이(가) 무너진 벽을 다시 쌓는다' + (pl ? '. 바닥의 뼈가 줄었다' : '')); codexHit(b, 'cryptlord', 'mend'); }
  else { const w = ws.sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0]; w.hp = Math.min(w.hpMax, w.hp + w.hpMax * LORD.mendTop); logp(b, 'sys', e.n + '이(가) 뼈벽을 보수한다'); }
}
function lordFall(b, e) {
  e.lordNext = null; e.phase = 3; e.pn = 0; b.carve = null; for (const w of alive(b).filter(x => x.lordWall)) { w.alive = false; w.hp = 0; }
  e.row = 'front'; logp(b, 'crit', '옥좌가 무너진다'); hurtPlayer(b, b.p.hpMax * LORD.fall, { label: '무너지는 옥좌' });
  for (const x of alive(b).filter(x => x.pile)) riseSkel(b, x, ''); codexHit(b, 'cryptlord', 'fall');
}
function lordGuard(lv, id, ch) { const s0 = mkEnemy('skeleton', 0, id, { lv, name: (ENEMY_NAMES[ch] || ENEMY_NAMES[2] || {}).skeleton }); const D = diffOf(ch).lower; s0.hpMax = Math.round(s0.hpMax * D.hp * LORD.gHp); s0.hp = s0.hpMax; s0.dmg *= D.dmg * LORD.gDmg; s0.summoned = true; return s0; } // 근위 · 부름 해골: 하층 해골과 같은 세기 (10월 7일: 던전 배율이 빠져 1.6배로 때렸다)
function riseSkel(b, e, pre) { e.pile = null; e.rose = 1; e.hp = Math.max(1, Math.round(e.hpMax * RISE.hp)); e.intent = { k: 'brace' }; e.acts = 2; logp(b, 'bad', (pre || '') + '뼈 더미가 다시 맞춰져 ' + e.n + '이(가) 일어선다'); fxRun(b.p, 'onRise', b, b.p, e); }
/* ===== 3챕터 몸과 역할 · 열기 · 강적 · 재의 여왕 (10월 7일, docs/챕터/3챕터.md 6 · 9 · 10절. 강적 · 보스의 상세 · 대처는 비공개 문서) =====
   모래 잠복자는 2챕터 땅속(e.under, BURROW)을 그대로 쓴다. 허상 e.haze(카드 🌫️n), 붕대 e.wrap(🧻n), 열기 b.heat(전장 게이지), 화염 강화 e.fire.
   여기의 함수는 3챕터 몸(또는 3챕터 전투 b.ctx.ch ≥ 3)이 있을 때만 무언가를 한다. 1 · 2챕터 전투의 결과는 그대로다 */
const isCh3 = b => ((b && b.ctx && b.ctx.ch) || 1) >= 3;
const queenOf = b => b.en.find(e => e.boss === 'queen' && e.alive);
const MCH_K = ['mchant', 'mchanting', 'msong']; // 재의 시녀의 영창
const DMG_K = ['attack', 'heavy', 'firepot', 'ash', 'noon', 'erupt', 'constrict', 'burn', 'explode', 'brand', 'mirror', 'reflect', 'hand']; // 나를 직접 치는 예고 (내 화상 몫을 더해 보인다)
const hazeCap = e => e.foe === 'dancer' ? HAZE.capStrong : HAZE.cap;
/* 열기: 라운드 끝 오름 어림 */
function heatRise(b) {
  if (b.heat == null) return 0; const sh = hasBt(b.p, 'shade') ? 0.7 : 1; const q = queenOf(b);
  if (q) { let r = b.enrage ? QUEEN.enrageRise : QUEEN.rise[Math.min(QUEEN.rise.length, q.phase || 1) - 1]; if ((q.phase || 1) === 2 && q.under) r *= QUEEN.hiddenX; if (q.s.chill || q.slowR === b.round) r *= 0.5; return Math.round(r * sh); }
  return Math.round(HEAT.mod * sh);
}
const heatName = b => queenOf(b) ? '재폭풍' : '열풍';
function heatStormEst(b) { const q = queenOf(b); const lv = (q && q.lv) || (b.ctx && b.ctx.lv) || 1; const raw = HIT_REF(lv) * (q ? QUEEN.storm : HEAT.burst) * (b.halfBoom === b.round ? 0.5 : 1); return Math.min(raw, HIT_REF(lv) * UNAVOID_CAP) * (b.p.guard ? 0.5 : 1); }
function heatWarnSet(b, r) {
  if (b.heatWarn != null && b.heatWarn >= Math.min(r, b.round || 0)) return; b.heatWarn = r; b.heatWarnT = b.turnIdx; // 이미 뜬 예고(이번 라운드 · 다음 라운드)는 그대로 둔다
  logp(b, 'crit', '🌡️ ' + (r <= (b.round || 0) ? '이번' : '다음') + ' 라운드가 끝날 때 ' + heatName(b) + '이(가) 분다');
}
function heatAdd(b, n, why) {
  if (b.heat == null || !n) return 0; const h0 = b.heat; b.heat = Math.max(0, Math.min(100, b.heat + n)); const dd = b.heat - h0; if (!dd) return 0;
  if (dd > 0) { b.heatLog = b.heatLog || {}; b.heatLog[why] = (b.heatLog[why] || 0) + dd; }
  logp(b, dd > 0 ? 'bad' : 'good', '열기 ' + (dd > 0 ? '+' : '') + Math.round(dd) + ' (' + why + ') · ' + Math.round(b.heat) + '/100');
  if (b.heat >= 100) heatWarnSet(b, (b.queue || []).slice(b.cur ? 1 : 0).includes('p') ? (b.round || 0) : (b.round || 0) + 1); // 내 차례가 이번 라운드에 남아 있으면 이번 라운드 끝, 아니면 다음 라운드 끝 (2절 4-1번)
  return dd;
}
function heatStorm(b) {
  const q = queenOf(b); const lv = (q && q.lv) || b.ctx.lv || 1; const p = b.p;
  b.rec.push({ k: 'bigfire', role: 'heat', foe: q ? 'queen' : null, i: 'storm', gap: b.turnIdx - (b.heatWarnT != null ? b.heatWarnT : b.turnIdx) });
  logp(b, 'crit', q ? '재폭풍이 몰아친다' : '뜨거운 열풍이 분다');
  fxRun(p, 'onStorm', b, p); // 3챕터 장비
  hurtPlayer(b, HIT_REF(lv) * (q ? QUEEN.storm : HEAT.burst) * (b.halfBoom === b.round ? 0.5 : 1), { aoe: 1, spell: 1, charged: 1, label: q ? '재폭풍' : '열풍' });
  if (!b.over) { addS(b, p, 'ignite', q ? QUEEN.stormIgn : HEAT.burstIgn); if (q) addS(b, p, 'weak', QUEEN.stormWeak); }
  if (!q) for (const e of alive(b)) if (realFoe(e)) addS(b, e, 'ignite', HEAT.foeIgn);
  if (q) { codexHit(b, 'queen', 'storm'); if ((q.phase || 1) === 3 && !b.enrage && (q.p3Self || 0) < QUEEN.p3SelfMax && q.hp > 1) { q.p3Self = (q.p3Self || 0) + 1; const loss = Math.min(q.hp - 1, q.hpMax * QUEEN.p3StormSelf); q.hp -= loss; logp(b, 'good', q.n + '도 제 불에 탄다. ' + r1(loss) + ' 피해'); codexHit(b, 'queen', 'melt'); } }
  b.heat = q ? QUEEN.stormReset : HEAT.reset; b.heatWarn = null; b.heatWarnT = null;
}
/* 라운드 시작 (startRound 끝): 왕관이 다시 씌워진다, 이번 라운드 끝 열풍 예고 */
function ch3Round(b) {
  if (b.crownBack && (b.round || 0) >= b.crownBack) { const q = queenOf(b), c = b.en.find(x => x.role === 'crown'); b.crownBack = null; if (q && c && (q.phase || 1) < 3) { c.hpMax = Math.max(1, Math.round(c.hpMax * QUEEN.crownGrow)); c.hp = c.hpMax; c.alive = true; logp(b, 'bad', '재가 모여 ' + c.n + '이(가) 다시 씌워진다'); } }
  if (b.heat != null && b.heat + heatRise(b) >= 100) heatWarnSet(b, b.round || 0);
}
/* 라운드 끝 (tickOnce): 해시계, 열기 오름과 열풍 */
function ch3Tick(b, T) {
  for (const e of alive(b)) if (e.foe === 'sundial' && !e.noonNext) {
    if (e.s.chill || e.slowR === b.round) { codexHit(b, 'sundial', 'stall'); continue; }
    e.clock = Math.max(0, (e.clock != null ? e.clock : FOE_X.sundial.clock) - 1);
    if (e.clock === 1) logp(b, 'bad', '해시계의 그림자가 짧아진다. 다음 라운드 끝에 정오');
    if (e.clock <= 0) { e.noonNext = 1; e.intent = { k: 'noon' }; e.teleTurn = b.turnIdx; logp(b, 'crit', '해시계의 그림자가 사라진다. ' + e.n + '에게 빛이 모인다'); }
  }
  if (b.heat == null) return;
  const q = queenOf(b); const r = heatRise(b);
  if (r) heatAdd(b, r, q && (q.s.chill || q.slowR === b.round) ? '시간, 둔화' : q && q.under ? '시간, 모래' : '시간');
  if (q && q.under && (q.phase || 1) === 2) codexHit(b, 'queen', 'sand');
  if (q && b.enrage && b.heat < QUEEN.enrageFloor) heatAdd(b, QUEEN.enrageFloor - b.heat, '광폭');
  if (b.heat >= 100) { if (b.heatWarn != null && b.heatWarn <= (b.round || 0)) heatStorm(b); else heatWarnSet(b, (b.round || 0) + 1); }
  else if (b.heatWarn != null && b.heatWarn <= (b.round || 0)) { b.heatWarn = null; logp(b, 'good', '열기가 내려가 ' + heatName(b) + '이(가) 불지 않는다'); }
}
/* 전투 시작: 열기, 아지랑이, 붕대, 화염 강화, 강적 고유 값, 여왕 */
function ch3Setup(b, room) {
  const mods = room.mods || [];
  for (const e of b.en) { if (e.role === 'wrapped') { e.wrap = WRAP.hits; e.rewrapLeft = WRAP.rewrap; } if (e.foe === 'colossus') { e.spd = FOE_X.colossus.spd; e.glow = 0; } if (e.foe === 'sundial') e.clock = FOE_X.sundial.clock; if (e.foe === 'reaper') e.embers = 0; }
  for (const k of room.fire || []) if (b.en[k] && !b.en[k].strong) b.en[k].fire = 1;
  if (mods.includes('haze')) for (const e of alive(b)) if (realFoe(e)) e.haze = Math.max(e.haze || 0, 1);
  if (mods.includes('noon')) { b.heat = room.heat0 || HEAT.start; b.heatLog = {}; logp(b, 'sys', '공기가 일렁인다. 열기 ' + b.heat + '/100'); }
  const q = queenOf(b); if (q) { b.heat = QUEEN.heat0; b.heatLog = {}; q.brkMax = QUEEN.brk; }
}
/* 화상을 싣는 공격: 화염 강화(둔화 중에는 싣지 않음), 받은 불씨, 수확자의 낫질, 거상의 달아오름, 시녀의 불씨. 받은 불씨는 맞지 않아도 쓴다 */
function fireCarry(b, e, heavy, hit) {
  let n = 0; if (e.fire && !e.s.chill) n += heavy ? FIRE_AFFIX.heavy : FIRE_AFFIX.hit;
  if (e.fireNext) { n += e.fireNext; e.fireNext = 0; }
  if (!heavy && e.foe === 'reaper') n += 1; if (!heavy && e.foe === 'colossus') n += e.glow || 0; if (e.role === 'maid') n += 1;
  if (n > 0 && hit && !b.over) { const g = addS(b, b.p, 'ignite', n); if (g) logp(b, 'bad', e.n + '의 불이 옮겨붙는다. 화상 ' + g); }
  if (n > 0) fxRun(b.p, 'onFire', b, b.p, e, n, !!(hit && !b.over)); // 3챕터 장비
}
/* 허상: 1 지나감(광역 · 추적 3겹), 0 막힘, 0.5 맑은 눈의 성소 */
function hazeHit(b, e, o, fullF) {
  if (o.aoe) { if (e.foe === 'dancer' && e.haze > 0) { e.haze = 0; logp(b, 'good', '넓게 휘두르자 ' + e.n + '의 윤곽이 한꺼번에 흩어진다'); codexHit(b, 'dancer', 'sweep'); } return 1; }
  if (fullF) { logp(b, 'good', '추적 ' + HUNT.focusMax + '겹: ' + e.n + '의 허상을 꿰뚫는다'); return 1; }
  let th = 0; if (b.p.eq) for (const [k, f] of fxList(b.p)) if (f.hazeThru) { const v = f.hazeThru(b, b.p, e, o) || 0; if (v > th) { th = v; fxHit(k); } } // 3챕터 장비: 허상을 꿰뚫는 정도 (1이면 걷지도 않고 지나간다)
  if (th >= 1) { logp(b, 'good', e.n + '의 허상을 꿰뚫는다'); return 1; }
  e.haze--; e.hazeHit = b.actN; e.hazeLast = b.round; if (e.haze <= 0) { e.haze = 0; e.hazeSrc = null; }
  logp(b, 'sys', e.n + '의 허상이 흩어진다. 공격이 헛친다' + (e.haze ? ' (남은 허상 ' + e.haze + ')' : ''));
  if (e.foe === 'dancer') codexHit(b, 'dancer', 'copies');
  fxRun(b.p, 'onHaze', b, b.p, e, 'hit');
  return Math.max(th, hasBt(b.p, 'clarity') ? 0.5 : 0);
}
function wrapOff(b, e, why) { if (!(e.wrap > 0)) return; e.wrap = 0; e.wrapLast = b.round; logp(b, 'good', e.n + '의 붕대가 ' + why + ' 벗겨진다'); fxRun(b.p, 'onWrap', b, b.p, e, why === '불에 타' ? 'burn' : why === '찢겨' ? 'break' : 'other'); }
/* 3챕터 적이 받는 직접 피해의 배율 (지속 피해는 1. 열충격만 여왕의 열기를 내린다) */
function ch3HitMul(b, e, o) {
  if (o.dot) { if (o.shock && e.boss === 'queen' && b.qShockR !== b.round) { b.qShockR = b.round; heatAdd(b, -QUEEN.shock, '열충격'); } return 1; }
  if (e.role === 'crown') { if (e.crownAct !== b.actN) { e.crownAct = b.actN; if (b.crownR !== b.round) { b.crownR = b.round; b.crownRN = 0; } const can = Math.min(QUEEN.crownHit, QUEEN.crownRoundCap - (b.crownRN || 0)); if (can > 0) { b.crownRN = (b.crownRN || 0) + can; heatAdd(b, -can, '왕관'); codexHit(b, 'queen', 'crown'); } } return 1; }
  let m = 1;
  if (e.wrap > 0) { m *= 1 - WRAP.cut; e.wrap--; if (e.wrap <= 0) { e.wrap = 0; e.wrapLast = b.round; logp(b, 'good', e.n + '의 붕대가 세 번 맞아 풀린다'); fxRun(b.p, 'onWrap', b, b.p, e, 'worn'); } }
  if (e.row === 'back' && hasMod(b, 'sandstorm')) m *= 0.8;
  if (e.foe === 'stalker') {
    if (e.stkExp > 0) m *= 1 + FOE_X.stalker.exposedTaken;
    if (e.under && o.aoe && e.stlAct !== b.actN) { e.stlAct = b.actN; e.startle = (e.startle || 0) + 1; if (e.startle >= FOE_X.stalker.aoeReveal) { e.under = 0; e.stkPrep = 0; e.teleTurn = null; e.startle = 0; e.stkExp = 1; e.intent = { k: 'exposed' }; logp(b, 'crit', e.n + '이(가) 놀라 모래 위로 튀어나온다'); codexHit(b, 'stalker', 'startle'); } }
  }
  if (e.foe === 'sundial' && !e.noonNext && (e.clock != null ? e.clock : 9) <= FOE_X.sundial.lowAt && e.rwR !== b.round) { e.rwR = b.round; e.clock += FOE_X.sundial.lowBack; logp(b, 'good', e.n + '이(가) 움찔한다. 해시계 +' + FOE_X.sundial.lowBack + ' (' + e.clock + ')'); codexHit(b, 'sundial', 'shadow'); }
  return m;
}
/* 나와 적에게 상태가 실제로 붙은 뒤: 나에게 붙은 화상 셈(라운드 상한), 붕대는 불에 타고, 거상은 둔화에 식는다 */
function ch3OnStatus(b, u, k, added) {
  if (u === b.p) { if (k === 'ignite') { if (b.ignR !== b.round) { b.ignR = b.round; b.ignN = 0; } b.ignN += added; } return; }
  if (k === 'ignite' && u.wrap > 0) wrapOff(b, u, '불에 타');
  if (k === 'chill' && u.foe === 'colossus' && u.alive) {
    if ((u.glow || 0) >= 2 && u.crackR !== b.round) { u.crackR = b.round; addS(b, u, 'vuln', FOE_X.colossus.crackVuln); logp(b, 'good', u.n + '의 달아오른 유리에 금이 간다. 취약 ' + FOE_X.colossus.crackVuln); codexHit(b, 'colossus', 'crack'); addBreak(b, u, FOE_X.colossus.crackBrk); }
    if (u.glow > 0) { u.glow = Math.max(0, u.glow - added); logp(b, 'good', u.n + '이(가) 식는다. 달아오름 ' + u.glow + '/' + FOE_X.colossus.heatMax); }
  }
}
/* 무너졌을 때 (addBreak) */
function ch3OnBreak(b, e) {
  if (e.haze > 0) { e.haze = 0; e.hazeSrc = null; e.hazeLast = b.round; logp(b, 'good', e.n + '의 허상이 흩어진다'); }
  if (e.wrap > 0) wrapOff(b, e, '찢겨');
  if (e.foe === 'colossus' && e.glow) { e.glow = 0; logp(b, 'good', e.n + '의 붉은 빛이 꺼진다'); }
  if (e.foe === 'reaper' && e.embers) { e.embers = 0; logp(b, 'good', '낫의 불씨가 흩어진다'); codexHit(b, 'reaper', 'scatter'); }
  if (e.foe === 'sundial') { e.clock = Math.min(FOE_X.sundial.clock, (e.clock || 0) + FOE_X.sundial.brkBack); if (e.noonNext) { e.noonNext = 0; e.teleTurn = null; } if (e.intent && e.intent.k === 'noon') e.intent = { k: 'attack' }; logp(b, 'good', '그림자가 다시 길어진다. 해시계 ' + e.clock); codexHit(b, 'sundial', 'shadow'); }
  if (e.boss === 'queen') heatAdd(b, -QUEEN.breakHeat, '여왕이 무너짐');
  if (e.role === 'maid' && e.intent && MCH_K.includes(e.intent.k)) e.intent = { k: 'attack' };
}
/* 쓰러졌을 때 (killEnemy) */
function ch3OnKill(b, e) {
  if (e.role === 'mirage') { let n = 0; for (const x of alive(b)) if (x !== e && x.hazeSrc === e.id && x.haze > 0) { x.haze = 0; x.hazeSrc = null; n++; } if (n) logp(b, 'good', e.n + '이(가) 쓰러지자 아지랑이가 걷힌다'); }
  if (st(e, 'ignite') > 0 || e.ignLast === b.actN) { /* 쓰러뜨린 그 타격이 화상을 썼어도 불붙은 채 쓰러진 것 */ const rp = alive(b).find(x => x !== e && x.foe === 'reaper'); if (rp) { rp.embers = Math.min(FOE_X.reaper.cap, (rp.embers || 0) + FOE_X.reaper.death); logp(b, 'bad', '불붙은 채 쓰러진 ' + e.n + '의 불씨가 낫으로 날아든다. 불씨 ' + rp.embers); codexHit(b, 'reaper', 'ember'); } }
  if (e.boss === 'queen') { for (const x of b.en) if (x.alive && x !== e && (x.role === 'maid' || x.role === 'crown')) { x.alive = false; x.hp = 0; } b.crownBack = null; }
}
function crownBreak(b, c) {
  c.alive = false; c.hp = 0; const q = queenOf(b); logp(b, 'crit', c.n + '이(가) 깨진다');
  heatAdd(b, -QUEEN.crownBreak, '왕관이 깨짐'); codexHit(b, 'queen', 'crownbreak'); b.rec.push({ k: 'crown', ph: q ? q.phase || 1 : 0 });
  if (q) { addS(b, q, 'vuln', 2); if (q.crownStagPh !== (q.phase || 1)) { q.crownStagPh = q.phase || 1; q.stun = Math.max(q.stun || 0, 1); logp(b, 'good', q.n + '이(가) 휘청인다. 다음 행동을 놓친다'); } if ((q.phase || 1) < 3) b.crownBack = (b.round || 0) + QUEEN.crownRegrow; }
}
function maidSpawn(b, q) { const m = mkEnemy('maid', 0, b.idc++, { lv: q.lv || 1, name: (ENEMY_NAMES[3] || {}).maid }); m.hpMax = Math.max(1, Math.round(q.hpMax * QUEEN.maidHp)); m.hp = m.hpMax; m.dmg = q.dmg * QUEEN.maidHit; m.summoned = true; m.xpCh = 0; decideIntent(b, m); b.en.push(m); return m; }
function queenThresh(b, e) { const th = QUEEN.ph[(e.phase || 1) - 1]; if (th != null && e.hp <= e.hpMax * th && e.hp > 0) { e.hp = Math.max(1, Math.round(e.hpMax * th)); if (!e.qNext) { e.qNext = (e.phase || 1) === 1 ? 'qrise' : 'qmelt'; e.intent = { k: e.qNext }; e.teleTurn = null; e.under = 0; e.qPrep = 0; } } } // 페이즈 문턱은 한 번에 하나: 넘친 피해는 버린다
function queenIntent(b, e, n) {
  if (e.qNext) return { k: e.qNext };
  if (e.under) return e.qPrep ? { k: 'erupt' } : { k: 'surgeprep' };
  const c = (e.pn = (e.pn || 0) + 1) - 1, ph = e.phase || 1;
  if (ph === 2) { const s = c % QUEEN.p2Cycle; return s === QUEEN.p2Cycle - 2 ? { k: 'burrow' } : s === QUEEN.p2Cycle - 1 ? { k: 'ash' } : { k: 'attack' }; } // 공격(×p2Cycle−2) → 잠복 → 솟구칠 준비 → 솟구침 → 재 뿌리기
  const stormSoon = b.heat != null && ((b.heatWarn != null && b.heatWarn >= (b.round || 0)) || b.heat + heatRise(b) >= 100);
  const s = c % 4; return s === 1 ? { k: 'ash' } : s === 2 && !stormSoon ? { k: 'charge' } : { k: 'attack' }; // 공격 → 재 뿌리기 → 모으기 → 태양창
}
function queenAct(b, e, i, d) {
  switch (i.k) {
    case 'ash': { const x = hurtPlayer(b, d * QUEEN.breath, { src: e, single: 1, label: e.n + '이(가) 재를 흩뿌린다' }); fireCarry(b, e, 0, x > 0); heatAdd(b, QUEEN.ash, '재 뿌리기'); codexHit(b, 'queen', 'heat'); return 1; }
    case 'qrise': { e.qNext = null; e.phase = 2; e.pn = 0; logp(b, 'crit', '왕좌가 무너진다. 바닥이 모래로 덮인다'); heatAdd(b, QUEEN.p2Heat, '왕좌'); for (let k = 0; k < QUEEN.maidMax; k++) maidSpawn(b, e); logp(b, 'bad', '재의 시녀 둘이 일어선다'); return 1; }
    case 'qmelt': { e.qNext = null; e.phase = 3; e.pn = 0; const c = b.en.find(x => x.role === 'crown'); if (c) { c.alive = false; c.hp = 0; } b.crownBack = null; e.fire = 1; logp(b, 'crit', '왕관이 녹아내린다'); if (b.heat < QUEEN.p3Heat) heatAdd(b, QUEEN.p3Heat - b.heat, '녹은 왕관'); codexHit(b, 'queen', 'melt'); return 1; }
    case 'burrow': { e.under = 1; e.qPrep = 0; e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '이(가) 모래 속으로 가라앉는다'); return 1; }
    case 'surgeprep': { e.qPrep = 1; e.teleTurn = b.turnIdx; logp(b, 'sys', '모래가 들끓는다. ' + e.n + '이(가) 솟구칠 곳을 찾는다'); return 1; }
    case 'erupt': { e.under = 0; e.qPrep = 0; const x = hurtPlayer(b, d * QUEEN.surge, { src: e, single: 1, charged: 1, label: e.n + '이(가) 발밑에서 솟구친다' }); if (x > 0 && !b.over) addS(b, b.p, 'bleed', QUEEN.surgeBleed); fireCarry(b, e, 1, x > 0); if (alive(b).filter(m => m.role === 'maid').length < QUEEN.maidMax && (e.maidBackN || 0) < QUEEN.maidBack && !b.over) { e.maidBackN = (e.maidBackN || 0) + 1; maidSpawn(b, e); logp(b, 'bad', '모래 속에서 재의 시녀가 다시 일어선다'); } return 1; }
  }
  return 0;
}
function stalkIntent(b, e, n) {
  if (e.stkExp > 0) return { k: 'exposed' };
  if (e.under) return e.stkPrep ? { k: 'erupt' } : { k: 'surgeprep' };
  if (n % 5 === 1 && !bigPending(b, e)) return alive(b).some(x => x !== e && realFoe(x) && !x.under) ? { k: 'burrow' } : { k: 'dig' }; // 호위가 모두 쓰러지면 숨은 채 한 라운드만
  return { k: 'attack' };
}
function canHide3(b, e) { return !hasMod(b, 'flooded') && alive(b).some(x => x !== e && realFoe(x) && !x.under) && !alive(b).some(x => x !== e && x.under && !x.strong && x.role !== 'boss') && !bigPending(b, e) && !(b.ctx.ambush && (b.round || 0) <= 1); }
function danceAct(b, e, d) {
  const X = FOE_X.dancer; const hits = 1 + (e.haze || 0); const per = HIT_REF(e.lv || 1) * X.hit * d / Math.max(0.01, e.dmg); const cap = b.p.hpMax * X.capTot; let tot = 0, landed = 0;
  logp(b, 'crit', e.n + '이(가) 칼춤을 춘다. ' + hits + '번'); codexHit(b, 'dancer', 'dance');
  for (let k = 0; k < hits && !b.over; k++) { const left = cap - tot; if (left <= 0.05) break; const x = hurtPlayer(b, per, { src: e, single: 1, charged: k === 0 ? 1 : 0, maxD: left, label: e.n + '의 칼춤 (' + (k + 1) + '/' + hits + ')' }); tot += x; if (x > 0) landed++; }
  if (landed && !b.over) addS(b, b.p, 'vuln', EKW.heavyVuln); e.haze = 0;
}
function danceEst(b, e) { const X = FOE_X.dancer; const hits = 1 + (e.haze || 0); const per = HIT_REF(e.lv || 1) * X.hit * enemyHitEst(b, e) / Math.max(0.01, e.dmg); const n = st(b.p, 'ignite'); let ig = 0; for (let k = 0; k < hits; k++) ig += Math.max(0, n - k); return { hits, d: Math.min(b.p.hpMax * X.capTot, per * hits + ig), ig }; }
function reapAct(b, e) {
  const half = !!(e.s.chill || e.slowR === b.round); let tot = 0;
  const take = u => { const n0 = st(u, 'ignite'); if (!n0) return 0; const t = half ? Math.floor(n0 / 2) : n0; if (t > 0) kwDec(u, 'ignite', t); return t; };
  tot += take(b.p); for (const x of alive(b)) if (x !== e && x.role !== 'crown') tot += take(x);
  if (tot > 0) { const g = Math.max(1, Math.floor(tot / 2)); e.embers = Math.min(FOE_X.reaper.cap, (e.embers || 0) + g); logp(b, 'bad', e.n + '이(가) 불씨를 거둔다. 화상 ' + tot + '을(를) 거두어 불씨 ' + e.embers + (half ? ' (둔화로 절반)' : '')); codexHit(b, 'reaper', 'reap'); }
  else logp(b, 'sys', e.n + '이(가) 낫을 휘젓지만 거둘 불꽃이 없다');
}
function noonAct(b, e, d) {
  const raw = HIT_REF(e.lv || 1) * FOE_X.sundial.noon * d / Math.max(0.01, e.dmg);
  hurtPlayer(b, raw, { src: e, aoe: 1, spell: 1, charged: 1, wardAll: 1, label: '정오의 빛이 내리꽂힌다' });
  for (const x of alive(b)) if (realFoe(x)) addS(b, x, 'empower', FOE_X.sundial.noonEmp);
  logp(b, 'bad', '빛을 받은 적들이 거세진다. 강화 ' + FOE_X.sundial.noonEmp); e.clock = FOE_X.sundial.clock; e.noonNext = 0; codexHit(b, 'sundial', 'noon');
}
/* 3챕터 행동 (enemyAct의 switch 앞): 처리했으면 1 */
function ch3Act(b, e, i, d) {
  if (e.boss === 'queen' && queenAct(b, e, i, d)) return 1;
  switch (i.k) {
    case 'firepot': { const x = hurtPlayer(b, d * EMBER.pot, { src: e, single: 1, label: e.n + '이(가) 불단지를 던진다' }); if (x > 0 && !b.over) { addS(b, b.p, 'ignite', EMBER.potIgn); if (b.heat != null) heatAdd(b, HEAT.ember, '불단지'); } return 1; }
    case 'share': { const t = b.en.find(x => x.id === i.tgt && x.alive); if (t) { t.fireNext = EMBER.share; logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 불씨를 나눈다. 다음 공격에 화상 ' + EMBER.share); } return 1; }
    case 'rewrap': { if (st(e, 'ignite') > 0 || e.s.broken) logp(b, 'good', e.n + '이(가) 붕대를 감으려 하지만 실패한다'); else { e.wrap = WRAP.hits; e.rewrapLeft = (e.rewrapLeft || 0) - 1; logp(b, 'bad', e.n + '이(가) 붕대를 다시 감는다. 붕대 ' + e.wrap); } return 1; }
    case 'haze': { const t = b.en.find(x => x.id === i.tgt && x.alive); if (t) { t.haze = Math.min(hazeCap(t), (t.haze || 0) + (i.n || 1)); t.hazeSrc = e.id; logp(b, 'bad', '아지랑이가 ' + t.n + '을(를) 감싼다. 허상 ' + t.haze); } return 1; }
    case 'exposed': { if (e.stkExp > 0) e.stkExp--; logp(b, 'sys', e.n + '이(가) 모래 위에서 숨을 고른다'); if (e.foe === 'stalker') codexHit(b, 'stalker', 'exposed'); return 1; }
    case 'surgeprep': { e.stkPrep = 1; e.teleTurn = b.turnIdx; logp(b, 'sys', '모래가 들끓는다. ' + e.n + '이(가) 솟구칠 곳을 찾는다'); return 1; }
    case 'dig': { e.under = 1; e.stkPrep = 1; e.startle = 0; e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '이(가) 모래 속으로 파고든다. 모래가 들끓는다'); codexHit(b, 'stalker', 'hide'); return 1; }
    case 'heatup': { e.glow = Math.min(FOE_X.colossus.heatMax, (e.glow || 0) + 1); logp(b, 'bad', e.n + '의 몸속 붉은 빛이 짙어진다. 달아오름 ' + e.glow + '/' + FOE_X.colossus.heatMax); codexHit(b, 'colossus', 'heat'); return 1; }
    case 'reap': reapAct(b, e); return 1;
    case 'noon': noonAct(b, e, d); return 1;
    case 'clone': { e.haze = FOE_X.dancer.haze; logp(b, 'bad', e.n + '이(가) 한 바퀴 돈다. 윤곽이 ' + e.haze + '겹으로 번진다'); return 1; }
    case 'mchant': { e.chant = { taken: 0, need: Math.round(e.hpMax * CHANT.cut) }; logp(b, 'sys', e.n + '이(가) 영창을 시작한다'); return 1; }
    case 'mchanting': logp(b, 'sys', e.n + '의 영창이 높아진다. 재가 뜨겁게 일렁인다'); return 1;
    case 'msong': { e.chant = null; e.pyreRest = 1; heatAdd(b, QUEEN.chant, '시녀의 영창'); codexHit(b, 'queen', 'chant'); return 1; }
  }
  if (i.k === 'burrow' && e.role === 'lurker' && !e.strong) { e.under = 1; e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '이(가) 모래 속으로 사라진다. 발밑 모래가 숨을 쉰다'); return 1; }
  if (i.k === 'burrow' && e.foe === 'stalker') { e.under = 1; e.stkPrep = 0; e.startle = 0; e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '이(가) 모래 속으로 사라진다'); codexHit(b, 'stalker', 'hide'); return 1; }
  if (i.k === 'erupt' && e.foe === 'stalker') {
    e.under = 0; e.stkPrep = 0; const o = { src: e, single: 1, charged: 1, label: e.n + '이(가) 발밑에서 솟구친다' }; const x = hurtPlayer(b, d * heavyMulOf(e, b), o);
    if (x > 0 && !b.over) addS(b, b.p, 'bleed', FOE_X.stalker.surgeBleed); if (e.alive) { addS(b, e, 'vuln', BURROW.vuln); e.stkExp = o.parried ? FOE_X.stalker.parryRest : 1; logp(b, 'good', e.n + '이(가) 드러난다. 취약 ' + BURROW.vuln); } return 1;
  }
  if (i.k === 'heavy' && e.foe === 'dancer') { danceAct(b, e, d); return 1; }
  return 0;
}
/* 3챕터 의도 (decideIntent의 역할 칸) */
function ch3Intent(b, e, n, al) {
  switch (e.role) {
    case 'lurker': { if (e.under) return { k: 'erupt' }; if (e.lurkRest) { e.lurkRest = 0; return { k: 'exposed' }; } return n % 4 === 1 && canHide3(b, e) ? { k: 'burrow' } : { k: 'attack' }; } // 공격 → 잠복 → 솟구침 → 드러남
    case 'ember': { const c = n % 3; if (c === 0) return { k: 'firepot' }; if (c === 1) { const t = al.filter(x => x !== e && realFoe(x) && !x.under && !x.fireNext && !['healer', 'ember', 'mirage', 'maid', 'summoner', 'pyre'].includes(x.role)).sort((x, y) => ((y.intent && ['attack', 'heavy', 'charge'].includes(y.intent.k)) - (x.intent && ['attack', 'heavy', 'charge'].includes(x.intent.k))) || (y.dmg - x.dmg))[0]; if (t) return { k: 'share', tgt: t.id }; } return { k: 'attack' }; } // 불단지 → 불씨 나누기 → 공격
    case 'wrapped': { const c = n % 4; return c === 1 ? (!(e.wrap > 0) && e.rewrapLeft > 0 ? { k: 'rewrap' } : { k: 'brace' }) : (c === 2 && !bigPending(b, e)) ? { k: 'charge' } : { k: 'attack' }; } // 공격 → 버티기(붕대 다시 감기) → 강타 준비 → 강타
    case 'mirage': { const c = n % 3; if (c === 1) return { k: 'attack' }; if (c === 0) { const pr = x => ((x.chant || (x.intent && x.intent.k === 'heal')) ? 3 : 0) + (x.intent && ['charge', 'heavy'].includes(x.intent.k) ? 2 : 0) + (1 - x.hp / x.hpMax); const t = al.filter(x => x !== e && realFoe(x) && !x.under && (x.haze || 0) < hazeCap(x)).sort((x, y) => pr(y) - pr(x))[0]; if (t) return { k: 'haze', tgt: t.id, n: HAZE.give }; } return (e.haze || 0) < hazeCap(e) ? { k: 'haze', tgt: e.id, n: HAZE.self } : { k: 'attack' }; } // 아지랑이(동료) → 어둠 화살 → 아지랑이(나)
    case 'crown': return { k: 'none' };
    case 'maid': { const other = al.some(x => x !== e && x.role === 'maid' && x.chant); if (e.chant && e.intent && e.intent.k === 'mchant') return { k: 'mchanting' }; if (e.chant && e.intent && e.intent.k === 'mchanting') return { k: 'msong' }; if (e.pyreRest) { e.pyreRest = 0; return { k: 'attack' }; } return other ? { k: 'brace' } : { k: 'mchant' }; } // 영창 시작 → 영창 → 열기 영창 → 불씨 던지기 (한 번에 한 시녀만, 다른 시녀가 영창하면 버틴다)
  }
  return null;
}
function strong3Intent(b, e, n) {
  if (e.foe === 'stalker') return stalkIntent(b, e, n);
  if (e.foe === 'colossus') return (e.glow || 0) >= FOE_X.colossus.heatMax ? { k: 'charge' } : n % 2 === 1 ? { k: 'heatup' } : { k: 'attack' };
  if (e.foe === 'reaper') { const c = n % 4; return c === 1 ? { k: 'reap' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; }
  if (e.foe === 'sundial') { if (e.noonNext) return { k: 'noon' }; if (n % 2 === 1) return { k: 'attack' }; const hurt = alive(b).filter(x => realFoe(x) && x.hp < x.hpMax * PRIEST.heal).sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0]; if (hurt) return { k: 'heal', tgt: hurt.id }; const bt = alive(b).filter(x => x !== e && realFoe(x) && !x.s.empower && !['healer', 'thief'].includes(x.role)).sort((x, y) => y.dmg - x.dmg)[0]; return bt ? { k: 'bless', tgt: bt.id } : { k: 'attack' }; } // 치유(또는 축복) ↔ 공격 (10월 7일: 늘 공격하던 첫 판은 쓰러짐 63%)
  if (e.foe === 'dancer') { const c = n % 4; return c === 0 ? { k: 'clone' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; }
  return null;
}
/* 3챕터 예고 아이콘 · 문장 */
function ch3Badge(b, e, i, est, capOf) {
  const tn = id => { const t = b.en.find(x => x.id === id); return t ? t.n : ''; };
  switch (i.k) {
    case 'firepot': return { ico: '🏺', num: r1(capOf(est * EMBER.pot)), txt: '불단지 · 화상 ' + EMBER.potIgn, cls: 'atk' };
    case 'share': return { ico: '🔥', num: '', txt: '불씨 나누기 → ' + tn(i.tgt), cls: 'warn' };
    case 'rewrap': return { ico: '🧻', num: '', txt: '붕대 다시 감기', cls: 'warn' };
    case 'haze': return { ico: '🌫️', num: '', txt: '아지랑이 → ' + (i.tgt === e.id ? '자기' : tn(i.tgt)) + ' · 허상 ' + (i.n || 1), cls: 'warn' };
    case 'exposed': return { ico: '😵', num: '', txt: '숨을 고른다', cls: 'sup' };
    case 'surgeprep': case 'dig': return { ico: '🏜️', num: '', txt: '모래 속 · 곧 솟구침', cls: 'warn' };
    case 'heatup': return { ico: '🔥', num: '', txt: '달구기 · 달아오름 ' + Math.min(FOE_X.colossus.heatMax, (e.glow || 0) + 1) + '/' + FOE_X.colossus.heatMax, cls: 'warn' };
    case 'reap': return { ico: '🌾', num: '', txt: '불씨를 거둔다', cls: 'warn' };
    case 'noon': return { ico: '☀️', num: r1(Math.min(capOf(HIT_REF(e.lv || 1) * FOE_X.sundial.noon * est / Math.max(0.01, e.dmg)), HIT_REF(e.lv || 1) * UNAVOID_CAP)), txt: '정오의 빛', cls: 'hv' };
    case 'clone': return { ico: '🌫️', num: '', txt: '윤곽이 번진다 · 허상 ' + FOE_X.dancer.haze, cls: 'warn' };
    case 'ash': return { ico: '🌫️', num: r1(capOf(est * QUEEN.breath)), txt: '재 뿌리기 · 열기 +' + QUEEN.ash, cls: 'atk' };
    case 'qrise': case 'qmelt': return { ico: '…', num: '', txt: '숨을 고른다', cls: 'sup' };
    case 'mchant': return { ico: '📿', num: '', txt: '영창 시작', cls: 'warn' };
    case 'mchanting': return { ico: '📿', num: '', txt: '영창 · 곧 열기', cls: 'hv' };
    case 'msong': return { ico: '📿', num: '+' + QUEEN.chant, txt: '열기 영창', cls: 'hv' };
    case 'burrow': return { ico: '🏜️', num: '', txt: '모래 속으로 · 곧 솟구침', cls: 'warn' };
    case 'erupt': { const m = e.boss === 'queen' ? QUEEN.surge : e.strong ? heavyMulOf(e, b) : BURROW.up; return { ico: '🦂', num: r1(capOf(est * m)), txt: '솟구침 · 출혈 ' + (e.boss === 'queen' ? QUEEN.surgeBleed : e.foe === 'stalker' ? FOE_X.stalker.surgeBleed : LURK.bleed), cls: 'hv' }; }
    case 'heavy': if (e.foe === 'dancer') { const x = danceEst(b, e); return { ico: '💥', num: r1(x.d), txt: '칼춤 ×' + x.hits + ' · 취약 ' + EKW.heavyVuln, cls: 'hv' }; } return null;
  }
  return null;
}
function ch3Text(b, e, i, est) {
  const tn = id => { const t = b.en.find(x => x.id === id); return t ? t.n : '동료'; };
  switch (i.k) {
    case 'firepot': return { t: '불단지를 던진다 ' + r1(est * EMBER.pot) + ' · 화상 ' + EMBER.potIgn + '. 던지는 공격이라 몸을 빼 피할 수 있다', hv: 0 };
    case 'share': return { t: tn(i.tgt) + '에게 불씨를 나눈다. 그 적의 다음 공격이 화상 ' + EMBER.share + '을(를) 싣는다', hv: 1 };
    case 'rewrap': return { t: '붕대를 다시 감는다. 그 전에 화상을 걸거나 무너뜨리면 실패한다', hv: 1 };
    case 'haze': return { t: '아지랑이로 ' + (i.tgt === e.id ? '자기를' : tn(i.tgt) + '을(를)') + ' 감싼다. 허상 ' + (i.n || 1), hv: 1 };
    case 'exposed': return { t: '모래 위에서 숨을 고른다. 공격하지 않는다', hv: 0 };
    case 'surgeprep': case 'dig': return { t: '모래 속에서 들끓는다. 다음 행동에 솟구친다. 모래 속이라 한 적 대상으로 고를 수 없다', hv: 1 };
    case 'heatup': return { t: '몸을 달군다. 달아오를수록 평소 공격이 화상을 싣는다', hv: 1 };
    case 'reap': return { t: '낫으로 불씨를 거두려 한다', hv: 1 };
    case 'noon': return { t: '정오의 빛 ' + r1(HIT_REF(e.lv || 1) * FOE_X.sundial.noon * est / Math.max(0.01, e.dmg)) + '. 피할 수 없다', hv: 1 };
    case 'clone': return { t: '한 바퀴 돌아 윤곽을 번지게 한다. 허상 ' + FOE_X.dancer.haze, hv: 1 };
    case 'ash': return { t: '재를 흩뿌린다 ' + r1(est * QUEEN.breath) + '. 열기 +' + QUEEN.ash, hv: 0 };
    case 'qrise': case 'qmelt': return { t: '숨을 고른다', hv: 0 };
    case 'mchant': return { t: '영창을 시작한다. 영창하는 동안 생명력의 ' + Math.round(CHANT.cut * 100) + '%만큼 피해를 받으면 끊긴다', hv: 1 };
    case 'mchanting': return { t: '영창 중. 끊기까지 피해 ' + r1(e.chant ? e.chant.need - e.chant.taken : 0), hv: 1 };
    case 'msong': return { t: '영창이 끝난다. 열기 +' + QUEEN.chant, hv: 1 };
    case 'burrow': return { t: '모래 속으로 파고든다. 그다음 행동에 솟구친다', hv: 1 };
    case 'erupt': { const m = e.boss === 'queen' ? QUEEN.surge : e.strong ? heavyMulOf(e, b) : BURROW.up; return { t: '솟구친다 ' + r1(est * m) + ' · 출혈 ' + (e.boss === 'queen' ? QUEEN.surgeBleed : e.foe === 'stalker' ? FOE_X.stalker.surgeBleed : LURK.bleed) + '. 모래 속이라 한 적 대상으로 고를 수 없다', hv: 1 }; }
    case 'heavy': if (e.foe === 'dancer') { const x = danceEst(b, e); return { t: '칼춤 ' + x.hits + '번, 모두 ' + r1(x.d) + ' · 맞으면 취약 ' + EKW.heavyVuln, hv: 1 }; } return null;
  }
  return null;
}
/* 3챕터 방 특성 고르기 (4.2 · 10.1절): 띠 · 길 무게, 시야 특성은 하나, 시련은 둘 가운데 하나가 3챕터 특성 */
function rollMods3(run, n, f, forceMod) {
  const ks = Object.keys(MOD3).filter(k => ROOM_MODS[k] && (!MOD3[k].from || f >= MOD3[k].from)); const out = forceMod ? [forceMod] : [];
  const wOf = k => { const M = MOD3[k]; let w = 1; for (const [to, x] of M.band || []) if (f <= to) { w *= x; break; } w *= ((M.path || {})[run.path] || 1); return w; };
  const pick = list => { let x = Math.random() * list.reduce((a, k) => a + wOf(k), 0); for (const k of list) { x -= wOf(k); if (x <= 0) return k; } return list[list.length - 1]; };
  if (n >= 2 && !out.length) { const nw = ks.filter(k => MOD3_NEW.includes(k)); if (nw.length) out.push(pick(nw)); }
  while (out.length < n) { const c = ks.filter(k => !out.includes(k) && !(MOD3_SIGHT.includes(k) && out.some(o => MOD3_SIGHT.includes(o)))); if (!c.length) break; out.push(pick(c)); }
  return out;
}
const strong3Ok = (run, x, f) => (!x.from || f >= x.from) && (isLower(f) || x.upper !== 0) && (!x.needs || x.needs.every(r => introOk(run, r)));
const floorBand3 = f => BANDS3.find(x => f <= x.to) || BANDS3[BANDS3.length - 1];
const EKW = { archerBleed: 2, archerEvery: 3, heavyVuln: 2, explodeWeak: 2, explodeMul: 3, aimMul: 1.35, curseWeak: 2, braceRed: 0.5 };
/* 10월 4일 적 행동 개편 (docs/기록/0.6a.2-적-행동-기획.md): 한 번 피해의 기준 생명력, 사제가 치유하는 문턱, 소환사가 한 번에 부르는 수와 하수인 상한 */
const HIT_REF = lv => 102 + 5 * (lv - 1);
const PRIEST = { heal: 0.4 };
const SUMMON = { n: 1, cap: 3 };
const heavyMulOf = (e, b) => e.role === 'boss' ? TELE.boss : e.strong && e.bigMul ? e.bigMul * foeBigMul(b, e) : TELE.heavy; // 강적의 강타는 기준 생명력 × STRONG.big (e.bigMul) // explodeMul: 자폭병 폭발 = 평소 공격 × 3 (10월 3일: 폭발이 평소 공격과 같아 "터지기 전에 끊는다"는 판단이 없었다)
const ENRAGE = { boss: 45, room: 40, step: 10, byBoss: { queen: 50 } }; // byBoss: 보스마다 다른 광폭화 시각 (3챕터 재의 여왕) // 광폭화 시각(시간 단위)과 짙어지는 간격
const ABBOT = { brand: 0.2, vowTaken: 0.6, monkHeal: 0.05, monkDecay: 0.85, healHp: 0.10, shieldHp: 0.18, candleHp: 0.04, candles: [2, 3, 4], candleHeal: 0.03, candleDecay: 0.65, vowR: 3, sermonR: 3, sermonWeak: 2, stoneEvery: 3, stoneP: 0.06, stoneM: 0.10, altar: 0.08, sacHp: 0.15, sacHeal: 0.20, sacCool: 3 }; // 10월 4일 고해의 밤 (상세는 비공개 문서)
