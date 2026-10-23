'use strict';
/* G-1 3챕터 강적 시계 단위 시험 (js/15-chapter3.js W3_CLOCK · js/25-foe-clock.js). 규칙은 비공개 문서 참조.
   강적 다섯마다: 시계 정의 · 답 태그 2종 이상 · 마지막 경고 · 파국 · 답 · 보상 · 멈춤(내용은 비공개 문서 참조).
   쓰기: node tools/clock-ch3-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const H = require('./uqtest/_h.js'); const { E, R_ } = H;
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
R_('w3ClockReg')();
const FC = R_('FOE_CLOCK'), X = R_('FOE_X'), fcEv = R_('fcEv'), w3Act = R_('w3Act'), st = H.st;
const TAGS = ['brk', 'aoe', 'ranged', 'dot', 'kill', 'parry', 'guard', 'cons', 'gold'];
const TELLS = /붕괴|무너뜨|흘리|흘려|광역|원거리|정화|부수|부숴|쓰러뜨|플라스크|방어|막아|막으/; // 마지막 경고가 답을 알려 주면 안 된다
const NAMES = { beaconlord: '봉화대장', siege: '공성 기술자', speaker: '탄원자들의 대변인', marksman: '성벽 위의 명사수', wallcap: '성벽에 녹아든 수비대장' };
const mk = (foe, en) => {
  const f = H.fight('warden', { en, hp: 300, ctx: { ch: 3, floor: 10, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = foe; es[0].elite = true; es[0].bigMul = 3; } });
  const b = f.b, s = f.es[0]; b.cur = null; R_('w3Setup')(b, { floor: 10, strong: NAMES[foe], foe, lv: 12, path: 'main' }); fcEv(b, 'onRoomStart');
  const p = b.p; p.hp = p.hpMax; p.stun = 0; p.guard = 0; p.dodge = 0; p.ward = 0; p.s = {}; p.taint = p.taint || 0; b.rec = b.rec || [];
  return { f, b, s, p };
};
const full = p => { p.hp = p.hpMax; p.guard = 0; p.dodge = 0; p.ward = 0; p.s = {}; };
const lost = (p, fn) => { full(p); const h0 = p.hp; fn(); return (h0 - p.hp) / p.hpMax; };
const near = (a, x, eps) => Math.abs(a - x) < (eps || 0.015);
const recN = (b, k) => b.rec.filter(r => r.k === k).length;
const logHas = (b, s) => b.log.some(l => l.m.includes(s));
const brkOut = (b, e) => { e.brk = (e.brkMax || 100) - 0.01; E.addBreak(b, e, 999); };
const next = b => { b.turnIdx = (b.turnIdx || 0) + 1; };
function common(foe) {
  const D = FC[foe]; t(!!D, foe + ': 시계 정의가 없다'); if (!D) return null;
  const A = new Set(D.ans); t(A.size >= 2 && [...A].every(x => TAGS.includes(x)), foe + ': 답 태그 ' + JSON.stringify(D.ans));
  t(typeof D.doom === 'function' && typeof D.warn === 'function' && D.max >= 2 && typeof D.blocked === 'function', foe + ': doom · warn · max · blocked');
  t(!TELLS.test(D.warn()), foe + ': 마지막 경고가 답을 알려 준다: ' + D.warn());
  return D;
}

/* 1 봉화대장 */
{
  const D = common('beaconlord');
  { const { b, s, p } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    t(L.length === 3 && L.every(x => x.fuse === 3) && C && C.n === 0 && C.max === 3, '봉화대장: 봉화 셋 · 칸 3 · 시계 0/3이 아니다');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(C.n === 1, '봉화대장: 기름 한 번에 1/3이 아니다(' + C.n + ')');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(C.n === 2 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '봉화대장: 2/3에서 마지막 경고가 없다');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(L.every(x => x.alive) && C.n === 2, '봉화대장: 경고한 그 차례에 터졌다');
    next(b); const en0 = b.en.length; const d1 = lost(p, () => w3Act(b, s, { k: 'pourbeacon' }, 10));
    t(near(d1, X.beaconlord.boom) && L.filter(x => x.alive).length === 2 && recN(b, 'clkdoom') === 1, '봉화대장: 첫 폭발 30%가 아니다(' + d1.toFixed(3) + ')');
    t(b.en.length === en0 + 1 && b.en[b.en.length - 1].reinf, '봉화대장: 폭발에 경보 한 칸(증원)이 없다');
    t(C.n === 0, '봉화대장: 터진 뒤 다음 봉화로 시계가 돌아오지 않았다(' + C.n + ')');
    w3Act(b, s, { k: 'pourbeacon' }, 10); w3Act(b, s, { k: 'pourbeacon' }, 10); next(b); const d2 = lost(p, () => w3Act(b, s, { k: 'pourbeacon' }, 10));
    t(near(d2, X.beaconlord.boom * X.beaconlord.chain), '봉화대장: 둘째 폭발 45%가 아니다(' + d2.toFixed(3) + ')');
    p.guard = 0; w3Act(b, s, { k: 'pourbeacon' }, 10); w3Act(b, s, { k: 'pourbeacon' }, 10); next(b); full(p); p.guard = 1; const h0 = p.hp; w3Act(b, s, { k: 'pourbeacon' }, 10); const d3 = (h0 - p.hp) / p.hpMax;
    t(near(d3, X.beaconlord.boom * X.beaconlord.chain * X.beaconlord.chain * 0.5), '봉화대장: 셋째 폭발(68%)을 방어로 절반이 아니다(' + d3.toFixed(3) + ')'); }
  { const { b, s } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); const C = s.clk;
    w3Act(b, s, { k: 'pourbeacon' }, 10); w3Act(b, s, { k: 'pourbeacon' }, 10); const hot = L.find(x => x.fuse === 1);
    brkOut(b, hot); t(!hot.alive && C.n === 0, '봉화대장: 봉화를 부숴도 시계가 되감기지 않았다(' + C.n + ')');
    w3Act(b, s, { k: 'pourbeacon' }, 10); t(C.n === 1, '봉화대장: 부순 뒤 다음 봉화로 시계가 돌지 않는다');
    s.intent = { k: 'pourbeacon' }; s.teleSet = s.intent; brkOut(b, s); const f0 = L.map(x => x.fuse).join(); R_('enemyAct')(b, s); t(L.map(x => x.fuse).join() === f0, '봉화대장: 무너진 라운드에 기름을 부었다');
    for (const x of L.filter(x => x.alive)) brkOut(b, x); t(s.stun >= 1 && st(s, 'ignite') >= 3 && st(s, 'vuln') > 0 && C.n === 0, '봉화대장: 봉화를 다 부순 보상(불길 · 화상 3 · 취약)이 없다'); }
  { const { b, s, p } = mk('beaconlord', ['pike', 'beacon']); const L = b.en.filter(e => e.role === 'bonfire'); p.stun = 1; w3Act(b, s, { k: 'pourbeacon' }, 10);
    t(L.every(x => x.fuse === 3) && s.clk.n === 0 && s.clk.stop === 1, '봉화대장: 기절 중에 시계가 멈추지 않았다'); }
}

