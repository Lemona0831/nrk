'use strict';
/* 0.8.0 M6-1 장비 점수 V (설계 nrk-private M6-장비-설계 5절, 만든 사람 확정 10월 20일). 화면에는 보이지 않는다(도구용).
   V(장비) = V기반(슬롯 · 챕터 · 등급 b) + Σ V접사 × 겹침 보정(OV) + V고유.  단위 = 기준 전투(내 차례 11)에서 벌어들이는 피해 환산.
   표(단위 값 · 트리거 · 한 번의 피해 · 조건 몫 · 띠 · K)는 data/affixes.js의 ITEM_V(데이터). 고유는 4-2 식: V고유 = V기반(g) + V접사(고정 접사 · 축) + V규칙, V규칙 = 규칙 값 − 대가 값(사전 추정, data/uniques.js vr · vc).
   실행: node tools/item-score.js [--md] [--affix] [--unique]  — 표를 찍는다. require하면 함수(vAf · vBase · vItem · vUnique · bandOf …)를 돌려준다 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
function load() { const c = {}; vm.createContext(c); for (const f of ['data/items.js', 'data/affixes.js', 'data/uniques.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const (\w+) =/gm, 'var $1 ='), c, { filename: f }); return c; }
const C = load(); const { ITEM_V: IV, AFFIX, UNIQUE, SLOT_BASE, GRADE } = C;
const chm = t => IV.chMul[(t || 1) - 1];
/* 접사 하나의 V(단 t, 값 v): 1챕 단위로 셈한 값 × (챕터와 함께 커지는 값이면 챕터 배율). 띠도 × 챕터 배율 */
function trigOf(A) {
  const T = Object.assign({}, IV.trig), tg = A.tags || [];
  if (tg.includes('흘리기') || tg.includes('막기')) Object.assign(T, { parry: IV.trigTag.parry, guard: IV.trigTag.guard, guardHit: IV.trigTag.guardHit });
  else if (tg.includes('기본공격연동') && !A.fix) Object.assign(T, { basic: IV.trigTag.basic, heavy: IV.trigTag.heavy });
  else if (tg.includes('붕괴')) T.heavy = IV.trigTag.heavy;
  return T;
}
function vAf(id, v, t) {
  const A = AFFIX[id]; if (!A) throw new Error('접사 없음 ' + id); const S = A.vs, U = IV.unit, T = trigOf(A), P = IV.pool, m = chm(t);
  const p = S.p == null ? 1 : typeof S.p === 'number' ? S.p : IV.p[S.p];
  if (S.k === 'flat') return U[S.u] * v * T[S.per] * p * (IV.scale.includes(S.u) ? m : 1);
  if (S.k === 'pct') return (v / 100) * P[S.pool] * T[S.per] * p * m;
  if (S.k === 'inr') return U.inRed * (v / 100) * (S.pool ? P[S.pool] * T[S.per] : P.taken) * p * m;
  if (S.k === 'stat') return U[S.u] * v;
  throw new Error('점수 꼴 ' + id);
}
/* 겹침 보정(5-1): 같은 트리거(vs.per)를 쓰는 접사가 둘이면 둘째부터 × 0.85, 셋이면 × 0.7 */
function vAfs(list, t) { const seen = {}; let s = 0; const rows = []; for (const [id, v] of list) { const A = AFFIX[id], k = A.vs.per || A.vs.u || id; const n = seen[k] = (seen[k] || 0) + 1; const ov = IV.ov[Math.min(n, IV.ov.length) - 1]; const x = vAf(id, v, t) * ov; rows.push({ id, v, V: x, ov }); s += x; } return { V: s, rows }; }
/* 기반 V(5-5 표: 무기 1챕 8 × 기본 공격 5 = 40, 등급 보너스 b %를 곱함) */
function vBase(slot, ch, b) {
  const k = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot, sb = SLOT_BASE[k], x = sb.v[(ch || 1) - 1] * (1 + (b || 0) / 100);
  return sb.k === 'wpn' ? x * IV.trig.basic : sb.k === 'hp' ? x * IV.unit.hp : sb.k === 'st' ? x * IV.unit.st : sb.k === 'flask' ? x * 100 * IV.unit.flaskPct : 0;
}
const gMid = g => (GRADE[g].lo + GRADE[g].hi) / 2;
/* 등급 띠(5-5): V접사 합 목표, 챕터 배율. 희귀 고유 · 영웅 고유의 V규칙 띠 */
function bandOf(g, ch) { const m = chm(ch), B = IV.band; return { af: g === 'n' ? [0, 0] : (B[g] || [0, 0]).map(x => x * m), rule: (g === 'h' ? B.uqH : B.uqR).slice() }; } // V규칙 띠는 1챕 단위(사전 추정이 1챕 단위)
function vUnique(id) {
  const U = UNIQUE[id], t = U.ch, af = U.af.concat(U.ax && U.ax[1] ? [U.ax] : []);
  const base = vBase(U.slot, U.ch, gMid(U.g)), A = vAfs(af, t), rule = U.vr - U.vc;
  return { id, n: U.n, cls: U.cls, g: U.g, ch: U.ch, base, af: A.V, afRows: A.rows, vr: U.vr, vc: U.vc, rule, V: base + A.V + rule, band: bandOf(U.g, U.ch), dPct: rule / IV.K };
}
module.exports = { C, IV, AFFIX, UNIQUE, vAf, vAfs, vBase, vUnique, bandOf, chm, trigOf };
if (require.main === module) {
  const a = process.argv.slice(2), md = a.includes('--md'), all = !a.includes('--affix') && !a.includes('--unique'); const r1 = x => Math.round(x * 10) / 10;
  if (all || a.includes('--affix')) {
    console.log(md ? '| 접사 | 문장 | 1챕 범위 (V) | 2챕 범위 (V) | 3챕 범위 (V) |\n| --- | --- | --- | --- | --- |' : '접사 V(단마다 범위 → V)');
    for (const id in AFFIX) { const A = AFFIX[id]; const c = [1, 2, 3].map(t => A.tier[t] ? A.tier[t].join('~') + ' (' + r1(vAf(id, A.tier[t][0], t)) + '~' + r1(vAf(id, A.tier[t][1], t)) + ')' + (A.pair && A.pair.includes(t) ? ' 짝' : '') : '—');
      console.log(md ? `| ${id} | ${A.txt.replace('{v}', 'N')} | ${c.join(' | ')} |` : id.padEnd(20) + c.join('  ')); }
  }
  if (all || a.includes('--unique')) {
    console.log(md ? '\n| 고유 | 이름 | 등급 · 챕터 | V기반 | V접사 | V규칙(규칙 − 대가) | V | V규칙 띠 | 완주율 추정 %p (÷K) |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |' : '\n고유 V');
    for (const id in UNIQUE) { const u = vUnique(id), inb = u.rule >= u.band.rule[0] && u.rule <= u.band.rule[1];
      console.log(md ? `| ${id} | ${u.n} | ${u.g === 'h' ? '영웅' : '희귀'} ${u.ch}챕 | ${r1(u.base)} | ${r1(u.af)} | ${r1(u.rule)} (${u.vr} − ${u.vc}) | ${r1(u.V)} | ${inb ? '안' : '밖'} (${r1(u.band.rule[0])}~${r1(u.band.rule[1])}) | ${r1(u.dPct)} |` : `${id.padEnd(13)} V ${r1(u.V)} = 기반 ${r1(u.base)} + 접사 ${r1(u.af)} + 규칙 ${r1(u.rule)} ${inb ? '' : '(띠 밖)'}`); }
  }
}
