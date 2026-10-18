'use strict';
function onClick(ev) {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a;
  if (G.cloud && G.cloud.loading && !['menu', 'help', 'changes', 'settings', 'sndtoggle', 'close', 'closebg'].includes(a)) { toast('계정 세이브를 불러오는 중입니다. 잠시 기다려 주세요.'); return; }
  if (G.hudEd) { hudEdClick(a, el); return; } /* 화면에서 편집하는 동안은 편집 단추만 일한다(전투는 멈춤) */
  if (G.menuOpen && !ev.target.closest('.hdr')) { G.menuOpen = false; render(); if (a === 'closebg') return; } // 펼친 메뉴 밖을 누르면 닫는다
  if (el.closest('.mnav')) G.menuOpen = false;
  playTick();
  if (el.getAttribute && el.getAttribute('aria-disabled') === 'true' && el.dataset && el.dataset.why) { toast(el.dataset.why); return; } /* 10월 7일 2차: 상점 등 쓸 수 없는 버튼의 이유 */
  if (a === 'closebg') { if (ev.target !== el) return; if (G.sheet && !['block', 'choice', 'ks', 'alloc', 'bagfull'].includes(G.sheet.kind) && !(G.sheet.kind === 'skills' && G.sheet.data.first)) { G.sheet = null; render(); } return; }
  switch (a) {
    case 'cptoggle': { if (!G.sheet || G.sheet.kind !== 'consfull') break; const d = G.sheet.data, i = +el.dataset.k; d.skip = d.skip || []; d.skip = d.skip.includes(i) ? d.skip.filter(x => x !== i) : d.skip.concat([i]); render(); break; }
    case 'patrolpick': patrolPick(el.dataset.k); break; // 0.8.0 6단계 A-6
    case 'cptake': { const run = G.run; if (!run || !G.sheet || G.sheet.kind !== 'consfull' || G.b) break; const skip = G.sheet.data.skip || []; consTakePending(run, skip); G.sheet = null; saveRunLocal(); saveCur(); nextDrop(); break; }
    case 'cpkeep': case 'cpskip': case 'cpreplace': {
      const run=G.run;
      if (!run || !G.sheet || G.sheet.kind!=='consfull' || !(run.consPending || []).length || G.b) break;
      if (a==='cpskip') { const c=run.consPending.shift(); (run.consGainLog || (run.consGainLog=[])).push({ch:run.ch || 1,room:run.room,id:c.id,g:c.g,n:c.n,discarded:c.n,t:Date.now()}); }
      if (a==='cpreplace') {
        if (el.dataset.s==='cons') {
          const i=+el.dataset.k,c=run.cons[i];
          if (!c || !ask(consName(c)+' ×'+c.n+' 묶음을 버릴까요?')) break;
          run.cons.splice(i,1);
          saveRunLocal(); saveCur(); render(); break; // 10월 14일 개편 5단계: 버리기는 자리만 만들고 전리품 화면에 남는다. 챙기기는 [챙기기]로
        } else break; // 10월 14일: 소모품 가방이 나뉘어 장비를 버려도 소모품 칸이 생기지 않는다(장비만 잃는 것을 막는다)
      }
      consPendingTry(run); G.sheet=null;saveRunLocal();saveCur();nextDrop();break;
    }
    case 'home': case 'title': if (G.creating) { cancelCreate(); break; } if (G.run && !G.run.endedAt) { saveRunLocal(); if (G.run.phase && runLive()) saveCur(); clearTimeout(syncT); syncRun(G.run, 'left').then(render); if (G.run.result !== 'lose') pushRank(G.run); } G.scr = 'title'; G.back = null; G.b = null; G.sheet = null; render(); break;
    case 'menu': if ((G.scr === 'run' || G.scr === 'scen' || G.scr === 'tut' || G.scr === 'hudsample') && G.b || window.innerWidth < 720) G.menuOpen = !G.menuOpen; else { G.data.menuFold = !G.data.menuFold; saveLocal(); } render(); break;
    case 'rank': case 'records': case 'admin': case 'goals': case 'mark': if (a === 'mark' && !markOpen()) { toast('3챕터 보스를 한 번 이기면 열립니다'); break; } if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = a; G.sheet = null; G.adminMsg = ''; if (a === 'rank') G.board = null; render(); window.scrollTo(0, 0); break;
    case 'back': G.scr = G.back || 'title'; G.back = null; render(); break;
    case 'rkdeadinclude': G.rankIncludeDead = el.checked; render(); break;
    case 'rtab': G.rankTab = el.dataset.k; render(); break;
    case 'rmode': G.rankMode = el.dataset.k === 'hard' ? 'hard' : 'normal'; render(); break;
    case 'gmode': G.goalMode = el.dataset.k === 'hard' ? 'hard' : 'normal'; render(); break;
    case 'mtitle': { const k = el.dataset.k || ''; if (!k || titleEarned(k)) { G.data.title = k; saveLocal(); render(); } break; }
    case 'mkch': { G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; G.mk.ch = Math.max(1, Math.min(3, +el.dataset.k || 3)); render(); break; }
    case 'mkmode': { G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; if (el.dataset.k === 'hard' && !G.data.hardOpen) { toast('1챕터 보스를 한 번 이기면 열립니다'); break; } G.mk.mode = el.dataset.k === 'hard' ? 'hard' : 'normal'; render(); break; }
    case 'mktog': { G.mk = G.mk || { ch: 3, mode: 'normal', ids: [] }; const k = el.dataset.k; if (!MARKS[k]) break; G.mk.ids = G.mk.ids.includes(k) ? G.mk.ids.filter(x => x !== k) : G.mk.ids.concat([k]); render(); break; }
    case 'mkgo': { if (!markOpen() || !G.mk || !G.mk.ids.length) { toast('표식을 하나 이상 고르세요'); break; } const mk = { ch: G.mk.ch, ids: G.mk.ids.slice(), mode: G.mk.mode === 'hard' && G.data.hardOpen ? 'hard' : 'normal' }; if(!beginCreate())break; G.cre.mark = mk; G.cre.mode = mk.mode; render(); window.scrollTo(0, 0); break; }
    case 'newchar': if (!G.data.tutSeen) { G.scr = 'tutoffer'; render(); window.scrollTo(0, 0); } else newcharGo(); break; // 0.6a.2: 처음 시작할 때 수련장을 권한다(한 번)
    case 'tutgo': G.data.tutSeen = 1; saveLocal(); startTut(0); break;
    case 'tutskip': G.data.tutSeen = 1; saveLocal(); newcharGo(); break;
    case 'tut': G.tutFin = false; G.b = null; G.back = null; G.scr = 'tut'; G.sheet = null; render(); window.scrollTo(0, 0); break;
    case 'tutsc': if (el.disabled) break; startTut(+el.dataset.k); break;
    case 'tutnext': tutNext(); break;
    case 'tutretry': startTut(G.tut.i); break;
    case 'tutinfo': openSheet('tutintro', { again: 1 }); break;
    case 'tutmake': G.tutFin = false; G.b = null; beginCreate(); break;
    case 'restart': beginCreate(); break;
    case 'resumekept': { const d = G.data, i = (d.kept || []).findIndex(k => k.id === el.dataset.k); if (i < 0) break; const cur = d.cur && !runOver(d.cur) ? d.cur : null;
      const oldKept=d.kept.slice(),oldCur=d.cur;const k = d.kept.splice(i, 1)[0]; if (cur) d.kept.push(cur); d.cur = k;
      if(!saveLocal()){d.kept=oldKept;d.cur=oldCur;render();toast(localSaveReason()+' 캐릭터를 바꾸지 않았습니다.');break;} resumeRun(); break; }
    case 'saveabandon': {const d=G.data,k=d.cur&&d.cur.id===el.dataset.k?d.cur:(d.kept||[]).find(c=>c.id===el.dataset.k);if(!k||!ask((k.cname||'이 캐릭터')+'의 여정을 포기할까요? 이 캐릭터는 다시 이어할 수 없습니다.'))break;abandonRun(k);if(d.cur&&d.cur.id===k.id)delete d.cur;d.kept=(d.kept||[]).filter(c=>c.id!==k.id);if(G.run&&G.run.id===k.id){G.run=null;G.b=null;}saveLocal();render();break;}
    case 'cnroll': { const cur = val('cname'); let n = pickR(CNAMES); for (let k = 0; k < 5 && n === cur; k++) n = pickR(CNAMES); G.cre.name = n; render(); break; }
    case 'cnok': { const n = (val('cname') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); if (!n) { toast('이름을 적거나 주사위를 눌러 주세요'); const x = document.getElementById('cname'); if (x) x.focus(); break; } G.cre.name = n; G.cre.step = 'cls'; render(); window.scrollTo(0, 0); break; }
    case 'cback': { if (el.dataset.k === 'name') { G.cre.step = 'name'; } else { G.run = null; G.sheet = null; G.cre.step = 'cls'; } render(); break; }
    case 'clspick': G.cre.pick = el.dataset.k; render(); setTimeout(() => { const d = document.querySelector('.clsdet'); if (d && d.getBoundingClientRect().bottom > window.innerHeight) d.scrollIntoView({ block: 'nearest', behavior: smoothB() }); }, 20); break;
    case 'cmode': { if (el.dataset.k === 'hard' && !G.data.hardOpen) { toast('1챕터 보스를 한 번 이기면 열립니다'); break; } G.cre = G.cre || {}; G.cre.mode = el.dataset.k; render(); break; }
    case 'start': startRun(el.dataset.b); window.scrollTo(0, 0); break;
    case 'unlall': G.data.unlAll = G.data.unlAll ? 0 : 1; saveLocal(); render(); break;
    case 'settleok': { unlNewsSeen(); const run = G.run, p = run.p, S = run.settle; if (!S || run.phase !== 'settle') break; if(run.gearPending){nextDrop();break;}
      if (run.markCh) { markFinish(run); break; } // 표식 도전은 보스에서 끝난다
      run.gold = S.total; p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = flaskCap(p, fk); sfx('coin');
      genShop(run); run.phase = 'shop'; G.scr = 'shop'; if (CHAPTERS[(run.ch || 1) + 1] && isV2(p)) ksGrant(run, 'b' + (run.ch || 1)); /* 10월 16일 0.8.0 2단계: 1 · 2챕터 정산 뒤 큰 각인 */ saveRunLocal(); saveCur(); window.scrollTo(0, 0);
      render(); ksOpen(); break; }
    case 'eqlock': { const it=G.run && G.run.inv[el.dataset.k];if(it){it.locked=!it.locked;it.fresh=false;saveRunLocal();saveCur();render();}break; }
    case 'consfavremove': {G.run.consFav=(G.run.consFav||[]).filter(k=>k!==el.dataset.k);saveRunLocal();saveCur();render();break;}
    case 'consfav': {const c=(G.run.cons||[])[+el.dataset.k];const why=toggleConsFavorite(G.run,c);if(why)toast(why);else{saveRunLocal();saveCur();render();}break;}
    case 'consseen': {const c=(G.run.cons||[])[+el.dataset.k];if(c){c.fresh=false;saveRunLocal();saveCur();render();}break;}
    case 'consopen': hidePop(); openSheet('cons'); break;
    case 'consfilter': if(G.sheet && G.sheet.kind==='cons'){G.sheet.data.filter=el.dataset.k;render();} break;
    case 'consonly': if(G.sheet && G.sheet.kind==='cons'){G.sheet.data.only=!G.sheet.data.only;render();} break;
    case 'consbrew': { const run = G.run, id = el.dataset.k, s = consBrewOf(run, id), why = consBrew(run, id); if (why) { toast(why); break; } toast(CONS[id].n + ' ' + s.need + '개로 ' + s.name + ' 한 칸을 채웠습니다 (' + (s.cur + 1) + '/' + s.cap + ')'); saveRunLocal(); saveCur(); render(); break; }
    case 'consfind': if(G.sheet && G.sheet.kind==='cons'){const d=G.sheet.data;d.find=!(d.find||d.query);if(!d.find)d.query='';render();if(d.find&&typeof document!=='undefined'){const q=document.getElementById('consquery');if(q)q.focus();}} break;
    case 'consrow': if(G.sheet && G.sheet.kind==='cons'){const d=G.sheet.data,k=el.dataset.k;d.open=d.open===k?null:k;let seen=false;for(const c of G.run.cons||[])if(c.id+':'+consGrade(c.id,c.g)===k&&c.fresh){c.fresh=false;seen=true;}if(seen){saveRunLocal();saveCur();}render();} break;
    case 'conssearch': if(G.sheet && G.sheet.kind==='cons'){G.sheet.data.query=val('consquery').trim();render();} break;
    case 'consdiscard': {if(G.b&&!G.b.over){toast('전투 밖에서 정리합니다');break;}const r=G.run,i=+el.dataset.k,c=(r.cons||[])[i];if(c&&ask(consName(c)+' '+c.n+'개를 모두 버릴까요?')){r.cons.splice(i,1);saveRunLocal();saveCur();render();}break;}
    case 'constarget': G.sel=el.dataset.k;render();break;
    case 'eqfilter': G.eqFilter=el.dataset.k;render();break;
    case 'eqorder': G.eqOrder=el.dataset.k;render();break;
    case 'eqback': G.eqSel={slot:(G.eqSel||{}).slot||'weapon'};render();eqBagReveal();break;
    case 'consuse': { const run = G.run, b = G.b && !G.b.over ? G.b : null; const why = consUse(b, run, +el.dataset.k, G.sel); if (why) { toast(why); break; } if (b && b.over) { G.sheet = null; afterTurn(b); break; } if (!b) { saveRunLocal(); saveCur(); } render(); break; }
    case 'campleave': { const run = G.run, R = roomDef(); if (!run || R.type !== 'camp') break; const C = campInit(run); if (!C.rested && !ask('쉬지 않고 내려갈까요? 생명력과 플라스크를 채우지 못합니다.')) break; run.rooms.push({ room: run.room, type: 'camp', rested: C.rested, bought: (C.log || []).length, mul: C.mul }); (run.campHist || (run.campHist = [])).push(C); run.camp = null; advanceFloor(); render(); break; }
    case 'consbuyfill': { const run = G.run, S = el.dataset.s === 'camp' ? run.camp : run.shop, x = S && S.cons && S.cons[+el.dataset.k]; const n = consFillN(run, x); let got = 0, why = ''; for (let j = 0; j < n; j++) { why = consBuy(run, x); if (why) break; got++; } if (!got) { toast(why || '지금은 살 수 없습니다'); break; } sfx('coin'); toast(CONS[x.id].n + ' ' + got + '개를 샀습니다'); saveRunLocal(); saveCur(); render(); break; }
    case 'consbuy': { const run = G.run, S = el.dataset.s === 'camp' ? run.camp : run.shop, x = S && S.cons && S.cons[+el.dataset.k]; const why = consBuy(run, x); if (why) { toast(why); break; } sfx('coin'); saveRunLocal(); saveCur(); render(); break; }
    case 'conssell': { const run = G.run, S = run.shop, c = (run.cons || [])[+el.dataset.k]; if (!c || !S) break; const v = consSell(c); c.n--; if (c.n <= 0) run.cons.splice(+el.dataset.k, 1); run.gold = (run.gold || 0) + v; S.log.push({ a: 'conssell', id: c.id, g: c.g, price: v, t: Date.now() }); sfx('coin'); saveRunLocal(); saveCur(); render(); break; }
    case 'buy': { const run = G.run, S = run.shop, x = S && S.stock[+el.dataset.k]; if (!x || x.sold || run.phase !== 'shop') break; if ((run.gold || 0) < x.price) { toast('골드가 모자랍니다'); break; } if (!addItem(run, x.it)) { toast('가방이 가득 찼습니다. 먼저 팔거나 버려 주세요'); break; }
      run.gold -= x.price; x.sold = 1; S.log.push({ a: 'buy', tpl: x.it.tpl, g: x.it.g, b: x.it.b, price: x.price, t: Date.now() }); sfx('coin'); toast(ITEMS[x.it.tpl].n + '을(를) 샀습니다. 가방에 넣었습니다'); saveRunLocal(); saveCur(); render(); break; }
    case 'sell': { const run = G.run, S = run.shop, it = run.inv[el.dataset.k]; if(itemRemoveWhy(run,it&&it.uid)){toast(itemRemoveWhy(run,it.uid));break;} if (!it || !S || run.bag.indexOf(it.uid) < 0) break; const v = sellOf(it); if (!ask(ITEMS[it.tpl].n + '을(를) ' + v + ' 골드에 팔까요?')) break;
      run.bag.splice(run.bag.indexOf(it.uid), 1); delete run.inv[it.uid]; run.gold = (run.gold || 0) + v; S.log.push({ a: 'sell', tpl: it.tpl, g: it.g, b: it.b, price: v, t: Date.now() }); sfx('coin'); toast('골드 +' + v); saveRunLocal(); saveCur(); render(); break; }
    case 'respec': { const run = G.run, S = run.shop; if (!S || run.phase !== 'shop' || !run.ptree) break; const cost = ptResetCost(run), n = run.ptree.own.length; if (!n || (run.gold || 0) < cost) break; if (!ask(cost + ' 골드를 내고 포인트로 찍은 패시브 노드 ' + n + '개를 모두 되돌릴까요? 큰 각인과 보너스 노드는 남습니다.')) break; // 10월 16일 0.8.0 2단계: 패시브 되돌리기(레벨 × 10)
      run.gold -= cost; S.log.push({ a: 'respec', price: cost, from: run.ptree.own.slice(), t: Date.now() }); ptReset(run); saveRunLocal(); saveCur(); sfx('coin'); toast('패시브 포인트 ' + run.ptree.pts + '점을 다시 찍습니다'); G.back = G.scr; G.scr = 'tree'; G.tview = 'p'; G.sheet = null; render(); window.scrollTo(0, 0); break; }
    case 'treereset': { const run = G.run, S = run.shop; if (!S || run.phase !== 'shop' || !run.atree) break; const cost = atResetCost(run); const n = run.atree.own.length; if (!n || (run.gold || 0) < cost) break; if (!ask(cost + ' 골드를 내고 연 액티브 노드 ' + n + '개를 모두 닫을까요? 포인트 ' + n + '점을 돌려받고, 끼운 트리 스킬도 빠집니다.')) break;
      run.gold -= cost; S.log.push({ a: 'treereset', price: cost, from: run.atree.own.slice(), t: Date.now() }); atReset(run); saveRunLocal(); saveCur(); sfx('coin'); toast('액티브 트리를 되돌렸습니다. 포인트 ' + n + '점을 다시 씁니다'); G.back = G.scr; G.scr = 'tree'; G.tview = 'a'; G.sheet = null; render(); window.scrollTo(0, 0); break; }
    case 'nextch': { const run = G.run; if (!run || run.phase !== 'wait') break; enterChapter(run); break; }
    case 'shopleave': { const run = G.run; if (run.phase !== 'shop') break; run.phase = 'clearsv'; G.scr = 'survey'; saveRunLocal(); saveCur(); pushRank(run, 'clear'); render(); window.scrollTo(0, 0); break; }
    case 'createcancel': cancelCreate(); break;
    case 'door': chooseDoor(+el.dataset.k); break;
    case 'path': choosePath(el.dataset.k); break;
    case 'codex': openSheet('codex'); break;
    case 'itembook': openSheet('itembook', {type:'gear',q:'',ch:'all',group:'all',grade:'all',page:0}); break;
    case 'ibopen': case 'ibback': case 'ibpage': case 'ibtype': case 'ibreset': itemBookClick(a,el); break;
    case 'toasts': openSheet('toasts'); break;
    case 'rest': { const run = G.run, p = run.p, R = roomDef();
      if (R.type === 'camp') { const C = campInit(run); if (C.rested) break; C.rested = 1; p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax; for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = Math.min(flaskCap(p, fk), (p.flask[fk] || 0) + 1); saveRunLocal(); saveCur(); toast('불가에서 쉬었습니다. 모두 찼습니다'); render(); ksOpen(); break; } // 10월 14일 개편 5단계: 쉬어도 야영지에 남는다(떠나기는 campleave)
      const sp = 0.5 * (1 + fxVal(p, 'spring', 0, (a, v) => a + v)); p.hp = Math.min(p.hpMax, p.hp + p.hpMax * sp); p.mp = Math.min(p.mpMax, p.mp + p.mpMax * sp);
      p.flask.life = Math.min(flaskCap(p, 'life'), p.flask.life + 1 + fxVal(p, 'springLife', 0, (a, v) => a + v)); p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1); p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1);
      run.rooms.push({ room: run.room, type: 'spring', spring: 1 }); advanceFloor(); toast('샘물로 상처를 씻었습니다'); render(); break; }
    case 'shrine': { const run = G.run, R = roomDef(); if (el.dataset.k === '1') { run.buffs[R.shrine] = 4; toast('성소의 힘이 3개 방 동안 함께합니다'); } run.rooms.push({ room: run.room, type: 'shrine', took: el.dataset.k === '1' ? R.shrine : null }); advanceFloor(); render(); break; }
    case 'altar': { const run=G.run,p=run.p,R=roomDef(),yes=el.dataset.k==='1';
      if(yes && R.altar==='offer'){openSheet('offer',{});break;}
      const paid=[],received=[],drops=[];const hpBefore=p.hpMax, gainBefore=(run.consGainLog||[]).length;
      if(yes && R.altar==='blood'){p.hpPen=(p.hpPen||0)+.05;applyGear(run);paid.push('최대 생명력 '+hpBefore+' → '+p.hpMax+' (이 캐릭터가 끝날 때까지)');const it=mkItem(dropKey(run,'r'));drops.push(it);received.push((GRADE[it.g]||GRADE.n).n+' '+ITEMS[it.tpl].n);}
      if(yes && (R.altar==='ash'||R.altar==='bone')){
        const cost=altarConsCost(run,R.altar);if(!cost.length){toast('바칠 소모품이 모자랍니다');break;}
        paid.push(...cost);
        if(R.altar==='ash'){burnCons(run,4);for(let k=0;k<2;k++){const ids=Object.keys(CONS).filter(x=>CONS[x].ch===3&&CONS[x].use!=='none');consGrant(run,pickR(ids),'m',1);}}
        else {takeCons(run,3);for(let k=0;k<2;k++)giveChCons(run,run.ch||1);}
        received.push(...(run.consGainLog||[]).slice(gainBefore).map(c=>consName(c)+' ×'+c.n+(c.pending?' (가방 정리 후 선택)':'')));
      }
      if(yes && R.altar==='scale'){p.hpPen=(p.hpPen||0)+.03;applyGear(run);paid.push('최대 생명력 '+hpBefore+' → '+p.hpMax+' (이 캐릭터가 끝날 때까지)');received.push('능력치 포인트 +1');}
      if(yes && R.altar==='gold'){
        const cost=altarGold(run);if(run.gold<cost){toast('골드가 모자랍니다');break;}run.gold-=cost;paid.push('골드 '+cost);
        for(const fk of ['life','mana','stam']){const before=p.flask[fk]||0;p.flask[fk]=Math.min(flaskCap(p,fk),before+1);received.push(({life:'생명력',mana:'정화',stam:'스태미나'})[fk]+' 플라스크 '+before+' → '+p.flask[fk]+(before===p.flask[fk]?' (최대 충전)':''));}
      }
      const receipt=yes?altarReceipt(run,R.altar,paid,received):null;
      run.rooms.push({room:run.room,ch:run.ch||1,type:'altar',took:yes?R.altar:null,exchange:receipt});advanceFloor();
      if(yes)toast('바친 것: '+paid.join(', ')+'\n받은 것: '+received.join(', '));
      if(yes&&R.altar==='scale'){ptBonus(run,1,'유리 저울');} // 10월 16일 0.8.0 2단계: 능력치 1점 → 패시브 포인트 1
      queueDrops(drops);break; }
    case 'gamble': { const run = G.run; if (!run || run.phase !== 'shop') break; const r = gambleDraw(run, el.dataset.k); if (r.why) { toast(r.why); break; } sfx('coin'); toast(`${(GRADE[r.it.g] || GRADE.n).n} ${(ITEMS[r.it.tpl] || {}).n || ''}이(가) 나왔습니다. 가방에 넣었습니다`); saveRunLocal(); saveCur(); render(); break; }
    case 'fate': { const run = G.run, R = run && run.cur; if (!R || R.type !== 'fate') break; const r = fateRun(run, el.dataset.k); if (!r) { toast('올릴 수 없는 장비입니다'); break; } advanceFloor(); openSheet('fateres', r); break; }
    case 'fateskip': { const run = G.run, R = run && run.cur; if (!R || R.type !== 'fate') break; run.rooms.push({ room: run.room, type: 'fate', took: null }); advanceFloor(); render(); break; }
    case 'kspick': { const run = G.run; if (!run) break; const why = ksTake(run, el.dataset.k); if (why) { toast(why); break; } const kn = '큰 각인: ' + ptBuild(run.build).nodes[el.dataset.k].n; if (run.alloc) { toast(kn); allocAfterKs(run); break; } G.sheet = null; toast(kn); saveRunLocal(); saveCur(); if (!ksOpen()) render(); break; } // 10월 16일 0.8.0 2단계
    case 'awkview': if (!runLive()) break; hidePop(); openSheet('awkview', { from: el.dataset.from || '' }); break;
    case 'offerpick': { const run = G.run, it = run.inv[el.dataset.k]; if(itemRemoveWhy(run,it&&it.uid)){toast(itemRemoveWhy(run,it.uid));break;} if (!it) break; const up = it.g === 'n' ? 'm' : it.g === 'm' || it.g === 'r' ? 'r' : 'h'; const k2 = dropKey(run, up, [it.tpl]); const reward=mkItem(k2),receipt=altarReceipt(run,'offer',[(GRADE[it.g]||GRADE.n).n+' '+ITEMS[it.tpl].n],[(GRADE[reward.g]||GRADE.n).n+' '+ITEMS[reward.tpl].n]); discardUid(run, it.uid); G.sheet = null; run.rooms.push({ room: run.room, type: 'altar', took: 'offer', gave: it.tpl, exchange: receipt }); advanceFloor(); toast('바친 것: '+receipt.paid.join(', ')+'\n받은 것: '+receipt.received.join(', ')); queueDrops([reward]); break; }
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
      if (R.event === 'bonetrader' && o === 'gear') { const u = run.bag.find(u=>!itemRemoveWhy(run,u)); if (u && run.inv[u]) { const g = run.inv[u].g; discardUid(run, u); drops.push(mkItem(dropKey(run, g))); } else toast('넘길 장비가 가방에 없습니다'); }
      if (R.event === 'bonetrader' && o === 'cons') { if (takeCons(run, 3)) giveChCons(run, run.ch || 1); else toast('넘길 소모품이 모자랍니다'); }
      if (R.event === 'coffin' && o === 'break') { if (Math.random() < 0.5) drops.push(mkItem(dropKey(run, 'r'))); else { run.next.coffin = 1; toast('관 뚜껑이 안에서 밀려 올라온다'); } }
      if (R.event === 'procession' && o === 'follow') run.buffs.procession = 4;
      if (R.event === 'procession' && o === 'block') run.next.block = 1;
      if (R.event === 'master' && o === 'read') { const c = refundDeepest(run); toast(c ? atBuild(run.build).nodes[c].n + ' 노드를 되돌렸습니다. 액티브 포인트 +1' : '되돌릴 노드가 없습니다'); }
      if (R.event === 'robber' && o === 'loot') { if (Math.random() < 0.5) gainGold(run, 30, '자루에서 골드가 나왔습니다'); else drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'room')))); run.next.pre = Object.assign({}, run.next.pre, { poison: ((run.next.pre || {}).poison || 0) + 3 }); }
      if (R.event === 'robber' && o === 'bury') p.flask.life = Math.min(flaskCap(p, 'life'), p.flask.life + 1);
      if (R.event === 'blackwell' && o === 'drink') { p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1); p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1); run.next.pre = Object.assign({}, run.next.pre, { vuln: 2 }); }
      if (R.event === 'camel' && o === 'loot') { const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) <= 3 && CONS[k].use !== 'none'); for (let k = 0; k < 3; k++) consGrant(run, pickR(ids), 'n', 1); n3pre(run, 'ignite', 2); toast('짐에서 소모품 셋을 찾았습니다. 다음 전투에 화상 2'); }
      if (R.event === 'camel' && o === 'bury') consGrant(run, 'herb', 'n', 2); // 10월 14일: 선인장 수액을 없앴다
      if (R.event === 'oasis' && o === 'drink') { if (Math.random() < 0.5) { p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.3); toast('샘물이 상처를 씻어 낸다. 생명력 30%'); } else { n3pre(run, 'chill', 2); toast('물이 무겁게 가라앉는다. 다음 전투에 둔화 2'); } }
      if (R.event === 'oasis' && o === 'fill') consGrant(run, 'cleanse', 'n', 1); // 10월 14일: 찬물 한 병 → 정화 약
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
      if (R.event === 'library' && o === 'read') ptBonus(run, 1, '무너진 서고');
      if (R.event === 'archive' && o === 'pull') ptBonus(run, 1, '불타는 서고');
      queueDrops(drops); break; }

    case 'giveup': { if (!ask('이 캐릭터를 포기할까요? 포기한 캐릭터는 이어 할 수 없습니다.')) break; abandonCur(); render(); toast('캐릭터를 포기했습니다'); break; }
    case 'blockback': if (G.run) G.run.blockOffered = false; G.sheet = null; render(); break;
    case 'giveupend': endRun('lose'); break;
    case 'scen': startScen(el.dataset.b); break;
    case 'enter': enterRoom(); break;
    case 'statview': if (!G.run || !G.run.p || G.creating) break; hidePop(); openSheet('statview', { from: el.dataset.from || '' }); break;
    case 'equip': if (!runLive()) break; G.eqSel = null; openSheet('equip'); break;
    case 'close': G.sheet = null; render(); break;
    case 'sel': if (!G.data.seenCoach && !(G.coachI > 0)) G.coachI = 1;
      if (G.busy) { if (G.stepResolve) { const r = G.stepResolve; G.stepResolve = null; r(); } return; } hidePop(); G.sel = G.sel === el.dataset.e ? null : el.dataset.e; render(); break;
    case 'act': if (el.getAttribute('aria-disabled') === 'true') { showPop(el, true); ysPv(el); return; } hidePop(); doAct(el.dataset.id, el.dataset.t || null); break; // 막힌 칸이면 설명과 모자란 유산을 칸에 보인다(10월 17일: 주석이 줄 가운데 들어가 doAct가 주석이 되어 있었다)
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
    case 'localsaveretry': { const ok = saveLocal(); render(); toast(ok ? '이 브라우저에 저장했습니다.' : localSaveReason()); break; }
    case 'dl': download(); break;
    case 'help': { const k = el.dataset.k || ''; if (G.sheet && G.sheet.kind === 'help') { G.sheet.data.k = k; render(); } else openSheet('help', { k }); break; }
    case 'guide': G.guideI = 0; G.afterGuide = null; G.scr = 'guide'; render(); break;
    case 'gprev': G.guideI = Math.max(0, (G.guideI || 0) - 1); render(); break;
    case 'gnext': G.guideI = (G.guideI || 0) + 1; render(); break;
    case 'gdone': G.data.seenGuide = true; saveLocal(); if (G.afterGuide === 'create') { G.afterGuide = null; beginCreate(); } else { G.scr = 'title'; render(); } break;
    case 'logopen': G.logOpen = true; render(); setTimeout(() => { const c = document.querySelector('[data-a="logclose"]'); if (c) c.focus(); }, 0); break; /* 휴대폰 기록 창: 초점을 창 안으로 */
    case 'logclose': G.logOpen = false; render(); setTimeout(() => { const c = document.querySelector('[data-a="logopen"]'); if (c && c.getClientRects().length) c.focus(); }, 0); break;
    case 'runperson': G.rf = { uid: el.dataset.k }; G.rfPage = 0; G.rfOpen = null; render(); break;
    case 'runfilter': G.rf = { uid: val('runperson'), q: val('runquery'), b: val('runbuild'), result: val('runresult'), from: val('runfrom'), to: val('runto') }; G.rfPage = 0; G.rfOpen = null; render(); break;
    case 'runreset': G.rf = {}; G.rfPage = 0; G.rfOpen = null; render(); break;
    case 'runpage': G.rfPage = Math.max(0, +el.dataset.v || 0); G.rfOpen = null; render(); break;
    case 'rundeltick': {if(G.runDelBusy)break;const t=JSON.parse(el.dataset.k);G.runDeleteSel=(G.runDeleteSel || []).filter(x=>x.uid!==t.uid||x.id!==t.id);if(el.checked)G.runDeleteSel.push(t);G.runDelTargets=null;G.runDelTarget=null;render();break;}
    case 'runbatchask': if(!G.runDelBusy&&canDeleteRun()){G.runDelTarget=null;G.rfOpen=null;G.runDelTargets=(G.runDeleteSel || []).map(t=>{const T=(G.dashRaw || []).find(x=>x.uid===t.uid),r=T&&(T.runs || []).find(x=>x.id===t.id);return {...t,name:(T ? testerLabel(T,0) : '')+' · '+(r&&r.cname || '')};});render();}break;
    case 'rundelask': {const x=dashSelectedRun();if(x && canDeleteRun()){G.runDelTargets=null;G.runDelTarget={uid:x.uid,id:x.r.id};G.runDelMsg='';render();}break;}
    case 'rundelno': if(!G.runDelBusy){G.runDelTarget=null;G.runDelTargets=null;G.runDelMsg='';render();}break;
    case 'rundelgo': deleteOneRun((val('rundelword') || '').trim(), document.getElementById('rundelbackup')?.checked !== false); break;
    case 'runopen': G.rfOpen = el.dataset.k; G.raPage = 0; G.rdTab = 'summary'; render(); document.getElementById('admin-run-detail')?.scrollIntoView({ block: 'start' }); break;
    case 'runtab': G.rdTab = el.dataset.k; render(); document.getElementById('admin-run-detail')?.scrollIntoView({ block: 'start' }); break;
    case 'runactioncsv': saveFile('nrk-행동별상태.csv', dashActionCsv()); break;
    case 'runroomcsv': saveFile('nrk-방별통계.csv', dashRoomCsv()); break;
    case 'runclose': G.rfOpen = null; render(); break;
    case 'runactpage': G.raPage = Math.max(0, +el.dataset.v || 0); render(); break;
    case 'runscsv': saveFile('nrk-플레이로그-' + new Date().toISOString().slice(0, 10) + '.csv', dashRunsCsv()); break;
    case 'dash': loadDash(); break;
    case 'choose': {
      const k = el.dataset.k; const run = G.run; const S = G.sheet;
      run.choices.push({ room: S.data.room, offered: S.data.offer, picked: k || null, t: Date.now() }); run.declined = (run.declined || []).concat(S.data.offer.filter(x => x !== k)); G.sheet = null;
      if (k) { const it = mkItem(k); run.drops.push({ room: S.data.room, item: k, g: it.g, b: it.b, chest: 1, ch: run.ch || 1 }); giveItem(it); } else { saveRunLocal(); saveCur(); nextDrop(); }
      break;
    }
    case 'resume': resumeRun(); break;
    case 'admingo': { const pw = val('adminpass'); if (!G.sb) { G.adminMsg = '저장소에 연결된 뒤에 다시 해 주세요'; render(); break; } G.sb.rpc('admin_check', { pass: pw }).then(({ data: ok, error }) => { if (ok && !error) { G.owner = true; G.adminPass = pw; G.data.adminPass = pw; G.adminMsg = ''; saveLocal(); toast('관리자로 열었습니다'); loadDash(); } else { G.adminMsg = '암호가 맞지 않습니다'; render(); } }); break; }
    case 'cloudrefresh': if (!G.cloudLoading) { G.cloudLoading = true; cloudLoad().finally(() => { G.cloudLoading = false; render(); }); } break;
    case 'changes': G.data.seenVer = CHANGE_VER; saveLocal(); openSheet('changes', {}); break;
    case 'code': openSheet('code', {}); break;
    case 'codeshare': { const tb = document.getElementById('codebox'); const txt = tb ? tb.value : ''; navigator.share({ title: '나락의 유산 기록', text: txt }).then(() => toast('보냈습니다'), () => {}); break; }
    case 'codecopy': { const tb = document.getElementById('codebox'); const txt = tb ? tb.value : ''; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('복사했습니다. 메신저에 붙여 넣어 보내 주세요'), () => { tb.select(); toast('글자를 길게 눌러 모두 선택한 뒤 복사해 주세요'); }); else { tb.select(); try { document.execCommand('copy'); toast('복사했습니다'); } catch (e2) { toast('글자를 길게 눌러 모두 선택한 뒤 복사해 주세요'); } } break; }
    case 'import': openSheet('import', {}); break;
    case 'impgo': { const S = G.sheet; const v = val('impbox'); if (!G.db) { S.data.msg = '공유 저장소에 연결되어야 넣습니다.'; S.data.ok = 0; render(); break; } importCode(v).then(r => { S.data.msg = (r.name || '이름 없는 지인') + '의 판 ' + r.runs + '개를 넣었습니다.'; S.data.ok = 1; render(); loadDash(); }, e2 => { S.data.msg = '넣지 못했습니다: ' + (e2 && e2.message || '알 수 없는 오류'); S.data.ok = 0; render(); }); break; }
    case 'skilltog': { const S = G.sheet; const k = el.dataset.k; const v2 = G.run && isV2(G.run.p); if (v2) return; const i = S.data.pick.indexOf(k); if (i >= 0) S.data.pick.splice(i, 1); else if (S.data.pick.length < (v2 ? EQUIP_SLOTS2 : SKILL_SLOTS)) S.data.pick.push(k); else { toast('칸이 가득 찼습니다. 먼저 하나를 빼 주세요'); return; } render(); break; }
    case 'tnode': case 'tsel': case 'tzoom': case 'tlist': trdClick(a, el); break; // 10월 17일 0.8.0 3단계: 방사형 트리(js/73-tree-radial.js)
    case 'tview': G.tview = el.dataset.k === 'a' ? 'a' : 'p'; render(); break; // 10월 16일 0.8.0 2단계: 두 트리 화면(목록형, 3단계에서 방사형으로)
    case 'pdir': G.ptd = el.dataset.k; render(); break;
    case 'abr': G.abr = el.dataset.k; render(); break;
    case 'ptbuy': case 'atbuy': { const run = G.run; if (!treeCanEdit()) { toast('전투 중에는 바꿀 수 없습니다'); return; } const id = el.dataset.k; const why = a === 'ptbuy' ? ptBuy(run, id) : atBuy(run, id); if (why) { toast(why); return; } G.tjust = { e: a === 'ptbuy' ? 'p' : 'a', id, t: Date.now() }; if (el.dataset.e) G.tfocus = { e: el.dataset.e, k: id }; /* 10월 17일 3단계: 그림에서 방금 연 선을 그리고 초점을 노드로 */ if (!run.alloc && !G.creating) { saveRunLocal(); saveCur(); } toast('열었습니다: ' + (a === 'ptbuy' ? ptBuild(run.build) : atBuild(run.build)).nodes[id].n + (a === 'atbuy' && (run.skills || []).includes(id) ? '. 끼웠습니다' : '')); render(); break; }
    case 'ptref': case 'atref': { const run = G.run; const why = a === 'ptref' ? ptRefund(run, el.dataset.k) : atRefund(run, el.dataset.k); if (why) { toast(why); break; } if (el.dataset.e) G.tfocus = { e: el.dataset.e, k: el.dataset.k }; toast('되돌렸습니다. 포인트 +1'); render(); break; }
    case 'ateq': { const run = G.run; if (!treeCanEdit()) { toast('전투 중에는 바꿀 수 없습니다'); return; } const why = atEquip(run, el.dataset.k); if (why) { toast(why); break; } if (el.dataset.e) G.tfocus = { e: el.dataset.e, k: el.dataset.k }; (run.skillLog = run.skillLog || []).push({ room: run.room, to: run.skills.slice(), t: Date.now() }); if (!run.alloc && !G.creating) { saveRunLocal(); saveCur(); } render(); break; }
    case 'tree': if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = 'tree'; G.sheet = null; G.menuOpen = false; render(); window.scrollTo(0, 0); break;
    case 'allocgo': case 'allocnext': allocNext(G.run); break;
    case 'allocok': allocConfirm(G.run); break;
    case 'statrec': break; // 10월 16일 0.8.0 2단계: 옛 만들기 단추 이름(옛 브라우저 점검용). 능력치 창은 없다
    case 'statok': if (G.run && G.run.alloc && G.run.alloc.step === 'a') allocConfirm(G.run, 1); break;
    case 'skillok': { if (G.run && G.run.alloc) { if (G.run.alloc.step === 'i') allocNext(G.run); if (G.run.alloc.step === 'p' || G.run.alloc.step === 'k') { G.run.alloc.step = G.run.ksPending > 0 ? 'k' : 'a'; if (G.run.alloc.step === 'k') { ksEnsureOffer(G.run); while (G.run.ksPending > 0 && G.run.ksOffer) ksTake(G.run, G.run.ksOffer[0]); G.run.alloc.step = 'a'; } render(); } break; } const S = G.sheet; const run = G.run; const prev = (run.skills || []).slice(); if (!isV2(run.p)) run.skills = S.data.pick.slice(); run.p.skills = isV2(run.p) ? v2Equip(run) : run.skills.slice(); run.skillLog = run.skillLog || []; run.skillLog.push({ room: run.room, from: prev, to: run.skills.slice(), first: !!S.data.first, t: Date.now() }); G.sheet = null; saveRunLocal(); saveCur(); toast('스킬을 바꿨습니다'); render(); break; }
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
    case 'dropequip': { const run = G.run; const before = growthSnapshot(run.p); const msg = equipUid(run, el.dataset.k, el.dataset.s, 'free'); G.sheet = null; saveRunLocal(); saveCur(); toast(msg || growthText(before, run.p, '장비 교체')); nextDrop(); break; }
    case 'bfdrop': { const run = G.run; const S = G.sheet; const why=discardUid(run, el.dataset.k);if(why){toast(why);break;} const it = S.data.item, then = S.data.then; G.sheet = null; giveItem(it, then); break; }
    case 'bfequip': {
      const run=G.run,S=G.sheet;if(!run || !S || S.kind!=='bagfull' || (G.b&&!G.b.over))break;
      const it=S.data.item,slot=el.dataset.s,why=rewardEquipWhy(run,it,slot);if(why){toast(why);break;}
      const old=run.inv[run.eqU[slot]];
      if(old && bagUsed(run)>=BAG_MAX && !ask(ITEMS[old.tpl].n+'을(를) 버리고 '+ITEMS[it.tpl].n+'을(를) 장착할까요? 버린 장비는 사라집니다.'))break;
      const before=growthSnapshot(run.p),msg=equipReward(run,it,slot);if(msg){toast(msg);break;}
      if(S.data.then==='boss' && run.settle && run.settle.loot)run.settle.loot.pending=0;delete run.gearPending;G.sheet=null;saveRunLocal();saveCur();toast(growthText(before,run.p,'장비 교체'));nextDrop();break;
    }
    case 'bfskip': { const run = G.run; const S = G.sheet; if(!ask(ITEMS[S.data.item.tpl].n+'을(를) 두고 갈까요? 이 장비는 사라집니다.'))break; (run.discards = run.discards || []).push({ room: run.room, item: S.data.item.tpl, g: S.data.item.g, t: Date.now(), new: 1 }); if(S.data.then==='boss' && run.settle && run.settle.loot){run.settle.loot.pending=0;run.settle.loot.lost=1;} delete run.gearPending; G.sheet = null; saveRunLocal(); saveCur(); nextDrop(); break; }
    case 'eqsel': {const it=G.run.inv[G.run.eqU[el.dataset.k]];if(it){it.fresh=false;saveRunLocal();saveCur();}} G.eqSel = { slot: el.dataset.k }; G.eqFilter='slot'; render(); eqReveal(); break;
    case 'eqpick': { const u = el.dataset.k,it=G.run.inv[u];if(!it)break;it.fresh=false;saveRunLocal();saveCur();const kind=tplKind(it.tpl),prev=(G.eqSel||{}).slot,slot=kind==='ring'?(kindOf(prev)==='ring'?prev:'ring1'):kind; G.eqSel = G.eqSel && G.eqSel.uid === u ? { slot } : { slot, uid: u }; render(); eqReveal(); break; }
    case 'eqon': { const run = G.run; const before = growthSnapshot(run.p); const msg = equipUid(run, el.dataset.k, el.dataset.s, 'free'); if (!msg) { G.eqSel = { slot: el.dataset.s }; saveRunLocal(); saveCur(); toast(growthText(before, run.p, '장비 교체')); } else toast(msg); render(); if(!msg)eqBagReveal(); break; }
    case 'eqoff': { const run = G.run; const msg = unequipUid(run, el.dataset.k, 'free'); if (!msg) { saveRunLocal(); saveCur(); toast('가방에 넣었습니다'); } else toast(msg); render(); break; }
    case 'eqdrop': { const run = G.run; const it = run.inv[el.dataset.k]; if(itemRemoveWhy(run,it&&it.uid)){toast(itemRemoveWhy(run,it.uid));break;} if (!it || !ask(ITEMS[it.tpl].n + '을(를) 버릴까요? 버린 장비는 사라집니다.')) break; discardUid(run, it.uid); G.eqSel = { slot: (G.eqSel || {}).slot || 'weapon' }; saveRunLocal(); saveCur(); toast('버렸습니다'); render(); break; }
    case 'dropkeep': G.sheet = null; nextDrop(); break;
    case 'droporganize': G.sheet=null;nextDrop();if(!G.sheet){G.eqSel=null;G.eqFilter='all';openSheet('equip');eqBagReveal();}break;
    case 'dropdiscard': { const run = G.run; const it = run.inv[el.dataset.k]; if(itemRemoveWhy(run,it&&it.uid)){toast(itemRemoveWhy(run,it.uid));break;} if (!it || !ask(ITEMS[it.tpl].n + '을(를) 버릴까요? 버린 장비는 사라집니다.')) break; discardUid(run, it.uid); G.sheet = null; saveRunLocal(); saveCur(); toast('버렸습니다'); nextDrop(); break; }
  }
}
function onKey(ev) {
  if(ev.key==='Enter' && ev.target && ev.target.id==='consquery'){ev.preventDefault();const btn=document.querySelector('[data-a=conssearch]');if(btn)btn.click();return;}
  if (G.hudEd && hudEdKey(ev)) return;
  if (ev.key === 'Tab' && G.sheet) sheetTrap(ev);
  const typing = ev.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ev.target.tagName);
  if (ev.key === 'Enter' && ev.target && ['cname', 'adminpass', 'pname', 'runquery'].includes(ev.target.id)) { ev.preventDefault(); const b = document.querySelector({ cname: '[data-a=cnok]', adminpass: '[data-a=admingo]', pname: '[data-a=namesave]', runquery: '[data-a=runfilter]' }[ev.target.id]); if (b) b.click(); return; }
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
  if (ev.key !== 'Escape') return; if (POP.cur || (POP.el && POP.el.style.display === 'block')) { hidePop(); return; } /* Esc는 설명 창부터 닫는다 */ if (typing) { ev.target.blur(); return; } /* 입력칸에서는 칸만 벗어난다 */ if (G.menuOpen) { G.menuOpen = false; render(); return; } if (G.logOpen) { G.logOpen = false; render(); return; } /* 휴대폰 기록 창 */ if (G.scr === 'create' && !(G.sheet && !G.sheet.data.first)) { if (ask('캐릭터 만들기를 그만둘까요? 고른 것은 남지 않습니다.')) cancelCreate(); return; } /* 10월 8일: 묻지 않고 그만두던 것 */ if (G.sheet && !['block', 'choice', 'ks', 'alloc', 'bagfull'].includes(G.sheet.kind) && !(G.sheet.kind === 'skills' && G.sheet.data.first)) { G.sheet = null; render(); } else if (G.logOpen) { G.logOpen = false; render(); } }

