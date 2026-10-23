'use strict';
/* S-4 랭킹 위조 막기 시험 (10월 24일): 네트워크 없이 게임 코드를 vm에 올리고, 끝난 가짜 판으로 랭킹 보내기(pushRank)가 만드는 문서를 본다.
   1 줄에 판 요약(sum: rid · t0 · floor · fights · ms · rev · sc)이 붙고 값이 판과 맞는다(전투 수는 전투 기록만, 점수는 rankScore)
   2 그 줄이 서버 검사(nrk-private/서버/S-4-랭킹위조-2026-10-24.sql의 nrk_rank_check)를 그대로 옮긴 serverCheck를 통과한다 — 게임과 SQL이 어긋나면 여기서 걸린다
   3 서버가 아직 안 바뀌었거나(없는 열 오류) 거절해도 pushRank는 던지지 않고, 이 브라우저의 rank80은 남고, 연결 상태(G.conn)는 그대로다
   4 표식 도전 판은 보내지 않는다. 랭킹 화면 거르기(rankOk)는 꾸민 줄을 빼고 옛 줄(요약 없음)과 정상 줄은 남긴다
   fetch는 막아 두고 한 번도 불리지 않았는지 본다. 쓰기: node tools/rank-check.js. 실패가 있으면 1로 끝난다 */
const vm = require('vm'), PS = require('./pagesrc.js');
const T = []; let n = 0; const t = (c, m) => { n++; if (!c) T.push(m); };
let fetched = 0;
const ctx = { console, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, module: { exports: {} }, fetch: () => { fetched++; throw new Error('네트워크 금지'); } };
vm.createContext(ctx);
vm.runInContext(PS.pageData('.') + '\n' + PS.pageScript('.') + '\n;this.__G = G;', ctx, { filename: 'index.html' });
const run_ = c => vm.runInContext(c, ctx), G = ctx.__G;
const REV = 'ab12cd34ef56'.repeat(5) + 'abcd'; // 가짜 배포 지문(64자)
run_(`toast = () => {}; render = () => {}; saveLocal = () => true; var document = { querySelector: s => /nrk-release/.test(s) ? { content: ${JSON.stringify(REV)} } : null };`);

/* SQL nrk_rank_check(need_sum = true)를 한 줄씩 옮긴 것. SQL을 고치면 여기도 고친다 */
const T_SEASON = 1792422000000;
function serverCheck(rid, e, now) {
  const I = x => Number.isInteger(x) ? x : null, btw = (x, a, b) => x != null && x >= a && x <= b;
  if (!e || typeof e !== 'object') return '줄 형식';
  if (!/^r[0-9a-z]{6,12}$/.test(rid) || e.id !== rid) return '판 번호';
  const ch = I(e.ch), cl = I(e.clears), fl = I(e.floor), lv = I(e.lv), ms = I(e.ms), at = I(e.at);
  if (!btw(ch, 1, 3)) return '챕터 범위'; if (!btw(cl, Math.max(ch - 1, 0), ch)) return '깬 챕터'; if (!btw(fl, 1, 16)) return '층 범위'; if (!btw(lv, 1, 16)) return '레벨 범위';
  if (!btw(ms, 0, 2592000000)) return '플레이 시간 범위'; if (!btw(at, T_SEASON, now + 86400000)) return '기록 시각';
  if (!['normal', 'hard'].includes(e.mode)) return '모드'; if (!['alive', 'clear', 'dead', 'abandon'].includes(e.st)) return '상태'; if (e.st === 'clear' && cl < 1) return '돌파인데 깬 챕터 0';
  if (!/^[a-z]{2,20}$/.test(e.build || '')) return '직업'; if ((e.cname || '').length > 40 || (e.title || '').length > 40 || (e.v || '').length > 20) return '글자 길이';
  if ('eq' in e && (!Array.isArray(e.eq) || e.eq.length > 12)) return '장비 칸';
  const s = e.sum; if (!s || typeof s !== 'object') return '판 요약 없음'; if (s.rid !== rid) return '요약의 판 번호';
  const t0 = I(s.t0), sfl = I(s.floor), nf = I(s.fights), idMs = parseInt(rid.slice(1), 36);
  if (t0 == null || Math.abs(t0 - idMs) > 5000) return '판 시작 시각과 판 번호'; if (t0 < T_SEASON || t0 > now + 86400000 || at < t0) return '판 시작 시각';
  if (!btw(sfl, 0, 30) || fl !== Math.min(Math.max(sfl, 1), 16)) return '요약의 층'; if (!btw(nf, 0, 5000) || nf < cl) return '전투 수';
  if (I(s.ms) !== ms) return '요약의 플레이 시간'; if (I(s.sc) !== cl * 1000 + (ch > cl ? fl : 0)) return '점수와 요약';
  if (!/^([0-9a-f]{12})?$/.test(s.rev == null ? '' : String(s.rev))) return '배포 지문';
  if (ms < nf * 500 || ms < cl * 120000) return '최소 플레이 시간'; if (now - t0 < ms - 600000) return '흐른 시간보다 긴 플레이 시간';
  return null;
}

