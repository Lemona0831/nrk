'use strict';
function addS(b, u, k, dur, stacks, max) {
  if (KW[k]) {
    let n = Math.round(dur || 0); if (n <= 0) return 0;
    if (b && b.ctx && b.ctx.ch === 2) n = ch2StatusAdd(b, u, k, n); // A2 기름 바닥 · 빗속 · 기름 뿌리기
    if (k === 'empower' && b && u === b.p && u.mkSt && u.mkSt.noKi > 0) return 0; // M5-2 일지멸맥의 대가: 기를 얻지 못함
    if (k === 'ignite' && u === b.p && fxFlag(u, 'noIgnite')) return 0; // 0.8.0 M5-0 불의 몸: 받는 화상 무효
    if (k === 'ignite' && u !== b.p && b.p && b.cur && b.sbK === 'spell' && stk(u, 'bleed') > 0 && !b.searBusy && fxFlag(b.p, 'ksSearSpell')) { b.searBusy = 1; const g = sbSear(b, u, n); b.searBusy = 0; return g; } // 0.8.0 M5-0 혈염의 각인: 출혈 걸린 적을 주문으로 치면 화상을 건너뛰고 바로 혈염
    if (b.carve && b.cur && b.cur.grp && u !== b.p && carveMul(b, b.cur.grp) < 1) n = Math.max(1, Math.floor(n * carveMul(b, b.cur.grp)));
    if (u !== b.p && b.cur && !b.selfSt && b.p.eq && k !== 'poison' && KW_BAD.includes(k)) { const so = fxAdd(b.p, 'stOut', b, b.p, u, k); if (so) n += Math.round(so); } // 3챕터 장비: 내가 거는 상태에 더하는 수
    if (k === 'ignite' && u !== b.p && b.p.elSt && b.p.elSt.frostEmber && stk(u, 'chill') > 0) n += 1; // M5-5 얼어붙은 불씨
    if (k === 'ignite' && u !== b.p && b.p.build === 'elementalist' && fxFlag(b.p, 'elIgnCut')) n = Math.max(1, n - 1); // 10월 18일 0.8.0 5단계 얼음 심장의 대가: 내가 거는 화상 −1(최소 1)
    if (u === b.p && DEBUFFS.includes(k) && !b.selfSt) {
      for (const [ik, f] of fxList(u)) if (f.block && f.block(b, u, k)) { fxHit(ik); return 0; }
      const dd = fxAdd(u, 'dur', k); if (dd) n = Math.max(1, n + Math.round(dd));
      if (kwBlocked(b, u, k)) return 0;
      if (stat(u, 'wil') > 0 && b.rngF && b.rngF() < Math.min(0.25, 0.01 * stat(u, 'wil'))) { logp(b, 'good', '의지로 ' + (KW_N[k] || k) + '을(를) 버틴다'); return 0; } // 의지 1점마다 해로운 상태를 1% 확률로 버팀(최대 25%)
      fxRun(u, 'onDebuff', b, u, k);
    }
    if (u !== b.p && (u.role === 'crown' || (u.hazeHit && b.cur && u.hazeHit === b.actN))) return 0; // 3챕터: 왕관, 허상에 막힌 공격
    if (u === b.p && k === 'ignite' && (b.ctx.ch || 1) >= 3) { n = Math.min(n, IGN_ROUND_CAP - (b.ignR === b.round ? (b.ignN || 0) : 0)); if (n <= 0) return 0; } // 2절 5번: 한 라운드에 새로 붙는 화상
    const opp = KW_OPP[k]; if (opp && u.s[opp]) { const m = Math.min(n, u.s[opp].stacks); kwDec(u, opp, m); n -= m; if (n <= 0) return 0; }
    const cur = stk(u, k); const cap = k === 'empower' && u === b.p ? kiCapOf(u) : KW[k]; const nv = Math.min(Math.max(cap, cur), cur + n);
    if (nv > cur) u.s[k] = { stacks: nv, until: KW_FOREVER, dur: KW_FOREVER };
    if (k === 'chill' && nv > cur && nv >= KW.chill && u !== b.p && b.p.build === 'elementalist' && !b.elNoFrz) u.frzP = 1; // M5-5 빙결: 둔화가 가득 찼다(행동 끝 elFreeze)
    if (u === b.p && k === 'protect' && nv > cur && !b.fxProtIn && u.eq) { b.fxProtIn = 1; fxRun(u, 'onProt', b, u, nv - cur); b.fxProtIn = 0; } /* 2챕터 장비 */
    if (nv > cur && (b.ctx.ch || 1) >= 3) ch3OnStatus(b, u, k, nv - cur);
    if (u !== b.p && KW_BAD.includes(k) && nv > cur) chargeEv(b, k === 'poison' ? 'poison' : 'apply');
    if (nv > cur && u !== b.p && b.cur && (k === 'ignite' || k === 'chill') && b.p.build === 'elementalist') { const a = b.elSt && b.elSt.a === b.actN ? b.elSt : (b.elSt = { a: b.actN }); a[k] = 1; } // 10월 18일 0.8.0 5단계 원소술사: 이 행동이 건 원소 (가벼운 손 · 고른 원소)
    return nv - cur;
  }
  if (u === b.p && DEBUFFS.includes(k)) {
    for (const [ik, f] of fxList(u)) if (f.block && f.block(b, u, k)) { fxHit(ik); return; }
    const dd = fxAdd(u, 'dur', k); if (dd) dur = Math.max(0.5, dur + dd);
    fxRun(u, 'onDebuff', b, u, k);
  }
  if (u === b.p && ['bleed', 'ignite', 'chill', 'weak', 'vuln'].includes(k) && u.eq && u.eq.amulet === 'sigil') u.mp = Math.min(u.mpMax, u.mp + 4);
  // 상쇄 쌍 (4.4): 격노↔약화, 보호↔취약
  const opp = { rage: 'weak', weak: 'rage', protect: 'vuln', vuln: 'protect' }[k];
  if (opp && u.s[opp]) { delete u.s[opp]; return; }
  const cur = u.s[k];
  const until = b.t + dur;
  if (STACKY[k]) { stacks = stacks || 1; max = Infinity; }
  if (stacks) {
    const n = Math.min(max || 99, (cur ? cur.stacks : 0) + stacks);
    u.s[k] = { stacks: n, until, dur };
  } else { const un = Math.max(until, cur ? cur.until : 0); u.s[k] = { stacks: 1, until: un, dur: un - b.t }; }
}
function pSpeed(b) {
  const p = b.p; let s = 1;
  if ((p.eq.ring1 === 'pulse' || p.eq.ring2 === 'pulse') && !isV2(p)) s *= 0.8; // 0.6a.2 라운드에서는 빠르기 대신 빠른 칸을 잃는다(noFast)
  s *= 1 + 0.005 * stat(p, 'dex');
  return clamp(s, 0.7, 1.5);
}
function eSpeed(b, e) { let s = e.spd * (hasMod(b, 'bell') || hasMod(b, 'drums') ? 1.1 : 1); if (e.foe === 'pilgrim' && e.hp < e.hpMax * 0.5) s *= STRONG.frenzy; if (b.enrage && e.role === 'boss') s *= 1.3; return s; }