/* 2 공성 기술자 */
{
  const D = common('siege');
  { const { b, s, p } = mk('siege', ['sapper', 'wallguard']); const C = s.clk; const parts = b.en.filter(e => e.role === 'rampart');
    t(parts.length === 2 && C.n === 0 && C.max === 4, '공성 기술자: 부품 둘 · 0/4가 아니다');
    for (let k = 0; k < 3; k++) w3Act(b, s, { k: 'assemble' }, 10); t(C.n === 3 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '공성 기술자: 3/4 마지막 경고가 없다');
    s.acts = 0; s.intent = null; R_('decideIntent')(b, s); t(s.intent.k === 'launch', '공성 기술자: 3/4인데 발사 예고가 아니다(' + s.intent.k + ')');
    w3Act(b, s, { k: 'launch' }, 10); t(C.n === 3 && !recN(b, 'clkdoom'), '공성 기술자: 경고한 그 차례에 발사했다');
    next(b); full(p); p.guard = 1; const h0 = p.hp; w3Act(b, s, { k: 'launch' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, X.siege.launch) && C.n === 0 && recN(b, 'clkdoom') === 1, '공성 기술자: 발사 80%가 방어로 줄었거나 아니다(' + d.toFixed(3) + ')');
    for (let k = 0; k < 3; k++) w3Act(b, s, { k: 'assemble' }, 10); next(b); full(p); p.dodge = s.id; const h1 = p.hp; w3Act(b, s, { k: 'launch' }, 10); const d2 = (h1 - p.hp) / p.hpMax;
    t(near(d2, X.siege.launch * 0.5) && !p.dodge, '공성 기술자: 발사를 흘려 절반이 아니다(' + d2.toFixed(3) + ')');
    for (let k = 0; k < 3; k++) w3Act(b, s, { k: 'assemble' }, 10); brkOut(b, parts[0]); t(!parts[0].alive && C.n === 2, '공성 기술자: 부품을 부숴 진척 −1이 아니다(' + C.n + ')');
    next(b); w3Act(b, s, { k: 'launch' }, 10); t(C.n === 3 && recN(b, 'clkdoom') === 2, '공성 기술자: 되감긴 뒤 발사 예고가 그대로 쐈다');
    s.intent = { k: 'assemble' }; s.teleSet = s.intent; brkOut(b, s); s.stun = 1; R_('enemyAct')(b, s); t(C.n === 3, '공성 기술자: 무너진 라운드에 조립했다'); }
  { const { b, s } = mk('siege', ['sapper', 'wallguard']); const parts = b.en.filter(e => e.role === 'rampart'); w3Act(b, s, { k: 'assemble' }, 10); s.stun = 0; delete s.s.vuln;
    brkOut(b, parts[1]); t(s.clk.n === 0 && s.stun >= 1 && st(s, 'vuln') > 0, '공성 기술자: 진척 0 보상(공구를 놓음 · 무방비)이 없다'); }
  { const { b, s, p } = mk('siege', ['sapper', 'wallguard']); p.stun = 1; w3Act(b, s, { k: 'assemble' }, 10); t(s.clk.n === 0 && s.clk.stop === 1, '공성 기술자: 기절 중에 시계가 멈추지 않았다'); }
}

