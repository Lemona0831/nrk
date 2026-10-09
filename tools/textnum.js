#!/usr/bin/env node
/* 문장을 고쳤을 때 정보가 바뀌지 않았는지 보는 숫자 점검 (docs/문체-기준.md).
   고치기 전(--base, 기본 HEAD)과 지금 파일에서, 한글이 든 따옴표 문자열 속 숫자(소수 · % 포함)를 줄마다 모아 견준다.
   줄 수가 같으면 줄 대 줄로, 다르면 파일 전체의 숫자 묶음으로 견준다(--file이면 항상 전체 묶음).
   쓰는 법: node tools/textnum.js 06a2/data/items_ch2.js [--base 커밋] [--file]
   끝 코드: 다른 곳이 있으면 1 */
const { execSync } = require('child_process');
const fs = require('fs');
const args = process.argv.slice(2);
const bi = args.indexOf('--base'); const base = bi >= 0 ? args[bi + 1] : 'HEAD';
const file = args.find((a, i) => !a.startsWith('--') && !(bi >= 0 && i === bi + 1));
const whole = args.includes('--file');
if (!file) { console.error('사용: node tools/textnum.js <파일> [--base 커밋] [--file]'); process.exit(2); }
let old; try { old = execSync('git show ' + base + ':' + file.replace(/\\/g, '/'), { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { console.error('기준 판을 읽지 못함: ' + base + ':' + file); process.exit(2); }
const now = fs.readFileSync(file, 'utf8');
const STR = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const nums = line => { const out = []; let m; STR.lastIndex = 0; while ((m = STR.exec(line))) { const s = m[1] || m[2] || m[3] || ''; if (!/[가-힣]/.test(s)) continue; (s.match(/\d+(?:\.\d+)?/g) || []).forEach(x => out.push(String(+x))); } return out.sort(); };
const norm = a => a.join(',');
const A = old.split(/\r?\n/), B = now.split(/\r?\n/);
let bad = 0;
if (!whole && A.length === B.length) {
  for (let i = 0; i < A.length; i++) { const x = norm(nums(A[i])), y = norm(nums(B[i])); if (x !== y) { bad++; console.log(`줄 ${i + 1}: 숫자가 다르다\n  전: ${x}\n  후: ${y}\n  ${B[i].trim().slice(0, 110)}`); } }
  console.log(`줄 대 줄 점검: ${A.length}줄, 다른 줄 ${bad}`);
} else {
  const x = norm([].concat(...A.map(nums)).sort()), y = norm([].concat(...B.map(nums)).sort());
  const cnt = s => { const m = {}; s.split(',').filter(Boolean).forEach(t => m[t] = (m[t] || 0) + 1); return m; };
  const cx = cnt(x), cy = cnt(y); const keys = new Set([...Object.keys(cx), ...Object.keys(cy)]);
  const diff = [...keys].filter(k => (cx[k] || 0) !== (cy[k] || 0)).map(k => `${k}: ${cx[k] || 0} → ${cy[k] || 0}`);
  console.log(`파일 전체 점검(줄 수 ${A.length} → ${B.length}): 숫자 개수가 다른 값 ${diff.length}개` + (diff.length ? '\n  ' + diff.join('\n  ') : ''));
  bad = diff.length;
}
process.exit(bad ? 1 : 0);
