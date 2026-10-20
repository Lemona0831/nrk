'use strict';
/* 0.8.0 M5-1 파수꾼 재설계 점검 (10월 20일 만든 사람 설계지 + 07:40 보완). 실행: node tools/wd-check.js
   태세(하나만 · 켤 때 유산 2 · 끄기 0 · 켜는 차례의 작은 효과 · 수도승 자세와 다른 필드) · 신성한 기도(언제나, 수비 태세면 2배) · 묵직한 걸음 ·
   파성추(보호막 소모 · 증폭 · 방어 불가 · 보호막 생성 X) · 대지 분쇄(무너진 적 둘 이상이면 다음 차례 ×2 · 보호막 −50%) · 용맹한 방벽(방어 보호막 18 · 가시 · 흘리기 불가 · 스태미나 정지) ·
   결합 칸(돌아선 방패 · 쇠망치 손 · 사슬 끌기) · 조건 wst */
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, R_ = D.run_;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = E.__G, U = R_('WD_BOUND'), wdGuardWard = R_('wdGuardWard'), skCostAt = R_('skCostAt');
function fight(act, eq, en) {
  G.data = E.blankData(); G.data.unlAll = 1; G.cre = { name: 't' }; G.dropQ = []; G.b = null; G.sheet = null; E.startRun('warden'); const run = G.run; delete run.alloc; run.clears = 2; run.lv = 16;
  run.atree.own = act.slice(); run.skills = (eq || act.filter(id => (E.atBuild('warden').nodes[id] || {}).kind === 'skill')).slice(0, 4); E.atSync(run);
  const es = (en || ['bruiser', 'bruiser']).map((r, i) => E.mkEnemy(r, false, i)); for (const e of es) { e.hp = e.hpMax = 5000; e.dmg = 1; }
  const b = E.newBattle(run.p, es, {}); b.rngF = () => 0.5; b.stepMode = false; E.runUntilPlayer(b); return { run, p: run.p, b, es };
}
const A = (b, id) => E.actionList(b).find(x => x.id === id) || {};
const act = (b, id, t) => { b.p.ys = 9; b.p.st = b.p.stMax; E.playerAct(b, id, t); E.runUntilPlayer(b); };
// 태세
{ const { p, b, es } = fight(['w_dstance', 's_astance']); ok(A(b, 'w_dstance').yc === 2 && !p.wdSt.def, '태세는 꺼진 채 시작, 켤 때 유산 2');
  p.ward = 0; act(b, 'w_dstance'); ok(p.wdSt.def === 1 && p.stance == null, '수비 태세가 켜짐(수도승 자세 p.stance와 따로, p.wdSt)'); ok(b.log.some(x => /수비 태세: 보호막 \+/.test(x.m)), '켜는 차례에 보호막 소량');
  ok(A(b, 'w_dstance').yc === 0 && /끄기/.test(A(b, 'w_dstance').n), '켜져 있으면 끄기(유산 0)');
  const h0 = es[0].hp, k0 = es[0].brk || 0; act(b, 's_astance'); ok(p.wdSt.atk === 1 && !p.wdSt.def, '공격 태세를 켜면 수비 태세가 꺼짐(하나만)'); ok(es.some(e => e.hp < 5000 || (e.brk || 0) > 0), '공격 태세를 켜는 차례에 가벼운 타격 · 붕괴');
  act(b, 's_astance'); ok(!p.wdSt.atk, '다시 쓰면 끔'); }
