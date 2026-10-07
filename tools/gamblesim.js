/* ===== 도박 · 깨달음 계산 (10월 8일, docs/아이템/도박-깨달음.md) =====
   게임 코드를 vm에서 그대로 읽어 (1) 봉인된 꾸러미의 등급 분포 · 천장 · 전설 상한 (2) 직업마다 칸을 골랐을 때 실제로 나오는 등급 · 직업에 맞는 비율
   (3) 값으로 환산한 기대 값 (4) 되팔기 고리 (5) 운명의 저울 기대 값 (6) 깨달음 제안 분포를 낸다. 네트워크 · 파일 쓰기 없음.
   실행: DGDIR=06a2 node tools/gamblesim.js [꾸러미 수=20000] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.env.DGDIR || '06a2'; const N = +(process.argv[2] || 20000);
const dir = path.join(__dirname, '..', DIR); const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const data = [...html.matchAll(/<script src="(data\/[^"]+\.js)"><\/script>/g)].map(m => fs.readFileSync(path.join(dir, m[1]), 'utf8')).join('\n');
const i = html.indexOf('<script>'), j = html.indexOf('</script>', i);
const ctx = { console, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, module: { exports: {} } };
vm.createContext(ctx); vm.runInContext(data + '\n' + html.slice(i + 8, j) + '\n;this.__G = G;', ctx, { filename: 'index.html' });
const R = c => vm.runInContext(c, ctx);
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
ctx.Math = Object.create(Math); ctx.Math.random = rnd; /* 고정 씨앗 */
const GR = ['n', 'm', 'r', 'h', 'l']; const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '0.0') + '%';
const builds = R('Object.keys(BUILDS).filter(k => !BUILDS[k].tut && !BUILDS[k].soon)');
const ch = 2; const price = R('gamblePrice')(ch); const val = g => g === 'l' ? R('priceOf')('h', ch) * 1.5 : R('priceOf')(g, ch);
const mkRun = b => { const p = R('mkPlayer')(b, {}); return { p, build: b, inv: {}, bag: [], legSeen: [], gambleN: 0, ch, gold: 1e9, shop: { ch, log: [] }, phase: 'shop' }; };

