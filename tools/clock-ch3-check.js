'use strict';
/* G-1 3챕터 강적 시계 단위 시험 2판 · 3판(봉화대장 · 대변인) (js/15-chapter3.js W3_CLOCK · js/25-foe-clock.js). 규칙은 비공개 문서 참조.
   강적 다섯마다: 시계 정의 · 답 태그 2종 이상 · 마지막 경고(답을 알려 주지 않음) · 경고 뒤 기다림 · 파국 · 결정적 답(마지막 경고 칸에서 한 행동 → 0칸 + 보상) ·
   평소 되감기(경고 칸이 아니면 1칸 · 라운드에 한 번, 화면의 수를 비추는 시계는 예외. 3판 강적은 평소 행동이 경고 칸에서도 1칸) · 멈춤. 칸 수 · 세기 · 보상 길이는 FOE_X에서 읽는다(손잡이를 바꿔도 시험은 그대로).
   쓰기: node tools/clock-ch3-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const H = require('./uqtest/_h.js'); const { E, R_ } = H;
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
R_('w3ClockReg')();
const FC = R_('FOE_CLOCK'), X = R_('FOE_X'), fcEv = R_('fcEv'), w3Act = R_('w3Act'), st = H.st, BR = R_('BRK_RULE');
const TAGS = ['brk', 'aoe', 'ranged', 'dot', 'kill', 'parry', 'guard', 'cons', 'gold'];
const TELLS = /붕괴|무너뜨|흘리|흘려|광역|원거리|정화|부수|부숴|쓰러뜨|플라스크|방어|막아|막으|벽돌|폭도/; // 마지막 경고가 답을 알려 주면 안 된다
const NAMES = { beaconlord: '봉화대장', siege: '공성 기술자', speaker: '탄원자들의 대변인', marksman: '성벽 위의 명사수', wallcap: '성벽에 녹아든 수비대장' };
const mk = (foe, en, cls) => {
  const f = H.fight(cls || 'warden', { en, hp: 300, ctx: { ch: 3, floor: 10, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = foe; es[0].elite = true; es[0].bigMul = 3; } });
  const b = f.b, s = f.es[0]; b.cur = null; R_('w3Setup')(b, { floor: 10, strong: NAMES[foe], foe, lv: 12, path: 'main' }); fcEv(b, 'onRoomStart');
  const p = b.p; p.hp = p.hpMax; p.stun = 0; p.guard = 0; p.dodge = 0; p.ward = 0; p.s = {}; p.taint = p.taint || 0; b.rec = b.rec || []; b.round = 1;
  return { f, b, s, p };
};
const full = p => { p.hp = p.hpMax; p.guard = 0; p.dodge = 0; p.ward = 0; p.s = {}; };
const lost = (p, fn) => { full(p); const h0 = p.hp; fn(); return (h0 - p.hp) / p.hpMax; };
const near = (a, x, eps) => Math.abs(a - x) < (eps || 0.015);
const recN = (b, k) => b.rec.filter(r => r.k === k).length;
const backWhy = (b, w) => b.rec.some(r => r.k === 'clkback' && r.why === w);
const logHas = (b, s) => b.log.some(l => l.m.includes(s));
const brkOut = (b, e) => { e.brk = (e.brkMax || 100) - 0.01; E.addBreak(b, e, 999); };
const next = b => { b.turnIdx = (b.turnIdx || 0) + 1; };
const myAct = (b, id, fn) => { b.cur = { id }; b.actN = (b.actN || 0) + 1; fn(); b.cur = null; }; // 내 행동 하나(onHit은 b.cur가 있을 때만)
const vulnOf = e => st(e, 'vuln');
function common(foe, maxKnob) {
  const D = FC[foe]; t(!!D, foe + ': 시계 정의가 없다'); if (!D) return null;
  const A = new Set(D.ans); t(A.size >= 2 && [...A].every(x => TAGS.includes(x)), foe + ': 답 태그 ' + JSON.stringify(D.ans));
  t(typeof D.doom === 'function' && typeof D.warn === 'function' && D.max >= 2 && typeof D.blocked === 'function', foe + ': doom · warn · max · blocked');
  t(D.max === maxKnob, foe + ': 칸 수가 FOE_X 손잡이(' + maxKnob + ')가 아니다(' + D.max + ')');
  t(!TELLS.test(D.warn()), foe + ': 마지막 경고가 답을 알려 준다: ' + D.warn());
  return D;
}

/* 1 봉화대장: 시계 = 가장 먼저 터질 봉화의 남은 칸(화면의 수를 비춘다). 3판: 결정적 답은 본체 무너뜨리기 · 곧 터질 봉화에 원거리 · 광역 */
{
  const XB = X.beaconlord, D = common('beaconlord', XB.fuse), M = XB.fuse;
  const toWarn = (b, s) => { for (let k = 0; k < M - 1; k++) w3Act(b, s, { k: 'pourbeacon' }, 10); };
  const hotOf = b => b.en.filter(e => e.role === 'bonfire' && e.alive).sort((x, y) => x.fuse - y.fuse)[0];
  t(D.ans.includes('brk'), '봉화대장: 근접도 닿는 답 태그(brk)가 없다');
  { const { b, s, p } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    t(L.length === XB.fires && L.every(x => x.fuse === M && x.brkMax === XB.brk) && C && C.n === 0 && C.max === M, '봉화대장: 봉화 수 · 칸 · 붕괴 상한 · 시계 0/' + M + '가 아니다'); t(s.intent && s.intent.k === 'pourbeacon', '봉화대장: 봉화가 선 뒤 첫 예고가 기름 붓기가 아니다(' + (s.intent && s.intent.k) + ')');
    toWarn(b, s); t(C.n === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '봉화대장: ' + (M - 1) + '/' + M + '에서 마지막 경고가 없다(' + C.n + ')');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(L.every(x => x.alive) && C.n === M - 1, '봉화대장: 경고한 그 차례에 터졌다');
    next(b); const en0 = b.en.length; const d1 = lost(p, () => w3Act(b, s, { k: 'pourbeacon' }, 10));
    t(near(d1, XB.boom) && L.filter(x => x.alive).length === XB.fires - 1 && recN(b, 'clkdoom') === 1, '봉화대장: 첫 폭발 ' + XB.boom + '가 아니다(' + d1.toFixed(3) + ')');
    t(b.en.length === en0 + 1 && b.en[b.en.length - 1].reinf, '봉화대장: 폭발에 경보 한 칸(증원)이 없다');
    t(C.n === 0, '봉화대장: 터진 뒤 다음 봉화로 시계가 돌아오지 않았다(' + C.n + ')');
    toWarn(b, s); next(b); const d2 = lost(p, () => { p.guard = 1; w3Act(b, s, { k: 'pourbeacon' }, 10); });
    t(near(d2, Math.min(1, XB.boom * XB.chain)) && recN(b, 'clkdoom') === 2, '봉화대장: 둘째 폭발 ×' + XB.chain + '(방어로 줄지 않음)가 아니다(' + d2.toFixed(3) + ')'); }
  /* 결정적 답 ① 본체 무너뜨리기(기름통을 떨어뜨린다) → 0칸 · 남은 봉화 칸 가득 · 불길(보상) */
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    brkOut(b, s); t(C.n === 0 && !backWhy(b, 'brk') && st(s, 'ignite') === 0, '봉화대장: 경고 칸이 아닌데 본체 붕괴가 무엇을 했다'); s.s = {}; s.stun = 0; delete s.s.broken; s.brk = 0;
    toWarn(b, s); t(C.n === M - 1, '봉화대장: 답 시험 전 경고 칸이 아니다');
    brkOut(b, s); t(C.n === 0 && backWhy(b, 'brk') && L.every(x => x.alive && x.fuse === M), '봉화대장: 경고 칸에서 본체를 무너뜨렸는데 0칸 · 남은 봉화 가득이 아니다(' + C.n + ')');
    t(st(s, 'ignite') >= XB.rewIg && vulnOf(s) > 0, '봉화대장: 결정적 답(본체)의 보상(불길 · 취약)이 없다');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(C.n === 1 && !recN(b, 'clkdoom'), '봉화대장: 답한 뒤 다음 기름이 1칸이 아니다(' + C.n + ')'); }
  /* 기름통을 든 봉화대장(경고 칸 · 기름 붓기 예고)은 붕괴가 brkWarn배: 실제 근접 강공격 한 번으로 무너진다 */
  { const { f, b, s } = mk('beaconlord', ['pike', 'beacon']); const BM = R_('w3BrkMul'); s.brkMax = 100; s.brk = 0; s.armor = 0; s.intent = { k: 'pourbeacon' };
    t(BM(b, s) === 1, '봉화대장: 경고 칸이 아닌데 붕괴 배율이 있다'); toWarn(b, s); s.intent = { k: 'firerain' }; t(BM(b, s) === 1, '봉화대장: 기름 붓기 예고가 아닌데 붕괴 배율이 있다'); s.intent = { k: 'pourbeacon' }; t(BM(b, s) === XB.brkWarn, '봉화대장: 경고 칸 · 기름 붓기 예고의 붕괴 배율이 ' + XB.brkWarn + '가 아니다(' + BM(b, s) + ')');
    H.act(f, 'heavy', s); t(s.s.broken && s.clk.n === 0 && backWhy(b, 'brk'), '봉화대장: 경고 칸에서 근접 강공격 한 번으로 무너지지 않았다(붕괴 ' + Math.round(s.brk) + '/' + s.brkMax + ', 시계 ' + s.clk.n + ')'); }
  /* 결정적 답 ② 곧 터질 봉화에 원거리 한 번(실제 사냥꾼 기본 공격) */
  { const { f, b, s } = mk('beaconlord', ['pike', 'beacon'], 'hunter'); const L = b.en.filter(e => e.role === 'bonfire'); toWarn(b, s); const hot = hotOf(b);
    H.act(f, 'basic', hot); t(s.clk.n === 0 && backWhy(b, 'hit') && L.filter(x => x.alive).every(x => x.fuse === M) && vulnOf(s) > 0, '봉화대장: 원거리 한 번으로 곧 터질 봉화를 맞혔는데 0칸 · 보상이 아니다(시계 ' + s.clk.n + ')'); }
  /* 결정적 답 ③ 광역 한 번 */
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    myAct(b, 'f_topple', () => E.hurtEnemy(b, L[1], 1, { aoe: 1 })); t(C.n === 0 && !backWhy(b, 'hit') && vulnOf(s) === 0, '봉화대장: 경고 칸이 아닌데 광역이 무엇을 했다');
    toWarn(b, s); myAct(b, 'f_topple', () => { for (const x of L) E.hurtEnemy(b, x, 1, { aoe: 1 }); });
    t(C.n === 0 && backWhy(b, 'hit') && L.every(x => x.alive && x.fuse === M) && vulnOf(s) > 0, '봉화대장: 경고 칸에서 광역 한 번에 0칸 · 보상이 아니다(' + C.n + ')'); }
  /* 평소 행동: 근접으로 곧 터질 봉화 치기 · 다른 봉화 부수기는 경고 칸에서도 1칸을 넘게 되감지 않는다(봉화대장은 칸을 옮기지 않는다) */
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const C = s.clk; toWarn(b, s); const hot = hotOf(b), other = b.en.find(e => e.role === 'bonfire' && e.alive && e !== hot);
    myAct(b, 'basic', () => E.hurtEnemy(b, hot, 1, { single: 1 })); t(C.n === M - 1 && !backWhy(b, 'hit'), '봉화대장: 근접 한 번이 곧 터질 봉화의 결정적 답이 되었다(' + C.n + ')');
    b.round = 7; myAct(b, 'heavy', () => brkOut(b, other)); t(!other.alive && C.n >= M - 2 && !backWhy(b, 'hit') && vulnOf(s) === 0, '봉화대장: 다른 봉화를 부숴 1칸 넘게 되감기거나 보상이 들었다(' + C.n + ')'); }
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire');
    s.intent = { k: 'pourbeacon' }; s.teleSet = s.intent; brkOut(b, s); const f0 = L.map(x => x.fuse).join(); R_('enemyAct')(b, s); t(L.map(x => x.fuse).join() === f0, '봉화대장: 무너진 라운드에 기름을 부었다');
    for (const x of L.filter(x => x.alive)) brkOut(b, x); t(s.stun >= 1 && st(s, 'ignite') >= 3 && st(s, 'vuln') > 0 && s.clk.n === 0, '봉화대장: 봉화를 다 부순 보상(불길 · 화상 3 · 취약)이 없다'); }
  { const { b, s, p } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); p.stun = 1; w3Act(b, s, { k: 'pourbeacon' }, 10);
    t(L.every(x => x.fuse === M) && s.clk.n === 0 && s.clk.stop === 1, '봉화대장: 기절 중에 시계가 멈추지 않았다'); }
}

