'use strict';
/* ================= 상태 생성 ================= */
/* 능력치 (5.2절): 1점마다 눈에 보이는 규칙 하나 */
const STATN = { str: '힘', dex: '민첩', int: '지능', con: '체력', wil: '의지' };
const STAT_KEYS = ['str', 'dex', 'int', 'con', 'wil'];
const statSum = o => STAT_KEYS.reduce((a, k) => a + ((o && o[k]) || 0), 0);
/* 추천 배분: 직업의 몫대로 남은 점수를 나눈다 (가장 모자란 능력치부터 1점씩) */
function statRecommend(build, cur, pts) { const W = STAT_REC[build] || { str: 0.34, dex: 0.33, con: 0.33 }; const al = Object.assign({}, { str: 0, dex: 0, int: 0, con: 0, wil: 0 }); const tot = statSum(cur) + pts; for (let i = 0; i < pts; i++) { const k = Object.keys(W).sort((a, c) => (((cur[c] || 0) + al[c]) / tot - W[c]) * -1 - (((cur[a] || 0) + al[a]) / tot - W[a]) * -1)[0]; al[k]++; } return al; }
function stat(p, k) { return (p.stat && p.stat[k]) || 0; }
/* 장비 기본 수치 (기획서 11.5절). 화면에서 고른 장비로 applyGear가 채운다 */
const START_GEAR = { wpn: 8, hp: 10, st: 0, mp: 0, flask: 0.3 };
const CANTRIP = { arcanist: '마력 화살', warlock: '그림자 화살', priest: '빛줄기', elementalist: '마력 화살' }; // 원소술사(0.6a.2): 옛 시전자 배율(×0.9 · 1.6 · 붕괴 30)은 쓰지 않고 wpnMul 0.5 · HEAVY_V2
const isCaster = p => !!CANTRIP[p.build];
const STAM_FLASK = 60; // 스태미나 플라스크 회복량 (11.6절 [가설])
/* ===== 아이템 효과 표 (IFX, 기획서 11.5절 1챕터 100종 가운데 0.6 새 79종) =====
   엔진의 정해진 지점이 낀 장비의 효과를 부른다. 효과가 실제로 무언가를 바꾸면 FXHIT[아이템]을 센다(자동 점검용).
   지점: out(주는 피해 배율) hit(대상별 배율) hitAdd(대상별 더하기) brk(붕괴 더하기) onHit(맞힌 뒤) dotOut(내가 건 지속 피해 배율)
         inMul(받는 피해 배율) onHurt(맞은 뒤) onParry(흘리기 성공) onKill onStart onCleanse onFlask block(디버프 막기) dur(내 상태 지속 조정)
         st(최대치 더하기 {hp,mp,st}) hpMul cost(행동 비용 더하기) regen(스태미나 자연 회복 더하기) heal(플라스크 회복 더하기 %p) */
