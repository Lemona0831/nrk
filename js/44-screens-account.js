'use strict';
/* ===== 타이틀 (진행 중인 캐릭터가 없으면 [시작], 있으면 [이어하기]·[처음부터]) ===== */
/* 직업 격자(.clscol 열마다 위에서 아래로 쌓임)에서 방향키가 가려는 칸. 없으면 null(끝에서는 돌지 않는다). 숨겨진 직업은 열리기 전에는 칸이 없어 건너뛴다 */
function clsGridNext(btn, key) {
  const col = btn.closest('.clscol'); const grid = col && col.parentElement; if (!grid) return null;
  const cols = [...grid.querySelectorAll(':scope > .clscol')].map(c => [...c.querySelectorAll(':scope > .clsc[data-a="clspick"]')]);
  const ci = [...grid.querySelectorAll(':scope > .clscol')].indexOf(col); const ri = cols[ci].indexOf(btn); if (ci < 0 || ri < 0) return null;
  if (key === 'ArrowUp') return cols[ci][ri - 1] || null;
  if (key === 'ArrowDown') return cols[ci][ri + 1] || null;
  const nc = ci + (key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0);
  return nc === ci ? null : (cols[nc] && cols[nc][ri]) || null;
}
/* 업데이트 항목 하나: 판 이름 · 제목, 날짜와 시각, 줄마다 종류 표(새 기능·바뀜·고침). 옛 항목은 top·groups 글 묶음 */
const CHG_K = { '새 기능': 'new', '바뀜': 'chg', '고침': 'fix' };
function chgEntry(c, latest, brief) {
  const li = x => typeof x === 'string' ? `<li>${esc(x)}</li>` : `<li><span class="ctag ck-${CHG_K[x.k] || 'chg'}">${esc(x.k)}</span>${esc(x.t)}</li>`;
  const ul = a => `<ul class="chgl">${a.map(li).join('')}</ul>`;
  const head = `<h4>${esc(c.v)}${c.t ? ' · ' + esc(c.t) : ''}${latest ? ' <span class="newtag">최신</span>' : ''}</h4>${c.d ? `<div class="chgd">${esc(c.d)}</div>` : ''}`;
  const body = c.groups && !brief ? c.groups.map(g => `<h5 class="chgh">${esc(g.h)}</h5>${ul(g.items)}`).join('') : ul((brief && c.top) || c.items || c.top || []);
  return `<section class="chg${latest ? ' chglatest' : ''}">${head}${!brief && c.top && c.items ? `<div class="chgsummary">${c.top.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : ''}${body}</section>`;
}
function curDesc(c) { const ch = c.ch || 1; return c.phase === 'wait' || c.phase === 'clearsv' ? ch + '챕터 돌파 · ' + (CHAPTERS[ch + 1] ? (ch + 1) + '챕터로 갈 준비' : (ch + 1) + '챕터 준비 중') : c.phase === 'shop' ? ch + '챕터 돌파 · 상점' : c.phase === 'settle' ? ch + '챕터 돌파 · 정산' : ch + '챕터 · ' + floorName(c.room); }
function vTitle() {
  const d = G.data; const c = d.cur && !runOver(d.cur) && BUILDS[d.cur.build] ? d.cur : null;
  let h = `<div class="title-scr"><div class="tlogo"><span class="ver">${esc(VERSION)}</span><p class="tlh" aria-hidden="true">나락의 유산</p><p class="lore">무너진 수도원 아래, 빛이 닿지 않는 곳까지 계단이 이어진다.</p></div><div class="tmenu">`;
  if (c) { const B = BUILDS[c.build]; h += `<div class="tcur"><span class="big" aria-hidden="true">${B.ico}</span><div><b>${esc(c.cname || B.n)}</b><small>${esc(B.n)} · Lv ${c.lv || 1} · ${esc(curDesc(c))}</small></div></div><button class="gold" data-a="resume" data-focus>이어하기</button><button data-a="restart">처음부터</button>`; }
  else h += `<button class="gold" data-a="newchar" data-focus>시작</button>`;
  h += `<div class="row tgoal"><button data-a="goals">📋 계정 목표</button>${markOpen() ? '<button data-a="mark">🎖️ 표식 도전</button>' : ''}</div>`;
  if (d.tutSeen || c) h += `<button class="tutbtn" data-a="tut">🎯 수련장${d.tutDone ? ' <small>수료</small>' : ''}</button>`;
  const kept = (d.kept || []).filter(k => !runOver(k) && BUILDS[k.build]);
  if (kept.length) h += `<div class="tkept"><p class="mini">기다리는 캐릭터 ${kept.length}</p>${kept.map(k => { const B = BUILDS[k.build]; return `<div class="tcur sm"><span class="big" aria-hidden="true">${B.ico}</span><div><b>${esc(k.cname || B.n)}</b><small>${esc(B.n)} · Lv ${k.lv || 1} · ${esc(curDesc(k))}</small></div><button class="sm" data-a="resumekept" data-k="${esc(k.id)}">이어하기</button></div>`; }).join('')}</div>`;
  h += `</div></div><div class="tbelow">`;
  if (G.sync) h += `<div class="banner" role="status">${esc(G.sync)}</div>`;
  if (G.conn && G.conn !== 'ok' && !G.owner) h += `<section class="card warncard"><h3>기록이 자동으로 모이지 않고 있습니다</h3><p>${esc(CONN_MSG[G.conn] || CONN_MSG.nodb)}</p><button class="gold" data-a="code">기록 보내기 코드</button></section>`;
  h += vAcct();
  if (d.seenVer !== CHANGE_VER) { const seen = CHANGELOG.findIndex(c => c.v === d.seenVer); const mj = CHANGELOG.findIndex(c => c.groups); const first = mj >= 0 && (seen < 0 || seen > mj); const nw = first ? [CHANGELOG[mj]] : CHANGELOG.slice(0, Math.max(1, Math.min(seen, 3))); // 아직 안 본 업데이트만(최대 3개). 통합 항목을 아직 안 봤다면(처음이거나 옛 판) 통합 항목 하나만
    h += `<section class="card news"><h3>새로 바뀐 것${!first && seen > 1 ? ` <span class="newtag">업데이트 ${seen}개</span>` : ''}</h3>${nw.map((c, i) => i === 0 ? chgEntry(c, false, true) : `<div class="chgmore"><b>${esc(c.v)}${c.t ? ' · ' + esc(c.t) : ''}</b> <span class="chgd">${esc(c.d || '')}</span></div>`).join('')}<button data-a="changes">업데이트 내역 전체 보기</button></section>`; }
  if (G.site) h += '<p class="mini tfoot"><a href="privacy.html" target="_blank" rel="noopener">개인정보처리방침<span aria-hidden="true"> ↗</span><span class="sr"> 새 창에서 열림</span></a></p>';
  return h + '</div>';
}

/* ===== 캐릭터 만들기: 이름 → 직업 → 스킬 → 능력치 (끝까지 정하기 전에는 저장하지 않는다) ===== */
const CNAMES = ['아르덴', '베일', '카엘', '로웬', '세린', '이렌', '모르간', '하엘', '테오', '엘다', '미르', '오웬', '리안', '세라', '단테', '노아', '에반', '루카', '시엘', '하린', '바엘', '유리엘', '케인', '마렌'];
function vCreate() {
  const C = G.cre || { step: 'name' }; const S = G.sheet && G.sheet.data.first ? G.sheet : null;
  const step = S ? S.kind : C.step; const si = { name: 0, cls: 1, skills: 2, stats: 3 }[step] || 0;
  let h = `<ol class="stepper" aria-label="캐릭터 만들기">${['이름', '직업', '스킬', '능력치'].map((x, i) => `<li class="${i < si ? 'done' : i === si ? 'now' : ''}"${i === si ? ' aria-current="step"' : ''}><span>${i + 1}</span>${x}</li>`).join('')}</ol>`;
  if (S) { const [t, body] = sheetParts(S); return h + `<section class="card cstep"><h3>${esc(t)}</h3>${body}</section>`; }
  if (step === 'name') {
    return h + `<section class="card cstep"><h3>이름을 정하세요</h3><p class="lore">수도원 아래로 내려갈 사람의 이름. 쓰러지면 이 이름은 돌아오지 않는다.</p><label for="cname">캐릭터 이름 (12자까지)</label><div class="row nowrap"><input id="cname" type="text" maxlength="12" autocomplete="off" value="${esc(C.name || '')}" placeholder="이름을 적거나 주사위를 누르세요"><button data-a="cnroll" aria-label="이름 추천 받기" title="이름 추천">🎲</button></div><p class="mini">랭킹에는 이 이름과 함께 플레이어 이름${G.data.name ? ' "' + esc(G.data.name) + '"' : '(랭킹 화면에서 정함)'}이 보입니다.</p>${G.abandonOnCreate ? '<p class="warn">새 캐릭터를 끝까지 만들면 지금 캐릭터는 포기한 것으로 기록됩니다. 그전에 그만두면 지금 캐릭터는 그대로입니다.</p>' : ''}<div class="row"><button class="gold" data-a="cnok">다음: 직업 고르기</button><button data-a="createcancel">그만두기</button></div></section>`;
  }
  const pk = C.pick && BUILDS[C.pick] ? C.pick : null;
  h += `<section class="card cstep"><h3>직업을 고르세요${q('build', '직업과 빌드')}</h3><p class="mini"><b>${esc(C.name)}</b>의 직업입니다. 직업을 누르면 규칙과 스킬이 아래에 보입니다.</p><div class="clsgrid" role="group" aria-label="직업">`;
  const clsBtn = k => { const B = BUILDS[k]; return `<button class="clsc${pk === k ? ' on' : ''}" data-a="clspick" data-k="${k}" aria-pressed="${pk === k}" style="--c:${CLS_COLOR[k] || 'var(--gold)'}"><span class="big" aria-hidden="true">${B.ico}</span><b>${esc(B.n)}</b><small>생명력 ${B.hp + SLOT_BASE.armor.v[0]}${B.v2 ? ' · 충전 스킬' : ' · 마나 ' + B.mp}</small></button>`; };
  /* 10월 10일 결정 66: 3열 × 2행(공개 직업 여섯). 숨겨진 직업은 열린 뒤에만 열 아래(세 번째 행)에 생긴다. 잠긴 칸은 그리지 않는다 */
  const openKeys = CLASS_KEYS(), placed = {};
  for (const col of CLASS_GRID) for (const k of col) placed[k] = 1;
  CLASS_GRID.forEach((col, i) => { const ks = col.filter(k => openKeys.includes(k)); if (ks.length) h += `<div class="clscol" role="group" aria-label="직업 묶음 ${i + 1}">${ks.map(clsBtn).join('')}</div>`; });
  const rest = openKeys.filter(k => !placed[k]);
  for (const c of (typeof CLASS_SOON !== 'undefined' ? CLASS_SOON : []).filter(c => !openKeys.some(k => BUILDS[k].n === c.n))) h += `<button class="clsc" aria-disabled="true" data-info="soon:${esc(c.n)}"><span class="big" aria-hidden="true">${c.ico}</span><b>${esc(c.n)}</b><small>준비 중</small></button>`;
  if (rest.length) h += `<div class="clscol">${rest.map(clsBtn).join('')}</div>`;
  h += `</div>`;
  if (pk) {
    const B = BUILDS[pk];
    h += `<div class="clsdet" style="--c:${CLS_COLOR[pk] || 'var(--gold)'}"><div class="clsdet-h"><span class="big" aria-hidden="true">${B.ico}</span><div><b>${esc(B.n)}</b><div class="mini">생명력 ${B.hp + SLOT_BASE.armor.v[0]}${B.v2 ? '' : ', 마나 ' + B.mp}</div></div></div><p class="lore">${esc(B.lore || '')}</p><p class="crule">직업 규칙: ${esc(B.rule)}</p>${B.v2 ? `<p class="mini">시작 스킬 (늘 끼워져 있음)</p><ul class="exl">${TREE2[pk].starters.map(id => `<li><b>${esc(SK2[id].n)}</b> <span class="mini">${esc(skBody(SK2[id]))}</span></li>`).join('')}</ul><p class="mini">스킬 트리 세 갈래: ${TREE2[pk].branches.map(br => `<b>${esc(br)}</b>(${esc(TREE2[pk].bd[br])})`).join(', ')}. 다음 단계에서 트리를 봅니다.</p>` : `<p class="mini"><b>직업 기술 ${esc(SIG[pk].n)}</b>: ${esc(SIG[pk].d)}</p><ul class="exl">${exclOf(pk).map(x => `<li><b>${esc(x.n)}</b> <span class="mini">${esc(x.d)}</span></li>`).join('')}</ul>`}</div>`;
  } else h += `<p class="mini clsdet-empty">직업을 하나 누르세요.</p>`;
  if (C.mark) h += markCreateCard(C); else { const hd = C.mode === 'hard' && G.data.hardOpen; h += `<section class="card cstep"><h3>모드</h3><div class="row" role="group" aria-label="모드"><button class="chip${hd ? '' : ' on'}" data-a="cmode" data-k="normal" aria-pressed="${!hd}">일반</button><button class="chip${hd ? ' on' : ''}" data-a="cmode" data-k="hard" aria-pressed="${hd}"${G.data.hardOpen ? '' : ' aria-disabled="true"'}>가혹${G.data.hardOpen ? '' : ' (잠김)'}</button></div>${G.data.hardOpen ? '' : '<p class="mini">1챕터 보스를 한 번 이기면 가혹 모드가 열립니다.</p>'}${hd ? `<ul class="mini">${MODES.hard.why.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mini">일반: 처음 정한 규칙 그대로입니다.</p>'}</section>`; }
  return h + `<div class="stickbar">${pk ? `<button class="gold wide" data-a="start" data-b="${pk}" data-focus>${esc(BUILDS[pk].n + '(으)로 정하기')}</button>` : ''}<div class="row"><button data-a="cback" data-k="name">이전: 이름</button><button data-a="createcancel">그만두기</button></div></div></section>`;
}

