'use strict';
/* ===== 전투 시각 이펙트 (10월 10일, 0.6a.2-108) =====
   장식만 한다. 피해 · 판정 · 순서 · 진행 속도를 바꾸지 않고, 엔진이 이미 하는 일을 지켜보기만 한다:
   - 엔진 함수(hurtEnemy · hurtPlayer · addBreak · killEnemy)를 감싸서 "방금 무슨 일이 있었나"를 읽는다(원래 함수의 결과를 그대로 돌려준다).
   - 읽은 일은 큐에 쌓였다가 render()가 끝날 때(vfxFlush) 화면 위 덮개(#vfx)에 짧게 그려진다. 덮개는 render가 지우지 않는 body 직속 요소다.
   - 화면이 없는 환경(던전 테스터 · 50상황 테스터 · 저장 점검의 vm)에는 document가 없어 감싸지 않는다: 테스트 결과가 같다.
   - 전투 화면(G.b)의 실제 전투만 그린다: 미리보기용으로 복제한 전투는 그리지 않는다.
   설정: G.data.fx = 'off' | 'low' | 'normal'(없으면 normal). 움직임 줄이기(G.data.rm · OS 설정)는 색 윤곽만 잠깐 보인다.
   안전: 한 번에 6개까지, 눈에 띄는 면 번쩍임은 1초에 3번 이하, 포인터를 가로채지 않는다, 읽는 정보는 전투 기록에 이미 있다 */
