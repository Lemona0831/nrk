// index.html의 게임 스크립트 지도. 최상위 선언(const · let · var · function · class)과 읽는 이름을 파서로 뽑아
// 나눌 파일(tools/splitplan.js)마다 표로 낸다. 눈으로 센 표가 아니라 스크립트가 만든 표다.
//   node tools/splitmap.js [폴더=06a2] [옵션]
//     (옵션 없음)   나눌 파일별 줄 범위 · 선언 수 · 읽는 곳 표와 위험 목록
//     --list        최상위 문장 목록(줄 범위, 종류, 이름). 자를 곳을 고를 때 쓴다
//     --cuts        계획의 자를 곳이 줄 맨 앞에서 유일하게 찾아지고, 문장 한가운데가 아닌지 점검한다
//     --md          문서에 붙일 마크다운 표를 낸다
//     --detail=파일 그 파일이 다른 파일에서 가져다 쓰는 이름과, 다른 파일이 그 파일에서 가져가는 이름
//     --names=이름  그 이름이 정의된 곳과 읽는 파일
//   종료 코드 1: 위험 가운데 오류가 있음(지금 순서로도 실제로 터지는 것, 또는 나누면 터지는 것).
// 위험 종류
//   TDZ     불러올 때 실행되는 코드가 뒤에 정의된 const · let · class를 읽는다(바로 읽거나, 불러올 때 부르는 함수를 거쳐서).
//   VAR     같은 일을 var로 한다(undefined를 읽는다).
//   SPLIT   불러올 때 실행되는 코드가 뒤 파일에 있는 function 선언을 부른다. 한 스크립트 안에서는 끌어올려져 되지만 파일이 나뉘면 안 된다.
//   (참고) 'call-time' 앞 파일이 뒤 파일의 이름을 함수 안에서 읽는 것은 불러온 뒤에 일어나므로 정보로만 센다.
// acorn은 node에 들어 있는 것을 --expose-internals로 쓴다(설치 없음). 이 파일이 알아서 다시 실행한다.
const fs = require('fs'), path = require('path'), cp = require('child_process');
let acorn;
try { acorn = require('internal/deps/acorn/acorn/dist/acorn'); }
catch (e) {
  if (process.execArgv.includes('--expose-internals')) throw e;
  const r = cp.spawnSync(process.execPath, ['--expose-internals', '--no-warnings', __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}
const P = require('./pagesrc.js');
const PLAN = require('./splitplan.js');

const args = process.argv.slice(2); const flags = args.filter(a => a.startsWith('--')); const pos = args.filter(a => !a.startsWith('--'));
const DIR = pos[0] || '06a2';
const flag = k => flags.find(f => f === '--' + k || f.startsWith('--' + k + '='));
const flagVal = k => { const f = flag(k); return f && f.includes('=') ? f.slice(k.length + 3) : null; };

/* ---------- 파서 + 이름 풀이 ---------- */
function patNames(p, set) {
  if (!p) return;
  switch (p.type) {
    case 'Identifier': set.add(p.name); break;
    case 'ObjectPattern': for (const q of p.properties) patNames(q.type === 'RestElement' ? q.argument : q.value, set); break;
    case 'ArrayPattern': for (const q of p.elements) patNames(q, set); break;
    case 'AssignmentPattern': patNames(p.left, set); break;
    case 'RestElement': patNames(p.argument, set); break;
  }
}
function collectVars(n, set) { // 함수 안에서 var로 선언된 이름 (안쪽 함수는 건너뜀)
  if (!n || typeof n.type !== 'string') return;
  if (/Function/.test(n.type)) return;
  if (n.type === 'VariableDeclaration' && n.kind === 'var') for (const d of n.declarations) patNames(d.id, set);
  for (const k in n) { if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(x => collectVars(x, set)); else if (v && typeof v.type === 'string') collectVars(v, set); }
}
function blockNames(stmts, set) { // 블록 안의 let · const · class · function 이름
  for (const s of stmts) {
    if (s.type === 'VariableDeclaration' && s.kind !== 'var') for (const d of s.declarations) patNames(d.id, set);
    else if (s.type === 'ClassDeclaration' || s.type === 'FunctionDeclaration') set.add(s.id.name);
  }
}
const RANK = { L: 3, C: 2, D: 1 };
const lower = (a, b) => (RANK[a] <= RANK[b] ? a : b);

// 한 덩어리(최상위 문장 하나, 또는 함수 하나의 몸)를 훑어 읽는 이름을 모은다.
// out: { L: Set, C: Set, D: Set, calls: Set(L에서 부르는 이름) }
function Walker(out) {
  const isLocal = (name, sc) => { for (let i = sc.length - 1; i >= 0; i--) if (sc[i].has(name)) return true; return false; };
  const ref = (name, st, callee) => {
    if (isLocal(name, st.sc)) return;
    out[st.mode].add(name);
    if (callee && st.mode === 'L') out.calls.add(name);
  };
  function pattern(p, st, declare) {
    if (!p) return;
    switch (p.type) {
      case 'Identifier': if (!declare) ref(p.name, st); break;
      case 'ObjectPattern': for (const q of p.properties) { if (q.type === 'RestElement') pattern(q.argument, st, declare); else { if (q.computed) visit(q.key, st); pattern(q.value, st, declare); } } break;
      case 'ArrayPattern': for (const q of p.elements) pattern(q, st, declare); break;
      case 'AssignmentPattern': pattern(p.left, st, declare); visit(p.right, st); break;
      case 'RestElement': pattern(p.argument, st, declare); break;
      default: visit(p, st);
    }
  }
  function fn(n, st, mode) { // 함수: 새 범위. mode는 몸을 읽는 때
    const sc = new Set();
    for (const p of n.params) patNames(p, sc);
    sc.add('arguments');
    if (n.type === 'FunctionExpression' && n.id) sc.add(n.id.name);
    const inner = { sc: st.sc.concat([sc]), mode };
    if (n.body.type === 'BlockStatement') { blockNames(n.body.body, sc); collectVars(n.body, sc); }
    for (const p of n.params) pattern(p, inner, true);
    if (n.body.type === 'BlockStatement') for (const s of n.body.body) visit(s, inner); else visit(n.body, inner);
  }
  function block(stmts, st, extra) {
    const sc = new Set(extra || []); blockNames(stmts, sc);
    const inner = { sc: st.sc.concat([sc]), mode: st.mode };
    for (const s of stmts) visit(s, inner);
  }
  function call(n, st) {
    const c = n.callee;
    if (c.type === 'Identifier') ref(c.name, st, true);
    else if (c.type === 'FunctionExpression' || c.type === 'ArrowFunctionExpression') fn(c, st, st.mode);
    else visit(c, st);
    for (const a of n.arguments) {
      if (a.type === 'FunctionExpression' || a.type === 'ArrowFunctionExpression') fn(a, st, st.mode === 'L' ? 'C' : st.mode);
      else visit(a, st);
    }
  }
  function visit(n, st) {
    if (!n) return;
    switch (n.type) {
      case 'Identifier': ref(n.name, st); return;
      case 'Literal': case 'ThisExpression': case 'Super': case 'MetaProperty': case 'EmptyStatement': case 'BreakStatement': case 'ContinueStatement': case 'DebuggerStatement': case 'TemplateElement': return;
      case 'FunctionDeclaration': // 이름은 둘러싼 블록이 이미 갖고 있다
      case 'FunctionExpression': case 'ArrowFunctionExpression': fn(n, st, lower(st.mode, 'D')); return;
      case 'ClassDeclaration': case 'ClassExpression': {
        if (n.superClass) visit(n.superClass, st);
        for (const m of n.body.body) {
          if (m.computed) visit(m.key, st);
          if (m.type === 'MethodDefinition') fn(m.value, st, 'D');
          else if (m.type === 'PropertyDefinition') { if (m.value) visit(m.value, { sc: st.sc, mode: lower(st.mode, 'D') }); }
          else if (m.type === 'StaticBlock') block(m.body, { sc: st.sc, mode: lower(st.mode, 'D') });
        }
        return;
      }
      case 'VariableDeclaration': for (const d of n.declarations) { pattern(d.id, st, true); visit(d.init, st); } return;
      case 'CallExpression': case 'NewExpression': call(n, st); return;
      case 'MemberExpression': visit(n.object, st); if (n.computed) visit(n.property, st); return;
      case 'Property': if (n.computed) visit(n.key, st); visit(n.value, st); return;
      case 'AssignmentExpression': if (n.left.type === 'Identifier') ref(n.left.name, st); else pattern(n.left, st, false); visit(n.right, st); return;
      case 'UpdateExpression': visit(n.argument, st); return;
      case 'LabeledStatement': visit(n.body, st); return;
      case 'BlockStatement': block(n.body, st); return;
      case 'StaticBlock': block(n.body, st); return;
      case 'ForStatement': {
        const sc = new Set(); if (n.init && n.init.type === 'VariableDeclaration' && n.init.kind !== 'var') for (const d of n.init.declarations) patNames(d.id, sc);
        const inner = { sc: st.sc.concat([sc]), mode: st.mode }; visit(n.init, inner); visit(n.test, inner); visit(n.update, inner); visit(n.body, inner); return;
      }
      case 'ForInStatement': case 'ForOfStatement': {
        const sc = new Set(); if (n.left.type === 'VariableDeclaration' && n.left.kind !== 'var') for (const d of n.left.declarations) patNames(d.id, sc);
        const inner = { sc: st.sc.concat([sc]), mode: st.mode };
        if (n.left.type === 'VariableDeclaration') visit(n.left, inner); else pattern(n.left, inner, false);
        visit(n.right, inner); visit(n.body, inner); return;
      }
      case 'SwitchStatement': {
        visit(n.discriminant, st); const sc = new Set(); for (const c of n.cases) blockNames(c.consequent, sc);
        const inner = { sc: st.sc.concat([sc]), mode: st.mode }; for (const c of n.cases) { visit(c.test, inner); c.consequent.forEach(s => visit(s, inner)); } return;
      }
      case 'TryStatement': {
        visit(n.block, st);
        if (n.handler) { const sc = new Set(); patNames(n.handler.param, sc); const inner = { sc: st.sc.concat([sc]), mode: st.mode }; if (n.handler.param) pattern(n.handler.param, inner, true); visit(n.handler.body, inner); }
        visit(n.finalizer, st); return;
      }
      default:
        for (const k in n) {
          if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue;
          const v = n[k];
          if (Array.isArray(v)) v.forEach(x => { if (x && typeof x.type === 'string') visit(x, st); });
          else if (v && typeof v.type === 'string') visit(v, st);
        }
    }
  }
  return { visit, fn };
}
const newOut = () => ({ L: new Set(), C: new Set(), D: new Set(), calls: new Set() });

function isFnNode(n) { return n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'); }

// 소스 한 덩어리를 최상위 문장 단위로 분석한다.
function analyse(src, label) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: false });
  const stmts = [];
  ast.body.forEach((s, i) => {
    const rec = { i, type: s.type, ls: s.loc.start.line, le: s.loc.end.line, names: [], kind: null, label, fnBody: null };
    if (s.type === 'FunctionDeclaration') { rec.kind = 'function'; rec.names = [s.id.name]; rec.fnBody = s; }
    else if (s.type === 'ClassDeclaration') { rec.kind = 'class'; rec.names = [s.id.name]; }
    else if (s.type === 'VariableDeclaration') {
      rec.kind = s.kind; const set = new Set(); for (const d of s.declarations) patNames(d.id, set); rec.names = [...set];
      if (s.declarations.length === 1 && isFnNode(s.declarations[0].init) && s.declarations[0].id.type === 'Identifier') rec.fnBody = s.declarations[0].init;
    } else { // 최상위 if · for 안의 var도 전역이 된다
      const set = new Set(); collectVars(s, set); if (set.size) { rec.kind = 'var'; rec.names = [...set]; }
    }
    // 이 문장이 불러올 때 읽는 것
    const out = newOut(); const W = Walker(out);
    if (s.type === 'FunctionDeclaration') W.fn(s, { sc: [], mode: 'D' }, 'D');
    else W.visit(s, { sc: [], mode: 'L' });
    rec.out = out;
    // 함수라면 불렀을 때 일어나는 것
    if (rec.fnBody) { const o2 = newOut(); Walker(o2).fn(rec.fnBody, { sc: [], mode: 'L' }, 'L'); rec.call = o2; }
    stmts.push(rec);
  });
  return stmts;
}

