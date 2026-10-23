// 기본 피해 성장과 선택한 자원 추가 피해 성장은 따로 계산한다. 지속·보호막 피해에는 중복 적용하지 않는다.
const SKILL_STAT_PCT = 4;
const FOCUS_STAT_PCT = 2;
// 상태를 준비해 소모하는 피해. 지속 피해와 화상 소모의 dotMul은 따로 유지한다.
const TRIGGER_STAT_PCT = 3;
function triggerDamageMul(p) { return 1 + stat(p, 'int') * TRIGGER_STAT_PCT / 100; }
function skillGrowthStat(s) { return s.kind === 'spell' || /^(e_|e5_|v_)/.test(s.id) ? 'int' : /^(a_|h_)/.test(s.id) ? 'dex' : 'str'; }
function skillBaseDamage(p, s, n) {
  if (!n || s.id === 'tut_bash' || p.build === 'novice') return n || 0;
  const k=skillGrowthStat(s), weapon=k==='int'?0:Math.max(0,gearOf(p).wpn-START_GEAR.wpn)*0.02;
  const x=p.build==='spellblade'&&s.kind&&typeof fxVal==='function'?fxVal(p,'sbCross',0,(a,v)=>a+v):0; // 10월 17일 보완 2 양손의 마검: 베기는 지능, 주문은 힘의 x만큼 더한다
  return n*(1+(stat(p,k)+(x?x*stat(p,k==='int'?'str':'int'):0))*SKILL_STAT_PCT/100+weapon);
}
function skillResourceGrows(s, e) {
  return /^m_/.test(s.id) && ['kiBurst', 'kiPer'].includes(e.k)
    || /^h_/.test(s.id) && e.k === 'focusBurst'
    || /^c_/.test(s.id) && (e.k === 'perDmg' && ['burden', 'clean'].includes(e.of) || e.k === 'cleanse' && e.offer && !!e.dmg);
}
function skillResourceDamage(p, s, e, n) { return n * (skillResourceGrows(s, e) ? 1 + (/^h_/.test(s.id) ? stat(p, 'dex') * FOCUS_STAT_PCT / 100 : stat(p, 'str') * .01) : 1); }
function skillDamageHint(p, s) {
  const dm=s.fx.find(e=>e.k==='dmg'), out=[];
  if(dm) out.push('현재 기본 피해 ' + r1(skillBaseDamage(p,s,dm.n)) + ((s.hits||1)>1?' × '+s.hits+'타':''));
  if(s.fx.some(e=>e.k==='burst')) out.push('현재 독 격발 배율 '+r1(triggerDamageMul(p))+'배 (지능)');
  if(p.build==='elementalist' && s.tgt!=='self') out.push('현재 열충격 배율 '+r1(triggerDamageMul(p))+'배 (지능)');
  for(const e of s.fx.filter(e=>skillResourceGrows(s,e))) {
    const label=e.k==='focusBurst'?'추적':e.k==='kiBurst'||e.k==='kiPer'?'기':e.k==='cleanse'?'바친 상태':e.of==='burden'?'짐':'앞서 정화·바친 상태';
    out.push(label+(e.k==='focusBurst'?' 1겹당':' 1당')+' 추가 피해 '+r1(skillResourceDamage(p,s,e,e.k==='cleanse'?e.dmg:e.k==='focusBurst'?e.n:e.per))+(e.k==='kiPer'&&(s.hits||1)>1?' (타격마다)':''));
  }
  return out.length ? out.join(' · ') + ' · 피해 증감 적용 전' : '';
}
// 보호막 추가 피해와 소모량: 설명·미리보기·전투가 같은 계산을 사용한다.
function wardDamageInfo(e, ward) {
  const available = Math.max(0, Number(ward) || 0);
  const take = e.drainAll ? available : e.spend ? Math.min(available * e.spend, (e.cap ?? Infinity) / e.per) : 0;
  return { take, bonus: Math.min(e.cap ?? Infinity, (e.spend ? take : available) * e.per) };
}
/* 0.6a.2 개편: 스킬 점수제 v0와 설명 문장 생성기 (docs/기록/0.6a.2-암살자-스킬.md 2절)
   data/skills.js의 스킬 한 줄에서 화면 설명 문장과 점수를 같은 데이터로 만든다. 게임(설명 창, 트리)과 도구(tools/skillscore.js)가 함께 쓴다.
   data 폴더의 예외: 값이 아니라 문장·점수 계산이지만, 게임과 도구가 한 벌만 쓰도록 여기 둔다. 기준값(SKK)은 모두 가설이다.
   10월 3일: 충전 대신 재사용 대기(cd)로 바꾸며 쓰는 횟수(skUses)를 대기와 갈래 규칙으로 계산한다. 3차 결정으로 갈래 규칙을 없애 지금은 쿨타임으로만 센다(SKK.haste는 남겨 둔다). */
const SKK = {
  B: 9.5,                       // 기본 공격 값 (무기 피해 8 + 붕괴 10)
  T: { fast: 0.5, normal: 1, slow: 1.5, vslow: 2 },
  TN: { fast: '빠름', normal: '보통', slow: '느림', vslow: '아주 느림' },
  tmul: { melee: 1, pick: 1, ranged: 1, front: 1.6, all: 2.0, self: 0 },   // 10월 3일 50상황 실측: 광역은 맞히는 적이 일찍 쓰러져 생각보다 덜 번다(2.0·2.5 → 1.6·2.0)
  TGN: { melee: '근접 한 적', pick: '고른 적', ranged: '후열까지 한 적', front: '전열 모두', all: '모든 적', self: '나' },
  poison: 4,                    // 중독 1의 값 (10월 3일 3 → 4: 쌓인 중독 위에 더하면 남은 피해가 1보다 크게 늘어 독사가 점수보다 셌다)
  brk: 0.15,                    // 붕괴 게이지 1의 값 (10 = 1.5)
  S: 4,                         // 쓸 때 대상의 기대 중독 수치 (10월 3일 06a2 실측 3.9)
  Sk: { burst: 1.5, grow: 5, exploit: 4, brkPer: 3, spread: 5, drain: 5 },  // 효과마다 쓸 때 대상의 중독 (10월 3일 재사용 대기 판 실측: 터뜨리기 1.1 → 기본 4칸 판 2.8(먼저 거는 중독 전), 키우기 6.4, 이용 4.1, 붕괴 2.9). 터뜨리기는 먼저 거는 중독(pre)을 더한다
  ph: 8,                        // 흘리기형 스킬이 막는 공격의 기대 피해 (10월 3일: 재사용 대기로 바뀌어 평범한 공격에도 쓰므로 15 → 8)
  pOk: 0.85,                    // 흘리기 성공 확률 (10월 3일 50상황 실측: 스킬 흘리기 84%, 빠른 흘리기 71~77%·주 행동 흘리기 96~98%. 예전 값 0.6은 빠른 흘리기가 발동하지 않던 때의 실측이다)
  turns: 11,                    // 기준 전투에서 첫 차례 뒤 내 차례 수 (목표 전투 길이 12행동, 10월 3일 만든 사람 결정: 옛 암살자 수준)
  haste: { poison: 5, kill: 2, parry: 1.5, break: 1 },  // 기준 전투에서 갈래 규칙이 일어나는 행동 수 (한 행동에 한 번만 센다) [가설]
  kw: { weak: 1.5, vuln: 1.5, chill: 1.5, protect: 2, haste: 12, empower: 3.5 },   // haste: 가속 1 = 한 라운드의 연속 행동(차례 하나, 쿨타임은 줄지 않음) (10월 5일 만든 사람 결정으로 2 → 12)   // empower: 나에게 강화 1 = 다음 공격 하나 피해 +25% (10월 5일 사냥꾼 저격 자세, 가설)   // 적에게 거는 상태 1의 값 (한 번 막거나 키우는 피해)
  budget: { 시작: 28, 하급: 39, 중급: 48, 상급: 56 },   // 10월 3일 50상황: 시작 스킬을 낮추고(35 → 28) 트리를 1.15배로 올렸다. 공통 행동이 갈래 스킬보다 세면 갈래 성격이 묻힌다
  rowB: { 1: 37, 2: 38, 3: 39, 4: 40, 5: 41, 6: 42.5, 7: 46, 8: 47.5, 9: 49.5, 10: 51, 11: 55, 12: 56.5, 13: 58.5 },  // 줄마다 예산 (10월 3일): 깊은 줄일수록 조금 세다. 하급 1~6줄, 중급 7~10줄, 상급 11~13줄(10월 8일): 중급 7~9줄과 같은 걸음(새 등급 첫 줄 +8%, 그다음 +1.5 · +2)으로 55 · 56.5 · 58.5. 10줄(51)보다 8~15% 세다   // 시작 30 → 35 (10월 3일: 늘 끼워지는 시작 스킬로 전투를 줄인다)   // 10월 3일: 06a2 감도 시험(스킬 효과 ×1.3 → 6성향 20%, 신중 35%)에서 등급별 점수 중앙값. 처음 값(20·24·30·42)의 약 1.7배
  /* 파수꾼 (10월 4일 50상황 측정으로 보정): 보호막은 맞으며 금방 줄어 쓸 때 대개 비어 있다. [하급(1~6줄), 중급(7~10줄)]마다
     S: 보호막 비례 피해를 쓸 때의 보유량(측정 Lv5 7~8, Lv10 13~15), B: 한 번에 태우는 양(측정 Lv5 8~9 · 상한에 막힘, Lv10 12~14), cap: 채우기의 기준 상한(Lv5 49, Lv10 58, 쓸 때 거의 0이라 넘침 0~1%)
     v: 보호막 1의 값, loss: 태운 보호막이 막았을 몫, thorn: 가시가 맞는 몫, vuln: 쓸 때 대상의 취약, shield: 방패병이 있는 몫, pull: 끌어내기, chill: 둔화된 적이 있는 몫 [가설] */
  ward: { v: 0.8, S: [8, 12.5], B: [15, 21], cap: [45, 58], loss: 0.5, thorn: 0.85, vuln: 2, shield: 0.3, pull: 6, chill: 0.35, all: [12, 22], fin: 0.9 }, // 10월 5일 4차 측정(적 행동 개편 · 강적 다섯 · 후열 절반 뒤): 보호막 비례 때 보유 하급 7~9 · 중급 12~13, 최후의 성벽이 태운 양 Lv10 23. B는 그대로(태우기 전 보유 하급 16~22 · 중급 16~35, 상한이 먼저 걸린다). // 10월 4일 3차 측정(테스터가 보호막을 얻는 스킬을 태우는 스킬만큼 끼우고, 한 적의 공격에도 막는 스킬을 쓴 뒤): all은 모두 태우는 스킬이 한 번에 태우는 양(지금 10줄 최후의 성벽뿐, Lv10 측정 18), fin은 마무리 태우기를 생명력이 낮은 적에게 쓴 몫(측정 91~100%)
  /* 사냥꾼 (10월 5일 초안, 가설): F 쓸 때 대상의 추적 겹(최대 3), swap 직전과 다른 적을 칠 몫, ev 몸 빼기 한 번이 막는 피해, hx 쓸 때 가속 상태일 몫, fa 추적 한 겹을 더하는 값 */
  hunt: { F: 1.5, swap: 0.5, ev: 7, hx: 0.5, fa: 1.5, ctr: 0.85, ctrBig: 0.4, q: 6, fs: 8, ch: 1.5, stop: 0.25, stopV: 14, stun: 10, ocb: 0.2,
    /* 0.8.0 5단계 연사 기본 공격 버프 (원거리 초안 2-6a · 2-10, 10월 18일) [가설]: n 기간 안 기대 기본 공격 횟수(버프마다, 기본 기간 r0일 때), per 기간이 한 라운드 늘 때 더하는 횟수, sw 기본 공격이 직전과 다른 적을 칠 몫(둘 이상 남은 몫), D 기본 공격 한 번의 피해 값(SKK.B의 무기 피해 8) */
    bb: { n: { swap: 1, extra: 1.5, barb: 2, sky: 1 }, r0: { swap: 0, extra: 1, barb: 1, sky: 0 }, per: 0.8, sw: 0.75, D: 8 } }, // ch: 쓸 때 대상의 둔화, stop: 둔화된 적이 모으는 중일 몫, stopV: 끊은 큰 공격의 값, stun: 적 행동 하나를 놓치게 한 값, ocb: 모으는 적을 무너뜨릴 몫 // ctr: 피한 뒤 반격이 나갈 몫(강타일 때만이면 ctrBig), q: 빠른 칸 하나, fs: 한 라운드에 받는 예고된 큰 공격 피해
  /* 숨겨진 직업 1 (10월 7일, 'b_' 칸에만): bl 출혈 1의 값(적이 움직일 때마다 약 2 + 흡혈 근원 약 1), S 먹기 · 이용을 쓸 때 대상의 출혈 [하급, 중급], spr 튀길 때 그 적의 출혈,
     hv 먹기 회복이 한도에 잘리지 않는 몫, loss 먹어 없앤 출혈이 앞으로 줬을 몫, took 받은 피해 칸을 쓸 때 받은 피해 [하급, 중급], low 내 생명력 문턱마다 들 몫,
     killP 처치 조건이 일어날 몫 [한 적, 광역], selfHp 나에게 건 출혈 피해의 값, meS 쓸 때 내 출혈, thornHit 맞을 때 출혈이 걸릴 몫, kwEat 먹기로 얻는 약화 · 강화 1의 값 [가설] */
  butch: { bl: 3, S: [5, 6], spr: 4, hv: 0.8, loss: 0.35, took: [14, 18], low: { 0.5: 0.35, 0.4: 0.28, 0.35: 0.24, 0.3: 0.2 }, killP: [0.4, 0.6], selfHp: 0.5, meS: 3, thornHit: 0.8, kwEat: { weak: 1.5, empower: 3.5 } },
  /* 수도승 (10월 7일 가설, docs/직업/수도승.md F-3): K 터뜨릴 때 기(하급 · 중급), Kp kiPer를 쓸 때 기, Kg kiGrow를 쓸 때 기, loss 거둔 기 1이 다음 ▶에 줬을 몫의 비율,
     cN 자세 하나에 되받는 횟수, gIn 피해 절반이 막는 값, ctr 직업 되받기 한 번의 기본 값, cS ctrPer를 쓸 때 지난 차례 뒤 되받은 수, ch 쓸 때 대상이 이미 둔화일 몫,
     ride ▶ 공격에 기 ×1.25가 실리는 몫, fast ⚡ 공격이 주는 기 +1의 몫, seal 끊기를 쓸 때 지원 예고가 있을 몫, sealV 끊은 지원 행동의 값 */
  as5: { Sb: 4, B: 12, Wd: 13 },
  el5: { B: 5, Wd: 5, hitR: 1.5, hitD: 11, I: 3, C: 1.5, T: 10, vP: 0.5 }, // 0.8.0 M5-5 원소술사 새 칸 [가설, 측정으로 확인]
  hn5: { B: 8, Wd: 8, F: 2, ev: 10 }, // 0.8.0 M5-4 사냥꾼 새 칸 [가설, 측정으로 확인]: 기본 공격 한 대 8 · 무기 피해 8(활 55–65%) · 쓸 때 대상 추적 2 // 0.8.0 M5-3 암살자 새 칸 [가설, 측정으로 확인]: 터뜨릴 때 대상 중독 5(길마다 독을 대고 터뜨린다), 늦은 챕터 기본 공격 한 대 12 · 무기 피해 13(승부수 · 그림자 칸)
  monk5: { K: [0.7, 0.9], Kp: [0.6, 0.8], KpB: {} }, // 0.8.0 M5-2 새 트리 측정(10월 20일, 수도승 360판 · 테스터 v2Pick): 쓸 때 기 — 쏟는 칸 0.4–0.5, 타수 · 기 비례 칸 0.8–1.1. ▶ 공격이 기를 하나씩 쓰고 빠른 기 모으기 칸이 없어 옛 트리(2.5 · 2.2)의 절반 아래
  monk: { K: [2.5, 2.5], Kp: [2, 2.2], KpB: { 부동: [0.8, 0.8] }, loss: 0.5, cN: 0.8, ctr: 9, ch: 0.6, ride: 0.1, seal: 0.25, sealV: 12, Kg: 2 }, // 10월 7일 50상황 측정(Lv5 · Lv10, 테스터 v2Pick 수도승 칸): 터뜨릴 때 기 3.6 · 2.5, 기 비례 때 기 2.9 · 2.2, 끌어올리기 때 기 1.6, 자세 하나에 되받기 1.36 · 1.38, 되받기 한 번 피해 12, 되갚기 때 되받은 수 0.8 · 1.0, 거두기 때 대상 둔화 0.9(Lv5). 자세 칸은 측정값으로 다시 맞추면 줄 예산의 2배가 되어(직업 규칙의 되받기 몫이 칸마다 들어간다) 가설 그대로 두고 50상황 점수로 본다. 중급(Lv10)의 K · Kp만 측정값(2.5 · 2.2)으로 내렸다(처음 가설 3.5 · 3: 중급 터뜨리기 칸이 기가 모자라 오른쪽 기둥이 왼쪽보다 15 낮았다)
  hz: 1.5,                      // 🔄 쿨타임 당기기 1번의 값 [가설] (10월 3일 50상황: 평소 싸움에서는 스킬이 늘 3~4개 준비되어 있어 거의 0, 쿨타임이 묶이는 보스전에서만 크다)
  Fmax: 6,                      // 한 스킬을 전투에서 쓰는 횟수의 상한 (실측: 바탕 스킬 독니 5.4)
  /* 마검사 (10월 7일 설계 가설, docs/직업/마검사.md C-0 · F-3): kw 출혈 · 화상 1의 값(사냥꾼 칸은 K.kw에 없어 1로 센다. 측정 뒤 한 값으로 합친다), dl 칼에 실은 원소가 실제로 걸리는 몫,
     S 쓸 때 대상의 출혈 · 화상 [하급, 중급](exploit의 s · killSpread), on 쓸 때 대상이 그 상태였을 몫(kwx), alt 교대로 쓸 몫, run2 교대가 두 번 이어진 뒤에 쓸 몫, kill 처치 조건 칸이 쓰러뜨릴 몫,
     E 칼에 실린 원소 크기, edgeHas edgeX를 쓸 때 칼이 실려 있을 몫 */
  sb: { kw: { bleed: 2.5, ignite: 2.5 }, dl: 0.85, S: { bleed: [3, 4.5], ignite: [3.5, 5] }, on: { bleed: 0.5, ignite: 0.55 }, alt: 0.7, run2: 0.45, kill: 0.4, E: 5, edgeHas: 0.5 },
  wardCls: { spellblade: { S: [6, 8], B: [8, 11], cap: [16, 19], all: [15, 20], fin: 0.9 } }, // 직업마다 보호막 표 (마검사 상한 15%: Lv5 약 23, Lv10 약 28). 없으면 파수꾼 측정값 ward
};
const skTri = n => n * (n + 1) / 2;
const skJo = n => '013678'.includes(String(n).slice(-1)) ? '을' : '를'; // 숫자 뒤 을/를
/* 0.8.0 M5-0 마검사 경계 효과 (10월 19일). 값은 기존 상수로 센 추정이다(측정이 아님):
   searMerge 둘 다 걸린 적(쓸 때 열에 여섯)을 합치면 출혈 · 화상 보유량의 SEAR.mul − 1 몫이 더 들어간다.
   sbBlaze n차례 × 한 행동 값(K.B) × 피해 +40% + 베기 둘에 혈염(더 거는 2 + 합치기) − 잃는 보호막 − 받는 피해 +30%(적 한 방 K.B × 0.8을 n번).
   wardPer 출혈 걸린 적(평균 1.1) × n × 보호막 값. sbFilm 한 차례에 받아내는 보호막 몫(W.S) × 50%가 출혈. sbSinWall 보호막(최대 생명력 15% × 3, 기준 생명력 SB_HP) − 바친 생명력 + 깨질 때(반쯤) 전열 둘 출혈 4.
   sbHeat 기본 공격 하나 × 0.5 − 태운 보호막. sbEmberMail 보호막이 있는 동안 평타 두 번 화상 2. sbFireBody 남은 유산(평균 1) × 8 보호막 + n차례 평타 ×1.3 · 화상 2 − n차례 스킬을 못 쓰는 몫 */
