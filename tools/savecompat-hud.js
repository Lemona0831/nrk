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
G.data = G0.blankData(); run_('hudEditLay("pc", L => { L.s[L.z.top1[0]] = 150; })'); bag['새 모양(편집 저장)'] = JSON.parse(JSON.stringify(G.data.hud));
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
    run_('hudFlags(hudRaw().p, hudRaw().o)');
  } catch (e) { errs.push('예외 ' + e.message); }
  if (errs.length) { bad++; console.log('✗ HUD ' + name + ' ' + w + 'px: ' + errs.join(' / ')); }
}
console.log('전투 화면 배치 저장값 ' + n + '가지 열기, 오류 ' + bad + '개'); process.exitCode = bad ? 1 : 0;
