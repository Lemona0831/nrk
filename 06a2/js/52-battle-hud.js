'use strict';
function incHtml(b) {
  if (b.over) return ''; const x = incomingEst(b); if (!x.n) return `<div class="incoming calm">🕊️ 다음 차례 전에 맞을 공격이 없습니다</div>`;
  const bad = x.sum >= b.p.hp * 0.5 ? ' bad' : ''; const left = Math.max(0, b.p.hp - x.sum);
  return `<div class="incoming${bad}" data-info="incoming" tabindex="0"><i class="swd" aria-hidden="true"></i>다음 차례 전 예상 피해 <b>−${r1(x.sum)}</b> <span class="inca" aria-hidden="true">생명력 ${shownHp(b.p.hp)} → ${shownHp(left)}${x.sum >= b.p.hp ? ' (쓰러질 수 있음)' : ''}</span><span class="sr">, 맞으면 생명력 ${shownHp(left)}${x.sum >= b.p.hp ? ', 쓰러질 수 있음' : ''}</span></div>`;
}
/* 예상 피해의 뜻: 접힌 자세한 정보 안에 둔다(10월 7일 2차: 전에는 늘 숨겨져 있었다) */
function incWhy(b) { if (b.over) return ''; const x = incomingEst(b); return x.n ? `<p class="mini">예상 피해는 공격 ${x.n}번을 보통 행동 기준으로 셉니다. 흘리기와 방어로 줄일 수 있습니다. 생명력 막대의 점 칸이 이 몫입니다.</p>` : ''; }
/* 생명력 증감 숫자: 그리기 사이의 차이를 1.4초 동안 띄운다. 다시 그려도 애니메이션이 이어지게 지난 시간만큼 당겨 시작한다(엔진은 건드리지 않는다) */
const POP_MS = 1400;
/* 피해 숫자(떠올랐다 사라짐)는 dpop. 설명 창(#pop.pop)과 이름이 같으면 설명 창도 1.4초 뒤에 사라진다(10월 3일 고침) */
function popHtml(x) { return `<span class="dpop ${x.d < 0 ? 'hurt' : 'heal'}" style="animation-delay:-${x.el}ms" aria-hidden="true">${x.d < 0 ? '−' : '+'}${r1(Math.abs(x.d))}</span>`; }
function hpPops(b) {
  const us = [b.p].concat(b.en); const key = u => u === b.p ? 'p' : u.id; const out = {}; const now = Date.now();
  if (G.popB !== b) { G.popB = b; G.hpSeen = {}; G.popL = {}; for (const u of us) G.hpSeen[key(u)] = u.hp; return out; }
  for (const u of us) { const k = key(u), was = G.hpSeen[k]; G.hpSeen[k] = u.hp; if (was == null || Math.abs(u.hp - was) < 0.5) continue;
    const q = G.popL[k]; if (q && now - q.at < 500 && Math.sign(q.d) === Math.sign(u.hp - was)) q.d += u.hp - was; else G.popL[k] = { d: u.hp - was, at: now }; } // 잇달아 맞으면 하나로 더한다
  for (const k in G.popL) { const el = now - G.popL[k].at; if (el < POP_MS) out[k] = { d: G.popL[k].d, el }; else delete G.popL[k]; }
  return out;
}
/* 3챕터 열기 칸 (6.6절): 수치, 라운드 끝 오름, 열풍까지 남은 라운드, 이번 라운드 끝 예고 */
function heatHtml(b) {
  const rise = heatRise(b); const warn = b.heatWarn != null && b.heatWarn <= (b.round || 0); const left = rise > 0 ? Math.max(1, Math.ceil((100 - b.heat) / rise)) : 0;
  return `<div class="gimmick heat${b.heat >= HEAT.warn || warn ? ' hot' : ''}" data-info="heat" tabindex="0" role="status"><span aria-hidden="true">🌡️</span> 열기 <b>${Math.round(b.heat)}</b>/100 · +${rise}/라운드 · ${warn ? '<b>' + (queenOf(b) ? '🌪️' : '🌡️') + ' 이번 라운드 끝에 ' + heatName(b) + ' ' + r1(heatStormEst(b)) + '</b>' : left ? '약 ' + left + '라운드' : '오르지 않음'}<span class="heatbar" aria-hidden="true"><i style="width:${Math.min(100, b.heat)}%"></i></span></div>`;
}
/* ===== 전투 화면 표시 (10월 9일 0.6a.2-UI-simple) =====
   HUD 모듈마다 감싸는 요소 하나(data-hud)와 그리는 함수 하나를 둔다. 보일지 말지는 이 표 하나로 정한다.
   d = [간단, 보통, 자세히]. lock이면 끌 수 없고 설정에는 "항상 보임"으로만 나온다. 자세히는 지금까지 화면과 같다 */
