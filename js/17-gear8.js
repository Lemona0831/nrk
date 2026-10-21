'use strict';
/* ===== 0.8.0 M6-1 장비 틀 (gear8, 만든 사람 확정 10월 20일 · 설계 nrk-private M6-장비-설계 3~5절) =====
   장비 = 기반(슬롯 · 챕터 · 등급 수치) + 접사 0~3 + (고유 규칙). 스위치 GEAR8.on(측정 env GEAR8, tools/variants.json gear8). 기본값 끔 — 끄면 아무 것도 바뀌지 않는다(M6-2에서 켬).
   한 개의 장비(인스턴스): { rollV: 2, g8: 1, uid, tpl: 기반 모양(AFFIX_BASE), g, ch, b, af: [{ id, v }], ax: { id, v } | null, uq: 고유 id | null }
   applyGear가 g8 장비를 p.eq 대신 p.g8 = { af: [...], uq: [...] }에 모은다(낀 장비 전부, 같은 묶음은 큰 쪽만 — 두 반지 포함).
   효과는 fxList의 항목으로만 든다: 접사 묶음 하나(g8af, 같은 대상의 %는 가장 큰 하나만 — maxOf) + 고유마다 규칙(uq_id) · 대가(uqc_id). 훅 이름은 IFX와 같다.
   고유 규칙이 엔진의 새 지점을 읽을 때는 uqF · uqV · uqA · uqR(아래)로 읽는다: g8 장비가 없으면(p.g8u 없음) 곧바로 기본값을 돌려준다 — 스위치를 끄면 같은 시드 결과가 같다 */
const GEAR8 = { on: false };
const UQFX = {}; // 고유 규칙 · 대가: UQFX[id] = { rule: {훅}, cost: {훅} } (js/18-unique-rules.js)
const uqF = (p, key) => !!(p && p.g8u) && fxFlag(p, key);
const uqV = (p, key, init, comb) => p && p.g8u ? fxVal(p, key, init, comb) : init;
const uqA = (p, hook, ...a) => p && p.g8u ? fxAdd(p, hook, ...a) : 0;
const uqM = (p, hook, ...a) => p && p.g8u ? fxMul(p, hook, ...a) : 1;
const uqR = (p, hook, ...a) => { if (p && p.g8u) fxRun(p, hook, ...a); };
const uqHas = (p, id) => !!(p && p.g8 && p.g8.uq && p.g8.uq.includes(id));
const isG8 = it => !!(it && it.g8);
/* 장비 하나 만들기(생성기는 M6-2): spec = { base, g, ch, b?, af: [[id, v]...], ax?: [id, v], uq? } */
function mkItem8(spec) {
  const g = spec.g || 'n', R = GRADE[g] || GRADE.n;
  return { rollV: 2, g8: 1, foundAt: Date.now(), uid: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tpl: spec.base, g, ch: spec.ch || 1, b: spec.b != null ? spec.b : Math.round((R.lo + R.hi) / 2),
    af: (spec.af || []).map(([id, v]) => ({ id, v })), ax: spec.ax ? { id: spec.ax[0], v: spec.ax[1] } : null, uq: spec.uq || null };
}
function mkUq(id) { const U = UNIQUE[id]; return mkItem8({ base: U.base, g: U.g, ch: U.ch, af: U.af, ax: U.ax && U.ax[1] ? U.ax : null, uq: id }); }
const g8Slot = it => kindOf((AFFIX_BASE[it.tpl] || {}).slot || 'weapon');
/* 낀 g8 장비 → p.g8. 같은 묶음(fam)은 큰 값 하나만(3-2 규칙 4 · 10절 결정 1: 두 반지도) */
function g8Collect(items) {
  const best = {}, uq = [];
  for (const it of items) { for (const a of (it.af || []).concat(it.ax ? [it.ax] : [])) { const A = AFFIX[a.id]; if (!A) continue; const f = A.fam || a.id; if (!best[f] || Math.abs(a.v) > Math.abs(best[f].v)) best[f] = { id: a.id, v: a.v }; } if (it.uq && UNIQUE[it.uq]) uq.push(it.uq); }
  return { af: Object.values(best), uq };
}
/* fxList가 부른다: p.g8 → 항목들. 같은 p.g8 객체는 한 번만 엮는다(세이브 · 복사로 새 객체가 되면 다시) */
const G8C = new WeakMap();
function g8Entries(p) {
  const G = p.g8; if (!G) return null; let e = G8C.get(G); if (e) return e;
  const O = G.only; // 시험용(unique-check): 없음 = 전부 · 'af' 접사만 · 'uq' 규칙+대가 · 'rule' 규칙만 · 'cost' 대가만 · 'none' 기반 수치만
  e = []; const P = G.af && G.af.length && (!O || O === 'af') ? g8AfFx(G.af) : null; if (P) e.push(['g8af', P.fx]);
  const U = []; for (const id of G.uq || []) { const X = UQFX[id]; if (!X) continue; if ((!O || O === 'uq' || O === 'rule') && X.rule) { e.push(['uq_' + id, X.rule]); U.push(X.rule); } if ((!O || O === 'uq' || O === 'cost') && X.cost) e.push(['uqc_' + id, X.cost]); }
  if ((P && (P.dmg.length || P.inR.length || P.brk.length)) || U.some(f => f.pctUp || f.inDown || f.brkUp)) e.push(['g8max', g8MaxFx(P, U)]);
  G8C.set(G, e); return e;
}
/* 금지선 ③ 배수끼리 곱하기 금지(3-6 · maxOf): 같은 대상의 % 올림은 가장 큰 하나만 든다 — 주는 피해(접사 % · 고유 규칙 pctUp) · 받는 피해 줄임(접사 · inDown) · 붕괴(brkUp).
   깎는 쪽(고유의 대가: hitP · inP · brkMul 음수)은 따로 더한다 */
