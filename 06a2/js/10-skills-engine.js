
/* ===== 나락의 유산 B0 전투 프로토타입 — 엔진 (기획서 v2, 4.1~4.8 / 6.8 / 10.2) ===== */
'use strict';
const VERSION = '0.7.0';
const BHP = 22, BDMG = 2.3;            // 역할 기준값 B (4.6 역할 배율에 곱함) [B0 가설]
const r1 = v => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- 역할 (4.6 역할별 기준 배율, B0 역할 6종 + 하수인) ---- */

/* ---- 빌드 3종 (10.2 B0) ---- */
/* 공용 스킬 풀: 어느 직업이든 3칸까지 자유롭게 */
const SKILL_SLOTS = 3;
/* 직업 전용 스킬 (시작부터, 그 직업만). type: melee | ranged | aoe | front(전열 전체) | self */
/* 직업 기술: 스킬 칸과 별도로 늘 쓸 수 있는 직업 고유 행동 */
function exclOf(build) { return (EXCL[build] || []).map(s => Object.assign({ excl: build, gen: 1, melee: s.type === 'melee' ? 1 : 0, ranged: s.type === 'ranged' ? 1 : 0, aoe: s.type === 'aoe' || s.type === 'front' ? 1 : 0, self: s.type === 'self' ? 1 : 0 }, s)); }
function skillMap(build) { const m = allSkills(); for (const s of exclOf(build)) m[s.id] = s; for (const s of (SKILLS2[build] || [])) m[s.id] = v2Static(s); if (build === 'novice') for (const s of TUT_SKILLS) m[s.id] = v2Static(s); return m; }
/* 0.6a.2 스킬 한 줄 → 행동 목록이 쓰는 꼴 (대상 종류, 근접 여부, 빠르기) */
function v2Static(s) { return { id: s.id, n: s.n, v2: 1, s, skill: 1, melee: s.tgt === 'melee' ? 1 : 0, ranged: s.tgt === 'ranged' ? 1 : 0, dodge: s.tgt === 'pick' ? 1 : 0, aoe: s.tgt === 'front' || s.tgt === 'all' ? 1 : 0, self: s.tgt === 'self' ? 1 : 0, front: s.tgt === 'front' ? 1 : 0, time: SKK.T[s.time], d: skBody(s) }; }
/* 흘리기를 건다: 고른 적의 다음 공격을 줄이고, 흘려 내면 on의 효과를 그 적에게. 흘리기 준비(pbuf)가 있으면 얹고 1 쓴다 */
function setParry(b, tgt, red, on) {
  const p = b.p; p.dodge = tgt.id; p.fxDodged = 1;
  let r = red != null ? red : parryRed(p); const o = Object.assign({}, on || {});
  if (p.pbuf) { r += p.pbuf.red; if (p.pbuf.dmg) o.dmg = (o.dmg || 0) + p.pbuf.dmg; if (p.pbuf.poison) o.poison = (o.poison || 0) + p.pbuf.poison; if (p.pbuf.hasten) { o.hasten = (o.hasten || 0) + p.pbuf.hasten; o.hb = p.pbuf.hb; } p.pbuf.n--; if (p.pbuf.n <= 0) p.pbuf = null; }
  p.dodgeRed = Math.min(0.9, r); p.dodgeOn = (o.dmg || o.poison || o.brk || o.hasten || o.bleed) ? o : null;
}
/* 0.6a.2 스킬 실행: data/skills.js의 한 줄(fx 목록)을 그대로 처리한다. 설명 문장(skBody)도 같은 줄에서 나온다 */
function runSkill2(b, act, tgt) {
  const p = b.p; const s = act.s; if (!p.cd) resetCharges(p); const F = k => s.fx.find(e => e.k === k);
  b.curSkill = s.id;
  const CF = /^c_/.test(String(s.id)); const cfBefore = CF ? Math.min(CONF.cap, b.cleanTurn || 0) : 0; let cfE = 0; if (CF) b.cfOffer = null; // 숨겨진 직업 2: 앞서 이번 차례에 지우거나 바친 숫자 (이 스킬 몫은 넣지 않는다)
  const BM = isBm(p) && /^v_/.test(String(s.id)); // 숨겨진 직업 3: 생명력 내기는 다른 효과보다 먼저, 값 깎기는 전투 동안 남는다
  if (BM) { const hc = bmHpCost(p, s); if (hc > 0) bmPay(b, hc, s, 'hp');
    for (const pc of s.fx.filter(e => e.k === 'payCut')) { p.payCut = p.payCut || []; let k = 0; for (let i = 0; i < (pc.n || 1) && p.payCut.length < BLOOD.payCutMax; i++) { p.payCut.push(pc.off != null ? { off: pc.off } : { mul: pc.mul }); k++; } logp(b, 'good', k ? s.n + '. 다음 피로 당기기 ' + k + '번은 ' + (pc.off != null ? '남은 쿨타임 ' + pc.off + '턴 몫까지 생명력이 들지 않는다' : '값이 절반이다') : s.n + '. 값 깎기는 ' + BLOOD.payCutMax + '개까지만 쌓인다'); } }
  const BU = /^b_/.test(String(s.id)); // 숨겨진 직업 1의 넓힌 효과 (출혈 먹기 · 받은 피해 · 처치 보상 등). 다른 직업의 스킬은 이 길을 지나지 않는다
  const capOver = (F('capOver') || {}).cap || 0;
  let targets = s.tgt === 'front' ? alive(b).filter(e => e.row === 'front' && e.role !== 'root') : s.tgt === 'all' ? alive(b).filter(e => e.role !== 'root') : s.tgt === 'self' ? [] : (tgt ? [tgt] : []);
  const sbOrd = p.build === 'spellblade'; const sbE = sbOrd && s.kind === 'cut' && p.edge ? { st: tgt && targets.includes(tgt) ? 'tgt' : 'any', tgt, apply: null } : null; if (sbE && sbE.st === 'tgt' && targets.length > 1) targets = [tgt].concat(targets.filter(x => x !== tgt)); // 마검사 칼에 싣기: 고른 적부터 친다(전열 베기도 고른 적 하나에게 건다)
  const altF = F('alt'); const altOn = !!(altF && b.sbAlt && (altF.run === 2 ? b.sbRunNow >= 2 : true)); if (altOn && altF.run === 2) b.sbRun2 = 1; b.sbAltFx = altOn ? altF : null; const altBrk = altOn && altF.brk ? altF.brk : 0; let altBrkLog = 0; // 마검사 교대 보상: 붕괴는 타격 뒤, 나머지는 행동 뒤(sbEnd)
  const hz = F('hasten'); const hzOn = hz ? (hz.on || 'use') : null; // 🔄 쿨타임 당기기 (10월 3일 만든 사람 결정 D: 갈래 규칙 대신 스킬에만 적는다)
  const par = F('parry'); if (par && tgt) { setParry(b, tgt, par.red, Object.assign({}, F('onParry') || {}, hzOn === 'parry' ? { hasten: hz.n || 1, hb: s.b } : {})); logp(b, 'sys', tgt.n + '의 다음 공격을 흘릴 준비를 한다'); }
  const sm = F('stam'); if (sm) { p.st = Math.min(p.stMax, p.st + sm.n); if (p.exhaust && p.st >= 30) p.exhaust = 0; }
  if (s.tgt === 'self') for (const x of s.fx) if (x.k === 'st') { addS(b, p, x.s, x.n); logp(b, 'good', s.n + '. ' + (x.s === 'empower' && p.build === 'monk' ? '기' : KW_N[x.s] || x.s) + ' ' + x.n); } // 나에게 거는 상태
  for (const x of s.fx) if (x.k === 'meSt' && !x.on && !(p.build === 'monk' && (x.s === 'empower' || x.if))) { if (CF && CONF.kinds.includes(x.s)) { (p.selfBad = p.selfBad || []).push({ s: x.s, n: x.n }); continue; } /* 숨겨진 직업 2: 고행은 행동이 끝난 뒤 (cfSelfApply) */ if (BU && x.s === 'bleed') { b.selfSt = 1; const g = addS(b, p, 'bleed', x.n) || 0; b.selfSt = 0; p.selfBl = Math.min(stk(p, 'bleed'), (p.selfBl || 0) + g); logp(b, 'bad', s.n + '. 나에게 출혈 ' + x.n); b.rec.push({ k: 'bu', w: 'selfBleed', n: g }); continue; } addS(b, p, x.s, x.n); logp(b, 'good', s.n + '. ' + (KW_N[x.s] || x.s) + ' ' + x.n); } // 공격 스킬에 붙은 나에게 거는 상태 (on: 'kill'은 쓰러뜨린 뒤. 수도승의 강화(기)와 if는 피해 뒤 b.kiPend로)
  let meDrainDmg = 0; { const md = BU && s.fx.find(e => e.k === 'drain' && e.s === 'bleed' && e.me); if (md) { const n = stk(p, 'bleed'); delete p.s.bleed; p.selfBl = 0; const em = md.emp ? Math.min(4, n * md.emp) : 0; if (em > 0) addS(b, p, 'empower', em); if (md.dmg) meDrainDmg = Math.min(md.max || 10, n) * md.dmg; logp(b, n > 0 ? 'good' : 'sys', n > 0 ? s.n + '. 내 출혈 ' + n + '을(를) 거둔다' + (em ? '. 강화 ' + em : '') + (meDrainDmg ? '. 피해 +' + meDrainDmg : '') : s.n + '. 거둘 내 출혈이 없다'); b.rec.push({ k: 'bu', w: 'meDrain', n }); } } // 내 출혈 지우기 (피를 바치는 일격 · 마지막 숨)
  const ev = F('evade'); if (ev) { p.evade = Math.min(3, (p.evade || 0) + ev.n); logp(b, 'good', s.n + '. 다음에 맞는 공격 ' + p.evade + '번을 피한다'); } // 사냥꾼: 몸 빼기
  const ec = F('evadeCtr'); if (ec) p.evadeCtr = { dmg: ec.dmg, chill: ec.chill || 0, charged: ec.charged || 0, until: ec.rounds ? (b.round || 0) + ec.rounds : 0 }; // 피했을 때 반격
  if (hzOn === 'evade') p.evadeHz = { n: hz.n || 1, br: s.b, id: s.id }; // 🔄 피할 때마다 쿨타임 당기기
  const qk = F('quick'); if (qk && !qk.on) { b.extraQuick = 1; logp(b, 'good', s.n + '. 이번 차례에 빠른 칸이 하나 더 생긴다'); }
  const qt = F('quickTurns'); if (qt) { b.extraQuick = 1; p.quickTurns = qt.n - 1; logp(b, 'good', s.n + '. 내 차례 ' + qt.n + '번 동안 빠른 칸이 하나 더 생긴다'); }
  const fs = F('foresee'); if (fs) { p.foresee = { red: fs.red, until: (b.round || 0) + fs.rounds }; logp(b, 'good', s.n + '. ' + fs.rounds + '라운드 동안 강타 · 겨눈 한 발 · 화형의 피해 −' + Math.round(fs.red * 100) + '%'); }
  const wd = F('ward'); const wdLate = !!(wd && F('wardBurn')); if (wd && !wdLate) { const g = addWard(b, p, wd.n); logp(b, 'good', s.n + '. 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')'); } // 파수꾼: 보호막 얻기
  const wf = F('wardFill'); if (wf) { const goal = Math.round(wardMax(p) * (wf.to || 1)); const g = addWard(b, p, Math.max(0, goal - (p.ward || 0))); logp(b, g > 0 ? 'good' : 'sys', s.n + (g > 0 ? '. 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')' : '. 보호막이 이미 그만큼 있다')); } // 보호막 채우기: 상한의 to까지 (비어 있을수록 많이)
  const rm = F('rime'); if (rm) { const k = rm.s || 'chill'; p.rime = p.rime || {}; const c0 = p.rime[k]; p.rime[k] = { n: Math.max(c0 ? c0.n : 0, rm.n), times: Math.min(ELEM.rimeMax, (c0 ? c0.times : 0) + rm.times) }; logp(b, 'good', s.n + '. 다음 ' + p.rime[k].times + '번, 나를 친 적에게 ' + KW_N[k] + ' ' + p.rime[k].n); } // 원소술사 되얼림 · 불꽃 외투: 이미 있으면 횟수를 더한다(최대 8번), 수치는 큰 쪽
  const th = F('thorn'); if (th && th.bleed) { const n0 = p.thorn ? p.thorn.n : 0; p.thorn = { n: Math.min(WARD.thornMax, n0 + th.times), dmg: Math.max(p.thorn ? p.thorn.dmg : 0, th.dmg || 0), bleed: Math.max(p.thorn ? p.thorn.bleed || 0 : 0, th.bleed) }; logp(b, 'good', s.n + '. 맞으면 때린 적에게 출혈 ' + p.thorn.bleed + ' · ' + p.thorn.n + '번'); } // 맞을 때 출혈 (숨겨진 직업 1)
  else if (th) { const n0 = p.thorn ? p.thorn.n : 0; p.thorn = { n: Math.min(WARD.thornMax, n0 + th.times), dmg: Math.max(p.thorn ? p.thorn.dmg : 0, th.dmg) }; logp(b, 'good', s.n + '. 가시 ' + p.thorn.n + '번(맞을 때마다 피해 ' + p.thorn.dmg + ')'); } // 가시: 이미 있으면 횟수를 더한다(최대 8), 피해는 큰 쪽 (10월 4일)
  const pb = F('parryBuff'); if (pb) { p.pbuf = { n: pb.times || 1, red: pb.red || 0, stam: pb.stam || 0, dmg: pb.dmg || 0, poison: pb.poison || 0, hasten: hzOn === 'parry' ? (hz.n || 1) : 0, hb: s.b }; logp(b, 'good', '칼끝을 겨눈다. 다음 흘리기 ' + p.pbuf.n + '번이 날카로워진다'); }
  const multi = s.tgt === 'front' || s.tgt === 'all'; const hits = s.hits || 1; let tot = 0, killed = 0;
  const wv = F('weave'), bo = F('burnOut'); const preI = {}; if (bo) for (const e of targets) preI[e.id] = st(e, 'ignite'); // 원소술사: 엮기, 불태우기(첫 타격 전의 화상)
  const wb = F('wardBurn'); let burn = 0; if (wb) { burn = Math.min(p.ward || 0, wb.max || Infinity); p.ward = (p.ward || 0) - burn; logp(b, burn > 0 ? 'good' : 'sys', burn > 0 ? '보호막 ' + Math.round(burn) + '을(를) 태운다' : '태울 보호막이 없다'); } // 파수꾼: 태운 만큼 × 배수 피해
  const wdm = F('wardDmg'), vp = F('vulnPer'), shx = F('shieldx'), pl = F('pull'), vg = F('vulnGrow'), chx = F('chillx'); const wardNow = p.ward || 0;
  const dm = F('dmg'), ex = F('exploit'), po = F('poison'), bk = F('brk'), bp = F('brkPer'); const stx = s.tgt === 'self' ? [] : s.fx.filter(e => e.k === 'st'); const lx = F('lowx'), bx = F('brokenx'), sp = F('spread'), cx = F('cutx'), dr = F('drain'), gx = F('bigx'); const isBig = e => !!(e.elite || e.strong || e.role === 'boss');
  const lnk = linkOn(b, act); if (lnk) logp(b, 'good', '🔗 연계 (' + p.lastBr + ' → ' + s.b + '): 피해 +' + Math.round(HUNT.link * 100) + '%');
  const ccut = F('chillCut'), csh = F('chillShatter'), csp = F('chillSpread'), frz = F('freeze'), ocb = F('onCutBreak'); const big = e => !!(e.strong || e.role === 'boss'); // 사냥꾼 기동 오른쪽 (10월 5일)
  const preCh = {}, preStop = {}, preBrk = {}; for (const e of targets) { preCh[e.id] = st(e, 'chill'); preStop[e.id] = isStopTarget(e); preBrk[e.id] = !!e.s.broken; }
  const kwxF = F('kwx'), ksp = F('killSpread'), edx = F('edgeX'); const preKw = {}; for (const e of targets) preKw[e.id] = { bleed: st(e, 'bleed'), ignite: st(e, 'ignite'), chill: st(e, 'chill') }; // 마검사: 쓰기 직전 기록 (kwx · exploit의 s · killSpread)
  const kb = F('kiBurst'), kpr = F('kiPer'), slx = F('sealx'); const kiNow = st(p, 'empower'); const meIf = s.fx.some(x => x.k === 'meSt' && x.if === 'chill'); let kiTake = 0, kiBack = 0, kiHit = !kb, kiIf = 0; // 수도승 (10월 7일): 기 터뜨리기 · 기 비례 · 지원 끊기
  if (kb) { let got = 0; const t0 = targets[0]; if (kb.pre && t0 && preCh[t0.id] > 0) got = addS(b, p, 'empower', kb.pre) || 0; const K0 = st(p, 'empower'); kiTake = Math.min(kb.max || KW.empower, K0); kiBack = K0 - got; setKi(p, kb.keep ? Math.floor(K0 * kb.keep) : K0 - kiTake); logp(b, kiTake > 0 ? 'good' : 'sys', kiTake > 0 ? (got ? '늦춘 적에게서 기 +' + got + '. ' : '') + '기 ' + kiTake + ' 터뜨림' + (st(p, 'empower') ? ' (남은 기 ' + st(p, 'empower') + ')' : '') : '터뜨릴 기가 없다'); } // 피해 앞에서 거둔다(pre: 대상이 이미 둔화면 먼저 기)
  const hsp = F('hasteSpend'); let hspOn = false; if (hsp && p.s.haste > 0 && targets.length) { kwDec(p, 'haste'); hspOn = true; logp(b, 'good', s.n + '. 가속 1을 써서 피해 ×' + hsp.mul); } // 가속 쓰기: 다음 라운드의 연속 행동 대신 지금 큰 한 방
  const gru = BU ? F('grudge') : null, cr = BU ? F('carry') : null, eat = BU ? s.fx.find(e => e.k === 'drain' && e.s === 'bleed' && !e.me) : null, spK = BU ? s.fx.find(e => e.k === 'spread' && e.s === 'bleed' && e.kill) : null; // 숨겨진 직업 1
  const preBl = {}; const preBlOf = e => (e.id in preBl ? preBl[e.id] : (preBl[e.id] = stk(e, 'bleed'))); for (const e of targets) preBlOf(e); // 이 스킬을 쓰기 전 대상의 출혈 (출혈 비례 · 먹기 · 튀기기)
  const stBl = (s.fx.find(e => e.k === 'st' && e.s === 'bleed') || { n: 0 }).n; const meKill = BU ? s.fx.find(e => e.k === 'meSt' && e.on === 'kill') : null;
  const eatF = BM ? s.fx.find(e => e.k === 'drain' && e.eat) : null, bdF = BM ? F('bloodDmg') : null, pdF = BM ? s.fx.find(e => e.k === 'perDmg' && e.of === 'weak') : null, spV = BM ? s.fx.find(e => e.k === 'spread' && e.kill && !e.s) : null; // 숨겨진 직업 3
  const prePo = {}; if (spV) for (const e of targets) prePo[e.id] = st(e, 'poison'); const spGot = {}; let eatHeal = 0, eatN = 0; // 쓰러뜨리면 번짐이 읽는 중독은 스킬을 쓰기 직전 값, 받는 쪽마다 한 행동에 합쳐 상한
  const kills = []; const hasKR = BU && !!(s.killRecharge || spK || meKill || (hz && hz.on === 'kill') || (qk && qk.on === 'kill'));
  if (BU) b.rec.push({ k: 'bu', w: 'use', id: s.id, lost: r1(1 - p.hp / p.hpMax), gr: gru ? r1(p.grudge || 0) : null, bl: targets[0] ? preBlOf(targets[0]) : null, me: stk(p, 'bleed') });
  const buEat = (e, dead) => { // 출혈 먹기: 대상이 이 타격에 쓰러져도 먹는다. 먹은 뒤 이 스킬의 출혈이 걸린다
    if (!eat || (eat.kill && !dead)) return; const n0 = Math.min(preBlOf(e), stk(e, 'bleed')); if (n0 <= 0) { if (!s.fx.some(x => x.k === 'dmg')) logp(b, 'sys', e.n + '에게 먹을 출혈이 없다'); return; }
    const n = eat.max ? Math.min(eat.max, n0) : eat.half ? Math.ceil(n0 / 2) : n0; kwDec(e, 'bleed', n);
    const left = eat.keep ? Math.floor(n * eat.keep) : 0; if (left > 0) e.s.bleed = { stacks: Math.min(KW.bleed, stk(e, 'bleed') + left), until: KW_FOREVER, dur: KW_FOREVER };
    const g = bHeal(b, n * eat.per, 'eat'); logp(b, 'good', e.n + '의 출혈 ' + n + '을(를) 먹는다. 생명력 +' + r1(g) + (g + 0.05 < n * eat.per * healMul(p) ? ' (되찾기 한도)' : '') + (left ? '. 출혈 ' + left + ' 남음' : ''));
    if (eat.brk && e.alive) addBreak(b, e, n * eat.brk); if (eat.weak && e.alive) { const w = Math.min(3, Math.floor(n / eat.weak)); if (w) addS(b, e, 'weak', w); } if (eat.emp) { const m = Math.min(3, Math.floor(n / eat.emp)); if (m) { addS(b, p, 'empower', m); logp(b, 'good', '나에게 강화 ' + m); } }
    b.rec.push({ k: 'bu', w: 'eat', id: s.id, n, dead: dead ? 1 : 0, got: r1(g) });
  };
  const buKill = e => { // 처치 보상: 같은 적에게서 한 번 (e.killPaid)
    b.rec.push({ k: 'bu', w: 'kill', id: s.id, paid: e.killPaid ? 0 : 1 }); if (!hasKR || e.killPaid) return; e.killPaid = 1; kills.push(e);
    if (spK) { const n = Math.min(6, Math.ceil((preBlOf(e) + stBl) * (spK.per || 1))); let k = 0; if (n > 0) for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'bleed', n); k++; } if (k) logp(b, 'good', e.n + '의 피가 튄다. 다른 적 모두에게 출혈 ' + n); b.rec.push({ k: 'bu', w: 'spill', n, to: k }); }
  };
  b.focusKey = null; const fxs = F('focusx'), fb = F('focusBurst'), fa = F('focusAdd'), swx = F('swapx'), hsx = F('hastex'); const prevId = p.focus ? p.focus.id : null; const preF = {}; const fOf = e => (e.id in preF ? preF[e.id] : (preF[e.id] = p.focus && p.focus.id === e.id ? p.focus.n : 0)); // 사냥꾼: 이 스킬을 쓰기 전 추적
  const cfPd = CF ? F('perDmg') : null, cfTr = CF ? F('transfer') : null, cfDp = CF ? F('dispel') : null, cfCl = CF ? F('cleanse') : null; let cfX = 0; // 숨겨진 직업 2: 옮기기 → 벗기기 → 정화 · 사함 → 타격(비례)
  const cfTX = e => !cfPd ? 0 : (cfPd.of === 'weak' || cfPd.of === 'bleed') ? Math.min(CONF.cap, stk(e, cfPd.of)) : cfPd.of === 'tbad' ? Math.min(CONF.cap, CONF.kinds.reduce((a, k) => a + stk(e, k), 0)) : cfX;
  if (CF) {
    if (cfTr) cfTransfer(b, s, cfTr, targets);
    if (cfDp) for (const e of targets) { if (!e.alive) continue; const n = Math.min(cfDp.n || CONF.cap, stk(e, 'empower')); if (n > 0) { kwDec(e, 'empower', n); logp(b, 'good', e.n + '의 강화 ' + n + '을(를) 벗긴다'); } else if (!multi) logp(b, 'sys', e.n + '에게 벗길 강화가 없다'); b.rec.push({ k: 'dispel', id: s.id, n }); }
    if (cfCl && !cfCl.after) { const r = cfCleanse(b, cfCl, s.n, s.id); if (!r.offer) cfE += r.e; }
    if (cfPd && ['prot', 'burden', 'clean'].includes(cfPd.of)) { cfX = Math.min(CONF.cap, cfPd.of === 'prot' ? stk(p, 'protect') : cfPd.of === 'burden' ? cfBurden(p) : cfBefore); b.rec.push({ k: 'cfper', id: s.id, of: cfPd.of, x: cfX, self: cfPd.of === 'burden' ? cfSelfSum(p) : 0 }); }
    if (cfPd && cfPd.spend && cfX > 0) logp(b, 'good', '보호 ' + cfX + '을(를) 모두 써서 친다');
  }
  for (let h = 0; h < hits; h++) for (const e of targets) {
    if (!e.alive || b.over) continue;
    let eatAdd = 0; if (eatF && h === 0) { const n0 = st(e, 'poison'); const t = Math.min(eatF.max || Infinity, n0); if (t > 0) { kwDec(e, 'poison', t); eatHeal += t * eatF.per; eatN += t; eatAdd = t * (eatF.dmg || 0); logp(b, 'good', e.n + '의 중독 ' + t + '을(를) 먹는다'); } else if (!dm) logp(b, 'sys', e.n + '에게 먹을 중독이 없다'); } // 먹기: 피해 앞에서, 먹기 자체는 피해가 아니다
    if (spV && spV.mark && h === 0) e.mark = { per: spV.per || 1, by: s.id }; // 표식: 피해보다 먼저 단다
    let base = (dm ? dm.n : 0) + (ex ? ex.per * (BU && ex.s === 'bleed' ? (ex.me ? Math.min(ex.max || 10, stk(p, 'bleed')) : preBlOf(e)) : ex.s ? preKw[e.id][ex.s] : st(e, 'poison')) : 0) + (wb && h === 0 ? burn * wb.mul : 0) + (wdm ? wdm.per * wardNow : 0) + (vp ? vp.per * st(e, 'vuln') : 0);
    if (BU) { if (gru) base += Math.min(gru.max || 999, gru.per * (p.grudge || 0)); base += meDrainDmg; } // 받은 피해 · 지운 내 출혈
    if (kb && h === 0) base += kiTake * kb.per; if (kpr) base += kpr.per * kiNow; // 수도승: 터뜨린 기(첫 타) · 쓰기 전의 기(타격마다)
    if (CF) { if (cfPd && cfPd.per) base += cfPd.per * cfTX(e); if (b.cfOffer && h === 0) base += b.cfOffer.c * b.cfOffer.dmg; if (cfPd && cfPd.of !== 'prot' && cfPd.of !== 'burden' && cfPd.of !== 'clean' && h === 0) b.rec.push({ k: 'cfper', id: s.id, of: cfPd.of, x: cfTX(e) }); } // 숨겨진 직업 2: 비례 · 사함 피해 (배수는 아래에서 곱한다)
    if (BM) base += eatAdd + (pdF ? pdF.per * st(e, 'weak') : 0) + (bdF ? bdF.per * Math.min(BLOOD.dmgCount, b.paidTurn || 0) : 0); // 먹은 만큼 · 약화된 만큼(이 스킬의 약화 전) · 이번 차례에 낸 피만큼
    if (bo && h === 0) base += bo.per * preI[e.id] * dotMul(p); // 불태우기: 태운 화상 1마다 (지능 반영)
    if (csh && h === 0 && preCh[e.id] > 0) { base += csh.dmg * preCh[e.id]; delete e.s.chill; } // 얼음 깨기: 둔화를 모두 깨뜨린다
    if (fb && h === 0) base += fb.n * fOf(e); if (fxs) base *= 1 + fxs.per * fOf(e); if (swx && h === 0 && prevId != null && prevId !== e.id) base *= swx.mul; if (hsx && b.pDouble === b.round) base *= hsx.mul; if (lnk) base *= 1 + HUNT.link; if (hsp && h === 0 && hspOn) base *= hsp.mul; // 추적 터뜨리기 · 추적 비례 · 표적 바꾸기 · 가속
    if (lx && (lx.me ? p.hp <= p.hpMax * lx.hp : e.hp <= e.hpMax * lx.hp)) base *= lx.mul; if (bx && e.s.broken) base *= bx.mul; if (gx && isBig(e)) base *= gx.mul; if (chx && e.s.chill) base *= chx.mul; if (kwxF && preKw[e.id][kwxF.s] > 0) base *= kwxF.mul; // 마무리(생명력 낮음), 붕괴한 적, 큰 적, 둔화된 적 (겹치면 곱한다)
    const ev0 = !!(e.evading && !multi); let hitE = false; // 몸 낮추기로 피했는가 (수도승: 터뜨린 기를 돌려준다)
    let dealt = 0; if (base > 0) { dealt = hurtEnemy(b, e, outDmg(b, base, {}), { single: multi ? 0 : 1, aoe: multi ? 1 : 0, melee: s.tgt === 'melee' || s.tgt === 'front' ? 1 : 0, noIgn: bo && h === 0 ? 1 : 0, leechBleed: BU && h === 0 && s.tgt === 'melee' ? stBl : 0, label: s.n }); tot += dealt; hitE = !(ev0 && !e.evading); if (hitE) kiHit = true; if (hitE && h === 0 && meIf && preCh[e.id] > 0) kiIf++; }
    if (sbE && h === 0) sbEdgeSee(sbE, e, dealt); // 칼: 고른 적이 맞았는지 (빗나가면 처음 피해를 받은 적)
    if (base > 0 && !e.alive) { killed++; if (BU) { if (h === 0) buEat(e, true); buKill(e); if (cr && h < hits - 1 && targets.length === 1) { const nx = buCarry(b, act, e); if (nx) { targets[0] = nx; logp(b, 'good', '남은 타격이 ' + nx.n + '에게 이어진다'); } } } if (ksp && h === 0) sbKillSpread(b, e, preKw[e.id].bleed, ksp); if (spV && !e.killPaid) { e.killPaid = 1; const n = Math.min(BLOOD.spreadKillMax, Math.ceil((prePo[e.id] || 0) * (spV.per || 1))); if (n > 0) bmSpread(b, e, n, spGot); } continue; }
    if (kb && kb.brk && h === 0 && hitE && e.alive && kiTake > 0) addBreak(b, e, kiTake * kb.brk); // 터뜨린 기 1마다 붕괴
    if (bo && h === 0 && e.alive) { const n = preI[e.id]; if (n > 0) { delete e.s.ignite; addBreak(b, e, bo.brk * n); logp(b, 'good', e.n + '의 화상 ' + n + '을(를) 모두 태운다. 붕괴 +' + bo.brk * n); } else logp(b, 'sys', e.n + '에게 태울 화상이 없다'); } // 불태우기: 화상은 타격 뒤에 지운다(그 타격으로 쓰러지면 불로 쓰러진 것)
    if (BU && h === 0) buEat(e, false);
    if (fb && h === 0 && e.alive) { p.focus = { id: e.id, n: 0 }; } // 터뜨린 추적은 사라진다
    if (csh && h === 0 && e.alive && preCh[e.id] > 0) { logp(b, 'good', e.n + '의 얼음이 깨진다. 둔화 ' + preCh[e.id]); addBreak(b, e, csh.brk * preCh[e.id]); b.rec.push({ k: 'shatter', n: preCh[e.id], broke: e.s.broken && !preBrk[e.id] ? 1 : 0 }); }
    if (ccut && h === 0 && e.alive && preCh[e.id] > 0 && preStop[e.id]) { if (big(e)) { logp(b, 'good', e.n + '을(를) 멈춰 세우려 한다. 붕괴 +' + ccut.brk); addBreak(b, e, ccut.brk); } else { const was = e.intent.k; e.intent = { k: 'attack' }; e.teleTurn = null; if (e.chant) { e.chant = null; e.pyreRest = 1; } logp(b, 'crit', e.n + '을(를) 멈춰 세운다. 모으던 ' + (was === 'aim' || e.intent.aimed ? '겨누기' : CHANT_K.includes(was) ? '영창' : '강타') + '가 흩어진다'); } } // 멈춰 세우기: 둔화된 적이 모으는 중이면 끊는다(강적 · 보스는 큰 붕괴)
    if (csp && h === 0 && e.alive && preCh[e.id] > 0) { const n = Math.max(1, Math.round(preCh[e.id] * (csp.per || 1))); let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'chill', n); k++; } if (k) logp(b, 'good', e.n + '의 냉기가 번진다. 다른 적 모두에게 둔화 ' + n); } // 냉기 번짐
    if (frz && h === 0 && e.alive) { if (big(e)) { addS(b, e, 'chill', frz.chill); addBreak(b, e, frz.brk); logp(b, 'good', e.n + '이(가) 얼음에 갇히다 만다. 둔화 ' + frz.chill + ', 붕괴 +' + frz.brk); } else { e.stun = Math.max(e.stun || 0, 1); logp(b, 'crit', e.n + '이(가) 얼어붙는다. 다음 행동을 놓친다'); } } // 얼음 감옥
    if (ocb && h === 0 && e.alive && preStop[e.id] && !preBrk[e.id] && e.s.broken) { addS(b, p, 'haste', ocb.haste); if (ocb.hasten) hastenBranch(b, s.b, ocb.hasten, s.id); logp(b, 'good', '모으던 적을 무너뜨렸다. 나에게 가속 ' + ocb.haste + (ocb.hasten ? ', 다른 ' + s.b + ' 스킬 쿨타임 −' + ocb.hasten : '')); } // 발목 끊기
    if (fa && h === hits - 1 && e.alive) { const cur = p.focus && p.focus.id === e.id ? p.focus.n : 0; p.focus = { id: e.id, n: Math.max(cur, Math.min(HUNT.addMax, cur + fa.n)) }; logp(b, 'good', e.n + '에게 추적 ' + p.focus.n + '겹'); } // 추적 추가는 2겹까지만
    if (sbOrd && h === 0) { for (const x of stx) if (e.alive) addS(b, e, x.s, x.n); if (sbE && sbE.apply === e && e.alive) sbEdgeApply(b, e, edx ? edx.mul : 1); if (ex && ex.s && ex.take && preKw[e.id][ex.s] > 0) { delete e.s[ex.s]; logp(b, 'good', e.n + '의 ' + KW_N[ex.s] + '을(를) 모두 거둔다. ' + KW_N[ex.s] + ' ' + preKw[e.id][ex.s]); } } // 마검사 순서: 상태 → 칼 → 붕괴 → 교대 붕괴 → 끊기
    if (po) addPoison(b, e, po.n, 1, capOver);
    if (bk) addBreak(b, e, bk.n * (shx && e.role === 'shield' ? shx.mul : 1)); // 방패병에게 붕괴 ×
    if (CF && h === 0 && e.alive) { const cb = (b.cfOffer && b.cfOffer.brk ? b.cfOffer.c * b.cfOffer.brk : 0) + (cfPd && cfPd.brk ? cfPd.brk * cfTX(e) : 0); if (cb > 0) addBreak(b, e, cb); } // 숨겨진 직업 2: 사함 붕괴 · 비례 붕괴 (대상마다 한 번)
    if (altBrk && h === 0 && e.alive) { if (!altBrkLog++) logp(b, 'good', (altF.run === 2 ? '⇄⇄ 이어진 교대' : '⇄ 교대') + ': 붕괴 +' + altBrk); addBreak(b, e, altBrk); }
    if (cx && h === 0 && e.alive && e.intent && (cx.chant ? CHANT_K : ['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn']).includes(e.intent.k)) { logp(b, 'good', e.n + '이(가) 모으던 힘을 노린다. 붕괴 +' + cx.brk); addBreak(b, e, cx.brk); } // 끊어 내기
    if (dr && !dr.s && !dr.eat && h === 0 && st(e, 'poison') > 0) { const hl = Math.min(p.hpMax - p.hp, st(e, 'poison') * dr.per * healMul(p)); if (hl > 0) { p.hp += hl; logp(b, 'good', e.n + '의 독에서 생명력 +' + r1(hl)); } } // 독 흡수: 중독은 그대로
    if (bp && h === 0) addBreak(b, e, bp.per * st(e, 'poison'));
    if (h === 0 && !sbOrd) for (const x of stx) if (e.alive) addS(b, e, x.s, x.n); // 적에게 거는 상태 (독무의 약화). 마검사는 위에서 붕괴보다 먼저
    if (slx && h === 0 && hitE && e.alive && e.intent && SEAL_K.includes(e.intent.k)) { if (big(e)) { addBreak(b, e, slx.brk); logp(b, 'good', e.n + '의 혈을 짚는다. 끊기지 않고 붕괴 +' + slx.brk); } else { e.intent = { k: 'attack' }; e.teleTurn = null; logp(b, 'crit', e.n + '의 혈을 짚어 하려던 일을 끊는다'); } b.rec.push({ k: 'seal', big: big(e) ? 1 : 0 }); } // 혈도: 지원 행동 끊기
    if (gru && h === 0 && e.alive && (p.grudge || 0) > 0) { if (gru.bl) addS(b, e, 'bleed', Math.min(6, Math.floor(p.grudge / gru.bl))); if (gru.vu) addS(b, e, 'vuln', Math.min(3, Math.floor(p.grudge / gru.vu))); if (gru.brk) addBreak(b, e, Math.min(gru.brkMax || 999, p.grudge * gru.brk)); } // 받은 피해를 출혈 · 취약 · 붕괴로
    if (wv && h === 0 && e.alive) { const I = st(e, 'ignite'), C = st(e, 'chill'); if (I && !C) addS(b, e, 'chill', wv.chill); else if (!I) addS(b, e, 'ignite', wv.ign); } // 원소술사 엮기: 없는 원소 (첫 타격이 화상을 쓴 뒤의 상태로 고른다. 둘 다 있으면 걸지 않는다)
    if (pl && h === 0 && e.alive && e.row === 'back') { e.row = 'front'; logp(b, 'crit', e.n + '을(를) 전열로 끌어낸다'); } // 파수꾼: 후열 끌어내기
    if (vg && h === 0 && e.alive) { const n0 = st(e, 'vuln'); const add = Math.round(n0 * (vg.mul - 1)); if (add > 0) { addS(b, e, 'vuln', add); logp(b, 'good', e.n + '의 약점이 벌어진다. 취약 ' + n0 + ' → ' + st(e, 'vuln')); } } // 파수꾼: 취약 키우기
    if (BM && sp && sp.s === 'weak' && h === hits - 1 && e.alive) { const n = Math.min(KW.weak, Math.ceil(st(e, 'weak') * (sp.per || 1))); if (n > 0) { let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'weak', n); k++; } if (k) logp(b, 'good', e.n + '의 저주가 번진다. 다른 적에게 약화 ' + n); } } // 약화 퍼뜨리기 (이 스킬의 약화를 건 뒤)
    if (sp && !sp.s && !sp.kill && h === hits - 1 && e.alive) { const n = Math.ceil(st(e, 'poison') * sp.per); if (n > 0) { let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addPoison(b, o, n, 1, capOver); k++; } if (k) logp(b, 'good', e.n + '의 독이 번진다. 다른 적에게 중독 ' + n); } } // 독 번지기
  }
  if (kb && !kiHit && targets.length && !b.over) { setKi(p, kiBack); logp(b, 'sys', '빗맞아 터뜨린 기를 거둬들인다. 기 ' + st(p, 'empower')); } // 맞은 적이 없으면(몸 낮추기) 거둔 기를 돌려준다
  if (p.build === 'monk') for (const x of s.fx) if (x.k === 'meSt' && !x.on && (x.s === 'empower' || x.if)) { const n = x.if === 'chill' ? x.n * kiIf : x.n; if (n > 0) { b.kiPend = (b.kiPend || 0) + n; logp(b, 'good', s.n + '. ' + (p.build === 'monk' ? '기' : KW_N[x.s]) + ' +' + n + (x.if ? ' (늦춘 적에게서)' : '')); } else if (x.if) logp(b, 'sys', '둔화된 대상이 없어 기를 얻지 못한다'); } // 강화는 이 행동이 기를 쓴 뒤(finishPlayer)에 든다 (10월 7일 공통 변경)
  { const stc = F('stance'); if (stc) monkStance(b, s, stc, hzOn === 'ctr' ? hz : null); } // 자세: 공격에 붙으면 피해 뒤에 선다
  { const kg = F('kiGrow'); if (kg) b.kiGrow = kg; }
  const gr = F('grow'), bu = F('burst'), exe = F('execute');
  for (const e of targets) {
    if (!e.alive || b.over) continue;
    if (gr && gr.s === 'bleed') { const n0 = stk(e, 'bleed'); const goal = Math.min(KW.bleed, Math.ceil(n0 * gr.mul) + (gr.add || 0)); if (goal > n0) addS(b, e, 'bleed', goal - n0); logp(b, 'good', e.n + '의 상처가 벌어진다. 출혈 ' + n0 + ' → ' + stk(e, 'bleed')); continue; } // 출혈 키우기 (숨겨진 직업 1)
    if (gr) { const n0 = st(e, 'poison'); const add = Math.round(n0 * (gr.mul - 1)) + (gr.add || 0); const got = addPoison(b, e, add, 1, capOver); logp(b, 'good', e.n + '의 독이 끓어오른다. 중독 ' + n0 + ' → ' + st(e, 'poison') + (got < add ? ' (상한)' : '')); }
    if (bu) {
      if (e.evading && !multi) { e.evading = 0; logp(b, 'sys', e.n + '이(가) 몸을 틀어 피한다. 독은 터지지 않고 남는다'); continue; } // 10월 7일: 몸 낮춘 적에게 터뜨리면 중독이 피해 없이 사라지던 것을 고침
      if (bu.pre) addPoison(b, e, bu.pre, 1, capOver); // 터뜨리기 전에 거는 중독 (독 격발: 이 갈래만으로도 돌게)
      const n = st(e, 'poison'); if (n <= 0) { logp(b, 'sys', e.n + '에게 터뜨릴 중독이 없다'); continue; }
      const take = bu.half ? Math.ceil(n / 2) : bu.top ? Math.min(bu.top, n) : n;
      const low = exe && e.hp <= e.hpMax * exe.hp; const mul = (low ? exe.mul : (bu.mul || 1)) * (gx && isBig(e) ? gx.mul : 1);
      const total = (poisonTotal(n) - poisonTotal(n - take)) * mul * dotMul(p);
      const left = (bu.top || bu.half) ? n - take : Math.floor(n * (bu.keep || 0));
      if (left > 0) e.s.poison.stacks = left; else delete e.s.poison;
      logp(b, 'crit', (low ? '숨통을 끊으러 든다. ' : '') + e.n + '의 독이 터진다. 중독 ' + take + (left ? ' (남은 중독 ' + left + ')' : ''));
      tot += hurtEnemy(b, e, outDmg(b, total, {}), { single: multi ? 0 : 1, aoe: multi ? 1 : 0, melee: s.tgt === 'melee' ? 1 : 0, label: s.n });
      if (!e.alive) { killed++; continue; }
      if (bu.brkPer) addBreak(b, e, take * bu.brkPer);
    }
  }
  if (CF) { if (cfPd && cfPd.spend && stk(p, 'protect') > 0) delete p.s.protect; if (cfCl && cfCl.after && !b.over) { const r = cfCleanse(b, cfCl, s.n, s.id); cfE += r.e; } b.cfOffer = null; } // 숨겨진 직업 2: 보호 쓰기, 친 뒤 정화
  if (eatF && p.hp > 0) { const v = eatHeal * healMul(p), cap = p.hpMax * BLOOD.eatCap; const g = Math.max(0, Math.min(v, cap, p.hpMax - p.hp)); p.hp += g; if (eatN > 0) logp(b, 'good', '먹은 중독 ' + eatN + '. 생명력 +' + r1(g) + (v > cap + 0.05 ? ' (한 번에 최대 생명력의 ' + Math.round(BLOOD.eatCap * 100) + '%까지)' : g + 0.05 < v ? ' (넘친 몫은 버린다)' : '')); b.rec.push({ k: 'eat', id: s.id, n: eatN, heal: r1(g), over: r1(Math.max(0, v - g)) }); } // 먹기 회복: 대상 고리가 끝난 뒤 한 번, 상한은 모든 배수 뒤
  if (wdLate) { const g = addWard(b, p, wd.n); logp(b, 'good', s.n + '. 태운 뒤 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')'); } // 태우고 얻는 칸(마검사 타고 남은 막): 보호막은 타격 뒤에
  if (BU && kills.length) { // 처치 보상 (숨겨진 직업 1): 🔄 · 빠른 칸 · 나에게 상태
    if (hz && hz.on === 'kill') hastenBranch(b, s.b, hz.n || 1, s.id);
    if (qk && qk.on === 'kill') { if (qk.next) { p.quickTurns = Math.max(p.quickTurns || 0, 1); logp(b, 'good', s.n + '. 다음 차례에 빠른 칸이 하나 더 생긴다'); } else { b.extraQuick = 1; logp(b, 'good', s.n + '. 이번 차례에 빠른 칸이 하나 더 생긴다'); } }
    if (meKill) { addS(b, p, meKill.s, meKill.n); logp(b, 'good', s.n + '. ' + (KW_N[meKill.s] || meKill.s) + ' ' + meKill.n); }
  }
  const krOk = s.killRecharge && (BU ? kills.length > 0 && (b.krTurn || 0) < BUTCH.krTurn : killed) && !(s.once && b.krOnce && b.krOnce[s.id]); // 같은 적 한 번(killPaid) · 한 차례 krTurn번 · 전투마다 1번 스킬은 한 번만 다시
  if (krOk) { if (BU) b.krTurn = (b.krTurn || 0) + 1; if (s.once) (b.krOnce = b.krOnce || {})[s.id] = 1; p.cd[s.id] = 0; logp(b, 'good', s.n + '을(를) ' + (s.once ? '한 번 더' : BU ? '다음 차례에 다시' : '기다리지 않고 바로 다시') + ' 쓸 수 있다'); }
  else { p.cd[s.id] = s.once ? CD_USED : s.cd; p.cdJust = [].concat(p.cdJust || [], s.id); }
  if (hzOn === 'use') hastenBranch(b, s.b, hz.n || 1, s.id); else if (hzOn === 'kill' && killed && !BU) hastenBranch(b, s.b, hz.n || 1, s.id); else if (hzOn === 'alt' && b.sbAlt) hastenBranch(b, s.b, hz.n || 1, s.id); else if (hzOn === 'clean' && CF && cfE > 0) hastenBranch(b, s.b, hz.n || 1, s.id); // 🔄 쓰면 다른 같은 갈래 스킬 쿨타임 −n // 이번 차례에 쓴 스킬은 모두 이번 차례가 끝날 때 줄지 않는다 (10월 3일: 빠른 스킬 다음에 스킬을 쓰면 빠른 스킬의 대기가 1 짧았다)
  p.lastSkillDmg = multi ? tot / Math.max(1, targets.length) : tot;
  if (p.build === 'hunter' && s.b !== '시작') p.lastBr = s.b; // 사냥꾼 연계: 쓴 갈래
  if (p.build === 'elementalist') b.shockCtx = { id: s.id, br: s.b, ids: targets.map(e => e.id), multi, sx: F('shockx') || null, hz: hzOn === 'shock' ? (hz.n || 1) : 0 }; // 원소술사: 이 행동 끝의 열충격에 붙일 것 (finishPlayer가 쓰고 지운다)
  b.curSkill = null; b.focusKey = null;
}
/* ===== 마검사 (10월 7일, docs/직업/마검사.md B절) =====
   행동 종류: ⚔ 베기(기본 공격 · 강공격 · kind 'cut' 스킬), ✦ 주문(kind 'spell' 스킬). 방어 · 흘리기 · 플라스크 · 소모품 · 달아나기 · 기절로 놓친 차례는 종류가 없고 순서를 바꾸지 않는다.
   교대: 종류가 직전 종류(p.sbLast)와 다르면. 교대면 행동이 끝난 뒤 보호막 +altWard(내 차례마다 한 번). 이어진 교대(p.sbRun)가 2 이상이면 run 2 보상이 켜지고, 켜지면 이어진 교대는 0(박자를 쓴다).
   칼(p.edge = { s, n }): 주문이 싣고, 다음 베기의 첫 타격이 고른 적에게 피해를 주고 그 적이 살아 있으면 건다. 빗나가거나 그 타격에 쓰러지면 칼에 남는다 */
