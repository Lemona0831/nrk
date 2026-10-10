'use strict';
/* ===== 설정 창 탭 (10월 10일 0.6a.2-95) =====
   소리 · 화면 · 전투 화면 세 탭. 탭 목록은 role="tablist"(좌우 화살표, Home, End로 옮기고 옮기면 바로 열린다), 칸은 role="tabpanel".
   접는 칸(details)의 열림은 G.hudItemsOpen · G.hudListOpen에 기억해 다시 그려도 그대로 둔다. */
const SET_TABS = [['sound', '소리'], ['screen', '화면'], ['battle', '전투 화면']];
function setTabCur() { return SET_TABS.some(x => x[0] === G.setTab) ? G.setTab : (hudLiveSheet() ? 'battle' : 'sound'); }
function setTabsHtml(panes) {
  const cur = setTabCur();
  const tabs = SET_TABS.map(([k, n]) => `<button type="button" role="tab" id="settab-${k}" class="settab${cur === k ? ' on' : ''}" aria-selected="${cur === k}" aria-controls="setpan-${k}" tabindex="${cur === k ? 0 : -1}" data-a="settab" data-k="${k}">${n}</button>`).join('');
  return `<div class="settabs" role="tablist" aria-label="설정 구분">${tabs}</div>` + SET_TABS.map(([k]) => `<div role="tabpanel" id="setpan-${k}" aria-labelledby="settab-${k}" tabindex="0" class="setpan"${cur === k ? '' : ' hidden'}>${cur === k ? panes[k] : ''}</div>`).join('');
}
function setTabGo(k, focusTab) {
  if (!SET_TABS.some(x => x[0] === k)) return;
  G.setTab = k; render(); const sh = document.querySelector('.sheet'); if (sh) sh.scrollTop = 0;
  if (focusTab) { const t = document.getElementById('settab-' + k); if (t) t.focus(); }
}
(function initSettingsTabs() {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', ev => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-a="settab"],[data-a="hudslotload"],[data-a="hudasktog"]') : null; if (!el || G.hudEd) return;
    if (el.dataset.a === 'settab') { setTabGo(el.dataset.k, true); return; }
    if (el.getAttribute('aria-disabled') === 'true') { toast('비어 있는 칸은 불러올 수 없습니다. 화면에서 편집하고 저장하면 담깁니다'); return; }
    if (el.dataset.a === 'hudasktog') { G.data.hudNoAsk = !G.data.hudNoAsk; saveLocal(); render(); const x = document.querySelector('[data-a="hudasktog"]'); if (x) x.focus(); return; }
    const i = +el.dataset.n; /* 지금 배치와 다르면 먼저 묻는다. 같으면 바로 불러온다 */
    hudSlotAsk(el, hudSlotNeedsAsk(i), () => { if (hudSlotLoadLive(i)) { toast('배열 칸 ' + (i + 1) + '을 불러왔습니다'); render(); const x = document.querySelector('[data-a="hudslotload"][data-n="' + i + '"]'); if (x) x.focus(); } });
  });
  document.addEventListener('keydown', ev => {
    const t = ev.target && ev.target.closest ? ev.target.closest('.settab') : null; if (!t || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const ks = SET_TABS.map(x => x[0]); const i = ks.indexOf(t.dataset.k); let n = -1;
    if (ev.key === 'ArrowRight') n = (i + 1) % ks.length; else if (ev.key === 'ArrowLeft') n = (i + ks.length - 1) % ks.length; else if (ev.key === 'Home') n = 0; else if (ev.key === 'End') n = ks.length - 1;
    if (n < 0) return; ev.preventDefault(); ev.stopPropagation(); setTabGo(ks[n], true);
  }, true);
  document.addEventListener('toggle', ev => {
    const d = ev.target; if (!d || !d.classList || !d.classList.contains('hdet')) return;
    if (d.id === 'hudset') G.hudItemsOpen = d.open; else if (d.id === 'hudedit') G.hudListOpen = d.open;
  }, true);
})();
