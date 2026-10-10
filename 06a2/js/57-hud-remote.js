'use strict';
/* ===== 편집기 리모콘: 게임 쪽 (10월 10일 0.6a.2-113) =====
   조작판(remote/ui.js)은 게임 코드를 모른다. 이 파일이 둘을 잇는다.
   (1) hudRemoteState: 지금 편집기 상태(칸 목록 · 선택 · 크기 · 켜짐 · 표시 형태 · 배치 방식 · 배열 칸 · 되돌리기 · 읽는 순서)를 JSON으로 만든다.
   (2) hudRemoteCmd: 조작판이 보낸 명령을 검사해 편집기 함수로 옮긴다. 값은 여기서 다시 검사한다(명령은 다른 창에서도 온다).
   (3) 떠 있는 패널(#hremote): 머리줄을 끌어 옮기고, 방향키로도 옮기고, 접고, 바탕 투명도를 고른다. 자리 · 접힘 · 투명도는 G.data.hud.remote[pc | ph]에 저장한다(옛 저장본에는 없고 기본값).
   (4) 별도 페이지(remote.html)와의 연결: remote/link.js의 BroadcastChannel(없으면 storage 이벤트). 게임 창만 G를 고친다. 페이지는 상태를 받아 그리고 명령만 보낸다.
       메시지: hello(페이지 → 게임) · state / idle / end(게임 → 페이지, gid 포함) · cmd(페이지 → 게임, gid가 같을 때만). 편집 중에는 2초마다 상태를 다시 보내 끊김을 알린다. */
const HUDR = { ui: null, el: null, link: null, gid: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), since: 0, seq: 0, hb: 0, pend: 0, winAt: 0, docked: false, noDock: false, cmd: false, pos: null, corner: 'br', win: null, S: null, remoteAt: 0 };
const HUDR_M = 12;

