/* ===== 2챕터 적·방 특성·이벤트 점검 (0.6b 단계 2, 기획서 11.12절)
   역할 기믹(해골, 저주술사), 상태 저주, 정예 접사 신속, 지하묘지 방 특성 4, 이벤트 8이 실제로 일어나는지 본다.
   실행: node tools/ch2check.js */
const { G0, run_, rng, click, handleSheets } = require('./dgqa.js');
const G = G0.__G; let bad = 0, ok = 0;
const chk = (name, cond, ex) => { if (cond) ok++; else { bad++; console.log('✗ ' + name + (ex != null ? ' (' + ex + ')' : '')); } };
const CURSE = run_('CURSE'), UNDEAD = run_('UNDEAD'), SWIFT = run_('SWIFT');
G0.__rnd = rng(11); run_('Math.random = __rnd');

function battle(en, opt) {
  opt = opt || {}; const p = G0.mkPlayer(opt.build || 'templar', {}); p.hp = p.hpMax;
  const room = Object.assign({ type: 'normal', ch: 2, floor: 3, lv: 5, en, names: run_('ENEMY_NAMES[2]'), mods: opt.mods || [], tough: [], swift: opt.swift || [] }, opt.room || {});
  return G0.roomBattle(p, room, null, 7);
}
// 1) 해골: 한 번 다시 일어선다
{ const b = battle([['skeleton'], ['bruiser']]); const e = b.en[0];
  G0.hurtEnemy(b, e, e.hp + 50, {}); chk('해골이 다시 일어선다', e.alive && e.rose && Math.abs(e.hp - Math.round(e.hpMax * UNDEAD.rise)) < 1, e.hp);
  const xp0 = b.xp || 0; G0.hurtEnemy(b, e, e.hp + 50, {}); chk('두 번째에는 쓰러진다', !e.alive); chk('경험치는 마지막에 한 번', (b.xp || 0) > xp0); }
{ const b = battle([['skeleton'], ['bruiser']]); const e = b.en[0]; G0.addS(b, e, 'ignite', 3, 1);
  G0.hurtEnemy(b, e, e.hp + 50, {}); chk('점화 중이면 일어서지 않는다', !e.alive); }
{ const b = battle([['skeleton'], ['bruiser']]); const e = b.en[0]; e.s.broken = { stacks: 1, until: b.t + 2, dur: 2 };
  G0.hurtEnemy(b, e, e.hp + 50, {}); chk('붕괴 상태면 일어서지 않는다', !e.alive); }
// 2) 저주술사와 저주
{ const b = battle([['curser']]); const e = b.en[0]; let seen = false;
  for (let n = 0; n < 6 && !b.over; n++) { e.intent = null; e.acts = n; G0.decideIntent(b, e); if (e.intent.k === 'curse') { seen = true; G0.enemyAct(b, e); break; } }
  chk('저주술사가 저주를 건다', seen && b.p.s.curse, JSON.stringify(Object.keys(b.p.s)));
  const p = b.p; p.hp = p.hpMax * 0.4; const hm = G0.healMul(p); chk('저주: 받는 회복 절반', Math.abs(hm - CURSE.heal) < 1e-9, hm);
  const left0 = p.s.curse.until - b.t; G0.addS(b, p, 'curse', CURSE.dur); const left1 = p.s.curse.until - b.t; chk('저주는 걸 때마다 더해진다', Math.abs(left1 - Math.min(CURSE.max, left0 + CURSE.dur)) < 1e-6, left0 + '→' + left1);
  for (let k = 0; k < 5; k++) G0.addS(b, p, 'curse', CURSE.dur); chk('저주는 최대 ' + CURSE.max, p.s.curse.until - b.t <= CURSE.max + 1e-6);
  p.flask.mana = 1; G0.playerAct(b, 'flaskM', null); chk('마나 플라스크가 저주를 지운다', !p.s.curse); }
{ const b = battle([['curser']], { mods: ['lamp'] }); G0.addS(b, b.p, 'curse', CURSE.dur); chk('꺼지지 않는 등불: 저주 +1', Math.abs(b.p.s.curse.until - b.t - (CURSE.dur + 1)) < 1e-6); }
{ const b = battle([['curser']], { build: 'priest' }); const p = b.p; G0.addS(b, p, 'curse', 3); G0.addS(b, p, 'poison', 3, 3); p.sigCd = 0; p.hp = p.hpMax * 0.5; const h0 = p.hp; G0.playerAct(b, 'sig', null);
  chk('사제의 기도는 저주를 먼저 지운다', !p.s.curse && p.hp > h0); }
