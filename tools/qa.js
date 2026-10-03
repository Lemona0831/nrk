/* ===== 사람처럼 생각하는 QA 테스터 (엔진 직접 구동) ===== */
const E = require('./eng.gen.js');
const { BUILDS, ROOMS, ITEMS, SCEN } = E;
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const PERSONAS = {
  novice:   { n: '초보',   err: 0.14, flaskAt: 0.3, flaskAware: 0.35, parry: 0.25, guard: 0.15, healerFirst: 0.2, mech: 0.4, shieldAware: false, look: 0, curious: 0.3, risk: 0.5, learn: true },
  casual:   { n: '일반',   err: 0.06, flaskAt: 0.35, flaskAware: 0.8, parry: 0.5, guard: 0.3, healerFirst: 0.5, mech: 0.75, shieldAware: true, look: 0, curious: 0.4, risk: 0.5 },
  careful:  { n: '신중',   err: 0.04, flaskAt: 0.5, flaskAware: 0.95, parry: 0.75, guard: 0.6, healerFirst: 0.6, mech: 0.8, shieldAware: true, look: 0, curious: 0.2, risk: 0.2 },
  reckless: { n: '공격적', err: 0.06, flaskAt: 0.22, flaskAware: 0.7, parry: 0.15, guard: 0.05, healerFirst: 0.4, mech: 0.8, shieldAware: true, look: 0, curious: 0.5, risk: 0.9 },
  expert:   { n: '숙련',   err: 0.02, flaskAt: 0.35, flaskAware: 1, parry: 0, guard: 0, healerFirst: 0, mech: 1, shieldAware: true, look: 1, curious: 0.3, risk: 0.45 },
  explorer: { n: '탐험가', err: 0.04, flaskAt: 0.35, flaskAware: 1, parry: 0, guard: 0, healerFirst: 0, mech: 1, shieldAware: true, look: 1, curious: 0.9, risk: 0.55, swapOnFail: true },
};

/* ---------- 이상 상태 검사 ---------- */
function invariants(b, bugs, ctx) {
  const p = b.p; const bad = m => bugs.push(ctx + ': ' + m);
  if (!Number.isFinite(p.hp) || !Number.isFinite(p.mp) || !Number.isFinite(p.st)) bad('플레이어 수치가 숫자가 아님');
  if (p.hp > p.hpMax + 1e-6) bad('생명력 최대치 초과 ' + p.hp + '/' + p.hpMax);
  if (p.mp > p.mpMax + 1e-6 || p.mp < -1e-6) bad('마나 범위 밖 ' + p.mp);
  if (p.st > p.stMax + 1e-6 || p.st < -1e-6) bad('스태미나 범위 밖 ' + p.st);
  if (p.scar > p.hpMax * 0.5 + 1e-6) bad('상흔 한도 초과');
  if (p.flask.life < 0 || p.flask.mana < 0 || p.flask.life > p.flaskMax || p.flask.mana > p.flaskMax || (p.flask.stam || 0) < 0 || (p.flask.stam || 0) > p.flaskMax) bad('플라스크 범위 밖');
  for (const e of b.en) {
    if (!Number.isFinite(e.hp) || !Number.isFinite(e.next)) bad(e.n + ' 수치가 숫자가 아님');
    if (e.alive && e.hp > e.hpMax + 1e-6) bad(e.n + ' 생명력 최대치 초과');
    if (e.alive && e.hp <= 0) bad(e.n + ' 체력 0인데 살아 있음');
    if (e.brk < 0 || e.brk > e.brkMax + 1e-6) bad(e.n + ' 붕괴 게이지 범위 밖 ' + e.brk + '/' + e.brkMax);
    for (const k in e.s) if (!(e.s[k].until > b.t - 1e-6)) bad(e.n + ' 만료된 상태 남음 ' + k);
  }
  for (const k in p.s) if (!(p.s[k].until > b.t - 1e-6)) bad('플레이어 만료된 상태 남음 ' + k);
  if (!b.over && b.pNext < b.t - 1e-6) bad('내 차례 시각이 과거');
  const al = E.alive(b).filter(e => e.role !== 'root');
  if (!b.over && !al.length) bad('적이 없는데 전투가 안 끝남');
  if (p.dodge && !b.en.find(e => e.id === p.dodge)) bad('흘리기 대상이 없음');
}

