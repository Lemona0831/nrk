'use strict';
/* ===== 0.8.0 두 트리 화면 (10월 16일 0.8.0 2단계: 목록형. 10월 17일 3단계: 방사형 그림은 js/73-tree-radial.js, 목록형은 "목록으로 보기"로 남긴다) =====
   패시브: 방향 탭 6개, 고리 · 반지름 순서로 노드 줄. 액티브: 갈래 탭 3개, 스킬 · 강화 노드 줄과 장착 6칸(시작 2 + 4).
   쓰는 곳: 트리 페이지('tree'), 캐릭터 만들기와 옛 세이브 옮기기의 배분 흐름(sheet 'alloc'), 큰 각인 고르기(sheet 'ks'). 전투 중에는 보기만 한다 */
const treeCanEdit = () => !(G.b && !G.b.over) && !(G.run && !G.creating && runOver(G.run));
function treeHover() { } // 옛 트리 화면의 설명 미리보기 자리(부팅이 붙인다). 목록형 화면은 설명이 줄 안에 있다
const PT_LANE_O = { LL: -1, L: 0, C: 1, R: 2, RR: 3 };
const ptNodeSort = T => (a, b) => (T.nodes[a].ring - T.nodes[b].ring) || (T.nodes[a].pos.r - T.nodes[b].pos.r) || (PT_LANE_O[T.nodes[a].pos.lane] - PT_LANE_O[T.nodes[b].pos.lane]);
const PT_STATE_N = { own: '찍음', free: '보너스 노드', ks: '얻은 큰 각인', can: '찍을 수 있음', lock: '잠김' };
function ptStateOf(run, id) { const t = run.ptree; return t.own.includes(id) ? 'own' : t.free.includes(id) ? 'free' : t.ks.includes(id) ? 'ks' : ptWhy(run, id) ? 'lock' : 'can'; }
function vStatTotals(run) {
  const src = ptStatSrc(run), sm = ptSmall(run); const tot = ptStats(run);
  const row = k => { const parts = [['시작', src.start[k]], ['노드', src.own[k]], ['보너스', src.free[k]]].filter(x => x[1]).map(x => x[0] + ' ' + x[1]); return `<div><dt>${esc(STATN[k])}</dt><dd><b>${tot[k] || 0}</b>${parts.length ? ' <small class="mini">(' + parts.join(' + ') + ')</small>' : ''}</dd></div>`; };
  return `<dl class="stat-read" aria-label="능력치 합계">${STAT_KEYS.map(row).join('')}</dl><p class="mini">작은 노드 효과: 주는 붕괴 +${Math.round((Math.pow(1 + PT.smallBrk, sm.brk) - 1) * 100)}% · 스태미나 +${sm.st * PT.smallSt}</p>`;
}
function vPTreeList(run) {
  const T = ptBuild(run.build), t = run.ptree, d = PT.dirs.includes(G.ptd) ? G.ptd : PT.dirs[0], edit = treeCanEdit(), refund = allocStep(run) === 'p'; const tilt = PT_TILT[run.build] || {};
  const tabs = PT.dirs.map(x => { const ids = Object.keys(T.nodes).filter(id => T.nodes[id].dir === x); const op = ids.filter(id => !['lock', 'can'].includes(ptStateOf(run, id))).length; const can = ids.some(id => ptStateOf(run, id) === 'can'); return `<button class="tseg${d === x ? ' on' : ''}" data-a="pdir" data-k="${x}" aria-pressed="${d === x}"><b>${esc(PT.dir[x].n)}</b> <small>${tilt[x] === 'A' ? '가까움' : tilt[x] === 'C' ? '멂' : '보통'} · ${op}${can ? ' · +' : ''}</small></button>`; }).join('');
  const ids = Object.keys(T.nodes).filter(id => T.nodes[id].dir === d).sort(ptNodeSort(T)); let lastRing = 0, rows = '';
  for (const id of ids) {
    const n = T.nodes[id], stt = ptStateOf(run, id), why = stt === 'lock' ? ptWhy(run, id) : null;
    if (n.ring !== lastRing) { lastRing = n.ring; rows += `<h5 class="ptring">${n.ring}고리${ringOpen(run, n.ring) ? '' : ' 🔒 ' + esc(RING_WHY[n.ring] || '')}</h5>`; }
    const kindN = n.kind === 'keystone' ? '큰 각인 자리' : n.kind === 'notable' ? '중간 노드' + (n.pool === 'common' ? ' · 공용' : ' · 직업') : '작은 노드';
    const btn = stt === 'can' && edit ? `<button class="sm gold" data-a="ptbuy" data-k="${id}">찍기 · 포인트 ${n.cost}</button>` : stt === 'own' && refund ? `<button class="sm" data-a="ptref" data-k="${id}">되돌리기</button>` : '';
    rows += `<div class="ptnode pt-${stt} pk-${n.kind}"><div><b>${n.kind === 'keystone' ? '◆ ' : n.kind === 'notable' ? '● ' : '○ '}${esc(n.n)}</b> <small class="mini">${esc(id)} · ${kindN} · ${PT_STATE_N[stt]}</small>${n.kind !== 'small' ? `<p class="mini">${esc(n.d || '')}${n.pay ? ` <span class="no">대가: ${esc(n.pay)}</span>` : ''}</p>` : ''}${why && n.kind !== 'keystone' && !/고리/.test(why) && why !== '포인트가 없습니다' ? `<p class="mini">${esc(why)}</p>` : ''}</div>${btn}</div>`;
  }
  const ks = t.ks.map(id => T.nodes[id].n);
  return `<div class="tsum"><div class="tpts">패시브 포인트 <b>${t.pts}</b><small>시작 ${PT.pts.start} + 레벨마다 ${PT.pts.lv}${t.bonus ? ' + 보너스 ' + t.bonus : ''}</small></div><div>${vStatTotals(run)}</div><div><span class="mini">큰 각인 ${t.ks.length}/${PT.ksN}${ks.length ? ': ' + ks.map(esc).join(', ') : ''}${run.ksPending > 0 ? ' · 고를 것 ' + run.ksPending + '번' : ''}</span></div></div>${T.tmp ? '<p class="mini">이 직업의 패시브 트리는 임시 배치입니다(공용 노드를 기울기대로 채움). 직업 노드는 다음 단계에서 들어옵니다.</p>' : ''}<nav class="tbmenu ptmenu" aria-label="패시브 방향">${tabs}</nav><div class="ptlist">${rows}</div>`;
}
function vATreeList(run) {
  const A = atBuild(run.build), a = run.atree, brs = A.br, br = brs.includes(G.abr) ? G.abr : brs[0], edit = treeCanEdit(), refund = allocStep(run) === 'a'; const T2 = TREE2[run.build]; const eqd = run.skills || [];
  const st = T2.starters.map(id => `<span class="tslot on">${esc(SK2[id].n)} <small>유산 ${skCost(skOf(run.p, id))}</small></span>`).join('');
  const slots = Array.from({ length: EQUIP_SLOTS2 }, (_, i) => eqd[i] && SK2[eqd[i]] ? `<button class="tslot on" data-a="ateq" data-k="${eqd[i]}" aria-label="${esc(SK2[eqd[i]].n)} 빼기">${esc(SK2[eqd[i]].n)} ✕</button>` : `<span class="tslot">빈 칸</span>`).join('');
  const tabs = brs.map(x => { const ids = Object.keys(A.nodes).filter(id => A.nodes[id].br === x); const op = ids.filter(id => a.own.includes(id)).length; const can = ids.some(id => !a.own.includes(id) && !atWhy(run, id)); return `<button class="tseg${br === x ? ' on' : ''}" data-a="abr" data-k="${esc(x)}" aria-pressed="${br === x}"><b>${esc(x)}</b> <small>${op}${can ? ' · +' : ''}</small></button>`; }).join('');
  const ids = Object.keys(A.nodes).filter(id => A.nodes[id].br === br).sort(ptNodeSort(A)); let lastRing = 0, rows = '';
  for (const id of ids) {
    const n = A.nodes[id], own = a.own.includes(id), why = own ? null : atWhy(run, id), eq = eqd.includes(id);
    if (n.ring !== lastRing) { lastRing = n.ring; rows += `<h5 class="ptring">${n.ring}고리${ringOpen(run, n.ring) ? '' : ' 🔒 ' + esc(RING_WHY[n.ring] || '')}</h5>`; }
    let body; if (n.kind === 'skill') { const s = skOf(run.p, id); body = `<b>⚔ ${esc(n.n)}</b> <small class="mini">스킬 · 유산 ${skCost(s)}${own ? ' · 열림' : ''}${eq ? ' · 장착' : ''}</small><p class="mini">${esc(skHead(s))} ${esc(skBody(s))}</p>`; }
    else body = `<b>✚ ${esc(n.n)}</b> <small class="mini">강화 · ${esc((SK2[n.on] || {}).n || n.on)}${own ? ' · 열림' + (run.p && (run.p.aup || []).includes(id) ? ' · 일함' : ' · 그 스킬을 끼우면 일함') : ''}</small><p class="mini">${esc(n.d)}</p>`;
    const btn = (!own && !why && edit ? `<button class="sm gold" data-a="atbuy" data-k="${id}">열기 · 포인트 ${n.cost}</button>` : '') + (own && n.kind === 'skill' && edit ? `<button class="sm${eq ? '' : ' gold'}" data-a="ateq" data-k="${id}">${eq ? '빼기' : '장착'}</button>` : '') + (own && refund ? `<button class="sm" data-a="atref" data-k="${id}">되돌리기</button>` : '');
    rows += `<div class="ptnode pt-${own ? 'own' : why ? 'lock' : 'can'} pk-${n.kind}"><div>${body}${why && !/고리/.test(why) && why !== '포인트가 없습니다' ? `<p class="mini">${esc(why)}</p>` : ''}</div><div class="row">${btn}</div></div>`;
  }
  return `<div class="tsum"><div class="tpts">액티브 포인트 <b>${a.pts}</b><small>시작 ${AT_PTS.start} + 레벨마다 ${AT_PTS.lv}</small></div><div><span class="mini">시작 스킬 · 항상 장착</span><div class="trow">${st}</div></div><div><span class="mini">장착 ${eqd.length}/${EQUIP_SLOTS2}</span><div class="trow">${slots}</div>${hunterLoadoutHint(run)}</div></div>${A.tmp ? '<p class="mini">이 직업의 액티브 트리는 임시 배치입니다(지금 스킬 칸을 갈래 · 줄 순서로 이음, 강화 노드 없음).</p>' : ''}<nav class="tbmenu ptmenu" aria-label="액티브 갈래">${tabs}</nav><div class="ptlist">${rows}</div>`;
}
// 사냥꾼의 연계는 장착한 갈래 스킬끼리만 만듭니다.
function hunterLoadoutHint(run) {
  if (run.build !== 'hunter') return '';
  return `<p class="mini loadout-hint" data-info="elink" tabindex="0">연계: 다른 갈래 스킬을 이어 쓰면 피해 +${Math.round(HUNT.link * 100)}%.</p>`;
}
function vTreeView() {
  const run = G.run; if (!run.ptree) treeSync(run); const v = G.tview === 'a' ? 'a' : 'p';
  let h = `<div class="invtools" role="group" aria-label="트리 고르기"><button class="sm" data-a="tview" data-k="p" aria-pressed="${v === 'p'}">패시브 · ${run.ptree.pts}점</button><button class="sm" data-a="tview" data-k="a" aria-pressed="${v === 'a'}">액티브 · ${run.atree.pts}점</button>${trdListBtn()}</div>`;
  if (!treeCanEdit()) h += `<p class="mini">${G.run && !G.creating && runOver(G.run) ? '끝난 캐릭터의 트리는 볼 수만 있습니다.' : '전투 중에는 볼 수만 있습니다. 방과 방 사이에 찍고 바꿉니다.'}</p>`;
  return h + (v === 'a' ? vATreeAny(run) : vPTreeAny(run));
}
function vTreePage() { return `<section class="card"><div class="phead">${backBtn()}<h3>트리</h3></div>${G.run && G.run.ptree ? vTreeView() : '<p class="mini">진행 중인 캐릭터가 없습니다.</p>'}</section>`; }
/* 큰 각인 카드: 효과 · 대가 · 보너스 노드 칸 수와 함께 열리는 중간 노드 */
function ksCard(run, id, btn) {
  const T = ptBuild(run.build), n = T.nodes[id], c = ksInfo(run, id) || { d: 0, path: [] }; const open = ptOpenIds(run); const fr = c.path.filter(x => !open.includes(x)); const nn = fr.filter(x => T.nodes[x].kind === 'notable').map(x => T.nodes[x].n);
  return `<div class="awkc"><div class="awkh"><b>◆ ${esc(n.n)}</b><span class="chip">${esc(PT.dir[n.dir].n)} · ${n.ring}고리</span></div><p>${esc(n.d)}</p>${n.pay ? `<p class="no">대가: ${esc(n.pay)}</p>` : ''}<p class="mini">보너스 노드 ${fr.length}칸${nn.length ? ' · 함께 열리는 중간 노드: ' + nn.map(esc).join(', ') : ''} (찍은 곳에서 ${c.d}칸)</p>${btn || ''}</div>`;
}
function vKsPick(run) {
  const offer = ksEnsureOffer(run), list = trdListOn() || !offer.length; // 10월 17일 3단계: 후보 셋을 트리 그림 위에도 보인다(카드 · 그림 어느 쪽에서도 고른다)
  return `<div class="row trd-bar"><p class="mini">찍은 곳 가까이의 큰 각인 셋 가운데 하나를 고릅니다. 고르면 거기까지의 길이 포인트 없이 열립니다. 남은 고를 것 ${run.ksPending}번.</p>${trdListBtn()}</div>${list ? '' : trdView(run, 'k', { offer })}<div class="awklist">${offer.map((id, i) => ksCard(run, id, `<div class="row"><button class="gold" data-a="kspick" data-k="${id}">이것을 고른다</button>${list ? '' : `<button class="sm" data-a="tsel" data-k="${id}" data-e="k">그림에서 보기 · 후보 ${i + 1}</button>`}</div>`)).join('') || '<p class="mini">닿는 큰 각인 자리가 없습니다.</p>'}</div>`;
}
/* ---- 배분 흐름 (캐릭터 만들기 · 옛 세이브 옮기기, 9-3절 + 10-4 단계 잠금) ----
   단계: i 안내(옮기기만) → p 패시브 → k 큰 각인(받을 것이 있으면) → a 액티브 · 장착 → 확정. 다음 단계로 넘어가면 앞 단계는 되돌릴 수 없다. 닫기 버튼이 없다 */
