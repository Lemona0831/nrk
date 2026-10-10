'use strict';
/* ===== HUD 리모콘 별도 페이지 (10월 10일 0.6a.2-113) =====
   게임 창과 같은 출처에서 BroadcastChannel(없으면 storage 이벤트)로만 이야기한다. 게임 코드는 읽지 않고 G도 만지지 않는다.
   받는 것: state(편집 상태) · idle(편집 중 아님) · end(편집 끝 · 창 닫힘). 보내는 것: hello(찾기) · cmd(명령, 게임 창 gid가 같을 때만 처리된다).
   게임 창이 여럿이면 편집을 가장 최근에 시작한 창(since가 큰 것) 하나에만 붙는다. 6초 동안 소식이 없으면 끊김으로 보고 명령을 막는다. */
(function () {
  const LOST_MS = 6000, NONE_MS = 3500;
  let gid = null, since = 0, lastAt = 0, seen = false, t0 = Date.now(), state = 'wait';
  const link = HudRemoteLink.open(onMsg);
  const ui = HudRemoteUI.mount(document.getElementById('app'), { kind: 'page', send: c => { if (gid && state === 'ok') link.post({ t: 'cmd', gid, cmd: c }); }, onRetry: () => { seen = false; t0 = Date.now(); setConn('wait'); hello(); } });
  const END_T = { save: '저장하고 편집을 끝냈습니다.', cancel: '취소하고 편집을 끝냈습니다.', list: '목록으로 편집하러 넘어갔습니다.' };
  function setConn(k, t) { if (state === k && !t) return; state = k; ui.setConn({ k, t }); }
  function attach() { if (gid) link.post({ t: 'attach', gid }); } /* 붙어 있는 동안 게임 창이 자기 패널을 숨긴다 */
  function hello() { link.post({ t: 'hello', ts: Date.now() }); }
  function drop() { gid = null; since = 0; ui.setState(null); ui.setStatus(''); }
  function onMsg(m) {
    if (m.t === 'state') {
      if (typeof m.gid !== 'string' || !m.S || m.S.active !== true) return;
      if (gid && m.gid !== gid && !(Number(m.since) > since)) return; /* 이미 붙은 창보다 먼저 시작한 창은 무시 */
      gid = m.gid; since = Number(m.since) || 0; lastAt = Date.now(); seen = true;
      ui.setState(m.S); ui.setStatus(m.S.msg || ''); setConn('ok'); attach();
    } else if (m.t === 'idle') {
      seen = true; if (gid && m.gid !== gid) return; if (gid) drop();
      if (state !== 'end') setConn('idle');
    } else if (m.t === 'end') {
      if (m.gid !== gid) return; drop(); seen = true;
      if (m.how === 'closed') setConn('lost', '게임 창이 닫혔습니다. 게임을 다시 열고 편집을 시작하면 자동으로 연결합니다.');
      else setConn('end', (END_T[m.how] || '편집이 끝났습니다.') + ' 게임에서 화면에서 편집을 다시 시작하면 이어서 조작합니다.');
    }
  }
  setInterval(() => {
    const now = Date.now();
    if (gid) { if (now - lastAt > LOST_MS) { drop(); setConn('lost'); } else attach(); return; }
    if (state === 'wait' && !seen && now - t0 > NONE_MS) setConn('none');
    hello();
  }, 2000);
  window.addEventListener('pagehide', () => { if (gid) link.post({ t: 'detach', gid }); link.close(); });
  setConn('wait'); hello();
})();
