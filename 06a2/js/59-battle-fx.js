'use strict';
/* ===== 전투 시각 이펙트 (10월 10일, 0.6a.2-108 · 다시 만듦 0.6a.2-114) =====
   장식만 한다. 피해 · 판정 · 순서 · 진행 속도를 바꾸지 않고, 엔진이 이미 하는 일을 지켜보기만 한다:
   - 엔진 함수(hurtEnemy · hurtPlayer · addBreak · killEnemy · addS)를 감싸서 "방금 무슨 일이 있었나"를 읽는다(원래 함수의 결과를 그대로 돌려준다).
   - 읽은 일은 큐에 쌓였다가 render()가 끝날 때(vfxFlush) 화면 위 덮개(#vfx)에 그려진다. 덮개는 render가 지우지 않는 body 직속 요소다.
   - 화면이 없는 환경(던전 테스터 · 50상황 테스터 · 저장 점검의 vm)에는 document가 없어 감싸지 않는다: 테스트 결과가 같다.
   - 전투 화면(G.b)의 실제 전투만 그린다: 미리보기용으로 복제한 전투는 그리지 않는다.
   액션성: 내가 고르면 내 칸이 대상 쪽으로 돌진하고 맞은 카드가 밀려난다. 적이 칠 때도 그 카드가 내 쪽으로 돌진한다.
   큰 타격 · 붕괴 · 처치는 전투 판 전체가 짧게 흔들린다. 이 움직임은 WAAPI의 translate 속성이라 카드의 다른 움직임과 겹치지 않는다.
   설정: G.data.fx = 'off' | 'low' | 'normal' | 'high'(없거나 모르는 값이면 normal). 옛 저장본의 'low' · 'normal'은 이름 그대로 읽는다(보통이 더 커졌다).
   움직임 줄이기(G.data.rm · OS 설정): 돌진 · 넉백 · 흔들림 · 확대 없이 색 윤곽의 불투명도만 바뀌고, 종류는 짧은 글자표(베기 · 막음 등)로 알린다.
   안전: 번쩍임은 흰색 → 속성색 한 번뿐이고 1초에 2번까지, 붉은 면 번쩍임 없음(맞은 내 칸은 안쪽 윤곽만), 카드 한 장 넓이를 넘지 않는다.
   덮개는 aria-hidden · pointer-events:none, 동시에 떠 있는 상자는 10개까지(움직임 줄이기 6개) */
