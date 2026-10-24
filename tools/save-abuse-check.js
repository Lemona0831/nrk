'use strict';
/* S-5 저장 · 계정 꼼수 시험 (10월 24일): 네트워크 없이 게임 코드를 vm에 올리고(브라우저 저장소 · 계정 저장소는 메모리 가짜) 저장본을 손보거나 계정 · 기기를 바꿔 본다.
   A 판 지문(js/62 mkStamp · mkCheck): 고친 저장본에서 이어 온 판은 랭킹에 가지 않는다(js/44 pushRank). 고치지 않은 판은 몇 번을 다시 열어도 표시가 붙지 않는다. 지문 전 저장본은 열리고 leg 표시만
   B 계정 · 기기: 계정 바꾸기가 실패하면 앞 계정 자료를 새 계정 경로로 보내지 않는다 · 끝난 판은 다른 기기 가지로 되살아나지 않는다 · 로그아웃 → 다시 로그인에 판이 겹치지 않는다
   C 옛 찌꺼기: 0.7.0이 남긴 계정 문서의 목표(goals62) · 0.7.0 보관 키는 읽지 않는다 · 지금 풀에 없는 옛 이벤트 · 제단 · 성소 방 그리기(성소는 10월 24일부터 지나치기만)
   B4 · D (10월 24일 만든 사람 결정): 갈린 두 살아 있는 가지는 창 없이 플레이 시간이 긴 쪽 · 랭킹 손님 표시 · 관리자 결과 보기의 랭킹 제외 · 옛 저장본 표시
   판 표본은 자동 테스터(dgqa)로 한 판을 몇 방 돌려 뜬다. fetch는 막아 두고 한 번도 불리지 않았는지 본다. 쓰기: node tools/save-abuse-check.js. 실패가 있으면 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const vm = require('vm'), PS = require('./pagesrc.js');
let n = 0; const fail = [], info = []; const ok = (c, m) => { n++; if (!c) fail.push(m); };
const parse = x => JSON.parse(JSON.stringify(x));

/* 판 표본: 자동 테스터로 1챕터를 몇 방 → 이어 하기 저장본(cur). 전투 중 저장본(battle)도 하나 */
let sample = null, sampleB = null;
{ const D = require('./dgqa.js'); const G1 = D.G0.__G; D.OPT.chapters = 1;
  const grab = () => { const c = G1.data && G1.data.cur; if (!c || !c.startedAt) return; if (!sampleB && c.battle && c.battle.b && (c.battle.b.en || []).length) sampleB = parse(c); if (!sample && (G1.run.room || 0) >= 5 && !c.battle) sample = parse(c); };
  D.OPT.onStep = grab; D.OPT.onTurn = grab;
  for (let s = 0; s < 6 && !(sample && sampleB); s++) { try { D.playChar('careful', 'warden', 52000 + s * 13); } catch (e) { } }
  D.OPT.onStep = null; D.OPT.onTurn = null; }
if (!sample) { console.log('save-abuse-check: 판 표본을 뜨지 못함'); process.exit(1); }

/* 게임: 진짜 saveLocal · loadLocal · accountLocal · cloudLoad. 저장소는 메모리 */
const store = new Map(), ses = new Map(); let deny = null, fetched = 0, confirms = 0, toasts = [];
const ctx = { console, URLSearchParams, setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { }, module: { exports: {} }, fetch: () => { fetched++; throw new Error('네트워크 금지'); },
  localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => { if (deny && deny(k)) throw Object.assign(new Error('test quota'), { name: 'QuotaExceededError', code: 22 }); store.set(k, String(v)); }, removeItem: k => store.delete(k) },
  sessionStorage: { getItem: k => ses.has(k) ? ses.get(k) : null, setItem: (k, v) => ses.set(k, String(v)), removeItem: k => ses.delete(k) },
  location: { hash: '', search: '', href: 'https://example.invalid/', replace() { } }, history: { replaceState() { } },
  confirm: m => { confirms++; return !/다른 저장본: 삭제된 세이브/.test(m); } }; // 고르는 창: 늘 살아 있는 쪽(되살리는 쪽)을 고른다
