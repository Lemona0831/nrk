'use strict';
/* ---------- 결과 보기 (소유자) ---------- */
async function readTester(id) {
  const [rs, ss, fs, ms, bs] = await Promise.all([G.db.collection('playtest/' + id + '/' + COL.runs).get(), G.db.collection('playtest/' + id + '/' + COL.scen).get(), G.db.doc('playtest/' + id + '/' + COL.survey + '/final').get(), G.db.doc('playtest/' + id).get(), G.db.doc('board/' + id).get().catch(() => ({ exists: false }))]);
  const runs = [];
  for (const d of rs.docs) {
    const r = Object.assign({}, d.data());
    if (!r.acts && r.chunks) {
      const cs = await G.db.collection('playtest/' + id + '/' + COL.runs + '/' + d.id + '/acts').get();
      r.acts = cs.docs.map(x => x.data()).sort((x, y) => x.i - y.i).reduce((acc, x) => acc.concat(x.a || []), []);
    }
    runs.push(r);
  }
  const meta = ms.exists ? ms.data() || {} : {};
  return { uid: id, name: meta.name || (bs.exists ? (bs.data() || {}).name : '') || '', login: meta.login || '', runs, scen: ss.docs.map(x => x.data()), final: fs.exists ? fs.data() : null };
}
/* 결과 보기의 테스터 이름: 로그인한 사람은 닉네임과 로그인 방식, 아니면 기록판 이름에 (익명), 둘 다 없으면 순번 */
function testerLabel(T, i) { return !T.name ? '테스터 ' + (i + 1) : T.login ? T.name + ' · ' + (PROVIDER_N[T.login] || T.login) : T.name + ' (익명)'; }
async function loadDash() {
  G.dash = null; G.dashErr = ''; G.dashReq = 1; if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = 'admin'; render();
  if (!G.db && siteCfg() && G.conn !== 'sitefail') { G.dashReq = 0; G.dashErr = '저장소에 연결하는 중입니다. 연결되면 자동으로 불러옵니다.'; render(); return; } // 접속 전에는 이 브라우저 기록으로 대신하지 않는다
  if (!G.db) { G.dashRaw = [{ uid: 'local', runs: G.data.runs, scen: Object.values(G.data.scen), final: G.data.final }]; G.dash = aggregate(G.dashRaw); G.dashErr = G.conn === 'sitefail' ? '저장소에 연결하지 못했습니다(' + (G.siteErr || '') + '). 이 브라우저 기록만 보여줍니다.' : '공유 저장소에 연결되지 않아 이 브라우저 기록만 보여줍니다.'; render(); return; }
  try {
    if (G.site) {
      const { data: rows, error } = await G.sb.rpc('admin_dump', { pass: G.adminPass || '' });
      if (error) throw Object.assign(new Error(error.message), { code: '관리자 암호 확인 실패' });
      const live = G.db; G.db = memDb(rows || []);
      try { const qs2 = await G.db.collection('playtest').get(); const testers2 = []; for (const d of qs2.docs) testers2.push(await readTester(d.id)); testers2.sort((x, y) => Math.min(...(x.runs.map(r => r.startedAt || 9e15)), 9e15) - Math.min(...(y.runs.map(r => r.startedAt || 9e15)), 9e15)); G.dashRaw = testers2; G.dash = aggregate(testers2); }
      finally { G.db = live; }
      render(); return;
    }
    const qs = await G.db.collection('playtest').get();
    const testers = [];
    for (const d of qs.docs) testers.push(await readTester(d.id));
    testers.sort((x, y) => Math.min(...(x.runs.map(r => r.startedAt || 9e15)), 9e15) - Math.min(...(y.runs.map(r => r.startedAt || 9e15)), 9e15));
    G.dashRaw = testers; G.dash = aggregate(testers);
  } catch (e) { G.dashErr = '기록을 읽지 못했습니다(' + (e && e.code || '오류') + ').'; }
  render();
}
function collectNotes(testers) {
  const out = []; const bossN = { mother: '1회차', tree: '2회차' };
  testers.forEach((T, ti) => {
    const who = testerLabel(T, ti);
    for (const r of T.runs || []) {
      if (!r || !BUILDS[r.build]) continue;
      const ctx = { who, build: r.build, run: bossN[r.boss] || r.boss, at: r.endedAt || r.updatedAt || r.startedAt };
      if (r.survey) {
        if (r.survey.dilemma || r.survey.note) out.push(Object.assign({}, ctx, { type: 'survey', where: '판 설문', label: r.survey.dilemma === 'yes' ? '고민 있었음' : r.survey.dilemma === 'no' ? '고민 없었음' : '', text: r.survey.note || '' }));
        if ((r.survey.issues && r.survey.issues.some(k => k !== 'none')) || r.survey.issueNote) out.push(Object.assign({}, ctx, { type: 'issue', where: '판 설문', label: (r.survey.issues || []).filter(k => k !== 'none').map(k => SV.is[k] || k).join(', '), text: r.survey.issueNote || '' }));
        if (r.survey.extra) out.push(Object.assign({}, ctx, { type: 'survey', where: '판 설문', label: '하고 싶은 말', text: r.survey.extra }));
        if (r.survey.hard !== '' && r.survey.hard != null && r.survey.hard !== '') out.push(Object.assign({}, ctx, { type: 'hard', where: '판 설문', label: '가장 어려운 방', text: floorName(+r.survey.hard) }));
      }
      for (const s of r.swaps || []) {
        const why = { need: '필요해서', curious: '재미있어 보여서', other: '기타' }[s.reason] || s.reason || '';
        out.push(Object.assign({}, ctx, { type: 'swap', where: (s.room ? floorName(s.room) + ' 들어가기 전' : '') + (s.ctx === 'block' ? ' · 막힘 선택' : s.ctx === 'free' ? ' · 자발' : ''), label: (s.on ? '장착 ' : '해제 ') + (ITEMS[s.item] ? ITEMS[s.item].n : s.item) + (why ? ' · ' + why : ''), text: s.note || '', at: s.t || ctx.at }));
      }
    }
    if (T.final) {
      const fd = { very: '많이 달랐다', some: '조금 달랐다', same: '거의 같았다' }[T.final.diff] || '';
      out.push({ who, build: '', run: '', type: 'final', where: '마지막 질문', label: fd ? '방식 차이: ' + fd : '방식 차이', text: T.final.note || '', at: T.final.at });
      if (T.final.itemWhy) out.push({ who, build: '', run: '', type: 'final', where: '마지막 질문', label: '막히지 않았는데 바꾼 이유', text: T.final.itemWhy, at: T.final.at });
      if (T.final.fav) out.push({ who, build: '', run: '', type: 'final', where: '마지막 질문', label: '가장 재미있었던 조합', text: T.final.fav, at: T.final.at });
    }
  });
  return out;
}
function testerRows(testers) {
  return testers.map((T, ti) => {
    const runs = T.runs || [];
    return { uid: T.uid, who: testerLabel(T, ti), started: runs.length, done: runs.filter(r => r.status === 'done' || r.survey).length, scen: (T.scen || []).length, final: !!T.final, last: Math.max(0, ...runs.map(r => r.updatedAt || r.endedAt || r.startedAt || 0)) };
  });
}
function csvCell(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
/* 파일 내려받기: 아티팩트 화면이면 그 기능으로, 일반 웹사이트(지인 주소)면 브라우저 내려받기로 */
async function saveFile(name, data) {
  if (G.downloads) { try { await G.downloads.save({ filename: name, data }); toast('내려받았습니다'); } catch (e) { toast('내려받기를 취소했습니다'); } return; }
  try {
    const type = /\.csv$/.test(name) ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('내려받았습니다');
  } catch (e) { toast('이 브라우저에서는 내려받기를 할 수 없습니다'); }
}
function dashJson() { return JSON.stringify({ v: VERSION, exportedAt: Date.now(), testers: (G.dashRaw || []).map((T, i) => Object.assign({ label: testerLabel(T, i) }, T)) }, null, 1); }
function notesCsv() {
  const rows = [['테스터', '빌드', '회차', '위치', '내용', '메모', '시각']];
  for (const n of collectNotes(G.dashRaw || [])) rows.push([n.who, n.build ? BUILDS[n.build].n : '', n.run, n.where, n.label, n.text, n.at ? new Date(n.at).toLocaleString('ko-KR') : '']);
  return '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\n');
}
async function archiveAll() {
  if (!G.db || !G.dashRaw) { toast('공유 저장소에 연결되어야 저장됩니다'); return; }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  G.archMsg = '전체 기록 저장 중…'; render();
  try {
    const T = G.dashRaw;
    await G.db.doc('archive/' + stamp).set({ at: Date.now(), v: VERSION, testers: T.length, runs: T.reduce((a, x) => a + (x.runs || []).length, 0), notes: collectNotes(T).length });
    for (let i = 0; i < T.length; i++) {
      const x = T[i]; const base = 'archive/' + stamp + '/testers/t' + String(i + 1).padStart(2, '0');
      await G.db.doc(base).set({ label: testerLabel(x, i), uid: x.uid, runs: (x.runs || []).map(r => { const m = Object.assign({}, r); delete m.acts; return m; }), scen: x.scen || [], final: x.final || null });
      for (const r of x.runs || []) { const acts = r.acts || []; for (let c = 0; c * CHUNK < acts.length; c++) await G.db.doc(base + '/acts/' + r.id + '_' + String(c).padStart(3, '0')).set({ run: r.id, i: c, a: acts.slice(c * CHUNK, (c + 1) * CHUNK) }); }
    }
    G.archMsg = '전체 기록을 저장했습니다: archive/' + stamp + ' (테스터 ' + T.length + '명)';
  } catch (e) { G.archMsg = '전체 기록을 저장하지 못했습니다(' + (e && e.code || '오류') + ').'; }
  render();
}
function aggregate(testers) {
  const byB = {}; const bn = CLASS_KEYS();
  for (const k of bn) byB[k] = { runs: 0, wins: { mother: 0, tree: 0 }, tries: { mother: 0, tree: 0 }, deathRoom: {}, hardRoom: {}, heavyResp: {}, healResp: {}, actCount: {}, breaks: 0, dodgedCharged: 0, deliberate: 0, fl5: [], dilemma: { yes: 0, no: 0 }, block: {}, room5: {}, stat: { str: 0, dex: 0, int: 0 }, statN: 0, picks: {}, combos: {}, fun: [], skw: {}, stk: {}, cf: {}, is: {} };
  let freeTry = 0, freeCurious = 0, testerN = testers.length, finals = { very: 0, some: 0, same: 0, again: [], want: {}, board: {} };
  const scen = {};
  for (const T of testers) {
    let triedFree = false;
    for (const r of T.runs || []) {
      if (!r || !BUILDS[r.build]) continue; const B = byB[r.build]; B.runs++;
      B.tries[r.boss] = (B.tries[r.boss] || 0) + 1; if (r.result === 'win') B.wins[r.boss]++;
      if (r.stats) { B.statN++; for (const k in B.stat) B.stat[k] += r.stats[k] || 0; }
      for (const c of r.choices || []) { const k = c.picked || 'none'; B.picks[k] = (B.picks[k] || 0) + 1; }
      if (r.skills) { const key = r.skills.slice().sort().join(','); B.combos[key] = (B.combos[key] || 0) + 1; }
      for (const d of r.deaths || []) B.deathRoom[d] = (B.deathRoom[d] || 0) + 1;
      if (r.survey && r.survey.hard !== '' && r.survey.hard != null) B.hardRoom[r.survey.hard] = (B.hardRoom[r.survey.hard] || 0) + 1;
      if (r.survey && r.survey.dilemma) B.dilemma[r.survey.dilemma] = (B.dilemma[r.survey.dilemma] || 0) + 1;
      if (r.survey) { const sv = r.survey; if (sv.fun) B.fun.push(sv.fun); if (sv.skillWhy) B.skw[sv.skillWhy] = (B.skw[sv.skillWhy] || 0) + 1; for (const k of sv.stuck || []) B.stk[k] = (B.stk[k] || 0) + 1; for (const k of sv.confuse || []) B.cf[k] = (B.cf[k] || 0) + 1; for (const k of sv.issues || []) B.is[k] = (B.is[k] || 0) + 1; }
      const r5 = (r.rooms || []).find(x => x.room === 4); if (r5) B.fl5.push(r5.flIn);
      B.block[r.blockPicked || '없음'] = (B.block[r.blockPicked || '없음'] || 0) + 1;
      let last = null;
      for (const x of r.acts || []) {
        if (x.k === 'act') {
          last = x; B.actCount[x.a] = (B.actCount[x.a] || 0) + 1;
          if (x.heavyIn) B.heavyResp[x.a] = (B.heavyResp[x.a] || 0) + 1;
          if (x.healIn) B.healResp[x.a] = (B.healResp[x.a] || 0) + 1;
          if (x.r === 4) { const key = r.blockPicked || '없음'; B.room5[key] = B.room5[key] || {}; B.room5[key][x.a] = (B.room5[key][x.a] || 0) + 1; }
        }
        if (x.k === 'break') B.breaks++;
        if (x.k === 'hit' && x.charged && (x.parried || x.dodged || x.d === 0)) B.dodgedCharged++;
        if (x.k === 'hit' && x.charged && x.d > 0 && last && last.canDodge && !['dodge', 'guard'].includes(last.a)) B.deliberate++;
      }
      for (const s of r.swaps || []) if (s.on && s.ctx === 'free') { triedFree = true; if (s.reason === 'curious') freeCurious++; }
    }
    if (triedFree) freeTry++;
    for (const s of T.scen || []) { if (!s || !s.results) continue; for (const x of s.results) { scen[x.id] = scen[x.id] || {}; const o = scen[x.id][s.build] = scen[x.id][s.build] || { n: 0, first: {}, delib: 0, stop: {} }; o.n++; o.first[x.first || '없음'] = (o.first[x.first || '없음'] || 0) + 1; o.delib += x.deliberate || 0; o.stop[x.stopWhat || '없음'] = (o.stop[x.stopWhat || '없음'] || 0) + 1; } }
    if (T.final && T.final.diff) finals[T.final.diff] = (finals[T.final.diff] || 0) + 1;
    if (T.final) { if (T.final.again) finals.again.push(T.final.again); if (T.final.want) finals.want[T.final.want] = (finals.want[T.final.want] || 0) + 1; if (T.final.board) finals.board[T.final.board] = (finals.board[T.final.board] || 0) + 1; }
  }
  return { byB, testerN, freeTry, freeCurious, finals, scen };
}
const ANAME = { basic: '기본 공격', heavy: '강공격', guard: '방어', dodge: '흘리기', flaskL: '생명력 플라스크', flaskM: '마나 플라스크', flee: '도망', viper: '독사의 일격', cloud: '독구름', scarcut: '상흔 베기', release: '상흔 방출', flame: '신성한 불꽃', purge: '정화의 빛', reverse: '역전' };
const topShare = m => { const v = Object.values(m); const s = v.reduce((a, c) => a + c, 0); if (!s) return null; const mx = Math.max(...v); const k = Object.keys(m).find(x => m[x] === mx); return { k, p: mx / s, n: s }; };
const modeOf = m => { const t = topShare(m); return t ? t.k : '—'; };
function vNotes() {
  const all = collectNotes(G.dashRaw || []);
  const f = G.nf || { b: 'all', t: 'all' };
  const TN = { all: '전체', survey: '판 설문', issue: '불편·버그', hard: '가장 어려운 방', swap: '아이템 교체', final: '마지막 질문' };
  const list = all.filter(n => (f.b === 'all' || n.build === f.b) && (f.t === 'all' || n.type === f.t)).sort((x, y) => (y.at || 0) - (x.at || 0));
  const withText = all.filter(n => n.text).length;
  let h = `<section class="card"><h4>의견 모아 보기</h4><p class="mini">테스터가 쓴 글과 선택을 모았습니다. 전체 ${all.length}건, 그중 직접 쓴 메모 ${withText}건.</p>`;
  h += `<div class="wrap">${['all'].concat(CLASS_KEYS()).map(k => `<button class="chip${f.b === k ? ' on' : ''}" data-a="nf" data-f="b" data-v="${k}">${k === 'all' ? '모든 빌드' : esc(BUILDS[k].n)}</button>`).join('')}</div>`;
  h += `<div class="wrap">${Object.keys(TN).map(k => `<button class="chip${f.t === k ? ' on' : ''}" data-a="nf" data-f="t" data-v="${k}">${TN[k]}</button>`).join('')}<label class="chk"><input type="checkbox" data-a="nfm"${f.m ? ' checked' : ''}> 메모 있는 것만</label></div>`;
  const shown = f.m ? list.filter(n => n.text) : list;
  if (!shown.length) h += '<p class="mini">해당하는 의견이 없습니다.</p>';
  else h += `<div class="notes">${shown.map(n => `<article class="note"><div class="nh"><b>${esc(n.who)}</b><span>${n.build ? esc(BUILDS[n.build].n) + ' · ' + esc(n.run) : ''}</span><span>${esc(n.where)}</span><span class="mini">${n.at ? esc(new Date(n.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : ''}</span></div><div class="nl">${esc(n.label)}</div>${n.text ? `<p class="nt">${esc(n.text)}</p>` : ''}</article>`).join('')}</div>`;
  return h + '</section>';
}
/* 테스터 기록 지우기: 고르고, 확인 문장을 쓰면 먼저 백업 파일을 내려받은 뒤 지운다 */
function vDelBox(TR) {
  const sel = (G.delSel || []).filter(u => TR.some(t => t.uid === u)); const names = TR.filter(t => sel.includes(t.uid)).map(t => t.who);
  let h = `<div class="row"><button class="sm" data-a="delask"${sel.length ? '' : ' disabled'}>고른 테스터 기록 지우기 (${sel.length}명)</button></div>`;
  if (G.delMsg) h += `<div class="banner" role="status">${esc(G.delMsg)}</div>`;
  if (G.delAsk && sel.length) h += `<div class="banner info" role="alertdialog" aria-labelledby="delq"><p id="delq"><b>${esc(names.join(', '))}</b>의 기록 ${TR.filter(t => sel.includes(t.uid)).reduce((a, t) => a + t.started, 0)}판을 저장소에서 지웁니다. 지운 기록은 되살릴 수 없습니다. 지우기 전에 백업 파일을 내려받습니다.</p><label for="delword">계속하려면 "지우기"라고 쓰세요</label><input id="delword" autocomplete="off"><div class="row"><button class="sm" data-a="delgo">백업을 받고 지우기</button><button class="sm" data-a="delno">취소</button></div></div>`;
  return h;
}
async function delTesters() {
  const sel = (G.delSel || []).slice(); const raw = (G.dashRaw || []).filter(T => sel.includes(T.uid));
  if (!sel.length || !G.sb || !G.adminPass) return;
  G.delMsg = '백업을 받고 지우는 중…'; render();
  try {
    await saveFile('nrk-' + VERSION + '-지우기전-백업-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ v: VERSION, exportedAt: Date.now(), testers: raw.map(T => Object.assign({ label: testerLabel(T, 0) }, T)) }, null, 1));
    const paths = []; sel.forEach(u => { paths.push('playtest/' + u, 'board/' + u); });
    const { data, error } = await G.sb.rpc('admin_delete', { pass: G.adminPass, paths });
    if (error) throw Object.assign(new Error(error.message), { code: error.code || '' });
    G.delMsg = raw.length + '명의 기록을 지웠습니다(문서 ' + (data == null ? '?' : data) + '개). 백업 파일은 내려받은 폴더에 있습니다.'; G.delSel = []; G.delAsk = false; G.dash = null; G.dashReq = 0; render();
  } catch (e) {
    const missing = e && (e.code === 'PGRST202' || /admin_delete|Could not find/i.test(e.message || ''));
    G.delMsg = missing ? '저장소에 지우기 함수가 아직 없습니다. docs/검증/관리자-지우기.sql을 Supabase의 SQL Editor에서 한 번 실행한 뒤 다시 눌러 주세요. 아무것도 지우지 않았습니다.' : '지우지 못했습니다(' + ((e && (e.code || e.message)) || '오류') + '). 아무것도 지우지 않았을 수 있으니 새로 고쳐 확인하세요.'; G.delAsk = false; render();
  }
}
function vDash() {
  let h = `<section class="card"><h3>결과 보기</h3>${G.dashErr ? `<div class="banner info">${esc(G.dashErr)}</div>` : ''}${G.archMsg ? `<div class="banner" role="status">${esc(G.archMsg)}</div>` : ''}${G.dash ? '' : '<p>불러오는 중…</p>'}
  <div class="row"><button class="sm gold" data-a="import">지인 기록 넣기</button><button class="sm" data-a="dash">새로 고침</button><button class="sm" data-a="dashjson"${G.dash ? '' : ' disabled'}>전체 기록 내려받기 (JSON)</button><button class="sm" data-a="notescsv"${G.dash ? '' : ' disabled'}>의견만 내려받기 (CSV)</button>${G.site ? '' : `<button class="sm gold" data-a="archive"${G.dash && G.db ? '' : ' disabled'}>전체 기록 저장</button>`}</div>
  <p class="mini">저장소에 연결되지 않은 지인은 첫 화면의 "기록 보내기 코드"를 메신저로 보내 줍니다. 그 코드를 "지인 기록 넣기"에 붙여 넣으면 여기에 함께 모입니다. 자동 기록은 테스터가 방을 끝낼 때마다, 쓰러질 때, 처음으로 나갈 때, 판을 끝낼 때 자동으로 들어옵니다. "전체 기록 저장"은 지금 시점의 모든 테스터 기록을 소유자만 읽는 보관 공간에 날짜별로 남깁니다.</p></section>`;
  const D = G.dash; if (!D) return h;
  const TR = testerRows(G.dashRaw || []); const delOn = !!(G.site && G.owner && G.adminPass); /* 지우기는 사이트의 관리자 암호가 있을 때만 */
  h += `<section class="card"><h4>테스터별 진행</h4><div class="tbl"><table class="st2"><caption class="sr">테스터별 진행</caption><thead><tr>${delOn ? '<th scope="col">지울 기록 고르기</th>' : ''}<th scope="col">테스터</th><th scope="col">시작한 판</th><th scope="col">끝낸 판</th><th scope="col">고정 상황</th><th scope="col">마지막 질문</th><th scope="col">마지막 기록</th></tr></thead><tbody>${TR.map(t => `<tr>${delOn ? `<td><input type="checkbox" data-a="deltick" data-k="${esc(t.uid)}" aria-label="${esc(t.who)} 기록 지우기에 포함"${(G.delSel || []).includes(t.uid) ? ' checked' : ''}></td>` : ''}<td>${esc(t.who)}</td><td>${t.started}</td><td>${t.done}</td><td>${t.scen}/3</td><td>${t.final ? '✓' : '—'}</td><td>${t.last ? esc(new Date(t.last).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : '—'}</td></tr>`).join('') || '<tr><td colspan="7">아직 없음</td></tr>'}</tbody></table></div>${delOn ? vDelBox(TR) : ''}</section>`;
  h += vNotes();
  const bn = CLASS_KEYS();
  h += `<section class="card"><h4>테스터 ${D.testerN}명</h4><p class="mini">질문 5 자발적 시험: 막히지 않았는데 아이템을 장착해 본 테스터 ${D.freeTry}명 (${D.testerN ? Math.round(D.freeTry / D.testerN * 100) : 0}%), 그중 "재미있어 보여서" 교체 ${D.freeCurious}회. 목표: 50% 이상, "재미있어 보여서" 1회 이상.</p>
  <p class="mini">질문 8 방식 차이: 많이 달랐다 ${D.finals.very} · 조금 ${D.finals.some} · 거의 같았다 ${D.finals.same}. 목표: 5명 중 4명 이상.</p><p class="mini">다시 하고 싶음 평균 ${D.finals.again.length ? r1(D.finals.again.reduce((a, c) => a + c, 0) / D.finals.again.length) : '—'} (1~5). 기록판을 보고 다시 하고 싶어짐: ${Object.entries(D.finals.board).map(([k, v]) => (SV.board[k] || k) + ' ' + v).join(', ') || '—'}. 바라는 것: ${Object.entries(D.finals.want).sort((a, c) => c[1] - a[1]).map(([k, v]) => (SV.want[k] || k) + ' ' + v).join(', ') || '—'}.</p></section>`;
  h += `<section class="card"><h4>빌드별 요약</h4><div class="tbl"><table class="st2"><caption class="sr">빌드별 요약</caption><thead><tr><th scope="col">항목</th>${bn.map(k => `<th scope="col">${esc(BUILDS[k].n)}</th>`).join('')}</tr></thead><tbody>`;
  const row = (lab, f) => `<tr><td>${lab}</td>${bn.map(k => `<td>${f(D.byB[k])}</td>`).join('')}</tr>`;
  h += row('판 수', B => B.runs);
  h += row('1회차 승리/시도', B => B.wins.mother + '/' + B.tries.mother);
  h += row('2회차 승리/시도 (질문 3)', B => B.wins.tree + '/' + B.tries.tree);
  h += row('가장 많이 쓰러진 방 (질문 2)', B => { const t = topShare(B.deathRoom); return t ? esc(floorName(+t.k)) + ' ' + Math.round(t.p * 100) + '%' : '—'; });
  h += row('가장 어렵다고 답한 방', B => { const t = topShare(B.hardRoom); return t ? esc(floorName(+t.k)) : '—'; });
  h += row('강타 예고 때 가장 많이 한 행동 (질문 6)', B => { const t = topShare(B.heavyResp); return t ? esc(ANAME[t.k] || t.k) + ' ' + Math.round(t.p * 100) + '%' + (t.p > 0.5 ? ' ⚠' : '') : '—'; });
  h += row('치유 예고 때 가장 많이 한 행동', B => { const t = topShare(B.healResp); return t ? esc(ANAME[t.k] || t.k) + ' ' + Math.round(t.p * 100) + '%' : '—'; });
  h += row('그냥 맞은 강타 (흘리기 가능했음)', B => B.deliberate);
  h += row('흘린 강타', B => B.dodgedCharged);
  h += row('붕괴 성공 (질문 9)', B => B.breaks);
  h += row('방 5 입장 플라스크 평균', B => B.fl5.length ? r1(B.fl5.reduce((a, c) => a + c, 0) / B.fl5.length) + '/6' : '—');
  h += row('재미 평균 (1~5)', B => B.fun.length ? r1(B.fun.reduce((a, c) => a + c, 0) / B.fun.length) + ' (' + B.fun.length + '명)' : '—');
  h += row('고민이 있었다 (질문 7)', B => B.dilemma.yes + '/' + (B.dilemma.yes + B.dilemma.no));
  const topList = (m, lab) => Object.entries(m).filter(([k]) => k !== 'none').sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, v]) => esc(lab[k] || k) + ' ' + v).join(', ') || '—';
  h += row('스킬을 고른 방식', B => topList(B.skw, SV.skw));
  h += row('막혔을 때 한 일', B => topList(B.stk, SV.stk));
  h += row('헷갈린 규칙', B => topList(B.cf, SV.cf));
  h += row('불편·버그 신고', B => topList(B.is, SV.is));
  h += row('평균 능력치 (힘/민첩/지능)', B => B.statN ? [B.stat.str, B.stat.dex, B.stat.int].map(v => r1(v / B.statN)).join(' / ') : '—');
  h += row('많이 쓴 스킬 조합', B => Object.entries(B.combos).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, v]) => esc(k.split(',').map(id => (allSkillNames()[id] || {}).n || id).join('·')) + ' ' + v).join(' / ') || '—');
  h += row('고른 아이템', B => Object.entries(B.picks).map(([k, v]) => esc(ITEMS[k] ? ITEMS[k].n : '두고 감') + ' ' + v).join(', ') || '—');
  h += row('방 5 선택 아이템', B => Object.entries(B.block).map(([k, v]) => esc(ITEMS[k] ? ITEMS[k].n : k) + ' ' + v).join(', ') || '—');
  h += `</tbody></table></div></section>`;
  h += `<section class="card"><h4>방 5: 고른 아이템별 행동 (질문 4)</h4><div class="tbl"><table class="st2"><caption class="sr">고른 아이템별 행동</caption><thead><tr><th scope="col">빌드</th><th scope="col">아이템</th><th scope="col">많이 쓴 행동 3개</th></tr></thead><tbody>`;
  for (const k of bn) for (const [it, m] of Object.entries(D.byB[k].room5)) { const top = Object.entries(m).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([a, n]) => esc(ANAME[a] || a) + ' ' + n).join(', '); h += `<tr><td>${esc(BUILDS[k].n)}</td><td>${esc(ITEMS[it] ? ITEMS[it].n : it)}</td><td>${top}</td></tr>`; }
  h += `</tbody></table></div></section>`;
  h += `<section class="card"><h4>고정 상황 의사결정 (질문 1)</h4><p class="mini">결정 축: 먼저 공격한 대상, 일부러 맞은 강타 수, 처음 공격을 멈춘 행동. 상황마다 빌드 간 두 축 이상이 다르면 차이로 봅니다. 아이템 교체 축은 방 기록에서 봅니다.</p><div class="tbl"><table class="st2"><caption class="sr">고정 상황 의사결정</caption><thead><tr><th scope="col">상황</th><th scope="col">축</th>${bn.map(k => `<th scope="col">${esc(BUILDS[k].n)}</th>`).join('')}<th scope="col">다른 축</th></tr></thead><tbody>`;
  let pass = 0;
  for (const sc of SCEN) {
    const S = D.scen[sc.id] || {};
    const f = bn.map(k => S[k] ? modeOf(S[k].first) : '—'); const dl = bn.map(k => S[k] ? (S[k].delib / S[k].n > 0.5 ? '있음' : '없음') : '—'); const sp = bn.map(k => S[k] ? modeOf(S[k].stop) : '—');
    const diff = [f, dl, sp].filter(a => a.every(x => x !== '—') && new Set(a).size > 1).length;
    if (diff >= 2) pass++;
    h += `<tr><td rowspan="3">${sc.id} ${esc(sc.n)}</td><td>먼저 공격</td>${f.map(x => `<td>${esc(ROLES[x] ? ROLES[x].n : x === 'boss' ? '보스' : x)}</td>`).join('')}<td rowspan="3">${diff}</td></tr><tr><td>일부러 맞음</td>${dl.map(x => `<td>${x}</td>`).join('')}</tr><tr><td>처음 멈춤</td>${sp.map(x => `<td>${esc(ANAME[x] || x)}</td>`).join('')}</tr>`;
  }
  h += `</tbody></table></div><p><b>두 축 이상 다른 상황: ${pass}/5</b> (목표 3 이상)</p></section>`;
  return h;
}

/* ---------- 전체 렌더 ---------- */
const CLS_COLOR = { monk: '#8a5a2b', warden: '#4a6f94', berserker: '#b3402a', hunter: '#3f7d3a', arcanist: '#3f5fb3', templar: '#a0692a', assassin: '#4f7a2a', warlock: '#6b3a8a', priest: '#c49a1f', scar: '#8e2f5f' };
