'use strict';
/* ---------- 런 ---------- */
function shuffleSeeded(arr, seed) { const a = arr.slice(); const r = mulberry(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function startRun(build, boss) {
  boss = boss || chData(1).boss; // 1챕터 보스: 타락한 수도원장 (기믹 상세는 비공개 문서). 챕터를 넘으면 enterChapter가 바꾼다
  const p = mkPlayer(build, {});
  const seed = Date.now() % 100000;
  G.run = {
    id: 'r' + Date.now().toString(36), build, boss, startedAt: Date.now(), room: 0, p, bag: [], swaps: [], rooms: [], acts: [],
    deaths: [], result: null, blockPicked: null, entry: null, survey: null, drops: [], legSeen: [], awk: [],
    stats: { str: 0, dex: 0, int: 0, con: 0, wil: 0 }, statGrowth: LV_POINTS, statBase: STAT_START, statLog: [], pool: shuffleSeeded(FREE_POOL, seed), choices: [], seed,
  };
  G.run.skills = isV2(p) ? [] : DEFAULT_SKILLS[build].slice(); G.run.bag = []; G.run.cons = []; initGear(G.run); dgInit(G.run); G.run.skillLog = []; treeInit(G.run); if (isV2(p)) p.skills = v2Equip(G.run);
  G.run.mode = G.cre && G.cre.mode === 'hard' && G.data.hardOpen ? 'hard' : 'normal'; G.run.cname = (G.cre && G.cre.name) || ''; G.run.ch = 1; G.run.playMs = 0; G.run.tut = G.data.tutDone ? 1 : 0; // 수련장을 마친 뒤 만든 캐릭터인가
  if (G.cre && G.cre.mark) markSetup(G.run, G.cre.mark); // 표식 도전: 챕터 시작 레벨 · 꾸러미 · 표식
  G.scr = 'create'; G.b = null; G.sel = null; G.creating = true;
  openSheet('skills', { first: 1, pick: G.run.skills.slice() });
}
/* 이어 하기: 방과 방 사이마다 판을 통째로 저장 */
/* ===== 장비 (기획서 11.5절) =====
   run.inv[uid] = { uid, tpl, g(등급), ch(챕터), b(기본 수치 보너스 %) }
   run.eqU[슬롯] = uid, run.bag = [uid...] (최대 BAG_MAX). 장비 하나는 늘 장비 칸 한 곳이나 가방 한 곳에만 있다.
   옮기기는 equipUid / unequipUid / discardUid / addItem만 쓴다. */
const EQ_SLOTS = ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2', 'flask'];
const EQ_SLOT_N = { weapon: '무기', armor: '갑옷', gloves: '장갑', amulet: '목걸이', ring1: '반지 1', ring2: '반지 2', flask: '플라스크' };
const kindOf = slot => slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
const tplKind = k => kindOf(ITEMS[k].slot);
function rollBonus(g) { const R = GRADE[g] || GRADE.n; return Math.round((R.lo + Math.random() * (R.hi - R.lo)) * 10) / 10; }
/* 챕터마다 장비 풀 (CH_POOLS[ch], 없으면 1챕터 풀) */
function poolOf(ch) { return (typeof CH_POOLS !== 'undefined' && CH_POOLS[ch]) || CH1_POOL; }
/* 장비의 챕터(기본 수치의 챕터): 지금 챕터 풀에 없고 이전 챕터 풀에 있으면 그 챕터 (장비-경제.md 3절 옛 장비) */
function itemChOf(k) { const c = (typeof G !== 'undefined' && G.run && G.run.ch) || 1; if (c >= 2 && typeof CH_POOLS !== 'undefined' && CH_POOLS[c] && !CH_POOLS[c].includes(k)) for (let x = c - 1; x >= 1; x--) if (CH_POOLS[x] && CH_POOLS[x].includes(k)) return x; return c; }
function mkItem(k, o) { o = o || {}; const g = o.g || ITEMS[k].g || 'n'; return { rollV: 2, foundAt: Date.now(), uid: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tpl: k, g, ch: o.ch || itemChOf(k), /* 10월 5일: 기본값이 늘 1이라 2챕터 드롭이 1챕터 수치로 나올 뻔했다 */ b: o.b != null ? o.b : rollBonus(g) }; }
function itemBase(it) { const sb = SLOT_BASE[tplKind(it.tpl)]; const v = sb.v[(it.ch || 1) - 1] * (1 + (it.b || 0) / 100); return { k: sb.k, lab: sb.lab, v }; }
function baseText(it) { const x = itemBase(it); return x.k === 'flask' ? `${x.lab} ${Math.round(x.v * 1000) / 10}%` : x.k === 'wpn' ? `${x.lab} ${r1(x.v)}` : `${x.lab} +${Math.round(x.v)}`; }
/* 장비 이름: 등급 글자(평 · 고 · 희 · 영 · 전, 색과 함께 글자로도 보인다)와 전설의 ✦. 색은 부르는 쪽의 gr-g가 입힌다 */
function inm(tpl, g) { const R = GRADE[g] || GRADE.n; return `<span class="gl" aria-hidden="true">${R.n[0]}</span><span class="sr">${R.n} </span>${g === 'l' ? '<span aria-hidden="true">✦ </span>' : ''}${esc((ITEMS[tpl] || {}).n || tpl)}`; }
function gradeTag(g) { return `<span class="gtag gr-${g}">${(GRADE[g] || GRADE.n).n}</span>`; }
function initGear(run) {
  if (run.inv) return;
  const p = run.p; run.inv = {}; run.eqU = {}; for (const sl of EQ_SLOTS) run.eqU[sl] = null;
  const put = (it, sl) => { run.inv[it.uid] = it; run.eqU[sl] = it.uid; };
  put(mkItem('start_wpn_' + run.build, { b: 0 }), 'weapon'); put(mkItem('start_armor', { b: 0 }), 'armor'); put(mkItem('start_flask', { b: 0 }), 'flask');
  const oldBag = Array.isArray(run.bag) ? run.bag.filter(k => ITEMS[k]) : []; run.bag = [];
  for (const sl of EQ_SLOTS) { const k = p.eq && p.eq[sl]; if (k && ITEMS[k] && ITEMS[k].kind !== 'start') { const it = mkItem(k); run.inv[it.uid] = it; const prev = run.eqU[sl]; run.eqU[sl] = it.uid; if (prev) run.bag.push(prev); } }
  for (const k of oldBag) if (!Object.values(run.inv).some(x => x.tpl === k) && run.bag.length < BAG_MAX) { const it = mkItem(k); run.inv[it.uid] = it; run.bag.push(it.uid); }
  applyGear(run, true);
}
/* 장비 칸의 장비로 엔진 값(p.eq, p.gear)과 최대치를 다시 맞춘다. 남은 비율은 유지한다 */
function applyGear(run, full) {
  const p = run.p; const g = { wpn: 0, hp: 0, st: 0, mp: 0, flask: 0 };
  for (const sl of EQ_SLOTS) { const it = run.eqU[sl] && run.inv[run.eqU[sl]]; p.eq[sl] = it ? it.tpl : null; if (it) { const x = itemBase(it); g[x.k] += x.v; } }
  if (!g.wpn) g.wpn = 4; if (!g.flask) g.flask = START_GEAR.flask;
  const f = { hp: p.hpMax ? p.hp / p.hpMax : 1, mp: p.mpMax ? p.mp / p.mpMax : 1, st: p.stMax ? p.st / p.stMax : 1 };
  p.gear = g; p.hpMax = calcHpMax(p); p.mpMax = calcMpMax(p); p.stMax = calcStMax(p);
  for (const fk of ['life', 'mana', 'stam']) if (p.flask && p.flask[fk] > flaskCap(p, fk)) p.flask[fk] = flaskCap(p, fk);
  if (full) { p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; }
  else { p.hp = Math.min(p.hpMax, Math.round(p.hpMax * f.hp)); p.mp = Math.min(p.mpMax, p.mpMax * f.mp); p.st = Math.min(p.stMax, p.stMax * f.st); }
}
function slotOfUid(run, uid) { return EQ_SLOTS.find(sl => run.eqU[sl] === uid) || null; }
function gearCheck(run) { const seen = {}; for (const u of run.bag.concat(EQ_SLOTS.map(sl => run.eqU[sl]).filter(Boolean))) { if (seen[u] || !run.inv[u]) return false; seen[u] = 1; } return Object.keys(run.inv).length === Object.keys(seen).length; }
function logSwap(run, it, on, ctx) { const r = G.eqWhy || {}; run.swaps.push({ room: run.room, item: it.tpl, uid: it.uid, g: it.g, b: it.b, on: on ? 1 : 0, reason: r.reason || '', note: r.note || '', ctx: ctx || 'free', t: Date.now() }); }
function addItem(run, it) { if (bagUsed(run) >= BAG_MAX) return false; run.inv[it.uid] = it; run.bag.push(it.uid); return true; }
/* 가방의 장비를 낀다. 그 칸에 있던 장비는 같은 자리로 가방에 들어간다(가방 칸 수는 그대로) */
function equipUid(run, uid, slot, ctx) {
  const it = run.inv[uid]; const bi = run.bag.indexOf(uid); if (!it || bi < 0) return '가방에 없는 장비입니다';
  const kind = tplKind(it.tpl);
  if (!slot) slot = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind;
  if (kindOf(slot) !== kind) return '이 칸에 낄 수 없는 장비입니다';
  { const w = equipWhy(run, uid, slot); if (w) return w; }
  const prev = run.eqU[slot];
  run.eqU[slot] = uid; if (prev) run.bag[bi] = prev; else run.bag.splice(bi, 1);
  if (prev) logSwap(run, run.inv[prev], false, ctx); logSwap(run, it, true, ctx);
  applyGear(run); return '';
}
/* 낄 수 없는 까닭 (장비-경제.md 4.2절): 전설은 한 번에 하나만 (같은 칸의 전설을 바꾸는 것은 된다) */
function equipWhy(run, uid, slot) { const it = run.inv[uid]; if (!it || it.g !== 'l') return ''; return EQ_SLOTS.some(sl => sl !== slot && run.eqU[sl] && run.inv[run.eqU[sl]] && run.inv[run.eqU[sl]].g === 'l') ? '전설은 하나만 낄 수 있습니다.' : ''; }
function unequipUid(run, slot, ctx) {
  const uid = run.eqU[slot]; if (!uid) return '';
  if (slot === 'weapon') return '무기는 다른 무기로만 바꿉니다';
  if (bagUsed(run) >= BAG_MAX) return '가방이 가득 찼습니다';
  run.eqU[slot] = null; run.bag.push(uid); logSwap(run, run.inv[uid], false, ctx); applyGear(run); return '';
}
function discardUid(run, uid) { const bi = run.bag.indexOf(uid); if (bi < 0) return '가방에 없는 장비입니다'; run.bag.splice(bi, 1); const it = run.inv[uid]; delete run.inv[uid]; (run.discards = run.discards || []).push({ room: run.room, item: it.tpl, g: it.g, t: Date.now() }); return ''; }
/* 비교: 그 장비를 slot에 꼈을 때의 엔진 값 */
function gearStats(p) { return { hp: p.hpMax, mp: p.mpMax, st: p.stMax, basic: basicBase(p), heavy: heavyBase(p), flask: flaskHealFrac(p), heavyCost: heavyCost(p), lifeCap: flaskCap(p, 'life'), manaCap: flaskCap(p, 'mana'), stamCap: flaskCap(p, 'stam') }; }
const GSTAT = [['hp', '최대 생명력', v => Math.round(v)], ['mp', '최대 마나', v => Math.round(v)], ['st', '최대 스태미나', v => Math.round(v)], ['basic', '기본 공격 피해', r1], ['heavy', '강공격 피해', r1], ['flask', '생명력 플라스크 회복', v => Math.round(v * 1000) / 10 + '%'], ['heavyCost', '강공격 스태미나 비용', r1, -1], ['lifeCap', '생명력 플라스크 최대 충전', v => v + '회'], ['manaCap', '정화 플라스크 최대 충전', v => v + '회'], ['stamCap', '스태미나 플라스크 최대 충전', v => v + '회']];
function simEquip(run, uid, slot) {
  const t = { p: JSON.parse(JSON.stringify(run.p)), inv: run.inv, eqU: Object.assign({}, run.eqU), bag: run.bag.slice() };
  if (uid) t.eqU[slot] = uid; else t.eqU[slot] = null;
  applyGear(t); return gearStats(t.p);
}
function compareHtml(run, uid, slot) {
  const it = run.inv[uid]; const curU = run.eqU[slot]; const cur = curU && run.inv[curU];
  const a = gearStats(run.p), b = simEquip(run, uid, slot);
  const rows = []; let up = 0, down = 0;
  if (cur && ITEMS[cur.tpl].act && cur.tpl !== it.tpl) { rows.push(`<li class="dn"><span class="ar" aria-hidden="true">▼</span><span class="sr">나빠짐 </span>효과가 사라집니다: ${esc(ITEMS[cur.tpl].act)}</li>`); }
  const effectChanged = !cur || cur.tpl !== it.tpl;
  if (effectChanged && cur && ITEMS[cur.tpl].cost) rows.push(`<li>없어지는 대가: ${esc(ITEMS[cur.tpl].cost)}</li>`);
  if (effectChanged && ITEMS[it.tpl].act) rows.push(`<li class="up">얻는 효과: ${esc(ITEMS[it.tpl].act)}</li>`);
  if (effectChanged && ITEMS[it.tpl].cost) rows.push(`<li class="dn">새 대가: ${esc(ITEMS[it.tpl].cost)}</li>`);
  for (const [k, lab, fmt, direction] of GSTAT) {
    if (k === 'mp' && isV2(run.p)) continue;
    const d = b[k] - a[k]; if (Math.abs(d) < 0.05) continue;
    const dd = (d > 0 ? '+' : '−') + fmt(Math.abs(d));
    const better = direction === -1 ? d < 0 : d > 0;
    if (better) up++; else down++;
    rows.push(`<li class="${better ? 'up' : 'dn'}"><span class="ar" aria-hidden="true">${better ? '▲' : '▼'}</span><span class="sr">${better ? '좋아짐 ' : '나빠짐 '}</span>${lab} <b>${dd}</b> <small>${fmt(a[k])} → ${fmt(b[k])}</small></li>`);
  }
  for (const [k, fk, label] of [['lifeCap', 'life', '생명력'], ['manaCap', 'mana', '정화'], ['stamCap', 'stam', '스태미나']]) {
    const left = (run.p.flask || {})[fk] || 0;
    if (b[k] < a[k] && left > b[k]) rows.push(`<li class="mini">장착 후 남은 ${label} 플라스크 ${left} → ${b[k]}회</li>`);
  }
  const v = up && !down ? ['good', '비교한 수치가 올라갑니다'] : down && !up ? ['bad', '비교한 수치가 내려갑니다'] : up && down ? ['mix', '오르는 수치와 내려가는 수치가 있습니다'] : ['same', '비교한 수치는 그대로입니다'];
  rows.sort((x, y) => Number(y.includes('class="dn"')) - Number(x.includes('class="dn"')));
  return `<div class="cmp"><div class="cmpv ${v[0]}">${v[1]}</div><div class="cmph">${cur ? `지금 낀 <b class="gr-${cur.g}">${inm(cur.tpl, cur.g)}</b>과 비교` : '이 칸은 비어 있습니다'}</div>${rows.length ? `<ul class="cmpl" aria-label="바뀌는 것">${rows.join('')}</ul>` : ''}</div>`;
}
function itemDetail(it, opt) {
  const I = ITEMS[it.tpl]; const R = GRADE[it.g] || GRADE.n; const o = opt || {};
  return `<div class="idet grb-${it.g}"><div class="idet-h"><b class="gr-${it.g}">${inm(it.tpl, it.g)}</b>${gradeTag(it.g)}<span class="mini">${EQ_SLOT_N[kindOf(I.slot) === 'ring' ? 'ring1' : I.slot].replace(' 1', '')}</span></div>
<div class="idet-base"><b>${baseText(it)}</b>${o.compact ? '' : ` <span class="mini">${I.kind === 'start' ? '시작 장비' : it.rollV===2 ? `${R.n} 범위 +${R.lo}~${R.hi}% 중 +${it.b}%` : `보유 보너스 +${it.b}%`}</span>`}</div>${I.act ? `<div class="l act">${esc(I.act)}</div>` : ''}${I.cost ? `<div class="l cost">대가: ${esc(I.cost)}</div>` : ''}${I.lore && !o.compact ? `<p class="lore">${esc(I.lore)}</p>` : ''}</div>`;
}
/* 지금 낀 장비 한 줄 (고르기 창: 아직 얻지 않은 장비는 비교할 수 없어 낀 것을 보인다) */
function curLine(run, k) {
  const kind = tplKind(k); const sl = kind === 'ring' ? (!run.eqU.ring1 ? 'ring1' : !run.eqU.ring2 ? 'ring2' : 'ring1') : kind; const u = run.eqU[sl], x = u && run.inv[u];
  return `<p class="mini nowl">${x ? `지금 낀 장비: <b class="gr-${x.g}">${inm(x.tpl, x.g)}</b> · ${baseText(x)}` : `${EQ_SLOT_N[sl].replace(' 1', '')} 칸은 비어 있습니다`}</p>`;
}
/* 방을 이긴 직후 얻은 것 한 줄 요약 (G.winSum: 이긴 방의 골드 · 경험치 · 소모품, 첫 창에만 보인다) */
function winSumHtml() {
  const w = G.winSum; if (!w) return ''; const c = [];
  if (w.gold) c.push(`<span class="lchip">💰 골드 +${w.gold}</span>`);
  if (w.xp) c.push(`<span class="lchip">✨ 경험치 +${w.xp}${w.lv ? ' · 레벨 ' + w.lv : ''}</span>`);
  for (const [nm, n] of Object.entries(w.got || {})) c.push(`<span class="lchip">${esc(nm)}${n > 1 ? ' ×' + n : ''}</span>`);
  if (w.lost) c.push(`<span class="lchip bad">가방이 가득 차 ${w.lost}개를 두고 왔습니다</span>`);
  return c.length ? `<div class="winsum" role="group" aria-label="이번 방에서 얻은 것"><span class="wsl">이번 방에서 얻은 것</span><div class="wsc">${c.join('')}</div></div>` : '';
}
/* 휴대폰: 고른 장비의 설명이 화면 밖이면 보이게 굴린다 */
function eqReveal() { setTimeout(() => { const d = document.querySelector('.sheet .eqdet'); if (!d) return; const r = d.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight - 120) d.scrollIntoView({ block: 'start', behavior: smoothB() }); }, 20); }
function eqBagReveal(){setTimeout(()=>{const e=document.querySelector('.sheet .eqbag');if(e)e.scrollIntoView({block:'start',behavior:smoothB()});},20);}
function vEquip() {
  const run = G.run; initGear(run); const p = run.p; const inFight = !!G.b && !G.b.over;
  const sel = G.eqSel || (G.eqSel = { slot: 'weapon' });
  const filter = G.eqFilter || 'all', order = G.eqOrder || 'recent';
  const a = gearStats(p);
  let h = `<div class="eqsum" role="group" aria-label="지금 수치">${GSTAT.filter(x => !['heavyCost', 'lifeCap', 'manaCap', 'stamCap'].includes(x[0]) && (x[0] !== 'mp' || !isV2(p))).map(([k, lab, fmt]) => `<span><small>${lab}</small><b>${fmt(a[k])}</b></span>`).join('')}</div>`;
  if (inFight) h += `<p class="warn">전투 중에는 보기만 합니다. 전투가 끝나면 바꿉니다.</p>`;
  h += `<div class="eqcols"><section class="eqslots" aria-label="장비 칸">`;
  for (const sl of EQ_SLOTS) {
    const u = run.eqU[sl], it = u && run.inv[u]; const on = !sel.uid && sel.slot === sl;
    h += `<button class="eqrow${on ? ' on' : ''}${it ? ' grb-' + it.g : ''}" data-a="eqsel" data-k="${sl}" aria-pressed="${on}"><span class="eqsl">${EQ_SLOT_N[sl]}</span>${it ? `<span class="eqn gr-${it.g}"><span class="eqg" aria-hidden="true">${(GRADE[it.g] || GRADE.n).n[0]}</span><span class="sr">${(GRADE[it.g] || GRADE.n).n} </span>${it.g === 'l' ? '<span aria-hidden="true">✦ </span>' : ''}${esc(ITEMS[it.tpl].n)}</span><span class="eqb">${baseText(it)}</span>` : '<span class="eqn empty">비어 있음</span>'}</button>`;
  }
  h += `</section><div class="eqdet" aria-live="polite">`;
  if (sel.uid && run.inv[sel.uid]) {
    h += '<button class="sm" data-a="eqback">가방 목록으로</button>';
    const it = run.inv[sel.uid]; const kind = tplKind(it.tpl);
    const slots = kind === 'ring' ? (sel.slot==='ring2'?['ring2','ring1']:['ring1','ring2']) : [kind];
    h += itemDetail(it);
    for (const sl of slots) { const ew = equipWhy(run, it.uid, sl); h += compareHtml(run, it.uid, sl) + (ew && !inFight ? `<button class="gold wide adis" data-a="eqon" data-k="${it.uid}" data-s="${sl}" aria-disabled="true" data-why="${esc(ew)}" aria-label="${esc((slots.length > 1 ? EQ_SLOT_N[sl] + '에 끼기' : '끼기') + ', 낄 수 없음: ' + ew)}">${slots.length > 1 ? EQ_SLOT_N[sl] + '에 끼기' : '끼기'}</button><p class="mini">${esc(ew)}</p>` : `<button class="gold wide" data-a="eqon" data-k="${it.uid}" data-s="${sl}"${inFight ? ' disabled' : ''}>${slots.length > 1 ? EQ_SLOT_N[sl] + '에 끼기' : '끼기'}</button>`); }
    h += `<div class="row"><button class="sm" data-a="eqdrop" data-k="${it.uid}"${inFight ? ' disabled' : ''}>버리기</button></div>`;
  } else {
    const u = run.eqU[sel.slot], it = u && run.inv[u];
    if (it) { h += itemDetail(it); if (sel.slot !== 'weapon') h += `<div class="row"><button data-a="eqoff" data-k="${sel.slot}"${inFight || bagUsed(run) >= BAG_MAX ? ' disabled' : ''}>가방에 넣기</button></div>`; else h += '<p class="mini">무기는 다른 무기로만 바꿉니다.</p>'; }
    else h += `<p class="mini">${EQ_SLOT_N[sel.slot]} 칸이 비어 있습니다.</p>`;
    const fit = run.bag.filter(x => run.inv[x] && kindOf(sel.slot) === tplKind(run.inv[x].tpl));
    h += fit.length ? `<p class="mini">가방에서 이 칸에 낄 수 있는 장비 ${fit.length}개. 아래 가방에서 고르세요.</p>` : '<p class="mini">가방에 이 칸에 낄 장비가 없습니다.</p>';
  }
  h += `</div></div>`;
  h += `<section class="eqbag" aria-label="가방"><h4>가방 <span class="mini">${bagUsed(run)}/${BAG_MAX}${(run.cons || []).length ? ' · 소모품 ' + run.cons.length + '칸' : ''}${bagUsed(run) >= BAG_MAX ? ' · 가득 참' : ''}</span></h4>`;
  h += `<div class="invtools" role="group" aria-label="장비 찾기">${[['all','전체'],['slot','선택한 칸']].map(([k,n])=>`<button class="sm" data-a="eqfilter" data-k="${k}" aria-pressed="${filter===k}">${n}</button>`).join('')}<button class="sm" data-a="eqorder" data-k="${order==='recent'?'grade':'recent'}">${order==='recent'?'최근 획득순':'등급순'}</button><button class="sm" data-a="consopen">소모품 보기</button></div>`;
  let bag = run.bag.filter(u=>run.inv[u] && (filter!=='slot'||tplKind(run.inv[u].tpl)===kindOf(sel.slot || 'weapon'))).slice().reverse();
  if(order==='recent') bag.sort((a,b)=>(run.inv[b].foundAt||0)-(run.inv[a].foundAt||0));
  if(order==='grade') bag.sort((a,b)=>'nmrhl'.indexOf(run.inv[b].g)-'nmrhl'.indexOf(run.inv[a].g)||run.inv[b].ch-run.inv[a].ch);
  if(!bag.length) h += '<p class="mini">이 분류에 장비가 없습니다.</p>';
  h += '<div class="baggrid">';
  for (let i = 0; i < bag.length; i++) {
    const u = bag[i], it = u && run.inv[u];
    if (!it) { h += `<div class="bagc empty" aria-hidden="true"></div>`; continue; }
    const fits = kindOf(sel.slot) === tplKind(it.tpl) && !sel.uid; const on = sel.uid === u;
    h += `<button class="bagc grb-${it.g}${on ? ' on' : ''}${fits ? ' fits' : ''}" data-a="eqpick" data-k="${u}" aria-pressed="${on}"><span class="gr-${it.g}">${inm(it.tpl, it.g)}</span><small>${EQ_SLOT_N[kindOf(ITEMS[it.tpl].slot) === 'ring' ? 'ring1' : ITEMS[it.tpl].slot].replace(' 1', '')} · ${it.ch || 1}챕터</small><small>${baseText(it)}</small></button>`;
  }
  h += `</div></section>`;
  const w = G.eqWhy || {};
  h += `<details class="eqwhy"><summary>바꾸는 이유 남기기 <span class="mini">(선택, 기록에 남습니다)</span></summary><div class="row">${REASONS.map(r => `<label class="sv-i"><input type="radio" name="eqrs" value="${r[0]}"${w.reason === r[0] ? ' checked' : ''}> ${r[1]}</label>`).join('')}</div><label for="eqnote" class="sr">바꾸는 이유 메모</label><input id="eqnote" type="text" placeholder="메모" value="${esc(w.note || '')}"></details>`;
  const SKM = skillMap(p.build);
  h += isV2(p) ? `<p class="mini eqskills">스킬: ${skillsOf(p).map(id => esc(SKM[id].n)).join(', ')}. 트리 스킬은 방 사이에 스킬 트리에서 바꿉니다.</p>` : `<p class="mini eqskills">스킬 (만들 때 정함, 바꿀 수 없음): ${skillsOf(p).map(id => esc(SKM[id].n)).join(', ')}</p>`;
  return h;
}

/* ===== 보스 도감 (11.9절): 만난 적과 처음 겪은 일만 적힌다. 대처법은 플레이어가 메모로 남긴다 ===== */
function codexMeet(id) { const c = G.data.codex = G.data.codex || {}; c[id] = c[id] || { met: Date.now(), seen: {}, note: '' }; }
function codexMerge(b) {
  if (!b || !b.codex) return; let fresh = [];
  for (const k in b.codex) { const [id, key] = k.split('.'); codexMeet(id); const c = G.data.codex[id]; if (!c.seen[key]) { c.seen[key] = Date.now(); fresh.push((FOE_INTRO[id] || {}).n); } }
  if (fresh.length) { saveLocal(); toast('보스 도감에 새로 적혔습니다: ' + Array.from(new Set(fresh)).join(', ')); }
}
/* 캐릭터 만들기를 그만두면 아무것도 남기지 않는다 */
function cancelCreate() { G.run = null; G.sheet = null; G.creating = false; G.abandonOnCreate = false; G.cre = null; G.scr = 'title'; render(); toast('캐릭터 만들기를 그만두었습니다'); }
function beginCreate() { G.cre = { step: 'name', name: '' }; G.abandonOnCreate = !!G.data.cur; G.creating = true; G.run = null; G.sheet = null; G.b = null; G.scr = 'create'; render(); setTimeout(() => { const x = document.getElementById('cname'); if (x) x.focus(); }, 0); }
/* 캐릭터를 포기한 것으로 기록한다 (새 캐릭터를 확정할 때, 또는 직접 포기할 때) */
function abandonRun(old) {
  if (!old) return;
  const keep = G.run; G.run = old; old.result = 'abandon'; old.sealed = 1; old.endedAt = Date.now(); saveRunLocal(); syncRun(old, 'abandon'); pushRank(old, 'abandon'); G.run = keep;
}
function abandonCur() { abandonRun(G.data.cur); delete G.data.cur; saveLocal(); }
/* 기다리는 캐릭터 (10월 2일 만든 사람 결정): 챕터를 깨고 챕터 사이(정산·상점·설문·대기)에 있는 캐릭터는
   새 캐릭터를 만들어도 포기되지 않고 따로 남는다(G.data.kept). 타이틀에서 골라 이어 한다. 던전 안에 있는 캐릭터는 지금처럼 포기된다 */
const KEPT_MAX = 8;
const isBetween = c => !!(c && !runOver(c) && (c.clears || 0) > 0 && ['settle', 'shop', 'clearsv', 'wait'].includes(c.phase));
function keepCur() {
  const c = G.data.cur; if (!c) return; const K = G.data.kept = G.data.kept || [];
  K.push(c); delete G.data.cur;
  while (K.length > KEPT_MAX) abandonRun(K.shift()); // 너무 많으면 가장 오래된 캐릭터부터 포기
  saveLocal();
}
/* 되살리기 (10월 2일 만든 사람 요청): 기다리는 캐릭터 규칙이 생기기 전, 챕터를 깬 뒤 새 캐릭터를 만들어 포기된 캐릭터를
   판 기록(이 브라우저의 기록, 없으면 저장소)으로 다시 세워 기다리는 캐릭터에 넣는다. 같은 번호를 써서 랭킹의 "포기"도 돌아온다 */
const REVIVE_BEFORE = 1790940000000; // 이 규칙 전의 포기만 (이후에는 챕터 사이의 캐릭터가 포기되지 않는다)
const revivable = r => !!(r && r.result === 'abandon' && (r.clears || 0) > 0 && ['settle', 'shop', 'clearsv', 'wait'].includes(r.phase) && (r.endedAt || 0) < REVIVE_BEFORE && Array.isArray(r.inv) && Array.isArray(r.eq7) && BUILDS[r.build]);
function reviveRun(r) {
  const p = mkPlayer(r.build, {});
  const run = { id: r.id, build: r.build, boss: r.boss, startedAt: r.startedAt, room: r.roomReached || 0, p, bag: [], swaps: r.swaps || [], rooms: r.rooms || [], acts: r.acts || [], deaths: r.deaths || [], result: null, blockPicked: null, entry: null, survey: r.survey || null, drops: r.drops || [],
    stats: Object.assign({ str: 0, dex: 0, int: 0, con: 0, wil: 0 }, r.stats || {}), statGrowth: r.statGrowth, statBase: r.statBase, statPending: r.statPending || 0, statLog: r.statLog || [], pool: shuffleSeeded(FREE_POOL, 1), choices: r.choices || [], seed: 1, skills: (r.skills || []).slice(), skillLog: r.skillLog || [],
    cname: r.cname || '', ch: r.ch || 1, clears: r.clears || 0, lv: r.lv || 1, xp: r.xp || 0, gold: r.phase === 'settle' && r.settle ? r.settle.total : (r.gold || 0), playMs: r.playMs || 0, doorLog: r.doorLog || [], settle: r.settle || null, shop: null,
    phase: 'wait', surveys: r.surveys || null, discards: r.discards || [], revivedAt: Date.now() };
  run.syncedActs = run.acts.length; // 행동 기록은 이미 올라가 있다
  // 기록에는 캐릭터 상태가 없어, 이벤트·제단이 바꾼 최대 생명력을 지나온 방에서 다시 센다
  for (const x of run.rooms) { if (x.type === 'event' && ((x.event === 'chalice' && x.took === 'drink') || (x.event === 'tomb' && x.took === 'carve'))) p.hpBonus = (p.hpBonus || 0) + 5; if (x.type === 'altar' && x.took === 'blood') p.hpPen = (p.hpPen || 0) + 0.05; if (x.type === 'altar' && x.took === 'scale') p.hpPen = (p.hpPen || 0) + 0.03; }
  p.skills = run.skills.slice(); p.lv = run.lv; applyStats(p, run.stats);
  run.inv = {}; run.eqU = {}; for (const sl of EQ_SLOTS) run.eqU[sl] = null;
  const items = r.inv.filter(x => ITEMS[x.tpl]).map(x => mkItem(x.tpl, { g: x.g, b: x.b, ch: x.ch || 1 }));
  const used = () => Object.values(run.eqU);
  EQ_SLOTS.forEach((sl, i) => { const s2 = r.eq7[i]; if (!s2) return; const [tpl, g] = s2.split(':'); const it = items.find(x => x.tpl === tpl && x.g === g && !used().includes(x.uid)); if (it) run.eqU[sl] = it.uid; });
  run.bag = items.filter(x => !used().includes(x.uid)).slice(0, BAG_MAX).map(x => x.uid);
  for (const it of items) if (used().includes(it.uid) || run.bag.includes(it.uid)) run.inv[it.uid] = it;
  if (!run.eqU.weapon) { const w = mkItem('start_wpn_' + run.build, { b: 0 }); run.inv[w.uid] = w; run.eqU.weapon = w.uid; }
  applyGear(run, true); for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = flaskCap(p, fk);
  return run;
}
function reviveAdd(r) {
  const d = G.data; if ((d.cur && d.cur.id === r.id) || (d.kept || []).some(k => k.id === r.id) || (d.kept || []).length >= KEPT_MAX) return false;
  const run = reviveRun(r); (d.kept = d.kept || []).push(run);
  const keep = G.run; G.run = run; saveRunLocal(); G.run = keep; // 이 브라우저의 판 기록도 "포기"에서 돌아온다
  syncRun(run, 'clear' + (run.ch || 1)); pushRank(run, 'clear'); saveLocal();
  const msg = (run.cname || '캐릭터') + '이(가) 돌아왔습니다. 타이틀의 기다리는 캐릭터에서 이어서 합니다'; setTimeout(() => toast(msg), 900); return true; // 첫 화면을 그린 뒤에 알린다
}
function reviveLocal() { let n = 0; for (const r of (G.data.runs || []).slice()) if (revivable(r) && reviveAdd(r)) n++; return n; }
async function reviveCloud() {
  if (!G.db || !G.uid || G.conn !== 'ok') return 0; let n = 0;
  try {
    const rs = await G.db.collection('playtest/' + G.uid + '/' + COL.runs).get();
    for (const doc of rs.docs) {
      const r = Object.assign({}, doc.data()); if (!revivable(r)) continue;
      if (!r.acts && r.chunks) { const cs = await G.db.collection('playtest/' + G.uid + '/' + COL.runs + '/' + doc.id + '/acts').get(); r.acts = cs.docs.map(x => x.data()).sort((x, y) => x.i - y.i).reduce((a, x) => a.concat(x.a || []), []); }
      if (reviveAdd(r)) n++;
    }
  } catch (e) { }
  if (n) render(); return n;
}
/* 전투 저장: 내 차례가 올 때마다(그리고 전투가 끝난 순간) 전투 전체를 이어 하기 자료에 넣는다.
   행동을 누르는 순간에는 그 행동을 먼저 적어 둔다. 적의 반응을 보고 창을 닫아도, 돌아오면 같은 행동이 같은 결과로 다시 일어난다 */
function saveBattle() {
  const b = G.b; if (!b || !G.run || runOver(G.run) || G.creating || G.scr !== 'run') return;
  try {
    const snap = JSON.parse(JSON.stringify(G.run));
    const bb = Object.assign({}, b, { rngF: undefined, p: undefined, vanguardTgt: null, chainTgt: null, markTgt: null });
    snap.battle = { b: JSON.parse(JSON.stringify(bb)), commit: null, at: Date.now() };
    G.data.cur = snap; saveLocal();
  } catch (e) { }
}
function commitAct(id, tid) {
  const c = G.data.cur; if (!c || !c.battle || c.battle.b.over || G.scr !== 'run') return;
  c.battle.commit = { id, tid: tid || null }; saveLocal();
}
function monkFix(b) { const p = b.p; delete p.ctrSince; delete b.kiFastHit; delete b.kiFastTurn; if (p.stance) { delete p.stance.max; delete p.stance.half; } }
function restoreBattle(cur) {
  const bt = cur.battle; delete cur.battle;
  G.run = cur; statFix(G.run); applyGear(G.run); const b = bt.b; b.p = G.run.p; b.rngF = battleRng(b); b.stepMode = true;
  if (G.run.tree && isV2(b.p)) { treeFix(G.run); b.p.skills = v2Equip(G.run); if (!b.p.cd) resetCharges(b.p); } // 개편 전 저장본: 바뀐 스킬과 재사용 대기
  if (b.p.build === 'monk') monkFix(b); // 수도승 단순화 전 저장본: 쓰지 않는 칸을 비운다
  if (!b.queue) { b.round = b.tick || 1; b.queue = ['p']; b.bonusUsed = 0; } // 라운드 전 저장본: 지금이 내 차례
  G.b = b; G.scr = 'run'; G.sel = null; G.busy = false; G.banner = null; render();
  if (bt.commit && !b.over) { toast('누른 행동을 이어서 처리합니다'); setTimeout(() => doAct(bt.commit.id, bt.commit.tid), 60); }
  else toast('싸우던 곳에서 이어 갑니다');
}
/* 끝난 판 (10월 10일): 쓰러짐 · 보스 앞 물러남 · 포기 · 표식 도전 마침은 설문을 마치기 전(endedAt이 붙기 전)에도 끝난 판이다.
   끝난 판은 이어하기 저장본(G.data.cur)에 들어가지 않고, 메뉴에서 고칠 수 없다 */
const runOver = r => !!(r && (r.endedAt || r.sealed || r.result === 'lose' || r.result === 'flee' || r.result === 'abandon'));
const runLive = () => !!(G.run && !runOver(G.run));
/* 옛 저장본에 끝난 판이 이어하기로 들어 있으면 걸러 낸다(기록은 runs에 남아 있다) */
function curSweep() { const d = G.data; let n = 0; if (d.cur && runOver(d.cur)) { delete d.cur; n++; } if (d.kept) { const k = d.kept.filter(x => !runOver(x)); n += d.kept.length - k.length; d.kept = k; } if (n) saveLocal(); return n; }
function saveCur() { if (!G.run || runOver(G.run)) return; try { G.data.cur = JSON.parse(JSON.stringify(G.run)); saveLocal(); } catch (e) { } }
function clearCur() { delete G.data.cur; saveLocal(); }
function resumeRun() { curSweep(); if (!G.data.cur) { render(); return; } dgFix(G.data.cur); if (!G.data.cur.dg) { const r0 = JSON.parse(JSON.stringify(G.data.cur)); initGear(r0); dgInit(r0); G.data.cur = r0; } if (!G.data.cur.inv) { G.run = JSON.parse(JSON.stringify(G.data.cur)); initGear(G.run); G.data.cur = JSON.parse(JSON.stringify(G.run)); } if (G.data.cur.battle) { restoreBattle(JSON.parse(JSON.stringify(G.data.cur))); return; } G.run = JSON.parse(JSON.stringify(G.data.cur)); statFix(G.run); applyGear(G.run); if (G.run.tree && isV2(G.run.p)) { treeFix(G.run); G.run.p.skills = v2Equip(G.run); } /* 0.6a.2: 시작 스킬이 생기기 전 저장본도 시작 스킬을 끼운다 */ G.scr = G.run.phase === 'clearsv' ? 'survey' : G.run.phase || 'run'; G.b = null; G.sel = null; render(); toast('멈췄던 곳에서 이어 갑니다'); awkOpen(); }
