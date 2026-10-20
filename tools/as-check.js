'use strict';
/* 0.8.0 M5-3 암살자 재설계 점검 (10월 20일 만든 사람 설계지 4판). 실행: node tools/as-check.js
   공통 규칙(터뜨리기는 대상 중독을 0으로 만들고 남은 독 피해를 지금) · 그림자 판정 ①–④ · 6-0 판정(격발 찌르기 1.5배 · 맹독 라운드 끝 · 연쇄 격발 다시 쓰기 ·
   터뜨리기 배수는 가장 큰 하나 · 만독개화 생명력 15% · 무영살 광역 포함 표적 아님) · 승부수 대가 · 독사 · 격발 · 결합 칸 · 한 줄 설명 */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, U = R_('AS_BOUND'), st = R_('st'), fx = R_('fxAdd'), addPoison = R_('addPoison'), PT = R_('poisonTotal');
function fight(act, en, hp) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('assassin'); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = act.slice(); run.skills = act.filter(id => (E.atBuild('assassin').nodes[id] || {}).kind === 'skill').slice(0, 4); E.atSync(run);
  const es = (en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = hp || 5000; e.dmg = 1; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const A = (b, id) => E.actionList(b).find(x => x.id === id) || {};
const use = (b, id, t) => { b.p.ys = 9; b.p.st = b.p.stMax; E.playerAct(b, id, t); };
const lost = e => e.hpMax - e.hp;
const psn = (f, e, k) => addPoison(f.b, e, k, 1);
const basic1 = () => { const f = fight([]); use(f.b, 'basic', f.es[0].id); return lost(f.es[0]); }; const B0 = basic1();
const near = (a, b, t) => Math.abs(a - b) <= (t || 0.06) * Math.max(1, Math.abs(b));
// 공통 규칙: 터뜨리기
{ const f = fight(['a_gyeokpyo']); psn(f, f.es[0], 5); const g = fight(['a_gyeokpyo']); use(f.b, 'a_gyeokpyo', f.es[0].id); use(g.b, 'a_gyeokpyo', g.es[0].id);
  const bd = lost(f.es[0]) - lost(g.es[0]), want = PT(5) * R_('triggerDamageMul')(f.p);
  ok(!(st(f.es[0], 'poison') > 0) && near(bd, want), '터뜨리기: 대상 중독 5를 0으로, 남은 독 피해(1+…+5)를 지금 — ' + Math.round(bd) + ' / ' + Math.round(want)); }
{ const f = fight(['a_gyeokjjil']); psn(f, f.es[0], 5); const g = fight(['a_gyeokjjil']); use(f.b, 'a_gyeokjjil', f.es[0].id); use(g.b, 'a_gyeokjjil', g.es[0].id);
  const bd = lost(f.es[0]) - lost(g.es[0]), want = PT(5) * R_('triggerDamageMul')(f.p) * 1.5; ok(near(bd, want), '6-0 격발 찌르기: 터뜨리기 피해 1.5배 — ' + Math.round(bd) + ' / ' + Math.round(want)); }
{ const f = fight(['a_gyeokjjil', 'a_kkotip']); psn(f, f.es[0], 5); use(f.b, 'a_kkotip'); ok(f.p.asSt.nextBurst === 2, '꽃잎 모으기: 다음 터뜨리기 2배'); const g = fight(['a_gyeokjjil']);
  use(f.b, 'a_gyeokjjil', f.es[0].id); use(g.b, 'a_gyeokjjil', g.es[0].id); const bd = lost(f.es[0]) - lost(g.es[0]), want = PT(5) * R_('triggerDamageMul')(f.p) * 2;
  ok(near(bd, want) && !f.p.asSt.nextBurst, '6-0 터뜨리기 배수는 겹쳐도 가장 큰 하나(꽃잎 2배 · 찌르기 1.5배 → 2배, 3배 아님), 꽃잎은 쓰면 사라짐 — ' + Math.round(bd) + ' / ' + Math.round(want)); }
{ const f = fight(['a_gyeolsan'], ['bruiser']); f.es[0].elite = 1; psn(f, f.es[0], 4); const g = fight(['a_gyeolsan'], ['bruiser']); g.es[0].elite = 1; use(f.b, 'a_gyeolsan', f.es[0].id); use(g.b, 'a_gyeolsan', g.es[0].id);
  ok(near(lost(f.es[0]) - lost(g.es[0]), PT(4) * R_('triggerDamageMul')(f.p) * 2), '독 결산: 정예에게 터뜨리기 피해 2배'); }
// 독사
{ const f = fight(['a_dokkal', 'a_godok']); psn(f, f.es[0], 4); use(f.b, 'a_godok', f.es[0].id); ok(st(f.es[0], 'poison') >= 7, '고독: 대상 중독 ×2 (4 → 8, 라운드 끝 −1) — ' + st(f.es[0], 'poison')); }
{ const f = fight(['a_dokkal', 'a_maengdok'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_maengdok', e.id); ok(e.asVir === 1, '맹독: 대상에 표시');
  e.s.poison.stacks = 10; use(f.b, 'basic', e.id); ok(st(e, 'poison') === 11, '6-0 맹독: 라운드가 끝날 때(독 피해 뒤) 중독 10 이상이면 줄지 않고 +1 — ' + st(e, 'poison'));
  e.s.poison.stacks = 9; use(f.b, 'basic', e.id); ok(st(e, 'poison') === 8, '맹독: 10 아래면 평소처럼 −1'); }
{ const f = fight(['a_dokkal', 'a_yeokbyeong'], ['bruiser', 'bruiser', 'bruiser'], 30); use(f.b, 'a_yeokbyeong'); const [e0, e1, e2] = f.es; e0.s.poison = { stacks: 6, until: 1e9, dur: 1e9 }; e0.hp = 1; use(f.b, 'basic', e0.id);
  ok(!e0.alive && st(e1, 'poison') >= 5 && st(e2, 'poison') >= 5, '역병: 쓰러진 적의 중독 6이 다른 적 모두에게 옮겨붙음'); }
{ const f = fight(['a_dokchim']); use(f.b, 'a_dokchim'); ok(f.p.asSt.nextPsn.n === 3, '독침: 다음 기본 공격 3번'); use(f.b, 'basic', f.es[0].id); ok(f.p.asSt.nextPsn.n === 2 && f.b.log.some(x => /^독침: /.test(x.m)), '기본 공격 한 번에 중독 1, 남은 2번'); }
// 격발 2 · 3고리
{ const f = fight(['a_dokpyo'], ['bruiser', 'archer']); use(f.b, 'a_dokpyo', f.es[0].id); ok(st(f.es[0], 'poison') > 0 && st(f.es[1], 'poison') > 0, '독 표창: 대상과 후열 하나에게 중독'); }
{ const f = fight(['a_yeonswae'], ['bruiser', 'bruiser', 'bruiser'], 300); const [e0] = f.es; e0.hp = 5; psn(f, e0, 4); f.p.ys = 9; f.p.st = f.p.stMax; const y0 = 9; E.playerAct(f.b, 'a_yeonswae', e0.id);
  const re = A(f.b, 'a_yeonswae'), bs = A(f.b, 'basic'), en = A(f.b, 'as_end'); ok(!e0.alive && re.ok && !bs.ok && en.ok, '6-0 연쇄 격발: 쓰러뜨리면 이번 차례 다시 쓸 기회(그 칸 · 넘기기만)');
  const y1 = f.p.ys; psn(f, f.es[1], 3); E.playerAct(f.b, 'a_yeonswae', f.es[1].id); ok(y0 > y1 && y1 > f.p.ys, '다시 쓰면 유산을 다시 낸다(' + y0 + ' → ' + y1 + ' → ' + f.p.ys + ')'); ok(!f.b.asChainAgain, '다시 쓰기는 차례마다 한 번'); }
// 그림자 판정 ①–④
{ const f = fight(['a_heulbe', 'a_dokni'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_dokni'); psn(f, e, 3); (e.intent = { k: 'attack' }, use(f.b, 'a_heulbe', e.id));
  ok(f.b.log.some(x => /^독니: \S+ 중독 \+/.test(x.m)), '판정 ① 흘려 베기의 반격은 기본 공격: 독니가 붙는다'); }
{ const f = fight(['a_heulbe', 'a_dokchim'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_dokchim'); ok(f.p.asSt.nextPsn.n === 3, '독침 준비');
  const h0 = e.hp; (e.intent = { k: 'attack' }, use(f.b, 'a_heulbe', e.id)); ok(f.p.asSt.nextPsn.n === 2 && near(h0 - e.hp, B0, 0.25), '판정 ① 반격(기본 공격 ×1)이 독침 한 번을 쓴다 — 반격 ' + Math.round(h0 - e.hp) + ' / 기본 ' + Math.round(B0)); }
{ const f = fight(['a_heulbe', 'a_heulkal'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_heulkal'); const h0 = e.hp; (e.intent = { k: 'attack' }, use(f.b, 'a_heulbe', e.id)); const ctr = h0 - e.hp;
  const h1 = e.hp; e.intent = { k: 'attack' }; use(f.b, 'basic', e.id); const d1 = h1 - e.hp; const h2 = e.hp; use(f.b, 'basic', e.id); const d2 = h2 - e.hp;
  ok(near(ctr, B0, 0.25) && near(d1, B0 * U.flowMul, 0.25) && near(d2, B0, 0.25), '판정 ② 흘린 칼: 반격은 ×1, 내 다음 차례 첫 기본 공격만 ×1.5, 그다음은 ×1 — ' + [ctr, d1, d2].map(Math.round).join(' / ')); }
{ const f = fight(['a_janyeong', 'a_heulbe'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_janyeong'); ok(f.p.asSt.zan === 5, '잔영난무: 4차례(쓴 차례 뒤 내 차례 넷, 차례 시작마다 −1)'); const h0 = e.hp; use(f.b, 'basic', e.id); const d = h0 - e.hp;
  ok(near(d, 2 * B0, 0.25), '판정 ③ 내가 누른 기본 공격은 두 번 — ' + Math.round(d) + ' / ' + Math.round(B0)); const h1 = e.hp; (e.intent = { k: 'attack' }, use(f.b, 'a_heulbe', e.id));
  ok(near(h1 - e.hp, B0, 0.25), '판정 ③ 반격은 두 번이 아님 — ' + Math.round(h1 - e.hp)); }
{ const f = fight(['a_heulbe', 'a_kalchum'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_kalchum'); const h0 = e.hp; (e.intent = { k: 'attack' }, use(f.b, 'a_heulbe', e.id));
  ok(near(h0 - e.hp, 2 * B0, 0.25), '판정 ④ 흘려 낸 한 번에 반격 1 + 칼춤 1, 추가 공격이 추가 공격을 부르지 않음 — ' + Math.round(h0 - e.hp) + ' / ' + Math.round(2 * B0)); }
{ const f = fight(['a_heulbe', 'a_heuldok'], ['bruiser']); const e = f.es[0]; use(f.b, 'a_heuldok'); (e.intent = { k: 'attack' }, use(f.b, 'a_heulbe', e.id)); ok(f.b.log.some(x => /^흘린 독: \S+ 중독 \+/.test(x.m)), '흘린 독: 흘려 낼 때 그 적 중독 +2'); }
// 승부수
{ const f = fight(['a_mandok'], ['bruiser', 'bruiser', 'bruiser']); const [e0, e1, e2] = f.es; psn(f, e1, 4); psn(f, e2, 3); psn(f, e0, 2); const hp0 = f.p.hp; f.b.stepMode = true; use(f.b, 'a_mandok', e0.id); f.b.stepMode = false;
  ok(hp0 - f.p.hp === Math.round(f.p.hpMax * U.bloomHp) && f.p.hpMax === hp0 && !(st(e1, 'poison') > 0) && near(lost(e0), PT(9) * 2 * R_('triggerDamageMul')(f.p), 0.08), '만독개화: 생명력 −15%(최대치 그대로), 모든 적의 중독 9를 대상에게 모아 2배로 터뜨림 — ' + Math.round(lost(e0)));
  f.p.hp = Math.floor(f.p.hpMax * 0.15); ok(!A(f.b, 'a_mandok').ok, '6-0 만독개화: 생명력이 최대치의 15% 이하면 쓸 수 없음');
  const g = fight(['a_mandok']); g.p.hp = Math.round(g.p.hpMax * 0.16); g.b.stepMode = true; use(g.b, 'a_mandok', g.es[0].id); ok(g.p.hp >= 1, '대가로는 쓰러지지 않음'); }
{ const f = fight(['a_muyeong'], ['bruiser', 'bruiser']); f.p.s.poison = { stacks: 3, until: 1e9, dur: 1e9 }; f.b.stepMode = true; use(f.b, 'a_muyeong'); ok(f.p.asSt.hide === 1, '무영살: 숨음'); const hp0 = f.p.hp;
  ok(R_('hurtPlayer')(f.b, 30, { src: f.es[0], aoe: 1 }) === 0 && f.p.hp === hp0, '6-0 무영살: 숨은 동안 광역을 포함한 어떤 공격의 표적도 아님');
  for (const e of f.es) e.intent = { k: 'attack' }; f.b.stepMode = false; const n0 = f.b.log.length; E.runUntilPlayer(f.b); const L = f.b.log.slice(n0).map(x => x.m);
  ok(f.p.hp < hp0 && L.some(m => /^숨어 있어/.test(m)) && !L.some(m => /나를 벤다\. [1-9]/.test(m)), '적의 공격은 닿지 않고, 중독 같은 지속 피해는 받음'); const mu = A(f.b, 'as_mu'); ok(mu.ok, '다음 차례: 무영살 베기');
  const e = f.es[0]; const h0 = e.hp; use(f.b, 'as_mu', e.id); ok(!f.p.asSt.hide && near(h0 - e.hp, R_('outDmg')(f.b, R_('wpnDmg')(f.p) * 3, { weapon: 1 }), 0.25) && !A(f.b, 'dodge').ok, '고른 적의 등 뒤에서 무기 피해의 3배, 대가: 흘리기 못 함');
  ok(f.p.asSt.noParry === 2 && !A(f.b, 'dodge').ok, '벤 뒤 첫 차례: 흘리기 못 함'); use(f.b, 'basic', e.id); ok(!A(f.b, 'dodge').ok, '둘째 차례: 흘리기 못 함'); use(f.b, 'basic', e.id); ok(A(f.b, 'dodge').ok, '셋째 차례: 흘리기 됨'); }
{ const f = fight(['a_muyeong']); use(f.b, 'a_muyeong'); E.runUntilPlayer(f.b); use(f.b, 'basic', f.es[0].id); ok(!f.p.asSt.mu || !A(f.b, 'as_mu').ok, '무영살 베기는 숨은 다음 차례에만'); }
{ const f = fight(['a_janyeong']); use(f.b, 'a_janyeong'); ok(Math.abs(fx(f.p, 'inP', f.b, f.p, {}) + U.zanIn) < 1e-9, '잔영난무 대가: 받는 피해 +20%');
  for (let i = 0; i < 4; i++) use(f.b, 'guard'); ok(f.p.asSt.zan === 1, '넷째 차례까지 이어짐'); use(f.b, 'guard'); ok(!f.p.asSt.zan && f.p.asSt.noStam === U.zanNoStam, '끝난 뒤 2차례 스태미나가 차지 않음');
  f.p.st = 10; f.b.stepMode = true; E.playerAct(f.b, 'basic', f.es[0].id); f.b.stepMode = false; E.runUntilPlayer(f.b); ok(f.p.st === 10, '스태미나 그대로 — ' + f.p.st); }
// 결합 칸 · 장막
{ const f = fight(['a_jangmak'], ['bruiser']); use(f.b, 'a_jangmak'); f.es[0].intent = { k: 'attack' }; use(f.b, 'guard'); ok(f.b.log.some(x => /^독의 장막: \S+에게 중독/.test(x.m)), '독의 장막: 나를 친 적에게 중독'); }
{ const f = fight(['a_gyeokpyo', 'a_dwikkot'], ['bruiser', 'archer']); use(f.b, 'a_dwikkot'); const e = f.es[1]; ok(e.row === 'back', '후열 궁수'); psn(f, e, 4); const g = fight(['a_gyeokpyo'], ['bruiser', 'archer']);
  use(f.b, 'a_gyeokpyo', e.id); use(g.b, 'a_gyeokpyo', g.es[1].id); ok(lost(e) - lost(g.es[1]) > PT(4) * 1.4 * R_('triggerDamageMul')(f.p), '등 뒤의 꽃: 후열 적에게 터뜨리기 1.5배'); }
// 한 줄 설명 · 승부수 문장
{ const A2 = E.atBuild('assassin'); for (const x of Object.values(A2.nodes).filter(x => x.kind === 'skill')) { const s = E.SK2[x.id], d = E.skBody(s); ok(!/\s{2}/.test(d) && d.length > 4 && (s.line || d.length <= R_('MK_DESC_MAX')), s.n + ' 한 줄 설명: ' + d); }
  ok(E.SK2.a_mandok.cut === 'arcane' && E.SK2.a_muyeong.cut === 'blade' && E.SK2.a_janyeong.cut === 'guard', '컷인: 만독개화 마법 · 무영살 검 · 잔영난무 방어'); }
console.log('as-check: ' + n + '개 통과');
