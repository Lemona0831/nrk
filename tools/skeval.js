'use strict';
/* 강화를 반영한 스킬 값 (10월 17일 측정 도구 보완, docs/검증/0.8.0-측정도구-보완-2026-10-17.md)
   자동 테스터의 장착 고르기가 기본 스킬이 아니라 "지금 가진 강화를 끼웠을 때의 실제 스킬"을 보게 한다.
   - 실제 스킬: 게임의 skOf(강화 노드 · 패시브의 스킬 바꾸기 · 칼에 새긴 주문을 적용한 스킬). 강화는 그 스킬을 끼웠을 때만 일하므로(p.aup),
     끼우기 전의 값을 보려고 "그 스킬의 강화를 모두 끼운 것처럼" 만든 가짜 캐릭터(build · aup · pn · sbLead)로 부른다
   - 한 번 쓸 때의 값: 게임 · 점수 도구와 같은 data/skillkit.js skScore(E: 효과 값, net: 같은 시간의 기본 공격을 뺀 값)
   - 유산: skCost(실제 스킬) − 조건부 할인(강화 cond: 비용 −off × 조건이 맞을 몫) − 처치 환급(killRecharge: 처치 몫 × 환급 1). 바닥 1
   - 한 차례의 값 perTurn = net × min(1, 차례마다 쓸 수 있는 유산 YB / 실제 유산). YB = (시작 유산 + 차례 수 × (차례 충전 + 대응 충전 0.3)) / (차례 수 + 1)
   조건이 맞을 몫(COND_P)과 대응 충전 0.3은 가설이다(4단계 측정의 조건부 할인 적용 비율 · 대응 충전 비율 근처). 같은 함수를 dgqa(장착) · sitqa(상황별 장착) · 점검 도구가 함께 쓴다 */
function makeSkEval(G0, run_) {
  const SKK = run_('SKK'), Y = run_('YUSAN');
  const COND_P = { resp: 0.5, alt2: (SKK.sb && SKK.sb.run2) || 0.45 };
  const condP = c => COND_P[c.when] != null ? COND_P[c.when] : /^kw:/.test(c.when || '') ? 0.5 : 0;
  const YB = ((Y.start || 0) + SKK.turns * ((Y.turn || 0) + 0.3 * (Y.resp || 0))) / (SKK.turns + 1);
  const atNodes = cls => { try { return G0.atBuild(cls).nodes; } catch (e) { return {}; } };
  /* run이 가진 그 스킬의 강화 노드 (끼웠는지와 상관없이) */
  function upsOf(run, id) { if (!run || !run.atree) return []; const N = atNodes(run.build); return run.atree.own.filter(u => N[u] && N[u].kind === 'upgrade' && N[u].on === id).sort(); }
  /* 그 스킬을 끼웠을 때의 캐릭터 (값 계산용 가짜). ups를 주면 그 강화로 */
  function pFor(run, id, ups) { const p = (run && run.p) || {}; return { build: run.build, aup: (ups == null ? upsOf(run, id) : ups.slice()).sort(), pn: (p.pn || []).slice(), sbLead: p.sbLead || null }; }
  function evalSkill(pl, id) {
    const s = G0.skOf(pl, id); if (!s) return null; const sc = G0.skScore(s); const cost = G0.skCost(s);
    const disc = (s.cond || []).reduce((m, c) => m + (c.off || 1) * condP(c), 0);
    const refund = s.killRecharge ? ((SKK.sb && SKK.sb.kill) || 0.4) * (Y.refund || 1) : 0;
    const costEff = Math.max(1, cost - disc - refund);
    return { id, ups: (pl.aup || []).slice(), E: sc.E, net: sc.net, cost, disc, refund, costEff, perTurn: sc.net * Math.min(1, YB / costEff), s };
  }
  /* run이 가진 강화를 반영한 값 / 기본 스킬의 값 */
  const evalRun = (run, id) => evalSkill(pFor(run, id), id);
  const evalBase = (run, id) => evalSkill(pFor(run, id, []), id);
  /* 강화 노드가 있는 트리인가 (지금은 마검사뿐. 다른 직업은 임시 트리라 강화가 없어 값이 기본과 같다) */
  const hasUps = cls => Object.values(atNodes(cls)).some(n => n.kind === 'upgrade');
  return { upsOf, pFor, evalSkill, evalRun, evalBase, hasUps, YB, COND_P };
}
module.exports = { makeSkEval };
