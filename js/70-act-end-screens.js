'use strict';
/* ---------- 행동 ---------- */
const PACE = { step: -1, slow: 1600, normal: 1000, fast: 450, instant: 0 };
const PACEN = { step: '한 단계씩', slow: '느리게', normal: '보통', fast: '빠르게', instant: '즉시' };
const sleep = ms => new Promise(r => setTimeout(function hold() { if (typeof G !== 'undefined' && G.hudEd) setTimeout(hold, 120); else r(); }, ms)); /* 전투 화면 편집 중(G.hudEd)에는 적 차례도 멈춘다 */
function waitStep() { return new Promise(r => { G.stepResolve = r; render(); }); }
function actTarget(b, a) {
  if (a.self || a.aoe) return null;
  const sel = G.sel ? b.en.find(e => e.id === G.sel && e.alive) : null;
  if (sel && canTarget(b, sel, a) && !(a.id === 'dodge' && sel.role === 'root')) return sel;
  return autoTarget(b, a);
}
function doAct(id, tid) {
  const b = G.b; if (!b || b.over || G.busy) return;
  const acts = actionList(b); const a = acts.find(x => x.id === id);
  if (!a || !a.ok) return;
  if (!riskAsk(b, a)) return;
  const t = tid ? b.en.find(e => e.id === tid && e.alive) : actTarget(b, a);
  G.liveMk = { b, x: b.log[b.log.length - 1] };
  commitAct(id, t ? t.id : null);
  playerAct(b, id, t ? t.id : null);
  if (G.sel && !(b.en.find(e => e.id === G.sel) || {}).alive) G.sel = null;
  liveSay(liveNew(b), true);
  if (b.waiting) animate(b); else afterTurn(b);
}
function afterTurn(b) {
  if (G.b === b) saveBattle();
  if (G.scr === 'tut') tutCheck(b);
  if (G.scr !== 'tut' && !G.data.seenBreak && b.rec.some(x => x.k === 'break')) { G.data.seenBreak = true; saveLocal(); setTimeout(() => openSheet('help', { k: 'break', first: 1 }), 50); }
  if (G.scr === 'scen') { b.pActs = (b.pActs || 0) + 1; if (b.pActs >= 10 && !b.over) b.over = 'open'; }
  render();
}
/* 다음에 움직일 적 (알림용): 이번 라운드 줄의 맨 앞, 줄이 비었으면 다음 라운드의 맨 앞 */
function nextActor(b) {
  const head = (b.queue && b.queue.length) ? b.queue[0] : (roundOrder(b, false)[0] || {}).id;
  if (!head || head === 'p') return null;
  const e = b.en.find(x => x.id === head); return e && e.alive && e.role !== 'root' ? e : null;
}
/* 적이 한 명씩: 먼저 "누가 무엇을 한다"를 알리고, 그다음 결과를 보여준다 */
async function animate(b) {
  G.busy = true; G.skip = false; hidePop();
  const pace = () => G.skip ? 0 : PACE[G.pace || 'normal'];
  const wait = async (f) => { const v = pace(); if (v < 0) await waitStep(); else if (v) await sleep(v * f); };
  G.banner = null; render(); if (pace() > 0) await wait(0.5);
  while (b.waiting && G.b === b) {
    const nx = nextActor(b);
    if (nx) {
      G.banner = { who: nx.n, ico: nx.ico, what: nx.stun > 0 ? '😵 비틀거려 행동을 놓친다' : (() => { const ib = intentBadge(b, nx); return ib.ico + ' ' + ib.txt + (ib.num !== '' ? ' ' + ib.num : ''); })(), id: nx.id, phase: 'pre' };
      b.lastActor = nx.id; render(); await wait(0.55);
      if (G.b !== b) break;
    }
    const r = stepWorld(b);
    if (nx && G.banner) G.banner.phase = 'post';
    liveSay(liveNew(b));
    render();
    if (r === 'acted' && pace() > 0) await wait(0.75);
  }
  b.lastActor = null; G.banner = null; G.busy = false; G.skip = false; G.stepResolve = null;
  if (!b.over && G.b === b) liveSay('내 차례입니다');
  if (!b.over) { G.myTurnFlash = true; setTimeout(() => { G.myTurnFlash = false; const el = document.querySelector('.turnban.me'); if (el) { const last = G.b && G.b.log[G.b.log.length - 1]; el.remove(); } }, 900); }
  afterTurn(b);
}

