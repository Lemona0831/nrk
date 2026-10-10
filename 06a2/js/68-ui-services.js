'use strict';
/* 되묻기: confirm 문장도 조사를 고른다 (10월 7일) */
function ask(m) { return confirm(fixJosa(m)); }
/* ---------- 시트(대화상자) ---------- */
function openSheet(kind, data) { if (typeof hidePop === 'function') hidePop(); G.sheet = { kind, data: data || {} }; render(); setTimeout(() => { if (typeof document === 'undefined') return; const f = document.querySelector('.sheet [data-focus]') || document.querySelector('.sheet button'); if (f) f.focus(); }, 0); }
function closeSheet() { G.sheet = null; render(); }
function openBlock(retry) { openSheet('block', { retry: !!retry }); }
function giveItem(it, then) {
  const run = G.run;
  if (!addItem(run, it)) { openSheet('bagfull', { item: it, then: then || 'drop' }); return; }
  saveRunLocal(); saveCur();
  if (then === 'equip') { equipUid(run, it.uid, null, 'block'); saveRunLocal(); saveCur(); return; }
  openSheet('drop', { uid: it.uid });
}
/* 화면 낭독기 알림: #live 하나에 줄을 이어 붙인다(한 차례의 새 전투 기록 모두와 알림). clear면 비우고 시작한다. 10월 7일 */
function liveSay(lines, clear) {
  if (typeof document === 'undefined') return; const el = document.getElementById('live'); if (!el) return;
  if (clear) el.textContent = '';
  for (const m of [].concat(lines)) { if (!m) continue; const p = document.createElement('p'); p.textContent = m; el.appendChild(p); }
  while (el.childNodes.length > 40) el.removeChild(el.firstChild);
}
/* 마지막으로 알린 뒤의 새 전투 기록 줄 */
function liveNew(b) {
  const L = b.log, mk = G.liveMk; let i = mk && mk.b === b ? L.lastIndexOf(mk.x) + 1 : L.length - 1; if (i < 0) i = 0;
  G.liveMk = { b, x: L[L.length - 1] }; return L.slice(Math.max(i, L.length - 20)).map(x => { const w = whyText(b, x); return w ? x.m + '. 까닭: ' + w : x.m; });
}
function toast(m) {
  liveSay(fixJosa(m)); G.toastLog = (G.toastLog || []).concat([{ m: fixJosa(m), at: Date.now() }]).slice(-20); /* 10월 8일: 지난 알림(메뉴 '지난 알림') */ let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); } /* 읽는 것은 #live가 맡는다(두 번 읽지 않게) */
  const lines = el.isConnected && G.toastLines && Date.now() - (G.toastAt || 0) < toastBase() ? G.toastLines : []; lines.push(fixJosa(m)); G.toastLines = lines.slice(-4); G.toastAt = Date.now(); el.textContent = G.toastLines.join('\n'); clearTimeout(G.toastT); /* 10월 5일: 전리품 알림이 골드 · 경험치 알림에 덮여 보이지 않았다 */
  G.toastT = setTimeout(() => { const e2 = document.querySelector('.toast'); if (e2) e2.remove(); }, toastBase() + 800 * (G.toastLines.length - 1)); // 10월 5일 고침: 타이머가 주석 안으로 들어가 알림이 사라지지 않았다. 줄이 많으면 조금 더 남긴다
}