/* 1T 경계마다 전역 처리 */
function tickOnce(b) {
  b.tick++; const T = b.tick; const p = b.p;
  chDev(b, 'onRoundEnd'); // A0 챕터 장치
  expireAll(b);
  for (const e of alive(b)) if (e.pile && e.pile.born < T) { e.pile.wait--; if (e.pile.wait <= 0) riseSkel(b, e, ''); } // 뼈 더미: 그 라운드에 생긴 더미는 줄지 않는다
  for (const w of alive(b)) if (w.role === 'bonewall' && !b.en.some(m => m.id === w.wallOf && m.alive)) { w.alive = false; w.hp = 0; logp(b, 'good', '쌓은 자가 쓰러져 뼈벽이 무너진다'); }
  for (const e of alive(b)) if (e.under && !alive(b).some(x => x !== e && !x.pile && !x.under && x.role !== 'root')) { e.under = 0; logp(b, 'sys', e.n + '이(가) 땅 위로 밀려 나온다'); } // 칠 수 있는 적이 늘 하나는 있다(G9)
  // 플레이어 자원 자연 회복 (전역 T)
  const st0R = p.st; if (!(p.wdSt && p.wdSt.valor) && !(p.asSt && p.asSt.noStam > 0)) { const rg = fxVal(p, 'regen', 0, (a, v) => a + v); if (rg && p.st < p.stMax) fxHit('clothgloves'); p.st = Math.min(p.stMax, p.st + ST_REGEN + rg); } /* M5-1 용맹한 방벽 대가: 스태미나 자연 회복 정지 */ if (p.noRegenR === b.round) p.st = st0R; else if (p.dreamR === b.round) p.st = st0R + (p.st - st0R) * 0.5; /* A2 진통제 · 꿈 연기 */
  p.mp = Math.min(p.mpMax, p.mp + p.mpMax * 0.05 * (hasMod(b, 'calm') ? 2 : 1));
  if (hasBt(p, 'breath')) p.st = Math.min(p.stMax, p.st + 3);
  if (hasMod(b, 'holy') || hasMod(b, 'shade')) { p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.01); for (const e of alive(b)) e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.01); }
  if ((hasMod(b, 'ceiling') || hasMod(b, 'pillar')) && T % 4 === 0) { logp(b, 'sys', '천장에서 돌이 쏟아진다'); hurtPlayer(b, 4, { aoe: 1, label: '무너지는 천장' }); for (const e of alive(b).slice()) if (e.role !== 'root' && e.role !== 'crown') hurtEnemy(b, e, 4, { aoe: 1, label: '무너지는 천장' }); if (b.over) return; }
  // 보스 전역 기믹
  const boss = b.en.find(e => e.role === 'boss' && e.alive);
  if (boss && boss.boss === 'mother') {
    if (!p.guard) { addPoison(b, p, PSN.swampN); }
    if (st(p, 'poison') >= 10 && !b.hatchLock) {
      b.hatchLock = true;
      for (let i = 0; i < 2; i++) spawn(b, 'minion');
      logp(b, 'bad', '독에 부푼 알이 깨진다. 하수인 둘이 기어 나온다');
    }
    if (st(p, 'poison') < 10) b.hatchLock = false;
  }
  if (boss && boss.boss === 'abbot') abbotTick(b, boss, T);
  if ((b.ctx.ch || 1) >= 3) { ch3Tick(b, T); if (b.over) return; } // 3챕터: 해시계, 열기와 열풍
  if (isCh2(b)) { ch2Tick(b, T); if (b.over) return; } // A2 구경꾼 · 빗속 · 빚 · 함성 · 그림자 하수인

  { const rg = alive(b).find(e => e.foe === 'bellringer'); const bell = alive(b).find(e => e.bell); if (rg && bell && T % STRONG.bellEvery === 0) { for (const x of alive(b)) if (x.role !== 'root') x.quick = 1; logp(b, 'bad', rg.n + '이(가) 줄을 당긴다. 종이 울린다'); codexHit(b, 'bellringer', 'ring'); } }
  if (boss && boss.boss === 'tree') {
    if (T % 4 === 0) { b.season = (b.season + 1) % 4; logp(b, 'sys', '계절이 바뀐다. 이제 ' + SEASONS[b.season]); }
    const roots = alive(b).filter(e => e.role === 'root').length;
    const reg = boss.hpMax * 0.025 * roots / 3 * (b.season === 0 ? 2 : 1);
    if (reg > 0 && boss.hp < boss.hpMax) { boss.hp = Math.min(boss.hpMax, boss.hp + reg); }
    if (b.season === 1) addS(b, p, 'ignite', 3);
    if (b.season === 3) addS(b, p, 'chill', 2);
  }
  const enB = boss ? ((ENRAGE.byBoss || {})[boss.boss] || ENRAGE.boss) : ENRAGE.boss; const enT = boss ? enB : ENRAGE.room;
  if (b.enrage && !b.ctx.scen && T >= enT + ENRAGE.step * (b.enrageLv || 1)) { b.enrageLv = (b.enrageLv || 1) + 1; logp(b, 'bad', '광폭이 짙어진다. 적의 피해가 더 커진다'); }
  if (!boss && !b.enrage && T >= ENRAGE.room && !b.ctx.scen) { b.enrage = true; b.enrageLv = 1; logp(b, 'bad', '싸움이 길어졌다. 적들이 광폭해진다'); }
  if (boss && !b.enrage && T >= enB) { b.enrageLv = 1; b.enrage = true; logp(b, 'bad', '싸움이 길어졌다. ' + boss.n + '이(가) 광폭해진다'); }
  // 지속 피해·지속 시간 (전역 T)
  const units = [p].concat(alive(b)); const bmQ = isBm(p); if (bmQ) b.dotLoop = 1; // 숨겨진 직업 3: 표식 번짐은 고리 뒤에
  for (const u of units) {
    const dm = u === p ? 1 : dotMul(p);
    if (u.s.poison) { const n = u.s.poison.stacks; dmgDot(b, u, n * dm, '중독'); if (u.s.poison && !hasMod(b, 'rotair')) { if (u.asVir && u.alive && n >= AS_BOUND.virMin) u.s.poison.stacks = Math.min(psnCapOf(p) + 10, n + 1); /* M5-3 맹독: 10 이상이면 줄지 않고 1 는다(판정 ⑦: 라운드 끝마다 다시 봄) */ else u.s.poison.stacks = n - 1; if (u.s.poison.stacks <= 0) delete u.s.poison; } } // 썩은 공기: 중독이 줄지 않는다
    if ((u.pile || u.role === 'bonewall') && u.alive && u.s.bleed) kwBleed(b, u); if ((u.pile || u.role === 'bonewall') && u.alive && u.s.sear) kwSear(b, u); // 움직이지 않는 몸의 출혈은 라운드 끝에
  }
  if (bmQ) { b.dotLoop = 0; bmMarkFlush(b); }
  expireAll(b);
  if (!b.over) fxRun(p, 'onRound', b, p);
  checkEnd(b);
}
/* 끝날 시각이 지난 상태는 바로 지운다 (지속 피해보다 먼저) */
function expireAll(b) {
  for (const u of [b.p].concat(b.en)) for (const k of Object.keys(u.s)) if (u.s[k].until <= b.t + 1e-9) {
    const x = u.s[k]; delete u.s[k];
    if ((k === 'rift' || k === 'echo') && u !== b.p && u.alive && !b.over) { hurtEnemy(b, u, x.stacks, { label: k === 'rift' ? '시간 균열' : '메아리 섬광', aoe: k === 'echo' ? 1 : 0 }); if (k === 'rift' && u.alive) addBreak(b, u, x.brk || 0); }
  }
}
function advanceTo(b, t) {
  while (b.tick + 1 <= t + 1e-9 && !b.over) { b.t = b.tick + 1; tickOnce(b); }
  if (!b.over) { b.t = Math.max(b.t, t); expireAll(b); }
}