/* ===== 계정 목표 · 칭호 · 표식 도전 (10월 8일, docs/시스템/가혹모드-반복.md 2절) =====
   계정 목표: G.data.goals = { n: {…}, h: {…} } (일반 · 가혹). 키 '직업|갈래|챕터' → 처음 넘은 시각.
   갈래는 보스를 이긴 판의 트리에서 칸을 가장 많이 연 갈래이고, 그 갈래가 연 칸의 절반 이상이어야 센다(사냥꾼은 기동을 뺀 피해 갈래가 주).
   표식 도전: run.marks(표식 id) · run.markCh(시작 챕터) · run.markPts(점수). 표식 기록판 G.data.markBest['직업|챕터|n/h'] */
const markOpen = () => !!(G.data && (G.data.markOpen || G.data.unlAll));
function goalsData() { const d = G.data; if (!d.goals) d.goals = { n: {}, h: {} }; if (!d.goals.n) d.goals.n = {}; if (!d.goals.h) d.goals.h = {}; return d.goals; }
function markBestData() { const d = G.data; if (!d.markBest) d.markBest = {}; return d.markBest; }
const goalKey = (build, br, ch) => build + '|' + br + '|' + ch;
const statStartPts = run => STAT_START + (run && run.markStat ? run.markStat : 0);
function goalBranch(run) {
  const T = TREE2[run.build], t = run.tree; if (!T || !t || !t.open.length) return null;
  const cnt = {}; for (const id of t.open) { const sk = SK2[id]; if (sk && sk.b) cnt[sk.b] = (cnt[sk.b] || 0) + 1; }
  const by = list => list.slice().sort((x, y) => (cnt[y] || 0) - (cnt[x] || 0))[0];
  let main, base = t.open.length;
  if (run.build === 'hunter') { // 사냥꾼: 기동은 피해 갈래와 함께 여는 갈래라, 기동을 뺀 피해 갈래를 주로 센다
    const dm = T.branches.filter(b => b !== '기동'); const tot = dm.reduce((a, b) => a + (cnt[b] || 0), 0);
    if ((cnt['기동'] || 0) > tot) main = '기동'; else { main = by(dm); base = tot; }
  } else main = by(T.branches);
  return main && base > 0 && (cnt[main] || 0) * 2 >= base ? main : null;
}
function goalsRecord(run) { // 보스를 이겼을 때(표식 도전 판은 제외). 새로 적힌 칸의 이름을 돌려준다
  if (!run || run.markCh || !run.tree) return '';
  const br = goalBranch(run), g = goalsData(), m = run.mode === 'hard' ? 'h' : 'n', ch = run.ch || 1; let news = '';
  if (br) { const k = goalKey(run.build, br, ch); if (!g[m][k]) { g[m][k] = Date.now(); news = BUILDS[run.build].n + ' ' + br + ' ' + ch + '챕터' + (m === 'h' ? ' 가혹' : ''); } }
  if (ch >= 3) G.data.markOpen = 1;
  saveLocal(); return news;
}
function codexDone() { const c = (G.data && G.data.codex) || {}; const ids = Object.keys(FOE_INTRO); return ids.length > 0 && ids.every(id => c[id] && Object.keys(CODEX[id] || {}).every(k => c[id].seen && c[id].seen[k])); }
function titleEarned(id) {
  const g = goalsData();
  if (id === 'branch') return ALL_CLASS_KEYS().some(k => TREE2[k] && TREE2[k].branches.every(b => g.n[goalKey(k, b, 3)] || g.h[goalKey(k, b, 3)]));
  if (id === 'hard') return Object.keys(g.h).some(k => k.slice(-2) === '|3');
  if (id === 'hidden') { const ks = typeof UNLOCK === 'undefined' ? [] : Object.keys(UNLOCK).filter(k => BUILDS[k] && !BUILDS[k].soon); const o = (G.data.unl && G.data.unl.open) || {}; return ks.length > 0 && ks.every(k => o[k]); }
  if (id === 'codex') return codexDone();
  return false;
}
const titleName = id => { const t = TITLES.find(x => x.id === id); return t ? t.n : ''; };
function goalsMerge(s) { // 로그인했을 때 계정의 값과 합친다: 목표는 합집합, 기록은 큰 값
  if (!s) return; const g = goalsData();
  for (const m of ['n', 'h']) for (const [k, v] of Object.entries((s.g || {})[m] || {})) if (v && !g[m][k]) g[m][k] = v;
  if (s.markOpen) G.data.markOpen = 1;
  if (!G.data.title && s.title) G.data.title = s.title;
  const mb = markBestData(); for (const [k, v] of Object.entries(s.mb || {})) if (v && (!mb[k] || (v.score || 0) > (mb[k].score || 0))) mb[k] = v;
  saveLocal();
}
/* 표식 도전 시작: startRun이 G.cre.mark가 있을 때 부른다(캐릭터 만들기 화면과 자동 테스터가 같은 함수를 쓴다). 챕터 시작 레벨 · 트리 포인트 · 능력치 점수 · 장비 꾸러미 */
function markSetup(run, M) {
  const ch = Math.max(1, Math.min(3, M.ch || 1)); run.markCh = ch; run.marks = (M.ids || []).filter(k => MARKS[k]); run.markPts = markPts(run.marks);
  if (markOn(run, 'flask')) run.p.markFlask = 1;
  if (ch > 1) {
    const lv = MARK_START[ch].lv, up = lv - 1;
    run.lv = lv; run.xp = LV_XP[lv - 1]; run.p.lv = lv; if (run.tree) run.tree.pts += up; run.markStat = LV_POINTS * up;
    run.ch = ch; run.boss = chData(ch).boss;
  }
  delete run.dg; dgInit(run); // 표식이 정해진 뒤에 첫 문을 만든다
  if (ch > 1) markKit(run, ch);
  else { for (const fk of ['life', 'mana', 'stam']) run.p.flask[fk] = Math.min(run.p.flask[fk], flaskCap(run.p, fk)); }
}
/* 챕터 시작 꾸러미: 앞 챕터 풀의 장비. 무기 · 갑옷은 고급, 나머지는 평범(직업에 맞는 첫 장비, 수치는 등급의 가운데), 약초 묶음 셋 */
function markKit(run, ch) {
  const p = run.p;
  for (const sl of ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2']) {
    const kind = sl === 'ring1' || sl === 'ring2' ? 'ring' : sl; const g = sl === 'weapon' || sl === 'armor' ? 'm' : 'n';
    const owned = Object.values(run.inv).map(x => x.tpl);
    const pool = poolOf(ch - 1).filter(k => ITEMS[k] && ITEMS[k].kind !== 'start' && tplKind(k) === kind && poolOk(p, k) && !owned.includes(k));
    const fit = pool.filter(k => itemFits(p, k) && (ITEMS[k].g || 'n') === g), any = pool.filter(k => (ITEMS[k].g || 'n') === g);
    const L = fit.length ? fit : any.length ? any : pool; if (!L.length) continue;
    const ig = ITEMS[L[0]].g || 'n', R = GRADE[ig] || GRADE.n;
    const it = mkItem(L[0], { g: ig, ch: ch - 1, b: Math.round((R.lo + R.hi) / 2 * 10) / 10 }); run.inv[it.uid] = it; run.bag.push(it.uid); equipUid(run, it.uid, sl);
  }
  for (const u of run.bag.slice()) discardUid(run, u); // 바꾸고 남은 시작 장비
  consAdd(run, 'herb', 'n', 3);
  applyGear(run); p.hp = p.hpMax; p.st = p.stMax; for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = flaskCap(p, fk);
}
function markWin(run) { // 표식 도전의 보스를 이겼을 때: 최고 점수를 남긴다
  const k = run.build + '|' + run.markCh + '|' + (run.mode === 'hard' ? 'h' : 'n'), mb = markBestData(), sc = run.markPts || 0;
  run.markScore = sc; if (!mb[k] || sc > (mb[k].score || 0)) mb[k] = { score: sc, ids: (run.marks || []).slice(), lv: run.lv || 1, cname: run.cname || '', at: Date.now() };
  saveLocal();
}
function markFinish(run) { run.phase = null; run.result = 'win'; run.sealed = 1; clearCur(); saveRunLocal(); G.scr = 'survey'; render(); window.scrollTo(0, 0); }
function markCreateCard(C) {
  const M = C.mark; const names = M.ids.map(k => MARKS[k].ico + ' ' + MARKS[k].n).join(', ');
  return `<section class="card cstep"><h3>표식 도전</h3><p><b>${M.ch}챕터</b>${M.ch > 1 ? ' · 레벨 ' + MARK_START[M.ch].lv + '에서 시작' : ' · 처음부터'} · ${M.mode === 'hard' ? '가혹 모드' : '일반 모드'}</p><p class="mini">표식: ${esc(names)}</p><p class="mini">표식 점수 ${markPts(M.ids)}점. 이 챕터의 보스를 넘으면 끝납니다.</p></section>`;
}