/* 사냥꾼 추적 표시 (10월 5일 만든 사람 요청: 얼마나 쌓였는지 보이게) */
const focusOn = (b, e) => !!(b && b.p.build === 'hunter' && b.p.focus && b.p.focus.id === e.id && b.p.focus.n > 0 && e.alive);
function focusLine(b) {
  const p = b.p; if (p.build !== 'hunter') return ''; const e = p.focus && b.en.find(x => x.id === p.focus.id && x.alive); const n = e ? p.focus.n : 0;
  const hs = st(p, 'haste'); const hl = `<div class="focusln hs" data-info="st:p:haste" tabindex="0">⚡ 가속 ${hs ? `<b>${hs}</b> · 다음 라운드 맨 앞에서 두 번 연달아 움직인다` : '없음'}${b.pDouble === b.round ? ' · 이번 라운드는 연속 행동 중' : ''}</div>`;
  const ll = `<div class="focusln lk" data-info="elink" tabindex="0">🔗 연계 ${p.lastBr ? `방금 <b>${esc(p.lastBr)}</b> · 다른 갈래 스킬을 쓰면 피해 +${Math.round(HUNT.link * 100)}%` : `갈래를 바꿔 이어 쓰면 피해 +${Math.round(HUNT.link * 100)}%`}</div>`;
  return hl + ll + `<div class="focusln" data-info="efocus" tabindex="0">🎯 추적 ${n ? `<b>${n}</b>/${HUNT.focusMax}겹 · ${esc(e.n)} · 다음 한 방 +${Math.round(n * (e.elite || e.strong || e.role === 'boss' ? HUNT.focusBig : HUNT.focusPer) * 100)}%` : '없음 · 같은 적을 연달아 맞히면 쌓입니다'}</div>`;
}
/* 마검사 교대 · 칼 표시 (10월 7일, docs/직업/마검사.md F-1): 직전 종류와 다음 교대, 이어진 교대, 칼에 실린 것 */
function sbLine(b) {
  const p = b.p; if (p.build !== 'spellblade') return ''; const K = { cut: '⚔ 베기', spell: '✦ 주문' }; const aw = (BUILDS.spellblade || {}).altWard || 0;
  const nx = p.sbLast === 'cut' ? 'spell' : p.sbLast === 'spell' ? 'cut' : null; const done = b.sbAltTurn === b.turnIdx;
  const al = `<div class="focusln lk" data-info="sbalt" tabindex="0">⇄ 교대 ${nx ? `직전 <b>${K[p.sbLast]}</b> · 다음 교대 <b>${K[nx]}</b> · ${done ? '이번 차례 보호막은 받음' : '보호막 +' + aw}${(p.sbRun || 0) >= 1 ? ' · 이어진 교대 <b>' + p.sbRun + '</b>' : ''}` : '베기와 주문을 번갈아 쓰면 보호막 +' + aw}</div>`;
  const el = `<div class="focusln" data-info="sbedge" tabindex="0">🗡️ 칼 ${p.edge ? `<b>${SICO[p.edge.s] || ''} ${KW_N[p.edge.s]} ${p.edge.n}</b> · 다음 베기가 고른 적에게 건다` : '비어 있음 · 주문으로 출혈이나 화상을 싣는다'}</div>`;
  return al + el;
}
/* ---------- 고정 상황 ---------- */
function startScen(build) { G.scen = { build, i: 0, results: [] }; G.scr = 'scen'; loadScen(); }
function loadScen() { const S = G.scen; const sc = SCEN[S.i]; G.b = scenBattle(S.build, sc); G.b.stepMode = true; fdetFresh(); G.b.pActs = 0; G.sel = null; render(); }
function scenAxes(b) {
  const acts = b.rec.filter(x => x.k === 'act');
  const first = (acts.find(x => x.tg && !['guard', 'dodge', 'flaskL', 'flaskM'].includes(x.a)) || {}).tg || null;
  const deliberate = []; let last = null;
  for (const x of b.rec) { if (x.k === 'act') last = x; if (x.k === 'hit' && x.charged && x.d > 0 && last && last.canDodge && !['dodge', 'guard'].includes(last.a)) deliberate.push({ t: x.t, src: x.src }); }
  const stopI = acts.findIndex(x => ['guard', 'flaskL', 'flaskM', 'dodge'].includes(x.a));
  return { first, deliberate: deliberate.length, stopAt: stopI < 0 ? null : stopI + 1, stopWhat: stopI < 0 ? null : acts[stopI].a, actions: acts.map(x => x.a) };
}
async function scenNext() {
  const S = G.scen; const b = G.b; const sc = SCEN[S.i];
  S.results.push(Object.assign({ id: sc.id, over: b.over || 'open' }, scenAxes(b)));
  S.i++;
  if (S.i >= SCEN.length) {
    G.data.scen[S.build] = { build: S.build, at: Date.now(), results: S.results }; saveLocal();
    G.b = null; G.scr = 'title'; render();
    await pushDb(COL.scen + '/' + S.build, G.data.scen[S.build]); G.scen = null; render(); return;
  }
  loadScen();
}

