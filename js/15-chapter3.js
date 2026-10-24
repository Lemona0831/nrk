'use strict';
/* ===== 0.8.0 A3 3챕터 「성벽 아래」 (만든 사람 확정 10월 21일, docs/챕터/3챕터.md) =====
   잡몹 행동은 확정본의 패턴대로. 강적 · 보스의 기믹과 대처는 비공개 문서. 값은 data/dungeon.js(ALARM · CHECK3 · SMUG3 · AFFIX3 · CH3X · OATH · ARMOR3 · FOE_X)와
   data/foes.js(예고 문장 · 대답 태그 · 타수 · 갑옷 · 방패). 옛 3챕터(재의 사막)의 엔진은 js/14에 OLD3 깃발로 잠들어 있다.
   흐름의 갈고리: decideIntent(w3Intent · w3StrongIntent · luIntent) · enemyAct(w3Act) · 예고(w3Text · w3Badge) · 피해(w3FoeOut · w3InMul · w3HitMul · w3OutMul) ·
   붕괴(w3BrkMul · w3OnBreak) · 쓰러짐(w3OnKill) · 라운드(w3RoundStart · w3Tick) · 시작(w3Setup) · 행동(w3Actions · w3PlayerAct) · 장치 「경보」(CH_DEVICE[3]) */
function isW3(b) { return !OLD3 && ((b && b.ctx && b.ctx.ch) || 1) === 3; }
const w3RunOf = b => (typeof G !== 'undefined' && G.run && G.run.p === b.p ? G.run : null);
const W3_OBJ = ['bonfire', 'rampart', 'brick', 'barricade'];
const w3Obj = e => W3_OBJ.includes(e.role);
const w3Mates = (b, e) => alive(b).filter(x => x !== e && realFoe(x));
const w3Bonfires = b => b.en.filter(x => x.role === 'bonfire' && x.alive);
const w3Bricks = b => b.en.filter(x => x.role === 'brick' && x.alive && !x.fallen);
const w3Rioters = b => alive(b).filter(x => x.role === 'rioter' && !x.strong);
const w3Lv = (b, e) => (e && e.lv) || (b.ctx && b.ctx.lv) || 1;

/* --- 잠식: 적은 주는 피해 +10%, 나는 받는 피해 +10%(쌓임, 5까지). 3챕터만 --- */
function taintAdd(b, u, n, why) {
  if (!u || !(n > 0)) return 0; if (u === b.p) { const wc = wcOf(b); if (wc) return wcTaint(b, wc, n, why); } /* G-1 강적 시계(비공개 문서 참조) */ const was = u.taint || 0; u.taint = Math.min(CH3X.taintCap, was + n); const g = u.taint - was;
  if (g > 0 && why) logp(b, u === b.p ? 'bad' : 'sys', (u === b.p ? '' : u.n + ' ') + why + '. 잠식 ' + u.taint);
  if (g > 0 && b.rec) b.rec.push({ k: 'taint', who: u === b.p ? 'p' : 'e', n: g });
  return g;
}
/* --- 갑옷 값: 그 층 띠 행동 하나의 피해 × 기본 공격 몫 × 가벼움 · 무거움 (data/dungeon.js ARMOR3) --- */
function w3Armor(b, kind) {
  const fl = (b && b.ctx && b.ctx.floor) || 0, bi = b && b.ctx && b.ctx.boss ? 4 : Math.max(0, HIT_BANDS.findIndex(([a, z]) => fl >= a && fl <= z));
  const R = FOE_HIT_REF[3] && FOE_HIT_REF[3][bi]; return R && ARMOR3[kind] ? Math.max(1, Math.round(R.dmg * ARMOR3.basic * ARMOR3[kind])) : 0;
}

/* --- 의도(decideIntent의 역할 칸) --- */
function w3Intent(b, e, n, al) {
  if (w3Obj(e)) return { k: 'none' };
  const mates = w3Mates(b, e), c = n % 3;
  switch (e.role) {
    case 'wallguard': { if (c === 0) return (e.shield || 0) < 3 ? { k: 'shieldup' } : { k: 'pushback' }; if (c === 1) return { k: 'pushback' }; return mates.some(x => x.role === 'wallguard') ? { k: 'link' } : { k: 'shieldup' }; } // 방패 세우기 → 밀쳐내기 → 대형 잇기
    case 'pike': return c === 0 ? { k: 'attack' } : c === 1 && !bigPending(b, e) ? { k: 'pierce' } : { k: 'pushback' }; // 찌르기 → 꿰뚫기 → 밀어내기
    case 'wallxbow': { if (e.intent && e.intent.k === 'load') return { k: 'salvo', loaded: 1 }; if (c === 0) return bigPending(b, e) ? { k: 'cover' } : { k: 'load' }; return c === 1 ? { k: 'salvo' } : { k: 'cover' }; } // 장전 → 큰 한 발 → 엄폐
    case 'beacon': return c === 0 ? { k: 'firearrow' } : c === 1 ? { k: 'signal' } : { k: 'attack' }; // 불화살 → 봉화 올리기 → 횃불 휘두르기
    case 'rioter': return c === 0 ? { k: 'attack' } : c === 1 ? { k: 'stone' } : { k: 'swarm' }; // 밀치기 → 돌 던지기 → 몰려들기
    case 'smuggler': { if (e.loot) { e.lootAge = (e.lootAge || 0) + 1; return e.lootAge >= 2 ? { k: 'flee' } : { k: 'blackhand' }; } return n % 2 === 0 ? { k: 'steal' } : { k: 'blackhand' }; } // 훔치기 → 검은 손 → (훔쳤으면 2라운드 뒤) 틈으로 빠지기
    case 'medic': { // 꿰매기(잠식된 동료 먼저) → 기도 → 붕대 감기
      const hurt = alive(b).filter(x => realFoe(x) && x.hp < x.hpMax * PRIEST.heal).sort((x, y) => ((y.taint || 0) - (x.taint || 0)) || (x.hp / x.hpMax - y.hp / y.hpMax))[0];
      if (hurt && e.intentPrev !== 'heal') return { k: 'heal', tgt: hurt.id };
      const sick = mates.filter(x => (x.taint || 0) > 0 || KW_BAD.some(k => x.s[k])).sort((x, y) => (y.taint || 0) - (x.taint || 0))[0];
      if (sick && c !== 2) return { k: 'remedy', tgt: sick.id };
      const bt = mates.filter(x => !x.bandR).sort((x, y) => y.dmg - x.dmg)[0]; return bt ? { k: 'bandage', tgt: bt.id } : { k: 'remedy', tgt: (mates[0] || e).id };
    }
    case 'sapper': { // 바리케이드(쓰러진 동료 자리) → 망치질 → 보수
      const bar = alive(b).find(x => x.role === 'barricade');
      if (!bar && (b.w3Fallen || 0) > (b.w3Bars || 0)) return { k: 'barricade' };
      if (bar && (bar.brk > 0 || bar.hp < bar.hpMax) && c !== 1) return { k: 'repair' };
      return c === 0 && !bar && (b.w3Fallen || 0) > 0 ? { k: 'barricade' } : c === 2 && bar ? { k: 'repair' } : { k: 'attack' };
    }
    case 'tainted': { if (c === 1) { const t = mates.sort((x, y) => (y.taint || 0) - (x.taint || 0))[0]; if (t) return { k: 'seep', tgt: t.id }; } return c === 2 ? { k: 'scream' } : { k: 'scratch' }; } // 긁기 → 스며들기 → 비명
    case 'bellman': { const can = b.al && b.al.on && b.al.n < b.al.cap && (b.round || 0) >= 2; if (c === 0 && can) return { k: 'ringalarm' }; const t = mates.filter(x => !x.s.haste).sort((x, y) => y.dmg - x.dmg)[0]; return c === 1 && t ? { k: 'signal2', tgt: t.id } : { k: 'attack' }; } // 종 치기(싸움이 길어지면) → 신호 → 단검
    case 'tenman': { // 대형 → 돌격 명령 → 공격. 필살기 「성벽처럼」은 한 바퀴 뒤 한 번
      if (!e.ultDone && n >= 3 && !bigPending(b, e)) { e.ultDone = 1; return { k: 'likewall' }; }
      return c === 0 && mates.some(x => x.role === 'wallguard') ? { k: 'form3' } : c === 1 ? { k: 'rally' } : { k: 'attack' };
    }
  }
  return null;
}
function w3StrongIntent(b, e, n) {
  const c4 = n % 4, c5 = n % 5, C = e.clk, last = !!(C && !C.perm && C.n >= C.max - 1); // G-1 강적 시계(비공개 문서 참조)
  switch (e.foe) {
    case 'beaconlord': { const L = w3Bonfires(b); if (!e.ultDone && n >= 4 && L.length >= 2 && !bigPending(b, e)) { e.ultDone = 1; return { k: 'pourbeacon', all: 1 }; } if (!L.length) return c5 === 3 ? { k: 'charge' } : { k: 'attack' }; return c5 === 0 || c5 === 1 ? { k: 'pourbeacon' } : c5 === 2 ? { k: 'firerain' } : c5 === 3 ? { k: 'charge' } : { k: 'attack' }; } // G-1 3판: 기름 붓기 둘을 잇는다(비공개 문서 참조)
    case 'siege': { const broken = b.en.some(x => x.role === 'rampart' && !x.alive && x.part); const asm = last ? { k: 'launch' } : { k: 'assemble' }; return c4 === 0 ? asm : c4 === 2 ? (broken ? { k: 'fixram' } : asm) : { k: 'partthrow' }; }
    case 'speaker': return c4 === 0 && w3Rioters(b).length < FOE_X.speaker.cap ? { k: 'rally3' } : c4 === 1 ? { k: 'incite' } : c4 === 2 ? { k: 'shout' } : { k: 'charge' }; // G-1 3판: G-1 전 순환으로(비공개 문서 참조)
    case 'marksman': { if (e.dropT) return { k: 'snipe' }; const c = n % 3; if (last && c !== 2) return { k: 'oneshot' }; return c === 2 ? { k: 'shift' } : { k: 'aimx' }; }
    case 'wallcap': return c4 === 0 && b.en.some(x => x.role === 'brick' && x.fallen) && !(e.wcBareT > (b.tick || 0)) ? { k: 'bricks' } : c4 === 1 ? { k: 'taintwave' } : c4 === 2 ? { k: 'charge' } : { k: 'topple' };
  }
  return null;
}
/* 성벽지기 루(비공개 문서 참조) */
function luIntent(b, e, n) {
  const ph = e.phase || 1, c = n % 4, mins = alive(b).filter(x => x !== e && realFoe(x));
  if (ph === 1) return c === 0 && mins.length < FOE_X.lu.patrol ? { k: 'patrol3' } : c === 1 ? { k: 'charge' } : { k: 'attack' };
  if (ph === 2) { if (c === 0 && !e.noRebuild && !(e.shield > 0)) return { k: 'rebuild' }; if (c === 1 && mins.length) return { k: 'shoveminion', tgt: mins[0].id }; return c === 2 ? { k: 'charge' } : { k: 'attack' }; }
  return { k: 'endure' };
}

