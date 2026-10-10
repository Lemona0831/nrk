'use strict';
/* ---------- 헤더 ---------- */
const PAGES = ['rank', 'records', 'admin', 'tree', 'goals', 'mark'];
function menuItems() {
  const inRun = G.run && !G.creating && ['run', 'settle', 'shop', 'wait'].includes(PAGES.includes(G.scr) ? G.back : G.scr);
  const it = [];
  if (G.scr !== 'title') it.push(['title', '🏰', '타이틀']);
  if (inRun) it.push(['equip', '🎒', '장비']);
  if (inRun && G.run.awk && G.run.awk.length) it.push(['awkview', '✨', '깨달음 ' + G.run.awk.length]);
  if (G.run && !G.creating && G.run.tree && G.scr !== 'tree' && G.scr !== 'tut') it.push(['tree', '🌳', '스킬 트리' + (G.run.tree.pts ? ' <span class="newdot"><span class="sr">남은 포인트 </span>' + G.run.tree.pts + '</span>' : '')]);
  if (!inRun && !G.creating && G.scr !== 'tut' && G.scr !== 'tutoffer') it.push(['tut', '🎯', '수련장' + (G.data.tutDone ? ' ✓' : '')]);
  it.push(['test', '🧪', '시험 전투']);
  it.push(['codex', '📖', '보스 도감'], ['rank', '🏆', '랭킹'], ['records', '📜', '기록'], ['changes', '📰', '업데이트' + (G.data.seenVer !== CHANGE_VER ? ' <span class="newdot"><span aria-hidden="true">새</span><span class="sr">새 소식</span></span>' : '')], ['help', '❔', '도움말'], ['settings', '⚙️', '설정']);
  if (G.site && G.conn === 'ok' && G.acct) it.push(G.acct.anon ? ['login', '🔑', '구글 로그인', 'google'] : ['logout', '🚪', '로그아웃']);
  if (G.toastLog && G.toastLog.length) it.push(['toasts', '🔔', '지난 알림']);
  if (G.owner || G.adminLink) it.push(['admin', '🛠️', '관리자']);
  return it;
}
/* 메뉴: 넓은 화면은 제목 아래 한 줄(접어 두면 기억한다), 휴대폰과 전투 화면은 ☰ 버튼으로 펼치는 판 */
function vHeader() {
  const run = G.run;
  const live = run && !G.creating && ['run', 'settle', 'shop', 'wait', 'dead'].includes(G.scr);
  const sub = G.scr === 'test' ? '시험 전투 · ' + esc((BUILDS[(G.test || {}).build] || {}).n || '') + ' Lv' + ((G.test || {}).lv || '') : G.scr === 'tut' ? '수련장' + (G.b ? ' ' + (G.tut.i + 1) + '/' + TUT.length : '') : G.scr === 'scen' ? `고정 상황 ${G.scen.i + 1}/5 · ${esc(BUILDS[G.scen.build].n)}` : live ? `${esc(run.cname || BUILDS[run.build].n)} · ${esc(BUILDS[run.build].n)} · ${G.scr === 'run' ? (run.ch || 1) + '챕터 ' + esc(floorName(run.room)) : G.scr === 'shop' ? '상점' : G.scr === 'settle' ? '정산' : G.scr === 'wait' ? (run.ch || 1) + '챕터 돌파' : '쓰러짐'}` : G.creating ? '캐릭터 만들기' : VERSION;
  // 로그인 확인용 인사
  const hi = G.site && G.acct && !G.acct.anon ? (G.data.name ? esc(G.data.name) + '님, 어서 오세요' : '어서 오세요') : '';
  const fit = (G.scr === 'run' || G.scr === 'scen' || G.scr === 'tut' || G.scr === 'test') && G.b;
  const drop = fit || (typeof window !== 'undefined' && window.innerWidth < 720);
  const shown = drop ? !!G.menuOpen : !G.data.menuFold;
  const tog = shown ? (drop ? '<span aria-hidden="true">✕</span> 닫기' : '<span aria-hidden="true">▴</span> 접기') : '<span aria-hidden="true">☰</span> 메뉴';
  return `<header class="hdr ${drop ? 'drop' : 'inl'}${shown ? ' mopen' : ''}"><div class="hl"><h1 class="hname">나락의 유산</h1><span class="mini">${sub}</span></div>${hi ? `<span class="hi">${hi}</span>` : ''}<button class="sndb" data-a="sndtoggle" aria-pressed="${sndCfg().on}" aria-label="소리"><span aria-hidden="true">${sndCfg().on ? '🔊' : '🔇'}</span></button><button class="mtog" data-a="menu" aria-expanded="${shown}" aria-controls="mnav">${tog}${!shown && G.data.seenVer !== CHANGE_VER ? ' <span class="newdot"><span aria-hidden="true">새</span><span class="sr">새 소식</span></span>' : ''}</button><nav class="mnav" id="mnav" aria-label="메뉴">${menuItems().map(([a, ico, lab, k]) => `<button class="mi${G.scr === a ? ' on' : ''}" data-a="${a}"${k != null ? ` data-k="${k}"` : ''}><span aria-hidden="true">${ico}</span> ${lab}</button>`).join('')}</nav></header>`;
}