const HUD_DEFAULT = 'simple'; /* 새 플레이어 · 값이 없는 옛 저장본의 기본 묶음. 여기 한 곳만 바꾸면 된다 */
const HUD_NAMES = ['simple', 'normal', 'full'];
const HUD_LAB = { simple: '간단', normal: '보통', full: '자세히', custom: '사용자 지정' };
/* 모듈: z = 처음 놓이는 구역(top1 · top2 · mid · bot), lock이면 끌 수 없고 옮기기와 크기만 바꾼다, hm이면 이웃한 모듈과 한 판으로 이어 그린다. 순서는 구역 안 처음 순서 */
const HUD_MODS = [
  { id: 'hud-player', mine: 1, n: '내 상태', fn: 'vHudPlayer', z: 'top1', lock: 1, hm: 1, d: '이름, 플라스크, 생명력 · 스태미나 막대, 자세히 칸' },
  { id: 'hud-classchip', mine: 1, n: '직업 칩', fn: 'vHudClass', z: 'top1', hm: 1, d: '직업 규칙의 자원과 표시' },
  { id: 'hud-incoming', mine: 1, n: '예상 피해', fn: 'vHudIncoming', z: 'top1', hm: 1, d: '다음 차례 전에 맞을 피해 한 줄' },
  { id: 'hud-status', mine: 1, n: '상태 칩', fn: 'vHudStatus', z: 'top1', hm: 1, d: '내게 걸린 상태, 봉인, 화상' },
  { id: 'hud-order', n: '순서', fn: 'vHudOrder', z: 'top2', hm: 1, d: '라운드와 행동 순서, 기록 단추' },
  { id: 'hud-clock', n: '보스 시계와 열기', fn: 'vHudClock', z: 'top2', lock: 1, d: '광폭화까지 남은 라운드, 3챕터 열기' },
  { id: 'hud-banner', n: '차례 알림', fn: 'vHudBanner', z: 'top2', d: '내 차례와 적 행동 알림 한 줄' },
  { id: 'hud-log', n: '기록', fn: 'vRecent', z: 'top2', d: '최근 기록' },
  { id: 'hud-danger', n: '지금 위험', fn: 'vHudDanger', z: 'mid', lock: 1, d: '이번 차례에 답이 필요한 일' },
  { id: 'hud-field', n: '적', fn: 'vHudField', z: 'mid', lock: 1, d: '전열 · 후열과 적 카드' },
  { id: 'hud-quick', n: '소모품', fn: 'consQuick', z: 'bot', d: '지금 쓸 만한 소모품과 가방' },
  { id: 'hud-actions', n: '행동', fn: 'vHudActions', z: 'bot', lock: 1, hm: 1, d: '행동 버튼과 대상, 빠른 칸' },
];
const HUD_ITEMS = [
  { k: 'hpst', mod: 'hud-player', n: '내 생명력과 스태미나', lock: 1 },
  { k: 'ehp', mod: 'hud-field', n: '적의 생명력과 다음 행동 예고', lock: 1 },
  { k: 'abtn', mod: 'hud-actions', n: '행동 버튼(비용과 쿨타임)', lock: 1 },
  { k: 'danger', mod: 'hud-danger', n: '지금 위험 줄', lock: 1 },
  { k: 'sts', mod: 'hud-player', n: '상태 칩', d: ['bad', 'few', 'all'], opts: [['bad', '해로운 것만 3개'], ['few', '3개까지'], ['all', '모두']], desc: '내게 걸린 상태와 적에게 걸린 상태를 칩으로 보입니다. 넘치는 것은 "+N"으로 접힙니다' },
  { k: 'prev', mod: 'hud-player', n: '막대 미리보기', d: [0, 1, 1], desc: '행동에 올리면 생명력 · 스태미나 · 적 막대에 예상 변화를 겹쳐 보입니다' },
  { k: 'inc', mod: 'hud-player', n: '예상 피해 줄', d: [1, 1, 1], desc: '내 다음 차례 전에 받을 피해를 한 줄로 보입니다' },
  { k: 'flk', mod: 'hud-player', n: '플라스크 줄', d: [0, 1, 1], desc: '남은 플라스크 수. 행동 버튼에도 같은 수가 있습니다' },
  { k: 'cls', mod: 'hud-classchip', n: '직업 전용 칩', d: [1, 1, 1], desc: '직업 규칙의 자원과 표시(분노, 교대, 추적 등)' },
  { k: 'edet', mod: 'hud-field', n: '적 카드 상세', d: [0, 1, 1], desc: '붕괴 줄, 움직이는 순번, 레벨, 역할, 작은 표시. 적 카드를 누르면 그 카드만 펼쳐집니다' },
  { k: 'iaux', mod: 'hud-field', n: '예고 보조 숫자', d: [0, 1, 1], desc: '예고 옆의 "×2" 같은 행동 횟수' },
  { k: 'ord', mod: 'hud-order', n: '순서 줄', d: [0, 1, 1], desc: '이번 라운드와 다음 라운드의 행동 순서 전체. 끄면 "내 차례 · 다음 누구"만 보입니다' },
  { k: 'rlog', mod: 'hud-log', n: '최근 기록 띠', d: [1, 1, 1], desc: '방금 일어난 일을 한 줄로 보입니다. 누르면 전체 기록이 열립니다' },
  { k: 'logpanel', mod: 'hud-log', n: '전체 기록 칸', d: [0, 1, 1], desc: '넓은 화면에서 오른쪽에 기록 칸을 늘 보입니다. 끄면 📜 버튼으로 엽니다' },
  { k: 'why', mod: 'hud-log', n: '결과 이유 줄', d: [0, 1, 1], desc: '피해 숫자 아래에 왜 이 숫자인지 한 줄을 붙입니다' },
  { k: 'qcons', mod: 'hud-quick', n: '소모품 빠른 줄', d: [0, 1, 1], desc: '지금 쓸 만한 소모품을 한 번에 누르는 줄. 끄면 도구 칸이나 가방에서 씁니다. Q W E 키는 그대로입니다' },
  { k: 'abaux', mod: 'hud-actions', n: '행동 버튼 보조 글', d: [0, 1, 1], desc: '버튼의 빠르기 표시, 대상, 남은 칸, 진행 속도' },
  { k: 'agl', mod: 'hud-actions', n: '행동 묶음 이름', d: [0, 1, 1], desc: '공격 · 스킬 · 지키기 · 도구 같은 묶음 제목' },
  { k: 'tools', mod: 'hud-actions', n: '도구 칸 접기', d: [1, 0, 0], desc: '플라스크, 소모품, 도망을 한 칸 "도구"로 모읍니다. 누르면 펼쳐집니다' },
];
const HUD_GROUPS = [['항상 보임', ['hpst', 'ehp', 'abtn', 'danger']], ['내 상태', ['sts', 'prev', 'inc', 'flk', 'cls']], ['적', ['edet', 'iaux']], ['순서와 기록', ['ord', 'rlog', 'logpanel', 'why']], ['행동', ['qcons', 'abaux', 'agl', 'tools']]];
let HUDNOW = null; /* 지금 그리는 전투의 표시 값(whyHtml이 읽는다) */
function hudRaw() { const h = G.data && G.data.hud; const p = h && (HUD_NAMES.includes(h.p) || h.p === 'custom') ? h.p : HUD_DEFAULT; return { p, o: (h && h.o && typeof h.o === 'object' && h.o) || {}, lay: h && h.lay && typeof h.lay === 'object' ? h.lay : null }; }
function hudFlags(p, o) {
  const f = { p }; const i = HUD_NAMES.indexOf(p);
  for (const it of HUD_ITEMS) if (!it.lock) f[it.k] = p === 'custom' && o[it.k] != null ? o[it.k] : it.d[i < 0 ? 2 : i];
  return f;
}
function hudCfg() { const h = hudRaw(); return hudFlags(h.p, h.o); }
/* 자세히 칸이 열려 있으면 늘 전부 보인다(숨긴 것에 닿는 길) */
function hudEff(fdo) { return fdo ? hudFlags('full', {}) : hudCfg(); }
function hudPreset(n) { if (!HUD_NAMES.includes(n)) return; G.data.hud = { p: n }; saveLocal(); }
function hudSet(k, v) { const c = hudCfg(); const o = {}; for (const it of HUD_ITEMS) if (!it.lock) o[it.k] = c[it.k]; o[k] = v; G.data.hud = { p: 'custom', o, lay: { pc: hudLayFor('pc'), ph: hudLayFor('ph') } }; saveLocal(); }
const hudQuiet = h => String(h || '').replace(/ tabindex="-?\d+"/g, '').replace(/ data-info="[^"]*"/g, '');
function hudSettings() {
  const h = hudRaw(), f = hudFlags(h.p, h.o);
  const sw = (k, on, lab) => `<button type="button" class="sw" role="switch" aria-checked="${on ? 'true' : 'false'}" data-a="hudtog" data-k="${k}" aria-label="${esc(lab)}">${on ? '켜짐' : '꺼짐'}</button>`;
  let o = `<section class="setg" id="hudset"><h4>전투 화면 표시</h4><p class="mini">전투 화면에 무엇을 보일지 고릅니다. 묶음을 고르면 항목과 크기 · 놓는 자리가 함께 정해집니다. 처음에는 꼭 필요한 것만 보입니다. 전투 중에도 바로 바뀝니다.</p>`;
  o += `<div class="setrow hudpre" role="group" aria-label="표시 묶음">${HUD_NAMES.map(n => `<button class="sm${h.p === n ? ' gold' : ''}" data-a="hudpre" data-k="${n}" aria-pressed="${h.p === n}">${HUD_LAB[n]}</button>`).join('')}<span class="mini hudcur" role="status">${h.p === 'custom' ? '사용자 지정' : ''}</span></div>`;
  for (const [gn, ks] of HUD_GROUPS) {
    o += `<div class="hudg" role="group" aria-label="${gn}"><h5>${gn}</h5>`;
    for (const k of ks) {
      const it = HUD_ITEMS.find(x => x.k === k);
      if (it.lock) o += `<div class="setrow"><span class="lab">${it.n}</span><span></span><span class="hudlk">항상 보임</span></div>`;
      else if (it.opts) o += `<div class="setrow"><label for="hudsts">${it.n}</label><span class="mini">${it.desc}</span><select id="hudsts">${it.opts.map(([v, t]) => `<option value="${v}"${f[k] === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
      else o += `<div class="setrow"><span class="lab">${it.n}</span><span class="mini">${it.desc}</span>${sw(k, !!f[k], it.n)}</div>`;
    }
    o += `</div>`;
  }
  return o + `</section>` + hudEditHtml();
}
/* 지금 위험: 이번 차례에 답이 필요한 일만. 적의 예고 문장을 그대로 옮기고 무엇을 하라고는 말하지 않는다 */
function vHudDanger(b) {
  if (b.over || !b.p) return '';
  const ls = []; const x = incomingEst(b);
  if (x.n && x.sum >= b.p.hp) ls.push('다음 차례 전 예상 피해 −' + r1(x.sum) + ', 남은 생명력 ' + shownHp(b.p.hp) + '. 쓰러질 수 있습니다');
  for (const e of alive(b)) {
    if (e.role === 'root' || e.role === 'crown') continue;
    if (e.demand && e.demand.turn === b.turnIdx) { ls.push(e.n + ': ' + (e.demand.k === 'rest' ? '고해를 기다린다' : '심문한다')); continue; }
    const k = (e.intent || {}).k; const it = intentText(b, e); if (it && it.hv && it.t && (DMG_K.includes(k) || ['charge', 'chant', 'seal', 'surgeprep', 'dig', 'reap'].includes(k))) ls.push(e.n + ': ' + it.t);
  }
  if (!ls.length) return '';
  return `<div class="hud-danger" data-hud="hud-danger" role="note" aria-label="지금 위험"><span class="dgi" aria-hidden="true">⚠</span>${ls.slice(0, 2).map(t => `<span>${esc(fixJosa(t))}</span>`).join('')}</div>`;
}
/* 직업 칩 모듈: 직업마다 한 줄씩. 끄면 눈에는 안 보이고 읽기만 된다 */
function vHudClass(b, hud) {
  const h = buildRes(b.p) + focusLine(b) + sbLine(b) + cfLine(b); if (!h) return '';
  return hud.cls ? `<div class="hudm" data-hud="hud-classchip">${h}</div>` : `<div class="sr" data-hud="hud-classchip">${hudQuiet(h)}</div>`;
}
const AGROUP4 = [['공격', ['basic', 'heavy']], ['스킬', null], ['지키기', ['guard', 'dodge']], ['도구', ['flaskL', 'flaskM', 'flaskS', 'flee']]];
function consUsefulN(b) {
  const run = G.run; if (!run || !Array.isArray(run.cons) || b.over || !b.p) return 0;
  const bq = Object.assign({}, b, { consN: 0, queue: ['p'] }); let n = 0;
  run.cons.forEach(c => { const D = CONS[c.id]; if (!D || D.use === 'none' || D.use === 'out' || consWhyNot(bq, run, c, G.sel)) return; if (consScore(b, c, D) > 0) n++; });
  return Math.min(n, 3);
}
function vHudPlayer(b, hud, pops, fdo) {
  const p = b.p; const B = BUILDS[p.build];
  const extra = [];
  extra.push(`<span data-info="stats" tabindex="0">${STAT_KEYS.map(k => STATN[k] + ' ' + stat(p, k)).join(' · ')}</span>`);
  extra.push(`<span data-info="speed" tabindex="0">속도 ${r1(pSpeed(b))}</span>`);
  const eq = Object.values(p.eq).filter(Boolean); if (eq.length) extra.push(eq.map(k => `<span class="gr-${ITEMS[k].g || 'n'}">${inm(k, ITEMS[k].g || 'n')}</span>`).join(', '));
  const scen = G.scr === 'scen' ? `<div class="scenline"><b>${SCEN[G.scen.i].id}. ${esc(SCEN[G.scen.i].n)}</b> ${esc(SCEN[G.scen.i].d)} 최대 10행동 중 ${b.pActs || 0}행동.</div>` : '';
  const status = `<section class="fstat" data-hud="hud-player" aria-label="내 상태">${scen}${hud.flk ? '' : `<span class="sr">플라스크 생명력 ${p.flask.life}, ${isV2(p) ? '정화' : '마나'} ${p.flask.mana}, 스태미나 ${p.flask.stam || 0}, 최대 ${p.flaskMax}</span>`}<div class="mehead"><b data-info="buildrule" tabindex="0">${B.ico} ${esc(B.n)}</b><span class="flk" data-info="flask" tabindex="0">플라스크 <span aria-hidden="true">❤️</span><span class="sr">생명력 </span>${p.flask.life} ${isV2(p) ? '<span aria-hidden="true">🧪</span><span class="sr">정화 </span>' : '<span aria-hidden="true">💧</span><span class="sr">마나 </span>'}${p.flask.mana} <span aria-hidden="true">⚡</span><span class="sr">스태미나 </span>${p.flask.stam || 0} <small><span class="sr">, 최대 </span>/${p.flaskMax}</small></span><button class="sm fdtog" data-a="fdet" aria-expanded="${fdo}" aria-controls="fdet"><span aria-hidden="true">${fdo ? '▴' : '▾'}</span> 자세히</button></div>
    <div class="mbars">${pops.p ? popHtml(pops.p) : ''}${mbar('hp', p.hp, p.hpMax, '생명력', b.over || !hud.prev ? 0 : incomingEst(b).sum)}${p.mpMax > 0 ? mbar('mp', p.mp, p.mpMax, '마나') : ''}${mbar('st', p.st, p.stMax, '스태미나')}</div><div class="fdet" id="fdet"${fdo ? '' : ' hidden'}><div class="mini">${extra.join(' · ')}</div><div><button class="sm rulebtn" data-a="help" data-k="row">전투 규칙 보기</button></div><div class="rule" data-info="buildrule" tabindex="0">${esc(BUILDS[p.build].rule)}</div>${incWhy(b)}</div></section>`;
  return status;
}
/* 예상 피해 모듈: 끄면 읽는 글만 남긴다 */
function vHudIncoming(b, hud) {
  if (b.over || !b.p) return '';
  return hud.inc ? (hud.abaux || incomingEst(b).n ? incHtml(b) : '') : '<div class="sr">' + hudQuiet(incHtml(b)) + '</div>';
}
/* 내 상태 칩 모듈: 화상 줄, 봉인 줄, 상태 칩 */
function vHudStatus(b, hud) {
  const p = b.p; if (!p) return '';
  return `${isCh3(b) && st(p, 'ignite') ? `<div class="mini ignln" data-info="ign" tabindex="0">🔥 내 화상 ${st(p, 'ignite')}: 다음 피격 +${st(p, 'ignite')}</div>` : ''}${b.seal && b.seal.length ? `<div class="sealln" data-info="seal" tabindex="0">🔏 봉인: ${b.seal.map(x => esc(x.n)).join(', ')}</div>` : ''}${stsHtml(p, b, 0, { mode: hud.sts })}`;
}
/* 순서 모듈: 순서 줄과 전체 기록 단추 */
function vHudOrder(b, hud) {
  return `<div class="ordrow">${vOrder(b, hud)}<button class="sm onlym logbtn rlbtn" data-a="logopen" aria-label="전체 기록">📜<span class="lbt"> 기록</span></button></div>`;
}
/* 보스 시계와 열기 모듈 */
function vHudClock(b) {
  let gim = '';
  const boss = b.en.find(e => e.role === 'boss' && e.alive);
  if (boss) {
    let g = b.enrage ? '광폭화 중' : `광폭화까지 ${myTurnsUntil(b, (ENRAGE.byBoss || {})[boss.boss] || ENRAGE.boss)}라운드`;
    if (boss.boss === 'mother') g += ` · 내 중독 ${st(b.p, 'poison')}/10 (10이면 부화) · ${boss.phase >= 2 ? '거울 활성' : '2페이즈부터 거울'}`;
    if (boss.boss === 'tree') { const roots = alive(b).filter(e => e.role === 'root').length; g += ` · 뿌리 때문에 라운드마다 약 +${rootRegen(b)} 회복 · 계절 ${SEASONS[b.season]} → ${SEASONS[(b.season + 1) % 4]} (${myTurnsUntil(b, (Math.floor(b.tick / 4) + 1) * 4)}라운드 뒤) · 뿌리 ${roots}/3`; }
    gim = `<div class="gimmick" data-info="gim" tabindex="0">${esc(g)}</div>`;
    if (boss.demand && boss.demand.turn === b.turnIdx) gim += `<div class="gimmick dmd" data-info="edemand" tabindex="0">${boss.demand.k === 'rest' ? '🤲 수도원장이 고해를 기다린다' : '⚖️ 수도원장이 심문한다'}</div>`; // 10월 4일: 휴대폰에서 카드의 표시가 잘려 따로 한 줄
  }
  if (b.heat != null) gim += heatHtml(b); // 3챕터 열기 칸
  return gim;
}
/* 차례 알림 모듈: 내 차례 · 적 행동 한 줄 */
function vHudBanner(b) {
  const last = b.log[b.log.length - 1];
  const lastl = G.banner ? `<div class="turnban ${G.banner.phase}"><span class="ic">${G.banner.ico}</span><b>${esc(G.banner.who)}</b><span>${esc(G.banner.phase === 'post' && last ? last.m : G.banner.what)}</span></div>` : G.myTurnFlash ? '<div class="turnban me"><b>내 차례</b><span>무엇을 할지 고르세요</span></div>' : '';
  return lastl ? `<div class="logrow">${lastl}</div>` : '';
}
function vHudField(b, hud, pops) {
  const p = b.p;
  const acts1 = {}; for (const x of previewAfter(b, 1)) acts1[x.e.id] = x.n;
  const ecard = e => {
    const it = intentText(b, e); const ib = intentBadge(b, e); const sel = G.sel === e.id; const pop = pops[e.id];
    const reach = !frontBlocked(b) || e.row === 'front';
    /* 깃발: [화면에 그리는 것, 읽어 주는 말]. 10월 7일: 카드 버튼 안에서는 따로 초점을 받지 않고, 카드의 읽는 이름에 모두 담는다 */
    const fl = [];
    if (reach && guardOf(b, e)) fl.push(['<span class="nr gd" data-info="guarded">🛡️막힘</span>', '방패병이 막는 중']);
    if (e.braced) fl.push(['<span class="nr gd" data-info="ebraced">🪨</span>', '버팀']);
    if (e.countering) fl.push(['<span class="nr gd" data-info="ecounter">↩️</span>', '반격 태세']);
    if (e.evading) fl.push(['<span class="nr gd" data-info="eevade">🌀</span>', '몸 낮춤']);
    if (e.guarding) fl.push(['<span class="nr gd" data-info="eguard">🙌</span>', '지키는 중']);
    if (acts1[e.id] && monkShowCtr(b, e)) fl.push(['<span class="nr gd mctr" data-info="ectr">🥋↩</span>', '되받을 수 있는 공격']); // 수도승: 내 다음 차례 전에 나를 직접 칠 전열 적
    if (focusOn(b, e)) fl.push(['<span class="nr gd fc" data-info="efocus">🎯' + b.p.focus.n + '</span>', '추적 ' + b.p.focus.n + '겹']);
    if (e.chant) fl.push(['<span class="nr gd hv" data-info="echant">📿 ' + r1(e.chant.need - e.chant.taken) + '</span>', '영창 끊기까지 ' + r1(e.chant.need - e.chant.taken)]);
    if (e.hymn) fl.push(['<span class="nr gd" data-info="ehymn">🎵' + e.hymn + '</span>', '노래 ' + e.hymn + '겹']);
    if (e.demand && e.demand.turn === b.turnIdx) fl.push(['<span class="nr gd hv" data-info="edemand">' + (e.demand.k === 'rest' ? '🤲 고해' : '⚖️ 심문') + '</span>', e.demand.k === 'rest' ? '고해' : '심문']);
    if (e.loot) fl.push(['<span class="nr gd" data-info="eloot">🫳</span>', '훔친 것: ' + e.loot.n]);
    if (e.pile) fl.push(['<span class="nr gd hv">🦴 ' + e.pile.wait + '</span>', '뼈 더미, 일어서기까지 ' + e.pile.wait + '라운드']);
    if (e.under) fl.push(isCh3(b) ? ['<span class="nr gd">🏜️ 모래 속</span>', '모래 속: 한 적 대상으로 고를 수 없음'] : ['<span class="nr gd">🕳️ 땅속</span>', '땅속: 한 적 대상으로 고를 수 없음']);
    if (e.swift) fl.push(['<span class="nr gd">⚡신속</span>', '신속: 라운드마다 가속 1']);
    if (e.role === 'bonewall') fl.push(['<span class="nr gd">🧱 후열 보호</span>', '뼈벽: 후열이 받는 한 적 대상 피해 절반, 붕괴에 약함']);
    if (e.row === 'back' && alive(b).some(x => x.role === 'bonewall')) fl.push(['<span class="nr gd">🧱½</span>', '뼈벽 뒤: 한 적 대상 피해 절반']);
    if (e.haze > 0) fl.push(['<span class="nr gd" data-info="ehaze">🌫️' + e.haze + '</span>', '허상 ' + e.haze + '겹: 한 적을 노린 공격 하나가 한 겹을 걷고 헛친다']);
    if (e.wrap > 0) fl.push(['<span class="nr gd" data-info="ewrap">🧻' + e.wrap + '</span>', '붕대: 받는 직접 피해 −' + Math.round(WRAP.cut * 100) + '%, ' + e.wrap + '번 더 맞으면 풀림']);
    if (e.fire) fl.push(['<span class="nr gd" data-info="efire">🔥화염 강화</span>', '화염 강화: 공격이 화상을 싣는다(둔화 중에는 싣지 않는다)']);
    if (e.fireNext) fl.push(['<span class="nr gd hv">🔥+' + e.fireNext + '</span>', '받은 불씨: 다음 공격에 화상 ' + e.fireNext]);
    if (e.foe === 'colossus') fl.push(['<span class="nr gd' + ((e.glow || 0) >= 2 ? ' hv' : '') + '">달아오름 ' + (e.glow || 0) + '/' + FOE_X.colossus.heatMax + '</span>', '달아오름 ' + (e.glow || 0) + '/' + FOE_X.colossus.heatMax]);
    if (e.foe === 'reaper') fl.push(['<span class="nr gd' + ((e.embers || 0) >= 4 ? ' hv' : '') + '">불씨 ' + (e.embers || 0) + '</span>', '불씨 ' + (e.embers || 0)]);
    if (e.foe === 'sundial') fl.push(['<span class="nr gd' + ((e.clock || 0) <= 1 ? ' hv' : '') + '">☀️ 해시계 ' + (e.clock != null ? e.clock : FOE_X.sundial.clock) + '</span>', '해시계 ' + (e.clock != null ? e.clock : FOE_X.sundial.clock)]);
    if (e.stkExp > 0 || (e.role === 'lurker' && e.s.vuln && !e.under && e.intent && e.intent.k === 'exposed')) fl.push(['<span class="nr gd">😵</span>', '드러남: 숨을 고르는 중']);
    if (e.boss === 'tree' && rootRegen(b) > 0) fl.push([`<span class="nr rg2" data-info="regen">🌱 +${rootRegen(b)}/라운드</span>`, '라운드마다 ' + rootRegen(b) + ' 회복']);
    const ed = hud.edet || sel; /* 카드를 눌러 고르면 그 카드는 상세가 모두 보인다 */
    const KEEP = /data-info="(guarded|ebraced|ecounter|eevade|eguard|echant|edemand|ehaze|ewrap|ectr|efocus)"|땅속|모래 속|후열 보호|🧱½/;
    const flv = ed ? fl : fl.filter(x => KEEP.test(x[0]));
    const wall = wallUp(b, e) ? 'ewall' : wallFrontUp(b, e) ? 'ewallf' : '';
    const sw = stsWords(e, b);
    const lab = [e.n + (e.role === 'boss' ? ' ' + e.phase + '페이즈' : '') + (e.lv ? ' Lv' + e.lv : '') + (e.rn && e.n.indexOf(e.rn) < 0 ? ' ' + e.rn : '') + (e.tough ? ' 강인' : ''),
      '생명력 ' + shownHp(e.hp) + '/' + Math.round(e.hpMax)].concat(e.role !== 'root' && e.role !== 'crown' ? [eordText(b, e), '붕괴 ' + Math.round(e.brk) + '/' + e.brkMax] : [])
      .concat(sw.length ? ['상태: ' + sw.join(', ')] : []).concat(wall || fl.length ? ['표시: ' + (wall ? ['방패벽'] : []).concat(fl.map(x => x[1])).join(', ')] : [])
      .concat(e.role !== 'root' && e.role !== 'crown' ? ['예고: ' + it.t] : ['움직이지 않는다']).join(', ');
    return `<button class="en${sel ? ' tg' : ''}${b.lastActor === e.id ? ' acting' : ''}" data-a="sel" data-e="${e.id}" data-info="en:${e.id}" aria-pressed="${sel}" aria-label="${esc(lab)}">${ed ? eordHtml(b, e) : ''}<span class="enh"><span class="ico" aria-hidden="true">${e.ico}</span><span class="nm">${esc(e.n)}${e.role === 'boss' ? ' ' + e.phase + '페이즈' : ''}${wall ? `<span class="wallm" data-info="${wall}">🛡️</span>` : ''}${ed && e.lv ? `<small class="elv"> Lv${e.lv}</small>` : ''}${e.tough ? '<small class="etough" data-info="etough">강인</small>' : ''}${ed && e.rn && e.n.indexOf(e.rn) < 0 ? `<small class="erole"> ${esc(e.rn)}</small>` : ''}</span>${flv.map(x => x[0]).join('')}</span>${ehpBar(e)}${ed && e.role !== 'root' && e.role !== 'crown' ? `<span class="bkline" data-info="bar:bk"><small>붕괴<span class="bkl"> 게이지</span></small><span class="bkb" role="progressbar" aria-label="붕괴" aria-valuemin="0" aria-valuemax="${e.brkMax}" aria-valuenow="${Math.round(e.brk)}"><i style="width:${Math.min(100, e.brk / e.brkMax * 100)}%"></i></span></span>` : ''}${stsHtml(e, b, 1, { mode: sel ? 'all' : hud.sts })}${e.role !== 'root' && e.role !== 'crown' ? `<span class="intent ik-${ib.cls}${it.hv ? ' hv' : ''}"><span class="ii" aria-hidden="true">${ib.ico}</span>${ib.num !== '' ? `<b class="inum">${esc(String(ib.num))}</b>` : ''}<span class="itx">${esc(ib.txt)}</span>${(hud.iaux || sel) && acts1[e.id] > 1 ? `<span class="ix">×${acts1[e.id]}</span>` : ''}</span>` : '<span class="mini emv">움직이지 않는다</span>'}${pop ? popHtml(pop) : ''}</button>`;
  };
  const bk = b.en.filter(e => e.alive && e.row === 'back'), fr = b.en.filter(e => e.alive && e.row === 'front');
  /* 전열 · 후열 띠 (10월 3일 만든 사람: 한눈에 안 들어온다): 줄마다 색 띠와 머리글, 머리에 근접 공격이 닿는지.
     후열이 먼저다(휴대폰은 위, PC는 왼쪽, 만든 사람: 후열이 위가 낫다). PC 폭에서는 두 줄을 나란히 놓아 함께 보인다. 규칙 버튼은 전장 밖(순서 줄 옆)에 둔다 */
  const blocked = frontBlocked(b);
  const lane = (k, nm, list, reach, extra) => `<div class="lane ${k}${list.length ? '' : ' empty'}" role="group" aria-label="${nm}" style="--n:${Math.max(1, list.length)}"><div class="lanehd"><b>${nm}</b><span class="lanect">${list.length ? list.length + '명' : '비어 있음'}</span>${list.length ? `<span class="reach ${reach[0]}">${reach[1]}</span>` : ''}${extra || ''}</div>${list.length ? `<div class="enemies">${list.map(ecard).join('')}</div>` : ''}</div>`;
  const field = `<section class="field" data-hud="hud-field" aria-label="전장">${G.scr === 'tut' ? vTutGoal(b) : ''}
    <div class="lanes">${lane('back', '후열', bk, blocked ? ['no', '근접 불가<span class="rlhint"> · 전열이 막는 중</span>'] : ['ok', '근접 닿음<span class="rlhint"> · 전열이 비었거나 무너짐</span>'])}${lane('front', '전열', fr, ['ok', '근접 닿음'])}</div></section>`;
  return field;
}
function vHudActions(b, hud, tg) {
  const p = b.p;
  let dock;
  if (b.over) {
    const msg = b.over === 'win' ? '승리했습니다.' : b.over === 'lose' ? '쓰러졌습니다.' : b.over === 'flee' ? '물러났습니다. 이 방은 다시 이겨야 합니다.' : '이 상황은 여기까지입니다.';
    const lootL = b.over === 'win' && (b.drops || []).length ? `<p class="lootln">🎁 전리품: ${esc(dropText(b.drops))}</p>` : '';
    dock = G.scr === 'tut' ? vTutOver(b) : G.scr === 'test' ? `<section class="dock" aria-label="행동"><p><b>${msg}</b> <span class="mini">${b.turnIdx}번째 차례, 남은 생명력 ${Math.round(Math.max(0, b.p.hp) / b.p.hpMax * 100)}%</span></p><div class="row"><button class="gold" data-a="teststart" data-focus>같은 설정으로 다시</button><button data-a="testsetup">설정 바꾸기</button></div></section>` : `<section class="dock" aria-label="행동"><p><b>${msg}</b></p>${lootL}<button class="gold wide" data-a="${G.scr === 'scen' ? 'scennext' : 'bcont'}" data-focus>계속</button></section>`;
  } else {
    const L = actionList(b);
    let btns = '';
    let kn = 0;
    const AG = hud.tools ? AGROUP4 : AGROUP; const toolsN = hud.tools ? consUsefulN(b) + L.filter(a => a.ok && ((a.id === 'flaskL' && p.hp < p.hpMax * 0.5) || (a.id === 'flaskS' && p.st < p.stMax * 0.3))).length : 0;
    for (const [lab, ids] of AG) {
      const list = ids ? L.filter(a => ids.includes(a.id)) : L.filter(a => a.skill || (hud.tools && a.id === 'sig'));
      if (!list.length) continue;
      const tl = lab === '도구' && hud.tools; const tlo = tl && G.toolsOpen;
      if (tl) btns += `<button class="ab g-etc tooltog${tlo ? ' on' : ''}" data-a="tools" aria-expanded="${!!tlo}" aria-controls="agtools" aria-label="도구, 플라스크와 소모품과 도망${toolsN ? ', 쓸 만한 것 ' + toolsN + '개' : ''}"><b><span aria-hidden="true">🧰</span> <span class="anl">도구</span>${toolsN ? `<span class="tcnt" aria-hidden="true">${toolsN}</span>` : ''}</b><small aria-hidden="true">${tlo ? '접기' : '플라스크 · 소모품'}</small></button>`;
      btns += `<div class="agp${tl ? ' agtools' + (tlo ? ' open' : '') : ''}"${tl ? ' id="agtools"' : ''} role="group" aria-label="${esc(lab)}" style="--c:${Math.ceil(list.length / 3)}"><span class="agl" aria-hidden="true">${esc(lab)}</span>`; // PC: 묶음마다 3줄을 넘지 않게 칸을 늘린다(10월 3일: 스킬 6개가 세로로 쌓여 전장이 눌렸다)
      for (const a of list) {
        let why = '';
        if (!a.ok) why = a.why || (a.id === 'heavy' || a.id === 'guard' || a.id === 'dodge' ? '스태미나 부족' : a.skill ? '마나 부족' : '플라스크 없음');
        else if (tg && !a.self && !a.aoe && !canTarget(b, tg, a)) why = '이 대상에 닿지 않음';
        const dis = G.busy || !(a.ok && !why);
        const urgent = !dis && (a.id === 'flaskL') && p.hp < p.hpMax * 0.35; const tnew = G.scr === 'tut' && tutNew(b, a.id);
        const at = !dis ? actTarget(b, a) : null; const gd = at && isMeleeAct(p, a.id) ? guardOf(b, at) : null;
        kn++;
        btns += `<button class="ab g-${lab === '공격' ? 'atk' : lab === '스킬' ? 'sk' : lab === '지키기' ? 'def' : lab === '직업' ? 'sig' : 'etc'}${dis ? ' dis' : ''}${urgent ? ' urgent' : ''}${tnew ? ' tnew' : ''}${a.v2 && skHz(a.s) ? ' hzb' : ''}${!dis && a.pull ? ' blood' : ''}" data-a="act" data-id="${a.id}" data-info="act:${a.id}" data-k="${kn}" aria-disabled="${dis}"><b>${kn <= 9 && G.data.numKeys !== false ? `<kbd>${kn}</kbd>` : ''}<span class="anl">${p.build === 'spellblade' && sbKindOf(p, a.id, a) ? (sbKindOf(p, a.id, a) === 'cut' ? '⚔ ' : '✦ ') : ''}${esc(a.n)}</span><span class="ans" aria-hidden="true">${p.build === 'spellblade' && sbKindOf(p, a.id, a) ? (sbKindOf(p, a.id, a) === 'cut' ? '⚔ ' : '✦ ') : ''}${esc(a.id === 'flaskM' && isV2(p) ? '🧪 정화' : ASHORT[a.id] || a.n)}</span>${spdIco(noFast(p) && a.time <= 0.6 ? 1 : a.time)}${a.v2 && skHz(a.s) ? '<span class="hz" aria-hidden="true">🔄</span>' : ''}</b><small>${why ? esc(why) : '<span class="ac">' + (linkOn(b, a) ? '<span class="lk">🔗 연계 +' + Math.round(HUNT.link * 100) + '%</span>' : esc(a.cost)) + '</span><span class="ax">' + (skillHint(b, a) ? ' · ' + esc(skillHint(b, a)) : '') + (at ? ' → ' + esc(at.n) + (gd ? ' 🛡' : '') : a.aoe ? ' → 전체' : '') + '</span>'}</small></button>`;
      }
      btns += '</div>';
    }
    dock = `<section class="dock" data-hud="hud-actions" aria-label="행동">${G.scr === 'tut' ? '' : vCoach()}<div class="dockhead">${G.busy ? `<span class="busy">적이 움직이는 중</span>${G.stepResolve ? '<button class="sm gold" data-a="stepnext" data-focus>다음 <kbd>Space</kbd></button>' : ''}<button class="sm" data-a="skip">끝까지 넘기기</button>` : `${tg || hud.abaux ? `<span>대상 <b>${tg ? esc(tg.n) : '행동마다 자동'}</b> <span class="mini">적 카드를 누르면 고정됩니다</span></span>` : ''}${slotHtml(b)}`}<label class="pacesel">진행 <select id="pace" aria-label="적 차례 진행 속도">${Object.keys(PACE).map(k => `<option value="${k}"${(G.pace || 'normal') === k ? ' selected' : ''}>${PACEN[k]}</option>`).join('')}</select></label></div>
            <div class="abgrid">${btns}</div></section>`;
  }
  return dock;
}
function vBattle() {
  const b = G.b; const pops = hpPops(b); const fdo = !!G.data.fdet; const hud = hudEff(fdo); HUDNOW = hud;
  const tg = G.sel ? b.en.find(e => e.id === G.sel && e.alive) : null;
  const html = {
    'hud-player': vHudPlayer(b, hud, pops, fdo), 'hud-classchip': vHudClass(b, hud), 'hud-incoming': vHudIncoming(b, hud), 'hud-status': vHudStatus(b, hud),
    'hud-order': vHudOrder(b, hud), 'hud-clock': vHudClock(b), 'hud-banner': vHudBanner(b), 'hud-log': vRecent(b, hud),
    'hud-danger': vHudDanger(b), 'hud-field': vHudField(b, hud, pops), 'hud-quick': consQuick(b, hud), 'hud-actions': vHudActions(b, hud, tg),
  };
  const groups = []; for (const x of b.log) { const g = x.g || 0; if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, items: [] }); groups[groups.length - 1].items.push(x); }
  const glog = groups.slice(-14).reverse().map((G2, gi) => `<div class="lgrp${gi === 0 ? ' now' : ''}"><div class="lgh">${G2.g ? G2.g + '번째 차례' : '전투 시작'}</div>${G2.items.map(x => `<p class="${x.c}">${numB(x.m)}${whyHtml(b, x, true)}</p>`).join('')}</div>`).join('');
  const side = `<section class="side${G.logOpen ? ' open' : ''}"${G.logOpen ? ' role="dialog" aria-modal="true" aria-labelledby="logttl"' : ' aria-label="전투 기록"'}><div class="sidehead"><h3 id="logttl">전투 기록</h3><button class="sm onlym" data-a="logclose"${G.logOpen ? ' data-focus="1"' : ''}>닫기</button></div><div class="blog" role="log">${glog}</div><div class="mini">맨 위가 가장 최근 차례입니다. 한 차례 안에서는 위에서 아래로 읽습니다.</div></section>`;
  const hcls = ['bgrid', 'hp-' + hud.p, hud.p === 'simple' ? 'hcalm' : '', hud.flk ? '' : 'hl-noflk', hud.edet ? '' : 'hl-noedet', hud.abaux ? '' : 'hl-noaux', hud.agl ? '' : 'hl-noagl', hud.logpanel ? '' : 'hl-nopanel', hud.tools ? 'hl-tools' : ''].filter(Boolean).join(' ');
  const Z = hudZonesHtml(html);
  return `<div class="${hcls}"><div class="btop">${Z.top1}${Z.top2}</div>${Z.mid}${Z.bot}${side}</div>`;
}

