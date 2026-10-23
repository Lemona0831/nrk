'use strict';
/* G-1 3챕터 강적 시계: 테스터의 답 고르기(tools/dgqa.js clockPre가 신중 · 숙련에서 시계가 마지막 경고 칸일 때 부른다).
   (b, e, G0, r) → [행동 id, 대상 id] | null. 2판: 한 행동으로 드는 결정적 답 가운데 가장 값싼 것(비공개 문서 참조).
   값싼 순서: 흘리기 · 플라스크(행동 하나, 자원이 적게 든다) → 끝낼 수 있는 가장 작은 붕괴 → 광역 · 원거리. 결정적 답이 없으면 평소 답(작은 되감기)이나 null */
const acts = (b, G0) => G0.actionList(b).filter(x => x.ok && x.id !== 'flee');
const brkOf = x => x.id === 'heavy' ? 35 : x.v2 && x.s ? x.s.fx.reduce((m, f) => m + (f.k === 'brk' ? f.n : f.k === 'cutx' ? f.brk || 0 : 0), 0) : 0;
const dmgOf = x => x.id === 'basic' || x.id === 'heavy' || (x.v2 && x.s && x.s.fx.some(f => f.k === 'dmg'));
const pick = (x, t) => [x.id, x.aoe ? null : t ? t.id : null];
const ready = (b, G0, t, f) => acts(b, G0).filter(x => !x.self && G0.canTarget(b, t, x) && f(x));
const cost = x => (x.v2 && x.s && x.s.cost) || (x.id === 'basic' ? 0 : 1); // 같은 종류 안에서 고를 때만 쓴다
/* 붕괴 행동: 끝낼 수 있으면 그 가운데 가장 작은 것(finishOnly면 끝낼 수 없을 때 null), 아니면 가장 큰 것 */
function brkOn(b, G0, t, finishOnly) {
  const need = (t.brkMax || 0) - (t.brk || 0); const L = ready(b, G0, t, x => brkOf(x) > 0).sort((x, y) => brkOf(x) - brkOf(y));
  const fin = L.find(x => brkOf(x) >= need); if (fin) return pick(fin, t); if (finishOnly || !L.length) return null; return pick(L[L.length - 1], t);
}
const aoeOn = (b, G0, t) => { const L = ready(b, G0, t, x => x.aoe && (dmgOf(x) || brkOf(x) > 0)).sort((x, y) => cost(x) - cost(y)); return L.length ? [L[0].id, null] : null; };
const parry = (b, G0, e) => { const d = acts(b, G0).find(x => x.id === 'dodge'); return d && G0.canTarget(b, e, d) ? ['dodge', e.id] : null; };
const buildOf = b => (b.p && b.p.build) || '';
const rangedBuild = b => ['hunter', 'elementalist'].includes(buildOf(b));
module.exports = {
  beaconlord(b, e, G0) {
    const L = G0.alive(b).filter(x => x.role === 'bonfire').sort((x, y) => x.fuse - y.fuse || y.brk - x.brk); const f = L[0]; if (!f) return null;
    const fin = brkOn(b, G0, f, 1); if (fin) return fin; // 가장 먼저 터질 봉화를 한 행동으로
    const a = aoeOn(b, G0, f); if (a) return a; // 광역 한 번
    if (e.intent && e.intent.k === 'pourbeacon') { const g = acts(b, G0).find(x => x.id === 'guard'); if (g) return ['guard', null]; } // 결정적 답이 없으면 폭발을 막는다
    return null;
  },
  siege(b, e, G0) {
    if (e.intent && e.intent.k === 'launch') { const p = parry(b, G0, e); if (p) return p; } // 발사 예고에 흘리기
    for (const part of G0.alive(b).filter(x => x.role === 'rampart').sort((x, y) => (y.brk || 0) - (x.brk || 0))) { const a = brkOn(b, G0, part, 1); if (a) return a; } // 부품을 한 행동으로
    return null;
  },
  speaker(b, e, G0) {
    const R = G0.alive(b).filter(x => x.role === 'rioter' && !x.strong).sort((x, y) => x.hp - y.hp);
    const a = aoeOn(b, G0, R[0] || e); if (a) return a; // 광역 한 번
    const fin = brkOn(b, G0, e, 1); if (fin) return fin; // 대변인을 한 행동으로 무너뜨리기
    for (const x of R) { const L = ready(b, G0, x, dmgOf); const h = L.find(y => y.id === 'heavy') || L.find(y => y.id === 'basic') || L[0]; if (h) return pick(h, x); } // 평소 답: 폭도 하나
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