vm.createContext(ctx);
vm.runInContext(PS.pageData('.') + '\n' + PS.pageScript('.') + '\n;this.__G = G;', ctx, { filename: 'index.html' });
const G = ctx.__G, E = c => vm.runInContext(c, ctx), SKEY = E('SKEY');
ctx.__toast = m => toasts.push(m); E('toast = m => __toast(m); render = () => {}; scheduleSync = () => {};');
const reset = () => { store.clear(); ses.clear(); deny = null; Object.assign(G, { data: ctx.blankData(), run: null, b: null, cloud: null, db: null, uid: null, conn: '', acct: null, sb: null, localReadBlocked: false, tabStale: 0, localSaveError: null, scr: 'title' }); };
const stored = () => JSON.parse(ctx.localSaveText(store.get(SKEY)));
const put = d => store.set(SKEY, JSON.stringify(d));
const runOf = (id, o) => Object.assign(parse(sample), { id, startedAt: parseInt(id.slice(1), 36) }, o || {});
const T0 = Date.now() - 2 * 3600e3, RID = 'r' + T0.toString(36), RID2 = 'r' + (T0 + 60000).toString(36);
/* 랭킹 저장소(board80/<uid>) 가짜 */
function boardDb() { const docs = {}; return { docs, doc: p => ({ get: async () => ({ exists: !!docs[p], data: () => parse(docs[p]) }), set: async o => { docs[p] = parse(o); } }), collection: () => ({ get: async () => ({ docs: [] }) }) }; }
async function rankTry(run) { const db = boardDb(); Object.assign(G, { db, uid: 'u-rank', conn: 'ok' }); G.data.rank80 = {}; await E('pushRank')(run, 'alive'); const e = db.docs['board80/u-rank'] && db.docs['board80/u-rank'].rank80[run.id]; G.db = null; G.conn = ''; return { e, local: !!(G.data.rank80 || {})[run.id] }; }