/* ===== 전투 화면: 최근 기록 · 까닭 줄 · 소모품 바로 쓰기 (10월 9일 UI) ===== */
const rlIco = (b, x) => { if (x.w === 'p') return '<span class="rme">나</span>'; const e = x.w ? b.en.find(y => y.id === x.w) : null; return e ? e.ico : '·'; };
const numB = t => String(t == null ? '' : fixJosa(String(t))).split(/(\d+(?:\.\d+)?)/).map((u, i) => i % 2 ? '<b>' + u + '</b>' : esc(u)).join('');
/* 피해 줄 아래의 "왜 이 숫자인가" 한 줄. 까닭은 엔진이 b.why에 적은 것(읽기만 한 값) */
function whyText(b, x) {
  const w = x.s ? (b.why || []).find(y => y.s === x.s) : null; if (!w) return '';
  return (Math.abs(w.f - w.d) >= 0.05 ? (w.side === 'in' ? '원래 ' : '계산 ') + w.f + ' → ' + w.d + ' · ' : '') + w.m.join(', ');
}
function whyHtml(b, x, force) { const t = whyText(b, x); if (t && !force && HUDNOW && !HUDNOW.why) return `<span class="sr">까닭: ${numB(t)}</span>`; return t ? `<span class="rwhy"><span aria-hidden="true">↳ </span><span class="sr">까닭: </span>${numB(t)}</span>` : ''; }
const PHONE_W = 480; /* 이 폭 이하는 최근 기록을 가장 새 한 줄로 줄이고 소모품 줄을 한 줄로 만든다(10월 9일 UI-phone) */
const isPhoneW = () => typeof window !== 'undefined' && window.innerWidth <= PHONE_W;
function vRecent(b, hud) {
  if (hud && !hud.rlog) return '';
  if (isPhoneW() || (hud && !hud.logpanel)) {
    const x = b.log.filter(y => y.m).slice(-1)[0]; const m = x ? /([0-9]+(?:\.[0-9]+)?) 피해/.exec(x.m) : null;
    const plain = x ? fixJosa(String(x.m)) + (whyText(b, x) ? '. ' + fixJosa(whyText(b, x)) : '') : '전투가 시작되었습니다';
    return `<button data-hud="hud-log" class="rlog rls${x ? ' ' + x.c : ''}${x && x.w === 'p' ? ' me' : ''}" data-a="logopen" aria-label="전체 기록 열기. 최근: ${esc(plain)}"><span class="rli" aria-hidden="true">${x ? rlIco(b, x) : '·'}</span><span class="rlt" aria-hidden="true">${x ? numB(x.m) : '전투가 시작되었습니다'}</span>${m ? `<b class="rln" aria-hidden="true">−${m[1]}</b>` : ''}</button>`;
  }
  const n = 3;
  const tail = b.log.filter(x => x.m).slice(-n); let h = '', pr = null;
  for (const x of tail) {
    const rr = x.r || 0; if (rr !== pr) { h += `<li class="rrd" aria-hidden="true">${rr ? rr + '라운드' : '전투 시작'}</li>`; pr = rr; }
    const m = /([0-9]+(?:\.[0-9]+)?) 피해/.exec(x.m);
    h += `<li class="rl ${x.c}${x.w === 'p' ? ' me' : ''}"><span class="rli" aria-hidden="true">${rlIco(b, x)}</span><span class="rlt">${numB(x.m)}${whyHtml(b, x)}</span>${m ? `<b class="rln" aria-hidden="true">−${m[1]}</b>` : '<span></span>'}</li>`;
  }
  if (!h) h = '<li class="rl sys"><span></span><span class="rlt">전투가 시작되었습니다</span><span></span></li>';
  return `<section class="rlog" data-hud="hud-log" aria-label="최근 기록"><div class="rlh"><b>최근 기록</b></div><ul class="rlist">${h}</ul></section>`;
}
/* 소모품: 지금 상황에 맞는 것 셋을 행동판 안에 둔다. 규칙은 그대로(차례 칸을 쓰지 않고 한 차례에 consTurnOf개까지) */
function consScore(b, c, D) {
  const p = b.p, hf = p.hp / p.hpMax, hit = incomingEst(b).sum;
  const low = hf < 0.7 ? (1 - hf) * 100 + (hf < 0.35 ? 60 : 0) + (hit >= p.hp * 0.6 ? 25 : 0) : 0;
  switch (D.k) {
    case 'heal': return low;
    case 'healcure': return low + (p.s.ignite ? 40 : 0);
    case 'stam': return p.st < p.stMax * 0.35 ? 70 + (p.st < 20 ? 25 : 0) : 0;
    case 'cure': return p.s[D.s] ? 50 + Math.min(30, st(p, D.s) * 6) : 0;
    case 'trim': return HEX.kinds.concat(['chill']).filter(x => p.s[x]).length * 25;
    case 'interrupt': return 95;
    case 'halfboom': return alive(b).some(e => e.intent && e.intent.k === 'burn') ? 85 : 0;
    case 'blind': return alive(b).some(e => e.row === 'back' && e.intent && (e.intent.k === 'attack' || e.intent.aimed)) ? 55 : 0;
    case 'decoy': return alive(b).some(e => e.countering) ? 70 : 0;
    case 'guard1': return hit >= p.hp * 0.4 ? 55 : 0;
    case 'cool': return b.heat != null && b.heat >= 60 ? 60 : 0;
    case 'unevade': case 'unbrace': case 'unguard': case 'unbless': case 'noheal': case 'nosummon': case 'sticky': case 'norise': case 'wallbreak': case 'rewind': return 60;
    case 'unhaze': case 'unearth': case 'nobloat': case 'unmod': return 45;
    case 'burnpiles': return 40;
    case 'whet': case 'mark': case 'brk': case 'dart': case 'aoe': case 'slow': return 22;
    case 'block': return 20;
    case 'quick': return 15;
    default: return 0;
  }
}
function consReason(b, D) {
  const p = b.p;
  switch (D.k) {
    case 'heal': case 'healcure': return '생명력 ' + Math.round(p.hp / p.hpMax * 100) + '%';
    case 'stam': return '스태미나 ' + Math.round(p.st);
    case 'cure': return (SNAMES[D.s] || D.s) + ' ' + st(p, D.s) + ' 지움';
    case 'interrupt': { const t = consTarget(b, D, G.sel); return t ? t.n + ' 끊기' : D.sit; }
    default: return D.sit;
  }
}
function consQuick(b, hud) {
  const run = G.run; if (!run || !Array.isArray(run.cons) || !run.cons.length || b.over || !b.p) return '';
  const p = b.p, lim = consTurnOf(p), used = b.consN || 0, ready = !G.busy && myTurn(b);
  const bq = Object.assign({}, b, { consN: 0, queue: ['p'] }); /* 차례 · 개수 조건을 뺀 사본으로 쓸 만한 것을 고른다 */
  const tot = run.cons.reduce((a, c) => a + c.n, 0), cand = [];
  run.cons.forEach((c, i) => { const D = CONS[c.id]; if (!D || D.use === 'none' || D.use === 'out' || consWhyNot(bq, run, c, G.sel)) return; const sc = consScore(b, c, D); if (sc > 0) cand.push({ c, i, D, sc }); });
  cand.sort((x, y) => y.sc - x.sc);
  const keys = G.data.numKeys !== false;
  const btns = cand.slice(0, 3).map((x, k) => {
    const why = ready ? consWhyNot(b, run, x.c, G.sel) : '적이 움직이는 중'; const nm = x.D.n + (x.c.g === 'm' ? ' (고급)' : '');
    const rs = why || consReason(b, x.D);
    return `<button class="qc${why ? ' dis' : ''}" data-a="consuse" data-k="${x.i}" data-q="${k + 1}" aria-disabled="${!!why}" title="${esc((keys ? 'QWE'[k] + ': ' : '') + nm + ' · ' + rs)}"><b>${keys ? '<kbd>' + 'QWE'[k] + '</kbd>' : ''}<span class="qi" aria-hidden="true">${x.D.ico}</span> <span class="qnm">${esc(nm)}</span> <span class="qn">×${x.c.n}</span></b><small>${esc(rs)}</small></button>`;
  }).join('');
  const qz = hud && hud.tools && !G.toolsOpen ? ' tlz' : hud && !hud.qcons && !(hud.tools && G.toolsOpen) ? ' qoff' : '';
  return `<div class="qcons${qz}" data-hud="hud-quick" role="group" aria-label="소모품 바로 쓰기">${btns || '<p class="mini qcn">지금 쓸 만한 소모품이 없습니다</p>'}<button class="qbag" data-a="consopen" aria-label="소모품 가방, 전부 ${tot}개. 이번 차례 ${used}/${lim}개 씀"><span aria-hidden="true">🎒 가방 ${tot}</span><small aria-hidden="true">이번 차례 ${used}/${lim}</small></button></div>`;
}

/* 설명 줄: 가리키거나 포커스하면 갱신 (재렌더 없이) */
function onTip(ev) {
  const el = ev.target.closest && ev.target.closest('[data-tip]'); if (!el || !G.b) return;
  const d = document.getElementById('adesc'); if (d) d.textContent = actDesc(G.b, el.dataset.tip);
}