/* 3 탄원자들의 대변인 */
{
  const D = common('speaker');
  { const { b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; t(C.n === 2 && C.max === 4, '대변인: 폭도 둘로 시작해 2/4가 아니다(' + C.n + ')');
    w3Act(b, s, { k: 'rally3' }, 10); t(C.n === 3 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '대변인: 부르기가 경고 없이 다 찼거나 3/4 경고가 없다(' + C.n + ')');
    w3Act(b, s, { k: 'rally3' }, 10); t(C.n === 3 && !recN(b, 'clkdoom'), '대변인: 경고한 그 차례에 밀어닥쳤다');
    next(b); full(p); p.guard = 1; const h0 = p.hp; w3Act(b, s, { k: 'rally3' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, X.speaker.push * 4 * 0.5) && C.n === 0 && recN(b, 'clkdoom') === 1, '대변인: 「성문을 열어라」 72%(방어 절반 36%)가 아니다(' + d.toFixed(3) + ')'); }
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const C = s.clk; w3Act(b, s, { k: 'rally3' }, 10);
    const r = b.en.filter(e => e.alive && e.role === 'rioter'); E.hurtEnemy(b, r[0], 9999, { single: 1 }); t(C.n === 2, '대변인: 폭도를 쓰러뜨려 군중 −1이 아니다(' + C.n + ')');
    b.cur = { id: 'f_topple' }; b.actN = 501; E.hurtEnemy(b, r[1], 1, { aoe: 1 }); E.hurtEnemy(b, r[2], 1, { aoe: 1 }); b.cur = null; t(C.n === 1, '대변인: 광역 한 번에 군중 −1이 아니다(' + C.n + ')');
    w3Act(b, s, { k: 'rally3' }, 10); const n0 = C.n; brkOut(b, s); t(C.n === Math.max(0, n0 - 2), '대변인: 무너뜨려 군중 −2가 아니다(' + n0 + '→' + C.n + ')'); }
  { const { b, s } = mk('speaker', ['bellman', 'rioter', 'rioter']); const r = b.en.filter(e => e.role === 'rioter'); t(near(R_('w3HitMul')(b, s, {}), 0.4, 1e-9), '대변인: 군중이 있는데 −60%가 없다');
    E.hurtEnemy(b, r[0], 9999, { single: 1 }); s.clk.n = 1; E.hurtEnemy(b, r[1], 9999, { single: 1 }); t(s.clk.n === 0 && st(s, 'vuln') > 0, '대변인: 군중 0 보상(취약 2)이 없다');
    const r2 = R_('spawn')(b, 'rioter'), r3 = R_('spawn')(b, 'rioter'); t(r2 && r3 && near(R_('w3HitMul')(b, s, {}), 1, 1e-9), '대변인: 군중 0인데 −60%가 풀리지 않았다'); }
  { const { b, s, p } = mk('speaker', ['bellman', 'rioter', 'rioter']); p.stun = 1; w3Act(b, s, { k: 'rally3' }, 10); t(s.clk.n === 2 && s.clk.stop === 1, '대변인: 기절 중에 시계가 멈추지 않았다'); }
}

