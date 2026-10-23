'use strict';
/* ===== 0.8.0 G-1 강적 시계 (만든 사람 확정 10월 23일) =====
   강적 하나 = 시계 하나. 시계는 적 카드 위 칩("이름 n/max" + 칸)으로 보이고, 다 차기 한 칸 전에 마지막 경고(문장 · 소리 · 칩 깜빡임), 다 차면 파국.
   파국 뒤 시계는 0부터 다시(정의에 perm: 1이면 그 전투 끝까지 파국 상태). 답이 들면 칸이 되감긴다.
   강적마다 무엇이 칸을 채우고 되감는지 · 파국이 무엇인지는 각 챕터 파일의 FOE_CLOCK[강적]에 둔다 — 내용은 비공개 문서 참조.
   정의 꼴: { n: 칩 이름, max: 칸 수, ans: [답 태그 ≥2 종류], warn(b, e) → 경고 문장, doom(b, e), perm?, reward?(b, e), blocked?(b, e) → 답 수단이 모두 막혔으면 참(그동안 시계가 멈춘다),
            on: { 사건 이름(b, e, ...): 칸을 더하거나 되감는다 } } — 사건: onRoomStart · onRoundEnd · onFoeAct · onFoeBreak · onFoeDown · onHurt · onParry · onAct · onFlask · onKill · onHit · onSkill · onEvade · onCounter */
const STRONG_GIM = { dmg: 0.8 }; // 강적 평소 공격 배율(공통 손잡이 하나)
const FOE_CLOCK = {};
const FC_HOOKS = ['onHurt', 'onParry', 'onAct', 'onFlask', 'onKill', 'onHit', 'onSkill', 'onEvade', 'onCounter'];
const fcDef = e => (e && e.strong && FOE_CLOCK[e.foe]) || null;
function fcInit(b, e) { const D = fcDef(e); if (!D || e.clk) return; e.clk = { n: 0, max: D.max, doomN: 0, warnN: 0, perm: 0, stop: 0 }; }
function fcStrongs(b) { return alive(b).filter(e => fcDef(e)); }
/* 사건 알림: 살아 있는 강적마다 그 사건 처리기를 부른다(시계를 처음 보면 만든다) */
function fcEv(b, ev, ...a) { if (!b || b.over) return; for (const e of fcStrongs(b)) { fcInit(b, e); const D = fcDef(e), f = D.on && D.on[ev]; if (f) f(b, e, ...a); } }
/* 칸 더하기: 답 수단이 모두 막혀 있으면 멈춘다(대답할 수 없는 파국은 오지 않는다) */
function fcAdd(b, e, k, why) {
  const D = fcDef(e); if (!D || !e.alive || b.over || !(k > 0)) return 0; fcInit(b, e); const C = e.clk; if (C.perm) return 0;
  if (D.blocked && D.blocked(b, e)) { if (!C.stop) { C.stop = 1; logp(b, 'sys', D.n + ': 멈춰 있다'); } return 0; } C.stop = 0;
  const n0 = C.n; C.n = Math.min(C.max, C.n + k); if (b.rec) b.rec.push({ k: 'clk', foe: e.foe, n: C.n, max: C.max, why: why || '' });
  if (C.n >= C.max) { fcDoom(b, e); return k; }
  if (C.n >= C.max - 1 && n0 < C.max - 1) { C.warnN++; C.blink = 1; logp(b, 'crit', '⚠ ' + (D.warn ? D.warn(b, e) : D.n + '이(가) 곧 찬다')); if (typeof sfx === 'function') sfx('b_big'); if (b.rec) b.rec.push({ k: 'clkwarn', foe: e.foe }); }
  return k;
}
/* 되감기: 답이 들었다. 0이 되면 정의의 보상(무방비 등) */
function fcRewind(b, e, k, why) {
  const D = fcDef(e); if (!D || !e.alive || !(k > 0)) return 0; fcInit(b, e); const C = e.clk; if (C.perm) return 0; const n0 = C.n; if (!n0) return 0;
  C.n = Math.max(0, C.n - k); if (C.n < C.max - 1) C.blink = 0; if (b.rec) b.rec.push({ k: 'clkback', foe: e.foe, n: C.n, why: why || '' });
  if (!C.n && D.reward) D.reward(b, e, why);
  return n0 - C.n;
}
function fcDoom(b, e) {
  const D = fcDef(e), C = e.clk; C.doomN++; C.blink = 0; if (b.rec) b.rec.push({ k: 'clkdoom', foe: e.foe });
  if (D.perm) C.perm = 1; else C.n = 0;
  D.doom(b, e);
}
/* 적 카드 칩: 이름 n/max와 칸. 마지막 칸 앞이면 깜빡임(움직임 줄이기면 색만) */
function fcChip(b, e) {
  const D = fcDef(e); if (!D || !e.clk) return ''; const C = e.clk, warn = !C.perm && C.n >= C.max - 1;
  const cells = Array.from({ length: C.max }, (_, i) => `<i class="${i < C.n || C.perm ? 'on' : ''}"></i>`).join('');
  return `<span class="fclk${warn ? ' warn' : ''}${C.perm ? ' perm' : ''}" data-info="fclk" aria-label="${esc(D.n)} ${C.perm ? '가득' : C.n + '/' + C.max}${warn ? ', 다음이면 위험' : ''}">${esc(D.n)} <b>${C.perm ? C.max : C.n}/${C.max}</b><span class="fclkc" aria-hidden="true">${cells}</span></span>`;
}
