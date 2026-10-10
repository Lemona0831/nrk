'use strict';
/* ===== HUD 리모콘 연결 (10월 10일 0.6a.2-113) =====
   게임 창과 별도 리모콘 페이지(remote.html)가 같은 출처에서 메시지를 주고받는 길. BroadcastChannel을 쓰고, 없으면 localStorage의 storage 이벤트로 대신한다.
   게임 창(index.html)과 리모콘 페이지가 둘 다 이 파일을 읽는다. 게임 코드는 모른다.
   메시지는 { app: 'nrk062-hud', t, gid, ... } 꼴이고 모양이 맞지 않는 것은 버린다. 명령 값의 범위는 게임 창이 다시 검사한다(js/57-hud-remote.js). */
(function (root) {
  const APP = 'nrk062-hud';
  const CH = 'nrk062-hud-remote';
  const KEY = 'nrk062_hud_remote_msg';
  const okMsg = m => !!m && typeof m === 'object' && m.app === APP && typeof m.t === 'string' && m.t.length < 24;
  function open(onMsg) {
    let bc = null, onStore = null, n = 0;
    try { if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel(CH); } catch (e) { bc = null; }
    if (bc) {
      bc.onmessage = ev => { if (okMsg(ev.data)) onMsg(ev.data); };
      return { kind: 'broadcast', post: m => { try { bc.postMessage(Object.assign({ app: APP }, m)); } catch (e) { } }, close: () => { try { bc.close(); } catch (e) { } } };
    }
    try {
      onStore = ev => { if (ev.key !== KEY || !ev.newValue) return; let m = null; try { m = JSON.parse(ev.newValue); } catch (e) { } if (okMsg(m)) onMsg(m); };
      root.addEventListener('storage', onStore);
    } catch (e) { onStore = null; }
    return {
      kind: onStore ? 'storage' : 'none',
      post: m => { if (!onStore) return; try { root.localStorage.setItem(KEY, JSON.stringify(Object.assign({ app: APP, n: ++n + ':' + Math.random() }, m))); } catch (e) { } },
      close: () => { if (onStore) root.removeEventListener('storage', onStore); },
    };
  }
  root.HudRemoteLink = { open, APP, CH, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
