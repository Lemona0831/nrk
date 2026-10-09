// 나눈 사이트가 원본과 글자까지 같은지 증명한다. 나누기 전 index.html(git 리비전 또는 파일)과 나눈 폴더를 견준다.
//   node tools/splitcheck.js --orig=<리비전>:<경로>/index.html --site=<나눈 폴더>      (예: --orig=HEAD~1:06a2/index.html --site=06a2)
//   node tools/splitcheck.js --orig-file=<원본 index.html 경로> --site=<나눈 폴더>
// 점검 (하나라도 어긋나면 종료 코드 1, 처음 다른 곳과 그 파일 · 줄을 보여준다)
//   1. 스크립트: js/ 파일들을 <script src> 순서대로 이은 글자(둘째 파일부터 맨 앞 `'use strict';` 줄만 뺌) = 원본 <script> 안쪽 글자.
//   2. CSS: css/ 파일들을 <link> 순서대로 이은 글자 = 원본 <style> 안쪽 글자.
//   3. index.html 나머지: 원본에서 <style> · <script> 덩어리를 자리표시로 바꾼 글 = 새 index.html에서 css 링크 줄들 · js 태그 줄들을 자리표시로 바꾼 글.
//   4. 둘째 js 파일부터 `'use strict';`로 시작하는가, 새 index.html에 인라인 <script> · <style>이 남지 않았는가.
//   5. js 파일 하나하나가 혼자서도 문법에 맞는가(문장 한가운데를 자르지 않았는가), css 파일 하나하나의 중괄호가 맞는가.
//   6. 태그에 없는 js/ · css/ 파일(고아)이 없는가.
// 이 증명은 "나누는 커밋" 한 번에만 쓴다. 나눈 뒤에는 파일마다 따로 고치므로 원본과 같을 수 없다.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const P = require('./pagesrc.js');

const args = process.argv.slice(2);
const opt = k => { const f = args.find(a => a.startsWith('--' + k + '=')); return f ? f.slice(k.length + 3) : null; };
const origSpec = opt('orig'), origFile = opt('orig-file'), SITE = opt('site');
if ((!origSpec && !origFile) || !SITE) { console.error('사용: node tools/splitcheck.js --orig=<리비전>:<경로>/index.html --site=<나눈 폴더>'); process.exit(2); }

