'use strict';
/* ===== 0.8.0 A2 2챕터 「어둠이 가라앉은 거리」 (만든 사람 확정 10월 21일, docs/챕터/2챕터.md) =====
   잡몹 행동은 확정본의 패턴대로. 강적 · 보스의 기믹과 대처는 비공개 문서. 값은 data/dungeon.js(LAMP · MARKET · AFFIX2 · DEBT_ALTAR · CH2X · FOE_X)와
   data/foes.js(예고 문장 · 대답 태그 · 타수). 흐름의 갈고리: decideIntent(ch2Intent · strong2Intent · bardoIntent) · enemyAct(ch2Act) · 예고(ch2Text · ch2Badge) ·
   피해(ch2OutMul · ch2InMul · ch2HitMul · ch2FoeOut) · 상태(ch2StatusAdd) · 라운드(ch2Tick) · 시작(ch2Setup) · 무너짐(ch2OnBreak) · 쓰러짐(ch2OnKill) · 행동(ch2Actions · ch2PlayerAct) */
function isCh2(b) { return ((b && b.ctx && b.ctx.ch) || 1) === 2; }
const ch2RunOf = b => (typeof G !== 'undefined' && G.run && G.run.p === b.p ? G.run : null);
const ch2Mates = (b, e) => alive(b).filter(x => x !== e && realFoe(x));
const ch2Lamps = b => b.en.filter(x => x.role === 'lantern' && x.alive);
const ch2Dark = b => hasMod(b, 'dark');
const CH2_BIG = ['charge', 'heavy', 'aim', 'finalbell', 'seize', 'torch', 'pouroil']; // 어둠 속에서도 소리로 알리는 큰 공격(확정본: 큰 공격만)

