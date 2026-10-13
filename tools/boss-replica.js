'use strict';
/* 로그 구성 재현·요소 빼기 (10월 14일). 실제 플레이의 보스전 구성(능력치·스킬·장비·각인·그 전투에서 쓴 소모품)을 그대로 만들어
   보스 한 명과 싸우게 하고, 요소를 하나씩 빼서 처치까지 내 행동 수가 어떻게 달라지는지 본다. 규칙·수치는 바꾸지 않는다.
   변형: replay(관측된 행동 순서를 그대로 재생, 안 되는 행동은 판단 정책으로 대신) · full(전부) · -cons(소모품 없음) · -gear(시작 장비만) · -awk(각인 없음) · -stats(능력치를 추천 배분으로) · base(넷 다 뺌)
   소모품은 전투 시작 직전에 가진 것을 보스에게 모두 쓴다(실제 플레이어는 도중에 썼다. 대략의 근사).
   구성 파일은 로그에서 뽑은 JSON이라 숨겨진 직업 정보가 들어 있을 수 있다. 공개 저장소에 두지 않는다.
   실행: DGDIR=. node tools/boss-replica.js <구성.json> [시드 수=8]   (REPLAYALL=1이면 모든 변형이 관측된 행동 순서를 재생한다. ONLY=replay,full 처럼 변형을 골라 돌릴 수 있다. +가득은 생명력 가득 시작) */
