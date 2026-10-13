'use strict';
// 새 배포를 확인하되 입력·전투·보상 선택은 끝날 때까지 기다린다.
const SITE_UPDATE = { current: '', pending: '', checking: false, preparing: false, applying: false, ready: '', notified: '', started: false };
function siteUpdateSafe() {
  if (typeof document === 'undefined' || document.hidden || G.busy || G.creating || G.b || G.sheet || G.menuOpen) return false;
  if (!['title', 'run', 'shop', 'wait'].includes(G.scr)) return false;
  if (G.run && (G.run.consPending || []).length) return false;
  const el = document.activeElement;
  return !(el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable));
}
async function siteUpdateFetch(file) {
  const url = new URL(file, document.baseURI); url.searchParams.set('_check', String(Date.now()));
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try { const response = await fetch(url, { cache: 'no-store', signal: controller.signal }); if (!response.ok) throw new Error('update unavailable'); return await response.text(); }
  finally { clearTimeout(timer); }
}
function siteUpdateSave() {
  try {
    if (G.run) { if (runLive()) G.data.cur = JSON.parse(JSON.stringify(G.run)); saveRunLocal(); }
    if (!saveLocal()) return false;
    return localSaveText(localStorage.getItem(SKEY)) === JSON.stringify(G.data);
  } catch (e) { return false; }
}
async function siteUpdateApply() {
  const U = SITE_UPDATE, target = U.pending;
  if (!target || U.preparing || U.applying || !siteUpdateSafe()) return false;
  U.preparing = true;
  try {
    if (U.ready !== target) {
      const html = await siteUpdateFetch('index.html');
      const meta = new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="nrk-release"]');
      if (!meta || meta.content !== target) return false; // 배포 도중 파일이 섞이면 다음 확인까지 기다린다.
      U.ready = target;
    }
    if (U.pending !== target || !siteUpdateSafe()) return false;
    if (!siteUpdateSave()) { if (U.notified !== target) { U.notified = target; toast('진행 상황을 저장하지 못해 업데이트를 미뤘습니다'); } return false; }
    try { if (G.run && runLive() && G.scr !== 'title') sessionStorage.setItem('nrkUpdateResume', JSON.stringify({ id: G.run.id, account: G.data.accountId || '' })); } catch (e) { }
    U.applying = true;
    toast('진행 상황을 저장했습니다. 업데이트를 적용합니다');
    const url = new URL(location.href); url.searchParams.set('nrk_update', target);
    setTimeout(() => location.replace(url.href), 700);
    return true;
  } catch (e) { return false; } finally { U.preparing = false; }
}
async function siteUpdateCheck() {
  const U = SITE_UPDATE;
  if (U.checking || U.applying || !U.current || document.hidden) return;
  U.checking = true;
  try {
    const data = JSON.parse(await siteUpdateFetch('release.json'));
    if (!data || !/^[a-f0-9]{64}$/.test(data.revision)) return;
    U.pending = data.revision === U.current ? '' : data.revision;
    if (U.pending) await siteUpdateApply();
  } catch (e) { /* 연결 실패·오프라인에서는 현재 게임을 계속한다. */ }
  finally { U.checking = false; }
}
function initSiteUpdates() {
  if (SITE_UPDATE.started || !/^https?:$/.test(location.protocol)) return;
  const meta = document.querySelector('meta[name="nrk-release"]');
  if (!meta || !/^[a-f0-9]{64}$/.test(meta.content)) return;
  SITE_UPDATE.started = true; SITE_UPDATE.current = meta.content;
  try { const hint = JSON.parse(sessionStorage.getItem('nrkUpdateResume') || 'null'); sessionStorage.removeItem('nrkUpdateResume'); if (hint && G.scr === 'title' && G.data.cur && G.data.cur.id === hint.id && (G.data.accountId || '') === hint.account) resumeRun(); } catch (e) { }
  const block = ev => { if (SITE_UPDATE.applying) { ev.preventDefault(); ev.stopImmediatePropagation(); } };
  document.addEventListener('click', block, true); document.addEventListener('keydown', block, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) siteUpdateCheck(); });
  window.addEventListener('focus', siteUpdateCheck);
  setInterval(siteUpdateCheck, 60000);
  setInterval(() => { if (SITE_UPDATE.pending) siteUpdateApply(); }, 2000);
  siteUpdateCheck();
}
