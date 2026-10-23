'use strict';
/* ---------- 결과 보기 (소유자) ---------- */
async function readTester(id) {
  const C = colOf(G.adminSeason), BD = RSEASON.key[G.adminSeason || RSEASON.cur].board; // M8: 관리자만 옛 시즌(0.7.0)을 고를 수 있다
  const [rs, ss, fs, ms, bs] = await Promise.all([G.db.collection('playtest/' + id + '/' + C.runs).get(), G.db.collection('playtest/' + id + '/' + C.scen).get(), G.db.doc('playtest/' + id + '/' + C.survey + '/final').get(), G.db.doc('playtest/' + id).get(), G.db.doc(BD + '/' + id).get().catch(() => ({ exists: false }))]);
  const runs = [];
  for (const d of rs.docs) {
    const r = Object.assign({}, d.data());
    if (!r.acts && r.chunks) {
      const cs = await G.db.collection('playtest/' + id + '/' + C.runs + '/' + d.id + '/acts').get();
      r.acts = cs.docs.map(x => x.data()).sort((x, y) => x.i - y.i).reduce((acc, x) => acc.concat(x.a || []), []);
    }
    runs.push(r);
  }
  const meta = ms.exists ? ms.data() || {} : {};
  return { uid: id, name: meta.name || (bs.exists ? (bs.data() || {}).name : '') || '', login: meta.login || '', runs, scen: ss.docs.map(x => x.data()), final: fs.exists ? fs.data() : null };
}
/* 결과 보기의 테스터 이름: 로그인한 사람은 닉네임과 로그인 방식, 아니면 기록판 이름에 (익명), 둘 다 없으면 순번 */
function testerLabel(T, i) { const name = T.name || '이름 미등록'; const login = T.login ? (PROVIDER_N[T.login] || T.login) : '손님'; return name + ' · ' + login + ' · ID ' + (T.uid || '').slice(0, 8); }
async function loadDash() {
  G.rfOpen = null; G.raPage = 0; G.dash = null; G.dashErr = ''; G.dashReq = 1; if (!PAGES.includes(G.scr)) G.back = G.scr; G.scr = 'admin'; render();
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
      if (r.grave && r.grave.sv && (r.grave.sv.fun || r.grave.sv.cause)) out.push(Object.assign({}, ctx, { type: 'survey', where: '쓰러진 직후', label: '재미 ' + (r.grave.sv.fun || '-'), text: r.grave.sv.cause ? '사인: ' + (SV_CAUSE[r.grave.sv.cause] || r.grave.sv.cause) : '' })); // M8 쓰러진 직후 2문항
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
function csvCell(s) { s = String(s == null ? '' : s); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
/* 파일 내려받기: 아티팩트 화면이면 그 기능으로, 일반 웹사이트(지인 주소)면 브라우저 내려받기로 */
async function saveFile(name, data) {
  if (G.downloads) { try { await G.downloads.save({ filename: name, data }); toast('내려받았습니다'); return true; } catch (e) { toast('내려받기를 취소했습니다'); return false; } }
  try {
    const type = /\.csv$/.test(name) ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('내려받았습니다');
  } catch (e) { toast('이 브라우저에서는 내려받기를 할 수 없습니다'); return false; }
}
function dashJson() { return JSON.stringify({ v: VERSION, exportedAt: Date.now(), testers: (G.dashRaw || []).map((T, i) => Object.assign({ label: testerLabel(T, i) }, T)) }, null, 1); }
function notesCsv() {
  const rows = [['테스터', '빌드', '회차', '위치', '내용', '메모', '시각']];
  for (const n of collectNotes(G.dashRaw || [])) rows.push([n.who, n.build ? BUILDS[n.build].n : '', n.run, n.where, n.label, n.text, n.at ? new Date(n.at).toLocaleString('ko-KR') : '']);
  return adminCsv(rows);
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
const ANAME = { basic: '기본 공격', heavy: '강공격', guard: '방어', dodge: '흘리기', eact: '적 행동', cons: '소모품 사용', flaskL: '생명력 플라스크', flaskM: '마나 플라스크', flee: '도망', viper: '독사의 일격', cloud: '독구름', scarcut: '상흔 베기', release: '상흔 방출', flame: '신성한 불꽃', purge: '정화의 빛', reverse: '역전' };
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
  if (!sel.length || !G.sb || !G.owner || (!G.superAdmin && !G.adminPass)) return;
  G.delMsg = '백업을 받고 지우는 중…'; render();
  try {
    await saveFile('nrk-' + VERSION + '-지우기전-백업-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ v: VERSION, exportedAt: Date.now(), testers: raw.map(T => Object.assign({ label: testerLabel(T, 0) }, T)) }, null, 1));
    const paths = []; sel.forEach(u => { paths.push('playtest/' + u, 'board/' + u, BOARD + '/' + u); });
    const { data, error } = await G.sb.rpc('admin_delete', { pass: G.adminPass || '', paths });
    if (error) throw Object.assign(new Error(error.message), { code: error.code || '' });
    G.delMsg = raw.length + '명의 기록을 지웠습니다(문서 ' + (data == null ? '?' : data) + '개). 백업 파일은 내려받은 폴더에 있습니다.'; G.delSel = []; G.delAsk = false; G.dash = null; G.dashReq = 0; render();
  } catch (e) {
    const missing = e && (e.code === 'PGRST202' || /admin_delete|Could not find/i.test(e.message || ''));
    G.delMsg = missing ? '저장소에 지우기 함수가 아직 없습니다. docs/검증/관리자-지우기.sql을 Supabase의 SQL Editor에서 한 번 실행한 뒤 다시 눌러 주세요. 아무것도 지우지 않았습니다.' : '지우지 못했습니다(' + ((e && (e.code || e.message)) || '오류') + '). 아무것도 지우지 않았을 수 있으니 새로 고쳐 확인하세요.'; G.delAsk = false; render();
  }
}
/* 관리자: 최신 판 검색과 필요한 기록만 펼쳐 보기 */
function dashRunResult(r) { return r.result || (r.status === 'done' ? 'done' : 'progress'); }
function dashRunTime(r) { return r.updatedAt || r.endedAt || r.startedAt || 0; }
const DASH_RESULTS = { progress: '진행 중', win: '돌파', lose: '쓰러짐', abandon: '포기', flee: '도망', done: '완료' };
function dashRunRows() {
  const f = G.rf || {}, q = (f.q || '').trim().toLocaleLowerCase();
  const from = f.from ? new Date(f.from + 'T00:00:00').getTime() : 0;
  const until = f.to ? new Date(f.to + 'T00:00:00').getTime() + 86400000 : Infinity;
  return (G.dashRaw || []).flatMap((T, ti) => (T.runs || []).filter(Boolean).map((r, ri) => ({ r, who: testerLabel(T, ti), uid: T.uid, key: ti + ':' + ri })))
    .filter(x => (!f.uid || x.uid === f.uid) && (!q || [x.who, x.uid, x.r.cname, x.r.id].join(' ').toLocaleLowerCase().includes(q)) && (!f.b || f.b === 'all' || x.r.build === f.b) && (!f.result || f.result === 'all' || dashRunResult(x.r) === f.result) && dashRunTime(x.r) >= from && dashRunTime(x.r) < until)
    .sort((a, b) => dashRunTime(b.r) - dashRunTime(a.r));
}
function dashActionName(id, r) {
  if(id==='flaskS')return '스태미나 플라스크';
  if(id==='flaskM' && r && BUILDS[r.build] && BUILDS[r.build].v2)return '정화 플라스크';
  const saved=r && (r.treeNodes || []).find(n=>n.id===id);
  return (saved && saved.n) || (SK2[id] && SK2[id].n) || ANAME[id] || (allSkillNames()[id] || {}).n || id;
}

function dashCombatStats(r) {
  const rooms = (r.rooms || []).filter(x => x.res), recorded = rooms.filter(x => x.damageStats), acts = r.acts || [];
  const complete = rooms.length > 0 && recorded.length === rooms.length && recorded.every(x=>x.damageStats.v === 1);
  const sum = k => recorded.reduce((n,x)=>n+(Number(x.damageStats[k]) || 0),0);
  const hits = acts.filter(x=>x.k==='hit'), dealt = acts.filter(x=>x.k==='dealt');
  const byAction = {};for(const a of acts.filter(x=>x.k==='act')) byAction[a.a || '행동'] = (byAction[a.a || '행동'] || 0) + 1;
  return { dealt: recorded.length ? sum('dealt') : dealt.length ? dealt.reduce((n,a)=>n+(Number(a.d)||0),0) : null,
    taken: complete ? sum('taken') : hits.length ? hits.reduce((n,a)=>n+(Number(a.actual == null ? a.d : a.actual)||0),0) : recorded.length ? sum('taken') : null,
    complete, coverage: recorded.length + '/' + rooms.length, actions: Object.values(byAction).reduce((a,b)=>a+b,0), kills: acts.filter(x=>x.k==='kill').length,
    byAction, truncated: r.actsN > acts.length, rooms };
}
function adminCsv(rows) { return '\ufeff' + rows.map(r=>r.map(v=>csvCell(typeof v === 'string' && /^[\s]*[=+@-]/.test(v) ? "'" + v : v)).join(',')).join('\r\n'); }
function dashRunsCsv() {
  const rows = [['플레이어','캐릭터','직업','결과','레벨','챕터','도달 층','가한 피해','받은 피해','피해 집계 범위','행동 기록 수','처치 기록 수','행동 기록 범위','힘','민첩','지능','체력','의지','마지막 기록','계정 ID','판 ID']];
  for(const x of dashRunRows()) { const r=x.r,c=dashCombatStats(r),st=r.stats || {};rows.push([x.who,r.cname,(BUILDS[r.build]||{}).n || r.build,DASH_RESULTS[dashRunResult(r)] || dashRunResult(r),r.lv,r.ch || 1,r.roomReached,c.dealt,c.taken,c.complete ? '완료된 전투 전체' : '일부 기록 ('+c.coverage+' 전투)',c.actions,c.kills,c.truncated ? '일부 보관 기록' : '보관된 행동 기록',st.str,st.dex,st.int,st.con,st.wil,dashRunTime(r) ? new Date(dashRunTime(r)).toLocaleString('ko-KR') : '',x.uid,r.id]); }
  return adminCsv(rows);
}
function dashSelectedRun() { return dashRunRows().find(x=>x.key===G.rfOpen); }
function dashRoomCsv() {
  const x=dashSelectedRun();if(!x)return adminCsv([['기록 없음']]);
  const rows=[['플레이어','캐릭터','챕터','층','방 종류','결과','가한 피해','받은 피해','집계 상태','전투 시간(초)','종료 생명력(%)','착용 장비']];
  for(const r of x.r.rooms || [])rows.push([x.who,x.r.cname,r.ch,r.room,(ROOM_TYPES[r.type]||{}).n || r.type,DASH_RESULTS[r.res] || r.res,r.damageStats ? r1(r.damageStats.dealt) : null,r.damageStats ? r1(r.damageStats.taken) : null,r.damageStats ? r.damageStats.v===1 ? '전체' : '일부' : '미기록',r.t,r.hpOut==null ? null : Math.round(r.hpOut*100),(r.gearDetails || []).map(e=>(e.name || (ITEMS[e.tpl]||{}).n || e.tpl)+' / '+(e.base || '')).join(' · ')]);
  return adminCsv(rows);
}

function dashItemCard(e) {
  const known = !!e.base, name = e.name || (ITEMS[e.tpl] || {}).n || e.tpl || '장비';
  return '<article class="note"><b>' + esc((EQ_SLOT_N[e.sl] || '') + ' · ' + name) + '</b><p class="mini">' + esc((GRADE[e.g] || {}).n || e.g || '') + (e.ch ? ' · ' + e.ch + '챕터 장비' : '') + (e.b != null ? ' · 기본 수치 보너스 ' + esc(e.b) + '%' : '') + '</p><p>' + esc(e.base || '실제 수치 미기록') + '</p><p>' + esc(e.effect || (known ? '추가 효과 없음' : '당시 효과 미기록')) + '</p>' + (e.cost ? '<p>대가: ' + esc(e.cost) + '</p>' : '') + '</article>';
}
function dashHistory(title, rows) { return '<details class="admin-fold"><summary>' + esc(title) + ' (' + rows.length + '건)</summary>' + (rows.length ? '<ol>' + rows.map(x => '<li>' + x + '</li>').join('') + '</ol>' : '<p class="mini">저장된 기록이 없습니다.</p>') + '</details>'; }
function dashWhere(x) { return esc((x.ch ? x.ch + '챕터 · ' : '챕터 미기록 · ') + (x.room || x.r || '—') + '층' + (x.lv ? ' · Lv' + x.lv : '') + (x.t ? ' · ' + new Date(x.t).toLocaleString('ko-KR') : '')); }
function vAdminGear(r) {
  const eq=r.eqDetails || (r.eq7 || []).map((v,i)=>v ? {sl:EQ_SLOTS[i],tpl:v.split(':')[0],g:v.split(':')[1]} : null).filter(Boolean);
  let h='<h4>장비 세부 내용</h4><p class="mini">마지막 저장 시점의 실제 수치·등급·보너스·효과·대가입니다. 미기록 수치는 추정하지 않습니다.</p><div class="admin-items">'+(eq.length ? eq.map(dashItemCard).join('') : '<p>장비 기록 없음</p>')+'</div>';
  h += '<details class="admin-fold"><summary>보유 장비 전체 ('+(r.inv || []).length+'개)</summary><div class="admin-items">'+(r.inv || []).map(dashItemCard).join('')+'</div></details>';
  h += dashHistory('장비 교체 순서',(r.swaps || []).map(x=>dashWhere(x)+' · '+(x.on ? '장착' : '해제')+(x.detail ? dashItemCard(x.detail) : '<p>'+esc((ITEMS[x.item]||{}).n || x.item)+' · 실제 수치 미기록</p>')));
  h += dashHistory('소모품 사용',(r.consLog || []).map(x=>dashWhere(x)+' · '+esc(x.name || (CONS[x.id]||{}).n || x.id)+' · '+(x.fight ? '전투 중' : '전투 밖')));
  return h;
}
function vAdminBuild(r) {
  const SN={str:'힘',dex:'민첩',int:'지능',con:'체력',wil:'의지'}, stats=r.stats || {},max=Math.max(1,...Object.values(stats));
  let h='<h4>스탯 배분</h4><p class="mini">직접 배분한 포인트입니다. 장비·일시 효과는 제외합니다.</p><div class="admin-stat-bars">';
  h += r.stats ? Object.entries(SN).map(([k,n])=>'<div><span>'+n+'</span><meter aria-label="'+n+' 배분" min="0" max="'+max+'" value="'+(stats[k]||0)+'">'+(stats[k]||0)+'</meter><b>'+(stats[k]||0)+'점</b></div>').join('') : '<p>스탯 미기록</p>';h+='</div>';
  h += dashHistory('스탯 배분 순서',(r.statLog || []).map(x=>dashWhere(x)+' · '+esc(Object.entries(x.add || {}).filter(([,v])=>v).map(([k,v])=>(SN[k]||k)+' +'+v).join(', '))));
  const nodes=r.treeNodes || (SKILLS2[r.build] || []).map(x=>({...x,head:skHead(x),body:skBody(x)})),learned=r.tree ? r.tree.open || [] : [],equipped=r.skills || [],logs=r.treeLog || [];
  h += '<h4>스킬 트리</h4><p class="mini">'+(r.tree ? '● 배움 · ✓ 장착 · ○ 미취득 · 남은 포인트 '+(r.tree.pts || 0) : '과거 기록: 취득한 칸은 미기록입니다. ✓ 장착한 스킬만 확인됩니다.')+(r.treeNodes ? ' · 저장 당시 설명' : ' · 설명은 현재 규칙 기준')+'</p>';
  const branches=[...new Set(nodes.filter(n=>!n.start).map(n=>n.b))];
  h += '<div class="admin-tree-grid">'+branches.map(br=>{
    const ns=nodes.filter(n=>n.b===br&&!n.start), rows=[...new Set(ns.map(n=>n.row))].sort((a,b)=>a-b);
    return '<details class="admin-branch" open><summary>'+esc(br)+' <span class="mini">'+(r.tree ? '배움 '+ns.filter(n=>learned.includes(n.id)).length+'칸' : '취득 미기록')+'</span></summary><div class="admin-tree-rows">'+rows.map((row,i)=>(i ? '<div class="admin-tree-arrow" aria-hidden="true">↓</div>' : '')+'<div class="admin-tree-row">'+ns.filter(n=>n.row===row).map(n=>{
      const on=learned.includes(n.id),eq=equipped.includes(n.id),step=logs.findIndex(x=>x.id===n.id&&!x.refund);
      return '<details class="admin-node'+(eq ? ' equipped' : on ? ' learned' : '')+'"><summary>'+(eq ? '✓ ' : on ? '● ' : r.tree ? '○ ' : '? ')+esc(n.n)+'</summary><p class="mini">'+esc(n.tier || '')+(step>=0 ? ' · 취득 기록 '+(step+1)+'번째' : '')+'</p><p>'+esc(n.head || '')+'</p><p>'+esc(n.body || '')+'</p></details>';
    }).join('')+'</div>').join('')+'</div></details>';
  }).join('')+'</div>';
  const names=allSkillNames(),nm=id=>(nodes.find(n=>n.id===id)||names[id]||{}).n || id;
  h += dashHistory('트리 취득·환불 순서',logs.map(x=>dashWhere(x)+' · '+esc(x.reset!=null ? '전체 초기화 ('+x.reset+'칸)' : (x.refund ? '환불: ' : '취득: ')+nm(x.id))));
  h += dashHistory('장착 스킬 변경',(r.skillLog || []).map(x=>dashWhere(x)+' · '+esc((x.to || []).map(nm).join(' · ') || '모두 해제')));
  return h;
}
function adminNum(v) { return v == null ? '미기록' : r1(v).toLocaleString('ko-KR'); }
function dashResource(label, value, max, ratio) {
  const known=Number.isFinite(value), pct=Number.isFinite(max) && max>0 && known ? Math.max(0,Math.min(100,value/max*100)) : Number.isFinite(ratio) ? Math.max(0,Math.min(100,ratio*100)) : null;
  const text=known ? adminNum(value)+(Number.isFinite(max) ? ' / '+adminNum(max) : ' (최대값 미기록)') : pct!=null ? Math.round(pct)+'% (수치 미기록)' : '미기록';
  return '<div class="admin-resource"><span>'+label+'</span><b>'+esc(text)+'</b>'+(pct!=null ? '<meter aria-label="'+label+' 남은 비율" min="0" max="100" value="'+pct+'">'+Math.round(pct)+'%</meter>' : '')+'</div>';
}
function vAdminResources(r) {
  const state=r.playerState, last=(r.acts || []).filter(a=>a.k==='act'&&(a.hp!=null || a.st!=null)).slice(-1)[0];
  return '<h4>HP·스태미나 상태</h4><p class="mini">'+(state ? '마지막 저장 시점의 상태입니다.' : last ? '과거 기록: 마지막으로 보관된 행동 시점입니다. 현재 상태와 다를 수 있습니다.' : '상태 기록이 없습니다.')+'</p><div class="admin-resources">'+dashResource('HP',state ? state.hp : last && last.hpNow,state ? state.hpMax : last && last.hpMax,last && last.hp)+dashResource('스태미나',state ? state.st : last && last.st,state ? state.stMax : last && last.stMax)+'</div>';
}
function dashActionCsv() {
  const x=dashSelectedRun(), rows=[['순서','챕터','층','전투 시간(초)','행동','HP','최대 HP','HP 비율(%)','스태미나','최대 스태미나']];
  if(x)(x.r.acts || []).forEach((a,i)=>{if(a.k==='act')rows.push([i+1,a.ch,a.r,a.t,dashActionName(a.a,x.r),a.hpNow,a.hpMax,a.hpMax>0 && a.hpNow!=null ? r1(a.hpNow/a.hpMax*100) : a.hp==null ? null : Math.round(a.hp*100),a.st,a.stMax]);});
  return adminCsv(rows);
}

function vAdminCombat(r) {
  const c=dashCombatStats(r), skills=allSkillNames();
  let h=vAdminResources(r)+'<h4>전투 통계</h4><div class="admin-metrics">'+[['가한 피해',c.dealt],['받은 피해',c.taken],['행동 기록',c.actions],['처치 기록',c.kills]].map(([n,v])=>'<div><span>'+n+'</span><strong>'+adminNum(v)+'</strong></div>').join('')+'</div><p class="mini">'+(c.complete ? '피해는 완료된 전투 전체의 실제 생명력 감소량입니다. 초과 피해·보호막 흡수·스킬 생명력 비용은 제외합니다.' : '과거 기록은 가한 피해가 없거나 일부만 남아 있습니다. 받은 피해는 보관된 피격 기록 합계이며 초과 피해가 포함될 수 있습니다. 0은 미기록을 뜻하지 않습니다.')+(c.truncated ? ' 행동·처치 수는 일부 보관 기록입니다.' : ' 진행 중인 전투는 종료 후 반영됩니다.')+'</p>';
  h += '<h4>자주 한 행동</h4><div class="admin-action-bars">'+Object.entries(c.byAction).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,n])=>'<div><span>'+esc(dashActionName(k,r))+'</span><meter aria-label="'+esc(ANAME[k] || (skills[k]||{}).n || k)+' 사용 횟수" min="0" max="'+Math.max(1,c.actions)+'" value="'+n+'">'+n+'</meter><b>'+n+'회</b></div>').join('')+'</div>';
  h += '<h4>방별 전투 통계</h4><div class="tbl"><table class="st2"><caption class="sr">방별 전투 피해</caption><thead><tr><th>챕터·층</th><th>결과</th><th>가한 피해</th><th>받은 피해</th><th>전투 시간</th><th>장비</th></tr></thead><tbody>';
  h += c.rooms.map(x=>'<tr><td>'+esc((x.ch ? x.ch+'챕터 · ' : '')+x.room+'층')+'</td><td>'+esc(DASH_RESULTS[x.res] || x.res)+'</td><td>'+adminNum(x.damageStats ? x.damageStats.dealt : null)+'</td><td>'+adminNum(x.damageStats ? x.damageStats.taken : null)+'</td><td>'+esc(x.t==null ? '—' : x.t+'초')+'</td><td><details><summary>장비 보기</summary><div class="admin-items">'+(x.gearDetails ? x.gearDetails.map(dashItemCard).join('') : '<p>'+esc((x.gear||[]).filter(Boolean).map(v=>(ITEMS[v.split(':')[0]]||{}).n || v).join(', ') || '미기록')+'</p>')+'</div></details></td></tr>').join('') || '<tr><td colspan="6">완료된 전투 기록이 없습니다.</td></tr>';
  return h+'</tbody></table></div>';
}

