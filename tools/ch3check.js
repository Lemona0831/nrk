/* 3챕터 규칙 점검 (10월 7일, docs/챕터/3챕터.md 19.2절 도구): 06a2의 게임 코드를 vm에서 그대로 돌려, 3챕터 몸 · 게이지 · 강적 · 보스 · 소모품이 설계대로 움직이는지 장면마다 확인한다.
   강적 · 보스의 값은 비공개 문서와 data/dungeon.js의 FOE_X · QUEEN을 읽는다(여기에 대처를 적지 않는다). 실패 0이어야 한다.
   실행: node tools/ch3check.js */
process.env.DGDIR = process.env.DGDIR || '06a2';
const D = require('./dgqa.js'); const G0 = D.G0; const run_ = D.run_;
let fail = 0, pass = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('실패:', m); } };
const V = k => run_(k);
function battle(room, build, lv) {
  const p = G0.mkPlayer(build || 'warden', {}, G0.statRecommend(build || 'warden', {}, 15 + 2 * ((lv || 13) - 1)), G0.TREE2[build || 'warden'].starters); p.lv = lv || 13; G0.applyStats(p, p.stat || {}); p.hp = p.hpMax; p.st = p.stMax;
  const r = Object.assign({ ch: 3, lv: 11, floor: 14, names: V('ENEMY_NAMES[3]'), path: 'main', en: [] }, room);
  const b = G0.roomBattle(p, r, r.boss ? 'queen' : null, 7); b.stepMode = false; return b;
}
const al = b => G0.alive(b);
const act = (b, id, t) => G0.playerAct(b, id, t || null);
/* 1. 열기: 작열하는 한낮 */
{ const b = battle({ en: [['bruiser', 0], ['bruiser', 0]], mods: ['noon'] });
  ok(b.heat === V('HEAT.start'), '한낮 시작 열기 ' + b.heat);
  const h0 = b.heat; act(b, 'guard'); ok(b.heat === h0 + V('HEAT.mod') || b.over, '라운드 끝 열기 +10 (' + h0 + ' → ' + b.heat + ')');
  b.heat = 95; G0.ch3Round(b); ok(b.heatWarn === b.round, '이번 라운드 끝에 100을 넘을 어림이면 이번 라운드 예고');
  act(b, 'basic', al(b)[0].id); ok(b.heat <= V('HEAT.reset') + V('HEAT.ember') * 2, '열풍 뒤 열기 30 근처 (' + b.heat + ')');
  ok(b.rec.some(x => x.k === 'bigfire' && x.i === 'storm' && x.gap >= 1), '열풍은 예고 뒤 내 차례가 지난 뒤 (gap ≥ 1)');
  b.heat = 99; b.heatWarn = null; b.queue = []; G0.heatAdd(b, 5, '시험'); ok(b.heatWarn === (b.round || 0) + 1, '내 차례가 지난 뒤 100에 닿으면 다음 라운드 끝으로 미룬다');
}
/* 2. 나에게 붙는 화상은 라운드에 4까지, 피할 수 없는 피해의 상한 */
{ const b = battle({ en: [['bruiser', 0]] }, 'hunter'); const p = b.p; p.stat.wil = 0;
  G0.addS(b, p, 'ignite', 3); G0.addS(b, p, 'ignite', 3); ok(G0.st(p, 'ignite') === V('IGN_ROUND_CAP'), '라운드 화상 상한 ' + G0.st(p, 'ignite'));
  delete p.s.ignite; p.ward = 0; const hp0 = p.hp; G0.hurtPlayer(b, 999, { aoe: 1, spell: 1, label: '시험' }); ok(hp0 - p.hp <= V('HIT_REF(' + b.ctx.lv + ')') * V('UNAVOID_CAP') + 0.01, '피할 수 없는 피해 상한 ' + (hp0 - p.hp).toFixed(1));
}
/* 3. 허상 · 붕대 · 모래폭풍 */
{ const b = battle({ en: [['bruiser', 0], ['wrapped', 0], ['archer', 0]], mods: ['sandstorm'] }); const [br, wr, ar] = b.en;
  br.haze = 2; const h0 = br.hp; G0.hurtEnemy(b, br, 10, { single: 1 }); ok(br.hp === h0 && br.haze === 1, '허상 한 겹이 한 적 공격을 막는다');
  G0.hurtEnemy(b, br, 10, { aoe: 1 }); ok(br.hp < h0 && br.haze === 1, '광역은 허상을 지나가고 겹을 걷지 않는다');
  ok(wr.wrap === V('WRAP.hits'), '붕대 ' + wr.wrap); const w0 = wr.hp; G0.hurtEnemy(b, wr, 10, { single: 1 }); ok(Math.abs((w0 - wr.hp) - 7) < 0.01, '붕대 −30% (' + (w0 - wr.hp) + ')');
  G0.addS(b, wr, 'ignite', 1); ok(!wr.wrap, '화상이 붕대를 태운다');
  const a0 = ar.hp; G0.hurtEnemy(b, ar, 10, { single: 1 }); ok(Math.abs((a0 - ar.hp) - 8) < 0.01, '모래폭풍: 후열이 받는 피해 −20% (' + (a0 - ar.hp) + ')');
}
/* 4. 모래 잠복자: 숨으면 한 적 대상 불가, 솟구침은 출혈 */
{ const b = battle({ en: [['lurker', 0], ['bruiser', 0]] }, 'hunter'); const lk = b.en[0]; b.p.stat.wil = 0; b.p.ward = 0; b.p.evade = 0;
  lk.intent = { k: 'burrow' }; G0.enemyAct(b, lk); ok(lk.under === 1 && lk.intent.k === 'erupt', '잠복 → 솟구침 예고');
  ok(!G0.canTarget(b, lk, { id: 'basic', melee: 1 }) && G0.canTarget(b, lk, { id: 'dodge', dodge: 1 }), '숨은 적은 칠 수 없고 흘릴 대상으로는 고를 수 있다');
  b.turnIdx++; G0.enemyAct(b, lk); ok(!lk.under && G0.st(b.p, 'bleed') > 0, '솟구침 출혈');
}
/* 5. 강적 */
{ const b = battle({ en: [['lurker', 1], ['archer', 0], ['bruiser', 0]], strong: '모래 속 사냥꾼', foe: 'stalker' }); const s = b.en[0];
  s.intent = { k: 'burrow' }; G0.enemyAct(b, s); ok(s.under && s.intent.k === 'surgeprep', '사냥꾼: 잠복 → 솟구칠 준비');
  b.actN = 500; G0.hurtEnemy(b, s, 5, { aoe: 1 }); b.actN = 501; G0.hurtEnemy(b, s, 5, { aoe: 1 }); ok(!s.under && s.stkExp === 1, '사냥꾼: 광역 두 번에 튀어나온다');
}
{ const b = battle({ en: [['bruiser', 1]], strong: '녹은 유리 거상', foe: 'colossus' }); const c = b.en[0];
  ok(c.spd === V('FOE_X.colossus.spd'), '거상 속도'); c.glow = 2; const k0 = c.brk; G0.addS(b, c, 'chill', 1); ok(G0.st(c, 'vuln') >= 2 && (c.brk > k0 || c.s.broken) && c.glow === 1, '거상: 달아오름 2에서 둔화 → 금(취약 · 붕괴), 달아오름 −1');
  c.glow = 3; c.intent = null; G0.decideIntent(b, c); ok(c.intent.k === 'charge', '거상: 달아오름 3이면 모은다');
}
{ const b = battle({ en: [['bruiser', 1], ['ember', 0], ['bruiser', 0]], strong: '불씨 수확자', foe: 'reaper' }, 'hunter'); const rp = b.en[0]; b.p.stat.wil = 0;
  G0.addS(b, b.p, 'ignite', 4); G0.addS(b, b.en[1], 'ignite', 2); rp.intent = { k: 'reap' }; G0.enemyAct(b, rp); ok(rp.embers >= 2 && !G0.st(b.p, 'ignite'), '수확자: 거두기 (불씨 ' + rp.embers + ')');
  const e0 = rp.embers; G0.addS(b, b.en[2], 'ignite', 1); b.en[2].hp = 1; G0.hurtEnemy(b, b.en[2], 50, { single: 1 }); ok(rp.embers >= Math.min(V('FOE_X.reaper.cap'), e0 + 2), '수확자: 불붙은 적이 쓰러지면 불씨 +2');
}
{ const b = battle({ en: [['healer', 1], ['shield', 0], ['bruiser', 0]], strong: '해시계 사제', foe: 'sundial' }); const sd = b.en[0];
  ok(sd.clock === V('FOE_X.sundial.clock'), '해시계 시작 ' + sd.clock); sd.clock = 1; G0.ch3Tick(b, 1); ok(sd.noonNext && sd.intent.k === 'noon', '해시계 0 → 정오의 빛 예고');
  const hp0 = b.p.hp; b.turnIdx++; G0.enemyAct(b, sd); ok(b.p.hp < hp0 && sd.clock === V('FOE_X.sundial.clock') && G0.st(b.en[1], 'empower') >= 1, '정오의 빛: 광역 뒤 적 강화, 해시계 6');
}
{ const b = battle({ en: [['bruiser', 1], ['archer', 0]], strong: '아지랑이 무희', foe: 'dancer' }); const dn = b.en[0];
  dn.intent = { k: 'clone' }; G0.enemyAct(b, dn); ok(dn.haze === V('FOE_X.dancer.haze'), '무희: 분신 허상 ' + dn.haze);
  dn.intent = { k: 'heavy' }; dn.teleTurn = -5; b.p.ward = 0; const hp0 = b.p.hp; G0.enemyAct(b, dn); ok(hp0 - b.p.hp <= b.p.hpMax * V('FOE_X.dancer.capTot') + 0.01 && dn.haze === 0, '칼춤: 합 상한 35% (' + (hp0 - b.p.hp).toFixed(1) + '), 뒤에 허상 0');
}
/* 6. 재의 여왕 */
{ const b = battle({ boss: 1, floor: 24, lv: 12 }); const q = b.en.find(e => e.boss === 'queen'); const cr = b.en.find(e => e.role === 'crown');
  ok(q && cr && b.heat === V('QUEEN.heat0'), '여왕 · 왕관 · 열기 ' + b.heat);
  b.heat = 60; b.actN = 900; G0.hurtEnemy(b, cr, 1, { single: 1 }); G0.hurtEnemy(b, cr, 1, { single: 1 }); ok(b.heat === 60 - V('QUEEN.crownHit'), '왕관: 한 행동에 열기 −6 한 번 (' + b.heat + ')');
  cr.hp = 1; b.actN = 901; G0.hurtEnemy(b, cr, 5, { single: 1 }); ok(!cr.alive && q.stun === 1 && b.crownBack, '왕관이 깨지면 여왕이 휘청이고 다시 씌워질 라운드가 정해진다');
  ok(!G0.checkEnd(b) && !b.over, '왕관만 깨져도 전투는 이어진다');
  q.hp = q.hpMax * 0.71; G0.hurtEnemy(b, q, q.hpMax * 0.2, { single: 1 }); ok(Math.abs(q.hp - q.hpMax * 0.7) <= 1 && q.intent.k === 'qrise', '여왕 70%: 페이즈 문턱에서 멈춘다');
  q.stun = 0; b.turnIdx++; G0.enemyAct(b, q); ok(q.phase === 2 && al(b).filter(e => e.role === 'maid').length === V('QUEEN.maidMax'), '2페이즈: 시녀 둘');
  q.hp = 1; q.phase = 3; G0.hurtEnemy(b, q, 50, { single: 1 }); ok(b.over === 'win' && !al(b).length, '여왕이 쓰러지면 시녀 · 왕관도 흩어지고 이긴다');
}
/* 7. 소모품 */
{ const b = battle({ en: [['bruiser', 0], ['mirage', 0]], mods: ['noon', 'haze'] }); const run = { p: b.p, cons: [], ch: 3, room: 5, dg: {} };
  const use = (id, t) => { run.cons = [{ id, g: 'n', n: 1 }]; b.consN = 0; b.queue = ['p']; return G0.consUse(b, run, 0, t || null); };
  ok(b.en[0].haze === 1 && b.en[1].haze === 1, '아지랑이: 모든 적 허상 1');
  b.heat = 70; ok(use('awning') === '' && b.heat === 40, '차양 천: 열기 −30');
  ok(use('mirror') === '' && !b.en[0].haze, '거울 조각: 허상을 걷는다');
  G0.addS(b, b.p, 'ignite', 3); b.p.hp = b.p.hpMax * 0.5; ok(use('sap') === '' && !b.p.s.ignite && b.p.hp > b.p.hpMax * 0.5, '선인장 수액');
  b.en[1].chant = { taken: 0, need: 9 }; b.en[1].intent = { k: 'chanting' }; ok(use('hourglass', b.en[1].id) === '' && !b.en[1].chant, '작은 모래시계: 영창을 되돌린다');
}
console.log(`3챕터 점검: 통과 ${pass}, 실패 ${fail}`);
process.exitCode = fail ? 1 : 0;
