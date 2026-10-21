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
const CUT_COL = { 반탄: [240, 144, 60], 역혈: [230, 192, 96], 파혈: [232, 238, 245], /* M5-2 수도승: 역천권 방어(주황) · 천망 마법(금빛 경락) · 일지멸맥 검(가늘고 하얀 빛), 그 밖 연출은 M10b */ 혈염: [239, 93, 60], '죄인의 피': [194, 58, 82], '유산의 불': [240, 172, 72], 공성추: [168, 186, 206], '기둥 파쇄': [201, 139, 74], '용맹의 투지': [232, 194, 90], 독화: [150, 205, 90], 암영: [170, 150, 235], 잔영: [140, 150, 178], 명궁: [238, 222, 160], 유격: [130, 215, 195], 잠복: [205, 60, 70], 빙염: [196, 168, 250], 정적: [205, 230, 255], 마염: [255, 122, 62] }; /* M5-6: 승부수 연출 18 시안 4판 색(가지마다) */ // M5-1 파수꾼: 기존 셋(검 · 방어)에 색만 바꿈. 방패 오라 · 균열 파동 · 성문 연출은 M10b(0.8.1)
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
/* ---- 입자 · 캔버스 그리기 (cutTick은 아래 M5-6 덩어리: 대사 둘레 지우기 포함) ---- */
function cutSpawn(n, f) { if (!CUT.cx) return; n = Math.max(0, Math.min(n, CUT_PMAX - CUT.P.length)); for (let i = 0; i < n; i++) CUT.P.push(f(i)); if (!CUT.raf) CUT.raf = requestAnimationFrame(cutTick); }
function cutJob(start, dur, draw) { if (!CUT.cx) return; CUT.J.push({ t0: performance.now() + start, dur, draw }); if (!CUT.raf) CUT.raf = requestAnimationFrame(cutTick); }
function cutLater(ms, f) { CUT.tmr.push(setTimeout(() => { if (CUT.on) f(); }, ms)); }
const cutA = (el, kf, o) => { if (!el || !el.animate) return null; const a = el.animate(kf, Object.assign({ fill: 'both', easing: 'cubic-bezier(.2,.7,.2,1)' }, o)); CUT.run.push(a); return a; };
/* ---- 소리(효과음 설정이 켜져 있을 때만). 파일이 있으면 그 파일, 없으면 합성음 ---- */
function cutAu() { if (!vfxSndOn() || typeof SND === 'undefined' || !SND.unlocked) return null; try { CUT.AC = CUT.AC || new (window.AudioContext || window.webkitAudioContext)(); if (CUT.AC.state === 'suspended') CUT.AC.resume(); return CUT.AC; } catch (e) { return null; } }
function cutNoise(c, t, dur, freq, vol, swell) { const v0 = vol * sndCfg().sfx; const n = c.createBuffer(1, Math.max(1, c.sampleRate * dur | 0), c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = n; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8; const g = c.createGain(); if (swell) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v0, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur); } else { g.gain.setValueAtTime(v0, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); } s.connect(f).connect(g).connect(c.destination); s.start(t); }
/* cutSound는 아래 M5-6 덩어리(압축 · 잔향 버스 AX, 파일 cut_<cut> 우선) */
/* ---- 덮개 DOM ---- */
const CUT_RUNE = '<svg class="cu-rune" viewBox="0 0 420 420" aria-hidden="true" focusable="false"><defs><path id="cu-rp1" d="M210 210 m-180 0 a180 180 0 1 1 360 0 a180 180 0 1 1 -360 0"/><path id="cu-rp2" d="M210 210 m-140 0 a140 140 0 1 0 280 0 a140 140 0 1 0 -280 0"/></defs><circle cx="210" cy="210" r="196" stroke-width="1.4"/><circle cx="210" cy="210" r="166" stroke-width=".8"/><circle cx="210" cy="210" r="124" stroke-width="1"/><g class="cu-rg1"><text><textPath href="#cu-rp1">ᚱ ᛟ ᚦ ᛉ ᚨ ᛞ ᚷ ᛗ ᚾ ᛁ ᛋ ᛏ ᚱ ᛟ ᚦ ᛉ ᚨ ᛞ ᚷ ᛗ ᚾ ᛁ ᛋ ᛏ ᚱ ᛟ ᚦ ᛉ</textPath></text></g><g class="cu-rg2"><text><textPath href="#cu-rp2">✦ 유 · 산 · 의 · 불 ✦ 유 · 산 · 의 · 불 ✦ 유 · 산 · 의 · 불 ✦</textPath></text></g><path d="M210 30 L366 300 L54 300 Z" stroke-width="1" opacity=".6"/><path d="M210 390 L54 120 L366 120 Z" stroke-width="1" opacity=".6"/></svg>';
const CUT_SIGIL = '<svg class="cu-sigil" viewBox="0 0 220 220" aria-hidden="true" focusable="false"><circle cx="110" cy="110" r="104" stroke-width="1.2" opacity=".8"/><circle cx="110" cy="110" r="92" stroke-width="0.8" stroke-dasharray="2 6"/><circle cx="110" cy="110" r="62" stroke-width="1"/><path d="M110 18 L189 156 L31 156 Z" stroke-width="1" opacity=".7"/><path d="M110 202 L31 64 L189 64 Z" stroke-width="1" opacity=".7"/></svg>';
function cutBuild(s, col, rc) {
  cutStop(); const L = vfxLayer(); const d = document.createElement('div'); d.className = 'cutin'; d.style.cssText = `left:${rc.l}px;top:${rc.t}px;width:${rc.w}px;height:${rc.h}px;--edge:rgb(${col});--glow:rgba(${col},.85);--band:rgba(${Math.round(col[0] * .22)},${Math.round(col[1] * .12)},${Math.round(col[2] * .1)},.93)`;
  const esc1 = c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c; const q = [...s.line.replace(/^「|」$/g, '')].map(c => '<span>' + esc1(c) + '</span>').join(''), nm = [...s.n].join(' ');
  const lay = id => `<div class="cu-layer ${id}"><div class="cu-band"></div><div class="cu-hex"></div><div class="cu-txt"><div class="cu-skill">${nm}</div><div class="cu-q">${q}</div></div></div>`;
  d.innerHTML = `<div class="cu-veil"></div>${CUT_RUNE}<div class="cu-glyphs"></div><div class="cu-stage">${lay('la')}${lay('lb')}${CUT_SIGIL}<div class="cu-seam"></div><div class="cu-ring"></div><div class="cu-sw x2"><div class="cu-slash"></div></div><div class="cu-sw main"><div class="cu-slash"></div></div><div class="cu-ghost r"><div class="cu-txt"><div class="cu-skill"></div><div class="cu-q">${q}</div></div></div><div class="cu-ghost b"><div class="cu-txt"><div class="cu-skill"></div><div class="cu-q">${q}</div></div></div></div><canvas class="cu-cv"></canvas>`;
  L.appendChild(d); CUT.el = d; CUT.on = true; const cv = d.querySelector('.cu-cv'), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = rc.w * dpr; cv.height = rc.h * dpr; CUT.cv = cv; CUT.cx = cv.getContext('2d'); CUT.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CUT.hole = null; try { cutHole(); } catch (e) { CUT.hole = null; } /* M5-6: 대사 자리(움직임이 붙기 전) */
  return d;
}
function cutStop() { for (const a of CUT.run) { try { a.cancel(); } catch (e) { } } CUT.run = []; for (const t of CUT.tmr) clearTimeout(t); CUT.tmr = []; CUT.P = []; CUT.J = []; CUT.on = false; if (CUT.el && CUT.el.parentNode) CUT.el.parentNode.removeChild(CUT.el); CUT.el = null; CUT.cx = null; CUT.hole = null; }
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
      if (!C.F) return; const rune = C.d.querySelector('.cu-rune'); if (C.sid === 'sb_firebody') cutA(rune, [{ opacity: 0, transform: 'scale(.7) rotate(-20deg)' }, { opacity: .6, transform: 'scale(1) rotate(0deg)', offset: .24 }, { opacity: .5, transform: 'scale(1.03) rotate(22deg)', offset: .85 }, { opacity: 0, transform: 'scale(1.2) rotate(32deg)' }], { duration: t, easing: 'cubic-bezier(.2,.7,.3,1)' }); const rg2 = rune.querySelector('.cu-rg2'); if (rg2 && C.sid === 'sb_firebody') { /* M5-6: 룬 고리 글자 "유산의 불"은 불의 몸 전용 */ rg2.style.transformOrigin = '210px 210px'; cutA(rg2, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-90deg)' }], { duration: t, easing: 'linear' }); }
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
  const la = d.querySelector('.cu-layer.la'), lb = d.querySelector('.cu-layer.lb'), stR = d.querySelector('.cu-stage').getBoundingClientRect(); const C = { d, la, lb, t, col: o.col, F, rc, hitAt: Math.round(t * (CUT_HIT[o.cut] || .5)), stage: { t: stR.top - rc.t, h: stR.height }, yMid: stR.top - rc.t + stR.height / 2, sid: s && s.id };
  cutA(d.querySelector('.cu-veil'), [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: t, easing: 'linear' });
  cutCard(o.cut, C.hitAt, t, rm);
  if (rm) { cutShow(la, t); lb.style.display = 'none'; }
  else { const M = (CUT_MOTIF[o.motif] || CUT_MOTIF.spellblade)[o.cut]; M.pre(C); M.hit(C); M.linger(C); M.out(C); }
  cutLater(t + 60, () => cutStop()); return t;
}
/* ===== 0.8.0 M5-6 승부수 연출 18 (10월 21일 만든 사람 확정, 시안 4판: nrk-private/제안/승부수-연출 motifs.js 이식). 장식과 소리만 =====
   돌려막기 금지: 승부수마다 따로 짓는다(CUT_SK[id] = { h 맞물림 몫, len 길이 배율 ≤ 1.2, veil 덮개, run 그림 }). 게임 원본 그림은 불의 몸 · 용맹한 방벽 둘(game).
   대사는 늘 보인다: cutBuild 직후 대사 자리를 재고(CUT.hole) cutTick이 그 둘레의 효과를 부드럽게 지운다. 소리는 층(저음 몸통 + 첫 타격 + 잔향, 마스터 압축).
   사냥꾼 셋은 음높이 있는 소리를 쓰지 않는다(boom · noise · whoosh · clatter만). 효과 '약하게'(기본)는 C.F = false 갈래: 흔들림 절반, 판 전체 그림 줄임 */
const RR = (a, b) => a + Math.random() * (b - a);
const eo = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3), ei = k => Math.pow(Math.min(1, Math.max(0, k)), 3);
const relOf = (el, C) => { const r = el.getBoundingClientRect(); return { x: r.left - C.rc.l + r.width / 2, y: r.top - C.rc.t + r.height / 2, w: r.width, h: r.height }; };
const ensOf = C => cutEns().map(e => relOf(e, C));
const fieldEl = () => document.querySelector('[data-hud="hud-field"]');

