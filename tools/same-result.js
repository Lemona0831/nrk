'use strict';
/* 결과 파일 바이트 동일 점검 (M3, 10월 19일). 도구를 고친 뒤에도 게임 동작이 그대로인지 본다.
   node tools/same-result.js <기준 결과> <새 결과>   (dgqa.js 결과 .json 배열 또는 measure-run .jsonl)
   판정: ① 판마다 meta.game(게임 파일 지문)이 같다 ② meta의 도구 지문(tool) · 판 지문(rev) · git 커밋만 빼고 파일 바이트가 같다.
   도구 지문 · git은 도구를 고치면 바뀌는 것이 정상이라 뺀다. 그 밖의 칸이 하나라도 다르면 첫 차이를 보이고 1로 끝난다 */
const fs = require('fs');
const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error('사용: node tools/same-result.js <기준> <새 결과>'); process.exit(2); }
const load = f => { const t = fs.readFileSync(f, 'utf8').trim(); return t.startsWith('[') ? JSON.parse(t) : t.split('\n').filter(Boolean).map(l => JSON.parse(l)); };
const strip = r => { if (!r || !r.meta) return r; const m = Object.assign({}, r.meta); delete m.tool; delete m.rev; delete m.git; return Object.assign({}, r, { meta: m }); };
const a = load(A), b = load(B); let bad = 0;
if (a.length !== b.length) { console.log(`판 수가 다름: ${a.length} 대 ${b.length}`); process.exit(1); }
const games = new Set(); for (let i = 0; i < a.length; i++) { const ga = a[i].meta && a[i].meta.game, gb = b[i].meta && b[i].meta.game; games.add(ga + ' → ' + gb); if (ga !== gb) bad++; }
const sa = JSON.stringify(a.map(strip)), sb = JSON.stringify(b.map(strip));
const same = sa === sb;
console.log(`판 ${a.length} · 게임 지문 ${bad ? '다름 ' + bad + '판' : '같음'} (${[...games].slice(0, 2).join(', ')}) · 도구 지문 · git을 뺀 바이트 ${same ? '동일' : '다름'} (${sa.length}바이트)`);
if (!same) { for (let i = 0; i < a.length; i++) { const x = JSON.stringify(strip(a[i])), y = JSON.stringify(strip(b[i])); if (x !== y) { const keys = Object.keys(strip(a[i])).filter(k => JSON.stringify(strip(a[i])[k]) !== JSON.stringify(strip(b[i])[k])); console.log(`첫 차이: ${i}번 판(${a[i].pk}/${a[i].build}/${a[i].seed}) 칸 ${keys.join(', ')}`); break; } } }
process.exitCode = bad || !same ? 1 : 0;
