'use strict';
/* ================= 적 의도 (4.5, 규칙 기반) ================= */
/* 강적 패턴 (10월 4일). 큰 한 방은 모두 '모으기 → 큰 한 방'(charge → heavy). 상세는 비공개 문서 */
function strongIntent(b, e, n) {
  if (e.foe === 'collector') { const c = n % 4; return c === 0 ? { k: 'pick' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; } // 10월 7일: 더미가 없어도 바닥을 훑는다(평소 공격이 다른 강적의 두 배라 쓰러짐 44%였다) // 2챕터 강적 (상세 · 대처는 비공개 문서)
  if (e.foe === 'knight') { const c = n % 5; return c === 1 ? { k: 'retprep' } : c === 2 ? { k: 'return' } : c === 3 ? { k: 'charge' } : { k: 'attack' }; }
  if (e.foe === 'well') { const c = n % 5; return c === 0 || c === 2 ? { k: 'spray' } : c === 3 ? { k: 'charge' } : { k: 'attack' }; }
  if (e.foe === 'sexton') { const c = n % 4; if (e.under) return c === 2 ? { k: 'rumble' } : { k: 'erupt' }; const esc = alive(b).some(x => x !== e && !x.pile && !x.under && x.role !== 'root'); return c === 1 ? (esc ? { k: 'burrow' } : { k: 'charge' }) : { k: 'attack' }; }
  if (e.foe === 'echo') { const c = n % 4; return c === 1 ? { k: 'evade' } : c === 2 ? { k: 'mimic' } : c === 3 ? { k: 'reflect' } : { k: 'attack' }; }
  if (e.foe === 'bishop') { const c = n % 4; return c === 0 ? { k: 'raise' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; }
  if (e.foe === 'cantor') return n % 4 === 2 ? { k: 'charge' } : { k: 'tune' };
  if (e.foe === 'scribe') return (b.seal || []).length >= FOE_X.scribe.cap ? { k: 'charge' } : n % 2 === 0 ? { k: 'seal' } : { k: 'attack' };
  if (e.foe === 'bellringer' && (b.ctx.ch || 1) === 1 && alive(b).some(x => x.bell)) { const ring = (b.tick + 1) % STRONG.bellEvery === 0; if (ring && !(e.intent && e.intent.k === 'charge')) return { k: 'charge' }; return n % 2 === 1 ? { k: 'brace' } : { k: 'attack' }; } // A1 [이식 제안] 종지기 순서(비공개 문서 참조)
  const c = n % 4; return c === 1 ? { k: 'brace' } : c === 2 ? { k: 'charge' } : { k: 'attack' }; // 종지기 · 순례자: 공격 → 버티기 → 강타 준비 → 강타
}
const corpsesOf = b => alive(b).filter(x => x.corpse);
const chorusOf = (b, e) => alive(b).filter(x => x !== e && x.role !== 'root' && !x.corpse);
function foeBigMul(b, e) {
  if (!b || !FOE_X[e.foe]) return 1; const X = FOE_X[e.foe];
  if (e.foe === 'bishop') return (X.base + X.per * corpsesOf(b).length) / STRONG.big;
  if (e.foe === 'cantor') return X.per * Math.max(1, chorusOf(b, e).length) / STRONG.big;
  if (e.foe === 'collector') return (X.base + X.per * st(e, 'protect')) / STRONG.big;
  if (e.foe === 'well') return (X.base + X.per * st(b.p, 'poison')) / STRONG.big;
  if (e.foe === 'pilgrim' && e.fillMax && e.fill >= e.fillMax) return 1 + PILGRIM.feast; // A1 배 채움(비공개 문서 참조)
  return 1;
}
function hymnReset(b) { let n = 0; for (const x of b.en) if (x.hymn) { x.hymn = 0; n++; } return n; }
/* 봉인 (검은 서기관): 스킬 하나 · 플라스크 · 방어와 흘리기 가운데 하나를 쓸 수 없게 한다. 큰 한 방이나 서기관이 무너지거나 쓰러지면 풀린다 */
function sealPick(b) {
  const p = b.p, S = b.seal || [], rr = b.rngF || Math.random; const opts = [];
  for (const sid of skillsOf(p)) if (SK2[sid] && !S.some(x => x.k === 'skill' && x.id === sid)) opts.push({ k: 'skill', id: sid, n: SK2[sid].n, w: ysUsed(p, SK2[sid]) || ysShort(p, skOf(p, sid), b) > 0 ? 0.5 : 1 }); // 10월 15일 유산: 지금 못 쓰는 스킬은 덜 고른다
  if (!S.some(x => x.k === 'flask') && p.flask.life + p.flask.mana + (p.flask.stam || 0) > 0) opts.push({ k: 'flask', n: '플라스크', w: 1.5 });
  if (!S.some(x => x.k === 'prep')) opts.push({ k: 'prep', n: '방어와 흘리기', w: 1.5 });
  if (!opts.length) return null; let x = rr() * opts.reduce((a, o) => a + o.w, 0); for (const o of opts) { x -= o.w; if (x <= 0) return o; } return opts[opts.length - 1];
}
function decideIntent(b, e) {
  const al = alive(b);
  const n = e.acts;
  let it;
  if (e.strong && e.role !== 'boss') it = strong3Intent(b, e, n) || (isCh2(b) && strong2Intent(b, e, n)) || strongIntent(b, e, n); // 강적: 저마다의 패턴 (10월 4일)
  else if ((it = ch3Intent(b, e, n, al))) { } // 3챕터 역할
  else if (isCh2(b) && (it = ch2Intent(b, e, n, al))) { } // A2 2챕터 역할(js/15)
  else switch (e.role) {
    case 'bruiser': { // 10월 4일 패턴: 공격 → 버티기 → 강타 준비 → 강타. 일반 전투에서 동시에 예고되는 충전 기술은 최대 1개 (4.5)
      const c = n % 4; const other = (b.ctx.ch || 1) >= 3 ? bigPending(b, e) : al.some(x => x !== e && x.intent && (x.intent.k === 'charge' || x.intent.k === 'heavy'));
      const hurry = (b.ctx.ch || 1) === 1 && c === 1 && !other && al.some(x => x !== e && x.role !== 'root' && !x.pile && x.hp < x.hpMax * 0.5); // A1 성향: 다친 동료가 있으면 강타 준비를 서두른다
      it = c === 1 && !hurry ? { k: 'brace' } : ((c === 2 || hurry) && !other) ? { k: 'charge' } : { k: 'attack' }; break;
    }
    case 'shield': { const c = n % 4; if (e.monk) { const hm = al.find(x => x.monk && x.role === 'healer'); it = c === 0 ? (hm ? { k: 'guard', tgt: hm.id } : { k: 'brace' }) : c === 1 ? { k: 'brace' } : c === 2 ? { k: 'counter' } : { k: 'attack' }; break; } if ((b.ctx.ch || 1) === 1 && !al.some(x => x !== e && x.role !== 'root' && !x.pile)) { it = { k: 'brace' }; break; } /* A1 성향: 혼자 남으면 버티기만 */ it = c === 0 ? { k: 'attack' } : c === 2 ? { k: 'counter' } : { k: 'brace' }; break; } // 공격 → 버티기 → 반격 태세 → 버티기 (전열 동료를 대신 맞는 것은 그대로)
    case 'archer': { const c = n % 3; const on = Math.floor(n / 3) % 2 === 0; it = c === 0 ? (((b.ctx.ch || 1) >= 3 || (b.ctx.ch || 1) === 1) && bigPending(b, e) ? { k: 'attack' } : { k: 'aim' }) /* A1: 1챕터도 다른 큰 공격이 예고되어 있으면 겨누지 않고 쏜다 */ : /* 3챕터: 다른 큰 공격이 예고되어 있으면 겨누지 않는다(2절 7번) */ c === 1 ? ((b.ctx.ch || 1) >= 3 && !(e.intent && e.intent.k === 'aim') ? { k: 'attack' } : (b.ctx.ch || 1) === 2 ? { k: 'attack', aimed: 1, poison: on ? 2 : 0 } : { k: 'attack', aimed: 1, bleed: on ? EKW.archerBleed : 0 }) : { k: 'evade' }; break; } /* 3챕터: 겨누지 않았으면 겨눈 한 발도 없다 */ // 2챕터 납골당 궁수: 썩은 화살(출혈 대신 중독 2) // 겨누기 → 겨눈 한 발 → 몸 낮추기
    case 'healer': {
      if (e.monk) { const bs = al.find(x => x.role === 'boss'); it = !bs ? { k: 'attack' } : n % 3 === 2 || bs.hp >= bs.hpMax ? { k: 'bless', tgt: bs.id } : { k: 'heal', tgt: bs.id }; break; } // 치유 수도사: 치유 → 치유 → 기도(축복)
      // 사제 (10월 4일): 생명력이 문턱 아래인 동료가 있으면 치유, 없으면 곧 때릴 동료에게 축복
      const hurt = al.filter(x => x.role !== 'root' && !x.pile && x.role !== 'bonewall' && x.role !== 'crown' && x.hp < x.hpMax * PRIEST.heal).sort((a, c) => a.hp / a.hpMax - c.hp / c.hpMax)[0];
      if (hurt && !(e.intentPrev === 'heal')) { it = { k: 'heal', tgt: hurt.id }; break; }
      if ((b.ctx.ch || 1) >= 2) { const pl = al.find(x => x.pile && !x.norise); if (pl) { it = { k: 'mourn', tgt: pl.id }; break; } } // 2챕터 곡하는 사제: 치유할 동료가 없으면 뼈 더미를 일으킨다
      const bt = al.filter(x => x !== e && !x.s.empower && !x.pile && !['healer', 'root', 'thief', 'bonewall', 'crown'].includes(x.role)).sort((a, c) => ((c.intent && ['attack', 'heavy', 'charge'].includes(c.intent.k)) - (a.intent && ['attack', 'heavy', 'charge'].includes(a.intent.k))) || (c.dmg - a.dmg))[0];
      it = bt ? { k: 'bless', tgt: bt.id } : { k: 'attack' }; break;
    }
    case 'summoner': { const c = n % 3, c1 = (b.ctx.ch || 1) === 1; if (c1 && e.elite && !e.mendDone && e.hp < e.hpMax * MENDER.ult) { it = { k: 'lastmend' }; break; } it = c === 0 && al.filter(x => x.role === 'minion').length < SUMMON.cap ? { k: 'summon' } : c === 1 ? { k: c1 ? 'loft' : 'curse' } : { k: 'attack' }; break; } // 소환 → 저주 → 공격. A1 1챕터 수선공: 수선 → 띄우기 → 공격, 정예는 반쯤 다치면 마지막 수선(한 번)
    case 'drill': { // A1 수련장(우두머리): 회초리 → 호령 → 꾸짖음. 필살기 회초리 세례(모으기 → 큰 한 방)는 한 바퀴 뒤 전투당 한 번. 동료가 쓰러지면 다음 행동이 호령
      const mate = al.filter(x => x !== e && !x.pile && !['root', 'drill', 'healer', 'thief'].includes(x.role) && !x.s.empower).sort((a, c) => c.dmg - a.dmg)[0];
      if (e.orderNext && mate) { e.orderNext = 0; it = { k: 'order', tgt: mate.id }; break; } e.orderNext = 0;
      if (!e.ultDone && n >= DRILL.ultAt && !bigPending(b, e)) { e.ultDone = 1; it = { k: 'charge' }; break; }
      const c = n % 3; it = c === 1 && mate ? { k: 'order', tgt: mate.id } : c === 2 ? { k: 'scold' } : { k: 'attack' }; break; }
    case 'bomber': it = { k: 'fuse' }; break;
    case 'pyre': { // 화형 사제 (10월 5일): 영창 시작 → 영창 → 화형. 다른 적이 영창 중이면 불화살. 화형이나 끊긴 뒤에는 한 번 불화살
      const other = al.some(x => x !== e && x.intent && CHANT_K.includes(x.intent.k)) || ((b.ctx.ch || 1) >= 3 && !(e.intent && CHANT_K.includes(e.intent.k)) && bigPending(b, e)); // 3챕터: 다른 큰 공격이 예고되어 있으면 영창을 시작하지 않는다
      if (e.intent && e.intent.k === 'chant' && e.chant) it = { k: 'chanting' };
      else if (e.intent && e.intent.k === 'chanting' && e.chant) it = { k: 'burn' };
      else if (e.pyreRest || other) { e.pyreRest = 0; it = { k: 'attack' }; }
      else it = { k: 'chant' };
      break;
    }
    case 'minion': { const sm = al.find(x => x.role === 'summoner'); if (sm) it = al.filter(x => x.role === 'minion')[0] === e ? { k: 'guard', tgt: sm.id } : { k: 'attack' }; else it = n % 2 === 0 || (b.ctx && b.ctx.tut) ? { k: 'attack' } : { k: 'evade' }; break; } // 소환사가 있으면 하나가 지키고 나머지는 공격, 없으면 공격 ↔ 몸 낮추기 (수련장 인형은 늘 공격)
    case 'thief': it = e.loot ? { k: 'flee' } : n % 2 === 0 ? { k: 'evade' } : { k: 'steal' }; break; // 몸 낮추기 → 훔치기 → 달아나기
    case 'darkmage': it = n % 2 === 0 ? { k: 'curse' } : { k: 'attack' }; break; // 저주 → 어둠 화살
    case 'skeleton': it = n % 3 === 2 ? { k: 'brace' } : { k: 'attack' }; break; // 공격 → 공격 → 버티기
    case 'hexer': { const c = (n + (e.hexOff || 0)) % 3; it = c === 0 ? { k: 'hexcurse' } : c === 1 ? (hexDmgOf(b, e) >= b.p.hpMax * 0.15 && bigPending(b, e) ? { k: 'attack' } : { k: 'constrict' }) : { k: 'attack' }; break; } // 저주 → 조이기 → 어둠 화살 (둘째 주술사는 한 칸 어긋남)
    case 'mason': { const c = n % 4; it = (c === 0 || c === 2) ? (wallOf(b, e) ? { k: 'mend' } : (e.wallWait > 0 ? { k: 'attack' } : { k: 'build' })) : { k: 'attack' }; break; } // 벽 쌓기 → 공격 → 보강 → 공격
    case 'burrower': { if (e.under) { it = { k: 'erupt' }; break; } const can = !hasMod(b, 'flooded') && alive(b).some(x => x !== e && !x.pile && !x.under && x.role !== 'root') && !bigPending(b, e); it = n % 3 === 1 && can ? { k: 'burrow' } : { k: 'attack' }; break; } // 공격 → 파고든다 → 솟구친다 (G7 · G9)
    case 'bloat': it = n % 2 === 0 ? { k: 'attack' } : { k: 'brace' }; break;
    case 'bonewall': it = { k: 'none' }; break;
    case 'root': it = { k: 'none' }; break;
    case 'boss': {
      const ph = e.phase; const c = n % 4;
      if (e.boss === 'abbot') it = abbotIntent(b, e, n);
      else if (e.boss === 'cryptlord') it = cryptIntent(b, e, n);
      else if (e.boss === 'queen') it = queenIntent(b, e, n);
      else if (e.boss === 'bardo') it = bardoIntent(b, e, n);
      else if (e.boss === 'mother') it = c === 2 ? { k: 'charge' } : (ph >= 2 && c === 1) ? { k: 'mirror' } : { k: 'attack' };
      else it = (c === 2 || (ph >= 2 && c === 0 && n > 0)) ? { k: 'charge' } : { k: 'attack' };
      break;
    }
  }
  e.intentPrev = e.intent && e.intent.k;
  if (e.intent && e.intent.k === 'charge') it = { k: 'heavy' };
  if (e.intent && e.intent.k === 'fuse') it = { k: 'explode' };
  if (it && it.k === 'collapse' && (!e.intent || e.intent.k !== 'collapse')) e.teleTurn = b.turnIdx;
  if (e.forceAtk && it && e.role !== 'boss') { e.forceAtk = 0; it = { k: 'attack' }; } // A2 결승 종: 무리 모두 덤벼든다
  it = foeGrammar(b, e, it); /* A0 문법 ② */
  e.intent = it; e.teleSet = it; e.teleX = 0; /* A0 문법 ①: 이 예고를 실행한다(끊기 · 무너짐 · 단계 전환만 teleX로 취소) */
  if (isCh2(b)) ch2AfterIntent(b, e); // A2 어둠 속 큰 공격은 소리로
}
/* ===== 0.8.0 A0 적 문법 ② 대답할 수 없는 예고는 고르지 않는다 =====
   예고의 대답 태그(data/foes.js ans) 가운데 지금 플레이어가 쓸 수 있는 것이 하나도 없으면 그 적이 도는 순서(cyc)의 다음 행동으로. 방어 · 흘리기는 늘 있는 것으로 보되 봉인 · 기절 중이면 뺀다.
   읽는 것: 생명력 · 방어 · 걸린 상태 · 장착 스킬 · 장비(세계 노트 5절). 유산 · 소모품 수 · 쿨타임은 읽지 않는다(정화는 플라스크가 있는지만) */
function playerAnsTags(b) {
  const p = b.p, t = new Set(), sealed = (b.seal || []).some(x => x.k === 'prep');
  if (!(p.stun > 0) && !sealed) { t.add('guard'); t.add('parry'); }
  if (!(p.stun > 0)) { t.add('brk'); t.add('kill'); }
  const sk = skillsOf(p).map(id => SK2[id]).filter(Boolean);
  if ((p.ward || 0) > 0 || ['warden', 'spellblade'].includes(p.build) || sk.some(s => (s.fx || []).some(x => /^ward/.test(x.k)))) t.add('ward');
  if (sk.some(s => s.tgt === 'all' || s.tgt === 'front')) t.add('aoe');
  if (['hunter', 'elementalist'].includes(p.build) || sk.some(s => s.tgt === 'ranged' || s.tgt === 'all')) t.add('ranged');
  const DOT = ['bleed', 'poison', 'ignite']; if (sk.some(s => (s.fx || []).some(x => DOT.includes(x.k) || (x.k === 'st' && DOT.includes(x.s))))) t.add('dot');
  if (p.flask || sk.some(s => (s.fx || []).some(x => x.k === 'cleanse'))) t.add('cleanse');
  return t;
}
function foeAnswerable(b, F, k, T) { const A = F && F.ans && F.ans[k]; if (!A || !A.length || TELE_WAIT.includes(k)) return true; /* 기다림이 대답인 예고는 늘 대답할 수 있다 */ T = T || playerAnsTags(b); return A.some(x => T.has(x)); }
function foeGrammar(b, e, it) {
  const F = foeDef(b, e); if (!F || !it || !F.cyc || foeAnswerable(b, F, it.k)) return it; const T = playerAnsTags(b);
  if (!FOE_GRAMMAR[(b.ctx && b.ctx.ch) || 1]) { if (b.rec) b.rec.push({ k: 'teleVoid', role: e.role, foe: e.foe || e.boss || null, i: it.k, tags: [...T].join(',') }); return it; } // 아직 문법을 켜지 않은 챕터: 기록만
  const i0 = F.cyc.indexOf(it.k); for (let d = 1; d < F.cyc.length; d++) { const k = F.cyc[(Math.max(0, i0) + d) % F.cyc.length]; if (k !== it.k && foeAnswerable(b, F, k, T)) { if (b.rec) b.rec.push({ k: 'teleSkip', role: e.role, foe: e.foe || null, from: it.k, to: k }); return { k }; } }
  return it; // 다른 행동도 대답할 수 없으면 그대로(기록)
}
/* 어둠 방 특성 (10월 5일 고침: 문장대로 후열 적의 예고를 가린다. 등잔 기름으로 걷어 낸다) */
const darkHid = (b, e) => hasMod(b, 'dark') && e.row === 'back' && e.role !== 'boss' && !(e.intent && (['charge', 'heavy', 'aim', 'chant', 'chanting', 'burn', 'explode', 'fuse', 'sacprep', 'sacrifice'].includes(e.intent.k) || e.intent.aimed)); // 10월 5일 반례 검토: 큰 공격의 예고는 어둠에서도 보인다(읽을 수 없는 죽음을 만들지 않는다)
function intentText(b, e) { const r = intentText0(b, e); if (isCh3(b) && r.t && e.intent && DMG_K.includes(e.intent.k)) { const g = ignShare(b, e); if (g) r.t += teleW('ignAdd').replace('{g}', g); } return r; }
/* 0.8.0 A0 적 문법 ④: 예고 문장은 데이터에서만(data/foes.js TELE_T · FOES[].tele). 엔진은 숫자 · 이름만 채운다(teleVars) */
function foeDef(b, e) { if (!e || typeof FOES === 'undefined') return null; if (e.role === 'boss') return FOES[e.boss] || null; if (e.foe) return FOES[e.foe] || null; if ((b && b.ctx && b.ctx.ch || 1) !== 1) return null; if (e.monk) return FOES['abbot_' + e.role] || null; return FOES[e.role] || null; }
const teleW = k => (TELE_T[k] || [''])[0];
function teleFill(b, e, k, v) { const F = foeDef(b, e), T = TELE_T[k] || TELE_T.none, t = (F && F.tele && F.tele[k] != null ? F.tele[k] : T[0]); v = v || {}; return { t: t.replace(/\{(\w+)\}/g, (m, x) => v[x] != null ? v[x] : ''), hv: v.hv != null ? v.hv : T[1] }; }
const teleFrag = (k, n) => n ? teleW(k).replace('{n}', n) : '';
function intentText0(b, e) {
  if (isCh2(b)) { const x = ch2Text(b, e, e.intent || {}, r1(enemyHitEst(b, e))); if (x) return x; } // A2
  if (darkHid(b, e)) return teleFill(b, e, 'hidden');
  const i = e.intent || {}; const est = r1(enemyHitEst(b, e));
  if (isCh3(b)) { const x = ch3Text(b, e, i, est); if (x) return x; }
  const tgN = w => { const t = b.en.find(x => x.id === i.tgt); return t ? t.n : teleW(w); };
  switch (i.k) {
    case 'attack': return teleFill(b, e, 'attack', { est, bleed: teleFrag('f_bleed', i.bleed), poison: teleFrag('f_poison', i.poison), frost: frostTag(b, e) });
    case 'charge': return teleFill(b, e, 'charge', { hname: heavyName(e) });
    case 'heavy': return teleFill(b, e, 'heavy', { hname: heavyName(e), hest: r1(est * heavyMulOf(e, b) * (frostOn(b, e) ? 1 - elGuardOf(b.p) : 1)), hvuln: EKW.heavyVuln, frost: frostTag(b, e) });
    case 'heal': return teleFill(b, e, 'heal', { tgt: tgN('w_ally'), pct: r1(healFrac(e) * 100), tired: e.healN && !e.monk ? teleW('f_tired') : '' });
    case 'chant': return teleFill(b, e, 'chant', { cut: Math.round(CHANT.cut * 100) });
    case 'chanting': return teleFill(b, e, 'chanting', { cdmg: r1(chantDmg(b, e)), cburn: CHANT.burn, cleft: r1(e.chant ? e.chant.need - e.chant.taken : 0) });
    case 'burn': return teleFill(b, e, (b.ctx.ch || 1) === 2 ? 'burn_ch2' : 'burn', { cdmg: r1(chantDmg(b, e)), cburn: CHANT.burn });
    case 'explode': return teleFill(b, e, 'explode', { xest: r1(est * EKW.explodeMul), xweak: EKW.explodeWeak });
    case 'mirror': return teleFill(b, e, 'mirror', { mir: r1(b.p.lastSkillDmg * 0.5) });
    case 'brand': return teleFill(b, e, 'brand', { best: r1(est * 0.6) });
    case 'sermon': return teleFill(b, e, 'sermon', { sweak: ABBOT.sermonWeak });
    case 'sacprep': case 'sacrifice': return teleFill(b, e, i.k, { tgt: tgN('w_monk') });
    case 'pick': { const n = alive(b).filter(x => x.pile).length; return n ? teleFill(b, e, 'pick', { piles: n }) : teleFill(b, e, 'pick_none'); }
    case 'retprep': { const L = ['poison', 'bleed', 'ignite', 'weak', 'vuln', 'chill'].map(k => [k, Math.floor(st(e, k) * FOE_X.knight.share)]).filter(x => x[1] > 0); return teleFill(b, e, 'retprep', { ret: L.length ? teleFrag('f_list', L.map(x => KW_N[x[0]] + ' ' + x[1]).join(' · ')) : '' }); }
    case 'spray': return teleFill(b, e, 'spray', { spr: FOE_X.well.spray });
    case 'reflect': return teleFill(b, e, 'reflect', { refl: r1(Math.max(est, ((e.mimicOn && e.mimicOn.max) || 0) * FOE_X.echo.mirror * (b.firstFoe ? FOE_X.echo.first : 1))) });
    case 'carve': case 'twocarve': { const c = lordCounts(b); return teleFill(b, e, i.k, { cs: c.skill, cw: c.wpn, cp: c.prep }); }
    case 'hand': return teleFill(b, e, 'hand', { hand: r1(est * LORD.hand), hchill: LORD.handChill });
    case 'collapse': return teleFill(b, e, 'collapse', { fall: Math.round(LORD.fall * 100) });
    case 'constrict': { const k = HEX.kinds.filter(x => st(b.p, x) > 0).length; return teleFill(b, e, 'constrict', { hex: r1(hexDmgOf(b, e)), hk: k, hv: hexDmgOf(b, e) >= b.p.hpMax * 0.15 ? 1 : 0 }); }
    case 'erupt': return teleFill(b, e, 'erupt', { eru: r1(est * BURROW.up), echill: BURROW.chill });
    case 'mourn': return teleFill(b, e, 'mourn', { tgt: tgN('w_skel') });
    case 'counter': return teleFill(b, e, 'counter', { est });
    case 'aim': return teleFill(b, e, 'aim', { aest: r1(est * EKW.aimMul) });
    case 'guard': case 'bless': return teleFill(b, e, i.k, { tgt: tgN('w_mate') });
    case 'curse': return teleFill(b, e, 'curse', { cweak: EKW.curseWeak });
    case 'flee': return teleFill(b, e, 'flee', { loot: e.loot ? teleFrag('f_loot', e.loot.n) : '' });
    case 'loft': return teleFill(b, e, 'loft', { lw: MENDER.loft });
    case 'order': return teleFill(b, e, 'order', { tgt: tgN('w_mate'), oe: DRILL.order });
    case 'scold': return teleFill(b, e, 'scold', { sest: r1(est * DRILL.scold), sw: DRILL.scoldWeak });
    default: return TELE_T[i.k] ? teleFill(b, e, i.k) : teleFill(b, e, 'none');
  }
}

/* 예고 아이콘 (10월 3일 만든 사람 요청: 적이 얼마나 아프게, 무엇을 하는지 한눈에. 아이콘 + 큰 숫자 + 짧은 말) */
const heavyName = e => TELE_HEAVY[e.foe] || (e.role === 'drill' ? TELE_HEAVY.drill : '') || (e.boss === 'queen' ? TELE_HEAVY.queen : '') || (e.boss === 'cryptlord' ? (e.phase === 2 ? TELE_HEAVY.cryptlord2 : TELE_HEAVY.cryptlord) : TELE_HEAVY.base); // A0: 이름은 data/foes.js
const INTENT_ICO = { chant: '📿', chanting: '📿', burn: '🔥', raise: '⚰️', tune: '🎵', seal: '🔏', attack: '⚔️', charge: '⏳', heavy: '💥', heal: '✚', summon: '📯', fuse: '🧨', explode: '💣', mirror: '🪞', brand: '📜', pray: '🙏', none: '·', brace: '🪨', counter: '↩️', evade: '🌀', aim: '🎯', guard: '🙌', bless: '✨', curse: '🕯️', steal: '🫳', flee: '💨' };
/* 3챕터: 예고 숫자에 내 화상 몫을 더해 보인다(2절 3번). 칼춤처럼 여러 번 맞으면 맞는 수만큼(화상은 맞을 때마다 1 준다) */
function ignShare(b, e) { const n = st(b.p, 'ignite'); if (!n) return 0; const h = e.foe === 'dancer' && e.intent && e.intent.k === 'heavy' ? 1 + (e.haze || 0) : 1; let g = 0; for (let k = 0; k < h; k++) g += Math.max(0, n - k); return g; }
function intentBadge(b, e) { const r = intentBadge0(b, e); if (isCh3(b) && e.intent && DMG_K.includes(e.intent.k) && r.num !== '') { const g = ignShare(b, e); if (g) r.txt += ' (+화상 ' + g + ')'; } return r; }
function intentBadge0(b, e) {
  if (darkHid(b, e) && !isCh2(b)) return { ico: '❓', num: '', txt: '보이지 않음', cls: '' };
  const i = e.intent || {}; const est = enemyHitEst(b, e); const capOf = d => Math.min(d, b.p.hpMax * (e.role === 'boss' ? 0.45 : e.elite ? 0.35 : 0.25));
  if (isCh2(b)) { const x = ch2Badge(b, e, i, est, capOf); if (x) return x; } // A2
  if (isCh3(b)) { const x = ch3Badge(b, e, i, est, capOf); if (x) return x; }
  switch (i.k) {
    case 'attack': { const fw = frostOn(b, e); return { ico: INTENT_ICO.attack, num: r1(capOf(est * (i.aimed ? EKW.aimMul : 1) * (fw ? 1 - elGuardOf(b.p) : 1))), txt: (i.aimed ? '겨눈 한 발' : '공격') + (fw ? ' ❄️무뎌짐' : '') + (i.bleed ? ' 🩸' + i.bleed : '') + (i.poison ? ' ☠️' + i.poison : ''), cls: 'atk' }; }
    case 'hexcurse': return { ico: '🪢', num: '', txt: '저주 · 약화 1 · 취약 1', cls: 'warn' };
    case 'pick': { const n = alive(b).filter(x => x.pile).length; return { ico: '🦴', num: n, txt: '뼈 줍기 · 더미', cls: n ? 'warn' : 'sup' }; }
    case 'retprep': return { ico: '🔁', num: '', txt: '되돌리기 준비', cls: 'warn' };
    case 'return': return { ico: '🔁', num: '', txt: '되돌리기', cls: 'hv' };
    case 'spray': return { ico: '🪣', num: '', txt: '독 뿌리기 · 중독 ' + FOE_X.well.spray, cls: 'warn' };
    case 'rumble': return { ico: '🕳️', num: '', txt: '땅속', cls: 'sup' };
    case 'mimic': return { ico: '🪞', num: '', txt: '본뜨기 시작', cls: 'warn' };
    case 'reflect': { const v = Math.max(est, ((e.mimicOn && e.mimicOn.max) || 0) * FOE_X.echo.mirror * (b.firstFoe ? FOE_X.echo.first : 1)); return { ico: '🪞', num: r1(Math.min(v, b.p.hpMax * (b.firstFoe ? FOE_X.echo.capFirst : FOE_X.echo.cap))), txt: '되비추기', cls: 'hv' }; }
    case 'carve': case 'twocarve': { const c = lordCounts(b); return { ico: '📜', num: '', txt: (i.k === 'twocarve' ? '두 이름 새김' : '새김') + ' · 스킬 ' + c.skill + ' · 무기 ' + c.wpn + ' · 준비 ' + c.prep, cls: 'warn' }; }
    case 'call': return { ico: '📯', num: '', txt: '부름', cls: 'sup' };
    case 'throne': return { ico: '…', num: '', txt: '물러선다', cls: 'sup' };
    case 'hand': return { ico: '🖐️', num: r1(capOf(est * LORD.hand)), txt: '무덤의 손 · 둔화 ' + LORD.handChill, cls: 'atk' };
    case 'collapse': return { ico: '⏳', num: Math.round(LORD.fall * 100) + '%', txt: '옥좌가 흔들린다', cls: 'hv' };
    case 'constrict': { const d = hexDmgOf(b, e); return { ico: '🪢', num: r1(capOf(d)), txt: '조이기 · 해로운 상태 ' + HEX.kinds.filter(x => st(b.p, x) > 0).length + '가지', cls: d >= b.p.hpMax * 0.15 ? 'hv' : 'atk' }; }
    case 'build': return { ico: '🧱', num: '', txt: '뼈벽 쌓기', cls: 'warn' };
    case 'mend': return { ico: '🧱', num: '', txt: '뼈벽 보강', cls: 'sup' };
    case 'burrow': return { ico: '🕳️', num: '', txt: '파고들기 · 곧 솟구침', cls: 'warn' };
    case 'erupt': return { ico: '🕳️', num: r1(capOf(est * BURROW.up)), txt: '솟구침 · 둔화 ' + BURROW.chill, cls: 'hv' };
    case 'mourn': return { ico: '🪦', num: '', txt: '곡하기 · 뼈를 일으킴', cls: 'warn' };
    case 'brace': return { ico: INTENT_ICO.brace, num: '', txt: '버티기', cls: 'sup' };
    case 'counter': return { ico: INTENT_ICO.counter, num: r1(capOf(est)), txt: '반격 태세', cls: 'warn' };
    case 'evade': return { ico: INTENT_ICO.evade, num: '', txt: '몸 낮춤', cls: 'sup' };
    case 'aim': return { ico: INTENT_ICO.aim, num: '', txt: '겨누는 중', cls: 'warn' };
    case 'guard': { const t = b.en.find(x => x.id === i.tgt); return { ico: INTENT_ICO.guard, num: '', txt: '동료 지키기', cls: 'sup' }; }
    case 'bless': { const t = b.en.find(x => x.id === i.tgt); return { ico: INTENT_ICO.bless, num: '+25%', txt: '축복', cls: 'sup' }; }
    case 'curse': return { ico: INTENT_ICO.curse, num: '', txt: '저주 · 약화 ' + EKW.curseWeak, cls: 'warn' };
    case 'steal': return { ico: INTENT_ICO.steal, num: '', txt: '훔치기', cls: 'warn' };
    case 'flee': return { ico: INTENT_ICO.flee, num: '', txt: '달아나기', cls: 'hv' };
    case 'charge': return { ico: INTENT_ICO.charge, num: '', txt: heavyName(e) + ' 준비', cls: 'warn' };
    case 'raise': return { ico: INTENT_ICO.raise, num: '', txt: '시체 일으키기', cls: 'sup' };
    case 'tune': return { ico: INTENT_ICO.tune, num: '', txt: '음 고르기', cls: 'warn' };
    case 'seal': return { ico: INTENT_ICO.seal, num: '', txt: '봉인', cls: 'warn' };
    case 'heavy': if (e.boss === 'abbot' && st(b.p, 'brand') >= 3) return { ico: '⚡', num: r1(capOf(est * heavyMulOf(e, b) * (1 + ABBOT.brand * 3))), txt: '심판', cls: 'hv' }; return { ico: INTENT_ICO.heavy, num: r1(capOf(est * heavyMulOf(e, b) * (frostOn(b, e) ? 1 - elGuardOf(b.p) : 1))), txt: heavyName(e) + ' · 취약 ' + EKW.heavyVuln + frostTag(b, e, 1), cls: 'hv' };
    case 'heal': { const t = b.en.find(x => x.id === i.tgt); return { ico: INTENT_ICO.heal, num: Math.round(healFrac(e) * 100) + '%', txt: '치유', cls: 'sup' }; }
    case 'summon': return { ico: INTENT_ICO.summon, num: '', txt: '부르기', cls: 'sup' };
    case 'fuse': return { ico: INTENT_ICO.fuse, num: '', txt: '도화선 · 곧 폭발', cls: 'warn' };
    case 'chant': return { ico: INTENT_ICO.chant, num: '', txt: '영창 시작', cls: 'warn' };
    case 'chanting': return { ico: INTENT_ICO.chanting, num: '', txt: '영창 · 곧 화형', cls: 'hv' };
    case 'burn': return { ico: INTENT_ICO.burn, num: r1(capOf(chantDmg(b, e))), txt: (b.ctx.ch || 1) === 2 ? '장송곡 · 중독 4' : '화형 · 화상 ' + CHANT.burn, cls: 'hv' };
    case 'explode': return { ico: INTENT_ICO.explode, num: r1(Math.min(est * EKW.explodeMul, b.p.hpMax * (e.elite ? 0.35 : 0.25))), txt: '폭발 · 약화 ' + EKW.explodeWeak, cls: 'hv' };
    case 'mirror': return { ico: INTENT_ICO.mirror, num: r1(b.p.lastSkillDmg * 0.5), txt: '거울', cls: 'hv' };
    case 'brand': return { ico: INTENT_ICO.brand, num: r1(capOf(est * 0.6)), txt: '죄를 읽는다 · 낙인', cls: 'atk' };
    case 'challenge': return { ico: '⚖️', num: '', txt: '심문한다', cls: 'warn' };
    case 'confess': return { ico: '🤲', num: '', txt: '고해를 요구한다', cls: 'warn' };
    case 'sermon': return { ico: '📖', num: '', txt: '설교 · 약화 ' + ABBOT.sermonWeak, cls: 'warn' };
    case 'rest': return { ico: '…', num: '', txt: '사이 행동 뒤 · 숨을 고른다', cls: 'sup' };
    case 'sacprep': { const t = b.en.find(x => x.id === i.tgt); return { ico: '🩸', num: '', txt: (t ? t.n : '수도사') + '을(를) 끌어당긴다', cls: 'hv' }; }
    case 'sacrifice': { const t = b.en.find(x => x.id === i.tgt); return { ico: '🩸', num: '', txt: '제물: ' + (t ? t.n : '수도사'), cls: 'hv' }; }
    case 'lastprayer': return { ico: '🙏', num: '', txt: '최후의 기도', cls: 'warn' };
    case 'pray': return { ico: INTENT_ICO.pray, num: '', txt: '기도', cls: 'sup' };
    case 'loft': return { ico: '🪶', num: '', txt: '띄우기 · 약화 ' + MENDER.loft, cls: 'warn' };
    case 'lastmend': return { ico: '🧵', num: '', txt: '마지막 수선', cls: 'warn' };
    case 'order': return { ico: '📢', num: '', txt: '호령 · 강화 ' + DRILL.order, cls: 'warn' };
    case 'scold': return { ico: '📏', num: r1(capOf(est * DRILL.scold)), txt: '꾸짖음 · 약화 ' + DRILL.scoldWeak, cls: 'atk' };
    default: return { ico: INTENT_ICO.none, num: '', txt: '', cls: '' };
  }
}
/* 내 다음 차례(보통 행동) 전에 받을 피해 어림: 예고된 공격 + 그 뒤 더 움직이면 평소 공격. 흘리기·방어는 빼고 센다 */
function incomingEst(b) {
  let sum = 0, n = 0;
  for (const x of previewAfter(b, 1)) {
    const e = x.e; const bd = intentBadge(b, e); const cap = d => Math.min(d, b.p.hpMax * (e.role === 'boss' ? 0.45 : e.elite ? 0.35 : 0.25));
    if (['attack', 'heavy', 'explode', 'mirror', 'brand', 'burn', 'erupt', 'constrict', 'firepot', 'ash', 'noon', 'scold'].includes((e.intent || {}).k)) { sum += +bd.num || 0; n++; if (isCh3(b)) sum += ignShare(b, e); }
    for (let k = 1; k < x.n; k++) { sum += cap(enemyHitEst(b, e)); n++; }
  }
  const pz = st(b.p, 'poison'); if (pz > 0) { sum += pz; n++; } // G10: 라운드 끝 중독도 내 다음 차례 전에 들어온다
  if (b.heat != null && b.heatWarn != null && b.heatWarn <= (b.round || 0)) { sum += heatStormEst(b); n++; } // 3챕터: 이번 라운드 끝의 열풍(2절 4번)
  return { sum, n };
}
function enemyHitEst(b, e) {
  let d = e.dmg; if (e.row === 'back' && hasMod(b, 'sandstorm')) d *= 0.8; /* 3챕터 모래폭풍 */ if (e.hymn) d *= 1 + FOE_X.cantor.hymn * e.hymn; /* 성가 조율자의 노래 */ if (e.s.weak) d *= 0.75; if (e.s.empower) d *= 1.25; if (b.enrage) d *= 1 + 0.5 * (b.enrageLv || 1);
  if (e.role === 'boss' && e.phase === 3 && e.boss !== 'abbot') d *= 1.2; // 10월 4일: 수도원장은 3페이즈 피해 +20%를 뺐다(고해의 밤)
  if (isCh2(b)) d *= ch2FoeOut(b, e); // A2 지휘 · 대형 · 함성 · 등불 · 마지막 발악
  return d;
}
function enemyAct(b, e) {
  b.actN = (b.actN || 0) + 1;
  if (e.s.trap) { const tr = e.s.trap; delete e.s.trap; hurtEnemy(b, e, tr.stacks, { label: '덫', aoe: tr.aoe || 0 }); if (e.alive) addBreak(b, e, tr.brk || 0); logp(b, 'good', e.n + '이(가) 덫을 밟는다'); if (!e.alive || b.over) return; }
  if (e.pile || e.role === 'bonewall' || e.role === 'crown') return; // 뼈 더미 · 뼈벽 · 왕관은 움직이지 않는다
  e.exposed = 0;
  if (e.boss === 'cryptlord' && e.phase === 2 && e.row === 'front') { e.row = 'back'; logp(b, 'sys', e.n + '이(가) 옥좌로 되돌아간다'); }
  if (e.role === 'mason' && e.wallWait > 0) e.wallWait--;
  if (e.stun > 0) { e.stun--; logp(b, 'sys', e.n + '이(가) 비틀거린다. 행동을 놓친다'); if (e.uqFrz) { e.uqFrz = 0; uqR(b.p, 'u_frzSkip', b, b.p, e); } /* M6-1 고유 el_h8: 얼어붙은 적이 행동을 놓칠 때 */ e.acts++; return; }
  e.braced = 0; e.countering = 0; e.evading = 0; e.guarding = null; e.unguard = 0; // 버티기 · 반격 태세 · 몸 낮추기 · 지키기는 그 적의 다음 행동까지
  const i = e.intent || { k: 'attack' }; const d = enemyHitEst(b, e);
  if ((i.k === 'heavy' || i.k === 'explode' || i.k === 'burn' || i.aimed || i.k === 'sacrifice' || i.k === 'erupt' || i.k === 'reflect' || i.k === 'collapse' || i.k === 'noon') && e.teleTurn === b.turnIdx) { logp(b, 'sys', e.n + '이(가) 힘을 모은 채 노려본다'); return; } // 10월 4일: 예고한 큰 공격은 내 차례가 한 번 지난 뒤에 나간다 (한 라운드에 두 번 움직이는 적이 모은 바로 그 라운드에 내리쳤다)
  b.rec.push({ k: 'eact', t: r1(b.t), role: e.role, i: i.k }); if (e.teleSet && e.intent !== e.teleSet && !e.teleX) b.rec.push({ k: 'teleMis', role: e.role, foe: e.foe || e.boss || null, from: e.teleSet.k, to: i.k }); /* A0 문법 ① 검사(tools/foe-check.js) */
  if (e.role === 'boss' && !BOSS_TR.includes(i.k)) { const ph = e.phase || 1; e.phAct = e.phAct || {}; e.phAct[ph] = (e.phAct[ph] || 0) + 1; } // 단계 최소 체류 셈
  if (i.k === 'heavy' || i.k === 'explode' || i.k === 'burn' || i.aimed || i.k === 'sacrifice' || i.k === 'erupt' || i.k === 'reflect' || i.k === 'collapse' || i.k === 'noon') b.rec.push({ k: 'bigfire', role: e.role, foe: e.foe || null, i: i.k, gap: e.teleTurn == null ? -1 : b.turnIdx - e.teleTurn }); // 10월 5일: 예고된 큰 공격이 나갈 때 예고 뒤 내 차례가 몇 번 있었는지 (-1은 예고 없이 나감)
  if (isCh3(b) && ch3Act(b, e, i, d)) { } // 3챕터 행동
  else if (isCh2(b) && ch2Act(b, e, i, d)) { } // A2 2챕터 행동(js/15)
  else switch (i.k) {
    case 'attack': { if (e.missNext) { e.missNext = 0; logp(b, 'good', e.n + '의 공격이 연막 속에서 빗나간다'); break; } const x = hurtPlayer(b, d * (i.aimed ? EKW.aimMul : 1), { src: e, single: 1, label: e.n + (i.aimed ? '이(가) 겨눈 한 발을 쏜다' : ({ archer: '이(가) 활을 쏜다', darkmage: '이(가) 어둠 화살을 날린다', pyre: '이(가) 불씨를 던진다' })[e.role] || '이(가) 나를 벤다') }); if (i.bleed && x > 0) addS(b, b.p, 'bleed', i.bleed); if (i.poison && x > 0 && !b.over) addPoison(b, b.p, i.poison, 0); if (isCh3(b)) fireCarry(b, e, 0, x > 0); leech(b, e, x); break; }
    case 'brand': { hurtPlayer(b, d * 0.6, { src: e, single: 1, label: e.n + '이(가) 죄를 읽는다' }); if (!b.over) { const before = st(b.p, 'brand'); addS(b, b.p, 'brand', 999, 1, 3); if (st(b.p, 'brand') > before) logp(b, 'bad', '이름 위에 낙인이 새겨진다. 낙인 ' + st(b.p, 'brand')); codexHit(b, 'abbot', 'brand'); } break; }
    case 'pray': { logp(b, 'sys', e.n + '이(가) 입을 다문 채 기도한다'); break; }
    case 'challenge': { e.demand = { k: 'atk', turn: b.turnIdx, hit: 0 }; logp(b, 'crit', e.n + '이(가) 다음 차례에 당신을 심문하려 한다'); codexHit(b, 'abbot', 'demand'); break; }
    case 'confess': { e.demand = { k: 'rest', turn: b.turnIdx, hit: 0 }; logp(b, 'crit', e.n + '이(가) 다음 차례에 고해를 받으려 한다'); codexHit(b, 'abbot', 'demand'); break; }
    case 'sermon': { addS(b, b.p, 'weak', ABBOT.sermonWeak); logp(b, 'bad', e.n + '이(가) 설교한다. 약화 ' + ABBOT.sermonWeak); break; }
    case 'rest': { logp(b, 'sys', e.n + '이(가) 무너진 제단 위에서 숨을 고른다'); break; }
    case 'sacprep': { const m = b.en.find(x => x.id === i.tgt && x.alive); if (m) { e.sacNext = m.id; e.teleTurn = b.turnIdx; logp(b, 'crit', e.n + '이(가) ' + m.n + '을(를) 끌어당긴다'); codexHit(b, 'abbot', 'sacrifice'); } break; }
    case 'sacrifice': { const m = b.en.find(x => x.id === i.tgt && x.alive); e.sacNext = null; if (m) { m.alive = false; m.hp = 0; const h = e.hpMax * ABBOT.sacHeal; e.hp = Math.min(e.hpMax, e.hp + h); addS(b, b.p, 'brand', 999, 1, 3); logp(b, 'bad', e.n + '이(가) ' + m.n + '을(를) 제물로 바친다. 생명력 +' + r1(h) + ', 낙인이 깊어진다'); checkEnd(b); } else { addS(b, e, 'empower', 2); logp(b, 'bad', e.n + '이(가) 최후의 기도를 올린다'); } break; }
    case 'lastprayer': { e.lastPray = 1; addS(b, e, 'empower', 2); logp(b, 'bad', e.n + '이(가) 최후의 기도를 올린다. 강화 2'); break; }
    case 'pick': { const ps = alive(b).filter(x => x.pile); let g = 0; for (const x of ps) { x.norise = 1; x.hp = 0; killEnemy(b, x); g += FOE_X.collector.pick; } if (g) { addS(b, e, 'protect', Math.min(FOE_X.collector.cap, g)); logp(b, 'bad', e.n + '이(가) 뼈 더미 ' + ps.length + '개를 거둔다. 보호 ' + st(e, 'protect')); codexHit(b, 'collector', 'pick'); } else logp(b, 'sys', e.n + '이(가) 바닥을 훑지만 거둘 뼈가 없다'); break; }
    case 'retprep': logp(b, 'sys', e.n + '이(가) 방패를 뒤집는다. 몸에 걸린 것을 되돌려 보내려 한다'); break;
    case 'return': { const mv = []; for (const k of ['poison', 'bleed', 'ignite', 'weak', 'vuln', 'chill']) { const h = Math.floor(st(e, k) * FOE_X.knight.share); if (h > 0) { kwDec(e, k, h); if (k === 'poison') addPoison(b, b.p, h, 0); else addS(b, b.p, k, h); mv.push(KW_N[k] + ' ' + h); } } if (mv.length) { logp(b, 'bad', e.n + '이(가) 저주를 되돌린다. ' + mv.join(', ')); codexHit(b, 'knight', 'ret'); } else logp(b, 'sys', e.n + '에게 되돌릴 것이 없다'); break; }
    case 'spray': addPoison(b, b.p, FOE_X.well.spray, 0); logp(b, 'bad', e.n + '이(가) 국자를 흩뿌린다. 중독 ' + FOE_X.well.spray); break;
    case 'rumble': logp(b, 'sys', '땅이 울린다'); codexHit(b, 'sexton', 'under'); break;
    case 'mimic': e.mimicOn = { max: 0 }; e.teleTurn = b.turnIdx; /* 되비추기도 예고 뒤 내 차례가 한 번 지난 뒤 */ logp(b, 'sys', e.n + '이(가) 당신의 움직임을 따라 하기 시작한다'); break;
    case 'reflect': { const X = FOE_X.echo; const fst = b.firstFoe ? 1 : 0; const raw = Math.max(d, ((e.mimicOn && e.mimicOn.max) || 0) * X.mirror * (fst ? X.first : 1)); const dd = Math.min(raw, b.p.hpMax * (fst ? X.capFirst : X.cap)); e.mimicOn = null; hurtPlayer(b, dd, { src: e, single: 1, charged: 1, label: e.n + '이(가) 당신의 공격을 되비춘다' }); codexHit(b, 'echo', 'mirror'); break; }
    case 'carve': case 'twocarve': lordCarve(b, e, i.k === 'twocarve'); break;
    case 'call': { const n0 = alive(b).filter(x => x.role === 'skeleton').length; if (n0 < LORD.guards) { const s0 = lordGuard(e.lv || 1, b.idc++, b.ctx.ch || 2); s0.intent = { k: 'brace' }; s0.acts = 2; s0.xpCh = 0; b.en.push(s0); logp(b, 'bad', e.n + '이(가) 이름을 부른다. 벽에서 해골이 걸어 나온다'); } else logp(b, 'sys', e.n + '이(가) 이름을 부르지만 대답이 없다'); break; }
    case 'throne': lordThrone(b, e); break;
    case 'mend': if (e.boss === 'cryptlord') { lordMend(b, e); break; } { const w = wallOf(b, e); if (w) { const h0 = w.hp; w.hp = Math.min(w.hpMax, w.hp + w.hpMax * BWALL.mend); logp(b, 'sys', e.n + '이(가) 뼈벽을 보강한다. +' + r1(w.hp - h0)); } else buildWall(b, e); break; }
    case 'hand': { const x = hurtPlayer(b, d * LORD.hand, { src: e, single: 1, label: '무덤의 손이 바닥에서 뻗어 나온다' }); if (x > 0 && !b.over) addS(b, b.p, 'chill', LORD.handChill); break; }
    case 'collapse': lordFall(b, e); break;
    case 'hexcurse': { addS(b, b.p, 'weak', 1); addS(b, b.p, 'vuln', 1); logp(b, 'bad', e.n + '이(가) 저주를 맺는다. 약화 1 · 취약 1'); break; }
    case 'constrict': { hurtPlayer(b, hexDmgOf(b, e), { src: e, single: 1, label: e.n + '이(가) 실을 조인다' }); break; }
    case 'build': buildWall(b, e); break;
    case 'burrow': { e.under = 1; e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '이(가) 땅속으로 파고든다. 바닥의 흙이 들썩인다'); break; }
    case 'erupt': { e.under = 0; if (e.foe === 'sexton') { e.exposed = 1; codexHit(b, 'sexton', 'exposed'); } const x = hurtPlayer(b, d * (e.strong ? heavyMulOf(e, b) : BURROW.up), { src: e, single: 1, charged: 1, label: e.n + '이(가) 발밑에서 솟구친다' }); if (x > 0 && !b.over) { if (e.role === 'lurker') addS(b, b.p, 'bleed', LURK.bleed); else addS(b, b.p, 'chill', BURROW.chill); } if (e.role === 'lurker') e.lurkRest = LURK.rest; if (e.alive) { addS(b, e, 'vuln', BURROW.vuln); logp(b, 'good', e.n + '이(가) 드러난다. 취약 ' + BURROW.vuln); } break; }
    case 'mourn': { const t = b.en.find(x => x.id === i.tgt && x.alive && x.pile); if (t && !t.norise) riseSkel(b, t, e.n + '이(가) 곡을 한다. '); else logp(b, 'sys', e.n + '의 곡이 허공에 흩어진다'); break; }
    case 'brace': { e.braced = 1; logp(b, 'sys', e.n + '이(가) 몸을 굳혀 버틴다. 받는 피해 절반'); break; }
    case 'counter': { e.countering = 1; logp(b, 'sys', e.n + '이(가) 방패 뒤에서 되받을 자세를 잡는다'); break; }
    case 'evade': { e.evading = 1; logp(b, 'sys', e.n + '이(가) 몸을 낮춘다'); break; }
    case 'aim': { e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '이(가) 시위를 당겨 겨눈다'); break; }
    case 'guard': { const t = b.en.find(x => x.id === i.tgt && x.alive); if (t) { e.guarding = t.id; logp(b, 'sys', e.n + '이(가) ' + t.n + ' 앞을 막아선다'); } break; }
    case 'bless': { const t = b.en.find(x => x.id === i.tgt && x.alive); if (t) { addS(b, t, 'empower', 1); logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 축복을 내린다. 다음 공격 피해 +25%'); } break; }
    case 'loft': { addS(b, b.p, 'weak', MENDER.loft); logp(b, 'bad', e.n + '이(가) 내 무기를 띄워 민다. 약화 ' + MENDER.loft); break; }
    case 'lastmend': { e.mendDone = 1; e.mendRise = 1; logp(b, 'crit', e.n + '이(가) 제 몸의 실밥을 고쳐 맨다. 쓰러져도 한 번 다시 일어난다'); break; }
    case 'order': { const t = b.en.find(x => x.id === i.tgt && x.alive); if (t) { addS(b, t, 'empower', DRILL.order); logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 호령한다. 강화 ' + DRILL.order); } break; }
    case 'scold': { hurtPlayer(b, d * DRILL.scold, { src: e, single: 1, label: e.n + '이(가) 회초리로 꾸짖는다' }); if (!b.over) addS(b, b.p, 'weak', DRILL.scoldWeak); break; }
    case 'curse': { addS(b, b.p, 'weak', EKW.curseWeak); logp(b, 'bad', e.n + '이(가) 저주를 읊는다. 약화 ' + EKW.curseWeak); break; }
    case 'steal': { const lt = stealLoot(b); if (lt) { e.loot = lt; logp(b, 'bad', e.n + '이(가) ' + lt.n + '을(를) 훔친다. 달아나기 전에 잡으면 되찾는다'); } else logp(b, 'sys', e.n + '이(가) 훔칠 것을 찾지 못한다'); break; }
    case 'flee': { if (e.stuck) { e.stuck = 0; logp(b, 'good', e.n + '이(가) 끈끈이에 걸려 달아나지 못한다'); break; } e.alive = false; e.fled = 1; logp(b, 'bad', e.n + '이(가) ' + (e.loot ? e.loot.n + '을(를) 들고 ' : '') + '달아난다'); if (e.loot) loseLoot(e.loot); checkEnd(b); break; }
    case 'charge': e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + ({ bishop: '이(가) 뼈 창을 겨눈다', cantor: '이(가) 숨을 크게 들이쉰다. 노래가 끝나 간다', scribe: '이(가) 마지막 줄을 적기 시작한다', colossus: '의 몸이 하얗게 달아오른다', reaper: '의 낫에 불씨가 모인다', dancer: '이(가) 칼끝을 모은다. 남은 윤곽만큼 춤이 길다' }[e.foe] || (e.boss === 'queen' ? '의 창끝에 해가 맺힌다' : '') || '이(가) 무기를 높이 치켜든다. 강타가 온다')); break;
    case 'heavy': { const bm = e.boss === 'abbot' ? 1 + ABBOT.brand * st(b.p, 'brand') : 1; const jd = e.boss === 'abbot' && st(b.p, 'brand') >= 3; if (jd) codexHit(b, 'abbot', 'judgment'); const fl = { bishop: '의 뼈 창이 꽂힌다', cantor: '의 노래가 끝난다. 곁의 적들이 한꺼번에 덮친다', scribe: '이(가) 선고를 내린다', colossus: '의 녹은 유리가 쏟아진다', reaper: '의 낫이 불씨를 거두어 내리친다' }[e.foe] || (e.boss === 'queen' ? '의 태양창이 꽂힌다' : null); const x = hurtPlayer(b, d * heavyMulOf(e, b) * bm, { src: e, single: 1, charged: 1, judgment: jd ? 1 : 0, label: jd ? e.n + '이(가) 심판을 내린다' : fl ? e.n + fl : e.n + '의 강타가 내리꽂힌다' + (bm > 1 ? '. 낙인이 타오른다' : '') }); if (x > 0) addS(b, b.p, 'vuln', EKW.heavyVuln); leech(b, e, x); if (isCh3(b)) fireCarry(b, e, 1, x > 0);
      if (e.foe === 'colossus') { e.glow = 0; if (x > 0 && !b.over) addS(b, b.p, 'ignite', FOE_X.colossus.pourIgn); codexHit(b, 'colossus', 'pour'); }
      if (e.foe === 'reaper') e.embers = 0;
      if (e.foe === 'pilgrim' && e.fillMax) e.fill = 0; // A1 배 채움은 큰 한 방에 쓴다
      if (e.foe === 'bishop') { const cs = corpsesOf(b); for (const c of cs) { c.alive = false; c.hp = 0; } if (cs.length) logp(b, 'bad', '뼈 창이 시체 ' + cs.length + '구를 삼켰다'); codexHit(b, 'bishop', 'spear'); }
      if (e.foe === 'cantor') { hymnReset(b); codexHit(b, 'cantor', 'chorus'); }
      if (e.foe === 'scribe') { b.seal = []; logp(b, 'sys', '봉인이 모두 풀린다'); codexHit(b, 'scribe', 'verdict'); }
      if (e.foe === 'well') { codexHit(b, 'well', 'open'); if (b.p.s.poison) { delete b.p.s.poison; logp(b, 'sys', '우물이 몸속의 독을 모두 빨아들인다'); codexHit(b, 'well', 'spent'); } }
      break; }
    case 'heal': { const hcut = e.noHeal ? CONS.hinder.v : 0; if (hcut) { e.noHeal = 0; logp(b, 'good', e.n + '의 손이 방해 부적에 떨린다. 치유 −' + Math.round(hcut * 100) + '%'); } const t = b.en.find(x => x.id === i.tgt && x.alive) || alive(b).sort((a, c) => a.hp / a.hpMax - c.hp / c.hpMax)[0]; if (t) { const hf = healFrac(e) * (1 - hcut); t.hp = Math.min(t.hpMax, t.hp + t.hpMax * hf); e.healN = (e.healN || 0) + 1; logp(b, 'bad', e.n + '이(가) ' + t.n + '의 상처를 봉합한다. ' + r1(hf * 100) + '% 회복' + (!e.monk ? '. 손이 점점 무뎌진다' : '')); } break; }
    case 'raise': { if (e.noSummon) { e.noSummon = 0; logp(b, 'good', e.n + '의 부름이 방해 부적에 막힌다'); break; } let k = 0; for (; k < FOE_X.bishop.raise && corpsesOf(b).length < FOE_X.bishop.cap; k++) { const c = spawn(b, 'minion'); if (!c) break; c.corpse = 1; if ((b.ctx.ch || 1) === 1 && FOES.bishop.corpseN) c.n = FOES.bishop.corpseN; /* A1: 수선공의 기워진 시체와 다른 이름 */ } logp(b, 'bad', e.n + '이(가) 지팡이를 두드린다. ' + (k ? '시체 ' + k + '구가 일어선다' : '더 일어설 것이 없다')); codexHit(b, 'bishop', 'raise'); break; }
    case 'tune': { const L = chorusOf(b, e); for (const x of L) x.hymn = Math.min(FOE_X.cantor.cap, (x.hymn || 0) + 1); logp(b, 'bad', e.n + '이(가) 음을 고른다. 곁의 적들이 숨을 맞춘다'); if (L.length) codexHit(b, 'cantor', 'hymn'); break; }
    case 'seal': { const r = sealPick(b); if (!r) { logp(b, 'sys', e.n + '이(가) 적어 넣을 것을 찾지 못한다'); break; }
      if (b.p.s.block) { kwDec(b.p, 'block'); logp(b, 'good', '정화의 막이 봉인을 튕겨 낸다'); break; }
      if (stat(b.p, 'wil') > 0 && b.rngF && b.rngF() < Math.min(0.25, 0.01 * stat(b.p, 'wil'))) { logp(b, 'good', '의지로 봉인을 버틴다'); break; }
      (b.seal = b.seal || []).push(r); logp(b, 'bad', e.n + '이(가) ' + r.n + '을(를) 적어 넣는다. 봉인 ' + b.seal.length + '/' + FOE_X.scribe.cap); codexHit(b, 'scribe', 'seal'); break; }
    case 'summon': if (e.noSummon) { e.noSummon = 0; logp(b, 'good', e.n + '의 부름이 방해 부적에 막힌다'); break; } for (let k = 0; k < SUMMON.n; k++) spawn(b, 'minion'); logp(b, 'bad', e.n + '의 부름에 뼈가 일어선다'); break;
    case 'fuse': e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '의 도화선이 타들어 간다'); break;
    case 'chant': { e.chant = { taken: 0, need: Math.round(e.hpMax * CHANT.cut) }; logp(b, 'sys', e.n + '이(가) 화형 영창을 시작한다'); break; }
    case 'chanting': { e.teleTurn = b.turnIdx; logp(b, 'sys', e.n + '의 영창이 높아진다. 장작에 불이 붙는다'); break; }
    case 'burn': { e.chant = null; e.pyreRest = 1; const x = hurtPlayer(b, chantDmg(b, e) * (b.halfBoom === b.round ? 0.5 : 1), { src: e, single: 1, charged: 1, spell: 1, label: e.n + '의 화형이 나를 덮친다' }); if (x > 0 && !b.over) { if ((b.ctx.ch || 1) === 2) addPoison(b, b.p, 4, 0); else addS(b, b.p, 'ignite', CHANT.burn); } break; } // 2챕터 장송 영창자: 장송곡(중독 4)
    case 'explode': { hurtPlayer(b, d * EKW.explodeMul * (b.halfBoom === b.round ? 0.5 : 1), { src: e, aoe: 1, label: e.n + '이(가) 터진다' }); if (!b.over) addS(b, b.p, 'weak', EKW.explodeWeak); e.alive = false; e.hp = 0; logp(b, 'sys', e.n + '은(는) 재가 되어 흩어진다'); checkEnd(b); break; }
    case 'mirror': { const x = b.p.lastSkillDmg * 0.5; if (x > 0) hurtPlayer(b, x, { src: e, single: 1, label: '나락의 거울이 내 스킬을 되비춘다' }); else logp(b, 'sys', '거울에 비칠 것이 없다'); break; }
  }
  // 0.6a.2: 공격했으면 약화·강화 1 감소, 행동했으니 출혈 발동, 다음 행동 시간에 둔화·가속
  if (['attack', 'heavy', 'explode', 'mirror', 'brand', 'burn', 'erupt', 'constrict', 'reflect', 'hand', 'firepot', 'ash', 'noon', 'scold', 'shove', 'volley', 'torch', 'firepot2', 'sting', 'lunge', 'grab', 'combo', 'seize', 'pouroil'].includes(i.k)) { kwDec(e, 'weak'); kwDec(e, 'empower'); }
  if (e.ctrWeak) { if (e.alive) addS(b, e, 'weak', e.ctrWeak); e.ctrWeak = 0; } // 수도승 되받기의 약화: 그 적의 다음 공격을 깎는다
  if (e.alive) kwBleed(b, e); if (e.alive) kwSear(b, e); // 0.8.0 M5-0 혈염
  e.acts++;
  if (e.role === 'boss' && e.alive) bossPhase(b, e);
  if (e.role === 'boss' && e.alive && e.bank > 0 && !e.qNext && !e.lordNext && !e.abNext) { const w = bossDwell(e); if (!(w && w.last && w.left)) bossBankApply(b, e); } // 10월 15일: 쌓인 피해
  if (e.alive) decideIntent(b, e);
}
/* 굶주린 순례자: 준 피해의 절반을 마신다 */
function leech(b, e, x) { if (e.foe === 'pilgrim' && x > 0 && e.alive) { e.hp = Math.min(e.hpMax, e.hp + x * STRONG.leech); if ((b.ctx.ch || 1) === 1) { e.fillMax = e.fillMax || Math.round(e.hpMax * PILGRIM.fill); const was = e.fill >= e.fillMax; e.fill = Math.min(e.fillMax, (e.fill || 0) + x * STRONG.leech); if (!was && e.fill >= e.fillMax) logp(b, 'bad', e.n + '의 배가 찼다. 다음 큰 한 방이 커진다'); } /* A1 [이식 제안] 배 채움 칸(비공개 문서 참조) */ logp(b, 'bad', e.n + '이(가) 피를 마신다. ' + r1(x * STRONG.leech) + ' 회복'); codexHit(b, 'pilgrim', 'leech'); } }
/* ===== 타락한 수도원장: 고해의 밤 (10월 4일, 기믹 상세 · 대처는 비공개 문서) ===== */
function abbotIntent(b, e, n) {
  if (e.restNext) { e.restNext = 0; return { k: 'rest' }; }
  if (e.sacNext) return { k: 'sacrifice', tgt: e.sacNext };
  if (e.phase === 2) { if (e.vow) return { k: 'pray' }; const c = (e.serN = (e.serN || 0) + 1) - 1; return c === 0 ? { k: 'sermon' } : c === 1 ? { k: 'charge' } : { k: 'attack' }; }
  if (e.phase === 3) {
    if (e.sacCool > 0) e.sacCool--;
    const monks = alive(b).filter(x => x.monk);
    if (e.hp < e.hpMax * ABBOT.sacHp && !(e.sacCool > 0)) { if (monks.length) return { k: 'sacprep', tgt: monks.sort((x, y) => x.hp - y.hp)[0].id }; if (!e.lastPray) return { k: 'lastprayer' }; }
  }
  const c = n % 6; return c === 0 ? { k: 'challenge' } : c === 1 ? { k: 'attack' } : c === 2 ? { k: 'brand' } : c === 3 ? { k: 'confess' } : c === 4 ? { k: 'charge' } : { k: 'attack' };
}
function abbotDemand(b) {
  for (const e of alive(b)) {
    if (!e.demand || e.demand.turn !== b.turnIdx) continue; const D = e.demand; e.demand = null; const p = b.p;
    const down = () => { if (p.s.brand) { p.s.brand.stacks--; if (p.s.brand.stacks <= 0) delete p.s.brand; } };
    if (D.k === 'atk') { if (D.hit) { down(); logp(b, 'good', '맞서는 칼끝에 낙인 하나가 옅어진다'); } else { addS(b, p, 'brand', 999, 1, 3); logp(b, 'bad', '맞서지 않은 죄가 새겨진다. 낙인 ' + st(p, 'brand')); } }
    else { if (!D.hit) { down(); logp(b, 'good', '고해를 받아들인다. 낙인 하나가 사라진다'); unlAdd(b, 'confess'); } else { addS(b, p, 'brand', 999, 1, 3); addS(b, e, 'empower', 1); logp(b, 'bad', '고해 중에 칼을 들었다. 낙인이 깊어지고 ' + e.n + '이(가) 북받친다'); } }
  }
}
function abbotCandles(b, e) {
  const n = ABBOT.candles[Math.min(ABBOT.candles.length - 1, e.vowN || 0)]; e.vowN = (e.vowN || 0) + 1;
  for (let i = 0; i < n; i++) { const c = mkEnemy('candle', 0, b.idc++, { lv: e.lv || 1 }); c.hpMax = Math.max(1, Math.round(e.hpMax * ABBOT.candleHp)); c.hp = c.hpMax; c.summoned = true; c.intent = { k: 'none' }; b.en.push(c); }
  logp(b, 'crit', '제단에 촛불 ' + n + '개가 켜진다'); codexHit(b, 'abbot', 'candles');
}
function abbotBell(b, e) {
  const p = b.p; for (const k of ['protect', 'rage', 'empower', 'haste', 'block']) delete p.s[k]; p.whet = 0; p.nextRed = 0; p.decoy = 0; if (p.rime) p.rime = null; if (p.payCut) p.payCut = []; // 원소술사 되얼림도 흩어진다
  ysLose(b, 1, '침묵의 종'); // 10월 15일 유산 1차 시제품: 쿨타임 +1 대신 유산 −1(0 아래로 내려가지 않는다)
  logp(b, 'crit', '사이 행동 — ' + e.n + '이(가) 침묵의 종을 울린다. 몸에 두른 기운이 흩어지고, 손이 무거워진다'); codexHit(b, 'abbot', 'bell');
  e.vow = 1; e.vowTick = b.tick; e.serN = 0; e.intent = { k: 'pray' }; e.teleX = 1; logp(b, 'crit', e.n + '이(가) 입을 다문다'); codexHit(b, 'abbot', 'vow'); abbotCandles(b, e);
}
function abbotTick(b, e, T) {
  if (e.phase === 2) {
    if (e.vow && T - (e.vowTick || 0) >= ABBOT.vowR) {
      const cs = b.en.filter(x => x.role === 'candle' && x.alive); for (const c of cs) { c.alive = false; c.hp = 0; }
      if (cs.length) {
        // 첫 회복은 유지하고 반복 회복만 감쇠해 장기전의 진척을 보존합니다.
        const before = e.hp, n = Math.max(0, (e.vowN || 1) - 1);
        const heal = e.hpMax * ABBOT.candleHeal * cs.length * Math.pow(ABBOT.candleDecay, n);
        e.hp = Math.min(e.hpMax, e.hp + heal); addS(b, e, 'empower', cs.length);
        b.rec.push({ k: 'bossheal', t: r1(b.t), role: e.role, phase: e.phase, source: 'candle', cycle: n + 1, d: r1(e.hp - before) });
        logp(b, 'bad', '남은 촛불 ' + cs.length + '개가 ' + e.n + '에게 스며든다. 생명력 +' + r1(e.hp - before) + ', 강화 ' + cs.length);
      }
      e.vow = 0; e.vowTick = T; e.serN = 0; e.intent = null; e.teleX = 1; decideIntent(b, e); logp(b, 'sys', e.n + '이(가) 입을 열어 설교를 시작한다');
    } else if (!e.vow && T - (e.vowTick || 0) >= ABBOT.sermonR) { e.vow = 1; e.vowTick = T; e.intent = { k: 'pray' }; e.teleX = 1; logp(b, 'sys', e.n + '이(가) 다시 입을 다문다'); abbotCandles(b, e); }
  }
  if (e.phase === 3 && e.altarT != null && (T - e.altarT) > 0 && (T - e.altarT) % ABBOT.stoneEvery === 0) {
    hurtPlayer(b, b.p.hpMax * ABBOT.stoneP, { aoe: 1, label: '무너지는 돌' });
    for (const m of alive(b)) if (m.monk) hurtEnemy(b, m, m.hpMax * ABBOT.stoneM, { dot: 1, label: '무너지는 돌' });
  }
}
function abbotAltar(b, e) {
  e.vow = 0; for (const c of b.en.filter(x => x.role === 'candle' && x.alive)) { c.alive = false; c.hp = 0; }
  e.intent = { k: 'rest' }; e.teleX = 1; e.restNext = 0; e.altarT = b.tick;
  logp(b, 'crit', '사이 행동 — 제단이 무너진다'); codexHit(b, 'abbot', 'altar'); hurtPlayer(b, b.p.hpMax * ABBOT.altar, { aoe: 1, label: '무너지는 제단' });
  const hm = mkEnemy('healer', 0, b.idc++, { lv: e.lv || 1, name: '치유 수도사' }); hm.monk = 1; hm.summoned = true; hm.hpMax = Math.round(e.hpMax * ABBOT.healHp); hm.hp = hm.hpMax;
  const sm = mkEnemy('shield', 0, b.idc++, { lv: e.lv || 1, name: '방패 수도사' }); sm.monk = 1; sm.summoned = true; sm.hpMax = Math.round(e.hpMax * ABBOT.shieldHp); sm.hp = sm.hpMax; sm.brkMax = 100;
  b.en.push(hm, sm); decideIntent(b, hm); decideIntent(b, sm);
  logp(b, 'crit', '무너진 제단에서 수도사들이 일어선다'); codexHit(b, 'abbot', 'monks');
}
/* 보스 단계 최소 체류: 지금 단계에서 한 행동 수와 남은 수. last = 마지막 단계 */
function bossDwell(e) { const D = e && e.role === 'boss' && BOSS_DWELL[e.boss]; if (!D) return null; const ph = e.phase || 1, last = ph >= 3, need = last ? D.last : D.mid, n = (e.phAct || {})[ph] || 0; return { ph, n, need, left: Math.max(0, need - n), last }; }
const bossWait = e => { const w = bossDwell(e); return !!(w && !w.last && w.left); }; // 단계 전환을 아직 미룬다
function bossPhase(b, e) {
  if (e.boss === 'abbot' && e.abNext && bossWait(e)) return; // 최소 체류 전에는 전환하지 않는다
  if (e.boss === 'bardo') { if (!e.bdNext || bossWait(e)) return; e.bdNext = 0; const ph = (e.phase || 1) + 1; e.phase = ph; e.armorOff = 0; logp(b, 'crit', e.n + '의 기세가 바뀐다. ' + ph + '페이즈'); bardoPhaseStep(b, e, ph); return; } // A2 바르도: 문턱(FOE_X.bardo.ph) + 최소 체류
  if (e.boss === 'cryptlord' || e.boss === 'queen') return; // 군주의 페이즈는 문턱에서 lordThrone · lordFall이 넘긴다
  const f = e.hp / e.hpMax; const ph0 = Math.max(e.phase || 1, e.boss === 'abbot' && e.abNext ? (e.phase || 1) + 1 : 0, e.boss === 'abbot' ? (f > 0.65 ? 1 : f > 0.3 ? 2 : 3) : f > 0.7 ? 1 : f > 0.35 ? 2 : 3); // 페이즈는 되돌아가지 않는다(회복해도 수도사가 다시 일어서지 않게)
  const ph = e.boss === 'abbot' ? Math.min(ph0, (e.phase || 1) + 1) : ph0; // 수도원장은 한 번에 한 단계만 넘어간다
  if (e.boss === 'abbot' && ph !== (e.phase || 1)) e.abNext = 0;
  if (e.boss === 'abbot' && ph !== e.phase) {
    if (ph >= 2 && e.phase < 2) abbotBell(b, e);
    if (ph === 3 && e.phase < 3) abbotAltar(b, e);
    e.phase = ph; return;
  }
  if (ph !== e.phase) { e.phase = ph; e.armorOff = 0; /* A0: 갑옷은 단계마다 */ logp(b, 'crit', e.n + '의 기세가 바뀐다. ' + ph + '페이즈' + (e.boss === 'mother' && ph === 2 ? '. 나락의 거울이 열린다' : '')); }
}