/* 가짜 저장소: board80/<uid> 문서 하나를 기억한다. mode로 정상 · 없는 열 오류 · 서버 거절을 고른다 */
function fakeDb(mode) {
  const st = { docs: {}, sets: 0 };
  st.db = { doc: p => ({
    get: async () => ({ exists: !!st.docs[p], data: () => st.docs[p] ? JSON.parse(JSON.stringify(st.docs[p])) : undefined }),
    set: async o => { st.sets++; if (mode === 'nocol') throw Object.assign(new Error('Could not find the column in the schema cache'), { code: 'PGRST204' }); if (mode === 'reject') throw Object.assign(new Error('nrk_rank: 최소 플레이 시간 (r0)'), { code: '22023' }); st.docs[p] = JSON.parse(JSON.stringify(o)); },
  }), collection: () => ({ get: async () => ({ docs: [] }) }) };
  return st;
}
/* 끝난 가짜 판: 1챕터를 깨고 2챕터 7층에서 쓰러짐. 전투 기록 9 + 보스 승리 줄 · 야영지 · 이벤트 줄(전투 아님) */
const T0 = Date.now() - 3 * 3600e3;
function fakeRun(o) {
  const fight = (room, res) => ({ room, res, type: 'normal', hpIn: 1, hpOut: res === 'lose' ? 0 : 0.6, acts: 5 });
  const rooms = [fight(1, 'win'), fight(2, 'win'), fight(3, 'flee'), fight(3, 'win'), { room: 8, type: 'camp', rested: 1 }, { room: 9, type: 'event', event: 'tomb', took: 'carve' }, fight(12, 'win'), fight(16, 'win'), { room: 16, type: 'boss', res: 'win' }, fight(1, 'win'), fight(4, 'win'), fight(7, 'lose')];
  return Object.assign({ id: 'r' + T0.toString(36), startedAt: T0, build: 'warden', cname: '시험', ch: 2, room: 7, clears: 1, lv: 6, mode: 'normal', playMs: 41 * 60000 + 321.4, rooms, eqU: null, inv: {} }, o || {});
}

