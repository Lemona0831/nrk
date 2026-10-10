// 직업 기획서와 06a2 코드의 일치 점검 (완료 조건 1, 10월 10일, 0.6a.2-95)
//   node tools/classaudit.js [직업 ...]  직업 인자를 주면 그 직업만(없으면 아홉 모두). 코드 키(assassin) · 해금 번호(H1) 모두 된다
//   node tools/classaudit.js --detail    어긋난 칸을 모두 풀어 쓴다(기본은 앞의 몇 줄)
//   node tools/classaudit.js --fix       스킬 표의 칸(이름 · 쿨타임 · 빠르기 · 효과 · 설명 숫자 · 점수)을 코드 값으로 고쳐 쓴다(표 밖 서술은 건드리지 않는다)
//   node tools/classaudit.js --json      결과를 JSON으로 낸다(보고서 표 만들기용)
// 대조하는 것
//   1 필수 절 A~F와 하위 요소(docs/목표-1-3챕터.md 3단계)      2 문서 트리 표의 스킬 id 집합 ↔ SKILLS2
//   3 표의 이름 · 줄 · 갈래 · 기둥 · 쿨타임 · 빠르기 · 🔄      4 효과(fx) 칸이 있는 표는 효과 객체 전체
//   5 설명 문장의 숫자(skBody)                                 6 점수/예산(skScore)
//   7 직업 값(생명력 · 성장 · 추천 능력치 · 시작 스킬)과 직업 규칙 상수(RULES)    8 승리 플랜 절의 장착 목록과 id가 실제 스킬인지
// 문서가 코드와 다르면 코드가 현행이다. 게임 코드는 읽기만 한다.
// 비공개 직업 문서(저장소 밖 nrk-private/직업/)는 첫 줄의 "(해금 직업 N)"으로 찾고, 출력에는 이름을 쓰지 않고 해금 1 · 2 · 3으로만 부른다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'); const dir = path.join(ROOT, '06a2');
const PS = require('./pagesrc.js');
const ctx = { console, setTimeout() { }, clearTimeout() { }, setInterval() { }, clearInterval() { }, module: { exports: {} } }; vm.createContext(ctx);
const CONST_NAMES = ['WARD', 'HUNT', 'ELEM', 'MONK', 'BUTCH', 'CONF', 'BLOOD', 'HEAVY_V2', 'PARRY_BIG', 'START_GEAR', 'CANTRIP', 'SBALT', 'MODES'];
vm.runInContext(PS.pageData(dir) + '\n' + PS.pageScript(dir) + `
;this.__X = { BUILDS, LV_GAIN, TREE2, SKILLS2, STAT_REC, skBody, skHead, skCd, skScore, SKK,
  C: {${CONST_NAMES.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : null`).join(', ')}} };`, ctx, { filename: 'x' });
const X = ctx.__X, C = X.C;
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--'))); const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const DETAIL = flags.has('--detail'), FIX = flags.has('--fix'), JSON_OUT = flags.has('--json');

// ── 직업 목록: 공개 여섯 + 해금 셋
const PUB = { assassin: '암살자', warden: '파수꾼', hunter: '사냥꾼', elementalist: '원소술사', spellblade: '마검사', monk: '수도승' };
let priv = ''; for (let d = ROOT, i = 0; i < 6; i++, d = path.dirname(d)) { if (fs.existsSync(path.join(d, 'nrk-private', '직업'))) { priv = path.join(d, 'nrk-private', '직업'); break; } }
const privFiles = priv ? fs.readdirSync(priv).filter(f => f.endsWith('.md')) : [];
const HIDDEN_KEYS = Object.keys(X.BUILDS).filter(k => !PUB[k] && !X.BUILDS[k].tut);
const prefixesOf = k => [...new Set(X.SKILLS2[k].map(s => s.id.split('_')[0]))];
const hidDoc = {};
for (const f of privFiles) { const t = fs.readFileSync(path.join(priv, f), 'utf8'); const m = t.split(/\r?\n/, 1)[0].match(/해금 직업 (\d)/); if (m) hidDoc['H' + m[1]] = path.join(priv, f); }
const KEYS = [];
for (const k of Object.keys(PUB)) KEYS.push({ key: k, label: PUB[k], doc: path.join(ROOT, 'docs', '직업', PUB[k] + '.md'), pub: true });
for (const h of ['H1', 'H2', 'H3']) {
  const doc = hidDoc[h]; if (!doc) { KEYS.push({ key: null, label: '해금 ' + h[1], doc: null, h }); continue; }
  const txt = fs.readFileSync(doc, 'utf8'); const pf = {}; (txt.match(/\b[a-z]{1,2}_[a-z0-9]+\b/g) || []).forEach(x => { const p = x.split('_')[0]; pf[p] = (pf[p] || 0) + 1; });
  let best = null, bn = 0; for (const k of HIDDEN_KEYS) { const n = prefixesOf(k).reduce((a, p) => a + (pf[p] || 0), 0); if (n > bn) { bn = n; best = k; } }
  KEYS.push({ key: best, label: '해금 ' + h[1], doc, h });
}
const selected = KEYS.filter(e => !args.length || args.includes(e.key) || args.includes(e.h) || args.includes(e.label));
const tag = e => e.pub ? e.key : e.h;

// ── 도우미
const strip = s => String(s).replace(/\\/g, '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const nums = s => (String(s).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).map(Number).sort((a, b) => a - b).join(',');
const canon = v => Array.isArray(v) ? v.map(canon) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const deepEq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function sections(text) { // 큰 절(## 단위): 키는 A~G 또는 '_제목'
  const out = {}; let cur = null, buf = [];
  const flush = () => { if (cur) out[cur] = (out[cur] || '') + buf.join('\n') + '\n'; buf = []; };
  for (const ln of text.split(/\r?\n/)) { if (/^## /.test(ln)) { flush(); const m = ln.match(/^##\s+([A-G])[.\s]/); cur = m ? m[1] : '_' + ln.slice(3); } buf.push(ln); }
  flush(); return out;
}
// 효과 객체를 문서가 쓰는 두 모양 가운데 원래 모양으로 다시 쓴다
function fxStr(v) { if (typeof v === 'string') return "'" + v + "'"; if (Array.isArray(v)) return '[' + v.map(fxStr).join(', ') + ']'; if (v && typeof v === 'object') return '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + fxStr(x)).join(', ') + ' }'; return String(v); }
const fxCompact = v => fxStr(v).replace(/\{ /g, '{').replace(/ \}/g, '}').replace(/: /g, ':').replace(/, /g, ',');
function fxCell(old, fx) { // 원래 모양: `[{ k: 'dmg', n: 9 }]`(배열, 공백) 또는 `{k:'dmg',n:9} {k:'st',s:'bleed',n:3}`(붙여 씀)
  if (/^`\[/.test(old.trim())) return '`' + fxStr(fx) + '`';
  return '`' + fx.map(fxCompact).join(' ') + '`';
}

