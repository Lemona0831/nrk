'use strict';
const fxList = p => { const out = []; if (!p || !p.eq) return out; for (const sl in p.eq) { const k = p.eq[sl]; if (k && IFX[k]) out.push([k, IFX[k]]); } if (p.awk && p.awk.length) for (const a of p.awk) if (IFX_AWK[a]) out.push(['awk_' + a, IFX_AWK[a]]); /* 깨달음 */ return out; };
/* 배율·더하기 지점: 바뀌면 센다 */
function fxMul(p, hook, ...a) { let m = 1; for (const [k, f] of fxList(p)) if (f[hook]) { const v = f[hook](...a); if (v !== 1 && v != null) { m *= v; fxHit(k); } } return m; }
function fxAdd(p, hook, ...a) { let m = 0; for (const [k, f] of fxList(p)) if (f[hook]) { const v = f[hook](...a); if (v) { m += v; fxHit(k); } } return m; }
function fxFlag(p, key) { for (const [k, f] of fxList(p)) if (f[key]) { fxHit(k); return true; } return false; }
function fxRun(p, hook, ...a) { for (const [k, f] of fxList(p)) if (f[hook] && f[hook](...a)) fxHit(k); }
function fxVal(p, key, init, comb) { let v = init; for (const [k, f] of fxList(p)) if (f[key] != null) { v = comb(v, f[key]); } return v; }
function fxStat(p, key) { let v = 0; for (const [, f] of fxList(p)) if (f.st && f.st[key]) v += f.st[key]; return v; }
const consTurnOf = p => CONS_TURN + fxVal(p, 'consTurn', 0, (a, v) => a + v); /* 한 차례에 쓰는 소모품 수 (깨달음 넉넉한 손 +1) */
function flaskCap(p, k) { return Math.max(1, (p.flaskMax || 3) - (p.markFlask || 0) + fxList(p).reduce((a, [, f]) => a + ((f.cap && f.cap[k]) || 0), 0)); }
function actCost(p, id, base) { return Math.max(0, base + fxAdd(p, 'cost', p, id)); }

const ST_REGEN = 10; // 스태미나 자연 회복 (라운드가 끝날 때마다). B0.5의 8에서 올림: 기본 공격이 스태미나를 채우지 않게 되면서 3,840판 비교로 정함 (11.6절)
const gearOf = p => p.gear || START_GEAR;
function wpnDmg(p) { return gearOf(p).wpn * ((BUILDS[p.build] || {}).wpnMul || 1); } // wpnMul: 직업마다 무기 피해 배율 (사냥꾼 활 55%: 후열에 바로 닿는 물리직, 10월 5일)
function basicBase(p) { return wpnDmg(p) * (isCaster(p) && !isV2(p) ? 0.9 : 1) * (hasIt(p, 'venomring') ? 0.9 : 1); }
const HEAVY_V2 = 1.5; // 0.6a.2 직업의 강공격 배율 (도움말·설명 창도 이 값을 쓴다)
function heavyBase(p) { return wpnDmg(p) * (isCaster(p) && !isV2(p) ? 1.6 : isV2(p) ? HEAVY_V2 : 1.8) * (p.eq.weapon === 'twin' ? 0.8 : 1); } // 0.6a.2: 강공격 180% → 150% (10월 3일: 공통 행동이 갈래 스킬보다 세서 갈래 성격이 묻혔다)
function flaskHealFrac(p) { return (gearOf(p).flask + (hasBt(p, 'mercy') ? 0.1 : 0) + fxVal(p, 'heal', 0, (a, v) => a + v)) * fxVal(p, 'healMul', 1, (a, v) => a * v) * (p.eq.flask === 'chalice' ? 0.9 : p.eq.flask === 'boilflask' ? 0.75 : p.eq.flask === 'bloodoil' ? 0.8 : 1); }
function calcMpMax(p) { if (isV2(p)) return 0; return BUILDS[p.build].mp + gearOf(p).mp + fxStat(p, 'mp') + ((p.lv || 1) - 1) * ((LV_GAIN[p.build] || {}).mp || 0) + stat(p, 'int') - (p.eq.amulet === 'sigil' ? 15 : 0) - (p.eq.gloves === 'vpouch' ? 10 : 0); }
function calcStMax(p) { return 100 + gearOf(p).st + fxStat(p, 'st') + stat(p, 'dex') - (p.eq.amulet === 'vanguard' ? 20 : 0) - (p.eq.gloves === 'chaingl' ? 10 : 0); }
function calcHpMax(p) { return Math.round(fxVal(p, 'hpMul', 1, (a, v) => a * v) * (1 - (p.hpPen || 0)) * (BUILDS[p.build].hp + gearOf(p).hp + fxStat(p, 'hp') + (p.hpBonus || 0) + ((p.lv || 1) - 1) * ((LV_GAIN[p.build] || {}).hp || 0) + stat(p, 'str') + 3 * stat(p, 'con')) * (p.eq.armor === 'plate' ? 0.9 : p.eq.armor === 'wardcrest' ? 0.95 : p.eq.armor === 'cloak' || p.eq.armor === 'thorns' ? 0.95 : 1) * (p.eq.amulet === 'rosary' ? 0.97 : 1)); }
function parryRed(p) { return Math.min(0.9, (p.build === 'assassin' && isV2(p) ? 0.7 : 0.6) + 0.005 * stat(p, 'dex') + (p.eq.armor === 'cloak' ? 0.15 : 0)); }
/* 강적·보스의 공격은 흘려도 줄이는 몫이 작다(모든 흘리기, 10월 3일 만든 사람: 거구의 힘은 칼끝으로 다 흘리지 못한다. 흘리기로 싸우는 그림자의 거구 약점).
   50상황 2차 탐색에서 고른 중간 지점: 정예까지 넣으면 독사의 장기전 강점이 깨지고, 25%p면 그림자의 보스전 이길 수단이 문턱 아래로 떨어졌다 */