/* ================= 피해 처리 (4.3 단일 경로) ================= */
function dmgDot(b, u, amt, label) {
  if (label === '점화' && hasMod(b, 'candle')) amt *= 1.5;
  if (label === '출혈' && hasMod(b, 'bloodpool')) amt *= 2;
  if (u === b.p) { if (hasBt(u, 'ward')) amt *= 0.7; if (label === '점화' && hasBt(u, 'snuff')) amt = 0; hurtPlayer(b, amt, { dot: 1, label }); }
  else { hurtEnemy(b, u, amt, { dot: 1, label }); }
}
function hurtPlayer(b, raw, o) {
  const p = b.p; o = o || {}; let rip = null; if (isCh2(b)) { const m2 = ch2InMul(b, o); if (m2 === 0) { logp(b, 'good', (o.src ? o.src.n + '의 공격이 ' : '') + '연막 속에서 빗나간다'); return 0; } raw *= m2; } /* A2 연막탄 · 약장수 병 */ if (p.asSt && p.asSt.hide && (!o.dot || uqF(p, 'u_hideDot'))) { logp(b, 'good', o.dot ? '숨어 있어 ' + (o.label || '지속 피해') + '도 닿지 않는다' : '숨어 있어 ' + (o.src ? o.src.n + '의 ' : '') + '공격이 닿지 않는다'); return 0; } /* M6-1 고유 as_h8: 숨은 동안 지속 피해도 */ /* M5-3 무영살: 숨은 동안 어떤 공격의 표적도 아님(지속 피해는 받음) */ const raw0 = raw, nr0 = !o.dot && o.src && p.nextRed ? p.nextRed : 0, br0 = !!p.brace; /* 화면용 까닭(읽기만) */
  const bigHit = !!(o.charged || (o.src && o.src.intent && o.src.intent.aimed && !o.dot)); // 예고된 큰 공격: 강타 · 강적과 보스의 큰 한 방 · 겨눈 한 발 · 화형
  if (p.foresee && (b.round || 0) < p.foresee.until && bigHit) raw *= 1 - p.foresee.red;
  if (bigHit && hasBt(p, 'firm')) raw *= 0.85; // 굳건함의 성소 // 사냥꾼 예고 읽기 (피할 수 없는 화형에도 든다)
  const hnHalf = p.build === 'hunter' && p.evade > 0 && !o.dot && (!o.aoe || uqF(p, 'u_evAoe')) /* M6-1 고유 hn_r2 */ && !o.spell && o.src && bigHit && (o.src.elite || o.src.strong || o.src.role === 'boss'); /* M5-4 몸 빼기 무한 회피 막기(설계지 11, 측정 뒤 조건): 강적 · 정예 · 보스의 강타는 몸 빼기로 절반만 피한다 */
  if (hnHalf) { p.evade--; raw *= 0.5; logp(b, 'bad', o.src.n + '의 강타는 몸을 빼도 절반이 닿는다' + (p.evade ? ' (남은 ' + p.evade + '번)' : '')); fxRun(p, 'onEvade', b, p, o.src); hnOnEvade(b, o.src); }
  else if (p.evade > 0 && !o.dot && (!o.aoe || uqF(p, 'u_evAoe')) && !o.spell && o.src && carveMul(b, 'prep') < 1) { p.evade--; raw *= 1 - carveMul(b, 'prep'); logp(b, 'bad', '새겨진 이름 때문에 몸이 둔하다. 일부를 맞는다'); } // 새김: 피하기는 확률이 아니라 받는 몫으로
  else if (p.evade > 0 && !o.dot && (!o.aoe || uqF(p, 'u_evAoe')) && !o.spell && o.src) { p.evade--; logp(b, 'good', (o.src.n || '적') + '의 공격을 몸을 빼 피한다' + (p.evade ? ' (남은 ' + p.evade + '번)' : '')); fxRun(p, 'onEvade', b, p, o.src); const c = p.evadeCtr; if (c && o.src.alive && (!c.charged || bigHit)) { hurtEnemy(b, o.src, outDmg(b, c.dmg, {}), { single: 1, label: '반격 사격' }); if (c.chill && o.src.alive) addS(b, o.src, 'chill', c.chill); } if (c && c.focus && o.src.alive && p.build === 'hunter') hnFoc(b, o.src, c.focus); if (p.evadeHz) hastenBranch(b, p.evadeHz.br, p.evadeHz.n, p.evadeHz.id); if (p.build === 'hunter') hnOnEvade(b, o.src); else ysResp(b, '흘리기'); /* M5-4: 사냥꾼은 몸 빼기로 피하면 대응 충전 없음(회피만) */ if (!p.evade && !(c && c.until > (b.round || 0))) p.evadeCtr = null; return 0; } // 사냥꾼 몸 빼기 (10월 5일): 실제로 피했을 때만 반격 · 🔄
  if (!o.dot && !o.aoe && p.dodge && o.src && o.src.id === p.dodge) {
    p.dodge = 0; const red = Math.max(0, (p.dodgeRed || parryRed(p)) - parryBigOf(p, o.src)) * carveMul(b, 'prep'); /* 10월 18일 0.8.0 5단계 피하는 몸: 강적 · 보스 −20%p → −15%p(parryBigOf) */ raw *= 1 - red; o.parried = true; logp(b, 'good', (o.src ? o.src.n + '의 ' + (o.charged ? '강타' : '공격') : '공격') + '을(를) 칼날로 흘린다. 피해 ' + Math.round(red * 100) + '% 감소');
    fxRun(p, 'onParry', b, p, o.src);
    if (p.build === 'assassin') p.asParT = b.turnIdx || 0; // 10월 18일 0.8.0 5단계 흘려 냄 표시(원거리 초안 1-3): 다음 내 차례(b.turnIdx는 내 주 행동이 끝날 때 오른다)를 적는다. 흘려 낸 틈이 그 차례 첫 공격에 쓴다
    if (o.charged && o.src && o.src.boss === 'abbot' && p.s.brand) { p.s.brand.stacks--; if (p.s.brand.stacks <= 0) delete p.s.brand; logp(b, 'good', '흘려 낸 칼끝이 낙인 하나를 긁어낸다'); }
    const asBr0 = p.build === 'assassin' && o.charged && !!(o.src && o.src.s && o.src.s.broken); // 10월 18일 0.8.0 5단계 끊는 칼끝: 흘리기 25 전에 이미 무너져 있었는가
    if (o.charged) { addBreak(b, o.src, 25); logp(b, 'good', o.src.n + '의 자세가 흔들린다. 붕괴 게이지 +25'); }
    if (o.charged && o.src && o.src.alive && p.build === 'assassin') { const xb = asSum(p, 'parryBrk'); if (xb && (asBr0 || !o.src.s.broken)) { addBreak(b, o.src, xb); logp(b, 'good', '끊는 칼끝. 붕괴 게이지 +' + xb + ' 더'); } } // 10월 18일 0.8.0 5단계 끊는 칼끝: 강타를 흘려 낸 붕괴 +25 → +35(앞의 25로 이미 무너졌으면 더하지 않는다)
    if (o.charged && o.src && (p.eq.amulet === 'witness')) { addS(b, o.src, 'vuln', 2); logp(b, 'good', '증인의 부적이 빈틈을 기억한다. ' + o.src.n + ' 취약'); }
    chargeEv(b, 'parry'); ysResp(b, '흘리기'); // 10월 15일 유산 1차 시제품: 대응 충전
    if (p.sbSt && p.sbSt.counterBurn && o.src && o.src.alive) { addS(b, o.src, 'ignite', SB_BOUND.cbIgn); logp(b, 'good', '되받아 태우기: ' + o.src.n + '에게 화상 ' + SB_BOUND.cbIgn); } // M5-0 보정 5 결합 칸
    const on = p.dodgeOn; p.dodgeRed = 0; p.dodgeOn = null;
    if (p.build === 'assassin' && p.asSt) b.asParry = { src: o.src, on }; // M5-3: 흘린 독 · 흘린 칼 · 반격 · 칼춤은 맞은 피해를 받은 뒤(아래)
    if (on && o.src && o.src.alive) rip = { on, d: on.dmg ? outDmg(b, on.dmg * (on.sk ? 1 + asSum(p, 'parrySkP') : 1), {}) : 0 }; // 흘려 되돌리는 효과는 후열에도 닿는다 (암살자 초안 4절). 10월 18일 0.8.0 5단계 그림자 맹세: 흘리기 스킬이 흘려 내고 주는 피해 +15%(on.sk는 setParry가 단다). 10월 18일 0.8.0 5단계 마무리(만든 사람 결정, 쓰러짐 우선): 피해 값은 여기서(예전과 같은 때) 정하고, 넣는 것은 내가 맞은 뒤로 미룬다
    if (on && on.hasten) hastenBranch(b, on.hb, on.hasten, null); // 🔄 흘려 내면 다른 같은 갈래 스킬 쿨타임 −n
  }
  let d = raw;
  if (!o.dot && o.src && p.nextRed) { d *= 1 - p.nextRed; p.nextRed = 0; } // 소모품 나무 부적
  if (!o.dot && o.src && o.src.redNext) { d *= 1 - o.src.redNext; o.src.redNext = 0; } // 소모품 흩뿌리는 성물 · 연막: 그 적의 다음 공격 하나
  if (!o.dot && o.src && o.src.bigRed) { d *= 1 - o.src.bigRed; o.src.bigRed = 0; } // 소모품 종 조각: 큰 공격을 모으는 적의 다음 공격(그 큰 공격)
  if (!o.dot && o.src && p.decoy && p.decoy.round === b.round && (o.counter || o.src.row === 'back')) d *= 1 - p.decoy.v; // 소모품 미끼 인형: 이번 라운드 반격 · 후열 사격
  const dG0 = d; if (p.guard && !o.judgment) d *= 1 - (1 - (p.eq.gloves === 'ragechain' ? 0.6 : fxFlag(p, 'guardWeak') ? 0.7 : 0.5)) * carveMul(b, 'prep'); if (p.guard && !o.judgment && p.g8u) { const gr = uqV(p, 'u_guardRed', 0, (a, v) => a + v); if (gr) d *= 1 - Math.min(0.6, gr); } /* M6-1 접사 guardRed: 방어 중 받는 피해 −N% 더 */ // 준비가 새겨지면 방어가 덜 줄인다 // 심판은 방어로 줄지 않는다 // 0.8.0 5단계 방패를 내린 자: 방어가 30%만
  const held = p.guard && !o.judgment && !o.dot && o.src && o.src !== p ? Math.max(0, dG0 - d) : 0; // 방어로 줄인 피해 (받아낸 몫)
  if (held > 0 && o.charged && o.src.alive && p.sbSt && p.sbSt.shackle && stk(o.src, 'bleed') > 0) { addBreak(b, o.src, SB_BOUND.shackleBrk); logp(b, 'good', '피의 족쇄: 막아 낸 강타, ' + o.src.n + '에게 붕괴 +' + SB_BOUND.shackleBrk); } // M5-0 보정 4
  if (held > 0 && o.src.alive && fxFlag(p, 'ksSinBlock')) { const n = Math.ceil(held * SB_BOUND.sinBlock); if (n > 0) { addS(b, o.src, 'bleed', n); logp(b, 'good', '죄인의 각인: 받아낸 피가 ' + o.src.n + '에게 출혈 ' + n + '로 되돌아간다'); } } // 0.8.0 M5-0
  if (p.build === 'monk' && p.stance && p.stance.red && !o.dot && !o.judgment) d *= 1 - p.stance.red; // 0.8.0 5단계 철산고: 그 자세만 받는 직접 피해를 줄인다
  if (p.ward > 0 && p.eq.armor === 'wardcrest') d *= 0.85;
  if (p.retal) d *= 0.7;
  if (hasBt(p, 'procession') && !o.dot) d *= 0.9; // 장례 행렬을 뒤따랐다
  if (hasBt(p, 'ashcover') && !o.dot) d *= 0.95; // 3챕터 재 속의 이름: 재를 덮어 주었다
  if (p.brace) d *= 0.65;
  if (o.charged && hasIt(p, 'fury')) d *= 1.1;
  if (p.st <= 0 || p.exhaust) d *= 1.2;
  const hx = o.dot ? null : { vu: st(p, 'vuln'), pr: st(p, 'protect'), ig: st(p, 'ignite'), ex: p.st <= 0 || !!p.exhaust, gd: !!(p.guard && !o.judgment) }; /* 10월 7일 2차: 쓰러짐 화면에 보일 더해진 것 (값을 바꾸지 않는다) */
  if (p.build === 'elementalist' && o.src && !o.dot && (o.src.s.chill || o.src.chillR === b.round)) { const d0 = d; d *= 1 - elGuardOf(p); b.frostN = (b.frostN || 0) + 1; b.frostSaved = (b.frostSaved || 0) + (d0 - d); } // 원소술사 서리 무게 (10월 7일)
  { const ip = fxAdd(p, 'inP', b, p, o); if (ip) d *= 1 - Math.max(-FX_CAP, Math.min(FX_CAP, ip)); } /* 2챕터 장비(IFX2): 상태(kwTaken) 앞 */
  d = kwTaken(b, p, d, o);
  d *= fxMul(p, 'inMul', b, p, o);
  // 1회 행동 피해 상한 (4.6): 일반 25%, 정예 35% (보스는 기믹 제외)
  if (!o.dot && b.ctx && b.ctx.mode === 'hard') d *= MODES.hard.dmg; /* 가혹: 직접 피해 ×1.3, 한 번 피해 상한은 곱한 뒤에 그대로 */
  if (!o.dot && b.ctx && b.ctx.marks && b.ctx.marks.indexOf('dmg') >= 0) d *= MARKS.dmg.dmg; /* 표식 도전: 직접 피해 ×1.2 (표식이 없으면 건너뜀) */
  if (o.src && !o.dot) { const cap = o.src.role === 'boss' ? 0.45 : o.src.elite ? 0.35 : 0.25; d = Math.min(d, p.hpMax * cap); }
  if (o.maxD != null) d = Math.min(d, o.maxD); // 연타의 합 상한 (3챕터 칼춤: 내 화상 몫까지 넣는다)
  if ((b.ctx.ch || 1) >= 3 && !o.dot && (o.aoe || o.spell) && !b.enrage) d = Math.min(d, HIT_REF((o.src && o.src.lv) || b.ctx.lv || 1) * UNAVOID_CAP * (p.guard && !o.judgment ? 0.5 : 1)); // 2절 8번: 피할 수 없는 피해는 막기 전 기준 생명력 × 0.30까지(취약 · 강화 · 정예 뒤에 자름, 광폭만 예외)
  d = Math.max(0, d);
  if (o.judgment && p.s.brand) { delete p.s.brand; logp(b, 'sys', '심판이 내려지고 낙인이 사라진다'); }
  if (p.guard && p.eq.armor === 'plate' && !o.dot) p.counter += d * 0.3;
  if (p.guard && !o.dot && !o.judgment && o.src && o.src !== p) ysResp(b, '막기'); // 10월 15일 유산 1차 시제품: 방어 중에 적의 공격을 받아 냄
  if (p.guard && !o.dot && o.src && o.src !== p) uqR(p, 'u_guardHit', b, p, o); /* M6-1 고유 wd_r2 되비치는 방패갑: 방어 중 맞으면(보호막이 받아내도) 그 적 붕괴 +6 */
  let wardAll = false, wardA = 0, wardBk = false;
  if (p.ward > 0 && d > 0) { const bk = o.src && !o.dot && o.src.row === 'back' && !o.wardAll; const a = Math.min(p.ward, bk ? d * WARD.back : d); p.ward -= a; d -= a; wardA = a; wardBk = !!bk; if (d <= 0) wardAll = true; else logp(b, 'good', '보호막이 ' + r1(a) + '을(를) 받아낸다' + (bk ? '. 멀리서 온 공격이라 절반만 막는다' : '')); if (p.build === 'spellblade') sbWardHit(b, p, o, a); }
  if (o.dot && b.bleedFloor && d >= p.hp && p.hp > 0) { d = Math.max(0, p.hp - 1); logp(b, 'good', '내가 낸 피로는 쓰러지지 않는다. 생명력 1에서 멈춘다'); b.rec.push({ k: 'bu', w: 'floor' }); } // 출혈 바닥 (숨겨진 직업 1): 나에게 건 출혈이 남아 있는 동안
  if (d >= p.hp && p.hp > 0 && fxList(p).some(([, f]) => f.deathSave) && !p.fxSaved) { d = p.hp - 1; p.fxSaved = 1; fxHit('deadrosary'); logp(b, 'crit', '망자의 묵주가 한 번 붙잡아 준다. 생명력 1'); }
  const actualTaken = Math.max(0, Math.min(p.hp, d));
  const damageStats = b.damageStats || (b.damageStats = { v: 0, dealt: 0, taken: 0 }); damageStats.taken += actualTaken;
  p.hp -= d;
  if (actualTaken > 0 && o.src && !o.dot && isBu(p)) p.tookAcc = (p.tookAcc || 0) + actualTaken; // 남은 생명력을 넘는 초과 피해는 자원에 넣지 않는다.
  if (d > 0) fxRun(p, 'onHurt', b, p, o, d);
  if (d > 0 && !o.dot && p.eq.gloves === 'ragechain') p.rcN = Math.min(5, (p.rcN || 0) + 1);
  if (d > 0 && o.charged && hasIt(p, 'fury')) { p.furyNext = 1; logp(b, 'good', '분노의 반지가 달아오른다. 다음 공격 +10%'); }
  if (p.guard && (p.eq.armor === 'thorns' || uqF(p, 'u_thorns')) && o.src && o.src.alive && !o.dot && o.src.row === 'front') hurtEnemy(b, o.src, 2, { label: '가시 갑옷' }); /* M6-1 고유 cm_thorns */
  if (p.retal && d > 0 && o.src && o.src.alive && !o.dot) hurtEnemy(b, o.src, d, { label: '피의 응답' });
  if (p.thorn && o.src && o.src.alive && !o.dot) { if (p.thorn.dmg > 0 || !p.thorn.bleed) hurtEnemy(b, o.src, p.thorn.dmg, { label: '가시 방패' }); if (p.thorn.bleed && o.src.alive) { addS(b, o.src, 'bleed', p.thorn.bleed); logp(b, 'good', o.src.n + '에게 출혈 ' + p.thorn.bleed); } if (--p.thorn.n <= 0) p.thorn = null; } // 파수꾼 가시: 다음 n번 맞을 때마다
  if (d > 0) p.tookSince = (p.tookSince || 0) + d;
  if (held > 0 && p.hp > 0 && !b.over) wdHeld(b, p, o, held); // 0.8.0 5단계 파수꾼: 받아낸 몫 · 흔들리는 방패
  if (p.brace && !o.dot && o.src && o.src.alive && o.src.row === 'front') { hurtEnemy(b, o.src, 4, { label: '강철 살갗의 반격' }); if (p.build === 'berserker' && d > 0) addRage(b, 1); }
  if (d > 0 && !o.dot) for (const e of alive(b)) if (e.s.bond) hurtEnemy(b, e, d * 0.5, { label: '피의 연결' });
  if (d > 0 && scarRate(p) > 0) p.scar = Math.min(p.hpMax * 0.5, p.scar + d * scarRate(p));
  if (p.build === 'berserker' && d > 0) addRage(b, 1);
  if (!o.silent && wardAll) logp(b, 'good', (o.label || '공격') + '. 보호막이 모두 받아냈다');
  else if (!o.silent) logp(b, 'bad', o.dot ? (o.label || '피해') + '이(가) 나를 갉아먹는다. ' + r1(d) + ' 피해' : (o.label || '공격') + '. ' + r1(d) + ' 피해' + (p.guard ? ', 방어로 절반' : ''));
  const sLine = b.logN || 0; /* 이 피해 줄의 순번 */
  if (p.build === 'monk' && (p.guard || p.stance) && !b.cur && !b.over && p.hp > 0 && o.src && !o.dot && !o.aoe && !o.spell && !o.judgment && monkCtrOk(b, o.src) && (p.ctrN || 0) < monkCtrMax(p)) monkCounter(b, o); // 수도승 되받기 (의도 키가 아니라 공격의 성질로 가린다. 피해 · 가시 처리와 기록 줄 다음)
  if (p.mkSt && p.mkSt.cheon && !b.cur && !b.over && p.hp > 0 && o.src && o.src.alive && !o.dot && realFoe(o.src)) mkCheonHit(b, o.src); // M5-2 천망: 나를 친 적에게 둔화
  if (!b.cur && !b.over && p.hp > 0 && o.src && o.src.alive && !o.dot && realFoe(o.src)) uqR(p, 'u_struck', b, p, o.src); /* M6-1 고유 mk_h8 나를 직접 친 적 */
  b.rec.push({ k: 'hit', y0: isV2(p) && (p.ys || 0) === 0 && !o.dot ? 1 : 0, t: r1(b.t), d: r1(d), actual: r1(actualTaken), dot: !!o.dot, charged: !!o.charged, src: o.src ? o.src.role : null, guard: !!p.guard, parried: o.parried ? 1 : 0 });
  if (p.rime && o.src && o.src.alive && !o.dot && p.hp > 0) elemRime(b, o.src); // 원소술사 되얼림 · 불꽃 외투 (그 공격의 기록 뒤)
  if (p.elSt && p.elSt.frostWall && ((hx && hx.pr > 0) || wardA > 0) && o.src && o.src.alive && p.hp > 0 && !b.over) elFrostWallHit(b, o.src); // M5-5 서리 방벽
  if (p.elSt && p.g8u && o.src && o.src !== p && o.src.alive && !o.dot && p.hp > 0 && !b.over) uqR(p, 'u_elHitMe', b, p, o.src, o); /* M6-1 고유 el_h4: 나를 직접 친 적 */
  { const m = []; if (hx) { if (hx.vu) m.push('취약 ' + hx.vu + '(으)로 +25%'); if (hx.pr) m.push('보호 ' + hx.pr + '(으)로 −25%'); if (hx.ig) m.push('화상 ' + hx.ig + '만큼 더함'); if (hx.ex) m.push('탈진으로 +20%'); if (hx.gd) m.push('방어로 줄어듦'); }
    if (o.parried) m.push('흘리기로 줄어듦'); if (nr0) m.push('부적으로 −' + Math.round(nr0 * 100) + '%'); if (br0 && !o.dot) m.push('버티기로 −35%'); if (wardA > 0) m.push('보호막이 ' + r1(wardA) + ' 받아냄' + (wardBk ? '(먼 곳에서 온 공격이라 절반만)' : '')); if (b.enrage && o.src && !o.dot) m.push('광폭화');
    const ik = o.src && o.src.intent ? o.src.intent.k : ''; const it = o.dot ? '' : /되받아친다/.test(o.label || '') ? '반격' : !o.src ? '' : ik === 'heavy' ? heavyName(o.src) : ik === 'attack' ? (o.src.intent.aimed ? '겨눈 한 발' : '공격') : (HIT_N[ik] || '');
    (b.hits3 = b.hits3 || []).push({ n: o.src ? o.src.n : '', it, l: o.src ? '' : (o.label || ''), d: r1(d), dot: o.dot ? 1 : 0, big: o.charged ? 1 : 0, m, left: r1(Math.max(0, p.hp)), r: b.round || 0 }); if (b.hits3.length > 3) b.hits3.shift(); if (!o.silent && !o.dot && m.length) whyPush(b, { side: 'in', n: o.src ? o.src.n : (o.label || ''), f: r1(raw0), d: r1(d), m, s: sLine }); } /* 10월 7일 2차: 쓰러짐 화면의 결정타 · 마지막 세 번 (기록 b.rec는 그대로) */
  if (p.asSt && p.asSt.veil && o.src && o.src.alive && !o.dot && p.hp > 0) { const g = addPoison(b, o.src, p.asSt.veil.poison, 1); if (g) logp(b, 'good', '독의 장막: ' + o.src.n + '에게 중독 ' + g); } // M5-3
  if (b.asParry) { const A = b.asParry; b.asParry = null; if (p.hp > 0 && !b.over) asOnParry(b, A.src, A.on); } // M5-3 흘려 낸 뒤
  if (p.hnSt && !o.dot && o.src && o.src !== p && p.hp > 0 && !b.over) hnOnHit(b, o.src); // M5-4 바람의 장막 · 혈향의 덫
  if (!o.dot && o.src && o.src !== p && p.hp > 0 && !b.over) uqR(p, 'u_hitBy', b, p, o.src); /* M6-1 고유 hn_h9: 나를 직접 친 적 */
  if (rip && p.hp > 0 && !b.over && o.src && o.src.alive) { const on = rip.on; // 10월 18일 0.8.0 5단계 마무리(만든 사람 결정, 쓰러짐 우선): 흘려 낸 칼끝 · 독 · 붕괴 · 출혈은 줄어든 피해를 받은 뒤, 살아 있을 때만. 전에는 칼끝이 마지막 적을 쓰러뜨려 이김이 정해진 뒤 피해가 들어가 생명력 0 아래로 이기는 일이 있었다
    if (on.dmg) hurtEnemy(b, o.src, rip.d, { single: 1, label: '흘려 낸 칼끝' });
    if (on.poison && o.src.alive) addPoison(b, o.src, on.poison, 1);
    if (on.brk && o.src.alive) addBreak(b, o.src, on.brk);
    if (on.bleed && o.src.alive) addS(b, o.src, 'bleed', on.bleed);
  }
  checkEnd(b);
  return d;
}
const HIT_N = { explode: '폭발', burn: '화형', brand: '죄를 읽는다', erupt: '솟구침', hand: '무덤의 손', constrict: '조이기', reflect: '되비추기', mirror: '거울', counter: '반격' };
/* 수도승 되받기 (10월 7일, docs/직업/수도승.md B-3): 적의 차례에만(b.cur 없음) 나간다. 내 행동이 아니라 기를 쓰지 않고, 장비의 다음 공격 몫(분노의 반지 · 인내의 흉갑 · 분노의 사슬)도 쓰지 않는다.
   반격 태세를 부르지 않고(melee 없음), 수도원장의 요구 · 장비 onHit에 끼지 않는다(가시와 같은 급). 되받은 적에게 거는 약화는 그 적의 공격이 끝난 뒤에 건다(e.ctrWeak) */
