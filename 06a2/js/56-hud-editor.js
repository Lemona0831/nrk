'use strict';
/* ===== 전투 화면 편집 (10월 10일 0.6a.2-92) =====
   HUD 모듈(HUD_MODS)마다 크기(50 · 75 · 100 · 150 · 200%), 켜기와 끄기, 놓일 구역과 순서를 정한다.
   구역: top1 · top2(위쪽. 넓은 화면은 나란히, 휴대폰은 위아래로 쌓임) · mid(가운데, 남는 높이를 채우고 넘치면 스크롤) · bot(아래).
   값은 G.data.hud.lay = { pc, ph } 하나이고 구조는 { z: {구역: [모듈 id]}, s: {id: 크기}, off: [id] }. 휴대폰(폭 719px 이하)과 PC 배치는 따로 저장한다.
   p가 'custom'이 아니면 lay를 읽지 않고 묶음(HUD_PRESET_LAY)의 배치를 쓴다. 값이 없거나 깨진 저장본은 기본 배치로 읽는다. */
const HUD_SIZES = [50, 75, 100, 150, 200];
const HUD_ZONES = ['top1', 'top2', 'mid', 'bot'];
const HUD_PHONE_MAX = 719;
const HUD_DEV_N = { ph: '휴대폰', pc: 'PC' };
const HUD_ZONE_N = {
  pc: { top1: '위 왼쪽', top2: '위 오른쪽', mid: '가운데', bot: '아래' },
  ph: { top1: '위 첫째 칸', top2: '위 둘째 칸', mid: '가운데', bot: '아래' },
};
/* 묶음마다 배치를 따로 정할 수 있다: { pc: { z, s, off }, ph: { z, s, off } }. 없는 칸은 모듈 표(HUD_MODS)의 처음 자리 · 100% · 모두 켬 */
const HUD_PRESET_LAY = { simple: {}, normal: {}, full: {} };
const hudModDef = id => HUD_MODS.find(m => m.id === id);
function hudDev() { return typeof window !== 'undefined' && window.innerWidth <= HUD_PHONE_MAX ? 'ph' : 'pc'; }
function hudBaseLay(p, dev) {
  const o = (HUD_PRESET_LAY[p] || {})[dev] || {}; const z = {};
  HUD_ZONES.forEach(k => { z[k] = o.z && Array.isArray(o.z[k]) ? o.z[k].slice() : []; });
  HUD_MODS.forEach(m => { if (!HUD_ZONES.some(k => z[k].includes(m.id))) z[m.z].push(m.id); });
  return { z, s: Object.assign({}, o.s), off: (o.off || []).slice() };
}
/* 어떤 값이 와도 완전한 배치로 만든다: 모르는 id는 버리고, 빠진 모듈은 처음 구역 끝에 넣고, 크기는 정해진 값만, 끌 수 없는 모듈은 늘 켠다 */
function hudLayNorm(raw, base) {
  const known = new Set(HUD_MODS.map(m => m.id)); const seen = new Set(); const z = {}; const ok = raw && typeof raw === 'object' && raw.z && typeof raw.z === 'object';
  HUD_ZONES.forEach(k => {
    const src = ok ? (Array.isArray(raw.z[k]) ? raw.z[k] : []) : base.z[k];
    z[k] = src.filter(id => known.has(id) && !seen.has(id) && seen.add(id));
  });
  HUD_MODS.forEach(m => { if (!seen.has(m.id)) { z[m.z].push(m.id); seen.add(m.id); } });
  const s = {}; HUD_MODS.forEach(m => { const v = raw && raw.s ? +raw.s[m.id] : NaN; s[m.id] = HUD_SIZES.includes(v) ? v : (HUD_SIZES.includes(+base.s[m.id]) ? +base.s[m.id] : 100); });
  const off = (raw && Array.isArray(raw.off) ? raw.off : base.off).filter((id, i, a) => known.has(id) && !hudModDef(id).lock && a.indexOf(id) === i);
  return { z, s, off };
}
function hudLayFor(dev) {
  if (G.hudEd && G.hudEd.draft && G.hudEd.draft[dev]) return G.hudEd.draft[dev]; /* 화면에서 편집하는 동안은 저장 전 임시 배치(57-hud-direct.js) */
  const h = hudRaw(); const custom = h.p === 'custom';
  return hudLayNorm(custom && h.lay ? h.lay[dev] : null, hudBaseLay(custom ? HUD_DEFAULT : h.p, dev));
}
function hudLayJson(dev) { return JSON.stringify(hudLayFor(dev || hudDev())); }
/* 배치를 바꾼다: 지금 묶음의 항목 값과 두 배치를 모두 '사용자 지정'으로 굳힌 뒤 fn이 한 배치를 고친다 */
function hudEditLay(dev, fn) {
  const h = hudRaw(); const f = hudFlags(h.p, h.o); const o = {}; for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = f[it.k];
  const lay = { pc: hudLayFor('pc'), ph: hudLayFor('ph') }; fn(lay[dev]); G.data.hud = Object.assign({ p: 'custom', o, lay }, hudSlotKeep()); saveLocal();
}
/* 배열 칸(저장 칸) 4개: G.data.hud.slots = [ { t: 저장한 때, lay: { pc, ph } } | null ], 마지막으로 쓴 칸 G.data.hud.slot. 옛 저장본에는 없고 비어 있는 것으로 읽는다 */
const HUD_SLOT_N = 4;
function hudSlotKeep() { const h = G.data && G.data.hud; const o = {}; if (h && Array.isArray(h.slots)) o.slots = h.slots; if (h && Number.isInteger(h.slot)) o.slot = h.slot; return o; }
function hudSlots() {
  const h = G.data && G.data.hud; const a = h && Array.isArray(h.slots) ? h.slots : []; const out = [];
  for (let i = 0; i < HUD_SLOT_N; i++) { const s = a[i]; out.push(s && typeof s === 'object' && s.lay && typeof s.lay === 'object' ? s : null); }
  return out;
}
function hudSlotLay(s) { return { pc: hudLayNorm(s.lay.pc, hudBaseLay(HUD_DEFAULT, 'pc')), ph: hudLayNorm(s.lay.ph, hudBaseLay(HUD_DEFAULT, 'ph')) }; }
/* 두 배치가 같은 모양인지(끈 칸의 차례는 따지지 않는다). 배열 칸을 불러오기 전에 지금 배치가 바뀌는지 알아볼 때 쓴다 */
function hudLayKey(L) { return JSON.stringify({ z: HUD_ZONES.map(k => L.z[k]), s: HUD_MODS.map(m => L.s[m.id]), off: L.off.slice().sort() }); }
function hudLaySame(a, b) { return hudLayKey(a.pc) === hudLayKey(b.pc) && hudLayKey(a.ph) === hudLayKey(b.ph); }
const HUD_SLOT_ASK = '지금 배치가 바뀝니다. 불러올까요?';
/* 배열 칸 불러오기 확인 창. 확인 상자 "다음부터 표시하지 않기"를 켜고 불러오면 G.data.hudNoAsk가 켜져 이후 묻지 않는다(설정의 스위치로 되돌린다).
   따로 그리는 창이라 설정 창 위에서도, 화면에서 편집 중에도 같은 모양으로 뜬다. 열리면 뒷화면을 inert로 막고, Tab은 창 안에서만 돌며, Esc는 취소, 닫으면 불러온 단추로 초점이 돌아간다 */
