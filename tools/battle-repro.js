'use strict';
/* 전투 재현 비교 (10월 17일 0.8.0 5단계, docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 11절)
   같은 전투 시작 상태에서 장착 · 판단 · 트리 구조만 바꿔 다시 싸워, "고르기 · 쓰기 문제"와 "성능 부족"을 가른다.
   1) 잡기: node tools/battle-repro.js cap --out states.json --cls monk --pk careful,expert --from 3 --seeds "7000+17*i,i<40" --squad mirages
      dgqa 판을 그대로 돌리다가 그 무리(run.cur.squad)와의 전투가 시작되는 순간 게임의 전투 저장과 같은 꼴(판 + 전투)로 떠 둔다
   2) 다시 싸우기: node tools/battle-repro.js play --in states.json --var base,eq,intent --reps 3 [--out res.json]
      변형: base 그대로 · eq 대응 스킬을 열고 장착(VAR_EQ: 갈래 → [스킬, 강화...]) · intent eq + 대응 스킬을 의도적으로 쓰는 판단
      DGDIR로 다른 게임 사본(트리 구조 시험판)을 줄 수 있다. 상태는 순수 데이터라 사본 엔진에서도 되살린다
   판단: 성향(신중 · 숙련)은 잡을 때의 것. 전투 난수는 상태 · 반복마다 고정(reps번). 소모품은 쓰지 않는다(모든 변형이 같게) */
process.env.DGDIR = process.env.DGDIR || '.';
const fs = require('fs');
{ const a = process.argv.slice(2), i = a.indexOf('--from'); if (i >= 0 && +a[i + 1] > 1) process.env.DG_FROM = a[i + 1]; } // dgqa가 불러올 때 읽으므로 먼저
const D = require('./dgqa.js'), G0 = D.G0, Q = require('./qa.js'), MM = require('./measure-meta.js');
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const G = G0.__G; const clone = o => JSON.parse(JSON.stringify(o));
const leadBr = run => { const A = G0.atBuild(run.build), c = {}; for (const id of run.atree.own) { const br = (A.nodes[id] || {}).br; if (br) c[br] = (c[br] || 0) + 1; } return (Object.entries(c).sort((a, b) => b[1] - a[1])[0] || [null])[0]; };

if (argv[0] === 'cap') {
  const out = [], squad = arg('--squad', 'mirages'); D.OPT.chapters = 1; D.OPT.detail = false;
  let cur = null;
  D.OPT.policy = { battleStart(b, run) { if (!run.cur || run.cur.squad !== squad) return; const bb = Object.assign({}, b, { rngF: undefined, p: undefined }); out.push({ seed: cur.seed, pk: cur.pk, build: run.build, br: leadBr(run), room: run.room, ch: run.ch, hp: Math.round(100 * run.p.hp / run.p.hpMax), run: clone(run), b: clone(bb) }); } };
  for (const build of arg('--cls', 'monk').split(',')) for (const pk of arg('--pk', 'careful').split(',')) for (const seed of MM.seedList(arg('--seeds', '7000+17*i,i<40'))) { cur = { seed, pk }; try { D.playChar(pk, build, seed); } catch (e) { } }
  fs.writeFileSync(arg('--out', 'states.json'), JSON.stringify(out)); console.log('잡은 상태 ' + out.length + '개 (' + squad + ')'); return;
}

