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
  try { cutFlush(); } catch (e) { } /* M5-0a 승부수 컷인(아래) */
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
/* ===== M5-0a 승부수 컷인 (10월 20일 만든 사람, 시안 "승부수 컷인 시안" 7판 기준). 장식만: 판정 · 순서 · 진행 속도를 바꾸지 않는다 =====
   대사(line)가 있는 스킬(비용 4 승부수)을 전투마다 처음 쓸 때 가로 띠 컷인을 띄운다. 두 번째부터는 기존 이펙트만.
   문법(cut: blade · guard · arcane)이 타이밍 · 길이 · 안전 · 첫 사용 규칙 · 소리 자리를 정하고, 그림은 직업 모티프 층(CUT_MOTIF[직업][cut] = { pre, hit, linger, out })이 그린다.
   이번에는 마검사 모티프 셋만. 다른 직업은 M5-1~5에서 승부수 대사와 "장면 한 줄"을 받아 새로 짓는다.
   - 길이: 진행 속도 느림 2.2 · 보통 1.8 · 빠름 1.3초, 화려 단계 ×1.25. 컷인이 떠 있어도 전투 진행은 멈추지 않는다.
   - 단계: 전투 효과 '약하게' = 기본(띠 안에서만), '보통' · '강하게' = 화려(판 전체). '끔' · 빨리 감기 · 즉시는 컷인 없이 전투 기록에 대사 한 줄.
   - 안전: 화면 전체 번쩍임 없음(빛은 선 하나 · 고리 하나 크기), 입자는 캔버스 하나에 동시 250개까지. 움직임 줄이기면 띠와 글만 나타났다 사라진다.
   - 소리: 효과음이 켜져 있으면 cut_blade(칭) · cut_guard(쿵) · cut_arcane(화르륵). 파일이 없으면 웹 오디오 합성음.
   - 덮개는 #vfx 안(aria-hidden, pointer-events:none)이라 컷인 중에도 버튼을 누를 수 있다.
   - 카드 동작(기준 5의 승인된 예외): 컷인과 같은 시각에 내 카드 · 적 카드가 움직인다. 상태 표시(카드 모서리 이름 · 남은 차례)는 52번 vHudPlayer가 그린다 */
const CUT_PACE = { slow: 2200, normal: 1800, fast: 1300, step: 1800 };
const CUT_COL = { 반탄: [240, 144, 60], 역혈: [230, 192, 96], 파혈: [232, 238, 245], /* M5-2 수도승: 역천권 방어(주황) · 천망 마법(금빛 경락) · 일지멸맥 검(가늘고 하얀 빛), 그 밖 연출은 M10b */ 혈염: [239, 93, 60], '죄인의 피': [194, 58, 82], '유산의 불': [240, 172, 72], 공성추: [168, 186, 206], '기둥 파쇄': [201, 139, 74], '용맹의 투지': [232, 194, 90] }; // M5-1 파수꾼: 기존 셋(검 · 방어)에 색만 바꿈. 방패 오라 · 균열 파동 · 성문 연출은 M10b(0.8.1)
const CUT_PMAX = 250;
const CUT = { q: [], cv: null, cx: null, P: [], J: [], raf: 0, lastT: 0, run: [], tmr: [], AC: null, el: null, on: false };
function cutLevel() { const m = vfxMode(); if (m === 'off' || G.skip || G.pace === 'instant') return 'off'; return m === 'low' ? 'base' : 'fancy'; }
/* 엔진이 승부수를 쓴 뒤(runSkill2 감싸기) 큐에 쌓는다. 첫 사용이 아니면 아무것도 하지 않는다 */
function cutQueue(b, s) {
  if (!vfxDoc() || !b || b !== G.b || !s || !s.line) return; b.vfCut = b.vfCut || {}; if (b.vfCut[s.id]) return; b.vfCut[s.id] = 1;
  try { logp(b, 'sys', s.line + ' — ' + s.n); } catch (e) { }
  if (cutLevel() === 'off' || G.scr === 'hudsample' || G.hudEd) return;
  CUT.q.push({ s, build: b.p.build, t: Date.now() });
}
/* 판(적 줄 + 내 카드)의 영역 */
function cutBoardRect() { const els = [...document.querySelectorAll('[data-hud="hud-field"],[data-hud="hud-player"]')].map(e => e.getBoundingClientRect()).filter(r => r.width > 4); if (!els.length) return null;
  const l = Math.max(0, Math.min(...els.map(r => r.left))), t = Math.max(0, Math.min(...els.map(r => r.top))), r = Math.min(innerWidth, Math.max(...els.map(r => r.right))), btm = Math.min(innerHeight, Math.max(...els.map(r => r.bottom))); return { l, t, w: r - l, h: btm - t }; }
