'use strict';
/* 대답 공백 점검 (0.8.0 A0, 1막 재설계 ① 적 문법 엔진 6번)
   직업 여섯 × 길 고정 빌드(부채꼴 A · B · C × 갈래 a · b, dgqa DG_PATH) × 신중 성향 N판. 강적 · 보스를 만날 때마다 그때 빌드가 쓸 수 있는 대답 태그(js/30 playerAnsTags,
   기절 · 봉인은 빼고 본다 — 빌드가 가진 것만)를 모아, 그 적의 위협 예고(data/foes.js pat 가운데 TELE_WAIT가 아닌 것)마다 닿는 대답이 하나 이상인지 본다.
   G-1: 강적 시계(FOE_CLOCK)의 답 태그도 같은 방법으로 본다(소모품 답 'cons'는 소모품 가방이나 등불 기름이 있을 때, 골드 답 'gold'는 골드 30 이상일 때만 닿는다) — 시계 하나에 닿는 답이 하나도 없으면 공백 '시계'.
   data/foes.js에 정의가 없는 적(아직 옮기지 않은 2 · 3챕터)은 "정의 없음"으로 센다.
   쓰기: node tools/void-check.js [--seeds 5] [--chapters 1] [--from 2]. 공백이 있으면 표를 찍고 1로 끝난다 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--seeds', 5), CHS = +arg('--chapters', 1), ONE = arg('--one', null), FROM = arg('--from', null); if (FROM) process.env.DG_FROM = FROM; // A2: --from 2 = 2챕터에서 시작
const CLASSES = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'], BUILDS = ['A:a', 'A:b', 'B:a', 'B:b', 'C:a', 'C:b'];

if (ONE) { // 자식: 직업 하나 · 빌드 하나
  process.env.DGDIR = process.env.DGDIR || '.';
  const D = require('./dgqa.js'), R_ = D.run_; D.OPT.chapters = CHS;
  const FOES = R_('FOES'), WAIT = R_('TELE_WAIT'), foeDef = R_('foeDef'), tagsOf = R_('playerAnsTags'), CLK = R_('FOE_CLOCK'), G = R_('G');
  const out = {}; let last = null;
  D.OPT.onTurn = G => { const b = G.b; if (b === last) return; last = b;
    for (const e of b.en) { if (!(e.strong || e.role === 'boss')) continue; const id = e.role === 'boss' ? e.boss : e.foe; const F = foeDef(b, e);
      const o = out[id] = out[id] || { n: 0, def: !!F, miss: {} }; o.n++; if (!F) continue;
      const p = b.p, st0 = p.stun, sl0 = b.seal; p.stun = 0; b.seal = []; const T = tagsOf(b); p.stun = st0; b.seal = sl0;
      const kinds = [...new Set((Array.isArray(F.pat) ? F.pat : Object.values(F.pat)).flat())].filter(k => !WAIT.includes(k) && (F.ans[k] || []).length);
      for (const k of kinds) if (!F.ans[k].some(x => T.has(x))) o.miss[k] = (o.miss[k] || 0) + 1;
      const K = e.strong && CLK[e.foe]; if (K) { if (G.run && ((G.run.cons || []).length || (G.run.oil || 0) > 0)) T.add('cons'); if (G.run && (G.run.gold || 0) >= 30) T.add('gold'); if (!(K.ans || []).some(x => T.has(x))) o.miss['시계'] = (o.miss['시계'] || 0) + 1; } } };
  for (let i = 0; i < N; i++) { try { D.playChar('careful', ONE, 5000 + 13 * i); } catch (e) { } }
  process.stdout.write(JSON.stringify(out));
} else {
  const res = {};
  for (const c of CLASSES) for (const bd of BUILDS) {
    const r = cp.spawnSync(process.execPath, [__filename, '--one', c, '--seeds', String(N), '--chapters', String(CHS)].concat(FROM ? ['--from', FROM] : []), { cwd: process.cwd(), env: Object.assign({}, process.env, { DGDIR: '.', DG_PATH: bd }), encoding: 'utf8', maxBuffer: 1 << 26 });
    try { res[c + ' ' + bd] = JSON.parse(r.stdout); } catch (e) { res[c + ' ' + bd] = { _err: (r.stderr || '').slice(0, 200) }; }
  }
  const V = [], seen = {}, nodef = {};
  for (const k in res) { if (res[k]._err) { V.push([k, '판 예외', res[k]._err]); continue; } for (const id in res[k]) { const o = res[k][id]; seen[id] = (seen[id] || 0) + o.n; if (!o.def) { nodef[id] = 1; continue; } for (const kk in o.miss) V.push([k, id, kk + ' (' + o.miss[kk] + '/' + o.n + '번 만남)']); } }
  console.log('void-check: 직업 ' + CLASSES.length + ' × 길 고정 빌드 ' + BUILDS.length + ' × ' + N + '판 · ' + CHS + '챕터까지 · 만난 강적 · 보스 ' + Object.keys(seen).length + '(' + Object.keys(seen).map(id => id + ' ' + seen[id]).join(', ') + ')' + (Object.keys(nodef).length ? ' · 정의 없음 ' + Object.keys(nodef).join(' ') : ''));
  console.log('  위협 예고마다 닿는 대답: 공백 ' + V.length);
  if (V.length) { console.log('  | 직업 · 빌드 | 적 | 대답이 닿지 않는 예고 |'); for (const v of V) console.log('  | ' + v.join(' | ') + ' |'); process.exit(1); }
}
