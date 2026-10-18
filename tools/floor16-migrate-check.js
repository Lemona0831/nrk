'use strict';
/* 24층 → 16층 판 옮기기 점검 (10월 18일 0.8.0 6단계, 만든 사람 결정 5: "진행 중인 24층 판은 다음 방 진입 때 16층 틀로 비례 이관하고, 남은 갈림길은 새로 생성한다.
   이관 판의 보스 도달 레벨이 앵커 −1 이내인지 savecheck에 추가한다")
   1) 만들기: DGDIR=<24층 사본> node tools/floor16-migrate-check.js make <저장본.json> [--from3]
      24층 게임으로 판을 돌리며 여러 자리(방 사이 · 갈래길 · 야영지 · 전투 중, 1 · 3챕터)의 이어 하기 저장본을 뜬다
   2) 열기: node tools/floor16-migrate-check.js check <저장본.json>
      지금(16층) 게임으로 저장본마다 이어 하기를 누르고, 테스터로 그 챕터 끝까지 간다. 오류 · 옮긴 층 · 보스에 들어설 때의 레벨을 센다.
      판정: 오류 0, 보스에 닿은 판의 보스 진입 레벨 ≥ 앵커(6 · 11 · 16) − 1 */
const fs = require('fs');
const mode = process.argv[2] || 'check', FILE = process.argv[3] || 'saves24.json';
if (mode === 'make' && process.argv.includes('--from3')) process.env.DG_FROM = '3';
const D = require('./dgqa.js'); const { G0, OPT, playChar, playLoop, handleSheets, rng, run_ } = D;
const CLS = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'];
const ANCHOR = { 1: 6, 2: 11, 3: 16 };
if (mode === 'make') {
  const saves = []; const G = G0.__G; const CAP = [3, 7, 10, 12, 13, 17, 20, 23];
  for (const from of [+(process.env.DG_FROM || 1)]) { OPT.chapters = 1; // dgqa가 불러올 때 DG_FROM을 읽으므로 시작 챕터마다 따로 돌린다(--from3)
    CLS.forEach((build, i) => { for (let s = 0; s < 3; s++) {
      const got = {}; const take = why => { if (G.data.cur) saves.push({ why, build, from, room: G.run.room, lv: G.run.lv, ch: G.run.ch || 1, cur: JSON.parse(JSON.stringify(G.data.cur)) }); };
      OPT.onStep = G1 => { const f = G1.run.room; for (const c of CAP) if (!got[c] && f === c && (G1.run.doors || G1.run.cross || (G1.run.cur && G1.run.cur.type === 'camp'))) { got[c] = 1; take((G1.run.cross ? '갈래길 ' : G1.run.cur && G1.run.cur.type === 'camp' ? '야영지 ' : '방 사이 ') + f + '층'); } };
      OPT.onTurn = (G1, n) => { if (!got.fight && n === 3 && G1.run.room >= 14) { got.fight = 1; G0.saveBattle(); take('전투 중 ' + G1.run.room + '층'); } };
      try { playChar('careful', build, 31000 + i * 97 + s * 13 + from * 1000); } catch (e) { }
    } });
  }
  OPT.onStep = OPT.onTurn = null;
  fs.writeFileSync(FILE, JSON.stringify({ at: Date.now(), saves })); console.log('저장본 ' + saves.length + '개'); return;
}
const { saves } = JSON.parse(fs.readFileSync(FILE, 'utf8')); const G = G0.__G; const rows = [];
saves.forEach((sv, i) => {
  const row = { why: sv.why, build: sv.build, ch: sv.ch, room0: sv.room, lv0: sv.lv, errs: [] };
  try {
    G0.__rnd = rng(700 + i); run_('Math.random = __rnd');
    G.data = G0.blankData(); G.data.cur = JSON.parse(JSON.stringify(sv.cur)); G.run = null; G.b = null; G.sheet = null; G.dropQ = [];
    G0.resumeRun(); if (!G.run) throw new Error('이어 하기 뒤 캐릭터가 없음');
    row.room1 = G.run.room; row.dgv = G.run.dgv; if (G.run.dgv !== 3 && !G.b) row.errs.push('dgv ' + G.run.dgv);
    OPT.onStep = G1 => { if (row.bossLv == null && G1.run.cur && G1.run.cur.type === 'boss') row.bossLv = G1.run.lv; };
    if (G.b && !G.b.over) { let n = 0; while (!G.b.over && n++ < 300) { const L = G0.actionList(G.b).filter(x => x.ok && x.id !== 'flee'); G0.playerAct(G.b, L[0].id, null); } G0.battleContinue(); handleSheets('careful', rng(i)); if (G.run.dgv !== 3) row.errs.push('전투 뒤 dgv ' + G.run.dgv); }
    if (G.scr === 'run') { const out = { bugs: [], rooms: [], acts: 0 }; OPT.chapters = 1; playLoop('careful', rng(800 + i), out); row.errs.push(...out.bugs); }
    row.end = G.scr; row.room2 = G.run.room; row.lv2 = G.run.lv;
  } catch (e) { row.errs.push('예외 ' + (e && e.message)); }
  OPT.onStep = null; rows.push(row);
});
const bad = rows.filter(r => r.errs.length); const boss = rows.filter(r => r.bossLv != null); const okLv = boss.filter(r => r.bossLv >= ANCHOR[r.ch] - 1);
for (const r of bad.slice(0, 10)) console.log('✗ ' + r.build + ' ' + r.why + ': ' + r.errs.slice(0, 2).join(' / '));
console.log('옮긴 층: ' + [...new Set(rows.map(r => r.room0 + '→' + r.room1))].sort((a, b) => parseInt(a) - parseInt(b)).join(' '));
console.log(`저장본 ${rows.length}개, 오류 ${bad.length}개. 보스에 닿은 판 ${boss.length}개 중 보스 진입 레벨이 앵커 −1 이상 ${okLv.length}개. 보스 진입 레벨: ` + Object.entries(boss.reduce((m, r) => (m[r.ch + '챕터 Lv' + r.bossLv] = (m[r.ch + '챕터 Lv' + r.bossLv] || 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(', '));
process.exitCode = bad.length || okLv.length < boss.length ? 1 : 0;