/* ---------- 한 수 앞 계산 (숙련·탐험가) ---------- */
function cloneB(b) {
  const c = JSON.parse(JSON.stringify(Object.assign({}, b, { log: [], rec: [], rngF: null })));
  c.rngF = () => 0.99; c.stepMode = false; c.waiting = false; return c;
}
function evalState(b0, b1, risk) {
  if (b1.over === 'lose') return -1e4;
  if (b1.over === 'win') return 1e4 - (b0.p.hp - b1.p.hp);
  const p0 = b0.p, p1 = b1.p;
  const hpLoss = (p0.hp - p1.hp) / p0.hpMax;
  // 0.6a.2 직업: 적에게 쌓인 중독이 앞으로 줄 피해의 절반을 깎은 체력으로 본다(한 수 앞만 보면 지속 피해를 낮게 보는 편향을 줄인다). 옛 직업 측정은 그대로
  const v2 = E.isV2 && E.isV2(b0.p);
  const eh = bb => E.alive(bb).filter(e => e.role !== 'root').reduce((a, e) => a + Math.max(0, e.hp - (v2 && e.s.poison ? Math.min(e.hp, E.poisonTotal(e.s.poison.stacks) * 0.5) : 0)) / (e.role === 'boss' ? 4 : 1), 0);
  const dealt = eh(b0) - eh(b1);
  const kills = E.alive(b0).length - E.alive(b1).length;
  const flasks = (p0.flask.life + p0.flask.mana + (p0.flask.stam || 0)) - (p1.flask.life + p1.flask.mana + (p1.flask.stam || 0));
  const lowHp = p1.hp / p1.hpMax < 0.25 ? 25 : 0;
  const threat = E.alive(b1).filter(e => e.intent && ['heavy', 'explode', 'heal', 'summon'].includes(e.intent.k)).length;
  const roots = E.alive(b1).filter(e => e.role === 'root').length;
  const healers = E.alive(b1).filter(e => e.role === 'healer' || e.role === 'summoner').length;
  const poison = p1.s.poison ? p1.s.poison.stacks : 0;
  const scarKeep = p1.build === 'scar' ? p1.scar * 0.15 : 0;
  return dealt * 1.0 + kills * 6 - hpLoss * (40 + 80 * (1 - risk)) - flasks * 7 - lowHp - threat * 1.5 - roots * 3 - healers * 3 - poison * 0.6 + scarKeep + (p1.st - p0.st) * 0.03;
}
function lookahead(b, P, r) {
  const L = E.actionList(b).filter(a => a.ok && a.id !== 'flee' && a.id !== 'sig');
  const cands = [];
  for (const a of L) {
    let ts = [null];
    if (!a.self && !a.aoe) ts = E.alive(b).filter(e => E.canTarget(b, e, a) && !(a.id === 'dodge' && e.role === 'root')).map(e => e.id);
    for (const t of ts) {
      const c = cloneB(b); E.playerAct(c, a.id, t);
      cands.push({ a: a.id, t, v: evalState(b, c, P.risk) + (r() - 0.5) * 2 });
    }
  }
  cands.sort((x, y) => y.v - x.v);
  return cands[0] ? [cands[0].a, cands[0].t] : ['basic', null];
}

