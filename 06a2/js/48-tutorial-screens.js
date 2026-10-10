'use strict';
/* ===== 한 화면 전투 배치 (창 크기에 맞춤) ===== */
const COACH = [
  '적 카드를 누르면 그 적이 대상으로 고정되고, 행동 버튼에 적힌 대상도 바뀝니다.',
  '행동 버튼에 마우스를 올리면(휴대폰은 길게 누르면) 그 행동이 무엇을 하는지, 내 다음 차례 전에 누가 움직이는지가 뜹니다.',
  '적 카드 아래 예고의 글씨가 굵어지고 테두리가 두꺼워지면 위험한 행동입니다. 강타는 흘리기나 방어로 받거나, 붕괴 게이지를 채워 끊습니다. 방패병이 막는 적에게는 근접 공격이 닿지 않습니다.',
  '생명력이 낮아지면 생명력 막대에 "위험"이 뜨고, 생명력 플라스크 버튼에 "← 생명력 낮음"이 붙습니다. 싸움의 흐름은 전장 위 최근 기록에 보이고, 피해 줄 아래에 그 숫자가 나온 까닭이 한 줄 붙습니다. 전체 기록은 넓은 화면은 오른쪽, 휴대폰은 전체 기록 버튼에서 봅니다.',
];
/* ===== 0.6a.2 수련장 (data/tutorial.js) ===== */
function tutNew(b, id) { // 이 장면에서 처음 배우는 행동: 한 번 써 보기 전까지 빛난다
  const L = TUT[G.tut.i]; if (!L.allow) return false; const prev = G.tut.i ? (TUT[G.tut.i - 1].allow || []) : [];
  return !prev.includes(id) && !b.rec.some(x => x.k === 'act' && x.a === id);
}
const TUT_ACTN = { basic: '기본 공격', heavy: '강공격', guard: '방어', dodge: '흘리기', flaskL: '❤️ 생명력 플라스크', flaskM: '🧪 정화 플라스크', flaskS: '⚡ 스태미나 플라스크' };
/* 전장 맨 위 한 줄: 목표와 "설명" (안내는 장면 앞 창이 맡고, 싸우는 동안에는 화면을 가리지 않는다. 10월 3일 만든 사람 요청) */
function vTutGoal(b) {
  const T = G.tut, L = TUT[T.i], last = T.i === TUT.length - 1;
  return `<div class="tutgoal${T.met ? ' met' : ''}" role="status"><span class="tgi" aria-hidden="true">${T.met ? '✓' : '🎯'}</span><span class="tgt"><small>수련장 ${T.i + 1}/${TUT.length}</small> ${T.met ? '해냈습니다' : esc(L.goal)}</span>${T.met && !b.over ? `<button class="sm gold" data-a="tutnext">${last ? '수련 마치기' : '다음 장면 →'}</button>` : ''}<button class="sm" data-a="tutinfo">설명</button></div>`;
}
/* 전투가 끝났을 때 행동판 자리 */
function vTutOver(b) {
  const T = G.tut, L = TUT[T.i], last = T.i === TUT.length - 1;
  if (T.met) return `<section class="dock tutover"><p><b class="okc">✓ 해냈습니다.</b> ${esc(L.after)}</p><button class="gold wide" data-a="tutnext" data-focus>${last ? '수련 마치기' : '다음 장면 →'}</button></section>`;
  return `<section class="dock tutover"><p><b>${b.over === 'lose' ? '쓰러졌습니다.' : '전투는 끝났지만 목표를 이루지 못했습니다.'}</b> <span class="mini">목표: ${esc(L.goal)}</span></p><div class="row"><button class="gold" data-a="tutretry" data-focus>다시 하기</button>${last ? '' : '<button data-a="tutnext">건너뛰기</button>'}</div></section>`;
}
/* 장면 앞 설명 창 (설명 버튼으로 다시 연다) */
function tutSheet(S) {
  const T = G.tut, L = TUT[T.i], last = T.i === TUT.length - 1;
  if (S.kind === 'tutdone') return ['✓ 해냈습니다', `<p>${esc(L.after)}</p><div class="row"><button class="gold" data-a="tutnext" data-focus>${last ? '수련 마치기' : '다음 장면 →'}</button><button data-a="close">마저 싸우기</button></div>`];
  const prev = T.i ? (TUT[T.i - 1].allow || []) : []; const nw = (L.allow || []).filter(id => !prev.includes(id));
  let body = `<p class="tutg2"><span aria-hidden="true">🎯</span> <b>목표</b> ${esc(L.goal)}</p>`;
  if (nw.length) body += `<p class="mini">이번에 새로 쓰는 행동: <b>${nw.map(id => esc(TUT_ACTN[id] || id)).join(', ')}</b> (빛나는 버튼)</p>`;
  if (L.tips && L.tips.length) body += `<ul class="tutlist2">${L.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  body += `<p class="mini">${L.safe ? '이 장면에서는 쓰러지지 않습니다(생명력 1에서 버팁니다).' : '이번에는 쓰러질 수 있습니다. 지면 이 장면만 다시 합니다.'} 싸우는 동안 목표는 전장 맨 위에 있고, "설명"으로 이 창을 다시 엽니다.</p>`;
  body += `<button class="gold wide" data-a="close" data-focus>${S.data.again ? '계속' : '시작'}</button>`;
  return [`수련장 ${T.i + 1}/${TUT.length} · ${L.n}`, body];
}
function vTutOffer() {
  return `<section class="card tutoff"><h3>🕯️ 나락 입구의 수련장</h3><p class="lore">계단이 시작되는 자리에 먼저 내려간 이들이 남긴 수련장이 있다. 짚 인형과 녹슨 칼, 벽에 새긴 가르침.</p>
  <p>직업도 스킬도 없는 견습생으로 전투의 기본을 여섯 장면에 나눠 익힙니다. 5분 남짓 걸리고, 쓰러져도 잃는 것이 없습니다.</p>
  <ol class="tutlist">${TUT.map(L => `<li><b>${esc(L.n)}</b> <span class="mini">${esc(L.goal)}</span></li>`).join('')}</ol>
  <p class="mini">보상은 없고, 끝내면 수료 표시가 남습니다. 메뉴의 🎯 수련장에서 언제든 다시 할 수 있습니다.</p>
  <div class="row"><button class="gold" data-a="tutgo" data-focus>수련장에 들르기</button><button data-a="tutskip">건너뛰고 캐릭터 만들기</button></div></section>`;
}
function vTutHub() {
  const d = G.data, clr = d.tutClear || [], done = !!d.tutDone, hasCur = !!(d.cur && !runOver(d.cur) && BUILDS[d.cur.build]);
  const nx = TUT.findIndex(L => !clr.includes(L.id));
  let h = `<section class="card tuthub"><h3>${done ? '🎓 수련장 수료' : '🕯️ 나락 입구의 수련장'}</h3>`;
  if (G.tutFin) h += `<p><b>여섯 장면을 모두 마쳤습니다.</b> 수료 표시가 남았습니다.</p><ul class="tutend">${TUT_END.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  else h += `<p class="mini">직업 없는 견습생으로 전투의 기본을 익힙니다. 쓰러져도 잃는 것이 없습니다. ${done ? '마친 장면은 골라서 다시 합니다.' : ''}</p>`;
  h += `<ol class="tutlist">${TUT.map((L, i) => { const ok = clr.includes(L.id); const can = done || ok || i === (nx < 0 ? 0 : nx); return `<li><button class="tutsc${ok ? ' ok' : ''}" data-a="tutsc" data-k="${i}"${can ? '' : ' aria-disabled="true" disabled'}><b>${ok ? '✓' : (i + 1) + '.'} ${esc(L.n)}</b><small>${esc(L.goal)}</small></button></li>`; }).join('')}</ol>`;
  h += `<div class="row">`;
  if (G.tutFin && !hasCur) h += `<button class="gold" data-a="tutmake" data-focus>캐릭터 만들기</button>`;
  else if (!G.tutFin) h += `<button class="gold" data-a="tutsc" data-k="${nx < 0 ? 0 : nx}" data-focus>${nx > 0 ? (nx + 1) + '장면부터 이어서' : '처음부터'}</button>`;
  h += `<button data-a="title"${G.tutFin && hasCur ? ' class="gold" data-focus' : ''}>타이틀로</button></div></section>`;
  return h;
}
function startTut(i) { G.tut = { i, met: false }; G.tutFin = false; G.scr = 'tut'; G.menuOpen = false; G.b = tutBattle(TUT[i]); G.b.stepMode = true; fdetFresh(); G.sel = null; G.sheet = null; openSheet('tutintro', {}); }
/* 행동이 끝날 때마다 목표를 본다. 이루면 수료 기록에 그 장면을 남긴다 */
function tutCheck(b) {
  const T = G.tut; if (!T || T.met || G.b !== b) return; const L = TUT[T.i];
  if (!TUT_CHECK[L.id](b)) return;
  T.met = true; const d = G.data; d.tutClear = d.tutClear || []; if (!d.tutClear.includes(L.id)) d.tutClear.push(L.id); saveLocal(); sfx('coin');
  if (!b.over) G.sheet = { kind: 'tutdone', data: {} }; // 해낸 순간 창으로 알린다(마저 싸울 수도 있다). 전투가 끝났으면 행동판 자리에 나온다
}
function tutNext() {
  const T = G.tut; if (!T) return;
  if (T.i + 1 < TUT.length) { startTut(T.i + 1); return; }
  const d = G.data; if (!d.tutDone) d.tutDone = Date.now(); d.seenGuide = true; saveLocal(); // 수련을 마치면 처음 안내는 건너뛴다(도움말에 그대로 있다)
  G.b = null; G.tutFin = true; G.scr = 'tut'; render(); window.scrollTo(0, 0);
}
function newcharGo() { if (!G.data.seenGuide) { G.guideI = 0; G.afterGuide = 'create'; G.scr = 'guide'; render(); } else beginCreate(); }
function vCoach() {
  if (G.data.seenCoach || G.scr !== 'run') return '';
  const i = Math.min(G.coachI || 0, COACH.length - 1);
  return `<div class="coach" role="status"><span class="mini">처음 전투 안내 ${i + 1}/${COACH.length}</span><p>${esc(COACH[i])}</p><div class="row">${i > 0 ? `<button class="sm gold" data-a="coachnext">${i === COACH.length - 1 ? '알겠습니다' : '다음'}</button>` : '<span class="mini">적 카드를 누르면 다음으로 넘어갑니다</span>'}<button class="sm" data-a="coachoff">안내 끄기</button></div></div>`;
}
