// index.html(한 파일)을 tools/splitplan.js대로 js/ · css/ 파일로 자른다. 기계적으로 자르기만 하고 글자는 한 자도 바꾸지 않는다.
//   node tools/splitsite.js [폴더=06a2] [--rev=git리비전] --out=쓸 폴더 [--with-data]
//     --rev    그 리비전의 <폴더>/index.html을 원본으로 읽는다(없으면 작업 폴더의 index.html)
//     --out    결과를 쓸 폴더. 원본 폴더와 같으면 그 자리에서 index.html을 바꾸고 js/ · css/를 만든다(진짜 나누기)
//     --with-data  --out이 다른 폴더일 때 data/도 복사해 그 폴더만으로 사이트가 돌아가게 한다(시험용)
//   만든 뒤 반드시: node tools/splitcheck.js --orig=<리비전>:<폴더>/index.html --site=<쓴 폴더>
// 자르는 규칙
//   - JS: 계획의 from 표식이 있는 줄 맨 앞에서 자른다. 둘째 파일부터 맨 앞에 `'use strict';` 한 줄을 붙인다(스크립트마다 엄격 모드가 따로라서).
//   - CSS: 같은 방식, 붙이는 줄은 없다.
//   - index.html: <style> … </style> 하나를 <link rel="stylesheet" href="css/…"> 줄들로, <script> … </script> 하나를 <script src="js/…"> 줄들로 바꾼다.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const P = require('./pagesrc.js');
const PLAN = require('./splitplan.js');

const args = process.argv.slice(2); const pos = args.filter(a => !a.startsWith('--'));
const opt = k => { const f = args.find(a => a.startsWith('--' + k + '=')); return f ? f.slice(k.length + 3) : null; };
const DIR = pos[0] || '06a2'; const REV = opt('rev'); const OUT = opt('out');
if (!OUT) { console.error('--out=쓸 폴더 가 필요합니다'); process.exit(2); }

const srcDir = P.siteDir(DIR); const outDir = path.isAbsolute(OUT) ? OUT : path.join(P.ROOT, OUT);
const html = REV ? cp.execFileSync('git', ['show', REV + ':' + DIR + '/index.html'], { cwd: P.ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }) : fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const L = P.pageLayout(DIR, html);
const inl = L.scripts.filter(s => s.kind === 'inline'), sty = L.styles.filter(s => s.kind === 'inline');
if (inl.length !== 1 || sty.length !== 1) { console.error('원본에는 인라인 <script> 하나와 <style> 하나만 있어야 합니다(지금 ' + inl.length + ', ' + sty.length + ')'); process.exit(2); }
if (L.scripts.some(s => s.kind === 'js') || L.styles.some(s => s.kind === 'css')) { console.error('이미 나뉜 index.html입니다'); process.exit(2); }

function cut(text, specs) { // 줄 맨 앞 표식으로 자른다. 반환 [{ file, text }]
  const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const lines = text.split('\n'); const offs = [];
  specs.forEach((sp, k) => {
    if (sp.from == null) { if (k !== 0) throw new Error(sp.file + ': from이 null인 것은 첫 파일뿐입니다'); offs.push(0); return; }
    const hits = []; lines.forEach((l, i) => { if (l.startsWith(sp.from)) hits.push(i); });
    if (hits.length !== 1) throw new Error(sp.file + ': 표식 ' + JSON.stringify(sp.from) + ' 이(가) 줄 맨 앞에 ' + hits.length + '곳 있습니다(유일해야 함)');
    offs.push(starts[hits[0]]);
  });
  for (let k = 1; k < offs.length; k++) if (offs[k] <= offs[k - 1]) throw new Error(specs[k].file + ': 자를 곳이 앞 파일보다 앞섭니다');
  return specs.map((sp, k) => ({ file: sp.file, text: text.slice(offs[k], k + 1 < offs.length ? offs[k + 1] : text.length) }));
}

const js = cut(inl[0].text, PLAN.script).map((f, k) => ({ file: f.file, text: (k ? P.STRICT : '') + f.text }));
const css = cut(sty[0].text, PLAN.css);

// 새 index.html: 인라인 두 덩어리를 태그 줄들로 바꾼다 (뒤쪽부터 바꿔 앞쪽 위치가 변하지 않게)
const blocks = [
  { start: inl[0].start, end: inl[0].end, repl: js.map(f => '<script src="' + f.file + '"></script>').join('\n') },
  { start: sty[0].start, end: sty[0].end, repl: css.map(f => '<link rel="stylesheet" href="' + f.file + '">').join('\n') },
].sort((a, b) => b.start - a.start);
let newHtml = html; for (const b of blocks) newHtml = newHtml.slice(0, b.start) + b.repl + newHtml.slice(b.end);

fs.mkdirSync(outDir, { recursive: true });
for (const f of [...js, ...css]) { const p = path.join(outDir, f.file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.text); }
fs.writeFileSync(path.join(outDir, 'index.html'), newHtml);
if (path.resolve(outDir) !== path.resolve(srcDir) && args.includes('--with-data') && fs.existsSync(path.join(srcDir, 'data'))) fs.cpSync(path.join(srcDir, 'data'), path.join(outDir, 'data'), { recursive: true });
console.log('나눔 완료: ' + path.relative(P.ROOT, outDir) + ' (js ' + js.length + '개, css ' + css.length + '개)');
