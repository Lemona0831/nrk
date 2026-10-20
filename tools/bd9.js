'use strict';
/* BD-9 꼬리표 프로필 · 상황 동등 표 (0.8.0 M5-0 보정 5, 10월 20일 만든 사람 결정 D15 · D18)
   node tools/bd9.js <결과.jsonl> [...] [--cls spellblade]   (DG_BUILDLOG=1로 돈 결과: tags · vsel · offer · fights.nEn · nBack · nBig · actDmg)
   - 빌드 = 판 끝 꼬리표(찍은 스킬 · 고른 변형 · 큰 각인, 명령 5번 그대로. 패시브 작은 · 중간 노드는 세지 않는다)의 정체성 꼬리표 상위 둘(순서 없는 조합). 같은 수면 꼬리표 이름 순
   - 빌드 수 = 3챕터에 닿은 판 가운데 비중 ≥8%이면서 (완주율이 직업 평균 ±10%p 또는 상황 표에서 어느 상황 1위). 분모는 만든 사람 결정(10월 20일): 완주가 적어 완주 판 대신 3챕터에 닿은 판
   - 상황 표: 빌드(판 20개 이상) × 상황(무리 적 4+ · 거구 정예/강적 · 후열 적 · 장기전 10라운드+ · 보스)의 전투 승률 · 평균 순손실
     합격: 모든 빌드가 상황 하나 이상에서 상위 절반, 어느 빌드도 모든 상황에서 하위 1/4이 아님
   - 평타 빌드: 판의 평타(기본 공격 · 강공격) 피해 몫 평균 ≥40%인 빌드
   - 변형 선택률: 자리를 연 판 가운데 각 변형을 고른 몫(≤70%), 결합 칸: 찍힌 판 몫(≥10%) */
const fs = require('fs'); process.env.DGDIR = process.env.DGDIR || '.'; const D = require('./dgqa.js'), R = D.run_;
const argv = process.argv.slice(2); const ci = argv.indexOf('--cls'); const CLS = ci >= 0 ? argv[ci + 1] : 'spellblade';
const files = argv.filter((a, i) => !a.startsWith('--') && !(ci >= 0 && i === ci + 1));
const rows = files.flatMap(f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))).filter(x => x.build === CLS && x.tags);
if (!rows.length) { console.error('사용: node tools/bd9.js <DG_BUILDLOG 결과.jsonl> [...]'); process.exit(2); }
const ID = CLS === 'warden' ? ['보호막', '붕괴', '태세', '기본공격연동', '원거리', '광역', '취약'] /* 0.8.0 M5-1 파수꾼 */ : CLS === 'monk' ? ['기', '되받기', '자세', '둔화', '봉인', '붕괴', '기본공격연동', '광역', '원거리'] /* 0.8.0 M5-2 수도승 */ : ['출혈', '화상', '혈염', '보호막', '교대', '붕괴', '싣기', '기본공격연동', '흘리기'];
const SK2 = R('SK2'), PTT = R('PT_TAGS'), AV = cls => R('atBuild')(cls).vars || {}; const PTN = cls => R('ptBuild')(cls).nodes;
const tagsOf = x => { const c = {}, add = L => { for (const t of L || []) c[t] = (c[t] || 0) + 1; }; const A = R('atBuild')(x.build); for (const id of x.tree || []) if (A.nodes[id] && A.nodes[id].kind === 'skill' && SK2[id]) add(SK2[id].tags); for (const v of Object.values(x.vsel || {})) add((AV(x.build)[v] || {}).tags); const P = PTN(x.build); for (const id of (x.ptree && x.ptree.ks) || x.ks || []) add(PTT[(P[id] || {}).fx]); return c; };
const prof = x => { x.tags = tagsOf(x); const e = ID.map(k => [k, x.tags[k] || 0]).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); return e.length >= 2 ? [e[0][0], e[1][0]].sort().join('·') : e.length ? e[0][0] : '없음'; }; // 순서 없는 조합
const basicShare = x => { let b = 0, t = 0; for (const f of x.fights || []) for (const k in f.actDmg || {}) { t += f.actDmg[k]; if (k === 'basic' || k === 'heavy') b += f.actDmg[k]; } return t ? b / t : 0; };
const pc = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
const out = [];
const N = rows.length, clears = rows.filter(x => x.res === 'clear'), avgClear = pc(clears.length, N); const reach3 = x => (x.fights || []).some(f => (f.ch || 1) >= 3); const R3 = rows.filter(reach3);
const P = {}; for (const x of rows) { const k = prof(x); const p = P[k] = P[k] || { k, n: 0, c: 0, r3: 0, bs: 0, fights: [] }; p.n++; if (x.res === 'clear') p.c++; if (reach3(x)) p.r3++; p.bs += basicShare(x); for (const f of x.fights || []) p.fights.push(f); }
/* 상황 */
const SIT = [['무리', f => (f.nEn || 0) >= 4], ['거구', f => f.t !== 'boss' && (f.nBig || 0) >= 1], ['후열', f => (f.nBack || 0) >= 1], ['장기전', f => (f.rounds || 0) >= 10], ['보스', f => f.t === 'boss']];
const big = Object.values(P).filter(p => p.n >= 20).sort((a, b) => b.n - a.n);
const sit = {}; for (const p of big) { sit[p.k] = SIT.map(([nm, fn]) => { const F = p.fights.filter(fn); const w = F.filter(f => f.res === 'win').length; return { nm, n: F.length, win: pc(w, F.length), net: F.length ? Math.round(F.reduce((a, f) => a + (f.net || 0), 0) / F.length) : 0 }; }); }
const rankTop = {}, rankBot = {}; for (let i = 0; i < SIT.length; i++) { const L = big.filter(p => sit[p.k][i].n >= 5).sort((a, b) => sit[b.k][i].win - sit[a.k][i].win); L.forEach((p, j) => { (rankTop[p.k] = rankTop[p.k] || []).push(j < Math.ceil(L.length / 2)); (rankBot[p.k] = rankBot[p.k] || []).push(j >= L.length - Math.max(1, Math.floor(L.length / 4))); if (j === 0) (p.best = p.best || []).push(SIT[i][0]); }); }
/* BD-9 */
out.push(`## BD-9 꼬리표 프로필 (${CLS}, 판 ${N}, 3챕터에 닿은 판 ${R3.length}, 완주 ${clears.length} = ${avgClear}%)\n\n빌드 = 정체성 꼬리표 상위 둘(${ID.join(' · ')}). 비중은 3챕터에 닿은 판 기준(만든 사람 결정), 완주율은 그 빌드 판 전체 기준.\n\n| 빌드 | 판 | 3챕터 판 비중 % | 완주율 % | 평타 피해 몫 % | 상황 1위 | 빌드로 셈 |\n| --- | --- | --- | --- | --- | --- | --- |`);
const builds = [];
for (const p of Object.values(P).sort((a, b) => b.r3 - a.r3 || b.n - a.n)) { const share = pc(p.r3, R3.length), cr = pc(p.c, p.n), ok = share >= 8 && (Math.abs(cr - avgClear) <= 10 || (p.best || []).length > 0); if (ok) builds.push(p); if (p.n < 10 && !p.r3) continue;
  out.push(`| ${p.k} | ${p.n} | ${share} | ${cr} | ${Math.round(100 * p.bs / p.n)} | ${(p.best || []).join(' · ') || '-'} | ${ok ? '예' : ''} |`); }