const SB_BD_K = ['searMerge', 'sbBlaze', 'wardPer', 'sbFilm', 'sbSinWall', 'sbHeat', 'sbEmberMail', 'sbFireBody', 'sbCross', 'searSpread', 'sbEcho', 'sbShackle', 'sbAshHand', 'sbCinder', 'sbEmberCut', 'sbFist', 'sbCounterBurn', 'sbTricolor', 'searBurst'];
/* 보정 5 결합 칸 · 승부수 후보(추정): sbFist 전투에 기본 공격 5번 × 출혈 걸린 적일 확률 0.7 × (배율 − 1). sbCounterBurn 흘리기 성공 2번 × 화상. sbTricolor 할인 2번(전투에 두 번, 보정 5 2차 답) × 유산 1의 값(갈래 비용 2 평균의 절반 ≈ 8.3). searBurst 대상 1.5 × 혈염 보유(출혈 + 화상 몫 0.6) × 배율 */
/* M5-0 보정 4 새 칸(추정, 측정 아님): sbCross 대상이 출혈 · 화상 중 하나를 가졌을 확률 0.8씩 × n × 상태 값. searSpread 혈염 걸린 적을 쓰러뜨릴 확률 0.35 × 곁의 적 1.5 × 혈염 보유(출혈 + 화상 몫 0.6) × 혈염 값(×1.5).
   sbEcho 보호막이 있는 동안의 베기 3번 × n. sbShackle 출혈 걸린 적의 강타를 막아 내는 일 전투에 2번 × 붕괴. sbAshHand 기본 공격 k번 × 화상. sbCinder 보호막이 깎이는 일 3번 × 전열 2 × 화상 */
const SB_HP = 120;
/* 경계 숫자 (엔진 js/10-skills-engine.js의 IFX_SB · sbBoundUse · sbWardHit와 값 식이 함께 읽는다). 스킬 문장(data/skills.js txt)의 숫자와 맞춰 둔다 */
/* M5-0 마감(10월 19일 만든 사람): 문장의 꼴은 그대로, 숫자만 값 띠 하한까지 올렸다. 보정 4(10월 20일)에서 갈래 칸을 잘라 기준 평균이 오르자 다시 맞췄다(피막 130%, 잿불 갑주 화상 6). 겁화 피해 +40 → +60%, 피막 50 → 125%, 죄인의 벽 출혈 4 → 5, 달군 갑주 ×1.5 → ×2.8, 잿불 갑주 화상 2 → 5, 불의 몸 ×1.3 → ×1.8 · 화상 2 → 4 (피의 갑주 +4 → +17, 핏불 싣기 출혈 2 · 화상 2 → 3 · 4는 data/skills.js fx) */
const SB_BOUND = { blazeHit: 1, blazeIn: 0.3, blazeSear: 2, filmPer: 0.75, sinPay: 0.15, sinMul: 3.5, sinBleed: 7, heatMul: 3.2, /* M5-0c 맞추기 2번: 2.8 → 3.2(평타 쪽으로, 값 띠 안) */ emberIgn: 7, bodyPer: 11, bodyMul: 0.8, bodyIgn: 5, sinBlock: 0.3, ashMul: 0.5, ashIgn: 2,
  crossN: 5, ssPer: 1, echoN: 2, shackleBrk: 115, ashHandK: 2, ashHandIgn: 3, cinderIgn: 1, emberCutBurn: 6, fistMul: 1.6, cbIgn: 4,
  holdPer: 0.05, holdMax: 5 }; // M5-0 보정 5 2차(만든 사람): 버팀 — 보호막 꼬리표 스킬을 쓴 전투에서 보호막을 지킨 채 차례를 넘기면 쌓이는 피해 +5%(최대 5) // M5-0 보정 4 새 칸 숫자(문장과 맞춘다)
/* 0.8.0 M5-1 파수꾼(10월 20일 만든 사람 설계지 + 07:40 보완): 태세 · 경계 승부수 · 결합 칸 숫자. 엔진은 js/10 파수꾼 절(p.wdSt).
   값 식(추정, 측정 아님): 태세는 켜 둔 채 평균 5차례(받는 피해 차례마다 8), 승부수 3차례, 결합 칸은 전투 한 번 몫 */
const WD_BOUND = { defIn: 0.1, /* 맞추기 2번: 0.15 → 0.12(수비 태세를 품은 공성추 · 용맹의 투지가 1챕터에서 셈) */ defWard: 2, defOn: 8, atkHit: 0.2, atkBrk: 7, atkIn: 0, /* 맞추기 1번: 받는 피해 +10%를 뺐다(1챕터 보스에서 공격 태세 길이 버티지 못함), 대신 +30% → +25% · 붕괴 12 → 10 */ atkOnDmg: 4, atkOnBrk: 10, prayDef: 2,
  marchHit: 0.12, /* 맞추기 2번: 묵직한 걸음에 보호막 8을 주고 피해 +20% → +15% */ marchBrk: 16, marchHeavy: 12, siegeMax: 2.0, siegePer: 20, siegeBrk: 26, siegeHeavy: 20, /* 파성 붕괴 · 스태미나는 설계지 "확인 후 밸런스 조절" */ quakeMul: 2, quakeWard: 0.5, quakeN: 3, valorGuard: 18, valorThorn: 0.5,
  turnBrk: 25, hammerMul: 1.5, hammerSt: 15, pullN: 2, pullBrk: 30 };
const WD_K = ['wdStance', 'wdPray', 'wdMarch', 'wdSiege', 'wdQuake', 'wdValor', 'wdTurncoat', 'wdHammer', 'wdChainPull', 'wdNextBrk'];
function skValueWd(e, K, W, hi) { const U = WD_BOUND, Wv = K.ward.v, nT = e.n || 3, inc = 8;
  switch (e.k) {
    case 'wdStance': return e.s === 'def' ? U.defOn * Wv + 5 * (U.defWard * Wv + U.defIn * inc) : (U.atkOnDmg + U.atkOnBrk * K.brk) + 5 * (K.B * U.atkHit + U.atkBrk * K.brk) - 5 * U.atkIn * inc;
    case 'wdPray': return 125 * e.n * (1 + 0.5 * (U.prayDef - 1)) * 1.5; // 최대 생명력 125 기준, 수비 태세(2배)는 반쯤
    case 'wdMarch': return nT * (K.B * U.marchHit + U.marchBrk * K.brk + U.marchHeavy * 0.15);
    case 'wdSiege': return nT * (1.4 * K.B * 1.3 * (U.siegeMax - 1) * 0.9 + U.siegeBrk * K.brk * 1.4 + U.siegeHeavy * 0.15) - W.S[hi] * Wv - nT * 0.7 * 6 * Wv; // 차례마다 기본 공격 · 강공격 1.4번(빠른 칸 포함, 강공격 ×1.3), 잃는 보호막 · 방어
    case 'wdQuake': return 1.7 * (8 + 1.6 * K.B) + 0.5 * K.B * 1.5 * (U.quakeMul - 1) - U.quakeN * 0.5 * 6 * Wv * U.quakeWard; // 무너뜨리는 적 1.7(놓치는 행동 8 · 무너진 틈), 둘 이상이면(반쯤) 다음 차례 ×2
    case 'wdValor': return nT * ((U.valorGuard - 6) * Wv + W.S[hi] * U.valorThorn * K.ward.thorn * 2.2) - nT * (10 * 0.15) - nT * 2; // 방어 보호막, 가시(보호막의 절반 × 맞는 2.2번), 스태미나 · 흘리기 대가
    case 'wdTurncoat': return 16.7 + U.turnBrk * K.brk; // 바꾸는 유산 2 한 번 + 붕괴
    case 'wdHammer': return 10 * 0.4 * K.B * (U.hammerMul - 1) + 2 * 0.4 * U.hammerSt * 0.15; // 전투에 기본 공격 10번, 무너진 적일 확률 0.4
    case 'wdChainPull': return U.pullN * (K.ward.pull + U.pullBrk * K.brk);
    case 'wdNextBrk': return e.n * K.brk;
  } return 0; }
/* 0.8.0 M5-2 수도승(10월 20일 만든 사람 설계지 2판): 새 효과의 숫자. 설계지 숫자(연환권 기마다 1타 · 붕권 +20% · 금강 +20% · 역천권 받는 피해 +30%)는 그대로, 나머지는 가설 — 값 띠 · 측정으로 정한다 */
const MK_BOUND = { adamantRed: 0.45, /* 맞추기 1번: 금강불괴 −40% → −45%(비용 3 값 띠) */ yeokBrk: 15, yeokIn: 0.3, cheonChill: 2, cheonSeal: 5, cheonBrk: 22, iljiHp: 0.1, iljiNoKi: 3, samjaeMul: 0.25, refluxKi: 1, bultoeMul: 2, bigBrk: 200 }; /* 기공 응축(설계지 ×2)은 쏟는 기 +3(mkCondense add): 새 트리는 쓸 때 기가 0.5 안팎이라 ×2가 0에 가깝다(M5-2 측정) */
const MK_K = ['mkChain', 'mkCondense', 'mkAdamant', 'mkDrainChill', 'mkChillBurst', 'mkCtrPer', 'mkFlow', 'mkNextBrk', 'mkYeok', 'mkCheon', 'mkIlji', 'mkSamjae', 'mkReflux', 'mkBultoe'];
function skValueMk(e, s, K, M, hi, mt) { const U = MK_BOUND, inc = hi ? 14 : 8, nT = e.n || 3, d = (s.fx.find(x => x.k === 'dmg') || { n: 0 }).n * (s.hits || 1), C = 2.2; /* C: 쓸 때 대상의 둔화(혈도 · 역혈 · 파혈 판) */
  switch (e.k) {
    case 'mkChain': return ((e.add || 0) + Math.min(e.max || 5, M.Kp[hi] * (e.per || 1))) * (6.5 * 1.125 + (e.brk || 0) * K.brk); // 이번 차례 기본 공격에 더하는 타격: 한 대 = 기본 공격 피해 6.5(M5-2 측정, 붕괴는 기본 공격 한 번), ▶에 기가 실릴 때가 반쯤(×1.125)
    case 'mkCondense': return (e.add || 3) * 9 * 0.8; // 다음에 쏟는 기 +add: 쏟는 칸 하나(기 1당 9쯤)에 더해지는 기
    case 'mkAdamant': return nT * U.adamantRed * inc * 1.5; // 큰 공격 앞에 쓰면 몫이 크다(중급: 받는 피해 14/차례)
    case 'mkDrainChill': return e.per * C * 0.9;
    case 'mkChillBurst': return (e.per + (e.brk || 0) * K.brk) * C * mt - C * K.kw.chill * 0.5;
    case 'mkCtrPer': return e.per * 0.8; // 지난 적 차례에 되받은 수(자세 판 0.8)
    case 'mkFlow': return nT * 24 * e.mul; // ▶ 공격(스킬 · 기본 공격) 한 번 24쯤
    case 'mkNextBrk': return e.n * K.brk;
    case 'mkYeok': return nT * (1.8 * (M.ctr + U.yeokBrk * K.brk) + 2) - nT * (U.yeokIn * 8 + 2); // 차례마다 되받기 1.8(한도 없음, 전열 모두) · 자세 유지, 대가: 받는 피해 · 방어 불가
    case 'mkCheon': return nT * (2 * U.cheonChill * 3.5 + 0.6 * M.sealV) - nT * M.cN * M.ctr * 0.5; // 차례마다 나를 치는 2번(둘째 차례부터 쌓인 둔화 5로 봉인 0.6), 둔화 1의 값은 혈도 판 3.5(폭쇄 · ×1.5가 거둔다)
    case 'mkIlji': return e.per * C * 3 * 1.2 - 125 * U.iljiHp - U.iljiNoKi * K.kw.empower * 0.6; // 기 3 이상일 때 아껴 쓴다(테스터 · 사람) // (둔화 × 기) 피해, 대가: 생명력 · 기를 얻지 못함
    case 'mkSamjae': return 6 * 0.6 * 18 * U.samjaeMul + 4; // 전투에 ⚡ 공격 6번, 기가 가득일 때 0.6(기 · 되받기 판), 넘쳐 버리던 기를 쓰는 몫
    case 'mkReflux': return 9 * 0.65 * U.refluxKi * K.kw.empower; // 기본 공격 9번(기본공격연동 판), 둔화된 적일 확률 0.65
    case 'mkBultoe': return 5 * 0.35 * M.ctr * (U.bultoeMul - 1) * 1.5; // 되받기 5번(자세 꼬리표 판), 무너진 적 0.35
  } return 0; }
/* 0.8.0 M5-3 암살자(10월 20일 만든 사람 설계지 4판): 새 효과의 숫자. 설계지 숫자(격발 찌르기 1.5배 · 고독 ×2 · 독 결산 2배 · 무영살 무기 피해 3배 · 만독개화 2배 · 대가 15% · +20%)는 그대로, 나머지는 가설 */
const AS_BOUND = { virMin: 10, bloomHp: 0.15, hideNoParry: 2, zanIn: 0.2, zanNoStam: 2, flowMul: 1.5, backFlower: 1.5, fangPsn: 1, wpn: 8 };
const AS_K = ['asNextPsn', 'asVirulent', 'asPlague', 'asTwin', 'asChain', 'asCounter', 'asFlowBlade', 'asBackx', 'asDance', 'asNextBurst', 'asVeil', 'asBloom', 'asHide', 'asZan', 'asFangC', 'asParPsn', 'asBackFlower'];
function skValueAs(e, s, K, hi, tm) { const U = AS_BOUND, P = K.poison, Wd = K.as5.Wd, B = K.as5.B, S0 = K.S, pn = (s.fx.find(x => x.k === 'poison') || { n: 0 }).n, bu = s.fx.find(x => x.k === 'burst'), nT = e.n || 3;
  switch (e.k) {
    case 'asNextPsn': return (e.n || 2) * (e.poison || 1) * P * 0.9; // 다음 기본 공격 n번(쓸 확률 0.9)
    case 'asVirulent': return 0.35 * 6 * P; // 중독 10을 넘겨 둔 대상(3할)에 줄지 않는 몫 라운드 6
    case 'asPlague': return 3 * S0 * (e.mul || 1) * 1.3 * P * 0.6; // 전투에 쓰러지는 적 3, 그때 중독 S, 다른 적 1.3에게(옮겨붙은 독이 다 들지는 않음 0.6)
    case 'asTwin': return pn * P * 0.7; // 후열 하나에게 같은 중독(후열이 있을 확률 0.7)
    case 'asChain': return 0.3 * 0.6 * 20; // 쓰러뜨릴 확률 0.3, 다시 쓰는 터뜨리기 한 번(쓴 유산 몫을 빼고)
    case 'asCounter': return K.pOk * (B * 1.1) * (e.mul || 1); // 흘려 내면 기본 공격 한 번(흘리기 성공 · 기본 공격 효과 포함)
    case 'asFlowBlade': return 6 * K.pOk * 0.8 * B * ((e.mul || U.flowMul) - 1) + 6 * 0.6 * (e.poison || 0) * P; // 전투에 흘리기 6번(흘리기 길), 다음 차례 기본 공격으로 이어짐 0.8
    case 'asBackx': { const d = s.fx.find(x => x.k === 'dmg'); return (d ? d.n : 0) * ((e.mul || 1) - 1) * (e.low ? 0.25 : 0.55); } // 후열(0.55) · 생명력 낮은 후열(0.25)에게 ×
    case 'asDance': return 4 * K.pOk * B * (e.mul || 1) * 0.9 + 4 * K.pOk * (e.poison || 0) * P; // 전투에 흘리기 4번, 그때마다 기본 공격 한 번
    case 'asNextBurst': return skTri(K.as5.Sb + 2) * ((e.mul || 1.5) - 1) * 0.9; // 다음 터뜨리기(쓸 때 중독 S + 먼저 거는 3)
    case 'asVeil': return nT * 1.3 * (e.poison || 2) * P * 0.7; // 차례마다 나를 치는 1.3
    case 'asBloom': { const n = Math.min(20, S0 * 3); return skTri(n) * ((e.mul || 2) - 1) * 0.55 + skTri(n) * 0.35 - 125 * U.bloomHp; } // 모인 중독(적 2.5 몫)을 2배로, 터뜨려 사라지는 몫 · 생명력 15%
    case 'asHide': return Wd * (e.mul || 3) * 1.2 + 8 + (e.poison || 0) * P + (e.brk || 0) * 0.2 - U.hideNoParry * 4; // 무기 피해 × 3(큰 한 방) + 숨은 차례 피한 피해 8, 대가 흘리기 2차례
    case 'asZan': return nT * B * 1.2 * (e.mul || 1) + nT * (e.poison || 0) * P + nT * 1.2 * (e.brk || 0) * 0.2 - nT * U.zanIn * 8 - U.zanNoStam * 1.5; // 스태미나 회복 한 차례 10 × 0.15 // 차례마다 기본 공격 한 번 더, 대가 받는 피해 · 스태미나
    case 'asFangC': return 8 * 0.5 * (e.n || U.fangPsn) * P; // 기본 공격 8번, 중독 걸린 적 0.5(M5-3 2배 맞추기: 0.6 → 0.5, 정수 칸이라 +2가 띠 위로 넘던 것)
    case 'asParPsn': return 4 * K.pOk * (e.n || 2) * P * 0.8;
    case 'asBackFlower': return 3 * 0.4 * skTri(K.as5.Sb + 2) * ((e.mul || U.backFlower) - 1) + 6; // 터뜨리기 3번, 후열 0.4
  } return 0; }
