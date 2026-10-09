'use strict';
function addS(b, u, k, dur, stacks, max) {
  if (KW[k]) {
    let n = Math.round(dur || 0); if (n <= 0) return 0;
    if (b.carve && b.cur && b.cur.grp && u !== b.p && carveMul(b, b.cur.grp) < 1) n = Math.max(1, Math.floor(n * carveMul(b, b.cur.grp)));
    if (u !== b.p && b.cur && !b.selfSt && b.p.eq && k !== 'poison' && KW_BAD.includes(k)) { const so = fxAdd(b.p, 'stOut', b, b.p, u, k); if (so) n += Math.round(so); } // 3챕터 장비: 내가 거는 상태에 더하는 수
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
    const cur = stk(u, k); const nv = Math.min(Math.max(KW[k], cur), cur + n);
    if (nv > cur) u.s[k] = { stacks: nv, until: KW_FOREVER, dur: KW_FOREVER };
    if (u === b.p && k === 'protect' && nv > cur && !b.fxProtIn && u.eq) { b.fxProtIn = 1; fxRun(u, 'onProt', b, u, nv - cur); b.fxProtIn = 0; } /* 2챕터 장비 */
    if (nv > cur && (b.ctx.ch || 1) >= 3) ch3OnStatus(b, u, k, nv - cur);
    if (u !== b.p && KW_BAD.includes(k) && nv > cur) chargeEv(b, k === 'poison' ? 'poison' : 'apply');
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
  expireAll(b);
  for (const e of alive(b)) if (e.pile && e.pile.born < T) { e.pile.wait--; if (e.pile.wait <= 0) riseSkel(b, e, ''); } // 뼈 더미: 그 라운드에 생긴 더미는 줄지 않는다
  for (const w of alive(b)) if (w.role === 'bonewall' && !b.en.some(m => m.id === w.wallOf && m.alive)) { w.alive = false; w.hp = 0; logp(b, 'good', '쌓은 자가 쓰러져 뼈벽이 무너진다'); }
  for (const e of alive(b)) if (e.under && !alive(b).some(x => x !== e && !x.pile && !x.under && x.role !== 'root')) { e.under = 0; logp(b, 'sys', e.n + '이(가) 땅 위로 밀려 나온다'); } // 칠 수 있는 적이 늘 하나는 있다(G9)
  // 플레이어 자원 자연 회복 (전역 T)
  { const rg = fxVal(p, 'regen', 0, (a, v) => a + v); if (rg && p.st < p.stMax) fxHit('clothgloves'); p.st = Math.min(p.stMax, p.st + ST_REGEN + rg); }
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
    if (u.s.poison) { const n = u.s.poison.stacks; dmgDot(b, u, n * dm, '중독'); if (u.s.poison && !hasMod(b, 'rotair')) { u.s.poison.stacks = n - 1; if (u.s.poison.stacks <= 0) delete u.s.poison; } } // 썩은 공기: 중독이 줄지 않는다
    if ((u.pile || u.role === 'bonewall') && u.alive && u.s.bleed) kwBleed(b, u); // 움직이지 않는 몸의 출혈은 라운드 끝에
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
  const p = b.p; o = o || {}; const raw0 = raw, nr0 = !o.dot && o.src && p.nextRed ? p.nextRed : 0, br0 = !!p.brace; /* 화면용 까닭(읽기만) */
  const bigHit = !!(o.charged || (o.src && o.src.intent && o.src.intent.aimed && !o.dot)); // 예고된 큰 공격: 강타 · 강적과 보스의 큰 한 방 · 겨눈 한 발 · 화형
  if (p.foresee && (b.round || 0) < p.foresee.until && bigHit) raw *= 1 - p.foresee.red;
  if (bigHit && hasBt(p, 'firm')) raw *= 0.85; // 굳건함의 성소 // 사냥꾼 예고 읽기 (피할 수 없는 화형에도 든다)
  if (p.evade > 0 && !o.dot && !o.aoe && !o.spell && o.src && carveMul(b, 'prep') < 1) { p.evade--; raw *= 1 - carveMul(b, 'prep'); logp(b, 'bad', '새겨진 이름 때문에 몸이 둔하다. 일부를 맞는다'); } // 새김: 피하기는 확률이 아니라 받는 몫으로
  else if (p.evade > 0 && !o.dot && !o.aoe && !o.spell && o.src) { p.evade--; logp(b, 'good', (o.src.n || '적') + '의 공격을 몸을 빼 피한다' + (p.evade ? ' (남은 ' + p.evade + '번)' : '')); fxRun(p, 'onEvade', b, p, o.src); const c = p.evadeCtr; if (c && o.src.alive && (!c.charged || bigHit)) { hurtEnemy(b, o.src, outDmg(b, c.dmg, {}), { single: 1, label: '반격 사격' }); if (c.chill && o.src.alive) addS(b, o.src, 'chill', c.chill); } if (p.evadeHz) hastenBranch(b, p.evadeHz.br, p.evadeHz.n, p.evadeHz.id); if (!p.evade && !(c && c.until > (b.round || 0))) p.evadeCtr = null; return 0; } // 사냥꾼 몸 빼기 (10월 5일): 실제로 피했을 때만 반격 · 🔄
  if (!o.dot && !o.aoe && p.dodge && o.src && o.src.id === p.dodge) {
    p.dodge = 0; const red = Math.max(0, (p.dodgeRed || parryRed(p)) - parryBig(o.src)) * carveMul(b, 'prep'); raw *= 1 - red; o.parried = true; logp(b, 'good', (o.src ? o.src.n + '의 ' + (o.charged ? '강타' : '공격') : '공격') + '을(를) 칼날로 흘린다. 피해 ' + Math.round(red * 100) + '% 감소');
    fxRun(p, 'onParry', b, p, o.src);
    if (o.charged && o.src && o.src.boss === 'abbot' && p.s.brand) { p.s.brand.stacks--; if (p.s.brand.stacks <= 0) delete p.s.brand; logp(b, 'good', '흘려 낸 칼끝이 낙인 하나를 긁어낸다'); }
    if (o.charged) { addBreak(b, o.src, 25); logp(b, 'good', o.src.n + '의 자세가 흔들린다. 붕괴 게이지 +25'); }
    if (o.charged && o.src && (p.eq.amulet === 'witness')) { addS(b, o.src, 'vuln', 2); logp(b, 'good', '증인의 부적이 빈틈을 기억한다. ' + o.src.n + ' 취약'); }
    chargeEv(b, 'parry');
    const on = p.dodgeOn; p.dodgeRed = 0; p.dodgeOn = null;
    if (on && o.src && o.src.alive) { // 흘려 되돌리는 효과는 후열에도 닿는다 (암살자 초안 4절)
      if (on.dmg) hurtEnemy(b, o.src, outDmg(b, on.dmg, {}), { single: 1, label: '흘려 낸 칼끝' });
      if (on.poison && o.src.alive) addPoison(b, o.src, on.poison, 1);
      if (on.brk && o.src.alive) addBreak(b, o.src, on.brk);
      if (on.bleed && o.src.alive) addS(b, o.src, 'bleed', on.bleed);
    }
    if (on && on.hasten) hastenBranch(b, on.hb, on.hasten, null); // 🔄 흘려 내면 다른 같은 갈래 스킬 쿨타임 −n
  }
  let d = raw;
  if (!o.dot && o.src && p.nextRed) { d *= 1 - p.nextRed; p.nextRed = 0; } // 소모품 나무 부적
  if (p.guard && !o.judgment) d *= 1 - (1 - (p.eq.gloves === 'ragechain' ? 0.6 : 0.5)) * carveMul(b, 'prep'); // 준비가 새겨지면 방어가 덜 줄인다 // 심판은 방어로 줄지 않는다
  if (p.ward > 0 && p.eq.armor === 'wardcrest') d *= 0.85;
  if (p.retal) d *= 0.7;
  if (hasBt(p, 'procession') && !o.dot) d *= 0.9; // 장례 행렬을 뒤따랐다
  if (hasBt(p, 'ashcover') && !o.dot) d *= 0.95; // 3챕터 재 속의 이름: 재를 덮어 주었다
  if (p.brace) d *= 0.65;
  if (o.charged && hasIt(p, 'fury')) d *= 1.1;
  if (p.st <= 0 || p.exhaust) d *= 1.2;
  const hx = o.dot ? null : { vu: st(p, 'vuln'), pr: st(p, 'protect'), ig: st(p, 'ignite'), ex: p.st <= 0 || !!p.exhaust, gd: !!(p.guard && !o.judgment) }; /* 10월 7일 2차: 쓰러짐 화면에 보일 더해진 것 (값을 바꾸지 않는다) */
  if (p.build === 'elementalist' && o.src && !o.dot && !bigHit && (o.src.s.chill || o.src.chillR === b.round)) { const d0 = d; d *= 1 - ELEM.guard; b.frostN = (b.frostN || 0) + 1; b.frostSaved = (b.frostSaved || 0) + (d0 - d); } // 원소술사 서리 무게 (10월 7일)
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
  let wardAll = false, wardA = 0, wardBk = false;
  if (p.ward > 0 && d > 0) { const bk = o.src && !o.dot && o.src.row === 'back' && !o.wardAll; const a = Math.min(p.ward, bk ? d * WARD.back : d); p.ward -= a; d -= a; wardA = a; wardBk = !!bk; if (d <= 0) wardAll = true; else logp(b, 'good', '보호막이 ' + r1(a) + '을(를) 받아낸다' + (bk ? '. 멀리서 온 공격이라 절반만 막는다' : '')); }
  if (o.dot && b.bleedFloor && d >= p.hp && p.hp > 0) { d = Math.max(0, p.hp - 1); logp(b, 'good', '내가 낸 피로는 쓰러지지 않는다. 생명력 1에서 멈춘다'); b.rec.push({ k: 'bu', w: 'floor' }); } // 출혈 바닥 (숨겨진 직업 1): 나에게 건 출혈이 남아 있는 동안
  if (d >= p.hp && p.hp > 0 && fxList(p).some(([, f]) => f.deathSave) && !p.fxSaved) { d = p.hp - 1; p.fxSaved = 1; fxHit('deadrosary'); logp(b, 'crit', '망자의 묵주가 한 번 붙잡아 준다. 생명력 1'); }
  p.hp -= d;
  if (d > 0 && o.src && !o.dot && isBu(p)) p.tookAcc = (p.tookAcc || 0) + d; // 받은 피해 (숨겨진 직업 1): 적의 직접 공격으로 실제로 잃은 생명력
  if (d > 0) fxRun(p, 'onHurt', b, p, o, d);
  if (d > 0 && !o.dot && p.eq.gloves === 'ragechain') p.rcN = Math.min(5, (p.rcN || 0) + 1);
  if (d > 0 && o.charged && hasIt(p, 'fury')) { p.furyNext = 1; logp(b, 'good', '분노의 반지가 달아오른다. 다음 공격 +10%'); }
  if (p.guard && p.eq.armor === 'thorns' && o.src && o.src.alive && !o.dot && o.src.row === 'front') hurtEnemy(b, o.src, 2, { label: '가시 갑옷' });
  if (p.retal && d > 0 && o.src && o.src.alive && !o.dot) hurtEnemy(b, o.src, d, { label: '피의 응답' });
  if (p.thorn && o.src && o.src.alive && !o.dot) { if (p.thorn.dmg > 0 || !p.thorn.bleed) hurtEnemy(b, o.src, p.thorn.dmg, { label: '가시 방패' }); if (p.thorn.bleed && o.src.alive) { addS(b, o.src, 'bleed', p.thorn.bleed); logp(b, 'good', o.src.n + '에게 출혈 ' + p.thorn.bleed); } if (--p.thorn.n <= 0) p.thorn = null; } // 파수꾼 가시: 다음 n번 맞을 때마다
  if (d > 0) p.tookSince = (p.tookSince || 0) + d;
  if (p.brace && !o.dot && o.src && o.src.alive && o.src.row === 'front') { hurtEnemy(b, o.src, 4, { label: '강철 살갗의 반격' }); if (p.build === 'berserker' && d > 0) addRage(b, 1); }
  if (d > 0 && !o.dot) for (const e of alive(b)) if (e.s.bond) hurtEnemy(b, e, d * 0.5, { label: '피의 연결' });
  if (d > 0 && scarRate(p) > 0) p.scar = Math.min(p.hpMax * 0.5, p.scar + d * scarRate(p));
  if (p.build === 'berserker' && d > 0) addRage(b, 1);
  if (!o.silent && wardAll) logp(b, 'good', (o.label || '공격') + '. 보호막이 모두 받아냈다');
  else if (!o.silent) logp(b, 'bad', o.dot ? (o.label || '피해') + '이(가) 나를 갉아먹는다. ' + r1(d) + ' 피해' : (o.label || '공격') + '. ' + r1(d) + ' 피해' + (p.guard ? ', 방어로 절반' : ''));
  const sLine = b.logN || 0; /* 이 피해 줄의 순번 */
  if (p.build === 'monk' && (p.guard || p.stance) && !b.cur && !b.over && p.hp > 0 && o.src && !o.dot && !o.aoe && !o.spell && !o.judgment && monkCtrOk(b, o.src) && (p.ctrN || 0) < MONK.ctrMax) monkCounter(b, o); // 수도승 되받기 (의도 키가 아니라 공격의 성질로 가린다. 피해 · 가시 처리와 기록 줄 다음)
  b.rec.push({ k: 'hit', t: r1(b.t), d: r1(d), dot: !!o.dot, charged: !!o.charged, src: o.src ? o.src.role : null, guard: !!p.guard, parried: o.parried ? 1 : 0 });
  if (p.rime && o.src && o.src.alive && !o.dot && p.hp > 0) elemRime(b, o.src); // 원소술사 되얼림 · 불꽃 외투 (그 공격의 기록 뒤)
  { const m = []; if (hx) { if (hx.vu) m.push('취약 ' + hx.vu + '(으)로 +25%'); if (hx.pr) m.push('보호 ' + hx.pr + '(으)로 −25%'); if (hx.ig) m.push('화상 ' + hx.ig + '만큼 더함'); if (hx.ex) m.push('탈진으로 +20%'); if (hx.gd) m.push('방어로 줄어듦'); }
    if (o.parried) m.push('흘리기로 줄어듦'); if (nr0) m.push('부적으로 −' + Math.round(nr0 * 100) + '%'); if (br0 && !o.dot) m.push('버티기로 −35%'); if (wardA > 0) m.push('보호막이 ' + r1(wardA) + ' 받아냄' + (wardBk ? '(먼 곳에서 온 공격이라 절반만)' : '')); if (b.enrage && o.src && !o.dot) m.push('광폭화');
    const ik = o.src && o.src.intent ? o.src.intent.k : ''; const it = o.dot ? '' : /되받아친다/.test(o.label || '') ? '반격' : !o.src ? '' : ik === 'heavy' ? heavyName(o.src) : ik === 'attack' ? (o.src.intent.aimed ? '겨눈 한 발' : '공격') : (HIT_N[ik] || '');
    (b.hits3 = b.hits3 || []).push({ n: o.src ? o.src.n : '', it, l: o.src ? '' : (o.label || ''), d: r1(d), dot: o.dot ? 1 : 0, big: o.charged ? 1 : 0, m, left: r1(Math.max(0, p.hp)), r: b.round || 0 }); if (b.hits3.length > 3) b.hits3.shift(); if (!o.silent && !o.dot && m.length) whyPush(b, { side: 'in', n: o.src ? o.src.n : (o.label || ''), f: r1(raw0), d: r1(d), m, s: sLine }); } /* 10월 7일 2차: 쓰러짐 화면의 결정타 · 마지막 세 번 (기록 b.rec는 그대로) */
  checkEnd(b);
  return d;
}
const HIT_N = { explode: '폭발', burn: '화형', brand: '죄를 읽는다', erupt: '솟구침', hand: '무덤의 손', constrict: '조이기', reflect: '되비추기', mirror: '거울', counter: '반격' };
/* 수도승 되받기 (10월 7일, docs/직업/수도승.md B-3): 적의 차례에만(b.cur 없음) 나간다. 내 행동이 아니라 기를 쓰지 않고, 장비의 다음 공격 몫(분노의 반지 · 인내의 흉갑 · 분노의 사슬)도 쓰지 않는다.
   반격 태세를 부르지 않고(melee 없음), 수도원장의 요구 · 장비 onHit에 끼지 않는다(가시와 같은 급). 되받은 적에게 거는 약화는 그 적의 공격이 끝난 뒤에 건다(e.ctrWeak) */
function monkCounter(b, o) {
  const p = b.p, e = o.src, S = p.stance || {}; p.ctrN = (p.ctrN || 0) + 1;
  logp(b, 'good', '되받기 (' + p.ctrN + '/' + MONK.ctrMax + '): ' + e.n + '에게 되받아친다');
  const d = hurtEnemy(b, e, outDmg(b, wpnDmg(p) * MONK.ctr + (S.dmg || 0), { weapon: 1, ctr: 1 }), { single: 1, ctr: 1, label: '되받기' });
  let bk = 0; if (e.alive) { bk = MONK.ctrBrk + (o.charged ? MONK.ctrBig : 0) + (S.brk || 0); addBreak(b, e, bk); }
  const k0 = st(p, 'empower'); addS(b, p, 'empower', MONK.kiCtr + (S.ki || 0)); const kg = st(p, 'empower') - k0;
  if (e.alive && S.chill) addS(b, e, 'chill', S.chill); if (e.alive && S.weak) e.ctrWeak = Math.max(e.ctrWeak || 0, S.weak);
  { const L = [bk ? '붕괴 +' + bk : '', kg > 0 ? '기 +' + kg : '', e.alive && S.chill ? e.n + ' 둔화 ' + S.chill : '', e.alive && S.weak ? e.n + ' 약화 ' + S.weak : ''].filter(Boolean); if (L.length) logp(b, 'good', '되받기. ' + L.join(', ')); }
  if (S.hz && !S.hz.used) { S.hz.used = 1; hastenBranch(b, S.hz.br, S.hz.n, S.hz.id); }
  b.rec.push({ k: 'ctr', role: e.role, charged: o.charged ? 1 : 0, d: r1(d) });
  fxRun(p, 'onCounter', b, p, e, d);
}
/* 화형 사제의 영창이 끊긴다 (쌓인 피해 · 무너짐 · 소모품) */
function chantBreak(b, e, why) { e.chant = null; e.pyreRest = 1; e.teleTurn = null; if (e.intent && (CHANT_K.includes(e.intent.k) || MCH_K.includes(e.intent.k))) e.intent = { k: 'attack' }; logp(b, 'good', (why ? why + ' ' : '') + e.n + '의 영창이 끊긴다'); }
function hurtEnemy(b, e, raw, o) {
  o = o || {};
  if (!e.alive) return 0;
  let d = raw;

  if (e.s.weak && false) d *= 1;
  const W0 = o.dot || o.silent ? null : { f: r1(raw), wk: b.cur ? st(b.p, 'weak') : 0, em: b.cur ? st(b.p, 'empower') : 0, vu: st(e, 'vuln'), pr: st(e, 'protect'), br: !!e.braced, wr: e.wrap > 0 ? 1 : 0, ig: o.noIgn ? 0 : st(e, 'ignite'), bw: !o.aoe && e.row === 'back' && alive(b).some(x => x.role === 'bonewall') }; /* 화면용 까닭(읽기만) */
  const fullF = !o.dot && !o.aoe && b.p.build === 'hunter' && b.p.focus && b.p.focus.id === e.id && b.p.focus.n >= HUNT.focusMax; // 추적 3겹: 몸 낮추기 · 버티기가 통하지 않는다
  if (!o.dot && !o.aoe && b.p.build === 'hunter' && (o.single || o.melee)) { const p = b.p, key = b.curSkill ? b.curSkill + ':' + e.id : null; let pre; if (key && b.focusKey === key) pre = b.focusPre; else { const f = p.focus; pre = f && f.id === e.id ? f.n : 0; p.focus = { id: e.id, n: Math.min(HUNT.focusMax, pre + 1) }; if (key) { b.focusKey = key; b.focusPre = pre; } if (pre === HUNT.focusMax - 1 && HUNT.focusHaste) { addS(b, p, 'haste', HUNT.focusHaste); logp(b, 'good', '추적 ' + HUNT.focusMax + '겹: 가속 1'); } } d *= 1 + (e.elite || e.strong || e.role === 'boss' ? HUNT.focusBig : HUNT.focusPer) * pre; } // 사냥꾼 추적 (10월 5일 만든 사람 결정): 한 적만 치는 공격 한 번(연타라도 스킬 한 번)에 한 겹, 최대 3, 피해 보너스는 맞히기 전 겹마다 +5%. 다른 적을 치면 그 적에게 1겹부터. 여럿을 치는 공격과 지속 피해는 손대지 않는다
  if (!o.dot && e.s.poison && hasIt(b.p, 'vpouch')) d *= 1.15;
  if (!o.dot && o.melee && o.single && b.p.scar > 0 && hasIt(b.p, 'scarcharm')) d += Math.min(10, b.p.scar * 0.15);
  if (!o.dot && (o.single || o.melee) && hasIt(b.p, 'markamu')) { const mk = b.p.mk; if (mk && mk.id !== e.id && mk.n > 0) d *= 0.9; b.p.mk = mk && mk.id === e.id ? { id: e.id, n: mk.n + 1 } : { id: e.id, n: 1 }; if (b.p.mk.n >= 3) { b.p.mk.n = 0; b.markTgt = e; } }
  if (!o.dot && hasIt(b.p, 'focusring')) d *= o.aoe ? 0.7 : 1.07;
  if (e.vow && !o.dot) d *= ABBOT.vowTaken; else if (e.vow && o.shock) d *= 1 - (1 - ABBOT.vowTaken) * ELEM.half; // 열충격은 서원의 감소를 절반만
  if (e.evading && !o.dot && !o.aoe && fullF) logp(b, 'good', '추적 3겹: ' + e.n + '의 몸 낮추기를 꿰뚫는다');
  if (e.evading && !o.dot && !o.aoe && !fullF) { e.evading = 0; logp(b, 'sys', e.n + '이(가) 몸을 틀어 피한다'); if (!hasBt(b.p, 'clarity')) return 0; d *= 0.5; } // 3챕터 맑은 눈의 성소: 막힌 공격도 절반 // 몸 낮추기: 다음 한 적 공격을 피한다 (광역 · 지속 피해는 그대로)
  if (e.braced && !o.dot && !fullF) d *= EKW.braceRed; else if (e.braced && o.shock) d *= 1 - (1 - EKW.braceRed) * ELEM.half; // 열충격은 버티기의 감소를 절반만
  if (e.demand && e.demand.turn === b.turnIdx && (!o.dot || o.shock) && b.cur) e.demand.hit = 1; // 수도원장의 요구: 이번 차례에 쳤는가
  if (!o.dot && b.cur && b.p.whet) { d *= 1 + b.p.whet; b.p.whet = 0; } // 소모품 숫돌
  if (!o.dot && e.markDmg) { d *= 1 + e.markDmg; e.markDmg = 0; } // 소모품 표식 분필
  if (e.under && !o.dot && !o.aoe) return 0; // 땅속: 한 적 대상은 닿지 않는다 (광역 ×1.3은 aoeApply)
  if (e.haze > 0 && !o.dot) { const hz = hazeHit(b, e, o, fullF); if (!hz) return 0; d *= hz; } // 3챕터 허상: 한 적 공격 하나가 한 겹을 걷고 헛친다
  if ((b.ctx.ch || 1) >= 3) d *= ch3HitMul(b, e, o); // 붕대 · 모래폭풍 · 왕관 · 강적
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
  d = Math.max(0, d);
  if (e.role === 'bomber') d = !o.dot && !o.aoe ? Math.max(d, e.hp) : Math.min(d, Math.max(0, e.hp - 1)); // 자폭병 (10월 4일): 한 적 공격 한 번에는 반드시 쓰러지고, 광역 · 지속 피해로는 쓰러지지 않는다
  const hp0 = e.hp;
  e.hp -= d;
  if (e.mimicOn && !o.dot && b.cur && d > e.mimicOn.max) e.mimicOn.max = d; // 메아리 망령: 본뜨는 동안 내가 고른 행동이 준 가장 큰 한 방
  if (e.boss === 'queen') queenThresh(b, e);
  if (e.hazeHit && !o.dot && d > 0) e.hazeHit = 0;
  if (e.boss === 'cryptlord') { const th = LORD.ph[(e.phase || 1) - 1]; if (th != null && e.hp <= e.hpMax * th) { e.hp = Math.max(1, Math.round(e.hpMax * th)); if (!e.lordNext) { e.lordNext = (e.phase || 1) === 1 ? 'throne' : 'collapse'; e.intent = { k: e.lordNext }; if (e.lordNext === 'collapse') e.teleTurn = b.turnIdx; } } } // 페이즈 문턱은 한 번에 하나: 넘친 피해는 버린다
  if (e.chant && d > 0 && e.hp > 0) { e.chant.taken += d; if (e.chant.taken >= e.chant.need) chantBreak(b, e, '쌓인 상처에'); } // 화형 사제: 영창 중 받은 피해
  if (!o.dot && b.cur) fxRun(b.p, 'onHit', b, b.p, e, o, b.cur, d);
  if (e.countering && e.hp > 0 && !o.dot && o.melee && o.single && b.p.decoy) { e.countering = 0; b.p.decoy = 0; logp(b, 'good', e.n + '의 반격이 미끼 인형을 친다'); }
  if (e.countering && e.hp > 0 && !o.dot && o.melee && o.single) { e.countering = 0; hurtPlayer(b, enemyHitEst(b, e), { src: e, single: 1, label: e.n + '이(가) 되받아친다' }); } // 반격 태세
  if (e.foe === 'pilgrim' && !e.frenzy && e.hp < e.hpMax * 0.5 && e.hp > 0) { e.frenzy = 1; logp(b, 'bad', e.n + '의 눈이 번들거린다. 더 빨라진다'); codexHit(b, 'pilgrim', 'frenzy'); }
  if (!o.dot && b.p.build === 'berserker') addRage(b, 1);
  if (!o.silent && d > 0) logp(b, o.dot ? 'sys' : 'good', o.dot ? (o.label || '피해') + '이(가) ' + e.n + '을(를) 갉아먹는다. ' + r1(d) + ' 피해' : e.n + '에게 ' + r1(d) + ' 피해');
  if (W0 && d > 0) { const m = []; if (W0.wk) m.push('약화 ' + W0.wk + '로 내 피해 −25%'); if (W0.em) m.push((b.p.build === 'monk' ? '기 ' : '강화 ') + W0.em + '로 +25%'); if (W0.vu) m.push('취약 ' + W0.vu + '로 +25%'); if (W0.pr) m.push('보호 ' + W0.pr + '로 −25%'); if (W0.br && !fullF && !o.shock) m.push('버티는 중이라 ' + Math.round((1 - EKW.braceRed) * 100) + '% 줄어듦'); if (W0.wr) m.push('붕대로 −' + Math.round(WRAP.cut * 100) + '%'); if (W0.bw) m.push('뼈벽 뒤라 줄어듦'); if (W0.ig) m.push('화상 ' + W0.ig + '이 터져 더해짐'); if (m.length) whyPush(b, { side: 'out', n: e.n, f: W0.f, d: r1(d), m }); }
  if (isBu(b.p) && !o.dot && o.melee && b.cur && d > 0 && stk(e, 'bleed') > 0) { const g = bHeal(b, Math.min(d, Math.max(0, hp0)) * Math.min(BUTCH.leechMax, BUTCH.leech * stk(e, 'bleed')), 'leech'); if (g > 0) logp(b, 'good', e.n + '의 피를 마신다. 생명력 +' + r1(g)); } // 흡혈 (숨겨진 직업 1): 맞힌 그 순간의 출혈로
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
function ledgerCost(p, lack) { return lack > 0 ? p.hpMax * 0.04 * hpCostMul(p) : 0; }
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
  if (!e.pile && !e.summoned && !['root', 'candle', 'bonewall'].includes(e.role) && !b.over) { if (['poison', 'bleed', 'ignite', 'weak', 'vuln', 'chill'].some(k => b.p.s[k])) unlAdd(b, 'sinKill'); if (e.strong && e.foe) unlAdd(b, 'foe:' + e.foe); } // 숨겨진 직업 해금 셈
  if (e.role === 'skeleton' && !e.pile && !e.rose && !e.norise && !st(e, 'ignite') && !e.s.broken && !hasBt(b.p, 'rest') && !b.over) { makePile(b, e); return; } // 2챕터 해골: 화상 · 붕괴 · 한 번 일어섬 · 안식의 성소면 더미가 남지 않는다
  if (e.role === 'skeleton' && !e.pile && !e.rose && st(e, 'ignite')) logp(b, 'good', e.n + '이(가) 재가 되어 흩어진다');
  e.alive = false; e.hp = 0; logp(b, 'good', e.n + (e.pile ? '의 뼈 더미가 흩어진다' : '이(가) 쓰러진다'));
  if (e.mark && isBm(b.p)) { const M = e.mark; e.mark = null; if (!e.killPaid) { e.killPaid = 1; const n = Math.min(BLOOD.spreadKillMax, Math.ceil(st(e, 'poison') * (M.per || 1))); if (n > 0) { if (b.dotLoop) (b.markQ = b.markQ || []).push({ e, n }); else bmSpread(b, e, n, null); } } } // 숨겨진 직업 3 표식: 무엇으로든 쓰러지면 한 번 (뼈 더미가 될 때는 남는다)
  if (e.role === 'bloat') { if (st(e, 'ignite')) logp(b, 'good', e.n + '이(가) 불에 타 터지지 않는다'); else { fxRun(b.p, 'onBloat', b, b.p, e); if (!b.noBloat) addPoison(b, b.p, BLOAT.me, 0); for (const o of alive(b)) if (o.role !== 'root') addPoison(b, o, BLOAT.foes, 0); logp(b, 'bad', e.n + '이(가) 터진다. 나에게 중독 ' + (b.noBloat ? 0 : BLOAT.me) + ', 다른 적 모두에게 중독 ' + BLOAT.foes); } }
  if ((b.ctx.ch || 1) >= 3) ch3OnKill(b, e);
  if (e.role === 'bonewall') { const m = b.en.find(x => x.id === e.wallOf); if (m) m.wallWait = BWALL.wait; if (e.lordWall && m && m.alive && !alive(b).some(x => x.lordWall)) { addS(b, m, 'vuln', LORD.expose); logp(b, 'good', '뼈벽이 모두 무너져 ' + m.n + '이(가) 드러난다. 취약 ' + LORD.expose); } }
  if (e.boss === 'abbot') { for (const x of b.en) if (x.alive && (x.monk || x.role === 'candle')) { x.alive = false; x.hp = 0; } } // 수도원장이 쓰러지면 수도사와 촛불도 흩어진다
  if (e.loot) { returnLoot(b, e.loot); logp(b, 'good', e.loot.n + '을(를) 되찾는다'); e.loot = null; }
  if (e.foe === 'bishop') { const cs = corpsesOf(b); for (const c of cs) { c.alive = false; c.hp = 0; } if (cs.length) logp(b, 'good', '일어선 시체들이 무너진다'); }
  if (e.foe === 'cantor') hymnReset(b);
  if (e.foe === 'scribe' && (b.seal || []).length) { b.seal = []; logp(b, 'good', '봉인이 풀린다'); }
  if (b.p.build === 'warlock' && (e.s.weak || e.s.vuln)) { const hl = b.p.hpMax * CLS_TUNE.warlockKill; b.p.hp = Math.min(b.p.hpMax, b.p.hp + hl); logp(b, 'good', '꺼져 가는 혼을 들이마신다. 생명력 +' + r1(hl)); }
  b.xp = (b.xp || 0) + xpOf(e);
  rollDrops(b, e);
  if (e.bell) { const rg = b.en.find(x => x.foe === 'bellringer' && x.alive); if (rg) { rg.stun = 1; logp(b, 'crit', '큰 종이 깨진다. ' + rg.n + '이(가) 비틀거린다'); } codexHit(b, 'bellringer', 'bellbreak'); }
  if (e.foe === 'pilgrim') { b.rotted = 1; logp(b, 'bad', e.n + '의 몸이 무너지며 썩은 냄새가 퍼진다'); codexHit(b, 'pilgrim', 'rot'); }
  if (e.s.plague) { let n = 0; for (const x of alive(b)) if (x.role !== 'root') { addS(b, x, 'weak', aoeN(2)); addS(b, x, 'plague', 4); n++; } if (n) logp(b, 'good', '역병이 남은 적들에게 옮는다'); }
  fxRun(b.p, 'onKill', b, b.p, e);
  chargeEv(b, 'kill');
  b.rec.push({ k: 'kill', t: r1(b.t), role: e.role });
}
function checkEnd(b) {
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
  if (o.k === 'item') { const u = run.bag.splice(Math.floor(b.rngF() * run.bag.length), 1)[0]; o.u = u; o.run = run; o.n = run.inv[u] ? ITEMS[run.inv[u].tpl].n : '장비'; }
  if (o.k === 'gold') o.run = run; return o;
}
function returnLoot(b, o) { if (o.k === 'flask') b.p.flask[o.f]++; if (o.k === 'gold' && o.run) o.run.gold = (o.run.gold || 0) + o.g; if (o.k === 'item' && o.run) o.run.bag.push(o.u); }