const FXHIT = {};
/* 타락한 수도원장 수치. 사람처럼 판단하는 테스터(여섯 성향) 1,920판에서 첫 도전 승률 48%로 맞춘 값 (10월 2일, 만든 사람 요청 50% 안팎) */
const CLS_TUNE = { warlockKill: 0.15 }; // 직업 규칙 수치: 암흑술사가 약화·취약된 적을 쓰러뜨리면 회복하는 생명력 비율
/* 광역 규칙 (10월 2일): 후열은 광역 피해를 덜 받고, 방패병이 서 있으면 후열을 감싼다(방패벽). 여럿에게 거는 상태이상은 단일의 절반 */
/* 한없이 쌓이는 상태 (10월 2일): 걸 때마다 +1, 지속 시간은 새로. 중첩마다 피해 */
const STACKY = { bleed: { tick: 1, act: 1, archerEvery: 2 }, ignite: { tick: 1.5 }, plague: { tick: 1 }, chill: {} }; // 중첩마다 피해. 한없이 쌓이므로 한 번 걸 때의 값은 예전(출혈 2, 점화 2)보다 낮다
const stk = (u, k) => (u.s[k] && u.s[k].stacks) || 0;
const chillSlow = n => n > 0 ? Math.min(0.4, 0.3 + 0.05 * (n - 1)) : 0; // 냉각: 1중첩 30%, 더할 때마다 +5%, 최대 40%
/* 치유 피로: 같은 치유사가 치유할 때마다 다음 치유가 30%씩 준다 (수도사 제외) */
const healFrac = e => e.monk ? ABBOT.monkHeal * Math.pow(ABBOT.monkDecay, e.healN || 0) : 0.25 * Math.pow(0.7, e.healN || 0);
const AOE = { back: 0.7, wall: 0.5, wallFront: 0.6, shieldSelf: 0.75, status: 0.5 }; // wallFront: 방패병이 서 있으면 옆 전열 동료가 받는 광역 피해 (10월 2일 만든 사람 결정)
const aoeN = n => Math.max(1, Math.round(n * AOE.status));
const wallUp = (b, e) => e.alive && e.row === 'back' && e.role !== 'boss' && !!hasShield(b, e.id);
const wallFrontUp = (b, e) => e.alive && e.row === 'front' && !['boss', 'shield', 'root'].includes(e.role) && !!hasShield(b, e.id); // 방패병 옆 전열 동료
const TELE = { heavy: 1.75, boss: 3.5 }; // 적 강타 = 평소 공격 × heavy, 보스 강타 × boss (10월 4일: 평소 공격이 기준표로 커져 일반 적의 강타는 1.75배. 한 번 상한은 그대로) // 적 강타 = 평소 공격 × heavy (예고를 읽고 막는 판단의 무게)
/* 0.6a.2: 적이 거는 상태 (숫자 하나, 발동마다 1 감소). 사수 출혈은 걸린 쪽이 행동할 때마다 터지므로 세 번에 한 번, 2만 건다 */
const HUNT = { focusMax: 3, focusPer: 0.05, focusBig: 0.1, addMax: 2, focusHaste: 0, link: 0.3 }; // 10월 5일: 3겹 가속은 저격 혼자 도는 고리를 만들어 껐다(가속은 기동이 공급). 3겹 효과는 몸 낮추기 · 버티기를 꿰뚫기 // link: 연계(직전에 쓴 스킬과 다른 갈래의 스킬) 피해 배율 (10월 5일 만든 사람 결정: 섞어 쓸 때 제 힘을 낸다)
const linkOn = (b, a) => !!(b && b.p.build === 'hunter' && a && a.v2 && a.s && a.s.b !== '시작' && b.p.lastBr && b.p.lastBr !== a.s.b); // 사냥꾼 연계: 시작 스킬 · 기본 공격은 연계를 만들지도 끊지도 않는다 // focusHaste: 추적이 3겹이 되는 순간 얻는 가속
/* 숨겨진 직업 1 (10월 7일, butcher): 흡혈(출혈된 적을 근접으로 칠 때, 출혈 1마다 leech, 최대 leechMax, 한 차례 leechTurn), 갈증(잃은 생명력 10%마다 thirst, 최대 thirstMax),
   되찾기 한도(흡혈 · 먹기는 이 전투를 시작할 때의 생명력까지, 먹기는 한 전투 eatFight까지), 받은 피해 상한 grudgeCap, 한 차례 killRecharge 다시 쓰기 krTurn [가설] */
const BUTCH = { leech: 0.04, leechMax: 0.4, leechTurn: 0.08, thirst: 0.03, thirstMax: 0.18, eatFight: 0.4, grudgeCap: 0.3, krTurn: 2 };
const isBu = p => !!(p && p.build === 'butcher');
const buThirst = p => isBu(p) && p.hpMax > 0 ? Math.min(BUTCH.thirstMax, BUTCH.thirst * Math.max(0, Math.floor((1 - p.hp / p.hpMax) * 10 + 1e-9))) : 0;
const buEatOnly = s => !!(s && s.fx.some(e => e.k === 'drain' && e.s === 'bleed' && !e.me) && !s.fx.some(e => e.k === 'dmg')); // 피해 없이 먹는 칸 (피 들이켜기)
const buGrudgeNow = b => { const p = b.p; return b.prepTurn === b.turnIdx ? (p.grudge || 0) : Math.min(p.tookAcc || 0, p.hpMax * BUTCH.grudgeCap); }; // 이번 차례에 받은 피해 칸이 쓸 값
const buEatLeft = b => Math.max(0, b.p.hpMax * BUTCH.eatFight - (b.eatGot || 0));
/* 도살자의 회복(흡혈 · 먹기)은 모두 여기를 지난다. 플라스크 · 소모품 · 장비 회복은 따르지 않는다 */
function bHeal(b, x, why) {
  const p = b.p; if (!(x > 0) || b.over) return 0; const v = x * healMul(p) * (1 + Math.min(FX_CAP, fxAdd(p, 'bHealP', b, p, why)));
  let room = Math.max(0, Math.min(p.hpMax, p.hpFight != null ? p.hpFight : p.hpMax) - p.hp);
  if (why === 'eat') room = Math.min(room, buEatLeft(b));
  if (why === 'leech') { if (b.leechTurn !== b.turnIdx) { b.leechTurn = b.turnIdx; b.leechGot = 0; } room = Math.min(room, Math.max(0, p.hpMax * BUTCH.leechTurn - (b.leechGot || 0))); }
  const got = Math.max(0, Math.min(v, room)); p.hp += got;
  if (why === 'eat') b.eatGot = (b.eatGot || 0) + got; if (why === 'leech') b.leechGot = (b.leechGot || 0) + got;
  b.rec.push({ k: 'bheal', why, got: r1(got), cut: r1(v - got) });
  return got;
}
/* 다음 놈(carry): 대상이 쓰러지면 남은 타격을 근접으로 닿는 적 가운데 생명력이 가장 낮은 적에게 (지키기 · 방패를 다시 본다) */
function buCarry(b, act, from) {
  let t = alive(b).filter(x => x !== from && x.role !== 'root' && canTarget(b, x, act)).sort((x, y) => x.hp - y.hp)[0]; if (!t) return null;
  const g = guardOf(b, t); if (g) t = g;
  const mg = alive(b).find(x => x.guarding === t.id && !(x.stun > 0) && !x.s.broken); if (mg) t = mg;
  return t;
}
/* 숨겨진 직업 2 (10월 7일, confessor): 짐(중독을 뺀 내 해로운 상태 kinds의 합), 세는 숫자는 모두 cap까지. 스킬 · 방어로 적이 건 상태를 지우면 지운 per마다 보호 1(올림, 한 번에 protMax).
   방어하면 guard만큼 지운다. 덜어 내는 순서 order. 고행 몫 p.selfN: 스킬이 나에게 건 상태(행동 뒤에 p.selfBad를 건다). 짐 · 사함에는 들고, 정화는 상태마다 고행 몫부터 지우되 보호 · 덤이 없고, 옮기기는 떼지 않는다 [가설] */
