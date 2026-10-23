'use strict';
/* 전리품 화면 · 야영지 상인 창 점검 (10월 24일 만든 사람 요청 개편)
   1 전리품: 챙긴 뒤 가방 미리 보기(consFitSim) · 가방과 자리 바꾸기(되돌릴 수 있게 가방 묶음은 두고 갈 쪽으로) · 들어오는 약초까지 세어 플라스크 채우기 · 전리품 바로 쓰기 · 챙기기
   2 야영지: 상인 단추 → 상인 창(소모품 사기 · 장비 손질 탭, 용도 거르기), 창 안에서 사기
   쓰기: node tools/loot-ui-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'), E = D.G0, R_ = D.run_, G = E.__G;
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
const click = (a, k, extra) => { const ds = Object.assign({ a }, k != null ? { k: String(k) } : {}, extra || {}); const el = { dataset: ds, checked: false, closest: () => null }; E.onClick({ target: { closest: () => el } }); };
function setup() { G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('warden'); const run = G.run; delete run.alloc; run.room = 8; run.cur = { type: 'camp' };
  run.cons = []; for (const [id, k] of [['cleanse', 1], ['chalk', 1], ['knot', 1], ['mugwort', 1], ['herb', 5]]) R_('consGrant')(run, id, 'n', k); return run; }
const ids = L => L.map(c => c.id + c.n).join(',');
{ // 1 전리품
  const run = setup(); run.p.flask.life = 0; run.p.hp = 10; run.consPending = [{ id: 'charm', g: 'n', n: 1 }, { id: 'herb', g: 'n', n: 2 }, { id: 'leaf', g: 'n', n: 1 }];
  t(ids(run.cons) === 'cleanse1,chalk1,knot1,mugwort1,herb5', '준비: 가방이 다섯 칸이 아니다 ' + ids(run.cons));
  let F = R_('consFitSim')(run, run.consPending, []); t(F.plan.join() === '0,0,0' && F.bag.length === 5, '미리 보기: 가득 찬 가방인데 들어간다 ' + F.plan);
  E.openSheet('consfull', {}); const d = G.sheet.data; let P = R_('sheetParts')(G.sheet); t(/class="ctile/.test(P[1]) && /data-a="cppick" data-k="loot:0"/.test(P[1]) && /data-a="cpswapsel"/.test(P[1]) && !/class="ctile[ "][^>]*>[^<]*<button/.test(P[1]), '전리품 창: 칸 · 칸 고르기 · 설명 줄의 자리 바꾸기가 없다(칸 안에 단추가 있으면 안 됨)'); click('cppick', 'loot:1'); P = R_('sheetParts')(G.sheet); t(/data-a="cpbrew"/.test(P[1]) && /cdet/.test(P[1]), '칸 고르기: 약초를 고르면 설명 줄에 채우기가 나와야 한다');
  click('cpswapsel', 0); t(d.sel === 0, '자리 바꾸기: 고른 전리품이 기억되지 않았다'); P = R_('sheetParts')(G.sheet); t((P[1].match(/data-a="cpswap"/g) || []).length === 5, '자리 바꾸기: 가방 칸마다 "여기와 바꾸기"가 없다');
  click('cpswap', 1); t(!run.cons.some(c => c.id === 'chalk') && run.consPending[3] && run.consPending[3].id === 'chalk' && d.skip.includes(3) && !d.skip.includes(0) && d.sel == null, '자리 바꾸기: 분필이 두고 갈 쪽으로 가지 않았다 ' + JSON.stringify(d.skip));
  F = R_('consFitSim')(run, run.consPending, d.skip); t(F.plan[0] === 1 && F.bag.some(c => c.isNew && c.id === 'charm'), '자리 바꾸기: 부적이 빈 칸에 들어가지 않는다 ' + F.plan);
  click('cptoggle', 3); F = R_('consFitSim')(run, run.consPending, d.skip); t(!d.skip.includes(3), '되돌리기: 뺀 분필을 다시 챙길 수 없다');
  click('cptoggle', 3);
  const h0 = run.p.hp; click('cpbrew', 'herb'); t(run.p.flask.life === 1 && !run.consPending.some(c => c.id === 'herb') && ids(run.cons.filter(c => c.id === 'herb')) === 'herb3', '채우기: 들어오는 약초 2 + 가방 2로 생명력 플라스크 한 칸이 아니다 ' + ids(run.cons) + ' / ' + ids(run.consPending) + ' / ' + run.p.flask.life);
  t(run.consPending.findIndex(c => c.id === 'chalk') === 2 && d.skip.includes(2), '채우기: 다 쓴 전리품을 뺀 뒤 "두고 감" 표시가 어긋났다 ' + JSON.stringify(d.skip));
  run.consPending.push({ id: 'herb', g: 'n', n: 1 }); const k = run.consPending.length - 1; click('cpusel', k); t(run.p.hp > h0 && !run.consPending.some(c => c.id === 'herb'), '바로 쓰기: 약초를 먹지 않았다 ' + h0 + ' → ' + run.p.hp);
  const before = run.cons.length; click('cptake'); t(!G.sheet || G.sheet.kind !== 'consfull', '챙기기: 창이 닫히지 않았다'); t(run.cons.some(c => c.id === 'charm') && !run.cons.some(c => c.id === 'chalk') && (run.consPending || []).length === 0, '챙기기: 부적이 들어가지 않았거나 분필이 남았다 ' + ids(run.cons));
  t(run.consGainLog.some(x => x.id === 'chalk' && x.swapOut === 1 && x.discarded === 1), '기록: 자리를 내준 분필이 기록에 없다');
  t(before >= 4, '');
}
{ // 2 야영지 상인 창
  const run = setup(); run.gold = 200; let it = E.g8Gen(run, { g: 'r' }); for (let j = 0; j < 30 && (it.uq || !(it.af || []).length); j++) it = E.g8Gen(run, { g: 'r' }); /* 고유는 다시 굴리기 대상이 아니다 */ run.inv[it.uid] = it; run.bag.push(it.uid);
  const v = R_('vCamp')(run); t(/data-a="campshop"/.test(v) && /data-a="rest"/.test(v) && /data-a="campleave"/.test(v) && !/data-a="consbuy"/.test(v), '야영지: 쉬기 · 상인 단추 · 내려가기만 있어야 한다');
  click('campshop'); t(G.sheet && G.sheet.kind === 'campshop' && G.sheet.data.tab === 'cons', '상인 단추: 상인 창이 열리지 않았다');
  let P = R_('sheetParts')(G.sheet); t(/data-a="consbuy" data-s="camp"/.test(P[1]) && /data-a="csgrp"/.test(P[1]) && /data-k="reroll"/.test(P[1]), '상인 창: 사기 단추 · 용도 거르기 · 장비 손질 탭이 없다');
  click('csgrp', 'restore'); P = R_('sheetParts')(G.sheet); const C = R_('campInit')(run); const nR = C.cons.filter(x => R_('consGroup')(R_('CONS')[x.id]) === 'restore').length; t((P[1].match(/class="cs-row/g) || []).length === nR, '용도 거르기: 회복·해제만 보이지 않는다');
  click('cstab', 'reroll'); P = R_('sheetParts')(G.sheet); t(/data-a="reroll"/.test(P[1]) && !/cs-row/.test(P[1]), '장비 손질 탭: 접사 다시 굴리기가 아니다');
  click('cstab', 'cons'); click('csgrp', 'all'); run.cons = run.cons.filter(c => c.id !== 'herb'); const hi = C.cons.findIndex(x => x.id === 'herb'); const g0 = run.gold; click('consbuy', hi, { s: 'camp' });
  t(run.gold < g0 && run.cons.some(c => c.id === 'herb') && G.sheet && G.sheet.kind === 'campshop', '상인 창에서 사기: 사지 못했거나 창이 닫혔다');
}
console.log('loot-ui-check: 시험 ' + n + '개 · 실패 ' + T.length); for (const m of T) console.log('  실패: ' + m); if (T.length) process.exit(1);
