'use strict';
/* ===== 전투 화면에서 직접 편집 (10월 10일 0.6a.2-93) =====
   설정의 "화면에서 편집"을 누르면 실제 전투 화면(전투가 없으면 견본 전투)이 멈춘 채로 뜨고, 그 위에서 모듈을 끌어 옮기고
   누른 모듈의 크기 · 켜기와 끄기 · 순서와 구역을 고친다(순서와 구역 단추는 아래 막대의 "자리 옮기기" 줄). 값은 G.hudEd.draft = { pc, ph } 임시 배치에 쌓이고 "저장"을 눌러야 G.data.hud.lay에 들어간다.
   모듈 위의 틀과 이름표는 실제 요소가 아니라 겹쳐 놓은 층(.hov)이다: 실제 요소의 위치를 재어 따라붙는다(크기 zoom, 스크롤에도 맞음).
   전투 화면(.fit)은 inert라 편집 중에는 눌러도 아무 일이 없고, 전투 중이면 적 차례 진행도 sleep에서 멈춘다. 키보드: 모듈에 초점을 두고 화살표(위 · 아래 = 순서, 왼쪽 · 오른쪽 = 구역), + / − 크기, Enter · Space 고르기, Delete 켜기 · 끄기, Esc 취소. */
const HUD_ED_DEFAULT_MSG = '칸을 끌어 옮기거나 눌러서 고르세요';
function hudEdActive() { return !!G.hudEd; }
function hudEdMsg(m) { if (G.hudEd) G.hudEd.msg = m; const s = typeof document !== 'undefined' ? document.getElementById('hedstatus') : null; if (s) s.textContent = m; }
/* 막대 안 단추를 눌러 다시 그릴 때 초점이 그 단추에 남도록 선택자를 적어 둔다 */
function hudEdKeepSel() { const a = document.activeElement; if (a && a.closest && a.closest('#hedbar')) { if (a.id) return '#' + a.id; if (a.dataset.a) return '[data-a="' + a.dataset.a + '"]' + (a.dataset.n != null ? '[data-n="' + a.dataset.n + '"]' : '') + (a.dataset.k != null ? '[data-k="' + a.dataset.k + '"]' : ''); } return '#hedstatus'; }
function hudEdDirty() { const ed = G.hudEd; return !!ed && (JSON.stringify(ed.draft) !== ed.init || (!!ed.fo && JSON.stringify(ed.fo) !== ed.o0)); }
function hudEdLayNow() { const ed = G.hudEd, d = hudDev(); return ed.draft.md && ed.draft.md[d] === 'free' ? ed.draft.fr[d] : ed.draft[d]; } /* 지금 고치는 배치(자유 배치면 fr, 아니면 정렬 배치). 크기 s와 꺼짐 off는 둘 다 가진다 */
function hudEdPosText(L, id) { if (L.m) return hfPos(L, id); const dev = hudDev(); const zn = hudZoneOf(L, id); return HUD_ZONE_N[dev][zn] + ' ' + (L.z[zn].indexOf(id) + 1) + '번째'; }

