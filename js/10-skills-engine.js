
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
  let r = red != null ? red - asParryCut(p) + uqV(p, 'u_parryRed', 0, (a, v) => a + v) : parryRed(p); /* M6-1 접사 parryRed: 흘리기 스킬에도 */ const o = Object.assign({}, on || {});
  if (p.build === 'assassin') { if (red != null) o.sk = 1; if (p.hp <= p.hpMax * 0.5) r += asSum(p, 'parryLow'); } // 10월 18일 0.8.0 5단계 암살자: 독의 군주의 대가(스킬 흘리기도 −15%p) · 흘리기 스킬 표시(그림자 맹세) · 얇은 그림자(생명력 50% 이하 +5%p, 상한 90%)
  if (p.pbuf) { r += p.pbuf.red; if (p.pbuf.dmg) o.dmg = (o.dmg || 0) + p.pbuf.dmg; if (p.pbuf.poison) o.poison = (o.poison || 0) + p.pbuf.poison; if (p.pbuf.hasten) { o.hasten = (o.hasten || 0) + p.pbuf.hasten; o.hb = p.pbuf.hb; } p.pbuf.n--; if (p.pbuf.n <= 0) p.pbuf = null; }
  if (red != null && uqF(p, 'u_cloak')) r += 0.15; /* M6-1 고유 cm_cloak: 스킬 흘리기도 +15%p(상한 90%) */
  p.dodgeRed = Math.min(0.9, r); p.dodgeOn = (o.dmg || o.poison || o.brk || o.hasten || o.bleed || o.basic) ? o : null; // M5-3: basic = 흘려 베기의 기본 공격 반격
}
/* 0.6a.2 스킬 실행: data/skills.js의 한 줄(fx 목록)을 그대로 처리한다. 설명 문장(skBody)도 같은 줄에서 나온다 */
function runSkill2(b, act, tgt) {
  const p = b.p; const s = act.s; if (!p.cd) resetCharges(p); const F = k => s.fx.find(e => e.k === k);
  const wardBeforeSkill = p.ward || 0;
  b.curSkill = s.id;
  const CF = /^c_/.test(String(s.id)); const cfBefore = CF ? Math.min(CONF.cap, b.cleanTurn || 0) : 0; let cfE = 0; if (CF) b.cfOffer = null; // 숨겨진 직업 2: 앞서 이번 차례에 지우거나 바친 숫자 (이 스킬 몫은 넣지 않는다)
  const BM = isBm(p) && /^v_/.test(String(s.id)); // 숨겨진 직업 3: 생명력 내기는 다른 효과보다 먼저, 값 깎기는 전투 동안 남는다
  if (BM) { const hc = bmHpCost(p, s); if (hc > 0) bmPay(b, hc, s, 'hp');
    for (const pc of s.fx.filter(e => e.k === 'payCut')) { p.payCut = p.payCut || []; let k = 0; for (let i = 0; i < (pc.n || 1) && p.payCut.length < BLOOD.payCutMax; i++) { p.payCut.push(pc.off != null ? { off: pc.off } : { mul: pc.mul }); k++; } logp(b, 'good', k ? s.n + '. 다음 피로 당기기 ' + k + '번은 ' + (pc.off != null ? '모자란 유산 ' + pc.off + ' 몫까지 생명력이 들지 않는다' : '값이 절반이다') : s.n + '. 값 깎기는 ' + BLOOD.payCutMax + '개까지만 쌓인다'); } }
  const BU = /^b_/.test(String(s.id)); // 숨겨진 직업 1의 넓힌 효과 (출혈 먹기 · 받은 피해 · 처치 보상 등). 다른 직업의 스킬은 이 길을 지나지 않는다
  const capOver = (F('capOver') || {}).cap || 0;
  let targets = s.tgt === 'front' ? alive(b).filter(e => e.row === 'front' && e.role !== 'root') : s.tgt === 'all' ? alive(b).filter(e => e.role !== 'root') : s.tgt === 'self' ? [] : (tgt ? [tgt] : []);
  if (s.id === 'f_chainblade' && tgt && tgt.row === 'back' && uqF(p, 'u_chain2')) { const t2 = alive(b).find(e => e !== tgt && e.row === 'back' && e.role !== 'root' && !e.under); if (t2) targets = [tgt, t2]; } /* M6-1 고유 wd_h6 갈고리 사슬검: 후열 적 둘을 친다 */
  const sbOrd = p.build === 'spellblade'; const sbE = sbOrd && s.kind === 'cut' && p.edge ? { st: tgt && targets.includes(tgt) ? 'tgt' : 'any', tgt, apply: null } : null; if (sbE && sbE.st === 'tgt' && targets.length > 1) targets = [tgt].concat(targets.filter(x => x !== tgt)); // 마검사 칼에 싣기: 고른 적부터 친다(전열 베기도 고른 적 하나에게 건다)
  const altF = sbAltMerge(s, b); const altOn = !!altF; /* 10월 16일 0.8.0 2단계: 강화가 더한 교대 보상(alt)은 맞는 것끼리 합친다 */ if (altOn && altF.run === 2) b.sbRun2 = 1; b.sbAltFx = altOn ? altF : null; const altBrk = altOn && altF.brk ? altF.brk : 0; let altBrkLog = 0; // 마검사 교대 보상: 붕괴는 타격 뒤, 나머지는 행동 뒤(sbEnd)
  const hz = F('hasten'); const hzOn = hz ? (hz.on || 'use') : null; // 🔄 쿨타임 당기기 (10월 3일 만든 사람 결정 D: 갈래 규칙 대신 스킬에만 적는다)
  const par = F('parry'); if (par && tgt) { setParry(b, tgt, par.red, Object.assign({}, F('onParry') || {}, hzOn === 'parry' ? { hasten: hz.n || 1, hb: s.b } : {}, F('asCounter') ? { basic: F('asCounter').mul || 1 } : {})); logp(b, 'sys', tgt.n + '의 다음 공격을 흘릴 준비를 한다'); } // M5-3 흘려 베기: 흘려 내면 기본 공격으로 반격(on.basic)
  const sm = F('stam'); if (sm) { p.st = Math.min(p.stMax, p.st + sm.n); if (p.exhaust && p.st >= 30) p.exhaust = 0; }
  if (p.build === 'warden') wdUse(b, s, targets, tgt, 'pre'); // 0.8.0 M5-1 파수꾼 태세 · 승부수 · 결합 칸
  if (p.build === 'monk' && s.mk5) mkUse(b, s); // 0.8.0 M5-2 수도승 강화 · 승부수 · 결합 칸
  if (p.build === 'assassin' && s.as5) asUse(b, s, targets, tgt);
  if (p.build === 'elementalist' && s.el5) elUse(b, s, targets, tgt); // 0.8.0 M5-5 원소술사 원소 전환 · 강화 · 승부수 · 결합 칸
  if (p.build === 'hunter' && s.hn5) hnUse(b, s, targets, tgt); // 0.8.0 M5-4 사냥꾼 강화 · 승부수 · 결합 칸 // 0.8.0 M5-3 암살자 강화 · 승부수 · 결합 칸(만독개화는 여기서 독을 모은다)
  if (p.build === 'spellblade') { sbBoundUse(b, s); if (F('searMerge')) for (const e of targets) if (e.alive && stk(e, 'bleed') > 0 && stk(e, 'ignite') > 0) sbSear(b, e, 0); if (F('sbCross')) for (const e of targets) sbCross(b, e); if (F('sbEmberCut') && targets[0]) sbEmberCut(b, targets[0]); if (F('searBurst')) for (const e of targets) sbSearBurst(b, e, F('searBurst').mul || 2); } // 0.8.0 M5-0 마검사 경계 행동, 혈염은 베기 전에 걸려 있던 출혈 · 화상을 합친다
  if (s.tgt === 'self') for (const x of s.fx) if (x.k === 'st') { addS(b, p, x.s, x.n); logp(b, 'good', s.n + '. ' + (x.s === 'empower' && p.build === 'monk' ? '기' : KW_N[x.s] || x.s) + ' ' + x.n); } // 나에게 거는 상태
  for (const x of s.fx) if (x.k === 'meSt' && !x.on && !(p.build === 'monk' && (x.s === 'empower' || x.if))) { if (CF && CONF.kinds.includes(x.s)) { (p.selfBad = p.selfBad || []).push({ s: x.s, n: x.n }); continue; } /* 숨겨진 직업 2: 고행은 행동이 끝난 뒤 (cfSelfApply) */ if (BU && x.s === 'bleed') { b.selfSt = 1; const g = addS(b, p, 'bleed', x.n) || 0; b.selfSt = 0; p.selfBl = Math.min(stk(p, 'bleed'), (p.selfBl || 0) + g); logp(b, 'bad', s.n + '. 나에게 출혈 ' + x.n); b.rec.push({ k: 'bu', w: 'selfBleed', n: g }); continue; } addS(b, p, x.s, x.n); logp(b, 'good', s.n + '. ' + (KW_N[x.s] || x.s) + ' ' + x.n); } // 공격 스킬에 붙은 나에게 거는 상태 (on: 'kill'은 쓰러뜨린 뒤. 수도승의 강화(기)와 if는 피해 뒤 b.kiPend로)
  let meDrainDmg = 0; { const md = BU && s.fx.find(e => e.k === 'drain' && e.s === 'bleed' && e.me); if (md) { const n = stk(p, 'bleed'); delete p.s.bleed; p.selfBl = 0; const em = md.emp ? Math.min(4, n * md.emp) : 0; if (em > 0) addS(b, p, 'empower', em); if (md.dmg) meDrainDmg = Math.min(md.max || 10, n) * md.dmg; logp(b, n > 0 ? 'good' : 'sys', n > 0 ? s.n + '. 내 출혈 ' + n + '을(를) 거둔다' + (em ? '. 강화 ' + em : '') + (meDrainDmg ? '. 피해 +' + meDrainDmg : '') : s.n + '. 거둘 내 출혈이 없다'); b.rec.push({ k: 'bu', w: 'meDrain', n }); } } // 내 출혈 지우기 (피를 바치는 일격 · 마지막 숨)
  const ev = F('evade'); if (ev) { p.evade = Math.min(hnEvCap(p), (p.evade || 0) + ev.n); /* M6-1 고유 hn_r2 */ logp(b, 'good', s.n + '. 다음에 맞는 공격 ' + p.evade + '번을 피한다'); } // 사냥꾼: 몸 빼기
  const ec = F('evadeCtr'); if (ec) p.evadeCtr = { dmg: ec.dmg, chill: ec.chill || 0, focus: ec.focus || 0, charged: ec.charged || 0, until: ec.rounds ? (b.round || 0) + ec.rounds : 0 }; // 피했을 때 반격
  if (hzOn === 'evade') p.evadeHz = { n: hz.n || 1, br: s.b, id: s.id }; // 🔄 피할 때마다 쿨타임 당기기
  const qk = F('quick'); if (qk && !qk.on) { b.extraQuick = 1; logp(b, 'good', s.n + '. 이번 차례에 빠른 칸이 하나 더 생긴다'); }
  const qt = F('quickTurns'); if (qt) { b.extraQuick = 1; p.quickTurns = qt.n - 1; logp(b, 'good', s.n + '. 내 차례 ' + qt.n + '번 동안 빠른 칸이 하나 더 생긴다'); }
  const fs = F('foresee'); if (fs) { p.foresee = { red: fs.red, until: (b.round || 0) + fs.rounds }; logp(b, 'good', s.n + '. ' + fs.rounds + '라운드 동안 강타 · 겨눈 한 발 · 화형의 피해 −' + Math.round(fs.red * 100) + '%'); }
  const wd = F('ward'); const wdLate = !!(wd && F('wardBurn')); if (wd && !wdLate) { const g = addWard(b, p, wd.n + (wd.wil ? wd.wil * stat(p, 'wil') : 0)); logp(b, 'good', s.n + '. 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')'); } // 파수꾼: 보호막 얻기
  const wf = F('wardFill'); if (wf) { const goal = Math.round(wardMax(p) * (wf.to || 1)); const g = addWard(b, p, Math.max(0, goal - (p.ward || 0)), goal, true); logp(b, g > 0 ? 'good' : 'sys', s.n + (g > 0 ? '. 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')' : '. 보호막이 이미 그만큼 있다')); } // 비율 채우기는 목표값까지. 생성 보정으로 초과하거나 기존 보호막을 줄이지 않는다.
  const rm = F('rime'); if (rm) { const k = rm.s || 'chill'; p.rime = p.rime || {}; const c0 = p.rime[k]; p.rime[k] = { n: Math.max(c0 ? c0.n : 0, rm.n), times: Math.min(ELEM.rimeMax, (c0 ? c0.times : 0) + rm.times) }; logp(b, 'good', s.n + '. 다음 ' + p.rime[k].times + '번, 나를 친 적에게 ' + KW_N[k] + ' ' + p.rime[k].n); } // 원소술사 되얼림 · 불꽃 외투: 이미 있으면 횟수를 더한다(최대 8번), 수치는 큰 쪽
  const th = F('thorn'); if (th && th.bleed) { const n0 = p.thorn ? p.thorn.n : 0; p.thorn = { n: Math.min(WARD.thornMax, n0 + th.times), dmg: Math.max(p.thorn ? p.thorn.dmg : 0, th.dmg || 0), bleed: Math.max(p.thorn ? p.thorn.bleed || 0 : 0, th.bleed) }; logp(b, 'good', s.n + '. 맞으면 때린 적에게 출혈 ' + p.thorn.bleed + ' · ' + p.thorn.n + '번'); } // 맞을 때 출혈 (숨겨진 직업 1)
  else if (th) { const n0 = p.thorn ? p.thorn.n : 0; p.thorn = { n: Math.min(WARD.thornMax, n0 + th.times), dmg: Math.max(p.thorn ? p.thorn.dmg : 0, th.dmg) }; logp(b, 'good', s.n + '. 가시 ' + p.thorn.n + '번(맞을 때마다 피해 ' + p.thorn.dmg + ')'); } // 가시: 이미 있으면 횟수를 더한다(최대 8), 피해는 큰 쪽 (10월 4일)
  const pb = F('parryBuff'); if (pb) { p.pbuf = { n: pb.times || 1, red: pb.red || 0, stam: pb.stam || 0, dmg: pb.dmg || 0, poison: pb.poison || 0, hasten: hzOn === 'parry' ? (hz.n || 1) : 0, hb: s.b }; logp(b, 'good', '칼끝을 겨눈다. 다음 흘리기 ' + p.pbuf.n + '번이 날카로워진다'); }
  const hnX = p.build === 'hunter' && (F('hnVolley') || (s.hits || 1) > 1) ? uqV(p, 'u_shot1', 0, (a, v) => a + v) : 0; /* M6-1 고유 hn_h3: 여러 발 쏘는 스킬이 한 발 더 */
  if (p.build === 'hunter' && F('hnVolley') && tgt) targets = hnVolleySeq(b, tgt, (s.hits || 3) + hnX); // M5-4 연속 사격: 발마다 다른 적
  const multi = s.tgt === 'front' || s.tgt === 'all'; const khF = F('kiHits'); const hits = F('hnVolley') ? 1 : (s.hits || 1) + hnX + (khF && p.build === 'monk' ? Math.min(khF.max || 5, Math.floor(st(p, 'empower') * (khF.per || 1))) : 0); let tot = 0, killed = 0; // M5-2 연환권: 기 1마다 1타 추가(기는 쓰지 않는다)
  const wv = F('weave'), bo = F('burnOut'); const preI = {}; if (bo) for (const e of targets) preI[e.id] = st(e, 'ignite'); // 원소술사: 엮기, 불태우기(첫 타격 전의 화상)
  const boPer = bo ? bo.per + (fxFlag(p, 'elBurnPer') ? 1 : 0) : 0; if (bo) b.elBurnPre = preI; // 10월 18일 0.8.0 5단계: 잿불의 길(태운 화상 1마다 +1 더) · 거센 불길(b.elBurnPre: 태운 화상 수)
  const wfst = F('wardFirst'); if (wfst) { const g = addWard(b, p, wfst.n); if (wfst.protect) addS(b, p, 'protect', wfst.protect); logp(b, 'good', s.n + '. 먼저 두른 갑주: 보호막 +' + Math.round(g) + (wfst.protect ? ', 보호 ' + wfst.protect : '')); } // 10월 17일 보완 5: 갑주 해방은 두르고 나서 태운다
  const wb = F('wardBurn'); let burn = 0; if (wb) { burn = Math.min(p.ward || 0, wb.max || Infinity); p.ward = (p.ward || 0) - burn; b.burnLast = burn; logp(b, burn > 0 ? 'good' : 'sys', burn > 0 ? '보호막 ' + Math.round(burn) + '을(를) 태운다' : '태울 보호막이 없다'); } const wbMul = wb ? wb.mul + uqV(p, 'u_burnMul', 0, (a, v) => a + v) : 0; /* M6-1 고유 wd_h7 공성의 인장: 배율 +0.5 */ // 파수꾼: 태운 만큼 × 배수 피해
  const wdm = F('wardDmg'), vp = F('vulnPer'), shx = F('shieldx'), pl = F('pull'), vg = F('vulnGrow'), chx = F('chillx'); const wardNow = wdm && wdm.spend ? wardBeforeSkill : p.ward || 0;
  if (wdm && wdm.drainAll) b.sbWardSpentAll = true;
  const wdmC = wdm && wdm.cap != null ? uqV(p, 'u_wardDmgCap', 1, (a, v) => a * v) : 1, wdmA = wdm && wdm.cap != null ? uqV(p, 'u_wardDmgCapAdd', 0, (a, v) => a + v) : 0; /* M6-1 고유 sb_h5: 보호막 비례 피해의 상한 ×2 · wd_h2 모루 방패: 상한 +10 */
  const wardHit = wdm ? wardDamageInfo(wdmC !== 1 || wdmA ? Object.assign({}, wdm, { cap: (wdm.cap + wdmA) * wdmC }) : wdm, wardNow) : { take: 0, bonus: 0 };
  if (wardHit.take > 0 && targets.length) { p.ward = Math.max(0, (p.ward || 0) - wardHit.take); logp(b, 'sys', '보호막 ' + r1(wardHit.take) + ' 소모. 추가 피해 +' + r1(wardHit.bonus)); b.rec.push({ k: 'wardSpend', id: s.id, n: r1(wardHit.take), bonus: r1(wardHit.bonus) }); }
  const dm = F('dmg'), ex = F('exploit'), po = F('poison'), bk = F('brk'), bp = F('brkPer'); const stx = s.tgt === 'self' ? [] : s.fx.filter(e => e.k === 'st'); const lx = F('lowx'), bx = F('brokenx'), sp = F('spread'), cx = F('cutx'), dr = F('drain'), gx = F('bigx'); const isBig = e => !!(e.elite || e.strong || e.role === 'boss');
  const lnk = linkOn(b, act); if (lnk) { logp(b, 'good', '🔗 연계 (' + p.lastBr + ' → ' + hnBr(s) + ')' + (b.hnLinkFast ? ': 빠른 행동(차례가 이어진다)' : '')); b.hnLinkA = b.actN; } /* M5-4: 연계는 피해 +30% 대신 빠른 행동(js/32 hnLinkFastOk) */ const solo = !lnk && soloOn(b, act); if (solo) logp(b, 'good', '⇉ 외길 (' + hnBr(s) + ' → ' + hnBr(s) + '): 피해 +' + Math.round(HN.solo * 100) + '%'); // 0.8.0 5단계 사냥꾼: 시작 스킬 태그(lb) · 이어 쏘기 숙련 · 외길 사냥꾼 · 끝맺는 연계(b.hnLinkA)
  const ccut = F('chillCut'), csh = F('chillShatter'), csp = F('chillSpread'), frz = F('freeze'), ocb = F('onCutBreak'); const big = e => !!(e.strong || e.role === 'boss'); // 사냥꾼 기동 오른쪽 (10월 5일)
  const preCh = {}, preStop = {}, preBrk = {}; for (const e of targets) { preCh[e.id] = st(e, 'chill'); preStop[e.id] = isStopTarget(e); preBrk[e.id] = !!e.s.broken; }
  const kwxF = F('kwx'), ksp = F('killSpread'), edx = F('edgeX'); const preKw = {}; for (const e of targets) preKw[e.id] = { bleed: st(e, 'bleed'), ignite: st(e, 'ignite'), chill: st(e, 'chill'), sear: st(e, 'sear') }; const ssp = F('searSpread'); // 마검사: 쓰기 직전 기록 (kwx · exploit의 s · killSpread)
  const sld = F('slide'); const kb = F('kiBurst'), kpr = F('kiPer'), slx = F('sealx'); const kiNow = st(p, 'empower'); const meIf = s.fx.some(x => x.k === 'meSt' && (x.if === 'chill' || x.if === 'chillweak')); let kiTake = 0, kiBack = 0, kiHit = !kb, kiIf = 0, kiIfCW = 0, kiHitN = 0, kiEff = 0; const mcb = F('mkChillBurst'), mij = F('mkIlji'), mcp = F('mkCtrPer'), mdc = F('mkDrainChill'); // 수도승 (10월 7일): 기 터뜨리기 · 기 비례 · 지원 끊기
  if (kb) { let got = 0; const t0 = targets[0]; if (kb.pre && t0 && preCh[t0.id] > 0) got = addS(b, p, 'empower', kb.pre) || 0; const K0 = st(p, 'empower'); kiTake = Math.min(kb.max || kiCapOf(p), K0); if (kiTake > 0) b.kiTookA = b.actN; kiBack = K0 - got; setKi(p, kb.keep ? Math.floor(K0 * kb.keep) : K0 - kiTake); logp(b, kiTake > 0 ? 'good' : 'sys', kiTake > 0 ? (got ? '늦춘 적에게서 기 +' + got + '. ' : '') + '기 ' + kiTake + ' 터뜨림' + (st(p, 'empower') ? ' (남은 기 ' + st(p, 'empower') + ')' : '') : '터뜨릴 기가 없다'); kiEff = kiTake; if (p.mkSt && p.mkSt.condense) { kiEff = kiTake + p.mkSt.condense; p.mkSt.condense = 0; logp(b, 'good', '기공 응축: 쏟는 기 ' + kiTake + ' → ' + kiEff); } } // M5-2 기공 응축: 쏟는 기 +3(기가 없어도) // 피해 앞에서 거둔다(pre: 대상이 이미 둔화면 먼저 기)
  const hsp = F('hasteSpend'); let hspOn = false; if (hsp && st(p, 'haste') > 0 && targets.length) { kwDec(p, 'haste'); hspOn = true; logp(b, 'good', s.n + '. 가속 1을 써서 피해 ×' + hsp.mul); } // 가속은 상태 객체의 겹 수로 판정하고 스킬 한 번에 1만 소모한다.
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
    let base = (dm ? skillBaseDamage(p,s,dm.n) : 0) + (ex ? ex.per * (BU && ex.s === 'bleed' ? (ex.me ? Math.min(ex.max || 10, stk(p, 'bleed')) : preBlOf(e)) : ex.s ? preKw[e.id][ex.s] : st(e, 'poison')) : 0) + (wb && h === 0 ? burn * wbMul : 0) + wardHit.bonus + (vp ? vp.per * st(e, 'vuln') : 0);
    if (BU) { if (gru) base += Math.min(gru.max || 999, gru.per * (p.grudge || 0)); base += meDrainDmg; } // 받은 피해 · 지운 내 출혈
    if (kb && h === 0) base += skillResourceDamage(p, s, kb, kiEff * ((kb.per || 0) + fxVal(p, 'kiBurstPer', 0, (a, v) => a + v))); { const km = kb ? (kb.mul || 0) + uqA(p, 'u_kiBurstMul', s) : 0; if (kb && km && kiEff > 0) base *= 1 + km * kiEff; } /* M6-1 고유 mk_h2 기 1마다 배율 +10%p */ // M5-2 붕권: 쏟은 기마다 피해 +20%
    if (mcb && h === 0) base += mcb.per * preCh[e.id]; if (mij && h === 0) base += mij.per * preCh[e.id] * (b.mkIljiK || 0); if (mcp && h === 0) base += mcp.per * (b.mkCtrLast || 0); // M5-2 사혈 폭쇄 · 일지멸맥 · 되돌린 주먹
    if (kpr) base += skillResourceDamage(p, s, kpr, kpr.per * kiNow); // 기 추가 피해는 힘 1%/점. 수급·소모·붕괴는 별도.
    if (CF) { if (cfPd && cfPd.per) base += skillResourceDamage(p, s, cfPd, cfPd.per * cfTX(e)); if (b.cfOffer && h === 0) base += skillResourceDamage(p, s, cfCl, b.cfOffer.c * b.cfOffer.dmg); if (cfPd && cfPd.of !== 'prot' && cfPd.of !== 'burden' && cfPd.of !== 'clean' && h === 0) b.rec.push({ k: 'cfper', id: s.id, of: cfPd.of, x: cfTX(e) }); } // 짐·정화·사함 피해만 힘 성장. 보호와 적 상태 비례는 고정.
    if (BM) base += eatAdd + (pdF ? pdF.per * st(e, 'weak') : 0) + (bdF ? bdF.per * Math.min(BLOOD.dmgCount, b.paidTurn || 0) : 0); // 먹은 만큼 · 약화된 만큼(이 스킬의 약화 전) · 이번 차례에 낸 피만큼
    if (bo && h === 0) base += boPer * preI[e.id] * dotMul(p); // 불태우기: 태운 화상 1마다 (지능 반영)
    if (csh && h === 0 && preCh[e.id] > 0) { base += csh.dmg * preCh[e.id]; delete e.s.chill; } // 얼음 깨기: 둔화를 모두 깨뜨린다
    if (fb && h === 0) base += skillResourceDamage(p, s, fb, fb.n * fOf(e)); if (fxs) base *= 1 + fxs.per * fOf(e); if (swx && h === 0 && prevId != null && prevId !== e.id) base *= swx.mul; if (hsx && b.pDouble === b.round) base *= hsx.mul; if (solo) base *= 1 + HN.solo; if (hspOn) base *= hsp.mul; // 추적 소모 피해만 민첩 성장 · 추적 비례는 성장한 기본 피해에 곱함 · 가속은 연속 타격 전체
    if (p.build === 'hunter' && s.hn5) { const hs = F('hnSky'), hbr = F('hnBloodRain'); if (hs && fOf(e) >= hs.need) base = Math.max(base, wpnDmg(p) * hs.mul); if (hbr) base = st(e, 'bleed') > 0 ? wpnDmg(p) * hbr.mul : 0; } // M5-4 하늘 가르기 · 피의 비
    if (p.build === 'elementalist' && s.el5) base = elBase(b, s, e, base, h, preCh[e.id]); // M5-5 마력탄 · 천화 · 비전 일격 · 빙결 파쇄
    { const abx = s.as5 ? F('asBackx') : null; if (abx && e.row === 'back' && (!abx.low || e.hp <= e.hpMax * abx.low)) base *= abx.mul; } // M5-3 후열 기습 · 그림자 처형
    if (lx && (lx.me ? p.hp <= p.hpMax * lx.hp : e.hp <= e.hpMax * lx.hp)) base *= lx.mul; if (bx && e.s.broken) base *= bx.mul; if (gx && isBig(e)) base *= gx.mul; if (chx && e.s.chill) base *= chx.mul; if (kwxF && preKw[e.id][kwxF.s] > 0) base *= kwxF.mul; // 마무리(생명력 낮음), 붕괴한 적, 큰 적, 둔화된 적 (겹치면 곱한다)
    if (sld && !preBrk[e.id]) base = 0; // 0.8.0 5단계 산사태: 무너지지 않은 적에게는 피해 대신 붕괴(아래)
    const ev0 = !!(e.evading && !multi); let hitE = false; // 몸 낮추기로 피했는가 (수도승: 터뜨린 기를 돌려준다)
    let dealt = 0; if (base > 0) { dealt = hurtEnemy(b, e, outDmg(b, base, {}), { single: multi ? 0 : 1, aoe: multi ? 1 : 0, melee: s.tgt === 'melee' || s.tgt === 'front' ? 1 : 0, noIgn: bo && h === 0 ? 1 : 0, leechBleed: BU && h === 0 && s.tgt === 'melee' ? stBl : 0, label: s.n }); tot += dealt; hitE = !(ev0 && !e.evading) || dealt > 0; if (hitE) kiHit = true; if (hitE && h === 0) kiHitN++; /* 0.8.0 6단계: 몸 낮춘 적도 절반은 맞는다 */ if (hitE && h === 0 && meIf && preCh[e.id] > 0) { kiIf++; if (st(e, 'weak') > 0) kiIfCW++; } }
    if (sbE && h === 0) sbEdgeSee(sbE, e, dealt); // 칼: 고른 적이 맞았는지 (빗나가면 처음 피해를 받은 적)
    if (base > 0 && !e.alive) { killed++; if (BU) { if (h === 0) buEat(e, true); buKill(e); if (cr && h < hits - 1 && targets.length === 1) { const nx = buCarry(b, act, e); if (nx) { targets[0] = nx; logp(b, 'good', '남은 타격이 ' + nx.n + '에게 이어진다'); } } } if (ksp && h === 0) sbKillSpread(b, e, preKw[e.id].bleed, ksp); if (ssp && h === 0) sbSearSpread(b, e, preKw[e.id].sear); if (spV && !e.killPaid) { e.killPaid = 1; const n = Math.min(BLOOD.spreadKillMax, Math.ceil((prePo[e.id] || 0) * (spV.per || 1))); if (n > 0) bmSpread(b, e, n, spGot); } continue; }
    if (kb && kb.brk && h === 0 && hitE && e.alive && kiTake > 0) addBreak(b, e, kiEff * kb.brk); // 터뜨린 기 1마다 붕괴
    if (mcb && h === 0 && e.alive && preCh[e.id] > 0) { delete e.s.chill; logp(b, 'good', e.n + '의 둔화 ' + preCh[e.id] + '을(를) 터뜨린다'); if (mcb.brk) addBreak(b, e, mcb.brk * preCh[e.id]); } // M5-2 사혈 폭쇄: 둔화를 모두 터뜨린다(이 스킬이 거는 둔화는 그 뒤)
    if (mdc && h === 0 && hitE && preCh[e.id] > 0) { const g = bHeal(b, mdc.per * preCh[e.id], 'drain'); if (g > 0) logp(b, 'good', s.n + ': 둔화 ' + preCh[e.id] + '에서 생명력 +' + r1(g)); } // M5-2 탈기
    if (bo && h === 0 && e.alive) { const n = preI[e.id]; if (n > 0) { delete e.s.ignite; addBreak(b, e, bo.brk * n); logp(b, 'good', e.n + '의 화상 ' + n + '을(를) 모두 태운다. 붕괴 +' + bo.brk * n); } else logp(b, 'sys', e.n + '에게 태울 화상이 없다'); } // 불태우기: 화상은 타격 뒤에 지운다(그 타격으로 쓰러지면 불로 쓰러진 것)
    if (BU && h === 0) buEat(e, false);
    if (fb && h === 0 && e.alive) { p.focus = { id: e.id, n: 0 }; } // 터뜨린 추적은 사라진다
    if (csh && h === 0 && e.alive && preCh[e.id] > 0) { logp(b, 'good', e.n + '의 얼음이 깨진다. 둔화 ' + preCh[e.id]); addBreak(b, e, csh.brk * preCh[e.id]); b.rec.push({ k: 'shatter', n: preCh[e.id], broke: e.s.broken && !preBrk[e.id] ? 1 : 0 }); }
    if (ccut && h === 0 && e.alive && preCh[e.id] > 0 && preStop[e.id]) { if (big(e)) { logp(b, 'good', e.n + '을(를) 멈춰 세우려 한다. 붕괴 +' + ccut.brk); addBreak(b, e, ccut.brk); } else { const was = e.intent.k; e.intent = { k: 'attack' }; e.teleX = 1; e.teleTurn = null; if (e.chant) { e.chant = null; e.pyreRest = 1; } ysResp(b, '끊기'); uqR(p, 'u_cut', b, p, e); /* M6-1 고유 hn_h6 */ logp(b, 'crit', e.n + '을(를) 멈춰 세운다. 모으던 ' + (was === 'aim' || e.intent.aimed ? '겨누기' : CHANT_K.includes(was) ? '영창' : '강타') + '가 흩어진다'); } } // 멈춰 세우기: 둔화된 적이 모으는 중이면 끊는다(강적 · 보스는 큰 붕괴)
    if (csp && h === 0 && e.alive && preCh[e.id] > 0) { const n = Math.max(1, Math.round(preCh[e.id] * (csp.per || 1))); let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'chill', n); k++; } if (k) logp(b, 'good', e.n + '의 냉기가 번진다. 다른 적 모두에게 둔화 ' + n); } // 냉기 번짐
    if (frz && h === 0 && e.alive) { if (big(e)) { addS(b, e, 'chill', frz.chill); addBreak(b, e, frz.brk); logp(b, 'good', e.n + '이(가) 얼음에 갇히다 만다. 둔화 ' + frz.chill + ', 붕괴 +' + frz.brk); } else { const tl = ysBigTele(e); e.stun = Math.max(e.stun || 0, 1); logp(b, 'crit', e.n + '이(가) 얼어붙는다. 다음 행동을 놓친다'); if (tl) { ysResp(b, '끊기'); uqR(p, 'u_cut', b, p, e); /* M6-1 고유 hn_h6 */ } } } // 얼음 감옥
    if (ocb && h === 0 && e.alive && preStop[e.id] && !preBrk[e.id] && e.s.broken) { addS(b, p, 'haste', ocb.haste); logp(b, 'good', '모으던 적을 무너뜨렸다. 나에게 가속 ' + ocb.haste); if (ocb.hasten) hastenBranch(b, s.b, ocb.hasten, s.id); } // 발목 끊기
    if (fa && h === hits - 1 && e.alive) { const cur = p.focus && p.focus.id === e.id ? p.focus.n : 0; p.focus = { id: e.id, n: Math.max(cur, Math.min(HUNT.addMax, cur + fa.n)) }; logp(b, 'good', e.n + '에게 추적 ' + p.focus.n + '겹'); } // 추적 추가는 2겹까지만
    if (sbOrd && h === 0) { for (const x of stx) if (e.alive) addS(b, e, x.s, x.n); if (sbE && sbE.apply === e && e.alive) sbEdgeApply(b, e, edx ? edx.mul : 1); if (ex && ex.s && ex.take && preKw[e.id][ex.s] > 0) { delete e.s[ex.s]; logp(b, 'good', e.n + '의 ' + KW_N[ex.s] + '을(를) 모두 거둔다. ' + KW_N[ex.s] + ' ' + preKw[e.id][ex.s]); } } // 마검사 순서: 상태 → 칼 → 붕괴 → 교대 붕괴 → 끊기
    if (po) addPoison(b, e, uqSkPsn(b, s, po.n), 1, capOver); /* M6-1 고유 as_h2: 스킬의 중독 ±1 */
    { const ub = multi && h === 0 ? uqA(p, 'u_multiBrk', b, p, e, s) : 0; /* M6-1 고유 wd_h5 휩쓰는 손: 전열 모두를 치는 스킬 대상마다 붕괴 +8 */ if (bk || ub) addBreak(b, e, (bk ? bk.n * (shx && e.role === 'shield' ? shx.mul : 1) : 0) + ub); } // 방패병에게 붕괴 ×
    if (sld && h === 0 && e.alive && !preBrk[e.id]) { logp(b, 'good', e.n + '의 자세를 산사태처럼 무너뜨린다. 붕괴 +' + sld.brk); addBreak(b, e, sld.brk); }
    if (CF && h === 0 && e.alive) { const cb = (b.cfOffer && b.cfOffer.brk ? b.cfOffer.c * b.cfOffer.brk : 0) + (cfPd && cfPd.brk ? cfPd.brk * cfTX(e) : 0); if (cb > 0) addBreak(b, e, cb); } // 숨겨진 직업 2: 사함 붕괴 · 비례 붕괴 (대상마다 한 번)
    if (altBrk && h === 0 && e.alive) { if (!altBrkLog++) logp(b, 'good', (altF.run === 2 ? '⇄⇄ 이어진 교대' : '⇄ 교대') + ': 붕괴 +' + altBrk); addBreak(b, e, altBrk); }
    if (cx && h === 0 && e.alive && e.intent && (cx.chant ? CHANT_K : ['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn']).includes(e.intent.k)) { logp(b, 'good', e.n + '이(가) 모으던 힘을 노린다. 붕괴 +' + cx.brk); addBreak(b, e, cx.brk); } // 끊어 내기
    if (dr && !dr.s && !dr.eat && h === 0 && st(e, 'poison') > 0) { const hl = Math.min(p.hpMax - p.hp, st(e, 'poison') * dr.per * healMul(p) * (p.build === 'assassin' ? 1 + asSum(p, 'drainP') : 1)); if (hl > 0) { p.hp += hl; logp(b, 'good', e.n + '의 독에서 생명력 +' + r1(hl)); } } // 독 흡수: 중독은 그대로
    if (bp && h === 0) addBreak(b, e, bp.per * st(e, 'poison'));
    if (h === 0 && !sbOrd) for (const x of stx) if (e.alive) addS(b, e, x.s, x.n + (s.el5 ? elStAdd(b, s, x) : 0)); /* M6-1 고유 el_h2: 원소술사 주문의 상태 더하기 */ // 적에게 거는 상태 (독무의 약화). 마검사는 위에서 붕괴보다 먼저
    if (h === 0 && p.build === 'elementalist' && s.el5 && e.alive) elHit(b, s, e, preCh[e.id], base > 0); // M5-5
    if (slx && h === 0 && hitE && e.alive && e.intent && SEAL_K.includes(e.intent.k)) { if (big(e)) { addBreak(b, e, slx.brk); logp(b, 'good', e.n + '의 혈을 짚는다. 끊기지 않고 붕괴 +' + slx.brk); } else { e.intent = { k: 'attack' }; e.teleX = 1; e.teleTurn = null; logp(b, 'crit', e.n + '의 혈을 짚어 하려던 일을 끊는다'); ysResp(b, '끊기'); fxRun(p, 'onSeal', b, p, e); } b.rec.push({ k: 'seal', big: big(e) ? 1 : 0 }); uqR(p, 'u_onSeal', b, p, e); /* M6-1 고유 mk_h5 봉인한 적 */ } // 혈도: 지원 행동 끊기
    if (gru && h === 0 && e.alive && (p.grudge || 0) > 0) { if (gru.bl) addS(b, e, 'bleed', Math.min(6, Math.floor(p.grudge / gru.bl))); if (gru.vu) addS(b, e, 'vuln', Math.min(3, Math.floor(p.grudge / gru.vu))); if (gru.brk) addBreak(b, e, Math.min(gru.brkMax || 999, p.grudge * gru.brk)); } // 받은 피해를 출혈 · 취약 · 붕괴로
    if (wv && h === 0 && e.alive) { const I = st(e, 'ignite'), C = st(e, 'chill'); if (I && !C) addS(b, e, 'chill', wv.chill); else if (!I) addS(b, e, 'ignite', wv.ign); } // 원소술사 엮기: 없는 원소 (첫 타격이 화상을 쓴 뒤의 상태로 고른다. 둘 다 있으면 걸지 않는다)
    if (pl && h === 0 && e.alive && e.row === 'back') { e.row = 'front'; e.pulledA = b.actN; logp(b, 'crit', e.n + '을(를) 전열로 끌어낸다'); } // 파수꾼: 후열 끌어내기
    if (vg && h === 0 && e.alive) { const n0 = st(e, 'vuln'); const add = Math.round(n0 * (vg.mul - 1)); if (add > 0) { addS(b, e, 'vuln', add); logp(b, 'good', e.n + '의 약점이 벌어진다. 취약 ' + n0 + ' → ' + st(e, 'vuln')); } } // 파수꾼: 취약 키우기
    if (BM && sp && sp.s === 'weak' && h === hits - 1 && e.alive) { const n = Math.min(KW.weak, Math.ceil(st(e, 'weak') * (sp.per || 1))); if (n > 0) { let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'weak', n); k++; } if (k) logp(b, 'good', e.n + '의 저주가 번진다. 다른 적에게 약화 ' + n); } } // 약화 퍼뜨리기 (이 스킬의 약화를 건 뒤)
    if (sp && !sp.s && !sp.kill && h === hits - 1 && e.alive) { const n = Math.ceil(st(e, 'poison') * sp.per); if (n > 0) { let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addPoison(b, o, n, 1, capOver); k++; } if (k) logp(b, 'good', e.n + '의 독이 번진다. 다른 적에게 중독 ' + n); } } // 독 번지기
  }
  if (kb && !kiHit && targets.length && !b.over) { setKi(p, kiBack); logp(b, 'sys', '빗맞아 터뜨린 기를 거둬들인다. 기 ' + st(p, 'empower')); } // 맞은 적이 없으면(몸 낮추기) 거둔 기를 돌려준다
  if (p.build === 'monk') for (const x of s.fx) if (x.k === 'meSt' && !x.on && (x.s === 'empower' || x.if)) { const n = x.if === 'chill' ? x.n * kiIf : x.if === 'chillweak' ? x.n * kiIfCW : x.if === 'hit' ? x.n * kiHitN : x.n; if (n > 0) { b.kiPend = (b.kiPend || 0) + n; logp(b, 'good', s.n + '. ' + (p.build === 'monk' ? '기' : KW_N[x.s]) + ' +' + n + (x.if ? ' (늦춘 적에게서)' : '')); } else if (x.if) logp(b, 'sys', '둔화된 대상이 없어 기를 얻지 못한다'); } // 강화는 이 행동이 기를 쓴 뒤(finishPlayer)에 든다 (10월 7일 공통 변경)
  { const stc = F('stance'); if (stc) monkStance(b, s, stc, hzOn === 'ctr' ? hz : null); } // 자세: 공격에 붙으면 피해 뒤에 선다
  { const kg = F('kiGrow'); if (kg) b.kiGrow = kg; }
  const gr = F('grow'), bu = F('burst'), exe = F('execute');
  for (const e of targets) {
    if (!e.alive || b.over) continue;
    if (gr && gr.s === 'bleed') { const n0 = stk(e, 'bleed'); const goal = Math.min(KW.bleed, Math.ceil(n0 * gr.mul) + (gr.add || 0)); if (goal > n0) addS(b, e, 'bleed', goal - n0); logp(b, 'good', e.n + '의 상처가 벌어진다. 출혈 ' + n0 + ' → ' + stk(e, 'bleed')); continue; } // 출혈 키우기 (숨겨진 직업 1)
    if (gr) { const n0 = st(e, 'poison'); const add = Math.round(n0 * (gr.mul - 1)) + (gr.add || 0); const got = addPoison(b, e, add, 1, capOver); logp(b, 'good', e.n + '의 독이 끓어오른다. 중독 ' + n0 + ' → ' + st(e, 'poison') + (got < add ? ' (상한)' : '')); }
    if (bu) {
      let evH = 0; if (e.evading && !multi) { e.evading = 0; e.evHitA = b.actN; evH = 1; logp(b, 'sys', e.n + '이(가) 몸을 틀어 독이 절반만 터진다'); } // 0.8.0 6단계 A-7: 몸 낮춘 적은 독 격발 50%(전에는 터지지 않음)
      if (bu.pre) addPoison(b, e, uqSkPsn(b, s, bu.pre), 1, capOver); /* M6-1 고유 as_h2 */ // 터뜨리기 전에 거는 중독 (독 격발: 이 갈래만으로도 돌게)
      const n = st(e, 'poison'); if (n <= 0) { logp(b, 'sys', e.n + '에게 터뜨릴 중독이 없다'); continue; }
      const take0 = bu.half ? Math.ceil(n / 2) : bu.top ? Math.min(bu.top, n) : n; const take = evH ? Math.ceil(take0 / 2) : take0;
      const low = exe && e.hp <= e.hpMax * exe.hp; const mul = s.as5 ? asBurstMul(b, s, bu, e) : (low ? exe.mul : (bu.mul || 1)) * (gx && isBig(e) ? gx.mul : 1); // M5-3: 터뜨리기 배수는 겹쳐도 가장 큰 하나만
      const total = (poisonTotal(n) - poisonTotal(n - take)) * mul * triggerDamageMul(p);
      const left = Math.max((bu.top || bu.half || evH) ? n - take : Math.floor(n * (bu.keep || 0)), uqF(p, 'u_burstHalf') ? Math.floor(n / 2) : 0); /* M6-1 고유 as_r3: 중독의 절반만 없앤다(피해는 그대로) */
      if (left > 0) e.s.poison.stacks = left; else delete e.s.poison;
      logp(b, 'crit', (low ? '숨통을 끊으러 든다. ' : '') + e.n + '의 독이 터진다. 중독 ' + take + (left ? ' (남은 중독 ' + left + ')' : ''));
      b.asBurstK = 1; const bd = hurtEnemy(b, e, outDmg(b, total, {}), { single: multi ? 0 : 1, aoe: multi ? 1 : 0, melee: s.tgt === 'melee' ? 1 : 0, burst: 1, label: s.n }); tot += bd; b.asBurstK = 0; uqR(p, 'u_burst', b, p, e, bd, s, take); /* M6-1 고유 as_h3 · as_h4: 터뜨린 뒤(곁의 적 30% · 근접 붕괴) */ // 10월 18일 0.8.0 5단계 암살자: 터뜨린 피해(깨진 틈 찌르기 o.burst) · 터뜨려 쓰러뜨림(남은 독의 온기 b.asBurstK)
      if (s.as5) (b.asBursts = b.asBursts || []).push([s.id, n, b.round || 0]); // M5-3 측정: 터뜨린 중독 크기
      if (!e.alive) { killed++; continue; }
      if (bu.brkPer && !uqF(p, 'u_burstNoBrk')) addBreak(b, e, take * bu.brkPer); /* M6-1 고유 as_h3 대가: 터뜨리기의 붕괴 없음 */
    }
  }
  if (CF) { if (cfPd && cfPd.spend && stk(p, 'protect') > 0) delete p.s.protect; if (cfCl && cfCl.after && !b.over) { const r = cfCleanse(b, cfCl, s.n, s.id); cfE += r.e; } b.cfOffer = null; } // 숨겨진 직업 2: 보호 쓰기, 친 뒤 정화
  if (eatF && p.hp > 0) { const v = eatHeal * healMul(p) * (1 + Math.min(FX_CAP, fxAdd(p, 'bHealP', b, p, 'bmEat'))), cap = p.hpMax * BLOOD.eatCap; const g = Math.max(0, Math.min(v, cap, p.hpMax - p.hp)); p.hp += g; if (eatN > 0) logp(b, 'good', '먹은 중독 ' + eatN + '. 생명력 +' + r1(g) + (v > cap + 0.05 ? ' (한 번에 최대 생명력의 ' + Math.round(BLOOD.eatCap * 100) + '%까지)' : g + 0.05 < v ? ' (넘친 몫은 버린다)' : '')); b.rec.push({ k: 'eat', id: s.id, n: eatN, heal: r1(g), over: r1(Math.max(0, v - g)) }); } // 먹기 회복: 대상 고리가 끝난 뒤 한 번, 상한은 모든 배수 뒤
  if (wdLate) { const g = addWard(b, p, wd.n); logp(b, 'good', s.n + '. 태운 뒤 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')'); } // 태우고 얻는 칸(마검사 타고 남은 막): 보호막은 타격 뒤에
  if (BU && kills.length) { // 처치 보상 (숨겨진 직업 1): 🔄 · 빠른 칸 · 나에게 상태
    if (hz && hz.on === 'kill') hastenBranch(b, s.b, hz.n || 1, s.id);
    if (qk && qk.on === 'kill') { if (qk.next) { p.quickTurns = Math.max(p.quickTurns || 0, 1); logp(b, 'good', s.n + '. 다음 차례에 빠른 칸이 하나 더 생긴다'); } else { b.extraQuick = 1; logp(b, 'good', s.n + '. 이번 차례에 빠른 칸이 하나 더 생긴다'); } }
    if (meKill) { addS(b, p, meKill.s, meKill.n); logp(b, 'good', s.n + '. ' + (KW_N[meKill.s] || meKill.s) + ' ' + meKill.n); }
  }
  const krOk = s.killRecharge && (BU ? kills.length > 0 && (b.krTurn || 0) < BUTCH.krTurn : killed) && !(s.once && b.krOnce && b.krOnce[s.id]); // 같은 적 한 번(killPaid) · 한 차례 krTurn번 · 전투마다 1번 스킬은 한 번만 다시
  if (krOk) { if (BU) b.krTurn = (b.krTurn || 0) + 1; if (s.once) { (b.krOnce = b.krOnce || {})[s.id] = 1; p.cd[s.id] = 0; logp(b, 'good', s.n + '을(를) 한 번 더 쓸 수 있다'); } else ysRefund(b, s.n); } // 10월 15일 유산 1차 시제품 변환: 처치 다시 쓰기 → 유산 +1(라운드에 한 번). 전투마다 1번 스킬은 한 번 더 (비용은 ysSpend가 playerAct에서 먼저 냈다)
  if (hzOn === 'use' && !(hz.when === 'ward<1' && wardBeforeSkill >= 1)) hastenBranch(b, s.b, hz.n || 1, s.id); else if (hzOn === 'kill' && killed && !BU) hastenBranch(b, s.b, hz.n || 1, s.id); else if (hzOn === 'alt' && b.sbAlt) hastenBranch(b, s.b, hz.n || 1, s.id); else if (hzOn === 'clean' && CF && cfE > 0) hastenBranch(b, s.b, hz.n || 1, s.id); // 🔄 쓰면 다른 같은 갈래 스킬 쿨타임 −n // 이번 차례에 쓴 스킬은 모두 이번 차례가 끝날 때 줄지 않는다 (10월 3일: 빠른 스킬 다음에 스킬을 쓰면 빠른 스킬의 대기가 1 짧았다)
  p.lastSkillDmg = multi ? tot / Math.max(1, targets.length) : tot;
  if (p.build === 'assassin' && s.as5) asPost(b, s, targets, killed); // M5-3 독 표창 · 맹독 · 연쇄 격발
  if (p.build === 'warden') wdUse(b, s, targets, tgt, 'post'); // M5-1 대지 분쇄 · 사슬 끌기
  if (p.build === 'hunter') hnSkillEnd(b, s, targets); // 사냥꾼 연계: 쓴 갈래(시작 스킬은 lb) · 0.8.0 5단계 기본 공격 버프 · 직전에 친 적
  if (p.build === 'elementalist') { const ctM = s.fx.filter(x => x.k === 'meSt' && x.on === 'cut'); if (ctM.length && b.elCutA === b.actN) elCutMe(b, ctM); b.elBurnPre = null; // 10월 18일 0.8.0 5단계 원소 장막: 이 행동으로 영창을 끊으면 나에게 보호
    b.shockCtx = { id: s.id, br: s.b, ids: targets.map(e => e.id), multi, sx: F('shockx') || null, hz: hzOn === 'shock' ? (hz.n || 1) : 0, kr: s.killRecharge && s.krShock ? s.n : null, cutMe: ctM.length ? ctM : null }; } // 원소술사: 이 행동 끝의 열충격에 붙일 것 (finishPlayer가 쓰고 지운다). kr: 공명은 행동 끝 열충격 처치도 환급
  b.curSkill = null; b.focusKey = null;
}
/* ===== 마검사 (10월 7일, docs/직업/마검사.md B절) =====
   행동 종류: ⚔ 베기(기본 공격 · 강공격 · kind 'cut' 스킬), ✦ 주문(kind 'spell' 스킬). 방어 · 흘리기 · 플라스크 · 소모품 · 달아나기 · 기절로 놓친 차례는 종류가 없고 순서를 바꾸지 않는다.
   교대: 종류가 직전 종류(p.sbLast)와 다르면. 교대면 행동이 끝난 뒤 보호막 +altWard(내 차례마다 한 번). 이어진 교대(p.sbRun)가 2 이상이면 run 2 보상이 켜지고, 켜지면 이어진 교대는 0(박자를 쓴다).
   칼(p.edge = { s, n }): 주문이 싣고, 다음 베기의 첫 타격이 고른 적에게 피해를 주고 그 적이 살아 있으면 건다. 빗나가거나 그 타격에 쓰러지면 칼에 남는다 */
