#!/usr/bin/env node
/* 실제 세기 보스 합격 시험 (10월 8일 만든 사람 결정 43 B · 58 A).
   던전 테스터(dgqa) 기록에서 직업 × 챕터 × 갈래의 보스 승률을 세고 합격선으로 판정한다.
   50상황(sitqa)은 "이길 수단이 있는가"만 보는 진단용이고, 출시 합격은 이 도구의 실제 세기 승률로 본다.
   합격선: 보스에 닿은 판 N_MIN(40) 이상에서 승률 WIN_LO(15%)~WIN_HI(35%) 안이고, Wilson 95% 구간 하한이 CI_LO(10%) 이상.
   닿은 판이 40 미만이면 "표본 부족"(합격도 미달도 아님).
   쓰는 법: node tools/bosspass.js --ch=1 a.json b.json --ch=3 c.json [--by=build|branch] [--md]
     --ch=N 뒤에 오는 파일은 그 챕터의 보스 기록으로 센다(앞 챕터를 깬 판 · DG_FROM 배치도 같은 칸으로 센다: 근거는 따로 적을 것).
     기본은 직업 × 챕터이고 --by=branch면 직업 × 갈래 × 챕터(기록의 branch 칸).
   환경: BP_NMIN · BP_LO · BP_HI · BP_CI로 합격선을 바꿀 수 있다(진단용, 합격 판정은 기본값으로 낸다). */
const fs = require('fs');
const N_MIN = +(process.env.BP_NMIN || 40), WIN_LO = +(process.env.BP_LO || 0.15), WIN_HI = +(process.env.BP_HI || 0.35), CI_LO = +(process.env.BP_CI || 0.10);
const args = process.argv.slice(2);
let by = 'build', md = false, ch = 1;
const groups = {}; /* ch -> 기록 배열 */
for (const a of args) {
  if (a.startsWith('--ch=')) ch = +a.slice(5);
  else if (a.startsWith('--by=')) by = a.slice(5);
  else if (a === '--md') md = true;
  else if (a.startsWith('--')) { console.error('모르는 옵션: ' + a); process.exit(2); }
  else {
    let arr; try { arr = JSON.parse(fs.readFileSync(a, 'utf8')); } catch (e) { console.error('읽지 못함: ' + a + ' ' + e.message); process.exit(2); }
    (groups[ch] = groups[ch] || []).push(...arr);
  }
}
if (!Object.keys(groups).length) { console.error('사용: node tools/bosspass.js --ch=1 a.json [--ch=3 b.json] [--by=branch] [--md]'); process.exit(2); }
const NAME = { assassin: '암살자', warden: '파수꾼', hunter: '사냥꾼', butcher: '해금 1', elementalist: '원소술사', spellblade: '마검사', monk: '수도승', confessor: '해금 2', bloodmage: '해금 3' };
const order = Object.keys(NAME);
/* 그 챕터의 보스를 이겼나 · 보스에 닿았나 (realboss.js와 같은 판정) */
const won = (x, c) => (x.chs || []).some(r => r.ch === c) || (x.res === 'clear' && (x.ch || 1) === c);
const reached = (x, c) => won(x, c) || ((x.ch || 1) === c && x.floor >= 24);
const wil = (w, n) => { if (!n) return [0, 1]; const z = 1.96, p = w / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; };
const pc = v => Math.round(v * 100) + '%';
function verdict(w, n) {
  if (n < N_MIN) return '표본 부족';
  const p = w / n, lo = wil(w, n)[0];
  if (p < WIN_LO) return '미달(승률 낮음)';
  if (p > WIN_HI) return '미달(승률 높음)';
  if (lo < CI_LO) return '미달(구간 하한)';
  return '합격';
}
const rows = [];
for (const c of Object.keys(groups).map(Number).sort()) {
  const bucket = {};
  for (const x of groups[c]) {
    if (!reached(x, c) || ((x.ch || 1) !== c && !won(x, c))) continue;
    const k = by === 'branch' ? x.build + '|' + (x.branch || '?') : x.build;
    (bucket[k] = bucket[k] || []).push(x);
  }
  for (const k of Object.keys(bucket).sort((a, b) => order.indexOf(a.split('|')[0]) - order.indexOf(b.split('|')[0]) || a.localeCompare(b))) {
    const L = bucket[k], w = L.filter(x => won(x, c)).length, [lo, hi] = wil(w, L.length);
    const [b, br] = k.split('|');
    rows.push({ ch: c, name: NAME[b] || b, branch: br || '', n: L.length, w, p: w / L.length, lo, hi, v: verdict(w, L.length) });
  }
}
const tally = {};
for (const r of rows) tally[r.v] = (tally[r.v] || 0) + 1;
const head = by === 'branch' ? ['챕터', '직업', '갈래', '닿음', '이김', '승률', '95% 구간', '판정'] : ['챕터', '직업', '닿음', '이김', '승률', '95% 구간', '판정'];
const line = r => (by === 'branch' ? [r.ch, r.name, r.branch] : [r.ch, r.name]).concat([r.n, r.w, pc(r.p), pc(r.lo) + '~' + pc(r.hi), r.v]);
if (md) {
  console.log('| ' + head.join(' | ') + ' |'); console.log('| ' + head.map(() => '---').join(' | ') + ' |');
  for (const r of rows) console.log('| ' + line(r).join(' | ') + ' |');
} else {
  console.log(head.join('\t'));
  for (const r of rows) console.log(line(r).join('\t'));
}
console.log('\n합격선: 닿은 판 ' + N_MIN + ' 이상, 승률 ' + pc(WIN_LO) + '~' + pc(WIN_HI) + ', 구간 하한 ' + pc(CI_LO) + ' 이상. 요약: ' + Object.keys(tally).map(k => k + ' ' + tally[k]).join(' · '));