/* ---------- 들어가고 나오기 ---------- */
function hudEdSampleBattle() {
  const cls = Object.keys(BUILDS).filter(k => BUILDS[k].v2 && !BUILDS[k].tut && unlOpen(k))[0]; const lv = 5;
  const st = statRecommend(cls, {}, STAT_START + LV_POINTS * (lv - 1));
  const p = mkPlayer(cls, {}, st, (TREE2[cls] ? TREE2[cls].starters : [])); p.lv = lv; applyStats(p, st); p.hp = p.hpMax; p.st = p.stMax;
  const q = SQUADS.filter(x => inCh(x, 1))[0]; const fl = FLOOR_CAMP + 3;
  const room = { lv: mlvOf(fl, 1), floor: fl, ch: 1, names: ENEMY_NAMES[1], path: 'main', en: JSON.parse(JSON.stringify(q.low)), squad: q.id }; const b = roomBattle(p, room, null, 4242); b.ctx.test = 1; b.stepMode = true;
  try { b.log.push({ m: '내가 적에게 9.4 피해', c: 'good', w: 'p', r: 1, g: 1 }, { m: '적이 나에게 6.2 피해', c: 'bad', w: b.en[0].id, r: 1, g: 1 }); } catch (e) { }
  return b;
}
function hudEdBegin() {
  if (G.hudEd || typeof document === 'undefined') return;
  hidePop(); G.menuOpen = false;
  const real = !!(G.b && (G.scr === 'run' || G.scr === 'scen' || G.scr === 'tut' || G.scr === 'hudsample'));
  const ed = { draft: hudLayAll(), fo: null, hist: null, nums: false, read: [], ovl: [], norm: false, announce: false, sel: null, msg: HUD_ED_DEFAULT_MSG, ret: null, sample: !real, focus: null, help: false, slot: Number.isInteger(G.data.hud && G.data.hud.slot) ? G.data.hud.slot : null, fold: window.innerWidth <= HUD_PHONE_MAX, grid: false, keep: false };
  ed.init = JSON.stringify(ed.draft); ed.o0 = JSON.stringify(hudOMap());
  if (!real) { ed.ret = { scr: G.scr, run: G.run, b: G.b, sel: G.sel, back: G.back, sheet: null }; G.run = null; G.b = hudEdSampleBattle(); G.scr = 'hudsample'; G.sel = null; }
  G.sheet = null; G.hudEd = ed; hudEdBarMake(); document.documentElement.classList.add('hedit'); render();
  ed.focus = '[data-hbox]'; hudEdPost();
}
function hudEdEnd(how) {
  const ed = G.hudEd; if (!ed) return;
  G.hudEd = null; const bar = document.getElementById('hedbar'); if (bar) bar.remove(); document.documentElement.classList.remove('hedit', 'hgrid', 'hnums'); document.documentElement.style.removeProperty('--hedbar-h');
  if (ed.ret) { G.b = null; G.scr = ed.ret.scr; G.run = ed.ret.run; G.sel = ed.ret.sel; G.back = ed.ret.back; }
  if (how === 'list') { G.hudListOpen = true; G.setTab = 'battle'; openSheet('settings'); setTimeout(() => { const e = document.getElementById('hudedit'); if (e) e.scrollIntoView(); }, 30); }
  else if (how !== 'lost') render();
  if (how === 'save') toast('전투 화면 배치를 저장했습니다');
  else if (how === 'cancel') toast('편집 전 배치로 돌아갔습니다');
}
function hudEdCommit() {
  const ed = G.hudEd; if (!hudEdDirty()) return false;
  const h = hudRaw(); const f = hudFlags(h.p, h.o); const o = ed.fo ? JSON.parse(JSON.stringify(ed.fo)) : {}; if (!ed.fo) for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = f[it.k];
  G.data.hud = Object.assign({ p: 'custom', o, lay: JSON.parse(JSON.stringify(ed.draft)) }, hudSlotKeep()); saveLocal(); return true;
}
function hudEdSave() { const sn = G.hudEd.slot; const rd = G.hudEd.read || []; const ovn = (G.hudEd.ovl || []).length; const freeNow = hudFreeEd(); hudEdCommit(); if (sn != null) hudSlotWrite(sn, G.hudEd.draft); hudEdEnd('save'); if (sn != null) toast('배열 칸 ' + (sn + 1) + '에도 담았습니다'); if (freeNow && ovn) toast('겹친 칸이 ' + ovn + '개 있습니다. 가려진 단추는 누르기 어려울 수 있습니다. Tab으로 닿은 칸은 맨 위로 올라옵니다'); if (freeNow && rd.length >= HF_READ_WARN) toast('자유 배치의 화면 순서가 읽는 순서와 ' + rd.length + '쌍 달라 Tab과 낭독기가 화면과 다르게 움직일 수 있습니다'); }
function hudEdCancel() { if (hudEdDirty() && !ask('고친 내용을 버리고 편집 전 배치로 돌아갈까요?')) return; hudEdEnd('cancel'); }
function hudEdToList() {
  if (hudEdDirty()) { if (!ask('고친 내용을 저장하고 목록으로 편집할까요? 취소를 누르면 이 화면에 남습니다.')) return; hudEdCommit(); }
  hudEdEnd('list');
}
function hudEdReset() {
  hudEdUndoPush(); G.hudEd.draft.pc = hudLayNorm(null, hudBaseLay(HUD_DEFAULT, 'pc')); G.hudEd.draft.ph = hudLayNorm(null, hudBaseLay(HUD_DEFAULT, 'ph')); hudFreeResetAll(); G.hudEd.sel = null; G.hudEd.announce = true;
  hudEdMsg('휴대폰과 PC 배치를 모두 처음 상태로 되돌렸습니다. 배치 방식은 그대로입니다. 저장하기 전에는 바뀌지 않습니다'); G.hudEd.keep = hudEdKeepSel(); render();
}
/* 선택한 칸 하나만 기본값으로: 크기와 켜기 · 끄기, 그리고 처음 구역의 처음 순서 자리 */
function hudEdResetOne(id) {
  if (hudFreeEd()) { hudFreeResetOne(id); return; }
  const m = hudModDef(id); const base = hudLayNorm(null, hudBaseLay(HUD_DEFAULT, hudDev()));
  hudEdDo(id, L => {
    const dz = hudZoneOf(base, id); const order = base.z[dz]; const rest = L.z[dz].filter(x => x !== id); let idx = rest.length;
    for (let j = order.indexOf(id) + 1; j < order.length; j++) { const at = rest.indexOf(order[j]); if (at >= 0) { idx = at; break; } }
    hudMoveTo(L, id, dz, idx); L.s[id] = base.s[id]; L.off = L.off.filter(x => x !== id);
  }, L => m.n + ': 기본값으로 되돌렸습니다. ' + hudEdPosText(L, id) + ', 크기 ' + L.s[id] + '%');
}
const HUD_ED_GRP = [['상태 표시', ['hud-player', 'hud-classchip', 'hud-incoming', 'hud-status']], ['순서와 기록', ['hud-order', 'hud-clock', 'hud-banner', 'hud-log']], ['적과 위험', ['hud-danger', 'hud-field']], ['행동', ['hud-quick', 'hud-actions']]];
function hudEdGroup(gi) {
  const [gn, ids] = HUD_ED_GRP[gi]; const un = ids.filter(id => !hudModDef(id).lock); if (!un.length) { hudEdMsg(gn + ': 모두 꺼 둘 수 없는 칸입니다'); return; }
  const L = hudEdLayNow(); const allOn = un.every(id => !L.off.includes(id));
  hudEdDo(un[0], L2 => { L2.off = L2.off.filter(x => !un.includes(x)); if (allOn) L2.off = L2.off.concat(un); }, () => gn + ': ' + (allOn ? '꺼진 칸 ' : '켜진 칸 ') + un.length + '개');
}
function hudEdSlot(i) {
  const ed = G.hudEd; const s = hudSlots()[i];
  if (s) {
    const l = hudSlotLay(s);
    const keep = hudEdKeepSel(); const opener = document.activeElement; /* 다르면 한 번 묻는다. 같으면 그대로 불러온다 */
    hudSlotAsk(opener, !hudLaySame(ed.draft, l), () => {
      hudEdUndoPush(); ed.slot = i; ed.draft.pc = l.pc; ed.draft.ph = l.ph; ed.draft.md = l.md; ed.draft.fr = l.fr; ed.norm = false; ed.sel = null; hudEdMsg('배열 칸 ' + (i + 1) + '을 불러왔습니다. 저장하기 전에는 게임에 적용되지 않습니다');
      ed.keep = keep; render();
    });
    return;
  } else { ed.slot = i; hudEdMsg('배열 칸 ' + (i + 1) + '은 비어 있어 불러올 수 없습니다. 저장하면 지금 배치가 여기에 담깁니다'); }
  ed.keep = hudEdKeepSel(); render();
}
function hudEdSizeSet(id, v) {
  const m = hudModDef(id); if (!HUD_SIZES.includes(v) || hudEdLayNow().s[id] === v) return;
  G.hudEd.keep = hudEdKeepSel(); hudEdDo(id, L => { L.s[id] = v; }, () => m.n + ': 크기 ' + v + '%');
}
function hudEdFold(on) { const ed = G.hudEd; ed.fold = on == null ? !ed.fold : on; hudEdPanelSync(); hudEdPlace(); }