/* ================= 화면 ================= */
const shownHp = v => v > 0 && v < 1 ? 1 : Math.round(v);
function bar(cls, v, max, label) { const w = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0; return `<div class="bar ${cls}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${Math.round(max)}" aria-valuenow="${shownHp(v)}"><i style="width:${w}%"></i><span>${esc(label)} ${shownHp(v)}/${Math.round(max)}</span></div>`; }
function vDead() {
  const run = G.run, g = run.grave || {}; const SKM = skillMap(run.build);

  const c3 = (run.ch || 1) >= 3; const hz = g.heat ? Object.entries(g.heat).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + Math.round(v)).join(' · ') : '';
  return vPlayerPanel(run.p, null) + `<section class="card grave"><h3>쓰러졌습니다${modeTag(run)}${run.markCh ? ' <span class="chip hardtag">표식 도전</span>' : ''}</h3>${unlNewsHtml()}<p class="lore">${c3 ? esc(chData(3).deathLine) : '돌바닥이 차갑다. 이 이름은 더 내려가지 못한다.'}</p>${hz ? `<p class="mini">열기가 오른 곳: ${esc(hz)}</p>` : ''}
<p>${esc(run.cname || BUILDS[run.build].n)}(${esc(BUILDS[run.build].n)}, Lv ${run.lv || 1})의 여정은 ${esc(g.roomN || '')}에서 끝났습니다. 쓰러진 캐릭터는 돌아오지 않습니다. 새 캐릭터로 다시 시작합니다.</p>
${graveKill(g)}${graveContext(g)}<dl class="gdl"><dt>장비</dt><dd>${(g.eq || []).map(k => esc((ITEMS[k] || { n: k }).n)).join(', ') || '없음'}</dd><dt>능력치</dt><dd>${STAT_KEYS.map(k => STATN[k] + ' ' + (g.stats ? g.stats[k] || 0 : 0)).join(' · ')}</dd></dl>
<button class="gold wide" data-a="giveupend" data-focus>기록을 남기고 마치기</button></section>`;
}

/* 결정타: 누가, 무엇으로, 얼마나, 무엇이 더해졌나 (10월 7일 2차) */
const hitWho = h => h.dot ? (h.l || '지속 피해') : h.n ? h.n + (h.it ? '의 ' + h.it : '') : (h.l || '피해');
const hitMods = h => h.m && h.m.length ? ` <span class="mini">(${esc(h.m.join(', '))})</span>` : '';
function graveKill(g) {
  const k = g.kill; if (!k) return '';
  const hs = g.hits || [];
  return `<div class="killb"><p class="mini">${k.left > 0 ? '마지막으로 받은 피해' : '결정타'}</p><p>${esc(hitWho(k))} <b class="kd">${k.d}</b> 피해${hitMods(k)}${Number.isFinite(k.left) ? ` <span class="mini">· 남은 생명력 ${k.left}</span>` : ''}</p>${hs.length > 1 ? `<p class="mini">마지막 ${hs.length}번 받은 피해 (먼저 받은 것부터)</p><ol class="lasthits">${hs.map(h => `<li>${esc(hitWho(h))} <b>${h.d}</b> 피해${hitMods(h)}${h.big ? ' <span class="mini">· 예고된 큰 공격</span>' : ''}${Number.isFinite(h.left) ? ` <span class="mini">· 남은 생명력 ${h.left}</span>` : ''}</li>`).join('')}</ol>` : ''}</div>`;
}
/* 패배 분석은 남아 있는 사실만 읽는다. 없는 옛 기록은 추정하지 않는다. */
function graveContext(g) {
  const SKM = skillMap(g.build), names = { basic: '기본 공격', heavy: '강공격', guard: '방어', dodge: '흘리기', flaskL: '생명력 플라스크', flaskM: '정화 플라스크', flee: '도망', sig: '직업 기술' };
  const r = g.resources;
  return `<div class="gravecontext"><h4>마지막 선택과 남은 자원</h4><dl class="gdl"><dt>마지막 행동</dt><dd>${(g.last || []).map(id => esc(names[id] || (SKM[id] && SKM[id].n) || id)).join(' → ') || '기록 없음'}</dd>${r ? `<dt>쓰러졌을 때</dt><dd>스태미나 ${r.st} · 생명력 플라스크 ${r.life} · 정화 플라스크 ${r.cleanse}</dd>` : '<dt>남은 자원</dt><dd>기록 없음</dd>'}</dl><p class="mini">다음 판에서 살펴볼 규칙</p><div class="wrap">${q('intent')}${q('st')}${q('flask')}</div></div>`;
}