const VFX_COL = { steel: '#fff1d0', fire: '#ff8a3d', frost: '#8fd3ff', venom: '#8bd96a', blood: '#e0483b', shock: '#f5e663', arcane: '#b99cff', guard: '#8fb6ff', ward: '#5ad0e6', heal: '#7be08a', hurt: '#ff6b5e', gold: '#ffd36a', shard: '#e8d9b5' };
const VFX_MAX = 6; /* 동시에 떠 있는 이펙트 수 */
const VFX_FLASH_PER_SEC = 2; /* 면 번쩍임(연한 색 면)을 새로 시작할 수 있는 수. 1초에 3번 미만 */
const VFX_LOW_KINDS = ['hit', 'brk', 'kill', 'phit', 'pgd', 'pwd', 'ppr'];
const VFX = { q: [], seq: 0, flashAt: [], base: null, sk: {} };
const vfxDoc = () => typeof document !== 'undefined' && typeof G !== 'undefined' && !!G;
function vfxMode() { const m = vfxDoc() && G.data && G.data.fx; return m === 'off' || m === 'low' ? m : 'normal'; }
function vfxRm() { return !!((typeof G !== 'undefined' && G.data && G.data.rm) || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)); }
const vfxLive = b => !!(vfxDoc() && b && b === G.b && vfxMode() !== 'off');
const vfxSelEnemy = id => { const c = document.querySelectorAll('.en[data-e]'); for (const x of c) if (x.dataset.e === id) return x; return null; };
const vfxSelMe = () => document.querySelector('.fstat[data-hud="hud-player"]') || document.querySelector('.me') || document.querySelector('.mbars');
function vfxRectOf(who) { const el = who === 'p' ? vfxSelMe() : vfxSelEnemy(who); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? { l: r.left, t: r.top, w: r.width, h: r.height } : null; }
/* 사건 하나를 큐에 쌓는다. 엔진을 건드리지 않는다 */
function vfxEmit(k, who, info) {
  if (!vfxDoc()) return; const m = vfxMode(); if (m === 'off' || (m === 'low' && !VFX_LOW_KINDS.includes(k))) return;
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
  const heO = hurtEnemy, hpO = hurtPlayer, abO = typeof addBreak === 'function' ? addBreak : null, keO = typeof killEnemy === 'function' ? killEnemy : null;
  hurtEnemy = function (b, e, raw, o) {
    if (!vfxLive(b) || !e) return heO.apply(this, arguments);
    o = o || {}; const seq = ++VFX.seq, hp0 = e.hp, al0 = e.alive, ev0 = !!e.evading; const args = [b, e, raw, o];
    const r = heO.apply(this, args);
    try {
      if (al0 && !o.silent) {
        if (r > 0.05 || hp0 - e.hp > 0.05) {
          const big = !o.dot && (r >= e.hpMax * 0.22 || (b.cur && b.cur.id === 'heavy') || !!o.charged);
          if (o.dot) vfxEmit('dot', e.id, { seq, el: vfxElem(b, o) });
          else { const sy = vfxStyle(b, o); vfxEmit('hit', e.id, { seq, st: sy.st, el: sy.el, big }); }
        } else if (!o.dot && (b.cur || o.ctr) && (ev0 || o.single || o.melee)) vfxEmit('miss', e.id, { seq });
      }
    } catch (x) { }
    return r;
  };
  hurtPlayer = function (b, raw, o) {
    if (!vfxLive(b)) return hpO.apply(this, arguments);
    o = o || {}; const p = b.p, seq = ++VFX.seq, ward0 = p.ward || 0, ev0 = p.evade || 0, hp0 = p.hp;
    const r = hpO.apply(this, [b, raw, o]);
    try {
      if (!o.silent) {
        if ((p.evade || 0) < ev0 && !(r > 0)) vfxEmit('pev', 'p', { seq });
        else {
          const wd = ward0 - (p.ward || 0);
          if (o.parried) vfxEmit('ppr', 'p', { seq });
          if (wd > 0.3) vfxEmit('pwd', 'p', { seq, all: !(r > 0) });
          else if (p.guard && !o.dot && !o.judgment && !o.parried) vfxEmit('pgd', 'p', { seq });
          if (r > 0.05 || hp0 - p.hp > 0.05) vfxEmit('phit', 'p', { seq, big: !o.dot && (r >= p.hpMax * 0.15 || !!o.charged), dot: !!o.dot });
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
})();
/* ---- 그리기 ---- */
function vfxLayer() {
  let l = document.getElementById('vfx'); if (l) return l;
  l = document.createElement('div'); l.id = 'vfx'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); return l;
}
function vfxClear() { const l = document.getElementById('vfx'); if (l) l.textContent = ''; }
function vfxParts(n, spread, cls) { let h = ''; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (i % 2) * 0.4; h += `<i class="${cls || 'vf-p'}" style="--tx:${Math.round(Math.cos(a) * spread)}px;--ty:${Math.round(Math.sin(a) * spread)}px;--rot:${i * 53}deg"></i>`; } return h; }
const VFX_SHIELD = '<svg class="vf-sv" viewBox="0 0 40 46" focusable="false"><path d="M20 2 L37 8 V22 C37 33 29 41 20 44 C11 41 3 33 3 22 V8 Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg>';
/* 사건 하나를 그린다. 결과: 이 이펙트의 길이(ms) */
function vfxPlay(ev, rm, low, flashOk) {
  const rc = vfxRectOf(ev.who) || ev.r0; if (!rc) return 0;
  const vw = window.innerWidth, vh = window.innerHeight; if (rc.l + rc.w < 0 || rc.t + rc.h < 0 || rc.l > vw || rc.t > vh) return 0;
  const L = vfxLayer(); while (L.children.length >= VFX_MAX) L.removeChild(L.firstChild);
  const el = ev.who !== 'p' ? vfxSelEnemy(ev.who) : vfxSelMe();
  let cls = 'k-' + ev.k, col = VFX_COL[ev.el || 'steel'], dur = 360, h = '', style = '', over = false;
  const fl = flashOk && !rm ? '<i class="vf-fl"></i>' : '';
  switch (ev.k) {
    case 'hit': {
      const sy = ev.st; cls += ' s-' + sy + (ev.big ? ' big' : '');
      if (sy === 'slash') { h = fl + `<i class="vf-ln${ev.seq % 2 ? ' alt' : ''}"></i>` + (ev.big ? '<i class="vf-ln alt l2"></i>' : ''); dur = ev.big ? 420 : 330; }
      else if (sy === 'pierce') { h = fl + '<i class="vf-st"></i><i class="vf-rg"></i>'; dur = 340; }
      else if (sy === 'blunt') { h = fl + '<i class="vf-rg"></i>' + (ev.big ? '<i class="vf-rg r2"></i>' : ''); dur = 400; }
      else if (sy === 'spell') { h = fl + '<i class="vf-bu"></i>' + (low ? '' : vfxParts(ev.big ? 8 : 5, ev.big ? 46 : 34)); dur = 440; }
      else if (sy === 'arrow' || sy === 'ctr') {
        const me = vfxRectOf('p'); over = true; let dx = 0, dy = 0, len = 0, ang = 0, x0 = 0, y0 = 0;
        if (me) { const sx = me.l + me.w / 2, sy0 = me.t + me.h / 2, tx = rc.l + rc.w / 2, ty = rc.t + rc.h / 2; dx = tx - sx; dy = ty - sy0; len = Math.hypot(dx, dy); ang = Math.atan2(dy, dx) * 180 / Math.PI; x0 = sx - rc.l; y0 = sy0 - rc.t; }
        const fly = me ? Math.round(Math.min(260, 120 + len * 0.15)) : 0;
        style = `--x0:${Math.round(x0)}px;--y0:${Math.round(y0)}px;--ang:${Math.round(ang)}deg;--len:${Math.round(len)}px;--fly:${fly}ms;`;
        h = (me ? '<i class="vf-ar"></i>' : '') + `<i class="vf-hit" style="--dl:${fly}ms">${fl}<i class="vf-rg"></i>${sy === 'ctr' ? '<i class="vf-ln"></i>' : ''}</i>`; dur = fly + 320;
      }
      if (ev.big && !rm && !low && el) vfxShake(el);
      else if (!rm && !low && el && sy !== 'arrow') vfxShake(el, 1);
      break;
    }
    case 'dot': h = '<i class="vf-dt"></i>'; dur = 300; break;
    case 'miss': col = '#dcdcdc'; h = '<i class="vf-gz"></i>'; dur = 300; break;
    case 'brk': col = VFX_COL.shard; h = '<i class="vf-ol"></i>' + (low ? '' : vfxParts(6, 52, 'vf-sh')); dur = 520; break;
    case 'kill': col = VFX_COL.shard; h = '<i class="vf-gh"></i>' + (low ? '' : vfxParts(9, 40)); dur = 560; break;
    case 'phit': col = VFX_COL.hurt; h = '<i class="vf-ol"></i>'; dur = ev.big ? 520 : 380; cls += ev.big ? ' big' : ''; if (ev.big && !rm && !low && el) vfxShake(el); break;
    case 'pgd': col = VFX_COL.guard; h = '<i class="vf-ol"></i>' + VFX_SHIELD; dur = 460; break;
    case 'pwd': col = VFX_COL.ward; h = '<i class="vf-ol"></i>' + VFX_SHIELD; dur = 460; break;
    case 'ppr': col = VFX_COL.gold; h = fl + '<i class="vf-ol"></i>' + (low ? '' : vfxParts(8, 38, 'vf-sp')); dur = 420; break;
    case 'pev': col = '#dcdcdc'; h = '<i class="vf-gz"></i>'; dur = 300; break;
    case 'heal': col = VFX_COL.heal; h = '<i class="vf-ol"></i><i class="vf-gl"></i>' + (low ? '' : '<i class="vf-up" style="--ux:18%"></i><i class="vf-up" style="--ux:48%;animation-delay:90ms"></i><i class="vf-up" style="--ux:78%;animation-delay:50ms"></i>'); dur = 700; break;
    case 'wgain': col = VFX_COL.ward; h = '<i class="vf-ol"></i><i class="vf-gl"></i>'; dur = 600; break;
    default: return 0;
  }
  if (rm) h = '<i class="vf-ol"></i>' + (/vf-sv/.test(h) ? VFX_SHIELD : '') + (/vf-ln/.test(h) ? '<i class="vf-ln"></i>' : '') + (ev.k === 'kill' ? '<i class="vf-gh"></i>' : ''), dur = 420;
  const d = document.createElement('div'); d.className = 'vf ' + cls + (rm ? ' rm' : '') + (over ? ' over' : '');
  d.style.cssText = `left:${rc.l}px;top:${rc.t}px;width:${rc.w}px;height:${rc.h}px;--c:${col};--dur:${dur}ms;${style}`; d.innerHTML = h;
  L.appendChild(d); setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, dur + 140);
  return dur;
}
function vfxShake(el, soft) { if (!el || el.classList.contains('vf-shk')) return; el.classList.add('vf-shk'); if (soft) el.classList.add('soft'); setTimeout(() => { el.classList.remove('vf-shk', 'soft'); }, 280); }
/* render()가 끝날 때마다 부른다. 쌓인 사건을 순서대로 조금씩 어긋나게 보여 준다(진행 속도는 건드리지 않는다) */
function vfxFlush() {
  if (!vfxDoc()) return;
  const b = G.b, q = VFX.q; VFX.q = [];
  /* 나의 생명력 · 보호막이 늘었으면 빛을 낸다(다시 그려 사이의 차이를 본다) */
  const ev2 = [];
  if (b && b.p && vfxMode() !== 'off') {
    const p = b.p, bs = VFX.base;
    if (bs && bs.b === b) {
      if (p.hp - bs.hp >= 0.5 && p.hp > 0) ev2.push({ k: 'heal', who: 'p', seq: ++VFX.seq, t: Date.now() });
      if ((p.ward || 0) - bs.ward >= 0.5) ev2.push({ k: 'wgain', who: 'p', seq: ++VFX.seq, t: Date.now() });
    }
    VFX.base = { b, hp: p.hp, ward: p.ward || 0 };
  } else VFX.base = null;
  if (!b || vfxMode() === 'off' || G.sheet || G.hudEd || document.hidden) { if (!b) vfxClear(); return; }
  const m = vfxMode(); const low = m === 'low';
  const list = q.concat(ev2.filter(x => !low)).filter(x => Date.now() - x.t < 3000).sort((a, c) => a.seq - c.seq);
  if (!list.length) return;
  /* 같은 자리의 같은 이펙트가 겹쳐 쌓이지 않게 둘까지만 */
  const seen = {}; const play = [];
  for (const x of list) { const key = x.k + ':' + x.who + ':' + (x.st || ''); seen[key] = (seen[key] || 0) + 1; if (seen[key] <= 2) play.push(x); }
  const rm = vfxRm(); let at = 0;
  play.slice(0, 10).forEach((x, i) => {
    const delay = Math.min(i * 85, 520);
    setTimeout(() => {
      if (G.b !== b || G.sheet || G.hudEd) return;
      const now = Date.now(); VFX.flashAt = VFX.flashAt.filter(t => now - t < 1000);
      const flashOk = VFX.flashAt.length < VFX_FLASH_PER_SEC; const dur = vfxPlay(x, rm, low, flashOk);
      if (dur && flashOk && !rm) VFX.flashAt.push(now);
      const L = document.getElementById('vfx'); if (L) L.classList.toggle('low', low);
    }, delay);
    at = delay;
  });
}
/* ---- 설정 ---- */
const VFX_OPTS = [['off', '끔'], ['low', '약하게'], ['normal', '보통']];
function vfxSettingRow() {
  const m = vfxMode();
  return `<div class="setrow"><label for="setfx">전투 효과</label><span class="mini">맞고 때리는 순간의 짧은 그림 효과. 끄거나 약하게 줄일 수 있습니다. 움직임 줄이기를 켜면 색 윤곽만 잠깐 보입니다</span><select id="setfx">${VFX_OPTS.map(([k, n]) => `<option value="${k}"${m === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`;
}
if (typeof document !== 'undefined') document.addEventListener('change', ev => {
  const t = ev.target; if (!t || t.id !== 'setfx' || !vfxDoc()) return; const v = t.value; G.data.fx = v === 'off' || v === 'low' ? v : 'normal'; saveLocal(); VFX.q = []; if (vfxMode() === 'off') vfxClear();
});