/* --- 행동(enemyAct) --- */
function w3Act(b, e, i, d) {
  const p = b.p, tg = () => b.en.find(x => x.id === i.tgt && x.alive), X = FOE_X[e.foe] || FOE_X[e.boss] || {};
  e.linked = null; if (e.formOn) e.formOn = 0;
  switch (i.k) {
    case 'none': return 1;
    case 'shieldup': { e.shield = Math.min(3, (e.shield || 0) + 1); e.shieldMax = Math.max(e.shieldMax || 0, e.shield); logp(b, 'sys', e.n + '이(가) 방패를 세운다. 방패 ' + e.shield + '겹'); return 1; }
    case 'link': { const m = w3Mates(b, e).find(x => x.role === 'wallguard'); if (m) { e.linked = m.id; m.linked = e.id; logp(b, 'sys', e.n + '이(가) ' + m.n + '과(와) 대형을 잇는다. 둘 다 받는 피해 −15%'); } return 1; }
    case 'pushback': { const x = hurtPlayer(b, d * 0.7, { src: e, single: 1, label: e.n + '이(가) 밀어낸다' }); if (x >= 0 && !b.over) { p.pushed = 1; logp(b, 'bad', '밀려났다. 다음 근접 공격 약화'); } return 1; }
    case 'pierce': { hurtPlayer(b, d * 1.4, { src: e, single: 1, charged: 1, label: e.n + '이(가) 꿰뚫는다' }); return 1; }
    case 'load': { logp(b, 'bad', e.n + '이(가) 장전한다. 다음 라운드에 큰 한 발'); return 1; }
    case 'salvo': { const xb = alive(b).filter(x => x.role === 'wallxbow').length; hurtPlayer(b, d * (i.loaded ? 1.6 : 0.9) * (xb >= 2 ? 1.1 : 1), { src: e, single: 1, label: e.n + (i.loaded ? '의 큰 한 발' : '이(가) 쏜다') }); return 1; }
    case 'cover': { e.evading = 1; logp(b, 'sys', e.n + '이(가) 성가퀴 뒤로 몸을 숨긴다'); return 1; }
    case 'firearrow': { const x = hurtPlayer(b, d * 0.6, { src: e, single: 1, label: e.n + '의 불화살' }); if (!b.over) addS(b, p, 'ignite', 2); return 1; }
    case 'signal': { if (b.al && b.al.on) { b.al.next = Math.max((b.tick || 0) + 1, b.al.next - 1); logp(b, 'bad', e.n + '이(가) 봉화를 올린다. 경보가 한 칸 당겨진다'); } else logp(b, 'sys', e.n + '이(가) 봉화를 올린다. 아무도 대답하지 않는다'); return 1; }
    case 'stone': { hurtPlayer(b, d * 0.8, { src: e, single: 1, label: e.n + '이(가) 돌을 던진다' }); return 1; }
    case 'swarm': { const many = w3Rioters(b).length >= 3; hurtPlayer(b, d * (many ? 1.2 : 1), { src: e, single: 1, label: e.n + (many ? '들이 몰려든다' : '이(가) 덤벼든다') }); return 1; }
    case 'blackhand': { const x = hurtPlayer(b, d * 0.6, { src: e, single: 1, label: e.n + '의 검은 손' }); if (x > 0 && !b.over) taintAdd(b, p, 1, '검은 손이 스친다'); return 1; }
    case 'remedy': { const t = tg(); if (t) { if ((t.taint || 0) > 0) { t.taint = 0; logp(b, 'bad', e.n + '이(가) ' + t.n + '의 잠식을 걷어 낸다'); } else { const k = KW_BAD.filter(x => t.s[x]).sort((x, y) => st(t, y) - st(t, x))[0]; if (k) { delete t.s[k]; logp(b, 'bad', e.n + '이(가) ' + t.n + '을(를) 위해 기도한다. ' + (KW_N[k] || k) + ' 지움'); } } } return 1; }
    case 'bandage': { const t = tg(); if (t) { t.bandR = (b.round || 0) + 1; logp(b, 'sys', e.n + '이(가) ' + t.n + '에게 붕대를 감는다. 받는 피해 −20%'); } return 1; }
    case 'barricade': { const w = mkEnemy('barricade', 0, b.idc++, { lv: w3Lv(b, e) }); w.hpMax = w.hp = 9999; w.brkMax = 30; w.summoned = true; w.xpCh = 0; w.intent = { k: 'none' }; w.info = '바리케이드. 뒤의 적이 받는 직접 피해 −50%. 붕괴 한 번에 무너진다.'; b.en.push(w); b.w3Bars = (b.w3Bars || 0) + 1; logp(b, 'bad', e.n + '이(가) 쓰러진 자리에 바리케이드를 쌓는다'); return 1; }
    case 'repair': { const w = alive(b).find(x => x.role === 'barricade'); if (w) { w.brk = 0; logp(b, 'sys', e.n + '이(가) 바리케이드를 고친다'); } return 1; }
    case 'scratch': { const x = hurtPlayer(b, d * 0.7, { src: e, single: 1, label: e.n + '이(가) 긁는다' }); if (x > 0 && !b.over) taintAdd(b, p, 1, '긁힌 자리가 검게 번진다'); return 1; }
    case 'seep': { const t = tg(); if (t) taintAdd(b, t, 2, e.n + '이(가) 스며든다'); return 1; }
    case 'scream': { addS(b, p, 'chill', 1); logp(b, 'bad', e.n + '의 비명. 둔화 1'); return 1; }
    case 'ringalarm': { if (b.al && b.al.on) { b.al.next = Math.max((b.tick || 0) + 1, b.al.next - 3); logp(b, 'crit', e.n + '이(가) 종을 친다. 경보가 3라운드 당겨진다'); } return 1; }
    case 'signal2': { const t = tg(); if (t) { addS(b, t, 'haste', 1); logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 신호한다. 가속 1'); } return 1; }
    case 'form3': { e.formOn = 1; b.formBy = e.id; logp(b, 'sys', e.n + '이(가) 수비병을 양옆에 세운다. 대형'); return 1; }
    case 'rally': { if (!isW3(b)) return 0; for (const x of w3Mates(b, e)) addS(b, x, 'empower', 1); logp(b, 'bad', e.n + '이(가) 돌격 명령을 내린다. 부하 모두 강화 1'); return 1; }
    case 'likewall': { b.likeWallR = (b.round || 0) + 1; logp(b, 'crit', e.n + ': "성벽처럼!" 다음 라운드 무리 모두 방어하고 반격한다'); return 1; }
    /* 강적(비공개 문서 참조) */
    case 'pourbeacon': { // G-1 강적 시계(비공개 문서 참조)
      if (w3ClkStop(b, e)) return 1; const L = w3Bonfires(b).sort((x, y) => x.fuse - y.fuse); let boom = 0;
      for (const f of i.all ? L : L.slice(0, 1)) { if (f.fuse <= 1 && !w3ClkDoomOk(b, e)) { logp(b, 'sys', e.n + '이(가) 기름통을 든 채 봉화를 노려본다'); continue; } f.fuse--; logp(b, 'bad', e.n + '이(가) 봉화에 기름을 붓는다. 남은 칸 ' + Math.max(0, f.fuse)); if (f.fuse <= 0) boom = 1; }
      codexHit(b, 'beaconlord', 'oil'); if (boom) { fcInit(b, e); fcAdd(b, e, e.clk.max - e.clk.n, 'boom'); } else blSync(b, e); return 1; }
    case 'firerain': { const k = w3Bonfires(b).length; if (k) { addS(b, p, 'ignite', k); for (const x of w3Mates(b, e)) if (!w3Obj(x)) addS(b, x, 'ignite', 1); logp(b, 'bad', '불의 비가 내린다. 화상 ' + k); } else logp(b, 'sys', '봉화가 모두 꺼져 불의 비가 그친다'); return 1; }
    case 'assemble': { if (w3Fill(b, e, 1, 'asm') > 0) logp(b, 'bad', e.n + '이(가) 공성추를 맞춘다'); return 1; }
    case 'partthrow': { hurtPlayer(b, d * 0.8, { src: e, single: 1, label: e.n + '이(가) 부품을 던진다' }); return 1; }
    case 'fixram': { const r = b.en.find(x => x.role === 'rampart' && !x.alive && x.part); if (r) { r.alive = true; r.brk = 0; r.hp = r.hpMax; if (r.s.broken) delete r.s.broken; logp(b, 'bad', e.n + '이(가) 부품을 고쳐 끼운다'); } return 1; }
    case 'launch': { fcInit(b, e); if (w3AtWarn(e) && w3Parry(b, e, '날아드는 공성추')) { fcAnswer(b, e, 'parry'); codexHit(b, 'siege', 'deflect'); return 1; } /* 비공개 문서 참조 */ const d0 = e.clk.doomN, r = w3Fill(b, e, 1, 'asm'); if (!r && !e.clk.stop) logp(b, 'sys', e.n + '이(가) 공성추를 붙든 채 노려본다'); else if (r && e.clk.doomN === d0) logp(b, 'bad', e.n + '이(가) 공성추를 맞춘다. 아직 다 맞지 않았다'); return 1; }
    case 'rally3': { let k = 0; for (let j = 0; j < X.call && w3Rioters(b).length < X.cap; j++) { const r = spawn(b, 'rioter'); if (r) { r.xpCh = 0; r.noLoot = 1; k++; } } logp(b, 'bad', e.n + '이(가) 군중을 부른다' + (k ? '. 폭도 ' + k + ' 합류' : '')); w3Fill(b, e, X.loud, 'call'); return 1; } // G-1 3판(비공개 문서 참조)
    case 'incite': { b.incite = (b.incite || 0) + 1; logp(b, 'bad', e.n + '이(가) 선동한다. 폭도의 피해 +' + Math.round(X.incite * b.incite * 100) + '%'); w3Fill(b, e, X.stir, 'call'); return 1; }
    case 'shout': { addS(b, p, 'weak', 1); logp(b, 'bad', e.n + '이(가) 외친다. 약화 1'); w3Fill(b, e, X.stir, 'call'); return 1; }
    case 'aimx': { if (w3Fill(b, e, 1, 'aim') > 0) logp(b, 'bad', e.n + '이(가) 조준한다'); return 1; }
    case 'snipe': { hurtPlayer(b, d, { src: e, single: 1, label: e.n + '의 저격' }); return 1; }
    case 'shift': { e.evading = 1; logp(b, 'sys', e.n + '이(가) 엄폐를 옮긴다'); return 1; }
    case 'oneshot': { fcInit(b, e); if (w3AtWarn(e) && w3Parry(b, e, e.n + '의 한 발')) { fcAnswer(b, e, 'parry'); codexHit(b, 'marksman', 'deflect'); return 1; } /* 비공개 문서 참조 */ const d0 = e.clk.doomN, r = w3Fill(b, e, 1, 'aim'); if (!r && !e.clk.stop) logp(b, 'sys', e.n + '이(가) 시위를 당긴 채 노려본다'); else if (r && e.clk.doomN === d0) logp(b, 'bad', e.n + '이(가) 조준을 다시 맞춘다'); return 1; }
    case 'bricks': { const k = b.en.find(x => x.role === 'brick' && x.fallen); if (k) { k.fallen = 0; k.alive = true; k.brk = 0; k.backT = null; } logp(b, 'bad', e.n + '이(가) 벽돌 하나를 다시 세운다'); codexHit(b, 'wallcap', 'rebuilt'); return 1; }
    case 'taintwave': { taintAdd(b, p, 1, '잠식의 파도가 덮친다'); for (const x of w3Mates(b, e)) if (!w3Obj(x)) taintAdd(b, x, 1, null); return 1; }
    case 'topple': { hurtPlayer(b, d, { src: e, single: 1, label: e.n + '이(가) 벽을 무너뜨린다' }); return 1; }
    /* 성벽지기 루(비공개 문서 참조) */
    case 'patrol3': { for (const r of ['wallguard', 'pike']) { if (alive(b).filter(x => x !== e && realFoe(x)).length >= X.patrol) break; const m = spawn(b, r); if (m) { m.xpCh = 0; m.noLoot = 1; } } logp(b, 'bad', '성벽 위에서 순찰대가 내려온다'); codexHit(b, 'lu', 'patrol'); return 1; }
    case 'rebuild': { e.shield = e.shieldMax = X.bricks; logp(b, 'bad', e.n + '이(가) 무너진 벽돌을 다시 쌓는다. 방패 ' + e.shield + '겹'); codexHit(b, 'lu', 'rebuild'); return 1; }
    case 'shoveminion': { const t = tg(); if (t) { t.guarding = e.id; logp(b, 'bad', e.n + '이(가) ' + t.n + '을(를) 방패로 밀어 세운다'); } return 1; }
    case 'endure': { logp(b, 'sys', e.n + '이(가) 무너지는 벽에 등을 대고 버틴다. 반격하지 않는다'); codexHit(b, 'lu', 'endure'); return 1; }
  }
  return 0;
}
/* ===== G-1 강적 시계: 3챕터 강적 다섯(비공개 문서 참조) =====
   js/25-foe-clock.js보다 먼저 읽히므로 정의는 W3_CLOCK에 두고 w3ClockReg(w3Setup 맨 앞)가 FOE_CLOCK에 넣는다.
   2판 · 3판(봉화대장 · 대변인, 비공개 문서 참조): 칸 수 · 파국 세기 · 평소 공격 · 보상 길이는 data/dungeon.js FOE_X. 결정적 답은 fcAnswer, 평소 되감기는 fcRewind(화면의 수를 비추는 시계만 free, 3판 평소 행동은 ord) */
const w3Blocked = b => fcPStun(b); // S-5(10월 24일): 내가 건 기절은 빼고(js/25)
const w3ClkStop = (b, e) => { const D = fcDef(e); if (!D || !D.blocked || !D.blocked(b, e)) return 0; fcInit(b, e); if (!e.clk.stop) { e.clk.stop = 1; logp(b, 'sys', D.n + ': 멈춰 있다'); } return 1; };
const w3AtWarn = e => { const C = e && e.clk; return !!C && !C.perm && C.n >= C.max - 1; }; // 마지막 경고 칸
const w3ClkDoomOk = (b, e) => { fcInit(b, e); const C = e.clk; return w3AtWarn(e) && (C.wT == null || b.fcNoWait || (b.turnIdx || 0) > C.wT) && !w3ClkStop(b, e); }; // js/25 fcAdd와 같은 기다림
function w3Fill(b, e, k, why) { if (!e || !e.alive || !fcDef(e)) return 0; return fcAdd(b, e, k, why); } // 칸 더하기(마지막 경고 · 경고 뒤 기다림은 js/25 fcAdd)
function w3DoomHit(b, e, frac, o) { // 파국 한 방(비공개 문서 참조)
  const p = b.p; let raw = p.hpMax * frac;
  if (o.parry && p.dodge && p.dodge === e.id) { p.dodge = 0; p.dodgeRed = 0; p.dodgeOn = null; raw *= 0.5; logp(b, 'good', o.label + '을(를) 칼날로 흘린다. 피해 50% 감소'); fxRun(p, 'onParry', b, p, e); chargeEv(b, 'parry'); ysResp(b, '흘리기'); }
  return hurtPlayer(b, raw, { charged: 1, judgment: o.noGuard ? 1 : 0, label: o.label });
}
function w3Parry(b, e, label) { // 그 행동을 흘려 낸다(피해 없음, 비공개 문서 참조)
  const p = b.p; if (!p.dodge || p.dodge !== e.id) return 0; p.dodge = 0; p.dodgeRed = 0; p.dodgeOn = null;
  logp(b, 'good', label + '을(를) 칼날로 흘려 낸다'); fxRun(p, 'onParry', b, p, e); chargeEv(b, 'parry'); ysResp(b, '흘리기'); return 1;
}
/* 평소 되감기(3판, 비공개 문서 참조): 마지막 경고 칸에서도 1칸, 강적마다 한 라운드에 한 번 */
function w3Back(b, e, why) { if (!e || !e.alive || !fcDef(e)) return 0; return fcRewind(b, e, 1, why, { ord: 1 }); } // js/25 fcRewind o.ord
/* 봉화대장(비공개 문서 참조) */
function blSync(b, e) { const X = FOE_X.beaconlord, L = w3Bonfires(b); fcInit(b, e); const C = e.clk, t = L.length ? Math.max(0, Math.min(C.max - 1, X.fuse - Math.min(...L.map(f => f.fuse)))) : 0; if (t > C.n) w3Fill(b, e, t - C.n, 'oil'); else if (t < C.n) fcRewind(b, e, C.n - t, 'out', { free: 1 }); } // 봉화의 남은 칸을 그대로 비춘다
const blHotOf = (b, e, f) => { const C = e.clk; return !!C && w3AtWarn(e) && f && f.role === 'bonfire' && f.fuse <= FOE_X.beaconlord.fuse - C.n; }; // 곧 터질 봉화
function blAnswer(b, e, why, msg) { const X = FOE_X.beaconlord; if (!w3AtWarn(e)) return 0; for (const f of w3Bonfires(b)) f.fuse = X.fuse; logp(b, 'good', msg || '남은 봉화의 불길이 잦아든다'); codexHit(b, 'beaconlord', why === 'brk' ? 'drop' : 'flare'); return fcAnswer(b, e, why); }
function blAllOut(b, e) { if (e.blRew || w3Bonfires(b).length || !b.en.some(x => x.role === 'bonfire' && !x.boomed)) return; e.blRew = 1; e.stun = Math.max(e.stun || 0, 1); addS(b, e, 'ignite', 3); addS(b, e, 'vuln', 2); logp(b, 'good', '마지막 봉화가 무너지며 ' + e.n + '이(가) 불길에 휩싸인다. 화상 3 · 취약'); }
/* 대변인(3판, 비공개 문서 참조): 마지막 경고 칸이면 0칸 · 보상, 아니면 평소 되감기 1칸 */
function spDecide(b, e, why) { if (!e || !e.alive || !fcDef(e)) return 0; fcInit(b, e); if (!w3AtWarn(e)) return w3Back(b, e, why); e.spDec = 1; const r = fcAnswer(b, e, why); e.spDec = 0; return r; }
function spScatter(b, e) { const X = FOE_X.speaker, inc = (b.incite || 0) > 0; b.scatterR = b.round || 0; b.incite = 0; for (const x of w3Rioters(b)) x.stun = Math.max(x.stun || 0, 1); addS(b, e, 'vuln', X.rew); logp(b, 'good', '군중이 흩어진다' + (inc ? '. 선동이 풀린다' : '') + '. ' + e.n + ' 취약'); }
function spGold(b, e) { const X = FOE_X.speaker, run = w3RunOf(b); if (!run || (run.gold || 0) < X.gold) return 0; run.gold -= X.gold; logp(b, 'good', '골드 ' + X.gold + '을(를) 군중 위로 뿌린다'); codexHit(b, 'speaker', 'calm'); if (b.rec) b.rec.push({ k: 'tossgold', n: X.gold }); return spDecide(b, e, 'gold'); }
const spOf = b => alive(b).find(x => x.strong && x.foe === 'speaker' && fcDef(x));
/* 명사수(비공개 문서 참조) */
function mkDrop(b, e) {
  if (!e.dropT) { e.dropT = (b.tick || 0) + FOE_X.marksman.drop; e.row = 'front'; logp(b, 'good', e.n + '이(가) 엄폐를 잃고 성벽 아래로 떨어진다'); codexHit(b, 'marksman', 'drop'); }
  if (e.intent && (e.intent.k === 'aimx' || e.intent.k === 'oneshot')) { e.intent = { k: 'snipe' }; e.teleX = 1; }
}
/* 수비대장(비공개 문서 참조) */
const wcOf = b => b && b.en && b.en.find(x => x.alive && x.strong && x.foe === 'wallcap' && fcDef(x));
function wcSync(b, e) { fcInit(b, e); const C = e.clk, t = Math.max(0, b.p.taint || 0); if (t < C.n) fcRewind(b, e, C.n - t, 'cleanse', { free: 1 }); } // 잠식 수(화면의 잠식 칩)를 그대로 비춘다
function wcClean(b, e, n, why, msg) { // 잠식 걷어 내기: 마지막 경고 칸이면 0, 아니면 n
  const p = b.p; wcSync(b, e); if (!((p.taint || 0) > 0)) return 0;
  if (w3AtWarn(e)) { p.taint = 0; logp(b, 'good', msg + '. 잠식 0'); fcAnswer(b, e, why + '0'); return 1; }
  p.taint = Math.max(0, p.taint - n); logp(b, 'good', msg + '. 잠식 ' + p.taint); wcSync(b, e); return 1;
}
function wcTaint(b, e, n, why) {
  const p = b.p; wcSync(b, e); const C = e.clk, d0 = C.doomN, n0 = C.n; w3Fill(b, e, n, 'taint'); if (C.doomN !== d0) return 0;
  p.taint = C.n; const g = C.n - n0; if (g > 0 && why) logp(b, 'bad', why + '. 잠식 ' + p.taint); if (g > 0 && b.rec) b.rec.push({ k: 'taint', who: 'p', n: g }); return g;
}
const W3_CLOCK = {
  beaconlord: {
    n: '봉화', get max() { return FOE_X.beaconlord.fuse; }, ans: ['brk', 'aoe'],
    warn: () => '기름에 젖은 봉화가 부글거린다. 한 번만 더 부으면 터진다',
    blocked: w3Blocked,
    doom(b, e) {
      const X = FOE_X.beaconlord;
      for (const f of b.en.filter(x => x.role === 'bonfire' && x.alive && x.fuse <= 0)) {
        if (b.over) return; f.alive = false; f.hp = 0; f.boomed = 1; const k = e.blBoom = (e.blBoom || 0) + 1;
        w3DoomHit(b, e, X.boom * Math.pow(X.chain, k - 1), { noGuard: 1, label: '봉화가 터진다' }); codexHit(b, 'beaconlord', 'boom'); if (k > 1) codexHit(b, 'beaconlord', 'chain');
        if (!b.over) w3Ring(b, '봉화가 터지며 종이 울린다');
      }
      if (!b.over) blSync(b, e);
    },
    reward(b, e, why) { if (why !== 'brk' && why !== 'hit') return; const X = FOE_X.beaconlord; addS(b, e, 'ignite', X.rewIg); addS(b, e, 'vuln', X.rew); logp(b, 'good', e.n + '이(가) 불길에 휩싸인다. 화상 ' + X.rewIg + ' · 취약'); },
    on: { // 3판(비공개 문서 참조): 본체 무너뜨리기 · 곧 터질 봉화에 원거리 · 광역. 다른 봉화 부수기는 칸을 옮기지 않는다
      onRoomStart(b, e) { blSync(b, e); },
      onFoeBreak(b, e, x) {
        if (x === e) { if (w3AtWarn(e)) blAnswer(b, e, 'brk', e.n + '이(가) 기름통을 떨어뜨린다. 남은 봉화의 불길이 잦아든다'); return; }
        if (x.role !== 'bonfire') return; if (b.cur && blHotOf(b, e, x)) { e.blHitA = b.actN; blAnswer(b, e, 'hit'); } else blSync(b, e); if (!w3Bonfires(b).length) blAllOut(b, e);
      },
      onHit(b, e, p, x, o) { if (!o || o.dot || !x || x.role !== 'bonfire' || !(o.aoe || !w3Melee(b, o)) || e.blHitA === b.actN || !blHotOf(b, e, x)) return; e.blHitA = b.actN; blAnswer(b, e, 'hit'); },
    },
  },
  siege: {
    n: '공성추', get max() { return FOE_X.siege.max; }, ans: ['parry', 'brk'],
    warn: () => '공성추가 거의 다 맞춰졌다. 다음에 날아든다',
    blocked: w3Blocked,
    doom(b, e) { w3DoomHit(b, e, FOE_X.siege.launch, { noGuard: 1, parry: 1, label: '공성추가 날아든다' }); codexHit(b, 'siege', 'ram'); },
    reward(b, e) { e.stun = Math.max(e.stun || 0, 1); addS(b, e, 'vuln', FOE_X.siege.rew); if (foeAS(b, e).armor > 0) e.armorOff = 1; logp(b, 'good', e.n + '이(가) 공구를 놓는다'); },
    on: { onFoeBreak(b, e, x) { if (x.role === 'rampart' && x.part) fcAnswer(b, e, 'part'); } }, // 발사 예고의 흘리기는 w3Act 'launch'
  },
  speaker: { // 3판(비공개 문서 참조): 시계는 대변인이 부른 수(부르기 · 선동 · 외침). 결정적 답은 대변인 무너뜨리기 · 골드. 폭도 쓰러뜨리기 · 광역은 평소 되감기
    n: '군중', get max() { return FOE_X.speaker.max; }, ans: ['brk', 'gold'],
    warn: () => '군중이 성문 앞에 거의 다 모였다. 한 번만 더 부르면 밀어닥친다',
    blocked: w3Blocked,
    doom(b, e) { w3DoomHit(b, e, FOE_X.speaker.gate, { label: '군중이 성문을 밀고 밀어닥친다' }); codexHit(b, 'speaker', 'gate'); },
    reward(b, e, why) { if (!e.spDec || (why !== 'brk' && why !== 'gold')) return; e.spDec = 0; spScatter(b, e); }, // 결정적 답(마지막 경고 칸)만
    on: {
      onFoeDown(b, e, x) { if (x.role === 'rioter' && !x.strong) w3Back(b, e, 'kill'); },
      onFoeBreak(b, e, x) { if (x === e) spDecide(b, e, 'brk'); },
      onHit(b, e, p, x, o) { if (o && o.aoe && x && x.role === 'rioter' && !x.strong && e.spAoeA !== b.actN) { e.spAoeA = b.actN; w3Back(b, e, 'aoe'); } },
      onAct(b, e, p, id) { if (id === 'tossgold') spGold(b, e); }, // 골드 뿌리기(행동 id는 js/32 switch에 없어 여기서만 처리된다)
    },
  },
  marksman: {
    n: '조준', get max() { return FOE_X.marksman.max; }, ans: ['parry', 'brk', 'ranged', 'aoe'],
    warn: () => '시위가 끝까지 당겨졌다. 표적이 고정됐다. 다음은 한 발이다',
    blocked: w3Blocked,
    doom(b, e) { w3DoomHit(b, e, FOE_X.marksman.shot, { noGuard: 1, parry: 1, label: e.n + '의 한 발' }); codexHit(b, 'marksman', 'shot'); },
    reward(b, e, why) { if (why !== 'shake') mkDrop(b, e); }, // 한 발 예고의 흘리기는 w3Act 'oneshot'
    on: {
      onFoeBreak(b, e, x) { if (x === e && e.dropT) fcAnswer(b, e, 'drop'); },
      onHit(b, e, p, x, o) {
        if (x !== e || !o || !(o.aoe || !w3Melee(b, o)) || e.mkHitA === b.actN || !e.clk.n) return; e.mkHitA = b.actN;
        if (w3AtWarn(e)) { e.mkHits = 0; if (fcAnswer(b, e, 'hit')) logp(b, 'good', e.n + '의 조준이 흐트러진다'); return; }
        e.mkHits = (e.mkHits || 0) + 1; if (e.mkHits >= 2) { e.mkHits = 0; if (fcRewind(b, e, 1, 'shake')) logp(b, 'good', e.n + '의 조준이 흔들린다'); }
      },
    },
  },
  wallcap: {
    n: '잠식', get max() { return FOE_X.wallcap.max; }, ans: ['cons', 'brk'],
    warn: () => '성벽이 몸 안까지 스며들었다. 한 칸만 더 차면 성벽에 묻힌다',
    blocked: w3Blocked,
    doom(b, e) { const p = b.p; p.taint = 0; w3DoomHit(b, e, FOE_X.wallcap.fall, { label: '성벽이 무너져 나를 덮친다' }); if (!b.over) { p.stun = Math.max(p.stun || 0, 1); p.stunSelf = 0; logp(b, 'bad', '성벽에 묻혀 움직일 수 없다'); } codexHit(b, 'wallcap', 'buried'); },
    reward(b, e, why) {
      const X = FOE_X.wallcap;
      if (why === 'clean0' || why === 'brick0') { addS(b, e, 'vuln', X.rew); logp(b, 'good', '성벽이 흔들린다. ' + e.n + ' 취약'); codexHit(b, 'wallcap', 'shaken'); return; }
      if (why !== 'bricks') return; e.wcBareT = (b.tick || 0) + X.bare; if (foeAS(b, e).armor > 0 && !e.armorOff) { e.armorOff = 1; e.wcArm = 1; } addS(b, e, 'vuln', 2); logp(b, 'good', '벽돌이 모두 무너져 ' + e.n + '이(가) 드러난다. 갑옷 벗겨짐 · 취약 2');
    },
    on: {
      onRoomStart(b, e) { fcInit(b, e); const t = b.p.taint || 0; if (t > e.clk.n) w3Fill(b, e, t - e.clk.n, 'taint'); b.p.taint = e.clk.n; },
      onRoundEnd(b, e) {
        wcSync(b, e); if (e.wcArm && (b.tick || 0) >= (e.wcBareT || 0)) { e.wcArm = 0; if (!e.s.broken) e.armorOff = 0; }
        if (w3Bricks(b).length) taintAdd(b, b.p, 1, '성벽이 몸에 스며든다');
      },
      onFoeAct(b, e) { wcSync(b, e); },
      onFoeBreak(b, e, x) {
        if (x === e) e.wcArm = 0; /* 무너져 벗겨진 갑옷은 그 전투 동안 */ if (x.role !== 'brick') return;
        wcClean(b, e, FOE_X.wallcap.brickBack, 'brick', '벽돌이 무너지며 몸에 스민 성벽이 빠져나간다'); if (!w3Bricks(b).length) W3_CLOCK.wallcap.reward(b, e, 'bricks');
      },
      onFlask(b, e, p, kind) { if (kind === 'mana') wcClean(b, e, FOE_X.wallcap.clean, 'clean', '정화 플라스크가 잠식을 걷어 낸다'); },
      onSkill(b, e, p, act) { const fx = (act && ((act.s && act.s.fx) || act.fx)) || []; if (fx.some(f => f.k === 'cleanse')) wcClean(b, e, FOE_X.wallcap.clean, 'clean', '정화가 잠식을 걷어 낸다'); },
      onAct(b, e) { wcSync(b, e); },
    },
  },
};
function w3ClockReg() { if (typeof FOE_CLOCK !== 'undefined') for (const k in W3_CLOCK) FOE_CLOCK[k] = W3_CLOCK[k]; }
/* 증원 하나(경보 · 경보수 접사 · 봉화): 성벽 위에서 잡몹이 내려온다 */
function w3Ring(b, why) {
  const fl = (b.ctx && b.ctx.floor) || 0; const role = fl <= 3 ? 'rioter' : 'pike';
  const e = spawn(b, role); if (!e) return null; e.xpCh = 0; e.noLoot = 1; e.reinf = 1;
  { const D = diffOf(3)[isLower(fl) ? 'lower' : 'upper']; e.dmg *= D.dmg; }
  logp(b, 'crit', (why || '경보 종이 울린다') + '. 성벽 위에서 ' + e.n + '이(가) 내려온다'); if (b.rec) b.rec.push({ k: 'alarm', n: b.al ? b.al.n : 0 }); if (typeof sfxPlay === 'function') sfxPlay('b_big');
  return e;
}
/* --- 피해 배율 --- */
function w3FoeOut(b, e) { // 적이 주는 피해(enemyHitEst)
  let m = 1 + CH3X.taint * (e.taint || 0);
  if (e.role === 'rioter' && b.incite) m *= 1 + FOE_X.speaker.incite * b.incite;
  return m;
}
function w3InMul(b, o) { // 내가 받는 피해
  const p = b.p; let m = 1 + CH3X.taint * (p.taint || 0);
  if (hasBt(p, 'petition')) m *= 0.9;
  return m;
}
const w3Melee = (b, o) => !o.aoe && !o.dot && !['hunter', 'elementalist'].includes(b.p.build) && !(b.cur && b.cur.skill && SK2[b.cur.id] && SK2[b.cur.id].tgt === 'ranged');
function w3HitMul(b, e, o) { // 적이 받는 피해
  let m = 1;
  if (hasMod(b, 'wall') && e.row === 'back' && !o.dot) m *= 1 - CH3X.wallCover;
  if (e.linked && alive(b).some(x => x.id === e.linked)) m *= 0.85;
  if (e.role === 'wallguard' && alive(b).some(x => x.formOn && x.id === b.formBy)) m *= 0.8;
  if (!e.form3 && alive(b).some(x => x !== e && x.form3 && realFoe(x))) m *= 1 - AFFIX3.form;
  if (e.bandR && e.bandR >= (b.round || 0)) m *= 0.8;
  if (e.row === 'back' && !o.aoe && !o.dot && alive(b).some(x => x.role === 'barricade')) m *= 0.5;
  if (b.likeWallR === b.round && realFoe(e) && !o.dot) { m *= 0.5; if (b.cur && !o.ctr && !b.over && b.lwCtrA !== b.actN) { b.lwCtrA = b.actN; hurtPlayer(b, e.dmg * 0.4, { src: e, single: 1, label: e.n + '이(가) 성벽처럼 받아치는 반격' }); } }
  if (e.foe === 'speaker' && w3Rioters(b).length >= FOE_X.speaker.need && b.scatterR !== b.round && b.scatterR !== (b.round || 0) - 1) { m *= 1 - FOE_X.speaker.cut; codexHit(b, 'speaker', 'crowd'); }
  if (e.foe === 'marksman' && !e.dropT && w3Melee(b, o)) { m *= FOE_X.marksman.melee; codexHit(b, 'marksman', 'cover'); }
  if (e.foe === 'marksman' && e.dropT) m *= FOE_X.marksman.dropHit;
  if (e.foe === 'wallcap' && w3Bricks(b).length) { m *= 1 - FOE_X.wallcap.cut; codexHit(b, 'wallcap', 'bricks'); }
  if (e.boss === 'lu' && e.intent && e.intent.k === 'rebuild') m *= 1.3;
  return m;
}
function w3OutMul(b, e, o) { // 내가 주는 피해
  const p = b.p; let m = 1;
  if (p.pushed && w3Melee(b, o)) { m *= 0.75; p.pushed = 0; }
  const run = w3RunOf(b); if (run && run.dg && run.dg.inner) m *= 1 + SMUG3.inner.dmg;
  return m;
}
function w3BrkMul(b, e) {
  let m = 1;
  if (e.strong && w3AtWarn(e) && (e.foe === 'speaker' || (e.foe === 'beaconlord' && e.intent && e.intent.k === 'pourbeacon'))) m *= FOE_X[e.foe].brkWarn || 1; // G-1 3판(비공개 문서 참조)
  if (e.intent && ((e.role === 'wallxbow' && e.intent.k === 'load') || (e.foe === 'marksman' && (e.intent.k === 'aimx' || e.intent.k === 'oneshot')))) m *= FOE_X.marksman.brkAim;
  return m;
}
/* --- 라운드 --- */
function w3RoundStart(b) {
  const p = b.p; if ((b.round || 0) >= 2 && p.noFast1) p.noFast1 = 0;
  if (hasMod(b, 'mob3') && (b.mobN || 0) < CH3X.mobCap && (b.rngF || Math.random)() < CH3X.mobP) {
    const r = spawn(b, 'rioter'); if (r) { b.mobN = (b.mobN || 0) + 1; r.xpCh = 0; r.noLoot = 1; r.row = 'front'; if (b.mobFirst) r.quick = 1; if (b.queue) { b.queue.push(r.id); b.roundAll.push(r.id); } logp(b, 'bad', '천막 사이로 ' + r.n + '이(가) 밀려든다' + (b.mobFirst ? '. 당신을 먼저 노린다' : '')); }
  }
}
function w3Tick(b, T) {
  const p = b.p;
  if (hasMod(b, 'rift') && !b.riftSealed) { const L = alive(b).filter(x => realFoe(x) && !w3Obj(x) && (x.taint || 0) < CH3X.taintCap); if (L.length) { const t = L[Math.floor((b.rngF || Math.random)() * L.length)]; taintAdd(b, t, 1, '틈에서 스민 것이 달라붙는다'); } }
  for (const e of alive(b)) if (e.selfTaint && realFoe(e)) taintAdd(b, e, 1, null);
  if (hasMod(b, 'rockfall') && T % CH3X.rockEvery === 0) { const brk = alive(b).some(x => x.s.broken && realFoe(x)); logp(b, 'sys', '성벽 위에서 돌이 떨어진다' + (brk ? '. 무너진 적 쪽으로만' : '')); if (!brk) hurtPlayer(b, CH3X.rock, { aoe: 1, label: '낙석' }); for (const e of alive(b).slice()) if (realFoe(e)) hurtEnemy(b, e, CH3X.rock, { aoe: 1, label: '낙석' }); if (b.over) return; }
  for (const e of alive(b)) { if (e.dropT && T >= e.dropT) { e.dropT = 0; e.row = 'back'; logp(b, 'sys', e.n + '이(가) 다시 성벽 위 엄폐로 올라간다'); } }
  for (const k of b.en.filter(x => x.role === 'brick' && x.fallen && x.backT && T >= x.backT)) { k.fallen = 0; k.alive = true; k.brk = 0; k.backT = null; logp(b, 'bad', '무너진 벽돌이 다시 선다'); codexHit(b, 'wallcap', 'rebuilt'); }
  if (b.likeWallR && b.likeWallR < T + 1 && b.likeWallR <= T) b.likeWallR = 0;
}
/* --- 전투 시작 --- */
function w3Setup(b, room) {
  w3ClockReg(); // G-1 강적 시계(js/25가 뒤에 읽히므로 여기서 넣는다)
  const p = b.p, en = b.en, run = w3RunOf(b), dg = (run && run.dg) || {};
  for (const k of room.form || []) if (en[k]) en[k].form3 = 1;
  for (const k of room.taintA || []) if (en[k]) en[k].selfTaint = 1;
  for (const k of room.bellA || []) if (en[k]) en[k].bellA = 1;
  p.taint = 0; p.pushed = 0; p.noFast1 = room.noQuick ? 1 : 0;
  if (hasMod(b, 'wall')) { let f = 0; for (const e of en) if (e.row === 'front' && e.role !== 'boss') { f++; if (f > 2) e.row = 'back'; } }
  if (hasMod(b, 'rift') && dg.wellTaint) taintAdd(b, p, 1, '우물물이 몸 안에서 일렁인다');
  if (dg.inner) taintAdd(b, p, 1, '안쪽의 물건이 차갑다');
  if (room.mobFirst) b.mobFirst = 1;
  /* 강적 · 보스(비공개 문서 참조) */
  const lv = room.lv || 1, sF = room.strong ? en[0] : null;
  if (sF && room.foe === 'beaconlord') for (let i = 0; i < FOE_X.beaconlord.fires; i++) { const f = mkEnemy('bonfire', 0, 80 + i, { lv }); f.hpMax = f.hp = 9999; f.brkMax = FOE_X.beaconlord.brk; f.summoned = true; f.xpCh = 0; f.fuse = FOE_X.beaconlord.fuse; f.intent = { k: 'none' }; f.info = '봉화. 붕괴 게이지가 차면 부서진다.'; en.push(f); }
  if (sF && room.foe === 'beaconlord' && typeof decideIntent === 'function') decideIntent(b, sF); // G-1 2판: 첫 예고를 봉화가 선 뒤에 다시 고른다(비공개 문서 참조)
  if (sF && room.foe === 'siege') { for (let i = 0; i < FOE_X.siege.parts; i++) { const f = mkEnemy('rampart', 0, 80 + i, { lv }); f.hpMax = f.hp = 9999; f.brkMax = FOE_X.siege.partBrk; f.summoned = true; f.xpCh = 0; f.part = 1; f.intent = { k: 'none' }; f.info = '공성추 부품. 붕괴 게이지가 차면 부서진다.'; en.push(f); } }
  if (sF && room.foe === 'marksman') sF.row = 'back';
  { const A = sF && FOE_X[room.foe] && FOE_X[room.foe].atk; if (A && A !== 1) { sF.dmg *= A; if (sF.bigMul) sF.bigMul /= A; } } // G-1(비공개 문서 참조)
  if (sF && room.foe === 'wallcap') for (let i = 0; i < FOE_X.wallcap.bricks; i++) { const f = mkEnemy('brick', 0, 80 + i, { lv }); f.hpMax = f.hp = 9999; f.brkMax = FOE_X.wallcap.brk; f.summoned = true; f.xpCh = 0; f.intent = { k: 'none' }; f.info = '벽돌. 붕괴 게이지가 차면 무너진다.'; en.push(f); }
  if (room.ramHit) { for (const e of en) if (e.row === 'front' && realFoe(e) && !w3Obj(e)) { addBreak(b, e, 40); hurtEnemy(b, e, 6, { aoe: 1, label: '굴러온 공성추' }); } logp(b, 'good', '끊어진 밧줄 끝에서 공성추가 굴러 들어간다'); }
  /* 장치 「경보」: 강적 · 보스 · 검문소 거절 싸움은 경보 없음 */
  const on = !room.strong && !room.boss && !room.noAlarm && !(dg.noAlarm > 0);
  const first = room.alarmNow ? 1 : Math.max(1, (room.path === 'rough' ? ALARM.rough : ALARM.first) + (room.alarmShift || 0));
  b.al = { on, next: first, n: 0, cap: ALARM.cap, delayed: 0, quiet: !room.strong && !room.boss && !room.noAlarm && dg.noAlarm > 0 }; // quiet: 떼어 낸 종 때문에 쉰 방(M8: 그런 방마다 하나씩 센다)
  if (on) { const L = en.filter(e => realFoe(e) && !w3Obj(e)); const hp = e => ((foeDef(b, e) || {}).hits || {}).hp || 0; const mk = L.slice().sort((x, y) => (y.elite - x.elite) || (hp(y) - hp(x)) || ((x.row === 'front' ? 0 : 1) - (y.row === 'front' ? 0 : 1)))[0]; if (mk) { b.bellMark = mk.id; mk.bellMark = 1; } }
  if (room.alarmNow) logp(b, 'bad', '들켰다. 경보 종이 처음부터 울린다');
}
/* --- 무너짐 · 쓰러짐 --- */
function w3OnBreak(b, e) {
  if (e.role === 'bonfire') { e.alive = false; e.hp = 0; logp(b, 'good', '봉화가 부서진다. 다시 켜지지 않는다'); codexHit(b, 'beaconlord', 'out'); return; }
  if (e.role === 'rampart') { e.alive = false; e.hp = 0; logp(b, 'good', '부품이 부서진다'); codexHit(b, 'siege', 'part'); return; }
  if (e.role === 'brick') { e.fallen = 1; e.alive = false; e.brk = 0; e.backT = (b.tick || 0) + FOE_X.wallcap.back; logp(b, 'good', '벽돌이 무너진다'); return; }
  if (e.role === 'barricade') { e.alive = false; e.hp = 0; logp(b, 'good', '바리케이드가 무너진다'); return; }
  if (e.foe === 'marksman' && ((e.intent && (e.intent.k === 'aimx' || e.intent.k === 'oneshot')) || (e.clk && e.clk.n > 0))) { e.dropT = (b.tick || 0) + FOE_X.marksman.drop; e.row = 'front'; logp(b, 'good', e.n + '이(가) 엄폐가 깨져 성벽 아래로 떨어진다'); codexHit(b, 'marksman', 'drop'); }
  if (e.foe === 'speaker') { b.scatterR = b.round; logp(b, 'good', '대변인이 무너지자 군중이 흩어진다'); codexHit(b, 'speaker', 'scatter'); }
  if (e.boss === 'lu' && e.intent && e.intent.k === 'rebuild') { e.noRebuild = 1; logp(b, 'good', '쌓던 벽돌이 무너진다. 다시 쌓지 못한다'); }
}
function w3OnKill(b, e) {
  if (w3Obj(e)) return;
  if (!e.reinf && !e.summoned) b.w3Fallen = (b.w3Fallen || 0) + 1;
  if ((e.taint || 0) > 0 && (hasMod(b, 'rift') || e.role === 'tainted')) { const t = alive(b).filter(x => realFoe(x) && !w3Obj(x))[0]; if (t) taintAdd(b, t, e.taint, e.n + '의 잠식이 옮는다'); }
  if (e.bellA && b.al && b.al.on && b.al.n < b.al.cap) { b.al.n++; w3Ring(b, e.n + '이(가) 쓰러지며 종을 친다'); }
  if (e.boss === 'lu') { for (const x of alive(b)) if (x !== e) { x.alive = false; x.hp = 0; } if (FOES.lu.log.line) logp(b, 'crit', e.n + ': ' + FOES.lu.log.line); if (FOES.lu.log.down) logp(b, 'sys', FOES.lu.log.down); }
  if (e.foe === 'speaker') for (const x of w3Rioters(b)) { x.alive = false; x.hp = 0; x.summoned = true; }
}
/* --- 루 단계 전환(문턱 FOE_X.lu.ph + 최소 체류) --- */
function luPhaseStep(b, e, ph) {
  if (ph === 2) logp(b, 'crit', e.n + '이(가) 무너진 성벽을 돌아본다');
  if (ph === 3) { e.shield = 0; for (const x of alive(b)) if (x !== e && realFoe(x)) x.guarding = null; logp(b, 'crit', e.n + '이(가) 무너지는 벽에 등을 댄다'); }
}
/* --- 플레이어 행동: 틈 막기 --- */
function w3Actions(b, L) {
  if (hasMod(b, 'rift') && !b.riftSealed) L.push({ id: 'sealrift', n: '틈을 막는다', self: 1, cost: '행동 하나', time: 1, ok: true, d: '성벽 틈을 막는다. 이 방에서 잠식이 더 번지지 않는다.' });
  { const sp = spOf(b), C = sp && sp.clk; if (C && C.n > 0 && !C.perm) { const X = FOE_X.speaker, run = w3RunOf(b), g = run ? run.gold || 0 : 0, can = w3AtWarn(sp) || C.backR !== (b.round || 0); L.push({ id: 'tossgold', n: '골드 뿌리기', self: 1, cost: '골드 ' + X.gold, time: 1, ok: g >= X.gold && can, why: g < X.gold ? '골드가 모자랍니다' : can ? null : '지금은 아무도 돌아보지 않는다', d: '골드 ' + X.gold + '을(를) 군중 위로 뿌린다.' }); } } // G-1 3판(비공개 문서 참조). 처리는 W3_CLOCK.speaker.on.onAct
}
function w3PlayerAct(b, id) { if (id === 'sealrift') { b.riftSealed = 1; logp(b, 'good', '돌을 끼워 틈을 막는다. 검은 것이 더 스미지 않는다'); if (b.rec) b.rec.push({ k: 'sealrift' }); return 1; } return 0; }
/* --- 장치 「경보」(CH_DEVICE[3]) --- */
const ALARM_DEV = {
  id: 'alarm', n: '경보', help: '싸움이 길어지면 성벽이 듣습니다. 4라운드째가 끝날 때 경보 종이 울려 성벽 위에서 일반 적 하나가 내려오고, 그 뒤 3라운드마다 하나 더(셋까지). 망루 길은 한 라운드 빠릅니다. 강적 · 보스 방에는 경보가 없습니다. 종 표식이 붙은 적을 무너뜨리면 경보가 한 라운드 늦어집니다(전투마다 한 번).',
  chip: b => { const a = b.al; const t = (a && a.on ? (a.n >= a.cap ? '🔔 다 울림' : '🔔 ' + a.next + '라운드 끝') : '') + ((b.p.taint || 0) > 0 ? (a && a.on ? ' · ' : '') + '잠식 ' + b.p.taint : ''); return t; },
  onRoundEnd(b) {
    const a = b.al; if (!a || !a.on || b.over || a.n >= a.cap) return;
    if ((b.tick || 0) >= a.next) { a.n++; a.next = (b.tick || 0) + ALARM.every; w3Ring(b, '경보 종이 울린다'); }
  },
  onFoeBreak(b, e) { w3BellDelay(b, e); },
  onFoeDown(b, e) { w3BellDelay(b, e); },
  onRoomEnd(b, over) {
    const run = w3RunOf(b), p = b.p; p.taint = 0; p.noFast1 = 0; p.pushed = 0;
    if (!run || !run.dg) return; const dg = run.dg;
    if (b.al && b.al.on && b.al.n > 0) dg.alSt = (dg.alSt || 0) + 1;
    if (b.al && b.al.quiet && dg.noAlarm > 0) dg.noAlarm--; // M8 버그 고침: 전에는 경보가 켜진 방에서만 줄여, 종을 떼면 챕터 끝까지 경보가 꺼졌다(문장은 「다음 2개 방」)
    if (b.flareUsed) dg.alNext = (dg.alNext || 0) - ALARM.flareNext;
  },
};
function w3BellDelay(b, e) { const a = b.al; if (!a || !a.on || a.delayed || !b.bellMark || e.id !== b.bellMark) return; a.delayed = 1; a.next += 1; logp(b, 'good', '종 표식이 붙은 ' + e.n + '이(가) 무너졌다. 경보가 한 라운드 늦어진다'); if (b.rec) b.rec.push({ k: 'bellDelay' }); }
CH_DEVICE[3] = ALARM_DEV;
/* --- 예고 문장 · 아이콘(intentText0 · intentBadge0) --- */
function w3Text(b, e, i, est) {
  const tn = w => { const t = b.en.find(x => x.id === i.tgt); return t ? t.n : teleW(w); }, lv = w3Lv(b, e), X = FOE_X[e.foe] || FOE_X[e.boss] || {};
  switch (i.k) {
    case 'shieldup': case 'link': case 'load': case 'cover': case 'signal': case 'scream': case 'ringalarm': case 'form3': case 'likewall': case 'pourbeacon': case 'assemble': case 'fixram': case 'rally3': case 'incite': case 'shout': case 'shift': case 'bricks': case 'taintwave': case 'patrol3': case 'rebuild': case 'endure': case 'barricade': case 'repair': return teleFill(b, e, i.k, { lest: r1(est * 1.6) });
    case 'pierce': return teleFill(b, e, 'pierce', { pest: r1(est * 1.4) });
    case 'pushback': return teleFill(b, e, 'pushback', { est: r1(est * 0.7) });
    case 'salvo': return teleFill(b, e, 'salvo', { est: r1(est * (i.loaded ? 1.6 : 0.9)) });
    case 'firearrow': return teleFill(b, e, 'firearrow', { est: r1(est * 0.6), fi: 2 });
    case 'stone': return teleFill(b, e, 'stone', { est: r1(est * 0.8) });
    case 'swarm': return teleFill(b, e, 'swarm', { est: r1(est * (w3Rioters(b).length >= 3 ? 1.2 : 1)) });
    case 'blackhand': return teleFill(b, e, 'blackhand', { est: r1(est * 0.6) });
    case 'scratch': return teleFill(b, e, 'scratch', { est: r1(est * 0.7) });
    case 'bandage': case 'seep': case 'signal2': case 'shoveminion': return teleFill(b, e, i.k, { tgt: tn('w_mate') });
    case 'remedy': if (!isW3(b)) return null; return teleFill(b, e, 'remedy', { tgt: tn('w_mate') });
    case 'firerain': return teleFill(b, e, 'firerain', { fr: w3Bonfires(b).length });
    case 'partthrow': return teleFill(b, e, 'partthrow', { est: r1(est * 0.8) });
    case 'launch': return teleFill(b, e, 'launch', { lest: r1(b.p.hpMax * X.launch) });
    case 'aimx': return teleFill(b, e, 'aimx', { aims: ((e.clk && e.clk.n) || 0) + 1 });
    case 'snipe': return teleFill(b, e, 'snipe', { est: r1(est) });
    case 'oneshot': return teleFill(b, e, 'oneshot', { sest: r1(b.p.hpMax * X.shot) });
    case 'topple': return teleFill(b, e, 'topple', { est: r1(est) });
  }
  return null;
}
function w3Badge(b, e, i, est, capOf) {
  const tn = () => { const t = b.en.find(x => x.id === i.tgt); return t ? t.n : ''; }, lv = w3Lv(b, e), X = FOE_X[e.foe] || FOE_X[e.boss] || {};
  switch (i.k) {
    case 'none': if (w3Obj(e)) return { ico: e.ico, num: '', txt: e.role === 'bonfire' ? '봉화' : e.role === 'rampart' ? '부품' : e.role === 'brick' ? '벽돌' : '바리케이드', cls: '' }; return null;
    case 'shieldup': return { ico: '🛡️', num: '', txt: '방패 세우기 +1겹', cls: 'sup' };
    case 'link': return { ico: '🛡️', num: '', txt: '대형 잇기', cls: 'sup' };
    case 'pushback': return { ico: '🤚', num: r1(capOf(est * 0.7)), txt: '밀어내기', cls: 'atk' };
    case 'pierce': return { ico: '🔱', num: r1(capOf(est * 1.4)), txt: '꿰뚫기', cls: 'hv' };
    case 'load': return { ico: '🏹', num: '', txt: '장전 · 다음 큰 한 발', cls: 'hv' };
    case 'salvo': return { ico: '🏹', num: r1(capOf(est * (i.loaded ? 1.6 : 0.9))), txt: i.loaded ? '큰 한 발' : '사격', cls: i.loaded ? 'hv' : 'atk' };
    case 'cover': return { ico: '🧱', num: '', txt: '엄폐', cls: 'sup' };
    case 'firearrow': return { ico: '🔥', num: r1(capOf(est * 0.6)), txt: '불화살 · 화상 2', cls: 'atk' };
    case 'signal': return { ico: '🔥', num: '', txt: '봉화 · 경보 당김', cls: 'warn' };
    case 'stone': return { ico: '🪨', num: r1(capOf(est * 0.8)), txt: '돌 던지기', cls: 'atk' };
    case 'swarm': return { ico: '✊', num: r1(capOf(est * (w3Rioters(b).length >= 3 ? 1.2 : 1))), txt: '몰려들기', cls: 'atk' };
    case 'blackhand': return { ico: '🫳', num: r1(capOf(est * 0.6)), txt: '검은 손 · 잠식 1', cls: 'atk' };
    case 'remedy': if (!isW3(b)) return null; return { ico: '🙏', num: '', txt: '기도 → ' + tn(), cls: 'sup' };
    case 'bandage': return { ico: '🩹', num: '', txt: '붕대 → ' + tn(), cls: 'sup' };
    case 'barricade': return { ico: '🪵', num: '', txt: '바리케이드', cls: 'sup' };
    case 'repair': return { ico: '🪵', num: '', txt: '보수', cls: 'sup' };
    case 'scratch': return { ico: '🌑', num: r1(capOf(est * 0.7)), txt: '긁기 · 잠식 1', cls: 'atk' };
    case 'seep': return { ico: '🌑', num: '', txt: '스며들기 → ' + tn(), cls: 'warn' };
    case 'scream': return { ico: '🌑', num: '', txt: '비명 · 둔화 1', cls: 'warn' };
    case 'ringalarm': return { ico: '🔔', num: '', txt: '종 치기 · 경보 3라운드 당김', cls: 'hv' };
    case 'signal2': return { ico: '🔔', num: '', txt: '신호 → ' + tn(), cls: 'sup' };
    case 'form3': return { ico: '🛡️', num: '', txt: '대형', cls: 'sup' };
    case 'likewall': return { ico: '🏰', num: '', txt: '성벽처럼', cls: 'hv' };
    case 'pourbeacon': return { ico: '🛢️', num: '', txt: i.all ? '세 봉화' : '기름 붓기', cls: 'hv' };
    case 'firerain': return { ico: '🔥', num: '', txt: '불의 비 · 화상 ' + w3Bonfires(b).length, cls: 'hv' };
    case 'assemble': return { ico: '⚙️', num: '', txt: '조립', cls: 'warn' };
    case 'partthrow': return { ico: '⚙️', num: r1(capOf(est * 0.8)), txt: '부품 던지기', cls: 'atk' };
    case 'fixram': return { ico: '⚙️', num: '', txt: '수리', cls: 'sup' };
    case 'launch': return { ico: '🪵', num: r1(b.p.hpMax * X.launch), txt: '공성추 발사', cls: 'hv' };
    case 'rally3': return { ico: '📣', num: '', txt: '군중 부르기', cls: 'sup' };
    case 'incite': return { ico: '📣', num: '', txt: '선동', cls: 'warn' };
    case 'shout': return { ico: '📣', num: '', txt: '외침 · 약화 1', cls: 'warn' };
    case 'aimx': return { ico: '🎯', num: ((e.clk && e.clk.n) || 0) + 1, txt: '조준', cls: 'hv' };
    case 'snipe': return { ico: '🏹', num: r1(capOf(est)), txt: '저격', cls: 'atk' };
    case 'shift': return { ico: '🧱', num: '', txt: '엄폐 옮기기', cls: 'sup' };
    case 'oneshot': return { ico: '🎯', num: r1(b.p.hpMax * X.shot), txt: '한 발', cls: 'hv' };
    case 'bricks': return { ico: '🧱', num: '', txt: '벽돌 세우기', cls: 'sup' };
    case 'taintwave': return { ico: '🌑', num: '', txt: '잠식 파도', cls: 'warn' };
    case 'topple': return { ico: '🧱', num: r1(capOf(est)), txt: '무너뜨리기', cls: 'atk' };
    case 'patrol3': return { ico: '🏰', num: '', txt: '순찰대 부르기', cls: 'sup' };
    case 'rebuild': return { ico: '🧱', num: '', txt: '벽돌 다시 쌓기', cls: 'sup' };
    case 'shoveminion': return { ico: '🛡️', num: '', txt: '부하를 방패로 → ' + tn(), cls: 'sup' };
    case 'endure': return { ico: '🏰', num: '', txt: '버티기', cls: 'sup' };
  }
  return null;
}
/* 적 카드 칩(js/53 foeASHtml): 잠식 · 종 표식 · 봉화 칸 · 물체 붕괴(강적 시계 칩은 js/25 fcChip) */
function w3CardChips(b, e) {
  let h = '';
  if ((e.taint || 0) > 0) h += '<span class="ftaint" aria-label="잠식 ' + e.taint + '">🌑<b>' + e.taint + '</b></span>';
  if (e.bellMark && b.al && b.al.on && !b.al.delayed) h += '<span class="fbell" data-info="chdev" aria-label="종 표식">🔔 표식</span>';
  if (e.role === 'bonfire') h += '<span class="ffuse" aria-label="남은 칸 ' + e.fuse + '">🔥<b>' + e.fuse + '</b></span><span class="flampbk" aria-label="붕괴 ' + Math.round(e.brk || 0) + '/' + e.brkMax + '">💥' + Math.round(e.brk || 0) + '/' + e.brkMax + '</span>';
  if ((e.role === 'rampart' || e.role === 'brick' || e.role === 'barricade')) h += '<span class="flampbk" aria-label="붕괴 ' + Math.round(e.brk || 0) + '/' + e.brkMax + '">💥' + Math.round(e.brk || 0) + '/' + e.brkMax + '</span>';
  return h;
}
/* --- 방 만들기(js/66 mkRoom): 특성 · 정예 접사 · 무리 --- */
function w3Mods(run, n, f) {
  const W = MOD3W, low = isLower(f), out = [], dg = run.dg || {};
  const w = { rift: f >= W.riftFrom ? W.w.rift * (W.pathRift[run.path] || 1) : 0, wall: (f >= W.wallFrom ? 1.6 : 0.6) * W.w.wall * (W.pathWall[run.path] || 1), mob3: f <= W.mobTo ? W.w.mob3 * (f <= 3 ? 1.8 : 1) : 0, rockfall: W.w.rockfall };
  if (dg.oath && run.path === 'quiet') w.rift = 0;
  while (out.length < n) { const ks = Object.keys(w).filter(k => w[k] > 0 && !out.includes(k)); if (!ks.length) break; let x = Math.random() * ks.reduce((a, k) => a + w[k], 0); let pk = ks[0]; for (const k of ks) { x -= w[k]; if (x <= 0) { pk = k; break; } } out.push(pk); }
  return out;
}
function w3RoomMods(run, r, t, f) {
  const low = isLower(f); if (t === 'strong') { r.mods = []; return; }
  const ch = run.path === 'quiet' && f >= MOD3W.riftFrom ? 0.15 : 0; // 배수로는 재액의 틈이 잦다(샛길의 고유 위험)
  r.mods = t === 'trial' ? w3Mods(run, 2, f) : Math.random() < MOD3W.chance[low ? 'lower' : 'upper'] ? w3Mods(run, 1, f) : (Math.random() < ch ? ['rift'] : []);
}
function w3Affix(r, f) { // 3챕터 정예 접사(확정본): 강인 1 · 대형 1.2 · 잠식된 1(9층부터) · 경보수 0.8. 하나씩
  const W = Object.assign({}, AFFIX3.w); if (f < AFFIX3.taintFrom) delete W.taint; const form = [], taint = [], bell = [];
  r.tough = r.tough.filter(k => { const o = Object.entries(W); let x = Math.random() * o.reduce((a, c) => a + c[1], 0); let pk = o[0][0]; for (const [kk, w] of o) { x -= w; if (x <= 0) { pk = kk; break; } } if (pk === 'form') form.push(k); if (pk === 'taint') taint.push(k); if (pk === 'bell') bell.push(k); return pk === 'tough'; });
  r.form = form; r.taintA = taint; r.bellA = bell;
}
function w3Squad(run, r, sq, t, f) { if (sq.id === 'smugglers' && run.dg.noSmug) { run.dg.noSmug = 0; r.en = [['rioter'], ['rioter'], ['rioter']]; } }
const w3SquadW = (s, f) => s.bw ? (s.bw.find(([to]) => f <= to) || [0, 1])[1] : 1;
/* 문 · 방: 검문소(성문 대로 4층부터, 챕터에 둘) · 밀수꾼의 좌판(배수로 4–11층, 챕터에 하나) · 경보 단계(강적 문 ×1.4) */
function w3TypeOk(run, t, f) {
  if (t === 'checkpoint') return (run.ch || 1) === 3 && !OLD3 && run.path === 'main';
  if (t === 'smugstall') return (run.ch || 1) === 3 && !OLD3 && run.path === 'quiet' && f >= SMUG3.from && f <= SMUG3.to;
  return true;
}
const w3StrongMul = run => (run.ch || 1) === 3 && !OLD3 && ((run.dg && run.dg.alSt) || 0) >= ALARM.stageAt ? ALARM.strongW : 1;
/* --- 들어설 때(js/66 enterRoom): 경보 당김 · 이벤트 흔적 --- */
function w3Enter(run, R, room, nx) {
  const dg = run.dg; let sh = 0;
  if (dg.alNext) { sh += dg.alNext; dg.alNext = 0; } // 신호탄의 대가
  if (dg.petition > 0 && R.type !== 'boss') { sh -= 1; dg.petition--; } // 탄원서 더미: 다음 2개 방
  if (dg.ladderF === R.floor) sh -= 1; // 줄사다리를 건 층
  room.alarmShift = sh;
  if (dg.alarmNow && !R.strong && R.type !== 'boss') { room.alarmNow = 1; dg.alarmNow = 0; }
  if ((room.mods || []).includes('rift') && dg.riftCut > 0) { room.mods = room.mods.filter(m => m !== 'rift'); dg.riftCut--; }
  if (nx.noQuick) room.noQuick = 1;
  if (nx.ramHit) room.ramHit = 1;
  if ((room.mods || []).includes('mob3') && dg.mobFirst) { room.mobFirst = 1; dg.mobFirst = 0; }
  if (R.noAlarm) room.noAlarm = 1;
  if (R.boss && dg.bossHp) { run.p.hp = Math.min(run.p.hpMax, run.p.hp + run.p.hpMax * dg.bossHp); dg.bossHp = 0; }
}
/* --- 검문소 --- */
function w3CheckRoom(run, R, h) {
  const E0 = EVENTS.find(x => x.id === 'checkpoint3'); const dis = o => o.id === 'toll' && (run.gold || 0) < CHECK3.toll;
  return h + `<h3>🚧 ${esc(E0.n)}</h3><p class="lore">${esc(E0.lore)}</p><div class="evopts">${E0.opts.map(o => `<button class="evo" data-a="event" data-k="${o.id}"${dis(o) ? ' disabled' : ''}><b>${esc(o.n)}</b>${o.d ? `<small>${esc(o.d)}</small>` : ''}</button>`).join('')}</div></section>`;
}
/* 다음 층 문 하나 미리 보기(구간 문을 미리 만들어 두었으면 그것) */
function w3Peek(run) {
  const f = run.room + 1; const ds = run.segDoors && run.segDoors[f]; if (!ds || !ds.length) return null;
  const k = Math.floor(Math.random() * ds.length); const d = ds[k]; d.hide = 0; return (ROOM_TYPES[d.type] ? ROOM_TYPES[d.type].n : d.type) + (d.strong ? ' · ' + d.strong : d.squad && SQUADS.find(x => x.id === d.squad) ? ' · ' + SQUADS.find(x => x.id === d.squad).n : '');
}
/* --- 이벤트 아홉 + 검문소(js/80 'event') --- */
function w3EvDis(run, E0, o) { return (E0.id === 'fallentower' && o.id === 'take' && run.p.st < 40) || (E0.id === 'checkpoint3' && o.id === 'toll' && (run.gold || 0) < CHECK3.toll); }
function w3Event(run, R, o, drops) {
  const p = run.p, nx = run.next = run.next || {}, dg = run.dg;
  switch (R.event + ':' + o) {
    case 'heightpost:touch': p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.15); if (Math.random() < 0.3) { nx.pre = Object.assign({}, nx.pre, { bleed: ((nx.pre || {}).bleed || 0) + 3 }); toast('맨 위 칸의 칼자국에 손이 베였다. 다음 전투에 출혈 3'); } break;
    case 'lastpack:search': { const ids = Object.keys(CONS).filter(k => (CONS[k].ch || 1) <= 3 && CONS[k].use !== 'none' && !(CONS[k].only && CONS[k].only !== 3)); consGrant(run, pickR(ids), 'n', 1); dg.mobFirst = 1; break; }
    case 'petitions:read': run.buffs.petition = 4; dg.petition = 2; break;
    case 'shiftlog:read': nx.pre = Object.assign({}, nx.pre, { weak: ((nx.pre || {}).weak || 0) + 2 }); break;
    case 'smugladder:cut': dg.noSmug = 1; break;
    case 'taintwell:drink': p.stBonus = (p.stBonus || 0) + 10; applyGear(run); dg.wellTaint = 1; break;
    case 'taintwell:cover': nx.noQuick = 1; dg.riftCut = (dg.riftCut || 0) + 1; break;
    case 'fallentower:ring': dg.force = 'strong'; gainGold(run, 25, '종이 울립니다'); break;
    case 'fallentower:take': p.st = Math.max(0, p.st - 40); dg.noAlarm = 2; break;
    case 'gatevoice:answer': dg.bossHp = 0.1; p.hp = Math.max(1, p.hp - p.hpMax * 0.15); break;
    case 'oldram:cut': nx.ramHit = 1; if (Math.random() < 0.3) { p.hp = Math.max(1, p.hp - 10); toast('공성추가 옆으로 굴러 나도 피해 10'); } break;
    case 'checkpoint3:toll': { run.gold = Math.max(0, (run.gold || 0) - CHECK3.toll); const t = w3Peek(run); toast(t ? '통행세를 냈다. 다음 층 문 하나: ' + t : '통행세를 냈다. 다음 층에는 볼 문이 없다'); break; }
    case 'checkpoint3:sneak': if (Math.random() < CHECK3.sneak) toast('들키지 않고 지나갔다'); else { dg.alarmNow = 1; toast('들켰다. 다음 전투는 경보가 처음부터 울린다'); } break;
  }
}
/* 사다리를 올라 다음 층을 건너뛴다(야영지 · 보스 · 갈림길 층은 건너뛰지 않는다) */
function w3LadderSkip(run) { const f = run.room + 1; return f !== FLOOR_CAMP && f !== FLOOR_BOSS && !PATH_AT.includes(f) && f < FLOORS; }
/* --- 밀수꾼의 좌판(방에 저장): ① 영웅 장비 ② 고유 장비 둘 중 하나 ③ 안쪽의 물건 ④ 정보 --- */
function smugStock(run, R) {
  if (R.stock) return R.stock;
  const uq = typeof UNIQUE !== 'undefined' ? Object.keys(UNIQUE).filter(id => UNIQUE[id].g === 'r' && (UNIQUE[id].cls === 'all' || UNIQUE[id].cls === run.build)) : [];
  const pick = []; while (pick.length < SMUG3.uq.n && pick.length < uq.length) { const id = uq[Math.floor(Math.random() * uq.length)]; if (!pick.includes(id)) pick.push(id); }
  R.stock = { uq: pick, sold: null }; if (G.run && R === G.run.cur) { saveRunLocal(); saveCur(); } return R.stock; // 10월 24일 S-4: 처음 그릴 때 정한 고유 둘을 바로 저장(새로 고침으로 다시 굴리지 못하게)
}
function vSmug(run, R) {
  const S = smugStock(run, R), g = run.gold || 0, M = SMUG3; const btn = (k, t, ok, why) => `<button data-a="smbuy" data-k="${k}"${ok ? '' : ' disabled'}>${esc(t)}${!ok && why ? ` <small>${esc(why)}</small>` : ''}</button>`;
  return `<h3>🕳️ 밀수꾼의 좌판</h3><p class="lore">성벽 틈을 넘나드는 밀수꾼. 안쪽 물건이 섞여 있다.</p><p class="mini">하나만 살 수 있습니다. 가진 골드 ${g}</p>`
    + `<div class="card"><p><b>① 영웅 장비 하나</b></p><div class="row">${btn('hero-gold', '골드 ' + M.hero.gold, g >= M.hero.gold, '골드가 모자랍니다')}${btn('hero-hp', '최대 생명력 −' + Math.round(M.hero.hpPen * 100) + '%(캐릭터 끝까지)', true)}</div></div>`
    + (S.uq.length ? `<div class="card"><p><b>② 고유 장비 둘 가운데 하나</b> <span class="mini">(골드 ${M.uq.gold})</span></p><div class="row">${S.uq.map((id, j) => btn('uq-' + j, UNIQUE[id].n, g >= M.uq.gold, '골드가 모자랍니다')).join('')}</div></div>` : '')
    + `<div class="card"><p><b>③ 안쪽의 물건</b>: 이 챕터 동안 주는 피해 +${Math.round(M.inner.dmg * 100)}%. 대신 전투마다 잠식 1을 안고 시작한다.</p><div class="row">${btn('inner', '골드 ' + M.inner.gold, g >= M.inner.gold && !run.dg.inner, run.dg.inner ? '이미 가지고 있습니다' : '골드가 모자랍니다')}</div></div>`
    + `<div class="card"><p><b>④ 정보</b>: 보스방 앞 두 층의 문을 모두 미리 본다.</p><div class="row">${btn('info', '골드 ' + M.info.gold, g >= M.info.gold, '골드가 모자랍니다')}</div></div>`
    + `<div class="row"><button data-a="smleave" data-focus>그냥 지나간다</button></div>`;
}
function smugBuy(run, R, k) {
  const S = smugStock(run, R), M = SMUG3, p = run.p, drops = []; let paid = '';
  if (k === 'hero-gold' || k === 'hero-hp') { if (k === 'hero-gold') { if ((run.gold || 0) < M.hero.gold) return null; run.gold -= M.hero.gold; paid = '골드 ' + M.hero.gold; } else { p.hpPen = (p.hpPen || 0) + M.hero.hpPen; applyGear(run); paid = '최대 생명력 −' + Math.round(M.hero.hpPen * 100) + '%'; } drops.push(g8Gen(run, { g: 'h' })); }
  else if (/^uq-\d$/.test(k)) { const id = S.uq[+k.slice(3)]; if (!id || (run.gold || 0) < M.uq.gold) return null; run.gold -= M.uq.gold; paid = '골드 ' + M.uq.gold; drops.push(mkUq(id, 3)); }
  else if (k === 'inner') { if ((run.gold || 0) < M.inner.gold || run.dg.inner) return null; run.gold -= M.inner.gold; paid = '골드 ' + M.inner.gold; run.dg.inner = 1; toast('안쪽의 물건을 품는다. 주는 피해 +' + Math.round(M.inner.dmg * 100) + '%, 전투마다 잠식 1'); }
  else if (k === 'info') { if ((run.gold || 0) < M.info.gold) return null; run.gold -= M.info.gold; paid = '골드 ' + M.info.gold; run.dg.reveal = (run.dg.reveal || []).concat([FLOOR_BOSS - 2, FLOOR_BOSS - 1]); run.dg.peekAll = 1; toast('보스방 앞 두 층의 문을 모두 알게 되었다'); }
  else return null;
  S.sold = k; return { drops, paid };
}
/* 맹세(수비대의 맹세 제단): 배수로를 고를 수 없다 */
const w3NoQuiet = run => (run.ch || 1) === 3 && !!(run.dg && run.dg.oath);