const CONF = { cap: 5, per: 2, protMax: 3, guard: 2, kinds: ['bleed', 'ignite', 'weak', 'vuln', 'chill'], order: ['vuln', 'weak', 'ignite', 'bleed', 'chill'] };
const isCf = p => !!(p && p.build === 'confessor');
function cfSelf(p, k) { if (!p.selfN) p.selfN = {}; return (p.selfN[k] = Math.min(p.selfN[k] || 0, stk(p, k))); } // 고행 몫: 저절로 준 몫은 적이 건 몫에서 빠진 것으로 본다
function cfBurden(p) { return Math.min(CONF.cap, CONF.kinds.reduce((a, k) => a + stk(p, k), 0)); }
function cfSelfSum(p) { return Math.min(CONF.cap, CONF.kinds.reduce((a, k) => a + cfSelf(p, k), 0)); }
const cfMover = e => !!(e && e.alive && !['root', 'candle', 'bonewall'].includes(e.role) && !e.pile); // 옮긴 상태를 받는 적: 행동하는 적만
const cfNames = got => CONF.order.filter(k => got[k]).map(k => KW_N[k] + ' ' + got[k]).join(', ');
/* 덜어 내기: CONF.order(only로 거른)대로 n(cap까지)을 덜어 낸다. mode 'clean'(정화 · 사함)은 상태마다 고행 몫부터, 'xfer'(옮기기)는 적이 건 몫만. dry면 세기만 한다.
   돌려주는 값: got(상태마다 덜어 낸 숫자), c(모두), e(그 가운데 적이 건 몫) */
