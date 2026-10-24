'use strict';
/* 0.8.0 M6-1 장비 점검 (설계 nrk-private M6-장비-설계 3-2 · 3-6 · 5-5 · 9절, 만든 사람 확정 10월 20일). 실행: node tools/item-check.js [--v]
   접사 전부(data/affixes.js) + 고유 105(data/uniques.js):
   금지선 ①(자원 환급 순환) ②(추가 행동 · 공격 연쇄: 추가는 chain 0) ③(배수 곱하기: % 는 maxOf — 엔진에서 확인) ④(대가 kind perm · during · upfront만)
   접사 금지(확률 · 새 상태 · 두 수치 · 조건 둘 · "다음 n차례") · 값 띠(단 범위 × 트리거표, 한 접사 8~17 · 축 16~20 × 챕터 배율, 짝 단은 5~) · 고유 고정 접사의 등급 띠
   가독성(40자 · 수치 1 · 조건 ≤1, 부록 A 대상 · 부록 B 조건 어휘) · 사어(마나 · 캔트립 · 쿨타임, "주문"은 마검사 밖에서만 오류) */
const S = require('./item-score.js'); const { AFFIX, UNIQUE, IV } = S;
const V = process.argv.includes('--v');
const err = [], note = []; let n = 0; const ok = (c, m) => { n++; if (!c) err.push(m); };
/* 부록 B 조건 어휘(화면에 보이는 것만) + 직업 설계지의 판정 어휘 */
const COND = ['태세가 켜져 있으면', '보호막이 있으면', '방어 중', '생명력 절반 아래면', '전열 적이 둘 이상이면', '정예 · 강적 · 보스에게', '후열 적에게', '무너진 적에게', '같은 적을 이어 치면', '첫 라운드', '추적 3겹인 적에게', '둔화된 적이',
  /^(출혈|화상|둔화|중독|혈염) 걸린 적에게/, /^(화상|중독) 걸린 적이/, /^기가 \d 이상이면/, '수비 태세 중', '공격 태세 중', '연계 빠른 행동 뒤', /^생명력 \d+% 이하에서/]; // M7-3: 플라스크 궁지(확정본 문장)
/* 발동형의 행동(3-2 꼴 3: [행동]하면 [효과] N) */
const TRIG = ['기본 공격이 맞으면', '기본 공격이', '강공격이', '베기 스킬이', '주문 스킬이', '여럿을 치는 스킬이', '흘려 내면', '방어 중 맞으면', '플라스크를 마시면', '마시면', '대응에 성공하면', '교대하면', '수비 태세를 켜면', '자세를 잡으면', '되받을 때', '되받으면', '몸 빼기로 피하면', '스킬로 쓰러뜨리면', '라운드마다', '맞으면', '마신 뒤']; // M7-3: 플라스크 객기
/* 부록 A 대상 어휘 + 직업 접사의 대상(그 직업 설계지 이름: 베기 · 주문 · 되받기 · 터뜨리기 · 열충격 · 마력 화살 · 마력탄 · 얼어붙음 · 칼에 실은 상태 · 방어 보호막) */
const TGT = ['기본 공격 피해', '강공격 피해', '스킬 피해', '여럿을 치는 스킬 피해', '주는 피해', '받는 피해', '강공격 붕괴', '스킬 붕괴', '최대 생명력', '최대 스태미나', '흘리기 스태미나', '강공격 스태미나', '보호막', '생명력 플라스크 회복', '플라스크 칸', '전투 시작 유산', '스태미나', '흘리기로 줄이는 피해', '기본 공격', '스킬', '유산',
  /^(출혈|화상|둔화|중독|취약) /, /^(혈인|염검|마갑|성벽|파쇄|전열 장악|철권|부동|혈도|독사|격발|그림자|저격|연사|기동|불꽃|서리|마력|혈염|죄인의 피|유산의 불|공성추|기둥 파쇄|용맹의 투지|반탄|역혈|파혈|독화|암영|잔영|명궁|유격|잠복|빙염|정적|마염) 스킬 피해/, /^(광역|출혈|화상|중독|둔화|보호막|붕괴|기본 공격 연동) 스킬 유산/,
  '베기', '베기 스킬 붕괴', '주문', '주문 스킬 피해', '주문 스킬 붕괴', '칼에 실은 상태', '방어 보호막', '되받기 피해', '붕괴', '▶ 공격', '터뜨리기', '터뜨리기 피해', '터뜨리기 붕괴', '그 적 중독', '그 적 붕괴', '그 적에게', '열충격 피해', '열충격 붕괴', '마력탄이 거는 상태', '마력 화살', '얼어붙음 붕괴', '다음 기본 공격', '해로운 상태 하나', '강공격', '여럿을 치는 스킬 붕괴', '다음 해로운 상태', '회복', '다음 공격 피해', '전투의 첫 스킬은 유산']; // M7-3 장비 보충(확정본 문장)