/* ---------- 자를 곳 풀이 ---------- */
function resolveCuts(text, specs) { // 계획의 from 표식을 줄 번호로 바꾼다. 반환: [{ file, startLine, endLine, from }] (1부터, 닫힌 구간)
  const lines = text.split('\n'); const res = []; const errs = [];
  specs.forEach((sp, k) => {
    let at = 1;
    if (sp.from != null) {
      const hits = []; lines.forEach((l, i) => { if (l.startsWith(sp.from)) hits.push(i + 1); });
      if (hits.length !== 1) { errs.push(sp.file + ': 표식 ' + JSON.stringify(sp.from) + ' 이(가) ' + hits.length + '곳에서 줄 맨 앞에 있습니다(유일해야 함)'); at = null; } else at = hits[0];
    }
    res.push({ file: sp.file, startLine: at, from: sp.from, title: sp.title });
  });
  for (let k = 0; k < res.length; k++) res[k].endLine = k + 1 < res.length ? (res[k + 1].startLine == null ? null : res[k + 1].startLine - 1) : lines.length;
  for (let k = 1; k < res.length; k++) if (res[k].startLine != null && res[k - 1].startLine != null && res[k].startLine <= res[k - 1].startLine) errs.push(res[k].file + ': 자를 곳이 앞 파일보다 앞섭니다');
  return { cuts: res, errs, nLines: lines.length };
}
module.exports = { analyse, resolveCuts };
if (require.main !== module) return;