function cfTake(p, only, n, mode, dry) {
  const got = {}; let c = 0, e = 0, left = Math.min(n || CONF.cap, CONF.cap);
  for (const k of CONF.order) {
    if (left <= 0) break; if (only && !only.includes(k)) continue; const has = stk(p, k); if (!has) continue;
    const self = cfSelf(p, k); const x = Math.min(left, mode === 'xfer' ? has - self : has); if (x <= 0) continue;
    const xs = mode === 'xfer' ? 0 : Math.min(self, x);
    if (!dry) { kwDec(p, k, x); p.selfN[k] = self - xs; cfSelf(p, k); }
    got[k] = x; c += x; e += x - xs; left -= x;
  }
  return { got, c, e };
}
/* 정화 · 사함 (cleanse): 정화면 적이 건 몫으로 보호 · 덤, 사함(offer)이면 바친 숫자를 이 스킬의 첫 타격 · 붕괴에 싣는다(b.cfOffer). 둘 다 b.cleanTurn += 적이 건 몫 */
function cfCleanse(b, f, label, id) {
  const p = b.p; const bd = cfBurden(p), ek = cfTake(p, null, CONF.cap, 'xfer', 1), es = ek.c; const r = cfTake(p, f.only, f.n, 'clean'); const n = r.c, e = r.e; const nm = cfNames(r.got);
  b.cleanTurn = (b.cleanTurn || 0) + e;
  if (f.offer) { b.cfOffer = { c: n, dmg: f.dmg || 0, brk: f.brk || 0 }; logp(b, n ? 'good' : 'sys', n ? label + '. ' + nm + '을(를) 바친다' : label + '. 바칠 짐이 없다'); b.rec.push({ k: 'clean', id, c: n, e, offer: 1, bd, es, ek: ek.got }); return { c: n, e, offer: 1 }; }
  const tail = []; let over = 0;
  if (e > 0) {
    const want = Math.min(CONF.protMax, Math.ceil(e / CONF.per)); const g = addS(b, p, 'protect', want) || 0; over = want - g; tail.push('보호 +' + g + (over > 0 ? ' (상한)' : ''));
    if (f.heal) { const hl = Math.max(0, Math.min(p.hpMax - p.hp, e * f.heal * healMul(p))); if (hl > 0) { p.hp += hl; tail.push('생명력 +' + r1(hl)); } }
    if (f.stam) { p.st = Math.min(p.stMax, p.st + e * f.stam); if (p.exhaust && p.st >= 30) p.exhaust = 0; tail.push('스태미나 +' + e * f.stam); }
    if (f.quick) { b.extraQuick = 1; tail.push('이번 차례에 빠른 칸이 하나 더 생긴다'); }
    if (f.haste) { addS(b, p, 'haste', 1); tail.push('가속 1'); }
    fxRun(p, 'onCleanse', b, p, e);
  }
  if (!n) logp(b, 'sys', label + '. 지울 짐이 없다');
  else logp(b, 'good', label + '. ' + nm + '을(를) 지운다' + (n > e ? ' (고행 몫 ' + (n - e) + '은(는) 보호가 되지 않는다)' : '') + (tail.length ? '. ' + tail.join(', ') : ''));
  b.rec.push({ k: 'clean', id, c: n, e, over, bd, es, ek: ek.got });
  return { c: n, e };
}
/* 옮기기 (transfer): 적이 건 내 상태를 떼어 같은 상태로 건다. 받는 적이 여럿이면 앞 적부터 하나씩 돌려 가며 나눠 건다(복사가 아니다). 이어서 받는 적마다 add만큼 addK(없으면 only[0]) */
function cfTransfer(b, s, tr, targets) {
  const p = b.p; const rc = targets.filter(cfMover); if (!rc.length) { logp(b, 'sys', s.n + '. 옮길 곳이 없다'); return; }
  const es = cfTake(p, null, CONF.cap, 'xfer', 1).c; const r = cfTake(p, tr.only, tr.n, 'xfer'); const per = rc.map(() => ({})); let i = 0;
  for (const k of CONF.order) for (let x = 0; x < (r.got[k] || 0); x++) { const j = i++ % rc.length; per[j][k] = (per[j][k] || 0) + 1; }
  const L = []; rc.forEach((e, j) => { const g = []; for (const k of CONF.order) if (per[j][k]) { addS(b, e, k, per[j][k]); g.push(KW_N[k] + ' ' + per[j][k]); } if (g.length) L.push(e.n + '에게 ' + g.join(', ')); });
  if (r.c) logp(b, 'good', s.n + '. 내 ' + cfNames(r.got) + '을(를) 옮긴다. ' + L.join(' · ')); else logp(b, 'sys', s.n + '. 옮길 짐이 없다');
  const ak = tr.addK || (tr.only || [])[0]; if (tr.add && ak) { for (const e of rc) if (e.alive) addS(b, e, ak, tr.add); logp(b, 'good', (rc.length > 1 ? '맞힌 적마다 ' : rc[0].n + '에게 ') + KW_N[ak] + ' ' + tr.add + ' 더'); }
  b.rec.push({ k: 'xfer', id: s.id, moved: r.got, c: r.c, to: rc.length, es });
}
/* 고행: 스킬이 나에게 건 해로운 상태는 행동이 끝난 뒤(출혈 발동 뒤) 건다. 막음 · 의지 · 장비 막기 · dur · onDebuff를 거치지 않고(b.selfSt), 실제로 오른 숫자만 고행 몫이 된다 */
function cfSelfApply(b) {
  const p = b.p; const L = p.selfBad; p.selfBad = null; if (!L || !L.length || b.over) return; b.selfSt = 1; const parts = [];
  for (const x of L) { const s0 = cfSelf(p, x.s); const g = addS(b, p, x.s, x.n) || 0; p.selfN[x.s] = Math.min(stk(p, x.s), s0 + g); parts.push(KW_N[x.s] + ' ' + x.n); b.rec.push({ k: 'self', s: x.s, n: x.n, g }); }
  b.selfSt = 0; logp(b, 'bad', '행동이 끝나고 나에게 ' + parts.join(', ') + '(고행)');
}
/* 숨겨진 직업 3 (10월 7일, bloodmage. 설계 · 까닭은 비공개 문서): 피로 당기기(남은 쿨타임 1턴마다 최대 생명력 × per, 내 차례마다 한 번, 생명력 1 아래로는 낼 수 없다),
   낸 피 칸이 세는 상한 dmgCount, 먹기 한 번 상한 eatCap(모든 배수 뒤), 쓰러뜨리면 번짐 · 표식이 적 하나에게 거는 중독 상한 spreadKillMax(한 행동에서 받는 쪽마다 합쳐), 값 깎기 보관 payCutMax [가설]
   낸 피는 피해가 아니다: hurtPlayer를 지나지 않는다(보호막 · 보호 · 취약 · 방어 · 망자의 묵주 · 가시 · 받은 피해 기록에 들지 않는다) */
