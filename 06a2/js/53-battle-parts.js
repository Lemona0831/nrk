'use strict';
/* ===== 표시 규칙: T 숨기기, 순서·빠르기·남은 차례 + 설명 창 ===== */
/* 빌드 자원: 항상 보이게 */
function buildRes(p) {
  if (p.build === 'berserker') { const rt = p.s && p.s.rage ? '<b class="rg">격노</b>' : `<span class="pips" role="img" aria-label="분노 ${p.rage}/10">${'●'.repeat(p.rage)}${'○'.repeat(Math.max(0, 10 - p.rage))}</span>`; return `<div class="bres"><span class="rgw" data-info="rage" tabindex="0">분노 ${rt}</span></div>`; }
  if (!(scarRate(p) > 0)) return '';
  const mx = Math.round(p.hpMax * 0.5), w = mx ? Math.min(100, p.scar / mx * 100) : 0;
  const rageTxt = p.s && p.s.rage ? '<b class="rg">격노</b>' : `<span class="pips" role="img" aria-label="분노 ${p.rage}/10">${'●'.repeat(p.rage)}${'○'.repeat(Math.max(0, 10 - p.rage))}</span>`;
  return `<div class="bres"><div class="mb" data-info="scar" tabindex="0"><div class="bar sc" role="progressbar" aria-label="상흔" aria-valuemin="0" aria-valuemax="${mx}" aria-valuenow="${Math.round(p.scar)}"><i style="width:${w}%"></i><span>상흔 ${Math.round(p.scar)}/${mx}</span></div></div></div>`;
}
function dmgMult(p) { let m = 1; if (p.eq.ring1 === 'pulse' || p.eq.ring2 === 'pulse') m *= 1.35; if (p.s.weak) m *= 0.75; if (p.s.rage) m *= 1.4; if (p.build === 'berserker' && p.rage) m *= 1 + p.rage * 0.03; return m; }
/* 지금 쓰면 나올 값 */
/* 숨겨진 직업 1의 버튼 미리보기: 먹기 · 출혈 비례 · 받은 피해 · 내 생명력 조건 · 나에게 출혈 */
function buHint(b, a) {
  const p = b.p, f = a.s.fx, out = []; const t = actTarget(b, a); const bl = e => e ? stk(e, 'bleed') : 0;
  const md = f.find(e => e.k === 'drain' && e.s === 'bleed' && e.me); if (md) out.push(bl(p) ? '내 출혈 ' + bl(p) + ' 거둠' : '거둘 내 출혈 없음');
  const ms = f.find(e => e.k === 'meSt' && e.s === 'bleed'); if (ms) out.push('나에게 출혈 ' + ms.n);
  const dr = f.find(e => e.k === 'drain' && e.s === 'bleed' && !e.me && !e.kill);
  if (dr && !a.aoe) { const n0 = bl(t); const n = dr.max ? Math.min(dr.max, n0) : dr.half ? Math.ceil(n0 / 2) : n0; if (!n) out.push('먹을 출혈 없음'); else { const v = n * dr.per * healMul(p); const room = Math.min(Math.max(0, Math.min(p.hpMax, p.hpFight != null ? p.hpFight : p.hpMax) - p.hp), buEatLeft(b)); out.push('출혈 ' + n + ' 먹음 → +' + r1(v) + (room < v ? '(한도까지 ' + r1(room) + ')' : '')); } }
  const ex = f.find(e => e.k === 'exploit' && e.s === 'bleed'); if (ex && (ex.me || !a.aoe)) { const n = ex.me ? Math.min(ex.max || 10, bl(p)) : bl(t); out.push((ex.me ? '내 출혈 ' : '출혈 ') + n + ' → +' + r1(n * ex.per)); }
  const gr = f.find(e => e.k === 'grudge'); if (gr) { const g = buGrudgeNow(b); out.push(g > 0 ? '받은 피해 ' + Math.round(g) + ' → +' + r1(Math.min(gr.max || 999, gr.per * g)) : '맞은 피해 없음'); }
  const lx = f.find(e => e.k === 'lowx' && e.me); if (lx) out.push(p.hp <= p.hpMax * lx.hp ? '×' + lx.mul + ' 듦' : '안 듦(내 생명력 ' + Math.round(p.hp / p.hpMax * 100) + '%)');
  if (t && !a.self && isMeleeAct(p, a.id) && bl(t) > 0 && f.some(e => e.k === 'dmg')) out.push('흡혈 ' + Math.round(Math.min(BUTCH.leechMax, BUTCH.leech * bl(t)) * 100) + '%');
  return out.join(' · ');
}
/* 마검사 버튼 아랫줄: 교대면 "⇄ +4"(이번 차례 직업 보호막 전) · "⇄", run 2가 켜지면 "⇄⇄", 칼이 실린 베기는 "칼: 출혈 5", 상태 조건 · 비례 미리보기 */
function sbHint(b, a) {
  const p = b.p; if (p.build !== 'spellblade' || !a) return ''; const k = sbKindOf(p, a.id, a); if (!k) return ''; const out = [];
  const alt = !!p.sbLast && k !== p.sbLast; const run = alt ? (p.sbRun || 0) + 1 : 0; const F = kk => a.v2 && a.s ? a.s.fx.find(e => e.k === kk) : null; const af = F('alt');
  if (af && af.run === 2 && run >= 2) out.push('⇄⇄'); else if (alt) out.push(b.sbAltTurn !== b.turnIdx ? '⇄ +' + ((BUILDS.spellblade || {}).altWard || 0) : '⇄');
  if (k === 'cut' && p.edge) { const ex = F('edgeX'); out.push('칼: ' + KW_N[p.edge.s] + ' ' + Math.min(KW[p.edge.s] || 10, Math.round(p.edge.n * (ex ? ex.mul : 1)))); }
  const t = !a.self && !a.aoe ? actTarget(b, a) : null;
  if (t) { const kx = F('kwx'), ex = F('exploit'); if (kx && st(t, kx.s) > 0) out.push(KW_N[kx.s] + ' ×' + kx.mul); if (ex && ex.s && st(t, ex.s) > 0) out.push('+' + r1(ex.per * st(t, ex.s)) + ' (' + KW_N[ex.s] + ' ' + st(t, ex.s) + ')'); }
  return out.join(' · ');
}
/* 숨겨진 직업 2의 버튼 미리보기: 옮기기 · 벗기기 · 정화 · 사함 · 비례 · 고행 */
function cfHint(b, a) {
  const p = b.p, f = a.s.fx, out = []; const F = k => f.find(e => e.k === k); const t = !a.self && !a.aoe ? actTarget(b, a) : null;
  const cl = F('cleanse'), tr = F('transfer'), pd = F('perDmg'), dp = F('dispel');
  if (tr) { const r = cfTake(p, tr.only, tr.n, 'xfer', 1); const rc = a.aoe ? alive(b).filter(e => cfMover(e) && (a.s.tgt !== 'front' || e.row === 'front')) : t && cfMover(t) ? [t] : [];
    out.push(!r.c ? '옮길 짐 없음' : !rc.length ? '받을 적 없음' : rc.length > 1 ? cfNames(r.got) + '을(를) ' + rc.length + '명에게 나눔' : cfNames(r.got) + ' 옮김'); }
  if (dp) { const n = a.aoe ? alive(b).reduce((m, e) => m + Math.min(dp.n || CONF.cap, stk(e, 'empower')), 0) : t ? Math.min(dp.n || CONF.cap, stk(t, 'empower')) : 0; out.push(n ? '벗김: 강화 ' + n : '벗길 강화 없음'); }
  let gain = 0;
  if (cl) { const r = cfTake(p, cl.only, cl.n, 'clean', 1);
    if (cl.offer) out.push(r.c ? '바침 ' + r.c + ' → ' + [cl.dmg ? '피해 +' + r.c * cl.dmg : '', cl.brk ? '붕괴 +' + r.c * cl.brk : ''].filter(Boolean).join(' · ') : '바칠 짐 없음');
    else if (!r.c) out.push('지울 짐 없음'); else if (!r.e) out.push('고행 몫: 보호 없음');
    else { gain = Math.min(CONF.protMax, Math.ceil(r.e / CONF.per)); const L = [(cl.after ? '친 뒤 ' : '') + '지움 ' + r.c + ' → 보호 +' + gain]; if (cl.heal) L.push('생명력 +' + r1(r.e * cl.heal * healMul(p))); if (cl.stam) L.push('스태미나 +' + r.e * cl.stam); out.push(L.join(' · ')); if (cl.after) gain = 0; } }
  if (pd) { const X = pd.of === 'prot' ? Math.min(CONF.cap, stk(p, 'protect') + gain) : pd.of === 'burden' ? cfBurden(p) : pd.of === 'clean' ? Math.min(CONF.cap, b.cleanTurn && b.prepTurn === b.turnIdx ? b.cleanTurn : 0) : !t ? 0 : pd.of === 'tbad' ? Math.min(CONF.cap, CONF.kinds.reduce((m, k) => m + stk(t, k), 0)) : Math.min(CONF.cap, stk(t, pd.of));
    const W = { prot: '보호', burden: '짐', clean: '앞서 지운', weak: '약화', bleed: '출혈', tbad: '대상의 짐' }[pd.of];
    if (!(pd.of === 'clean' && !X)) out.push([pd.per ? '+' + pd.per * X : '', pd.brk ? '붕괴 +' + pd.brk * X : ''].filter(Boolean).join(' · ') + ' (' + W + ' ' + X + ')' + (pd.spend && X ? ' · 보호를 씀' : '')); }
  const ms = f.filter(e => e.k === 'meSt' && CONF.kinds.includes(e.s)); if (ms.length) out.push('행동 뒤 ' + ms.map(e => KW_N[e.s] + ' ' + e.n).join(', '));
  if ((F('quick') || (cl && cl.quick)) && b.extraQuick) out.push('빠른 칸 덤은 이번 차례에 이미 받음');
  return out.join(' · ');
}
function cfLine(b) {
  const p = b.p; if (!isCf(p)) return ''; const n = cfBurden(p), sf = cfSelfSum(p); const es = Math.min(CONF.cap, CONF.kinds.reduce((a, k) => a + stk(p, k) - cfSelf(p, k), 0)); const g = Math.min(CONF.protMax, Math.ceil(es / CONF.per));
  return `<div class="focusln" data-info="cfburden" tabindex="0">⚖️ 짐 ${n ? `<b>${n}</b>/${CONF.cap}${sf ? ' (고행 ' + sf + ')' : ''}${g ? ' · 지우면 보호 +' + g : ''}` : '0'}</div>`;
}
const CF_KW = { 짐: '중독을 뺀 내 해로운 상태(출혈 · 화상 · 약화 · 취약 · 둔화) 숫자의 합입니다. 세는 숫자는 모두 5까지입니다.', 정화: '해로운 상태를 지웁니다. 적이 건 상태를 지운 숫자 2마다 보호 1(올림, 한 번에 3까지)을 얻습니다.', 사함: '해로운 상태를 바쳐 피해나 붕괴로 바꿉니다. 보호는 생기지 않습니다.', 옮기기: '적이 건 내 상태를 떼어 같은 상태로 적에게 겁니다. 여럿에게 옮기면 나눠 겁니다. 움직이지 않는 적은 받지 않습니다. 보호는 생기지 않습니다.', 벗기기: '적의 강화를 지웁니다.', 고행: '스킬이 나에게 거는 해로운 상태입니다. 행동이 끝난 뒤 걸리고, 막음과 의지로 막히지 않습니다. 바치거나 안고 칠 수만 있습니다. 지워도 보호와 덤이 없고, 옮겨지지 않습니다.' };
function cfKwHtml(s) {
  if (!s || !/^c_/.test(String(s.id))) return ''; const f = s.fx, ks = [];
  if (f.some(e => e.k === 'perDmg' && e.of === 'burden')) ks.push('짐'); if (f.some(e => e.k === 'cleanse' && !e.offer)) ks.push('정화'); if (f.some(e => e.k === 'cleanse' && e.offer)) ks.push('사함');
  if (f.some(e => e.k === 'transfer')) ks.push('옮기기'); if (f.some(e => e.k === 'dispel')) ks.push('벗기기'); if (f.some(e => e.k === 'meSt' && CONF.kinds.includes(e.s))) ks.push('고행');
  return ks.map(k => `<p class="mini"><b>${k}</b> ${esc(CF_KW[k])}</p>`).join('');
}
function skillHint(b, a) { const h0 = skillHint0(b, a), h1 = sbHint(b, a); return h0 && h1 ? h0 + ' · ' + h1 : h0 || h1; }
/* 숨겨진 직업 3의 버튼 미리보기: 생명력 내기 · 먹기(넘침) · 낸 피 · 약화 비례 · 번짐 · 값 깎기 */
function bmHint(b, a) {
  const p = b.p, f = a.s.fx, out = []; const t = !a.self && !a.aoe ? actTarget(b, a) : null; const ps = e => e ? st(e, 'poison') : 0;
  const hc = bmHpCost(p, a.s); if (hc && a.pull) out.push('🩸 ' + hc + ' + ' + (a.blood || 0)); // 비용 줄에 없는 몫만 (당길 때 스킬 값 + 당기는 값)
  const dr = f.find(e => e.k === 'drain' && e.eat);
  if (dr) { let n = 0; if (a.aoe) { for (const e of alive(b)) if (e.role !== 'root' && (a.s.tgt === 'all' || e.row === 'front')) n += Math.min(dr.max || 99, ps(e)); } else n = Math.min(dr.max || 99, ps(t));
    if (!n) out.push('먹을 중독 없음'); else { const v = Math.min(n * dr.per * healMul(p), p.hpMax * BLOOD.eatCap); const g = Math.min(v, p.hpMax - p.hp); out.push('중독 ' + n + ' 먹기 → +' + r1(g) + (v - g > 0.5 ? ' (넘침 ' + r1(v - g) + ')' : '') + (dr.dmg ? ' · 피해 +' + n * dr.dmg : '')); }
    if (t && t.chant && ps(t) > 0 && !a.aoe) out.push('📿 영창 중인 적'); }
  const bd = f.find(e => e.k === 'bloodDmg'); if (bd) { const paid = Math.min(BLOOD.dmgCount, (b.prepTurn === b.turnIdx ? b.paidTurn || 0 : 0) + hc + (a.blood || 0)); out.push('낸 피 ' + paid + ' → +' + r1(paid * bd.per)); }
  const pd = f.find(e => e.k === 'perDmg'); if (pd && t) out.push('약화 ' + st(t, 'weak') + ' → +' + st(t, 'weak') * pd.per);
  const sk = f.find(e => e.k === 'spread' && e.kill && !e.s); if (sk && t && ps(t) > 0) out.push(sk.mark ? '표식' : '쓰러뜨리면 중독 ' + Math.min(BLOOD.spreadKillMax, Math.ceil(ps(t) * (sk.per || 1))) + ' 번짐');
  const pc = f.find(e => e.k === 'payCut'); if (pc) out.push(pc.off != null ? '다음 당기기 −' + pc.off + '턴' : '다음 당기기 절반');
  return out.join(' · ');
}
function skillHint0(b, a) {
  const p = b.p; const tg = G.sel ? b.en.find(e => e.id === G.sel && e.alive) : null;
  if (a.v2 && a.s && isBu(p)) return buHint(b, a);
  if (a.v2 && a.s && isCf(p)) return cfHint(b, a); // 숨겨진 직업 2
  if (a.v2 && a.s && isBm(p)) return bmHint(b, a);
  if (a.id === 'release') return p.scar < 1 ? '상흔 없음' : `상흔 ${Math.round(p.scar)} → 적마다 ${r1(p.scar * 0.8 * dmgMult(p))}`;
  if (a.id === 'scarcut') return p.scar < 1 ? '상흔 없음' : `상흔 추가 ${r1(p.scar * 0.5 * 1.5 * dmgMult(p))}`;
  if (a.id === 'purge') { let n = 0; for (const k of ['poison', 'bleed', 'ignite', 'chill', 'weak', 'vuln', 'brand']) if (p.s[k]) n += (k === 'poison' || k === 'chill') ? p.s[k].stacks : 1; return n ? `해제 ${n} → ${r1(n * 5 * dotMul(p) * dmgMult(p))}` : '해제할 것 없음'; }
  if (a.v2 && a.s) { const wb = a.s.fx.find(e => e.k === 'wardBurn'), wd = a.s.fx.find(e => e.k === 'wardDmg'); if (wb) { const take = Math.min(p.ward || 0, wb.max || Infinity); return take > 0 ? '보호막 ' + Math.round(take) + ' 태움 → 피해 ' + r1(take * wb.mul) : '보호막 없음: 태우기 피해 0'; } if (wd) return '보호막 비례 +' + r1((p.ward || 0) * wd.per); } // 파수꾼 (10월 4일: 보호막이 0이어도 다른 효과는 들어가 버튼은 쓸 수 있다)
  if (a.v2 && a.s && p.build === 'elementalist' && a.s.tgt !== 'self') return elemHint(b, a); // 원소술사: 열충격 미리 보기
  if (a.v2 && a.s && p.build === 'monk') { const fx = k => a.s.fx.find(e => e.k === k); const ki = st(p, 'empower'); const t = actTarget(b, a); const out = []; // 수도승 (10월 7일): 터뜨리기 · 기 비례 · 거두기 · 끊기 미리보기
    const kb = fx('kiBurst'); if (kb) { const pre = kb.pre && t && st(t, 'chill') > 0 ? kb.pre : 0; const tk = Math.min(kb.max || KW.empower, ki + pre); out.push(tk ? '기 ' + tk + ' 터뜨림 → 피해 +' + tk * kb.per + (kb.brk ? ' · 붕괴 +' + tk * kb.brk : '') : '터뜨릴 기 없음'); }
    const kp = fx('kiPer'); if (kp) out.push('기 ' + ki + ' → 피해 +' + kp.per * ki + ((a.s.hits || 1) > 1 ? '씩' : ''));
    const kg = fx('kiGrow'); if (kg) out.push('기 → ' + Math.min(KW.empower, (Math.max(0, ki - 1) + (kg.add || 0)) * (kg.mul || 1)));
    const mi = a.s.fx.find(e => e.k === 'meSt' && e.if === 'chill'); if (mi) { const n = a.aoe ? alive(b).filter(e => e.row === 'front' && st(e, 'chill') > 0).length : t && st(t, 'chill') > 0 ? 1 : 0; out.push(n ? (a.aoe ? '둔화된 적 ' + n : '대상 둔화 ' + st(t, 'chill')) + ' → 기 +' + mi.n * n : '둔화 없음'); }
    const sx = fx('sealx'); if (sx && t && t.intent && SEAL_K.includes(t.intent.k)) out.push(t.strong || t.role === 'boss' ? '강적: 붕괴 +' + sx.brk : '지원을 끊음');
    if (out.length) return out.join(' · '); }
  if (a.id === 'burst') { const t = actTarget(b, a); const n = t && t.s.poison ? t.s.poison.stacks : 0; return n ? `중독 ${n} → ${r1(poisonTotal(n) * dotMul(p) * 1 * dmgMult(p))}·붕괴+${n * PSN.brk}` : '중독된 적 없음'; }
  return '';
}
/* 원소술사 버튼 미리 보기 (10월 7일, 설계 F-2절): 열충격이 나면 T · 피해 · 붕괴, 엮기는 걸 원소, 불태우기는 태울 화상. 둔화를 깨면 무뎌짐을 잃는다 */
function elemHint(b, a) {
  const s = a.s; const multi = s.tgt === 'front' || s.tgt === 'all';
  if (multi) { const n = alive(b).filter(e => e.role !== 'root' && (s.tgt === 'all' || e.row === 'front') && elemPreview(b, s, e, 1).shock).length; return n ? '💥 열충격 ' + n + '명' : ''; }
  const t = actTarget(b, a); if (!t) return ''; const v = elemPreview(b, s, t);
  const bo = s.fx.find(x => x.k === 'burnOut'); const L = [];
  if (bo) L.push(v.burn ? '🔥 화상 ' + v.burn + ' 태움 +' + r1(bo.per * v.burn * dotMul(b.p)) : '태울 화상 없음');
  if (v.shock) L.push('💥 T' + v.T + ' → ' + r1(v.d) + ' · 붕괴 ' + Math.round(v.brk) + (v.C0 > 0 && t.intent && t.intent.k === 'attack' && !t.intent.aimed ? ' · 무뎌짐 잃음' : ''));
  else if (v.wv) L.push((v.wv[0] === 'ignite' ? '🔥 화상 ' : '❄️ 둔화 ') + v.wv[1]);
  return L.join(' · ');
}
function rootRegen(b) {
  const boss = alive(b).find(e => e.boss === 'tree'); if (!boss) return 0;
  const roots = alive(b).filter(e => e.role === 'root').length;
  return Math.round(boss.hpMax * 0.025 * roots / 3 * (b.season === 0 ? 2 : 1) * 10) / 10;
}
function autoTarget(b, a) {
  const p = b.p;
  if (a.id === 'dodge') return pickDodge(b);
  let c = alive(b).filter(e => canTarget(b, e, a));
  if (a.id === 'reverse') c = c.filter(e => e.role !== 'root');
  if (!c.length) return null;
  const nonRoot = c.filter(e => e.role !== 'root'); const bossAlive = c.find(e => e.role === 'boss');
  if (a.id === 'burst') { const ex = c.filter(e => e.s.poison).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0]; if (ex) return ex; }
  if (a.id === 'viper') { const pool = (nonRoot.length ? nonRoot : c).filter(e => !e.s.poison || e.s.poison.stacks < 10); if (pool.length) return pool.sort((x, y) => ((y.s.poison ? y.s.poison.stacks : 0) - (x.s.poison ? x.s.poison.stacks : 0)) || (x.hp - y.hp))[0]; }
  if (a.id === 'reverse') return c.sort((x, y) => y.dmg - x.dmg)[0];
  if (a.v2 && a.s && isBm(p) && bmEats(a.s)) { const ex = c.filter(e => st(e, 'poison') > 0).sort((x, y) => st(y, 'poison') - st(x, 'poison'))[0]; if (ex) return ex; } // 숨겨진 직업 3: 먹는 칸
  const pool = nonRoot.length ? nonRoot : c;
  return pool.sort((x, y) => x.hp - y.hp)[0];
}
function explodeTarget(b) {
  const sel = G.sel ? b.en.find(e => e.id === G.sel && e.alive) : null;
  const ok = e => e && e.s.poison && e.s.poison.stacks >= 5 && canTarget(b, e, { id: 'basic', melee: 1 });
  if (ok(sel)) return sel;
  return alive(b).filter(ok).sort((x, y) => y.s.poison.stacks - x.s.poison.stacks)[0] || null;
}
function speedWord(t) { return t <= 0.6 ? '빠름' : t <= 1.05 ? '보통' : '느림'; }
/* 지금부터 until(라운드) 전까지 내 차례가 몇 번 오는가: 라운드마다 한 번 */
function myTurnsUntil(b, until) { return Math.max(0, Math.ceil(until - (b.t || 0) - 1e-9)); }
/* 이 행동을 하면 내 다음 차례 전에 누가 몇 번 움직이는가 */
function previewAfter(b, time) {
  if (time <= 0.6 && !b.bonusUsed && !noFast(b.p)) return []; // 빠른 칸: 같은 차례에 주 행동이 남는다
  const cnt = {}; const add = id => { const e = b.en.find(x => x.id === id && x.alive && x.role !== 'root'); if (e) cnt[e.id] = (cnt[e.id] || 0) + 1; };
  const q = (b.queue || []).slice(); if (q[0] === 'p') q.shift();
  for (const id of q) { if (id === 'p') return Object.keys(cnt).map(k => ({ e: b.en.find(x => x.id === k), n: cnt[k] })); add(id); } // 연속 행동: 내 차례가 바로 이어지면 여기까지
  for (const x of roundOrder(b, false)) { if (x.id === 'p') break; add(x.id); }
  return Object.keys(cnt).map(id => ({ e: b.en.find(x => x.id === id), n: cnt[id] }));
}
function previewText(b, time) {
  if (time <= 0.6 && !b.bonusUsed && !noFast(b.p)) return '빠른 칸을 써서 차례가 이어집니다. 적은 내 주 행동 뒤에 움직입니다.';
  const L = previewAfter(b, time);
  if (!L.length) return '내 다음 차례 전에 움직이는 적이 없습니다.';
  const g = {};
  for (const x of L) { const k = x.e.n; g[k] = g[k] || { n: 0, times: [] }; g[k].n++; g[k].times.push(x.n); }
  const parts = Object.entries(g).map(([name, v]) => {
    const same = v.times.every(t => t === v.times[0]);
    const tt = same ? (v.times[0] > 1 ? ' ' + v.times[0] + '번씩' : '') : ' (' + v.times.join('·') + '번)';
    return (v.n > 1 ? name + ' ' + v.n + '기' : name) + tt;
  });
  let s = '내 다음 차례 전에 ' + parts.join(', ') + ' 움직입니다.';
  const warn = [];
  for (const x of L) {
    const k = x.e.intent && x.e.intent.k;
    if (k === 'heavy') warn.push(x.e.n + '의 강타');
    else if (k === 'charge' && x.n >= 2) warn.push(x.e.n + '의 강타(충전 후 이어서)');
    else if (k === 'explode') warn.push(x.e.n + '의 폭발');
    else if (k === 'burn') warn.push(x.e.n + '의 화형');
    else if (k === 'fuse' && x.n >= 2) warn.push(x.e.n + '의 폭발(준비 후 이어서)');
    else if (k === 'heal') warn.push(x.e.n + '의 치유');
    else if (k === 'mirror') warn.push('나락의 거울');
  }
  if (warn.length) s += ' 그 사이 ' + Array.from(new Set(warn)).join(', ') + '이(가) 나옵니다.';
  return s;
}
function leftTurns(b, x) { const n = myTurnsUntil(b, x.until); return n; }