function hudSlotAsk(opener, needs, onYes) {
  if (!needs || (G.data && G.data.hudNoAsk) || typeof document === 'undefined') { onYes(); return; }
  if (document.getElementById('hudask')) return;
  const bg = document.createElement('div'); bg.id = 'hudask'; bg.className = 'askbg';
  bg.innerHTML = `<div class="askbox" role="alertdialog" aria-modal="true" aria-labelledby="hudasktxt"><p id="hudasktxt">${esc(fixJosa(HUD_SLOT_ASK))}</p><label class="askck" for="hudaskno"><input type="checkbox" id="hudaskno"> 다음부터 표시하지 않기</label><div class="askbtn"><button type="button" id="hudaskcancel">취소</button><button type="button" class="gold" id="hudaskok">불러오기</button></div></div>`;
  const blocked = [document.getElementById('root'), document.getElementById('hedbar')].filter(Boolean); blocked.forEach(x => x.setAttribute('inert', ''));
  document.body.appendChild(bg);
  const done = yes => {
    const no = bg.querySelector('#hudaskno').checked; bg.remove(); blocked.forEach(x => x.removeAttribute('inert'));
    if (yes) { if (no) { G.data.hudNoAsk = true; saveLocal(); } onYes(); } else if (opener && opener.isConnected && opener.focus) opener.focus();
  };
  bg.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('button'); if (!b) return; done(b.id === 'hudaskok'); });
  bg.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(false); return; }
    if (ev.key === 'Tab') { const f = [...bg.querySelectorAll('input,button')]; const i = f.indexOf(document.activeElement); const n = ev.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1); ev.preventDefault(); f[n].focus(); }
    ev.stopPropagation();
  });
  bg.querySelector('#hudaskcancel').focus();
}
function hudSlotNeedsAsk(i) { const s = hudSlots()[i]; return !!s && !hudLaySame({ pc: hudLayFor('pc'), ph: hudLayFor('ph') }, hudSlotLay(s)); }
function hudSlotStamp() { const d = new Date(); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function hudSlotWrite(i, lay) { const sl = hudSlots(); sl[i] = { t: hudSlotStamp(), lay: JSON.parse(JSON.stringify(lay)) }; G.data.hud = Object.assign({}, G.data.hud || {}, { slots: sl, slot: i }); saveLocal(); }
/* 설정 창에서 저장해 둔 배열을 지금 배치로 불러온다 */
function hudSlotLoadLive(i) {
  const s = hudSlots()[i]; if (!s) return false;
  const h = hudRaw(); const f = hudFlags(h.p, h.o); const o = {}; for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = f[it.k];
  G.data.hud = Object.assign({ p: 'custom', o, lay: hudSlotLay(s) }, hudSlotKeep(), { slot: i }); saveLocal(); return true;
}
function hudZoneOf(L, id) { return HUD_ZONES.find(k => L.z[k].includes(id)); }
function hudMoveTo(L, id, zone, index) {
  HUD_ZONES.forEach(k => { L.z[k] = L.z[k].filter(x => x !== id); });
  const a = L.z[zone]; const i = index == null ? a.length : Math.max(0, Math.min(a.length, index)); a.splice(i, 0, id);
}
/* 위로(-1) · 아래로(+1): 구역 끝에서는 이웃 구역으로 넘어간다 */
function hudStepLay(L, id, d) {
  const zn = hudZoneOf(L, id); const a = L.z[zn]; const i = a.indexOf(id);
  if (i + d >= 0 && i + d < a.length) { a.splice(i, 1); a.splice(i + d, 0, id); return; }
  const zi = HUD_ZONES.indexOf(zn) + d; if (zi < 0 || zi >= HUD_ZONES.length) return;
  hudMoveTo(L, id, HUD_ZONES[zi], d < 0 ? undefined : 0);
}
function hudSay(dev, L, id) {
  const m = hudModDef(id); const zn = hudZoneOf(L, id);
  G.hudMsg = m.n + ': ' + HUD_ZONE_N[dev][zn] + ' ' + (L.z[zn].indexOf(id) + 1) + '번째에 놓았습니다';
}
/* 전투 화면: 구역마다 모듈을 놓는다. 끈 모듈은 그리지 않고, 읽는 글(.sr)만 있는 모듈은 구역 끝에 모아 읽히게 둔다 */
function hudZonesHtml(html) {
  if (G.hudEd) return hudEdZones(html);
  const L = hudLayFor(hudDev()); const Z = {};
  for (const zn of HUD_ZONES) {
    let out = '', quiet = '';
    for (const id of L.z[zn]) {
      const h = html[id]; if (!h || !String(h).trim() || L.off.includes(id)) continue;
      if (/^\s*<div class="sr"/.test(h)) { quiet += h; continue; }
      const m = hudModDef(id); const sz = L.s[id];
      out += `<div class="hmod${m.hm ? ' hm' : ''}${m.mine ? ' mine' : ''}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}" style="zoom:${sz / 100}"` : ''}>${h}</div>`;
    }
    Z[zn] = `<div class="hz hz-${zn}" data-zone="${zn}">${out}${quiet}</div>`;
  }
  return Z;
}
/* 설정 창의 편집 칸 */
function hudEditHtml() {
  const cur = hudDev(); const dev = G.hudDev === 'ph' || G.hudDev === 'pc' ? G.hudDev : cur; const L = hudLayFor(dev); const ZN = HUD_ZONE_N[dev];
  const live = !!(G.b && hudLiveSheet());
  const row = id => {
    const m = hudModDef(id); const off = L.off.includes(id);
    const sw = m.lock ? `<span class="hudlk">끌 수 없음</span>` : `<button type="button" class="sw" role="switch" aria-checked="${!off}" data-a="hudmod" data-k="${id}" aria-label="${esc(m.n)} 보이기">${off ? '꺼짐' : '켜짐'}</button>`;
    return `<li class="hrow${off ? ' hoff' : ''}" data-hid="${id}"><div class="hr1"><button class="hdrag" type="button" data-a="hudgrip" data-k="${id}" aria-label="${esc(m.n)} 옮기기. 끌거나 위 · 아래 화살표 키를 누릅니다" aria-describedby="hudkeyhelp"><span aria-hidden="true">⠿</span></button><span class="hnm"><b>${esc(m.n)}</b><small class="mini">${esc(m.d)}</small></span>${sw}</div>
<div class="hr2"><label class="hsel">크기 <select data-a="hudsz" data-k="${id}" aria-label="${esc(m.n)} 크기">${HUD_SIZES.map(v => `<option value="${v}"${L.s[id] === v ? ' selected' : ''}>${v}%</option>`).join('')}</select></label><label class="hsel">구역 <select data-a="hudzone" data-k="${id}" aria-label="${esc(m.n)} 구역">${HUD_ZONES.map(k => `<option value="${k}"${hudZoneOf(L, id) === k ? ' selected' : ''}>${ZN[k]}</option>`).join('')}</select></label><button class="sm" data-a="hudmv" data-k="${id}" data-d="-1" aria-label="${esc(m.n)} 위로">▲ 위로</button><button class="sm" data-a="hudmv" data-k="${id}" data-d="1" aria-label="${esc(m.n)} 아래로">▼ 아래로</button></div></li>`;
  };
  let o = `<details class="setg hdet" id="hudedit"${G.hudListOpen ? ' open' : ''}><summary>목록으로 편집</summary><p class="mini">끌기가 어려우면 여기서 칸마다 크기와 구역, 순서를 고릅니다. ${live ? '바꾸면 뒤의 전투 화면에 바로 보입니다.' : ''} 휴대폰과 PC 배치는 따로 저장됩니다.</p>
  <div class="setrow hudpre" role="group" aria-label="편집할 배치">${['ph', 'pc'].map(d => `<button class="sm${dev === d ? ' gold' : ''}" data-a="huddev" data-k="${d}" aria-pressed="${dev === d}">${HUD_DEV_N[d]} 배치</button>`).join('')}<button class="sm" data-a="hudreset">처음으로 되돌리기</button></div>`;
  if (dev !== cur) o += `<p class="mini">지금 화면 폭에는 ${HUD_DEV_N[cur]} 배치가 쓰입니다. ${HUD_DEV_N[dev]} 배치는 그 폭의 화면에서 적용됩니다.</p>`;
  o += `<p class="mini" id="hudkeyhelp">⠿ 단추를 끌면 옮겨집니다. 키보드는 ⠿ 단추에서 위 · 아래 화살표를 누르고, 위로 · 아래로 단추와 구역 목록도 씁니다.</p><p class="sr" role="status" id="hudlive">${esc(G.hudMsg || '')}</p>`;
  for (const zn of HUD_ZONES) {
    const ids = L.z[zn];
    o += `<div class="hzg" role="group" aria-label="${ZN[zn]}"><h5>${ZN[zn]}</h5><ul class="hlist" data-hzone="${zn}">${ids.length ? ids.map(row).join('') : '<li class="hempty mini">비어 있습니다. 끌어 놓거나 다른 항목의 구역 목록에서 고르세요</li>'}</ul></div>`;
  }
  return o + `</details>`;
}
/* 전투 중 설정 창은 뒤 화면이 보이도록 작게 연다 */
function hudLiveSheet() { return !!(G.sheet && G.sheet.kind === 'settings' && G.b && (G.scr === 'run' || G.scr === 'scen' || G.scr === 'tut' || G.scr === 'test')); }
function hudEditMove(dev, id, fn) { hudEditLay(dev, L => { fn(L); hudSay(dev, L, id); }); }
function hudEditFocus(sel) { const x = document.querySelector(sel); if (x) x.focus(); }
const hudEditDev = () => (G.hudDev === 'ph' || G.hudDev === 'pc' ? G.hudDev : hudDev());
function hudEditClick(a, el) {
  const dev = hudEditDev(); const id = el.dataset.k;
  if (a === 'hudmv') { hudEditMove(dev, id, L => hudStepLay(L, id, +el.dataset.d < 0 ? -1 : 1)); render(); hudEditFocus('[data-a="hudmv"][data-k="' + id + '"][data-d="' + el.dataset.d + '"]'); }
  else if (a === 'hudmod') { const m = hudModDef(id); if (!m || m.lock) return; hudEditLay(dev, L => { L.off = L.off.includes(id) ? L.off.filter(x => x !== id) : L.off.concat([id]); G.hudMsg = m.n + ': ' + (L.off.includes(id) ? '껐습니다' : '켰습니다'); }); render(); hudEditFocus('[data-a="hudmod"][data-k="' + id + '"]'); }
  else if (a === 'huddev') { G.hudDev = id === 'ph' ? 'ph' : 'pc'; G.hudMsg = ''; render(); hudEditFocus('[data-a="huddev"][data-k="' + G.hudDev + '"]'); }
  else if (a === 'hudreset') { hudPreset(HUD_DEFAULT); G.hudMsg = '처음 상태로 되돌렸습니다'; render(); hudEditFocus('[data-a="hudreset"]'); }
  else if (a === 'hudsheetpos') { G.hudTop = !G.hudTop; render(); hudEditFocus('[data-a="hudsheetpos"]'); }
}
function hudEditChange(el) {
  const dev = hudEditDev(); const id = el.dataset.k; const m = hudModDef(id); if (!m) return;
  if (el.dataset.a === 'hudsz') { const v = +el.value; if (!HUD_SIZES.includes(v)) return; hudEditLay(dev, L => { L.s[id] = v; G.hudMsg = m.n + ': 크기 ' + v + '%'; }); }
  else if (el.dataset.a === 'hudzone') { if (!HUD_ZONES.includes(el.value)) return; hudEditMove(dev, id, L => hudMoveTo(L, id, el.value)); }
  else return;
  render(); hudEditFocus('[data-a="' + el.dataset.a + '"][data-k="' + id + '"]');
}
/* 끌어서 옮기기(마우스 · 손가락): 놓을 때 한 번만 저장하고 다시 그린다. 키보드는 위 · 아래 화살표 */
function initHudDrag() {
  if (typeof document === 'undefined') return;
  let D = null;
  const clear = () => document.querySelectorAll('.hdrop-b,.hdrop-a,.hdrop-in').forEach(x => x.classList.remove('hdrop-b', 'hdrop-a', 'hdrop-in'));
  const over = (x, y) => {
    clear(); D.tgt = null;
    const sh = document.querySelector('.sheet'); if (sh) { const r = sh.getBoundingClientRect(); if (y < r.top + 36) sh.scrollTop -= 14; else if (y > r.bottom - 36) sh.scrollTop += 14; }
    const el = document.elementFromPoint(x, y); if (!el || !el.closest) return;
    const row = el.closest('.hrow'); const list = el.closest('.hlist'); if (!list) return;
    const ids = [...list.querySelectorAll('.hrow')].map(r => r.dataset.hid).filter(i => i !== D.id);
    if (row && row.dataset.hid !== D.id) {
      const r = row.getBoundingClientRect(); const after = y > r.top + r.height / 2; row.classList.add(after ? 'hdrop-a' : 'hdrop-b');
      D.tgt = { zone: list.dataset.hzone, index: ids.indexOf(row.dataset.hid) + (after ? 1 : 0) };
    } else { list.classList.add('hdrop-in'); D.tgt = { zone: list.dataset.hzone, index: ids.length }; }
  };
  document.addEventListener('pointerdown', ev => {
    const g = ev.target && ev.target.closest && ev.target.closest('.hdrag'); if (!g || (ev.button != null && ev.button > 0)) return;
    const row = g.closest('.hrow'); if (!row) return;
    D = { id: row.dataset.hid, pid: ev.pointerId, tgt: null, dev: hudEditDev() }; row.classList.add('hdraging'); ev.preventDefault();
    try { g.setPointerCapture(ev.pointerId); } catch (e) { }
  });
  document.addEventListener('pointermove', ev => { if (!D || ev.pointerId !== D.pid) return; ev.preventDefault(); over(ev.clientX, ev.clientY); }, { passive: false });
  const finish = (ev, cancel) => {
    if (!D || ev.pointerId !== D.pid) return; const d = D; D = null; clear();
    document.querySelectorAll('.hdraging').forEach(x => x.classList.remove('hdraging'));
    if (cancel || !d.tgt) return;
    hudEditMove(d.dev, d.id, L => hudMoveTo(L, d.id, d.tgt.zone, d.tgt.index)); render(); hudEditFocus('.hdrag[data-k="' + d.id + '"]');
  };
  document.addEventListener('pointerup', ev => finish(ev, false));
  document.addEventListener('pointercancel', ev => finish(ev, true));
  document.addEventListener('keydown', ev => {
    const g = ev.target && ev.target.closest && ev.target.closest('.hdrag'); if (!g || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
    ev.preventDefault(); const id = g.dataset.k;
    hudEditMove(hudEditDev(), id, L => hudStepLay(L, id, ev.key === 'ArrowUp' ? -1 : 1)); render(); hudEditFocus('.hdrag[data-k="' + id + '"]');
  });
}