/* ---------- 아래 막대(다시 그리지 않는 고정 요소) ---------- */
function hudEdBarMake() {
  let bar = document.getElementById('hedbar'); if (bar) bar.remove();
  bar = document.createElement('div'); bar.id = 'hedbar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'HUD 배열');
  const slots = Array.from({ length: HUD_SLOT_N }, (_, i) => `<button class="sm" data-a="hedslot" data-n="${i}" aria-pressed="false"></button>`).join('');
  const grps = HUD_ED_GRP.map(([n, ids], gi) => `<label class="hpck"><input type="checkbox" data-a="hedgrp" data-k="${gi}"> ${esc(n)} <small>${ids.length}칸</small></label>`).join('');
  const opts = HUD_MODS.map(m => `<option value="${m.id}">${esc(m.n)}</option>`).join('');
  bar.innerHTML = `<div class="hphead"><b class="hptitle">HUD 배열</b><p id="hedstatus" role="status" aria-live="polite">${esc(G.hudEd.msg)}</p><button class="sm" data-a="hedfold" id="hedfoldb" aria-controls="hpbody" aria-expanded="true">도구 접기</button></div>
<div class="hprow hpmove" role="group" aria-label="고른 칸 자리 옮기기"><span class="hplab" id="hedmvname">고른 칸 자리</span><button class="sm" data-a="hedmv" data-d="-1" id="hedmvu" disabled>▲<span class="bt"> 위로</span></button><button class="sm" data-a="hedmv" data-d="1" id="hedmvd" disabled>▼<span class="bt"> 아래로</span></button><button class="sm" data-a="hedzn" data-d="-1" id="hedznl" disabled>◀<span class="bt"> 앞 구역</span></button><button class="sm" data-a="hedzn" data-d="1" id="hedznr" disabled><span class="bt">다음 구역 </span>▶</button></div>
<div class="hpbody" id="hpbody">
${hudFreePanelHtml()}
<div class="hprow" role="group" aria-label="배열 칸"><span class="hplab">배열 칸</span>${slots}<span class="mini" id="hedslotcap"></span></div>
<fieldset class="hprow hpgrp"><legend class="hplab">칸 묶음</legend>${grps}</fieldset>
<div class="hprow"><label class="hplab" for="hedpick">구성 요소 선택</label><select id="hedpick"><option value="">고르세요</option>${opts}</select></div>
<div class="hprow hpsel"><span class="hplab" id="hedselname">선택한 칸 없음</span><label for="hedsl" class="sr">크기</label><input type="range" id="hedsl" min="0" max="4" step="1" value="2" disabled><output id="hedslo" for="hedsl">100%</output><button type="button" class="sw" role="switch" aria-checked="true" data-a="hedpsw" id="hedpsw" disabled>켜짐</button><button class="sm" data-a="hedone" id="hedone" disabled>개별 초기화</button></div>
<p class="mini" id="hedlkmsg"></p>
<p class="mini" id="hednote"></p><p class="mini hedhelp" id="hedhelp" hidden>끌어서 옮기거나, 칸에 초점을 두고 위 · 아래 화살표로 순서를, 왼쪽 · 오른쪽 화살표로 구역을 바꿉니다. +와 −는 크기, Enter나 Space는 고르기와 해제, Delete는 켜기와 끄기, Esc는 취소입니다. 막대의 자리 옮기기 단추도 같은 일을 합니다. 자유 배치에서는 화살표 키가 한 칸씩(Shift는 네 칸씩) 자리를 옮기고, 대괄호 키는 폭, Ctrl과 Z는 되돌리기입니다. 양쪽 가장자리를 끌어 폭을 바꾸고, 가로 열 · 세로 행 · 폭 칸에 숫자를 써도 됩니다.</p>
</div>
<div class="hedbtns"><button data-a="hedundo" id="hedundo" disabled>되돌리기</button><button data-a="hedreset" id="hedresetall">전체 초기화</button><label class="hpck"><input type="checkbox" data-a="hedgrid" id="hedgridcb"> 격자</label><button data-a="hedlist" aria-label="목록으로 편집">목록으로</button><button data-a="hedhelp" aria-expanded="false" aria-controls="hedhelp">도움말</button><button data-a="hedcancel" aria-label="취소, 편집 전으로 돌아가기">취소</button><button class="gold" data-a="hedsave" id="hedsave">저장</button></div>`;
  document.body.appendChild(bar); hudEdNote(); hudEdPanelSync();
}
/* 막대(다시 그리지 않는 고정 요소)의 상태를 지금 임시 배치에 맞춘다. 요소를 바꿔 끼우지 않아 초점이 그대로 있다 */
function hudEdPanelSync() {
  const ed = G.hudEd; const bar = document.getElementById('hedbar'); if (!ed || !bar) return;
  const L = hudEdLayNow(); const sl = hudSlots(); const q = s => bar.querySelector(s);
  bar.classList.toggle('fold', !!ed.fold); const fb = q('#hedfoldb'); fb.setAttribute('aria-expanded', String(!ed.fold)); fb.textContent = ed.fold ? '도구 펼치기' : '도구 접기';
  bar.querySelectorAll('[data-a="hedslot"]').forEach(b => {
    const i = +b.dataset.n; const on = ed.slot === i; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('gold', on);
    b.setAttribute('aria-label', '배열 칸 ' + (i + 1) + (sl[i] ? ', ' + sl[i].t + ' 저장' : ', 비어 있음') + ', 불러오기');
    b.innerHTML = (i + 1) + (sl[i] ? '<span aria-hidden="true"> ●</span>' : '');
  });
  q('#hedslotcap').textContent = ed.slot == null ? '저장하면 지금 배치가 게임에 적용됩니다' : sl[ed.slot] ? '칸 ' + (ed.slot + 1) + ': ' + sl[ed.slot].t + ' 저장. 저장하면 이 칸에도 담깁니다' : '칸 ' + (ed.slot + 1) + ': 비어 있음. 저장하면 이 칸에도 담깁니다';
  HUD_ED_GRP.forEach(([, ids], gi) => {
    const cb = q('[data-a="hedgrp"][data-k="' + gi + '"]'); const un = ids.filter(id => !hudModDef(id).lock); const on = un.filter(id => !L.off.includes(id));
    cb.disabled = !un.length; cb.checked = !un.length || on.length === un.length; cb.indeterminate = !!un.length && on.length > 0 && on.length < un.length;
  });
  const pk = q('#hedpick'); pk.value = ed.sel || '';
  [...pk.options].forEach(o => { if (o.value) o.textContent = hudModDef(o.value).n + (L.off.includes(o.value) ? ' (꺼짐)' : ''); });
  const id = ed.sel; const m = id ? hudModDef(id) : null; const sl2 = q('#hedsl'); const sw = q('#hedpsw'); const one = q('#hedone');
  q('#hedselname').textContent = m ? m.n : '선택한 칸 없음';
  sl2.disabled = !m; sl2.value = m ? HUD_SIZES.indexOf(L.s[id]) : 2; sl2.setAttribute('aria-valuetext', (m ? L.s[id] : 100) + '%'); sl2.setAttribute('aria-label', (m ? m.n + ' ' : '') + '크기'); q('#hedslo').textContent = (m ? L.s[id] : 100) + '%';
  const off = m ? L.off.includes(id) : false; sw.disabled = !m; sw.setAttribute('aria-checked', String(!off)); sw.textContent = off ? '꺼짐' : '켜짐'; sw.setAttribute('aria-label', (m ? m.n + ' ' : '') + '보이기');
  if (m && m.lock) { sw.setAttribute('aria-disabled', 'true'); sw.setAttribute('aria-describedby', 'hedlkmsg'); } else { sw.removeAttribute('aria-disabled'); sw.removeAttribute('aria-describedby'); }
  one.disabled = !m; q('#hedmvname').textContent = m ? m.n : '고른 칸 자리';
  [['#hedmvu', ' 위로'], ['#hedmvd', ' 아래로'], ['#hedznl', ' 앞 구역으로'], ['#hedznr', ' 다음 구역으로']].forEach(([sel, t]) => { const b = q(sel); b.disabled = !m; b.setAttribute('aria-label', (m ? m.n : '고른 칸') + t); });
  q('#hedlkmsg').textContent = m ? (m.lock ? '이 칸은 게임을 하는 데 꼭 필요해서 끌 수 없습니다. 크기와 자리는 바꿀 수 있습니다.' : '') : '칸을 누르거나 위에서 고르면 크기와 켜기 · 끄기를 정할 수 있습니다.';
  q('#hedgridcb').checked = !!ed.grid; document.documentElement.classList.toggle('hgrid', !!ed.grid);
  hudFreePanelSync(bar);
}
function hudEdNote() {
  const n = document.getElementById('hednote'); const ed = G.hudEd; if (!n || !ed) return;
  const d = HUD_DEV_N[hudDev()];
  n.textContent = (ed.sample ? '견본 전투입니다. 게임에는 영향이 없습니다. ' : '전투가 멈춰 있습니다. ') + '지금 ' + d + ' ' + HUD_MODE_N[hudFreeActive() ? 'free' : 'align'] + '를 고칩니다' + (hudEdDirty() ? ' · 저장하지 않음' : '') + '.';
}