/* 상태 표시: 숫자 = 끝날 때까지 남은 내 차례 수, 가는 막대 = 남은 비율 */
function stsHtml(u, b, inCard, opt) {
  const out = [];
  const who = u === b.p ? 'p' : u.id;
  for (const k in u.s) {
    const x = u.s[k];
    if (KW[k]) { out.push(`<i class="${BUFFS[k] ? 'b' : 'd'}" data-info="st:${who}:${k}" tabindex="0">${SICO[k] ? `<span class="sic" aria-hidden="true">${SICO[k]}</span>` : ''}${k === 'empower' && u === b.p && u.build === 'monk' ? '기' : SNAMES[k] || k} <span class="pv2">${x.stacks}</span>${k === 'bleed' && u !== b.p && isBu(b.p) ? `<small> · 흡혈 ${Math.round(Math.min(BUTCH.leechMax, BUTCH.leech * x.stacks) * 100)}%</small>` : ''}</i>`); continue; } // 수도승: 강화를 "기"로
    const n = leftTurns(b, x);
    const dur = x.dur || Math.max(1, x.until - (x.from != null ? x.from : b.t));
    const frac = Math.max(0, Math.min(1, (x.until - b.t) / dur));
    out.push(`<i class="${BUFFS[k] ? 'b' : 'd'}" data-info="st:${who}:${k}" tabindex="0">${SICO[k] ? `<span class="sic" aria-hidden="true">${SICO[k]}</span>` : ''}${SNAMES[k] || k}${k === 'poison' ? ' <span class="pv2">' + x.stacks + '</span>' : (x.stacks > 1 ? ' ×' + x.stacks : '')} ${k === 'poison' || k === 'brand' ? '' : '<b>' + (n > 0 ? n : '곧') + '</b>'}${k === 'poison' || k === 'brand' ? '' : `<u style="width:${frac * 100}%"></u>`}</i>`);
  }
  if (u !== b.p && u.mark && isBm(b.p)) out.push(`<i class="d" data-info="bmmark" tabindex="0">☠️ 표식<small> · 쓰러지면 중독 ${Math.min(BLOOD.spreadKillMax, Math.ceil(st(u, 'poison') * (u.mark.per || 1)))} 번짐</small></i>`); // 숨겨진 직업 3
  if (u.stun > 0) out.push(`<i class="d" data-info="stun" tabindex="0"><span class="sic" aria-hidden="true">😵</span>기절</i>`);
  if (u === b.p) {
    if (u.guard) out.push('<i class="b" data-info="guardon" tabindex="0">막는 중</i>');
    if (u.dodge) { const de = b.en.find(x => x.id === u.dodge); out.push(`<i class="b" data-info="dodgeon" tabindex="0">${esc(de ? de.n : '')} 흘리기</i>`); }
    if (u.exhaust) out.push('<i class="d" data-info="exhaust" tabindex="0">탈진</i>');
    if (u.ward > 0) out.push(`<i class="b" data-info="ward" tabindex="0">보호막 <b>${Math.round(u.ward)}</b>${u === (b && b.p) && isV2(u) ? '<small>/' + wardMax(u) + '</small>' : ''}</i>`);
    if (u.thorn) out.push(u.thorn.bleed && !u.thorn.dmg ? `<i class="b" data-info="buthorn" tabindex="0">맞으면 출혈 ${u.thorn.bleed}<small> · ${u.thorn.n}번</small></i>` : `<i class="b" data-info="thorn" tabindex="0">가시 <b>${u.thorn.n}</b><small>·${u.thorn.dmg}</small></i>`);
    if (isBu(u)) { const th = buThirst(u), gn = buGrudgeNow(b); // 숨겨진 직업 1
      if (th > 0) out.push(`<i class="b" data-info="buthirst" tabindex="0"><span class="sic" aria-hidden="true">🩸</span>갈증 +${Math.round(th * 100)}%</i>`);
      if (gn > 0) out.push(`<i class="b" data-info="bugrudge" tabindex="0">받은 피해 <b>${Math.round(gn)}</b></i>`);
      out.push(`<i class="b" data-info="bueat" tabindex="0">먹기 ${Math.round(buEatLeft(b))}<small>/${Math.round(u.hpMax * BUTCH.eatFight)} 남음</small></i>`);
      if ((u.selfBl || 0) > 0 && stk(u, 'bleed') > 0) out.push('<i class="b" data-info="bufloor" tabindex="0">출혈로는 1에서 멈춤</i>'); }
    if (isBm(u)) { // 숨겨진 직업 3: 이번 차례 당김 · 낸 피 · 값 깎기
      if (b.bloodTurn === b.turnIdx && !b.over) out.push('<i class="b" data-info="bmpull" tabindex="0"><span class="sic" aria-hidden="true">🩸</span>이번 차례 당김</i>');
      const paid = b.prepTurn === b.turnIdx ? (b.paidTurn || 0) : 0; if (paid > 0 && skillsOf(u).some(id => SK2[id] && SK2[id].fx.some(e => e.k === 'bloodDmg'))) out.push(`<i class="b" data-info="bmpaid" tabindex="0">🩸 낸 피 <b>${Math.round(paid)}</b></i>`);
      const pc = u.payCut || []; const nh = pc.filter(x => x.mul != null).length, no = pc.filter(x => x.off != null); if (nh) out.push(`<i class="b" data-info="bmcut" tabindex="0">🩸½ ×${nh}</i>`); if (no.length) out.push(`<i class="b" data-info="bmcut" tabindex="0">🩸−${no[0].off}턴 ×${no.length}</i>`); }
    if (u.rime) for (const k in u.rime) if (u.rime[k] && u.rime[k].times > 0) out.push(`<i class="b" data-info="rime" tabindex="0">${k === 'ignite' ? '🔥' : '❄️'}↩ <b>${u.rime[k].times}</b><small>·${u.rime[k].n}</small></i>`); // 원소술사 되얼림 · 불꽃 외투
    if (u.build === 'monk' && (u.stance || u.guard)) out.push(`<i class="b" data-info="mstance" tabindex="0"><span class="sic" aria-hidden="true">🥋</span>자세</i>`); // 수도승: 자세 칩 하나(숫자와 덤은 설명 창)
    if (u.counter > 0) out.push(`<i class="b" data-info="counter" tabindex="0">반격 +${r1(u.counter)}</i>`);
    if (u.reflux) out.push('<i class="b" data-info="reflux" tabindex="0">되돌릴 독</i>');
  }
  /* 10월 7일: 이로움 ▲ · 해로움 ▼를 칩 앞에 붙인다(색만으로 가르지 않는다). 적 카드 안(inCard)에서는 칩이 따로 초점을 받지 않는다 */
  const mk = c => c === 'b' ? '<span class="sgn" aria-hidden="true">▲</span><span class="sr">이로움 </span>' : '<span class="sgn" aria-hidden="true">▼</span><span class="sr">해로움 </span>';
  const L = out.map(h => h.replace(/^<i class="(b|d)"([^>]*)>/, (m, c, rest) => '<i class="' + c + '"' + (inCard ? rest.replace(' tabindex="0"', '') : rest) + '>' + mk(c)));
  if (opt && opt.mode && opt.mode !== 'all') { /* 10월 9일 UI-simple: 간단 · 보통은 셋까지, 나머지는 +N */
    const isBad = h => h.indexOf('<i class="d"') === 0;
    const Ls = u === b.p ? L.filter(isBad).concat(L.filter(h => !isBad(h))) : L;
    const base = (opt.mode === 'bad' && u === b.p ? Ls.filter(isBad) : Ls).slice(0, inCard && opt.mode === 'bad' ? 2 : 3);
    const more = !!(!inCard && G.stsMore) && Ls.length > base.length; const vis = more ? Ls : base; const hid = Ls.filter(h => !vis.includes(h));
    if (!Ls.length) return '';
    if (inCard) return `<span class="sts">${vis.join('')}${hid.length ? `<span class="stsn" aria-hidden="true">+${hid.length}</span>` : ''}</span>`;
    const txt = Ls.filter(h => !base.includes(h)).map(h => h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).join(', ');
    return `<div class="sts">${vis.join('')}${more ? '<button class="sm stsmore" data-a="stsmore" aria-expanded="true">접기</button>' : hid.length ? `<button class="sm stsmore" data-a="stsmore" aria-expanded="false" aria-label="나머지 상태 ${hid.length}개 보기: ${esc(txt)}">+${hid.length} 더 보기</button>` : ''}</div>`;
  }
  if (!inCard && u === b.p && L.length > 5) { const L2 = L.filter(h => h.indexOf('<i class="d"') === 0).concat(L.filter(h => h.indexOf('<i class="d"') !== 0)); return G.stsMore ? `<div class="sts">${L2.join('')}<button class="sm stsmore" data-a="stsmore" aria-expanded="true">접기</button></div>` : `<div class="sts">${L2.slice(0, 4).join('')}<button class="sm stsmore" data-a="stsmore" aria-expanded="false">+${L.length - 4} 더 보기</button></div>`; } /* 10월 9일 UI: 상태 칩이 많으면 해로운 것부터 넷만 */
  return L.length ? (inCard ? `<span class="sts">${L.join('')}</span>` : `<div class="sts">${L.join('')}</div>`) : '';
}
/* 적 카드의 읽는 이름에 넣을 상태 낱말 (중독 4, 취약 2 …) */
function stsWords(u, b) {
  const out = [];
  for (const k in u.s) {
    const x = u.s[k], nm = SNAMES[k] || k;
    if (KW[k] || k === 'poison') { out.push(nm + ' ' + x.stacks); continue; }
    if (k === 'brand') { out.push(nm); continue; }
    const n = leftTurns(b, x); out.push(nm + (x.stacks > 1 ? ' ×' + x.stacks : '') + ' ' + (n > 0 ? n : '곧 끝남'));
  }
  if (u.stun > 0) out.push('기절');
  return out;
}

