'use strict';
/* ===== 0.8.0 3단계: 방사형 트리 화면 (10월 17일, docs/제안/0.8.0-로드맵-2026-10-16.md 3단계 · docs/검증/0.8.0-3단계-트리화면-2026-10-17.md) =====
   패시브 · 액티브 트리를 SVG 한 장으로 그린다. 규칙은 엔진(js/23-tree-engine.js)을 읽기만 한다(찍기 · 되돌리기 · 장착 단추는 2단계와 같은 data-a).
   쓰는 곳: 트리 페이지, 캐릭터 만들기 · 옛 세이브 옮기기의 배분 흐름, 큰 각인 고르기(mode 'k'). "목록으로 보기"(G.data.treeList)는 2단계 목록형 화면.
   이번 접속만 기억하는 것: G.tvw[보기 키] = { k, x, y } 확대 · 이동, G.tsel[p|a|k] 고른 노드, G.tjust 방금 연 노드(선 그리기), G.tfocus 다시 그린 뒤 초점 */
const TRD_L = {};
const trdF = v => Math.round(v * 10) / 10;
const trdXY = (deg, rad) => { const a = deg * Math.PI / 180; return [Math.sin(a) * rad, -Math.cos(a) * rad]; };
const trdAng = (dx, dy) => (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360; // 화면 각도: 위가 0, 시계 방향
const trdAD = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
const TRD_KMIN = 0.6, TRD_KMAX = 6;
const trdTW = t => Math.round([...String(t)].reduce((a, c) => a + (/[\u3131-\uD79D]/.test(c) ? 11 : c === ' ' ? 3.5 : 6.5), 0)); // 11px 글자의 대략 너비
const TRD_Q = { q0: 0, q1: 0.5, q15: 0.78, q2: 0.95, q3: 1.9 };
/* ---- 자리 계산 (직업마다 한 번) ---- */
/* 패시브: 각도 = 방향 + 칸(L −12° · C 0 · R +12°), 반지름 = r × U. 고리 경계 r 3.5 · 6.5 (설계 2-1). 다리(같은 r, 다른 방향)는 호로 그린다 */
function trdLayP(cls) {
  const key = 'p:' + cls; if (TRD_L[key]) return TRD_L[key];
  const T = ptBuild(cls), U = 46, N = {};
  for (const id in T.nodes) {
    const n = T.nodes[id], a = n.kind === 'start' ? 0 : PT.dir[n.dir].a + (PT.lane[n.pos.lane] || 0), rad = n.pos.r * U, [x, y] = trdXY(a, rad);
    N[id] = { id, x, y, a, rad, sz: n.kind === 'start' ? 17 : n.kind === 'keystone' ? 15 : n.kind === 'notable' ? 11 : 6.5 };
  }
  const links = [];
  for (const id in T.nodes) for (const o of T.nodes[id].links) if (id < o) { const A = T.nodes[id], B = T.nodes[o]; links.push({ a: id, b: o, arc: A.kind !== 'start' && B.kind !== 'start' && A.dir !== B.dir && A.pos.r === B.pos.r }); }
  const disc = 10.1 * U;
  return (TRD_L[key] = { kind: 'p', T, U, N, links, bounds: [0, 3.5 * U, 6.5 * U, disc - 24], disc, lab: 11 * U, vb: 11.9 * U, ringAng: 30, axes: PT.dirs.map(d => ({ k: d, n: PT.dir[d].n, a: PT.dir[d].a })) });
}
/* 액티브: 마검사는 ATREE_DEF의 갈래 · 칸 각도, 임시 트리는 갈래 0 · 120 · 240°와 줄(r). 강화 노드는 그 스킬 곁의 위성으로 둔다(데이터 자리는 어느 쪽에 둘지의 힌트) */
function trdLayA(cls) {
  const key = 'a:' + cls; if (TRD_L[key]) return TRD_L[key];
  const A = atBuild(cls), D = ATREE_DEF[cls], N = {}, brA = {};
  A.br.forEach((b, i) => { brA[b] = D && D.br[b] != null ? D.br[b] : i * 120; });
  const lane = D ? D.lane : { LL: -26, L: -13, C: 0, R: 13, RR: 26 }, U = D ? 80 : 44, R0 = D ? 0 : 40, SK = D ? 21 : 14, UP = 9;
  const radOf = r => r ? R0 + r * U : 0;
  for (const id in A.nodes) { const n = A.nodes[id]; if (n.kind === 'upgrade') continue; const a = n.kind === 'start' ? 0 : brA[n.br] + (lane[n.pos.lane] || 0), rad = radOf(n.pos.r), [x, y] = trdXY(a, rad); N[id] = { id, x, y, a, rad, sz: n.kind === 'start' ? (D ? 27 : 22) : SK }; }
  const placed = Object.values(N);
  for (const id in A.nodes) {
    const n = A.nodes[id]; if (n.kind !== 'upgrade') continue; const P = N[n.on]; if (!P) continue;
    const [hx, hy] = trdXY(brA[n.br] + (lane[n.pos.lane] || 0), radOf(n.pos.r)); const hint = trdAng(hx - P.x, hy - P.y);
    const lk = A.nodes[n.on].links.filter(x => N[x] && A.nodes[x].kind !== 'upgrade').map(x => trdAng(N[x].x - P.x, N[x].y - P.y));
    const mine = placed.filter(q => q.sat === n.on).map(q => trdAng(q.x - P.x, q.y - P.y)); const d = P.sz + UP + 8; let best = null;
    for (let phi = 0; phi < 360; phi += 10) {
      const x = P.x + Math.sin(phi * Math.PI / 180) * d, y = P.y - Math.cos(phi * Math.PI / 180) * d;
      let c = trdAD(phi, hint) / 180 + 0.35 * trdAD(phi, P.a) / 180;
      for (const l of lk) if (trdAD(phi, l) < 38) c += 3;
      for (const m of mine) if (trdAD(phi, m) < 55) c += 3;
      for (const q of placed) if (q.id !== P.id && Math.hypot(q.x - x, q.y - y) < q.sz + UP + 6) c += 5;
      if (!best || c < best.c) best = { c, x, y, phi };
    }
    N[id] = { id, x: best.x, y: best.y, a: best.phi, rad: Math.hypot(best.x, best.y), sz: UP, sat: n.on }; placed.push(N[id]);
  }
  const links = []; for (const id in A.nodes) for (const o of A.nodes[id].links) if (id < o && N[id] && N[o]) links.push({ a: id, b: o, sat: A.nodes[id].kind === 'upgrade' || A.nodes[o].kind === 'upgrade' });
  const rr = {}; for (const id in N) { const n = A.nodes[id]; if (n.kind !== 'skill') continue; const q = rr[n.ring] || (rr[n.ring] = [Infinity, -Infinity]); q[0] = Math.min(q[0], N[id].rad); q[1] = Math.max(q[1], N[id].rad); }
  const maxR = Math.max(...Object.values(N).map(q => q.rad + q.sz)), disc = maxR + (D ? 34 : 30);
  const bnd = k => rr[k] && rr[k + 1] ? (rr[k][1] + rr[k + 1][0]) / 2 : disc - 24;
  return (TRD_L[key] = { kind: 'a', T: A, U, N, links, bounds: [0, bnd(1), bnd(2), disc - 24], disc, inR: (N.S.sz + radOf(1) - SK) / 2, lab: disc + 0.6 * U, vb: disc + (D ? 1.3 : 2) * U, ringAng: 60, axes: A.br.map(b => ({ k: b, n: b, a: brA[b] })), tmp: !D });
}
/* ---- 상태 ---- */
function trdStP(run, id, T) {
  const t = run.ptree; if (id === 'S') return 'open'; if (t.own.includes(id)) return 'own'; if (t.free.includes(id)) return 'free'; if (t.ks.includes(id)) return 'ks';
  const w = ptWhy(run, id); return !w ? (treeCanEdit() ? 'can' : 'near') : w === '포인트가 없습니다' ? 'near' : 'lock';
}
function trdStA(run, id) { if (id === 'S') return 'open'; if (run.atree.own.includes(id)) return 'own'; const w = atWhy(run, id); return !w ? (treeCanEdit() ? 'can' : 'near') : w === '포인트가 없습니다' ? 'near' : 'lock'; }
const TRD_STN = { open: '열림', own: '찍음', free: '길 덤으로 열림', ks: '얻은 큰 각인', can: '찍을 수 있음', near: '이웃이 열림 · 포인트가 없음', view: '찍을 수 있음 · 이 창에서는 큰 각인만 고릅니다', lock: '잠김' };
const TRD_STA = { open: '시작 스킬', own: '열림', can: '열 수 있음', near: '이웃이 열림 · 포인트가 없음', lock: '잠김' };
const trdRingShort = r => r === 2 ? '2챕터부터' : r === 3 ? '3챕터부터' : '';
/* ---- 보기 상태 ---- */
const trdVk = (run, mode) => mode + ':' + run.build;
function trdView0(run, mode, L, opt) { // 처음 보기: 열린 고리까지(조금 더) 맞춘다. 큰 각인 고르기는 후보까지
  let top = 3; while (top > 1 && !ringOpen(run, top)) top--;
  let rad = top >= 3 ? 0 : L.bounds[top] + 0.9 * L.U;
  if (mode === 'k' && opt && opt.offer && opt.offer.length) rad = Math.max(...opt.offer.map(id => L.N[id] ? L.N[id].rad : 0)) + 1.4 * L.U;
  const k = rad ? Math.max(1, Math.min(3.2, L.vb / rad)) : 1; return { k, x: 0, y: 0 };
}
function trdVw(run, mode, L, opt) { // 보이는 고리(또는 큰 각인 후보)가 바뀌면 한 번 다시 맞춘다
  G.tvw = G.tvw || {}; const vk = trdVk(run, mode), sig = [1, 2, 3].filter(k => ringOpen(run, k)).length + (run.alloc ? ':' + run.alloc.mode : '') + (mode === 'k' && opt && opt.offer ? ':' + opt.offer.join(',') : '');
  if (!G.tvw[vk] || G.tvw[vk].sig !== sig) G.tvw[vk] = Object.assign(trdView0(run, mode, L, opt), { sig }); return G.tvw[vk];
}
function trdSelOf(run, mode, L, opt) {
  G.tsel = G.tsel || {}; let id = G.tsel[mode];
  if (mode === 'k') { const off = (opt && opt.offer) || []; if (!off.includes(id)) id = null; if (id == null && G.tsel.k !== '' && off.length && typeof matchMedia !== 'undefined' && matchMedia('(min-width: 900px)').matches) id = off[0]; }
  if (id != null && !L.N[id]) id = null; return id;
}
/* ---- 그리기 ---- */
const TRD_GLYPH = { // 중간 노드 · 큰 각인의 방향 문양 (24칸, 선으로 그림)
  pw: 'M12 2.5 L14.2 13.5 L12 15.5 L9.8 13.5 Z M6.5 15.5 H17.5 M12 15.5 V21.5',
  ct: 'M4 5.5 H16 V10.5 H4 Z M10 10.5 V21.5 M16 8 H20.5',
  ag: 'M4 13 L12 5 L20 13 M4 20 L12 12 L20 20',
  lg: 'M5.5 4 H18.5 Q18.5 12.5 12 13.5 Q5.5 12.5 5.5 4 Z M12 13.5 V19 M8 20.5 H16',
  su: 'M12 3 Q18.5 11 18.5 15 A6.5 6.5 0 0 1 5.5 15 Q5.5 11 12 3 Z',
  sv: 'M12 2.5 L19.5 5.5 V11.5 Q19.5 18 12 21.5 Q4.5 18 4.5 11.5 V5.5 Z',
  cut: 'M4 4 L20 20 M20 4 L4 20 M2.5 15 L9 21.5 M15 21.5 L21.5 15',
  spell: 'M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z',
};
function trdDefs() {
  return `<defs><radialGradient id="trg-stone" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2a1f17"/><stop offset=".62" stop-color="#181210"/><stop offset="1" stop-color="#0e0a08"/></radialGradient>`
    + `<radialGradient id="trg-gold" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#f6e2a2"/><stop offset=".55" stop-color="#c9a24b"/><stop offset="1" stop-color="#7a5b25"/></radialGradient>`
    + `<radialGradient id="trg-free" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#d9e6c8"/><stop offset=".55" stop-color="#9fae7c"/><stop offset="1" stop-color="#4f6650"/></radialGradient>`
    + `<pattern id="trg-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="rgba(8,6,5,.5)"/><line x1="0" y1="0" x2="0" y2="9" stroke="rgba(122,101,80,.28)" stroke-width="2"/></pattern>`
    + Object.keys(TRD_GLYPH).map(k => `<symbol id="trg-g-${k}" viewBox="0 0 24 24"><path d="${TRD_GLYPH[k]}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></symbol>`).join('') + '</defs>';
}
/* 룬 고리: 원을 따라 짧은 획 두세 개로 된 문양 (매번 같은 모양) */
function trdRunes(rm, n) {
  let d = '', s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const BR = [[0, -6, 4, -2], [0, -2, -4, 2], [0, 1, 4, 5], [0, 6, -4, 2], [-3, -6, 3, -6], [0, -6, -4, -2], [0, 2, 4, -2]];
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) * 360 / n; if (n > 24 && i % 6 === 0) continue; const ar = a * Math.PI / 180, rh = [Math.sin(ar), -Math.cos(ar)], th = [Math.cos(ar), Math.sin(ar)];
    const P = (u, w) => trdF(rh[0] * (rm - w) + th[0] * u) + ' ' + trdF(rh[1] * (rm - w) + th[1] * u);
    d += 'M' + P(0, -6) + 'L' + P(0, 6); const k = 1 + Math.floor(rnd() * 2); for (let j = 0; j < k; j++) { const b = BR[Math.floor(rnd() * BR.length)]; d += 'M' + P(b[0], b[1]) + 'L' + P(b[2], b[3]); }
  }
  return d;
}
const trdCircle = (r, cls) => `<circle class="${cls}" r="${trdF(r)}"/>`;
const trdAnnulus = (r0, r1) => `M0 ${trdF(-r1)}A${trdF(r1)} ${trdF(r1)} 0 1 1 0 ${trdF(r1)}A${trdF(r1)} ${trdF(r1)} 0 1 1 0 ${trdF(-r1)}Z` + (r0 > 0 ? `M0 ${trdF(-r0)}A${trdF(r0)} ${trdF(r0)} 0 1 0 0 ${trdF(r0)}A${trdF(r0)} ${trdF(r0)} 0 1 0 0 ${trdF(-r0)}Z` : '');
function trdTicks(r, step, len) { let d = ''; for (let a = 0; a < 360; a += step) { const [x0, y0] = trdXY(a, r), [x1, y1] = trdXY(a, r + len); d += `M${trdF(x0)} ${trdF(y0)}L${trdF(x1)} ${trdF(y1)}`; } return d; }
/* 판(돌판 · 룬 고리 · 고리 경계 · 방향 나눔 · 이름) */
function trdBoard(run, L) {
  const b = L.bounds, U = L.U; let h = `<circle class="dk-stone" r="${trdF(L.disc)}"/>`;
  h += trdCircle(L.disc - 3, 'dk-rim') + trdCircle(L.disc - 22, 'dk-rim2') + `<path class="dk-rune" d="${trdRunes(L.disc - 12.5, 72)}"/>`;
  for (let k = 2; k <= 3; k++) if (!ringOpen(run, k) && b[k] > b[k - 1]) h += `<path class="dk-lock" fill-rule="evenodd" d="${trdAnnulus(b[k - 1], b[k])}"/>`;
  for (const ax of L.axes) { const sa = ax.a + (L.kind === 'p' ? 30 : 60), [x0, y0] = trdXY(sa, 0.6 * U), [x1, y1] = trdXY(sa, L.disc - 24); h += `<line class="dk-spoke" x1="${trdF(x0)}" y1="${trdF(y0)}" x2="${trdF(x1)}" y2="${trdF(y1)}"/>`; } // 방향 사이의 나눔선
  for (let k = 1; k <= 2; k++) if (b[k] < L.disc - 30) h += trdCircle(b[k], 'dk-ring') + trdCircle(b[k] + 4, 'dk-ring2') + `<path class="dk-tick" d="${trdTicks(b[k] + 4, 6, 4)}"/>`;
  h += trdCircle(0.55 * U, 'dk-ring2');
  return h;
}
/* 이름: 방향(바깥 큰 글자 + 고리 경계의 작은 글자), 고리 번호 · 잠김 */
function trdNames(run, L) {
  const tilt = L.kind === 'p' ? (PT_TILT[run.build] || {}) : null, TN = { A: '가까움', B: '보통', C: '멂' }; let h = '';
  for (const ax of L.axes) {
    const [x, y] = trdXY(ax.a, L.lab); const sub = tilt ? TN[tilt[ax.k] || 'B'] : '';
    h += `<text class="tl dl" x="${trdF(x)}" y="${trdF(y)}">${esc(ax.n)}</text>` + (sub ? `<text class="tl dls" x="${trdF(x)}" y="${trdF(y)}" dy="1.25em">${esc(sub)}</text>` : '');
  }
  for (let k = 1; k <= 3; k++) {
    const r0 = L.bounds[k - 1], r1 = L.bounds[k]; if (!(r1 > r0)) continue; const open = ringOpen(run, k); const mid = k === 1 ? Math.max(r0, r1 * 0.5) : (r0 + r1) / 2; const [x, y] = trdXY(L.ringAng, mid);
    h += `<text class="tl rl${open ? '' : ' rlo'}" x="${trdF(x)}" y="${trdF(y)}">${k}고리</text>` + (open ? '' : `<text class="tl rl rlo rls" x="${trdF(x)}" y="${trdF(y)}" dy="1.2em">잠김 · ${trdRingShort(k)}</text>`);
  }
  return h;
}
function trdNodeP(run, L, id, st, o) {
  const T = L.T, n = T.nodes[id], P = L.N[id], sz = P.sz, rl = n.kind !== 'start' && !ringOpen(run, n.ring); let in1 = '';
  if (n.kind === 'start') in1 = `<circle class="bd" r="${sz}"/><circle class="in" r="${sz - 5}"/><text class="sn" y="3.5">시작</text>`;
  else if (n.kind === 'keystone') in1 = `<path class="bd" d="M0 ${-sz}L${sz} 0L0 ${sz}L${-sz} 0Z"/><path class="in" d="M0 ${-sz + 6}L${sz - 6} 0L0 ${sz - 6}L${-sz + 6} 0Z"/><use class="gy" href="#trg-g-${n.dir}" x="-5.5" y="-5.5" width="11" height="11"/>`;
  else if (n.kind === 'notable') in1 = `<circle class="bd" r="${sz}"/><use class="gy" href="#trg-g-${n.dir}" x="-6.5" y="-6.5" width="13" height="13"/>`;
  else in1 = `<circle class="bd" r="${sz}"/>`;
  const gl = st === 'can' || o.cand ? (n.kind === 'keystone' ? `<path class="gl" d="M0 ${-sz - 5}L${sz + 5} 0L0 ${sz + 5}L${-sz - 5} 0Z"/>` : `<circle class="gl" r="${sz + 4}"/>`) : '';
  const fm = st === 'free' ? `<circle class="fm" cx="${trdF(sz * 0.78)}" cy="${trdF(-sz * 0.78)}" r="2.6"/>` : '';
  const kindN = { start: '시작 노드', small: '작은 노드', notable: '중간 노드', keystone: '큰 각인' }[n.kind];
  const lab = `${n.n}, ${kindN}${n.kind === 'start' ? '' : ', ' + PT.dir[n.dir].n + ' ' + n.ring + '고리'}, ${o.cand ? '고를 수 있는 큰 각인 후보' : TRD_STN[st]}${rl ? ', ' + trdRingShort(n.ring) : ''}`;
  return `<g class="tn tn-${n.kind} st-${st}${rl ? ' rlk' : ''}${o.sel ? ' sel' : ''}${o.cand ? ' cand' : ''}${o.will ? ' will' : ''}${o.isNew ? ' tn-new' : ''}" data-a="tnode" data-k="${id}" data-e="${o.mode}" transform="translate(${trdF(P.x)} ${trdF(P.y)})" tabindex="${o.tab ? 0 : -1}" role="button" aria-label="${esc(lab)}"><title>${esc(n.n)}</title><circle class="hit" r="${Math.max(sz + 6, 13)}"/>${gl}${in1}${fm}${o.badge ? `<text class="cb" y="${trdF(-sz - 7)}">${o.badge}</text>` : ''}<circle class="fr" r="${sz + 6}"/></g>`;
}
function trdNodeA(run, L, id, st, o) {
  const A = L.T, n = A.nodes[id], P = L.N[id], sz = P.sz, rl = n.kind !== 'start' && !ringOpen(run, n.ring), small = !!L.tmp; let in1 = '', lab = '';
  if (n.kind === 'start') { in1 = `<circle class="bd" r="${sz}"/><circle class="in" r="${sz - 6}"/><text class="sn" y="-1">시작</text><text class="sn sn2" y="${small ? 8 : 10}">스킬 ${TREE2[run.build].starters.length}</text>`; lab = '시작 스킬, ' + n.d; }
  else if (n.kind === 'skill') {
    const s = skOf(run.p, id) || SK2[id], eq = (run.skills || []).includes(id), mk = s && (s.kind === 'cut' || s.kind === 'spell') ? s.kind : null; let c = ''; try { c = skCost(s); } catch (e) { c = ''; }
    const g = small ? 10 : 13, gy = small ? -9 : -12;
    in1 = (eq ? `<circle class="eqr" r="${sz + 4.5}"/>` : '') + `<circle class="bd" r="${sz}"/>` + (mk ? `<use class="gy" href="#trg-g-${mk}" x="${-g / 2}" y="${gy}" width="${g}" height="${g}"/>` : '') + `<text class="yc" y="${mk ? (small ? 8 : 11) : 4}">${c}</text>`;
    lab = `${n.n}, 스킬${mk ? ' ' + (mk === 'cut' ? '베기' : '주문') : ''}, 유산 ${c}, ${n.br} ${n.ring}고리, ${TRD_STA[st]}${eq ? ', 장착' : ''}`;
  } else {
    const work = run.p && (run.p.aup || []).includes(id); in1 = `<circle class="bd" r="${sz}"/><path class="up" d="M-3.5 1.5L0 -2.5L3.5 1.5"/>`;
    lab = `${n.n}, 강화, ${(SK2[n.on] || {}).n || n.on}에 붙음, ${n.ring}고리, ${TRD_STA[st]}${st === 'own' ? (work ? ', 일함' : ', 그 스킬을 끼우면 일함') : ''}`;
    if (st === 'own' && !work) o.idle = 1;
  }
  const gl = st === 'can' ? `<circle class="gl" r="${sz + 4}"/>` : '';
  return `<g class="tn tn-${n.kind} st-${st}${rl ? ' rlk' : ''}${o.sel ? ' sel' : ''}${o.idle ? ' idle' : ''}${n.kind === 'skill' && (run.skills || []).includes(id) ? ' eq' : ''}${o.isNew ? ' tn-new' : ''}" data-a="tnode" data-k="${id}" data-e="a" transform="translate(${trdF(P.x)} ${trdF(P.y)})" tabindex="${o.tab ? 0 : -1}" role="button" aria-label="${esc(lab + (rl ? ', ' + trdRingShort(n.ring) : ''))}"><title>${esc(n.n)}</title><circle class="hit" r="${Math.max(sz + 6, 13)}"/>${gl}${in1}<circle class="fr" r="${sz + 7}"/></g>`;
}
function trdSvg(run, mode, L, v, sel, opt) {
  const kind = L.kind, T = L.T, ids = Object.keys(L.N), stOf = id => kind === 'p' ? trdStP(run, id, T) : trdStA(run, id), ST = {}; for (const id of ids) { ST[id] = stOf(id); if (mode === 'k' && ST[id] === 'can') ST[id] = 'view'; } // 큰 각인 고르기에서는 찍지 않는다(배분 흐름의 단계 잠금)
  const isOpen = id => ['open', 'own', 'free', 'ks'].includes(ST[id]), jn = G.tjust && G.tjust.e === kind ? G.tjust.id : null;
  const offer = mode === 'k' ? ((opt && opt.offer) || []) : [], will = {}, kp = [];
  if (mode === 'k') { // 후보마다 덤으로 열릴 길: 열린 이웃 → 길 → 큰 각인 자리
    const open = ptOpenIds(run);
    offer.forEach(kid => { const c = ksInfo(run, kid); if (!c) return; const path = c.path.filter(x => !open.includes(x)); const first = path[0] || kid; const st0 = T.nodes[first].links.filter(x => open.includes(x)).sort()[0]; const pts = (st0 ? [st0] : []).concat(path, [kid]); kp.push({ kid, pts, on: kid === sel }); if (kid === sel) for (const x of path) will[x] = 1; });
  }
  let lk = '', lkr = '';
  for (const l of L.links) {
    const A = L.N[l.a], B = L.N[l.b], oa = isOpen(l.a), ob = isOpen(l.b), rl = (T.nodes[l.a].ring > 1 && !ringOpen(run, T.nodes[l.a].ring)) || (T.nodes[l.b].ring > 1 && !ringOpen(run, T.nodes[l.b].ring));
    let c = oa && ob ? (ST[l.a] === 'free' || ST[l.b] === 'free' || ST[l.a] === 'ks' || ST[l.b] === 'ks' ? 'lk-fr' : 'lk-on') : (oa && ST[l.b] === 'can') || (ob && ST[l.a] === 'can') ? 'lk-can' : 'lk';
    if (rl && c === 'lk') c += ' lk-rl'; if (l.sat) c += ' lk-sat'; const nw = jn && (l.a === jn || l.b === jn) && oa && ob ? ' lk-new' : '';
    let d; if (l.arc) { const R = A.rad, sw = ((B.a - A.a + 360) % 360) < 180 ? 1 : 0; d = `M${trdF(A.x)} ${trdF(A.y)}A${trdF(R)} ${trdF(R)} 0 0 ${sw} ${trdF(B.x)} ${trdF(B.y)}`; } else d = `M${trdF(A.x)} ${trdF(A.y)}L${trdF(B.x)} ${trdF(B.y)}`;
    const s = `<path class="${c}${nw}" d="${d}"${nw ? ' pathLength="1"' : ''}/>`; if (c.startsWith('lk-on') || c.startsWith('lk-fr')) lkr += s; else lk += s;
  }
  let kph = ''; for (const p of kp) { const d = p.pts.map((x, i) => (i ? 'L' : 'M') + trdF(L.N[x].x) + ' ' + trdF(L.N[x].y)).join(''); kph += `<path class="kp${p.on ? ' on' : ''}" d="${d}"/>`; }
  const tabId = sel && L.N[sel] ? sel : (offer[0] || ids.find(x => ST[x] === 'can') || 'S');
  let nodes = '', labs = '';
  const order = ids.slice().sort((a, b) => (a === sel) - (b === sel)); // 고른 노드를 맨 위에
  for (const id of order) {
    const n = T.nodes[id], P = L.N[id], ci = offer.indexOf(id), o = { mode, sel: id === sel, tab: id === tabId, cand: ci >= 0, badge: ci >= 0 ? String(ci + 1) : '', will: !!will[id], isNew: id === jn };
    nodes += kind === 'p' ? trdNodeP(run, L, id, ST[id], o) : trdNodeA(run, L, id, ST[id], o);
    if (n.kind === 'start') continue;
    // 배율이 낮으면 큰 각인 · 연 중간 노드 · 스킬만, 높을수록 더 (겹치는 것은 trdCull이 숨긴다)
    const open = ['own', 'free', 'ks'].includes(ST[id]), q = id === sel || o.cand || n.kind === 'keystone' || (n.kind === 'notable' && open) ? 'q0' : kind === 'p' ? (n.kind === 'small' ? (open ? 'q2' : 'q3') : 'q1') : (n.kind === 'skill' ? (L.tmp ? 'q15' : 'q0') : 'q3');
    // 겹치면 숨길 때의 순서: 고른 노드 · 후보 → 큰 각인 → 연 중간 노드 · 스킬 → 중간 노드 → 연 작은 노드 · 강화 → 나머지
    const pr = id === sel || o.cand ? 0 : n.kind === 'keystone' ? 1 : (n.kind === 'notable' || n.kind === 'skill') ? (open ? 2 : 3) : open ? 4 : 5;
    labs += `<text class="tl nl ${q}${n.kind === 'keystone' || n.kind === 'skill' ? ' nlk' : ''}${ST[id] === 'lock' && !o.cand ? ' nll' : ''}" x="${trdF(P.x)}" y="${trdF(P.y + P.sz + 4)}" data-p="${pr}" data-w="${trdTW(n.n)}">${esc(n.n)}</text>`;
  }
  const vk = trdVk(run, mode), nm = kind === 'p' ? '패시브 트리' : '액티브 트리';
  return `<svg class="trd-svg" data-vk="${esc(vk)}" data-e="${mode}" viewBox="${trdF(-L.vb)} ${trdF(-L.vb)} ${trdF(2 * L.vb)} ${trdF(2 * L.vb)}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="${nm} 그림. 화살표 키로 노드를 옮겨 다니고 Enter로 고르거나 찍습니다. Esc는 설명을 닫습니다." style="--tu:1">${trdDefs()}<g class="trd-vp" transform="translate(${trdF(v.x)} ${trdF(v.y)}) scale(${Math.round(v.k * 1000) / 1000})">${trdBoard(run, L)}<g class="trd-lk">${lk}${lkr}</g><g class="trd-kp">${kph}</g><g class="trd-nodes">${nodes}</g><g class="trd-labs" aria-hidden="true">${trdNames(run, L)}${labs}</g></g></svg>`;
}
/* ---- 설명 칸 ---- */
function trdBtnRow(b) { return b ? `<div class="row trd-act">${b}</div>` : ''; }
function trdInfoP(run, id, mode, opt) {
  const T = ptBuild(run.build), n = T.nodes[id]; if (!n) return '';
  const st0 = trdStP(run, id, T), st = mode === 'k' && st0 === 'can' ? 'view' : st0, edit = treeCanEdit(), why = st === 'lock' || st === 'near' ? ptWhy(run, id) : null, cand = mode === 'k' && ((opt && opt.offer) || []).includes(id);
  const kindN = { start: '시작 노드', small: '작은 노드', notable: '중간 노드', keystone: '큰 각인' }[n.kind] + (n.kind === 'notable' ? (n.pool === 'common' ? ' · 공용' : ' · 직업') : n.kind === 'keystone' && n.pool === 'class' ? ' · 직업' : '');
  const ico = n.kind === 'keystone' ? '◆' : n.kind === 'notable' ? '◉' : n.kind === 'start' ? '✶' : '○';
  let h = `<div class="trd-ih"><b>${ico} ${esc(n.n)}</b><button class="sm trd-x" data-a="tsel" data-k="" data-e="${mode}" aria-label="설명 닫기">✕</button></div><p class="mini">${kindN}${n.kind === 'start' ? '' : ' · ' + esc(PT.dir[n.dir].n) + ' · ' + n.ring + '고리'}${n.kind === 'small' || n.kind === 'notable' ? ' · 포인트 ' + n.cost : ''}</p>`;
  if (n.kind === 'start') h += `<p>${esc(n.d)}: ${Object.entries(n.stat || {}).map(([k, x]) => esc(STATN[k]) + ' ' + x).join(' · ')}</p>`;
  else if (n.kind !== 'small') h += `<p>${esc(n.d || '')}</p>${n.pay ? `<p class="no">대가: ${esc(n.pay)}</p>` : ''}`;
  else h += `<p>${esc(n.d || n.n)}</p>`;
  if (cand) {
    const c = ksInfo(run, id) || { d: 0, path: [] }, open = ptOpenIds(run), fr = c.path.filter(x => !open.includes(x)), nn = fr.filter(x => T.nodes[x].kind === 'notable').map(x => T.nodes[x].n);
    h += `<p class="trd-st st-cand">고를 수 있는 큰 각인 후보</p><p class="mini">길 ${fr.length}칸 덤${nn.length ? ' · 덤으로 열리는 중간 노드: ' + nn.map(esc).join(', ') : ''} (찍은 곳에서 ${c.d}칸)</p>` + trdBtnRow(`<button class="gold" data-a="kspick" data-k="${id}">이것을 고른다</button>`);
    return h;
  }
  h += `<p class="trd-st st-${st}">${TRD_STN[st]}${!ringOpen(run, n.ring) ? ' · ' + trdRingShort(n.ring) : ''}</p>`;
  if (why && !(st === 'near' && !edit)) h += `<p class="mini">${esc(why)}</p>`;
  if (st === 'free') h += '<p class="mini">큰 각인을 고를 때 길 덤으로 열렸습니다. 포인트를 쓰지 않았고, 상점 되돌리기에도 남습니다.</p>';
  if (st === 'ks') h += '<p class="mini">챕터 보상으로 얻었습니다. 상점 되돌리기에도 남습니다.</p>';
  if (!edit && n.kind !== 'start' && st !== 'own' && st !== 'free' && st !== 'ks') h += `<p class="mini">${G.run && !G.creating && runOver(G.run) ? '끝난 캐릭터의 트리는 볼 수만 있습니다.' : '전투 중에는 볼 수만 있습니다.'}</p>`;
  let b = '';
  if (st === 'can' && edit) b += `<button class="gold" data-a="ptbuy" data-k="${id}" data-e="${mode}">찍기 · 포인트 ${n.cost}</button>`;
  if (st === 'own' && allocStep(run) === 'p') b += `<button data-a="ptref" data-k="${id}" data-e="${mode}">되돌리기</button>`;
  else if (st === 'own') h += '<p class="mini">한 칸씩 되돌리기는 캐릭터를 만들거나 옮기는 화면에서만 됩니다. 그 밖에는 상점에서 모두 되돌립니다.</p>';
  return h + trdBtnRow(b);
}
function trdInfoA(run, id) {
  const A = atBuild(run.build), n = A.nodes[id]; if (!n) return ''; const st = trdStA(run, id), edit = treeCanEdit(), why = st === 'lock' || st === 'near' ? atWhy(run, id) : null; const eqd = run.skills || [];
  let h = '', b = '';
  if (n.kind === 'start') {
    h = `<div class="trd-ih"><b>✶ 시작 스킬</b><button class="sm trd-x" data-a="tsel" data-k="" data-e="a" aria-label="설명 닫기">✕</button></div><p class="mini">항상 장착 · 트리 가운데</p>` + TREE2[run.build].starters.map(sid => { const s = skOf(run.p, sid) || SK2[sid]; return `<p><b>${esc(s.n)}</b> <span class="mini">유산 ${skCost(s)} · ${esc(skHead(s))}</span><br><span class="mini">${esc(skBody(s))}</span></p>`; }).join('');
    return h;
  }
  if (n.kind === 'skill') {
    const s = skOf(run.p, id) || SK2[id], eq = eqd.includes(id), mk = s.kind === 'cut' ? '⚔ ' : s.kind === 'spell' ? '✦ ' : '';
    h = `<div class="trd-ih"><b>${mk}${esc(n.n)}</b><button class="sm trd-x" data-a="tsel" data-k="" data-e="a" aria-label="설명 닫기">✕</button></div><p class="mini">스킬 · 유산 ${skCost(s)} · ${esc(n.br)} · ${n.ring}고리 · 포인트 ${n.cost}</p><p class="mini">${esc(skHead(s))}</p><p>${esc(skBody(s))}</p>`;
    const ups = n.links.filter(x => A.nodes[x] && A.nodes[x].kind === 'upgrade');
    if (ups.length) h += `<p class="mini">강화: ${ups.map(u => esc(A.nodes[u].n) + (run.atree.own.includes(u) ? ' (열림)' : '')).join(', ')}</p>`;
    h += `<p class="trd-st st-${st}">${TRD_STA[st]}${eq ? ' · 장착' : ''}${!ringOpen(run, n.ring) ? ' · ' + trdRingShort(n.ring) : ''}</p>`;
    if (st === 'own' && edit) b += !eq && eqd.length >= EQUIP_SLOTS2 ? `<button data-a="ateq" data-k="${id}" data-e="a" aria-disabled="true" data-why="장착 칸이 가득 찼습니다. 먼저 하나를 빼 주세요">장착 칸이 가득 참 · ${eqd.length}/${EQUIP_SLOTS2}</button>` : `<button class="${eq ? '' : 'gold'}" data-a="ateq" data-k="${id}" data-e="a">${eq ? '빼기' : '장착'} · ${eqd.length}/${EQUIP_SLOTS2}</button>`;
  } else {
    const on = SK2[n.on] || { n: n.on }, work = run.p && (run.p.aup || []).includes(id);
    h = `<div class="trd-ih"><b>✚ ${esc(n.n)}</b><button class="sm trd-x" data-a="tsel" data-k="" data-e="a" aria-label="설명 닫기">✕</button></div><p class="mini">강화 · ${esc(on.n)}에 붙음 · ${n.ring}고리 · 포인트 ${n.cost}</p><p>${esc(n.d)}</p>`;
    h += `<p class="trd-st st-${st}${st === 'own' && !work ? ' idle' : ''}">${TRD_STA[st]}${st === 'own' ? (work ? ' · 일함' : ' · ' + esc(on.n) + '을(를) 끼우면 일함') : ''}${!ringOpen(run, n.ring) ? ' · ' + trdRingShort(n.ring) : ''}</p>`;
  }
  if (why && !(st === 'near' && !edit)) h += `<p class="mini">${esc(why)}</p>`;
  if (!edit && st !== 'own') h += `<p class="mini">${G.run && !G.creating && runOver(G.run) ? '끝난 캐릭터의 트리는 볼 수만 있습니다.' : '전투 중에는 볼 수만 있습니다.'}</p>`;
  if (st === 'can' && edit) b = `<button class="gold" data-a="atbuy" data-k="${id}" data-e="a">열기 · 포인트 ${n.cost}</button>` + b;
  if (st === 'own' && allocStep(run) === 'a') b += `<button data-a="atref" data-k="${id}" data-e="a">되돌리기</button>`;
  return h + trdBtnRow(b);
}
/* 능력치 합계 (패시브, 옆 칸 또는 아래 접는 칸) */
function vStatTable(run) {
  const src = ptStatSrc(run), sm = ptSmall(run), tot = ptStats(run);
  const rows = STAT_KEYS.map(k => { const parts = [['시작', src.start[k]], ['노드', src.own[k]], ['길 덤', src.free[k]]].filter(x => x[1]).map(x => x[0] + ' ' + x[1]); return `<tr><th scope="row">${esc(STATN[k])}</th><td><b>${tot[k] || 0}</b></td><td class="mini">${parts.join(' + ') || '없음'}</td></tr>`; }).join('');
  return `<table class="trd-tbl"><caption class="sr">능력치 합계</caption><tbody>${rows}</tbody></table><p class="mini">작은 노드 효과: 주는 붕괴 +${Math.round((Math.pow(1 + PT.smallBrk, sm.brk) - 1) * 100)}% (제어 ${sm.brk}칸) · 스태미나 +${sm.st * PT.smallSt} (계승 ${sm.st}칸)</p>`;
}
const trdWide = () => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 900px)').matches;
/* 그림 읽는 법 (10월 17일 다듬기: 만든 사람 "읽는 법이 눈에 안 들어온다"): 모양 · 상태 두 묶음, 큰 그림 · 굵은 이름 · 한 줄 풀이, 조작은 따로 */
function trdLegend(mode) {
  const ic = (cls, inner) => `<svg class="trd-li" viewBox="-13 -13 26 26" aria-hidden="true"><g class="tn ${cls}">${inner}</g></svg>`, c = r => `<circle class="bd" r="${r}"/>`, dm = s => `<path class="bd" d="M0 ${-s}L${s} 0L0 ${s}L${-s} 0Z"/>`;
  const it = (i, n, d) => `<li>${i}<span><b>${n}</b>${d ? '<small>' + d + '</small>' : ''}</span></li>`;
  const grp = (h, xs) => `<section><h5>${h}</h5><ul>${xs.join('')}</ul></section>`;
  let shape, state, extra = [];
  if (mode === 'a') {
    shape = [it(ic('tn-skill st-own', c(9)), '스킬', '큰 원. 숫자는 유산 비용, ⚔ 베기 · ✦ 주문'), it(ic('tn-upgrade st-own', c(5.5)), '강화', '스킬 곁의 작은 노드. 그 스킬을 바꾼다')];
    state = [it(ic('tn-skill st-own eq', `<circle class="eqr" r="11.5"/>${c(9)}`), '장착함', '굵은 테'), it(ic('tn-skill st-own', c(9)), '열림', '밝은 금색'), it(ic('tn-skill st-can', c(9)), '열 수 있음', '테가 빛남'), it(ic('tn-upgrade st-own idle', c(5.5)), '쉬는 강화', '그 스킬을 끼우면 일함'), it(ic('tn-skill st-lock', c(9)), '잠김', '앞 노드를 먼저'), it(ic('tn-skill st-lock rlk', c(9)), '고리 잠김', '챕터를 넘기면 열림')];
  } else {
    shape = [it(ic('tn-small st-own', c(5.5)), '작은 노드', '능력치 +2 같은 작은 몫'), it(ic('tn-notable st-own', c(9)), '중간 노드', '효과가 붙은 노드'), it(ic('tn-keystone st-own', dm(10)), '큰 각인', '챕터를 깨면 셋 중 하나를 고름')];
    state = [it(ic('tn-notable st-own', c(9)), '찍음', '밝은 금색 · 금빛 선'), it(ic('tn-notable st-can', c(9)), '찍을 수 있음', '테가 빛남'), it(ic('tn-notable st-free', c(9) + '<circle class="fm" cx="6" cy="-6" r="3"/>'), '길 덤', '큰 각인을 고를 때 무료로 열림. 되돌려도 남음'), it(ic('tn-notable st-near', c(9)), '포인트 부족', '이웃이지만 포인트가 없음'), it(ic('tn-notable st-lock', c(9)), '잠김', '찍은 노드와 이어지지 않음'), it(ic('tn-notable st-lock rlk', c(9)), '고리 잠김', '챕터를 넘기면 열림')];
    if (mode === 'k') extra = [grp('큰 각인 고르기', [it(ic('tn-keystone cand', dm(10)), '후보', '빛나는 ◆ 셋'), it('<svg class="trd-li" viewBox="-13 -13 26 26" aria-hidden="true"><path class="kp on" d="M-11 6L0 -3L11 6"/></svg>', '덤으로 열릴 길', '고르면 포인트 없이 열림')])];
  }
  return `<details class="trd-leg"${trdWide() ? ' open' : ''}><summary>그림 읽는 법 · 모양과 상태</summary><div class="trd-lg">${grp('모양', shape)}${grp('상태', state)}${extra.join('')}</div><p class="trd-lgk"><b>조작</b> 끌어서 옮기기 · 확대는 Ctrl(⌘) + 휠, 터치패드 오므리기, 두 손가락, ＋ － 단추 · 노드를 누르면 설명 · 키보드: 화살표로 옮기고 Enter로 고르기와 찍기, Esc로 닫기</p></details>`;
}
/* 한 장: 지도(그림 + 확대 단추) · 설명 칸 · 능력치(패시브) · 읽는 법 */
function trdView(run, mode, opt) {
  const kind = mode === 'a' ? 'a' : 'p', L = kind === 'p' ? trdLayP(run.build) : trdLayA(run.build), v = trdVw(run, mode, L, opt), sel = trdSelOf(run, mode, L, opt);
  const info = sel ? (kind === 'p' ? trdInfoP(run, sel, mode, opt) : trdInfoA(run, sel)) : '';
  const empty = `<p class="mini">${mode === 'k' ? '빛나는 ◆ 셋이 후보입니다. 하나를 누르면 덤으로 열릴 길이 보입니다.' : '노드를 누르면 이름 · 효과 · 상태가 여기에 보입니다.'}</p>`;
  const stats = kind === 'p' && mode !== 'k' ? `<details class="trd-stats"${trdWide() || G.tstatOpen ? ' open' : ''}><summary>능력치 합계</summary>${vStatTable(run)}</details>` : '';
  const ctl = `<div class="trd-ctl" role="group" aria-label="확대와 이동"><button class="sm" data-a="tzoom" data-k="in" data-e="${mode}" aria-label="확대">＋</button><button class="sm" data-a="tzoom" data-k="out" data-e="${mode}" aria-label="축소">－</button><button class="sm" data-a="tzoom" data-k="fit" data-e="${mode}" aria-label="전체 보기">전체</button></div>`;
  const nt = G.tnote && Date.now() - G.tnote.t < 4000 ? `<div class="trd-note" aria-hidden="true" style="animation-delay:-${Date.now() - G.tnote.t}ms">${esc(G.tnote.m)}</div>` : '';
  return `<div class="trd trd-${mode}${sel ? ' has-sel' : ''}"><div class="trd-map">${trdSvg(run, mode, L, v, sel, opt)}${ctl}${nt}<div class="trd-hint" aria-hidden="true">Ctrl(⌘) + 휠로 확대합니다</div></div><div class="trd-info${sel ? '' : ' empty'}" role="region" aria-label="노드 설명">${info || empty}</div>${stats}${trdLegend(mode)}</div>`;
}
/* 트리 화면(트리 페이지 · 배분 흐름 · 큰 각인 창)의 알림은 그림 구석의 한 줄로 (toast가 부른다). 화면 읽기는 #live가 그대로 읽는다 */
const trdScreen = () => typeof G !== 'undefined' && (G.scr === 'tree' || !!(G.sheet && ['alloc', 'ks'].includes(G.sheet.kind)));
function trdToast(m) {
  if (typeof document === 'undefined' || !trdScreen()) return false; const t = fixJosa(m); liveSay(t); G.toastLog = (G.toastLog || []).concat([{ m: t, at: Date.now() }]).slice(-20); G.tnote = { m: t, t: Date.now() };
  for (const e of document.querySelectorAll('.trd-map')) { let n = e.querySelector('.trd-note'); if (!n) { n = document.createElement('div'); n.className = 'trd-note'; n.setAttribute('aria-hidden', 'true'); e.appendChild(n); } n.textContent = t; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; n.style.animationDelay = '0ms'; }
  return true;
}
const trdListBtn = () => { const on = !!(G.data && G.data.treeList); return `<button class="sm trd-lt" data-a="tlist" aria-pressed="${on}">목록으로 보기</button>`; };
const trdListOn = () => !!(G.data && G.data.treeList);
/* ---- 다루기: 끌기 · 두 손가락 · 휠 · 단추 · 키보드 ---- */
const TRDP = { pts: new Map(), drag: null, pinch: null, sup: 0 };
const trdSvgOf = el => el && el.closest ? el.closest('.trd-svg') : null;
function trdCur(svg) { G.tvw = G.tvw || {}; return G.tvw[svg.dataset.vk] || (G.tvw[svg.dataset.vk] = { k: 1, x: 0, y: 0 }); }
function trdHalf(svg) { const vb = svg.viewBox && svg.viewBox.baseVal; return vb ? vb.width / 2 : 500; }
function trdApply(svg, v) {
  const R = trdHalf(svg), lim = v.k * R * 0.92; v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.max(-lim, Math.min(lim, v.y));
  const g = svg.querySelector('.trd-vp'); if (g) g.setAttribute('transform', `translate(${trdF(v.x)} ${trdF(v.y)}) scale(${Math.round(v.k * 1000) / 1000})`); trdScale(svg, v);
}
function trdScale(svg, v) { // 글자는 확대와 상관없이 같은 크기, 확대할수록 이름이 더 보인다
  const m = svg.getScreenCTM ? svg.getScreenCTM() : null; const s = (m ? m.a : 1) * v.k; if (!(s > 0)) return;
  svg.style.setProperty('--tu', (1 / s).toFixed(4)); svg.classList.toggle('s1', s >= 0.5); svg.classList.toggle('s15', s >= 0.78); svg.classList.toggle('s2', s >= 0.95); svg.classList.toggle('s3', s >= 1.9);
  trdCull(svg, s);
}
/* 이름 겹침 없애기: 배율에 맞는 이름만 남기고, 앞 순서의 이름 · 방향 이름 · 고리 글자와 겹치는 것은 숨긴다 */
function trdCull(svg, s) {
  const L = [...svg.querySelectorAll('.trd-labs .nl')], keep = [], pad = 2 / s, h = 14 / s;
  for (const t of svg.querySelectorAll('.trd-labs .dl')) { const x = +t.getAttribute('x'), y = +t.getAttribute('y'), w = 70 / s; keep.push([x - w / 2, y - 18 / s, x + w / 2, y + 22 / s]); }
  for (const t of svg.querySelectorAll('.trd-labs .rl')) { const x = +t.getAttribute('x'), y = +t.getAttribute('y'), w = trdTW(t.textContent) * 1.1 / s, d = t.classList.contains('rls') ? 17 / s : 0; keep.push([x - w / 2, y - 9 / s + d, x + w / 2, y + 9 / s + d]); } // 고리 번호 · 잠김 글자
  const it = L.map(t => { const q = [...t.classList].find(c => TRD_Q[c] != null) || 'q0'; return { t, ok: s >= TRD_Q[q], p: +t.dataset.p || 0, x: +t.getAttribute('x'), y: +t.getAttribute('y'), w: (+t.dataset.w || 40) / s }; }).sort((a, b) => a.p - b.p || a.y - b.y);
  for (const o of it) {
    let show = o.ok; const b = [o.x - o.w / 2 - pad, o.y - pad, o.x + o.w / 2 + pad, o.y + h + pad];
    if (show && o.p > 0) show = !keep.some(k => b[0] < k[2] && b[2] > k[0] && b[1] < k[3] && b[3] > k[1]);
    if (show) keep.push(b); o.t.classList.toggle('cull', !show);
  }
}
function trdClientToVb(svg, cx, cy) { const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const q = p.matrixTransform(m.inverse()); return { x: q.x, y: q.y }; }
function trdZoomAt(svg, f, cx, cy) {
  const v = trdCur(svg), k1 = Math.max(TRD_KMIN, Math.min(TRD_KMAX, v.k * f)); if (k1 === v.k) return; const P = trdClientToVb(svg, cx, cy);
  v.x = P.x - (P.x - v.x) * (k1 / v.k); v.y = P.y - (P.y - v.y) * (k1 / v.k); v.k = k1; trdApply(svg, v);
}
function trdCenterOf(svg) { const r = svg.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
/* 고른 노드가 지도 밖이나(휴대폰) 아래 설명 칸 뒤에 있으면 보이는 곳으로 옮긴다 */
function trdReveal(svg, el, lowCut) {
  if (!svg || !el) return; const r = svg.getBoundingClientRect(), n = el.getBoundingClientRect(), m = svg.getScreenCTM(); if (!m) return; const v = trdCur(svg);
  const cx = n.left + n.width / 2, cy = n.top + n.height / 2; let dx = 0, dy = 0; const pad = 30;
  if (cx < r.left + pad || cx > r.right - pad) dx = r.left + r.width / 2 - cx;
  const yMax = r.top + r.height * (lowCut || 1) - pad; if (cy < r.top + pad || cy > yMax) dy = r.top + r.height * (lowCut ? lowCut * 0.6 : 0.5) - cy;
  if (dx || dy) { v.x += dx / m.a; v.y += dy / m.a; trdApply(svg, v); }
}
function trdSelect(mode, id, el) {
  G.tsel = G.tsel || {}; G.tsel[mode] = id;
  if (el && id) { G.tfocus = { e: mode, k: id }; if (!trdWide()) G.tpan = { e: mode, k: id }; }
  render();
}
/* 단추 · 노드 누르기 (80-events.js의 onClick이 부른다) */
function trdClick(a, el) {
  const mode = el.dataset.e || 'p';
  if (a === 'tnode') { trdSelect(mode, el.dataset.k, el); return; }
  if (a === 'tsel') { const id = el.dataset.k || null; G.tsel = G.tsel || {}; if (!id) { G.tsel[mode] = mode === 'k' ? '' : null; render(); return; } const svg = document.querySelector(`.trd-svg[data-e="${mode}"]`); const n = svg && svg.querySelector(`.tn[data-k="${id}"]`); if (n && trdWide()) trdReveal(svg, n, 0); G.tsel[mode] = id; G.tfocus = { e: mode, k: id }; if (!trdWide()) G.tpan = { e: mode, k: id }; render(); const m = document.querySelector('.trd-' + mode + ' .trd-map'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'nearest', behavior: smoothB() }); return; }
  if (a === 'tzoom') {
    const svg = document.querySelector(`.trd-svg[data-e="${mode}"]`); if (!svg) return; const v = trdCur(svg);
    if (el.dataset.k === 'fit') { v.k = 1; v.x = 0; v.y = 0; trdApply(svg, v); return; }
    const [cx, cy] = trdCenterOf(svg); trdZoomAt(svg, el.dataset.k === 'in' ? 1.4 : 1 / 1.4, cx, cy); return;
  }
  if (a === 'tlist') { G.data.treeList = !G.data.treeList; saveLocal(); render(); }
}
/* 다시 그린 뒤 (76-sound-render.js의 render 끝): 글자 크기 · 초점 */
function trdAfter() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.trd-svg').forEach(svg => { const v = G.tvw && G.tvw[svg.dataset.vk]; if (v) trdScale(svg, v); });
  if (G.tfocus) { const f = G.tfocus; G.tfocus = null; const el = document.querySelector(`.tn[data-e="${f.e}"][data-k="${f.k}"]`); if (el && document.activeElement !== el) { if (typeof POP !== 'undefined') POP.mute = true; try { el.focus({ preventScroll: true }); } finally { if (typeof POP !== 'undefined') POP.mute = false; } } }
  if (G.tpan) { const f = G.tpan; G.tpan = null; trdCenterAbove(f.e, f.k); }
  G.tjust = null;
}
/* 휴대폰: 고른 노드를 설명 칸 위에 보이는 곳의 가운데로 옮긴다(닫을 때는 그대로 둔다) */
function trdCenterAbove(mode, id) {
  const svg = document.querySelector(`.trd-svg[data-e="${mode}"]`), el = svg && svg.querySelector(`.tn[data-k="${id}"]`); if (!el) return; const m = svg.getScreenCTM(); if (!m) return;
  const r = svg.getBoundingClientRect(), box = svg.closest('.trd'), info = box && box.querySelector('.trd-info:not(.empty)'), ir = info ? info.getBoundingClientRect() : null;
  const bottom = ir && ir.top > r.top && ir.top < r.bottom ? ir.top : r.bottom, n = el.getBoundingClientRect(), v = trdCur(svg);
  v.x += (r.left + r.width / 2 - (n.left + n.width / 2)) / m.a; v.y += ((r.top + bottom) / 2 - (n.top + n.height / 2)) / m.a; trdApply(svg, v);
}
/* 화살표: 그 방향에서 가장 가까운 노드 (화면 자리로) */
function trdNext(node, key) {
  const svg = trdSvgOf(node); if (!svg) return null; const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key]; if (!dir) return null;
  const me = node.getBoundingClientRect(), cx = me.left + me.width / 2, cy = me.top + me.height / 2; let best = null, bs = Infinity;
  for (const el of svg.querySelectorAll('.tn')) { if (el === node) continue; const r = el.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy, d = Math.hypot(dx, dy); if (d < 1) continue; const c = (dx * dir[0] + dy * dir[1]) / d; if (c < 0.45) continue; const s = d * (2.2 - c * 1.2); if (s < bs) { bs = s; best = el; } }
  return best;
}
function trdKey(ev) {
  const t = ev.target; if (!t || !t.closest) return; const box = t.closest('.trd'); if (!box) return;
  const node = t.closest('.tn'), svg = trdSvgOf(t) || box.querySelector('.trd-svg'), mode = svg ? svg.dataset.e : 'p';
  if (ev.key === 'Escape') { if (G.tsel && G.tsel[mode]) { ev.preventDefault(); ev.stopImmediatePropagation(); const id = G.tsel[mode]; G.tsel[mode] = mode === 'k' ? '' : null; G.tfocus = { e: mode, k: id }; render(); } return; }
  if (!node || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === '+' || ev.key === '=' || ev.key === '-' || ev.key === '_') { ev.preventDefault(); ev.stopImmediatePropagation(); const [cx, cy] = trdCenterOf(svg); trdZoomAt(svg, ev.key === '-' || ev.key === '_' ? 1 / 1.4 : 1.4, cx, cy); return; }
  if (ev.key.indexOf('Arrow') === 0) { ev.preventDefault(); ev.stopImmediatePropagation(); const n = trdNext(node, ev.key); if (n) { if (trdWide()) trdReveal(svg, n, 0); n.focus({ preventScroll: true }); G.tsel = G.tsel || {}; G.tsel[mode] = n.dataset.k; G.tfocus = { e: mode, k: n.dataset.k }; if (!trdWide()) G.tpan = { e: mode, k: n.dataset.k }; render(); } return; }
  if (ev.key === 'Home') { ev.preventDefault(); ev.stopImmediatePropagation(); const s = svg.querySelector('.tn[data-k="S"]') || svg.querySelector('.tn'); if (s) { s.focus({ preventScroll: true }); trdSelect(mode, s.dataset.k, s); } return; }
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault(); ev.stopImmediatePropagation(); const id = node.dataset.k; G.tsel = G.tsel || {};
    if (G.tsel[mode] !== id) { trdSelect(mode, id, node); return; }
    const b = box.querySelector(`.trd-info [data-a="ptbuy"][data-k="${id}"], .trd-info [data-a="atbuy"][data-k="${id}"]`); if (b) { G.tfocus = { e: mode, k: id }; b.click(); }
  }
}
function trdInit() {
  if (typeof document === 'undefined' || !document.addEventListener) return;
  document.addEventListener('keydown', trdKey);
  document.addEventListener('pointerdown', ev => {
    const svg = trdSvgOf(ev.target); if (!svg || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    TRDP.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (TRDP.pts.size === 1) { const v = trdCur(svg); TRDP.drag = { svg, x0: ev.clientX, y0: ev.clientY, vx: v.x, vy: v.y, moved: false }; TRDP.pinch = null; }
    else if (TRDP.pts.size === 2 && TRDP.drag && TRDP.drag.svg === svg) { const [a, b] = [...TRDP.pts.values()]; const v = trdCur(svg); TRDP.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: v.k, last: [(a.x + b.x) / 2, (a.y + b.y) / 2] }; TRDP.drag.moved = true; }
  });
  document.addEventListener('pointermove', ev => {
    const D = TRDP.drag; if (!D || !TRDP.pts.has(ev.pointerId)) return; TRDP.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); const svg = D.svg, m = svg.getScreenCTM(); if (!m) return; const v = trdCur(svg);
    if (TRDP.pinch && TRDP.pts.size >= 2) { const [a, b] = [...TRDP.pts.values()]; const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2]; v.x += (mid[0] - TRDP.pinch.last[0]) / m.a; v.y += (mid[1] - TRDP.pinch.last[1]) / m.a; TRDP.pinch.last = mid; trdApply(svg, v); trdZoomAt(svg, (TRDP.pinch.k0 * Math.hypot(a.x - b.x, a.y - b.y) / TRDP.pinch.d0) / v.k, mid[0], mid[1]); ev.preventDefault(); return; }
    const dx = ev.clientX - D.x0, dy = ev.clientY - D.y0; if (!D.moved && Math.hypot(dx, dy) < 6) return;
    if (!D.moved) { D.moved = true; svg.classList.add('pan'); try { svg.setPointerCapture(ev.pointerId); } catch (e) { } }
    v.x = D.vx + dx / m.a; v.y = D.vy + dy / m.a; trdApply(svg, v); ev.preventDefault();
  });
  const end = ev => {
    if (!TRDP.pts.has(ev.pointerId)) return; TRDP.pts.delete(ev.pointerId); const D = TRDP.drag; if (!D) return;
    if (TRDP.pts.size === 1) { const [p] = [...TRDP.pts.values()]; const v = trdCur(D.svg); D.x0 = p.x; D.y0 = p.y; D.vx = v.x; D.vy = v.y; TRDP.pinch = null; return; }
    if (TRDP.pts.size === 0) { if (D.moved) TRDP.sup = Date.now(); D.svg.classList.remove('pan'); TRDP.drag = null; TRDP.pinch = null; }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('click', ev => { // 끈 뒤의 누르기는 노드를 고르지 않는다. 빈 곳을 누르면 설명을 닫는다
    const svg = trdSvgOf(ev.target); if (!svg) return;
    if (Date.now() - TRDP.sup < 400) { ev.stopPropagation(); ev.preventDefault(); return; }
    if (!ev.target.closest('.tn')) { const mode = svg.dataset.e; if (G.tsel && G.tsel[mode]) { ev.stopPropagation(); G.tsel[mode] = mode === 'k' ? '' : null; render(); } }
  }, true);
  document.addEventListener('wheel', ev => { // 10월 17일 다듬기: 그냥 휠은 페이지를 스크롤한다. Ctrl · ⌘ + 휠(터치패드 오므리기 포함)만 확대
    const svg = trdSvgOf(ev.target); if (!svg) return;
    if (!ev.ctrlKey && !ev.metaKey) { const mp = svg.closest('.trd-map'); if (mp) { mp.classList.add('hint'); clearTimeout(TRDP.hintT); TRDP.hintT = setTimeout(() => mp.classList.remove('hint'), 1400); } return; }
    ev.preventDefault(); const dy = ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY; trdZoomAt(svg, Math.exp(-Math.max(-300, Math.min(300, dy)) * 0.0016), ev.clientX, ev.clientY); }, { passive: false });
  document.addEventListener('toggle', ev => { const d = ev.target; if (d && d.classList && d.classList.contains('trd-stats') && !trdWide()) G.tstatOpen = d.open; }, true);
}
try { trdInit(); } catch (e) { }
/* ---- 화면 묶음: 머리(포인트 · 큰 각인 · 장착 칸) + 그림. 목록형(2단계)은 js/72-skill-tree-screen.js ---- */
function vPTreeRadial(run) {
  const T = ptBuild(run.build), t = run.ptree, ks = t.ks.map(id => T.nodes[id].n);
  return `<div class="tsum"><div class="tpts">패시브 포인트 <b>${t.pts}</b><small>시작 ${PT.pts.start} + 레벨마다 ${PT.pts.lv}${t.bonus ? ' + 보너스 ' + t.bonus : ''}</small></div><div><span class="mini">큰 각인 ${t.ks.length}/${PT.ksN}${ks.length ? ': ' + ks.map(esc).join(', ') : ''}${run.ksPending > 0 ? ' · 고를 것 ' + run.ksPending + '번' : ''}</span></div></div>${T.tmp ? '<p class="mini">이 직업의 패시브 트리는 임시 배치입니다(공용 노드를 기울기대로 채움). 직업 노드는 다음 단계에서 들어옵니다.</p>' : ''}` + trdView(run, 'p');
}
function vATreeRadial(run) {
  const A = atBuild(run.build), a = run.atree, T2 = TREE2[run.build], eqd = run.skills || [];
  const st = T2.starters.map(id => `<span class="tslot on">${esc(SK2[id].n)} <small>유산 ${skCost(skOf(run.p, id))}</small></span>`).join('');
  const slots = Array.from({ length: EQUIP_SLOTS2 }, (_, i) => eqd[i] && SK2[eqd[i]] ? `<button class="tslot on" data-a="ateq" data-k="${eqd[i]}" aria-label="${esc(SK2[eqd[i]].n)} 빼기">${esc(SK2[eqd[i]].n)} ✕</button>` : `<span class="tslot">빈 칸</span>`).join('');
  return `<div class="tsum"><div class="tpts">액티브 포인트 <b>${a.pts}</b><small>시작 ${AT_PTS.start} + 레벨마다 ${AT_PTS.lv}</small></div><div><span class="mini">시작 스킬 · 항상 장착</span><div class="trow">${st}</div></div><div><span class="mini">장착 ${eqd.length}/${EQUIP_SLOTS2}</span><div class="trow">${slots}</div>${hunterLoadoutHint(run)}</div></div>${A.tmp ? '<p class="mini">이 직업의 액티브 트리는 임시 배치입니다(지금 스킬 칸을 갈래 · 줄 순서로 이음, 강화 노드 없음).</p>' : ''}` + trdView(run, 'a');
}
const vPTreeAny = run => trdListOn() ? vPTreeList(run) : vPTreeRadial(run);
const vATreeAny = run => trdListOn() ? vATreeList(run) : vATreeRadial(run);