/* ---------- 겹쳐 놓는 층 ---------- */
function hudEdUiFree() {
  const ed = G.hudEd; const L = ed.draft.fr[hudDev()]; let boxes = '';
  HUD_MODS.forEach((m, i) => {
    const id = m.id; const off = L.off.includes(id); const sz = L.s[id]; const on = ed.sel === id;
    const lab = `${m.n}, ${hfPos(L, id)}, 크기 ${sz}%, ${off ? '꺼짐' : '켜짐'}${m.lock ? ', 끌 수 없음' : ''}${on ? ', 선택됨' : ''}`;
    boxes += `<div class="hbox${on ? ' on' : ''}${off ? ' off' : ''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${esc(lab)}" aria-describedby="hedhelp2" data-a="hedsel" data-k="${id}" data-hbox="${id}" data-zone="free"><span class="htag" aria-hidden="true"><span class="hnum">${i + 1}</span><span class="hgrip">⠿</span> ${esc(m.n)}<small>${sz}%${off ? ' · 꺼짐' : ''}</small></span><span class="hrh hrl" aria-hidden="true" data-rs="l"></span><span class="hrh hrr" aria-hidden="true" data-rs="r"></span></div>`;
  });
  return `<main class="hov" data-hov aria-label="전투 화면 편집"><h1 class="sr">전투 화면 편집</h1><p class="sr" id="hedhelp2">자유 배치입니다. 끌어서 옮기고, 양쪽 가장자리를 끌어 폭을 바꿉니다. 화살표 키는 한 칸씩, Shift와 함께 누르면 네 칸씩 옮깁니다. 대괄호 키는 폭, +와 −는 크기, Enter는 고르기, Delete는 켜기와 끄기, Ctrl과 Z는 되돌리기, Esc는 취소입니다.</p>${boxes}</main>`;
}
function hudEdUi() {
  if (hudFreeEd()) return hudEdUiFree();
  const ed = G.hudEd; const dev = hudDev(); const L = hudEdLayNow(); let boxes = '', zones = '';
  for (const zn of HUD_ZONES) {
    zones += `<div class="hzbox" data-hzbox="${zn}" aria-hidden="true"><span>${HUD_ZONE_N[dev][zn]}</span></div>`;
    L.z[zn].forEach((id, i) => {
      const m = hudModDef(id); const off = L.off.includes(id); const sz = L.s[id]; const on = ed.sel === id;
      const lab = `${m.n}, ${HUD_ZONE_N[dev][zn]} ${i + 1}번째, 크기 ${sz}%, ${off ? '꺼짐' : '켜짐'}${m.lock ? ', 끌 수 없음' : ''}${on ? ', 선택됨' : ''}`;
      boxes += `<div class="hbox${on ? ' on' : ''}${off ? ' off' : ''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${esc(lab)}" aria-describedby="hedhelp2" data-a="hedsel" data-k="${id}" data-hbox="${id}" data-zone="${zn}"><span class="htag" aria-hidden="true"><span class="hgrip">⠿</span> ${esc(m.n)}<small>${sz}%${off ? ' · 꺼짐' : ''}</small></span></div>`;
    });
  }
  return `<main class="hov" data-hov aria-label="전투 화면 편집"><h1 class="sr">전투 화면 편집</h1><p class="sr" id="hedhelp2">끌어서 옮기거나 위 · 아래 화살표로 순서, 왼쪽 · 오른쪽 화살표로 구역을 바꿉니다. +와 −는 크기, Enter는 고르기, Delete는 켜기와 끄기, Esc는 취소입니다.</p>${zones}${boxes}</main>`;
}
/* 다시 그린 뒤: 틀을 실제 요소 위치에 붙이고, 막대 여백을 맞추고, 초점을 되돌린다 */
function hudEdPost() {
  const ed = G.hudEd; if (!ed) return;
  const fit = document.querySelector('#root > .fit'); if (fit) fit.querySelectorAll(':scope > .hdr, :scope > .skip, :scope > .bmain').forEach(x => x.setAttribute('inert', '')); /* 틀과 아래 막대만 눌리고 닿는다 */
  hudEdPanelSync(); hudEdPlace(); hudEdNote();
  const sel = ed.focus; ed.focus = null; const kp = ed.keep; ed.keep = false;
  if (kp && !sel) { const bx = document.querySelector('#hedbar ' + kp); if (bx && !bx.disabled && document.activeElement !== bx) bx.focus(); }
  if (sel) { const el = document.querySelector('.hov ' + sel) || document.querySelector('.hov [data-hbox]'); if (el) { POP.mute = true; try { el.focus({ preventScroll: false }); } finally { POP.mute = false; } } }
}
/* 틀 · 구역 상자를 실제 요소에 붙인다(스크롤 칸의 지금 크기로 잰다). 칸이 줄거나 막대 높이가 바뀌면 다시 부른다 */
function hudEdPlaceBoxes(ov, fit) {
  /* 틀은 .fit(편집 중에는 스크롤 칸) 안의 내용 좌표에 놓아 내용과 함께 움직인다 */
  const fr = fit.getBoundingClientRect(); const ox = fr.left - fit.scrollLeft + fit.clientLeft; const oy = fr.top - fit.scrollTop + fit.clientTop;
  const put = (el, r, mw, mh) => { el.style.display = ''; el.style.cssText = `left:${r.left - ox}px;top:${r.top - oy}px;width:${Math.max(r.width, mw)}px;height:${Math.max(r.height, mh)}px`; };
  ov.querySelectorAll('.hzbox').forEach(z => { const t = fit.querySelector('.hz-' + z.dataset.hzbox); if (!t) { z.style.display = 'none'; return; } put(z, t.getBoundingClientRect(), 0, 0); });
  ov.querySelectorAll('.hbox').forEach(b => {
    const t = fit.querySelector('[data-hmod="' + b.dataset.hbox + '"]'); const r = t ? t.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) { b.style.display = 'none'; return; }
    /* 스크롤 칸 가장자리에 24px보다 얇은 조각만 걸린 틀은 누를 수 있는 자리가 못 된다(WCAG 2.5.8). 걸친 쪽을 가장자리 밖으로 물려
       조각을 틀에서 빼고(모듈은 스크롤하거나 초점을 두면 틀째 들어온다), 보이는 부분이 있는 틀은 늘 24px 이상이 되게 한다 */
    const vt = fr.top, vb = fr.bottom; let top = r.top; let bot = r.top + Math.max(r.height, 24); const vis = Math.min(bot, vb) - Math.max(top, vt);
    if (vis > 0 && vis < 24) { if (bot > vb && top >= vt) { top = vb; bot = Math.max(bot, vb + 24); } else { bot = vt; top = Math.min(top, vt - 24); } }
    put(b, { left: r.left, top, width: r.width, height: bot - top }, 24, 24);
  });
}
function hudEdPlace() {
  const ov = document.querySelector('.hov'); if (!ov) return;
  const fit = document.querySelector('#root > .fit'); if (!fit) return;
  const bar = document.getElementById('hedbar'); const bh = bar ? bar.getBoundingClientRect().height : 0;
  if (bh && document.documentElement.style.getPropertyValue('--hedbar-h') !== Math.ceil(bh) + 'px') document.documentElement.style.setProperty('--hedbar-h', Math.ceil(bh) + 'px');
  hudEdPlaceBoxes(ov, fit); /* 자리를 바꾸면 모듈 자리도 바뀌므로 그 뒤에 잰다 */
}

