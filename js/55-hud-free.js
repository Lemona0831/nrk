'use strict';
/* ===== 전투 화면 자유 캔버스와 칸 표시 형태 (10월 11일 0.6a.2-120) =====
   배치 방식은 둘이다. 정렬 배치(구역 + 순서, 56-hud-editor.js)가 기본이고, 자유 배치는 전투 화면 전체가 캔버스다.
   저장은 G.data.hud.lay 하나를 넓힌 것이다: { pc, ph (정렬 배치), md: { pc, ph } ('align' | 'free'), fr: { pc, ph } (자유 배치) }. 옛 저장본에는 md · fr이 없고 정렬 배치로 읽는다.
   자유 배치 값(v 2): { v: 2, m: { 모듈 id: { x, y, w, h } }, zo: [id, 뒤에서 앞으로], s: { id: 크기 }, off: [id], pk: 1 | 0, sn: 붙이기 px, gd: 1 | 0, ch: 캔버스 높이 배, au: 1 | 0, lg: 옛 값 }.
   x와 w는 캔버스 폭의 퍼센트, y와 h는 화면 높이(헤더 아래 기본 높이 hfBaseH)의 퍼센트이고 소수점 둘까지다. 창 크기가 바뀌어도 대략 같은 자리에 놓이고 칸 폭은 최소 FREE_MINW px을 지킨다.
   h가 null이면 칸 높이는 내용을 따르고(자동), 숫자면 그 높이로 고정해 안에서 스크롤한다. 칸의 위치 · 크기는 격자에 묶이지 않는다. 겹침은 자유이고 pk가 1일 때만 겹친 칸을 아래로 민다.
   옛 12열 격자 값(v가 없는 { m: { x, y, w } })은 읽을 때 새 좌표로 바꾼다. 원래 값은 lg에 남겨 되돌릴 수 있다. au가 1이면 아직 한 번도 고치지 않은 변환값이라 쌓아 놓은 모양(밀기)으로 그리고, 처음 고치는 순간 지금 보이는 자리를 값으로 굳힌다.
   m.f가 1인 칸은 처음 모양을 굳힐 때 비어 있어 높이 0으로 친 자리표였던 칸이다. 전투 중 그 칸이 나타나면 겹치는 아래 칸들만 밀려 내려가고(굳은 모양이 겹치지 않게), 사용자가 그 칸을 직접 옮기면 f가 0이 된다.
   읽는 순서와 Tab 순서는 늘 논리 순서(HUD_MODS)이고 화면 위치만 CSS로 바꾼다. 화면 순서와 크게 어긋나면 편집기가 알린다(hudFreeReading).
   표시 형태(HUD_VARIANTS)는 칸 하나의 항목 스위치(HUD_ITEMS)를 묶어 정한 것이라 따로 저장하지 않는다(G.data.hud.o를 읽어 어느 형태인지 알아낸다). */
const FREE_OK = 24, FREE_GRAB = 44, FREE_GAP = 6, FREE_MINW = 96, FREE_MINH = 32, FREE_SNAP_R = 6;
const FREE_OLD_COLS = 12, FREE_OLD_ROW = 16;
const FREE_SNAPS = [0, 1, 4, 8, 16], FREE_SNAP_DEF = 4, FREE_CHS = [1, 1.5, 2, 2.5, 3];
const FREE_YMAX = 300;
const HUD_MODE_N = { align: '정렬 배치', free: '자유 배치' };
const HFG = { off: false }; /* 보호선을 끄는 시험용 스위치(사용자 화면에는 없다) */

/* ---------- 표시 형태: 칸 하나의 항목 묶음 ---------- */
const HUD_VARIANTS = {
  'hud-player': [
    { k: 'bar', n: '막대만', d: '생명력 · 스태미나 막대만 보입니다', set: { prev: 0, flk: 0 } },
    { k: 'prev', n: '막대 + 미리보기', d: '막대에 행동을 올리면 예상 변화가 겹쳐 보입니다', set: { prev: 1, flk: 0 } },
    { k: 'all', n: '플라스크 줄까지', d: '미리보기에 남은 플라스크 줄이 더해집니다', set: { prev: 1, flk: 1 } },
  ],
  'hud-classchip': [
    { k: 'off', n: '읽기만', d: '눈에는 숨기고 낭독기만 읽습니다', set: { cls: 0 } },
    { k: 'on', n: '직업 칩 보임', d: '직업 규칙의 자원과 표시가 보입니다', set: { cls: 1 } },
  ],
  'hud-incoming': [
    { k: 'off', n: '읽기만', d: '눈에는 숨기고 낭독기만 읽습니다', set: { inc: 0 } },
    { k: 'num', n: '피해 숫자만', d: '예상 피해 숫자만 한 줄로 보입니다', set: { inc: 1, incx: 0 } },
    { k: 'full', n: '생명력 변화까지', d: '피해 숫자에 "생명력 40 → 30"이 붙습니다', set: { inc: 1, incx: 1 } },
  ],
  'hud-status': [
    { k: 'bad', n: '해로운 것만 3개', d: '내게 걸린 해로운 상태만 세 개까지', set: { sts: 'bad' } },
    { k: 'few', n: '3개까지', d: '상태 칩 세 개까지, 나머지는 +N', set: { sts: 'few' } },
    { k: 'all', n: '모두', d: '걸린 상태를 모두 보입니다', set: { sts: 'all' } },
  ],
  'hud-order': [
    { k: 'line', n: '한 줄', d: '내 차례와 다음 누구만 보입니다', set: { ord: 0 } },
    { k: 'band', n: '순서 띠 전체', d: '이번 라운드와 다음 라운드의 순서 전체', set: { ord: 1 } },
  ],
  'hud-log': [
    { k: 'one', n: '한 줄', d: '가장 새 기록 한 줄만 보입니다', set: { rlog: 1, logpanel: 0, why: 0 } },
    { k: 'three', n: '세 줄', d: '최근 기록 세 줄이 늘 보입니다', set: { rlog: 1, logpanel: 1, why: 0 } },
    { k: 'all', n: '전체', d: '세 줄에 피해의 까닭 줄과 오른쪽 기록 칸까지', set: { rlog: 1, logpanel: 1, why: 1 } },
  ],
  'hud-field': [
    { k: 'brief', n: '요약 카드', d: '이름, 생명력, 예고만 보입니다', set: { edet: 0, iaux: 0 } },
    { k: 'normal', n: '보통', d: '붕괴 줄, 순번, 레벨, 역할이 더해집니다', set: { edet: 1, iaux: 0 } },
    { k: 'full', n: '자세히', d: '예고 옆의 행동 횟수까지 보입니다', set: { edet: 1, iaux: 1 } },
  ],
  'hud-quick': [
    { k: 'off', n: '가방에서만', d: '소모품 빠른 줄을 접고 도구 칸이나 가방에서 씁니다', set: { qcons: 0 } },
    { k: 'on', n: '빠른 줄', d: '지금 쓸 만한 소모품을 한 번에 누르는 줄', set: { qcons: 1 } },
  ],
  'hud-actions': [
    { k: 'core', n: '핵심만(도구 접음)', d: '플라스크 · 소모품 · 도망을 도구 한 칸에 모읍니다', set: { abaux: 0, agl: 0, tools: 1 } },
    { k: 'cost', n: '묶음 이름 + 비용', d: '공격 · 스킬 같은 묶음 제목과 비용 · 쿨타임', set: { abaux: 0, agl: 1, tools: 0 } },
    { k: 'aux', n: '보조 글자 포함', d: '빠르기 표시, 대상, 남은 칸, 진행 속도까지', set: { abaux: 1, agl: 1, tools: 0 } },
  ],
};
function hudVariantOf(id, flags) {
  const vs = HUD_VARIANTS[id]; if (!vs) return null;
  const f = flags || hudCfg();
  return vs.find(v => Object.keys(v.set).every(k => f[k] === v.set[k])) || null;
}
function hudOMap() { const c = hudCfg(); const o = {}; for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = c[it.k]; return o; }

/* ---------- 자유 배치 값 ---------- */
const hfNum = v => typeof v === 'number' && isFinite(v);
const hf2 = v => Math.round(v * 100) / 100;
const hfClamp = (v, a, b) => Math.min(b, Math.max(a, v));
/* 캔버스 기본 높이: 창 높이에서 머리줄을 뺀 값. y와 h 퍼센트의 기준이다 */
function hfBaseH() {
  if (typeof window === 'undefined') return 800;
  const vh = window.innerHeight || 800; const hd = typeof document !== 'undefined' ? document.querySelector('#root .fit > .hdr') : null; const hh = hd ? hd.offsetHeight : 56;
  return Math.max(360, Math.round(vh - hh));
}
function hudModeFor(dev) {
  if (G.hudEd && G.hudEd.draft && G.hudEd.draft.md) return G.hudEd.draft.md[dev] === 'free' ? 'free' : 'align';
  const h = typeof hudRaw === 'function' ? hudRaw() : null;
  if (!h || h.p !== 'custom' || !h.lay || !h.lay.md || typeof h.lay.md !== 'object') return 'align';
  return h.lay.md[dev] === 'free' ? 'free' : 'align';
}
function hudFreeActive() { return hudModeFor(hudDev()) === 'free'; }
function hudFreeEd() { return !!G.hudEd && hudFreeActive(); }
const hfZoDefault = () => HUD_MODS.filter(m => !m.lock).concat(HUD_MODS.filter(m => m.lock)).map(m => m.id);
/* 정렬 배치 A(구역 · 순서)를 자유 배치의 처음 값으로 바꾼다: 휴대폰은 한 줄로 쌓고, PC는 위 왼쪽 · 위 오른쪽을 나란히 둔다.
   y는 쌓는 차례만 정한다(au가 1인 동안은 칸 높이만큼 저절로 벌어져 지금 화면과 같은 흐름이 되고, 처음 고칠 때 보이는 자리로 굳는다) */
