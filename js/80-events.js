'use strict';
function onClick(ev) {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a;
  if (G.hudEd) { hudEdClick(a, el); return; } /* 화면에서 편집하는 동안은 편집 단추만 일한다(전투는 멈춤) */
  if (G.menuOpen && !ev.target.closest('.hdr')) { G.menuOpen = false; render(); if (a === 'closebg') return; } // 펼친 메뉴 밖을 누르면 닫는다
  if (el.closest('.mnav')) G.menuOpen = false;
  playTick();
  if (el.getAttribute && el.getAttribute('aria-disabled') === 'true' && el.dataset && el.dataset.why) { toast(el.dataset.why); return; } /* 10월 7일 2차: 상점 등 쓸 수 없는 버튼의 이유 */
  if (a === 'closebg') { if (ev.target !== el) return; if (G.sheet && !['block', 'stats', 'choice', 'awk'].includes(G.sheet.kind) && !(G.sheet.kind === 'skills' && G.sheet.data.first)) { G.sheet = null; render(); } return; }
  switch (a) {
    case 'home': case 'title': if (G.creating) { cancelCreate(); break; } if (G.run && !G.run.endedAt) { saveRunLocal(); if (G.run.phase && runLive()) saveCur(); clearTimeout(syncT); syncRun(G.run, 'left').then(render); if (G.run.result !== 'lose') pushRank(G.run); } G.scr = 'title'; G.back = null; G.b = null; G.sheet = null; render(); break;
    case 'menu': if ((G.scr === 'run' || G.scr === 'scen' || G.scr === 'tut' || G.scr === 'hudsample') && G.b || window.innerWidth < 720) G.menuOpen = !G.menuOpen; else { G.data.menuFold = !G.data.menuFold; saveLocal(); } render(); break;
    case 'rank': case 'records': case 'admin': case 'goals': case 'mark': if (a === 'mark' && !markOpen()) { toast('3챕터 보스를 한 번 이기면 열립니다'); break; } if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = a; G.sheet = null; G.adminMsg = ''; if (a === 'rank') G.board = null; render(); window.scrollTo(0, 0); break;
    case 'back': G.scr = G.back || 'title'; G.back = null; render(); break;
    case 'rtab': G.rankTab = el.dataset.k; render(); break;
    case 'rmode': G.rankMode = el.dataset.k === 'hard' ? 'hard' : 'normal'; render(); break;
    case 'gmode': G.goalMode = el.dataset.k === 'hard' ? 'hard' : 'normal'; render(); break;
    case 'mtitle': { const k = el.dataset.k || ''; if (!k || titleEarned(k)) { G.data.title = k; saveLocal(); render(); } break; }
    case 'mkch': { G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; G.mk.ch = Math.max(1, Math.min(3, +el.dataset.k || 3)); render(); break; }
    case 'mkmode': { G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; if (el.dataset.k === 'hard' && !G.data.hardOpen) { toast('1챕터 보스를 한 번 이기면 열립니다'); break; } G.mk.mode = el.dataset.k === 'hard' ? 'hard' : 'normal'; render(); break; }
    case 'mktog': { G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; const k = el.dataset.k; if (!MARKS[k]) break; G.mk.ids = G.mk.ids.includes(k) ? G.mk.ids.filter(x => x !== k) : G.mk.ids.concat([k]); render(); break; }
    case 'mkgo': { if (!markOpen() || !G.mk || !G.mk.ids.length) { toast('표식을 하나 이상 고르세요'); break; } const mk = { ch: G.mk.ch, ids: G.mk.ids.slice(), mode: G.mk.mode === 'hard' && G.data.hardOpen ? 'hard' : 'normal' }; beginCreate(); G.cre.mark = mk; G.cre.mode = mk.mode; render(); window.scrollTo(0, 0); break; }
    case 'newchar': if (!G.data.tutSeen) { G.scr = 'tutoffer'; render(); window.scrollTo(0, 0); } else newcharGo(); break; // 0.6a.2: 처음 시작할 때 수련장을 권한다(한 번)
    case 'tutgo': G.data.tutSeen = 1; saveLocal(); startTut(0); break;
    case 'tutskip': G.data.tutSeen = 1; saveLocal(); newcharGo(); break;
    case 'tut': G.tutFin = false; G.b = null; G.back = null; G.scr = 'tut'; G.sheet = null; render(); window.scrollTo(0, 0); break;
    case 'tutsc': if (el.disabled) break; startTut(+el.dataset.k); break;
    case 'tutnext': tutNext(); break;
    case 'tutretry': startTut(G.tut.i); break;
    case 'tutinfo': openSheet('tutintro', { again: 1 }); break;
    case 'tutmake': G.tutFin = false; G.b = null; beginCreate(); break;
    case 'restart': { const c = G.data.cur; if (c && !isBetween(c) && !ask((c.cname || '지금 캐릭터') + '을(를) 두고 처음부터 시작할까요? 새 캐릭터를 끝까지 만들면 지금 캐릭터는 포기한 것으로 기록되고 이어 할 수 없습니다.')) break; if (c && isBetween(c)) toast((c.cname || '지금 캐릭터') + '은(는) 기다리는 캐릭터로 따로 남습니다'); beginCreate(); break; }
    case 'resumekept': { const d = G.data, i = (d.kept || []).findIndex(k => k.id === el.dataset.k); if (i < 0) break; const cur = d.cur && !runOver(d.cur) ? d.cur : null;
      if (cur && !isBetween(cur)) { toast((cur.cname || '지금 캐릭터') + '이(가) 던전에 있습니다. 그 캐릭터가 챕터를 깨거나 여정이 끝난 뒤에 바꿔 이어서 합니다'); break; }
      const k = d.kept.splice(i, 1)[0]; if (cur) d.kept.push(cur); d.cur = k; saveLocal(); resumeRun(); break; }
    case 'cnroll': { const cur = val('cname'); let n = pickR(CNAMES); for (let k = 0; k < 5 && n === cur; k++) n = pickR(CNAMES); G.cre.name = n; render(); break; }
    case 'cnok': { const n = (val('cname') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); if (!n) { toast('이름을 적거나 주사위를 눌러 주세요'); const x = document.getElementById('cname'); if (x) x.focus(); break; } G.cre.name = n; G.cre.step = 'cls'; render(); window.scrollTo(0, 0); break; }
    case 'cback': { if (el.dataset.k === 'name') { G.cre.step = 'name'; } else { G.run = null; G.sheet = null; G.cre.step = 'cls'; } render(); break; }
    case 'clspick': G.cre.pick = el.dataset.k; render(); setTimeout(() => { const d = document.querySelector('.clsdet'); if (d && d.getBoundingClientRect().bottom > window.innerHeight) d.scrollIntoView({ block: 'nearest', behavior: smoothB() }); }, 20); break;
    case 'cmode': { if (el.dataset.k === 'hard' && !G.data.hardOpen) { toast('1챕터 보스를 한 번 이기면 열립니다'); break; } G.cre = G.cre || {}; G.cre.mode = el.dataset.k; render(); break; }
    case 'start': startRun(el.dataset.b); window.scrollTo(0, 0); break;
    case 'unlall': G.data.unlAll = G.data.unlAll ? 0 : 1; saveLocal(); render(); break;
    case 'settleok': { unlNewsSeen(); const run = G.run, p = run.p, S = run.settle; if (!S || run.phase !== 'settle') break;
      if (run.markCh) { markFinish(run); break; } // 표식 도전은 보스에서 끝난다
      run.gold = S.total; p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = flaskCap(p, fk); sfx('coin');
      genShop(run); run.phase = 'shop'; G.scr = 'shop'; if ((run.ch || 1) >= AWK.settleFrom && CHAPTERS[(run.ch || 1) + 1]) awkGrant(run); saveRunLocal(); saveCur(); window.scrollTo(0, 0);
      if (run.statPending) { openSheet('stats', { pts: run.statPending, pending: 1, why: '레벨 ' + run.lv + ' · 능력치 ' + run.statPending + '점' }); } else { render(); awkOpen(); } break; }
    case 'consopen': hidePop(); openSheet('cons'); break;
    case 'consfilter': if(G.sheet && G.sheet.kind==='cons'){G.sheet.data.filter=el.dataset.k;render();} break;
    case 'consonly': if(G.sheet && G.sheet.kind==='cons'){G.sheet.data.only=!G.sheet.data.only;render();} break;
    case 'conssearch': if(G.sheet && G.sheet.kind==='cons'){G.sheet.data.query=val('consquery').trim();render();} break;
    case 'consdiscard': {if(G.b&&!G.b.over){toast('전투 밖에서 정리합니다');break;}const r=G.run,i=+el.dataset.k,c=(r.cons||[])[i];if(c&&ask(consName(c)+' '+c.n+'개를 모두 버릴까요?')){r.cons.splice(i,1);saveRunLocal();saveCur();render();}break;}
    case 'constarget': G.sel=el.dataset.k;render();break;
    case 'eqfilter': G.eqFilter=el.dataset.k;render();break;
    case 'eqorder': G.eqOrder=el.dataset.k;render();break;
    case 'eqback': G.eqSel={slot:(G.eqSel||{}).slot||'weapon'};render();eqBagReveal();break;
    case 'consuse': { const run = G.run, b = G.b && !G.b.over ? G.b : null; const why = consUse(b, run, +el.dataset.k, G.sel); if (why) { toast(why); break; } if (b && b.over) { G.sheet = null; afterTurn(b); break; } if (!b) { saveRunLocal(); saveCur(); } render(); break; }
    case 'consbuy': { const run = G.run, S = run.shop, x = S && S.cons && S.cons[+el.dataset.k]; if (!x || run.phase !== 'shop') break; if ((run.gold || 0) < x.price) { toast('골드가 모자랍니다'); break; } if (consAdd(run, x.id, 'n', 1)) { toast('가방이 가득 찼습니다. 먼저 팔거나 버려 주세요'); break; } run.gold -= x.price; S.log.push({ a: 'consbuy', id: x.id, price: x.price, t: Date.now() }); sfx('coin'); saveRunLocal(); saveCur(); render(); break; }
    case 'conssell': { const run = G.run, S = run.shop, c = (run.cons || [])[+el.dataset.k]; if (!c || !S) break; const v = consSell(c); c.n--; if (c.n <= 0) run.cons.splice(+el.dataset.k, 1); run.gold = (run.gold || 0) + v; S.log.push({ a: 'conssell', id: c.id, g: c.g, price: v, t: Date.now() }); sfx('coin'); saveRunLocal(); saveCur(); render(); break; }
    case 'buy': { const run = G.run, S = run.shop, x = S && S.stock[+el.dataset.k]; if (!x || x.sold || run.phase !== 'shop') break; if ((run.gold || 0) < x.price) { toast('골드가 모자랍니다'); break; } if (!addItem(run, x.it)) { toast('가방이 가득 찼습니다. 먼저 팔거나 버려 주세요'); break; }
      run.gold -= x.price; x.sold = 1; S.log.push({ a: 'buy', tpl: x.it.tpl, g: x.it.g, b: x.it.b, price: x.price, t: Date.now() }); sfx('coin'); toast(ITEMS[x.it.tpl].n + '을(를) 샀습니다. 가방에 넣었습니다'); saveRunLocal(); saveCur(); render(); break; }
    case 'sell': { const run = G.run, S = run.shop, it = run.inv[el.dataset.k]; if (!it || !S || run.bag.indexOf(it.uid) < 0) break; const v = sellOf(it); if (!ask(ITEMS[it.tpl].n + '을(를) ' + v + ' 골드에 팔까요?')) break;
      run.bag.splice(run.bag.indexOf(it.uid), 1); delete run.inv[it.uid]; run.gold = (run.gold || 0) + v; S.log.push({ a: 'sell', tpl: it.tpl, g: it.g, b: it.b, price: v, t: Date.now() }); sfx('coin'); toast('골드 +' + v); saveRunLocal(); saveCur(); render(); break; }
    case 'respec': { const run = G.run, S = run.shop; const cost = (run.lv || 1) * 10; const pts = statSum(run.stats); if (!S || (run.gold || 0) < cost || !pts) break; if (!ask(cost + ' 골드를 내고 능력치 ' + pts + '점을 처음부터 다시 나눌까요? 시작하면 끝까지 나눠야 합니다.')) break;
      run.gold -= cost; S.log.push({ a: 'respec', price: cost, from: Object.assign({}, run.stats), t: Date.now() }); run.stats = { str: 0, dex: 0, int: 0, con: 0, wil: 0 }; applyStats(run.p, run.stats); saveRunLocal(); saveCur(); openSheet('stats', { pts, respec: 1, why: '능력치 다시 나누기 · ' + pts + '점' }); break; }
    case 'treereset': { const run = G.run, S = run.shop; if (!S || run.phase !== 'shop' || !run.tree) break; const cost = treeResetCost(run); const n = run.tree.open.length; if (!n || (run.gold || 0) < cost) break; if (!ask(cost + ' 골드를 내고 연 칸 ' + n + '개를 모두 닫을까요? 포인트 ' + n + '점을 돌려받고, 끼운 트리 스킬도 빠집니다. 스킬 트리에서 다시 열고 끼웁니다.')) break;
      run.gold -= cost; S.log.push({ a: 'treereset', price: cost, from: run.tree.open.slice(), t: Date.now() }); treeReset(run); saveRunLocal(); saveCur(); sfx('coin'); toast('트리를 초기화했습니다. 포인트 ' + n + '점을 다시 씁니다'); G.back = G.scr; G.scr = 'tree'; G.sheet = null; render(); window.scrollTo(0, 0); break; }
    case 'nextch': { const run = G.run; if (!run || run.phase !== 'wait') break; enterChapter(run); break; }
    case 'shopleave': { const run = G.run; if (run.phase !== 'shop') break; run.phase = 'clearsv'; G.scr = 'survey'; saveRunLocal(); saveCur(); pushRank(run, 'clear'); render(); window.scrollTo(0, 0); break; }
    case 'createcancel': cancelCreate(); break;
    case 'door': chooseDoor(+el.dataset.k); break;
    case 'path': choosePath(el.dataset.k); break;
    case 'codex': openSheet('codex'); break;
    case 'toasts': openSheet('toasts'); break;
    case 'rest': { const run = G.run, p = run.p, R = roomDef();
      if (R.type === 'camp') { p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = Math.min(flaskCap(p, fk), (p.flask[fk] || 0) + 1); run.rooms.push({ room: run.room, type: 'camp' }); if ((run.ch || 1) >= AWK.campFrom) awkGrant(run); advanceFloor(); toast('불가에서 쉬었습니다. 모두 찼습니다'); render(); awkOpen(); break; }
      const sp = 0.5 * (1 + fxVal(p, 'spring', 0, (a, v) => a + v)); p.hp = Math.min(p.hpMax, p.hp + p.hpMax * sp); p.mp = Math.min(p.mpMax, p.mp + p.mpMax * sp);
      p.flask.life = Math.min(flaskCap(p, 'life'), p.flask.life + 1 + fxVal(p, 'springLife', 0, (a, v) => a + v)); p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1); p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1);
      run.rooms.push({ room: run.room, type: 'spring', spring: 1 }); advanceFloor(); toast('샘물로 상처를 씻었습니다'); render(); break; }
    case 'shrine': { const run = G.run, R = roomDef(); if (el.dataset.k === '1') { run.buffs[R.shrine] = 4; toast('성소의 힘이 3개 방 동안 함께합니다'); } run.rooms.push({ room: run.room, type: 'shrine', took: el.dataset.k === '1' ? R.shrine : null }); advanceFloor(); render(); break; }
    case 'altar': { const run = G.run, p = run.p, R = roomDef(); const yes = el.dataset.k === '1';
      if (yes && R.altar === 'offer') { openSheet('offer', {}); break; }
      if (yes && R.altar === 'blood') { p.hpPen = (p.hpPen || 0) + 0.05; applyGear(run); queueDrops([mkItem(dropKey(run, 'r'))]); }
      if (yes && R.altar === 'ash') { if (burnCons(run, 4)) { for (let k = 0; k < 2; k++) { const ids = Object.keys(CONS).filter(x => CONS[x].ch === 3 && CONS[x].use !== 'none'); consAdd(run, pickR(ids), 'm', 1); } toast('재의 제단이 소모품 넷을 태우고 둘을 내준다'); } }
      if (yes && R.altar === 'scale') { p.hpPen = (p.hpPen || 0) + 0.03; applyGear(run); run.rooms.push({ room: run.room, type: 'altar', took: 'scale' }); advanceFloor(); openSheet('stats', { pts: 1, why: '유리 저울에서 능력치 1점' }); break; }
      if (yes && R.altar === 'bone') { if (takeCons(run, 3)) { for (let k = 0; k < 2; k++) giveChCons(run, run.ch || 1); toast('뼈 제단이 소모품 셋을 받아 가고 둘을 내준다'); } }
      if (yes && R.altar === 'gold' && run.gold >= altarGold(run)) { run.gold -= altarGold(run); for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = Math.min(flaskCap(p, fk), (p.flask[fk] || 0) + 1); toast('플라스크가 하나씩 찼습니다'); }
      run.rooms.push({ room: run.room, type: 'altar', took: yes ? R.altar : null }); advanceFloor(); if (!(yes && R.altar === 'blood')) render(); break; }
    case 'gamble': { const run = G.run; if (!run || run.phase !== 'shop') break; const r = gambleDraw(run, el.dataset.k); if (r.why) { toast(r.why); break; } sfx('coin'); toast(`${(GRADE[r.it.g] || GRADE.n).n} ${(ITEMS[r.it.tpl] || {}).n || ''}이(가) 나왔습니다. 가방에 넣었습니다`); saveRunLocal(); saveCur(); render(); break; }
    case 'fate': { const run = G.run, R = run && run.cur; if (!R || R.type !== 'fate') break; const r = fateRun(run, el.dataset.k); if (!r) { toast('올릴 수 없는 장비입니다'); break; } advanceFloor(); openSheet('fateres', r); break; }
    case 'fateskip': { const run = G.run, R = run && run.cur; if (!R || R.type !== 'fate') break; run.rooms.push({ room: run.room, type: 'fate', took: null }); advanceFloor(); render(); break; }
    case 'awkpick': { const run = G.run; if (!run || !awkTake(run, el.dataset.k)) break; G.sheet = null; toast('각인: ' + AWK_MAP[el.dataset.k].n); saveRunLocal(); saveCur(); if (!awkOpen()) render(); break; }
    case 'awkview': if (!runLive()) break; hidePop(); openSheet('awkview'); break;
    case 'offerpick': { const run = G.run, it = run.inv[el.dataset.k]; if (!it) break; const up = it.g === 'n' ? 'm' : it.g === 'm' || it.g === 'r' ? 'r' : 'h'; const k2 = dropKey(run, up, [it.tpl]); discardUid(run, it.uid); G.sheet = null; run.rooms.push({ room: run.room, type: 'altar', took: 'offer', gave: it.tpl }); advanceFloor(); queueDrops([mkItem(k2)]); break; }
    case 'event': { const run = G.run, p = run.p, R = roomDef(), o = el.dataset.k; const drops = []; run.next = run.next || {};
      if (R.event === 'confess' && o === 'do') { run.next.pre = Object.assign({}, run.next.pre, { weak: 3, vuln: 3 }); drops.push(mkItem(dropKey(run, 'r'))); }
      if (R.event === 'pilgrim' && o === 'loot') { run.next.pre = Object.assign({}, run.next.pre, { poison: 3 }); drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'room')))); }
      if (R.event === 'pilgrim' && o === 'pray') p.flask.life = Math.min(flaskCap(p, 'life'), p.flask.life + 1);
      if (R.event === 'reliquary' && o === 'force') { p.st = Math.max(0, p.st - 40); if (Math.random() < 0.5) gainGold(run, 30, '성물함이 열렸습니다'); else drops.push(mkItem(dropKey(run, 'm'))); }
      if (R.event === 'chalice' && o === 'drink') { p.hpBonus = (p.hpBonus || 0) + 5; applyGear(run); p.hp = Math.max(1, p.hp - p.hpMax * 0.15); }
      if (R.event === 'chalice' && o === 'spill') p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1);
      if (R.event === 'candle' && o === 'snuff') run.buffs.snuff = 4;
      if (R.event === 'library' && o === 'sell') gainGold(run, 20, '책을 팔 곳을 찾았습니다');
      if (R.event === 'monk' && o === 'feed') { const fk = ['life', 'mana', 'stam'].sort((a, c) => (p.flask[c] || 0) - (p.flask[a] || 0))[0]; p.flask[fk] = Math.max(0, (p.flask[fk] || 0) - 1); run.next.extraDrop = (run.next.extraDrop || 0) + 1; }
      if (R.event === 'monk' && o === 'chase') run.next.chase = 1;
      if (R.event === 'bell' && o === 'pull') { run.dg.force = 'strong'; gainGold(run, 15, '종이 울립니다'); }
      if (R.event === 'tomb' && o === 'carve') { p.hpBonus = (p.hpBonus || 0) + 5; applyGear(run); run.next.pre = Object.assign({}, run.next.pre, { weak: 2, vuln: 2 }); }
      if (R.event === 'bonetrader' && o === 'gear') { const u = run.bag[0]; if (u && run.inv[u]) { const g = run.inv[u].g; discardUid(run, u); drops.push(mkItem(dropKey(run, g))); } else toast('넘길 장비가 가방에 없습니다'); }
      if (R.event === 'bonetrader' && o === 'cons') { if (takeCons(run, 3)) giveChCons(run, run.ch || 1); else toast('넘길 소모품이 모자랍니다'); }
      if (R.event === 'coffin' && o === 'break') { if (Math.random() < 0.5) drops.push(mkItem(dropKey(run, 'r'))); else { run.next.coffin = 1; toast('관 뚜껑이 안에서 밀려 올라온다'); } }
      if (R.event === 'procession' && o === 'follow') run.buffs.procession = 4;
      if (R.event === 'procession' && o === 'block') run.next.block = 1;
      if (R.event === 'master' && o === 'read') { const c = refundDeepest(run); toast(c ? SK2[c].n + ' 칸을 되돌렸습니다. 포인트 +1' : '되돌릴 칸이 없습니다'); }
      if (R.event === 'robber' && o === 'loot') { if (Math.random() < 0.5) gainGold(run, 30, '자루에서 골드가 나왔습니다'); else drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'room')))); run.next.pre = Object.assign({}, run.next.pre, { poison: ((run.next.pre || {}).poison || 0) + 3 }); }
      if (R.event === 'robber' && o === 'bury') p.flask.life = Math.min(flaskCap(p, 'life'), p.flask.life + 1);
      if (R.event === 'blackwell' && o === 'drink') { p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1); p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1); run.next.pre = Object.assign({}, run.next.pre, { vuln: 2 }); }
      if (R.event === 'camel' && o === 'loot') { const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) <= 3 && CONS[k].use !== 'none'); for (let k = 0; k < 3; k++) consAdd(run, pickR(ids), 'n', 1); n3pre(run, 'ignite', 2); toast('짐에서 소모품 셋을 찾았습니다. 다음 전투에 화상 2'); }
      if (R.event === 'camel' && o === 'bury') consAdd(run, 'sap', 'n', 1);
      if (R.event === 'oasis' && o === 'drink') { if (Math.random() < 0.5) { p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.3); toast('샘물이 상처를 씻어 낸다. 생명력 30%'); } else { n3pre(run, 'chill', 2); toast('물이 무겁게 가라앉는다. 다음 전투에 둔화 2'); } }
      if (R.event === 'oasis' && o === 'fill') consAdd(run, 'coldwater', 'n', 1);
      if (R.event === 'sundial' && o === 'turn') { run.dg.reveal = (run.dg.reveal || []).concat([run.room + 1]); run.next3 = Object.assign(run.next3 || {}, { noon: 50 }); }
      if (R.event === 'sundial' && o === 'hasten') { run.dg.force = 'strong'; gainGold(run, 25, '해가 기운다'); }
      if (R.event === 'archive' && o === 'pull') n3pre(run, 'ignite', 4);
      if (R.event === 'archive' && o === 'sweep') gainGold(run, 25, '재 속에서 금박을 쓸어 담았습니다');
      if (R.event === 'names' && o === 'call') { const gv = (G.data.graves || []).find(x => x.cname && x.id !== run.id); const g = gv ? Math.min(40, (gv.lv || 1) * 4) : 10; gainGold(run, g, gv ? gv.cname + '의 이름이 재 속에서 반짝인다' : '이름 없는 재가 흩어진다'); }
      if (R.event === 'names' && o === 'cover') run.buffs.ashcover = 4;
      if (R.event === 'glass' && o === 'take') { drops.push(mkItem(dropKey(run, 'r'))); n3pre(run, 'bleed', 3); }
      if (R.event === 'buried' && o === 'dig') { p.st = Math.max(0, p.st - 50); if (Math.random() < 0.5) { run.dg.force = 'treasure'; toast('문 너머로 보물 방이 보인다'); } else { run.next3 = Object.assign(run.next3 || {}, { ambush: 1 }); toast('모래 아래에서 무언가 깨어났다. 다음 전투는 모래 매복'); } }
      if (R.event === 'herald' && o === 'kneel') run.buffs.herald = 5;
      if (R.event === 'herald' && o === 'draw') run.next3 = Object.assign(run.next3 || {}, { herald: 1 });
      if (R.event === 'bonepipe' && o === 'blow') { run.dg.force = 'strong'; gainGold(run, 20, '피리 소리가 아래로 내려간다'); }
      run.rooms.push({ room: run.room, type: 'event', event: R.event, took: o }); advanceFloor();
      if (R.event === 'library' && o === 'read') { openSheet('stats', { pts: 1, why: '무너진 서고에서 능력치 1점' }); break; }
      if (R.event === 'archive' && o === 'pull') { if (drops.length) queueDrops(drops); openSheet('stats', { pts: 1, why: '불타는 서고에서 능력치 1점' }); break; }
      queueDrops(drops); break; }

    case 'createback': { const pick = (G.run && G.run.skills) || []; const alloc = G.sheet && G.sheet.data.alloc; openSheet('skills', { first: 1, pick: pick.slice(), alloc }); window.scrollTo(0, 0); break; }
    case 'giveup': { if (!ask('이 캐릭터를 포기할까요? 포기한 캐릭터는 이어 할 수 없습니다.')) break; abandonCur(); render(); toast('캐릭터를 포기했습니다'); break; }
    case 'blockback': if (G.run) G.run.blockOffered = false; G.sheet = null; render(); break;
    case 'giveupend': endRun('lose'); break;
    case 'scen': startScen(el.dataset.b); break;
    case 'enter': enterRoom(); break;
    case 'equip': if (!runLive()) break; G.eqSel = null; openSheet('equip'); break;
    case 'close': G.sheet = null; render(); break;
    case 'sel': if (!G.data.seenCoach && !(G.coachI > 0)) G.coachI = 1;
      if (G.busy) { if (G.stepResolve) { const r = G.stepResolve; G.stepResolve = null; r(); } return; } hidePop(); G.sel = G.sel === el.dataset.e ? null : el.dataset.e; render(); break;
    case 'act': if (el.getAttribute('aria-disabled') === 'true') { showPop(el, true); return; } hidePop(); doAct(el.dataset.id, el.dataset.t || null); break;
    case 'skipmain': { const m = document.getElementById('main'); if (m) m.focus(); break; }
    case 'skipacts': { const t = document.querySelector('.ab:not([aria-disabled="true"])') || document.querySelector('.dock [data-focus], .dock button'); if (t) t.focus(); break; }
    case 'stepnext': if (G.stepResolve) { const r = G.stepResolve; G.stepResolve = null; r(); } break;
    case 'rmotion': G.data.rm = !G.data.rm; saveLocal(); applyPrefs(); toast(G.data.rm ? '움직임을 줄였습니다' : '움직임을 되돌렸습니다'); render(); break;
    case 'fdet': G.data.fdet = !G.data.fdet; saveLocal(); render(); break;
    case 'tools': G.toolsOpen = !G.toolsOpen; render(); { const x = document.querySelector('[data-a="tools"]'); if (x) x.focus(); } break;
    case 'hudpre': hudPreset(el.dataset.k); render(); { const x = document.querySelector('[data-a="hudpre"][data-k="' + el.dataset.k + '"]'); if (x) x.focus(); } break;
    case 'hudtog': { const k = el.dataset.k; hudSet(k, !hudCfg()[k]); render(); const x = document.querySelector('[data-a="hudtog"][data-k="' + k + '"]'); if (x) x.focus(); break; }
    case 'hudmv': case 'hudmod': case 'huddev': case 'hudreset': case 'hudsheetpos': hudEditClick(a, el); break;
    case 'hudgrip': case 'hudsz': case 'hudzone': break;
    case 'hedstart': hudEdBegin(); break;
    case 'hudmode': hudModeLive(el.dataset.k); render(); { const x = document.querySelector('[data-a="hudmode"][data-k="' + el.dataset.k + '"]'); if (x) x.focus(); } break;
    case 'stsmore': G.stsMore = !G.stsMore; render(); { const x = document.querySelector('[data-a="stsmore"]'); if (x) x.focus(); } break;
    case 'numkeys': G.data.numKeys = G.data.numKeys === false; saveLocal(); toast(G.data.numKeys ? '숫자 키로 행동합니다' : '숫자 키 행동을 껐습니다'); render(); break;
    case 'infotoggle': G.infoOn = !G.infoOn; G.data.infoOn = G.infoOn; saveLocal(); hidePop(); toast(G.infoOn ? '설명 창을 켰습니다' : '설명 창을 껐습니다'); if (G.sheet && G.sheet.kind === 'settings') render(); break;
    case 'bcont': battleContinue(); break;
    case 'scennext': scenNext(); break;
    case 'retry': retryRoom(); break;
    case 'endrun': endRun('lose'); break;
    case 'survey': {
      const fun = radio('fun'), dl = radio('dl');
      finishSurvey({ fun: fun ? +fun : null, dilemma: dl, note: val('dnote'), skillWhy: radio('skw') || '', stuck: checks('stk'), confuse: checks('cf'), issues: checks('is'), issueNote: val('isnote'), hard: val('hard'), extra: val('snote'), skills: (G.run && G.run.skills) || null, fork: val('fork'), forkNote: val('forknote'), shopWhy: val('shopwhy') });
      break;
    }
    case 'final': G.scr = 'final'; render(); break;
    case 'finalsave': { G.data.final = { diff: radio('fd'), note: val('fnote'), fav: val('ffav'), again: +(radio('again') || 0) || null, board: radio('fb') || '', want: radio('want') || '', itemWhy: val('fitem'), at: Date.now() }; saveLocal(); G.scr = 'records'; render(); toast('답을 저장했습니다'); pushDb(COL.survey + '/final', G.data.final).then(render); break; }
    case 'dl': download(); break;
    case 'help': { const k = el.dataset.k || ''; if (G.sheet && G.sheet.kind === 'help') { G.sheet.data.k = k; render(); } else openSheet('help', { k }); break; }
    case 'guide': G.guideI = 0; G.afterGuide = null; G.scr = 'guide'; render(); break;
    case 'gprev': G.guideI = Math.max(0, (G.guideI || 0) - 1); render(); break;
    case 'gnext': G.guideI = (G.guideI || 0) + 1; render(); break;
    case 'gdone': G.data.seenGuide = true; saveLocal(); if (G.afterGuide === 'create') { G.afterGuide = null; beginCreate(); } else { G.scr = 'title'; render(); } break;
    case 'logopen': G.logOpen = true; render(); setTimeout(() => { const c = document.querySelector('[data-a="logclose"]'); if (c) c.focus(); }, 0); break; /* 휴대폰 기록 창: 초점을 창 안으로 */
    case 'logclose': G.logOpen = false; render(); setTimeout(() => { const c = document.querySelector('[data-a="logopen"]'); if (c && c.getClientRects().length) c.focus(); }, 0); break;
    case 'dash': loadDash(); break;
    case 'statrec': { const S = G.sheet; const al = S.data.alloc; const left = S.data.pts - statSum(al); const add = statRecommend(G.run.build, Object.fromEntries(STAT_KEYS.map(k => [k, stat(G.run.p, k) + (al[k] || 0)])), left); for (const k of STAT_KEYS) al[k] = (al[k] || 0) + add[k]; render(); break; }
    case 'statclear': { const S = G.sheet; S.data.alloc = Object.assign({}, { str: 0, dex: 0, int: 0, con: 0, wil: 0 }); render(); break; }
    case 'stat+': case 'stat-': { const S = G.sheet; const al = S.data.alloc; const k = el.dataset.k; const left = S.data.pts - statSum(al); if (a === 'stat+' && left > 0) al[k]++; if (a === 'stat-' && al[k] > 0) al[k]--; render(); break; }
    case 'statok': { const S = G.sheet; const al = S.data.alloc; const run = G.run; for (const k in al) run.stats[k] = (run.stats[k] || 0) + al[k]; applyStats(run.p, run.stats); run.statLog.push({ room: run.room, add: Object.assign({}, al), t: Date.now() }); const made = S.data.first; if (S.data.pending) run.statPending = 0; G.sheet = null; if (made) { if (G.abandonOnCreate) { if (isBetween(G.data.cur)) keepCur(); else abandonCur(); } G.creating = false; G.abandonOnCreate = false; G.cre = null; G.scr = 'run'; run.tick = Date.now(); } saveRunLocal(); saveCur(); if (made) toast('캐릭터를 만들었습니다. 첫 방 앞입니다'); render(); if (!made) awkOpen(); break; }
    case 'choose': {
      const k = el.dataset.k; const run = G.run; const S = G.sheet;
      run.choices.push({ room: S.data.room, offered: S.data.offer, picked: k || null, t: Date.now() }); run.declined = (run.declined || []).concat(S.data.offer.filter(x => x !== k)); G.sheet = null;
      if (k) { const it = mkItem(k); run.drops.push({ room: S.data.room, item: k, g: it.g, b: it.b, chest: 1, ch: run.ch || 1 }); giveItem(it); } else { saveRunLocal(); saveCur(); nextDrop(); }
      break;
    }
    case 'resume': resumeRun(); break;
    case 'admingo': { const pw = val('adminpass'); if (!G.sb) { G.adminMsg = '저장소에 연결된 뒤에 다시 해 주세요'; render(); break; } G.sb.rpc('admin_check', { pass: pw }).then(({ data: ok, error }) => { if (ok && !error) { G.owner = true; G.adminPass = pw; G.data.adminPass = pw; G.adminMsg = ''; saveLocal(); toast('관리자로 열었습니다'); loadDash(); } else { G.adminMsg = '암호가 맞지 않습니다'; render(); } }); break; }
    case 'changes': G.data.seenVer = CHANGE_VER; saveLocal(); openSheet('changes', {}); break;
    case 'code': openSheet('code', {}); break;
    case 'codeshare': { const tb = document.getElementById('codebox'); const txt = tb ? tb.value : ''; navigator.share({ title: '나락의 유산 기록', text: txt }).then(() => toast('보냈습니다'), () => {}); break; }
    case 'codecopy': { const tb = document.getElementById('codebox'); const txt = tb ? tb.value : ''; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('복사했습니다. 메신저에 붙여 넣어 보내 주세요'), () => { tb.select(); toast('글자를 길게 눌러 모두 선택한 뒤 복사해 주세요'); }); else { tb.select(); try { document.execCommand('copy'); toast('복사했습니다'); } catch (e2) { toast('글자를 길게 눌러 모두 선택한 뒤 복사해 주세요'); } } break; }
    case 'import': openSheet('import', {}); break;
    case 'impgo': { const S = G.sheet; const v = val('impbox'); if (!G.db) { S.data.msg = '공유 저장소에 연결되어야 넣습니다.'; S.data.ok = 0; render(); break; } importCode(v).then(r => { S.data.msg = (r.name || '이름 없는 지인') + '의 판 ' + r.runs + '개를 넣었습니다.'; S.data.ok = 1; render(); loadDash(); }, e2 => { S.data.msg = '넣지 못했습니다: ' + (e2 && e2.message || '알 수 없는 오류'); S.data.ok = 0; render(); }); break; }
    case 'skilltog': { const S = G.sheet; const k = el.dataset.k; const v2 = G.run && isV2(G.run.p); if (v2 && !G.run.tree.open.includes(k)) { toast('먼저 포인트로 열어야 합니다'); return; } const i = S.data.pick.indexOf(k); if (i >= 0) S.data.pick.splice(i, 1); else if (S.data.pick.length < (v2 ? EQUIP_SLOTS2 : SKILL_SLOTS)) S.data.pick.push(k); else { toast('칸이 가득 찼습니다. 먼저 하나를 빼 주세요'); return; } render(); break; }
    case 'tsel': G.tsel = el.dataset.k; render(); break;
    case 'tbr': G.tbr = el.dataset.k; render(); break;
    case 'tunlock': { const run = G.run; const id = el.dataset.k; if (!treeCanEdit()) { toast('전투 중에는 바꿀 수 없습니다'); return; } const why = treeUnlock(run, id); if (why) { toast(why); return; } run.skills = run.skills || []; if (run.skills.length < EQUIP_SLOTS2 && !run.skills.includes(id)) run.skills.push(id); run.p.skills = v2Equip(run); G.tsel = id; if (!G.creating) { saveRunLocal(); saveCur(); } toast('열었습니다: ' + SK2[id].n + (run.skills.includes(id) ? '. 끼웠습니다' : '')); render(); break; }
    case 'trefund': { const run = G.run; if (!treeCanEdit()) { toast('지금은 바꿀 수 없습니다'); return; } const why = treeRefund(run, el.dataset.k); if (why) { toast(why); break; } run.p.skills = v2Equip(run); toast('되돌렸습니다. 포인트 +1'); render(); break; }
    case 'tequip': { const run = G.run; const id = el.dataset.k; if (!treeCanEdit()) { toast('전투 중에는 바꿀 수 없습니다'); return; } run.skills = run.skills || []; const i = run.skills.indexOf(id); if (i >= 0) run.skills.splice(i, 1); else if (run.skills.length < EQUIP_SLOTS2) run.skills.push(id); else { toast('장착 칸이 가득 찼습니다. 먼저 하나를 빼 주세요'); return; } run.p.skills = v2Equip(run); (run.skillLog = run.skillLog || []).push({ room: run.room, to: run.skills.slice(), t: Date.now() }); if (!G.creating) { saveRunLocal(); saveCur(); } render(); break; }
    case 'tree': if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = 'tree'; G.sheet = null; G.menuOpen = false; render(); window.scrollTo(0, 0); break;
    case 'skillok': { const S = G.sheet; const run = G.run; const prev = (run.skills || []).slice(); if (!isV2(run.p)) run.skills = S.data.pick.slice(); run.p.skills = isV2(run.p) ? v2Equip(run) : run.skills.slice(); run.skillLog = run.skillLog || []; run.skillLog.push({ room: run.room, from: prev, to: run.skills.slice(), first: !!S.data.first, t: Date.now() }); const first = S.data.first; G.sheet = null; if (!first) { saveRunLocal(); saveCur(); } if (first) { openSheet('stats', { pts: statStartPts(run), first: 1, alloc: S.data.alloc }); window.scrollTo(0, 0); } else { toast('스킬을 바꿨습니다'); render(); } break; }
    case 'login': socialLogin(el.dataset.k); break;
    case 'loginswitch': socialLogin(el.dataset.k, true); break;
    case 'loginno': G.acct.conflict = ''; render(); break;
    case 'settings': openSheet('settings'); break;
    case 'sndtoggle': sndSet({ on: !sndCfg().on }); render(); break;
    case 'bfxtoggle': sndSet({ bfx: !sndCfg().bfx }); render(); break;
    case 'sfxtest': sfx('coin'); break;
    case 'logout': if (ask('로그아웃하면 이 기기는 새 익명 계정으로 돌아갑니다. 지금까지의 기록은 구글 계정에 남습니다. 로그아웃할까요?')) socialLogout(); break;
    case 'namesave': { G.data.name = (val('pname') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16); saveLocal(); toast('이름을 저장했습니다'); pushName(); render(); break; }
    case 'boardre': G.board = null; render(); break;
    case 'coachnext': G.coachI = (G.coachI || 0) + 1; if (G.coachI >= COACH.length) { G.data.seenCoach = true; saveLocal(); } render(); break;
    case 'coachoff': G.data.seenCoach = true; saveLocal(); render(); break;
    case 'skip': G.skip = true; if (G.stepResolve) { const r = G.stepResolve; G.stepResolve = null; r(); } break;
    case 'pace': G.pace = el.dataset.v; G.data.pace = G.pace; saveLocal(); render(); break;
    case 'deltick': { const u = el.dataset.k; const a = G.delSel || []; G.delSel = el.checked ? a.concat(a.includes(u) ? [] : [u]) : a.filter(x => x !== u); G.delAsk = false; G.delMsg = ''; render(); break; }
    case 'delask': G.delAsk = true; G.delMsg = ''; render(); break;
    case 'delno': G.delAsk = false; render(); break;
    case 'delgo': { const w = (val('delword') || '').trim(); if (w !== '지우기') { G.delMsg = '"지우기"라고 정확히 써야 지웁니다. 아무것도 지우지 않았습니다.'; render(); break; } delTesters(); break; }
    case 'dashjson': saveFile('nrk-' + VERSION + '-전체기록-' + new Date().toISOString().slice(0, 10) + '.json', dashJson()); break;
    case 'notescsv': saveFile('nrk-' + VERSION + '-의견-' + new Date().toISOString().slice(0, 10) + '.csv', notesCsv()); break;
    case 'archive': archiveAll(); break;
    case 'nf': G.nf = Object.assign({ b: 'all', t: 'all' }, G.nf || {}); G.nf[el.dataset.f] = el.dataset.v; render(); break;
    case 'nfm': G.nf = Object.assign({ b: 'all', t: 'all' }, G.nf || {}); G.nf.m = el.checked; render(); break;
    case 'pickblock': {
      const k = el.dataset.k; const run = G.run; G.sheet = null;
      run.blockPicked = k || null;
      if (k) { const it = mkItem(k); run.drops.push({ room: run.room, item: k, g: it.g, b: it.b, block: 1 }); if (!addItem(run, it)) { openSheet('bagfull', { item: it, then: 'equip' }); break; } equipUid(run, it.uid, null, 'block'); saveRunLocal(); saveCur(); }
      if (G.scr === 'run' && !G.b) { enterRoom(); } else render();
      break;
    }
    case 'dropequip': { const run = G.run; const msg = equipUid(run, el.dataset.k, el.dataset.s, 'free'); G.sheet = null; saveRunLocal(); saveCur(); toast(msg || '끼웠습니다'); nextDrop(); break; }
    case 'bfdrop': { const run = G.run; const S = G.sheet; discardUid(run, el.dataset.k); const it = S.data.item, then = S.data.then; G.sheet = null; giveItem(it, then); break; }
    case 'bfskip': { const run = G.run; const S = G.sheet; (run.discards = run.discards || []).push({ room: run.room, item: S.data.item.tpl, g: S.data.item.g, t: Date.now(), new: 1 }); G.sheet = null; saveRunLocal(); saveCur(); nextDrop(); break; }
    case 'eqsel': G.eqSel = { slot: el.dataset.k }; G.eqFilter='slot'; render(); eqReveal(); break;
    case 'eqpick': { const u = el.dataset.k,it=G.run.inv[u];if(!it)break;const kind=tplKind(it.tpl),prev=(G.eqSel||{}).slot,slot=kind==='ring'?(kindOf(prev)==='ring'?prev:'ring1'):kind; G.eqSel = G.eqSel && G.eqSel.uid === u ? { slot } : { slot, uid: u }; render(); eqReveal(); break; }
    case 'eqon': { const run = G.run; const msg = equipUid(run, el.dataset.k, el.dataset.s, 'free'); if (!msg) { G.eqSel = { slot: el.dataset.s }; saveRunLocal(); saveCur(); toast('끼웠습니다'); } else toast(msg); render(); if(!msg)eqBagReveal(); break; }
    case 'eqoff': { const run = G.run; const msg = unequipUid(run, el.dataset.k, 'free'); if (!msg) { saveRunLocal(); saveCur(); toast('가방에 넣었습니다'); } else toast(msg); render(); break; }
    case 'eqdrop': { const run = G.run; const it = run.inv[el.dataset.k]; if (!it || !ask(ITEMS[it.tpl].n + '을(를) 버릴까요? 버린 장비는 사라집니다.')) break; discardUid(run, it.uid); G.eqSel = { slot: (G.eqSel || {}).slot || 'weapon' }; saveRunLocal(); saveCur(); toast('버렸습니다'); render(); break; }
    case 'dropkeep': G.sheet = null; nextDrop(); break;
    case 'droporganize': G.sheet=null;nextDrop();if(!G.sheet){G.eqSel=null;G.eqFilter='all';openSheet('equip');eqBagReveal();}break;
    case 'dropdiscard': { const run = G.run; const it = run.inv[el.dataset.k]; if (!it || !ask(ITEMS[it.tpl].n + '을(를) 버릴까요? 버린 장비는 사라집니다.')) break; discardUid(run, it.uid); G.sheet = null; saveRunLocal(); saveCur(); toast('버렸습니다'); nextDrop(); break; }
  }
}
function onKey(ev) {
  if(ev.key==='Enter' && ev.target && ev.target.id==='consquery'){ev.preventDefault();const btn=document.querySelector('[data-a=conssearch]');if(btn)btn.click();return;}
  if (G.hudEd && hudEdKey(ev)) return;
  if (ev.key === 'Tab' && G.sheet) sheetTrap(ev);
  const typing = ev.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ev.target.tagName);
  if (ev.key === 'Enter' && ev.target && ['cname', 'adminpass', 'pname'].includes(ev.target.id)) { ev.preventDefault(); const b = document.querySelector({ cname: '[data-a=cnok]', adminpass: '[data-a=admingo]', pname: '[data-a=namesave]' }[ev.target.id]); if (b) b.click(); return; }
  if (!typing) playTick();
  if (!typing && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && ev.target && ev.target.closest && ev.target.closest('.ord, .dgbar')) { /* 순서 줄 · 던전 진행 막대: 한 칸씩 옮긴다 */
    const L = [...ev.target.closest('.ord, .dgbar').querySelectorAll('li[data-info]')]; const i = L.indexOf(ev.target);
    const n = i < 0 ? null : L[Math.max(0, Math.min(L.length - 1, i + (ev.key === 'ArrowRight' ? 1 : -1)))];
    if (n && n !== ev.target) { ev.preventDefault(); L.forEach(x => { x.tabIndex = -1; }); n.tabIndex = 0; n.focus(); }
    return;
  }
  if (!typing && ev.key.indexOf('Arrow') === 0 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey && ev.target && ev.target.closest && ev.target.closest('.clsc[data-a="clspick"]')) { /* 직업 고르기 격자: 위 · 아래는 같은 열, 왼쪽 · 오른쪽은 같은 행의 이웃 칸. Tab 순서와 aria-pressed는 그대로 */
    ev.preventDefault(); const n = clsGridNext(ev.target.closest('.clsc'), ev.key); if (n) n.focus(); return;
  }
  if (!typing && G.b && !G.sheet) {
    if ((ev.key === ' ' || ev.key === 'Enter') && G.stepResolve && !(ev.target && ev.target.tagName === 'BUTTON' && ev.target.getAttribute('aria-disabled') !== 'true')) { ev.preventDefault(); const r = G.stepResolve; G.stepResolve = null; r(); return; }
    if (/^[qwe]$/i.test(ev.key) && G.data.numKeys !== false && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !G.busy && !G.b.over) { const btn = document.querySelector('.qc[data-q="' + ({ q: 1, w: 2, e: 3 })[ev.key.toLowerCase()] + '"]'); if (btn) { ev.preventDefault(); btn.click(); } return; } /* 소모품 바로 쓰기 */
    if (/^[1-9]$/.test(ev.key) && G.data.numKeys !== false && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !G.busy && !G.b.over) { const btn = document.querySelector('.ab[data-k="' + ev.key + '"]'); if (btn) { ev.preventDefault(); if (btn.getAttribute('aria-disabled') !== 'true') { hidePop(); doAct(btn.dataset.id, btn.dataset.t || null); } else showPop(btn, true); } return; } /* 10월 7일: 설정에서 끌 수 있고, 쓸 수 없는 행동이면 이유를 보인다 */
  }
  if (ev.key !== 'Escape') return; if (POP.cur || (POP.el && POP.el.style.display === 'block')) { hidePop(); return; } /* Esc는 설명 창부터 닫는다 */ if (typing) { ev.target.blur(); return; } /* 입력칸에서는 칸만 벗어난다 */ if (G.menuOpen) { G.menuOpen = false; render(); return; } if (G.logOpen) { G.logOpen = false; render(); return; } /* 휴대폰 기록 창 */ if (G.scr === 'create' && !(G.sheet && !G.sheet.data.first)) { if (ask('캐릭터 만들기를 그만둘까요? 고른 것은 남지 않습니다.')) cancelCreate(); return; } /* 10월 8일: 묻지 않고 그만두던 것 */ if (G.sheet && !['block', 'stats', 'choice', 'awk'].includes(G.sheet.kind) && !(G.sheet.kind === 'skills' && G.sheet.data.first)) { G.sheet = null; render(); } else if (G.logOpen) { G.logOpen = false; render(); } }