/* ---------- 상태 ---------- */
function hudRemoteState() {
  const ed = G.hudEd; if (!ed) return { active: false };
  const dev = hudDev(); const free = hudFreeActive(); const L = hudEdLayNow(); const id = ed.sel; const m = id ? hudModDef(id) : null;
  let sel = null;
  if (m) {
    const vs = HUD_VARIANTS[id]; const cur = vs ? hudVariantOf(id) : null;
    sel = { id, n: m.n, size: L.s[id], off: L.off.includes(id), lock: !!m.lock, pos: hudEdPosText(L, id), vars: vs ? vs.map(v => ({ k: v.k, n: v.n, d: v.d })) : null, varKey: cur ? cur.k : (vs ? 'x' : ''),
      varDesc: !vs ? m.n + ': 형태를 바꿀 항목이 없습니다.' : cur ? cur.d + (m.lock ? ' 핵심 정보는 어느 형태에서도 보입니다.' : '') : '항목 스위치를 직접 골라 둔 상태입니다. 형태를 고르면 이 칸의 항목이 한꺼번에 정해집니다.' };
    if (free) { const g = hfGeo(id); const q = L.m[id]; sel.x = g ? Math.round(g.l) : 0; sel.y = g ? Math.round(g.t) : 0; sel.w = g ? Math.round(g.w) : 0; sel.h = g ? Math.round(g.h) : 0; sel.hm = q.h == null ? 'auto' : 'fix'; sel.z = L.zo.indexOf(id) + 1; }
  }
  const groups = HUD_ED_GRP.map(([n, ids]) => { const un = ids.filter(i => !hudModDef(i).lock); const on = un.filter(i => !L.off.includes(i)); return { n, total: ids.length, dis: !un.length, state: !un.length || on.length === un.length ? 'all' : on.length ? 'some' : 'none' }; });
  const sl = hudSlots();
  return {
    v: 1, active: true, since: HUDR.since, dev, sample: !!ed.sample, dirty: hudEdDirty(), msg: ed.msg || '', note: hudEdNoteText(), mode: free ? 'free' : 'align',
    mods: HUD_MODS.map(q => ({ id: q.id, n: q.n, off: L.off.includes(q.id) })), sel, sizes: HUD_SIZES.slice(), groups,
    multi: (ed.sels || []).length, free: { pk: free ? ed.draft.fr[dev].pk === 1 : false, au: free ? !!ed.draft.fr[dev].au : false, nums: !!ed.nums, readN: (ed.read || []).length, readText: hudFreeReadText(ed.read || []), sn: free ? ed.draft.fr[dev].sn : FREE_SNAP_DEF, gd: free ? ed.draft.fr[dev].gd === 1 : true, ch: free ? ed.draft.fr[dev].ch : 1, legacy: free ? !!ed.draft.fr[dev].lg : false, ovl: (ed.ovl || []).map(i => hfName(i)), zn: free ? ed.draft.fr[dev].zo.length : 0 },
    grid: !!ed.grid, slots: sl.map((s, i) => (s ? { t: s.t, diff: !hudLaySame(ed.draft, hudSlotLay(s)) } : null)), slot: ed.slot == null ? null : ed.slot, noAsk: !!(G.data && G.data.hudNoAsk),
    presets: HUD_NAMES.map(k => ({ k, n: HUD_LAB[k] })), canUndo: !!(ed.undo && ed.undo.length), canRedo: !!(ed.redo && ed.redo.length), lim: { minw: FREE_MINW, minh: FREE_MINH, snaps: FREE_SNAPS.slice(), chs: FREE_CHS.slice(), ok: FREE_OK, ext: 4000 },
  };
}
/* 판이 바뀐 것을 판(떠 있는 패널)과 별도 페이지에 알린다 */
function hudRemoteSync() {
  if (!G.hudEd) return; const S = hudRemoteState(); HUDR.S = S;
  if (HUDR.ui) { HUDR.ui.setState(S); HUDR.ui.setStatus(S.msg); }
  hudRemotePub(false);
}
function hudRemotePost() { if (HUDR.link && HUDR.S && G.hudEd) HUDR.link.post({ t: 'state', gid: HUDR.gid, since: HUDR.since, seq: ++HUDR.seq, ts: Date.now(), S: HUDR.S }); }
function hudRemotePub(now) {
  if (!HUDR.link) return;
  if (now) { if (HUDR.pend) { clearTimeout(HUDR.pend); HUDR.pend = 0; } hudRemotePost(); return; }
  if (!HUDR.pend) HUDR.pend = setTimeout(() => { HUDR.pend = 0; hudRemotePost(); }, 40);
}
function hudRemoteKeep() { return !!HUDR.cmd || !!(HUDR.el && document.activeElement && HUDR.el.contains(document.activeElement)); }