const origHtml = origFile ? fs.readFileSync(path.resolve(origFile), 'utf8') : cp.execFileSync('git', ['show', origSpec], { cwd: P.ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const O = P.pageLayout(SITE, origHtml);
const oi = O.scripts.filter(s => s.kind === 'inline'), os_ = O.styles.filter(s => s.kind === 'inline');
let fails = 0; const fail = m => { fails++; console.log('실패: ' + m); };
if (oi.length !== 1 || os_.length !== 1) { console.log('원본에는 인라인 <script> 하나와 <style> 하나만 있어야 합니다'); process.exit(2); }
const origScript = oi[0].text, origCssText = os_[0].text;

const N = P.pageLayout(SITE);
const jsF = N.scripts.filter(s => s.kind === 'js'), cssF = N.styles.filter(s => s.kind === 'css');
if (N.scripts.some(s => s.kind === 'inline')) fail('새 index.html에 인라인 <script>가 남아 있습니다');
if (N.styles.some(s => s.kind === 'inline')) fail('새 index.html에 인라인 <style>이 남아 있습니다');
if (!jsF.length) fail('js/ 스크립트 태그가 없습니다'); if (!cssF.length) fail('css/ 링크가 없습니다');

function lineCol(text, off) { let line = 1, last = -1; for (let i = 0; i < off && i < text.length; i++) if (text[i] === '\n') { line++; last = i; } return { line, col: off - last }; }
function firstDiff(a, b) { const n = Math.min(a.length, b.length); let i = 0; while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++; return i; }
function show(s, i) { return JSON.stringify(s.slice(Math.max(0, i - 30), i + 50)); }

// 1, 4. 스크립트
let joined = ''; const bounds = [];
jsF.forEach((f, k) => {
  let t = f.text;
  if (k > 0) { if (!t.startsWith(P.STRICT)) fail(f.src + ": 맨 앞 줄이 'use strict'; 가 아닙니다"); else t = t.slice(P.STRICT.length); }
  bounds.push({ src: f.src, start: joined.length, end: joined.length + t.length }); joined += t;
});
if (joined !== origScript) {
  const i = firstDiff(joined, origScript); const b = bounds.find(x => i >= x.start && i < x.end) || bounds[bounds.length - 1];
  const lc = lineCol(origScript, i);
  fail('스크립트가 원본과 다릅니다. 처음 다른 곳: 원본 스크립트 ' + lc.line + '줄 ' + lc.col + '칸 (파일 ' + (b ? b.src : '?') + ')\n  나눈 쪽 ' + show(joined, i) + '\n  원본     ' + show(origScript, i) + '\n  길이 나눈 ' + joined.length + ' / 원본 ' + origScript.length);
}
// 2. CSS
let cj = ''; const cb = [];
cssF.forEach(f => { cb.push({ src: f.src, start: cj.length, end: cj.length + f.text.length }); cj += f.text; });
if (cj !== origCssText) {
  const i = firstDiff(cj, origCssText); const b = cb.find(x => i >= x.start && i < x.end) || cb[cb.length - 1]; const lc = lineCol(origCssText, i);
  fail('CSS가 원본과 다릅니다. 처음 다른 곳: 원본 CSS ' + lc.line + '줄 ' + lc.col + '칸 (파일 ' + (b ? b.src : '?') + ')\n  나눈 쪽 ' + show(cj, i) + '\n  원본     ' + show(origCssText, i));
}
// 3. 나머지 HTML
const SJ = '@@JS@@', SC = '@@CSS@@';
const skel = (html, L, inlineMode) => {
  const blocks = []; for (const s of L.scripts) if (inlineMode ? s.kind === 'inline' : s.kind === 'js') blocks.push({ s: s.start, e: s.end, t: SJ });
  for (const s of L.styles) if (inlineMode ? s.kind === 'inline' : s.kind === 'css') blocks.push({ s: s.start, e: s.end, t: SC });
  blocks.sort((a, b) => b.s - a.s); let h = html; for (const b of blocks) h = h.slice(0, b.s) + b.t + h.slice(b.e); // 뒤에서부터
  return h.replace(new RegExp('(' + SJ + '\\n)+' + SJ, 'g'), SJ).replace(new RegExp('(' + SC + '\\n)+' + SC, 'g'), SC);
};
const sa = skel(origHtml, O, true), sb = skel(N.html, N, false);
if (sa !== sb) { const i = firstDiff(sa, sb); const lc = lineCol(sa, i); fail('index.html 나머지가 원본과 다릅니다. 처음 다른 곳: 원본 ' + lc.line + '줄 ' + lc.col + '칸\n  새    ' + show(sb, i) + '\n  원본  ' + show(sa, i)); }
// 5. 파일마다 문법 · 중괄호
jsF.forEach((f, k) => { try { new vm.Script(f.text, { filename: f.src }); } catch (e) { fail(f.src + ' 혼자 문법 검사 실패: ' + e.message + (k === 0 ? '' : ' (문장 한가운데에서 잘랐을 수 있습니다)')); } });
cssF.forEach(f => { let d = 0, i = 0; const t = f.text; while (i < t.length) { if (t[i] === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? t.length : e + 2; continue; } if (t[i] === '"' || t[i] === "'") { const q = t[i]; i++; while (i < t.length && t[i] !== q) { if (t[i] === '\\') i++; i++; } i++; continue; } if (t[i] === '{') d++; else if (t[i] === '}') { d--; if (d < 0) break; } i++; } if (d !== 0) fail(f.src + ' 중괄호가 맞지 않습니다(깊이 ' + d + ')'); });
// 6. 고아
for (const [sub, list] of [['js', jsF], ['css', cssF]]) {
  const dirp = path.join(P.siteDir(SITE), sub); if (!fs.existsSync(dirp)) continue;
  const used = new Set(list.map(f => f.src)); for (const n of fs.readdirSync(dirp)) if (!used.has(sub + '/' + n)) fail(sub + '/' + n + ' 은(는) index.html에 연결되지 않았습니다(고아)');
}
console.log('스크립트 ' + jsF.length + '개 · ' + joined.length + '자 / 원본 ' + origScript.length + '자, CSS ' + cssF.length + '개 · ' + cj.length + '자 / 원본 ' + origCssText.length + '자');
console.log(fails ? '나눔 점검 실패 ' + fails + '건' : '나눔 점검 통과: 이은 글자가 원본과 한 자도 다르지 않습니다');
process.exit(fails ? 1 : 0);
