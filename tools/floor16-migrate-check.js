'use strict';
/* 24층 → 16층 판 옮기기 점검 (10월 18일 0.8.0 6단계, 만든 사람 결정 5: "진행 중인 24층 판은 다음 방 진입 때 16층 틀로 비례 이관하고, 남은 갈림길은 새로 생성한다.
   이관 판의 보스 도달 레벨이 앵커 −1 이내인지 savecheck에 추가한다")
   1) 만들기: DGDIR=<24층 사본> node tools/floor16-migrate-check.js make <저장본.json> [--from3]
      24층 게임으로 판을 돌리며 여러 자리(방 사이 · 갈래길 · 야영지 · 전투 중, 1 · 3챕터)의 이어 하기 저장본을 뜬다
   2) 열기: node tools/floor16-migrate-check.js check <저장본.json>
      지금(16층) 게임으로 저장본마다 이어 하기를 누르고, 테스터로 그 챕터 끝까지 간다. 오류 · 옮긴 층 · 보스에 들어설 때의 레벨을 센다.
      판정: 오류 0, 그리고 보스 진입 레벨 ≥ 앵커(6 · 11 · 16) − 1인 판의 비율이 같은 시작 · 같은 시드의 자연 판(지금 게임으로 처음부터)보다 10%p 넘게 낮지 않다.
      앵커 −1을 판마다 걸면 자연 판도 떨어진다(3챕터 바로 시작 자연 판의 보스 진입 레벨 중앙 15, 평균 15.1). 3챕터 저장본은 check에도 --from3 */
const fs = require('fs');
const mode = process.argv[2] || 'check', FILE = process.argv[3] || 'saves24.json';
if (mode === 'check' && !fs.existsSync(FILE)) { console.log('저장본 파일 없음(' + FILE + '): 24층 판 옮기기 측정은 make 단계 산출물이 있어야 돈다. 0.8.0 전체 초기화로 24층 판이 남지 않아 회귀 점검에서는 건너뜀(M8 판정: 이월 — 초기화 확정 뒤 폐기)'); process.exit(0); }
if (process.argv.includes('--from3')) process.env.DG_FROM = '3';
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
{ const g = {}; for (const r of boss) { const k = r.ch + '챕터 ' + r.why.replace(/[0-9]+층$/, '') + r.room0 + '→' + r.room1 + '층'; const s = g[k] = g[k] || { n: 0, ok: 0, lv0: 0, lv: 0 }; s.n++; s.lv0 += r.lv0; s.lv += r.bossLv; if (r.bossLv >= ANCHOR[r.ch] - 1) s.ok++; }
  console.log('저장 자리별(보스에 닿은 판): ' + Object.entries(g).map(([k, s]) => `${k} ${s.ok}/${s.n} (저장 때 Lv ${(s.lv0 / s.n).toFixed(1)} → 보스 Lv ${(s.lv / s.n).toFixed(1)})`).join(' · ')); }
// 자연 판: 저장본을 뜬 판과 같은 시작 · 같은 시드를 지금 게임으로 처음부터
const nat = []; OPT.chapters = 1; const from = +(process.env.DG_FROM || 1);
CLS.forEach((build, i) => { for (let s = 0; s < 3; s++) { let lv = null; OPT.onStep = G1 => { if (lv == null && G1.run.cur && G1.run.cur.type === 'boss') lv = G1.run.lv; }; try { playChar('careful', build, 31000 + i * 97 + s * 13 + from * 1000); } catch (e) { } if (lv != null) nat.push({ ch: from === 3 ? 3 : 1, lv }); } });
OPT.onStep = null; let fail = bad.length > 0;
for (const ch of [...new Set(boss.map(r => r.ch))]) { const m = boss.filter(r => r.ch === ch), n = nat.filter(r => r.ch === ch); const mr = m.filter(r => r.bossLv >= ANCHOR[ch] - 1).length / m.length, nr = n.length ? n.filter(r => r.lv >= ANCHOR[ch] - 1).length / n.length : 0;
  const ok = mr >= nr - 0.10; if (!ok) fail = true; console.log(`${ch}챕터 앵커 −1 이상: 옮긴 판 ${Math.round(mr * 100)}% (${m.length}판) · 자연 판 ${Math.round(nr * 100)}% (${n.length}판) → ${ok ? '통과' : '미달'}`); }
console.log('판정: ' + (fail ? '미달' : '통과'));
process.exitCode = fail ? 1 : 0;