function g8MaxFx(P, U) {
  const mx = (L, a) => { let m = 0; for (const f of L) { const v = f(...a); if (v > m) m = v; } return m; };
  const dm = (P ? P.dmg : []).concat(U.filter(f => f.pctUp).map(f => f.pctUp)), ir = (P ? P.inR : []).concat(U.filter(f => f.inDown).map(f => f.inDown)), bk = (P ? P.brk : []).concat(U.filter(f => f.brkUp).map(f => f.brkUp));
  const o = {}; if (dm.length) o.hitP = (...a) => mx(dm, a); if (ir.length) o.inP = (...a) => mx(ir, a); if (bk.length) o.brkMul = (...a) => 1 + mx(bk, a); return o;
}
/* 접사 효과(g8AfFx): { fx: 더하기 · 일 훅, dmg: [주는 피해 % (b,p,e,o,c)], inR: [받는 피해 줄임 (b,p,o)], brk: [붕괴 % (b,p,e,c)] } — 아래 접사 엔진 절 */
/* ===== 접사 엔진 (3-2 규칙 5: 접사는 규칙을 만들지 않는다 — 이미 있는 효과 키만 쓴다) =====
   행동(act): basic · heavy · skill · aoe(여럿을 치는 스킬) · br:갈래 · cut(베기) · spell(주문) · ctr(되받기) · burst(터뜨리기) · main(▶ 주 행동) · alt(교대한 행동), 없으면 모든 직접 피해.
   조건(cond, 부록 B): lowHp · big · many · first · same · broken · back · st:상태 · ward · stance(:def · :atk) · ki:N · track3 · linked · srcChill · srcIgnite · srcPoison(받는 피해 쪽) */
