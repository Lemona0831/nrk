'use strict';
/* 고르기 점검 (10월 24일 만든 사람 요청): 게임이 "가장 많은 · 가장 좋은" 내 것을 가져갈 때 둘 이상이 같으면 플레이어가 고른다
   1 굶주린 수도사 · 다락의 아이들(먹을 것을 준다): 가장 많이 찬 플라스크가 하나면 바로 비우고, 둘 이상이면 고르기 창(flaskpick) → 고른 것을 비운다
   2 암시장 영웅 장비(가방의 가장 좋은 장비를 내놓는다): 같은 등급이 둘 이상이면 단추가 여럿, 고른 것을 내놓는다
   빚 장부의 주인 차압(전투 중)은 tools/clock-ch2-check.js ledger 6a · 6b에서 본다
   쓰기: node tools/tiepick-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'), E = D.G0, R_ = D.run_, G = E.__G;
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
const click = (a, k, extra) => { const ds = Object.assign({ a }, k != null ? { k: String(k) } : {}, extra || {}); const el = { dataset: ds, checked: false, closest: () => null }; E.onClick({ target: { closest: () => el } }); };
function setup(ch, cur) { G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('warden'); const run = G.run; delete run.alloc; run.ch = ch; run.cur = cur; return run; }
const fl = run => ['life', 'mana', 'stam'].map(k => run.p.flask[k] || 0).join('/');

for (const [ch, ev] of [[1, 'monk'], [2, 'attic']]) {
  { const run = setup(ch, { type: 'event', event: ev }); Object.assign(run.p.flask, { life: 3, mana: 3, stam: 1 });
    click('event', 'feed'); const S = G.sheet;
    t(S && S.kind === 'flaskpick' && S.data.ties.join() === 'life,mana', ev + ': 동률(생명력 · 정화)인데 고르기 창이 아니다 ' + JSON.stringify(S && { k: S.kind, d: S.data }));
    t(fl(run) === '3/3/1', ev + ': 고르기 전에 플라스크가 줄었다 ' + fl(run));
    click('event', 'feed', { f: 'mana' }); t(fl(run) === '3/2/1', ev + ': 고른 정화 플라스크가 아니다 ' + fl(run));
    t(!(G.sheet && G.sheet.kind === 'flaskpick'), ev + ': 고른 뒤에도 고르기 창이 남았다'); }
  { const run = setup(ch, { type: 'event', event: ev }); Object.assign(run.p.flask, { life: 2, mana: 3, stam: 1 });
    click('event', 'feed'); t(!(G.sheet && G.sheet.kind === 'flaskpick') && fl(run) === '2/2/1', ev + ': 가장 많은 것이 하나인데 고르기 창이 떴거나 정화가 아니다 ' + fl(run)); }
  { const run = setup(ch, { type: 'event', event: ev }); Object.assign(run.p.flask, { life: 2, mana: 2, stam: 2 });
    click('event', 'feed', { f: 'nope' }); t(G.sheet && G.sheet.kind === 'flaskpick' && G.sheet.data.ties.length === 3 && fl(run) === '2/2/2', ev + ': 동률 밖의 값으로 그냥 비웠다 ' + fl(run)); }
}
{ // 암시장
  const run = setup(2, null); const add = g => { const it = E.g8Gen(run, { g }); run.inv[it.uid] = it; run.bag.push(it.uid); return it.uid; };
  run.bag.length = 0; const r1 = add('r'), m1 = add('m'), r2 = add('r'); const R = { type: 'market', floor: 5 }; run.cur = R;
  const ties = R_('ch2BestBagTies')(run); t(ties.length === 2 && ties.includes(r1) && ties.includes(r2), '암시장: 희귀 둘이 동률로 잡히지 않는다 ' + ties);
  const h = R_('vMarket')(run, R); const btns = (h.match(/data-k="hero-item" data-u="[^"]+"/g) || []).length; t(btns === 2, '암시장: 장비 내놓기 단추가 둘이 아니다(' + btns + ')');
  click('mkbuy', 'hero-item', { u: r2 }); t(!run.inv[r2] && !!run.inv[r1] && !!run.inv[m1], '암시장: 고른 장비(두 번째 희귀)를 내놓지 않았다');
  const run2 = setup(2, null); run2.bag.length = 0; const it = E.g8Gen(run2, { g: 'r' }); run2.inv[it.uid] = it; run2.bag.push(it.uid); const R2 = { type: 'market', floor: 5 }; run2.cur = R2;
  t(!/data-k="hero-item" data-u=/.test(R_('vMarket')(run2, R2)), '암시장: 가장 좋은 것이 하나인데 단추가 여럿이다');
}
console.log('tiepick-check: 시험 ' + n + '개 · 실패 ' + T.length); for (const m of T) console.log('  실패: ' + m); if (T.length) process.exit(1);
