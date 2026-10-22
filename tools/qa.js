/* ===== 사람처럼 생각하는 QA 테스터 (엔진 직접 구동) ===== */
const E = require('./eng.gen.js');
/* 0.8.0 M5-1 파수꾼 태세(10월 20일): 테스터는 켜 둔 태세를 끄지 않는다(끄기는 유산 0이라 아무 뜻 없이 껐다 켜기를 되풀이했다). 다른 태세로 바꾸는 것은 그대로 */
{ const AL0 = E.actionList; E.actionList = function (b) { const L = AL0.apply(this, arguments), S = b && b.p && b.p.wdSt; if (S) for (const a of L) { const ws = a.v2 && a.s && a.s.fx && a.s.fx.find(e => e.k === 'wdStance'); if (ws && S[ws.s] && a.ok) { a.ok = false; a.why = '켜 둔 태세(테스터는 끄지 않음)'; } } return L; }; }
/* 10월 18일 0.8.0 5단계 측정 변형(원거리 초안 10절 결정 3): ASN_SHADOW_VAR가 ATREE_DEF.assassin을 불러올 때 메모리에서 바꾼다(dgqa.js도 이 함수로 같은 변형을 넣는다).
   10월 18일 0.8.0 5단계 마무리(11-4, 만든 사람 승인): 맞바꾸기(swap)가 기본 데이터가 되었다. swap은 이제 아무것도 바꾸지 않는다(예전 측정 명령을 그대로 돌릴 수 있게 둔다).
   old = 맞바꾸기 전 배치로 되돌린다: 후열 기습 2고리 r3 L(그림자 찌르기 밑) · 칼끝 겨누기 1고리 r2 R(흘려 베기 밑), 잔상 · 그늘 숨기는 칼끝 겨누기 밑, 연막 1고리 r2 RR
   rush = old 위에 그림자 연타(SKILLS2 값 그대로, 유산 3 = skCost 기본값)를 그림자 찌르기 밑 2고리 r4 L 스킬 노드로 되살린다(AT_GONE에서 뺌). 맞바꾼 배치에서는 그 칸이 연막 자리라 예전 rush와 같은 판이 되게 old를 먼저 넣는다 */
function asnShadowVar(DEF, GONE, mode) {
  const A = DEF && DEF.assassin; if (!A || !mode || mode === 'swap') return 0; const sk = id => A.skills.find(x => x[0] === id);
  if (mode === 'old' || mode === 'rush') { const am = sk('a_ambush'), ai = sk('a_aim'); for (const k of [2, 3, 4, 5]) [am[k], ai[k]] = [ai[k], am[k]];
    for (const s of A.skills) if (s !== am && s !== ai) s[5] = s[5].map(x => x === 'a_aim' ? 'a_ambush' : x === 'a_ambush' ? 'a_aim' : x);
    const u = A.ups.find(x => x[0] === 'au_smoke'); u[2] = 1; u[3] = 2; u[4] = 'RR'; }
  else throw new Error('ASN_SHADOW_VAR는 swap(기본, 바꾸지 않음) · old · rush: ' + mode);
  if (mode === 'rush') { if (!sk('a_rush')) A.skills.push(['a_rush', '그림자', 2, 4, 'L', ['a_shadow'], 3]); if (GONE && GONE.assassin) { const i = GONE.assassin.indexOf('a_rush'); if (i >= 0) GONE.assassin.splice(i, 1); } }
  return 1;
}
asnShadowVar(E.ATREE_DEF, null, process.env.ASN_SHADOW_VAR);
if (process.env.HUNT_BRIDGE && E.ATREE_DEF && E.ATREE_DEF.hunter) { const u = E.ATREE_DEF.hunter.ups.find(x => x[0] === 'hu_link3'); if (u) u[8].cond.when = 'linkFast'; } // 0.8.0 5단계 측정 변형(원거리 초안 8절 보완 2): tools/dgqa.js와 같이 바꾼다(한 수 앞 계산의 엔진 사본)
const { BUILDS, ROOMS, ITEMS, SCEN } = E;
// 현재 스탯·장비의 기본 피해. 전투 상태·적 보정·추가 피해까지의 최종 예측은 아니다.
function qaSkillBase(p,a){const dm=a?.s?.fx.find(f=>f.k==='dmg');return dm?(E.skillBaseDamage?E.skillBaseDamage(p,a.s,dm.n):dm.n):0;}
function qaWeaponBase(p,a){const n=a.id==='basic'?E.basicBase(p):E.heavyBase(p);return n*(E.weaponStatBonus?1+E.weaponStatBonus(p):1)*(p.eq?.weapon==='hook'?.85:1);}
function qaResource(p,a,f,n){return E.skillResourceDamage&&a?.s?E.skillResourceDamage(p,a.s,f,n):n;}
function qaBurnDamage(p,a,n){const f=a?.s?.fx.find(f=>f.k==='burnOut');return f?f.per*n*(E.dotMul?E.dotMul(p):1):0;}
function qaPoisonBurst(p,a,n){const f=a.s.fx.find(f=>f.k==='burst'),over=a.s.fx.find(f=>f.k==='capOver');n=Math.min(n,(E.psnCapOf?E.psnCapOf(p):E.KW?.poison??Infinity)+(over?.cap||0)); /* 10월 18일 0.8.0 5단계 암살자: 중독 상한은 노드를 읽는다(독의 저장고 24 · 독의 군주 30, 다른 직업은 20 그대로) */const take=f.half?Math.ceil(n/2):f.top?Math.min(f.top,n):n;return (E.poisonTotal(n)-E.poisonTotal(n-take))*(f.mul||1)*(E.triggerDamageMul?E.triggerDamageMul(p):E.dotMul?E.dotMul(p):1);}
function qaWardBonus(f,ward){return E.wardDamageInfo?E.wardDamageInfo(f,ward).bonus:f.per*ward;}
// 수도승의 기본·기 피해만 비교한다. 장비 발동·적의 방어·가로막기는 별도다.
function qaMonkHit(p,a,t){
  const fx=a.s.fx,kb=fx.find(f=>f.k==='kiBurst'),kp=fx.find(f=>f.k==='kiPer');
  const ki=psn2(p,'empower'),cap=E.KW?.empower||5,chilled=!!t&&psn2(t,'chill')>0;
  const before=kb?Math.min(cap,ki+(kb.pre&&chilled?kb.pre:0)):ki;
  const take=kb?Math.min(kb.max||cap,before):0,left=kb?(kb.keep?Math.floor(before*kb.keep):before-take):ki;
  const kh=fx.find(f=>f.k==='kiHits'),hits=(a.s.hits||1)+(kh?Math.min(kh.max||5,Math.floor(ki*(kh.per||1))):0); // M5-2 연환권 · 천수연타
  let damage=qaSkillBase(p,a)*hits;
  if(kb)damage+=qaResource(p,a,kb,take*(kb.per||0)); // 터뜨리기는 첫 타격에만
  if(kb&&kb.mul)damage*=1+kb.mul*take; // M5-2 붕권
  if(kp)damage+=qaResource(p,a,kp,ki*kp.per)*hits;
  {const cb=fx.find(f=>f.k==='mkChillBurst'),ij=fx.find(f=>f.k==='mkIlji');const ch=t?psn2(t,'chill'):0;if(cb)damage+=cb.per*ch;if(ij)damage+=ij.per*ch*ki;} // M5-2 사혈 폭쇄 · 일지멸맥
  const gx=fx.find(f=>f.k==='bigx'),cx=fx.find(f=>f.k==='chillx');
  if(gx&&(t?.elite||t?.strong||t?.role==='boss'))damage*=gx.mul;
  if(cx&&chilled)damage*=cx.mul;
  if(left>0&&a.time>0.6)damage*=1.25; // 빠른 공격에는 강화 배율·기 1 소모 없음
  return {damage,take,before,left};
}

/* 직업 판단 칸 구분 (10월 17일 측정 도구 보완): 직업 전용 판단 칸은 모두 직업(build id)으로 막는다. 스킬 효과(fx)로만 걸던 칸은
   다른 직업의 비슷한 효과에도 걸렸다(4단계 재검증: 해금 1 칸이 마검사 혈인에게 걸림, 24d2a9f). 칸마다 이름표를 남겨(gt) tools/qa-class-gate-check.js가
   어느 직업에서 어떤 칸이 걸렸는지 세고, 칸 주인이 아닌 직업에서 걸리면 실패로 본다. 주인 '*'는 모든 직업용(공통 판단).
   GATE.legacy = true(또는 QA_GATE_LEGACY=1)면 보완 전(24d2a9f) 조건으로 돌아간다: 전후 비교용 */
const GATE = { legacy: !!process.env.QA_GATE_LEGACY, on: null };
function gt(p, owner, name) { if (GATE.on) GATE.on(p.build, owner, name); return true; }
const PRE_PARRY = ['confessor', 'butcher', 'bloodmage', 'elementalist', 'monk']; // 강타 예고 대응을 직업 판단보다 먼저 하는 직업 (10월 8일)

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
  // 장비·표식으로 종류별 최대 충전이 바뀐다. 기본 flaskMax와 비교하면 정상 장비 판을 오류로 잡는다.
  if (['life', 'mana', 'stam'].some(k => { const n = p.flask[k] ?? 0; return !Number.isInteger(n) || n < 0 || n > E.flaskCap(p, k); })) bad('플라스크 범위 밖');
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
const YS_V = +(process.env.YS_V || 1); // 유산 1의 값 (한 수 앞 계산)
/* 10월 15일 유산 1차 시제품: 스킬을 아끼는 값. 예전 쿨타임 × 0.25(긴 쿨타임은 아낀다)를 비용으로 옮겼다(2 → 1, 3 → 1.75, 4 → 2.5). 유산이 가득이면 차례 충전이 넘치므로 아끼지 않는다 */
const ysPen = (b, a, k) => !a.s || !E.skCost ? (a.s ? (a.s.cd || 0) * k : 0) : E.ysNow(b.p) >= (E.ysCapOf ? E.ysCapOf(b.p) : E.YUSAN.cap) ? 0 : (E.skCost(a.s) * 0.75 - 0.5) * k / 0.25;
function evalState(b0, b1, risk) {
  if (b1.over === 'lose') return -1e4;
  if (b1.over === 'win') return 1e4 - (b0.p.hp - b1.p.hp);
  const p0 = b0.p, p1 = b1.p;
  const hpLoss = (p0.hp - p1.hp) / p0.hpMax;
  // 0.6a.2 직업: 적에게 쌓인 중독이 앞으로 줄 피해의 절반을 깎은 체력으로 본다(한 수 앞만 보면 지속 피해를 낮게 보는 편향을 줄인다). 옛 직업 측정은 그대로
  const v2 = E.isV2 && E.isV2(b0.p);
  const eh = bb => E.alive(bb).filter(e => e.role !== 'root' && !LK_OBJ.includes(e.role)).reduce((a, e) => a + Math.max(0, e.hp - (v2 && e.s.poison ? Math.min(e.hp, E.poisonTotal(e.s.poison.stacks) * 0.5) : 0)) / (e.role === 'boss' ? 4 : 1), 0);
  const dealt = eh(b0) - eh(b1);
  const kills = E.alive(b0).length - E.alive(b1).length;
  const flasks = (p0.flask.life + p0.flask.mana + (p0.flask.stam || 0)) - (p1.flask.life + p1.flask.mana + (p1.flask.stam || 0));
  const lowHp = p1.hp / p1.hpMax < 0.25 ? 25 : 0;
  const threat = E.alive(b1).filter(e => e.intent && ['heavy', 'explode', 'burn', 'heal', 'summon'].includes(e.intent.k)).length;
  const roots = E.alive(b1).filter(e => e.role === 'root').length;
  const healers = E.alive(b1).filter(e => e.role === 'healer' || e.role === 'summoner').length;
  const poison = p1.s.poison ? p1.s.poison.stacks : 0;
  const scarKeep = p1.build === 'scar' ? p1.scar * 0.15 : 0;
  const ysV = v2 && E.ysNow ? (E.ysNow(p1) - E.ysNow(p0)) * YS_V : 0; // 10월 15일 유산 1차 시제품: 쓴 유산 · 번 유산(대응 · 차례)의 값. 상한에서 넘친 몫은 값이 없어 가득일 때는 쓰는 편이 낫다
  return dealt * 1.0 + kills * 6 - hpLoss * (40 + 80 * (1 - risk)) - flasks * 7 - lowHp - threat * 1.5 - roots * 3 - healers * 3 - poison * 0.6 + scarKeep + (p1.st - p0.st) * 0.03 + ysV;
}
/* 0.6a.2 수도원장의 요구(심문 · 고해)를 사람처럼 따른다 (10월 4일). lookahead · heuristic가 같이 쓴다(전에는 같은 줄이 두 곳에 있었다) */
function demandPick(b, P, r) {
  const dmd = E.alive(b).find(e => e.demand && e.demand.turn === b.turnIdx); if (!(dmd && r() < (P.mech || 0.5) + 0.1)) return null;
  const L = E.actionList(b), p = b.p;
  if (dmd.demand.k === 'rest') {
    if (p.build === 'bloodmage' && gt(p, 'bloodmage', 'rest')) { const q = bmRest(b, L); if (q) return q; }
    const eo = (GATE.legacy || p.build === 'butcher') && L.find(a => a.v2 && a.ok && buEatOnlyQ(a)); // 숨겨진 직업 1 칸 (보완 전에는 직업을 보지 않았다)
    if (eo && gt(p, 'butcher', 'rest-eat')) return [eo.id, (E.alive(b).filter(e => psn2(e, 'bleed') > 0 && E.canTarget(b, e, eo)).sort((x, y) => psn2(y, 'bleed') - psn2(x, 'bleed'))[0] || {}).id];
    const sb = p.build === 'spellblade' && L.find(a => a.ok && a.v2 && a.self && a.s.kind === 'spell'); if (sb) gt(p, 'spellblade', 'rest-spell');
    const g = sb || cfRest(b, L) || L.find(a => a.id === 'guard' && a.ok) || L.find(a => a.id === 'dodge' && a.ok); if (g) return [g.id, g.id === 'dodge' ? dmd.id : null];
  } else if (!dmd.demand.hit) { const a = L.find(x => x.id === 'basic' && x.ok); if (a && E.canTarget(b, dmd, a)) return ['basic', dmd.id]; }
  return null;
}
/* 10월 18일 0.8.0 5단계 마무리: 한 수 앞 후보가 적에게 준 몫(evalState의 dealt · 처치와 같은 꼴, 중독 덜기는 뺌) */
const LK_OBJ = ['bonfire', 'rampart', 'brick', 'barricade']; // M7-1: 3챕터 물체(체력 9999)는 앞을 내다보는 계산의 적 체력 합에서 뺀다. 무너뜨리면 9999가 사라져 숙련이 물체만 노렸다(수비대장 46% 대 무시 100%)
const lkHp = bb => E.alive(bb).filter(e => e.role !== 'root' && !LK_OBJ.includes(e.role)).reduce((m, e) => m + Math.max(0, e.hp) / (e.role === 'boss' ? 4 : 1), 0);
const lkGain = (b0, b1) => lkHp(b0) - lkHp(b1) + 6 * (E.alive(b0).length - E.alive(b1).length);
/* 10월 18일 0.8.0 5단계 마무리(원거리 초안 11-7): 숙련(한 수 앞)의 사냥꾼. 기본 공격 버프(하늘 가르기 · 바꿔 쏘기 · 덧화살 · 가시)가 켜진 채 가속의 두 번째 차례이거나 유산이 가장 싼 스킬보다 적으면
   (2-10 ①과 같은 때), 공격 스킬 · 강공격은 다음 차례로 미뤄도 거의 같은 몫을 내지만 버프는 이번에만 든다. 두 차례로 보면 "스킬 지금 + 버프 없는 기본 공격 다음"과 "버프 기본 공격 지금 + 스킬 다음"의 차이가
   버프 몫이므로, 미룰 수 있는 후보(적을 쓰러뜨리지 않고 전투를 끝내지 않는 공격 스킬 · 강공격)의 값을 버프 없는 기본 공격의 값까지로 줄인다. 방어 · 흘리기 · 나에게 쓰는 스킬은 그대로 겨룬다.
   전에는 한 수 앞이 지금 피해만 보아, 하늘 가르기를 켠 뒤 두 번째 차례에 겨눠 쏘기 · 연속 사격을 골랐다(버림 185번 가운데 171번). 난수를 더 쓰지 않는다. HUNT_X2_OLD=1이면 예전 */
