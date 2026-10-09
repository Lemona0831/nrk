'use strict';
/* ===== 소모품 (10월 4일, data/consumables.js) =====
   run.cons = [{ id, g, n }] 겹. 가방 칸 = 장비 수 + 소모품 겹 수(bagUsed). 전투 중에는 차례 칸을 쓰지 않고, 한 차례에 CONS_TURN개까지. 같은 효과는 겹치지 않는다(이미 걸린 강화 · 없는 상태면 버튼이 잠긴다) */
const consSell = c => { const D = CONS[c.id]; return D.use === 'none' ? D.sell : Math.max(1, Math.round(D.price * 0.4 * (c.g === 'm' ? 1.6 : 1))); }; // 소모품 팔 때 값
const bagUsed = run => (run.bag ? run.bag.length : 0) + ((run.cons || []).length);
const consVal = c => { const D = CONS[c.id]; return c.g === 'm' && D.vm != null ? D.vm : D.v; };
const consName = c => CONS[c.id].n + (c.g === 'm' ? ' (고급)' : '');
const consLvMul = b => 1 + 0.15 * (((b && b.ctx && b.ctx.lv) || 1) - 1);
function consAdd(run, id, g, n) {
  run.cons = run.cons || []; const D = CONS[id]; if (!D) return n; g = g === 'm' && D.vm != null ? 'm' : 'n'; let left = n || 1;
  for (const c of run.cons) if (left > 0 && c.id === id && c.g === g && c.n < D.max) { const t = Math.min(left, D.max - c.n); c.n += t; left -= t; }
  while (left > 0 && bagUsed(run) < BAG_MAX) { const t = Math.min(left, D.max); run.cons.push({ id, g, n: t }); left -= t; }
  return left;
}
const myTurn = b => !!(b && !b.over && b.queue && b.queue[0] === 'p');
function consTargets(b, D) {
  const al = alive(b).filter(e => e.role !== 'root');
  switch (D.k) {
    case 'unevade': return al.filter(e => e.evading || e.haze > 0);
    case 'unbrace': return al.filter(e => e.braced);
    case 'unguard': return al.filter(e => e.guarding || (e.role === 'shield' && hasShield(b, null) === e));
    case 'unbless': return al.filter(e => e.s.empower || e.fireNext);
    case 'noheal': return al.filter(e => e.role === 'healer' && !e.noHeal);
    case 'nosummon': return al.filter(e => e.role === 'summoner' && !e.noSummon);
    case 'sticky': return al.filter(e => e.role === 'thief' && !e.stuck);
    case 'norise': return al.filter(e => e.role === 'skeleton' && !e.rose && !e.norise);
    case 'wallbreak': return al.filter(e => e.role === 'bonewall');
    case 'slow': return al.filter(e => !e.pile && e.role !== 'bonewall');
    case 'interrupt': return al.filter(e => e.intent && (['charge', 'heavy', 'aim', 'chant', 'chanting', 'burn', 'noon', 'mchant', 'mchanting', 'msong'].includes(e.intent.k) || e.intent.aimed) && e.role !== 'boss' && !e.under);
    case 'rewind': return al.filter(e => e.foe === 'sundial' || e.glow > 0 || e.embers > 0 || e.chant);
    default: return al;
  }
}
function consTarget(b, D, tgtId) {
  const ts = consTargets(b, D); const sel = tgtId && ts.find(e => e.id === tgtId); if (sel) return sel;
  if (D.k === 'dart') return ts.slice().sort((x, y) => ((y.row === 'back') - (x.row === 'back')) || (x.hp - y.hp))[0];
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
  switch (D.k) {
    case 'heal': return p.hp >= p.hpMax ? '생명력이 가득합니다' : '';
    case 'stam': return p.st >= p.stMax ? '스태미나가 가득합니다' : '';
    case 'quick': return b.extraQuick ? '이미 효과가 있습니다' : '';
    case 'cure': return p.s[D.s] ? '' : '그 상태가 없습니다';
    case 'block': return st(p, 'block') > 0 ? '이미 막음이 있습니다' : '';
    case 'halfboom': return b.halfBoom === b.round ? '이미 효과가 있습니다' : '';
    case 'blind': { const bk = alive(b).filter(e => e.row === 'back' && e.role !== 'root'); return !bk.length ? '후열 적이 없습니다' : bk.every(e => e.missNext) ? '이미 효과가 있습니다' : ''; }
    case 'decoy': return p.decoy ? '이미 효과가 있습니다' : '';
    case 'guard1': return p.nextRed ? '이미 효과가 있습니다' : '';
    case 'whet': return p.whet ? '이미 효과가 있습니다' : '';
    case 'antisteal': return b.antiSteal ? '이미 효과가 있습니다' : '';
    case 'lootx': return (b.lootX || 1) > 1 ? '이미 효과가 있습니다' : '';
    case 'unmod': return D.mods.some(m => hasMod(b, m)) ? '' : '끌 방 특성이 없습니다';
    case 'escape': return b.ctx.boss || b.ctx.scen || b.ctx.tut ? '보스전에서는 쓰지 못합니다' : '';
    case 'burnpiles': return alive(b).some(e => e.pile) ? '' : '뼈 더미가 없습니다';
    case 'trim': return HEX.kinds.concat(['chill']).some(k => p.s[k]) ? '' : '해로운 상태가 없습니다';
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
    case 'interrupt': { const was = tgt.intent.k, aimed = !!tgt.intent.aimed; tgt.intent = { k: 'attack' }; tgt.teleTurn = null; if (tgt.chant) { tgt.chant = null; tgt.pyreRest = 1; } if (was === 'noon') { tgt.noonNext = 0; tgt.clock = Math.max(tgt.clock || 0, FOE_X.sundial.bellBack); return tgt.n + '의 정오의 빛이 흩어진다. 해시계 ' + tgt.clock; } if (MCH_K.includes(was)) return tgt.n + '의 영창을 끊는다'; return tgt.n + '이(가) 모으던 ' + (was === 'aim' || aimed ? '겨누기' : CHANT_K.includes(was) ? '영창' : '강타') + '를 놓친다'; }
    case 'halfboom': b.halfBoom = b.round; return '이번 라운드 화형 피해 절반';
    case 'blind': for (const e of alive(b)) if (e.row === 'back' && e.role !== 'root') e.missNext = 1; return '후열 적들의 다음 공격이 빗나간다';
    case 'unevade': if (!tgt.evading && tgt.haze > 0) { tgt.haze--; if (!tgt.haze) tgt.hazeSrc = null; return tgt.n + '의 허상 한 겹이 깨진다'; } tgt.evading = 0; return tgt.n + '이(가) 몸을 일으킨다';
    case 'unbrace': tgt.braced = 0; return tgt.n + '의 버티기가 풀린다';
    case 'decoy': p.decoy = 1; return '미끼 인형을 세운다';
    case 'unguard': tgt.guarding = null; tgt.unguard = 1; return tgt.n + '이(가) 동료를 지키지 못한다';
    case 'unbless': delete tgt.s.empower; if (tgt.fireNext) { tgt.fireNext = 0; return tgt.n + '이(가) 받은 불씨가 꺼진다'; } return tgt.n + '의 축복이 꺼진다';
    case 'noheal': tgt.noHeal = 1; return tgt.n + '의 다음 치유를 막는다';
    case 'nosummon': tgt.noSummon = 1; return tgt.n + '의 다음 소환을 막는다';
    case 'antisteal': b.antiSteal = 1; return '쇠붙이를 흘려 둔다';
    case 'sticky': tgt.stuck = 1; return tgt.n + '의 발에 끈끈이가 붙는다';
    case 'aoe': { const d = v * consLvMul(b); for (const e of alive(b)) if (e.role !== 'root') hurtEnemy(b, e, d, { aoe: 1, label: D.n }); return '적 모두에게 피해'; }
    case 'dart': hurtEnemy(b, tgt, v * consLvMul(b), { single: 1, label: D.n }); return tgt.n + '에게 던진다';
    case 'brk': addBreak(b, tgt, v); return tgt.n + '에게 붕괴 +' + v;
    case 'whet': p.whet = v; return '다음 공격 피해 +' + Math.round(v * 100) + '%';
    case 'mark': tgt.markDmg = v; return tgt.n + '에게 표식';
    case 'guard1': p.nextRed = v; return '다음 공격 피해 −' + Math.round(v * 100) + '%';
    case 'unmod': { const m = D.mods.find(x => hasMod(b, x)); b.ctx.mods = b.ctx.mods.filter(x => x !== m); if (m === 'haze') for (const e of alive(b)) if (!e.hazeSrc) e.haze = 0; return (ROOM_MODS[m] ? ROOM_MODS[m].n : m) + '을(를) 끈다'; }
    case 'escape': b.over = 'flee'; return '연기 속으로 물러난다';
    case 'lootx': b.lootX = 2; return '이 전투의 전리품 확률 두 배';
    case 'norise': if (tgt.pile) { tgt.norise = 1; tgt.hp = 0; killEnemy(b, tgt); return '뼈 더미가 흩어진다'; } tgt.norise = 1; return tgt.n + '은(는) 다시 일어서지 못한다';
    case 'burnpiles': { let n = 0; for (const e of alive(b).filter(x => x.pile)) { e.norise = 1; e.hp = 0; killEnemy(b, e); n++; } for (const e of alive(b)) if (e.role !== 'root') addS(b, e, 'ignite', 2); return '뼈 더미 ' + n + '개를 태운다. 적 모두 화상 2'; }
    case 'trim': { for (const k of HEX.kinds.concat(['chill'])) if (p.s[k]) kwDec(p, k); return '해로운 상태가 종류마다 1씩 준다'; }
    case 'unearth': { for (const e of alive(b).filter(x => x.under && x.role !== 'boss')) { e.under = 0; e.stkPrep = 0; e.intent = { k: 'attack' }; e.teleTurn = null; addS(b, e, 'vuln', 1); } return '땅속의 적을 끌어낸다'; }
    case 'cool': { const d = heatAdd(b, -v, D.n); return '열기 ' + Math.round(d); }
    case 'unhaze': { for (const e of alive(b)) if (e.haze > 0) { e.haze = 0; e.hazeSrc = null; } return '모든 적의 허상이 걷힌다'; }
    case 'healcure': { const h = Math.min(p.hpMax - p.hp, p.hpMax * v * healMul(p)); p.hp += h; delete p.s.ignite; return '생명력 +' + r1(h) + ', 화상이 사라진다'; }
    case 'reveal': { for (const d of run.doors || []) d.hide = 0; run.dg.reveal = (run.dg.reveal || []).concat([run.room + 1]); return '이 층과 다음 층 문의 보상이 보인다'; }
    case 'rewind': { if (tgt.foe === 'sundial') { tgt.clock = Math.min(FOE_X.sundial.clock, (tgt.clock || 0) + FOE_X.sundial.glassBack); if (tgt.noonNext) { tgt.noonNext = 0; tgt.teleTurn = null; tgt.intent = { k: 'attack' }; } return tgt.n + '의 해시계 +' + FOE_X.sundial.glassBack; } if (tgt.chant) { tgt.chant = null; tgt.teleTurn = null; tgt.pyreRest = 0; tgt.intent = { k: tgt.role === 'maid' ? 'mchant' : 'chant' }; return tgt.n + '의 영창이 처음으로 돌아간다'; } if (tgt.glow > 0) { tgt.glow = Math.max(0, tgt.glow - 2); if (tgt.intent && tgt.intent.k === 'charge') { tgt.intent = { k: 'attack' }; tgt.teleTurn = null; } return tgt.n + '의 달아오름 ' + tgt.glow; } if (tgt.embers > 0) { tgt.embers = Math.max(0, tgt.embers - 2); return tgt.n + '의 불씨 ' + tgt.embers; } return '되돌릴 것이 없다'; }
    case 'wallbreak': addBreak(b, tgt, 30); return tgt.n + '에게 붕괴 +30';
    case 'slow': addS(b, tgt, 'chill', 2); return tgt.n + '에게 둔화 2';
    case 'nobloat': b.noBloat = 1; return '숯 천으로 코와 입을 막는다';
  }
  return '';
}
function consUse(b, run, idx, tgtId) {
  const c = (run.cons || [])[idx]; if (!c) return '없는 소모품입니다'; const why = consWhyNot(b, run, c, tgtId); if (why) return why;
  const D = CONS[c.id]; const tgt = D.tgt === 'enemy' ? consTarget(b, D, tgtId) : null; const msg = consApply(b, run, c, tgt);
  c.n--; if (c.n <= 0) run.cons.splice(idx, 1);
  if (b && !b.over) { b.consN = (b.consN || 0) + 1; logp(b, 'good', '🎒 ' + consName(c) + '. ' + msg); b.rec.push({ k: 'cons', id: c.id, g: c.g }); checkEnd(b); }
  else if (b && b.over === 'flee') logp(b, 'good', '🎒 ' + consName(c) + '. ' + msg);
  else toast(consName(c) + '. ' + msg);
  run.consLog = run.consLog || []; run.consLog.push({ id: c.id, room: run.room, fight: !!b, t: Date.now() });
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
  const chN = (b.ctx && b.ctx.ch) || 1; const noCure = !!(b.ctx && b.ctx.marks && b.ctx.marks.indexOf('nocure') >= 0); const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) <= chN && !(noCure && (CONS[k].k === 'heal' || CONS[k].k === 'healcure'))); /* 표식 도전 nocure: 생명력을 되찾는 소모품은 떨어지지 않는다 */ const vsR = b.vsRoles || (b.vsRoles = b.en.map(x => x.role)); const pick = () => { const w = ids.map(k => chN >= 3 ? cons3W(b, k, vsR) : (chN >= 2 && CONS[k].dw2 != null ? CONS[k].dw2 : CONS[k].ch === chN && chN >= 2 ? 1.5 : CONS[k].dw != null ? CONS[k].dw : CONS[k].use === 'none' ? 0.5 : 1) * (CONS[k].vs && vsR.includes(CONS[k].vs) ? 1.5 : 1)); /* 10월 5일: 챕터 소모품, 방금 싸운 역할의 답(vs) ×1.5 */ let x = rr() * w.reduce((a, c) => a + c, 0); for (let i = 0; i < ids.length; i++) { x -= w[i]; if (x <= 0) return ids[i]; } return ids[0]; };
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
    if (d.cons) { const left = consAdd(run, d.cons, d.g, 1); if (left) lost++; else { const nm = consName({ id: d.cons, g: d.g }); got[nm] = (got[nm] || 0) + 1; } }
    if (d.flask) { if ((p.flask[d.flask] || 0) < flaskCap(p, d.flask)) { p.flask[d.flask] = (p.flask[d.flask] || 0) + 1; got['플라스크 한 칸'] = (got['플라스크 한 칸'] || 0) + 1; } }
  }
  if (gold) gainGold(run, gold, '전리품');
  const txt = Object.entries(got).map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', ');
  if (txt || lost) toast('전리품: ' + (txt || '없음') + (lost ? '. 가방이 가득 차 ' + lost + '개를 두고 왔습니다' : ''));
  run.lootLog = run.lootLog || []; run.lootLog.push({ room: run.room, gold, got, lost });
  b.drops = [];
}
function loseLoot(o) { if (o.k === 'item' && o.run && o.run.inv) delete o.run.inv[o.u]; }
function spawn(b, role) {
  if (alive(b).filter(e => e.role === 'minion').length >= 4) return null;
  const e = mkEnemy(role, 0, b.idc++, { lv: (b.ctx && b.ctx.lv) || 1, name: b.ctx && b.ctx.names && b.ctx.names[role] }); e.summoned = true; decideIntent(b, e); b.en.push(e); return e;
}