const cutRnd = (a, b) => a + Math.random() * (b - a);
/* ---- 입자 · 캔버스 그리기 ---- */
function cutTick(t) {
  const c = CUT.cx, el = CUT.el; if (!c || !el) { CUT.raf = 0; return; } const dt = Math.min(40, t - (CUT.lastT || t)) / 16.7; CUT.lastT = t;
  const W = el.clientWidth, H = el.clientHeight; c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
  const now = performance.now(); CUT.J = CUT.J.filter(j => now < j.t0 + j.dur); for (const j of CUT.J) if (now >= j.t0) { c.save(); try { j.draw(c, (now - j.t0) / j.dur, { width: W, height: H }); } catch (e) { } c.restore(); }
  CUT.P = CUT.P.filter(p => (p.life -= dt) > 0);
  for (const p of CUT.P) { p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; const a = Math.max(0, Math.min(1, p.life / p.max)) * p.a;
    if (p.streak) { c.strokeStyle = 'rgba(' + p.c + ',' + a + ')'; c.lineWidth = p.s; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); c.stroke(); }
    else { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2.4); g.addColorStop(0, 'rgba(255,240,210,' + a + ')'); g.addColorStop(.35, 'rgba(' + p.c + ',' + a * .8 + ')'); g.addColorStop(1, 'rgba(' + p.c + ',0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.s * 2.4, 0, 6.283); c.fill(); } }
  c.globalCompositeOperation = 'source-over'; CUT.raf = (CUT.P.length || CUT.J.length) ? requestAnimationFrame(cutTick) : 0; if (!CUT.raf) CUT.lastT = 0;
}
function cutSpawn(n, f) { if (!CUT.cx) return; n = Math.max(0, Math.min(n, CUT_PMAX - CUT.P.length)); for (let i = 0; i < n; i++) CUT.P.push(f(i)); if (!CUT.raf) CUT.raf = requestAnimationFrame(cutTick); }
function cutJob(start, dur, draw) { if (!CUT.cx) return; CUT.J.push({ t0: performance.now() + start, dur, draw }); if (!CUT.raf) CUT.raf = requestAnimationFrame(cutTick); }
function cutLater(ms, f) { CUT.tmr.push(setTimeout(() => { if (CUT.on) f(); }, ms)); }
const cutA = (el, kf, o) => { if (!el || !el.animate) return null; const a = el.animate(kf, Object.assign({ fill: 'both', easing: 'cubic-bezier(.2,.7,.2,1)' }, o)); CUT.run.push(a); return a; };
/* ---- 소리(효과음 설정이 켜져 있을 때만). 파일이 있으면 그 파일, 없으면 합성음 ---- */
function cutAu() { if (!vfxSndOn() || typeof SND === 'undefined' || !SND.unlocked) return null; try { CUT.AC = CUT.AC || new (window.AudioContext || window.webkitAudioContext)(); if (CUT.AC.state === 'suspended') CUT.AC.resume(); return CUT.AC; } catch (e) { return null; } }
function cutNoise(c, t, dur, freq, vol, swell) { const v0 = vol * sndCfg().sfx; const n = c.createBuffer(1, Math.max(1, c.sampleRate * dur | 0), c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = n; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8; const g = c.createGain(); if (swell) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v0, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur); } else { g.gain.setValueAtTime(v0, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); } s.connect(f).connect(g).connect(c.destination); s.start(t); }
function cutSound(cut, at, dur) {
  const k = 'cut_' + cut; if (typeof SFX !== 'undefined' && SFX[k] && SFX[k].src) { cutLater(at, () => sfxPlay(k, { lim: 1, vol: 0.8 })); return; }
  const c = cutAu(); if (!c) return; const t = c.currentTime + at / 1000, V = sndCfg().sfx;
  if (cut === 'blade') { [[2637, .16], [3951, .08], [5274, .05]].forEach(([f, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .985, t + .9); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * V, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .9); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1); }); cutNoise(c, t, .07, 6000, .22); }
  else if (cut === 'guard') { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .35); g.gain.setValueAtTime(.38 * V, t); g.gain.exponentialRampToValueAtTime(.0001, t + .45); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .5); cutNoise(c, t, .05, 900, .25); }
  else cutNoise(c, t, dur || .9, 1400, .12, true);
}
/* ---- 덮개 DOM ---- */
const CUT_RUNE = '<svg class="cu-rune" viewBox="0 0 420 420" aria-hidden="true" focusable="false"><defs><path id="cu-rp1" d="M210 210 m-180 0 a180 180 0 1 1 360 0 a180 180 0 1 1 -360 0"/><path id="cu-rp2" d="M210 210 m-140 0 a140 140 0 1 0 280 0 a140 140 0 1 0 -280 0"/></defs><circle cx="210" cy="210" r="196" stroke-width="1.4"/><circle cx="210" cy="210" r="166" stroke-width=".8"/><circle cx="210" cy="210" r="124" stroke-width="1"/><g class="cu-rg1"><text><textPath href="#cu-rp1">ᚱ ᛟ ᚦ ᛉ ᚨ ᛞ ᚷ ᛗ ᚾ ᛁ ᛋ ᛏ ᚱ ᛟ ᚦ ᛉ ᚨ ᛞ ᚷ ᛗ ᚾ ᛁ ᛋ ᛏ ᚱ ᛟ ᚦ ᛉ</textPath></text></g><g class="cu-rg2"><text><textPath href="#cu-rp2">✦ 유 · 산 · 의 · 불 ✦ 유 · 산 · 의 · 불 ✦ 유 · 산 · 의 · 불 ✦</textPath></text></g><path d="M210 30 L366 300 L54 300 Z" stroke-width="1" opacity=".6"/><path d="M210 390 L54 120 L366 120 Z" stroke-width="1" opacity=".6"/></svg>';
const CUT_SIGIL = '<svg class="cu-sigil" viewBox="0 0 220 220" aria-hidden="true" focusable="false"><circle cx="110" cy="110" r="104" stroke-width="1.2" opacity=".8"/><circle cx="110" cy="110" r="92" stroke-width="0.8" stroke-dasharray="2 6"/><circle cx="110" cy="110" r="62" stroke-width="1"/><path d="M110 18 L189 156 L31 156 Z" stroke-width="1" opacity=".7"/><path d="M110 202 L31 64 L189 64 Z" stroke-width="1" opacity=".7"/></svg>';
function cutBuild(s, col, rc) {
  cutStop(); const L = vfxLayer(); const d = document.createElement('div'); d.className = 'cutin'; d.style.cssText = `left:${rc.l}px;top:${rc.t}px;width:${rc.w}px;height:${rc.h}px;--edge:rgb(${col});--glow:rgba(${col},.85);--band:rgba(${Math.round(col[0] * .22)},${Math.round(col[1] * .12)},${Math.round(col[2] * .1)},.93)`;
  const esc1 = c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c; const q = [...s.line.replace(/^「|」$/g, '')].map(c => '<span>' + esc1(c) + '</span>').join(''), nm = [...s.n].join(' ');
  const lay = id => `<div class="cu-layer ${id}"><div class="cu-band"></div><div class="cu-hex"></div><div class="cu-txt"><div class="cu-skill">${nm}</div><div class="cu-q">${q}</div></div></div>`;
  d.innerHTML = `<div class="cu-veil"></div>${CUT_RUNE}<div class="cu-glyphs"></div><div class="cu-stage">${lay('la')}${lay('lb')}${CUT_SIGIL}<div class="cu-seam"></div><div class="cu-ring"></div><div class="cu-sw x2"><div class="cu-slash"></div></div><div class="cu-sw main"><div class="cu-slash"></div></div><div class="cu-ghost r"><div class="cu-txt"><div class="cu-skill"></div><div class="cu-q">${q}</div></div></div><div class="cu-ghost b"><div class="cu-txt"><div class="cu-skill"></div><div class="cu-q">${q}</div></div></div></div><canvas class="cu-cv"></canvas>`;
  L.appendChild(d); CUT.el = d; CUT.on = true; const cv = d.querySelector('.cu-cv'), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = rc.w * dpr; cv.height = rc.h * dpr; CUT.cv = cv; CUT.cx = cv.getContext('2d'); CUT.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return d;
}
function cutStop() { for (const a of CUT.run) { try { a.cancel(); } catch (e) { } } CUT.run = []; for (const t of CUT.tmr) clearTimeout(t); CUT.tmr = []; CUT.P = []; CUT.J = []; CUT.on = false; if (CUT.el && CUT.el.parentNode) CUT.el.parentNode.removeChild(CUT.el); CUT.el = null; CUT.cx = null; }
/* ---- 카드 동작(기존 vfxLunge · vfxKnock과 같은 WAAPI, 장식만) ---- */
const cutEns = () => [...document.querySelectorAll('.en[data-e]')];
/* 전투 화면은 다시 그릴 때마다 카드 요소가 새로 생기므로, 움직임을 시작하는 그 순간에 요소를 찾는다 */
const cutAt = (ms, sel, kf, o) => cutLater(Math.max(0, ms), () => { const L = typeof sel === 'function' ? sel() : sel; for (const [el, f, oo] of L) cutA(el, f, Object.assign({}, o, oo)); });
function cutCard(cut, at, t, rm) {
  if (rm) return;
  if (cut === 'blade') { cutAt(at - 260, () => { const me = vfxSelMe(), ens = cutEns(); if (!me) return []; const e0 = ens[Math.floor(ens.length / 2)] || ens[0]; let dx = 60, dy = -60; if (e0) { const m = me.getBoundingClientRect(), e = e0.getBoundingClientRect(); dx = (e.left + e.width / 2) - (m.left + m.width / 2); dy = (e.top + e.height / 2) - (m.top + m.height / 2); }
      return [[me, [{ transform: 'none' }, { transform: 'translate(-6px,6px) scale(.97)', offset: .25 }, { transform: `translate(${(dx * .35 + 60).toFixed(0)}px,${(dy * .55).toFixed(0)}px) skewX(-10deg) scale(1.03)`, offset: .55 }, { transform: `translate(${(dx * .35 + 80).toFixed(0)}px,${(dy * .5).toFixed(0)}px) scale(1.01)`, offset: .7 }, { transform: 'none' }]]]; }, { duration: 620, easing: 'cubic-bezier(.3,0,.2,1)' });
    cutAt(at + 40, () => cutEns().map((e, i) => [e, [{ transform: 'none' }, { transform: 'translate(10px,-8px) rotate(4deg)', offset: .2 }, { transform: 'translate(-3px,2px) rotate(-1deg)', offset: .55 }, { transform: 'none' }], { delay: i * 70 }]), { duration: 420, easing: 'ease-out' }); }
  else if (cut === 'guard') { cutAt(at - 160, () => { const me = vfxSelMe(); return me ? [[me, [{ transform: 'none' }, { transform: 'translateY(-4px) scale(1.02)', offset: .3 }, { transform: 'translateY(5px) scale(.96,.98)', offset: .5 }, { transform: 'translateY(2px) scale(1)', offset: .75 }, { transform: 'none' }]]] : []; }, { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' });
    cutAt(at + 40, () => { const ens = cutEns(), mid = (ens.length - 1) / 2; return ens.map((e, i) => [e, [{ transform: 'none' }, { transform: 'translateY(-9px)', offset: .3 }, { transform: 'translateY(-6px)', offset: .7 }, { transform: 'none' }], { delay: Math.abs(i - mid) * 60 }]); }, { duration: 560, easing: 'ease-out' }); }
  else cutAt(at, () => { const me = vfxSelMe(); return me ? [[me, [{ transform: 'none' }, { transform: 'translateY(-10px) scale(1.04)', offset: .5 }, { transform: 'none' }]]] : []; }, { duration: t * .7, easing: 'cubic-bezier(.3,.6,.3,1)' });
}
/* ---- 글자 번짐 · 가림막 ---- */
function cutInk(L, start, span, dur) { const sp = L.querySelectorAll('.cu-q span'), n = sp.length || 1, step = span / n; sp.forEach((e, i) => cutA(e, [{ opacity: 0, filter: 'blur(4px)', transform: 'translateY(3px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: dur, delay: start + i * step, easing: 'ease-out' })); cutA(L.querySelector('.cu-skill'), [{ opacity: 0, letterSpacing: '.6em' }, { opacity: 1, letterSpacing: '.3em' }], { duration: 320, delay: Math.max(0, start - 120) }); }
function cutShow(L, t) { cutA(L, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: t, easing: 'linear' }); L.querySelectorAll('.cu-q span').forEach(e => { e.style.opacity = 1; }); L.querySelector('.cu-skill').style.opacity = 1; }
/* ---- 마검사 모티프(그림): 문법이 pre → hit → linger → out 순서로 부른다. C = { d, la, lb, t, col, F(화려), rc } ---- */
const CUT_MOTIF = { spellblade: {
  blade: {
    pre(C) { const { la, lb, t } = C, ang = -4, tanA = Math.tan(ang * Math.PI / 180), st = C.d.querySelector('.cu-stage').getBoundingClientRect(), off = (st.width / 2) * tanA / st.height * 100; C.tanA = tanA;
      C.d.querySelector('.cu-sw.main').style.transform = `rotate(${ang}deg)`; la.style.clipPath = `polygon(0 0, 100% 0, 100% ${50 + off}%, 0 ${50 - off}%)`; lb.style.clipPath = `polygon(0 ${50 - off}%, 100% ${50 + off}%, 100% 100%, 0 100%)`;
      const inEnd = t * .14; for (const L of [la, lb]) cutA(L, [{ opacity: 0, transform: 'translateX(-40px) skewX(-8deg)' }, { opacity: 1, transform: 'none' }], { duration: inEnd, easing: 'cubic-bezier(.1,.9,.2,1)' }); cutInk(la, inEnd, t * .32, 240); cutInk(lb, inEnd, t * .32, 240);
      if (C.F) { const at = C.hitAt - 200; cutA(C.d.querySelector('.cu-sw.x2 .cu-slash'), [{ opacity: .85, transform: 'scaleX(0)' }, { opacity: .85, transform: 'scaleX(1)', offset: .5 }, { opacity: 0, transform: 'scaleX(1) scaleY(.1)' }], { duration: 220, delay: at, easing: 'cubic-bezier(.6,0,.2,1)' }); cutSound('blade', at); } },
    hit(C) { const { la, lb, t, d } = C; const at = C.hitAt; cutA(d.querySelector('.cu-sw.main .cu-slash'), [{ opacity: 1, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)', offset: .45 }, { opacity: 0, transform: 'scaleX(1) scaleY(.2)' }], { duration: 300, delay: at, easing: 'cubic-bezier(.6,0,.2,1)' }); cutSound('blade', at);
      const sep = t - at - 120; cutA(la, [{ transform: 'none', opacity: 1 }, { transform: 'translate(-22px,-16px) rotate(-1.6deg)', opacity: 1, offset: .3 }, { transform: 'translate(-30px,-22px) rotate(-2deg)', opacity: .9, offset: .6 }, { transform: 'translate(-70px,-40px) rotate(-3deg)', opacity: 0 }], { duration: sep, delay: at + 110, easing: 'cubic-bezier(.2,.8,.3,1)' });
      cutA(lb, [{ transform: 'none', opacity: 1 }, { transform: 'translate(22px,16px) rotate(1.6deg)', opacity: 1, offset: .3 }, { transform: 'translate(30px,22px) rotate(2deg)', opacity: .9, offset: .6 }, { transform: 'translate(70px,40px) rotate(3deg)', opacity: 0 }], { duration: sep, delay: at + 110, easing: 'cubic-bezier(.2,.8,.3,1)' });
      cutAt(at + 100, () => [...document.querySelectorAll('[data-hud="hud-field"]')].map(el => [el, [{ transform: 'none' }, { transform: 'translate(5px,-1px)', offset: .25 }, { transform: 'none' }]]), { duration: 260, easing: 'ease-out' }); },
    linger(C) { const at = C.hitAt + 90, col = C.col.join(','), tanA = C.tanA, W = C.rc.w, y0 = C.yMid; const n1 = C.F ? 80 : 70, n2 = C.F ? 22 : 26;
      cutLater(at, () => { cutSpawn(n1, () => { const x = cutRnd(W * (C.F ? 0 : .08), W * (C.F ? 1 : .92)), y = y0 + (x - W / 2) * tanA, dir = Math.random() < .5 ? -1 : 1; return { x, y, vx: cutRnd(-2.5, 2.5), vy: dir * cutRnd(C.F ? 2.5 : 1, C.F ? 8 : 7), g: C.F ? .09 : .06, drag: .94, life: cutRnd(22, 48), max: 48, s: cutRnd(1, 2.2), a: 1, c: Math.random() < .3 ? '255,230,190' : col, streak: true }; });
        cutSpawn(n2, () => ({ x: cutRnd(W * .1, W * .9), y: y0 + cutRnd(-8, 8), vx: cutRnd(-.5, .5), vy: cutRnd(-2, -.5), g: -.02, drag: .985, life: cutRnd(40, 80), max: 80, s: cutRnd(1.5, 3.4), a: .8, c: col })); });
      if (!C.F) return; cutJob(at, 460, (c, k, r) => { const a = 1 - k; c.strokeStyle = 'rgba(255,245,230,' + a * .9 + ')'; c.lineWidth = 1.8 * a + .4; c.shadowColor = 'rgba(' + col + ',1)'; c.shadowBlur = 14; c.beginPath(); for (let x = -20; x <= r.width + 20; x += 20) { const y = y0 + (x - r.width / 2) * tanA + Math.sin(x * .13) * 1.6 * a; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); });
      const gr = C.d.querySelector('.cu-ghost.r'), gb = C.d.querySelector('.cu-ghost.b'); cutA(gr, [{ opacity: 0, transform: 'none' }, { opacity: .45, transform: 'translate(-5px,-2px)', offset: .25 }, { opacity: 0, transform: 'translate(-12px,-5px)' }], { duration: 380, delay: at + 10 }); cutA(gb, [{ opacity: 0, transform: 'none' }, { opacity: .4, transform: 'translate(5px,2px)', offset: .25 }, { opacity: 0, transform: 'translate(12px,5px)' }], { duration: 380, delay: at + 10 }); },
    out() { }
  },
  guard: {
    pre(C) { const { la, lb } = C, shut = C.hitAt; la.style.clipPath = 'inset(0 50% 0 0)'; lb.style.clipPath = 'inset(0 0 0 50%)'; cutA(la, [{ transform: 'translateX(-55%)', opacity: .6 }, { transform: 'translateX(0)', opacity: 1 }], { duration: shut, easing: 'cubic-bezier(.7,0,.9,.4)' }); cutA(lb, [{ transform: 'translateX(55%)', opacity: .6 }, { transform: 'translateX(0)', opacity: 1 }], { duration: shut, easing: 'cubic-bezier(.7,0,.9,.4)' }); },
    hit(C) { const { la, lb, d, t } = C, shut = C.hitAt; cutSound('guard', shut);
      cutA(d.querySelector('.cu-seam'), [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 0 }], { duration: 520, delay: shut, easing: 'ease-out' }); cutA(d.querySelector('.cu-ring'), [{ opacity: .95, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(9)' }], { duration: 620, delay: shut, easing: 'cubic-bezier(.2,.8,.3,1)' });
      for (const L of [la, lb]) cutA(L.querySelector('.cu-hex'), [{ opacity: 0 }, { opacity: .22, offset: .2 }, { opacity: .06, offset: .7 }, { opacity: 0 }], { duration: t * .7, delay: shut });
      cutAt(shut, () => [...document.querySelectorAll('[data-hud="hud-field"]')].map(el => [el, [{ transform: 'scale(1)' }, { transform: 'scale(.988)', offset: .3 }, { transform: 'scale(1)' }]]), { duration: 300, easing: 'ease-out' });
      for (const L of [la, lb]) { L.querySelectorAll('.cu-q span').forEach(e => cutA(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: shut + 60 })); cutA(L.querySelector('.cu-q'), [{ transform: 'scale(1.08)', filter: 'blur(2px)' }, { transform: 'scale(1)', filter: 'blur(0)' }], { duration: 260, delay: shut + 60, easing: 'cubic-bezier(.2,.9,.3,1)' }); cutA(L.querySelector('.cu-skill'), [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: shut + 40 }); } },
    linger(C) { const shut = C.hitAt, col = C.col.join(','), x0 = C.rc.w / 2, y0 = C.yMid, t = C.t;
      cutLater(shut, () => cutSpawn(22, () => ({ x: x0 + cutRnd(-6, 6), y: y0 + cutRnd(-40, 40), vx: cutRnd(-3.5, 3.5), vy: cutRnd(-1.5, 1.5), g: .14, drag: .96, life: cutRnd(26, 50), max: 50, s: cutRnd(1.2, 2.4), a: .9, c: col })));
      if (!C.F) return; const stg = C.d.querySelector('.cu-stage'), ring = C.d.querySelector('.cu-ring');
      [140, 280].forEach(dl => { const rg = ring.cloneNode(); stg.appendChild(rg); cutA(rg, [{ opacity: .8, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(12)' }], { duration: 760, delay: shut + dl, easing: 'cubic-bezier(.2,.8,.3,1)' }); cutSound('guard', shut + dl); });
      cutJob(shut, t * .75, (c, k, r) => { const cxm = r.width / 2, cym = y0, R = Math.hypot(cxm, r.height) * 1.1, front = R * Math.min(1, k * 1.8), size = 22, hh = size * Math.sqrt(3); c.lineWidth = 1.2;
        for (let gy = -1; gy < r.height / hh + 1; gy++) for (let gx = -1; gx < r.width / (size * 1.5) + 1; gx++) { const x = gx * size * 1.5, y = gy * hh + (gx % 2 ? hh / 2 : 0), dd = Math.hypot(x - cxm, y - cym), edge = Math.abs(dd - front); let a = dd < front ? 0.10 * (1 - k) : 0; if (edge < 26) a += 0.55 * (1 - edge / 26) * (1 - k * .6); if (a < .02) continue;
          c.strokeStyle = 'rgba(' + col + ',' + a + ')'; c.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283, px = x + Math.cos(an) * size, py = y + Math.sin(an) * size; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke(); } });
      cutJob(shut + 120, 520, (c, k, r) => { const st = C.stage, y = st.t, h = st.h, x = -200 + (r.width + 400) * k; const g = c.createLinearGradient(x - 90, 0, x + 90, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,240,230,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - 60, y); c.lineTo(x + 100, y); c.lineTo(x + 60, y + h); c.lineTo(x - 100, y + h); c.fill(); });
      cutLater(shut, () => cutSpawn(50, () => { const a = cutRnd(0, 6.283), sp = cutRnd(3, 9); return { x: x0, y: y0 + cutRnd(-50, 50), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, g: .12, drag: .93, life: cutRnd(20, 40), max: 40, s: cutRnd(1, 2), a: 1, c: Math.random() < .5 ? '235,225,215' : col, streak: true }; })); },
    out(C) { const { la, lb } = C, at = C.t - 420; cutA(la, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-18%)', opacity: 0 }], { duration: 420, delay: at, easing: 'ease-in' }); cutA(lb, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(18%)', opacity: 0 }], { duration: 420, delay: at, easing: 'ease-in' }); }
  },
  arcane: {
    pre(C) { const { la, lb, t, d } = C, rise = C.hitAt; lb.style.opacity = 0; cutA(la, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: rise, easing: 'cubic-bezier(.3,.7,.3,1)' }); cutSound('arcane', 0, rise / 1000 + .5);
      cutA(d.querySelector('.cu-sigil'), [{ opacity: 0, transform: 'rotate(-40deg) scale(.6)' }, { opacity: .55, transform: 'rotate(0deg) scale(1)', offset: .25 }, { opacity: .4, transform: 'rotate(50deg) scale(1.05)', offset: .85 }, { opacity: 0, transform: 'rotate(70deg) scale(1.25)' }], { duration: t, easing: 'linear' }); cutInk(la, rise * .6, t * .34, 300); },
    hit(C) { const { la } = C, rise = C.hitAt; cutA(la.querySelector('.cu-q'), [{ textShadow: '0 0 12px var(--glow), 0 1px 0 rgba(0,0,0,.7)' }, { textShadow: '0 0 24px var(--glow), 0 1px 0 rgba(0,0,0,.7)' }, { textShadow: '0 0 14px var(--glow), 0 1px 0 rgba(0,0,0,.7)' }], { duration: 520, iterations: 3, delay: rise, easing: 'ease-in-out' }); },
    linger(C) { const t = C.t, rise = C.hitAt, col = C.col.join(','), W = C.rc.w, yb = C.stage.t + C.stage.h, yc = C.yMid;
      const emb = () => ({ x: cutRnd(W * .12, W * .88), y: yb + cutRnd(-6, 6), vx: cutRnd(-.35, .35), vy: cutRnd(-2.4, -1), g: -.02, drag: .99, life: cutRnd(40, 80), max: 80, s: cutRnd(1.2, 2.8), a: .95, c: Math.random() < .25 ? '255,214,140' : col });
      for (let k = 0, at = 0; at < t * .7; k++, at += 60) cutLater(at, () => cutSpawn(5, emb));
      if (!C.F) return; const rune = C.d.querySelector('.cu-rune'); cutA(rune, [{ opacity: 0, transform: 'scale(.7) rotate(-20deg)' }, { opacity: .6, transform: 'scale(1) rotate(0deg)', offset: .24 }, { opacity: .5, transform: 'scale(1.03) rotate(22deg)', offset: .85 }, { opacity: 0, transform: 'scale(1.2) rotate(32deg)' }], { duration: t, easing: 'cubic-bezier(.2,.7,.3,1)' }); const rg2 = rune.querySelector('.cu-rg2'); if (rg2) { rg2.style.transformOrigin = '210px 210px'; cutA(rg2, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-90deg)' }], { duration: t, easing: 'linear' }); }
      cutJob(0, t, (c, k, r) => { const base = yb + 6, cxm = r.width / 2, amp = Math.sin(Math.min(1, k * 1.6) * Math.PI / 2) * (k > .8 ? (1 - k) / .2 : 1) * .55, H = r.height * .5 * amp / .55, Wd = r.width * .26;
        for (let i = 0; i < 3; i++) { const ww = Wd * (1 - i * .22), hh = H * (1 - i * .15), g = c.createRadialGradient(cxm, base, 4, cxm, base - hh * .35, hh * .9 + 1); g.addColorStop(0, 'rgba(255,230,180,' + .2 * amp + ')'); g.addColorStop(.45, 'rgba(' + col + ',' + .12 * amp + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = g; c.beginPath(); c.moveTo(cxm - ww, base); c.quadraticCurveTo(cxm - ww * .5 + Math.sin(k * 26 + i) * 10, base - hh * .6, cxm + Math.sin(k * 20 + i * 2) * 14, base - hh); c.quadraticCurveTo(cxm + ww * .5 + Math.cos(k * 24 + i) * 10, base - hh * .6, cxm + ww, base); c.fill(); } });
      const G2 = C.d.querySelector('.cu-glyphs'), R = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ', n = 12;
      for (let i = 0; i < n; i++) { const g = document.createElement('span'); g.className = 'cu-glyph'; g.textContent = R[(i * 7) % R.length]; const side = i % 2 ? 1 : -1, x = W / 2 + side * cutRnd(W * .2, W * .44), y = yc + cutRnd(-C.stage.h * .55, C.stage.h * .55); g.style.left = x + 'px'; g.style.top = y + 'px'; G2.appendChild(g);
        const dl = rise + i * (t * .45 / n), life = t - dl - 120; cutA(g, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.6)', filter: 'blur(3px)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.15)', filter: 'blur(0)', offset: .15 }, { opacity: .85, transform: 'translate(-50%, calc(-50% - 22px)) scale(1)', offset: .75 }, { opacity: 0, transform: 'translate(-50%, calc(-50% - 44px)) scale(.9)', filter: 'blur(2px)' }], { duration: life, delay: dl, easing: 'ease-out' });
        cutLater(dl + life - 80, () => cutSpawn(5, () => ({ x, y: y - 40, vx: cutRnd(-1, 1), vy: cutRnd(-2.4, -.8), g: -.02, drag: .97, life: cutRnd(20, 40), max: 40, s: cutRnd(1, 2), a: .9, c: col }))); } },
    out(C) { const { la, t } = C, at = t - 420, col = C.col.join(','), W = C.rc.w; cutA(la, [{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 100% 0)', opacity: .6 }], { duration: 400, delay: at, easing: 'ease-in' });
      cutLater(at, () => cutSpawn(C.F ? 40 : 50, () => ({ x: cutRnd(W * .1, W * .9), y: C.stage.t + cutRnd(10, C.stage.h - 10), vx: cutRnd(-1.2, 1.2), vy: cutRnd(-4, -1.5), g: -.03, drag: .975, life: cutRnd(30, 60), max: 60, s: cutRnd(1, 2.4), a: 1, c: col }))); }
  }
} };
const CUT_HIT = { blade: .56, guard: .16, arcane: .2 }; /* 문법: 맞물림(hit)의 시각(길이에 대한 몫) */
/* cutin({ line, cut, motif, col }): 문법 한 함수. 그림은 모티프 표에서 */
function cutin(o) {
  const rc = cutBoardRect(); if (!rc) return 0; const lvl = cutLevel(); if (lvl === 'off') return 0; const rm = vfxRm(), F = lvl === 'fancy' && !rm;
  const t = Math.round((CUT_PACE[G.pace] || CUT_PACE.normal) * (F ? 1.25 : 1)); const s = o.s, d = cutBuild(s, o.col, rc); d.classList.add('cu-' + o.cut); if (F) d.classList.add('cu-fancy');
  const la = d.querySelector('.cu-layer.la'), lb = d.querySelector('.cu-layer.lb'), stR = d.querySelector('.cu-stage').getBoundingClientRect(); const C = { d, la, lb, t, col: o.col, F, rc, hitAt: Math.round(t * (CUT_HIT[o.cut] || .5)), stage: { t: stR.top - rc.t, h: stR.height }, yMid: stR.top - rc.t + stR.height / 2 };
  cutA(d.querySelector('.cu-veil'), [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: t, easing: 'linear' });
  cutCard(o.cut, C.hitAt, t, rm);
  if (rm) { cutShow(la, t); lb.style.display = 'none'; }
  else { const M = (CUT_MOTIF[o.motif] || CUT_MOTIF.spellblade)[o.cut]; M.pre(C); M.hit(C); M.linger(C); M.out(C); }
  cutLater(t + 60, () => cutStop()); return t;
}
/* render()가 끝날 때(vfxFlush 앞에서) 쌓인 컷인을 띄운다 */
function cutFlush() {
  if (!vfxDoc() || !CUT.q.length) return; const q = CUT.q; CUT.q = []; const x = q.filter(e => Date.now() - e.t < 3000).pop(); if (!x || !G.b || G.sheet || G.hudEd || document.hidden) return;
  const col = CUT_COL[x.s.b] || [201, 162, 75]; try { cutin({ line: x.s.line, cut: x.s.cut, motif: x.build, col, s: x.s }); } catch (e) { cutStop(); }
}
/* 엔진 runSkill2 감싸기(화면이 있을 때만): 승부수를 쓴 뒤 큐에 쌓는다. 결과를 그대로 돌려준다 */
(function () {
  if (typeof document === 'undefined' || typeof runSkill2 !== 'function') return; const o0 = runSkill2;
  runSkill2 = function (b, act, tgt) { const r = o0.apply(this, arguments); try { if (b && act && act.s && act.s.line) cutQueue(b, act.s); } catch (e) { } return r; };
})();