/* ---------- 자체 시험: 합성 소스로 분석기가 위험을 잡는지 본다 ---------- */
function selftest() {
  const src = [
    'const A = B + 1;',                        // 0 TDZ
    'function f() { return C; }',              // 1
    'const D = f();',                          // 2 TDZ (f를 불러올 때 C를 읽음)
    'const B = 2;', 'const C = 3;',            // 3 4
    '(function () { return E; })();',          // 5 TDZ (바로 실행되는 함수)
    'const E = 4;',                            // 6
    'setTimeout(() => F, 0);',                 // 7 위험 아님(지연)
    'const F = 5;',                            // 8
    'var G1 = H1; var H1 = 1;',                // 9 10 VAR
    'const X = [1].map(x => Y);',              // 11 콜백(참고)
    'const Y = 1;',                            // 12
    'function usesLater() { return Z; }',      // 13
    'usesLater();',                            // 14 TDZ
    'const Z = 9;',                            // 15
    'const OK1 = 1; const OK2 = OK1 + 1;',     // 16 17 정상
    'function hoisted() { return 1; } const T = hoisted();', // 18 19 정상
    'const loc = () => { const Q = 1; return Q + Q; };',      // 20 지역 이름은 읽는 이름이 아님
  ].join('\n');
  const s = analyse(src, 't'); const defs = new Map(); s.forEach(r => { r.file = 0; for (const n of r.names) defs.set(n, r); });
  const fnSum = new Map(); s.forEach(r => { if (r.call) for (const n of r.names) fnSum.set(n, r); });
  const got = computeHazards(s, defs, fnSum).map(h => h.kind + ':' + h.n).sort().join(',');
  const want = 'TDZ:B,TDZ:C,TDZ:E,TDZ:Z,VAR:H1';
  const names = s.find(r => r.names.includes('loc')).out; const bad = [];
  if (got !== want) bad.push('위험 ' + got + ' (기대 ' + want + ')');
  if (names.L.size || names.D.has('Q')) bad.push('지역 이름 Q를 전역 읽기로 셈');
  const cX = s.find(r => r.names.includes('X')).out; if (!cX.C.has('Y') || cX.L.has('Y')) bad.push('콜백 읽기 구분 실패');
  // 파일이 갈리면 function 선언도 위험
  const s2 = analyse('const a = g();\nfunction g() { return 1; }', 't'); s2[0].file = 0; s2[1].file = 1;
  const d2 = new Map([['g', s2[1]], ['a', s2[0]]]); const f2 = new Map([['g', s2[1]]]);
  const h2 = computeHazards(s2, d2, f2).map(h => h.kind + ':' + h.n).join(',');
  if (h2 !== 'SPLIT:g') bad.push('파일 사이 function 선언 ' + h2);
  console.log(bad.length ? '자체 시험 실패: ' + bad.join(' / ') : '자체 시험 통과 (합성 소스 위험 5 + 파일 사이 function 1을 잡고, 지연 · 지역 이름은 잡지 않음)');
  process.exit(bad.length ? 1 : 0);
}
if (flag('selftest')) selftest();

