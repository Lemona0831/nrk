'use strict';
/* 빌드 분포 표 (M3, 10월 19일). node tools/buildmix.js <결과.jsonl|.json> [...] [--pk 성향,…]
   결과 파일(DETAIL 켜짐)에서 직업별로:
   BD-1 큰 각인 집중도: 2고리(K5) · 3고리(K9) 각인을 얻은 판 가운데 가장 많이 고른 각인의 몫
   BD-2 패시브 6방향 분포: 연 패시브 노드의 방향별 몫
   BD-3 유산 비용 분포 1/2/3/4: 쓴 횟수의 비용별 몫
   BD-4 평타 행동 몫 · 피해 몫: 기본 공격 + 강공격 / 전체 행동, 준 피해(DG_BUILDLOG=1로 잰 결과에만 있음)
   BD-5 빌드 축별 완주 격차: 판의 행동 몫으로 축을 나눈다. 평타(기본 + 강공격) 35% 이상 → 평타, 아니면 방어 · 몸 빼기 15% 이상 → 대응, 나머지 → 스킬. 축마다 완주율(10판 이상인 축끼리 격차)
   BD-6 슬롯별 장비 상위 3종 점유: 판 끝 장비의 종류별 상위 셋이 차지하는 몫
   BD-7 직업 격차: 성향마다 1챕터 넘김 · 완주의 직업 최대 − 최소
   BD-8 액티브 부채꼴 분포: 판 끝 장착 스킬의 갈래별 몫(지금은 갈래 셋) */
process.env.DGDIR = process.env.DGDIR || '.';
const fs = require('fs');
const D = require('./dgqa.js'); const G0 = D.G0, r = D.run_; const SK2 = r('SK2');
const argv = process.argv.slice(2); const pkI = argv.indexOf('--pk'); const PKF = pkI >= 0 ? argv[pkI + 1].split(',') : null;
const KSV1 = argv.includes('--ks-v1'); // 0.8.0 M4 전 배치(KS_V1)로 큰 각인 이름을 읽는다(M4 전 게임의 결과용)
const files = argv.filter((a, i) => !a.startsWith('--') && !(pkI >= 0 && i === pkI + 1));
const load = f => { const t = fs.readFileSync(f, 'utf8').trim(); return t.startsWith('[') ? JSON.parse(t) : t.split('\n').filter(Boolean).map(l => JSON.parse(l)); };
let rows = files.flatMap(load); if (PKF) rows = rows.filter(x => PKF.includes(x.pk));
if (!rows.length) { console.error('사용: node tools/buildmix.js <결과> [...] [--pk 성향,…]'); process.exit(2); }
const CL = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
const pc = (a, b) => b ? Math.round(100 * a / b) : '-';
const win1 = x => (x.chs || []).some(c => c.ch === 1) || (x.fights || []).some(f => (f.ch || 1) === 1 && f.t === 'boss' && f.res === 'win');
const BASIC = ['basic', 'heavy'], RESP = ['guard', 'dodge'], NOT_SKILL = new Set(['basic', 'heavy', 'guard', 'dodge', 'flaskL', 'flaskM', 'flaskS', 'sig', 'flee', 'cons']);
const out = [`판 ${rows.length}개 · 성향 ${[...new Set(rows.map(x => x.pk))].join(' · ')}`];
const T = {}; for (const c of CL) T[c] = r(`ptBuild('${c}')`).nodes;
// BD-1
out.push('\n## BD-1 큰 각인 집중도\n\n| 직업 | K5 얻은 판 | K5 최빈(몫) | K9 얻은 판 | K9 최빈(몫) |\n| --- | --- | --- | --- | --- |');
for (const c of CL) { const X = rows.filter(x => x.build === c); const tally = ring => { const m = {}; let n = 0; for (const x of X) { const ks = (x.ks || []).filter(id => id.endsWith('K' + ring)); if (!ks.length) continue; n++; for (const id of ks) { const k = KSV1 ? ((r('KS_LIST')[(r('KS_V1')[c] || {})[id]] || {}).n || id) : ((T[c][id] || {}).n || id); m[k] = (m[k] || 0) + 1; } } const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return [n, top ? `${top[0]} ${pc(top[1], n)}%` : '-']; };
  const [n5, t5] = tally(5), [n9, t9] = tally(9); out.push(`| ${c} | ${n5} | ${t5} | ${n9} | ${t9} |`); }
