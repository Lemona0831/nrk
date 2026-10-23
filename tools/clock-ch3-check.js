'use strict';
/* G-1 3챕터 강적 시계 단위 시험 2판 (js/15-chapter3.js W3_CLOCK · js/25-foe-clock.js). 규칙은 비공개 문서 참조.
   강적 다섯마다: 시계 정의 · 답 태그 2종 이상 · 마지막 경고(답을 알려 주지 않음) · 경고 뒤 기다림 · 파국 · 결정적 답(마지막 경고 칸에서 한 행동 → 0칸 + 보상) ·
   평소 되감기(경고 칸이 아니면 1칸 · 라운드에 한 번, 화면의 수를 비추는 시계는 예외) · 멈춤. 칸 수 · 세기 · 보상 길이는 FOE_X에서 읽는다(손잡이를 바꿔도 시험은 그대로).
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

/* 1 봉화대장: 시계 = 가장 먼저 터질 봉화의 남은 칸(화면의 수를 비춘다) */
{
  const XB = X.beaconlord, D = common('beaconlord', XB.fuse), M = XB.fuse;
  const toWarn = (b, s) => { for (let k = 0; k < M - 1; k++) w3Act(b, s, { k: 'pourbeacon' }, 10); };
  { const { b, s, p } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    t(L.length === XB.fires && L.every(x => x.fuse === M) && C && C.n === 0 && C.max === M, '봉화대장: 봉화 수 · 칸 · 시계 0/' + M + '가 아니다'); t(s.intent && s.intent.k === 'pourbeacon', '봉화대장: 봉화가 선 뒤 첫 예고가 기름 붓기가 아니다(' + (s.intent && s.intent.k) + ')');
    toWarn(b, s); t(C.n === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '봉화대장: ' + (M - 1) + '/' + M + '에서 마지막 경고가 없다(' + C.n + ')');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(L.every(x => x.alive) && C.n === M - 1, '봉화대장: 경고한 그 차례에 터졌다');
    next(b); const en0 = b.en.length; const d1 = lost(p, () => w3Act(b, s, { k: 'pourbeacon' }, 10));
    t(near(d1, XB.boom) && L.filter(x => x.alive).length === XB.fires - 1 && recN(b, 'clkdoom') === 1, '봉화대장: 첫 폭발 ' + XB.boom + '가 아니다(' + d1.toFixed(3) + ')');
    t(b.en.length === en0 + 1 && b.en[b.en.length - 1].reinf, '봉화대장: 폭발에 경보 한 칸(증원)이 없다');
    t(C.n === 0, '봉화대장: 터진 뒤 다음 봉화로 시계가 돌아오지 않았다(' + C.n + ')');
    toWarn(b, s); next(b); const d2 = lost(p, () => w3Act(b, s, { k: 'pourbeacon' }, 10));
    t(near(d2, XB.boom * XB.chain) && recN(b, 'clkdoom') === 2, '봉화대장: 둘째 폭발 ×' + XB.chain + '가 아니다(' + d2.toFixed(3) + ')'); }
  /* 결정적 답 ① 가장 먼저 터질 봉화를 한 행동으로 무너뜨리기 → 0칸 · 남은 봉화 칸이 가득 · 불길(보상) */
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    t(XB.brkHot <= 35 * BR.heavyMul, '봉화대장: 곧 터질 봉화의 붕괴 상한 ' + XB.brkHot + '이 강공격 한 번(' + (35 * BR.heavyMul).toFixed(0) + ')보다 크다');
    toWarn(b, s); if (M > 2) w3Act(b, s, { k: 'pourbeacon', all: 1 }, 10); const hot = L.slice().sort((x, y) => x.fuse - y.fuse)[0]; t(C.n === M - 1, '봉화대장: 답 시험 전 경고 칸이 아니다'); t(hot.brkMax === XB.brkHot && L.filter(x => x !== hot).every(x => x.brkMax === XB.brk), '봉화대장: 곧 터질 봉화만 붕괴 상한이 낮아야 한다');
    brkOut(b, hot); t(!hot.alive && C.n === 0 && backWhy(b, 'brk') && L.filter(x => x.alive).every(x => x.fuse === M && x.brkMax === XB.brk), '봉화대장: 경고 칸에서 봉화를 무너뜨렸는데 0칸 · 남은 봉화 가득이 아니다(' + C.n + ')');
    t(st(s, 'ignite') >= XB.rewIg && vulnOf(s) > 0, '봉화대장: 결정적 답의 보상(불길 · 취약)이 없다');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(C.n === 1 && !recN(b, 'clkdoom'), '봉화대장: 답한 뒤 다음 기름이 1칸이 아니다(' + C.n + ')'); }
  { const { f, b, s } = mk('beaconlord', ['pike', 'beacon'], 'hunter'); const L = b.en.filter(e => e.role === 'bonfire'); toWarn(b, s); const hot = L.slice().sort((x, y) => x.fuse - y.fuse)[0]; // 실제 강공격 한 번(후열 봉화: 원거리)
    H.act(f, 'heavy', hot); t(!hot.alive && s.clk.n === 0, '봉화대장: 원거리 강공격 한 번으로 가장 먼저 터질 봉화가 무너지지 않았다(붕괴 ' + Math.round(hot.brk) + '/' + hot.brkMax + ', 시계 ' + s.clk.n + ')'); }
  /* 결정적 답 ② 광역 한 번 */
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    myAct(b, 'f_topple', () => E.hurtEnemy(b, L[1], 1, { aoe: 1 })); t(C.n === 0 && !backWhy(b, 'aoe'), '봉화대장: 경고 칸이 아닌데 광역이 무엇을 했다');
    toWarn(b, s); myAct(b, 'f_topple', () => { for (const x of L) E.hurtEnemy(b, x, 1, { aoe: 1 }); });
    t(C.n === 0 && backWhy(b, 'aoe') && L.every(x => x.alive && x.fuse === M) && vulnOf(s) > 0, '봉화대장: 경고 칸에서 광역 한 번에 0칸 · 보상이 아니다(' + C.n + ')'); }
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