/* ---------- 실행 ---------- */
const text = P.pageScript(DIR); // 맨 앞 '\n' 포함. 1줄은 <script> 태그가 있던 줄
const L = P.pageLayout(DIR);
const html = L.html; const inline = L.scripts.find(s => s.kind === 'inline');
const htmlLineOffset = inline ? html.slice(0, inline.start).split('\n').length - 1 : 0; // index.html 줄 = 스크립트 줄 + 이 값 (<script> 줄이 스크립트 1줄)
const stm = analyse(text, 'script');
const { cuts, errs, nLines } = resolveCuts(text, PLAN.script);

// data 파일의 이름 (스크립트보다 먼저 읽히는 바깥 값)
const dataDefs = new Map();
for (const s of L.scripts.filter(x => x.kind === 'data')) { for (const r of analyse(s.text, s.src)) for (const n of r.names) dataDefs.set(n, s.src); }

// 문장 → 파일
const fileOfLine = line => { for (let k = cuts.length - 1; k >= 0; k--) if (cuts[k].startLine != null && line >= cuts[k].startLine) return k; return 0; };
stm.forEach(r => { r.file = fileOfLine(r.ls); });
const defs = new Map(); // 이름 → { stmt, kind, file }
for (const r of stm) for (const n of r.names) { if (!defs.has(n) || r.kind === 'function') defs.set(n, r); }
const byName = new Map(); for (const r of stm) for (const n of r.names) { if (!byName.has(n)) byName.set(n, []); byName.get(n).push(r); }
const fnSum = new Map(); for (const r of stm) if (r.call) for (const n of r.names) fnSum.set(n, r);

