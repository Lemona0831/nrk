'use strict';
/* ================= 플레이어 행동 (4.2) ================= */
function canTarget(b, e, act) {
  if (!e || !e.alive) return false;
  if (e.under && !act.aoe && !((act.id === 'dodge' || act.dodge) && isCh3(b))) return false; // 땅속: 한 적 대상으로 고를 수 없다. 3챕터는 솟구칠 적을 흘릴 대상으로는 고를 수 있다(설계 6.2절: 솟구침은 흘리기가 듣는다)
  if (rngCls(b.p) && !isMeleeAct(b.p, act.id)) return !(act.id === 'dodge' && e.role === 'root'); // 사냥꾼은 활과 원거리 스킬이 후열에 닿는다. 근접 스킬은 다른 직업처럼 전열에 막힌다 (10월 2일)
  if (isCaster(b.p) && (act.id === 'basic' || act.id === 'heavy')) return true; // 캔트립·집중 주문은 원거리
  if (act.ranged || act.aoe) return true;
  if (act.id === 'dodge' || act.dodge) return e.role !== 'root';
  if (act.id === 'heavy' && b.p.eq.weapon === 'hook') return true;
  if (e.row === 'front') return true;
  return !frontBlocked(b);
}
/* 방패병 가로막기: 다른 적을 노린 근접 공격은 살아 있는(붕괴·기절 아닌) 방패병이 대신 맞는다 */
function guardOf(b, e) {
  if (!e || e.role === 'shield' || e.role === 'boss' || e.role === 'root' || e.pile || e.role === 'bonewall' || e.role === 'crown') return null;
  return hasShield(b, e.id) || null;
}
function pickDodge(b) {
  const al = alive(b).filter(e => e.role !== 'root');
  const hv = al.filter(e => e.intent && e.intent.k === 'heavy').sort((x, y) => actIdx(b, x) - actIdx(b, y))[0];
  return hv || al.filter(e => e.intent && ['attack', 'mirror'].includes(e.intent.k)).sort((x, y) => actIdx(b, x) - actIdx(b, y))[0] || al[0];
}
function dodgeCost(p) { return Math.max(0, actCost(p, 'dodge', (p.build === 'assassin' && isV2(p) ? 25 : 30) + (p.eq.amulet === 'witness' ? 10 : 0) - Math.floor(stat(p, 'dex') / 10)) - (p.pbuf ? p.pbuf.stam : 0)); }
const guardCost = p => actCost(p, 'guard', 20);
const heavyCost = p => actCost(p, 'heavy', 40 + (p.eq.weapon === 'maul' && isV2(p) ? 10 : 0)); // 무거운 망치(0.6a.2): 강공격 스태미나 +10 (옛 대가 "1.3T → 1.4T"는 라운드에서 차이가 없다)
function actionList(b) {
  const p = b.p; const B = BUILDS[p.build];
  const L = [
    { id: 'basic', n: CANTRIP[p.build] || '기본 공격', melee: isCaster(p) || (BUILDS[p.build] || {}).ranged ? 0 : 1, ranged: isCaster(p) || (BUILDS[p.build] || {}).ranged ? 1 : 0, cost: '비용 없음', time: 1, ok: true },
    (() => { const led = p.eq.ring2 === 'ledger' || p.eq.ring1 === 'ledger'; const hcst = heavyCost(p); const lack = Math.max(0, hcst - p.st); const hc = ledgerCost(p, lack); const ok = p.st >= hcst || (led && p.hp > hc + 1); return { id: 'heavy', n: isCaster(p) ? '집중 주문' : '강공격', melee: isCaster(p) ? 0 : 1, ranged: isCaster(p) ? 1 : 0, cost: lack > 0 && led ? '스태미나 ' + Math.floor(p.st) + ' + 생명력 ' + Math.ceil(hc) : '스태미나 ' + hcst, time: 1.3, ok, why: !ok && led && lack > 0 ? '생명력이 모자랍니다(피의 계산서)' : null }; })(),
  ];
  const SKM = skillMap(p.build);
  if (isV2(p)) for (const sid of skillsOf(p)) { // 0.6a.2: 재사용 대기
    const s = SK2[sid]; if (!s) continue; const w = (p.cd && p.cd[sid]) || 0;
    const needPoison = !s.fx.some(e => ['dmg', 'poison', 'brk', 'st', 'parry', 'parryBuff', 'stam', 'cutx', 'ward', 'wardFill', 'wardBurn', 'wardDmg', 'thorn', 'pull', 'vulnPer', 'vulnGrow', 'shieldx', 'chillx', 'evade', 'evadeCtr', 'quick', 'quickTurns', 'foresee', 'meSt', 'focusAdd', 'focusBurst', 'focusx', 'swapx', 'hastex', 'chillCut', 'chillShatter', 'chillSpread', 'freeze', 'onCutBreak', 'hasteSpend', 'grudge', 'carry', 'weave', 'shockx', 'rime', 'burnOut', 'imbue', 'edgeX', 'kwx', 'alt', 'killSpread', 'stance', 'kiBurst', 'kiPer', 'kiGrow', 'sealx', 'cleanse', 'transfer', 'perDmg', 'dispel', 'hpCost', 'bloodDmg', 'payCut'].includes(e.k) || (e.k === 'drain' && e.eat) || (e.k === 'burst' && e.pre) || (e.k === 'grow' && e.add) || (['drain', 'exploit', 'grow', 'spread'].includes(e.k) && e.s === 'bleed') || (e.k === 'exploit' && e.s)); // 중독 없이는 아무 일도 없는 스킬만 잠근다 (10월 3일: 피해를 주는 터뜨리는 일격, 중독 4를 거는 독 응축도 잠겼다)
    if (isBm(p)) { // 숨겨진 직업 3: 생명력을 내는 칸의 잠금과 피로 당기기 (값은 남은 쿨타임 1턴마다 최대 생명력 4%, 내고 나서 생명력 1 아래면 잠긴다)
      const hc = bmHpCost(p, s); let other = null, whyB = null, blood = 0;
      if (needPoison && !alive(b).some(e => e.s.poison)) other = '중독된 적 없음';
      if (!other && s.tgt === 'front' && !alive(b).some(e => e.row === 'front' && e.role !== 'root')) other = '전열에 적 없음';
      let pull = 0; if (w > 0) { const nope = bmNoPull(s); const c = nope ? 0 : bmPullCost(p, w); whyB = s.once ? '이번 전투에 이미 씀' : nope ? '쿨타임 ' + w + '턴 남음 · ' + nope : b.bloodTurn === b.turnIdx ? '쿨타임 ' + w + '턴 남음 · 이번 차례에 이미 피로 당겼음' : p.hp - c - hc < 1 ? '쿨타임 ' + w + '턴 남음 · 생명력이 모자랍니다' : null; if (!whyB) { blood = c; pull = 1; } }
      else if (hc > 0 && p.hp - hc < 1) whyB = '생명력이 모자랍니다';
      const wy = whyB || other;
      L.push(Object.assign(v2Static(s), { cost: s.once && w > 0 ? '전투마다 1번' : pull ? (blood ? '🩸 ' + blood + '로 당기기' : '🩸 값 없이 당기기') + ' · 쿨타임 ' + w + '턴 남음' : (hc ? '🩸 ' + hc + ' · ' : '') + (s.once ? '전투마다 1번' : '사용 가능'), wait: w, ok: !wy, why: wy, pull: wy ? 0 : pull, blood: wy ? 0 : blood, hpCost: hc }));
      continue;
    }
    let why = w > 0 ? (s.once ? '이번 전투에 이미 씀' : '쿨타임 ' + w + '턴 남음') : null;
    if (!why && needPoison && !alive(b).some(e => e.s.poison)) why = '중독된 적 없음';
    if (!why && /^c_/.test(sid) && s.fx.every(e => e.k === 'cleanse' || e.k === 'hasten')) { const cl = s.fx.find(e => e.k === 'cleanse'); if (cl && !cfTake(p, cl.only, cl.n, 'clean', 1).c) why = '지울 짐 없음'; } // 숨겨진 직업 2: 정화만 하는 칸
    if (!why && buEatOnly(s) && !alive(b).some(e => stk(e, 'bleed') > 0 && canTarget(b, e, v2Static(s)))) why = '출혈된 적 없음'; // 피해 없이 먹는 칸
    if (!why && s.tgt === 'front' && !alive(b).some(e => e.row === 'front' && e.role !== 'root')) why = '전열에 적 없음';
    L.push(Object.assign(v2Static(s), { cost: s.once ? '전투마다 1번' : '사용 가능', wait: w, ok: !why, why }));
  }
  if (!isV2(p)) for (const sid of skillsOf(p)) {
    const s = SKM[sid]; if (!s) continue;
    let why = null;
    if (s.id === 'purge' && !['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln'].some(k => p.s[k])) why = '정화할 디버프 없음';
    if (s.id === 'release' && p.scar < 1) why = '상흔 없음';
    if (s.id === 'burst' && !alive(b).some(e => e.s.poison)) why = '중독된 적 없음';
    if (s.id === 'scarburst' && p.scar < 1) why = '상흔 없음';
    if (s.id === 'suture' && p.scar < 2) why = '상흔 없음';
    if (s.id === 'atone' && !['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln'].some(k => p.s[k])) why = '지울 디버프 없음';
    if (s.hpCost && p.hp <= p.hpMax * s.hpCost + 1) why = '생명력 부족';
    const res = skillRes(s);
    if (res === 'st') {
      const sc = ST_COST[s.id];
      if (!why && p.exhaust) why = '탈진';
      else if (!why && p.st < sc) why = '스태미나 부족';
      L.push(Object.assign({}, s, { mana: 0, stCost: sc, cost: '스태미나 ' + sc, time: 1, ok: !why, why, skill: 1 }));
    } else {
      const mana = skillCost(p, s.id, s.mana);
      if (!why && p.mp < mana && !(p.build === 'warlock' && p.hp > (mana - p.mp) * 2 + 1) && !(fxVal(p, 'manaToHp', 0, (a, v) => v) && p.hp > (mana - p.mp) * 1.5 + 1)) why = '마나 부족';
      L.push(Object.assign({}, s, { mana, cost: res === 'hp' ? resLabel(s) : '마나 ' + mana, time: 1, ok: !why, why, skill: 1 }));
    }
  }
  { const S = SIG[p.build]; if (S) {
    let why = (p.sigCd || 0) > 0 ? (p.sigCd + '차례 뒤에 다시 쓸 수 있음') : null;
    if (!why && p.build === 'berserker' && (p.rage < 5 || p.s.rage)) why = p.s.rage ? '이미 격노 중' : '분노 5 이상 필요';
    if (!why && p.build === 'assassin' && !alive(b).some(e => e.s.poison)) why = '중독된 적 없음';
    if (!why && p.build === 'warlock' && p.hp <= p.hpMax * 0.1 + 1) why = '생명력 부족';
    if (!why && p.build === 'priest' && !['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln'].some(k => p.s[k]) && p.hp >= p.hpMax) why = '지울 것도 회복할 것도 없음';
    L.push({ id: 'sig', n: S.n, sig: 1, self: S.tgt ? 0 : 1, ranged: S.tgt ? 1 : 0, cost: S.cd ? S.cd + '차례마다' : '분노 5', time: S.time, ok: !why, why });
  } }
  L.push({ id: 'guard', n: '방어', self: 1, cost: '스태미나 ' + guardCost(p), time: 1, ok: p.st >= guardCost(p) });
  L.push({ id: 'dodge', n: '흘리기', dodge: 1, cost: '스태미나 ' + dodgeCost(p), time: 1, ok: p.st >= dodgeCost(p) });
  L.push({ id: 'flaskL', n: p.eq.flask === 'chalice' ? '역류의 성배' : '생명력 플라스크', self: 1, cost: '남은 ' + p.flask.life, time: 0.5, ok: p.flask.life > 0 });
  L.push({ id: 'flaskM', n: isV2(p) ? '정화 플라스크' : '마나 플라스크', self: 1, cost: '남은 ' + p.flask.mana, time: 0.5, ok: p.flask.mana > 0 });
  L.push({ id: 'flaskS', n: '스태미나 플라스크', self: 1, cost: '남은 ' + (p.flask.stam || 0), time: 0.5, ok: (p.flask.stam || 0) > 0 });
  if (!b.ctx.boss && !b.ctx.scen && !b.ctx.tut) L.push({ id: 'flee', n: '도망', self: 1, cost: '성공 ' + Math.round(fleeChance(b) * 100) + '%', time: 1, ok: true });
  for (const sl of b.seal || []) for (const a of L) if (a.ok && ((sl.k === 'skill' && a.id === sl.id) || (sl.k === 'flask' && /^flask/.test(a.id)) || (sl.k === 'prep' && (a.id === 'guard' || a.id === 'dodge')))) { a.ok = false; a.why = '봉인됨'; } // 검은 서기관
  if (b.bonusUsed) for (const a of L) if (a.time >= 1.25 && a.ok) { a.ok = false; a.why = '빠른 행동을 써서 이번 차례엔 느린 행동 불가'; } // 느린 행동은 두 칸
  return b.ctx.allow ? L.filter(a => b.ctx.allow.includes(a.id)) : L; // 수련장: 그 장면에서 배우는 행동만
}
function fleeChance(b) { return clamp(0.6 + (pSpeed(b) - 1) * 0.4, 0.05, 0.95); }
function outDmg(b, base, o) {
  const p = b.p; let d = base;
  if (b.cur) d *= fxMul(p, 'out', b, p, b.cur);
  if (hasBt(p, 'wrath')) d *= 1.1; if (hasBt(p, 'snuff')) d *= 0.95; if (hasBt(p, 'procession')) d *= 0.9; if (hasBt(p, 'herald')) d *= 0.95;
  if (p.eq.weapon === 'hook' && o.weapon) d *= 0.85;
  if (o.weapon) d *= 1 + 0.01 * stat(p, 'str');
  if (p.eq.amulet === 'bloodpact' && p.hp < p.hpMax * 0.5) d *= 1.2;
  if (p.furyNext && !o.ctr) { d *= 1.1; p.furyNext = 0; } // ctr: 수도승 되받기는 다음 공격 몫을 쓰지 않는다
  if (p.rcN && p.eq.gloves === 'ragechain' && !o.ctr) { d *= 1 + 0.04 * p.rcN; b.rcUsed = 1; }
  if ((p.eq.ring1 === 'pulse' || p.eq.ring2 === 'pulse')) d *= 1.35;
  if (p.s.weak) d *= 0.75;
  if (p.s.empower && !(p.build === 'monk' && b.curFast)) { d *= 1.25; if (b.cur) b.empUsed = 1; } // 10월 7일: 강화는 실제로 곱한 행동만 1 줄어든다(b.empUsed). 수도승의 ⚡ 공격에는 기가 실리지 않는다
  if (isBu(p)) d *= 1 + buThirst(p); // 갈증 (숨겨진 직업 1)
  if (b.carve && b.cur && b.cur.grp) d *= carveMul(b, b.cur.grp); // 군주의 새김
  if (b.cur) b.atkUsed = 1;
  if (p.s.rage) d *= 1.4;
  if (p.build === 'berserker' && p.rage) d *= 1 + p.rage * 0.03;
  if (b.resonate) d *= b.resoBig ? 1.3 : 1.15;
  if (b.echoMul) d *= b.echoMul;
  if (p.counter > 0 && !o.ctr) { d += p.counter; logp(b, 'crit', '버틴 만큼 되돌려준다. 반격 +' + r1(p.counter)); p.counter = 0; }
  return d;
}
function applyReflux(b, e) {
  const p = b.p; if (!p.reflux || !e) return;
  for (const k in p.reflux) { const n = p.reflux[k]; if (k === 'poison') addPoison(b, e, n, 1); else if (k === 'chill') addS(b, e, k, 4, n, 10); else addS(b, e, k, 3); }
  logp(b, 'crit', '성배가 삼킨 독을 ' + e.n + '에게 쏟는다'); p.reflux = null;
}
function snapshotFor(b, act, tgt) {
  const p = b.p;
  const incoming = alive(b).map(e => e.intent && e.intent.k).filter(Boolean);
  return {
    t: r1(b.t), a: act, tg: tgt ? tgt.role : null, tgHp: tgt ? r1(tgt.hp / tgt.hpMax) : null,
    hp: r1(p.hp / p.hpMax), mp: p.mpMax ? r1(p.mp / p.mpMax) : 0, st: Math.round(p.st), fl: p.flask.life, fm: p.flask.mana,
    heavyIn: incoming.includes('heavy') ? 1 : 0, healIn: incoming.includes('heal') ? 1 : 0, explodeIn: incoming.includes('explode') ? 1 : 0,
    canDodge: p.st >= dodgeCost(p) ? 1 : 0, canGuard: p.st >= guardCost(p) ? 1 : 0,
    poison: st(p, 'poison'), scar: Math.round(p.scar), en: alive(b).length,
  };
}
function playerAct(b, id, tgtId) {
  const p = b.p; if (b.over) return; b.actN = (b.actN || 0) + 1; // 갈래 규칙은 한 행동에 한 번
  const L = actionList(b); const act = L.find(x => x.id === id);
  if (!act || !act.ok) return;
  if (act.stCost) p.st = Math.max(0, p.st - act.stCost);
  let tgt = tgtId ? b.en.find(e => e.id === tgtId && e.alive) : null;
  if (id === 'dodge' && (!tgt || tgt.role === 'root')) tgt = pickDodge(b);
  if (id === 'sig' && p.build === 'assassin' && (!tgt || !tgt.s.poison)) tgt = alive(b).filter(e => e.s.poison).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0] || tgt;
  if (id === 'burst' && (!tgt || !tgt.s.poison)) tgt = alive(b).filter(e => e.s.poison).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0] || tgt;
  if (act.v2 && act.s.fx.some(e => (e.k === 'burst' && !e.pre) || e.k === 'grow') && (!tgt || !tgt.s.poison)) tgt = alive(b).filter(e => e.s.poison && canTarget(b, e, act)).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0] || tgt;
  if (act.v2 && act.dodge && (!tgt || tgt.role === 'root')) tgt = pickDodge(b);
  const bmEO = act.v2 && isBm(p) && bmEatOnly(act.s); if (bmEO && (!tgt || !canTarget(b, tgt, act))) tgt = alive(b).filter(e => st(e, 'poison') > 0 && canTarget(b, e, act)).sort((x, y) => st(y, 'poison') - st(x, 'poison'))[0] || tgt; // 숨겨진 직업 3: 피해 없이 먹는 칸은 치지 않으므로 가로막히지 않는다
  const eatOnly = act.v2 && buEatOnly(act.s); if (eatOnly && (!tgt || !(stk(tgt, 'bleed') > 0) || !canTarget(b, tgt, act))) tgt = alive(b).filter(e => stk(e, 'bleed') > 0 && canTarget(b, e, act)).sort((x, y) => stk(y, 'bleed') - stk(x, 'bleed'))[0] || tgt; // 피해 없이 먹는 칸: 출혈된 적만, 치지 않으므로 가로막히지 않는다
  if (!act.self && !act.aoe) {
    if (!tgt || !canTarget(b, tgt, act)) tgt = alive(b).find(e => canTarget(b, e, act) && e.role !== 'root') || alive(b).find(e => canTarget(b, e, act));
    if (!tgt) return;
  }
  b.logGroup = (b.logGroup || 0) + 1;
  if (b.ctx.boss && b.ctx.bossKind === 'cryptlord') { const g = actGroup(p, id, act); if (g) { (b.lordHist = b.lordHist || []).push(g); if (b.lordHist.length > LORD.read) b.lordHist.shift(); } }
  b.cur = { grp: actGroup(p, id, act), id, tgt: tgt ? tgt.id : null, skill: !!act.skill, spell: !!(act.skill && !act.v2 && skillRes(act) === 'mp'), cantrip: id === 'basic' && isCaster(p), ranged: !!(act.ranged || act.aoe || (['basic', 'heavy'].includes(id) && !isMeleeAct(p, id))) };
  if (p.sigCd > 0) p.sigCd--;
  b.curFast = p.build === 'monk' && act.time <= 0.6 ? 1 : 0; // 수도승: ⚡ 행동에는 기가 실리지 않는다 (finishPlayer 첫 줄에서 지운다)
  if (p.retal) p.retal--;
  b.resonate = !!(p.build === 'arcanist' && act.skill && ((p.lastSkillId && p.lastSkillId !== id) || p.focusRes));
  if (b.resonate && p.focusRes && act.skill) { b.resoBig = 1; p.focusRes = 0; }
  b.echoMul = 1;
  if (hasIt(p, 'resostone') && act.skill && p.lastSkillId && p.lastSkillId !== id) b.echoMul *= 1.06;
  if (hasEcho(p) && act.skill) { p.echoN = p.lastSkillId === id ? Math.min(3, (p.echoN || 0) + 1) : 0; b.echoMul = 1 + 0.04 * p.echoN; if (p.echoN) logp(b, 'crit', '같은 주문이 메아리친다. 피해 +' + (4 * p.echoN) + '%'); }
  if (act.skill) p.lastSkillId = id;
  logp(b, 'mine', act.n + (tgt && !act.self && !act.aoe ? ' → ' + tgt.n : ''));
  b.rec.push(Object.assign({ k: 'act' }, snapshotFor(b, id, tgt)));
  if (isMeleeAct(p, id) && tgt && !eatOnly && !(id === 'heavy' && p.eq.weapon === 'hook' && tgt.row === 'back')) {
    const g = guardOf(b, tgt);
    if (g) { logp(b, 'sys', g.n + '이(가) 방패를 들어 ' + tgt.n + '을(를) 가로막는다'); b.rec.push({ k: 'redirect', t: r1(b.t), from: tgt.role, to: g.role }); tgt = g; b.cur.tgt = g.id; } // 장비 효과도 바뀐 대상을 본다
  }
  if (tgt && !act.self && !act.aoe && !eatOnly && !bmEO) { const mg = alive(b).find(x => x.guarding === tgt.id && !(x.stun > 0) && !x.s.broken); if (mg) { logp(b, 'sys', mg.n + '이(가) ' + tgt.n + ' 앞을 막아 대신 맞는다'); tgt = mg; b.cur.tgt = mg.id; } } // 하수인의 지키기 (10월 4일)
  if (b.prepTurn !== b.turnIdx) { b.prepTurn = b.turnIdx; p.guard = 0; p.dodge = 0; p.brace = 0; p.dodgeRed = 0; p.dodgeOn = null; if (isBu(p)) { p.grudge = Math.min(p.tookAcc || 0, p.hpMax * BUTCH.grudgeCap); p.tookAcc = 0; b.krTurn = 0; } if (p.build === 'monk') { p.stance = null; p.ctrN = 0; } if (isCf(p)) b.cleanTurn = 0; if (isBm(p)) b.paidTurn = 0; } // 숨겨진 직업 3: 낸 피는 차례마다 // 숨겨진 직업 1: 받은 피해는 차례의 첫 행동에서 정한다 // 준비(방어·흘리기)는 내 다음 차례까지. 수도승 자세와 되받은 횟수도 여기서 지운다. 빠른 행동으로 건 흘리기를 같은 차례의 주 행동이 지우지 않게 차례의 첫 행동에서만 지운다 (10월 3일: 잔상·흘리며 물러서기가 한 번도 발동하지 않았다)
  p.tookLast = p.tookSince || 0; p.tookSince = 0; // 앙갚음: 지난 행동 뒤로 받은 피해
  if (p.stun > 0) { p.stun--; logp(b, 'bad', '몸이 말을 듣지 않는다. 행동을 놓친다'); finishPlayer(b, 1, true); return; }
  fxRun(p, 'onAct', b, p, id, act, tgt);
  if (p.build === 'spellblade') sbBegin(b, id, act, tgt); // 마검사: 행동 종류와 교대
  let time = act.time;
  if (p.vanguard && !act.self && !['guard', 'dodge', 'flaskL', 'flaskM', 'flee'].includes(id)) { p.vanguard = 0; time *= 0.5; if (tgt) b.vanguardTgt = tgt; logp(b, 'crit', '깃발을 앞세워 먼저 뛰어든다'); }
  if (act.skill && act.melee && tgt && hasIt(p, 'chaingl')) b.chainTgt = tgt;
  if (act.v2) { if (act.pull && isBm(p)) bmPull(b, act); runSkill2(b, act, tgt); if (b.sbK) sbEnd(b, act); fxRun(p, 'onSkill', b, p, act, tgt); if (b.markTgt) { if (b.markTgt.alive) addS(b, b.markTgt, 'vuln', 2); b.markTgt = null; } if (b.rcUsed) { p.rcN = 0; b.rcUsed = 0; } if (b.chainTgt) { if (b.chainTgt.alive) addBreak(b, b.chainTgt, 20); b.chainTgt = null; } if (b.vanguardTgt) { if (b.vanguardTgt.alive) addBreak(b, b.vanguardTgt, 20); b.vanguardTgt = null; } b.resonate = false; b.resoBig = 0; b.echoMul = 1; if (p.hp <= 0) checkEnd(b); if (!b.over) finishPlayer(b, time); return; }
  if (act.gen) { genSkill(b, act, tgt); if (b.markTgt) { if (b.markTgt.alive) { addS(b, b.markTgt, 'vuln', 2); logp(b, 'good', '표식이 ' + b.markTgt.n + '의 빈틈을 드러낸다. 취약'); } b.markTgt = null; } if (b.rcUsed) { p.rcN = 0; b.rcUsed = 0; } if (b.chainTgt) { if (b.chainTgt.alive) addBreak(b, b.chainTgt, 20); b.chainTgt = null; } if (b.vanguardTgt) { if (b.vanguardTgt.alive) addBreak(b, b.vanguardTgt, 20); b.vanguardTgt = null; } if (b.resonate) logp(b, 'crit', '서로 다른 주문이 공명한다. 피해 +15%'); b.resonate = false; b.resoBig = 0; b.echoMul = 1; if (p.hp <= 0) checkEnd(b); if (!b.over) finishPlayer(b, time); return; }
  switch (id) {
    case 'basic': {
      let d = outDmg(b, basicBase(p), { weapon: 1 });
      const melee1 = !rngCls(p) && !isCaster(p); const bl = CANTRIP[p.build] || '기본 공격';
      if (p.eq.weapon === 'twin') { const d1 = hurtEnemy(b, tgt, d * 0.5, { single: 1, melee: melee1, label: '첫 날' }); if (b.sbK) sbEdgeHit(b, tgt, d1); if (tgt.alive) hurtEnemy(b, tgt, d * 0.5, { single: 1, melee: melee1, label: '둘째 날' }); }
      else { const d1 = hurtEnemy(b, tgt, d, { single: 1, melee: melee1, label: bl }); if (b.sbK) sbEdgeHit(b, tgt, d1); }
      if (tgt.alive && hasIt(p, 'venomring')) addPoison(b, tgt, 1, 1);
      addBreak(b, tgt, 10); applyReflux(b, tgt); break; // 0.6: 기본 공격은 스태미나를 채우지 않는다 (11.6절)
    }
    case 'heavy': {
      let pay = heavyCost(p); p.fxHeavyDisc = 0; if (p.st < pay) { const lack = pay - p.st; const hc = ledgerCost(p, lack); p.hp -= hc; logp(b, 'bad', '피로 값을 치른다. 생명력 ' + r1(hc)); if (scarRate(p) > 0) p.scar = Math.min(p.hpMax * .5, p.scar + hc * scarRate(p)); pay = p.st; }
      p.st -= pay;
      if (p.eq.weapon === 'hook' && tgt.row === 'back') { tgt.row = 'front'; logp(b, 'crit', '갈고리가 ' + tgt.n + '을(를) 앞으로 끌어낸다'); }
      if (p.eq.weapon === 'twinblades') { const hd = outDmg(b, heavyBase(p), { weapon: 1 }) * 0.6; const mh = isMeleeAct(p, 'heavy') ? 1 : 0; const d1 = hurtEnemy(b, tgt, hd, { single: 1, melee: mh, label: '첫 칼' }); if (b.sbK) sbEdgeHit(b, tgt, d1); if (tgt.alive) hurtEnemy(b, tgt, hd, { single: 1, melee: mh, label: '둘째 칼' }); fxHit('twinblades'); }
      else { const d1 = hurtEnemy(b, tgt, outDmg(b, heavyBase(p), { weapon: 1 }), { single: 1, melee: isMeleeAct(p, 'heavy') ? 1 : 0, label: isCaster(p) ? '집중 주문' : '강공격' }); if (b.sbK) sbEdgeHit(b, tgt, d1); } // 사냥꾼 강공격은 활이라 근접이 아니다
      addBreak(b, tgt, (isCaster(p) && !isV2(p) ? 30 : 35) + 5 * Math.floor(stat(p, 'str') / 10) + (p.eq.weapon === 'maul' ? 20 : 0)); if (p.eq.weapon === 'maul') time = 1.4; applyReflux(b, tgt); break;
    }
    case 'sig': {
      const S = SIG[p.build]; p.sigCd = S.cd; time = S.time;
      if (p.build === 'berserker') { const rg = p.rage; const hl = p.hpMax * 0.01 * rg * healMul(p); p.hp = Math.min(p.hpMax, p.hp + hl); p.rage = 10; addRage(b, 0); logp(b, 'crit', '쌓인 분노를 한꺼번에 풀어놓는다. 생명력 +' + r1(hl)); }
      else if (p.build === 'hunter') { p.focus = { id: tgt.id, n: 5 }; addS(b, tgt, 'vuln', 2); logp(b, 'crit', tgt.n + '에게 시선을 고정한다. 취약, 연속 공격 +25%'); }
      else if (p.build === 'arcanist') { p.focusRes = 1; p.mp = Math.min(p.mpMax, p.mp + 12); logp(b, 'crit', '다음 주문을 위해 공명을 모은다. 마나 +12'); }
      else if (p.build === 'templar') { p.ward = Math.min(40, (p.ward || 0) + 12); addS(b, p, 'protect', 2); logp(b, 'good', '서약의 빛이 몸을 감싼다. 보호막 ' + Math.round(p.ward)); }
      else if (p.build === 'assassin') { const n0 = tgt.s.poison.stacks; addPoison(b, tgt, Math.ceil(n0 * 0.5)); logp(b, 'crit', '독이 ' + tgt.n + '의 핏줄 깊이 스민다. 중독 ' + n0 + ' → ' + tgt.s.poison.stacks); }
      else if (p.build === 'warlock') { const c = p.hpMax * 0.1 * hpCostMul(p); p.hp -= c; p.mp = Math.min(p.mpMax, p.mp + 20); logp(b, 'bad', '피를 바쳐 마나를 얻는다. 생명력 ' + r1(c) + ', 마나 +20'); checkEnd(b); }
      else if (p.build === 'priest') { for (const k of ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln', 'brand']) if (p.s[k]) { cleanse(b, [k], false); break; } const hl = p.hpMax * 0.12 * healMul(p); p.hp = Math.min(p.hpMax, p.hp + hl); smiteHeal(b, hl); logp(b, 'good', '짧은 기도. 생명력 +' + r1(hl)); }
      else if (p.build === 'scar') { p.retal = 1; logp(b, 'crit', '상처마다 피의 응답을 걸어 둔다'); }
      break;
    }
    case 'crush': { payMana(b, act.mana); const d = hurtEnemy(b, tgt, outDmg(b, 11, {}), { single: 1, melee: 1, label: '분쇄의 일격' }); addBreak(b, tgt, 20); p.lastSkillDmg = d; applyReflux(b, tgt); break; }
    case 'aimshot': { payMana(b, act.mana); const d = hurtEnemy(b, tgt, outDmg(b, 9, {}), { single: 1, label: '정밀 사격' }); addBreak(b, tgt, 10); p.lastSkillDmg = d; applyReflux(b, tgt); break; }
    case 'fireball': { payMana(b, act.mana); let tot = 0; const nT = alive(b).length; for (const e of alive(b).slice()) { tot += hurtEnemy(b, e, outDmg(b, 5, {}), { aoe: 1, fire: 1, label: '화염구' }); if (e.alive) addS(b, e, 'ignite', aoeN(3)); } p.lastSkillDmg = tot / Math.max(1, nT); break; }
    case 'lava': { payMana(b, act.mana); const d = hurtEnemy(b, tgt, outDmg(b, 9, {}), { single: 1, melee: 1, fire: 1, label: '용암 일격' }); if (tgt.alive) addS(b, tgt, 'ignite', 3); addBreak(b, tgt, 10); p.lastSkillDmg = d; applyReflux(b, tgt); break; }
    case 'drain': { payMana(b, act.mana); const d = hurtEnemy(b, tgt, outDmg(b, 6, {}), { single: 1, label: '영혼 흡수' }); p.hp = Math.min(p.hpMax, p.hp + d * 0.7 * healMul(p)); if (tgt.alive) addS(b, tgt, 'weak', 2); if (d > 0) logp(b, 'good', '빼앗은 기운으로 생명력 +' + r1(d * 0.7)); p.lastSkillDmg = d; applyReflux(b, tgt); break; }
    case 'viper': { payMana(b, act.mana); const d = hurtEnemy(b, tgt, outDmg(b, PSN.viper, {}), { single: 1, melee: 1, label: '독사의 일격' }); if (tgt.alive) addPoison(b, tgt, PSN.viperN, 1); p.lastSkillDmg = d; addBreak(b, tgt, 10); applyReflux(b, tgt); break; }
    case 'burst': {
      payMana(b, act.mana); const n = st(tgt, 'poison'); delete tgt.s.poison;
      const knot = p.eq.gloves === 'knot'; const keep = knot ? Math.floor(n / 2) : 0;
      const tot = poisonTotal(n) * dotMul(p) * 1;
      logp(b, 'crit', '쌓인 독이 한꺼번에 끓어오른다. 중독 ' + n + ', 피해 ' + r1(tot));
      const d = hurtEnemy(b, tgt, outDmg(b, tot, {}), { single: 1, label: '독 격발' });
      if (keep > 0 && tgt.alive) { addPoison(b, tgt, keep); logp(b, 'good', '잔향의 매듭이 독의 절반을 붙잡아 둔다. 중독 ' + keep); }
      addBreak(b, tgt, n * PSN.brk + 5 * Math.floor(stat(p, 'int') / 10)); p.lastSkillDmg = d; applyReflux(b, tgt); break;
    }
    case 'cloud': { payMana(b, act.mana); const cn = aoeN(PSN.cloudN); for (const e of alive(b)) addPoison(b, e, cn, 1); logp(b, 'good', '독구름이 번진다. 모든 적 중독 +' + (cn + (p.build === 'assassin' ? 1 : 0))); p.lastSkillDmg = 0; break; }
    case 'scarcut': {
      payMana(b, act.mana); const use = p.scar * 0.5; p.scar -= use;
      const d = hurtEnemy(b, tgt, outDmg(b, 7 + use * 1.5, {}), { single: 1, melee: 1, label: '상흔 베기' + (use > 0 ? '(상흔 ' + r1(use) + ')' : '') });
      if (tgt.alive) addS(b, tgt, 'bleed', 3); p.lastSkillDmg = d; addBreak(b, tgt, 10); applyReflux(b, tgt); break;
    }
    case 'release': {
      payMana(b, act.mana); const s = p.scar; const knot = p.eq.gloves === 'knot'; p.scar = knot ? s / 2 : 0; let tot = 0; const nT = alive(b).length;
      for (const e of alive(b).slice()) tot += hurtEnemy(b, e, outDmg(b, s * 0.8 * 1, {}), { aoe: 1, label: '상흔 방출' });
      if (knot && s > 0) logp(b, 'good', '잔향의 매듭이 상흔의 절반을 남긴다');
      p.lastSkillDmg = tot / Math.max(1, nT); break;
    }
    case 'flame': { payMana(b, act.mana); const d = hurtEnemy(b, tgt, outDmg(b, 8, {}), { single: 1, fire: 1, label: '신성한 불꽃' }); if (tgt.alive) addS(b, tgt, 'ignite', 3); p.lastSkillDmg = d; applyReflux(b, tgt); break; }
    case 'purge': {
      payMana(b, act.mana); const n = cleanse(b, ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln', 'brand'], false);
      const d = n > 0 ? hurtEnemy(b, tgt, outDmg(b, n * 7 * dotMul(p), {}), { single: 1, label: '정화의 빛(' + n + ')' }) : 0;
      p.lastSkillDmg = d; if (n === 0) logp(b, 'sys', '지울 것이 없다'); break;
    }
    case 'reverse': {
      payMana(b, act.mana); const k = p.s.vuln ? 'vuln' : p.s.weak ? 'weak' : null;
      const left = k ? Math.max(1, p.s[k].until - b.t) : 0; if (k) delete p.s[k];
      const d = hurtEnemy(b, tgt, outDmg(b, REV_DMG, {}), { single: 1, label: '역전' });
      if (k && tgt.alive) { addS(b, tgt, k, left); logp(b, 'good', '내 ' + (k === 'vuln' ? '취약' : '약화') + '을(를) ' + tgt.n + '에게 떠넘긴다'); }
      p.lastSkillDmg = d; break;
    }
    case 'guard': p.st -= guardCost(p); p.guard = 1; if (isCf(p)) cfCleanse(b, { n: CONF.guard }, '방어', 'guard'); // 숨겨진 직업 2: 방어하면 해로운 상태를 지운다
      if (p.build === 'warden') { const g = addWard(b, p, WARD.guard); logp(b, 'good', '방패를 세운다. 보호막 +' + Math.round(g) + ' (' + Math.round(p.ward) + '/' + wardMax(p) + ')'); } if (p.build === 'templar') { p.ward = Math.min(30, (p.ward || 0) + 11); logp(b, 'good', '빛의 방패가 몸을 감싼다. 보호막 ' + p.ward); } logp(b, 'sys', '자세를 낮추고 막을 준비를 한다. 다음 차례까지 받는 피해 절반'); break;
    case 'dodge': p.st -= dodgeCost(p); setParry(b, tgt, null, null); logp(b, 'sys', tgt.n + '의 다음 공격을 흘릴 준비를 한다' + (p.dodgeRed ? '. 피해 ' + Math.round(p.dodgeRed * 100) + '% 감소' : '')); break;
    case 'flaskL': {
      p.flask.life--; const heal = p.hpMax * flaskHealFrac(p) * healMul(p);
      if (p.eq.flask === 'boilflask') { for (const e of alive(b).slice()) hurtEnemy(b, e, outDmg(b, 5, {}), { aoe: 1, fire: 1, label: '끓는 플라스크' }); }
      p.hp = Math.min(p.hpMax, p.hp + heal); smiteHeal(b, heal);
      const before = { poison: st(p, 'poison'), bleed: st(p, 'bleed'), ignite: st(p, 'ignite'), chill: st(p, 'chill') };
      const n = cleanse(b, (isV2(p) ? [] : ['poison', 'bleed', 'ignite', 'chill']).concat(fxVal(p, 'flaskCleanse', [], (a, v) => a.concat(v))), true); fxRun(p, 'onFlask', b, p, 'life'); // 0.6a.2: 생명력 플라스크는 회복만(지우는 장비 효과는 그대로)
      logp(b, 'good', '플라스크를 비운다. 생명력 +' + r1(heal) + (n ? ', 디버프 ' + n + ' 지움' : ''));
      const boss = alive(b).find(e => e.boss === 'mother');
      if (boss && n > 0) hurtEnemy(b, boss, boss.hpMax * 0.01 * n, { dot: 1, label: '역류' });
      if (p.eq.flask === 'chalice' && n > 0) { p.reflux = {}; for (const k in before) if (before[k]) p.reflux[k] = before[k]; }
      time = 0.5; break;
    }
    case 'flaskS': {
      p.flask.stam--; const add = Math.min(p.stMax - p.st, STAM_FLASK * fxVal(p, 'stamMul', 1, (a, v) => a * v)); fxRun(p, 'onFlask', b, p, 'stam'); p.st += add; p.exhaust = 0;
      logp(b, 'good', '쓴 약을 삼킨다. 스태미나 +' + Math.round(add)); time = 0.5; break;
    }
    case 'flaskM': {
      if (isV2(p)) { // 0.6a.2 정화 플라스크: 지우지 않고 막는다 (막음 2, 강화판 장비는 blockAdd로 더한다)
        p.flask.mana--; const nb = 2 + fxAdd(p, 'blockAdd', p); const cur = stk(p, 'block'); p.s.block = { stacks: Math.min(KW.block, cur + nb), until: KW_FOREVER, dur: KW_FOREVER };
        fxRun(p, 'onFlask', b, p, 'mana'); logp(b, 'good', '정화 플라스크를 비운다. 막음 ' + p.s.block.stacks + ': 다음에 걸리는 해로운 상태를 튕겨 낸다'); time = 0.5; break;
      }
      p.flask.mana--; p.mp = Math.min(p.mpMax, p.mp + p.mpMax * 0.4); fxRun(p, 'onFlask', b, p, 'mana');
      const n = cleanse(b, ['weak', 'vuln', 'brand'], true); logp(b, 'good', '플라스크를 비운다. 마나 +' + r1(p.mpMax * 0.4) + (n ? ', 디버프 ' + n + ' 지움' : '')); time = 0.5; break;
    }
    case 'flee': {
      if (b.rngF() < fleeChance(b)) { b.over = 'flee'; logp(b, 'sys', '등을 보이고 문밖으로 물러난다. 이 방은 아직 넘지 못했다'); b.rec.push({ k: 'flee', ok: 1 }); return; }
      logp(b, 'bad', '길이 막혀 빠져나가지 못한다'); time = 1.5; break;
    }
  }
  if (b.sbK) sbEnd(b, act); // 마검사: 기본 공격 · 강공격의 교대 (종류 없는 행동은 b.sbK가 없다)
  if (b.markTgt) { if (b.markTgt.alive) { addS(b, b.markTgt, 'vuln', 2); logp(b, 'good', '표식이 ' + b.markTgt.n + '의 빈틈을 드러낸다. 취약'); } b.markTgt = null; }
  if (b.rcUsed) { p.rcN = 0; b.rcUsed = 0; }
  if (b.vanguardTgt) { if (b.vanguardTgt.alive) addBreak(b, b.vanguardTgt, 20); b.vanguardTgt = null; }
  if (b.chainTgt) { if (b.chainTgt.alive) addBreak(b, b.chainTgt, 20); b.chainTgt = null; }
  if (b.resonate) logp(b, 'crit', '서로 다른 주문이 공명한다. 피해 +15%');
  b.resonate = false; b.resoBig = 0; b.echoMul = 1;
  if (p.hp <= 0) checkEnd(b);
  finishPlayer(b, time);
}
/* 단죄: 내가 생명력을 회복하면 단죄된 적 모두가 회복량의 60%만큼 피해 */
function smiteHeal(b, hl) { if (!(hl > 0) || b.over) return; for (const e of alive(b)) if (e.s.smite) hurtEnemy(b, e, hl * 0.6, { label: '단죄' }); }
function healMul(p) { return (p.eq.amulet === 'bloodpact' ? 0.85 : 1) * (1 + 0.02 * stat(p, 'wil')); } // 의지 1점마다 회복 +2%
function cleanse(b, keys, isFlask) {
  const p = b.p; let n = 0;
  for (const k of keys) if (p.s[k]) { n += (k === 'poison' || k === 'chill') ? st(p, k) : 1; delete p.s[k]; }
  if (n > 0) fxRun(p, 'onCleanse', b, p, n);
  if (n > 0 && p.eq.amulet === 'rosary') { p.mp = Math.min(p.mpMax, p.mp + 3 * n); logp(b, 'good', '묵주가 씻어 낸 것을 마나로 바꾼다. 마나 +' + 3 * n); }
  if (n > 0 && p.build === 'priest') { p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.03 * n); addS(b, p, 'protect', 3); logp(b, 'good', '정화의 불빛이 몸을 감싼다. 보호'); }
  return n;
}
function addBreak(b, e, v) {
  if (!e || !e.alive || e.role === 'root' || e.under || e.role === 'crown' || (e.hazeHit && b.cur && e.hazeHit === b.actN)) return;
  if (b.cur) v = (v + fxAdd(b.p, 'brk', b, b.p, e, b.cur)) * fxMul(b.p, 'brkMul', b, b.p, e, b.cur);
  if (e.exposed) v *= FOE_X.sexton.brk; // 솟구친 묘지기: 드러난 동안 붕괴 ×1.5
  if (hasBt(b.p, 'break')) v *= 1.2;
  if (e.vow) v *= 1.5;
  e.brk += v * (1 + 0.01 * stat(b.p, 'str'));
  if (e.brk >= e.brkMax && e.role === 'bonewall') { e.brk = 0; logp(b, 'crit', e.n + '이(가) 산산이 부서진다'); killEnemy(b, e); checkEnd(b); return; }
  if (e.brk >= e.brkMax) {
    const cut = !!(e.intent && ['heavy', 'charge', 'explode', 'fuse', 'chant', 'chanting', 'burn'].includes(e.intent.k)); if (e.chant) { e.chant = null; e.pyreRest = 1; logp(b, 'good', e.n + '의 영창이 끊긴다'); } // 모으던 강타·폭발을 끊었는가 (수련장 목표)
    e.brk = 0; e.stun = 1; addS(b, e, 'broken', 2); addS(b, e, 'vuln', 2); e.braced = 0; e.countering = 0; e.evading = 0; e.guarding = null; // 10월 4일: 무너지면 버티기 · 반격 태세 · 몸 낮추기 · 지키기가 모두 풀린다 /* 붕괴 상태는 다음 라운드가 끝날 때까지 (10월 3일 라운드 방식: 1이면 이번 라운드 끝에 풀려, 무너뜨린 뒤 내 다음 차례에는 붕괴한 적을 칠 수 없었다) */ if (e.elite || e.strong || e.role === 'boss') chargeEv(b, 'break'); // 격발 갈래 규칙: 정예 이상을 무너뜨리면 대기 −1 (하수인·일반은 세지 않는다: 무리에서 돌지 않게)
    if (e.vow) { e.vow = 0; e.vowTick = b.tick; addS(b, e, 'vuln', 2); logp(b, 'crit', e.n + '의 서원이 깨진다'); codexHit(b, 'abbot', 'vowbreak'); const cs = b.en.filter(x => x.role === 'candle' && x.alive); for (const c of cs) { c.alive = false; c.hp = 0; } if (cs.length) logp(b, 'good', '촛불이 모두 꺼진다'); }
    if (e.foe === 'cantor' && hymnReset(b)) { logp(b, 'good', '노래가 흩어진다'); codexHit(b, 'cantor', 'cut'); }
    if (e.foe === 'scribe' && (b.seal || []).length) { b.seal = []; logp(b, 'good', '봉인이 풀린다'); codexHit(b, 'scribe', 'unseal'); }
    if (e.intent && e.intent.k === 'sacrifice') { e.sacNext = null; e.sacCool = ABBOT.sacCool; logp(b, 'good', e.n + '의 제사가 끊긴다'); }
    if (e.intent && (e.intent.k === 'heavy' || e.intent.k === 'charge' || e.intent.k === 'explode' || e.intent.k === 'fuse' || CHANT_K.includes(e.intent.k) || e.intent.k === 'sacrifice' || e.intent.k === 'sacprep' || e.intent.k === 'retprep' || e.intent.k === 'return' || e.intent.k === 'mimic' || e.intent.k === 'reflect')) { if (e.foe === 'knight' && ['retprep', 'return'].includes(e.intent.k)) codexHit(b, 'knight', 'stop'); if (e.foe === 'echo' && e.mimicOn) codexHit(b, 'echo', 'cut'); e.intent = { k: 'attack' }; }
    e.mimicOn = null; if (e.foe === 'collector' && e.s.protect) { delete e.s.protect; logp(b, 'good', '몸에 두른 뼈가 쏟아져 내린다'); codexHit(b, 'collector', 'shatter'); } if (e.boss === 'cryptlord' && b.carve) { b.carve = null; logp(b, 'good', '군주가 무너지자 새긴 이름이 흐려진다'); codexHit(b, 'cryptlord', 'carvebreak'); }
    if ((b.ctx.ch || 1) >= 3) ch3OnBreak(b, e);
    if (e.role === 'boss') { e.breaks++; e.brkMax = Math.round(e.brkMax * 1.5); }
    logp(b, 'crit', e.n + '의 자세가 무너진다. 모으던 힘이 흩어지고 다음 행동을 놓친다');
    fxRun(b.p, 'onBreak', b, b.p, e);
    b.rec.push({ k: 'break', t: r1(b.t), role: e.role, cut: cut ? 1 : 0 });
  }
}
function finishPlayer(b, time, lost) {
  const p = b.p; if (!lost && p.build === 'elementalist') elemShock(b, 'me'); if (b.shockCtx) b.shockCtx = null; b.cur = null; b.curSkill = null; b.curFast = 0; // 원소술사 열충격: 행동 하나가 끝날 때 (빠른 행동도)
  // 0.6a.2: 행동했으면(기절로 놓친 차례가 아니면) 약화(공격했을 때) · 강화와 출혈. 강화는 공격했을 때 1 준다. 수도승만 실제로 곱했을 때(b.empUsed) 준다 (10월 7일, 다른 직업의 결과는 그대로)
  if (!lost) { if (b.atkUsed) kwDec(p, 'weak'); if (p.build === 'monk' ? b.empUsed : b.atkUsed) kwDec(p, 'empower'); kwBleed(b, p); }
  if (p.selfBad) cfSelfApply(b); // 숨겨진 직업 2: 고행은 출혈 발동 뒤에 걸린다
  b.atkUsed = 0; b.empUsed = 0;
  if (!lost) kiSettle(b); // 이 행동으로 얻은 강화(기)는 −1 다음에 든다
  if (p.st <= 0) { p.st = 0; p.exhaust = 1; }
  if (p.exhaust && p.st >= 30) p.exhaust = 0;
  // 내 차례 = 빠른 행동 1번(먼저) + 주 행동 1번 (10월 3일, 기획서 12.7절). 빠른 칸을 쓰면 차례가 이어지고, 주 행동을 하면 차례가 끝난다.
  // 느린 행동은 두 칸을 다 쓴다(빠른 칸이 남아 있어야 한다). 성인의 성배·수확자의 손: 다음 빠른 행동 한 번은 빠른 칸을 쓰지 않는다
  if (!lost && !b.over && time <= 0.6 && (!b.bonusUsed || b.extraQuick) && !noFast(p)) {
    if (b.bonusUsed) b.extraQuick = 0; // 소모품 향 한 줌: 빠른 칸 하나 더
    b.bonusUsed = 1; if (p.fxQuickNext) { p.fxQuickNext = 0; b.bonusUsed = 0; fxHit(p.eq.flask === 'saintgrail' ? 'saintgrail' : 'reaperhands'); }
    b.waiting = false; return;
  }
  const extraNow = !!b.extraTurn; b.extraTurn = 0; if (!extraNow) { chargeEv(b, 'turn'); if (b.carve && --b.carve.left <= 0) { b.carve = null; logp(b, 'good', '새긴 이름이 흐려진다'); } } b.bonusUsed = 0; // 사냥꾼 연속 행동: 두 번째 차례는 쿨타임이 줄지 않는다 // fxQuickNext(성인의 성배·수확자의 손)는 지우지 않는다: 주 행동으로 쓰러뜨려도 다음 빠른 행동 한 번이 빠른 칸을 쓰지 않게
  if (b.queue && b.queue[0] === 'p') { b.queue.shift(); if (b.queue[0] === 'p') { b.extraTurn = 1; logp(b, 'good', '가속: 한 번 더 움직인다'); } }
  abbotDemand(b);
  b.turnIdx++; if (b.extraTurn && b.prepTurn === b.turnIdx - 1) b.prepTurn = b.turnIdx; /* 10월 7일: 연속 두 행동 사이에는 적이 움직이지 않으므로 첫 차례의 준비(방어 · 흘리기)가 두 번째 차례까지 남는다 */ b.consN = 0; b.extraQuick = 0; if (p.quickTurns > 0) { b.extraQuick = 1; p.quickTurns--; } if (fxFlag(p, 'quick2')) b.extraQuick = 1; // 사냥꾼 그림자 질주
  if (b.stepMode) { b.waiting = true; return; }
  runUntilPlayer(b);
}
/* 행동 끝의 강화(기): meSt 강화(b.kiPend)를 더하고, 기 끌어올리기(kiGrow: (남은 기 + add) × mul, 상한 5) */
function kiSettle(b) {
  const p = b.p;
  if (b.kiPend) { const n = b.kiPend; b.kiPend = 0; addS(b, p, 'empower', n); }
  if (b.kiGrow) { const g = b.kiGrow; b.kiGrow = null; const cur = st(p, 'empower'); const nv = Math.min(KW.empower, (cur + (g.add || 0)) * (g.mul || 1)); if (nv > cur) addS(b, p, 'empower', nv - cur); logp(b, 'good', '기를 끌어올린다. 기 ' + cur + ' → ' + st(p, 'empower')); }
}
