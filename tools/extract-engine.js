// index.html에서 게임 엔진 부분만 떼어 tools/eng.gen.js로 만든다. 테스트(qa.js)가 이 파일을 쓴다.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const i = html.indexOf('<script>'); const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) throw new Error('index.html에서 게임 스크립트를 찾지 못했습니다');
const s = html.slice(i + 8, j);
const eng = s.slice(0, s.indexOf('/* ===== 가이드'));
const ux = s.slice(s.indexOf('/* ===== 표시 규칙'), s.indexOf('/* 상태 표시'));
const out = eng + '\n' + ux.replace('function previewText', 'function _u') +
  '\nmodule.exports = Object.assign(module.exports || {}, { previewAfter, myTurnsUntil, eSpeed, frontBlocked, hasShield, mkEnemy, pickDodge, stepWorld, guardOf, PSN, poisonTotal, applyStats, calcHpMax, calcMpMax, calcStMax, FREE_POOL, itemFits, allSkills, DEFAULT_SKILLS, skillsOf, scarRate, skillMap, exclOf, isMeleeAct, SIG });\n';
fs.writeFileSync(path.join(__dirname, 'eng.gen.js'), out);
console.log('tools/eng.gen.js 생성 (' + out.length + '자)');
