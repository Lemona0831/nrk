'use strict';
/* 직업 값 띠 기준 옮기기 (0.8.0 M7-2, 10월 23일): 직업 하나의 스킬 값(skScore E)을 한 배수 k로 통째로 옮긴다.
   E에는 규칙 · 배율처럼 숫자 배수를 받지 않는 몫이 있어, 모든 칸에 같은 숫자 배수를 곱하면 칸 사이 비율(값 띠)이 틀어진다.
   그래서 스킬마다 "양" 숫자에 곱할 배수 f를 따로 찾아(이분법) 그 스킬의 E가 k배가 되게 한다. 칸마다의 값 띠는 직업 비용 2 평균에 대한 비율이라 그대로다.
   양 숫자 = 피해 · 보호막 · 붕괴 · 중독, 적에게 거는 출혈 · 화상(st · imbue)의 n. 문장(txt)을 가진 효과, 나에게 거는 대가(meSt), 지속 · 배율은 그대로.
   - data/skills.js의 그 직업 스킬 줄과 data/atree.js의 그 직업 변형(붙는 스킬의 f): 같은 효과의 n, 변형 문장 속 "피해 A → B" · "출혈 +N" 같은 숫자(대가: 뒤는 그대로)와 뒤 조사
   쓰기: node tools/class-scale.js <직업> <k> [--dry] */
process.env.DGDIR = process.env.DGDIR || '.';
const fs = require('fs'), path = require('path');
const [CLS, MUL] = process.argv.slice(2); const DRY = process.argv.includes('--dry'); const K = +MUL;
if (!CLS || !(K > 0)) { console.error('쓰기: node tools/class-scale.js <직업> <k> [--dry]'); process.exit(2); }
const D = require('./dgqa.js'), E = D.G0, SC = D.run_('skScore'), SKS = D.run_('SKILLS2');
const AMT = ['dmg', 'ward', 'brk', 'poison'], DOT = ['bleed', 'ignite'];
const WORD = { 피해: ['dmg'], 보호막: ['ward'], 붕괴: ['brk'], 중독: ['poison'], 출혈: ['bleed'], 화상: ['ignite'] };
const amt = e => typeof e.n === 'number' && !e.txt && (AMT.includes(e.k) || (['st', 'imbue'].includes(e.k) && DOT.includes(e.s)));
/* 데이터 글의 효과 하나: { k: 'dmg', n: 8 } · { k: 'st', s: 'bleed', n: 4 } 꼴(뒤에 다른 칸이 붙어도 됨, txt가 있으면 그대로) */
const FXRE = /(\{ k: '(dmg|ward|brk|poison|st|imbue)'(?:, s: '(\w+)')?, n: )(\d+)([^{}]*\})/g;
const fxOk = (k, s, rest) => !/txt:/.test(rest) && (AMT.includes(k) || DOT.includes(s));
/* 스킬마다 배수 f: 반올림한 숫자에 비용 3 · 4 볼록 배율(ysConvexApply: s._fx0 · s.ysMul)까지 그대로 따라 잰 E가 목표에 가장 가깝게. 트리 칸이면 그 칸 비용으로 잰다(tree-check와 같음)
   목표 = 새 직업 기준(갈래 비용 2 평균) × 옛 비. 옛 비가 띠 끝 1.5% 안이면 그만큼 안쪽으로(반올림으로 띠를 벗어나지 않게). 새 기준은 맞춘 값으로 다시 재어 네 번 되풀이
   (숫자 배수를 받지 않는 고유 규칙 칸은 k배가 된다고 보고 기준을 잰다. 그 칸은 상수로 따로 맞춘다) */
