'use strict';
/* ===== HUD 리모콘 화면 (10월 10일 0.6a.2-113) =====
   전투 화면 편집기의 조작판. 게임 창 안에 떠 있는 패널(kind 'float')과 별도 페이지(remote.html, kind 'page')가 같은 이 파일로 그린다.
   게임 코드를 모른다: 게임 창이 만든 상태 S(js/57-hud-remote.js hudRemoteState)를 받아 그리고, 사용자가 누르면 명령 { c, ... }을 send로 보낸다.
   S가 달라질 때만 다시 그리고, 다시 그려도 초점 · 스크롤 · 탭이 그대로 남는다(data-fk 초점 열쇠). 머리줄과 상태 줄은 다시 그리지 않는 고정 요소다(끌기와 낭독 알림이 끊기지 않게). */
(function (root) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TABS = [['cell', '칸'], ['lay', '배치'], ['set', '배열'], ['help', '도움말']];
  const OPS = [100, 90, 80, 70];
  function mount(el, o) {
    o = o || {}; const kind = o.kind === 'page' ? 'page' : 'float';
    const st = { S: null, key: '', tab: 'cell', conn: { k: 'wait', t: '' }, ask: null, fold: false, op: 100, hold: false, askFrom: null, step: 1 };
    const send = c => { if (typeof o.send === 'function') o.send(c); };
    el.classList.add('hrem', kind);
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'HUD 리모콘');
    el.innerHTML = `<div class="hr-head"><button type="button" class="hr-grip" data-fk="grip" aria-label="리모콘 옮기기. 끌거나 방향키를 누릅니다. Shift는 크게, Home은 처음 자리" aria-describedby="hr-gripdesc"><span aria-hidden="true">⠿</span></button><span class="hr-title">HUD 리모콘</span><span class="hr-conn" data-k="wait"></span><span class="hr-hbtns"><button type="button" class="hr-hb" data-act="op" data-fk="op"></button><button type="button" class="hr-hb" data-act="win" data-fk="win">별도 창</button><button type="button" class="hr-hb" data-act="back" data-fk="back" hidden aria-label="게임 안의 패널로 돌아가기">게임 안으로</button><button type="button" class="hr-hb" data-act="fold" data-fk="fold" aria-controls="hr-dyn"></button></span></div><p class="sr" id="hr-gripdesc">Home을 누르면 처음 자리로 돌아갑니다.</p><p class="hr-status" role="status" aria-live="polite"></p><div class="hr-dyn" id="hr-dyn"></div>`;
    const dyn = el.querySelector('.hr-dyn'), statusEl = el.querySelector('.hr-status'), connEl = el.querySelector('.hr-conn');
    const btnOp = el.querySelector('[data-act="op"]'), btnWin = el.querySelector('[data-act="win"]'), btnFold = el.querySelector('[data-act="fold"]'), btnBack = el.querySelector('[data-act="back"]');

    /* ---------- 머리줄 ---------- */
    function head() {
      btnFold.textContent = st.fold ? '펴기' : '접기'; btnFold.setAttribute('aria-expanded', String(!st.fold));
      btnFold.setAttribute('aria-label', st.fold ? '리모콘 펴기' : '리모콘 접기');
      btnOp.textContent = '◐ ' + st.op + '%'; btnOp.setAttribute('aria-label', '뒤 화면 비치기. 지금 ' + st.op + '퍼센트. 누르면 ' + OPS[(OPS.indexOf(st.op) + 1) % OPS.length] + '퍼센트');
      el.classList.toggle('fold', st.fold); el.style.setProperty('--hr-mix', st.op + '%');
      btnWin.hidden = !(kind === 'float' && o.canWin); btnOp.hidden = kind === 'page'; btnFold.hidden = kind === 'page'; el.querySelector('.hr-grip').hidden = kind === 'page';
      btnBack.hidden = kind !== 'page'; btnBack.disabled = st.conn.k !== 'ok';
      connEl.hidden = kind !== 'page'; connEl.dataset.k = st.conn.k;
      connEl.textContent = { ok: '● 연결됨', wait: '○ 게임 창을 찾는 중', none: '○ 게임 창 없음', idle: '○ 편집 전', lost: '× 끊김', end: '○ 편집 끝' }[st.conn.k] || '';
    }

    /* ---------- 부품 ---------- */
    const btn = (act, fk, label, text, extra) => `<button type="button" data-act="${act}" data-fk="${fk}"${label ? ` aria-label="${esc(label)}"` : ''}${extra || ''}>${text}</button>`;
    const stepper = (f, label, val, min, max, dis) => `<div class="hr-step" role="group" aria-label="${esc(label)}"><span class="hr-sl" aria-hidden="true">${esc(label)}</span><button type="button" data-act="num" data-f="${f}" data-d="-1" data-fk="${f}-" aria-label="${esc(label)} 줄이기"${dis ? ' disabled' : ''}>−</button><input type="number" data-act="numin" data-f="${f}" data-fk="${f}" min="${min}" max="${max}" step="1" inputmode="numeric" aria-label="${esc(label)}, ${min}에서 ${max}" value="${esc(val)}"${dis ? ' disabled' : ''}><button type="button" data-act="num" data-f="${f}" data-d="1" data-fk="${f}+" aria-label="${esc(label)} 늘리기"${dis ? ' disabled' : ''}>+</button></div>`;
    const sw = (act, fk, label, on, extra) => `<button type="button" class="sw hr-sw" role="switch" aria-checked="${on}" data-act="${act}" data-fk="${fk}" aria-label="${esc(label)}"${extra || ''}>${on ? '켜짐' : '꺼짐'}</button>`;
    const ck = (act, fk, text, checked, extra) => `<label class="hr-ck"><input type="checkbox" data-act="${act}" data-fk="${fk}"${checked ? ' checked' : ''}${extra || ''}> <span>${text}</span></label>`;

    function pCell(S) {
      const s = S.sel; const dis = s ? '' : ' disabled'; const idx = s ? S.sizes.indexOf(s.size) : 2;
      let h = `<div class="hr-row"><label for="hr-pick">구성 요소 선택</label><select id="hr-pick" data-act="pick" data-fk="pick"><option value="">고르세요</option>${S.mods.map(m => `<option value="${esc(m.id)}"${s && s.id === m.id ? ' selected' : ''}>${esc(m.n)}${m.off ? ' (꺼짐)' : ''}</option>`).join('')}</select></div>`;
      h += `<p class="hr-sel" id="hr-selname">${s ? esc(s.n) + ': ' + esc(s.pos) : '선택한 칸 없음. 화면의 칸을 누르거나 위에서 고르세요.'}</p>`;
      h += `<fieldset class="hr-fs"${dis}><legend class="sr">${s ? esc(s.n) + ' 설정' : '고른 칸 설정'}</legend>`;
      h += `<div class="hr-row hr-size"><span class="hr-sl" id="hr-szl">크기</span><button type="button" data-act="sizestep" data-d="-1" data-fk="sz-" aria-label="크기 줄이기"${dis}>−</button><input type="range" id="hr-sz" data-act="size" data-fk="sz" min="0" max="${S.sizes.length - 1}" step="1" value="${idx < 0 ? 2 : idx}" aria-labelledby="hr-szl" aria-valuetext="${s ? s.size : 100}%"${dis}><button type="button" data-act="sizestep" data-d="1" data-fk="sz+" aria-label="크기 늘리기"${dis}>+</button><output for="hr-sz">${s ? s.size : 100}%</output></div>`;
      h += `<div class="hr-row">${sw('toggle', 'tog', (s ? s.n + ' ' : '') + '보이기', !(s && s.off), (s && s.lock ? ' aria-disabled="true" aria-describedby="hr-lk"' : '') + dis)}${btn('resetone', 'one', (s ? s.n + ' ' : '') + '개별 초기화', '이 칸 복구', dis)}</div>`;
      h += '<p class="hr-hint">찾기 어려운 칸은 위 목록에서 고릅니다. 이 칸 복구는 선택한 칸의 자리와 크기, 켜짐을 기본값으로 돌립니다. 되돌리기로 복구 전 배치에 돌아갑니다.</p>';
      if (s && s.lock) h += `<p class="hr-hint" id="hr-lk">게임에 꼭 필요한 칸이라 끌 수 없습니다. 크기와 자리는 바꿀 수 있습니다.</p>`;
      const vs = s && s.vars;
      h += `<div class="hr-row"><label for="hr-var">표시 형태</label><select id="hr-var" data-act="var" data-fk="var"${vs ? '' : ' disabled'}>${!s ? '<option value="">칸을 먼저 고르세요</option>' : !vs ? '<option value="">하나뿐입니다</option>' : vs.map(v => `<option value="${esc(v.k)}"${s.varKey === v.k ? ' selected' : ''}>${esc(v.n)}</option>`).join('') + (s.varKey === 'x' ? '<option value="x" selected>직접 고른 항목</option>' : '')}</select></div>`;
      h += `<p class="hr-hint">${s ? esc(s.varDesc || '') : ''}</p></fieldset>`;
      h += `<fieldset class="hr-fs hr-grp"><legend>칸 묶음</legend>${S.groups.map((g, i) => ck('grp', 'g' + i, esc(g.n) + ' <small>' + g.total + '칸</small>', g.state === 'all', (g.dis ? ' disabled' : '') + (g.state === 'some' ? ' data-ind="1"' : ''))).join('')}</fieldset>`;
      return h;
    }
    function pLay(S) {
      const s = S.sel; const free = S.mode === 'free'; const dis = s ? '' : ' disabled'; const nm = s ? esc(s.n) : '고른 칸'; const stp = st.step;
      let h = `<div class="hr-row" role="group" aria-label="배치 방식"><span class="hr-sl">배치 방식</span>${['align', 'free'].map(k => `<button type="button" class="hr-seg${S.mode === k ? ' on' : ''}" data-act="mode" data-k="${k}" data-fk="m-${k}" aria-pressed="${S.mode === k}">${k === 'free' ? '자유 배치' : '정렬 배치'}</button>`).join('')}</div>`;
      if (free) h += `<div class="hr-row" role="group" aria-label="이동 단위"><span class="hr-sl">이동 단위</span>${[1, 10].map(n => `<button type="button" class="hr-seg${stp === n ? ' on' : ''}" data-act="stepn" data-n="${n}" data-fk="st${n}" aria-pressed="${stp === n}">${n}px</button>`).join('')}</div>`;
      h += `<div class="hr-row hr-mv" role="group" aria-label="${nm} 자리 옮기기"><button type="button" data-act="move" data-d="up" data-fk="mu" aria-label="${nm} ${free ? '위로 ' + stp + 'px' : '위로'}"${dis}>▲ 위로</button><button type="button" data-act="move" data-d="down" data-fk="md" aria-label="${nm} ${free ? '아래로 ' + stp + 'px' : '아래로'}"${dis}>▼ 아래로</button><button type="button" data-act="move" data-d="left" data-fk="ml" aria-label="${nm} ${free ? '왼쪽으로 ' + stp + 'px' : '앞 구역으로'}"${dis}>◀ ${free ? '왼쪽' : '앞 구역'}</button><button type="button" data-act="move" data-d="right" data-fk="mr" aria-label="${nm} ${free ? '오른쪽으로 ' + stp + 'px' : '다음 구역으로'}"${dis}>${free ? '오른쪽' : '다음 구역'} ▶</button></div>`;
      if (free) {
        const q = s || {}; const ok = !!s; const F = S.free; const L = S.lim;
        h += `<div class="hr-steps">${stepper('x', '가로 위치(px)', ok ? q.x : '', -L.ext, L.ext, !ok)}${stepper('y', '세로 위치(px)', ok ? q.y : '', -L.ext, L.ext, !ok)}${stepper('w', '폭(px)', ok ? q.w : '', L.minw, L.ext, !ok)}${stepper('h', '높이(px)', ok ? q.h : '', L.minh, L.ext, !ok)}</div>`;
        h += `<div class="hr-row" role="group" aria-label="높이 방식"><span class="hr-sl">높이 방식</span>${[['auto', '자동'], ['fix', '고정']].map(([k, n]) => `<button type="button" class="hr-seg${ok && q.hm === k ? ' on' : ''}" data-act="hmode" data-k="${k}" data-fk="hm-${k}" aria-pressed="${ok && q.hm === k}"${dis}>${n}</button>`).join('')}</div><p class="hr-hint">자동은 내용에 맞추고, 고정은 정한 높이 안에서 스크롤합니다.</p>`;
        h += `<fieldset class="hr-fs"><legend>겹침 순서${ok ? ' · ' + q.z + '번째(뒤에서)' : ''}</legend><div class="hr-row hr-mv">${[['front', '맨 앞으로'], ['up', '앞으로'], ['down', '뒤로'], ['back', '맨 뒤로']].map(([k, n]) => `<button type="button" data-act="z" data-d="${k}" data-fk="z-${k}" aria-label="${nm} ${n}"${dis}>${n}</button>`).join('')}</div></fieldset>`;
        h += `<fieldset class="hr-fs"><legend>여러 칸 · ${S.multi}개 선택</legend><div class="hr-row">${btn('selall', 'selall', '', '모두 고르기')}${btn('selnone', 'selnone', '', '선택 풀기')}</div>`;
        const mdis = S.multi >= 2 ? '' : ' disabled'; const ddis = S.multi >= 3 ? '' : ' disabled';
        h += `<div class="hr-row hr-al">${[['l', '왼쪽 맞춤'], ['c', '가로 가운데'], ['r', '오른쪽 맞춤'], ['t', '위쪽 맞춤'], ['m', '세로 가운데'], ['b', '아래쪽 맞춤'], ['sw', '같은 폭'], ['sh', '같은 높이']].map(([k, n]) => `<button type="button" data-act="align" data-d="${k}" data-fk="al-${k}"${mdis}>${n}</button>`).join('')}${[['dh', '가로 균등'], ['dv', '세로 균등']].map(([k, n]) => `<button type="button" data-act="align" data-d="${k}" data-fk="al-${k}"${ddis}>${n}</button>`).join('')}</div></fieldset>`;
        h += `<fieldset class="hr-fs"><legend>캔버스</legend><div class="hr-row"><label for="hr-sn">붙이기</label><select id="hr-sn" data-act="snap" data-fk="sn">${L.snaps.map(v => `<option value="${v}"${F.sn === v ? ' selected' : ''}>${v ? v + 'px' : '꺼짐'}</option>`).join('')}</select></div>`;
        h += `<div class="hr-row"><label for="hr-ch">캔버스 높이</label><select id="hr-ch" data-act="chh" data-fk="chh">${L.chs.map(v => `<option value="${v}"${F.ch === v ? ' selected' : ''}>화면의 ${v}배</option>`).join('')}</select></div>`;
        h += `<div class="hr-row">${ck('guide', 'guide', '정렬선 보기(다른 칸 · 가장자리 · 가운데에 붙음)', F.gd)}</div>`;
        h += `<div class="hr-row"><span class="hr-sl" id="hr-pushl">겹치는 칸 자동으로 밀기</span>${sw('push', 'push', '겹치는 칸 자동으로 밀기', F.pk)}</div>`;
        h += `<div class="hr-row">${ck('nums', 'nums', '읽는 순서 보기', F.nums)}</div><p class="hr-hint">${esc(F.readText)}</p>`;
        if (F.ovl.length) h += `<p class="hr-hint">겹친 칸: ${esc(F.ovl.join(', '))}</p>`;
        h += `<div class="hr-row">${btn('gather', 'gather', '', '화면 안으로 모으기')}${btn('fromalign', 'fromalign', '', '정렬 배치에서 가져오기')}${F.legacy ? btn('legacy', 'legacy', '', '옛 격자 값으로 다시') : ''}</div></fieldset>`;
      } else h += `<p class="hr-hint">정렬 배치는 칸을 구역에 놓고 순서를 정합니다. 칸을 캔버스 어디에든 놓으려면 자유 배치로 바꿉니다.</p>`;
      h += `<div class="hr-row">${ck('grid', 'grid', '격자 보기', S.grid)}</div>`;
      return h;
    }
    function pSet(S) {
      let h = `<div class="hr-row" role="group" aria-label="배열 칸"><span class="hr-sl">배열 칸</span>${S.slots.map((t, i) => `<button type="button" class="hr-seg${S.slot === i ? ' on' : ''}" data-act="slot" data-n="${i}" data-fk="sl${i}" aria-pressed="${S.slot === i}" aria-label="배열 칸 ${i + 1}${t ? ', ' + esc(t.t) + ' 저장' : ', 비어 있음'}, 불러오기">${i + 1}${t ? '<span aria-hidden="true"> ●</span>' : ''}</button>`).join('')}</div>`;
      const cur = S.slot, ct = cur != null ? S.slots[cur] : null;
      h += `<p class="hr-hint">${cur == null ? '저장하면 지금 배치가 게임에 적용됩니다.' : ct ? '칸 ' + (cur + 1) + ': ' + esc(ct.t) + ' 저장. 저장하면 이 칸에도 담깁니다.' : '칸 ' + (cur + 1) + ': 비어 있음. 저장하면 이 칸에도 담깁니다.'}</p>`;
      h += `<div class="hr-row" role="group" aria-label="표시 묶음"><span class="hr-sl">표시 묶음</span>${S.presets.map(p => `<button type="button" data-act="preset" data-k="${esc(p.k)}" data-fk="pre-${esc(p.k)}">${esc(p.n)}</button>`).join('')}</div>`;
      h += `<div class="hr-row">${btn('reset', 'reset', '', '전체 초기화')}${btn('list', 'list', '고친 내용을 저장하고 목록으로 편집', '목록으로 편집')}</div>`;
      h += `<p class="hr-hint">전체 초기화는 휴대폰과 PC 배치를 처음으로 되돌립니다. 되돌리기로 한 단계 돌아갈 수 있습니다.</p>`;
      return h;
    }
    function pHelp() {
      return `<ul class="hr-help"><li>화면의 칸을 눌러 고릅니다. 끌어서 옮기고, 키보드는 칸에서 방향키입니다.</li><li>칸 탭에서 크기 · 켜기와 끄기 · 표시 형태를 정합니다.</li><li>배치 탭에서 정렬과 자유를 바꾸고 자리를 숫자로 정합니다.</li><li>칸이 안 보이면 칸 탭 목록에서 골라 이 칸 복구를 누릅니다. 캔버스 밖으로 나간 칸은 배치 탭의 화면 안으로 모으기로 돌립니다.</li><li>저장을 눌러야 게임에 적용됩니다. 취소하면 편집 전으로 돌아갑니다.</li><li>패널은 머리줄 ⠿을 끌어 옮기고, 방향키로도 옮깁니다.</li></ul>`;
    }
    function notice() {
      const k = st.conn.k; const t = st.conn.t || { wait: '게임 창을 찾는 중입니다.', none: '게임 창을 찾지 못했습니다. 게임을 같은 주소에서 열어 두세요.', idle: '게임 창을 찾았습니다. 게임에서 설정의 전투 화면 탭을 열고 화면에서 편집을 누르면 여기서 조작할 수 있습니다.', lost: '게임 창과 연결이 끊겼습니다. 게임 창이 멈췄거나 닫혔을 수 있습니다.', end: '편집이 끝났습니다. 게임에서 화면에서 편집을 다시 시작하면 이어서 조작합니다.' }[k] || '';
      return `<div class="hr-note" role="group" aria-label="연결 상태"><p>${esc(t)}</p>${k === 'none' || k === 'lost' ? btn('retry', 'retry', '', '다시 찾기') : ''}</div>`;
    }
    function ask(S) {
      const a = st.ask; if (!a) return '';
      const txt = a.kind === 'slot' ? '지금 배치가 바뀝니다. 배열 칸 ' + (a.n + 1) + '을 불러올까요?' : a.kind === 'cancel' ? '고친 내용을 버리고 편집 전 배치로 돌아갈까요?' : '고친 내용을 저장하고 목록으로 편집할까요?';
      const yes = a.kind === 'slot' ? '불러오기' : a.kind === 'cancel' ? '버리기' : '저장하고 이동';
      return `<div class="hr-ask" role="group" aria-labelledby="hr-asktxt"><p id="hr-asktxt">${esc(txt)}</p><div class="hr-row">${btn('askno', 'askno', '', '아니요')}${btn('askyes', 'askyes', '', yes, ' class="gold"')}</div></div>`;
    }
    function html() {
      const S = st.S; if (!S || !S.active) return notice();
      const tabs = `<div class="hr-tabs" role="tablist" aria-label="리모콘 탭">${TABS.map(([k, n]) => `<button type="button" role="tab" id="hr-t-${k}" aria-selected="${st.tab === k}" aria-controls="hr-p-${k}" tabindex="${st.tab === k ? 0 : -1}" data-act="tab" data-k="${k}" data-fk="t-${k}">${n}</button>`).join('')}</div>`;
      const body = { cell: pCell, lay: pLay, set: pSet, help: pHelp }[st.tab](S);
      const pan = `<div class="hr-main"${st.fold ? ' hidden' : ''}>${tabs}<div class="hr-pan" role="tabpanel" id="hr-p-${st.tab}" aria-labelledby="hr-t-${st.tab}" tabindex="0">${body}<p class="hr-hint hr-foot-note">${esc(S.note || '')}</p></div></div>`;
      const foot = `<div class="hr-foot" role="group" aria-label="저장과 취소">${btn('undo', 'undo', '', '되돌리기', S.canUndo ? '' : ' disabled')}${btn('redo', 'redo', '', '다시 실행', S.canRedo ? '' : ' disabled')}${btn('cancel', 'cancel', '취소, 편집 전으로 돌아가기', '취소')}${btn('save', 'save', '', '저장', ' class="gold"')}</div>`;
      return pan + ask(S) + foot;
    }

    /* ---------- 다시 그리기 ---------- */
    function draw(force) {
      const S = st.S; const key = JSON.stringify([S, st.tab, st.conn, st.ask, st.fold, st.step]);
      if (!force && key === st.key) return; st.key = key;
      if (st.hold) { st.dirty = true; return; }
      const act = document.activeElement; const inside = act && dyn.contains(act); const fk = inside ? act.getAttribute('data-fk') : null;
      const pan = dyn.querySelector('.hr-pan'); const sc = pan ? pan.scrollTop : 0; const tabNow = pan ? pan.id : '';
      const caret = inside && act.tagName === 'INPUT' && act.type === 'number' ? [act.selectionStart, act.selectionEnd] : null;
      dyn.innerHTML = html(); dyn.querySelectorAll('[data-ind]').forEach(i => { i.indeterminate = true; }); head();
      const np = dyn.querySelector('.hr-pan'); if (np && np.id === tabNow) np.scrollTop = sc;
      if (fk) { const n = dyn.querySelector('[data-fk="' + fk + '"]'); if (n && !n.disabled) { n.focus({ preventScroll: true }); if (caret && n.setSelectionRange) { try { n.setSelectionRange(caret[0], caret[1]); } catch (e) { } } } else if (n) { const alt = dyn.querySelector('.hr-pan'); if (alt) alt.focus({ preventScroll: true }); } }
      if (st.ask && !st.askFocused) { const y = dyn.querySelector('[data-fk="askyes"]'); const n = dyn.querySelector('[data-fk="askno"]'); st.askFocused = true; if (n) n.focus({ preventScroll: true }); void y; }
      if (!st.ask) st.askFocused = false;
      if (typeof o.onDraw === 'function') o.onDraw();
    }

    /* ---------- 누름 ---------- */
    const numVal = f => { const i = dyn.querySelector('input[data-f="' + f + '"]'); return i ? parseInt(i.value, 10) : NaN; };
    function click(ev) {
      const t = ev.target.closest ? ev.target.closest('[data-act]') : null; if (!t || !el.contains(t) || t.disabled) return;
      const a = t.dataset.act; const S = st.S;
      if (a === 'fold') { setPrefs({ fold: !st.fold }); if (typeof o.onPrefs === 'function') o.onPrefs({ fold: st.fold, op: st.op }); return; }
      if (a === 'op') { setPrefs({ op: OPS[(OPS.indexOf(st.op) + 1) % OPS.length] }); if (typeof o.onPrefs === 'function') o.onPrefs({ fold: st.fold, op: st.op }); return; }
      if (a === 'back') { if (typeof o.onBack === 'function') o.onBack(); return; }
      if (a === 'win') { if (typeof o.onWin === 'function') o.onWin(); return; }
      if (a === 'retry') { if (typeof o.onRetry === 'function') o.onRetry(); return; }
      if (a === 'tab') { st.tab = t.dataset.k; st.ask = null; draw(true); const n = dyn.querySelector('#hr-t-' + st.tab); if (n) n.focus(); return; }
      if (!S || !S.active) return;
      if (a === 'askno') { const from = st.askFrom; st.ask = null; st.askFrom = null; draw(true); const n = from && dyn.querySelector('[data-fk="' + from + '"]'); if (n && !n.disabled) n.focus(); return; }
      if (a === 'askyes') { const q = st.ask; st.ask = null; const from = st.askFrom; st.askFrom = null; draw(true); if (q.kind === 'slot') send({ c: 'slot', n: q.n, force: 1 }); else if (q.kind === 'cancel') send({ c: 'cancel', force: 1 }); else send({ c: 'list', force: 1 }); const n = from && dyn.querySelector('[data-fk="' + from + '"]'); if (n && !n.disabled && document.activeElement === document.body) n.focus(); return; }
      if (a === 'slot') { const n = +t.dataset.n; const sl = S.slots[n]; if (sl && sl.diff && !S.noAsk) { st.ask = { kind: 'slot', n }; st.askFrom = t.dataset.fk; draw(true); } else send({ c: 'slot', n, force: 1 }); return; }
      if (a === 'cancel') { if (S.dirty) { st.ask = { kind: 'cancel' }; st.askFrom = 'cancel'; draw(true); } else send({ c: 'cancel', force: 1 }); return; }
      if (a === 'list') { if (S.dirty) { st.ask = { kind: 'list' }; st.askFrom = 'list'; draw(true); } else send({ c: 'list', force: 1 }); return; }
      if (a === 'save') send({ c: 'save' });
      else if (a === 'undo') send({ c: 'undo' });
      else if (a === 'redo') send({ c: 'redo' });
      else if (a === 'selall' || a === 'selnone' || a === 'gather' || a === 'fromalign' || a === 'legacy') send({ c: a });
      else if (a === 'hmode') send({ c: 'hmode', v: t.dataset.k });
      else if (a === 'z') send({ c: 'z', d: t.dataset.d });
      else if (a === 'align') send({ c: 'align', d: t.dataset.d });
      else if (a === 'stepn') { st.step = +t.dataset.n === 10 ? 10 : 1; st.key = ''; draw(true); }
      else if (a === 'toggle') send({ c: 'toggle' });
      else if (a === 'resetone') send({ c: 'resetone' });
      else if (a === 'reset') send({ c: 'reset' });
      else if (a === 'sizestep') send({ c: 'sizestep', d: +t.dataset.d < 0 ? -1 : 1 });
      else if (a === 'mode') send({ c: 'mode', k: t.dataset.k === 'free' ? 'free' : 'align' });
      else if (a === 'move') send({ c: 'move', d: t.dataset.d, n: st.step });
      else if (a === 'push') send({ c: 'push' });
      else if (a === 'preset') send({ c: 'preset', k: t.dataset.k });
      else if (a === 'num') { const f = t.dataset.f; const v = numVal(f); if (isFinite(v)) send({ c: 'num', f, v: v + (+t.dataset.d) * (S.mode === 'free' ? st.step : 1) }); }
    }
    function change(ev) {
      const t = ev.target; if (!t || !t.dataset || !el.contains(t)) return; const a = t.dataset.act; const S = st.S; if (!a || !S || !S.active) return;
      if (a === 'pick') send({ c: 'sel', id: t.value });
      else if (a === 'var') { if (t.value && t.value !== 'x') send({ c: 'var', k: t.value }); }
      else if (a === 'numin') { const v = parseInt(t.value, 10); if (isFinite(v)) send({ c: 'num', f: t.dataset.f, v }); else { st.key = ''; draw(true); } }
      else if (a === 'grp') send({ c: 'group', gi: +t.dataset.fk.slice(1) });
      else if (a === 'nums') send({ c: 'nums', on: !!t.checked });
      else if (a === 'grid') send({ c: 'grid', on: !!t.checked });
      else if (a === 'snap') send({ c: 'snap', v: +t.value });
      else if (a === 'chh') send({ c: 'chh', v: +t.value });
      else if (a === 'guide') send({ c: 'guide', on: !!t.checked });
    }
    function input(ev) { const t = ev.target; if (t && t.dataset && t.dataset.act === 'size' && st.S) { const v = st.S.sizes[+t.value]; if (v) send({ c: 'size', v }); } }
    function key(ev) {
      const t = ev.target; if (t && t.getAttribute && t.getAttribute('role') === 'tab') {
        const ks = TABS.map(x => x[0]); let i = ks.indexOf(st.tab); const k = ev.key;
        if (k === 'ArrowRight') i = (i + 1) % ks.length; else if (k === 'ArrowLeft') i = (i + ks.length - 1) % ks.length; else if (k === 'Home') i = 0; else if (k === 'End') i = ks.length - 1; else return;
        ev.preventDefault(); st.tab = ks[i]; st.ask = null; draw(true); const n = dyn.querySelector('#hr-t-' + st.tab); if (n) n.focus();
      }
    }
    dyn.addEventListener('click', click); el.querySelector('.hr-head').addEventListener('click', click);
    dyn.addEventListener('change', change); dyn.addEventListener('input', input); dyn.addEventListener('keydown', key);
    dyn.addEventListener('pointerdown', ev => { if (ev.target && ev.target.type === 'range') st.hold = true; });
    const rel = () => { if (st.hold) { st.hold = false; if (st.dirty) { st.dirty = false; st.key = ''; draw(true); } } };
    document.addEventListener('pointerup', rel); document.addEventListener('pointercancel', rel);

    /* ---------- 바깥에서 부르는 것 ---------- */
    function setPrefs(p) { if (p.fold != null) st.fold = !!p.fold; if (p.op != null && OPS.includes(+p.op)) st.op = +p.op; st.key = ''; head(); draw(true); }
    function setState(S) { st.S = S; if (!S || !S.active) st.ask = null; else if (st.ask && st.ask.kind === 'slot' && !S.slots[st.ask.n]) st.ask = null; draw(false); }
    function setStatus(t) { if (statusEl.textContent !== t) statusEl.textContent = t || ''; }
    function setConn(c) { st.conn = { k: c.k, t: c.t || '' }; head(); draw(false); }
    head(); draw(true);
    return { setState, setStatus, setConn, setPrefs, redraw: () => draw(true), prefs: () => ({ fold: st.fold, op: st.op }), el, kind, tab: () => st.tab,
      destroy() { document.removeEventListener('pointerup', rel); document.removeEventListener('pointercancel', rel); el.innerHTML = ''; el.classList.remove('hrem', 'float', 'page', 'fold'); } };
  }
  root.HudRemoteUI = { mount, OPS };
})(typeof window !== 'undefined' ? window : globalThis);