/* ---------- 위험 ---------- */
function computeHazards(stm, defs, fnSum) {
  const hazards = []; // { sev, kind, r, n, d, via }
  function checkRefs(r, names, via) {
    for (const n of names) {
      const d = defs.get(n); if (!d || d === r) continue;
      if (d.i > r.i) {
        if (d.kind === 'const' || d.kind === 'let' || d.kind === 'class') hazards.push({ sev: 'ERROR', kind: 'TDZ', r, n, d, via });
        else if (d.kind === 'var') hazards.push({ sev: 'WARN', kind: 'VAR', r, n, d, via });
        else if (d.kind === 'function' && d.file > r.file) hazards.push({ sev: 'ERROR', kind: 'SPLIT', r, n, d, via });
      } else if (d.kind === 'function' && d.file > r.file) hazards.push({ sev: 'ERROR', kind: 'SPLIT', r, n, d, via }); // (정의가 앞인데 파일이 뒤: 계획이 순서를 바꾼 경우)
    }
  }
  for (const r of stm) {
    checkRefs(r, r.out.L, null);
    // 불러올 때 부르는 함수를 따라간다 (호출 그래프)
    const seen = new Set(); const q = [...r.out.calls].map(n => [n, [n]]);
    while (q.length) {
      const [n, p] = q.shift(); if (seen.has(n)) continue; seen.add(n);
      const f = fnSum.get(n); if (!f || f === r && p.length === 1) continue;
      checkRefs(r, f.call.L, p.join(' > '));
      for (const c of f.call.calls) if (!seen.has(c)) q.push([c, p.concat(c)]);
    }
  }
  const hk = new Set(); return hazards.filter(h => { const k = [h.kind, h.r.i, h.n, h.via].join('|'); if (hk.has(k)) return false; hk.add(k); return true; });
}
const H = computeHazards(stm, defs, fnSum);