/* 적 카드 위 순번: 이번 라운드에 남은 줄에서 몇 번째로 움직이는가 (나를 빼고 1부터). 비면 이번 라운드에는 이미 움직였다 */
function enSlots(b, e) {
  const q = (b.queue || []).filter(id => id === 'p' || (b.en.find(x => x.id === id) || {}).alive);
  const L = []; let k = 0; for (const id of q) { if (id === 'p') continue; k++; if (id === e.id) L.push(k); }
  return L;
}
function eordText(b, e) { const L = enSlots(b, e); return L.length ? '이번 라운드 ' + L.join('·') + '번째로 움직임' : '이번 라운드에는 이미 움직임'; }
function eordHtml(b, e) {
  if (e.role === 'root' || b.over) return '';
  const L = enSlots(b, e);
  return L.length ? `<span class="eord${L[0] === 1 ? ' soon' : ''}" data-info="eord">${L.join('·')}번째</span>` : '<span class="eord done" data-info="eord">✓ 다음 라운드</span>';
}
/* 적 생명력: 굵은 막대 + 큰 숫자. 30% 아래면 붉게 */
function ehpBar(e) { const r = e.hpMax > 0 ? Math.max(0, Math.min(1, e.hp / e.hpMax)) : 0; return `<span class="bar hp ehp${r <= 0.3 ? ' lo' : ''}" role="progressbar" aria-label="생명력" aria-valuemin="0" aria-valuemax="${Math.round(e.hpMax)}" aria-valuenow="${shownHp(e.hp)}"><i style="width:${r * 100}%"></i><span><b>${shownHp(e.hp)}</b> / ${Math.round(e.hpMax)}</span></span>`; }
/* 이번 차례에 남은 칸: ⚡ 빠른 행동(먼저) + ▶ 주 행동(차례를 끝냄) */
function slotHtml(b) {
  const nf = noFast(b.p); const f = !b.bonusUsed && !nf;
  return `<span class="slots" data-info="slots" tabindex="0" role="group" aria-label="이번 차례에 남은 칸: ${f ? '빠른 행동과 ' : ''}주 행동"><span class="slot${f ? ' on' : ' used'}">⚡ ${nf ? '빠른 칸 없음' : '빠른 행동' + (f ? '' : ' 씀')}</span><span class="pl" aria-hidden="true">+</span><span class="slot on">▶ 주 행동</span></span>`;
}
function spdIco(t) { return t <= 0.6 ? '<span class="spd sf" role="img" aria-label="빠른 행동">⚡</span>' : t >= 1.25 ? '<span class="spd ss" role="img" aria-label="느린 행동, 두 칸">⏳</span>' : '<span class="spd sn" role="img" aria-label="주 행동">▶</span>'; } // 버튼 둘째 줄의 빠르기 글자를 뺀 대신 읽어 주는 이름을 단다

