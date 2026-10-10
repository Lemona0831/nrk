'use strict';
/* ===== 0.6a.2 스킬 트리 화면 (10월 3일 만든 사람 요청) =====
   원형 칸이 기본 → 중급 → 상급 → 궁극으로 아래로 가지처럼 뻗고, 부모와 선으로 잇는다. 칸에 마우스를 올리면 설명창, 누르면 아래 상세 칸.
   보이는 범위는 treeVis(기본·부모가 열린 칸은 다 보이고, 궁극은 이름만, 나머지는 ?). 휴대폰은 갈래 탭, PC는 세 갈래를 나란히.
   쓰는 곳: 캐릭터 만들기의 스킬 단계(mode 'create'), 따로 보는 페이지 'tree'(메뉴·지도). 전투 중에는 보기만 한다 */
const TIERS2 = ['하급', '중급', '상급']; // 줄 1~6 하급 · 7~10 중급 · 11~13 상급(3챕터부터 열림, 10월 8일 암살자 시범). 궁극(5챕터)은 아직 칸이 없다
/* 이 챕터에서 그리는 등급: 챕터가 된 등급과, 이미 연 칸이 있는 등급(예전 저장본). 열 수 없는 등급은 그리지 않고 아래 한 줄로만 알린다 */
const treeTiersOf = (run, cells) => TIERS2.filter(tier => (run.ch || 1) >= (TREE_CH[tier] || 1) || cells.some(x => x.tier === tier && run.tree.open.includes(x.id)));
const TREE_ROW_H = 82, TREE_TOP = 38;
function treeLayout(build, br, tiers) {
  const all = SKILLS2[build].filter(s => s.b === br && !s.start && (tiers || TIERS2).includes(s.tier)); const pos = {};
  const nums = [...new Set(all.map(s => s.row || 1))].sort((a, b) => a - b);
  const rows = nums.map(n => all.filter(s => (s.row || 1) === n));
  rows.forEach((row, ri) => row.forEach((s, i) => { pos[s.id] = { x: row.length === 1 ? 50 : (i === 0 ? 30 : 70), y: ri }; }));
  return { rows, pos };
}
const treeCanEdit = () => !(G.b && !G.b.over) && !(G.run && !G.creating && runOver(G.run));
function vTreeBranch(run, br) {
  const ch = run.ch || 1; const T = TREE2[run.build] || {};
  const all = SKILLS2[run.build].filter(x => x.b === br && !x.start);
  const tiers = treeTiersOf(run, all); // 챕터가 안 된 등급은 그리지 않는다(예전 저장본에서 이미 연 칸은 그린다)
  const { rows, pos } = treeLayout(run.build, br, tiers); const H = TREE_TOP * 2 + TREE_ROW_H * (rows.length - 1) + 14;
  const yp = r => (TREE_TOP + r * TREE_ROW_H) / H * 100; let lines = '', nodes = '';
  const rowOpen = ri => rows[ri].some(x => run.tree.open.includes(x.id));
  rows.forEach((row, ri) => {
    if (row.length === 2) lines += `<line vector-effect="non-scaling-stroke" class="rung${rowOpen(ri) ? ' lit' : ''}" x1="30" y1="${yp(ri)}" x2="70" y2="${yp(ri)}"/>`; // 한 줄: 두 칸 가운데 하나를 고른다
    if (ri > 0) { const lit = rowOpen(ri - 1) ? ' class="lit"' : ''; const up = rows[ri - 1];
      if (row.length === 2 && up.length === 2) lines += `<line vector-effect="non-scaling-stroke"${lit} x1="30" y1="${yp(ri - 1)}" x2="30" y2="${yp(ri)}"/><line vector-effect="non-scaling-stroke"${lit} x1="70" y1="${yp(ri - 1)}" x2="70" y2="${yp(ri)}"/>`;
      else for (const a of up) for (const c of row) lines += `<line vector-effect="non-scaling-stroke"${lit} x1="${pos[a.id].x}" y1="${yp(ri - 1)}" x2="${pos[c.id].x}" y2="${yp(ri)}"/>`; }
  });
  for (const row of rows) for (const s of row) {
    const p = pos[s.id]; const vis = treeVis(run, s.id); const open = run.tree.open.includes(s.id); const eq = (run.skills || []).includes(s.id); const can = !open && !treeWhy(run, s.id);
    const cls = ['tnode', 't-' + vis, open ? 'open' : '', eq ? 'eq' : '', can ? 'can' : '', G.tsel === s.id ? 'sel' : '', s.tier === '궁극' ? 'ult' : '', row.length >= 4 ? 'r5' : ''].filter(Boolean).join(' ');
    const glyph = vis === 'hidden' ? '?' : eq ? '✓' : open ? '●' : can ? '+' : s.tier === '궁극' ? '★' : '·';
    nodes += `<button class="${cls}" style="left:${p.x}%;top:${TREE_TOP + p.y * TREE_ROW_H}px" data-a="tsel" data-k="${s.id}" data-info="tn:${s.id}" aria-label="${esc(vis === 'hidden' ? '아직 보이지 않는 칸' : s.n + ', ' + s.tier + (open ? ', 열림' : can ? ', 열 수 있음' : '') + (eq ? ', 끼움' : ''))}"><span class="tc">${glyph}${vis !== 'hidden' && skHz(s) ? '<span class="thz" aria-hidden="true">🔄</span>' : ''}</span><small>${vis === 'hidden' ? '' : esc(s.n)}</small></button>`;
  }
  const hs = (T.haste || {})[br];
  const shown = rows.flat(); const op = shown.filter(x => run.tree.open.includes(x.id)).length; const hid = shown.filter(x => treeVis(run, x.id) === 'hidden').length; const nAll = shown.length;
  const head = `<div class="thead2">${hs ? `<p class="thaste"><b>갈래 규칙</b> ${esc(SK_HS[hs])} 이 갈래 스킬 대기 −1</p>` : ''}<p class="tcount">스킬 <b>${nAll}칸</b> · 열림 ${op}${hid ? ` · 숨은 칸 ${hid}` : ''}<span class="tleg"><i>+</i>열 수 있음 <i>?</i>윗줄을 열면 보임 <i>🔄</i>다른 스킬 쿨타임을 당김</span></p><p class="tcount">한 줄에 두 칸: 윗줄에서 하나만 열어도 아랫줄이 열립니다.</p></div>`;
  const tl = rows.map((row, i) => (i === 0 || rows[i - 1][0].tier !== row[0].tier) ? `<span class="ttier" style="top:${TREE_TOP + i * TREE_ROW_H}px"><b>${row[0].tier}</b></span>` : '').join(''); // 등급 이름은 그 등급의 첫 줄에
  // 잠긴 등급: 그림 대신 한 줄 (깊이는 보이게: 칸 수, 궁극은 이름)
  const lockT = TIERS2.filter(tier => !tiers.includes(tier) && all.some(x => x.tier === tier));
  const rowsOf = xs => { const n = xs.map(x => x.row); return Math.min(...n) + '~' + Math.max(...n) + '줄'; };
  const noAdv = !all.some(x => x.tier === '상급');
  const foot = `<div class="tlocked">${lockT.map(tier => { const xs = all.filter(x => x.tier === tier); return `<span>🔒 <b>${TREE_CH[tier]}챕터부터 열립니다</b> ${tier} ${xs.length}칸 (${rowsOf(xs)})</span>`; }).join('')}${noAdv ? `<span>🔒 <b>${(run.ch || 1) < TREE_CH['상급'] ? TREE_CH['상급'] + '챕터부터 열립니다</b> 상급 (준비 중)' : '상급</b> 이 직업은 준비 중'}</span>` : ''}<span>🔒 <b>${TREE_CH['궁극']}챕터부터</b> 궁극 (준비 중)</span></div>`;
  return `<div class="tbranch">${head}<div class="tcwrap"><div class="ttiers" style="height:${H}px" aria-hidden="true" data-info="ttier">${tl}</div><div class="tcanvas" style="height:${H}px"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${nodes}</div></div>${foot}</div>`;
}
function vTreeDetail(run, id, preview) {
  const s = id && SK2[id]; if (!s) return `<p class="mini">칸에 마우스를 올리면 여기에 설명이 나옵니다. 누르면 그 칸을 골라 열거나 끼웁니다.</p>`;
  const vis = treeVis(run, id); const open = s.start || run.tree.open.includes(id); const eq = (run.skills || []).includes(id); const why = open ? null : treeWhy(run, id); const edit = treeCanEdit();
  if (vis === 'hidden') return `<b class="tdn">?</b><p class="mini">아직 보이지 않는 칸입니다. 선으로 이어진 앞 칸을 열면 드러납니다.</p>`;
  let h = `<b class="tdn">${esc(s.n)}</b><div class="mini">${esc(s.start ? '시작 스킬 · 늘 끼움' : s.b + ' · ' + s.tier + (open ? ' · 열림' : '') + (eq ? ' · 끼움' : ''))}</div>`;
  h += vis === 'name' ? `<p class="mini">이 갈래의 궁극입니다. 이어진 앞 칸을 열면 자세히 드러납니다.</p>` : `<p class="tdh">${esc(skHead(s))}</p><p>${esc(skBody(s))}</p>`;
  if (preview) return h + (s.start ? '' : `<p class="mini tdp">눌러서 고르면 ${open ? '끼우거나 뺍니다' : '엽니다'}.</p>`);
  if (s.start) h += `<p class="mini">시작 스킬은 늘 끼워져 있고 장착 칸을 차지하지 않습니다.</p>`;
  else if (open) { const rw = G.creating ? treeRefundWhy(run, id) : 'x'; h += `<div class="tdb">${edit ? `<button class="${eq ? '' : 'gold'}" data-a="tequip" data-k="${id}">${eq ? '빼기' : '끼우기'}</button>` : ''}${G.creating ? `<button data-a="trefund" data-k="${id}"${rw ? ' aria-disabled="true"' : ''}>되돌리기 · 포인트 +1</button>` : ''}${edit ? '' : '<span class="mini">전투 중에는 바꿀 수 없습니다.</span>'}</div>${G.creating ? `<p class="mini">${rw ? esc(rw) : '캐릭터를 만드는 동안에는 연 칸을 되돌려 다른 칸을 열 수 있습니다. 만든 뒤에는 되돌릴 수 없습니다.'}</p>` : ''}`; }
  else if (vis === 'full') h += `<div class="tdb">${edit ? `<button class="${why ? '' : 'gold'}" data-a="tunlock" data-k="${id}"${why ? ' aria-disabled="true"' : ''}>열기 · 포인트 1</button>` : ''}${why ? `<span class="mini">${esc(why)}</span>` : ''}</div>`;
  return h;
}
function vTreeView(mode) {
  const run = G.run, T = TREE2[run.build], t = run.tree, eqd = run.skills || [];
  const brs = T.branches; const tab = brs.includes(G.tbr) ? G.tbr : brs[0];
  const st = T.starters.map(id => `<button class="tstart${G.tsel === id ? ' sel' : ''}" data-a="tsel" data-k="${id}" data-info="tn:${id}"><span class="tc">✓</span>${esc(SK2[id].n)}</button>`).join('');
  const slots = Array.from({ length: EQUIP_SLOTS2 }, (_, i) => eqd[i] ? `<button class="tslot on" data-a="tsel" data-k="${eqd[i]}" data-info="tn:${eqd[i]}">${esc(SK2[eqd[i]].n)}</button>` : `<span class="tslot">빈 칸</span>`).join('');
  let h = `<div class="tsum"><div><span class="mini">시작 스킬 · 늘 끼움</span><div class="trow">${st}</div></div><div><span class="mini">장착 ${eqd.length}/${EQUIP_SLOTS2}</span><div class="trow">${slots}</div></div><div class="tpts">포인트 <b>${t.pts}</b><small>레벨마다 +1 (Lv${run.ch >= 3 ? 15 : 10}에 ${run.ch >= 3 ? 15 : 10}점)</small></div></div>`;
  if (!treeCanEdit()) h += `<p class="mini">${G.run && !G.creating && runOver(G.run) ? '끝난 캐릭터의 트리는 볼 수만 있습니다.' : '전투 중에는 볼 수만 있습니다. 방과 방 사이에 열고 바꿉니다.'}</p>`;
  const menu = `<nav class="tbmenu" aria-label="스킬 트리 갈래">${brs.map(br => { const ns0 = SKILLS2[run.build].filter(x => x.b === br && !x.start); const tiersN = treeTiersOf(run, ns0); const ns = ns0.filter(x => tiersN.includes(x.tier)); const op = ns.filter(x => t.open.includes(x.id)).length; const can = ns.some(x => !t.open.includes(x.id) && !treeWhy(run, x.id)); return `<button class="tseg${tab === br ? ' on' : ''}" data-a="tbr" data-k="${br}" aria-pressed="${tab === br}"><b>${esc(br)}${can ? ' <i class="tcan"><span aria-hidden="true">+</span><span class="sr">열 수 있는 칸 있음</span></i>' : ''}</b><small>${esc(T.bd[br])}</small><span>포인트 ${t.spent[br] || 0} · ${op}/${ns.length}칸</span></button>`; }).join('')}</nav>`;
  return h + `<div class="tlay treev">${menu}<div class="tmain">${vTreeBranch(run, tab)}</div><div class="tside"><div id="tdet" class="tdet">${vTreeDetail(run, G.tsel)}</div></div></div>`;
}
function treeHover(ev) {
  if (!G.run || !G.run.tree || window.innerWidth < 900) return; const box = document.getElementById('tdet'); if (!box || !ev.target.closest) return;
  if (ev.target.closest('.tside')) return;
  const nd = ev.target.closest('.treev [data-a="tsel"], .tsum [data-a="tsel"]'); const id = nd ? nd.dataset.k : (G.tsel || ''); const pv = nd && id !== G.tsel ? '1' : '';
  if (box.dataset.k === id && box.dataset.pv === pv) return;
  box.innerHTML = vTreeDetail(G.run, id, !!pv); box.dataset.k = id; box.dataset.pv = pv;
}
function vTreePage() { return `<section class="card"><div class="phead">${backBtn()}<h3>스킬 트리</h3></div>${G.run && G.run.tree ? vTreeView('page') : '<p class="mini">진행 중인 캐릭터가 없습니다.</p>'}</section>`; }
function sheetParts(S) {
  const run = G.run; let body = '', title = '';
  if (S.kind === 'tutintro' || S.kind === 'tutdone') return tutSheet(S);
  if (S.kind === 'block') {
    title = '막힌 문 앞에서 아이템 하나를 고르세요';
    body = `<p class="mini">${S.data.retry ? '다시 하기 전에 다른 아이템으로 바꿔도 됩니다.' : ''}문 너머에는 정예 방패병과 정예 치유사, 정예 돌격병이 있습니다. 강타와 치유가 한꺼번에 몰려옵니다.</p>`;
    for (const k of Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'block')) body += itemCard(k, `<button class="gold" data-a="pickblock" data-k="${k}">이 아이템 끼우기</button>`);
    body += `<div class="row"><button data-a="pickblock" data-k="">아이템 없이 들어가기</button><button data-a="blockback">아직 들어가지 않기</button></div>`;
  } else if (S.kind === 'drop') {
    const it = run.inv[S.data.uid]; const kind = tplKind(it.tpl); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind;
    title = '장비를 얻었습니다';
    const ew = equipWhy(run, it.uid, sl); const used = bagUsed(run), left = BAG_MAX - used; const hasCur = !!run.eqU[sl];
    body = winSumHtml() + itemDetail(it) + compareHtml(run, it.uid, sl) + (ew ? `<p class="warn">${esc(ew)} 가방에 두었다가 끼던 전설을 빼고 끼세요.</p>` : '') + `<div class="actbar"><button class="gold" data-a="dropequip" data-k="${it.uid}" data-s="${sl}">${hasCur ? '바꿔 끼기' : '지금 끼기'}${kind === 'ring' ? ' (' + EQ_SLOT_N[sl] + ')' : ''}</button><button data-a="dropkeep">가방에 두기</button></div>` + (left <= 1 ? `<p class="warn">${left <= 0 ? '가방이 가득 찼습니다. 다음 장비는 하나를 버려야 받습니다.' : '가방이 한 칸 남았습니다.'}</p>` : '') + `<div class="row dropfoot"><span class="mini">가방 ${used}/${BAG_MAX}. 방과 방 사이에 언제든 바꿀 수 있습니다.</span><button class="sm" data-a="dropdiscard" data-k="${it.uid}">버리기</button></div>`;
    if(!(G.dropQ||[]).length)body += '<button class="wide" data-a="droporganize">가방에 두고 정리하기</button>';
  } else if (S.kind === 'bagfull') {
    const it = S.data.item; title = '가방이 가득 찼습니다'; const nc = (run.cons || []).length;
    body = winSumHtml() + `<p class="lead">새 장비를 받으려면 가방에서 하나를 버립니다. 버린 장비는 사라집니다.${nc ? ` 가방 ${BAG_MAX}칸 중 소모품이 ${nc}칸입니다.` : ''}</p>${itemDetail(it)}${shopCmp(run, it)}<button class="wide" data-a="bfskip">새 장비를 버리기</button><h4 class="bfh">또는 가방에서 하나를 버리고 새 장비를 받기</h4><div class="baglist">${run.bag.map(u => { const x = run.inv[u]; return `<div class="bagline"><div><span class="gr-${x.g}">${inm(x.tpl, x.g)}</span>${gradeTag(x.g)}<br><small class="mini">${EQ_SLOT_N[kindOf(ITEMS[x.tpl].slot) === 'ring' ? 'ring1' : ITEMS[x.tpl].slot].replace(' 1', '')} · ${baseText(x)}</small></div><button class="sm" data-a="bfdrop" data-k="${u}">이것을 버리기</button></div>`; }).join('')}</div>`;
  } else if (S.kind === 'changes') {
    title = '업데이트 내역';
    const mj = CHANGELOG.findIndex(c => c.v === '0.7.0'), cut = mj >= 0 ? mj + 1 : CHANGELOG.length;
    const folded = c => `<details class="chgarchive"><summary><span><b>${esc(c.v)} · ${esc(c.t || '업데이트')}</b><small class="chgd">${esc(c.d || '')}</small></span></summary>${chgEntry(c, false)}</details>`;
    body = `<p class="mini">최근 변경부터 읽습니다. 이전 내역은 제목을 눌러 펼칩니다.</p>` + CHANGELOG.slice(0, cut).map((c, i) => i === 0 ? chgEntry(c, true) : folded(c)).join('') + (cut < CHANGELOG.length ? `<details class="chgdev"><summary>개발 기록과 이전 판</summary>${CHANGELOG.slice(cut).map(folded).join('')}</details>` : '');
  } else if (S.kind === 'bossinfo' && S.data.foe) {
    const F = FOE_INTRO[S.data.foe]; title = F.n + '을(를) 처음 만났습니다';
    body = `<p class="lore">${esc(F.lore)}</p>${F.see.map(t => `<p>${esc(t)}</p>`).join('')}<p class="mini">무엇을 하는지는 직접 겪어 보아야 압니다. 처음 겪은 일은 보스 도감에 적힙니다. 이 창은 한 번만 뜹니다.</p><button class="gold wide" data-a="close" data-focus>싸우러 간다</button>`;
  } else if (S.kind === 'bossinfo') {
    const B = BOSSES[S.data.boss]; title = B.n + '을(를) 처음 만났습니다';
    const tips = S.data.boss === 'mother'
      ? ['어머니는 라운드가 끝날 때마다 내게 중독을 건다. 중독이 10에 닿으면 알이 깨 하수인 둘이 나온다.', '방어하는 동안은 독이 쌓이지 않는다. 생명력 플라스크로 독을 지우면, 지운 만큼 어머니가 다친다.', '체력이 70% 아래로 떨어지면 나락의 거울이 열린다. 내가 방금 쓴 스킬이 절반 위력으로 나에게 되돌아온다. 강한 한 방 뒤에는 대비하자.']
      : ['뒷줄의 뿌리가 살아 있는 한 수호목은 계속 체력을 되찾는다. 원거리나 광역 공격으로 뿌리부터 끊자.', '계절이 바뀔 때마다 약점이 달라진다. 여름에는 불에 약하고, 가을에는 단일 공격 절반이 빗나가는 대신 광역에 약하다. 겨울에는 냉각을 건다.', '보스 카드의 "+N/내 차례"는 뿌리 때문에 회복하는 양이다.'];
    body = `<p class="lore">${esc(B.lore || '')}</p>${tips.map(t => `<p>${esc(t)}</p>`).join('')}<p class="mini">오래 끌면 광폭해지고, 10T마다 더 거세집니다. 이 안내는 보스마다 한 번만 뜹니다. 보스 카드 위의 규칙 줄에서 언제든 다시 볼 수 있습니다.</p><button class="gold wide" data-a="close" data-focus>싸우러 간다</button>`;
  } else if (S.kind === 'admin') {
    title = '관리자';
    body = `<p class="mini">결과 보기와 지인 기록 넣기는 Supabase 설정 때 정한 관리자 암호로 엽니다. 이 기기에만 기억됩니다.</p><label for="adminpass">관리자 암호</label><input id="adminpass" type="password" autocomplete="current-password">${S.data.msg ? `<p class="no" role="status">${esc(S.data.msg)}</p>` : ''}<button class="gold" data-a="admingo">확인</button>`;
  } else if (S.kind === 'code') {
    title = '기록 보내기 코드';
    if (!S.data.code) { if (!S.data.busy) { S.data.busy = 1; makeCode().then(c => { S.data.code = c; render(); }).catch(() => { S.data.code = '코드를 만들지 못했습니다'; render(); }); } body = '<p>만드는 중입니다.</p>'; }
    else body = `<p class="mini">아래 글자를 모두 복사해 만든 사람에게 메신저로 보내 주세요. 이 브라우저에 남은 판 ${G.data.runs.length}개와 설문 답이 들어 있습니다. 이름이나 개인정보는 들어 있지 않습니다${G.data.name ? '(기록판 이름 "' + esc(G.data.name) + '"만 들어 있습니다)' : ''}.</p><label for="codebox" class="sr">기록 보내기 코드</label><textarea id="codebox" rows="6" readonly>${esc(S.data.code)}</textarea>${S.data.auto ? '<p class="no">저장소에 연결되지 않아, 방금 판의 기록이 자동으로 모이지 않았습니다. 이 코드를 보내 주면 기록이 전달됩니다.</p>' : ''}<div class="row">${navigator.share ? '<button class="gold" data-a="codeshare" data-focus>메신저로 보내기</button><button data-a="codecopy">복사하기</button>' : '<button class="gold" data-a="codecopy" data-focus>복사하기</button>'}<span class="mini">${S.data.code.length.toLocaleString()}자</span></div>`;
  } else if (S.kind === 'import') {
    title = '지인 기록 넣기';
    body = `<p class="mini">지인이 메신저로 보낸 "기록 보내기 코드"를 붙여 넣으세요. 결과 보기에 그 사람의 기록으로 들어갑니다. 같은 코드를 두 번 넣어도 한 번만 들어갑니다.</p><label for="impbox" class="sr">기록 보내기 코드</label><textarea id="impbox" rows="6" placeholder="NRK1:로 시작하는 글자"></textarea>${S.data.msg ? `<p class="${S.data.ok ? 'mini' : 'no'}" role="status">${esc(S.data.msg)}</p>` : ''}<button class="gold" data-a="impgo">넣기</button>`;
  } else if (S.kind === 'skills' && G.run && isV2(G.run.p)) {
    title = '스킬 트리';
    body = vTreeView('create') + `<div class="stickbar"><button class="gold wide" data-a="skillok" data-focus>${G.run.tree.pts ? '다음: 능력치 나누기 (포인트는 나중에 써도 됩니다)' : '다음: 능력치 나누기'}</button>${S.data.first ? '<div class="row"><button data-a="cback" data-k="cls">이전: 직업 고르기</button><button data-a="createcancel">그만두기</button></div>' : ''}</div>`;
  } else if (S.kind === 'skills') {
    const run = G.run, p = run.p; const SKM = skillMap(p.build); const pick = S.data.pick;
    title = S.data.first ? '스킬 세 칸을 고르세요' : '스킬 바꾸기';
    body = `<p class="mini">공용 스킬은 어느 직업이든 끼울 수 있고, 위의 ${exclOf(p.build).length}개는 ${esc(BUILDS[p.build].n)}만 쓰는 전용 스킬입니다. 들고 가는 스킬은 모두 합쳐 세 칸이고, 한 번 정하면 이 캐릭터가 끝날 때까지 바꿀 수 없습니다. 직업 규칙: ${esc(BUILDS[p.build].rule)}</p><p><b>${pick.length}/${SKILL_SLOTS}칸</b></p><div class="skpool">`;
    const order = Object.keys(SKM).sort((x, y) => (SKM[y].excl ? 1 : 0) - (SKM[x].excl ? 1 : 0));
    let shownHead = false;
    for (const id of order) {
      const s = SKM[id]; const on = pick.includes(id); const full = !on && pick.length >= SKILL_SLOTS;
      if (s.excl && !shownHead) { body += `<div class="skhead">${esc(BUILDS[p.build].n)} 전용</div>`; shownHead = true; }
      if (!s.excl && shownHead !== 'common') { body += `<div class="skhead">공용</div>`; shownHead = 'common'; }
      const kind = s.type === 'front' ? '전열 전체' : s.aoe ? '광역' : s.ranged ? '원거리' : s.melee ? '근접' : s.self ? '나에게' : '';
      body += `<button class="skc${on ? ' on' : ''}" data-a="skilltog" data-k="${id}" aria-pressed="${on}" ${full ? 'aria-disabled="true"' : ''}><b>${esc(s.n)}</b><small>${esc(resLabel(s))}${kind ? ' · ' + kind : ''}</small><span>${esc(s.d)}</span>${on ? '<em>끼움</em>' : ''}</button>`;
    }
    const dmgIds = ['viper', 'flame', 'scarcut', 'reverse', 'crush', 'aimshot', 'fireball', 'lava', 'drain'].concat(exclOf(p.build).filter(s => s.dmg > 0 || (s.fx && s.fx.scarAll)).map(s => s.id)); const noDmg = pick.length && !pick.some(id => dmgIds.includes(id));
    body += `</div>${noDmg ? '<p class="warn">지금 고른 스킬에는 적을 직접 때리는 스킬이 없습니다. 피해 대부분을 기본 공격에 기대야 합니다. 그래도 괜찮으면 그대로 시작하세요.</p>' : ''}<div class="stickbar"><button class="gold wide" data-a="skillok" ${pick.length ? '' : 'disabled'} data-focus>${pick.length ? (S.data.first ? '다음: 능력치 나누기 (' + pick.length + '/' + SKILL_SLOTS + '칸)' : '이대로 바꾸기') : '스킬을 하나 이상 골라 주세요'}</button>${S.data.first ? '<div class="row"><button data-a="cback" data-k="cls">이전: 직업 고르기</button><button data-a="createcancel">그만두기</button></div>' : ''}</div>${S.data.first ? '' : '<button class="wide" data-a="close">바꾸지 않기</button>'}`;
  } else if (S.kind === 'stats') {
    const run = G.run, p = run.p; const al = S.data.alloc || (S.data.alloc = { str: 0, dex: 0, int: 0, con: 0, wil: 0 }); for (const k of STAT_KEYS) al[k] = al[k] || 0;
    const left = S.data.pts - statSum(al);
    const tmp = Object.assign({}, p, { stat: Object.fromEntries(STAT_KEYS.map(k => [k, stat(p, k) + al[k]])) });
    title = S.data.first ? '능력치 ' + S.data.pts + '점을 나누세요' : (S.data.why || '능력치 ' + S.data.pts + '점');
    body = `<p class="mini">${S.data.first ? S.data.pts + '점을 힘, 민첩, 지능, 체력, 의지에 나눕니다. 1점마다 규칙이 하나씩 바뀝니다. 정답은 없습니다. 어렵다면 "추천 배분"을 누르세요.' : S.data.respec ? '지금까지 나눈 점수를 모두 거두었습니다. 처음부터 다시 나눕니다.' : '지금 빌드에 무엇이 모자랐는지 떠올려 보세요.'}</p><p><b>남은 점수 ${left}</b></p>`;
    body += `<div class="row"><button class="sm" data-a="statrec" ${left ? '' : 'disabled'}>추천 배분</button><button class="sm" data-a="statclear" ${statSum(al) ? '' : 'disabled'}>다시 나누기</button></div>`;
    for (const k of STAT_KEYS) body += `<div class="statrow"><div class="sname"><b>${STATN[k]} ${stat(tmp, k)}</b>${al[k] ? ` <span class="mini">(+${al[k]})</span>` : ''}</div><div class="snext mini">다음 1점: ${esc(statNext(tmp, k))}</div><div class="sbtn"><button class="sm" data-a="stat-" data-k="${k}" ${al[k] ? '' : 'disabled'} aria-label="${STATN[k]} 1점 빼기">−</button><button class="sm gold" data-a="stat+" data-k="${k}" ${left ? '' : 'disabled'} aria-label="${STATN[k]} 1점 더하기">+</button></div></div>`;
    body += `<div class="stickbar"><button class="gold wide" data-a="statok" ${left ? 'disabled' : ''} data-focus>${left ? '점수를 모두 나눠 주세요 (남은 ' + left + '점)' : S.data.first ? '이 캐릭터로 시작하기' : '이대로 정하기'}</button>${S.data.first ? '<div class="row"><button data-a="createback">이전: 스킬 고르기</button><button data-a="createcancel">그만두기</button></div>' : ''}</div>`;
  } else if (S.kind === 'cons') {
    const run = G.run, b = G.b && !G.b.over ? G.b : null; const L = run.cons || [];
    title = '소모품';
    body = `<p class="mini">${b ? '차례 칸을 쓰지 않습니다. 이번 차례 ' + (b.consN || 0) + '/' + consTurnOf(run.p) + '개. 적을 고르는 소모품은 지금 고른 적(없으면 알맞은 적)에게 씁니다.' : '전투 밖에서는 회복과 해제를 씁니다.'} 가방 ${bagUsed(run)}/${BAG_MAX}.</p>`;
    if (!L.length) body += '<p class="mini">소모품이 없습니다. 쓰러뜨린 적이 떨구거나 상점에서 삽니다.</p>';
    const filter=S.data.filter||'all',only=!!S.data.only,query=S.data.query||'';
    body += `<div class="invtools" role="group" aria-label="소모품 분류">${[['all','전체'],['restore','회복·해제'],['battle','전투'],['other','탐색·판매']].map(([k,n])=>`<button class="sm" data-a="consfilter" data-k="${k}" aria-pressed="${filter===k}">${n}</button>`).join('')}<button class="sm" data-a="consonly" aria-pressed="${only}">지금 사용 가능</button><button class="sm" data-a="equip">장비 보기</button></div><div class="invsearch"><label for="consquery">이름·효과 찾기</label><input id="consquery" type="search" value="${esc(query)}" maxlength="60"><button class="sm" data-a="conssearch">찾기</button></div>`;
    if(b)body+=`<div class="invtools" role="group" aria-label="소모품 대상">${alive(b).filter(e=>e.role!=='root').map(e=>`<button class="sm" data-a="constarget" data-k="${e.id}" aria-pressed="${G.sel===e.id}">${esc(e.n)}</button>`).join('')}</div>`;
    const rows=consRows(run,b,filter,only,query,G.sel);
    if(L.length&&!rows.length)body+='<p class="mini">조건에 맞는 소모품이 없습니다. 전체 분류를 선택하거나 검색어·사용 가능 필터를 해제하세요.</p>';
    body += '<div class="baglist">' + rows.map(({c,i,D,why}) => { const target=b&&D.tgt==='enemy'&&consTarget(b,D,G.sel);return `<div class="bagline"><div><b>${D.ico} ${esc(consName(c))} ×${c.n}</b><br><small class="mini">${esc(D.sit)} · ${esc(D.d(consVal(c)))}</small>${target?`<p class="mini">사용 대상: ${esc(target.n)}</p>`:''}${why?`<p class="mini">${esc(why)}</p>`:''}</div><div class="bagactions">${D.use === 'none' ? '' : `<button class="sm${why ? '' : ' gold'}" data-a="consuse" data-k="${i}" aria-label="${esc(consName(c)+(target?' · '+target.n:'')+' 쓰기')}"${why ? ' disabled' : ''}>쓰기</button>`}<button class="sm" data-a="consdiscard" data-k="${i}"${b?' disabled':''} aria-label="${esc(consName(c))} ${c.n}개 모두 버리기">버리기</button></div></div>`; }).join('') + '</div>';
    body += `<div class="stickbar"><button class="wide" data-a="close">닫기</button></div>`;
  } else if (S.kind === 'choice') {
    title = S.data.chest ? '상자를 열었습니다' : '둘 중 하나만 가져갑니다';
    body = winSumHtml() + `<p class="lead">하나만 가져갑니다. 고르지 않은 쪽은 이 방에 남습니다. 고른 뒤 바로 끼울지 정합니다.</p>`;
    for (const k of S.data.offer) body += itemCard(k, curLine(run, k) + `<button class="gold" data-a="choose" data-k="${k}">이것을 가진다</button>`);
    body += `<button data-a="choose" data-k="">둘 다 두고 간다</button>`;
  } else if (S.kind === 'awk') {
    title = '각인을 얻을 때입니다'; const offer = run.awkOffer || [];
    body = `<p class="mini">셋 가운데 하나를 고릅니다. 던전이 끝나면 소멸되고 대가는 없습니다. 같은 각인은 한 번만 얻습니다. 지금까지 ${(run.awk || []).length}개를 얻었습니다.</p><div class="awklist">${offer.map(id => awkCard(id, `<button class="gold" data-a="awkpick" data-k="${id}">이것을 새긴다</button>`)).join('')}</div>`;
  } else if (S.kind === 'awkview') {
    title = '얻은 각인'; const own = run && run.awk || [];
    body = `<p class="mini">던전이 끝나면 소멸되는 작은 힘입니다. 정산을 확정한 뒤와 2챕터부터의 야영지에서 하나씩 얻습니다. 대가는 없습니다.</p><div class="awklist">${own.length ? own.map(id => awkCard(id)).join('') : '<p class="mini">아직 얻은 각인이 없습니다.</p>'}</div>`;
  } else if (S.kind === 'fateres') {
    const r = S.data; title = r.ok ? '저울이 기웁니다' : '저울이 기울지 않았습니다';
    body = `<p class="mini">올린 장비</p><div class="idet"><b class="gr-${r.from.g}">${inm(r.from.tpl, r.from.g)}</b></div>${r.ok ? `<p>한 단계 위 장비로 바뀌었습니다. 가방에 넣었습니다.</p>${itemDetail(r.to)}` : '<p>올린 장비는 사라졌습니다.</p>'}<button class="gold wide" data-a="close" data-focus>확인</button>`;
  } else if (S.kind === 'offer') {
    title = '바칠 장비를 고르세요';
    body = `<p class="mini">고른 장비는 사라지고, 한 등급 위의 장비 하나를 받습니다(희귀는 다시 희귀, 영웅 · 전설은 영웅).</p><div class="baglist">${run.bag.map(u => { const x = run.inv[u]; return `<div class="bagline"><div><span class="gr-${x.g}">${inm(x.tpl, x.g)}</span><br><small class="mini">${(GRADE[x.g] || GRADE.n).n} · ${baseText(x)}</small></div><button class="sm" data-a="offerpick" data-k="${u}">바친다</button></div>`; }).join('')}</div>`;
  } else if (S.kind === 'codex') {
    title = '보스 도감'; body = vCodex(); /* 78-records-ui.js */
  } else if (S.kind === 'toasts') {
    const L = (G.toastLog || []).slice().reverse(); const hm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    title = '지난 알림'; body = `<p class="mini">이번 접속에서 뜬 알림 가운데 최근 ${L.length}개입니다. 위가 가장 최근입니다.</p><ul class="tlog">${L.map(x => `<li><span class="mini">${hm(x.at)}</span> ${esc(x.m)}</li>`).join('')}</ul>`;
  } else if (S.kind === 'settings') {
    title = '설정'; body = vSettings();
  } else if (S.kind === 'help') {
    title = S.data.first ? '방금 적이 무너졌습니다' : '도움말'; body = (S.data.first ? '<p class="mini">처음 보는 규칙이라 잠깐 설명합니다. 이 창은 한 번만 뜹니다.</p>' : '') + vHelpBody(S.data.k);
  } else if (S.kind === 'equip') {
    title = '장비'; body = vEquip();
  }
  return [title, body];
}