/* ---------- 의존 표 ---------- */
const nf = cuts.length;
const dep = Array.from({ length: nf }, () => Array.from({ length: nf }, () => ({ n: 0, L: 0, names: new Map() }))); // dep[읽는 파일][정의 파일]
const dataUse = Array.from({ length: nf }, () => new Set());
const allRefs = r => [...r.out.L, ...r.out.C, ...r.out.D];
for (const r of stm) {
  for (const mode of ['L', 'C', 'D']) for (const n of r.out[mode]) {
    const d = defs.get(n);
    if (!d) { if (dataDefs.has(n)) dataUse[r.file].add(n); continue; }
    const cell = dep[r.file][d.file]; cell.n++; if (mode === 'L') cell.L++; cell.names.set(n, (cell.names.get(n) || 0) + 1);
  }
}
const sizeOf = k => cuts[k].endLine - cuts[k].startLine + 1;
const stmsOf = k => stm.filter(r => r.file === k);

/* ---------- 출력 ---------- */
const ih = line => line + htmlLineOffset; // 스크립트 줄 → index.html 줄
if (flag('list')) {
  for (const r of stm) console.log(String(ih(r.ls)).padStart(5) + '-' + String(ih(r.le)).padEnd(5) + ' [' + r.file + '] ' + (r.kind || r.type).padEnd(9) + ' ' + r.names.slice(0, 6).join(', ') + (r.names.length > 6 ? ' …(' + r.names.length + ')' : ''));
  process.exit(0);
}
if (flag('names')) {
  for (const n of flagVal('names').split(',')) {
    const ds = byName.get(n) || []; console.log(n + ': ' + (ds.length ? ds.map(d => '정의 ' + ih(d.ls) + '줄 [' + cuts[d.file].file + '] ' + d.kind).join(' / ') : (dataDefs.has(n) ? 'data ' + dataDefs.get(n) : '정의 없음')));
    const users = new Map(); for (const r of stm) if (allRefs(r).includes(n)) users.set(cuts[r.file].file, (users.get(cuts[r.file].file) || 0) + 1);
    console.log('  읽는 파일: ' + ([...users].map(([f, c]) => f + '×' + c).join(', ') || '없음'));
  }
  process.exit(0);
}
if (flag('cuts')) {
  let bad = errs.length; errs.forEach(e => console.log('오류 ' + e));
  for (let k = 0; k < nf; k++) {
    const c = cuts[k]; if (c.startLine == null) continue;
    const inside = stm.find(r => r.ls < c.startLine && r.le >= c.startLine);
    const startsStmt = stm.some(r => r.ls >= c.startLine && (k + 1 >= nf || r.ls <= c.endLine));
    // 자를 곳 바로 앞 줄들이 앞 문장에 붙은 주석인지 확인하지 않는다(주석은 어느 쪽에 있어도 된다)
    if (inside) { bad++; console.log('오류 ' + c.file + ': ' + ih(c.startLine) + '줄은 ' + ih(inside.ls) + '-' + ih(inside.le) + '줄 문장 한가운데입니다'); }
    else console.log('ok   ' + c.file.padEnd(28) + ' index.html ' + String(ih(c.startLine)).padStart(5) + '-' + String(ih(c.endLine)).padEnd(5) + ' (' + sizeOf(k) + '줄)' + (c.from ? '  ' + c.from.slice(0, 40) : '  파일 맨 앞') + (startsStmt ? '' : '  (문장 없음)'));
  }
  console.log(bad ? '자를 곳 오류(스크립트) ' + bad : '스크립트 자를 곳 모두 정상 (' + nf + '개 파일)');
  // CSS: 자르는 줄이 중괄호 · 주석 · 문자열 밖(깊이 0)이어야 한다
  const css = P.pageCss(DIR); const R2 = resolveCuts(css, PLAN.css); let bad2 = R2.errs.length; R2.errs.forEach(e => console.log('오류 ' + e));
  const lineStart = [0]; for (let i = 0; i < css.length; i++) if (css[i] === '\n') lineStart.push(i + 1);
  const depthAt = new Map(); { let d = 0, i = 0, ln = 0; const want = new Set(R2.cuts.map(c => c.startLine).filter(x => x != null));
    while (i <= css.length) {
      while (ln < lineStart.length && lineStart[ln] === i) { if (want.has(ln + 1)) depthAt.set(ln + 1, d); ln++; }
      if (i === css.length) break; const ch = css[i];
      if (ch === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); const stop = e < 0 ? css.length : e + 2; while (i < stop) { i++; while (ln < lineStart.length && lineStart[ln] === i) { if (want.has(ln + 1)) depthAt.set(ln + 1, -1); ln++; } } continue; } // 주석 안에서 시작하는 줄은 -1
      if (ch === '"' || ch === "'") { const q = ch; i++; while (i < css.length && css[i] !== q) { if (css[i] === '\\') i++; i++; } i++; continue; }
      if (ch === '{') d++; else if (ch === '}') d--; i++;
    } }
  const cssLines0 = css.split('\n').length; const cssOffset = (() => { const inl = L.styles.find(s => s.kind === 'inline'); return inl ? html.slice(0, inl.start).split('\n').length - 1 : 0; })();
  for (const c of R2.cuts) {
    if (c.startLine == null) continue;
    const d = depthAt.get(c.startLine);
    if (d !== 0 && c.startLine !== 1) { bad2++; console.log('오류 ' + c.file + ': ' + (c.startLine + cssOffset) + '줄이 중괄호 · 주석 안입니다(깊이 ' + d + ')'); }
    else console.log('ok   ' + c.file.padEnd(34) + ' index.html ' + String(c.startLine + cssOffset).padStart(4) + '-' + String(c.endLine + cssOffset).padEnd(4) + ' (' + (c.endLine - c.startLine + 1) + '줄)' + (c.from ? '  ' + c.from.slice(0, 40) : '  파일 맨 앞'));
  }
  console.log(bad2 ? '자를 곳 오류(CSS) ' + bad2 : 'CSS 자를 곳 모두 정상 (' + R2.cuts.length + '개 파일)');
  process.exit(bad || bad2 ? 1 : 0);
}

