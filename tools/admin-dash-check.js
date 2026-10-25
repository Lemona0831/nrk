'use strict';
/* 관리자 결과 보기 탭 점검 (10월 24일 만든 사람 요청: 문제 판 · 지금 하는 판 · 한 판 따라가기 · 통계 · 스킬 트리 · 도구). 쓰기: node tools/admin-dash-check.js. 실패가 있으면 1로 끝난다
   가짜 테스터 둘 · 판 넷(화면 오류 줄이 있는 지금 하는 판 · 멈춘 듯한 판(랭킹 제외) · 쓰러진 판 · 1챕터를 깬 판(옛 저장본))을 G.dashRaw에 넣고 탭마다 화면 글을 만들어 본다.
   방사형 트리는 보기만(찍기 · 되돌리기 단추 없음) · 기록과 G.run을 바꾸지 않는지, 지금 하는 판 새로 고침이 마지막 조각만 읽는지도 본다. 서버에는 닿지 않는다 */
const assert = require('assert/strict'), vm = require('vm'), PS = require('./pagesrc.js');
const ctx = { console, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { } }; vm.createContext(ctx);
vm.runInContext(PS.pageData('.') + '\n' + PS.pageScript('.') + '\nthis.__G=G;', ctx);
vm.runInContext("G.data={runs:[],scen:{},seenRole:{}}; saveLocal=()=>true; scheduleSync=()=>{}; render=()=>{}; sfx=()=>{}; toast=()=>{};", ctx);
const G = ctx.__G, R = c => vm.runInContext(c, ctx); let n = 0; const ok = (c, m) => { n++; assert(c, m); };
/* 가짜 기록 */
const now = Date.now(), MIN = 60000, A = R("atBuild('monk')"), P = R("ptBuild('monk')");
const askills = Object.values(A.nodes).filter(x => x.kind === 'skill').map(x => x.id), aup = Object.values(A.nodes).filter(x => x.kind === 'upgrade' && !x.slot).map(x => x.id);
const pnot = Object.values(P.nodes).filter(x => x.kind === 'notable' && x.ring === 1).map(x => x.id), pks = Object.values(P.nodes).filter(x => x.kind === 'keystone').map(x => x.id);
const act = (ch, r, a, t, o) => Object.assign({ k: 'act', ch, r, a, t, hp: 0.8, hpNow: 80, hpMax: 100, st: 50, stMax: 100 }, o || {});
const room = (ch, r, type, res, o) => Object.assign({ ch, room: r, type, res, hpIn: 0.9, hpOut: res === 'lose' ? 0 : 0.6, acts: 12, t: 40.5 }, o || {});
const door = (floor, offered, picked, t) => ({ floor, offered, picked, t });
const live = { id: 'run-live', build: 'monk', cname: '살아 있는 자', v: '0.8.0', ch: 1, clears: 0, roomReached: 7, status: 'progress', startedAt: now - 40 * MIN, updatedAt: now - 2 * MIN, lv: 4, playMs: 30 * MIN, playerState: { hp: 42, hpMax: 120, st: 50, stMax: 100 },
  rooms: [room(1, 5, 'normal', 'win', { squad: 'wall' }), room(1, 6, 'strong', 'win', { foe: 'pilgrim' })], doorLog: [door(5, ['normal', 'strong+bell'], 0, now - 30 * MIN), door(6, ['strong', 'event'], 0, now - 20 * MIN), door(7, ['ambush', 'shrine', 'normal'], 0, now - 5 * MIN)],
  acts: [act(1, 5, 'basic', 1), act(1, 6, 'heavy', 2), act(1, 7, 'guard', 3), { k: 'err', ch: 1, r: 7, msg: 'c is not defined', at: '52-battle-hud.js:424:107', scr: 'run', sheet: '', b: 'on' }, act(1, 7, 'm_palm', 4)],
  atree: { own: [askills[0], aup[0]].filter(Boolean), pts: 1, vsel: {} }, ptree: { own: pnot.slice(0, 2), free: [], ks: [], pts: 2 }, skills: [askills[0]] };
const stuck = { id: 'run-stuck', build: 'warden', cname: '멈춘 자', v: '0.8.0', ch: 1, clears: 0, roomReached: 9, status: 'progress', startedAt: now - 120 * MIN, updatedAt: now - 30 * MIN, noRank: 1, lv: 5,
  rooms: [room(1, 8, 'camp', undefined, { hpOut: undefined, hpIn: undefined, rested: 1 })], doorLog: [door(9, ['normal', 'trial'], 1, now - 90 * MIN)], acts: Array.from({ length: 320 }, (_, i) => act(1, 9, 'basic', i)) };