/* ---- 소리 2판: 합성음이지만 층을 쌓는다(저음 몸통 · 첫 타격음 · 꼬리 울림). 마스터 압축 + 잔향 버스. 효과음이 켜져 있을 때만 ---- */
const AX = { ctx: null, bus: null, rev: null,
  init() { const c = cutAu(); if (!c) return null; if (this.ctx !== c) { this.ctx = c; const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = .002; comp.release.value = .3; comp.connect(c.destination);
      const m = c.createGain(); m.gain.value = 1; m.connect(comp); this.bus = m; const cv = c.createConvolver(); cv.buffer = this.ir(c, 2.8, 2.6); const rg = c.createGain(); rg.gain.value = .6; cv.connect(rg).connect(m); this.rev = cv; } return c; },
  ir(c, dur, dec) { const n = c.sampleRate * dur | 0, b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, dec) * (i < 200 ? i / 200 : 1); } return b; },
  dest(o) { const c = this.ctx, g = c.createGain(); let p = null; if (c.createStereoPanner) { p = c.createStereoPanner(); p.pan.value = o.pan || 0; g.connect(p); } const out = p || g; out.connect(this.bus); if (o.wet) { const s = c.createGain(); s.gain.value = o.wet; out.connect(s); s.connect(this.rev); } return { in: g, pan: p }; },
  T(at) { return this.ctx.currentTime + Math.max(0, at) / 1000; }, V() { return sndCfg().sfx; },
  shaper(amt) { const ws = this.ctx.createWaveShaper(), n = 1024, cu = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cu[i] = Math.tanh(x * amt) / Math.tanh(amt); } ws.curve = cu; return ws; },
  nbuf(dur) { const c = this.ctx, n = Math.max(1, c.sampleRate * dur | 0), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; },
  /* 저음 몸통: 음높이가 떨어지는 사인 + 일그러뜨림 + 첫 딸깍 */
  boom(at, o) { const c = this.init(); if (!c) return; const t = this.T(at), V = this.V(), dur = o.dur || .9, D = this.dest(o), os = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    os.type = 'sine'; os.frequency.setValueAtTime(o.f0 || 75, t); os.frequency.exponentialRampToValueAtTime(o.f1 || 32, t + dur * .6); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime((o.vol || .6) * V, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    lp.type = 'lowpass'; lp.frequency.value = o.lp || 700; os.connect(this.shaper(o.drive || 3)).connect(lp).connect(g).connect(D.in); os.start(t); os.stop(t + dur + .05);
    if (o.click !== 0) this.noise(at, { dur: .04, f0: o.click || 2200, q: .6, vol: (o.vol || .6) * .55, pan: o.pan, wet: o.wet }); },
  noise(at, o) { const c = this.init(); if (!c) return; const t = this.T(at), V = this.V(), dur = o.dur || .3, D = this.dest(o), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), vol = (o.vol || .3) * V;
    s.buffer = this.nbuf(dur); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0 || 1000, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur); f.Q.value = o.q || 1;
    if (o.swell) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * (o.peak || .6)); g.gain.linearRampToValueAtTime(.0001, t + dur); } else { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.atk || .002)); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
    let ch = s.connect(f); if (o.drive) ch = ch.connect(this.shaper(o.drive)); ch.connect(g).connect(D.in); if (D.pan && o.pan1 != null) { D.pan.pan.setValueAtTime(o.pan || 0, t); D.pan.pan.linearRampToValueAtTime(o.pan1, t + dur); } s.start(t); },
  /* 쇳소리: 어긋난 배음 다섯(칼 · 쇠사슬 · 덫) */
  metal(at, o) { const c = this.init(); if (!c) return; const t = this.T(at), V = this.V(), D = this.dest(o), f = o.f || 1800, dur = o.dur || 1.2;
    [[1, 1], [2.76, .55], [5.4, .3], [8.93, .16], [1.49, .22]].forEach(([r, a]) => { const os = c.createOscillator(), g = c.createGain(); os.frequency.setValueAtTime(f * r, t); os.frequency.exponentialRampToValueAtTime(f * r * (o.bend || .994), t + dur); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime((o.vol || .15) * a * V, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur / (r * .3 + .7)); os.connect(g).connect(D.in); os.start(t); os.stop(t + dur + .05); }); },
  /* 종: FM(천망 · 정적) */
  bell(at, o) { const c = this.init(); if (!c) return; const t = this.T(at), V = this.V(), D = this.dest(o), f = o.f || 880, dur = o.dur || 2.2, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * (o.ratio || 3.5); mg.gain.setValueAtTime(f * (o.index || 2.2), t); mg.gain.exponentialRampToValueAtTime(f * .03, t + dur); mod.connect(mg).connect(car.frequency);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime((o.vol || .12) * V, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur); car.connect(g).connect(D.in); car.start(t); mod.start(t); car.stop(t + dur + .05); mod.stop(t + dur + .05); },
  /* 줄 튕김: 카플러스-스트롱(활시위) */
  pluck(at, o) { const c = this.init(); if (!c) return; const t = this.T(at), V = this.V(), D = this.dest(o), f = o.f || 110, dur = o.dur || 1.2, sr = c.sampleRate, n = sr * dur | 0, b = c.createBuffer(1, n, sr), d = b.getChannelData(0), P = Math.max(2, Math.round(sr / f)), q = new Float32Array(P);
    for (let i = 0; i < P; i++) q[i] = Math.random() * 2 - 1; let k = 0; const dm = o.damp || .996; for (let i = 0; i < n; i++) { const nx = (k + 1) % P, v = q[k]; d[i] = v; q[k] = dm * .5 * (v + q[nx]); k = nx; }
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = (o.vol || .4) * V; if (o.bend) { s.playbackRate.setValueAtTime(1, t); s.playbackRate.exponentialRampToValueAtTime(o.bend, t + dur); } s.connect(g).connect(D.in); s.start(t); },
  /* 화음 부풀림: 어긋난 톱니파 + 저역 필터 열림(마법 · 독 · 불) */
  pad(at, o) { const c = this.init(); if (!c) return; const t = this.T(at), V = this.V(), D = this.dest(o), dur = o.dur || 1.5, lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(o.lp0 || 250, t); lp.frequency.exponentialRampToValueAtTime(o.lp1 || 2600, t + dur * (o.peak || .5)); lp.frequency.exponentialRampToValueAtTime(o.lp0 || 250, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime((o.vol || .07) * V, t + dur * (o.peak || .5)); g.gain.linearRampToValueAtTime(.0001, t + dur); lp.connect(g).connect(D.in);
    (o.notes || [220, 262, 330]).forEach(fq => [-9, 9].forEach(dt => { const os = c.createOscillator(); os.type = o.wave || 'sawtooth'; os.frequency.value = fq; os.detune.value = dt; os.connect(lp); os.start(t); os.stop(t + dur + .05); })); },
  crackle(at, o) { for (let i = 0; i < (o.n || 20); i++) this.noise(at + Math.random() * (o.span || 800), { dur: .01 + Math.random() * .025, f0: 1400 + Math.random() * 4000, q: .7, vol: (o.vol || .15) * (.35 + Math.random() * .65), pan: (o.pan || 0) + (Math.random() - .5) * .5, wet: o.wet }); },
  whoosh(at, o) { this.noise(at, { dur: o.dur || .3, f0: o.f0 || 400, f1: o.f1 || 2600, q: o.q || 2, vol: o.vol || .3, swell: true, peak: o.peak || .7, pan: o.pan, pan1: o.pan1, wet: o.wet }); },
  clatter(at, o) { for (let i = 0; i < (o.n || 14); i++) { const a = at + Math.pow(Math.random(), 1.6) * (o.span || 700); this.noise(a, { dur: .03, f0: 600 + Math.random() * 2400, q: 4, vol: (o.vol || .14) * (.3 + Math.random() * .7), pan: (Math.random() - .5) * .8, wet: .2 }); } }
};
/* 게임 원본 그림(불의 몸 · 용맹한 방벽)이 부르는 소리도 2판으로 */
function cutSound(cut, at, dur) {
  const k = 'cut_' + cut; if (typeof SFX !== 'undefined' && SFX[k] && SFX[k].src) { cutLater(at, () => sfxPlay(k, { lim: 1, vol: 0.8 })); return; }
  if (cut === 'blade') { AX.whoosh(at - 70, { dur: .14, f0: 1500, f1: 6000, vol: .3 }); AX.metal(at, { f: 2300, vol: .16, dur: 1.2, wet: .35 }); }
  else if (cut === 'guard') { AX.boom(at, { f0: 90, f1: 36, dur: 1.1, vol: .65, drive: 4, wet: .5, click: 900 }); AX.metal(at + 5, { f: 310, vol: .07, dur: 1.4, bend: .985, wet: .5 }); AX.noise(at, { dur: .4, f0: 260, type: 'lowpass', vol: .4, wet: .3 }); }
  else { const d = (dur || 1) * 1000; AX.noise(at, { dur: d / 1000 + .3, f0: 400, f1: 2200, q: .8, vol: .26, swell: true, peak: .55, wet: .45 }); AX.crackle(at + d * .2, { n: 34, span: d * .9, vol: .13, wet: .3 }); AX.pad(at, { notes: [147, 220, 294, 440], dur: d / 1000 + .8, vol: .06, lp0: 180, lp1: 2400, wet: .5 }); AX.boom(at + d * .65, { f0: 110, f1: 45, dur: .8, vol: .35, wet: .45, click: 0 }); }
}
/* 승부수마다 소리(C: t 길이, H 맞물림) */
const CUT_SND = {
  sb_kalpa: (t, H) => { AX.whoosh(H - 250, { dur: .12, f0: 1200, f1: 6000, vol: .32, pan: -.4, pan1: .4 }); AX.metal(H - 190, { f: 1750, vol: .15, dur: 1, wet: .3, pan: -.2 }); AX.whoosh(H - 60, { dur: .12, f0: 1400, f1: 7000, vol: .36, pan: .4, pan1: -.4 }); AX.metal(H, { f: 2350, vol: .18, dur: 1.3, wet: .35, pan: .2 });
    AX.boom(H + 40, { f0: 120, f1: 50, dur: .5, vol: .35, wet: .3, click: 0 }); AX.noise(H + 70, { dur: 1.3, f0: 380, f1: 1600, q: .7, vol: .32, swell: true, peak: .25, wet: .4 }); AX.crackle(H + 100, { n: 40, span: 1100, vol: .16, wet: .3 }); },
  sb_sinwall: (t, H) => { AX.noise(0, { dur: H / 1000, f0: 120, f1: 420, type: 'lowpass', q: 4, vol: .3, swell: true, peak: .92, wet: .3 }); for (let i = 0; i < 9; i++) { const a = Math.random() * H * .9; AX.boom(a, { f0: RR(140, 260), f1: RR(70, 120), dur: .12, vol: .1, drive: 1.2, click: 0, wet: .2 }); }
    AX.boom(H, { f0: 80, f1: 30, dur: 1.2, vol: .75, drive: 4.5, wet: .55, click: 700 }); AX.noise(H, { dur: .35, f0: 700, f1: 220, q: 1.5, vol: .35, wet: .4 }); AX.metal(H + 8, { f: 260, vol: .06, dur: 1.6, bend: .98, wet: .6 }); },
  w_siege: (t, H) => { AX.noise(H - 420, { dur: .42, f0: 200, f1: 1400, q: 1.2, vol: .32, swell: true, peak: .97, pan: -.1, pan1: .1 }); AX.boom(H, { f0: 62, f1: 24, dur: 1.6, vol: .95, drive: 6, lp: 500, wet: .6, click: 1600 }); AX.boom(H + 4, { f0: 160, f1: 60, dur: .4, vol: .45, drive: 3, click: 0 });
    AX.noise(H, { dur: .5, f0: 1800, f1: 600, q: .5, vol: .55, drive: 3, wet: .45 }); AX.metal(H + 3, { f: 520, vol: .1, dur: 1.4, bend: .97, wet: .5 }); AX.clatter(H + 90, { n: 22, span: 900, vol: .2 }); AX.noise(H + 150, { dur: 1.2, f0: 300, type: 'lowpass', vol: .2, swell: true, peak: .1, wet: .5 }); },
  s_quake: (t, H) => { const T1 = t * .14, T2 = t * .33; AX.noise(0, { dur: t / 1000, f0: 70, f1: 140, type: 'lowpass', q: 2, vol: .45, swell: true, peak: .6, wet: .3 });
    AX.boom(T1, { f0: 55, f1: 30, dur: .7, vol: .45, drive: 3, wet: .45, click: 500 }); AX.clatter(T1, { n: 6, span: 300, vol: .1 }); AX.boom(T2, { f0: 55, f1: 28, dur: .8, vol: .6, drive: 4, wet: .5, click: 600 }); AX.clatter(T2, { n: 9, span: 400, vol: .13 });
    AX.noise(H - 20, { dur: .18, f0: 3200, f1: 900, q: .6, vol: .5, drive: 4 }); AX.boom(H, { f0: 50, f1: 22, dur: 1.8, vol: .95, drive: 6, lp: 450, wet: .6, click: 1200 }); for (let i = 0; i < 11; i++) AX.boom(H + i * 38, { f0: 140, f1: 70, dur: .18, vol: .16, drive: 2, click: 0, pan: -.8 + i * .16 }); AX.clatter(H + 80, { n: 26, span: 1100, vol: .2 }); },
  m_yeokcheon: (t, H) => { AX.whoosh(H - 240, { dur: .24, f0: 300, f1: 1800, q: 1.2, vol: .3, peak: .95, pan: .9, pan1: 0 }); AX.noise(H, { dur: .05, f0: 1700, q: .9, vol: .7, drive: 5 }); AX.boom(H, { f0: 180, f1: 80, dur: .22, vol: .55, drive: 3, click: 0, wet: .25 });
    AX.metal(H + 2, { f: 980, vol: .05, dur: .4 }); AX.whoosh(H + 90, { dur: .38, f0: 500, f1: 3600, q: 1.6, vol: .42, peak: .3, pan: 0, pan1: .9, wet: .3 }); AX.boom(H + 330, { f0: 110, f1: 55, dur: .35, vol: .3, pan: .7, click: 1400 }); },
  m_cheonmang: (t, H) => { [[0, 659], [140, 784], [290, 988], [470, 1175], [H + 160, 1319], [t * .62, 1568]].forEach(([a, f], i) => AX.bell(a, { f, vol: .11 - i * .008, dur: 2.4, ratio: 3.5, index: 1.6, wet: .55, pan: (i % 2 ? .35 : -.35) }));
    AX.pad(0, { notes: [330, 494, 659], wave: 'triangle', dur: t / 1000 + .6, vol: .05, lp0: 600, lp1: 3500, wet: .5 }); AX.bell(t * .62, { f: 196, vol: .12, dur: 2.8, ratio: 1.4, index: 3, wet: .6 }); },
  m_ilji: (t, H) => { const D = H + 280; AX.noise(0, { dur: H / 1000, f0: 5000, type: 'highpass', vol: .02, swell: true, peak: .9 }); AX.metal(H, { f: 3900, vol: .12, dur: .5, wet: .5 });
    AX.boom(D, { f0: 48, f1: 20, dur: 1.9, vol: .9, drive: 5, lp: 380, wet: .7, click: 0 }); AX.noise(D, { dur: .9, f0: 4200, f1: 1600, q: .6, vol: .16, wet: .5 }); for (let i = 0; i < 10; i++) AX.metal(D + 40 + i * RR(15, 45), { f: RR(2400, 5200), vol: .03, dur: .35, wet: .5, pan: RR(-.7, .7) }); },
  a_mandok: (t, H) => { AX.noise(0, { dur: H / 1000, f0: 6500, type: 'highpass', vol: .1, swell: true, peak: .95, wet: .3 }); for (let i = 0; i < 12; i++) AX.boom(RR(0, H), { f0: RR(300, 600), f1: RR(150, 250), dur: .07, vol: .06, drive: 1, click: 0, pan: RR(-.6, .6) });
    AX.boom(H, { f0: 140, f1: 45, dur: .7, vol: .5, drive: 2, wet: .4, click: 0 }); AX.noise(H, { dur: .9, f0: 600, f1: 3000, q: .8, vol: .28, swell: true, peak: .2, wet: .5 }); AX.pad(H, { notes: [233, 277, 349, 415], dur: 1.6, vol: .07, lp0: 300, lp1: 4000, peak: .25, wet: .55 }); for (let i = 0; i < 8; i++) AX.bell(H + 120 + i * 90, { f: RR(1800, 3200), vol: .03, dur: .8, ratio: 2.7, index: 1, wet: .5, pan: RR(-.8, .8) }); },
  a_muyeong: (t, H) => { AX.noise(0, { dur: H / 1000 + .2, f0: 260, type: 'lowpass', vol: .12, swell: true, peak: .5, wet: .4 }); AX.whoosh(H - 30, { dur: .07, f0: 2500, f1: 9000, q: 1, vol: .45 }); AX.metal(H, { f: 4700, vol: .12, dur: .9, wet: .65 });
    AX.noise(H, { dur: .03, f0: 3800, q: 2, vol: .5, drive: 3 }); AX.boom(H + 140, { f0: 95, f1: 40, dur: .6, vol: .4, wet: .6, click: 0 }); },
  a_janyeong: (t, H) => { for (let i = 0; i < 8; i++) { const a = H + i * 85, p = i % 2 ? .6 : -.6; AX.whoosh(a - 30, { dur: .1, f0: 1200, f1: 5200, q: 1.5, vol: .26, pan: -p, pan1: p }); AX.metal(a + 20, { f: RR(2600, 3600), vol: .05, dur: .3, pan: p }); } AX.noise(H, { dur: .9, f0: 220, type: 'lowpass', vol: .2, swell: true, peak: .3, wet: .5 }); },
  h5_mangung: (t, H) => { AX.noise(0, { dur: H / 1000, f0: 110, type: 'lowpass', q: 1, vol: .22, swell: true, peak: .96 }); let a = 0; for (let i = 0; i < 26; i++) { a += (H * .9) / 26 * (1.5 - i / 26); AX.noise(a, { dur: .018, f0: RR(280, 520), q: 2, vol: .05 + i * .004 }); }
    AX.noise(H, { dur: .09, f0: 260, q: .9, vol: .7, drive: 4 }); AX.boom(H, { f0: 170, f1: 85, dur: .16, vol: .45, drive: 2, click: 0 }); AX.whoosh(H + 10, { dur: .2, f0: 5200, f1: 800, q: 1.2, vol: .55, peak: .2, pan: -.9, pan1: .9 }); AX.whoosh(H + 60, { dur: .45, f0: 1200, f1: 300, q: .8, vol: .16, peak: .1, pan: .2, pan1: .9, wet: .3 });
    AX.boom(H + 160, { f0: 115, f1: 42, dur: .45, vol: .6, drive: 3.5, pan: .8, click: 1600, wet: .4 }); AX.noise(H + 160, { dur: .14, f0: 700, type: 'lowpass', vol: .35, pan: .8 }); AX.clatter(H + 190, { n: 5, span: 260, vol: .08 }); },
  h5_gale: (t, H) => { AX.noise(0, { dur: t / 1000, f0: 500, f1: 1400, q: .7, vol: .26, swell: true, peak: .4, wet: .3, pan: -.5, pan1: .5 });
    [H, H + t * .22, H + t * .44].forEach(w => { for (let j = 0; j < 3; j++) AX.noise(w - 40 + j * 45, { dur: .06, f0: 280, q: .9, vol: .45, drive: 3, pan: -.6 }); for (let i = 0; i < 7; i++) { const d = RR(0, 160); AX.whoosh(w + d, { dur: .12, f0: 4800, f1: 1000, q: 1.2, vol: .22, peak: .2, pan: -.8, pan1: .8 }); AX.noise(w + d + 240, { dur: .05, f0: RR(900, 1500), q: 1.5, vol: .18, drive: 2, pan: RR(.2, .8) }); } }); },
  h5_trap: (t, H) => { [t * .06, t * .26].forEach(a => { AX.boom(a, { f0: 65, f1: 40, dur: .22, vol: .55, drive: 1.5, click: 0 }); AX.boom(a + 150, { f0: 58, f1: 38, dur: .2, vol: .4, drive: 1.5, click: 0 }); });
    AX.noise(H - 110, { dur: .11, f0: 700, f1: 2400, q: 1, vol: .25, swell: true, peak: .9 }); AX.noise(H, { dur: .05, f0: 2400, q: .8, vol: .8, drive: 6 }); AX.noise(H + 28, { dur: .04, f0: 1100, q: .8, vol: .55, drive: 4 }); AX.boom(H, { f0: 130, f1: 48, dur: .45, vol: .6, drive: 3, click: 0, wet: .35 });
    for (let i = 0; i < 7; i++) AX.noise(H + 60 + i * RR(30, 55), { dur: .03, f0: RR(1800, 3200), q: 1.4, vol: .09, pan: RR(-.5, .5) }); AX.noise(H + 40, { dur: .6, f0: 300, type: 'lowpass', vol: .2, swell: true, peak: .1, wet: .4 }); },
  e5_avatar: (t, H) => { AX.noise(0, { dur: H / 1000, f0: 400, f1: 1300, q: .6, vol: .22, swell: true, peak: .9, pan: -.6, wet: .3 }); AX.crackle(0, { n: 36, span: H, vol: .14, pan: -.6 }); for (let i = 0; i < 24; i++) AX.noise(RR(0, H), { dur: .02, f0: RR(5000, 9000), type: 'highpass', vol: .07, pan: .6 });
    AX.whoosh(H - 380, { dur: .4, f0: 300, f1: 3000, q: 1, vol: .3, peak: .95 }); AX.boom(H, { f0: 80, f1: 28, dur: 1.4, vol: .85, drive: 5, wet: .55, click: 1800 }); AX.noise(H, { dur: 1.2, f0: 7000, f1: 2500, q: .4, vol: .34, swell: true, peak: .06, wet: .45 }); AX.crackle(H + 60, { n: 24, span: 700, vol: .12 }); },
  e5_stasis: (t, H) => { AX.pad(0, { notes: [880, 1318, 1760], wave: 'sine', dur: H / 1000 + .05, vol: .05, lp0: 3000, lp1: 6000, peak: .97 }); AX.noise(0, { dur: H / 1000, f0: 8000, type: 'highpass', vol: .05, swell: true, peak: .97 });
    AX.noise(H, { dur: .015, f0: 5000, q: 2, vol: .4 }); AX.bell(H + 200, { f: 1319, vol: .16, dur: 3.2, ratio: 1.0007, index: .3, wet: .7 }); AX.bell(H + 200, { f: 2637, vol: .05, dur: 2.2, ratio: 3.5, index: .8, wet: .7 }); },
  e5_meteor: (t, H) => { AX.noise(0, { dur: t / 1000 + .4, f0: 300, f1: 900, q: .6, vol: .28, swell: true, peak: .5, wet: .45 }); AX.pad(0, { notes: [98, 147, 196], dur: t / 1000 + .4, vol: .05, lp0: 150, lp1: 1600, wet: .4 });
    for (let i = 0; i < 12; i++) { const a = RR(t * .05, t * .72), p = RR(-.8, .8); AX.whoosh(a, { dur: .42, f0: 1400, f1: 300, q: 1.2, vol: .12, peak: .85, pan: p - .3, pan1: p }); AX.boom(a + 430, { f0: RR(90, 140), f1: 40, dur: .5, vol: .3, drive: 3, pan: p, wet: .4, click: 1000 }); AX.crackle(a + 450, { n: 6, span: 300, vol: .1, pan: p }); }
    AX.whoosh(H - 520, { dur: .55, f0: 900, f1: 200, q: 1, vol: .4, peak: .9, wet: .3 }); AX.boom(H, { f0: 58, f1: 20, dur: 2, vol: 1, drive: 7, lp: 480, wet: .65, click: 1400 }); AX.noise(H, { dur: 1.4, f0: 600, f1: 200, q: .5, vol: .5, drive: 2, wet: .5 }); AX.crackle(H + 80, { n: 40, span: 1400, vol: .15, wet: .3 }); AX.clatter(H + 120, { n: 14, span: 900, vol: .12 }); },
};
/* 대사가 늘 보이게: 효과 캔버스에서 대사 둘레를 부드럽게 지운다(CUT.hole) */
function cutTick(t) {
  const c = CUT.cx, el = CUT.el; if (!c || !el) { CUT.raf = 0; return; } const dt = Math.min(40, t - (CUT.lastT || t)) / 16.7; CUT.lastT = t;
  const W = el.clientWidth, H = el.clientHeight; c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
  const now = performance.now(); CUT.J = CUT.J.filter(j => now < j.t0 + j.dur); for (const j of CUT.J) if (now >= j.t0) { c.save(); try { j.draw(c, (now - j.t0) / j.dur, { width: W, height: H }); } catch (e) { } c.restore(); }
  CUT.P = CUT.P.filter(p => (p.life -= dt) > 0);
  for (const p of CUT.P) { p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; const a = Math.max(0, Math.min(1, p.life / p.max)) * p.a;
    if (p.streak) { c.strokeStyle = 'rgba(' + p.c + ',' + a + ')'; c.lineWidth = p.s; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); c.stroke(); }
    else { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2.4); g.addColorStop(0, 'rgba(255,240,210,' + a + ')'); g.addColorStop(.35, 'rgba(' + p.c + ',' + a * .8 + ')'); g.addColorStop(1, 'rgba(' + p.c + ',0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.s * 2.4, 0, 6.283); c.fill(); } }
  const h = CUT.hole; if (h) { c.save(); c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 6; i++) { const pd = 22 - i * 4; c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.roundRect ? c.roundRect(h.x - pd, h.y - pd, h.w + pd * 2, h.h + pd * 2, 14) : c.rect(h.x - pd, h.y - pd, h.w + pd * 2, h.h + pd * 2); c.fill(); } c.restore(); }
  c.globalCompositeOperation = 'source-over'; CUT.raf = (CUT.P.length || CUT.J.length) ? requestAnimationFrame(cutTick) : 0; if (!CUT.raf) CUT.lastT = 0;
}
function cutHole() { const el = CUT.el; if (!el) { CUT.hole = null; return; } const r0 = el.getBoundingClientRect(), q = el.querySelector('.cu-layer.la .cu-q'), k = el.querySelector('.cu-layer.la .cu-skill'); if (!q) { CUT.hole = null; return; }
  const a = q.getBoundingClientRect(), b = k ? k.getBoundingClientRect() : a, l = Math.min(a.left, b.left), tp = Math.min(a.top, b.top), r = Math.max(a.right, b.right), bt = Math.max(a.bottom, b.bottom); CUT.hole = { x: l - r0.left, y: tp - r0.top, w: r - l, h: bt - tp }; }