/* 4 성벽 위의 명사수 */
{
  const D = common('marksman');
  { const { b, s, p } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; t(s.row === 'back' && C.n === 0 && C.max === 3, '명사수: 후열 · 0/3이 아니다');
    w3Act(b, s, { k: 'aimx' }, 10); w3Act(b, s, { k: 'aimx' }, 10); t(C.n === 2 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '명사수: 2/3 마지막 경고가 없다');
    s.acts = 0; R_('decideIntent')(b, s); t(s.intent.k === 'oneshot', '명사수: 2/3인데 한 발 예고가 아니다(' + s.intent.k + ')');
    w3Act(b, s, { k: 'oneshot' }, 10); t(C.n === 2 && !recN(b, 'clkdoom'), '명사수: 경고한 그 차례에 쐈다');
    next(b); full(p); p.guard = 1; p.evade = 3; const h0 = p.hp; w3Act(b, s, { k: 'oneshot' }, 10); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, X.marksman.shot) && C.n === 0 && p.evade === 3, '명사수: 한 발 75%가 방어 · 몸 빼기로 줄었거나 아니다(' + d.toFixed(3) + ')'); p.evade = 0;
    w3Act(b, s, { k: 'aimx' }, 10); w3Act(b, s, { k: 'aimx' }, 10); next(b); full(p); p.dodge = s.id; const h1 = p.hp; w3Act(b, s, { k: 'oneshot' }, 10); const d2 = (h1 - p.hp) / p.hpMax;
    t(near(d2, X.marksman.shot * 0.5), '명사수: 한 발을 흘려 절반이 아니다(' + d2.toFixed(3) + ')'); }
  { const { b, s } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; w3Act(b, s, { k: 'aimx' }, 10); w3Act(b, s, { k: 'aimx' }, 10);
    b.cur = { id: 'basic' }; b.p.build = 'hunter'; b.actN = 601; E.hurtEnemy(b, s, 1, { single: 1 }); t(C.n === 2, '명사수: 원거리 한 번에 흔들렸다'); b.actN = 602; E.hurtEnemy(b, s, 1, { single: 1 }); t(C.n === 1, '명사수: 원거리 두 번에 조준 −1이 아니다(' + C.n + ')');
    b.actN = 603; E.hurtEnemy(b, s, 1, { aoe: 1 }); b.actN = 604; E.hurtEnemy(b, s, 1, { aoe: 1 }); t(C.n === 0, '명사수: 광역 두 번에 조준 −1이 아니다(' + C.n + ')'); b.cur = null; b.p.build = 'warden'; }
  { const { b, s } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); const C = s.clk; w3Act(b, s, { k: 'aimx' }, 10); w3Act(b, s, { k: 'aimx' }, 10); s.intent = { k: 'oneshot' };
    brkOut(b, s); t(C.n === 0 && s.row === 'front' && s.dropT > 0, '명사수: 조준 중 무너뜨려 전열로 떨어지고 조준 0이 아니다');
    b.cur = { id: 'basic' }; const m = R_('w3HitMul')(b, s, {}); b.cur = null; t(near(m, X.marksman.dropHit, 1e-9), '명사수: 떨어진 뒤 엄폐 없음 · 받는 피해 +30%가 아니다(' + m + ')'); }
  { const { b, s, p } = mk('marksman', ['wallxbow', 'wallguard', 'pike']); p.stun = 1; w3Act(b, s, { k: 'aimx' }, 10); t(s.clk.n === 0 && s.clk.stop === 1, '명사수: 기절 중에 시계가 멈추지 않았다'); }
}