/* ---------- 고치는 일 ---------- */
function hudEdDo(id, fn, msgFn) {
  hudEdUndoPush(); const L = hudEdLayNow(); fn(L); if (L.m) L.au = 0; G.hudEd.msg = msgFn(L); G.hudEd.focus = G.hudEd.keep ? null : (G.hudEd.focus || '[data-hbox="' + id + '"]'); render();
  const s = document.getElementById('hedstatus'); if (s) s.textContent = G.hudEd.msg;
}
function hudEdSize(id, d) {
  const m = hudModDef(id); const L = hudEdLayNow(); const i = HUD_SIZES.indexOf(L.s[id]) + d;
  if (i < 0 || i >= HUD_SIZES.length) { hudEdMsg(m.n + ': 더 ' + (d < 0 ? '줄일' : '키울') + ' 수 없습니다. 크기 ' + L.s[id] + '%'); return; }
  hudEdDo(id, L2 => { L2.s[id] = HUD_SIZES[i]; }, () => m.n + ': 크기 ' + HUD_SIZES[i] + '%');
}
function hudEdToggle(id) {
  const m = hudModDef(id); if (m.lock) { hudEdMsg(m.n + ': 끌 수 없는 모듈입니다'); return; }
  hudEdDo(id, L => { L.off = L.off.includes(id) ? L.off.filter(x => x !== id) : L.off.concat([id]); }, L => m.n + ': ' + (L.off.includes(id) ? '껐습니다' : '켰습니다'));
}
function hudEdStep(id, d, big) {
  if (hudFreeEd()) { hudFreeNudge(id, 0, d * (big ? 4 : 1)); return; }
  const m = hudModDef(id); const L0 = hudEdLayNow(); const before = hudZoneOf(L0, id) + L0.z[hudZoneOf(L0, id)].indexOf(id);
  const probe = JSON.parse(JSON.stringify(L0)); hudStepLay(probe, id, d);
  if (hudZoneOf(probe, id) + probe.z[hudZoneOf(probe, id)].indexOf(id) === before) { hudEdMsg(m.n + ': 더 ' + (d < 0 ? '위로' : '아래로') + ' 갈 수 없습니다'); return; }
  hudEdDo(id, L => hudStepLay(L, id, d), L => m.n + ': ' + hudEdPosText(L, id) + '에 놓았습니다');
}
function hudEdZone(id, d, big) {
  if (hudFreeEd()) { hudFreeNudge(id, d * (big ? 4 : 1), 0); return; }
  const m = hudModDef(id); const L0 = hudEdLayNow(); const zn = hudZoneOf(L0, id); const zi = HUD_ZONES.indexOf(zn) + d;
  if (zi < 0 || zi >= HUD_ZONES.length) { hudEdMsg(m.n + ': ' + (d < 0 ? '앞' : '다음') + ' 구역이 없습니다'); return; }
  const idx = L0.z[zn].indexOf(id);
  hudEdDo(id, L => hudMoveTo(L, id, HUD_ZONES[zi], Math.min(idx, L.z[HUD_ZONES[zi]].length)), L => m.n + ': ' + hudEdPosText(L, id) + '에 놓았습니다');
}
function hudEdSelect(id) {
  const ed = G.hudEd; const m = hudModDef(id); ed.sel = ed.sel === id ? null : id; const L = hudEdLayNow();
  ed.msg = ed.sel ? m.n + ' 선택. ' + hudEdPosText(L, id) + ', 크기 ' + L.s[id] + '%' : m.n + ' 선택을 풀었습니다';
  ed.focus = ed.keep ? null : '[data-hbox="' + id + '"]'; render(); const s = document.getElementById('hedstatus'); if (s) s.textContent = ed.msg;
}