function canDeleteRun() { return !!(G.site && G.sb && G.owner && (G.superAdmin || G.adminPass)); }
function vRunDelete(x) {
  if(!canDeleteRun() || !x.uid || !x.r.id)return '';
  const target=G.runDelTarget, asking=target && target.uid===x.uid && target.id===x.r.id;
  return '<div class="admin-fold"><button class="sm" data-a="rundelask"'+(G.runDelBusy ? ' disabled' : '')+'>이 판의 기록만 삭제</button>'+(G.runDelMsg ? '<p role="status">'+esc(G.runDelMsg)+'</p>' : '')+(asking ? '<div role="alertdialog" aria-labelledby="rundel-title"><h4 id="rundel-title">이 플레이 기록을 삭제할까요?</h4><p>'+esc(x.who)+' · '+esc(x.r.cname || '이름 없는 캐릭터')+' · 판 ID '+esc(x.r.id)+'</p><p>이 판과 그 행동 기록만 삭제합니다. 백업 여부를 선택할 수 있습니다. 다른 판·계정·랭킹·캐릭터 세이브는 유지됩니다. 진행 중인 판은 플레이어가 이어하면 기록이 다시 올라올 수 있습니다.</p><label><input id="rundelbackup" type="checkbox" checked> 삭제 전 백업 받기</label><p class="mini">백업을 해제하면 복구할 파일 없이 삭제합니다.</p><label for="rundelword">삭제하려면 “지우기”를 입력하세요</label><input id="rundelword" autocomplete="off"'+(G.runDelBusy ? ' disabled' : '')+'><div class="row"><button class="sm" data-a="rundelgo"'+(G.runDelBusy ? ' disabled' : '')+'>이 판 삭제</button><button class="sm" data-a="rundelno"'+(G.runDelBusy ? ' disabled' : '')+'>취소</button></div></div>' : '')+'</div>';
}
function vBatchRunDelete() {
  if(!canDeleteRun())return '';
  const sel=G.runDeleteSel || [], targets=G.runDelTargets || [];
  return '<div class="admin-fold"><button class="sm" data-a="runbatchask"'+(!sel.length || G.runDelBusy ? ' disabled' : '')+'>선택한 '+sel.length+'판 삭제</button>'+(targets.length ? '<div role="alertdialog"><h4>선택한 '+targets.length+'판을 삭제할까요?</h4><ul>'+targets.map(t=>'<li>'+esc(t.name)+' · '+esc(t.id)+'</li>').join('')+'</ul><p>선택한 판과 행동 기록만 삭제합니다. 진행 중인 판은 플레이를 이어하면 다시 올라올 수 있습니다.</p><label><input id="rundelbackup" type="checkbox" checked> 삭제 전 백업 받기</label><p class="mini">백업을 해제하면 복구할 파일 없이 삭제합니다.</p><label for="rundelword">“지우기”를 입력하세요</label><input id="rundelword" autocomplete="off"><div class="row"><button class="sm" data-a="rundelgo"'+(G.runDelBusy ? ' disabled' : '')+'>선택한 판 삭제</button><button class="sm" data-a="rundelno"'+(G.runDelBusy ? ' disabled' : '')+'>취소</button></div></div>' : '')+'</div>';
}
async function deleteOneRun(word, backup=true) {
  if(G.runDelBusy || !canDeleteRun())return;
  if(word!=='지우기'){G.runDelMsg='“지우기”를 정확히 입력하세요. 삭제하지 않았습니다.';render();return;}
  const targets=G.runDelTargets && G.runDelTargets.length ? G.runDelTargets.slice() : G.runDelTarget ? [G.runDelTarget] : [];
  if(!targets.length)return;
  const valid=targets.every(t=>/^[a-zA-Z0-9_-]+$/.test(t.uid)&&/^[a-zA-Z0-9_-]+$/.test(t.id)&&(G.dashRaw || []).some(T=>T.uid===t.uid&&(T.runs || []).some(r=>r.id===t.id)));
  if(!valid){G.runDelMsg='삭제할 기록을 다시 선택하세요.';render();return;}
  const raw=(G.dashRaw || []).filter(T=>targets.some(t=>t.uid===T.uid)).map(T=>Object.assign({},T,{runs:(T.runs || []).filter(r=>targets.some(t=>t.uid===T.uid&&t.id===r.id)),scen:[],final:null}));
  G.runDelBusy=true;G.runDelMsg=backup ? '백업을 받는 중…' : '선택한 기록을 삭제하는 중…';render();
  try {
    if(backup){const backed=await saveFile('nrk-플레이기록-삭제전-'+Date.now()+'.json',JSON.stringify({v:VERSION,exportedAt:Date.now(),testers:raw},null,2));if(!backed){G.runDelMsg='백업을 받지 못해 삭제를 중단했습니다.';return;}}
    if(!canDeleteRun()){G.runDelMsg='관리자 권한을 다시 확인하세요. 삭제하지 않았습니다.';return;}
    const paths=[...new Set(targets.map(t=>'playtest/'+t.uid+'/'+colOf(G.adminSeason).runs+'/'+t.id))];
    const {data,error}=await G.sb.rpc('admin_delete',{pass:G.adminPass || '',paths});if(error)throw error;
    if(!data){G.runDelMsg='저장소에 해당 기록이 없습니다. 새로 고침해 확인하세요.';return;}
    for(const T of G.dashRaw || [])T.runs=(T.runs || []).filter(r=>!targets.some(t=>t.uid===T.uid&&t.id===r.id));
    G.dash=aggregate(G.dashRaw);G.rfOpen=null;G.runDelTarget=null;G.runDelTargets=null;G.runDeleteSel=[];
    G.runDelMsg=targets.length+'판의 기록을 삭제했습니다.'+(backup ? ' 백업 파일을 다운로드 폴더에서 확인하세요.' : ' 백업 없이 삭제했습니다.');toast(G.runDelMsg);
  }catch(e){G.runDelMsg='삭제하지 못했습니다. '+(e.code==='PGRST202' ? '저장소의 관리자 삭제 함수 설정을 확인하세요.' : '새로 고침 후 다시 확인하세요.');}
  finally{G.runDelBusy=false;render();}
}