function hudFreeDefault(dev, A) {
  const m = {}; const on = k => A.z[k].filter(id => !A.off.includes(id)).length;
  const put = (ids, x, w, r0) => ids.forEach((id, i) => { m[id] = { x, y: hf2((r0 + i) * 0.1), w, h: null }; });
  let r;
  if (dev === 'pc' && on('top1') && on('top2')) { put(A.z.top1, 0, 41.67, 0); put(A.z.top2, 41.67, 58.33, 0); r = Math.max(A.z.top1.length, A.z.top2.length); }
  else { put(A.z.top1, 0, 100, 0); put(A.z.top2, 0, 100, A.z.top1.length); r = A.z.top1.length + A.z.top2.length; }
  put(A.z.mid, 0, 100, r); r += A.z.mid.length; put(A.z.bot, 0, 100, r);
  return { v: 2, m, zo: hfZoDefault(), s: Object.assign({}, A.s), off: A.off.slice(), pk: 0, sn: FREE_SNAP_DEF, gd: 1, ch: 1, au: 1, lg: null };
}
/* 옛 12열 값 한 칸을 새 좌표로 */
function hfFromOld(r, nom) {
  const w = hfClamp(Math.round(r.w), 3, FREE_OLD_COLS); const x = hfClamp(Math.round(r.x), 0, FREE_OLD_COLS - w); const y = hfClamp(Math.round(r.y), 0, 400);
  return { x: hf2(x / FREE_OLD_COLS * 100), y: hf2(y * FREE_OLD_ROW / nom * 100), w: hf2(w / FREE_OLD_COLS * 100), h: null };
}
function hfOldKeep(raw) { /* 옛 값을 되돌릴 수 있게 담아 둔다(숫자만) */
  const m = {}; HUD_MODS.forEach(md => { const r = raw.m[md.id]; if (r && typeof r === 'object' && hfNum(r.x) && hfNum(r.y) && hfNum(r.w)) m[md.id] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w) }; });
  return { m, pk: raw.pk === 0 ? 0 : 1, au: raw.au ? 1 : 0 };
}
/* 어떤 값이 와도 완전한 자유 배치로 만든다: 모르는 id는 버리고, 빠진 칸은 base 값, 좌표는 범위 안 숫자, 크기는 정해진 값만, 끌 수 없는 칸은 늘 켠다 */
function hudFreeNorm(raw, base) {
  const ok = !!raw && typeof raw === 'object' && !!raw.m && typeof raw.m === 'object' && !Array.isArray(raw.m); const v2 = ok && raw.v === 2; const nom = hfBaseH(); const m = {};
  HUD_MODS.forEach(md => {
    const r = ok && raw.m[md.id] && typeof raw.m[md.id] === 'object' ? raw.m[md.id] : null; const b = base.m[md.id];
    let x = b.x, y = b.y, w = b.w, h = b.h, f = 0;
    if (r && v2) { f = r.f === 1 ? 1 : 0; if (hfNum(r.x)) x = r.x; if (hfNum(r.y)) y = r.y; if (hfNum(r.w)) w = r.w; if (r.h === null) h = null; else if (hfNum(r.h)) h = r.h; }
    else if (r && hfNum(r.x) && hfNum(r.y) && hfNum(r.w)) { const o = hfFromOld(r, nom); x = o.x; y = o.y; w = o.w; h = null; }
    w = hf2(hfClamp(w, 5, 100)); x = hf2(hfClamp(x, -100, 100)); y = hf2(hfClamp(y, -50, FREE_YMAX)); h = h == null ? null : hf2(hfClamp(h, 3, 300));
    m[md.id] = f ? { x, y, w, h, f } : { x, y, w, h };
  });
  const s = {}; HUD_MODS.forEach(md => { const v = ok && raw.s ? +raw.s[md.id] : NaN; s[md.id] = HUD_SIZES.includes(v) ? v : (HUD_SIZES.includes(+base.s[md.id]) ? +base.s[md.id] : 100); });
  const off = (ok && Array.isArray(raw.off) ? raw.off : base.off).filter((id, i, a) => HUD_MODS.some(q => q.id === id) && !hudModDef(id).lock && a.indexOf(id) === i);
  let zo = hfZoDefault();
  if (v2 && Array.isArray(raw.zo)) { const seen = new Set(); const z = raw.zo.filter(id => HUD_MODS.some(q => q.id === id) && !seen.has(id) && seen.add(id)); zo = z.concat(hfZoDefault().filter(id => !seen.has(id))); }
  const pk = !ok ? base.pk : v2 ? (raw.pk === 1 ? 1 : 0) : (raw.pk === 0 ? 0 : 1);
  const sn = v2 && FREE_SNAPS.includes(raw.sn) ? raw.sn : FREE_SNAP_DEF; const gd = v2 && raw.gd === 0 ? 0 : 1; const ch = v2 && FREE_CHS.includes(+raw.ch) ? +raw.ch : 1;
  let lg = null; if (v2 && raw.lg && typeof raw.lg === 'object' && raw.lg.m && typeof raw.lg.m === 'object') lg = hfOldKeep(raw.lg); else if (ok && !v2) lg = hfOldKeep(raw);
  return { v: 2, m, zo, s, off, pk, sn, gd, ch, au: ok ? (raw.au ? 1 : 0) : base.au, lg };
}
function hudFreeFor(dev) {
  if (G.hudEd && G.hudEd.draft && G.hudEd.draft.fr && G.hudEd.draft.fr[dev]) return G.hudEd.draft.fr[dev];
  const h = hudRaw(); const raw = h.p === 'custom' && h.lay && h.lay.fr && typeof h.lay.fr === 'object' ? h.lay.fr[dev] : null;
  return hudFreeNorm(raw, hudFreeDefault(dev, hudLayFor(dev)));
}
/* 지금 저장된(또는 편집 중인) 모든 배치. 정렬 배치만 고치는 곳도 자유 배치 값을 잃지 않게 이것으로 쓴다 */
function hudLayAll() {
  return { pc: hudLayFor('pc'), ph: hudLayFor('ph'), md: { pc: hudModeFor('pc'), ph: hudModeFor('ph') }, fr: { pc: hudFreeFor('pc'), ph: hudFreeFor('ph') } };
}
/* 설정 창에서 바로 배치 방식을 바꾼다(편집기 밖) */
function hudModeLive(mode) {
  const dev = hudDev(); const h = hudRaw(); const f = hudFlags(h.p, h.o); const o = {}; for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = f[it.k];
  const lay = hudLayAll(); lay.md[dev] = mode === 'free' ? 'free' : 'align';
  if (mode === 'free' && lay.fr[dev].au) lay.fr[dev] = hudFreeDefault(dev, lay[dev]);
  G.data.hud = Object.assign({ p: 'custom', o, lay }, hudSlotKeep()); saveLocal();
}

/* ---------- 쪽수 · 글 ---------- */
function hfDims() { const cv = typeof document !== 'undefined' ? document.querySelector('[data-fcanvas]') : null; return { cv, W: cv ? cv.clientWidth : 800, H0: hfBaseH() }; }
const hfPxText = (q, W, H0) => '가로 ' + Math.round(q.x / 100 * W) + 'px, 세로 ' + Math.round(q.y / 100 * H0) + 'px, 폭 ' + Math.round(q.w / 100 * W) + 'px, 높이 ' + (q.h == null ? '자동' : Math.round(q.h / 100 * H0) + 'px');
const hfPos = (L, id) => { const d = hfDims(); return hfPxText(L.m[id], d.W, d.H0); };