/* 0.8.0 M5-4 사냥꾼(10월 20일 만든 사람 설계지 2판): 새 효과의 숫자. 설계지 숫자(대가 15% · +30% · +20% · 추적 3겹)는 그대로, 나머지는 가설.
   evadeNoResp: 몸 빼기로 피한 공격은 대응 충전을 주지 않는다(사냥꾼, 만든 사람 검토 11). linkMax: 연계 빠른 행동은 내 차례에 한 번(이어 쏘기 숙련 2번) */
const HN5_BOUND = { drawIn: 0.3, galeIn: 0.2, trapHp: 0.15, trapFocus: 3, linkMax: 1, linkMaxUp: 2, Fv: 5 };
const HN_K = ['hnLock', 'hnSky', 'hnCarry', 'hnVolley', 'hnNock', 'hnBloodRain', 'hnWindStep', 'hnWindVeil', 'hnDraw', 'hnGale', 'hnTrap', 'hnChaseC', 'hnScent', 'hnFrozen', 'hnNockChill', 'hnFocusSelf', 'hnChillAll'];
function skValueHn(e, s, K, tm) { const U = HN5_BOUND, H = K.hn5, B = H.B, Wd = H.Wd, F = H.F, Fv = U.Fv, dm = (s.fx.find(x => x.k === 'dmg') || { n: 0 }).n, hits = s.hits || 1, nT = tm || 2;
  switch (e.k) {
    case 'hnLock': return ((e.r || 0) + 1) * 1.1 * B * (e.per || 0.1) * F * 0.9; // 라운드마다 기본 공격 1.1번, 그때 대상 추적 F
    case 'hnSky': return 0.55 * Math.max(0, Wd * (e.mul || 3) - dm * hits); // 추적 3겹일 몫 0.55: 피해 대신 무기 피해 × mul
    case 'hnCarry': return 1.5 * F * Fv; // 전투에 넘어가는 추적 1.5번
    case 'hnVolley': return (hits - 1) * dm * 0.25; // 발마다 다른 적(후열 · 지원하는 적에게 닿는 몫)
    case 'hnNock': return (e.n || 2) * (1 + 0.7 * ((e.shots || 2) - 2)) * B * 0.9; // 세 발째부터는 0.7(대상이 먼저 쓰러지는 몫)
    case 'hnBloodRain': return nT * 0.7 * Wd * (e.mul || 2); // 출혈 걸린 적 0.7(화살비 · 덧화살 길)
    case 'hnWindStep': return 6 * 0.6 * 7; // 피함 6번(받아넘기기 · 몸 빼기 길), 그 뒤 기동 스킬 0.6 · 유산 1의 값 7
    case 'hnWindVeil': return (e.r || 3) * 0.9 * H.ev; // 라운드마다 맞을 몫 0.9, 피한 한 대
    case 'hnDraw': return Wd * ((e.mul || 3) + (e.per || 1) * F) * 1.1 + (e.brk || 0) * K.brk - B - 6; // 당기는 차례(기본 공격 한 번) · 받는 피해 +30%
    case 'hnGale': return (e.r || 3) * (B * 1.5 + 1.5 * B * 0.9 + (e.bleed || 0) * 3) - (e.r || 3) * 4 - 6; // 한 번 더 움직임 = 기본 공격 1.5배(스킬도 씀), 두 번째 화살은 라운드에 1.5번 // 라운드마다 한 번 더 움직임 · 두 번째 화살, 대가 받는 피해 +20% · 몸 빼기 · 방어 불가
    case 'hnTrap': return 1.6 * (K.hunt.stun + U.trapFocus * Fv * 0.5 + Wd * (e.mul || 0) + (e.brk || 0) * K.brk + (e.bleed || 0) * 3) - 125 * U.trapHp * 0.6; // 이번 라운드 나를 치는 적 1.6, 생명력 15%
    case 'hnChaseC': return 4 * (e.n || 1) * Fv; // 전투에 피함 4번
    case 'hnScent': return 6 * 0.7 * (e.n || 1) * Fv; // 출혈 걸린 적을 맞히는 행동 6 · 그때 추적이 쌓일 몫 0.7
    case 'hnFrozen': return 8 * 0.45 * B * ((e.mul || 1.5) - 1); // 기본 공격 8번, 둔화 걸린 적 0.45
    case 'hnNockChill': return 2 * (e.n || 1) * K.kw.chill;
    case 'hnFocusSelf': return (e.n || 1) * Fv * 0.7;
    case 'hnChillAll': return (e.n || 1) * K.kw.chill * 2;
  } return 0; }
/* 0.8.0 M5-5 원소술사(10월 20일 만든 사람 설계지 2판): 새 효과의 숫자. 설계지 숫자(빙결 붕괴 +40 · 화신 5% · 천화 절반 · 정적 둔화 3 · 서리 무게 −20%)는 그대로, 나머지는 가설 */
const EL5_BOUND = { frzBrk: 40, stasisChill: 3, avatarHp: 0.05, meteorHp: 0.5 };
const EL_K = ['elBolt', 'elSwitch', 'elRimeR', 'elCharge', 'elMulti', 'elChargeEl', 'elCat', 'elBarrier', 'elChillAll', 'elVulnAll', 'elVulnFocus', 'elFrostEmber', 'elFrostWall', 'elManaFire', 'elAvatar', 'elStasis', 'elMeteor', 'elArcane', 'elShatter', 'elChillBrk', 'elSpreadIgn', 'elProtR', 'elIgnGuard'];
/* 값 식: K.el5 = { B 기본 공격 한 대, Wd 무기 피해, hitR 라운드마다 나를 치는 적, hitD 그 한 대, I 쓸 때 대상 화상, C 쓸 때 대상 둔화, T 그 차례 열충격 합계, vP 비전 일격 때 취약 몫 } [가설] */
function skValueEl(e, s, K, tm) { const X = K.elem, H = K.el5, B = H.B, Wd = H.Wd, dm = (s.fx.find(x => x.k === 'dmg') || { n: 0 }).n, hits = s.hits || 1, nT = tm || 2;
  switch (e.k) {
    case 'elBolt': return (e.n || 1) * 3; // 원소 1의 값(화상 · 둔화 가운데). 피해는 dmg
    case 'elRimeR': return (e.r || 2) * H.hitR * X.hit * (e.n || 1) * X.kw[e.s || 'chill'];
    case 'elCharge': return (e.ign || e.chill) ? (e.n || 3) * 0.9 * ((e.ign || 0) * X.kw.ignite + (e.chill || 0) * X.kw.chill) : (e.n || 3) * 0.9 * (e.add || 6); // 기본 공격 n번 · 쓰기 전에 끝날 몫 0.1
    case 'elMulti': return (e.n || 2) * ((e.shots || 2) - 1) * B * 0.9;
    case 'elChargeEl': return 2.5 * 0.9 * ((e.ign || 0) * X.kw.ignite + (e.chill || 0) * X.kw.chill);
    case 'elCat': return ((e.mul || 1.5) - 1) * X.D * H.T * 0.8; // 그 차례 열충격이 일어날 몫 0.8
    case 'elProtR': return (e.r || 3) * Math.min(e.n || 3, H.hitR) * H.hitD * 0.25; // 라운드마다 보호가 막는 몫(맞는 수까지)
    case 'elIgnGuard': return 6 * H.hitR * H.hitD * (e.red || 0.4) * 0.7; // 전투 6라운드, 나를 치는 적이 화상일 몫 0.7(마염 · 불꽃 빌드). 받는 피해 줄이기는 모두 합쳐 FX_CAP 0.6까지
    case 'elBarrier': return (e.r || 3) * H.hitR * H.hitD * (e.red || 0.4);
    case 'elChillAll': return (e.n || 1) * X.kw.chill * 2;
    case 'elVulnAll': return (e.n || 1) * K.kw.vuln * 2;
    case 'elVulnFocus': return (e.n || 1) * K.kw.vuln;
    case 'elFrostEmber': return 9 * (e.n || 1) * X.D; // 둔화된 적에게 화상을 거는 행동 9번, 화상 1이 열충격 합계 +1
    case 'elFrostWall': return 7.5 * X.kw.chill; // 보호 · 보호막이 있을 때 맞는 7.5번(보호 꼬리표 빌드)
    case 'elManaFire': return 12 * 0.7 * X.D; // 기본 공격 12번(기본공격연동 빌드), 화상 걸린 적 0.7 · 화상 1이 열충격 합계 +1
    case 'elAvatar': return (e.r || 3) * 1.2 * 1.6 * (X.D * 3.5 + X.Bk * K.brk) - (e.r || 3) * 110 * EL5_BOUND.avatarHp * 0.6; // 차례마다 행동 1.2 · 맞히는 적 1.6 · 맞히는 족족 열충격(합계 3.5쯤) · 대가 생명력
    case 'elStasis': return (e.r || 1) * 3 * K.hunt.stun + 0.5 * EL5_BOUND.stasisChill * X.kw.chill + (e.brk || 0) * K.brk * 0.5 - 1.2 * B; // 놓치게 한 적 3(승부수는 큰 싸움 앞에서), 강적 · 보스 0.5 · 내 다음 차례
    case 'elMeteor': return -70 * EL5_BOUND.meteorHp * 0.6; // 대가: 지금 생명력의 절반(70쯤), 생명력 1의 값 0.6 (피해는 dmg)
    case 'elArcane': return H.vP * ((e.mul || 2) - 1) * dm * hits; // 취약 걸린 적일 몫(약화의 표식 길)
    case 'elShatter': return (e.per || 8) * H.C * 0.8 - H.C * X.kw.chill * 0.5; // 쓸 때 대상 둔화 C, 깬 둔화의 값 절반
    case 'elChillBrk': return (e.per || 12) * H.C * K.brk;
    case 'elSpreadIgn': return (e.per || 0.5) * H.I * 1.5 * X.kw.ignite; // 다른 적 1.5
  } return 0; }