/* ===== 랭킹 (기획서 11.11절): 가장 멀리 간 캐릭터. 깬 챕터 → 층 → 레벨, 같으면 플레이 시간이 짧은 쪽 ===== */
const modeTag = o => o && o.mode === 'hard' ? ' <span class="chip hardtag">가혹</span>' : '';
const RANK_ST = { dead: '쓰러짐', clear: '돌파', abandon: '포기', alive: '진행 중' };
const rankScore = e => (e.clears || 0) * 1000 + ((e.ch || 1) > (e.clears || 0) ? (e.floor || 0) : 0);
const rankCmp = (a, b) => rankScore(b) - rankScore(a) || (b.lv || 1) - (a.lv || 1) || (a.ms || 0) - (b.ms || 0);
function rankProg(e) { return (e.clears || 0) >= (e.ch || 1) ? `${e.clears}챕터 돌파` : `${e.ch || 1}챕터 ${floorName(e.floor || 1)}`; }
function fmtMs(ms) { const m = Math.round((ms || 0) / 60000); return m < 60 ? m + '분' : Math.floor(m / 60) + '시간 ' + (m % 60) + '분'; }
/* 플레이 시간: 누르거나 키를 칠 때마다 지난 시간을 더한다. 한 번에 1분까지만 더해 자리를 비운 시간은 세지 않는다 */
function playTick() { const run = G.run; if (!run || runOver(run) || G.creating) return; const now = Date.now(); run.playMs = (run.playMs || 0) + Math.min(60000, Math.max(0, now - (run.tick || now))); run.tick = now; }
function rankEntry(run, st) {
  const e = { id: run.id, v: VERSION, cname: run.cname || '', build: run.build, ch: run.ch || 1, floor: Math.min(run.room || 1, FLOOR_BOSS), clears: run.clears || 0, mode: run.mode || 'normal', lv: run.lv || 1, st: st || (run.clears ? 'clear' : 'alive'), ms: Math.round(run.playMs || 0), at: Date.now(), eq: run.eqU ? EQ_SLOTS.map(sl => { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; return it ? it.tpl : null; }).filter(Boolean) : [] };
  if (G.data && G.data.title && titleEarned(G.data.title)) e.title = G.data.title; // 칭호(계정 목표)
  return e;
}
async function pushRank(run, st) {
  if (!run || !run.id || run.markCh) return; const e = rankEntry(run, st); /* 표식 도전 판은 랭킹에 올리지 않는다(표식 기록판에 따로) */
  G.data.rank62 = Object.assign({}, G.data.rank62, { [run.id]: e }); saveLocal();
  if (!G.db || !G.uid || G.conn !== 'ok') return;
  try {
    const ref = G.db.doc('board/' + G.uid); const cur = await ref.get();
    const d = cur.exists ? JSON.parse(JSON.stringify(cur.data() || {})) : {}; const R = d.rank62 = d.rank62 || {}; R[run.id] = e;
    Object.keys(R).sort((a, b) => rankCmp(R[a], R[b])).slice(40).forEach(id => delete R[id]); // 한 사람당 40개까지
    d.name = G.data.name || d.name || ''; await ref.set(d); G.board = null; if (G.scr === 'rank') render();
  } catch (e2) { }
}
/* 랭킹의 직업 표시: 아직 열지 않은 숨겨진 직업은 이름 · 아이콘을 숨긴다(내 줄은 그대로). 필터는 e.build를 그대로 쓴다 */
function rankClassView(e) { const B = BUILDS[e.build]; return e.me || unlOpen(e.build) ? B : { ico: '❔', n: '숨겨진 직업' }; }
function rankRows() {
  const out = [];
  if (G.db && G.board) { for (const x of G.board) for (const e of Object.values(x.rank62 || {})) out.push(Object.assign({ nick: x.name || '', me: x.uid === G.uid }, e)); }
  else for (const e of Object.values(G.data.rank62 || {})) out.push(Object.assign({ nick: G.data.name || '', me: true }, e));
  return out.filter(e => BUILDS[e.build]).sort(rankCmp);
}
function backBtn() { return `<button class="sm back" data-a="back">← 돌아가기</button>`; }

