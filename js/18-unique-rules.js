'use strict';
/* ===== 0.8.0 M6-1 고유 장비 규칙 · 대가 (UQFX, data/uniques.js 105) =====
   UQFX[id] = { rule: {훅}, cost: {훅} }. 훅 이름 · 인자는 IFX(js/16)와 같다. 엔진의 새 지점은 uqF · uqV · uqA · uqR(js/17)로만 읽는다(키 이름은 u_로 시작).
   규칙은 4-3 어휘 6종(비용 · 대상 · 조건 · 상태 바꿔치기 · 환산 · 횟수)만, 새 상태 없음. 추가 타격은 extra로 표시해 다시 추가를 부르지 않는다(금지선 ②). 단위 시험: tools/unique-check.js */
/* --- 암살자 (as_) --- 터뜨리기 = fx 'burst'가 있는 스킬(근접 tgt melee · 원거리 ranged). 곁의 적 = 다른 살아 있는 적 가운데 같은 줄 · 가까운 자리 하나 */
const uqAsSide = (b, e) => { const i = b.en.indexOf(e); return alive(b).filter(x => x !== e && x.role !== 'root').sort((x, y) => (x.row !== e.row) - (y.row !== e.row) || Math.abs(b.en.indexOf(x) - i) - Math.abs(b.en.indexOf(y) - i))[0] || null; };
const uqAsBurst = c => !!(c && c.skill && SK2[c.id] && SK2[c.id].fx.some(x => x.k === 'burst'));
Object.assign(UQFX, {
  // 독니 단검: 기본 공격(반격 · 분신 포함)이 맞히면 중독 +1 / 기본 공격 피해 −15%
  as_h1: { rule: { onHit: (b, p, e, o, c) => { if (!c || c.id !== 'basic' || !e.alive) return; return addPoison(b, e, 1, 1) > 0 ? 1 : 0; } }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.15 : 0 } },
  // 안개 장갑: 모든 적(전열 모두 · 모두)을 치는 스킬의 중독 +1 / 한 적을 치는 스킬의 중독 −1(바닥 1) — 엔진 uqSkPsn(스킬의 poison · 터뜨리기 전 중독 · 독 표창 둘째)
  as_h2: { rule: { u_skPsn: (b, p, s) => s && (s.tgt === 'all' || s.tgt === 'front') ? 1 : 0 }, cost: { u_skPsn: (b, p, s) => s && (s.tgt === 'melee' || s.tgt === 'ranged' || s.tgt === 'pick') ? -1 : 0 } },
  // 투척 장갑: 터뜨리기 피해의 30%가 곁의 적 하나에게(장비 배수를 다시 받지 않는 덧피해, 추가를 부르지 않음) / 터뜨리기의 붕괴 없음
  as_h3: { rule: { u_burst: (b, p, e, d, s) => { if (!(d > 0) || b.over) return; const o = uqAsSide(b, e); if (!o) return; const c0 = b.cur; b.cur = null; hurtEnemy(b, o, d * 0.3, { single: 1, label: '투척 장갑' }); b.cur = c0; return 1; } }, cost: { u_burstNoBrk: 1 } },
  // 격발 단검: 근접 터뜨리기가 대상에게 붕괴 +(터뜨린 중독 × 3) / 원거리 터뜨리기 피해 −20%
  as_h4: { rule: { u_burst: (b, p, e, d, s, take) => { if (!s || s.tgt !== 'melee' || !e.alive || !(take > 0) || fxFlag(p, 'u_burstNoBrk')) return; addBreak(b, e, take * 3); logp(b, 'good', '격발 단검: ' + e.n + ' 붕괴 +' + take * 3); return 1; } }, cost: { hitP: (b, p, e, o, c) => o && o.burst && uqAsBurst(c) && SK2[c.id].tgt === 'ranged' ? -0.2 : 0 } },
  // 그림자 외투: 흘려 베기의 반격이 두 번(엔진 asOnParry) / 흘리기 감소 −10%p(70% → 60%, 흘리기 스킬도 — 독의 군주 대가와 같은 parryCut)
  as_h5: { rule: { u_ctrTwice: 1 }, cost: { parryCut: 0.1 } },
  // 등 뒤의 송곳: 후열 적을 치는 기본 공격 +50%(maxOf) / 전열 적을 치는 기본 공격 −10%
  as_h6: { rule: { pctUp: (b, p, e, o, c) => c && c.id === 'basic' && e.row === 'back' ? 0.5 : 0 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' && e.row === 'front' ? -0.1 : 0 } },
  // 만독 반지: 중독 걸린 적이 쓰러지면 그 중독의 절반(올림)이 곁의 적 하나에게 / 중독 기본 상한 20 → 15(엔진 psnCapOf)
  as_h7: { rule: { onKill: (b, p, e) => { const n = Math.ceil(st(e, 'poison') / 2); if (!(n > 0) || b.over) return; const o = uqAsSide(b, e); if (!o) return; const g = addPoison(b, o, n, 1); logp(b, 'good', '만독 반지: ' + e.n + '의 중독이 ' + o.n + '에게 ' + g); return 1; } }, cost: { u_psnCap: 15 } },
  // 암영의 목걸이: 숨은 동안 지속 피해도 받지 않는다(엔진 hurtPlayer) / 최대 생명력 −10%
  as_h8: { rule: { u_hideDot: 1 }, cost: { hpMul: 0.9 } },
  // 잔영 장갑: 흘려 낸 다음 차례 첫 기본 공격이 두 번(엔진 playerAct basic) / [쓰는 동안] 두 번 친 차례(그 뒤 적의 차례까지) 받는 직접 피해 +15%
  as_h9: { rule: { u_parDbl: 1 }, cost: { inP: (b, p, o) => o && !o.dot && b.uqDblT != null && b.uqDblT === b.prepTurn ? -0.15 : 0 } },
  // 녹슨 독침: 기본 공격이 맞히면 중독 3 / 기본 공격 피해 0
  as_r1: { rule: { onHit: (b, p, e, o, c) => { if (!c || c.id !== 'basic' || !e.alive) return; return addPoison(b, e, 3, 1) > 0 ? 1 : 0; } }, cost: { hit: (b, p, e, o, c) => c && c.id === 'basic' ? 0 : 1 } },
  // 미끄러운 가죽: 흘리기 스태미나 0 / 흘리기 감소 −20%p(흘리기 스킬도)
  as_r2: { rule: { cost: (p, id) => id === 'dodge' ? -1000 : 0 }, cost: { parryCut: 0.2 } },
  // 두 번 터뜨리는 손: 터뜨리기가 중독의 절반만 없앤다(엔진 runSkill2 left, 피해는 그대로) / 터뜨리기 피해 −35%
  as_r3: { rule: { u_burstHalf: 1 }, cost: { hitP: (b, p, e, o, c) => o && o.burst && uqAsBurst(c) ? -0.35 : 0 } },
  // 독의 염주: 독을 건 내 행동마다(행동 하나에 한 번, 반격 · 적 차례 반응 제외) 스태미나 +5 / 최대 스태미나 −15
  as_r4: { rule: { u_psnAct: (b, p) => { if (!b.cur || b.cur.extra || b.uqPsnA === b.actN) return; b.uqPsnA = b.actN; fxStam(p, 5); return 1; } }, cost: { st: { st: -15 } } },
  // 암살자의 인장: 생명력 35% 이하인 적에게 직접 피해 +25%(maxOf) / 그 위의 적에게 −5%
  as_r5: { rule: { pctUp: (b, p, e) => e.hp <= e.hpMax * 0.35 ? 0.25 : 0 }, cost: { hitP: (b, p, e) => e.hp > e.hpMax * 0.35 ? -0.05 : 0 } },
  // 독액 플라스크: 생명력 플라스크를 마시면 모든 적에게 중독 3 / 생명력 플라스크 회복 −25%
  as_r6: { rule: { onFlask: (b, p, k) => { if (k !== 'life') return; let n = 0; for (const e of alive(b)) if (e.role !== 'root' && addPoison(b, e, 3, 1) > 0) n++; if (n) logp(b, 'good', '독액 플라스크: 모든 적에게 중독 3'); return n ? 1 : 0; } }, cost: { healMul: 0.75 } },
});
/* --- 공용(cls all) 15: 옛 장비(쌍날 · 망치 · 갈고리 · 가시 · 망토 · 서약 · 분노 · 수렴 · 끓는 · 사슬 · 표식 · 문장 · 맥박 · 깃발)의 하드코딩 자리는 u_ 깃발로 같이 읽는다 --- */
Object.assign(UQFX, {
  cm_twin: { rule: { u_twin: 1 }, cost: { u_twinHv: 1 } }, // 쌍날 단검: 기본 공격 두 번(50%씩, 타격마다 onHit) · 대가 강공격 피해 −20%(heavyBase)
  cm_maul: { rule: { u_maul: 1 }, cost: { cost: (p, id) => id === 'heavy' ? 10 : 0 } }, // 무거운 망치: 강공격 붕괴 +20 · 대가 강공격 스태미나 +10
  cm_hook: { rule: { u_hook: 1 }, cost: { u_wpnCut: 1 } }, // 끌어내는 갈고리: 강공격이 후열 적을 전열로 · 대가 무기 피해 −15%(outDmg weapon)
  cm_thorns: { rule: { u_thorns: 1 }, cost: { hpMul: 0.95 } }, // 가시 갑옷: 방어 중 전열 적에게 맞으면 그 적에게 2 · 대가 최대 생명력 −5%
  cm_cloak: { rule: { u_cloak: 1 }, cost: { hpMul: 0.95 } }, // 그림자 망토: 흘리기 줄임 +15%p(상한 90%, 스킬 흘리기 포함) · 대가 최대 생명력 −5%
  cm_bloodpact: { rule: { pctUp: (b, p) => p.hp < p.hpMax * 0.5 ? 0.2 : 0 }, cost: { healAll: 0.85 } }, // 피의 서약: 생명력 절반 아래 주는 피해 +20% · 대가 되찾는 생명력 −15%(healMul)
  cm_fury: { rule: { onHurt: (b, p, o) => { if (!o.charged) return; p.uqFury = 1; return 1; }, onAct: (b, p, id, act) => { b.uqFuryOn = p.uqFury && !act.self ? 1 : 0; }, onHit: (b, p) => { if (b.uqFuryOn !== 1) return; p.uqFury = 0; b.uqFuryOn = 2; return 1; }, pctUp: (b, p, e, o, c) => c && b.uqFuryOn ? 0.1 : 0 }, // 분노의 반지: 강타를 맞으면 다음 공격(처음 맞힌 행동의 모든 타격) +10%
    cost: { inP: (b, p, o) => o.charged ? -0.1 : 0 } }, // 대가: 받는 강타 피해 +10%
  cm_focus: { rule: { pctUp: (b, p, e, o) => o.single && !o.aoe ? 0.07 : 0 }, cost: { hitP: (b, p, e, o) => o.aoe ? -0.3 : 0 } }, // 수렴의 반지: 한 적 대상 +7% · 대가 여럿을 치는 공격 −30%
  cm_boil: { rule: { onFlask: (b, p, k) => { if (k !== 'life') return; for (const e of alive(b).slice()) hurtEnemy(b, e, outDmg(b, 5, {}), { aoe: 1, fire: 1, label: '끓는 플라스크' }); return 1; } }, cost: { healMul: 0.75 } }, // 끓는 플라스크: 마시면 모든 적에게 5 · 대가 플라스크 회복 −25%
  cm_chain: { rule: { u_chain: 1 }, cost: { st: { st: -10 } } }, // 사슬 장갑: 근접 스킬로 때리면 붕괴 +20 · 대가 최대 스태미나 −10
  cm_mark: { rule: { u_mark: 1, u_markR: 1 }, cost: { u_mark: 1, u_markC: 1 } }, // 추적자의 표식: 같은 적 세 번 이어 치면 취약 2 · 대가 대상을 바꾼 첫 공격 −10%(hurtEnemy)
  cm_ward: { rule: { inDown: (b, p) => p.ward > 0 ? 0.15 : 0 }, cost: { hpMul: 0.95 } }, // 수호의 문장: 보호막이 남은 동안 받는 피해 −15% · 대가 최대 생명력 −5%
  cm_pulse: { rule: { pctUp: (b, p, e, o) => !o.dot ? 0.35 : 0 }, cost: { u_noFast: 1 } }, // 느린 맥박: 직접 피해 +35% · 대가 빠른 칸 없음(noFast)
  cm_vanguard: { rule: { u_vanguard: 1 }, cost: { st: { st: -20 } } }, // 선봉의 깃발: 첫 공격이 빠른 행동 + 붕괴 +20 · 대가 최대 스태미나 −20
  cm_fastflask: { rule: { u_flaskFree: 1 }, cost: { healMul: 0.5, onFlask: (b, p, k) => { if (k !== 'life') return; p.st = Math.max(0, p.st - 10); return 1; } } }, // 성급한 플라스크: 마셔도 차례가 이어진다 · 대가 회복 −50%, 마실 때마다 스태미나 −10
});
/* ---- 원소술사 (el_, 15) — 엔진 읽는 곳: js/10 elHit · elBasicAfter · elFreeze · 주문 상태(elStAdd) · elWpnK, js/12 elGuardOf · elemShock · elemPreview, js/20 basicBase, js/23 skCostAt, js/24 hurtPlayer, js/30 enemyAct ---- */
const uqElSkT = c => { const s = c && c.skill ? SK2[c.id] : null; return s ? s.tgt : null; }; // 지금 스킬의 대상 종류
Object.assign(UQFX, {
  el_h1: { rule: { u_boltIgn: () => 1 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'e5_bolt' ? -0.15 : 0 } }, // 불의 지팡이: 불 마력탄 화상 +1 · 마력탄 피해 −15%
  el_h2: { rule: { u_elStAdd: (b, s, x) => s.tgt === 'all' && x.s === 'ignite' ? 1 : 0 }, cost: { hitP: (b, p, e, o, c) => ['melee', 'ranged', 'pick'].includes(uqElSkT(c)) ? -0.1 : 0 } }, // 불똥 장갑: 모든 적을 치는 주문의 화상 +1 · 한 적을 치는 주문 피해 −10%
  el_h3: { rule: { u_frzBrk: 60 }, cost: { u_guardBase: 0.1 } }, // 서리 장갑: 얼어붙음의 붕괴 +40 → +60 · 서리 무게 −20% → −10%
  el_h4: { rule: { u_elHitMe: (b, p, src) => { if (!src.alive || src.role === 'root') return; const g = addS(b, src, 'chill', 1); if (g) logp(b, 'good', '서리 외투: ' + src.n + '에게 둔화 1'); return g ? 1 : 0; } }, cost: { hpMul: 0.9 } }, // 서리 외투: 나를 직접 친 적에게 둔화 1 · 최대 생명력 −10%
  el_h5: { rule: { u_wpnMul: 0.65 }, cost: { hitP: (b, p, e, o, c) => c && c.skill ? -0.1 : 0 } }, // 마력 지팡이: 마력 화살 무기 피해 배율 50% → 65% · 주문 스킬 피해 −10%
  el_h6: { rule: { inDown: (b, p, o) => o && !o.dot && st(p, 'protect') > 0 ? 0.1 : 0 }, cost: { hpMul: 0.92 } }, // 비전 로브: 보호가 있으면 받는 피해 −10% 더 · 최대 생명력 −8%
  el_h7: { rule: { onShock: (b, p, e, I, C, d) => { if (!(d > 0) || b.over) return; const t = fOther(b, e); if (!t) return; const g = hurtEnemy(b, t, d * 0.3, { dot: 1, shock: 1, arc: 1, extra: 1, silent: 1, label: '번진 열충격' }); logp(b, 'good', '빙염 반지: 열충격이 ' + t.n + '에게도 번진다. ' + r1(g) + ' 피해'); return 1; } }, cost: { u_noShockBrk: 1 } }, // 빙염 반지: 열충격 피해의 30%가 곁의 적 하나에게(덧친 몫, 다시 번지지 않음) · 열충격의 붕괴 없음
  el_h8: { rule: { u_frzSkip: (b, p) => { fxStam(p, 15); logp(b, 'good', '정적의 목걸이: 스태미나 +15'); return 1; } }, cost: { st: { st: -20 } } }, // 정적의 목걸이: 얼어붙은 적이 행동을 놓칠 때 스태미나 +15 · 최대 스태미나 −20
  el_h9: { rule: { pctUp: (b, p, e, o, c) => c && c.id === 'basic' && st(e, 'ignite') > 0 ? 0.3 : 0 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' && st(e, 'chill') > 0 ? -0.1 : 0 } }, // 마염 장갑: 화상 걸린 적에게 마력 화살 +30% · 둔화 걸린 적에게 −10%
  el_r1: { rule: { u_freeSwitch: 1 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'e5_bolt' ? -0.2 : 0 } }, // 쌍원소 지팡이: 원소 전환 유산 0 · 마력탄 피해 −20%
  el_r2: { rule: { inDown: (b, p, o) => o && !o.dot && o.src && o.src !== p && st(o.src, 'ignite') > 0 ? 0.15 : 0 }, cost: { u_guardBase: 0.1 } }, // 열기의 로브: 화상 걸린 적이 주는 피해 −15% · 서리 무게 −20% → −10%
  el_r3: { rule: { u_elChillHit: (b, s) => s === 'basic' || (s && s.b === '서리') ? 2 : 0 }, cost: { u_noGuard: 1 } }, // 빙결 장갑: 둔화 걸린 적을 기본 공격 · 서리 스킬로 치면 둔화 +2 · 서리 무게 없음
  el_r4: { rule: { onShock: (b, p) => { fxStam(p, 10); return 1; } }, cost: { st: { st: -15 } } }, // 원소 염주: 열충격이 일어날 때 스태미나 +10 · 최대 스태미나 −15
  el_r5: { rule: { shockMul: () => 1.25 }, cost: { inP: () => -0.08 } }, // 촉매 반지: 열충격 피해 +25% · 받는 피해 +8%
  el_r6: { rule: { onFlask: (b, p, k) => { if (k !== 'life') return; let n = 0; for (const e of alive(b)) if (e.role !== 'root' && addS(b, e, 'chill', 1)) n++; if (n) logp(b, 'good', '서리 플라스크: 모든 적에게 둔화 1'); return 1; } }, cost: { healMul: 0.75 } }, // 서리 플라스크: 마시면 모든 적에게 둔화 1 · 생명력 플라스크 회복 −25%
});
/* ----- 사냥꾼 (hn_) ----- 엔진 읽기 지점: u_focPre · u_focKeep1 · u_focPer(js/24 hurtEnemy 추적) · u_focCapCut(focusCapOf) · u_evCapCut(hnEvCap) · u_evAoe(js/24 hurtPlayer 몸 빼기) · u_hitBy(hurtPlayer) ·
   u_shot1(runSkill2 연타 수) · u_nockN(hnUse 화살 재기) · u_cut(멈춰 세우기 · 얼음 감옥 · 강공격 끊기 · 영창 끊기) · u_slowNorm(actionList) · u_basicNoBrk(기본 공격 붕괴) */
Object.assign(UQFX, (() => {
  const SK = c => c && c.skill ? SK2[c.id] : null; // 이 행동의 스킬(SK2)
  const fp = (b, e) => b.uqFP && b.uqFP.id === e.id ? b.uqFP.n : 0; // 이 타격을 맞히기 전 대상의 추적 겹(u_focPre가 적는다)
  const focPre = (b, p, e, pre) => { b.uqFP = { id: e.id, n: pre }; };
  const one = s => !!(s && ['melee', 'ranged', 'pick'].includes(s.tgt) && (s.hits || 1) <= 1 && !s.fx.some(x => x.k === 'hnVolley')); // 한 발 쏘는 스킬: 한 적 · 한 발
  const h6 = (b, e) => { if (!e || !e.alive || !(st(e, 'chill') > 0)) return 0; const k = b.actN + ':' + e.id; if (b.uqH6 === k) return 0; b.uqH6 = k; addS(b, e, 'chill', 1); logp(b, 'good', '족쇄 장갑: 끊긴 ' + e.n + '에게 둔화 +1'); return 1; };
  return {
    hn_h1: { rule: { u_focPre: focPre, pctUp: (b, p, e, o, c) => c && c.id === 'basic' && fp(b, e) >= 3 ? 0.3 : 0 }, // 긴 활: 추적 3겹인 적에게 기본 공격 +30%
      cost: { u_focPre: focPre, hitP: (b, p, e, o, c) => c && c.id === 'basic' && !fp(b, e) ? -0.1 : 0 } }, // 대가: 추적이 없는 적에게 기본 공격 −10%
    hn_h2: { rule: { u_focKeep1: 1 }, cost: { u_focPer: -0.01 } }, // 사냥꾼의 인장: 표적을 바꿔도 추적 1겹 · 대가: 겹마다 +5% → +4%
    hn_h3: { rule: { u_shot1: 1 }, cost: { hitP: (b, p, e, o, c) => one(SK(c)) ? -0.15 : 0 } }, // 속사 장갑: 여러 발 스킬 한 발 더 · 대가: 한 발 스킬 −15%
    hn_h4: { rule: { u_nockN: 1 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.1 : 0 } }, // 두 겹 시위: 화살 재기 횟수 +1 · 대가: 기본 공격 −10%
    hn_h5: { rule: { onEvade: b => { b.uqH5 = 1; return 1; }, onAct: (b, p, id) => { if (id !== 'basic' || !b.uqH5) return; b.uqH5 = 0; b.uqH5A = b.actN; logp(b, 'good', '바람 외투: 피한 뒤의 기본 공격 +40%'); return 1; },
      pctUp: (b, p, e, o, c) => c && c.id === 'basic' && b.uqH5A === b.actN ? 0.4 : 0 }, cost: { hpMul: 0.9 } }, // 바람 외투: 몸 빼기로 피하면 다음 기본 공격 +40% · 대가: 최대 생명력 −10%
    hn_h6: { rule: { u_cut: (b, p, e) => h6(b, e), onBreak: (b, p, e) => b.brkCut ? h6(b, e) : 0 }, // 족쇄 장갑: 둔화 걸린 적의 모으기를 끊으면 둔화 +1(무너뜨려 끊기 포함)
      cost: { hitP: (b, p, e, o, c) => c && c.skill && !(st(e, 'chill') > 0) ? -0.1 : 0 } }, // 대가: 둔화가 없는 적에게 스킬 −10%
    hn_h7: { rule: { pctUp: (b, p, e, o, c) => (SK(c) || {}).time === 'slow' ? 0.25 : 0 }, // 만궁: 느린 스킬 +25%
      cost: { hitP: (b, p, e, o, c) => ['fast', 'normal'].includes((SK(c) || {}).time) ? -0.1 : 0 } }, // 대가: 빠른 · 보통 스킬 −10%
    hn_h8: { rule: { onSkill: (b, p) => { if (!b.hnLinkFast) return; fxStam(p, 10); logp(b, 'good', '질풍 목걸이: 연계 빠른 행동, 스태미나 +10'); return 1; } }, cost: { st: { st: -20 } } }, // 질풍 목걸이: 연계 빠른 행동 뒤 스태미나 +10 · 대가: 최대 스태미나 −20
    hn_h9: { rule: { u_hitBy: (b, p, src) => { if (p.build !== 'hunter' || !src.alive || src.role === 'root') return; hnFoc(b, src, 1); logp(b, 'good', '덫 사냥꾼의 반지: ' + src.n + '에게 추적 ' + p.focus.n + '겹'); return 1; } }, // 덫 사냥꾼의 반지: 나를 직접 친 적에게 추적 +1겹
      cost: { inP: () => -0.08 } }, // 대가: 받는 피해 +8%
    hn_r1: { rule: { u_basicNoBrk: 1, onHit: (b, p, e, o, c) => { if (!c || c.id !== 'basic' || !e.alive || !fxOnce(b, 'uq_hn_r1')) return; return addS(b, e, 'chill', 1) > 0 ? 1 : 0; } }, // 묵직한 활: 기본 공격이 붕괴 대신 둔화 1(행동마다 한 번)
      cost: { u_basicNoBrk: 1 } }, // 대가: 기본 공격의 붕괴 0 (M5-7 BRK_RULE.basic0이면 이미 0)
    hn_r2: { rule: { u_evAoe: 1 }, cost: { u_evCapCut: 2 } }, // 사냥꾼의 망토: 몸 빼기가 여럿을 치는 공격도 피함 · 대가: 몸 빼기 상한 3 → 1
    hn_r3: { rule: { u_slowNorm: 1 }, cost: { hitP: (b, p, e, o, c) => (SK(c) || {}).time === 'slow' ? -0.15 : 0 } }, // 연계 장갑: 느린 스킬이 보통 빠르기(연계 빠른 행동은 아님) · 대가: 느린 스킬 −15%
    hn_r4: { rule: { onStart: (b, p) => { if (!(BUILDS[p.build] || {}).openHaste) return; addS(b, p, 'haste', 1); logp(b, 'good', '개전의 뿔피리: 둘째 라운드에도 두 번 움직인다. 가속 +1'); return 1; } }, cost: { ysStart: -2 } }, // 개전의 뿔피리: 첫 라운드의 두 번 움직임이 둘째 라운드에도 · 대가: 전투 시작 유산 −2
    hn_r5: { rule: { u_focPer: 0.03 }, cost: { u_focCapCut: 1 } }, // 추적자의 반지: 추적 겹마다 +5% → +8% · 대가: 추적 상한 3 → 2
    hn_r6: { rule: { onFlask: (b, p, k) => { if (k !== 'life' || (p.hnSt && p.hnSt.gale > 0)) return; const n0 = p.evade || 0; p.evade = Math.min(hnEvCap(p), n0 + 2); if (p.evade > n0) logp(b, 'good', '역풍 플라스크: 몸 빼기 ' + p.evade); return p.evade > n0 ? 1 : 0; } }, // 역풍 플라스크: 마시면 몸 빼기 2(질풍난사 동안은 없음)
      cost: { healMul: 0.7 } }, // 대가: 생명력 플라스크 회복 −30%
  };
})());
/* ---- 수도승 (mk_) ---- */
const mkSkAoe = c => !!(c && c.skill && SK2[c.id] && (SK2[c.id].tgt === 'all' || SK2[c.id].tgt === 'front')); // 여럿을 치는 스킬
Object.assign(UQFX, {
  // mk_h1 끊이지 않는 붕대: 연환권 추가 타 기 2마다 +1(js/32 u_chainKi) / 되받기 피해 −20%
  mk_h1: { rule: { u_chainKi: k => Math.floor((k || 0) / 2) }, cost: { hitP: (b, p, e, o) => o && o.ctr ? -0.2 : 0 } },
  // mk_h2 붕권의 권갑: 기를 쏟는 공격 기 1마다 배율 +10%p(js/10 u_kiBurstMul) / 기를 쏟은 다음 (적) 차례 받는 피해 +15%
  mk_h2: { rule: { u_kiBurstMul: () => 0.1 }, cost: { onSkill: b => { if (b.kiTookA === b.actN) b.uqKiPR = b.ysR || 0; }, inP: b => b.uqKiPR != null && b.uqKiPR === (b.ysR || 0) ? -0.15 : 0 } },
  // mk_h3 금강 가사: 되받기 한도 +1(js/12 u_ctrMax) / 받는 피해 +8%
  mk_h3: { rule: { u_ctrMax: () => 1 }, cost: { inP: () => -0.08 } },
  // mk_h4 흐르는 물의 가사: 이번 적 차례 되받은 수(p.ctrN)마다 받는 피해 −5%(상한 −20%) / 되받기 피해 −30%
  mk_h4: { rule: { inDown: (b, p) => Math.min(0.2, 0.05 * (p.ctrN || 0)) }, cost: { hitP: (b, p, e, o) => o && o.ctr ? -0.3 : 0 } },
  // mk_h5 점혈 반지: 봉인한 적(혈도 sealx · 천망, js/10 u_onSeal)에게 주는 피해 +25% / 기본 공격 피해 −10%
  mk_h5: { rule: { u_onSeal: (b, p, e) => { e.uqSeal = 1; return 1; }, pctUp: (b, p, e) => e && e.uqSeal ? 0.25 : 0 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.1 : 0 } },
  // mk_h6 탈기의 염주: 둔화된 적을 쳐서 얻는 기에 라운드 한도 없음(엔진에 그런 한도가 없어 지금도 참, 표시용 깃발) / 기 상한 −1(kiCapOf)
  mk_h6: { rule: { u_chillKiFree: 1 }, cost: { kiCap: -1 } },
  // mk_h7 반탄의 가사: 되받기마다 붕괴 +10(ctrBrk) / 자세 중 받는 피해 +10%
  mk_h7: { rule: { ctrBrk: 10 }, cost: { inP: (b, p) => p.stance ? -0.1 : 0 } },
  // mk_h8 역혈의 고리: 나를 직접 친 적에게 둔화 1(js/24 u_struck) / 최대 생명력 −10%
  mk_h8: { rule: { u_struck: (b, p, e) => { if (!e.alive) return; const g = addS(b, e, 'chill', 1); if (g) logp(b, 'good', '역혈의 고리: ' + e.n + '에게 둔화 1'); return g ? 1 : 0; } }, cost: { hpMul: 0.9 } },
  // mk_h9 일점의 권갑: 기를 쏟은 스킬이 둔화된 적을 치면 둔화 1마다 +15% / 여럿을 치는 스킬 피해 −20%
  mk_h9: { rule: { pctUp: (b, p, e, o, c) => c && c.skill && b.kiTookA === b.actN && e ? 0.15 * st(e, 'chill') : 0 }, cost: { hitP: (b, p, e, o, c) => mkSkAoe(c) ? -0.2 : 0 } },
  // mk_r1 철사 붕대: 기가 실리지 않은 ▶ 공격 +10% / 기를 쓴 ▶ 공격 +25% → +20%(js/32 outDmg u_kiMain)
  mk_r1: { rule: { pctUp: (b, p, e, o, c) => c && !b.curFast && !st(p, 'empower') ? 0.1 : 0 }, cost: { u_kiMain: b => b && b.cur && !b.curFast ? -0.05 : 0 } },
  // mk_r2 무쇠 가사: 후열 적의 공격도 되받는다(js/12 monkCtrOk u_ctrFar) / 되받기 피해 −25%
  mk_r2: { rule: { u_ctrFar: 1 }, cost: { hitP: (b, p, e, o) => o && o.ctr ? -0.25 : 0 } },
  // mk_r3 호흡 장갑: 호흡(m_hoheup) 유산 0(js/23 skCostAt u_ysOff) / 최대 스태미나 −20
  mk_r3: { rule: { u_ysOff: s => s && s.id === 'm_hoheup' ? 99 : 0 }, cost: { st: { st: -20 } } },
  // mk_r4 기의 염주: 전투 시작 기 2 / 전투 시작 유산 −1
  mk_r4: { rule: { onStart: (b, p) => addS(b, p, 'empower', 2) > 0 ? 1 : 0 }, cost: { ysStart: -1 } },
  // mk_r5 되받는 반지: 되받기로 쓰러뜨리면 기 +2 / 받는 피해 +5%
  mk_r5: { rule: { onCounter: (b, p, e) => { if (e.alive) return; const g = addS(b, p, 'empower', 2); if (g) logp(b, 'good', '되받는 반지: 기 +' + g); return g ? 1 : 0; } }, cost: { inP: () => -0.05 } },
  // mk_r6 선정의 물: 플라스크를 마시면 기 +3 / 생명력 플라스크 회복 −30%
  mk_r6: { rule: { onFlask: (b, p) => { const g = addS(b, p, 'empower', 3); if (g) logp(b, 'good', '선정의 물: 기 +' + g); return g ? 1 : 0; } }, cost: { healMul: 0.7 } },
});
/* ---- 마검사 (spellblade) ---- */
const sbUqSpell1 = c => { const S = c && c.skill && SK2[c.id]; return !!(S && S.kind === 'spell' && ['melee', 'ranged', 'pick'].includes(S.tgt)); }; // 한 적을 치는 주문
const sbUqNext = (b, u) => { const L = alive(b).filter(x => x !== u && x.role !== 'root'); return L.find(x => x.row === u.row) || L[0] || null; }; // 곁의 적 하나(같은 열 먼저)
Object.assign(UQFX, {
  // sb_h1 처형자의 인장: 출혈 걸린 적을 베면 출혈 1마다 베기 피해 +1(상한 +8) / 칼에 싣는 출혈 −1(바닥 1)
  sb_h1: { rule: { hitAdd: (b, p, e, o, c) => sbIsCut(p, c) && e ? Math.min(8, stk(e, 'bleed')) : 0 }, cost: { u_imbueAdd: (b, p, s) => s === 'bleed' ? -1 : 0 } },
  // sb_h2 피 먹는 장검: 칼에 실은 상태가 전투 끝까지 남는다 / 최대 생명력 −10%
  sb_h2: { rule: { u_edgeKeep: 1 }, cost: { hpMul: 0.9 } },
  // sb_h3 불씨 장갑: 한 적을 치는 주문이 그 뒤 후열 적 하나에게도 절반 / 주문 스킬 피해 −10%
  sb_h3: { rule: { onHit: (b, p, e, o, c, d) => { if (o.dot || o.uqx || !(d > 0) || !sbUqSpell1(c) || e.row !== 'front') return; const x = alive(b).find(y => y !== e && y.row === 'back' && y.role !== 'root'); if (!x) return; hurtEnemy(b, x, d * 0.5, { single: 1, uqx: 1, label: '불씨 장갑' }); return 1; } },
    cost: { hitP: (b, p, e, o, c) => c && c.skill && (SK2[c.id] || {}).kind === 'spell' && !o.uqx ? -0.1 : 0 } },
  // sb_h4 잿불 검: 베기가 맞힐 때 그 적의 화상 +1 / 내가 받는 화상이 걸릴 때 +1
  sb_h4: { rule: { onHit: (b, p, e, o, c, d) => { if (o.dot || !(d > 0) || !sbIsCut(p, c) || !e.alive) return; addS(b, e, 'ignite', 1); return 1; } }, cost: { dur: k => k === 'ignite' ? 1 : 0 } },
  // sb_h5 마갑 핵: 보호막 비례 피해의 상한 ×2 / 보호막 상한 −5%p
  sb_h5: { rule: { u_wardDmgCap: 2 }, cost: { u_wardCapAdd: -0.05 } },
  // sb_h6 교차 손가락: 교대한 베기의 붕괴 +12(행동마다 맞은 적 하나에 한 번, M5-7: 기본 공격 제외) / 교대 보호막 −2
  sb_h6: { rule: { onHit: (b, p, e, o, c) => { if (o.dot || o.uqx || !b.sbAlt || b.sbK !== 'cut' || !c || c.extra || (BRK_RULE.basic0 && c.id === 'basic') || !e.alive) return; const m = b.uqAltBrk && b.uqAltBrk.a === b.actN ? b.uqAltBrk : (b.uqAltBrk = { a: b.actN }); if (m[e.id]) return; m[e.id] = 1; addBreak(b, e, 12); return 1; } }, cost: { altWardAdd: -2 } },
  // sb_h7 겁화의 재: 혈염 피해의 절반이 곁의 적 하나에게도 / 혈염 걸린 적이 있으면 받는 피해 +10%
  sb_h7: { rule: { u_searTick: (b, p, u, a) => { if (b.over || !(a > 0)) return; const x = sbUqNext(b, u); if (!x) return; hurtEnemy(b, x, a * 0.5, { dot: 1, label: '혈염(겁화의 재)' }); return 1; } },
    cost: { inP: b => alive(b).some(x => stk(x, 'sear') > 0) ? -0.1 : 0 } },
  // sb_h8 죄인의 사슬 갑옷: 보호막이 깨질 때 전열 모두에게 출혈 2 / 최대 생명력 −12%
  sb_h8: { rule: { u_wardBreak: (b, p) => { const fr = alive(b).filter(x => x.row === 'front'); for (const x of fr) addS(b, x, 'bleed', 2); if (fr.length) logp(b, 'good', '죄인의 사슬: 보호막이 깨져 전열 모두에게 출혈 2'); return fr.length ? 1 : 0; } }, cost: { hpMul: 0.88 } },
  // sb_h9 타는 플라스크: 마시면 남은 유산 1마다 보호막 +4 / 마실 때 남은 유산을 모두 태운다(규칙이 먼저 센다)
  sb_h9: { rule: { onFlask: (b, p, k) => { const y = k === 'life' ? ysNow(p) : 0; if (!(y > 0)) return; const g = addWard(b, p, 4 * y, undefined, true); logp(b, 'good', '타는 플라스크: 유산 ' + y + ' → 보호막 +' + r1(g)); return 1; } },
    cost: { onFlask: (b, p, k) => { const y = k === 'life' ? ysNow(p) : 0; if (!(y > 0)) return; p.ys = 0; logp(b, 'bad', '타는 플라스크: 남은 유산 ' + y + '을(를) 모두 태운다'); uqR(p, 'u_ysZero', b, p); return 1; } } },
  // sb_r1 양날의 교대검: 기본 공격이 교대의 상대로 센다 / 기본 공격 피해 −15%
  sb_r1: { rule: { u_basicAlt: 1 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.15 : 0 } },
  // sb_r2 낙인 흉갑: 교대 보호막 ×2 / 보호막 상한 15% → 10%(−5%p)
  sb_r2: { rule: { u_altWardMul: 2 }, cost: { u_wardCapAdd: -0.05 } },
  // sb_r3 붉은 손: 베기 스킬 유산 −1(내 차례에 한 번, 바닥 1) / 주문 스킬 유산 +1
  sb_r3: { rule: { u_cutDisc: 1 }, cost: { u_spellYs: 1 } },
  // sb_r4 두 숨의 목걸이: 유산이 0이 되면 보호막 +12(전투에 한 번) / 최대 스태미나 −15
  sb_r4: { rule: { u_ysZero: (b, p) => { if (b.uqTwoBreath) return; b.uqTwoBreath = 1; const g = addWard(b, p, 12, undefined, true); logp(b, 'good', '두 숨의 목걸이: 유산이 바닥나 보호막 +' + r1(g)); return 1; } }, cost: { st: { st: -15 } } },
  // sb_r5 칼날의 반지: 칼로 실어 건 상태가 아직 걸린 적에게 기본 공격 +20% / 칼에 싣기 −1(바닥 1)
  sb_r5: { rule: { u_edgeApply: (b, p, e, E) => { const K = e.uqEdgeK = e.uqEdgeK || {}; K[E.s] = 1; for (const x of E.also || []) K[x.s] = 1; return 1; }, pctUp: (b, p, e, o, c) => c && c.id === 'basic' && e && e.uqEdgeK && Object.keys(e.uqEdgeK).some(k => stk(e, k) > 0) ? 0.2 : 0 },
    cost: { u_imbueAdd: () => -1 } },
  // sb_r6 핏빛 플라스크: 마시면 칼에 출혈 4를 싣는다 / 생명력 플라스크 회복 −20%
  sb_r6: { rule: { onFlask: (b, p, k) => { if (k !== 'life' || p.build !== 'spellblade') return; sbLoad(b, p, 'bleed', 4); return 1; } }, cost: { healMul: 0.8 } },
});
/* ---- 파수꾼 고유 15 (wd_). 엔진 지점: wdGuardWard(js/24) u_guardWard · runSkill2(js/10) u_wardDmgCapAdd · u_multiBrk · u_chain2 · u_burnMul · addBreak(js/32) u_brkOut · hurtPlayer(js/24) u_guardHit · skCostAt(js/23) u_stanceFree · wdUse(js/10) u_noStanceOn · flaskL(js/32) u_flaskNoHp ---- */
{ const wdT = c => { const s = c && c.skill && SK2[c.id]; return s ? s.tgt : null; }, wdOn = p => !!(p.wdSt && (p.wdSt.def || p.wdSt.atk));
Object.assign(UQFX, {
  // 문지기의 맹세: 수비 태세 중 방어 보호막 +8 / 태세가 꺼져 있으면 받는 피해 +15%
  wd_h1: { rule: { u_guardWard: p => p.wdSt && p.wdSt.def ? 8 : 0 }, cost: { inP: (b, p) => wdOn(p) ? 0 : -0.15 } },
  // 모루 방패: 보호막 비례 피해(wardDmg)의 상한 +10 / 강공격 스태미나 +10
  wd_h2: { rule: { u_wardDmgCapAdd: 10 }, cost: { cost: (p, id) => id === 'heavy' ? 10 : 0 } },
  // 쇠주먹 장갑: 공격 태세 중 강공격 붕괴 +10(행동에 한 번) / 공격 태세 중 받는 피해 +10%
  wd_h3: { rule: { onHit: (b, p, e, o, c) => { if (!c || c.id !== 'heavy' || c.extra || !(p.wdSt && p.wdSt.atk) || !e.alive || b.uqWdH3 === b.actN) return; b.uqWdH3 = b.actN; addBreak(b, e, 10); return 1; } }, cost: { inP: (b, p) => p.wdSt && p.wdSt.atk ? -0.1 : 0 } },
  // 성문 파쇄추: 무너진 적에게 강공격 피해 +50%(maxOf) / 기본 공격 피해 −10%
  wd_h4: { rule: { pctUp: (b, p, e, o, c) => c && c.id === 'heavy' && e && e.s && e.s.broken ? 0.5 : 0 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.1 : 0 } },
  // 휩쓰는 손: 전열 모두(front · all)를 치는 스킬이 대상마다 붕괴 +8 / 한 적을 치는 스킬(melee · ranged · pick) 피해 −10%
  wd_h5: { rule: { u_multiBrk: () => 8 }, cost: { hitP: (b, p, e, o, c) => ['melee', 'ranged', 'pick'].includes(wdT(c)) ? -0.1 : 0 } },
  // 갈고리 사슬검: 사슬의 검으로 후열 적을 치면 후열 적 하나를 더 친다 / 사슬의 검 피해 −20%
  wd_h6: { rule: { u_chain2: 1 }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'f_chainblade' ? -0.2 : 0 } },
  // 공성의 인장: 보호막을 태우는 공격(wardBurn)의 배율 +0.5 / 보호막이 없으면 받는 피해 +10%
  wd_h7: { rule: { u_burnMul: 0.5 }, cost: { inP: (b, p) => (p.ward || 0) > 0 ? 0 : -0.1 } },
  // 도미노 반지: 적이 무너지면 다른 적 모두 붕괴 +15(그대로 더함, 다시 번지지 않는다) / 내가 채우는 붕괴 ×0.9(적 차례 포함)
  wd_h8: { rule: { onBreak: (b, p, e) => { if (b.uqWdDom) return; const c = b.cur; let n = 0; b.uqWdDom = 1; b.cur = null; for (const x of fFoes(b)) if (x !== e) { addBreak(b, x, 15); n++; } b.cur = c; b.uqWdDom = 0; if (n) logp(b, 'good', '도미노 반지: 곁의 적 붕괴 +15'); return n ? 1 : 0; } }, cost: { u_brkOut: () => 0.9 } },
  // 불퇴의 갑주: 방어하면 가시 1번(피해 4) / 흘리기 스태미나 +10
  wd_h9: { rule: { onAct: (b, p, id) => { if (id !== 'guard') return; const t = p.thorn; p.thorn = Object.assign({}, t || {}, { n: Math.min(WARD.thornMax, (t ? t.n : 0) + 1), dmg: Math.max(t ? t.dmg || 0 : 0, 4) }); logp(b, 'good', '불퇴의 갑주: 가시 ' + p.thorn.n + '번(피해 ' + p.thorn.dmg + ')'); return 1; } }, cost: { cost: (p, id) => id === 'dodge' ? 10 : 0 } },
  // 묵직한 철퇴: 기본 공격이 맞으면 보호막 +2(행동에 한 번) / 기본 공격 피해 −10%
  wd_r1: { rule: { onHit: (b, p, e, o, c, d) => { if (!c || c.id !== 'basic' || !(d > 0) || b.uqWdR1 === b.actN) return; b.uqWdR1 = b.actN; return addWard(b, p, 2) > 0 ? 1 : 0; } }, cost: { hitP: (b, p, e, o, c) => c && c.id === 'basic' ? -0.1 : 0 } },
  // 되비치는 방패갑: 방어 중 맞으면(보호막이 다 받아내도) 그 적 붕괴 +6 / 최대 생명력 −8%
  wd_r2: { rule: { u_guardHit: (b, p, o) => { const e = o.src; if (!e || !e.alive || e.role === 'root') return; addBreak(b, e, 6); return 1; } }, cost: { hpMul: 0.92 } },
  // 태세의 장갑: 태세를 바꿀 때(다른 태세가 켜져 있을 때) 유산 0 / 태세를 켤 때의 효과(보호막 8 · 피해 5 · 붕괴 12) 없음
  wd_r3: { rule: { u_stanceFree: 1 }, cost: { u_noStanceOn: 1 } },
  // 성벽의 목걸이: 라운드가 끝날 때 보호막이 상한이면 스태미나 +6 / 최대 스태미나 −10
  wd_r4: { rule: { onRound: (b, p) => { if (!((p.ward || 0) >= wardMax(p)) || p.st >= p.stMax) return; fxStam(p, 6); return 1; } }, cost: { st: { st: -10 } } },
  // 참회의 반지: 생명력 절반 아래면 보호막 획득 +30% / 절반 위면 −10% (wardP: 생성 보정을 받는 보호막)
  wd_r5: { rule: { wardP: (b, p) => p.hp < p.hpMax * 0.5 ? 0.3 : 0 }, cost: { wardP: (b, p) => p.hp > p.hpMax * 0.5 ? -0.1 : 0 } },
  // 쇳물 플라스크: 생명력 플라스크를 마시면 보호막(최대 생명력의 25%, 고정) / 생명력 플라스크로 생명력을 회복하지 못한다
  wd_r6: { rule: { onFlask: (b, p, k) => { if (k !== 'life') return; const g = addWard(b, p, p.hpMax * 0.25, undefined, true); if (g > 0) logp(b, 'good', '쇳물 플라스크: 보호막 +' + r1(g)); return 1; } }, cost: { u_flaskNoHp: 1 } },
}); }