/* ===== 0.8.0 5단계 사냥꾼 연사: 기본 공격 버프 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-6a · 8절 결정 5, 10월 18일) =====
   p.bbuf = { swap · extra · barb · sky: { mul, bleed, turn, until, used } }. until은 라운드(b.ysR, 내 차례가 시작될 때 +1, 가속의 두 번째 차례는 같은 라운드)로 그 라운드가 끝날 때까지.
   r = 0 이번 라운드, 1 다음 라운드 끝까지, 2 그다음까지. 같은 버프를 다시 걸면 값과 기간만 새로 한다(겹치지 않음). 기본 공격만 받는다(js/32 hnBasicBuf). 전투가 끝나면 모두 사라진다(endBattleCarry · resetCharges).
   기록: b.rec { k: 'bbuf', s, w: on(켬) · use(그 버프 동안 기본 공격을 처음 씀) · re(쓰기 전에 다시 걸어 새로 함) · waste(한 번도 못 쓰고 끝남) }, 전투가 끝날 때 남은 것은 tools/dgqa.js가 end로 센다 */
function hnSkillEnd(b, s, targets) {
  const p = b.p; const br = hnBr(s); if (br !== '시작') p.lastBr = br;
  if (s.time === 'fast' && br === '기동') b.hnFastMob = b.turnIdx; // 8절 보완 2(linkFast): 이번 차례에 빠른 기동 스킬을 먼저 씀
  if (s.tgt !== 'self' && targets && targets[0]) p.hnLastT = targets[0].id; // 직전에 친 적 = 내 직전 공격의 첫 대상 (2-6a 규칙 3)
  for (const e of s.fx) if (e.k === 'bbuf' && !b.over) hnBbufSet(b, e, s);
}
const HN_BB_N = { swap: '바꿔 쏘기', extra: '덧화살', barb: '가시', sky: '하늘 가르기', lock: '표적 고정' };
function hnBbufSet(b, e, s) {
  const p = b.p, R = b.ysR || 0; const B = p.bbuf = p.bbuf || {}; const o = B[e.s];
  if (o && o.until >= R && !o.used) b.rec.push({ k: 'bbuf', s: e.s, w: 're' });
  B[e.s] = { mul: e.mul || 0, bleed: e.bleed || 0, turn: e.turn || 0, until: R + (e.r || 0), used: 0 }; b.rec.push({ k: 'bbuf', s: e.s, w: 'on', r: e.r || 0 });
  logp(b, 'good', s.n + '. ' + HN_BB_N[e.s] + ': ' + ((e.r || 0) === 0 ? '이번 라운드' : (e.r || 0) === 1 ? '다음 라운드' : (e.r + 1) + '라운드째') + '가 끝날 때까지 기본 공격이 ' + (e.s === 'swap' ? '다른 적을 치면 ×' + e.mul + ' · 출혈 ' + e.bleed : e.s === 'extra' ? '덧화살 +' + Math.round(e.mul * 100) + '%' + (e.turn ? ' (다른 적이면 ×' + e.turn + ')' : '') : e.s === 'barb' ? '출혈 +' + e.bleed : '×' + e.mul));
}
/* 내 차례가 시작될 때(라운드가 바뀐 첫 행동): 기간이 지난 버프를 지운다 */
function hnBbufTick(b) { const p = b.p, B = p.bbuf, R = b.ysR || 0; if (!B) return; for (const k of Object.keys(B)) if (B[k].until < R) { if (!B[k].used) b.rec.push({ k: 'bbuf', s: k, w: 'waste' }); delete B[k]; } if (!Object.keys(B).length) p.bbuf = null; }
function sbAltMerge(s, b) { const L = s.fx.filter(e => e.k === 'alt' && b.sbAlt && (e.run === 2 ? b.sbRunNow >= 2 : true)); if (!L.length) return null; if (L.length === 1) return L[0]; const o = { k: 'alt' }; for (const e of L) for (const k in e) if (k === 'run') o.run = Math.max(o.run || 0, e.run); else if (k !== 'k') o[k] = (o[k] || 0) + e[k]; return o; }
function sbKindOf(p, id, act) { if (p.build !== 'spellblade') return null; if (id === 'basic' || id === 'heavy') return 'cut'; return act && act.v2 && act.s && act.s.kind || null; }
function sbBegin(b, id, act, tgt) {
  const p = b.p; const k = sbKindOf(p, id, act); b.sbK = k; b.sbAlt = false; b.sbRunNow = 0; b.sbRun2 = 0; b.sbAltFx = null; b.sbEdgeDone = 0; b.sbWardSpentAll = false; if (!k) return;
  b.sbNoAlt = act && act.v2 && act.s && skCost(act.s) === 1 ? 1 : 0; if (b.sbNoAlt) return; // 0.8.0 M5-0(10월 19일 만든 사람): 비용 1 스킬은 교대로 치지 않는다(교대 보호막 · 할인 · 이어진 교대 횟수 모두 제외, 직전 종류도 그대로). 칼에 싣기 · 칼날은 그대로
  b.sbAlt = !!p.sbLast && k !== p.sbLast; b.sbBasicAlt = id === 'basic' && uqF(p, 'u_basicAlt') ? 1 : 0; if (b.sbBasicAlt) b.sbAlt = !!p.sbLast && p.sbLast !== 'basic'; /* M6-1 고유 sb_r1: 기본 공격은 베기 · 주문 어느 쪽과도 교대(기본 공격끼리는 아님) */ b.sbRunNow = b.sbAlt ? (p.sbRun || 0) + 1 : 0;
}
/* ===== 0.8.0 M5-0 마검사 경계 (10월 19일 만든 사람, 문장 그대로): 혈염(혈인 × 염검) · 죄인의 피(혈인 × 마갑) · 유산의 불(마갑 × 염검) =====
   p.sbSt = { blaze 겁화 남은 차례, fireBody 불의 몸 남은 차례, heatNext 다음 기본 공격 ×, emberMail 잿불 갑주, film 피막(이번 차례), sinWall 죄인의 벽 }. 효과 목록(fxList)에 IFX_SB로 들어간다 */