if (flag('order')) { // 불러올 때 실행되는 코드가 읽는 다른 파일의 이름: 파일 순서를 바꿀 수 없게 하는 간선
  const E = new Map();
  for (const r of stm) {
    const names = new Set(r.out.L); const seen = new Set(); const q = [...r.out.calls];
    while (q.length) { const n = q.shift(); if (seen.has(n)) continue; seen.add(n); const f = fnSum.get(n); if (!f) continue; f.call.L.forEach(x => names.add(x)); f.call.calls.forEach(c => q.push(c)); }
    for (const n of names) { const d = defs.get(n); if (!d || d.file === r.file) continue; const k = r.file + '>' + d.file; if (!E.has(k)) E.set(k, new Set()); E.get(k).add(n); }
  }
  for (const [k, v] of [...E].sort((a, b) => a[0].split('>')[0] - b[0].split('>')[0])) { const [a, b] = k.split('>').map(Number); console.log(cuts[a].file + '  <-  ' + cuts[b].file + '  (' + v.size + '): ' + [...v].slice(0, 8).join(', ') + (v.size > 8 ? ' …' : '')); }
  process.exit(0);
}
if (flag('defs')) { // 파일마다 정의하는 이름 전부
  for (let k = 0; k < cuts.length; k++) console.log('## ' + cuts[k].file + '\n' + stmsOf(k).flatMap(r => r.names).join(' ') + '\n');
  process.exit(0);
}
const mdOut = !!flag('md');
const lines = [];
const P_ = s => lines.push(s);
const total = stm.length;
if (mdOut) {
  P_('| 파일 | index.html 줄 | 줄 수 | 문장 | 이름 | 큰 이름 | 앞 파일에서 읽음 | 뒤 파일에서 읽음(부를 때) | data |');
  P_('| --- | --- | ---: | ---: | ---: | --- | --- | --- | ---: |');
} else P_('파일'.padEnd(30) + ' index.html 줄      줄 수  문장  이름  앞에서 읽음 / 뒤에서 읽음(부를 때) / data');
for (let k = 0; k < nf; k++) {
  const back = [], fwd = [];
  for (let j = 0; j < nf; j++) { if (j === k) continue; const c = dep[k][j]; if (!c.n) continue; const tag = cuts[j].file.replace(/^js\//, '').replace(/\.js$/, '').replace(/^(\d+)-.*/, '$1') + '×' + c.names.size; (j < k ? back : fwd).push(tag); }
  const nm = stmsOf(k).reduce((s, r) => s + r.names.length, 0);
  const range = ih(cuts[k].startLine) + '-' + ih(cuts[k].endLine);
  const big = stmsOf(k).filter(r => r.names.length).sort((a, b) => (b.le - b.ls) - (a.le - a.ls)).slice(0, 4).map(r => r.names[0]).join(' · ');
  if (mdOut) P_('| `' + cuts[k].file + '` | ' + range + ' | ' + sizeOf(k) + ' | ' + stmsOf(k).length + ' | ' + nm + ' | ' + big + ' | ' + (back.join(' ') || '-') + ' | ' + (fwd.join(' ') || '-') + ' | ' + dataUse[k].size + ' |');
  else P_(cuts[k].file.padEnd(30) + ' ' + range.padEnd(12) + String(sizeOf(k)).padStart(7) + String(stmsOf(k).length).padStart(6) + String(nm).padStart(6) + '  ' + (back.join(' ') || '-') + ' / ' + (fwd.join(' ') || '-') + ' / ' + dataUse[k].size);
}
const detail = flagVal('detail');
if (detail) {
  const k = cuts.findIndex(c => c.file.includes(detail)); if (k < 0) { console.log('그런 파일이 없습니다'); process.exit(2); }
  P_(''); P_('== ' + cuts[k].file + ' 이(가) 다른 파일에서 읽는 이름');
  for (let j = 0; j < nf; j++) if (j !== k && dep[k][j].n) P_('  ' + cuts[j].file + ': ' + [...dep[k][j].names.keys()].join(', '));
  P_('== 다른 파일이 ' + cuts[k].file + ' 에서 읽는 이름');
  for (let j = 0; j < nf; j++) if (j !== k && dep[j][k].n) P_('  ' + cuts[j].file + ' ← ' + [...dep[j][k].names.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => n + (c > 1 ? '×' + c : '')).join(', '));
}
if (!mdOut) {
  P_(''); P_('위험 (불러올 때 실행되는 코드가 뒤에 있는 것을 읽는가): 오류 ' + H.filter(h => h.sev === 'ERROR').length + ', 경고 ' + H.filter(h => h.sev === 'WARN').length);
  for (const h of H) P_('  ' + h.sev + ' ' + h.kind + ' ' + ih(h.r.ls) + '줄 [' + cuts[h.r.file].file + '] ' + h.n + ' → ' + ih(h.d.ls) + '줄 [' + cuts[h.d.file].file + '] ' + h.d.kind + (h.via ? '  (부르는 길 ' + h.via + ')' : ''));
  const cCount = stm.reduce((s, r) => s + [...r.out.C].filter(n => { const d = defs.get(n); return d && d.i > r.i && d.kind !== 'function'; }).length, 0);
  P_('참고: 콜백 · 지연 호출(setTimeout 등)로 뒤 const를 읽는 곳 ' + cCount + '곳 (불러온 뒤 일어나므로 위험 아님)');
  const lateFn = []; for (const r of stm) for (const n of r.out.D) { const d = defs.get(n); if (d && d.file > r.file) lateFn.push(n); }
  P_('참고: 앞 파일의 함수 안에서 뒤 파일의 이름을 읽는 곳 ' + lateFn.length + '곳 (부를 때만 일어남, 불러온 뒤라 안전)');
  errs.forEach(e => P_('계획 오류: ' + e));
}
console.log(lines.join('\n'));
if (mdOut) process.exit(0);
process.exit(H.some(h => h.sev === 'ERROR') || errs.length ? 1 : 0);
