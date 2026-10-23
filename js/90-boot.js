'use strict';
if (typeof document !== 'undefined') {
  G.data = loadLocal(); if ((window.NRK_SITE || {}).hardOpen) G.data.hardOpen = 1; curSweep(); reviveLocal(); // 시제품 사이트(10월 16일): 빌드가 정한 사이트 설정으로 가혹을 처음부터 연다
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash === '#admin') { G.adminLink = true; G.scr = 'admin'; G.back = 'title'; } // 관리자 페이지 바로 열기: 주소 끝에 #admin
  document.addEventListener('pointerdown', sndUnlock, { once: false });
  document.addEventListener('keydown', sndUnlock);
  document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'ibquery') { itemBookInput(ev.target); return; } if (ev.target && ev.target.dataset && ev.target.dataset.cdx) { codexMeet(ev.target.dataset.cdx); G.data.codex[ev.target.dataset.cdx].note = ev.target.value.slice(0, 400); saveLocal(); return; } if (ev.target && ev.target.id === 'eqnote') { G.eqWhy = Object.assign({}, G.eqWhy, { note: ev.target.value }); return; } const id = ev.target && ev.target.id; if (id !== 'volm' && id !== 'vols') return; const v = +ev.target.value / 100; sndSet(id === 'volm' ? { music: v } : { sfx: v }); const o = document.getElementById(id + 'v'); if (o) o.textContent = Math.round(v * 100) + '%'; });
  document.addEventListener('click', onClick);
  /* 10월 24일 전리품 화면: 전리품 칸을 가방 칸으로 끌어 놓으면 자리를 바꾼다 */
  document.addEventListener('dragstart', ev => { const el = ev.target.closest && ev.target.closest('[data-drag]'); if (!el || !G.sheet || G.sheet.kind !== 'consfull') return; ev.dataTransfer.setData('text/plain', el.dataset.drag); ev.dataTransfer.effectAllowed = 'move'; G.sheet.data.sel = +el.dataset.drag; });
  document.addEventListener('dragover', ev => { const t = ev.target.closest && ev.target.closest('[data-drop]'); if (t && G.sheet && G.sheet.kind === 'consfull') { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } });
  document.addEventListener('drop', ev => { const t = ev.target.closest && ev.target.closest('[data-drop]'); if (!t || !G.sheet || G.sheet.kind !== 'consfull') return; ev.preventDefault(); const li = +ev.dataTransfer.getData('text/plain'); if (!isNaN(li)) G.sheet.data.sel = li; consfullSwap(+t.dataset.drop); });
  document.addEventListener('keydown', onKey);
  document.addEventListener('change', ev => { if (ev.target && ev.target.dataset && ev.target.dataset.ibfilter) { itemBookFilter(ev.target); return; } if (ev.target && ev.target.dataset && (ev.target.dataset.a === 'hudsz' || ev.target.dataset.a === 'hudzone')) { hudEditChange(ev.target); return; } if (ev.target && ev.target.name === 'eqrs') { G.eqWhy = Object.assign({}, G.eqWhy, { reason: ev.target.value }); return; } if (ev.target && ev.target.id === 'hudsts') { hudSet('sts', ev.target.value); render(); const x = document.getElementById('hudsts'); if (x) x.focus(); return; } if (ev.target && ev.target.id === 'setfs') { G.data.fs = FS_OPTS.includes(+ev.target.value) ? +ev.target.value : 1; saveLocal(); applyPrefs(); render(); return; } if (ev.target && (ev.target.id === 'pace' || ev.target.id === 'setpace')) { G.pace = ev.target.value; G.data.pace = G.pace; saveLocal(); if (G.stepResolve && G.pace !== 'step') { const r = G.stepResolve; G.stepResolve = null; r(); } } });
  G.infoOn = G.data.infoOn !== false; G.pace = G.data.pace || 'normal'; initPop(); initPv(); initHudDrag(); initHudDirect(); document.addEventListener('pointerover', treeHover);
  window.addEventListener('hashchange', () => { if (location.hash === '#admin' && G.scr !== 'admin') { G.adminLink = true; if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = 'admin'; render(); } });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => document.documentElement.style.setProperty('--app-h', window.visualViewport.height + 'px'));
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (G.b && window.innerWidth >= 1100) G.logOpen = false; render(); }, 120); });
  render();
  window.addEventListener('online', () => { if (G.cloud && G.cloud.ready) cloudFlush(); else if (G.scr === 'title' && G.acct && !G.acct.anon) cloudLoad().then(render); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cloudFlush(); });
  Promise.resolve(initCaps()).then(initSiteUpdates, initSiteUpdates);
}
if (typeof module !== 'undefined') module.exports.UI = { G, vTitle, vBattle, vRunMap, vDash, aggregate, blankData, startRun, enterRoom, battleContinue, doAct, vSheet, scenAxes };

