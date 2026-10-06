// 게임 엔진 부분만 떼어 tools/eng.gen.js로 만든다. 테스트(qa.js)가 이 파일을 쓴다.
// 0.6 개발 중에는 next/를 읽는다. data/*.js(값)를 index.html의 <script src> 순서대로 먼저 붙이고, 그 뒤에 엔진을 붙인다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', process.argv[2] || 'next');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const data = [...html.matchAll(/<script src="(data\/[^"]+\.js)"><\/script>/g)].map(m => fs.readFileSync(path.join(dir, m[1]), 'utf8')).join('\n');
const i = html.indexOf('<script>'); const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) throw new Error('index.html에서 게임 스크립트를 찾지 못했습니다');
const s = html.slice(i + 8, j);
const eng = s.slice(0, s.indexOf('/* ===== 가이드'));
const ux = s.slice(s.indexOf('/* ===== 표시 규칙'), s.indexOf('/* 상태 표시'));
const out = data + '\n' + eng + '\n' + ux.replace('function previewText', 'function _u') +
  '\nmodule.exports = Object.assign(module.exports || {}, { IFX, FXHIT, CH1_POOL, flaskHealFrac, flaskCap, heavyCost, guardCost, dodgeCost, STAM_FLASK, previewAfter, myTurnsUntil, eSpeed, frontBlocked, hasShield, mkEnemy, pickDodge, stepWorld, guardOf, PSN, poisonTotal, applyStats, calcHpMax, calcMpMax, calcStMax, FREE_POOL, itemFits, allSkills, DEFAULT_SKILLS, skillsOf, scarRate, skillMap, exclOf, isMeleeAct, SIG, isV2: typeof isV2 !== "undefined" ? isV2 : null, SK2: typeof SK2 !== "undefined" ? SK2 : null, treeWhy: typeof treeWhy !== "undefined" ? treeWhy : null, treeUnlock: typeof treeUnlock !== "undefined" ? treeUnlock : null, V2_OFF: typeof V2_OFF !== "undefined" ? V2_OFF : null, noFast: typeof noFast !== "undefined" ? noFast : null, wardMax: typeof wardMax !== "undefined" ? wardMax : null, elemPreview: typeof elemPreview !== "undefined" ? elemPreview : null, ELEM: typeof ELEM !== "undefined" ? ELEM : null, enemyHitEst: typeof enemyHitEst !== "undefined" ? enemyHitEst : null, basicBase: typeof basicBase !== "undefined" ? basicBase : null, heavyBase: typeof heavyBase !== "undefined" ? heavyBase : null, monkShowCtr: typeof monkShowCtr !== "undefined" ? monkShowCtr : null, CTR_SHOW: typeof CTR_SHOW !== "undefined" ? CTR_SHOW : [], SEAL_K: typeof SEAL_K !== "undefined" ? SEAL_K : [] });\n';
fs.writeFileSync(path.join(__dirname, 'eng.gen.js'), out);
console.log('tools/eng.gen.js 생성 (' + path.relative(path.join(__dirname, '..'), dir) + ', ' + out.length + '자)');