(async () => {
  const uid = 'u-test';
  { // 1 · 2 요약 붙이기와 서버 검사
    const S = fakeDb('ok'); Object.assign(G, { db: S.db, uid, conn: 'ok', scr: 'title', data: { name: '시험꾼', rank80: {} } });
    const run = fakeRun(); await run_('pushRank')(run, 'dead');
    const doc = S.docs['board80/' + uid], e = doc && doc.rank80 && doc.rank80[run.id];
    t(S.sets === 1 && e, '보낸 문서에 이 판 줄이 없다');
    const s = e && e.sum || {};
    t(['rid', 't0', 'floor', 'fights', 'ms', 'rev', 'sc'].every(k => k in s), '요약 칸이 모자란다: ' + JSON.stringify(s));
    t(s.rid === run.id && s.t0 === T0 && s.floor === 7, '판 번호 · 시작 시각 · 층: ' + JSON.stringify(s));
    t(s.fights === 9, '전투 수는 전투 기록 9(보스 승리 줄 · 야영지 · 이벤트 빼고)인데 ' + s.fights);
    t(s.ms === e.ms && e.ms === Math.round(run.playMs), '플레이 시간: ' + s.ms + ' / ' + e.ms);
    t(s.rev === REV.slice(0, 12), '배포 지문 12자: ' + s.rev);
    t(s.sc === run_('rankScore')(e) && s.sc === 1007, '점수 1×1000 + 7층 = 1007인데 ' + s.sc);
    t(e.st === 'dead' && doc.name === '시험꾼', '상태 · 이름');
    t(G.data.rank80[run.id] && G.data.rank80[run.id].sum && G.data.rank80[run.id].sum.sc === 1007, '이 브라우저 rank80에도 요약이 남는다');
    const why = serverCheck(run.id, e, Date.now()); t(why === null, '정상 판인데 서버 검사에 걸린다: ' + why);
    // 꾸민 줄은 서버 검사에 걸린다
    const bad = (f, want) => { const x = JSON.parse(JSON.stringify(e)); f(x); const w = serverCheck(run.id, x, Date.now()); t(w === want, '꾸민 줄 ' + want + ' 기대, 받은 것 ' + w); };
    bad(x => { x.clears = 3; x.ch = 3; }, '점수와 요약');
    bad(x => { x.clears = 3; x.ch = 3; x.sum.sc = 3000; x.ms = x.sum.ms = 200000; }, '최소 플레이 시간'); // 세 챕터를 3분 남짓에
    bad(x => { x.ch = 9; }, '챕터 범위');
    bad(x => { delete x.sum; }, '판 요약 없음');
    bad(x => { x.sum.t0 -= 86400e3; }, '판 시작 시각과 판 번호');
    bad(x => { x.ms = x.sum.ms = 5 * 3600e3; }, '흐른 시간보다 긴 플레이 시간');
    bad(x => { x.floor = 12; x.sum.sc = 1012; }, '요약의 층');
    // 첫 층(방 0)에서 나간 판 · 가혹 모드도 통과
    const S2 = fakeDb('ok'); G.db = S2.db; const r0 = fakeRun({ id: 'r' + (T0 + 1000).toString(36), startedAt: T0 + 1000, room: 0, ch: 1, clears: 0, lv: 1, mode: 'hard', rooms: [], playMs: 9000 });
    await run_('pushRank')(r0); const e0 = S2.docs['board80/' + uid].rank80[r0.id];
    t(e0 && e0.st === 'alive' && e0.floor === 1 && e0.sum.floor === 0 && e0.sum.fights === 0 && e0.sum.sc === 1, '첫 층 판 요약: ' + JSON.stringify(e0 && e0.sum));
    t(serverCheck(r0.id, e0, Date.now()) === null, '첫 층 판이 서버 검사에 걸린다: ' + serverCheck(r0.id, e0, Date.now()));
  }
  for (const mode of ['nocol', 'reject']) { // 3 서버가 안 바뀌었거나 거절해도 조용히
    const S = fakeDb(mode); Object.assign(G, { db: S.db, uid, conn: 'ok', scr: 'title', data: { name: '', rank80: {} } });
    const run = fakeRun(); let threw = null; try { await run_('pushRank')(run, 'dead'); } catch (e) { threw = e; }
    t(!threw && S.sets === 1, mode + ': pushRank가 던졌거나 보내지 않았다 ' + (threw && threw.message));
    t(G.data.rank80[run.id] && G.data.rank80[run.id].sum, mode + ': 이 브라우저 rank80이 남지 않았다');
    t(G.conn === 'ok', mode + ': 연결 상태가 바뀌었다 ' + G.conn);
  }
  { // 4 표식 도전 판 · 랭킹 거르기
    const S = fakeDb('ok'); Object.assign(G, { db: S.db, uid, conn: 'ok', scr: 'title', data: { name: '', rank80: {} } });
    await run_('pushRank')(fakeRun({ markCh: 2 }), 'clear'); t(S.sets === 0 && !Object.keys(G.data.rank80).length, '표식 도전 판을 보냈다');
    const ok = run_('rankOk'), good = run_('rankEntry')(fakeRun(), 'dead');
    const legacy = Object.assign({}, good); delete legacy.sum;
    t(ok(good) && ok(legacy), '정상 줄 · 요약 없는 옛 줄이 걸러졌다');
    t(!ok(Object.assign({}, legacy, { clears: 99, ch: 99 })), '범위 밖 줄(깬 챕터 99)이 남았다');
    t(!ok(Object.assign({}, good, { clears: 3, ch: 3 })), '요약과 어긋난 줄(점수)이 남았다');
    t(!ok(Object.assign({}, legacy, { lv: 40 })), '레벨 40 줄이 남았다');
    G.board = [{ uid: 'a', name: '정상', rank80: { [good.id]: good } }, { uid: 'b', name: '꾸밈', rank80: { rx: Object.assign({}, good, { id: 'rx', clears: 3, ch: 3 }) } }];
    const rows = run_('rankRows')(); t(rows.length === 1 && rows[0].nick === '정상', '랭킹 줄 거르기: ' + rows.map(r => r.nick).join(','));
    G.board = null;
  }
  t(fetched === 0, '네트워크(fetch)를 불렀다 ' + fetched);
  if (T.length) { console.log('실패 ' + T.length + ' / ' + n); T.forEach(m => console.log(' - ' + m)); process.exitCode = 1; }
  else console.log('랭킹 판 요약 · 서버 검사 맞춤 · 서버 미적용/거절 조용히 · 표식 판 제외 · 랭킹 거르기 ' + n + '개 통과(네트워크 0)');
})().catch(e => { console.error(e); process.exitCode = 1; });