(async () => {
  /* ===== A. 판 지문 ===== */
  { reset(); G.data.cur = runOf(RID); G.data.kept = [runOf(RID2, { cname: '둘째' })]; ok(ctx.saveLocal(), 'A 저장 실패');
    const s = stored(); ok(s.mkv === 1 && /^mk1:/.test(s.cur.mk) && /^mk1:/.test(s.kept[0].mk), 'A 저장본에 지문(mkv · mk)이 없다');
    let d = ctx.loadLocal(); ok(!d.cur.noRank && !d.cur.mkLeg && !d.kept[0].noRank, 'A 고치지 않은 저장본인데 표시가 붙었다');
    ok(JSON.stringify(d) === JSON.stringify(G.data), 'A 고치지 않은 저장본을 읽으면 내용이 그대로여야 한다');
    for (let i = 0; i < 3; i++) { G.data = d; ok(ctx.saveLocal(), 'A 다시 저장'); d = ctx.loadLocal(); } ok(!d.cur.noRank && !d.kept[0].noRank, 'A 세 번 다시 열어도 표시 없음');
    const r = await rankTry(parse(d.cur)); ok(r.e && r.local && !r.e.leg, 'A 고치지 않은 판은 랭킹에 간다(leg 없음)');
    // 압축 저장(용량에 걸릴 때)도 같다
    reset(); G.data.cur = runOf(RID); const big = Array.from({ length: 4000 }, (_, i) => ({ k: 'act', a: 'basic', note: '누적 '.repeat(20) + i }));
    G.data.runs = [{ id: 'h0', acts: big }, { id: 'h1', acts: big }]; let lim = 0; deny = k => { lim++; return k === SKEY && lim === 1; }; ok(ctx.saveLocal() && G.localSaveInfo.packed, 'A 압축 저장이 되지 않았다'); deny = null;
    d = ctx.loadLocal(); ok(!d.cur.noRank && !d.cur.mkLeg, 'A 압축 저장본을 읽어도 표시 없음');
  }
  if (sampleB) { reset(); G.data.cur = Object.assign(parse(sampleB), { id: RID, startedAt: T0 }); ok(ctx.saveLocal(), 'A 전투 저장'); let d = ctx.loadLocal(); ok(!d.cur.noRank, 'A 전투 중 저장본: 고치지 않았는데 표시');
    const raw = stored(); const en = raw.cur.battle.b.en.find(e => e && e.alive); if (en) { en.hp = 1; put(raw); d = ctx.loadLocal(); ok(d.cur.noRank === 1, 'A 전투 중 적 생명력을 1로 고친 저장본이 표시되지 않았다'); } }
  else info.push('전투 중 판 표본을 뜨지 못해 전투 저장본 시험은 건너뜀');
  const tamper = [
    ['골드 +99999', c => { c.gold = (c.gold || 0) + 99999; }],
    ['레벨 · 경험치', c => { c.lv = 16; c.xp = 0; }],
    ['챕터 · 깬 챕터 · 층 · 플레이 시간', c => { c.ch = 3; c.clears = 3; c.room = 16; c.playMs = 4 * 3600e3; }],
    ['장비 등급 · 보정', c => { const it = Object.values(c.inv || {})[0]; if (it) { it.g = 'l'; it.b = 99; } else c.inv = { x: { tpl: 'g8|l|weapon', g: 'l' } }; }],
    ['생명력 · 플라스크', c => { c.p.hp = 9999; c.p.hpMax = 9999; c.p.flask = { life: 9, mana: 9, stam: 9 }; }],
    ['트리 포인트', c => { if (c.ptree) c.ptree.pts = (c.ptree.pts || 0) + 50; else c.atree = { pts: 50 }; }],
    ['소모품', c => { c.cons = (c.cons || []).concat([{ id: 'elixir', n: 9 }]); }],
    ['전투 기록 늘리기', c => { c.rooms = (c.rooms || []).concat([{ room: 1, res: 'win', hpOut: 1 }, { room: 2, res: 'win', hpOut: 1 }]); }],
    ['지문만 지움(mkv는 남김)', c => { delete c.mk; }],
  ];
  for (const [nm, f] of tamper) { reset(); G.data.cur = runOf(RID); ctx.saveLocal(); const raw = stored(); f(raw.cur); put(raw); const d = ctx.loadLocal();
    ok(d.cur.noRank === 1, 'A 손으로 고친 저장본(' + nm + ')이 표시되지 않았다'); G.data = d; const r = await rankTry(parse(d.cur)); ok(!r.e && !r.local, 'A 고친 판(' + nm + ')이 랭킹에 갔다'); }
  { // 표시는 남는다: 표시된 판을 저장 → 표시(noRank)만 지운 저장본도 다시 걸린다
    reset(); G.data.cur = runOf(RID); ctx.saveLocal(); let raw = stored(); raw.cur.gold += 500; put(raw); let d = ctx.loadLocal(); G.data = d; ctx.saveLocal();
    d = ctx.loadLocal(); ok(d.cur.noRank === 1, 'A 표시는 다음 저장 · 읽기에도 남아야 한다'); raw = stored(); delete raw.cur.noRank; put(raw); d = ctx.loadLocal(); ok(d.cur.noRank === 1, 'A 표시(noRank)만 지운 저장본이 다시 걸리지 않았다');
    // 기다리는 캐릭터(kept)를 고치면 그 판만
    reset(); G.data.cur = runOf(RID); G.data.kept = [runOf(RID2)]; ctx.saveLocal(); raw = stored(); raw.kept[0].gold += 777; put(raw); d = ctx.loadLocal(); ok(d.kept[0].noRank === 1 && !d.cur.noRank, 'A 기다리는 캐릭터만 고쳤는데 표시가 맞지 않다');
    // 시작 시각이 없는 판(진짜 판이 아님)은 랭킹에 가지 않는다
    reset(); const r = await rankTry(Object.assign(runOf(RID), { startedAt: 0 })); ok(!r.e && !r.local, 'A 시작 시각 없는 판이 랭킹에 갔다'); }
  { // 지문 전 저장본(mkv 없음): 열리고 leg 표시, 한 번 저장한 뒤로는 지문으로 맞춘다
    reset(); const old = ctx.blankData(); old.cur = runOf(RID); old.kept = [runOf(RID2)]; put(old); let d = ctx.loadLocal();
    ok(d.cur.mkLeg === 1 && !d.cur.noRank && d.kept[0].mkLeg === 1, 'A 지문 전 저장본: 열리고 mkLeg 표시만이어야 한다');
    G.data = d; let r = await rankTry(parse(d.cur)); ok(r.e && r.e.leg === 1, 'A 지문 전 판은 랭킹에 가되 leg: 1');
    ctx.saveLocal(); d = ctx.loadLocal(); ok(d.cur.mkLeg === 1 && !d.cur.noRank, 'A 지문 전 판: 저장 뒤 다시 열어도 표시 없음(leg 유지)');
    const raw = stored(); raw.cur.gold += 1; put(raw); d = ctx.loadLocal(); ok(d.cur.noRank === 1, 'A 지문 전 판도 한 번 저장한 뒤 고치면 걸린다');
    const raw2 = stored(); delete raw2.mkv; raw2.cur.gold += 1; put(raw2); d = ctx.loadLocal(); ok(d.cur.noRank === 1, 'A mkv만 지우고 지문은 남긴 채 고친 판이 걸리지 않았다');
    info.push('한계: mkv와 판의 지문을 함께 지우고 고치면 "지문 전 저장본"으로 열린다 — 랭킹 줄에 leg: 1이 붙는다'); }
  { // 계정 보관본도 지문을 맞춘다
    reset(); G.data.accountId = 'uA'; G.data.cur = runOf(RID); ctx.saveLocal(); const keyB = SKEY + ':account:uB'; const b = ctx.blankData(); b.accountId = 'uB'; b.cur = runOf(RID2); ctx.mkStamp(b);
    b.cur.gold += 1234; store.set(keyB, JSON.stringify(b)); ctx.accountLocal('uB'); ok(G.data.accountId === 'uB' && G.data.cur && G.data.cur.noRank === 1, 'A 손으로 고친 계정 보관본이 표시되지 않았다');
    const a = JSON.parse(store.get(SKEY + ':account:uA')); ok(a.mkv === 1 && a.cur && a.cur.mk, 'A 계정 보관본에 지문이 없다'); ctx.accountLocal('uA'); ok(G.data.accountId === 'uA' && G.data.cur && !G.data.cur.noRank, 'A 고치지 않은 계정 보관본에 표시'); }

  /* ===== B. 계정 · 기기 ===== */
  { // B1 계정 바꾸기(accountLocal)가 실패하면 저장소를 끊는다: 앞 계정(uA)의 판 기록 · 이름이 새 계정(uB) 경로로 가지 않는다
    reset(); G.data.accountId = 'uA'; G.data.name = '앞계정'; G.data.cur = runOf(RID); ctx.saveLocal();
    let up = 0; const q = { eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), like: async () => ({ data: [], error: null }) };
    const sb = { auth: { getSession: async () => ({ data: { session: { user: { id: 'uB', is_anonymous: false, identities: [{ provider: 'google' }] } } } }) }, from: () => ({ upsert: async () => { up++; return { error: null }; }, select: () => q }), rpc: async () => ({ data: false, error: null }) };
    ctx.window = { supabase: { createClient: () => sb } }; E('loadScript = async () => {}'); deny = k => k === SKEY + ':account:uA';
    await ctx.initSite({ supabaseUrl: 'https://example.invalid', anonKey: 'x'.repeat(30) }); deny = null;
    ok(G.conn === 'sitefail' && G.data.accountId === 'uA', 'B1 계정 보관 실패를 sitefail로 보지 않았다'); ok(!G.db, 'B1 계정 바꾸기가 실패했는데 저장소(G.db)가 새 계정에 붙어 있다');
    G.run = parse(G.data.cur); G.run.acts = G.run.acts || []; await E('syncRun')(G.run, 'left'); await E('pushName')(); await E('pushDb')('scen80/x', { a: 1 }); await E('pushRank')(G.run, 'alive');
    ok(up === 0, 'B1 앞 계정 자료가 새 계정 경로로 ' + up + '번 쓰였다'); G.run = null; delete ctx.window; }
  { // B2 끝난 판 되살리기: 기기 1(낡음)이 이어 한 가지 vs 기기 2에서 쓰러져 지워진 가지 → 고르는 창 없이 지운 쪽
    const docs = new Map(); const db = { doc: p => ({ set: async d => { docs.set(p, parse(d)); }, get: async () => ({ exists: docs.has(p), data: () => parse(docs.get(p)) }) }), collection: p => ({ get: async () => ({ docs: [...docs].filter(([k]) => k.slice(0, k.lastIndexOf('/')) === p).map(([k, d]) => ({ id: k.slice(k.lastIndexOf('/') + 1), data: () => parse(d) })) }) }) };
    const U = 'uR', dev = id => ses.set('nrkSaveDevice', id), login = () => Object.assign(G, { uid: U, db, conn: 'ok', acct: { anon: false, provider: 'google' }, run: null, cloud: null });
    const scene = async (flushDeath) => {
      reset(); docs.clear(); login(); G.data.accountId = U; dev('d1'); G.cloud = { uid: U, device: 'd1', ready: true, dirty: false }; G.data.cur = runOf(RID); ctx.saveLocal(); ok(await ctx.cloudFlush(), 'B2 기기 1 첫 전송');
      const d1 = parse(G.data);
      login(); G.data = ctx.blankData(); G.data.accountId = U; dev('d2'); await ctx.cloudLoad(); ok(G.data.cur && G.data.cur.id === RID, 'B2 기기 2가 판을 받지 못했다');
      const dead = G.data.cur; dead.result = 'lose'; dead.sealed = 1; const rec = { id: RID, build: dead.build, result: 'lose', endedAt: null, ch: 1, lv: dead.lv, updatedAt: Date.now() }; G.data.runs.push(rec); delete G.data.cur;
      docs.set('playtest/' + U + '/' + E('COL.runs') + '/' + RID, rec); if (flushDeath) { ctx.saveLocal(); ok(await ctx.cloudFlush(), 'B2 기기 2 쓰러짐 전송'); }
      login(); G.data = d1; dev('d1'); G.cloud = { uid: U, device: 'd1', ready: true, dirty: false }; G.data.cur.gold = (G.data.cur.gold || 0) + 5; ctx.saveLocal(); ok(await ctx.cloudFlush(), 'B2 낡은 기기 1 전송');
      login(); G.data = ctx.loadLocal(); dev('d1b'); confirms = 0; toasts = []; await ctx.cloudLoad();
      const live = [G.data.cur, ...(G.data.kept || [])].filter(Boolean).map(r => r.id);
      return { live, confirms, toast: toasts.some(t => /다른 기기에서 끝난 캐릭터/.test(t)), sig: (G.data.saveCloud[RID] || {}).sig, backups: [...docs.keys()].filter(k => k.includes('/saveBackups')).length };
    };
    let r = await scene(true); ok(!r.live.includes(RID) && r.confirms === 0 && r.sig === 'deleted' && r.toast, 'B2 쓰러져 지워진 판이 낡은 기기 가지로 되살아났다: ' + JSON.stringify(r)); ok(r.backups === 1, 'B2 갈린 두 가지의 원본 백업이 없다');
    r = await scene(false); ok(!r.live.includes(RID) && r.confirms === 0 && r.sig === 'deleted', 'B2 지운 가지 전송이 실패해도 판 기록(끝남)이 있으면 되살리지 않는다: ' + JSON.stringify(r));
    // B4(10월 24일 만든 사람 결정): 둘 다 살아 있는 판이 갈리면 고르는 창 없이 플레이 시간(playMs)이 긴 쪽, 양쪽 원본 백업 · 알림 한 줄
    const fork = async (longer) => {
      reset(); docs.clear(); login(); G.data.accountId = U; dev('e1'); G.cloud = { uid: U, device: 'e1', ready: true, dirty: false }; G.data.cur = runOf(RID, { playMs: 600000 }); ctx.saveLocal(); await ctx.cloudFlush(); const e1 = parse(G.data);
      login(); G.data = ctx.blankData(); G.data.accountId = U; dev('e2'); await ctx.cloudLoad(); G.data.cur.gold += 3; G.data.cur.playMs += longer === 'e2' ? 900000 : 60000; ctx.saveLocal(); await ctx.cloudFlush();
      login(); G.data = e1; dev('e1'); G.cloud = { uid: U, device: 'e1', ready: true, dirty: false }; G.data.cur.gold += 9; G.data.cur.playMs += longer === 'e1' ? 900000 : 60000; ctx.saveLocal(); await ctx.cloudFlush();
      login(); G.data = ctx.loadLocal(); dev('e1b'); confirms = 0; toasts = []; await ctx.cloudLoad();
      return { confirms, gold: G.data.cur && G.data.cur.gold, ms: G.data.cur && G.data.cur.playMs, kept: (G.data.kept || []).length, toast: toasts.some(t => /플레이 시간이 긴 저장본/.test(t)), backups: [...docs.keys()].filter(k => k.includes('/saveBackups')).length };
    };
    const g0 = runOf(RID).gold || 0;
    for (const [w, gold] of [['e2', g0 + 3], ['e1', g0 + 9]]) { const r = await fork(w); ok(r.confirms === 0 && r.gold === gold && r.ms === 600000 + 900000 && r.kept === 0 && r.toast && r.backups === 1, 'B4 갈린 두 가지(' + w + '가 더 오래 함): 창 없이 긴 쪽 · 백업 · 알림이어야 한다 ' + JSON.stringify(r)); }
    // B3 로그아웃 → 손님 → 다시 로그인: 판이 하나로 남는다(겹치지 않는다)
    reset(); docs.clear(); login(); G.data.accountId = U; dev('f1'); G.cloud = { uid: U, device: 'f1', ready: true, dirty: false }; G.data.cur = runOf(RID); G.data.kept = [runOf(RID2)]; G.data.name = '계정이름'; ctx.saveLocal(); await ctx.cloudFlush();
    G.sb = { auth: { signOut: async () => ({}) } }; await ctx.socialLogout(); G.sb = null; ok(!G.data.cur && !(G.data.kept || []).length && !G.data.accountId, 'B3 로그아웃 뒤 이 기기 자료가 비지 않았다');
    G.uid = 'uGuest'; ctx.accountLocal('uGuest'); G.data.cur = runOf('r' + (T0 + 120000).toString(36)); G.data.name = '손님'; ctx.saveLocal();
    login(); ctx.accountLocal(U); dev('f2'); await ctx.cloudLoad(); const ids = [G.data.cur, ...(G.data.kept || [])].filter(Boolean).map(r => r.id);
    ok(ids.length === 2 && new Set(ids).size === 2 && ids.includes(RID) && ids.includes(RID2) && G.data.name === '계정이름', 'B3 다시 로그인한 계정의 판: ' + JSON.stringify(ids) + ' · 이름 ' + G.data.name);
    ok(new Set(G.data.runs.map(r => r.id)).size === G.data.runs.length, 'B3 판 기록에 겹친 번호'); const g = JSON.parse(store.get(SKEY + ':account:uGuest')); ok(g.cur && g.cur.id !== RID && g.name === '손님', 'B3 손님 판은 손님 보관본에 따로 남는다');
  }

  /* ===== C. 옛 찌꺼기 ===== */
  { // C1 playtest/<uid> 문서는 시즌을 가리지 않는다: 0.7.0이 남긴 goals62(목표 · 표식 도전 열림 · 칭호 · 표식 기록)는 합치지 않는다. 0.8.0이 쓴 것은 합친다
    const goals62 = { g: { n: { 'warden|방패|3': 1 }, h: { 'warden|방패|3': 1 } }, markOpen: 1, title: 'hard', mb: { 'warden|2|n': { score: 9999 } } };
    for (const [v, want] of [['0.7.0', false], ['0.6b', false], ['0.8.0', true]]) {
      reset(); const doc = { v, name: '옛이름', goals62, season: v === '0.8.0' ? undefined : '0.7.0' };
      Object.assign(G, { uid: 'uS', conn: 'ok', db: { doc: p => ({ get: async () => ({ exists: p === 'playtest/uS', data: () => parse(doc) }), set: async () => { } }) } });
      await ctx.readAcct({ id: 'uS', is_anonymous: false, identities: [{ provider: 'google' }], user_metadata: {} });
      const got = !!(G.data.markOpen || G.data.title || Object.keys((G.data.goals || { n: {} }).n).length || Object.keys(G.data.markBest || {}).length);
      ok(got === want, 'C1 v ' + v + ' 문서의 계정 목표를 ' + (want ? '합쳐야' : '합치지 않아야') + ' 한다'); ok(G.data.name === '옛이름', 'C1 이름은 이어진다(v ' + v + ')'); }
  }
  { // C2 0.7.0 보관 키(nrk_062_v1:account:<uid>)는 읽지 않는다
    reset(); const old = ctx.blankData(); old.cur = runOf(RID); old.v = '0.7.0'; store.set('nrk_062_v1:account:uOld', JSON.stringify(old)); G.data.accountId = 'uNow'; ctx.accountLocal('uOld'); ok(!G.data.cur && G.data.accountId === 'uOld', 'C2 0.7.0 보관 키를 읽었다'); }
  { // C3 지금 풀에 없는 방(옛 이벤트 · 제단 · 성소)이 든 판을 그린다
    const room = (nm, cur) => { reset(); G.run = Object.assign(runOf(RID), { cur }); G.scr = 'run'; let h = '', err = ''; try { h = ctx.vRunMap(); } catch (e) { err = e.message; } G.run = null; return { h, err }; };
    let r = room('이벤트', { type: 'event', event: 'old_gone_event' }); ok(!r.err && /지나간다/.test(r.h), 'C3 옛 이벤트 방: ' + (r.err || '지나가기 단추 없음'));
    r = room('제단', { type: 'altar', altar: 'ash' }); ok(!r.err && /지나친다/.test(r.h), 'C3 옛 제단 방: ' + (r.err || '지나치기 단추 없음'));
    // 10월 24일: 옛 3챕터 성소(rest · firm · shade · clarity, 10월 22일 A3에서 뺌) — 지도가 멈추지 않고 "지나친다"만
    for (const id of ['rest', 'firm', 'shade', 'clarity']) { r = room('성소', { type: 'shrine', shrine: id }); ok(!r.err && /지나친다/.test(r.h) && !/data-a="shrine" data-k="1"/.test(r.h), 'C3 옛 성소 방(' + id + '): ' + (r.err || '지나치기만 있어야 한다')); }
    { reset(); G.run = Object.assign(runOf(RID), { cur: null }); G.run.doors = [Object.assign(ctx.mkRoom(G.run, 'shrine', 5), { shrine: 'clarity' })]; G.scr = 'run'; let h = '', err = ''; try { h = ctx.vRunMap(); } catch (e) { err = e.message; } ok(!err && /꺼진 성소/.test(h), 'C3 옛 성소 문 카드: ' + (err || '대체 이름 없음')); }
    { reset(); const run = G.run = Object.assign(runOf(RID), { cur: { type: 'shrine', shrine: 'shade', floor: 5, ch: 3 } }); run.buffs = {}; G.scr = 'run'; const n0 = (run.rooms || []).length; let err = ''; try { ctx.onClick({ target: { closest: () => ({ dataset: { a: 'shrine', k: '1' }, closest: () => null, getAttribute: () => null }) } }); } catch (e) { err = e.message; }
      ok(!err && !run.buffs.shade && (run.rooms || []).length === n0 + 1 && run.rooms[n0].took === null, 'C3 옛 성소에서 기도(k=1)가 효과를 주거나 멈췄다: ' + (err || JSON.stringify(run.buffs))); G.run = null; } }
  { // C4 없는 직업: 기다리는 캐릭터 · 랭킹 줄에서 빠지고 첫 화면은 그려진다
    reset(); G.data.kept = [Object.assign(runOf(RID2), { build: 'oldclass' })]; G.data.rank80 = { [RID2]: { id: RID2, build: 'oldclass', ch: 1, clears: 0, floor: 3, lv: 2, ms: 1000 } }; let h = '', err = ''; try { h = ctx.vTitle(); } catch (e) { err = e.message; }
    ok(!err, 'C4 없는 직업 판이 든 첫 화면: ' + err); ok(E('rankRows')().every(e => e.build !== 'oldclass'), 'C4 없는 직업 랭킹 줄이 보인다'); }

  /* ===== D. 표시(10월 24일 만든 사람 결정: 랭킹 손님 표시 · 관리자 결과 보기의 판 지문 표시) ===== */
  { // D1 랭킹: board80 문서에 login(손님이면 ''), 손님 줄 이름 옆에 "손님". login 칸이 없는 옛 문서는 표시하지 않는다
    reset(); const db = boardDb(); Object.assign(G, { db, conn: 'ok' });
    G.uid = 'uG'; G.acct = { anon: true }; G.data.name = '손님이름'; await E('pushRank')(runOf(RID), 'alive');
    G.uid = 'uA'; G.acct = { anon: false, provider: 'google' }; G.data.name = '계정이름'; await E('pushRank')(runOf(RID2), 'alive');
    const dG = db.docs['board80/uG'], dA = db.docs['board80/uA']; ok(dG && dG.login === '' && dA && dA.login === 'google', 'D1 board80 문서의 login: ' + JSON.stringify([dG && dG.login, dA && dA.login]));
    const old = parse(dA); delete old.login; old.name = '옛문서'; const oe = old.rank80[RID2]; delete old.rank80[RID2]; oe.id = oe.sum.rid = 'r' + (T0 + 7).toString(36); old.rank80[oe.id] = oe;
    G.board = [Object.assign({ uid: 'uG' }, dG), Object.assign({ uid: 'uA' }, dA), Object.assign({ uid: 'uOld' }, old)]; G.scr = 'rank'; G.rankTab = 'all'; G.rankMode = 'normal'; G.rankIncludeDead = true;
    let h = '', err = ''; try { h = ctx.vRank(); } catch (e) { err = e.message; } const tags = (h.match(/<span class="rctag">손님<\/span>/g) || []).length;
    ok(!err && tags === 1 && /손님이름<\/b> <span class="rctag">손님<\/span>/.test(h) && /계정이름 · 나<\/b><small>/.test(h) && /옛문서<\/b><small>/.test(h), 'D1 랭킹 손님 표시: ' + (err || '손님 표시 ' + tags + '개'));
    // pushName도 login을 맞춘다(손님이 구글을 이으면 같은 uid로 바뀐다)
    G.uid = 'uG'; G.acct = { anon: false, provider: 'google' }; await E('pushName')(); ok(db.docs['board80/uG'].login === 'google', 'D1 pushName이 login을 바꾸지 않았다');
    G.db = null; G.conn = ''; G.acct = null; G.board = null; G.scr = 'title'; }
  { // D2 판 기록(runRecord)에 noRank · mkLeg, 관리자 결과 보기(js/74)에 "랭킹 제외" · "옛 저장본"
    reset(); const rec = o => ctx.runRecord(Object.assign(runOf(RID), { acts: [] }, o)); const a = rec({ noRank: 1 }), b = rec({ mkLeg: 1 }), c = rec({});
    ok(a.noRank === 1 && !a.mkLeg && b.mkLeg === 1 && !b.noRank && !('noRank' in c) && !('mkLeg' in c), 'D2 runRecord 표시 칸: ' + JSON.stringify([a.noRank, a.mkLeg, b.noRank, b.mkLeg, 'noRank' in c, 'mkLeg' in c]));
    a.id = 'ra'; b.id = 'rb'; c.id = 'rc'; G.dashRaw = [{ uid: 'u1', name: '시험자', login: '', runs: [a, b, c] }]; G.rf = {}; G.rfPage = 0; G.rfOpen = null; let h = '', err = '';
    try { h = ctx.vRunLogs(); } catch (e) { err = e.message; } ok(!err && (h.match(/>랭킹 제외</g) || []).length === 1 && (h.match(/>옛 저장본</g) || []).length === 1, 'D2 관리자 결과 목록의 표시: ' + (err || '랭킹 제외 ' + (h.match(/>랭킹 제외</g) || []).length + ' · 옛 저장본 ' + (h.match(/>옛 저장본</g) || []).length));
    const key = ctx.dashRunRows().find(x => x.r.id === 'ra').key; G.rfOpen = key; G.rdTab = 'summary'; h = ''; err = ''; try { h = ctx.vRunLogs(); } catch (e) { err = e.message; } ok(!err && (h.match(/>랭킹 제외</g) || []).length === 2, 'D2 관리자 상세에 랭킹 제외 표시: ' + (err || '없음'));
    G.dashRaw = null; G.rfOpen = null; }

  ok(fetched === 0, 'fetch가 ' + fetched + '번 불렸다');
  for (const m of info) console.log('  알림: ' + m);
  console.log('save-abuse-check: 판 지문 · 계정 바꾸기 실패 · 끝난 판 되살리기 · 로그아웃 재로그인 · 옛 시즌 목표 · 옛 방 ' + n + '개 · 실패 ' + fail.length + '(네트워크 0)');
  for (const m of fail) console.log('  실패: ' + m); process.exitCode = fail.length ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