/* ---------- 눌림과 키 ---------- */
function hudEdClick(a, el) {
  const ed = G.hudEd; const id = el.dataset.k || ed.sel; const aria = el.getAttribute('aria-disabled') === 'true';
  if (Date.now() - (ed.dragAt || 0) < 120 && a === 'hedsel') return; /* 끌고 놓은 직후의 click은 고르기가 아니다 */
  if (a === 'hedpick') return;
  if (a === 'hedsel') hudEdSelect(id);
  else if (a === 'hedsave') hudEdSave();
  else if (a === 'hedcancel') hudEdCancel();
  else if (a === 'hedreset') hudEdReset();
  else if (a === 'hedslot') hudEdSlot(+el.dataset.n);
  else if (a === 'hedgrp') { ed.keep = hudEdKeepSel(); hudEdGroup(+el.dataset.k); }
  else if (a === 'hedgrid') { ed.grid = !ed.grid; hudEdPanelSync(); hudEdMsg(ed.grid ? '격자를 켰습니다' : '격자를 껐습니다'); }
  else if (a === 'hedfold') hudEdFold();
  else if (a === 'hedone') { if (ed.sel) { ed.keep = hudEdKeepSel(); hudEdResetOne(ed.sel); } }
  else if (a === 'hedpsw') { if (ed.sel) { ed.keep = hudEdKeepSel(); hudEdToggle(ed.sel); } }
  else if (a === 'hedundo') hudEdUndo();
  else if (a === 'hedmode') { hudFreeSetMode(el.dataset.k === 'free' ? 'free' : 'align'); }
  else if (a === 'hedpush') hudFreePushSet();
  else if (a === 'hednums') hudFreeNums(el.checked);
  else if (a === 'hedlist') hudEdToList();
  else if (a === 'hedhelp') { ed.help = !ed.help; const h = document.getElementById('hedhelp'); if (h) h.hidden = !ed.help; el.setAttribute('aria-expanded', String(ed.help)); hudEdPlace(); }
  else if (!ed.sel) return;
  else if (a === 'hedmv') { ed.keep = hudEdKeepSel(); hudEdStep(ed.sel, +el.dataset.d, false); }
  else if (a === 'hedzn') { ed.keep = hudEdKeepSel(); hudEdZone(ed.sel, +el.dataset.d, false); }
  void aria;
}
/* 편집 중 키: 처리했거나 막아야 하면 true. Tab은 그대로 둔다 */
function hudEdKey(ev) {
  const ed = G.hudEd; if (!ed) return false;
  if (ev.key === 'Tab') return true;
  if (ev.key === 'Escape') { ev.preventDefault(); if (ed.drag) { hudEdDragStop(true); return true; } hudEdCancel(); return true; }
  const t = ev.target && ev.target.closest ? ev.target.closest('.hbox') : null;
  if (t) {
    const id = t.dataset.hbox; const k = ev.key;
    if ((ev.ctrlKey || ev.metaKey) && (k === 'z' || k === 'Z') && !ev.altKey) { ev.preventDefault(); hudEdUndo(); return true; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return true;
    if (hudFreeEd() && (k === '[' || k === ']')) { ev.preventDefault(); const q = G.hudEd.draft.fr[hudDev()].m[id]; hudFreeTry(id, { w: q.w + (k === ']' ? 1 : -1) * (ev.shiftKey ? 4 : 1) }); }
    else if (k === 'Enter' || k === ' ') { ev.preventDefault(); hudEdSelect(id); }
    else if (k === 'ArrowUp' || k === 'ArrowDown') { ev.preventDefault(); hudEdStep(id, k === 'ArrowUp' ? -1 : 1, ev.shiftKey); }
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { ev.preventDefault(); hudEdZone(id, k === 'ArrowLeft' ? -1 : 1, ev.shiftKey); }
    else if (k === '+' || k === '=') { ev.preventDefault(); hudEdSize(id, 1); }
    else if (k === '-' || k === '_') { ev.preventDefault(); hudEdSize(id, -1); }
    else if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); hudEdToggle(id); }
    return true;
  }
  return true; /* 막대 단추의 Enter · Space는 브라우저가 click으로 바꿔 주므로 여기서는 게임 키만 막는다 */
}