const SV = {
  fun: { 1: '1 지루했다', 2: '2', 3: '3 보통', 4: '4', 5: '5 아주 재미있었다' },
  skw: { curious: '직업 전용 스킬이 궁금해서', strong: '강해 보여서', default: '처음 끼워진 그대로', combo: '조합을 시험해 보려고', other: '기타' },
  stk: { skill: '스킬을 바꿨다', item: '아이템을 바꿨다', stat: '능력치를 다르게 찍었다', same: '같은 방식으로 다시 했다', none: '막힌 적 없다' },
  cf: { guard: '방패병 가로막기', break: '붕괴 게이지', parry: '흘리기', poison: '중독 수치', ward: '보호막', order: '행동 순서', skill: '스킬 설명', none: '없었다' },
  is: { click: '눌렀는데 안 눌렸다', layout: '화면이 넘치거나 가렸다', fast: '진행이 너무 빨랐다', slow: '진행이 너무 느렸다', text: '글이 읽기 어려웠다', save: '기록이나 이어 하기가 이상했다', none: '없었다' },
  want: { class: '직업이나 스킬이 더', dungeon: '던전이 더 길게', story: '이야기', art: '그림 (비주얼)', diff: '난이도 선택', other: '기타' },
  board: { yes: '그렇다', no: '아니다', unseen: '못 봤다' },
};
const svRadio = (name, map, inline) => Object.entries(map).map(([v, l]) => `<label class="${inline ? 'sv-i' : 'sv-b'}"><input type="radio" name="${name}" value="${v}"> ${esc(l)}</label>`).join('');
const svCheck = (name, map) => Object.entries(map).map(([v, l]) => `<label class="sv-b"><input type="checkbox" name="${name}" value="${v}"> ${esc(l)}</label>`).join('');
const checks = n => Array.from(document.querySelectorAll('input[name="' + n + '"]:checked')).map(x => x.value);
function vSurvey() {
  const run = G.run;
  const clear = run.phase === 'clearsv'; const buys = clear && run.shop ? run.shop.log.filter(x => x.a === 'buy') : [];
  const doorN = x => x.offered.map((o, i) => { const T = ROOM_TYPES[o.split('+')[0]]; return (i === x.picked ? '[' : '') + (T ? T.n : o) + (i === x.picked ? ']' : ''); }).join(' / ');
  return `<section class="card survey"><h3>${clear ? (run.ch || 1) + '챕터를 넘은 소감' : '이번 판에 대한 질문'}</h3><p>${clear ? '보스를 쓰러뜨리고 상점까지 들렀습니다.' : run.result === 'lose' ? esc(run.cname || '이 캐릭터') + '의 여정이 끝났습니다.' : '이번 판을 마쳤습니다.'} 1~2분이면 끝납니다. 모든 문항은 답하고 싶은 것만 골라도 됩니다.</p>
  <label for="fork">이번 챕터에서 가장 고민한 갈림길</label><select id="fork"><option value="">고르지 않음</option>${(run.doorLog || []).map(x => `<option value="${x.floor}">${esc(floorName(x.floor) + ': ' + doorN(x))}</option>`).join('')}</select>
  <label for="forknote">무엇을 두고 고민했나요?</label><input id="forknote" type="text" maxlength="200">
  ${clear ? `<label for="shopwhy">상점에서 ${buys.length ? esc(buys.map(x => ITEMS[x.tpl] ? ITEMS[x.tpl].n : x.tpl).join(', ') + '을(를) 산') : '아무것도 사지 않은'} 이유</label><textarea id="shopwhy" rows="2"></textarea>` : ''}
  <fieldset><legend>이번 판은 재미있었나요?</legend><div class="sv-row">${svRadio('fun', SV.fun, true)}</div></fieldset>
  <fieldset><legend>안전하게 갈지 빠르게 끝낼지, 자원을 지금 쓸지 아낄지 고민한 순간이 있었나요?</legend><div class="sv-row"><label class="sv-i"><input type="radio" name="dl" value="yes"> 있었다</label><label class="sv-i"><input type="radio" name="dl" value="no"> 없었다</label></div></fieldset>
  <label for="dnote">있었다면 어떤 순간이었나요?</label><textarea id="dnote" rows="2"></textarea>
  <fieldset><legend>스킬 칸은 어떻게 골랐나요?</legend>${svRadio('skw', SV.skw)}</fieldset>
  <fieldset><legend>막혔을 때 무엇을 했나요? 해당하는 것을 모두 골라 주세요.</legend>${svCheck('stk', SV.stk)}</fieldset>
  <fieldset><legend>헷갈렸던 규칙이 있었나요? 모두 골라 주세요.</legend>${svCheck('cf', SV.cf)}</fieldset>
  <fieldset><legend>불편하거나 이상했던 것이 있었나요? 모두 골라 주세요.</legend>${svCheck('is', SV.is)}</fieldset>
  <label for="isnote">이상했던 것을 한 줄로 적어 주면 고치는 데 큰 도움이 됩니다.</label><input id="isnote" type="text" maxlength="200">
  <label for="hard">가장 어려웠던 방</label><select id="hard"><option value="">고르지 않음</option>${(run.rooms || []).filter(x => x.room && x.res).map(x => `<option value="${x.room}">${esc(floorName(x.room) + ' ' + (ROOM_TYPES[x.type] ? ROOM_TYPES[x.type].n : ''))}</option>`).join('')}</select>
  <label for="snote">그 밖에 하고 싶은 말</label><textarea id="snote" rows="2"></textarea>
  <div class="stickbar"><button class="gold wide" data-a="survey">${clear ? '저장하고 계속' : '저장하고 타이틀로'}</button></div></section>`;
}