const KWNEW = ['확률', '다음 차례', '차례 안에', '%의 확률'];
const DEAD = ['마나', '캔트립', '쿨타임'];
const hit = (L, s) => { for (const x of L) { if (typeof x === 'string' ? s.startsWith(x) : x.test(s)) return typeof x === 'string' ? x : s.match(x)[0]; } return null; };
const paren = s => s.replace(/\([^)]*\)/g, '');
/* ---- 접사 ---- */
const cnt = { all: 0 }; let off = 0;
for (const id in AFFIX) {
  const A = AFFIX[id]; cnt[A.cls] = (cnt[A.cls] || 0) + (A.ax ? 0 : 1); if (A.ax) cnt['축'] = (cnt['축'] || 0) + 1;
  // 데이터 꼴(3-3)
  ok(Array.isArray(A.n) && A.n.length === 3 && A.back && A.slot.length && A.fam && A.fx && A.fx.k && A.txt && Array.isArray(A.tags) && A.vs, id + ': 3-3 꼴(이름 조각 셋 · 뒤 조각 · 슬롯 · 묶음 · 효과 · 문장 · 꼬리표 · 점수 꼴)');
  ok(A.fix ? !A.txt.includes('{v}') : A.txt.includes('{v}'), id + ': 값 자리 {v}(고정 접사는 문장에 박힘)');
  ok(A.slot.every(s => ['weapon', 'armor', 'gloves', 'amulet', 'ring', 'flask'].includes(s)), id + ': 슬롯');
  ok(!A.ax || (A.fam === 'axis' && A.axis), id + ': 축 접사는 fam axis · 축 이름');
  // 사어 · 주문
  const all = A.txt + ' ' + A.n.join(' ') + ' ' + A.back;
  ok(!DEAD.some(w => all.includes(w)), id + ': 사어(마나 · 캔트립 · 쿨타임)');
  ok(A.cls === 'spellblade' || !all.includes('주문'), id + ': "주문"은 마검사 문장에서만');
  // 가독성: 40자 · 수치 1 · 조건 ≤ 1 · 대상 어휘
  const tmax = Math.max(...Object.values(A.tier).map(r => r[1]).concat([1])), shown = A.txt.replace('{v}', String(tmax));
  ok(shown.length <= 40, id + ': 40자 이하(' + shown.length + ')');
  let rest = paren(A.txt).trim(); const c = hit(COND, rest); if (c) rest = rest.slice(c.length).trim().replace(/^(에게|면)\s*/, '');
  ok(!hit(COND, rest), id + ': 조건은 하나까지');
  const tr = hit(TRIG, rest); if (tr) rest = rest.slice(tr.length).trim();
  ok(!!hit(TGT, rest), id + ': 대상 어휘(부록 A) — "' + rest + '"');
  const nums = (paren(A.txt).replace(/^기가 \d 이상이면/, '').replace(/^생명력 \d+% 이하에서/, '').replace(/추적 3겹/, '').match(/\{v\}|\d+|하나/g) || []).length; ok(nums === 1 || (A.fix && !A.txt.includes('{v}') && nums === 0), id + ': 수치 하나(' + nums + ')'); /* M7-3: 숫자 없는 고정 접사(플라스크 막기)는 0 */
  ok(!KWNEW.some(w => A.txt.includes(w)), id + ': 확률 · "다음 n차례" 금지');
  // 금지선 ① 자원 환급 순환: 자원을 주는 접사의 트리거가 같은 자원을 쓰는 행동이면 오류
  const SPEND = { stam: ['heavy', 'dodge', 'guard', 'parryUse', 'heavyHit'], ys: ['skillUse'] }, res = A.fx.k === 'stam' ? 'stam' : ['ysStart', 'killRefund'].includes(A.fx.k) ? 'ys' : null;
  ok(!res || !SPEND[res].includes(A.fx.on), id + ': 금지선 ① 쓴 자원을 그 행동으로 돌려받음');
  // 금지선 ② 접사는 추가 행동 · 추가 공격을 만들지 않는다(규칙은 고유의 몫, 3-2 규칙 5)
  ok(!['extraAct', 'extraHit'].includes(A.fx.k), id + ': 금지선 ② 접사의 추가 행동 · 공격');
  // 금지선 ③ 피해 · 받는 피해 % 는 maxOf 묶음(dmgP · inR)으로만
  ok(!(A.vs.k === 'pct' && !['dmgP', 'nextBasic', 'flaskWrath'].includes(A.fx.k)) && !(A.vs.k === 'inr' && !['inR', 'guardRed'].includes(A.fx.k)), id + ': 금지선 ③ % 는 maxOf 묶음으로');
  // 값 띠(5-5): 단마다 범위 × 트리거표
  if (A.pool === false) { off++; note.push(id + ': 뽑기 풀 밖(어느 단에서도 띠에 못 듦, V ' + S.vAf(id, 1, 1).toFixed(1) + ') — 측정 대기'); continue; }
  for (const t of [1, 2, 3]) { const r = A.tier[t]; if (!r) continue; const m = S.chm(t), lo = S.vAf(id, r[0], t), hi = S.vAf(id, r[1], t), B = A.ax ? IV.band.axis : IV.band.one, pair = A.pair && A.pair.includes(t);
    ok(r[0] <= r[1], id + ' T' + t + ': 범위 순서');
    if (pair) ok(lo >= IV.band.pair * m - 1e-9 && hi <= B[0] * m + 1e-9, id + ' T' + t + ': 짝 단 V ' + lo.toFixed(1) + '~' + hi.toFixed(1) + ' (≥ ' + (IV.band.pair * m).toFixed(1) + ')');
    else ok(lo >= B[0] * m - 1e-9 && hi <= B[1] * m + 1e-9, id + ' T' + t + ': 값 띠 V ' + lo.toFixed(1) + '~' + hi.toFixed(1) + ' (' + (B[0] * m).toFixed(1) + '~' + (B[1] * m).toFixed(1) + ')'); }
}
/* 직업 접사 수(3-5): 직업마다 20~30, 공용 40 안팎 */
for (const c of ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist']) { const k = Object.values(AFFIX).filter(a => a.cls === c).length; ok(k >= 20 && k <= 30, c + ': 직업 접사 20~30(' + k + ')'); }
ok(cnt.all >= 38 && cnt.all <= 57, '공용 접사 40 안팎(' + cnt.all + ', 꼬리표 갈래 포함)'); // M7-3: 플라스크 접사 셋(만든 사람 확정 10월 22일)으로 52 → 55
ok(!AFFIX.flaskFast && !Object.values(AFFIX).some(a => /차례를 끝내지/.test(a.txt)), 'flaskFast는 접사에 없다(공용 고유 성급한 플라스크로)');
/* ---- 고유 ---- */
const KINDS = ['cost', 'tgt', 'cond', 'swap', 'conv', 'cnt'];
for (const id in UNIQUE) {
  const U = UNIQUE[id]; const txt = U.n + ' ' + U.rule.txt + ' ' + U.cost.txt + ' ' + U.lore;
  ok(['perm', 'during', 'upfront'].includes(U.cost.kind) && !U.cost.after, id + ': 금지선 ④ 대가는 상시 · 쓰는 동안 · 선불만');
  ok(KINDS.includes(U.rule.k), id + ': 규칙 어휘 6종(4-3)');
  ok(!DEAD.some(w => txt.includes(w)), id + ': 사어');
  ok(U.cls === 'spellblade' || !txt.includes('주문'), id + ': "주문"은 마검사 문장에서만');
  ok(!/확률/.test(U.rule.txt), id + ': 확률 없음');
  // ① 규칙이 주는 자원(스태미나 · 유산 · 기)을 그 자원을 쓰는 행동이 부르면 오류
  const gain = (U.rule.txt.match(/(스태미나|유산|기) \+/) || [])[1]; ok(!gain || !new RegExp(gain + '(를|을) (쓰|써)').test(U.rule.txt), id + ': 금지선 ① 자원 환급 순환');
  // ② 추가 타격 · 번지는 피해는 chain 0
  if (/두 번|한 번 더|한 발 더|곁의 적|후열 적 하나에게도|후열 적 둘|곁의 적 붕괴/.test(U.rule.txt)) ok(U.chain === 0, id + ': 금지선 ② 추가 타격 · 번지는 피해는 chain 0');
  // 고정 접사(4-1): 슬롯 · 직업이 맞고, 영웅은 축 접사, V접사가 등급 띠 안
  ok(U.af.length === 2 && U.af.every(([a, v]) => AFFIX[a] && AFFIX[a].slot.includes(U.slot) && (AFFIX[a].cls === 'all' || AFFIX[a].cls === U.cls) && AFFIX[a].tier[U.ch] && v >= S.rngOf(a, U.ch, U.cls === 'all' ? null : U.cls)[0] && v <= S.rngOf(a, U.ch, U.cls === 'all' ? null : U.cls)[1]), id + ': 고정 접사 둘(슬롯 · 직업 · 그 단 범위 안)');
  ok(U.g !== 'h' || (U.ax && AFFIX[U.ax[0]] && AFFIX[U.ax[0]].ax && AFFIX[U.ax[0]].axis === U.axis), id + ': 영웅 고유의 빌드 축 접사');
  ok(new Set(U.af.map(([a]) => AFFIX[a].fam)).size === U.af.length, id + ': 같은 묶음 둘 금지');
  const u = S.vUnique(id); ok(u.af >= u.band.af[0] - 1e-9 && u.af <= u.band.af[1] + 1e-9, id + ': 고정 접사 V ' + u.af.toFixed(1) + ' 등급 띠(' + u.band.af.map(x => x.toFixed(0)).join('~') + ')');
  if (!(u.rule >= u.band.rule[0] && u.rule <= u.band.rule[1])) note.push(id + ': V규칙 사전 추정 ' + u.rule.toFixed(1) + ' (띠 ' + u.band.rule.join('~') + ', M6-3 측정 대상)');
}
const cc = {}; for (const id in UNIQUE) { const c = UNIQUE[id].cls; cc[c] = (cc[c] || 0) + 1; }
ok(Object.keys(UNIQUE).length === 105 && ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'].every(c => cc[c] >= 12 && cc[c] <= 18) && cc.all === 15, '고유 105 = 직업마다 12~18(15) + 공용 15');
ok(UNIQUE.cm_fastflask && /차례를 끝내지 않는다/.test(UNIQUE.cm_fastflask.rule.txt), '성급한 플라스크: 공용 희귀 고유');
/* ---- 엔진: maxOf(금지선 ③) · 두 반지 같은 묶음 큰 쪽만(10절 결정 1) ---- */
{
  process.env.DGDIR = process.env.DGDIR || '.'; const D = require('./dgqa.js'), E = D.G0, R_ = D.run_; R_('GEAR8.on = true');
  const it = (base, af) => E.mkItem8({ base, g: 'r', ch: 1, af });
  const g = R_('g8Collect')([it('ring', [['vsBig', 30]]), it('seal', [['vsBig', 40]])]); ok(g.af.length === 1 && g.af[0].v === 40, '두 반지 같은 묶음: 큰 쪽(40)만 든다');
  const P = R_('g8AfFx')([{ id: 'vsBig', v: 30 }, { id: 'lowHpDmg', v: 40 }]), Mx = R_('g8MaxFx')(P, []);
  const p = { hp: 10, hpMax: 100 }, e = { elite: 1, s: {} }; ok(Math.abs(Mx.hitP({}, p, e, {}, { id: 'basic' }) - 0.4) < 1e-9, '주는 피해 %: 가장 큰 하나(40%)만, 더하거나 곱하지 않는다');
  const Mx2 = R_('g8MaxFx')(P, [{ pctUp: () => 0.5 }]); ok(Math.abs(Mx2.hitP({}, p, e, {}, { id: 'basic' }) - 0.5) < 1e-9, '고유 규칙 % 와 접사 % 도 가장 큰 하나만');
  const Q = R_('g8AfFx')([{ id: 'wardRed', v: 20 }, { id: 'lowHpRed', v: 30 }]), Mq = R_('g8MaxFx')(Q, []); ok(Math.abs(Mq.inP({}, { hp: 10, hpMax: 100, ward: 5 }, {}) - 0.3) < 1e-9, '받는 피해 줄임 %: 가장 큰 하나만');
  for (const id in AFFIX) { const F = R_('g8AfFx')([{ id, v: (AFFIX[id].tier[1] || AFFIX[id].tier[2] || AFFIX[id].tier[3] || [1])[0] }]); const has = F.dmg.length + F.inR.length + Object.keys(F.fx).filter(k => !['onAct', 'onSkill'].includes(k)).length; ok(has > 0 || ['guard', 'defOn', 'stanceSet'].includes(AFFIX[id].fx.on), id + ': 엔진 효과로 엮인다(' + AFFIX[id].fx.k + ')'); }
}
console.log('item-check: ' + n + '개 점검 · 위반 ' + err.length + ' · 접사 ' + Object.keys(AFFIX).length + '(공용 ' + cnt.all + ' · 직업 ' + ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'].map(c => cnt[c]).join('/') + ' · 축 ' + cnt['축'] + ', 풀 밖 ' + off + ') · 고유 ' + Object.keys(UNIQUE).length);
for (const m of err) console.log('  위반: ' + m);
if (V) for (const m of note) console.log('  알림: ' + m); else if (note.length) console.log('  알림 ' + note.length + '개(--v로 보기): 풀 밖 접사 · 고유 V규칙 사전 추정 띠 밖(M6-3 측정 대상)');
if (err.length) process.exit(1);
