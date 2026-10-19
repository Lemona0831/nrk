'use strict';
/* 평타 성향 (M3, 10월 19일): dgqa 성향 'basic'. 스킬보다 기본 공격 · 강공격으로 싸우는 사람.
   - 큰 각인: tools/persona/ks-pref.json의 basic 줄(날 선 손 → 쉬지 않는 팔 → 철벽 …)
   - 패시브: 화력(pw) · 유지력(su) 방향 우선(중간 노드 먼저), 막히면 아무 칸
   - 액티브: 비용 2 스킬과 기본 공격 연동 칸(bbuf: 사냥꾼 연사 류)만 열고 끼운다. 강화는 끼운 칸의 것만
   - 행동(M4에서 고침): 방어 · 흘리기 · 몸 빼기 · 플라스크 · 소모품은 신중 그대로. 공격 행동만 덮는다(filterAction).
     M3 기준선은 방어 · 몸 빼기를 쓰지 않아 1챕터 넘김 0%였다
   문 · 상점 · 이벤트 · 소모품은 신중 성향 그대로(dgqa playChar 래퍼) */
module.exports = (D, G0) => {
  const DIRS = ['pw', 'su'];
  const linked = s => !!(s && s.fx && s.fx.some(f => ['bbuf', 'sbHeat', 'sbEmberMail', 'sbFireBody'].includes(f.k))); // 기본 공격 연동: 사냥꾼 연사 bbuf, 마검사 유산의 불(M5-0)
  const want = (A, id) => { const N = A.nodes[id]; if (!N || N.kind !== 'skill') return false; return N.ys === 2 || linked(G0.SK2[id]) || (N.requires && A.sec && D.secScore && D.secScore(run0, A, id) > 0); }; let run0 = null;
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
  function spendTree(run, r) {
    spendPassive(run); if (!run.atree) return; const A = G0.atBuild(run.build); run0 = run; if (A.sec) D.sectorPick('basic', r || Math.random, run, A); // M5-0: 목표 부채꼴(평타는 유산의 불 CA)
    for (let n = 0; n < 30 && run.atree.pts > 0; n++) {
      const can = Object.keys(A.nodes).filter(id => !G0.atWhy(run, id)); if (!can.length) break;
      const eqd = run.skills || [];
      const ss = id => A.sec ? D.secScore(run, A, id) : 0; can.sort((x, y) => ss(y) - ss(x));
      const pick = can.find(id => ss(id) > 0 && (A.nodes[id].kind !== 'skill' || want(A, id) || A.nodes[id].requires)) || can.find(id => want(A, id) && linked(G0.SK2[id])) || can.find(id => want(A, id)) || can.find(id => A.nodes[id].kind === 'upgrade' && eqd.includes(A.nodes[id].on)) || can.find(id => A.nodes[id].kind === 'upgrade');
      if (!pick || !G0.atBuy(run, pick)) break; equip(run, A);
    }
    equip(run, A);
  }
  function ksChoice(run, r) { return D.ksPick('basic', r, run); } // tools/persona/ks-pref.json의 basic 줄(날 선 손 1위)
  /* 공격 행동만 덮는다(M4, 10월 19일 만든 사람 6-b): 신중이 고른 행동이 방어 · 흘리기 · 몸 빼기 · 플라스크 · 대응 스킬이면 그대로.
     공격이면 대응 충전 직후 라운드에는 신중이 고른 유산 스킬을 그대로, 아니면 스태미나가 강공격 비용 이상이면 강공격, 아니면 기본 공격 */
  const DEF = ['parry', 'parryBuff', 'guard', 'ward', 'wardFill', 'dodge', 'stance', 'cure', 'cleanse', 'heal'];
  function filterAction(b, run, a, t) {
    const L = G0.actionList(b); const act = L.find(x => x.id === a); if (!act) return null;
    const atk = a === 'basic' || a === 'heavy' || !!(act.v2 && act.s && act.s.fx.some(f => f.k === 'dmg') && !act.s.fx.some(f => DEF.includes(f.k)) && !act.self);
    if (!atk) return null;
    const resp = b.ysRespLast != null && b.ysRespLast >= (b.ysR || 0) - 1; if (resp && act.v2 && act.s) return null;
    const tgt = x => { const ok = G0.alive(b).filter(e => G0.canTarget(b, e, x)); const keep = ok.find(e => e.id === t); return (keep || ok.sort((p, q) => p.hp - q.hp)[0] || {}).id; };
    const hv = L.find(x => x.id === 'heavy' && x.ok); if (hv && tgt(hv) != null) return ['heavy', tgt(hv)];
    const bs = L.find(x => x.id === 'basic' && x.ok); if (bs && tgt(bs) != null) return ['basic', tgt(bs)];
    return null;
  }
  return { spendPassive, spendTree, ksChoice, filterAction };
};