/* ---- 공용 조각 ---- */
function cuLife(el, t, inMs, outMs, from, delay) { delay = delay || 0; const T = Math.max(1, t - delay), a = Math.min(.9, inMs / T), b = Math.max(a + .01, (T - outMs) / T);
  cutA(el, [{ opacity: 0, transform: from || 'none', easing: 'cubic-bezier(.1,.9,.2,1)' }, { opacity: 1, transform: 'none', offset: a }, { opacity: 1, transform: 'none', offset: b }, { opacity: 0, transform: 'none' }], { duration: T, delay, easing: 'linear' }); }
const cuOne = C => { C.lb.style.display = 'none'; };
const cuInk = (C, start, span, dur, L) => cutInk(L || C.la, start, span == null ? C.t * .3 : span, dur || 260);
function shakeAt(C, at, amp, dur, n) { if (!C.F) amp *= .5; const kf = [{ transform: 'none' }]; for (let i = 1; i < n; i++) { const k = 1 - i / n; kf.push({ transform: `translate(${(RR(-amp, amp) * k).toFixed(1)}px,${(RR(-amp, amp) * k).toFixed(1)}px)` }); } kf.push({ transform: 'none' });
  cutA(C.d.querySelector('.cu-stage'), kf, { duration: dur, delay: at, easing: 'linear' }); cutAt(at, () => { const f = fieldEl(); return f ? [[f, kf]] : []; }, { duration: dur, easing: 'linear' }); }