function skValue(s, ov) {
  if (!ov && SKK.butch && /^b_/.test(String(s.id)) && !s._bu) return skValueBu(s);
  if (!ov && (String(s.id).slice(0, 2) === 'e_' || s.el5)) return skValueElem(s); // M5-5 새 칸(e5_)도 열충격 몫으로 센다
  if (!ov && String(s.id).slice(0, 2) === 'c_' && !s._cf && SKK.conf) return skValueConf(s); // 숨겨진 직업 2: 정화 · 옮기기 · 비례 · 벗기기 · 고행 몫을 더한다(아래 skValueConf) // 원소술사: 열충격 가설(아래 skValueElem)이 화상 · 둔화 값을 바꿔 이 함수를 다시 부른다
  if (!ov && SKK.blood && /^v_/.test(String(s.id)) && !s._bm) return skValueBm(s); // 숨겨진 직업 3: 먹기 · 생명력 내기 · 값 깎기 · 번짐 몫을 더한다 // 원소술사: 열충격 가설(아래 skValueElem)이 화상 · 둔화 값을 바꿔 이 함수를 다시 부른다
  const KWv = (ov && ov.kw) || SKK.kw; const K = SKK; const Sof = k => (s.as5 && k === 'burst' && K.as5 ? K.as5.Sb : K.Sk && K.Sk[k] != null ? K.Sk[k] : K.S); /* M5-3: 새 암살자 칸의 터뜨리기는 K.as5.Sb */ const tm = K.tmul[s.tgt]; const hits = s.hits || 1; let v = 0; const hi = (s.row || 0) >= 7 ? 1 : 0; // hi: 중급(7~10줄)은 Lv7 이상에서 쓴다
  const sbk = /^sb_/.test(s.id || ''); const W = sbk && K.wardCls ? Object.assign({}, K.ward, K.wardCls.spellblade) : K.ward; const SB = K.sb; const multi = s.tgt === 'front' || s.tgt === 'all'; // 마검사: 직업 보호막 표, 출혈 · 화상 값
  const burnTake = e => e.max ? Math.min(e.max, W.B[hi]) : W.all[hi]; // 한 번에 태우는 양: 상한이 있으면 측정 보유량과 상한 가운데 작은 쪽, 모두 태우면 측정값
  const mk = String(s.id).slice(0, 2) === 'm_'; const mt = s.tgt === 'front' || s.tgt === 'all' ? tm : 1; const M = s.mk5 && K.monk5 ? Object.assign({}, K.monk, K.monk5) : K.monk; // 수도승 (10월 7일). M5-2 새 칸은 새 트리 측정값(K.monk5)
  for (const e of s.fx) {
    if (WD_K.includes(e.k)) { v += skValueWd(e, K, W, hi); continue; } // 0.8.0 M5-1 파수꾼
    if (MK_K.includes(e.k)) { v += skValueMk(e, s, K, M, hi, mt); continue; } // 0.8.0 M5-2 수도승
    if (AS_K.includes(e.k)) { v += skValueAs(e, s, K, hi, tm); continue; } // 0.8.0 M5-3 암살자
    if (HN_K.includes(e.k)) { v += skValueHn(e, s, K, tm); continue; } // 0.8.0 M5-4 사냥꾼
    if (EL_K.includes(e.k)) { v += skValueEl(e, s, K, tm); continue; } // 0.8.0 M5-5 원소술사
    if (SB_BD_K.includes(e.k)) { const Sbi = SB.S.bleed[hi] + SB.S.ignite[hi], kw = SB.kw.bleed, Wv = K.ward.v; const nT = e.n || 3; const U = SB_BOUND;
      switch (e.k) {
        case 'searMerge': v += 0.6 * Sbi * kw * (1.5 - 1); break;
        case 'sbBlaze': v += nT * K.B * (e.hit != null ? e.hit : U.blazeHit) + 2 * (U.blazeSear * kw + 0.5 * Sbi * kw) - W.S[hi] * Wv - nT * K.B * 0.8 * (e.inc != null ? e.inc : U.blazeIn); break;
        case 'wardPer': v += 1.1 * e.n * Wv; break;
        case 'sbFilm': v += W.S[hi] * U.filmPer * kw; break;
        case 'sbSinWall': v += SB_HP * U.sinPay * U.sinMul * Wv - SB_HP * U.sinPay + 0.5 * 2 * U.sinBleed * kw; break;
        case 'sbHeat': v += K.B * (U.heatMul - 1) - W.S[hi] * Wv * 0.5; break;
        case 'sbEmberMail': v += 2 * U.emberIgn * kw; break;
        case 'sbFireBody': v += 1 * U.bodyPer * Wv + nT * (K.B * U.bodyMul + U.bodyIgn * kw) - nT * (SKK.B * 0.75); break;
        case 'sbCross': v += 2 * 0.8 * U.crossN * kw; break;
        case 'searSpread': v += 0.35 * 1.5 * 0.6 * Sbi * U.ssPer * kw * 1.5; break;
        case 'sbEcho': v += 3 * U.echoN * kw; break;
        case 'sbShackle': v += 2 * U.shackleBrk * K.brk; break;
        case 'sbAshHand': v += U.ashHandK * U.ashHandIgn * kw; break;
        case 'sbEmberCut': { const bn = Math.min(U.emberCutBurn, W.S[hi]); v += bn * kw * 0.8 - bn * Wv; break; } // 태운 보호막만큼 화상(상한 10에 걸리는 몫 0.8)
        case 'sbFist': v += 5 * K.B * 0.7 * (U.fistMul - 1); break;
        case 'sbCounterBurn': v += 2 * U.cbIgn * kw; break;
        case 'sbTricolor': v += 2 * 10.75; break; // 유산 1의 값 = 갈래 비용 2 평균의 절반 (M7-2 직업 기준 옮김: 16.7 → 21.5)
        case 'searBurst': v += 1.5 * 0.6 * Sbi * (e.mul || 2); break;
        case 'sbCinder': v += 3 * 2 * U.cinderIgn * kw; break; // 보호막 경계 판은 라운드마다 보호막을 두르고 깎인다(전투 6–8라운드)
      } continue; }
    switch (e.k) {
      case 'dmg': v += e.n * hits * (s.tgt === 'self' ? 1 : tm); break;
      case 'poison': v += e.n * hits * K.poison * (s.tgt === 'self' ? 1 : tm); break;
      case 'grow': v += (Sof('grow') * (e.mul - 1) * K.poison + (e.add || 0) * K.poison) * (s.tgt === 'all' || s.tgt === 'front' ? tm : 1); break;
      case 'burst': { const S0 = Sof('burst') + (e.pre || 0); const S = e.half ? Math.ceil(S0 / 2) : e.top ? Math.min(e.top, S0) : S0; const tot = (e.top || e.half) ? (skTri(S0) - skTri(S0 - S)) : skTri(S0); // pre: 터뜨리기 전에 거는 중독
        const am = s.tgt === 'all' || s.tgt === 'front' ? tm : 1; v += tot * ((e.mul || 1) - 0.5 + (e.big ? (e.big - (e.mul || 1)) * 0.3 : 0)) * am + (e.keep || 0) * S0 * K.poison + S * (e.brkPer || 0) * K.brk * am; break; } // 광역 터뜨리기는 맞히는 수만큼
      case 'exploit': if (e.s) { const S0 = SB.S[e.s][hi]; v += e.per * S0 * (multi ? tm : 1) - (e.take ? S0 * SB.kw[e.s] : 0); break; } v += e.per * Sof('exploit') + (e.n || 0); break; // s: 출혈 · 화상 1마다(마검사). take: 거둔 상태가 앞으로 냈을 몫을 뺀다
      case 'brk': v += e.n * K.brk * (s.tgt === 'self' ? 1 : tm); break;
      case 'stam': v += e.n * 0.15; break;
      case 'bigx': break; // 끝에서 곱한다
      case 'cutx': v += e.brk * K.brk * 0.25; break; // 강타·폭발을 모으는 적: 쓸 때 넷 중 하나쯤
      case 'drain': v += e.per * Sof('drain'); break; // 대상의 중독 1마다 생명력
      case 'lowx': { const d = s.fx.find(x => x.k === 'dmg'); const wb = s.fx.find(x => x.k === 'wardBurn'); v += ((d ? d.n * hits : 0) + (wb ? burnTake(wb) * wb.mul : 0)) * (e.mul - 1) * (wb ? W.fin : 0.35); break; } // 생명력이 낮은 적: 쓸 때 셋 중 하나쯤. 마무리 태우기(파수꾼)는 아껴 두었다 쓰므로 태운 피해에도 붙고 몫이 크다
      case 'brokenx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * 0.3; break; } // 붕괴한 적: 붕괴를 노리고 쓰면 열에 셋
      case 'spread': v += Math.ceil(Sof('spread') * e.per) * 1.5 * K.poison; break; // 다른 적 평균 1.5
      case 'st': v += e.n * (KWv[e.s] || (sbk && SB.kw[e.s]) || 1) * (s.tgt === 'self' ? 1 : tm); break;
      case 'brkPer': v += e.per * Sof('brkPer') * K.brk; break;
      case 'parry': v += K.ph * e.red + 0.5 * 25 * K.brk; break;
      case 'onParry': v += K.pOk * ((e.dmg || 0) + (e.poison || 0) * K.poison + (e.brk || 0) * K.brk); break;
      case 'parryBuff': v += K.ph * e.red * (e.times || 1) + (e.stam || 0) * 0.15 * (e.times || 1) + K.pOk * (e.times || 1) * ((e.dmg || 0) + (e.poison || 0) * K.poison); break;
      case 'execute': v += skTri(Sof('burst') + 2) * (e.mul - 1) * 0.5; break;
      case 'capOver': break;
      case 'ward': case 'wardFirst': v += e.n * K.ward.v; break; // 나에게 보호막 (공격 스킬에 붙어도 나에게)
      case 'wardFill': v += (e.to || 1) * W.cap[hi] * K.ward.v; break; // 쓸 때 거의 비어 있어 상한의 to만큼 찬다 (10월 4일 측정)
      case 'wardBurn': { const take = burnTake(e); v += take * e.mul * (s.tgt === 'front' || s.tgt === 'all' ? tm : 1) - take * K.ward.v * K.ward.loss; break; } // 태운 만큼 × 배수, 태운 보호막이 막았을 몫을 뺀다
      case 'wardDmg': { const w = wardDamageInfo(e, W.S[hi]); v += w.bonus * (s.tgt === 'front' || s.tgt === 'all' ? tm : 1) - w.take * K.ward.v * K.ward.loss; break; } // 보호막 추가 피해 상한과 소모로 잃는 방어 가치
      case 'thorn': v += e.times * e.dmg * K.ward.thorn; break;
      case 'vulnPer': v += e.per * K.ward.vuln; break;
      case 'shieldx': { const bk = s.fx.find(x => x.k === 'brk'); v += (bk ? bk.n : 0) * (e.mul - 1) * K.brk * K.ward.shield; break; }
      case 'pull': v += K.ward.pull; break;
      case 'vulnGrow': v += K.ward.vuln * (e.mul - 1) * K.kw.vuln; break; // 쓸 때 대상의 취약을 키운다
      case 'chillx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * (ov && ov.chx != null ? ov.chx : (mk ? M.ch : K.ward.chill)) * (s.tgt === 'front' || s.tgt === 'all' ? tm : 1); break; } // 둔화된 적에게 × (수도승 혈도는 스스로 둔화를 걸어 몫이 크다)
      case 'stance': { const one = M.cN * ((M.ctr + (e.dmg || 0)) * (1 + (e.mul || 0)) + (e.brk || 0) * K.brk + (e.ki || 0) * K.kw.empower + (e.chill || 0) * K.kw.chill + (e.weak || 0) * K.kw.weak) * (e.far ? 1.25 : 1) + (e.max ? 0.12 * (M.ctr + (e.dmg || 0)) * (1 + (e.mul || 0)) : 0) + (e.big ? 0.3 * (8 + 1.6 * K.B) : 0) + (s.mk5 ? (e.red || 0) * 8 : 0); v += one * (e.keep ? 1 + (e.keep - 1) * 0.85 : 1); break; } // M5-2: 되받기 배수 · 한도 3 · 강타를 되받아 무너뜨림 · 받는 피해(새 칸만, 옛 철산고 값은 그대로) · 유지 차례 // 수도승 자세: 되받기 몫 (10월 10일 단순화: 막기 몫과 상한 몫을 뺐다)
      case 'kiBurst': { const t = Math.min(e.max || 5, M.K[hi] + (e.pre ? e.pre * M.ch : 0)); const dd = s.fx.find(x => x.k === 'dmg'); v += t * ((e.per || 0) + (e.brk || 0) * K.brk + (e.mul ? e.mul * (dd ? dd.n * hits : 0) : 0)) * mt - Math.min(e.max || 5, M.K[hi]) * K.kw.empower * M.loss + (e.keep ? Math.floor(M.K[hi] * e.keep) * K.kw.empower * M.loss : 0); break; } // 기 터뜨리기: 거둔 기 × per, 거둔 기가 다음 ▶에 줬을 몫을 뺀다
      case 'kiPer': v += e.per * (M.KpB && M.KpB[s.b] ? M.KpB[s.b][hi] : M.Kp[hi]) * hits * mt; break; // 쓰기 전의 기 1마다 타격마다 (갈래마다 평균 기)
      case 'kiHits': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n : 0) * Math.min(e.max || 5, M.Kp[hi] * (e.per || 1) * (e.max === 1 ? 0.45 : 1)) * mt; break; } // M5-2 기 1마다 1타 추가(max 1이면 기가 있을 때 +1타: 기가 있을 확률)
      case 'kiGrow': { const k0 = M.Kg - 1; v += (Math.min(5, (k0 + (e.add || 0)) * e.mul) - k0) * K.kw.empower * 0.8; break; }
      case 'sealx': v += M.seal * (M.sealV * 0.8 + e.brk * K.brk * 0.2) * mt; break; // 지원 행동 끊기
      case 'focusx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * e.per * K.hunt.F; break; } // 추적 1겹마다 피해 +per
      case 'focusBurst': v += e.n * K.hunt.F; break; // 추적을 터뜨린다: 1겹마다 피해 +n
      case 'focusAdd': v += e.n * K.hunt.fa; break; // 대상에게 추적 +n겹
      case 'swapx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n : 0) * (e.mul - 1) * K.hunt.swap; break; } // 직전과 다른 적이면 × (첫 발만)
      case 'evade': v += e.n * (s.hn5 && K.hn5 ? K.hn5.ev : K.hunt.ev); break; // 다음에 맞는 공격 n번을 피한다
      case 'hastex': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * K.hunt.hx; break; } // 가속 상태면 ×
      case 'meSt': v += e.n * (KWv[e.s] || 1) * (e.if === 'chill' ? M.ch * mt : e.if === 'hit' ? mt : e.on === 'cut' ? 0.25 : 1); break; // if: 'chill' 대상이 이미 둔화일 때만(수도승 거두기). on 'cut'(10월 18일 원소 장막): 영창을 끊을 때만(cutx와 같은 넷 중 하나)
      case 'hasteSpend': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * 0.4; break; } // 가속이 있으면 써서 ×
      case 'chillCut': v += K.hunt.stop * (K.hunt.stopV * 0.8 + e.brk * K.brk * 0.2); break; // 둔화된 적이 모으는 중이면 끊는다(강적 · 보스는 붕괴)
      case 'chillShatter': v += K.hunt.ch * (e.dmg + e.brk * K.brk); break; // 둔화를 깨뜨려 1마다 피해 · 붕괴
      case 'chillSpread': v += K.hunt.ch * (e.per || 1) * 1.5 * K.kw.chill; break; // 다른 적 평균 1.5
      case 'freeze': v += 0.7 * K.hunt.stun + 0.3 * (e.chill * K.kw.chill + e.brk * K.brk); break; // 일반 · 정예는 행동 하나를 놓친다
      case 'bbuf': v += skBbufV(e); break; // 0.8.0 5단계 연사: 기간 안 기본 공격에 얹히는 몫
      case 'onCutBreak': v += K.hunt.ocb * (e.haste * K.kw.haste + (e.hasten || 0) * K.hz); break;
      case 'evadeCtr': { const evn = (s.fx.find(x => x.k === 'evade') || { n: 1 }).n; const m = (e.charged ? K.hunt.ctrBig : K.hunt.ctr) * evn; v += m * (e.dmg + (e.chill || 0) * K.kw.chill); break; } // 피할 때마다 반격
      case 'quick': v += e.n * K.hunt.q; break; // 이번 차례 빠른 칸 +n
      case 'quickTurns': v += e.n * K.hunt.q; break; // 내 차례 n번 동안 빠른 칸 +1
      case 'foresee': v += e.red * e.rounds * K.hunt.fs; break; // 예고된 큰 공격 피해 줄이기 // 공격 스킬에 붙은 나에게 거는 상태
      case 'imbue': v += e.n * SB.kw[e.s] * SB.dl; break; // 마검사 칼에 싣기: 다음 베기가 한 적에게 건다
      case 'edgeX': v += (e.mul - 1) * SB.E * SB.kw.ignite * SB.edgeHas * (1 + 0.35 * (hits - 1)); break; // 칼의 원소 ×: 연타는 같은 스킬 안에서 바로 거둔다
      case 'kwx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * SB.on[e.s] * (multi ? tm : 1); break; } // 쓰기 직전 그 상태였던 적에게 ×
      case 'alt': v += (e.run === 2 ? SB.run2 : SB.alt) * ((e.ward || 0) * K.ward.v + (e.protect || 0) * K.kw.protect + (e.stam || 0) * 0.15 + (e.brk || 0) * K.brk * (multi ? tm : 1)); break; // 교대 보상
      case 'killSpread': v += SB.kill * Math.ceil(SB.S.bleed[hi] * e.per) * 1.5 * SB.kw.bleed; break; // 쓰러뜨린 적의 출혈을 다른 적 평균 1.5에게
      case 'hasten': if (e.on === 'ctr') { v += (e.n || 1) * K.hz * 0.9; break; } if (e.on === 'alt' || e.on === 'kill') { v += (e.n || 1) * K.hz * (e.on === 'alt' ? SB.alt : SB.kill); break; } if (e.on === 'evade') { v += (e.n || 1) * K.hz * K.hunt.ctr * ((s.fx.find(x => x.k === 'evade') || { n: 1 }).n); break; } { const pb = s.fx.find(x => x.k === 'parryBuff'); v += (e.n || 1) * K.hz * (e.on === 'parry' ? K.pOk * (pb ? (pb.times || 1) : 1) : 1); break; } // 🔄 다른 같은 갈래 스킬 쿨타임 당기기
    }
  }
  if (mk && s.tgt !== 'self') { const d = s.fx.find(x => x.k === 'dmg'); const kb = s.fx.find(x => x.k === 'kiBurst'); if (d) { if (s.time !== 'fast' && !(kb && !kb.max)) v += d.n * hits * mt * M.ride; } } // 수도승: ▶ 공격에 실리는 기 (모두 거두는 칸 제외. 10월 10일 단순화로 ⚡ 공격의 기 +1은 없다)
  const gx = s.fx.find(e => e.k === 'bigx'); if (gx) v *= 1 + (gx.mul - 1) * 0.3; // 큰 적에게 ×: 열에 셋쯤 큰 적 (10월 3일 50상황으로 넣음)
  return v;
}
/* 숨겨진 직업 1 점수 ('b_' 칸): 출혈 · 먹기 · 받은 피해 · 내 생명력 · 처치 보상 몫을 더하고, 나머지 효과는 공통 식(skValue)으로 센다 */
function skValueBu(s) {
  const B = SKK.butch, K = SKK, tm = K.tmul[s.tgt], hits = s.hits || 1, hi = (s.row || 0) >= 7 ? 1 : 0, multi = s.tgt === 'front' || s.tgt === 'all', am = multi ? tm : 1;
  const d = s.fx.find(x => x.k === 'dmg'); const dmgTot = d ? d.n * hits : 0; const S = B.S[hi]; const kp = B.killP[multi ? 1 : 0]; let add = 0; const keep = [];
  for (const e of s.fx) {
    if (e.k === 'st' && e.s === 'bleed' && s.tgt !== 'self') { add += e.n * B.bl * tm; continue; }
    if (e.k === 'meSt' && e.s === 'bleed') { add -= skTri(e.n) * B.selfHp; continue; }
    if (e.k === 'meSt' && e.on === 'kill') { add += e.n * (K.kw[e.s] || 1) * B.killP[0]; continue; }
    if (e.k === 'exploit' && e.s === 'bleed') { add += e.per * (e.me ? Math.min(e.max || 99, B.meS) * hits : S) * am; continue; }
    if (e.k === 'grow' && e.s === 'bleed') { add += (Math.min(10, Math.ceil(S * e.mul) + (e.add || 0)) - S) * B.bl * am; continue; }
    if (e.k === 'drain' && e.s === 'bleed' && e.me) { const t = Math.min(e.max || 99, B.meS); add += (e.dmg ? t * e.dmg : Math.min(4, t * (e.emp || 0)) * K.kw.empower) + skTri(t) * B.selfHp; continue; }
    if (e.k === 'drain' && e.s === 'bleed') { let t = S; if (e.max) t = Math.min(e.max, t); if (e.half) t = Math.ceil(t / 2);
      let v = t * e.per * B.hv - (e.kill ? 0 : t * B.bl * B.loss * (e.keep ? 1 - e.keep : 1));
      if (e.brk) v += t * e.brk * K.brk; if (e.weak) v += Math.min(3, Math.floor(t / e.weak)) * B.kwEat.weak; if (e.emp) v += Math.min(3, Math.floor(t / e.emp)) * B.kwEat.empower;
      add += e.kill ? v * kp * (multi ? 1.3 : 1) : v * am; continue; }
    if (e.k === 'spread' && e.s === 'bleed') { add += Math.ceil(B.spr * e.per) * 1.5 * B.bl * (e.kill ? kp * (multi ? 1.3 : 1) : 1); continue; }
    if (e.k === 'lowx' && e.me) { add += dmgTot * (e.mul - 1) * (B.low[e.hp] || 0.7 * e.hp) * am; continue; }
    if (e.k === 'grudge') { const t = B.took[hi]; let v = Math.min(e.max || 999, e.per * t) * hits; if (e.bl) v += Math.min(6, Math.floor(t / e.bl)) * B.bl; if (e.vu) v += Math.min(3, Math.floor(t / e.vu)) * K.kw.vuln; if (e.brk) v += Math.min(e.brkMax || 999, t * e.brk) * K.brk; add += v * am; continue; }
    if (e.k === 'carry') { add += B.killP[0] * (d ? d.n : 0) * Math.max(0, hits - 1) / 2; continue; }
    if (e.k === 'hasten' && e.on === 'kill') { add += (e.n || 1) * K.hz * kp; continue; }
    if (e.k === 'quick' && e.on === 'kill') { add += e.n * K.hunt.q * kp; continue; }
    if (e.k === 'thorn') { add += e.times * B.thornHit * ((e.dmg || 0) + (e.bleed || 0) * B.bl); continue; }
    if (e.k === 'onParry' && e.bleed) { add += K.pOk * e.bleed * B.bl; keep.push(Object.assign({}, e, { bleed: 0 })); continue; }
    keep.push(e);
  }
  const gx = s.fx.find(e => e.k === 'bigx'); const f = gx ? 1 + (gx.mul - 1) * 0.3 : 1;
  return skValue(Object.assign({}, s, { fx: keep, _bu: 1 })) + add * f;
}
/* 숨겨진 직업 3 점수 ('v_' 칸, 10월 7일 비공개 문서 C7): D · Dm 먹을 때 대상의 중독 [하급, 중급] · 여럿, hv 회복 실현 몫, lost 먹어 없앤 중독이 냈을 피해 가운데 잃는 몫, H Lv5 · Lv10 최대 생명력,
   cap 먹기 한 번 상한, hpv 낸 생명력 1의 값, paidAmt · paidShare 낸 피 칸을 쓸 때 앞서 낸 피와 그런 차례의 몫, payV · payUse 피로 당기기 한 번의 값과 깎은 값을 쓰는 몫, wAvg 당기는 평균 남은 쿨타임,
   Sk 쓰러질 때 남은 중독, pk · pkA 한 적 · 광역으로 쓰러뜨릴 몫, W 대상의 약화, Sw 퍼뜨릴 때 대상의 약화, spMax 번짐 상한, mk · mkLeft 표식 받은 적이 다른 적이 남은 채 쓰러질 몫 · 그때 남은 중독 비율 [가설] */
