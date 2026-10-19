'use strict';
/* 평타 성향 (M3, 10월 19일): dgqa 성향 'basic'. 스킬보다 기본 공격 · 강공격으로 싸우는 사람.
   - 큰 각인: 평타 · 스태미나 축 우선(ks_glass → ks_wall → ks_dry), 없으면 제시의 첫 칸
   - 패시브: 화력(pw) · 유지력(su) 방향 우선(중간 노드 먼저), 막히면 아무 칸
   - 액티브: 비용 2 스킬과 기본 공격 연동 칸(bbuf: 사냥꾼 연사 류)만 열고 끼운다. 강화는 끼운 칸의 것만
   - 행동: 생명력 30% 아래면 생명 플라스크, 대응 충전 직후 라운드(지난 · 이번 라운드)에는 끼운 유산 스킬, 아니면 스태미나가 되면 강공격, 아니면 기본 공격.
     대상은 칠 수 있는 적 가운데 생명력이 가장 낮은 적
   문 · 상점 · 이벤트 · 소모품은 신중 성향 그대로(dgqa playChar 래퍼) */
module.exports = (D, G0) => {
  const KS = ['ks_glass', 'ks_wall', 'ks_dry'];
  const DIRS = ['pw', 'su'];
  const linked = s => !!(s && s.fx && s.fx.some(f => f.k === 'bbuf'));
  const want = (A, id) => { const N = A.nodes[id]; if (!N || N.kind !== 'skill') return false; return N.ys === 2 || linked(G0.SK2[id]); };
  function spendPassive(run) {
    if (!run || !run.ptree) return; const T = G0.ptBuild(run.build);
    for (let n = 0; n < 60 && run.ptree.pts > 0; n++) {
      const can = Object.keys(T.nodes).filter(id => !G0.ptWhy(run, id) && T.nodes[id].kind !== 'keystone'); if (!can.length) break;
      const sc = id => { const N = T.nodes[id]; return (DIRS.includes(N.dir) ? 10 : 0) + (N.kind === 'notable' ? 3 : 0) - (N.ring || 1) * 0.1; };
      const best = can.slice().sort((x, y) => sc(y) - sc(x) || (x < y ? -1 : 1))[0]; if (!G0.ptBuy(run, best)) break;
    }
  }
  function equip(run, A) {
    const own = run.atree.own.filter(id => A.nodes[id] && A.nodes[id].kind === 'skill' && want(A, id));
    const eq = own.slice().sort((x, y) => (linked(G0.SK2[y]) - linked(G0.SK2[x])) || (x < y ? -1 : 1)).slice(0, G0.EQUIP_SLOTS2);
    if (eq.length) { run.skills = eq; G0.atSync(run); }
  }
  function spendTree(run) {
    spendPassive(run); if (!run.atree) return; const A = G0.atBuild(run.build);
    for (let n = 0; n < 30 && run.atree.pts > 0; n++) {
      const can = Object.keys(A.nodes).filter(id => !G0.atWhy(run, id)); if (!can.length) break;
      const eqd = run.skills || [];
      const pick = can.find(id => want(A, id) && linked(G0.SK2[id])) || can.find(id => want(A, id)) || can.find(id => A.nodes[id].kind === 'upgrade' && eqd.includes(A.nodes[id].on)) || can.find(id => A.nodes[id].kind === 'upgrade');
      if (!pick || !G0.atBuy(run, pick)) break; equip(run, A);
    }
    equip(run, A);
  }
  function ksChoice(run) { const offer = run.ksOffer || []; const T = G0.ptBuild(run.build); for (const k of KS) { const id = offer.find(x => T.nodes[x] && T.nodes[x].fx === k); if (id) return id; } return offer[0]; }
  function chooseAction(b) {
    const p = b.p; const L = G0.actionList(b).filter(a => a.ok && !a.pull && a.id !== 'flee');
    const tgtOf = act => G0.alive(b).filter(e => G0.canTarget(b, e, act)).sort((x, y) => x.hp - y.hp)[0];
    const go = act => { if (!act) return null; if (act.tgt === false || act.self) return [act.id, null]; const t = tgtOf(act); return t ? [act.id, t.id] : null; };
    if (p.hp < p.hpMax * 0.3) { const f = L.find(a => a.id === 'flaskL'); if (f) return [f.id, null]; }
    const resp = b.ysRespLast != null && b.ysRespLast >= (b.ysR || 0) - 1;
    if (resp) { const sk = L.filter(a => a.v2 && a.s); for (const a of sk) { const x = go(a); if (x) return x; } }
    const hv = go(L.find(a => a.id === 'heavy')); if (hv) return hv;
    const bs = go(L.find(a => a.id === 'basic')); if (bs) return bs;
    const any = L.find(a => a.id === 'guard') || L[0]; return any ? (go(any) || [any.id, null]) : ['guard', null];
  }
  return { spendPassive, spendTree, ksChoice, chooseAction };
};