const dead = { id: 'run-dead', build: 'monk', cname: '쓰러진 자', v: '0.8.0', ch: 1, clears: 0, roomReached: 6, status: 'done', result: 'lose', startedAt: now - 3000 * MIN, updatedAt: now - 2900 * MIN, endedAt: now - 2900 * MIN, deaths: [6],
  rooms: [room(1, 5, 'normal', 'win'), room(1, 6, 'strong', 'lose', { foe: 'bishop' })], doorLog: [door(5, ['normal'], 0, now - 2950 * MIN), door(6, ['strong', 'spring'], 0, now - 2920 * MIN)], acts: [act(1, 6, 'basic', 1)], actsN: 4000 };
const clear = { id: 'run-clear', build: 'monk', cname: '깬 자', v: '0.8.0', ch: 2, clears: 1, roomReached: 1, status: 'clear1', result: 'win', phase: 'wait', mkLeg: 1, startedAt: now - 500 * MIN, updatedAt: now - 300 * MIN, playMs: 90 * MIN, lv: 8,
  rooms: [room(1, 15, 'normal', 'win'), room(1, 16, 'boss', 'win'), { room: 16, type: 'boss', res: 'win' }], doorLog: [door(15, ['normal'], 0, now - 320 * MIN)], acts: [],
  atree: { own: askills.slice(0, 3), pts: 0, vsel: {} }, ptree: { own: pnot.slice(0, 3), free: [], ks: pks.slice(0, 1), pts: 0 }, skills: askills.slice(1, 3) };
