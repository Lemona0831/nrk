'use strict';
/* 측정 프로토콜 (M3, 10월 19일): 비율은 Wilson 95% 구간과 함께, A/B는 같은 시드끼리 짝지어 본다.
   node tools/measure-stats.js <결과.jsonl>             성향 · 지표마다 비율과 Wilson 95%
   node tools/measure-stats.js <B.jsonl> --ab <A.jsonl>   같은 (성향 · 직업 · 시드) 짝으로 A → B 변화
   판정(게임 기준 4절 4): 변화는 성향 둘 이상에서 같은 방향으로 유의할 때만 게임 원인으로 본다.
   성향 하나의 유의 = 짝 지은 판에서 결과가 갈린 판(한쪽만 넘김)의 부호 검정 양쪽 p < 0.05 */
const fs = require('fs');
const load = f => { const t = fs.readFileSync(f, 'utf8').trim(); return t.startsWith('[') ? JSON.parse(t) : t.split('\n').filter(Boolean).map(l => JSON.parse(l)); };
function wilson(k, n, z = 1.96) { if (!n) return [NaN, NaN]; const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; }
const bossWin = (r, ch) => (r.chs || []).some(c => c.ch === ch) || (r.fights || []).some(f => (f.ch || 1) === ch && f.t === 'boss' && f.res === 'win') || (r.res === 'clear' && (r.ch || 1) === ch);
const METRICS = { '1챕터 넘김': r => bossWin(r, (r.meta && r.meta.from) || 1), '완주': r => r.res === 'clear' };
// 양쪽 부호 검정(이항 p=0.5): 갈린 판 n 가운데 한쪽 k
function signP(k, n) { if (!n) return 1; const lg = x => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; }; const pr = i => Math.exp(lg(n) - lg(i) - lg(n - i) - n * Math.log(2)); const m = Math.min(k, n - k); let t = 0; for (let i = 0; i <= m; i++) t += pr(i); return Math.min(1, 2 * t); }
const pc = x => isNaN(x) ? '-' : Math.round(x * 100);
function table(rows) {
  const out = []; const pks = [...new Set(rows.map(r => r.pk))];
  for (const [mn, f] of Object.entries(METRICS)) for (const pk of pks) { const X = rows.filter(r => r.pk === pk); const k = X.filter(f).length; const [lo, hi] = wilson(k, X.length); out.push(`${mn} · ${pk}: ${pc(k / X.length)}% (${k}/${X.length}, 95% ${pc(lo)}–${pc(hi)})`); }
  return out.join('\n');
}
function ab(A, B) {
  const key = r => r.pk + '|' + r.build + '|' + r.seed; const mA = new Map(A.map(r => [key(r), r])); const lines = []; const verdict = {};
  const pks = [...new Set(B.map(r => r.pk))];
  for (const [mn, f] of Object.entries(METRICS)) {
    const moved = [];
    for (const pk of pks) {
      const pairs = B.filter(r => r.pk === pk && mA.has(key(r))).map(r => [f(mA.get(key(r))) ? 1 : 0, f(r) ? 1 : 0]); const n = pairs.length; if (!n) continue;
      const a = pairs.reduce((s, x) => s + x[0], 0), b = pairs.reduce((s, x) => s + x[1], 0), up = pairs.filter(x => !x[0] && x[1]).length, dn = pairs.filter(x => x[0] && !x[1]).length; const p = signP(up, up + dn);
      const [al, ah] = wilson(a, n), [bl, bh] = wilson(b, n); const dir = p < 0.05 ? (up > dn ? '+' : '−') : '0'; if (dir !== '0') moved.push(dir);
      lines.push(`${mn} · ${pk}: A ${pc(a / n)}% (${pc(al)}–${pc(ah)}) → B ${pc(b / n)}% (${pc(bl)}–${pc(bh)}) · 짝 ${n} · 갈린 판 +${up} / −${dn} · p ${p.toFixed(3)} · ${dir === '0' ? '유의하지 않음' : dir === '+' ? '오름' : '내림'}`);
    }
    const up2 = moved.filter(x => x === '+').length, dn2 = moved.filter(x => x === '−').length;
    verdict[mn] = up2 >= 2 && !dn2 ? '게임 원인: 오름(성향 ' + up2 + ')' : dn2 >= 2 && !up2 ? '게임 원인: 내림(성향 ' + dn2 + ')' : '판정 보류(같은 방향으로 유의한 성향 둘 미만)';
  }
  return lines.join('\n') + '\n' + Object.entries(verdict).map(([k, v]) => `판정 ${k}: ${v}`).join('\n');
}
module.exports = { wilson, signP, table, ab, METRICS, load };
if (require.main === module) {
  const argv = process.argv.slice(2); const i = argv.indexOf('--ab');
  if (!argv[0]) { console.error('사용: node tools/measure-stats.js <결과> [--ab <기준>]'); process.exit(2); }
  const B = load(argv[0]); console.log(i >= 0 ? ab(load(argv[i + 1]), B) : table(B));
}
