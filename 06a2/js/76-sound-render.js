'use strict';
/* ===== 소리: 화면에 맞는 음악, 효과음, 켜기·끄기와 음량 =====
   브라우저는 사람이 누르거나 키를 입력하기 전에는 소리를 내지 못하게 한다. 첫 입력에서 시작한다.
   음악은 미리 내려받지 않고(preload none) 듣는 만큼만 받는다. */
const SND = { el: null, cur: '', want: '', unlocked: false, fadeT: 0 };
function sndCfg() { const a = (G.data && G.data.audio) || {}; return { on: a.on !== false, music: a.music == null ? 0.45 : a.music, sfx: a.sfx == null ? 0.7 : a.sfx }; }
function musicFor() {
  const scr = PAGES.includes(G.scr) ? G.back || 'title' : G.scr; // 랭킹·기록·관리자 페이지는 원래 화면의 곡을 이어 간다
  const chM = k => { const c = (G.run && G.run.ch) || 1; return MUSIC['ch' + c + '_' + k] ? 'ch' + c + '_' + k : 'ch1_' + k; }; // 챕터 곡이 없으면 1챕터 곡
  if (scr === 'run' && G.b && G.b.ctx && G.b.ctx.boss) return chM('boss');
  if (scr === 'run' || scr === 'scen' || (scr === 'tut' && G.b)) return chM('dungeon');
  if (scr === 'dead' || (scr === 'survey' && G.run && G.run.result === 'lose')) return 'failed';
  if (scr === 'settle' || scr === 'wait' || (scr === 'survey' && G.run && G.run.phase === 'clearsv')) return MUSIC['ch' + ((G.run && G.run.ch) || 1) + '_finished'] ? 'ch' + G.run.ch + '_finished' : 'finished'; // 정산 중에는 run.ch가 방금 깬 챕터다. 챕터 곡이 없으면 기본 곡
  if (scr === 'shop') return 'shop';
  return 'title';
}
function sndSync() {
  if (typeof Audio === 'undefined') return;
  const c = sndCfg(); SND.want = c.on ? musicFor() : '';
  if (!SND.unlocked) return;
  if (!SND.el) { SND.el = new Audio(); SND.el.loop = true; SND.el.preload = 'none'; }
  const el = SND.el;
  if (SND.want === SND.cur) { el.volume = c.music; if (SND.cur && el.paused) el.play().catch(() => { }); return; }
  clearInterval(SND.fadeT);
  const next = SND.want;
  const start = () => { SND.cur = next; if (!next) { el.pause(); return; } el.src = MUSIC[next].src; el.volume = 0; el.play().catch(() => { }); let v = 0; SND.fadeT = setInterval(() => { v = Math.min(c.music, v + c.music / 10); el.volume = v; if (v >= c.music) clearInterval(SND.fadeT); }, 60); };
  if (!SND.cur || el.paused) { start(); return; }
  let v = el.volume; SND.fadeT = setInterval(() => { v = Math.max(0, v - Math.max(0.02, c.music / 8)); el.volume = v; if (v <= 0) { clearInterval(SND.fadeT); start(); } }, 60);
}
function sfx(k) {
  const c = sndCfg(); if (!c.on || !SND.unlocked || typeof Audio === 'undefined' || !SFX[k]) return;
  try { const a = new Audio(SFX[k].src); a.volume = c.sfx; a.play().catch(() => { }); } catch (e) { }
}
function sndUnlock() { if (SND.unlocked) return; SND.unlocked = true; sndSync(); }
function sndSet(patch) { G.data.audio = Object.assign({}, G.data.audio || {}, patch); saveLocal(); sndSync(); }
function vSettings() {
  const c = sndCfg(); const pct = v => Math.round(v * 100); const off = c.on ? '' : ' disabled';
  const sw = (a, on, lab) => `<button type="button" class="sw" role="switch" aria-checked="${on ? 'true' : 'false'}" data-a="${a}" aria-label="${lab}">${on ? '켜짐' : '꺼짐'}</button>`;
  const snd = `<section class="setg"><h4>소리</h4>
<div class="setrow"><span class="lab">소리</span><span></span>${sw('sndtoggle', c.on, '소리')}</div>
<div class="setrow"><label for="volm">음악</label><input id="volm" type="range" min="0" max="100" step="5" value="${pct(c.music)}"${off}><output id="volmv" for="volm">${pct(c.music)}%</output></div>
<div class="setrow"><label for="vols">효과음</label><input id="vols" type="range" min="0" max="100" step="5" value="${pct(c.sfx)}"${off}><button class="sm" data-a="sfxtest"${off} aria-label="효과음 들어 보기">들어 보기</button><small>효과음 <output id="volsv" for="vols">${pct(c.sfx)}%</output>. 소리는 처음에 꺼져 있고, 화면 위 🔇 버튼이나 여기서 켭니다. 음악은 화면에 따라 바뀝니다.</small></div></section>`;
  const scr = `<section class="setg"><h4>화면</h4>
<div class="setrow"><span class="lab">숫자 키</span><span class="mini">숫자 키 1부터 9까지와 Q · W · E 키로 행동 버튼을 누릅니다</span>${sw('numkeys', G.data.numKeys !== false, '숫자 키로 행동')}</div>
<div class="setrow"><span class="lab">설명 창</span><span class="mini">마우스를 올리거나 길게 누르면 뜹니다</span>${sw('infotoggle', G.infoOn, '설명 창')}</div>
<div class="setrow"><label for="setfs">글자 크기</label><span class="mini">화면 글자의 크기</span><select id="setfs">${FS_OPTS.map(v => `<option value="${v}"${(FS_OPTS.includes(+G.data.fs) ? +G.data.fs : 1) === v ? ' selected' : ''}>${Math.round(v * 100)}%</option>`).join('')}</select></div>
<div class="setrow"><span class="lab">움직임 줄이기</span><span class="mini">적 카드 확대, 버튼 빛남, 부드러운 스크롤, 알림이 미끄러져 나오는 것을 끕니다</span>${sw('rmotion', !!G.data.rm, '움직임 줄이기')}</div>
<div class="setrow"><label for="setpace">적 차례</label><span class="mini">적이 움직이는 빠르기</span><select id="setpace">${Object.keys(PACE).map(k => `<option value="${k}"${(G.pace || 'normal') === k ? ' selected' : ''}>${PACEN[k]}</option>`).join('')}</select></div></section>`;
  return setTabsHtml({ sound: snd, screen: scr, battle: hudSettings() }); /* 전투 중에 연 설정 창은 '전투 화면' 탭이 먼저 열린다 */
}
function render() {
  if (typeof document === 'undefined') return;
  sndSync(); applyPrefs();
  { const bd = (G.b && G.b.p && G.b.p.build) || (G.run && G.run.build) || ''; document.documentElement.style.setProperty('--cls', CLS_COLOR[bd] || 'transparent'); }
  const root = document.getElementById('root');
  let main = '';
  if (G.scr === 'dash') G.scr = 'admin';
  if (G.scr === 'guide') main = vGuide();
  else if (G.scr === 'title') main = vTitle();
  else if (G.scr === 'create') main = vCreate();
  else if (G.scr === 'settle') main = vSettle();
  else if (G.scr === 'shop') main = vShop();
  else if (G.scr === 'wait') main = vWait();
  else if (G.scr === 'rank') main = vRank();
  else if (G.scr === 'records') main = vRecords();
  else if (G.scr === 'goals') main = vGoals();
  else if (G.scr === 'mark') main = vMark();
  else if (G.scr === 'admin') main = vAdmin();
  else if (G.scr === 'tree') main = vTreePage();
  else if (G.scr === 'run') main = G.b ? '' : vRunMap();
  else if (G.scr === 'dead') main = vDead();
  else if (G.scr === 'survey') main = vSurvey();
  else if (G.scr === 'final') main = vFinal();
  else if (G.scr === 'scen') main = '';
  else if (G.scr === 'test') main = G.b ? '' : vTestSetup();
  else if (G.scr === 'tut') main = G.b ? '' : vTutHub();
  else if (G.scr === 'tutoffer') main = vTutOffer();
  const fit = (G.scr === 'run' && G.b) || (G.scr === 'scen' && G.b) || (G.scr === 'tut' && G.b) || (G.scr === 'test' && G.b);
  document.documentElement.classList.toggle('fitmode', !!fit);
  document.documentElement.style.setProperty('--app-h', (window.visualViewport ? window.visualViewport.height : window.innerHeight) + 'px');
  const y = window.scrollY; const ef0 = G.hudEd ? document.querySelector('#root > .fit') : null; const efy = ef0 ? ef0.scrollTop : 0; /* 편집 중에는 .fit이 스크롤 칸 */
  const fld = document.querySelector('.hz-mid'); const fy = fld ? fld.scrollTop : 0; const shEl = document.querySelector('.sheet'); const shy = shEl ? shEl.scrollTop : 0; const shk = G.sheet ? G.sheet.kind : '';
  const lg = document.querySelector('.side .blog'); const ly = lg ? lg.scrollTop : 0;
  const fk = focusKey(), hadSheet = !!G.shownSheet; /* 10월 7일: 다시 그려도 초점을 잃지 않게, 시트는 연 요소로 돌아가게 */
  if (G.hudEd && !fit) hudEdEnd('lost'); /* 편집 중 전투 화면이 없어지면 편집을 닫는다 */
  const edUi = G.hudEd ? hudEdUi() : '';
  const tail = `${vSheet()}`; const ine = tail ? ' inert' : ''; /* 시트가 열리면 뒤 화면은 inert */
  if (tail && !hadSheet) G.sheetRet = fk; G.shownSheet = !!tail;
  const nm = scrName(); document.title = nm ? nm + ' · 나락의 유산' : '나락의 유산 · 0.6a.2 스킬 시험판';
  const h2 = `<h2 class="sr">${esc(nm || '처음 화면')}</h2>`;
  if (fit) root.innerHTML = `<div class="fit"${ine}><button class="skip" data-a="skipacts">행동판으로 건너뛰기</button>${vHeader()}${G.hudEd ? '<div class="bmain">' : '<main class="bmain">'}${h2}${vBattle()}${G.hudEd ? '</div>' : '</main>'}${edUi}</div>${tail}`;
  else root.innerHTML = `<div class="app scr-${G.scr}"${ine}><button class="skip" data-a="skipmain">본문으로 건너뛰기</button>${vHeader()}<main id="main" tabindex="-1">${h2}${main}</main></div>${tail}`;
  if (POP.cur && !document.body.contains(POP.cur)) hidePop(); // 설명 창의 기준이 된 요소가 사라졌으면 닫는다
  if (!G.sheet && G.dropQ && G.dropQ.length && G.scr === 'run' && !G.b) setTimeout(nextDrop, 0); // 전리품 창을 닫기로 닫아도 남은 전리품을 이어서 건넨다
  fitDecide(fit); scrollPad(); if (fit) hudFreeAfter(); /* 자유 배치: 칸 높이를 재서 자리를 정한다(55-hud-free.js) */
  document.querySelectorAll('.tbl').forEach(d => { const c = d.querySelector('caption'); d.tabIndex = 0; d.setAttribute('role', 'region'); d.setAttribute('aria-label', (c && c.textContent) || '표'); }); /* 가로로 스크롤되는 표 영역은 키보드로 닿고 이름이 있어야 한다(10월 8일 axe: scrollable-region-focusable) */
  const f2 = document.querySelector('.hz-mid'); if (f2) f2.scrollTop = fy;
  if (shk === 'settings') { const sh2 = document.querySelector('.sheet'); if (sh2 && hadSheet) sh2.scrollTop = shy; } /* 설정 창은 항목을 바꿔도 보던 자리에 둔다 */
  const l2 = document.querySelector('.side .blog'); if (l2) l2.scrollTop = ly;
  const same = G.lastScr === G.scr; G.lastScr = G.scr; // 화면이 바뀌면 맨 위에서 시작한다
  if (!G.sheet && !fit) window.scrollTo(0, same ? y : 0);
  if (fit && G.fitS) window.scrollTo(0, G.fitNew ? 0 : y); /* 짧은 창의 전투: 다시 그려도 보던 자리 */
  focusBack(tail ? (hadSheet ? fk : null) : (hadSheet ? G.sheetRet || fk : fk), !!tail && !hadSheet, fit);
  if (G.hudEd) { const ef = document.querySelector('#root > .fit'); if (ef) ef.scrollTop = efy; hudEdPost(); } /* 편집 중: 보던 자리를 지키고 틀을 실제 요소에 붙인다 */
}
/* 10월 7일 2차: 전투 화면은 창 높이에 맞춰 한 화면에 두되, 그러면 전장이 모자란 창(확대 · 가로 휴대폰 · 짧은 휴대폰)에서는
   고정을 풀고 페이지를 스크롤한다(10월 2일의 원래 뜻). 같은 창 크기 · 같은 전투 · 같은 글자 크기에서는 한 번 정한 대로 둔다(차례마다 바뀌지 않게) */
