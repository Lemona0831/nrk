/* 계정 데이터의 전투 화면 배치(G.data.hud) 점검 (10월 10일 0.6a.2-95): 옛 모양(0.6a.2-89 묶음만 · 항목만), 값이 없음, 깨진 값, 새 모양(편집 저장)을
   휴대폰 · PC 폭에서 읽어 본다. 모든 모듈이 한 번씩 있고, 크기는 정해진 값이고, 끌 수 없는 모듈이 켜져 있어야 한다.
   실행: node tools/savecompat-hud.js */
process.env.DGDIR = process.env.DGDIR || '06a2';
const D = require('./dgqa.js'); const { G0, run_ } = D; const G = G0.__G; let bad = 0, n = 0;
const win = w => run_('window.innerWidth = ' + w);
const bag = {
  simple: { p: 'simple' }, normal: { p: 'normal' }, full: { p: 'full' }, 'custom(-89, 항목만)': { p: 'custom', o: { sts: 'all' } }, 없음: undefined, null값: null, 문자열: 'x', 모르는묶음: { p: 'zzz' }, 'custom 배치 없음': { p: 'custom', o: {} },
  '배치 깨짐': { p: 'custom', o: {}, lay: { pc: { z: { top1: ['nope', 'nope'], mid: 'x' }, s: { a: 77 }, off: ['lock', 5] }, ph: 3 } }, '배치 문자열': { p: 'custom', lay: 'x' }, '크기 문자열': { p: 'custom', lay: { pc: { z: {}, s: { foe: '150' }, off: [] } } },
};
/* 자유 배치(0.6a.2-109): md · fr이 없음(옛 저장본), 깨진 값, 범위 밖 값, 정상 값 */
Object.assign(bag, {
  '자유 배치 없음(md 없음)': { p: 'custom', o: {}, lay: { pc: { z: {}, s: {}, off: [] }, ph: { z: {}, s: {}, off: [] } } },
  '자유 md 깨짐': { p: 'custom', o: {}, lay: { md: { pc: 'zzz', ph: 7 }, fr: { pc: 'x', ph: null } } },
  '자유 fr 깨짐': { p: 'custom', o: {}, lay: { md: { pc: 'free', ph: 'free' }, fr: { pc: { m: { 'hud-field': { x: 'a', y: -5, w: 99 } }, s: { 'hud-field': 33 }, off: ['hud-player', 'zz'], pk: '?' }, ph: { m: [], pk: 0 } } } },
  '자유 범위 밖': { p: 'custom', o: {}, lay: { md: { pc: 'free', ph: 'free' }, fr: { pc: { m: { 'hud-field': { x: 99999, y: 1e9, w: 1 } } }, ph: { m: { 'hud-actions': { x: -4, y: -9, w: 0 } } } } } },
  '자유 프리셋 밖': { p: 'simple', lay: { md: { pc: 'free', ph: 'free' } } },
});
/* 자유 캔버스(0.6a.2-120): 옛 12열 격자 값 한 벌(정상), 새 v 2 값(정상 · 깨짐 · 범위 밖), 칸 일부만 있음 */
const OLD12 = (pc, ph) => ({ p: 'custom', o: {}, lay: { md: { pc: 'free', ph: 'free' }, fr: { pc, ph } } });
Object.assign(bag, {
  '옛 12열 격자 한 벌': OLD12({ m: { 'hud-player': { x: 0, y: 0, w: 5 }, 'hud-order': { x: 5, y: 0, w: 7 }, 'hud-field': { x: 1, y: 8, w: 10 }, 'hud-actions': { x: 0, y: 40, w: 12 } }, s: { 'hud-field': 150 }, off: ['hud-log'], pk: 0, au: 0 }, { m: { 'hud-player': { x: 0, y: 0, w: 12 } }, pk: 1, au: 1 }),
  '옛 12열 격자 칸 일부만 · au': OLD12({ m: { 'hud-player': { x: 3, y: 4, w: 6 } }, au: 1 }, null),
  '새 v2 정상': OLD12({ v: 2, m: { 'hud-player': { x: 10.5, y: 3.25, w: 40, h: null }, 'hud-field': { x: 0, y: 20, w: 100, h: 30 } }, zo: ['hud-actions', 'hud-player'], s: {}, off: [], pk: 1, sn: 8, gd: 0, ch: 2.5, au: 0, lg: { m: { 'hud-player': { x: 1, y: 1, w: 5 } }, pk: 0, au: 0 } }, null),
  '새 v2 깨짐': OLD12({ v: 2, m: { 'hud-player': { x: 'a', y: 1e12, w: -4, h: 'z' }, 'hud-field': { x: -1e9, y: NaN, w: 1e9, h: -5 } }, zo: 'x', sn: 7, gd: 5, ch: 9, pk: 'q', lg: 5 }, { v: 2, m: [], zo: [1, 2, 'hud-field', 'hud-field'] }),
  '새 v2 범위 밖': OLD12({ v: 2, m: { 'hud-actions': { x: 9999, y: 9999, w: 0.001, h: 99999 } }, ch: 3 }, null),
});
G.data = G0.blankData(); run_('hudEditLay("pc", L => { L.s[L.z.top1[0]] = 150; })'); bag['새 모양(편집 저장)'] = JSON.parse(JSON.stringify(G.data.hud));
G.data = G0.blankData(); run_('hudModeLive("free")'); bag['새 모양(자유 배치 저장)'] = JSON.parse(JSON.stringify(G.data.hud));
const ids = run_('HUD_MODS.map(m => m.id)'); const locks = run_('HUD_MODS.filter(m => m.lock).map(m => m.id)');
for (const [name, h] of Object.entries(bag)) for (const w of [390, 1280]) {
  n++; const errs = [];
  try {
    G.data = G0.blankData(); if (h !== undefined) G.data.hud = JSON.parse(JSON.stringify(h)); win(w); G.scr = 'run'; G.b = null;
    for (const dev of ['pc', 'ph']) {
      const L = run_('hudLayFor("' + dev + '")'); const all = [].concat(...Object.values(L.z));
      if (all.length !== ids.length || new Set(all).size !== ids.length) errs.push(dev + ' 모듈이 빠지거나 겹침');
      if (Object.values(L.s).some(v => ![50, 75, 100, 150, 200].includes(v))) errs.push(dev + ' 크기 값 이상');
      if (L.off.some(id => locks.includes(id))) errs.push(dev + ' 끌 수 없는 모듈이 꺼짐');
    }
    for (const dev of ['pc', 'ph']) {
      const F = run_('hudFreeFor("' + dev + '")'); const mode = run_('hudModeFor("' + dev + '")');
      if (!['align', 'free'].includes(mode)) errs.push(dev + ' 방식 이상 ' + mode);
      for (const id of ids) { const q = F.m[id]; if (!q || ![q.x, q.y, q.w].every(Number.isFinite) || q.w < 5 || q.w > 100 || q.x < -100 || q.x > 100 || q.y < -50 || q.y > 300 || !(q.h === null || (Number.isFinite(q.h) && q.h >= 3 && q.h <= 300))) errs.push(dev + ' 자유 값 이상 ' + id + JSON.stringify(q)); }
      if (F.v !== 2 || F.zo.length !== ids.length || new Set(F.zo).size !== ids.length || !ids.every(i => F.zo.includes(i))) errs.push(dev + ' 겹침 순서 이상');
      if (![0, 1, 4, 8, 16].includes(F.sn) || ![0, 1].includes(F.gd) || ![1, 1.5, 2, 2.5, 3].includes(F.ch) || ![0, 1].includes(F.au)) errs.push(dev + ' 붙이기 · 정렬선 · 캔버스 높이 값 이상');
      if (Object.values(F.s).some(v => ![50, 75, 100, 150, 200].includes(v))) errs.push(dev + ' 자유 크기 값 이상');
      if (F.off.some(id => locks.includes(id))) errs.push(dev + ' 자유: 끌 수 없는 모듈이 꺼짐');
      if (F.pk !== 0 && F.pk !== 1) errs.push(dev + ' pk 이상');
    }
    run_('hudFlags(hudRaw().p, hudRaw().o)');
  } catch (e) { errs.push('예외 ' + e.message); }
  if (errs.length) { bad++; console.log('✗ HUD ' + name + ' ' + w + 'px: ' + errs.join(' / ')); }
}
console.log('전투 화면 배치 저장값 ' + n + '가지 열기, 오류 ' + bad + '개'); process.exitCode = bad ? 1 : 0;