const BLOOD = { per: 0.04, perTurn: 1, dmgCount: 20, eatCap: 0.25, spreadKillMax: 6, payCutMax: 3 };
const isBm = p => !!(p && p.build === 'bloodmage');
const bmHpCost = (p, s) => { const h = s && s.fx.find(e => e.k === 'hpCost'); return h ? Math.ceil(p.hpMax * h.pct * hpCostMul(p)) : 0; };
const bmEats = s => !!(s && s.fx.some(e => e.k === 'drain' && e.eat));
const bmEatOnly = s => bmEats(s) && !s.fx.some(e => e.k === 'dmg');
const bmNoPull = s => s.once ? '전투마다 1번' : bmEats(s) ? '먹기는 피로 당길 수 없음' : s.fx.some(e => e.k === 'payCut') ? '피로 당길 수 없음' : null;
/* 피로 당기기 값: 남은 값 깎기 가운데 이번 값이 가장 싸지는 것 하나를 쓴다(mul: 값 × mul, off: 남은 쿨타임에서 off턴을 빼고). 올림은 마지막에 한 번. pick이면 { c, i } */
function bmPullCost(p, w, pick) {
  const raw = (ww, m) => Math.ceil(p.hpMax * BLOOD.per * Math.max(0, ww) * hpCostMul(p) * m - 1e-9);
  let best = { c: raw(w, 1), i: -1 };
  (p.payCut || []).forEach((x, i) => { const v = x.off != null ? raw(w - x.off, 1) : raw(w, x.mul); if (v < best.c) best = { c: v, i }; });
  return pick ? best : best.c;
}
/* 생명력 내기: 생명력 1 아래로는 내지 않는다(잠금이 먼저 막는다. 여기는 마지막 울타리) */
function bmPay(b, c, s, why) {
  const p = b.p; c = Math.max(0, Math.min(c, p.hp - 1)); if (!(c > 0)) return 0;
  p.hp -= c; b.paidTurn = (b.paidTurn || 0) + c; b.rec.push({ k: 'blood', w: why || 'hp', id: s.id, n: c });
  if (why === 'pull') logp(b, 'bad', '피로 ' + s.n + '을(를) 당긴다. 생명력 −' + c); else logp(b, 'bad', s.n + '. 먼저 생명력 ' + c + '을(를) 낸다');
  return c;
}
function bmPull(b, act) {
  const p = b.p, s = act.s; const w = (p.cd && p.cd[s.id]) || 0; if (!(w > 0) || bmNoPull(s)) return;
  const pc = bmPullCost(p, w, 1); const c = Math.min(pc.c, Math.max(0, p.hp - 1 - bmHpCost(p, s)));
  if (pc.i >= 0) p.payCut.splice(pc.i, 1);
  b.bloodTurn = b.turnIdx; p.cd[s.id] = 0;
  if (c > 0) bmPay(b, c, s, 'pull'); else { logp(b, 'good', '피로 ' + s.n + '을(를) 당긴다. 깎은 값이라 생명력이 들지 않는다'); b.rec.push({ k: 'blood', w: 'pull', id: s.id, n: 0 }); }
  b.rec.push({ k: 'bmpull', id: s.id, cd: w, n: c, cut: pc.i >= 0 ? 1 : 0, hp: r1(p.hp / p.hpMax), round: b.round || 0 });
}
/* 쓰러뜨리면 번짐 · 표식: 쓰러진 적(from)의 중독 n(이미 상한)을 살아 있는 다른 적 모두에게. got이 있으면 한 행동에서 받는 쪽마다 합쳐 spreadKillMax까지. 번진 중독은 다시 번지지 않는다(읽는 값은 스킬을 쓰기 직전의 중독) */
function bmSpread(b, from, n, got) {
  let k = 0;
  for (const o of alive(b)) if (o !== from && o.role !== 'root') { const m = got ? Math.min(n, BLOOD.spreadKillMax - (got[o.id] || 0)) : n; if (m > 0) { addPoison(b, o, m, 1); if (got) got[o.id] = (got[o.id] || 0) + m; k++; } }
  if (k) logp(b, 'good', from.n + '의 독이 터져 번진다. 다른 적에게 중독 ' + n); b.rec.push({ k: 'bm', w: 'spread', n, to: k });
}
function bmMarkFlush(b) { const Q = b.markQ; b.markQ = null; if (!Q || !Q.length || b.over) return; for (const m of Q) bmSpread(b, m.e, m.n, null); } // 지속 피해 고리가 끝난 뒤 (같은 라운드의 뒤쪽 적이 커진 중독으로 틱을 받지 않게)
const rngCls = p => !!(p && (BUILDS[p.build] || {}).ranged) && !isCaster(p); // 원거리 직업(사냥꾼 · 숨겨진 직업 3): 기본 공격 · 강공격이 후열에 닿는다. 캔트립 직업(원소술사)은 isCaster 길
const STOP_K = ['charge', 'heavy', 'chant', 'chanting', 'burn', 'aim']; // 멈춰 세우기가 끊는 행동: 강타(모으기 · 내리치기), 영창(시작 · 영창 · 화형), 겨누기(겨누기 · 겨눈 한 발). 치유 · 축복 · 소환은 끊지 않는다
const isStopTarget = e => !!(e.intent && (STOP_K.includes(e.intent.k) || e.intent.aimed)); // 사냥꾼 추적. addMax: 추적 추가 효과로는 2겹까지만(3겹은 같은 적을 다시 맞혀야)
const CHANT = { cut: 0.3, big: 0.28, burn: 3 }; // 화형 사제 (10월 5일): 영창 중 받은 피해가 최대 생명력 × cut이면 끊긴다. 화형 = 기준 생명력 × big(정예 ×1.25), 화상 burn. 영창은 한 번에 한 적만
const chantDmg = (b, e) => HIT_REF(e.lv || 1) * CHANT.big * ((b && b.ctx && b.ctx.ch || 1) === 2 ? 0.26 / CHANT.big : 1) * (e.elite ? 1.25 : 1) * enemyHitEst(b, e) / Math.max(0.01, e.dmg);
const CHANT_K = ['chant', 'chanting', 'burn'];
/* ===== 원소술사 (10월 7일, docs/직업/원소술사.md B절) =====
   열충격: 원소술사가 싸우는 동안 한 적에게 화상(1 이상)과 둔화(1 이상)가 함께 있으면 그 행동이 끝날 때(내 행동은 finishPlayer 첫 줄, 적 행동은 stepWorld의 enemyAct 뒤) 깨진다.
   T = min(cap, 화상 + Cw × 둔화), 피해 T × D × 지능(dotMul) (× 이 행동 스킬 대상이면 shockx.dmg, × 여럿 대상 행동이면 aoeCut), 붕괴 둔화 × Bk (× shockx.brk).
   열충격은 몸 낮추기를 지나가고 버티기 · 서원(보스 고유 감소)은 감소 몫의 half만 받는다. 취약 · 보호 · 화상 · 장비 타격 배율은 쓰지도 받지도 않는다. 두 상태는 피해 뒤에 지운다(쓰러지면 화상이 남은 채 쓰러진다).
   서리 무게: 둔화된 적(또는 이번 라운드 둔화로 맨 뒤에 선 적, e.chillR)이 나를 치는 평소 공격은 피해 ×(1 − guard). 큰 공격(bigHit)과 지속 피해는 그대로.
   되얼림(rime): 나를 직접 친 적에게 상태 n, 횟수 상한 rimeMax */
