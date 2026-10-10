'use strict';
/* ===== 정산과 상점 (기획서 11.7절) ===== */
const SETTLE = { boss: [60, 90, 120], strong: 20 };
const PRICE = { n: 30, m: 70, r: 160, h: 400 }; /* 영웅(2챕터부터)은 상점 영웅 칸에서만, 전설은 팔지 않는다 (장비-경제.md 4.2 · 6.2절) */
const LEG_SELL = 150; /* 전설을 팔 때 받는 값 (챕터와 상관없이 고정) */
const SHOP_HERO = 0.4; /* 상점 진열 하나가 영웅 칸이 될 확률 (영웅이 있는 풀이 있을 때) */
const priceOf = (g, ch) => Math.round((PRICE[g] || PRICE.n) * Math.pow(1.5, (ch || 1) - 1));
const sellOf = it => it.g === 'l' ? LEG_SELL : Math.floor(priceOf(it.g, it.ch) * 0.25);
function startSettle(run) {
  const ch = run.ch || 1; const strongN = run.rooms.filter(x => x.type === 'strong' && x.res === 'win' && (x.ch || 1) === ch).length; // 이번 챕터 강적만 (next/ 0.6b에서 1챕터 강적까지 다시 세던 오류)
  const mul = fxVal(run.p, 'goldMul', 1, (a, v) => a * v);
  const lines = [{ n: '던전에서 모은 골드', v: run.gold || 0 }, { n: '보스 처치', v: Math.round(SETTLE.boss[ch - 1] * mul) }];
  if (strongN) lines.push({ n: '강적 처치 ' + strongN + '번', v: Math.round((chData(ch).settleStrong || SETTLE.strong) * strongN * mul) });
  run.settle = { ch, lines, mul, total: lines.reduce((a, x) => a + x.v, 0) };
  run.phase = 'settle'; run.cur = null; run.doors = null;
}
function vSettle() {
  const run = G.run, S = run.settle;
  return `<section class="card settle"><p class="mini">${run.ch || 1}챕터 · ${esc(chData(run.ch).n)}</p><h3>챕터를 넘었습니다${modeTag(run)}${run.markCh ? ' <span class="chip hardtag">표식 도전</span>' : ''}</h3><p class="lore">${esc(chData(run.ch).settleLore || '')}</p>
${unlNewsHtml()}${run.goalNews ? `<p class="unlnews">📋 계정 목표 표에 새로 적혔습니다: ${esc(run.goalNews)}</p>` : ''}<dl class="sgold">${S.lines.map((x, i) => `<div style="--i:${i}"><dt>${esc(x.n)}</dt><dd>${x.v}</dd></div>`).join('')}<div class="tot" style="--i:${S.lines.length}"><dt>합계</dt><dd>${S.total} 골드</dd></div></dl>
${S.mul > 1 ? '<p class="mini">보스와 강적 보상에 얻는 골드 증가가 붙었습니다.</p>' : ''}${S.loot ? `<div class="bossloot"><span class="mini">보스 전리품</span><b class="gr-${S.loot.g}">${inm(S.loot.tpl, S.loot.g)}</b>${gradeTag(S.loot.g)}<span>${S.loot.lost ? '가방이 가득 차 두고 왔습니다.' : '가방에 넣었습니다.'}</span></div>` : ''}${run.markCh ? `<p>표식 ${(run.marks || []).length}개, 표식 점수 <b>${run.markPts || 0}점</b>이 기록됩니다. 정산을 확정하면 표식 도전이 끝납니다.</p>` : `<p>정산을 확정하면 생명력·마나·스태미나와 플라스크가 모두 차고, 상점으로 갑니다.${run.statPending ? ` 보스를 넘으며 오른 레벨의 능력치 ${run.statPending}점도 이때 나눕니다.` : ''}</p>`}
<button class="gold wide" data-a="settleok" data-focus>${run.markCh ? '표식 도전 마치기' : '정산 확정'}</button></section>`;
}
/* 상점 영웅 칸 (장비-경제.md 6.2절): 다음 챕터 풀(없으면 이번 챕터 풀)에 영웅이 있으면 SHOP_HERO 확률로 진열 하나가 영웅이다. 값은 이번 챕터 영웅 값 */
function shopHero(run, ch, owned) {
  const src = [ch + 1, ch].find(c => typeof CH_POOLS !== 'undefined' && CH_POOLS[c] && CH_POOLS[c].some(k => ITEMS[k].g === 'h')); if (!src) return null;
  if (Math.random() >= SHOP_HERO) return null;
  const c = CH_POOLS[src].filter(k => ITEMS[k].g === 'h' && !owned.includes(k) && poolOk(run.p, k)); if (!c.length) return null;
  const fit = c.filter(k => classFit(run.p, k)); return { k: pickR(fit.length && Math.random() < 0.5 ? fit : c), ch: src };
}
function genShop(run) {
  const ch = run.ch || 1; const owned = Object.values(run.inv).map(x => x.tpl);
  const pool = poolOf(ch).filter(k => ITEMS[k] && ITEMS[k].kind !== 'start' && !owned.includes(k) && poolOk(run.p, k) && 'nmr'.includes(ITEMS[k].g || 'n'));
  const hero = shopHero(run, ch, owned);
  const fit = k => classFit(run.p, k); const gOf = k => ITEMS[k].g || 'n'; const take = [];
  const add = list => { const c = list.filter(k => !take.includes(k)); if (c.length) { take.push(pickR(c)); return true; } return false; };
  add(pool.filter(k => gOf(k) === 'r' && fit(k))) || add(pool.filter(k => gOf(k) === 'r')); // 희귀 1개 이상
  while (take.filter(fit).length < 3 && add(pool.filter(fit))) { } // 직업에 맞는 것 3개 이상
  while (take.length < (hero ? 5 : 6)) { const g = rollGrade(); if (!add(pool.filter(k => gOf(k) === g))) if (!add(pool)) break; }
  take.sort((a, b) => 'nmr'.indexOf(gOf(a)) - 'nmr'.indexOf(gOf(b)));
  run.shop = { ch, stock: take.map(k => { const it = mkItem(k, { ch }); return { it, price: priceOf(it.g, ch), sold: 0 }; }), log: [] };
  if (hero) { const it = mkItem(hero.k, { ch: hero.ch }); run.shop.stock.push({ it, price: priceOf('h', ch), sold: 0, hero: 1 }); }
  { const nx = ch + 1; const usable = Object.keys(CONS).filter(k => CONS[k].use !== 'none' && !SHOP_CONS.always.includes(k) && (CONS[k].ch || 1) <= nx); const pick = SHOP_CONS.always.slice(); const nw = usable.filter(k => (CONS[k].ch || 1) === nx && nx >= 2); if (nw.length) pick.push(usable.splice(usable.indexOf(nw[Math.floor(Math.random() * nw.length)]), 1)[0]); if (nx >= 3) { const nw2 = usable.filter(k => (CONS[k].ch || 1) === nx); if (nw2.length) pick.push(usable.splice(usable.indexOf(nw2[Math.floor(Math.random() * nw2.length)]), 1)[0]); } /* 3챕터 준비: 3챕터 소모품 둘 */ while (pick.length < SHOP_CONS.n + (nx >= 2 ? 1 : 0) && usable.length) pick.push(usable.splice(Math.floor(Math.random() * usable.length), 1)[0]); run.shop.cons = pick.map(id => ({ id, price: Math.round(CONS[id].price * Math.pow(1.5, ch - 1)) })); } // 소모품 다섯 가지 (10월 4일)
}
/* ===== 도박 둘과 깨달음 (10월 8일, docs/아이템/도박-깨달음.md · 장비-경제.md 6.3 · 7절) =====
   봉인된 꾸러미: 2챕터를 넘은 뒤의 상점. 칸을 골라 등급 모를 장비를 산다. 확률은 모드와 상관없이 늘 같다(가혹 모드의 영웅 가중도 걸지 않는다).
   운명의 저울: 2챕터부터 드문 방. 가방의 장비를 올려 같은 칸의 한 단계 위 장비로 바꾼다. 실패하면 잃는다.
   깨달음: 런 안에서만 남는 패시브. 정산을 확정한 뒤와 2챕터부터의 야영지에서 셋 가운데 하나. 효과는 IFX_AWK, 이름은 data/awakening.js */