function allocBegin(run, mode) { run.alloc = { mode, step: mode === 'mig' ? 'i' : 'p' }; G.sheet = null; openSheet('alloc', { first: mode === 'create' ? 1 : 0 }); }
function migBegin(cur) {
  treeMigrate08(cur); G.run = cur; consFix(cur); ptInit(cur); ptSync(cur); applyGear(cur); G.b = null; G.sel = null; G.scr = cur.phase === 'clearsv' ? 'survey' : cur.phase || 'run';
  allocBegin(cur, 'mig'); render();
}
function allocNext(run) {
  const A = run && run.alloc; if (!A) return;
  if (A.step === 'i') A.step = 'p';
  else if (A.step === 'p') { if (run.ptree.pts > 0 && !ask('패시브 포인트 ' + run.ptree.pts + '점을 남겨 둘까요? 다음 단계로 넘어가면 이 단계의 노드는 되돌릴 수 없습니다.')) return; A.step = run.ksPending > 0 ? 'k' : 'a'; if (A.step === 'k') ksEnsureOffer(run); }
  else if (A.step === 'k') A.step = 'a';
  if (A.step === 'a' && A.mode === 'mig') allocOldOrder(run);
  render(); if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
}
function allocAfterKs(run) { if (!(run.ksPending > 0)) { run.alloc.step = 'a'; if (run.alloc.mode === 'mig') allocOldOrder(run); } render(); }
const allocOldOrder = run => { const old = run.skillsOld || []; const ix = x => old.indexOf(x) < 0 ? 99 : old.indexOf(x); run.skills = (run.skills || []).slice().sort((x, y) => ix(x) - ix(y)); atSync(run); };
function allocConfirm(run, quiet) {
  const A = run && run.alloc; if (!A || A.step !== 'a') return;
  if (run.atree.pts > 0 && !quiet && !ask('액티브 포인트 ' + run.atree.pts + '점을 남겨 둘까요? 나중에 트리에서 씁니다.')) return;
  if (A.mode === 'create') {
    const original = clone(run); delete run.alloc; treeSync(run); const p = run.p; p.hp = p.hpMax; p.st = p.stMax; run.tick = Date.now();
    if (!keepCur(run)) { G.run = original; render(); return; }
    G.creating = false; G.abandonOnCreate = false; G.cre = null; G.scr = 'run'; G.sheet = null; scheduleSync(); toast('캐릭터를 만들었습니다. 첫 방 앞입니다'); render(); return;
  }
  treeMigrateDone(run); applyGear(run); G.sheet = null; saveRunLocal(); saveCur(); scheduleSync();
  toast('0.8.0 트리로 옮겼습니다. 멈췄던 곳에서 이어 갑니다'); render(); if (run.gearPending) nextDrop(); else ksOpen();
}
function vAlloc(run) {
  const A = run.alloc || { step: 'p', mode: 'create' }; const mig = A.mode === 'mig'; const steps = (mig ? [['i', '안내']] : []).concat([['p', '패시브'], ['k', '큰 각인'], ['a', '액티브 · 장착']]);
  const at = steps.findIndex(x => x[0] === A.step);
  let h = `<ol class="stepper allocst">${steps.map(([k, n], i) => `<li class="${i === at ? 'now' : i < at ? 'done' : ''}">${esc(n)}</li>`).join('')}</ol>`;
  if (A.step === 'i') {
    const M = run.mig08 || {}; const gone = (run.awkOld || []).map(k => (AWK_MAP[k] || { n: k }).n); const T2 = TREE2[run.build]; const AT = atBuild(run.build);
    const old = (run.skillsOld || []).map(id => (SK2[id] ? SK2[id].n : id) + (AT.nodes[id] ? '' : ' (더는 없는 스킬)'));
    return h + `<p>0.8.0에서 능력치 · 스킬 트리 · 각인이 두 트리로 바뀌었습니다. 포인트를 모두 돌려드렸습니다.</p><ul class="rcplain"><li>레벨 ${run.lv}${M.lv && M.lv !== run.lv ? ' (저장된 레벨 ' + M.lv + ')' : ''} · 패시브 <b>${run.ptree.pts}점</b> · 액티브 <b>${run.atree.pts}점</b></li><li>고를 큰 각인 <b>${run.ksPending}번</b></li><li>빠진 옛 각인: ${gone.length ? gone.map(esc).join(', ') : '없음'}</li><li>옛 장착 스킬: ${old.length ? old.map(esc).join(', ') : '없음'} (다시 열면 옛 순서대로 끼웁니다)</li>${M.battle ? '<li>싸우던 전투는 그 방의 처음으로 되돌렸습니다. 확정한 뒤 같은 방을 다시 싸웁니다.</li>' : ''}</ul><p class="mini">패시브 → 큰 각인 → 액티브 순서로 찍습니다. 다음 단계로 넘어가면 앞 단계는 고칠 수 없습니다. 확정해야 저장됩니다. 시작 스킬: ${T2.starters.map(id => esc(SK2[id].n)).join(', ')}.</p><div class="stickbar"><button class="gold wide" data-a="allocgo" data-focus>시작</button></div>`;
  }
  if (A.step === 'p') return h + `<div class="row trd-bar">${trdListBtn()}</div>` + vPTreeAny(run) + `<div class="stickbar"><button class="gold wide" data-a="allocnext" data-focus>${run.ksPending > 0 ? '다음: 큰 각인 고르기' : '다음: 액티브 트리'}${run.ptree.pts ? ' (남은 ' + run.ptree.pts + '점)' : ''}</button>${A.mode === 'create' ? '<div class="row"><button data-a="cback" data-k="cls">이전: 직업 고르기</button><button data-a="createcancel">그만두기</button></div>' : ''}</div>`;
  if (A.step === 'k') return h + vKsPick(run);
  return h + `<div class="row trd-bar">${trdListBtn()}</div>` + vATreeAny(run) + `<div class="stickbar"><button class="gold wide" data-a="allocok" data-focus>${A.mode === 'create' ? '이 캐릭터로 시작하기' : '확정하고 이어 하기'}${run.atree.pts ? ' (남은 ' + run.atree.pts + '점)' : ''}</button>${A.mode === 'create' ? '<div class="row"><button data-a="createcancel">그만두기</button></div>' : ''}</div>`;
}
/* 소모품 가방 칸 그림(10월 14일): 칸마다 아이콘과 든 수, 빈 칸은 점선 */
function consBagStrip(run, sub) {
  const L = run.cons || [];
  const cells = L.map(c => { const D = CONS[c.id]; return D ? `<span class="cc${c.g === 'm' ? ' m' : ''}"><span aria-hidden="true">${D.ico}</span><small>${c.n}/${D.max}</small></span>` : ''; }).join('') + '<span class="cc e"><small>빈 칸</small></span>'.repeat(Math.max(0, CONS_BAG - L.length));
  const said = L.map(c => CONS[c.id] ? consName(c) + ' ' + c.n + '개' : '').filter(Boolean).concat(CONS_BAG > L.length ? ['빈 칸 ' + (CONS_BAG - L.length)] : []).join(', ');
  return `<div class="cbagh"><b>가방 ${consUsed(run)}/${CONS_BAG}칸</b>${sub ? `<span class="mini">${sub}</span>` : ''}</div><div class="cbagm" role="img" aria-label="소모품 가방 칸: ${esc(said)}">${cells}</div>`;
}
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
    body = winSumHtml() + itemDetail(it) + compareHtml(run, it.uid, sl) + (ew ? `<p class="warn">${esc(ew)} 가방에 두었다가 끼던 전설을 빼고 끼세요.</p>` : '') + `<div class="actbar"><button class="gold" data-a="dropequip" data-k="${it.uid}" data-s="${sl}">${hasCur ? '바꿔 끼기' : '지금 끼기'}${kind === 'ring' ? ' (' + EQ_SLOT_N[sl] + ')' : ''}</button><button data-a="dropkeep">가방에 두기</button></div>` + (left <= 1 ? `<p class="warn">${left <= 0 ? '가방이 가득 찼습니다. 다음 장비는 하나를 버려야 받습니다.' : '가방이 한 칸 남았습니다.'}</p>` : '') + `<div class="row dropfoot"><span class="mini">가방 ${used}/${BAG_MAX}. 방과 방 사이에 언제든 바꿀 수 있습니다.</span><button class="sm" data-a="dropdiscard" data-k="${it.uid}"${it.locked ? ' disabled' : ''}>버리기</button></div>`;
    if(!(G.dropQ||[]).length)body += '<button class="wide" data-a="droporganize">가방에 두고 정리하기</button>';
  } else if (S.kind === 'bagfull') {
    const it = S.data.item; title = '가방이 가득 찼습니다'; const nc = (run.cons || []).length;
    body = winSumHtml() + `<p class="lead">새 장비를 바로 장착하거나, 가방에서 하나를 비워 챙길 수 있습니다.</p>${itemDetail(it)}${shopCmp(run, it)}${rewardEquipButtons(run, it)}<button class="wide" data-a="bfskip">새 장비를 버리기</button><h4 class="bfh">또는 가방에서 하나를 버리고 새 장비를 받기</h4><div class="baglist">${run.bag.map(u => { const x = run.inv[u]; return `<div class="bagline"><div><span class="gr-${x.g}">${inm(x.tpl, x.g)}</span>${gradeTag(x.g)}<br><small class="mini">${EQ_SLOT_N[kindOf(ITEMS[x.tpl].slot) === 'ring' ? 'ring1' : ITEMS[x.tpl].slot].replace(' 1', '')} · ${baseText(x)}</small></div><button class="sm" data-a="bfdrop" data-k="${u}"${x.locked ? ' disabled' : ''}>${x.locked ? '잠김' : '이것을 버리기'}</button></div>`; }).join('')}</div>`;
  } else if (S.kind === 'consfull') {
    title = '전리품을 고르세요';
    /* 10월 14일 개편 5단계: 나온 소모품을 모두 보여 주고 뺄 것을 고른다. 자리가 모자라면 가방의 묶음을 버릴 수 있다 */
    const Q = run.consPending || [], skip = S.data.skip || [], plan = consFitPlan(run, Q, skip);
    const takeN = plan.reduce((a, n) => a + n, 0), lostN = Q.reduce((a, c, i) => a + (skip.includes(i) ? 0 : c.n - plan[i]), 0);
    body = winSumHtml() + consBagStrip(run) + '<p class="mini">눌러서 뺄 것을 고르세요. 뺀 것과 자리가 없는 것은 이 방에 두고 갑니다.</p><div class="clist">' + Q.map((c, i) => { const D = CONS[c.id]; if (!D) return ''; const off = skip.includes(i), got = plan[i]; const st = off ? '두고 감' : got >= c.n ? '챙김' : got > 0 ? got + '개만 들어감' : '자리 없음'; return `<div class="cline${off ? ' off' : ''}"><button class="cmain" data-a="cptoggle" data-k="${i}" aria-pressed="${!off}"><span class="cn"><b><span aria-hidden="true">${off ? '☐' : '☑'}</span> ${D.ico} ${esc(consName(c))} ×${c.n}</b></span><small class="mini">${esc(D.d(consVal(c)))}</small></button><span class="cstat${off || got < c.n ? ' warn' : ''}">${st}</span></div>`; }).join('') + '</div>';
    body += (run.cons || []).length ? '<details class="invreason"' + (lostN ? ' open' : '') + '><summary>가방에서 비울 것' + (lostN ? ' (자리가 ' + lostN + '개 모자랍니다)' : '') + '</summary><div class="baglist">' + run.cons.map((x, i) => `<div class="bagline"><div><b>${CONS[x.id] ? CONS[x.id].ico : ''} ${esc(consName(x))} ×${x.n}</b></div><button class="sm" data-a="cpreplace" data-k="${i}" data-s="cons" aria-label="${esc(consName(x))} ${x.n}개 묶음 버리기">묶음 버리기</button></div>`).join('') + '</div></details>' : '';
    body += `<div class="stickbar"><div class="row"><button class="gold wide" data-a="cptake" data-focus>${takeN ? '챙기기 (' + takeN + '개)' + (lostN ? ' · ' + lostN + '개는 두고 감' : '') : '모두 두고 가기'}</button></div></div>`;
  } else if (S.kind === 'changes') {
    title = '업데이트 내역';
    const mj = CHANGELOG.findIndex(c => c.v === '0.7.0'), cut = mj >= 0 ? mj + 1 : CHANGELOG.length;
    const folded = c => `<details class="chgarchive"><summary><span><b>${esc(c.v)} · ${esc(c.t || '업데이트')}</b><small class="chgd">${esc(c.d || '')}</small></span></summary>${chgEntry(c, false)}</details>`;
    body = `<p class="mini">최근 변경부터 읽습니다. 이전 내역은 제목을 눌러 펼칩니다.</p>` + CHANGELOG.slice(0, cut).map((c, i) => i === 0 ? chgEntry(c, true) : folded(c)).join('') + (cut < CHANGELOG.length ? `<details class="chgdev"><summary>이전 공개판</summary>${CHANGELOG.slice(cut).map(folded).join('')}</details>` : '');
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
  } else if (S.kind === 'alloc' && G.run) {
    const A = G.run.alloc || {}; title = A.mode === 'mig' ? '0.8.0 트리로 옮기기' : A.step === 'a' ? '액티브 트리 · 장착' : A.step === 'k' ? '큰 각인 고르기' : '패시브 트리'; body = vAlloc(G.run); // 10월 16일 0.8.0 2단계: 배분 흐름(닫기 없음)
  } else if (S.kind === 'ks' && G.run) {
    title = '큰 각인을 고를 때입니다'; body = vKsPick(G.run);
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
  } else if (S.kind === 'cons') {
    /* 10월 14일 개편: 같은 종류는 한 줄로 합치고, 칸 수는 맨 위 가방 칸 그림과 줄마다의 "N칸 · 5/5 · 3/5"로 보인다. 즐겨찾기·버리기·대상 바꾸기는 줄을 눌러 펼칠 때만 */
    const run = G.run, b = G.b && !G.b.over ? G.b : null; const L = run.cons || [];
    title = '소모품';
    body = consBagStrip(run, b ? `이번 차례 ${b.consN || 0}/${consTurnOf(run.p)}개 · 이번 전투 ${b.consF || 0}/${consFightOf(run.p, run)}개 · 차례 칸을 쓰지 않습니다` : '전투 밖에서는 회복과 해제를 씁니다');
    if (!L.length) body += '<p class="mini">소모품이 없습니다. 쓰러뜨린 적이 떨구거나 상점에서 삽니다.</p>';
    const filter = S.data.filter || 'all', query = S.data.query || '', find = !!(S.data.find || query);
    const tabs = [['all', '전체'], ['restore', '회복·해제'], ['battle', '전투']].concat(L.some(c => CONS[c.id] && consGroup(CONS[c.id]) === 'other') ? [['other', '탐색']] : []).concat([['fav', '★ ' + (run.consFav || []).length + '/3']]);
    if (L.length) body += `<div class="invtools ctabs" role="group" aria-label="소모품 분류">${tabs.map(([k, n]) => `<button class="sm" data-a="consfilter" data-k="${k}" aria-pressed="${filter === k}">${n}</button>`).join('')}<button class="sm" data-a="consfind" aria-pressed="${find}" aria-label="이름·효과 찾기">🔍</button></div>${find ? `<div class="invsearch"><label for="consquery">이름·효과 찾기</label><input id="consquery" type="search" value="${esc(query)}" maxlength="60"><button class="sm" data-a="conssearch">찾기</button></div>` : ''}`;
    const gone = (run.consFav || []).filter(key => { const [id] = key.split(':'); return CONS[id] && !L.some(c => consKey(c) === key); });
    if (gone.length) body += `<p class="mini">가방에 없는 즐겨찾기: ${gone.map(key => { const [id, g] = key.split(':'); return `<button class="sm" data-a="consfavremove" data-k="${esc(key)}" aria-label="${esc(consName({ id, g }))} 즐겨찾기 해제">★ ${esc(consName({ id, g }))} ×</button>`; }).join(' ')}</p>`;
    const groups = consGroups(consRows(run, b, filter, false, query, G.sel));
    if (L.length && !groups.length) body += '<p class="mini">조건에 맞는 소모품이 없습니다. 전체 분류를 고르거나 검색어를 지우세요.</p>';
    const brewShown = new Set(); // 같은 재료(일반 · 고급)는 첫 줄에만 채우기
    body += '<div class="clist">' + groups.map(g => {
      const { c, D, why, key } = g, open = S.data.open === key, name = consName(c);
      const target = b && D.tgt === 'enemy' && consTarget(b, D, G.sel), ts = b && D.tgt === 'enemy' ? consTargets(b, D) : [];
      const chl = consChLim(run, D), slots = `${g.slots.length}칸 · ${g.slots.map(n => n + '/' + D.max).join(' · ')}${chl ? ` · 이번 챕터 ${consChUsed(run, D)}/${chl}번` : ''}`;
      const bw = !b && !brewShown.has(c.id) ? consBrewOf(run, c.id) : null, bwOn = !!(bw && !bw.why); if (bw) brewShown.add(c.id); // 전투 밖이면 약초 · 각성 잎 줄에 플라스크 채우기
      let h = `<div class="cline${why && !bwOn ? ' off' : ''}${open ? ' open' : ''}"><button class="cmain" data-a="consrow" data-k="${esc(key)}" aria-expanded="${open}"><span class="cn"><b>${D.ico} ${esc(name)} ×${g.n}</b>${g.fresh ? ' <span class="cnew">새로 얻음</span>' : ''}${consFavorite(run, c) ? ' <span aria-label="즐겨찾기">★</span>' : ''}</span><span class="cs">${slots}</span><small class="mini">${esc(D.d(consVal(c)))}${target ? ' → ' + esc(target.n) : ''}${why ? ' · ' + esc(why) : ''}</small>${bw && !b ? `<small class="mini cbrewl">🧪 ${bw.need}개 → ${esc(bw.name)} 한 칸 · 지금 ${bw.cur}/${bw.cap}칸${bw.why ? ' · ' + esc(bw.why) : ''}</small>` : ''}</button>`;
      h += `<div class="cacts">${D.use === 'none' ? '' : `<button class="sm cuse${why || bwOn ? '' : ' gold'}" data-a="consuse" data-k="${g.idx}" aria-label="${esc(name + (target ? ' · ' + target.n : '') + ' 쓰기')}"${why ? ' disabled' : ''}>쓰기</button>`}${bw && !b ? `<button class="sm cbrew${bwOn ? ' gold' : ''}" data-a="consbrew" data-k="${c.id}" aria-label="${esc(D.n + ' ' + bw.need + '개로 ' + bw.name + ' 한 칸 채우기' + (bw.why ? ', ' + bw.why : ''))}"${bwOn ? '' : ' disabled'}>🧪 채우기</button>` : ''}</div>`;
      if (open) {
        h += `<div class="cmore"><p class="mini">${esc(D.sit)} · ${esc(D.d(consVal(c)))}</p>`;
        if (ts.length > 1) h += `<div class="invtools" role="group" aria-label="${esc(name)} 사용 대상">${ts.map(e => `<button class="sm" data-a="constarget" data-k="${e.id}" aria-pressed="${target && target.id === e.id}">${esc(e.n)}</button>`).join('')}</div>`;
        if (!['none', 'out'].includes(D.use)) h += `<div class="row"><button class="sm" data-a="consfav" data-k="${g.rows[0].i}" aria-pressed="${consFavorite(run, c)}">${consFavorite(run, c) ? '★ 빠른 사용 줄에서 빼기' : '☆ 빠른 사용 줄에 두기 (3종까지)'}</button></div>`;
        h += `<div class="cslotl">${g.rows.map((r, k) => `<div><span class="mini">${k + 1}번 칸 · ${r.c.n}/${D.max}개</span><button class="sm" data-a="consdiscard" data-k="${r.i}"${b ? ' disabled' : ''} aria-label="${esc(name)} ${r.c.n}개 든 칸 비우기">이 칸 버리기</button></div>`).join('')}${b ? '<p class="mini">버리기는 전투 밖에서 합니다.</p>' : ''}</div></div>`;
      }
      return h + '</div>';
    }).join('') + '</div>';
    body += `<div class="stickbar"><div class="row"><button data-a="equip">장비 보기</button><button class="wide" data-a="close">닫기</button></div></div>`;
  } else if (S.kind === 'choice') {
    title = S.data.chest ? '상자를 열었습니다' : '둘 중 하나만 가져갑니다';
    body = winSumHtml() + `<p class="lead">하나만 가져갑니다. 고르지 않은 쪽은 이 방에 남습니다. 고른 뒤 바로 끼울지 정합니다.</p>`;
    for (const k of S.data.offer) body += itemCard(k, curLine(run, k) + `<button class="gold" data-a="choose" data-k="${k}">이것을 가진다</button>`);
    body += `<button data-a="choose" data-k="">둘 다 두고 간다</button>`;
  } else if (S.kind === 'awkview') {
    title = '큰 각인 · 중간 노드'; const own = run && run.ptree ? ptBuild(run.build) : null; const ks = own ? run.ptree.ks.map(id => own.nodes[id]) : []; const nt = own ? run.ptree.own.concat(run.ptree.free).map(id => own.nodes[id]).filter(n => n && n.kind === 'notable') : [];
    body = `<p class="mini">패시브 트리에서 얻은 큰 각인과 중간 노드입니다. 큰 각인은 1 · 2챕터 정산 뒤와 3챕터 야영지에서 하나씩 고릅니다.</p><h4>큰 각인 ${ks.length}/${PT.ksN}</h4><div class="awklist">${ks.map(n => `<div class="awkc"><div class="awkh"><b>◆ ${esc(n.n)}</b></div><p>${esc(n.d)}</p>${n.pay ? `<p class="no">대가: ${esc(n.pay)}</p>` : ''}</div>`).join('') || '<p class="mini">아직 없습니다.</p>'}</div><h4>중간 노드 ${nt.length}</h4><div class="awklist">${nt.map(n => `<div class="awkc"><div class="awkh"><b>● ${esc(n.n)}</b><span class="chip">${esc(PT.dir[n.dir].n)}</span></div><p>${esc(n.d)}</p></div>`).join('') || '<p class="mini">아직 없습니다.</p>'}</div>${(run.awk || []).length ? `<h4>챕터 선물</h4><div class="awklist">${run.awk.map(id => awkCard(id)).join('')}</div>` : ''}${S.data && S.data.from === 'equip' ? '<button class="wide" data-a="equip">장비로 돌아가기</button>' : ''}`;
    body = `<p class="mini">던전이 끝나면 소멸되는 작은 힘입니다. 정산을 확정한 뒤와 2챕터부터의 야영지에서 하나씩 얻습니다. 대가는 없습니다.</p><div class="awklist">${own.length ? own.map(id => awkCard(id)).join('') : '<p class="mini">아직 얻은 각인이 없습니다.</p>'}</div>${S.data && S.data.from === 'equip' ? '<button class="wide" data-a="equip">장비로 돌아가기</button>' : ''}`;
  } else if (S.kind === 'fateres') {
    const r = S.data; title = r.ok ? '저울이 기웁니다' : '저울이 기울지 않았습니다';
    body = `<p class="mini">올린 장비</p><div class="idet"><b class="gr-${r.from.g}">${inm(r.from.tpl, r.from.g)}</b></div>${r.ok ? `<p>한 단계 위 장비로 바뀌었습니다. 가방에 넣었습니다.</p>${itemDetail(r.to)}` : '<p>올린 장비는 사라졌습니다.</p>'}<button class="gold wide" data-a="close" data-focus>확인</button>`;
  } else if (S.kind === 'offer') {
    title = '바칠 장비를 고르세요';
    body = `<p class="mini">고른 장비는 사라지고, 한 등급 위의 장비 하나를 받습니다(희귀는 다시 희귀, 영웅 · 전설은 영웅).</p><div class="baglist">${run.bag.map(u => { const x = run.inv[u]; return `<div class="bagline"><div><span class="gr-${x.g}">${inm(x.tpl, x.g)}</span><br><small class="mini">${(GRADE[x.g] || GRADE.n).n} · ${baseText(x)}</small></div><button class="sm" data-a="offerpick" data-k="${u}"${x.locked ? ' disabled' : ''}>${x.locked ? '잠김' : '바친다'}</button></div>`; }).join('')}</div>`;
  } else if (S.kind === 'codex') {
    title = '보스 도감'; body = vCodex(); /* 78-records-ui.js */
  } else if (S.kind === 'itembook') {
    title = '아이템 도감'; body = vItemBook();
  } else if (S.kind === 'toasts') {
    const L = (G.toastLog || []).slice().reverse(); const hm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    title = '지난 알림'; body = `<p class="mini">이번 접속에서 뜬 알림 가운데 최근 ${L.length}개입니다. 위가 가장 최근입니다.</p><ul class="tlog">${L.map(x => `<li><span class="mini">${hm(x.at)}</span> ${esc(x.m)}</li>`).join('')}</ul>`;
  } else if (S.kind === 'settings') {
    title = '설정'; body = vSettings();
  } else if (S.kind === 'help') {
    title = S.data.first ? '방금 적이 무너졌습니다' : '도움말'; body = (S.data.first ? '<p class="mini">처음 보는 규칙이라 잠깐 설명합니다. 이 창은 한 번만 뜹니다.</p>' : '') + vHelpBody(S.data.k);
  } else if (S.kind === 'statview') {
    title = '능력치'; const run = G.run;
    body = run && run.p ? `<p><b>${esc(run.cname || BUILDS[run.build].n)}</b> · ${esc(BUILDS[run.build].n)} · Lv ${run.lv || 1}</p>${run.ptree ? vStatTotals(run) : statReadHtml(run.p.stat || run.stats)}<p class="mini">능력치는 패시브 트리의 시작 노드와 찍은 노드의 합입니다. 트리에서 노드를 찍어 올립니다.</p>${S.data.from === 'equip' ? '<button data-a="equip">장비로 돌아가기</button>' : ''}` : '<p>캐릭터 정보가 없습니다.</p>';
  } else if (S.kind === 'equip') {
    title = '장비'; body = vEquip();
  }
  return [title, body];
}