/* 2 공성 기술자 */
{
  const XS = X.siege, D = common('siege', XS.max), M = XS.max;
  const toWarn = (b, s) => { for (let k = 0; k < M - 1; k++) w3Act(b, s, { k: 'assemble' }, 10); };
  { const { b, s, p } = mk('siege', ['sapper', 'wallguard']); const C = s.clk; const parts = b.en.filter(e => e.role === 'rampart');
    t(parts.length === XS.parts && C.n === 0 && C.max === M, '공성 기술자: 부품 · 0/' + M + '이 아니다');
    toWarn(b, s); t(C.n === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '공성 기술자: 마지막 경고가 없다');
    s.acts = 0; s.intent = null; R_('decideIntent')(b, s); t(s.intent.k === 'launch', '공성 기술자: 경고 칸인데 발사 예고가 아니다(' + s.intent.k + ')');
    w3Act(b, s, { k: 'launch' }, 10); t(C.n === M - 1 && !recN(b, 'clkdoom'), '공성 기술자: 경고한 그 차례에 발사했다');
    next(b); full(p); p.guard = 1; const h0 = p.hp; w3Act(b, s, { k: 'launch' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, XS.launch) && C.n === 0 && recN(b, 'clkdoom') === 1, '공성 기술자: 발사 ' + XS.launch + '가 방어로 줄었거나 아니다(' + d.toFixed(3) + ')'); }
  /* 결정적 답 ① 발사 예고에 흘리기 → 피해 없음 · 0칸 · 공구를 놓음 */
  { const { b, s, p } = mk('siege', ['sapper', 'wallguard']); const C = s.clk; toWarn(b, s); next(b); full(p); p.dodge = s.id; const h0 = p.hp; w3Act(b, s, { k: 'launch' }, 10);
    t(p.hp === h0 && !p.dodge && C.n === 0 && !recN(b, 'clkdoom') && backWhy(b, 'parry') && s.stun >= 1 && vulnOf(s) > 0, '공성 기술자: 경고 칸에서 흘렸는데 피해 0 · 0칸 · 보상이 아니다(피해 ' + (h0 - p.hp).toFixed(1) + ', ' + C.n + ')'); }
  /* 결정적 답 ② 부품 하나를 무너뜨리기 */
  { const { b, s } = mk('siege', ['sapper', 'wallguard']); const C = s.clk, parts = b.en.filter(e => e.role === 'rampart'); toWarn(b, s);
    t(XS.partBrk <= 35 * BR.heavyMul, '공성 기술자: 부품 붕괴 상한 ' + XS.partBrk + '이 강공격 한 번보다 크다');
    brkOut(b, parts[0]); t(!parts[0].alive && C.n === 0 && backWhy(b, 'part') && s.stun >= 1, '공성 기술자: 경고 칸에서 부품을 무너뜨렸는데 0칸 · 보상이 아니다(' + C.n + ')'); }
  /* 평소 되감기: 경고 칸이 아니면 1칸 · 라운드에 한 번 */
  if (M >= 3) { const { b, s } = mk('siege', ['sapper', 'wallguard']); const C = s.clk, parts = b.en.filter(e => e.role === 'rampart');
    b.round = 4; C.n = M - 2; brkOut(b, parts[0]); t(C.n === M - 3, '공성 기술자: 경고 칸이 아닌 부품 붕괴가 1칸이 아니다(' + C.n + ')');
    C.n = M - 2; brkOut(b, parts[1]); t(C.n === M - 2, '공성 기술자: 한 라운드에 평소 되감기가 두 번 들었다(' + C.n + ')');
    b.round = 5; w3Act(b, s, { k: 'fixram' }, 10); brkOut(b, parts.find(x => x.alive)); t(C.n === M - 3, '공성 기술자: 다음 라운드의 평소 되감기가 들지 않았다(' + C.n + ')'); }
  { const { b, s } = mk('siege', ['sapper', 'wallguard']); const C = s.clk; toWarn(b, s);
    s.intent = { k: 'assemble' }; s.teleSet = s.intent; brkOut(b, s); s.stun = 1; R_('enemyAct')(b, s); t(C.n === M - 1, '공성 기술자: 무너진 라운드에 조립했다'); }
  { const { b, s, p } = mk('siege', ['sapper', 'wallguard']); p.stun = 1; w3Act(b, s, { k: 'assemble' }, 10); t(s.clk.n === 0 && s.clk.stop === 1, '공성 기술자: 기절 중에 시계가 멈추지 않았다'); }
}