function monkCounter(b, o) {
  const p = b.p, e = o.src, S = p.stance || {}, M5 = p.mkSt || {}; p.ctrN = (p.ctrN || 0) + 1; const cm = monkCtrMax(p);
  logp(b, 'good', '되받기 (' + p.ctrN + (isFinite(cm) ? '/' + cm : ', 역천') + '): ' + e.n + '에게 되받아친다');
  let raw = (wpnDmg(p) * MONK.ctr + (S.dmg || 0)) * (1 + (S.mul || 0)); if (M5.bultoe && e.s && e.s.broken) { raw *= MK_BOUND.bultoeMul; logp(b, 'good', '불퇴: 무너진 적을 되받는다 ×' + MK_BOUND.bultoeMul); } if (M5.cheon) raw = 0; // M5-2 금강 자세 ×1.2 · 불퇴 · 천망(피해 0)
  const d = raw > 0 ? hurtEnemy(b, e, outDmg(b, raw, { weapon: 1, ctr: 1 }), { single: 1, ctr: 1, label: '되받기' }) : 0;
  let bk = 0; if (e.alive) { bk = MONK.ctrBrk + fxVal(p, 'ctrBrk', 0, (a, v) => a + v) + (o.charged ? MONK.ctrBig : 0) + (S.brk || 0) + (M5.yeok ? MK_BOUND.yeokBrk : 0); addBreak(b, e, bk); }
  if (S.big && o.charged && e.alive && !e.s.broken) { addBreak(b, e, MK_BOUND.bigBrk); logp(b, 'crit', '천근추: 강타를 되받아 ' + e.n + '을(를) 무너뜨린다'); } // M5-2
  const kOnce = fxFlag(p, 'ctrKiOnce') && b.ctrKiR === (b.ysR || 0); if (fxFlag(p, 'ctrKiOnce')) b.ctrKiR = b.ysR || 0; // 0.8.0 5단계 비운 그릇: 되받기로 얻는 기는 내 차례 사이 한 번
  const kWant = kOnce ? 0 : MONK.kiCtr + (S.ki || 0) + (p.ctrN >= 2 ? fxVal(p, 'ctrKi2', 0, (a, v) => a + v) : 0); const k0 = st(p, 'empower'); if (kWant) addS(b, p, 'empower', kWant); const kg = st(p, 'empower') - k0;
  if (kWant > kg) { const sp = fxVal(p, 'kiSpillSt', 0, (a, v) => a + v); if (sp) fxStam(p, sp * (kWant - kg)); } // 넘치는 기운: 버려지는 기 1마다 스태미나
  if (e.alive && S.chill) addS(b, e, 'chill', S.chill); if (e.alive && S.weak) e.ctrWeak = Math.max(e.ctrWeak || 0, S.weak);
  { const L = [bk ? '붕괴 +' + bk : '', kg > 0 ? '기 +' + kg : '', e.alive && S.chill ? e.n + ' 둔화 ' + S.chill : '', e.alive && S.weak ? e.n + ' 약화 ' + S.weak : ''].filter(Boolean); if (L.length) logp(b, 'good', '되받기. ' + L.join(', ')); }
  if (S.hz && !S.hz.used) { S.hz.used = 1; hastenBranch(b, S.hz.br, S.hz.n, S.hz.id); }
  ysResp(b, '막기'); // 10월 15일 유산 1차 시제품: 되받기도 대응(방어 · 자세로 받아 냄)
  b.rec.push({ k: 'ctr', role: e.role, charged: o.charged ? 1 : 0, d: r1(d) });
  fxRun(p, 'onCounter', b, p, e, d);
}
/* 0.8.0 5단계 파수꾼 (docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 2-5): 방어로 받아낸 직접 공격 하나마다.
   받아낸 몫: 방어로 줄인 피해의 per만큼 보호막(후열 공격이면 그 back배), 적 차례(내 차례 사이)마다 cap까지. 흔들리는 방패: 전열 적에게 붕괴 brk, 적 차례마다 한 번 */