const PARRY_BIG = 0.2;
/* 보호막 (0.6a.2, 10월 3일 만든 사람 결정): 피해를 먼저 대신 받아낸다. v2 직업의 상한은 최대 생명력의 30%이고, 라운드가 지나도 줄지 않으며 전투가 끝나면 사라진다(endBattleCarry).
   파수꾼은 방어할 때마다 +6. 옛 직업(0.6a)의 상한 40은 그대로 둔다 */
const WARD = { cap: 0.3, guard: 6, thornMax: 8, back: 0.5 }; // back: 후열 적의 공격은 보호막이 이만큼만 받아낸다 (10월 4일 만든 사람 결정: 파수꾼의 약점은 후열)
function wardMax(p) { return isV2(p) ? Math.round(p.hpMax * ((BUILDS[p.build] || {}).wardCap || WARD.cap)) : 40; } // wardCap: 직업마다 상한 (마검사 15%)
function addWard(b, p, n, cap) { n *= 1 + 0.02 * stat(p, 'wil'); { const wp = p.eq ? fxAdd(p, 'wardP', b, p) : 0; if (wp) n *= 1 + Math.min(FX_CAP, wp); } if (b && b.carve && b.cur && b.cur.grp) n *= carveMul(b, b.cur.grp); /* 의지 1점마다 보호막 +2% */ const m = Math.min(cap != null ? cap : Infinity, wardMax(p)); const w0 = p.ward || 0; p.ward = Math.max(w0, Math.min(m, w0 + n)); if (w0 + n > m && p.eq) fxRun(p, 'onWardOver', b, p, w0 + n - Math.max(m, w0)); return p.ward - w0; }
const parryBig = e => (e && (e.strong || e.role === 'boss') ? PARRY_BIG : 0);
function dotMul(p) { return 1 + 0.02 * stat(p, 'int'); }
function applyStats(p, stats) {
  const f = { hp: p.hp / p.hpMax, mp: p.mpMax ? p.mp / p.mpMax : 1, st: p.st / p.stMax };
  p.stat = Object.assign({ str: 0, dex: 0, int: 0, con: 0, wil: 0 }, stats);
  p.hpMax = calcHpMax(p); p.mpMax = calcMpMax(p); p.stMax = calcStMax(p);
  p.hp = Math.min(p.hpMax, Math.round(p.hpMax * f.hp)); p.mp = Math.min(p.mpMax, p.mpMax * f.mp); p.st = Math.min(p.stMax, p.stMax * f.st);
}
function mkPlayer(build, items, stats, skills) {
  const it = items || {};
  const s0 = Object.assign({ str: 0, dex: 0, int: 0, con: 0, wil: 0 }, stats || {});
  const p = {
    stat: s0, skills: (skills && skills.length ? skills : DEFAULT_SKILLS[build]).slice(0, BUILDS[build].v2 ? EQUIP_SLOTS2 + ((TREE2[build] || {}).starters || []).length : SKILL_SLOTS),
    build, gear: Object.assign({}, START_GEAR),
    scar: 0, rage: 0, flask: { life: 3, mana: 3, stam: 3 }, flaskMax: 3,
    eq: Object.assign({ weapon: null, armor: null, amulet: null, flask: null, ring1: null, ring2: null, gloves: null }, it),
    s: {}, guard: 0, dodge: 0, counter: 0, reflux: null, lastSkillDmg: 0, stun: 0,
  };
  p.hpMax = calcHpMax(p); p.hp = p.hpMax; p.mpMax = calcMpMax(p); p.mp = p.mpMax; p.stMax = calcStMax(p); p.st = p.stMax;
  return p;
}
function mkEnemy(role, elite, idx, opt) {
  const R = ROLES[role]; opt = opt || {};
  const lv = opt.lv || 1; const lh = Math.pow(1 + MLV_HP, lv - 1), ld = Math.pow(1 + MLV_DMG, lv - 1);
  const hpMax = Math.round(BHP * R.hp * (elite ? 1.8 : 1) * lh * (opt.tough ? 1.5 : 1) * (opt.hpx || 1)); // hpx: 수련장 전용 체력 배율
  const e = {
    id: 'e' + idx + '_' + role, role, n: (elite ? '정예 ' : '') + (opt.name || R.n), rn: R.n, ico: R.ico, elite: !!elite, tough: !!opt.tough, lv,
    row: R.row, hpMax, hp: Math.round(hpMax * (opt.hp || 1)), dmg: (R.hit != null ? HIT_REF(lv) * R.hit : BDMG * R.dmg * ld) * (elite ? 1.25 : 1),
    spd: R.spd, brkMax: elite ? 100 : 50, brk: 0, s: {}, stun: 0, acts: 0, alive: true, next: 0,
    intent: null,
  };
  if (opt.brk) e.brk = Math.round(e.brkMax * opt.brk);
  return e;
}
/* 적 하나의 경험치 (11.4절). 소환된 적은 0 */
function xpOf(e) { if (e.summoned) return 0; const base = e.role === 'boss' ? XP_BASE.boss : e.strong ? XP_BASE.strong : e.elite ? XP_BASE.elite : XP_BASE.normal; return base * (1 + XP_LV * ((e.lv || 1) - 1)) * (e.xpCh || 1); }
function mkBoss(kind, hpFrac, lv) {
  const B = BOSSES[kind]; lv = lv || 1;
  const hpMax = BHP * B.mult * Math.pow(1 + MLV_HP, lv - 1);
  return {
    id: 'boss', role: 'boss', boss: kind, n: B.n, ico: B.ico, elite: false, row: 'front',
    hpMax, hp: Math.round(hpMax * (hpFrac || 1)), dmg: B.hit != null ? HIT_REF(lv) * B.hit : BDMG * (B.dmgMul || 1.5) * Math.pow(1 + MLV_DMG, lv - 1), spd: 1.0, brkMax: 150, brk: 0, lv,
    s: {}, stun: 0, acts: 0, alive: true, next: 0, intent: null, phase: 1, breaks: 0,
  };
}

