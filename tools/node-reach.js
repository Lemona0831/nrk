'use strict';
/* 노드 도달률 히트맵 (M3, 10월 19일). M5에서 "버릴 칸"을 고르는 근거.
   node tools/node-reach.js <결과.jsonl|.json> [...]   (dgqa 결과의 ptree.own · free · ks, tree)
   판 끝에 열려 있던 노드의 비율(그 직업 판 전체 대비). 0회 노드는 따로 목록으로 낸다 */
process.env.DGDIR = process.env.DGDIR || '.';
const fs = require('fs');
const D = require('./dgqa.js'); const r = D.run_;
const load = f => { const t = fs.readFileSync(f, 'utf8').trim(); return t.startsWith('[') ? JSON.parse(t) : t.split('\n').filter(Boolean).map(l => JSON.parse(l)); };
const rows = process.argv.slice(2).flatMap(load);
if (!rows.length) { console.error('사용: node tools/node-reach.js <결과> [...]'); process.exit(2); }
const CL = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
const DIRS = r('PT.dirs'); const POS = ['1C', '2L', '2R', '3L', '3R', 'K5', '4L', '4R', '5L', '5R', '6L', '6R', 'K9', '7L', '7R', '8L', '8R'];
const out = [`판 ${rows.length}개 (${[...new Set(rows.map(x => x.pk))].join(' · ')})`];
const shade = p => p >= 50 ? '█' : p >= 20 ? '▓' : p >= 5 ? '▒' : p > 0 ? '░' : '·';
for (const c of CL) {
  const X = rows.filter(x => x.build === c && x.ptree); if (!X.length) continue; const n = X.length;
  const cnt = {}; for (const x of X) for (const id of [...(x.ptree.own || []), ...(x.ptree.free || []), ...(x.ptree.ks || [])]) cnt[id] = (cnt[id] || 0) + 1;
  const P = r(`ptBuild('${c}')`).nodes; const A = r(`atBuild('${c}')`);
  out.push(`\n### ${c} (${n}판)\n\n패시브 개방 %: 행 = 자리, 열 = 방향. 칸 = 비율과 종류(작 = 작은 노드, 중 = 중간 노드, 각 = 큰 각인). █ 50+ ▓ 20+ ▒ 5+ ░ 0 초과 · 0\n\n| 자리 | ${DIRS.join(' | ')} |\n| --- |${DIRS.map(() => ' --- |').join('')}`);
  for (const pos of POS) out.push(`| ${pos} | ${DIRS.map(d => { const id = d + pos, N = P[id]; if (!N) return ''; const p = Math.round(100 * (cnt[id] || 0) / n); return `${shade(p)} ${p} ${({ small: '작', notable: '중', keystone: '각' })[N.kind] || ''}`; }).join(' | ')} |`);
  const zeroP = Object.values(P).filter(N => N.kind !== 'start' && !cnt[N.id]).map(N => `${N.id}(${N.n})`);
  const ac = {}; for (const x of X) for (const id of x.tree || []) ac[id] = (ac[id] || 0) + 1;
  const AN = Object.values(A.nodes).filter(N => N.kind !== 'start');
  out.push(`\n액티브 개방 %: ` + A.br.map(b => `**${b}** ` + AN.filter(N => N.br === b).map(N => `${N.n}${N.kind === 'upgrade' ? '(강화)' : ''} ${Math.round(100 * (ac[N.id] || 0) / n)}`).join(' · ')).join(' / '));
  const zeroA = AN.filter(N => !ac[N.id]).map(N => `${N.id}(${N.n}${N.kind === 'upgrade' ? ', 강화' : ''})`);
  out.push(`\n0회 노드: 패시브 ${zeroP.length}개${zeroP.length ? ' — ' + zeroP.join(', ') : ''} · 액티브 ${zeroA.length}개${zeroA.length ? ' — ' + zeroA.join(', ') : ''}`);
}
console.log(out.join('\n'));