/* ---------- 휴리스틱 사고 (초보·일반·신중·공격적) ---------- */
function sigRule(b, r) {
  const p = b.p; const L = E.actionList(b); const a = L.find(x => x.id === 'sig'); if (!a || !a.ok) return null;
  const al = E.alive(b).filter(e => e.role !== 'root'); const hpf = p.hp / p.hpMax;
  const hv = E.previewAfter(b, 1).some(x => x.e.intent && x.e.intent.k === 'heavy');
  const big = al.slice().sort((x, y) => y.hp - x.hp)[0];
  switch (p.build) {
    case 'berserker': return al.length && (p.rage >= 8 || (p.rage >= 5 && hpf < 0.5)) ? ['sig'] : null;
    case 'hunter': { const t = al.filter(e => (e.elite || e.role === 'boss') && e.hp > e.hpMax * 0.6).sort((x, y) => y.hp - x.hp)[0]; return t ? ['sig', t.id] : null; }
    case 'arcanist': return p.mp < 25 && L.some(x => x.skill && (x.aoe || x.ranged || x.melee)) ? ['sig'] : null;
    case 'templar': return hv || hpf < 0.6 ? ['sig'] : null;
    case 'assassin': { const t = E.alive(b).filter(e => e.s.poison && e.s.poison.stacks >= 4).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0]; return t ? ['sig', t.id] : null; }
    case 'warlock': return p.mp < 15 && hpf > 0.5 ? ['sig'] : null;
    case 'priest': return Object.keys(p.s).some(k => ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln'].includes(k)) || hpf < 0.6 ? ['sig'] : null;
    case 'scar': return hv && hpf > 0.4 ? ['sig'] : null;
  }
  return null;
}
/* 0.6a.2 직업의 판단: 스킬 이름이 아니라 데이터(fx)를 보고 고른다. 사람처럼 단순한 규칙 몇 개 */
const psn2 = (u, k) => (u.s[k] ? u.s[k].stacks : 0);
/* 0.6a.2 라운드: 이번 차례에(빠른 행동으로) 흘릴 준비를 이미 했는가 (id를 주면 그 적에게). 옛 직업은 늘 false라 next/ 측정은 그대로다 */
const v2Ready = (b, id) => !!(E.isV2 && E.isV2(b.p) && b.p.dodge && b.prepTurn === b.turnIdx && (id == null || b.p.dodge === id));
function v2Pick(b, P, r, mem, L, al, hv, ex, aware) {
  const p = b.p; const nf = !!(E.noFast && E.noFast(p)); const okS = L.filter(a => a.v2 && a.ok && !(nf && a.time <= 0.6)); const has = (a, k) => a.s.fx.some(e => e.k === k); // 느린 맥박: 빠른 칸이 없어 빠른 스킬도 차례를 끝내므로 사람처럼 빠른 스킬을 고르지 않는다
  const psn = e => (e.s.poison ? e.s.poison.stacks : 0);
  const reach = a => E.alive(b).filter(e => e.role !== 'root' && E.canTarget(b, e, a));
  const best = (a, f) => reach(a).sort(f)[0];
  const useMech = r() < (P.mech || 0.5);
  // 정화 플라스크: 적이 이번에 상태를 걸 예정이면 미리 막는다
  // 정화 플라스크: 출혈이 이미 쌓여 더 걸리면 아프거나, 폭발 약화가 올 때만(사람은 막을 거리가 클 때 마신다)
  const pv1 = E.previewAfter(b, 1); const bleedIn = pv1.some(x => x.e.intent && x.e.intent.k === 'attack' && x.e.intent.bleed); const boomIn = pv1.some(x => x.e.intent && x.e.intent.k === 'explode');
  if (((bleedIn && psn2(p, 'bleed') >= 2) || boomIn) && !p.s.block && p.flask.mana > 0 && r() < aware * 0.5) return ['flaskM'];
  // 강타 예고: 흘리기형 스킬(스태미나 없이) → 흘리기 준비 → 스태미나 흘리기. 이번 차례에 빠른 행동으로 이미 그 적을 흘릴 준비를 했으면 다시 걸지 않는다(덮어쓰면 붙은 효과를 잃는다)
  if (hv && !v2Ready(b, hv.e.id) && r() < Math.max(P.parry, 0.35) + 0.2) {
    const ps = okS.find(a => has(a, 'parry')); if (ps) return [ps.id, hv.e.id];
    const pb = okS.find(a => has(a, 'parryBuff')); if (pb && !p.pbuf && E.dodgeCost(p) <= p.st) return [pb.id];
    if (L.find(a => a.id === 'dodge' && a.ok) && r() < P.parry + 0.3) return ['dodge', hv.e.id];
  }
  if ((hv || ex) && r() < P.guard && L.find(a => a.id === 'guard' && a.ok)) return ['guard'];
  // 강공격: 스태미나가 넉넉하고 강타 예고가 없으면 가끔 (흘리기 몫 40은 남긴다)
  if (!hv && p.st >= 80 && r() < 0.3 + P.risk * 0.3 && L.find(a => a.id === 'heavy' && a.ok)) { const t = best({ id: 'heavy', melee: 1 }, (x, y) => y.hp - x.hp); if (t) return ['heavy', t.id]; }
  if (!useMech) { const pool = okS.filter(a => !has(a, 'parry') && !has(a, 'parryBuff') && !(has(a, 'burst') && !E.alive(b).some(e => psn(e) > 0))); if (pool.length && r() < 0.6) { const a = pool[Math.floor(r() * pool.length)]; const t = a.self || a.aoe ? null : best(a, (x, y) => x.hp - y.hp); return [a.id, t && t.id]; } return null; }
  const th = mem.burstTh || (mem.burstTh = 4 + Math.floor(r() * 4));
  // 처형·터뜨리기: 죽일 수 있거나 충분히 쌓였을 때
  for (const a of okS.filter(a => has(a, 'burst'))) {
    if (a.aoe) { if (E.alive(b).filter(e => psn(e) >= 3).length >= 2) return [a.id]; continue; }
    const exe = a.s.fx.find(e => e.k === 'execute'); const pre = (a.s.fx.find(e => e.k === 'burst') || {}).pre || 0;
    const t = best(a, (x, y) => psn(y) - psn(x)); if (!t || !(psn(t) + pre)) continue;
    const bf = a.s.fx.find(e => e.k === 'burst') || {}; const dmg = E.poisonTotal(psn(t) + pre) * (bf.mul || 1); // 터뜨리면 나올 피해 (사람은 버튼의 숫자를 보고 누른다)
    const kill = dmg >= t.hp; const low = exe && t.hp <= t.hpMax * exe.hp;
    const big = !!(t.elite || t.strong || t.role === 'boss');
    if (kill || low || psn(t) + pre >= th || dmg >= 15 || (big && psn(t) + pre >= 3) || (t.intent && t.intent.k === 'heavy')) return [a.id, t.id]; // 큰 적은 독이 조금만 쌓여도 터뜨린다(큰 적 배수)
  }
  // 터뜨리기를 가진 빌드: 곧 터뜨릴 적에게 먼저 독을 쌓는다 (독 심기 → 독 격발)
  { const bu = L.filter(a => a.v2 && a.s.fx.some(e => e.k === 'burst') && !a.s.once);
    const pz = okS.filter(a => has(a, 'poison') && !a.aoe && !has(a, 'burst'));
    if (bu.length && pz.length && bu.some(a => (a.wait || 0) <= 1)) { const a = pz.sort((x, y) => (y.s.fx.find(e => e.k === 'poison').n) - (x.s.fx.find(e => e.k === 'poison').n))[0]; const t = best(a, (x, y) => (psn(y) - psn(x)) || (y.hp - x.hp)); if (t && psn(t) < th) return [a.id, t.id]; } }
  // 키우기: 중독 4 이상
  for (const a of okS.filter(a => has(a, 'grow'))) { const t = best(a, (x, y) => psn(y) - psn(x)); if (t && psn(t) >= 4) return [a.id, t.id]; }
  // 강타·폭발을 모으는 적: 끊는 스킬(끊어 내기, 붕괴가 큰 스킬)로 그 적을 노린다 (사람은 예고를 보고 끊는다)
  { const chg = E.alive(b).filter(e => e.intent && ['charge', 'heavy', 'fuse', 'explode'].includes(e.intent.k));
    if (chg.length && r() < 0.8) { const brkOf = a => a.s.fx.reduce((m, e) => m + (e.k === 'cutx' ? e.brk : e.k === 'brk' ? e.n : e.k === 'brkPer' ? e.per * psn(chg[0]) : 0), 0);
      const cs = okS.filter(a => !a.self && brkOf(a) >= 25).sort((x, y) => brkOf(y) - brkOf(x));
      for (const a of cs) { const t = chg.filter(e => E.canTarget(b, e, a)).sort((x, y) => (y.brk / y.brkMax) - (x.brk / x.brkMax))[0]; if (t && t.brk + brkOf(a) >= t.brkMax * 0.6) return [a.id, t.id]; } } }
  // 흘리기형 스킬에 보상(피해·되받기)이 붙어 있으면 강타가 아니어도: 내 다음 차례 전에 나를 칠 적에게
  { const pa = okS.find(a => has(a, 'parry') && (has(a, 'onParry') || has(a, 'dmg'))); if (pa && !v2Ready(b) && r() < 0.7) { const at = pv1.find(x => x.e.intent && x.e.intent.k === 'attack'); if (at) return [pa.id, at.e.id]; } }
  // 광역: 둘 이상
  for (const a of okS.filter(a => a.aoe && !has(a, 'burst'))) if (reach(a).length >= 2) return [a.id];
  // 중독을 이용하는 스킬: 중독 3 이상
  for (const a of okS.filter(a => has(a, 'exploit') || has(a, 'brkPer'))) { const t = best(a, (x, y) => psn(y) - psn(x)); if (t && psn(t) >= 3) return [a.id, t.id]; }
  // 흘리기 준비(자신): 강타가 곧 오면
  const pb = okS.find(a => has(a, 'parryBuff')); if (pb && !p.pbuf && E.alive(b).some(e => e.intent && e.intent.k === 'charge') && r() < 0.6) return [pb.id];
  // 그 밖의 공격 스킬: 아직 중독이 적은 적 / 약한 적
  const atk = okS.filter(a => !a.self && !has(a, 'parry') && !has(a, 'burst') && !has(a, 'grow'));
  if (atk.length) { const a = atk[Math.floor(r() * atk.length)]; const t = has(a, 'poison') ? best(a, (x, y) => (psn(x) - psn(y)) || (x.hp - y.hp)) : best(a, (x, y) => x.hp - y.hp); if (t) return [a.id, t.id]; }
  return null;
}
function heuristic(b, P, r, mem) {
  const p = b.p, L = E.actionList(b), ok = id => { const a = L.find(x => x.id === id); return a && a.ok; };
  const al = E.alive(b).filter(e => e.role !== 'root');
  const hpf = p.hp / p.hpMax;
  const pv = E.previewAfter(b, 1);
  const hv = pv.find(x => x.e.intent && x.e.intent.k === 'heavy');
  const ex = pv.find(x => x.e.intent && x.e.intent.k === 'explode');
  // 실수
  if (r() < P.err * (mem.errMul || 1)) { const okL = L.filter(a => a.ok && a.id !== 'flee'); const a = okL[Math.floor(r() * okL.length)]; const ts = E.alive(b).filter(e => E.canTarget(b, e, a)); return [a.id, ts.length ? ts[Math.floor(r() * ts.length)].id : null, 'mistake']; }
  // 플라스크 (기억하고 있을 때만)
  const aware = Math.min(1, P.flaskAware + (mem.flaskLearn || 0));
  if (hpf < P.flaskAt && ok('flaskL') && r() < aware) return ['flaskL'];
  // 0.6: 기본 공격이 스태미나를 채우지 않으므로, 강타가 오는데 흘리기·방어할 스태미나가 없거나 바닥나면 스태미나 플라스크
  if (ok('flaskS') && ((hv && p.st < 30 && r() < aware * (P.parry + P.guard + 0.3)) || (p.st < 15 && r() < aware * 0.5))) return ['flaskS'];
  const mother = al.find(e => e.boss === 'mother');
  if (mother && p.s.poison && p.s.poison.stacks >= 7 && r() < aware * 0.8) { if (p.build === 'priest' && ok('purge')) return ['purge', mother.id]; if (ok('flaskL')) return ['flaskL']; }
  // 0.6a.2 직업(충전 스킬): 스킬 데이터를 보고 고른다
  if (E.isV2 && E.isV2(p)) { const v = v2Pick(b, P, r, mem, L, al, hv, ex, aware); if (v) return v; }
  // 예고 대응
  if (hv && !v2Ready(b, hv.e.id) && r() < P.parry && ok('dodge')) return ['dodge', hv.e.id];
  if ((hv || ex) && r() < P.guard && ok('guard')) return ['guard'];
  // 대상 고르기 (사람의 눈: 위협·치유사·약한 적)
  const reachable = a => E.alive(b).filter(e => E.canTarget(b, e, { id: a, melee: ['basic', 'heavy', 'viper', 'scarcut', 'crush', 'lava'].includes(a) ? 1 : 0, ranged: ['flame', 'purge', 'reverse', 'aimshot', 'drain'].includes(a) ? 1 : 0 }));
  const pick = a => {
    let c = reachable(a); if (!c.length) return null;
    const shieldAware = P.shieldAware || (mem.redirSeen || 0) >= 3;
    if (shieldAware && ['basic', 'heavy', 'viper', 'scarcut', 'crush', 'lava'].includes(a)) { const unguarded = c.filter(e => !E.guardOf(b, e)); if (unguarded.length) c = unguarded; }
    const roots = c.filter(e => e.role === 'root'); if (roots.length && r() < 0.6) return roots[0];
    if (r() < P.healerFirst) { const h = c.find(e => e.role === 'healer' || e.role === 'summoner'); if (h) return h; }
    const h2 = c.find(e => e.intent && (e.intent.k === 'heavy' || e.intent.k === 'charge')); if (h2 && r() < 0.5) return h2;
    return c.sort((x, y) => x.hp - y.hp)[0];
  };
  // 직업 기술: 쓸 수 있으면 가끔 쓴다
  if (ok('sig') && r() < 0.8) {
    const nr = E.alive(b).filter(e => e.role !== 'root');
    const big = nr.slice().sort((x, y) => y.hp - x.hp)[0];
    const psn = nr.filter(e => e.s.poison && e.s.poison.stacks >= 5).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0];
    const dbf = ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln'].some(k => p.s[k]);
    const minMana = Math.min(...E.actionList(b).filter(a => a.skill && a.mana).map(a => a.mana), 99);
    const use = { berserker: p.rage >= 5, hunter: big && (big.role === 'boss' || big.elite || big.hp > 25), arcanist: p.mp < p.mpMax * 0.4, templar: !!hv || hpf < 0.6, assassin: !!psn, warlock: p.mp < minMana && hpf > 0.5, priest: dbf || hpf < 0.6, scar: !!hv }[p.build];
    if (use) return ['sig', (p.build === 'assassin' ? psn : big) && (p.build === 'assassin' ? psn : big).id];
  }
  // 가진 스킬로 판단 (이해도 mech)
  const useMech = r() < P.mech;
  if (ok('burst') && useMech) {
    const th = mem.burstTh || (mem.burstTh = 4 + Math.floor(r() * 5));
    const cands = E.alive(b).filter(e => e.s.poison && e.role !== 'root');
    const kill = cands.find(e => E.poisonTotal(e.s.poison.stacks) >= e.hp);
    const cut = cands.find(e => e.intent && (e.intent.k === 'charge' || e.intent.k === 'heavy') && e.brk + e.s.poison.stacks * E.PSN.brk >= e.brkMax);
    const big = cands.filter(e => e.s.poison.stacks >= th).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0];
    const t = kill || cut || big; if (t) return ['burst', t.id];
  }
  if (ok('release') && al.length >= 2 && (useMech ? p.scar >= 20 : r() < 0.25)) return ['release'];
  let dn = 0; for (const k of ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln']) if (p.s[k]) dn += (k === 'poison' || k === 'chill') ? p.s[k].stacks : 1;
  if (ok('purge') && (useMech ? dn >= 3 : r() < 0.15)) { const t = pick('purge'); if (t) return ['purge', t.id]; }
  if (ok('reverse') && (p.s.weak || p.s.vuln) && useMech) { const t = pick('reverse'); if (t) return ['reverse', t.id]; }
  if (ok('cloud') && al.length >= 3 && al.filter(e => e.s.poison).length < 2 && useMech) return ['cloud'];
  if (ok('fireball') && al.length >= 2 && useMech) return ['fireball'];
  // 직업 전용 스킬: 종류로 판단
  const EX = E.exclOf(p.build).filter(x => ok(x.id));
  for (const x of EX) {
    const fx = x.fx || {};
    if (x.hpCost && hpf < 0.5) continue;
    if (x.type === 'self') {
      if ((fx.healPct || fx.suture) && hpf < 0.55) return [x.id];
      if ((fx.ward || fx.protect) && (hv || hpf < 0.5)) return [x.id];
      if (fx.cleanseAll && Object.keys(p.s).some(k => ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln'].includes(k))) return [x.id];
      if (fx.rage && r() < 0.3) return [x.id];
      if (fx.scarFromCost && hpf > 0.6 && p.scar < 20 && r() < 0.4) return [x.id];
      continue;
    }
    if ((x.type === 'aoe' || x.type === 'front') && al.length >= 2 && r() < 0.7) return [x.id];
    if (fx.scarAll) { if (p.scar >= 20) { const t = pick('basic'); if (t) return [x.id, t.id]; } continue; }
    if ((x.type === 'melee' || x.type === 'ranged') && r() < 0.6) { const t = pick(x.type === 'ranged' ? 'flame' : 'basic'); if (t) return [x.id, t.id]; }
  }
  if (ok('drain') && hpf < 0.7) { const t = pick('drain'); if (t) return ['drain', t.id]; }
  if (ok('crush')) { const t = pick('crush'); if (t) return ['crush', t.id]; }
  if (ok('scarcut') && p.scar >= 8) { const t = pick('scarcut'); if (t) return ['scarcut', t.id]; }
  if (ok('viper')) { const t = pick('viper'); if (t) return ['viper', t.id]; }
  if (ok('flame')) { const t = pick('flame'); if (t) return ['flame', t.id]; }
  if (ok('aimshot')) { const t = pick('aimshot'); if (t) return ['aimshot', t.id]; }
  if (ok('lava')) { const t = pick('lava'); if (t) return ['lava', t.id]; }
  if (ok('drain')) { const t = pick('drain'); if (t) return ['drain', t.id]; }
  if (ok('fireball')) return ['fireball'];
  if (ok('scarcut')) { const t = pick('scarcut'); if (t) return ['scarcut', t.id]; }
  if (ok('heavy') && r() < P.risk * 0.6) { const h = pick('heavy'); if (h) return ['heavy', h.id]; }
  const t = pick('basic'); return ['basic', t && t.id];
}

/* ---------- 사람 눈에 "헛동작"인지 ---------- */
function wasted(b, id, tid, mem) {
  const p = b.p; const t = tid ? b.en.find(e => e.id === tid) : null;
  let dn = 0; for (const k of ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln']) if (p.s[k]) dn++;
  if (id === 'purge' && dn === 0) return '정화할 디버프 없이 정화의 빛';
  if (id === 'release' && p.scar < 5) return '상흔 거의 없이 방출';
  if (id === 'reverse' && !p.s.weak && !p.s.vuln) return '옮길 약화 없이 역전';
  if (id === 'dodge') { const tt = t || E.pickDodge(b); if (tt && !E.previewAfter(b, 1).some(x => x.e === tt)) return '움직이지 않을 적에게 흘리기'; }
  if (id === 'flaskL' && p.hp > p.hpMax * 0.9 && !p.s.poison && !p.s.bleed && !p.s.ignite && !p.s.chill) return '생명력 거의 가득한데 생명력 플라스크';
  if (id === 'flaskM' && p.mp > p.mpMax * 0.9 && !p.s.weak && !p.s.vuln) return '마나 거의 가득한데 마나 플라스크';
  if (['basic', 'heavy', 'viper', 'scarcut', 'crush', 'lava'].includes(id) && !(p.build === 'hunter' && (id === 'basic' || id === 'heavy')) && t && E.guardOf(b, t) && !(id === 'heavy' && p.eq.weapon === 'hook' && t.row === 'back')) return '방패병에게 가로막힐 대상을 근접 공격';
  if (id === 'cloud' && E.alive(b).every(e => e.s.poison && e.s.poison.stacks >= 9)) return '이미 중독 가득한데 독구름';
  return null;
}

/* ---------- 한 판 ---------- */
function playRun(pk, build, boss, seed, mem, forceItem) {
  const P = PERSONAS[pk]; const r = rng(seed);
  const alloc = (n, pref) => { const st = { str: 0, dex: 0, int: 0 }; for (let i = 0; i < n; i++) { const k = r() < 0.6 ? pref : ['str', 'dex', 'int'][Math.floor(r() * 3)]; st[k]++; } return st; };
  const pref = { assassin: 'int', scar: 'str', priest: 'int', berserker: 'str', hunter: 'dex', arcanist: 'int', templar: 'str', warlock: 'int' }[build];
  const stats = alloc(6, pk === 'novice' ? ['str', 'dex', 'int'][Math.floor(r() * 3)] : pref);
  const SKM = E.skillMap(build); const ids = Object.keys(SKM);
  let skills;
  if (pk === 'expert' || pk === 'explorer' || pk === 'novice') { skills = ids.slice().sort(() => r() - 0.5).slice(0, 3); }
  else { const ex = ids.filter(id => SKM[id].excl).sort(() => r() - 0.5); const home = ids.filter(id => SKM[id].home === build); const other = ids.filter(id => !SKM[id].excl && SKM[id].home !== build).sort(() => r() - 0.5); skills = ex.slice(0, 1 + Math.floor(r() * 2)).concat(home).concat(other).slice(0, 3); }
  const p = E.mkPlayer(build, {}, stats, skills);
  const pool = E.FREE_POOL.slice().sort(() => r() - 0.5);
  if (forceItem) { p.eq[ITEMS[forceItem].slot] = forceItem; E.applyStats(p, stats); p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; }
  const out = { skills: skills.slice(), stats: Object.assign({}, stats), picks: [], bursts: [], burstCuts: 0, persona: pk, build, boss, seed, result: 'lose', deaths: 0, deathRooms: [], deathsWithFlask: 0, acts: 0, wasted: {}, mistakes: 0, redirects: 0, bugs: [], rooms: [], blockItem: null, freeEquipped: [], swapsOnFail: 0, enraged: false, bossActs: null, heavyResp: {}, retriesByRoom: {}, stall: 0, parryWasted: 0, flaskUse: 0 };
  const setMax = () => { const hm = E.calcHpMax(p); if (hm !== p.hpMax) { const f = p.hp / p.hpMax; p.hpMax = hm; p.hp = Math.min(hm, hm * f); } const mm = E.calcMpMax(p); if (mm !== p.mpMax) { p.mpMax = mm; p.mp = Math.min(p.mp, mm); } const sm = E.calcStMax(p); if (sm !== p.stMax) { p.stMax = sm; p.st = Math.min(p.st, sm); } };
  const blockOpts = ['hook', 'plate', 'witness'];
  for (let i = 0; i < ROOMS.length; i++) {
    const R = ROOMS[i];
    if (R.spring) { p.hp = Math.min(p.hpMax, p.hp + p.hpMax * .5); p.mp = Math.min(p.mpMax, p.mp + p.mpMax * .5); p.flask.life = Math.min(3, p.flask.life + 1); p.flask.mana = Math.min(3, p.flask.mana + 1); p.flask.stam = Math.min(3, (p.flask.stam || 0) + 1); continue; }
    if (R.block) { const bi = r() < 0.15 ? null : blockOpts[Math.floor(r() * 3)]; out.blockItem = bi || '없음'; if (bi && !(forceItem && ITEMS[bi].slot === ITEMS[forceItem].slot)) { p.eq[ITEMS[bi].slot] = bi; setMax(); } }
    const entry = JSON.parse(JSON.stringify(p)); let tries = 0;
    for (;;) {
      const b = E.roomBattle(p, R, boss, i + 3 + seed % 5);
      b.rngF = r;
      const hpIn = p.hp / p.hpMax; let n = 0, lastT = -1, same = 0;
      while (!b.over && n++ < 250) {
        const sr = r() < (P.mech || 0.5) ? sigRule(b, r) : null;
        let [a, t, tag] = sr || (P.look ? lookahead(b, P, r) : heuristic(b, P, r, mem));
        if (P.look && r() < P.err) { const okL = E.actionList(b).filter(x => x.ok && x.id !== 'flee'); a = okL[Math.floor(r() * okL.length)].id; t = null; tag = 'mistake'; }
        if (tag === 'mistake') out.mistakes++;
        const w = wasted(b, a, t, mem); if (w) out.wasted[w] = (out.wasted[w] || 0) + 1;
        if (a === 'dodge' && w) out.parryWasted++;
        if (a === 'flaskL' || a === 'flaskM' || a === 'flaskS') out.flaskUse++;
        const snapHeavy = E.previewAfter(b, 1).some(x => x.e.intent && x.e.intent.k === 'heavy');
        if (snapHeavy) out.heavyResp[a] = (out.heavyResp[a] || 0) + 1;
        let burstInfo = null;
        if (a === 'burst') { const tt = (t && b.en.find(e => e.id === t && e.alive && e.s.poison)) || E.alive(b).filter(e => e.s.poison).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0]; if (tt) burstInfo = { n: tt.s.poison.stacks, charging: !!(tt.intent && (tt.intent.k === 'charge' || tt.intent.k === 'heavy')), role: tt.role, id: tt.id }; }
        const logN = b.log.length;
        try { E.playerAct(b, a, t); } catch (e) { out.bugs.push('예외: ' + e.message + ' @' + a); b.over = 'lose'; break; }
        if (burstInfo) { const broke = b.log.slice(logN).some(x => x.m.includes('자세가 무너진다')); out.bursts.push(burstInfo.n); if (burstInfo.charging && broke) out.burstCuts++; }
        const redir = b.log.slice(logN).some(x => x.m.includes('가로막'));
        if (redir) { out.redirects++; mem.redirSeen = (mem.redirSeen || 0) + 1; }
        invariants(b, out.bugs, `${ROOMS[i].n} ${a}`);
        if (Math.abs(b.t - lastT) < 1e-9) { same++; if (same > 5) { out.bugs.push(ROOMS[i].n + ': 시간이 흐르지 않음'); break; } } else same = 0; lastT = b.t;
        out.acts++;
      }
      if (!b.over) { out.stall++; out.bugs.push(ROOMS[i].n + ': 250행동 안에 전투가 끝나지 않음'); }
      if (R.boss) { if (b.enrage) out.enraged = true; if (b.over === 'win') out.bossActs = b.turnIdx;
        out.bossHits = out.bossHits || {}; for (const x of b.rec) if (x.k === 'hit') { const k = (x.dot ? 'dot:' : '') + (x.src || '?') + (x.charged ? ':강타' : ''); out.bossHits[k] = (out.bossHits[k] || 0) + x.d; }
        out.bossSig = (out.bossSig || 0) + b.rec.filter(x => x.k === 'act' && x.a === 'sig').length; out.bossActsAll = (out.bossActsAll || 0) + b.rec.filter(x => x.k === 'act').length;
        out.bossLogs = b.log.slice(-6).map(x => x.m); }
      out.rooms.push({ room: i, res: b.over, acts: b.turnIdx, loss: Math.round((hpIn - p.hp / p.hpMax) * 100), try: tries });
      if (b.over === 'win' || b.over === 'flee') break;
      out.deaths++; out.deathRooms.push(i); tries++;
      out.retriesByRoom[i] = (out.retriesByRoom[i] || 0) + 1;
      if (entry.flask.life > 0 && b.p.flask.life > 0) out.deathsWithFlask++;
      if (P.learn) { mem.flaskLearn = Math.min(0.6, (mem.flaskLearn || 0) + 0.2); mem.errMul = Math.max(0.4, (mem.errMul || 1) * 0.9); }
      if (tries > (pk === 'novice' ? 3 : 2)) { out.bugs = out.bugs.slice(0, 50); return out; }
      Object.assign(p, JSON.parse(JSON.stringify(entry)));
      if (R.block && P.swapOnFail) { const cur = out.blockItem; const alt = blockOpts.filter(x => x !== cur); const bi = alt[Math.floor(r() * alt.length)]; if (cur && ITEMS[cur]) p.eq[ITEMS[cur].slot] = null; p.eq[ITEMS[bi].slot] = bi; setMax(); out.blockItem = bi; out.swapsOnFail++; }
    }
    E.endBattleCarry(p);
    if (R.drop) {
      const fitsQ = k => E.itemFits(p, k);
      const offer = pool.filter(k => !out.picks.includes(k) && fitsQ(k)).slice(0, 2);
      if (offer.length) { const pick = offer[Math.floor(r() * offer.length)]; out.picks.push(pick); if (!forceItem && r() < P.curious) { p.eq[ITEMS[pick].slot] = pick; setMax(); out.freeEquipped.push(pick); } }
    }
    if (R.block) { const add = alloc(3, pref); for (const k in add) stats[k] += add[k]; E.applyStats(p, stats); out.stats = Object.assign({}, stats); }
    if (R.boss) out.result = 'win';
  }
  if (P.learn && out.result === 'win') mem.errMul = Math.max(0.4, (mem.errMul || 1) * 0.85);
  out.bugs = out.bugs.slice(0, 50);
  return out;
}

/* ---------- 고정 상황 (숙련 기준 빌드별 판단) ---------- */
function scenRun(build, pk, seed) {
  const P = PERSONAS[pk]; const r = rng(seed);
  return SCEN.map(sc => {
    const b = E.scenBattle(build, sc); b.rngF = r; let n = 0;
    while (!b.over && n++ < 10) { const [a, t] = P.look ? lookahead(b, P, r) : heuristic(b, P, r, {}); E.playerAct(b, a, t); }
    const acts = b.rec.filter(x => x.k === 'act');
    const first = (acts.find(x => x.tg && !['guard', 'dodge', 'flaskL', 'flaskM'].includes(x.a)) || {}).tg || '—';
    let took = 0, last = null; for (const x of b.rec) { if (x.k === 'act') last = x; if (x.k === 'hit' && x.charged && x.d > 0 && !x.parried && last && last.canDodge && !['dodge', 'guard'].includes(last.a)) took++; }
    const stop = (acts.find(x => ['guard', 'flaskL', 'flaskM', 'dodge'].includes(x.a)) || {}).a || '—';
    return { id: sc.id, first, took, stop, over: b.over || 'open' };
  });
}

if (require.main === module) {
  const N = +(process.argv[2] || 30);
  const t0 = Date.now(); const runs = [];
  for (const pk of Object.keys(PERSONAS)) for (const build of Object.keys(BUILDS).filter(k => !BUILDS[k].tut)) for (const boss of ['mother', 'tree']) {
    const mem = {};
    for (let s = 0; s < N; s++) runs.push(playRun(pk, build, boss, 1000 + s * 7 + boss.length, mem));
  }
  const scen = {}; for (const build of Object.keys(BUILDS).filter(k => !BUILDS[k].tut)) for (const pk of ['expert', 'casual']) scen[build + '/' + pk] = [0, 1, 2, 3, 4].map(s => scenRun(build, pk, 50 + s));
  require('fs').writeFileSync(require('path').join(__dirname, 'qa.json'), JSON.stringify({ runs, scen }));
  console.log('runs', runs.length, 'sec', ((Date.now() - t0) / 1000).toFixed(1));
}
module.exports = { playRun, PERSONAS, heuristic, lookahead, sigRule, invariants, wasted, rng };