/* (1) 등급 분포 */
{ const run = { gambleN: 0 }; const c = { n: 0, m: 0, r: 0, h: 0, l: 0 }; let forcedN = 0, gaps = [], gap = 0, maxGap = 0;
  for (let k = 0; k < N * 5; k++) { const r = R('gambleRoll')(run); c[r.g]++; if (r.forced) forcedN++; run.gambleN = 'rhl'.includes(r.g) ? 0 : run.gambleN + 1; if ('rhl'.includes(r.g)) { gap = 0; } else { gap++; if (gap > maxGap) maxGap = gap; } }
  const T = N * 5; console.log(`(1) 등급 분포 (${T}번, 천장 포함): ` + GR.map(g => R('GRADE')[g].n + ' ' + pct(c[g], T)).join(' | '));
  console.log(`    표의 확률: ` + GR.map(g => R('GAMBLE').grades[g] + '%').join(' | ') + `. 천장이 올린 횟수 ${forcedN} (${pct(forcedN, T)}), 희귀 이상 없이 이어진 최대 횟수 ${maxGap} (천장이 열 번째를 막는다)`);
}
/* (2)(3) 직업 · 칸마다 */
console.log(`(2) 직업마다 칸을 골라 ${N}번씩 (${ch}챕터 풀, 값 ${price} 골드). 맞음 = 상점의 "직업에 맞음" 표시와 같은 판정`);
const slots = R('GAMBLE.slots'); const tot = { fit: 0, n: 0, ev: 0, worth: 0 };
const noItem = [];
for (const b of builds) {
  const run = mkRun(b); const cnt = { n: 0, m: 0, r: 0, h: 0, l: 0 }; let fit = 0, ev = 0, worth = 0, n = 0, miss = 0;
  for (let k = 0; k < N; k++) {
    const slot = slots[k % slots.length]; const r = R('gambleRoll')(run); const got = R('rollSlotItem')(run, slot, r.g, ch, rnd() < R('GAMBLE.fit'), false);
    if (!got) { miss++; continue; }
    run.gambleN = 'rhl'.includes(got.g) ? 0 : run.gambleN + 1; cnt[got.g]++; n++;
    const f = R('gFit')(run.p, got.k) ? 1 : 0; fit += f; ev += val(got.g); worth += val(got.g) * (f ? 1 : 0.25);
    if (got.g === 'l') run.legSeen = []; /* 한 판의 시험이라 전설 목록을 비운다(런마다 1회 규칙은 따로 점검) */
  }
  tot.fit += fit; tot.n += n; tot.ev += ev; tot.worth += worth; if (miss) noItem.push(b + ' ' + miss);
  console.log(`  ${b.padEnd(13)} ` + GR.map(g => R('GRADE')[g].n + ' ' + pct(cnt[g], n)).join(' ') + ` | 맞음 ${pct(fit, n)} | 값 기대 ${(ev / n).toFixed(0)} 맞음만 ${(worth / n).toFixed(0)}`);
}
const evN = tot.ev / tot.n, evW = tot.worth / tot.n;
console.log(`(3) 기대 값(9직업 평균): 등급 값 합 ${evN.toFixed(1)} 골드 = 꾸러미 값의 ${(evN / price).toFixed(2)}배. 맞지 않는 장비를 팔 값(25%)으로만 치면 ${evW.toFixed(1)} 골드 = ${(evW / price).toFixed(2)}배 (전설은 영웅 값의 1.5배로 침). 칸을 못 찾은 경우: ${noItem.join(', ') || '없음'}`);
console.log(`    진열 장비는 맞는 것을 골라 사므로 같은 값에서 1.0배. 꾸러미는 칸을 고를 수 있고 영웅 · 전설이 나올 수 있다.`);
/* (4) 되팔기 고리 */
{ const run = { gambleN: 0 }; let back = 0; const sell = g => g === 'l' ? R('LEG_SELL') : R('sellOf')({ g, ch }); for (let k = 0; k < N * 5; k++) { const r = R('gambleRoll')(run); run.gambleN = 'rhl'.includes(r.g) ? 0 : run.gambleN + 1; back += sell(r.g); }
  console.log(`(4) 되팔기: 꾸러미 하나가 돌려주는 평균 ${(back / (N * 5)).toFixed(1)} 골드 = 값의 ${(back / (N * 5) / price * 100).toFixed(0)}%. 팔아서 다시 사는 고리는 손해다.`); }
/* (5) 운명의 저울 */
{ const F = R('FATE'); const rows = ['n', 'm', 'r'].map(g => { const p = F.up[g]; const up = val(F.next[g]); const own = val(g); return `${R('GRADE')[g].n}→${R('GRADE')[F.next[g]].n} ${Math.round(p * 100)}%: 기대 ${(p * up).toFixed(0)} 대 지금 ${own.toFixed(0)} (${(p * up / own).toFixed(2)}배)`; });
  console.log('(5) 운명의 저울 (값 기준, 맞는 장비로 오른다고 보면 이득 / 쓸모없는 장비는 잃어도 아깝지 않다): ' + rows.join(' | ')); }
/* (6) 깨달음 제안 */
{ const L = R('AWK_LIST'); const c2 = L.filter(a => a.g === 'c2').length, c3 = L.filter(a => a.g === 'c3').length, cl = L.filter(a => a.g === 'cls').length;
  console.log(`(6) 깨달음 ${L.length}개: 공용 2챕터 ${c2} + 공용 3챕터 ${c3} + 직업 갈래 ${cl}. 직업마다 ${builds.map(b => L.filter(a => a.cls === b).length).join('/')}`);
  const trials = 4000; const cnt = {}; for (const b of builds) { const run = { build: b, ch: 2, awk: [] }; let cls = 0; for (let k = 0; k < trials; k++) { const o = R('awkOfferMake')(run); if (o.length !== 3) throw new Error('제안이 셋이 아님'); if (o.some(id => R('AWK_MAP')[id].g === 'cls')) cls++; for (const id of o) cnt[id] = (cnt[id] || 0) + 1; } console.log(`    ${b.padEnd(13)} 2챕터 제안에 직업 깨달음이 든 비율 ${pct(cls, trials)}`); }
  const missing = L.filter(a => R('IFX_AWK')[a.id] === undefined).map(a => a.id); console.log('    효과가 없는 깨달음:', missing.length ? missing.join(', ') : '없음'); }
