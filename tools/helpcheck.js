// 화면에 보이는 규칙 문장의 숫자를 코드 값과 대조한다 (10월 10일, 0.6a.2-95, 완료 조건 7번).
//   node tools/helpcheck.js          : 모든 출처의 숫자 든 문장이 대조 항목에 걸려 있고, 항목이 코드 값과 맞는지 본다(어긋나면 종료 코드 1)
//   node tools/helpcheck.js --md     : 위에 더해 문장별 표를 docs/검증/화면-도움말-일치-표.md에 쓴다
//   node tools/helpcheck.js --list   : 대조 항목에 걸리지 않은 숫자 든 문장만 보인다
//
// 출처(source)는 문장 목록이다. 이 파일은 도움말(HELP)과 직업 설명(BUILDS)을 읽고, 나머지는 tools/helpcheck-*.js 모듈이 더한다.
// 모듈은 module.exports = function (api) { ... } 꼴이고, api는 다음과 같다.
//   api.E(식)                         게임 코드 안에서 식을 계산한다(예: api.E('WARD.guard')). 게임 상수 · 데이터 · 함수가 모두 보인다
//   api.source(이름, [{ id, text }])  문장 출처를 더한다. 글 하나에 문장이 여럿이면 알아서 나눈다
//   api.add(출처이름, 찾을글, 근거, 함수) 그 출처에서 `찾을글`이 든 문장을 이 항목이 대조한다. 함수가 참이면 일치.
//                                     근거는 표에 적히는 짧은 설명(코드 이름과 값). 찾을글이 어느 문장에도 없으면 낡은 항목으로 실패한다
//   api.note(출처이름, 찾을글, 이유)    숫자는 있지만 규칙이 아닌 문장(장면 이름, 연출)을 대조 없이 닫는다. 표에는 "규칙 아님"으로 적힌다
// 숫자로 세는 것: 아라비아 숫자. 다만 "1챕터" 같은 챕터 이름의 숫자는 센 뒤에서 뺀다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'); const dir = path.join(ROOT, '06a2');
const PS = require('./pagesrc.js');
const ctx = { console, setTimeout() { }, clearTimeout() { }, setInterval() { }, clearInterval() { }, module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(PS.pageData(dir) + '\n' + PS.pageScript(dir), ctx, { filename: 'x' });
const E = expr => vm.runInContext(expr, ctx);

const sources = {}; const checks = []; const notes = []; const restNotes = {};
function split(t) { return String(t).split(/(?<=[.?!])\s+(?=\S)/).map(s => s.trim()).filter(Boolean); }
const hasNum = s => /\d/.test(s.replace(/[1-3](\s*·\s*[1-3])*\s*챕터/g, ''));
const api = {
  E, ctx, ROOT,
  source(name, arr) { sources[name] = (sources[name] || []).concat(arr.map(x => ({ id: x.id, text: x.text }))); },
  add(src, find, ev, fn) { checks.push({ src, find, ev, fn }); },
  note(src, find, why) { notes.push({ src, find, why }); },
  noteRest(src, why) { restNotes[src] = why; }, // 대조 항목이 닿지 않은 숫자 문장을 모두 "미대조(측정 · 이력)"로 닫는다. 표에 따로 센다
};

// 출처 1: 도움말
const HELP = E('HELP');
api.source('help', HELP.flatMap(s => (s.t || []).map((t, i) => ({ id: s.k + ':' + i, text: t }))));
// 출처 2: 직업 설명(룰 문장). 숨겨진 직업도 열린 뒤에 보이는 글이라 같이 센다
const BU = E('BUILDS');
api.source('classes', Object.keys(BU).filter(k => !BU[k].tut).flatMap(k => [{ id: k + ':lore', text: BU[k].lore || '' }, { id: k + ':rule', text: BU[k].rule || '' }]));

for (const f of fs.readdirSync(__dirname).filter(f => /^helpcheck-.+\.js$/.test(f)).sort()) require('./' + f)(api);

// 문장 단위로 풀고, 항목을 걸어 본다
const rows = []; const bad = [];
for (const [name, arr] of Object.entries(sources)) {
  for (const it of arr) for (const s of split(it.text)) rows.push({ src: name, id: it.id, s, num: hasNum(s), by: [], res: [] });
}
const bySrc = n => rows.filter(r => r.src === n);
for (const c of checks) {
  const hit = bySrc(c.src).filter(r => r.s.includes(c.find));
  if (!hit.length) { bad.push('낡은 항목(문장 없음): [' + c.src + '] ' + c.find); continue; }
  let ok, err = '';
  try { ok = !!c.fn(E); } catch (e) { ok = false; err = ' (' + e.message + ')'; }
  for (const r of hit) { r.by.push(c.ev); r.res.push(ok); }
  if (!ok) bad.push('불일치: [' + c.src + '] ' + c.find + ' | ' + c.ev + err);
}
for (const n of notes) {
  const hit = bySrc(n.src).filter(r => r.s.includes(n.find));
  if (!hit.length) { bad.push('낡은 규칙 아님 표시(문장 없음): [' + n.src + '] ' + n.find); continue; }
  for (const r of hit) if (!r.by.length) { r.by.push('규칙 아님: ' + n.why); r.res.push(true); r.note = 1; }
}
for (const r of rows) if (r.num && !r.by.length && restNotes[r.src]) { r.by.push('미대조: ' + restNotes[r.src]); r.res.push(true); r.note = 1; r.rest = 1; }
const unc = rows.filter(r => r.num && !r.by.length);

const names = Object.keys(sources);
const sum = names.map(n => {
  const R = bySrc(n), N = R.filter(r => r.num), cov = N.filter(r => r.by.length), okN = cov.filter(r => r.res.every(Boolean)), nt = N.filter(r => r.note);
  return { n, all: R.length, num: N.length, cov: cov.length, ok: okN.length, rule: okN.length - nt.length, note: nt.length, unc: N.length - cov.length };
});
console.log('출처'.padEnd(14) + '문장  숫자문장  대조  일치  (규칙 대조/규칙 아님)  미대조');
for (const x of sum) console.log(x.n.padEnd(14) + String(x.all).padStart(4) + String(x.num).padStart(8) + String(x.cov).padStart(7) + String(x.ok).padStart(6) + '  (' + x.rule + '/' + x.note + ')'.padEnd(10) + String(x.unc).padStart(8));
const T = sum.reduce((a, x) => ({ all: a.all + x.all, num: a.num + x.num, cov: a.cov + x.cov, ok: a.ok + x.ok, rule: a.rule + x.rule, note: a.note + x.note, unc: a.unc + x.unc }), { all: 0, num: 0, cov: 0, ok: 0, rule: 0, note: 0, unc: 0 });
console.log('합계'.padEnd(14) + String(T.all).padStart(4) + String(T.num).padStart(8) + String(T.cov).padStart(7) + String(T.ok).padStart(6) + '  (' + T.rule + '/' + T.note + ')'.padEnd(10) + String(T.unc).padStart(8));
if (process.argv.includes('--list') || unc.length) { console.log('\n미대조 숫자 문장 ' + unc.length + '개'); for (const r of unc.slice(0, 400)) console.log('  [' + r.src + ' ' + r.id + '] ' + r.s.slice(0, 160)); }
if (bad.length) { console.log('\n실패 ' + bad.length + '건'); bad.forEach(b => console.log('  ' + b)); }

if (process.argv.includes('--md')) {
  const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const L = ['# 화면 문장 숫자 대조표 (자동 생성)', '', '`node tools/helpcheck.js --md`가 쓴 파일이다. 손으로 고치지 않는다. 숫자가 든 문장마다 근거 코드와 판정을 적는다. 설명은 [화면-도움말-일치.md](화면-도움말-일치.md).', '',
    '| 출처 | 문장 수 | 숫자 든 문장 | 대조함 | 일치 | 규칙 대조 | 규칙 아님 | 미대조 |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const x of sum.concat([Object.assign({ n: '합계' }, T)])) L.push('| ' + x.n + ' | ' + x.all + ' | ' + x.num + ' | ' + x.cov + ' | ' + x.ok + ' | ' + x.rule + ' | ' + x.note + ' | ' + x.unc + ' |');
  for (const n of names) {
    L.push('', '## ' + n, '', '| 위치 | 문장 | 근거 | 판정 |', '| --- | --- | --- | --- |');
    for (const r of bySrc(n).filter(r => r.num)) L.push('| ' + esc(r.id) + ' | ' + esc(r.s) + ' | ' + esc(r.by.join(' ; ') || '(없음)') + ' | ' + (!r.by.length ? '미대조' : r.res.every(Boolean) ? (r.rest ? '미대조(측정 · 이력)' : r.note ? '규칙 아님' : '일치') : '불일치') + ' |');
  }
  fs.mkdirSync(path.join(ROOT, 'docs/검증'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs/검증/화면-도움말-일치-표.md'), L.join('\n') + '\n');
  console.log('\n표를 썼다: docs/검증/화면-도움말-일치-표.md');
}
process.exit(bad.length || unc.length ? 1 : 0);
