'use strict';
/* ===== 전투 화면 자유 배치와 칸 표시 형태 (10월 10일 0.6a.2-109) =====
   배치 방식은 둘이다. 정렬 배치(구역 + 순서, 56-hud-editor.js)가 기본이고, 자유 배치는 칸마다 가로 열 x(12열 격자), 세로 행 y(한 행 FREE_ROW px), 폭 w(열 수)를 정한다.
   칸 높이는 내용을 따라 자동이라 잘리지 않고, 캔버스 높이는 가장 아래 칸의 아래 끝이며 페이지가 세로로 스크롤한다.
   저장은 G.data.hud.lay 하나를 넓힌 것이다: { pc, ph (정렬 배치), md: { pc, ph } ('align' | 'free'), fr: { pc, ph } (자유 배치) }. 옛 저장본에는 md · fr이 없고 정렬 배치로 읽는다.
   자유 배치 값: { m: { 모듈 id: { x, y, w } }, s: { id: 크기 }, off: [id], pk: 1 | 0 }. 크기와 켜기 · 끄기는 정렬 배치와 따로 가진다.
   pk가 1이면 겹치는 칸을 자동으로 아래로 민다(내용이 늘어도 겹치지 않는다. 기본). 0이면 FF14처럼 겹칠 수 있고, 어느 칸이든 24px 이상 조작할 자리가 남게 밀어낸다(hudFreeSolve).
   읽는 순서와 Tab 순서는 늘 논리 순서(HUD_MODS)이고 화면 위치만 CSS로 바꾼다. 화면 순서와 크게 어긋나면 편집기가 알린다(hudFreeReading).
   표시 형태(HUD_VARIANTS)는 칸 하나의 항목 스위치(HUD_ITEMS)를 묶어 정한 것이라 따로 저장하지 않는다(G.data.hud.o를 읽어 어느 형태인지 알아낸다). */
const FREE_COLS = 12, FREE_ROW = 16, FREE_MINW = 3, FREE_GAP = 6, FREE_OK = 24;
const FREE_ROWS_MAX = 400;
const HUD_MODE_N = { align: '정렬 배치', free: '자유 배치' };

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
function hudModeFor(dev) {
  if (G.hudEd && G.hudEd.draft && G.hudEd.draft.md) return G.hudEd.draft.md[dev] === 'free' ? 'free' : 'align';
  const h = typeof hudRaw === 'function' ? hudRaw() : null;
  if (!h || h.p !== 'custom' || !h.lay || !h.lay.md || typeof h.lay.md !== 'object') return 'align';
  return h.lay.md[dev] === 'free' ? 'free' : 'align';
}
function hudFreeActive() { return hudModeFor(hudDev()) === 'free'; }
function hudFreeEd() { return !!G.hudEd && hudFreeActive(); }
/* 정렬 배치 A(구역 · 순서)를 자유 배치의 처음 값으로 바꾼다: 휴대폰은 한 줄로 쌓고, PC는 위 왼쪽 · 위 오른쪽을 5열 · 7열로 나란히 둔다.
   y는 쌓는 차례만 정한다(겹치는 칸 밀기가 켜져 있으면 칸 높이만큼 저절로 벌어져 지금 화면과 같은 흐름이 된다) */
