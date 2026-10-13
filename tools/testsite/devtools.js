/* 테스트 메뉴 (10월 14일). tools/build-test-site.js가 테스트 사이트에만 넣는다. 공개 게임에는 들어가지 않는다.
   화면 오른쪽 가장자리의 🧪 단추로 연다. 게임의 전역 이름(const로 선언된 G·CONS·ITEMS 등은 window에 붙지 않으므로 이름으로 직접 읽는다. 함수는 window에 붙는다: gainXp, advanceFloor, startSettle, consGrant, mkItem, addItem …)를 그대로 부른다. */
(function () {
  'use strict';
  const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
  const css = `
#tm-btn{position:fixed;right:0;top:42%;z-index:100000;width:34px;height:34px;padding:0;font:16px sans-serif;border-radius:17px 0 0 17px;border:1px solid #888;border-right:0;background:rgba(34,34,34,.75);color:#fff;cursor:pointer}
#tm{position:fixed;right:40px;top:12%;z-index:100000;width:min(360px,calc(100vw - 16px));max-height:70vh;overflow:auto;background:#1b1b1f;color:#eee;border:1px solid #666;border-radius:10px;padding:10px;font:13px/1.45 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)}
#tm h4{margin:10px 0 4px;font-size:13px;color:#f5c542}#tm .row{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0}
#tm button{font:12px sans-serif;padding:4px 7px;border-radius:6px;border:1px solid #555;background:#2d2d33;color:#eee;cursor:pointer}
#tm button:hover{background:#3b3b44}#tm select,#tm input{font:12px sans-serif;background:#111;color:#eee;border:1px solid #555;border-radius:5px;padding:3px;max-width:100%}
#tm .st{white-space:pre-wrap;background:#111;border-radius:6px;padding:6px;font:12px monospace}#tm .warn{color:#ff9b7a}`;
  document.head.appendChild($('<style>' + css + '</style>'));
  const btn = $('<button id="tm-btn" type="button" aria-expanded="false" aria-label="테스트 메뉴" title="테스트 메뉴">🧪</button>'); // 화면 오른쪽 가장자리: 게임의 아래쪽 행동 버튼을 가리지 않게
  document.body.appendChild(btn);
  let panel = null;
  const has = (n) => typeof window[n] === 'function';
  const run = () => (typeof G !== 'undefined' && G.run) || null;
  const inBattle = () => !!(typeof G !== 'undefined' && G.b && !G.b.over);
  const done = (msg) => { try { if (has('saveRunLocal')) saveRunLocal(); if (has('saveCur')) saveCur(); } catch (e) { } try { render(); } catch (e) { } if (msg && has('toast')) toast('🧪 ' + msg); refresh(); };
  const need = (cond, why) => { if (!cond) { if (has('toast')) toast('🧪 ' + why); refresh(); } return cond; };

  function status() {
    const r = run(); if (!r) return '캐릭터가 없습니다. 먼저 캐릭터를 만드세요.';
    const p = r.p || {}; const f = p.flask || {};
    const cons = (r.cons || []).map(c => ((typeof CONS !== 'undefined' && CONS[c.id] && CONS[c.id].n) || c.id) + '×' + c.n).join(', ') || '없음';
    return [
      '직업 ' + r.build + ' · ' + (r.mode === 'hard' ? '가혹' : '일반') + ' · ' + (r.ch || 1) + '챕터 ' + (r.room || 0) + '층' + (r.phase ? ' · ' + r.phase : ''),
      '레벨 ' + (r.lv || 1) + ' · 경험치 ' + Math.round(r.xp || 0) + ' · 골드 ' + (r.gold || 0),
      '생명력 ' + Math.round(p.hp || 0) + '/' + (p.hpMax || 0) + ' · 스태미나 ' + Math.round(p.st || 0) + '/' + (p.stMax || 0),
      '플라스크 생명 ' + (f.life || 0) + ' · 정화 ' + (f.mana || 0) + ' · 스태미나 ' + (f.stam || 0),
      '소모품: ' + cons,
      inBattle() ? '전투 중' + (window.TM_GOD ? ' · 무적 켬' : '') : '전투 밖',
    ].join('\n');
  }
  function refresh() { if (panel) panel.querySelector('.st').textContent = status(); }

  const A = {
    gold: (n) => { const r = run(); if (!need(r, '캐릭터가 없습니다')) return; r.gold = (r.gold || 0) + n; done('골드 +' + n); },
    hp: (frac) => { const r = run(); if (!need(r, '캐릭터가 없습니다')) return; const p = (G.b && G.b.p) || r.p; p.hp = Math.max(1, Math.round(p.hpMax * frac)); if (G.b && G.b.p !== r.p) r.p.hp = p.hp; done('생명력 ' + Math.round(frac * 100) + '%'); },
    flask: () => { const r = run(); if (!need(r, '캐릭터가 없습니다')) return; const p = (G.b && G.b.p) || r.p; for (const k of ['life', 'mana', 'stam']) p.flask[k] = has('flaskCap') ? flaskCap(p, k) : 3; done('플라스크 가득'); },
    level: () => { const r = run(); if (!need(r, '캐릭터가 없습니다') || !need(!inBattle(), '전투 밖에서 쓰세요') || !need(has('gainXp') && typeof LV_XP !== 'undefined', '레벨업 함수를 찾지 못했습니다')) return; if (r.lv >= LV_XP.length) return need(false, '최고 레벨입니다'); const up = gainXp(r, Math.max(1, LV_XP[r.lv] - (r.xp || 0))); if (up) { r.statPending = (r.statPending || 0) + (typeof LV_POINTS !== 'undefined' ? LV_POINTS : 3) * up; if (has('openSheet')) openSheet('stats', { pts: r.statPending, pending: 1, why: '🧪 레벨 ' + r.lv + ' · 능력치 ' + r.statPending + '점' }); } done('레벨 ' + r.lv); },
    floor: (n) => { const r = run(); if (!need(r, '캐릭터가 없습니다') || !need(!inBattle(), '전투 밖에서 쓰세요') || !need(!r.phase, '정산·상점 중에는 쓸 수 없습니다')) return; n = Math.max(1, Math.min(typeof FLOORS !== 'undefined' ? FLOORS : 24, n | 0)); r.room = n - 1; r.cross = null; advanceFloor(); G.scr = 'run'; G.b = null; done(n + '층으로 이동'); },
    settle: () => { const r = run(); if (!need(r, '캐릭터가 없습니다') || !need(!inBattle(), '전투 밖에서 쓰세요') || !need(has('startSettle'), '정산 함수를 찾지 못했습니다')) return; r.clears = Math.max(r.clears || 0, r.ch || 1); startSettle(r); G.scr = 'settle'; G.b = null; done('보스를 깬 것으로 하고 정산'); },
    cons: (id, g, n) => { const r = run(); if (!need(r, '캐릭터가 없습니다')) return; const left = has('consGrant') ? consGrant(r, id, g, n) : (has('consAdd') ? consAdd(r, id, g, n) : n); done(((CONS[id] && CONS[id].n) || id) + ' ' + (n - (left || 0)) + '개' + (left ? ' (넘친 ' + left + '개는 보류)' : '')); },
    item: (k, g) => { const r = run(); if (!need(r, '캐릭터가 없습니다') || !need(typeof ITEMS !== 'undefined' && ITEMS[k], '없는 장비입니다')) return; const it = mkItem(k, { g, ch: r.ch || 1 }); if (!need(addItem(r, it), '가방이 가득 찼습니다')) return; done(ITEMS[k].n + ' (' + g + ') 가방에'); },
    weaken: () => { if (!need(inBattle(), '전투 중에 쓰세요')) return; for (const e of G.b.en) if (e.alive && e.hp > 1) e.hp = 1; done('적 모두 생명력 1'); },
    god: () => { if (!window.TM_HURT && has('hurtPlayer')) { window.TM_HURT = window.hurtPlayer; window.hurtPlayer = function () { if (window.TM_GOD) return 0; return window.TM_HURT.apply(this, arguments); }; } window.TM_GOD = !window.TM_GOD; done('무적 ' + (window.TM_GOD ? '켬' : '끔')); },
    exportRun: () => { const r = run(); if (!need(r, '캐릭터가 없습니다')) return; const rec = has('runRecord') ? runRecord(r) : r; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(rec, null, 1)], { type: 'application/json' })); a.download = 'nrk-test-run-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
    preset: (id) => {
      const P = (window.TM_PRESETS || []).find(x => x.id === id); if (!need(P, '프리셋을 고르세요') || !need(!inBattle(), '전투 밖에서 쓰세요')) return;
      if (run() && !confirm('지금 판을 버리고 "' + P.label + '" 캐릭터로 새로 시작할까요?')) return;
      G.cre = { name: '프리셋', mode: P.mode }; if (G.data) G.data.hardOpen = 1;
      startRun(P.build); const r = G.run, p = r.p, miss = [];
      r.mode = P.mode; r.ch = P.ch; r.boss = chData(P.ch).boss; r.clears = P.ch - 1; delete r.dg; dgInit(r); for (let c = 2; c <= P.ch; c++) chGift(r, c, true);
      r.lv = Math.min(P.lv, LV_XP.length); p.lv = r.lv; r.xp = LV_XP[r.lv - 1] || 0;
      r.stats = Object.assign({ str: 0, dex: 0, int: 0, con: 0, wil: 0 }, P.stats); r.statPending = 0; applyStats(p, r.stats);
      treeInit(r); r.tree.open = P.treeOpen.filter(x => SK2[x]); r.tree.pts = Math.max(0, ((TREE2[P.build] || {}).pts || 1) + r.lv - 1 - r.tree.open.length);
      r.skills = P.skills.filter(x => r.tree.open.includes(x)); p.skills = v2Equip(r);
      P.gear.forEach((g, i) => { if (!g || /^start_/.test(g.tpl)) return; if (!ITEMS[g.tpl]) { miss.push(g.tpl); return; } const it = mkItem(g.tpl, { g: g.g, b: g.b, ch: g.ch }); addItem(r, it); const w = equipUid(r, it.uid, EQ_SLOTS[i]); if (w) miss.push(g.tpl + ': ' + w); });
      applyGear(r, true);
      r.awk = P.awk.filter(x => AWK_MAP[x]); p.awk = r.awk.slice();
      r.cons = []; for (const [k, n] of Object.entries(P.cons || {})) { const [cid, g] = k.split(':'); if (CONS[cid]) consAdd(r, cid, g, n); }
      r.gold = P.gold || 0; for (const k of ['life', 'mana', 'stam']) p.flask[k] = flaskCap(p, k); p.hp = p.hpMax; p.st = p.stMax;
      G.scr = 'run'; G.b = null; G.sheet = null;
      done(P.label + ' 불러옴' + (miss.length ? ' (없는 장비: ' + miss.join(', ') + ')' : ''));
    },
    wipe: () => { if (!confirm('테스트 사이트의 세이브를 모두 지우고 새로 시작할까요? (실제 게임 세이브는 건드리지 않습니다)')) return; for (const k of Object.keys(localStorage)) if (/^nrk_test|^nrkTest|^nrktest/.test(k)) localStorage.removeItem(k); location.reload(); },
  };

  function build() {
    const consOpts = typeof CONS !== 'undefined' ? Object.keys(CONS).filter(k => CONS[k].use !== 'none').map(k => `<option value="${k}">${CONS[k].n}</option>`).join('') : '';
    const itemKeys = typeof ITEMS !== 'undefined' ? Object.keys(ITEMS).filter(k => ITEMS[k].kind !== 'start' && ITEMS[k].n) : [];
    panel = $(`<div id="tm" role="dialog" aria-label="테스트 메뉴">
<b>🧪 테스트 메뉴</b> <small>(테스트 사이트 전용)</small>
<div class="st"></div>
<h4>프리셋 캐릭터 (실제 플레이 기록의 보스전 직전 상태)</h4><div class="row"><select id="tm-preset">${(window.TM_PRESETS || []).map(x => '<option value="' + x.id + '">' + x.label + '</option>').join('')}</select><button data-x="preset">불러오기</button></div>
<h4>자원</h4><div class="row"><button data-x="gold" data-n="100">골드 +100</button><button data-x="gold" data-n="1000">골드 +1000</button><button data-x="flask">플라스크 가득</button></div>
<div class="row"><button data-x="hp" data-n="1">생명력 가득</button><button data-x="hp" data-n="0.3">생명력 30%</button><button data-x="hp" data-n="0.1">생명력 10%</button></div>
<h4>성장·진행</h4><div class="row"><button data-x="level">레벨 +1</button><button data-x="settle">보스 깬 것으로 → 정산·상점</button></div>
<div class="row">층 <input id="tm-floor" type="number" min="1" max="24" value="12" style="width:56px"><button data-x="floor">이동</button><button data-x="floorTo" data-n="12">야영지(12층)</button><button data-x="floorTo" data-n="24">보스(24층)</button></div>
<h4>소모품</h4><div class="row"><select id="tm-cons">${consOpts}</select><select id="tm-cg"><option value="n">일반</option><option value="m">고급</option></select><input id="tm-cn" type="number" min="1" max="99" value="5" style="width:48px"><button data-x="cons">주기</button></div>
<h4>장비</h4><div class="row"><input id="tm-if" placeholder="이름으로 찾기" style="width:120px"><select id="tm-item"></select><select id="tm-ig"><option value="n">평범</option><option value="m">고급</option><option value="r">희귀</option><option value="h">영웅</option><option value="l">전설</option></select><button data-x="item">가방에</button></div>
<h4>전투</h4><div class="row"><button data-x="weaken">적 모두 생명력 1</button><button data-x="god">무적 켜기/끄기</button></div>
<h4>기록</h4><div class="row"><button data-x="exportRun">이 판 기록 내려받기</button><button data-x="wipe" class="warn">테스트 세이브 초기화</button></div>
<small>바꾼 값은 바로 저장됩니다. 실제 게임과 기록이 섞이지 않습니다.</small></div>`);
    document.body.appendChild(panel);
    const sel = panel.querySelector('#tm-item'), filt = panel.querySelector('#tm-if');
    const fill = () => { const q = filt.value.trim(); sel.innerHTML = itemKeys.filter(k => !q || ITEMS[k].n.includes(q) || k.includes(q)).slice(0, 200).map(k => `<option value="${k}">${ITEMS[k].n}</option>`).join(''); };
    filt.addEventListener('input', fill); fill();
    panel.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-x]'); if (!b) return; const x = b.dataset.x, n = +b.dataset.n;
      try {
        if (x === 'gold') A.gold(n); else if (x === 'hp') A.hp(n); else if (x === 'floor') A.floor(+panel.querySelector('#tm-floor').value); else if (x === 'floorTo') A.floor(n);
        else if (x === 'cons') A.cons(panel.querySelector('#tm-cons').value, panel.querySelector('#tm-cg').value, Math.max(1, +panel.querySelector('#tm-cn').value || 1));
        else if (x === 'item') A.item(sel.value, panel.querySelector('#tm-ig').value);
        else if (x === 'preset') A.preset(panel.querySelector('#tm-preset').value);
        else A[x]();
      } catch (e) { if (has('toast')) toast('🧪 오류: ' + e.message); console.error(e); }
    });
    refresh();
  }
  btn.addEventListener('click', () => { if (!panel) build(); const open = panel.style.display !== 'none'; if (panel.dataset.ready && open) { panel.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); return; } panel.dataset.ready = 1; panel.style.display = ''; btn.setAttribute('aria-expanded', 'true'); refresh(); });
  setInterval(refresh, 1000);
  window.TM = A; // 콘솔에서도 쓸 수 있다: TM.gold(500)
})();