const ELEM = { D: 3, Cw: 2, Bk: 12, guard: 0.3, half: 0.5, cap: 16, rimeMax: 8 };
/* 광역 배율 (hurtEnemy와 열충격이 함께 쓴다): 땅속 · 군주의 뼈벽 · 후열 · 방패벽 · 방패병, 보스는 1. quiet면 장비 효과 발동을 세지 않는다(미리 보기) */
function aoeApply(b, e, d, quiet) {
  const fl = k => quiet ? fxList(b.p).some(([, f]) => f[k]) : fxFlag(b.p, k);
  if (e.under && e.role !== 'boss') d *= e.foe === 'sexton' ? FOE_X.sexton.aoe : BURROW.aoe; // 보스(재의 여왕)는 숨어도 광역 ×1
  if (e.lordWall) d *= LORD.wallAoe;
  if (e.role !== 'boss') { if (e.row === 'back') { if (!fl('aoeBack')) d *= AOE.back; if (hasShield(b, e.id) && !fl('aoeWall')) d *= AOE.wall; } else if (e.role !== 'shield' && hasShield(b, e.id) && !fl('aoeWall')) d *= AOE.wallFront; else if (e.role === 'shield' && !(e.stun > 0) && !e.s.broken) d *= AOE.shieldSelf; }
  return d;
}
const aoeCut = (b, e, quiet) => aoeApply(b, e, 1, quiet);
const frostOn = (b, e) => !!(b && b.p.build === 'elementalist' && e && (e.s.chill || e.chillR === b.round)); // 서리 무게가 걸린 적 (화면 표시)
/* 이 스킬을 이 적에게 쓰면 행동 끝에 남는 화상 · 둔화와 열충격 (버튼 미리 보기 · 테스터). 엔진과 같은 순서: 타격이 화상 1을 쓰고 → 첫 타격 뒤 상태 → 엮기 → 다음 타격 */
function elemPreview(b, s, e, multi) {
  let I = st(e, 'ignite'), C = st(e, 'chill'), H = st(e, 'haste'); const I0 = I, C0 = C;
  const dm = s.fx.find(x => x.k === 'dmg'), bo = s.fx.find(x => x.k === 'burnOut'), wv = s.fx.find(x => x.k === 'weave'); const hit = !!(dm && dm.n > 0) || !!bo; let wvAdd = null;
  const add = (k, n) => { if (k === 'chill') { const m = Math.min(n, H); H -= m; n -= m; if (n > 0) C = Math.min(Math.max(KW.chill, C), C + n); } else if (k === 'ignite') I = Math.min(Math.max(KW.ignite, I), I + n); };
  for (let h = 0; h < (s.hits || 1); h++) {
    if (hit && !(bo && h === 0) && I > 0) I--;
    if (h === 0) { if (bo) I = 0; if (s.tgt !== 'self') for (const x of s.fx) if (x.k === 'st') add(x.s, x.n); if (wv) { if (I && !C) { wvAdd = ['chill', wv.chill]; add('chill', wv.chill); } else if (!I) { wvAdd = ['ignite', wv.ign]; add('ignite', wv.ign); } } }
  }
  const sx = s.fx.find(x => x.k === 'shockx'); const shock = I >= 1 && C >= 1 && !e.under;
  const T = shock ? Math.min(ELEM.cap, I + ELEM.Cw * C) : 0;
  return { I0, C0, I, C, shock, T, d: T * ELEM.D * dotMul(b.p) * ((sx && sx.dmg) || 1) * (multi ? aoeCut(b, e, 1) : 1), brk: shock ? C * ELEM.Bk * ((sx && sx.brk) || 1) : 0, wv: wvAdd, burn: bo ? I0 : 0 };
}
/* 열충격 처리 (by: 'me' 내 행동 끝, 'enemy' 적 행동 끝). 내 행동이면 b.shockCtx(runSkill2가 싣는다)의 대상에게 shockx를 붙인다 */
function elemShock(b, by) {
  if (b.over || b.p.build !== 'elementalist') return;
  const ctx = by === 'me' ? b.shockCtx : null; let tgtN = 0;
  for (const e of b.en.slice()) {
    if (b.over) break;
    if (!e.alive || e.under || e.role === 'root' || e.shockAct === b.actN) continue; // 땅속이면 상태를 남긴다
    const I = st(e, 'ignite'), C = st(e, 'chill'); if (!(I >= 1 && C >= 1)) continue;
    e.shockAct = b.actN; const tgt = !!(ctx && ctx.ids.includes(e.id)); const sx = tgt ? ctx.sx : null; if (tgt) tgtN++;
    const T = Math.min(ELEM.cap, I + ELEM.Cw * C); const base = T * ELEM.D * dotMul(b.p) * ((sx && sx.dmg) || 1); const multi = !!(ctx && ctx.multi);
    const big = !!(e.intent && (['heavy', 'charge', 'chant', 'chanting', 'burn', 'aim', 'reflect', 'erupt'].includes(e.intent.k) || e.intent.aimed)); const preB = !!e.s.broken; const red = !!(e.braced || e.vow);
    logp(b, 'crit', ''); const ent = b.log[b.log.length - 1];
    const dealt = hurtEnemy(b, e, base * (multi ? aoeCut(b, e) : 1), { dot: 1, shock: 1, shockAoe: multi ? 1 : 0, silent: 1, label: '열충격' });
    let brk = 0; if (e.alive) { delete e.s.ignite; delete e.s.chill; e.chillR = 0; brk = C * ELEM.Bk * ((sx && sx.brk) || 1); addBreak(b, e, brk); }
    const broke = e.alive && !!e.s.broken && !preB;
    fxRun(b.p, 'onShock', b, b.p, e, I, C, dealt, broke);
    ent.m = fixJosa((by === 'enemy' ? '(적 차례) ' : '') + '열충격: ' + e.n + '. 화상 ' + I + ' + 둔화 ' + C + ' × 2 → 피해 ' + r1(dealt) + (brk ? ', 붕괴 +' + Math.round(brk) : ''));
    let arc = 0; if (sx && sx.arc && !b.over) for (const o of alive(b)) { if (o === e || o.role === 'root') continue; arc += hurtEnemy(b, o, base * sx.arc * aoeCut(b, o), { dot: 1, shock: 1, shockAoe: 1, silent: 1, label: '번진 열충격' }); if (b.over) break; }
    if (arc > 0) logp(b, 'good', '열충격이 다른 적에게 번진다. 모두 ' + r1(arc) + ' 피해');
    if (sx && sx.keep && e.alive && !b.over) { const g = addS(b, e, sx.keep.s, sx.keep.n); if (g) logp(b, 'good', e.n + '에게 ' + KW_N[sx.keep.s] + ' ' + g + '이(가) 남는다'); }
    b.rec.push({ k: 'shock', by, I, C, T, dmg: r1(dealt), brk: Math.round(brk), broke: broke ? 1 : 0, cut: broke && big ? 1 : 0, kill: e.alive ? 0 : 1, arc: r1(arc), red: red ? 1 : 0, multi: multi ? 1 : 0 });
  }
  if (ctx && ctx.hz && tgtN && !b.over) hastenBranch(b, ctx.br, ctx.hz, ctx.id); // 🔄 이 스킬로 열충격이 일어나면 (행동에 한 번)
}
/* 되얼림 · 불꽃 외투: 나를 직접 친 적에게 상태 (보호막 · 방어 · 흘리기로 0이 되어도 센다. 몸 빼기로 피한 공격은 hurtPlayer가 먼저 끝낸다) */
function elemRime(b, src) {
  const p = b.p;
  for (const k of Object.keys(p.rime)) { const r = p.rime[k]; if (!r || !(r.times > 0) || !src.alive) continue; const g = addS(b, src, k, r.n); r.times--; if (r.times <= 0) delete p.rime[k]; logp(b, 'good', (k === 'ignite' ? '불꽃이 ' : '서리가 ') + src.n + '에게 옮겨 간다. ' + KW_N[k] + ' ' + g + (r.times > 0 ? ' (남은 ' + r.times + '번)' : '')); }
  if (!Object.keys(p.rime).length) p.rime = null;
}
/* 수도승 (10월 7일, docs/직업/수도승.md B절; 10월 10일 단순화): 방어하거나 자세를 잡은 동안 전열 적이 나를 직접 치면 되받는다(monkCounter). 피해 = 무기 피해 × ctr + 자세 덤, 붕괴 ctrBrk(강타면 +ctrBig), 기 +kiCtr.
   내 차례 하나 사이에 ctrMax번까지(p.ctrN, 내 차례의 첫 행동에서 0). 기 = 강화이고 되받을 때(와 스킬이 주는 것)만 쌓인다. ▶ 공격이 1을 써서 +25%, ⚡ 공격에는 실리지 않는다(b.curFast) */
