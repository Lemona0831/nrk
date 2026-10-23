'use strict';
/* 직업 판단 칸 구분 점검 (10월 17일 측정 도구 보완, docs/검증/0.8.0-측정도구-보완-2026-10-17.md)
   tools/qa.js(전투 판단)와 tools/sitqa.js equipFor(상황별 장착)의 직업 전용 칸은 이름표(qa.js GATE.on)를 남긴다. 이 점검은
   1) 본디 표본: 직업마다 자기 스킬 묶음(갈래마다 깊은 4칸 · 얕은 4칸, 마검사는 강화 · 이끄는 갈래를 붙인 판도)으로 50상황(1챕터 전부 + 2 · 3챕터 다섯에 하나)을
      신중 · 대충(휴리스틱) · 숙련(한 수 앞, 1챕터 열 상황)으로 싸워, 어떤 칸이 걸렸는지 직업마다 센다. 칸 주인이 아닌 직업에서 걸리면 실패.
   2) 섞은 표본(효과가 겹칠 때): 직업 X에 다른 직업 Y의 스킬을 끼워 같은 판단을 돌린다. 스킬 효과만 보고 걸리는 칸이 있으면 X에서 Y의 칸이 걸려 실패한다
      (4단계 재검증의 버그: 해금 1 칸이 혈향 · 혈풍참을 낀 마검사에게 걸림).
   3) 전후 비교: 같은 시드로 보완 전 조건(GATE.legacy)과 지금 조건을 모두 돌려, 보완 전에 남의 칸이 걸리지 않은 전투는 행동이 하나도 다르지 않아야 한다
      (의도한 직업의 판단은 그대로). 남의 칸이 걸린 전투만 바뀔 수 있고, 그 수를 직업마다 적는다.
   4) 장착(equipFor)도 같은 세 가지를 본다.
   실행: node tools/qa-class-gate-check.js [--legacy]   (--legacy: 보완 전 조건으로 1 · 2를 돌려 이 점검이 새는 칸을 잡는지 본다. 이때는 실패가 정상) */
process.env.DGDIR = process.env.DGDIR || '.';
process.env.SIT_CLS = process.env.SIT_CLS || 'spellblade';
const S = require('./sitqa.js'); const D = require('./dgqa.js'); const Q = require('./qa.js'); const SITS = require('./situations.js');
const G0 = D.G0, run_ = D.run_;
const LEGACY_RUN = process.argv.includes('--legacy');
const CLASSES = Object.keys(G0.BUILDS).filter(k => !G0.BUILDS[k].tut && !G0.BUILDS[k].soon && setsOf(k).length); // M8(10월 23일): 방사 트리 스킬이 없는 숨은 직업 셋은 뺀다
const ENAMES = run_('typeof ENEMY_NAMES !== "undefined" ? ENEMY_NAMES : {}');
const SITL = SITS.SIT.map(s => [1, s]).concat(SITS.SIT2.filter((s, i) => i % 5 === 0).map(s => [2, s]), SITS.SIT3.filter((s, i) => i % 5 === 0).map(s => [3, s]));
const ownerOk = (cls, owner) => owner === '*' || (Array.isArray(owner) ? owner.includes(cls) : owner === cls);
const ownerName = o => Array.isArray(o) ? o.join('/') : o;

/* 직업의 스킬 묶음: 갈래마다 깊은 4칸 · 얕은 4칸 (트리 스킬 노드만) */
function setsOf(cls) {
  const A = G0.atBuild(cls); const ids = Object.keys(A.nodes).filter(id => A.nodes[id].kind === 'skill' && G0.SK2[id]);
  const depth = id => (A.nodes[id].ring || 0) * 100 + ((A.nodes[id].pos && A.nodes[id].pos.r) || G0.SK2[id].row || 0);
  const out = []; for (const br of G0.TREE2[cls].branches) { const L = ids.filter(id => A.nodes[id].br === br).sort((a, b) => depth(b) - depth(a) || (a < b ? -1 : 1)); if (!L.length) continue; out.push({ br, eq: L.slice(0, 4), all: L }); if (L.length > 4) out.push({ br, eq: L.slice(-4), all: L }); }
  return out;
}
const upsFor = (cls, eq) => { const A = G0.atBuild(cls); return Object.keys(A.nodes).filter(u => A.nodes[u].kind === 'upgrade' && eq.includes(A.nodes[u].on)).sort(); };
const statsOf = (cls, lv) => G0.statRecommend && G0.STAT_START ? G0.statRecommend(cls, {}, G0.STAT_START + G0.LV_POINTS * (lv - 1)) : { str: lv, dex: lv, int: lv };

