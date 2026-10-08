// 7단계 검증 결과표: node tools/vreport.js <결과.json ...> > 표.md
// 입력은 dgqa 결과 파일(여러 개면 이어 붙임). 직업 · 갈래 · 챕터 · 성향으로 나눠 완주 · 보스 · 사망 원인을 낸다.
const fs = require('fs');
const files = process.argv.slice(2); if (!files.length) { console.error('사용: node tools/vreport.js a.json [b.json ...]'); process.exit(1); }
const R = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const cleared = (x, ch) => (x.chs || []).some(c => c.ch === ch) || (x.res === 'clear' && (x.ch || 1) === ch);
const startCh = Math.min(...R.map(x => x.ch || 1)); /* DG_FROM=2 · 3 배치는 그 챕터에서 시작한다 */
const reached = (x, ch) => ch === startCh || (ch > startCh && cleared(x, ch - 1));
const BOSS_FLOOR = 24;
const bossReached = (x, ch) => cleared(x, ch) || (((x.ch || 1) === ch) && x.floor >= BOSS_FLOOR);
const PN = { novice: '초보', casual: '일반', careful: '신중', reckless: '공격적', expert: '숙련', explorer: '탐험가' };
const by = (L, f) => { const m = {}; for (const x of L) (m[f(x)] = m[f(x)] || []).push(x); return m; };
const maxCh = Math.max(...R.map(x => x.ch || 1));
const out = []; const P = (...a) => out.push(a.join(''));
P('# 검증 결과표 (자동 생성: tools/vreport.js)'); P('');
P('- 입력: ', files.map(f => '`' + f.split(/[\\/]/).pop() + '`').join(', '), ' · 판 ', R.length, ' · 이상(bugs) ', R.reduce((a, x) => a + x.bugs.length, 0), '건');
P('- 씨앗: ', Math.min(...R.map(x => x.seed)), ' ~ ', Math.max(...R.map(x => x.seed)), ' · 성향 ', Object.keys(by(R, x => x.pk)).map(k => PN[k] || k).join(' · '), ' · 모드 ', Object.keys(by(R, x => x.mode || 'normal')).join(' · '));
P('');
for (let ch = startCh; ch <= maxCh; ch++) {
  const E = R.filter(x => reached(x, ch)); if (!E.length) continue;
  P('## ', ch, '챕터 (들어간 캐릭터 ', E.length, '명)'); P('');
  P('| 직업 | 들어감 | 보스 도달 | 완주 | 완주율 | 신중 완주율 | 보스 승률 | 강적 방 패배율 |'); P('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [b, L] of Object.entries(by(E, x => x.build))) {
    const bo = L.filter(x => bossReached(x, ch)), w = L.filter(x => cleared(x, ch)), car = L.filter(x => x.pk === 'careful');
    const sf = L.flatMap(x => x.fights.filter(f => f.t === 'strong' && (f.ch || 1) === ch));
    P('| ', b, ' | ', L.length, ' | ', bo.length, ' | ', w.length, ' | ', pct(w.length, L.length), '% | ', pct(car.filter(x => cleared(x, ch)).length, car.length), '% | ', pct(w.length, bo.length), '% | ', pct(sf.filter(f => f.res !== 'win').length, sf.length), '% |');
  }
  P(''); P('### ', ch, '챕터 직업 × 갈래 (트리 칸을 가장 많이 연 갈래)'); P('');
  P('| 직업 | 갈래 | 들어감 | 완주 | 완주율 | 보스 승률 |'); P('| --- | --- | --- | --- | --- | --- |');
  for (const [b, L] of Object.entries(by(E, x => x.build))) for (const [br, M] of Object.entries(by(L, x => x.branch || '(기록 없음)'))) {
    const bo = M.filter(x => bossReached(x, ch)), w = M.filter(x => cleared(x, ch)); P('| ', b, ' | ', br, ' | ', M.length, ' | ', w.length, ' | ', pct(w.length, M.length), '% | ', pct(w.length, bo.length), '% |');
  }
  P(''); P('### ', ch, '챕터 성향별'); P(''); P('| 성향 | 들어감 | 완주율 |'); P('| --- | --- | --- |');
  for (const [k, L] of Object.entries(by(E, x => x.pk))) P('| ', PN[k] || k, ' | ', L.length, ' | ', pct(L.filter(x => cleared(x, ch)).length, L.length), '% |');
  const deaths = E.flatMap(x => x.fights.filter(f => f.death && (f.ch || 1) === ch));
  const bd = by(deaths, d => d.t + ' ← ' + d.death.by + (d.death.big ? ' (큰 공격)' : ''));
  P(''); P('### ', ch, '챕터 사망 원인 상위'); P(''); P('| 방 ← 마지막 일격 | 수 |'); P('| --- | --- |');
  for (const [k, L] of Object.entries(bd).sort((a, b) => b[1].length - a[1].length).slice(0, 8)) P('| ', k, ' | ', L.length, ' |');
  const nb = E.flatMap(x => x.fights.filter(f => (f.ch || 1) === ch)).reduce((a, f) => a + (f.big || 0), 0);
  const bad = E.flatMap(x => x.fights.filter(f => (f.ch || 1) === ch).flatMap(f => f.bigNoTurn || [])).length;
  P(''); P('- 예고된 큰 공격 ', nb, '번 가운데 예고 뒤 내 차례 없이 나간 것 ', bad, '번'); P('');
}
/* 표식 도전 (10월 8일): 표식 묶음 × 시작 챕터마다 완주율. 같은 시작 챕터의 표식 없는 묶음과 견준다 */
if (R.some(x => x.markCh)) {
  const M = R.filter(x => x.markCh);
  P(''); P('## 표식 도전'); P('');
  P('| 시작 챕터 | 표식 | 점수 | 판 | 보스 도달 | 완주 | 완주율 | 대조군 대비 | 보스 승률 |'); P('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const ch of [...new Set(M.map(x => x.markCh))].sort()) {
    const C = M.filter(x => x.markCh === ch); const grp = by(C, x => (x.marks || []).join('+') || '(없음)');
    const ctl = grp['(없음)']; const cr = ctl ? pct(ctl.filter(x => cleared(x, ch)).length, ctl.length) : null;
    for (const [k, L] of Object.entries(grp).sort((a, b) => (a[1][0].markPts || 0) - (b[1][0].markPts || 0))) {
      const bo = L.filter(x => bossReached(x, ch)), w = L.filter(x => cleared(x, ch)); const r = pct(w.length, L.length);
      P('| ', ch, ' | ', k, ' | ', L[0].markPts || 0, ' | ', L.length, ' | ', bo.length, ' | ', w.length, ' | ', r, '% | ', cr == null ? '—' : (r - cr >= 0 ? '+' : '') + (r - cr) + '%p', ' | ', pct(w.length, bo.length), '% |');
    }
  }
}
console.log(out.join('\n'));