SKK.blood = { D: [2, 3], Dm: 1, hv: 0.7, lost: 0.5, H: [118, 138], cap: 0.25, hpv: 0.7, paidAmt: [10, 13], paidShare: 0.5, payV: 7, payUse: 0.6, Sk: 3, pk: 0.35, pkA: 0.25, W: 1.5, Sw: 2, spMax: 6, wAvg: 2.5, mk: 0.5, mkLeft: 0.6 };
function skValueBm(s) {
  const B = SKK.blood, K = SKK, tm = K.tmul[s.tgt], hits = s.hits || 1, hi = (s.row || 0) >= 7 ? 1 : 0, multi = s.tgt === 'front' || s.tgt === 'all', am = multi ? tm : 1;
  let add = 0, neg = 0; const keep = [];
  const hc = s.fx.find(e => e.k === 'hpCost'); const own = hc ? hc.pct * B.H[hi] : 0; const po = s.fx.find(e => e.k === 'poison');
  for (const e of s.fx) {
    if (e.k === 'drain' && e.eat) { const S = multi ? B.Dm : B.D[hi]; const t = e.max ? Math.min(e.max, S) : S; const N = multi ? tm : 1;
      add += Math.min(t * e.per * N, B.cap * B.H[hi]) * B.hv - (skTri(S) - skTri(S - t)) * B.lost * N + t * (e.dmg || 0) * N; continue; }
    if (e.k === 'hpCost') { neg += e.pct * B.H[hi] * B.hpv; continue; }
    if (e.k === 'bloodDmg') { add += e.per * Math.min(20, own + B.paidAmt[hi] * B.paidShare) * hits * am; continue; }
    if (e.k === 'payCut') { const frac = e.off != null ? Math.min(1, e.off / B.wAvg) : 1 - e.mul; add += e.n * B.payV * frac * B.payUse; continue; }
    if (e.k === 'spread' && e.mark) { add += B.mk * Math.min(B.spMax, Math.ceil((po ? po.n : 0) * B.mkLeft * e.per)) * 1.5 * K.poison; continue; }
    if (e.k === 'spread' && e.kill) { add += (multi ? B.pkA * tm : B.pk) * Math.min(B.spMax, Math.ceil(B.Sk * e.per)) * 1.5 * K.poison; continue; }
    if (e.k === 'spread' && e.s === 'weak') { add += Math.ceil(B.Sw * e.per) * 1.5 * K.kw.weak; continue; }
    if (e.k === 'spread' && !e.s) { add += Math.ceil((K.Sk.spread + (po ? po.n : 0)) * e.per) * 1.5 * K.poison; continue; } // 엔진은 같은 스킬의 중독을 먼저 걸고 번지기를 읽는다
    if (e.k === 'perDmg' && e.of === 'weak') { add += e.per * B.W * hits * am; continue; }
    keep.push(e);
  }
  const v0 = skValue(Object.assign({}, s, { fx: keep, _bm: 1 }));
  const gx = s.fx.find(e => e.k === 'bigx'); const f = gx ? 1 + (gx.mul - 1) * 0.3 : 1;
  return v0 + add * f - neg;
}
/* 원소술사 점수 가설 (10월 7일, docs/직업/원소술사.md C-8절). e_ 칸만 화상 · 둔화 · chillx 값을 SKK.elem으로 세고, 열충격 몫을 더한다. 다른 직업 점수는 바뀌지 않는다.
   kw: 화상 1 · 둔화 1의 값, Ib · Cb: 반대 원소가 이미 있을 때의 기대 화상 · 둔화, p1: 한 원소 칸이 열충격을 일으킬 몫, pH: 엮기가 반대 원소를 만날 몫,
   D · Bk: 열충격 피해 · 붕괴 배율(엔진 ELEM과 같다), tempo: 엮기가 짝을 맞추는 몫, hit: 되얼림이 실제로 발동하는 몫, burnI: 불태울 때 대상의 화상, burnLoss: 태운 화상이 덧피해로 냈을 몫,
   chx: 둔화된 적에게 × 칸이 둔화된 적을 만날 몫, pre: 두 원소를 함께 거는 칸이 만나는 남은 원소, arcN · arcCut: 번짐이 맞히는 다른 적 수 · 광역 감쇠 [가설, 50상황 측정 전] */
SKK.elem = { kw: { ignite: 2.5, chill: 3.5 }, Ib: 4, Cb: 1.5, p1: 0.4, pH: 0.6, D: 3, Bk: 12, tempo: 3, hit: 0.75, burnI: 6, burnLoss: 0.8, chx: 0.6, pre: 1, arcN: 1.5, arcCut: 0.85 };
function skShockGeom(s) { // 이 스킬이 일으킬 열충격의 (몫 p, T, 둔화 C)
  const X = SKK.elem; const st = s.fx.filter(x => x.k === 'st'); const ig = (st.find(x => x.s === 'ignite') || {}).n || 0, ch = (st.find(x => x.s === 'chill') || {}).n || 0; const wv = s.fx.find(x => x.k === 'weave');
  if (ig && ch) return { p: 1, T: ig + 2 * ch + X.pre, C: ch };
  if (wv) return { p: X.pH, T: ((wv.ign + 2 * X.Cb) + (X.Ib + 2 * wv.chill)) / 2, C: (X.Cb + wv.chill) / 2 };
  if (ch) return { p: X.p1, T: X.Ib + 2 * ch, C: ch };
  if (ig) return { p: X.p1, T: ig + 2 * X.Cb, C: X.Cb };
  return { p: 0, T: 0, C: 0 };
}
function skValueElem(s) {
  const K = SKK, X = K.elem; const tm = K.tmul[s.tgt]; const am = s.tgt === 'all' || s.tgt === 'front' ? tm : 1;
  const st = s.fx.filter(x => x.k === 'st'); const both = st.some(x => x.s === 'ignite') && st.some(x => x.s === 'chill');
  const s2 = Object.assign({}, s, { fx: s.fx.filter(x => !(both && x.k === 'st' && (x.s === 'ignite' || x.s === 'chill')) && !(x.k === 'hasten' && x.on === 'shock') && !(x.k === 'cutx' && x.chant)) });
  let v = skValue(s2, { kw: Object.assign({}, K.kw, X.kw), chx: X.chx });
  const gx = s.fx.find(x => x.k === 'bigx'); if (gx) v /= 1 + (gx.mul - 1) * 0.3;
  const g = skShockGeom(s);
  if (both) v += (X.D * g.T + X.Bk * K.brk * g.C) * am; // 두 원소를 함께 건다: 확정 열충격(상태 값은 남지 않는다)
  for (const x of s.fx) {
    if (x.k === 'weave') v += (x.ign * X.kw.ignite * (1 - X.pH / 2) + x.chill * X.kw.chill * X.pH / 2 + X.pH * X.tempo) * am;
    if (x.k === 'shockx') v += g.p * (((x.dmg || 1) - 1) * X.D * g.T + ((x.brk || 1) - 1) * X.Bk * g.C * K.brk + (x.arc || 0) * X.D * g.T * (x.dmg || 1) * X.arcN * X.arcCut + (x.keep ? x.keep.n * X.kw[x.keep.s] : 0)) * am;
    if (x.k === 'rime') v += x.times * X.hit * x.n * X.kw[x.s || 'chill'];
    if (x.k === 'burnOut') v += X.burnI * (x.per + x.brk * K.brk) - X.burnI * X.burnLoss;
    if (x.k === 'hasten' && x.on === 'shock') v += (x.n || 1) * K.hz * g.p;
    if (x.k === 'cutx' && x.chant) v += x.brk * K.brk * 0.25 * 0.5; // 영창일 때만: 기존 식의 절반
  }
  if (gx) v *= 1 + (gx.mul - 1) * 0.3;
  return v;
}
/* 숨겨진 직업 2 점수 가설 ('c_' 칸, 10월 7일. 50상황 측정 전). cap: 세는 숫자 상한, C: 정화 · 사함 · 옮기기를 쓸 때 내 짐(적이 건 몫) [하급, 중급], share: 짐 가운데 상태별 몫(중독은 짐이 아니다),
   cv: 내 해로운 상태 1을 없앤 값, give: 적에게 건 상태 1의 값, hasteOrd: 가속 1(순서만), B: 짐 비례 때 내 짐, P: 보호 비례 때 내 보호, CT: 앞서 이번 차례에 지운 숫자,
   tgt: 대상의 약화 · 출혈 · 해로운 상태, self: 스스로 진 상태 1의 대가, fuel: 고행 갈래에서 스스로 진 1이 짐 비례로 돌아오는 값, emp: 벗길 강화가 있을 몫, cleanP: 지울 것이 있을 몫(🔄 · 빠른 칸 덤), spendLoss: 써 버린 보호가 막았을 몫 */
SKK.conf = { cap: 5, C: { self: [2.2, 2.2], hit: [0.3, 0.3] }, O: [0.9, 0.5], X: [0.5, 0.5], share: { vuln: 0.29, weak: 0.23, bleed: 0.43, ignite: 0.05, chill: 0.02 }, cv: 2, give: { weak: 1.5, vuln: 1.5, bleed: 1.5, ignite: 1.2, chill: 1.5 }, hasteOrd: 4, B: [1.8, 1.25], P: [0.45, 0.2], CT: [0.6, 0.75], tgt: { weak: [0.45, 2.6], bleed: [0.2, 0.05], tbad: [1.3, 1.3] }, self: { bleed: 1, ignite: 1, chill: 2, vuln: 2.5, weak: 2 }, fuel: 2, emp: 0.05, cleanP: 0.4, spendLoss: 0.5 };
/* 10월 7일 50상황 측정(성향 신중 3판, 1챕터 기준 세기, tools 밖 측정 스크립트): 쓸 때 적이 건 짐 하급 0.82 · 중급 0.49, 상태별 몫 취약 0.29 · 약화 0.23 · 출혈 0.43 · 화상 0.05, 짐 비례 때 짐 1.78 · 1.23,
   보호 비례 때 보호 0.46 · 0.15(보호가 없어도 친다), 앞서 지운 숫자 0.57 · 0.76(빠른 정화를 먼저 쓸 수 있을 때만 순서를 맞춘다), 대상 약화 0.42 · 2.66 · 대상 해로운 상태 1.34 · 출혈 0.04, 벗길 강화가 있던 몫 하급 10% · 중급 3%, 지울 것이 있던 몫 약 40%.
   칸마다: 나에게 쓰는 정화 칸(고해 · 사죄의 기도 · 대사면 등, 지울 짐이 있을 때 쓴다)은 쓸 때 적이 건 짐 약 2.2, 공격에 붙은 정화는 0.1~0.4(C.self · C.hit), 사함은 고행 몫까지 0.9 · 0.5(O), 옮기기는 0.5(X).
   설계 가설(C 2.5 · 3.2, B 3 · 4, P 1.5 · 2)보다 재료가 훨씬 적어, 이 값으로 다시 맞추면 정화 덤과 피해 몸통이 오른다(설계 남은 위험 1의 순서) */
const CF_NEWK = ['cleanse', 'transfer', 'perDmg', 'dispel'], CF_BAD = ['poison', 'bleed', 'ignite', 'weak', 'vuln', 'chill'];
function skValueConf(s) {
  const K = SKK.conf, hi = (s.row || 0) >= 7 ? 1 : 0, multi = s.tgt === 'front' || s.tgt === 'all', tm = SKK.tmul[s.tgt], hits = s.hits || 1;
  const deep = e => s.tgt === 'self'; /* 나에게 쓰는 정화 칸은 지울 짐이 있을 때 쓴다(공격에 붙은 정화는 치는 김에) */ const cP = s.tgt === 'self' ? 1 : K.cleanP; // 나에게 쓰는 칸의 덤(빠른 칸 · 가속 · 🔄)은 지울 것이 있을 때 쓰므로 거의 늘 든다
  const shareOf = only => only ? only.reduce((a, k) => a + (K.share[k] || 0), 0) : 1; const cnt = e => Math.min(e.n || 99, K.cap, (e.k === 'transfer' ? K.X[hi] : e.offer ? K.O[hi] : deep(e) ? K.C.self[hi] : K.C.hit[hi]) * shareOf(e.only)); const protOf = c => c <= 0 ? 0 : Math.min(3, c / 2 + 0.5 * Math.min(1, c));
  const old = s.fx.filter(e => !CF_NEWK.includes(e.k) && !(e.k === 'meSt' && CF_BAD.includes(e.s)) && !(e.k === 'hasten' && e.on === 'clean'));
  const gx = s.fx.find(e => e.k === 'bigx'); const gm = gx ? 1 + (gx.mul - 1) * 0.3 : 1;
  let v = skValue(Object.assign({}, s, { fx: old, _cf: 1 })) / gm; // 기존 효과 (bigx 배수는 끝에 한 번)
  const lx = s.fx.find(e => e.k === 'lowx'); let extra = 0; const cl = s.fx.find(e => e.k === 'cleanse'); const cc = cl ? cnt(cl) : 0;
  for (const e of s.fx) {
    switch (e.k) {
      case 'cleanse': v += cc * K.cv;
        if (e.offer) { const d = cc * (e.dmg || 0) * (multi ? tm : 1); v += d + cc * (e.brk || 0) * SKK.brk * (multi ? tm : 1); extra += d; }
        else v += protOf(cc) * SKK.kw.protect + cc * (e.heal || 0) + cc * (e.stam || 0) * 0.15 + (e.quick ? cP * SKK.hunt.q : 0) + (e.haste ? K.hasteOrd * cP : 0);
        break;
      case 'transfer': { const m = cnt(e); const ks = e.only || ['weak', 'vuln', 'bleed', 'ignite']; const gv = ks.reduce((a, k) => a + K.give[k] * K.share[k], 0) / ks.reduce((a, k) => a + K.share[k], 0);
        v += m * K.cv + m * gv + (e.add || 0) * K.give[e.addK || ks[0]] * (multi ? tm : 1);
        const vp = s.fx.find(x => x.k === 'vulnPer'); if (vp && (!e.only || e.only.includes('vuln'))) v += Math.min(m, K.X[hi] * K.share.vuln) * vp.per * 0.6 + ((e.addK || ks[0]) === 'vuln' ? (e.add || 0) * vp.per : 0);
        break; }
      case 'perDmg': { let X;
        if (e.of === 'prot') X = Math.min(5, K.P[hi] + (cl && !cl.offer && !cl.after ? protOf(cc) : 0));
        else if (e.of === 'burden') X = K.B[hi];
        else if (e.of === 'clean') X = K.CT[hi];
        else if (e.of === 'tbad') { const tr = s.fx.find(x => x.k === 'transfer'); X = Math.min(5, K.tgt.tbad[hi] + (tr ? cnt(tr) * 0.6 : 0)); }
        else { const tr = s.fx.find(x => x.k === 'transfer' && (!x.only || x.only.includes(e.of))); X = Math.min(5, K.tgt[e.of][hi] + (tr ? (tr.add || 0) : 0)); }
        const d = (e.per || 0) * X * hits * (multi ? tm : 1); v += d + (e.brk || 0) * X * SKK.brk * (multi ? tm : 1); extra += d;
        if (e.spend) v -= X * SKK.kw.protect * K.spendLoss;
        break; }
      case 'dispel': v += K.emp * Math.min(e.n || 5, 2) * SKK.kw.empower * (multi ? tm : 1); break;
      case 'meSt': if (CF_BAD.includes(e.s)) v += e.n * ((s.b === '고행' ? K.fuel : 0) - K.self[e.s]); break;
      case 'hasten': if (e.on === 'clean') v += (e.n || 1) * SKK.hz * cP; break;
    }
  }
  if (lx) v += extra * (lx.mul - 1) * 0.35;
  return v * gm;
}
/* 전투 한 번에 쓰는 횟수: 처음 1번 + (남은 차례 + 갈래 규칙으로 줄어드는 대기) / (대기 + 1). 전투마다 1번은 1 */
function skUses(s) { if (s.once) return 1 + (s.killRecharge ? 0.3 : 0); return Math.min(SKK.Fmax, 1 + (SKK.turns + (SKK.haste[s.hs] || 0)) / (s.cd + 1) + (s.killRecharge ? 0.5 : 0)); }
/* 갈래 보정 (10월 3일, tools/sitqa.js 50상황 실측): 같은 점수라도 갈래마다 실제로 버는 몫이 다르다.
   쿨타임 하나로 바꾸며(3차 결정) 다시 쟀다: 갈래 규칙을 빼도 50상황 갈래 평균은 그대로였으므로, 지금 수치가 줄 예산 가운데에 오는 값(예전 ×0.85 · ×1.08 · ×1.1) */
SKK.clsB = { h_: 0.9, e_: 1.2, sb: 0.9, v_: 1.2, m_: 1.2, c_: 1.15, b_: 1.2 }; /* v_: 숨겨진 직업 3 (10월 8일 1.1 → 1.2, 까닭은 비공개 문서). sb: 마검사 (10월 7일 가설: 교대 보호막이 스킬 예산 밖의 직업 몫). 직업은 id 앞 두 글자로 고른다(sb_는 파수꾼 s_와 겹치지 않는다) */ // 원소술사 1.1: 기본 공격(마력 화살 50%)이 약한 만큼 스킬이 세다 (10월 7일 설계 원칙 9)
SKK.clsMid = { h_: 0.85 }; // 직업마다 중급(7~10줄) 예산 배율 (10월 5일 만든 사람: 사냥꾼은 한 갈래를 몰아 찍어도 강해지지 않는다. 깊은 칸은 더 센 한 방보다 새 효과)
SKK.clsAdj = { h_: 1.4, b_: 1, e_: 1, v_: 1 }; // 직업마다 실제로 버는 몫 (10월 5일 50상황: 사냥꾼 스킬은 조건 없이 바로 들어가는 피해라 점수보다 1.6배쯤 번다. 같은 예산이면 라운드당 피해가 암살자의 1.7배였다) // 직업마다 예산 배율 (10월 5일 만든 사람: 사냥꾼은 후열에 바로 닿는 물리직이라 화력이 암살자를 넘지 않게 90%)
SKK.brAdj = { 독사: 0.97, 격발: 1.1, 그림자: 0.95, 성벽: 1, 파쇄: 1, '전열 장악': 1, 도륙: 1, 광기: 1, 학살: 1, 서리: 0.9, 공명: 1.1, 마갑: 1.08, 혈도: 0.88, 속죄: 1, 전가: 1.1, 고행: 1, 역병: 1.08, 포식: 0.92, 혈약: 1.15, 기동: 0.85 }; // 혈도 (10월 7일 50상황): 둔화를 걸고 거두는 두 박자라 점수보다 덜 번다(Lv10 갈래 평균이 다른 두 갈래보다 11 낮았다) // 파수꾼 세 갈래는 50상황으로 재기 전이라 1 [가설]
/* 원소술사 갈래 몫 (10월 7일 50상황 12판, 기준 세기): 서리 0.9 · 공명 1.1 */
/* 0.8.0 5단계 연사 기본 공격 버프 한 칸의 값 (2-6a): 기간 안 기대 기본 공격 횟수 × 기본 공격 값 × 덤. D를 주면 그 기본 공격 피해로(skeval: 실제 무기 · 능력치) */
function skBbufV(e, D) { const B = SKK.hunt.bb, d = D || B.D; const n = Math.max(0, (B.n[e.s] || 1) + B.per * ((e.r || 0) - (B.r0[e.s] || 0)));
  return e.s === 'swap' ? n * B.sw * (d * ((e.mul || 1) - 1) + (e.bleed || 0)) : e.s === 'extra' ? n * (d * (e.mul || 0) + (e.turn ? B.sw * d * (1 + (e.mul || 0)) * (e.turn - 1) : 0)) : e.s === 'barb' ? n * (e.bleed || 0) : n * d * ((e.mul || 1) - 1); }