function huX2Look(b, P, L, cands) {
  const p = b.p, Rn = huRound(b), ys = E.ysNow(p); const minCost = Math.min(99, ...L.filter(a => a.v2 && !a.self).map(a => a.yc || 99));
  if (!(b.extraTurn || ys < minCost)) return;
  const bc = cands.filter(c => c.a === 'basic' && c.t != null); if (!bc.length) return;
  const tg = id => b.en.find(e => e.id === id); if (!bc.some(c => huBasicV(b, p, tg(c.t), Rn).on)) return;
  let ub = -1e9; for (const c of bc) { const c0 = cloneB(b); c0.p.bbuf = null; E.playerAct(c0, 'basic', c.t); ub = Math.max(ub, evalState(b, c0, P.risk)); }
  const kb = Math.max(...bc.map(c => E.alive(b).length - E.alive(c.c).length));
  for (const c of cands) { if (c.a === 'basic' || !c.c || c.c.over === 'win') continue; const a = L.find(x => x.id === c.a); if (!a) continue;
    const dmgS = c.a === 'heavy' || (a.v2 && a.s && !a.self && a.s.fx.some(f => f.k === 'dmg')); if (!dmgS) continue;
    if (E.alive(b).length - E.alive(c.c).length > kb) continue; // 버프 기본 공격으로 못 쓰러뜨리는 적을 쓰러뜨리면 미루지 못한다
    if (c.v > ub) c.v = ub; }
}
function lookahead(b, P, r) {
  { const q = demandPick(b, P, r); if (q) return q; }
  const L = E.actionList(b).filter(a => a.ok && a.id !== 'flee' && a.id !== 'sig' && (!a.pull || ((GATE.legacy || b.p.build === 'bloodmage') && gt(b.p, 'bloodmage', 'pull') && bmPullOk(b, a, P)))); // 숨겨진 직업 3: 피로 당기기는 이유가 있을 때만
  const cands = [];
  for (const a of L) {
    let ts = [null];
    if (!a.self && !a.aoe) { ts = E.alive(b).filter(e => E.canTarget(b, e, a) && !(a.id === 'dodge' && e.role === 'root')); if (b.p.build === 'hunter' && !process.env.HUNT_CROWN_OLD && gt(b.p, 'hunter', 'crown')) { /* 사냥꾼(10월 8일): 열기가 높지 않으면 왕관을 치지 않는다(출처: 비공개 문서 3챕터 2.2–2.3절, 문장은 옮기지 않는다). 한 수 앞 계산은 왕관 피해와 처치를 이득으로 세어 왕관만 쳤다. HUNT_CROWN_OLD=1이면 끈다 */ const nc = ts.filter(e => !(e.role === 'crown' && !e.crownHot)); if (nc.length) ts = nc; } ts = ts.map(e => e.id); }
    const hb = b.p.build === 'hunter' && !process.env.HUNT_BBUF_OLD && a.v2 && a.s && a.s.fx.some(f => f.k === 'bbuf') && gt(b.p, 'hunter', 'bbuf-look') ? huLookBonus(b, a) : 0; // 0.8.0 5단계 연사(2-10): 버프 스킬의 앞으로의 몫
    const boA = b.p.build === 'elementalist' && !process.env.ELEM_BURN_OLD && a.v2 && a.s && a.s.fx.some(f => f.k === 'burnOut') && gt(b.p, 'elementalist', 'burn-look'); // 10월 18일 0.8.0 5단계 마무리(11-6): 불태우기
    for (const t of ts) {
      const c = cloneB(b); E.playerAct(c, a.id, t);
      let v = evalState(b, c, P.risk) + hb;
      if (boA) { const te = t != null ? b.en.find(e => e.id === t) : null; if (!te || !psn2(te, 'ignite')) v -= c.over === 'win' ? 3 : 0.9 * Math.max(0, lkGain(b, c)); } // 화상이 없는 대상에게는 이 스킬이 준 몫(피해 · 처치)의 90%를 뺀다(거의 0). 전투를 끝내는 한 방이면 다른 마무리가 있을 때 그쪽을 고르게 3만 뺀다. 화상이 많을수록 태운 피해가 커서 그 적을 고른다
      cands.push({ a: a.id, t, v: v + (r() - 0.5) * 2, c });
    }
  }
  if (b.p.build === 'hunter' && !process.env.HUNT_X2_OLD && !process.env.HUNT_BBUF_OLD && b.p.bbuf && gt(b.p, 'hunter', 'x2-look')) huX2Look(b, P, L, cands); // 10월 18일 0.8.0 5단계 마무리(11-7): 버프가 켜진 두 번째 차례 · 유산이 모자란 차례
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
const stFx = a => !!(a && a.s && a.s.fx && a.s.fx.some(f => ['poison', 'st', 'bleed', 'ignite'].includes(f.k))); // 상태를 거는 스킬
const enemyAvoid = (e, a) => !a.aoe && (!!e.evading || (!!e.countering && (a.melee || (a.s && a.s.tgt === 'melee'))) || (!!e.mimicOn && !a.self) || (e.foe === 'knight' && e.intent && ['retprep', 'return'].includes(e.intent.k) && stFx(a)) || (e.haze > 0 && !(e.foe === 'dancer' && e.intent && ['charge', 'heavy'].includes(e.intent.k)))); // 3챕터 (10월 7일): 허상을 두른 적은 다른 적이 있으면 두고 친다(칼춤을 모으는 무희는 겹을 걷는다) // 몸 낮추기 · 반격 태세 (10월 4일). 2챕터 (10월 7일): 본뜨는 망령에게는 세게 치지 않고, 되돌리기를 준비하는 기사에게는 상태를 걸지 않는다
const enemyPrio = e => ['bonfire', 'rampart', 'brick', 'barricade'].includes(e.role) ? -1 : /* A3 3챕터 물체는 붕괴로만(dgqa w3Pre) */ (e.role === 'thief' && (e.loot || (e.intent && e.intent.k === 'steal'))) ? 2 : e.lordWall ? 1.2 : e.role === 'crown' ? (e.crownHot ? 1.7 : -1) : e.foe === 'sundial' ? 1.3 : e.stkExp > 0 ? 1.2 : e.role === 'ember' ? 1.1 : e.role === 'mirage' ? 0.9 : e.pile ? (e.pileCol ? 1.8 : e.pile.wait <= 1 ? 0.6 : 0.3) : e.chant ? 1.5 : e.braced ? -1 : 0; // 도둑은 먼저, 영창 중인 화형 사제는 그다음(피해가 쌓이면 끊긴다), 버티는 적은 나중. 2챕터 뼈 더미(10월 7일): 수집가가 있으면 줍기 전에, 곧 일어설 더미는 앞으로(더미는 생명력이 낮아 한 번에 흩어진다). 군주의 뼈벽은 먼저 부순다(벽이 서 있으면 군주가 받는 한 적 피해가 절반)
/* 숨겨진 직업 1 (10월 7일, butcher): 이 효과를 가진 스킬이 끼워졌을 때만 v2Pick의 도살자 판단이 걸린다 */
const buFx = a => !!(a && a.s && a.s.fx.some(e => (e.s === 'bleed' && ['drain', 'exploit', 'grow', 'spread', 'meSt'].includes(e.k)) || e.k === 'grudge' || e.k === 'carry' || (e.k === 'lowx' && e.me) || e.on === 'kill' || (e.k === 'thorn' && e.bleed)));
const buEatOnlyQ = a => !!(a && a.s && a.s.fx.some(e => e.k === 'drain' && e.s === 'bleed' && !e.me) && !a.s.fx.some(e => e.k === 'dmg'));
/* 숨겨진 직업 2 (10월 7일, confessor): 이 효과를 가진 스킬이 끼워졌을 때만 v2Pick의 고해사 판단이 걸린다 */
const CF_BAD = ['bleed', 'ignite', 'weak', 'vuln', 'chill'];
const cfFx = a => !!(a && a.s && a.s.fx.some(e => ['cleanse', 'transfer', 'perDmg', 'dispel'].includes(e.k) || (e.k === 'meSt' && CF_BAD.includes(e.s))));
/* 수도원장의 고해 요구(칼을 거두어라) 차례: 피해 없는 나에게 쓰는 칸(지울 짐이 있는 정화, 고행) → 방어 */
const cfRest = (b, L) => b.p.build === 'confessor' && E.cfTake && gt(b.p, 'confessor', 'rest') ? (L.find(a => a.v2 && a.ok && a.self && a.s.fx.some(e => e.k === 'cleanse' && !e.offer) && E.cfTake(b.p, a.s.fx.find(e => e.k === 'cleanse').only, a.s.fx.find(e => e.k === 'cleanse').n, 'clean', 1).e > 0) || null) : null;
const SB_FX = ['imbue', 'edgeX', 'kwx', 'alt', 'killSpread']; // 마검사 효과 (참고: 마검사 판단은 kind가 있는 스킬이 끼워졌을 때만 걸린다)
const MONK_OLD = !!process.env.MONK_TEST_OLD; // 1이면 10월 10일 단순화 전의 테스터 판단(자세 · ⚡ 공격)을 쓴다
const MONK_FX = ['stance', 'kiBurst', 'kiPer', 'kiGrow', 'sealx', 'kiHits', 'mkChain', 'mkCondense', 'mkAdamant', 'mkFlow', 'mkYeok', 'mkCheon', 'mkIlji', 'mkSamjae', 'mkReflux', 'mkBultoe', 'mkChillBurst', 'mkDrainChill', 'mkCtrPer']; // M5-2 새 효과 키 // 수도승 효과 (v2Pick의 수도승 판단이 이 효과를 가진 스킬이 끼워졌을 때만 걸린다)
/* 숨겨진 직업 3 (10월 7일, 비공개 문서 F4): 피로 당기기는 이유가 있을 때만(끊기 · 무너뜨리기 · 쓰러뜨리기 · 서원 · 값 깎기), 내고 난 생명력 40%(신중 50%) 이상, 값은 최대 생명력 15%(급할 때 25%) 이하.
   다른 직업은 a.pull이 없어 아무것도 바뀌지 않는다 */
const bmFx = a => !!(a && a.s && a.s.fx.some(e => ['hpCost', 'bloodDmg', 'payCut', 'perDmg'].includes(e.k) || (e.k === 'drain' && e.eat) || (e.k === 'spread' && (e.kill || e.s === 'weak'))));
const bmEatQ = a => !!(a && a.s && a.s.fx.some(e => e.k === 'drain' && e.eat));
const bmEatOnlyQ = a => bmEatQ(a) && !a.s.fx.some(e => e.k === 'dmg');
const BM_CHG = ['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn'];
function bmDmg(b, a, e) { // 사람의 어림: 버튼에 보이는 피해 숫자
  const p = b.p, f = a.s ? a.s.fx : []; const F = k => f.find(x => x.k === k); const hits = (a.s && a.s.hits) || 1; const ps = psn2(e, 'poison');
  let v = a.id === 'basic' || a.id === 'heavy' ? qaWeaponBase(p,a) : qaSkillBase(p,a) * hits;
  const dr = f.find(x => x.k === 'drain' && x.eat); if (dr && dr.dmg) v += Math.min(dr.max || 99, ps) * dr.dmg;
  const bd = F('bloodDmg'); if (bd) v += bd.per * Math.min(20, (b.prepTurn === b.turnIdx ? b.paidTurn || 0 : 0) + (a.blood || 0) + (a.hpCost || 0));
  const pd = F('perDmg'); if (pd) v += pd.per * psn2(e, 'weak');
  const big = !!(e.elite || e.strong || e.role === 'boss'); const gx = F('bigx'), bx = F('brokenx'), lx = F('lowx');
  if (gx && big) v *= gx.mul; if (bx && e.s.broken) v *= bx.mul; if (lx && e.hp <= e.hpMax * lx.hp) v *= lx.mul;
  if (p.s.empower) v *= 1.25; if (p.s.weak) v *= 0.75; if (e.braced) v *= 0.5; if (e.vow) v *= 0.6; if (e.evading && !a.aoe) v = 0; if (a.aoe && e.row === 'back') v *= 0.8;
  return v;
}
const qaB0 = () => !!(E.BRK_RULE && E.BRK_RULE.basic0), qaBasicBrk = () => qaB0() ? 0 : 10, qaHeavyBrk = () => 35 * (qaB0() ? E.BRK_RULE.heavyMul : 1); // M5-7 붕괴 규칙
function bmBrk(a, e) { const f = a.s ? a.s.fx : []; let v = a.id === 'basic' ? qaBasicBrk() : a.id === 'heavy' ? qaHeavyBrk() : f.reduce((m, x) => m + (x.k === 'brk' ? x.n : 0), 0); const cx = f.find(x => x.k === 'cutx'); if (cx && e.intent && BM_CHG.includes(e.intent.k)) v += cx.brk; return e.vow ? v * 1.5 : v; }
/* 이 행동(쓸 수 있는 칸 · 당길 칸)이 지금 할 수 있는 급한 일: 영창 끊기 · 모으는 적 무너뜨리기 · 쓰러뜨리기 · 서원 · 희생 */
function bmUrgent(b, a) {
  const ts = E.alive(b).filter(e => e.role !== 'root' && (a.aoe ? (!a.s || a.s.tgt === 'all' || e.row === 'front') : E.canTarget(b, e, a)));
  for (const e of ts) { if (e.pile || e.role === 'candle') continue; const d = bmDmg(b, a, e), k = bmBrk(a, e);
    if (e.chant && d >= (e.chant.need || 0) - (e.chant.taken || 0)) return { why: 'chant', t: e };
    if (e.intent && BM_CHG.includes(e.intent.k) && !e.s.broken && k > 0 && e.brk + k >= e.brkMax) return { why: 'break', t: e };
    if (d >= e.hp && d > 0) return { why: 'kill', t: e };
    if ((e.vow || (e.intent && e.intent.k === 'sacprep')) && k >= 25) return { why: 'vow', t: e }; }
  return null;
}
function bmPullOk(b, a, P) {
  const p = b.p; if (!a.pull) return null; const u = bmUrgent(b, a); const cut = (p.payCut || []).length > 0 && !a.s.start && a.s.fx.some(x => x.k === 'dmg') && (a.blood || 0) <= p.hpMax * 0.08 && p.hp - (a.blood || 0) - (a.hpCost || 0) >= p.hpMax * 0.6; // 값 깎기: 싸게 당길 수 있고 넉넉할 때만
  if (!u && !cut) return null; const urg = !!u; const pay = (a.blood || 0) + (a.hpCost || 0); const after = p.hp - pay;
  if (after < p.hpMax * (P && P.n === '신중' ? 0.5 : 0.4)) return null;
  if (pay > p.hpMax * (urg ? 0.25 : 0.15)) return null;
  if (u && u.why === 'kill' && (u.t.summoned || pay > Math.min(p.hpMax * 0.12, 2 * (E.enemyHitEst ? E.enemyHitEst(b, u.t) : u.t.dmg)))) return null; // 쓰러뜨리기: 그 적이 앞으로 줄 피해보다 비싸게 내지 않는다
  if (u && u.why === 'kill') { const rd = E.actionList(b).filter(x => x.ok && !x.pull && (x.id === 'basic' || (x.v2 && !x.self && x.s.fx.some(f => f.k === 'dmg')))); if (rd.some(x => (x.aoe || E.canTarget(b, u.t, x)) && bmDmg(b, x, u.t) >= u.t.hp)) return null; } // 쓸 수 있는 칸으로 쓰러뜨릴 수 있으면 당기지 않는다
  const pv = E.previewAfter(b, 1); const bigIn = pv.some(x => x.e.intent && (x.e.intent.k === 'heavy' || x.e.intent.aimed || ['burn', 'explode', 'judgment'].includes(x.e.intent.k)));
  if (bigIn && E.incomingEst && after <= E.incomingEst(b).sum * 1.2) return null;
  return u || { why: 'cut', t: null };
}
/* 테스터는 피로 당기기를 규칙으로만 고른다: 다른 판단이 우연히 당긴 칸을 누르지 않게 잠가 둔다(a.bmPull에 남긴다) */
function bmHold(b, L) { if (b.p.build !== 'bloodmage') return L; gt(b.p, 'bloodmage', 'hold'); for (const a of L) if (a.ok && a.pull) { a.ok = false; a.bmPull = 1; a.why = '테스터: 이유 없이 당기지 않음'; } return L; }
/* 고해 요구(칼을 거두어라): 피해 없는 먹기 → 중독 · 약화만 거는 칸 → 나에게 쓰는 칸 (당기지 않는다) */
function bmRest(b, L) {
  const ok = L.filter(a => a.v2 && a.ok && !a.pull && !a.s.fx.some(x => x.k === 'dmg' || (x.k === 'drain' && x.dmg) || x.k === 'bloodDmg' || x.k === 'perDmg'));
  const hpOk = a => b.p.hp - (a.hpCost || 0) >= b.p.hpMax * 0.35;
  const eo = ok.find(a => bmEatOnlyQ(a) && !a.aoe && b.p.hp < b.p.hpMax * 0.85); if (eo) { const t = E.alive(b).filter(e => psn2(e, 'poison') > 0 && E.canTarget(b, e, eo)).sort((x, y) => psn2(y, 'poison') - psn2(x, 'poison'))[0]; if (t) return [eo.id, t.id]; }
  const ps = ok.filter(a => !a.self && !bmEatQ(a) && hpOk(a) && a.s.fx.some(x => x.k === 'poison' || x.k === 'st')).sort((x, y) => ((y.s.fx.find(e => e.k === 'poison') || { n: 0 }).n - (x.s.fx.find(e => e.k === 'poison') || { n: 0 }).n))[0];
  if (ps) { if (ps.aoe) return [ps.id]; const t = E.alive(b).filter(e => e.role !== 'root' && E.canTarget(b, e, ps)).sort((x, y) => (y.role === 'boss') - (x.role === 'boss'))[0]; if (t) return [ps.id, t.id]; }
  const me = ok.find(a => a.self && hpOk(a)); if (me) return [me.id];
  return null;
}
const WARDEN_FX = ['ward', 'wardFill', 'wardBurn', 'thorn', 'pull', 'vulnGrow', 'vulnPer', 'chillx', 'shieldx']; // 파수꾼 효과 (v2Pick의 파수꾼 판단이 이 효과를 가진 스킬에만 걸린다)
/* 0.6a.2 라운드: 이번 차례에(빠른 행동으로) 흘릴 준비를 이미 했는가 (id를 주면 그 적에게). 옛 직업은 늘 false라 next/ 측정은 그대로다 */
const v2Ready = (b, id) => !!(E.isV2 && E.isV2(b.p) && b.p.dodge && b.prepTurn === b.turnIdx && (id == null || b.p.dodge === id));
/* 0.6a.2 원소술사 (10월 7일, docs/직업/원소술사.md F-3절): 쓸 수 있는 칸 × 대상마다 엔진의 열충격 미리 보기(E.elemPreview)로 값을 매겨 가장 큰 것을 고른다.
   긴급 깨기(큰 공격 예고 적을 무너뜨림) > 처치 > 무뎌진 적은 깨지 않기 > 무뎌짐 유지(평소 공격할 적에게 둔화) > 미리 깔기 > 불 모으기. 원소술사에만 걸린다(다른 직업의 측정은 그대로) */
const ELEM_BIGK = ['heavy', 'burn', 'chanting', 'reflect']; const ELEM_SOONK = ['charge', 'chant', 'aim', 'fuse'];
function elemPick(b, P, r, okS, reach, pv1) {
  const p = b.p; const al = E.alive(b).filter(e => e.role !== 'root');
  const urgent = e => !!(e.intent && (ELEM_BIGK.includes(e.intent.k) || (e.intent.k === 'attack' && e.intent.aimed)));
  const soon = e => !!(e.intent && ELEM_SOONK.includes(e.intent.k));
  const nAct = {}; for (const x of pv1) nAct[x.e.id] = x.n;
  const hitter = e => !!(nAct[e.id] && e.intent && e.intent.k === 'attack' && !e.intent.aimed); // 내 다음 차례 전에 나를 평소 공격으로 칠 적 (무뎌짐이 드는 공격)
  const atkN = pv1.filter(x => x.e.intent && ['attack', 'heavy', 'brand', 'constrict', 'hand'].includes(x.e.intent.k)).reduce((m, x) => m + x.n, 0);
  const isBig = e => !!(e.elite || e.strong || e.role === 'boss');
  const prio = e => (e.chant ? 5 : 0) + (['healer', 'summoner', 'pyre'].includes(e.role) ? 3 : 0) + (e.role === 'thief' && (e.loot || (e.intent && e.intent.k === 'steal')) ? 6 : 0) + (e.pile ? -3 : 0) + (e.lordWall ? 2 : 0);
  const fxOf = (a, k) => a.s.fx.find(x => x.k === k);
  const evalOn = (a, e, multi) => {
    const v = E.elemPreview(b, a.s, e, multi); const d0 = fxOf(a, 'dmg'); const bo = fxOf(a, 'burnOut');
    let m = 1; const lx = fxOf(a, 'lowx'), gx = fxOf(a, 'bigx'), bx = fxOf(a, 'brokenx'), cx = fxOf(a, 'chillx');
    if (lx && e.hp <= e.hpMax * lx.hp) m *= lx.mul; if (gx && isBig(e)) m *= gx.mul; if (bx && e.s.broken) m *= bx.mul; if (cx && e.s.chill) m *= cx.mul;
    const shF = fxOf(a, 'elShatter'); const el5 = shF && d0 ? shF.per * (v.shat || 0) * qaSkillBase(p, a) / Math.max(1, d0.n) : 0; // M5-5 빙결 파쇄: 깬 둔화만큼 더한 피해(지능으로 큼)
    const dd = ((d0 ? qaSkillBase(p,a) * (a.s.hits || 1) : 0) + el5 + qaBurnDamage(p,a,v.burn)) * m * (multi ? 0.8 : 1) * (e.evading && !multi ? 0 : 1) * (e.braced ? 0.5 : 1);
    const flat = d0 && (p.pn || []).includes('n_el_student') && !(e.evading && !multi) ? (multi ? 3 / Math.max(1, al.length) : 3) : 0; // 10월 18일 0.8.0 5단계 불의 학도: 스킬 첫 타격 +3(배율 뒤, 모두 치면 첫 대상 하나라 나눠 본다). 남는 울림 +3 · 열충격 배수 노드는 v.d(elemPreview)에 든다
    const tot = dd + flat + (v.shock ? v.d : 0); const kill = tot >= e.hp;
    const cut = a.s.fx.find(x => x.k === 'cutx'); const cutOn = cut && e.intent && (cut.chant ? ['chant', 'chanting', 'burn'] : ['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn']).includes(e.intent.k);
    const brk = a.s.fx.reduce((s0, x) => s0 + (x.k === 'brk' ? x.n : 0), 0) + (cutOn ? cut.brk : 0) + (v.shock ? v.brk : 0) + (bo ? bo.brk * v.burn : 0);
    const breaks = !e.s.broken && e.role !== 'root' && e.brk + brk >= e.brkMax;
    let val = Math.min(tot, e.hp) * (e.role === 'boss' ? 0.7 : 1);
    if (kill) val += 6 + prio(e) * 2;
    if (breaks) val += urgent(e) ? 30 : soon(e) ? 8 : 4; else if (urgent(e) || soon(e)) val += brk * 0.06;
    if (v.shock && v.C0 > 0 && hitter(e) && !kill && !breaks) val -= 4 + e.dmg * 0.3 * Math.min(2, v.C0); // 무뎌진 적은 깨지 않는다
    if (v.frz && !kill) val += isBig(e) ? 3 : nAct[e.id] ? 6 + e.dmg * 0.8 : 3; // M5-5 빙결: 둔화가 가득 차면 다음 행동을 놓친다(강적 · 보스는 붕괴 +40)
    if (!v.shock && !kill) {
      if (v.C > v.C0) val += (hitter(e) ? 1 : nAct[e.id] ? 0.3 : 0.5) * e.dmg * 0.3 * Math.min(2, v.C) + (v.I0 === 0 ? 1 : 0); // 무뎌짐 (평소 공격을 30% 줄인다)
      if (v.I > v.I0) val += (v.I - v.I0) * (isBig(e) ? 1.2 : 0.6); // 화상: 다음 타격 덧피해와 열충격 재료
      if ((soon(e) || urgent(e)) && !v.I0 && !v.C0 && (v.I || v.C)) val += 5; // 큰 공격을 모을 적에게 원소 하나를 미리 깐다
    }
    const wk = a.s.fx.find(x => x.k === 'st' && x.s === 'weak'); if (wk && !kill && (urgent(e) || soon(e))) val += 6; else if (wk && hitter(e) && !kill) val += 2;
    if (bo && !process.env.ELEM_BURN_OLD && gt(p, 'elementalist', 'burn')) { if (!(v.burn > 0)) return val * 0.1; val += v.burn * 0.3; } // 10월 18일 0.8.0 5단계 마무리(원거리 초안 11-6): 불태우기는 대상의 지금 화상으로 값을 매긴다. 화상이 없으면 거의 0, 있으면 화상이 많은 적. ELEM_BURN_OLD=1이면 예전
    return val + prio(e) * 0.5;
  };
  let best = null;
  for (const a of okS) {
    let val = 0, tid = null;
    if (a.self) {
      const rm = fxOf(a, 'rime'); const stam = fxOf(a, 'stam'); const pr = a.s.fx.find(x => x.k === 'st' && x.s === 'protect');
      if (rm) { const cur = p.rime && p.rime[rm.s || 'chill'] ? p.rime[rm.s || 'chill'].times : 0; const use = Math.max(0, Math.min(rm.times, atkN) - cur); val += rm.s === 'ignite' ? use * (pv1.some(x => x.e.s.chill) ? 5 : 1.5) : use * 3.5; }
      if (stam && p.st < 45) val += stam.n * 0.08; if (pr && atkN) val += pr.n * 1.5;
    } else {
      const mp = a.s.fx.find(x => x.k === 'meSt' && x.s === 'protect'); if (mp && atkN) val += mp.n * 1.2;
      if (a.aoe) { for (const e of al) if (a.s.tgt === 'all' || e.row === 'front') val += evalOn(a, e, true); }
      else { let bv = -1e9; for (const e of reach(a)) { const v = evalOn(a, e, false); if (v > bv) { bv = v; tid = e.id; } } if (tid == null) continue; val += bv; }
    }
    val -= ysPen(b, a, 0.25) + (a.time > 1.25 ? 4 : 0); if (a.time <= 0.6 && !b.bonusUsed) val += 2; // 비싼 칸(예전 긴 쿨타임) · 느린 칸은 아끼고, 빠른 칸은 차례를 잇는다
    if (!best || val > best.v) best = { a, t: tid, v: val };
  }
  { const hvA = E.actionList(b).find(x => x.id === 'heavy' && x.ok); if (hvA && p.st >= 60) for (const e of al) if (urgent(e) && !e.s.broken && E.canTarget(b, e, hvA) && e.brk + 35 >= e.brkMax && (!best || best.v < 30)) best = { a: hvA, t: e.id, v: 30 }; } // 집중 주문(붕괴 +35)으로 큰 공격을 끊을 수 있으면 (그 밖에는 스태미나를 방어 · 흘리기에 남긴다)
  const bigNow = al.some(e => urgent(e) && nAct[e.id]);
  if (bigNow && !(best && (best.v >= 28 || best.a.time <= 0.6 || best.a.id === 'heavy'))) { // 큰 공격을 끊지 못하면: 약화(빠른 칸) → 방어(강적 · 보스의 큰 공격은 흘리기가 덜 줄인다) → 흘리기
    const big = al.filter(e => urgent(e) && nAct[e.id]).sort((x, y) => y.dmg - x.dmg)[0];
    const wk = okS.find(a => a.time <= 0.6 && !a.aoe && a.s.fx.some(x => x.k === 'st' && x.s === 'weak') && E.canTarget(b, big, a)); if (wk && !big.s.weak && !b.bonusUsed) return [wk.id, big.id];
    const L2 = E.actionList(b); const g = L2.find(x => x.id === 'guard' && x.ok), d = L2.find(x => x.id === 'dodge' && x.ok);
    if (g && (big.strong || big.role === 'boss' || big.elite || !d)) return ['guard']; if (d) return ['dodge', big.id]; if (g) return ['guard'];
    return null;
  } // 큰 공격을 끊지 못하면 방어 · 흘리기에 차례를 넘긴다(아래 공통 판단)
  return best && best.v > 4 ? [best.a.id, best.t] : null;
}
/* 0.8.0 5단계 측정 도구 보완 2 (10월 17일, docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 10절): 파수꾼 방어 정책.
   전에는 방어가 전투당 0.2–0.7번이라 받아낸 몫 · 다진 의지 · 흔들리는 방패를 잴 수 없었다. 사람이 화면에서 보는 것만 쓴다(예고 아이콘 · 예상 피해 줄 · 보호막 막대).
   막는 때: (가) 내 다음 차례 전에 큰 공격(강타 · 겨눈 한 발)이 오고 그 적이 무너지지 않았으면 WD_DEF.big,
           (나) 예상 피해가 최대 생명력의 WD_DEF.inc 이상이고 지금 보호막이 그 절반보다 적으면 WD_DEF.often.
   막지 않는 때: 스태미나가 방어 값 + 10보다 적음, 남은 적이 하나이고 그 적의 생명력이 15% 이하(끝낼 차례).
   빠른 칸이 비어 있고 쓸 수 있는 빠른 스킬(나에게 쓰는 보호막 · 보호, 또는 공격)이 있으면 그것을 먼저 쓰고 같은 차례에 막는다(mem.wdGuard).
   WD_DEF_OLD=1이면 끈다(보완 전 정책) */
const WD_DEF = { big: 0.85, often: 0.6, inc: 0.15 };
function wdDefend(b, p, L, okS, pv1, hv, r, mem) {
  if (process.env.WD_DEF_OLD) return null;
  const g = L.find(a => a.id === 'guard' && a.ok); if (!g || p.st < E.guardCost(p) + 10) return null;
  if (mem.wdGuard === b.turnIdx) { mem.wdGuard = null; return ['guard']; } // 빠른 칸을 쓴 뒤 같은 차례의 방어
  const al = E.alive(b).filter(e => e.role !== 'root'); if (al.length === 1 && al[0].hp <= al[0].hpMax * 0.15) return null;
  const big = pv1.find(x => x.e.intent && (x.e.intent.k === 'heavy' || x.e.intent.aimed) && !x.e.s.broken);
  const inc = E.incomingEst ? E.incomingEst(b).sum : 0; const ward = p.ward || 0;
  const want = big ? r() < WD_DEF.big : inc >= p.hpMax * WD_DEF.inc && ward < inc * 0.5 && r() < WD_DEF.often; if (!want) return null;
  if (!b.bonusUsed && !(E.noFast && E.noFast(p))) { const fs = okS.filter(a => a.time <= 0.6).sort((x, y) => (y.self ? 1 : 0) - (x.self ? 1 : 0))[0]; if (fs) { mem.wdGuard = b.turnIdx; const t = fs.self || fs.aoe ? null : (E.alive(b).find(e => E.canTarget(b, e, fs)) || {}).id; return [fs.id, t]; } }
  return ['guard'];
}
/* 0.8.0 5단계 (10월 17일, 설계 문서 11절): 신기루 행렬(후열 술사가 허상을 거는 무리) 대응. 사람은 술사와 허상 표시를 보고 술사를 먼저 노리고, 전열이 둘 이상이면 광역을 쓴다.
   숙련(한 수 앞 계산)은 이 판단을 하지 못했다: 같은 전투 시작 상태 · 같은 장착에서 이 판단만 넣으면 숙련 부동 40 → 86%, 철권 85 → 95%(tools/battle-repro.js).
   술사가 살아 있을 때만, 수도승에게만(다른 직업은 재지 않았다). HAZE_OLD=1이면 끈다 */
function hazePick(b) {
  if (process.env.HAZE_OLD || !b.p || b.p.build !== 'monk' || !gt(b.p, 'monk', 'haze')) return null;
  const al = E.alive(b).filter(e => e.role !== 'root'); const mir = al.find(e => e.role === 'mirage'); if (!mir) return null;
  const L = E.actionList(b).filter(a => a.ok && a.v2 && !a.self); const front = al.filter(e => e.row === 'front');
  const rs = L.filter(a => !a.aoe && E.canTarget(b, mir, a)).sort((x, y) => (y.yc || 0) - (x.yc || 0))[0]; if (rs) return [rs.id, mir.id];
  if (front.length >= 2) { const ao = L.filter(a => a.s && a.s.tgt === 'front').sort((x, y) => (y.yc || 0) - (x.yc || 0))[0]; if (ao) return [ao.id, null]; }
  return null;
}
/* 0.8.0 5단계 사냥꾼 연사 판단 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-10, 10월 18일). 버프 스킬이 끼워졌을 때만(v2Pick 사냥꾼 칸).
   ① 기본 공격 값 = 무기 피해 × 켜진 버프(직전에 친 적과 다르면 바꿔 쏘기 ×1.5 · 선회 ×1.3, 덧화살 +50%, 하늘 가르기 ×1.3) + 출혈. 유산이 가장 싼 스킬보다 적거나 가속의 두 번째 차례면 버프가 켜진 기본 공격,
      그 밖에는 그 값으로 공격 스킬의 어림 피해와 겨룬다. ② 바꿔 쏘기 · 선회가 켜져 있으면 대상은 직전에 친 적과 다른 적(같으면 생명력이 낮은 적).
   ③ 가속 라운드 첫 차례에는 시동 스킬(⚡전환 사격 · ▶연속 사격)을 먼저 켜고 두 번째 차례에 쏟는다. ④ 같은 버프가 이미 켜져 있으면 기간이 늘 때만, 유산이 넉넉할 때 다시 건다.
   무리(셋 이상)에서는 기본 공격 대신 아래 광역 판단에 맡긴다(2-4). 난수는 쓰지 않는다 */
function huRound(b) { return b.prepTurn === b.turnIdx ? (b.ysR || 0) : (b.ysR || 0) + 1; } // 이 행동이 들 라운드(차례의 첫 행동이면 +1)
function huBasicV(b, p, t, Rn) {
  const base = qaWeaponBase(p, { id: 'basic' }); const B = p.bbuf || {}; const on = k => B[k] && B[k].until >= Rn ? B[k] : null; const diff = !!t && p.hnLastT != null && t.id !== p.hnLastT;
  let m = 1, x = 0, bl = 0; const sw = on('swap'), ex = on('extra'), bb = on('barb'), sk = on('sky');
  if (sw && diff) { m *= sw.mul; bl += sw.bleed; } if (ex) { x = ex.mul; if (ex.turn && diff) m *= ex.turn; } if (bb) bl += bb.bleed; if (sk) m *= sk.mul;
  return { v: base * m * (1 + x) + bl * 2, base, on: !!(sw || ex || bb || sk) };
}
function huVolley(b, P, r, okS, L, best, reach) {
  const p = b.p, Rn = huRound(b), B = p.bbuf || {}; const on = k => !!(B[k] && B[k].until >= Rn); const ys = E.ysNow(p), cap = E.ysCapOf ? E.ysCapOf(p) : 5;
  const bbOf = a => a && a.v2 && a.s ? a.s.fx.find(f => f.k === 'bbuf') : null; const need = a => { const f = bbOf(a); return !!f && (!on(f.s) || (B[f.s].until < Rn + (f.r || 0) && ys >= cap - 1)); }; // ④ 기간 연장분만
  const al = E.alive(b).filter(e => e.role !== 'root' && !e.pile); const many = al.length >= 3;
  const basic = L.find(a => a.id === 'basic' && a.ok); const fastFree = !b.bonusUsed && !(E.noFast && E.noFast(p));
  const hasteFirst = !b.extraTurn && !!b.queue && b.queue[0] === 'p' && b.queue[1] === 'p'; // ③ 가속 라운드 첫 차례
  const bTgt = () => { if (!basic) return null; const c = reach(basic); const other = c.filter(e => e.id !== p.hnLastT); return (other.length ? other : c).sort((x, y) => x.hp - y.hp)[0] || null; }; // ②
  const tgtOf = a => a.self || a.aoe ? null : (best(a, (x, y) => x.hp - y.hp) || {}).id;
  const sw = okS.find(a => bbOf(a) && bbOf(a).s === 'swap' && a.time <= 0.6);
  // 빠른 칸: 바꿔 쏘기를 켠다(둘 이상 남았고, 이번 차례에 기본 공격이 이어지거나 가속의 두 번째 차례가 있을 때)
  if (fastFree && sw && need(sw) && al.length >= 2 && (basic || hasteFirst)) return [sw.id, tgtOf(sw)];
  const t = bTgt(); const bv = basic && t ? huBasicV(b, p, t, Rn) : null; const bbOn = !!(bv && bv.on);
  const mainS = okS.filter(a => a.time > 0.6); const minCost = Math.min(99, ...okS.filter(a => !a.self).map(a => a.yc || 99));
  if (bbOn && (b.extraTurn || ys < minCost)) return ['basic', t.id]; // ① 유산이 없는 차례 · 두 번째 차례: 버프가 켜진 기본 공격
  if (many && okS.some(a => a.aoe)) return null; // 무리는 광역 판단에
  // 주 행동: 바꿔 쏘기를 이번 라운드에 아직 쓰지 않았고 두 번째 차례가 없으면 지금 쏟는다. 아니면 덧화살 · 가시 · 하늘 가르기를 켠다(③ 가속 라운드 첫 차례에 먼저)
  const swNow = on('swap') && !B.swap.used && B.swap.until === Rn && !hasteFirst;
  if (bbOn && swNow && t.id !== p.hnLastT) return ['basic', t.id];
  for (const k of ['extra', 'barb', 'sky']) { const a = mainS.find(x => bbOf(x) && bbOf(x).s === k); if (a && need(a)) return [a.id, tgtOf(a)]; }
  if (bbOn) { const sv = Math.max(0, ...mainS.filter(a => !a.self && !a.aoe && !bbOf(a) && a.s.fx.some(f => f.k === 'dmg')).map(a => qaSkillBase(p, a) * (a.s.hits || 1) * (E.linkOn && E.linkOn(b, a) ? 1.3 : 1))); if (bv.v >= sv) return ['basic', t.id]; } // ① 기본 공격 값으로 공격 스킬과 겨룬다
  return null;
}
/* 숙련(한 수 앞)의 사냥꾼 연사 몫 (2-10 ③ · ④): 버프 스킬의 값에 앞으로 버프를 받을 기본 공격 몫(게임 점수와 같은 꼴, 실제 무기 피해)을 더한다. 한 수 앞 계산은 다음 차례의 기본 공격을 보지 못한다 */
function huLookBonus(b, a) {
  const p = b.p; if (!a.v2 || !a.s || !E.skBbufV) return 0; const f = a.s.fx.find(x => x.k === 'bbuf'); if (!f) return 0;
  const Rn = huRound(b), B = p.bbuf || {}; const D = qaWeaponBase(p, { id: 'basic' }); const al = E.alive(b).filter(e => e.role !== 'root' && !e.pile);
  if (f.s === 'swap' && al.length < 2) return 0; const cur = B[f.s] && B[f.s].until >= Rn ? B[f.s] : null;
  let v = E.skBbufV(f, D); if (cur) { const ext = Rn + (f.r || 0) - cur.until; v = ext > 0 ? v * Math.min(1, ext / ((f.r || 0) + 1)) : 0; } // ④ 이미 켜져 있으면 늘어난 기간 몫만
  const hasteFirst = !b.extraTurn && !!b.queue && b.queue[0] === 'p' && b.queue[1] === 'p'; if (hasteFirst && E.ysNow(p) >= 2 && (f.s === 'swap' || f.s === 'extra')) v += f.s === 'swap' ? D * (f.mul - 1) + (f.bleed || 0) : D * f.mul; // ③ 두 번째 차례 기본 공격 한 번 몫
  return v;
}
function v2Pick(b, P, r, mem, L, al, hv, ex, aware) {
  const p = b.p; const nf = !!(E.noFast && E.noFast(p)); const okS = L.filter(a => a.v2 && a.ok && !(nf && a.time <= 0.6)); const has = (a, k) => a.s.fx.some(e => e.k === k); // 느린 맥박: 빠른 칸이 없어 빠른 스킬도 차례를 끝내므로 사람처럼 빠른 스킬을 고르지 않는다
  const psn = e => (e.s.poison ? e.s.poison.stacks : 0);
  /* 0.8.0 M5-1 파수꾼 태세(10월 20일): 태세는 전투마다 꺼진 채 시작한다. 켜 둔 태세가 없으면 먼저 켠다(둘 다 있으면 생명력 절반 아래면 수비, 아니면 공격). 난수를 쓰지 않는다 */
  if (p.wdSt && !p.wdSt.def && !p.wdSt.atk) { const st = k => okS.find(a => a.s.fx.some(e => e.k === 'wdStance' && e.s === k)); const d = st('def'), k = st('atk'); const pick = d && k ? (p.hp < p.hpMax * 0.5 ? d : k) : d || k; if (pick) return [pick.id]; }
  // 10월 4일 적 행동: 몸 낮춘 적에게 한 적 공격, 반격 태세인 적에게 근접 한 적 공격은 다른 적이 있으면 하지 않는다. 버티는 적은 뒤로, 훔쳤거나 훔치려는 도둑은 앞으로 (사람은 예고를 보고 고른다)
  const reach = a => { const all = E.alive(b).filter(e => e.role !== 'root' && E.canTarget(b, e, a)); const ok = all.filter(e => !enemyAvoid(e, a)); return ok.length ? ok : all; };
  const huPref = (e, a) => p.build !== 'hunter' || a.aoe || a.self || !p.focus ? 0 : a.s && has(a, 'swapx') ? (e.id !== p.focus.id ? 1 : 0) : (e.id === p.focus.id ? 1 : 0); // 사냥꾼 (10월 5일): 한 적 스킬은 추적이 쌓인 적을 계속, 표적 바꾸기 스킬은 다른 적에게
  const best = (a, f) => reach(a).sort((x, y) => (enemyPrio(y) - enemyPrio(x)) || (huPref(y, a) - huPref(x, a)) || f(x, y))[0];
  const useMech = r() < (P.mech || 0.5);
  // 정화 플라스크: 적이 이번에 상태를 걸 예정이면 미리 막는다
  // 정화 플라스크: 출혈이 이미 쌓여 더 걸리면 아프거나, 폭발 약화가 올 때만(사람은 막을 거리가 클 때 마신다)
  const pv1 = E.previewAfter(b, 1); const bleedIn = pv1.some(x => x.e.intent && x.e.intent.k === 'attack' && x.e.intent.bleed); const boomIn = pv1.some(x => x.e.intent && ['explode', 'burn'].includes(x.e.intent.k));
  if (p.build === 'confessor' && gt(p, 'confessor', 'flask')) { const burnIn = pv1.some(x => x.e.intent && x.e.intent.k === 'burn'); const full = E.cfBurden && E.cfBurden(p) >= 5; if ((burnIn || full || (p.hp < p.hpMax * 0.35 && pv1.some(x => x.e.intent && (x.e.intent.bleed || ['curse', 'heavy', 'burn'].includes(x.e.intent.k))))) && !p.s.block && p.flask.mana > 0 && r() < aware * 0.5) return ['flaskM']; } // 숨겨진 직업 2 (비공개 문서 F-3): 막음은 재료도 막으므로 화형 직전 · 짐 5 · 생명력 35% 미만에만
  else if (((bleedIn && psn2(p, 'bleed') >= 2) || boomIn) && !p.s.block && p.flask.mana > 0 && r() < aware * 0.5 && gt(p, '*', 'flask-cure')) return ['flaskM'];
  // 0.6a.2 사냥꾼 (10월 5일, 흘리기보다 먼저: 사냥꾼은 피하기로 받는다): 예고 대응(피할 수 있는 강타 · 겨눈 한 발은 받아넘기기 · 몸 빼기, 피할 수 없는 화형은 예고 읽기 · 흙먼지 장막), 추적 유지 · 터뜨리기, 표적 바꾸기
  if (p.build === 'hunter' && gt(p, 'hunter', 'main')) {
    // 0.8.0 M5-4 사냥꾼 (10월 20일 설계지 2판): 연계는 빠른 행동. 테스터 리듬(설계지 12): 연계로 빠른 행동 스킬을 쓴 뒤의 주 행동은 유산이 3 미만이면 기본 공격 또는 방어, 리듬 칸 유산 1은 남긴다.
    // HN_LINK_GREEDY=1이면 "매번 둘 다 쓰는" 정책(비교용). 승부수 · 강화 · 결합 칸은 쓸 때가 보이면(사람은 버튼 설명과 예고를 보고 쓴다)
    if (p.hnSt) { const S = p.hnSt, hz = (a, k) => a.s.fx.some(e => e.k === k), fastOk = !b.bonusUsed && !nf, slot = a => fastOk || a.time > 0.6, ys = E.ysNow(p);
      const foes = E.alive(b).filter(e => e.role !== 'root'), bigE = e => !!(e.elite || e.strong || e.role === 'boss'), bigIn = foes.some(bigE);
      const atkN = pv1.filter(x => x.e.intent && ['attack', 'heavy'].includes(x.e.intent.k)).reduce((m, x) => m + x.n, 0); const fe = p.focus && foes.find(e => e.id === p.focus.id); const fn = fe ? p.focus.n : 0;
      { const sh = L.find(x => x.id === 'hn_shot' && x.ok); if (sh) return ['hn_shot', (fe || best(sh, (x, y) => (bigE(y) - bigE(x)) || (x.hp - y.hp)) || {}).id]; } // 만궁 쏘기
      if (E.hnLinkUsed && E.hnLinkUsed(b) > 0 && !process.env.HN_LINK_GREEDY && ys < 3) { // 연계 뒤 주 행동: 유산 3 미만이면 기본 공격 · 방어
        (b.hnRec = b.hnRec || []).push('after');
        if (hv && L.find(a => a.id === 'guard' && a.ok) && r() < 0.7) { b.hnAfter = 'guard'; return ['guard']; }
        const ba = L.find(x => x.id === 'basic' && x.ok); if (ba) { const t0 = fe && E.canTarget(b, fe, ba) ? fe : best(ba, (x, y) => x.hp - y.hp); if (t0) { b.hnAfter = 'basic'; return ['basic', t0.id]; } } }
      { const ult = L.find(a => a.v2 && a.s && a.s.fx.some(e => ['hnDraw', 'hnGale', 'hnTrap'].includes(e.k))); const used = ult && (b.rec || []).some(x => x.k === 'act' && x.a === ult.id);
        if (ult && !used && !ult.ok && bigIn && (ult.wait || 0) <= 2 && (ult.wait || 0) > 0 && r() < 0.75) for (const a of okS.slice()) if (a !== ult && (a.yc || 0) > 1) okS.splice(okS.indexOf(a), 1); } // 큰 적 싸움: 승부수에 유산이 2 이내로 모자라면 비용 칸을 아낀다(리듬 칸 1은 쓴다)
      { const a = okS.find(a => hz(a, 'hnDraw')); if (a && !S.draw && slot(a) && !hv && fe && (bigE(fe) || fe.hp > 40) && fn >= 1) return [a.id]; } // 만궁: 추적한 큰 적
      { const a = okS.find(a => hz(a, 'hnGale')); if (a && !(S.gale > 0) && slot(a) && !hv && p.hp > p.hpMax * 0.45 && (bigIn || foes.length >= 2)) return [a.id]; } // 질풍난사
      { const a = okS.find(a => hz(a, 'hnTrap')); if (a && !S.trap && slot(a) && (hv || atkN >= 2) && p.hp > p.hpMax * 0.3) return [a.id]; } // 혈향의 덫: 나를 칠 적이 있을 때
      const early = b.turnIdx <= 3 || foes.reduce((m, e) => m + e.hp, 0) > foes.reduce((m, e) => m + e.hpMax, 0) * 0.6;
      if (fastOk && early) { const cb = okS.find(a => a.self && a.time <= 0.6 && ((hz(a, 'hnChaseC') && !S.chase) || (hz(a, 'hnScent') && !S.scent) || (hz(a, 'hnFrozen') && !S.frozen) || (hz(a, 'hnWindStep') && !S.windStep))); if (cb) return [cb.id]; } // 전투 내내 가는 칸
      { const a = okS.find(a => hz(a, 'hnWindVeil')); if (a && !(S.veilU >= (b.round || 0)) && slot(a) && (atkN >= 1 || bigIn)) return [a.id]; }
      { const a = okS.find(a => hz(a, 'hnLock')); const B = p.bbuf || {}; if (a && slot(a) && fn >= 1 && !(B.lock && B.lock.until >= (b.ysR || 0)) && L.some(x => x.id === 'basic' && x.ok)) return [a.id]; } // 표적 고정: 추적한 적이 있으면
      { const a = okS.find(a => hz(a, 'hnNock')); if (a && slot(a) && !(S.nock && S.nock.n > 0) && a.time <= 0.6 && L.some(x => x.id === 'basic' && x.ok) && !hv) return [a.id]; } // 화살 재기 · 끝없는 화살 · 순풍(⚡)
      { const a = okS.find(a => a.self && a.s.fx.some(e => e.k === 'bbuf' && e.s === 'barb')); const B = p.bbuf || {}; if (a && slot(a) && a.time <= 0.6 && !(B.barb && B.barb.until >= (b.ysR || 0)) && L.some(x => x.id === 'basic' && x.ok)) return [a.id]; } // 덧화살
      { const cv = okS.find(a => a.self && a.s.fx.some(e => e.k === 'st' && e.s === 'protect')); if (cv && (hv || atkN >= 2) && !(psn2(p, 'protect') > 0) && slot(cv) && r() < 0.7) return [cv.id]; } // 엄폐 · 흙먼지 · 위장
      { const dg = okS.find(a => a.self && hz(a, 'evade') && !hz(a, 'evadeCtr')); if (dg && (hv || (bigIn && atkN >= 1)) && !(p.evade > 0) && slot(dg) && r() < 0.75) return [dg.id]; } // 몸 빼기 · 숨은 사수: 큰 공격이 올 때
      { const ct = okS.find(a => hz(a, 'evadeCtr')); if (ct && atkN >= 1 && !(p.evade > 0) && slot(ct) && r() < 0.7) return [ct.id]; } // 받아넘기기
      { const a = okS.find(a => hz(a, 'hnSky')); if (a && fe && fn >= 3 && E.canTarget(b, fe, a)) return [a.id, fe.id]; } // 하늘 가르기: 추적 3겹
      { const a = okS.find(a => hz(a, 'hnBloodRain')); if (a && foes.filter(e => psn2(e, 'bleed') > 0).length >= Math.min(2, foes.length)) return [a.id]; } // 피의 비: 출혈 걸린 적이 있을 때
      for (const a of okS.filter(a => hz(a, 'focusAdd') && !a.self)) { const t0 = fe && E.canTarget(b, fe, a) ? fe : best(a, (x, y) => (bigE(y) - bigE(x)) || (y.hp - x.hp)); if (t0 && (t0 !== fe || fn < 2) && r() < 0.6) return [a.id, t0.id]; } // 추적 걸기: 오래 버틸 적에게
      { const lf = okS.filter(a => !a.self && a.time > 0.6 && a.time < 1.25 && E.hnLinkFastOk && E.hnLinkFastOk(b, a) && a.s.fx.some(e => e.k === 'dmg')); if (lf.length && ys >= (process.env.HN_LINK_GREEDY ? 0 : 3) && r() < 0.5 + 0.4 * (P.mech || 0.5)) { const a = lf[Math.floor(r() * lf.length)]; const t0 = a.aoe ? null : (fe && E.canTarget(b, fe, a) ? fe : best(a, (x, y) => x.hp - y.hp)); if (a.aoe || t0) return [a.id, t0 && t0.id]; } } // 연계 빠른 행동(유산 3 이상일 때, 리듬 칸 몫을 남긴다)
    }
    const fe = p.focus ? E.alive(b).find(e => e.id === p.focus.id) : null; const fn = fe ? p.focus.n : 0;
    const aimedIn = pv1.find(x => x.e.intent && x.e.intent.aimed); const bigIn = hv || aimedIn; const burnIn = pv1.find(x => x.e.intent && x.e.intent.k === 'burn');
    const atkN = pv1.filter(x => x.e.intent && ['attack', 'heavy'].includes(x.e.intent.k)).reduce((m, x) => m + x.n, 0);
    const tgtOf = a => a.self || a.aoe ? null : (best(a, (x, y) => x.hp - y.hp) || {}).id;
    const firstAtk = pv1.find(x => x.e.intent && ['attack', 'heavy', 'brand'].includes(x.e.intent.k)); const bigFirst = !!(firstAtk && (firstAtk.e.intent.k === 'heavy' || firstAtk.e.intent.aimed)); // 몸 빼기는 다음에 맞는 공격 하나를 피하므로, 큰 공격이 바로 다음일 때만 쓴다
    if (bigFirst && !(p.evade > 0) && r() < Math.max(P.parry, 0.35) + 0.35) { const cs = okS.find(a => a.s.fx.some(e => e.k === 'evadeCtr' && e.charged)) || okS.find(a => a.self && has(a, 'evade') && !a.s.once) || okS.find(a => !a.self && has(a, 'evade')) || okS.find(a => a.self && has(a, 'evade')); if (cs) return [cs.id, tgtOf(cs)]; }
    if (bigIn && !bigFirst && !p.foresee && r() < 0.6) { const fs = okS.find(a => has(a, 'foresee')); if (fs) return [fs.id]; }
    if (burnIn && !p.foresee && r() < 0.75) { const fs = okS.find(a => has(a, 'foresee')) || okS.find(a => a.s.fx.some(e => e.k === 'meSt' && e.s === 'protect')); if (fs) return [fs.id, tgtOf(fs)]; }
    if (atkN >= 3 && !p.s.protect && r() < 0.6) { const vs = okS.find(a => a.s.fx.some(e => e.k === 'meSt' && e.s === 'protect')) || okS.find(a => has(a, 'quickTurns')); if (vs) return [vs.id, tgtOf(vs)]; }
    if (atkN >= 2 && !(p.evade > 0) && r() < 0.5) { const es = okS.find(a => a.self && has(a, 'evade')); if (es) return [es.id]; }
    if (!b.bonusUsed && okS.filter(a => !a.self && a.time >= 1).length >= 2) { const qs = okS.find(a => has(a, 'quick')); if (qs && r() < 0.7) return [qs.id]; }
    { // 기동 오른쪽 (10월 5일): 둔화된 채 모으는 적은 멈춰 세우기, 모으는 적이 둔화돼 있지 않으면 먼저 둔화, 둔화 2 이상이면 얼음 깨기(반쯤), 적이 셋 이상이면 시간 늦추기 · 냉기 번짐, 얼음 감옥은 모으는 적이나 가장 아픈 적에게
      const stopT = e => !!(e.intent && (['charge', 'heavy', 'chant', 'chanting', 'burn', 'aim'].includes(e.intent.k) || e.intent.aimed)); const chOf = e => psn2(e, 'chill');
      const sc = okS.find(a => has(a, 'chillCut')); if (sc) { const t = reach(sc).find(e => chOf(e) > 0 && stopT(e)); if (t) return [sc.id, t.id]; }
      const fz = okS.find(a => has(a, 'freeze')); if (fz) { const t = reach(fz).filter(e => stopT(e) || e.elite || e.strong || e.role === 'boss').sort((x, y) => (stopT(y) - stopT(x)) || (y.dmg - x.dmg))[0]; if (t && r() < 0.8) return [fz.id, t.id]; }
      const chg = E.alive(b).filter(e => stopT(e) && chOf(e) === 0); const one = okS.find(a => !a.aoe && a.s.fx.some(e => e.k === 'st' && e.s === 'chill')); if (chg.length && one) { const t = chg.find(e => E.canTarget(b, e, one)); if (t && r() < 0.7) return [one.id, t.id]; }
      const sh = okS.find(a => has(a, 'chillShatter')); if (sh) { const t = reach(sh).filter(e => chOf(e) >= 2).sort((x, y) => chOf(y) - chOf(x))[0]; if (t && (chOf(t) >= 3 || r() < 0.5)) return [sh.id, t.id]; }
      const many = E.alive(b).filter(e => e.role !== 'root').length >= 3;
      if (many) { const ts = okS.find(a => a.aoe && a.s.fx.some(e => e.k === 'st' && e.s === 'chill')); if (ts && r() < 0.6) return [ts.id]; const spr = okS.find(a => has(a, 'chillSpread')); if (spr) { const t = reach(spr).find(e => chOf(e) >= 1); if (t) return [spr.id, t.id]; } }
    }
    if (!process.env.HUNT_BBUF_OLD && okS.concat(L.filter(a => a.v2)).some(a => a.s && a.s.fx.some(f => f.k === 'bbuf')) && gt(p, 'hunter', 'bbuf')) { const v = huVolley(b, P, r, okS, L, best, reach); if (v) return v; } // 0.8.0 5단계 연사 기본 공격 버프(원거리 초안 2-10): 버프 스킬이 끼워졌을 때만. HUNT_BBUF_OLD=1이면 예전 판단
    { const fc = E.focusCapOf ? E.focusCapOf(p) : 3; for (const a of okS.filter(a => has(a, 'focusBurst'))) if (fe && E.canTarget(b, fe, a) && (fn >= fc || (fn >= fc - 1 && fe.hp < fe.hpMax * 0.35))) return [a.id, fe.id]; } // 0.8.0 5단계: 끝까지 쫓는 자면 4겹까지 (상한 3이면 예전과 같다)
    { const lkOk = a => E.linkOn ? E.linkOn(b, a) || E.soloOn(b, a) : a.s.b !== '시작' && p.lastBr && a.s.b !== p.lastBr; const lk = okS.filter(a => !a.self && lkOk(a) && has(a, 'dmg')).sort((x, y) => (y.s.row || 0) - (x.s.row || 0)); if (lk.length && r() < 0.55 + 0.35 * (P.mech || 0.5)) return [lk[0].id, tgtOf(lk[0])]; } // 연계: 방금과 다른 갈래의 공격 스킬 (사람은 버튼의 🔗를 보고 고른다). 0.8.0 5단계: 게임의 판정(linkOn: 시작 스킬 태그 lb, 외길 사냥꾼이면 같은 갈래 ⇉)
    for (const a of okS.filter(a => has(a, 'focusAdd') && !a.s.start)) { const t = fe && E.canTarget(b, fe, a) ? fe : best(a, (x, y) => y.hp - x.hp); if (t && (t !== fe || fn < 2)) return [a.id, t.id]; }
  }
  { const wd = p.build === 'warden' && gt(p, 'warden', 'defend') ? wdDefend(b, p, L, okS, pv1, hv, r, mem) : null; if (wd) return wd; } // 0.8.0 5단계 측정 도구 보완 2: 파수꾼 방어 정책
  // 10월 15일 유산 1차 시제품: 강타 · 겨눈 한 발이 오고 이번 라운드에 대응 충전이 아직 없으면, 스태미나가 넉넉할 때 방어 · 흘리기를 조금 더 자주 고른다(대응 +1)
  if (E.ysNow && !nf) { const big = pv1.find(x => x.e.intent && (x.e.intent.k === 'heavy' || x.e.intent.aimed)); const rNow = b.prepTurn === b.turnIdx ? (b.ysR || 0) : (b.ysR || 0) + 1;
    if (big && b.ysRespR !== rNow && !v2Ready(b, big.e.id) && E.ysNow(p) <= (E.ysCapOf ? E.ysCapOf(p) : E.YUSAN.cap) - 2 && r() < 0.25 + 0.25 * (P.mech || 0.5) && gt(p, '*', 'ys-resp')) { const d = L.find(a => a.id === 'dodge' && a.ok), g = L.find(a => a.id === 'guard' && a.ok);
      if (d && p.st >= E.dodgeCost(p) + 20 && !(big.e.strong || big.e.role === 'boss')) return ['dodge', big.e.id]; if (g && p.st >= E.guardCost(p) + 20) return ['guard']; } }
  // 10월 8일: 강타 예고 대응을 직업 판단보다 먼저 (고해사 · 해금 1 · 해금 3 · 원소술사 · 수도승). 전에는 이 직업들의 판단이 먼저 행동을 돌려줘 예고된 큰 공격을 흘리지도 막지도 않았다(1챕터 보스전 받은 큰 공격 96–338, 다른 직업 63–87). 사람은 예고를 보고 대응한다
  if (hv && PRE_PARRY.includes(p.build) && !v2Ready(b, hv.e.id) && r() < Math.max(P.parry, 0.35) + 0.2 && gt(p, PRE_PARRY, 'pre-parry')) {
    const ps = okS.find(a => has(a, 'parry')); if (ps) return [ps.id, hv.e.id];
    const pb = okS.find(a => has(a, 'parryBuff') && (p.build !== 'assassin' || a.time <= 0.6)); if (pb && !p.pbuf && E.dodgeCost(p) <= p.st) return [pb.id]; // M5-3 암살자: 주 행동인 흘리기 준비(칼끝 겨누기)는 강타 앞에서 고르지 않는다(쓰면 차례가 끝나 흘리지 못한다)
    if (L.find(a => a.id === 'dodge' && a.ok) && r() < P.parry + 0.3) return ['dodge', hv.e.id];
  }
  // 숨겨진 직업 2 (10월 7일, 비공개 문서 F-3 4): 짐(적이 건 몫)을 옮길까 · 지울까 · 안고 칠까, 앞서 지운 숫자, 보호 비례, 고행. 이 직업의 효과를 가진 스킬이 끼워졌을 때만
  if (p.build === 'confessor' && E.cfTake && L.some(a => a.v2 && cfFx(a)) && gt(p, 'confessor', 'main')) {
    const C = E.CONF, F = (a, k) => a.s.fx.find(e => e.k === k), hpf = p.hp / p.hpMax, fastFree = !b.bonusUsed && !nf;
    const take = (only, n, mode) => E.cfTake(p, only, n, mode, 1); const en = k => take([k], 5, 'xfer').c; const enAll = take(null, 5, 'xfer').c; const burden = E.cfBurden(p);
    const big = e => !!(e.elite || e.strong || e.role === 'boss'); const chg = e => !!(e.intent && (['charge', 'heavy', 'chant', 'chanting', 'burn', 'aim', 'fuse'].includes(e.intent.k) || e.intent.aimed));
    const bigIn = !!(hv || pv1.some(x => x.e.intent && (x.e.intent.aimed || ['burn', 'explode'].includes(x.e.intent.k)))); const bigSoon = bigIn || E.alive(b).some(chg);
    const hitters = pv1.filter(x => x.e.intent && ['attack', 'heavy', 'brand', 'burn', 'explode', 'hand'].includes(x.e.intent.k)).map(x => x.e);
    const mover = e => e.role !== 'candle' && e.role !== 'bonewall' && !e.pile;
    const cleanE = a => { const c = F(a, 'cleanse'); return c && !c.offer && !c.after ? take(c.only, c.n, 'clean').e : 0; };
    const ret = (a, t) => a.self || a.aoe ? [a.id] : t ? [a.id, t.id] : null;
    // 고행: 짐 < 2(짐 비례 칸은 빼고), 큰 공격 예고 없음, 생명력 45%(촛불 방 · 적 여럿이 칠 때 60%) 이상일 때만. 취약 고행은 모으는 적이 없을 때만
    { const many = hitters.length >= 2 || (b.ctx.mods || []).includes('candle'); for (const a of okS.slice()) { const ms = a.s.fx.filter(e => e.k === 'meSt' && CF_BAD.includes(e.s)); if (!ms.length) continue;
      const okUse = !bigIn && hpf >= (many ? 0.6 : 0.45) && (burden < 2 || (F(a, 'perDmg') && F(a, 'perDmg').of === 'burden')) && !(ms.some(e => e.s === 'vuln') && bigSoon) && !(a.self && !okS.some(o => o !== a && !o.self && F(o, 'perDmg') && ['burden', 'clean'].includes(F(o, 'perDmg').of)));
      if (!okUse) okS.splice(okS.indexOf(a), 1); } }
    // 보호를 쓰는 칸: 큰 공격이 곧 오면 지닌 보호를 쓰지 않는다 (보호가 없으면 그냥 친다)
    for (const a of okS.slice()) { const pd = F(a, 'perDmg'); if (pd && pd.of === 'prot' && pd.spend && psn2(p, 'protect') >= 1 && bigSoon) okS.splice(okS.indexOf(a), 1); }
    // 지울 적의 몫이 없으면 정화만 하는 칸은 쓰지 않는다 (고행 몫을 지워도 보호가 없다)
    for (const a of okS.slice()) if (a.self && F(a, 'cleanse') && !F(a, 'cleanse').offer && !F(a, 'meSt') && cleanE(a) === 0 && !(F(a, 'stam') && p.st < 40)) okS.splice(okS.indexOf(a), 1);
    // 벗기기: 강화를 가진 적이 곧 때리면 그 적에게
    { const ds = okS.filter(a => F(a, 'dispel')); for (const a of ds) { if (a.aoe) { if (E.alive(b).some(e => psn2(e, 'empower') > 0)) return [a.id]; continue; } const t = reach(a).filter(e => psn2(e, 'empower') > 0).sort((x, y) => (hitters.includes(y) - hitters.includes(x)) || (psn2(y, 'empower') - psn2(x, 'empower')))[0]; if (t && (hitters.includes(t) || psn2(t, 'empower') >= 2)) return [a.id, t.id]; } }
    // 큰 공격 예고: 약화가 있으면 그 공격자에게 옮긴다(끊기 칸 먼저). 아니면 적이 건 짐을 지워 보호 (취약 2 이상이면 고행 몫이라도 지운다)
    if (bigIn) { const src = (hv && hv.e) || (pv1.find(x => x.e.intent && (x.e.intent.aimed || ['burn', 'explode'].includes(x.e.intent.k))) || {}).e;
      if (src && en('weak') > 0) { const wt = okS.filter(a => !a.self && F(a, 'transfer') && (!F(a, 'transfer').only || F(a, 'transfer').only.includes('weak')) && E.canTarget(b, src, a)).sort((x, y) => (!!F(y, 'cutx') - !!F(x, 'cutx')) || (x.time - y.time)); if (wt.length) return wt[0].aoe ? [wt[0].id] : [wt[0].id, src.id]; }
      const cs = okS.filter(a => cleanE(a) > 0 || (psn2(p, 'vuln') >= 2 && F(a, 'cleanse') && !F(a, 'cleanse').offer && !F(a, 'cleanse').after && (!F(a, 'cleanse').only || F(a, 'cleanse').only.includes('vuln')))).sort((x, y) => (x.time - y.time) || (cleanE(y) - cleanE(x)));
      for (const a of cs) { if (a.time > 0.6 && !fastFree && a.time >= 1.25) continue; const t = a.self || a.aoe ? null : (chg(src) && E.canTarget(b, src, a) ? src : best(a, (x, y) => x.hp - y.hp)); const v = ret(a, t); if (v) return v; } }
    // 차례 순서: 주 행동에 "앞서 지운 숫자" 칸을 쓸 차례면 빠른 칸에서 먼저 정화 · 사함, 이미 지웠으면 그 칸
    { const ct = okS.filter(a => F(a, 'perDmg') && F(a, 'perDmg').of === 'clean');
      if (ct.length && (b.cleanTurn || 0) >= 2) { const a = ct.sort((x, y) => (y.s.row || 0) - (x.s.row || 0))[0]; const t = best(a, (x, y) => (big(y) - big(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; }
      if (ct.length && fastFree) { const fc = okS.filter(a => a.time <= 0.6 && ((cleanE(a) >= 2) || (F(a, 'cleanse') && F(a, 'cleanse').offer && take(F(a, 'cleanse').only, F(a, 'cleanse').n, 'clean').e >= 2))).sort((x, y) => cleanE(y) - cleanE(x))[0]; if (fc) { const v = ret(fc, best(fc, (x, y) => x.hp - y.hp)); if (v) return v; } } }
    // 보호 비례: 보호 2 이상이면 (쓰는 칸은 큰 공격 예고가 없을 때만, 붕괴 칸은 모으는 적에게)
    if (psn2(p, 'protect') >= 2) { const ps = okS.filter(a => F(a, 'perDmg') && F(a, 'perDmg').of === 'prot' && !(F(a, 'perDmg').spend && bigSoon && psn2(p, 'protect') < 4)).sort((x, y) => (y.s.row || 0) - (x.s.row || 0));
      for (const a of ps) { const t = a.aoe ? null : F(a, 'perDmg').brk ? (reach(a).filter(chg).sort((x, y) => y.brk / y.brkMax - x.brk / x.brkMax)[0] || best(a, (x, y) => (big(y) - big(x)) || (y.hp - x.hp))) : best(a, (x, y) => x.hp - y.hp); if (a.aoe && reach(a).length < 2) continue; const v = ret(a, t); if (v) return v; } }
    // 짐 쓰기 (적이 건 몫): 약화 → 옮기기(다음에 때릴 적), 취약 → 취약 비례 표적 · 짐 비례로 안기 · 지우기, 출혈 → 빠른 적 · 사수에게, 화상 → 오래 칠 적에게, 둘 이상이면 모두 옮기기
    const xf = (k, tsort) => { for (const a of okS.filter(a => F(a, 'transfer') && (F(a, 'transfer').only ? F(a, 'transfer').only.includes(k) : enAll >= 2))) { if (a.aoe) { if (reach(a).filter(mover).length >= 1) return [a.id]; continue; } const t = reach(a).filter(mover).sort(tsort)[0]; if (t) return [a.id, t.id]; } return null; };
    const hitFirst = (x, y) => (hitters.includes(y) - hitters.includes(x)) || (chg(y) - chg(x)) || (big(y) - big(x)) || (y.dmg - x.dmg);
    const longFirst = (x, y) => (big(y) - big(x)) || (y.hp - x.hp);
    if (en('weak') > 0) { const v = xf('weak', hitFirst); if (v) return v; }
    if (en('vuln') > 0) { const v = xf('vuln', longFirst); if (v) return v; }
    if (en('bleed') > 0) { const v = xf('bleed', (x, y) => ((y.role === 'archer') - (x.role === 'archer')) || (y.spd - x.spd) || longFirst(x, y)); if (v) return v; }
    if (en('ignite') > 0) { const v = xf('ignite', longFirst); if (v) return v; }
    if (enAll >= 2) { const v = xf('chill', hitFirst); if (v) return v; }
    // 대상 비례: 대상의 약화 · 출혈 · 해로운 상태 · 취약이 쌓였으면
    for (const a of okS.filter(a => (F(a, 'perDmg') && ['weak', 'bleed', 'tbad'].includes(F(a, 'perDmg').of)) || F(a, 'vulnPer'))) { const of = F(a, 'perDmg') ? F(a, 'perDmg').of : 'vuln'; const X = e => of === 'tbad' ? CF_BAD.reduce((m, k) => m + psn2(e, k), 0) : psn2(e, of); const t = best(a, (x, y) => X(y) - X(x)); if (t && X(t) >= 2) return [a.id, t.id]; }
    // 사함: 짐 2 이상 (붕괴 칸은 모으는 적에게)
    if (burden >= 2) for (const a of okS.filter(a => F(a, 'cleanse') && F(a, 'cleanse').offer && take(F(a, 'cleanse').only, F(a, 'cleanse').n, 'clean').c >= 2)) { if (a.aoe) { if (reach(a).length >= 2) return [a.id]; continue; } const t = F(a, 'cleanse').brk ? (reach(a).filter(chg)[0] || best(a, (x, y) => (big(y) - big(x)) || (y.hp - x.hp))) : best(a, (x, y) => (big(y) - big(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; }
    // 짐 비례: 짐 2 이상 (붕괴 칸은 모으는 적, 후열 칸은 후열 치유 · 소환)
    if (burden >= 2) for (const a of okS.filter(a => F(a, 'perDmg') && F(a, 'perDmg').of === 'burden').sort((x, y) => (y.s.row || 0) - (x.s.row || 0))) { if (a.aoe) { if (reach(a).length >= 2) return [a.id]; continue; } const t = F(a, 'brk') && F(a, 'brk').n >= 25 ? (reach(a).filter(chg)[0] || best(a, (x, y) => (big(y) - big(x)) || (x.hp - y.hp))) : a.s.tgt === 'ranged' ? (reach(a).filter(e => ['healer', 'summoner'].includes(e.role))[0] || best(a, (x, y) => x.hp - y.hp)) : best(a, (x, y) => (big(y) - big(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; }
    // 적이 건 짐이 남았으면 지운다 (정화 칸 가운데 지우는 몫이 큰 것, 생명력이 낮으면 회복 칸)
    if (enAll >= 1) { const cs = okS.filter(a => cleanE(a) > 0).sort((x, y) => ((hpf < 0.6 ? (F(y, 'cleanse').heal || 0) - (F(x, 'cleanse').heal || 0) : 0)) || (cleanE(y) - cleanE(x)) || (x.time - y.time)); for (const a of cs) { if (a.self && enAll < 2 && hpf > 0.6) continue; const v = ret(a, best(a, (x, y) => x.hp - y.hp)); if (v) return v; } }
    // 고행 (위에서 거른 칸만 남아 있다): 짐이 적을 때 짐을 진다
    if (burden < 2) for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'meSt' && CF_BAD.includes(e.s)))) { const v = ret(a, best(a, (x, y) => (big(y) - big(x)) || (x.hp - y.hp))); if (v) return v; }
  }
  // 숨겨진 직업 1 (10월 7일, 비공개 문서 F4): 흡혈 표적 · 먹기 · 받은 피해 · 처치 · 나에게 출혈. 이 직업의 효과를 가진 스킬이 끼워졌을 때만
  if ((GATE.legacy ? p.build !== 'spellblade' : p.build === 'butcher') && L.some(a => a.v2 && buFx(a)) && gt(p, 'butcher', 'main')) { // 10월 17일 측정 도구 보완: 해금 1에게만(보완 전에는 마검사만 뺐다: 효과가 비슷한 다른 직업에 걸릴 수 있었다). 10월 17일 0.8.0 4단계 재검증: 마검사 혈인의 혈향(출혈 이용) · 혈풍참(처치 시)도 이 효과에 걸려, 신중 · 대충 성향 혈인이 마검사 판단(교대 · 유산) 대신 이 칸으로 골랐다(3챕터 시작 신중 완주 2/60 → 고친 뒤 26/60). 마검사는 아래 자기 칸이 맡는다
    const hpf = p.hp / p.hpMax, bl = e => psn2(e, 'bleed'), big = e => !!(e.elite || e.strong || e.role === 'boss'); const F = (a, k) => a.s.fx.find(e => e.k === k);
    const thirst = 1 + Math.min(0.18, 0.03 * Math.max(0, Math.floor((1 - hpf) * 10 + 1e-9))); const grN = b.prepTurn === b.turnIdx ? (p.grudge || 0) : Math.min(p.tookAcc || 0, p.hpMax * 0.3);
    const room = Math.max(0, p.hpMax - p.hp); const eatLeft = Math.max(0, p.hpMax * 0.4 - (b.eatGot || 0));
    const dmgOf = (a, e) => { let v = qaSkillBase(p,a); const ex = a.s.fx.find(x => x.k === 'exploit' && x.s === 'bleed'); if (ex) v += ex.per * (ex.me ? Math.min(ex.max || 10, bl(p)) : bl(e)); const g = F(a, 'grudge'); if (g) v += Math.min(g.max || 99, g.per * grN); const md = a.s.fx.find(x => x.k === 'drain' && x.me && x.dmg); if (md) v += Math.min(md.max || 10, bl(p)) * md.dmg;
      const lx = F(a, 'lowx'); if (lx && (lx.me ? hpf <= lx.hp : e.hp <= e.hpMax * lx.hp)) v *= lx.mul; const gx = F(a, 'bigx'); if (gx && big(e)) v *= gx.mul; return v * (a.s.hits || 1) * thirst * (p.s.weak ? 0.75 : 1) * (p.s.empower ? 1.25 : 1); };
    const bigIn = !!(hv || pv1.some(x => x.e.intent && (x.e.intent.aimed || ['burn', 'explode'].includes(x.e.intent.k))));
    const atkN = pv1.filter(x => x.e.intent && ['attack', 'heavy', 'brand'].includes(x.e.intent.k)).reduce((m, x) => m + x.n, 0);
    const longT = (a, n) => reach(a).filter(e => e.role !== 'candle' && !e.pile && !(e.stun > 0) && !e.s.broken && e.hp > n * (n + 1) / 2).sort((x, y) => (enemyPrio(y) - enemyPrio(x)) || (big(y) - big(x)) || (y.hp - x.hp))[0]; // 출혈을 걸 적: 오래 살고 자주 움직일 적
    // 나에게 출혈: 쓴 뒤 생명력 25% 이상이 남고 큰 공격 예고가 없을 때만 (아니면 이번 차례 후보에서 뺀다)
    for (const a of okS.slice()) { const ms = a.s.fx.find(e => e.k === 'meSt' && e.s === 'bleed'); if (!ms) continue; const tot = (bl(p) + ms.n) * (bl(p) + ms.n + 1) / 2; if (hpf - tot / p.hpMax < 0.25 || bigIn) okS.splice(okS.indexOf(a), 1); }
    // 강타 앞에서 생명력이 낮으면 덜 막는 흘리기 대신 방어
    if (hv && hpf < 0.4 && L.find(a => a.id === 'guard' && a.ok) && r() < 0.7) return ['guard'];
    // 처치: 이번 공격으로 쓰러뜨릴 수 있는 적 (빠른 칸 먼저, 🔄 · 튀기기 · 다시 쓰기)
    { const ks = okS.filter(a => !a.self && (a.s.killRecharge || a.s.fx.some(e => e.on === 'kill' || (e.k === 'lowx' && !e.me) || (e.k === 'spread' && e.kill) || e.k === 'carry'))).sort((x, y) => (x.time - y.time) || ((y.s.row || 0) - (x.s.row || 0)));
      for (const a of ks) { if (a.aoe) { if (reach(a).some(e => dmgOf(a, e) >= e.hp)) return [a.id]; continue; }
        const t = reach(a).filter(e => dmgOf(a, e) >= e.hp && (!a.s.fx.some(x => x.k === 'spread') || (bl(e) >= 3 && E.alive(b).filter(o => o.role !== 'root').length >= 2))).sort((x, y) => (enemyPrio(y) - enemyPrio(x)) || (y.hp - x.hp))[0];
        if (t) return [a.id, t.id];
        if (F(a, 'carry')) { const t2 = reach(a).filter(e => dmgOf(a, e) * 2 / 3 >= e.hp).sort((x, y) => x.hp - y.hp)[0]; if (t2 && reach(a).length >= 2) return [a.id, t2.id]; } } }
    // 먹기: 쓰러질 적의 피를 거두기 · 생명력이 낮을 때 · 큰 공격 앞 (생명력이 넉넉하면 피해 없는 먹기는 쓰지 않는다)
    for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'drain' && e.s === 'bleed' && !e.me && !e.kill))) {
      const dr = a.s.fx.find(e => e.k === 'drain' && e.s === 'bleed'); const eo = buEatOnlyQ(a); if (eo && hpf >= 0.85) continue;
      const t = a.aoe ? null : reach(a).filter(e => bl(e) > 0).sort((x, y) => bl(y) - bl(x))[0]; const n0 = a.aoe ? Math.max(0, ...reach(a).map(bl)) : t ? bl(t) : 0; if (n0 <= 0) continue;
      const n = dr.max ? Math.min(dr.max, n0) : dr.half ? Math.ceil(n0 / 2) : n0; const heal = n * dr.per; const okRoom = Math.min(room, eatLeft) >= heal * 0.7;
      const kill = t && !eo && dmgOf(a, t) >= t.hp; const low = hpf <= ((dr.half || dr.keep) ? 0.7 : 0.6) && n0 >= (eo ? 3 : 4) && okRoom; const brace = bigIn && okRoom && hpf < 0.75;
      if (kill || low || brace) return a.aoe ? [a.id] : [a.id, t.id];
    }
    // 맞기 전 준비: 내 다음 차례 전에 직접 공격이 두 번 이상 오면
    if (atkN >= 2 && !p.thorn) { const ts = okS.find(a => a.self && a.s.fx.some(e => e.k === 'thorn' && e.bleed)); if (ts && r() < 0.8) return [ts.id]; }
    if (!hv) { // 강타 예고가 있으면 아래 공통 판단(흘리기 · 방어)에 맡긴다
    // 받은 피해: 크게 맞은 다음 차례
    for (const a of okS.filter(a => F(a, 'grudge'))) { const g = F(a, 'grudge'); if (grN > 0 && g.per * grN >= (g.max || 20) * 0.6) { if (a.aoe) return [a.id]; const t = best(a, (x, y) => (bl(y) - bl(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; } }
    // 내 생명력 조건: 맞으면 먼저
    for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'lowx' && e.me))) { const lx = F(a, 'lowx'); if (hpf <= lx.hp) { const t = best(a, (x, y) => (bl(y) - bl(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; } }
    // 이용 · 키우기: 대상 출혈 4 이상이면 이용, 키우기는 출혈 2~6에서
    for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'exploit' && e.s === 'bleed' && !e.me))) { if (a.aoe) { if (reach(a).filter(e => bl(e) >= 2).length >= 2) return [a.id]; continue; } const t = best(a, (x, y) => bl(y) - bl(x)); if (t && bl(t) >= 4) return [a.id, t.id]; }
    for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'grow' && e.s === 'bleed'))) { const t = best(a, (x, y) => bl(y) - bl(x)); if (t && bl(t) >= 2 && bl(t) <= 6 && t.hp > 20) return [a.id, t.id]; }
    // 내 출혈 이용: 내 출혈이 3 이상이면
    for (const a of okS.filter(a => a.s.fx.some(e => (e.k === 'exploit' && e.me) || (e.k === 'drain' && e.me)))) if (bl(p) >= 3) { const t = best(a, (x, y) => (bl(y) - bl(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; }
    // 출혈 걸기: 오래 살 적에게 (촛불 · 뼈 더미 · 곧 쓰러질 적은 빼고)
    for (const a of okS.filter(a => !a.self && a.s.fx.some(e => e.k === 'st' && e.s === 'bleed') && !a.s.fx.some(e => e.k === 'drain'))) { const n = a.s.fx.find(e => e.k === 'st' && e.s === 'bleed').n; if (a.aoe) { if (reach(a).filter(e => e.role !== 'candle').length >= 2) return [a.id]; continue; } const t = longT(a, n); if (t && bl(t) < 8) return [a.id, t.id]; }
    // 그 밖의 근접 공격은 출혈이 가장 많은 적에게 (흡혈)
    { const rest = okS.filter(a => !a.self && !has(a, 'parry') && !buEatOnlyQ(a) && !a.s.fx.some(e => e.k === 'drain' && e.s === 'bleed')); if (rest.length) { const a = rest.sort((x, y) => (y.s.row || 0) - (x.s.row || 0))[0]; if (a.aoe) { if (reach(a).length >= 2) return [a.id]; } else { const t = best(a, (x, y) => (bl(y) - bl(x)) || (x.hp - y.hp)); if (t) return [a.id, t.id]; } } }
    // 남은 행동이 기본 공격이면 출혈된 적을 친다 (흡혈)
    if (!okS.some(a => !a.self && !has(a, 'parry'))) { const t = best({ id: 'basic', melee: 1 }, (x, y) => (bl(y) - bl(x)) || (x.hp - y.hp)); if (t && bl(t) > 0 && r() < 0.8) return ['basic', t.id]; }
    }
  }
  // 숨겨진 직업 3 (10월 7일, 비공개 문서 F4): 피로 당기기(낼까) · 먹기(거둘까) · 옮기기 · 쓰러뜨리면 번짐 · 표식 · 약화 · 생명력 내기 · 값 깎기. 이 직업의 효과를 가진 스킬이 끼워졌을 때만
  if (p.build === 'bloodmage' && !process.env.BM_OFF && L.some(a => a.v2 && bmFx(a)) && gt(p, 'bloodmage', 'main')) {
    const hpf = p.hp / p.hpMax, ps = e => psn2(e, 'poison'), F = (a, k) => a.s.fx.find(e => e.k === k), big = e => !!(e.elite || e.strong || e.role === 'boss');
    const bigIn = !!(hv || pv1.some(x => x.e.intent && (x.e.intent.aimed || ['burn', 'explode'].includes(x.e.intent.k))));
    const foes = E.alive(b).filter(e => e.role !== 'root' && !e.pile);
    const atkOk = a => !a.self && !bmEatOnlyQ(a);
    // 생명력을 내는 칸: 내고 난 생명력 35% 아래면 이번 차례 후보에서 뺀다 (급한 일이면 남긴다)
    for (const a of okS.slice()) if ((a.hpCost || 0) > 0 && p.hp - a.hpCost < p.hpMax * 0.35 && !bmUrgent(b, a)) okS.splice(okS.indexOf(a), 1);
    // 1) 급한 일(영창 끊기 · 모으는 적 무너뜨리기 · 쓰러뜨리기 · 서원): 쓸 수 있는 칸이 먼저, 없으면 이유가 맞을 때만 피로 당긴다
    { const rd = okS.filter(a => atkOk(a)).map(a => ({ a, u: bmUrgent(b, a) })).filter(x => x.u && x.u.why !== 'kill').sort((x, y) => (x.a.time - y.a.time));
      if (rd.length && r() < 0.85) { const x = rd[0]; return x.a.aoe ? [x.a.id] : [x.a.id, x.u.t.id]; }
      const killRd = e => okS.some(a => atkOk(a) && (a.aoe ? (a.s.tgt === 'all' || e.row === 'front') : E.canTarget(b, e, a)) && bmDmg(b, a, e) >= e.hp) || (E.canTarget(b, e, { id: 'basic', ranged: 1 }) && bmDmg(b, { id: 'basic' }, e) >= e.hp);
      const pl = L.filter(a => a.bmPull).map(a => ({ a, u: bmPullOk(b, a, P) })).filter(x => x.u && !(x.u.why === 'kill' && killRd(x.u.t))).sort((x, y) => ((x.u.why === 'cut') - (y.u.why === 'cut')) || ((x.a.blood || 0) - (y.a.blood || 0)));
      if (pl.length && r() < 0.85) { const x = pl[0]; const t = x.u.t || (x.a.aoe || x.a.self ? null : best(x.a, (m, n) => m.hp - n.hp)); b.rec.push({ k: 'bmq', why: x.u.why, id: x.a.id, cost: x.a.blood || 0 }); return x.a.aoe || x.a.self ? [x.a.id] : [x.a.id, t && t.id]; } }
    // 2) 먹기 (거둘까): 생명력 60% 이하이고 넘침이 적을 때, 35% 아래면 넘침을 따지지 않는다. 곧 독으로 쓰러질 적 · 영창 중인 적은 먹지 않는다
    { const eatT = a => reach(a).filter(e => ps(e) > 0 && e.hp > ps(e) && !(e.chant && e.hp > e.hpMax * 0.3)).sort((x, y) => ps(y) - ps(x))[0];
      for (const a of okS.filter(bmEatQ)) {
        const dr = a.s.fx.find(e => e.k === 'drain' && e.eat); let n = 0, t = null;
        if (a.aoe) { for (const e of foes) if ((a.s.tgt === 'all' || e.row === 'front') && e.hp > ps(e)) n += Math.min(dr.max || 99, ps(e)); } else { t = eatT(a); n = t ? Math.min(dr.max || 99, ps(t)) : 0; }
        if (n <= 0) continue; const heal = Math.min(n * dr.per * E.healMul(p), p.hpMax * 0.25); const miss = p.hpMax - p.hp;
        const low = (hpf <= 0.6 && heal <= miss * 1.3) || hpf < 0.35; const prot = a.s.fx.some(e => e.k === 'meSt' && e.s === 'protect') && bigIn && hpf < 0.75 && heal <= miss * 1.3; const hit = !!dr.dmg && (a.aoe ? n >= 4 : ps(t) >= 4);
        if (hv && !prot && hpf >= 0.35) continue; // 강타가 오면 먹기보다 흘리기 · 방어 (보호를 주는 먹기와 위급할 때만)
        if (low || prot || hit) return a.aoe ? [a.id] : [a.id, t.id];
      }
      for (const a of okS.slice()) if (bmEatOnlyQ(a)) okS.splice(okS.indexOf(a), 1); } // 그 밖에는 피해 없는 먹기를 아낀다
    // 3) 약화: 큰 한 방을 모으는 적에게 먼저 (빠른 칸)
    if (bigIn) { const bg = pv1.filter(x => x.e.intent && (x.e.intent.k === 'heavy' || x.e.intent.aimed || ['burn', 'explode'].includes(x.e.intent.k))).map(x => x.e).sort((x, y) => y.dmg - x.dmg)[0];
      const wk = bg && !bg.s.weak && okS.filter(a => a.s.fx.some(e => e.k === 'st' && e.s === 'weak') && (a.aoe ? (a.s.tgt === 'all' || bg.row === 'front') : E.canTarget(b, bg, a))).sort((x, y) => x.time - y.time)[0]; if (wk && r() < 0.8) return wk.aoe ? [wk.id] : [wk.id, bg.id]; }
    if (hv && (hv.e.strong || hv.e.elite || hv.e.role === 'boss') && !v2Ready(b, hv.e.id) && L.find(a => a.id === 'guard' && a.ok) && r() < 0.85) return ['guard']; // 강적 · 정예 · 보스의 강타는 흘리기가 덜 줄이므로 방어 (비공개 문서 D2)
    if (!hv) { // 강타 예고가 있으면 아래 공통 판단(흘리기 · 방어)에 맡긴다
    // 4) 낸 피 칸의 순서: ⚡ 생명력을 내는 빠른 칸 먼저, 그다음 ▶ 낸 피 칸
    { const bd = okS.find(a => F(a, 'bloodDmg') && !a.self); const lt = okS.find(a => a.time <= 0.6 && (a.hpCost || 0) > 0 && !F(a, 'bloodDmg')); if (bd && lt && !b.bonusUsed && !nf && p.hp - lt.hpCost - (bd.hpCost || 0) >= p.hpMax * 0.45) return lt.self ? [lt.id] : [lt.id, (best(lt, (x, y) => x.hp - y.hp) || {}).id];
      if (bd && (b.paidTurn || 0) > 0 && b.prepTurn === b.turnIdx) { if (bd.aoe) return [bd.id]; const t = best(bd, (x, y) => (big(y) - big(x)) || (x.hp - y.hp)); if (t) return [bd.id, t.id]; } }
    // 5) 쓰러뜨리면 번짐: 쓰러뜨릴 수 있고 중독 3 이상, 다른 적이 남을 때. 표식(전투마다 1번): 오래 버틸 적에게
    { for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'spread' && e.kill && !e.mark))) { if (foes.length < 2) continue;
        if (a.aoe) { if (foes.filter(e => (a.s.tgt === 'all' || e.row === 'front') && bmDmg(b, a, e) >= e.hp && ps(e) >= 3).length) return [a.id]; continue; }
        const t = reach(a).filter(e => bmDmg(b, a, e) >= e.hp && ps(e) >= 3).sort((x, y) => ps(y) - ps(x))[0]; if (t) return [a.id, t.id]; }
      const mk = okS.find(a => a.s.fx.some(e => e.k === 'spread' && e.mark)); if (mk) { const cand = reach(mk).filter(e => e.role !== 'boss' && e.role !== 'candle' && e.hp > e.hpMax * 0.4).sort((x, y) => y.hp - x.hp)[0]; const t = foes.length >= 2 ? cand : reach(mk)[0]; if (t && (foes.length >= 2 || t.hp > 30)) return [mk.id, t.id]; } }
    // 6) 옮기기: 원천(중독 4 이상, 이번에 쓰러지지 않을 적), 다른 적 둘 이상
    { for (const a of okS.filter(a => a.s.fx.some(e => e.k === 'spread' && !e.kill && !e.s))) { if (foes.length < 3) continue; const t = reach(a).filter(e => ps(e) >= 4 && e.hp > ps(e) + 4).sort((x, y) => ps(y) - ps(x))[0]; if (t) return [a.id, t.id]; } }
    // 7) 약화 비례 · 약화 퍼뜨리기
    { const pd = okS.find(a => F(a, 'perDmg') && !a.aoe); if (pd) { const t = best(pd, (x, y) => psn2(y, 'weak') - psn2(x, 'weak')); if (t && psn2(t, 'weak') >= 2) return [pd.id, t.id]; }
      const sw = okS.find(a => a.s.fx.some(e => e.k === 'spread' && e.s === 'weak')); if (sw && foes.length >= 2) { const t = best(sw, (x, y) => (y.dmg - x.dmg)); if (t) return [sw.id, t.id]; } }
    // 8) 값 깎기: 강적 · 보스 · 영창자 싸움에서 큰 칸이 쿨타임일 때 (수도원장 종 직전에는 쓰지 않는다)
    { const pc = okS.find(a => a.self && F(a, 'payCut')); const hard = foes.some(e => e.strong || e.role === 'boss' || e.chant || e.elite);
      const bell = foes.some(e => e.boss === 'abbot' && (e.phase || 1) === 1 && e.hp < e.hpMax * 0.75);
      const cdBig = (p.skills || []).some(id => { const s = E.SK2[id]; return s && !s.once && s.fx.some(x => x.k === 'dmg' || x.k === 'brk') && (E.ysShort ? E.ysShort(p, s) : ((p.cd || {})[id] || 0)) >= 2; }); // 10월 15일 유산: 큰 칸에 유산이 2 이상 모자랄 때
      if (pc && hard && !bell && cdBig && (p.payCut || []).length < 2 && r() < 0.7) return [pc.id]; }
    }
    // 9) 사혈(나에게 쓰는 생명력 내기)은 위의 순서에서만 쓴다
    for (const a of okS.slice()) if (a.self && (a.hpCost || 0) > 0) okS.splice(okS.indexOf(a), 1);
  }
  if (p.build === 'elementalist' && p.elSt && !process.env.ELEM_OFF && !process.env.EL5_OFF && gt(p, 'elementalist', 'el5')) {
    // 0.8.0 M5-5 원소술사 (10월 20일 설계지 2판): 사람은 버튼의 🔥/❄와 적 카드의 원소를 보고 원소 전환을 쓰고, 승부수 · 강화 · 결합 칸은 쓸 때가 보이면 쓴다. 공격 칸 고르기는 아래 elemPick(열충격 · 빙결 미리 보기)
    const S = p.elSt, hz = (a, k) => a.s.fx.some(e => e.k === k), fastOk = !b.bonusUsed && !nf, slot = a => fastOk || a.time > 0.6;
    const foes = E.alive(b).filter(e => e.role !== 'root'), bigE = e => !!(e.elite || e.strong || e.role === 'boss'), bigIn = foes.some(bigE), small = foes.filter(e => !(e.strong || e.role === 'boss'));
    const atkN = pv1.filter(x => x.e.intent && ['attack', 'heavy'].includes(x.e.intent.k)).reduce((m, x) => m + x.n, 0);
    { const a = okS.find(a => hz(a, 'elMeteor')); if (a && (foes.length >= 2 || bigIn) && p.hp > p.hpMax * 0.55 && r() < 0.8) return [a.id]; } // 천화: 생명력이 넉넉할 때
    { const a = okS.find(a => hz(a, 'elStasis')); if (a && small.length >= 2 && atkN >= 2 && r() < 0.8) return [a.id]; } // 영겁의 정적: 나를 칠 작은 적이 둘 이상
    { const a = okS.find(a => hz(a, 'elAvatar')); if (a && !(S.avatar > 0) && (bigIn || foes.length >= 2) && p.hp > p.hpMax * 0.4 && r() < 0.8) return [a.id]; } // 빙염의 화신
    if (fastOk) { const cb = okS.find(a => a.self && a.time <= 0.6 && ((hz(a, 'elFrostEmber') && !S.frostEmber) || (hz(a, 'elFrostWall') && !S.frostWall) || (hz(a, 'elManaFire') && !S.manaFire) || (hz(a, 'elIgnGuard') && !S.ignGuard))); if (cb) return [cb.id]; } // 전투 내내 가는 칸
    { const ba = L.find(x => x.id === 'basic' && x.ok); const a = okS.find(a => a.self && slot(a) && ((hz(a, 'elMulti') && !S.multi) || (hz(a, 'elCharge') && !S.charge && !S.kindle))); if (a && ba && !hv) return [a.id]; // 마력 응축 · 마력 연사 · 불씨 응축 → 기본 공격
      if (ba && (S.charge || S.multi || S.kindle) && !hv) { const t0 = best(ba, (x, y) => ((psn2(y, 'ignite') > 0) - (psn2(x, 'ignite') > 0)) || (x.hp - y.hp)); if (t0) return ['basic', t0.id]; } }
    { const a = okS.find(a => a.self && slot(a) && ((hz(a, 'elProtR') && !S.protR) || (hz(a, 'ward') && (p.ward || 0) < 8) || (hz(a, 'elBarrier') && !(S.wardU >= (b.round || 0))) || (hz(a, 'thorn') && !(p.thorn && p.thorn.n > 0)) || (hz(a, 'elRimeR') && !(p.rime && Object.values(p.rime).some(x => x && x.until))))); if (a && (hv || atkN >= 2) && r() < 0.7) return [a.id]; } // 버팀 칸: 나를 칠 적이 있을 때
    { const a = okS.find(a => a.self && hz(a, 'foresee') && slot(a) && !(p.foresee && (b.round || 0) < p.foresee.until)); if (a && hv && r() < 0.7) return [a.id]; } // 고요의 눈
    { const a = okS.find(a => hz(a, 'elCat')); if (a && fastOk && !(S.cat && S.catT === b.turnIdx) && foes.some(e => psn2(e, 'ignite') + psn2(e, 'chill') >= 2) && r() < 0.7) return [a.id]; } // 촉매: 열충격을 낼 차례
    { const sw = okS.find(a => hz(a, 'elSwitch')), bo = L.find(a => a.v2 && a.s && hz(a, 'elBolt')); if (sw && bo && fastOk) { // 원소 전환: 마력탄으로 열충격 · 빙결을 낼 적이 지금 원소와 반대일 때(차례에 한 번)
      const R = reach(bo), wantF = R.filter(e => psn2(e, 'chill') > 0 && !psn2(e, 'ignite')).length, wantI = R.filter(e => psn2(e, 'ignite') > 0 && !psn2(e, 'chill')).length + R.filter(e => psn2(e, 'chill') === 2 && !psn2(e, 'ignite') && !bigE(e)).length;
      const go = S.el === 'fire' ? wantI > wantF : wantF > wantI; const afford = E.ysNow(p) >= E.skCost(sw.s) + E.skCost(bo.s); if (go && afford && b.elSwT !== b.turnIdx && r() < 0.5 + 0.4 * (P.mech || 0.5)) { b.elSwT = b.turnIdx; return [sw.id]; } } } // 전환 뒤 곧바로 마력탄을 쏠 유산이 있을 때만
  }
  if (p.build === 'elementalist' && E.elemPreview && useMech && !process.env.ELEM_OFF && gt(p, 'elementalist', 'main')) { const v = elemPick(b, P, r, okS, reach, pv1); if (v) return v; } // 0.6a.2 원소술사 (10월 7일): 열충격 미리 보기로 고른다
  // 0.6a.2 수도승 (10월 7일, docs/직업/수도승.md F-4): 되받을 직접 공격 예고가 있으면 자세, 차례의 첫 ⚡ 공격, 기를 보고 터뜨리기 · 흘려 쓰기, 늦춘 적에게서 거두기, 되받은 다음 차례의 되갚기, 모으는 적 · 지원하는 적 끊기
  if (p.build === 'monk' && (p.skills || []).some(id => E.SK2[id] && E.SK2[id].fx.some(e => MONK_FX.includes(e.k))) && gt(p, 'monk', 'main')) { // 끼운 스킬로 본다(지금 쓸 수 있는 칸이 아니라)
    const ki = psn2(p, 'empower'); const fastOk = !b.bonusUsed && !nf; const kbOf = a => a.s.fx.find(e => e.k === 'kiBurst'); const fxOf = (a, k) => a.s.fx.find(e => e.k === k);
    const ctrIn = pv1.filter(x => E.monkShowCtr(b, x.e)); const M = ctrIn.reduce((m, x) => m + x.n, 0);
    const bigCtr = ctrIn.some(x => x.e.intent.k === 'heavy' || x.e.intent.aimed || x.e.intent.k === 'reflect' || x.e.intent.k === 'erupt');
    const farIn = pv1.some(x => x.e.row === 'back' && x.e.intent && E.CTR_SHOW.includes(x.e.intent.k));
    const stOf = a => fxOf(a, 'stance'); const fastSt = a => a.self && stOf(a) && a.time <= 0.6; const blockSt = a => a.self && stOf(a) && a.time > 0.6;
    const stVal = a => { const x = stOf(a); return (x.dmg || 0) + (x.brk || 0) * 0.15 + (x.ki || 0) * 4 + (x.weak || 0) * 2 + (x.chill || 0) + (x.mul || 0) * 20 + (x.red || 0) * 25 + (x.keep ? 6 : 0) + (x.big && bigCtr ? 10 : 0); }; // M5-2: 되받기 배수 · 받는 피해 · 유지 · 천근추
    const tgtOf = a => a.self || a.aoe ? null : (best(a, (x, y) => x.hp - y.hp) || {}).id; const hitL = a => reach(a).filter(e => a.s.tgt !== 'front' || e.row === 'front'); // 전열 모두 칸은 전열만 맞는다
    const weakIn = pv1.some(x => x.e.intent && ['curse', 'hexcurse', 'sermon'].includes(x.e.intent.k));
    const chg = e => !!(e.intent && (['charge', 'heavy', 'chant', 'chanting', 'aim'].includes(e.intent.k) || e.intent.aimed));
    const sure = r() < 0.6 + 0.35 * (P.mech || 0.5); const cur = b.prepTurn === b.turnIdx; const stNow = cur && p.stance, gdNow = cur && p.guard; // 지난 차례의 자세 · 방어는 이번 차례 첫 행동에서 지워진다
    // M5-2 (10월 20일): 결합 칸은 전투 첫 빠른 칸에, 승부수 · 강화 칸은 쓸 때가 보이면(사람은 버튼 설명과 예고를 보고 쓴다)
    { const S = p.mkSt || {}, hz = (a, k) => a.s.fx.some(e => e.k === k), slot = a => fastOk || a.time > 0.6;
      { const ba = L.find(x => x.id === 'basic' && x.ok); if (S.chain && ba && !hv) { const t = best(ba, (x, y) => x.hp - y.hp); if (t) return ['basic', t.id]; } } // 연환권을 쓴 차례의 주 행동은 기본 공격(강타가 오면 평소 판단)
      { const a = okS.find(a => hz(a, 'mkChain')); if (a && fastOk && !S.chain && !hv && !bigCtr && L.some(x => x.id === 'basic' && x.ok) && !(M >= 1 && !(cur && p.stance) && okS.some(x => fastSt(x)) && sure)) return [a.id]; } // 연환권(⚡): 이번 차례 기본 공격을 늘린다(되받을 공격이 오면 자세가 먼저)
      if (fastOk) { const cb = okS.find(a => a.self && ((hz(a, 'mkSamjae') && !S.samjae) || (hz(a, 'mkReflux') && !S.reflux) || (hz(a, 'mkBultoe') && !S.bultoe))); if (cb) return [cb.id]; }
      { const a = okS.find(a => hz(a, 'mkYeok')); if (a && !S.yeok && slot(a) && (M >= 2 || bigCtr) && p.hp > p.hpMax * 0.4) return [a.id]; }
      { const a = okS.find(a => hz(a, 'mkCheon')); if (a && !S.cheon && slot(a) && (M >= 2 || E.alive(b).some(e => e.intent && E.SEAL_K.includes(e.intent.k)))) return [a.id]; } // 천망: 되받기 피해 0이 대가라 둘 이상이 치거나 지원 행동을 하려는 적이 있을 때
      { const a = okS.find(a => hz(a, 'mkIlji')); const kf = fastOk && okS.find(x => x.self && x.time <= 0.6 && x.s.fx.some(e => e.k === 'st' && e.s === 'empower')); if (a && !S.noKi && ki < 3 && kf && reach(a).some(e => psn2(e, 'chill') >= 2)) return [kf.id]; /* 일지멸맥 앞에 기를 채운다(기 가두기) */ if (a && !S.noKi && slot(a) && (ki >= 3 || (ki >= 2 && reach(a).some(e => psn2(e, 'chill') >= 3))) && p.hp > p.hpMax * 0.25) { const t = reach(a).filter(e => psn2(e, 'chill') >= 2 && !enemyAvoid(e, a)).sort((x, y) => psn2(y, 'chill') * y.hp - psn2(x, 'chill') * x.hp)[0]; if (t) return [a.id, t.id]; } }
      { const a = okS.find(a => hz(a, 'mkAdamant')); if (a && !S.adamant && slot(a) && (bigCtr || M >= 2 || p.hp < p.hpMax * 0.5)) return [a.id]; }
      { const a = okS.find(a => hz(a, 'mkFlow')); if (a && !S.flow && slot(a) && E.alive(b).length) return [a.id]; }
      { const a = okS.find(a => hz(a, 'mkCondense')); if (a && fastOk && !S.condense && ki >= 2 && okS.some(x => !x.self && kbOf(x))) return [a.id]; }
      { const a = okS.find(a => a.self && a.time > 0.6 && a.s.fx.some(e => e.k === 'st' && e.s === 'empower')); if (a && ki === 0 && okS.some(x => !x.self && (kbOf(x) || fxOf(x, 'kiHits') || fxOf(x, 'kiPer'))) && r() < 0.3) return [a.id]; } } // 호흡: 기가 없고 기를 쓰는 칸이 있으면 가끔
    // 0. 끊기: 강타 · 영창을 모으는 적을 이번 행동으로 무너뜨릴 수 있으면(끊기 붕괴 · 큰 붕괴) 막기보다 먼저 끊는다
    { const brkOf = a => a.s.fx.reduce((m, e) => m + (e.k === 'cutx' ? e.brk : e.k === 'brk' ? e.n : 0), 0); const cg = E.alive(b).filter(e => chg(e) && !e.s.broken);
      if (cg.length && sure) for (const a of okS.filter(a => !a.self && brkOf(a) >= 25 && (fastOk || a.time > 0.6)).sort((x, y) => brkOf(y) - brkOf(x))) { const t = cg.filter(e => E.canTarget(b, e, a) && !enemyAvoid(e, a)).sort((x, y) => (y.brk / y.brkMax) - (x.brk / x.brkMax))[0]; if (t && (t.brk + brkOf(a) >= t.brkMax || a.s.fx.some(e => e.k === 'cutx'))) return [a.id, t.id]; } }
    // 1. 자세: 되받을 공격 예고가 있으면 ⚡ 자세를 먼저, 강타 · 큰 한 방이 오거나 둘 이상 치거나 생명력 절반 아래면 ▶ 자세(없으면 방어)
    if (M >= 1 && sure) {
      if (!stNow && fastOk) { const fs = okS.filter(a => fastSt(a) && (!stOf(a).far || farIn)).sort((x, y) => stVal(y) - stVal(x))[0]; if (fs) return [fs.id]; }
      if (hv && hv.e.role === 'boss' && psn2(p, 'brand') >= 1 && !v2Ready(b, hv.e.id) && L.find(a => a.id === 'dodge' && a.ok) && r() < 0.85) return ['dodge', hv.e.id]; // 보스의 강타는 흘린다 (비공개 문서의 규칙)
      if (MONK_OLD) { if ((bigCtr || M >= 2 || p.hp < p.hpMax * 0.5) && !gdNow) { const bs = okS.filter(blockSt).sort((x, y) => stVal(y) - stVal(x))[0]; if (bs) return [bs.id]; if (bigCtr && L.find(a => a.id === 'guard' && a.ok) && r() < 0.4 + P.guard) return ['guard']; } }
      else if ((bigCtr || M >= 2 || p.hp < p.hpMax * 0.5) && !gdNow) { /* 규칙 문장: "자세는 피해를 줄이지 않고, 방어는 줄이면서 같이 되받는다." 큰 공격이 오면 방어를 먼저(옛 확률 그대로), 아니면 느린 자세로 되받기를 깐다 */
        if (bigCtr && L.find(a => a.id === 'guard' && a.ok) && (process.env.MONK_GUARD_ROLL ? r() < 0.4 + P.guard : true)) return ['guard']; /* 이 블록은 sure(사람이 판단했을 때)에서만 돈다. MONK_GUARD_ROLL=1이면 옛 확률 */
        const bs = okS.filter(blockSt).sort((x, y) => stVal(y) - stVal(x))[0]; if (bs) return [bs.id]; }
    } else if (farIn && fastOk && !stNow && sure) { const fs = okS.find(a => fastSt(a) && stOf(a).far); if (fs) return [fs.id]; }
    // 2. 빠른 칸: 기가 적고 터뜨리기가 준비되면 기 모으기, 거두기가 준비되면 둔화 걸기, 모으는 적에게 약화 · 붕괴, 아니면 차례의 첫 ⚡ 공격
    if (fastOk) {
      const br = okS.find(a => a.self && a.time <= 0.6 && a.s.fx.some(e => e.k === 'st' && e.s === 'empower'));
      if (br && ki <= 2 && okS.some(a => kbOf(a) && !kbOf(a).max)) return [br.id];
      const fa = okS.filter(a => !a.self && a.time <= 0.6 && has(a, 'dmg'));
      const harv = okS.find(a => a.time > 0.6 && !a.aoe && a.s.fx.some(e => (e.k === 'meSt' && e.if === 'chill') || e.k === 'chillx' || (e.k === 'kiBurst' && e.pre) || e.k === 'mkChillBurst' || e.k === 'mkDrainChill' || e.k === 'mkIlji'));
      const chf = fa.find(a => a.s.fx.some(e => e.k === 'st' && e.s === 'chill'));
      if (harv && chf && !reach(harv).some(e => psn2(e, 'chill') > 0)) { const t = best(chf, (x, y) => y.hp - x.hp); if (t && E.canTarget(b, t, harv)) return [chf.id, t.id]; }
      const cg = E.alive(b).filter(e => chg(e)); if (cg.length) { const wk = fa.find(a => a.s.fx.some(e => (e.k === 'st' && e.s === 'weak') || (e.k === 'brk' && e.n >= 25) || e.k === 'cutx')); if (wk) { const t = cg.find(e => E.canTarget(b, e, wk) && !enemyAvoid(e, wk)); if (t) return [wk.id, t.id]; } }
      const sx = fa.find(a => has(a, 'sealx')); if (sx) { const t = reach(sx).find(e => e.intent && E.SEAL_K.includes(e.intent.k)); if (t) return [sx.id, t.id]; }
      if ((MONK_OLD ? b.kiFastTurn !== b.turnIdx : true) && fa.length) { const score=a=>hitL(a).reduce((n,t)=>Math.max(n,qaMonkHit(p,a,t).damage),0); const a = fa.slice().sort((x, y) => score(y)-score(x))[0]; const t = best(a, (x, y) => x.hp - y.hp); if (t) return [a.id, t.id]; }
      if (br && ki <= 2) return [br.id];
    }
    // 3. 터뜨리기: 기 4 이상, 기 3이고 쓰러뜨릴 수 있음, 약화 예고 앞, 붕괴형은 모으는 적을 무너뜨릴 때, 상한이 있는 칸은 상한만큼 찼을 때
    for (const a of okS.filter(a => kbOf(a) && !a.self)) {
      const k = kbOf(a);
      if (a.aoe) { const tk = Math.min(k.max || 5, ki); if (tk >= 3 && reach(a).length >= 2) return [a.id]; continue; }
      const t = best(a, (x, y) => (chg(y) - chg(x)) || ((k.pre ? psn2(y, 'chill') > 0 : 0) - (k.pre ? psn2(x, 'chill') > 0 : 0)) || (y.hp - x.hp)); if (!t) continue;
      const estimate = qaMonkHit(p,a,t), tk = estimate.take, kill = estimate.damage >= t.hp;
      const brkIt = k.brk && chg(t) && t.brk + tk * k.brk >= t.brkMax;
      if (tk <= 1 && !(k.max && k.max <= 3)) continue;
      if (tk >= 4 || (tk >= 3 && kill) || (weakIn && tk >= 2) || brkIt || (k.max && tk >= k.max) || (k.mul && tk >= 2)) return [a.id, t.id]; // M5-2 붕권(쏟은 기마다 ×): 기 2부터
    }
    // 4. 기 지키기: 큰 터뜨리기가 곧 준비되고 기 3 이상이면, 되받을 예고가 있을 때 ▶ 자세로 기를 모은다
    if (ki >= 3 && M >= 1 && !gdNow && L.some(a => a.v2 && kbOf(a) && !kbOf(a).max && (a.wait || 0) <= 1)) { const bs = okS.filter(blockSt).sort((x, y) => stVal(y) - stVal(x))[0]; if (bs) return [bs.id]; }
    // 5. 기 비례(기 3 이상) · 기 끌어올리기(기 1~2)
    { const bigBurst = (p.skills || []).some(id => E.SK2[id] && E.SK2[id].fx.some(e => e.k === 'kiBurst' && !e.max)); // 모두 터뜨리는 칸을 끼웠으면 기를 아껴 둔다
      const kiOk = a => MONK_OLD || bigBurst ? ki >= 3 : qaResource(p,a,fxOf(a,'kiPer'),fxOf(a,'kiPer').per * ki) >= 0.3 * qaSkillBase(p,a); // 규칙 문장: "모두 터뜨리는 칸이 없으면 기에 비례하는 공격은 기로 늘어나는 피해가 기본 피해의 30% 이상일 때 쓴다. 있으면 기 3 이상일 때 쓴다"
      const kpv = a => a.aoe ? hitL(a).reduce((n,t)=>n+qaMonkHit(p,a,t).damage,0) : hitL(a).reduce((n,t)=>Math.max(n,qaMonkHit(p,a,t).damage),0);
      const cs = okS.filter(a => ((has(a, 'kiPer') && kiOk(a)) || (has(a, 'kiHits') && ki >= 2)) && a.time > 0.6 && (!a.aoe || reach(a).length >= 2)).sort((x, y) => kpv(y) - kpv(x))[0]; // M5-2 연환권
      if (cs) { const t = cs.aoe ? null : best(cs, (x, y) => y.hp - x.hp); if (cs.aoe) return [cs.id]; if (t) return [cs.id, t.id]; } }
    for (const a of okS.filter(a => has(a, 'kiGrow'))) if (ki >= 1 && ki <= 2) { const t = best(a, (x, y) => x.hp - y.hp); if (t) return [a.id, t.id]; }
    // 6. 거두기 · 둔화 배수: 이미 둔화된 적에게
    for (const a of okS.filter(a => a.time > 0.6 && a.s.fx.some(e => (e.k === 'meSt' && e.if === 'chill') || e.k === 'chillx' || e.k === 'mkChillBurst' || e.k === 'mkDrainChill'))) { const ts = hitL(a).filter(e => psn2(e, 'chill') > 0); if (!ts.length) continue; if (a.aoe) { if (ts.length >= 2 || hitL(a).length === 1) return [a.id]; continue; } return [a.id, ts.sort((x, y) => y.hp - x.hp)[0].id]; }
    // 7. (되갚기는 기 비례와 같은 키가 되어 5단계에서 쓴다)
    // 8. 끊기: 지원 예고(치유 > 축복 > 소환 > 저주 > 지키기)는 sealx, 모으는 적은 cutx · 약화
    { const sp = e => e.intent ? ['heal', 'bless', 'summon', 'curse', 'guard'].indexOf(e.intent.k) : -1; for (const a of okS.filter(a => has(a, 'sealx') && a.time > 0.6)) { const ts = reach(a).filter(e => e.intent && E.SEAL_K.includes(e.intent.k)); if (!ts.length) continue; if (a.aoe) return [a.id]; return [a.id, ts.sort((x, y) => ((sp(x) < 0 ? 9 : sp(x)) - (sp(y) < 0 ? 9 : sp(y))))[0].id]; } }
    { const cg = E.alive(b).filter(e => chg(e)); if (cg.length) for (const a of okS.filter(a => a.time > 0.6 && !a.self && a.s.fx.some(e => e.k === 'cutx' || (e.k === 'st' && e.s === 'weak')))) { const t = cg.find(e => E.canTarget(b, e, a) && !enemyAvoid(e, a)); if (t) return [a.id, t.id]; } }
    // 그 밖의 판단(광역, 끊기 붕괴, 무작위 공격)에서 지금 쓸모가 적은 칸은 뺀다: 기가 1 이하인 큰 터뜨리기, 되받은 것이 없는 되갚기, 둔화된 적이 없는 거두기, 되받을 예고가 없는 자세
    const weakNow = a => { const k = kbOf(a); if (k && !(k.max && k.max <= 3) && ki + (k.pre ? 1 : 0) <= (k.mul ? 0 : 1)) return true; if (has(a, 'kiPer') && (MONK_OLD || (p.skills || []).some(id => E.SK2[id] && E.SK2[id].fx.some(e => e.k === 'kiBurst' && !e.max)) ? ki <= 1 : qaResource(p,a,fxOf(a,'kiPer'),fxOf(a,'kiPer').per * ki) < 0.3 * qaSkillBase(p,a))) return true; if (has(a, 'kiGrow') && ki === 0) return true; if (has(a, 'chillx') && !hitL(a).some(e => psn2(e, 'chill') > 0)) return true; if (a.s.fx.some(e => (e.k === 'meSt' && e.if === 'chill') || e.k === 'mkChillBurst') && !hitL(a).some(e => psn2(e, 'chill') > 0)) return true; if (has(a, 'mkCtrPer') && !(b.mkCtrLast > 0)) return true; if (has(a, 'mkIlji')) return true; /* M5-2: 둔화 없는 폭쇄 · 되받은 것이 없는 되돌린 주먹 · 일지멸맥(위에서만) */ if (a.time > 0.6 && !a.self && !a.aoe && E.SK2[a.id] && E.SK2[a.id].mk5 && !has(a, 'sealx') && !has(a, 'cutx')) { const t = best(a, (x, y) => x.hp - y.hp); const bE = qaWeaponBase(p, { id: 'basic' }) * (ki > 0 ? 1.25 : 1); if (!t || qaMonkHit(p, a, t).damage < bE * 1.1) return true; } /* M5-2: 기본 공격보다 약한 ▶ 칸(리듬 칸 등)은 유산을 아낀다(사람은 버튼 숫자를 본다) */ if (a.self && stOf(a) && M === 0) return true; return false; };
    for (const a of okS.slice()) if (weakNow(a)) okS.splice(okS.indexOf(a), 1); // 큰 터뜨리기는 기가 찰 때까지 아껴 둔다(그동안 기본 공격)
  }
  // 강타 예고: 흘리기형 스킬(스태미나 없이) → 흘리기 준비 → 스태미나 흘리기. 이번 차례에 빠른 행동으로 이미 그 적을 흘릴 준비를 했으면 다시 걸지 않는다(덮어쓰면 붙은 효과를 잃는다)
  if (hv && !PRE_PARRY.includes(p.build) && !v2Ready(b, hv.e.id) && r() < Math.max(P.parry, 0.35) + 0.2 && gt(p, '*', 'parry')) { /* 앞의 다섯 직업은 직업 판단 앞에서 같은 대응을 한다 */
    const ps = okS.find(a => has(a, 'parry')); if (ps) return [ps.id, hv.e.id];
    const pb = okS.find(a => has(a, 'parryBuff') && (p.build !== 'assassin' || a.time <= 0.6)); if (pb && !p.pbuf && E.dodgeCost(p) <= p.st) return [pb.id]; // M5-3 암살자: 주 행동인 흘리기 준비(칼끝 겨누기)는 강타 앞에서 고르지 않는다(쓰면 차례가 끝나 흘리지 못한다)
    if (L.find(a => a.id === 'dodge' && a.ok) && r() < P.parry + 0.3) return ['dodge', hv.e.id];
  }
  // 0.6a.2 마검사 (10월 7일, docs/직업/마검사.md F-2): 베기(⚔)와 주문(✦)을 번갈아 쓰고(교대 보호막), 칼에 실은 원소를 오래 살 적에게 박는다.
  // 사람처럼 버튼에 보이는 숫자(피해 · 상태 · 교대 표시)를 어림해 가장 나은 행동을 고른다. 빠른 칸이 남아 있으면 빠른 행동을 먼저 본다. 마검사 스킬(kind)이 끼워졌을 때만
  if (p.build === 'spellblade' && useMech && okS.some(a => a.s.kind) && gt(p, 'spellblade', 'main')) {
    const cap = E.wardMax(p), ward = p.ward || 0; const last = p.sbLast; const want = last === 'cut' ? 'spell' : last === 'spell' ? 'cut' : null;
    const altFree = b.sbAltTurn !== b.turnIdx; const runIf = (p.sbRun || 0) + 1; const fastFree = !b.bonusUsed && !nf;
    const atkIn = pv1.filter(x => x.e.intent && ['attack', 'heavy', 'explode', 'brand', 'burn'].includes(x.e.intent.k)).length;
    const bigIn = !!(hv || pv1.some(x => x.e.intent && (x.e.intent.aimed || x.e.intent.k === 'burn')));
    const kindOf = a => a.id === 'basic' || a.id === 'heavy' ? 'cut' : a.s && a.s.kind;
    const big = e => !!(e.elite || e.strong || e.role === 'boss');
    const fx = (a, k) => a.s ? a.s.fx.find(e => e.k === k) : null;
    const chg = e => !!(e.intent && ['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn'].includes(e.intent.k));
    const wardGain = a => !a.s ? 0 : a.s.fx.reduce((m, e) => m + (e.k === 'ward' ? e.n : e.k === 'wardFill' ? Math.max(0, cap * (e.to || 1) - ward) : 0), 0);
    // 막: 다음 차례 전에 큰 공격이 오고 보호막이 상한 절반 아래면 채우는 주문 (사람은 예고를 보고 막을 두른다)
    if (bigIn && ward < cap * 0.5) { const ws = okS.filter(a => a.self && wardGain(a) >= 6).sort((x, y) => wardGain(y) - wardGain(x))[0]; if (ws && r() < 0.8) return [ws.id]; }
    const value = (a, t) => {
      const k = kindOf(a); const hits = (a.s && a.s.hits) || 1; const multi = !!a.aoe; const ts = a.self ? [] : multi ? reach(a).filter(e => !a.s || a.s.tgt !== 'front' || e.row === 'front') : t ? [t] : [];
      const dm = a.id === 'basic' || a.id === 'heavy' ? qaWeaponBase(p,a) : qaSkillBase(p,a);
      const ex = fx(a, 'exploit'), kx = fx(a, 'kwx'), lx = fx(a, 'lowx'), bx = fx(a, 'brokenx'), wb = fx(a, 'wardBurn'), wd = fx(a, 'wardDmg'), bk = fx(a, 'brk'), cx = fx(a, 'cutx'), ks = fx(a, 'killSpread'), ed = fx(a, 'edgeX'), im = fx(a, 'imbue'), al = fx(a, 'alt');
      const altNow = !!(want && k === want); const run2 = altNow && runIf >= 2;
      const altOn = al && altNow && (al.run === 2 ? run2 : true);
      let v = 0, i = 0;
      for (const e of ts) {
        let x = dm * hits + (ex ? ex.per * psn2(e, ex.s || 'poison') : 0) + (wb && i === 0 ? Math.min(ward, wb.max || 99) * wb.mul : 0) + (wd ? qaWardBonus(wd,ward) : 0);
        if (kx && psn2(e, kx.s) > 0) x *= kx.mul; if (lx && e.hp <= e.hpMax * lx.hp) x *= lx.mul; if (bx && e.s.broken) x *= bx.mul;
        if (e.braced) x *= 0.5; if (e.evading && !multi) x = 0; if (multi && e.row === 'back') x *= 0.7;
        if (x > 0) { const ig = psn2(e, 'ignite'); for (let h = 0; h < hits && ig - h > 0; h++) x += ig - h; } // 화상은 맞을 때마다 더 든다
        const kill = x >= e.hp; v += Math.min(x, e.hp) + (kill ? 8 : 0);
        if (!kill && a.s) for (const f of a.s.fx) if (f.k === 'st' && (f.s === 'bleed' || f.s === 'ignite')) v += f.n * (f.s === 'bleed' ? 2 : 1.5) * (big(e) ? 1.3 : 1); else if (f.k === 'st' && f.s === 'weak') v += f.n * 1.5;
        const brk = (bk ? bk.n : a.id === 'basic' ? qaBasicBrk() : a.id === 'heavy' ? qaHeavyBrk() : 0) + (cx && chg(e) ? cx.brk : 0) + (altOn && al.brk ? al.brk : 0);
        v += brk * (chg(e) || big(e) ? 0.3 : 0.12) + (chg(e) && e.brk + brk >= e.brkMax ? 14 : 0);
        if (a.s && a.s.killRecharge && kill) v += 6; if (ks && kill && psn2(e, 'bleed') >= 2) v += Math.ceil(psn2(e, 'bleed') * ks.per) * Math.max(0, E.alive(b).filter(o => o.role !== 'root').length - 1) * 1.5;
        if (k === 'cut' && p.edge && i === 0 && x > 0 && !kill) v += p.edge.n * (ed ? ed.mul : 1) * (p.edge.s === 'bleed' ? 2 : 1.6) * (e.hp > e.hpMax * 0.4 ? 1 : 0.5);
        if (k === 'cut' && e.countering && !multi) v -= 15;
        i++;
      }
      if (ed && !p.edge) v -= 3; // 칼이 비었으면 ×가 놀아난다
      if (a.s) for (const f of a.s.fx) if (f.k === 'st' && a.self) v += f.s === 'protect' ? f.n * (atkIn ? 2.5 : 0.5) : 0;
      v += Math.min(Math.max(0, cap - ward), wardGain(a)) * (atkIn ? 0.9 : 0.35) + ((fx(a, 'stam') || {}).n || 0) * (p.st < 50 ? 0.12 : 0.03);
      if (im && !(p.edge && p.edge.s === im.s && p.edge.n >= im.n)) v += im.n * 2 - (p.edge && p.edge.s !== im.s ? p.edge.n * 2 : 0);
      if (altOn) v += (al.ward || 0) * (atkIn ? 0.9 : 0.4) + (al.protect || 0) * (atkIn ? 2.5 : 0.5) + (al.stam || 0) * 0.05;
      if (al && al.run === 2 && !run2) v -= 2; // 박자가 안 맞으면 아낀다
      if (fx(a, 'hasten') && fx(a, 'hasten').on === 'alt' && altNow) v += 1.5;
      if (want && k === want) v += altFree ? 5 : 1.5; else if (want && k && k !== want) v -= (p.sbRun || 0) >= 1 ? 2 : 0.5;
      if (a.s) v -= ysPen(b, a, 0.35); if (a.id === 'heavy') v -= 6; // 유산(예전 쿨타임) · 스태미나 값
      if (wb && fx(a, 'lowx') && E.alive(b).some(e => big(e) && e.hp > e.hpMax * fx(a, 'lowx').hp) && !ts.some(e => e.hp <= e.hpMax * fx(a, 'lowx').hp)) v -= 30; // 마무리 태우기는 큰 적이 높을 때 아낀다
      return a.time >= 1.25 ? v * 0.8 : v;
    };
    const tgtFor = a => { if (a.self || a.aoe) return null; const ex = fx(a, 'exploit'), kx = fx(a, 'kwx'), cx = fx(a, 'cutx');
      const sc = e => (cx && chg(e) ? 30 : 0) + (kx && psn2(e, kx.s) > 0 ? 12 : 0) + (ex ? psn2(e, ex.s || 'poison') * 3 : 0) + (kindOf(a) === 'cut' && p.edge ? (e.hp / e.hpMax) * 6 : 0) + (a.s && a.s.killRecharge ? (e.hp <= qaSkillBase(p,a) ? 10 : 0) : 0) - e.hp / 20;
      return best(a, (x, y) => sc(y) - sc(x)); };
    const cand = okS.concat(L.filter(a => a.ok && (a.id === 'basic' || (a.id === 'heavy' && p.st >= 70)))).map(a => { const t = tgtFor(a); return (a.self || a.aoe || t) ? { a, t, v: value(a, t) + (r() - 0.5) * 10 } : null; }).filter(Boolean); // 사람의 어림: 버튼의 숫자를 정확히 더하지 않는다(값에 ±5 흔들림)
    const fastC = cand.filter(c => c.a.time <= 0.6).sort((x, y) => y.v - x.v)[0];
    if (fastFree && fastC && fastC.v > 4) return [fastC.a.id, fastC.t && fastC.t.id];
    const pickC = cand.filter(c => !fastFree || c.a.time > 0.6).sort((x, y) => y.v - x.v)[0] || fastC; if (pickC && !(hv && pickC.v < 8)) return [pickC.a.id, pickC.t && pickC.t.id]; // 강타가 오는데 마땅한 행동이 없으면 아래(방어)로
  }
  // 0.6a.2 파수꾼 (10월 4일): 보호막 · 가시 · 태우기 · 끌어내기 · 취약 · 둔화 · 붕괴 조건. 새 효과를 가진 스킬에만 걸린다 (마검사는 위의 자기 칸이 맡는다. 수도승의 둔화 배수(chillx)는 수도승 판단이 맡는다)
  if ((GATE.legacy ? p.build !== 'spellblade' && p.build !== 'monk' : p.build === 'warden') && E.wardMax && okS.some(a => a.s.fx.some(e => WARDEN_FX.includes(e.k))) && gt(p, 'warden', 'main')) { // 10월 17일 측정 도구 보완: 파수꾼에게만(보완 전에는 마검사 · 수도승만 뺐다: 사냥꾼 · 원소술사 · 해금 1 · 2의 둔화 배수 · 취약 · 가시 칸에도 걸렸다)
    const cap = E.wardMax(p), ward = p.ward || 0; const atk = pv1.filter(x => x.e.intent && ['attack', 'heavy', 'explode', 'brand'].includes(x.e.intent.k)).length;
    const wardGain = a => a.s.fx.reduce((m, e) => m + (e.k === 'ward' ? e.n : e.k === 'wardFill' ? Math.max(0, cap * (e.to || 1) - ward) : 0), 0);
    // 막기: 내 다음 차례 전에 공격이 오는데 보호막이 절반 아래면 보호막을 가장 많이 주는 나에게 쓰는 스킬, 가시가 없으면 가시 (10월 4일: 둘 이상 칠 때만 쓰던 것을 한 적에게도. 보스전에서 막는 스킬을 거의 쓰지 않았다)
    if ((hv || atk >= 1) && ward < cap * 0.5) { const ws = okS.filter(a => a.self && wardGain(a) >= 6).sort((x, y) => wardGain(y) - wardGain(x))[0]; if (ws && r() < 0.8) return [ws.id]; }
    if (atk >= 1 && !p.thorn) { const ts = okS.find(a => a.self && has(a, 'thorn')); if (ts && r() < 0.7) return [ts.id]; }
    // 마무리 태우기(생명력이 낮은 적에게 ×): 그런 적이 있으면 그 적에게 쓰고, 정예 · 강적 · 보스가 아직 높으면 아껴 둔다 (사람은 버튼 설명을 보고 아낀다)
    { const lowOf = a => a.s.fx.find(e => e.k === 'lowx'); const fin = okS.filter(a => has(a, 'wardBurn') && lowOf(a));
      for (const a of fin) { const t = reach(a).filter(e => e.hp <= e.hpMax * lowOf(a).hp).sort((x, y) => y.hp - x.hp)[0]; if (t && ward >= 12) return [a.id, t.id]; }
      const hold = a => E.alive(b).some(e => (e.role === 'boss' || e.elite || e.strong) && e.hp > e.hpMax * lowOf(a).hp);
      for (const a of fin) if (hold(a)) okS.splice(okS.indexOf(a), 1); }
    // 태우기: 태울 보호막이 넉넉하면(그 스킬이 태우는 상한의 60% 이상) 큰 적 · 강타를 모으는 적부터
    for (const a of okS.filter(a => has(a, 'wardBurn'))) { const wb = a.s.fx.find(e => e.k === 'wardBurn'); if (ward >= Math.min(wb.max || cap, cap) * 0.6) { const t = a.aoe ? null : best(a, (x, y) => ((y.intent && ['charge', 'heavy'].includes(y.intent.k)) - (x.intent && ['charge', 'heavy'].includes(x.intent.k))) || (y.hp - x.hp)); if (a.aoe || t) return [a.id, t && t.id]; } }
    // 끌어내기: 전열이 막고 있고 후열에 사수 · 치유사 · 소환사가 있으면
    if (E.frontBlocked(b)) { const pa = okS.find(a => has(a, 'pull')); const t = pa && E.alive(b).filter(e => e.row === 'back' && ['archer', 'healer', 'summoner'].includes(e.role) && E.canTarget(b, e, pa)).sort((x, y) => x.hp - y.hp)[0]; if (t) return [pa.id, t.id]; }
    // 취약 키우기 · 취약 비례: 취약이 걸린 적에게
    { const vt = a => best(a, (x, y) => psn2(y, 'vuln') - psn2(x, 'vuln')); const vg = okS.find(a => has(a, 'vulnGrow')); if (vg) { const t = vt(vg); if (t && psn2(t, 'vuln') >= 1) return [vg.id, t.id]; } const vp = okS.find(a => has(a, 'vulnPer')); if (vp) { const t = vt(vp); if (t && psn2(t, 'vuln') >= 2) return [vp.id, t.id]; } }
    // 둔화된 적 · 붕괴한 적에게 배수가 붙는 스킬: 그런 적이 있으면
    for (const a of okS.filter(a => has(a, 'chillx') || has(a, 'brokenx'))) { const ok = e => (has(a, 'chillx') && e.s.chill) || (has(a, 'brokenx') && e.s.broken); const ts = reach(a).filter(ok); if (!ts.length) continue; if (a.aoe) return [a.id]; return [a.id, ts.sort((x, y) => y.hp - x.hp)[0].id]; }
    // 방패병에게 붕괴 ×: 방패병이 있으면 그 방패병을
    { const sx = okS.find(a => has(a, 'shieldx')); if (sx) { const sh = reach(sx).find(e => e.role === 'shield' && !e.s.broken); if (sh) return sx.aoe ? [sx.id] : [sx.id, sh.id]; } }
  }
  // 0.8.0 M5-3 암살자 (10월 20일 설계지 4판): 승부수 · 강화 · 결합 칸은 쓸 때가 보이면(사람은 버튼 설명과 예고를 보고 쓴다). 터뜨리기 · 중독 · 키우기는 아래 공통 판단
  if (p.build === 'assassin' && p.asSt && gt(p, 'assassin', 'as5')) { const S = p.asSt, hz = (a, k) => a.s.fx.some(e => e.k === k), fastOk = !b.bonusUsed && !nf, slot = a => fastOk || a.time > 0.6;
    const foes = E.alive(b).filter(e => e.role !== 'root'), bigE = e => !!(e.elite || e.strong || e.role === 'boss'), bigIn = foes.some(bigE); const psSum = foes.reduce((m, e) => m + psn(e), 0);
    const atkN = pv1.filter(x => x.e.intent && ['attack', 'heavy'].includes(x.e.intent.k)).reduce((m, x) => m + x.n, 0);
    if (b.asChainAgain) { const a = okS.find(x => x.id === b.asChainAgain); const t = a && best(a, (x, y) => (psn(y) - psn(x)) || (x.hp - y.hp)); if (t && psn(t) >= 3) return [a.id, t.id]; return ['as_end']; } // 연쇄 격발: 터뜨릴 중독이 있으면 다시
    { const mu = L.find(x => x.id === 'as_mu' && x.ok); if (mu) { const t = best(mu, (x, y) => (bigE(y) - bigE(x)) || (x.hp - y.hp)); if (t) return ['as_mu', t.id]; } } // 무영살: 숨은 다음 차례에 벤다
    { const ba = L.find(x => x.id === 'basic' && x.ok); if (ba && !hv && ((S.zan > 0 && r() < 0.85) || (S.flowBlade && S.fbTurn === b.turnIdx))) { const t = best(ba, (x, y) => x.hp - y.hp); if (t) return ['basic', t.id]; } } // 잔영난무 · 흘린 칼: 이번 차례는 기본 공격
    const early = b.turnIdx <= 3 || foes.reduce((m, e) => m + e.hp, 0) > foes.reduce((m, e) => m + e.hpMax, 0) * 0.6; // 전투 내내 가는 칸은 전투 초반에만(늦게 쓰면 남는 몫이 적다)
    if (fastOk && early) { const cb = okS.find(a => a.self && ((hz(a, 'asFangC') && !S.fang) || (hz(a, 'asParPsn') && !S.parPsn) || (hz(a, 'asBackFlower') && !S.backFlower) || (hz(a, 'asPlague') && !S.plague && foes.length >= 2) || (hz(a, 'asFlowBlade') && !S.flowBlade) || (hz(a, 'asDance') && !S.dance))); if (cb) return [cb.id]; } // 전투 내내 가는 칸은 첫 빠른 칸에
    { const ult = L.find(a => a.v2 && a.s && a.s.fx.some(e => ['asBloom', 'asHide', 'asZan'].includes(e.k))); const used = ult && (b.rec || []).some(x => x.k === 'act' && x.a === ult.id);
      if (ult && !used && !ult.ok && bigIn && (ult.wait || 0) <= 2 && (ult.wait || 0) > 0 && r() < 0.75) for (const a of okS.slice()) if (a !== ult && (a.yc || 0) > 0) okS.splice(okS.indexOf(a), 1); } // 큰 적 싸움: 아직 안 쓴 승부수에 유산이 2 이내로 모자라면 비용 칸을 아낀다(사람은 승부수 버튼의 남은 유산을 본다)
    { const a = okS.find(a => hz(a, 'asHide')); if (a && !S.mu && slot(a) && (hv || bigIn || atkN >= 2)) return [a.id]; } // 무영살: 강타가 오거나 큰 적이 칠 때 숨는다
    { const a = okS.find(a => hz(a, 'asZan')); if (a && !(S.zan > 0) && !(S.noStam > 0) && slot(a) && !hv && p.hp > p.hpMax * 0.4 && (bigIn || foes.length >= 2 || foes.some(e => e.hp > 40))) return [a.id]; } // 잔영난무
    { const a = okS.find(a => hz(a, 'asBloom')); if (a && slot(a)) { const t = best(a, (x, y) => (bigE(y) - bigE(x)) || (y.hp - x.hp)); if (t && (psSum >= 10 || (psSum >= 6 && bigE(t)) || psSum >= t.hp * 0.2) && p.hp > p.hpMax * 0.3) return [a.id, t.id]; } } // 만독개화: 모인 중독이 넉넉할 때
    { const a = okS.find(a => hz(a, 'asVeil')); if (a && !S.veil && slot(a) && atkN >= 2 && r() < 0.8) return [a.id]; }
    { const bu = okS.find(a => has(a, 'burst')); const a = okS.find(a => hz(a, 'asNextBurst')); if (a && !S.nextBurst && bu && slot(a) && foes.some(e => psn(e) >= 5)) return [a.id]; } // 꽃잎 모으기: 곧 터뜨릴 때
    { const a = okS.find(a => hz(a, 'asNextPsn')); if (a && !(S.nextPsn && S.nextPsn.n > 0) && slot(a) && !hv && L.some(x => x.id === 'basic' && x.ok) && (a.time <= 0.6 || foes.some(e => bigE(e) || e.hp > 40)) && r() < 0.7) return [a.id]; } // 독침 · 독 묻힌 그림자: 기본 공격 앞에(주 행동인 독침은 오래 갈 싸움에서)
    { const a = okS.find(a => hz(a, 'asCounter')); if (a && !v2Ready(b) && !hv && r() < 0.6) { const at = pv1.find(x => x.e.intent && x.e.intent.k === 'attack' && E.canTarget(b, x.e, a)); if (at) return [a.id, at.e.id]; } } // 흘려 베기: 나를 칠 적에게
    for (const a of okS.filter(a => hz(a, 'asBackx'))) { const bx = a.s.fx.find(e => e.k === 'asBackx'); const t = reach(a).filter(e => e.row === 'back' && (!bx.low || e.hp <= e.hpMax * bx.low)).sort((x, y) => x.hp - y.hp)[0]; if (t) return [a.id, t.id]; } // 후열 기습 · 그림자 처형: 조건이 맞는 후열
    for (const a of okS.filter(a => hz(a, 'asVirulent'))) { const t = best(a, (x, y) => (bigE(y) - bigE(x)) || (y.hp - x.hp)); if (t && (bigE(t) || t.hp > 40)) return [a.id, t.id]; } // 맹독: 오래 버틸 적에게
    for (const a of okS.filter(a => has(a, 'spread'))) { if (foes.length < 2) break; const t = reach(a).filter(e => psn(e) >= 4).sort((x, y) => psn(y) - psn(x))[0]; if (t) return [a.id, t.id]; } // 독 번지기
  }
  if ((hv || ex) && r() < P.guard && L.find(a => a.id === 'guard' && a.ok)) return ['guard'];
  // 강공격: 스태미나가 넉넉하고 강타 예고가 없으면 가끔 (흘리기 몫 40은 남긴다)
  if (qaB0() && !hv) { const hA = L.find(a => a.id === 'heavy' && a.ok); if (hA) { const chg = e => !!(e.intent && (['charge', 'heavy', 'chant', 'chanting', 'burn', 'aim', 'fuse', 'explode'].includes(e.intent.k) || e.intent.aimed)); const t = E.alive(b).filter(e => e.role !== 'root' && !e.s.broken && chg(e) && E.canTarget(b, e, hA) && e.brk + qaHeavyBrk() >= e.brkMax).sort((x, y) => y.dmg - x.dmg)[0]; if (t && r() < 0.5 + 0.4 * (P.mech || 0.5)) return ['heavy', t.id]; } } // M5-7: 기본 공격이 붕괴를 채우지 않으니, 모으는 적을 무너뜨릴 수 있으면 강공격(사람은 붕괴 게이지를 보고 고른다)
  if (!hv && p.st >= 80 && p.build !== 'elementalist' && r() < 0.3 + P.risk * 0.3 && L.find(a => a.id === 'heavy' && a.ok)) { const t = best({ id: 'heavy', melee: 1 }, (x, y) => y.hp - x.hp); if (t) return ['heavy', t.id]; }
  const boNo = a => p.build === 'elementalist' && !process.env.ELEM_BURN_OLD && has(a, 'burnOut') && gt(p, 'elementalist', 'burn') && !reach(a).some(e => psn2(e, 'ignite') > 0); // 10월 18일 0.8.0 5단계 마무리(11-6): 화상이 붙은 적이 없으면 불태우기를 고르지 않는다(사람은 버튼의 "화상이 없으면 0"을 본다)
  const boT = a => p.build === 'elementalist' && !process.env.ELEM_BURN_OLD && has(a, 'burnOut') ? best(a, (x, y) => (psn2(y, 'ignite') - psn2(x, 'ignite')) || (x.hp - y.hp)) : null; // 불태우기 대상: 화상이 가장 많은 적
  const burnLow = a => has(a, 'wardBurn') && (p.ward || 0) < Math.min(a.s.fx.find(e => e.k === 'wardBurn').max || 99, E.wardMax ? E.wardMax(p) : 99) * 0.5; // 파수꾼: 태울 보호막이 모자라면 태우기를 고르지 않는다 (사람은 버튼의 "보호막 n 태움"을 보고 고른다)
  if (!useMech) { const pool = okS.filter(a => !has(a, 'parry') && !has(a, 'parryBuff') && !burnLow(a) && !boNo(a) && !(has(a, 'burst') && !E.alive(b).some(e => psn(e) > 0))); if (pool.length && r() < 0.6) { const a = pool[Math.floor(r() * pool.length)]; const t = a.self || a.aoe ? null : boT(a) || best(a, (x, y) => x.hp - y.hp); return [a.id, t && t.id]; } return null; }
  const th = mem.burstTh || (mem.burstTh = 4 + Math.floor(r() * 4));
  // 처형·터뜨리기: 죽일 수 있거나 충분히 쌓였을 때
  for (const a of okS.filter(a => has(a, 'burst'))) {
    if (a.aoe) { if (E.alive(b).filter(e => psn(e) >= 3).length >= 2) return [a.id]; continue; }
    const exe = a.s.fx.find(e => e.k === 'execute'); const pre = (a.s.fx.find(e => e.k === 'burst') || {}).pre || 0;
    const t = best(a, (x, y) => psn(y) - psn(x)); if (!t || !(psn(t) + pre)) continue;
    const dmg = qaPoisonBurst(p,a,psn(t)+pre); // 터뜨리면 나올 피해 (사람은 버튼의 숫자를 보고 누른다)
    const kill = dmg >= t.hp; const low = exe && t.hp <= t.hpMax * exe.hp;
    const big = !!(t.elite || t.strong || t.role === 'boss');
    if (kill || low || psn(t) + pre >= th || dmg >= 15 || (big && psn(t) + pre >= (a.s.as5 ? th : 3)) || (t.intent && t.intent.k === 'heavy' && (!a.s.as5 || psn(t) + pre >= 3))) return [a.id, t.id]; // M5-3: 새 암살자 터뜨리기는 큰 적 배수가 작아(1–2배) 큰 적에게도 문턱까지 쌓는다 // 큰 적은 독이 조금만 쌓여도 터뜨린다(큰 적 배수)
  }
  // 터뜨리기를 가진 빌드: 곧 터뜨릴 적에게 먼저 독을 쌓는다 (독 심기 → 독 격발)
  { const bu = L.filter(a => a.v2 && a.s.fx.some(e => e.k === 'burst') && !a.s.once);
    const pz = okS.filter(a => has(a, 'poison') && !a.aoe && !has(a, 'burst'));
    if (bu.length && pz.length && bu.some(a => (a.wait || 0) <= 1)) { const a = pz.sort((x, y) => (y.s.fx.find(e => e.k === 'poison').n) - (x.s.fx.find(e => e.k === 'poison').n))[0]; const t = best(a, (x, y) => (psn(y) - psn(x)) || (y.hp - x.hp)); if (t && psn(t) < th) return [a.id, t.id]; } }
  // 키우기: 중독 4 이상
  for (const a of okS.filter(a => has(a, 'grow'))) { const t = best(a, (x, y) => psn(y) - psn(x)); if (t && psn(t) >= 4) return [a.id, t.id]; }
  // 강타·폭발을 모으는 적: 끊는 스킬(끊어 내기, 붕괴가 큰 스킬)로 그 적을 노린다 (사람은 예고를 보고 끊는다)
  { const chg = E.alive(b).filter(e => e.intent && ['charge', 'heavy', 'fuse', 'explode', 'chant', 'chanting', 'burn'].includes(e.intent.k));
    if (chg.length && r() < 0.8) { const brkOf = a => a.s.fx.reduce((m, e) => m + (e.k === 'cutx' ? e.brk : e.k === 'brk' ? e.n : e.k === 'brkPer' ? e.per * psn(chg[0]) : 0), 0);
      const cs = okS.filter(a => !a.self && brkOf(a) >= 25).sort((x, y) => brkOf(y) - brkOf(x));
      for (const a of cs) { const t = chg.filter(e => E.canTarget(b, e, a)).sort((x, y) => (y.brk / y.brkMax) - (x.brk / x.brkMax))[0]; if (t && t.brk + brkOf(a) >= t.brkMax * 0.6) return [a.id, t.id]; } } }
  // 흘리기형 스킬에 보상(피해·되받기)이 붙어 있으면 강타가 아니어도: 내 다음 차례 전에 나를 칠 적에게
  { const pa = okS.find(a => has(a, 'parry') && (has(a, 'onParry') || has(a, 'dmg'))); if (pa && !v2Ready(b) && r() < 0.7) { const at = pv1.find(x => x.e.intent && x.e.intent.k === 'attack'); if (at) return [pa.id, at.e.id]; } }
  // 광역: 둘 이상
  for (const a of okS.filter(a => a.aoe && !has(a, 'burst') && !burnLow(a))) if (reach(a).length >= 2) return [a.id];
  // 중독을 이용하는 스킬: 중독 3 이상
  for (const a of okS.filter(a => has(a, 'exploit') || has(a, 'brkPer'))) { const t = best(a, (x, y) => psn(y) - psn(x)); if (t && psn(t) >= 3) return [a.id, t.id]; }
  // 흘리기 준비(자신): 강타가 곧 오면
  const pb = okS.find(a => has(a, 'parryBuff')); if (pb && !p.pbuf && E.alive(b).some(e => e.intent && e.intent.k === 'charge') && r() < 0.6) return [pb.id];
  // 그 밖의 공격 스킬: 아직 중독이 적은 적 / 약한 적
  const atk = okS.filter(a => !a.self && !has(a, 'parry') && !has(a, 'burst') && !has(a, 'grow') && !burnLow(a) && !boNo(a) && !(a.s.as5 && a.s.fx.some(e => ['asBloom', 'asBackx', 'asVirulent', 'spread'].includes(e.k))));
  if (atk.length) { const a = atk[Math.floor(r() * atk.length)]; const t = boT(a) || (has(a, 'poison') ? best(a, (x, y) => (psn(x) - psn(y)) || (x.hp - y.hp)) : best(a, (x, y) => x.hp - y.hp)); if (t) return [a.id, t.id]; }
  return null;
}
function heuristic(b, P, r, mem) {
  { const q = demandPick(b, P, r); if (q) return q; } // 0.6a.2 수도원장의 요구(심문 · 고해)
  const p = b.p, L = bmHold(b, E.actionList(b)), ok = id => { const a = L.find(x => x.id === id); return a && a.ok; }; // 숨겨진 직업 3: 피로 당기기는 v2Pick의 규칙으로만
  const al = E.alive(b).filter(e => e.role !== 'root');
  const hpf = p.hp / p.hpMax;
  const pv = E.previewAfter(b, 1);
  const hv = pv.find(x => x.e.intent && x.e.intent.k === 'heavy');
  const ex = pv.find(x => x.e.intent && ['explode', 'burn', 'erupt', 'reflect', 'noon'].includes(x.e.intent.k)); // 3챕터 정오의 빛도 방어로 받는다 // 2챕터 솟구침 · 되비추기는 방어로 받는다(땅속 적은 흘릴 대상으로 고를 수 없다)
  // 실수
  if (r() < P.err * (mem.errMul || 1)) { const okL = L.filter(a => a.ok && a.id !== 'flee'); const a = okL[Math.floor(r() * okL.length)]; const ts = E.alive(b).filter(e => E.canTarget(b, e, a)); return [a.id, ts.length ? ts[Math.floor(r() * ts.length)].id : null, 'mistake']; }
  // 플라스크 (기억하고 있을 때만)
  const aware = Math.min(1, P.flaskAware + (mem.flaskLearn || 0));
  if (hpf < P.flaskAt * (p.build === 'butcher' && gt(p, 'butcher', 'flask') && !E.previewAfter(b, 1).some(x => x.e.intent && (x.e.intent.k === 'heavy' || x.e.intent.aimed)) ? 0.8 : 1) && ok('flaskL') && r() < aware) return ['flaskL'];
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
    let c = reachable(a); if (!c.length) return null; { const ok = c.filter(e => !enemyAvoid(e, { aoe: 0, melee: ['basic', 'heavy', 'viper', 'scarcut', 'crush', 'lava'].includes(a) })); if (ok.length) c = ok; } const th = c.find(e => enemyPrio(e) > 0); if (th) return th;
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
  if (['basic', 'heavy', 'viper', 'scarcut', 'crush', 'lava'].includes(id) && !((p.build === 'hunter' || p.build === 'elementalist') && (id === 'basic' || id === 'heavy')) && t && E.guardOf(b, t) && !(id === 'heavy' && p.eq.weapon === 'hook' && t.row === 'back')) return '방패병에게 가로막힐 대상을 근접 공격';
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
module.exports = { asnShadowVar, hazePick, qaBurnDamage, qaMonkHit, qaPoisonBurst, qaWeaponBase, qaSkillBase, qaResource, qaWardBonus, playRun, PERSONAS, heuristic, lookahead, sigRule, invariants, wasted, rng, GATE, PRE_PARRY, demandPick };