/* ---------- 명령 ---------- */
function hudRemoteCmd(c) {
  const ed = G.hudEd; if (!ed || !c || typeof c !== 'object') return false;
  const k = typeof c.c === 'string' ? c.c : ''; const id = ed.sel; const int = v => Number.isInteger(v);
  HUDR.cmd = true; ed.keep = true;
  try {
    if (k === 'sel') {
      if (typeof c.id === 'string' && c.id && HUD_MODS.some(q => q.id === c.id) && c.add && hudFreeActive()) hudFreeSelect([c.id], 'add');
      else if (typeof c.id === 'string' && c.id && HUD_MODS.some(q => q.id === c.id)) { if (ed.sel !== c.id || (ed.sels || []).length > 1) { ed.sel = null; ed.sels = []; hudEdSelect(c.id); const bx = document.querySelector('.hov [data-hbox="' + c.id + '"]'); if (bx && bx.scrollIntoView) bx.scrollIntoView({ block: 'nearest' }); hudRemotePlace(); } }
      else if (c.id === '' && ed.sel) hudEdSelect(ed.sel);
    }
    else if (k === 'save') hudEdSave();
    else if (k === 'cancel') hudEdCancel(true);
    else if (k === 'list') hudEdToList(true);
    else if (k === 'undock') { HUDR.noDock = true; hudRemoteDock(false); }
    else if (k === 'undo') hudEdUndo();
    else if (k === 'redo') hudEdRedo();
    else if (k === 'selall') { if (hudFreeActive()) hudFreeSelect(HUD_MODS.map(q => q.id).filter(i => !ed.draft.fr[hudDev()].off.includes(i)), 'set'); }
    else if (k === 'selnone') { if (hudFreeActive()) hudFreeSelect([], 'set'); }
    else if (k === 'snap') { if (hudFreeActive() && FREE_SNAPS.includes(c.v)) hudFreeOpt('sn', c.v); }
    else if (k === 'guide') { if (hudFreeActive()) hudFreeOpt('gd', c.on ? 1 : 0); }
    else if (k === 'chh') { if (hudFreeActive() && FREE_CHS.includes(c.v)) hudFreeOpt('ch', c.v); }
    else if (k === 'gather') { if (hudFreeActive()) hudFreeGather(); }
    else if (k === 'fromalign') { if (hudFreeActive()) hudFreeFromAlign(); }
    else if (k === 'legacy') { if (hudFreeActive()) hudFreeLegacy(); }
    else if (k === 'reset') hudEdReset();
    else if (k === 'mode') hudFreeSetMode(c.k === 'free' ? 'free' : 'align');
    else if (k === 'push') { if (hudFreeActive()) hudFreePushSet(); }
    else if (k === 'nums') hudFreeNums(!!c.on);
    else if (k === 'grid') { ed.grid = !!c.on; document.documentElement.classList.toggle('hgrid', ed.grid); hudEdMsg(ed.grid ? '격자를 켰습니다' : '격자를 껐습니다'); }
    else if (k === 'group') { if (int(c.gi) && c.gi >= 0 && c.gi < HUD_ED_GRP.length) hudEdGroup(c.gi); }
    else if (k === 'slot') { if (int(c.n) && c.n >= 0 && c.n < HUD_SLOT_N) hudEdSlot(c.n, true); }
    else if (k === 'preset') {
      if (HUD_NAMES.includes(c.k)) { hudEdUndoPush(); const f = hudFlags(c.k, {}); const o = {}; for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = f[it.k]; ed.fo = o; ed.announce = true; ed.msg = '표시 묶음 ' + HUD_LAB[c.k] + '을 골랐습니다. 저장하기 전에는 게임에 적용되지 않습니다'; render(); }
    }
    else if (id) {
      if (k === 'size') { if (HUD_SIZES.includes(c.v)) hudEdSizeSet(id, c.v); }
      else if (k === 'sizestep') hudEdSize(id, c.d < 0 ? -1 : 1);
      else if (k === 'toggle') hudEdToggle(id);
      else if (k === 'resetone') hudEdResetOne(id);
      else if (k === 'var') { if (typeof c.k === 'string' && (HUD_VARIANTS[id] || []).some(v => v.k === c.k)) hudFreeVariant(id, c.k); }
      else if (k === 'move') {
        if (hudFreeActive()) { const st = c.n === 10 ? 10 : 1; const ids = hudEdTargets(id); if (c.d === 'up') hudFreeMoveBy(ids, 0, -st); else if (c.d === 'down') hudFreeMoveBy(ids, 0, st); else if (c.d === 'left') hudFreeMoveBy(ids, -st, 0); else if (c.d === 'right') hudFreeMoveBy(ids, st, 0); }
        else if (c.d === 'up' || c.d === 'down') hudEdStep(id, c.d === 'up' ? -1 : 1, false); else if (c.d === 'left' || c.d === 'right') hudEdZone(id, c.d === 'left' ? -1 : 1, false);
      }
      else if (k === 'num') {
        if (hudFreeActive() && int(c.v) && Math.abs(c.v) <= 4000 && (c.f === 'x' || c.f === 'y' || c.f === 'w' || c.f === 'h')) { const ok = hudFreeNum(id, c.f, c.v); if (!ok) hudRemoteSync(); }
      }
      else if (k === 'hmode') { if (hudFreeActive() && (c.v === 'auto' || c.v === 'fix')) hudFreeHMode(id, c.v); }
      else if (k === 'z') { if (hudFreeActive() && ['front', 'back', 'up', 'down'].includes(c.d)) hudFreeZ(hudEdTargets(id), c.d); }
      else if (k === 'align') { if (hudFreeActive() && ['l', 'c', 'r', 't', 'm', 'b', 'dh', 'dv', 'sw', 'sh'].includes(c.d)) hudFreeAlign(ed.sels || [], c.d); }
    }
    else hudRemoteSync();
  } catch (e) { try { hudEdMsg('리모콘 명령을 처리하지 못했습니다'); } catch (e2) { } }
  finally { HUDR.cmd = false; }
  return true;
}