/* ---------- 끌기(마우스 · 펜은 모듈 아무 데나, 손가락은 이름표) ---------- */
function hudEdTarget(x, y, dragId) {
  const ov = document.querySelector('.hov'); if (!ov) return null;
  const boxes = [...ov.querySelectorAll('.hbox')].filter(b => b.style.display !== 'none' && b.dataset.hbox !== dragId);
  const rects = boxes.map(b => ({ id: b.dataset.hbox, zone: b.dataset.zone, r: b.getBoundingClientRect() }));
  const inZone = zn => rects.filter(q => q.zone === zn);
  const hit = rects.find(q => x >= q.r.left && x <= q.r.right && y >= q.r.top && y <= q.r.bottom);
  if (hit) {
    const after = y > hit.r.top + hit.r.height / 2; const idx = inZone(hit.zone).findIndex(q => q.id === hit.id) + (after ? 1 : 0);
    return { zone: hit.zone, index: idx, line: { x: hit.r.left, w: hit.r.width, y: after ? hit.r.bottom : hit.r.top } };
  }
  const fit = document.querySelector('#root > .fit');
  for (const zn of HUD_ZONES) {
    const z = fit && fit.querySelector('.hz-' + zn); if (!z) continue; const r = z.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      const list = inZone(zn); let idx = list.filter(q => q.r.top + q.r.height / 2 < y).length;
      const ly = list.length === 0 ? r.top + 4 : idx < list.length ? list[idx].r.top : list[list.length - 1].r.bottom;
      return { zone: zn, index: idx, line: { x: r.left, w: r.width, y: ly } };
    }
  }
  return null;
}
function hudEdDragStop(cancel) {
  const ed = G.hudEd; const D = ed && ed.drag; if (!D) return; ed.drag = null;
  document.querySelectorAll('.hghost,.hline').forEach(x => x.remove());
  document.querySelectorAll('.hbox.dragging').forEach(x => x.classList.remove('dragging'));
  const ov = document.querySelector('.hov'); if (ov) ov.classList.remove('dragon');
  document.querySelectorAll('.hzbox.tgt').forEach(x => x.classList.remove('tgt'));
  if (!D.started) return;
  ed.dragAt = Date.now(); if (hudFreeEd()) { hudFreeDragDrop(D, cancel); return; }
  if (cancel || !D.tgt) { hudEdMsg('옮기지 않았습니다'); return; }
  const m = hudModDef(D.id);
  hudEdDo(D.id, L => hudMoveTo(L, D.id, D.tgt.zone, D.tgt.index), L => m.n + ': ' + hudEdPosText(L, D.id) + '에 놓았습니다');
}
function initHudDirect() {
  if (typeof document === 'undefined') return;
  initHudFree();
  let raf = 0; const again = () => { if (!G.hudEd || raf) return; raf = requestAnimationFrame(() => { raf = 0; hudEdPlace(); }); };
  window.addEventListener('scroll', again, true);  window.addEventListener('resize', again);
  document.addEventListener('change', ev => { const t = ev.target; if (!G.hudEd || !t || t.id !== 'hedpick') return; if (!t.value) return; if (G.hudEd.sel !== t.value) { G.hudEd.keep = hudEdKeepSel(); G.hudEd.sel = null; hudEdSelect(t.value); } const bx = document.querySelector('.hov [data-hbox="' + t.value + '"]'); if (bx && bx.scrollIntoView) bx.scrollIntoView({ block: 'nearest' }); });
  document.addEventListener('input', ev => { const t = ev.target; if (!G.hudEd || !t || t.id !== 'hedsl' || !G.hudEd.sel) return; hudEdSizeSet(G.hudEd.sel, HUD_SIZES[+t.value]); });
  document.addEventListener('pointerdown', ev => {
    const ed = G.hudEd; if (!ed) return; const b = ev.target && ev.target.closest ? ev.target.closest('.hbox') : null; if (!b || (ev.button != null && ev.button > 0) || ev.isPrimary === false) return;
    const rsEl = ev.target.closest('.hrh'); const tag = !!ev.target.closest('.htag') || !!rsEl; const touch = ev.pointerType === 'touch';
    ed.drag = { id: b.dataset.hbox, pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, started: false, tgt: null, can: !touch || tag, b, rs: rsEl && hudFreeEd() ? rsEl.dataset.rs : null };
    if (!touch) ev.preventDefault();
  });
  document.addEventListener('pointermove', ev => {
    const ed = G.hudEd; const D = ed && ed.drag; if (!D || ev.pointerId !== D.pid || !D.can) return;
    if (!D.started) {
      if (Math.hypot(ev.clientX - D.x0, ev.clientY - D.y0) < 6) return;
      D.started = true; try { D.b.setPointerCapture(ev.pointerId); } catch (e) { }
      D.b.classList.add('dragging'); document.querySelector('.hov').classList.add('dragon');
      const g = document.createElement('div'); g.className = 'hghost'; g.setAttribute('aria-hidden', 'true'); g.textContent = '⠿ ' + hudModDef(D.id).n; document.querySelector('.hov').appendChild(g);
      if (!hudFreeEd()) { const ln = document.createElement('div'); ln.className = 'hline'; ln.setAttribute('aria-hidden', 'true'); ln.style.display = 'none'; document.querySelector('.hov').appendChild(ln); }
    }
    ev.preventDefault();
    const g = document.querySelector('.hghost'); if (g) { g.style.left = Math.min(ev.clientX + 10, document.documentElement.clientWidth - 140) + 'px'; g.style.top = (ev.clientY + 10) + 'px'; }
    const fe = document.querySelector('#root > .fit'); if (fe) { const fr = fe.getBoundingClientRect(); if (ev.clientY < fr.top + 60) fe.scrollTop -= 14; else if (ev.clientY > fr.bottom - 50) fe.scrollTop += 14; }
    if (hudFreeEd()) { hudFreeDragMove(ev, D); return; }
    D.tgt = hudEdTarget(ev.clientX, ev.clientY, D.id);
    const ln = document.querySelector('.hline'); document.querySelectorAll('.hzbox.tgt').forEach(x => x.classList.remove('tgt'));
    if (D.tgt && ln) { ln.style.display = ''; ln.style.cssText = `left:${D.tgt.line.x}px;width:${D.tgt.line.w}px;top:${D.tgt.line.y - 2}px`; const z = document.querySelector('.hzbox[data-hzbox="' + D.tgt.zone + '"]'); if (z) z.classList.add('tgt'); }
    else if (ln) ln.style.display = 'none';
  }, { passive: false });
  document.addEventListener('pointerup', ev => { const ed = G.hudEd; const D = ed && ed.drag; if (!D || ev.pointerId !== D.pid) return; if (!D.started) { ed.drag = null; return; } hudEdDragStop(false); });
  document.addEventListener('pointercancel', ev => { const ed = G.hudEd; const D = ed && ed.drag; if (!D || ev.pointerId !== D.pid) return; hudEdDragStop(true); });
}

