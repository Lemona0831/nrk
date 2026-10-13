'use strict';
/* ===== 기록 · 랭킹 · 도감 · 계정 목표 · 표식 도전 화면 (0.6a.2-113, 10월 10일 전면 개편) =====
   저장 형식은 그대로다: G.data.runs · rank62 · graves · codex · goals · markBest · 랭킹판(G.board)을 읽기만 한다.
   화면 상태(필터 · 탭 · 열린 판)는 G.rc에만 두고 저장하지 않는다. 단추는 data-a="rc" data-k="종류:값" 하나로 받는다.
   랭킹의 일반 · 가혹과 직업 칩, 목표의 일반 · 가혹, 표식 도전의 고르기는 예전 data-a(rmode · rtab · gmode · mk*)를 그대로 쓴다.
   숨겨진 직업은 랭킹 · 도감 · 목표에서 rankClassView · unlOpen으로 가린다. 내 판 기록은 내 직업 이름 그대로 쓴다. */
function rcS() { return G.rc = G.rc || { f: { cls: 'all', ch: 0, mode: 'all', res: 'all', sort: 'recent' }, show: 20, tab: 'runs', open: null, cch: 1, ckind: 'all', cdx: null }; }
const RC_STL = { dead: '쓰러짐', clear: '돌파', abandon: '포기', alive: '진행 중', left: '중단' };
const RC_PAGE = 20;
const rcDate = t => { if (!t) return '기록 없음'; const d = new Date(t), y = d.getFullYear() !== new Date().getFullYear(); return d.toLocaleDateString('ko-KR', Object.assign(y ? { year: 'numeric' } : {}, { month: 'long', day: 'numeric' })); };
const rcClock = t => t ? new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
const rcMs = ms => ms > 0 ? fmtMs(ms) : '기록 없음';
function rcFloor(ch, f) {
  if (!f) return '';
  if (f === FLOOR_BOSS) return ch >= 3 ? '재의 왕좌' : '보스';
  if (f === FLOOR_CAMP) return ch >= 3 && typeof floorBand3 === 'function' ? '오아시스 야영지' : '야영지';
  if (f > FLOORS) return '끝';
  if (ch >= 3 && typeof floorBand3 === 'function') return floorBand3(f).n + ' ' + f + '층';
  return (isLower(f) ? '하층 ' : '상층 ') + f + '층';
}
function rcProg(x) { return (x.clears || 0) >= (x.ch || 1) ? x.clears + '챕터 돌파' : (x.ch || 1) + '챕터 ' + rcFloor(x.ch || 1, x.floor || 1); }
const rcSteps = (a, b) => a.filter(x => x).length + '/' + b;
/* 내 판 기록: G.data.runs를 바탕으로, 랭킹 줄(rank62)에만 남은 판도 간단한 줄로 함께 센다 */
function rcRuns() {
  const d = G.data, R = d.rank62 || {}, seen = {}, out = []; const live = {};
  if (d.cur) live[d.cur.id] = 1; for (const k of d.kept || []) live[k.id] = 1;
  const stOf = (res, e, lv, clears) => res === 'lose' ? 'dead' : res === 'abandon' ? 'abandon' : res === 'flee' ? 'left' : lv ? 'alive' : (e && e.st === 'dead') ? 'dead' : (e && e.st === 'abandon') ? 'abandon' : clears > 0 ? 'clear' : 'left';
  for (const r of d.runs || []) {
    if (!r || !BUILDS[r.build]) continue; seen[r.id] = 1; const e = R[r.id] || null;
    out.push({ id: r.id, raw: r, lite: false, build: r.build, cname: r.cname || '', ch: r.ch || 1, clears: r.clears || 0, floor: Math.min(r.roomReached || (e && e.floor) || 1, FLOOR_BOSS), lv: r.lv || 1, ms: r.playMs || (e && e.ms) || 0, at: r.startedAt || (e && e.at) || 0, end: r.endedAt || 0, mode: (e && e.mode) || r.mode || 'normal', st: stOf(r.result, e, !!live[r.id], r.clears || 0), marks: r.markCh ? r.markCh : 0 });
  }
  for (const e of Object.values(R)) {
    if (!e || !BUILDS[e.build] || seen[e.id]) continue;
    out.push({ id: e.id, raw: null, lite: true, build: e.build, cname: e.cname || '', ch: e.ch || 1, clears: e.clears || 0, floor: e.floor || 1, lv: e.lv || 1, ms: e.ms || 0, at: e.at || 0, end: 0, mode: e.mode || 'normal', st: e.st === 'alive' ? (live[e.id] ? 'alive' : 'left') : (e.st || 'left'), marks: 0 });
  }
  return out;
}
function rcSurveyDone(r) { return !!(r && (r.survey || (r.surveys && Object.keys(r.surveys).length))); }
/* 설문을 물어본 판(쓰러짐 · 돌파)인데 답이 없는 판 */
const rcNoSurvey = x => !x.lite && (x.st === 'dead' || x.st === 'clear') && !rcSurveyDone(x.raw);
function rcChip(k, label, on) { return `<button type="button" class="rcchip" data-a="rc" data-k="${esc(k)}" aria-pressed="${!!on}">${label}</button>`; }
function rcGroup(id, label, inner) { return `<div class="rcgrp" role="group" aria-labelledby="${id}"><span class="rcgl" id="${id}">${esc(label)}</span><div class="rcchips">${inner}</div></div>`; }
/* 탭: 선택한 탭만 tabindex 0, 방향키로 옮기면 바로 바뀐다(자동 활성). items: { a, k, t, on, n } */
function rcTabs(id, label, items) {
  return `<div class="rctabs" role="tablist" aria-label="${esc(label)}">${items.map(it => `<button type="button" role="tab" class="rctab" id="${id}-${esc(it.k)}" data-a="${it.a}" data-k="${esc(it.k)}" aria-selected="${!!it.on}" aria-controls="${id}-panel" tabindex="${it.on ? 0 : -1}">${it.t}${it.n != null ? ` <small>${it.n}</small>` : ''}</button>`).join('')}</div>`;
}
const rcPanel = (id, cur, html) => `<div class="rcpanel" id="${id}-panel" role="tabpanel" aria-labelledby="${id}-${esc(cur)}">${html}</div>`;
const rcBar = (v, max, label) => `<div class="rcprog"><progress max="${max || 1}" value="${v}" aria-label="${esc(label)}">${v}/${max}</progress><b>${v}/${max}</b></div>`;