const meAt = (at, kf, o) => cutAt(at, () => { const m = vfxSelMe(); return m ? [[m, kf]] : []; }, o);
const ensAt = (at, f, o) => cutAt(at, () => cutEns().map((e, i, a) => [e, f(i, a.length)[0], f(i, a.length)[1]]), o);
/* 초승달 꼴 칼자국: 두 점 사이 휘어진 선, 가운데가 굵고 끝이 가늘다 */
function crescent(c, x0, y0, x1, y1, bend, prog, w, col, a) { if (prog <= 0 || a <= 0) return; const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, cx = mx - dy / L * bend, cy = my + dx / L * bend;
  const P = u => { const v = 1 - u; return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]; }, N = 28, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const u = prog * i / N, [px, py] = P(u), [qx, qy] = P(Math.min(1, u + .01)); let tx = qx - px, ty = qy - py; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; const ww = w * Math.sin(Math.PI * i / N) + .3; top.push([px - ty * ww, py + tx * ww]); bot.push([px + ty * ww, py - tx * ww]); }
  const path = () => { c.beginPath(); top.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]); c.closePath(); };
  c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 22; c.fillStyle = `rgba(${col},${a})`; path(); c.fill(); c.shadowBlur = 6; c.shadowColor = '#fff';
  const s = .32; top.length = 0; bot.length = 0; for (let i = 0; i <= N; i++) { const u = prog * i / N, [px, py] = P(u), [qx, qy] = P(Math.min(1, u + .01)); let tx = qx - px, ty = qy - py; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; const ww = w * s * Math.sin(Math.PI * i / N) + .2; top.push([px - ty * ww, py + tx * ww]); bot.push([px + ty * ww, py - tx * ww]); }
  c.fillStyle = `rgba(255,250,240,${a})`; path(); c.fill(); }
function slashJob(at, L, bend, w, col, dur) { cutJob(at, dur, (c, k) => { const g = Math.min(1, k / .3), f = k < .3 ? 1 : 1 - (k - .3) / .7; crescent(c, L[0], L[1], L[2], L[3], bend, eo(g), w * (.45 + .55 * f), col, f); }); }
/* 갈라지는 금: 한 점에서 사방으로 꺾이며 뻗는 선 */
function cracks(n, x, y, len, spread, base) { const out = []; for (let i = 0; i < n; i++) { let a = (base == null ? i / n * 6.283 : base + RR(-spread, spread)) + RR(-.2, .2), px = x, py = y; const pts = [[px, py]], seg = 6 + (Math.random() * 4 | 0), L = len * RR(.6, 1.1);
  for (let j = 0; j < seg; j++) { a += RR(-.5, .5); px += Math.cos(a) * L / seg; py += Math.sin(a) * L / seg; pts.push([px, py]); } out.push(pts); } return out; }
function drawCracks(c, list, prog, a, col, w) { c.lineCap = 'round'; c.lineJoin = 'round'; for (const pts of list) { const m = Math.max(1, Math.floor((pts.length - 1) * prog)); c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 10; c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = w;
  c.beginPath(); for (let i = 0; i <= m; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]); c.stroke(); c.shadowBlur = 0; c.strokeStyle = `rgba(255,255,255,${a * .85})`; c.lineWidth = Math.max(.6, w * .35); c.stroke(); } }
const ringJob = (at, dur, x, y, r1, sq, col, w) => cutJob(at, dur, (c, k) => { const r = 6 + r1 * eo(k); c.strokeStyle = `rgba(${col},${(1 - k) * .9})`; c.lineWidth = (w || 3) * (1 - k) + .5; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 12; c.beginPath(); c.ellipse(x, y, r, r * (sq || 1), 0, 0, 6.283); c.stroke(); });

