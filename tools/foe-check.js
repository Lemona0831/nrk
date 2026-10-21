'use strict';
/* 적 문법 점검 (0.8.0 A0, 1막 재설계 ① 적 문법 엔진 · data/foes.js · js/30-enemy-ai.js)
   1. 정의: 등급별 패턴 수(2~4, 보스는 단계마다) · 예고 문장 · 대답 태그 · 기록 문장(log.see · log.down) 빠짐 · 무리마다 "누구부터"(SQUAD_ASK)
   2. 문법 ①: 예고한 행동 = 실행한 행동(끊기 · 무너짐 · 단계 전환으로 취소된 것만 예외). 전투 N번(기본 1000)에서 teleMis 0이어야 한다
   3. 문법 ②: 대답할 수 없는 예고 0. 문법을 아직 켜지 않은 챕터(FOE_GRAMMAR)는 teleVoid 기록을, 켠 챕터는 teleSkip(바꿔 고름)을 센다
   4. 갑옷 · 방패 단위 시험, 챕터 장치 틀(가짜 장치를 잠깐 꽂아 훅 다섯 · 칩 · 도움말이 도는지 보고 뺀다)
   쓰기: node tools/foe-check.js [--fights 1000] [--ch 1]. 위반이 있으면 표를 찍고 1로 끝난다 */
process.env.DGDIR = process.env.DGDIR || '.';
const H = require('./uqtest/_h.js'); const { E, R_, D } = H;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NF = +arg('--fights', 1000), CH = +arg('--ch', 1);
const FOES = R_('FOES'), TELE_T = R_('TELE_T'), TELE_WAIT = R_('TELE_WAIT'), SQUADS = R_('SQUADS'), SQUAD_ASK = R_('SQUAD_ASK'), FOE_GRAMMAR = R_('FOE_GRAMMAR');
const V = []; const bad = (kind, id, what) => V.push({ kind, id, what });

/* 1. 정의 */
const grade = {};
for (const id in FOES) {
  const F = FOES[id]; if ((F.ch || 1) !== CH) continue;
  const pats = Array.isArray(F.pat) ? [F.pat] : Object.values(F.pat || {});
  (grade[F.grade] = grade[F.grade] || []).push(id + ' ' + pats.map(p => p.length).join('/'));
  for (const p of pats) if (F.grade !== 'add' && (p.length < 2 || p.length > 4)) bad('패턴 수', id, p.length + '개(2~4)');
  for (const k of new Set(pats.flat())) {
    if (!(F.tele && F.tele[k]) && !TELE_T[k]) bad('예고 문장', id, k);
    const A = F.ans && F.ans[k]; if (!Array.isArray(A) || (!A.length && k !== 'none' && !TELE_WAIT.includes(k))) bad('대답 태그', id, k);
  }
  if (F.grade !== 'add') for (const f of ['see', 'down']) if (!(F.log && F.log[f])) bad('기록 문장', id, 'log.' + f);
}
for (const s of SQUADS) if ((s.ch || 1) === CH && !SQUAD_ASK[s.id]) bad('누구부터', s.id, 'SQUAD_ASK 없음');

/* 2 · 3. 전투 N번 */
const seen = new WeakMap(); let fights = 0, last = null; const cnt = { teleMis: {}, teleVoid: {}, teleSkip: {} }; let eact = 0;
const scan = b => { if (!b || !b.rec) return; let i = seen.get(b) || 0; for (; i < b.rec.length; i++) { const r = b.rec[i]; if (r.k === 'eact') eact++; if (cnt[r.k]) { const key = (r.foe || r.role) + ' ' + (r.from || r.i) + (r.to ? '→' + r.to : '') + (r.tags != null ? ' (쓸 수 있던 대답: ' + r.tags + ')' : ''); cnt[r.k][key] = (cnt[r.k][key] || 0) + 1; } } seen.set(b, i); };
D.OPT.onTurn = G => { const b = G.b; if (b !== last) { if (last) scan(last); last = b; fights++; } }; D.OPT.chapters = 1; if (CH > 1) process.env.DG_FROM = String(CH);
const CLS = ['spellblade', 'warden', 'monk', 'assassin', 'hunter', 'elementalist'], PK = ['careful', 'casual', 'expert', 'basic'];
for (let s = 0; fights < NF && s < 400; s++) for (const c of CLS) { if (fights >= NF) break; try { D.playChar(PK[s % PK.length], c, 5000 + 13 * s); } catch (e) { bad('판 예외', c, String(e && e.message).slice(0, 80)); } }
if (last) scan(last); D.OPT.onTurn = null;
const sum = o => Object.values(o).reduce((a, x) => a + x, 0);
for (const k in cnt.teleMis) bad('문법 ①', k, cnt.teleMis[k] + '번');
for (const k in cnt.teleVoid) bad('문법 ②', k, cnt.teleVoid[k] + '번');