/* 전투 하나: 판단(행동 · 대상)의 줄과 걸린 칸을 돌려준다 */
function battle(cls, eq, opt, ch, sit, pk, seed, legacy) {
  Q.GATE.legacy = legacy; const tags = []; Q.GATE.on = (b0, owner, name) => tags.push([b0, owner, name]);
  const r = D.rng(seed); G0.__rnd = D.rng(seed * 31 + 7); run_('Math.random = __rnd');
  const lv = ch >= 3 ? 12 : ch >= 2 ? 7 : 5; const T = G0.TREE2[cls];
  const p = G0.mkPlayer(cls, {}, statsOf(cls, lv), T.starters.concat(eq)); p.lv = lv; G0.applyStats(p, statsOf(cls, lv)); p.hp = p.hpMax; p.st = p.stMax;
  if (opt.aup) { p.aup = opt.aup.slice(); p.pn = (p.pn || []).concat(opt.pn || []); p.sbLead = opt.lead || null; }
  const sp = sit.p || {}; if (sp.hp) p.hp = Math.round(p.hpMax * sp.hp); if (sp.st != null) p.st = sp.st; for (const k in (sp.s || {})) p.s[k] = { stacks: sp.s[k], until: 1e9, dur: 1e9 };
  const room = JSON.parse(JSON.stringify(sit.room)); const bossKind = room.boss || null; if (room.boss) room.boss = true;
  room.lv = (sit.lv && sit.lv[lv]) || (ch >= 3 ? 11 : ch >= 2 ? 7 : 6); room.floor = 13; if (ch >= 2) { room.ch = ch; room.names = ENAMES[ch]; } if (!room.en) room.en = [];
  const dec = []; let err = null;
  try {
    const b = G0.roomBattle(p, room, bossKind, seed); b.rngF = r; b.stepMode = false; const P = Q.PERSONAS[pk]; const mem = {}; let n = 0;
    while (!b.over && n++ < (opt.maxAct || 40)) {
      const sr = r() < (P.mech || 0.5) ? Q.sigRule(b, r) : null;
      let [a, t] = D.ch2Pre(b, P, r) || D.ch3Pre(b, P, r) || sr || (P.look ? Q.lookahead(b, P, r) : Q.heuristic(b, P, r, mem));
      [a, t] = D.ch2Post(b, P, r, a, t);
      if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[0].id; t = null; }
      dec.push(a + '>' + (t || '')); G0.playerAct(b, a, t);
    }
  } catch (e) { err = String(e.message).slice(0, 80); }
  Q.GATE.on = null; Q.GATE.legacy = false;
  return { dec: dec.join(' '), tags, err };
}
/* 장착 하나 */
function equip(cls, open, sit, legacy) { Q.GATE.legacy = legacy; const tags = []; Q.GATE.on = (b0, owner, name) => tags.push([b0, owner, name]); let pick = null, err = null; try { pick = S.equipFor({ cls, open, br: null, lv: 10 }, sit).join(','); } catch (e) { err = e.message; } Q.GATE.on = null; Q.GATE.legacy = false; return { pick, tags, err }; }