const T1 = { uid: 'u-alpha', name: '알파', login: 'google', runs: [live, dead] }, T2 = { uid: 'u-beta', name: '베타', login: '', runs: [stuck, clear] };
G.dashRaw = [T1, T2]; G.dash = ctx.aggregate(G.dashRaw); G.dashAt = now; G.scr = 'admin'; G.run = null;
const before = JSON.stringify(G.dashRaw);
const tab = k => { G.admTab = k; return ctx.vDash(); };
/* 탭 머리 */
let h = tab('prob');
ok(h.includes('role="tablist"') && (h.match(/role="tab"/g) || []).length === 5 && h.includes('aria-selected="true"'), '탭 다섯 · tablist');
ok(/data-k="prob">문제 판 <span class="adm-badge">4<\/span>/.test(h), '문제 판 배지 4(오류 · 멈춤 · 한도 · 옛 저장본): ' + (h.match(/data-k="prob">[^<]*<span class="adm-badge">\d+/) || [''])[0]);
/* 1 문제 판 */
ok(h.includes('화면 오류가 난 판') && h.includes('c is not defined') && h.includes('52-battle-hud.js:424:107'), '오류 판 · 첫 메시지');
ok(h.includes('멈춘 자') && /멈춘 듯한 판[\s\S]*멈춘 자/.test(h), '멈춘 듯한 판');
ok(h.includes('랭킹 제외') && h.includes('옛 저장본') && h.includes('기록 한도'), '랭킹 제외 · 옛 저장본 · 기록 한도 표시');
ok(!/멈춘 듯한 판<\/h4>[\s\S]*?깬 자[\s\S]*?<\/section>/.test(h.slice(h.indexOf('멈춘 듯한 판</h4>'), h.indexOf('기록 한도 · 랭킹 제외 · 옛 저장본</h4>'))), '기다리는 판(깬 자)은 멈춘 판이 아님');
G.admQ = 'u-beta'; h = tab('prob'); ok(h.includes('찾은 판 2개') && /data-a="runopen" data-k="1:0"/.test(h), '찾기: 계정 ID로 두 판');
G.admQ = 'run-dead'; h = tab('prob'); ok(h.includes('찾은 판 1개') && h.includes('쓰러진 자'), '찾기: 판 ID'); G.admQ = '';
/* 2 지금 하는 판 */
h = tab('live');
ok(h.includes('살아 있는 자') && !/<tbody>[\s\S]*멈춘 자/.test(h) && !h.includes('쓰러진 자'), '지금 하는 판: 최근 판만');
ok(h.includes('35%') && h.includes('2분 전') && h.includes('1챕터 · 7층'), 'HP% · 지난 시간 · 위치');
ok(h.includes(R("dashActionName('m_palm',{build:'monk'})")), '마지막 행동: ' + R("dashActionName('m_palm',{build:'monk'})"));
ok(h.includes('data-a="livego"') && h.includes('data-a="liveauto"'), '새로 고침 · 자동');
/* 3 한 판 따라가기 */
G.rfOpen = '0:0'; G.rdTab = 'flow'; h = tab('run');
ok(h.includes('지금 여기') && h.includes('<b class="adm-pick">▶ ') && h.includes('adm-errrow') && h.includes('⚠ 화면 오류'), '흐름: 지금 여기 · 고른 문 · 오류 줄');
ok(h.includes('90% → 60%') && h.includes('차례 12') && h.includes('굶주린 순례자') && h.includes('방패벽'), '흐름: HP 들어감 → 나옴 · 차례 · 강적 · 무리');
const tl = ctx.dashTimeline(live); ok(tl.length === 3 && tl[2].cur && tl[2].errs.length === 1 && tl[2].door.picked === 0, '흐름 줄: 방 둘 + 지금 방(오류 1)');
G.rfOpen = '0:1'; h = tab('run'); ok(h.includes('☠ 쓰러짐') && h.includes('adm-deadrow') && h.includes('납골당 주교'), '쓰러짐 표시');
const tc = ctx.dashTimeline(clear); ok(tc.length === 2 && tc[1].x.type === 'boss' && tc[1].ch === 1, '보스 승리 줄은 한 번만');
const tlc = ctx.dashTimeline({ rooms: [room(1, 15, 'normal', 'win'), { room: 1, type: 'shrine' }, room(2, 2, 'normal', 'win')], doorLog: [door(15, ['normal'], 0, 1), door(1, ['shrine'], 0, 2), door(2, ['normal'], 0, 3)] });
ok(tlc[1].ch === 2 && tlc[1].door && tlc[2].ch === 2, '챕터 넘김 추정(방 번호가 줄면)');
G.rfOpen = '1:1'; G.rdTab = 'tree'; G.admTv = 'a'; h = tab('run');
ok(h.includes('trd-svg') && h.includes('admtv-a') && h.includes('admtv-p') && h.includes('st-own') && h.includes(' eq"'), '스킬 트리: 방사형 · 액티브/패시브 탭 · 열린 칸 · 장착');
ok(!/data-a="(atbuy|ptbuy|ptref|atref|ateq|atvar)"/.test(h), '보기만: 찍기 · 되돌리기 · 장착 단추 없음');
G.tsel = { a: askills[1] }; h = tab('run'); ok(h.includes('trd-info') && h.includes('has-sel') && !/data-a="(atbuy|ateq)"/.test(h), '노드 설명은 보이고 단추는 없음');
G.admTv = 'p'; G.tsel = { p: pks[0] }; h = tab('run'); ok(h.includes('tn-keystone st-ks') && h.includes('얻은 큰 각인') && !/data-a="(ptbuy|ptref|kspick)"/.test(h), '패시브: 큰 각인 · 보기만');
G.tsel = { p: pnot[5] }; h = tab('run'); ok(h.includes('관리자 보기입니다') && !/data-a="(ptbuy|ptref)"/.test(h), '찍지 않은 노드: 관리자 보기 안내 · 단추 없음');
ok(G.trdRO === 0 && G.run === null, 'G.trdRO 원래대로 · G.run 그대로');
for (const t of ['summary', 'gear', 'growth', 'battle']) { G.rdTab = t; h = tab('run'); ok(h.includes('이 판의 원본 기록 보기'), t + ' 탭 · 원본 기록 접는 칸'); }
G.rfOpen = '0:0'; G.rdTab = 'battle'; h = tab('run'); ok(h.includes('adm-errrow') && h.includes('data-a="runactpage"'), '행동 기록: 오류 줄 강조 · 쪽 넘기기');
G.rfOpen = null; h = tab('run'); ok(h.includes('판 고르기') && h.includes('data-a="runfilter"') && (h.match(/data-a="runopen"/g) || []).length === 4, '판 고르기 목록');
/* 4 통계 */
G.admPc = 'monk'; G.admSv = 'a'; G.tsel = {}; h = tab('stat');
ok(h.includes('직업별 1챕터 돌파') && /수도승<\/th><td>3<\/td><td>1<\/td><td>1<\/td><td>1<\/td><td><b>50%/.test(h), '1챕터 돌파율(수도승 판 3 · 돌파 1 · 실패 1 · 진행 1 · 50%)');
ok(h.includes('1챕터 · 6층') && h.includes('쓰러진 횟수'), '쓰러진 곳 막대');
ok(h.includes('굶주린 순례자') && h.includes('납골당 주교') && h.includes(R("BOSSES[chData(1).boss].n")), '강적 · 보스 승률 표');
ok(h.includes('1시간 30분'), '돌파한 판 평균 시간');
ok(h.includes('trd-svg') && /class="tn [^"]*prb4/.test(h) && h.includes('고른 판 100%') && h.includes('adm-rleg') && !/data-a="(atbuy|ateq)"/.test(h), '통계 트리: 고른 판 비율 칸 · 숫자 · 범례');
G.admSv = 'p'; h = tab('stat'); ok(/class="tn tn-keystone[^"]*prb/.test(h) && h.includes('% · 아무도 안 고름'), '통계 패시브 트리 · 큰 각인 비율');
G.admSF = { b: 'warden' }; h = tab('stat'); ok(h.includes('고른 판 1개'), '거르기: 직업');
G.admSF = { ch: 2 }; h = tab('stat'); ok(h.includes('고른 판 1개'), '거르기: 챕터');
G.admSF = { v: '0.7.0' }; h = tab('stat'); ok(h.includes('고른 판 0개'), '거르기: 판');
G.admSF = {}; h = tab('stat'); ok(h.includes('옛 시험 질문지 집계') && h.includes('두 축 이상 다른 상황') && h.includes('0.6 캐릭터'), '옛 집계 · 0.6 요약 접는 칸');
/* 5 도구 */
G.site = true; G.owner = true; G.superAdmin = true; G.sb = { rpc: async () => ({ data: 1, error: null }) };
h = tab('tools');
ok(['data-a="import"', 'data-a="dashjson"', 'data-a="notescsv"', 'data-a="runscsv"', 'data-a="deltick"', 'data-a="rundeltick"', '의견 모아 보기', '테스터별 진행'].every(s => h.includes(s)), '도구: 넣기 · 내려받기 · 지우기 · 의견');
ok((h.match(/class="sm gold"/g) || []).length === 1, '도구 탭의 금색 단추는 하나');
for (const k of ['prob', 'live', 'run', 'stat']) { const x = tab(k); const m = x.slice(x.indexOf('role="tabpanel"')); ok((m.match(/class="sm gold"/g) || []).length <= 1, k + ' 탭의 금색 단추는 하나 이하'); }
ok(JSON.stringify(G.dashRaw) === before, '보기만으로 기록이 바뀌지 않음');
/* 지금 하는 판 새로 고침(저장소에서 바로 읽을 때): 판 문서 + 지금 하는 판의 마지막 조각만 */
(async () => {
  G.site = false; const reads = [];
  const meta = Object.assign({}, live, { acts: undefined, updatedAt: Date.now() - MIN, chunks: 2, actsN: 260 }); delete meta.acts;
  G.db = { collection: p => ({ get: async () => { reads.push('C ' + p); return { docs: p.startsWith('playtest/u-alpha/') ? [{ id: live.id, data: () => JSON.parse(JSON.stringify(meta)) }] : [] }; } }), doc: p => ({ get: async () => { reads.push('D ' + p); return { exists: true, data: () => ({ i: 1, a: [act(1, 7, 'dodge', 9)] }) }; } }) };
  G.rfOpen = '0:0'; G.liveBusy = 0; await ctx.liveRefresh();
  ok(reads.filter(x => x.startsWith('D ')).length === 1 && reads.some(x => /\/acts\/c001$/.test(x)), '마지막 조각 하나만 읽음: ' + reads.join(' | '));
  ok(G.dashRaw[0].runs[0].acts.slice(-1)[0].a === 'dodge' && G.rfOpen === '0:0', '새 행동이 붙고 고른 판이 그대로');
  ok(tab('live').includes(R("dashActionName('dodge')")), '지금 하는 판에 새 마지막 행동');
  console.log('admin-dash-check: ' + n + '개 통과');
})().catch(e => { console.error(e); process.exitCode = 1; });