const VFX_COL = { steel: '#fff1d0', fire: '#ff8a3d', frost: '#9fdcff', venom: '#8bd96a', blood: '#e0483b', shock: '#f5e663', arcane: '#c4a8ff', guard: '#8fb6ff', ward: '#5ad0e6', heal: '#7be08a', hurt: '#ff6b5e', gold: '#ffd36a', shard: '#e8d9b5', buff: '#ffe08a', debuff: '#d68cff' };
const VFX_MAX = 10; /* 동시에 떠 있는 상자 수 */
const VFX_FLASH_PER_SEC = 2; /* 면 번쩍임(흰색 → 속성색)을 새로 시작할 수 있는 수. 1초에 3번 미만 */
const VFX_LV = { low: { s: 0.5, t: 0.8, fo: 0, shake: 0 }, normal: { s: 1, t: 1, fo: 0.42, shake: 2 }, high: { s: 1.4, t: 1.2, fo: 0.55, shake: 4 } };
const VFX_LOW_KINDS = ['hit', 'brk', 'kill', 'phit', 'pgd', 'pwd', 'ppr', 'pev'];
const VFX_LABEL = { slash: '베기', pierce: '찌르기', blunt: '타격', arrow: '명중', spell: '주문', ctr: '반격' };
const VFX = { q: [], seq: 0, flashAt: [], base: null, sk: {}, shakeAt: 0 };
const vfxDoc = () => typeof document !== 'undefined' && typeof G !== 'undefined' && !!G;
function vfxMode() { const m = vfxDoc() && G.data && G.data.fx; return m === 'off' || m === 'low' || m === 'high' ? m : 'normal'; }
function vfxRm() { return !!((typeof G !== 'undefined' && G.data && G.data.rm) || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)); }
/* 진행 속도에 비례한 길이 배율: 빠를수록 짧게(전투 진행을 늦추지 않는다) */
function vfxPaceT() { const v = typeof PACE !== 'undefined' && G && !G.skip ? PACE[G.pace || 'normal'] : 0; return v > 0 ? Math.max(0.75, Math.min(1.25, v / 1000)) : 0.75; }
/* 효과음(10월 11일): 그림 효과를 끈 판에서도 효과음이 켜져 있으면 사건을 읽는다. 시험 전투(견본 · 화면 편집)는 소리를 내지 않는다 */
const vfxSndOn = () => !!(vfxDoc() && typeof sndCfg === 'function' && G.scr !== 'hudsample' && !G.hudEd && (() => { const c = sndCfg(); return c.on && c.bfx && c.sfx > 0; })());
const vfxLive = b => !!(vfxDoc() && b && b === G.b && (vfxMode() !== 'off' || vfxSndOn()));
const vfxSelEnemy = id => { const c = document.querySelectorAll('.en[data-e]'); for (const x of c) if (x.dataset.e === id) return x; return null; };
const vfxSelMe = () => document.querySelector('.fstat[data-hud="hud-player"]') || document.querySelector('.me') || document.querySelector('.mbars');
const vfxEl = who => who === 'p' ? vfxSelMe() : vfxSelEnemy(who);
function vfxRectOf(who) { const el = who ? vfxEl(who) : null; if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? { l: r.left, t: r.top, w: r.width, h: r.height } : null; }
/* 사건 하나를 큐에 쌓는다. 엔진을 건드리지 않는다 */
function vfxEmit(k, who, info) {
  if (!vfxDoc()) return; const m = vfxMode(); if ((m === 'off' || (m === 'low' && !VFX_LOW_KINDS.includes(k))) && !vfxSndOn()) return;
  VFX.q.push(Object.assign({ k, who, seq: info && info.seq || ++VFX.seq, t: Date.now(), r0: vfxRectOf(who) }, info || {}));
  if (VFX.q.length > 40) VFX.q.shift();
}
/* ---- 무엇으로 쳤는가: 색(원소)과 모양 ---- */
function vfxSkillOf(b) {
  const id = b.curSkill; if (!id) return null; const k = b.p.build + ':' + id; if (VFX.sk[k] !== undefined) return VFX.sk[k];
  let s = null; try { s = (SKILLS2[b.p.build] || []).find(x => x.id === id) || null; } catch (e) { } return (VFX.sk[k] = s);
}
function vfxElem(b, o) {
  if (o && o.shock) return 'shock'; if (o && o.fire) return 'fire';
  const lab = (o && o.label) || ''; if (o && o.dot) return /중독/.test(lab) ? 'venom' : /출혈/.test(lab) ? 'blood' : /화상|불/.test(lab) ? 'fire' : /서리|둔화|냉/.test(lab) ? 'frost' : 'steel';
  const s = vfxSkillOf(b);
  if (s && s.fx) for (const f of s.fx) {
    const w = f.s || f.k;
    if (w === 'poison') return 'venom'; if (w === 'ignite' || w === 'burn') return 'fire'; if (w === 'chill') return 'frost'; if (w === 'bleed') return 'blood';
  }
  if (b.p.build === 'elementalist' && s && s.b) return /불/.test(s.b) ? 'fire' : /서리/.test(s.b) ? 'frost' : 'arcane';
  return null;
}
function vfxStyle(b, o) {
  const p = b.p, c = b.cur || {}, s = vfxSkillOf(b); const el = vfxElem(b, o);
  const spellish = !!(c.spell || c.cantrip || o.spell || (s && s.kind === 'spell') || p.build === 'elementalist' || p.build === 'warlock' || p.build === 'H3' || p.build === 'arcanist');
  if (o.ctr || /되받/.test(o.label || '')) return { st: 'ctr', el: el || 'gold' };
  if (spellish) return { st: 'spell', el: el || (p.build === 'H3' ? 'blood' : 'arcane') };
  if (c.ranged && p.build === 'hunter') return { st: 'arrow', el };
  if (c.id === 'heavy' || p.build === 'monk' || p.build === 'warden') return { st: 'blunt', el };
  if (p.build === 'assassin') return { st: 'pierce', el };
  return { st: 'slash', el };
}
/* ---- 엔진 함수 감싸기 ---- */
(function () {
  if (typeof document === 'undefined' || typeof hurtEnemy !== 'function' || typeof hurtPlayer !== 'function') return;
  const heO = hurtEnemy, hpO = hurtPlayer, abO = typeof addBreak === 'function' ? addBreak : null, keO = typeof killEnemy === 'function' ? killEnemy : null, asO = typeof addS === 'function' ? addS : null;
  hurtEnemy = function (b, e, raw, o) {
    if (!vfxLive(b) || !e) return heO.apply(this, arguments);
    o = o || {}; const seq = ++VFX.seq, hp0 = e.hp, al0 = e.alive, ev0 = !!e.evading; const args = [b, e, raw, o];
    const r = heO.apply(this, args);
    try {
      if (al0 && !o.silent) {
        if (r > 0.05 || hp0 - e.hp > 0.05) {
          const big = !o.dot && (r >= e.hpMax * 0.22 || (b.cur && b.cur.id === 'heavy') || !!o.charged);
          if (o.dot) vfxEmit('dot', e.id, { seq, el: vfxElem(b, o) });
          else { const sy = vfxStyle(b, o); vfxEmit('hit', e.id, { seq, st: sy.st, el: sy.el, build: b.p.build, big, from: 'p', amt: Math.round(r) }); }
        } else if (!o.dot && (b.cur || o.ctr) && (ev0 || o.single || o.melee)) vfxEmit('miss', e.id, { seq, from: 'p' });
      }
    } catch (x) { }
    return r;
  };
  hurtPlayer = function (b, raw, o) {
    if (!vfxLive(b)) return hpO.apply(this, arguments);
    o = o || {}; const p = b.p, seq = ++VFX.seq, ward0 = p.ward || 0, ev0 = p.evade || 0, hp0 = p.hp, from = o.dot ? null : (b.lastActor || null);
    const r = hpO.apply(this, [b, raw, o]);
    try {
      if (!o.silent) {
        if ((p.evade || 0) < ev0 && !(r > 0)) vfxEmit('pev', 'p', { seq, from });
        else {
          const wd = ward0 - (p.ward || 0);
          if (o.parried) vfxEmit('ppr', 'p', { seq, from });
          if (wd > 0.3) vfxEmit('pwd', 'p', { seq, all: !(r > 0), from, amt: Math.round(wd) });
          else if (p.guard && !o.dot && !o.judgment && !o.parried) vfxEmit('pgd', 'p', { seq, from });
          if (r > 0.05 || hp0 - p.hp > 0.05) vfxEmit('phit', 'p', { seq, big: !o.dot && (r >= p.hpMax * 0.15 || !!o.charged), dot: !!o.dot, from });
        }
      }
    } catch (x) { }
    return r;
  };
  if (abO) addBreak = function (b, e, v) {
    if (!vfxLive(b) || !e) return abO.apply(this, arguments);
    const seq = ++VFX.seq, was = !!(e.s && e.s.broken), al0 = e.alive; const r = abO.apply(this, arguments);
    try { if (al0 && e.alive && !was && e.s && e.s.broken) vfxEmit('brk', e.id, { seq }); } catch (x) { }
    return r;
  };
  if (keO) killEnemy = function (b, e) {
    if (!vfxLive(b) || !e) return keO.apply(this, arguments);
    const seq = ++VFX.seq, al0 = e.alive; const r = keO.apply(this, arguments);
    try { if (al0 && !e.alive) vfxEmit('kill', e.id, { seq }); } catch (x) { }
    return r;
  };
  /* 상태가 실제로 붙었을 때(중독 · 화상 · 둔화 · 출혈 · 약화 · 보호 ...) 카드 위에 아이콘이 튄다 */
  if (asO) addS = function (b, u, k) {
    if (!vfxLive(b) || !u) return asO.apply(this, arguments);
    const r = asO.apply(this, arguments);
    try { if (r > 0 && typeof SICO !== 'undefined' && SICO[k]) vfxEmit('st', u === b.p ? 'p' : u.id, { st: k, seq: ++VFX.seq }); } catch (x) { }
    return r;
  };
})();
/* ---- 그리기 ---- */
function vfxLayer() {
  let l = document.getElementById('vfx'); if (l) return l;
  l = document.createElement('div'); l.id = 'vfx'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); return l;
}
function vfxClear() { const l = document.getElementById('vfx'); if (l) l.textContent = ''; }
/* 입자: 가운데에서 사방으로(bias로 위 · 아래 쏠림). n개 */
function vfxParts(n, spread, cls, biasY) {
  let h = ''; for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.4, k = 0.6 + ((i * 37) % 10) / 14;
    h += `<i class="${cls || 'vf-p'}" style="--tx:${Math.round(Math.cos(a) * spread * k)}px;--ty:${Math.round(Math.sin(a) * spread * k * 0.8 + (biasY || 0))}px;--rot:${i * 53}deg;animation-delay:${(i % 3) * 25}ms"></i>`;
  } return h;
}
const VFX_SHIELD = '<svg class="vf-sv" viewBox="0 0 40 46" focusable="false"><path d="M20 2 L37 8 V22 C37 33 29 41 20 44 C11 41 3 33 3 22 V8 Z" fill="rgba(255,255,255,.12)" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>';
const VFX_ZZ = '<svg class="vf-zz" viewBox="0 0 100 60" preserveAspectRatio="none" focusable="false"><polyline points="62,0 38,26 54,28 24,60" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><polyline points="30,0 16,18 28,20 8,46" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" opacity=".8"/></svg>';
const vfxLb = (t, c) => `<b class="vf-lb"${c ? ` style="--lc:${c}"` : ''}>${t}</b>`;
/* 속성별 입자 */
function vfxElemParts(el, n, sp, big) {
  if (el === 'fire') return vfxParts(n, sp, 'vf-p pf-fire', -sp * 0.55);
  if (el === 'frost') return vfxParts(n, sp, 'vf-p pf-frost', 0);
  if (el === 'venom') return vfxParts(n, sp * 0.8, 'vf-p pf-drop', sp * 0.7);
  if (el === 'blood') return vfxParts(n, sp * 0.85, 'vf-p pf-drop pf-blood', sp * 0.65);
  if (el === 'shock') return VFX_ZZ + (big ? vfxParts(Math.round(n / 2), sp, 'vf-sp', 0) : '');
  return vfxParts(n, sp, 'vf-p pf-star', 0);
}
/* 사건 하나를 그린다. 결과: 이 이펙트의 길이(ms) */
function vfxPlay(ev, X) {
  const { rm, S, T, low } = X;
  const rc = vfxRectOf(ev.who) || ev.r0; if (!rc) return 0;
  const vw = window.innerWidth, vh = window.innerHeight; if (rc.l + rc.w < 0 || rc.t + rc.h < 0 || rc.l > vw || rc.t > vh) return 0;
  const L = vfxLayer(); const cap = rm ? 6 : VFX_MAX; while (L.children.length >= cap) L.removeChild(L.firstChild);
  const el = vfxEl(ev.who);
  let cls = 'k-' + ev.k, col = VFX_COL[ev.el || 'steel'], dur = 600, h = '', style = '', over = false, lab = '', labc = '';
  const flash = X.flashOk && !rm && !low && X.fo > 0;
  const fl = flash ? '<i class="vf-fl"></i><i class="vf-fl2"></i>' : '';
  const n = k => Math.max(2, Math.round(k * S));
  switch (ev.k) {
    case 'hit': {
      const sy = ev.st; cls += ' s-' + sy + (ev.big ? ' big' : '') + ' el-' + (ev.el || 'steel'); lab = VFX_LABEL[sy] || '';
      if (sy === 'slash') { const rot = ev.seq % 2 ? 30 : -30; style += `--rot:${rot}deg;`; h = fl + '<i class="vf-bm"></i><i class="vf-bm t2"></i>' + (ev.big ? '<i class="vf-bm t3"></i>' : '') + vfxParts(n(ev.big ? 8 : 5), 38 * S, 'vf-sp', 0); dur = ev.big ? 700 : 560; }
      else if (sy === 'pierce') { h = fl + '<i class="vf-st"></i><i class="vf-st t2"></i><i class="vf-rg"></i>' + vfxParts(n(5), 34 * S, 'vf-sp', 0); dur = 560; }
      else if (sy === 'blunt') { h = fl + '<i class="vf-rg"></i><i class="vf-rg r2"></i>' + (ev.big ? '<i class="vf-rg r3"></i>' : '') + '<i class="vf-dust"></i>' + vfxParts(n(6), 42 * S, 'vf-p pf-star', 6); dur = 680; }
      else if (sy === 'spell') { h = fl + '<i class="vf-bu"></i><i class="vf-rg"></i>' + vfxElemParts(ev.el, n(ev.big ? 12 : 8), 46 * S, ev.big); dur = 760; lab = { fire: '화염', frost: '냉기', venom: '독', blood: '피', shock: '번개' }[ev.el] || '주문'; }
      else if (sy === 'arrow' || sy === 'ctr') {
        const me = vfxRectOf('p'); over = true; let len = 0, ang = 0, x0 = 0, y0 = 0;
        if (me) { const sx = me.l + me.w / 2, sy0 = me.t + me.h / 2, tx = rc.l + rc.w / 2, ty = rc.t + rc.h / 2, dx = tx - sx, dy = ty - sy0; len = Math.hypot(dx, dy); ang = Math.atan2(dy, dx) * 180 / Math.PI; x0 = sx - rc.l; y0 = sy0 - rc.t; }
        const fly = me ? Math.round(Math.min(300, 140 + len * 0.18)) : 0;
        style += `--x0:${Math.round(x0)}px;--y0:${Math.round(y0)}px;--ang:${Math.round(ang)}deg;--len:${Math.round(len)}px;--fly:${fly}ms;`;
        h = (me ? '<i class="vf-ar"></i>' : '') + `<i class="vf-hit" style="--dl:${fly}ms">${fl}<i class="vf-rg"></i><i class="vf-rg r2"></i>${sy === 'ctr' ? '<i class="vf-bm"></i><i class="vf-bm t2"></i>' : '<i class="vf-stuck"></i>'}${vfxParts(n(5), 34 * S, 'vf-sp', 0)}</i>`; dur = fly + 520;
        if (sy === 'ctr') lab = '반격';
      }
      if (ev.big) lab = '강타';
      break;
    }
    case 'dot': h = '<i class="vf-dt"></i><i class="vf-dt d2"></i>' + vfxElemParts(ev.el, n(4), 24 * S, false); dur = 520; break;
    case 'miss': col = '#e8e8e8'; h = '<i class="vf-gz"></i><i class="vf-gx"></i><i class="vf-gx g2"></i>'; dur = 560; lab = '회피'; break;
    case 'brk': col = VFX_COL.shard; h = fl + '<i class="vf-ol"></i><i class="vf-rg"></i><i class="vf-crack"></i>' + (low ? '' : vfxParts(n(10), 62 * S, 'vf-sh', 6)); dur = 760; lab = '붕괴'; break;
    case 'kill': col = VFX_COL.shard; h = fl + '<i class="vf-gh"></i><i class="vf-rg"></i>' + vfxParts(n(16), 54 * S, 'vf-p pf-star', -8); dur = 800; lab = '처치'; break;
    case 'phit': col = VFX_COL.hurt; h = '<i class="vf-ol"></i><i class="vf-cl"></i>' + (ev.big ? '<i class="vf-cl c2"></i>' : '') + (ev.dot ? '' : '<i class="vf-rg"></i>'); dur = ev.big ? 760 : 580; cls += ev.big ? ' big' : ''; if (ev.big) lab = '큰 피해'; break;
    case 'pgd': col = VFX_COL.guard; h = '<i class="vf-ol"></i><i class="vf-rg"></i><i class="vf-rg r2"></i>' + VFX_SHIELD + vfxParts(n(6), 40 * S, 'vf-sp', 0); dur = 720; lab = '막음'; break;
    case 'pwd': col = VFX_COL.ward; h = '<i class="vf-ol"></i><i class="vf-rg"></i><i class="vf-rg r2"></i>' + VFX_SHIELD; dur = 720; lab = '보호막 −' + (ev.amt || ''); lab = ev.amt ? lab : '보호막'; break;
    case 'ppr': col = VFX_COL.gold; h = fl + '<i class="vf-ol"></i><i class="vf-rg"></i><i class="vf-rg r2"></i><i class="vf-bu"></i>' + vfxParts(n(14), 54 * S, 'vf-sp', 0); dur = 700; lab = '흘리기'; break;
    case 'pev': col = '#e8e8e8'; h = '<i class="vf-gz"></i><i class="vf-gx"></i><i class="vf-gx g2"></i>'; dur = 600; lab = '회피'; break;
    case 'heal': col = VFX_COL.heal; h = '<i class="vf-ol"></i><i class="vf-gl"></i><i class="vf-rg"></i>' + [8, 26, 44, 62, 80].slice(0, n(5) > 5 ? 5 : Math.max(3, n(5))).map((u, i) => `<i class="vf-up" style="--ux:${u}%;animation-delay:${(i * 70) % 220}ms"></i>`).join(''); dur = 900; lab = '회복'; break;
    case 'wgain': col = VFX_COL.ward; h = '<i class="vf-ol"></i><i class="vf-gl"></i><i class="vf-rg"></i>' + [14, 38, 62, 84].map((u, i) => `<i class="vf-up" style="--ux:${u}%;animation-delay:${i * 60}ms"></i>`).join(''); dur = 800; lab = '보호막'; break;
    case 'st': { const bf = typeof BUFFS !== 'undefined' && BUFFS[ev.st]; col = bf ? VFX_COL.buff : VFX_COL.debuff; h = '<i class="vf-ol"></i><i class="vf-rg"></i>' + `<span class="vf-sti">${SICO[ev.st]}</span>`; dur = 760; lab = (typeof SNAMES !== 'undefined' && SNAMES[ev.st]) || ''; break; }
    default: return 0;
  }
  /* 움직임 줄이기: 색 윤곽 하나와 글자표만(방패 · 정지한 선은 그대로 불투명도만) */
  if (rm) { h = '<i class="vf-ol"></i>' + (/vf-sv/.test(h) ? VFX_SHIELD : '') + (/vf-gh/.test(h) ? '<i class="vf-gh"></i>' : ''); dur = 640; lab = lab || ''; }
  if (low && !rm) lab = '';
  if (lab) h += vfxLb(lab, col);
  const d = document.createElement('div'); d.className = 'vf ' + cls + (rm ? ' rm' : '') + (over ? ' over' : '');
  d.style.cssText = `left:${rc.l}px;top:${rc.t}px;width:${rc.w}px;height:${rc.h}px;--c:${col};--s:${S};--dur:${Math.round(dur * T)}ms;--fo:${X.fo};--tm:${T};${style}`; d.innerHTML = h;
  L.appendChild(d); setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, dur * T + 160);
  if (ev.k === 'hit' && ev.big && el) { const dp = el.querySelector('.dpop'); if (dp) dp.classList.add('big'); }
  if (ev.k === 'phit' && ev.big && el) { const dp = el.querySelector('.dpop'); if (dp) dp.classList.add('big'); }
  return dur * T;
}
/* ---- 움직임: 돌진 · 넉백 · 전투 판 흔들림(WAAPI translate) ---- */
function vfxAnim(el, frames, ms) {
  if (!el || !el.animate) return; try { for (const a of el.getAnimations()) if (a.id === 'vfm') a.cancel(); const a = el.animate(frames, { duration: ms, easing: 'ease-out' }); a.id = 'vfm'; } catch (e) { }
}
function vfxCenter(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
/* 공격하는 쪽이 대상 쪽으로 짧게 돌진한다 */
function vfxLunge(from, to, X, kind) {
  if (X.rm || !from || !to) return; const a = vfxEl(from), c = vfxEl(to); if (!a || !c || a === c) return;
  const [ax, ay] = vfxCenter(a), [cx, cy] = vfxCenter(c); let dx = cx - ax, dy = cy - ay; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const m = (kind === 'ranged' ? -4 : 9) * Math.max(0.6, X.S), sc = kind === 'ranged' ? 1.015 : 1.05;
  vfxAnim(a, [{ translate: '0 0', scale: 1 }, { translate: `${(dx * m).toFixed(1)}px ${(dy * m).toFixed(1)}px`, scale: sc, offset: 0.38 }, { translate: '0 0', scale: 1 }], 240 * X.T);
}
/* 맞은 카드가 공격 방향으로 밀렸다가 돌아온다 */
function vfxKnock(who, from, X, big) {
  if (X.rm || X.low && !big) return; const c = vfxEl(who); if (!c) return; let dx = who === 'p' ? 0 : 1, dy = 0;
  const a = from ? vfxEl(from) : null;
  if (a && a !== c) { const [ax, ay] = vfxCenter(a), [cx, cy] = vfxCenter(c); dx = cx - ax; dy = cy - ay; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; } else if (who !== 'p') { dx = (VFX.seq % 2) ? 1 : -1; }
  const m = (big ? 11 : 6) * X.S, f = (v) => `${(dx * v).toFixed(1)}px ${(dy * v).toFixed(1)}px`;
  vfxAnim(c, [{ translate: '0 0' }, { translate: f(m), offset: 0.22 }, { translate: f(-m * 0.28), offset: 0.55 }, { translate: f(m * 0.08), offset: 0.8 }, { translate: '0 0' }], 320 * X.T);
}
/* 전투 판 전체 흔들림: 행동 단추 · 기록은 움직이지 않는다 */
function vfxAreaShake(X, power) {
  if (X.rm || !X.shk) return; const now = Date.now(); if (now - VFX.shakeAt < 300) return; VFX.shakeAt = now;
  const m = X.shk * (power || 1);
  document.querySelectorAll('[data-hud="hud-field"],[data-hud="hud-player"],[data-hud="hud-danger"]').forEach((el, i) => {
    el.animate && vfxAnim(el, [{ translate: '0 0' }, { translate: `${-m}px ${m * 0.5}px`, offset: 0.2 }, { translate: `${m}px ${-m * 0.4}px`, offset: 0.45 }, { translate: `${-m * 0.5}px 0`, offset: 0.7 }, { translate: '0 0' }], 220);
  });
}
/* ---- 효과음: 사건 하나에 소리 하나(파일은 06a2/audio/sfx_*.mp3, 출처는 docs/조사/효과음-출처.md) ---- */
const VFX_SP_EL = { fire: 'sp_fire', frost: 'sp_frost', venom: 'sp_venom', blood: 'sp_blood', shock: 'sp_shock' };
const VFX_SND_VOL = { ppr: 0.7, sp_fire: 0.7, dot_fire: 0.6, dot_frost: 0.7, dot: 0.55, dot_venom: 0.6, dot_blood: 0.6, phit: 0.8, buff: 0.6, debuff: 0.7, miss: 0.7, wgain: 0.35, heal: 0.45, pwd: 0.65, brk: 0.65, pgd: 0.65, blunt: 0.75, big: 0.8, phit_big: 0.7, sp_arcane: 0.6, sp_venom: 0.55, sp_blood: 0.65, sp_shock: 0.6 };
function vfxSfxKey(x) {
  switch (x.k) {
    case 'hit':
      if (x.st === 'spell') return VFX_SP_EL[x.el] || 'sp_arcane';
      if (x.st === 'ctr') return 'ctr';
      if (['assassin', 'spellblade', 'butcher'].includes(x.build) && (x.st === 'pierce' || x.st === 'blunt' || x.st === 'slash')) return x.big || x.st === 'blunt' ? 'slash2' : 'slash';
      // 피해 크기보다 무기 종류를 먼저 판별합니다. 검과 활에 주먹 소리를 붙이지 않습니다.
      if (x.st === 'slash') return (x.seq || 0) % 2 ? 'slash' : 'slash2';
      if (x.st === 'blunt' && x.big) return 'big';
      return { pierce: 'pierce', blunt: 'blunt', arrow: 'arrow' }[x.st] || 'slash';
    case 'dot': return x.el === 'fire' ? 'dot_fire' : x.el === 'frost' ? 'dot_frost' : x.el === 'venom' ? 'dot_venom' : x.el === 'blood' ? 'dot_blood' : null;
    case 'miss': case 'pev': return 'miss';
    case 'brk': return 'brk';
    case 'kill': return 'kill';
    case 'phit': return x.big ? 'phit_big' : 'phit';
    case 'pgd': return 'pgd';
    case 'pwd': return 'pwd';
    case 'ppr': return 'ppr';
    case 'heal': return 'heal';
    case 'wgain': return 'wgain';
    case 'st': return null; // 상태마다 메뉴 알림음을 반복하지 않습니다.
  }
  return null;
}
function vfxSound(x) {
  if (!vfxSndOn() || typeof sfxPlay !== 'function') return;
  const k = vfxSfxKey(x); if (k) sfxPlay('b_' + k, { lim: 1, vol: VFX_SND_VOL[k] });
}
/* render()가 끝날 때마다 부른다. 쌓인 사건을 순서대로 조금씩 어긋나게 보여 준다(진행 속도는 건드리지 않는다) */
function vfxFlush() {
  if (!vfxDoc()) return;
  const b = G.b, q = VFX.q; VFX.q = [];
  /* 나의 생명력 · 보호막이 늘었으면 빛을 낸다(다시 그려 사이의 차이를 본다) */
  const ev2 = [];
  const snd = vfxSndOn(), mode0 = vfxMode();
  if (b && b.p && (mode0 !== 'off' || snd)) {
    const p = b.p, bs = VFX.base;
    if (bs && bs.b === b) {
      if (p.hp - bs.hp >= 0.5 && p.hp > 0) ev2.push({ k: 'heal', who: 'p', seq: ++VFX.seq, t: Date.now() });
      if ((p.ward || 0) - bs.ward >= 0.5) ev2.push({ k: 'wgain', who: 'p', seq: ++VFX.seq, t: Date.now() });
    }
    VFX.base = { b, hp: p.hp, ward: p.ward || 0 };
  } else VFX.base = null;
  if (!b || (mode0 === 'off' && !snd) || G.sheet || G.hudEd || document.hidden) { if (!b) vfxClear(); return; }
  if (snd && typeof sfxPreload === 'function') sfxPreload();
  const m = mode0 === 'off' ? 'normal' : mode0, lv = VFX_LV[m], low = m === 'low', vis = mode0 !== 'off';
  const list = q.concat(ev2.filter(x => !low || snd)).filter(x => Date.now() - x.t < 3000).sort((a, c) => a.seq - c.seq);
  if (!list.length) return;
  /* 같은 자리의 같은 이펙트가 겹쳐 쌓이지 않게 둘까지만(상태는 하나씩) */
  const seen = {}; const play = [];
  for (const x of list) { const key = x.k + ':' + x.who + ':' + (x.st || ''); seen[key] = (seen[key] || 0) + 1; if (seen[key] <= (x.k === 'st' ? 1 : 2)) play.push(x); }
  const rm = vfxRm(), T = lv.t * vfxPaceT(), step = Math.round(95 * T), lunged = {}; let nplay = 0;
  play.slice(0, 12).forEach((x, i) => {
    const delay = Math.min(i * step, 600);
    const visK = vis && !(low && !VFX_LOW_KINDS.includes(x.k));
    if (!visK) { setTimeout(() => { if (G.b === b && !G.sheet && !G.hudEd) vfxSound(x); }, delay); nplay++; return; }
    const melee = x.k === 'hit' && x.st !== 'arrow' && x.st !== 'spell' && x.st !== 'ctr';
    const lungeFrom = x.k === 'hit' ? x.from : (x.k === 'phit' || x.k === 'pgd' || x.k === 'pwd' || x.k === 'ppr' || x.k === 'pev') ? x.from : null;
    const prep = !rm && !low && lungeFrom && (melee || x.k !== 'hit' || x.st === 'spell' || x.st === 'arrow');
    const imp = prep ? Math.round(80 * T) : 0;
    setTimeout(() => {
      if (G.b !== b || G.sheet || G.hudEd) return;
      const X = { rm, low, S: lv.s, T, fo: lv.fo, shk: lv.shake, flashOk: false };
      if (prep && !lunged[lungeFrom]) { lunged[lungeFrom] = 1; vfxLunge(lungeFrom, x.who === 'p' && lungeFrom !== 'p' ? 'p' : x.who, X, melee || lungeFrom !== 'p' ? 'melee' : 'ranged'); }
      setTimeout(() => {
        if (G.b !== b || G.sheet || G.hudEd) return;
        const now = Date.now(); VFX.flashAt = VFX.flashAt.filter(t => now - t < 1000);
        X.flashOk = VFX.flashAt.length < VFX_FLASH_PER_SEC; const L = document.getElementById('vfx');
        const dur = vfxPlay(x, X); vfxSound(x);
        if (dur && X.flashOk && !rm && !low && ['hit', 'brk', 'kill', 'ppr'].includes(x.k)) VFX.flashAt.push(now);
        if (dur) {
          if (x.k === 'hit' && x.st !== 'arrow' && x.st !== 'ctr') vfxKnock(x.who, 'p', X, x.big);
          if (x.k === 'hit' && (x.st === 'arrow' || x.st === 'ctr')) setTimeout(() => vfxKnock(x.who, 'p', X, x.big), 160);
          if (x.k === 'phit' || x.k === 'pgd' || x.k === 'pwd') vfxKnock('p', x.from, X, x.big);
          if (x.k === 'hit' && x.big || x.k === 'phit' && x.big) vfxAreaShake(X, 1);
          if (x.k === 'brk' || x.k === 'kill') { vfxKnock(x.who, 'p', X, true); vfxAreaShake(X, x.k === 'kill' ? 1 : 0.8); }
          if (x.k === 'ppr') vfxAreaShake(X, 0.6);
          if (X.shk >= 4 && x.k === 'hit' && !x.big) vfxAreaShake(X, 0.4);
        }
        const L2 = document.getElementById('vfx'); if (L2) { L2.classList.toggle('low', low); L2.dataset.lv = m; }
      }, imp);
    }, delay);
    nplay++;
  });
}
/* ---- 설정 ---- */
const VFX_OPTS = [['off', '끔'], ['low', '약하게'], ['normal', '보통'], ['high', '강하게']];
function vfxSettingRow() {
  const m = vfxMode();
  return `<div class="setrow"><label for="setfx">전투 효과</label><span class="mini">때리고 맞는 순간의 그림 효과와 몸짓입니다. 강하게는 더 크고 길며 화면이 흔들립니다. 움직임 줄이기를 켜면 색 윤곽과 짧은 글자만 보입니다</span><select id="setfx">${VFX_OPTS.map(([k, n]) => `<option value="${k}"${m === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`;
}
if (typeof document !== 'undefined') document.addEventListener('change', ev => {
  const t = ev.target; if (!t || t.id !== 'setfx' || !vfxDoc()) return; const v = t.value; G.data.fx = v === 'off' || v === 'low' || v === 'high' ? v : 'normal'; saveLocal(); VFX.q = []; if (vfxMode() === 'off') vfxClear();
});
