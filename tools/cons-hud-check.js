'use strict';
/* 전투 화면 빠른 소모품 칸 점검 (10월 24일 공개 직후 신고 "1챕터 10층에서 전투 시작 안 됨 · 이어하기도 안 됨").
   consReason이 방해 칸에서 받지 않은 c를 읽어 전투 화면을 그리다 멈췄다 → 모든 소모품 × 큰 공격을 모으는 적에서 consReason · consQuick이 예외 없이 글을 내는지 본다.
   쓰기: node tools/cons-hud-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'), E = D.G0, R_ = D.run_, G = E.__G;
const CONS = R_('CONS'), consReason = R_('consReason'), consQuick = R_('consQuick');
let n = 0; const bad = [];
G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('warden'); const run = G.run; delete run.alloc;
const es = ['bruiser', 'archer'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 500; e.intent = { k: 'heavy' }; }
const b = E.newBattle(run.p, es, {}); G.b = b; E.runUntilPlayer(b); for (const e of b.en) e.intent = { k: 'heavy' };
for (const id of Object.keys(CONS)) for (const g of ['n', 'm']) {
  const c = { id, n: 1, g }; n++;
  try { const t = consReason(b, CONS[id], c); if (t != null && typeof t !== 'string') bad.push(id + ': 글이 아님'); } catch (e) { bad.push(id + '/' + g + ': ' + e.message); }
}
{ run.cons = Object.keys(CONS).slice(0, 8).map(id => ({ id, n: 1, g: 'n' })); n++; try { const h = consQuick(b); if (typeof h !== 'string') bad.push('consQuick: 글이 아님'); } catch (e) { bad.push('consQuick: ' + e.message); } }
/* 10월 24일: 순찰대 보상 창이 소모품 설명 함수를 실행하지 않고 코드 글자로 찍었다 → 모든 소모품을 후보로 넣어 창 글에 코드가 없는지 */
{ const sheetParts = R_('sheetParts'); G.b = null; run.patrolPend = { cons: Object.keys(CONS) }; n++; try { const P = sheetParts({ kind: 'patrol', data: {} }); const h = JSON.stringify(P); if (/=>|=&gt;|Math.|function/.test(h)) bad.push('순찰대 창에 코드 글자: ' + (h.match(/.{0,30}(=>|Math.|function).{0,30}/) || [''])[0]); } catch (e) { bad.push('순찰대 창: ' + e.message); } }
console.log('cons-hud-check: ' + n + '개 · 실패 ' + bad.length + (bad.length ? '\n  ' + bad.slice(0, 10).join('\n  ') : ''));
process.exit(bad.length ? 1 : 0);
