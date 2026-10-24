'use strict';
/* 0.8.0 M6-2 장비 생성 점검 (설계 nrk-private M6-장비-설계 6 · 9절, 만든 사람 확정 10월 20일). 실행: node tools/gear8-gen-check.js [표본=10000]
   값 띠: 생성 표본에서 등급 띠 밖 0(평범 0 · 고급 8~14 · 희귀 22~34 · 영웅 38~54 × 챕터 배율, 겹침 보정 포함) · 접사 값이 단 범위 안 · 같은 묶음 둘 없음 · 슬롯 · 직업 맞음
   빌드 보장: 상점 표본마다 "지금 빌드" 장비 ≥ 1 · 챕터 곡선: 1챕 희귀 V ≈ 2챕 고급 V(±15%), 2챕 희귀 ≈ 3챕 고급 · 사어 0 · 고유는 판에 한 번 · 등급 확률표
   옛 장비가 든 세이브를 열어도 오류 0(그 칸을 비움) · 다시 굴리기(값 1.6^n · 같은 묶음 없음 · 고유 · 축 안 됨) · 같은 시드 같은 장비 */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'), E = D.G0, R_ = D.run_; const N = +(process.argv[2] || 10000);
R_('GEAR8.on = true');
const G = E.__G; const AF = R_('AFFIX'), UQ = R_('UNIQUE'), IV = R_('ITEM_V'); let n = 0; const err = [], info = [];
const ok = (c, m) => { n++; if (!c) err.push(m); };
const rng = s => () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const CLS = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
function newRun(c, seed) {
  E.__rr = rng(seed); R_('Math.random = __rr');
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun(c); const run = G.run; run.uqSeen = [];
  // 빌드: 액티브 스킬 2~4개 · 패시브 노드 몇 개를 무작위로
  const T = E.atBuild(c), sk = Object.values(T.nodes).filter(x => x.kind === 'skill' && x.ring === 1).map(x => x.id); const pick = sk.sort(() => E.__rr() - 0.5).slice(0, 2 + Math.floor(E.__rr() * 3));
  run.atree.own = pick.slice(); run.skills = pick.slice(-4); E.atSync(run); const P = E.ptBuild(c), pn = Object.keys(P.nodes).filter(id => P.nodes[id].ring === 1); run.ptree.own.push(...pn.sort(() => E.__rr() - 0.5).slice(0, 3)); E.ptSync(run);
  return run;
}
const Vaf = it => R_('g8VAfs')(R_('g8Afs')(it), it.uq ? UQ[it.uq].ch : it.ch, it.uq ? (UQ[it.uq].cls === 'all' ? null : UQ[it.uq].cls) : it.k), band = (g, t) => R_('g8Band')(g, t);
/* 1 값 띠 · 데이터 맞음 */
{ let out = 0, cnt = { n: 0, m: 0, r: 0, h: 0 }, uq = 0; const per = {};
  for (let i = 0; i < N; i++) { const c = CLS[i % 6], run = newRun(c, 1000 + i), ch = 1 + (i % 3), where = ['room', 'big', 'boss', 'shop'][Math.floor(i / 3) % 4]; run.ch = ch;
    const it = R_('g8Gen')(run, { ch, where }); cnt[it.g]++; if (it.uq) { uq++; continue; }
    const t = it.ch, list = R_('g8Afs')(it), v = Vaf(it), B = it.g === 'n' ? [0, 0] : band(it.g, t);
    if (!(v >= B[0] - 1e-6 && v <= B[1] + 1e-6)) { out++; if (err.length < 5) err.push('띠 밖: ' + it.g + ' ' + t + '챕 V ' + v.toFixed(1) + ' ' + JSON.stringify(list)); }
    const fams = list.map(a => AF[a.id].fam); ok(new Set(fams).size === fams.length, '같은 묶음 둘: ' + JSON.stringify(list));
    for (const a of list) { const A = AF[a.id], rg = R_('g8Rng')(a.id, t, it.k); ok(A.tier[t] && a.v >= rg[0] && a.v <= rg[1], '단 범위 밖: ' + a.id + ' ' + a.v); ok(A.slot.includes(R_('g8Slot')(it)), '슬롯: ' + a.id); ok(A.cls === 'all' || A.cls === c, '직업: ' + a.id + ' → ' + c); }
    ok(list.length === { n: 0, m: 1, r: 2, h: 3 }[it.g], '접사 수: ' + it.g + ' ' + list.length);
    const base = R_('AFFIX_BASE')[it.tpl]; ok(base && (base.cls === 'all' || base.cls.includes(c)), '기반 모양 직업: ' + it.tpl + ' → ' + c);
    const k = it.g + t; (per[k] = per[k] || []).push(R_('g8V')(it)); }
  ok(out === 0, '값 띠 밖 ' + out + ' / ' + N);
  info.push('생성 ' + N + '개: 평범 ' + cnt.n + ' · 고급 ' + cnt.m + ' · 희귀 ' + cnt.r + ' · 영웅 ' + cnt.h + ' (고유 ' + uq + ') · 띠 밖 ' + out);
  /* 챕터 곡선(E4 · 9절): 1챕 희귀 ≈ 2챕 고급, 2챕 희귀 ≈ 3챕 고급 (±15%) — 같은 슬롯 분포의 V 평균 */
  const avg = k => { const L = per[k] || []; return L.reduce((a, x) => a + x, 0) / Math.max(1, L.length); };
  const c1 = avg('r1') / avg('m2'), c2 = avg('r2') / avg('m3');
  ok(Math.abs(c1 - 1) <= 0.15, '챕터 곡선 1챕 희귀 / 2챕 고급 = ' + c1.toFixed(3)); ok(Math.abs(c2 - 1) <= 0.15, '챕터 곡선 2챕 희귀 / 3챕 고급 = ' + c2.toFixed(3));
  info.push('챕터 곡선: 1챕 희귀 ' + avg('r1').toFixed(1) + ' / 2챕 고급 ' + avg('m2').toFixed(1) + ' = ' + c1.toFixed(3) + ' · 2챕 희귀 ' + avg('r2').toFixed(1) + ' / 3챕 고급 ' + avg('m3').toFixed(1) + ' = ' + c2.toFixed(3));
}
/* 2 등급 확률표(6-1, 방 드롭): 1챕 65/28/7/0 · 2챕 45/35/16/4 · 3챕 30/38/24/8 */
for (const ch of [1, 2, 3]) { const run = newRun('warden', 77 + ch); const c = { n: 0, m: 0, r: 0, h: 0 }; for (let i = 0; i < 20000; i++) c[R_('g8Grade')(ch, 'room')]++; const T = R_('G8GEN').grade[ch];
  ok(['n', 'm', 'r', 'h'].every(g => Math.abs(c[g] / 200 - T[g]) < 1.2), ch + '챕 방 드롭 등급표 ' + JSON.stringify(c)); void run; }
{ const b3 = Array.from({ length: 200 }, () => R_('g8Grade')(3, 'boss')), b1 = Array.from({ length: 200 }, () => R_('g8Grade')(1, 'boss')); ok(b3.every(g => g === 'h') && b1.every(g => g === 'r'), '보스: 1챕 희귀 이상(1챕은 영웅 없음) · 3챕 영웅 보장'); }
/* 3 빌드 보장: 상점 표본마다 "지금 빌드" 장비 ≥ 1 */
{ let miss = 0, heroSh = 0; for (let i = 0; i < N; i++) { const c = CLS[i % 6], run = newRun(c, 50000 + i), ch = 1 + (i % 3); run.ch = ch; const tags = R_('g8BuildTags')(run);
    const st = R_('g8ShopStock')(run, ch); if (st.some(x => x.hero)) heroSh++; const fit = st.some(x => R_('g8Fits')(x.it, tags)); if (!fit) { miss++; if (err.length < 8) err.push('빌드 보장 실패: ' + c + ' 꼬리표 ' + [...tags].join(',')); }
    ok(st.length >= 6 && st.some(x => x.it.g === 'r'), '상점: 여섯 이상 · 희귀 1 이상'); }
  ok(miss === 0, '빌드 보장 ' + (N - miss) + '/' + N); info.push('상점 ' + N + '개: 지금 빌드 장비 있음 ' + (N - miss) + ' · 영웅 칸 ' + heroSh); }