const A = E.atBuild(CLS), ysOf = id => (A.nodes[id] || {}).ys, sc = (n, f) => Math.max(1, Math.round(n * f));
const cvx = (k, n, m) => !(m > 1) ? n : ['dmg', 'brk', 'poison'].includes(k) ? Math.round(n * m) : k === 'st' ? Math.max(n, Math.round(n * m)) : n;
const Eof = (id, f) => { const s = E.SK2[id], m = s.ysMul || 1, base = s._fx0 || s.fx; const o = Object.assign({}, s, { fx: base.map((e, i) => amt(e) ? Object.assign({}, s.fx[i], { n: f === 1 ? s.fx[i].n : cvx(e.k, sc(e.n, f), m) }) : s.fx[i]) }); if (ysOf(id) != null) o.ys = ysOf(id); return SC(o).E; };
const BAND = { 1: [0.5, 0.65], 2: [0.85, 1.15], 3: [1.5, 1.8], 4: [2.2, 2.6] }, EX = ['sb_bolt', 'w_pray'], BD = ['AB', 'BC', 'CA'], MG = 0.015;
const TWO = Object.values(A.nodes).filter(x => x.kind === 'skill' && x.ys === 2 && ['A', 'B', 'C'].includes(x.sec) && !EX.includes(x.id)).map(x => x.id);
const bandOf = id => { const x = A.nodes[id]; if (!x || x.kind !== 'skill' || EX.includes(id) || !BAND[x.ys]) return null; const B = BAND[x.ys].slice(); if (BD.includes(x.sec) && x.ring === 3 && x.ys === 4) B[1] *= 1.1; return B; };
const F = {}, E0 = {}, skip = [], clamp = [];
for (const s0 of SKS[CLS] || []) { const id = s0.id, s = E.SK2[id]; E0[id] = s ? Eof(id, 1) : 0; if (!s || !s.fx.some(amt)) skip.push(id); else F[id] = K; }
const avg = g => TWO.reduce((a, id) => a + g(id), 0) / TWO.length, avg0 = avg(id => E0[id]); let avgN = K * avg0;
const want = id => { const B = bandOf(id), r = E0[id] / avg0; return avgN * (B ? Math.min(Math.max(r, B[0] * (1 + MG)), B[1] * (1 - MG)) : K * r / (avgN / avg0)); };
for (let it = 0; it < 4; it++) { for (const id in F) { const w = want(id), err = f => Math.abs(Eof(id, f) / w - 1); let lo = 0.2, hi = 4; if (it === 0 && (Eof(id, hi) < w || Eof(id, lo) > w)) clamp.push(id); if (clamp.includes(id)) { F[id] = K; continue; } // 값 대부분이 고유 규칙인 칸: 숫자는 직업 배수 그대로, 띠는 고유 값으로 따로
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Eof(id, m) < w) lo = m; else hi = m; } let f = (lo + hi) / 2;
    for (let g = f * 0.85; g <= f * 1.15; g += f * 0.002) if (err(g) < err(f) - 1e-9) f = g; F[id] = f; }
  avgN = avg(id => F[id] ? Eof(id, F[id]) : K * E0[id]); }
/* 숫자 뒤 조사: 끝자리를 읽은 소리(영 일 이 삼 사 오 육 칠 팔 구, 0으로 끝나면 십 · 백)로 받침을 본다. ㄹ 받침(1 · 7 · 8)은 '로' */
const josa = (n, j) => { const d = n % 10, hard = [0, 1, 3, 6, 7, 8].includes(d), rieul = [1, 7, 8].includes(d);
  return ({ 을: hard ? '을' : '를', 를: hard ? '을' : '를', 이: hard ? '이' : '가', 가: hard ? '이' : '가', 은: hard ? '은' : '는', 는: hard ? '은' : '는', 으로: hard && !rieul ? '으로' : '로', 로: hard && !rieul ? '으로' : '로' })[j]; };