/* 4-1. 갑옷 · 방패 */
const T = []; const t = (c, m) => { if (!c) T.push(m); };
{
  const f = H.fight('warden', { en: ['bruiser'], setup: (run, es) => { es[0].armor = 3; es[0].shield = 0; es[0].shieldMax = 0; } }); const b = f.b, e = f.es[0]; b.cur = null;
  let h0 = e.hp; E.hurtEnemy(b, e, 12, { single: 1 }); t(Math.abs(h0 - e.hp - 9) < 1e-6, '갑옷 3: 12 → 9가 아니라 ' + (h0 - e.hp));
  h0 = e.hp; E.hurtEnemy(b, e, 3, { single: 1 }); t(Math.abs(h0 - e.hp - 1) < 1e-6, '갑옷 3: 3 → 1(1/3)이 아니라 ' + (h0 - e.hp));
  h0 = e.hp; E.hurtEnemy(b, e, 6, { dot: 1 }); t(Math.abs(h0 - e.hp - 6) < 1e-6, '지속 피해는 갑옷 무시: 6이 아니라 ' + (h0 - e.hp));
  t(R_('foeASHtml')(b, e).includes('farm'), '갑옷 칩이 없다');
  e.brk = e.brkMax - 0.5; E.addBreak(b, e, 50); t(e.armorOff === 1, '무너졌는데 갑옷이 그대로');
  h0 = e.hp; E.hurtEnemy(b, e, 12, { single: 1 }); t(h0 - e.hp > 11.9, '벗겨진 뒤에도 갑옷이 깎는다: ' + (h0 - e.hp));
}
{
  const f = H.fight('warden', { en: ['bruiser'], setup: (run, es) => { es[0].armor = 0; es[0].shield = es[0].shieldMax = 3; } }); const b = f.b, e = f.es[0]; b.cur = null;
  b.actN = 100; let h0 = e.hp; E.hurtEnemy(b, e, 10, { single: 1 }); t(e.hp === h0 && e.shield === 2, '방패: 한 적 공격을 막고 한 겹(' + e.shield + ')');
  E.hurtEnemy(b, e, 10, { single: 1 }); t(e.hp === h0 && e.shield === 2, '방패: 막은 행동의 둘째 타격도 막고 겹은 그대로(' + e.shield + ')');
  b.actN = 101; h0 = e.hp; E.hurtEnemy(b, e, 10, { aoe: 1 }); t(e.hp < h0 && e.shield === 2, '방패: 광역은 지나간다');
  h0 = e.hp; E.hurtEnemy(b, e, 5, { dot: 1 }); t(e.hp < h0 && e.shield === 2, '방패: 지속 피해는 지나간다');
  b.actN = 102; b.cur = { id: 'heavy' }; E.hurtEnemy(b, e, 10, { single: 1 }); b.cur = null; t(e.shield === 0, '방패: 강공격은 두 겹(' + e.shield + ')');
  t(R_('foeASHtml')(b, e).includes('fshd'), '방패 칸이 없다');
  const f2 = H.fight('warden', { en: ['bruiser'] }); t(R_('foeASHtml')(f2.b, f2.es[0]) === '', '1챕터 적에게 갑옷 · 방패 칩이 보인다');
}
/* 4-2. 챕터 장치 틀 */
const CHD = R_('CH_DEVICE'); const fired = {}; const hooks = ['onRoomStart', 'onRoundEnd', 'onFoeBreak', 'onFoeDown', 'onRoomEnd'];
t(!CHD[1] && !CHD[2] && !CHD[3], '게임 데이터에 챕터 장치가 이미 꽂혀 있다(A1~A3 전에는 비어 있어야 한다)');
CHD[1] = { id: 'test', n: '시험 장치', help: '시험용 도움말 한 줄', chip: b => 'T' + (b.tick || 0) }; for (const h of hooks) CHD[1][h] = () => { fired[h] = (fired[h] || 0) + 1; };
let chip = '', help = null; D.OPT.onTurn = G => { if (!chip) chip = R_('chDevChip')(G.b); if (help == null) { const g = R_('G'); const gb = g.b; g.b = G.b; help = R_('infoHtml') ? String(R_('infoHtml')('chdev') || '') : ''; g.b = gb; } };
try { D.playChar('careful', 'warden', 5000); } catch (e) { T.push('가짜 장치 판 예외: ' + e.message); } D.OPT.onTurn = null;
delete CHD[1];
for (const h of hooks) t(fired[h] > 0, '장치 훅이 불리지 않았다: ' + h);
t(chip.includes('시험 장치'), '장치 칩이 그려지지 않았다'); t(help.includes('시험용 도움말 한 줄'), '장치 도움말 한 줄이 보이지 않는다');
t(R_('chDevOf')({ ctx: { ch: 1 } }) === null, '가짜 장치를 뺀 뒤에도 남아 있다');

/* 보고 */
console.log('foe-check (' + CH + '챕터): 적 ' + Object.keys(FOES).filter(id => (FOES[id].ch || 1) === CH).length + ' · 무리 ' + SQUADS.filter(s => (s.ch || 1) === CH).length + ' · 전투 ' + fights + ' · 적 행동 ' + eact);
for (const g in grade) console.log('  ' + g + ' 패턴 수: ' + grade[g].join(', '));
console.log('  문법 ① 예고 ≠ 실행: ' + sum(cnt.teleMis) + ' · 문법 ② 대답 없는 예고(기록만): ' + sum(cnt.teleVoid) + ' · 바꿔 고름: ' + sum(cnt.teleSkip) + (FOE_GRAMMAR[CH] ? '' : ' (이 챕터는 문법 ②를 아직 켜지 않음 — A1)'));
console.log('  갑옷 · 방패 · 장치 시험: 실패 ' + T.length + ' · 장치 훅 ' + hooks.map(h => h + ' ' + (fired[h] || 0)).join(' · '));
for (const m of T) console.log('  실패: ' + m);
if (V.length) { console.log('  위반 ' + V.length + ':'); console.log('  | 종류 | 대상 | 내용 |'); for (const v of V) console.log('  | ' + v.kind + ' | ' + v.id + ' | ' + v.what + ' |'); }
if (V.length || T.length) process.exit(1);