// BD-2
const DIRS = r('PT.dirs'); const DN = r('PT.dir');
out.push('\n## BD-2 패시브 6방향 분포 (연 노드 몫 %)\n\n| 직업 | ' + DIRS.map(d => DN[d].n).join(' | ') + ' |\n| --- |' + DIRS.map(() => ' --- |').join(''));
for (const c of CL) { const m = {}; let n = 0; for (const x of rows.filter(x => x.build === c && x.ptree)) for (const id of [...(x.ptree.own || []), ...(x.ptree.free || [])]) { const d = (T[c][id] || {}).dir; if (!d) continue; m[d] = (m[d] || 0) + 1; n++; } out.push(`| ${c} | ${DIRS.map(d => pc(m[d] || 0, n)).join(' | ')} |`); }
// BD-3 · BD-4
const acts = x => { const u = {}; for (const f of x.fights || []) for (const k in f.used || {}) u[k] = (u[k] || 0) + f.used[k]; return u; };
const dmg = x => { const u = {}; let has = false; for (const f of x.fights || []) if (f.actDmg) { has = true; for (const k in f.actDmg) u[k] = (u[k] || 0) + f.actDmg[k]; } return has ? u : null; };
out.push('\n## BD-3 유산 비용 분포 · BD-4 평타 몫\n\n| 직업 | 비용 1 / 2 / 3 / 4 (%) | 평타 행동 몫 | 평타 피해 몫 |\n| --- | --- | --- | --- |');
for (const c of CL) { const X = rows.filter(x => x.build === c); const sp = { 1: 0, 2: 0, 3: 0, 4: 0 }; let ua = 0, ub = 0, da = 0, db = 0, dn = 0;
  for (const x of X) { for (const f of x.fights || []) if (f.ys) for (const k in f.ys.sp) sp[k] = (sp[k] || 0) + f.ys.sp[k]; const u = acts(x); for (const k in u) { ua += u[k]; if (BASIC.includes(k)) ub += u[k]; } const d = dmg(x); if (d) { dn++; for (const k in d) { da += d[k]; if (BASIC.includes(k)) db += d[k]; } } }
  const st = [1, 2, 3, 4].reduce((a, k) => a + (sp[k] || 0), 0); out.push(`| ${c} | ${[1, 2, 3, 4].map(k => pc(sp[k] || 0, st)).join(' / ')} | ${pc(ub, ua)}% | ${dn ? pc(db, da) + '%' : '(기록 없음)'} |`); }
// BD-5
out.push('\n## BD-5 빌드 축별 완주 (평타 35%+ · 대응 15%+ · 나머지 스킬)\n\n| 직업 | 평타 판 · 완주 | 스킬 판 · 완주 | 대응 판 · 완주 | 완주 격차(%p) |\n| --- | --- | --- | --- | --- |');
for (const c of CL) { const g = { 평타: [0, 0], 스킬: [0, 0], 대응: [0, 0] };
  for (const x of rows.filter(x => x.build === c)) { const u = acts(x); let b = 0, s = 0, q = 0; for (const k in u) { if (BASIC.includes(k)) b += u[k]; else if (RESP.includes(k)) q += u[k]; else if (!NOT_SKILL.has(k)) s += u[k]; } const tot = Object.values(u).reduce((a, v) => a + v, 0); if (!tot) continue; const ax = b / tot >= 0.35 ? '평타' : q / tot >= 0.15 ? '대응' : '스킬'; g[ax][0]++; if (x.res === 'clear') g[ax][1]++; }
  const rates = Object.values(g).filter(v => v[0] >= 10).map(v => 100 * v[1] / v[0]); out.push(`| ${c} | ${Object.values(g).map(v => `${v[0]} · ${pc(v[1], v[0])}%`).join(' | ')} | ${rates.length > 1 ? Math.round(Math.max(...rates) - Math.min(...rates)) : '-'} |`); }
// BD-6
out.push('\n## BD-6 슬롯별 장비 상위 3종 점유 (판 끝 장비)\n\n| 직업 | 슬롯: 상위 3종 몫(가장 많은 것) |\n| --- | --- |');
for (const c of CL) { const by = {}; for (const x of rows.filter(x => x.build === c)) for (const g of x.gear || []) { const tpl = String(g).split(':')[0]; let kind; try { kind = G0.tplKind(tpl); } catch (e) { kind = '?'; } (by[kind] = by[kind] || {})[tpl] = ((by[kind] || {})[tpl] || 0) + 1; }
  out.push(`| ${c} | ${Object.entries(by).filter(([k]) => k && k !== 'start' && k !== '?').map(([k, m]) => { const v = Object.entries(m).sort((a, b) => b[1] - a[1]); const tot = v.reduce((a, e) => a + e[1], 0); const top3 = v.slice(0, 3).reduce((a, e) => a + e[1], 0); return `${k} ${pc(top3, tot)}% (${v[0][0]})`; }).join(' · ')} |`); }