/* 3 탄원자들의 대변인 */
{
  const XP = X.speaker, D = common('speaker', XP.max), M = XP.max;
  const toWarn = (b, s) => { for (let k = 0; k < 4 && s.clk.n < M - 1; k++) w3Act(b, s, { k: 'rally3' }, 10); };
  const rioters = b => b.en.filter(e => e.alive && e.role === 'rioter' && !e.strong);
  { const { b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; t(C.n === Math.min(2, M - 1) && C.max === M, '대변인: 폭도 둘로 시작해 2칸이 아니다(' + C.n + ')');
    toWarn(b, s); t(C.n === M - 1 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '대변인: 부르기가 경고 없이 다 찼거나 마지막 경고가 없다(' + C.n + ')');
    w3Act(b, s, { k: 'rally3' }, 10); t(C.n === M - 1 && !recN(b, 'clkdoom'), '대변인: 경고한 그 차례에 밀어닥쳤다');
    next(b); full(p); p.guard = 1; const h0 = p.hp; w3Act(b, s, { k: 'rally3' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, XP.push * M * 0.5) && C.n === 0 && recN(b, 'clkdoom') === 1, '대변인: 「성문을 열어라」(방어 절반 ' + (XP.push * M * 0.5).toFixed(2) + ')가 아니다(' + d.toFixed(3) + ')'); }
  /* 폭도가 서 있는 라운드 끝마다 군중이 불어난다 */
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk, n0 = C.n; fcEv(b, 'onRoundEnd'); t(C.n === Math.min(M - 1, n0 + XP.grow), '대변인: 폭도가 있는데 라운드 끝에 군중이 불지 않았다(' + C.n + ')'); C.n = M - 1; next(b); next(b); fcEv(b, 'onRoundEnd'); t(C.n === M - 1 && !recN(b, 'clkdoom'), '대변인: 라운드 끝 불어남이 파국을 냈다(파국은 부르기로만)');
    const rs = rioters(b); for (const r of rs.slice(0, rs.length - XP.need + 1)) { r.alive = false; r.hp = 0; } const n1 = C.n; fcEv(b, 'onRoundEnd'); t(C.n === n1, '대변인: 폭도가 군중(' + XP.need + ') 아래인데 군중이 불었다'); }
  /* 결정적 답 ① 광역 한 번 ② 대변인 무너뜨리기 */
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; toWarn(b, s); const r = rioters(b);
    myAct(b, 'f_topple', () => { for (const x of r) E.hurtEnemy(b, x, 1, { aoe: 1 }); }); t(C.n === 0 && backWhy(b, 'aoe') && vulnOf(s) > 0, '대변인: 경고 칸에서 광역 한 번에 0칸 · 보상이 아니다(' + C.n + ')'); }
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; toWarn(b, s);
    brkOut(b, s); t(C.n === 0 && backWhy(b, 'brk') && vulnOf(s) > 0, '대변인: 경고 칸에서 무너뜨렸는데 0칸이 아니다(' + C.n + ')'); }
  /* 평소 되감기: 폭도 하나 · 광역은 1칸, 라운드에 한 번 */
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; w3Act(b, s, { k: 'incite' }, 10); b.round = 3; C.n = M - 2; const r = rioters(b);
    E.hurtEnemy(b, r[0], 9999, { single: 1 }); t(C.n === M - 3, '대변인: 폭도를 쓰러뜨려 1칸이 아니다(' + C.n + ')');
    E.hurtEnemy(b, r[1], 9999, { single: 1 }); t(C.n === M - 3, '대변인: 한 라운드에 평소 되감기가 두 번 들었다(' + C.n + ')');
    const r2 = R_('spawn')(b, 'rioter'); myAct(b, 'f_topple', () => E.hurtEnemy(b, r2, 1, { aoe: 1 })); t(C.n === M - 3, '대변인: 경고 칸이 아닌 광역이 라운드 한도를 넘었다(' + C.n + ')');
    b.round = 4; myAct(b, 'f_topple', () => E.hurtEnemy(b, r2, 1, { aoe: 1 })); t(C.n === Math.max(0, M - 4), '대변인: 다음 라운드 광역이 1칸이 아니다(' + C.n + ')'); }
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const r = rioters(b); t(near(R_('w3HitMul')(b, s, {}), 1 - XP.cut, 1e-9), '대변인: 군중이 있는데 받는 피해 감소가 없다');
    E.hurtEnemy(b, r[0], 9999, { single: 1 }); s.clk.n = 1; b.round = 9; E.hurtEnemy(b, r[1], 9999, { single: 1 }); t(s.clk.n === 0 && vulnOf(s) > 0, '대변인: 군중 0 보상(취약)이 없다');
    const r2 = R_('spawn')(b, 'rioter'), r3 = R_('spawn')(b, 'rioter'); t(r2 && r3 && near(R_('w3HitMul')(b, s, {}), 1, 1e-9), '대변인: 군중 0인데 감소가 풀리지 않았다'); }
  { const { b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); const n0 = s.clk.n; p.stun = 1; w3Act(b, s, { k: 'rally3' }, 10); t(s.clk.n === n0 && s.clk.stop === 1, '대변인: 기절 중에 시계가 멈추지 않았다'); }
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
