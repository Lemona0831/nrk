'use strict';
/* 0.8.0 G-1 1챕터 강적 시계 점검 (js/30 FOE_CLOCK 다섯, 틀은 js/25). 실행: node tools/clock-ch1-check.js
   2판: 강적마다 시계가 있다 · 답이 두 종류 이상 · 마지막 경고 칸에서 마지막 경고 · 다 차면 파국(정한 세기) · 경고 칸에서 결정적 답 한 행동 → 0칸 + 보상 ·
   경고 칸이 아닐 때 되감기는 1칸 · 강적마다 라운드에 한 번 · 답 수단이 모두 막히면 멈춤 · 테스터 답 고르기. 값은 data/dungeon.js CLK1에서 읽는다.
   규칙의 뜻은 비공개 문서 참조 */
const H = require('./uqtest/_h.js'); const { E, R_, ok } = H;
const FC = R_('FOE_CLOCK'), K = R_('CLK1');
const st = (u, k) => R_('st')(u, k);
/* 강적 하나 + 곁의 적. 적 피해는 작게(1), 붕괴 상한 100 */
function mk(foe, en, setup) {
  const f = H.fight('warden', { en: en || ['bruiser', 'bruiser'], setup: (run, es) => { es[0].strong = true; es[0].foe = foe; for (const e of es) e.brkMax = 100; if (setup) setup(run, es); } });
  const b = f.b; b.cur = null; b.rngF = () => 0.5; b.fcNoWait = 1; /* 한 차례 안에서 파국까지 채워 보는 시험(경고 뒤 기다림은 아래 공통 시험에서) */ const e = f.es[0]; E.fcInit(b, e); b.p.hp = b.p.hpMax; b.p.stun = 0; b.p.guard = 0; b.p.dodge = 0; b.round = b.round || 1; return { f, b, e, p: b.p };
}
const act = (b, e, k) => { e.intent = { k }; e.teleTurn = -1; e.stun = 0; E.enemyAct(b, e); };
const warned = b => b.log.some(l => /^⚠/.test(l.m));
const breakIt = (b, e) => { b.cur = null; e.brk = e.brkMax - 0.5; delete e.s.broken; E.addBreak(b, e, 50); };
const near = (a, x, tol) => Math.abs(a - x) <= (tol || 0.02);
const lost = x => (x.hpBefore - x.p.hp) / x.p.hpMax;
const nextRound = b => { b.round = (b.round || 1) + 1; };
/* 경고 칸이 아닐 때의 되감기 시험: 칸을 늘린 시계(이 전투에서만)를 칸 3에 두고 같은 라운드에 답을 두 번 → 1칸만, 라운드가 바뀌면 다시 1칸 */
function capCheck(name, x, once) {
  const { b, e } = x; const C = e.clk; C.max = 5; C.n = 3; C.backR = null; nextRound(b);
  once(); ok(C.n === 2, name + ': 경고 칸이 아닌데 1칸보다 많이 되감겼다 ' + C.n);
  once(); ok(C.n === 2, name + ': 경고 칸이 아닌데 한 라운드에 두 번 되감겼다 ' + C.n);
  nextRound(b); once(); ok(C.n === 1, name + ': 다음 라운드에 다시 1칸 되감기지 않는다 ' + C.n);
}
function common(id) {
  const D = FC[id]; ok(!!D, id + ': 시계 정의가 없다'); if (!D) return;
  ok(new Set(D.ans || []).size >= 2, id + ': 답 종류가 둘 미만');
  ok(typeof D.warn === 'function' && typeof D.doom === 'function' && typeof D.blocked === 'function', id + ': warn · doom · blocked가 없다');
  const TAGS = ['brk', 'aoe', 'ranged', 'dot', 'kill', 'parry', 'guard', 'cons', 'gold']; ok((D.ans || []).every(t => TAGS.includes(t)), id + ': 모르는 답 태그 ' + D.ans);
  ok(D.max === R_('fc1K')(id).max && D.max >= 2, id + ': 칸 수가 CLK1과 다르다');
}
const R = {};
/* ---------- 종지기 ---------- */
const bellFight = () => mk('bellringer', ['bruiser', 'bruiser', 'root'], (run, es) => { es[2].bell = 1; es[2].hp = es[2].hpMax = K.bell.bellHp; });
const ringTo = (b, e, n) => { for (let i = 0; i < n; i++) act(b, e, 'ring'); };
common('bellringer');
{ // 줄 당기기: max−1번에 경고, 한 번 더에 대종(종이 깨지고 끝까지 두 번 · 큰 한 방)
  const x = bellFight(); const { b, e, p } = x; const bell = x.f.es[2]; const M = K.bell.max;
  ringTo(b, e, M - 2); ok(e.clk.n === M - 2 && !warned(b), '종지기: 경고 칸 전에 경고했다 ' + e.clk.n);
  act(b, e, 'ring'); ok(e.clk.n === M - 1 && warned(b) && e.clk.warnN === 1, '종지기: 마지막 경고가 없다');
  ok(b.log.some(l => l.m.includes(FC.bellringer.warn(b, e))), '종지기: 경고 문장이 기록에 없다');
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'ring'); const d = lost(x);
  ok(e.clk.perm === 1 && e.clk.doomN === 1 && !bell.alive && b.fcTwice === 1, '종지기: 대종이 오지 않았다(종이 깨지고 끝까지)');
  ok(near(d, K.bell.big), '종지기: 대종의 큰 한 방이 CLK1 값이 아니다 ' + d.toFixed(3));
  const ord = E.roundOrder(b, false); ok(ord.filter(o => o.twice).length >= 2, '종지기: 대종 뒤 적이 두 번 움직이지 않는다');
  act(b, e, 'ring'); ok(e.clk.perm === 1, '종지기: 대종 뒤 시계가 다시 돈다');
  E.decideIntent(b, e); ok(e.intent.k !== 'ring', '종지기: 대종 뒤에도 줄을 당기려 한다');
  R.bell = '대종 ' + (d * 100).toFixed(1) + '%';
}
{ // 결정적 답 ①: 경고 칸에서 줄을 당기는 차례에 흘리기 → 0칸 + 넋 놓기
  const x = bellFight(); const { b, e, p } = x; ringTo(b, e, K.bell.max - 1); p.dodge = e.id; act(b, e, 'ring');
  ok(e.clk.n === 0 && !p.dodge && e.stun >= K.bell.stun && b.codex['bellringer.slip'], '종지기: 경고 칸에서 흘려 0칸 · 넋 놓기가 아니다 ' + JSON.stringify({ n: e.clk.n, s: e.stun }));
}
{ // 결정적 답 ②: 경고 칸에서 종에 강공격 한 번 → 종이 깨지고 0칸 · 넋 놓기(행동 없음 · 취약 2) · 더 당기지 않는다
  const x = bellFight(); const { b, e } = x; const bell = x.f.es[2]; ringTo(b, e, K.bell.max - 1);
  b.actN = 900; b.cur = { id: 'heavy' }; E.hurtEnemy(b, bell, 10, { single: 1 }); b.cur = null;
  ok(!bell.alive && e.clk.n === 0 && e.stun >= K.bell.stun && st(e, 'vuln') >= 2, '종지기: 강공격 한 번에 종이 부서져 0칸 · 넋 놓기가 아니다 ' + JSON.stringify({ a: bell.alive, n: e.clk.n, s: e.stun, v: st(e, 'vuln') }));
  E.decideIntent(b, e); ok(e.intent.k !== 'ring', '종이 부서졌는데 줄을 당기려 한다');
}
{ // 원거리 2타 · 광역 2타(평소 답, 행동 둘)
  const x = bellFight(); const { b, e } = x; const bell = x.f.es[2];
  b.actN = 901; b.cur = { id: 'basic' }; E.hurtEnemy(b, bell, 10, { single: 1 }); E.hurtEnemy(b, bell, 10, { single: 1 }); ok(bell.alive && bell.hp === K.bell.bellHp - 1, '종: 한 행동에 두 번 깨졌다');
  b.actN = 902; E.hurtEnemy(b, bell, 10, { single: 1 }); b.cur = null; ok(!bell.alive, '종: 원거리 2타에 부서지지 않았다');
  const y = bellFight(); const bl2 = y.f.es[2];
  y.b.actN = 903; y.b.cur = { id: 'x' }; E.hurtEnemy(y.b, y.f.es[1], 5, { aoe: 1 }); E.hurtEnemy(y.b, y.e, 5, { aoe: 1 }); ok(bl2.hp === K.bell.bellHp - 1, '종: 광역 한 번이 1타가 아니다 ' + bl2.hp);
  y.b.actN = 904; E.hurtEnemy(y.b, y.f.es[1], 5, { aoe: 1 }); y.b.cur = null; ok(!bl2.alive, '종: 광역 2타에 부서지지 않았다');
}
{ // 경고 칸이 아닐 때: 흘리기 · 종지기 무너뜨리기는 1칸 · 라운드에 한 번
  const x = bellFight(); capCheck('종지기 흘리기', x, () => { x.p.dodge = x.e.id; act(x.b, x.e, 'ring'); });
  const y = bellFight(); capCheck('종지기 무너뜨리기', y, () => breakIt(y.b, y.e));
}
{ // 막힘: 기절이면 멈춘다
  const x = bellFight(); const { b, e, p } = x;
  p.stun = 1; act(b, e, 'ring'); ok(e.clk.n === 0 && e.clk.stop === 1, '종지기: 기절 중에도 금이 찼다'); p.stun = 0; act(b, e, 'ring'); ok(e.clk.n === 1, '종지기: 풀린 뒤 다시 차지 않는다');
}
/* ---------- 굶주린 순례자 ---------- */
common('pilgrim');
const pilU = p => p.hpMax * K.pilgrim.full / K.pilgrim.max;
const pilWarn = x => { const { b, e, p } = x; E.hurtPlayer(b, pilU(p) * (K.pilgrim.max - 1) + 0.01, { src: e, single: 1, cap: 0.9 }); p.hp = p.hpMax; };
{ // 나에게 준 피해만큼 찬다: max−1칸에 경고, 가득 차면 포식(체력 가득 · 다음 큰 한 방)
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x; const u = pilU(p);
  E.hurtPlayer(b, u * 1.01, { src: e, single: 1, cap: 0.9 }); ok(e.clk.n === 1 && !warned(b) || K.pilgrim.max === 2, '순례자: 한 칸 몫에 1칸이 아니다 ' + e.clk.n);
  p.hp = p.hpMax; E.hurtPlayer(b, u * (K.pilgrim.max - 2) + 0.01, { src: e, single: 1, cap: 0.9 }); ok(e.clk.n === K.pilgrim.max - 1 && warned(b), '순례자: max−1칸에 경고가 아니다 ' + e.clk.n);
  e.hp = e.hpMax * 0.4; p.hp = p.hpMax; E.hurtPlayer(b, u * 1.01, { src: e, single: 1, cap: 0.9 }); ok(e.clk.doomN === 1 && e.clk.n === 0 && e.hp === e.hpMax && e.fcFeast === 1, '순례자: 가득 차서 포식(체력 가득 · 다음 큰 한 방)이 아니다');
  E.decideIntent(b, e); ok(e.intent.k === 'charge', '순례자: 포식 뒤 큰 한 방을 모으지 않는다 ' + e.intent.k);
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'heavy'); const d = lost(x); ok(near(d, K.pilgrim.feast) && !e.fcFeast, '순례자: 포식 뒤 큰 한 방이 CLK1 값이 아니다 ' + d.toFixed(3));
  R.pilgrim = '포식 뒤 큰 한 방 ' + (d * 100).toFixed(1) + '%';
}
{ // 한 방에 막대를 넘겨도 마지막 경고를 건너뛰지 않는다
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x;
  E.hurtPlayer(b, p.hpMax * K.pilgrim.full * 1.5, { src: e, single: 1, cap: 0.9 }); ok(e.clk.n === K.pilgrim.max - 1 && !e.clk.doomN && warned(b), '순례자: 한 방에 경고 없이 포식했다 ' + e.clk.n);
  p.hp = p.hpMax; E.hurtPlayer(b, p.hpMax * 0.05, { src: e, single: 1 }); ok(e.clk.doomN === 1, '순례자: 경고 뒤 다음 한 방에 포식하지 않았다');
}
{ // 결정적 답 ①: 경고 칸에서 그 공격을 막기(방어) → 막대에 들지 않고 0칸 + 웅크림(받는 피해 +30%)
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x; pilWarn(x);
  p.guard = 1; E.hurtPlayer(b, p.hpMax * 0.15, { src: e, single: 1 }); p.guard = 0;
  ok(e.clk.n === 0 && !e.fcFill && !e.clk.doomN && e.fcTk && e.fcTk.m === K.pilgrim.crouch, '순례자: 경고 칸에서 막아 0칸 · 웅크림이 아니다 ' + JSON.stringify({ n: e.clk.n, f: e.fcFill }));
  const h0 = e.hp; E.hurtEnemy(b, e, 10, { single: 1 }); const d1 = h0 - e.hp; const tk = e.fcTk; delete e.fcTk; const h1 = e.hp; E.hurtEnemy(b, e, 10, { single: 1 }); const d2 = h1 - e.hp; e.fcTk = tk;
  ok(near(d1 / d2, K.pilgrim.crouch, 0.01), '순례자: 웅크림 받는 피해 배율이 CLK1 값이 아니다 ×' + (d1 / d2).toFixed(3));
}
{ // 결정적 답 ②: 경고 칸에서 그 공격을 흘리기 → 0칸, 흘린 공격은 막대에 들지 않는다
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x; pilWarn(x);
  p.dodge = e.id; E.hurtPlayer(b, p.hpMax * 0.15, { src: e, single: 1 });
  ok(e.clk.n === 0 && !e.fcFill && !e.clk.doomN && e.fcTk, '순례자: 경고 칸에서 흘려 0칸이 아니다 ' + JSON.stringify({ n: e.clk.n, f: e.fcFill }));
}
{ // 결정적 답 ③: 경고 칸에서 무너뜨리기 → 0칸 + 웅크림
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e } = x; pilWarn(x); breakIt(b, e);
  ok(e.clk.n === 0 && !e.fcFill && e.fcTk, '순례자: 경고 칸에서 무너뜨려 0칸이 아니다 ' + e.clk.n);
}
{ // 경고 칸이 아닐 때: 막은 몫은 막대에 안 들어간다 · 무너뜨리기는 1칸 · 라운드에 한 번 · 기절이면 안 찬다 · 약화
  const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e, p } = x;
  p.guard = 1; const g = E.hurtPlayer(b, pilU(p) * 0.9, { src: e, single: 1 }); p.guard = 0; ok(near(e.fcFill, g, 1e-6) && e.clk.n === 0, '순례자: 방어로 막은 몫이 막대에 들어갔다 ' + e.fcFill + ' / ' + g);
  const y = mk('pilgrim', ['bruiser', 'bruiser']); capCheck('순례자 무너뜨리기', y, () => breakIt(y.b, y.e)); ok(y.e.fcFill <= y.e.clk.n * pilU(y.p) + 1e-6, '순례자: 되감긴 칸만큼 막대가 줄지 않았다');
  const n1 = e.clk.n, f1 = e.fcFill; p.stun = 1; E.hurtPlayer(b, p.hpMax * 0.2, { src: e, single: 1 }); p.stun = 0; ok(e.clk.n === n1 && e.fcFill === f1, '순례자: 기절 중에도 막대가 찼다');
  const z = mk('pilgrim', ['bruiser', 'bruiser']); z.e.s.weak = { stacks: 2, until: 999, dur: 999 }; const w = R_('enemyHitEst')(z.b, z.e), w0 = (delete z.e.s.weak, R_('enemyHitEst')(z.b, z.e)); ok(w < w0, '순례자: 약화가 주는 피해를 줄이지 않는다');
}
/* ---------- 납골당 주교 ---------- */
common('bishop');
{ // 이름을 부를 때마다 시체 하나 · 칸 하나. max−1에 경고, 다 차면 장례 행렬(시체 하나마다) · 그 라운드 무적
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e, p } = x; const cs = () => R_('corpsesOf')(b); const M = K.bishop.max;
  for (let i = 0; i < M - 1; i++) act(b, e, 'raise'); ok(cs().length === M - 1 && e.clk.n === M - 1 && warned(b), '주교: max−1번 불러 시체 · 칸 · 경고가 맞지 않다');
  ok(cs().every(c => c.hpMax === 1), '주교: 시체가 한 번 맞으면 쓰러질 만큼 약하지 않다');
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'raise'); const d = lost(x);
  ok(e.clk.doomN === 1 && e.clk.n === 0 && cs().length === 0, '주교: 장례 행렬 뒤 시체가 남았거나 시계가 0이 아니다');
  ok(near(d, K.bishop.march * M, 0.03), '주교: 행렬이 시체 하나마다 CLK1 값이 아니다 ' + d.toFixed(3));
  const h0 = e.hp; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 50, { single: 1 }); b.cur = null; ok(e.hp === h0, '주교: 행렬 동안 무적이 아니다');
  R.bishop = '장례 행렬 ' + (d * 100).toFixed(1) + '%';
}
{ // 결정적 답 ①: 경고 칸에서 광역 한 번(시체 모두 쓰러짐) → 0칸 · 지팡이(일으키기 없음 · 취약)
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e } = x; const cs = () => R_('corpsesOf')(b);
  for (let i = 0; i < K.bishop.max - 1; i++) act(b, e, 'raise'); b.actN = 950; b.cur = { id: 'x' }; for (const c of cs()) E.hurtEnemy(b, c, 5, { aoe: 1 }); b.cur = null;
  ok(e.clk.n === 0 && e.fcNoRaise >= b.round && st(e, 'vuln') >= 2, '주교: 경고 칸에서 광역 한 번에 0칸 · 지팡이가 아니다 ' + JSON.stringify({ n: e.clk.n, nr: e.fcNoRaise, r: b.round }));
  act(b, e, 'raise'); ok(cs().length === 0 && e.clk.n === 0, '주교: 지팡이를 떨어뜨린 라운드에 일으켰다');
}
{ // 결정적 답 ②: 경고 칸에서 주교 무너뜨리기 → 시체 모두 무너짐 · 0칸 · 지팡이
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e } = x; const cs = () => R_('corpsesOf')(b);
  for (let i = 0; i < K.bishop.max - 1; i++) act(b, e, 'raise'); e.intent = { k: 'attack' }; breakIt(b, e);
  ok(e.clk.n === 0 && cs().length === 0 && e.fcNoRaise >= b.round, '주교: 경고 칸에서 무너뜨려 시체 모두 · 0칸 · 지팡이가 아니다 ' + e.clk.n);
}
{ // 경고 칸이 아닐 때: 시체 하나 쓰러뜨리기(칸 = 시체 수) · 무너뜨리기(부름 끊기 · 이름 하나) · 경고 칸 아닌 한 행동 둘 쓰러뜨림에는 지팡이 없음 · 막힘 · 주교 쓰러뜨리기
  const x = mk('bishop', ['bruiser', 'summoner']); const { b, e, p } = x; const cs = () => R_('corpsesOf')(b);
  act(b, e, 'raise'); b.actN = 951; b.cur = { id: 'basic' }; E.hurtEnemy(b, cs()[0], 5, { single: 1 }); b.cur = null; ok(e.clk.n === 0 && !e.fcNoRaise, '주교: 시체 하나를 쓰러뜨려 칸이 시체 수를 따르지 않는다');
  act(b, e, 'raise'); e.intent = { k: 'attack' }; if (K.bishop.max > 2) { breakIt(b, e); ok(e.clk.n === 0 && cs().length === 0 && !e.fcNoRaise, '주교: 경고 칸이 아닌데 무너뜨려 이름 하나 취소가 아니다 ' + e.clk.n); }
  e.stun = 0; e.intent = { k: 'raise' }; e.brk = 0; delete e.s.broken; breakIt(b, e); ok(e.intent.k === 'attack' && e.teleX === 1, '주교: 부르는 중에 무너뜨려 부름이 끊기지 않았다');
  const n0 = e.clk.n, c0 = cs().length; p.stun = 1; act(b, e, 'raise'); ok(e.clk.n === n0 && cs().length === c0, '주교: 기절 중에도 불렀다'); p.stun = 0;
  act(b, e, 'raise'); b.actN = 952; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 999999, { single: 1 }); b.cur = null; ok(!e.alive && cs().length === 0, '주교가 쓰러졌는데 시체가 남았다');
}
/* ---------- 성가 조율자 ---------- */
common('cantor');
const cantorFight = () => { const x = mk('cantor', ['bruiser', 'bruiser', 'archer']); return x; };
const barTo = (b, e, n) => { for (let i = 0; i < n; i++) act(b, e, i % 2 ? 'attack' : 'tune'); };
{ // 곁의 적이 둘 이상이면 조율자 행동마다 한 마디. max−1에 경고, 다 차면 대합창(곁의 적 체력 가득 · 강화 · 하나마다 피해) · 그 행동을 대신
  const x = cantorFight(); const { b, e, p } = x; const L = x.f.es.slice(1);
  for (const m of L) m.hp = m.hpMax * 0.3;
  barTo(b, e, K.cantor.max - 1); ok(e.clk.n === K.cantor.max - 1 && warned(b), '조율자: max−1마디 · 경고가 아니다 ' + e.clk.n);
  p.hp = p.hpMax; x.hpBefore = p.hp; const lg = b.log.length; act(b, e, 'tune'); const d = lost(x);
  ok(e.clk.doomN === 1 && L.every(m => m.hp === m.hpMax && st(m, 'empower') >= K.cantor.emp), '조율자: 대합창(곁의 적 체력 가득 · 강화)이 아니다');
  ok(near(d, K.cantor.per * L.length, 0.03), '조율자: 합창이 곁의 적 하나마다 CLK1 값이 아니다 ' + d.toFixed(3));
  ok(!b.log.slice(lg).some(l => l.m.includes('박자를 센다')), '조율자: 파국이 그 행동을 대신하지 않았다');
  R.cantor = '대합창(곁의 적 ' + L.length + ') ' + (d * 100).toFixed(1) + '%';
}
{ // 결정적 답 ①: 경고 칸에서 곁의 적 하나 쓰러뜨리기 → 0칸 + 엇박
  const x = cantorFight(); const { b, e } = x; const L = x.f.es.slice(1); barTo(b, e, K.cantor.max - 1);
  b.actN = 960; b.cur = { id: 'basic' }; E.hurtEnemy(b, L[0], 999999, { single: 1 }); b.cur = null;
  ok(e.clk.n === 0 && L.slice(1).every(m => st(m, 'chill') >= K.cantor.off), '조율자: 경고 칸에서 곁의 적 하나 쓰러뜨려 0칸 · 엇박이 아니다 ' + e.clk.n);
}
{ // 결정적 답 ②: 경고 칸에서 조율자에게 원거리 피해 한 번 → 0칸 / ③ 광역 한 번 → 0칸
  const x = cantorFight(); const { b, e } = x; barTo(b, e, K.cantor.max - 1); b.actN = 961; b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 3, { single: 1 }); b.cur = null;
  ok(e.clk.n === 0, '조율자: 경고 칸에서 원거리 한 번에 0칸이 아니다 ' + e.clk.n);
  const y = cantorFight(); barTo(y.b, y.e, K.cantor.max - 1); y.b.actN = 962; y.b.cur = { id: 'x' }; E.hurtEnemy(y.b, y.e, 3, { aoe: 1 }); y.b.cur = null;
  ok(y.e.clk.n === 0, '조율자: 경고 칸에서 광역 한 번에 0칸이 아니다 ' + y.e.clk.n);
}
{ // 결정적 답 ④: 경고 칸에서 무너뜨리기 → 0칸
  const x = cantorFight(); const { b, e } = x; barTo(b, e, K.cantor.max - 1); breakIt(b, e); ok(e.clk.n === 0, '조율자: 경고 칸에서 무너뜨려 0칸이 아니다 ' + e.clk.n);
}
{ // 경고 칸이 아닐 때: 곁의 적 쓰러뜨리기 · 직접 피해는 되감지 않는다(마디를 막을 뿐) · 무너뜨리기 · 지속 피해는 1칸 · 라운드에 한 번
  const x = cantorFight(); const { b, e } = x; const L = x.f.es.slice(1); const C = e.clk; C.max = 5; C.n = 2;
  b.actN = 963; b.cur = { id: 'basic' }; E.hurtEnemy(b, L[0], 999999, { single: 1 }); E.hurtEnemy(b, e, 3, { single: 1 }); b.cur = null; ok(C.n === 2, '조율자: 경고 칸이 아닌데 처치 · 직접 피해로 되감겼다 ' + C.n);
  const y = cantorFight(); capCheck('조율자 무너뜨리기', y, () => breakIt(y.b, y.e));
  const z = cantorFight(); capCheck('조율자 지속 피해', z, () => E.hurtEnemy(z.b, z.e, z.e.hpMax * K.cantor.dotCut + 1, { dot: 1, label: '중독' }));
}
{ // 기절해 놓친 행동은 세지 않음 · 내가 기절하면 멈춤 · 곁의 적이 하나뿐이면 마디가 안 넘어감
  const x = cantorFight(); const { b, e, p } = x; const L = x.f.es.slice(1);
  e.stun = 1; E.enemyAct(b, e); ok(e.clk.n === 0, '조율자: 기절해 놓친 행동에 마디가 넘어갔다');
  p.stun = 1; act(b, e, 'tune'); ok(e.clk.n === 0, '조율자: 내가 기절했는데 마디가 넘어갔다'); p.stun = 0;
  L[0].alive = false; L[1].alive = false; act(b, e, 'tune'); act(b, e, 'tune'); ok(e.clk.n === 0, '조율자: 곁의 적이 하나뿐인데 마디가 넘어갔다');
}
/* ---------- 검은 서기관 ---------- */
common('scribe');
const sealTo = (b, e, n) => { for (let i = 0; i < n; i++) act(b, e, 'seal'); };
{ // 봉인 하나마다 한 줄. max−1에 경고, 다 차면 판결(봉인이 끝까지) · 선고
  const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e, p } = x; const M = K.scribe.max;
  sealTo(b, e, M - 1); ok((b.seal || []).length === M - 1 && e.clk.n === M - 1 && warned(b), '서기관: max−1줄에 경고가 아니다');
  p.hp = p.hpMax; x.hpBefore = p.hp; act(b, e, 'seal'); const d = lost(x);
  ok(e.clk.doomN === 1 && (b.seal || []).length === M && b.seal.every(s => s.perm), '서기관: 판결 뒤 봉인이 끝까지 남지 않는다');
  ok(near(d, K.scribe.verdict, 0.03), '서기관: 선고가 CLK1 값이 아니다 ' + d.toFixed(3));
  breakIt(b, e); ok(b.seal.length === M, '서기관: 판결된 봉인이 무너뜨려 풀렸다');
  R.scribe = '선고 ' + (d * 100).toFixed(1) + '%';
  b.cur = { id: 'basic' }; E.hurtEnemy(b, e, 9999999, { single: 1 }); b.cur = null; ok(!(b.seal || []).length, '서기관: 쓰러뜨렸는데 봉인이 남았다');
}
{ // 결정적 답 ①: 경고 칸에서 서기관의 공격을 흘리기 → 가장 최근 줄과 한 줄 더 지움 · 0칸 · 펜 적시기(행동 없음)
  const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e, p } = x;
  b.seal = [{ k: 'skill', id: 'old', n: '옛 줄', perm: 1 }]; sealTo(b, e, K.scribe.max - 1); const n0 = b.seal.length;
  p.dodge = e.id; E.hurtPlayer(b, p.hpMax * 0.1, { src: e, single: 1 });
  ok(e.clk.n === 0 && b.seal.length === Math.max(0, n0 - 2) && e.stun >= K.scribe.pen, '서기관: 경고 칸에서 흘려 두 줄 지움 · 0칸 · 펜 적시기가 아니다 ' + JSON.stringify({ n: e.clk.n, s: b.seal.length, n0 }));
}
{ // 결정적 답 ②: 경고 칸에서 무너뜨리기 / ③ 정화 플라스크 → 한 줄 지움 · 0칸 · 펜 적시기
  const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e, p } = x;
  sealTo(b, e, K.scribe.max - 1); breakIt(b, e); ok(e.clk.n === 0 && !(b.seal || []).length && e.stun >= K.scribe.pen, '서기관: 경고 칸에서 무너뜨려 0칸이 아니다');
  e.stun = 0; sealTo(b, e, K.scribe.max - 1); E.fcEv(b, 'onFlask', p, 'mana'); ok(e.clk.n === 0 && !(b.seal || []).length && e.stun >= K.scribe.pen, '서기관: 경고 칸에서 정화 플라스크로 0칸이 아니다');
  e.stun = 0; p.stun = 1; act(b, e, 'seal'); ok(e.clk.n === 0, '서기관: 내가 기절했는데 줄이 찼다'); p.stun = 0;
}
{ // 경고 칸이 아닐 때: 흘리기 · 무너뜨리기는 1칸 · 라운드에 한 번
  const x = mk('scribe', ['bruiser', 'darkmage']); capCheck('서기관 흘리기', x, () => { x.p.dodge = x.e.id; E.hurtPlayer(x.b, 1, { src: x.e, single: 1 }); });
  const y = mk('scribe', ['bruiser', 'darkmage']); capCheck('서기관 무너뜨리기', y, () => breakIt(y.b, y.e));
}
/* ---------- 결정적 답은 경고 칸에서만 0칸(공통 틀 fcAnswer) ---------- */
{
  const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e } = x; const C = e.clk; C.max = 5; C.n = 4; nextRound(b); R_('fcAnswer')(b, e, 't'); ok(C.n === 0, 'fcAnswer: 경고 칸에서 0칸이 아니다 ' + C.n);
  C.n = 3; nextRound(b); R_('fcAnswer')(b, e, 't'); ok(C.n === 2, 'fcAnswer: 경고 칸이 아닌데 1칸이 아니다 ' + C.n);
}
/* ---------- 테스터 답 고르기(tools/persona/clock-ch1.js): 경고 칸에서 한 행동 답 ---------- */
{
  const PA = require('./persona/clock-ch1.js'); const okAct = (b, r) => !!r && E.actionList(b).some(a => a.id === r[0] && a.ok);
  for (const id of ['bellringer', 'pilgrim', 'bishop', 'cantor', 'scribe']) ok(typeof PA[id] === 'function', '테스터: ' + id + ' 답 고르기가 없다');
  { const x = bellFight(); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = e.clk.max - 1; e.intent = { k: 'ring' }; const r = PA.bellringer(b, e, E, () => 0); ok(r && r[0] === 'dodge' && r[1] === e.id, '테스터: 줄 당길 차례에 흘리지 않는다 ' + JSON.stringify(r)); }
  { const x = mk('pilgrim', ['bruiser', 'bruiser']); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = e.clk.max - 1; e.intent = { k: 'attack' }; const r = PA.pilgrim(b, e, E, () => 0); ok(okAct(b, r) && ['dodge', 'guard'].includes(r[0]), '테스터: 순례자 공격을 흘리거나 막지 않는다 ' + JSON.stringify(r)); }
  { const x = mk('bishop', ['bruiser', 'summoner']); const { b, e } = x; b.p.st = b.p.stMax; for (let i = 0; i < e.clk.max - 1; i++) act(b, e, 'raise'); const r = PA.bishop(b, e, E, () => 0); ok(okAct(b, r), '테스터: 주교 답이 없다 ' + JSON.stringify(r)); }
  { const x = cantorFight(); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = e.clk.max - 1; const r = PA.cantor(b, e, E, () => 0); ok(okAct(b, r), '테스터: 조율자 답이 없다 ' + JSON.stringify(r)); }
  { const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e } = x; b.p.st = b.p.stMax; e.clk.n = e.clk.max - 1; e.intent = { k: 'attack' }; const r = PA.scribe(b, e, E, () => 0); ok(r && r[0] === 'dodge' && r[1] === e.id, '테스터: 서기관 공격을 흘리지 않는다 ' + JSON.stringify(r)); }
  { const x = mk('scribe', ['bruiser', 'darkmage']); const { b, e } = x; b.p.st = b.p.stMax; e.brk = e.brkMax - 1; e.clk.n = e.clk.max - 1; e.intent = { k: 'seal' }; const r = PA.scribe(b, e, E, () => 0); ok(okAct(b, r) && r[1] === e.id, '테스터: 줄을 적으려는 서기관을 무너뜨리러 가지 않는다 ' + JSON.stringify(r)); }
}
{ // 공통 틀: 경고 뒤 내 차례가 한 번 지나기 전에는 파국이 오지 않는다
  const x = mk('scribe'); const b = x.b, e = x.e, C = e.clk; b.fcNoWait = 0; b.turnIdx = 5; const add = R_('fcAdd');
  add(b, e, C.max - 1); ok(C.n === C.max - 1 && C.wT === 5, '경고 차례 기록이 없다 ' + C.wT); add(b, e, 1); ok(C.n === C.max - 1 && !C.doomN, '경고한 그 적 차례에 파국이 왔다');
  b.turnIdx = 6; add(b, e, 1); ok(C.doomN === 1, '내 차례가 지난 뒤에도 파국이 오지 않았다');
  const y = mk('scribe'); const b2 = y.b, e2 = y.e, C2 = e2.clk; b2.fcNoWait = 0; b2.turnIdx = 3; b2.cur = { id: 'basic' }; add(b2, e2, C2.max - 1); b2.cur = null; b2.turnIdx = 4; add(b2, e2, 1); ok(!C2.doomN, '내 행동 중 경고했는데 바로 다음 적 차례에 파국이 왔다'); b2.turnIdx = 5; add(b2, e2, 1); ok(C2.doomN === 1, '내 행동 중 경고 뒤 한 차례 지나도 파국이 오지 않았다');
}
console.log('clock-ch1-check: 시험 ' + H.C.n + '개 · 실패 ' + H.C.fail.length + ' · ' + Object.values(R).join(' · '));
for (const m of H.C.fail) console.log('  실패: ' + m);
if (H.C.fail.length) process.exit(1);
