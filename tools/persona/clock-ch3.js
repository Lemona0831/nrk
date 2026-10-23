'use strict';
/* G-1 3챕터 강적 시계: 테스터의 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련에서 시계가 마지막 경고 칸일 때 부른다).
   (b, e, G0, r) → [행동 id, 대상 id] | null. 2판 · 3판(봉화대장 · 대변인): 한 행동으로 드는 결정적 답 가운데 가장 값싼 것(비공개 문서 참조).
   값싼 순서: 흘리기 · 플라스크(행동 하나, 자원이 적게 든다) → 끝낼 수 있는 가장 작은 붕괴 → 광역 · 원거리. 결정적 답이 없으면 평소 답(작은 되감기)이나 null */
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee');
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk || 0 : 0), 0) : 0;
const dmgOf = x => x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const pick = (x, t) => [x.id, x.aoe ? null : t ? t.id : null];
const ready = (b, G0, t, f) => acts(b, G0).filter(x => !x.self && G0.canTarget(b, t, x) && f(x));
const cost = x => (x.v2 && x.s && x.s.cost) || (x.id === 'basic' ? 0 : 1); // 같은 종류 안에서 고를 때만 쓴다
/* 붕괴 행동: 끝낼 수 있으면 그 가운데 가장 작은 것(finishOnly면 끝낼 수 없을 때 null), 아니면 가장 큰 것. mul: 3판 강적은 3챕터 붕괴 배율(w3BrkMul)을 넣어 끝낼 수 있는지 본다 */
function brkOn(b, G0, t, finishOnly, mul) {
  const need = ((t.brkMax || 0) - (t.brk || 0)) / ((mul && G0.w3BrkMul && G0.w3BrkMul(b, t)) || 1); const L = ready(b, G0, t, x => brkOf(x) > 0).sort((x, y) => brkOf(x) - brkOf(y));
  const fin = L.find(x => brkOf(x) >= need); if (fin) return pick(fin, t); if (finishOnly || !L.length) return null; return pick(L[L.length - 1], t);
}
const parry = (b, G0, e) => { const d = acts(b, G0).find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
const buildOf = b => (b.p && b.p.build) || '';
const rangedBuild = b => ['hunter', 'elementalist'].includes(buildOf(b));
const farOf = (b, x) => !!(x.aoe || (x.v2 && x.s && x.s.tgt === 'ranged') || rangedBuild(b)); // 게임의 w3Melee가 근접으로 보지 않는 행동
module.exports = {
  beaconlord(b, e, G0) { // 3판
    const fin = brkOn(b, G0, e, 1, 1); if (fin) return fin; // 봉화대장을 한 행동으로 무너뜨리기(기름통)
    const f = G0.alive(b).filter(x => x.role === 'bonfire').sort((x, y) => x.fuse - y.fuse)[0];
    if (f) { const L = ready(b, G0, f, x => dmgOf(x) && farOf(b, x)).sort((x, y) => cost(x) - cost(y)); if (L.length) return pick(L[0], f); } // 곧 터질 봉화에 원거리 · 광역 한 번
    return null;
  },
  siege(b, e, G0) {
    if (e.intent && e.intent.k === 'launch') { const p = parry(b, G0, e); if (p) return p; } // 발사 예고에 흘리기
    for (const part of G0.alive(b).filter(x => x.role === 'rampart').sort((x, y) => (y.brk || 0) - (x.brk || 0))) { const a = brkOn(b, G0, part, 1); if (a) return a; } // 부품을 한 행동으로
    return null;
  },
  speaker(b, e, G0) { // 3판
    const fin = brkOn(b, G0, e, 1, 1); if (fin) return fin; // 대변인을 한 행동으로 무너뜨리기
    if (acts(b, G0).some(x => x.id === 'tossgold')) return ['tossgold', null]; // 골드
    const R = G0.alive(b).filter(x => x.role === 'rioter' && !x.strong).sort((x, y) => x.hp - y.hp);
    if (e.clk.backR !== (b.round || 0)) for (const x of R) { const L = ready(b, G0, x, dmgOf); const h = L.find(y => y.id === 'heavy') || L.find(y => y.id === 'basic') || L[0]; if (h) return pick(h, x); } // 평소 답: 폭도 하나(라운드에 한 번)
    if (e.intent && ['rally3', 'incite', 'shout'].includes(e.intent.k)) { const g = acts(b, G0).find(x => x.id === 'guard'); if (g) return ['guard', null]; } // 답이 없으면 밀어닥침을 막는다
    return null;
  },
  marksman(b, e, G0) {
    if (e.intent && e.intent.k === 'oneshot') { const p = parry(b, G0, e); if (p) return p; } // 한 발 예고에 흘리기
    if (!e.dropT) { const fin = brkOn(b, G0, e, 1); if (fin) return fin; } // 조준 중 무너뜨리기
    const L = ready(b, G0, e, x => dmgOf(x) && (x.aoe || x.ranged || (x.v2 && x.s && x.s.tgt === 'ranged') || (rangedBuild(b) && !x.melee))).sort((x, y) => cost(x) - cost(y)); // 원거리 · 광역 한 번
    return L.length ? pick(L[0], e) : null;
  },
  wallcap(b, e, G0) {
    if ((b.p.taint || 0) > 0) {
      const fl = acts(b, G0).find(x => x.id === 'flaskM'); if (fl) return ['flaskM', null]; // 정화 플라스크
      const cl = acts(b, G0).find(x => x.v2 && x.s && x.s.fx.some(f => f.k === 'cleanse')); if (cl) return [cl.id, cl.self || cl.aoe ? null : e.id]; // 정화 스킬
    }
    const K = G0.alive(b).filter(x => x.role === 'brick' && !x.fallen).sort((x, y) => (y.brk || 0) - (x.brk || 0));
    for (const k of K) { const a = brkOn(b, G0, k, 1); if (a) return a; } // 벽돌 하나를 한 행동으로
    return K.length ? brkOn(b, G0, K[0]) : null;
  },
};