const MONK = { ctr: 0.8, ctrBrk: 10, ctrBig: 25, ctrMax: 3, kiCtr: 1 }; // ctr 10월 7일 0.5 → 0.8: 던전 보스 승률 1% (다른 직업 12~25%), 0.8에서 10%
const SEAL_K = ['heal', 'bless', 'summon', 'raise', 'curse', 'hexcurse', 'guard', 'mend', 'build', 'mourn', 'tune', 'seal', 'call']; // 혈도 sealx가 끊는 지원 행동 (일반 · 정예는 평소 공격으로 바뀌고, 강적 · 보스는 붕괴)
const CTR_SHOW = ['attack', 'heavy', 'brand', 'mirror', 'reflect', 'erupt', 'hand', 'constrict']; // ↩ 표시: 나를 직접 치는 예고 (화형 · 폭발은 되받지 못해 빠진다)
const monkCtrOk = (b, e) => !!(b.p.build === 'monk' && e && e.alive && realFoe(e) && e.role !== 'candle' && (e.row === 'front' || (b.p.stance && b.p.stance.far)));
const monkShowCtr = (b, e) => monkCtrOk(b, e) && !!(e.intent && CTR_SHOW.includes(e.intent.k)) && !(e.boss === 'abbot' && e.intent.k === 'heavy' && st(b.p, 'brand') >= 3);
const setKi = (p, n) => { n = Math.max(0, Math.min(KW.empower, Math.round(n))); if (n > 0) p.s.empower = { stacks: n, until: KW_FOREVER, dur: KW_FOREVER }; else delete p.s.empower; };