/* 편집 중 전투 화면: 끈 모듈 · 비어 있는 모듈 · 읽는 글만 있는 모듈도 틀을 가진 자리로 그린다(옮기고 켤 수 있게). 구역이 비어도 놓을 자리를 둔다 */
function hudEdZones(html) {
  const L = hudLayFor(hudDev()); const Z = {};
  for (const zn of HUD_ZONES) {
    let out = '';
    for (const id of L.z[zn]) {
      const m = hudModDef(id); const h = html[id]; const empty = !h || !String(h).trim(); const sz = L.s[id];
      const hide = !empty && /class="qcons tlz"/.test(h);
      const why = L.off.includes(id) ? '꺼져 있습니다' : empty ? '지금은 비어 있습니다. 상황에 따라 나타납니다' : /^\s*<div class="sr"/.test(h) ? '지금은 눈에 보이지 않습니다' : hide ? '도구 칸 안에 접혀 있습니다' : '';
      const pad = `padding-top:calc(var(--htag-h,36px)/${sz / 100});`; /* 이름표(틀 위쪽 띠)만큼 안쪽 위 여백을 줘서 칸의 첫 줄이 이름표 아래에서 시작한다(zoom에 맞춰 나눈다) */
      if (why) out += `<div class="hmod hstub" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}"` : ''} style="${sz !== 100 ? `zoom:${sz / 100};` : ''}${pad}"><span>${esc(m.n)}: ${why}</span></div>`;
      else out += `<div class="hmod${m.hm ? ' hm' : ''}${m.mine ? ' mine' : ''}" data-hmod="${id}"${sz !== 100 ? ` data-hz="${sz}"` : ''} style="${sz !== 100 ? `zoom:${sz / 100};` : ''}${pad}">${h}</div>`;
    }
    Z[zn] = `<div class="hz hz-${zn}" data-zone="${zn}">${out || '<div class="hzempty">비어 있습니다. 여기에 놓을 수 있습니다</div>'}</div>`;
  }
  return Z;
}