/* ================= 전역 시계 (4.1 시계 배정) ================= */
function newBattle(player, enemies, ctx) {
  if (player.build === 'arcanist') player.ward = 14;
  player.vanguard = player.eq && player.eq.amulet === 'vanguard' ? 1 : 0;
  const b = {
    t: 0, p: player, en: enemies, log: [], over: null, ctx: ctx || {}, seq: 0,
    round: 0, queue: null, bonusUsed: 0, tick: 0, season: 0, enrage: false, mirrorCount: 0, hatchLock: false, missToggle: false,
    turnIdx: 0, rec: [], idc: 100,
  };
  for (const e of enemies) { if (!e.intent) decideIntent(b, e); } // 0.6a.2 라운드: 첫 라운드는 runUntilPlayer가 연다
  player.guard = 0; player.dodge = 0; player.stun = 0; player.fxDodged = 0; if (player.build === 'monk') { player.stance = null; player.ctrN = 0; }
  if (isV2(player)) resetCharges(player);
  if (isBu(player)) { player.hpFight = player.hp; player.tookAcc = 0; player.grudge = 0; player.selfBl = 0; } // 숨겨진 직업 1: 되찾기 한도 · 받은 피해 · 나에게 건 출혈
  if (player.rime) player.rime = null; // 원소술사 되얼림은 전투마다
  if (isCf(player)) { player.selfN = {}; player.selfBad = null; } // 숨겨진 직업 2: 고행 몫은 전투마다
  { const oh = (BUILDS[player.build] || {}).openHaste; if (oh) { addS(b, player, 'haste', oh); logp(b, 'good', '먼저 움직인다. 가속 ' + oh + ' (라운드 맨 앞에서 두 번 연달아)'); } } // 사냥꾼 개전 가속 (10월 5일)
  fxRun(player, 'onStart', b, player);
  return b;
}
/* 조사 고르기: 앞 글자의 받침을 보고 이/가, 을/를, 은/는, 와/과를 정한다 */
function hasBatchim(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return '013678'.includes(ch);
  if (/[a-zA-Z]/.test(ch)) return /[lmnr]/i.test(ch);
  return false;
}
function isRieul(ch) { /* 받침이 ㄹ인가: (으)로는 ㄹ 받침 뒤에 '로'를 쓴다 */
  const c = ch.charCodeAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 === 8;
  if (/[0-9]/.test(ch)) return '178'.includes(ch);
  if (/[a-zA-Z]/.test(ch)) return /[lr]/i.test(ch);
  return false;
}
function fixJosa(s) {
  return String(s).replace(/([가-힣0-9A-Za-z])(\)?)(이\(가\)|을\(를\)|은\(는\)|과\(와\)|와\(과\)|\(으\)로)/g, (m, ch, par, j) => {
    const b = hasBatchim(ch); const pick = { '이(가)': b ? '이' : '가', '을(를)': b ? '을' : '를', '은(는)': b ? '은' : '는', '과(와)': b ? '과' : '와', '와(과)': b ? '과' : '와', '(으)로': b && !isRieul(ch) ? '으로' : '로' }[j];
    return ch + (par || '') + pick;
  });
}
function logp(b, cls, msg) { msg = fixJosa(msg); b.log.push({ c: cls, m: msg, t: r1(b.t), n: (b.turnIdx || 0) + 1, g: b.logGroup || 0, r: b.round || 0, w: b.cur ? 'p' : (b.lastActor || ''), s: b.logN = (b.logN || 0) + 1 }); if (b.log.length > 300) b.log.shift(); } /* 10월 9일 UI: r · w · s는 화면의 최근 기록 줄이 쓴다(게임 결과에 영향 없음) */
/* 피해가 늘거나 줄어든 까닭을 한 줄로 남긴다(전투 화면 '왜 이 숫자인가'). 읽기만 하고 값은 바꾸지 않는다 */
function whyPush(b, w) { (b.why = b.why || []).push(Object.assign({ s: b.logN || 0, g: b.logGroup || 0, r: b.round || 0 }, w)); if (b.why.length > 40) b.why.shift(); }
function alive(b) { return b.en.filter(e => e.alive); }
function frontBlocked(b) { return alive(b).some(e => e.row === 'front' && e.stun <= 0 && !e.s.broken && !e.pile && !e.under && e.role !== 'crown'); } // 뼈 더미 · 땅속의 적은 길을 막지 않는다(뼈벽은 막는다)
function hasShield(b, exceptId) { return alive(b).find(e => e.role === 'shield' && e.id !== exceptId && !(e.stun > 0) && !e.s.broken && !e.unguard); }