const fired = {}; const leaks = []; const cmp = {}; let fails = 0; const errs = {};
const note = (cls, tags, where) => { for (const [b0, owner, name] of tags) { const k = ownerName(owner) + ':' + name; ((fired[cls] = fired[cls] || {})[k] = (fired[cls][k] || 0) + 1); if (!ownerOk(b0, owner)) leaks.push(`${where}: ${b0}에서 ${ownerName(owner)} 칸 ${name}`); } };
const t0 = Date.now();
for (const cls of CLASSES) {
  const C = cmp[cls] = { n: 0, leakL: 0, chg: 0, chgClean: 0, eqN: 0, eqLeakL: 0, eqChg: 0, eqChgClean: 0 };
  const sets = setsOf(cls); const opts = [{}]; if (upsFor(cls, sets[0].eq).length) opts.push(null); // 강화가 있는 트리: 강화 · 이끄는 갈래를 붙인 판도
  for (const st of sets) for (const o0 of opts) {
    const opt = o0 || { aup: upsFor(cls, st.eq), pn: ['n_sb_edgeadd'], lead: st.br };
    SITL.forEach(([ch, sit], si) => {
      for (const pk of ['careful', 'casual', 'expert']) {
        if (pk === 'expert' && !(ch === 1 && si % 5 === 0)) continue; // 한 수 앞은 느려서 1챕터 열 상황만
        const seed = 7000 + sit.id * 31 + si * 7 + (pk === 'casual' ? 1 : 0);
        const L = battle(cls, st.eq, opt, ch, sit, pk, seed, true); const N = LEGACY_RUN ? L : battle(cls, st.eq, opt, ch, sit, pk, seed, false);
        if (L.err) errs[cls + ' 보완 전'] = (errs[cls + ' 보완 전'] || 0) + 1; if (N.err && !LEGACY_RUN) errs[cls] = (errs[cls] || 0) + 1;
        const where = `${cls} ${st.br}${o0 ? '' : '+강화'} ${ch}챕터 상황 ${sit.id} ${pk}`;
        note(cls, N.tags, where);
        const leakL = L.tags.some(([b0, owner]) => !ownerOk(b0, owner)); C.n++; if (leakL) C.leakL++;
        if (!LEGACY_RUN && L.dec !== N.dec) { C.chg++; if (!leakL) { C.chgClean++; if (C.chgClean <= 3) console.log(`  의도한 직업의 판단이 바뀜: ${where}`); } }
      }
    });
    for (const [ch, sit] of SITL.filter(([ch]) => ch === 1)) { // 장착
      const L = equip(cls, st.all, sit, true); const N = LEGACY_RUN ? L : equip(cls, st.all, sit, false); C.eqN++;
      note(cls, N.tags, `${cls} ${st.br} 장착 상황 ${sit.id}`); const leakL = L.tags.some(([b0, owner]) => !ownerOk(b0, owner)); if (leakL) C.eqLeakL++;
      if (!LEGACY_RUN && L.pick !== N.pick) { C.eqChg++; if (!leakL) C.eqChgClean++; }
      if (N.err) errs[cls + ' 장착'] = (errs[cls + ' 장착'] || 0) + 1;
    }
  }
}
/* 섞은 표본: X에 Y의 깊은 4칸을 끼운다(1챕터 열 상황, 신중 · 대충). 지금 조건에서 남의 칸이 걸리면 실패. 보완 전 조건에서 걸린 수도 센다 */
const cross = {}; const crossLeakL = {};
for (const X of CLASSES) for (const Y of CLASSES) {
  if (X === Y) continue; const ys = setsOf(Y)[0]; if (!ys) continue;
  SITL.filter(([ch], i) => ch === 1 && i % 5 === 0).forEach(([ch, sit]) => {
    for (const pk of ['careful', 'casual']) {
      const seed = 9000 + sit.id * 31; const N = battle(X, ys.eq, {}, ch, sit, pk, seed, LEGACY_RUN); note(X, N.tags, `섞음 ${X}+${Y}스킬 상황 ${sit.id} ${pk}`);
      cross[X] = (cross[X] || 0) + 1;
      if (!LEGACY_RUN) { const L = battle(X, ys.eq, {}, ch, sit, pk, seed, true); for (const [b0, owner, name] of L.tags) if (!ownerOk(b0, owner)) { const k = X + ' ← ' + ownerName(owner) + ':' + name; crossLeakL[k] = (crossLeakL[k] || 0) + 1; } }
    }
  });
  { const N = equip(X, setsOf(X)[0].all.concat(ys.all), SITS.SIT[2], LEGACY_RUN); note(X, N.tags, `섞음 장착 ${X}+${Y}`); if (!LEGACY_RUN) { const L = equip(X, setsOf(X)[0].all.concat(ys.all), SITS.SIT[2], true); for (const [b0, owner, name] of L.tags) if (!ownerOk(b0, owner)) { const k = X + ' ← ' + ownerName(owner) + ':' + name; crossLeakL[k] = (crossLeakL[k] || 0) + 1; } } }
}
console.log(`직업 판단 칸 구분 점검 (${LEGACY_RUN ? '보완 전 조건' : '지금 조건'}), ${((Date.now() - t0) / 1000).toFixed(0)}초`);
console.log('직업마다 걸린 칸 (주인:칸 이름 횟수):');
for (const cls of CLASSES) console.log(`  ${cls.padEnd(13)} ` + Object.entries(fired[cls] || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' · '));
if (!LEGACY_RUN) {
  console.log('전후 비교 (같은 시드, 보완 전 조건 → 지금 조건): 전투 수 · 보완 전에 남의 칸이 걸린 전투 · 행동이 바뀐 전투 · 그 가운데 남의 칸이 걸리지 않았던 전투(0이어야 함) | 장착 같은 넷');
  for (const cls of CLASSES) { const C = cmp[cls]; console.log(`  ${cls.padEnd(13)} ${C.n} · ${C.leakL} · ${C.chg} · ${C.chgClean} | 장착 ${C.eqN} · ${C.eqLeakL} · ${C.eqChg} · ${C.eqChgClean}`); if (C.chgClean || C.eqChgClean) fails++; }
  console.log('섞은 표본에서 보완 전 조건이면 걸렸을 남의 칸: ' + (Object.keys(crossLeakL).length ? Object.entries(crossLeakL).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' · ') : '없음'));
}
console.log(`섞은 표본: 직업마다 전투 ${Object.values(cross)[0] || 0}개 (다른 직업 스킬을 끼움)`);
if (Object.keys(errs).length) console.log('엔진 예외(섞은 스킬을 엔진이 받지 못한 전투, 판단 점검과 무관): ' + Object.entries(errs).map(([k, n]) => k + ' ' + n).join(' · '));
const uniq = [...new Set(leaks)];
if (uniq.length) { console.log(`남의 칸이 걸림 ${leaks.length}번 (서로 다른 곳 ${uniq.length}):`); for (const s of uniq.slice(0, 20)) console.log('  ' + s); fails += uniq.length; }
else console.log('남의 칸이 걸림: 0');
console.log(fails ? `결과: 실패 ${fails}` : '결과: 통과 — 직업 전용 칸은 그 직업에서만 걸리고, 보완 전후로 의도한 직업의 판단 · 장착은 같다');
process.exit(fails ? 1 : 0);
