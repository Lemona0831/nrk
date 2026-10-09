// 사이트 폴더의 index.html에서 게임 스크립트와 CSS를 꺼내는 도우미. 한 파일(예전)과 나눈 파일(js/ · css/) 두 배치를 같은 결과로 돌려준다.
//   pageScript(dir)  게임 스크립트 전체 글자. 한 파일이면 <script> 안쪽 그대로, 나눴으면 js/NN-이름.js를 <script src> 순서대로 붙인 것.
//                    두 배치에서 글자가 같다. 그래서 extract-engine · 테스터의 결과가 배치와 상관없이 같다.
//   pageData(dir)    <script src="data/..."> 값 파일들을 순서대로 '\n'으로 이은 글자.
//   pageCss(dir)     CSS 전체 글자. <style> 안쪽 그대로, 나눴으면 css/*.css를 <link> 순서대로 붙인 것.
//   pageLayout(dir)  { html, scripts: [{ kind: 'data'|'js'|'inline'|'other', src, text }], styles: [...] }
// 나눈 파일 규칙: 둘째 js 파일부터 맨 앞 줄이 정확히 `'use strict';`이다(스크립트마다 엄격 모드가 따로라서). 붙일 때 그 한 줄만 뺀다.
// 사용: const P = require('./pagesrc.js'); P.pageScript('06a2')  (폴더 이름은 저장소 루트 기준이거나 절대 경로)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const STRICT = "'use strict';\n";

function siteDir(dir) { return path.isAbsolute(dir) ? dir : path.join(ROOT, dir); }

// html 안의 <script ...>...</script> 와 <style>...</style> · <link rel=stylesheet>를 문서 순서대로 훑는다.
function scan(html) {
  const out = []; const re = /<script\b([^>]*)>([\s\S]*?)<\/script>|<style\b[^>]*>([\s\S]*?)<\/style>|<link\b([^>]*)>/g; let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<script')) {
      const src = (/\bsrc="([^"]+)"/.exec(m[1]) || [])[1];
      out.push({ tag: 'script', src, start: m.index, end: m.index + m[0].length, bodyStart: m.index + m[0].indexOf('>') + 1, text: m[2] });
    } else if (m[0].startsWith('<style')) {
      out.push({ tag: 'style', start: m.index, end: m.index + m[0].length, bodyStart: m.index + m[0].indexOf('>') + 1, text: m[3] });
    } else if (/rel="stylesheet"/.test(m[4])) {
      const href = (/\bhref="([^"]+)"/.exec(m[4]) || [])[1];
      out.push({ tag: 'link', href, start: m.index, end: m.index + m[0].length });
    }
  }
  return out;
}

function readText(dir, rel) { return fs.readFileSync(path.join(siteDir(dir), rel), 'utf8'); }

function pageLayout(dir, htmlText) {
  const html = htmlText != null ? htmlText : readText(dir, 'index.html');
  const scripts = [], styles = [];
  for (const t of scan(html)) {
    if (t.tag === 'script') {
      if (t.src == null) scripts.push({ kind: 'inline', text: t.text, start: t.start, end: t.end });
      else if (/^data\//.test(t.src)) scripts.push({ kind: 'data', src: t.src, text: htmlText != null ? null : readText(dir, t.src), start: t.start, end: t.end });
      else if (/^js\//.test(t.src)) scripts.push({ kind: 'js', src: t.src, text: htmlText != null ? null : readText(dir, t.src), start: t.start, end: t.end });
      else scripts.push({ kind: 'other', src: t.src, start: t.start, end: t.end });
    } else if (t.tag === 'style') styles.push({ kind: 'inline', text: t.text, start: t.start, end: t.end });
    else if (/^css\//.test(t.href || '')) styles.push({ kind: 'css', src: t.href, text: htmlText != null ? null : readText(dir, t.href), start: t.start, end: t.end });
  }
  return { html, scripts, styles };
}

// 게임 스크립트 본문. 한 파일: <script> 안쪽 그대로. 나눔: 파일들을 이은 것(둘째 파일부터 'use strict' 한 줄을 뺀다). 두 배치의 글자가 같다.
function pageScript(dir) {
  const L = pageLayout(dir); const main = L.scripts.filter(s => s.kind === 'inline' || s.kind === 'js');
  if (!main.length) throw new Error('index.html에서 게임 스크립트를 찾지 못했습니다: ' + dir);
  if (main.length === 1 && main[0].kind === 'inline') return main[0].text;
  return main.map((s, i) => (s.kind === 'js' && i > 0 && s.text.startsWith(STRICT)) ? s.text.slice(STRICT.length) : s.text).join('');
}
function pageData(dir) { return pageLayout(dir).scripts.filter(s => s.kind === 'data').map(s => s.text).join('\n'); }
function pageCss(dir) {
  const L = pageLayout(dir);
  if (L.styles.length === 1 && L.styles[0].kind === 'inline') return L.styles[0].text;
  return L.styles.map(s => s.text).join('');
}

module.exports = { pageScript, pageData, pageCss, pageLayout, scan, siteDir, STRICT, ROOT };
