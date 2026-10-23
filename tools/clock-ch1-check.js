'use strict';
/* 0.8.0 G-1 1챕터 강적 시계 점검 (js/30 FOE_CLOCK 다섯, 틀은 js/25). 실행: node tools/clock-ch1-check.js
   강적마다: 시계가 있다 · 답이 두 종류 이상 · 한 칸 남으면 마지막 경고 · 다 차면 파국(정한 세기) · 답마다 되감김/멈춤 · 보상 · 답 수단이 모두 막히면 멈춤.
   규칙의 뜻은 비공개 문서 참조 */
const H = require('./uqtest/_h.js'); const { E, R_, ok } = H;
const FC = R_('FOE_CLOCK'), K = R_('CLK1');
const st = (u, k) => R_('st')(u, k);
/* 강적 하나 + 곁의 적. 적 피해는 작게(1), 붕괴 상한 100 */
function mk(foe, en, setup) {
  const f = H.fight('warden', { en: en || ['bruiser', 'bruiser'], setup: (run, es) => { es[0].strong = true; es[0].foe = foe; for (const e of es) e.brkMax = 100; if (setup) setup(run, es); } });
  const b = f.b; b.cur = null; b.rngF = () => 0.5; const e = f.es[0]; E.fcInit(b, e); b.p.hp = b.p.hpMax; b.p.stun = 0; b.p.guard = 0; b.p.dodge = 0; return { f, b, e, p: b.p };
}
const act = (b, e, k) => { e.intent = { k }; e.teleTurn = -1; e.stun = 0; E.enemyAct(b, e); };
const warned = b => b.log.some(l => /^⚠/.test(l.m));
const breakIt = (b, e) => { b.cur = null; e.brk = e.brkMax - 0.5; E.addBreak(b, e, 50); };
const near = (a, x, tol) => Math.abs(a - x) <= (tol || 0.02);
const lost = (x, f) => (x.hpBefore - x.p.hp) / x.p.hpMax;
function common(id) {
  const D = FC[id]; ok(!!D, id + ': 시계 정의가 없다'); if (!D) return;
  ok(new Set(D.ans || []).size >= 2, id + ': 답 종류가 둘 미만');
  ok(typeof D.warn === 'function' && typeof D.doom === 'function' && typeof D.blocked === 'function', id + ': warn · doom · blocked가 없다');
  const TAGS = ['brk', 'aoe', 'ranged', 'dot', 'kill', 'parry', 'guard', 'cons', 'gold']; ok((D.ans || []).every(t => TAGS.includes(t)), id + ': 모르는 답 태그 ' + D.ans);
}
const R = {};
/* ---------- 종지기 ---------- */
common('bellringer');
{ // 줄 당기기 4번 → 셋째에 경고, 넷째에 대종
  const x = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const { b, e, p } = x; const bell = x.f.es[2];
  act(b, e, 'ring'); act(b, e, 'ring'); ok(e.clk.n === 2 && !warned(b), '종지기: 두 번 당겨 2칸 · 경고 없음이 아니다 ' + e.clk.n);
  act(b, e, 'ring'); ok(e.clk.n === 3 && warned(b) && e.clk.warnN === 1, '종지기: 셋째에 경고가 없다');
  ok(b.log.some(l => l.m.includes(FC.bellringer.warn(b, e))), '종지기: 경고 문장이 기록에 없다');
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'ring'); const d = lost(x);
  ok(e.clk.perm === 1 && e.clk.doomN === 1 && !bell.alive && b.fcTwice === 1, '종지기: 대종이 오지 않았다(종이 깨지고 끝까지)');
  ok(near(d, K.bell.big), '종지기: 대종의 큰 한 방이 생명력 45%가 아니다 ' + d.toFixed(3));
  const ord = E.roundOrder(b, false); ok(ord.filter(o => o.twice).length >= 2, '종지기: 대종 뒤 적이 두 번 움직이지 않는다');
  act(b, e, 'ring'); ok(e.clk.perm === 1, '종지기: 대종 뒤 시계가 다시 돈다');
  E.decideIntent(b, e); ok(e.intent.k !== 'ring', '종지기: 대종 뒤에도 줄을 당기려 한다');
  R.bell = '대종 ' + (d * 100).toFixed(1) + '%';
}
{ // 줄을 당기는 차례에 흘리기: 금 −1
  const x = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const { b, e, p } = x;
  act(b, e, 'ring'); act(b, e, 'ring'); p.dodge = e.id; act(b, e, 'ring'); ok(e.clk.n === 1 && !p.dodge, '종지기: 흘리기로 금 −1이 아니다 ' + e.clk.n);
  // 종지기 무너뜨리기: 금 −2
  act(b, e, 'ring'); act(b, e, 'ring'); ok(e.clk.n === 3, '종지기: 3칸 준비 실패'); breakIt(b, e); ok(e.clk.n === 1, '종지기: 무너뜨려 금 −2가 아니다 ' + e.clk.n);
}
{ // 종 부수기: 붕괴 행동 1 → 종이 부서지고 금 0 · 종지기 넋 놓기(행동 없음 · 취약 2)
  const x = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const { b, e } = x; const bell = x.f.es[2];
  act(b, e, 'ring'); act(b, e, 'ring'); b.actN = 900; b.cur = { id: 'heavy' }; E.hurtEnemy(b, bell, 10, { single: 1 }); b.cur = null;
  ok(!bell.alive && e.clk.n === 0 && e.stun >= 1 && st(e, 'vuln') >= 2, '종지기: 붕괴 행동 한 번에 종이 부서져 0칸 · 넋 놓기가 아니다 ' + JSON.stringify({ a: bell.alive, n: e.clk.n, s: e.stun, v: st(e, 'vuln') }));
  E.decideIntent(b, e); ok(e.intent.k !== 'ring', '종이 부서졌는데 줄을 당기려 한다');
}
{ // 원거리 2타 · 광역 2타
  const x = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const { b, e } = x; const bell = x.f.es[2];
  act(b, e, 'ring'); b.actN = 901; b.cur = { id: 'basic' }; E.hurtEnemy(b, bell, 10, { single: 1 }); E.hurtEnemy(b, bell, 10, { single: 1 }); ok(bell.alive && bell.hp === 1, '종: 한 행동에 두 번 깨졌다');
  b.actN = 902; E.hurtEnemy(b, bell, 10, { single: 1 }); b.cur = null; ok(!bell.alive && e.clk.n === 0, '종: 원거리 2타에 부서지지 않았다');
  const y = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const bl2 = y.f.es[2];
  y.b.actN = 903; y.b.cur = { id: 'x' }; E.hurtEnemy(y.b, y.f.es[1], 5, { aoe: 1 }); E.hurtEnemy(y.b, y.e, 5, { aoe: 1 }); ok(bl2.hp === 1, '종: 광역 한 번이 1타가 아니다 ' + bl2.hp);
  y.b.actN = 904; E.hurtEnemy(y.b, y.f.es[1], 5, { aoe: 1 }); y.b.cur = null; ok(!bl2.alive, '종: 광역 2타에 부서지지 않았다');
}
{ // 막힘: 기절이면 멈춘다
  const x = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const { b, e, p } = x;
  p.stun = 1; act(b, e, 'ring'); ok(e.clk.n === 0 && e.clk.stop === 1, '종지기: 기절 중에도 금이 찼다'); p.stun = 0; act(b, e, 'ring'); ok(e.clk.n === 1, '종지기: 풀린 뒤 다시 차지 않는다');
}
/* ---------- 굶주린 순례자 ---------- */
common('pilgrim');
{
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x; const hit = fr => E.hurtPlayer(b, p.hpMax * fr, { src: e, single: 1 });
  hit(0.25); ok(e.clk.n === 2, '순례자: 25% 맞아 2칸이 아니다 ' + e.clk.n); hit(0.25); ok(e.clk.n === 5 && warned(b), '순례자: 50%에 5칸 · 경고가 아니다 ' + e.clk.n);
  e.hp = e.hpMax * 0.4; hit(0.1); ok(e.clk.doomN === 1 && e.clk.n === 0 && e.hp === e.hpMax && e.fcFeast === 1, '순례자: 60%에 포식(체력 가득 · 다음 큰 한 방 두 배)이 아니다');
  E.decideIntent(b, e); ok(e.intent.k === 'charge', '순례자: 포식 뒤 큰 한 방을 모으지 않는다 ' + e.intent.k);
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'heavy'); const d = lost(x); ok(near(d, K.pilgrim.feast) && !e.fcFeast, '순례자: 포식 뒤 큰 한 방이 생명력 70%가 아니다 ' + d.toFixed(3));
  R.pilgrim = '포식 뒤 큰 한 방 ' + (d * 100).toFixed(1) + '%';
}
{ // 맞지 않기(방어) · 무너뜨리기(막대 절반) · 웅크림(받는 피해 +30%) · 막힘
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x;
  p.guard = 1; const g = E.hurtPlayer(b, p.hpMax * 0.2, { src: e, single: 1 }); p.guard = 0; ok(near(e.fcFill, g, 1e-6) && e.clk.n === 1, '순례자: 방어로 막은 몫이 막대에 들어갔다 ' + e.fcFill + ' / ' + g);
  E.hurtPlayer(b, p.hpMax * 0.25, { src: e, single: 1 }); E.hurtPlayer(b, p.hpMax * 0.1, { src: e, single: 1 }); const n0 = e.clk.n, f0 = e.fcFill, u = p.hpMax * K.pilgrim.full / K.pilgrim.max; breakIt(b, e);
  ok(n0 >= 4 && near(e.fcFill, f0 / 2, 1e-6) && e.clk.n === Math.floor(f0 / 2 / u + 1e-9), '순례자: 무너뜨려 막대 절반이 아니다 ' + n0 + ' → ' + e.clk.n);
  ok(e.fcTk && e.fcTk.m === K.pilgrim.crouch, '순례자: 웅크림이 없다');
  const h0 = e.hp; E.hurtEnemy(b, e, 10, { single: 1 }); const d1 = h0 - e.hp; const tk = e.fcTk; delete e.fcTk; const h1 = e.hp; E.hurtEnemy(b, e, 10, { single: 1 }); const d2 = h1 - e.hp; e.fcTk = tk;
  ok(near(d1 / d2, K.pilgrim.crouch, 0.01), '순례자: 웅크림 받는 피해 +30%가 아니다 ×' + (d1 / d2).toFixed(3));
  const n1 = e.clk.n; p.stun = 1; E.hurtPlayer(b, p.hpMax * 0.2, { src: e, single: 1 }); p.stun = 0; ok(e.clk.n === n1, '순례자: 기절 중에도 막대가 찼다');
  const y = mk('pilgrim', ['bruiser', 'bruiser']); y.e.s.weak = { stacks: 2, until: 999, dur: 999 }; const w = R_('enemyHitEst')(y.b, y.e), w0 = (delete y.e.s.weak, R_('enemyHitEst')(y.b, y.e)); ok(w < w0, '순례자: 약화가 주는 피해를 줄이지 않는다');
}
{ // 한 방에 막대를 넘겨도 마지막 경고를 건너뛰지 않는다
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x; const cap = { src: e, single: 1, cap: 0.7 };
  E.hurtPlayer(b, p.hpMax * 0.3, cap); p.hp = p.hpMax; E.hurtPlayer(b, p.hpMax * 0.5, cap); ok(e.clk.n === K.pilgrim.max - 1 && !e.clk.doomN && warned(b), '순례자: 한 방에 경고 없이 포식했다 ' + e.clk.n);
  p.hp = p.hpMax; E.hurtPlayer(b, p.hpMax * 0.05, cap); ok(e.clk.doomN === 1, '순례자: 경고 뒤 다음 한 방에 포식하지 않았다');
}
/* ---------- 납골당 주교 ---------- */
common('bishop');
{
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e, p } = x; const cs = () => R_('corpsesOf')(b);
  act(b, e, 'raise'); act(b, e, 'raise'); ok(cs().length === 2 && e.clk.n === 2, '주교: 두 번 불러 시체 둘 · 2칸이 아니다');
  act(b, e, 'raise'); ok(e.clk.n === 3 && warned(b), '주교: 셋째에 경고가 없다');
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'raise'); const d = lost(x);
  ok(e.clk.doomN === 1 && e.clk.n === 0 && cs().length === 0, '주교: 장례 행렬 뒤 시체가 남았거나 시계가 0이 아니다');
  ok(near(d, K.bishop.march * 4, 0.03), '주교: 행렬이 생명력 60%가 아니다 ' + d.toFixed(3));
  const h0 = e.hp; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 50, { single: 1 }); b.cur = null; ok(e.hp === h0, '주교: 행렬 동안 무적이 아니다');
  R.bishop = '장례 행렬 ' + (d * 100).toFixed(1) + '%';
}
{ // 광역으로 셋 이상 한꺼번에 → 시계 0 · 지팡이 떨어뜨림(일으키기 없음 · 취약)
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e } = x; const cs = () => R_('corpsesOf')(b);
  act(b, e, 'raise'); act(b, e, 'raise'); act(b, e, 'raise'); b.actN = 950; b.cur = { id: 'x' }; for (const c of cs()) E.hurtEnemy(b, c, 99999, { aoe: 1 }); b.cur = null;
  ok(e.clk.n === 0 && e.fcNoRaise >= b.round && st(e, 'vuln') >= 2, '주교: 셋을 한꺼번에 쓸었는데 0칸 · 지팡이가 아니다 ' + JSON.stringify({ n: e.clk.n, nr: e.fcNoRaise, r: b.round }));
  act(b, e, 'raise'); ok(cs().length === 0 && e.clk.n === 0, '주교: 지팡이를 떨어뜨린 라운드에 일으켰다');
}
{ // 하나씩 쓰러뜨리기 · 무너뜨리기(이름 하나 취소) · 주교 쓰러뜨리기 · 막힘
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e, p } = x; const cs = () => R_('corpsesOf')(b);
  act(b, e, 'raise'); act(b, e, 'raise'); b.actN = 951; b.cur = { id: 'basic' }; E.hurtEnemy(b, cs()[0], 99999, { single: 1 }); b.cur = null; ok(e.clk.n === 1 && !e.fcNoRaise, '주교: 시체 하나를 쓰러뜨려 1칸이 아니다');
  e.intent = { k: 'attack' }; breakIt(b, e); ok(e.clk.n === 0 && cs().length === 0, '주교: 무너뜨려 이름 하나가 취소되지 않았다');
  e.stun = 0; act(b, e, 'raise'); e.intent = { k: 'raise' }; breakIt(b, e); ok(e.intent.k === 'attack' && e.teleX === 1 && e.clk.n === 1, '주교: 부르는 중에 무너뜨려 부름이 끊기지 않았다');
  p.stun = 1; act(b, e, 'raise'); ok(e.clk.n === 1 && cs().length === 1, '주교: 기절 중에도 불렀다'); p.stun = 0;
  act(b, e, 'raise'); b.actN = 952; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 999999, { single: 1 }); b.cur = null; ok(!e.alive && cs().length === 0, '주교가 쓰러졌는데 시체가 남았다');
}
/* ---------- 성가 조율자 ---------- */
common('cantor');
{
  const x = mk('cantor', ['bruiser', 'bruiser', 'archer']); const { b, e, p } = x; const L = x.f.es.slice(1);
  for (const m of L) m.hp = m.hpMax * 0.3;
  act(b, e, 'tune'); act(b, e, 'attack'); ok(e.clk.n === 2 && warned(b), '조율자: 두 행동에 2마디 · 경고가 아니다 ' + e.clk.n);
  p.hp = p.hpMax; x.hpBefore = p.hp; const lg = b.log.length; act(b, e, 'tune'); const d = lost(x);
  ok(e.clk.doomN === 1 && L.every(m => m.hp === m.hpMax && st(m, 'empower') >= K.cantor.emp), '조율자: 대합창(곁의 적 체력 가득 · 강화 2)이 아니다');
  ok(near(d, K.cantor.per * L.length, 0.03), '조율자: 합창이 곁의 적 하나마다 20%가 아니다 ' + d.toFixed(3));
  ok(!b.log.slice(lg).some(l => l.m.includes('박자를 센다')), '조율자: 파국이 그 행동을 대신하지 않았다');
  R.cantor = '대합창(곁의 적 ' + L.length + ') ' + (d * 100).toFixed(1) + '%';
}
{ // 곁의 적 하나 이하면 마디가 안 넘어감 · 무너뜨리기(처음으로) + 엇박 · 지속 피해(한 마디 뒤로) · 기절한 행동은 세지 않음 · 막힘
  const x = mk('cantor', ['bruiser', 'bruiser', 'archer']); const { b, e, p } = x; const L = x.f.es.slice(1);
  act(b, e, 'tune'); act(b, e, 'attack'); breakIt(b, e); ok(e.clk.n === 0 && L.every(m => st(m, 'chill') >= 1), '조율자: 무너뜨려 처음으로 · 엇박이 아니다');
  act(b, e, 'tune'); const cut = e.hpMax * K.cantor.dotCut; E.hurtEnemy(b, e, cut + 1, { dot: 1, label: '중독' }); ok(e.clk.n === 0, '조율자: 지속 피해로 한 마디 뒤로가 아니다 ' + e.clk.n);
  e.stun = 1; E.enemyAct(b, e); ok(e.clk.n === 0, '조율자: 기절해 놓친 행동에 마디가 넘어갔다');
  p.stun = 1; act(b, e, 'tune'); ok(e.clk.n === 0, '조율자: 내가 기절했는데 마디가 넘어갔다'); p.stun = 0;
  L[0].alive = false; L[1].alive = false; act(b, e, 'tune'); act(b, e, 'tune'); ok(e.clk.n === 0, '조율자: 곁의 적이 하나뿐인데 마디가 넘어갔다');
}
/* ---------- 검은 서기관 ---------- */
common('scribe');
{
  const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e, p } = x;
  act(b, e, 'seal'); ok((b.seal || []).length === 1 && e.clk.n === 1 && warned(b), '서기관: 첫 줄에 1칸 · 경고가 아니다(2줄이라 첫 줄이 마지막 경고)');
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'seal'); const d = lost(x);
  ok(e.clk.doomN === 1 && (b.seal || []).length === 2 && b.seal.every(s => s.perm), '서기관: 판결 뒤 봉인 둘이 끝까지 남지 않는다');
  ok(near(d, K.scribe.verdict, 0.03), '서기관: 선고가 생명력 50%가 아니다 ' + d.toFixed(3));
  breakIt(b, e); ok(b.seal.length === 2, '서기관: 판결된 봉인이 무너뜨려 풀렸다');
  R.scribe = '선고 ' + (d * 100).toFixed(1) + '%';
  b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 9999999, { single: 1 }); b.cur = null; ok(!(b.seal || []).length, '서기관: 쓰러뜨렸는데 봉인이 남았다');
}
{ // 무너뜨리기(한 줄 지움) · 정화 플라스크(한 줄 지움) · 보상(펜을 다시 적신다) · 막힘
  const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e, p } = x;
  act(b, e, 'seal'); breakIt(b, e); ok(e.clk.n === 0 && !(b.seal || []).length && e.stun >= 1, '서기관: 무너뜨려 한 줄 지움이 아니다');
  e.stun = 0; act(b, e, 'seal'); ok(e.clk.n === 1, '서기관: 다시 적지 않는다'); E.fcEv(b, 'onFlask', p, 'mana'); ok(e.clk.n === 0 && !(b.seal || []).length && e.stun >= 1, '서기관: 정화 플라스크로 한 줄 지움 · 펜 적시기가 아니다');
  e.stun = 0; p.stun = 1; act(b, e, 'seal'); ok(e.clk.n === 0, '서기관: 내가 기절했는데 줄이 찼다'); p.stun = 0;
}
/* ---------- 테스터 답 고르기(tools/persona/clock-ch1.js) ---------- */
{
  const PA = require('./persona/clock-ch1.js'); const okAct = (b, r) => !!r && E.actionList(b).some(a => a.id === r[0] && a.ok);
  for (const id of ['bellringer', 'pilgrim', 'bishop', 'cantor', 'scribe']) ok(typeof PA[id] === 'function', '테스터: ' + id + ' 답 고르기가 없다');
  { const x = mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; }); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = 3; e.intent = { k: 'ring' }; const r = PA.bellringer(b, e, E, () => 0); ok(r && r[0] === 'dodge' && r[1] === e.id, '테스터: 줄 당길 차례에 흘리지 않는다 ' + JSON.stringify(r)); }
  { const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = 5; e.intent = { k: 'attack' }; const r = PA.pilgrim(b, e, E, () => 0); ok(okAct(b, r) && ['dodge', 'guard', 'heavy', 'basic'].includes(r[0]), '테스터: 순례자 답이 없다 ' + JSON.stringify(r)); }
  { const x = mk('bishop', ['bruiser', 'summoner']); const { b, e } = x; b.p.st = b.p.stMax; act(b, e, 'raise'); act(b, e, 'raise'); act(b, e, 'raise'); const r = PA.bishop(b, e, E, () => 0); ok(okAct(b, r), '테스터: 주교 답이 없다 ' + JSON.stringify(r)); }
  { const x = mk('cantor', ['bruiser', 'bruiser', 'archer']); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = 2; const r = PA.cantor(b, e, E, () => 0); ok(okAct(b, r), '테스터: 조율자 답이 없다 ' + JSON.stringify(r)); }
  { const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e } = x; b.p.st = b.p.stMax; e.brk = e.brkMax - 1; e.clk.n = 1; const r = PA.scribe(b, e, E, () => 0); ok(okAct(b, r) && r[1] === e.id, '테스터: 서기관을 무너뜨리러 가지 않는다 ' + JSON.stringify(r)); }
}
console.log('clock-ch1-check: 시험 ' + H.C.n + '개 · 실패 ' + H.C.fail.length + ' · ' + Object.values(R).join(' · '));
for (const m of H.C.fail) console.log('  실패: ' + m);
if (H.C.fail.length) process.exit(1);