/* --- 의도(decideIntent의 역할 칸) --- */
function ch2Intent(b, e, n, al) {
  const p = b.p, mates = ch2Mates(b, e);
  switch (e.role) {
    case 'dun': { const c = n % 3; return c === 1 ? { k: 'ledger' } : c === 2 ? { k: 'dunning' } : { k: 'attack' }; } // 몽둥이질 → 장부 적기 → 독촉
    case 'thug': { // 막아서기(우두머리 · 다친 동료) → 밀쳐내기 → 버티기. 혼자 남으면 버티기만
      if (!mates.length) return { k: 'brace' };
      const c = n % 3; const lead = mates.filter(x => x.elite || x.strong || x.hp < x.hpMax * 0.6).sort((x, y) => (y.elite - x.elite) || (x.hp / x.hpMax - y.hp / y.hpMax))[0];
      if (c === 0 && lead && !alive(b).some(x => x !== e && x.guarding === lead.id)) return { k: 'guard', tgt: lead.id };
      return c === 2 ? { k: 'brace' } : { k: 'shove' };
    }
    case 'xbow': { const c = n % 4; if (c === 0) return bigPending(b, e) ? { k: 'attack' } : { k: 'aim' }; if (c === 1) return e.intent && e.intent.k === 'aim' ? { k: 'attack', aimed: 1 } : { k: 'attack' }; return c === 2 ? { k: 'volley' } : { k: 'evade' }; } // 겨누기 → 큰 한 발 → 연사 → 자리 옮기기
    case 'quack': { // 꿰매기(정예 · 우두머리 먼저) → 진통제 → 메스
      const hurt = alive(b).filter(x => realFoe(x) && x.hp < x.hpMax * PRIEST.heal).sort((x, y) => ((y.elite || y.strong ? 1 : 0) - (x.elite || x.strong ? 1 : 0)) || (x.hp / x.hpMax - y.hp / y.hpMax))[0];
      if (hurt && e.intentPrev !== 'heal') return { k: 'heal', tgt: hurt.id };
      const sick = mates.find(x => KW_BAD.some(k => x.s[k]));
      return n % 2 === 0 && sick ? { k: 'remedy', tgt: sick.id } : { k: 'attack', bleed: 1 };
    }
    case 'fence': { if (e.loot) { e.lootAge = (e.lootAge || 0) + 1; return e.lootAge >= 2 ? { k: 'flee' } : { k: 'attack' }; } return n % 2 === 0 ? { k: 'steal' } : { k: 'attack' }; } // 훔치기 → 찌르기 → (훔쳤으면 2라운드 뒤) 달아나기
    case 'arson': { const c = n % 3; if (c === 2 && st(p, 'ignite') > 0) return { k: 'torch' }; return c === 0 ? { k: 'douse' } : c === 1 ? { k: 'torch' } : { k: 'firepot2' }; } // 기름 뿌리기 → 불붙이기 → 불단지(화상이 걸린 상대엔 더 붓는다)
    case 'smoker': { const c = n % 3; return c === 0 ? { k: 'smoke' } : c === 1 ? { k: 'dream' } : { k: 'sting' }; }
    case 'hound': { const c = n % 3; const other = mates.find(x => x.role === 'hound' && !x.s.haste); return c === 1 ? { k: 'lunge' } : c === 2 && other ? { k: 'bark', tgt: other.id } : { k: 'attack', bleed: 1 }; } // 물어뜯기 → 달려들기 → 짖기
    case 'overseer': { const c = n % 3; const ch = alive(b).filter(x => x.role === 'chained').length; if (c === 0 && ch < 2) return { k: 'chain' }; const w = mates.filter(x => !x.s.empower).sort((x, y) => (y.role === 'chained') - (x.role === 'chained') || y.dmg - x.dmg)[0]; return c === 1 && w ? { k: 'whip', tgt: w.id } : { k: 'attack' }; }
    case 'chained': { const ov = alive(b).find(x => x.role === 'overseer'); if (!ov) return { k: 'none' }; const first = alive(b).filter(x => x.role === 'chained')[0] === e; return first && n % 2 === 0 && !alive(b).some(x => x !== e && x.guarding === ov.id) ? { k: 'guard', tgt: ov.id } : { k: 'attack' }; }
    case 'pitboss': { // 종 치기 → 판 짜기 → 채찍. 결승 종은 한 바퀴 뒤 한 번. 무리가 줄면 새 싸움꾼을 먼저
      if (!e.ultDone && n >= 3 && !bigPending(b, e)) { e.ultDone = 1; return { k: 'finalbell' }; }
      if (mates.length < 2 && !(e.arranged > 0)) return { k: 'arrange' };
      const c = n % 3; const w = mates.filter(x => !x.s.empower).sort((x, y) => y.dmg - x.dmg)[0];
      return c === 0 ? { k: 'ringbell' } : c === 1 && !(e.arranged > 0) ? { k: 'arrange' } : w ? { k: 'whip', tgt: w.id } : { k: 'attack' };
    }
    case 'loser': { const angry = p.s.broken || st(p, 'weak') > 0 || st(p, 'chill') > 0; const c = n % 3; if (!angry) return c === 0 ? { k: 'hesitate' } : c === 1 ? { k: 'attack' } : { k: 'hesitate' }; return c === 2 ? { k: 'grab' } : { k: 'attack' }; }
    case 'lampkeeper': { const lp = ch2Lamps(b).find(x => !alive(b).some(y => y.guarding === x.id)); return n % 2 === 0 && lp ? { k: 'guard', tgt: lp.id } : { k: 'attack' }; }
    case 'shade': return { k: 'attack' };
    case 'lantern': return { k: 'none' };
  }
  return null;
}
function strong2Intent(b, e, n) {
  const X = FOE_X[e.foe] || {};
  switch (e.foe) {
    case 'ledger': { if (!e.ultDone && (b.debt || 0) >= 15 && !bigPending(b, e)) { e.ultDone = 1; return { k: 'seize' }; } const c = n % 4; return c === 0 ? { k: 'dunning' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; }
    case 'champion': { if (!b.duel) return { k: 'duel' }; const c = n % 3; return c === 0 ? { k: 'combo' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; }
    case 'lampthief': { if (!ch2Dark(b)) return { k: 'douselamp' }; const c = n % 3; return c === 0 && !e.under ? { k: 'hide' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; }
    case 'captain': { const c = n % 4; return c === 0 ? { k: 'formation' } : c === 1 ? { k: 'brace' } : c === 2 ? { k: 'rally' } : { k: 'charge' }; }
    case 'merchant': { if (!b.trade) return { k: 'haggle' }; if (b.trade === 'yes') return { k: 'recover' }; const c = n % 3; return c === 0 ? { k: 'charge' } : c === 1 ? { k: 'appraise' } : { k: 'attack' }; }
  }
  return null;
}
/* 등불 상인 바르도 */
function bardoIntent(b, e, n) {
  if (e.relightNext) { e.relightNext = 0; if (ch2Lamps(b).some(x => !x.lit)) return { k: 'relight' }; }
  const ph = e.phase || 1, c = n % 4;
  if (ph === 1) return c === 0 ? { k: 'oilprice' } : c === 2 ? { k: 'pouroil' } : c === 3 && !alive(b).some(x => x.role === 'lampkeeper') ? { k: 'guardlamp' } : { k: 'attack' };
  if (ph === 2) return c === 0 ? { k: 'attack' } : c === 1 ? { k: 'pouroil' } : c === 2 ? { k: 'oilprice' } : { k: 'attack' };
  return c === 0 ? { k: 'charge' } : c === 2 ? { k: 'pouroil' } : { k: 'attack' };
}
/* 어둠 속 큰 공격: 내용은 숨기고 소리로 알린다(만든 사람 10월 21일) */
function ch2AfterIntent(b, e) {
  if (!ch2Dark(b) || e.row !== 'back' || e.role === 'boss' || !e.intent || !CH2_BIG.includes(e.intent.k)) return;
  logp(b, 'bad', '어둠 속에서 무언가 크게 숨을 들이쉰다'); if (typeof sfxPlay === 'function') sfxPlay('b_big');
}
const ch2DarkBig = (b, e) => ch2Dark(b) && e.row === 'back' && e.role !== 'boss' && !!e.intent && CH2_BIG.includes(e.intent.k);

/* --- 행동(enemyAct) --- */
function ch2Act(b, e, i, d) {
  const p = b.p, X = FOE_X[e.foe] || FOE_X[e.boss] || {}, tg = () => b.en.find(x => x.id === i.tgt && x.alive);
  if (i.k === 'attack' && e.ledgerAdd > 0) { const add = e.ledgerAdd; e.ledgerAdd = 0; const x = hurtPlayer(b, d + add, { src: e, single: 1, label: e.n + '이(가) 장부에 적은 만큼 내리친다' }); if (i.bleed && x > 0) addS(b, p, 'bleed', i.bleed); return 1; }
  if (i.k === 'attack' && e.lootA && !b.over) { const x = hurtPlayer(b, d, { src: e, single: 1, label: e.n + '이(가) 나를 친다' }); const run = ch2RunOf(b); if (x > 0 && run && run.gold > 0) { const g = Math.min(run.gold, AFFIX2.lootGold); run.gold -= g; e.lootGold = (e.lootGold || 0) + g; logp(b, 'bad', e.n + '이(가) 골드 ' + g + '을(를) 빼앗는다'); } return 1; }
  if (i.k === 'attack' && e.foe === 'merchant' && b.trade === 'yes') { logp(b, 'sys', e.n + '이(가) 공격하지 않는다. 거래가 끝나기를 기다린다'); return 1; }
  if (i.k === 'attack' && b.duel && e.role !== 'boss' && !e.strong && alive(b).some(x => x.foe === 'champion')) { logp(b, 'sys', e.n + '이(가) 뒤로 물러나 결투를 지켜본다'); return 1; }
  switch (i.k) {
    case 'ledger': { e.ledgerAdd = Math.min(e.dmg * 1.0, (e.tookSince || 0) * 0.5); e.tookSince = 0; logp(b, 'bad', e.n + '이(가) 장부에 적는다. 다음 공격 +' + r1(e.ledgerAdd)); return 1; }
    case 'dunning': { addS(b, p, 'weak', 2); logp(b, 'bad', e.n + '이(가) 독촉한다. 약화 2'); if (e.foe === 'ledger') ch2Debt(b, 2, '독촉'); return 1; }
    case 'shove': { const x = hurtPlayer(b, d * 0.6, { src: e, single: 1, label: e.n + '이(가) 밀쳐낸다' }); if (x >= 0 && !b.over) { p.shoved = 1; logp(b, 'bad', '자세가 흐트러진다. 다음 기본 공격 약화'); } return 1; }
    case 'volley': { for (let k = 0; k < 2 && !b.over; k++) hurtPlayer(b, d * 0.55, { src: e, single: 1, label: e.n + '이(가) 연달아 쏜다' }); return 1; }
    case 'remedy': { const t = tg(); const k = t && KW_BAD.filter(x => t.s[x]).sort((x, y) => st(t, y) - st(t, x))[0]; if (t && k) { delete t.s[k]; logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 진통제를 먹인다. ' + (KW_N[k] || k) + ' 지움'); } return 1; }
    case 'douse': { p.oiled = (p.oiled || 0) + 2; logp(b, 'bad', e.n + '이(가) 기름을 뿌린다. 다음에 걸리는 화상 +2'); return 1; }
    case 'torch': { const x = hurtPlayer(b, d * 0.5, { src: e, single: 1, spell: 1, label: e.n + '이(가) 불을 붙인다' }); if (!b.over) addS(b, p, 'ignite', 3); return 1; }
    case 'firepot2': { const x = hurtPlayer(b, d * 0.6, { src: e, aoe: 1, label: e.n + '이(가) 불단지를 던진다' }); if (!b.over) addS(b, p, 'ignite', 1); return 1; }
    case 'smoke': { addS(b, p, 'chill', 1); addS(b, p, 'weak', 1); logp(b, 'bad', e.n + '의 연기가 몸을 감싼다. 둔화 1 · 약화 1'); return 1; }
    case 'dream': { p.dreamR = (b.round || 0) + 1; logp(b, 'bad', e.n + '의 꿈 연기. 다음 라운드 스태미나 회복이 절반'); return 1; }
    case 'sting': { const x = hurtPlayer(b, d * 0.5, { src: e, single: 1, label: e.n + '이(가) 독침을 쏜다' }); if (x > 0 && !b.over) addPoison(b, p, 2, 0); return 1; }
    case 'lunge': { addS(b, e, 'haste', 1); const x = hurtPlayer(b, d, { src: e, single: 1, label: e.n + '이(가) 달려든다' }); if (x > 0 && !b.over) addS(b, p, 'bleed', 1); return 1; }
    case 'bark': { const t = tg(); if (t) { addS(b, t, 'haste', 1); logp(b, 'bad', e.n + '이(가) 짖는다. ' + t.n + ' 가속 1'); } return 1; }
    case 'chain': { const c = spawn(b, 'chained'); if (c) { c.chainOf = e.id; logp(b, 'bad', e.n + '이(가) 사슬을 당긴다. ' + c.n + '이(가) 끌려 나온다'); } return 1; }
    case 'whip': { const t = tg(); if (t) { addS(b, t, 'haste', 1); addS(b, t, 'empower', 1); logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 채찍을 휘두른다. 가속 1 · 강화 1'); } return 1; }
    case 'ringbell': { for (const x of ch2Mates(b, e).concat([e])) addS(b, x, 'haste', 1); logp(b, 'bad', e.n + '이(가) 종을 친다. 무리가 빨라진다'); return 1; }
    case 'arrange': { e.arranged = (e.arranged || 0) + 1; const c = spawn(b, 'hound'); if (c) logp(b, 'bad', e.n + '이(가) 판을 짠다. ' + c.n + '을(를) 푼다'); return 1; }
    case 'finalbell': { for (const x of ch2Mates(b, e)) { addS(b, x, 'empower', 1); x.forceAtk = 1; } logp(b, 'crit', e.n + '이(가) 결승 종을 친다. 무리가 모두 당신에게 덤벼든다'); return 1; }
    case 'hesitate': { logp(b, 'sys', e.n + '이(가) 머뭇거린다. 칼끝이 떨린다'); return 1; }
    case 'grab': { const x = hurtPlayer(b, d * 0.7, { src: e, single: 1, label: e.n + '이(가) 매달린다' }); if (!b.over) { p.grabbedR = (b.round || 0) + 1; logp(b, 'bad', '붙잡혔다. 다음 라운드 몸 빼기 불가'); } return 1; }
    case 'duel': { b.duel = 1; logp(b, 'crit', e.n + '이(가) 결투를 선언한다. 다른 적들이 뒤로 물러선다'); codexHit(b, 'champion', 'duel'); return 1; }
    case 'combo': { for (let k = 0; k < FOE_X.champion.hits && !b.over; k++) hurtPlayer(b, d * FOE_X.champion.combo, { src: e, single: 1, label: e.n + '의 연타' }); return 1; }
    case 'douselamp': { if (!b.ctx.mods.includes('dark')) b.ctx.mods.push('dark'); logp(b, 'crit', e.n + '이(가) 등불을 끈다. 방이 어두워진다'); codexHit(b, 'lampthief', 'dark'); return 1; }
    case 'hide': { e.under = 1; e.hideT = b.tick + 1; logp(b, 'sys', e.n + '이(가) 그림자 속으로 숨는다'); codexHit(b, 'lampthief', 'hide'); return 1; }
    case 'formation': { logp(b, 'sys', e.n + '이(가) 부하들의 자리를 바꾼다. 대형이 선다'); if (b.capForm && !b.formBroken) codexHit(b, 'captain', 'form'); return 1; }
    case 'rally': { for (const x of ch2Mates(b, e)) addS(b, x, 'empower', 1); logp(b, 'bad', e.n + '이(가) 돌격 명령을 내린다. 부하 모두 강화 1'); return 1; }
    case 'haggle': { b.trade = 'ask'; b.tradeBy = e.id; logp(b, 'crit', e.n + '이(가) 저울을 내민다. 거래를 받을지 고른다'); return 1; }
    case 'appraise': { addS(b, p, 'vuln', FOE_X.merchant.appraise); logp(b, 'bad', e.n + '이(가) 당신의 값을 매긴다. 취약 ' + FOE_X.merchant.appraise); return 1; }
    case 'recover': { const h = e.hpMax * 0.04; e.hp = Math.min(e.hpMax, e.hp + h); logp(b, 'sys', e.n + '이(가) 내준 것을 회수한다. 생명력 +' + r1(h)); return 1; }
    case 'seize': { const x = hurtPlayer(b, d * 1.2, { src: e, single: 1, charged: 1, label: e.n + '이(가) 차압한다' }); const run = ch2RunOf(b); if (run && run.gold > 0) { const g = Math.min(run.gold, X.seize); run.gold -= g; logp(b, 'bad', '골드 ' + g + '을(를) 빼앗긴다'); } return 1; }
    case 'oilprice': { const n = ch2Lamps(b).filter(x => x.lit).length; addS(b, e, 'empower', Math.max(1, Math.ceil(n / 2))); logp(b, 'bad', e.n + '이(가) 기름값을 매긴다. 켜진 등불 ' + n); codexHit(b, 'bardo', 'lamp'); return 1; }
    case 'pouroil': { const x = hurtPlayer(b, d * 0.6, { src: e, single: 1, spell: 1, label: e.n + '이(가) 기름을 붓는다' }); if (!b.over) addS(b, p, 'ignite', 3); return 1; }
    case 'guardlamp': { const c = spawn(b, 'lampkeeper'); if (c) logp(b, 'bad', e.n + '이(가) 등불지기를 부른다'); return 1; }
    case 'hang': { bardoHang(b, e); return 1; }
    case 'relight': { const lp = ch2Lamps(b).find(x => !x.lit); if (lp) { lp.lit = 1; lp.brk = 0; e.barrier = Math.min((e.barrier || 0) + Math.round(e.hpMax * FOE_X.bardo.ward), Math.round(e.hpMax * FOE_X.bardo.ward * ch2Lamps(b).filter(x => x.lit).length)); /* 비공개 문서 참조 */ logp(b, 'bad', '사이 행동 — ' + e.n + '이(가) 깨진 등불을 다시 켠다. 그 사이 몸이 비었다'); e.openR = b.round; codexHit(b, 'bardo', 'relit'); } return 1; }
  }
  if (i.k === 'heavy' && e.foe === 'ledger') { codexHit(b, 'ledger', 'debt'); }
  return 0;
}
/* --- 빚 장부의 주인(비공개 문서 참조) --- */
function ch2Debt(b, n, why) { if (!alive(b).some(x => x.foe === 'ledger')) return; b.debt = Math.max(0, Math.round(((b.debt || 0) + n) * 10) / 10); if (why) logp(b, 'bad', '장부에 빚이 쌓인다(' + why + '). 빚 ' + Math.round(b.debt)); }
/* --- 바르도 등불 --- */
function bardoSetup(b, e) {
  const X = FOE_X.bardo; for (let i = 0; i < X.lamps; i++) { const l = mkEnemy('lantern', 0, 80 + i, { lv: e.lv || 1, name: '등불' }); l.hpMax = l.hp = 9999; l.brkMax = X.lampBrk; l.summoned = true; l.xpCh = 0; l.lit = 1; l.intent = { k: 'none' }; l.info = '바르도의 등불. 붕괴 게이지가 차면 깨진다.'; b.en.push(l); }
  e.barrier = Math.round(e.hpMax * X.ward * X.lamps);
}
function bardoHang(b, e) { for (const l of ch2Lamps(b)) { l.lit = 1; l.brk = 0; } b.hang = 1; logp(b, 'crit', e.n + '이(가) 등불을 내건다. 방이 대낮처럼 밝아진다'); }
function bardoPhaseStep(b, e, ph) {
  if (ph === 2) { bardoHang(b, e); }
  if (ph === 3) { const L = ch2Lamps(b); const keep = L[0]; for (const l of L) if (l !== keep) { l.alive = false; l.hp = 0; } if (keep) { keep.lit = 1; keep.last = 1; keep.n = '마지막 등불'; keep.info = '아이들 골목 쪽에 걸린 등불. 바르도가 몸으로 막는다.'; } b.hang = 0; logp(b, 'crit', '등불이 하나만 남는다. ' + e.n + '이(가) 그 앞을 몸으로 막아선다'); codexHit(b, 'bardo', 'last'); }
}
/* --- 라운드 끝(tickOnce) --- */
function ch2Tick(b, T) {
  const p = b.p;
  if (hasMod(b, 'crowd') && !b.over) { if (b.cheerR === b.round) logp(b, 'good', '구경꾼들이 환호한다. 돌이 날아오지 않는다'); else { const L = alive(b).filter(realFoe); const k = Math.floor((b.rngF || Math.random)() * (L.length + 1)); if (k >= L.length) hurtPlayer(b, CH2X.crowd, { aoe: 1, label: '구경꾼이 던진 돌' }); else { hurtEnemy(b, L[k], CH2X.crowd, { label: '구경꾼이 던진 돌', aoe: 1 }); logp(b, 'sys', '구경꾼이 ' + L[k].n + '에게 돌을 던진다'); } } }
  if (hasMod(b, 'rain')) for (const u of [p].concat(alive(b))) for (let k = 0; k < CH2X.rainIgn; k++) if (u.s.ignite) kwDec(u, 'ignite');
  if (alive(b).some(x => x.foe === 'ledger')) { const ds = b.damageStats || { taken: 0 }; const t0 = b.debtMark || 0; b.debtMark = ds.taken; const ys = Math.max(0, (b.ysSpent || 0) - (b.debtYs || 0)); b.debtYs = b.ysSpent || 0; const add = (ds.taken - t0) * FOE_X.ledger.perHurt + ys * FOE_X.ledger.perYs; if (add > 0) ch2Debt(b, add, null); }
  for (const e of alive(b)) { if (e.foe === 'champion' && !e.s.broken) { e.cheer = (e.cheer || 0) + 1; if (e.cheer === 1) codexHit(b, 'champion', 'cheer'); } if (e.foe === 'lampthief' && e.under && e.hideT != null && T > e.hideT) { e.under = 0; e.hideT = null; } }
  const bd = alive(b).find(x => x.boss === 'bardo'); if (bd && b.hang && ch2Lamps(b).some(x => x.lit) && alive(b).filter(x => x.role === 'shade').length < 2) { const s = spawn(b, 'shade'); if (s) { logp(b, 'bad', '빛 속에서 그림자 하수인이 일어선다'); codexHit(b, 'bardo', 'shade'); } }
}
/* --- 피해 배율 --- */
function ch2HitMul(b, e, o) { // 적이 받는 피해
  let m = 1;
  if (e.foe === 'captain' && b.capForm && !b.formBroken && alive(b).some(x => x.role === 'thug')) m *= 1 - FOE_X.captain.form;
  return m;
}
function ch2FoeOut(b, e) { // 적이 주는 피해(enemyHitEst)
  let m = 1;
  if (!e.elite && !e.strong && e.role !== 'boss' && alive(b).some(x => x.cmd && x !== e)) m *= 1 + AFFIX2.cmd;
  if (e.role === 'xbow' && (b.formation || b.capForm) && !b.formBroken && alive(b).some(x => x.role === 'thug')) m *= 1 + CH2X.formation;
  if (e.foe === 'champion') m *= 1 + FOE_X.champion.cheer * (e.cheer || 0);
  if (e.boss === 'bardo') m *= 1 + FOE_X.bardo.per * ch2Lamps(b).filter(x => x.lit).length;
  if (e.role === 'loser' && e.hp < e.hpMax * 0.3) m *= 1.3;
  return m;
}
function ch2OutMul(b, e, o) { // 내가 주는 피해
  let m = 1; const p = b.p;
  if (b.trade === 'yes') m *= 1 + FOE_X.merchant.buff;
  if (b.singR && (b.round || 1) <= b.singR) m *= 1.2;
  if (b.jeer) m *= 0.8;
  if (hasBt(p, 'elixir')) m *= 1.15; if (hasBt(p, 'fog')) m *= 0.85;
  if (p.shoved && b.cur && b.cur.id === 'basic') { m *= 0.5; p.shoved = 0; }
  if (b.smokeR === b.round && e.row === 'back' && !o.aoe) return 0;
  if (e.boss === 'bardo' && e.openR === b.round) m *= 1.3; // 바르도(비공개 문서 참조)
  return m;
}
function ch2InMul(b, o) { // 내가 받는 피해
  let m = 1; const p = b.p;
  if (hasBt(p, 'elixirB') && !hasBt(p, 'elixir')) m *= 1.1;
  if (b.smokeR === b.round && o.src && o.src.row === 'back' && !o.dot) return 0;
  return m;
}
/* 상태가 걸릴 때(addS): 기름 바닥 · 빗속 · 기름 뿌리기 */
function ch2StatusAdd(b, u, k, n) {
  if (k === 'ignite' && hasMod(b, 'oilfloor')) n += CH2X.oilIgn;
  if (k === 'chill' && hasMod(b, 'rain')) n += CH2X.rainChill;
  if (k === 'ignite' && u === b.p && b.p.oiled > 0) { n += b.p.oiled; b.p.oiled = 0; }
  return n;
}
/* --- 전투 시작 --- */
function ch2Setup(b, room) {
  const en = b.en;
  for (const k of room.cmd || []) if (en[k]) en[k].cmd = 1;
  for (const k of room.lootA || []) if (en[k]) en[k].lootA = 1;
  for (const k of room.oiled || []) if (en[k]) en[k].oiled = 1;
  if (room.formation) b.formation = 1;
  if (room.strong && room.foe === 'captain') b.capForm = 1;
  if (hasMod(b, 'oilfloor') && en.some(e => e.role === 'arson')) { for (const u of [b.p].concat(en.filter(realFoe))) addS(b, u, 'ignite', 1); logp(b, 'sys', '기름 바닥에 불씨가 튄다. 모두 화상 1'); }
  if (room.foe === 'ledger' && room.ledgerMark) { b.debt = 10; logp(b, 'bad', '장부의 주인이 당신의 이름을 짚는다. 빚 10을 안고 시작한다'); }
  if (room.first) for (const e of en) if (realFoe(e)) e.quick = 1;
  if (room.sing) b.singR = 1; if (room.jeer) b.jeer = 1; if (room.bet) b.bet = 1;
  const bd = en.find(e => e.boss === 'bardo'); if (bd) bardoSetup(b, bd);
  if (hasBt(b.p, 'names')) addS(b, b.p, 'weak', 1);
}
/* --- 무너짐 · 쓰러짐 --- */
function ch2OnBreak(b, e) {
  b.cheerR = b.round;
  if (e.foe === 'ledger' && (b.debt || 0) > 0) { b.debt = 0; logp(b, 'good', '장부가 찢어진다. 빚이 사라진다'); codexHit(b, 'ledger', 'torn'); }
  if (e.foe === 'champion' && e.cheer) { e.cheer = 0; logp(b, 'good', '함성이 야유로 바뀐다'); codexHit(b, 'champion', 'boo'); }
  if (e.role === 'thug' && (b.capForm || b.formation) && !b.formBroken) { b.formBroken = 1; logp(b, 'good', '덩치가 무너지자 대형이 깨진다'); if (b.capForm) codexHit(b, 'captain', 'broke'); }
  if (e.role === 'lantern' && !e.last) { e.lit = 0; e.alive = true; e.brk = 0; e.s.broken && delete e.s.broken; logp(b, 'good', '등불이 깨진다'); const bd = alive(b).find(x => x.boss === 'bardo'); if (bd) bd.relightNext = 1; }
  if (e.role === 'lantern' && e.last) { e.brk = 0; logp(b, 'sys', '바르도가 몸으로 막는다. 마지막 등불은 깨지지 않는다'); }
}
function ch2OnKill(b, e) {
  if (e.role === 'overseer') { const L = alive(b).filter(x => x.role === 'chained'); for (const x of L) { x.alive = false; x.hp = 0; x.summoned = true; x.freed = 1; } if (L.length) logp(b, 'good', FOES.chained.log.see); }
  if (e.cmd) { for (const x of alive(b)) if (realFoe(x)) x.stun = Math.max(x.stun || 0, 1); logp(b, 'good', '지휘하던 자가 쓰러지자 무리가 흔들린다'); }
  if (e.lootGold > 0) { const run = ch2RunOf(b); const g = Math.round(e.lootGold * AFFIX2.lootBack); if (run) run.gold = (run.gold || 0) + g; logp(b, 'good', '빼앗긴 골드를 되찾는다. +' + g); }
  if (e.boss === 'bardo') { for (const x of b.en) if (x.alive && ['lantern', 'shade', 'lampkeeper'].includes(x.role)) { x.alive = false; x.hp = 0; } if (FOES.bardo.log.line) logp(b, 'crit', e.n + ': ' + FOES.bardo.log.line); if (FOES.bardo.log.down) logp(b, 'sys', FOES.bardo.log.down); }
}
/* --- 플레이어 행동: 빚 갚기 · 등불 기름 · 거래 --- */
function ch2Actions(b, L) {
  const p = b.p, run = ch2RunOf(b);
  if (b.trade === 'ask') { for (const a of L) { a.ok = false; a.why = '거래창에서 고른다'; } L.unshift({ id: 'tradeyes', n: '거래를 받는다', self: 1, cost: '전투 뒤 최대 생명력 −' + Math.round(FOE_X.merchant.hpPen * 100) + '%', time: 0.5, ok: true, d: '이번 전투 동안 주는 피해 +' + Math.round(FOE_X.merchant.buff * 100) + '%. 상인은 공격을 멈춘다. 전투가 끝나면 최대 생명력 −' + Math.round(FOE_X.merchant.hpPen * 100) + '%(캐릭터 끝까지).' }, { id: 'tradeno', n: '거절한다', self: 1, cost: '비용 없음', time: 0.5, ok: true, d: '거래하지 않는다.' }); return; }
  if (alive(b).some(x => x.foe === 'ledger') && (b.debt || 0) > 0) { const g = run ? run.gold || 0 : 0; L.push({ id: 'paydebt', n: '빚 갚기', self: 1, cost: '골드 ' + FOE_X.ledger.pay, time: 1, ok: g >= FOE_X.ledger.pay, why: g >= FOE_X.ledger.pay ? null : '골드가 모자랍니다', d: '골드 ' + FOE_X.ledger.pay + '을(를) 내고 빚을 절반으로 줄인다.' }); }
  if (ch2Dark(b) && run && (run.oil || 0) > 0) L.push({ id: 'lampoil', n: '등불 기름', self: 1, cost: '기름 1 (남은 ' + run.oil + ')', time: 0.5, ok: true, d: '방을 밝힌다. 어둠이 사라지고 모든 예고가 보인다.' });
  if (p.grabbedR === b.round) for (const a of L) if (a.ok && (a.id === 'dodge' || a.dodge)) { a.ok = false; a.why = '붙잡혀 몸을 뺄 수 없다'; }
}
function ch2PlayerAct(b, id) {
  const p = b.p, run = ch2RunOf(b);
  if (id === 'tradeyes') { b.trade = 'yes'; b.tradeHp = 1; logp(b, 'crit', '거래를 받는다. 주는 피해 +' + Math.round(FOE_X.merchant.buff * 100) + '%. 상인이 공격을 멈춘다'); codexHit(b, 'merchant', 'deal'); return 1; }
  if (id === 'tradeno') { b.trade = 'no'; logp(b, 'bad', '거래를 거절한다. 상인의 저울이 기운다'); codexHit(b, 'merchant', 'bill'); return 1; }
  if (id === 'paydebt') { if (run) run.gold -= FOE_X.ledger.pay; b.debt = Math.round((b.debt || 0) * (1 - FOE_X.ledger.payCut)); logp(b, 'good', '골드 ' + FOE_X.ledger.pay + '을(를) 낸다. 빚 ' + b.debt); codexHit(b, 'ledger', 'paid'); return 1; }
  if (id === 'lampoil') { if (run) run.oil = Math.max(0, (run.oil || 0) - 1); b.ctx.mods = b.ctx.mods.filter(m => m !== 'dark'); logp(b, 'good', '등불 기름을 붓는다. 방이 밝아진다'); for (const e of alive(b)) if (e.foe === 'lampthief' && e.under) { e.under = 0; e.hideT = null; addS(b, e, 'vuln', FOE_X.lampthief.vuln); logp(b, 'good', e.n + '이(가) 빛 속에 드러난다. 취약 ' + FOE_X.lampthief.vuln); codexHit(b, 'lampthief', 'lit'); } return 1; }
  return 0;
}
/* --- 장치 「등불」(CH_DEVICE[2]) --- */
const LAMP_DEV = {
  id: 'lamp', n: '등불 기름', help: '어두운 방에서는 후열 적이 무엇을 하려는지 보이지 않고, 큰 공격만 소리로 알 수 있습니다. 방에 들어설 때나 싸우는 중에 등불 기름 하나를 써서 밝힐 수 있습니다(최대 3).',
  chip: b => { const run = ch2RunOf(b); return '🛢️ ' + ((run && run.oil) || 0) + (ch2Dark(b) ? ' · 어둠' : ''); },
  onRoundEnd(b) { },
  onRoomEnd(b, over) {
    const run = ch2RunOf(b); if (b.tradeHp && run) { run.p.hpPen = (run.p.hpPen || 0) + FOE_X.merchant.hpPen; if (typeof applyGear === 'function') applyGear(run); logp(b, 'bad', '거래의 값을 치른다. 최대 생명력 −' + Math.round(FOE_X.merchant.hpPen * 100) + '%'); b.tradeHp = 0; }
    if (over !== 'win' || !run || b.ctx.boss) return;
    if (b.bet && (b.round || 0) <= 4) { run.gold = (run.gold || 0) + 60; logp(b, 'good', '내기에서 이겼다. 골드 +60'); }
    const pr = b.ctx.ambush ? LAMP.drop.ambush : LAMP.drop.normal; if ((run.oil || 0) < LAMP.max && (b.rngF || Math.random)() < pr) { run.oil = (run.oil || 0) + 1; logp(b, 'good', '쓰러진 자의 품에서 등불 기름을 찾는다. 기름 ' + run.oil); }
  },
};
CH_DEVICE[2] = LAMP_DEV;
/* --- 예고 문장 · 아이콘(intentText0 · intentBadge0). 어둠 속 후열은 내용을 숨기고 큰 것만 소리로 --- */
function ch2Text(b, e, i, est) {
  if (ch2Dark(b) && e.row === 'back' && e.role !== 'boss') return ch2DarkBig(b, e) ? teleFill(b, e, 'dark2') : teleFill(b, e, 'hidden');
  const tn = w => { const t = b.en.find(x => x.id === i.tgt); return t ? t.n : teleW(w); };
  switch (i.k) {
    case 'ledger': case 'chain': case 'ringbell': case 'arrange': case 'finalbell': case 'hesitate': case 'duel': case 'douselamp': case 'hide': case 'formation': case 'rally': case 'haggle': case 'recover': case 'guardlamp': case 'hang': case 'relight': case 'dream': return teleFill(b, e, i.k);
    case 'dunning': return teleFill(b, e, 'dunning', { dw: 2 });
    case 'shove': return teleFill(b, e, 'shove', { sest: r1(est * 0.6) });
    case 'volley': return teleFill(b, e, 'volley', { vest: r1(est * 0.55) });
    case 'remedy': return teleFill(b, e, 'remedy', { tgt: tn('w_mate') });
    case 'douse': return teleFill(b, e, 'douse', { oil: 2 });
    case 'torch': return teleFill(b, e, 'torch', { ig: 3 });
    case 'firepot2': return teleFill(b, e, 'firepot2', { fp: 1 });
    case 'smoke': return teleFill(b, e, 'smoke', { sc: 1, sw: 1 });
    case 'sting': return teleFill(b, e, 'sting', { est: r1(est * 0.5), sp: 2 });
    case 'lunge': return teleFill(b, e, 'lunge', { est: r1(est) });
    case 'bark': case 'whip': return teleFill(b, e, i.k, { tgt: tn('w_mate') });
    case 'grab': return teleFill(b, e, 'grab', { est: r1(est * 0.7) });
    case 'combo': return teleFill(b, e, 'combo', { cest: r1(est * FOE_X.champion.combo) });
    case 'appraise': return teleFill(b, e, 'appraise', { av: FOE_X.merchant.appraise });
    case 'seize': return teleFill(b, e, 'seize', { est: r1(est * 1.2) });
    case 'oilprice': return teleFill(b, e, 'oilprice', { lamps: ch2Lamps(b).filter(x => x.lit).length });
    case 'pouroil': return teleFill(b, e, 'pouroil', { ig: 3 });
  }
  return null;
}
function ch2Badge(b, e, i, est, capOf) {
  if (ch2Dark(b) && e.row === 'back' && e.role !== 'boss') return ch2DarkBig(b, e) ? { ico: '👂', num: '', txt: '무언가 크게 숨을 들이쉰다', cls: 'hv' } : { ico: '❓', num: '', txt: '보이지 않음', cls: '' };
  const tn = () => { const t = b.en.find(x => x.id === i.tgt); return t ? t.n : ''; };
  switch (i.k) {
    case 'ledger': return { ico: '📒', num: '', txt: '장부 적기', cls: 'warn' };
    case 'dunning': return { ico: '📒', num: '', txt: '독촉 · 약화 2', cls: 'warn' };
    case 'shove': return { ico: '🤚', num: r1(capOf(est * 0.6)), txt: '밀쳐내기', cls: 'atk' };
    case 'volley': return { ico: '🏹', num: r1(capOf(est * 0.55)) + '×2', txt: '연사', cls: 'atk' };
    case 'remedy': return { ico: '💊', num: '', txt: '진통제 → ' + tn(), cls: 'sup' };
    case 'douse': return { ico: '🛢️', num: '', txt: '기름 뿌리기 · 다음 화상 +2', cls: 'warn' };
    case 'torch': return { ico: '🔥', num: r1(capOf(est * 0.5)), txt: '불붙이기 · 화상 3', cls: 'hv' };
    case 'firepot2': return { ico: '🏺', num: r1(capOf(est * 0.6)), txt: '불단지 · 화상 1', cls: 'atk' };
    case 'smoke': return { ico: '💨', num: '', txt: '연기 · 둔화 1 · 약화 1', cls: 'warn' };
    case 'dream': return { ico: '💤', num: '', txt: '꿈 연기', cls: 'warn' };
    case 'sting': return { ico: '🪡', num: r1(capOf(est * 0.5)), txt: '독침 · 중독 2', cls: 'atk' };
    case 'lunge': return { ico: '🐕', num: r1(capOf(est)), txt: '달려들기', cls: 'atk' };
    case 'bark': return { ico: '🐕', num: '', txt: '짖기 → ' + tn(), cls: 'sup' };
    case 'chain': return { ico: '⛓️', num: '', txt: '사슬 부르기', cls: 'sup' };
    case 'whip': return { ico: '🪢', num: '', txt: '채찍 → ' + tn(), cls: 'warn' };
    case 'ringbell': return { ico: '🔔', num: '', txt: '종 치기 · 무리 가속', cls: 'warn' };
    case 'arrange': return { ico: '🐕', num: '', txt: '판 짜기', cls: 'sup' };
    case 'finalbell': return { ico: '🔔', num: '', txt: '결승 종', cls: 'hv' };
    case 'hesitate': return { ico: '…', num: '', txt: '머뭇거림', cls: 'sup' };
    case 'grab': return { ico: '✊', num: r1(capOf(est * 0.7)), txt: '매달리기', cls: 'atk' };
    case 'duel': return { ico: '⚔️', num: '', txt: '결투 선언', cls: 'warn' };
    case 'combo': return { ico: '👊', num: r1(capOf(est * FOE_X.champion.combo)) + '×' + FOE_X.champion.hits, txt: '연타', cls: 'atk' };
    case 'douselamp': return { ico: '🕯️', num: '', txt: '등불 끄기', cls: 'warn' };
    case 'hide': return { ico: '👤', num: '', txt: '숨기', cls: 'warn' };
    case 'formation': return { ico: '🛡️', num: '', txt: '대형', cls: 'sup' };
    case 'rally': return { ico: '📯', num: '', txt: '돌격 명령', cls: 'warn' };
    case 'haggle': return { ico: '⚖️', num: '', txt: '흥정', cls: 'warn' };
    case 'appraise': return { ico: '⚖️', num: '', txt: '값 매기기 · 취약 ' + FOE_X.merchant.appraise, cls: 'warn' };
    case 'recover': return { ico: '⚖️', num: '', txt: '회수', cls: 'sup' };
    case 'seize': return { ico: '📕', num: r1(capOf(est * 1.2)), txt: '차압', cls: 'hv' };
    case 'oilprice': return { ico: '🏮', num: ch2Lamps(b).filter(x => x.lit).length, txt: '기름값', cls: 'warn' };
    case 'pouroil': return { ico: '🛢️', num: r1(capOf(est * 0.6)), txt: '기름 붓기 · 화상 3', cls: 'hv' };
    case 'guardlamp': return { ico: '🏮', num: '', txt: '등불 지키기', cls: 'sup' };
    case 'hang': return { ico: '🏮', num: '', txt: '등불 내걸기', cls: 'hv' };
    case 'relight': return { ico: '🏮', num: '', txt: '사이 행동 · 다시 켜기', cls: 'sup' };
  }
  return null;
}
/* 적 카드 칩(js/53 foeASHtml): 빚 · 함성 · 대형 · 등불 */
function ch2CardChips(b, e) {
  let h = '';
  if (e.foe === 'ledger' && (b.debt || 0) > 0) h += '<span class="fdebt" aria-label="빚 ' + Math.round(b.debt) + '">📕<b>' + Math.round(b.debt) + '</b></span>';
  if (e.foe === 'champion' && e.cheer > 0) h += '<span class="fcheer" aria-label="함성 ' + e.cheer + '">📣<b>' + e.cheer + '</b></span>';
  if (e.foe === 'captain' && b.capForm && !b.formBroken && alive(b).some(x => x.role === 'thug')) h += '<span class="fform" aria-label="대형">🛡️ 대형</span>';
  if (e.role === 'lantern') h += (e.lit ? '<span class="flamp" aria-label="켜짐">🔥 켜짐</span>' : '<span class="flamp off" aria-label="깨짐">깨짐</span>') + (e.lit && !e.last ? '<span class="flampbk" aria-label="붕괴 ' + Math.round(e.brk || 0) + '/' + e.brkMax + '">💥' + Math.round(e.brk || 0) + '/' + e.brkMax + '</span>' : '');
  return h;
}
/* --- 방 만들기(js/66 mkRoom): 무리 · 어둠 · 정예 접사 --- */
function ch2Squad(run, r, sq, t, f) {
  if (sq.lead && t === 'ambush' && f >= sq.lead.from) r.en[0] = [sq.lead.role, 1]; // 투견판: 순찰대 방(12층부터)은 투기장 관리인이 이끈다
  if (sq.formation) r.formation = 1;
  if (sq.id === 'chains' && run.dg.keysFree) { r.en = r.en.filter(x => x[0] !== 'chained'); for (const x of r.en) if (x[0] === 'overseer') x[1] = 1; run.dg.keysFree = 0; r.freed = 1; } // 사슬 열쇠: 일꾼은 풀려났고 감독관이 정예로
  if (run.path === 'rough' && Math.random() < CH2X.loser) { const k = r.en.findIndex(x => ROLES[x[0]] && ROLES[x[0]].row === 'front' && !x[1]); if (k >= 0) r.en[k] = ['loser']; } // 투기장의 패배자는 뒷골목 길에서만
}
function ch2RoomMods(run, r, t, f) {
  r.mods = (r.mods || []).filter(m => m !== 'dark'); // 어둠은 층 띠마다 따로 정한다
  if (t === 'strong' || (run.buffs && run.buffs.lit)) return;
  const band = LAMP.dark.find(([to]) => f <= to); let pr = band ? band[1] : 0; pr += LAMP.pathDark[run.path] || 0;
  if (Math.random() < pr) r.mods.push('dark');
}
function ch2Affix(r, low) { // 2챕터 정예 접사(확정본): 강인 1 · 지휘 1.2 · 장물 두른 0.8 · 기름 먹은 0.8. 하나씩
  const W = AFFIX2.w; const cmd = [], loot = [], oil = [];
  r.tough = r.tough.filter(k => { const o = Object.entries(W); let x = Math.random() * o.reduce((a, c) => a + c[1], 0); let pk = o[0][0]; for (const [kk, w] of o) { x -= w; if (x <= 0) { pk = kk; break; } } if (pk === 'cmd') cmd.push(k); if (pk === 'loot') loot.push(k); if (pk === 'oiled') oil.push(k); return pk === 'tough'; });
  r.cmd = cmd; r.lootA = loot; r.oiled = oil;
}
/* --- 들어설 때(js/66 enterRoom): 이벤트 흔적 · 등불 기름 --- */
function ch2Enter(run, R, room, nx) {
  if (R.lit) room.mods = (room.mods || []).filter(m => m !== 'dark');
  if (nx.oilfloor && !room.boss && !(room.mods || []).includes('oilfloor')) room.mods = (room.mods || []).concat(['oilfloor']);
  if (nx.gangAdd && R.type !== 'boss') room.en = (room.en || []).concat([['thug']]);
  if (run.dg.stolen > 0 && R.type !== 'boss' && ['normal', 'ambush', 'treasure'].includes(R.type)) { room.en = (room.en || []).concat([['fence']]); room.first = 1; run.dg.stolen--; }
  if (nx.dunFirst && (room.en || []).some(x => x[0] === 'dun')) { room.first = 1; nx.dunFirst = 0; }
  if (nx.sing) room.sing = 1; if (nx.jeer) room.jeer = 1; if (nx.bet) room.bet = 1;
  if (R.foe === 'ledger' && run.dg.ledgerMark) room.ledgerMark = 1;
  if (R.wake && R.wakeFirst) room.first = 1;
}
/* 문 · 방: 암시장(장터 대로 4–11층, 챕터에 한 번) · 성소 닫힘 */
function ch2TypeOk(run, t, f) {
  if (t === 'market') return (run.ch || 1) === 2 && run.path === 'main' && f >= MARKET.from && f <= MARKET.to && !((run.dg.counts || {}).market > 0);
  if (t === 'shrine' && run.dg.noShrine) return false;
  return true;
}
/* 암시장 진열(방에 저장): ① 고유(희귀) · ② 영웅 장비 · ③ 수상한 꾸러미 · ④ 숨은 값(①을 패시브 포인트로) */
function marketStock(run, R) {
  if (R.stock) return R.stock;
  const uq = typeof UNIQUE !== 'undefined' ? Object.keys(UNIQUE).filter(id => UNIQUE[id].g === 'r' && (UNIQUE[id].cls === 'all' || UNIQUE[id].cls === run.build)) : [];
  const uid = uq.length ? uq[Math.floor(Math.random() * uq.length)] : null;
  R.stock = { uq: uid, hero: 1, bundle: 1, sold: null }; return R.stock;
}
/* --- 화면: 방에 들어가기(어둠이면 등불 기름) · 암시장 --- */
function ch2EnterBtns(run, R) {
  if ((run.ch || 1) === 2 && (R.mods || []).includes('dark') && (run.oil || 0) > 0 && !R.lit) return `<div class="row"><button class="gold" data-a="enterlit" data-focus>등불 기름을 쓰고 들어가기 <small>(남은 ${run.oil})</small></button><button data-a="enter">어둠 속으로 들어가기</button></div>`;
  return '<div><button class="gold" data-a="enter" data-focus>방에 들어가기</button></div>';
}
function vMarket(run, R) {
  const S = marketStock(run, R), U = S.uq && UNIQUE[S.uq], g = run.gold || 0, pts = (run.ptree && run.ptree.pts) || 0, M = MARKET;
  const best = ch2BestBag(run); const btn = (k, t, ok, why) => `<button data-a="mkbuy" data-k="${k}"${ok ? '' : ' disabled'}>${esc(t)}${!ok && why ? ` <small>${esc(why)}</small>` : ''}</button>`;
  return `<h3>🏮 암시장</h3><p class="lore">천막 아래 등불 하나. 값은 골드가 아닐 수도 있다.</p><p class="mini">셋 가운데 하나만 살 수 있습니다. 가진 골드 ${g}</p>`
    + (U ? `<div class="card"><p><b>① 고유 장비</b>: ${esc(U.n)} <span class="mini">(희귀)</span></p><div class="row">${btn('uq-gold', '골드 ' + M.uq.gold, g >= M.uq.gold, '골드가 모자랍니다')}${btn('uq-hp', '최대 생명력 −' + Math.round(M.uq.hpPen * 100) + '%(캐릭터 끝까지)', true)}${btn('uq-pt', '패시브 포인트 1', pts >= M.hidden.pt, '패시브 포인트가 없습니다')}</div></div>` : '')
    + `<div class="card"><p><b>② 영웅 장비 하나</b></p><div class="row">${btn('hero-gold', '골드 ' + M.hero.gold, g >= M.hero.gold, '골드가 모자랍니다')}${btn('hero-item', best ? '가방의 가장 좋은 장비를 내놓는다: ' + itName(run.inv[best]) : '가방의 가장 좋은 장비를 내놓는다', !!best, '가방에 장비가 없습니다')}</div></div>`
    + `<div class="card"><p><b>③ 수상한 꾸러미</b>: 열어 보기 전에는 모른다.</p><div class="row">${btn('bundle', '골드 ' + M.bundle.gold, g >= M.bundle.gold, '골드가 모자랍니다')}</div></div>`
    + `<div class="row"><button data-a="mkleave" data-focus>그냥 지나간다</button></div>`;
}
const G8_RANK = { n: 0, m: 1, r: 2, h: 3, l: 4 };
function ch2BestBag(run) { const L = (run.bag || []).filter(u => run.inv[u] && !itemRemoveWhy(run, u)); return L.sort((a, b) => (G8_RANK[run.inv[b].g] || 0) - (G8_RANK[run.inv[a].g] || 0))[0] || null; }
function ch2MarketBuy(run, R, k) {
  const S = marketStock(run, R), M = MARKET, p = run.p, drops = []; let paid = '';
  if (k === 'uq-gold' || k === 'uq-hp' || k === 'uq-pt') {
    if (!S.uq) return null;
    if (k === 'uq-gold') { if ((run.gold || 0) < M.uq.gold) return null; run.gold -= M.uq.gold; paid = '골드 ' + M.uq.gold; }
    if (k === 'uq-hp') { p.hpPen = (p.hpPen || 0) + M.uq.hpPen; applyGear(run); paid = '최대 생명력 −' + Math.round(M.uq.hpPen * 100) + '%'; }
    if (k === 'uq-pt') { if (!((run.ptree && run.ptree.pts) >= M.hidden.pt)) return null; ptBonus(run, -M.hidden.pt, '암시장'); paid = '패시브 포인트 ' + M.hidden.pt; }
    drops.push(mkUq(S.uq, run.ch || 2));
  } else if (k === 'hero-gold' || k === 'hero-item') {
    if (k === 'hero-gold') { if ((run.gold || 0) < M.hero.gold) return null; run.gold -= M.hero.gold; paid = '골드 ' + M.hero.gold; }
    else { const u = ch2BestBag(run); if (!u) return null; paid = itName(run.inv[u]); discardUid(run, u); }
    drops.push(g8Gen(run, { g: 'h' }));
  } else if (k === 'bundle') {
    if ((run.gold || 0) < M.bundle.gold) return null; run.gold -= M.bundle.gold; paid = '골드 ' + M.bundle.gold;
    const x = Math.random(); if (x < M.bundle.r) drops.push(mkItem(dropKey(run, 'r'))); else if (x < M.bundle.r + M.bundle.m) drops.push(mkItem(dropKey(run, 'm'))); else { drops.push(mkItem(dropKey(run, 'm'))); run.dg.stolen = M.bundle.fights; toast('장물이었다. 다음 두 전투에서 장물아비가 먼저 노린다'); }
  } else return null;
  S.sold = k; return { drops, paid };
}
/* --- 이벤트 아홉(js/80 'event') --- */
function ch2EvDis(run, E0, o) { const p = run.p; return (E0.id === 'attic' && o.id === 'feed' && !(p.flask.life + p.flask.mana + (p.flask.stam || 0))) || (E0.id === 'betboard' && o.id === 'bet' && (run.gold || 0) < 20); }
function ch2Event(run, R, o, drops) {
  const p = run.p, nx = run.next = run.next || {};
  const flask1 = () => { const fk = ['life', 'mana', 'stam'].sort((a, c) => (p.flask[c] || 0) - (p.flask[a] || 0))[0]; p.flask[fk] = Math.max(0, (p.flask[fk] || 0) - 1); };
  switch (R.event + ':' + o) {
    case 'attic:feed': flask1(); run.dg.force = 'shrine'; break;
    case 'attic:search': gainGold(run, 25, '다락에서 골드를 찾았습니다'); run.dg.noShrine = 1; toast('수도원의 빛이 등을 돌린다. 이 챕터의 성소가 모두 닫힌다'); break;
    case 'ledgerpage:erase': p.hpBonus = (p.hpBonus || 0) + 5; applyGear(run); run.dg.ledgerMark = 1; break;
    case 'ledgerpage:take': gainGold(run, 25, '장부를 챙겼습니다'); nx.dunFirst = 1; break;
    case 'lampshop:open': if (Math.random() < 0.7) { run.oil = Math.min(LAMP.max, (run.oil || 0) + 2); toast('등불 기름 둘을 담았다. 기름 ' + run.oil); } else { nx.pre = Object.assign({}, nx.pre, { ignite: ((nx.pre || {}).ignite || 0) + 4 }); nx.oilfloor = 1; toast('통이 터졌다. 다음 전투를 화상 4로 시작하고, 그 방은 기름 바닥이 된다'); } break;
    case 'lampshop:light': run.buffs.lit = 4; nx.gangAdd = 1; break;
    case 'betboard:bet': run.gold = Math.max(0, (run.gold || 0) - 20); nx.bet = 1; toast('골드 20을 걸었다'); break;
    case 'keys:free': run.dg.keysFree = 1; break;
    case 'keys:sell': gainGold(run, 30, '열쇠를 팔았습니다'); break;
    case 'tavern:listen': p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.2); p.st = p.stMax; break;
    case 'tavern:sing': nx.sing = 1; break;
    case 'tavern:ignore': nx.jeer = 1; break;
    case 'elixir:drink': run.buffs.elixir = 4; run.buffs.elixirB = 6; break;
    case 'elixir:dump': run.buffs.fog = 4; break;
    case 'wallnames:read': run.dg.strongUp = 1; run.buffs.names = 3; break;
  }
}
/* 깨어난(바로 싸우는) 이벤트 전투의 보상: 투기장 링 */
function ch2WakeWin(run, R, drops) { const W = R.wakeWin; if (!W) return; if (W.gold) gainGold(run, W.gold, '링에서 이겼습니다'); if (W.item) drops.push(mkItem(dropKey(run, rollGradeCh(run.ch, 'room')))); }

/* --- 상점 · 야영지: 등불 기름 재고(25골드 · 2개) · 빚의 제단 값 +30%(한 번) --- */
function ch2OilRow(run, S, s) { const o = S && S.oil; if (!o) return ''; const why = (run.gold || 0) < o.price ? '골드가 모자랍니다' : (run.oil || 0) >= LAMP.max ? '기름은 ' + LAMP.max + '개까지' : o.left <= 0 ? '다 팔렸습니다' : ''; return '<div class="bagline consrow"><div><b>🛢️ 등불 기름</b> <span class="mini">남은 ' + o.left + '개 · 가진 기름 ' + (run.oil || 0) + '/' + LAMP.max + '</span><br><small class="mini">어두운 방에 들어설 때나 싸우는 중에 하나 써서 밝힌다. 소모품 칸을 쓰지 않는다.</small></div><div class="row"><button class="sm' + (why ? '' : ' gold') + '" data-a="oilbuy"' + (s ? ' data-s="' + s + '"' : '') + (why ? ' aria-disabled="true" title="' + esc(why) + '"' : '') + '>' + o.price + ' 골드에 사기</button></div></div>'; }
function ch2Markup(run, S) { const m = run.shopMarkup; if (!m || !S) return; for (const x of S.stock || []) x.price = Math.round(x.price * (1 + m)); for (const x of S.cons || []) x.price = Math.round(x.price * (1 + m)); if (S.oil) S.oil.price = Math.round(S.oil.price * (1 + m)); run.shopMarkup = 0; if (typeof toast === 'function') toast('빚의 제단: 이번 상점 값 +' + Math.round(m * 100) + '%'); }

/* 길 이름 · 설명(챕터 데이터 paths가 있으면 그것으로, 수치는 PATHS 그대로) */
const pathTxt = (run, id) => Object.assign({}, pathOf(id, run.mode), (chData(run.ch || 1).paths || {})[id] || {});