// 태세 효과
{ const { p, b, es } = fight(['w_dstance', 's_astance']); const fx = R_('fxAdd'); act(b, 's_astance'); ok(Math.abs(fx(p, 'hitP', b, p, es[0], {}, { id: 'basic' }) - U.atkHit) < 1e-9 && fx(p, 'hitP', b, p, es[0], {}, { id: 'w_bash' }) === 0, '공격 태세: 기본 공격 · 강공격 +' + U.atkHit * 100 + '%(스킬은 아님)');
  ok(Math.abs(fx(p, 'inP', b, p, {}) + U.atkIn) < 1e-9, '공격 태세: 받는 피해 +' + U.atkIn * 100 + '%(맞추기 1번에서 0)'); act(b, 'w_dstance'); ok(Math.abs(fx(p, 'inP', b, p, {}) - U.defIn) < 1e-9, '수비 태세: 받는 피해 −' + U.defIn * 100 + '%');
  p.ward = 0; E.playerAct(b, 'guard'); const w0 = p.ward; E.runUntilPlayer(b); ok(b.log.some(x => /^수비 태세: 보호막 \+3/.test(x.m)), '수비 태세: 내 차례마다 보호막 +' + U.defWard); }
// 신성한 기도
{ const { p, b } = fight(['w_shieldhit', 'w_pray', 'w_dstance']); ok(A(b, 'w_pray').ok, '신성한 기도는 언제나 쓸 수 있음(07:40 보완)'); const heal = () => { const L = b.log.filter(x => /^신성한 기도: 생명력 \+/.test(x.m)); return +L[L.length - 1].m.match(/\+([\d.]+)/)[1]; }; p.hp = 50; act(b, 'w_pray'); const g1 = heal(); act(b, 'w_dstance'); p.hp = 50; act(b, 'w_pray'); const g2 = heal(); ok(Math.abs(g2 - 2 * g1) < 0.2 && Math.abs(g1 - p.hpMax * 0.03 * R_('healMul')(p)) < 0.2, '최대 생명력 3%, 수비 태세면 2배 (' + g1 + ' → ' + g2 + ')'); }
// 조건 wst
{ const { p, b } = fight(['w_dstance', 'w_shieldhit', 'w_stand', 'sv_w_stand']); p.run = 1; G.run.atree.vsel = { sv_w_stand: 'wv_st_wst' }; E.atSync(G.run); ok(A(b, 'w_stand').yc === 2, '태세의 버팀: 태세가 꺼져 있으면 2'); act(b, 'w_dstance'); ok(A(b, 'w_stand').yc === 1, '태세가 켜져 있으면 2 → 1'); }
// 묵직한 걸음
{ const { p, b, es } = fight(['s_astance', 's_march']); act(b, 's_march'); const hc = R_('heavyCost'); ok(p.wdSt.march === 3 - 1 || p.wdSt.march === 3, '묵직한 걸음: 3차례'); ok(hc(p) === 35 - U.marchHeavy || hc(p) < 35, '강공격 스태미나 −' + U.marchHeavy + ' (' + hc(p) + ')'); }
// 파성추
{ const { p, b, es } = fight(['w_dstance', 's_astance', 'w_flare', 'w_rebuild', 'w_breach', 'w_siege'], ['w_siege']); p.ward = 20; act(b, 'w_siege'); ok(p.ward === 0 && p.wdSt.siege >= 2 && Math.abs(p.wdSt.siegeAmp - 2) < 1e-9, '파성: 보호막 20을 모두 소모해 ×2.0'); ok(!A(b, 'guard').ok && /파성/.test(A(b, 'guard').why), '파성: 방어할 수 없음');
  ok(R_('addWard')(b, p, 10) === 0, '파성: 보호막을 얻지 못함'); const fm = R_('fxMul'); ok(Math.abs(fm(p, 'out', b, p, { id: 'heavy' }) - 2) < 1e-9 && fm(p, 'out', b, p, { id: 'w_bash' }) === 1, '파성: 기본 공격 · 강공격만 ×2.0');
  const k0 = es[0].brk || 0; act(b, 'basic', es[0].id); ok((es[0].brk || 0) - k0 >= U.siegeBrk || es[0].s.broken, '파성: 타격마다 붕괴 +' + U.siegeBrk); }
{ const { p, b } = fight(['w_siege'], ['w_siege']); p.ward = 5; act(b, 'w_siege'); ok(Math.abs(p.wdSt.siegeAmp - (1 + 5 / U.siegePer)) < 1e-9, '파성: 증폭은 소모한 보호막에 비례(5 → ×' + (1 + 5 / U.siegePer) + ')'); }
// 대지 분쇄
{ const { p, b, es } = fight(['s_quake'], ['s_quake'], ['bruiser', 'bruiser', 'bruiser']); for (const e of es) e.brk = (e.brkMax || 100) - 10; act(b, 's_quake'); const nb = es.filter(e => e.s.broken).length; ok(nb >= 2, '대지 분쇄: 전열 붕괴 +45로 둘 이상 무너짐(' + nb + ')'); ok(p.wdSt.quakeX === 1 || b.log.some(x => /다음 차례 내 피해 ×2/.test(x.m)), '대지 분쇄: 무너진 적이 둘 이상이면 다음 차례 ×2'); ok(p.wdSt.wardHalf >= 1, '대지 분쇄 대가: 보호막 획득량 −50%');
  const w0 = p.ward; const g = R_('addWard')(b, p, 10, undefined, true); ok(Math.abs(g - 5) < 1e-9, '보호막 10 → 5'); }
{ const { p, b, es } = fight(['s_quake'], ['s_quake'], ['bruiser', 'bruiser']); act(b, 's_quake'); ok(!p.wdSt.quakeX && !p.wdSt.quakeNext, '대지 분쇄: 무너진 적이 둘 미만이면 ×2 없음'); }
// 용맹한 방벽
{ const { p, b, es } = fight(['w_valor'], ['w_valor']); p.ward = 20; act(b, 'w_valor'); ok(p.wdSt.valor >= 2 && Math.abs(wdGuardWard(p) - U.valorGuard) < 1e-9, '용맹: 방어 보호막 +' + U.valorGuard); ok(p.thorn && p.thorn.dmg >= 5, '용맹: 반사는 가시 방패(p.thorn, 보호막의 절반)');
  ok(!A(b, 'dodge').ok && /용맹/.test(A(b, 'dodge').why), '용맹: 흘리기를 쓸 수 없음'); p.st = 10; R_('tickOnce')(b); ok(p.st === 10, '용맹: 스태미나 자연 회복 정지'); p.wdSt.valor = 0; R_('tickOnce')(b); ok(p.st > 10, '용맹이 걷히면 다시 찬다'); }
