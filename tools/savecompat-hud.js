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
      for (const id of ids) { const q = F.m[id]; if (!q || !Number.isInteger(q.x) || !Number.isInteger(q.y) || !Number.isInteger(q.w) || q.w < 3 || q.w > 12 || q.x < 0 || q.x + q.w > 12 || q.y < 0) errs.push(dev + ' 자유 값 이상 ' + id + JSON.stringify(q)); }
      if (Object.values(F.s).some(v => ![50, 75, 100, 150, 200].includes(v))) errs.push(dev + ' 자유 크기 값 이상');
      if (F.off.some(id => locks.includes(id))) errs.push(dev + ' 자유: 끌 수 없는 모듈이 꺼짐');
      if (F.pk !== 0 && F.pk !== 1) errs.push(dev + ' pk 이상');
    }
    run_('hudFlags(hudRaw().p, hudRaw().o)');
  } catch (e) { errs.push('예외 ' + e.message); }
  if (errs.length) { bad++; console.log('✗ HUD ' + name + ' ' + w + 'px: ' + errs.join(' / ')); }
}
console.log('전투 화면 배치 저장값 ' + n + '가지 열기, 오류 ' + bad + '개'); process.exitCode = bad ? 1 : 0;
