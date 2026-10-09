// 직업 문서 맨 위에 "코드 기준 값" 블록을 넣거나 고친다(06a2 코드에서 읽는다). 문서의 옛 수치와 코드가 어긋나도 이 블록이 현행이다.
//   node tools/docsync.js          : 공개 직업 문서 여섯(docs/직업/)과, 있으면 저장소 밖 비공개 문서(../nrk-private/직업/)를 고친다
//   node tools/docsync.js --check  : 고치지 않고 블록이 코드와 같은지만 본다(다르면 종료 코드 1)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'); const dir = path.join(ROOT, '06a2');
const PS = require('./pagesrc.js'); const data = PS.pageData(dir), script = PS.pageScript(dir); // 한 파일 · 나눈 파일 모두 같은 글자
const ctx = { console, setTimeout() { }, clearTimeout() { }, setInterval() { }, clearInterval() { }, module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(data + '\n' + script + '\n;this.__X = { BUILDS, LV_GAIN, TREE2, SKILLS2, STAT_REC, STAT_KEYS, CANTRIP: typeof CANTRIP !== "undefined" ? CANTRIP : {} };', ctx, { filename: 'x' });
const X = ctx.__X;
const SN = { str: '힘', dex: '민첩', int: '지능', con: '체력', wil: '의지' };
const DOCS = { assassin: 'docs/직업/암살자.md', warden: 'docs/직업/파수꾼.md', hunter: 'docs/직업/사냥꾼.md', elementalist: 'docs/직업/원소술사.md', spellblade: 'docs/직업/마검사.md', monk: 'docs/직업/수도승.md',
  butcher: '../nrk-private/직업/도살자.md', confessor: '../nrk-private/직업/고해사.md', bloodmage: '../nrk-private/직업/피의 술사.md' };
const BEGIN = '<!-- 코드값 시작 -->', END = '<!-- 코드값 끝 -->';
function block(k) {
  const B = X.BUILDS[k], T = X.TREE2[k], G = X.LV_GAIN[k] || {}, R = X.STAT_REC[k] || {};
  const sk = Object.values(X.SKILLS2[k] || {}); const starters = (T.starters || []).map(id => { const s = X.SKILLS2[k].find ? X.SKILLS2[k].find(x => x.id === id) : X.SKILLS2[k][id]; return s ? s.n + '(쿨타임 ' + s.cd + ')' : id; });
  const rec = Object.entries(R).sort((a, b) => b[1] - a[1]).map(([s, v]) => SN[s] + ' ' + Math.round(v * 100) + '%').join(' · ');
  return [BEGIN,
    '> **코드 기준 값 (자동 생성 `node tools/docsync.js`, 06a2 코드에서 읽음).** 아래 본문의 옛 수치와 다르면 이 줄이 현행이다.',
    '> 생명력 ' + B.hp + '(레벨마다 +' + G.hp + ') · ' + (B.ranged ? '원거리' : '근접') + ' · 무기 피해 배율 ' + (B.wpnMul || 1) + ' · 스킬 ' + sk.length + '칸(시작 ' + (T.starters || []).length + ' + 트리 ' + (sk.length - (T.starters || []).length) + ') · 갈래 ' + (T.branches || []).join(' · ') + ' · 시작 스킬 ' + starters.join(', ') + ' · 추천 능력치 ' + rec,
    END].join('\n');
}
let bad = 0;
for (const [k, rel] of Object.entries(DOCS)) {
  const p = path.join(ROOT, rel); if (!fs.existsSync(p)) { console.log('없음(건너뜀):', rel); continue; }
  let s = fs.readFileSync(p, 'utf8'); const nl = s.includes('\r\n') ? '\r\n' : '\n'; const b = block(k).replace(/\n/g, nl);
  const a = s.indexOf(BEGIN), z = s.indexOf(END);
  let t;
  if (a >= 0 && z > a) t = s.slice(0, a) + b + s.slice(z + END.length);
  else { const e = s.indexOf(nl); t = s.slice(0, e) + nl + nl + b + s.slice(e); }
  if (t !== s) { if (process.argv.includes('--check')) { console.log('어긋남:', rel); bad++; } else { fs.writeFileSync(p, t); console.log('고침:', rel); } } else console.log('같음:', rel);
}
process.exit(bad ? 1 : 0);
