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
  const lines = el.isConnected && G.toastLines && Date.now() - (G.toastAt || 0) < 2400 ? G.toastLines : []; lines.push(fixJosa(m)); G.toastLines = lines.slice(-4); G.toastAt = Date.now(); el.textContent = G.toastLines.join('\n'); clearTimeout(G.toastT); /* 10월 5일: 전리품 알림이 골드 · 경험치 알림에 덮여 보이지 않았다 */
  G.toastT = setTimeout(() => { const e2 = document.querySelector('.toast'); if (e2) e2.remove(); }, 2400 + 800 * (G.toastLines.length - 1)); // 10월 5일 고침: 타이머가 주석 안으로 들어가 알림이 사라지지 않았다. 줄이 많으면 조금 더 남긴다
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
/* ---------- 시험 전투 (10월 5일 만든 사람 요청): 던전 없이 직업 · 레벨 · 스킬 4칸 · 적을 골라 바로 싸운다. 기록 · 랭킹 · 전리품 없음 ---------- */
const TEST_ROLES = ['bruiser', 'shield', 'archer', 'healer', 'summoner', 'minion', 'thief', 'darkmage', 'pyre'];
function testFoes(ch) {
  ch = ch || 1; const L = SQUADS.filter(q => inCh(q, ch)).map(q => ({ id: 'sq:' + q.id, g: '무리', n: q.n }));
  for (const f of STRONG_FOES.filter(x => inCh(x, ch))) L.push({ id: 'sf:' + f.id, g: '강적', n: f.n });
  L.push({ id: 'boss', g: '보스', n: BOSSES[chData(ch).boss].n });
  for (const r of TEST_ROLES.concat(ch === 2 ? NEWR : ch >= 3 ? NEWR3.filter(x => ROLES[x]) : []).filter(r => ch !== 2 || r !== 'darkmage')) L.push({ id: 'one:' + r, g: '하나', n: ((ENEMY_NAMES[ch] || ENEMY_NAMES[1])[r] || ROLES[r].n) });
  return L;
}
const testClasses = () => Object.keys(BUILDS).filter(k => BUILDS[k].v2 && !BUILDS[k].tut && unlOpen(k)); // 숨겨진 직업은 열린 뒤에만
function testCfg() {
  const T = G.test = G.test || {}; if (!T.build || !BUILDS[T.build]) T.build = testClasses()[0];
  if (!T.lv) T.lv = 5; if (!T.floor) T.floor = 'low'; if (TREE2[T.build] && !TREE2[T.build].branches.includes(T.br)) T.br = TREE2[T.build].branches[0]; if (!T.ch || !CHAPTERS[T.ch]) T.ch = 1; if (!T.foe || !testFoes(T.ch).some(f => f.id === T.foe)) T.foe = testFoes(T.ch)[0].id; if (!T.sk || T.skFor !== T.build) { T.sk = []; T.skFor = T.build; } return T;
}
function testRoom(T) {
  const low = T.floor === 'low'; const ch = T.ch || 1; const fl = T.foe === 'boss' ? FLOOR_BOSS : low ? FLOOR_CAMP + 3 : 5; const room = { lv: mlvOf(fl, ch), floor: fl, ch, names: ENEMY_NAMES[ch] || ENEMY_NAMES[1], path: 'main', en: [] };
  const [kind, id] = T.foe.split(':');
  if (kind === 'sq') { const q = SQUADS.find(x => x.id === id); room.en = JSON.parse(JSON.stringify(low || !q.up ? q.low : q.up)); room.squad = id; }
  else if (kind === 'sf') { const f = STRONG_FOES.find(x => x.id === id); room.en = JSON.parse(JSON.stringify(f.en)); room.strong = f.n; room.foe = f.id; }
  else if (kind === 'boss') room.boss = 1;
  else room.en = [[id, T.elite ? 1 : 0]];
  if (T.amb && !room.boss) room.ambush = 1;
  return room;
}
function testStart() {
  const T = testCfg(); const B = BUILDS[T.build]; const lv = T.lv;
  const st = statRecommend(T.build, {}, STAT_START + LV_POINTS * (lv - 1));
  const p = mkPlayer(T.build, {}, st, (TREE2[T.build] ? TREE2[T.build].starters : []).concat(T.sk)); p.lv = lv; applyStats(p, st); p.hp = p.hpMax; p.st = p.stMax;
  const room = testRoom(T); G.testRun = G.testRun || G.run; G.run = null;
  G.b = roomBattle(p, room, room.boss ? chData(room.ch).boss : null, Math.floor(Math.random() * 1e6)); G.b.ctx.test = 1; G.b.stepMode = true; fdetFresh(); G.sel = null; G.scr = 'test'; render();
}
function testLeave() { G.b = null; G.scr = 'title'; if (G.testRun) { G.run = G.testRun; G.testRun = null; } render(); }
function vTestSetup() {
  const T = testCfg(); const B = BUILDS[T.build]; const TR = TREE2[T.build];
  const btn = (a, k, on, label) => `<button class="sm${on ? ' gold' : ''}" data-a="${a}" data-k="${esc(String(k))}"${on == null ? '' : ` aria-pressed="${!!on}"`}>${label}</button>`; /* on이 null이면 누르는 버튼(토글 아님) */
  let h = `<section class="card"><h3>🧪 시험 전투</h3><p class="mini">직업 · 레벨 · 스킬 4칸 · 적을 골라 바로 싸웁니다. 트리 조건 없이 아무 칸이나 끼웁니다. 기록과 랭킹에 남지 않고 전리품도 없습니다. 능력치는 추천 배분, 장비는 처음 장비입니다.</p></section>`;
  h += `<section class="card"><h4>직업</h4><div class="tgrid">${testClasses().map(k => btn('testcls', k, T.build === k, BUILDS[k].ico + ' ' + esc(BUILDS[k].n) + (BUILDS[k].soon ? ' (준비 중)' : ''))).join('')}</div>`;
  h += `<h4>레벨</h4><div class="tgrid sm5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => btn('testlv', n, T.lv === n, 'Lv' + n)).join('')}</div></section>`;
  if (TR) {
    h += `<section class="card"><h4>스킬 <span class="mini">${T.sk.length}/${EQUIP_SLOTS2}</span></h4><p class="mini">시작 스킬 ${TR.starters.map(id => esc(SK2[id].n)).join(', ')}은 늘 끼웁니다. 칸에 마우스를 올리거나 길게 누르면 설명이 나옵니다.</p>`;
    h += `<div class="tpick">${T.sk.length ? T.sk.map(id => `<button class="sm gold" data-a="testsk" data-k="${id}" data-info="sk:${id}">✕ ${esc(SK2[id].n)}</button>`).join('') : '<span class="mini">아직 끼운 칸이 없습니다.</span>'}</div>`;
    h += `<div class="tgrid">${TR.branches.map(br => btn('testbr', br, T.br === br, esc(br))).join('')}${btn('testfill', T.br, null, '⚡ ' + esc(T.br) + ' 위 4칸')}${btn('testclear', 0, null, '비우기')}</div><div class="tsk">`;
    for (let r = 1; r <= Math.max(10, ...SKILLS2[T.build].map(x => x.row || 0)); r++) for (const sk of SKILLS2[T.build].filter(x => x.b === T.br && x.row === r)) { const on = T.sk.includes(sk.id); h += `<button class="tskb${on ? ' on' : ''}" data-a="testsk" data-k="${sk.id}" data-info="sk:${sk.id}" aria-pressed="${on}"><b>${r}. ${esc(sk.n)}</b><small>${esc(skHead(sk))}</small></button>`; }
    h += `</div></section>`;
  }
  h += `<section class="card"><h4>챕터</h4><div class="tgrid">${Object.keys(CHAPTERS).map(c => btn('testch', c, +T.ch === +c, c + '챕터 · ' + esc(CHAPTERS[c].n))).join('')}</div></section>`;
  const F = testFoes(T.ch); const grp = {}; for (const f of F) (grp[f.g] = grp[f.g] || []).push(f);
  h += `<section class="card"><h4>적</h4>${Object.keys(grp).map(g => `<h5 class="chgh">${g}${g === '하나' ? ' ' + btn('testelite', 0, !!T.elite, '정예로') : ''}</h5><div class="tgrid">${grp[g].map(f => btn('testfoe', f.id, T.foe === f.id, esc(f.n))).join('')}</div>`).join('')}`;
  h += `<h4>층</h4><div class="tgrid">${btn('testfloor', 'up', T.floor === 'up', '상층 (몬스터 Lv' + mlvOf(5, T.ch) + ')')}${btn('testfloor', 'low', T.floor === 'low', '하층 (몬스터 Lv' + mlvOf(FLOOR_CAMP + 3, T.ch) + ')')}${btn('testamb', 0, !!T.amb, '매복')}</div><p class="mini">보스는 늘 보스층(몬스터 Lv${mlvOf(FLOOR_BOSS, T.ch)})입니다.</p></section>`;
  h += `<div class="stickbar flow"><button class="gold wide" data-a="teststart" data-focus>싸우기</button><div class="row"><button data-a="testleave">그만두기</button></div></div>`;
  return h;
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