function sbKindOf(p, id, act) { if (p.build !== 'spellblade') return null; if (id === 'basic' || id === 'heavy') return 'cut'; return act && act.v2 && act.s && act.s.kind || null; }
function sbBegin(b, id, act, tgt) {
  const p = b.p; const k = sbKindOf(p, id, act); b.sbK = k; b.sbAlt = false; b.sbRunNow = 0; b.sbRun2 = 0; b.sbAltFx = null; b.sbEdgeDone = 0; if (!k) return;
  b.sbAlt = !!p.sbLast && k !== p.sbLast; b.sbRunNow = b.sbAlt ? (p.sbRun || 0) + 1 : 0;
}
function sbEdgeApply(b, e, mul) {
  const p = b.p; const E = p.edge; if (!E || !e || !e.alive) return; const n = Math.min(KW[E.s] || 10, Math.round(E.n * (mul || 1)) + fxAdd(p, 'edgeAdd', b, p, E.s));
  const got = addS(b, e, E.s, n); p.edge = null; b.sbEdgeDone = 1; b.rec.push({ k: 'edge', s: E.s, n });
  logp(b, 'good', '칼에 실린 ' + KW_N[E.s] + ' ' + n + '이(가) ' + e.n + '에게 스민다' + (got < n ? ' (상한)' : ''));
}
function sbEdgeSee(o, e, d) { // 전열 베기: 고른 적이 맞으면 그 적, 빗나가면 처음 피해를 받은 적. 쓰러지면 칼에 남는다
  if (!o.st || o.apply) return;
  if (o.st === 'tgt' && e !== o.tgt) return;
  if (d > 0) { o.st = null; if (e.alive) o.apply = e; return; }
  if (o.st === 'tgt') o.st = 'any';
}
function sbEdgeHit(b, e, d) { if (b.sbK !== 'cut' || !b.p.edge || b.sbEdgeDone || !e) return; b.sbEdgeDone = 1; if (d > 0 && e.alive) sbEdgeApply(b, e, 1); } // 기본 공격 · 강공격의 첫 타격
function sbKillSpread(b, e, pre, ks) {
  const n = Math.min(KW.bleed, Math.ceil((pre || 0) * (ks.per || 1))); if (n <= 0) return; let k = 0;
  for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'bleed', n); k++; }
  if (k) logp(b, 'good', e.n + '의 피가 튄다. 다른 적 모두에게 출혈 ' + n);
}
function sbEnd(b, act) {
  const p = b.p; const k = b.sbK; if (!k) return; b.sbK = null;
  const af = b.sbAltFx; b.sbAltFx = null;
  if (af && !b.over) { const g = []; if (af.ward) g.push('보호막 +' + Math.round(addWard(b, p, af.ward))); if (af.protect) { addS(b, p, 'protect', af.protect); g.push('보호 ' + af.protect); } if (af.stam) { p.st = Math.min(p.stMax, p.st + af.stam); if (p.exhaust && p.st >= 30) p.exhaust = 0; g.push('스태미나 +' + af.stam); } if (g.length) logp(b, 'good', (af.run === 2 ? '⇄⇄ 이어진 교대: ' : '⇄ 교대: ') + g.join(', ')); }
  if (k === 'spell' && act && act.v2) { const im = act.s.fx.find(e => e.k === 'imbue'); if (im) { if (p.edge && p.edge.s === im.s) p.edge.n = Math.max(p.edge.n, im.n); else p.edge = { s: im.s, n: im.n }; logp(b, 'good', '칼에 ' + KW_N[im.s] + ' ' + p.edge.n + '을(를) 싣는다'); } }
  if (b.sbAlt && b.sbAltTurn !== b.turnIdx && !b.over) { b.sbAltTurn = b.turnIdx; const g = addWard(b, p, (BUILDS[p.build] || {}).altWard || 0); b.rec.push({ k: 'alt', g: r1(g) }); logp(b, 'good', '⇄ 교대: 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward || 0) + '/' + wardMax(p) + ')'); fxRun(p, 'onAlt', b, p, k, b.sbRunNow); }
  p.sbLast = k; p.sbRun = b.sbRun2 ? 0 : b.sbRunNow; b.sbAlt = false; b.sbRun2 = 0;
}
/* 수도승 자세 (stance, 10월 10일 단순화): 자세는 하나뿐이다. 내 다음 차례까지 전열 적의 직접 공격을 되받는다(받는 피해는 줄지 않는다. 줄이려면 방어). 덤은 겹치면 칸마다 큰 값.
   내 다음 차례의 첫 행동에서 지워진다. 옛 저장본의 half · max는 읽지 않는다 */
function monkStance(b, s, x, hz) {
  const p = b.p;
  const o = p.stance || {}; const mx = k => Math.max(o[k] || 0, x[k] || 0);
  p.stance = { dmg: mx('dmg'), brk: mx('brk'), ki: mx('ki'), chill: mx('chill'), weak: mx('weak'), far: o.far || x.far ? 1 : 0, hz: hz ? { n: hz.n || 1, br: s.b, id: s.id, used: 0 } : (o.hz || null) };
  logp(b, 'good', s.n + '. 내 다음 차례까지 ' + (p.stance.far ? '전열과 후열' : '전열') + ' 적의 직접 공격을 되받는다');
}
function allSkillNames() { const m = allSkills(); for (const k in EXCL) for (const s of exclOf(k)) m[s.id] = s; return m; }
function isMeleeAct(p, id) { if ((rngCls(p) || isCaster(p)) && (id === 'basic' || id === 'heavy')) return false; if (id === 'basic' || id === 'heavy') return true; const s = skillMap(p.build)[id]; return !!(s && s.melee); }
/* 데이터로 적은 스킬 하나를 처리한다 */
function genSkill(b, act, tgt) {
  const p = b.p; const fx = act.fx || {};
  payMana(b, act.mana);
  let cost = 0;
  if (act.hpCost) { cost = p.hpMax * act.hpCost * hpCostMul(p); p.hp -= cost; logp(b, 'bad', act.n + '의 값으로 생명력 ' + r1(cost)); if (p.hp <= 0) { checkEnd(b); return; } }
  let targets = act.type === 'aoe' ? alive(b).slice() : act.type === 'front' ? alive(b).filter(e => e.row === 'front') : act.type === 'self' ? [] : (tgt ? [tgt] : []);
  if (fx.harvest) { targets = targets.filter(e => e.s.weak || e.s.plague); if (!targets.length) logp(b, 'sys', '거둘 혼이 없다. 약화나 역병에 걸린 적이 없다'); }
  let spent = 0; if (fx.wardSpend) { spent = (p.ward || 0) * fx.wardSpend; p.ward = Math.max(0, (p.ward || 0) - spent); if (spent > 0) logp(b, 'good', '보호막 ' + r1(spent) + '을(를) 태운다'); else logp(b, 'sys', '태울 보호막이 없다'); }
  if (fx.brace) { p.brace = 1; logp(b, 'good', '살갗이 쇠처럼 굳는다. 다음 행동까지 받는 피해 −35%'); }
  let tot = 0; const scarUse = fx.scarAll ? p.scar : 0;
  for (const e of targets) {
    const many = act.type === 'aoe' || act.type === 'front' || act.aoe; const sn = n => many ? aoeN(n) : n; // 여럿에게 거는 상태이상은 절반
    if (fx.plague) addS(b, e, 'plague', sn(fx.plague)); // 저주로 쓰러뜨려도 역병이 옮도록 피해보다 먼저
    let base = act.dmg || 0;
    if (fx.poisonBonus && e.s.poison) base += e.s.poison.stacks;
    if (fx.weakDouble && e.s.weak) base *= 2;
    if (fx.scarAll) base = scarUse * fx.scarAll;
    if (fx.wardSpend) base += spent * fx.wardMul;
    if (fx.grudge) base += (p.tookLast || 0) * fx.grudge;
    if (fx.execute && e.hp <= e.hpMax * fx.execute) { base *= fx.execMul; logp(b, 'crit', e.n + '의 숨통을 끊으러 든다'); }
    if (fx.radiance && e.s.smite) { base *= 2; delete e.s.smite; }
    let dealt = 0;
    if (base > 0) dealt = hurtEnemy(b, e, outDmg(b, base, {}), { single: act.type === 'melee' || act.type === 'ranged' ? 1 : 0, aoe: act.aoe ? 1 : 0, melee: act.melee ? 1 : 0, fire: fx.ignite ? 1 : 0, label: act.n }); tot += dealt;
    if (fx.harvest && dealt > 0) { const hl = p.hpMax * fx.harvest * healMul(p); p.hp = Math.min(p.hpMax, p.hp + hl); smiteHeal(b, hl); }
    if (fx.transfuse && dealt > 0 && e.s.bond) { const hl = dealt * fx.transfuse * healMul(p); p.hp = Math.min(p.hpMax, p.hp + hl); logp(b, 'good', '이어진 피를 거두어 생명력 +' + r1(hl)); }
    if (!e.alive) continue;
    if (fx.poison) addPoison(b, e, sn(fx.poison), 1);
    if (fx.ignite) addS(b, e, 'ignite', sn(3));
    if (fx.chill) addS(b, e, 'chill', sn(2), fx.chill, 5);
    if (fx.weak) addS(b, e, 'weak', sn(2));
    if (fx.vuln) addS(b, e, 'vuln', sn(2));
    if (fx.brk) addBreak(b, e, fx.brk);
    if (fx.trap) { e.s.trap = { stacks: outDmg(b, fx.trap, {}), brk: fx.trapBrk || 0, until: b.t + 4, dur: 4, aoe: act.aoe ? 1 : 0 }; } // 여럿에게 놓은 덫은 터질 때 광역 피해(방패벽이 줄인다)
    if (fx.rift) { e.s.rift = { stacks: outDmg(b, fx.rift, {}), brk: fx.riftBrk || 0, until: b.t + 2, dur: 2 }; }
    if (fx.echo) { e.s.echo = { stacks: outDmg(b, act.dmg, {}), until: b.t + 1.5, dur: 1.5 }; }
    if (fx.bleed) addS(b, e, 'bleed', sn(fx.bleed));
    if (fx.smite) addS(b, e, 'smite', sn(fx.smite));
    if (fx.bond) addS(b, e, 'bond', sn(fx.bond));
  }
  if (fx.scarAll) { p.scar = 0; if (scarUse < 1) logp(b, 'sys', '태울 상흔이 없다'); }
  if (fx.allWeak) { for (const e of alive(b)) addS(b, e, 'weak', aoeN(2)); logp(b, 'good', '포효에 적들이 움츠러든다. 모두 약화'); }
  if (fx.rage) addRage(b, fx.rage);
  if (fx.ward) { addWard(b, p, fx.ward); logp(b, 'good', '보호막 ' + Math.round(p.ward)); }
  if (fx.protect) addS(b, p, 'protect', 3);
  if (fx.healPct) { const hl = p.hpMax * fx.healPct * healMul(p); p.hp = Math.min(p.hpMax, p.hp + hl); logp(b, 'good', act.n + '. 생명력 +' + r1(hl)); smiteHeal(b, hl); }
  if (fx.lifesteal && tot > 0) { p.hp = Math.min(p.hpMax, p.hp + tot * fx.lifesteal * healMul(p)); logp(b, 'good', '빼앗은 기운으로 생명력 +' + r1(tot * fx.lifesteal)); }
  if (fx.cleanseOne) { for (const k of ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln', 'brand']) if (p.s[k]) { cleanse(b, [k], false); break; } }
  if (fx.cleanseAll) { const n = cleanse(b, ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln', 'brand'], false); if (n && fx.wardPer) { addWard(b, p, n * fx.wardPer); logp(b, 'good', '속죄의 빛이 막이 된다. 보호막 ' + Math.round(p.ward)); } }
  if (fx.scarFromCost && cost > 0) { p.scar = Math.min(p.hpMax * 0.5, p.scar + cost * fx.scarFromCost); logp(b, 'good', '흘린 피가 상흔이 된다. 상흔 ' + Math.round(p.scar)); }
  if (fx.suture) { const hl = p.scar; p.scar = 0; p.hp = Math.min(p.hpMax, p.hp + hl); logp(b, 'good', '상흔을 꿰매 생명력 +' + r1(hl)); }
  p.lastSkillDmg = act.aoe ? tot / Math.max(1, targets.length) : tot;
  if (targets[0]) applyReflux(b, targets[0]);
}
function allSkills() { const m = {}; for (const k in BUILDS) for (const s of BUILDS[k].skills) m[s.id] = Object.assign({ home: k }, s); return m; }
function skillsOf(p) { return p.skills && p.skills.length ? p.skills : DEFAULT_SKILLS[p.build]; }
function scarRate(p) { const r = p.build === 'scar' ? 0.2 : (skillsOf(p).some(id => id === 'scarcut' || id === 'release') ? 0.10 : 0); return r > 0 && hasIt(p, 'scarcharm') ? Math.max(0.05, r - 0.05) : r; }
const REV_DMG = 8;
const PSN = { viper: 6, viperN: 3, cloudN: 3, brk: 4, swampN: 2 };
const POISON_FOREVER = 1e9; // 중독은 시간 제한이 아니라 수치로 끝난다
/* 중독 걸기: 1씩 오른다(상한 없음). n번 건다 = +n */
/* 0.6a.2: 상한 20(capOver를 주는 스킬만 넘긴다). 막음에 막힌다. 내가 적에게 걸면 갈래 규칙 "독을 걸면" */
function addPoison(b, u, n, byMe, capOver) {
  if (!(n > 0)) return 0;
  if (u.role === 'crown' || (u.hazeHit && b.cur && u.hazeHit === b.actN)) return 0; // 3챕터: 왕관, 허상에 막힌 공격
  if (u === b.p && u.eq) { const pa = fxAdd(u, 'psnIn', b, u, n); if (pa) n = Math.max(1, n + pa); } /* 2챕터 장비 */
  if (byMe && b.carve && b.cur && b.cur.grp && u !== b.p && carveMul(b, b.cur.grp) < 1) n = Math.max(1, Math.floor(n * carveMul(b, b.cur.grp)));
  if (u === b.p && u.eq && u.eq.amulet === 'sigil') u.mp = Math.min(u.mpMax, u.mp + 4);
  if (byMe && b.p.build === 'assassin' && !isV2(b.p)) n += 1;
  if (kwBlocked(b, u, 'poison')) return 0;
  const cur = st(u, 'poison'); const nv = Math.min(Math.max(KW.poison, capOver || 0, cur), cur + n);
  if (nv > cur) u.s.poison = { stacks: nv, until: POISON_FOREVER, dur: POISON_FOREVER };
  if (byMe && u !== b.p && nv > cur) chargeEv(b, 'poison');
  return nv - cur;
}
/* 남은 독 피해 총합: n + (n-1) + ... + 1 */
function poisonTotal(n) { return n * (n + 1) / 2; }

/* ---- 6.8 빌드를 바꾸는 아이템 (B0: 막힘 해결용 3 + 자발 시험용 3) ---- */
const hasIt = (p, k) => Object.values(p.eq || {}).includes(k);
function itemFits(p, k) {
  if (ITEMS[k] && ITEMS[k].fits && !ITEMS[k].fits.includes(p.build)) return false;
  const sk = skillsOf(p);
  if (k === 'knot') return sk.some(id => ['burst', 'release', 'scarburst'].includes(id));
  if (k === 'scarcharm') return scarRate(p) > 0;
  if (k === 'vpouch') return p.build === 'assassin' || sk.some(id => ['viper', 'cloud', 'dagger', 'smoke', 'burst'].includes(id)) || hasIt(p, 'venomring');
  if (k === 'resostone') return sk.length >= 2;
  const SKM = skillMap(p.build);
  if (k === 'chaingl') return sk.some(id => SKM[id] && SKM[id].melee);
  if (k === 'bloodoil') return p.build === 'warlock' || p.build === 'bloodmage' || hasIt(p, 'ledger') || sk.some(id => SKM[id] && SKM[id].hpCost);
  if (['hereticstaff', 'brokencenser', 'abysseye', 'singedgloves', 'conductor'].includes(k)) return sk.some(id => SKM[id] && SKM[id].aoe && (SKM[id].dmg || 0) > 0 || ['fireball', 'release'].includes(id));
  if (k === 'wardcrest') return p.build === 'templar' || p.build === 'arcanist' || sk.some(id => ['barrier', 'aura', 'atone'].includes(id));
  return true;
}

function classFit(p, k) { const ws = CLASS_FIT[p.build] || []; const a = (ITEMS[k] && ITEMS[k].act) || ''; if (ITEMS[k] && ITEMS[k].t) return itemFits(p, k) && tagFit(p.build, ITEMS[k].t); return itemFits(p, k) && ws.some(w => a.includes(w)); }
/* 2챕터 장비는 문장의 낱말 대신 갈래 표(t)로 직업에 맞는지 본다 */
function tagFit(build, t) { const br = ((typeof TREE2 !== 'undefined' && TREE2[build]) || {}).branches || []; return String(t).split(' ').map(x => x.replace(/_/g, ' ')).some(x => br.includes(x) || x === build); } /* 갈래 이름의 빈칸은 _로 적는다(전열_장악) */

/* ---- 방 구성 (10.2 방 표) ---- */

/* ---- 고정 상황 5개 (10.2 검증 질문 1) ---- */