const skBbufE = (s, D) => s.fx.filter(e => e.k === 'bbuf').reduce((m, e) => m + skBbufV(e, D), 0) * (SKK.brAdj[s.b] || 1) * ((SKK.clsAdj || {})[String(s.id).slice(0, 2)] || 1); // skScore E 가운데 버프 몫
function skScore(s) { const E = skValue(s) * (SKK.brAdj[s.b] || 1) * ((SKK.clsAdj || {})[String(s.id).slice(0, 2)] || 1); const net = E - SKK.B * SKK.T[s.time]; const F = skUses(s); return { E, net, F, V: net * F, B: Math.round(((s.row && SKK.rowB[s.row]) || SKK.budget[s.tier]) * ((SKK.clsB || {})[String(s.id).slice(0, 2)] || 1) * ((s.row || 0) >= 7 ? ((SKK.clsMid || {})[String(s.id).slice(0, 2)] || 1) : 1) * 10) / 10 }; }

/* 설명 문장. 키워드(중독, 붕괴, 터뜨리기, 흘리기)의 뜻은 설명창의 키워드 칸이 맡고, 스킬 문장은 숫자만 말한다 */
/* 쿨타임: 쓰고 나면 cd만큼 내 턴을 기다린다(내 턴이 끝날 때마다 1 준다). 갈래 규칙(TREE2.haste)은 10월 3일에 없앴다: 아래 SK_HS는 다시 쓸 때를 위해 남긴다 */
const SK_HS = { poison: '독을 걸면', kill: '적을 쓰러뜨리면', parry: '흘려 내면', break: '정예 이상을 무너뜨리면' };
const SK_HSL = { poison: '독을 건 행동마다', kill: '적을 쓰러뜨린 행동마다', parry: '흘리기에 성공할 때마다', break: '정예 · 강적 · 보스를 무너뜨린 행동마다' };
for (const k in TREE2) for (const x of (SKILLS2[k] || [])) x.hs = (TREE2[k].haste || {})[x.b] || null; // 스킬마다 갈래 규칙을 붙여 둔다
/* 10월 15일 유산 1차 시제품: 스킬 비용은 데이터의 cd에서 기계적으로 만든다(설계안 4-1). 시작 스킬과 cd 3–5 → 2, 6–8 → 3, 9–10과 전투마다 1번 → 4. cd는 다른 도구가 읽으므로 데이터에 남긴다 */
function skCost(s) { if (!s) return 0; if (s.ys != null) return s.ys; if (s.once) return 4; return 2; } // 0.8.0 M5-0(10월 19일): 비용은 트리 노드의 ys(skOf가 넣음)만 읽는다. 쿨타임 변환표 · cheap 분기는 없앴다. 노드 밖(시작 스킬 등)은 2, 전투마다 1번은 4. 트리 스킬의 ys 누락은 tree-check 오류
/* S-2 · S-3(10월 24일 만든 사람): 유산 1짜리 스킬이 생명력 회복 · 보호 · 보호막 · 회피(몸 빼기)를 주면 다음 내 차례 시작의 유산 충전이 없다(차례 충전 +1과 맞물려 매 차례 공짜인 영구 상태 막기). 대응 · 다른 충전은 그대로.
   효과: 회복(wdPray · mkDrainChill · drain, 내 출혈을 지우는 me는 빼고) · 보호막(ward · wardPer · wardFill · sbSinWall) · 보호(나에게 거는 protect · elProtR) · 회피(evade).
   비용: 트리 · 변형 · 강화로 정해진 비용이 1 이하인 칸(ysHealSk), 또는 변형의 조건 할인(cond)으로 1이 되어 쓴 때(ysCondSk). 장비 · 접사 · 첫 스킬 · 교대 같은 다른 할인은 넣지 않는다 */