function hudFreeDefault(dev, A) {
  const m = {}; const on = k => A.z[k].filter(id => !A.off.includes(id)).length;
  const put = (ids, x, w, y0) => ids.forEach((id, i) => { m[id] = { x, y: y0 + i, w }; });
  let y;
  if (dev === 'pc' && on('top1') && on('top2')) { put(A.z.top1, 0, 5, 0); put(A.z.top2, 5, 7, 0); y = Math.max(A.z.top1.length, A.z.top2.length); }
  else { put(A.z.top1, 0, FREE_COLS, 0); put(A.z.top2, 0, FREE_COLS, A.z.top1.length); y = A.z.top1.length + A.z.top2.length; }
  put(A.z.mid, 0, FREE_COLS, y); y += A.z.mid.length; put(A.z.bot, 0, FREE_COLS, y);
  return { m, s: Object.assign({}, A.s), off: A.off.slice(), pk: 1, au: 1 }; /* au: 아직 고치지 않은 변환값(정렬 배치가 바뀌면 다시 만든다) */
}
/* 어떤 값이 와도 완전한 자유 배치로 만든다: 모르는 id는 버리고, 빠진 칸은 base 값, x · w · y는 범위 안 정수, 크기는 정해진 값만, 끌 수 없는 칸은 늘 켠다 */
function hudFreeNorm(raw, base) {
  const ok = raw && typeof raw === 'object' && raw.m && typeof raw.m === 'object'; const m = {};
  HUD_MODS.forEach(md => {
    const r = ok && raw.m[md.id] && typeof raw.m[md.id] === 'object' ? raw.m[md.id] : null; const b = base.m[md.id];
    let w = r && hfNum(r.w) ? Math.round(r.w) : b.w; w = Math.min(FREE_COLS, Math.max(FREE_MINW, w));
    let x = r && hfNum(r.x) ? Math.round(r.x) : b.x; x = Math.min(FREE_COLS - w, Math.max(0, x));
    let y = r && hfNum(r.y) ? Math.round(r.y) : b.y; y = Math.min(FREE_ROWS_MAX, Math.max(0, y));
    m[md.id] = { x, y, w };
  });
  const s = {}; HUD_MODS.forEach(md => { const v = ok && raw.s ? +raw.s[md.id] : NaN; s[md.id] = HUD_SIZES.includes(v) ? v : (HUD_SIZES.includes(+base.s[md.id]) ? +base.s[md.id] : 100); });
  const off = (ok && Array.isArray(raw.off) ? raw.off : base.off).filter((id, i, a) => HUD_MODS.some(q => q.id === id) && !hudModDef(id).lock && a.indexOf(id) === i);
  return { m, s, off, pk: ok ? (raw.pk === 0 ? 0 : 1) : base.pk, au: ok ? (raw.au ? 1 : 0) : base.au };
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

/* ---------- 그리기 ---------- */
const hfPos = (L, id) => { const q = L.m[id]; return q.x + 1 + '열 ' + (q.y + 1) + '행, 폭 ' + q.w + '열'; };
function hudFreeCanvas(html) {
  const dev = hudDev(); const L = hudFreeFor(dev); const ed = G.hudEd; let out = '', quiet = '';
  for (const m of HUD_MODS) {
    const id = m.id; const q = L.m[id]; const sz = L.s[id]; const h = html[id]; const empty = !h || !String(h).trim(); const off = L.off.includes(id);
    const pos = `--fx:${q.x};--fy:${q.y};--fw:${q.w}`;
    if (!ed) {
      if (empty || off) continue;
      if (/^\s*<div class="sr"/.test(h)) { quiet += h; continue; }
      out += `<div class="fm${m.lock ? ' fl' : ''}" data-fm="${id}" style="${pos}"><div class="hmod${m.hm ? ' hm' : ''}${m.mine ? ' mine' : ''}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}" style="zoom:${sz / 100}"` : ''}>${h}</div></div>`;
      continue;
    }
    const hide = !empty && /class="qcons tlz"/.test(h);
    const why = off ? '꺼져 있습니다' : empty ? '지금은 비어 있습니다. 상황에 따라 나타납니다' : /^\s*<div class="sr"/.test(h) ? '지금은 눈에 보이지 않습니다' : hide ? '도구 칸 안에 접혀 있습니다' : '';
    const padd = `padding-top:calc(var(--htag-h,36px)/${sz / 100});`; const zm = sz !== 100 ? `zoom:${sz / 100};` : '';
    const inner = why ? `<div class="hmod hstub" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}"` : ''} style="${zm}${padd}"><span>${esc(m.n)}: ${why}</span></div>`
      : `<div class="hmod${m.hm ? ' hm' : ''}${m.mine ? ' mine' : ''}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}"` : ''} style="${zm}${padd}">${h}</div>`;
    out += `<div class="fm${m.lock ? ' fl' : ''}" data-fm="${id}" style="${pos}">${inner}</div>`;
  }
  return `<div class="fcanvas" data-fcanvas>${out}${quiet}</div>`;
}

/* ---------- 놓기: 칸 높이는 내용이 정한다 ---------- */
const hfOverCols = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w;
/* R 안에 다른 칸(obs)에 가려지지 않은 n px 네모가 있는가. 빈 네모는 왼쪽 위로 밀면 R의 가장자리나 가린 칸의 오른쪽 · 아래 끝에 닿으므로 그 후보만 본다 */
function hudFreeHasSquare(R, obs, n) {
  const sq = Math.min(n, R.r - R.l, R.b - R.t); if (sq <= 0) return true;
  const xs = [R.l], ys = [R.t]; obs.forEach(o => { xs.push(o.r); ys.push(o.b); });
  for (const x of xs) { if (x < R.l || x + sq > R.r + 0.5) continue;
    for (const y of ys) { if (y < R.t || y + sq > R.b + 0.5) continue;
      if (!obs.some(o => o.l < x + sq && o.r > x && o.t < y + sq && o.b > y)) return true; } }
  return false;
}
/* items: [{ id, x, y, w, h, lock, idx }], W: 캔버스 폭(px). 돌려주는 pos[id] = { left, top, width, height }.
   push: 같은 열에 걸친 앞선 칸(y가 작거나 같은 칸) 바로 아래에 붙여 쌓는다. push가 아니면 겹침을 두되, 잠긴 칸에 가려져 24px 네모도 남지 않는 칸이 없게 한다(잠긴 칸은 늘 다른 칸 위에 그려진다. prefer: 지금 놓은 칸, 먼저 움직인다) */
function hudFreeSolve(items, W, push, prefer, quant) {
  const colW = W / FREE_COLS; const order = items.slice().sort((a, b) => a.y - b.y || a.x - b.x || a.idx - b.idx); const placed = [];
  for (const it of order) {
    let top = it.y * FREE_ROW; it.join = false;
    if (push) {
      /* 같은 열에 앞선 칸이 있으면 그 칸 바로 아래에 붙여 쌓는다(y는 차례만 정한다). 앞선 칸이 없는 칸만 y 행에 놓인다. 한 판으로 이어 그리는 칸(hm)이 같은 열에 이어지면 틈이 없다 */
      let flush = -1;
      for (const j of placed) if (j.h > 0 && hfOverCols(j, it)) { const same = j.hm && it.hm && j.x === it.x && j.w === it.w; flush = Math.max(flush, j.top + j.h + (it.h > 0 ? (same ? 0 : FREE_GAP) : 0)); }
      if (flush >= 0) top = flush;
      if (it.h > 0) for (const j of placed) if (j.h > 0 && j.hm && it.hm && j.x === it.x && j.w === it.w && Math.abs(top - (j.top + j.h)) < 0.5) it.join = true;
    }
    if (quant && push) top = Math.ceil(top / FREE_ROW - 1e-6) * FREE_ROW; /* 행 단위로 올림: 값으로 굳힐 때 앞 칸과 겹치지 않게 */
    it.top = top; placed.push(it);
  }
  const moved = []; let failed = false;
  if (!push) {
    const rank = it => (it.lock ? 1000 : 0) + it.idx; const rect = it => ({ l: it.x * colW, r: (it.x + it.w) * colW, t: it.top, b: it.top + it.h });
    for (let k = 0; k < 10; k++) {
      let bad = null, cov = null;
      for (const it of items) {
        if (it.h <= 0) continue; const R = rect(it);
        const hi = items.filter(o => o !== it && o.h > 0 && o.lock && rank(o) > rank(it)).map(o => Object.assign(rect(o), { it: o })).filter(o => o.l < R.r && o.r > R.l && o.t < R.b && o.b > R.t);
        if (!hudFreeHasSquare(R, hi, FREE_OK)) { bad = it; cov = hi.map(o => o.it); break; }
      }
      if (!bad) break;
      let mover, below;
      if (prefer && (bad.id === prefer || cov.some(c => c.id === prefer))) { mover = items.find(o => o.id === prefer); below = bad.id === prefer ? cov : [bad]; }
      else if (!bad.lock) { mover = bad; below = cov; }
      else { mover = cov.slice().sort((a, b) => rank(b) - rank(a))[0]; below = [bad]; }
      const nt = Math.ceil((Math.max(...below.map(o => o.top + o.h)) + FREE_GAP) / FREE_ROW) * FREE_ROW;
      if (mover.top >= nt) { failed = true; break; }
      mover.top = nt; mover.y = nt / FREE_ROW; if (!moved.some(q => q.id === mover.id)) moved.push({ id: mover.id, by: bad.id === mover.id ? cov.map(o => o.id) : [bad.id] });
      if (k === 9) failed = true;
    }
  }
  const pos = {}; let bottom = 0;
  items.forEach(it => { pos[it.id] = { left: it.x * colW, top: it.top, width: it.w * colW, height: it.h, join: it.join }; bottom = Math.max(bottom, it.top + it.h); });
  return { pos, moved, failed, bottom };
}
/* 편집 중에는 칸마다 이름표 자리(안쪽 위 여백)가 늘고 꺼진 칸 · 빈 칸도 자리표로 놓인다. 값으로 굳힐 때는 이것들을 뺀, 전투 중 실제 높이를 쓴다 */
function hudFreePlayH(cv) {
  const out = {}; const fms = [...cv.querySelectorAll(':scope > .fm')]; const inn = fms.map(el => el.querySelector('[data-hmod]')); const saved = inn.map(e => (e ? e.style.paddingTop : ''));
  inn.forEach(e => { if (e) e.style.paddingTop = ''; });
  fms.forEach((el, i) => { out[el.dataset.fm] = inn[i] && inn[i].classList.contains('hstub') ? 0 : el.offsetHeight; });
  inn.forEach((e, i) => { if (e) e.style.paddingTop = saved[i]; });
  return out;
}
function hudFreeItems(cv, L, ov, hs) {
  return [...cv.querySelectorAll(':scope > .fm')].map(el => {
    const id = el.dataset.fm; const q = ov && ov.id === id ? ov : L.m[id]; const idx = HUD_MODS.findIndex(m => m.id === id);
    return { id, x: q.x, y: q.y, w: q.w, h: hs ? hs[id] : el.offsetHeight, lock: !!HUD_MODS[idx].lock, hm: !!HUD_MODS[idx].hm, idx, top: 0, join: false };
  });
}
function hudFreePlace(cv, prefer) {
  const L = hudFreeFor(hudDev()); const push = L.pk !== 0;
  const disp = hudFreeItems(cv, L); /* 화면에 놓인 높이 */
  const items = push || !G.hudEd ? disp : hudFreeItems(cv, L, null, hudFreePlayH(cv)); const R = hudFreeSolve(items, cv.clientWidth, push, prefer); /* 겹침 허용 + 편집 중이면 겹침 · 가림을 전투 중 높이로 따진다 */
  R.bottom = Math.max(...disp.map(it => R.pos[it.id].top + it.h), 0);
  cv.querySelectorAll(':scope > .fm').forEach(el => { el.style.top = R.pos[el.dataset.fm].top + 'px'; el.classList.toggle('fj', !!R.pos[el.dataset.fm].join); });
  cv.querySelectorAll(':scope > .fm').forEach(el => { const me = items.find(i => i.id === el.dataset.fm); el.classList.toggle('fn', !!me && items.some(o => o.join && o.hm && me.hm && o.x === me.x && o.w === me.w && Math.abs(o.top - (me.top + me.h)) < 0.5 && o.id !== me.id)); });
  cv.style.height = Math.ceil(R.bottom) + 'px'; cv.dataset.placed = '1';
  return R;
}
/* 화면을 다시 그린 직후(render)와 크기가 바뀔 때 부른다 */
let HF_RO = null, HF_RAF = 0;
function hudFreeAfter() {
  if (typeof document === 'undefined') return;
  const cv = document.querySelector('[data-fcanvas]'); if (HF_RO) { HF_RO.disconnect(); }
  if (!cv) return;
  const R = hudFreePlace(cv);
  if (G.hudEd) hudFreeEdAfter(cv, R);
  if (typeof ResizeObserver !== 'undefined') {
    if (!HF_RO) HF_RO = new ResizeObserver(() => { if (HF_RAF) return; HF_RAF = requestAnimationFrame(() => { HF_RAF = 0; const c = document.querySelector('[data-fcanvas]'); if (!c) return; const R2 = hudFreePlace(c); if (G.hudEd) { hudFreeEdAfter(c, R2); if (typeof hudEdPlace === 'function') hudEdPlace(); } }); });
    cv.querySelectorAll(':scope > .fm').forEach(el => HF_RO.observe(el));
  }
}
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { const c = document.querySelector('[data-fcanvas]'); if (c) hudFreePlace(c); } catch (e) { } });

/* ---------- 겹침 · 읽는 순서 ---------- */
function hudFreeRects(cv) {
  const out = []; cv.querySelectorAll(':scope > .fm').forEach(el => {
    const id = el.dataset.fm; const inner = el.querySelector('[data-hmod]'); const r = (inner || el).getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push({ id, l: r.left, t: r.top, r: r.right, b: r.bottom, idx: HUD_MODS.findIndex(m => m.id === id) });
  });
  return out;
}
/* 겹친 칸: 겹침 허용일 때만. 전투 중 실제 높이(R.pos)로 따진다 */
function hudFreeOverlaps(R) {
  const rs = Object.keys(R.pos).map(id => ({ id, l: R.pos[id].left, r: R.pos[id].left + R.pos[id].width, t: R.pos[id].top, b: R.pos[id].top + R.pos[id].height })).filter(q => q.b > q.t); const hit = new Set();
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 8 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 8) { hit.add(a.id); hit.add(b.id); } }
  return [...hit];
}
/* 읽는 순서(= Tab 순서)는 HUD_MODS 순서다. 화면에서 보는 순서가 이와 얼마나 다른지 센다: 가로로 겹치지 않는 두 칸은 왼쪽이 먼저, 가로로 겹치면 위가 먼저. 어긋난 쌍의 수를 돌려준다 */
function hudFreeReading(cv) {
  const rs = hudFreeRects(cv); const pairs = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j]; const lo = a.idx < b.idx ? a : b, hi = a.idx < b.idx ? b : a; /* lo가 논리 순서에서 앞 */
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
  if (ed.norm) { ed.norm = false; if (L.pk !== 0) for (const id in R.pos) L.m[id].y = Math.min(FREE_ROWS_MAX, Math.floor(R.pos[id].top / FREE_ROW + 1e-6)); } /* 쌓는 차례만 정했던 y를 지금 보이는 행으로 굳힌다. 다른 칸을 옮길 때 차례를 가르는 기준이 된다 */
  const ov = L.pk !== 0 ? [] : hudFreeOverlaps(R); ed.ovl = ov;
  document.querySelectorAll('.hov .hbox').forEach(b => {
    const on = ov.includes(b.dataset.hbox); b.classList.toggle('ovl', on);
    const lab = b.getAttribute('aria-label') || ''; const had = / 겹침$/.test(lab); if (on && !had) b.setAttribute('aria-label', lab + ', 다른 칸과 겹침'); else if (!on && /, 다른 칸과 겹침/.test(lab)) b.setAttribute('aria-label', lab.replace(', 다른 칸과 겹침', ''));
  });
  ed.read = hudFreeReading(cv);
  if (ed.announce) { ed.announce = false; let m = ed.msg || ''; if (ov.length) m += ' 다른 칸과 겹칩니다: ' + ov.map(hfName).join(', ') + '. 가려진 단추는 누르기 어려울 수 있습니다.'; if (R.moved.length && ed.pushMsg) m += ' ' + ed.pushMsg; ed.pushMsg = ''; ed.msg = m; }
  hudRemoteSync();
}

/* ---------- 편집 도우미 ---------- */
function hudEdSnapNow() { const ed = G.hudEd; return JSON.stringify([ed.draft, ed.fo || null]); }
function hudEdUndoPush() { const ed = G.hudEd; if (!ed) return; ed.hist = { s: hudEdSnapNow(), redo: false }; }
function hudEdUndo() {
  const ed = G.hudEd; if (!ed || !ed.hist) return; const h = ed.hist; const cur = hudEdSnapNow(); const [d, fo] = JSON.parse(h.s);
  ed.draft = d; ed.fo = fo; ed.hist = { s: cur, redo: !h.redo }; ed.norm = false; ed.keep = hudEdKeepSel();
  hudEdMsg(h.redo ? '다시 했습니다' : '한 단계 되돌렸습니다'); render();
}
function hudFreeSay(id) { const L = G.hudEd.draft.fr[hudDev()]; return hudModDef(id).n + ': ' + hfPos(L, id) + '에 놓았습니다'; }
/* 한 칸의 x · y · w를 바꾼다. 놓을 자리가 칸을 가리면 밀어 놓고 이유를 알린다. 놓을 수 없으면 원래 자리로 둔다. 바뀌었으면 true */
function hudFreeTry(id, patch, how) {
  const ed = G.hudEd; const dev = hudDev(); const L = ed.draft.fr[dev]; const old = L.m[id]; const m = hudModDef(id);
  let w = patch.w != null ? patch.w : old.w; w = Math.min(FREE_COLS, Math.max(FREE_MINW, Math.round(w)));
  let x = patch.x != null ? patch.x : old.x; x = Math.min(FREE_COLS - w, Math.max(0, Math.round(x)));
  let y = patch.y != null ? patch.y : old.y; y = Math.min(FREE_ROWS_MAX, Math.max(0, Math.round(y)));
  if (x === old.x && y === old.y && w === old.w) {
    const dir = patch.x != null && patch.x < old.x ? '더 왼쪽으로 갈 수 없습니다' : patch.x != null && patch.x > old.x ? '더 오른쪽으로 갈 수 없습니다' : patch.y != null && patch.y < old.y ? '더 위로 갈 수 없습니다' : patch.y != null && patch.y > old.y ? '더 아래로 갈 수 없습니다' : patch.w != null && patch.w < old.w ? '더 좁힐 수 없습니다' : '더 넓힐 수 없습니다';
    hudEdMsg(m.n + ': ' + dir + '. ' + hfPos(L, id)); return false;
  }
  hudEdUndoPush(); let note = '';
  const cv = document.querySelector('[data-fcanvas]');
  if (cv && L.pk === 0) {
    const items = hudFreeItems(cv, L, { id, x, y, w }, hudFreePlayH(cv)); const Rr = hudFreeSolve(items, cv.clientWidth, false, id);
    if (Rr.failed) { ed.hist = null; hudEdMsg(m.n + ': 그 자리에 놓으면 다른 칸을 조작할 수 없게 되어 원래 자리에 두었습니다'); return false; }
    const mv = Rr.moved.find(q => q.id === id); if (mv) { y = Math.round(Rr.pos[id].top / FREE_ROW); note = ' 자리 조정: ' + hfName(id) + ' 칸을 아래로 밀었습니다. 조작할 수 없게 가려지는 칸이 생겨서입니다.'; }
  }
  L.m[id] = { x, y, w }; L.au = 0; ed.norm = true; ed.announce = true; ed.pushMsg = note.trim();
  ed.msg = hudFreeSay(id) + '.' + note; ed.focus = ed.keep ? null : (ed.focus || '[data-hbox="' + id + '"]'); render();
  hudRemoteSync();
  return true;
}
/* 밀기가 켜져 있으면 위치는 쌓는 차례가 정하므로, 위 · 아래 이동은 같은 열의 이웃 칸과 차례를 바꾸는 것이다(Shift는 네 칸 건너) */
function hudFreeReorder(id, n) {
  const ed = G.hudEd; const L = ed.draft.fr[hudDev()]; const cv = document.querySelector('[data-fcanvas]'); const m = hudModDef(id); const me = L.m[id];
  const items = cv ? hudFreeItems(cv, L) : []; const grp = items.filter(i => (i.id === id || (i.h > 0 && hfOverCols(i, me))));
  grp.sort((a, b) => a.y - b.y || a.x - b.x || a.idx - b.idx); const at = grp.findIndex(i => i.id === id); const to = Math.max(0, Math.min(grp.length - 1, at + n));
  if (to === at) { hudEdMsg(m.n + ': 더 ' + (n < 0 ? '위로' : '아래로') + ' 갈 수 없습니다. 같은 열에서 이미 ' + (n < 0 ? '맨 위' : '맨 아래') + '입니다'); return false; }
  const nb = grp[to]; let ny = n > 0 ? nb.y + 1 : nb.y - 1;
  if (ny < 0) { grp.forEach(i => { if (i.id !== id) L.m[i.id].y += 2; }); ny = L.m[nb.id].y - 1; }
  return hudFreeTry(id, { y: ny });
}
function hudFreeNudge(id, dx, dy) {
  const L = G.hudEd.draft.fr[hudDev()]; const q = L.m[id];
  if (dy && L.pk !== 0) { hudFreeReorder(id, dy); return; }
  hudFreeTry(id, { x: q.x + dx, y: q.y + dy });
}
function hudFreeSetMode(mode) {
  const ed = G.hudEd; const dev = hudDev(); if (ed.draft.md[dev] === mode) return; hudEdUndoPush(); ed.draft.md[dev] = mode;
  if (mode === 'free' && ed.draft.fr[dev].au) ed.draft.fr[dev] = hudFreeDefault(dev, ed.draft[dev]); /* 한 번도 고치지 않았으면 지금 정렬 배치에서 다시 만든다 */
  ed.norm = mode === 'free'; ed.announce = true; ed.keep = hudEdKeepSel();
  ed.msg = HUD_MODE_N[mode] + '로 바꿨습니다. ' + (mode === 'free' ? '칸을 끌어 어디에든 놓을 수 있습니다. 정렬 배치 값은 그대로 남습니다.' : '자유 배치 값은 그대로 남습니다.');
  render(); hudRemoteSync();
}
function hudFreePushSet() {
  const ed = G.hudEd; const L = ed.draft.fr[hudDev()]; hudEdUndoPush();
  if (L.pk !== 0) { /* 밀기를 끄기 전에 편집 화면에 보이는 자리를 값으로 굳힌다(안 그러면 쌓는 차례만 정한 y가 서로 겹친다). 칸의 왼쪽 위 자리가 그대로 남고, 전투 중에는 칸이 조금 낮아 사이가 벌어진다 */
    const cv = document.querySelector('[data-fcanvas]'); if (cv) { const R = hudFreeSolve(hudFreeItems(cv, L), cv.clientWidth, true, null, true); for (const id in R.pos) L.m[id].y = Math.min(FREE_ROWS_MAX, Math.round(R.pos[id].top / FREE_ROW)); }
  }
  L.pk = L.pk === 0 ? 1 : 0; ed.norm = L.pk !== 0; ed.announce = true; ed.keep = hudEdKeepSel(); L.au = 0;
  ed.msg = L.pk !== 0 ? '겹치는 칸을 자동으로 밉니다' : '칸이 서로 겹칠 수 있습니다. 다만 어느 칸이든 24px 이상은 조작할 수 있게 남깁니다'; render();
  hudRemoteSync();
}
function hudFreeNums(on) { const ed = G.hudEd; ed.nums = on == null ? !ed.nums : on; document.documentElement.classList.toggle('hnums', !!ed.nums); hudEdMsg(ed.nums ? '읽는 순서 번호를 보입니다. 1번이 Tab으로 가장 먼저 닿는 칸입니다' : '읽는 순서 번호를 숨깁니다'); }
function hudFreeVariant(id, key) {
  const ed = G.hudEd; const v = (HUD_VARIANTS[id] || []).find(q => q.k === key); if (!v) return;
  hudEdUndoPush(); const o = hudOMap(); Object.assign(o, v.set); ed.fo = o; ed.keep = hudEdKeepSel();
  ed.msg = hudModDef(id).n + ': 표시 형태 ' + v.n + '. ' + v.d; ed.announce = true; render();
  hudRemoteSync();
}
/* 개별 초기화(자유 배치): 그 칸의 자리 · 폭 · 크기 · 켜짐을 처음 값으로 */
function hudFreeResetOne(id) {
  const ed = G.hudEd; const dev = hudDev(); const L = ed.draft.fr[dev]; const def = hudFreeDefault(dev, hudLayNorm(null, hudBaseLay(HUD_DEFAULT, dev)));
  hudEdUndoPush(); L.m[id] = Object.assign({}, def.m[id]); L.s[id] = def.s[id]; L.off = L.off.filter(x => x !== id); ed.norm = true; ed.announce = true; L.au = 0;
  ed.msg = hudModDef(id).n + ': 기본값으로 되돌렸습니다. ' + hfPos(L, id) + ', 크기 ' + L.s[id] + '%'; ed.focus = ed.keep ? null : '[data-hbox="' + id + '"]'; render();
  hudRemoteSync();
}
function hudFreeResetAll() {
  const ed = G.hudEd; ['pc', 'ph'].forEach(d => { ed.draft.fr[d] = hudFreeDefault(d, hudLayNorm(null, hudBaseLay(HUD_DEFAULT, d))); }); ed.norm = true;
}

/* ---------- 끌기 · 폭 조절 ---------- */
function hudFreeGeom(D) {
  const cv = document.querySelector('[data-fcanvas]'); if (!cv) return null; const r = cv.getBoundingClientRect();
  return { cv, left: r.left + 3, top: r.top, colW: cv.clientWidth / FREE_COLS };
}
/* 끌어 놓을 자리를 미리 보인다. 지금 포인터 위치로 x · y(또는 폭)를 정하고, 놓은 뒤의 자리를 점선 네모로 그린다 */
function hudFreeDragMove(ev, D) {
  const g = hudFreeGeom(D); if (!g) return; const ed = G.hudEd; const dev = hudDev(); const L = ed.draft.fr[dev]; const q = L.m[D.id]; let x = q.x, y = q.y, w = q.w;
  if (D.rs) {
    const px = Math.round((ev.clientX - g.left) / g.colW);
    if (D.rs === 'r') w = Math.min(FREE_COLS - q.x, Math.max(FREE_MINW, px - q.x));
    else { const nx = Math.max(0, Math.min(q.x + q.w - FREE_MINW, px)); x = nx; w = q.x + q.w - nx; }
  } else {
    if (!D.grab) { const el = g.cv.querySelector(':scope > .fm[data-fm="' + D.id + '"] [data-hmod]'); const r = el ? el.getBoundingClientRect() : null; D.grab = r ? { dx: D.x0 - r.left, dy: D.y0 - r.top } : { dx: 0, dy: 0 }; }
    x = Math.min(FREE_COLS - q.w, Math.max(0, Math.round((ev.clientX - D.grab.dx - g.left) / g.colW)));
    y = Math.min(FREE_ROWS_MAX, Math.max(0, Math.round((ev.clientY - D.grab.dy - g.top) / FREE_ROW)));
  }
  D.cand = { x, y, w };
  const items = hudFreeItems(g.cv, L, { id: D.id, x, y, w }, L.pk !== 0 ? null : hudFreePlayH(g.cv)); const R = hudFreeSolve(items, g.cv.clientWidth, L.pk !== 0, D.id); const p = R.pos[D.id];
  const ov = document.querySelector('.hov'); if (!ov) return; let box = ov.querySelector('.hdrop');
  if (!box) { box = document.createElement('div'); box.className = 'hdrop'; box.setAttribute('aria-hidden', 'true'); ov.appendChild(box); }
  const fit = document.querySelector('#root > .fit'); const fr = fit.getBoundingClientRect(); const ox = fr.left - fit.scrollLeft + fit.clientLeft; const oy = fr.top - fit.scrollTop + fit.clientTop;
  box.style.cssText = `left:${g.left + p.left - ox}px;top:${g.top + p.top - oy}px;width:${p.width - 6}px;height:${Math.max(p.height, 24)}px`;
  const hit = Object.keys(R.pos).some(k => k !== D.id && R.pos[k].height > 0 && p.height > 0 && L.pk === 0 && Math.min(p.left + p.width, R.pos[k].left + R.pos[k].width) - Math.max(p.left, R.pos[k].left) > 8 && Math.min(p.top + p.height, R.pos[k].top + R.pos[k].height) - Math.max(p.top, R.pos[k].top) > 8);
  box.classList.toggle('ovl', hit); box.dataset.t = (x + 1) + '열 ' + (y + 1) + '행 폭 ' + w + '열' + (hit ? ' 겹침' : '');
}
function hudFreeDragDrop(D, cancel) {
  document.querySelectorAll('.hdrop').forEach(x => x.remove());
  if (cancel || !D.cand) { hudEdMsg('옮기지 않았습니다'); return; }
  const q = G.hudEd.draft.fr[hudDev()].m[D.id]; const c = D.cand;
  if (c.x === q.x && c.y === q.y && c.w === q.w) { hudEdMsg('자리가 같아 옮기지 않았습니다'); return; }
  hudFreeTry(D.id, c);
}
function initHudFree() { /* 숫자 칸 · 표시 형태는 리모콘(remote/ui.js)이 보내는 명령으로 받는다(js/57-hud-remote.js) */ }