function vFinal() {
  return `<section class="card survey"><h3>마지막 질문</h3><p class="mini">여러 판을 해 본 뒤에 답해 주세요. 답하고 싶은 것만 골라도 됩니다.</p>
  <fieldset><legend>직업이나 스킬 조합마다 싸우는 방식이 달랐나요?</legend><div class="sv-row"><label class="sv-i"><input type="radio" name="fd" value="very"> 많이 달랐다</label><label class="sv-i"><input type="radio" name="fd" value="some"> 조금 달랐다</label><label class="sv-i"><input type="radio" name="fd" value="same"> 거의 같았다</label></div></fieldset>
  <label for="fnote">무엇이 달랐고 무엇이 같았나요?</label><textarea id="fnote" rows="2"></textarea>
  <label for="ffav">가장 재미있었던 직업과 스킬 조합은?</label><input id="ffav" type="text" maxlength="120" placeholder="예: 암살자, 독 단검·독구름·독 격발">
  <fieldset><legend>다시 하고 싶나요?</legend><div class="sv-row">${svRadio('again', { 1: '1 아니다', 2: '2', 3: '3 보통', 4: '4', 5: '5 꼭 하고 싶다' }, true)}</div></fieldset>
  <fieldset><legend>랭킹을 보고 다시 해 보고 싶어졌나요?</legend><div class="sv-row">${svRadio('fb', SV.board, true)}</div></fieldset>
  <fieldset><legend>다음 버전에 가장 바라는 것 하나</legend>${svRadio('want', SV.want)}</fieldset>
  <label for="fitem">막히지 않았는데 아이템을 바꿔 본 적이 있다면, 왜 바꿨나요?</label><textarea id="fitem" rows="2"></textarea>
  <div style="margin-top:10px"><button class="gold" data-a="finalsave">답 저장하기</button></div></section>`;
}

/* 아직 얻지 않은 장비(고르기 창): 등급과 기본 수치 범위를 함께 보인다 */
function itemCard(k, extra) {
  const I = ITEMS[k]; const g = I.g || 'n'; const R = GRADE[g]; const sb = SLOT_BASE[tplKind(k)]; const v = sb.v[itemChOf(k) - 1] || sb.v[0];
  const range = sb.k === 'flask' ? `${sb.lab} ${Math.round(v * (1 + R.lo / 100) * 1000) / 10}~${Math.round(v * (1 + R.hi / 100) * 1000) / 10}%` : `${sb.lab} ${r1(v * (1 + R.lo / 100))}~${r1(v * (1 + R.hi / 100))}`;
  return `<div class="icard grb-${g}"><div class="idet-h"><b class="in gr-${g}">${inm(k, g)}</b>${gradeTag(g)}<span class="mini">${SLOT_N[I.slot]}</span></div><div class="idet-base">${range}</div>${I.act ? `<div class="l act">${esc(I.act)}</div>` : ''}${I.cost ? `<div class="l cost">대가: ${esc(I.cost)}</div>` : ''}${I.lore ? `<p class="lore">${esc(I.lore)}</p>` : ''}${extra || ''}</div>`;
}

function reasonPicker() { return `<fieldset class="reasons"><legend>왜 바꾸나요?</legend>${REASONS.map((r, i) => `<label><input type="radio" name="rs" value="${r[0]}"${i === 0 ? '' : ''}> ${r[1]}</label>`).join(' ')}</fieldset><label for="rnote">메모. 적지 않아도 됩니다.</label><input id="rnote" type="text">`; }
function vSheet() {
  const S = G.sheet; if (!S || (S.data.first && (S.kind === 'skills' || S.kind === 'stats'))) return ''; // 캐릭터 만들기의 스킬·능력치는 창이 아니라 만들기 화면 안에 그린다
  const [title, body] = sheetParts(S);
  return `<div class="sheet-bg${hudLiveSheet() ? ' live' + (G.hudTop ? ' ltop' : '') : ''}" data-a="closebg"><div class="sheet sh-${S.kind}" role="dialog" aria-modal="true" aria-labelledby="shtitle"><div class="shead"><h3 id="shtitle">${esc(title)}</h3>${S.kind === 'equip' || S.kind === 'drop' || S.kind === 'help' || S.kind === 'settings' || S.kind === 'toasts' || S.kind === 'offer' || S.kind === 'awkview' || S.kind === 'codex' || S.kind === 'changes' ? '<button class="sm" data-a="close">닫기</button>' : ''}</div>${body}</div></div>`;
}