/* ---------- 떠 있는 패널 ---------- */
function hudRemotePrefs() { const h = G.data && G.data.hud; const r = h && h.remote && typeof h.remote === 'object' ? h.remote[hudDev()] : null; const o = r && typeof r === 'object' ? r : {}; return { x: Number.isFinite(o.x) ? o.x : null, y: Number.isFinite(o.y) ? o.y : null, fold: typeof o.fold === 'boolean' ? o.fold : null, op: HudRemoteUI.OPS.includes(o.op) ? o.op : 100 }; }
function hudRemoteSave(patch) {
  const dev = hudDev(); const h = G.data.hud && typeof G.data.hud === 'object' ? G.data.hud : {}; const r = Object.assign({}, h.remote && typeof h.remote === 'object' ? h.remote : {});
  r[dev] = Object.assign({}, r[dev] || {}, patch); G.data.hud = Object.assign({}, h, { remote: r }); saveLocal();
}
function hudRemoteMake() {
  if (typeof document === 'undefined' || typeof HudRemoteUI === 'undefined') return;
  hudRemoteEnd('replace', true);
  const el = document.createElement('div'); el.id = 'hremote'; document.body.appendChild(el); HUDR.el = el; HUDR.since = Date.now(); HUDR.corner = 'br';
  const pf = hudRemotePrefs(); HUDR.pos = pf.x != null && pf.y != null ? { x: pf.x, y: pf.y } : null;
  HUDR.ui = HudRemoteUI.mount(el, { kind: 'float', canWin: window.innerWidth >= 1000 && typeof window.open === 'function', send: hudRemoteCmd, onPrefs: p => { hudRemoteSave(p); hudRemotePlace(); hudEdPlace(); }, onWin: hudRemoteOpenWin, onDraw: () => { hudRemotePlace(); hudEdPlace(); } });
  HUDR.ui.setPrefs({ fold: pf.fold != null ? pf.fold : window.innerWidth <= HUD_PHONE_MAX, op: pf.op });
  hudRemoteGrip(el);
  HUDR.ui.setState(hudRemoteState()); HUDR.ui.setStatus(G.hudEd.msg || '');
  if (HUDR.hb) clearInterval(HUDR.hb); HUDR.hb = setInterval(() => { if (G.hudEd) hudRemotePub(true); if (HUDR.docked && !hudRemoteWinOn()) hudRemoteDock(false); }, 2000);
  hudRemotePub(true);
  HUDR.docked = false; HUDR.noDock = false; if (hudRemoteWinOn()) hudRemoteDock(true, true);
}
/* 별도 창이 붙으면 떠 있는 패널은 숨기고(리모콘은 한 곳에만), 창이 닫히면 패널을 다시 띄운다 */
function hudRemoteDock(on, quiet) {
  if (!on) HUDR.winAt = 0;
  if (HUDR.docked === !!on) return; HUDR.docked = !!on;
  if (HUDR.el) { HUDR.el.hidden = !!on; HUDR.el.style.display = on ? 'none' : ''; }
  hudRemoteInsets();
  if (HUDR.el && !on) hudRemotePlace();
  if (!quiet && G.hudEd) hudEdMsg(on ? '별도 창의 리모콘으로 옮겼습니다. 창을 닫으면 떠 있는 패널이 다시 나옵니다.' : '별도 창이 닫혀 떠 있는 패널로 돌아왔습니다.');
}
const hudRemoteWinOn = () => !HUDR.noDock && (HUDR.winAt && Date.now() - HUDR.winAt < 8000) || !!(HUDR.win && !HUDR.win.closed);
function hudRemoteEnd(how, quiet) {
  if (HUDR.hb) { clearInterval(HUDR.hb); HUDR.hb = 0; } if (HUDR.pend) { clearTimeout(HUDR.pend); HUDR.pend = 0; }
  if (HUDR.ui) { HUDR.ui.destroy(); HUDR.ui = null; } if (HUDR.el) { HUDR.el.remove(); HUDR.el = null; }
  HUDR.S = null; if (!quiet && HUDR.link) HUDR.link.post({ t: 'end', gid: HUDR.gid, how: how || '' });
}
function hudRemoteClamp(x, y) {
  const el = HUDR.el; const w = el ? el.offsetWidth : 340, h = el ? el.offsetHeight : 300;
  return { x: Math.round(Math.max(0, Math.min(window.innerWidth - w, x))), y: Math.round(Math.max(0, Math.min(window.innerHeight - h, y))) };
}
function hudRemoteApply(p) { const el = HUDR.el; if (!el) return; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; }
/* 칸 선택(또는 초점)을 가리는지 본다: 기본 자리는 오른쪽 아래이고, 고른 칸과 겹치면 겹치지 않는 다른 모서리로 비킨다. 사용자가 직접 옮긴 자리는 건드리지 않는다 */
function hudRemoteTarget() {
  const a = document.activeElement; const fb = a && a.closest ? a.closest('.hov .hbox') : null; const b = document.querySelector('.hov .hbox.on') || fb;
  if (!b || b.style.display === 'none') return null; const r = b.getBoundingClientRect(); return r.width && r.height ? r : null;
}
const hudRemoteOver = (p, w, h, r) => (r ? Math.max(0, Math.min(p.x + w, r.right) - Math.max(p.x, r.left)) * Math.max(0, Math.min(p.y + h, r.bottom) - Math.max(p.y, r.top)) : 0);
function hudRemotePlace() {
  const el = HUDR.el; if (!el) return;
  if (window.innerWidth <= HUD_PHONE_MAX) { el.style.left = ''; el.style.top = ''; hudRemoteInsets(); return; }
  const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, m = HUDR_M;
  const C = { br: { x: vw - w - m, y: vh - h - m }, tr: { x: vw - w - m, y: m + 52 }, bl: { x: m, y: vh - h - m }, tl: { x: m, y: m + 52 } };
  if (HUDR.pos) { hudRemoteApply(hudRemoteClamp(HUDR.pos.x, HUDR.pos.y)); hudRemoteInsets(); return; }
  const r = hudRemoteTarget(); let c = HUDR.corner;
  if (r) { const cur = hudRemoteOver(C[c], w, h, r); if (cur > 0) { let best = c, ba = cur; for (const k of ['br', 'tr', 'bl', 'tl']) { const ar = hudRemoteOver(C[k], w, h, r); if (ar < ba) { ba = ar; best = k; } } c = best; HUDR.corner = c; } }
  hudRemoteApply(hudRemoteClamp(C[c].x, C[c].y)); hudRemoteInsets();
}
/* 휴대폰은 아래에서 올라오는 시트라 전투 화면 칸이 그 위에서 끝나게 높이를 알려 준다. PC는 떠 있어 필요 없다 */
function hudRemoteInsets() {
  const el = HUDR.el; const root = document.documentElement; const ph = window.innerWidth <= HUD_PHONE_MAX;
  const v = ph && el && !HUDR.docked ? Math.ceil(el.getBoundingClientRect().height) + 'px' : '0px';
  if (root.style.getPropertyValue('--hedbar-h') !== v) root.style.setProperty('--hedbar-h', v);
}
function hudRemoteGrip(el) {
  const grip = el.querySelector('.hr-grip'); let D = null;
  const down = ev => { if (window.innerWidth <= HUD_PHONE_MAX || (ev.button != null && ev.button > 0)) return; const r = el.getBoundingClientRect(); D = { pid: ev.pointerId, dx: ev.clientX - r.left, dy: ev.clientY - r.top }; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { } ev.preventDefault(); };
  const move = ev => { if (!D || ev.pointerId !== D.pid) return; const p = hudRemoteClamp(ev.clientX - D.dx, ev.clientY - D.dy); HUDR.pos = p; hudRemoteApply(p); hudRemoteInsets(); };
  const up = ev => { if (!D || ev.pointerId !== D.pid) return; D = null; if (HUDR.pos) { hudRemoteSave({ x: HUDR.pos.x, y: HUDR.pos.y }); if (HUDR.ui) HUDR.ui.setStatus('리모콘을 옮겼습니다. 왼쪽 ' + HUDR.pos.x + ', 위 ' + HUDR.pos.y); } };
  [grip, el.querySelector('.hr-title')].forEach(t => { t.addEventListener('pointerdown', down); t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up); });
  grip.addEventListener('keydown', ev => {
    if (window.innerWidth <= HUD_PHONE_MAX) return; const k = ev.key; const st = ev.shiftKey ? 64 : 16;
    if (k === 'Home') { ev.preventDefault(); HUDR.pos = null; HUDR.corner = 'br'; hudRemoteSave({ x: null, y: null }); hudRemotePlace(); HUDR.ui.setStatus('리모콘을 처음 자리로 돌렸습니다'); return; }
    const d = k === 'ArrowLeft' ? [-st, 0] : k === 'ArrowRight' ? [st, 0] : k === 'ArrowUp' ? [0, -st] : k === 'ArrowDown' ? [0, st] : null; if (!d) return;
    ev.preventDefault(); const r = el.getBoundingClientRect(); const p = hudRemoteClamp(r.left + d[0], r.top + d[1]); HUDR.pos = p; hudRemoteApply(p); hudRemoteInsets(); hudRemoteSave({ x: p.x, y: p.y });
    HUDR.ui.setStatus('리모콘을 옮겼습니다. 왼쪽 ' + p.x + ', 위 ' + p.y);
  });
}