/* ---------- 그리기 ---------- */
function hudFreeCanvas(html) {
  const dev = hudDev(); const L = hudFreeFor(dev); const ed = G.hudEd; let out = '', quiet = ''; const rank = {}; L.zo.forEach((id, i) => { rank[id] = i + 1; });
  for (const m of HUD_MODS) {
    const id = m.id; const q = L.m[id]; const sz = L.s[id]; const h = html[id]; const empty = !h || !String(h).trim(); const off = L.off.includes(id); const fixed = q.h != null;
    const pos = `--fx:${q.x};--fy:${q.y};--fw:${q.w};${fixed ? `--fh:${q.h};` : ''}--zm:${sz / 100};z-index:${rank[id]}`;
    const cls = `fm${m.lock ? ' fl' : ''}${fixed ? ' fh' : ''}`;
    if (!ed) {
      if (empty || off) continue;
      if (/^\s*<div class="sr"/.test(h)) { quiet += h; continue; }
      out += `<div class="${cls}" data-fm="${id}" style="${pos}"><div class="hmod${m.hm ? ' hm' : ''}${m.mine ? ' mine' : ''}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}" style="zoom:${sz / 100}"` : ''}>${h}</div></div>`;
      continue;
    }
    const hide = !empty && /class="qcons tlz"/.test(h);
    const why = off ? '꺼져 있습니다' : empty ? '지금은 비어 있습니다. 상황에 따라 나타납니다' : /^\s*<div class="sr"/.test(h) ? '지금은 눈에 보이지 않습니다' : hide ? '도구 칸 안에 접혀 있습니다' : '';
    const sk = off ? 'off' : empty ? 'empty' : /^\s*<div class="sr"/.test(h) ? 'sr' : 'hide'; /* 자리표 종류: empty만 상황에 따라 나타나는 칸이라 자리를 남긴다 */
    const zm = sz !== 100 ? `zoom:${sz / 100};` : '';
    const inner = why ? `<div class="hmod hstub" data-stub="${sk}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}"` : ''}${zm ? ` style="${zm}"` : ''}><span>${esc(m.n)}: ${why}</span></div>`
      : `<div class="hmod${m.hm ? ' hm' : ''}${m.mine ? ' mine' : ''}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}"` : ''}${zm ? ` style="${zm}"` : ''}>${h}</div>`;
    out += `<div class="${cls}" data-fm="${id}" style="${pos}">${inner}</div>`;
  }
  return `<div class="fcanvas" data-fcanvas style="--ch0:${hfBaseH()}px">${out}${quiet}</div>`;
}

/* ---------- 놓기: 위치는 값이 정하고, 밀기와 화면 안 지키기만 다듬는다 ---------- */
/* R 안에 다른 칸(obs)에 가려지지 않은 n px 네모가 있는가. 빈 네모는 왼쪽 위로 밀면 R의 가장자리나 가린 칸의 오른쪽 · 아래 끝에 닿으므로 그 후보만 본다 */
function hudFreeHasSquare(R, obs, n) {
  const sq = Math.min(n, R.r - R.l, R.b - R.t); if (sq <= 0) return true;
  const xs = [R.l], ys = [R.t]; obs.forEach(o => { xs.push(o.r); ys.push(o.b); });
  for (const x of xs) { if (x < R.l || x + sq > R.r + 0.5) continue;
    for (const y of ys) { if (y < R.t || y + sq > R.b + 0.5) continue;
      if (!obs.some(o => o.l < x + sq && o.r > x && o.t < y + sq && o.b > y)) return true; } }
  return false;
}
/* 밀기: 위에서부터 차례로 놓되, 앞 칸과 가로로 겹치는 칸은 그 바로 아래(틈 FREE_GAP)로 내린다. items: { id, l, w, h, t, y, hm, idx } t는 자기 자리(px). top을 채워 돌려준다 */
function hfPushSolve(items, flagOnly) {
  const order = items.slice().sort((a, b) => a.y - b.y || a.l - b.l || a.idx - b.idx); const placed = [];
  for (const it of order) {
    let flush = -1;
    for (const j of placed) if (j.h > 0 && (!flagOnly || j.flag || j.moved) && j.l < it.l + it.w - 0.5 && it.l < j.l + j.w - 0.5) { const same = j.hm && it.hm && Math.abs(j.l - it.l) < 1 && Math.abs(j.w - it.w) < 1; flush = Math.max(flush, j.top + j.h + (it.h > 0 ? (same ? 0 : FREE_GAP) : 0)); }
    it.top = Math.max(it.t, flush); if (it.top > it.t + 0.5) it.moved = true; placed.push(it);
  }
}
const hfEls = cv => [...cv.querySelectorAll(':scope > .fm')];
/* 칸마다 캔버스 안의 자리(px). offset 값이라 스크롤과 무관하다. stub는 편집 중에만 있는 자리표 */
function hudFreeRectsOf(cv, L) {
  const out = []; hfEls(cv).forEach(el => {
    const id = el.dataset.fm; const w = el.offsetWidth, h = el.offsetHeight; if (w <= 0 || h <= 0) return;
    out.push({ id, l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + w, b: el.offsetTop + h, rank: L.zo.indexOf(id), f: !!L.m[id].f, idx: HUD_MODS.findIndex(m => m.id === id), stub: (el.querySelector(':scope > .hstub') || { dataset: {} }).dataset.stub || '', off: L.off.includes(id) });
  });
  return out;
}
/* 보호선: 잠긴 칸은 (1) 캔버스 안에 24px 네모가 남고 (2) 위에 놓인 다른 칸에 가려지지 않아 24px 네모가 남아야 한다. 어긴 칸을 돌려준다 */
/* 늘 눈에 보이지 않는 자리표(꺼짐 · 읽기만 · 도구 칸에 접힘)는 가리거나 겹치는 일에 세지 않는다. 상황에 따라 나타나는 빈 칸(empty)만 자리를 남긴다 */
const hfGhost = a => !!a.stub && a.stub !== 'empty';
function hfPreBad() { try { if (!hudFreeEd()) return []; const cv = document.querySelector('[data-fcanvas]'); return cv ? hudFreeGuard(cv, hudFreeFor(hudDev())).map(b => b.id) : []; } catch (e) { return []; } }
function hudFreeGuard(cv, L) {
  const W = cv.clientWidth, Hc = cv.offsetHeight; const rs = hudFreeRectsOf(cv, L); const bad = [];
  for (const a of rs) {
    if (!hudModDef(a.id).lock || a.off || hfGhost(a) || a.f) continue;
    const R = { l: Math.max(a.l, 0), r: Math.min(a.r, W), t: Math.max(a.t, 0), b: Math.min(a.b, Hc) };
    if (R.r - R.l < Math.min(FREE_OK, a.r - a.l) - 0.5 || R.b - R.t < Math.min(FREE_OK, a.b - a.t) - 0.5) { bad.push({ id: a.id, why: 'out', by: [] }); continue; }
    const obs = rs.filter(o => o.id !== a.id && !o.off && !hfGhost(o) && !o.f && o.rank > a.rank && o.r > R.l && o.l < R.r && o.b > R.t && o.t < R.b);
    if (!hudFreeHasSquare(R, obs, FREE_OK)) bad.push({ id: a.id, why: 'cover', by: obs.map(o => o.id) });
  }
  return bad;
}
function hudFreePlace(cv) {
  const L = hudFreeFor(hudDev()); const els = hfEls(cv); const H0 = hfBaseH(); const W = cv.clientWidth; const Hc = Math.round(L.ch * H0);
  cv.style.setProperty('--ch0', H0 + 'px'); cv.style.setProperty('--hgs', (L.sn >= 8 ? L.sn : 16) + 'px');
  els.forEach(el => { el.style.top = ''; el.style.left = ''; el.classList.remove('fj', 'fn', 'fz'); });
  if (L.au || L.pk) {
    const items = els.map(el => { const id = el.dataset.fm; const i = HUD_MODS.findIndex(m => m.id === id); return { id, el, l: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight, t: el.offsetTop, y: L.m[id].y, hm: !!HUD_MODS[i].hm, idx: i, top: 0 }; });
    hfPushSolve(items); items.forEach(it => { if (Math.abs(it.top - it.t) > 0.4) it.el.style.top = it.top + 'px'; });
  }
  if (!G.hudEd && !(L.au || L.pk) && L.zo && HUD_MODS.some(m => L.m[m.id].f)) { /* 굳힌 처음 모양에서 비어 있던 칸이 나타나면 겹치는 아래 칸만 민다 */
    const items = els.map(el => { const id = el.dataset.fm; const i = HUD_MODS.findIndex(m => m.id === id); return { id, el, l: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight, t: el.offsetTop, y: el.offsetTop, hm: !!HUD_MODS[i].hm, idx: i, top: 0, flag: !!L.m[id].f, moved: false }; });
    hfPushSolve(items, true); items.forEach(it => { if (Math.abs(it.top - it.t) > 0.4) it.el.style.top = it.top + 'px'; });
  }
  els.forEach(el => { /* 칸의 일부는 캔버스 밖에 나가도 되지만 24px 네모는 안에 남는다 */
    const w = el.offsetWidth, h = el.offsetHeight; const l = el.offsetLeft, t = el.offsetTop;
    const nl = hfClamp(l, FREE_OK - w, Math.max(FREE_OK - w, W - FREE_OK)), nt = hfClamp(t, FREE_OK - h, Math.max(FREE_OK - h, Hc - FREE_OK));
    if (Math.abs(nl - l) > 0.4) el.style.left = nl + 'px'; if (Math.abs(nt - t) > 0.4) el.style.top = nt + 'px';
  });
  const rs = hudFreeRectsOf(cv, L);
  for (const a of rs) { /* 이어 그리는 칸(hm)이 바로 이어 놓이면 전처럼 한 판으로 보인다 */
    if (!HUD_MODS[a.idx].hm || a.stub) continue;
    const b = rs.find(o => o.id !== a.id && !o.stub && HUD_MODS[o.idx].hm && Math.abs(o.l - a.l) < 1 && Math.abs((o.r - o.l) - (a.r - a.l)) < 1 && Math.abs(o.t - a.b) < 0.5);
    if (b) { cv.querySelector(':scope > .fm[data-fm="' + b.id + '"]').classList.add('fj'); cv.querySelector(':scope > .fm[data-fm="' + a.id + '"]').classList.add('fn'); }
  }
  let bottom = 0; rs.forEach(a => { bottom = Math.max(bottom, a.b); });
  cv.style.height = Math.ceil(Math.max(Hc, bottom)) + 'px'; cv.dataset.placed = '1';
  if (!G.hudEd && !HFG.off) hudFreeGuard(cv, L).forEach(v => { if (v.why === 'cover') cv.querySelector(':scope > .fm[data-fm="' + v.id + '"]').classList.add('fz'); }); /* 전투 중 안전망: 가려진 잠긴 칸은 맨 위로 올린다(저장 값은 그대로) */
  return { rs, W, Hc };
}
/* 화면을 다시 그린 직후(render)와 크기가 바뀔 때 부른다 */
let HF_RO = null, HF_RAF = 0, HF_WIN = false;
function hudFreeAfter() {
  if (typeof document === 'undefined') return;
  const cv = document.querySelector('[data-fcanvas]'); if (HF_RO) { HF_RO.disconnect(); }
  if (!cv) return;
  const R = hudFreePlace(cv);
  if (G.hudEd) hudFreeEdAfter(cv, R);
  if (typeof ResizeObserver !== 'undefined') {
    if (!HF_RO) HF_RO = new ResizeObserver(() => { if (HF_RAF) return; HF_RAF = requestAnimationFrame(() => { HF_RAF = 0; const c = document.querySelector('[data-fcanvas]'); if (!c) return; if (G.hudEd && G.hudEd.drag && G.hudEd.drag.started) return; const R2 = hudFreePlace(c); if (G.hudEd) { hudFreeEdAfter(c, R2); if (typeof hudEdPlace === 'function') hudEdPlace(); } }); });
    hfEls(cv).forEach(el => HF_RO.observe(el));
  }
  if (!HF_WIN) { HF_WIN = true; window.addEventListener('resize', () => { if (HF_RAF) return; HF_RAF = requestAnimationFrame(() => { HF_RAF = 0; const c = document.querySelector('[data-fcanvas]'); if (c) { hudFreePlace(c); if (G.hudEd && typeof hudEdPlace === 'function') hudEdPlace(); } }); }); }
}
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { const c = document.querySelector('[data-fcanvas]'); if (c) hudFreePlace(c); } catch (e) { } });

/* ---------- 겹침 · 읽는 순서 ---------- */
/* 겹친 칸: 겹침 허용일 때만. 자리표와 꺼진 칸은 세지 않는다 */
function hudFreeOverlaps(rs) {
  const q = rs.filter(a => !a.stub && !a.off); const hit = new Set();
  for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const a = q[i], b = q[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 8 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 8) { hit.add(a.id); hit.add(b.id); } }
  return [...hit];
}
/* 읽는 순서(= Tab 순서)는 HUD_MODS 순서다. 화면에서 보는 순서가 이와 얼마나 다른지 센다: 가로로 겹치지 않는 두 칸은 왼쪽이 먼저, 가로로 겹치면 위가 먼저. 어긋난 쌍의 수를 돌려준다 */
function hudFreeReading(rs) {
  const q = rs.filter(a => !a.stub); const pairs = [];
  for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
    const a = q[i], b = q[j]; const lo = a.idx < b.idx ? a : b, hi = a.idx < b.idx ? b : a; /* lo가 논리 순서에서 앞 */
    const sepX = lo.r <= hi.l + 1 || hi.r <= lo.l + 1; const visLoFirst = sepX ? lo.l <= hi.l : lo.t <= hi.t + 1;
    if (!visLoFirst) pairs.push([lo.id, hi.id]);
  }
  return pairs;
}
const HF_READ_WARN = 3;
const hfName = id => hudModDef(id).n;
function hudFreeReadText(pairs) {
  if (!pairs.length) return '읽는 순서: 화면에서 보는 순서와 같습니다.';
  const t = '읽는 순서: 화면 순서와 어긋난 칸이 ' + pairs.length + '쌍 있습니다.';
  return pairs.length >= HF_READ_WARN ? t + ' Tab과 낭독기는 논리 순서대로 읽어 따라가기 어려울 수 있습니다. "읽는 순서 보기"를 켜서 번호를 확인하세요.' : t;
}
function hudFreeEdAfter(cv, R) {
  const ed = G.hudEd; if (!ed || !hudFreeActive()) return; const dev = hudDev(); const L = ed.draft.fr[dev];
  if (L.au && !ed.chk) { /* 쌓아 놓은 처음 모양은 편집기에 들어오면 지금 보이는 자리로 굳힌다(처음 고칠 때 칸이 뛰지 않게). 안 고치고 나가면 저장되지 않는다 */
    const clean = !hudEdDirty(); hfBake(L); if (clean) ed.init = JSON.stringify(ed.draft); ed.keep = hudEdKeepSel(); Promise.resolve().then(() => { if (G.hudEd === ed) render(); }); return;
  }
  if (ed.chk) { /* 놓은 직후 검사: 보호선을 어겼으면 놓기 전으로 되돌리고 이유를 알린다 */
    ed.chk = null;
    if (!HFG.off) {
      const pre = ed.pre || []; const bad = hudFreeGuard(cv, L).filter(b => !pre.includes(b.id));
      if (bad.length) {
        hudEdRevert(); const b = bad[0]; const by = b.by.filter((x, i, a) => a.indexOf(x) === i).map(hfName);
        ed.msg = hfName(b.id) + ': ' + (b.why === 'out' ? '그 자리에 놓으면 화면 밖으로 나가 누를 자리가 24px도 남지 않아' : '그 자리에 놓으면 ' + (by.length ? by.join(', ') + ' 칸에 가려져 ' : '') + '누를 자리가 24px도 남지 않아') + ' 원래 자리에 두었습니다';
        ed.announce = false; ed.keep = hudEdKeepSel(); Promise.resolve().then(() => { if (G.hudEd === ed) render(); }); return;
      }
    }
  }
  const ov = L.pk || L.au ? [] : hudFreeOverlaps(R.rs); ed.ovl = ov; const inv = new Map(R.rs.map(a => [a.id, a]));
  document.querySelectorAll('.hov .hbox').forEach(b => {
    const id = b.dataset.hbox; const m = hudModDef(id); const on = ov.includes(id); b.classList.toggle('ovl', on); const q = L.m[id]; const g = inv.get(id);
    const pos = g ? '가로 ' + Math.round(g.l) + 'px, 세로 ' + Math.round(g.t) + 'px, 폭 ' + Math.round(g.r - g.l) + 'px, 높이 ' + (q.h == null ? '자동 ' : '') + Math.round(g.b - g.t) + 'px' : hfPos(L, id);
    const sel = (ed.sels || []).includes(id) || ed.sel === id;
    b.setAttribute('aria-label', `${m.n}, ${pos}, 크기 ${L.s[id]}%, ${L.off.includes(id) ? '꺼짐' : '켜짐'}${m.lock ? ', 끌 수 없음' : ''}${sel ? ', 선택됨' : ''}${on ? ', 다른 칸과 겹침' : ''}`);
  });
  ed.read = hudFreeReading(R.rs);
  if (ed.announce) { ed.announce = false; let m = ed.msg || ''; if (ov.length) m += ' 다른 칸과 겹칩니다: ' + ov.map(hfName).join(', ') + '. 가려진 단추는 누르기 어려울 수 있습니다.'; ed.msg = m; }
  hudRemoteSync();
}

/* ---------- 되돌리기 · 다시 실행 ---------- */
const HF_UNDO_MAX = 80;
function hudEdSnapNow() { const ed = G.hudEd; return JSON.stringify([ed.draft, ed.fo || null]); }
/* key가 같은 값으로 짧은 시간 안에 이어지면(방향키를 계속 누를 때) 한 단계로 묶는다 */
function hudEdUndoPush(key) {
  const ed = G.hudEd; if (!ed) return; const now = Date.now();
  ed.pre = hfPreBad(); /* 놓기 전에 이미 보호선을 어긴 칸(옛 저장값 등)은 새로 어긴 것으로 치지 않는다 */
  if (key && ed.ukey === key && now - (ed.uat || 0) < 700 && ed.undo && ed.undo.length) { ed.uat = now; ed.redo = []; return; }
  ed.undo = ed.undo || []; ed.undo.push(hudEdSnapNow()); if (ed.undo.length > HF_UNDO_MAX) ed.undo.shift(); ed.redo = []; ed.ukey = key || null; ed.uat = now;
}
function hudEdRestore(s) { const ed = G.hudEd; const [d, fo] = JSON.parse(s); ed.draft = d; ed.fo = fo; ed.norm = false; ed.ukey = null; ed.keep = hudEdKeepSel(); }
function hudEdRevert() { const ed = G.hudEd; if (!ed || !ed.undo || !ed.undo.length) return; hudEdRestore(ed.undo.pop()); }
function hudEdUndo() {
  const ed = G.hudEd; if (!ed) return; if (!ed.undo || !ed.undo.length) { hudEdMsg('되돌릴 것이 없습니다'); return; }
  ed.redo = ed.redo || []; ed.redo.push(hudEdSnapNow()); hudEdRestore(ed.undo.pop()); hudEdMsg('한 단계 되돌렸습니다'); render();
}
function hudEdRedo() {
  const ed = G.hudEd; if (!ed) return; if (!ed.redo || !ed.redo.length) { hudEdMsg('다시 실행할 것이 없습니다'); return; }
  ed.undo = ed.undo || []; ed.undo.push(hudEdSnapNow()); hudEdRestore(ed.redo.pop()); hudEdMsg('다시 실행했습니다'); render();
}

/* ---------- 편집 도우미 ---------- */
function hudFreeSay(id) { const L = G.hudEd.draft.fr[hudDev()]; return hudModDef(id).n + ': ' + hfPos(L, id) + '에 놓았습니다'; }
/* 지금 보이는 자리를 값으로 굳힌다(밀기로 쌓아 보이는 상태에서 처음 고칠 때, 밀기를 끌 때). 자리표(stub)는 실제 전투에서 없는 높이 0으로 따져 전투 화면과 같은 모양이 되게 한다 */
function hfBake(L) {
  const { cv, W, H0 } = hfDims(); if (!cv || !(L.au || L.pk)) { L.au = 0; return; }
  const els = hfEls(cv); const items = els.map(el => { const id = el.dataset.fm; const i = HUD_MODS.findIndex(m => m.id === id); const stub = !!el.querySelector(':scope > .hstub'); return { id, l: el.offsetLeft, w: el.offsetWidth, h: stub ? 0 : el.offsetHeight, stub, t: L.m[id].y / 100 * H0, y: L.m[id].y, hm: !!HUD_MODS[i].hm, idx: i, top: 0 }; });
  hfPushSolve(items); items.forEach(it => { const q = L.m[it.id]; q.y = hf2(it.top / H0 * 100); q.x = hf2(it.l / W * 100); q.w = hf2(hfClamp(it.w / W * 100, 5, 100)); if (it.stub) q.f = 1; else delete q.f; });
  L.au = 0; L.pk = 0;
}
/* 모아 놓은 처음 자리(px)를 칸마다 구한다: 처음 모양(au 값)을 지금 칸 높이로 쌓아 본다. 개별 초기화와 화면 안으로 모으기가 쓴다 */
function hfDefaultSpots(dev) {
  const { cv, W, H0 } = hfDims(); if (!cv) return null; const def = hudFreeDefault(dev, hudLayNorm(null, hudBaseLay(HUD_DEFAULT, dev)));
  const items = hfEls(cv).map(el => { const id = el.dataset.fm; const i = HUD_MODS.findIndex(m => m.id === id); const stub = !!el.querySelector(':scope > .hstub'); const d = def.m[id]; const w = d.w / 100 * W; return { id, l: d.x / 100 * W, w, stub, h: stub ? 0 : el.offsetHeight, t: 0, y: d.y, hm: !!HUD_MODS[i].hm, idx: i, top: 0 }; });
  hfPushSolve(items); const out = {}; items.forEach(it => { out[it.id] = it.stub ? { x: hf2(it.l / W * 100), y: hf2(it.top / H0 * 100), w: hf2(it.w / W * 100), h: null, f: 1 } : { x: hf2(it.l / W * 100), y: hf2(it.top / H0 * 100), w: hf2(it.w / W * 100), h: null }; }); return out;
}
/* 칸들의 새 자리를 한 번에 정한다. rects: { id: { l, t, w, h } } 픽셀(없는 쪽은 그대로, h는 숫자면 고정 · null이면 자동). 캔버스 안에 24px는 남게 다듬는다. 바뀌었으면 true */
function hudFreeSetRects(rects, say, o) {
  const ed = G.hudEd; const dev = hudDev(); const L = ed.draft.fr[dev]; o = o || {}; const { cv, W, H0 } = hfDims(); if (!cv) return false; const Hc = Math.round(L.ch * H0);
  const cur = {}; for (const id in rects) { const g = hfGeo(id); if (!g) return false; cur[id] = g; }
  const plan = {}; let changed = false;
  for (const id in rects) {
    const r = rects[id], g = cur[id]; const w = r.w != null ? Math.max(FREE_MINW, Math.min(W, r.w)) : g.w; const hh = r.h === undefined ? undefined : r.h === null ? null : Math.max(FREE_MINH, r.h);
    const hCur = hh === undefined ? (L.m[id].h == null ? g.h : L.m[id].h / 100 * H0) : hh === null ? g.h : hh;
    const l = hfClamp(r.l != null ? r.l : g.l, FREE_OK - w, Math.max(FREE_OK - w, W - FREE_OK)), t = hfClamp(r.t != null ? r.t : g.t, FREE_OK - hCur, Math.max(FREE_OK - hCur, Hc - FREE_OK));
    plan[id] = { l, t, w, h: hh };
    const fixPx = L.m[id].h == null ? g.h : L.m[id].h / 100 * H0;
    if (Math.abs(l - g.l) > 0.3 || Math.abs(t - g.t) > 0.3 || Math.abs(w - g.w) > 0.3 || (hh !== undefined && ((hh === null) !== (L.m[id].h == null) || (hh !== null && Math.abs(hh - fixPx) > 0.3)))) changed = true;
  }
  if (!changed) { const ids = Object.keys(rects); const m = hudModDef(ids[0]); const r = rects[ids[0]], g = cur[ids[0]]; const dir = r.l != null && r.l < g.l ? '더 왼쪽으로 갈 수 없습니다' : r.l != null && r.l > g.l ? '더 오른쪽으로 갈 수 없습니다' : r.t != null && r.t < g.t ? '더 위로 갈 수 없습니다' : r.t != null && r.t > g.t ? '더 아래로 갈 수 없습니다' : r.w != null && r.w < g.w ? '더 좁힐 수 없습니다' : r.w != null && r.w > g.w ? '더 넓힐 수 없습니다' : '바뀐 것이 없습니다'; hudEdMsg((ids.length > 1 ? '선택한 칸 ' + ids.length + '개' : m.n) + ': ' + dir); return false; }
  hudEdUndoPush(o.key);
  for (const id in plan) { const p = plan[id]; const q = L.m[id]; q.x = hf2(p.l / W * 100); q.y = hf2(p.t / H0 * 100); q.w = hf2(hfClamp(p.w / W * 100, 5, 100)); delete q.f; if (p.h !== undefined) q.h = p.h === null ? null : hf2(hfClamp(p.h / H0 * 100, 3, 300)); }
  L.au = 0; ed.chk = { ids: Object.keys(plan) }; ed.announce = true;
  const ids = Object.keys(plan); ed.msg = say ? say : ids.length > 1 ? '선택한 칸 ' + ids.length + '개를 옮겼습니다' : hudFreeSay(ids[0]) + '.';
  ed.focus = ed.keep ? null : (ed.focus || '[data-hbox="' + ids[0] + '"]'); render(); hudRemoteSync(); return true;
}
function hfGeo(id) { const cv = typeof document !== 'undefined' ? document.querySelector('[data-fcanvas]') : null; const el = cv && cv.querySelector(':scope > .fm[data-fm="' + id + '"]'); return el ? { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null; }
/* 고른 칸들(여럿이면 모두)을 dx, dy px 옮긴다 */
function hudFreeMoveBy(ids, dx, dy, o) {
  const r = {}; ids.forEach(id => { const g = hfGeo(id); if (g) r[id] = { l: g.l + dx, t: g.t + dy }; });
  if (!Object.keys(r).length) return false; return hudFreeSetRects(r, null, Object.assign({ key: 'mv:' + ids.join() }, o));
}
function hudFreeSizeBy(ids, dw, dh, o) {
  const r = {}; ids.forEach(id => { const g = hfGeo(id); if (g) r[id] = { w: dw ? g.w + dw : undefined, h: dh ? g.h + dh : undefined }; if (r[id] && dw === 0) delete r[id].w; if (r[id] && dh === 0) delete r[id].h; });
  if (!Object.keys(r).length) return false; return hudFreeSetRects(r, null, Object.assign({ key: 'sz:' + ids.join() }, o));
}
/* 목록에서 고른 칸 하나의 값을 숫자(px)로 바꾼다(리모콘 숫자 칸) */
function hudFreeNum(id, f, v) {
  const g = hfGeo(id); if (!g || !Number.isFinite(v)) return false;
  const r = f === 'x' ? { l: v } : f === 'y' ? { t: v } : f === 'w' ? { w: v } : { h: v }; return hudFreeSetRects({ [id]: r }, null, { key: 'num:' + id + f });
}
function hudFreeNudge(ids, dx, dy) { return hudFreeMoveBy(ids, dx, dy); }
function hudFreeHMode(id, mode) {
  const g = hfGeo(id); if (!g) return; const L = G.hudEd.draft.fr[hudDev()]; const q = L.m[id]; if ((mode === 'fix') === (q.h != null)) { hudEdMsg(hfName(id) + ': 이미 높이 ' + (mode === 'fix' ? '고정' : '자동') + '입니다'); return; }
  if (mode === 'fix') hudFreeSetRects({ [id]: { h: g.h } }, hfName(id) + ': 높이를 ' + Math.round(g.h) + 'px로 고정했습니다. 내용이 넘치면 안에서 스크롤합니다.');
  else hudFreeSetRects({ [id]: { h: null } }, hfName(id) + ': 높이를 내용에 맞춥니다');
}
/* 겹침 순서: 'front' 맨 앞 · 'back' 맨 뒤 · 'up' 한 단계 앞 · 'down' 한 단계 뒤. 여러 칸이면 서로의 앞뒤 차례는 지킨다 */
function hudFreeZ(ids, op) {
  const ed = G.hudEd; const L = ed.draft.fr[hudDev()]; const z = L.zo.slice(); const set = L.zo.filter(id => ids.includes(id));
  let nz;
  if (op === 'front') nz = z.filter(id => !set.includes(id)).concat(set);
  else if (op === 'back') nz = set.concat(z.filter(id => !set.includes(id)));
  else { nz = z.slice(); const idx = i => nz.indexOf(i); if (op === 'up') { for (const id of set.slice().reverse()) { const i = idx(id); if (i < nz.length - 1 && !set.includes(nz[i + 1])) { nz.splice(i, 1); nz.splice(i + 1, 0, id); } } } else { for (const id of set) { const i = idx(id); if (i > 0 && !set.includes(nz[i - 1])) { nz.splice(i, 1); nz.splice(i - 1, 0, id); } } } }
  if (nz.join() === z.join()) { hudEdMsg('더 ' + (op === 'front' || op === 'up' ? '앞' : '뒤') + '으로 갈 수 없습니다'); return false; }
  hudEdUndoPush(); L.zo = nz; L.au = 0; ed.chk = { z: 1 }; ed.announce = true;
  ed.msg = (ids.length > 1 ? '선택한 칸 ' + ids.length + '개' : hfName(ids[0])) + ': ' + { front: '맨 앞으로 보냈습니다', back: '맨 뒤로 보냈습니다', up: '한 단계 앞으로 보냈습니다', down: '한 단계 뒤로 보냈습니다' }[op];
  ed.focus = ed.keep ? null : (ed.focus || '[data-hbox="' + ids[0] + '"]'); render(); hudRemoteSync(); return true;
}
/* 정렬 · 배분 · 같은 크기. ids는 둘 이상(균등 배분은 셋 이상) */
function hudFreeAlign(ids, kind) {
  const g = {}; ids.forEach(id => { const q = hfGeo(id); if (q) g[id] = q; }); const have = Object.keys(g);
  const need = kind === 'dh' || kind === 'dv' ? 3 : 2; if (have.length < need) { hudEdMsg(need === 3 ? '균등하게 나누려면 칸을 셋 이상 고르세요' : '정렬하려면 칸을 둘 이상 고르세요'); return false; }
  const bb = { l: Math.min(...have.map(i => g[i].l)), t: Math.min(...have.map(i => g[i].t)), r: Math.max(...have.map(i => g[i].l + g[i].w)), b: Math.max(...have.map(i => g[i].t + g[i].h)) }; const r = {}; let say;
  if (kind === 'l') { have.forEach(i => { r[i] = { l: bb.l }; }); say = '왼쪽 끝에 맞췄습니다'; }
  else if (kind === 'r') { have.forEach(i => { r[i] = { l: bb.r - g[i].w }; }); say = '오른쪽 끝에 맞췄습니다'; }
  else if (kind === 'c') { const c = (bb.l + bb.r) / 2; have.forEach(i => { r[i] = { l: c - g[i].w / 2 }; }); say = '가로 가운데에 맞췄습니다'; }
  else if (kind === 't') { have.forEach(i => { r[i] = { t: bb.t }; }); say = '위쪽 끝에 맞췄습니다'; }
  else if (kind === 'b') { have.forEach(i => { r[i] = { t: bb.b - g[i].h }; }); say = '아래쪽 끝에 맞췄습니다'; }
  else if (kind === 'm') { const c = (bb.t + bb.b) / 2; have.forEach(i => { r[i] = { t: c - g[i].h / 2 }; }); say = '세로 가운데에 맞췄습니다'; }
  else if (kind === 'dh') { const s = have.slice().sort((a, b) => g[a].l - g[b].l); const tot = s.reduce((n, i) => n + g[i].w, 0); const gap = (bb.r - bb.l - tot) / (s.length - 1); let x = bb.l; s.forEach(i => { r[i] = { l: x }; x += g[i].w + gap; }); say = '가로 간격을 같게 나눴습니다'; }
  else if (kind === 'dv') { const s = have.slice().sort((a, b) => g[a].t - g[b].t); const tot = s.reduce((n, i) => n + g[i].h, 0); const gap = (bb.b - bb.t - tot) / (s.length - 1); let y = bb.t; s.forEach(i => { r[i] = { t: y }; y += g[i].h + gap; }); say = '세로 간격을 같게 나눴습니다'; }
  else if (kind === 'sw') { const ref = g[ids[ids.length - 1]] || g[have[0]]; have.forEach(i => { r[i] = { w: ref.w }; }); say = '폭을 마지막으로 고른 칸에 맞췄습니다'; }
  else if (kind === 'sh') { const ref = g[ids[ids.length - 1]] || g[have[0]]; have.forEach(i => { r[i] = { h: ref.h }; }); say = '높이를 마지막으로 고른 칸에 맞췄습니다(고정 높이)'; }
  else return false;
  return hudFreeSetRects(r, '선택한 칸 ' + have.length + '개: ' + say);
}
/* 설정값: sn 붙이기, gd 정렬선, ch 캔버스 높이 */
function hudFreeOpt(k, v) {
  const ed = G.hudEd; const L = ed.draft.fr[hudDev()]; if (k === 'sn' && !FREE_SNAPS.includes(v)) return; if (k === 'gd') v = v ? 1 : 0; if (k === 'ch' && !FREE_CHS.includes(v)) return;
  if (L[k] === v) { hudEdMsg('이미 그 값입니다'); return; }
  hudEdUndoPush(); L[k] = v; ed.announce = true; ed.keep = hudEdKeepSel();
  ed.msg = k === 'sn' ? (v ? '붙이기 ' + v + 'px' : '붙이기를 껐습니다') : k === 'gd' ? '정렬선을 ' + (v ? '켰습니다' : '껐습니다') : '캔버스 높이를 화면의 ' + v + '배로 정했습니다';
  render(); hudRemoteSync();
}
function hudFreePushSet() {
  const ed = G.hudEd; const L = ed.draft.fr[hudDev()]; hudEdUndoPush(); const wasOn = !!L.pk; if (L.pk || L.au) hfBake(L); /* 끌 때는 지금 보이는 자리를 값으로 굳힌다 */
  L.pk = wasOn ? 0 : 1; if (L.pk) L.au = 0; ed.announce = true; ed.keep = hudEdKeepSel(); ed.chk = { push: 1 };
  ed.msg = L.pk ? '겹치는 칸을 아래로 자동으로 밉니다. 내용이 늘어도 칸이 겹치지 않습니다' : '칸이 서로 겹칠 수 있습니다. 다만 내 생명력 · 스태미나, 적, 행동 버튼, 지금 위험 줄, 보스 시계는 24px 이상 조작할 수 있게 남깁니다'; render();
  hudRemoteSync();
}
function hudFreeSetMode(mode) {
  const ed = G.hudEd; const dev = hudDev(); if (ed.draft.md[dev] === mode) return; hudEdUndoPush(); ed.draft.md[dev] = mode;
  if (mode === 'free' && ed.draft.fr[dev].au) ed.draft.fr[dev] = hudFreeDefault(dev, ed.draft[dev]); /* 한 번도 고치지 않았으면 지금 정렬 배치에서 다시 만든다 */
  ed.announce = true; ed.keep = hudEdKeepSel(); ed.sels = ed.sel ? [ed.sel] : [];
  ed.msg = HUD_MODE_N[mode] + '로 바꿨습니다. ' + (mode === 'free' ? '칸을 끌어 캔버스 어디에든 놓을 수 있습니다. 정렬 배치 값은 그대로 남습니다.' : '자유 배치 값은 그대로 남습니다.');
  render(); hudRemoteSync();
}
function hudFreeNums(on) { const ed = G.hudEd; ed.nums = on == null ? !ed.nums : on; document.documentElement.classList.toggle('hnums', !!ed.nums); hudEdMsg(ed.nums ? '읽는 순서 번호를 보입니다. 1번이 Tab으로 가장 먼저 닿는 칸입니다' : '읽는 순서 번호를 숨깁니다'); }
function hudFreeVariant(id, key) {
  const ed = G.hudEd; const v = (HUD_VARIANTS[id] || []).find(q => q.k === key); if (!v) return;
  hudEdUndoPush(); const o = hudOMap(); Object.assign(o, v.set); ed.fo = o; ed.keep = hudEdKeepSel();
  ed.msg = hudModDef(id).n + ': 표시 형태 ' + v.n + '. ' + v.d; ed.announce = true; render();
  hudRemoteSync();
}
/* 개별 초기화(자유 배치): 그 칸의 자리 · 폭 · 높이 · 크기 · 켜짐을 처음 값으로 */
function hudFreeResetOne(id) {
  const ed = G.hudEd; const dev = hudDev(); const L = ed.draft.fr[dev]; const def = hudFreeDefault(dev, hudLayNorm(null, hudBaseLay(HUD_DEFAULT, dev)));
  hudEdUndoPush(); const spots = hfDefaultSpots(dev);
  L.m[id] = Object.assign({}, spots ? spots[id] : def.m[id]); L.s[id] = def.s[id]; L.off = L.off.filter(x => x !== id); L.au = 0; ed.chk = { ids: [id] }; ed.announce = true;
  ed.msg = hudModDef(id).n + ': 기본값으로 되돌렸습니다. 크기 ' + L.s[id] + '%'; ed.focus = ed.keep ? null : '[data-hbox="' + id + '"]'; render();
  hudRemoteSync();
}
function hudFreeResetAll() {
  const ed = G.hudEd; ['pc', 'ph'].forEach(d => { const o = ed.draft.fr[d]; ed.draft.fr[d] = Object.assign(hudFreeDefault(d, hudLayNorm(null, hudBaseLay(HUD_DEFAULT, d))), { sn: o.sn, gd: o.gd, ch: o.ch, lg: o.lg }); }); ed.norm = true;
}
/* 화면 안으로 모으기: 캔버스 밖으로 걸쳐 나간 칸을 기본 자리로 돌린다 */
function hudFreeGather() {
  const ed = G.hudEd; const dev = hudDev(); const L = ed.draft.fr[dev]; const { cv, W } = hfDims(); if (!cv) return;
  const Hc = cv.offsetHeight; const out = HUD_MODS.map(m => m.id).filter(id => { const g = hfGeo(id); return g && (g.l < -0.5 || g.l + g.w > W + 0.5 || g.t < -0.5 || g.t > Hc - FREE_OK); });
  if (!out.length) { hudEdMsg('화면 밖으로 나간 칸이 없습니다'); return; }
  hudEdUndoPush(); const spots = hfDefaultSpots(dev); if (!spots) return;
  out.forEach(id => { L.m[id] = Object.assign({}, spots[id]); }); L.au = 0; ed.chk = { ids: out }; ed.announce = true;
  ed.msg = '화면 밖으로 나간 칸 ' + out.length + '개를 기본 자리로 돌렸습니다: ' + out.map(hfName).join(', '); render(); hudRemoteSync();
}
/* 정렬 배치에서 가져오기: 지금 정렬 배치의 모양을 캔버스 좌표로 바꾼다(붙이기 · 정렬선 · 캔버스 높이 설정은 그대로) */
function hudFreeFromAlign() {
  const ed = G.hudEd; const dev = hudDev(); const o = ed.draft.fr[dev]; hudEdUndoPush();
  ed.draft.fr[dev] = Object.assign(hudFreeDefault(dev, ed.draft[dev]), { sn: o.sn, gd: o.gd, ch: o.ch, lg: o.lg }); ed.announce = true; ed.keep = hudEdKeepSel();
  ed.msg = '지금 정렬 배치의 모양을 자유 배치로 가져왔습니다. 칸을 고치면 보이는 자리가 값으로 굳습니다'; render(); hudRemoteSync();
}
/* 옛 12열 격자 값으로 다시 만들기 */
function hudFreeLegacy() {
  const ed = G.hudEd; const dev = hudDev(); const o = ed.draft.fr[dev]; if (!o.lg) { hudEdMsg('되돌릴 옛 격자 값이 없습니다'); return; }
  hudEdUndoPush(); const raw = { m: o.lg.m, pk: o.lg.pk, au: 0 }; const n = hudFreeNorm(raw, hudFreeDefault(dev, ed.draft[dev]));
  ed.draft.fr[dev] = Object.assign(n, { s: o.s, off: o.off, sn: o.sn, gd: o.gd, ch: o.ch, lg: o.lg }); ed.announce = true; ed.keep = hudEdKeepSel();
  ed.msg = '옛 12열 격자 값에서 다시 만들었습니다'; render(); hudRemoteSync();
}
/* 누르는 순간 칸을 고른다(다시 그리지 않고 틀만 바꾼다). 이어지는 click은 hudEdClick이 건너뛴다 */
function hudFreePressSelect(id, b) {
  const ed = G.hudEd; ed.sels = [id]; ed.sel = id; ed.justSel = { id, at: Date.now() };
  document.querySelectorAll('.hov .hbox').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.classList.toggle('hh', on); x.setAttribute('aria-pressed', String(on)); });
  ed.msg = hfName(id) + ' 선택. ' + hfPos(ed.draft.fr[hudDev()], id); hudRemoteSync();
  if (b && b.focus) { POP.mute = true; try { b.focus({ preventScroll: true }); } finally { POP.mute = false; } }
}
/* 칸 고르기. add면 이미 고른 칸에 더하거나 뺀다 */
function hudFreeSelect(ids, how) {
  const ed = G.hudEd; const cur = ed.sels || (ed.sel ? [ed.sel] : []); let next;
  if (how === 'add') { const id = ids[0]; next = cur.includes(id) ? cur.filter(x => x !== id) : cur.concat([id]); ed.sel = next.includes(id) ? id : (next[next.length - 1] || null); }
  else { next = how === 'union' ? cur.concat(ids.filter(id => !cur.includes(id))) : ids.slice(); ed.sel = next.length ? next[next.length - 1] : null; }
  ed.sels = next;
  ed.msg = next.length > 1 ? '칸 ' + next.length + '개를 골랐습니다: ' + next.map(hfName).join(', ') : next.length ? hfName(next[0]) + ' 선택' : '선택을 풀었습니다';
  ed.focus = ed.keep ? null : (ed.sel ? '[data-hbox="' + ed.sel + '"]' : null); render(); hudRemoteSync();
}

/* ---------- 끌기 · 크기 조절 · 영역 고르기 (마우스 · 펜 · 손가락) ----------
   끄는 동안은 칸과 틀에 transform만 준다(저사양에서도 가볍게). 놓을 때 한 번 값으로 굳히고 다시 그린다. */
function hfFit() { return document.querySelector('#root > .fit'); }
function hfGuides(list, cvr, fit) {
  const ov = document.querySelector('.hov'); if (!ov) return; ov.querySelectorAll('.hguide').forEach(x => x.remove()); if (!list || !list.length) return;
  const fr = fit.getBoundingClientRect(); const ox = fr.left - fit.scrollLeft + fit.clientLeft, oy = fr.top - fit.scrollTop + fit.clientTop;
  list.forEach(g => { const d = document.createElement('div'); d.className = 'hguide ' + g.k; d.setAttribute('aria-hidden', 'true'); if (g.k === 'v') d.style.cssText = `left:${cvr.left + g.p - ox - 1}px;top:${cvr.top - oy}px;height:${cvr.height}px`; else d.style.cssText = `top:${cvr.top + g.p - oy - 1}px;left:${cvr.left - ox}px;width:${cvr.width}px`; ov.appendChild(d); });
}
/* 끌기를 시작할 때 한 번: 움직일 칸들의 처음 자리와 붙을 후보를 잰다 */
function hfDragInit(D) {
  const ed = G.hudEd; const { cv, W } = hfDims(); const L = ed.draft.fr[hudDev()]; const fit = hfFit(); D.cv = cv; D.W = W; D.Hc = cv.offsetHeight; D.fit = fit; D.st0 = fit.scrollTop; D.sl0 = fit.scrollLeft; D.L = L;
  const sels = (ed.sels || []).length && ed.sels.includes(D.id) ? ed.sels : [D.id]; D.ids = D.rs ? [D.id] : sels; D.start = {}; D.ids.forEach(id => { D.start[id] = hfGeo(id); });
  D.tx = [0, W / 2, W]; D.ty = [0, D.Hc / 2, D.Hc]; hfEls(cv).forEach(el => { const id = el.dataset.fm; if (D.ids.includes(id) || L.off.includes(id) || !el.offsetWidth) return; const l = el.offsetLeft, t = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight; D.tx.push(l, l + w / 2, l + w); D.ty.push(t, t + h / 2, t + h); });
  D.els = {}; D.ids.forEach(id => { const fm = cv.querySelector(':scope > .fm[data-fm="' + id + '"]'); D.els[id] = { fm, box: document.querySelector('.hov .hbox[data-hbox="' + id + '"]'), o: fm ? { left: fm.style.left, top: fm.style.top, width: fm.style.width, height: fm.style.height, fh: fm.style.getPropertyValue('--fh'), cls: fm.classList.contains('fh') } : null }; });
}
/* 값 하나(여러 모서리 중 가장 가까운 것)를 후보에 붙인다. 정렬선이 가까우면 정렬선, 아니면 붙이기 격자. 돌려주는 것: { d: 더할 값, g: 정렬선 위치 | null } */
function hfSnap1(vals, targets, L, noSnap) {
  let best = null;
  if (L.gd && !noSnap) for (const v of vals) for (const t of targets) { const d = t - v; if (Math.abs(d) <= FREE_SNAP_R && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, g: t }; }
  if (best) return best;
  if (L.sn > 0 && !noSnap) { const v = vals[0]; return { d: Math.round(v / L.sn) * L.sn - v, g: null }; }
  return { d: 0, g: null };
}
function hfDragStep(D) {
  const ev = D.last; if (!ev || !D.cv) return; const ed = G.hudEd; const L = D.L; const fit = D.fit;
  const dx0 = ev.clientX - D.x0 + (fit.scrollLeft - D.sl0), dy0 = ev.clientY - D.y0 + (fit.scrollTop - D.st0); const noSnap = ev.ctrlKey || ev.metaKey; const gl = [];
  let res;
  if (!D.rs) { /* 이동: 대표 칸의 왼쪽 · 가운데 · 오른쪽과 위 · 가운데 · 아래를 후보에 붙인다 */
    const p = D.start[D.id]; let dx = dx0, dy = dy0;
    const sx = hfSnap1([p.l + dx, p.l + p.w / 2 + dx, p.l + p.w + dx], D.tx, L, noSnap); const sxg = sx.g; if (sxg == null && L.sn > 0 && !noSnap) dx = Math.round((p.l + dx) / L.sn) * L.sn - p.l; else dx += sx.d;
    const sy = hfSnap1([p.t + dy, p.t + p.h / 2 + dy, p.t + p.h + dy], D.ty, L, noSnap); if (sy.g == null && L.sn > 0 && !noSnap) dy = Math.round((p.t + dy) / L.sn) * L.sn - p.t; else dy += sy.d;
    if (sx.g != null) gl.push({ k: 'v', p: sx.g }); if (sy.g != null) gl.push({ k: 'h', p: sy.g });
    const nl = hfClamp(p.l + dx, FREE_GRAB - p.w, Math.max(FREE_GRAB - p.w, D.W - FREE_GRAB)), nt = hfClamp(p.t + dy, FREE_GRAB - p.h, Math.max(FREE_GRAB - p.h, D.Hc - FREE_GRAB)); /* 끌 때는 44px(손가락 크기)가 남게 막아 잡을 조각을 남긴다. 검사 기준 FREE_OK 24px는 그대로 */ dx = nl - p.l; dy = nt - p.t;
    D.ids.forEach(id => { const e = D.els[id]; const s = 'translate(' + dx + 'px,' + dy + 'px)'; if (e.fm) e.fm.style.transform = s; if (e.box) e.box.style.transform = s; });
    res = { dx, dy }; D.read = hfName(D.id) + ' 가로 ' + Math.round(p.l + dx) + ' 세로 ' + Math.round(p.t + dy) + 'px' + (D.ids.length > 1 ? ' 외 ' + (D.ids.length - 1) + '칸' : '');
  } else { /* 크기: 잡은 가장자리(들)만 움직인다. Shift 비율 유지, Alt 가운데 기준 */
    const p = D.start[D.id]; const dir = D.rs; const hasW = dir.includes('w'), hasE = dir.includes('e'), hasN = dir.includes('n'), hasS = dir.includes('s');
    let l = p.l, t = p.t, r = p.l + p.w, b = p.t + p.h; const alt = ev.altKey;
    if (hasW) l += dx0; if (hasE) r += dx0; if (hasN) t += dy0; if (hasS) b += dy0;
    if (alt) { if (hasW) r = p.l + p.w - dx0; if (hasE) l = p.l - dx0; if (hasN) b = p.t + p.h - dy0; if (hasS) t = p.t - dy0; }
    const edgesX = [], edgesY = []; if (hasW || (alt && hasE)) edgesX.push(l); if (hasE || (alt && hasW)) edgesX.push(r); if (hasN || (alt && hasS)) edgesY.push(t); if (hasS || (alt && hasN)) edgesY.push(b);
    const snapEdge = (v, tg) => { const s = hfSnap1([v], tg, L, noSnap); return { v: v + s.d, g: s.g }; };
    if (hasW || (alt && hasE)) { const s = snapEdge(l, D.tx); if (alt && hasE) { const d = s.v - l; l = s.v; r -= d; } else l = s.v; if (s.g != null) gl.push({ k: 'v', p: s.g }); }
    if (hasE || (alt && hasW)) { const s = snapEdge(r, D.tx); if (alt && hasW) { const d = s.v - r; r = s.v; l -= d; } else r = s.v; if (s.g != null) gl.push({ k: 'v', p: s.g }); }
    if (hasN || (alt && hasS)) { const s = snapEdge(t, D.ty); if (alt && hasS) { const d = s.v - t; t = s.v; b -= d; } else t = s.v; if (s.g != null) gl.push({ k: 'h', p: s.g }); }
    if (hasS || (alt && hasN)) { const s = snapEdge(b, D.ty); if (alt && hasN) { const d = s.v - b; b = s.v; t -= d; } else b = s.v; if (s.g != null) gl.push({ k: 'h', p: s.g }); }
    let w = Math.max(FREE_MINW, r - l), h = Math.max(FREE_MINH, b - t);
    if (ev.shiftKey && p.w > 0 && p.h > 0) { const ar = p.w / p.h; if ((hasW || hasE) && (hasN || hasS)) { if (Math.abs(w - p.w) / p.w >= Math.abs(h - p.h) / p.h) h = w / ar; else w = h * ar; } else if (hasW || hasE) h = w / ar; else w = h * ar; w = Math.max(FREE_MINW, w); h = Math.max(FREE_MINH, h); }
    /* 잡은 가장자리의 반대쪽을 고정(Alt면 가운데 고정)해 왼쪽 · 위를 다시 구한다 */
    if (alt) { const cx = p.l + p.w / 2, cy = p.t + p.h / 2; l = cx - w / 2; t = cy - h / 2; } else { if (hasW) l = p.l + p.w - w; else l = p.l; if (hasN) t = p.t + p.h - h; else t = p.t; }
    const vert = hasN || hasS || (ev.shiftKey && (hasW || hasE)); D.vert = vert;
    const e = D.els[D.id]; const st = (el, pos) => { if (!el) return; el.style.left = pos.l + 'px'; el.style.top = pos.t + 'px'; el.style.width = pos.w + 'px'; if (pos.h != null) el.style.height = pos.h + 'px'; };
    if (e.fm) { e.fm.style.transform = ''; st(e.fm, { l, t, w, h: vert ? h : null }); if (vert) { e.fm.classList.add('fh'); e.fm.style.setProperty('--fh', h / hfBaseH() * 100); } }
    if (e.box) { const br = e.box.getBoundingClientRect(); void br; }
    res = { l, t, w, h: vert ? h : null }; D.read = hfName(D.id) + ' 폭 ' + Math.round(w) + ' 높이 ' + Math.round(h) + 'px';
    D.rbox = res;
  }
  D.res = res; hfGuides(gl, D.cv.getBoundingClientRect(), D.fit);
  const g = document.querySelector('.hghost'); if (g) g.textContent = '⠿ ' + D.read;
}
/* 크기를 끄는 동안 틀(.hbox)도 칸을 따라간다: 틀은 칸의 실제 자리를 재서 놓으므로 칸 자리가 바뀐 만큼 다시 붙인다 */
function hudFreeDragMove(ev, D) {
  if (!D.init) { hfDragInit(D); D.init = true; }
  D.last = ev; if (D.raf) return;
  D.raf = requestAnimationFrame(() => { D.raf = 0; hfDragStep(D); if (D.rs) { const ov = document.querySelector('.hov'), fit = hfFit(); if (ov && fit) { const e = D.els[D.id]; if (e && e.fm && e.box) { const r = e.fm.getBoundingClientRect(); const fr = fit.getBoundingClientRect(); e.box.style.left = (r.left - (fr.left - fit.scrollLeft + fit.clientLeft)) + 'px'; e.box.style.top = (r.top - (fr.top - fit.scrollTop + fit.clientTop)) + 'px'; e.box.style.width = r.width + 'px'; e.box.style.height = r.height + 'px'; } } } });
}
/* 끄는 동안 칸에 준 임시 모양(transform · 크기)을 원래대로 돌린다 */
function hfDragUndoStyle(D) { Object.values(D.els || {}).forEach(e => { if (!e.fm || !e.o) return; e.fm.style.transform = ''; e.fm.style.left = e.o.left; e.fm.style.top = e.o.top; e.fm.style.width = e.o.width; e.fm.style.height = e.o.height; if (e.o.fh) e.fm.style.setProperty('--fh', e.o.fh); else e.fm.style.removeProperty('--fh'); e.fm.classList.toggle('fh', e.o.cls); }); }
function hudFreeDragDrop(D, cancel) {
  document.querySelectorAll('.hguide').forEach(x => x.remove());
  if (D.raf) { cancelAnimationFrame(D.raf); D.raf = 0; }
  if (cancel || !D.init) { hudEdMsg('옮기지 않았습니다'); render(); return; }
  hfDragStep(D); const res = D.res; hfDragUndoStyle(D);
  if (!res) { render(); return; }
  if (!D.rs) { if (Math.abs(res.dx) < 0.3 && Math.abs(res.dy) < 0.3) { hudEdMsg('자리가 같아 옮기지 않았습니다'); render(); return; } const r = {}; D.ids.forEach(id => { const s = D.start[id]; r[id] = { l: s.l + res.dx, t: s.t + res.dy }; }); if (!hudFreeSetRects(r, null, { key: null })) render(); }
  else { const r = { [D.id]: { l: res.l, t: res.t, w: res.w } }; if (res.h != null) r[D.id].h = res.h; if (!hudFreeSetRects(r, hfName(D.id) + ': 폭 ' + Math.round(res.w) + 'px' + (res.h != null ? ', 높이 ' + Math.round(res.h) + 'px로 고정' : '') + '로 바꿨습니다.')) render(); }
}
function initHudFree() {
  if (typeof document === 'undefined') return;
  /* 빈 곳을 끌어 영역으로 고르기 */
  let M = null;
  document.addEventListener('pointerdown', ev => {
    if (!hudFreeEd() || M || G.hudEd.drag || (ev.button != null && ev.button > 0) || ev.isPrimary === false) return; const t = ev.target;
    if (t && t.closest && (t.closest('#hremote') || t.closest('.hbox') || t.closest('.askbg') || t.closest('.hdr'))) return;
    const root = document.getElementById('root'); if (!root || !(root.contains(t) || t === document.documentElement || t === document.body)) return;
    M = { pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, add: ev.shiftKey, el: null, moved: false };
  });
  document.addEventListener('pointermove', ev => {
    if (!M || ev.pointerId !== M.pid) return; if (!M.moved && Math.hypot(ev.clientX - M.x0, ev.clientY - M.y0) < 5) return;
    M.moved = true; ev.preventDefault(); if (!M.el) { M.el = document.createElement('div'); M.el.className = 'hmarq'; M.el.setAttribute('aria-hidden', 'true'); document.body.appendChild(M.el); }
    const l = Math.min(M.x0, ev.clientX), t = Math.min(M.y0, ev.clientY); M.el.style.cssText = `left:${l}px;top:${t}px;width:${Math.abs(ev.clientX - M.x0)}px;height:${Math.abs(ev.clientY - M.y0)}px`; M.r = { l, t, r: l + Math.abs(ev.clientX - M.x0), b: t + Math.abs(ev.clientY - M.y0) };
  }, { passive: false });
  const end = (ev, cancel) => {
    if (!M || ev.pointerId !== M.pid) return; const m = M; M = null; if (m.el) m.el.remove(); if (cancel || !G.hudEd) return;
    if (!m.moved) { if (!m.add && (G.hudEd.sels || []).length) hudFreeSelect([], 'set'); return; }
    const ids = [...document.querySelectorAll('.hov .hbox')].filter(b => b.style.display !== 'none').filter(b => { const r = b.getBoundingClientRect(); return r.right > m.r.l && r.left < m.r.r && r.bottom > m.r.t && r.top < m.r.b; }).map(b => b.dataset.hbox);
    hudFreeSelect(ids, m.add ? 'union' : 'set');
  };
  document.addEventListener('pointerup', ev => end(ev, false)); document.addEventListener('pointercancel', ev => end(ev, true));
  /* 손가락으로 끄는 중에는 화면이 같이 스크롤되지 않게 한다 */
  document.addEventListener('touchmove', ev => { const D = G.hudEd && G.hudEd.drag; if (D && D.started && ev.cancelable) ev.preventDefault(); }, { passive: false });
}