// ── 필수 절 요구(목표 문서 3단계 A~F). 문구 일치는 본문 검색이라 "있다"만 말해 준다. 내용이 맞는지는 아래 대조 항목과 사람 읽기가 한다.
const REQ = {
  A: [['정체성 절', /./], ['핵심 판타지 · 한 문장', /한 문장|판타지|한 줄|전투 경험|정체성/], ['다른 직업과 구별', /다른 .{0,6}직업|구별|겹치지|겹침/], ['매 차례 판단', /판단/], ['숙련 난도 · 1챕터 최소 규칙', /난도|숙련|최소 규칙|가르/]],
  B: [['규칙 · 리듬 절', /./], ['기본 수치 · 시작 스킬', /기본 공격|시작 스킬|기본 수치/], ['전투 리듬 예시', /리듬|라운드 (예시|1)|4라운드|\d라운드/], ['혼자 · 여럿 · 후열', /후열/], ['실수와 되돌리기', /실수/], ['같은 능력 장비 아래의 정체성', /같은 능력|장비 아래|장비가 같은/]],
  C: [['트리 절', /./], ['시작 스킬', /시작 스킬|^####? 시작|\| 시작/m], ['위 칸 대신 쓰는 때', /대신|언제 쓰/], ['섞기 · 몰아 찍기', /섞기|몰아|몰기/], ['최소 빌드', /최소 빌드|최소/]],
  D: [['승리 플랜 절', /./], ['일반 전투', /일반 (전투|싸움)/], ['강적', /강적/], ['1챕터 보스', /1챕터 보스|수도원장/], ['2챕터 보스', /2챕터/], ['3챕터 보스', /3챕터/], ['약점', /약점|약함/], ['실패 조건과 대응', /실패|지는 조건/]],
  E: [['악용 점검 절', /./], ['확인한 조건 기록', /점검|확인|검토/]],
  F: [['화면 · 검증 절', /./], ['화면에 보일 것', /화면|자리|보는 것|보일 것|봐야|보아야/], ['테스터 · 시험', /테스터|시험|검증/], ['질문(직접 플레이 · 사람 테스트)', /질문/], ['상태(확정 · 실험 · 위험)', /상태|남은 위험|위험/]],
};

// ── 스킬 표 읽기
const cellsOf = line => { const c = line.split('|'); c.shift(); if (c.length && c[c.length - 1].trim() === '') c.pop(); return c.map(x => x.trim()); };
function parseFx(cell) {
  const m = cell.match(/`([^`]+)`/); if (!m) return null; let t = m[1].trim(); if (!/k:\s*'/.test(t)) return null;
  try { if (!t.startsWith('[')) t = '[' + t.replace(/\}\s*\{/g, '},{') + ']'; return new Function('return ' + t)(); } catch (e) { return undefined; }
}
function parseDocSkills(lines, branches, idset, prefix, byName) {
  const rows = []; let br = null; const idRe = new RegExp('(?:^|[\\s|(`*])(' + prefix + '_[a-z0-9]+)(?=[\\s|)`*,.]|$)');
  const packRe = new RegExp('(' + prefix + '_[a-z0-9]+)\\s+\\*\\*([^*]+)\\*\\*\\s*\\((아주 느림|빠름|보통|느림)\\s*(\\d+)\\)', 'g');
  lines.forEach((ln, li) => {
    if (/^#{3,5} /.test(ln)) { const b = branches.find(x => ln.includes(x)); if (b) br = b; else if (/시작/.test(ln)) br = '시작'; }
    if (!ln.startsWith('|')) return; const cells = cellsOf(ln); if (cells.every(c => /^[-: ]+$/.test(c))) return;
    // 한 줄에 왼쪽 · 오른쪽 칸을 "id **이름** (빠르기 쿨타임): 풀이"로 같이 적은 표
    const packed = []; cells.forEach((c, ci) => { for (const m of c.matchAll(packRe)) packed.push({ ci, m }); });
    if (packed.length) {
      const rc = cells.find(c => /^\d{1,2}$/.test(c)); const bb = branches.find(b => cells[0].startsWith(b)) || br;
      packed.forEach(({ ci, m }) => rows.push({ id: m[1], cells, idCell: ci, br: bb, li, packed: true, name: m[2].trim(), nameCell: -1, time: m[3], cd: +m[4], row: rc ? +rc : null, pil: null, headI: -1, fxI: -1, fxNoteI: -1, scoreI: -1, budI: -1, descI: -1, desc: null, packRe: new RegExp(m[1] + '\\s+\\*\\*[^*]+\\*\\*\\s*\\((?:아주 느림|빠름|보통|느림)\\s*\\d+\\)') }));
      return;
    }
    let id = null, idCell = -1; for (let i = 0; i < cells.length; i++) { const m = cells[i].match(idRe); if (m && idset.has(m[1])) { id = m[1]; idCell = i; break; } }
    if (!id) { for (let i = 0; i < cells.length; i++) { const m = cells[i].match(idRe); if (m) { id = m[1]; idCell = i; break; } } }
    let byNm = false;
    if (!id && byName) { for (let i = 0; i < cells.length; i++) { const s = byName[strip(cells[i])]; if (s) { id = s.id; idCell = i; byNm = true; break; } } }
    if (!id) return;
    const r = { id, cells, idCell, br, li };
    const nm = cells[idCell].match(/\*\*([^*]+)\*\*/) || (cells[idCell - 1] || '').match(/\*\*([^*]+)\*\*/); r.name = nm ? nm[1].trim() : (byNm ? strip(cells[idCell]) : null);
    r.nameCell = byNm ? -1 : (/\*\*([^*]+)\*\*/.test(cells[idCell]) ? idCell : (/\*\*([^*]+)\*\*/.test(cells[idCell - 1] || '') ? idCell - 1 : -1));
    const bc = cells.find(c => branches.includes(c)); if (bc) r.br = bc;
    const rcI = cells.findIndex(c => /^\d{1,2}( [상중하])?$/.test(c)); r.row = rcI >= 0 ? parseInt(cells[rcI], 10) : null;
    const pc = cells.find(c => /^(왼|오)/.test(c)); r.pil = pc ? pc[0] : null;
    r.headI = cells.findIndex(c => /(빠름|보통|느림)/.test(c) && /·/.test(c) && !/\*\*/.test(c));
    if (r.headI >= 0) { const hc = cells[r.headI]; r.time = (hc.match(/(아주 느림|빠름|보통|느림)/) || [])[1]; const cm = hc.match(/쿨타임\s*(\d+)/) || hc.match(/·\s*(\d+)\s*(?:·|$)/); r.cd = cm ? +cm[1] : null; r.hz = /🔄/.test(hc); }
    r.fxI = -1; for (let i = 0; i < cells.length; i++) { const f = parseFx(cells[i]); if (f !== null) { r.fx = f; r.fxI = i; break; } }
    r.scoreI = cells.findIndex(c => /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?(\s*\(.*\))?$|^\d+(\.\d+)?\s*\(\d+(\.\d+)?\)$/.test(c));
    r.budI = cells.findIndex(c => /^[+\-−]\d+(\.\d+)?%$/.test(c));
    // 효과를 "dmg 12, brk 22, kiBurst {per 3}"처럼 글로 쓴 칸(객체가 아닌 표기)
    r.fxNoteI = -1; if (r.fxI < 0) { const p = cells.findIndex((c, i) => i > idCell && i !== r.headI && !/[가-힣]/.test(c) && /^`?[a-zA-Z]+(?:[a-zA-Z ]* [\d.%{a-z]| ·)/.test(c) && !/^\d+(\.\d+)?\s*\/\s*\d/.test(c)); if (p >= 0) { r.fxNoteI = p; r.fxText = cells[p]; } }
    // 설명 칸: 효과(또는 효과 글) 칸 바로 뒤, 없으면 머리줄 칸 바로 뒤. 그 뒤 칸이 점수 · 한 줄 해설이면 건드리지 않는다.
    const base = Math.max(r.headI, r.fxI, r.fxNoteI); const nx = base >= 0 ? cells[base + 1] : undefined;
    const okDesc = nx !== undefined && base + 1 !== r.scoreI && base + 1 !== r.budI && /[가-힣]/.test(nx) && !/^\(?첫 칸/.test(nx);
    r.descI = okDesc ? base + 1 : -1; r.desc = okDesc ? nx : null;
    rows.push(r);
  });
  return rows;
}
// 효과를 글로 쓴 표기: 수치만 있는 효과는 "dmg 12", 상태는 "st empower 3", 그 밖은 "kiBurst {per 3, max 3}"
function fxNote(fx) {
  return fx.map(f => { const ks = Object.keys(f).filter(k => k !== 'k');
    if (ks.length === 1 && ks[0] === 'n') return f.k + ' ' + f.n;
    if (ks.length === 2 && ks.includes('s') && ks.includes('n') && /^(st|meSt|poison)$/.test(f.k)) return f.k + ' ' + f.s + ' ' + f.n;
    return f.k + ' {' + ks.map(k => k + ' ' + (typeof f[k] === 'object' ? JSON.stringify(f[k]) : f[k])).join(', ') + '}'; }).join(', ');
}
function fxNote2(fx) { // "cleanse n:2 · dmg n:16" 표기
  return fx.map(f => { const ks = Object.keys(f).filter(k => k !== 'k'); return f.k + (ks.length ? ' ' + ks.map(k => k + ':' + (typeof f[k] === 'object' ? JSON.stringify(f[k]).replace(/["{}]/g, '') : f[k])).join(' ') : ''); }).join(' · ');
}
const numSet = s => [...new Set((String(s).replace(/(\d+(?:\.\d+)?)%/g, (m, v) => String(+v / 100)).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(v => v !== 1))].sort((a, b) => a - b).join(',');
const hasHz = s => !!(s.fx && s.fx.some(f => f.k === 'hasten'));
const fmt1 = (v, dec) => dec ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v));
const pct = (v, b) => { const p = Math.round((v / b - 1) * 1000) / 10; return (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(1) + '%'; };
const flatNums = fx => { const o = []; const w = v => { if (typeof v === 'number') o.push(v); else if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (k !== 'k') w(x); }); }; w(fx); return o; };

// ── 직업 값과 규칙 상수. 문서 B절(없으면 문서 전체)에서 정규식을 찾는다. 코드 값은 읽어서 정규식에 넣는다.
function ruleList(key) {
  const B = X.BUILDS[key], G = X.LV_GAIN[key] || {}, R = X.STAT_REC[key] || {}, T = X.TREE2[key];
  const L = []; const add = (label, re, scope) => L.push({ label, re, scope: scope || 'B' });
  const P = v => Math.round(v * 100);
  add('생명력 ' + B.hp, new RegExp('(?:생명력|hp)[^\\n]{0,40}?\\b' + B.hp + '\\b|\\|\\s*' + B.hp + '\\b|\\b' + B.hp + '\\s*\\(?\\s*(?:\\+|레벨)', 'i'));
  add('레벨마다 생명력 +' + G.hp, new RegExp('\\+\\s*' + G.hp + '\\b'));
  add('무기 피해 배율 ' + (B.wpnMul || 1), B.wpnMul && B.wpnMul !== 1 ? new RegExp('(?:wpnMul|무기 (?:피해 )?배율)[^\\n]{0,30}?' + String(B.wpnMul).replace('.', '\\.') + '(?!\\d)|' + String(B.wpnMul).replace('.', '\\.') + '(?!\\d)[^\\n]{0,20}(?:무기|wpnMul)') : /./);
  const SN = { str: '힘', dex: '민첩', int: '지능', con: '체력', wil: '의지' };
  for (const [s, v] of Object.entries(R)) add('추천 ' + SN[s] + ' ' + P(v) + '%', new RegExp(SN[s] + '\\s*(?:' + P(v) + '\\s*%|0?\\.' + String(P(v)).replace(/0$/, '') + '0*(?!\\d))|' + s + '\\s*[:=]?\\s*0?\\.' + String(P(v)).replace(/0$/, '') + '0*\\b'));
  for (const id of (T.starters || [])) { const s = X.SKILLS2[key].find(x => x.id === id); add('시작 스킬 ' + s.n, new RegExp(s.n.replace(/\s/g, '\\s*'))); }
  const w = C.WARD, h = C.HUNT, el = C.ELEM, mk = C.MONK;
  switch (key) {
    case 'assassin': add('흘리기 피해 70% 감소', /70\s*%/); add('흘리기 스태미나 25', /스태미나 25/); break;
    case 'warden': add('보호막 상한 최대 생명력의 ' + P(w.cap) + '%', new RegExp('최대 생명력의 ' + P(w.cap) + '\\s*%')); add('방어 보호막 +' + w.guard, new RegExp('보호막 \\+' + w.guard + '\\b')); add('후열 적 공격은 보호막 ' + P(w.back) + '%', w.back === 0.5 ? /절반/ : new RegExp(P(w.back) + '\\s*%')); add('가시 최대 ' + w.thornMax + '번', new RegExp('최대 ' + w.thornMax + '번')); break;
    case 'hunter': add('추적 최대 ' + h.focusMax + '겹', new RegExp('최대 ' + h.focusMax)); add('추적 겹마다 +' + P(h.focusPer) + '%', new RegExp('겹마다 \\+' + P(h.focusPer) + '\\s*%')); add('추적 정예 · 강적 · 보스 +' + P(h.focusBig) + '%', new RegExp('\\+' + P(h.focusBig) + '\\s*%')); add('추적 추가 ' + h.addMax + '겹까지', new RegExp(h.addMax + '겹까지')); add('연계 피해 +' + P(h.link) + '%', new RegExp('피해 \\+' + P(h.link) + '\\s*%')); add('개전 가속 ' + X.BUILDS.hunter.openHaste, /개전 가속/); break;
    case 'elementalist': add('열충격 D ' + el.D + ' · Cw ' + el.Cw + ' · Bk ' + el.Bk + ' · 상한 ' + el.cap + ' · 되얼림 ' + el.rimeMax, new RegExp('D:\\s*' + el.D + ',\\s*Cw:\\s*' + el.Cw + ',\\s*Bk:\\s*' + el.Bk + ',\\s*guard:\\s*' + el.guard + ',\\s*half:\\s*' + el.half + ',\\s*cap:\\s*' + el.cap + ',\\s*rimeMax:\\s*' + el.rimeMax)); break;
    case 'spellblade': add('교대 보호막 +' + X.BUILDS.spellblade.altWard, new RegExp('\\+\\s*' + X.BUILDS.spellblade.altWard + '\\b')); add('보호막 상한 ' + P(X.BUILDS.spellblade.wardCap) + '%', new RegExp(P(X.BUILDS.spellblade.wardCap) + '\\s*%')); break;
    case 'monk': add('되받기 상한 ' + mk.ctrMax + '번', new RegExp(mk.ctrMax + '\\s*번')); break;
  }
  return L;
}

// ── 한 직업 감사
function audit(e) {
  const res = { label: e.label, tag: tag(e), bad: [], notes: [], n: 0, ok: 0, secMiss: [], secN: 0, secOk: 0, fixed: 0 };
  if (!e.doc || !fs.existsSync(e.doc)) { res.bad.push('문서 없음'); return res; }
  if (!e.key) { res.bad.push('코드 키를 찾지 못함'); return res; }
  const key = e.key; let text = fs.readFileSync(e.doc, 'utf8'); const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const S = sections(text); const skills = X.SKILLS2[key], T = X.TREE2[key];
  const pf = '(?:' + prefixesOf(key).join('|') + ')'; const idset = new Set(skills.map(s => s.id)); const byId = Object.fromEntries(skills.map(s => [s.id, s]));
  const chk = (ok, msg) => { res.n++; if (ok) res.ok++; else res.bad.push(msg); };
  // 1 절
  for (const L of Object.keys(REQ)) for (const [name, re] of REQ[L]) {
    res.secN++; const sec = S[L]; const ok = !!sec && (name.endsWith('절') || re.test(sec));
    if (ok) res.secOk++; else res.secMiss.push(L + ': ' + name);
  }
  // 상급 줄은 본문 어디든(해금 직업 문서는 맨 뒤 절에 둔다)
  res.secN++; if (/상급/.test(text) && skills.some(s => s.tier === '상급')) res.secOk++; else res.secMiss.push('C: 상급 줄');
  // 2~6 트리 표: C절 + '상급'이 제목에 든 절
  const treeKeys = Object.keys(S).filter(k => k === 'C' || (k[0] === '_' && /상급/.test(k)));
  const treeLines = []; const lineOwner = []; // 파일 줄 번호를 알아야 고쳐 쓴다
  const all = text.split(/\r?\n/); let curKey = null; all.forEach((ln, i) => { if (/^## /.test(ln)) { const m = ln.match(/^##\s+([A-G])[.\s]/); curKey = m ? m[1] : '_' + ln.slice(3); } if (treeKeys.includes(curKey)) { treeLines.push(ln); lineOwner.push(i); } });
  const rows = parseDocSkills(treeLines, T.branches, idset, pf, Object.fromEntries(skills.filter(x => x.tier === '상급').map(x => [strip(x.n), x]))); rows.forEach(r => { r.li = lineOwner[r.li]; });
  const docIds = new Set(rows.map(r => r.id));
  const unknown = [...docIds].filter(i => !idset.has(i)), missing = skills.map(s => s.id).filter(i => !docIds.has(i));
  chk(!missing.length && !unknown.length, '트리 표의 id 집합: 코드에만 ' + missing.length + '(' + missing.slice(0, 8).join(' ') + ') · 문서에만 ' + unknown.length + '(' + unknown.slice(0, 8).join(' ') + ')');
  res.nCode = skills.length; res.nDoc = docIds.size;
  const seen = {}; skills.forEach(s => { const k = s.b + '|' + s.row; seen[k] = seen[k] || 0; s._pil = seen[k] ? '오' : '왼'; seen[k]++; });
  const bad = { 이름: [], 줄: [], 갈래: [], 기둥: [], 쿨타임: [], 빠르기: [], '🔄': [], 효과: [], 설명: [], 점수: [] }; let fxN = 0, descN = 0, descSame = 0, descNum = 0, scN = 0, fxTextN = 0;
  const edits = []; // { li, ci, text }
  const seenRow = new Set();
  for (const r of rows) {
    const s = byId[r.id]; if (!s) continue; const key2 = r.li + ":" + r.id; if (seenRow.has(key2)) continue; seenRow.add(key2);
    const starter = (T.starters || []).includes(s.id); const ed = (ci, t) => edits.push({ li: r.li, ci, t });
    if (r.name && strip(r.name).replace(/\s/g, '') !== strip(s.n).replace(/\s/g, '')) { bad.이름.push(r.id + ' 문서 "' + r.name + '" ≠ 코드 "' + s.n + '"'); if (r.nameCell >= 0) ed(r.nameCell, r.cells[r.nameCell].replace('**' + r.name + '**', '**' + s.n + '**')); }
    if (r.row !== null && !starter && r.row !== s.row) bad.줄.push(r.id + ' 문서 ' + r.row + ' ≠ 코드 ' + s.row);
    if (r.br && !starter && r.br !== '시작' && s.b && r.br !== s.b) bad.갈래.push(r.id + ' 문서 ' + r.br + ' ≠ 코드 ' + s.b);
    if (r.pil && !starter && r.pil !== s._pil) bad.기둥.push(r.id + ' 문서 ' + r.pil + ' ≠ 코드 ' + s._pil);
    if (r.packed) {
      const codeTime = X.SKK.TN[s.time]; let ch = false;
      if (r.cd !== s.cd) { bad.쿨타임.push(r.id + ' 문서 ' + r.cd + ' ≠ 코드 ' + s.cd); ch = true; }
      if (r.time !== codeTime) { bad.빠르기.push(r.id + ' 문서 ' + r.time + ' ≠ 코드 ' + codeTime); ch = true; }
      if (ch) ed(r.idCell, r.cells[r.idCell].replace(r.packRe, mm => mm.replace(/\((?:아주 느림|빠름|보통|느림)\s*\d+\)/, '(' + codeTime + ' ' + s.cd + ')')));
    }
    if (r.headI >= 0) {
      let hc = r.cells[r.headI]; const codeCd = s.cd, codeTime = X.SKK.TN[s.time], codeHz = hasHz(s); let ch = false;
      if (r.cd !== null && r.cd !== undefined && r.cd !== codeCd) { bad.쿨타임.push(r.id + ' 문서 ' + r.cd + ' ≠ 코드 ' + codeCd); hc = /쿨타임\s*\d+/.test(hc) ? hc.replace(/쿨타임\s*\d+/, '쿨타임 ' + codeCd) : hc.replace(/·\s*\d+(\s*(?:·|$))/, '· ' + codeCd + '$1'); ch = true; }
      if (r.time && r.time !== codeTime) { bad.빠르기.push(r.id + ' 문서 ' + r.time + ' ≠ 코드 ' + codeTime); hc = hc.replace(/아주 느림|빠름|보통|느림/, codeTime); ch = true; }
      if (r.hz !== codeHz) { bad['🔄'].push(r.id + ' 문서 ' + r.hz + ' ≠ 코드 ' + codeHz); hc = codeHz ? hc + ' · 🔄' : hc.replace(/\s*·\s*🔄/, ''); ch = true; }
      if (ch) ed(r.headI, hc);
    }
    if (r.fxI >= 0) { fxN++; if (r.fx === undefined || !deepEq(r.fx, s.fx)) { bad.효과.push(r.id + ' 문서 ' + JSON.stringify(r.fx) + ' ≠ 코드 ' + JSON.stringify(s.fx)); ed(r.fxI, fxCell(r.cells[r.fxI], s.fx)); } }
    else if (r.fxText) { fxTextN++; const sty = /\b[a-zA-Z]+ [a-zA-Z]+:|\bn:\d/.test(r.fxText) ? 2 : 1; const nt = sty === 2 ? fxNote2(s.fx) : fxNote(s.fx); if (numSet(r.fxText) !== numSet(nt)) { bad.효과.push(r.id + ' 글 효과 "' + r.fxText.slice(0, 60) + '" ≠ 코드 "' + nt.slice(0, 60) + '"'); if (/^`/.test(r.fxText)) ed(r.fxNoteI, '`' + nt + '`'); else if (sty === 2) ed(r.fxNoteI, nt); } }
    if (r.desc) {
      let body = ''; try { body = X.skBody(s); } catch (er) { body = ''; }
      if (body) { descN++; const a = strip(r.desc), b = strip(body); if (a === b || a.includes(b) || b.includes(a)) descSame++; else if (nums(a) === nums(b)) descNum++; else { bad.설명.push(r.id + ' 문서 "' + a.slice(0, 60) + '" ≠ 코드 "' + b.slice(0, 60) + '"'); ed(r.descI, body); } }
    }
    if (r.scoreI >= 0 || r.budI >= 0) {
      let sc; try { sc = X.skScore(s); } catch (er) { sc = null; }
      if (sc) {
        scN++;
        if (r.scoreI >= 0) {
          const old = r.cells[r.scoreI]; let m = old.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(.*)$/), paren = false;
          if (!m) { const m2 = old.match(/^(\d+(?:\.\d+)?)\s*\((\d+(?:\.\d+)?)\)$/); if (m2) { m = [old, m2[1], m2[2], '']; paren = true; } }
          const dec = /\./.test(m[1]) || /\./.test(m[2]); const tolV = /\./.test(m[1]) ? 0.06 : 0.51, tolB = /\./.test(m[2]) ? 0.06 : 0.51;
          if (Math.abs(+m[1] - sc.V) > tolV || Math.abs(+m[2] - sc.B) > tolB) {
            bad.점수.push(r.id + ' 문서 ' + m[1] + '/' + m[2] + ' ≠ 코드 ' + sc.V.toFixed(1) + '/' + sc.B);
            let tail = m[3]; if (/\(\s*[+\-−]/.test(tail)) tail = tail.replace(/\(\s*[+\-−]\d+(\.\d+)?%\s*\)/, '(' + pct(sc.V, sc.B) + ')');
            ed(r.scoreI, paren ? fmt1(sc.V, dec) + ' (' + sc.B + ')' : fmt1(sc.V, dec) + '/' + (dec ? sc.B.toFixed(1) : String(sc.B)) + tail);
          }
        }
        if (r.budI >= 0) { const want = pct(sc.V, sc.B).replace('-', '−'); const have = r.cells[r.budI].replace('-', '−'); if (want !== have && Math.abs(parseFloat(want.replace('−', '-')) - parseFloat(have.replace('−', '-'))) > 0.15) { bad.점수.push(r.id + ' 예산 대비 문서 ' + have + ' ≠ 코드 ' + want); ed(r.budI, want); } }
      }
    }
  }
  const sub = (name, extra) => { const arr = bad[name]; chk(arr.length === 0, name + (extra || '') + ' 어긋남 ' + arr.length + (arr.length ? ': ' + (DETAIL ? arr.join(' / ') : arr.slice(0, 4).join(' / ')) : '')); res['bad_' + name] = arr.length; };
  sub('이름'); sub('줄'); sub('갈래'); sub('기둥'); sub('쿨타임'); sub('빠르기'); sub('🔄'); sub('효과', ' (객체 ' + fxN + '칸 · 글 ' + fxTextN + '칸)'); sub('설명', ' (' + descN + '칸: 문장 같음 ' + descSame + ' · 문장 다르나 숫자 같음 ' + descNum + ')'); sub('점수', ' (' + scN + '칸)');
  res.detail = { fxN, fxTextN, descN, descSame, descNum, scN, rows: rows.length };
  // 칸 수 문구
  const nonStarter = skills.length - (T.starters || []).length, up = skills.filter(s => s.tier === '상급').length, base = nonStarter - up;
  chk(new RegExp('시작 ' + (T.starters || []).length + ' \\+ (?:트리 )?' + nonStarter + '|' + skills.length + '칸').test(text), '칸 수 문구: 코드는 시작 ' + (T.starters || []).length + ' + 트리 ' + nonStarter + '(하급 · 중급 ' + base + ' + 상급 ' + up + '), 문서에 이 합이 없다');
  // 7 직업 값 · 규칙 상수. 맨 위의 "코드 기준 값" 블록은 docsync가 코드에서 써 주므로 빼고 읽는다.
  const body = text.replace(/<!-- 코드값 시작 -->[\s\S]*?<!-- 코드값 끝 -->/, ''); const bodyS = sections(body); const secB = (bodyS.B || '') + '\n' + body.slice(0, 2500);
  const rules = ruleList(key); const ruleBad = [];
  for (const L of rules) if (!L.re.test(secB) && !L.re.test(body)) ruleBad.push(L.label);
  chk(ruleBad.length === 0, '직업 값 ' + rules.length + '개 가운데 문서 본문에서 찾지 못한 것 ' + ruleBad.length + (ruleBad.length ? ': ' + ruleBad.join(' · ') : ''));
  res.ruleN = rules.length; res.ruleBad = ruleBad.length;
  // 문서에 적힌 코드 상수 리터럴(`NAME = { ... }`)이 코드와 같은지
  const litBad = []; let litN = 0;
  for (const nm of CONST_NAMES) {
    if (!C[nm] || typeof C[nm] !== 'object' || Array.isArray(C[nm])) continue;
    const re = new RegExp('`?\\b' + nm + '\\b`?\\s*(?:=|\\|)?\\s*`?(\\{[^`}]*\\})', 'g'); let m;
    while ((m = re.exec(body))) {
      let lit; try { lit = new Function('return ' + m[1])(); } catch (er) { continue; } litN++;
      for (const k of Object.keys(lit)) { if (!(k in C[nm])) litBad.push(nm + '.' + k + ' 문서에만'); else if (!deepEq(lit[k], C[nm][k])) litBad.push(nm + '.' + k + ' 문서 ' + JSON.stringify(lit[k]) + ' ≠ 코드 ' + JSON.stringify(C[nm][k])); }
      for (const k of Object.keys(C[nm])) if (!(k in lit)) litBad.push(nm + '.' + k + ' 코드에만');
    }
  }
  if (litN) chk(litBad.length === 0, '문서의 상수 리터럴 ' + litN + '개: ' + litBad.join(' / ')); res.litN = litN;
  // 문서에 적힌 생명력 · 레벨당 증가가 현행과 다른 줄(이력을 말하는 줄은 뺀다)
  const B0 = X.BUILDS[key], G0 = X.LV_GAIN[key] || {}; const hist = /→|에서 (?:올렸|내렸|바꿨|늘렸|줄였)|이었다|였다|전에는|옛 /; const stale = [];
  body.split(/\r?\n/).forEach((ln, i) => {
    if (hist.test(ln)) return;
    const hp = [...ln.matchAll(/(?:생명력|hp)[ `|]*?(\d{2,3})(?![\d%])(?!\s*%)/g)].filter(m => !/Lv\d[^|]{0,24}$/.test(ln.slice(0, m.index))).map(m => +m[1]).filter(v => v >= 70 && v <= 160 && v !== B0.hp);
    const lv = [...ln.matchAll(/레벨마다\s*\+(\d+)/g)].map(m => +m[1]).filter(v => v !== G0.hp);
    if (hp.length || lv.length) stale.push((i + 1) + '줄(' + [...hp.map(v => '생명력 ' + v), ...lv.map(v => '+' + v)].join(', ') + ')');
  });
  chk(stale.length === 0, '현행(생명력 ' + B0.hp + ', 레벨마다 +' + G0.hp + ')과 다른 값이 적힌 줄 ' + stale.length + (stale.length ? ': ' + stale.slice(0, 8).join(' ') : '')); res.staleLines = stale.length;
  // 8 승리 플랜 절
  const secD = S.D || ''; const names = new Set(skills.map(s => s.n)); let lists = 0; const listBad = [];
  for (const m of secD.matchAll(/\[([^\[\]\n]{4,240})\]/g)) {
    const items = m[1].replace(/\\/g, '').split(/\s*,\s*/).map(strip).filter(Boolean); if (items.length < 3) continue;
    if (items.filter(x => names.has(x)).length < Math.ceil(items.length / 2)) continue; lists++;
    const nb = items.filter(x => !names.has(x)); if (nb.length) listBad.push('[' + m[1].slice(0, 70) + '] → 없는 이름: ' + nb.join(', '));
  }
  chk(!listBad.length, '승리 플랜 장착 목록 ' + lists + '개 가운데 코드에 없는 이름이 든 목록 ' + listBad.length + (listBad.length ? ': ' + listBad.slice(0, 3).join(' / ') : ''));
  res.lists = lists;
  const idsD = new Set(secD.match(new RegExp('\\b' + pf + '_[a-z0-9]+\\b', 'g')) || []); const badD = [...idsD].filter(i => !idset.has(i));
  chk(!badD.length, '승리 플랜 절이 가리키는 id ' + idsD.size + '개 가운데 코드에 없는 것: ' + badD.join(' '));
  const idsAll = new Set(text.match(new RegExp('\\b' + pf + '_[a-z0-9]+\\b', 'g')) || []); const badAll = [...idsAll].filter(i => !idset.has(i));
  chk(!badAll.length, '문서 전체에서 코드에 없는 스킬 id ' + badAll.length + (badAll.length ? ': ' + badAll.slice(0, 10).join(' ') : ''));
  // --fix: 표 칸만 고친다
  if (FIX && edits.length) {
    const lines = text.split(/\r?\n/); const by = {}; edits.forEach(x => { (by[x.li] = by[x.li] || {})[x.ci] = x.t; });
    for (const [li, m] of Object.entries(by)) { const cells = cellsOf(lines[li]); Object.entries(m).forEach(([ci, t]) => { cells[ci] = t; }); lines[li] = '| ' + cells.join(' | ') + ' |'; res.fixed += Object.keys(m).length; }
    fs.writeFileSync(e.doc, lines.join(nl));
  }
  return res;
}

// ── 직업 사이 문서: 승리 플랜(docs/챕터/승리-플랜.md)과 라인업(docs/직업/00-라인업.md)이 코드와 맞는지
function sharedDocs() {
  const out = []; const bad = (m) => out.push(m);
  const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  const plan = read(path.join(ROOT, 'docs', '챕터', '승리-플랜.md')), line = read(path.join(ROOT, 'docs', '직업', '00-라인업.md'));
  const lab = { assassin: '암살자', warden: '파수꾼', hunter: '사냥꾼', elementalist: '원소술사', spellblade: '마검사', monk: '수도승' };
  const hn = {}; KEYS.forEach(e => { if (e.h && e.key) hn[e.key] = e.label; });
  const nameOf = k => lab[k] || hn[k];
  let n = 0;
  if (!plan) bad('승리 플랜 문서 없음'); else {
    // 갈래 표: 직업마다 갈래가 모두 한 줄씩 있어야 한다(해금 직업은 "해금 N 갈래 1 · 2 · 3")
    const rowsTxt = plan.split(/\r?\n/).filter(l => /^\| (?:암살자|파수꾼|사냥꾼|원소술사|마검사|수도승|해금 \d) /.test(l));
    for (const k of Object.keys(X.BUILDS)) {
      if (X.BUILDS[k].tut) continue; const nm = nameOf(k); if (!nm) continue; const br = X.TREE2[k].branches;
      br.forEach((b, i) => { n++; const want = PUB[k] ? nm + ' ' + b : nm + ' 갈래 ' + (i + 1); if (!rowsTxt.some(l => l.startsWith('| ' + want + ' |'))) bad('승리 플랜 3절 표에 줄 없음: ' + want); });
    }
    // 2절 표의 추천 스탯
    const SN = { str: '힘', dex: '민첩', int: '지능', con: '체력', wil: '의지' };
    for (const k of Object.keys(X.BUILDS)) {
      const nm = nameOf(k); if (!nm || X.BUILDS[k].tut) continue; const R = X.STAT_REC[k] || {};
      const row = plan.split(/\r?\n/).find(l => l.startsWith('| ' + nm + ' | '));
      if (!row) { bad('승리 플랜 2절 표에 줄 없음: ' + nm); continue; } n++;
      const cell = row.split('|')[2] || ''; const got = {}; for (const m of cell.matchAll(/(힘|민첩|지능|체력|의지)\s*(\d+)/g)) got[m[1]] = +m[2];
      const want = {}; Object.entries(R).forEach(([s, v]) => { want[SN[s]] = Math.round(v * 100); });
      if (JSON.stringify(Object.entries(got).sort()) !== JSON.stringify(Object.entries(want).sort())) bad('승리 플랜 2절 추천 스탯 ' + nm + ': 문서 ' + JSON.stringify(got) + ' ≠ 코드 ' + JSON.stringify(want));
    }
  }
  if (!line) bad('라인업 문서 없음'); else {
    // 2절 표: 사거리 · 생명력(+레벨당)
    for (const k of Object.keys(PUB)) {
      const row = line.split(/\r?\n/).find(l => l.startsWith('| ' + PUB[k] + ' |')); if (!row) { bad('라인업 2절 표에 줄 없음: ' + PUB[k]); continue; } n++;
      const cell = row.split('|')[3] || ''; const B = X.BUILDS[k], G = X.LV_GAIN[k];
      const hist = /에서|올림|올렸/.test(cell); // "86 · +4에서 올림" 같은 이력은 현행 값이 먼저 와야 한다
      const m = cell.match(/(\d{2,3})\s*\(\+(\d+)\)/);
      if (!m || +m[1] !== B.hp || +m[2] !== G.hp) bad('라인업 2절 ' + PUB[k] + ' 생명력: 문서 "' + cell.trim().slice(0, 50) + '" ≠ 코드 ' + B.hp + ' (+' + G.hp + ')');
      if (B.wpnMul && B.wpnMul !== 1) { const p = Math.round(B.wpnMul * 100) + '%'; if (!cell.includes(p) && !(PUB[k] && new RegExp(p).test(cell))) { /* 근접 0.9 같은 값은 표에 안 적는다 */ } }
    }
  }
  return { n, out };
}

// ── 실행
const results = selected.map(e => ({ e, r: audit(e) }));
if (JSON_OUT) { console.log(JSON.stringify(results.map(({ r }) => r), null, 1)); process.exit(0); }
let anyBad = false;
for (const { e, r } of results) {
  console.log('\n=== ' + e.label + (e.key ? ' (' + tag(e) + ')' : ''));
  console.log(' 절 요소 ' + r.secOk + '/' + r.secN + (r.secMiss.length ? ' 없음: ' + r.secMiss.join(', ') : ''));
  console.log(' 대조 ' + r.ok + '/' + r.n + ' 항목 일치, 표 id 문서 ' + r.nDoc + ' · 코드 ' + r.nCode + (FIX ? ', 고친 칸 ' + r.fixed : ''));
  r.bad.forEach(b => console.log('  어긋남: ' + b));
  if (r.bad.length) anyBad = true;
}
let sharedBad = 0;
if (!args.length) { const sd2 = sharedDocs(); console.log('\n=== 직업 사이 문서(승리 플랜 · 라인업)\n 대조 ' + (sd2.n - sd2.out.length) + '/' + sd2.n + ' 항목 일치'); sd2.out.forEach(b => console.log('  어긋남: ' + b)); sharedBad = sd2.out.length; }
process.exit(anyBad || sharedBad || results.some(({ r }) => r.secMiss.length) ? 1 : 0);
