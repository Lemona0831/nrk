'use strict';
/* 측정 기록 점검 (10월 17일 측정 도구 보완, docs/검증/0.8.0-측정도구-보완-2026-10-17.md)
   측정 묶음(던전 테스터 결과 JSON 배열 · 하네스 JSONL)을 숫자로 쓰기 전에 다음을 본다. 문제가 하나라도 있으면 끝 코드 1.
   1) 실패 · 중단: 전투 예외, 판 밖 예외, 300행동 한도(끝나지 않은 전투, 예: 예전 매복 300행동 멈춤), 240걸음 한도(끝나지 않은 판), 방 없음, 창 한도
   2) 기대 대비 판 수: 기대 목록(<결과>.manifest.json 또는 --expect)과 견줘 빠진 시드 · 기대 밖 판. 묶음 = (변형, 시작 챕터, 챕터 수, 직업, 성향)
   3) 중복: 같은 묶음 · 같은 시드가 두 줄 이상(내용이 같은지도 적는다)
   4) 섞인 개정: 한 묶음 안에 게임 · 도구 지문(meta.rev)이 둘 이상, 같은 변형 안에 행동을 바꾸는 환경 변수(meta.env)가 둘 이상
   5) 불가능한 값: 결과 · 레벨 · 층 · 챕터 · 행동 수의 범위, 챕터 끝 기록의 순서, 전투 기록(생명력 0–100, 진 전투는 마지막), 꼬리표와 줄의 값이 다름
   6) 꼬리표 없음: meta(지문 · 시드 · 성향 · 직업 · 시작 챕터 · 변형)가 없는 줄
   사용:
     node tools/measure-validate.js <결과 파일…> [--manifest m.json …] [--expect "pk=careful,expert;build=a,b;seeds=5000+13*i,i<10;variant=base;from=1;chapters=1"] [--json 보고.json]
     node tools/measure-validate.js --same <A 파일들 쉼표> <B 파일들 쉼표> [--ignore meta,fails]   (같은 시드 두 번: 판 기록 전체가 같은지)
   결과 파일 옆의 <파일>.manifest.json은 저절로 읽는다 */
const fs = require('fs'), path = require('path');
const MM = require('./measure-meta.js');
const FAILK = { exception: '전투 예외', crash: '판 밖 예외', actcap: '300행동 한도(끝나지 않은 전투)', stepcap: '240걸음 한도(끝나지 않은 판)', noroom: '방 없음', sheetcap: '창 한도', other: '기타 이상' };

function readRows(file) {
  const txt = fs.readFileSync(file, 'utf8'); const t = txt.trim(); if (!t) return [];
  if (t[0] === '[') return JSON.parse(t);
  if (t[0] === '{' && !t.includes('\n')) { const o = JSON.parse(t); return Array.isArray(o.runs) ? o.runs : [o]; }
  if (t[0] === '{') { try { const o = JSON.parse(t); if (Array.isArray(o.runs)) return o.runs; } catch (e) { /* JSONL */ } }
  const out = []; t.split('\n').forEach((ln, i) => { if (!ln.trim()) return; try { out.push(JSON.parse(ln)); } catch (e) { out.push({ __bad: '줄 ' + (i + 1) + ' JSON 아님: ' + e.message }); } }); return out;
}
const isInt = x => typeof x === 'number' && Number.isInteger(x);
const num = x => typeof x === 'number' && Number.isFinite(x);
const gkey = o => [o.variant, o.from, o.chapters, o.build, o.pk].join('|');
const gname = k => { const [v, f, c, b, p] = k.split('|'); return `${b}/${p}` + (v !== 'base' ? ` [${v}]` : '') + ` ${f}챕터 시작` + (+c > 1 ? `·${c}챕터까지` : ''); };