const YS_HEAL_K = ['wdPray', 'mkDrainChill'], YS_GUARD_K = ['ward', 'wardPer', 'wardFill', 'sbSinWall', 'evade', 'elProtR'];
const ysGuardFx = s => !!(s && s.fx) && s.fx.some(e => YS_HEAL_K.includes(e.k) || YS_GUARD_K.includes(e.k) || (e.k === 'drain' && !e.me) || (e.k === 'meSt' && e.s === 'protect') || (e.k === 'st' && e.s === 'protect' && s.tgt === 'self'));
const ysHealSk = s => ysGuardFx(s) && skCost(s) <= 1; // 이름은 S-2 그대로(S-3에서 보호 · 회피까지 넓힘)
const ysCondSk = s => ysGuardFx(s) && skCost(s) > 1 && (s.cond || []).length > 0;
const skYsTail = s => ysHealSk(s) ? ' 쓰면 다음 차례 유산 충전 없음.' : ysCondSk(s) ? ' 비용 1로 쓰면 다음 차례 유산 충전 없음.' : '';
function skCd(s) { return '유산 ' + skCost(s) + (s.once ? ' · 전투마다 1번' : ''); }
const skCharge = skCd; // 옛 이름
const skHz = s => !!(s && s.fx && s.fx.some(e => e.k === 'hasten')); // 🔄 표시를 붙일 스킬
const SK_KIND = { cut: '⚔ 베기', spell: '✦ 주문' }; // 마검사 행동 종류 (kind)
function skHead(s) { return `${SKK.TGN[s.tgt]}${s.kind ? ' · ' + SK_KIND[s.kind] : ''} · ${SKK.TN[s.time]} · ${skCd(s)}` + (skHz(s) ? ' · 🔄' : ''); }
/* 갈래 규칙 한 줄 (트리 갈래 설명, 도움말) */
function skHasteLine(hs, br) { return hs ? `${SK_HSL[hs]} ${br} 스킬의 남은 대기가 1 준다(한 행동에 한 번).` : ''; }
const SK_KWN = { weak: '약화', vuln: '취약', chill: '둔화', bleed: '출혈', ignite: '화상', protect: '보호', haste: '가속', empower: '강화' };
const skJoW = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? a : b; }; // 낱말 뒤 조사 (받침이 있으면 a)
const skKw = (s, k) => k === 'empower' && String(s.id).slice(0, 2) === 'm_' ? '기' : (SK_KWN[k] || k); // 수도승의 강화는 "기"
const skPer = (per, what) => per >= 1 ? `대상의 중독 1마다 ${what} +${per}` : `대상의 중독 ${Math.round(1 / per)}마다 ${what} +1`;
/* 숨겨진 직업 1 ('b_' 칸)의 효과 문장. null이면 공통 문장, ''이면 문장 없음 */
const skPct = v => v >= 1 ? (v === 1 ? '' : v + '배') : Math.round(v * 100) + '%';
function skBodyBu(s, e, late) {
  const hits = s.hits || 1; const each = hits > 1 ? '한 번에 ' : ''; const many = s.tgt === 'front' || s.tgt === 'all';
  switch (e.k) {
    case 'meSt': if (e.s === 'bleed') return ''; if (e.on === 'kill') return `이 스킬로 적을 쓰러뜨리면 나에게 ${SK_KWN[e.s] || e.s} ${e.n}.`; return null;
    case 'drain': if (e.s !== 'bleed') return null; if (e.me) return '';
      { const st = s.fx.find(x => x.k === 'st' && x.s === 'bleed'); const noHit = !s.fx.some(x => x.k === 'dmg');
        const amt = e.max ? `최대 ${e.max}까지` : e.half ? '절반(올림)만' : '모두';
        let t = e.kill ? '이 스킬로 쓰러뜨린 적의 출혈을 모두 먹는다.' : (noHit ? '' : '그 뒤 ') + (many ? '적마다 그 적의 ' : '대상의 ') + `출혈을 ${amt} 먹는다.`;
        t += ` 먹은 출혈 1마다 생명력 +${e.per}` + (e.brk ? `, 붕괴 +${e.brk}` : '') + '.';
        if (e.weak) t += ` 먹은 출혈 ${e.weak}마다 약화 1(최대 3).`; if (e.emp) t += ` 먹은 출혈 ${e.emp}마다 나에게 강화 1(최대 3).`;
        if (e.keep) t += ` 먹은 뒤 그 ${e.keep === 0.5 ? '절반' : Math.round(e.keep * 100) + '%'}(내림)이 대상에게 남는다.`;
        if (st && hits === 1) t += ` 먹은 뒤 출혈 ${st.n}${skJo(st.n)} 다시 건다.`;
        if (noHit) t += ' 피해는 주지 않는다. 출혈된 적에게만 쓸 수 있다.';
        return t; }
    case 'exploit': if (e.s !== 'bleed') return null;
      return e.me ? `내 출혈 1마다 피해 +${e.per}(${each}내 출혈은 ${e.max || 10}까지 센다).` : `${many ? '적마다 그 적의 출혈 1당' : '대상의 출혈 1마다'} 피해 +${e.per}. 출혈은 줄지 않는다.`;
    case 'grow': if (e.s !== 'bleed') return null; return ''; // 출혈 키우기는 피해 뒤에 일어나 문장 끝에 둔다 (skBody)
    case 'grudge': { const p = skPct(e.per); let t = `지난 내 차례 뒤 적에게 맞아 잃은 생명력${p ? '의 ' + p : ''}만큼 피해가 늘어난다(${each}최대 +${e.max}).`;
      if (e.bl) t += ` 그 잃은 생명력 ${e.bl}마다 출혈 1을 건다(최대 6).`; if (e.vu) t += ` 그 잃은 생명력 ${e.vu}마다 취약 1을 건다(최대 3).`; if (e.brk) t += ` 그 잃은 생명력 1마다 붕괴 +${e.brk}(최대 +${e.brkMax}).`; return t; }
    case 'lowx': return e.me ? `내 생명력이 ${Math.round(e.hp * 100)}% 이하면 피해 ×${e.mul}.` : null;
    case 'spread': if (e.s !== 'bleed') return null; return '이 스킬로 쓰러뜨리면 그 적에게 있던 출혈과 이 스킬의 출혈을 더한 만큼 다른 적 모두에게 출혈을 건다(한 번에 최대 6).';
    case 'hasten': if (e.on !== 'kill') return null; return `🔄 이 스킬로 적을 쓰러뜨리면 유산 +1(차례마다 한 번).`;
    case 'quick': if (e.on !== 'kill') return null; return `이 스킬로 적을 쓰러뜨리면 ${e.next ? '다음' : '이번'} 차례에 빠른 칸 +${e.n || 1}.`;
    case 'thorn': return `다음에 맞는 직접 공격 ${e.times}번은 때린 적에게 ${e.dmg ? '피해 ' + e.dmg + ', ' : ''}출혈 ${e.bleed}${skJo(e.bleed)} 건다. 이미 있으면 횟수를 더한다(최대 8번).`;
    case 'onParry': return `그 공격을 흘려 내면 그 적에게 ${[e.dmg ? '피해 ' + e.dmg : '', e.bleed ? '출혈 ' + e.bleed : '', e.brk ? '붕괴 +' + e.brk : ''].filter(Boolean).join(', ')}.`;
    case 'carry': return '대상이 쓰러지면 남은 타격은 근접으로 닿는 적 가운데 생명력이 가장 낮은 적에게 이어진다.';
  }
  return null;
}
/* 숨겨진 직업 2 ('c_' 칸)의 문장: 정화 · 사함 · 옮기기 · 벗기기 · 비례 · 고행 */
const cfList = only => only ? only.map(k => SK_KWN[k] || k).join(' · ') : '해로운 상태';
function skBodyConfPre(s) { // 피해 문장보다 먼저 일어나는 것 (옮기기 · 벗기기 · 정화 · 사함, 나에게 쓰는 칸의 고행)
  const out = []; const many = s.tgt === 'front' || s.tgt === 'all';
  for (const e of s.fx) {
    if (e.k === 'transfer') { const w = cfList(e.only); out.push(`내 ${w}${skJoW(w, '을', '를')} 모두 ${many ? '거두어 맞힌 적에게 나눠 건다' : '대상에게 옮긴다'}.`); if (e.add) { const a = SK_KWN[e.addK || (e.only || [])[0]] || ''; out.push(`그 뒤 ${many ? '맞힌 적마다 ' : ''}${a} ${e.add}${skJo(e.add)} 더 건다.`); } }
    if (e.k === 'dispel') out.push(many ? `모든 적의 강화를 ${e.n || 5}씩 벗긴다.` : `대상의 강화를 ${e.n ? e.n + '까지' : '모두'} 벗긴다.`);
    if (e.k === 'cleanse' && !e.after) { const w = cfList(e.only); const amt = e.n ? e.n : '모두';
      if (e.offer) { out.push(`내 ${w}${e.only ? '만' : '를'} ${amt} 바친다(사함).`); const g = [e.dmg ? '피해 +' + e.dmg : '', e.brk ? '붕괴 +' + e.brk : ''].filter(Boolean).join(', '); if (g) out.push(`바친 상태 1마다 ${g}${many ? '(맞힌 적마다)' : ''}.`); }
      else { out.push(`내 ${w}${e.only ? '만' : '를'} ${amt} 지운다(정화).`); if (e.heal) out.push(`지운 상태 1마다 생명력 +${e.heal}.`); if (e.stam) out.push(`지운 상태 1마다 스태미나 +${e.stam}.`); if (e.quick) out.push('하나라도 지우면 이번 차례에 빠른 칸 +1.'); if (e.haste) out.push('하나라도 지우면 나에게 가속 1.'); } }
  }
  const ms = s.fx.filter(e => e.k === 'meSt' && CF_BAD.includes(e.s)); if (ms.length && s.tgt === 'self') out.push(`나에게 ${ms.map(e => (SK_KWN[e.s] || e.s) + ' ' + e.n).join(', ')}(고행).`);
  return out;
}
function skBodyConf(s, e) { // null이면 공통 문장, ''이면 문장 없음
  switch (e.k) {
    case 'transfer': case 'dispel': return '';
    case 'cleanse': return e.after ? `친 뒤 내 ${cfList(e.only)}${e.only ? '만' : '를'} ${e.n || '모두'} 지운다(정화).` : '';
    case 'perDmg': { const g = [e.per ? '피해 +' + e.per : '', e.brk ? '붕괴 +' + e.brk : ''].filter(Boolean).join(', ');
      if (e.of === 'prot') return e.spend ? `내 보호를 모두 써서, 쓴 보호 1마다 ${g}.` : `내 보호 1마다 ${g}. 보호는 줄지 않는다.`;
      if (e.of === 'burden') return `내 짐 1마다 ${g}. 짐은 줄지 않는다.`;
      if (e.of === 'clean') return `이번 차례에 이 스킬 앞서 정화하거나 바친 적이 건 상태 1마다 ${g}. 고행으로 얻은 상태는 세지 않는다.`;
      if (e.of === 'tbad') return `대상의 해로운 상태 1마다 ${g}.`;
      { const w = SK_KWN[e.of] || e.of; return `대상의 ${w} 1마다 ${g}. ${w}${skJoW(w, '은', '는')} 줄지 않는다.`; } }
    case 'meSt': if (!CF_BAD.includes(e.s)) return null; if (s.tgt === 'self') return ''; { const ms = s.fx.filter(x => x.k === 'meSt' && CF_BAD.includes(x.s)); return ms[0] === e ? `행동이 끝나면 나에게 ${ms.map(x => (SK_KWN[x.s] || x.s) + ' ' + x.n).join(', ')}(고행).` : ''; }
    case 'hasten': return e.on === 'clean' ? `🔄 하나라도 지우면 유산 +1(차례마다 한 번).` : null;
  }
  return null;
}
/* 숨겨진 직업 3 ('v_' 칸)의 효과 문장. null이면 공통 문장, ''이면 문장 없음 */
function skBodyBm(s, e) {
  const many = s.tgt === 'front' || s.tgt === 'all';
  switch (e.k) {
    case 'hpCost': case 'drain': return e.k === 'drain' && !e.eat ? null : ''; // 앞에서 먼저 적는다
    case 'bloodDmg': return e.per >= 1 ? `이번 차례에 낸 생명력 1마다 피해 +${e.per}(20까지 센다).` : `이번 차례에 낸 생명력 ${Math.round(1 / e.per)}마다 피해 +1(20까지 센다).`;
    case 'payCut': return e.off != null ? `이번 전투에서 다음 피로 당기기 ${e.n}번은 모자란 유산 ${e.off} 몫까지 생명력이 들지 않는다.` : `이번 전투에서 다음 피로 당기기 ${e.n}번은 드는 생명력이 ${e.mul === 0.5 ? '절반' : Math.round(e.mul * 100) + '%'}이다.`;
    case 'spread':
      if (e.mark) return '이번 전투에서 이 적이 무엇으로든 쓰러지면, 그때 남아 있던 중독만큼(최대 6) 다른 적 모두에게 중독을 건다.';
      if (e.kill) return many ? '이 스킬로 쓰러뜨린 적마다 남아 있던 중독만큼(최대 6) 다른 적 모두에게 중독을 건다. 한 번 쓸 때 적 하나가 받는 번진 중독은 6까지다.' : '이 스킬로 적을 쓰러뜨리면 그 적에게 남아 있던 중독만큼(최대 6) 다른 적 모두에게 중독을 건다.';
      if (e.s === 'weak') return `대상의 약화${(e.per || 1) === 1 ? '만큼' : ' × ' + e.per + '만큼'} 다른 적 모두에게 약화를 건다. 대상의 약화는 그대로다.`;
      return null;
    case 'perDmg': return many ? `적마다 그 적의 약화 1당 피해 +${e.per}. 이 스킬의 약화를 걸기 전 숫자로 센다. 약화는 줄지 않는다.` : `대상의 약화 1마다 피해 +${e.per}. 약화는 줄지 않는다.`;
  }
  return null;
}
/* 0.8.0 M5-2 수도승 칸의 한 줄 설명(만든 사람: 칸 설명은 한 줄, 효과는 칸마다 하나). 숫자는 효과에서 읽어 변형을 따라간다. 대가는 skDescHtml이 따로 */
const MK_DESC_MAX = 40;
function skBodyMk(s) {
  const hits = s.hits || 1, multi = s.tgt === 'front' || s.tgt === 'all', P = [];
  for (const e of s.fx) switch (e.k) {
    case 'dmg': P.push((multi ? (s.tgt === 'front' ? '전열 모두에게 ' : '모든 적에게 ') : '') + '피해 ' + e.n + (hits > 1 ? ' × ' + hits + '타' : '')); break;
    case 'brk': P.push('붕괴 +' + e.n); break;
    case 'st': P.push(s.tgt === 'self' ? (e.s === 'empower' && !s.hn5 ? '기 +' + e.n : e.s === 'empower' ? '다음 공격 피해 ×1.25' : '나에게 ' + skKw(s, e.s) + ' ' + e.n) : (multi && s.hn5 && !s.fx.some(x => x.k === 'dmg') ? (s.tgt === 'front' ? '전열 모두에게 ' : '모든 적에게 ') : '') + skKw(s, e.s) + ' ' + e.n); break;
    case 'focusx': P.push('추적 겹마다 피해 +' + Math.round(e.per * 100) + '%'); break;
    case 'focusAdd': P.push('추적 ' + e.n + '겹'); break;
    case 'evadeCtr': P.push((e.rounds ? e.rounds + '라운드 ' : '') + '피하면 반격 사격 ' + e.dmg + (e.focus ? '(추적 +' + e.focus + '겹)' : '')); break;
    case 'chillCut': P.push('둔화된 채 모으는 적의 공격을 끊음'); break;
    case 'freeze': P.push('대상이 다음 행동을 놓침'); break;
    case 'foresee': P.push(e.rounds + '라운드 큰 공격(강타 · 겨눈 한 발 · 화형) 피해 −' + Math.round(e.red * 100) + '%'); break;
    case 'bbuf': P.push(((e.r || 0) + 1) + '라운드 기본 공격에 ' + (e.s === 'barb' ? '출혈 ' + e.bleed : e.s)); break;
    case 'hnTrap': P.push(e.txt.replace(/\.$/, '') + (e.mul ? ' · 걸린 적에게 무기 피해의 ' + e.mul + '배' : '')); break;
    case 'kiHits': P.push(e.max === 1 ? '기가 있으면 +1타' : '기 1마다 1타 추가(최대 ' + e.max + ')'); break;
    case 'kiBurst': P.push((e.max ? '기를 ' + e.max + '까지' : '기를 모두') + ' 쏟아 기마다 ' + (e.mul ? '피해 +' + Math.round(e.mul * 100) + '%' : '+' + e.per) + (e.brk ? ' · 붕괴 +' + e.brk : '')); break;
    case 'kiPer': P.push('기마다 피해 +' + e.per); break;
    case 'stam': P.push('스태미나 +' + e.n); break;
    case 'poison': P.push((multi ? (s.tgt === 'front' ? '전열 모두에게 ' : '모든 적에게 ') : '') + '중독 ' + e.n); break;
    case 'burst': P.push((e.pre ? '중독 ' + e.pre + '을을를을를를을을을를'[e.pre % 10] + ' 건 뒤 ' : '') + (multi ? '전열 모두의 ' : '대상 ') + '중독을 터뜨림' + (e.mul && e.mul !== 1 ? '(터뜨리기 피해 ' + e.mul + '배)' : '') + (e.big ? '(정예 · 보스는 터뜨리기 피해 ' + e.big + '배)' : '')); break;
    case 'grow': P.push('대상 중독 ×' + e.mul); break;
    case 'spread': P.push('대상 중독 ' + (e.per === 0.5 ? '절반' : Math.round(e.per * 100) + '%') + '을 다른 적 모두에게'); break;
    case 'exploit': P.push('대상 중독 1마다 피해 +' + e.per); break;
    case 'brkPer': P.push('대상 중독 1마다 붕괴 +' + e.per); break;
    case 'brokenx': P.push('무너진 적에게 ×' + e.mul); break;
    case 'asBackx': P.push((e.low ? '생명력 ' + Math.round(e.low * 100) + '% 이하 ' : '') + '후열 적에게 ×' + e.mul); break;
    case 'evade': P.push(s.hn5 ? '몸 빼기 ' + e.n : '다음에 맞는 공격 ' + e.n + '번을 피함'); break;
    case 'parry': P.push('다음 공격을 흘림(' + Math.round(e.red * 100) + '%)'); break; // 대상은 버튼에서 고른다
    case 'onParry': P.push('흘려 내면 그 적에게 ' + [e.dmg ? '피해 ' + e.dmg : '', e.poison ? '중독 ' + e.poison : '', e.brk ? '붕괴 +' + e.brk : ''].filter(Boolean).join(' · ')); break;
    case 'parryBuff': P.push('다음 흘리기' + ((e.times || 1) > 1 ? ' ' + e.times + '번' : '') + ' +' + Math.round((e.red || 0) * 100) + '%p' + (e.stam ? ' · 스태미나 없이' : '') + (e.dmg ? ' · 흘려 내면 피해 ' + e.dmg : '') + (e.poison ? ' · 흘려 내면 중독 ' + e.poison : '')); break;
    case 'meSt': P.push(e.if === 'chill' ? '둔화된 적이면 기 +' + e.n : e.if === 'hit' ? '맞은 적마다 기 +' + e.n : '기 +' + e.n); break;
    case 'sealx': P.push('지원 행동 봉인'); break;
    case 'chillx': P.push('둔화된 적에게 ×' + e.mul); break;
    case 'rime': P.push('나를 친 적 다음 ' + e.times + '번 ' + skKw(s, e.s || 'chill') + ' ' + e.n); break;
    case 'elRimeR': P.push(e.r + '라운드 나를 친 적에게 ' + skKw(s, e.s) + ' ' + e.n); break;
    case 'shockx': P.push(e.arc ? '열충격이 다른 적에게 ' + Math.round(e.arc * 100) + '%' : '열충격 ×' + (e.dmg || 1)); break;
    case 'burnOut': P.push('대상 화상을 모두 태워 1마다 피해 +' + e.per + ' · 붕괴 +' + e.brk); break;
    case 'thorn': P.push('맞을 때마다 때린 적에게 피해 ' + e.dmg + ' · ' + e.times + '번'); break;
    case 'kwx': P.push(skKw(s, e.s) + ' 걸린 적에게 ×' + e.mul); break;
    case 'ward': P.push('보호막 +' + e.n); break;
    case 'bigx': P.push('정예 · 강적 · 보스에게 ×' + e.mul); break;
    case 'stance': { const L = ['자세'];
      if (e.red) L.push('받는 피해 −' + Math.round(e.red * 100) + '%'); if (e.dmg) L.push('되받기 +' + e.dmg); if (e.mul) L.push('되받기 ×' + (1 + e.mul)); if (e.max) L.push(e.max + '번까지'); if (e.keep) L.push(e.keep + '차례 유지');
      if (e.big) L.push('강타를 되받으면 무너뜨림'); if (e.far) L.push('후열도 되받음'); if (e.ki) L.push('되받으면 기 +' + e.ki); if (e.brk) L.push('되받기 붕괴 +' + e.brk); if (e.chill) L.push('되받은 적 둔화 ' + e.chill);
      P.push(s.tgt === 'self' ? L.join(' · ') : '친 뒤 ' + L.join(' · ')); break; }
    default: if (e.txt) P.push(e.txt.replace(/\.$/, ''));
  }
  return P.join(' · ') + '.';
}
function skBody(s) {
  if (s.mk5 || s.as5 || s.hn5 || s.el5) return skBodyMk(s) + skYsTail(s) + (s.pay ? ' 대가: ' + s.pay : ''); // M5-2 수도승 · M5-3 암살자 한 줄 설명
  const out = []; const hits = s.hits || 1; const parts = []; const first = []; const burnWard = s.fx.some(e => e.k === 'wardBurn'); const isE = String(s.id).slice(0, 2) === 'e_'; // first: 연타의 첫 타격에만 거는 상태 (마검사 연타 칸)
  const eMulti = isE && hits > 1 && s.fx.some(e => e.k === 'st'); // 원소술사 여러 번 쏘기: 상태는 첫 발 뒤에 걸려 다음 발부터 쓴다 (엔진 그대로, 문장만)
  const cf = String(s.id).slice(0, 2) === 'c_'; if (cf) out.push(...skBodyConfPre(s)); // 숨겨진 직업 2: 옮기기 · 벗기기 · 정화 · 사함은 피해보다 먼저
  const bm = /^v_/.test(String(s.id)); // 숨겨진 직업 3: 생명력 내기 · 먹기는 다른 효과보다 먼저 적는다
  const bu = /^b_/.test(String(s.id)); const eatT = bu && s.fx.find(e => e.k === 'drain' && e.s === 'bleed' && !e.me); const late = []; // 숨겨진 직업 1: 먹는 칸의 출혈은 먹은 뒤 다시 건다, 연타의 상태는 첫 타격 뒤
  for (const e of s.fx) {
    if (bm && e.k === 'hpCost') out.push(`먼저 최대 생명력의 ${Math.round(e.pct * 100)}%를 낸다.`);
    if (bm && e.k === 'drain' && e.eat) { const who = s.tgt === 'front' ? '전열 모두의 중독을 적마다 ' : s.tgt === 'all' ? '모든 적의 중독을 적마다 ' : '대상의 중독을 ';
      out.push(who + (e.max ? `최대 ${e.max}까지` : '모두') + ` 먹는다. 먹은 중독 1마다 생명력 +${e.per}` + (e.dmg ? `, 그 적에게 피해 +${e.dmg}` : '') + '.'); }
    if (bu && e.k === 'meSt' && e.s === 'bleed') out.push(`먼저 나에게 출혈 ${e.n}${skJo(e.n)} 건다.`);
    if (bu && e.k === 'drain' && e.s === 'bleed' && e.me) out.push('먼저 내 출혈을 모두 지운다. ' + (e.dmg ? `지운 출혈 1마다 이 스킬의 피해 +${e.dmg}(${e.max || 10}까지 센다).` : `지운 출혈 1마다 나에게 강화 ${e.emp || 1}(최대 4).`));
  }
  for (const e of s.fx) {
    if (e.k === 'dmg') parts.push(s.id==='tut_bash' ? `피해 ${e.n}` : `기준 피해 ${e.n}(${skillGrowthStat(s)==='int'?'지능':skillGrowthStat(s)==='dex'?'민첩·무기':'힘·무기'}로 성장)`);
    if (e.k === 'poison') parts.push(`중독 ${e.n}`);
    if (e.k === 'brk') parts.push(`붕괴 +${e.n}`);
    if (e.k === 'st' && !eMulti) { const t = `${s.tgt === 'self' ? '나에게 ' : ''}${skKw(s, e.s)} ${e.n}`; if (bu && ((eatT && e.s === 'bleed') || hits > 1)) late.push(e); else (s.kind && hits > 1 && s.tgt !== 'self' ? first : parts).push(t); }
    if (e.k === 'ward' && !((s.kind || String(s.id).slice(0, 2) === 'w_') && burnWard)) parts.push(`${s.tgt === 'self' ? '' : '나에게 '}보호막 +${e.n}`);
  }
  if (parts.length) out.push((hits > 1 ? `${hits}번 ${(cf || String(s.id).slice(0, 2) === 'm_') ? '친다' : s.tgt === 'ranged' || s.tgt === 'all' ? '쏜다' : (bu || s.kind) ? '벤다' : '찌른다'}. 한 번에 ` : '') + (s.tgt === 'front' && bu ? '전열 모두에게 ' : '') + parts.join(', ') + '.');;
  if (bu && hits > 1 && late.length) out.push('첫 타격 뒤 ' + late.map(e => (SK_KWN[e.s] || e.s) + ' ' + e.n).join(', ') + '.');
  if (first.length) { const l = first[first.length - 1]; out.push(`${s.tgt === 'ranged' || s.tgt === 'all' ? '첫 발' : '첫 칼'}에 ${first.join(', ')}${skJo(l.slice(-1))} 건다.`); }
  if (eMulti) for (const e of s.fx) if (e.k === 'st') out.push(`첫 발이 ${SK_KWN[e.s] || e.s} ${e.n}${skJo(e.n)} 걸고, 다음 발부터 그 ${SK_KWN[e.s] || e.s}${e.s === 'ignite' ? '을 태운다' : '를 쓴다'}.`);
  if (isE && s.fx.some(e => e.k === 'st' && e.s === 'ignite') && s.fx.some(e => e.k === 'st' && e.s === 'chill')) out.push(s.tgt === 'all' || s.tgt === 'front' ? '적마다 두 원소가 함께 걸려 바로 열충격이 일어난다.' : '두 원소가 함께 걸려 바로 열충격이 일어난다.');
  for (const e of s.fx) {
    if (bu) { const t = skBodyBu(s, e, late); if (t !== null) { if (t) out.push(t); continue; } }
    if (cf) { const t = skBodyConf(s, e); if (t !== null) { if (t) out.push(t); continue; } }
    if (bm) { const t = skBodyBm(s, e); if (t !== null) { if (t) out.push(t); continue; } }
    if (SB_BD_K.includes(e.k) || WD_K.includes(e.k) || (e.k === 'imbue' && (e.txt || (!e.also && s.fx.some(x => x.k === 'imbue' && x.also && x.txt))))) { if (e.txt) out.push(e.txt); continue; } // 0.8.0 M5-0 마검사 경계 · M5-1 파수꾼(WD_K): 만든 사람 문장 그대로(txt). 파수꾼 칸은 전에 이 길에 없어 태세 · 기도 · 승부수 효과 문장이 비어 보였다
    switch (e.k) {
      case 'grow': out.push(`대상의 중독을 ${e.mul}배로 만든다.` + (e.add ? ` 그 뒤 중독 ${e.add}.` : '')); break;
      case 'burst':
        out.push((e.pre ? `중독 ${e.pre}${skJo(e.pre)} 건 뒤 ` : '') + (s.tgt === 'all' ? '모든 적의 중독을 모두 터뜨린다.' : e.half ? '대상의 중독을 절반(올림)만 터뜨린다.' : e.top ? `대상의 중독을 ${e.top}만 터뜨린다.` : '대상의 중독을 모두 터뜨린다.')
          + (e.mul && e.mul !== 1 ? ` 터뜨린 피해 ×${e.mul}.` : '')
          + (e.brkPer ? ` 터뜨린 중독 1마다 붕괴 +${e.brkPer}.` : '')
          + (e.keep ? ` 터뜨린 뒤 중독이 ${e.keep === 0.5 ? '절반' : Math.round(e.keep * 100) + '%'} 남는다.` : '') + ' 독 격발 피해는 지능 1점마다 '+TRIGGER_STAT_PCT+'% 증가한다.'); break;
      case 'exploit': if (e.s) { const w = SK_KWN[e.s]; out.push(e.take ? `대상의 ${w}${skJoW(w, '을', '를')} 모두 거둬 1마다 피해 +${e.per}. ${w}${skJoW(w, '은', '는')} 사라진다.` : `대상의 ${w} 1마다 피해 +${e.per}.` + (e.s === 'bleed' ? ` ${w}${skJoW(w, '은', '는')} 줄지 않는다.` : '')); break; } out.push(`${skPer(e.per, '피해')}. 중독은 줄지 않는다.`); break;
      case 'imbue': out.push(`칼에 ${SK_KWN[e.s]} ${e.n}${skJo(e.n)} 싣는다.`); break;
      case 'edgeX': out.push(`이 베기가 칼에 실린 원소를 걸면 그 숫자가 ${e.mul}배다(상한 10).`); break;
      case 'kwx': { const w = SK_KWN[e.s]; out.push(`${w}${skJoW(w, '이', '가')} 걸려 있던 적에게는 피해 ×${e.mul}.`); break; }
      case 'alt': { const g = [e.brk ? '붕괴 +' + e.brk : '', e.ward ? '보호막 +' + e.ward : '', e.protect ? '보호 ' + e.protect : '', e.stam ? '스태미나 +' + e.stam : ''].filter(Boolean).join(', ');
        out.push(e.run === 2 ? `교대가 두 번 이어졌으면(${s.kind === 'spell' ? '주문 → 베기 → 주문' : '베기 → 주문 → 베기'}) ${g}. 이어진 교대는 0이 된다.` : `교대로 쓰면 ${g}.`); break; }
      case 'killSpread': out.push(`이 스킬로 적을 쓰러뜨리면 그 적의 출혈${(e.per || 1) === 1 ? '만큼' : ' × ' + e.per + '만큼'} 다른 적 모두에게 출혈을 건다.`); break;
      case 'brkPer': out.push(`${skPer(e.per, '붕괴')}. 중독은 줄지 않는다.`); break;
      case 'parry': out.push(`흘리기처럼 고른 적의 다음 공격 피해를 ${Math.round(e.red * 100)}% 줄인다. 스태미나는 들지 않는다.`); break;
      case 'onParry': out.push(`그 공격을 흘려 내면 그 적에게 ${[e.dmg ? '피해 ' + e.dmg : '', e.poison ? '중독 ' + e.poison : '', e.brk ? '붕괴 +' + e.brk : ''].filter(Boolean).join(', ')}.`); break;
      case 'parryBuff': {
        const t = e.times || 1; const hit = [e.dmg ? '피해 ' + e.dmg : '', e.poison ? '중독 ' + e.poison : ''].filter(Boolean).join(', ');
        const buf = [];
        if (e.red) buf.push(`줄이는 피해가 ${Math.round(e.red * 100)}%p 커진다`);
        if (e.stam) buf.push(e.stam >= 30 ? '스태미나가 들지 않는다' : `드는 스태미나 −${e.stam}`);
        out.push((buf.length ? `다음 흘리기 ${t}번은 ${buf.join('. ')}.` : '') + (hit ? ` ${t > 1 ? '흘리기에 성공할 때마다' : '다음 흘리기에 성공하면'} 그 적에게 ${hit}.` : '')); break; }
      case 'execute': out.push(`대상의 생명력이 ${Math.round(e.hp * 100)}% 이하면 터뜨린 피해 ×${e.mul}.`); break;
      case 'stam': out.push(`스태미나 +${e.n}.`); break;
      case 'focusx': out.push(`대상의 추적 1겹마다 피해 +${Math.round(e.per * 100)}%.`); break;
      case 'focusBurst': out.push(`대상의 추적을 모두 터뜨린다. 1겹마다 기준 추가 피해 ${e.n}(민첩 1점마다 ${FOCUS_STAT_PCT}% 증가). 추적은 사라진다.`); break;
      case 'focusAdd': out.push(`대상에게 추적 +${e.n}겹. 이 효과로는 2겹까지만 쌓이고, 3겹째는 같은 적을 다시 맞혀야 쌓인다.`); break;
      case 'swapx': out.push(`직전에 친 적과 다른 적이면 피해 ×${e.mul}.`); break;
      case 'evade': out.push(`다음에 맞는 공격 ${e.n}번을 피한다. 광역 · 화형 · 상태 피해는 피할 수 없다.`); break;
      case 'evadeCtr': out.push((e.charged ? '피한 공격이 강타나 겨눈 한 발이면' : (e.rounds ? e.rounds + '라운드 동안 ' : '') + '공격을 피할 때마다') + ` 그 적에게 반격 사격을 한다(피해 ${e.dmg}${e.chill ? ', 둔화 ' + e.chill : ''}).`); break;
      case 'quick': out.push('이번 차례에 빠른 칸 +1.'); break;
      case 'chillCut': out.push(`대상이 둔화된 채 강타 · 영창 · 겨누기를 모으는 중이면 그 공격을 끊는다. 강적 · 보스는 끊기지 않고 붕괴 +${e.brk}.`); break;
      case 'chillShatter': out.push(`대상의 둔화를 모두 깨뜨린다. 둔화 1마다 피해 +${e.dmg}, 붕괴 +${e.brk}.`); break;
      case 'chillSpread': out.push(`대상의 둔화${(e.per || 1) === 1 ? '만큼' : ' × ' + e.per + '만큼'} 다른 적 모두에게 둔화를 건다. 대상의 둔화는 그대로다.`); break;
      case 'freeze': out.push(`일반 · 정예 적은 다음 행동을 놓친다(얼어붙음). 강적 · 보스는 둔화 ${e.chill}, 붕괴 +${e.brk}.`); break;
      case 'onCutBreak': out.push(`모으던 적을 이 스킬로 무너뜨리면 나에게 가속 ${e.haste}${e.hasten ? ', 유산 +1(차례마다 한 번)' : ''}.`); break;
      case 'quickTurns': out.push(`이번 차례부터 내 차례 ${e.n}번 동안 빠른 칸 +1.`); break;
      case 'foresee': out.push(`${e.rounds}라운드 동안 강타 · 겨눈 한 발 · 화형의 피해가 ${Math.round(e.red * 100)}% 줄어든다. 피할 수 없는 화형도 줄어든다.`); break;
      case 'hastex': out.push(`가속으로 두 번 움직이는 라운드면 피해 ×${e.mul}.`); break;
      case 'bbuf': { const til = (e.r || 0) === 0 ? '이번 라운드가 끝날 때까지' : (e.r || 0) === 1 ? (e.s === 'barb' ? '2라운드(이번 + 다음) 동안' : '다음 라운드가 끝날 때까지') : (e.r + 1) + '라운드(이번 라운드부터) 동안'; // 0.8.0 5단계 연사 기본 공격 버프 (2-6a)
        out.push(`${til} 기본 공격이 ` + (e.s === 'swap' ? `직전에 친 적과 다른 적을 치면 피해 ×${e.mul}, 출혈 ${e.bleed}.` : e.s === 'extra' ? `같은 대상에게 덧화살 한 발을 더 쏜다(그 기본 공격 피해의 ${Math.round(e.mul * 100)}%, 출혈은 걸지 않는다).` + (e.turn ? ` 덧화살이 켜진 동안 기본 공격이 직전에 친 적과 다른 적을 치면 ×${e.turn}(덧화살 포함).` : '') : e.s === 'barb' ? `출혈 ${e.bleed}${skJo(e.bleed)} 건다.` : `피해 ×${e.mul}.`) + ' 강공격 · 스킬은 받지 않는다. 다시 걸면 기간만 새로 한다.'); break; }
      case 'hasteSpend': out.push(`가속이 있으면 1을 써서 피해 ×${e.mul}. 그 대신 다음 라운드에 연속 행동을 하지 못한다.`); break;
      case 'meSt': if (e.on === 'cut') { out.push(`이 행동으로 영창을 끊으면 나에게 ${SK_KWN[e.s] || e.s} ${e.n}.`); break; } /* 10월 18일 0.8.0 5단계 원소 장막 */ out.push(e.if === 'chill' ? (s.tgt === 'front' || s.tgt === 'all' ? `이미 둔화되어 있던 적 하나마다 나에게 ${skKw(s, e.s)} +${e.n}.` : `대상이 이미 둔화되어 있었으면 때린 뒤 나에게 ${skKw(s, e.s)} +${e.n}.`) : e.s === 'empower' && String(s.id).slice(0, 2) === 'm_' ? `때린 뒤 나에게 ${skKw(s, e.s)} +${e.n}.` : `나에게 ${SK_KWN[e.s] || e.s} ${e.n}.`); break; // "때린 뒤"는 수도승(m_)만: 엔진이 수도승의 기만 피해 뒤에 준다(b.kiPend). 다른 직업의 강화는 먼저 걸린다
      case 'stance': { const ex = [e.dmg ? '피해 +' + e.dmg : '', e.brk ? '붕괴 +' + e.brk : '', e.ki ? '기 +' + e.ki : ''].filter(Boolean); const on = [e.chill ? '둔화 ' + e.chill : '', e.weak ? '약화 ' + e.weak : ''].filter(Boolean);
        out.push((s.tgt === 'self' ? '' : '친 뒤 ') + '자세를 잡는다. 내 다음 차례까지 ' + (e.far ? '전열 적과 후열에서 직접 쏘는 적의 공격을 되받는다. 화형은 되받지 못한다.' : '전열 적의 직접 공격을 되받는다.') + ' 받는 피해는 줄지 않는다.'
          + (ex.length ? ` 되받을 때마다 ${ex.join(', ')}.` : '') + (on.length ? ` 되받은 적에게 ${on.join(', ')}.` : '')); break; }
      case 'kiBurst': out.push((e.pre ? `대상이 이미 둔화되어 있으면 먼저 기 +${e.pre}. ` : '') + `기를 ${e.max ? e.max + '까지' : '모두'} 터뜨려 ${s.tgt === 'front' || s.tgt === 'all' ? '맞은 적마다 기 1당 ' : '기 1마다 '}피해 +${e.per}${e.brk ? ', 붕괴 +' + e.brk : ''}.` + (e.keep ? ' 터뜨린 뒤 기가 절반(내림) 남는다.' : '')); break;
      case 'kiPer': out.push(`내 기 1마다 피해 +${e.per}${hits > 1 ? '(타격마다)' : ''}.` + (s.time === 'fast' ? '' : ' 이 공격은 기 1만 쓴다.')); break;
      case 'kiGrow': out.push(`때린 뒤 남은 기에 ${e.add}${skJo(e.add)} 더해 ${e.mul}배로 만든다(상한 5).`); break;
      case 'sealx': out.push((s.tgt === 'front' || s.tgt === 'all' ? '치유 · 축복 · 소환 · 저주 · 지키기 같은 지원 행동을 하려는 적은 그 행동이 끊긴다.' : '대상이 치유 · 축복 · 소환 · 저주 · 지키기 같은 지원 행동을 하려는 중이면 그 행동을 끊는다.') + ` 강적 · 보스는 끊기지 않고 붕괴 +${e.brk}.`); break;
      case 'bigx': out.push(`정예 · 강적 · 보스에게는 피해 ×${e.mul}.`); break;
      case 'cutx': out.push(e.chant ? `대상이 영창 중이면 붕괴 +${e.brk}.` : `대상이 강타나 영창을 모으는 중이면 붕괴 +${e.brk}.`); break;
      case 'weave': out.push(`${s.tgt === 'all' || s.tgt === 'front' ? '적마다' : '대상에게'} 없는 원소를 건다. 둔화가 있으면 화상 ${e.ign}, 화상이 있으면 둔화 ${e.chill}, 둘 다 없으면 화상 ${e.ign}.`); break;
      case 'shockx': {
        const m = [e.dmg && e.dmg !== 1 ? '피해 ×' + e.dmg : '', e.brk && e.brk !== 1 ? '붕괴 ×' + e.brk : ''].filter(Boolean);
        if (m.length) out.push(`이 스킬로 일어난 열충격은 ${m.join(', ')}.`);
        if (e.arc) out.push(`이 스킬로 일어난 열충격 피해의 ${Math.round(e.arc * 100)}%가 다른 적 모두에게 번진다(광역처럼 줄고, 붕괴는 없다).`);
        if (e.keep) out.push(`이 스킬로 일어난 열충격 뒤에 대상에게 ${SK_KWN[e.keep.s] || e.keep.s} ${e.keep.n}${skJo(e.keep.n)} 남긴다.`); break; }
      case 'rime': out.push(`나를 직접 친 적에게 다음 ${e.times}번 ${SK_KWN[e.s || 'chill']} ${e.n}${skJo(e.n)} 건다. 이미 있으면 횟수를 더한다(최대 8번).`); break;
      case 'burnOut': out.push(`대상의 화상을 모두 태운다. 태운 화상 1마다 피해 +${e.per}, 붕괴 +${e.brk}. 화상이 없으면 이 추가 피해와 붕괴는 0이다.`); break;
      case 'drain': out.push(`대상의 중독 1마다 생명력 +${e.per}. 중독은 그대로다.`); break;
      case 'lowx': out.push(`대상의 생명력이 ${Math.round(e.hp * 100)}% 이하면 피해 ×${e.mul}.`); break;
      case 'brokenx': out.push(`대상이 붕괴 상태면 피해 ×${e.mul}.`); break;
      case 'spread': out.push(`대상의 중독${e.per === 1 ? '' : e.per === 0.5 ? ' 절반(올림)' : ' ' + Math.round(e.per * 100) + '%'}만큼 다른 적 모두에게 중독을 건다. 대상의 중독은 그대로다.`); break;
      case 'capOver': out.push(`이 스킬로 거는 중독은 상한을 넘어 ${e.cap}까지 쌓인다.`); break;
      case 'wardFill': out.push(e.to && e.to < 1 ? `보호막을 상한의 ${Math.round(e.to * 100)}%까지 채운다. 이미 그만큼 있으면 늘지 않는다.` : '보호막을 상한까지 채운다.'); break;
      case 'wardFirst': out.push(`먼저 보호막 ${e.n}${e.protect ? ' · 보호 ' + e.protect : ''}을(를) 두른다.`); break; // 10월 17일 보완 5 갑주 해방
      case 'wardBurn': { const wd = (s.kind || String(s.id).slice(0, 2) === 'w_') && s.fx.find(x => x.k === 'ward'); out.push(`보호막을 ${e.max ? '최대 ' + e.max + '까지' : '모두'} 태운다. 태운 보호막 1마다 ${s.tgt === 'front' ? '전열 모두에게 ' : s.tgt === 'all' ? '모든 적에게 ' : ''}피해 ${e.mul}. 보호막이 없으면 ${s.fx.some(x => x.k === 'dmg') ? '더하는 피해는' : '이 피해는'} 0이다.` + (wd ? ` 태운 뒤 나에게 보호막 +${wd.n}.` : '')); break; }
      case 'wardDmg': out.push(e.drainAll ? `현재 보호막을 전부 소모합니다. 추가 피해 = 소모한 보호막 × ${e.per}(최대 ${e.cap}). 이 행동에서는 교대 보호막을 얻지 않습니다.` : e.spend ? `현재 보호막의 ${e.spend * 100}%를 소모합니다(최대 ${e.cap / e.per}). 추가 피해 = 소모한 보호막 × ${e.per}(최대 ${e.cap}).` : `${e.per >= 1 ? '내 보호막 1마다 피해 +' + e.per : '내 보호막 ' + Math.round(1 / e.per) + '마다 피해 +1'}${e.cap != null ? '(최대 ' + e.cap + ')' : ''}. 보호막은 줄지 않습니다.`); break;
      case 'thorn': out.push(`가시 ${e.times}번을 얻는다. 맞을 때마다 때린 적에게 피해 ${e.dmg}. 이미 있으면 횟수를 더한다(최대 8번).`); break;
      case 'vulnPer': out.push(`대상의 취약 1마다 피해 +${e.per}. 취약은 줄지 않는다.`); break;
      case 'shieldx': out.push(`방패병에게는 붕괴 ×${e.mul}.`); break;
      case 'pull': out.push('대상이 후열이면 전열로 끌어낸다.'); break;
      case 'vulnGrow': out.push(`대상의 취약을 ${e.mul}배로 만든다(상한 5).`); break;
      case 'chillx': out.push(`둔화된 적에게는 피해 ×${e.mul}.`); break;
      case 'hasten': if (e.on === 'ctr') { out.push(`🔄 이 자세에서 처음 되받으면 유산 +1(차례마다 한 번).`); break; } if (e.on === 'shock') { out.push(`🔄 이 스킬로 열충격이 일어나면 유산 +1(차례마다 한 번).`); break; } if (e.on === 'evade') { out.push(`🔄 공격을 피할 때마다 유산 +1(차례마다 한 번).`); break; }
      if (e.on === 'alt' || e.on === 'kill') { out.push(`🔄 ${e.on === 'alt' ? '교대로 쓰면' : '이 스킬로 적을 쓰러뜨리면'} 유산 +1(차례마다 한 번).`); break; }
      { const pb = s.fx.find(x => x.k === 'parryBuff'); out.push((e.on === 'parry' ? (pb ? ((pb.times || 1) > 1 ? '🔄 그 흘리기에 성공할 때마다' : '🔄 그 흘리기에 성공하면') : '🔄 그 공격을 흘려 내면') : '🔄 쓰면') + ` 유산 +1(차례마다 한 번).`); break; }
    }
  }
  { const g = bu && s.fx.find(e => e.k === 'grow' && e.s === 'bleed'); if (g) out.push(`그 뒤 대상의 출혈을 ${g.mul}배${Number.isInteger(g.mul) ? '' : '(올림)'}로 만${g.add ? `들고 ${g.add}${skJo(g.add)} 더한다` : '든다'}(최대 10).`); }
  if (s.fx.filter(e => ['lowx', 'brokenx', 'bigx', 'chillx', 'kwx'].includes(e.k)).length >= 2) out.push('조건이 겹치면 배수를 곱한다.'); // 10월 4일: 박살(붕괴한 정예 · 보스에게 ×2.5 × 1.5) 등
  if (s.killRecharge) out.push(s.once ? '이 스킬로 적을 쓰러뜨리면 한 번 더 쓸 수 있다.' : s.krShock ? '이 행동으로 적을 쓰러뜨리면(행동 끝 열충격 포함) 유산 +1(차례마다 한 번).' : '이 스킬로 적을 쓰러뜨리면 유산 +1(차례마다 한 번).'); // krShock: 10월 18일 0.8.0 5단계 공명
  if (bu && (s.tgt === 'ranged' || s.tgt === 'all') && s.fx.some(e => e.k === 'dmg')) out.push((s.tgt === 'all' ? '후열에도 닿는다. ' : '') + '근접 공격이 아니라 흡혈은 일어나지 않는다.');
  if (s.fx.some(e => skillResourceGrows(s, e) && e.k !== 'focusBurst')) out.push((/^m_/.test(s.id) ? '이 기 추가 피해' : '이 자원 추가 피해') + '는 힘 1점마다 기준값의 1%씩 증가한다.');
  if (s.pay) out.push('대가: ' + s.pay); // M5-0a 승부수: 대가는 따로 적어 두고(설명란은 skDescHtml이 줄을 나눈다), 글 설명에서는 끝에 붙인다
  return (out.join(' ') + skYsTail(s)).replace(/\s+/g, ' ').trim(); // S-2: 유산 1 회복 칸은 끝에 충전 없음
}
/* M5-0a(10월 20일 만든 사람): 대사가 있는 스킬(승부수)의 설명란. 대사는 맨 위 따로 한 칸(명조 가운데 인용, 「」는 부채꼴 색 장식 · 위에 ✦ 가는 선, 같은 날 만든 사람 고름), 그 아래 효과 / 대가 / 대상을 줄로 나눈다.
   대가는 색과 "대가" 글자로 구분(색만으로 구분하지 않음). 스크린리더는 "대사: …, 효과: …, 대가: …, 대상: …" 순서. 대사가 없으면 빈 문자열(부른 쪽이 원래 설명을 쓴다) */
