'use strict';
/* 0.8.0 M6-1 고유 장비 단위 시험 공통 도구 (tools/unique-check.js가 직업마다 tools/uqtest/<직업>.js를 부른다).
   fight(build, o): 고유 o.uq(배열)를 끼운 전투. o.only = 'rule'(규칙만) · 'cost'(대가만) · 'none'(기반 수치만) · 'uq'(규칙+대가) · 없으면 전부.
   규칙 시험은 보통 같은 장면을 only 'rule'과 'none'으로 두 번 돌려 차이를 본다(대가는 'cost'와 'none'). o.own · o.ks(패시브) · o.act(액티브 칸) · o.en(적 역할) · o.hp(적 체력) · o.ehp(적 붕괴 상한) */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('../dgqa.js'), E = D.G0, R_ = D.run_;
R_('GEAR8.on = true');
const G = E.__G; const C = { n: 0, fail: [] };
const ok = (c, m) => { if (c) C.n++; else C.fail.push(m); };
function equip(run, ids) {
  for (const id of ids || []) { const it = E.mkUq(id); run.inv[it.uid] = it; const sl = R_('UNIQUE')[id].slot; const s = sl === 'ring' ? (run.eqU.ring1 && run.inv[run.eqU.ring1] && run.inv[run.eqU.ring1].g8 ? 'ring2' : 'ring1') : sl; run.eqU[s] = it.uid; }
  E.applyGear(run, true);
}
function setOnly(p, only) { if (p.g8) p.g8 = Object.assign({}, p.g8, { only }); }
function fight(build, o) {
  o = o || {}; G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun(build); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.ptree.own.push(...(o.own || [])); run.ptree.ks.push(...(o.ks || [])); E.ptSync(run);
  run.atree.own = (o.act || []).slice(); run.skills = (o.act || []).filter(id => (E.atBuild(build).nodes[id] || {}).kind === 'skill').slice(-4); E.atSync(run);
  equip(run, o.uq); setOnly(run.p, o.only); if (run.p.g8 || o.uq) { run.p.hpMax = R_('calcHpMax')(run.p); run.p.stMax = R_('calcStMax')(run.p); run.p.hp = run.p.hpMax; run.p.st = run.p.stMax; }
  const es = (o.en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = o.hp || 5000; e.dmg = o.edmg != null ? o.edmg : 1; e.brkMax = o.ebrk || 99999; }
  if (o.setup) o.setup(run, es);
  const b = E.newBattle(run.p, es, o.ctx || {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
/* 내 행동 하나(적 차례는 돌리지 않는다). 유산 · 스태미나를 채우고 쓴다. 차례가 이어지면 true */
const act = (f, id, e) => { const b = f.b; b.p.ys = Math.max(b.p.ys || 0, 9); b.p.st = b.p.stMax; b.stepMode = true; const t0 = b.turnIdx; E.playerAct(b, id, e === undefined ? (f.es[0] && f.es[0].id) : e && e.id != null ? e.id : e); b.stepMode = false; return b.turnIdx === t0; };
const next = f => { f.b.stepMode = false; E.runUntilPlayer(f.b); };
/* 적 e가 나를 친다(raw 피해, x: { charged, dot, ... }) → 받은 피해 */
const enemyHit = (f, e, raw, x) => { const b = f.b, cur = b.cur; b.cur = null; const d = E.hurtPlayer(b, raw, Object.assign({ src: e }, x || {})); b.cur = cur; return d; };
const st = (u, k) => R_('st')(u, k);
module.exports = { E, R_, D, G, C, ok, fight, equip, setOnly, act, next, enemyHit, st, assert };
