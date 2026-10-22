'use strict';
/* 이벤트 점검 (0.8.0 A0, 1막 재설계 ① 적 문법 엔진 6번)
   1. 모든 이벤트에 벌칙이 있는 결과가 하나 이상 있다(선택지 설명에 대가 낱말: 대신 · 줄어 · 주는 피해 − · 쓰고 · 비우 · 더해지 · 상태 겹 · 강적 · 넘기기 …. 받는 피해 −처럼 득만 있는 것은 벌칙이 아니다)
   2. 이야기 조각: 비공개 세계 노트 9절 표의 조각이 그 이벤트의 글에 글자 그대로 들어 있다. 노트는 저장소 밖이라 경로를 인자로 받고, 조각 글은 찍지 않는다(일치 · 빠짐 수와 이벤트 이름만)
   쓰기: node tools/event-check.js [--ch 1] [--notes <세계-노트.md>]. 위반이 있으면 표를 찍고 1로 끝난다 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const CH = arg('--ch', null), NOTES = arg('--notes', path.join(__dirname, '..', '..', 'nrk-private', '이야기', '세계-노트-2026-10-18.md'));
const ctx = {}; vm.createContext(ctx); const V_ = s => s.replace(/^const (\w+)/gm, 'var $1');
vm.runInContext(['data/foes.js', 'data/dungeon.js'].map(f => V_(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))).join(';\n'), ctx);
const EVENTS = ctx.EVENTS.filter(e => !CH || String(e.ch || 1) === CH);
const COST = /대신|줄어|주는 피해 −|매복|쓰고|씁니다|비우|더해지|약화 \d|취약 \d|중독 \d|화상 \d|출혈 \d|둔화 \d|강적이 반드시|주고|넘기|반반|잃/;
const V = []; const bad = (kind, id, what) => V.push({ kind, id, what });
for (const e of EVENTS) if (!e.opts.some(o => COST.test(o.d || ''))) bad('벌칙 없음', e.id + ' ' + e.n, e.opts.map(o => o.n).join(' · '));
let frag = null;
if (fs.existsSync(NOTES)) {
  const L = fs.readFileSync(NOTES, 'utf8').split(/\r?\n/); const a = L.findIndex(l => /^## 9\./.test(l)); frag = { n: 0, ok: 0 };
  for (let i = a + 1; i < L.length && !/^## /.test(L[i]); i++) {
    const m = L[i].match(/^\|\s*(\d+)\s*\|\s*(\d)\s*\|\s*([^|(]+)\(([^)]*)\)\s*\|\s*([^|]+)\|/); if (!m) continue;
    const ch = m[2], name = m[3].trim(), opt = m[4].trim(), text = m[5].trim(); if (CH && ch !== CH) continue; frag.n++;
    const ev = ctx.EVENTS.find(e => String(e.ch || 1) === ch && e.n === name);
    const hay = ev ? JSON.stringify(ev) : ''; const o = ev && ev.opts.find(x => x.n === opt);
    if (!ev) bad('조각 이벤트 없음', '#' + m[1] + ' ' + ch + '챕', name);
    else if (!o) bad('조각 선택지 없음', '#' + m[1] + ' ' + ev.id, opt);
    else if (!hay.includes(text.replace(/"/g, '\\"'))) bad('조각 글 다름', '#' + m[1] + ' ' + ev.id, opt);
    else frag.ok++;
  }
}
console.log('event-check' + (CH ? ' (' + CH + '챕터)' : '') + ': 이벤트 ' + EVENTS.length + ' · 벌칙 있음 ' + (EVENTS.length - V.filter(v => v.kind === '벌칙 없음').length) + ' · 이야기 조각 ' + (frag ? frag.ok + '/' + frag.n + ' 일치' : '비공개 노트가 없어 건너뜀(--notes)'));
if (V.length) { console.log('  위반 ' + V.length + ':'); console.log('  | 종류 | 대상 | 내용 |'); for (const v of V) console.log('  | ' + v.kind + ' | ' + v.id + ' | ' + v.what + ' |'); process.exit(1); }