/* ---- 다시 싸우기 ---- */
const VAR_EQ = { 부동: ['m_shove', 'mu_rebound'], 철권: ['m_wave', 'mu_shock'], 혈도: ['m_finger', 'm_flick'] }; // 기존 대응 스킬(전열 광역 · 후열 손)
if (process.env.VAR_EQ) Object.assign(VAR_EQ, JSON.parse(process.env.VAR_EQ)); // 시험판 구조(예: {"철권":["m_wave","m_shock"]})
function restore(st) {
  G.data = G.data || G0.blankData(); const run = clone(st.run); G.run = run; const b = clone(st.b); b.p = run.p; b.stepMode = false; G.b = b; G.sheet = null; G.scr = 'run';
  G0.treeSync(run); return { run, b };
}
/* 대응 스킬을 열고 장착: 없는 노드는 연다(포인트 밖. 결과에 몇 개를 더 열었는지 적는다). 장착 4칸에 없으면 한 칸(대응 스킬이 아닌 가장 뒤 칸)을 바꾼다 */
function equipResp(run, br) {
  const want = VAR_EQ[br] || []; const A = G0.atBuild(run.build); let added = 0;
  for (const id of want) if (A.nodes[id] && !run.atree.own.includes(id)) { run.atree.own.push(id); added++; }
  for (const id of want) if (A.nodes[id] && A.nodes[id].kind === 'skill' && !run.skills.includes(id)) { if (run.skills.length < G0.EQUIP_SLOTS2) run.skills.push(id); else { const i = run.skills.map((x, k) => [x, k]).reverse().find(([x]) => !want.includes(x))[1]; run.skills[i] = id; } }
  G0.atSync(run); return added;
}
/* 의도적으로 쓰기: 후열 술사(신기루)가 살아 있으면 닿는 스킬로 그를, 전열이 둘 이상이면 전열 광역을 먼저. 나머지는 테스터 판단 */
function intentPol(b) {
  const L = G0.actionList(b).filter(a => a.ok && a.v2 && !a.self); const al = G0.alive(b).filter(e => e.role !== 'root');
  const mir = al.find(e => e.role === 'mirage'); const front = al.filter(e => e.row === 'front');
  if (mir) { const rs = L.filter(a => !a.aoe && G0.canTarget(b, mir, a)).sort((x, y) => (y.yc || 0) - (x.yc || 0))[0]; if (rs) return [rs.id, mir.id]; }
  if (front.length >= 2) { const ao = L.filter(a => a.s && a.s.tgt === 'front').sort((x, y) => (y.yc || 0) - (x.yc || 0))[0]; if (ao) return [ao.id, null]; }
  return null;
}
/* 신기루 규칙만(술사가 살아 있을 때만 intentPol, 그 밖에는 테스터 그대로) */
const hazePol = b => G0.alive(b).some(e => e.role === 'mirage') ? intentPol(b) : null;
function fight(b, pk, pol, seed) {
  const P = Q.PERSONAS[pk], r = D.rng(seed), mem = {}; b.rngF = D.rng(seed * 7919 + 17); let n = 0, used = {};
  const hp0 = b.p.hp / b.p.hpMax;
  while (!b.over && n++ < 300) {
    let x = pol ? pol(b) : null; if (!x) x = P.look ? Q.lookahead(b, P, r) : Q.heuristic(b, P, r, mem);
    let [a, t] = x; if (a === 'flee') { const L = G0.actionList(b).filter(y => y.ok && !y.pull && y.id !== 'flee'); a = L[0].id; t = null; }
    used[a] = (used[a] || 0) + 1; try { G0.playerAct(b, a, t); } catch (e) { b.over = 'lose'; used.__err = String(e.message).slice(0, 80); }
  }
  return { res: b.over || 'cap', rounds: b.round || 0, loss: Math.round(100 * (hp0 - Math.max(0, b.p.hp) / b.p.hpMax)), used };
}
const states = JSON.parse(fs.readFileSync(arg('--in', 'states.json'), 'utf8')); const vars = arg('--var', 'base,eq,intent').split(','); const reps = +arg('--reps', 3);
const rows = [];
for (const [si, st] of states.entries()) for (const v of vars) for (let k = 0; k < reps; k++) {
  const { run, b } = restore(st); const added = v === 'base' || v === 'haze' ? 0 : equipResp(run, st.br); // haze: 장착은 그대로, 판단만
  const f = fight(b, st.pk, v === 'intent' ? intentPol : v === 'haze' ? hazePol : null, 1000 + si * 31 + k);
  rows.push(Object.assign({ si, seed: st.seed, pk: st.pk, br: st.br, v, k, added, eq: run.skills.slice() }, f));
}
if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(rows));
const g = {}; for (const x of rows) { const key = x.pk + '/' + x.br + '/' + x.v; const s = g[key] = g[key] || { n: 0, w: 0, r: 0, l: 0, add: 0 }; s.n++; if (x.res === 'win') s.w++; s.r += x.rounds; s.l += x.loss; s.add += x.added; }
console.log('| 성향/갈래/변형 | 전투 | 이김 | 라운드 | 생명력 손실 %p | 더 연 노드(평균) |\n| --- | --- | --- | --- | --- | --- |');
for (const k of Object.keys(g).sort()) { const s = g[k]; console.log(`| ${k} | ${s.n} | ${s.w}/${s.n}(${Math.round(100 * s.w / s.n)}%) | ${(s.r / s.n).toFixed(1)} | ${(s.l / s.n).toFixed(0)} | ${(s.add / s.n).toFixed(1)} |`); }