/* ===== 승부수 18 ===== */
const CUT_SK = {
  /* ---------- 마검사 ---------- */
  sb_kalpa: { h: .5, scene: '피의 베기와 불의 베기가 X로 엇갈리고, 그 자국을 따라 불길이 솟는다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, y = C.yMid, sh = C.stage.h;
    cuLife(C.la, t, t * .14, 380, 'translateX(-40px) skewX(-8deg)'); cuInk(C, t * .14);
    const A = [W * .2, y - sh * .95, W * .8, y + sh * .95], B = [W * .8, y - sh * .95, W * .2, y + sh * .95];
    slashJob(H - 190, A, 46, 15, '235,60,50', 360); slashJob(H, B, -46, 17, '255,160,60', 380);
    cutLater(H + 80, () => cutSpawn(110, i => { const L = i % 2 ? A : B, u = RR(.1, .9); return { x: L[0] + (L[2] - L[0]) * u, y: L[1] + (L[3] - L[1]) * u, vx: RR(-.7, .7), vy: RR(-3.4, -1), g: -.04, drag: .97, life: RR(28, 64), max: 64, s: RR(1.4, 3.6), a: .95, c: Math.random() < .5 ? '255,130,50' : '220,45,40' }; }));
    cutJob(H + 60, t - H - 60, (c, k) => { const a = (1 - k) * .55; for (const L of [A, B]) { c.strokeStyle = `rgba(255,120,60,${a})`; c.lineWidth = 2.5; c.shadowColor = 'rgba(255,90,40,1)'; c.shadowBlur = 16; c.beginPath(); c.moveTo(L[0], L[1]); c.lineTo(L[2], L[3]); c.stroke(); } });
    shakeAt(C, H, 7, 320, 7); cutCard('blade', H, t, false); } },
  sb_sinwall: { h: .34, scene: '바닥에서 핏물이 차올라 벽이 되고, 다 차면 쿵 하고 굳으며 핏방울이 흘러내린다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, top = C.stage.t, sh = C.stage.h;
    cutA(C.la, [{ clipPath: 'inset(100% 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: H / t }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: (t - 380) / t }, { clipPath: 'inset(0 0 0 0)', opacity: 0 }], { duration: t, easing: 'linear' }); cuInk(C, H * .6, t * .26); /* M5-6: 핏물이 차오르는 동안 글자가 먼저 번진다(대사가 띠 길이의 절반 넘게) */
    cutJob(0, H + 260, (c, k) => { const ms = k * (H + 260), f = Math.min(1, ms / H), fade = ms > H ? 1 - (ms - H) / 260 : 1, yT = top + sh - sh * eo(f); c.globalCompositeOperation = 'source-over';
      const g = c.createLinearGradient(0, yT, 0, top + sh); g.addColorStop(0, `rgba(150,20,40,${.75 * fade})`); g.addColorStop(1, `rgba(60,5,15,${.85 * fade})`); c.fillStyle = g; c.beginPath(); c.moveTo(0, top + sh);
      for (let x = 0; x <= W + 12; x += 12) c.lineTo(x, yT + Math.sin(x * .045 + ms * .012) * 5 * (1 - f * .6)); c.lineTo(W, top + sh); c.closePath(); c.fill(); c.strokeStyle = `rgba(255,110,130,${.7 * fade})`; c.lineWidth = 1.5; c.beginPath();
      for (let x = 0; x <= W + 12; x += 12) { const yy = yT + Math.sin(x * .045 + ms * .012) * 5 * (1 - f * .6); x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); });
    ringJob(H, 560, W / 2, C.yMid, W * .45, .32, '194,58,82', 4);
    cutLater(H, () => cutSpawn(36, () => ({ x: RR(W * .1, W * .9), y: top + 2, vx: RR(-1.2, 1.2), vy: RR(-5, -2), g: .22, drag: .98, life: RR(24, 44), max: 44, s: RR(1.2, 2.4), a: 1, c: '210,40,60' })));
    for (let at = H + 120; at < t - 300; at += 110) cutLater(at, () => cutSpawn(3, () => ({ x: RR(W * .12, W * .88), y: top + sh - 2, vx: 0, vy: RR(.3, 1), g: .09, drag: .99, life: RR(30, 50), max: 50, s: RR(1.3, 2.2), a: .9, c: '190,30,50' })));
    shakeAt(C, H, 5, 300, 6); cutCard('guard', H, t, false); } },
  sb_firebody: { h: .2, game: 'arcane', scene: '게임 원본(마검사 시안 7판): 룬 고리 · 불기둥 · 떠오르는 룬 글자. 이 고리 글자 "유산의 불"은 이 승부수 것' },
  /* ---------- 파수꾼 ---------- */
  w_siege: { h: .28, /* M5-6: 맞물림 .4 → .28(대사가 띠 길이의 절반 넘게, 약하게 단계 포함) */ scene: '거대한 쇠망치가 위에서 떨어져 띠를 내리찍는다. 판이 흔들리고 금이 사방으로 가며 돌 조각이 튄다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, top = C.stage.t, sh = C.stage.h, ix = W / 2, iy = top + 4, col = C.col.join(',');
    cutJob(0, H + 140, (c, k) => { const ms = k * (H + 140), f = Math.min(1, ms / H), e = ei(f), by = -70 + (iy + 6 + 70) * e, a = ms > H ? 1 - (ms - H) / 140 : 1; c.globalCompositeOperation = 'source-over';
      for (let i = 4; i >= 1; i--) { const ty = by - i * 26 * e; c.fillStyle = `rgba(150,165,185,${.07 * a * f})`; c.fillRect(ix - 74, ty - 66, 148, 66); }
      c.fillStyle = `rgba(52,40,30,${a})`; c.fillRect(ix - 8, by - 66 - 170, 16, 172); const g = c.createLinearGradient(0, by - 66, 0, by); g.addColorStop(0, `rgba(120,132,150,${a})`); g.addColorStop(.5, `rgba(70,78,92,${a})`); g.addColorStop(1, `rgba(36,40,48,${a})`);
      c.fillStyle = g; c.fillRect(ix - 78, by - 66, 156, 66); c.strokeStyle = `rgba(${col},${.9 * a})`; c.lineWidth = 2; c.strokeRect(ix - 78, by - 66, 156, 66); c.fillStyle = `rgba(30,32,38,${a})`; c.fillRect(ix - 84, by - 50, 8, 34); c.fillRect(ix + 76, by - 50, 8, 34); });
    cutA(C.la, [{ opacity: 0, transform: 'translateY(-30px) scaleY(1.25)', easing: 'cubic-bezier(.2,.9,.3,1)' }, { opacity: 1, transform: 'translateY(5px) scaleY(.9)', offset: .07, easing: 'cubic-bezier(.2,.9,.3,1)' }, { opacity: 1, transform: 'none', offset: .18 }, { opacity: 1, transform: 'none', offset: .92 }, { opacity: 0, transform: 'none' }], { duration: t - H, delay: H, easing: 'linear' }); /* M5-6: 늦춤 곡선을 칸마다(전체에 걸면 대사가 띠 길이의 24%만 보였다) */ cuInk(C, H, 110, 140);
    const cr = cracks(11, ix, iy + 4, Math.max(W, C.rc.h) * .55, 1.3, Math.PI / 2); cutJob(H, t - H, (c, k) => drawCracks(c, cr, eo(Math.min(1, k / .2)), (k < .6 ? .7 : .7 * (1 - (k - .6) / .4)), '200,215,235', 1.8));
    const rocks = Array.from({ length: 30 }, () => ({ x: ix + RR(-40, 40), vx: RR(-9, 9), vy: RR(-12, -3), s: RR(4, 11), r: RR(0, 6), vr: RR(-.3, .3) }));
    cutJob(H, t - H, (c, k) => { const T = k * (t - H) / 16.7; c.globalCompositeOperation = 'source-over'; const a = k < .7 ? 1 : 1 - (k - .7) / .3; for (const p of rocks) { const x = p.x + p.vx * T * .9, y = iy + p.vy * T + .5 * .45 * T * T; if (y > C.rc.h + 20) continue; c.save(); c.translate(x, y); c.rotate(p.r + p.vr * T);
      c.fillStyle = `rgba(78,74,68,${a})`; c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .8); c.strokeStyle = `rgba(190,185,170,${a * .7})`; c.lineWidth = 1; c.strokeRect(-p.s / 2, -p.s / 2, p.s, p.s * .8); c.restore(); } });
    cutJob(H, 700, (c, k) => { c.globalCompositeOperation = 'source-over'; c.strokeStyle = `rgba(200,190,170,${.5 * (1 - k)})`; c.lineWidth = 10 * (1 - k) + 1; c.beginPath(); c.ellipse(ix, iy + 8, 20 + W * .62 * eo(k), (20 + W * .62 * eo(k)) * .14, 0, 0, 6.283); c.stroke(); });
    cutLater(H, () => cutSpawn(46, () => { const a = RR(-Math.PI, 0); return { x: ix + RR(-30, 30), y: iy, vx: Math.cos(a) * RR(3, 10), vy: Math.sin(a) * RR(3, 9), g: .25, drag: .95, life: RR(16, 34), max: 34, s: RR(1, 2), a: 1, c: Math.random() < .5 ? '255,230,180' : col, streak: true }; }));
    shakeAt(C, H, 14, 560, 11);
    meAt(H - 300, [{ transform: 'none' }, { transform: 'translateY(-20px) scale(1.04)', offset: .55 }, { transform: 'translateY(6px) scale(1.03,.92)', offset: .62 }, { transform: 'translateY(1px)', offset: .8 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.5,0,.5,1)' });
    ensAt(H, (i, n) => [[{ transform: 'none' }, { transform: `translateY(12px) rotate(${i % 2 ? 4 : -4}deg) scale(.96)`, offset: .2 }, { transform: 'translateY(3px)', offset: .6 }, { transform: 'none' }], {}], { duration: 520, easing: 'ease-out' }); } },
  s_quake: { h: .56, len: 1.12, scene: '땅이 세 번 울리며 판 아래로 금이 번지고, 마지막에 바위 가시가 왼쪽부터 차례로 솟아 적 줄을 들어 올린다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, top = C.stage.t, sh = C.stage.h, gy = top + sh + 6, col = C.col.join(',');
    cuLife(C.la, t, 220, 380); cuInk(C, t * .06, t * .3);
    const T1 = Math.round(t * .14), T2 = Math.round(t * .33); [[T1, 4, .3], [T2, 7, .6], [H, 12, 1]].forEach(([at, amp, len], i) => { shakeAt(C, at, amp, 340, 8); });
    const crack = (() => { const p = [[-10, gy]]; let x = -10; while (x < W + 10) { x += RR(14, 30); p.push([x, gy + RR(-6, 6)]); } return p; })();
    cutJob(T1, t - T1, (c, k) => { const ms = T1 + k * (t - T1), len = ms < T2 ? .3 : ms < H ? .62 : 1, a = k > .85 ? (1 - k) / .15 : 1, m = crack.filter(p => p[0] <= W * len); c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = 2.4; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 12; c.beginPath(); m.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.strokeStyle = `rgba(255,240,210,${a * .8})`; c.lineWidth = .8; c.stroke(); });
    const sp = Array.from({ length: 11 }, (_, i) => ({ x: W * (i + .5) / 11 + RR(-10, 10), w: RR(26, 48), h: RR(50, 104) * (C.F ? 1 : .6), d: i * 38 }));
    cutJob(H, t - H, (c, k) => { const ms = k * (t - H), out = t - H - 360; c.globalCompositeOperation = 'source-over'; for (const s of sp) { if (ms < s.d) continue; const up = eo(Math.min(1, (ms - s.d) / 140)), dn = ms > out ? 1 - (ms - out) / 360 : 1, h = s.h * up * dn; if (h < 1) continue;
      const g = c.createLinearGradient(0, gy - h, 0, gy); g.addColorStop(0, 'rgba(120,96,70,1)'); g.addColorStop(1, 'rgba(48,36,26,1)'); c.fillStyle = g; c.beginPath(); c.moveTo(s.x - s.w / 2, gy); c.lineTo(s.x - s.w * .1, gy - h); c.lineTo(s.x + s.w * .12, gy - h * .9); c.lineTo(s.x + s.w / 2, gy); c.closePath(); c.fill(); c.strokeStyle = `rgba(${col},.95)`; c.lineWidth = 1.5; c.stroke(); } });
    sp.forEach(s => cutLater(H + s.d, () => cutSpawn(6, () => ({ x: s.x + RR(-8, 8), y: gy - 4, vx: RR(-2, 2), vy: RR(-4, -1.5), g: .18, drag: .96, life: RR(18, 34), max: 34, s: RR(1.5, 3), a: .8, c: '200,170,120' }))));
    ensAt(H + 60, (i) => [[{ transform: 'none' }, { transform: 'translateY(-18px) rotate(-2deg)', offset: .3 }, { transform: 'translateY(-8px)', offset: .6 }, { transform: 'none' }], { delay: i * 110 }], { duration: 620, easing: 'ease-out' });
    meAt(H - 120, [{ transform: 'none' }, { transform: 'translateY(-6px)', offset: .3 }, { transform: 'translateY(4px) scale(1.02,.96)', offset: .45 }, { transform: 'none' }], { duration: 420 }); } },
  w_valor: { h: .16, game: 'guard', scene: '게임 원본(죄인의 벽에서 옮김): 양쪽에서 성문이 닫히고 육각 방패 결이 번진다. 방벽에 맞는 꼴이라 그대로' },
  /* ---------- 수도승 ---------- */
  m_yeokcheon: { h: .4, scene: '오른쪽에서 날아든 검붉은 일격을 한가운데에서 받아 파문이 번지고, 그 힘이 주황빛으로 되돌아 날아간다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, y = C.yMid, col = C.col.join(',');
    cuLife(C.la, t, 200, 380); cuInk(C, t * .06, t * .26); const cx = W / 2;
    cutJob(H - 230, 230, (c, k) => { const hx = W + 40 - (W + 40 - cx - 18) * ei(k), g = c.createLinearGradient(hx, 0, hx + 220, 0); g.addColorStop(0, 'rgba(230,60,50,.95)'); g.addColorStop(1, 'rgba(120,20,20,0)'); c.strokeStyle = g; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, y); c.lineTo(hx + 220, y); c.stroke(); });
    [0, 70, 140, 210].forEach((dl, i) => ringJob(H + dl, 620, cx, y, W * (.5 - i * .06), .36, col, 4 - i * .6));
    cutJob(H + 90, 420, (c, k) => { const g0 = Math.min(1, k / .4), a = k < .4 ? 1 : 1 - (k - .4) / .6, x1 = cx + (W + 40 - cx) * eo(g0); c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 20; c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = 16 * a + 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, y); c.lineTo(x1, y); c.stroke(); c.strokeStyle = `rgba(255,245,225,${a})`; c.lineWidth = 4 * a + 1; c.stroke(); });
    cutLater(H + 90, () => cutSpawn(40, () => ({ x: cx + RR(0, 30), y: y + RR(-14, 14), vx: RR(8, 16), vy: RR(-1.5, 1.5), g: 0, drag: .93, life: RR(14, 28), max: 28, s: RR(1, 2), a: 1, c: Math.random() < .4 ? '255,240,210' : col, streak: true })));
    cutA(C.la.querySelector('.cu-txt'), [{ transform: 'none' }, { transform: 'translateX(-10px) scale(.97)', offset: .25 }, { transform: 'translateX(16px) scale(1.03)', offset: .5 }, { transform: 'none' }], { duration: 420, delay: H, easing: 'ease-out' });
    meAt(H - 140, [{ transform: 'none' }, { transform: 'translateX(5px) scale(.97)', offset: .35 }, { transform: 'translateY(-8px) scale(1.05)', offset: .55 }, { transform: 'none' }], { duration: 480 });
    ensAt(H + 140, (i) => [[{ transform: 'none' }, { transform: 'translateX(18px) rotate(4deg)', offset: .3 }, { transform: 'translateX(4px)', offset: .7 }, { transform: 'none' }], { delay: i * 40 }], { duration: 480, easing: 'ease-out' }); } },
  m_cheonmang: { h: .26, scene: '금빛 경락 선이 점과 점을 이어 판 전체에 그물을 짜고, 다 짜이면 적들 쪽으로 조여든다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, top = C.stage.t, sh = C.stage.h, col = C.col.join(',');
    cutA(C.la, [{ clipPath: 'inset(100% 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: H / t }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: (t - 400) / t }, { clipPath: 'inset(0 0 0 0)', opacity: 0 }], { duration: t, easing: 'linear' }); cuInk(C, H * .7, t * .36, 320);
    const ens = ensOf(C), nodes = Array.from({ length: C.F ? 26 : 16 }, () => ({ x: RR(W * .04, W * .96), y: C.F ? RR(10, C.rc.h - 10) : RR(top - 10, top + sh + 10) })); const E = [];
    nodes.forEach((n, i) => { const d = nodes.map((m, j) => [Math.hypot(m.x - n.x, m.y - n.y), j]).sort((a, b) => a[0] - b[0]).slice(1, 3); d.forEach(([, j]) => { if (j > i) E.push([i, j]); }); n.e = ens.length ? ens.reduce((b, e) => Math.hypot(e.x - n.x, e.y - n.y) < Math.hypot(b.x - n.x, b.y - n.y) ? e : b) : n; });
    cutJob(0, t, (c, k) => { const pull = k > .58 ? eo((k - .58) / .3) * .32 : 0, a = k > .86 ? (1 - k) / .14 : 1, P = n => [n.x + (n.e.x - n.x) * pull, n.y + (n.e.y - n.y) * pull]; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 10; c.lineWidth = 1.3;
      E.forEach(([i, j], q) => { const s = q / E.length * .45, g = Math.min(1, Math.max(0, (k - s) / .12)); if (!g) return; const [x0, y0] = P(nodes[i]), [x1, y1] = P(nodes[j]); c.strokeStyle = `rgba(${col},${.7 * a})`; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + (x1 - x0) * g, y0 + (y1 - y0) * g); c.stroke(); });
      nodes.forEach((n, i) => { const s = i / nodes.length * .45; if (k < s) return; const [x, y] = P(n), pulse = 1 + Math.sin((k - s) * 40) * .3; c.fillStyle = `rgba(255,240,200,${a})`; c.beginPath(); c.arc(x, y, 2.4 * pulse, 0, 6.283); c.fill(); });
      if (pull) ens.forEach(e => { c.strokeStyle = `rgba(${col},${.5 * a})`; c.beginPath(); c.arc(e.x, e.y, 30 * (1 - pull) + 8, 0, 6.283); c.stroke(); }); });
    ensAt(Math.round(t * .62), (i) => [[{ transform: 'none' }, { transform: 'translateX(-2px)', offset: .25 }, { transform: 'translateX(2px)', offset: .5 }, { transform: 'translateX(-1px)', offset: .75 }, { transform: 'none' }], { delay: i * 50 }], { duration: 360 }); } },
  m_ilji: { h: .48, veil: 'radial-gradient(ellipse at center,rgba(0,0,0,.5),rgba(0,0,0,.86))', scene: '어둠 속 하얀 점 하나. 바늘 같은 빛이 꿰뚫고, 한 박자 쉰 뒤 그 점에서부터 금이 가며 안쪽부터 무너진다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, y = C.yMid, x = W / 2, D = H + 280;
    cuLife(C.la, t, 400, 360); cuInk(C, t * .12, t * .26, 400);
    cutJob(0, D + 80, (c, k) => { const ms = k * (D + 80), r = Math.min(3.2, ms / 180), pulse = 1 + Math.sin(ms * .02) * .25, a = ms > D ? 1 - (ms - D) / 80 : 1; const g = c.createRadialGradient(x, y, 0, x, y, 26 * pulse); g.addColorStop(0, `rgba(255,255,255,${.9 * a})`); g.addColorStop(.25, `rgba(220,235,255,${.35 * a})`); g.addColorStop(1, 'rgba(220,235,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 26 * pulse, 0, 6.283); c.fill(); c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); });
    cutJob(H, 200, (c, k) => { const a = 1 - k; c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.2; c.shadowColor = '#fff'; c.shadowBlur = 8; c.beginPath(); c.moveTo(x, y - C.stage.h * 1.4); c.lineTo(x, y + C.stage.h * 1.4); c.stroke(); });
    const cr = cracks(16, x, y, Math.max(W * .55, 200), 0); cutJob(D, t - D, (c, k) => drawCracks(c, cr, eo(Math.min(1, k / .3)), k < .7 ? 1 : 1 - (k - .7) / .3, '232,238,245', 1.4));
    cutLater(D, () => cutSpawn(60, () => { const a = RR(0, 6.283), s = RR(1.5, 6); return { x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: .16, drag: .95, life: RR(20, 46), max: 46, s: RR(1, 2), a: 1, c: '235,242,250', streak: true }; }));
    shakeAt(C, D, 6, 380, 7); cutA(C.la.querySelector('.cu-txt'), [{ transform: 'none', filter: 'none' }, { transform: 'scale(1.03)', filter: 'blur(1px)', offset: .2 }, { transform: 'none', filter: 'none' }], { duration: 300, delay: D });
    ensAt(D + 40, (i, n) => [[{ transform: 'none' }, i === (n >> 1) ? { transform: 'translateY(8px) scale(.9)', offset: .3 } : { transform: 'translateY(2px)', offset: .3 }, { transform: 'none' }], {}], { duration: 520, easing: 'ease-out' }); } },
  /* ---------- 암살자 ---------- */
  a_mandok: { h: .5, scene: '적들 몸에서 독의 실이 뽑혀 한 점에 모이고, 거기서 보랏빛 · 푸른빛 꽃이 피어 터진다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, P = { x: W / 2, y: C.yMid };
    cuLife(C.la, t, 260, 380); cuInk(C, t * .1, t * .3);
    const src = ensOf(C).concat(C.F ? [{ x: 8, y: C.rc.h * .3 }, { x: W - 8, y: C.rc.h * .7 }, { x: W * .2, y: C.rc.h - 8 }] : []);
    cutJob(0, H + 120, (c, k) => { const ms = k * (H + 120), g = Math.min(1, ms / H), a = ms > H ? 1 - (ms - H) / 120 : 1; src.forEach((s, i) => { const colr = i % 2 ? '170,110,225' : '150,205,90'; c.strokeStyle = `rgba(${colr},${.8 * a})`; c.lineWidth = 1.8; c.shadowColor = `rgba(${colr},1)`; c.shadowBlur = 8; c.beginPath();
      for (let j = 0; j <= 30; j++) { const u = j / 30 * eo(g), xx = s.x + (P.x - s.x) * u, yy = s.y + (P.y - s.y) * u + Math.sin(u * 12 + ms * .01 + i) * 7 * (1 - u); j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      for (let d = 0; d < 3; d++) { const u = ((ms / 600) + d / 3) % 1 * g, xx = s.x + (P.x - s.x) * u, yy = s.y + (P.y - s.y) * u; c.fillStyle = `rgba(${colr},${a})`; c.beginPath(); c.arc(xx, yy, 2.2, 0, 6.283); c.fill(); } }); });
    const N = 11; cutJob(H, t - H, (c, k) => { const r = C.stage.h * 1.15 * eo(Math.min(1, k / .35)), a = 1 - k * k; for (let i = 0; i < N; i++) { const ang = i / N * 6.283 + k * .6; c.save(); c.translate(P.x + Math.cos(ang) * r * .45, P.y + Math.sin(ang) * r * .45 * .8); c.rotate(ang);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r * .55 + 1); g.addColorStop(0, `rgba(230,200,255,${.55 * a})`); g.addColorStop(.5, `rgba(${i % 2 ? '170,110,225' : '150,205,90'},${.4 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r * .55 + 1, r * .18 + 1, 0, 0, 6.283); c.fill(); c.restore(); } });
    cutLater(H, () => cutSpawn(70, () => { const a = RR(0, 6.283), s = RR(1, 5); return { x: P.x, y: P.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .8, g: -.01, drag: .965, life: RR(40, 80), max: 80, s: RR(1.4, 3), a: .9, c: Math.random() < .5 ? '170,110,225' : '150,205,90' }; }));
    ensAt(H, (i) => [[{ transform: 'none' }, { transform: 'scale(.97) translateY(2px)', offset: .3 }, { transform: 'none' }], { delay: i * 60 }], { duration: 420 }); } },
  a_muyeong: { h: .3, veil: 'radial-gradient(ellipse at center,rgba(0,0,0,.55),rgba(0,0,0,.9))', scene: '내 카드가 어둠에 녹아 사라지고, 고요 뒤 적 하나의 등 뒤에서 한 줄기 칼빛이 번쩍인다. 대사는 그 칼자국으로 드러난다', run(C) { cuOne(C); const { t, hitAt: H } = C;
    cuLife(C.la, t, 60, 200, 'none', H) /* M5-6: 대사가 띠 길이의 절반 넘게(꼬리 360 → 200ms, 맞물림 .46 → .3) */; cuInk(C, H + 20, 150, 160);
    meAt(0, [{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'blur(6px)', offset: .12 }, { opacity: 0, filter: 'blur(6px)', offset: .82 }, { opacity: 1, filter: 'none' }], { duration: t, easing: 'ease-in-out' });
    cutLater(60, () => { const m = vfxSelMe(); if (!m) return; const p = relOf(m, C); cutSpawn(40, () => ({ x: p.x + RR(-p.w / 2, p.w / 2), y: p.y + RR(-20, 20), vx: RR(-1, 1), vy: RR(-1.6, -.3), g: -.01, drag: .97, life: RR(30, 60), max: 60, s: RR(2, 4), a: .5, c: '120,100,170' })); });
    const ens = ensOf(C), e = ens[ens.length >> 1] || { x: C.rc.w / 2, y: C.stage.t - 40, w: 120, h: 70 };
    slashJob(H, [e.x - e.w * .75, e.y + e.h * .7, e.x + e.w * .75, e.y - e.h * .7], 30, 11, '200,185,255', 300);
    cutJob(H + 70, 260, (c, k) => { c.strokeStyle = `rgba(255,255,255,${(1 - k) * .9})`; c.lineWidth = 1; c.beginPath(); c.moveTo(e.x - e.w, e.y + e.h * .2); c.lineTo(e.x + e.w, e.y - e.h * .2); c.stroke(); });
    cutLater(H + 60, () => cutSpawn(50, () => ({ x: e.x + RR(-20, 20), y: e.y + RR(-12, 12), vx: RR(-3, 3), vy: RR(-2, 2), g: .02, drag: .95, life: RR(26, 52), max: 52, s: RR(2, 4), a: .8, c: '150,110,230' })));
    cutAt(H + 30, () => { const el = cutEns()[cutEns().length >> 1]; return el ? [[el, [{ transform: 'none', filter: 'none' }, { transform: 'translate(-8px,4px) rotate(-5deg)', filter: 'brightness(1.6)', offset: .15 }, { transform: 'translate(-3px,2px)', filter: 'none', offset: .5 }, { transform: 'none', filter: 'none' }]]] : []; }, { duration: 520, easing: 'ease-out' }); } },
  a_janyeong: { h: .3, scene: '검은 잔상이 좌우로 갈라지며 여러 번 겹쳐 보이고, 그림자 칼자국 여럿이 빠르게 엇갈린다', run(C) { cuOne(C); const { t, hitAt: H } = C;
    cuLife(C.la, t, t * .12, 380, 'translateX(30px) skewX(8deg)'); cuInk(C, t * .12, t * .26);
    const gr = C.d.querySelector('.cu-ghost.r'), gb = C.d.querySelector('.cu-ghost.b'); gr.querySelector('.cu-q').style.color = 'rgba(170,170,205,.22)'; gb.querySelector('.cu-q').style.color = 'rgba(120,120,160,.2)';
    const kf = s => [{ opacity: 0, transform: 'none' }, { opacity: 1, transform: `translateX(${s * 46}px)`, offset: .2 }, { opacity: .5, transform: `translateX(${s * 30}px)`, offset: .45 }, { opacity: .8, transform: `translateX(${s * 58}px)`, offset: .62 }, { opacity: .4, transform: `translateX(${s * 40}px)`, offset: .8 }, { opacity: 0, transform: `translateX(${s * 70}px)` }];
    cutA(gr, kf(-1), { duration: t - H - 200, delay: H }); cutA(gb, kf(1), { duration: t - H - 200, delay: H + 40 });
    const ens = ensOf(C); for (let i = 0; i < 8; i++) { const e = ens[i % Math.max(1, ens.length)] || { x: C.rc.w / 2, y: C.yMid }, ang = RR(0, 3.14), L = RR(70, 120), at = H + i * 85;
      slashJob(at, [e.x - Math.cos(ang) * L, e.y - Math.sin(ang) * L, e.x + Math.cos(ang) * L, e.y + Math.sin(ang) * L], RR(-30, 30), 7, '160,160,200', 220); }
    cutJob(H, t - H, (c, k) => { c.globalCompositeOperation = 'source-over'; for (let i = 0; i < 9; i++) { const e = ens[i % Math.max(1, ens.length)] || { x: C.rc.w / 2, y: C.yMid }, a = (1 - k) * .35; c.fillStyle = `rgba(8,8,14,${a})`; c.beginPath(); c.arc(e.x + Math.sin(i * 7) * 40, e.y + Math.cos(i * 3) * 20 - k * 20, 14 + k * 26, 0, 6.283); c.fill(); } });
    meAt(H, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-16px)', opacity: .5, offset: .15 }, { transform: 'translateX(14px)', opacity: .6, offset: .32 }, { transform: 'translateX(-10px)', opacity: .5, offset: .5 }, { transform: 'translateX(8px)', opacity: .7, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 820, easing: 'linear' });
    ensAt(H + 60, (i) => [[{ transform: 'none' }, { transform: 'translateX(4px)', offset: .2 }, { transform: 'translateX(-4px)', offset: .45 }, { transform: 'translateX(3px)', offset: .7 }, { transform: 'none' }], { delay: i * 70 }], { duration: 600 }); } },
  /* ---------- 사냥꾼 ---------- */
  h5_mangung: { h: .58, scene: '왼쪽에서 활이 끝까지 휘며 시위가 당겨지고, 놓는 순간 화살이 "슝" 하고 판을 가로질러 빛의 꼬리를 남긴다. 대사는 화살이 지나간 자리부터 드러난다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, y = C.yMid, bx = Math.max(56, W * .1), col = C.col.join(',');
    cuLife(C.la, t, 260, 380); cuInk(C, t * .1, t * .28); cutA(C.la.querySelector('.cu-q'), [{ textShadow: '0 0 16px var(--glow),0 0 3px #000' }, { textShadow: '0 0 30px #fff,0 0 3px #000', offset: .2 }, { textShadow: '0 0 16px var(--glow),0 0 3px #000' }], { duration: 520, delay: H + 60 });
    cutJob(0, H + 360, (c, k) => { const ms = k * (H + 360), pull = ms < H ? eo(ms / H) : 0, after = ms > H ? (ms - H) / 360 : 0, a = after ? 1 - after : Math.min(1, ms / 160), vib = after ? Math.sin(after * 60) * 6 * (1 - after) : 0, bend = 26 + pull * 22;
      c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = 3.4; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 12; c.beginPath(); c.moveTo(bx, y - 64); c.quadraticCurveTo(bx + bend, y, bx, y + 64); c.stroke();
      const nx = bx - pull * 44 + vib; c.strokeStyle = `rgba(255,250,235,${a * .9})`; c.lineWidth = 1; c.shadowBlur = 0; c.beginPath(); c.moveTo(bx, y - 64); c.lineTo(nx, y); c.lineTo(bx, y + 64); c.stroke();
      if (!after) { c.strokeStyle = `rgba(255,250,235,${a})`; c.lineWidth = 2; c.beginPath(); c.moveTo(nx, y); c.lineTo(nx + 96, y); c.stroke(); const gl = c.createRadialGradient(nx + 96, y, 0, nx + 96, y, 10 + pull * 18); gl.addColorStop(0, `rgba(255,255,240,${pull})`); gl.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gl; c.beginPath(); c.arc(nx + 96, y, 10 + pull * 18, 0, 6.283); c.fill(); } });
    const fly = 150; cutJob(H, fly + 620, (c, k) => { const ms = k * (fly + 620), hx = bx + 50 + (W + 60 - bx - 50) * Math.min(1, ms / fly), fade = ms > fly ? 1 - (ms - fly) / 620 : 1, g = c.createLinearGradient(bx, 0, hx, 0); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.7, `rgba(${col},${.55 * fade})`); g.addColorStop(1, `rgba(255,255,245,${fade})`);
      c.strokeStyle = g; c.lineWidth = 2 + 5 * fade; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 16; c.beginPath(); c.moveTo(bx, y); c.lineTo(hx, y); c.stroke(); if (ms < fly) { c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(hx + 12, y); c.lineTo(hx - 6, y - 6); c.lineTo(hx - 6, y + 6); c.closePath(); c.fill(); }
      for (let i = 1; i <= 3; i++) { const rx = bx + (W - bx) * i / 4; if (hx > rx && fade > 0) { c.strokeStyle = `rgba(255,255,255,${.25 * fade})`; c.lineWidth = 1; c.beginPath(); c.ellipse(rx, y, 4 + (1 - fade) * 10, 14 + (1 - fade) * 22, 0, 0, 6.283); c.stroke(); } } });
    ringJob(H + fly, 420, W - 14, y, 60, 1, col, 3); cutLater(H + fly, () => cutSpawn(26, () => ({ x: W - 10, y: y + RR(-6, 6), vx: RR(-8, -2), vy: RR(-4, 4), g: .1, drag: .93, life: RR(14, 30), max: 30, s: RR(1, 2), a: 1, c: '255,245,220', streak: true })));
    meAt(0, [{ transform: 'none' }, { transform: 'translateX(-8px) scale(.98)', offset: H / t * .95 }, { transform: 'translateX(6px)', offset: H / t + .04 }, { transform: 'none', offset: H / t + .2 }, { transform: 'none' }], { duration: t, easing: 'ease-out' });
    ensAt(H + fly - 20, (i) => [[{ transform: 'none' }, { transform: 'translateX(10px) rotate(2deg)', offset: .25 }, { transform: 'none' }], { delay: i * 25 }], { duration: 380 }); } },
  h5_gale: { h: .16, len: 1.1, scene: '띠가 바람처럼 미끄러져 들어오고, 바람 줄기를 타고 화살 다발이 세 번 판을 가로질러 쏟아진다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, Hh = C.rc.h, col = C.col.join(',');
    cuLife(C.la, t, t * .1, 380, 'translateX(-70px) skewX(-14deg)'); cuInk(C, t * .08, t * .2, 180);
    const winds = Array.from({ length: 8 }, () => ({ y: RR(10, Hh - 10), amp: RR(6, 18), ph: RR(0, 6), sp: RR(.8, 1.3) }));
    cutJob(0, t, (c, k) => { const a = Math.sin(Math.PI * k) * .3; c.lineWidth = 1.2; for (const w of winds) { const x0 = -W * .3 + (W * 1.6) * ((k * w.sp) % 1); c.strokeStyle = `rgba(220,250,245,${a})`; c.beginPath(); for (let x = 0; x <= 220; x += 10) { const yy = w.y + Math.sin((x + k * 400) * .03 + w.ph) * w.amp; x ? c.lineTo(x0 + x, yy) : c.moveTo(x0 + x, yy); } c.stroke(); } });
    const waves = [H, H + Math.round(t * .22), H + Math.round(t * .44)]; let wh = 0;
    waves.forEach((at, wi) => { for (let i = 0; i < (C.F ? 11 : 7); i++) { const y0 = RR(8, Hh - 20), dl = at + RR(0, 140), sp = RR(.9, 1.2), ang = RR(.04, .12);
      cutJob(dl, 300, (c, k) => { const hx = -60 + (W + 160) * k * sp, hy = y0 + hx * ang, a = k > .8 ? (1 - k) / .2 : 1; c.strokeStyle = `rgba(${col},${.8 * a})`; c.lineWidth = 2; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 8; c.beginPath(); c.moveTo(hx - 70, hy - 70 * ang); c.lineTo(hx, hy); c.stroke(); c.fillStyle = `rgba(255,255,250,${a})`; c.beginPath(); c.moveTo(hx + 9, hy + 9 * ang); c.lineTo(hx - 4, hy - 4); c.lineTo(hx - 4, hy + 4); c.closePath(); c.fill(); });
      }
      ensAt(at + 150, (i) => [[{ transform: 'none' }, { transform: `translate(${RR(4, 9).toFixed(0)}px,${RR(-3, 3).toFixed(0)}px)`, offset: .3 }, { transform: 'none' }], { delay: i * 30 }], { duration: 260 }); });
    meAt(H, [{ transform: 'none' }, { transform: 'translateX(-12px)', offset: .2 }, { transform: 'translateX(10px)', offset: .45 }, { transform: 'translateX(-8px)', offset: .7 }, { transform: 'none' }], { duration: t * .6 }); } },
  h5_trap: { h: .42, scene: '두근거리는 심장 소리와 함께 붉은 덫 무늬가 바닥에 번지고, 위아래 이빨이 철컥 맞물린다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, x = W / 2, y = C.yMid, col = C.col.join(',');
    cuLife(C.la, t, 240, 380); cuInk(C, t * .08, t * .28);
    cutJob(0, t, (c, k) => { const ms = k * t, g = eo(Math.min(1, ms / H)), a = k > .85 ? (1 - k) / .15 : 1, R1 = W * .42 * g, sq = .3, pulse = 1 + Math.sin(ms * .012) * .02; c.shadowColor = `rgba(${col},1)`; c.shadowBlur = 10; c.strokeStyle = `rgba(${col},${.85 * a})`; c.lineWidth = 1.6;
      c.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * 6.283, rr = R1 * pulse * (i % 2 ? .92 : 1.04); i ? c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * sq) : c.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * sq); } c.closePath(); c.stroke();
      [.72, .46].forEach(f => { c.beginPath(); c.ellipse(x, y, R1 * f, R1 * f * sq, 0, 0, 6.283); c.stroke(); }); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + ms * .0004; c.beginPath(); c.moveTo(x + Math.cos(an) * R1 * .46, y + Math.sin(an) * R1 * .46 * sq); c.lineTo(x + Math.cos(an) * R1 * .72, y + Math.sin(an) * R1 * .72 * sq); c.stroke(); } });
    const jaw = (c, k, dir) => { const gap = 70 * (1 - eo(k)), yy = y + dir * gap, w = W * .36; c.fillStyle = 'rgba(230,220,210,.95)'; c.strokeStyle = `rgba(${col},1)`; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w, yy - dir * 10); c.quadraticCurveTo(x, yy - dir * 34, x + w, yy - dir * 10); c.stroke();
      for (let i = 0; i < 9; i++) { const tx = x - w * .8 + w * 1.6 * i / 8; c.beginPath(); c.moveTo(tx - 7, yy - dir * 12); c.lineTo(tx, yy + dir * 6); c.lineTo(tx + 7, yy - dir * 12); c.closePath(); c.fill(); } };
    cutJob(H - 110, 110 + 520, (c, k) => { const ms = k * 630, kk = Math.min(1, ms / 110), a = ms > 110 ? 1 - (ms - 110) / 520 : 1; c.globalAlpha = a; jaw(c, kk, -1); jaw(c, kk, 1); c.globalAlpha = 1; });
    ringJob(H, 480, x, y, W * .3, .3, col, 3); cutLater(H, () => cutSpawn(30, () => ({ x: x + RR(-W * .3, W * .3), y: y + RR(-4, 4), vx: RR(-1, 1), vy: RR(-4, -1), g: .2, drag: .97, life: RR(22, 40), max: 40, s: RR(1.2, 2.4), a: 1, c: '200,30,45' })));
    ensAt(H + 50, (i) => [[{ transform: 'none', filter: 'none' }, { transform: 'translate(-3px,3px)', filter: 'saturate(.4) brightness(.8)', offset: .1 }, { transform: 'translate(2px,3px)', filter: 'saturate(.4) brightness(.8)', offset: .2 }, { transform: 'translateY(3px)', filter: 'saturate(.4) brightness(.8)', offset: .85 }, { transform: 'none', filter: 'none' }], {}], { duration: t - H - 100 }); } },
  /* ---------- 원소술사 ---------- */
  e5_avatar: { h: .5, len: 1.1, scene: '불의 구슬과 얼음의 구슬이 대사를 감싸고 점점 빠르게 돌다가, 한가운데에서 하나로 부딪혀 열충격이 터진다. 불티와 얼음 조각이 함께 흩어지고 증기가 피어오른다', run(C) { const { t, hitAt: H } = C, W = C.rc.w, y = C.yMid, cx = W / 2, la = C.la, lb = C.lb;
    la.style.clipPath = 'inset(0 50% 0 0)'; lb.style.clipPath = 'inset(0 0 0 50%)'; la.style.setProperty('--edge', 'rgb(255,140,70)'); la.style.setProperty('--glow', 'rgba(255,110,50,.85)'); la.style.setProperty('--band', 'rgba(70,24,8,.93)'); lb.style.setProperty('--edge', 'rgb(150,210,255)'); lb.style.setProperty('--glow', 'rgba(120,190,255,.85)'); lb.style.setProperty('--band', 'rgba(10,30,60,.93)');
    cuLife(la, t, H * .5, 380, 'translateX(-70px)'); cuLife(lb, t, H * .5, 380, 'translateX(70px)'); cuInk(C, H * .35, t * .3, 280, la); cuInk(C, H * .35, t * .3, 280, lb);
    const rx = Math.min(W * .4, 330), ry = C.stage.h * .78, pos = (k, ph) => { const sp = 6.283 * (2.2 * Math.pow(k, 1.7)) + ph, r = 1 - .97 * ei(k); return [cx + Math.cos(sp) * rx * r, y + Math.sin(sp) * ry * r]; };
    const orb = (c, x, yy, R, hot, a) => { const g = c.createRadialGradient(x, yy, 0, x, yy, R); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.3, hot ? `rgba(255,170,70,${a})` : `rgba(150,215,255,${a})`); g.addColorStop(1, hot ? 'rgba(255,60,20,0)' : 'rgba(60,140,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, yy, R, 0, 6.283); c.fill(); };
    cutJob(0, H, (c, k) => { for (const [ph, hot] of [[0, 1], [Math.PI, 0]]) { for (let i = 14; i >= 0; i--) { const kk = Math.max(0, k - i * .012), [x, yy] = pos(kk, ph); orb(c, x, yy, (16 - i * .8) * (.7 + k * .6), hot, (1 - i / 15) * .55); } const [x, yy] = pos(k, ph); orb(c, x, yy, 18 + k * 14, hot, 1); } });
    for (let at = 40; at < H; at += 45) cutLater(at, () => { const k = at / H; const [fx, fy] = pos(k, 0), [ix, iy] = pos(k, Math.PI); cutSpawn(3, () => ({ x: fx, y: fy, vx: RR(-1, 1), vy: RR(-2.2, -.4), g: -.03, drag: .96, life: RR(16, 30), max: 30, s: RR(1.4, 2.8), a: .9, c: '255,140,50' })); cutSpawn(2, () => ({ x: ix, y: iy, vx: RR(-.6, .6), vy: RR(.2, 1.4), g: .03, drag: .96, life: RR(16, 30), max: 30, s: RR(1.2, 2.2), a: .9, c: '170,220,255' })); });
    cutJob(H, 520, (c, k) => { const R = 30 + 110 * eo(k), a = (1 - k) * (1 - k), g = c.createRadialGradient(cx, y, 0, cx, y, R); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.4, `rgba(220,200,255,${a * .7})`); g.addColorStop(1, 'rgba(160,140,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(cx, y, R, 0, 6.283); c.fill(); });
    ringJob(H, 640, cx, y, W * .5, .42, '255,150,70', 5); ringJob(H + 70, 700, cx, y, W * .56, .42, '140,200,255', 5); ringJob(H + 160, 760, cx, y, W * .62, .42, '230,220,255', 2);
    const sh = Array.from({ length: 34 }, () => ({ a: RR(0, 6.283), v: RR(2.5, 8), s: RR(3, 8), r: RR(0, 3), vr: RR(-.25, .25) }));
    cutJob(H, t - H, (c, k) => { const T = k * (t - H) / 16.7, a = 1 - k; for (const p of sh) { const d = p.v * T * Math.pow(.97, T) * 1.2, x = cx + Math.cos(p.a) * d, yy = y + Math.sin(p.a) * d * .6 + T * T * .01; c.save(); c.translate(x, yy); c.rotate(p.r + p.vr * T); c.fillStyle = `rgba(210,240,255,${a})`; c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = .8; c.beginPath(); c.moveTo(0, -p.s); c.lineTo(p.s * .45, 0); c.lineTo(0, p.s); c.lineTo(-p.s * .45, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); } });
    cutLater(H, () => cutSpawn(60, () => { const a = RR(0, 6.283), s = RR(3, 10); return { x: cx, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6, g: .1, drag: .94, life: RR(18, 40), max: 40, s: RR(1, 2.2), a: 1, c: Math.random() < .5 ? '255,170,80' : '255,110,50', streak: true }; }));
    cutJob(H + 80, t - H - 80, (c, k) => { c.globalCompositeOperation = 'source-over'; for (let i = 0; i < 9; i++) { const ox = (i - 4) * 26 + Math.sin(i * 3.1) * 10, r = 18 + k * 50 + i % 3 * 6, yy = y - k * 70 - (i % 4) * 8, a = .22 * Math.sin(Math.PI * Math.min(1, k * 1.4)); c.fillStyle = `rgba(225,230,240,${Math.max(0, a)})`; c.beginPath(); c.arc(cx + ox * (1 + k), yy, r, 0, 6.283); c.fill(); } });
    cutA(C.d.querySelector('.cu-seam'), [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'scaleY(1.3)', offset: .1 }, { opacity: 0, transform: 'scaleY(1)' }], { duration: 560, delay: H, easing: 'ease-out' });
    shakeAt(C, H, 9, 420, 8); meAt(H - 80, [{ transform: 'none' }, { transform: 'scale(1.06)', offset: .35 }, { transform: 'none' }], { duration: 460 });
    ensAt(H + 40, (i) => [[{ transform: 'none' }, { transform: `translate(${i % 2 ? 8 : -8}px,-6px) rotate(${i % 2 ? 3 : -3}deg)`, offset: .3 }, { transform: 'none' }], {}], { duration: 460, easing: 'ease-out' }); } },
  e5_stasis: { h: .38, scene: '판 가장자리에서 얼음 판이 자라 들어오고 서리 결이 번진다. 시계 바늘이 멈추는 순간 하얀 고리가 퍼지며 모든 것이 그대로 굳고, 언 결 위로 빛이 반짝인다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, Hh = C.rc.h, col = C.col.join(','), cx = W / 2, y = C.yMid;
    cuLife(C.la, t, 260, 420); cuInk(C, t * .06, t * .26, 320);
    const shards = []; for (let i = 0; i < (C.F ? 34 : 18); i++) { const side = i % 4, u = RR(0, 1), ex = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, ey = side === 0 ? 0 : side === 1 ? u * Hh : side === 2 ? Hh : u * Hh, inx = side === 1 ? -1 : side === 3 ? 1 : 0, iny = side === 0 ? 1 : side === 2 ? -1 : 0, L = RR(40, 120);
      const tip = [ex + inx * L + (iny ? RR(-30, 30) : 0), ey + iny * L + (inx ? RR(-30, 30) : 0)], w = RR(18, 46); shards.push({ p: [[ex - (iny ? w : 0), ey - (inx ? w : 0)], tip, [ex + (iny ? w : 0), ey + (inx ? w : 0)]], d: RR(0, .35) }); }
    const fr = []; for (let i = 0; i < (C.F ? 30 : 16); i++) { const side = i % 4, u = RR(0, 1), x = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, yy = side === 0 ? 0 : side === 1 ? u * Hh : side === 2 ? Hh : u * Hh, base = side === 0 ? Math.PI / 2 : side === 1 ? Math.PI : side === 2 ? -Math.PI / 2 : 0; fr.push(...cracks(1, x, yy, RR(60, 140), .5, base)); }
    cutJob(0, t, (c, k) => { const ms = k * t, a = k > .86 ? (1 - k) / .14 : 1; for (const s of shards) { const g = eo(Math.min(1, Math.max(0, (ms / H - s.d) / (1 - s.d)))); if (!g) continue; const [b0, tp, b1] = s.p, bx = (b0[0] + b1[0]) / 2, by = (b0[1] + b1[1]) / 2, tx = bx + (tp[0] - bx) * g, ty = by + (tp[1] - by) * g;
      c.fillStyle = `rgba(190,225,255,${.16 * a})`; c.strokeStyle = `rgba(230,245,255,${.75 * a})`; c.lineWidth = 1; c.beginPath(); c.moveTo(b0[0], b0[1]); c.lineTo(tx, ty); c.lineTo(b1[0], b1[1]); c.closePath(); c.fill(); c.stroke(); } drawCracks(c, fr, eo(Math.min(1, ms / H)), a * .7, '210,235,255', 1.1); });
    const motes = Array.from({ length: 70 }, () => ({ x: RR(0, W), y: RR(0, Hh), vx: RR(-1.2, 1.2), vy: RR(-.4, 1.2), s: RR(1, 2.4) }));
    cutJob(0, t, (c, k) => { const ms = k * t, run = Math.min(ms, H + 90 * (1 - Math.exp(-Math.max(0, ms - H) / 90))), a = k > .86 ? (1 - k) / .14 : Math.min(1, ms / 200); for (const m of motes) { const x = m.x + m.vx * run / 16.7, yy = m.y + m.vy * run / 16.7; c.fillStyle = `rgba(235,247,255,${.85 * a})`; c.beginPath(); c.arc(x, yy, m.s, 0, 6.283); c.fill(); } });
    cutJob(H, 900, (c, k) => { const R = 20 + Math.hypot(W, Hh) * .75 * eo(k); c.strokeStyle = `rgba(235,248,255,${(1 - k) * .9})`; c.lineWidth = 2.5 * (1 - k) + .5; c.shadowColor = 'rgba(180,220,255,1)'; c.shadowBlur = 14; c.beginPath(); c.arc(cx, y, R, 0, 6.283); c.stroke(); });
    cutJob(H, t - H, (c, k) => { const a = Math.min(1, k * 5) * (k > .8 ? (1 - k) / .2 : 1), g = c.createRadialGradient(cx, y, Math.min(W, Hh) * .25, cx, y, Math.hypot(W, Hh) * .6); g.addColorStop(0, 'rgba(190,225,255,0)'); g.addColorStop(1, `rgba(190,225,255,${.32 * a})`); c.fillStyle = g; c.fillRect(0, 0, W, Hh); });
    const gl = Array.from({ length: 14 }, () => ({ x: RR(W * .05, W * .95), y: RR(8, Hh - 8), t0: RR(0, 1), s: RR(5, 11) }));
    cutJob(H + 120, t - H - 120, (c, k) => { for (const g of gl) { const ph = (k * 2.2 + g.t0) % 1, a = Math.sin(Math.PI * ph) * (1 - k * .5); if (a < .05) continue; c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(g.x - g.s, g.y); c.lineTo(g.x + g.s, g.y); c.moveTo(g.x, g.y - g.s); c.lineTo(g.x, g.y + g.s); c.stroke(); c.lineWidth = .7; c.beginPath(); c.moveTo(g.x - g.s * .5, g.y - g.s * .5); c.lineTo(g.x + g.s * .5, g.y + g.s * .5); c.moveTo(g.x + g.s * .5, g.y - g.s * .5); c.lineTo(g.x - g.s * .5, g.y + g.s * .5); c.stroke(); } });
    if (C.F) cutJob(0, t, (c, k) => { const ms = k * t, ang = (Math.min(ms, H) / 1000) * 10, a = k > .86 ? (1 - k) / .14 : Math.min(1, ms / 300), r = C.stage.h * .9; c.strokeStyle = `rgba(${col},${.45 * a})`; c.lineWidth = 1; c.beginPath(); c.arc(cx, y, r, 0, 6.283); c.stroke(); for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; c.beginPath(); c.moveTo(cx + Math.cos(an) * r * .88, y + Math.sin(an) * r * .88); c.lineTo(cx + Math.cos(an) * r, y + Math.sin(an) * r); c.stroke(); } c.lineWidth = 2; c.strokeStyle = `rgba(255,255,255,${.85 * a})`; c.beginPath(); c.moveTo(cx, y); c.lineTo(cx + Math.cos(ang - 1.57) * r * .82, y + Math.sin(ang - 1.57) * r * .82); c.stroke(); });
    cutAt(H, () => { const f = fieldEl(), m = vfxSelMe(); return [f, m].filter(Boolean).map(el => [el, [{ filter: 'none' }, { filter: 'grayscale(.85) brightness(.85) sepia(.2) hue-rotate(170deg) saturate(.6)', offset: .05 }, { filter: 'grayscale(.85) brightness(.85) sepia(.2) hue-rotate(170deg) saturate(.6)', offset: .9 }, { filter: 'none' }]]); }, { duration: t - H - 80, easing: 'linear' });
    cutA(C.la.querySelector('.cu-q'), [{ color: '#f6efe2' }, { color: '#e6f5ff', textShadow: '0 0 18px rgba(200,235,255,.95),0 0 2px #000,0 2px 3px #000' }], { duration: 160, delay: H }); } },
  e5_meteor: { h: .64, len: 1.2, scene: '하늘 끝이 붉게 갈라지고 불덩이 비가 비스듬히 쏟아진다. 떨어진 자리마다 불기둥과 불티가 솟고, 마지막에 가장 큰 불덩이가 적 줄 한가운데에 내리꽂혀 폭발한다', run(C) { cuOne(C); const { t, hitAt: H } = C, W = C.rc.w, Hh = C.rc.h, col = C.col.join(',');
    cuLife(C.la, t, 300, 420, 'translateY(-18px)'); cuInk(C, t * .08, t * .28);
    cutJob(0, t, (c, k) => { const a = Math.min(1, k * 4) * (k > .85 ? (1 - k) / .15 : 1), fl = .8 + Math.sin(k * 70) * .1 + Math.sin(k * 23) * .1, g = c.createLinearGradient(0, 0, 0, Hh * .45); g.addColorStop(0, `rgba(255,120,40,${.42 * a * fl})`); g.addColorStop(.35, `rgba(200,40,20,${.18 * a})`); g.addColorStop(1, 'rgba(120,20,10,0)'); c.fillStyle = g; c.fillRect(0, 0, W, Hh * .45);
      c.strokeStyle = `rgba(255,200,120,${.5 * a * fl})`; c.lineWidth = 1.5; c.beginPath(); for (let x = 0; x <= W; x += 16) { const yy = 6 + Math.sin(x * .02 + k * 9) * 4 + Math.sin(x * .07 - k * 13) * 2; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); });
    const fall = (st, dur, x1, y1, big) => { const dx = big ? 240 : 170, dy = y1 + 80, x0 = x1 - dx, hr = big ? 26 : RR(7, 12), tl = big ? 380 : RR(150, 230);
      cutJob(st, dur, (c, k) => { const e = ei(k) * .75 + k * .25, hx = x0 + dx * e, hy = -80 + dy * e, ang = Math.atan2(dy, dx), tx = hx - Math.cos(ang) * tl, ty = hy - Math.sin(ang) * tl; c.lineCap = 'round';
        [[hr * 1.6, `rgba(255,70,20,.22)`], [hr * .8, `rgba(${col},.75)`], [hr * .28, 'rgba(255,245,220,.95)']].forEach(([w, s]) => { const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(255,60,20,0)'); g.addColorStop(1, s); c.strokeStyle = g; c.lineWidth = w; c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke(); });
        const r = c.createRadialGradient(hx, hy, 0, hx, hy, hr * 1.8); r.addColorStop(0, 'rgba(255,255,235,1)'); r.addColorStop(.35, `rgba(255,190,90,.9)`); r.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = r; c.beginPath(); c.arc(hx, hy, hr * 1.8, 0, 6.283); c.fill(); });
      cutLater(st + dur * .55, () => { const e = .55 * .55 * .55 * .75 + .55 * .25, hx = x0 + dx * e, hy = -80 + dy * e; cutSpawn(big ? 14 : 4, () => ({ x: hx + RR(-6, 6), y: hy + RR(-6, 6), vx: RR(-1.5, .5), vy: RR(-1.5, .5), g: .05, drag: .96, life: RR(14, 30), max: 30, s: RR(1.2, 2.6), a: .9, c: '255,150,60' })); });
      const at = st + dur; ringJob(at, big ? 700 : 380, x1, y1, big ? 150 : 34, .38, col, big ? 6 : 2.5);
      cutJob(at, big ? 700 : 360, (c, k) => { const hh = (big ? 150 : RR(40, 70)) * Math.sin(Math.PI * Math.min(1, k * 1.3)), w = big ? 46 : 12, g = c.createLinearGradient(0, y1 - hh, 0, y1); g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(.5, `rgba(255,150,60,${.7 * (1 - k)})`); g.addColorStop(1, `rgba(255,240,200,${.9 * (1 - k)})`); c.fillStyle = g; c.beginPath(); c.moveTo(x1 - w, y1); c.quadraticCurveTo(x1 - w * .3, y1 - hh * .6, x1 + Math.sin(k * 30) * 4, y1 - hh); c.quadraticCurveTo(x1 + w * .3, y1 - hh * .6, x1 + w, y1); c.closePath(); c.fill(); });
      cutLater(at, () => cutSpawn(big ? 70 : 10, () => { const a = RR(-Math.PI, 0), s = RR(2, big ? 11 : 6); return { x: x1, y: y1, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: .22, drag: .95, life: RR(16, 36), max: 36, s: RR(1, 2.2), a: 1, c: Math.random() < .5 ? '255,220,150' : col, streak: true }; })); };
    const n = C.F ? 40 : 20; for (let i = 0; i < n; i++) { const st = Math.round(RR(t * .03, t * .72)); fall(st, RR(360, 520), RR(W * .04, W * .96), RR(Hh * .3, Hh - 10), false); }
    const ens = ensOf(C), tg = ens[ens.length >> 1] || { x: W / 2, y: Hh * .2 }; fall(H - 520, 520, tg.x, tg.y, true);
    shakeAt(C, H, 13, 620, 11); ensAt(H, (i) => [[{ transform: 'none' }, { transform: `translate(${(i - 1) * 10}px,-12px) rotate(${(i - 1) * 4}deg)`, offset: .25 }, { transform: 'translateY(3px)', offset: .6 }, { transform: 'none' }], {}], { duration: 620, easing: 'ease-out' });
    for (let k2 = 0; k2 < 5; k2++) ensAt(Math.round(t * (.18 + k2 * .09)), (i) => [[{ transform: 'none' }, { transform: `translateY(${(RR(2, 6)).toFixed(0)}px)`, offset: .3 }, { transform: 'none' }], { delay: (i * 37 + k2 * 13) % 90 }], { duration: 240 });
    meAt(0, [{ transform: 'none' }, { transform: 'translateY(-8px) scale(1.03)', offset: .2 }, { transform: 'translateY(-6px) scale(1.03)', offset: .7 }, { transform: 'none' }], { duration: t }); } },
};

/* 승부수 id 표(CUT_SK)로 연다. 표에 없거나 게임 원본 그림(game: 불의 몸 · 용맹한 방벽)이면 문법 cutin(검 · 방어 · 마법)으로.
   길이 = 진행 속도 길이 × 화려 1.25 × 승부수 len(≤ 1.2). 움직임 줄이기면 띠와 글만. 소리는 파일 cut_<id>가 있으면 파일, 없으면 CUT_SND 합성음 */
function cutinSk(s, col, motif) {
  const M = CUT_SK[s.id]; if (!M || M.game) return cutin({ line: s.line, cut: M ? M.game : s.cut, motif: M ? 'spellblade' : motif, col, s });
  const rc = cutBoardRect(); if (!rc) return 0; const lvl = cutLevel(); if (lvl === 'off') return 0; const rm = vfxRm(), F = lvl === 'fancy' && !rm;
  const t = Math.round((CUT_PACE[G.pace] || CUT_PACE.normal) * (F ? 1.25 : 1) * Math.min(1.2, M.len || 1)); const d = cutBuild(s, col, rc); d.classList.add('cu-sk'); if (F) d.classList.add('cu-fancy');
  const la = d.querySelector('.cu-layer.la'), lb = d.querySelector('.cu-layer.lb'), stR = d.querySelector('.cu-stage').getBoundingClientRect(), veil = d.querySelector('.cu-veil');
  const C = { d, la, lb, t, col, F, rc, sid: s.id, hitAt: Math.round(t * M.h), stage: { t: stR.top - rc.t, h: stR.height }, yMid: stR.top - rc.t + stR.height / 2 };
  if (M.veil) veil.style.background = M.veil; cutA(veil, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: t, easing: 'linear' });
  CUT.lastSk = { id: s.id, t, F, rm, snd: 0 }; /* 시험(cutin-browser)이 읽는다 */
  if (rm) { cutShow(la, t); lb.style.display = 'none'; }
  else { try { M.run(C); } catch (e) { console.error(e); }
    const k = 'cut_' + s.id; if (typeof SFX !== 'undefined' && SFX[k] && SFX[k].src) { cutLater(C.hitAt, () => sfxPlay(k, { lim: 1, vol: 0.8 })); CUT.lastSk.snd = 'file'; }
    else if (CUT_SND[s.id]) { try { if (cutAu()) { CUT_SND[s.id](t, C.hitAt); CUT.lastSk.snd = 'synth'; } } catch (e) { } } }
  cutLater(t + 60, () => cutStop()); return t;
}
/* render()가 끝날 때(vfxFlush 앞에서) 쌓인 컷인을 띄운다 */
function cutFlush() {
  if (!vfxDoc() || !CUT.q.length) return; const q = CUT.q; CUT.q = []; const x = q.filter(e => Date.now() - e.t < 3000).pop(); if (!x || !G.b || G.sheet || G.hudEd || document.hidden) return;
  const col = CUT_COL[x.s.b] || [201, 162, 75]; try { cutinSk(x.s, col, x.build); } catch (e) { cutStop(); }
}
/* 엔진 runSkill2 감싸기(화면이 있을 때만): 승부수를 쓴 뒤 큐에 쌓는다. 결과를 그대로 돌려준다 */
(function () {
  if (typeof document === 'undefined' || typeof runSkill2 !== 'function') return; const o0 = runSkill2;
  runSkill2 = function (b, act, tgt) { const r = o0.apply(this, arguments); try { if (b && act && act.s && act.s.line) cutQueue(b, act.s); } catch (e) { } return r; };
})();