/* 4 고유: 판에 한 번 · 직업 고유는 그 직업만 */
{ const run = newRun('assassin', 7); run.ch = 3; const got = []; for (let i = 0; i < 3000; i++) { const it = R_('g8Gen')(run, { ch: 3, g: i % 2 ? 'r' : 'h' }); if (it.uq) got.push(it.uq); }
  ok(new Set(got).size === got.length, '같은 고유는 판에 한 번(' + got.length + '개)'); ok(got.every(id => ['assassin', 'all'].includes(UQ[id].cls)), '직업 고유는 그 직업에게만'); }
/* 5 사어 0: 생성 장비의 이름 · 줄 */
{ let bad = 0; for (let i = 0; i < 2000; i++) { const c = CLS[i % 6], run = newRun(c, 90000 + i); run.ch = 1 + (i % 3); const it = R_('g8Gen')(run, { ch: run.ch, g: ['m', 'r', 'h'][i % 3] }); const t = R_('g8Name')(it) + ' ' + R_('g8Lines')(it).map(x => x.t).join(' ');
    if (/마나|캔트립|쿨타임/.test(t) || (c !== 'spellblade' && /주문/.test(t))) { bad++; if (err.length < 10) err.push('사어: ' + c + ' ' + t); } } ok(bad === 0, '사어 0'); }