function vRunDetail(x) {
  const r = x.r, acts = r.acts || [], page = Math.max(0, Math.min(G.raPage || 0, Math.ceil(acts.length / 100) - 1));
  const names = { act: '행동', hit: '피격', break: '붕괴', kill: '처치', dead: '사망', heal: '회복', dodge: '흘리기', dealt: '가한 피해', eact: '적 행동', cons: '소모품' };
  const skills = allSkillNames();
  let h = '<section class="card admin-detail" id="admin-run-detail"><h4>' + esc(r.cname || '이름 없는 캐릭터') + ' 상세 기록</h4><p>' + esc(x.who) + '</p><p class="mini">판 ID: ' + esc(r.id || '없음') + ' · 행동 기록 ' + acts.length + '건</p><button class="sm" data-a="runclose">상세 닫기</button>';
  h += vRunDelete(x);
  const tab=G.rdTab || 'summary';
  h += '<div class="admin-tabs" role="group" aria-label="개인 상세 보기">'+[['summary','요약'],['gear','장비·아이템'],['growth','스탯·스킬 트리'],['battle','행동 기록']].map(([k,n])=>'<button class="chip'+(tab===k ? ' on' : '')+'" data-a="runtab" data-k="'+k+'" aria-pressed="'+(tab===k)+'">'+n+'</button>').join('')+'</div><div class="row"><button class="sm" data-a="runroomcsv">이 판의 방별 통계 CSV</button></div>';
  if(tab==='summary') return h+vAdminCombat(r)+'</section>';
  if(tab==='gear') return h+vAdminGear(r)+'</section>';
  if(tab==='growth') return h+vAdminBuild(r)+'</section>';

  h += '<h4>전투 행동 흐름</h4><p class="mini">HP·스태미나는 행동을 기록한 시점의 상태입니다. 과거 기록에 최대값이 없으면 비율 또는 남은 값만 표시합니다. 행동 기록은 전투가 끝난 뒤 저장됩니다.</p>';
  h += '<button class="sm" data-a="runactioncsv">행동별 HP·스태미나 CSV</button>';
  if (r.actsN > acts.length) h += '<p class="mini">전체 ' + r.actsN + '건 중 보관된 ' + acts.length + '건을 표시합니다.</p>';
  if (!acts.length) h += '<p class="mini">저장된 행동 기록이 없습니다.</p>';
  else {
    h += '<div class="tbl"><table class="st2"><caption class="sr">행동 흐름</caption><thead><tr><th>순서</th><th>층</th><th>전투 시간</th><th>종류</th><th>HP</th><th>스태미나</th><th>내용</th></tr></thead><tbody>';
    h += acts.slice(page * 100, (page + 1) * 100).map((a, i) => {
      const text = [typeof a.a === 'string' ? (dashActionName(a.a,r)) : '', a.id && a.k === 'cons' ? ((CONS[a.id] || {}).n || a.id) : '', a.tg ? '대상: ' + ((ROLES[a.tg] || {}).n || a.tg) : '', a.role ? '적: ' + ((ROLES[a.role] || {}).n || a.role) : '', a.i ? '적 행동: ' + a.i : '', a.st != null ? '스태미나 ' + a.st : '', a.heavyIn ? '강타 예고 중' : '', a.healIn ? '치유 예고 중' : '', a.d != null ? (a.k==='dealt' ? '가한 피해 ' : a.k==='hit' ? '받은 피해 ' : '피해 ') + a.d : '', a.hp != null ? '생명력 ' + Math.round(a.hp * 100) + '%' : '', a.mp != null ? '마나 ' + Math.round(a.mp * 100) + '%' : '', a.charged ? '강타' : '', a.parried ? '흘리기 성공' : '', a.guard ? '방어 중' : ''].filter(Boolean).join(' · ');
      return '<tr><td>' + (page * 100 + i + 1) + '</td><td>' + esc((a.ch ? a.ch + '챕터 · ' : '') + (a.r == null ? '—' : floorName(a.r))) + '</td><td>' + esc(a.t == null ? '—' : a.t + '초') + '</td><td>' + esc(names[a.k] || a.k || '기록') + '</td><td>' + dashResource('HP',a.hpNow,a.hpMax,a.hp) + '</td><td>' + dashResource('스태미나',a.st,a.stMax) + '</td><td>' + esc(text || '원본 기록에서 확인') + '</td></tr>';
    }).join('') + '</tbody></table></div><div class="row"><button class="sm" data-a="runactpage" data-v="' + (page - 1) + '"' + (page ? '' : ' disabled') + '>이전 행동</button><span>' + (page + 1) + '/' + Math.ceil(acts.length / 100) + '</span><button class="sm" data-a="runactpage" data-v="' + (page + 1) + '"' + ((page + 1) * 100 < acts.length ? '' : ' disabled') + '>다음 행동</button></div>';
  }
  return h + '<details><summary>이 판의 원본 기록 보기</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:400px;overflow:auto">' + esc(JSON.stringify(r, null, 2)) + '</pre></details></section>';
}
function vAdminOverview(rows) {
  const by = {};for(const x of rows){const k=x.r.build || 'unknown',c=dashCombatStats(x.r),o=by[k] || (by[k]={runs:0,measured:0,dealt:0,taken:0,received:0});o.runs++;if(c.dealt!=null){o.measured++;o.dealt+=c.dealt;}if(c.taken!=null){o.received++;o.taken+=c.taken;}}
  return '<details class="admin-fold" open><summary>검색 결과 전투 통계 · '+rows.length+'판</summary><p class="mini">집계 가능한 기록만 합산합니다. 미기록은 평균에서 제외합니다. 일부 기록은 해당 기록 범위의 값입니다.</p><div class="tbl"><table class="st2"><caption class="sr">직업별 전투 통계</caption><thead><tr><th>직업</th><th>판 수</th><th>가한 피해 합계</th><th>판당 평균</th><th>받은 피해 합계</th><th>판당 평균</th><th>집계 가능한 판 (가함/받음)</th></tr></thead><tbody>'+Object.entries(by).map(([k,o])=>'<tr><td>'+esc((BUILDS[k]||{}).n || k)+'</td><td>'+o.runs+'</td><td>'+adminNum(o.measured ? o.dealt : null)+'</td><td>'+adminNum(o.measured ? o.dealt/o.measured : null)+'</td><td>'+adminNum(o.received ? o.taken : null)+'</td><td>'+adminNum(o.received ? o.taken/o.received : null)+'</td><td>'+o.measured+'/'+o.received+'</td></tr>').join('')+'</tbody></table></div></details>';
}