// 결합 칸
{ const { p, b } = fight(['w_dstance', 's_astance', 'w_turncoat']); act(b, 'w_turncoat'); act(b, 'w_dstance'); ok(A(b, 's_astance').yc === 0, '돌아선 방패: 태세를 바꿀 때 비용 없음'); act(b, 's_astance'); ok(p.wdSt.atk && p.wdSt.nextBrk === U.turnBrk, '바꾼 직후 첫 기본 공격 붕괴 +' + U.turnBrk); }
{ const { p, b, es } = fight(['s_slam', 's_hammerhand']); act(b, 's_hammerhand'); const fx = R_('fxAdd'); E.addS(b, es[0], 'broken', 2); es[0].s.broken = es[0].s.broken || { until: 99 }; ok(Math.abs(fx(p, 'hitP', b, p, es[0], {}, { id: 'basic' }) - (U.hammerMul - 1)) < 1e-9 && fx(p, 'hitP', b, p, es[1], {}, { id: 'basic' }) === 0, '쇠망치 손: 무너진 적에게 기본 공격 ×' + U.hammerMul); }
{ const { p, b, es } = fight(['f_chainblade', 'f_chainpull'], null, ['bruiser', 'archer']); const back = es.find(e => e.row === 'back') || es[1]; back.row = 'back'; act(b, 'f_chainpull'); act(b, 'f_chainblade', back.id); ok(back.row === 'front' && p.wdSt.chainPull === U.pullN - 1, '사슬 끌기: 사슬의 검이 후열 적을 전열로(남은 ' + p.wdSt.chainPull + ')'); }
console.log('wd-check: ' + n + '개 통과');
