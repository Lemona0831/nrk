'use strict';
/* 타수 기준표 (0.8.0 A0 3번, 1막 재설계 ① 적 문법 엔진)
   적 체력 = hits.hp × FOE_HIT_REF[챕터][층 띠].dmg, 붕괴 게이지 = hits.brk × FOE_HIT_REF[챕터][층 띠].brk (data/foes.js).
   이 도구가 그 기준을 잰다: 신중 성향 × 직업 여섯 × 같은 시드 N판 × 3챕터, 전투마다 "내 행동 하나의 평균 피해(지속 피해 포함) · 채운 붕괴"를 모아 (챕터, 층 띠)마다 가운데 값.
   같은 판에서 지금 적의 시작 체력 · 붕괴 게이지도 모아(정예 · 강인 · 소환 빼고, 강적은 넣는다) 1챕터 비교표(새 식 대 지금, ±15%)를 낸다. 값은 바꾸지 않는다 — 보고만.
   쓰기: node tools/hitref.js [--seeds 120] [--out hitref.json] [--cls warden] (직업을 주지 않으면 여섯을 따로 돌려 합친다) */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--seeds', 120), OUT = arg('--out', 'hitref.json'), CLS = arg('--cls', null);
const CLASSES = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
const BANDS = [[1, 3], [4, 7], [9, 11], [12, 15], [16, 16]];
const bandOf = f => { const i = BANDS.findIndex(([a, z]) => f >= a && f <= z); return i < 0 ? (f === 8 ? 1 : -1) : i; }; // 8층(갈림길 뒤 첫 층)은 둘째 띠에 넣는다
const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = x => x == null ? null : Math.round(x * 100) / 100;

function runOne(cls) {
  process.env.DGDIR = process.env.DGDIR || '.';
  const D = require('./dgqa.js'); D.OPT.chapters = 3;
  const fights = [], foes = []; let cur = null;
  const close = () => { if (!cur) return; const b = cur.b; let dealt = 0; for (const r of b.rec) if (r.k === 'dealt') dealt += r.d; if (cur.acts > 0) fights.push({ ch: cur.ch, band: cur.band, dmg: dealt / cur.acts, brk: (b.pBrk || 0) / cur.acts, acts: cur.acts }); cur = null; };
  D.OPT.onTurn = G => {
    const b = G.b; if (!b) return;
    if (!cur || cur.b !== b) { close(); const f = (G.run.cur && G.run.cur.floor) || 0; cur = { b, ch: b.ctx.ch || 1, band: bandOf(f), acts: 0 };
      for (const e of b.en) if ((!e.elite || e.strong) && !e.tough && !e.summoned && !e.monk && e.role !== 'candle') foes.push({ ch: cur.ch, band: cur.band, id: e.role === 'boss' ? e.boss : e.foe || e.role, hp: e.hpMax, brk: e.brkMax }); }
    cur.acts++;
  };
  for (let i = 0; i < N; i++) { try { D.playChar('careful', cls, 5000 + 13 * i); } catch (e) { if (process.env.HR_DBG) console.error(cls, e.stack.split('\n').slice(0, 3).join(' | ')); } close(); }
  return { fights, foes };
}

function summarize(parts) {
  const F = parts.flatMap(p => p.fights), E = parts.flatMap(p => p.foes);
  const ref = {}; for (const ch of [1, 2, 3]) { ref[ch] = BANDS.map((_, bi) => { const L = F.filter(x => x.ch === ch && x.band === bi); return L.length ? { dmg: r2(med(L.map(x => x.dmg))), brk: r2(med(L.map(x => x.brk))), n: L.length } : null; }); }
  const cur = {}; for (const e of E) { const k = e.ch + ':' + e.id + ':' + e.band; (cur[k] = cur[k] || { ch: e.ch, id: e.id, band: e.band, hp: [], brk: [] }); cur[k].hp.push(e.hp); cur[k].brk.push(e.brk); }
  const now = Object.values(cur).map(x => ({ ch: x.ch, id: x.id, band: x.band, hp: r2(med(x.hp)), brk: r2(med(x.brk)), n: x.hp.length }));
  return { at: new Date().toISOString().slice(0, 10), seeds: N, classes: CLASSES, bands: BANDS, ref, now };
}

if (CLS) { const r = runOne(CLS); fs.writeFileSync(OUT, JSON.stringify(r)); }
else {
  const tmp = OUT + '.parts'; fs.mkdirSync(tmp, { recursive: true }); let left = CLASSES.length; const parts = [];
  for (const c of CLASSES) {
    const f = path.resolve(tmp, c + '.json'), dir = path.resolve(tmp, 'g-' + c); // 직업마다 가벼운 사본에서 돈다(tools/eng.gen.js를 겹쳐 쓰지 않게, measure-run --jobs와 같은 방식)
    for (const d of ['data', 'js', 'css', 'tools']) fs.cpSync(d, path.join(dir, d), { recursive: true }); fs.copyFileSync('index.html', path.join(dir, 'index.html'));
    const ch = cp.spawn(process.execPath, [path.join(dir, 'tools', 'hitref.js'), '--cls', c, '--seeds', String(N), '--out', f], { cwd: dir, env: Object.assign({}, process.env, { DGDIR: '.' }), stdio: ['ignore', 'ignore', 'inherit'] });
    ch.on('exit', () => { parts.push(JSON.parse(fs.readFileSync(f, 'utf8'))); if (--left === 0) { const S = summarize(parts); fs.writeFileSync(OUT, JSON.stringify(S, null, 1)); console.log('hitref: 전투 ' + parts.reduce((a, p) => a + p.fights.length, 0) + ' → ' + OUT); for (const ch of [1, 2, 3]) console.log('  ' + ch + '챕 ' + S.ref[ch].map(x => x ? x.dmg + '/' + x.brk + '(' + x.n + ')' : '-').join(' · ')); } });
  }
}