/* 순서표 (숫자 없이) */
function vOrder(b, hud) {
  const tl = preview(b); const rN = b.round || 1;
  const all = b.roundAll || [], q0 = b.queue || []; const dn = all.length >= q0.length && all.slice(all.length - q0.length).join() === q0.join() ? all.slice(0, all.length - q0.length) : [];
  const dnLis = dn.map(id => { const e = id === 'p' ? null : b.en.find(y => y.id === id); return id === 'p' || e ? `<li class="dn${id === 'p' ? ' me' : ''}" aria-label="${esc(id === 'p' ? '나' : e.n)}: 이번 라운드에 움직임 끝">✓ ${e ? e.ico + ' ' + esc(e.n) : '나'}</li>` : ''; }).join('');
  let lis = '', prevR = null;
  tl.forEach((x, i) => {
    if (x.r !== prevR) { lis += `<li class="rsep" aria-hidden="true">${x.r}R</li>`; if (x.r === rN) lis += dnLis; prevR = x.r; }
    const e = x.me ? null : b.en.find(y => y.id === x.id);
    lis += `<li class="${[x.me ? 'me' : '', x.now ? 'now' : '', x.r > rN ? 'nx' : ''].filter(Boolean).join(' ')}" data-info="tl:${i}" tabindex="${i === 0 ? 0 : -1}">${e ? e.ico + ' ' : ''}${esc(x.me ? '나' : x.n)}</li>`;
  });
  if (hud && !hud.ord) {
    const cur = tl.filter(x => x.r === rN); const nx = cur.find((x, i) => i > 0 && !x.me);
    return `<div class="order osum" data-hud="hud-order"><div class="axhead"><span><b>${rN}라운드</b></span><span class="ordnx">${cur[0] && cur[0].me ? '내 차례' : '적 차례'}${nx ? ' · 다음 ' + esc(nx.n) : ''}</span></div><ol class="ord sr" aria-label="행동 순서">${hudQuiet(lis)}</ol></div>`;
  }
  return `<div class="order" data-hud="hud-order"><div class="axhead"><span><b>${rN}라운드</b></span><span class="axdef">모두 한 번씩, 왼쪽부터 움직입니다</span></div><ol class="ord" aria-label="행동 순서, 좌우 화살표로 옮겨 봅니다">${lis}</ol></div>`;
}

