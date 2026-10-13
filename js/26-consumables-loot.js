'use strict';
/* ===== 소모품 (10월 4일, data/consumables.js) =====
   run.cons = [{ id, g, n }] 겹. 10월 14일 개편 1단계: 소모품은 장비 가방과 따로 CONS_BAG칸(consUsed), 한 칸에 무게로 정한 수(max)만큼 겹친다. 판매품은 전리품 주머니(run.pouch). 전투 중에는 차례 칸을 쓰지 않고, 한 차례에 CONS_TURN개까지. 같은 효과는 겹치지 않는다(이미 걸린 강화 · 없는 상태면 버튼이 잠긴다) */
const consSell = c => { const D = CONS[c.id]; return D.use === 'none' ? D.sell : Math.max(1, Math.round(D.price * 0.1 * (c.g === 'm' ? 1.6 : 1))); }; // 소모품 팔 때 값
const bagUsed = run => (run.bag ? run.bag.length : 0); // 장비 가방 (BAG_MAX칸)
const consUsed = run => (run.cons || []).length; // 소모품 가방 (CONS_BAG칸)
const pouchN = run => Object.values(run.pouch || {}).reduce((a, n) => a + n, 0); // 전리품 주머니에 든 판매품 수
/* 전리품 주머니: 판매품은 칸을 차지하지 않고, 상점에 들어갈 때 골드로 바뀐다 */
function pouchAdd(run, id, n) { const P = run.pouch || (run.pouch = {}); P[id] = (P[id] || 0) + (n || 1); }
function pouchSell(run) { const P = run.pouch || {}; let g = 0, n = 0; for (const [id, k] of Object.entries(P)) { if (CONS[id]) { g += (CONS[id].sell || 0) * k; n += k; } } run.pouch = {}; if (g) { run.gold = (run.gold || 0) + g; (run.pouchLog = run.pouchLog || []).push({ ch: run.ch || 1, n, gold: g, t: Date.now() }); } return { n, gold: g }; }
/* 옛 저장본(한 가방 20칸 공유)을 새 소모품 가방으로 옮긴다. 판매품은 주머니로, 나머지는 새 묶음 크기로 다시 담고, 다섯 칸을 넘는 몫은 보류 보상(consPending)으로 보내 플레이어가 고르게 한다 */
function consBagFix(run) {
  if (!run || run.consV === 3) return; run.cons = run.cons || [];
  /* 10월 14일 개편 4단계(consV 3): 없앤 소모품은 합쳐지는 소모품으로, 갈 곳이 없으면 판매가만큼 골드로. 고급 약초는 약초 2개 */
  let refund = 0; const gone = [];
  const map = (id, g, n) => { if (CONS[id]) return id === 'herb' && g === 'm' ? ['herb', 'n', n * 2] : [id, g, n]; const G0 = CONS_GONE[id]; if (!G0) return null; gone.push(G0[0] + ' ×' + n); if (G0[1]) return [G0[1], 'n', n * G0[2]]; refund += Math.max(1, Math.round(G0[2] * 0.1 * (g === 'm' ? 1.6 : 1))) * n; return null; };
  const tot = new Map(); const add = (id0, g0, n0) => { const m = map(id0, g0, n0); if (!m) return; const [id, g, n] = m; if (!CONS[id] || !(n > 0)) return; if (CONS[id].use === 'none') { pouchAdd(run, id, n); return; } const k = id + ':' + consGrade(id, g); tot.set(k, (tot.get(k) || 0) + n); };
  for (const c of run.cons) add(c.id, c.g, c.n);
  const pend = run.consPending || []; run.consPending = [];
  run.cons = []; const over = [];
  for (const [k, n] of tot) { const [id, g] = k.split(':'); const left = consAdd(run, id, g, n); if (left) over.push({ id, g, n: left }); }
  for (const c0 of pend) { const m = map(c0.id, c0.g, c0.n); if (!m) continue; const c = { id: m[0], g: m[1], n: m[2] }; if (CONS[c.id] && CONS[c.id].use === 'none') pouchAdd(run, c.id, c.n); else if (CONS[c.id]) over.push({ id: c.id, g: consGrade(c.id, c.g), n: c.n }); }
  for (const o of over) { const q = run.consPending; const x = q.find(y => y.id === o.id && y.g === o.g); if (x) x.n += o.n; else q.push(o); }
  for (const id of Object.keys(run.pouch || {})) if (!CONS[id]) delete run.pouch[id];
  if (run.consFav) run.consFav = [...new Set(run.consFav.map(k => { const [id, g] = k.split(':'); const m = CONS[id] ? [id, g] : CONS_GONE[id] && CONS_GONE[id][1] ? [CONS_GONE[id][1], 'n'] : null; return m && CONS[m[0]] ? m[0] + ':' + consGrade(m[0], m[1]) : null; }).filter(Boolean))].slice(0, 3);
  if (run.shop && Array.isArray(run.shop.cons)) run.shop.cons = run.shop.cons.filter(x => x && CONS[x.id]);
  if (refund) run.gold = (run.gold || 0) + refund;
  if (gone.length) (run.consRetireLog || (run.consRetireLog = [])).push({ items: gone, gold: refund, t: Date.now() });
  run.consV = 3;
}
const consVal = c => { const D = CONS[c.id]; return c.g === 'm' && D.vm != null ? D.vm : D.v; };
const consName = c => CONS[c.id] ? CONS[c.id].n + (c.g === 'm' && CONS[c.id].vm != null ? ' (고급)' : '') : (CONS_GONE[c.id] ? CONS_GONE[c.id][0] : c.id); // 없앤 소모품(10월 14일 개편 4단계)은 옛 이름
const consGrade = (id, g) => g === 'm' && CONS[id] && CONS[id].vm != null ? 'm' : 'n';
const consKey = c => c.id + ':' + c.g;
// 기존 묶음의 빈 자리와 새 가방 칸을 함께 계산한다. 조회 중 저장본은 바꾸지 않는다.
function consSpace(run, id, g) {
  const D = CONS[id]; if (!D) return { existing: 0, capacity: 0, free: 0 };
  if (D.use === 'none') return { existing: 0, free: CONS_BAG, capacity: 1e9 }; // 판매품은 주머니로
  const grade = consGrade(id, g), free = Math.max(0, CONS_BAG - consUsed(run));
  const existing = (run.cons || []).filter(c => c.id === id && consGrade(id, c.g) === grade).reduce((n, c) => n + Math.max(0, D.max - c.n), 0);
  return { existing, free, capacity: existing + free * D.max };
}
const consFavorite = (run,c) => (run.consFav || []).includes(consKey(c));
function toggleConsFavorite(run,c) {
  if (!c || !CONS[c.id] || ['none','out'].includes(CONS[c.id].use)) return '빠른 사용이 가능한 소모품만 고릅니다';
  const keys=run.consFav || (run.consFav=[]),key=consKey(c),i=keys.indexOf(key);
  if(i>=0)keys.splice(i,1);else if(keys.length<3)keys.push(key);else return '즐겨찾기는 세 종류까지 고릅니다';
  c.fresh=false;return '';
}
/* 정화 약이 줄일 상태: 가장 많이 쌓인 내 해로운 상태(같으면 KW_BAD 순서) */
function consWorst(p) { let best = null, n = 0; for (const k of KW_BAD) { const s = stk(p, k); if (s > n) { n = s; best = k; } } return best; }
function consGroup(D){return ['heal','healcure','stam','cure','trim','cleanse'].includes(D.k)?'restore':D.use==='none'||D.use==='out'?'other':'battle';}
function consRows(run,b,filter,only,query,tgt){
  const q=String(query||'').toLocaleLowerCase();
  return (run.cons||[]).map((c,i)=>({c,i,D:CONS[c.id]})).filter(x=>x.D).map(x=>Object.assign(x,{why:consWhyNot(b,run,x.c,tgt)})).filter(x=>(!filter||filter==='all'||(filter==='fav'?consFavorite(run,x.c):consGroup(x.D)===filter))&&(!only||!x.why)&&(!q||(consName(x.c)+' '+x.D.sit+' '+x.D.d(consVal(x.c))).toLocaleLowerCase().includes(q))).sort((a,b)=>Number(!!a.why)-Number(!!b.why)||a.i-b.i);
}
/* 소모품 창에서 같은 종류·등급의 묶음을 한 줄로 합친다(10월 14일). slots는 칸마다 든 수, idx는 쓸 때 먼저 덜어 낼 칸(가장 적게 든 칸이라 칸이 빨리 빈다) */
function consGroups(rows){
  const m=new Map();
  for(const r of rows){const k=r.c.id+':'+consGrade(r.c.id,r.c.g);let g=m.get(k);if(!g)m.set(k,g={key:k,c:r.c,D:r.D,why:r.why,rows:[]});g.rows.push(r);}
  return [...m.values()].map(g=>Object.assign(g,{n:g.rows.reduce((a,r)=>a+r.c.n,0),slots:g.rows.map(r=>r.c.n),idx:g.rows.reduce((a,r)=>r.c.n<a.c.n?r:a).i,fresh:g.rows.some(r=>r.c.fresh)}));
}
const consLvMul = b => 1 + 0.15 * (((b && b.ctx && b.ctx.lv) || 1) - 1);
function consAdd(run, id, g, n) {
  run.cons = run.cons || []; const D = CONS[id]; if (!D) return n; if (D.use === 'none') { pouchAdd(run, id, n || 1); return 0; } g = consGrade(id, g); let left = n || 1;
  for (const c of run.cons) if (left > 0 && c.id === id && consGrade(id, c.g) === g && c.n < D.max) { const t = Math.min(left, D.max - c.n), oldKey = consKey(c); c.g = g; if ((run.consFav || []).includes(oldKey)) run.consFav = run.consFav.map(k => k === oldKey ? consKey(c) : k); c.n += t; c.fresh=true; left -= t; }
  while (left > 0 && consUsed(run) < CONS_BAG) { const t = Math.min(left, D.max); run.cons.push({ id, g, n: t, fresh:true }); left -= t; }
  return left;
}
const myTurn = b => !!(b && !b.over && b.queue && b.queue[0] === 'p');
// 보상은 공간이 없더라도 플레이어가 선택할 때까지 저장합니다.
function consGrant(run, id, g, n) {
  const left = consAdd(run, id, g, n);
  if (left && CONS[id]) {
    const grade = g === 'm' && CONS[id].vm != null ? 'm' : 'n';
    const q = run.consPending || (run.consPending = []);
    const c = q.find(x => x.id === id && consGrade(id, x.g) === grade);
    if (c) c.n += left; else q.push({id, g: grade, n: left});
  }
  if (CONS[id]) (run.consGainLog || (run.consGainLog=[])).push({ch:run.ch || 1,room:run.room,id,g:g === 'm' && CONS[id].vm != null ? 'm':'n',n:n || 1,received:(n || 1)-left,pending:left,t:Date.now()});
  return left;
}
function consPendingTry(run) {
  const q = run.consPending || [];
  while (q.length) {
    const c = q[0], left = consAdd(run, c.id, c.g, c.n);
    if (c.n > left) (run.consGainLog || (run.consGainLog=[])).push({ch:run.ch || 1,room:run.room,id:c.id,g:c.g,n:c.n-left,received:c.n-left,pending:0,fromPending:true,t:Date.now()});
    if (left) { c.n = left; return false; }
    q.shift();
  }
  return true;
}
function consTargets(b, D) {
  const al = alive(b).filter(e => e.role !== 'root');
  switch (D.k) {
    case 'unevade': return al.filter(e => e.evading || e.haze > 0);
    case 'unbrace': return al.filter(e => e.braced);
    case 'unguard': return al.filter(e => e.guarding || (e.role === 'shield' && hasShield(b, null) === e && !e.unguard) || e.evading || e.braced);
    case 'unbless': return al.filter(e => e.s.empower || e.fireNext);
    case 'noheal': return al.filter(e => e.role === 'healer' && !e.noHeal);
    case 'hinder': return al.filter(e => (e.role === 'healer' && !e.noHeal) || (e.role === 'summoner' && !e.noSummon));
    case 'nosummon': return al.filter(e => e.role === 'summoner' && !e.noSummon);
    case 'sticky': return al.filter(e => e.role === 'thief' && !e.stuck);
    case 'norise': return al.filter(e => e.pile || (e.role === 'skeleton' && !e.rose && !e.norise && !e.limeDelay));
    case 'wallbreak': return al.filter(e => e.role === 'bonewall');
    case 'slow': return al.filter(e => !e.pile && e.role !== 'bonewall');
    case 'interrupt': return al.filter(e => e.intent && (['charge', 'heavy', 'aim', 'chant', 'chanting', 'burn', 'noon', 'mchant', 'mchanting', 'msong'].includes(e.intent.k) || e.intent.aimed) && !e.under && !e.bigRed);
    case 'unhaze': return al.filter(e => e.haze > 0);
    case 'rewind': return al.filter(e => e.foe === 'sundial' || e.glow > 0 || e.embers > 0 || e.chant);
    default: return al;
  }
}
function consTarget(b, D, tgtId) {
  const ts = consTargets(b, D); const sel = tgtId && ts.find(e => e.id === tgtId); if (sel) return sel;
  if (D.k === 'brk') return ts.slice().sort((x, y) => (y.brk / y.brkMax) - (x.brk / x.brkMax))[0];
  if (D.k === 'mark') return ts.slice().sort((x, y) => x.hp - y.hp)[0];
  return ts[0];
}
function consWhyNot(b, run, c, tgtId) {
  const D = CONS[c.id]; if (!D) return '없는 소모품입니다'; const p = run.p; const inFight = !!(b && !b.over);
  if (D.use === 'none') return '팔기만 합니다';
  if (inFight && D.use === 'out') return '전투 밖에서만 씁니다';
  if (!inFight && D.use === 'fight') return '전투 중에만 씁니다';
  if (inFight && !myTurn(b)) return '내 차례에 씁니다';
  if (inFight && (b.consN || 0) >= consTurnOf(p)) return '이번 차례에 ' + consTurnOf(p) + '개를 썼습니다';
  if (inFight && (b.consF || 0) >= consFightOf(p, run)) return '이번 전투에 ' + consFightOf(p, run) + '개를 모두 썼습니다';
  { const lim = consChLim(run, D); if (lim && consChUsed(run, D) >= lim) return '이번 챕터에 ' + lim + '번을 모두 썼습니다'; }
  switch (D.k) {
    case 'heal': return p.hp >= p.hpMax ? '생명력이 가득합니다' : '';
    case 'stam': return p.st >= p.stMax ? '스태미나가 가득합니다' : '';
    case 'quick': return b.extraQuick ? '이미 효과가 있습니다' : '';
    case 'cure': return p.s[D.s] ? '' : '그 상태가 없습니다';
    case 'block': return st(p, 'block') > 0 ? '이미 막음이 있습니다' : '';
    case 'halfboom': return b.halfBoom === b.round ? '이미 효과가 있습니다' : '';
    case 'scatter': { const al = alive(b).filter(e => e.role !== 'root' && !e.pile); return al.every(e => e.redNext) ? '이미 효과가 있습니다' : ''; }
    case 'blind': { const bk = alive(b).filter(e => e.row === 'back' && e.role !== 'root' && !e.pile); return !bk.length ? '후열 적이 없습니다' : bk.every(e => (e.redNext || 0) >= consVal(c)) ? '이미 효과가 있습니다' : ''; }
    case 'decoy': return p.decoy && p.decoy.round === b.round ? '이미 효과가 있습니다' : '';
    case 'guard1': return p.nextRed ? '이미 효과가 있습니다' : '';
    case 'whet': return p.whet ? '이미 효과가 있습니다' : '';
    case 'antisteal': return b.antiSteal ? '이미 효과가 있습니다' : '';
    case 'lootx': return (b.lootX || 1) > 1 ? '이미 효과가 있습니다' : '';
    case 'unmod': return D.mods.some(m => hasMod(b, m)) ? '' : '끌 방 특성이 없습니다';
    case 'escape': return b.ctx.boss || b.ctx.scen || b.ctx.tut ? '보스전에서는 쓰지 못합니다' : '';
    case 'burnpiles': return alive(b).some(e => e.pile) ? '' : '뼈 더미가 없습니다';
    case 'trim': return HEX.kinds.concat(['chill']).some(k => p.s[k]) ? '' : '해로운 상태가 없습니다';
    case 'cleanse': return consWorst(p) ? '' : '해로운 상태가 없습니다';
    case 'unearth': return alive(b).some(e => e.under && e.role !== 'boss') ? '' : '땅속의 적이 없습니다';
    case 'nobloat': return b.noBloat ? '이미 효과가 있습니다' : !alive(b).some(e => e.role === 'bloat') ? '부푼 시체가 없습니다' : '';
    case 'cool': return b.heat == null ? '열기가 없습니다' : b.heat <= 0 ? '열기가 0입니다' : '';
    case 'unhaze': return alive(b).some(e => e.haze > 0) ? '' : '허상을 두른 적이 없습니다';
    case 'healcure': return p.hp >= p.hpMax && !p.s.ignite ? '생명력이 가득하고 화상도 없습니다' : '';
    case 'reveal': return (run.ch || 1) < 3 ? '3챕터에서 씁니다' : !run.doors ? '문 앞에서 씁니다' : '';
    default: return D.tgt === 'enemy' && !consTarget(b, D, tgtId) ? '쓸 대상이 없습니다' : '';
  }
}
function consApply(b, run, c, tgt) {
  const D = CONS[c.id], v = consVal(c), p = run.p;
  switch (D.k) {
    case 'heal': { const h = Math.min(p.hpMax - p.hp, p.hpMax * v * healMul(p)); p.hp += h; return '생명력 +' + r1(h); }
    case 'stam': p.st = Math.min(p.stMax, p.st + v); return '스태미나 +' + v;
    case 'quick': b.extraQuick = 1; return '이번 차례에 빠른 칸이 하나 더 생긴다';
    case 'cure': delete p.s[D.s]; return (KW_N[D.s] || D.s) + '이(가) 사라진다';
    case 'block': addS(b, p, 'block', 1); return '다음 해로운 상태 하나를 막는다';
    case 'interrupt': tgt.bigRed = v; return tgt.n + '의 큰 공격 피해 −' + Math.round(v * 100) + '%';
    case 'halfboom': b.halfBoom = b.round; return '이번 라운드 화형 피해 절반';
    case 'blind': for (const e of alive(b)) if (e.row === 'back' && e.role !== 'root' && !e.pile) e.redNext = Math.max(e.redNext || 0, v); return '후열 적들의 다음 공격 피해 −' + Math.round(v * 100) + '%';
    case 'unevade': if (!tgt.evading && tgt.haze > 0) { tgt.haze--; if (!tgt.haze) tgt.hazeSrc = null; return tgt.n + '의 허상 한 겹이 깨진다'; } tgt.evading = 0; return tgt.n + '이(가) 몸을 일으킨다';
    case 'unbrace': tgt.braced = 0; return tgt.n + '의 버티기가 풀린다';
    case 'decoy': p.decoy = { round: b.round, v }; return '미끼 인형을 세운다. 이번 라운드 반격 · 후열 사격 피해 −' + Math.round(v * 100) + '%';
    case 'unguard': if (tgt.guarding || (tgt.role === 'shield' && hasShield(b, null) === tgt)) { tgt.guarding = null; tgt.unguard = 1; return tgt.n + '이(가) 동료를 지키지 못한다'; } if (tgt.evading) { tgt.evading = 0; return tgt.n + '을(를) 끌어내 몸 낮추기를 푼다'; } tgt.braced = 0; return tgt.n + '의 버티기를 푼다';
    case 'unbless': delete tgt.s.empower; if (tgt.fireNext) { tgt.fireNext = 0; return tgt.n + '이(가) 받은 불씨가 꺼진다'; } return tgt.n + '의 축복이 꺼진다';
    case 'noheal': tgt.noHeal = 1; return tgt.n + '의 다음 치유를 막는다';
    case 'hinder': if (tgt.role === 'healer') { tgt.noHeal = 1; return tgt.n + '의 다음 치유를 막는다'; } tgt.noSummon = 1; return tgt.n + '의 다음 소환을 막는다';
    case 'cleanse': { const k = consWorst(p); if (!k) return '지울 상태가 없다'; kwDec(p, k, v); return (KW_N[k] || k) + ' −' + v; }
    case 'nosummon': tgt.noSummon = 1; return tgt.n + '의 다음 소환을 막는다';
    case 'antisteal': b.antiSteal = 1; return '쇠붙이를 흘려 둔다';
    case 'sticky': tgt.stuck = 1; return tgt.n + '의 발에 끈끈이가 붙는다';
    case 'scatter': for (const e of alive(b)) if (e.role !== 'root' && !e.pile) e.redNext = v; return '적 모두의 다음 공격 피해 −' + Math.round(v * 100) + '%';
    case 'brk': addBreak(b, tgt, v); return tgt.n + '에게 붕괴 +' + v;
    case 'whet': p.whet = v; return '다음 공격 피해 +' + Math.round(v * 100) + '%';
    case 'mark': tgt.markDmg = v; return tgt.n + '에게 표식';
    case 'guard1': p.nextRed = v; return '다음 공격 피해 −' + Math.round(v * 100) + '%';
    case 'unmod': { const m = D.mods.find(x => hasMod(b, x)); b.ctx.mods = b.ctx.mods.filter(x => x !== m); if (m === 'haze') for (const e of alive(b)) if (!e.hazeSrc) e.haze = 0; return (ROOM_MODS[m] ? ROOM_MODS[m].n : m) + '을(를) 끈다'; }
    case 'escape': b.over = 'flee'; return '연기 속으로 물러난다';
    case 'lootx': b.lootX = v; return '이 전투의 전리품 확률 ×' + v;
    case 'norise': if (tgt.pile) { tgt.pile.wait += v; return tgt.n + '의 뼈 더미가 굳는다. 부활까지 ' + tgt.pile.wait + '라운드'; } tgt.limeDelay = v; return tgt.n + '이(가) 쓰러지면 부활이 ' + v + '라운드 늦어진다';
    case 'burnpiles': { let n = 0; for (const e of alive(b).filter(x => x.pile)) { e.norise = 1; e.hp = 0; killEnemy(b, e); n++; } return '뼈 더미 ' + n + '개를 태운다'; }
    case 'trim': { for (const k of HEX.kinds.concat(['chill'])) if (p.s[k]) kwDec(p, k); return '해로운 상태가 종류마다 1씩 준다'; }
    case 'unearth': { for (const e of alive(b).filter(x => x.under && x.role !== 'boss')) { e.under = 0; e.stkPrep = 0; e.intent = { k: 'attack' }; e.teleTurn = null; addS(b, e, 'vuln', 1); } return '땅속의 적을 끌어낸다'; }
    case 'cool': { const d = heatAdd(b, -v, D.n); return '열기 ' + Math.round(d); }
    case 'unhaze': { tgt.haze = Math.max(0, (tgt.haze || 0) - 1); if (!tgt.haze) tgt.hazeSrc = null; return tgt.n + '의 허상 한 겹이 걷힌다' + (tgt.haze ? ' (남은 ' + tgt.haze + ')' : ''); }
    case 'healcure': { const h = Math.min(p.hpMax - p.hp, p.hpMax * v * healMul(p)); p.hp += h; delete p.s.ignite; return '생명력 +' + r1(h) + ', 화상이 사라진다'; }
    case 'reveal': { for (const d of run.doors || []) d.hide = 0; run.dg.reveal = (run.dg.reveal || []).concat([run.room + 1]); return '이 층과 다음 층 문의 보상이 보인다'; }
    case 'rewind': { if (tgt.foe === 'sundial') { tgt.clock = Math.min(FOE_X.sundial.clock, (tgt.clock || 0) + FOE_X.sundial.glassBack); if (tgt.noonNext) { tgt.noonNext = 0; tgt.teleTurn = null; tgt.intent = { k: 'attack' }; } return tgt.n + '의 해시계 +' + FOE_X.sundial.glassBack; } if (tgt.chant) { tgt.chant = null; tgt.teleTurn = null; tgt.pyreRest = 0; tgt.intent = { k: tgt.role === 'maid' ? 'mchant' : 'chant' }; return tgt.n + '의 영창이 처음으로 돌아간다'; } if (tgt.glow > 0) { tgt.glow = Math.max(0, tgt.glow - 2); if (tgt.intent && tgt.intent.k === 'charge') { tgt.intent = { k: 'attack' }; tgt.teleTurn = null; } return tgt.n + '의 달아오름 ' + tgt.glow; } if (tgt.embers > 0) { tgt.embers = Math.max(0, tgt.embers - 2); return tgt.n + '의 불씨 ' + tgt.embers; } return '되돌릴 것이 없다'; }
    case 'wallbreak': addBreak(b, tgt, 30); return tgt.n + '에게 붕괴 +30';
    case 'slow': addS(b, tgt, 'chill', v || 2); return tgt.n + '에게 둔화 ' + (v || 2);
    case 'nobloat': b.noBloat = 1; return '숯 천으로 코와 입을 막는다';
  }
  return '';
}
/* 플라스크 채우기(10월 14일 개편 3단계): 전투 밖에서 약초 · 각성 잎 N개로 플라스크 한 칸. 고급은 2개로 세고, 일반부터 쓴다 */
const FLASK_N = { life: '생명력 플라스크', stam: '스태미나 플라스크' };
const consUnits = c => c.g === 'm' ? 2 : 1;
function consBrewOf(run, id) {
  const B = CONS_BREW[id]; if (!B || !run || !run.p) return null; const p = run.p;
  const need = B[run.mode === 'hard' ? 'hard' : 'normal'], have = (run.cons || []).filter(c => c.id === id).reduce((a, c) => a + c.n * consUnits(c), 0);
  const cur = (p.flask && p.flask[B.flask]) || 0, cap = flaskCap(p, B.flask);
  const why = G.b && !G.b.over ? '전투 밖에서 채웁니다' : cur >= cap ? FLASK_N[B.flask] + '가 가득 찼습니다' : have < need ? CONS[id].n + ' ' + need + '개가 필요합니다(지금 ' + have + '개)' : '';
  return { flask: B.flask, name: FLASK_N[B.flask], need, have, cur, cap, why };
}
function consBrew(run, id) {
  const s = consBrewOf(run, id); if (!s) return '채울 수 없는 소모품입니다'; if (s.why) return s.why;
  let left = s.need; const L = run.cons.map((c, i) => ({ c, i })).filter(x => x.c.id === id).sort((a, b) => consUnits(a.c) - consUnits(b.c) || a.c.n - b.c.n);
  for (const { c } of L) { while (left > 0 && c.n > 0) { c.n--; left -= consUnits(c); } if (left <= 0) break; }
  run.cons = run.cons.filter(c => c.n > 0);
  run.p.flask[s.flask] = s.cur + 1;
  (run.brewLog || (run.brewLog = [])).push({ ch: run.ch || 1, room: run.room, id, n: s.need, flask: s.flask, t: Date.now() });
  return '';
}
/* 챕터 전용 소모품(only)은 다른 챕터로 넘어가면 판매가만큼 골드로 바뀐다(10월 14일 개편 4단계) */
function consChRefund(run) {
  let gold = 0; const names = []; const keep = c => { const D = CONS[c.id]; if (!D || !D.only || D.only === (run.ch || 1)) return true; gold += consSell(c) * c.n; names.push(D.n + ' ×' + c.n); return false; };
  run.cons = (run.cons || []).filter(keep); if (run.consPending) run.consPending = run.consPending.filter(keep);
  if (gold) { run.gold = (run.gold || 0) + gold; (run.consRetireLog || (run.consRetireLog = [])).push({ items: names, gold, ch: run.ch, t: Date.now() }); }
  return { gold, names };
}
/* 챕터당 사용 횟수(10월 14일 개편 2단계): CONS_CH의 효과 종류별로 센다. run.consCh = { ch, [k]: 쓴 수 }, 챕터가 바뀌면 처음부터 */
const consChLim = (run, D) => { const L = CONS_CH[D.k]; return L ? L[run && run.mode === 'hard' ? 'hard' : 'normal'] : 0; };
const consChUsed = (run, D) => { const u = run && run.consCh; return u && u.ch === (run.ch || 1) ? (u[D.k] || 0) : 0; };
function consChAdd(run, D) { if (!CONS_CH[D.k]) return; if (!run.consCh || run.consCh.ch !== (run.ch || 1)) run.consCh = { ch: run.ch || 1 }; run.consCh[D.k] = (run.consCh[D.k] || 0) + 1; }
/* 소모품이 적에게 남긴 효과(10월 14일): 적 카드 칩 [키, 아이콘, 짧은 글]과 설명. 다음 행동·공격에 쓰이면 사라진다 */
function consMarks(e) {
  const L = [];
  if (e.markDmg) L.push(['mark', '🖍️', '표식 +' + Math.round(e.markDmg * 100) + '%']);
  if (e.redNext) L.push(['red', '💫', '다음 공격 −' + Math.round(e.redNext * 100) + '%']);
  if (e.missNext) L.push(['miss', '🌫️', '다음 공격 빗나감']);
  if (e.bigRed) L.push(['big', '🔔', '큰 공격 −' + Math.round(e.bigRed * 100) + '%']);
  if (e.limeDelay && !e.pile) L.push(['lime', '⚪', '쓰러지면 부활 +' + e.limeDelay + '라운드']);
  if (e.noHeal) L.push(['noheal', '🚫', '다음 치유 −' + Math.round(CONS.hinder.v * 100) + '%']);
  if (e.noSummon) L.push(['nosummon', '🚫', '다음 소환 막힘']);
  if (e.stuck) L.push(['stuck', '🍯', '끈끈이']);
  if (e.unguard) L.push(['unguard', '🪝', '지키기 풀림']);
  if (e.norise && e.role === 'skeleton' && !e.pile) L.push(['norise', '⚪', '다시 일어서지 못함']);
  return L;
}
const CONS_MARK_D = {
  mark: e => '이 적이 받는 다음 직접 피해 한 번이 ' + Math.round(e.markDmg * 100) + '% 커집니다. 맞으면 사라집니다.',
  red: e => '이 적의 다음 공격 하나가 주는 피해가 ' + Math.round(e.redNext * 100) + '% 줄어듭니다. 화상 같은 지속 피해에는 쓰이지 않습니다.',
  miss: () => '이 적의 다음 공격 하나가 빗나갑니다.',
  noheal: () => '이 적의 다음 치유량이 ' + Math.round(CONS.hinder.v * 100) + '% 줄어듭니다.',
  big: e => '이 적이 모으는 큰 공격(강타 · 겨누기 · 영창)의 피해가 ' + Math.round(e.bigRed * 100) + '% 줄어듭니다. 그 공격이 나가면 사라집니다.',
  lime: e => '이 해골이 쓰러져 뼈 더미가 되면 부활까지 ' + e.limeDelay + '라운드가 더 걸립니다.',
  nosummon: () => '이 적의 다음 소환 한 번이 막힙니다.',
  stuck: () => '이 적이 다음에 달아나려 하면 끈끈이에 걸려 달아나지 못합니다.',
  unguard: () => '이 적은 다음 행동까지 동료를 지키지 못합니다.',
  norise: () => '이 해골은 쓰러져도 다시 일어서지 않습니다.',
};
function consUse(b, run, idx, tgtId) {
  const c = (run.cons || [])[idx]; if (!c) return '없는 소모품입니다'; const why = consWhyNot(b, run, c, tgtId); if (why) return why;
  const D = CONS[c.id]; const tgt = D.tgt === 'enemy' ? consTarget(b, D, tgtId) : null; const msg = consApply(b, run, c, tgt);
  c.fresh=false;c.n--; if (c.n <= 0) run.cons.splice(idx, 1); consChAdd(run, D);
  if (b) b.consF = (b.consF || 0) + 1; // 한 전투에 쓴 수 (물러나기로 끝난 전투도 센다)
  if (b && !b.over) { b.consN = (b.consN || 0) + 1; logp(b, 'good', '🎒 ' + consName(c) + '. ' + msg); b.rec.push({ k: 'cons', id: c.id, g: c.g }); checkEnd(b); }
  else if (b && b.over === 'flee') logp(b, 'good', '🎒 ' + consName(c) + '. ' + msg);
  else toast(consName(c) + '. ' + msg);
  run.consLog = run.consLog || []; run.consLog.push({ ch: run.ch || 1, g: c.g, name: consName(c), id: c.id, room: run.room, fight: !!b, t: Date.now() });
  return '';
}
/* 전리품: 적 하나마다 (LOOT). 소환된 적 · 수련장 · 시험 상황은 떨구지 않는다. 전투를 이기면 받는다(grantDrops) */
function rollDrops(b, e) {
  if (e.summoned || !b.ctx || b.ctx.tut || b.ctx.scen || b.ctx.test || e.role === 'root') return;
  const n0 = (b.drops || []).length; rollDrops0(b, e); const got = (b.drops || []).slice(n0); if (got.length) logp(b, 'good', '🎁 ' + e.n + '이(가) ' + dropText(got) + '을(를) 떨어뜨린다'); // 10월 5일: 쓰러뜨릴 때 무엇이 떨어졌는지 보인다
}
/* 떨어진 것들을 한 줄로: 약초 묶음 ×2, 골드 8, 플라스크 한 칸 */
function dropText(L) { const m = {}; let g = 0; for (const d of L) { if (d.gold) g += d.gold; else if (d.cons) { const nm = CONS[d.cons].ico + ' ' + consName({ id: d.cons, g: d.g }); m[nm] = (m[nm] || 0) + 1; } else if (d.flask) m['🧪 플라스크 한 칸'] = (m['🧪 플라스크 한 칸'] || 0) + 1; } const a = Object.entries(m).map(([k, n]) => k + (n > 1 ? ' ×' + n : '')); if (g) a.push('💰 골드 ' + g); return a.join(', '); }
/* 3챕터 전리품 무게 (12.3절): 3챕터 소모품 ×2, 방금 싸운 역할 · 특성의 답 ×2, 1 · 2챕터의 파는 것은 3챕터 것과 바꾼다(dw3) */
function cons3W(b, k, vsR) { const D = CONS[k]; const base = D.dw3 != null ? D.dw3 : (D.dw != null ? D.dw : D.use === 'none' ? 0.5 : 1) * (D.ch === 3 ? 2 : 1); const vs = (D.vs && vsR.includes(D.vs)) || (D.vs3 && vsR.includes(D.vs3)) || (D.vsMod && hasMod(b, D.vsMod)); return base * (vs ? 2 : 1); }
function rollDrops0(b, e) {
  const L = e.role === 'boss' ? LOOT.big : e.strong ? (LOOT.strong || LOOT.big) : e.elite ? LOOT.elite : LOOT.normal; const rr = b.rngF || Math.random;
  const chN = (b.ctx && b.ctx.ch) || 1; const noCure = !!(b.ctx && b.ctx.marks && b.ctx.marks.indexOf('nocure') >= 0); const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) <= chN && !(CONS[k].only && CONS[k].only !== chN) && !(noCure && (CONS[k].k === 'heal' || CONS[k].k === 'healcure'))); /* 표식 도전 nocure: 생명력을 되찾는 소모품은 떨어지지 않는다 */ const vsR = b.vsRoles || (b.vsRoles = b.en.map(x => x.role)); const pick = () => { const w = ids.map(k => chN >= 3 ? cons3W(b, k, vsR) : (chN >= 2 && CONS[k].dw2 != null ? CONS[k].dw2 : CONS[k].ch === chN && chN >= 2 ? 1.5 : CONS[k].dw != null ? CONS[k].dw : CONS[k].use === 'none' ? 0.5 : 1) * (CONS[k].vs && vsR.includes(CONS[k].vs) ? 1.5 : 1)); /* 10월 5일: 챕터 소모품, 방금 싸운 역할의 답(vs) ×1.5 */ let x = rr() * w.reduce((a, c) => a + c, 0); for (let i = 0; i < ids.length; i++) { x -= w[i]; if (x <= 0) return ids[i]; } return ids[0]; };
  b.drops = b.drops || [];
  if (rr() < Math.min(0.01, L.flask * (b.lootMul || 1) * (b.lootX || 1))) b.drops.push({ flask: ['life', 'mana', 'stam'][Math.floor(rr() * 3)] }); // 플라스크 한 칸: 1% 이하
  for (let k = 0; k < L.rolls; k++) {
    if (rr() >= Math.min(1, L.p * (b.lootMul || 1) * (b.lootX || 1))) continue;
    const x = rr() * (L.gold + L.cons);
    if (x < L.gold) b.drops.push({ gold: LOOT.goldPer(e.lv || 1) });
    else { const n = L.n[0] + Math.floor(rr() * (L.n[1] - L.n[0] + 1)); for (let i = 0; i < n; i++) { const id = pick(); b.drops.push({ cons: id, g: CONS[id].vm != null && rr() < L.hi + (b.ctx.lower ? LOOT.lowerHi : 0) ? 'm' : 'n' }); } }
  }
}
function grantDrops(run, b) {
  const D = (b && b.drops) || []; if (!D.length) return; const p = run.p; let gold = 0, lost = 0; const got = {};
  for (const d of D) {
    if (d.gold) gold += d.gold;
    if (d.cons) { const left = consGrant(run, d.cons, d.g, 1); if (!left) { const nm = consName({ id: d.cons, g: d.g }); got[nm] = (got[nm] || 0) + 1; } }
    if (d.flask) { if ((p.flask[d.flask] || 0) < flaskCap(p, d.flask)) { p.flask[d.flask] = (p.flask[d.flask] || 0) + 1; got['플라스크 한 칸'] = (got['플라스크 한 칸'] || 0) + 1; } }
  }
  if (gold) gainGold(run, gold, '전리품');
  const txt = Object.entries(got).map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', ');
  if (txt || (run.consPending || []).length) toast('전리품: ' + (txt || '가방에 넣을 소모품을 골라 주세요') + ((run.consPending || []).length && txt ? '. 공간이 부족한 소모품은 직접 골라 챙깁니다' : ''));
  run.lootLog = run.lootLog || []; run.lootLog.push({ room: run.room, gold, got, lost, pending: (run.consPending || []).map(c => Object.assign({}, c)) });
  b.drops = [];
}
function loseLoot(o) { if (o.k === 'item' && o.run && o.run.inv) delete o.run.inv[o.u]; }
function spawn(b, role) {
  if (alive(b).filter(e => e.role === 'minion').length >= 4) return null;
  const e = mkEnemy(role, 0, b.idc++, { lv: (b.ctx && b.ctx.lv) || 1, name: b.ctx && b.ctx.names && b.ctx.names[role] }); e.summoned = true; decideIntent(b, e); b.en.push(e); return e;
}