/* ===== 기록 ===== */
function rcFiltered(runs) {
  const f = rcS().f;
  return runs.filter(x => (f.cls === 'all' || x.build === f.cls) && (!f.ch || x.ch === f.ch) && (f.mode === 'all' || x.mode === f.mode) && (f.res === 'all' || (f.res === 'clear' ? x.clears > 0 : x.st === f.res)));
}
function rcSortRuns(a) { return a.slice().sort(rcS().f.sort === 'far' ? rankCmp : (x, y) => (y.at || 0) - (x.at || 0)); }
function rcSummary(runs) {
  const best = runs.slice().sort(rankCmp)[0], cnt = {}; runs.forEach(x => { cnt[x.build] = (cnt[x.build] || 0) + 1; });
  const fav = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], clear = runs.filter(x => x.clears > 0).length, ms = runs.reduce((a, x) => a + (x.ms || 0), 0);
  const c = (k, v, s) => `<li class="rcstat"><span class="rck">${k}</span><b class="rcv">${v}</b><small>${s}</small></li>`;
  return `<ul class="rcstats" aria-label="내 기록 요약">${c('가장 멀리 간 판', esc(rcProg(best)), `<span aria-hidden="true">${BUILDS[best.build].ico}</span> ${esc(BUILDS[best.build].n)} · Lv ${best.lv}`)}${c('챕터를 돌파한 판', clear + '판', '전체 ' + runs.length + '판 가운데')}${c('가장 많이 쓴 직업', `<span aria-hidden="true">${BUILDS[fav].ico}</span> ${esc(BUILDS[fav].n)}`, cnt[fav] + '판')}${c('총 플레이 시간', ms > 0 ? fmtMs(ms) : '기록 없음', '모든 판을 합친 시간')}</ul>`;
}
function rcRunCard(x) {
  const B = BUILDS[x.build], st = RC_STL[x.st] || '';
  const tag = [`<span class="rctag st-${x.st}">${x.st === 'clear' ? x.clears + '챕터 돌파' : st}</span>`, x.mode === 'hard' ? '<span class="rctag hard">가혹</span>' : '', x.marks ? `<span class="rctag">표식 ${x.marks}챕터</span>` : '', rcNoSurvey(x) ? '<span class="rctag warn">설문 전</span>' : ''].join('');
  return `<li class="rcrun"><button type="button" class="rccard" data-a="rc" data-k="open:${esc(x.id)}"><span class="rcico" aria-hidden="true">${B.ico}</span><span class="rcmain"><b>${esc(x.cname || B.n)}</b><span class="rctags">${tag}</span><small>${esc(B.n)} · ${esc(rcProg(x))}</small></span><span class="rcside"><b>Lv ${x.lv}</b><small>${x.ms > 0 ? fmtMs(x.ms) + ' · ' : ''}${rcDate(x.at)}</small></span></button></li>`;
}
function rcRunsPane() {
  const S = rcS(), f = S.f, runs = rcRuns(); if (!runs.length) return '<div class="rcempty"><p><b>아직 남은 기록이 없습니다.</b></p><p class="mini">캐릭터를 만들어 던전에 들어가면 판마다 여기에 쌓입니다.</p></div>';
  const has = k => Array.from(new Set(runs.map(k)));
  const cls = Object.keys(BUILDS).filter(k => has(x => x.build).includes(k)), chs = has(x => x.ch).sort(), sts = ['dead', 'clear', 'abandon', 'alive', 'left'].filter(k => k === 'clear' ? runs.some(x => x.clears > 0) : runs.some(x => x.st === k));
  let h = rcSummary(runs); h += '<div class="rcfilters">';
  if (cls.length > 1) h += rcGroup('rfc', '직업', rcChip('fcls:all', '전체', f.cls === 'all') + cls.map(k => rcChip('fcls:' + k, `<span aria-hidden="true">${BUILDS[k].ico}</span> ${esc(BUILDS[k].n)}`, f.cls === k)).join(''));
  if (chs.length > 1) h += rcGroup('rfh', '챕터', rcChip('fch:0', '전체', !f.ch) + chs.map(c => rcChip('fch:' + c, c + '챕터', f.ch === c)).join(''));
  if (runs.some(x => x.mode === 'hard')) h += rcGroup('rfm', '모드', rcChip('fmode:all', '전체', f.mode === 'all') + rcChip('fmode:normal', '일반', f.mode === 'normal') + rcChip('fmode:hard', '가혹', f.mode === 'hard'));
  if (sts.length > 1) h += rcGroup('rfr', '결과', rcChip('fres:all', '전체', f.res === 'all') + sts.map(k => rcChip('fres:' + k, k === 'clear' ? '돌파' : RC_STL[k], f.res === k)).join(''));
  h += rcGroup('rfs', '정렬', rcChip('fsort:recent', '최근 순', f.sort === 'recent') + rcChip('fsort:far', '멀리 간 순', f.sort === 'far')) + '</div>';
  const list = rcSortRuns(rcFiltered(runs)), shown = list.slice(0, S.show);
  h += `<p class="mini rccount" role="status" aria-live="polite">${list.length === runs.length ? `기록 ${list.length}판` : `기록 ${runs.length}판 가운데 ${list.length}판`}</p>`;
  if (!list.length) return h + '<div class="rcempty"><p><b>이 조건에 맞는 판이 없습니다.</b></p><p class="mini">필터를 바꾸거나 모두 풀어 보세요.</p><button type="button" class="sm" data-a="rc" data-k="freset:1">필터 풀기</button></div>';
  h += `<ul class="rclist" aria-label="판 기록">${shown.map(rcRunCard).join('')}</ul>`;
  if (list.length > shown.length) h += `<button type="button" class="wide" data-a="rc" data-k="more:1">더 보기 (${list.length - shown.length}판 남음)</button>`;
  return h;
}
function rcGravesPane() {
  const gv = G.data.graves || [], ids = {}; rcRuns().forEach(x => { ids[x.id] = 1; });
  if (!gv.length) return '<div class="rcempty"><p><b>쓰러진 캐릭터가 아직 없습니다.</b></p><p class="mini">던전에서 쓰러지면 마지막 모습이 여기에 남습니다. 최근 20명까지 남습니다.</p></div>';
  return `<p class="mini">최근 쓰러진 캐릭터 ${gv.length}명입니다. 가장 최근이 위에 있습니다.</p><ul class="rclist" aria-label="쓰러진 자의 기록">${gv.map(g => { const B = BUILDS[g.build] || { ico: '', n: g.build || '' }, k = g.kill;
    return `<li class="rcrun rcgrave"><span class="rcico" aria-hidden="true">${B.ico}</span><span class="rcmain"><b>${esc(g.cname || B.n)}</b><small>${esc(B.n)} · ${(g.ch || 1)}챕터 · ${esc(g.roomN || '쓰러진 곳 기록 없음')}</small>${k ? `<small class="rckill">${esc(hitWho(k))} ${k.d} 피해로 쓰러짐</small>` : ''}</span><span class="rcside"><b>Lv ${g.lv || 1}</b><small>장비 ${(g.eq || []).length}개 · ${rcDate(g.at)}</small>${ids[g.id] ? `<button type="button" class="sm" data-a="rc" data-k="open:${esc(g.id)}" aria-label="${esc((g.cname || B.n) + ' 판 자세히 보기')}">자세히</button>` : ''}</span></li>`; }).join('')}</ul>`;
}
function rcRunDetail(id) {
  const x = rcRuns().find(y => y.id === id); if (!x) return '';
  const B = BUILDS[x.build], r = x.raw || {}, g = (G.data.graves || []).find(y => y.id === id);
  let h = `<div class="phead"><button type="button" class="sm back" data-a="rc" data-k="close:${esc(id)}">← 기록 목록</button></div><h3 id="rcdt" tabindex="-1"><span aria-hidden="true">${B.ico}</span> ${esc(x.cname || B.n)}</h3>`;
  h += `<p class="rctags"><span class="rctag st-${x.st}">${x.st === 'clear' ? x.clears + '챕터 돌파' : RC_STL[x.st]}</span>${x.mode === 'hard' ? '<span class="rctag hard">가혹</span>' : ''}${x.marks ? `<span class="rctag">표식 도전 ${x.marks}챕터</span>` : ''}${rcNoSurvey(x) ? '<span class="rctag warn">설문 전</span>' : ''}</p>`;
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  h += `<dl class="rcfacts">${row('직업', esc(B.n))}${row('도달', esc(rcProg(x)))}${row('레벨', 'Lv ' + x.lv)}${row('플레이 시간', rcMs(x.ms))}${row('시작', x.at ? rcDate(x.at) + ' ' + rcClock(x.at) : '기록 없음')}${row('끝', x.end ? rcDate(x.end) + ' ' + rcClock(x.end) : x.st === 'alive' ? '아직 진행 중' : '기록 없음')}${row('골드', r.gold != null ? r.gold : '기록 없음')}</dl>`;
  h += `<section class="rcsec"><h4>능력치</h4>${statReadHtml(r.stats)}<p class="mini">마지막으로 저장된 배분 수치입니다.</p></section>`;
  if (x.lite) return h + '<p class="mini">이 판은 랭킹 줄만 남아 있어 방과 장비 기록이 없습니다.</p>';
  if (r.combatStats) h += `<section class="rcsec"><h4>전투 수치</h4><dl class="rcfacts">${GSTAT.filter(([k])=>Number.isFinite(r.combatStats[k]) && !(isV2({build:x.build}) && k==='mp')).map(([k,lab,fmt])=>row(esc(lab),esc(String(fmt(r.combatStats[k]))))).join('')}</dl><p class="mini">마지막 저장 당시의 수치입니다. 공격 피해는 장비 기준이며 힘 배율·일시 효과·적의 피해 감소 적용 전입니다.</p></section>`;
  /* 장비 · 스킬 · 각인 */
  const eq = Array.isArray(r.eqDetails) ? r.eqDetails : (r.eq7 || []).map((s, i) => s ? {sl:EQ_SLOTS[i],tpl:s.split(':')[0],g:s.split(':')[1] || 'n'} : null).filter(Boolean);
  h += `<section class="rcsec"><h4>최종 장비</h4>${eq.length ? `<ul class="rcplain">${eq.map(e=>`<li><span class="mini">${esc(EQ_SLOT_N[e.sl] || e.sl || '')}</span> <span class="gr-${['n','m','r','h','l'].includes(e.g)?e.g:'n'}">${ITEMS[e.tpl] ? inm(e.tpl,e.g) : esc(e.tpl)}</span>${e.base ? `<p class="mini">${esc(e.base)}</p>` : ''}${e.effect ? `<p>${esc(e.effect)}</p>` : ''}${e.cost ? `<p class="mini">대가: ${esc(e.cost)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="mini">기록 없음</p>'}</section>`;
  const SM = skillMap(x.build), starters = (TREE2[x.build] && TREE2[x.build].starters) || [], sk = (r.skills || []).filter(s => SM[s]);
  h += `<section class="rcsec"><h4>스킬</h4>${starters.length || sk.length ? `<ul class="rcplain">${[...new Set(starters.concat(sk))].filter(id=>SM[id]).map(id=>`<li>${SM[id].v2 ? `<details><summary>${esc(SM[id].n)}</summary><p class="mini">${esc(skHead(SM[id].s))}</p><p>${esc(skBody(SM[id].s))}</p></details>` : esc(SM[id].n)}</li>`).join('')}</ul><p class="mini">설명은 현재 규칙을 기준으로 표시합니다.</p>` : '<p class="mini">기록 없음</p>'}</section>`;
  const aw = (r.awk || []).filter(a => AWK_MAP[a]);
  h += `<section class="rcsec"><h4>각인</h4>${aw.length ? `<ul class="rcplain">${aw.map(a => `<li><b>${esc(AWK_MAP[a].n)}</b> <span class="mini">${esc(AWK_MAP[a].d)}</span></li>`).join('')}</ul>` : '<p class="mini">얻은 각인이 없습니다.</p>'}</section>`;
  /* 어떻게 끝났나 */
  let why = '';
  if (x.st === 'dead') { why = `<p>${esc(g ? g.roomN || rcFloor(x.ch, x.floor) : rcFloor(x.ch, x.floor))}에서 쓰러졌습니다.</p>${g ? graveKill(g) + graveContext(g) : '<p class="mini">결정타 기록 없음</p>'}`; }
  else if (x.st === 'abandon') why = '<p>캐릭터를 포기해 여정을 끝냈습니다.</p>';
  else if (x.st === 'clear') why = `<p>${x.clears}챕터의 보스를 넘었습니다.${r.settle && r.settle.total != null ? ' 정산 골드 ' + r.settle.total + '.' : ''}</p>`;
  else if (x.st === 'alive') why = '<p>아직 이어서 하는 캐릭터입니다.</p>';
  else why = '<p class="mini">끝맺은 기록이 없습니다.</p>';
  h += `<section class="rcsec"><h4>끝난 이유</h4>${why}</section>`;
  /* 방별 결과 */
  const rm = (r.rooms || []).filter(y => y && (y.type || y.res)), T = {};
  rm.forEach(y => { const t = y.type || '기타'; const o = T[t] = T[t] || { n: 0, win: 0, lose: 0, flee: 0 }; o.n++; if (y.res) o[y.res] = (o[y.res] || 0) + 1; });
  const tn = t => t === 'boss' ? '보스' : t === 'camp' ? '야영지' : ROOM_TYPES[t] ? ROOM_TYPES[t].n : t === '기타' ? '기타' : t;
  if (rm.length) {
    const hp = rm.filter(y => y.res === 'win' && y.hpOut != null).sort((a, b) => a.hpOut - b.hpOut)[0];
    h += `<section class="rcsec"><h4>방별 결과</h4><div class="tbl"><table class="st2"><caption class="sr">방 종류별 결과</caption><thead><tr><th scope="col">방</th><th scope="col">지난 수</th><th scope="col">이김</th><th scope="col">쓰러짐</th><th scope="col">물러남</th></tr></thead><tbody>${Object.keys(T).map(t => `<tr><th scope="row">${esc(tn(t))}</th><td>${T[t].n}</td><td>${T[t].win || 0}</td><td>${T[t].lose || 0}</td><td>${T[t].flee || 0}</td></tr>`).join('')}</tbody></table></div>${hp ? `<p class="mini">가장 아슬아슬했던 방은 ${hp.room}층입니다. 이기고 나서 생명력이 ${Math.round(hp.hpOut * 100)}% 남았습니다.</p>` : ''}</section>`;
  } else h += '<section class="rcsec"><h4>방별 결과</h4><p class="mini">기록 없음</p></section>';
  if (x.st === 'dead' || x.st === 'clear') h += `<section class="rcsec"><h4>설문</h4><p>${rcSurveyDone(r) ? '답했습니다.' : '아직 답하지 않았습니다.'}</p></section>`;
  return h;
}
function vRecords() {
  const d = G.data, S = rcS(); const open = S.open && rcRuns().some(x => x.id === S.open) ? S.open : null; if (!open) S.open = null;
  let h = `<section class="card rcpage">${open ? '' : `<div class="phead">${backBtn()}<h3>기록</h3></div>`}`;
  if (open) h += rcRunDetail(open);
  else {
    const gn = (d.graves || []).length;
    h += rcTabs('rctab', '기록 종류', [{ a: 'rc', k: 'tab:runs', t: '판 기록', on: S.tab === 'runs' }, { a: 'rc', k: 'tab:graves', t: '쓰러진 자', n: gn, on: S.tab === 'graves' }]);
    h += rcPanel('rctab', 'tab:' + (S.tab === 'graves' ? 'graves' : 'runs'), S.tab === 'graves' ? rcGravesPane() : rcRunsPane());
  }
  h += '</section>';
  if (open) return h;
  h += `<section class="card"><h3>계정 목표</h3><p class="mini">직업과 갈래마다 보스를 어디까지 넘었는지, 얻은 칭호를 모아 봅니다.${d.title && titleName(d.title) ? ' 지금 칭호는 ' + esc(titleName(d.title)) + '입니다.' : ''}</p><div class="row"><button data-a="goals">계정 목표 보기</button>${markOpen() ? '<button data-a="mark">표식 도전</button>' : ''}</div></section>${vMarkBoard()}<section class="card"><h3>마지막 질문</h3><p class="mini">${d.final ? '이미 답했습니다. 다시 답하면 새 답으로 바뀝니다.' : '여러 캐릭터를 해 본 뒤에 답해 주세요.'}</p><button data-a="final">질문에 답하기</button></section>`;
  h += `<section class="card"><h3>기록 보내기${q('record', '기록에 대해')}</h3><p class="mini">끝낸 판 ${d.runs.filter(r => r && r.endedAt).length}개${G.site && G.conn === 'ok' ? '. 기록은 이 사이트의 저장소에 자동으로 모입니다' : ''}.</p><div class="row"><button data-a="code">기록 보내기 코드</button><button data-a="dl">기록 파일 받기</button><button data-a="guide">처음 안내 다시 보기</button></div></section>`;
  h += `<p class="mini tfoot">${G.site ? '<a href="privacy.html" target="_blank" rel="noopener">개인정보처리방침<span aria-hidden="true"> ↗</span><span class="sr"> 새 창에서 열림</span></a> · ' : ''}<button class="linkbtn" data-a="admin">관리자</button></p>`;
  return h;
}

/* ===== 랭킹 ===== */
function rankDisplayRows() {
  const out=[];
  if(G.db && G.board){for(const T of G.board)for(const e of Object.values(T.rank62 || {}))out.push(Object.assign({},e,{uid:T.uid,nick:T.name || '',me:T.uid===G.uid}));}
  else for(const e of Object.values(G.data.rank62 || {}))out.push(Object.assign({},e,{uid:G.uid || 'local',nick:G.data.name || '',me:true}));
  const tab=G.rankTab || 'all',mode=G.rankMode==='hard' ? 'hard' : 'normal';
  return out.filter(e=>BUILDS[e.build]&&(tab==='all'||e.build===tab)&&(e.mode==='hard'?'hard':'normal')===mode&&(!G.rankDeadOnly||e.st==='dead')).sort(rankCmp);
}
function rankBestPlayers(records) {const seen=new Set();return records.filter(e=>{if(seen.has(e.uid))return false;seen.add(e.uid);return true;});}
function vRank() {
  const tab=G.rankTab || 'all',rm=G.rankMode==='hard'?'hard':'normal';
  let h='<section class="card rcpage"><div class="phead">'+backBtn()+'<h3>랭킹</h3></div>';
  h+=rcTabs('rkmode','모드',[{a:'rmode',k:'normal',t:'일반',on:rm==='normal'},{a:'rmode',k:'hard',t:'가혹',on:rm==='hard'}]);
  let body='<p class="mini">'+(tab==='all'?'모든 직업 중':'선택한 직업에서')+' 플레이어마다 가장 높은 기록 한 개만 표시합니다. 깬 챕터 → 도달 층 → 레벨 → 짧은 플레이 시간 순입니다.</p>';
  body+=rcGroup('rkc','직업',['all'].concat(CLASS_KEYS()).map(k=>'<button type="button" class="rcchip" aria-pressed="'+(tab===k)+'" data-a="rtab" data-k="'+k+'">'+(k==='all'?'통합':esc(BUILDS[k].n))+'</button>').join(''));
  body+='<div class="row"><button class="chip'+(!G.rankDeadOnly?' on':'')+'" data-a="rkdead" data-k="all">전체 최고 기록</button><button class="chip'+(G.rankDeadOnly?' on':'')+'" data-a="rkdead" data-k="dead">쓰러진 최고 기록</button></div>';
  if(G.db&&!G.board){if(!G.boardLoading)setTimeout(loadBoard,0);body+='<p role="status">불러오는 중입니다.</p>';}
  else {
    const records=rankDisplayRows(),all=rankBestPlayers(records),rows=all.slice(0,50),mi=all.findIndex(e=>e.me);
    body+=mi>=0?'<p class="rcme">내 최고 순위 <b>'+(mi+1)+'위</b> · '+esc(rcProg(all[mi]))+'</p>':'<p class="mini">이 조건에는 내 기록이 없습니다.</p>';
    body+='<div class="rkwrap"><table class="rkt"><caption class="sr">플레이어별 최고 기록</caption><thead><tr><th>순위</th><th>플레이어·캐릭터</th><th>직업</th><th>도달</th><th>상세</th></tr></thead><tbody>';
    body+=rows.map((e,i)=>{const B=rankClassView(e),other=records.filter(x=>x.uid===e.uid);
      return '<tr class="'+(e.me?'me':'')+'"><th class="c-rank" scope="row" data-l="순위">'+(i+1)+'</th><td class="c-name" data-l="플레이어·캐릭터"><b>'+esc(e.nick || '이름 없는 방랑자')+(e.me?' · 나':'')+'</b><small>'+esc(e.cname || '이름 없음')+'</small></td><td class="c-cls" data-l="직업">'+esc(B.n)+'</td><td class="c-prog" data-l="도달"><b>'+esc(rcProg(e))+'</b><small>'+esc(RANK_ST[e.st] || '기록 없음')+'</small></td><td class="c-time" data-l="상세"><details><summary>상세 · '+other.length+'판</summary><p>대표 기록: Lv '+(e.lv || 1)+' · '+(e.ms>0?fmtMs(e.ms):'시간 미기록')+' · '+esc(rcDate(e.at))+'</p><ol>'+other.map(x=>'<li>'+esc(x.cname || '이름 없음')+' · '+esc(rankClassView(x).n)+' · '+esc(rcProg(x))+' · Lv '+(x.lv || 1)+' · '+esc(RANK_ST[x.st] || '기록 없음')+' · '+(x.ms>0?fmtMs(x.ms):'시간 미기록')+'</li>').join('')+'</ol></details></td></tr>';
    }).join('') || '<tr><td colspan="5">아직 기록이 없습니다.</td></tr>';
    body+='</tbody></table></div><p class="mini">'+all.length+'명의 최고 기록 중 50위까지 표시합니다. 상세에는 현재 조건의 보관된 랭킹 기록이 표시됩니다. 분석용 플레이 로그는 그대로 유지됩니다.</p>';
  }
  h+=rcPanel('rkmode',rm,body)+'</section><details class="card"><summary>내 표시 이름 설정</summary><label for="pname">플레이어 이름</label><div class="row"><input id="pname" maxlength="16" value="'+esc(G.data.name || '')+'"><button class="sm" data-a="namesave">저장</button></div></details>';
  if(G.db)h+='<button class="sm" data-a="boardre">새로 고침</button>';
  return h;
}

function vGoals() {
  const g = goalsData(), md = G.goalMode === 'hard' ? 'hard' : 'normal', cur = g[md === 'hard' ? 'h' : 'n']; let total = 0, done = 0;
  const cards = ALL_CLASS_KEYS().filter(k => TREE2[k]).map(k => {
    if (!unlOpen(k)) return `<li class="rcgcard locked"><h5><span aria-hidden="true">❔</span> ???</h5><p class="mini">잠긴 숨겨진 직업</p></li>`;
    let n = 0, m = 0; const rows = TREE2[k].branches.map(br => { const cs = [1, 2, 3].map(c => { total++; m++; const y = !!cur[goalKey(k, br, c)]; if (y) { done++; n++; } return `<li class="rcpill${y ? ' ok' : ''}">${c}챕터 <span aria-hidden="true">${y ? '✓' : '－'}</span><span class="sr">${y ? ' 깸' : ' 못 깸'}</span></li>`; }).join('');
      return `<li class="rcbr"><span class="rcbn">${esc(br)}</span><ul class="rcpills" aria-label="${esc(br)} 챕터별">${cs}</ul></li>`; }).join('');
    return `<li class="rcgcard"><h5><span aria-hidden="true">${BUILDS[k].ico}</span> ${esc(BUILDS[k].n)} <small>${n}/${m}</small></h5><ul class="rcbrs" aria-label="${esc(BUILDS[k].n)} 갈래">${rows}</ul></li>`; }).join('');
  let h = `<section class="card rcpage"><div class="phead">${backBtn()}<h3>계정 목표</h3></div><p class="mini">직업과 갈래마다 1 · 2 · 3챕터 보스를 넘었는지 모아 봅니다. 보스를 이긴 판에서 트리 칸의 절반 이상을 연 갈래가 그 갈래의 기록으로 적힙니다. 사냥꾼은 기동을 뺀 피해 갈래를 셉니다.</p>`;
  h += `<h4>칭호</h4><p class="mini">조건을 채우면 칭호를 얻습니다. 하나를 골라 두면 랭킹의 이름 옆에 보입니다.</p><ul class="rcgrid" aria-label="칭호"><li><button type="button" class="rctitle" data-a="mtitle" data-k="" aria-pressed="${!G.data.title}"><b>칭호 없음</b></button></li>${TITLES.map(t => titleEarned(t.id) ? `<li><button type="button" class="rctitle" data-a="mtitle" data-k="${t.id}" aria-pressed="${G.data.title === t.id}"><b>${esc(t.n)}</b><small>${esc(t.d)}</small></button></li>` : `<li class="rctitle lock"><b>${esc(t.n)}</b><small>아직 얻지 못했습니다. ${esc(t.d)}</small></li>`).join('')}</ul>`;
  h += `<h4>보스 돌파</h4>` + rcTabs('gl', '모드', [{ a: 'gmode', k: 'normal', t: '일반', on: md === 'normal' }, { a: 'gmode', k: 'hard', t: '가혹', on: md === 'hard' }]);
  h += rcPanel('gl', md, `${rcBar(done, total, (md === 'hard' ? '가혹' : '일반') + ' 모드 보스 돌파')}<ul class="rcgcards" aria-label="${md === 'hard' ? '가혹' : '일반'} 모드 직업별 보스 돌파">${cards}</ul>`);
  return h + '</section>';
}

/* ===== 표식 도전 ===== */
function vMark() {
  let h = `<section class="card rcpage"><div class="phead">${backBtn()}<h3>표식 도전</h3></div>`;
  if (!markOpen()) return h + '<p class="mini">3챕터 보스를 한 번 이기면 열립니다.</p></section>';
  const M = G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; const pts = markPts(M.ids);
  h += `<p class="mini">깬 챕터 하나를 새 캐릭터로 다시 치릅니다. 표식을 걸수록 어렵고, 표식 점수가 기록이 됩니다. 챕터의 보스를 넘으면 끝나고, 쓰러지면 점수가 남지 않습니다. 랭킹에는 오르지 않고 기록 화면에 따로 남습니다.</p>`;
  h += rcGroup('mkc', '챕터', [1, 2, 3].map(c => `<button type="button" class="rcchip" data-a="mkch" data-k="${c}" aria-pressed="${M.ch === c}">${c}챕터${c > 1 ? ' · 레벨 ' + MARK_START[c].lv : ' · 처음부터'}</button>`).join(''));
  h += `<p class="mini">${M.ch > 1 ? `레벨 ${MARK_START[M.ch].lv}에서 시작하고, 스킬 포인트는 레벨만큼, 능력치는 20점에 레벨마다 3점을 더해 직접 나눕니다. 이전 챕터의 평범 · 고급 장비 꾸러미와 약초 묶음을 받습니다.` : '다른 캐릭터와 똑같이 처음부터 만듭니다.'}</p>`;
  h += rcGroup('mkm', '모드', `<button type="button" class="rcchip" data-a="mkmode" data-k="normal" aria-pressed="${M.mode === 'normal'}">일반</button><button type="button" class="rcchip" data-a="mkmode" data-k="hard" aria-pressed="${M.mode === 'hard'}"${G.data.hardOpen ? '' : ' aria-disabled="true"'}>가혹${G.data.hardOpen ? '' : ' (잠김)'}</button>`);
  h += `<h4>표식</h4><ul class="rcgrid" aria-label="표식">${Object.keys(MARKS).map(k => { const m = MARKS[k], on = M.ids.includes(k); return `<li><button type="button" class="rctitle rcmk" data-a="mktog" data-k="${k}" aria-pressed="${on}"><span class="rcpt">${m.pt}점</span><b><span aria-hidden="true">${m.ico}</span> ${esc(m.n)}</b><small>${esc(m.d)}</small></button></li>`; }).join('')}</ul>`;
  h += `<p class="rcme" role="status" aria-live="polite">고른 표식 ${M.ids.length}개 · 표식 점수 <b>${pts}점</b></p>${M.ids.length ? '' : '<p class="mini">표식을 하나 이상 고르세요.</p>'}`;
  return h + `<button class="gold wide" data-a="mkgo"${M.ids.length ? '' : ' aria-disabled="true"'}>다음: 이름과 직업</button></section>`;
}
function vMarkBoard() {
  if (!markOpen()) return '';
  const mb = markBestData(), ks = ALL_CLASS_KEYS().filter(k => TREE2[k] && unlOpen(k));
  const cell = (k, c) => ['n', 'h'].map(m => { const x = mb[k + '|' + c + '|' + m]; return x ? (m === 'h' ? '가혹 ' : '일반 ') + x.score + '점' : ''; }).filter(Boolean).join(' · ') || '기록 없음';
  return `<section class="card"><h3>표식 도전 기록</h3><p class="mini">직업과 챕터마다 가장 높은 표식 점수입니다.</p><ul class="rcgcards" aria-label="표식 도전 최고 점수">${ks.map(k => `<li class="rcgcard"><h4><span aria-hidden="true">${BUILDS[k].ico}</span> ${esc(BUILDS[k].n)}</h4><dl class="rcfacts">${[1, 2, 3].map(c => `<div><dt>${c}챕터</dt><dd>${cell(k, c)}</dd></div>`).join('')}</dl></li>`).join('')}</ul></section>`;
}

/* ===== 도감 (시트 'codex'): 챕터 탭 · 종류 칩 · 발견 진행도 · 카드 격자 · 상세. 문장은 FOE_INTRO · CODEX 그대로 ===== */
function rcFoes(ch) {
  const boss = chData(ch).boss, ids = [boss].concat((typeof STRONG_FOES !== 'undefined' ? STRONG_FOES : []).filter(f => (f.ch || 1) === ch).map(f => f.id)).filter(id => FOE_INTRO[id]);
  return Array.from(new Set(ids)).map(id => ({ id, boss: id === boss }));
}
function vCodex() {
  const full = G.superAdmin === true;
  const S = rcS(), actual = G.data.codex || {}, c = full ? Object.fromEntries(Object.keys(FOE_INTRO).map(id => [id, Object.assign({},actual[id],{seen:Object.fromEntries(Object.keys(CODEX[id] || {}).map(k=>[k,true]))})])) : actual, ch = [1, 2, 3].includes(S.cch) ? S.cch : 1;
  if (S.cdx && FOE_INTRO[S.cdx] && c[S.cdx]) { const id = S.cdx, F = FOE_INTRO[id], X = c[id], E = CODEX[id] || {}, ks = Object.keys(E), seen = ks.filter(k => X.seen && X.seen[k]);
    return `<div class="phead"><button type="button" class="sm back" data-a="rc" data-k="cback:${id}">← 도감 목록</button></div><h4 id="rcdt" tabindex="-1" class="rcdh">${esc(F.n)}</h4><p class="lore">${esc(F.lore)}</p><p class="mini">${full ? '관리자 전체 열람 · 발견 기록에는 반영되지 않습니다' : '처음 만난 날 ' + rcDate(X.met)}</p>${(F.see || []).length ? `<h5>처음 만났을 때</h5>${F.see.map(t => `<p>${esc(t)}</p>`).join('')}` : ''}<h5>겪은 일 <small>${seen.length}/${ks.length}</small></h5>${seen.length ? `<ul class="rcplain">${seen.map(k => `<li>${esc(E[k])}</li>`).join('')}</ul>` : '<p class="mini">아직 겪은 일이 없습니다.</p>'}${ks.length > seen.length ? `<p class="mini">아직 겪지 못한 일 ${ks.length - seen.length}가지</p>` : ''}<label for="cdx-${id}" class="mini"${full ? ' hidden' : ''}>내 메모</label><textarea${full ? ' hidden disabled' : ''} id="cdx-${id}" data-cdx="${id}" rows="3" placeholder="어떻게 상대했는지 적어 두세요">${esc(X.note || '')}</textarea>`; }
  S.cdx = null;
  const kind = S.ckind, all = rcFoes(ch), list = all.filter(f => kind === 'all' || (kind === 'boss') === f.boss);
  const met = f => !!c[f.id], seenN = f => Object.keys(CODEX[f.id] || {}).filter(k => c[f.id] && c[f.id].seen && c[f.id].seen[k]).length, totN = f => Object.keys(CODEX[f.id] || {}).length;
  const chMet = [1, 2, 3].map(x => rcFoes(x).filter(met).length + '/' + rcFoes(x).length);
  let h = `${full ? '<p class="mini">관리자 전체 열람입니다. 아직 만나지 않은 보스와 강적, 모든 도감 설명을 확인합니다. 실제 발견 기록은 바뀌지 않습니다.</p>' : ''}<p class="mini">강적과 보스를 만나 처음 겪은 일만 적힙니다. 쓰러져도 도감은 남습니다. 일반 적은 도감에 적히지 않습니다.</p>`;
  h += rcTabs('cdch', '챕터', [1, 2, 3].map((x, i) => ({ a: 'rc', k: 'cch:' + x, t: x + '챕터', n: chMet[i], on: ch === x })));
  let body = `<p class="mini">${esc((CHAPTERS[ch] || {}).n || '')}</p>${rcBar(all.filter(met).length, all.length, ch + '챕터 만난 강적과 보스')}<p class="mini">${full ? '열람 가능한 보스와 강적' : '만난 보스와 강적'} ${all.filter(met).length}명, ${full ? '도감 설명' : '겪은 일'} ${all.reduce((a, f) => a + seenN(f), 0)}/${all.reduce((a, f) => a + totN(f), 0)}가지</p>`;
  body += rcGroup('cdk', '종류', rcChip('ckind:all', '전체', kind === 'all') + rcChip('ckind:boss', '보스', kind === 'boss') + rcChip('ckind:strong', '강적', kind === 'strong'));
  body += `<ul class="rcgrid cdgrid" aria-label="${ch}챕터 도감">${list.map(f => { const F = FOE_INTRO[f.id];
    if (!met(f)) return `<li class="cdcard lock"><span class="cdsil" aria-hidden="true">?</span><b>???</b><small>아직 만나지 못했습니다</small><span class="sr">${f.boss ? '보스' : '강적'}</span></li>`;
    return `<li><button type="button" class="cdcard" data-a="rc" data-k="cdx:${f.id}"><span class="cdsil on" aria-hidden="true">${f.boss ? ((BOSSES[f.id] || {}).ico || '👑') : '💀'}</span><b>${esc(F.n)}</b><small>${f.boss ? '보스' : '강적'} · 겪은 일 ${seenN(f)}/${totN(f)}</small></button></li>`; }).join('')}</ul>`;
  return h + rcPanel('cdch', 'cch:' + ch, body);
}

/* ===== 조작 ===== */
function rcFocusLater(sel) { setTimeout(() => { const e = document.querySelector(sel); if (e) { try { e.focus({ preventScroll: false }); } catch (x) { e.focus(); } } }, 0); }
function rcClick(ev) {
  const el = ev.target.closest && ev.target.closest('[data-a="rc"]'); if (!el) return;
  const S = rcS(), i = (el.dataset.k || '').indexOf(':'), f = (el.dataset.k || '').slice(0, i), v = (el.dataset.k || '').slice(i + 1);
  switch (f) {
    case 'fcls': S.f.cls = v; S.show = RC_PAGE; break;
    case 'fch': S.f.ch = +v || 0; S.show = RC_PAGE; break;
    case 'fmode': S.f.mode = v; S.show = RC_PAGE; break;
    case 'fres': S.f.res = v; S.show = RC_PAGE; break;
    case 'fsort': S.f.sort = v === 'far' ? 'far' : 'recent'; S.show = RC_PAGE; break;
    case 'freset': S.f = { cls: 'all', ch: 0, mode: 'all', res: 'all', sort: S.f.sort }; S.show = RC_PAGE; break;
    case 'more': S.show += RC_PAGE; break;
    case 'tab': S.tab = v === 'graves' ? 'graves' : 'runs'; break;
    case 'open': S.open = v; S.tab = 'runs'; render(); rcFocusLater('#rcdt'); window.scrollTo(0, 0); return;
    case 'close': S.open = null; render(); rcFocusLater('[data-a="rc"][data-k="open:' + v.replace(/["\\]/g, '\\$&') + '"]'); return;
    case 'cch': S.cch = +v || 1; S.cdx = null; break;
    case 'ckind': S.ckind = v; break;
    case 'cdx': S.cdx = v; render(); rcFocusLater('#rcdt'); return;
    case 'cback': S.cdx = null; render(); rcFocusLater('[data-a="rc"][data-k="cdx:' + v + '"]'); return;
    default: return;
  }
  render();
}
/* 탭 목록의 방향키: 왼쪽 · 오른쪽 · Home · End로 옮기면 그 탭이 바로 열린다 */
function rcKey(ev) {
  const t = ev.target; if (!t || !t.closest || !t.matches('[role="tab"]') || !t.closest('.rctabs')) return;
  const k = ev.key; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const L = Array.from(t.closest('.rctabs').querySelectorAll('[role="tab"]')), i = L.indexOf(t);
  const n = k === 'Home' ? L[0] : k === 'End' ? L[L.length - 1] : L[(i + (k === 'ArrowRight' ? 1 : -1) + L.length) % L.length];
  if (n && n !== t) { ev.preventDefault(); n.focus(); n.click(); }
}
function rcInit() { document.addEventListener('click', rcClick); document.addEventListener('keydown', rcKey); }
try { if (typeof document !== 'undefined' && document.addEventListener) rcInit(); } catch (e) { }

/* 아이템 도감: 실제 장비 풀과 소모품 데이터를 읽고, 캐릭터 상태는 변경하지 않는다. */
const IB_SIZE = 24;
const IB_GEAR_GROUPS = {all:'모든 부위',weapon:'무기',armor:'갑옷',gloves:'장갑',amulet:'목걸이',ring:'반지',flask:'플라스크'};
const IB_CONS_GROUPS = {all:'모든 용도',restore:'회복·해제',battle:'전투',other:'기타·판매'};
function itemBookEntries(type) {
  if (type === 'cons') return Object.keys(CONS).map(id=>({id,type:'cons',D:CONS[id],ch:CONS[id].ch || 1,group:consGroup(CONS[id]),grade:'n'}));
  const chapters = {};
  for (const ch of [1,2,3]) for (const id of CH_POOLS[ch] || []) {
    if (ITEMS[id] && ITEMS[id].kind !== 'start') (chapters[id] || (chapters[id]=[])).push(ch);
  }
  return Object.keys(chapters).map(id=>({id,type:'gear',D:ITEMS[id],ch:chapters[id][0],chapters:chapters[id],group:tplKind(id),grade:ITEMS[id].g || 'n'}));
}
function itemBookRows(S) {
  const q=String(S.q || '').trim().toLocaleLowerCase();
  return itemBookEntries(S.type).filter(x=>
    (S.ch==='all' || x.ch===+S.ch) && (S.group==='all' || x.group===S.group) &&
    (S.grade==='all' || (x.type==='cons' ? S.grade==='n' || S.grade==='m' && x.D.vm!=null : x.grade===S.grade)) &&
    (!q || [x.D.n,x.D.act,x.D.cost,x.D.lore,x.D.sit,x.type==='cons' ? x.D.d(x.D.v) + (x.D.vm!=null ? ' '+x.D.d(x.D.vm) : '') : ''].join(' ').toLocaleLowerCase().includes(q))
  ).sort((a,b)=>a.ch-b.ch || a.D.n.localeCompare(b.D.n,'ko'));
}
function itemBookRange(x,g,ch) {
  const sb=SLOT_BASE[x.group],R=GRADE[g] || GRADE.n,b=sb.v[ch-1];
  const fmt=v=>sb.k==='flask' ? r1(v*100)+'%' : sb.k==='wpn' ? String(r1(v)) : '+'+Math.round(v);
  return sb.lab+' '+fmt(b*(1+R.lo/100))+' ~ '+fmt(b*(1+R.hi/100));
}
function itemBookDetail(x) {
  const D=x.D;
  let h=`<div class="phead"><button type="button" class="sm" data-a="ibback" data-k="${esc(x.id)}">← 목록으로</button></div><h4 id="ibdetail" tabindex="-1">${esc(D.n)}</h4><p class="mini">첫 등장 ${x.ch}챕터 · ${esc(x.type==='gear' ? IB_GEAR_GROUPS[x.group] : IB_CONS_GROUPS[x.group])}</p>`;
  if (x.type==='gear') {
    h+=`<p>${gradeTag(x.grade)} <span class="mini">기본 등장 등급</span></p>${D.act ? `<p><b>효과</b> ${esc(D.act)}</p>` : ''}<p class="${D.cost ? 'cost' : 'mini'}"><b>대가</b> ${esc(D.cost || '없음')}</p>`;
    h+=`<div class="tbl"><table class="st2"><caption>${x.ch}챕터 장비 기본 수치 범위</caption><thead><tr><th scope="col">등급</th><th scope="col">범위</th></tr></thead><tbody>${Object.keys(GRADE).map(g=>`<tr><th scope="row">${esc(GRADE[g].n)}</th><td>${esc(itemBookRange(x,g,x.ch))}</td></tr>`).join('')}</tbody></table></div><p class="mini">등급별 보너스를 적용한 범위입니다. 실제 획득 수치는 범위 안에서 정해집니다. 표에 등급이 있어도 해당 등급으로 바로 등장한다는 뜻은 아닙니다.</p>`;
    if (D.lore) h+=`<p class="lore">${esc(D.lore)}</p>`;
  } else {
    const use={fight:'전투 중',out:'전투 밖',any:'전투 중·밖',none:'사용 불가 · 판매용'};
    h+=`<p class="lore">${esc(D.sit || '')}</p><h5>일반 효과</h5><p>${esc(D.d(D.v))}</p>${D.vm!=null ? `<h5>고급 효과</h5><p>${esc(D.d(D.vm))}</p>` : '<p class="mini">고급 효과가 따로 없는 소모품입니다.</p>'}<dl class="rcfacts"><div><dt>사용</dt><dd>${esc(use[D.use] || D.use)}</dd></div><div><dt>대상</dt><dd>${D.tgt==='enemy' ? '선택한 적 한 명' : '효과 설명 참조'}</dd></div><div><dt>한 칸 최대</dt><dd>${D.max}개</dd></div><div><dt>판매 가격</dt><dd>${consSell({id:x.id,g:'n'})}골드${D.vm!=null ? ' · 고급 '+consSell({id:x.id,g:'m'})+'골드' : ''}</dd></div></dl>`;
    if (D.use==='fight' || D.use==='any') h+=`<p class="mini">전투 중에는 행동 칸을 쓰지 않습니다. 기본 사용 한도는 내 차례마다 ${CONS_TURN}개입니다. 대상·상태·보스 제외 조건은 효과 설명을 따릅니다.</p>`;
  }
  return h;
}
function itemBookResults(S) {
  const rows=itemBookRows(S),pages=Math.max(1,Math.ceil(rows.length/IB_SIZE));
  S.page=Math.max(0,Math.min(pages-1,S.page || 0));
  const page=rows.slice(S.page*IB_SIZE,(S.page+1)*IB_SIZE);
  return `<p class="mini" role="status" aria-live="polite">${rows.length}종 · ${S.page+1}/${pages}페이지</p><div class="ibgrid">${page.map(x=>`<button type="button" class="ibcard" data-a="ibopen" data-k="${esc(x.id)}"><b class="${x.type==='gear' ? 'gr-'+x.grade : ''}">${x.type==='cons' ? `<span aria-hidden="true">${x.D.ico}</span> ` : ''}${esc(x.D.n)}</b><small>${x.ch}챕터 · ${esc(x.type==='gear' ? IB_GEAR_GROUPS[x.group]+' · '+GRADE[x.grade].n : IB_CONS_GROUPS[x.group])}</small><span>${esc(x.type==='gear' ? x.D.act || '기본 수치 장비' : x.D.sit || x.D.d(x.D.v))}</span>${x.type==='gear' && x.D.cost ? `<small class="cost">대가: ${esc(x.D.cost)}</small>` : ''}</button>`).join('')}</div>${rows.length ? `<nav class="ibpages" aria-label="아이템 도감 페이지"><button type="button" class="sm" data-a="ibpage" data-k="-1"${S.page===0?' disabled':''}>이전</button><span>${S.page+1} / ${pages}</span><button type="button" class="sm" data-a="ibpage" data-k="1"${S.page>=pages-1?' disabled':''}>다음</button></nav>` : '<p>조건에 맞는 아이템이 없습니다.</p><button type="button" class="sm" data-a="ibreset">검색·필터 초기화</button>'}`;
}
function vItemBook() {
  const S=G.sheet.data;
  if (S.selected) { const x=itemBookEntries(S.type).find(x=>x.id===S.selected); if(x)return itemBookDetail(x);S.selected=null; }
  const select=(key,label,opts)=>`<label>${label}<select data-ibfilter="${key}">${Object.entries(opts).map(([v,n])=>`<option value="${v}"${S[key]===v?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  return `<p class="mini">장비와 소모품의 현재 효과를 찾아봅니다. 아직 얻지 않은 아이템도 볼 수 있으며, 도감 열람으로 아이템을 얻지는 않습니다.</p><div class="wrap" role="group" aria-label="아이템 종류">${[['gear','장비'],['cons','소모품']].map(([k,n])=>`<button type="button" class="chip${S.type===k?' on':''}" data-a="ibtype" data-k="${k}" aria-pressed="${S.type===k}">${n}</button>`).join('')}</div><label for="ibquery">이름·효과 검색</label><input type="search" id="ibquery" maxlength="80" value="${esc(S.q || '')}" placeholder="흡혈, 생명력, 보스 제외…"><div class="ibfilters">${select('ch','첫 등장 챕터',{all:'모든 챕터',1:'1챕터',2:'2챕터',3:'3챕터'})}${select('group',S.type==='gear'?'부위':'용도',S.type==='gear'?IB_GEAR_GROUPS:IB_CONS_GROUPS)}${select('grade',S.type==='gear'?'기본 등장 등급':'효과 등급',Object.assign({all:'모든 등급'},S.type==='cons'?{n:'일반',m:'고급 있음'}:Object.fromEntries(Object.entries(GRADE).map(([k,v])=>[k,v.n]))))}</div><div id="ibresults">${itemBookResults(S)}</div>`;
}
function itemBookRefresh() {
  if (!G.sheet || G.sheet.kind!=='itembook') return;
  const el=document.getElementById('ibresults');if(el)el.innerHTML=itemBookResults(G.sheet.data);
}
function itemBookInput(el) {
  if (!G.sheet || G.sheet.kind!=='itembook') return;
  G.sheet.data.q=el.value.slice(0,80);G.sheet.data.page=0;itemBookRefresh();
}
function itemBookFilter(el) {
  if (!G.sheet || G.sheet.kind!=='itembook') return;
  const S=G.sheet.data;S[el.dataset.ibfilter]=el.value;S.page=0;itemBookRefresh();
}
function itemBookClick(a,el) {
  if (!G.sheet || G.sheet.kind!=='itembook') return;
  const S=G.sheet.data;
  if (a==='ibopen') S.selected=el.dataset.k;
  if (a==='ibback') S.selected=null;
  if (a==='ibpage') S.page+=(+el.dataset.k || 0);
  if (a==='ibtype') Object.assign(S,{type:el.dataset.k==='cons'?'cons':'gear',group:'all',grade:'all',page:0,selected:null});
  if (a==='ibreset') Object.assign(S,{q:'',ch:'all',group:'all',grade:'all',page:0,selected:null});
  render();
  setTimeout(()=>{const target=a==='ibopen'?document.getElementById('ibdetail'):a==='ibback'?document.querySelector('.ibcard[data-k="'+el.dataset.k+'"]'):a==='ibpage'?document.querySelector('.ibpages [data-k="'+el.dataset.k+'"]'):document.getElementById('ibquery');if(target)target.focus();},0);
}
