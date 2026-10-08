/* 상급 줄(11~13줄) 한 칸씩 빼 보기 (10월 8일, 암살자 시범에서 만든 도구. 다른 직업의 상급 줄 작업이 같은 방법으로 잰다)
   sitqa.js의 기둥 빌드(한 기둥을 포인트가 허락하는 가장 깊은 줄까지)를 50상황(SIT_CH=3)으로 재고, 상급 칸마다
   "그 칸을 뺀 장착"과 "넣은 장착"의 점수 차(delta)와 쓰인 상황 수를 낸다. sitqa의 장착(equipFor)은 깊은 줄을 먼저 끼우므로,
   상급 칸이 옛 칸보다 실전에서 약하면 delta가 음수가 되고 그 기둥은 상급을 열수록 약해진다(암살자에서 실제로 일어났다).
   실행: DGDIR=06a2 node tools/sitloo.js <직업> [Lv=15] [판=6] [--cap=10]
     --cap=10 : 상급 줄을 뺀(10줄까지) 기둥 점수만 낸다(상급 줄의 기준선)
   여섯 기둥(갈래 3 × 기둥 2)을 따로 복사한 폴더에서 동시에 돈다(eng.gen.js가 겹쳐 쓰이지 않게). 판 6이면 기둥마다 몇 분 걸린다.
   점수 = 이기면 40 + 남은 생명력 40 + 빠르기 20 (sitqa와 같은 자). 판 6의 오차는 ±2쯤이라 delta ±2 안은 잡음으로 본다 */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
if (process.argv[2] === '--job') {
  process.env.DGDIR = process.env.DGDIR || '06a2'; process.env.SIT_CH = '3';
  const [, , , cls, br, colS, lvS, NS, cap] = process.argv; process.env.SIT_CLS = cls;
  const S = require(path.join(process.cwd(), 'tools', 'sitqa.js')); const SITS = require(path.join(process.cwd(), 'tools', 'situations.js')); const G0 = S.G0; const SIT = SITS.SIT3;
  const N = +NS; const bd = S.buildOf(br, +colS, +lvS); if (cap) bd.open = bd.open.filter(id => G0.SK2[id].row <= +cap);
  const score = b => { let sc = 0, n = 0; for (const sit of SIT) { const eq = S.equipFor(b, sit); for (let i = 0; i < N; i++) { const o = S.fight(b, sit, 1000 + sit.id * 97 + i * 13, eq); sc += o.win ? 0.4 + 0.4 * o.hp + 0.2 * Math.max(0, Math.min(1, 1 - ((o.rounds || 0) - 3) / 20)) : 0; n++; } } return sc / n * 100; };
  const base = score(bd); const out = { br, col: +colS, lv: +lvS, base: +base.toFixed(1), cells: [] };
  if (!cap) for (const id of bd.open.filter(id => G0.SK2[id].tier === '상급')) {
    const used = SIT.filter(sit => S.equipFor(bd, sit).includes(id)).length; const w = score(Object.assign({}, bd, { open: bd.open.filter(x => x !== id) }));
    out.cells.push({ id, n: G0.SK2[id].n, used, delta: +(base - w).toFixed(1) });
  }
  console.log(JSON.stringify(out)); process.exit(0);
}
const cls = process.argv[2]; if (!cls) { console.error('사용: node tools/sitloo.js <직업> [Lv=15] [판=6] [--cap=10]'); process.exit(1); }
const lv = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '15'; const N = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : '6';
const cap = (process.argv.find(a => a.startsWith('--cap=')) || '').slice(6);
const ROOT = path.join(__dirname, '..'); const TREE = JSON.parse(cp.execFileSync('node', ['-e', `const vm=require('vm'),fs=require('fs');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(${JSON.stringify(path.join(ROOT, '06a2/data/skills.js'))},'utf8')+';this.T=TREE2',c);console.log(JSON.stringify(c.T[${JSON.stringify(cls)}].branches))`], { encoding: 'utf8' }));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sitloo-')); const jobs = []; let k = 0;
for (const br of TREE) for (const col of [0, 1]) {
  const D = path.join(tmp, String(k++)); fs.mkdirSync(D); fs.cpSync(path.join(ROOT, 'tools'), path.join(D, 'tools'), { recursive: true }); fs.cpSync(path.join(ROOT, '06a2'), path.join(D, '06a2'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(D, 'package.json'));
  jobs.push(new Promise(res => { const c = cp.spawn('node', [path.join(D, 'tools', 'sitloo.js'), '--job', cls, br, String(col), lv, N].concat(cap ? [cap] : []), { cwd: D, env: Object.assign({}, process.env, { DGDIR: '06a2' }) }); let out = ''; c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d); c.on('close', () => res(out.trim().split('\n').pop())); }));
}
Promise.all(jobs).then(rs => {
  for (const r of rs) { let o; try { o = JSON.parse(r); } catch (e) { console.log('오류', r.slice(0, 200)); continue; } console.log(`${o.br} ${o.col ? '오' : '왼'} Lv${o.lv} ${cap ? '(' + cap + '줄까지) ' : ''}점수 ${o.base}`); for (const c of o.cells) console.log(`   ${c.id.padEnd(16)} ${c.n.padEnd(9)} 쓰인 상황 ${String(c.used).padStart(2)}/50  delta ${c.delta}`); }
  const by = {}; for (const r of rs) { try { const o = JSON.parse(r); (by[o.br] = by[o.br] || []).push(o.base); } catch (e) { } }
  console.log('갈래 평균 ' + Object.entries(by).map(([b, v]) => b + ' ' + (v.reduce((a, c) => a + c, 0) / v.length).toFixed(1)).join(' · ') + ' (기둥 둘 평균)');
  fs.rmSync(tmp, { recursive: true, force: true });
});
