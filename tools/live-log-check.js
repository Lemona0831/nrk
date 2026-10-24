'use strict';
/* 행동 기록 실시간 점검 (10월 24일 만든 사람 요청). 쓰기: node tools/live-log-check.js. 실패가 있으면 1로 끝난다
   1 전투 중 liveSync가 그동안의 행동을 판 기록(run.acts)에 붙이고 보내기(syncRun)를 부른다
   2 새 행동이 없으면 보내지 않는다
   3 전투가 끝날 때(afterBattle) 이미 붙인 행동을 다시 붙이지 않는다
   4 화면 오류(liveErr)는 판 기록에 '오류' 한 줄로 남고 바로 보내며, 5초 안의 두 번째 오류는 버린다
   dgqa는 syncRun을 빈 함수로 둔다 — 여기서는 불린 횟수와 그때 행동 수를 센다(실제 쓰기는 기존 syncRun) */
process.env.DGDIR = process.env.DGDIR || '.';
const D = require('./dgqa.js'), E = D.G0, R_ = D.run_, G = E.__G;
let n = 0; const bad = []; const ok = (c, m) => { n++; if (!c) bad.push(m); };
R_('globalThis.__syncs = []; syncRun = async r => { globalThis.__syncs.push(r.acts.length); return true; }'); const syncs = () => R_('globalThis.__syncs');
G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('warden'); const run = G.run; delete run.alloc; run.acts = [];
const es = ['bruiser', 'archer'].map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; }
const b = E.newBattle(run.p, es, {}); G.b = b; b.stepMode = false; E.runUntilPlayer(b);
const liveSync = R_('liveSync'), liveErr = R_('liveErr'), afterBattle = R_('afterBattle');
E.playerAct(b, 'basic', es[0].id); E.runUntilPlayer(b); E.playerAct(b, 'basic', es[0].id); E.runUntilPlayer(b);
const recN = b.rec.length; ok(recN > 0, '전투 기록이 생김');
liveSync(); ok(run.acts.length === recN, '전투 중 liveSync가 행동 ' + recN + '건을 붙임 (' + run.acts.length + ')');
ok(syncs().length === 1 && syncs()[0] === recN, '보내기를 부름(그때 행동 ' + syncs().join(',') + ')');
liveSync(); ok(syncs().length === 1, '새 행동이 없으면 보내지 않음');
E.playerAct(b, 'basic', es[0].id); E.runUntilPlayer(b); const recN2 = b.rec.length;
b.over = 'win'; afterBattle(); ok(run.acts.length === recN2, '전투가 끝날 때 이미 붙인 행동을 다시 붙이지 않음 (' + run.acts.length + ' = ' + recN2 + ')');
const s1 = syncs().length; G.liveErrT = 0; liveErr('c is not defined', '52-battle-hud.js:424:107');
const er = run.acts.filter(x => x.k === 'err'); ok(er.length === 1 && er[0].msg === 'c is not defined' && er[0].at.includes('52-battle-hud') && er[0].r === run.room, '오류 한 줄: ' + JSON.stringify(er[0] || null));
ok(syncs().length === s1 + 1, '오류는 바로 보냄');
liveErr('두 번째', ''); ok(run.acts.filter(x => x.k === 'err').length === 1, '5초 안의 두 번째 오류는 버림');
console.log('live-log-check: ' + n + '개 · 실패 ' + bad.length + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
process.exit(bad.length ? 1 : 0);