const WD_HELD = { per: 0.5, back: 0.5, cap: 10, brk: 10 };
function wdHeld(b, p, o, held) {
  const R = b.ysR || 0, e = o.src;
  if (fxFlag(p, 'heldWard')) { if (b.heldR !== R) { b.heldR = R; b.heldN = 0; } const v = Math.min(held * WD_HELD.per * (e.row === 'back' ? WD_HELD.back : 1), WD_HELD.cap - b.heldN); if (v > 0) { b.heldN += v; const g = addWard(b, p, v, undefined, true); if (g > 0) logp(b, 'good', '받아낸 몫. 보호막 +' + r1(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')'); b.rec.push({ k: 'held', n: r1(g), want: r1(v) }); } }
  if (fxFlag(p, 'heldBrk') && e.alive && e.row === 'front' && b.heldBrkR !== R) { b.heldBrkR = R; logp(b, 'good', e.n + '의 공격을 방패로 흔든다. 붕괴 +' + WD_HELD.brk); addBreak(b, e, WD_HELD.brk); }
}
/* 방어 보호막: 기본 WARD.guard, 다진 의지면 + 의지 × 0.5, 버팀목이면 생명력 50% 이하에서 2배 (생성 배율은 addWard가 곱한다) */
function wdGuardWard(p) { let v = (p.wdSt && p.wdSt.valor ? WD_BOUND.valorGuard : WARD.guard) + /* M5-1 용맹: 방어할 때 보호막 +6 → +18 */ (fxFlag(p, 'guardWil') ? 0.5 * stat(p, 'wil') : 0); if (fxFlag(p, 'guardLow') && p.hp <= p.hpMax * 0.5) v *= 2; return v + uqA(p, 'u_guardWard', p); /* M6-1 고유 wd_h1 문지기의 맹세: 수비 태세 중 +8 */ }
/* 화형 사제의 영창이 끊긴다 (쌓인 피해 · 무너짐 · 소모품) */
function chantBreak(b, e, why) { ysResp(b, '끊기'); uqR(b.p, 'u_cut', b, b.p, e); /* M6-1 고유 hn_h6 */ elCutEv(b, e, 1, 0); /* 10월 18일 0.8.0 5단계 원소술사: 영창 끊기 (끊어진 영창 · 흩어진 주의 · 원소 장막) */ e.chant = null; e.pyreRest = 1; e.teleTurn = null; if (e.intent && (CHANT_K.includes(e.intent.k) || MCH_K.includes(e.intent.k))) { e.intent = { k: 'attack' }; e.teleX = 1; } logp(b, 'good', (why ? why + ' ' : '') + e.n + '의 영창이 끊긴다'); }
/* 보스 단계 문턱과 마지막 단계 버티기. 넘친 피해는 hurtEnemy가 쌓아 두고(e.bank), 보스가 차례를 마쳐 문이 열리면 bossBankApply가 넣는다 */
function bossGate(b, e) {
  if (e.boss === 'queen') queenThresh(b, e);
  if (e.boss === 'cryptlord') { const th = LORD.ph[(e.phase || 1) - 1]; if (th != null && e.hp <= e.hpMax * th) { e.hp = Math.max(1, Math.round(e.hpMax * th)); if (!e.lordNext) { e.lordNext = (e.phase || 1) === 1 ? 'throne' : 'collapse'; } } } // 페이즈 문턱은 한 번에 하나: 넘친 피해는 버린다
  if (e.boss === 'bardo') { const th = FOE_X.bardo.ph[(e.phase || 1) - 1]; if (th != null && e.hp <= e.hpMax * th) { e.hp = Math.max(1, Math.round(e.hpMax * th)); e.bdNext = 1; } } // A2 바르도 단계 문턱
  if (e.boss === "abbot") { const th = ABBOT.ph[(e.phase || 1) - 1]; if (th != null && e.hp <= e.hpMax * th) { e.hp = Math.max(1, Math.round(e.hpMax * th)); e.abNext = 1; } } // 페이즈 문턱은 한 번에 하나: 넘친 피해는 버린다. 보스가 행동을 마친 뒤 한 단계만 넘어간다
  if (e.role === 'boss' && e.hp <= 0) { const w = bossDwell(e); if (w && w.last && w.left) { e.hp = 1; if (!e.dwellLog) { e.dwellLog = 1; logp(b, 'sys', e.n + '이(가) 쓰러지지 않고 버틴다. 마지막 단계에서 ' + w.left + '번 더 움직인 뒤에야 쓰러뜨릴 수 있다'); } } } // 단계 최소 체류(10월 14일)
}
/* 쌓인 피해 넣기: 피해 배율은 이미 붙어 있으므로 다시 계산하지 않는다. 다음 문턱이나 버티기에 걸리면 남은 몫은 다시 쌓인다 */
function bossBankApply(b, e) {
  const n = e.bank || 0; if (!(n > 0) || !e.alive || b.over) return; e.bank = 0;
  const hp0 = e.hp; e.hp -= n; bossGate(b, e);
  const dealt = Math.max(0, hp0 - Math.max(0, e.hp)), held = e.hp > 0 && e.hp > hp0 - n + 0.001 ? Math.max(0, n - dealt) : 0; if (held > 0) e.bank = r1(held);
  const ds = b.damageStats || (b.damageStats = { v: 0, dealt: 0, taken: 0 }); ds.dealt += dealt;
  b.rec.push({ k: 'dealt', t: r1(b.t), d: r1(dealt), role: e.role, a: '쌓인 피해', dot: true, bank: 1 });
  logp(b, 'good', '쌓였던 피해가 ' + e.n + '에게 들어간다. ' + r1(dealt) + ' 피해' + (held > 0 ? ' (쌓임 ' + r1(held) + ' · ' + ((bossDwell(e) || {}).last ? '버티는 중' : '단계 문턱') + ')' : ''));
  if (e.hp <= 0) killEnemy(b, e);
  checkEnd(b);
}
/* ===== 0.8.0 A0 챕터 장치 틀: CH_DEVICE[챕터]의 훅(onRoomStart · onRoundEnd · onFoeBreak · onFoeDown · onRoomEnd)을 부른다. 장치가 없으면 아무 일도 없다 */
function chDevOf(b) { return typeof CH_DEVICE !== 'undefined' ? CH_DEVICE[(b && b.ctx && b.ctx.ch) || 1] || null : null; }
function chDev(b, h, ...a) { const D = chDevOf(b); if (D && typeof D[h] === 'function') { D[h](b, ...a); if (b.rec) b.rec.push({ k: 'dev', h }); } }
function chDevChip(b) { const D = chDevOf(b); if (!D || !D.chip) return ''; const t = D.chip(b); return t ? `<span class="chip devc" data-info="chdev">${esc(D.n || '')} ${esc(String(t))}</span>` : ''; }
/* ===== 0.8.0 A1 타수 → 체력: 적 체력 = 타수(data/foes.js hits.hp) × FOE_HIT_REF[챕터][층 띠].dmg × 등급 맞춤 배율(FOE_HP_ON[챕터].k) × 정예 1.8(우두머리는 이미 정예) × 강인 1.5. 켠 챕터만 */
function foeHitsDef(e, ch) { if (typeof FOES === 'undefined') return null; const F = e.role === 'boss' ? FOES[e.boss] : e.strong ? FOES[e.foe] : e.bell ? (FOES.bellringer && FOES.bellringer.bellHits ? { ch: 1, grade: 'add', hits: { hp: FOES.bellringer.bellHits } } : null) : e.corpse ? FOES.minion : FOES[e.role]; return F && F.ch === ch && F.hits && !F.unused ? F : null; }
function foeHitHp(e, ch, floor) {
  const on = typeof FOE_HP_ON !== 'undefined' && FOE_HP_ON[ch]; if (!on || typeof FOE_HIT_REF === 'undefined' || !FOE_HIT_REF || !FOE_HIT_REF[ch]) return 0;
  const F = foeHitsDef(e, ch); if (!F) return 0; const bi = e.role === 'boss' ? 4 : HIT_BANDS.findIndex(([a, z]) => floor >= a && floor <= z); const R = FOE_HIT_REF[ch][Math.max(0, bi)]; if (!R) return 0;
  const g = e.role === 'boss' ? 'boss' : e.strong ? 'strong' : F.grade === 'elite' ? 'elite' : 'mob'; const k = (on.k && on.k[g]) || 1;
  return F.hits.hp * R.dmg * k * (e.elite && !e.strong && F.grade !== 'elite' ? 1.8 : 1) * (e.tough ? 1.5 : 1);
}
/* ===== 0.8.0 A0 갑옷 · 방패 (2 · 3챕터 설계 확정 「갑옷과 방패」. 값은 data/foes.js armor · shield, 1 · 2챕터는 둘 다 0) =====
   갑옷 N: 맞을 때마다 피해 −N, 단 원래 피해의 1/3은 들어간다. 무너지면 벗겨진다(그 전투 · 보스는 그 단계). 지속 피해는 무시한다.
   방패 N겹: 한 적을 노린 행동 하나를 통째로 막고 한 겹 잃는다(강공격은 두 겹). 광역 · 지속 피해는 지나간다 */
function foeAS(b, e) { if (e.armor == null) { const F = foeDef(b, e); e.armor = (F && F.armor) || 0; e.shield = e.shieldMax = (F && F.shield) || 0; } return e; }
function foeArmor(b, e, d, o) {
  if (e.shield > 0 && !o.aoe) { const n = b.cur && b.cur.id === 'heavy' ? 2 : 1; if (e.shBlkA !== b.actN) { e.shBlkA = b.actN; e.shield = Math.max(0, e.shield - n); logp(b, 'sys', e.n + '의 방패가 막는다. 방패 ' + e.shield + '겹'); b.rec.push({ k: 'shieldBlk', role: e.role, n }); } return 0; }
  if (e.shBlkA === b.actN && b.actN != null && !o.aoe) return 0; // 막은 행동의 나머지 타격
  if (e.armor > 0 && !e.armorOff) d = Math.max(d / 3, d - e.armor);
  return d;
}
function hurtEnemy(b, e, raw, o) {
  o = o || {};
  if (!e.alive) return 0;
  let d = raw;

  if (e.s.weak && false) d *= 1;
  const W0 = o.dot || o.silent ? null : { f: r1(raw), wk: b.cur ? st(b.p, 'weak') : 0, em: b.cur ? st(b.p, 'empower') : 0, vu: st(e, 'vuln'), pr: st(e, 'protect'), br: !!e.braced, wr: e.wrap > 0 ? 1 : 0, ig: o.noIgn ? 0 : st(e, 'ignite'), bw: !o.aoe && e.row === 'back' && alive(b).some(x => x.role === 'bonewall') }; /* 화면용 까닭(읽기만) */
  const fullF = !o.dot && !o.aoe && b.p.build === 'hunter' && b.p.focus && b.p.focus.id === e.id && b.p.focus.n >= HUNT.focusMax; // 추적 3겹: 몸 낮추기 · 버티기가 통하지 않는다
  if (!o.dot && !o.aoe && b.p.build === 'hunter' && (o.single || o.melee)) { const p = b.p, key = b.curSkill ? b.curSkill + ':' + e.id : null; let pre; if (key && b.focusKey === key) pre = b.focusPre; else { const f = p.focus; pre = f && f.id === e.id ? f.n : p.hnPass ? (p.hnPass = 0, 1) : f && f.n > 0 && uqF(p, 'u_focKeep1') ? 1 : 0; /* M6-1 고유 hn_h2 */ p.focus = { id: e.id, n: Math.min(focusCapOf(p), pre + 1) }; if (p.hnSt && p.hnSt.scent && st(e, 'bleed') > 0 && b.hnScentA !== b.actN) { b.hnScentA = b.actN; p.focus.n = Math.min(focusCapOf(p), p.focus.n + p.hnSt.scent); } /* M5-4 피 냄새 */ if (key) { b.focusKey = key; b.focusPre = pre; } if (pre === HUNT.focusMax - 1 && HUNT.focusHaste) { addS(b, p, 'haste', HUNT.focusHaste); logp(b, 'good', '추적 ' + HUNT.focusMax + '겹: 가속 1'); } } uqR(p, 'u_focPre', b, p, e, pre); /* M6-1 고유 hn_h1: 맞히기 전 겹 */ d *= 1 + (e.elite || e.strong || e.role === 'boss' ? HUNT.focusBig : uqV(p, 'u_focPer', HUNT.focusPer, (a, v) => a + v) /* M6-1 고유 hn_h2 대가 · hn_r5 */) * pre; } /* 0.8.0 5단계: 상한은 focusCapOf(끝까지 쫓는 자 4), 넘겨받는 추적(p.hnPass)이면 다른 적이 1겹에서 시작 */ // 사냥꾼 추적 (10월 5일 만든 사람 결정): 한 적만 치는 공격 한 번(연타라도 스킬 한 번)에 한 겹, 최대 3, 피해 보너스는 맞히기 전 겹마다 +5%. 다른 적을 치면 그 적에게 1겹부터. 여럿을 치는 공격과 지속 피해는 손대지 않는다
  if (!o.dot && e.s.poison && hasIt(b.p, 'vpouch')) d *= 1.15;
  if (!o.dot && o.melee && o.single && b.p.scar > 0 && hasIt(b.p, 'scarcharm')) d += Math.min(10, b.p.scar * 0.15);
  if (!o.dot && (o.single || o.melee) && (hasIt(b.p, 'markamu') || uqF(b.p, 'u_mark'))) { const mkA = hasIt(b.p, 'markamu'), mk = b.p.mk; if (mk && mk.id !== e.id && mk.n > 0 && (mkA || uqF(b.p, 'u_markC'))) d *= 0.9; b.p.mk = mk && mk.id === e.id ? { id: e.id, n: mk.n + 1 } : { id: e.id, n: 1 }; if (b.p.mk.n >= 3) { b.p.mk.n = 0; if (mkA || uqF(b.p, 'u_markR')) b.markTgt = e; } } /* M6-1 고유 cm_mark: 규칙(셋째 타격 취약) · 대가(바꾼 첫 공격 −10%)를 따로 */
  if (!o.dot && hasIt(b.p, 'focusring')) d *= o.aoe ? 0.7 : 1.07;
  if (e.vow && !o.dot) d *= ABBOT.vowTaken; else if (e.vow && o.shock) d *= 1 - (1 - ABBOT.vowTaken) * ELEM.half; // 열충격은 서원의 감소를 절반만
  if (e.evading && !o.dot && !o.aoe && fullF) logp(b, 'good', '추적 3겹: ' + e.n + '의 몸 낮추기를 꿰뚫는다');
  if (e.evading && !o.dot && !o.aoe && !fullF) { e.evading = 0; e.evHitA = b.actN; logp(b, 'sys', e.n + '이(가) 몸을 틀어 절반만 맞는다. 자세가 흔들려 붕괴 2배'); if (!hasBt(b.p, 'clarity')) d *= 0.5; } // 0.8.0 6단계 A-7: 몸 낮춘 적은 한 적 공격의 피해 −50%(전에는 0), 그 공격의 붕괴 ×2. 3챕터 맑은 눈이면 피해 그대로 // 3챕터 맑은 눈의 성소: 막힌 공격도 절반 // 몸 낮추기: 다음 한 적 공격을 피한다 (광역 · 지속 피해는 그대로)
  if (e.braced && !o.dot && !fullF) d *= EKW.braceRed; else if (e.braced && o.shock) d *= 1 - (1 - EKW.braceRed) * ELEM.half; // 열충격은 버티기의 감소를 절반만
  if (e.demand && e.demand.turn === b.turnIdx && (!o.dot || o.shock) && b.cur) e.demand.hit = 1; // 수도원장의 요구: 이번 차례에 쳤는가
  if (!o.dot && b.cur && b.p.whet) { d *= 1 + b.p.whet; b.p.whet = 0; } // 소모품 숫돌
  if (!o.dot && e.markDmg) { d *= 1 + e.markDmg; e.markDmg = 0; } // 소모품 표식 분필
  if (e.under && !o.dot && !o.aoe) return 0; // 땅속: 한 적 대상은 닿지 않는다 (광역 ×1.3은 aoeApply)
  if (e.haze > 0 && !o.dot) { const hz = hazeHit(b, e, o, fullF); if (!hz) return 0; d *= hz; } // 3챕터 허상: 한 적 공격 하나가 한 겹을 걷고 헛친다
  if ((b.ctx.ch || 1) >= 3) d *= ch3HitMul(b, e, o); // 붕대 · 모래폭풍 · 왕관 · 강적
  if (isCh2(b)) { d *= ch2HitMul(b, e, o); if (b.cur || o.ctr) d *= ch2OutMul(b, e, o); if (!(d > 0) && b.smokeR === b.round && e.row === 'back') { logp(b, 'sys', '연막 속이라 후열을 노린 공격이 빗나간다'); return 0; } } // A2 대형 · 거래 · 노래 · 약장수 병 · 밀쳐내기 · 연막탄
  if (!o.aoe && (!o.dot || (o.shock && !o.shockAoe)) && e.row === 'back' && alive(b).some(x => x.role === 'bonewall')) d *= BWALL.cut; // 뼈벽 뒤 후열 (한 적 대상 열충격도)
  if (o.aoe && !o.dot) d = aoeApply(b, e, d); // 광역: 땅속 · 군주의 뼈벽(절반) · 후열 · 방패벽 · 방패병 (10월 7일: 원소술사 열충격과 같은 함수로 뺐다)
  if (!o.dot && b.cur) { d = d * fxMul(b.p, 'hit', b, b.p, e, o, b.cur) + fxAdd(b.p, 'hitAdd', b, b.p, e, o, b.cur); }
  if (o.dot && e !== b.p) d *= fxMul(b.p, 'dotOut', b, b.p, e, o.label);
  if (!o.dot && (b.cur || o.ctr)) { const hp = fxAdd(b.p, 'hitP', b, b.p, e, o, b.cur); if (hp) d *= 1 + Math.max(-FX_CAP, Math.min(FX_CAP, hp)); } /* 2챕터 장비(IFX2): 장비끼리 더해 한 번 곱한다 */
  if (o.dot && e !== b.p) { const dp = fxAdd(b.p, 'dotP', b, b.p, e, o); if (dp) d *= 1 + Math.max(-FX_CAP, Math.min(FX_CAP, dp)); }
  d = kwTaken(b, e, d, o);
  const boss = b.en.find(x => x.role === 'boss' && x.alive);
  if (boss && boss.boss === 'tree' && e.role === 'boss' && !o.dot) {
    if (b.season === 2 && o.single) { b.missToggle = !b.missToggle; if (b.missToggle) { logp(b, 'sys', '낙엽 사이로 공격이 빗나간다'); return 0; } }
    if (b.season === 2 && o.aoe) d *= 1.5;
    if (b.season === 1 && o.fire) d *= 1.5;
  }
  if (d > 0 && b.p.build === 'elementalist') { const fa = fxAdd(b.p, 'flatAdd', b, b.p, e, o, b.cur); if (fa) d += fa; } // 10월 18일 0.8.0 5단계 원소술사 고정 피해(flatAdd, 원거리 초안 1-3 · 결정 10): 배율을 모두 곱한 뒤 더한다(불의 학도 스킬 첫 타격 +3 · 남는 울림 열충격 +3)
  d = Math.max(0, d);
  if (e.barrier > 0 && d > 0) { const a = Math.min(e.barrier, d); e.barrier = r1(e.barrier - a); d -= a; if (d <= 0) { logp(b, 'sys', e.n + '의 보호막이 받아낸다'); return 0; } } // A1 적 보호막(끝나지 않은 기도)
  if (!o.dot && d > 0 && (foeAS(b, e).shield > 0 || e.armor > 0 || (e.shBlkA != null && e.shBlkA === b.actN))) { d = foeArmor(b, e, d, o); if (d <= 0) return 0; } // A0 갑옷 · 방패
  if (e.role === 'bomber') d = !o.dot && !o.aoe ? Math.max(d, e.hp) : Math.min(d, Math.max(0, e.hp - 1)); // 자폭병 (10월 4일): 한 적 공격 한 번에는 반드시 쓰러지고, 광역 · 지속 피해로는 쓰러지지 않는다
  const hp0 = e.hp;
  e.hp -= d;
  if (e.mimicOn && !o.dot && b.cur && d > e.mimicOn.max) e.mimicOn.max = d; // 메아리 망령: 본뜨는 동안 내가 고른 행동이 준 가장 큰 한 방
  bossGate(b, e); // 보스 단계 문턱 · 마지막 단계 버티기 (10월 15일: 쌓인 피해도 같은 함수를 쓴다)
  if (e.hazeHit && !o.dot && d > 0) e.hazeHit = 0;
  const actualDealt = Math.max(0, hp0 - Math.max(0, e.hp)); e.tookSince = (e.tookSince || 0) + actualDealt; // A2 빚 수금꾼 장부 적기
  const held = e.role === 'boss' && e.hp > 0 && e.hp > hp0 - d + 0.001 ? Math.max(0, d - actualDealt) : 0; // 보스 단계 문턱 · 최소 체류로 막힌 몫
  if (held > 0) e.bank = r1((e.bank || 0) + held * BOSS_BANK); // 10월 15일(만든 사람 결정): 막힌 피해는 버리지 않고 쌓았다가 문이 열리면 넣는다
  const damageStats = b.damageStats || (b.damageStats = { v: 0, dealt: 0, taken: 0 }); damageStats.dealt += actualDealt;
  b.rec.push({ k: 'dealt', t: r1(b.t), d: r1(actualDealt), role: e.role, a: o.label || b.curSkill || (b.cur && b.cur.id) || '공격', dot: !!o.dot }); if (b.p.build === 'hunter' && b.extraTurn && b.cur) b.rec[b.rec.length - 1].x2 = 1; // 0.8.0 5단계 측정(원거리 초안 2-10): 사냥꾼 가속의 두 번째 차례에 준 피해
  if (e.chant && d > 0 && e.hp > 0) { e.chant.taken += d; if (e.chant.taken >= e.chant.need) chantBreak(b, e, '쌓인 상처에'); } // 화형 사제: 영창 중 받은 피해
  if (!o.dot && b.cur) fxRun(b.p, 'onHit', b, b.p, e, o, b.cur, d, Math.max(0, hp0 - Math.max(0, e.hp)));
  if (e.countering && e.hp > 0 && !o.dot && o.melee && o.single) { e.countering = 0; hurtPlayer(b, enemyHitEst(b, e), { src: e, single: 1, counter: 1, label: e.n + '이(가) 되받아친다' }); } // 반격 태세
  if (e.foe === 'pilgrim' && !e.frenzy && e.hp < e.hpMax * 0.5 && e.hp > 0) { e.frenzy = 1; logp(b, 'bad', e.n + '의 눈이 번들거린다. 더 빨라진다'); codexHit(b, 'pilgrim', 'frenzy'); }
  if (!o.dot && b.p.build === 'berserker') addRage(b, 1);
  if (!o.silent && d > 0) { const hw = held >= 0.05 ? ' (쌓임 ' + r1(held) + ' · ' + ((bossDwell(e) || {}).last ? '버티는 중' : '단계 문턱') + ')' : ''; const shown = held >= 0.05 ? actualDealt : d; logp(b, o.dot ? 'sys' : 'good', o.dot ? (o.label || '피해') + '이(가) ' + e.n + '을(를) 갉아먹는다. ' + r1(shown) + ' 피해' + hw : e.n + '에게 ' + r1(shown) + ' 피해' + hw); }
  if (W0 && d > 0) { const m = []; if (W0.wk) m.push('약화 ' + W0.wk + '로 내 피해 −25%'); if (W0.em) m.push((b.p.build === 'monk' ? '기 ' : '강화 ') + W0.em + '로 +25%'); if (W0.vu) m.push('취약 ' + W0.vu + '로 +25%'); if (W0.pr) m.push('보호 ' + W0.pr + '로 −25%'); if (W0.br && !fullF && !o.shock) m.push('버티는 중이라 ' + Math.round((1 - EKW.braceRed) * 100) + '% 줄어듦'); if (W0.wr) m.push('붕대로 −' + Math.round(WRAP.cut * 100) + '%'); if (W0.bw) m.push('뼈벽 뒤라 줄어듦'); if (W0.ig) m.push('화상 ' + W0.ig + '이 터져 더해짐'); if (m.length) whyPush(b, { side: 'out', n: e.n, f: W0.f, d: r1(d), m }); }
  const leechBleed = Math.min(KW.bleed, stk(e, 'bleed') + (o.leechBleed || 0));
  if (isBu(b.p) && !o.dot && o.melee && b.cur && d > 0 && leechBleed > 0) { const g = bHeal(b, Math.max(0, hp0 - Math.max(0, e.hp)) * Math.min(BUTCH.leechMax, BUTCH.leech * leechBleed), 'leech'); if (g > 0) logp(b, 'good', e.n + '의 피를 마신다. 생명력 +' + r1(g)); }
  if (e.hp <= 0 && d > 0 && (leechBleed > 0 || (o.dot && o.label === '출혈'))) buHarvest(b, e);
  if (e.hp <= 0) { if (o.dot && o.label === '중독' && !e.pile && !e.summoned && e.role !== 'root') unlAdd(b, 'poisonKill'); killEnemy(b, e); } // 해금 셈: 중독이 마지막 피해
  checkEnd(b);
  return d;
}
function addRage(b, n) {
  const p = b.p; if (p.build !== 'berserker' || p.s.rage) return;
  if (p.hp < p.hpMax * 0.5) n *= 2;
  p.rage += n;
  if (p.rage >= 10) { p.rage = 0; addS(b, p, 'rage', 3); logp(b, 'crit', '분노가 넘친다. 격노'); }
}
const ST_COST = { grudge: 15, judgment: 14, lacerate: 12, crush: 18, cleave: 18, reckless: 12, shieldbash: 15, aimshot: 15, volley: 20, weakspot: 15, snare: 15, viper: 15, dagger: 12, shadowstrike: 15, scarcut: 12 };
function skillRes(s) { if (ST_COST[s.id] != null) return 'st'; if (!s.mana && s.hpCost) return 'hp'; return 'mp'; }
function resLabel(s, mana) { const r = skillRes(s); if (r === 'st') return '스태미나 ' + ST_COST[s.id]; if (r === 'hp') return '생명력 ' + Math.round(s.hpCost * 100) + '%'; return '마나 ' + (mana != null ? mana : s.mana); }
const hpCostMul = p => p.eq && p.eq.flask === 'bloodoil' ? 0.7 : 1;
function ledgerCost(p, lack) { return lack > 0 ? p.hpMax * 0.06 * hpCostMul(p) : 0; }
function skillCost(p, id, base) { return base + (p.eq.gloves === 'knot' && (id === 'burst' || id === 'release') ? 2 : 0) + (hasIt(p, 'resostone') && id === p.lastSkillId ? 2 : 0); }
const hasEcho = p => p.eq.ring1 === 'echo' || p.eq.ring2 === 'echo';
function payMana(b, cost) {
  const p = b.p; const obr = fxVal(p, 'manaToHp', 0, (a, v) => v);
  if (p.mp < cost && obr && p.build !== 'warlock') { const lack = cost - p.mp; p.mp = 0; p.hp -= lack * obr; fxHit('oathbreaker'); logp(b, 'bad', '깨진 맹세를 피로 갚는다. 생명력 ' + r1(lack * obr)); checkEnd(b); return; }
  if (p.mp >= cost || p.build !== 'warlock') { p.mp = Math.max(0, p.mp - cost); return; }
  const lack = cost - p.mp; p.mp = 0; p.hp -= lack * 2 * hpCostMul(p); logp(b, 'bad', '모자란 마나를 피로 채운다. 생명력 ' + r1(lack * 2)); checkEnd(b);
}
function killEnemy(b, e) {
  if (e.role === 'crown') { crownBreak(b, e); return; } // 3챕터: 왕관은 깨진다
  if (e.mendRise && !b.over) { e.mendRise = 0; e.hp = Math.max(1, Math.round(e.hpMax * MENDER.rise)); e.alive = true; logp(b, 'bad', e.n + '이(가) 실밥을 당겨 다시 일어선다'); return; } // A1 수선공 정예 「마지막 수선」
  if (!e.pile && !e.summoned && !['root', 'candle', 'bonewall'].includes(e.role) && !b.over) { if (['poison', 'bleed', 'ignite', 'weak', 'vuln', 'chill'].some(k => b.p.s[k])) unlAdd(b, 'sinKill'); if (e.strong && e.foe) unlAdd(b, 'foe:' + e.foe); } // 숨겨진 직업 해금 셈
  if (e.role === 'skeleton' && !e.pile && !e.rose && !e.norise && !st(e, 'ignite') && !e.s.broken && !hasBt(b.p, 'rest') && !b.over) { makePile(b, e); return; } // 2챕터 해골: 화상 · 붕괴 · 한 번 일어섬 · 안식의 성소면 더미가 남지 않는다
  if (e.role === 'skeleton' && !e.pile && !e.rose && st(e, 'ignite')) logp(b, 'good', e.n + '이(가) 재가 되어 흩어진다');
  e.alive = false; e.hp = 0; logp(b, 'good', e.n + (e.pile ? '의 뼈 더미가 흩어진다' : '이(가) 쓰러진다'));
  if (b.p.hnSt && b.p.hnSt.carry && b.p.focus && b.p.focus.id === e.id && b.p.focus.n > 0 && !b.over) { const nx = alive(b).filter(o => o.role !== 'root').sort((x, y) => x.hp - y.hp)[0]; if (nx) { b.p.focus = { id: nx.id, n: b.p.focus.n }; logp(b, 'good', '끝없는 사냥: 추적 ' + b.p.focus.n + '겹이 ' + nx.n + '에게 넘어간다'); } } // M5-4
  if (b.p.asSt && b.p.asSt.plague && st(e, 'poison') > 0 && !b.over) { const n = Math.ceil(st(e, 'poison') * b.p.asSt.plague); let k = 0; for (const o of alive(b)) if (o.role !== 'root') { addPoison(b, o, n, 1); k++; } if (k) logp(b, 'good', '역병: ' + e.n + '의 중독 ' + n + '이(가) 다른 적에게 옮겨붙는다'); } // M5-3
  if (e.mark && isBm(b.p)) { const M = e.mark; e.mark = null; if (!e.killPaid) { e.killPaid = 1; const n = Math.min(BLOOD.spreadKillMax, Math.ceil(st(e, 'poison') * (M.per || 1))); if (n > 0) { if (b.dotLoop) (b.markQ = b.markQ || []).push({ e, n }); else bmSpread(b, e, n, null); } } } // 숨겨진 직업 3 표식: 무엇으로든 쓰러지면 한 번 (뼈 더미가 될 때는 남는다)
  if (e.role === 'bloat') { if (st(e, 'ignite')) logp(b, 'good', e.n + '이(가) 불에 타 터지지 않는다'); else { fxRun(b.p, 'onBloat', b, b.p, e); if (!b.noBloat) addPoison(b, b.p, BLOAT.me, 0); for (const o of alive(b)) if (o.role !== 'root') addPoison(b, o, BLOAT.foes, 0); logp(b, 'bad', e.n + '이(가) 터진다. 나에게 중독 ' + (b.noBloat ? 0 : BLOAT.me) + ', 다른 적 모두에게 중독 ' + BLOAT.foes); } }
  if ((b.ctx.ch || 1) >= 3) ch3OnKill(b, e);
  if (isCh2(b)) ch2OnKill(b, e); // A2
  if (e.role === 'bonewall') { const m = b.en.find(x => x.id === e.wallOf); if (m) m.wallWait = BWALL.wait; if (e.lordWall && m && m.alive && !alive(b).some(x => x.lordWall)) { addS(b, m, 'vuln', LORD.expose); logp(b, 'good', '뼈벽이 모두 무너져 ' + m.n + '이(가) 드러난다. 취약 ' + LORD.expose); } }
  if (e.boss === 'abbot') { for (const x of b.en) if (x.alive && (x.monk || x.role === 'candle')) { x.alive = false; x.hp = 0; } } // 수도원장이 쓰러지면 수도사와 촛불도 흩어진다
  if (e.loot) { returnLoot(b, e.loot); logp(b, 'good', e.loot.n + '을(를) 되찾는다'); e.loot = null; }
  if (e.foe === 'bishop') { const cs = corpsesOf(b); for (const c of cs) { c.alive = false; c.hp = 0; } if (cs.length) logp(b, 'good', (FOES.bishop.corpseN || '시체') + '들이 무너진다'); }
  if (e.foe === 'cantor') hymnReset(b);
  if (e.foe === 'scribe' && (b.seal || []).length) { b.seal = []; logp(b, 'good', '봉인이 풀린다'); }
  if (b.p.build === 'warlock' && (e.s.weak || e.s.vuln)) { const hl = b.p.hpMax * CLS_TUNE.warlockKill; b.p.hp = Math.min(b.p.hpMax, b.p.hp + hl); logp(b, 'good', '꺼져 가는 혼을 들이마신다. 생명력 +' + r1(hl)); }
  b.xp = (b.xp || 0) + xpOf(e);
  rollDrops(b, e);
  if (e.bell) { const rg = b.en.find(x => x.foe === 'bellringer' && x.alive); if (rg) { rg.stun = 1; logp(b, 'crit', '큰 종이 깨진다. ' + rg.n + '이(가) 비틀거린다'); } codexHit(b, 'bellringer', 'bellbreak'); }
  if (e.foe === 'pilgrim') { b.rotted = 1; logp(b, 'bad', e.n + '의 몸이 무너지며 썩은 냄새가 퍼진다'); codexHit(b, 'pilgrim', 'rot'); }
  if (e.s.plague) { let n = 0; for (const x of alive(b)) if (x.role !== 'root') { addS(b, x, 'weak', aoeN(2)); addS(b, x, 'plague', 4); n++; } if (n) logp(b, 'good', '역병이 남은 적들에게 옮는다'); }
  fxRun(b.p, 'onKill', b, b.p, e);
  chargeEv(b, 'kill'); ysPreKill(b, e); // 10월 15일 유산 1차 시제품: 먼저 치우기
  b.rec.push({ k: 'kill', t: r1(b.t), role: e.role });
  for (const x of alive(b)) if (x.role === 'drill' && x !== e && !e.summoned) x.orderNext = 1; // A1 수련장 성향: 동료가 쓰러지면 남은 동료를 먼저 다그친다
  if (e.boss === 'abbot' && (b.ctx.ch || 1) === 1 && FOES.abbot.log.line) logp(b, 'crit', e.n + ': ' + FOES.abbot.log.line); // A1 마지막 한 마디(만든 사람)
  chDev(b, 'onFoeDown', e); // A0 챕터 장치
}
function checkEnd(b) { const was = b.over; checkEnd0(b); if (!was && b.over) chDev(b, 'onRoomEnd', b.over); } // A0 챕터 장치: 방이 끝날 때 한 번
function checkEnd0(b) {
  if (b.over) return;
  if (b.p.hp <= 0 && b.ctx.safe) { b.p.hp = 1; logp(b, 'good', '수련장의 짚 인형처럼 버틴다. 여기서는 쓰러지지 않는다(생명력 1)'); }
  if (b.p.hp <= 0) { b.p.hp = 0; b.over = 'lose'; logp(b, 'bad', '무릎이 꺾인다. 쓰러졌다'); return; }
  if (!alive(b).some(realFoe)) {
    for (const e of alive(b)) if (e.pile || e.role === 'bonewall' || e.role === 'crown') { e.alive = false; e.hp = 0; } // 남은 것이 뼈 더미 · 뼈벽뿐이면 무너진다(G8)
    b.over = 'win'; logp(b, 'good', '마지막 적이 쓰러진다. 방이 조용해진다'); if (b.p.hp <= b.p.hpMax * 0.3) unlAdd(b, 'edge'); if (b.ctx.boss && b.ctx.bossKind) { unlAdd(b, 'boss:' + b.ctx.bossKind); if (b.p.hpPen) unlAdd(b, 'bloodBoss:' + b.ctx.bossKind); } // 10월 4일: 방을 이기면 플라스크가 차던 규칙은 없앴다(플라스크는 아주 드문 전리품)
  }
}
/* 도둑 (10월 4일): 플라스크 한 칸 · 골드 · 가방의 장비(무작위) 가운데 하나. 잡으면 돌려받고, 달아나면 잃는다 */
function stealLoot(b) {
  if (b.antiSteal) return { k: 'none', n: '쇠붙이' }; // 소모품 쇠붙이 미끼
  const p = b.p; const run = typeof G !== 'undefined' && G.run && G.run.p === p ? G.run : null; const opts = [];
  for (const k of ['life', 'mana', 'stam']) if ((p.flask[k] || 0) > 0) opts.push({ k: 'flask', f: k, n: { life: '생명력 플라스크', mana: '정화 플라스크', stam: '스태미나 플라스크' }[k] + ' 한 칸' });
  if (run && (run.gold || 0) > 0) opts.push({ k: 'gold', g: Math.min(run.gold, 20 + 10 * ((b.ctx && b.ctx.lv) || 1)) });
  if (run && run.bag && run.bag.length) opts.push({ k: 'item' });
  if (!opts.length) return null; const o = opts[Math.floor(b.rngF() * opts.length)];
  if (o.k === 'flask') p.flask[o.f]--;
  if (o.k === 'gold') { run.gold -= o.g; o.n = '골드 ' + o.g; }
  if (o.k === 'item') { const u = run.bag.splice(Math.floor(b.rngF() * run.bag.length), 1)[0]; o.u = u; o.run = run; o.n = run.inv[u] ? itName(run.inv[u]) || '장비' : '장비'; /* 0.8.0 M6-2: 새 장비 이름 */ }
  if (o.k === 'gold') o.run = run; return o;
}
function returnLoot(b, o) { if (o.k === 'flask') b.p.flask[o.f]++; if (o.k === 'gold' && o.run) o.run.gold = (o.run.gold || 0) + o.g; if (o.k === 'item' && o.run) o.run.bag.push(o.u); }