// 3) 신속
{ const b = battle([['bruiser', 1], ['bruiser', 1]], { swift: [0] }); chk('신속: 속도 ×' + SWIFT.spd, Math.abs(b.en[0].spd / b.en[1].spd - SWIFT.spd) < 1e-9 && b.en[0].swift); }
{ // 2챕터 방에서 정예 접사의 절반 정도가 신속
  let t = 0, s = 0; const run = { ch: 2, dg: { counts: {}, seen: {}, events: [], strong: { u: 0, l: 0 }, foes: [] } };
  for (let i = 0; i < 4000; i++) { const r = G0.mkRoom(run, 'normal', 15); t += r.tough.length; s += (r.swift || []).length; }
  chk('2챕터 정예 접사 중 신속 약 절반', s > 0 && Math.abs(s / (s + t) - SWIFT.share) < 0.06, s + '/' + (s + t));
  const run1 = { ch: 1, dg: run.dg }; let s1 = 0; for (let i = 0; i < 2000; i++) s1 += (G0.mkRoom(run1, 'normal', 15).swift || []).length; chk('1챕터에는 신속이 없다', s1 === 0, s1); }
// 4) 방 특성
{ const b0 = battle([['archer'], ['bruiser']]), b1 = battle([['archer'], ['bruiser']], { mods: ['fog'] });
  chk('납골 안개: 후열 적 공격 −20%', Math.abs(G0.enemyHitEst(b1, b1.en[0]) / G0.enemyHitEst(b0, b0.en[0]) - 0.8) < 1e-9);
  chk('납골 안개: 전열 적은 그대로', Math.abs(G0.enemyHitEst(b1, b1.en[1]) - G0.enemyHitEst(b0, b0.en[1])) < 1e-9);
  const h = bb => { bb.cur = { ranged: true }; const e = bb.en[1]; const hp = e.hp; G0.hurtEnemy(bb, e, 10, { single: 1 }); return hp - e.hp; };
  chk('납골 안개: 내 원거리 공격 −20%', Math.abs(h(b1) / h(b0) - 0.8) < 1e-6); }
{ const b = battle([['bruiser']], { mods: ['wall'] }); chk('무너진 납골벽: 해골 1기 추가', b.en.length === 2 && b.en[1].role === 'skeleton'); }
{ const b = battle([['bruiser'], ['archer']], { mods: ['water'] }); chk('지하수: 모두 냉각 1', b.p.s.chill && b.en.every(e => e.s.chill)); }
// 5) 이벤트 (실제 버튼으로)
function evRoom(id) {
  G0.__rnd = rng(id.length * 7); run_('Math.random = __rnd');
  G.data = G0.blankData(); G.data.seenCoach = true; G.cre = { name: 'chk' }; G.dropQ = []; G.b = null; G.sheet = null;
  G0.startRun('templar'); const run = G.run; G.sheet = null; G.creating = false; G.cre = null; G.scr = 'run';
  run.skills = Object.keys(G0.skillMap('templar')).slice(0, 3); run.p.skills = run.skills.slice(); // 만들기 창을 지나지 않았으니 세 칸을 채운다
  run.ch = 2; run.dg = null; G0.dgInit(run); run.room = 4; run.doors = null; run.cur = { type: 'event', ch: 2, floor: 4, event: id };
  const it = G0.mkItem('twin'); G0.addItem(run, it); return run;
}
{ const run = evRoom('nameless'); const hp0 = run.p.hpMax; click('event', 'carve'); chk('이름 없는 묘비: 생명력 +5, 다음 전투 저주', run.p.hpMax === hp0 + 5 && run.next.pre && run.next.pre.curse === 3); }
{ const run = evRoom('bonetrader'); const g = run.inv[run.bag[0]].g; click('event', 'trade'); chk('뼈 상인: 넘길 장비 창', G.sheet && G.sheet.kind === 'offer' && G.sheet.data.trade);
  click('offerpick', run.bag[0]); chk('뼈 상인: 같은 등급 둘 가운데 하나', G.sheet && G.sheet.kind === 'choice' && G.sheet.data.offer.length === 2 && G.sheet.data.offer.every(k => (G0.ITEMS[k].g || 'n') === g), G.sheet && JSON.stringify(G.sheet.data.offer)); }
{ let rare = 0, fight = 0; for (let i = 0; i < 40; i++) { const run = evRoom('coffin' + ' '.repeat(i)); run.cur.event = 'coffin'; click('event', 'open'); if (run.next.add) { fight++; chk('봉인된 관: 정예 해골 + 이기면 희귀', run.next.add[0][0] === 'skeleton' && run.next.add[0][1] === 1 && run.next.rare === 1); } else if (G.sheet && G.sheet.kind === 'drop' && run.inv[G.sheet.data.uid].g === 'r') rare++; }
  chk('봉인된 관: 두 갈래가 모두 나온다', rare > 5 && fight > 5, rare + '/' + fight); }
{ const run = evRoom('funeral'); click('event', 'follow'); chk('장례 행렬: 뒤따르면 3개 방 버프', run.buffs.funeral === 3, run.buffs.funeral); // 방을 넘으며 하나 줄었다
  const p = G0.mkPlayer('templar', {}); p.bt = { funeral: 1 }; const b = G0.newBattle(p, [G0.mkEnemy('bruiser', 0, 0, { lv: 5 })], {}); const hp = p.hp; G0.hurtPlayer(b, 10, {}); chk('장례 행렬: 받는 피해 −10%', Math.abs(hp - p.hp - 9) < 1e-6, hp - p.hp); }
{ const run = evRoom('funeral'); click('event', 'block'); chk('장례 행렬: 길을 막으면 무덤지기 + 골드 25', run.next.chase && run.next.chase.gold === 25 && run.next.chase.n === '무덤지기'); }
{ const run = evRoom('mentor'); click('event', 'learn'); chk('잊힌 스승의 묘비: 스킬 셋을 내민다', G.sheet && G.sheet.kind === 'swap' && G.sheet.data.offer.length === 3 && G.sheet.data.offer.every(k => !run.skills.includes(k)));
  const k = G.sheet.data.offer[1]; click('swapdo', k, { s: '2' }); chk('잊힌 스승의 묘비: 셋째 칸이 바뀐다', run.skills[2] === k && run.p.skills[2] === k && run.skillLog.some(x => x.a === 'swap' && x.to === k)); }
{ const run = evRoom('robber'); click('event', 'search'); chk('도굴꾼의 시체: 다음 전투 중독 3', run.next.pre && run.next.pre.poison === 3); }
{ const run = evRoom('robber'); run.p.flask.life = 0; click('event', 'bury'); chk('도굴꾼의 시체: 생명력 플라스크 +1', run.p.flask.life === 1); }
{ const run = evRoom('blackpool'); run.p.flask.mana = 0; run.p.flask.stam = 0; click('event', 'drink'); chk('검은 샘: 마나·스태미나 +1, 저주', run.p.flask.mana === 1 && run.p.flask.stam === 1 && run.next.pre.curse === 3); }
{ const run = evRoom('bonepipe'); const g0 = run.gold || 0; click('event', 'blow'); chk('뼈 피리: 다음 층 문에 강적, 골드 20', run.doors && run.doors.some(d => d.type === 'strong') && (run.gold || 0) - g0 === 20, (run.doors || []).map(d => d.type).join()); }
// 다음 전투에 더해지는 것: 관의 해골, 길을 막은 무덤지기
{ const run = evRoom('coffin'); run.next = { add: [['skeleton', 1]], rare: 1, chase: { n: '무덤지기', gold: 25 } }; run.cur = G0.mkRoom(run, 'normal', 5); run.room = 5; const n0 = run.cur.en.length;
  G0.enterRoom(); chk('다음 전투: 정예 해골과 무덤지기가 더해진다', G.b.en.length === n0 + 2 && G.b.en.some(e => e.role === 'skeleton' && e.elite) && G.b.en.some(e => e.n === '무덤지기'), G.b.en.map(e => e.n).join()); }
console.log(`2챕터 점검 ${ok + bad}건, 실패 ${bad}건`);
process.exitCode = bad ? 1 : 0;
