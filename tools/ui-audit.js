'use strict';
/* 화면 가독성 자동 점검 (10월 14일). 테스트 사이트(또는 그 로컬 사본)를 실제 Chromium으로 열고, 테스트 메뉴의 프리셋으로
   주요 화면을 차례로 띄워 캡처하고 다섯 가지를 센다.
   - 겹침: 글자(텍스트 노드의 실제 영역)와 버튼, 버튼과 버튼이 서로 겹침 (조상·자손 관계와 떠 있는 층은 뺀다)
   - 비좁음: 같은 줄에서 버튼과 글자 사이가 4px 미만
   - 넘침: 글자가 자기 칸 밖으로 나가거나 잘림, 페이지 가로 스크롤
   - 작은 글씨: 12px 미만
   - 명암: 글자색과 실제 배경색의 대비 4.5 미만(큰 글씨 3 미만). 배경 그림이 있으면 건너뛴다
   - 작은 버튼(휴대폰 폭만): 높이 32px 또는 너비 24px 미만
   실행(Chromium과 playwright-core가 필요):
     NODE_PATH=<playwright-core가 설치된 node_modules> node tools/ui-audit.js <주소 또는 file:// 경로> <출력 폴더> [폭들=360,390,1280]
   출력: <출력 폴더>/report.json, 화면별 PNG */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const URL = process.argv[2], OUT = process.argv[3], WIDTHS = (process.argv[4] || '360,390,1280').split(',').map(Number);