/* 3 탄원자들의 대변인: 시계 = 대변인이 부른 수(3판, 폭도 수를 비추지 않는다). 결정적 답은 대변인 무너뜨리기 · 골드 */
{
  const XP = X.speaker, D = common('speaker', XP.max), M = XP.max;
  t(D.ans.includes('brk') && D.ans.includes('gold'), '대변인: 답 태그가 brk · gold가 아니다(' + D.ans + ')');
  const fillOf = k => k === 'rally3' ? XP.loud : k === 'incite' || k === 'shout' ? XP.stir : 0;
  const toWarn = (b, s) => { for (let k = 0; k < 9 && s.clk.n < M - 1; k++) w3Act(b, s, { k: 'shout' }, 10); };
  const rioters = b => b.en.filter(e => e.alive && e.role === 'rioter' && !e.strong);
  const goldA = b => E.actionList(b).find(a => a.id === 'tossgold');
  { const { b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; t(C.n === 0 && C.max === M, '대변인: 폭도 둘이 있어도 0칸으로 시작해야 한다(' + C.n + ')');
    fcEv(b, 'onRoundEnd'); next(b); fcEv(b, 'onRoundEnd'); t(C.n === 0, '대변인: 폭도가 서 있는 라운드 끝에 칸이 찼다(부른 수만 센다)');
    for (const k of ['rally3', 'incite', 'shout', 'charge', 'attack']) { const n0 = C.n = 0; w3Act(b, s, { k }, 10); t(C.n === Math.min(M - 1, n0 + fillOf(k)), '대변인: ' + k + '이(가) ' + fillOf(k) + '칸이 아니다(' + C.n + ')'); }
    C.n = 0; b.rec.length = 0; p.weak = 0; toWarn(b, s); t(C.n === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '대변인: 부르기가 경고 없이 다 찼거나 마지막 경고가 없다(' + C.n + ')');
    w3Act(b, s, { k: 'incite' }, 10); t(C.n === M - 1 && !recN(b, 'clkdoom'), '대변인: 경고한 그 차례에 밀어닥쳤다');
    next(b); full(p); p.guard = 1; const h0 = p.hp; w3Act(b, s, { k: 'incite' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, XP.gate * 0.5) && C.n === 0 && recN(b, 'clkdoom') === 1, '대변인: 「성문을 열어라」(방어 절반 ' + (XP.gate * 0.5).toFixed(2) + ')가 아니다(' + d.toFixed(3) + ')'); }
  /* 결정적 답 ① 대변인 무너뜨리기 → 0칸 · 군중이 흩어짐(폭도 기절 · 감소 풀림 · 선동 풀림 · 취약). 경고 칸에서는 붕괴가 brkWarn배 */
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk, BM = R_('w3BrkMul'); s.intent = { k: 'incite' }; t(BM(b, s) === 1, '대변인: 경고 칸이 아닌데 붕괴 배율이 있다'); toWarn(b, s);
    t(BM(b, s) === XP.brkWarn, '대변인: 경고 칸의 붕괴 배율이 ' + XP.brkWarn + '가 아니다(' + BM(b, s) + ')');
    b.incite = 2; brkOut(b, s); t(C.n === 0 && backWhy(b, 'brk') && vulnOf(s) > 0 && rioters(b).every(r => r.stun >= 1) && !b.incite && near(R_('w3HitMul')(b, s, {}), 1, 1e-9), '대변인: 경고 칸에서 무너뜨렸는데 0칸 · 흩어짐 · 선동 풀림이 아니다(' + C.n + ')'); }
  /* 결정적 답 ② 골드 뿌리기(실제 행동) → 0칸 · 골드 −gold · 흩어짐 */
  { const { f, b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk, run = f.run;
    t(!goldA(b), '대변인: 칸이 없는데 골드 뿌리기가 보인다'); toWarn(b, s); run.gold = XP.gold - 1; t(goldA(b) && !goldA(b).ok, '대변인: 골드가 모자란데 골드 뿌리기를 쓸 수 있다');
    run.gold = 100; const a = goldA(b); t(a && a.ok && a.self && !/군중이 흩|시계|칸|되감|0칸/.test(a.n + a.d), '대변인: 골드 뿌리기가 없거나 이름 · 설명이 시계를 알려 준다(' + (a && a.n + ' / ' + a.d) + ')');
    H.act(f, 'tossgold', null); t(C.n === 0 && run.gold === 100 - XP.gold && backWhy(b, 'gold') && vulnOf(s) > 0 && rioters(b).every(r => r.stun >= 1), '대변인: 경고 칸에서 골드를 뿌렸는데 0칸 · 골드 −' + XP.gold + ' · 흩어짐이 아니다(' + C.n + ' / ' + run.gold + ')');
    t(!goldA(b), '대변인: 칸이 0인데 골드 뿌리기가 남았다'); }
  /* 평소 행동: 폭도 쓰러뜨리기 · 광역은 경고 칸에서도 1칸, 라운드에 한 번(보상 없음) */
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; b.round = 3; toWarn(b, s); const r = rioters(b);
    E.hurtEnemy(b, r[0], 9999, { single: 1 }); t(C.n === M - 2 && vulnOf(s) === 0, '대변인: 경고 칸에서 폭도를 쓰러뜨려 1칸(보상 없음)이 아니다(' + C.n + ')');
    E.hurtEnemy(b, r[1], 9999, { single: 1 }); t(C.n === M - 2, '대변인: 한 라운드에 평소 되감기가 두 번 들었다(' + C.n + ')');
    const r2 = R_('spawn')(b, 'rioter'); myAct(b, 'f_topple', () => E.hurtEnemy(b, r2, 1, { aoe: 1 })); t(C.n === M - 2, '대변인: 광역이 라운드 한도를 넘었다(' + C.n + ')');
    b.round = 4; C.n = M - 1; myAct(b, 'f_topple', () => { E.hurtEnemy(b, s, 1, { aoe: 1 }); E.hurtEnemy(b, r2, 1, { aoe: 1 }); }); t(C.n === M - 2 && vulnOf(s) === 0, '대변인: 경고 칸의 광역이 1칸(보상 없음)이 아니다(' + C.n + ')');
    b.round = 5; C.n = 1; E.hurtEnemy(b, R_('spawn')(b, 'rioter'), 9999, { single: 1 }); t(C.n === 0 && vulnOf(s) === 0, '대변인: 평소 되감기로 0칸이 되었는데 보상이 들었다'); }
  /* 경고 칸이 아닐 때: 골드 · 무너뜨리기도 1칸, 라운드에 한 번 */
  if (M >= 3) { const { f, b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk, run = f.run; run.gold = 100; b.round = 3; C.n = M - 2;
    H.act(f, 'tossgold', null); t(C.n === M - 3 && run.gold === 100 - XP.gold && vulnOf(s) === 0, '대변인: 경고 칸이 아닌 골드가 1칸이 아니다(' + C.n + ')');
    if (C.n > 0) t(goldA(b) && !goldA(b).ok, '대변인: 같은 라운드에 골드 뿌리기를 또 쓸 수 있다');
    b.round = 4; C.n = M - 2; brkOut(b, s); t(C.n === M - 3, '대변인: 경고 칸이 아닌 무너뜨리기가 1칸이 아니다(' + C.n + ')'); }
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); t(near(R_('w3HitMul')(b, s, {}), 1 - XP.cut, 1e-9), '대변인: 군중이 있는데 받는 피해 감소가 없다(시계 0칸)');
    const r = rioters(b); E.hurtEnemy(b, r[0], 9999, { single: 1 }); t(near(R_('w3HitMul')(b, s, {}), 1, 1e-9), '대변인: 폭도가 군중(' + XP.need + ') 아래인데 감소가 남았다'); }
  { const { b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); const n0 = s.clk.n; p.stun = 1; w3Act(b, s, { k: 'rally3' }, 10); t(s.clk.n === n0 && s.clk.stop === 1, '대변인: 기절 중에 시계가 멈추지 않았다'); }
  { const f0 = H.fight('warden', { en: ['bellman'], hp: 300, ctx: { ch: 3, floor: 10, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = 'speaker'; } }); const s0 = f0.es[0], dm = s0.dmg, bm = s0.bigMul = 3;
    R_('w3Setup')(f0.b, { floor: 10, strong: NAMES.speaker, foe: 'speaker', lv: 12 }); t(near(s0.dmg, dm * (XP.atk || 1), 1e-9) && near(s0.dmg * s0.bigMul, dm * bm, 1e-9), '대변인: 평소 공격만 ×' + XP.atk + '(큰 한 방은 그대로)가 아니다'); }
}

