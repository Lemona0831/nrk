'use strict';
/* ===== B0 화면 · 기록 · 결과 보기 ===== */
const esc = s => fixJosa(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SKEY = 'nrk_062_v1';    // 0.6a.2 스킬 시험판: 지인 주소 0.6a·next/(nrk_06_v1), B0.5(nrk_b0_v1)와 브라우저 기록이 섞이지 않게
/* 저장소 경로: 0.6a.2 스킬 시험판 기록은 지인 주소 0.6a(runs6 등)와 섞이지 않게 runs62·scen62·survey62에, 기록판은 board/<id> 문서의 best62 칸, 랭킹은 rank62 칸에 둔다 */
const COL = { runs: 'runs62', scen: 'scen62', survey: 'survey62', best: 'best62' };
const SNAMES = { trap: '덫', rift: '균열', echo: '메아리', plague: '역병', smite: '단죄', bond: '피의 연결', brand: '낙인', poison: '중독', bleed: '출혈', ignite: '화상', chill: '둔화', weak: '약화', empower: '강화', vuln: '취약', protect: '보호', haste: '가속', block: '막음', rage: '격노', broken: '붕괴' };
const BUFFS = { protect: 1, rage: 1, empower: 1, haste: 1, block: 1 };
const SICO = { poison: '☠️', bleed: '🩸', ignite: '🔥', weak: '🥀', empower: '💪', vuln: '💔', protect: '🛡️', chill: '❄️', haste: '💨', block: '✨', broken: '💫', brand: '📜', rage: '😡', trap: '🪤' }; // 상태 아이콘 (10월 3일)
const REASONS = [['need', '필요해서'], ['curious', '재미있어 보여서'], ['other', '기타']];

const G = {
  scr: 'title', data: null, run: null, b: null, sel: null, sheet: null, toast: null,
  scen: null, db: null, uid: null, owner: false, sync: '', dash: null, dashErr: '', downloads: null, liveMsg: '',
};

/* ---------- 저장 ---------- */
function blankData() { return { v: VERSION, runs: [], scen: {}, final: null, prog: {}, audio: { on: false } }; } /* 10월 7일: 소리는 꺼진 채 시작한다(첫 입력에 음악이 저절로 나지 않게) */
function loadLocal() { try { const s = localStorage.getItem(SKEY); if (s) return JSON.parse(s); } catch (e) { } return blankData(); }
function saveLocal() { try { localStorage.setItem(SKEY, JSON.stringify(G.data)); return true; } catch (e) { return false; } }
/* 결과 보기에서 누구 기록인지 바로 알 수 있게, 기록마다 닉네임과 로그인 방식을 함께 남긴다 */
function testerMeta() { const m = { v: VERSION, updatedAt: Date.now(), runs: G.data.runs.length, name: G.data.name || '', login: G.acct && !G.acct.anon ? G.acct.provider : '' }; if (G.data.unl) m.unl62 = { c: G.data.unl.c || {}, open: G.data.unl.open || {} }; if (G.data.goals || G.data.markOpen || G.data.title || G.data.markBest) m.goals62 = { g: G.data.goals || { n: {}, h: {} }, markOpen: G.data.markOpen ? 1 : 0, title: G.data.title || '', mb: G.data.markBest || {} }; return m; }
async function pushDb(path, obj) {
  if (!G.db || !G.uid || G.conn === 'readonly') { G.sync = CONN_MSG[G.conn] || CONN_MSG.nodb; return false; }
  try {
    await G.db.doc('playtest/' + G.uid).set(testerMeta());
    await G.db.doc('playtest/' + G.uid + '/' + path).set(obj);
    G.sync = '기록을 보냈습니다.'; return true;
  } catch (e) {
    if (e && /grant|permission|writer|denied|forbidden/i.test(String(e.code || e.message || ''))) { G.conn = 'readonly'; G.sync = CONN_MSG.readonly; return false; }
    G.sync = '기록을 보내지 못했습니다(' + (e && e.code || '오류') + '). 이 브라우저에는 남아 있으니, 첫 화면의 "기록 보내기 코드"로 전달해 주세요.'; return false;
  }
}
function b64enc(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function b64dec(s) { const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
function sumActs(acts) {
  const by = {}, heavy = {}; let n = 0;
  for (const x of acts || []) if (x.k === 'act') { n++; by[x.a] = (by[x.a] || 0) + 1; if (x.heavyIn) heavy[x.a] = (heavy[x.a] || 0) + 1; }
  return { n, by, heavy };
}
async function makeCode() {
  const lite = { v: VERSION, name: G.data.name || '', at: Date.now(),
    runs: G.data.runs.map(r => { const o = Object.assign({}, r); o.actSum = sumActs(r.acts); delete o.acts; return o; }),
    scen: Object.values(G.data.scen || {}).map(s => { const o = Object.assign({}, s); delete o.acts; return o; }),
    final: G.data.final || null };
  const json = JSON.stringify(lite);
  if (window.CompressionStream) { const st = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')); return 'NRK1:' + b64enc(new Uint8Array(await new Response(st).arrayBuffer())); }
  return 'NRK0:' + b64enc(new TextEncoder().encode(json));
}
async function readCode(code) {
  code = String(code || '').replace(/\s+/g, '');
  const m = code.match(/^NRK([01]):(.+)$/); if (!m) throw new Error('기록 보내기 코드가 아닙니다');
  const u8 = b64dec(m[2]);
  if (m[1] === '0') return JSON.parse(new TextDecoder().decode(u8));
  const st = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(st).text());
}
async function importCode(code) {
  const d = await readCode(code);
  let hsh = 0; for (const ch of code) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0;
  const id = 'imp_' + (d.name ? d.name.replace(/[^\w가-힣]/g, '').slice(0, 12) + '_' : '') + Math.abs(hsh).toString(36);
  await G.db.doc('playtest/' + id).set({ v: d.v, updatedAt: d.at || Date.now(), runs: (d.runs || []).length, name: d.name || '', imported: true });
  for (const r of d.runs || []) await G.db.doc('playtest/' + id + '/' + COL.runs + '/' + r.id).set(r);
  for (const s of d.scen || []) if (s && s.id) await G.db.doc('playtest/' + id + '/' + COL.scen + '/' + s.id).set(s);
  if (d.final) await G.db.doc('playtest/' + id + '/' + COL.survey + '/final').set(d.final);
  return { id, runs: (d.runs || []).length, name: d.name };
}
async function pushName() {
  if (!G.db || !G.uid) return;
  if (G.conn === 'ok') try { await G.db.doc('playtest/' + G.uid).set(testerMeta()); } catch (e) { }
  try { const ref = G.db.doc('board/' + G.uid); const cur = await ref.get(); if (cur.exists) { const d = JSON.parse(JSON.stringify(cur.data() || {})); d.name = G.data.name || d.name; await ref.set(d); G.board = null; render(); } } catch (e) { }
}
async function loadBoard() {
  if (!G.db || G.boardLoading) return; G.boardLoading = true;
  try { const qs = await G.db.collection('board').get(); G.board = qs.docs.map(x => Object.assign({ uid: x.id }, x.data())); } catch (e) { G.board = []; }
  G.boardLoading = false; render();
}
const CONN_MSG = {
  noconfig: '이 사이트는 아직 기록 저장소가 설정되지 않아, 기록이 이 브라우저에만 남습니다. 아래 "기록 보내기 코드"를 만든 사람에게 보내 주세요.',
  sitefail: '기록 저장소에 연결하지 못했습니다. 인터넷 연결을 확인하고 새로 고쳐 주세요. 그래도 안 되면 아래 "기록 보내기 코드"를 만든 사람에게 보내 주세요.',
  noviewer: '이 화면은 Claude 안에서 열어야 기록이 자동으로 모입니다. 아래 "기록 보내기 코드"를 만든 사람에게 보내 주세요.',
  nouser: 'Claude에 로그인하지 않았거나, 이 게임에 초대되지 않은 계정이라 기록이 자동으로 모이지 않습니다. 만든 사람에게 공유 초대를 요청하거나, 아래 "기록 보내기 코드"를 보내 주세요.',
  readonly: '보기 권한으로 열려 있어 기록을 보낼 수 없습니다. 만든 사람에게 참여자 권한을 요청하거나, 아래 "기록 보내기 코드"를 보내 주세요.',
  nodb: '공유 저장소를 쓸 수 없는 환경이라 기록이 자동으로 모이지 않습니다. 아래 "기록 보내기 코드"를 만든 사람에게 보내 주세요.',
};
/* ===== 별도 사이트(Supabase) 저장소 어댑터: Claude 저장소와 같은 방식(문서 경로)으로 답한다 ===== */
const SB_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
function siteCfg() { const c = window.NRK_CONFIG; return c && /^https:\/\//.test(c.supabaseUrl || '') && (c.anonKey || '').length > 20 ? c : null; }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('스크립트를 불러오지 못했습니다')); document.head.appendChild(s); }); }
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
function sbDb(sb, uid) {
  const own = path => path === 'playtest/' + uid || path.startsWith('playtest/' + uid + '/') || path === 'board/' + uid;
  return {
    doc: path => ({
      get: async () => { const { data, error } = await sb.from('docs').select('id,data').eq('path', path).maybeSingle(); if (error) throw Object.assign(new Error(error.message), { code: error.code }); return { exists: !!data, id: data && data.id, data: () => data ? clone(data.data) : undefined }; },
      set: async obj => {
        if (!own(path)) { if (!G.adminPass) throw Object.assign(new Error('관리자만 쓸 수 있는 경로입니다'), { code: 'not_granted' }); const { error } = await sb.rpc('admin_put', { pass: G.adminPass, p: path, d: obj }); if (error) throw Object.assign(new Error(error.message), { code: error.code }); return; }
        const { error } = await sb.from('docs').upsert({ path, data: obj, updated_at: new Date().toISOString() }, { onConflict: 'path' }); if (error) throw Object.assign(new Error(error.message), { code: error.code });
      },
    }),
    collection: path => ({ get: async () => { const { data, error } = await sb.from('docs').select('id,data').eq('parent', path); if (error) throw Object.assign(new Error(error.message), { code: error.code }); return { docs: (data || []).map(r => ({ id: r.id, data: () => clone(r.data) })) }; } }),
  };
}
/* 관리자용: 한 번에 받아 온 전체 문서를 같은 방식으로 읽게 해 준다 */
function memDb(rows) {
  const by = {}; for (const r of rows) by[r.path] = r;
  const parent = p => p.replace(/\/[^/]+$/, ''); const idOf = p => p.replace(/^.*\//, '');
  return {
    doc: path => ({ get: async () => ({ exists: !!by[path], id: idOf(path), data: () => by[path] ? clone(by[path].data) : undefined }), set: async () => { } }),
    collection: path => ({ get: async () => ({ docs: rows.filter(r => parent(r.path) === path).map(r => ({ id: idOf(r.path), data: () => clone(r.data) })) }) }),
  };
}
async function initSite(cfg) {
  G.site = true;
  try {
    await loadScript(SB_JS);
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await sb.auth.getSession();
    if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; session = r.data.session; }
    G.sb = sb; G.uid = session.user.id; G.db = sbDb(sb, G.uid); G.conn = 'ok';
    await readAcct(session.user);
    if (G.data.adminPass) { const { data: ok } = await sb.rpc('admin_check', { pass: G.data.adminPass }); if (ok) { G.owner = true; G.adminPass = G.data.adminPass; } }
  } catch (e) { G.conn = 'sitefail'; G.siteErr = (e && e.message) || String(e); }
  if (G.conn === 'ok') reviveCloud(); // 다른 브라우저에서 들어와도 저장소 기록으로 되살린다
  if (G.scr === 'admin' && G.db && G.owner && (!G.dash || G.dashErr)) { G.dash = null; G.dashErr = ''; G.dashReq = 0; } // 접속 전에 열린 관리자 화면은 접속 뒤 다시 불러온다
  render();
}
/* ===== 구글 로그인 (사이트 전용, 선택)
   익명으로 시작한 계정에 구글 계정을 이어 붙인다(linkIdentity). uid가 그대로라 지금까지의 기록이 그 계정으로 이어진다.
   그 구글 계정이 이미 다른 기기의 계정에 붙어 있으면, 그 계정으로 바꿔 들어갈지 묻는다. */
const PROVIDER_N = { google: '구글' };
const AUTH_BACK = () => location.href.split('#')[0].split('?')[0];
async function readAcct(user) {
  const ids = (user.identities || []).map(x => x.provider).filter(p => PROVIDER_N[p]);
  const anon = user.is_anonymous !== false && !ids.length;
  G.acct = { anon, provider: anon ? '' : ids[0] || (user.app_metadata && user.app_metadata.provider) || '' };
  const back = new URLSearchParams(location.hash.slice(1) + '&' + location.search.slice(1));
  const tried = sessionStorage.getItem('nrkLogin'); sessionStorage.removeItem('nrkLogin');
  if (back.get('error_code') || back.get('error')) {
    const code = back.get('error_code') || back.get('error');
    if (code === 'identity_already_exists' && tried) G.acct.conflict = tried;
    else G.acct.err = '로그인하지 못했습니다(' + code + '). 잠시 뒤 다시 해 주세요.';
    history.replaceState(null, '', AUTH_BACK());
  }
  if (anon) return;
  // 닉네임은 계정을 따라간다. 저장소에 남긴 이름 → 구글 계정의 이름 순서로 채운다
  let saved = '';
  try { const cur = await G.db.doc('playtest/' + G.uid).get(); if (cur.exists) { const cd = cur.data() || {}; saved = cd.name || ''; if (cd.unl62) { const U = unlData(); for (const [k, v] of Object.entries(cd.unl62.c || {})) U.c[k] = Math.max(U.c[k] || 0, v || 0); for (const [k, v] of Object.entries(cd.unl62.open || {})) if (v && !U.open[k]) U.open[k] = v; saveLocal(); } if (cd.goals62) goalsMerge(cd.goals62); } } catch (e) { } // 해금 · 목표는 기기와 계정 가운데 큰 값(합집합)을 남긴다
  const md = user.user_metadata || {};
  const nick = saved || G.data.name || md.name || md.full_name || md.nickname || md.preferred_username || md.user_name || '';
  if (nick && nick !== G.data.name) { G.data.name = String(nick).trim().slice(0, 16); saveLocal(); }
  if (tried || !saved) pushName();
}
async function socialLogin(provider, switchAcct) {
  if (!G.sb || !PROVIDER_N[provider]) return;
  sessionStorage.setItem('nrkLogin', provider);
  const opts = { provider, options: { redirectTo: AUTH_BACK() } };
  const r = G.acct && G.acct.anon && !switchAcct ? await G.sb.auth.linkIdentity(opts) : await G.sb.auth.signInWithOAuth(opts);
  if (r && r.error) { sessionStorage.removeItem('nrkLogin'); G.acct.err = /manual linking/i.test(r.error.message || '') ? '사이트 설정에서 계정 연결이 아직 켜지지 않았습니다. 만든 사람에게 알려 주세요.' : '로그인을 시작하지 못했습니다(' + (r.error.message || '오류') + ').'; render(); }
}
async function socialLogout() {
  if (!G.sb) return;
  await G.sb.auth.signOut();
  G.data.name = ''; saveLocal();
  location.replace(AUTH_BACK());
}
/* 상단 버튼: 로그인 전에는 "로그인", 로그인 뒤에는 "로그아웃"(닉네임은 설명 창에). 판 도중에는 상단이 길어지지 않게 숨긴다 */
function vAcctBtn() {
  if (!G.site || G.conn !== 'ok' || !G.acct) return '';
  if (!G.acct.anon) return `<button class="sm" data-a="logout" title="${esc(PROVIDER_N[G.acct.provider] || G.acct.provider)} 계정으로 로그인했습니다. 닉네임: ${esc(G.data.name || '아직 없음')}">로그아웃</button>`;
  return '<button class="sm" data-a="login" data-k="google" title="구글로 로그인합니다. 하지 않아도 플레이는 됩니다. 로그인하면 닉네임이 계정에 고정되고, 이 기기에 쌓인 기록도 그 계정으로 이어집니다.">로그인</button>';
}
/* 첫 화면 카드: 오류나 "이미 쓰는 계정" 선택처럼 알릴 것이 있을 때만 */
function vAcct() {
  if (!G.site || G.conn !== 'ok' || !G.acct || !(G.acct.err || (G.acct.anon && G.acct.conflict))) return '';
  const A = G.acct; let h = '<section class="card"><h3>로그인</h3>';
  if (A.err) h += `<p class="mini" role="alert">${esc(A.err)}</p>`;
  if (!A.anon) {
    h += `<p class="mini">${esc(PROVIDER_N[A.provider] || A.provider)} 계정으로 로그인했습니다. 닉네임은 ${esc(G.data.name || '아직 없음')}입니다. 기록판에서 바꿉니다.</p><button class="sm" data-a="logout">로그아웃</button>`;
  } else if (A.conflict) {
    const pn = PROVIDER_N[A.conflict];
    h += `<p class="mini">이 ${esc(pn)} 계정은 다른 기기에서 이미 쓰고 있습니다. 그 계정으로 들어가면 앞으로 하는 판은 그 계정에 쌓입니다. 이 기기에서 지금까지 한 판은 따로 남습니다.</p><div class="row"><button class="gold" data-a="loginswitch" data-k="${esc(A.conflict)}">${esc(pn)} 계정으로 들어가기</button><button data-a="loginno">이대로 두기</button></div>`;
  } else {
    h += `<p class="mini">로그인하지 않아도 플레이는 됩니다. 로그인하면 닉네임이 계정에 고정되고, 만든 사람이 누구의 기록인지 바로 압니다. 이 기기에 쌓인 기록도 그 계정으로 이어집니다.</p><div class="row"><button data-a="login" data-k="google">구글로 로그인</button></div>`;
  }
  return h + '</section>';
}
async function initCaps() {
  { const cfg = siteCfg(); if (cfg && !(window.claude && window.claude.use)) { await initSite(cfg); return; } }
  if (typeof window === 'undefined' || !window.claude || !window.claude.use) { G.conn = window.NRK_CONFIG ? 'noconfig' : 'noviewer'; render(); return; }
  try {
    const [db, user, dl] = await Promise.all([window.claude.use('db'), window.claude.use('user'), window.claude.use('downloads')]);
    G.downloads = dl;
    if (user) { G.uid = await user.id(); G.owner = await user.isOwner(); }
    if (db && G.uid) G.db = db;
    G.conn = !user ? 'nouser' : !db ? 'nodb' : 'ok';
    if (G.conn === 'ok' && user.can) { try { const cw = await user.can('data.write'); if (cw === false && !G.owner) G.conn = 'readonly'; } catch (e) { } }
  } catch (e) { G.conn = 'nodb'; }
  render();
}