/* ---------- 내 상태 한 줄 ---------- */
function mbar(cls, v, max, lab, inc) { const ik = { hp: 'bar:hp', mp: 'bar:mp', st: 'bar:st' }[cls]; const w = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0; const lo = cls === 'hp' && v > 0 && v < max * 0.35; /* 10월 7일: 낮은 생명력은 색만이 아니라 "위험" 글자로 */ return `<div class="mb" data-info="${ik}" tabindex="0"><span class="ml">${lab}</span><div class="bar ${cls}${lo ? ' lo' : ''}" role="progressbar" aria-label="${esc(lab)}" aria-valuemin="0" aria-valuemax="${Math.round(max)}" aria-valuenow="${shownHp(v)}"${lo ? ` aria-valuetext="${shownHp(v)}/${Math.round(max)}, 위험"` : ''}><i style="width:${w}%"></i>${inc > 0 && v > 0 && max > 0 ? `<b class="pvi" aria-hidden="true" style="left:${Math.max(0, v - inc) / max * 100}%;width:${Math.min(inc, v) / max * 100}%"></b>` : ''}<span>${lo ? '<b class="dz">위험</b> ' : lab + ' '}${shownHp(v)}/${Math.round(max)}</span></div></div>`; } /* 10월 7일 2차: inc = 내 다음 차례 전 받을 피해 어림(incomingEst, 예상 피해 줄과 같은 값). 빗금으로 겹친다 */
function vPlayerPanel(p, b) {
  const B = BUILDS[p.build];
  const run0 = G.run; const lvTxt = run0 && run0.lv ? `<span class="lvtag" title="경험치 ${Math.round(run0.xp || 0)}/${LV_XP[run0.lv] || '최대'}">Lv ${run0.lv}</span>` : '';
  let h = `<div class="me"><div class="mehead"><b>${B.ico} ${esc(B.n)}</b>${lvTxt}${q('build', '빌드')}<span class="flk" data-info="flask" tabindex="0"><span class="flw">플라스크 </span><span aria-hidden="true">❤️</span><span class="sr">생명력 </span>${p.flask.life} · ${isV2(p) ? '<span aria-hidden="true">🧪</span><span class="sr">정화 </span>' : '<span aria-hidden="true">💧</span><span class="sr">마나 </span>'}${p.flask.mana} · <span aria-hidden="true">⚡</span><span class="sr">스태미나 </span>${p.flask.stam || 0} <small><span class="sr">, 최대 </span>/${p.flaskMax}</small></span>${q('flask', '플라스크')}${q('st', '스태미나')}${run0 && run0.cons && !b ? `<button class="sm consbtn" data-a="consopen" aria-label="소모품 ${run0.cons.reduce((a, c) => a + c.n, 0)}개">🎒 ${run0.cons.reduce((a, c) => a + c.n, 0)}</button>` : ''}</div>`;
  h += `<div class="mbars">${mbar('hp', p.hp, p.hpMax, '생명력')}${p.mpMax > 0 ? mbar('mp', p.mp, p.mpMax, '마나') : ''}${mbar('st', p.st, p.stMax, '스태미나')}</div>${buildRes(p)}`;
  if (run0 && run0.lv && !b) { const lo = LV_XP[run0.lv - 1] || 0, hi = LV_XP[run0.lv]; h += hi ? `<div class="xpbar" role="progressbar" aria-label="경험치" aria-valuemin="0" aria-valuemax="${hi - lo}" aria-valuenow="${Math.round(run0.xp - lo)}"><i style="width:${Math.max(0, Math.min(100, (run0.xp - lo) / (hi - lo) * 100))}%"></i><span>경험치 ${Math.round(run0.xp)}/${hi} · 다음 레벨까지 ${Math.max(0, Math.ceil(hi - run0.xp))}</span></div>` : '<p class="mini">가장 높은 레벨입니다.</p>'; }
  const extra = [];
  if (b) extra.push(`<span data-info="speed" tabindex="0">속도 ${r1(pSpeed(b))}</span>`);
  const eq = Object.values(p.eq).filter(Boolean);
  if (eq.length) extra.push('장착: ' + eq.map(k => `<span class="gr-${ITEMS[k].g || 'n'}">${inm(k, ITEMS[k].g || 'n')}</span>`).join(', '));
  if (extra.length) h += `<div class="mini">${extra.join(' · ')}</div>`;
  if (b) h += stsHtml(p, b);
  if (b && b.seal && b.seal.length) h += `<div class="mini sealln" data-info="seal" tabindex="0">🔏 봉인: ${b.seal.map(x => esc(x.n)).join(', ')}</div>`;
  return h + `</div>`;
}