process.env.DGDIR = process.env.DGDIR || '06a2';
const fs = require('fs'), D = require('./dgqa.js'), Q = require('./qa.js');
const G0 = D.G0, G = G0.__G, run_ = D.run_;
const CFG = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), NS = +(process.argv[3] || 8), PK = process.env.PK || 'careful';
const BOSS = { 1: 'abbot', 2: 'cryptlord', 3: 'queen' }, BLV = { 1: 4, 2: 8, 3: 12 };
function build(cfg, v, seed) {
  G0.__rnd = D.rng(seed * 31 + 7); run_('Math.random = __rnd');
  G.data = G0.blankData(); G.data.unlAll = 1; G.data.hardOpen = 1; G.cre = { name: 'rep', mode: cfg.mode }; G.dropQ = []; G.b = null; G.sheet = null;
  G0.startRun(cfg.build); const run = G.run, p = run.p;
  run.ch = cfg.ch; run.mode = cfg.mode; run.lv = cfg.lv; p.lv = cfg.lv;
  run.stats = Object.assign({}, cfg.stats);
  if (v.rec) { const tot = Object.values(cfg.stats).reduce((s, x) => s + x, 0); run.stats = G0.statRecommend ? G0.statRecommend(cfg.build, {}, tot) : run.stats; }
  G0.applyStats(p, run.stats);
  const T = G0.TREE2[cfg.build]; p.skills = T.starters.concat(cfg.skills);
  const miss = [];
  if (!v.nogear) cfg.gear.forEach((g, i) => { if (!g) return; const sl = ['weapon', 'armor', 'gloves', 'amulet', 'ring1', 'ring2', 'flask'][i]; if (!G0.ITEMS || !G0.ITEMS[g.tpl]) { miss.push(g.tpl); return; } if (g.tpl.startsWith('start_')) return; const it = G0.mkItem(g.tpl, { g: g.g, b: g.b, ch: g.ch }); G0.addItem(run, it); const w = G0.equipUid(run, it.uid, sl); if (w) miss.push(g.tpl + ':' + w); });
  G0.applyGear(run, true);
  run.awk = v.noawk ? [] : cfg.awk.slice(); p.awk = run.awk.slice();
  run.cons = []; if (!v.nocons) for (const [k, n] of Object.entries(cfg.cons)) { const [id, g] = k.split(':'); G0.consAdd(run, id, g, n); }
  p.hp = p.hpMax; p.st = p.stMax; p.flask = { life: 3, mana: 3, stam: 3 };
  if (!v.fullhp && cfg.hpIn != null) p.hp = Math.max(1, Math.round(p.hpMax * cfg.hpIn)); // 실제 플레이어가 들어간 생명력(낮은 생명력으로 들어가면 오히려 세지는 효과가 있다)
  return { run, p, miss };
}
function fight(cfg, v, seed) {
  let ri = 0, fb = 0;
  const { run, p, miss } = build(cfg, v, seed);
  const room = { boss: true, lv: BLV[cfg.ch], floor: 24, en: [], mode: cfg.mode }; if (cfg.ch >= 2) { room.ch = cfg.ch; room.names = run_('ENEMY_NAMES')[cfg.ch]; }
  const r = D.rng(seed); const b = G0.roomBattle(p, room, BOSS[cfg.ch], seed); b.rngF = r; b.stepMode = false;
  const boss = b.en.find(x => x.boss);
  for (let i = run.cons.length - 1; i >= 0; i--) { try { G0.consUse(b, run, i, boss.id); } catch (e) { } }
  const P = Q.PERSONAS[PK]; const mem = {}; let n = 0;
  while (!b.over && n++ < 250) {
    if ((v.replay || process.env.REPLAYALL) && ri < (cfg.seq || []).length) { const L = G0.actionList(b); const w = cfg.seq[ri++]; const x = L.find(y => y.id === w && y.ok); if (x) { try { G0.playerAct(b, w, b.en.find(e => e.boss && e.alive) ? boss.id : null); } catch (e) { return { bug: e.message }; } continue; } fb++; }
    const sr = r() < (P.mech || 0.5) ? Q.sigRule(b, r) : null;
    let [a, t] = D.ch2Pre(b, P, r) || D.ch3Pre(b, P, r) || sr || (P.look ? Q.lookahead(b, P, r) : Q.heuristic(b, P, r, mem));
    [a, t] = D.ch2Post(b, P, r, a, t);
    if (a === 'flee') { const L = G0.actionList(b).filter(x => x.ok && !x.pull && x.id !== 'flee'); a = L[0].id; t = null; }
    try { G0.playerAct(b, a, t); } catch (e) { return { bug: e.message }; }
  }
  return { win: b.over === 'win' ? 1 : 0, acts: b.rec.filter(x => x.k === 'act').length, miss, fb };
}
const VARS = { replay: { replay: 1 }, '-hp': { fullhp: 1 }, 'replay+가득': { replay: 1, fullhp: 1 }, full: {}, 'full+가득': { fullhp: 1 }, '-cons': { nocons: 1 }, '-gear': { nogear: 1 }, '-awk': { noawk: 1 }, '-stats': { rec: 1 }, base: { nocons: 1, nogear: 1, noawk: 1, rec: 1 } };
const rows = [];
for (const cfg of CFG) {
  const row = { id: cfg.id, build: cfg.build, mode: cfg.mode, ch: cfg.ch, obs: cfg.obsActs };
  for (const [name, v] of Object.entries(VARS)) {
    if (process.env.ONLY && !process.env.ONLY.split(",").includes(name)) continue;
    const A = [], W = [], F = []; let miss = [];
    for (let s = 0; s < NS; s++) { const o = fight(cfg, v, 500 + s * 17 + cfg.ch); if (o.bug) { row.bug = o.bug; continue; } A.push(o.acts); W.push(o.win); F.push(o.fb || 0); miss = o.miss; }
    const w = A.filter((_, i) => W[i]); row[name] = { acts: w.length ? Math.round(w.reduce((s, x) => s + x, 0) / w.length * 10) / 10 : null, min: w.length ? Math.min(...w) : null, win: Math.round(W.reduce((s, x) => s + x, 0) / Math.max(1, W.length) * 100), fb: Math.round(F.reduce((s, x) => s + x, 0) / Math.max(1, F.length) * 10) / 10 }; if (name === 'full' && miss.length) row.miss = miss;
  }
  rows.push(row); console.log(JSON.stringify(row));
}
