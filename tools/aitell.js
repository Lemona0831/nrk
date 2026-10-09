#!/usr/bin/env node
/* 화면에 나오는 글의 AI 티(번역투 · 상투 표현)를 세는 점검 (docs/문체-기준.md).
   한글이 든 따옴표 문자열만 본다. 줄마다 걸린 패턴과 파일 합계를 낸다.
   쓰는 법: node tools/aitell.js <파일...> [--lines] [--top N]   (--lines면 걸린 줄을 보인다)
   끝 코드는 항상 0이다(점수 도구). 목표는 합계를 크게 줄이는 것이고, 0을 만들려고 뜻을 비틀지 않는다. */
const fs = require('fs');
const args = process.argv.slice(2);
const showLines = args.includes('--lines');
const ti = args.indexOf('--top'); const top = ti >= 0 ? +args[ti + 1] : 0;
const files = args.filter((a, i) => !a.startsWith('--') && !(ti >= 0 && i === ti + 1));
const PATS = [
  ['를 통해', /(?:을|를) 통해/g], ['에 대해', /에 대(?:해|한)/g], ['에 관하여', /에 관(?:하여|한)/g], ['결론적으로', /결론적으로/g], ['요약하자면', /요약하자면|정리하자면/g],
  ['뿐만 아니라', /뿐만 아니라/g], ['~할 수 있', /(?:할|될|쓸|볼|얻을|줄 ?|막을) 수 있(?:습니다|다|어요)/g], ['~것입니다', /(?:것|겁)입니다/g], ['되어집니다', /되어집니다|되어진/g],
  ['중요합니다', /중요(?:합니다|하다)|명심/g], ['~게 됩니다', /게 됩니다|게 된다/g], ['줄표', /—/g], ['느낌표', /!/g],
  ['다양한', /다양한|여러 가지|다채로운/g], ['~에 의해', /에 의(?:해|하여)/g], ['~하는 것', /하는 것이/g],
];
const STR = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
let grand = {}; let grandN = 0, grandChars = 0, grandSent = 0, grandLong = 0, grandLenSum = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8').split(/\r?\n/); const tot = {}; let n = 0, chars = 0, sent = 0, longS = 0, lenSum = 0; const hits = [];
  src.forEach((line, i) => {
    let m; STR.lastIndex = 0; const found = [];
    while ((m = STR.exec(line))) { const s = m[1] || m[2] || m[3] || ''; if (!/[가-힣]/.test(s)) continue; chars += s.length; if (s.length >= 12) s.split(/(?<=[.?])\s+/).forEach(t => { if (t.length >= 8) { sent++; lenSum += t.length; if (t.length >= 70) longS++; } }); for (const [k, re] of PATS) { const c = (s.match(re) || []).length; if (c) { tot[k] = (tot[k] || 0) + c; n += c; found.push(k + (c > 1 ? '×' + c : '')); } } }
    if (found.length) hits.push([i + 1, found.join(' '), line.trim().slice(0, 100)]);
  });
  console.log(`${f}: 걸린 표현 ${n}개 / 글자 ${chars} (천 자당 ${chars ? (n / chars * 1000).toFixed(1) : 0}), 문장 ${sent}개 평균 ${sent ? Math.round(lenSum / sent) : 0}자, 70자 넘는 문장 ${longS}개  ` + Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
  if (showLines) hits.slice(0, top || 40).forEach(h => console.log(`  ${h[0]}: [${h[1]}] ${h[2]}`));
  for (const [k, v] of Object.entries(tot)) grand[k] = (grand[k] || 0) + v; grandN += n; grandChars += chars; grandSent += sent; grandLong += longS; grandLenSum += lenSum;
}
if (files.length > 1) console.log(`합계: 걸린 표현 ${grandN}개 / 글자 ${grandChars} (천 자당 ${grandChars ? (grandN / grandChars * 1000).toFixed(1) : 0}), 문장 ${grandSent}개 평균 ${grandSent ? Math.round(grandLenSum / grandSent) : 0}자, 70자 넘는 문장 ${grandLong}개`);