// BD-7
out.push('\n## BD-7 직업 격차 (최대 − 최소, %p)\n\n| 성향 | 1챕터 넘김 (직업별) | 격차 | 완주 격차 |\n| --- | --- | --- | --- |');
for (const pk of [...new Set(rows.map(x => x.pk))]) { const w = CL.map(c => { const X = rows.filter(x => x.pk === pk && x.build === c); return X.length ? 100 * X.filter(win1).length / X.length : NaN; }); const cl = CL.map(c => { const X = rows.filter(x => x.pk === pk && x.build === c); return X.length ? 100 * X.filter(x => x.res === 'clear').length / X.length : NaN; });
  const gap = a => { const v = a.filter(x => !isNaN(x)); return v.length ? Math.round(Math.max(...v) - Math.min(...v)) : '-'; }; out.push(`| ${pk} | ${w.map(Math.round).join(' · ')} | ${gap(w)} | ${gap(cl)} |`); }
// 제시 대비 선택률 (0.8.0 M5-0): 큰 각인은 ksLog(DG_BUILDLOG)의 제시 · 선택, 부채꼴은 목표(run.sector) 대비 액티브 포인트 최다 부채꼴이 목표와 같은 판
{ const ksRows = rows.filter(x => x.ksLog); if (ksRows.length) { out.push('\n## 큰 각인 제시 대비 선택률 (DG_BUILDLOG 판)\n\n| 직업 | 큰 각인: 고름 / 제시 (%) |\n| --- | --- |');
  for (const c of CL) { const m = {}; for (const x of ksRows.filter(x => x.build === c)) for (const L of x.ksLog) { for (const id of L.offer || []) { const k = (T[c][id] || {}).n || id; (m[k] = m[k] || [0, 0])[1]++; } const k = (T[c][L.id] || {}).n || L.id; (m[k] = m[k] || [0, 0])[0]++; } if (Object.keys(m).length) out.push(`| ${c} | ${Object.entries(m).sort((a, b) => b[1][1] - a[1][1]).map(([k, v]) => `${k} ${v[0]}/${v[1]} (${pc(v[0], v[1])}%)`).join(' · ')} |`); } } }
const secOfId = (c, id) => { const A = r(`atBuild('${c}')`); return A.sec && A.nodes[id] ? A.nodes[id].sec : null; };
{ const sr = rows.filter(x => x.sector); if (sr.length) { out.push('\n## 목표 부채꼴 대비 실제 (액티브 포인트 최다 부채꼴)\n\n| 직업 | 목표: 같은 판 / 목표 판 (%) |\n| --- | --- |');
  for (const c of CL) { const m = {}; for (const x of sr.filter(x => x.build === c)) { const cnt = {}; for (const id of x.tree || []) { const s = secOfId(c, id); if (s) cnt[s] = (cnt[s] || 0) + 1; } const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; const tg = x.sector.replace('_HALF', ''); (m[x.sector] = m[x.sector] || [0, 0])[1]++; if (top && top[0] === tg) m[x.sector][0]++; } if (Object.keys(m).length) out.push(`| ${c} | ${Object.entries(m).map(([k, v]) => `${k} ${v[0]}/${v[1]} (${pc(v[0], v[1])}%)`).join(' · ')} |`); } } }
// BD-8
out.push('\n## BD-8 액티브 부채꼴 분포 (판 끝 장착 스킬의 갈래 몫 %, 부채꼴 트리 직업은 경계 이름 포함)\n\n| 직업 | 갈래별 몫 |\n| --- | --- |');
for (const c of CL) { const m = {}; let n = 0; for (const x of rows.filter(x => x.build === c)) for (const id of x.equip || []) { const b = (SK2[id] || {}).b; if (!b) continue; m[b] = (m[b] || 0) + 1; n++; } out.push(`| ${c} | ${Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pc(v, n)}`).join(' · ')} |`); }
console.log(out.join('\n'));