/* 경계 숫자(SB_BOUND)는 값 식과 함께 data/skillkit.js에 있다 */
const sbIsCut = (p, c) => !!c && (c.id === 'basic' || c.id === 'heavy' || (SK2[c.id] && SK2[c.id].kind === 'cut'));
const sbBH = c => !!c && (c.id === 'basic' || c.id === 'heavy');
const IFX_SB = {
  blaze: { hitP: (b, p) => p && p.sbSt && p.sbSt.blazeHit != null ? p.sbSt.blazeHit : SB_BOUND.blazeHit, inP: (b, p, o) => !o.dot ? -(p && p.sbSt && p.sbSt.blazeIn != null ? p.sbSt.blazeIn : SB_BOUND.blazeIn) : 0, /* 보정 5: 변종 불귀는 스킬 값(sbBlaze.hit · inc) */ onHit: (b, p, e, o, c) => { if (!sbIsCut(p, c) || !e.alive) return; return sbSear(b, e, SB_BOUND.blazeSear) ? 1 : 0; } },
  fireBody: { hitP: (b, p, e, o, c) => sbBH(c) ? SB_BOUND.bodyMul : 0, onHit: (b, p, e, o, c) => { if (!sbBH(c) || !e.alive) return; addS(b, e, 'ignite', SB_BOUND.bodyIgn); return 1; }, noIgnite: 1 },
  heatNext: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? SB_BOUND.heatMul - 1 : 0, onHit: (b, p, e, o, c) => { if (c && c.id === 'basic' && p.sbSt) { p.sbSt.heatNext = 0; return 1; } } },
  hold: { hitP: (b, p) => (p && p.sbSt && p.sbSt.hold || 0) * SB_BOUND.holdPer }, // M5-0 보정 5 2차 버팀
  bloodFist: { hitP: (b, p, e, o, c) => c && c.id === 'basic' && e && stk(e, 'bleed') > 0 ? SB_BOUND.fistMul - 1 : 0 }, // M5-0 보정 5 피 묻은 주먹
  bloodEcho: { onHit: (b, p, e, o, c) => { if (!sbIsCut(p, c) || !e.alive || !(p.ward > 0)) return; addS(b, e, 'bleed', SB_BOUND.echoN); return 1; } }, // M5-0 보정 4 피의 반향
  ashHand: { onHit: (b, p, e, o, c) => { if (!c || c.id !== 'basic' || !p.sbSt || !(p.sbSt.ashHand > 0)) return; p.sbSt.ashHand--; if (e.alive) addS(b, e, 'ignite', SB_BOUND.ashHandIgn); return 1; } }, // 재 묻은 손
  emberMail: { onHit: (b, p, e, o, c) => { if (!sbBH(c) || !e.alive || !(p.ward > 0)) return; addS(b, e, 'ignite', SB_BOUND.emberIgn); return 1; } },
  ashNext: { onHit: (b, p, e, o, c, d) => { if (!c || c.id !== 'basic' || !p.sbSt) return; p.sbSt.ashNext = 0; const fr = alive(b).filter(x => x !== e && x.row === 'front'); for (const x of fr) { hurtEnemy(b, x, Math.max(1, (d || 0) * SB_BOUND.ashMul), { src: p, ash: 1 }); if (x.alive) addS(b, x, 'ignite', SB_BOUND.ashIgn); } if (e.alive) addS(b, e, 'ignite', SB_BOUND.ashIgn); logp(b, 'good', '잿불의 각인: 기본 공격이 전열에 불길로 터진다'); return 1; } },
};
/* 승부수의 보호막(죄인의 벽 3배 · 불의 몸 유산당 8)은 직업 보호막 상한을 넘겨 쌓는다(문장 그대로) */
const sbWardRaw = (p, n) => { const w0 = p.ward || 0; p.ward = w0 + Math.max(0, n); return p.ward - w0; };
/* 나에게 쓰는 경계 행동 */
function sbBoundUse(b, s) {
  const p = b.p; p.sbSt = p.sbSt || {}; const F = k => s.fx.find(e => e.k === k);
  if ((s.tags || []).includes('보호막') && !p.sbSt.holdOn) { p.sbSt.holdOn = 1; logp(b, 'good', '버팀 태세: 이번 전투 동안 보호막을 지킨 채 차례를 넘길 때마다 버팀 +1(주는 피해 +' + Math.round(SB_BOUND.holdPer * 100) + '%, 최대 ' + SB_BOUND.holdMax + ')'); } // M5-0 보정 5 2차: 보호막 빌드가 이기는 상황(장기전 · 보스)
  if (F('sbBlaze')) { const w = p.ward || 0; p.ward = 0; p.sbSt.blaze = F('sbBlaze').n || 3; p.sbSt.blazeHit = F('sbBlaze').hit != null ? F('sbBlaze').hit : SB_BOUND.blazeHit; p.sbSt.blazeIn = F('sbBlaze').inc != null ? F('sbBlaze').inc : SB_BOUND.blazeIn; logp(b, 'good', '피와 화염이 몸을 감싼다. ' + p.sbSt.blaze + '차례 동안 베기마다 혈염, 주는 피해 +' + Math.round(SB_BOUND.blazeHit * 100) + '%' + (w ? ' (보호막 ' + r1(w) + ' 소실)' : '')); }
  const wp = F('wardPer'); if (wp) { const k = alive(b).filter(e => stk(e, wp.s) > 0).length; const g = k ? addWard(b, p, wp.n * k) : 0; logp(b, 'good', s.n + ': ' + (typeof SNAMES !== 'undefined' && SNAMES[wp.s] || wp.s) + ' 걸린 적 ' + k + ' → 보호막 +' + r1(g)); } // M5-0c: 핏불 장막(혈염)도 같은 효과
  if (F('sbFilm')) { p.sbSt.film = 1; logp(b, 'good', '피막: 이번 차례 보호막으로 받아낸 피해의 ' + Math.round(SB_BOUND.filmPer * 100) + '%가 그 적에게 출혈로 간다'); }
  const sw = F('sbSinWall'); if (sw) { const pay = Math.min(Math.max(0, p.hp - 1), p.hpMax * SB_BOUND.sinPay); p.hp -= pay; const g = sbWardRaw(p, pay * SB_BOUND.sinMul); p.sbSt.sinWall = 1; logp(b, 'good', '죄인의 벽: 생명력 ' + r1(pay) + '을 바쳐 보호막 +' + r1(g)); }
  if (F('sbHeat')) { const w = p.ward || 0; p.ward = 0; p.sbSt.heatNext = 1; logp(b, 'good', '달군 갑주: 보호막 ' + r1(w) + '을 태워 다음 기본 공격 ×' + SB_BOUND.heatMul); }
  if (F('sbFist')) { p.sbSt.bloodFist = 1; logp(b, 'good', '피 묻은 주먹: 이번 전투 동안 기본 공격이 출혈 걸린 적에게 ×' + SB_BOUND.fistMul); } // M5-0 보정 5 P3 결합 칸
  if (F('sbCounterBurn')) { p.sbSt.counterBurn = 1; logp(b, 'good', '되받아 태우기: 이번 전투 동안 흘리기에 성공하면 그 적에게 화상 ' + SB_BOUND.cbIgn); }
  if (F('sbTricolor')) { p.sbSt.tricolor = 2; /* 전투에 두 번 */ logp(b, 'good', '삼색검: 이번 전투 동안 출혈 · 화상이 함께 걸린 적이 있고 보호막이 있으면 베기 스킬 비용 −1(두 번)'); }
  if (F('sbEcho')) { p.sbSt.bloodEcho = 1; logp(b, 'good', '피의 반향: 이번 전투 동안 보호막이 있으면 베기가 출혈 +' + SB_BOUND.echoN + ' 더'); }
  if (F('sbShackle')) { p.sbSt.shackle = 1; logp(b, 'good', '피의 족쇄: 이번 전투 동안 출혈 걸린 적의 강타를 막아 내면 그 적에게 붕괴 +' + SB_BOUND.shackleBrk); }
  if (F('sbAshHand')) { p.sbSt.ashHand = SB_BOUND.ashHandK; logp(b, 'good', '재 묻은 손: 다음 기본 공격 ' + SB_BOUND.ashHandK + '번에 화상 ' + SB_BOUND.ashHandIgn); }
  if (F('sbCinder')) { p.sbSt.cinderMail = 1; logp(b, 'good', '불씨 갑주: 이번 전투 동안 보호막이 피해로 깎일 때마다 전열에 화상 ' + SB_BOUND.cinderIgn); }
  if (F('sbEmberMail')) { p.sbSt.emberMail = 1; logp(b, 'good', '잿불 갑주: 보호막이 남아 있는 동안 기본 공격 · 강공격에 화상 ' + SB_BOUND.emberIgn); }
  const fb = F('sbFireBody'); if (fb) { const y = ysNow(p); p.ys = 0; if (y) uqR(p, 'u_ysZero', b, p); /* M6-1 고유 sb_r4 */ const g = y ? sbWardRaw(p, y * SB_BOUND.bodyPer) : 0; p.sbSt.fireBody = fb.n || 3; delete p.s.ignite; logp(b, 'good', '불의 몸: 유산 ' + y + '을 모두 태워 보호막 +' + r1(g) + ', ' + p.sbSt.fireBody + '차례 동안 평타 ×' + (1 + SB_BOUND.bodyMul) + ' · 화상 ' + SB_BOUND.bodyIgn + ', 받는 화상 무효, 유산 0'); }
}
/* 보호막이 받아낼 때: 피막 → 출혈, 죄인의 벽이 깨지면 전열 출혈, 보호막이 0이 되면 잿불의 각인 */
function sbWardHit(b, p, o, a) {
  if (!p.sbSt) p.sbSt = {}; const src = o && o.src && o.src !== p && o.src.alive ? o.src : null;
  if (p.sbSt.cinderMail && a > 0) { const fr = alive(b).filter(x => x.row === 'front'); for (const x of fr) addS(b, x, 'ignite', SB_BOUND.cinderIgn); if (fr.length) logp(b, 'good', '불씨 갑주: 전열에 화상 ' + SB_BOUND.cinderIgn); }
  if (p.sbSt.film && src && a > 0) { const n = Math.ceil(a * SB_BOUND.filmPer); addS(b, src, 'bleed', n); logp(b, 'good', '피막: ' + src.n + '에게 출혈 ' + n); }
  if (!(p.ward > 0)) { if (p.sbSt.sinWall) { p.sbSt.sinWall = 0; for (const x of alive(b).filter(x => x.row === 'front')) addS(b, x, 'bleed', SB_BOUND.sinBleed); logp(b, 'good', '죄인의 벽이 깨져 전열 모두에게 출혈 ' + SB_BOUND.sinBleed); } if (fxFlag(p, 'ksAshBlast') && !p.sbSt.ashNext) { p.sbSt.ashNext = 1; logp(b, 'good', '잿불의 각인: 다음 기본 공격이 전열 화염 폭발'); } uqR(p, 'u_wardBreak', b, p); /* M6-1 고유 sb_h8: 보호막이 깨질 때 */ }
}
/* M5-0 보정 4 경계 새 칸 */
function sbCross(b, e) { if (!e || !e.alive) return; const hb = stk(e, 'bleed') > 0, hi = stk(e, 'ignite') > 0, n = SB_BOUND.crossN; if (hb) addS(b, e, 'ignite', n); if (hi) addS(b, e, 'bleed', n); if (hb || hi) logp(b, 'good', '달아오른 칼날: ' + e.n + '에게 ' + [hb ? '화상 ' + n : '', hi ? '출혈 ' + n : ''].filter(Boolean).join(' · ')); }
function sbSearSpread(b, e, pre) { const n = Math.min(KW.sear, Math.ceil((pre || 0) * SB_BOUND.ssPer)); if (n <= 0) return; let k = 0; for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'sear', n); k++; } if (k) logp(b, 'good', '핏불 번짐: ' + e.n + '의 혈염이 곁의 적에게 번진다 (혈염 ' + n + ')'); }
function sbSearBurst(b, e, mul) { const n = stk(e, 'sear'); if (!n || !e.alive) return; hurtEnemy(b, e, n * mul, { src: b.p, label: '혈염 터뜨리기' }); logp(b, 'good', '혈염 터뜨리기: ' + e.n + '의 혈염 ' + n + ' × ' + mul); } // M5-0 보정 5 경계 승부수 후보(혈염은 남는다)
function sbEmberCut(b, e) { const p = b.p; if (!e || !e.alive) return; const bn = Math.min(p.ward || 0, SB_BOUND.emberCutBurn); if (bn <= 0) return; p.ward -= bn; const n = Math.min(KW.ignite, Math.round(bn)); addS(b, e, 'ignite', n); logp(b, 'good', '잿불 베기: 보호막 ' + r1(bn) + '을 태워 ' + e.n + '에게 화상 ' + n); } // M5-0 보정 5
function sbTurnStart(b, p) { const S = p.sbSt; if (S.holdOn) { if ((p.ward || 0) > 0) { const h0 = S.hold || 0; S.hold = Math.min(SB_BOUND.holdMax, h0 + 1); if (S.hold > h0) logp(b, 'good', '버팀 ' + S.hold + ': 보호막을 지킨 채 차례가 왔다(주는 피해 +' + Math.round(S.hold * SB_BOUND.holdPer * 100) + '%)'); } else if (S.hold) { S.hold = 0; logp(b, 'sys', '보호막이 깨져 버팀이 풀린다'); } } S.film = 0; for (const k of ['blaze', 'fireBody']) if (S[k]) { S[k]--; if (!S[k]) logp(b, 'sys', (k === 'blaze' ? '겁화' : '불의 몸') + '가 걷힌다'); } }
function sbEdgeApply(b, e, mul) {
  const p = b.p; const E = p.edge; if (!E || !e || !e.alive) return; const n = Math.min(KW[E.s] || 10, Math.round(E.n * (mul || 1)) + fxAdd(p, 'edgeAdd', b, p, E.s));
  const got = addS(b, e, E.s, n); for (const x of E.also || []) { if (e.alive) addS(b, e, x.s, Math.min(KW[x.s] || 10, Math.round(x.n * (mul || 1)))); } uqR(p, 'u_edgeApply', b, p, e, E); if (!uqF(p, 'u_edgeKeep')) p.edge = null; /* M6-1 고유 sb_r5(실은 상태 기록) · sb_h2(칼에 실은 상태가 전투 끝까지 남는다) */ b.sbEdgeDone = 1; b.rec.push({ k: 'edge', s: E.s, n });
  logp(b, 'good', '칼에 실린 ' + KW_N[E.s] + ' ' + n + (E.also || []).map(x => ' · ' + KW_N[x.s] + ' ' + x.n).join('') + '이(가) ' + e.n + '에게 스민다' + (got < n ? ' (상한)' : ''));
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
const sbImN = (b, p, s, n) => { const a = uqA(p, 'u_imbueAdd', b, p, s); return a ? Math.max(Math.min(n, 1), n + a) : n; }; /* M6-1 고유 sb_h1 · sb_r5 대가: 칼에 싣는 수 −1(바닥 1) */
/* 칼에 싣기(고유 sb_r6 플라스크): 같은 상태면 큰 값, 다르면 바꾼다 */
function sbLoad(b, p, s, n) { const m = sbImN(b, p, s, n); if (p.edge && p.edge.s === s) p.edge.n = Math.max(p.edge.n, m); else p.edge = { s, n: m }; logp(b, 'good', '칼에 ' + KW_N[s] + ' ' + p.edge.n + '을(를) 싣는다'); return p.edge.n; }
function sbEnd(b, act) {
  const p = b.p; const k = b.sbK; if (!k) return; b.sbK = null;
  const af = b.sbAltFx; b.sbAltFx = null;
  if (af && !b.over) { const g = []; if (af.ward) g.push('보호막 +' + Math.round(addWard(b, p, af.ward))); if (af.protect) { addS(b, p, 'protect', af.protect); g.push('보호 ' + af.protect); } if (af.stam) { p.st = Math.min(p.stMax, p.st + af.stam); if (p.exhaust && p.st >= 30) p.exhaust = 0; g.push('스태미나 +' + af.stam); } if (g.length) logp(b, 'good', (af.run === 2 ? '⇄⇄ 이어진 교대: ' : '⇄ 교대: ') + g.join(', ')); }
  if ((k === 'spell' || k === 'cut') && act && act.v2) { const im = act.s.fx.find(e => e.k === 'imbue' && !(e.soft && p.edge)); /* M5-0c: 베기 스킬도 친 뒤 칼에 싣는다(다음 베기 · 기본 공격이 나른다). 염화 베기 문장이 일하지 않던 것을 고침 */ if (im) { const imN = sbImN(b, p, im.s, im.n); if (p.edge && p.edge.s === im.s) p.edge.n = Math.max(p.edge.n, imN); else p.edge = { s: im.s, n: imN }; logp(b, 'good', '칼에 ' + KW_N[im.s] + ' ' + p.edge.n + '을(를) 싣는다'); } }
  if ((k === 'spell' || k === 'cut') && act && act.v2 && p.edge) { const al = act.s.fx.filter(e => e.k === 'imbue' && e.also); if (al.length) p.edge.also = al.map(e => ({ s: e.s, n: sbImN(b, p, e.s, e.n) })); } // 0.8.0 M5-0 핏불 싣기: 둘째 상태도 함께 싣는다
  if (b.sbAlt && b.sbAltTurn !== b.turnIdx && !b.over && !b.sbWardSpentAll && !fxFlag(p, 'noAltWard') && !alive(b).some(x => stk(x, 'sear') > 0)) { /* 0.8.0 M5-0 혈염: 혈염 걸린 적이 있는 동안 교대 보호막 없음 */ b.sbAltTurn = b.turnIdx; const g = addWard(b, p, (((BUILDS[p.build] || {}).altWard || 0) + fxVal(p, 'altWardAdd', 0, (a, v) => a + v)) * uqV(p, 'u_altWardMul', 1, (a, v) => a * v), undefined, true); /* M6-1 고유 sb_r2: 교대 보호막 ×2 */ if (g > 0) fxRun(p, 'onAltWard', b, p); /* 10월 16일 0.8.0 2단계: 교대의 박자 · 마력 순환 · 마검 과부하 */ b.rec.push({ k: 'alt', g: r1(g) }); logp(b, 'good', '⇄ 교대: 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward || 0) + '/' + wardMax(p) + ')'); fxRun(p, 'onAlt', b, p, k, b.sbRunNow); }
  if (b.sbAlt && !b.over) { /* 10월 17일 보완 1: 한 차례에 두 번째 교대(교대의 박자) → 보호막 +3(마검 과부하면 없음) · 다음 스킬 비용 −1. 보완 4: 마검 과부하는 교대 셋을 이으면 다음 유산 4 스킬 −3(전투마다 1번) */
    if (b.altCntT !== b.turnIdx) { b.altCntT = b.turnIdx; b.altCnt = 0; } b.altCnt++;
    if (b.altCnt === 2 && fxFlag(p, 'altDouble')) { const g = fxFlag(p, 'noAltWard') ? 0 : addWard(b, p, SB_ALT2.ward, undefined, true); const dc = SB_ALT2.off > 0 && !(SB_ALT2.max > 0 && (b.altDiscN || 0) >= SB_ALT2.max); if (dc) { b.altDisc = 1; b.altDiscN = (b.altDiscN || 0) + 1; } b.rec.push({ k: 'alt2x', g: r1(g) }); logp(b, 'good', '⇄⇄ 한 차례 두 번 교대' + (g > 0 ? ': 보호막 +' + Math.round(g) : '') + (dc ? ', 다음 스킬 유산 −' + SB_ALT2.off : '')); }
    if (b.sbRunNow >= SB_OVER.run && !b.ovGot && fxFlag(p, 'ovDisc')) { b.ovGot = 1; b.ovDisc = 1; b.rec.push({ k: 'ovready' }); logp(b, 'good', '마검 과부하: 교대 셋. 다음 유산 4 스킬 비용 −3'); } }
  if (b.sbAlt && b.sbRunNow >= 3 && !b.over && (b.ys3N || 0) < 2 && fxFlag(p, 'alt3Ys') && ysRefund(b, '세 박자')) b.ys3N = (b.ys3N || 0) + 1; // 노드 세 박자: 이어진 교대 3번째면 유산 +1(전투마다 2번, 환급 한도 공유)
  if (!b.sbNoAlt) { p.sbLast = b.sbBasicAlt ? 'basic' : k; p.sbRun = b.sbRun2 ? 0 : b.sbRunNow; } b.sbNoAlt = 0; b.sbAlt = false; b.sbRun2 = 0;
}
/* 수도승 자세 (stance, 10월 10일 단순화): 자세는 하나뿐이다. 내 다음 차례까지 전열 적의 직접 공격을 되받는다(받는 피해는 줄지 않는다. 줄이려면 방어). 덤은 겹치면 칸마다 큰 값.
   내 다음 차례의 첫 행동에서 지워진다. 옛 저장본의 half · max는 읽지 않는다 */
function monkStance(b, s, x, hz) {
  const p = b.p;
  const o = p.stance || {}; const mx = k => Math.max(o[k] || 0, x[k] || 0);
  p.stance = { dmg: mx('dmg'), brk: mx('brk'), ki: mx('ki'), chill: mx('chill'), weak: mx('weak'), red: mx('red'), /* 0.8.0 5단계 철산고 */ mul: mx('mul'), max: mx('max'), keep: mx('keep'), big: mx('big'), /* M5-2 금강 · 부동심 · 천근추 */ far: o.far || x.far ? 1 : 0, hz: hz ? { n: hz.n || 1, br: s.b, id: s.id, used: 0 } : (o.hz || null) };
  logp(b, 'good', s.n + '. ' + (p.stance.keep > 1 ? p.stance.keep + '차례 동안 ' : '내 다음 차례까지 ') + (p.stance.far ? '전열과 후열' : '전열') + ' 적의 직접 공격을 되받는다' + (p.stance.max > MONK.ctrMax ? '(' + p.stance.max + '번까지)' : ''));
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
  if (byMe && u !== b.p && b.p.build === 'assassin') n = asPsnIn(b, n); // 10월 18일 0.8.0 5단계 암살자: 독 기억(전투 처음 거는 독 +2) · 그림자 맹세의 대가(−30%, 최소 1)
  const cur = st(u, 'poison'); const nv = Math.min(Math.max(u !== b.p ? psnCapOf(b.p) : KW.poison, capOver || 0, cur), cur + n); // 10월 18일 0.8.0 5단계: 내가 거는 중독 상한 훅(psnCapOf, 원거리 초안 1-3)
  if (nv > cur) u.s.poison = { stacks: nv, until: POISON_FOREVER, dur: POISON_FOREVER };
  if (byMe && u !== b.p && nv > cur) { chargeEv(b, 'poison'); uqR(b.p, 'u_psnAct', b, b.p, u); } /* M6-1 고유 as_r4: 독을 건 행동 */
  return nv - cur;
}
/* 10월 18일 0.8.0 5단계 암살자 (원거리 초안 4-6): 내가 적에게 거는 독. 독 기억은 전투에서 처음 거는 독 하나에 +2(전투마다 한 번), 그림자 맹세의 대가는 그 뒤 ×0.7 반올림(최소 1) */
function asPsnIn(b, n) { const p = b.p; if (!b.asPsn1) { b.asPsn1 = 1; const f = asSum(p, 'psnFirst'); if (f) { n += f; fxHit('n_as_mem'); } } const c = asSum(p, 'psnCut'); if (c) { n = Math.max(1, Math.round(n * (1 - c))); fxHit('ks_as_oath'); } return n; }
/* M6-1 고유 as_h2: 스킬이 거는 중독 수에 더하기(u_skPsn, 바닥 1). 장비가 없으면 n 그대로 */
const uqSkPsn = (b, s, n) => { const a = uqA(b.p, 'u_skPsn', b, b.p, s); return a ? Math.max(1, n + a) : n; };
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


/* ===== 0.8.0 M5-5 원소술사 (10월 20일 만든 사람 설계지 2판): 원소 전환 · 빙결 · 강화 · 승부수 · 결합 칸 =====
   p.elSt = { el 마력탄의 원소('fire' 불 · 'ice' 얼음, 전투는 불로 시작), charge 마력 응축({n, mul}), kindle 불씨 응축({n, ign}), multi 마력 연사({n, shots}), basicEl 그 기본 공격에 원소({n, ign, chill}),
   cat · catT 촉매(이번 차례 열충격 배수), wardRed · wardU 마력 결계 · 고요한 방벽, protR 얼음 장벽 · 고요한 방벽({n, until} 내 차례마다 보호 채우기), ignGuard 열기 방패, avatar · avOnT 빙염의 화신(남은 차례 · 켜진 차례), stasisT 영겁의 정적, frostEmber · frostWall · manaFire 결합 칸 }.
   빙결(원소술사가 싸울 때만, 수도승 · 사냥꾼은 그대로): 둔화가 가득 차면(3) 다음 행동을 놓치고 둔화가 풀린다. 강적 · 보스는 대신 붕괴 +40. 열충격이 먼저다(elemShock 끝의 elFreeze).
   서리 무게: 둔화된 적이 주는 피해 −20%(큰 공격 포함, js/24). 숫자는 EL5_BOUND */
const IFX_EL = {
  cat: { shockMul: (b, p) => p.elSt.catT === b.turnIdx ? p.elSt.cat : 1 },
  wardRed: { inP: (b, p, o) => o && o.dot ? 0 : (p.elSt.wardU >= (b.round || 0) ? p.elSt.wardRed : 0) },
  ignGuard: { inP: (b, p, o) => o && !o.dot && o.src && o.src !== p && st(o.src, 'ignite') > 0 ? p.elSt.ignGuard : 0 }, // 열기 방패
};
const elAvOn = b => !!(b.p.elSt && b.p.elSt.avOnT != null && b.p.elSt.avOnT === b.turnIdx);
function elUse(b, s, targets, tgt) {
  const p = b.p, S = p.elSt = p.elSt || { el: 'fire' }, F = k => s.fx.find(e => e.k === k);
  { const t0 = tgt || (s.tgt !== 'self' && targets.length === 1 ? targets[0] : null); if (t0 && t0.alive && st(t0, 'chill') === 2) { const adds = k => s.fx.some(e => e.k === 'st' && e.s === k) || (F('elBolt') && (S.el === 'ice' ? 'chill' : 'ignite') === k) || (elAvOn(b) && s.tgt !== 'self'); b.rec.push({ k: 'ch2', id: s.id, a: F('elShatter') ? 'shatter' : adds('chill') && !adds('ignite') ? 'freeze' : adds('ignite') ? 'shock' : 'other' }); } } // 측정: 둔화 2인 적 앞에서 고른 것(얼리기 · 깨기 · 열충격)
  if (F('elSwitch')) { S.el = S.el === 'ice' ? 'fire' : 'ice'; logp(b, 'good', '원소 전환: 마력탄이 ' + (S.el === 'ice' ? '❄ 얼음(둔화 1)' : '🔥 불(화상 1)') + '이 된다'); }
  for (const r of s.fx.filter(e => e.k === 'elRimeR')) { p.rime = p.rime || {}; const c0 = p.rime[r.s]; const until = (b.round || 0) + (r.r || 2) - 1; p.rime[r.s] = { n: Math.max(c0 ? c0.n : 0, r.n || 1), times: ELEM.rimeMax, until: Math.max(c0 && c0.until ? c0.until : 0, until) }; logp(b, 'good', s.n + '. ' + (r.r || 2) + '라운드 동안 나를 친 적에게 ' + KW_N[r.s] + ' ' + p.rime[r.s].n); } // 불꽃 외투 · 서리 갑옷: 라운드로 끝나는 되얼림
  const ch = F('elCharge'); if (ch) { if (ch.ign || ch.chill) { S.kindle = { n: ch.n || 3, ign: ch.ign || 0, chill: ch.chill || 0 }; logp(b, 'good', s.n + ': 다음 기본 공격 ' + S.kindle.n + '번에 ' + (S.kindle.ign ? '화상 ' + S.kindle.ign : '둔화 ' + S.kindle.chill)); } else { S.charge = { n: ch.n || 3, add: Math.round(skillBaseDamage(p, s, ch.add || 6)) }; logp(b, 'good', s.n + ': 다음 기본 공격 ' + S.charge.n + '번 피해 +' + S.charge.add); } }
  const ml = F('elMulti'); if (ml) { S.multi = { n: ml.n || 2, shots: ml.shots || 2 }; logp(b, 'good', s.n + ': 다음 기본 공격 ' + S.multi.n + '번이 ' + S.multi.shots + '발'); }
  const ce = F('elChargeEl'); if (ce) S.basicEl = { n: (ch || ml || { n: 2 }).n || 2, ign: ce.ign || 0, chill: ce.chill || 0 };
  const ct = F('elCat'); if (ct) { S.cat = ct.mul || 1.5; S.catT = b.turnIdx; logp(b, 'good', '촉매: 이번 차례 열충격 ×' + S.cat); }
  const wd = F('elBarrier'); if (wd) { S.wardRed = wd.red || 0.4; S.wardU = (b.round || 0) + (wd.r || 3) - 1; logp(b, 'good', '마력 결계: ' + (wd.r || 3) + '라운드 동안 받는 피해 −' + Math.round(S.wardRed * 100) + '%'); }
  const pr = F('elProtR'); if (pr) { S.protR = { n: pr.n || 3, until: (b.round || 0) + (pr.r || 3) - 1 }; elProtFill(b, p); logp(b, 'good', s.n + ': ' + (pr.r || 3) + '라운드 동안 내 차례마다 보호 ' + S.protR.n + '까지'); }
  const ig = F('elIgnGuard'); if (ig) { S.ignGuard = Math.max(S.ignGuard || 0, ig.red || 0.4); logp(b, 'good', s.n + ': 이번 전투 동안 화상 걸린 적이 주는 피해 −' + Math.round(S.ignGuard * 100) + '%'); }
  const ca = F('elChillAll'); if (ca) for (const e of alive(b)) if (e.role !== 'root') addS(b, e, 'chill', ca.n || 1);
  const va = F('elVulnAll'); if (va) for (const e of alive(b)) if (e.role !== 'root') addS(b, e, 'vuln', va.n || 1);
  const vf = F('elVulnFocus'); if (vf) { const e = alive(b).filter(x => x.role !== 'root').sort((x, y) => y.hp - x.hp)[0]; if (e) { addS(b, e, 'vuln', vf.n || 1); logp(b, 'good', e.n + '에게 취약 ' + (vf.n || 1)); } }
  if (F('elFrostEmber')) { S.frostEmber = 1; logp(b, 'good', '얼어붙은 불씨: 이번 전투 동안 둔화 걸린 적에게 화상을 걸면 화상 +1'); }
  if (F('elFrostWall')) { S.frostWall = 1; logp(b, 'good', '서리 방벽: 이번 전투 동안 보호가 있을 때 나를 친 적에게 둔화 1'); }
  if (F('elManaFire')) { S.manaFire = 1; logp(b, 'good', '마염 화살: 이번 전투 동안 화상 걸린 적을 기본 공격으로 치면 화상 +1'); }
  const av = F('elAvatar'); if (av) { S.avatar = av.r || 3; S.avatarT = b.turnIdx; logp(b, 'crit', '빙염의 화신: 다음 ' + S.avatar + '차례 동안 내 모든 공격이 화상 1과 둔화 1을 함께 건다 — 그 차례마다 최대 생명력의 ' + Math.round(EL5_BOUND.avatarHp * 100) + '%를 잃는다'); }
  const ss = F('elStasis'); if (ss) { let k = 0; for (const e of alive(b)) { if (e.role === 'root') continue; if (e.strong || e.role === 'boss') { b.elNoFrz = 1; addS(b, e, 'chill', EL5_BOUND.stasisChill); b.elNoFrz = 0; if (ss.brk) addBreak(b, e, ss.brk); } else { const tl = ysBigTele(e); e.stun = Math.max(e.stun || 0, ss.r || 1); k++; if (tl) ysResp(b, '끊기'); } }
    p.stun = Math.max(p.stun || 0, 1); S.stasisT = b.turnIdx; logp(b, 'crit', '영겁의 정적: 모든 것이 멈춘다 — 적 ' + k + '이(가) ' + ((ss.r || 1) > 1 ? ss.r + '번' : '') + ' 행동을 놓친다(강적 · 보스는 둔화 ' + EL5_BOUND.stasisChill + '). 나도 다음 차례를 쉰다'); b.rec.push({ k: 'elStasis', n: k }); }
  const mt = F('elMeteor'); if (mt) { const hp = Math.floor(p.hp * EL5_BOUND.meteorHp); p.hp = Math.max(1, p.hp - hp); logp(b, 'bad', '천화: 생명력 ' + hp + '을(를) 불의 비에 바친다'); }
}
/* 타격 피해(runSkill2 대상 고리): 비전 일격 = 취약 걸린 적에게 ×, 빙결 파쇄 = 둔화 1마다 피해 더함(지능으로 큼). 원소술사 무기 피해는 시작 4라 무기 피해 배수를 쓰지 않는다 */
function elBase(b, s, e, base, h, c0) { const p = b.p, F = k => s.fx.find(x => x.k === k);
  const ar = F('elArcane'); if (ar && st(e, 'vuln') > 0) base *= ar.mul || 2;
  const sh = F('elShatter'); if (sh && h === 0 && c0 > 0) base += skillBaseDamage(p, s, (sh.per || 8) * c0);
  return base; }
/* 맞힌 뒤(첫 타격, 이 스킬의 상태를 건 뒤): 마력탄의 원소 · 둔화 비례 붕괴 · 얼음 깨기 · 화상 번지기 · 빙염의 화신 */
function elHit(b, s, e, c0, hit) { const p = b.p, S = p.elSt || {}, F = k => s.fx.find(x => x.k === k);
  { const r3 = hit && c0 > 0 ? uqA(p, 'u_elChillHit', b, s) : 0; if (r3 && e.alive) addS(b, e, 'chill', r3); } /* M6-1 고유 el_r3: 둔화 걸린 적을 서리 스킬로 치면 둔화 +2 */
  { const bo = F('elBolt'); if (bo && hit) addS(b, e, S.el === 'ice' ? 'chill' : 'ignite', (bo.n || 1) + (S.el === 'ice' ? 0 : uqA(p, 'u_boltIgn', b)) + uqV(p, 'u_boltSt', 0, (a, v) => a + v) /* M6-1 접사 el_boltSt */); } /* M6-1 고유 el_h1: 불 마력탄 화상 +1 */
  const cb = F('elChillBrk'); if (cb && c0 > 0) { addBreak(b, e, cb.per * c0); logp(b, 'good', e.n + '의 둔화 ' + c0 + ': 붕괴 +' + cb.per * c0); }
  const sh = F('elShatter'); if (sh && c0 > 0 && e.alive) { delete e.s.chill; e.chillR = 0; e.frzP = 0; logp(b, 'good', e.n + '의 얼음을 깨뜨린다. 둔화 ' + c0 + '만큼 피해를 더했다'); b.rec.push({ k: 'elShatter', n: c0 }); }
  const sp = F('elSpreadIgn'); if (sp && e.alive) { const n = Math.floor(st(e, 'ignite') * (sp.per || 0.5)); let k = 0; if (n > 0) for (const o of alive(b)) if (o !== e && o.role !== 'root') { addS(b, o, 'ignite', n); k++; } if (k) logp(b, 'good', e.n + '의 불이 번진다. 다른 적 모두에게 화상 ' + n); }
  if (hit && e.alive && elAvOn(b)) { addS(b, e, 'ignite', 1); addS(b, e, 'chill', 1); }
}
/* 기본 공격(js/32): 마력 응축 더하기(치기 전, 지능으로 큰 값) · 마력 연사 덧쏘기 · 불씨 응축 · 그 기본 공격의 원소 · 마염 화살 · 빙염의 화신(친 뒤) */
function elBasicAdd(b, tgt) { const S = b.p.elSt; S.mfPre = tgt ? st(tgt, 'ignite') : 0; let a = 0; if (S.charge && S.charge.n > 0) { a = S.charge.add; S.charge.n--; logp(b, 'good', '마력 응축: 이 마력 화살 피해 +' + a + (S.charge.n ? ' (남은 ' + S.charge.n + '번)' : '')); if (S.charge.n <= 0) S.charge = null; } return a ? outDmg(b, a, {}) : 0; }
function elBasicAfter(b, tgt, d, melee1) { const p = b.p, S = p.elSt; if (!tgt) return;
  let n = 0; if (S.multi && S.multi.n > 0) { n = S.multi.shots - 1; S.multi.n--; if (S.multi.n <= 0) S.multi = null; }
  for (let i = 0; i < n && tgt.alive && !b.over; i++) hurtEnemy(b, tgt, d, { single: 1, melee: melee1, label: '마력 연사' });
  if (!tgt.alive || b.over) return;
  { const r3 = st(tgt, 'chill') > 0 ? uqA(p, 'u_elChillHit', b, 'basic') : 0; if (r3) addS(b, tgt, 'chill', r3); } /* M6-1 고유 el_r3: 둔화 걸린 적을 기본 공격으로 치면 둔화 +2 */
  if (S.kindle && S.kindle.n > 0) { if (S.kindle.ign) addS(b, tgt, 'ignite', S.kindle.ign); if (S.kindle.chill) addS(b, tgt, 'chill', S.kindle.chill); S.kindle.n--; if (S.kindle.n <= 0) S.kindle = null; }
  if (S.basicEl && S.basicEl.n > 0) { if (S.basicEl.ign) addS(b, tgt, 'ignite', S.basicEl.ign); if (S.basicEl.chill) addS(b, tgt, 'chill', S.basicEl.chill); S.basicEl.n--; if (S.basicEl.n <= 0) S.basicEl = null; }
  if (S.manaFire && S.mfPre > 0) { addS(b, tgt, 'ignite', 1); logp(b, 'good', '마염 화살: ' + tgt.n + '에게 화상 +1'); }
  if (elAvOn(b)) { addS(b, tgt, 'ignite', 1); addS(b, tgt, 'chill', 1); }
}
/* 내 차례 시작(js/32 prepTurn): 촉매 끝 · 빙염의 화신(그 차례에 켜고 최대 생명력 5%) */
function elProtFill(b, p) { const S = p.elSt; if (!S.protR) return; if ((b.round || 0) > S.protR.until) { S.protR = null; return; } const c = st(p, 'protect'); if (c < S.protR.n) addS(b, p, 'protect', S.protR.n - c); }
function elTurnStart(b, p) { const S = p.elSt; if (S.cat && S.catT !== b.turnIdx) S.cat = 0; if (S.protR) elProtFill(b, p);
  if (S.avatar > 0 && S.avatarT !== b.turnIdx) { S.avatar--; S.avOnT = b.turnIdx; const hp = Math.max(1, Math.round(p.hpMax * EL5_BOUND.avatarHp)); p.hp = Math.max(1, p.hp - hp); logp(b, 'bad', '빙염의 화신: 생명력 −' + hp + (S.avatar ? ' (남은 ' + S.avatar + '차례)' : ' (마지막 차례)')); } }
/* 빙결(elemShock 끝, 열충격 뒤): 이번에 둔화가 가득 찬 적(addS의 e.frzP). 영겁의 정적이 거는 둔화 3은 얼리지 않는다(b.elNoFrz) */
function elFreeze(b, by) { for (const e of b.en) { if (!e.frzP) continue; e.frzP = 0; if (!e.alive || b.over || e.role === 'root' || st(e, 'chill') < KW.chill) continue;
  delete e.s.chill; e.chillR = 0;
  if (e.strong || e.role === 'boss') { const fb = uqV(b.p, 'u_frzBrk', EL5_BOUND.frzBrk, (a, v) => Math.max(a, v)) + uqV(b.p, 'u_freezeBrk', 0, (a, v) => a + v); /* M6-1 접사 el_freezeBrk */ /* M6-1 고유 el_h3: 붕괴 +40 → +60 */ addBreak(b, e, fb); logp(b, 'good', e.n + '이(가) 얼어붙다 만다. 둔화가 풀리고 붕괴 +' + fb); b.rec.push({ k: 'freeze', big: 1, by }); }
  else { const tl = ysBigTele(e); e.stun = Math.max(e.stun || 0, 1); if (b.p.g8u) e.uqFrz = 1; /* M6-1 고유 el_h8: 얼어서 놓치는 행동 표시(js/30) */ logp(b, 'crit', '빙결: ' + e.n + '이(가) 얼어붙는다. 다음 행동을 놓친다'); if (tl) ysResp(b, '끊기'); b.rec.push({ k: 'freeze', big: 0, by }); } } }
/* M6-1 고유 장비 읽는 곳(원소술사): 주문의 상태 더하기(el_h2) · 마력 화살 무기 피해 배율(el_h5, basicBase) · 미리 보기용 조용한 합(발동을 세지 않는다) */
const elStAdd = (b, s, x) => uqA(b.p, 'u_elStAdd', b, s, x);
const elWpnK = p => { const m = uqV(p, 'u_wpnMul', 0, (a, v) => Math.max(a, v)); return m ? m / ((BUILDS[p.build] || {}).wpnMul || 1) : 1; };
const elUqQ = (p, k, ...a) => p && p.g8u ? fxList(p).reduce((t, [, f]) => t + (f[k] == null ? 0 : typeof f[k] === 'function' ? f[k](...a) || 0 : f[k]), 0) : 0;
/* 서리 방벽(js/24): 보호가 있을 때 나를 친 적에게 둔화 1 */
function elFrostWallHit(b, src) { if (!src || !src.alive || src.role === 'root') return; const g = addS(b, src, 'chill', 1); if (g) logp(b, 'good', '서리 방벽: ' + src.n + '에게 둔화 1'); }
/* ===== 0.8.0 M5-4 사냥꾼 (10월 20일 만든 사람 설계지 2판): 강화 · 승부수 · 결합 칸 =====
   p.hnSt = { nock 화살 재기({n, shots}), nockChill({n, chill}), carry 끝없는 사냥, windStep 바람 걸음 · windDisc, veilU · veilR 바람의 장막,
   draw 만궁({mul, per, brk}) · drawT, gale 질풍난사(남은 라운드) · galeBleed, trap 혈향의 덫({mul, brk, bleed}) · trapT, chase 추격, scent 피 냄새, frozen 얼어붙은 사냥감 }.
   연계(다른 갈래)는 피해 대신 빠른 행동(js/32). 몸 빼기로 피하면 대응 충전 없음(js/24). 가속은 개전 · 질풍난사만(js/34). 숫자는 HN5_BOUND */
const IFX_HN = {
  draw: { inP: (b, p, o) => o && o.dot ? 0 : -HN5_BOUND.drawIn },
  gale: { inP: (b, p, o) => o && o.dot ? 0 : -HN5_BOUND.galeIn },
};
const hnFoc = (b, e, n, set) => { const p = b.p; if (!e || !e.alive) return; const cur = p.focus && p.focus.id === e.id ? p.focus.n : p.focus && p.focus.n > 0 && uqF(p, 'u_focKeep1') ? 1 : 0; /* M6-1 고유 hn_h2: 표적을 바꿔도 1겹 */ p.focus = { id: e.id, n: Math.min(focusCapOf(p), set != null ? Math.max(cur, set) : cur + n) }; };
function hnVolleySeq(b, tgt, n) { const o = alive(b).filter(e => e !== tgt && e.role !== 'root').sort((x, y) => x.hp - y.hp); const L = [tgt].concat(o); const out = []; for (let i = 0; i < n; i++) out.push(L[i % L.length]); return out; }
function hnUse(b, s, targets, tgt) {
  const p = b.p, S = p.hnSt = p.hnSt || {}, F = k => s.fx.find(e => e.k === k);
  const lk = F('hnLock'); if (lk) hnBbufSet(b, { s: 'lock', mul: lk.per, r: lk.r }, s);
  const nk = F('hnNock'); if (nk) { S.nock = { n: (nk.n || 2) + uqV(p, 'u_nockN', 0, (a, v) => a + v), shots: nk.shots || 2 }; /* M6-1 고유 hn_h4: 기본 공격을 세게 하는 효과의 횟수 +1 */ logp(b, 'good', s.n + ': 다음 기본 공격 ' + S.nock.n + '번이 ' + S.nock.shots + '발'); }
  const nc = F('hnNockChill'); if (nc) S.nockChill = { n: 2, chill: nc.n || 1 };
  const fs = F('hnFocusSelf'); if (fs && p.focus) { const e = alive(b).find(x => x.id === p.focus.id); if (e) { hnFoc(b, e, fs.n || 1); logp(b, 'good', e.n + '에게 추적 ' + p.focus.n + '겹'); } }
  const ca = F('hnChillAll'); if (ca) for (const e of alive(b)) if (e.role !== 'root') addS(b, e, 'chill', ca.n || 1);
  if (F('hnCarry')) { S.carry = 1; logp(b, 'good', '끝없는 사냥: 이번 전투 동안 추적한 적이 쓰러지면 추적이 다음 적에게 넘어간다'); }
  if (F('hnWindStep')) { S.windStep = 1; logp(b, 'good', '바람 걸음: 이번 전투 동안 피할 때마다 다음 기동 스킬 유산 −1'); }
  const wv = F('hnWindVeil'); if (wv) { S.veilU = (b.round || 0) + (wv.r || 3); logp(b, 'good', '바람의 장막: ' + (wv.r || 3) + '라운드 동안 공격을 받을 때마다 몸 빼기 1(라운드에 한 번)'); }
  if (F('hnChaseC')) { S.chase = F('hnChaseC').n || 1; logp(b, 'good', '추격: 이번 전투 동안 피할 때마다 그 적에게 추적 +' + S.chase + '겹'); }
  if (F('hnScent')) { S.scent = F('hnScent').n || 1; logp(b, 'good', '피 냄새: 이번 전투 동안 출혈 걸린 적을 맞히면 추적 +' + S.scent + '겹'); }
  if (F('hnFrozen')) { S.frozen = F('hnFrozen').mul || 1.5; logp(b, 'good', '얼어붙은 사냥감: 이번 전투 동안 둔화 걸린 적에게 기본 공격 ×' + S.frozen); }
  const dr = F('hnDraw'); if (dr) { S.draw = { mul: dr.mul || 3, per: dr.per || 1, brk: dr.brk || 0 }; S.drawT = (b.turnIdx || 0) + 1; logp(b, 'good', '만궁: 시위를 끝까지 당긴다. 다음 차례 추적한 적에게 무기 피해의 ' + S.draw.mul + '배(추적 겹마다 +' + S.draw.per + '배) — 그동안 받는 피해 +' + Math.round(HN5_BOUND.drawIn * 100) + '%'); }
  const gl = F('hnGale'); if (gl) { S.gale = gl.r || 3; S.galeBleed = gl.bleed || 0; p.evade = 0; p.evadeCtr = null; logp(b, 'good', '질풍난사: ' + S.gale + '라운드 동안 매 라운드 두 번 움직이고 기본 공격이 두 발 — 그동안 몸 빼기 · 방어 불가, 받는 피해 +' + Math.round(HN5_BOUND.galeIn * 100) + '%'); }
  const tp = F('hnTrap'); if (tp) { const hp = Math.round(p.hpMax * HN5_BOUND.trapHp); p.hp = Math.max(1, p.hp - hp); S.trap = { mul: tp.mul || 0, brk: tp.brk || 0, bleed: tp.bleed || 0 }; S.trapR = b.round || 0; /* 깐 뒤 다음 라운드의 내 차례 전까지 나를 치는 적 */ logp(b, 'good', '혈향의 덫: 생명력 −' + hp + '을 미끼로 흘린다. 이번 라운드 나를 치는 적은 다음 행동을 놓치고 추적 ' + HN5_BOUND.trapFocus + '겹이 된다'); }
}
/* 연계 빠른 행동: 방금 쓴 스킬과 다른 갈래(시작 스킬 · 기본 공격 · 강공격은 연계를 만들지도 끊지도 않음), 빠르기 '보통'인 스킬만, 내 차례에 한 번(이어 쏘기 숙련 두 번) */
const hnLinkMax = p => fxFlag(p, 'hnLinkUp') ? HN5_BOUND.linkMaxUp : HN5_BOUND.linkMax;
const hnLinkUsed = b => b.hnLinkT === b.turnIdx ? (b.hnLinkN || 0) : 0;
const hnLinkFastOk = (b, a) => !!(b.p.build === 'hunter' && a && a.v2 && a.s && a.s.time === 'normal' && linkOn(b, a) && hnLinkUsed(b) < hnLinkMax(b.p));
/* 피했을 때(js/24): 바람 걸음 할인 · 추격 · 반격의 추적 */
function hnOnEvade(b, src) { const p = b.p, S = p.hnSt; if (!S) return; if (S.windStep && !S.windDisc) { S.windDisc = 1; logp(b, 'good', '바람 걸음: 다음 기동 스킬 유산 −1'); }
  if (S.chase && src && src.alive && src.role !== 'root') { hnFoc(b, src, S.chase); logp(b, 'good', '추격: ' + src.n + '에게 추적 ' + p.focus.n + '겹'); } }
/* 맞았을 때(js/24, 지속 피해 아님): 바람의 장막 · 혈향의 덫 */
function hnOnHit(b, src) { const p = b.p, S = p.hnSt; if (!S) return;
  if (S.veilU >= (b.round || 0) && S.veilR !== (b.round || 0) && !(S.gale > 0)) { S.veilR = b.round || 0; p.evade = Math.min(hnEvCap(p), (p.evade || 0) + 1); /* M6-1 고유 hn_r2 */ logp(b, 'good', '바람의 장막: 몸 빼기 1'); }
  if (S.trap && src && src.alive && src.role !== 'root' && src.hnTrapR !== S.trapR) { src.hnTrapR = S.trapR; src.stun = Math.max(src.stun || 0, 1); hnFoc(b, src, 0, HN5_BOUND.trapFocus); logp(b, 'crit', src.n + '이(가) 혈향의 덫에 걸린다. 다음 행동을 놓치고 추적 ' + p.focus.n + '겹');
    if (S.trap.mul > 0) hurtEnemy(b, src, outDmg(b, wpnDmg(p) * S.trap.mul, { weapon: 1 }), { single: 1, label: '혈향의 덫' }); if (S.trap.brk && src.alive) addBreak(b, src, S.trap.brk); if (S.trap.bleed && src.alive) addS(b, src, 'bleed', S.trap.bleed); } }
function hnTurnStart(b, p) { const S = p.hnSt; if (S.draw && S.drawT !== b.turnIdx) { S.draw = null; logp(b, 'sys', '만궁: 쏠 때를 놓쳤다'); } if (S.trap && (b.round || 0) !== S.trapR) S.trap = null; }
function hnShot(b, tgt) { const p = b.p, S = p.hnSt, D = S.draw; S.draw = null; const fe = p.focus && alive(b).find(e => e.id === p.focus.id && e.role !== 'root'); const t = fe || tgt; if (!t || !t.alive) return;
  const fn = p.focus && p.focus.id === t.id ? p.focus.n : 0; const mul = D.mul + D.per * fn; logp(b, 'crit', '만궁: ' + t.n + '에게 끝까지 당긴 한 발. 무기 피해의 ' + r1(mul) + '배');
  hurtEnemy(b, t, outDmg(b, wpnDmg(p) * mul, { weapon: 1 }), { single: 1, label: '만궁' }); if (D.brk && t.alive) addBreak(b, t, D.brk); }
/* 기본 공격(js/32): 화살 재기 · 질풍난사 두 번째 화살 · 얼어붙은 사냥감 · 얼린 화살촉 */
function hnBasicExtra(b, tgt, d, melee1) { const p = b.p, S = p.hnSt; if (!S || !tgt) return;
  let n = 0; if (S.nock && S.nock.n > 0) { n += S.nock.shots - 1; S.nock.n--; if (S.nock.n <= 0) S.nock = null; } if (S.gale > 0) n += 1;
  for (let i = 0; i < n && tgt.alive && !b.over; i++) { hurtEnemy(b, tgt, d, { single: 1, melee: melee1, label: '덧쏜 화살' }); if (S.gale > 0 && S.galeBleed && tgt.alive) addS(b, tgt, 'bleed', S.galeBleed); }
  if (S.nockChill && S.nockChill.n > 0 && tgt.alive) { addS(b, tgt, 'chill', S.nockChill.chill); S.nockChill.n--; if (S.nockChill.n <= 0) S.nockChill = null; } }
/* ===== 0.8.0 M5-3 암살자 (10월 20일 만든 사람 설계지 4판): 강화 · 승부수 · 결합 칸 =====
   p.asSt = { nextPsn 독침({n, poison}), plague 역병, flowBlade 흘린 칼({mul, poison}) · fbTurn, dance 칼춤, nextBurst 꽃잎 모으기, veil 독의 장막({n, poison}),
   hide 무영살 숨음 · mu 다음 차례 베기({mul, poison}) · noParry, zan 잔영난무({n, poison}) · noStam, fang 독니 · parPsn 흘린 독 · backFlower 등 뒤의 꽃 }.
   공통 판정: 흘려 베기의 반격은 기본 공격(독침 · 독니가 붙는다), 추가로 생긴 공격(반격 · 칼춤)은 추가 공격을 부르지 않고 잔영의 두 번 · 흘린 칼도 받지 않는다. 숫자는 AS_BOUND */
const IFX_AS = {
  zan: { inP: (b, p, o) => o && o.dot ? 0 : -AS_BOUND.zanIn },
};
const AS_N = { veil: '독의 장막', zan: '잔영난무', noStam: '잔영난무의 대가', noParry: '무영살의 대가' };
function asUse(b, s, targets, tgt) {
  const p = b.p, S = p.asSt = p.asSt || {}, F = k => s.fx.find(e => e.k === k);
  const np = F('asNextPsn'); if (np) { S.nextPsn = { n: np.n || 2, poison: np.poison || 1 }; logp(b, 'good', s.n + ': 다음 기본 공격 ' + S.nextPsn.n + '번에 중독 ' + S.nextPsn.poison); }
  const pl = F('asPlague'); if (pl) { S.plague = pl.mul || 1; logp(b, 'good', '역병: 이번 전투 동안 쓰러진 적의 중독이 다른 적에게 옮겨붙는다'); }
  const fb = F('asFlowBlade'); if (fb) { S.flowBlade = { mul: fb.mul || AS_BOUND.flowMul, poison: fb.poison || 0 }; logp(b, 'good', '흘린 칼: 이번 전투 동안 흘려 낸 다음 차례 첫 기본 공격 ×' + S.flowBlade.mul); }
  const dc = F('asDance'); if (dc) { S.dance = { mul: dc.mul || 1, poison: dc.poison || 0 }; logp(b, 'good', '그림자 칼춤: 이번 전투 동안 흘려 낼 때마다 기본 공격 +1회'); }
  const nb = F('asNextBurst'); if (nb) { S.nextBurst = Math.max(S.nextBurst || 1, nb.mul || 1.5); logp(b, 'good', s.n + ': 다음 터뜨리기 피해 ' + S.nextBurst + '배'); }
  const vl = F('asVeil'); if (vl) { S.veil = { n: vl.n || 3, poison: vl.poison || 2 }; logp(b, 'good', s.n + ': ' + S.veil.n + '차례 동안 나를 친 적에게 중독 ' + S.veil.poison); }
  { const fc = F('asFangC'); if (fc) { S.fang = fc.n || AS_BOUND.fangPsn; logp(b, 'good', '독니: 이번 전투 동안 중독 걸린 적을 기본 공격으로 치면 중독 +' + S.fang); } }
  const pp = F('asParPsn'); if (pp) { S.parPsn = pp.n || 2; logp(b, 'good', '흘린 독: 이번 전투 동안 흘려 낼 때 그 적 중독 +' + S.parPsn); }
  { const bf = F('asBackFlower'); if (bf) { S.backFlower = bf.mul || AS_BOUND.backFlower; logp(b, 'good', '등 뒤의 꽃: 이번 전투 동안 후열 적에게 터뜨리기 ' + S.backFlower + '배'); } }
  const hd = F('asHide'); if (hd) { S.hide = 1; S.mu = { mul: hd.mul || 3, poison: hd.poison || 0, brk: hd.brk || 0 }; S.muT = (b.turnIdx || 0) + 1; /* 베기는 숨은 다음 차례(주 행동이 끝나면 turnIdx +1)에만 */ logp(b, 'good', '무영살: 숨는다. 이번 차례 어떤 공격의 표적도 되지 않고, 다음 차례 고른 적의 등 뒤에서 무기 피해의 ' + S.mu.mul + '배로 벤다'); }
  const zn = F('asZan'); if (zn) { S.zan = (zn.n || 3) + 1; /* 쓴 차례(주 행동이라 끝남) 뒤 내 차례 n번: 차례 시작마다 −1 */ S.zanPsn = zn.poison || 0; S.zanBrk = zn.brk || 0; S.zanMul = zn.mul || 1; logp(b, 'good', '잔영난무: ' + (zn.n || 3) + '차례 동안 내가 누른 기본 공격이 두 번 들어간다 (받는 피해 +' + Math.round(AS_BOUND.zanIn * 100) + '%, 끝난 뒤 ' + AS_BOUND.zanNoStam + '차례 스태미나가 차지 않는다)'); }
  const bl = F('asBloom'); if (bl && tgt && tgt.alive) { // 만독개화: 대가 먼저(지금 생명력에서 최대치의 15%, 이 대가로 쓰러지지 않음), 그 뒤 모든 적의 중독을 대상에게 모은다(터뜨리기는 runSkill2의 burst가 아니라 아래에서)
    const hp = Math.round(p.hpMax * AS_BOUND.bloomHp); p.hp = Math.max(1, p.hp - hp); let sum = 0; for (const e of alive(b)) { const n = st(e, 'poison'); if (n > 0) { sum += n; delete e.s.poison; } }
    const n = Math.min(psnCapOf(p) + 10, sum); logp(b, 'good', '만독개화: 생명력 −' + hp + '. 모든 적의 중독 ' + sum + '을(를) ' + tgt.n + '에게 모은다'); if (n > 0) { tgt.s.poison = { stacks: n, until: POISON_FOREVER, dur: POISON_FOREVER };
      const mul = Math.max(bl.mul || 2, asBurstMul(b, s, { mul: 1 }, tgt)); const total = poisonTotal(n) * mul * triggerDamageMul(p); delete tgt.s.poison; (b.asBursts = b.asBursts || []).push([s.id, n, b.round || 0]);
      logp(b, 'crit', tgt.n + '의 몸에서 독이 꽃처럼 터진다. 중독 ' + n + ' × ' + mul + '배'); hurtEnemy(b, tgt, outDmg(b, total, {}), { single: 1, burst: 1, label: s.n }); } }
}
/* 터뜨리기 배수(판정 ⑥): 격발 찌르기 · 독 결산(정예 · 강적 · 보스) · 꽃잎 모으기 · 등 뒤의 꽃(후열) 가운데 가장 큰 하나. 꽃잎 모으기는 쓰면 사라진다 */
function asBurstMul(b, s, bu, e) { const S = b.p.asSt || {}; const c = [bu.mul || 1, bu.big && (e.elite || e.strong || e.role === 'boss') ? bu.big : 1, S.nextBurst || 1, S.backFlower && e.row === 'back' ? S.backFlower : 1]; if (S.nextBurst) S.nextBurst = 0; return Math.max(...c); }
function asPost(b, s, targets, killed) {
  const p = b.p, S = p.asSt = p.asSt || {}, F = k => s.fx.find(e => e.k === k);
  if (F('asTwin')) { const ps = s.fx.find(e => e.k === 'poison'); const t0 = targets[0]; const o = alive(b).filter(e => e !== t0 && e.role !== 'root').sort((x, y) => (y.row === 'back') - (x.row === 'back'))[0]; if (o && ps) { const g = addPoison(b, o, uqSkPsn(b, s, ps.n), 1); /* M6-1 고유 as_h2 */ logp(b, 'good', s.n + ': ' + o.n + '에게도 중독 ' + g); } }
  if (F('asVirulent')) for (const e of targets) if (e.alive) { e.asVir = 1; logp(b, 'good', e.n + '에게 맹독: 라운드가 끝날 때 중독이 ' + AS_BOUND.virMin + ' 이상이면 줄지 않고 1 는다'); }
  if (F('asChain') && killed > 0 && !b.over && alive(b).some(e => e.role !== 'root')) { b.asChainAgain = s.id; logp(b, 'good', s.n + ': 쓰러뜨렸다. 이번 차례 한 번 더 쓸 수 있다(유산은 다시 낸다)'); }
}
/* 기본 공격의 덧붙는 효과(내가 누른 기본 공격 · 흘려 베기 반격 · 칼춤 공격 모두): 독침 · 독니 */
function asOnBasic(b, e) { const S = b.p.asSt; if (!S || !e || !e.alive) return;
  if (S.nextPsn && S.nextPsn.n > 0) { const g = addPoison(b, e, S.nextPsn.poison, 1); S.nextPsn.n--; logp(b, 'good', '독침: ' + e.n + '에게 중독 ' + g + (S.nextPsn.n ? ' (남은 ' + S.nextPsn.n + '번)' : '')); if (S.nextPsn.n <= 0) S.nextPsn = null; }
  if (S.fang && st(e, 'poison') > 0) { addPoison(b, e, S.fang, 1); logp(b, 'good', '독니: ' + e.n + ' 중독 +' + S.fang); } }
/* 추가로 생긴 기본 공격(반격 · 칼춤): 기본 공격 피해 · 붕괴, 기본 공격 효과는 붙지만 추가 공격을 다시 부르지 않는다 */
function asExtraBasic(b, e, label, mul, poison) { const p = b.p; if (!e || !e.alive || b.over) return 0; const cur = b.cur; b.cur = { id: 'basic', grp: 'basic', extra: 1 };
  const d = hurtEnemy(b, e, outDmg(b, basicBase(p) * (mul || 1), { weapon: 1 }), { single: 1, melee: 1, label }); if (e.alive) addBreak(b, e, 10); if (poison && e.alive) addPoison(b, e, poison, 1); asOnBasic(b, e); b.cur = cur; b.asBasicX = (b.asBasicX || 0) + d; return d; } // b.asBasicX: 측정(평타 몫)에 기본 공격으로 넣는다
/* 흘려 냈을 때(hurtPlayer): 흘린 독 · 흘린 칼(다음 차례 표시) · 흘려 베기 반격 · 칼춤 */
function asOnParry(b, src, on) { const p = b.p, S = p.asSt = p.asSt || {};
  if (S.parPsn && src && src.alive) { const g = addPoison(b, src, S.parPsn, 1); logp(b, 'good', '흘린 독: ' + src.n + ' 중독 +' + g); }
  if (S.flowBlade) S.fbTurn = b.turnIdx || 0;
  if (on && on.basic && src && src.alive) asExtraBasic(b, src, '흘려 베기 반격', on.basic);
  if (on && on.basic && src && src.alive && !b.over && uqF(p, 'u_ctrTwice')) asExtraBasic(b, src, '흘려 베기 반격(그림자 외투)', on.basic); /* M6-1 고유 as_h5: 반격이 두 번(추가 반격은 extra) */
  if (S.dance && src && src.alive) asExtraBasic(b, src, '그림자 칼춤', S.dance.mul, S.dance.poison); }
function asTurnStart(b, p) { const S = p.asSt;
  if (S.hide) { S.hide = 0; if (S.mu) logp(b, 'good', '무영살: 등 뒤로 돈다. 이번 차례 고른 적을 벤다'); } else if (S.mu && S.muT !== b.turnIdx) { S.mu = null; logp(b, 'sys', '무영살: 벨 때를 놓쳤다'); } // 베기는 숨은 다음 차례에만
  for (const k of ['veil', 'noStam', 'noParry', 'zan']) { /* zan이 끝나며 건 noStam은 다음 차례부터 센다 */ const c = k === 'veil' ? S.veil && S.veil.n : S[k]; if (c > 0) { if (k === 'veil') { S.veil.n--; if (!S.veil.n) { S.veil = null; logp(b, 'sys', '독의 장막이 걷힌다'); } } else { S[k]--; if (!S[k]) { logp(b, 'sys', AS_N[k] + '이(가) 걷힌다'); if (k === 'zan') S.noStam = AS_BOUND.zanNoStam; } } } } }
function asMuStrike(b, tgt) { const p = b.p, S = p.asSt; const M = S.mu; S.mu = null; if (!tgt || !tgt.alive) return; logp(b, 'crit', '무영살: ' + tgt.n + '의 등 뒤에서 벤다');
  hurtEnemy(b, tgt, outDmg(b, wpnDmg(p) * M.mul, { weapon: 1 }), { single: 1, melee: 1, label: '무영살' }); if (M.poison && tgt.alive) addPoison(b, tgt, M.poison, 1); if (M.brk && tgt.alive) addBreak(b, tgt, M.brk); S.noParry = AS_BOUND.hideNoParry; logp(b, 'bad', '무영살의 대가: ' + AS_BOUND.hideNoParry + '차례 흘리기를 못 한다'); }
/* ===== 0.8.0 M5-2 수도승 (10월 20일 만든 사람 설계지 2판): 강화 · 승부수 · 결합 칸 =====
   p.mkSt = { condense 기공 응축, adamant 금강불괴, flow 내공 순환, nextBrk 다음 기본 공격 붕괴(M5-7 붕괴 규칙을 켜면 다음 강공격), yeok 역천(자세 유지 · 되받기 한도 없음 · 붕괴 +15 / 방어 불가 · 받는 피해 +30%),
   cheon 천망(나를 친 적 둔화 +2, 둔화 5면 봉인 / 되받기 피해 0), noKi 일지멸맥의 대가, samjae · reflux · bultoe 결합 칸 }. 남은 차례 수는 내 차례가 시작될 때 −1(mkTurnStart). 숫자는 MK_BOUND */
const IFX_MK = {
  adamant: { inP: (b, p, o) => o && o.dot ? 0 : MK_BOUND.adamantRed },
  yeok: { inP: (b, p, o) => o && o.dot ? 0 : -MK_BOUND.yeokIn },
  flow: { out: (b, p, c) => c && !b.curFast ? 1 + (p.mkSt.flowMul || 0.5) : 1 },
  reflux: { onHit: (b, p, e, o, c) => { if (!c || c.id !== 'basic' || !e || !(st(e, 'chill') > 0)) return; b.kiPend = (b.kiPend || 0) + MK_BOUND.refluxKi; logp(b, 'good', '역류: 둔화된 적을 쳐 기 +' + MK_BOUND.refluxKi); return 1; } },
  nextBrk: { onHit: (b, p, e, o, c) => { if (!brkB(c) || !p.mkSt || !(p.mkSt.nextBrk > 0)) return; const n = p.mkSt.nextBrk; p.mkSt.nextBrk = 0; if (e.alive) { addBreak(b, e, n); logp(b, 'good', '강공격에 실은 무게: 붕괴 +' + n); } return 1; } },
};
const MK_N = { adamant: '금강불괴', flow: '내공 순환', yeok: '역천', cheon: '천망', noKi: '일지멸맥의 대가' };
function mkUse(b, s) {
  const p = b.p, S = p.mkSt = p.mkSt || {}, U = MK_BOUND, F = k => s.fx.find(e => e.k === k);
  const ch0 = F('mkChain'); if (ch0) { S.chain = { add: ch0.add || 0, per: ch0.per || 1, max: ch0.max || 5, brk: ch0.brk || 0 }; if (BRK_RULE.basic0 && ch0.brk) S.nextBrk = Math.max(S.nextBrk || 0, ch0.brk * Math.max(1, ch0.add || 3)); /* M5-7: 연환 붕괴는 다음 강공격에 */ logp(b, 'good', s.n + ': 이번 차례 기본 공격 +' + S.chain.add + '타, 기 1마다 1타 더'); }
  const cd = F('mkCondense'); if (cd) { S.condense = cd.add || 3; logp(b, 'good', s.n + ': 다음에 쏟는 기 +' + S.condense); }
  const ad = F('mkAdamant'); if (ad) { S.adamant = ad.n || 3; logp(b, 'good', s.n + ': ' + S.adamant + '차례 동안 받는 피해 −' + Math.round(U.adamantRed * 100) + '%'); }
  const fl = F('mkFlow'); if (fl) { S.flow = fl.n || 3; S.flowMul = fl.mul || 0.5; logp(b, 'good', s.n + ': ' + S.flow + '차례 동안 ▶ 공격 피해 +' + Math.round(S.flowMul * 100) + '%'); }
  const nb = F('mkNextBrk'); if (nb) S.nextBrk = Math.max(S.nextBrk || 0, nb.n);
  const yk = F('mkYeok'); if (yk) { S.yeok = yk.n || 3; if (!p.stance) p.stance = { dmg: 0, brk: 0, ki: 0, chill: 0, weak: 0, red: 0, far: 0, hz: null }; logp(b, 'good', '역천: ' + S.yeok + '차례 동안 자세를 잇고, 되받기 횟수 제한이 없고, 되받기마다 붕괴 +' + U.yeokBrk + ' (방어할 수 없고 받는 피해 +' + Math.round(U.yeokIn * 100) + '%)'); }
  const ch = F('mkCheon'); if (ch) { S.cheon = ch.n || 3; S.cheonSeal = {}; S.cheonN = {}; logp(b, 'good', '천망: ' + S.cheon + '차례 동안 나를 친 적에게 둔화 +' + U.cheonChill + ', 둔화 ' + U.cheonSeal + '이 된 적은 봉인 (되받기 피해 0)'); }
  const ij = F('mkIlji'); if (ij) { const K = st(p, 'empower'); b.mkIljiK = K; setKi(p, 0); const hp = Math.round(p.hpMax * U.iljiHp); p.hp = Math.max(1, p.hp - hp); S.noKi = U.iljiNoKi; logp(b, 'good', '일지멸맥: 기 ' + K + '을(를) 모두 쏟는다 (생명력 −' + hp + ', ' + U.iljiNoKi + '차례 기를 얻지 못함)'); }
  if (F('mkSamjae')) { S.samjae = 1; logp(b, 'good', '삼재권: 이번 전투 동안 기가 가득 차면 ⚡ 공격에도 기가 실린다'); }
  if (F('mkReflux')) { S.reflux = 1; logp(b, 'good', '역류: 이번 전투 동안 둔화된 적을 기본 공격으로 치면 기 +' + U.refluxKi); }
  if (F('mkBultoe')) { S.bultoe = 1; logp(b, 'good', '불퇴: 이번 전투 동안 무너진 적을 되받으면 ×' + U.bultoeMul); }
}
/* 천망: 나를 직접 친 적에게 둔화, 천망으로 그 적에게 건 둔화가 쌓여 5가 되면 봉인(지원 행동 끊기, 강적 · 보스는 붕괴). 둔화 상한은 모든 직업 공통 3이라(KW.chill) "둔화 5"는 쌓인 수로 센다. 적마다 천망 한 번에 한 번 */
function mkCheonHit(b, e) {
  const p = b.p, S = p.mkSt, U = MK_BOUND; addS(b, e, 'chill', U.cheonChill); const C = S.cheonN = S.cheonN || {}; C[e.id] = (C[e.id] || 0) + U.cheonChill; logp(b, 'good', '천망: ' + e.n + '에게 둔화 ' + U.cheonChill + ' (쌓인 ' + Math.min(C[e.id], U.cheonSeal) + '/' + U.cheonSeal + ')');
  if (C[e.id] < U.cheonSeal || !e.alive || (S.cheonSeal || {})[e.id]) return; (S.cheonSeal = S.cheonSeal || {})[e.id] = 1;
  const big = e.strong || e.role === 'boss'; if (big) { addBreak(b, e, U.cheonBrk); logp(b, 'good', '천망: ' + e.n + '의 혈이 막힌다. 끊기지 않고 붕괴 +' + U.cheonBrk); }
  else if (e.intent && SEAL_K.includes(e.intent.k)) { e.intent = { k: 'attack' }; e.teleX = 1; e.teleTurn = null; logp(b, 'crit', '천망: ' + e.n + '의 혈이 막혀 하려던 일이 끊긴다'); ysResp(b, '끊기'); }
  else logp(b, 'sys', '천망: ' + e.n + '의 혈이 막혔다(끊을 지원 행동은 없다)');
  b.rec.push({ k: 'seal', big: big ? 1 : 0, cheon: 1 }); uqR(p, 'u_onSeal', b, p, e); /* M6-1 고유 mk_h5 봉인한 적 */
}
function mkTurnStart(b, p) {
  const S = p.mkSt; S.chain = null; /* 연환권은 그 차례만 */ for (const k of ['adamant', 'flow', 'yeok', 'cheon', 'noKi']) if (S[k] > 0) { S[k]--; if (!S[k]) logp(b, 'sys', MK_N[k] + '이(가) 걷힌다'); }
}
/* ===== 0.8.0 M5-1 파수꾼 (10월 20일 만든 사람 설계지 + 07:40 보완): 태세 · 경계 승부수 · 결합 칸 =====
   p.wdSt = { def · atk 태세(하나만, 수도승 자세 p.stance와 따로), march 묵직한 걸음, siege 파성(siegeAmp), valor 용맹, quakeNext · quakeX 대지 분쇄, wardHalf 보호막 −50%, nextBrk 다음 기본 공격 붕괴(M5-7 규칙을 켜면 강공격), turncoat · hammer · chainPull 결합 칸 }.
   남은 차례 수는 내 차례가 시작될 때 −1(wdTurnStart). 숫자는 WD_BOUND(data/skillkit.js) */
const wdBH = c => !!c && (c.id === 'basic' || c.id === 'heavy');
const IFX_WD = {
  def: { inP: (b, p, o) => o && o.dot ? 0 : WD_BOUND.defIn },
  atk: { hitP: (b, p, e, o, c) => wdBH(c) ? WD_BOUND.atkHit : 0, inP: (b, p, o) => o && o.dot ? 0 : -WD_BOUND.atkIn, onHit: (b, p, e, o, c) => { if (!wdBH(c) || !e.alive || (BRK_RULE.basic0 && c.id === 'basic')) return; addBreak(b, e, WD_BOUND.atkBrk); return 1; } }, /* M5-7: 규칙을 켜면 강공격만 */
  march: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? WD_BOUND.marchHit : 0, onHit: (b, p, e, o, c) => { if (!brkB(c) || !e.alive) return; addBreak(b, e, WD_BOUND.marchBrk); return 1; }, /* M5-7: 붕괴는 brkB(규칙을 켜면 강공격) */ cost: (p, id) => id === 'heavy' ? -WD_BOUND.marchHeavy : 0 },
  siege: { out: (b, p, c) => wdBH(c) ? (p.wdSt.siegeAmp || 1) : 1, onHit: (b, p, e, o, c) => { if (!wdBH(c) || !e.alive || (BRK_RULE.basic0 && c.id === 'basic')) return; addBreak(b, e, WD_BOUND.siegeBrk); return 1; }, cost: (p, id) => id === 'heavy' ? -WD_BOUND.siegeHeavy : 0 },
  quakeX: { out: (b, p, c) => c ? WD_BOUND.quakeMul : 1 },
  hammer: { hitP: (b, p, e, o, c) => c && c.id === 'basic' && e && e.s && e.s.broken ? WD_BOUND.hammerMul - 1 : 0, onHit: (b, p, e, o, c) => { if (c && c.id === 'heavy' && e && e.s && e.s.broken) { p.st = Math.min(p.stMax, p.st + WD_BOUND.hammerSt); return 1; } } },
  nextBrk: { onHit: (b, p, e, o, c) => { if (!brkB(c) || !p.wdSt || !(p.wdSt.nextBrk > 0)) return; const n = p.wdSt.nextBrk; p.wdSt.nextBrk = 0; if (e.alive) { addBreak(b, e, n); logp(b, 'good', '강공격에 실은 무게: 붕괴 +' + n); } return 1; } },
};
const WD_N = { def: '수비 태세', atk: '공격 태세' };
function wdUse(b, s, targets, tgt, phase) {
  const p = b.p; const S = p.wdSt = p.wdSt || {}; const F = k => s.fx.find(e => e.k === k), U = WD_BOUND;
  if (phase === 'post') {
    if (F('wdQuake')) { const pre = b.wdPre || []; const nb = targets.filter(e => e.s && e.s.broken && !pre.includes(e.id)).length; S.wardHalf = U.quakeN; if (nb >= 2) { S.quakeNext = 1; logp(b, 'good', '대지 분쇄: 무너진 적 ' + nb + ' — 다음 차례 내 피해 ×' + U.quakeMul); } else logp(b, 'sys', '대지 분쇄: 무너진 적 ' + nb); b.wdPre = null; }
    if (s.id === 'f_chainblade' && S.chainPull > 0) for (const e of targets) if (e.alive && e.row === 'back' && S.chainPull > 0) { e.row = 'front'; e.pulledA = b.actN; S.chainPull--; addBreak(b, e, U.pullBrk); logp(b, 'crit', '사슬 끌기: ' + e.n + '을(를) 전열로 끌어온다(붕괴 +' + U.pullBrk + ')'); }
    return;
  }
  const ws = F('wdStance'); if (ws) { const k = ws.s, o = k === 'def' ? 'atk' : 'def';
    if (S[k]) { S[k] = 0; logp(b, 'sys', WD_N[k] + '를 푼다'); }
    else { const sw = !!S[o]; S[o] = 0; S[k] = 1; logp(b, 'good', WD_N[k] + (sw ? '로 바꾼다' : '를 켠다'));
      if (uqF(p, 'u_noStanceOn')) logp(b, 'sys', '태세의 장갑: 켤 때의 효과가 없다'); /* M6-1 고유 wd_r3 대가 */
      else if (k === 'def') { const g = addWard(b, p, U.defOn); if (g > 0) logp(b, 'good', '수비 태세: 보호막 +' + r1(g)); }
      else { const e = tgt && tgt.alive ? tgt : alive(b).filter(x => x.row === 'front' && x.role !== 'root')[0] || alive(b)[0]; if (e) { hurtEnemy(b, e, U.atkOnDmg, { label: '공격 태세' }); if (e.alive) addBreak(b, e, U.atkOnBrk); } }
      if (sw && S.turncoat) { S.nextBrk = Math.max(S.nextBrk || 0, U.turnBrk); logp(b, 'good', '돌아선 방패: 다음 강공격 붕괴 +' + U.turnBrk); } } }
  const pr = F('wdPray'); if (pr) { const h = p.hpMax * pr.n * (S.def ? U.prayDef : 1) * healMul(p); const h0 = p.hp; p.hp = Math.min(p.hpMax, p.hp + h); logp(b, 'good', s.n + ': 생명력 +' + r1(p.hp - h0) + (S.def ? ' (수비 태세)' : '')); }
  const nb = F('wdNextBrk'); if (nb) S.nextBrk = Math.max(S.nextBrk || 0, nb.n);
  const mc = F('wdMarch'); if (mc) { S.march = mc.n || 3; logp(b, 'good', s.n + ': ' + S.march + '차례 동안 기본 공격 피해 +' + Math.round(U.marchHit * 100) + '% · 붕괴 +' + U.marchBrk + ', 강공격 스태미나 −' + U.marchHeavy); }
  const sg = F('wdSiege'); if (sg) { const w = p.ward || 0; p.ward = 0; S.siegeAmp = 1 + Math.min(1, w / U.siegePer) * (U.siegeMax - 1); S.siege = sg.n || 3; logp(b, 'good', '파성: 보호막 ' + r1(w) + '을 모두 소모해 ' + S.siege + '차례 동안 기본 공격 · 강공격 ×' + r1(S.siegeAmp) + ', 타격마다 붕괴 +' + U.siegeBrk + ', 강공격 스태미나 −' + U.siegeHeavy + ' (보호막을 얻지 못하고 방어할 수 없다)'); }
  if (F('wdQuake')) b.wdPre = targets.filter(e => e.s && e.s.broken).map(e => e.id);
  const vl = F('wdValor'); if (vl) { S.valor = vl.n || 3; wdValorThorn(b, p); logp(b, 'good', '용맹: ' + S.valor + '차례 동안 방어할 때 보호막 +' + U.valorGuard + ', 보호막의 절반만큼 가시 (스태미나가 차지 않고 흘리기를 할 수 없다)'); }
  if (F('wdTurncoat')) { S.turncoat = 1; logp(b, 'good', '돌아선 방패: 이번 전투 동안 태세를 바꿀 때 비용 없음, 바꾼 직후 첫 강공격 붕괴 +' + U.turnBrk); }
  if (F('wdHammer')) { S.hammer = 1; logp(b, 'good', '쇠망치 손: 이번 전투 동안 무너진 적에게 기본 공격 ×' + U.hammerMul + ', 강공격이 무너진 적을 치면 스태미나 +' + U.hammerSt); }
  if (F('wdChainPull')) { S.chainPull = U.pullN; logp(b, 'good', '사슬 끌기: 이번 전투 동안 사슬의 검이 후열 적을 끌어온다(' + U.pullN + '번)'); }
}
/* 용맹: 반사는 새 규칙 대신 가시 방패(p.thorn)로(07:40 보완). 내 차례마다 보호막의 절반만큼 가시를 다시 둔다 */
function wdValorThorn(b, p) { const d = Math.round((p.ward || 0) * WD_BOUND.valorThorn); if (d <= 0) return; p.thorn = { n: WARD.thornMax, dmg: Math.max(d, p.thorn ? p.thorn.dmg || 0 : 0), valor: 1 }; }
function wdTurnStart(b, p) {
  const S = p.wdSt; if (S.def) { const g = addWard(b, p, WD_BOUND.defWard); if (g > 0) logp(b, 'good', '수비 태세: 보호막 +' + r1(g)); }
  if (S.quakeX) S.quakeX = 0; if (S.quakeNext) { S.quakeNext = 0; S.quakeX = 1; logp(b, 'good', '대지 분쇄: 이번 차례 내 피해 ×' + WD_BOUND.quakeMul); }
  for (const [k, n] of [['march', '묵직한 걸음'], ['siege', '파성'], ['valor', '용맹'], ['wardHalf', '대지 분쇄의 대가']]) if (S[k]) { S[k]--; if (!S[k]) { logp(b, 'sys', n + '이(가) 걷힌다'); if (k === 'valor' && p.thorn && p.thorn.valor) p.thorn = null; } }
  if (S.valor) wdValorThorn(b, p);
}