/* 판 한 줄의 실패 · 중단 */
function failsOf(r) {
  const out = [];
  for (const f of r.fails || []) out.push({ k: FAILK[f.k] ? f.k : 'other', d: f });
  if (r.res === 'crash' && !out.some(x => x.k === 'crash')) out.push({ k: 'crash', d: {} });
  if (!r.fails) for (const b of r.bugs || []) { // 꼬리표 전 기록: 글로만 남은 이상
    const s = String(b); const k = /^예외/.test(s) ? 'exception' : /300행동/.test(s) ? 'actcap' : /240걸음/.test(s) ? 'stepcap' : /방이 없음/.test(s) ? 'noroom' : /창 40번/.test(s) ? 'sheetcap' : /판 밖 예외/.test(s) ? 'crash' : 'other';
    out.push({ k, d: { msg: s } }); }
  return out;
}
/* 판 한 줄의 불가능한 값 */
function impossibleOf(r, m, warn) {
  const bad = []; const B = s => bad.push(s); const W = s => { if (warn) warn.push(s); };
  if (!['clear', 'lose', 'crash'].includes(r.res)) B('결과 ' + JSON.stringify(r.res));
  if (r.res !== 'crash') {
    if (!isInt(r.lv) || r.lv < 1 || r.lv > 40) B('레벨 ' + JSON.stringify(r.lv));
    if (!isInt(r.floor) || r.floor < 0 || r.floor > 40) B('층 ' + JSON.stringify(r.floor));
    if (r.ch != null && (!isInt(r.ch) || r.ch < 1 || r.ch > 3)) B('챕터 ' + JSON.stringify(r.ch));
    if (m && r.ch != null && r.ch < (m.from || 1)) B('챕터 ' + r.ch + ' < 시작 챕터 ' + m.from);
    if (m && r.res === 'clear' && r.ch != null && r.ch < Math.max(m.from || 1, m.chapters || 1)) B('완주인데 챕터 ' + r.ch + ' < ' + Math.max(m.from || 1, m.chapters || 1));
    if (r.acts != null && (!isInt(r.acts) || r.acts < 0)) B('행동 수 ' + JSON.stringify(r.acts));
    if (r.steps != null && (!isInt(r.steps) || r.steps < 0 || r.steps > 240)) B('걸음 ' + JSON.stringify(r.steps));
  }
  const chs = (r.chs || []).map((c, i) => typeof c === 'number' ? { ch: c, lv: (r.chLv || [])[i] } : c); for (let i = 0; i < chs.length; i++) { const c = chs[i]; if (!isInt(c.ch) || (i && c.ch <= chs[i - 1].ch)) B('챕터 끝 기록 순서 ' + JSON.stringify(chs.map(x => x.ch))); if (num(c.lv) && i && c.lv < chs[i - 1].lv) B('챕터 끝 레벨이 줄어듦 ' + JSON.stringify(chs.map(x => x.lv))); if (num(c.lv) && num(r.lv) && c.lv > r.lv) B('챕터 끝 레벨 ' + c.lv + ' > 끝 레벨 ' + r.lv); }
  const F = r.fights || []; F.forEach((f, i) => {
    if (f.res != null && !['win', 'lose', 'flee'].includes(f.res)) B('전투 ' + i + ' 결과 ' + JSON.stringify(f.res));
    for (const k of ['hpIn', 'hpOut']) if (f[k] != null && (!num(f[k]) || f[k] < 0 || f[k] > 100)) {
      if (k === 'hpOut' && num(f[k]) && f[k] < 0 && f.res === 'lose' && i === F.length - 1) W('마지막(진) 전투 ' + i + ' 끝 생명력 ' + f[k] + '% — 쓰러진 뒤에도 피해가 들어간 게임 쪽 이상(판 결과에는 영향 없음)');
      else B('전투 ' + i + ' ' + k + ' ' + JSON.stringify(f[k])); }
    for (const k of ['rounds', 'rnd', 'acts']) if (f[k] != null && (!num(f[k]) || f[k] < 0)) B('전투 ' + i + ' ' + k + ' ' + JSON.stringify(f[k]));
    if (f.res === 'lose' && i !== F.length - 1) B('진 전투(' + i + ') 뒤에 전투가 더 있음'); // 쓰러지면 판이 끝난다(battleContinue → dead)
  });
  if (F.length && r.res === 'clear' && F[F.length - 1].res === 'lose') B('완주인데 마지막 전투를 짐');
  if (m) { for (const k of ['seed', 'pk', 'build']) if (r[k] != null && m[k] != null && r[k] !== m[k]) B('꼬리표 ' + k + ' ' + m[k] + ' ≠ 줄 ' + r[k]); }
  return [...new Set(bad)];
}
function parseExpect(spec) {
  const o = {}; for (const part of String(spec).split(';')) { const i = part.indexOf('='); if (i > 0) o[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  const seeds = MM.seedList(o.seeds || ''); const groups = []; for (const pk of (o.pk || '').split(',').filter(Boolean)) for (const build of (o.build || '').split(',').filter(Boolean)) groups.push({ pk, build, seeds });
  return { tool: 'expect', variant: o.variant || 'base', from: +(o.from || 1), chapters: +(o.chapters || 1), groups };
}
/* inputs: [{ file, rows? }], opts: { manifests: [...], noAutoManifest } */
function validate(inputs, opts) {
  opts = opts || {}; const manifests = (opts.manifests || []).slice();
  const rows = [];
  for (const inp of inputs) {
    const rs = inp.rows || readRows(inp.file); rs.forEach((r, i) => rows.push({ r, file: inp.file, i }));
    if (!opts.noAutoManifest && inp.file && !inp.rows && fs.existsSync(inp.file + '.manifest.json')) manifests.push(JSON.parse(fs.readFileSync(inp.file + '.manifest.json', 'utf8')));
  }
  const rep = { files: inputs.length, rows: rows.length, problems: 0, warn: [], noMeta: [], bad: [], fails: [], impossible: [], dup: [], missing: [], extra: [], revs: {}, envs: {}, groups: {}, expected: null, mixed: [] };
  const seen = new Map();
  for (const x of rows) {
    const r = x.r; const where = path.basename(x.file || '?') + '#' + (x.i + 1);
    if (r.__bad) { rep.bad.push(where + ' ' + r.__bad); continue; }
    const m = r.meta || null;
    const miss = !m ? ['meta'] : ['rev', 'seed', 'pk', 'build', 'from', 'variant'].filter(k => m[k] == null);
    if (miss.length) rep.noMeta.push(where + ' (' + (r.build || '?') + '/' + (r.pk || '?') + '/' + (r.seed != null ? r.seed : '?') + ') 없음: ' + miss.join(', '));
    const o = { variant: m && m.variant || 'base', from: m && m.from || 1, chapters: m && m.chapters || 1, build: m ? m.build : r.build, pk: m ? m.pk : r.pk, seed: m ? m.seed : r.seed };
    const g = gkey(o); const G = rep.groups[g] = rep.groups[g] || { n: 0, seeds: [], fail: 0 }; G.n++; G.seeds.push(o.seed);
    const rv = m && m.rev || '(없음)'; rep.revs[rv] = (rep.revs[rv] || 0) + 1; (G.revs = G.revs || {})[rv] = (G.revs[rv] || 0) + 1;
    const ev = o.variant + ' ' + JSON.stringify(m && m.env || {}); rep.envs[ev] = (rep.envs[ev] || 0) + 1;
    for (const f of failsOf(r)) { rep.fails.push({ where, g, seed: o.seed, k: f.k, d: f.d }); G.fail++; }
    const w0 = []; for (const s of impossibleOf(r, m, w0)) rep.impossible.push(where + ' ' + gname(g) + ' 시드 ' + o.seed + ': ' + s);
    for (const s of w0) rep.warn.push(where + ' ' + gname(g) + ' 시드 ' + o.seed + ': ' + s);
    const dk = g + '|' + o.seed; const body = JSON.stringify(r, (k, v) => k === 'ms' ? undefined : v);
    if (seen.has(dk)) { const p = seen.get(dk); rep.dup.push(gname(g) + ' 시드 ' + o.seed + ': ' + p.where + ' · ' + where + (p.body === body ? ' (내용 같음)' : ' (내용 다름)')); } else seen.set(dk, { where, body });
  }
  // 섞인 개정: 묶음 안의 지문 · 변형 안의 환경 변수
  if (Object.keys(rep.revs).length > 1) rep.mixed.push('게임 · 도구 지문이 ' + Object.keys(rep.revs).length + '가지: ' + Object.entries(rep.revs).map(([k, n]) => k + ' ' + n + '판').join(' · '));
  const byVar = {}; for (const k of Object.keys(rep.envs)) { const v = k.split(' ')[0]; (byVar[v] = byVar[v] || []).push(k.slice(v.length + 1) + ' ' + rep.envs[k] + '판'); }
  for (const v in byVar) if (byVar[v].length > 1) rep.mixed.push('변형 ' + v + ' 안에 환경 변수 ' + byVar[v].length + '가지: ' + byVar[v].join(' · '));
  // 기대 대비
  if (manifests.length) {
    const want = new Map(); for (const M of manifests) for (const gr of M.groups || []) { const g = gkey({ variant: M.variant || 'base', from: M.from || 1, chapters: M.chapters || 1, build: gr.build, pk: gr.pk }); for (const s of gr.seeds) want.set(g + '|' + s, g); if (M.rev && rep.revs[M.rev] == null && M.tool !== 'expect') rep.mixed.push('기대 목록의 지문 ' + M.rev + '와 같은 판이 없음'); }
    const have = new Set(seen.keys()); const missBy = {};
    for (const [k, g] of want) if (!have.has(k)) (missBy[g] = missBy[g] || []).push(+k.split('|').pop());
    for (const g in missBy) rep.missing.push(gname(g) + ': ' + missBy[g].length + '판 빠짐 (시드 ' + missBy[g].slice(0, 12).join(', ') + (missBy[g].length > 12 ? ', …' : '') + ')');
    const extraBy = {}; for (const k of have) if (!want.has(k)) { const g = k.split('|').slice(0, 5).join('|'); (extraBy[g] = extraBy[g] || []).push(+k.split('|').pop()); }
    for (const g in extraBy) rep.extra.push(gname(g) + ': 기대 밖 ' + extraBy[g].length + '판 (시드 ' + extraBy[g].slice(0, 12).join(', ') + (extraBy[g].length > 12 ? ', …' : '') + ')');
    rep.expected = want.size; rep.expectedGroups = new Set(want.values()).size;
  }
  rep.problems = rep.bad.length + rep.noMeta.length + rep.fails.length + rep.impossible.length + rep.dup.length + rep.missing.length + rep.extra.length + rep.mixed.length;
  return rep;
}
function summaryText(rep, o) {
  o = o || {}; const L = []; const cnt = {}; for (const f of rep.fails) cnt[f.k] = (cnt[f.k] || 0) + 1;
  const missN = rep.missing.reduce((a, s) => a + +(/: (\d+)판 빠짐/.exec(s) || [0, 0])[1], 0), extraN = rep.extra.reduce((a, s) => a + +(/기대 밖 (\d+)판/.exec(s) || [0, 0])[1], 0);
  L.push(`측정 기록 점검: 파일 ${rep.files} · 판 ${rep.rows} · 묶음 ${Object.keys(rep.groups).length}`);
  L.push(`  개정(게임.도구 지문): ${Object.keys(rep.revs).length}가지 — ${Object.entries(rep.revs).map(([k, n]) => k + ' ' + n + '판').join(' · ')}`);
  L.push(`  판 수: ${rep.expected != null ? '기대 ' + rep.expected + ' · ' : '기대 목록 없음 · '}실제 ${rep.rows} · 빠짐 ${missN} · 기대 밖 ${extraN} · 중복 ${rep.dup.length}`);
  L.push(`  실패 · 중단: ${rep.fails.length}` + (rep.fails.length ? ' (' + Object.entries(cnt).map(([k, n]) => FAILK[k] + ' ' + n).join(' · ') + ')' : ''));
  L.push(`  불가능한 값: ${rep.impossible.length} · 꼬리표 없음: ${rep.noMeta.length} · 섞인 개정 · 조건: ${rep.mixed.length}` + (rep.bad.length ? ` · 읽지 못한 줄: ${rep.bad.length}` : ''));
  if (rep.warn.length) L.push(`  주의(문제로 세지 않음): ${rep.warn.length}` + (o.short ? '' : rep.warn.slice(0, 5).map(s => '\n   ' + s).join('') + (rep.warn.length > 5 ? '\n   … ' + (rep.warn.length - 5) + '건 더' : '')));
  L.push(rep.problems ? `결과: 문제 ${rep.problems}건 — 이 묶음의 숫자를 쓰기 전에 아래를 확인하세요` : '결과: 통과 (실패 · 누락 · 중복 · 섞인 개정 · 불가능한 값 없음)');
  if (rep.problems && !o.short) {
    const sec = (t, a) => { if (!a.length) return; L.push('— ' + t + ` (${a.length})`); for (const s of a.slice(0, o.max || 15)) L.push('   ' + s); if (a.length > (o.max || 15)) L.push('   … ' + (a.length - (o.max || 15)) + '건 더'); };
    sec('실패 · 중단', rep.fails.map(f => `${f.where} ${gname(f.g)} 시드 ${f.seed}: ${FAILK[f.k]}` + (f.d && (f.d.msg || f.d.room != null) ? ' — ' + (f.d.msg || ('방 ' + f.d.room + (f.d.t ? ' ' + f.d.t : '') + (f.d.ch ? ' · ' + f.d.ch + '챕터' : '') + (f.d.acted != null ? ' · 받아들여진 행동 ' + f.d.acted + (f.d.acted < 100 ? '(멈춤)' : '') : ''))) : '')));
    sec('빠진 판', rep.missing); sec('기대 밖 판', rep.extra); sec('중복', rep.dup); sec('섞인 개정 · 조건', rep.mixed); sec('불가능한 값', rep.impossible); sec('꼬리표 없음', rep.noMeta); sec('읽지 못한 줄', rep.bad);
  } else if (rep.problems && o.short) L.push('  자세히: node tools/measure-validate.js <결과 파일>');
  return L.join('\n');
}
/* 같은 시드 두 번 (재현성 · 전후 비교): 열쇠 = 시작 챕터 · 챕터 수 · 직업 · 성향 + 시드(변형 이름은 보지 않는다: 보완 전후처럼 이름이 다른 두 묶음을 견준다),
   판 기록 전체(ms와 --ignore 칸 빼고)가 같은지 */
function same(listA, listB, ignore) {
  const ig = new Set(['ms'].concat(ignore || []));
  const load = L => { const m = new Map(); for (const f of L) for (const r of readRows(f)) { const me = r.meta || {}; const k = gkey({ variant: '*', from: me.from || 1, chapters: me.chapters || 1, build: me.build || r.build, pk: me.pk || r.pk }) + '|' + (me.seed != null ? me.seed : r.seed); m.set(k, JSON.stringify(r, (kk, v) => ig.has(kk) ? undefined : v)); } return m; };
  const A = load(listA), B = load(listB); const keys = [...A.keys()].filter(k => B.has(k)); const diff = keys.filter(k => A.get(k) !== B.get(k));
  const by = {}; for (const k of keys) { const b = k.split('|')[3]; by[b] = by[b] || { n: 0, same: 0 }; by[b].n++; if (A.get(k) === B.get(k)) by[b].same++; }
  return { n: keys.length, onlyA: A.size - keys.length, onlyB: B.size - keys.length, same: keys.length - diff.length, by, diff: diff.map(k => gname(k.split('|').slice(0, 5).join('|')).replace(' [*]', '') + ' 시드 ' + k.split('|').pop()) };
}
module.exports = { validate, summaryText, same, readRows, failsOf, impossibleOf, parseExpect, FAILK };

if (require.main === module) {
  const a = process.argv.slice(2); const opt = k => { const i = a.indexOf(k); if (i < 0) return null; const v = a[i + 1]; a.splice(i, 2); return v; };
  if (a[0] === '--same') {
    const ign = (opt('--ignore') || '').split(',').filter(Boolean); const R = same(a[1].split(','), a[2].split(','), ign);
    console.log(`같은 시드 두 번: 짝 ${R.n} (A만 ${R.onlyA}, B만 ${R.onlyB}) · 판 기록 전체가 같음 ${R.same}/${R.n}${R.n ? ' (' + (100 * R.same / R.n).toFixed(1) + '%)' : ''}` + (ign.length ? ` · 뺀 칸: ${ign.join(', ')}` : ''));
    console.log('  직업마다 같음: ' + Object.entries(R.by).map(([b, x]) => b + ' ' + x.same + '/' + x.n).join(' · '));
    if (R.diff.length) console.log('  다른 판: ' + R.diff.slice(0, 20).join(' · ') + (R.diff.length > 20 ? ' …' : ''));
    process.exit(R.diff.length || R.onlyA || R.onlyB || !R.n ? 1 : 0);
  }
  const mans = []; let m; while ((m = opt('--manifest'))) mans.push(JSON.parse(fs.readFileSync(m, 'utf8')));
  let e; while ((e = opt('--expect'))) mans.push(parseExpect(e));
  const jout = opt('--json');
  if (!a.length) { console.error('사용: node tools/measure-validate.js <결과 파일…> [--manifest m.json] [--expect "pk=…;build=…;seeds=5000+13*i,i<10"] [--json 보고.json] | --same <A,…> <B,…> [--ignore 칸,…]'); process.exit(2); }
  const rep = validate(a.map(file => ({ file })), { manifests: mans });
  console.log(summaryText(rep));
  if (jout) fs.writeFileSync(jout, JSON.stringify(rep, null, 1));
  process.exit(rep.problems ? 1 : 0);
}
