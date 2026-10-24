'use strict';
/* 트리 총량 표 (M3, 10월 19일, 보고만 — 판정 없음). node tools/tree-totals.js
   패시브: 직업 × 방향(pw · ct · ag · lg · su · sv)별 중간 노드 수, 작은 노드 능력치 합, 1 · 2고리 중간 노드 가운데 직업 전용 비율.
   액티브: 유산 비용 분포(1/2/3/4), 강화 · 스킬 노드 비율, 갈래별 스킬 수 */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'); const r = D.run_;
const CL = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
const DIRS = r('PT.dirs'); const STATS = ['str', 'dex', 'int', 'con', 'wil'];
const out = [];
out.push('## 패시브: 방향별 중간 노드 수 (1 · 2 · 3고리 합)\n\n| 직업 | ' + DIRS.join(' | ') + ' | 합 |\n| --- |' + DIRS.map(() => ' --- |').join('') + ' --- |');
const P = {}; for (const c of CL) P[c] = Object.values(r(`ptBuild('${c}')`).nodes);
for (const c of CL) { const n = DIRS.map(d => P[c].filter(x => x.dir === d && x.kind === 'notable').length); out.push(`| ${c} | ${n.join(' | ')} | ${n.reduce((a, b) => a + b, 0)} |`); }
out.push('\n## 패시브: 작은 노드 능력치 합 (방향별, 힘 · 민첩 · 지능 · 체력 · 의지)\n\n| 직업 | ' + DIRS.join(' | ') + ' | 전체 |\n| --- |' + DIRS.map(() => ' --- |').join('') + ' --- |');
const sumStat = L => { const s = {}; for (const x of L) for (const k of STATS) if (x.stat && x.stat[k]) s[k] = (s[k] || 0) + x.stat[k]; return s; };
const fmt = s => STATS.filter(k => s[k]).map(k => ({ str: '힘', dex: '민', int: '지', con: '체', wil: '의' })[k] + s[k]).join(' ') || '-';
for (const c of CL) { const sm = P[c].filter(x => x.kind === 'small'); out.push(`| ${c} | ${DIRS.map(d => fmt(sumStat(sm.filter(x => x.dir === d)))).join(' | ')} | ${fmt(sumStat(sm))} (효과 붙은 작은 노드 ${sm.filter(x => x.fx).length}) |`); }
out.push('\n## 패시브: 1 · 2고리 중간 노드의 직업 전용 비율, 3고리 비교\n\n| 직업 | 1고리 직업 / 전체 | 2고리 직업 / 전체 | 1 · 2고리 직업 비율 | 3고리 직업 / 전체 | 큰 각인 직업 / 전체 |\n| --- | --- | --- | --- | --- | --- |');
for (const c of CL) { const nt = P[c].filter(x => x.kind === 'notable'); const cnt = ring => { const L = nt.filter(x => x.ring === ring); return [L.filter(x => x.pool === 'class').length, L.length]; }; const [a1, b1] = cnt(1), [a2, b2] = cnt(2), [a3, b3] = cnt(3); const ks = P[c].filter(x => x.kind === 'keystone');
  out.push(`| ${c} | ${a1} / ${b1} | ${a2} / ${b2} | ${Math.round(100 * (a1 + a2) / (b1 + b2))}% | ${a3} / ${b3} | ${ks.filter(x => x.pool === 'class').length} / ${ks.length} |`); }
out.push('\n## 액티브: 유산 비용 분포 · 강화 / 스킬\n\n| 직업 | 스킬 수 | 비용 1 / 2 / 3 / 4 | 강화 노드 | 강화 ÷ 스킬 | 갈래별 스킬 · 강화 |\n| --- | --- | --- | --- | --- | --- |');
for (const c of CL) { const A = r(`atBuild('${c}')`); const N = Object.values(A.nodes); const sk = N.filter(x => x.kind === 'skill'), up = N.filter(x => x.kind === 'upgrade'); const cost = [1, 2, 3, 4].map(k => sk.filter(x => x.ys === k).length);
  out.push(`| ${c} | ${sk.length} | ${cost.join(' / ')} | ${up.length} | ${(up.length / sk.length).toFixed(2)} | ${A.br.map(b => b + ' ' + sk.filter(x => x.br === b).length + ' · ' + up.filter(x => x.br === b).length).join(', ')} |`); }
console.log(out.join('\n'));