function vRunLogs() {
  const f = G.rf || {}, rows = dashRunRows(), pages = Math.max(1, Math.ceil(rows.length / 25));
  const page = Math.max(0, Math.min(G.rfPage || 0, pages - 1));
  let h = '<section class="card">'+(G.runDelMsg ? '<p class="banner" role="status">'+esc(G.runDelMsg)+'</p>' : '')+'<h4>플레이 로그 찾기</h4><p class="mini">마지막 기록이 최신인 순서입니다. 검색 조건을 고른 뒤 적용을 누르세요.</p><div class="admin-filters"><label>플레이어 <select id="runperson"><option value="">전체 플레이어</option>' + (G.dashRaw || []).map((T,i)=>'<option value="' + esc(T.uid) + '"' + (f.uid === T.uid ? ' selected' : '') + '>' + esc(testerLabel(T,i)) + '</option>').join('') + '</select></label><label>이름·ID 검색 <input id="runquery" type="search" value="' + esc(f.q || '') + '" placeholder="플레이어, 캐릭터, 계정·판 ID"></label><label>직업 <select id="runbuild"><option value="all">전체 직업</option>' + CLASS_KEYS().map(k => '<option value="' + k + '"' + (f.b === k ? ' selected' : '') + '>' + esc(BUILDS[k].n) + '</option>').join('') + '</select></label><label>결과 <select id="runresult"><option value="all">전체 결과</option>' + Object.entries(DASH_RESULTS).map(([k, n]) => '<option value="' + k + '"' + (f.result === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label><label>시작일 <input id="runfrom" type="date" value="' + esc(f.from || '') + '"></label><label>종료일 <input id="runto" type="date" value="' + esc(f.to || '') + '"></label></div><div class="row"><button class="sm gold" data-a="runfilter">검색 적용</button><button class="sm" data-a="runreset">초기화</button><button class="sm" data-a="runscsv">검색 결과 CSV 받기</button></div><p role="status">검색 결과 ' + rows.length + '판 · ' + (page + 1) + '/' + pages + '페이지 (25판씩)</p>';
  h += vBatchRunDelete();
  h += vAdminOverview(rows);
  h += '<div class="tbl"><table class="st2"><caption class="sr">검색된 플레이 로그</caption><thead><tr><th>플레이어</th><th>캐릭터·직업</th><th>결과</th><th>도달</th><th>마지막 기록</th><th>상세</th></tr></thead><tbody>';
  h += rows.slice(page * 25, (page + 1) * 25).map(x => { const r = x.r; return '<tr><td>' + (canDeleteRun() ? '<label><input type="checkbox" data-a="rundeltick" data-k="'+esc(JSON.stringify({uid:x.uid,id:r.id}))+'"'+((G.runDeleteSel || []).some(t=>t.uid===x.uid&&t.id===r.id) ? ' checked' : '')+(G.runDelBusy ? ' disabled' : '')+' aria-label="'+esc((r.cname || r.id)+' 삭제 선택')+'"> 선택</label><br>' : '') + esc(x.who) + '</td><td>' + esc(r.cname || '—') + '<br>' + esc((BUILDS[r.build] || {}).n || r.build || '—') + '</td><td>' + esc(DASH_RESULTS[dashRunResult(r)] || dashRunResult(r)) + '</td><td>' + esc(rankProg({ ch: r.ch, clears: r.clears, floor: r.roomReached })) + '</td><td>' + esc(dashRunTime(r) ? new Date(dashRunTime(r)).toLocaleString('ko-KR') : '—') + '</td><td><button class="sm" data-a="runopen" data-k="' + x.key + '" aria-expanded="' + (G.rfOpen === x.key) + '">기록 보기</button></td></tr>'; }).join('') || '<tr><td colspan="6">조건에 맞는 기록이 없습니다.</td></tr>';
  h += '</tbody></table></div><div class="row"><button class="sm" data-a="runpage" data-v="' + (page - 1) + '"' + (page ? '' : ' disabled') + '>이전</button><button class="sm" data-a="runpage" data-v="' + (page + 1) + '"' + (page + 1 < pages ? '' : ' disabled') + '>다음</button></div></section>';
  const opened = rows.find(x => x.key === G.rfOpen); return (opened ? vRunDetail(opened) : '') + h;
}

function vDash() {
  let h = `<section class="card"><h3>결과 보기</h3>${G.dashErr ? `<div class="banner info">${esc(G.dashErr)}</div>` : ''}${G.archMsg ? `<div class="banner" role="status">${esc(G.archMsg)}</div>` : ''}${G.dash ? '' : '<p>불러오는 중…</p>'}
  <div class="row"><button class="sm gold" data-a="import">지인 기록 넣기</button><button class="sm" data-a="dash">새로 고침</button><button class="sm" data-a="dashseason" aria-pressed="${G.adminSeason === '0.7.0' ? 'true' : 'false'}">${esc(G.adminSeason || RSEASON.cur)} 시즌 기록 보는 중 · 시즌 바꾸기</button><button class="sm" data-a="dashjson"${G.dash ? '' : ' disabled'}>전체 기록 내려받기 (JSON)</button><button class="sm" data-a="notescsv"${G.dash ? '' : ' disabled'}>의견만 내려받기 (CSV)</button>${G.site ? '' : `<button class="sm gold" data-a="archive"${G.dash && G.db ? '' : ' disabled'}>전체 기록 저장</button>`}</div>
  <p class="mini">저장소에 연결되지 않은 지인은 첫 화면의 "기록 보내기 코드"를 메신저로 보내 줍니다. 그 코드를 "지인 기록 넣기"에 붙여 넣으면 여기에 함께 모입니다. 자동 기록은 테스터가 방을 끝낼 때마다, 쓰러질 때, 처음으로 나갈 때, 판을 끝낼 때 자동으로 들어옵니다. "전체 기록 저장"은 지금 시점의 모든 테스터 기록을 소유자만 읽는 보관 공간에 날짜별로 남깁니다.</p></section>`;
  const D = G.dash; if (!D) return h;
  h += vRunLogs();
  const TR = testerRows(G.dashRaw || []); const delOn = !!(G.site && G.owner && (G.superAdmin || G.adminPass)); /* 서버가 확인한 관리자 계정 또는 기존 관리자 암호 */
  h += `<section class="card"><h4>테스터별 진행</h4><div class="tbl"><table class="st2"><caption class="sr">테스터별 진행</caption><thead><tr>${delOn ? '<th scope="col">지울 기록 고르기</th>' : ''}<th scope="col">테스터</th><th scope="col">시작한 판</th><th scope="col">끝낸 판</th><th scope="col">고정 상황</th><th scope="col">마지막 질문</th><th scope="col">마지막 기록</th></tr></thead><tbody>${TR.map(t => `<tr>${delOn ? `<td><input type="checkbox" data-a="deltick" data-k="${esc(t.uid)}" aria-label="${esc(t.who)} 기록 지우기에 포함"${(G.delSel || []).includes(t.uid) ? ' checked' : ''}></td>` : ''}<td>${esc(t.who)}<br><button class="sm" data-a="runperson" data-k="${esc(t.uid)}">이 사람의 상세 기록</button></td><td>${t.started}</td><td>${t.done}</td><td>${t.scen}/3</td><td>${t.final ? '✓' : '—'}</td><td>${t.last ? esc(new Date(t.last).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : '—'}</td></tr>`).join('') || '<tr><td colspan="7">아직 없음</td></tr>'}</tbody></table></div>${delOn ? vDelBox(TR) : ''}</section>`;
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
  h += row('강타 예고 때 가장 많이 한 행동 (질문 6)', B => { const t = topShare(B.heavyResp); return t ? esc(dashActionName(t.k)) + ' ' + Math.round(t.p * 100) + '%' + (t.p > 0.5 ? ' ⚠' : '') : '—'; });
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
  for (const k of bn) for (const [it, m] of Object.entries(D.byB[k].room5)) { const top = Object.entries(m).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([a, n]) => esc(dashActionName(a)) + ' ' + n).join(', '); h += `<tr><td>${esc(BUILDS[k].n)}</td><td>${esc(ITEMS[it] ? ITEMS[it].n : it)}</td><td>${top}</td></tr>`; }
  h += `</tbody></table></div></section>`;
  h += `<section class="card"><h4>고정 상황 의사결정 (질문 1)</h4><p class="mini">결정 축: 먼저 공격한 대상, 일부러 맞은 강타 수, 처음 공격을 멈춘 행동. 상황마다 빌드 간 두 축 이상이 다르면 차이로 봅니다. 아이템 교체 축은 방 기록에서 봅니다.</p><div class="tbl"><table class="st2"><caption class="sr">고정 상황 의사결정</caption><thead><tr><th scope="col">상황</th><th scope="col">축</th>${bn.map(k => `<th scope="col">${esc(BUILDS[k].n)}</th>`).join('')}<th scope="col">다른 축</th></tr></thead><tbody>`;
  let pass = 0;
  for (const sc of SCEN) {
    const S = D.scen[sc.id] || {};
    const f = bn.map(k => S[k] ? modeOf(S[k].first) : '—'); const dl = bn.map(k => S[k] ? (S[k].delib / S[k].n > 0.5 ? '있음' : '없음') : '—'); const sp = bn.map(k => S[k] ? modeOf(S[k].stop) : '—');
    const diff = [f, dl, sp].filter(a => a.every(x => x !== '—') && new Set(a).size > 1).length;
    if (diff >= 2) pass++;
    h += `<tr><td rowspan="3">${sc.id} ${esc(sc.n)}</td><td>먼저 공격</td>${f.map(x => `<td>${esc(ROLES[x] ? ROLES[x].n : x === 'boss' ? '보스' : x)}</td>`).join('')}<td rowspan="3">${diff}</td></tr><tr><td>일부러 맞음</td>${dl.map(x => `<td>${x}</td>`).join('')}</tr><tr><td>처음 멈춤</td>${sp.map(x => `<td>${esc(dashActionName(x))}</td>`).join('')}</tr>`;
  }
  h += `</tbody></table></div><p><b>두 축 이상 다른 상황: ${pass}/5</b> (목표 3 이상)</p></section>`;
  return h;
}

/* ---------- 전체 렌더 ---------- */
const CLS_COLOR = { monk: '#8a5a2b', warden: '#4a6f94', berserker: '#b3402a', hunter: '#3f7d3a', arcanist: '#3f5fb3', templar: '#a0692a', assassin: '#4f7a2a', warlock: '#6b3a8a', priest: '#c49a1f', scar: '#8e2f5f' };
