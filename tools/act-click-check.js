'use strict';
/* 전투 버튼 누르기 경로 점검 (10월 17일): 줄 가운데에 들어간 주석이 doAct를 주석으로 만들어 전투 버튼이 아무 일도 하지 않았다.
   엔진 점검 · 자동 테스터는 doAct를 직접 불러 이 경로를 지나지 않으므로, 클릭 처리 줄을 글자로 확인한다.
   실행: node tools/act-click-check.js [검사할 파일=js/80-events.js] */
const fs = require('fs'), path = require('path'), assert = require('assert');
const file = process.argv[2] || path.join(__dirname, '..', 'js', '80-events.js');
const src = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const BS = String.fromCharCode(92);
/* 줄에서 주석(//) 앞까지만: 따옴표 안의 // 는 건너뛴다 */
function code(l) {
  let q = null;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === BS) i++; else if (ch === q) q = null; }
    else if (ch === "'" || ch === '"' || ch === '`') q = ch;
    else if (ch === '/' && l[i + 1] === '/') return l.slice(0, i);
  }
  return l;
}
let n = 0;
const act = src.find(l => l.trim().startsWith("case 'act':"));
assert(act, "case 'act': 줄이 없다");
assert(code(act).includes('doAct('), "case 'act': 줄에서 doAct( 가 주석 밖에 있어야 한다: " + act.trim().slice(0, 140)); n++;
/* 다른 case 줄도: 주석 뒤에 break; · doAct( · render( 같은 코드가 이어지면 실수다 */
const bad = src.map((l, i) => [i + 1, l]).filter(([, l]) => /^\s*case '/.test(l) && /\b(break;|doAct\(|render\(\);)/.test(l.slice(code(l).length)));
assert.deepStrictEqual(bad.map(x => x[0]), [], '주석 안에 코드가 들어간 case 줄: ' + bad.map(x => x[0] + ': ' + x[1].trim().slice(0, 80)).join(' | ')); n++;
console.log('act-click-check: ' + n + '개 통과');