if (require.main === module && (!URL || !OUT)) { console.error('사용: node tools/ui-audit.js <주소> <출력 폴더> [폭들]'); process.exit(1); }
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const EXE = process.env.PW_CHROME || path.join(process.env.USERPROFILE || process.env.HOME, 'AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe');
const P = 'spellbladehard2';
// 화면 하나 = 프리셋에서 시작해 거기까지 가는 단계 (페이지 안에서 실행)
const STATES = [
  ['title', null],
  ['doors', `TM.preset('${P}')`],
  ['room', `TM.preset('${P}'); if (G.run.doors) chooseDoor(0); render()`],
  ['battle', `TM.preset('${P}'); if (G.run.doors) chooseDoor(0); enterRoom(); render()`],
  ['battle-tools', `TM.preset('${P}'); if (G.run.doors) chooseDoor(0); enterRoom(); render(); const t = document.querySelector('[data-a=tools]'); if (t) t.click()`],
  ['sheet-cons', `TM.preset('${P}'); if (G.run.doors) chooseDoor(0); enterRoom(); render(); openSheet('cons', {}); render()`],
  ['sheet-equip', `TM.preset('${P}'); openSheet('equip', {}); render()`],
  ['sheet-ks', `TM.preset('${P}'); G.run.clears = Math.max(1, G.run.clears || 0); ksGrant(G.run, 'b1'); ksOpen(); render()`], // 10월 16일 0.8.0 2단계: 능력치 창 대신 큰 각인 고르기
  ['sheet-skills', `TM.preset('${P}'); openSheet('skills', {}); render()`],
  ['tree', `TM.preset('${P}'); G.back = G.scr; G.scr = 'tree'; render()`],
  ['camp', `TM.preset('${P}'); TM.floor(12); render()`],
  ['settle', `TM.preset('${P}'); TM.settle(); render()`],
  ['shop', `TM.preset('${P}'); TM.settle(); const b = document.querySelector('[data-a=settleok]'); if (b) b.click(); render()`],
  ['help', `openSheet('help', {}); render()`],
  ['settings', `openSheet('settings', {}); render()`],
  ['codex', `openSheet('codex', {}); render()`],
  ['changes', `openSheet('changes', {}); render()`],
];
function auditInPage() {
  const hidden = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); if ((r.width <= 1 && r.height <= 1) || (cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none' && cs.position === 'absolute')) return true; } return false; }; // 화면 낭독기 전용(.sr 등)
  const skip = e => !!e.closest('#tm,#tm-btn,#test-banner,.toasts,.toast,[aria-live]') || hidden(e) || !!(e.closest('details:not([open])') && !e.closest('summary')); // 접힌 details 안은 보이지 않는다
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const layer = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky') return x; } return null; };
  const desc = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"');
  const clipOf = (e, r) => { let x = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX)) { const q = p.getBoundingClientRect(); x = { left: Math.max(x.left, q.left), right: Math.min(x.right, q.right), top: Math.max(x.top, q.top), bottom: Math.min(x.bottom, q.bottom) }; } } x.width = x.right - x.left; x.height = x.bottom - x.top; return x.width > 1 && x.height > 1 ? x : null; };
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const out = { overlap: [], cramped: [], overflow: [], ellipsis: [], small: [], contrast: [], tap: [], hscroll: document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth : 0 };
  // 글자 조각: 텍스트 노드마다 실제 그려진 줄의 영역
  const texts = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) { const el = n.parentElement; if (!el || !n.textContent.trim() || skip(el) || !vis(el) || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r0 of rg.getClientRects()) { if (r0.width <= 1 || r0.height <= 1) continue; const r = clipOf(el, r0); if (r) texts.push({ el, r }); } }
  const inter = [...document.body.querySelectorAll('button,a,input,select,[role=button]')].filter(e => !skip(e) && vis(e)).map(el => ({ el, r: clipOf(el, el.getBoundingClientRect()) })).filter(x => x.r);
  // 겹침
  for (const A of inter) {
    for (const T of texts) { if (A.el.contains(T.el) || T.el.contains(A.el) || layer(A.el) !== layer(T.el)) continue; const a = area(A.r, T.r); if (a > 6) out.overlap.push({ a: Math.round(a), what: desc(A.el) + ' ↔ 글자 ' + desc(T.el), y: Math.round(A.r.top) });
      else { const vy = Math.min(A.r.bottom, T.r.bottom) - Math.max(A.r.top, T.r.top), gap = Math.max(T.r.left - A.r.right, A.r.left - T.r.right); if (vy > 4 && gap > -1 && gap < 4) out.cramped.push({ gap: +gap.toFixed(1), what: desc(A.el) + ' ↔ 글자 ' + desc(T.el), y: Math.round(A.r.top) }); } }
    for (const B of inter) { if (A === B || A.el.contains(B.el) || B.el.contains(A.el) || layer(A.el) !== layer(B.el) || A.el.compareDocumentPosition(B.el) & 2) continue; const a = area(A.r, B.r); if (a > 6) out.overlap.push({ a: Math.round(a), what: desc(A.el) + ' ↔ 버튼 ' + desc(B.el), y: Math.round(A.r.top) }); }
  }
  // 넘침·잘림
  for (const T of texts) { let box = T.el; while (box && getComputedStyle(box).display === 'inline') box = box.parentElement; if (!box) continue; const br = box.getBoundingClientRect(); if (T.r.right > br.right + 2 || T.r.left < br.left - 2) out.overflow.push({ what: '칸 밖 글자 ' + desc(T.el), y: Math.round(T.r.top) }); if (T.r.right > innerWidth + 1) out.overflow.push({ what: '화면 밖 글자 ' + desc(T.el), y: Math.round(T.r.top) }); }
  for (const e of document.body.querySelectorAll('*')) { if (skip(e) || !vis(e)) continue; const cs = getComputedStyle(e); if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2 && e.textContent.trim() && !e.querySelector('*:not(br):not(span):not(b):not(i):not(small)')) (cs.textOverflow === 'ellipsis' ? out.ellipsis : out.overflow).push({ what: (cs.textOverflow === 'ellipsis' ? '말줄임 ' : '잘린 글자 ') + desc(e), y: Math.round(e.getBoundingClientRect().top) }); }
  // 작은 글씨·명암
  const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return { L: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m[3] == null ? 1 : +m[3] }; };
  const seen = new Set();
  for (const T of texts) {
    if (seen.has(T.el)) continue; seen.add(T.el); const cs = getComputedStyle(T.el); const fs = parseFloat(cs.fontSize);
    if (fs < 12) out.small.push({ px: fs, what: desc(T.el), y: Math.round(T.r.top) });
    const rgb = c => { const m = c.match(/[\d.]+/g); return m ? { c: m.slice(0, 3).map(Number), a: m[3] == null ? 1 : +m[3] } : null; };
    const layers = []; let img = false; for (let x = T.el; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) { img = true; break; } const c = rgb(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; } }
    if (img) continue; let base = [255, 255, 255]; for (let i = layers.length - 1; i >= 0; i--) { const L = layers[i]; base = base.map((v, j) => v * (1 - L.a) + L.c[j] * L.a); }
    const fgc = rgb(cs.color); if (!fgc) continue; const fgm = base.map((v, j) => v * (1 - fgc.a) + fgc.c[j] * fgc.a);
    const lin = a => { const [r, g, b] = a.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const bg = { L: lin(base) }, fg = { L: lin(fgm) };
    const ratio = (Math.max(fg.L, bg.L) + 0.05) / (Math.min(fg.L, bg.L) + 0.05); const big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) out.contrast.push({ ratio: +ratio.toFixed(2), what: desc(T.el), y: Math.round(T.r.top) });
  }
  // 작은 버튼
  if (innerWidth < 600) for (const A of inter) if (A.r.height < 32 || A.r.width < 24) out.tap.push({ h: Math.round(A.r.height), w: Math.round(A.r.width), what: desc(A.el), y: Math.round(A.r.top) });
  const uniq = L => { const s = new Set(); return L.filter(x => { const k = x.what; if (s.has(k)) return false; s.add(k); return true; }); };
  for (const k of ['overlap', 'cramped', 'overflow', 'ellipsis', 'small', 'contrast', 'tap']) out[k] = uniq(out[k]);
  return out;
}
module.exports = { auditInPage };
if (require.main === module) (async () => {
  const br = await chromium.launch({ executablePath: EXE });
  const report = {};
  for (const W of WIDTHS) {
    const H = W < 600 ? 844 : 800;
    for (const [name, step] of STATES) {
      const pg = await br.newPage({ viewport: { width: W, height: H }, hasTouch: W < 600, isMobile: W < 600 });
      pg.on('dialog', d => d.accept()); const errs = []; pg.on('pageerror', e => errs.push(e.message));
      try {
        await pg.goto(URL, { waitUntil: 'load', timeout: 30000 }); await pg.waitForTimeout(900);
        await pg.evaluate(() => { try { G.data.seenCoach = true; G.data.seenBreak = true; G.data.tutDone = 1; } catch (e) { } });
        if (step) await pg.evaluate(new Function(step + '; G.sheet && G.sheet.kind === "consfull" && (G.run.consPending = [], G.sheet = null); render();'));
        await pg.mouse.move(1, 1); await pg.waitForTimeout(600);
        const r = await pg.evaluate(auditInPage);
        await pg.screenshot({ path: path.join(OUT, `${W}-${name}.png`), fullPage: true });
        report[`${W}:${name}`] = Object.assign({ errors: errs.slice(0, 3) }, r);
        console.log(`${W} ${name.padEnd(13)} 겹침 ${r.overlap.length} 비좁음 ${r.cramped.length} 넘침 ${r.overflow.length} 말줄임 ${r.ellipsis.length} 작은글씨 ${r.small.length} 명암 ${r.contrast.length} 작은버튼 ${r.tap.length}${r.hscroll ? ' 가로스크롤 ' + r.hscroll : ''}${errs.length ? ' 오류 ' + errs.length : ''}`);
      } catch (e) { report[`${W}:${name}`] = { fail: e.message.slice(0, 200) }; console.log(`${W} ${name} 실패: ${e.message.slice(0, 120)}`); }
      await pg.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await br.close();
})();