/* 키 다음의 { … } 또는 [ … ] 덩어리 끝(문자열 안의 괄호는 건너뛴다) */
function blockEnd(s, i) { const open = s[i], close = open === '{' ? '}' : ']'; let d = 0, q = null; for (let j = i; j < s.length; j++) { const ch = s[j]; if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; } if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; } if (ch === open) d++; else if (ch === close) { d--; if (!d) return j + 1; } } throw new Error('덩어리 끝 못 찾음'); }
function block(s, re) { const m = re.exec(s); if (!m) throw new Error('못 찾음 ' + re); const i = m.index + m[0].length - 1; return [i, blockEnd(s, i)]; }
let nSk = 0, nVar = 0, nTxt = 0; const miss = new Set();
const repFx = (t, f, cnt) => t.replace(FXRE, (a, p, k, s, n, rest) => fxOk(k, s, rest) ? (cnt(), p + sc(+n, f) + rest) : a);
const lines = (t, fn) => t.split('\n').map(l => { const cr = l.endsWith('\r') ? '\r' : ''; return fn(cr ? l.slice(0, -1) : l) + cr; }).join('\n');
const SKF = path.join(__dirname, '..', 'data', 'skills.js'), ATF = path.join(__dirname, '..', 'data', 'atree.js'); const SK0 = fs.readFileSync(SKF, 'utf8'), AT0 = fs.readFileSync(ATF, 'utf8');
const out = Object.keys(F).filter(id => bandOf(id)).filter(id => { const B = bandOf(id), v = Eof(id, F[id]) / avgN; return v < B[0] - 1e-9 || v > B[1] + 1e-9; });
console.log(`  직업 기준 ${avg0.toFixed(1)} → ${avgN.toFixed(1)} (× ${(avgN / avg0).toFixed(3)}, 고유 칸이 k배라고 볼 때)${out.length ? ' · 띠 밖 ' + out.join(', ') : ''}`);
write();
function write() { let sk = SK0, at = AT0;
// skills.js: 스킬 한 줄씩(줄의 id로 배수를 고른다)
{ const [a, z] = block(sk, new RegExp('\\n  ' + CLS + ': \\['));
  sk = sk.slice(0, a) + lines(sk.slice(a, z), l => { const m = /\{ id: '([a-z0-9_]+)'/.exec(l); return m && F[m[1]] ? repFx(l, F[m[1]], () => nSk++) : l; }) + sk.slice(z); }
// atree.js: 그 직업 덩어리 안의 vars. 변형은 줄마다 하나, 붙는 스킬은 바로 위 "스킬id: [" 또는 변이의 on
{ const [a, z] = block(at, new RegExp('\\n  ' + CLS + ': \\{')); const cls = at.slice(a, z); const vi = cls.search(/\n\s+vars: \{/); if (vi < 0) throw new Error('vars 못 찾음');
  const va = vi + cls.slice(vi).indexOf('{'), vEnd = blockEnd(cls, va); let cur = null;
  const vars = lines(cls.slice(va, vEnd), l => { const h = /^\s+([a-z0-9_]+): \[/.exec(l); if (h) cur = h[1];
    return l.replace(/\['([a-z0-9_]+)', '([^']*)', '([^']*)', (\{.*?\}), (\[.*)$/, (all, id, nm, txt, mod, rest) => {
      const kinds = new Set(); mod.replace(FXRE, (x, p, k, s, n, r) => { if (fxOk(k, s, r)) kinds.add(AMT.includes(k) ? k : s); return x; }); if (!kinds.size) return all;
      const on = (/on: '([a-z0-9_]+)'/.exec(rest) || [])[1] || cur, f = F[on]; if (!f) { miss.add(id + '→' + on); return all; }
      const cut = txt.search(/대가:|나에게/), head = cut < 0 ? txt : txt.slice(0, cut), tail = cut < 0 ? '' : txt.slice(cut);
      const head2 = head.replace(/(피해|보호막|붕괴|중독|출혈|화상) (\+?)(\d+)(?![\d%])( → (\d+)(?![\d%]))?(을|를|이|가|은|는|으로|로)?/g, (w, word, plus, a1, arr, b1, j) => {
        if (!WORD[word].some(k => kinds.has(k))) return w; nTxt++; const x = sc(+a1, f), y = arr ? sc(+b1, f) : null; return word + ' ' + plus + x + (arr ? ' → ' + y : '') + (j ? josa(arr ? y : x, j) : ''); });
      return `['${id}', '${nm}', '${head2 + tail}', ${repFx(mod, f, () => nVar++)}, ${rest}`; }); });
  at = at.slice(0, a) + cls.slice(0, va) + vars + cls.slice(vEnd) + at.slice(z); }
if (!DRY) { fs.writeFileSync(SKF, sk); fs.writeFileSync(ATF, at); } }
const fs_ = Object.values(F); console.log(`${CLS} 값 × ${K}: 스킬 ${fs_.length}개 숫자 ${nSk} · 변형 숫자 ${nVar} · 변형 문장 숫자 ${nTxt} · 숫자 배수 ${Math.min(...fs_).toFixed(2)}–${Math.max(...fs_).toFixed(2)}${DRY ? ' (--dry: 쓰지 않음)' : ''}`);
if (skip.length) console.log('  양 숫자 없어 그대로: ' + skip.join(', ')); if (clamp.length) console.log('  숫자만으로 못 맞춤(숫자는 k배 그대로, 고유 값으로 따로 맞출 것): ' + clamp.join(', ')); if (miss.size) console.log('  붙는 스킬을 못 찾은 변형: ' + [...miss].join(', '));
