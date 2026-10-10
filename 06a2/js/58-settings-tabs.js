'use strict';
/* ===== 설정 창 탭 (10월 10일 0.6a.2-95) =====
   소리 · 화면 · 전투 화면 · 접근성 네 탭. 탭 목록은 role="tablist"(좌우 화살표, Home, End로 옮기고 옮기면 바로 열린다), 칸은 role="tabpanel".
   접는 칸(details)의 열림은 G.hudItemsOpen · G.hudListOpen에 기억해 다시 그려도 그대로 둔다. */
const SET_TABS = [['sound', '소리'], ['screen', '화면'], ['battle', '전투 화면'], ['access', '접근성']];
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

/* ===== 접근성 · 입력 설정 (10월 10일 0.6a.2-113) =====
   G.data.opt에 모아 저장한다(없으면 기본값). 게임 규칙에는 닿지 않는 화면 · 입력 설정이다.
   hc 고대비 · sym 글자와 모양으로도 표시 · tsp 글 간격 넓게 · tap 누르는 칸 크게(html 클래스, css/78) · toast 알림이 남는 시간 · ask 위험한 행동 앞에서 묻기 · vib 진동 · wake 화면 켜 두기 */
const OPT_DEF = { hc: false, sym: false, tsp: false, tap: false, focus: false, scroll: false, noHover: false, hold: 'normal', toast: 'normal', ask: false, vib: false, wake: false };
const HOLD_MS = { short: 250, normal: 450, long: 800 };
const TOAST_MS = { normal: 2400, long: 5000, xlong: 10000 };
const TOAST_N = { normal: '보통', long: '길게', xlong: '아주 길게' };
function optGet(k) { const o = (G.data && G.data.opt) || {}; return o[k] == null ? OPT_DEF[k] : o[k]; }
function optSet(k, v) { G.data.opt = Object.assign({}, G.data.opt || {}, { [k]: v }); saveLocal(); applyPrefs(); }
const toastBase = () => TOAST_MS[optGet('toast')] || TOAST_MS.normal;
const vibOk = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const wakeOk = () => typeof navigator !== 'undefined' && !!navigator.wakeLock;
/* 진동: 전투 중 내 생명력이 줄어든 만큼 짧게(최대 생명력의 25% 이상이면 길게) */
function vibSync() {
  const b = G.b; if (!b || !b.p) { G.vibB = null; return; }
  if (G.vibB !== b) { G.vibB = b; G.vibHp = b.p.hp; return; }
  const d = G.vibHp - b.p.hp; G.vibHp = b.p.hp;
  if (d > 0 && optGet('vib') && vibOk()) { try { navigator.vibrate(d >= b.p.hpMax * 0.25 ? [70, 40, 70] : 35); } catch (e) { } }
}
/* 화면 켜 두기: 지원하는 브라우저에서만. 탭을 숨기면 풀리므로 다시 보일 때 다시 건다 */
const WAKE = { s: null, busy: false };
function wakeSync() {
  if (!wakeOk() || WAKE.busy) return;
  const want = optGet('wake') && document.visibilityState === 'visible';
  if (want && !WAKE.s) { WAKE.busy = true; navigator.wakeLock.request('screen').then(s => { WAKE.s = s; s.addEventListener('release', () => { if (WAKE.s === s) WAKE.s = null; }); }).catch(() => { }).finally(() => { WAKE.busy = false; }); }
  else if (!want && WAKE.s) { const s = WAKE.s; WAKE.s = null; s.release().catch(() => { }); }
}
/* 위험한 행동 앞에서 묻는다(doAct): 도망, 그리고 내 다음 차례 전에 받을 피해 어림이 지금 생명력 이상일 때 방어 · 흘리기 · 생명력 플라스크가 아닌 행동 */
function riskAsk(b, a) {
  if (!optGet('ask') || !b || !a || G.hudEd || (b.ctx && b.ctx.tut)) return true;
  if (a.id === 'flee') return ask('도망칩니다. 성공하면 방 밖으로 물러나고, 앞으로 가려면 그 방을 다시 이겨야 합니다. 계속할까요?');
  if (['guard', 'dodge', 'flaskL'].includes(a.id)) return true;
  const x = incomingEst(b); if (x.n && x.sum >= b.p.hp) return ask('다음 차례 전에 받을 피해 어림이 지금 생명력 이상입니다. 이 행동을 할까요?');
  return true;
}
function vAccessPane() {
  const sw = (k, lab) => `<button type="button" class="sw" role="switch" aria-checked="${optGet(k) ? 'true' : 'false'}" data-a="optsw" data-k="${k}" aria-labelledby="optl-${k}">${optGet(k) ? '켜짐' : '꺼짐'}</button>`;
  const row = (k, lab, mini, ctl) => `<div class="setrow"><span class="lab" id="optl-${k}">${lab}</span><span class="mini">${mini}</span>${ctl}</div>`;
  const dis = (ok, msg) => ok ? '' : ` <small>${msg}</small>`;
  const see = `<section class="setg"><h4>보기</h4>
${row('hc', '고대비', '배경은 더 어둡게, 글자와 테두리는 더 밝게 합니다', sw('hc', '고대비'))}
${row('sym', '모양으로도 표시', '기록 줄 앞에 ▲ ▼ 모양을 붙여 색을 몰라도 구분됩니다', sw('sym', '색 말고 모양으로도 표시'))}
${row('tsp', '글 간격 넓게', '글자 사이와 줄 사이를 넓힙니다', sw('tsp', '글 간격 넓게'))}
${row('tap', '누르는 칸 크게', '버튼과 목록의 누르는 칸을 키웁니다', sw('tap', '누르는 칸 크게'))}
${row('focus', '선택 위치 강조', '현재 초점을 둔 버튼과 입력칸에 굵은 테두리를 표시합니다', sw('focus', '선택 위치 강조'))}
${row('scroll', '전투 화면 스크롤', '전투 화면을 세로로 펼칩니다. 큰 글자와 작은 화면에서 정보를 읽기 편합니다', sw('scroll', '전투 화면 스크롤'))}</section>`;
  const inp = `<section class="setg"><h4>입력과 알림</h4>
<div class="setrow"><label for="opttoast">알림 시간</label><span class="mini">화면 아래 알림이 남는 시간입니다. 지난 알림은 메뉴에서 다시 봅니다</span><select id="opttoast">${Object.keys(TOAST_MS).map(k => `<option value="${k}"${optGet('toast') === k ? ' selected' : ''}>${TOAST_N[k]}</option>`).join('')}</select></div>
${row('noHover', '자동 설명 끄기', '마우스를 올려도 설명이 뜨지 않습니다. 키보드 초점이나 길게 누르기로 확인합니다', sw('noHover', '자동 설명 끄기'))}
<div class="setrow"><label for="opthold">길게 누르기</label><span class="mini">설명 창이 열릴 때까지 누르는 시간입니다</span><select id="opthold">${[['short','짧게 (0.25초)'],['normal','보통 (0.45초)'],['long','길게 (0.8초)']].map(([k,n])=>`<option value="${k}"${optGet('hold')===k?' selected':''}>${n}</option>`).join('')}</select></div>
${row('ask', '위험할 때 확인', '도망 앞에서, 그리고 받을 피해 어림이 생명력 이상일 때 방어 · 흘리기 · 생명력 플라스크가 아닌 행동 앞에서 묻습니다', sw('ask', '위험할 때 확인'))}
${row('vib', '진동', '전투에서 맞으면 짧게 울립니다' + dis(vibOk(), '이 기기는 진동을 지원하지 않습니다.'), vibOk() ? sw('vib', '진동') : '<span class="mini">지원 안 함</span>')}
${row('wake', '화면 켜 두기', '이 게임을 보는 동안 화면이 꺼지지 않게 합니다' + dis(wakeOk(), '이 기기는 지원하지 않습니다.'), wakeOk() ? sw('wake', '화면 켜 두기') : '<span class="mini">지원 안 함</span>')}</section>`;
  return see + inp;
}
(function initAccessOpts() {
  if (typeof document === 'undefined') return;
  const LAB = { hc: '고대비', sym: '모양으로도 표시', tsp: '글 간격 넓게', tap: '누르는 칸 크게', focus: '선택 위치 강조', scroll: '전투 화면 스크롤', noHover: '자동 설명 끄기', ask: '위험할 때 확인', vib: '진동', wake: '화면 켜 두기' };
  document.addEventListener('click', ev => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-a="optsw"]') : null; if (!el || G.hudEd) return;
    const k = el.dataset.k; const on = !optGet(k); optSet(k, on);
    toast((LAB[k] || k) + (on ? '을(를) 켰습니다' : '을(를) 껐습니다')); if (k === 'vib' && on && vibOk()) { try { navigator.vibrate(40); } catch (e) { } }
    render(); const x = document.querySelector('[data-a="optsw"][data-k="' + k + '"]'); if (x) x.focus();
  });
  document.addEventListener('change', ev => {
    if (ev.target && ev.target.id === 'opthold') { optSet('hold', HOLD_MS[ev.target.value] ? ev.target.value : 'normal'); return; }
    const t = ev.target; if (!t || t.id !== 'opttoast') return; optSet('toast', TOAST_MS[t.value] ? t.value : 'normal'); toast('알림 시간: ' + TOAST_N[optGet('toast')]);
  });
  document.addEventListener('visibilitychange', wakeSync);
})();