/* 5 성벽에 녹아든 수비대장 */
{
  const D = common('wallcap');
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk, K = b.en.filter(e => e.role === 'brick');
    t(K.length === 3 && K.every(k => k.brkMax === X.wallcap.brk) && X.wallcap.brk < 30, '수비대장: 벽돌 셋 · 붕괴 상한이 줄지 않았다');
    for (let k = 0; k < 4; k++) { fcEv(b, 'onRoundEnd'); next(b); } t(C.n === 4 && p.taint === 4 && recN(b, 'clkwarn') === 1 && logHas(b, D.warn()), '수비대장: 라운드마다 잠식 +1 · 4/5 경고가 아니다(' + C.n + '/' + p.taint + ')');
    full(p); p.guard = 1; const h0 = p.hp; fcEv(b, 'onRoundEnd'); const d = (h0 - p.hp) / p.hpMax;
    t(near(d, X.wallcap.fall * 0.5) && p.stun === 1 && p.taint === 0 && C.n === 0 && recN(b, 'clkdoom') === 1, '수비대장: 「성벽에 묻힘」 70%(방어 절반) · 행동 불가 · 잠식 0이 아니다(' + d.toFixed(3) + ' 기절 ' + p.stun + ')'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk; R_('taintAdd')(b, p, 3, '시험'); t(C.n === 3 && p.taint === 3, '수비대장: 다른 잠식도 시계를 채워야 한다(' + C.n + ')');
    R_('taintAdd')(b, p, 3, '시험'); t(C.n === 4 && !recN(b, 'clkdoom'), '수비대장: 잠식이 경고 없이 다 찼다(' + C.n + ')'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); const C = s.clk, K = b.en.filter(e => e.role === 'brick');
    for (let k = 0; k < 4; k++) { fcEv(b, 'onRoundEnd'); next(b); } p.flask.mana = 1; fcEv(b, 'onFlask', p, 'mana'); t(C.n === 2 && p.taint === 2, '수비대장: 정화 플라스크로 잠식 −2가 아니다(' + C.n + ')');
    p.taint = 0; fcEv(b, 'onFoeAct', s); t(C.n === 0, '수비대장: 성수(잠식 0)에 시계가 따라오지 않는다(' + C.n + ')');
    for (const k of K) brkOut(b, k); t(s.armorOff === 1 && st(s, 'vuln') > 0 && s.wcBareT === (b.tick || 0) + X.wallcap.bare, '수비대장: 벽돌 셋을 다 무너뜨린 보상(갑옷 벗겨짐 · 취약 2)이 없다');
    fcEv(b, 'onRoundEnd'); t(C.n === 0, '수비대장: 벽돌이 다 무너졌는데 잠식이 찼다');
    b.tick = (b.tick || 0) + X.wallcap.bare; fcEv(b, 'onRoundEnd'); t(s.armorOff === 0, '수비대장: 2라운드 뒤 갑옷이 돌아오지 않았다'); }
  { const { b, s, p } = mk('wallcap', ['wallguard', 'tainted']); p.stun = 1; fcEv(b, 'onRoundEnd'); t(s.clk.n === 0 && (p.taint || 0) === 0 && s.clk.stop === 1, '수비대장: 기절 중에 시계가 멈추지 않았다'); }
  { const f0 = H.fight('warden', { en: ['wallguard'], hp: 300, ctx: { ch: 3, floor: 10, mods: [] }, setup: (run, es) => { es[0].strong = true; es[0].foe = 'wallcap'; } }); const s0 = f0.es[0], dm = s0.dmg, bm = s0.bigMul = 3;
    R_('w3Setup')(f0.b, { floor: 10, strong: NAMES.wallcap, foe: 'wallcap', lv: 12 }); t(near(s0.dmg, dm * X.wallcap.atk, 1e-9) && near(s0.dmg * s0.bigMul, dm * bm, 1e-9), '수비대장: 평소 공격만 ×' + X.wallcap.atk + '(큰 한 방은 그대로)가 아니다'); }
}

console.log('clock-ch3-check: 시험 ' + n + ' · 실패 ' + T.length);
for (const m of T) console.log('  실패: ' + m);
if (T.length) process.exit(1);
