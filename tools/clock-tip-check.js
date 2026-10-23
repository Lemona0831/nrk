'use strict';
/* 10월 24일 S-4 강적 시계 처음 만남 한 줄 점검 (js/25 fcTip · FC_TIP, js/52 vBattle이 부른다). 실행: node tools/clock-tip-check.js
   시계 칩이 보이는 첫 전투에서 한 번만(기록 한 줄 + 알림, G.data.seenClk) · 다음 전투에서는 다시 뜨지 않는다 · 수련장 · HUD 편집 · 시계 없는 전투에서는 뜨지 않는다 ·
   문장에 답(무엇이 칸을 되감는지)을 쓰지 않는다 · 마지막 경고 칸의 칩에는 ⚠ 글자가 붙는다(색만으로 알리지 않는다) */
const H = require('./uqtest/_h.js'); const { E, R_, G, ok } = H;
const TIP = R_('FC_TIP'), fcTip = R_('fcTip'), fcChip = R_('fcChip');
const lines = b => b.log.filter(l => l.m.indexOf(TIP) >= 0).length;
function mk(foe, o) {
  o = o || {}; const d0 = G.data; const f = H.fight('warden', { en: ['bruiser', 'bruiser'], setup: (run, es) => { if (foe) { es[0].strong = true; es[0].foe = foe; } } }); /* fight는 G.data를 새로 만든다: keep이면 앞 저장을 그대로 쓴다 */
  const b = f.b; if (o.keep && d0) G.data = d0; else G.data.seenClk = undefined; G.b = b; G.scr = 'run'; G.hudEd = null; if (foe) E.fcInit(b, f.es[0]); return { f, b, e: f.es[0] };
}
/* 1. 첫 전투: 한 번만 */
{ const { b } = mk('scribe'); ok(fcTip(b) === 1, '시계가 보이는 첫 전투에서 한 줄이 뜨지 않았다'); ok(G.data.seenClk === 1, 'G.data.seenClk가 서지 않았다'); ok(lines(b) === 1, '기록에 한 줄이 남지 않았다 ' + lines(b));
  ok(fcTip(b) === 0 && lines(b) === 1, '같은 전투에서 두 번 떴다');
  /* 2. 다음 전투(같은 저장): 다시 뜨지 않는다 */
  const y = mk('cantor', { keep: 1 }); ok(fcTip(y.b) === 0 && lines(y.b) === 0, '다음 전투에서 다시 떴다'); }
/* 3. 뜨지 않아야 할 때: 시계 없는 전투 · 수련장 · HUD 편집 · 지금 전투가 아님 · 끝난 전투 */
{ const { b } = mk(null); ok(fcTip(b) === 0 && !G.data.seenClk, '시계 없는 전투에서 떴다'); }
{ const { b } = mk('scribe'); G.scr = 'tut'; ok(fcTip(b) === 0 && !G.data.seenClk, '수련장에서 떴다'); }
{ const { b } = mk('scribe'); G.hudEd = { real: 0 }; ok(fcTip(b) === 0 && !G.data.seenClk, 'HUD 편집 화면에서 떴다'); G.hudEd = null; }
{ const { b } = mk('scribe'); G.b = null; ok(fcTip(b) === 0 && !G.data.seenClk, '지금 전투가 아닌 전투에서 떴다'); }
{ const { b } = mk('scribe'); b.over = true; ok(fcTip(b) === 0 && !G.data.seenClk, '끝난 전투에서 떴다'); }
/* 4. 새 저장(blankData)에는 seenClk가 없다: 처음 만남이 뜬다. 저장 키는 그대로(G.data 안의 칸 하나) */
{ const d = E.blankData(); ok(!d.seenClk, '새 저장에 seenClk가 이미 서 있다'); }
/* 5. 문장: 답을 쓰지 않는다(되감기 · 답 태그 · 행동 이름), 문체(느낌표 · 괄호 조사 · 줄표 없음) */
{ const bad = ['되감', '되돌', '막으', '깨면', '무너뜨', '쓰러뜨', '흘리', '방어', '소모품', '!', '이(가)', '—'];
  for (const w of bad) ok(TIP.indexOf(w) < 0, '처음 만남 문장에 "' + w + '"이 들어 있다');
  const tags = new Set(); const FC = R_('FOE_CLOCK'); for (const k in FC) for (const t of FC[k].ans || []) tags.add(t);
  for (const t of tags) ok(TIP.indexOf(t) < 0, '처음 만남 문장에 답 태그 "' + t + '"이 들어 있다');
  ok(/다 차면/.test(TIP) && /한 칸 남으면/.test(TIP), '처음 만남 문장의 뜻(다 차면 위험 · 한 칸 남으면 경고)이 빠졌다'); }
/* 6. 칩: 마지막 경고 칸이면 ⚠ 글자(색만으로 알리지 않는다), 아니면 없다 */
{ const { b, e } = mk('scribe'); const C = e.clk; C.n = 0; ok(fcChip(b, e).indexOf('fclkw') < 0, '경고 전 칩에 ⚠가 붙었다');
  C.n = C.max - 1; const h = fcChip(b, e); ok(h.indexOf('fclkw') >= 0 && h.indexOf('⚠') >= 0, '마지막 경고 칩에 ⚠ 글자가 없다'); ok(/다음이면 위험/.test(h), '마지막 경고 칩의 읽는 이름에 위험이 없다'); }
/* 7. 전투 화면이 부른다(js/52 vBattle) */
ok(String(R_('vBattle')).indexOf('fcTip(') >= 0, 'vBattle이 fcTip을 부르지 않는다');
console.log('clock-tip-check: 시험 ' + H.C.n + '개 · 실패 ' + H.C.fail.length);
for (const m of H.C.fail) console.log('  실패: ' + m);
if (H.C.fail.length) process.exit(1);
