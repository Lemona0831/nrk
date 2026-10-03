/* 스킬 점수표와 설명 문장 (0.6a.2 개편. docs/0.6a.2-암살자-스킬.md)
   게임이 쓰는 06a2/data/skills.js(스킬 데이터)와 06a2/data/skillkit.js(점수·문장 규칙)를 그대로 읽는다. 데이터와 규칙은 그 두 파일에만 있다.
   실행: node tools/skillscore.js [직업=assassin]        점수표 (줄 예산 ±8% 밖이면 표시, 기획서 12.6절)
         node tools/skillscore.js [직업] md             문서용 마크다운 표 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = path.join(__dirname, '..', process.env.SKDIR || '06a2', 'data');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(['skills.js', 'skillkit.js'].map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n') + '\n;this.SKILLS2 = SKILLS2; this.skScore = skScore; this.skHead = skHead; this.skBody = skBody;', ctx);
const args = process.argv.slice(2); const md = args.includes('md'); const build = args.find(a => a !== 'md') || 'assassin';
const SK = ctx.SKILLS2[build]; if (!SK) { console.error('직업 없음: ' + build + ' (있는 직업: ' + Object.keys(ctx.SKILLS2).join(', ') + ')'); process.exit(1); }
const rows = SK.map(s => Object.assign({ s }, ctx.skScore(s)));
let out = 0;
if (!md) {
  for (const r of rows) {
    const ok = Math.abs(r.V / r.B - 1) <= 0.08 + 1e-9 ? 'ok' : (r.V > r.B ? '높음' : '낮음'); if (ok !== 'ok') out++;
    console.log(`${r.s.b}\t${r.s.tier}\t${r.s.n.padEnd(8)}\tE ${r.E.toFixed(1)}\t순 ${r.net.toFixed(1)}\t× ${r.F.toFixed(1)}\t= ${r.V.toFixed(1)} / ${r.B}\t${ok}`);
  }
  console.log(`${rows.length}개, 예산 밖 ${out}개`);
} else {
  console.log('| 갈래 | 등급 | 스킬 | 머리줄 | 설명 | 점수 (예산) |\n| --- | --- | --- | --- | --- | --- |');
  for (const r of rows) console.log(`| ${r.s.b} | ${r.s.tier} | ${r.s.n} | ${ctx.skHead(r.s)} | ${ctx.skBody(r.s)} | ${r.V.toFixed(0)} (${r.B}) |`);
}
