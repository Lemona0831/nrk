'use strict';
/* 테스터 판단 단위 시험 (0.8.0 M7-1, 10월 22일): 신중 성향의 예고 답하기(dgqa answerPost · answerPre)
   1 강적 · 보스의 큰 한 방 예고가 내 다음 차례 전에 오면: 끊을 수 있으면 붕괴 행동 → 아니면 흘리기 → 아니면 방어
   2 강적 · 보스가 아닌 적, 신중이 아닌 성향, 큰 한 방이 아닌 예고(무시 시험으로 가린 예고 포함)에는 답하지 않는다
   3 (G-1) 강적 시계가 마지막 칸 앞이면 신중은 답한다(clockPre). 종지기는 옛 종 판단(answerPre) 대신 시계로 답한다
   쓰기: node tools/tester-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.'; process.env.ANS_PART = process.env.ANS_PART || 'ans,bell'; // 큰 종 판단은 스위치로만 켜지므로 시험에서 켠다
const H = require('./uqtest/_h.js'); const { E, D } = H;
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
const one = () => 0.5; // 판단 난수(ANS_P 0.95 · 종 0.9 아래)
const mk = (en, setup) => { const f = H.fight('warden', { en, hp: 300, setup }); const b = f.b; b.cur = null; b.p.st = b.p.stMax; return f; };
const withPv = (es, fn) => { const pv0 = E.previewAfter; E.previewAfter = () => es.map(e => ({ e })); try { return fn(); } finally { E.previewAfter = pv0; } };
const strongHeavy = (f, brk) => { const e = f.es[0]; e.strong = true; e.foe = 'knight'; e.dmg = 20; e.brkMax = 100; e.brk = brk; e.intent = { k: 'heavy' }; return e; };
{ // 1-1 끊을 수 있으면 붕괴 행동(강공격 35)
  const f = mk(['bruiser']); const e = strongHeavy(f, 80); const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', f.es[0].id));
  t(r && r[0] !== 'dodge' && r[0] !== 'guard' && r[1] === e.id, '붕괴로 끊을 수 있는데 ' + JSON.stringify(r));
}
{ // 1-2 끊을 수 없으면 흘리기
  const f = mk(['bruiser']); const e = strongHeavy(f, 0); const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', f.es[0].id));
  t(r && r[0] === 'dodge' && r[1] === e.id, '끊을 수 없으면 흘리기가 아니라 ' + JSON.stringify(r));
}
{ // 1-3 흘릴 스태미나가 없으면 방어
  const f = mk(['bruiser']); const e = strongHeavy(f, 0); f.b.p.st = 25; const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', f.es[0].id));
  t(r && r[0] === 'guard', '흘리기를 못 하면 방어가 아니라 ' + JSON.stringify(r));
}
{ // 1-4 보스도 같다
  const f = mk(['bruiser']); const e = f.es[0]; e.role = 'boss'; e.boss = 'abbot'; e.dmg = 20; e.brkMax = 150; e.brk = 0; e.intent = { k: 'heavy' }; const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', f.es[0].id));
  t(r && ['dodge', 'guard'].includes(r[0]), '보스 강타에 답하지 않았다 ' + JSON.stringify(r));
}
{ // 2-1 강적이 아닌 적의 강타에는 답하지 않는다(성향 확률대로)
  const f = mk(['bruiser']); const e = f.es[0]; e.dmg = 20; e.intent = { k: 'heavy' }; const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', f.es[0].id));
  t(r[0] === 'basic', '잡몹 강타에 예고 답하기가 걸렸다 ' + JSON.stringify(r));
}
{ // 2-2 신중이 아닌 성향은 그대로
  const f = mk(['bruiser']); const e = strongHeavy(f, 0); const r = withPv([e], () => [D.answerPost(f.b, {}, one, 'casual', 'basic', e.id), D.answerPost(f.b, {}, one, 'expert', 'basic', e.id), D.answerPost(f.b, {}, one, 'basic', 'basic', e.id)]);
  t(r.every(x => x[0] === 'basic'), '신중이 아닌 성향에 걸렸다 ' + JSON.stringify(r));
}
{ // 2-3 큰 한 방이 아닌 예고(가린 예고 = 평범한 공격)
  const f = mk(['bruiser']); const e = strongHeavy(f, 0); e.intent = { k: 'attack' }; const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', f.es[0].id));
  t(r[0] === 'basic', '평범한 공격에 답했다 ' + JSON.stringify(r));
}
{ // 2-4 판단 난수가 ANS_P 위면 답하지 않는다(사람의 실수 몫)
  const f = mk(['bruiser']); const e = strongHeavy(f, 0); const r = withPv([e], () => D.answerPost(f.b, {}, () => 0.99, 'careful', 'basic', f.es[0].id));
  t(r[0] === 'basic', '실수 몫에서도 답했다 ' + JSON.stringify(r));
}
{ // 1-5 이미 대응(방어 · 흘리기)을 골랐으면 그대로
  const f = mk(['bruiser']); const e = strongHeavy(f, 0); const r = withPv([e], () => [D.answerPost(f.b, {}, one, 'careful', 'guard', null), D.answerPost(f.b, {}, one, 'careful', 'dodge', e.id)]);
  t(r[0][0] === 'guard' && r[1][0] === 'dodge', '이미 고른 대응을 바꿨다 ' + JSON.stringify(r));
}
{ // 2-5 준비 동작(방어 · 흘리기가 대답이 아닌 예고)에는 답하지 않는다: 명사수 조준
  const f = mk(['wallxbow']); const e = f.es[0]; e.strong = true; e.foe = 'marksman'; e.aims = 1; e.intent = { k: 'aimx' }; f.b.ctx.ch = 3; const r = withPv([e], () => D.answerPost(f.b, {}, one, 'careful', 'basic', e.id));
  t(r[0] === 'basic', '조준(준비)에 답했다 ' + JSON.stringify(r));
}
{ // 3-0 온전한 종은 울릴 차례가 아니면 치지 않는다
  const f = mk(['bruiser', 'root']); const rg = f.es[0], bell = f.es[1]; rg.strong = true; rg.foe = 'bellringer'; bell.bell = 1; bell.row = 'front'; f.b.tick = 0; const r = withPv([], () => D.answerPre(f.b, {}, one, 'careful'));
  t(r === null || (D.run_('STRONG.bellEvery') === 1), '울릴 차례가 아닌데 온전한 종을 쳤다 ' + JSON.stringify(r));
}
{ // 3 큰 종(반쯤 깨짐)
  const f = mk(['bruiser', 'root']); const rg = f.es[0], bell = f.es[1]; rg.strong = true; rg.foe = 'bellringer'; bell.bell = 1; bell.row = 'front'; D.run_('fcInit')(f.b, rg); t(rg.clk, '종지기 시계가 만들어지지 않았다');
  t(withPv([], () => D.answerPre(f.b, {}, one, 'careful')) === null, '시계가 있는데 옛 종 판단이 돈다');
  rg.clk.n = rg.clk.max - 2; t(withPv([], () => D.clockPre(f.b, {}, one, 'careful')) == null, '마지막 칸 앞이 아닌데 시계에 답했다');
  rg.clk.n = rg.clk.max - 1; const r = withPv([], () => D.clockPre(f.b, {}, one, 'careful')); t(r && r[0], '마지막 칸 앞인데 시계에 답하지 않았다 ' + JSON.stringify(r));
  t(withPv([], () => D.clockPre(f.b, {}, one, 'casual')) == null, '신중 · 숙련이 아닌데 시계에 답했다');
}
console.log('tester-check: 시험 ' + n + '개 · 실패 ' + T.length); for (const m of T) console.log('  실패: ' + m); if (T.length) process.exit(1);
