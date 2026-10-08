/* 스킬 수치 맞춤 (0.6a.2, 10월 3일): 직업 하나의 스킬 수치를 줄 예산(skillkit.js의 skScore)에 맞춘다.
   칸마다 수치를 따로 고른다(후보 = 원래 × 0.5~4, 반올림, 상한). 쿨타임은 그대로 두고, --cdfree면 −3~+2(줄이면 벌점이 더 크다, 3~10턴 안).
   06a2/data/skills.js의 그 직업 줄만 바꾼다(줄 모양은 그대로). 맞춘 뒤에는 node tools/skillscore.js <직업>으로 확인하고 50상황으로 잰다.
   사용: node tools/skillfit.js <직업> [--dry] [--cdfree] [--only=id,id] */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..', process.env.SKDIR || '06a2', 'data') + '/';
const args = process.argv.slice(2); const CLS = args[0]; const DRY = args.includes('--dry'); const CDFREE = args.includes('--cdfree');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const skText = fs.readFileSync(ROOT + 'skills.js', 'utf8'); const kitText = fs.readFileSync(ROOT + 'skillkit.js', 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(skText + '\n' + kitText + '\n;this.SKILLS2 = SKILLS2; this.skScore = skScore;', ctx);
const SK = ctx.SKILLS2[CLS]; if (!SK) throw new Error('직업 없음 ' + CLS);
const STCAP = { weak: 3, vuln: 3, protect: 4, empower: 3, chill: 2, haste: 2 }; // 상태는 한 번에 너무 많이 걸지 않게
/* 고정할 수치: 붕괴 · 상태가 중심인 칸은 피해를 작게 두고 쿨타임으로 맞춘다 */
const LOCK = {}; // 스킬 데이터의 keep: [효과]도 맞춤에서 바꾸지 않는다 (예: 철옹성의 상한까지 채우기) // 10월 3일: 붕괴 · 상태만으로는 줄 예산에 닿지 않아(붕괴 1 = 피해 0.15) 고정을 풀었다
const PER_STEPS = [0.25, 0.5]; // 보호막 비례: 상한까지 쌓으면 한 방이 너무 커져 2마다 +1까지
const FIELDS = { dmg: ['n'], brk: ['n'], poison: ['n'], st: ['n'], stam: ['n'], ward: ['n'], wardFill: ['to'], thorn: ['dmg', 'times'], vulnPer: ['per'], wardDmg: ['per'], wardBurn: ['mul', 'max'], cutx: ['brk'], kiBurst: ['per'], kiPer: ['per'], ctrPer: ['per'], stance: ['dmg'], sealx: ['brk'], cleanse: ['heal', 'stam'], onParry: ['dmg', 'brk', 'poison'], parryBuff: ['dmg', 'poison'], drain: ['per'] }; // drain: 먹기 1마다 회복 (숨겨진 직업 3 · 1)
const FILL_STEPS = [0.25, 0.33, 0.5, 0.6, 0.75, 1]; // 보호막 채우기: 상한의 몇 %까지
/* 수치 상한 (10월 3일): 붕괴는 일반 적 50 · 정예 100 · 보스 150이라, 한 방이 너무 커지지 않게 줄 깊이로 묶는다 */
function capOf(s, e, k) {
  const multi = s.tgt === 'front' || s.tgt === 'all'; const row = s.row || 0;
  if (e.k === 'brk') return multi ? (row >= 10 ? 35 : 25) : row >= 10 ? 70 : row >= 7 ? 50 : 40;
  if (e.k === 'dmg') return multi ? (row >= 10 ? 22 : row >= 7 ? 18 : 16) : 32;
  if (e.k === 'ward') return row >= 10 ? 32 : 28;
  if (e.k === 'cutx') return 70;
  if (e.k === 'cleanse') return k === 'heal' ? 10 : 12; // 숨겨진 직업 2: 지운 1마다 회복 · 스태미나
  if (e.k === 'thorn') return k === 'dmg' ? 10 : 6;
  if (e.k === 'vulnPer') return 5;
  if (e.k === 'wardBurn' && k === 'max') return 24;
  return Infinity;
}
let CUR = null; let TGT = 0; const FIT_T = {}; (process.env.FIT_T || '').split(',').filter(Boolean).forEach(x => { const [i, v] = x.split(':'); FIT_T[i] = +v; }); /* FIT_T=id:0.07,id:-0.07 : 칸마다 줄 예산에서 비껴 맞출 목표(기둥 균형, 10월 8일 숨겨진 직업 1 상급) */
function cands(e, k) {
  const v0 = e[k] != null ? e[k] : (e.k === 'wardFill' && k === 'to' ? 1 : null); if (v0 == null) return null; const out = new Set([Math.min(v0, capOf(CUR, e, k))]);
  if (e.k === 'wardDmg') return PER_STEPS;
  if (e.k === 'wardFill') return FILL_STEPS;
  for (let f = 0.5; f <= 4.0001; f += 0.02) {
    let v = v0 * f;
    if (e.k === 'wardBurn' && k === 'mul') v = Math.max(1, Math.min(4, Math.round(v * 2) / 2));
    else if (e.k === 'st') v = Math.max(1, Math.min(STCAP[e.s] || 5, Math.round(v)));
    else if (e.k === 'thorn' && k === 'times') v = Math.max(2, Math.min(8, Math.round(v)));
    else if (e.k === 'stam') v = Math.max(5, Math.min(60, Math.round(v)));
    else v = Math.max(1, Math.round(v));
    out.add(Math.min(v, capOf(CUR, e, k)));
  }
  return [...out];
}
const lines = skText.split('\n'); const fmt = v => Array.isArray(v) ? '[' + v.map(fmt).join(', ') + ']' : typeof v === 'object' ? '{ ' + Object.keys(v).map(k => k + ': ' + fmt(v[k])).join(', ') + ' }' : typeof v === 'string' ? "'" + v + "'" : String(v);
const log = [];
for (const s of SK) {
  if (ONLY.length && !ONLY.includes(s.id)) continue;
  if (s.exc) { log.push(`예외 ${s.n}: ${s.exc} (맞추지 않는다)`); continue; } // 줄 예산의 예외로 표시한 칸
  const score = () => { const r = ctx.skScore(s); return r.V / r.B - 1; };
  CUR = s; TGT = FIT_T[s.id] || 0; const d0 = score(); const orig = JSON.parse(JSON.stringify(s.fx)); const cd0 = s.cd;
  const slots = []; orig.forEach((e, i) => { for (const k of (FIELDS[e.k] || [])) { if ((LOCK[s.id] || []).includes(e.k) || (s.keep || []).includes(e.k)) continue; const c = cands(e, k); if (c) slots.push({ i, k, o: e[k] != null ? e[k] : 1, vals: c }); } });
  if (!slots.length) { log.push(`못 맞춤 ${s.n}: 고칠 수치가 없다 (${(d0 * 100).toFixed(1)}%)`); continue; }
  let best = null; const cur = slots.map(() => 0);
  const rec = j => {
    if (j === slots.length) {
      s.fx = orig.map(e => Object.assign({}, e)); slots.forEach((sl, q) => { s.fx[sl.i][sl.k] = sl.vals[cur[q]]; });
      const d = score(); const fs2 = slots.map((sl, q) => sl.vals[cur[q]] / sl.o); const spread = Math.max(...fs2) - Math.min(...fs2);
      const key = Math.abs(d - TGT) + spread * 0.04 + (s.cd < cd0 ? 0.05 * (cd0 - s.cd) : 0.025 * (s.cd - cd0));
      if (!best || key < best.key) best = { key, d, cd: s.cd, fx: JSON.parse(JSON.stringify(s.fx)) }; return;
    }
    for (let v = 0; v < slots[j].vals.length; v++) { cur[j] = v; rec(j + 1); }
  };
  for (const cd of (CDFREE ? [cd0, cd0 + 1, cd0 - 1, cd0 + 2, cd0 - 2, cd0 - 3].filter(x => x >= 3 && x <= 10) : [cd0])) { s.cd = cd; rec(0); } // 쿨타임 1.5배 틀: 3~10턴
  s.cd = best.cd; s.fx = best.fx;
  log.push(`${s.n.padEnd(9)} ${(d0 * 100).toFixed(0).padStart(4)}% → ${(best.d * 100).toFixed(1).padStart(5)}%  쿨${cd0}${best.cd !== cd0 ? '→' + best.cd : ''}  ${fmt(s.fx).replace(/k: /g, '')}`);
  const li = lines.findIndex(l => l.includes("id: '" + s.id + "'")); if (li < 0) throw new Error('줄 없음 ' + s.id);
  let l = lines[li]; l = l.replace(/cd: \d+/, 'cd: ' + s.cd); const fi = l.indexOf('fx: ['); const end = l.lastIndexOf('] }'); l = l.slice(0, fi) + 'fx: ' + fmt(s.fx) + l.slice(end + 1); lines[li] = l;
}
if (!DRY) fs.writeFileSync(ROOT + 'skills.js', lines.join('\n'));
console.log(log.join('\n'));
