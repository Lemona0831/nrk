// 7단계 검증 결과 문서를 만든다: node tools/vresult.js <결과 폴더(par)> > docs/검증/검증-결과.md
// 입력 파일 이름은 scratchpad verify.sh의 태그(v_learn · v_held · v_from2 · v_from3 · v_hard · v_path_* · v_f_<직업>_<번호>)다.
/* 숨겨진 직업은 공개 문서에 코드 키 대신 해금 1 · 2 · 3으로 나온다(10월 9일). 이름 대응은 ../nrk-private/숨김직업-키.md 갈래 이름도 해금 N 갈래 k로 바꾼다(10월 10일) */
{ const _log = console.log; const BR = { 도륙: 1, 광기: 2, 학살: 3, 속죄: 1, 전가: 2, 고행: 3, 역병: 1, 포식: 2, 혈약: 3 }; const _H = s => typeof s === 'string' ? s.replace(/\bbutcher\b/g, '해금 1').replace(/\bconfessor\b/g, '해금 2').replace(/\bbloodmage\b/g, '해금 3').replace(/(해금 [123] \| )(도륙|광기|학살|속죄|전가|고행|역병|포식|혈약)/g, (m, pre, w) => pre + '갈래 ' + BR[w]) : s; console.log = (...a) => _log(...a.map(_H)); }
const fs = require('fs'), path = require('path'), cp = require('child_process');
const dir = process.argv[2]; if (!dir) { console.error('사용: node tools/vresult.js <par 폴더>'); process.exit(1); }
const load = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const files = fs.readdirSync(dir).filter(f => /^v_.*\.json$/.test(f));
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const cleared = (x, ch) => (x.chs || []).some(c => c.ch === ch) || (x.res === 'clear' && (x.ch || 1) === ch);
const date = new Date().toISOString().slice(0, 10);
const out = []; const P = (...a) => out.push(a.join(''));
const BATCH = [
  ['L1 일반 1→3챕터, 학습용 씨앗', ['v_learn.json'], '`DG_LOCK=1 node dgqa.js 40 out.json 3` 씨앗 5000부터 13 간격(성향 6 × 직업 9 × 40)'],
  ['L2 같은 조건, 테스트에 쓰지 않은 씨앗', ['v_held.json'], '`SEED=90000` 같은 명령(씨앗 90000부터 13 간격)'],
  ['L3 2챕터부터 시작(1챕터를 깬 캐릭터 흉내)', ['v_from2.json'], '`DG_FROM=2 ... 20 out.json 3`(성향 6 × 직업 9 × 20)'],
  ['L4 3챕터부터 시작(2챕터를 깬 캐릭터 흉내)', ['v_from3.json'], '`DG_FROM=3 ... 20 out.json 3`'],
  ['L5 가혹 모드', ['v_hard.json'], '`MODE=hard ... 40 out.json 3`'],
  ['L7 길 고정(험한 길 · 큰 길 · 샛길), 신중', ['v_path_rough.json', 'v_path_main.json', 'v_path_quiet.json'], '`PATH_FIX=rough|main|quiet PK=careful ... 20 out.json 3`(직업 9 × 20 × 길 3)'],
  ['L6 갈래 고정, 신중 · 숙련', files.filter(f => /^v_f_/.test(f)), '`FOCUS=<갈래> CLS=<직업> PK=careful,expert ... 20 out.json 3`(직업 9 × 갈래 3 × 성향 2 × 20)'],
];
const all = files.flatMap(f => load(f).map(x => Object.assign({ _f: f }, x)));
const bugs = all.reduce((a, x) => a + x.bugs.length, 0);
P('# 검증 결과 (7단계, 자동 생성: tools/vresult.js)'); P('');
P('- **생성일:** ', date, ' · 코드: 06a2(저장소 커밋 기준, 판 번호는 변경 내역 맨 위) · 도구: `tools/dgqa.js`(던전 자동 테스터) · 표 도구 `tools/vreport.js`');
P('- **누적 던전 판:** ', all.length, '판(1만 회 기준 ', all.length >= 10000 ? '충족' : '미달', '), 이상(bugs) ', bugs, '건');
P('- **재현:** 판은 고정 씨앗이라 같은 코드 · 같은 환경 변수면 결과가 판 단위로 같다. 병렬 실행은 `SHARD=i/n`으로 나누고 합쳐도 한 번에 돌린 것과 같다(10월 8일 확인). 배치 정의는 아래 표, 구동 스크립트는 docs/검증/검증-계획.md 6절.');
P('- **읽는 법:** 완주 = 그 챕터 보스를 이긴 판. 보스 승률 = 보스에 닿은 판 가운데 이긴 판. 갈래 = 트리 칸을 가장 많이 연 갈래. 시작 흉내(L3 · L4)는 앞 챕터를 깬 캐릭터를 그 챕터 1층에서 시작시킨다.');
P('- **한계:** 던전 자동 테스터는 사람과 판단이 다르다(장비 교체 · 두 수 앞을 못 봄). 2 · 3챕터는 일반 흐름에서 도달하는 판이 적어 L3 · L4로 표본을 채웠다. 결과는 "직업 · 갈래 사이의 상대적 차이"를 보는 데 쓰고, 사람의 체감 난이도로 읽지 않는다.');
P('');
P('## 1. 배정과 판 수'); P(''); P('| 배치 | 판 수 | 씨앗 범위 | 조건 |'); P('| --- | --- | --- | --- |');
for (const [name, fl, cond] of BATCH) { const L = fl.filter(f => files.includes(f)).flatMap(f => load(f)); if (!L.length) continue; P('| ', name, ' | ', L.length, ' | ', Math.min(...L.map(x => x.seed)), '~', Math.max(...L.map(x => x.seed)), ' | ', cond, ' |'); }
P('| **합** | **', all.length, '** | | |'); P('');
P('## 2. 학습용 씨앗 대 쓰지 않은 씨앗 (L1 대 L2)'); P('');
if (files.includes('v_learn.json') && files.includes('v_held.json')) {
  const A = load('v_learn.json'), B = load('v_held.json'); P('| 직업 | L1 완주 | L2 완주 | 차이 | L1 보스 승률 | L2 보스 승률 | 차이 |'); P('| --- | --- | --- | --- | --- | --- | --- |');
  const bossOf = (L, ch) => L.filter(x => cleared(x, ch) || ((x.ch || 1) === ch && x.floor >= 24));
  for (const b of [...new Set(A.map(x => x.build))]) {
    const a = A.filter(x => x.build === b), c = B.filter(x => x.build === b);
    const wa = pct(a.filter(x => cleared(x, 1)).length, a.length), wc = pct(c.filter(x => cleared(x, 1)).length, c.length);
    const ba = pct(a.filter(x => cleared(x, 1)).length, bossOf(a, 1).length), bc = pct(c.filter(x => cleared(x, 1)).length, bossOf(c, 1).length);
    P('| ', b, ' | ', wa, '% | ', wc, '% | ', wc - wa, '%p | ', ba, '% | ', bc, '% | ', bc - ba, '%p |');
  }
  const wa = pct(A.filter(x => cleared(x, 1)).length, A.length), wc = pct(B.filter(x => cleared(x, 1)).length, B.length); P('| 전체 | ', wa, '% | ', wc, '% | ', wc - wa, '%p | | | |');
  P(''); P('- 직업별 판 수가 240이라 한 직업의 차이는 표본 오차(±3~5%p 안팎)가 섞인다. 전체의 차이와 직업 순서가 학습용에서만 맞은 것이 아닌지 본다.'); P('');
}
let sec = 3;
for (const [name, fl] of BATCH) {
  const present = fl.filter(f => files.includes(f)); if (!present.length) continue;
  P('## ', sec++, '. ', name); P('');
  const tmp = path.join(dir, '_vr_' + sec + '.json'); fs.writeFileSync(tmp, JSON.stringify(present.flatMap(f => load(f))));
  const t = cp.execFileSync(process.execPath, [path.join(__dirname, 'vreport.js'), tmp], { encoding: 'utf8', maxBuffer: 1 << 26 });
  P(t.split('\n').slice(2).join('\n').replace(/^## /gm, '### ').replace(/^### (\d챕터 )/gm, '#### $1')); fs.unlinkSync(tmp);
}
console.log(out.join('\n'));