/* 4 성벽 위의 명사수 */
{
  const XM = X.marksman, D = common('marksman', XM.max), M = XM.max;
  const toWarn = (b, s) => { for (let k = 0; k < M - 1; k++) w3Act(b, s, { k: 'aimx' }, 10); };
  const dropped = s => s.row === 'front' && s.dropT > 0;
  { const { b, s, p } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; t(s.row === 'back' && C.n === 0 && C.max === M, '명사수: 후열 · 0/' + M + '이 아니다');
    toWarn(b, s); t(C.n === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '명사수: 마지막 경고가 없다');
    s.acts = 0; R_('decideIntent')(b, s); t(s.intent.k === 'oneshot', '명사수: 경고 칸인데 한 발 예고가 아니다(' + s.intent.k + ')');
    w3Act(b, s, { k: 'oneshot' }, 10); t(C.n === M - 1 && !recN(b, 'clkdoom'), '명사수: 경고한 그 차례에 쐈다');
    next(b); full(p); p.guard = 1; p.evade = 3; const h0 = p.hp; w3Act(b, s, { k: 'oneshot' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, XM.shot) && C.n === 0 && p.evade === 3, '명사수: 한 발 ' + XM.shot + '가 방어 · 몸 빼기로 줄었거나 아니다(' + d.toFixed(3) + ')'); p.evade = 0; }
  /* 결정적 답 ① 한 발 예고에 흘리기 */
  { const { b, s, p } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; toWarn(b, s); s.intent = { k: 'oneshot' }; next(b); full(p); p.dodge = s.id; const h0 = p.hp; w3Act(b, s, { k: 'oneshot' }, 10);
    t(p.hp === h0 && !p.dodge && C.n === 0 && !recN(b, 'clkdoom') && backWhy(b, 'parry') && dropped(s), '명사수: 경고 칸에서 흘렸는데 피해 0 · 0칸 · 엄폐를 잃음이 아니다(' + C.n + ')'); }
  /* 결정적 답 ② 원거리 한 번 ③ 광역 한 번 */
  { const { b, s } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; toWarn(b, s); s.intent = { k: 'oneshot' }; b.p.build = 'hunter';
    myAct(b, 'basic', () => E.hurtEnemy(b, s, 1, { single: 1 })); b.p.build = 'warden';
    t(C.n === 0 && backWhy(b, 'hit') && dropped(s) && s.intent.k !== 'oneshot', '명사수: 경고 칸에서 원거리 한 번에 0칸 · 엄폐를 잃음이 아니다(' + C.n + ')'); }
  { const { b, s } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; toWarn(b, s);
    myAct(b, 'f_topple', () => E.hurtEnemy(b, s, 1, { aoe: 1 })); t(C.n === 0 && backWhy(b, 'hit') && dropped(s), '명사수: 경고 칸에서 광역 한 번에 0칸이 아니다(' + C.n + ')'); }
  /* 결정적 답 ④ 조준 중 무너뜨리기 */
  { const { b, s } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; toWarn(b, s); s.intent = { k: 'oneshot' };
    brkOut(b, s); t(C.n === 0 && backWhy(b, 'drop') && dropped(s), '명사수: 조준 중 무너뜨려 0칸 · 전열로 떨어짐이 아니다(' + C.n + ')');
    b.cur = { id: 'basic' }; const m = R_('w3HitMul')(b, s, {}); b.cur = null; t(near(m, XM.dropHit, 1e-9), '명사수: 떨어진 뒤 엄폐 없음 · 받는 피해 증가가 아니다(' + m + ')'); }
  /* 평소 되감기: 경고 칸이 아니면 원거리 · 광역 두 번에 1칸, 라운드에 한 번 · 엄폐를 잃지 않음 */
  if (M >= 3) { const { b, s } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; w3Act(b, s, { k: 'aimx' }, 10); b.round = 3; C.n = M - 2; b.p.build = 'hunter';
    myAct(b, 'basic', () => E.hurtEnemy(b, s, 1, { single: 1 })); t(C.n === M - 2, '명사수: 경고 칸이 아닌데 원거리 한 번에 흔들렸다');
    myAct(b, 'basic', () => E.hurtEnemy(b, s, 1, { single: 1 })); t(C.n === M - 3 && !dropped(s), '명사수: 원거리 두 번에 1칸(엄폐 그대로)이 아니다(' + C.n + ')');
    C.n = M - 2; myAct(b, 'basic', () => E.hurtEnemy(b, s, 1, { single: 1 })); myAct(b, 'basic', () => E.hurtEnemy(b, s, 1, { single: 1 })); t(C.n === M - 2, '명사수: 한 라운드에 평소 되감기가 두 번 들었다(' + C.n + ')');
    b.p.build = 'warden'; }
  { const { b, s, p } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); p.stun = 1; w3Act(b, s, { k: 'aimx' }, 10); t(s.clk.n === 0 && s.clk.stop === 1, '명사수: 기절 중에 시계가 멈추지 않았다'); }
}