function st(u, k) { const x = u.s[k]; return x ? (x.stacks || 1) : 0; }
/* ===== 0.6a.2 상태 키워드 (docs/기록/0.6a.2-개편-기획.md 5절): 숫자 하나, 발동할 때마다 1 감소, 키워드별 상한 =====
   내부 이름은 옛 것을 그대로 쓴다(장비 효과 코드가 그대로 돈다): ignite = 화상, chill = 둔화.
   중독: 라운드가 끝날 때마다 N 피해. 출혈: 걸린 쪽이 행동할 때마다 N 피해. 화상: 걸린 쪽이 직접 피해를 받을 때마다 N 더.
   약화↔강화: 공격할 때마다 그 공격 −25%/+25%. 취약↔보호: 직접 피해를 받을 때마다 +25%/−25%. 둔화↔가속: 라운드가 시작될 때 그 라운드의 맨 뒤/맨 앞에서 움직이고 1 감소 (roundOrder).
   반대 쌍은 걸 때 숫자끼리 뺀다. 상한을 넘친 몫은 버린다. 막음: 걸리려는 해로운 상태를 튕겨 낸다(정화 플라스크).
   붕괴(broken)와 낙인(brand, 보스 기믹)은 예전 규칙을 따른다. */
const KW = { poison: 20, bleed: 10, ignite: 10, weak: 5, empower: 5, vuln: 5, protect: 5, chill: 3, haste: 3, block: 5 };
const KW_OPP = { weak: 'empower', empower: 'weak', vuln: 'protect', protect: 'vuln', chill: 'haste', haste: 'chill' };
const KW_BAD = ['poison', 'bleed', 'ignite', 'weak', 'vuln', 'chill'];
const KW_FOREVER = 1e9;
const KW_N = { poison: '중독', bleed: '출혈', ignite: '화상', weak: '약화', empower: '강화', vuln: '취약', protect: '보호', chill: '둔화', haste: '가속', block: '막음' }; // 엔진 기록용 이름 (화면은 SNAMES)
function kwDec(u, k, n) { const x = u.s && u.s[k]; if (!x) return; x.stacks -= (n || 1); if (x.stacks <= 0) delete u.s[k]; }
/* 막음: 플레이어에게 해로운 상태가 걸리려 할 때 1 써서 튕겨 낸다 */
function kwBlocked(b, u, k) {
  if (u !== b.p || !KW_BAD.includes(k) || !u.s.block) return false;
  kwDec(u, 'block'); logp(b, 'good', '정화의 막이 ' + (KW_N[k] || k) + '을(를) 튕겨 낸다'); b.rec.push({ k: 'block', t: r1(b.t), kw: k }); return true;
}
/* 출혈: 걸린 쪽이 행동할 때마다 N 피해, 1 감소 */
function kwBleed(b, u) { const n = stk(u, 'bleed'); if (!n || b.over) return; kwDec(u, 'bleed'); const fl = u === b.p && isBu(u) && (u.selfBl || 0) > 0; if (fl) b.bleedFloor = 1; dmgDot(b, u, n * (u === b.p ? 1 : dotMul(b.p)), '출혈'); if (fl) { b.bleedFloor = 0; u.selfBl = Math.min(u.selfBl - 1, stk(u, 'bleed')); } /* 피 웅덩이 ×2는 dmgDot이 한 번만 곱한다 (10월 5일 고침: 여기서도 곱해 4배였다) */ }
/* 직접 피해를 받을 때: 취약 ×1.25 / 보호 ×0.75 (1 감소), 화상 N 더 (1 감소). 지속 피해는 발동시키지 않는다 */
function kwTaken(b, u, d, o) {
  if (o.dot || !(d > 0)) return d;
  if (u.s.vuln) { d *= 1.25; kwDec(u, 'vuln'); }
  if (u.s.protect) { d *= 0.75; kwDec(u, 'protect'); }
  if (u.s.ignite && !o.noIgn) { const n = stk(u, 'ignite'); kwDec(u, 'ignite'); let x = n * (hasMod(b, 'candle') ? 1.5 : 1) * (u === b.p ? 1 : dotMul(b.p)); if (u === b.p && hasBt(u, 'snuff')) x = isCf(u) ? Math.min(x, Math.min(n, (u.selfN || {}).ignite || 0) * (hasMod(b, 'candle') ? 1.5 : 1)) : 0; if ((b.ctx.ch || 1) >= 3) { if (u !== b.p) u.ignLast = b.actN; if (hasMod(b, 'brazier')) x *= 1.5; if (hasMod(b, 'shade')) x *= 0.5; if (u === b.p && hasBt(u, 'shade')) x *= 0.5; if (u === b.p && hasBt(u, 'herald')) x = 0; if (u.boss === 'queen' && b.heat != null) { logp(b, 'bad', '불길이 여왕에게 스며든다'); heatAdd(b, QUEEN.ignTick, '불'); codexHit(b, 'queen', 'fire'); } } if (u === b.p) { const gi = fxAdd(u, 'igIn', b, u, x); if (gi) x *= 1 - Math.max(-FX_CAP, Math.min(1, gi)); } else if (b.p.eq) { const go = fxAdd(b.p, 'igOut', b, b.p, u, x); if (go) x *= Math.max(0, 1 + Math.min(FX_CAP, go)); } /* 3챕터 장비: 화상의 추가 피해 */ d += x; } // 숨겨진 직업 2: 촛불 끄기 축복은 고행 몫의 화상에는 들지 않는다
  return d;
}
