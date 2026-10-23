'use strict';
/* 도둑 영구 손해 금지 단위 시험 (0.8.0 M8, 10월 23일)
   1 잡으면 그 자리에서 되찾는다(골드 · 장비 · 플라스크) — 전투 기록에 「되찾는다」
   2 달아나면 훔친 것이 다음 상점으로 간다: 장비는 진열 재고 1(같은 장비), 골드 · 플라스크 한 칸은 상점에 들어설 때 돌려받는다
   3 내가 물러나 전투가 끝나도 적이 쥔 장물은 다음 상점으로(fenceHeld). 쇠붙이 미끼(antiSteal)는 아무것도 맡기지 않는다
   쓰기: node tools/thief-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const H = require('./uqtest/_h.js'); const { E, G } = H;
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
const logHas = (b, s) => b.log.some(x => x.m && x.m.includes(s));
/* 도둑 하나 + 막이 하나(도둑이 죽거나 달아나도 전투가 끝나지 않게). want: 'gold' | 'item' | 'flask' 하나만 훔칠 수 있게 판을 맞춘다 */
function scene(want) {
  const f = H.fight('warden', { en: ['thief', 'bruiser'], hp: 300 }); const run = f.run, p = f.p, b = f.b;
  run.gold = want === 'gold' ? 500 : 0; for (const k of ['life', 'mana', 'stam']) p.flask[k] = 0; if (want === 'flask') p.flask.life = 2;
  run.bag = []; let it = null; if (want === 'item') { it = E.mkItem8({ base: 'blade', g: 'r', ch: 1, b: 0, af: [] }); E.addItem(run, it); }
  run.fenced = []; const e = f.es[0]; e.intent = { k: 'steal' }; E.enemyAct(b, e);
  return { f, run, p, b, e, it };
}
const flee = s => { s.e.intent = { k: 'flee' }; s.e.stuck = 0; s.b.over = null; E.enemyAct(s.b, s.e); };
const shop = run => { run.ch = 1; G.run = run; E.genShop(run); return run.shop; };

{ // 1-1 골드: 잡으면 되찾는다
  const s = scene('gold'); const g1 = s.run.gold; t(s.e.loot && s.e.loot.k === 'gold' && g1 < 500, '골드를 훔치지 않았다 ' + JSON.stringify(s.e.loot && s.e.loot.k));
  E.killEnemy(s.b, s.e); t(s.run.gold === 500 && !s.e.loot && logHas(s.b, '되찾는다'), '잡았는데 골드 ' + s.run.gold + '/500');
}
{ // 1-2 장비: 잡으면 가방으로
  const s = scene('item'); t(s.run.bag.length === 0 && s.e.loot && s.e.loot.k === 'item', '장비를 훔치지 않았다');
  E.killEnemy(s.b, s.e); t(s.run.bag.includes(s.it.uid) && s.run.inv[s.it.uid] === s.it && logHas(s.b, '되찾는다'), '잡았는데 장비가 가방에 없다');
}
{ // 1-3 플라스크: 잡으면 한 칸 돌려받는다
  const s = scene('flask'); t(s.p.flask.life === 1, '플라스크를 훔치지 않았다 ' + s.p.flask.life); E.killEnemy(s.b, s.e); t(s.p.flask.life === 2, '잡았는데 플라스크 ' + s.p.flask.life);
}
{ // 2-1 장비: 달아나면 다음 상점 진열에 재고 1
  const s = scene('item'); flee(s); t(!s.e.alive && !s.run.inv[s.it.uid] && (s.run.fenced || []).length === 1 && logHas(s.b, '다음 상점에 나온다'), '달아난 장물이 맡겨지지 않았다');
  const S = shop(s.run); const x = S.stock.find(y => y.fenced); t(x && x.it === s.it && x.sold === 0 && x.price > 0 && S.stock.filter(y => y.fenced).length === 1 && !s.run.fenced.length, '상점에 도둑맞은 장비가 재고 1로 없다');
  t(x && E.addItem(s.run, x.it) && s.run.inv[s.it.uid] === s.it, '진열된 장비를 다시 살 수 없다');
}
{ // 2-2 골드: 달아나면 상점에 들어설 때 돌려받는다
  const s = scene('gold'); const g = s.e.loot.g; flee(s); t(s.run.gold === 500 - g, '달아났는데 골드가 그대로 ' + s.run.gold); s.run.gold = 0; shop(s.run); t(s.run.gold === g, '상점에서 골드 ' + g + '을(를) 돌려받지 못했다 ' + s.run.gold);
}
{ // 2-3 플라스크: 달아나면 상점에 들어설 때 한 칸 돌려받는다
  const s = scene('flask'); flee(s); t(s.p.flask.life === 1, '달아났는데 플라스크 ' + s.p.flask.life); shop(s.run); t(s.p.flask.life === 2, '상점에서 플라스크를 돌려받지 못했다 ' + s.p.flask.life);
}
{ // 3-1 내가 물러나면 쥔 장물은 다음 상점으로
  const s = scene('gold'); const g = s.e.loot.g; s.b.over = 'flee'; E.fenceHeld(s.b); t(!s.e.loot && (s.run.fenced || []).length === 1 && s.run.fenced[0].g === g, '물러났는데 장물이 맡겨지지 않았다');
}
{ // 3-2 이긴 채 남은 장물은 바로 돌려받는다
  const s = scene('gold'); s.b.over = 'win'; E.fenceHeld(s.b); t(s.run.gold === 500 && !(s.run.fenced || []).length, '이겼는데 장물을 되찾지 못했다 ' + s.run.gold);
}
{ // 3-3 쇠붙이 미끼: 맡길 것이 없다
  const f = H.fight('warden', { en: ['thief', 'bruiser'], hp: 300 }); f.b.antiSteal = 1; f.run.fenced = []; const e = f.es[0]; e.intent = { k: 'steal' }; E.enemyAct(f.b, e); e.intent = { k: 'flee' }; E.enemyAct(f.b, e);
  t(!(f.run.fenced || []).length, '쇠붙이를 장물로 맡겼다');
}
console.log('thief-check: ' + (n - T.length) + '개 통과 · 실패 ' + T.length); for (const m of T) console.log('  실패: ' + m); if (T.length) process.exit(1);