const g8Sk = c => c && c.skill ? SK2[c.id] : null;
const g8Aoe = c => { const s = g8Sk(c); return !!(s && (s.tgt === 'all' || s.tgt === 'front')); };
function g8Act(a, b, p, c, o) {
  if (!a) return true; if (a === 'ctr') return !!(o && o.ctr); if (a === 'shock') return !!b.elShockBrk; if (!c) return false;
  if (a === 'basic' || a === 'heavy') return c.id === a; if (a === 'skill') return !!c.skill; if (a === 'aoe') return g8Aoe(c);
  if (a === 'cut' || a === 'spell') { const s = g8Sk(c); return !!(s && s.kind === a); } if (a === 'burst') return !!c.skill && fxHas(c, 'burst');
  if (a === 'main') return !b.curFast && (c.id === 'basic' || c.id === 'heavy' || !!c.skill); if (a === 'alt') return !!b.sbAlt;
  if (a.startsWith('br:')) { const s = g8Sk(c); return !!(s && s.b === a.slice(3)); } return false;
}
function g8Cond(k, b, p, e, o) {
  if (!k) return true;
  if (k === 'lowHp') return p.hp < p.hpMax * 0.5; if (k === 'ward') return (p.ward || 0) > 0; if (k === 'first') return (b.round || 0) <= 1;
  if (k === 'stance') return !!(p.wdSt && (p.wdSt.def || p.wdSt.atk)); if (k === 'stance:def') return !!(p.wdSt && p.wdSt.def); if (k === 'stance:atk') return !!(p.wdSt && p.wdSt.atk);
  if (k.startsWith('ki:')) return st(p, 'empower') >= +k.slice(3);
  if (k === 'many') return alive(b).filter(x => x.row !== 'back' && realFoe(x)).length >= 2;
  if (k === 'srcChill' || k === 'srcIgnite' || k === 'srcPoison') return !!(o && o.src && !o.dot && st(o.src, k.slice(3).toLowerCase()) > 0);
  if (k === 'linked') return b.g8LinkT === b.turnIdx;
  if (!e) return false;
  if (k === 'big') return !!(e.elite || e.strong || e.role === 'boss'); if (k === 'broken') return !!e.s.broken; if (k === 'back') return e.row === 'back';
  if (k === 'same') return !!b.g8Same && b.g8LastT === e.id; if (k === 'track3') return !!(p.focus && p.focus.id === e.id && p.focus.n >= HUNT.focusMax);
  if (k.startsWith('st:')) return st(e, k.slice(3)) > 0; return false;
}
const g8Kw = (b, e, kw, n) => { if (!e || !e.alive || !(n > 0)) return; if (kw === 'poison') addPoison(b, e, n, 1); else addS(b, e, kw, n); };
function g8AfFx(af) {
  const fx = { st: {} }, dmg = [], inR = [], brk = [], ev = {}; const on = (k, f) => (ev[k] = ev[k] || []).push(f);
  const sum = (k, v) => { fx[k] = (fx[k] || 0) + v; };
  for (const a of af) {
    const A = AFFIX[a.id]; if (!A) continue; const F = A.fx, v = a.v;
    switch (F.k) {
      case 'dmgP': if (F.act === 'shock') { const m0 = fx.shockMul; fx.shockMul = (...x) => (m0 ? m0(...x) : 1) * (1 + v / 100); break; } /* 열충격은 지속 피해 경로라 열충격 배수로 */ dmg.push((b, p, e, o, c) => g8Act(F.act, b, p, c, o) && g8Cond(F.cond, b, p, e, o) ? v / 100 : 0); break;
      case 'inR': inR.push((b, p, o) => o && !(o.dot && F.cond && F.cond.startsWith('src')) && g8Cond(F.cond, b, p, o.src, o) ? v / 100 : 0); break;
      case 'hitAdd': on('hitAdd', (b, p, e, o, c) => g8Act(F.act, b, p, c, o) && g8Cond(F.cond, b, p, e, o) ? v : 0); break;
      case 'brk': on('brk', (b, p, e, c) => (F.act === 'shock') === !!b.elShockBrk && g8Act(F.act, b, p, c) && g8Cond(F.cond, b, p, e) ? v : 0); break; /* 열충격의 붕괴에는 열충격 붕괴만 */
      case 'stat': fx.st[F.s] = (fx.st[F.s] || 0) + v; break;
      case 'cost': on('cost', (p, id) => id === F.act ? -v : 0); break;
      case 'heal': sum('heal', v / 100); break;
      case 'flaskSlot': fx.cap = { life: 1 }; break;
      case 'ysStart': sum('ysStart', 1); break;
      case 'edgeAdd': on('edgeAdd', () => 1); break;
      case 'altWard': sum('altWardAdd', v); break;
      case 'ctrBrk': sum('ctrBrk', v); break;
      case 'guardRed': sum('u_guardRed', v / 100); break;
      case 'parryRed': sum('u_parryRed', v / 100); break;
      case 'freezeBrk': sum('u_freezeBrk', v); break;
      case 'boltSt': sum('u_boltSt', 1); break;
      case 'costOnce': fx.u_costOnce = (fx.u_costOnce || []).concat([F.tag]); break;
      case 'cleanse': on('onFlask', (b, p, k) => { if (k !== 'life') return; const bad = KW_BAD.filter(x => st(p, x) > 0).sort((x, y) => st(p, y) - st(p, x))[0]; if (!bad) return; delete p.s[bad]; logp(b, 'good', '플라스크가 해로운 상태 하나를 씻어 낸다'); return 1; }); break;
      case 'killRefund': on('onKill', b => b.cur && b.cur.skill ? ysItem(b, '거두는 손') : 0); break;
      case 'thorn': on('onHurt', (b, p, o) => { if (!p.guard || !o || o.dot || !o.src || !o.src.alive) return; hurtEnemy(b, o.src, v, { label: '가시' }); return 1; }); break;
      case 'nextBasic': on('onEvade', b => { b.g8EvB = 1; return 1; }); dmg.push((b, p, e, o, c) => b.g8EvB && c && c.id === 'basic' ? v / 100 : 0); on('onHit', (b, p, e, o, c) => { if (b.g8EvB && c && c.id === 'basic') b.g8EvB = 0; }); break;
      case 'stam': case 'ward': case 'kw': {
        const give = F.k === 'stam' ? (b, p) => fxStam(p, v) : F.k === 'ward' ? (b, p) => addWard(b, p, v) : (b, p, e) => g8Kw(b, e, F.kw, v);
        const once = (b, key) => { b.g8Once = b.g8Once || {}; const t = b.actN + ':' + key; if (b.g8Once[a.id] === t) return false; b.g8Once[a.id] = t; return true; };
        const T = F.on;
        if (T === 'basicHit' || T === 'heavyHit' || T === 'cutHit' || T === 'spellHit' || T === 'aoeHit') on('onHit', (b, p, e, o, c) => {
          const ok = T === 'basicHit' ? c && c.id === 'basic' : T === 'heavyHit' ? c && c.id === 'heavy' : T === 'aoeHit' ? g8Aoe(c) : g8Act(T === 'cutHit' ? 'cut' : 'spell', b, p, c, o);
          if (!ok || !g8Cond(F.cond, b, p, e, o) || !once(b, F.k === 'kw' ? e.id : 'p')) return; give(b, p, e); return 1; });
        else if (T === 'parry' || T === 'evade') on(T === 'parry' ? 'onParry' : 'onEvade', (b, p, src) => { if (!g8Cond(F.cond, b, p, src)) return; give(b, p, src); return 1; });
        else if (T === 'ctr') on('onCounter', (b, p, e) => { give(b, p, e); return 1; });
        else if (T === 'hurt') on('onHurt', (b, p, o) => { if (!o || o.dot || !o.src || !o.src.alive) return; give(b, p, o.src); return 1; });
        else if (T === 'round') on('onRound', (b, p) => { give(b, p); return 1; });
        else if (T === 'flask') on('onFlask', (b, p, k) => { if (k !== 'life') return; give(b, p); return 1; });
        else if (T === 'resp') on('u_resp', (b, p) => { give(b, p); return 1; });
        else if (T === 'guard') on('onAct', (b, p, id) => { if (id !== 'guard' || !g8Cond(F.cond, b, p)) return; give(b, p); return 1; });
        else if (T === 'defOn') on('onSkill', (b, p, act) => { const w = act && act.s && act.s.fx.find(x => x.k === 'wdStance'); if (!w || w.s !== 'def' || !(p.wdSt && p.wdSt.def)) return; give(b, p); return 1; });
        else if (T === 'stanceSet') on('onSkill', (b, p, act) => { if (!(act && act.s && act.s.fx.some(x => x.k === 'stance'))) return; give(b, p); return 1; });
        break;
      }
      default: break;
    }
  }
  // 같은 적을 이어 치는가(sameTgt) · 연계 빠른 행동 뒤인가(hn_chainBrk): 접사가 있을 때만 적는다
  on('onAct', (b, p, id, act, tgt) => { if (!tgt || tgt === p || !(id === 'basic' || id === 'heavy' || (act && act.skill && !act.self))) return; b.g8Same = b.g8LastT === tgt.id; b.g8LastT = tgt.id; });
  on('onSkill', b => { if (b.hnLinkFast) b.g8LinkT = b.turnIdx; });
  for (const k in ev) { const L = ev[k]; fx[k] = ['hitAdd', 'brk', 'cost'].includes(k) ? (...x) => L.reduce((s, f) => s + (f(...x) || 0), 0) : (...x) => { let r = 0; for (const f of L) if (f(...x)) r = 1; return r; }; }
  if (!Object.keys(fx.st).length) delete fx.st;
  return { fx, dmg, inR, brk };
}
/* ===== 화면(8절 기준 5): 이름 · 다섯 줄 · 비교 ===== 
   이름(3-3 · 10절 결정 2): 평범 = 기반 모양, 고급 = [앞 조각] [기반], 희귀 = [첫째 앞 조각] [기반] — [둘째 뒤 조각], 영웅 = [축 이름 조각] [기반](축이 이름을 정한다), 고유 = 제 이름.
   장비 칸: 이름 한 줄 · 기반 수치 한 줄 · 접사 한 줄씩(최대 3). 고유는 이름 · 규칙 · 대가 · 기반과 접사 한 줄 · 글귀 — 다섯 줄을 넘지 않는다. 점수 V는 보이지 않는다(도구용) */