/* 6 옛 장비가 든 세이브: 오류 없이 그 칸을 비운다 */
{ let e0 = null; try { R_('GEAR8.on = false'); const run = newRun('hunter', 4242); R_('GEAR8.on = false'); delete run.inv; E.initGear(run); const old = Object.keys(E.ITEMS).filter(k => E.ITEMS[k].slot === 'ring' && E.ITEMS[k].kind !== 'start').slice(0, 2); for (const k of old) { const it = E.mkItem(k); run.inv[it.uid] = it; run.bag.push(it.uid); }
    const saved = JSON.parse(JSON.stringify(run)); R_('GEAR8.on = true'); G.run = saved; E.initGear(saved); E.applyGear(saved); const html = E.vEquip();
    ok(Object.values(saved.inv).every(x => x.g8) && saved.eqU.weapon && saved.inv[saved.eqU.weapon] && !saved.bag.some(u => !saved.inv[u]) && html.length > 100, '옛 장비 세이브: 옛 장비를 비우고 무기 칸은 평범 새 무기, 장비 창 그림'); }
  catch (e) { e0 = e; } finally { R_('GEAR8.on = true'); } ok(!e0, '옛 장비 세이브 열기 오류: ' + (e0 && e0.stack)); }
/* 7 다시 굴리기(6-4) */
{ const run = newRun('warden', 31); run.ch = 2; run.gold = 99999; let it; do { it = R_('g8Gen')(run, { ch: 2, g: 'r', noUq: true }); } while (it.uq);
  const p0 = R_('g8RerollPrice')(it); const fam0 = it.af.map(a => AF[a.id].fam); const got = R_('g8Reroll')(run, it, 0); const p1 = R_('g8RerollPrice')(it);
  ok(got && !fam0.includes(AF[got.id].fam), '다시 굴리기: 같은 묶음을 뺀 풀에서 새로'); ok(p0 === Math.round(90 * 1.5) && p1 === Math.round(90 * 1.5 * 1.6), '값 = 기준가 × 1.5^(챕터−1) × 1.6^n (' + p0 + ' → ' + p1 + ')');
  const v = Vaf(it), B = band('r', 2); ok(v >= B[0] - 1e-6 && v <= B[1] + 1e-6, '다시 굴린 뒤에도 등급 띠 안(V ' + v.toFixed(1) + ')');
  const u = R_('mkUq')('wd_h1', 2); ok(!!R_('g8RerollWhy')(run, u), '고유는 다시 굴리지 않는다'); }
/* 8 같은 시드 → 같은 장비 */
{ const a = JSON.stringify(R_('g8ShopStock')(newRun('monk', 555), 2).map(x => [x.it.tpl, x.it.g, x.it.af, x.it.ax, x.it.uq])), b = JSON.stringify(R_('g8ShopStock')(newRun('monk', 555), 2).map(x => [x.it.tpl, x.it.g, x.it.af, x.it.ax, x.it.uq])); ok(a === b, '같은 시드 같은 진열'); }
/* 9 엔진 V와 도구 V(tools/item-score.js)가 같은 식 */
{ const S = require('./item-score.js'); let d = 0; for (const id in AF) for (const t of [1, 2, 3]) if (AF[id].tier[t]) d = Math.max(d, Math.abs(S.vAf(id, AF[id].tier[t][1], t) - R_('g8VAf')(id, AF[id].tier[t][1], t))); ok(d < 1e-9, '엔진 V = item-score V'); }
console.log('gear8-gen-check: ' + n + '개 점검 · 실패 ' + err.length); for (const x of info) console.log('  ' + x); for (const x of err) console.log('  실패: ' + x); if (err.length) process.exit(1);
