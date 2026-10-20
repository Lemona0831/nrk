'use strict';
/* 0.8.0 M5-2 수도승 재설계 점검 (10월 20일 만든 사람 설계지 2판). 실행: node tools/mk-check.js
   되받기 한도(기본 2 · 금강 자세 3 · 역천권 제한 없음) · 연환권(기 1마다 1타) · 붕권(쏟은 기마다 +20%) · 기공 응축(다음 쏟는 기 ×2) · 사혈 폭쇄 · 탈기 · 탈혼수 ·
   부동심 · 철포삼(자세 유지) · 천근추 · 금강불괴 · 내공 순환 · 되돌린 주먹 · 승부수 셋(역천권 · 천망 · 일지멸맥과 대가) · 결합 칸 셋(삼재권 · 역류 · 불퇴) · 한 줄 설명 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, U = R_('MK_BOUND'), MONK = R_('MONK'), ctrMax = R_('monkCtrMax'), fx = R_('fxAdd'), st = R_('st'), setKi = R_('setKi');
function fight(act, en, hp) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('monk'); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = act.slice(); run.skills = act.filter(id => (E.atBuild('monk').nodes[id] || {}).kind === 'skill').slice(0, 4); E.atSync(run);
  const es = (en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = hp || 5000; e.dmg = 1; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const A = (b, id) => E.actionList(b).find(x => x.id === id) || {};
const use = (b, id, t) => { b.p.ys = 9; b.p.st = b.p.stMax; E.playerAct(b, id, t); };
const lost = e => 5000 - e.hp;
const one = (ids, id, prep, en) => { const f = fight(ids, en); if (prep) prep(f); use(f.b, id, f.es[0].id); return f; };
// 되받기 한도
{ const { p } = fight(['m_geumgang']); ok(MONK.ctrMax === 2 && ctrMax(p) === 2, '되받기 기본 한도 2(3 → 2)');
  p.stance = { dmg: 8, max: 3, mul: 0.2 }; ok(ctrMax(p) === 3, '금강 자세: 이번 차례 3번까지'); p.mkSt = { yeok: 2 }; ok(ctrMax(p) === Infinity, '역천권: 제한 없음'); }
{ const { p, b } = fight(['m_geumgang'], ['bruiser', 'bruiser', 'bruiser', 'bruiser']); use(b, 'm_brace'); use(b, 'guard'); E.runUntilPlayer(b); ok((b.log.filter(x => /^되받기 \(\d\/2\)/.test(x.m)).length) <= 2 && !b.log.some(x => /^되받기 \(3\//.test(x.m)), '받아칠 자세 + 방어: 한 적 차례에 되받기 2번까지(' + b.log.filter(x => /^되받기 \(/.test(x.m)).length + ')'); }
// 연환권 · 천수연타
{ const bas = (k, c) => { const f = fight(['m_yeonhwan']); setKi(f.p, k); if (c) use(f.b, 'm_yeonhwan'); use(f.b, 'basic', f.es[0].id); return f; }; const d0 = lost(bas(3, 0).es[0]), f3 = bas(3, 1), d3 = lost(f3.es[0]), d1 = lost(bas(0, 1).es[0]);
  ok(Math.abs(d3 / d0 - 7) < 0.15 && Math.abs(d1 / lost(bas(0, 0).es[0]) - 4) < 0.1 && f3.b.log.some(x => /연환권: 기본 공격이 7타/.test(x.m)), '연환권(평타형 ⚡): 이번 차례 기본 공격 +3타, 기 3이면 1 → 7타(기 0이면 4타) — ' + Math.round(d0) + ' → ' + Math.round(d3)); ok(!f3.p.mkSt.chain, '기본 공격을 치면 연환권은 사라짐'); }
{ const d0 = lost(one(['m_yeonhwan', 'm_cheonsu'], 'm_cheonsu').es[0]); const d1 = lost(one(['m_yeonhwan', 'm_cheonsu'], 'm_cheonsu', f => setKi(f.p, 1)).es[0]);
  ok(Math.abs(d1 / d0 - 4 / 3) < 0.05, '천수연타(⚡): 기가 있으면 3타 → 4타 — ' + Math.round(d0) + ' → ' + Math.round(d1)); }
// 붕권 · 기공 응축 · 멸각
{ const d0 = lost(one(['m_bunggwon'], 'm_bunggwon').es[0]); const f4 = one(['m_bunggwon'], 'm_bunggwon', f => setKi(f.p, 4)); const d4 = lost(f4.es[0]);
  ok(Math.abs(d4 / d0 - (1 + 4 * 0.2)) < 0.05 && st(f4.p, 'empower') === 0, '붕권: 기 4를 모두 쏟아 ×1.8, 기 0 — ' + Math.round(d0) + ' → ' + Math.round(d4)); }
{ const f = fight(['m_bunggwon', 'm_eungchuk']); setKi(f.p, 2); use(f.b, 'm_eungchuk'); ok(f.p.mkSt.condense === 3, '기공 응축: 다음 쏟는 기 +3 준비'); use(f.b, 'm_bunggwon', f.es[0].id);
  const g = fight(['m_bunggwon']); setKi(g.p, 2); use(g.b, 'm_bunggwon', g.es[0].id); ok(Math.abs(lost(f.es[0]) / lost(g.es[0]) - 2.0 / 1.4) < 0.05 && !f.p.mkSt.condense, '기공 응축 뒤 붕권: 쏟는 기 2가 5로(×1.4 → ×2.0), 한 번 쓰면 사라짐'); }
// 사혈 폭쇄 · 탈기 · 탈혼수 · 되돌린 주먹
{ const f = one(['m_jeomhyeol', 'm_poswae'], 'm_poswae', f => E.addS(f.b, f.es[0], 'chill', 3)); const g = one(['m_jeomhyeol', 'm_poswae'], 'm_poswae');
  ok(!(st(f.es[0], 'chill') > 0) && lost(f.es[0]) > lost(g.es[0]) + 3 * 11 * 0.9, '사혈 폭쇄: 둔화 3을 터뜨려 1마다 +11, 둔화는 사라짐'); }
{ const f = one(['m_sahyeol', 'm_talgi'], 'm_talgi', f => { E.addS(f.b, f.es[0], 'chill', 2); f.p.hp = 50; }); ok(f.b.log.some(x => /탈기: 둔화 2에서 생명력 \+6/.test(x.m)), '탈기: 둔화 1마다 생명력 +3'); }
{ const f = fight(['m_sahyeol', 'm_talhon'], ['bruiser', 'bruiser', 'bruiser']); setKi(f.p, 0); use(f.b, 'm_talhon'); E.runUntilPlayer(f.b); ok(f.b.log.some(x => /탈혼수\. 기 \+3/.test(x.m)), '탈혼수: 맞은 적마다 기 +1(셋)'); }
{ const f = fight(['m_doedol'], ['bruiser']); f.p.ctrN = 2; use(f.b, 'm_doedol', f.es[0].id); const g = fight(['m_doedol'], ['bruiser']); g.p.ctrN = 0; use(g.b, 'm_doedol', g.es[0].id); ok(lost(f.es[0]) - lost(g.es[0]) > 2 * 6 * 0.9, '되돌린 주먹: 지난 적 차례에 되받은 1마다 +6'); }
// 자세 유지 · 천근추 · 금강불괴 · 내공 순환
{ const f = fight(['m_budong']); const B = () => use(f.b, 'basic', f.es[0].id); use(f.b, 'm_budong'); B(); ok(f.p.stance && f.p.stance.keep === 3, '부동심: 자세 3차례'); B(); ok(f.p.stance && f.p.stance.keep === 2, '내 차례가 와도 자세가 남음(2)'); B(); ok(f.p.stance && f.p.stance.keep === 1, '둘째 차례에도 남음(1)'); B(); ok(!f.p.stance, '셋째 차례 첫 행동에 풀림'); }
{ const f = fight(['m_cheongeun'], ['bruiser']); use(f.b, 'm_cheongeun'); const e = f.es[0]; e.s.broken = null; e.brk = 0; f.b.cur = null; R_('monkCounter')(f.b, { src: e, charged: 1 }); ok(e.s.broken || e.brk >= e.brkMax, '천근추: 강타를 되받으면 그 적이 무너짐'); }
{ const f = fight(['m_bulgoe']); use(f.b, 'm_bulgoe'); ok(f.p.mkSt.adamant === 4 && Math.abs(fx(f.p, 'inP', f.b, f.p, {}) - U.adamantRed) < 1e-9, '금강불괴: 4차례 받는 피해 −40%'); }
{ const f = fight(['m_sunhwan']); use(f.b, 'm_sunhwan'); ok(f.p.mkSt.flow === 3 && Math.abs(R_('fxMul')(f.p, 'out', f.b, f.p, { id: 'basic' }) - 1.55) < 1e-9, '내공 순환: 3차례 ▶ 공격 ×1.55'); f.b.curFast = 1; ok(R_('fxMul')(f.p, 'out', f.b, f.p, { id: 'basic' }) === 1, '⚡ 공격에는 붙지 않음'); f.b.curFast = 0; }
// 승부수
{ const f = fight(['m_yeokcheon'], ['bruiser', 'bruiser', 'bruiser']); use(f.b, 'm_yeokcheon'); const S = f.p.mkSt; ok(S.yeok === 3 && f.p.stance, '역천권: 3차례, 자세를 잡음'); ok(!A(f.b, 'guard').ok && /역천권/.test(A(f.b, 'guard').why || ''), '대가: 방어 불가');
  ok(Math.abs(fx(f.p, 'inP', f.b, f.p, {}) + U.yeokIn) < 1e-9, '대가: 받는 피해 +30%'); f.p.ctrN = 5; ok(ctrMax(f.p) === Infinity, '되받기 제한 없음'); E.runUntilPlayer(f.b); use(f.b, 'basic', f.es[0].id); ok(f.p.stance && S.yeok === 2, '내 차례가 와도 자세 유지');
  const e = f.es[0]; const k0 = e.brk || 0; f.b.cur = null; f.p.ctrN = 0; R_('monkCounter')(f.b, { src: e }); ok((e.brk || 0) - k0 === MONK.ctrBrk + U.yeokBrk || e.s.broken, '되받기마다 붕괴 +15'); }
{ const f = fight(['m_cheonmang'], ['bruiser']); use(f.b, 'm_cheonmang'); ok(f.p.mkSt.cheon === 3, '천망: 3차례'); const e = f.es[0]; const h0 = e.hp; f.b.cur = null; f.p.stance = { dmg: 10 }; R_('monkCounter')(f.b, { src: e }); ok(e.hp === h0, '대가: 되받기 피해 0');
  f.p.mkSt.cheonN = {}; f.p.mkSt.cheonSeal = {}; delete e.s.chill; R_('mkCheonHit')(f.b, e); ok(st(e, 'chill') === 2, '나를 친 적에게 둔화 +2'); R_('mkCheonHit')(f.b, e); e.intent = { k: 'heal' }; ok(e.intent.k === 'heal', '쌓인 둔화 4: 아직 봉인 아님'); R_('mkCheonHit')(f.b, e); ok(f.p.mkSt.cheonN[e.id] >= 5 && e.intent.k === 'attack', '천망으로 쌓인 둔화가 5가 된 적은 봉인(지원 행동 끊김, 둔화 상한 3이라 쌓인 수로 센다)'); }
{ const f = fight(['m_ilji'], ['bruiser']); const e = f.es[0]; E.addS(f.b, e, 'chill', 3); setKi(f.p, 4); const hp0 = f.p.hp; use(f.b, 'm_ilji', e.id);
  ok(lost(e) >= 10 * 3 * 4 && st(f.p, 'empower') === 0 && hp0 - f.p.hp >= Math.round(f.p.hpMax * 0.1) - 1, '일지멸맥: 기 4를 쏟아 (둔화 3 × 기 4 × 10) 피해, 대가 생명력 10% — ' + Math.round(lost(e)));
  ok(f.p.mkSt.noKi === 3 && E.addS(f.b, f.p, 'empower', 2) === 0, '대가: 3차례 기를 얻지 못함'); }
// 결합 칸
{ const f = fight(['m_samjae', 'm_jeomhyeol']); use(f.b, 'm_samjae'); ok(f.p.mkSt.samjae === 1, '삼재권 켜짐'); setKi(f.p, R_('kiCapOf')(f.p)); const g = fight(['m_jeomhyeol']); setKi(g.p, R_('kiCapOf')(g.p));
  use(f.b, 'm_jeomhyeol', f.es[0].id); use(g.b, 'm_jeomhyeol', g.es[0].id); ok(Math.abs(lost(f.es[0]) / lost(g.es[0]) - 1.25) < 0.03, '삼재권: 기가 가득이면 ⚡ 공격(점혈)도 +25%'); }
{ const f = fight(['m_yeokryu'], ['bruiser']); use(f.b, 'm_yeokryu'); E.runUntilPlayer(f.b); setKi(f.p, 0); E.addS(f.b, f.es[0], 'chill', 2); use(f.b, 'basic', f.es[0].id); ok(f.b.log.some(x => /^역류: 둔화된 적을 쳐 기 \+1/.test(x.m)), '역류: 둔화된 적을 기본 공격으로 치면 기 +1'); }
{ const f = fight(['m_bultoe'], ['bruiser']); use(f.b, 'm_bultoe'); const e = f.es[0]; f.b.cur = null; f.p.stance = { dmg: 0 }; f.p.ctrN = 0; let h0 = e.hp; R_('monkCounter')(f.b, { src: e }); const d1 = h0 - e.hp; e.s.broken = { t: 2 }; h0 = e.hp; f.p.ctrN = 0; R_('monkCounter')(f.b, { src: e }); const d2 = h0 - e.hp; ok(d2 > d1 * 1.9, '불퇴: 무너진 적을 되받으면 ×2 — ' + Math.round(d1) + ' → ' + Math.round(d2)); }
// 한 줄 설명
{ const A2 = E.atBuild('monk'); for (const x of Object.values(A2.nodes).filter(x => x.kind === 'skill')) { const s = E.SK2[x.id], d = E.skBody(s); ok(!/\s{2}/.test(d) && d.length > 4 && (s.line || d.length <= R_('MK_DESC_MAX')), s.n + ' 한 줄 설명: ' + d); } }
console.log('mk-check: ' + n + '개 통과');