const G8_ICON = [['기본공격연동', '🗡'], ['막기', '🛡'], ['보호막', '🛡'], ['흘리기', '🌀'], ['몸 빼기', '🌀'], ['붕괴', '💥'], ['광역', '✨'], ['출혈', '🩸'], ['화상', '🔥'], ['중독', '☠'], ['둔화', '❄'], ['열충격', '❄'], ['되받기', '↩'], ['태세', '🛡'], ['기', '☯'], ['추적', '🎯']];
function g8Icon(A) { if (A.ax) return '★'; for (const [t, i] of G8_ICON) if ((A.tags || []).includes(t)) return i; return A.fx.k === 'dmgP' || A.fx.k === 'hitAdd' ? '🗡' : A.fx.k === 'inR' || A.fx.k === 'stat' ? '🛡' : '·'; }
const g8AfTxt = a => { const A = AFFIX[a.id]; return A ? A.txt.replace('{v}', a.v) : a.id; };
const g8Piece = (a, ch) => { const A = AFFIX[a.id]; if (!A) return ''; const n = A.n[Math.min(3, Math.max(1, ch || 1)) - 1]; return n.replace(/\{갈래\}/g, ''); };
function g8Name(it) {
  if (it.uq && UNIQUE[it.uq]) return UNIQUE[it.uq].n; const base = (AFFIX_BASE[it.tpl] || {}).n || it.tpl, af = it.af || [];
  if (it.g === 'h' && it.ax && AFFIX[it.ax.id]) return AFFIX[it.ax.id].n[0] + ' ' + base;
  if (it.g === 'r' && af.length >= 2) return g8Piece(af[0], it.ch) + ' ' + base + ' — ' + (AFFIX[af[1].id] || {}).back;
  if ((it.g === 'm' || it.g === 'r') && af.length) return g8Piece(af[0], it.ch) + ' ' + base;
  return base;
}
function g8NameHtml(it) { const R = GRADE[it.g] || GRADE.n; return `<span class="gl" aria-hidden="true">${R.n[0]}</span><span class="sr">${R.n} </span>${it.uq ? '<span aria-hidden="true">✦ </span><span class="sr">이름 있는 장비 </span>' : ''}${esc(g8Name(it))}`; }
/* 이름을 뺀 줄들(최대 4) */
function g8Lines(it) {
  const afs = (it.af || []).concat(it.ax ? [it.ax] : []), U = it.uq && UNIQUE[it.uq];
  if (U) return [{ k: 'act', t: U.rule.txt }, { k: 'cost', t: '대가: ' + U.cost.txt }, { k: 'mini', t: baseText(it) + (afs.length ? ' · ' + afs.map(g8AfTxt).join(' · ') : '') }, { k: 'lore', t: U.lore }];
  return [{ k: 'base', t: baseText(it) }].concat(afs.slice(0, 3).map(a => ({ k: 'af', t: g8AfTxt(a), i: g8Icon(AFFIX[a.id] || { tags: [], fx: {} }), ax: !!(AFFIX[a.id] || {}).ax })));
}
function g8Detail(it, o) {
  o = o || {}; const L = g8Lines(it), sl = g8Slot(it);
  const row = x => x.k === 'lore' ? (o.compact ? '' : `<p class="lore">${esc(x.t)}</p>`) : x.k === 'base' ? `<div class="idet-base"><b>${esc(x.t)}</b></div>` : x.k === 'af' ? `<div class="l af${x.ax ? ' ax' : ''}"><span class="afi" aria-hidden="true">${x.i}</span> ${esc(x.t)}</div>` : `<div class="l ${x.k}">${esc(x.t)}</div>`;
  return `<div class="idet g8 grb-${it.g}${it.fresh ? ' has-new' : ''}">${newBadge(it)}<div class="idet-h"><b class="gr-${it.g}">${g8NameHtml(it)}</b>${gradeTag(it.g)}<span class="mini">${EQ_SLOT_N[sl === 'ring' ? 'ring1' : sl].replace(' 1', '')} · ${it.ch || 1}챕터</span></div>${L.map(row).join('')}</div>`;
}
/* 비교(8절): 끼운 것과 나란히, 기반 수치 차이만 ▲▼ + 얻는 · 잃는 접사 + 같은 묶음 안내(10절 결정 1). 다섯 줄 이하 */
function g8Compare(run, it, slot) {
  const curU = run.eqU[slot], cur = curU && run.inv[curU]; const rows = [];
  const bn = itemBase(it).v, bc = cur ? itemBase(cur).v : 0, k = itemBase(it).k, d = bn - bc;
  if (Math.abs(d) > 0.05) { const up = d > 0, f = k === 'flask' ? x => Math.round(x * 1000) / 10 + '%' : r1; rows.push(`<li class="${up ? 'up' : 'dn'}"><span class="ar" aria-hidden="true">${up ? '▲' : '▼'}</span><span class="sr">${up ? '좋아짐 ' : '나빠짐 '}</span>${itemBase(it).lab} <b>${up ? '+' : '−'}${f(Math.abs(d))}</b></li>`); }
  else rows.push(`<li>${itemBase(it).lab} 그대로</li>`);
  const lines = x => !x ? [] : x.uq ? [UNIQUE[x.uq].rule.txt] : (x.af || []).concat(x.ax ? [x.ax] : []).map(g8AfTxt);
  const gain = lines(it).filter(t => !lines(cur).includes(t)), lose = lines(cur).filter(t => !lines(it).includes(t));
  if (gain.length) rows.push(`<li class="up">얻는 것: ${esc(gain.join(' · '))}</li>`);
  if (lose.length) rows.push(`<li class="dn">잃는 것: ${esc(lose.join(' · '))}</li>`);
  if (it.uq) rows.push(`<li class="dn">대가: ${esc(UNIQUE[it.uq].cost.txt)}</li>`);
  // 같은 묶음: 다른 칸에 같은 묶음 접사가 있으면 큰 쪽만 든다
  const fams = {}; for (const sl of EQ_SLOTS) { if (sl === slot) continue; const x = run.eqU[sl] && run.inv[run.eqU[sl]]; if (!x || !isG8(x)) continue; for (const a of (x.af || [])) { const A = AFFIX[a.id]; if (A) fams[A.fam] = Math.max(fams[A.fam] || 0, a.v); } }
  const clash = (it.af || []).filter(a => AFFIX[a.id] && fams[AFFIX[a.id].fam] != null);
  if (clash.length) rows.push(`<li class="mini">같은 묶음은 큰 쪽만 듭니다: ${esc(clash.map(a => g8AfTxt(a) + (a.v > fams[AFFIX[a.id].fam] ? ' (이쪽이 듦)' : ' (다른 칸이 듦)')).join(' · '))}</li>`);
  else if (slot === 'ring1' || slot === 'ring2') rows.push('<li class="mini">같은 묶음은 큰 쪽만 듭니다(두 반지도).</li>');
  return `<div class="cmp g8"><div class="cmph">${cur ? `지금 낀 <b class="gr-${cur.g}">${isG8(cur) ? g8NameHtml(cur) : inm(cur.tpl, cur.g)}</b>과 비교` : '이 칸은 비어 있습니다'}</div><ul class="cmpl" aria-label="바뀌는 것">${rows.slice(0, 5).join('')}</ul></div>`;
}