/* 5 성벽에 녹아든 수비대장: 시계 = 내 잠식(화면의 잠식 칩을 비춘다) */
{
  const XW = X.wallcap, D = common('wallcap', XW.max), M = XW.max;
  const toWarn = (b, s) => { for (let k = 0; k < M - 1; k++) { fcEv(b, 'onRoundEnd'); next(b); } };
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk, K = b.en.filter(e => e.role === 'brick');
    t(K.length === XW.bricks && K.every(k => k.brkMax === XW.brk) && XW.brk <= 35 * BR.heavyMul, '수비대장: 벽돌 수 · 붕괴 상한(강공격 한 번)이 아니다');
    t(M <= R_('CH3X').taintCap, '수비대장: 칸 수가 잠식 상한보다 크다');
    toWarn(b, s); t(C.n === M - 1 && p.taint === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '수비대장: 라운드마다 잠식 +1 · 마지막 경고가 아니다(' + C.n + '/' + p.taint + ')');
    full(p); p.guard = 1; const h0 = p.hp; fcEv(b, 'onRoundEnd'); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, XW.fall * 0.5) && p.stun === 1 && p.taint === 0 && C.n === 0 && recN(b, 'clkdoom') === 1, '수비대장: 「성벽에 묻힘」(방어 절반) · 행동 불가 · 잠식 0이 아니다(' + d.toFixed(3) + ' 기절 ' + p.stun + ')'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk; R_('taintAdd')(b, p, 2, '시험'); t(C.n === 2 && p.taint === 2, '수비대장: 다른 잠식도 시계를 채워야 한다(' + C.n + ')');
    R_('taintAdd')(b, p, M, '시험'); t(C.n === M - 1 && p.taint === M - 1 && !recN(b, 'clkdoom'), '수비대장: 잠식이 경고 없이 다 찼다(' + C.n + ')'); }
  /* 결정적 답 ① 정화 플라스크 ② 정화 스킬 ③ 벽돌 하나 무너뜨리기 → 잠식 0 · 취약 */
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk; toWarn(b, s); p.flask.mana = 1; fcEv(b, 'onFlask', p, 'mana');
    t(C.n === 0 && p.taint === 0 && backWhy(b, 'clean0') && vulnOf(s) > 0, '수비대장: 경고 칸에서 정화 플라스크로 0칸 · 보상이 아니다(' + C.n + '/' + p.taint + ')'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk; toWarn(b, s); fcEv(b, 'onSkill', p, { s: { fx: [{ k: 'cleanse' }] } });
    t(C.n === 0 && p.taint === 0 && backWhy(b, 'clean0'), '수비대장: 경고 칸에서 정화 스킬로 0칸이 아니다(' + C.n + ')'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk, K = b.en.filter(e => e.role === 'brick'); toWarn(b, s);
    brkOut(b, K[0]); t(C.n === 0 && p.taint === 0 && backWhy(b, 'brick0') && vulnOf(s) > 0, '수비대장: 경고 칸에서 벽돌 하나를 무너뜨렸는데 0칸 · 보상이 아니다(' + C.n + ')'); }
  { const { f, b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const K = b.en.filter(e => e.role === 'brick'); toWarn(b, s); // 실제 강공격 한 번
    H.act(f, 'heavy', K[0]); t(K[0].fallen && s.clk.n === 0 && p.taint === 0, '수비대장: 근접 강공격 한 번으로 벽돌이 무너지지 않았다(시계 ' + s.clk.n + ')'); }
  /* 경고 칸이 아니면: 정화 −clean · 벽돌 −brickBack(잠식 수를 그대로 비춘다) */
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk, K = b.en.filter(e => e.role === 'brick'); for (let k = 0; k < M - 2; k++) { fcEv(b, 'onRoundEnd'); next(b); }
    const t0 = p.taint; p.flask.mana = 1; fcEv(b, 'onFlask', p, 'mana'); t(C.n === Math.max(0, t0 - XW.clean) && p.taint === C.n && vulnOf(s) === 0, '수비대장: 경고 칸이 아닌 정화가 −' + XW.clean + '이 아니다(' + C.n + ')');
    R_('taintAdd')(b, p, 2, '시험'); const t1 = p.taint; brkOut(b, K[0]); t(C.n === Math.max(0, t1 - XW.brickBack) && p.taint === C.n, '수비대장: 경고 칸이 아닌 벽돌이 −' + XW.brickBack + '이 아니다(' + t1 + '→' + C.n + ')');
    p.taint = 0; fcEv(b, 'onFoeAct', s); t(C.n === 0, '수비대장: 성수(잠식 0)에 시계가 따라오지 않는다(' + C.n + ')');
    for (const k of K.filter(k => k.alive)) brkOut(b, k); t(s.armorOff === 1 && vulnOf(s) > 0 && s.wcBareT === (b.tick || 0) + XW.bare, '수비대장: 벽돌을 다 무너뜨린 보상(갑옷 벗겨짐 · 취약)이 없다');
    fcEv(b, 'onRoundEnd'); t(C.n === 0, '수비대장: 벽돌이 다 무너졌는데 잠식이 찼다');
    b.tick = (b.tick || 0) + XW.bare; fcEv(b, 'onRoundEnd'); t(s.armorOff === 0, '수비대장: 보상 길이 뒤 갑옷이 돌아오지 않았다'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); p.stun = 1; fcEv(b, 'onRoundEnd'); t(s.clk.n === 0 && (p.taint || 0) === 0 && s.clk.stop === 1, '수비대장: 기절 중에 시계가 멈추지 않았다'); }
  { const f0 = H.fight('warden', { en: ['wallguard'], hp: 300, ctx: { ch: 3, floor: 10, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = 'wallcap'; } }); const s0 = f0.es[0], dm = s0.dmg, bm = s0.bigMul = 3;
    R_('w3Setup')(f0.b, { floor: 10, strong: NAMES.wallcap, foe: 'wallcap', lv: 12 }); t(near(s0.dmg, dm * XW.atk, 1e-9) && near(s0.dmg * s0.bigMul, dm * bm, 1e-9), '수비대장: 평소 공격만 ×' + XW.atk + '(큰 한 방은 그대로)가 아니다'); }
}

console.log('clock-ch3-check: 시험 ' + n + ' · 실패 ' + T.length);
for (const m of T) console.log('  실패: ' + m);
if (T.length) process.exit(1);