const FIT_FIELD = 200;
/* 붙어 있는 머리줄과 아래 단추 줄에 초점이 가려지지 않게 한다(WCAG 2.2 2.4.11): 키보드로 옮긴 초점이 그 줄 아래로 스크롤되지 않도록 높이만큼 여백을 둔다 */
function scrollPad() {
  const de = document.documentElement; const sticky = e => !!e && getComputedStyle(e).position === 'sticky';
  const hd = document.querySelector('.app > .hdr'); const bar = document.querySelector('.app .stickbar, .app .shopbar');
  de.style.setProperty('--sp-top', (sticky(hd) ? Math.ceil(hd.getBoundingClientRect().height) : 0) + 'px');
  de.style.setProperty('--sp-bot', (sticky(bar) ? Math.ceil(bar.getBoundingClientRect().height) : 0) + 'px');
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => { try { scrollPad(); } catch (e) { } });
function fitDecide(fit) {
  const de = document.documentElement;
  if (fit && (G.hudEd || hudFreeActive())) { de.classList.add('fitscroll'); if (!G.hudEd) { G.fitS = true; G.fitK = null; G.fitB = G.b; } return; } /* 자유 배치는 높이가 내용을 따라 자라므로 쪽 스크롤 */ /* 편집 중에는 모든 모듈이 보이도록 페이지가 스크롤된다 */
  if (!fit) { de.classList.remove('fitscroll'); G.fitS = false; G.fitK = null; G.fitB = null; G.fitNew = false; return; }
  const ah = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const k = window.innerWidth + 'x' + Math.round(ah) + ':' + (G.data.fs || 1) + ':' + (G.data.fdet ? 1 : 0) + ':' + hudLayJson();
  G.fitNew = G.fitB !== G.b;
  if (G.fitK === k && !G.fitNew) { de.classList.toggle('fitscroll', !!G.fitS); return; }
  const h = sel => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect().height : 0; };
  const fld = document.querySelector('.hz-mid'); const want = Math.min(fld ? fld.scrollHeight : 0, FIT_FIELD);
  const need = h('.fit > .hdr') + h('.btop') + h('.hz-bot') + want + 24;
  G.fitS = need > ah; G.fitK = k; G.fitB = G.b; de.classList.toggle('fitscroll', G.fitS);
}
/* 설정: 글자 크기(--fs)와 움직임 줄이기(html.rm) */
const FS_OPTS = [0.9, 1, 1.15, 1.3];
function applyPrefs() { if (typeof document === 'undefined' || !G.data) return; const de = document.documentElement; const fs = FS_OPTS.includes(+G.data.fs) ? +G.data.fs : 1; de.style.setProperty('--fs', String(fs)); de.classList.toggle('rm', !!G.data.rm); }
const smoothB = () => (G.data && G.data.rm) || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
/* 화면 이름: 브라우저 탭 제목과 숨은 h2 */
const SCR_N = { guide: '처음 안내', create: '캐릭터 만들기', settle: '정산', shop: '상점', wait: '챕터 돌파', rank: '랭킹', records: '기록', goals: '계정 목표', mark: '표식 도전', admin: '관리자', tree: '스킬 트리', dead: '쓰러짐', survey: '설문', final: '마무리', scen: '고정 상황', tutoffer: '수련장 안내' };
function scrName() {
  if (G.scr === 'run') return G.b ? (G.b.ctx && G.b.ctx.boss ? '보스 전투' : '전투') : '던전';
  if (G.scr === 'test') return G.b ? '시험 전투' : '시험 전투 설정';
  if (G.scr === 'tut') return G.b ? '수련장 전투' : '수련장';
  return SCR_N[G.scr] || '';
}
/* 초점 기억과 되돌리기 (10월 7일): 그리기 전 초점 요소의 data-a · data-k · data-e(행동 버튼은 data-id)를 적어 두고, 다시 그린 뒤 같은 요소를 찾는다 */
function focusKey() {
  const a = document.activeElement; if (!a || a === document.body || !a.closest || !a.closest('#root')) return null;
  const d = a.dataset || {}; return { a: d.a, k: d.k, e: d.e, id: d.id, b: d.b, info: d.info, elId: a.id || '', sheet: !!a.closest('.sheet'), nav: !!a.closest('.mnav') };
}
function focusFind(fk) {
  if (!fk) return null; const q = v => '"' + String(v).replace(/["\\]/g, '\\$&') + '"';
  let sel = '';
  if (fk.a) { sel = '[data-a=' + q(fk.a) + ']'; for (const x of (fk.a === 'act' ? ['id'] : ['k', 'e', 'id', 'b'])) if (fk[x] != null) sel += '[data-' + x + '=' + q(fk[x]) + ']'; }
  else if (fk.elId) sel = '#' + CSS.escape(fk.elId);
  else if (fk.info) sel = '[data-info=' + q(fk.info) + ']';
  if (!sel) return null;
  const scope = fk.sheet ? document.querySelector('.sheet') : document.querySelector('#root > .fit, #root > .app');
  return scope ? scope.querySelector(sel) : null;
}
function focusBack(fk, intoSheet, fit) {
  let el = null;
  if (intoSheet) el = document.querySelector('.sheet [data-focus]') || document.querySelector('.sheet button, .sheet input, .sheet select, .sheet textarea');
  else if (fk) {
    el = focusFind(fk);
    if (!el || el.disabled || !el.getClientRects().length) el = (G.shownSheet ? document.querySelector('.sheet [data-focus]') || document.querySelector('.sheet button') : null)
      || (fk.nav ? document.querySelector('#root [data-a=menu]') : null) || document.querySelector('#root [data-focus]:not([disabled])')
      || (fit ? document.querySelector('.ab:not([aria-disabled="true"])') : null);
  }
  if (!el || el === document.activeElement) return;
  POP.mute = true; try { el.focus({ preventScroll: true }); } finally { POP.mute = false; }
}
/* 열린 시트 안에서 Tab이 돌게 한다 */
function sheetTrap(ev) {
  const sh = document.querySelector('.sheet'); if (!sh) return;
  const f = [...sh.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.getClientRects().length);
  if (!f.length) return; const i = f.indexOf(document.activeElement);
  if (ev.shiftKey ? i <= 0 : (i < 0 || i === f.length - 1)) { ev.preventDefault(); (ev.shiftKey ? f[f.length - 1] : f[0]).focus(); }
}
function radio(name) { const x = document.querySelector('input[name="' + name + '"]:checked'); return x ? x.value : ''; }
function val(id) { const x = document.getElementById(id); return x ? x.value : ''; }

async function download() {
  const blob = JSON.stringify({ v: VERSION, exportedAt: Date.now(), data: G.data }, null, 1);
  return saveFile('nrk-' + VERSION + '-기록-' + new Date().toISOString().slice(0, 10) + '.json', blob);
}