const GAMBLE = { from: 2, mul: 1.3, grades: { n: 30, m: 42, r: 22, h: 5.5, l: 0.5 }, fit: 0.7, pity: 10, slots: ['weapon', 'armor', 'gloves', 'ring', 'amulet', 'flask'], slotN: { weapon: '무기', armor: '갑옷', gloves: '장갑', ring: '반지', amulet: '목걸이', flask: '플라스크' } };
const FATE = { from: 2, p: 0.045, max: 2, up: { n: 0.70, m: 0.45, r: 0.20 }, next: { n: 'm', m: 'r', r: 'h' } };
const gamblePrice = ch => Math.round(priceOf('m', ch) * GAMBLE.mul);
const gambleOn = run => !!(run && run.shop && (run.shop.ch || 1) >= GAMBLE.from);
function gambleRoll(run) {
  let x = Math.random() * 100, raw = 'n';
  for (const k of ['n', 'm', 'r', 'h', 'l']) { if (x < GAMBLE.grades[k]) { raw = k; break; } x -= GAMBLE.grades[k]; }
  const forced = (run.gambleN || 0) >= GAMBLE.pity - 1 && (raw === 'n' || raw === 'm'); /* 천장: 희귀 이상이 없던 아홉 번 뒤 열 번째는 희귀 이상. 영웅 · 전설 확률은 건드리지 않는다 */
  return { g: forced ? 'r' : raw, forced };
}
const slotKeys = (run, slot, g, src) => src.filter(k => ITEMS[k] && ITEMS[k].kind !== 'start' && tplKind(k) === slot && (ITEMS[k].g || 'n') === g && poolOk(run.p, k));
/* 슬롯과 등급으로 장비 하나. 그 등급이 그 칸에 없으면 한 등급씩 내려간다(strict면 null). 전설은 한 런에 같은 것을 두 번 주지 않는다(legSeen) */
function rollSlotItem(run, slot, g, ch, wantFit, strict) {
  const order = ['n', 'm', 'r', 'h', 'l']; const owned = Object.values(run.inv || {}).map(x => x.tpl); const seen = run.legSeen || [];
  for (let gi = order.indexOf(g); gi >= 0; gi--) {
    const gr = order[gi]; let src = poolOf(ch); if ('nmr'.includes(gr) && ch >= 2 && Math.random() < OLD_DROP) src = poolOf(ch - 1);
    let base = slotKeys(run, slot, gr, src); if (!base.length && src !== poolOf(ch)) base = slotKeys(run, slot, gr, poolOf(ch));
    if (gr === 'l') base = base.filter(k => !seen.includes(k));
    if (!base.length) { if (strict) return null; continue; }
    const fresh = base.filter(k => !owned.includes(k)); const c = fresh.length ? fresh : base;
    const fit = c.filter(k => gFit(run.p, k)), rest = c.filter(k => !gFit(run.p, k));
    const pool = wantFit ? (fit.length ? fit : c) : (rest.length ? rest : c);
    return { k: pickR(pool), g: gr };
  }
  return null;
}
/* 꾸러미의 "맞는 장비": 직업 갈래에 맞는 것(상점의 직업에 맞음) 또는 직업을 가리지 않는 공용(t: all). 쓸모없는 장비(itemFits)는 뺀다 */
const gFit = (p, k) => itemFits(p, k) && (classFit(p, k) || /(^| )all( |$)/.test((ITEMS[k] && ITEMS[k].t) || ''));
const kindSlot = tpl => tplKind(tpl) === 'ring' ? 'ring1' : tplKind(tpl);
/* 꾸러미 하나를 연다. 못 사면 { why }, 사면 { it, price } (S.gamble에 방금 연 것을 남겨 화면이 보인다) */
function gambleDraw(run, slot) {
  const S = run.shop; if (!gambleOn(run) || run.phase !== 'shop') return { why: '이 상점에는 꾸러미가 없습니다' };
  if (!GAMBLE.slots.includes(slot)) return { why: '고를 수 없는 칸입니다' };
  const ch = S.ch || 1, price = gamblePrice(ch);
  if ((run.gold || 0) < price) return { why: '골드가 ' + (price - (run.gold || 0)) + ' 모자랍니다' };
  if (bagUsed(run) >= BAG_MAX) return { why: '가방이 가득 찼습니다' };
  const r = gambleRoll(run); const got = rollSlotItem(run, slot, r.g, ch, Math.random() < GAMBLE.fit, false);
  if (!got) return { why: '이 칸에 나올 장비가 없습니다' };
  const it = mkItem(got.k); addItem(run, it); run.gold -= price;
  run.gambleN = 'rhl'.includes(it.g) ? 0 : (run.gambleN || 0) + 1;
  if (it.g === 'l') run.legSeen = (run.legSeen || []).concat([it.tpl]);
  const fit = classFit(run.p, it.tpl) ? 1 : gFit(run.p, it.tpl) ? 2 : 0;
  S.gamble = { it: Object.assign({}, it), price, fit, forced: r.forced && it.g === 'r' ? 1 : 0 };
  S.log.push({ a: 'gamble', slot, tpl: it.tpl, g: it.g, b: it.b, price, fit, forced: S.gamble.forced, t: Date.now() });
  return { it, price };
}
function fateCan(run, it) { const ng = FATE.next[it.g]; if (!ng) return '더 올릴 수 없는 등급입니다'; return slotKeys(run, tplKind(it.tpl), ng, poolOf(run.ch || 1)).length ? '' : '이 칸에는 올라갈 장비가 없습니다'; }
/* 저울에 올린다: 성공하면 같은 칸의 한 단계 위 장비로 바꾸고, 실패하면 올린 장비를 잃는다. { ok, from, to } */
function fateRun(run, uid) {
  const it = run.inv[uid]; if (!it || run.bag.indexOf(uid) < 0 || fateCan(run, it)) return null;
  const ok = Math.random() < FATE.up[it.g]; const from = { tpl: it.tpl, g: it.g, b: it.b, ch: it.ch }; const ng = FATE.next[it.g]; let to = null;
  discardUid(run, uid);
  if (ok) { const got = rollSlotItem(run, tplKind(from.tpl), ng, run.ch || 1, Math.random() < GAMBLE.fit, true); if (got) { const ni = mkItem(got.k); addItem(run, ni); to = { uid: ni.uid, tpl: ni.tpl, g: ni.g, b: ni.b, ch: ni.ch }; } }
  run.rooms.push({ room: run.room, type: 'fate', took: from.tpl + ':' + from.g, ok: to ? 1 : 0, to: to ? to.tpl + ':' + to.g : null });
  return { ok: !!to, from, to };
}
/* 깨달음: 얻을 수 있는 것 · 세 개 보이기 · 고르기 */
function awkAvail(run) { const ch = run.ch || 1; return AWK_LIST.filter(a => !(run.awk || []).includes(a.id) && (a.g === 'cls' ? a.cls === run.build : ch >= AWK.openCh[a.g])); }
function awkOfferMake(run) {
  const pool = awkAvail(run); if (!pool.length) return [];
  const cls = pool.filter(a => a.g === 'cls'); const out = [];
  if (cls.length) out.push(cls[Math.floor(Math.random() * cls.length)]);
  const rest = pool.filter(a => !out.includes(a));
  while (out.length < AWK.offer && rest.length) out.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.map(a => a.id);
}
function awkGrant(run) { run.awkPending = (run.awkPending || 0) + 1; }
function awkOpen() {
  const run = G.run; if (!run || !(run.awkPending > 0) || G.b || G.sheet) return false;
  if (!run.awkOffer || !run.awkOffer.length) { run.awkOffer = awkOfferMake(run); if (!run.awkOffer.length) { run.awkPending = 0; run.awkOffer = null; return false; } saveRunLocal(); saveCur(); }
  openSheet('awk', {}); return true;
}
function awkTake(run, id) {
  if (!(run.awkPending > 0) || !(run.awkOffer || []).includes(id) || (run.awk || []).includes(id)) return false;
  (run.awk = run.awk || []).push(id); run.p.awk = run.awk.slice(); (run.awkLog = run.awkLog || []).push({ id, ch: run.ch || 1, room: run.room, t: Date.now() });
  run.awkPending--; run.awkOffer = null; applyGear(run); return true;
}
function awkCard(id, extra) { const a = AWK_MAP[id]; if (!a) return ''; const tag = a.g === 'cls' ? esc((BUILDS[a.cls] || {}).n || '') + ' · ' + esc(a.br) : a.g === 'gift' ? '선물' : '공용'; return `<div class="awkc"><div class="awkh"><b>${esc(a.n)}</b><span class="chip">${tag}</span></div><p>${esc(a.d)}</p>${extra || ''}</div>`; }
function vGamble(run) {
  if (!gambleOn(run)) return '';
  const S = run.shop, ch = S.ch || 1, price = gamblePrice(ch), gold = run.gold || 0, full = bagUsed(run) >= BAG_MAX; const pct = v => (Math.round(v * 10) / 10) + '%';
  const sells = ['n', 'm', 'r', 'h', 'l'].map(g => (GRADE[g].n) + ' ' + (g === 'l' ? LEG_SELL : sellOf({ g, ch }))).join(', ');
  let h = `<section class="card gamble"><h4>🎁 봉인된 꾸러미</h4><p class="lore">상인이 밀랍으로 봉한 꾸러미를 내민다. 안은 열어 봐야 안다.</p><p>칸을 고르면 그 칸의 장비 하나가 가방에 들어옵니다. 등급은 열어 봐야 압니다. 값은 ${price} 골드이고 물릴 수 없습니다.</p><ul class="odds" aria-label="등급 확률">${['n', 'm', 'r', 'h', 'l'].map(g => `<li><span class="gtag gr-${g}">${GRADE[g].n}</span> ${pct(GAMBLE.grades[g])}</li>`).join('')}</ul>`;
  h += `<p class="mini">이 직업에 맞거나 공용인 장비가 나올 확률은 ${Math.round(GAMBLE.fit * 100)}%입니다(그 칸과 등급에 있을 때). 꾸러미를 열 번 여는 동안 희귀 이상이 한 번도 나오지 않으면 열 번째는 희귀 이상입니다. 지금 희귀 이상이 나오지 않은 횟수는 ${run.gambleN || 0}번입니다.</p><p class="mini">되팔 때 받는 값: ${sells} 골드.</p><div class="row">`;
  h += GAMBLE.slots.map(sl => { const why = gold < price ? '골드가 ' + (price - gold) + ' 모자랍니다' : full ? '가방이 가득 찼습니다' : ''; return adisBtn(why, 'sm' + (why ? '' : ' gold'), 'gamble', sl, GAMBLE.slotN[sl] + ' 꾸러미 ' + price + ' 골드'); }).join('') + '</div>';
  if (S.gamble) { const r = S.gamble, it = r.it, inBag = !!run.inv[it.uid]; const w = inBag && it.g === 'l' ? equipWhy(run, it.uid, kindSlot(it.tpl)) : ''; h += `<div class="gres"><h5>방금 연 꾸러미</h5>${itemDetail(it)}<p class="mini">${r.price} 골드를 냈습니다. ${r.fit === 1 ? '이 직업에 맞는 장비입니다.' : r.fit === 2 ? '직업을 가리지 않는 공용 장비입니다.' : '이 직업에는 맞지 않는 장비입니다.'}${r.forced ? ' 열 번째 보장으로 희귀가 나왔습니다.' : ''}${inBag ? ' 가방에 넣었습니다.' : ' 이 장비는 이제 가방에 없습니다.'}</p>${w ? `<p class="warn mini">${esc(w)}</p>` : ''}</div>`; }
  return h + '</section>';
}
function vFateRoom(run, h) {
  const rows = run.bag.map(u => run.inv[u]).filter(Boolean);
  return h + `<h3>⚖️ 운명의 저울</h3><p class="lore">녹슨 저울 한쪽에 접시가 비어 있다. 무언가를 올려야 기운다.</p><p>가방의 장비 하나를 올리면 같은 칸의 한 단계 위 장비로 바뀝니다. 저울이 기울지 않으면 올린 장비를 잃습니다. 골드는 걸지 않습니다.</p><ul class="odds" aria-label="올릴 때의 확률">${['n', 'm', 'r'].map(g => `<li><span class="gtag gr-${g}">${GRADE[g].n}</span> → ${GRADE[FATE.next[g]].n} ${Math.round(FATE.up[g] * 100)}%</li>`).join('')}</ul><p class="mini">영웅 이상은 올리지 못합니다. 낀 장비는 먼저 벗어야 합니다.</p>${rows.length ? `<div class="baglist">${rows.map(x => { const why = fateCan(run, x); const pr = FATE.up[x.g]; return `<div class="bagline"><div><span class="gr-${x.g}">${inm(x.tpl, x.g)}</span><br><small class="mini">${(GRADE[x.g] || GRADE.n).n} · ${why ? esc(why) : '올리면 ' + GRADE[FATE.next[x.g]].n + ' ' + Math.round(pr * 100) + '%, 못 올리면 ' + Math.round((1 - pr) * 100) + '%로 잃습니다'}</small></div>${adisBtn(why, 'sm', 'fate', x.uid, '올린다', '올릴 수 없음')}</div>`; }).join('')}</div>` : '<p class="mini">가방에 올릴 장비가 없습니다.</p>'}<button data-a="fateskip" data-focus>지나친다</button></section>`;
}
function vShop() {
  const run = G.run, S = run.shop; const cost = (run.lv || 1) * 10; const pts = statSum(run.stats);
  const tOpen = run.tree ? run.tree.open.length : 0; const tCost = treeResetCost(run);
  let h = vPlayerPanel(run.p, null);
  h += `<section class="card shop"><div class="dghead"><h3 style="margin:0">떠돌이 상인</h3><span class="gold-n">골드 ${run.gold || 0}</span></div><p class="lore">무너진 계단참에 등불 하나. 상인은 묻지 않고 값만 부른다.</p><p class="mini">진열은 챕터마다 새로 바뀝니다. 산 것은 가방에 들어갑니다. 가방 ${bagUsed(run)}/${BAG_MAX}${bagUsed(run) >= BAG_MAX ? '. 가득 차 더 살 수 없습니다' : ''}.</p><div class="shopgrid">`;
  S.stock.forEach((x, i) => {
    const why = x.sold ? '이미 샀습니다' : (run.gold || 0) < x.price ? '골드가 ' + (x.price - (run.gold || 0)) + ' 모자랍니다' : bagUsed(run) >= BAG_MAX ? '가방이 가득 찼습니다' : '';
    h += `<div class="sitem${x.sold ? ' sold' : ''}">${itemDetail(x.it, { compact: 1 })}${!x.sold && classFit(run.p, x.it.tpl) ? '<span class="tag cfit">' + esc(BUILDS[run.build].n) + '에게 맞음</span>' : ''}${x.sold ? '' : shopCmp(run, x.it)}${adisBtn(why, why ? '' : 'gold', 'buy', i, x.sold ? '샀습니다' : x.price + ' 골드에 사기')}${why && !x.sold ? `<p class="mini" aria-hidden="true">${esc(why)}</p>` : ''}</div>`;
  });
  h += `</div></section>${vGamble(run)}<section class="card"><h4>소모품</h4><p class="mini">몇 개든 삽니다. 가방 ${bagUsed(run)}/${BAG_MAX}.</p><div class="baglist">${(S.cons || []).map((x, i) => { const D = CONS[x.id]; const why = (run.gold || 0) >= x.price ? '' : '골드가 ' + (x.price - (run.gold || 0)) + ' 모자랍니다'; return `<div class="bagline"><div><b>${D.ico} ${esc(D.n)}</b><br><small class="mini">${esc(D.sit)} · ${esc(D.d(D.v))}</small></div>${adisBtn(why, 'sm' + (why ? '' : ' gold'), 'consbuy', i, x.price + ' 골드에 사기')}</div>`; }).join('')}</div>${(run.cons || []).length ? `<h4>가방의 소모품 팔기</h4><div class="baglist">${run.cons.map((c, i) => `<div class="bagline"><div><b>${CONS[c.id].ico} ${esc(consName(c))} ×${c.n}</b></div><button class="sm" data-a="conssell" data-k="${i}">하나 ${consSell(c)} 골드에 팔기</button></div>`).join('')}</div>` : ''}</section>`;
  h += `<section class="card"><h4>가방의 장비 팔기</h4><p class="mini">살 때 값의 25%를 받습니다. 낀 장비는 먼저 빼야 팝니다.</p>`;
  h += run.bag.length ? `<div class="baglist">${run.bag.map(u => { const x = run.inv[u]; return `<div class="bagline"><div><span class="gr-${x.g}">${inm(x.tpl, x.g)}</span><br><small class="mini">${(GRADE[x.g] || GRADE.n).n} · ${baseText(x)}</small></div><button class="sm" data-a="sell" data-k="${u}">${sellOf(x)} 골드에 팔기</button></div>`; }).join('')}</div>` : '<p class="mini">가방이 비어 있습니다.</p>';
  h += `</section><section class="card"><h4>떠나기 전에</h4><div class="row"><button data-a="equip">장비 바꾸기</button>${adisBtn(!pts ? '나눈 능력치가 없습니다' : (run.gold || 0) < cost ? '골드가 ' + (cost - (run.gold || 0)) + ' 모자랍니다' : '', '', 'respec', null, '능력치 다시 나누기 (' + cost + ' 골드)')}${run.tree ? adisBtn(!tOpen ? '연 칸이 없습니다' : (run.gold || 0) < tCost ? '골드가 ' + (tCost - (run.gold || 0)) + ' 모자랍니다' : '', '', 'treereset', null, '트리 초기화 (' + tCost + ' 골드)') : ''}</div><p class="mini">능력치 다시 나누기: 나눈 ${pts}점을 거두어 처음부터 다시 나눕니다. 값은 레벨 × 10골드입니다.</p>${run.tree ? `<p class="mini">트리 초기화: 연 칸 ${tOpen}개를 모두 닫고 포인트를 돌려줍니다. 끼운 트리 스킬도 빠집니다. 값은 연 칸 하나에 ${Math.round(TREE_RESET.cell * Math.pow(1.5, (run.ch || 1) - 1))}골드입니다.</p>` : ''}<p class="mini">남은 골드는 다음 챕터로 가져갑니다.</p></section><div class="stickbar shopbar"><span class="gold-n">골드 ${run.gold || 0}</span><span class="mini">가방 ${run.bag.length}/${BAG_MAX}</span><button class="gold" data-a="shopleave">상점을 나선다</button></div>`;
  return h;
}
/* 쓸 수 없어도 초점이 가는 버튼 (10월 7일 2차): disabled 대신 aria-disabled, 이유는 읽는 이름에 넣고 누르면 알림으로 */
function adisBtn(why, cls, a, k, lab, no) { return `<button class="${(cls || '') + (why ? ' adis' : '')}" data-a="${a}"${k != null ? ` data-k="${k}"` : ''}${why ? ` aria-disabled="true" data-why="${esc(why)}" aria-label="${esc(lab + ', ' + (no || '살 수 없음') + ': ' + why)}"` : ''}>${esc(lab)}</button>`; }
/* 상점 진열 장비를 지금 낀 것과 비교한다(장비 창과 같은 compareHtml). 반지는 빈 칸이 있으면 그 칸, 둘 다 차 있으면 두 칸 모두 */
function shopCmp(run, it) {
  initGear(run); const kind = tplKind(it.tpl);
  const slots = kind === 'ring' ? (!run.eqU.ring1 ? ['ring1'] : !run.eqU.ring2 ? ['ring2'] : ['ring1', 'ring2']) : [kind];
  const fake = { p: run.p, inv: Object.assign({}, run.inv, { __shop: it }), eqU: run.eqU, bag: run.bag };
  return slots.map(sl => (slots.length > 1 ? `<p class="mini">${EQ_SLOT_N[sl]} 대신 끼면</p>` : '') + compareHtml(fake, '__shop', sl)).join('');
}
/* 다음 챕터로 (10월 5일, 1~3챕터 작업): 정산 · 상점 · 설문을 지난 캐릭터가 장비 · 골드 · 레벨 · 트리를 그대로 들고 다음 챕터 1층으로 */
/* 챕터에 들어설 때 직업마다 받는 선물 (data/awakening.js CH_GIFT). quiet이면 알리지 않는다(이어하기에서 옛 저장본을 채울 때) */
function chGift(run, ch, quiet) {
  const id = CH_GIFT[ch] && CH_GIFT[ch][run.build]; if (!id || (run.awk || []).includes(id)) return false;
  (run.awk = run.awk || []).push(id); run.p.awk = run.awk.slice(); (run.awkLog = run.awkLog || []).push({ id, ch, room: run.room, gift: 1, t: Date.now() });
  if (!quiet) toast('깨달음을 얻었습니다: ' + AWK_MAP[id].n); return true;
}
function enterChapter(run) {
  const nx = (run.ch || 1) + 1; if (!CHAPTERS[nx]) return false;
  const keepDoors = run.doorLog || []; run.ch = nx; run.boss = chData(nx).boss; run.phase = null; run.settle = null; run.shop = null; run.result = null;
  delete run.dg; dgInit(run); chGift(run, nx, true); run.doorLog = keepDoors; (run.chLog = run.chLog || []).push({ ch: nx, lv: run.lv, gold: run.gold, t: Date.now() });
  G.scr = 'run'; G.b = null; G.sel = null; saveRunLocal(); saveCur(); render(); toast(nx + '챕터 · ' + chData(nx).n); if (chData(nx).enterLore) toast(chData(nx).enterLore); if ((run.awkLog || []).some(x => x.gift && x.ch === nx)) toast('깨달음을 얻었습니다: ' + AWK_MAP[run.awkLog.filter(x => x.gift && x.ch === nx)[0].id].n); return true;
}
function vWait() {
  const run = G.run; const ch = run.ch || 1, nx = ch + 1;
  if (CHAPTERS[nx]) return `<section class="card hero waitc"><p class="mini">${esc(run.cname || '')} · ${ch}챕터 돌파</p><h2>${nx}챕터 · ${esc(chData(nx).n)}</h2><p class="lore">${esc(chData(nx).enterLore || chData(ch).nextLore || '')}</p><p>장비 · 골드 · 레벨 · 스킬 트리를 그대로 들고 ${nx}챕터 1층으로 내려갑니다. 적은 더 거세고, 처음 보는 적과 강적이 기다립니다.</p><div class="row waitbtn"><button class="gold" data-a="nextch" data-focus>${nx}챕터로 내려간다</button><button data-a="equip">장비</button><button data-a="tree">스킬 트리</button><button data-a="title">타이틀로</button></div></section>`;
  return `<section class="card hero waitc"><p class="mini">${esc(run.cname || '')} · ${ch}챕터 돌파</p><h2>${nx}챕터 준비 중</h2><p class="lore">${esc(chData(ch).nextLore || '')}</p><p>${nx}챕터는 아직 준비 중입니다. 이 캐릭터는 여기에서 기다리고, ${nx}챕터가 열리면 지금 장비와 골드 그대로 이어서 내려갑니다. 랭킹에는 "${ch}챕터 돌파"로 올라갔습니다.</p><div class="row waitbtn"><button class="gold" data-a="title">타이틀로</button><button data-a="rank">랭킹 보기</button><button data-a="equip">장비</button></div></section>`;
}