/* ---------- 별도 창과 연결 ---------- */
function hudRemoteOpenWin() {
  const url = new URL('remote.html', window.location.href).href;
  if (HUDR.win && !HUDR.win.closed) { try { HUDR.win.focus(); } catch (e) { } hudEdMsg('별도 창이 이미 열려 있습니다. 그 창으로 이동합니다.'); return; }
  let w = null; try { w = window.open(url, 'nrk062_hud_remote', 'popup=yes,width=380,height=720'); } catch (e) { w = null; }
  if (!w) { hudEdMsg('팝업이 막혀 별도 창을 열지 못했습니다. 주소 줄의 팝업 허용을 켠 뒤 다시 누르거나, 떠 있는 패널을 쓰세요. 직접 열 주소: ' + url); return; }
  HUDR.win = w; hudEdMsg('별도 창을 열었습니다. 다른 모니터에 놓아도 됩니다. 편집은 두 곳 어디서든 할 수 있습니다.');
}
function hudRemoteOnMsg(m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'hello') { HUDR.remoteAt = Date.now(); if (G.hudEd) hudRemotePub(true); else if (HUDR.link) HUDR.link.post({ t: 'idle', gid: HUDR.gid, ts: Date.now() }); }
  else if (m.t === 'attach') { if (m.gid === HUDR.gid && G.hudEd && !HUDR.noDock) { HUDR.winAt = Date.now(); HUDR.remoteAt = HUDR.winAt; hudRemoteDock(true); } }
  else if (m.t === 'detach') { if (m.gid === HUDR.gid) hudRemoteDock(false); }
  else if (m.t === 'cmd') {
    if (m.gid !== HUDR.gid) return; HUDR.remoteAt = Date.now();
    if (!G.hudEd) { if (HUDR.link) HUDR.link.post({ t: 'idle', gid: HUDR.gid, ts: Date.now() }); return; }
    HUDR.winAt = Date.now(); hudRemoteCmd(m.cmd);
  }
}
function initHudRemote() {
  if (typeof document === 'undefined' || typeof HudRemoteLink === 'undefined' || HUDR.link) return;
  HUDR.link = HudRemoteLink.open(hudRemoteOnMsg);
  window.addEventListener('pagehide', () => { if (HUDR.link && G.hudEd) HUDR.link.post({ t: 'end', gid: HUDR.gid, how: 'closed' }); });
  window.addEventListener('resize', () => { if (G.hudEd && HUDR.el) hudRemotePlace(); });
  let raf = 0; window.addEventListener('scroll', () => { if (!G.hudEd || !HUDR.el || raf) return; raf = requestAnimationFrame(() => { raf = 0; hudRemotePlace(); }); }, true);
  document.addEventListener('focusin', ev => { if (G.hudEd && HUDR.el && ev.target && ev.target.closest && ev.target.closest('.hov .hbox')) hudRemotePlace(); });
}