out.push(`\n빌드 수(3챕터 판 비중 ≥8% · 완주율 평균 ±10%p 또는 상황 1위): **${builds.length}** — ${builds.map(p => p.k).join(', ') || '없음'}`);
/* 상황 표 */
out.push(`\n## 상황 동등 표 (빌드 판 20개 이상, 전투 승률 % · 평균 순손실 %)\n\n| 빌드 | ${SIT.map(s => s[0]).join(' | ')} | 상위 절반인 상황 | 모든 상황 하위 1/4 |\n| --- |${SIT.map(() => ' --- |').join('')} --- | --- |`);
let sitOk = true; for (const p of big) { const top = (rankTop[p.k] || []).filter(Boolean).length, allBot = (rankBot[p.k] || []).length > 0 && (rankBot[p.k] || []).every(Boolean); if (!top || allBot) sitOk = false;
  out.push(`| ${p.k} | ${sit[p.k].map(s => s.n >= 5 ? `${s.win} · ${s.net}` : '-').join(' | ')} | ${top} | ${allBot ? '예' : ''} |`); }
out.push(`\n상황 표 판정: **${sitOk ? '합격' : '미달'}** (모든 빌드가 상황 하나 이상에서 상위 절반, 모든 상황 하위 1/4인 빌드 없음)`);
/* 평타 빌드 */
const bas = big.filter(p => p.bs / p.n >= 0.4); out.push(`\n## 평타 빌드 (평타 피해 몫 ≥40%)\n\n${bas.length ? bas.map(p => `- ${p.k}: 판 ${p.n}, 평타 몫 ${Math.round(100 * p.bs / p.n)}%, 완주율 ${pc(p.c, p.n)}% (직업 평균 ${avgClear}%), 상위 절반 상황 ${(rankTop[p.k] || []).filter(Boolean).length}`).join('\n') : '- 없음'}\n\n평타 빌드 수: **${bas.length}**`);
/* 변형 선택률 */
const slotN = {}, varN = {}; for (const x of rows) for (const s in x.vsel || {}) { slotN[s] = (slotN[s] || 0) + 1; const k = s + '|' + x.vsel[s]; varN[k] = (varN[k] || 0) + 1; }
const vr = Object.entries(varN).map(([k, n]) => { const [s, v] = k.split('|'); return { s, v, n, p: pc(n, slotN[s]) }; }).sort((a, b) => b.p - a.p);
const over = vr.filter(x => x.p > 70 && slotN[x.s] >= 10); out.push(`\n## 변형 선택률 (자리를 연 판 가운데, 자리 10판 이상)\n\n최대: ${vr.filter(x => slotN[x.s] >= 10).slice(0, 5).map(x => `${x.v} ${x.p}% (${x.s} ${slotN[x.s]}판)`).join(' · ')}\n70% 넘는 변형: **${over.length}**${over.length ? ' — ' + over.map(x => x.v + ' ' + x.p + '%').join(', ') : ''}\n변종을 고른 판: ${rows.filter(x => Object.values(x.vsel || {}).some(v => /^sbm_/.test(v))).length} · 변종이 제시된 판: ${rows.filter(x => x.offer && x.offer.mut).length} / ${N}`);
/* 결합 칸 */
const CB = CLS === 'warden' ? ['w_turncoat', 's_hammerhand', 'f_chainpull'] : CLS === 'monk' ? ['m_samjae', 'm_yeokryu', 'm_bultoe'] : ['sb_bloodfist', 'sb_counterburn', 'sb_tricolor']; out.push(`\n## 결합 칸 (찍힌 판 %, 제시된 판 가운데 %)\n\n${CB.map(id => { const n = rows.filter(x => (x.tree || []).includes(id)).length, o = rows.filter(x => x.offer && (x.offer.combos || []).includes(id)).length; return `- ${id}: ${pc(n, N)}% (${n}/${N}), 제시된 판의 ${pc(n, o)}%`; }).join('\n')}`);
console.log(out.join('\n'));