/* ---------- 전투 ---------- */
const AGROUP = [
  ['공격', ['basic', 'heavy']],
  ['스킬', null],
  ['직업', ['sig']],
  ['지키기', ['guard', 'dodge']],
  ['회복·기타', ['flaskL', 'flaskM', 'flaskS', 'flee']],
];
/* 휴대폰 행동판의 짧은 이름 */
const ASHORT = { guard: '방어', dodge: '흘리기', flaskL: '❤️ 생명력', flaskM: '💧 마나', flaskS: '⚡ 스태미나', flee: '도망' };
const ATIP = { flaskS: '스태미나 +' + STAM_FLASK + ' · 탈진 풀림', basic: '붕괴 +10', heavy: '피해 180% · 붕괴 +35', guard: '다음 행동까지 받는 피해 절반', dodge: '고른 적의 다음 공격 피해 60% 감소', flaskL: '생명력 30% · 중독·출혈·점화·냉각 해제', flaskM: '마나 40% · 약화·취약 해제', flee: '실패하면 느린 행동' };
function dgBar(run) {
  const done = {}; for (const x of run.rooms || []) if (x.room) done[x.room] = x;
  let h = '<ol class="dgbar" aria-label="던전 진행">';
  for (let f = 1; f <= FLOORS; f++) {
    const cls = f === run.room ? 'now' : f < run.room ? 'past' : '';
    const ico = f === FLOOR_CAMP ? '⛺' : f === FLOOR_BOSS ? '👑' : PATH_AT.includes(f) && f > run.room ? '🔀' : done[f] && ROOM_TYPES[done[f].type] ? ROOM_TYPES[done[f].type].ico : (run.log6 && run.log6[f]) || '';
    const rt = done[f] && ROOM_TYPES[done[f].type]; const sr = floorName(f) + (f === FLOOR_CAMP ? ', 야영지' : f === FLOOR_BOSS ? ', 보스' : '') + (f === run.room ? ', 지금 있는 층' : f < run.room ? (rt ? ', ' + rt.n + ' 지남' : ', 지남') : '');
    h += `<li class="${cls}${f === FLOOR_CAMP ? ' camp' : ''}" data-info="floor:${f}" tabindex="${f === Math.max(1, Math.min(FLOORS, run.room || 1)) ? 0 : -1}"${f === run.room ? ' aria-current="step"' : ''}><span aria-hidden="true">${ico || (f < run.room ? '·' : '')}</span><span class="sr">${esc(sr)}</span></li>`;
  }
  h += '</ol>';
  const bl = Object.keys(run.buffs || {}).map(k => { const S = SHRINES.find(x => x.id === k); return `<span class="chip" data-info="buff:${k}" tabindex="0">${esc(S ? S.n : (EVBUFF[k] || [k])[0])} ${run.buffs[k]}</span>`; }).join('');
  return `<div class="card dgtop"><div class="dghead"><b>${run.ch || 1}챕터 · ${esc(floorName(run.room))}</b>${run.mode === 'hard' ? '<span class="chip hardtag">가혹</span>' : ''}${run.markCh ? `<span class="chip hardtag">표식 ${run.markPts || 0}점</span>` : ''}<span class="mini">${run.room < FLOOR_CAMP ? '상층' : run.room > FLOOR_CAMP && run.room < FLOOR_BOSS ? '하층' : ''}${run.path && PATHS[run.path] ? ' · ' + PATHS[run.path].ico + ' ' + PATHS[run.path].n : ''} · 남은 층 ${Math.max(0, FLOORS - run.room)}</span><span class="gold-n">골드 ${run.gold || 0}</span></div>${h}${bl ? `<div class="bufs">${bl}</div>` : ''}</div>`;
}
function doorCard(r, i) {
  const T = ROOM_TYPES[r.type]; const stars = T.fight ? '★'.repeat(r.risk || 1) + '☆'.repeat(4 - (r.risk || 1)) : '';
  let body = '';
  if (T.fight) {
    const rep0 = r.en && r.en[0]; const R0 = rep0 && ROLES[rep0[0]];
    const SQ = r.squad && SQUADS.find(x => x.id === r.squad); if (SQ) body += `<span class="mini dr-sq">${esc(SQ.n)}</span>`;
    body += r.strong ? `<span class="dr-what">강적 <b>${esc(r.strong)}</b> <span class="mini">Lv${r.lv}</span></span>` : R0 ? `<span class="dr-what">${R0.ico} ${rep0[1] ? '정예 ' : ''}${esc((r.names && r.names[rep0[0]]) || R0.n)}${r.en.length > 1 ? ' 외 ' + (r.en.length - 1) : ''} <span class="mini">Lv${r.lv}</span></span>` : '';
  }
  if (r.shrine) { const S = SHRINES.find(x => x.id === r.shrine); body += `<span class="dr-what">${esc(S.n)}</span><span class="mini">${esc(S.d)} 3개 방 동안.</span>`; }
  if (r.mods && r.mods.length) body += `<span class="dr-mods">${r.mods.map(m => `<span class="chip mod" data-info="mod:${m}">${esc(ROOM_MODS[m].n)}</span>`).join('')}</span><span class="mini">${r.mods.map(m => esc(ROOM_MODS[m].d)).join(' ')}</span>`;
  return `<button class="door t-${r.type}" data-a="door" data-k="${i}"><span class="dr-h"><span class="dr-ico" aria-hidden="true">${T.ico}</span><b>${esc(T.n)}</b>${stars ? `<span class="dr-risk"><span aria-hidden="true">${stars}</span><span class="rw">위험 ${RISK_W[Math.max(1, Math.min(4, r.risk || 1))]}</span></span>` : ''}</span>${body}<span class="dr-hint">${esc(rewardHint(r))}</span></button>`;
}
const RISK_W = { 1: '낮음', 2: '보통', 3: '높음', 4: '매우 높음' }; /* 10월 7일 2차: 별에 읽히는 이름 */
const rewardHint = r => r.hide ? '보상은 열어 봐야 안다' : ROOM_TYPES[r.type].hint; // 10월 4일: 보상은 일부 문에만 적힌다
/* 갈래길: 길 셋 가운데 하나 (다음 갈래길이나 야영지 · 보스 앞까지) */
function crossCard(id) {
  const P = pathOf(id, G.run.mode), f = G.run.room; const to = Math.min(f < FLOOR_CAMP ? FLOOR_CAMP : FLOOR_BOSS, PATH_AT.find(x => x > f) || FLOOR_BOSS) - 1;
  const x = v => '×' + v; const W = Object.entries(P.w || {}).filter(([t]) => ROOM_TYPES[t]).map(([t, v]) => ROOM_TYPES[t].n + ' ' + x(v));
  const nums = [P.hp === 1 && P.dmg === 1 ? '적 체력 · 피해 그대로' : `적 체력 <b>${x(P.hp)}</b> · 피해 <b>${x(P.dmg)}</b>`, `전리품 <b>${x(P.loot)}</b> · 골드 <b>${x(P.gold)}</b>`].concat(P.up ? [`장비 등급 ${P.up > 0 ? '오름' : '내림'} <b>${Math.round(Math.abs(P.up) * 100)}%</b>`] : []);
  return `<button class="door t-path-${id}" data-a="path" data-k="${id}"><span class="dr-h"><span class="dr-ico" aria-hidden="true">${P.ico}</span><b>${esc(P.n)}</b>${P.risk ? `<span class="dr-risk${P.risk < 0 ? ' down' : ''}">${P.risk > 0 ? '위험 ▲' : '위험 ▼'}</span>` : ''}</span><span class="mini">${esc(P.d)}</span><span class="dr-nums">${nums.join(' · ')}</span>${W.length ? `<span class="dr-w">나오는 문(큰 길 대비): ${esc(W.join(', '))}</span>` : ''}<span class="dr-hint">${f}층부터 ${to}층까지</span></button>`; /* 10월 7일 2차: PATHS의 배율을 숫자로 함께 */
}
function vRunMap() {
  const run = G.run, p = run.p; dgInit(run);
  let h = vPlayerPanel(p, null) + dgBar(run);
  const R = run.cur;
  if (!R && run.cross) {
    h += `<section class="card"><h3>갈래길${q('rooms', '방과 보스')}</h3><p class="mini">다음 갈래길까지 걸을 길을 고릅니다. 층마다 문을 고르는 것은 그대로입니다.</p><div class="doors">${Object.keys(PATHS).filter(id => !(id === 'quiet' && markOn(run, 'noquiet'))).map(crossCard).join('')}</div>${markOn(run, 'noquiet') ? '<p class="mini">표식 때문에 샛길은 막혀 있습니다.</p>' : ''}</section>`;
  } else if (!R && run.doors) {
    h += `<section class="card"><h3>갈림길${q('rooms', '방과 보스')}</h3><p class="mini">문 하나를 고릅니다. 경험치는 전투 방에서만 얻습니다. 고르기 전에도 장비를 바꿔도 됩니다.</p><div class="doors">${run.doors.map(doorCard).join('')}</div></section>`;
  } else if (R) h += vRoom(run, R);
  if (run.tree) h += `<section class="card"><h4>스킬 트리${run.tree.pts ? ` <span class="newtag">포인트 ${run.tree.pts}</span>` : ''}</h4><p class="mini">시작: ${TREE2[run.build].starters.map(id => esc(SK2[id].n)).join(', ')} · 장착 ${(run.skills || []).length}/${EQUIP_SLOTS2}: ${(run.skills || []).map(id => esc(SK2[id] ? SK2[id].n : id)).join(', ') || '없음'}. 방과 방 사이에 스킬을 열고 바꿉니다.</p><button data-a="tree"${run.tree.pts ? ' class="gold"' : ''}>트리 열기</button></section>`;
  const past = (run.rooms || []).filter(x => x.room);
  h += `<section class="card"><h4>지나온 길</h4><p class="mini">${past.map(x => floorName(x.room) + ' ' + (ROOM_TYPES[x.type] ? ROOM_TYPES[x.type].n : x.type === 'camp' ? '야영' : '') + (x.res ? ', ' + (x.res === 'win' ? '승리' : x.res === 'flee' ? '물러남' : '패배') : '')).join(' / ') || '아직 없습니다'}</p></section>`;
  return h;
}
function vRoom(run, R) {
  const T = ROOM_TYPES[R.type]; let h = `<section class="card room t-${R.type}">`;
  if (R.type === 'boss') { const B = BOSSES[run.boss]; return h + `<h3>보스</h3><p><b>${B.ico} ${esc(B.n)}</b></p><p class="lore">${esc(B.lore || '')}</p><p class="mini">보스전은 도망칠 수 없고, 너무 오래 끌면 보스가 광폭해집니다.</p><button class="gold" data-a="enter" data-focus>보스와 싸우기</button></section>`; }
  if (R.type === 'fate') return vFateRoom(run, h);
  if (R.type === 'camp') return h + `<h3>⛺ 야영지</h3><p class="lore">무너진 예배당 한쪽에 아직 따뜻한 재가 남아 있다.</p><p>쉬면 생명력과 스태미나가 모두 차고, 플라스크가 하나씩 찹니다. 여기서부터 하층이라 적이 더 거셉니다.</p><button class="gold" data-a="rest" data-focus>쉬고 내려간다</button></section>`;
  if (R.type === 'spring') return h + `<h3>💧 샘</h3><p>샘에서 쉬면 생명력이 50% 차고, 플라스크가 하나씩 찹니다.</p><button class="gold" data-a="rest" data-focus>샘에서 쉬기</button></section>`;
  if (R.type === 'shrine') { const S = SHRINES.find(x => x.id === R.shrine); return h + `<h3>🕯️ ${esc(S.n)}</h3><p>${esc(S.d)} 다음 3개 방 동안 이어집니다.</p><div class="row"><button class="gold" data-a="shrine" data-k="1" data-focus>기도한다</button><button data-a="shrine" data-k="0">지나친다</button></div></section>`; }
  if (R.type === 'altar') {
    const A = ALTARS.find(x => x.id === R.altar); const gc = altarGold(run); const useC = (run.cons || []).filter(c => CONS[c.id].use !== 'none').reduce((a, c) => a + c.n, 0); const can = A.id === 'gold' ? (run.gold || 0) >= gc : A.id === 'offer' ? run.bag.length > 0 : A.id === 'bone' ? useC >= 3 : A.id === 'ash' ? (run.cons || []).filter(ashOk).reduce((a, c) => a + c.n, 0) >= 4 : true;
    return h + `<h3>🩸 ${esc(A.n)}</h3><p>${esc(A.id === 'gold' ? A.d.replace('40', gc) : A.d)}</p>${A.id === 'gold' ? `<p class="mini">가진 골드 ${run.gold || 0}</p>` : ''}<div class="row"><button class="gold" data-a="altar" data-k="1"${can ? '' : ' disabled'} data-focus>${A.id === 'offer' ? '바칠 장비 고르기' : '거래한다'}</button><button data-a="altar" data-k="0">지나친다</button></div>${!can ? `<p class="mini">${A.id === 'gold' ? '골드가 모자랍니다.' : A.id === 'ash' ? '태울 소모품이 넷 모자랍니다.' : A.id === 'bone' ? '바칠 소모품이 셋 모자랍니다.' : '바칠 장비가 가방에 없습니다.'}</p>` : ''}</section>`;
  }
  if (R.type === 'event') {
    const E0 = EVENTS.find(x => x.id === R.event);
    const dis = o => (E0.id === 'reliquary' && o.id === 'force' && run.p.st < 40) || (E0.id === 'buried' && o.id === 'dig' && run.p.st < 50) || (E0.id === 'monk' && o.id === 'feed' && !(run.p.flask.life + run.p.flask.mana + (run.p.flask.stam || 0)));
    return h + `<h3>❔ ${esc(E0.n)}</h3><p class="lore">${esc(E0.lore)}</p><div class="evopts">${E0.opts.map(o => `<button class="evo" data-a="event" data-k="${o.id}"${dis(o) ? ' disabled' : ''}><b>${esc(o.n)}</b>${o.d ? `<small>${esc(o.d)}</small>` : ''}</button>`).join('')}</div></section>`;
  }
  // 전투 방
  h += `<h3>${T.ico} ${esc(T.n)}${R.strong ? ' · ' + esc(R.strong) : R.squad && SQUADS.find(x => x.id === R.squad) ? ' · ' + esc(SQUADS.find(x => x.id === R.squad).n) : ''}${q('rooms', '방과 보스')}</h3>`;
  if (R.ambush) h += `<p class="warn">매복입니다. 적이 먼저 움직이고 더 거셉니다. 대신 쓰러뜨린 적이 전리품을 더 자주 떨굽니다.</p>`;
  if (R.mods && R.mods.length) h += R.mods.map(m => `<p class="mini"><b>${esc(ROOM_MODS[m].n)}</b>: ${esc(ROOM_MODS[m].d)}</p>`).join('');
  h += `<p>이 방의 적 <span class="mini">Lv${R.lv || 1}</span></p><ul class="elist">${R.en.map((x, i) => `<li>${ROLES[x[0]].ico} ${i === 0 && R.strong ? esc(R.strong) + ' (강적)' : (R.tough && R.tough.includes(i) ? '[강인] ' : '') + (x[1] ? '정예 ' : '') + esc((R.names && R.names[x[0]]) || ROLES[x[0]].n)} <span class="mini">${ROLES[x[0]].n} · ${ROLES[x[0]].row === 'front' ? '전열' : '후열'}</span></li>`).join('')}${run.next && run.next.chase ? '<li>굶주린 수도사 <span class="mini">전열</span></li>' : ''}</ul>${q('roles', '적의 역할')}`;
  const nx = run.next || {};
  { const n3 = run.next3 || {}; if (['normal', 'ambush'].includes(R.type) && Object.keys(n3).length) h += `<p class="mini warn">${n3.pre ? Object.keys(n3.pre).map(k => KW_N[k] + ' ' + n3.pre[k]).join(' · ') + '을(를) 안고 들어갑니다. ' : ''}${n3.ambush ? '모래 매복입니다. ' : ''}${n3.herald ? '여왕의 전령이 보낸 정예가 기다립니다. ' : ''}${n3.noon ? '작열하는 한낮, 열기 ' + n3.noon + '에서 시작합니다.' : ''}</p>`; } // 3챕터 이벤트가 붙인 것
  if (nx.pre) h += `<p class="mini warn">${nx.pre.weak ? '약화·취약을 안고 ' : ''}${nx.pre.poison ? '중독 ' + nx.pre.poison + '을 안고 ' : ''}들어갑니다.</p>`;
  h += `<p class="mini">보상: ${R.hide ? esc(rewardHint(R)) : '골드 ' + R.gold + (R.mods && (R.mods.includes('bell') || R.mods.includes('drums')) ? ' ×1.5' : '') + ', ' + esc(T.hint)}. 들어가기 전에 장비를 바꿔도 됩니다.</p><div><button class="gold" data-a="enter" data-focus>방에 들어가기</button></div></section>`;
  return h;
}