const SK_LINE_COL = { 빙염: '#b48cf0', 정적: '#a8d8f0', 마염: '#f07a3c', /* M5-5 원소술사: 빙염의 화신 비전빛 · 영겁의 정적 얼음빛 · 천화 불빛 */ 명궁: '#e8d48a', 유격: '#9fd0e8', 잠복: '#d0604a', /* M5-4 사냥꾼: 만궁 활빛 · 질풍난사 바람빛 · 혈향의 덫 핏빛 */ 독화: '#9ad46a', 암영: '#c9d2e0', 잔영: '#8b7bd8', /* M5-3 암살자: 만독개화 독빛 · 무영살 칼빛 · 잔영난무 잔상빛 */ 반탄: '#f0903c', 역혈: '#e6c060', 파혈: '#e8eef5', /* M5-2 수도승: 역천권 주황 · 천망 금빛 경락 · 일지멸맥 하얀 빛 */ 혈염: '#ef5d3c', '죄인의 피': '#c23a52', '유산의 불': '#f0ac48', 공성추: '#a8bace', '기둥 파쇄': '#c98b4a', '용맹의 투지': '#e8c25a' };
function skDescHtml(s) {
  if (!s || !s.line) return ''; const e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const body = skBody(Object.assign({}, s, { pay: null })), col = SK_LINE_COL[s.b] || 'var(--gold)', who = `${SKK.TGN[s.tgt]} · ${SKK.TN[s.time]}`;
  return `<div class="skd" style="--lc:${col}"><p class="skd-line"><span class="sr">대사: </span><span class="skd-q" aria-hidden="true">「</span>${e(s.line.replace(/^「|」$/g, ''))}<span class="skd-q" aria-hidden="true">」</span></p><div class="skd-rows"><div class="skd-r"><span class="k">효과</span><span class="v">${e(body)}</span></div>${s.pay ? `<div class="skd-r pay"><span class="k">대가</span><span class="v">${e(s.pay)}</span></div>` : ''}<div class="skd-r"><span class="k">대상</span><span class="v">${e(who)}</span></div></div></div>`;
}