/* ===== 기록: 내 캐릭터들, 쓰러진 자의 기록, 보내기 ===== */

/* ===== 관리자 페이지: 암호(사이트) → 결과 보기 ===== */
function vAdmin() {
  let h = `<section class="card"><div class="phead">${backBtn()}<h3>관리자</h3></div>`;
  const siteMode = G.site || !!siteCfg(); // 설정 파일이 있으면 접속이 끝나기 전에도 사이트로 본다 (주소 #admin으로 바로 열 때)
  if (siteMode && !G.owner) {
    if (G.conn !== 'ok') return h + '<p class="mini">저장소에 연결하는 중입니다. 연결되지 않으면 새로 고쳐 주세요.</p></section>';
    return h + `<p class="mini">결과 보기와 지인 기록 넣기는 Supabase 설정 때 정한 관리자 암호로 엽니다. 이 기기에만 기억됩니다.</p><label for="adminpass">관리자 암호</label><input id="adminpass" type="password" autocomplete="current-password">${G.adminMsg ? `<p class="no" role="status">${esc(G.adminMsg)}</p>` : ''}<button class="gold" data-a="admingo">확인</button></section>`;
  }
  if (typeof UNLOCK !== 'undefined' && Object.keys(UNLOCK).length) h += `<div class="row"><button data-a="unlall" aria-pressed="${!!G.data.unlAll}">숨겨진 직업 · 표식 도전 ${G.data.unlAll ? '잠그기' : '모두 열기'} (이 기기에서만, 시험용)</button></div>`;
  if (!G.dash && !G.dashReq && (G.conn || !siteMode)) { G.dashReq = 1; setTimeout(loadDash, 0); }
  return h + '<p class="mini">' + esc(VERSION) + ' 기록만 모았습니다. 0.6a와 B0.5 기록은 따로 있습니다.</p></section>' + (G.dash ? vDash06() : '') + vDash();
}
/* 0.6 요약: 직업별 완주, 쓰러진 층, 문 고르기, 방 결과, 상점 */
function vDash06() {
  const runs = []; (G.dashRaw || []).forEach((t, i) => (t.runs || []).forEach(r => { if (r.doorLog || r.cname != null) runs.push(Object.assign({ who: testerLabel(t, i) }, r)); }));
  let h = `<section class="card"><h4>0.6 캐릭터 ${runs.length}명</h4>`;
  if (!runs.length) return h + '<p class="mini">아직 0.6 판이 없습니다.</p></section>';
  const bn = ALL_CLASS_KEYS(); const by = {}; for (const k of bn) by[k] = runs.filter(r => r.build === k);
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const done = rs => rs.filter(r => r.result === 'lose' || (r.clears || 0) >= 1);
  h += `<div class="tbl"><table class="st2"><caption class="sr">빌드별 요약</caption><thead><tr><th scope="col">항목</th>${bn.map(k => `<th scope="col">${esc(BUILDS[k].n)}</th>`).join('')}</tr></thead><tbody>`;
  const row = (lab, f) => `<tr><td>${lab}</td>${bn.map(k => `<td>${f(by[k])}</td>`).join('')}</tr>`;
  h += row('만든 캐릭터', rs => rs.length);
  h += row('1챕터 완주 / 결판', rs => { const d = done(rs); const c = d.filter(r => (r.clears || 0) >= 1).length; return `${c}/${d.length} ${pct(c, d.length)}`; });
  h += row('쓰러진 층 (평균)', rs => { const l = rs.filter(r => r.result === 'lose'); return l.length ? r1(l.reduce((a, r) => a + (r.roomReached || 0), 0) / l.length) : '—'; });
  h += row('보스 앞 레벨 (평균)', rs => { const l = rs.filter(r => (r.roomReached || 0) >= FLOOR_BOSS); return l.length ? r1(l.reduce((a, r) => a + (r.lv || 1), 0) / l.length) : '—'; });
  h += row('정산 골드 (평균)', rs => { const l = rs.filter(r => r.settle); return l.length ? Math.round(l.reduce((a, r) => a + r.settle.total, 0) / l.length) : '—'; });
  h += `</tbody></table></div>`;
  // 쓰러진 곳
  const dz = {}; for (const r of runs) if (r.result === 'lose') { const f = r.roomReached || 0; const k = f >= FLOOR_BOSS ? '보스' : isLower(f) ? '하층' : '상층'; dz[k] = (dz[k] || 0) + 1; }
  h += `<p class="mini">쓰러진 곳: ${Object.entries(dz).map(([k, v]) => k + ' ' + v).join(', ') || '—'}</p>`;
  // 문: 나왔을 때 고른 비율
  const off = {}, pick = {}; for (const r of runs) for (const x of r.doorLog || []) { const ts = x.offered.map(o => o.split('+')[0]); ts.forEach(t => off[t] = (off[t] || 0) + 1); const t = ts[x.picked]; if (t) pick[t] = (pick[t] || 0) + 1; }
  h += `<h4>문 고르기 (나왔을 때 고른 비율)</h4><div class="wrap">${Object.keys(off).sort((a, b) => (pick[b] || 0) / off[b] - (pick[a] || 0) / off[a]).map(t => `<span class="chip">${ROOM_TYPES[t] ? ROOM_TYPES[t].ico + ' ' + esc(ROOM_TYPES[t].n) : esc(t)} ${pct(pick[t] || 0, off[t])} <small class="mini">(${pick[t] || 0}/${off[t]})</small></span>`).join('') || '—'}</div>`;
  // 방 결과
  const rw = {}; for (const r of runs) for (const x of r.rooms || []) if (x.res && x.type) { const o = rw[x.type] = rw[x.type] || { win: 0, lose: 0, flee: 0, hp: 0 }; o[x.res] = (o[x.res] || 0) + 1; if (x.res === 'win' && x.hpOut != null) o.hp += x.hpOut; }
  h += `<h4>방 결과</h4><div class="tbl"><table class="st2"><caption class="sr">방 결과</caption><thead><tr><th scope="col">방</th><th scope="col">이김</th><th scope="col">쓰러짐</th><th scope="col">물러남</th><th scope="col">이긴 뒤 남은 생명력</th></tr></thead><tbody>${Object.entries(rw).map(([t, o]) => `<tr><td>${ROOM_TYPES[t] ? esc(ROOM_TYPES[t].n) : t === 'boss' ? '보스' : esc(t)}</td><td>${o.win}</td><td>${o.lose}</td><td>${o.flee}</td><td>${o.win ? Math.round(o.hp / o.win * 100) + '%' : '—'}</td></tr>`).join('')}</tbody></table></div>`;
  // 상점
  const buys = [], sells = []; let left = 0, shops = 0, respec = 0; for (const r of runs) if (r.shop) { shops++; for (const x of r.shop.log || []) { if (x.a === 'buy') buys.push(x); if (x.a === 'sell') sells.push(x); if (x.a === 'respec') respec++; } if (r.phase === 'wait' || r.clears) left += r.gold || 0; }
  h += `<h4>상점 ${shops}번</h4><p class="mini">산 것 ${buys.length}개 (평범 ${buys.filter(x => x.g === 'n').length}, 고급 ${buys.filter(x => x.g === 'm').length}, 희귀 ${buys.filter(x => x.g === 'r').length}, 영웅 ${buys.filter(x => x.g === 'h').length}), 판 것 ${sells.length}개, 능력치 다시 나누기 ${respec}번, 남긴 골드 평균 ${shops ? Math.round(left / shops) : '—'}</p>${buys.length ? `<p class="mini">많이 산 것: ${Object.entries(buys.reduce((m, x) => (m[x.tpl] = (m[x.tpl] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => esc(ITEMS[k] ? ITEMS[k].n : k) + ' ' + v).join(', ')}</p>` : ''}`;
  // 최근 캐릭터
  h += `<h4>최근 캐릭터</h4><div class="tbl"><table class="st2"><caption class="sr">최근 캐릭터</caption><thead><tr><th scope="col">테스터</th><th scope="col">캐릭터</th><th scope="col">도달</th><th scope="col">Lv</th><th scope="col">결과</th><th scope="col">시간</th></tr></thead><tbody>${runs.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)).slice(0, 30).map(r => `<tr><td>${esc(r.who)}</td><td>${esc(r.cname || '—')} <span class="mini">${esc((BUILDS[r.build] || {}).n || r.build)}</span></td><td>${esc(rankProg({ ch: r.ch, clears: r.clears, floor: r.roomReached }))}</td><td>${r.lv || 1}</td><td>${r.result === 'lose' ? '쓰러짐' : r.result === 'abandon' ? '포기' : (r.clears || 0) ? '돌파' : '진행 중'}</td><td>${fmtMs(r.playMs)}</td></tr>`).join('')}</tbody></table></div>`;
  return h + '</section>';
}

