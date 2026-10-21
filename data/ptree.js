/* 0.8.0 패시브 방사 트리 데이터 (10월 16일 0.8.0 2단계, docs/제안/0.8.0-1단계-트리설계-2026-10-16.md 1 · 2 · 3 · 4 · 7절)
   값만 둔다. 노드 · 연결 · 고리는 js/23-tree-engine.js의 ptBuild가 이 틀(2-3)에서 만든다. 노드 id = 방향 코드 + 반지름 + 칸(pw5L), 큰 각인 자리 pwK5 · pwK9, 시작 노드 S.
   마검사는 7절 승인 초안 그대로. 다른 8직업은 임시 트리(tmp: 1): 기울기 표의 1고리 + 공용 풀을 기계적으로 채운 것이다(5 · 6단계에서 직업 초안으로 바꾼다).
   효과 키: 옛 각인은 IFX_AWK의 키(a_eye), 새 효과는 IFX_NODE의 키(n_ · ks_). 이름 · 문장은 옛 각인이면 AWK_MAP, 새것이면 PN_TXT · KS_LIST */
const PT = {
  dirs: ['pw', 'ct', 'ag', 'lg', 'su', 'sv'], // 시계 방향, 위에서 시작
  dir: { pw: { n: '화력', a: 0 }, ct: { n: '제어', a: 60 }, ag: { n: '기민', a: 120 }, lg: { n: '계승', a: 180 }, su: { n: '유지력', a: 240 }, sv: { n: '생존', a: 300 } },
  lane: { L: -12, C: 0, R: 12 },
  pts: { start: 6, lv: 2 }, // 패시브 포인트: 시작 6 + 레벨마다 2 (만든 사람 결정 10월 16일)
  ring: { 1: 0, 2: 1, 3: 2 }, // 고리가 열리는 깬 챕터 수(run.clears, 표식 도전은 markCh − 1을 더함). M5-0 보정 5: 그 전 챕터 야영지에서도 열린다(run.ringCamp, ringOpen)
  ksN: 3, ksOffer: 3, // 큰 각인 제시: 찍은 곳에서 3칸 안, 셋
  smallBrk: 0.03, smallSt: 6, // 제어 작은 노드 주는 붕괴 +3%(곱), 계승 작은 노드 스태미나 +6
};
/* M5-0 보정 5: 패시브 꼬리표(노드 효과 · 큰 각인 id → 꼬리표). 결합 칸 조건과 BD-9가 액티브 꼬리표와 함께 센다 */
const PT_TAGS = { n_bs_dmg: ['기본공격연동'], n_bs_dmg2: ['기본공격연동'], n_bs_brk: ['기본공격연동'], n_bs_st: ['기본공격연동'], ks_sharp: ['기본공격연동'], n_sb_parryspell: ['흘리기'], ks_slipbreath: ['흘리기'], ks_flow: ['흘리기'] };
const PT_BASIC = { pw: ['n_bs_dmg', 'n_bs_brk'], ag: ['n_bs_dmg2', 'n_bs_st'] }; // 0.8.0 M4: 방향마다 1고리 작은 노드 앞의 두 칸(능력치 대신 이 효과)
const AT_PTS = { start: 2, lv: 1 }; // 액티브 포인트: 시작 2 + 레벨마다 1(10월 17일 만든 사람 결정, 시작은 전에 1)
/* 마검사 두 번 교대 (10월 17일 만든 사람 보완 1, 교대의 박자): 한 차례 두 번째 교대에 보호막 ward, 다음 스킬 비용 −off(바닥 1). max: 할인이 생기는 횟수의 전투당 한도(0이면 차례마다), min: 할인을 받는 스킬의 최소 유산 비용 */
const SB_ALT2 = { ward: 3, off: 1, max: 0, min: 3 }; // 4단계 조정: min 1 → 3 (모든 다음 스킬 −1이면 1챕터 넘김이 21% → 33%로 뛰었다. 유산 3 · 4 스킬에만 걸면 24%)
/* 마검 과부하 (10월 17일 보완 4): 교대한 행동 피해 +hit, 이어진 교대 run번째에 다음 유산 4 스킬 비용 −off(바닥 1, 전투마다 1번) */
const SB_OVER = { hit: 0.5, run: 3, off: 3 }; // 4단계 조정: hit 0.35 → 0.5 (0.35에서는 같은 자리의 결정의 칼보다 3챕터 완주가 낮았다)
/* 1고리 기울기 (3절 · 비공개 부록 1절): A 가까움 · B 보통 · C 멂 */
const PT_TILT = {
  spellblade: { pw: 'B', sv: 'C', su: 'B', ct: 'B', ag: 'B', lg: 'A' },
  warden: { pw: 'B', sv: 'A', su: 'B', ct: 'A', ag: 'C', lg: 'B' },
  monk: { pw: 'A', sv: 'B', su: 'C', ct: 'B', ag: 'B', lg: 'A' },
  assassin: { pw: 'B', sv: 'C', su: 'B', ct: 'B', ag: 'A', lg: 'A' },
  hunter: { pw: 'A', sv: 'C', su: 'C', ct: 'B', ag: 'A', lg: 'B' },
  elementalist: { pw: 'A', sv: 'C', su: 'C', ct: 'A', ag: 'B', lg: 'B' },
  butcher: { pw: 'A', sv: 'B', su: 'A', ct: 'C', ag: 'C', lg: 'B' },
  confessor: { pw: 'B', sv: 'C', su: 'B', ct: 'A', ag: 'B', lg: 'A' },
  bloodmage: { pw: 'B', sv: 'C', su: 'B', ct: 'C', ag: 'A', lg: 'A' },
};
/* 1고리에서 중간 노드가 되는 자리 (2-4) */
const PT_TILT_N = { A: ['1C', '3L'], B: ['2L', '3R'], C: ['3L'] };
/* 시작 노드: 직업 기본 능력치 12점 (STAT_REC × 12 반올림). 마검사는 4단계(10월 17일) 초반 피해 점검으로 14점(힘 · 지능 +1, 설계 10-4의 2) */
const PT_START = {
  spellblade: { str: 5, int: 5, con: 3, wil: 1 }, warden: { str: 4, con: 4, wil: 4 }, monk: { str: 4, dex: 4, con: 4 }, assassin: { dex: 5, int: 4, con: 3 },
  hunter: { dex: 8, con: 4 }, /* 0.8.0 5단계 원거리 초안 8절 결정 3: 민첩 5 · 체력 4 · 힘 3 → 민첩 8 · 체력 4 */ elementalist: { int: 9, con: 3, wil: 2 }, /* 10월 18일 0.8.0 5단계 원거리 초안 8절 결정 9: 지능 5 · 체력 4 · 의지 3(12) → 지능 9 · 체력 3 · 의지 2(14) */ butcher: { str: 4, con: 4, wil: 3, int: 1 }, confessor: { con: 4, str: 4, int: 4 }, bloodmage: { int: 5, con: 4, wil: 3 },
};
/* 공용 중간 노드 풀 (2-8): r2는 2고리(L5) 후보, r3는 3고리(L7 · R7) 후보 */
const PT_POOL = {
  pw: { r2: ['a_eye', 'a_smolder'], r3: ['a_point', 'a_scatter', 'a_ember'] },
  sv: { r2: ['a_skin', 'a_breath', 'a_clear'], r3: ['a_iron', 'a_stand'] },
  su: { r2: ['a_vigor', 'a_vial', 'a_pouch', 'a_shell'], r3: ['a_warmth', 'a_brew'] },
  ct: { r2: ['a_gap'], r3: ['a_heavyhand', 'n_shaken'] },
  ag: { r2: ['a_resolve'], r3: ['a_light', 'a_gulp'] },
  lg: { r2: ['n_overflow'], r3: ['n_fullvessel'] },
};
/* 새 중간 노드의 이름 · 문장 (공용 3 + 마검사 직업 노드). 옛 각인을 옮긴 노드는 AWK_MAP을 읽는다 */
const PN_TXT = {
  /* 0.8.0 M4: 화력 · 기민 1고리 작은 노드 둘씩을 평타 노드로(직업마다 같은 틀, PT_BASIC) */
  n_bs_dmg: { n: '기본 공격 피해 +4%', d: '기본 공격으로 주는 직접 피해가 4% 늘어납니다.' },
  n_bs_dmg2: { n: '기본 공격 피해 +4%', d: '기본 공격으로 주는 직접 피해가 4% 늘어납니다.' },
  n_bs_brk: { n: '기본 공격 붕괴 +2', d: '기본 공격의 붕괴가 2 늘어납니다.' },
  n_bs_st: { n: '기본 공격 스태미나 +3', d: '기본 공격이 맞히면 스태미나 3을 되찾습니다.' },
  n_overflow: { n: '넘친 숨', d: '대응 충전이 상한에 막혀 버려지면 다음 내 차례 시작에 유산 +1로 돌려받습니다(전투마다 1번).' },
  n_fullvessel: { n: '가득 찬 그릇', d: '유산이 가득할 때 주는 직접 피해가 6% 늘어납니다.' },
  n_shaken: { n: '흔들린 숨', d: '적을 무너뜨리면 스태미나 +8.' },
  n_sb_altedge: { n: '교대의 칼끝', d: '교대한 행동의 직접 피해가 6% 늘어납니다.' },
  n_sb_finish: { n: '마무리 칼', d: '생명력 30% 이하인 적에게 주는 직접 피해가 12% 늘어납니다.' },
  n_sb_beatcut: { n: '박자 끊기', d: '이어진 교대(2번째부터)로 맞히면 붕괴 +8.' },
  n_sb_telebrk: { n: '예고 깨기', d: '강타 · 영창 · 모으기 · 겨누기 예고 중인 적에게 주는 붕괴가 15% 늘어납니다.' },
  n_sb_gap: { n: '무너진 틈', d: '무너진 적에게 주는 직접 피해가 8% 늘어납니다.' },
  n_sb_stagger: { n: '흐트러진 자세', d: '적을 무너뜨리면 그 적에게 약화 1(행동마다 1번).' },
  n_sb_parryspell: { n: '흘린 칼끝', d: '흘리기에 성공한 뒤 첫 주문의 피해가 15% 늘어납니다.' },
  n_sb_lightcut: { n: '가벼운 칼', d: '빠른 칸 베기를 쓰면 스태미나 +5.' },
  n_sb_farspell: { n: '먼 주문', d: '후열 적을 주문으로 맞히면 스태미나 +4(행동마다 1번).' },
  n_sb_altbeat: { n: '교대의 박자', d: '교대 보호막이 1 늘어납니다(4 → 5). 한 차례에 교대를 두 번 하면(⚡ 빠른 행동과 ▶ 주 행동이 모두 교대) 두 번째 교대에 보호막 +3, 다음 스킬 비용 −1(바닥 1, 차례에 한 번).' }, // 10월 17일 만든 사람 보완 1: 두 번 교대
  n_sb_edgeadd: { n: '칼에 새긴 주문', d: '주문이 칼에 싣는 출혈 · 화상이 1 늘어납니다. 액티브 포인트를 가장 많이 쓴 갈래에 따라 시작 스킬이 바뀝니다: 혈인 → 마검 베기가 출혈 1, 염검 → 주문 방패가 칼에 화상 1(칼이 비어 있을 때), 마갑 → 주문 방패 보호막 +2. 가장 많은 갈래가 둘 이상이면 없음.' }, // 10월 17일 보완 3: 시작 스킬이 갈래에 들어감
  n_sb_hybrid: { n: '양손의 마검', d: '베기 스킬은 지능의 30%, 주문 스킬은 힘의 30%를 공격 능력치에 더합니다.' }, // 10월 17일 보완 2: 두 능력치 직업의 부담을 던다(화력 C1 작은 노드에 붙음)
  n_sb_three: { n: '세 박자', d: '이어진 교대의 3번째 행동이면 유산 +1(전투마다 2번, 🔄 환급 한도와 함께 씀).' },
  n_sb_manaloop: { n: '마력 순환', d: '교대 보호막을 얻을 때 스태미나 +3.' },
  n_sb_remnant: { n: '남는 마력', d: '전투가 끝날 때 남은 보호막의 절반만큼 생명력을 회복합니다(최대 생명력의 5%까지).' },
  n_sb_thickaegis: { n: '두꺼운 주문 방패', d: '주문 방패의 보호막 +3.' },
  n_sb_bloodmail: { n: '피의 갑주', d: '출혈 · 화상이 걸린 적을 쓰러뜨리면 보호막 +5.' },
  n_sb_manamail: { n: '마력 갑주', d: '전투를 시작하면 보호막 6.' },
  n_sb_under: { n: '보호막 아래', d: '보호막이 있으면 받는 직접 피해가 4% 줄어듭니다.' },
  /* 0.8.0 5단계 파수꾼 (docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 2-5) */
  n_wd_wide: { n: '넓은 방패', d: '방패 치기가 전열 모두를 칩니다. 피해 14 → 10, 붕괴 36 → 24.' },
  n_wd_heavy: { n: '무거운 방패', d: '강공격의 피해가 10%, 붕괴가 10 늘어납니다.' },
  n_wd_held: { n: '받아낸 몫', d: '방어 중 적의 직접 공격을 받으면, 방어로 줄인 피해의 50%만큼 보호막을 얻습니다(후열 공격이면 그 절반). 적 차례마다 10까지.' },
  n_wd_low: { n: '버팀목', d: '생명력이 50% 이하일 때 방어로 얻는 보호막이 2배가 됩니다.' },
  n_wd_brace6: { n: '단단한 자세', d: '굳히기의 보호 4 → 6.' },
  n_wd_will: { n: '다진 의지', d: '방어로 얻는 보호막이 6에서 6 + 의지 × 0.5가 됩니다.' },
  n_wd_remnant: { n: '남은 벽', d: '전투가 끝날 때 남은 보호막의 3분의 1만큼 생명력을 회복합니다(최대 생명력의 5%까지).' },
  n_wd_breath: { n: '숨 고르는 방패', d: '방어의 스태미나 20 → 14.' },
  n_wd_shake: { n: '흔들리는 방패', d: '방어 중 전열 적의 직접 공격을 받으면 그 적에게 붕괴 +10(적 차례마다 한 번).' },
  n_wd_breakwall: { n: '무너뜨린 자의 벽', d: '적을 무너뜨리면 보호막 +6(행동마다 한 번).' },
  n_wd_turn: { n: '몸 돌리기', d: '후열 적에게서 받는 직접 피해가 6% 줄어듭니다.' },
  n_wd_pullhit: { n: '다가서는 방패', d: '끌어와 치기로 끌어낸 적에게 다음 공격의 피해 +15%.' },
  n_wd_stack: { n: '쌓인 벽', d: '유산 3 이상인 공격 스킬(보호막을 태우는 스킬 제외)이나 강공격을 쓸 때 보호막이 15 이상이면, 보호막 5를 써서 그 공격 피해 +12%.' },
  n_wd_respward: { n: '막아 든 숨', d: '대응 충전이 유산 상한에 막혀 버려지면 보호막 +6.' },
  n_wd_ready: { n: '준비된 방패', d: '전투를 시작하면 최대 생명력 6%만큼 보호막.' },
  n_wd_fuel: { n: '보호막 연료', d: '보호막을 태우는 공격이 태운 보호막 10마다 스태미나 +4.' },
  n_wd_bracewall: { n: '굳은 방패', d: '굳히기를 쓰면 보호막 +6.' },
  /* 0.8.0 5단계 수도승 (3-5) */
  n_mk_loaded: { n: '실린 주먹', d: '기본 공격 · 강공격에 기가 실리면 피해 ×1.25 → ×1.4.' },
  n_mk_burst: { n: '터지는 기', d: '기를 거두는 공격(터뜨리기)은 거둔 기 1마다 피해 +1 더.' },
  n_mk_last: { n: '마지막 한 방울', d: '기를 거둬 0으로 만든 스킬의 피해 +12%.' },
  n_mk_steady: { n: '흔들리지 않는 몸', d: '자세가 있는 동안 강타에 받는 피해 −15%.' },
  n_mk_breath: { n: '고른 숨', d: '되받기를 하면 스태미나 +3.' },
  n_mk_cycle: { n: '기의 순환', d: '전투가 끝날 때 남은 기 1마다 최대 생명력의 1%를 회복합니다.' },
  n_mk_shake: { n: '흔드는 되받기', d: '되받기 붕괴 10 → 16.' },
  n_mk_seal: { n: '끊는 손끝', d: '지원 행동(치유 · 축복 · 소환 등)을 끊으면 기 +1.' },
  n_mk_parry: { n: '흘려 받기', d: '흘리기에 성공하면 기 +1(적 차례마다 한 번).' },
  n_mk_prestance: { n: '먼저 잡은 자세', d: '받아칠 자세의 되받기 덤 6 → 12.' },
  n_mk_quick: { n: '날랜 손', d: '⚡ 공격 스킬의 피해 +8%.' },
  n_mk_vessel: { n: '기의 그릇', d: '기 상한 5 → 6.' },
  n_mk_seed: { n: '남은 숨', d: '전투를 시작하면 기 1.' },
  n_mk_double: { n: '되받은 기세', d: '한 적 차례에 두 번째 되받기부터 기 +1 더.' },
  n_mk_pool: { n: '고인 기', d: '기가 상한일 때 되받기 피해 +20%.' },
  n_mk_spill: { n: '넘치는 기운', d: '되받기로 얻을 기가 상한에 막혀 버려지면 1마다 스태미나 +4.' },
  /* 0.8.0 5단계 사냥꾼 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-5, 10월 18일 결정) */
  n_hn_pull: { n: '이어 당기는 활', d: '연계로 빠른 행동을 쓴 차례의 기본 공격 피해가 15% 늘어나고(덧쏜 화살에도 든다), 맞히면 스태미나 +5.' }, /* M5-4: 가속의 두 번째 차례 → 연계 빠른 행동을 쓴 차례 */
  n_hn_breath: { n: '사냥감의 숨', d: '추적 3겹 이상인 적에게 주는 스킬 피해가 8% 늘어납니다.' },
  n_hn_tough: { n: '질긴 사냥꾼', d: '생명력이 30% 이하일 때 받는 직접 피해가 8% 줄어듭니다.' },
  n_hn_unavoid: { n: '피할 수 없는 것', d: '회피할 수 없는 공격(광역 · 주문 · 지속 피해)에 받는 피해가 8% 줄어듭니다.' },
  n_hn_rest: { n: '숨 고르기', d: '공격을 몸을 빼 피하면 최대 생명력의 2%를 회복합니다(전투마다 3번).' },
  n_hn_camp: { n: '사냥꾼의 휴식', d: '전투가 끝날 때 남은 유산 1마다 최대 생명력의 1%를 회복합니다(최대 4%).' },
  n_hn_tele: { n: '예고 읽기', d: '큰 공격(강타 · 영창 · 모으기 · 겨누기 등)을 예고한 적에게 주는 직접 피해가 8% 늘어납니다.' },
  n_hn_cutarrow: { n: '끊은 화살', d: '붕괴로 적의 예고를 끊으면 스태미나 +12(행동마다 한 번).' },
  n_hn_stopgap: { n: '멈춰 세운 틈', d: '붕괴로 예고를 끊은 적에게 다음 내 공격의 피해가 15% 늘어납니다(그 적에게 한 번).' },
  n_hn_aside: { n: '비켜 선 자리', d: '공격을 몸을 빼 피한 다음, 내 첫 공격의 피해가 10% 늘어납니다(한 번).' },
  n_hn_quick: { n: '날랜 시위', d: '⚡ 공격 스킬의 피해가 8% 늘어납니다.' },
  n_hn_pass: { n: '넘겨받는 추적', d: '추적 3겹 이상인 적을 쓰러뜨리면, 다음에 친 다른 적은 추적 1겹에서 시작합니다(처치마다).' },
  n_hn_linkup: { n: '이어 쏘기 숙련', d: '연계 빠른 행동을 내 차례에 두 번까지 쓸 수 있습니다(원래 한 번).' }, /* M5-4: 연계 +30% → 빠른 행동 */
  n_hn_finale: { n: '끝맺는 연계', d: '연계로 쓴 유산 4 스킬의 피해가 12% 늘어납니다.' },
  /* 10월 18일 0.8.0 5단계 원소술사 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 3-5, 8절 결정 9–11) */
  n_el_student: { n: '불의 학도', d: '스킬의 첫 타격 피해 +3(행동마다 한 번, 배율을 모두 곱한 뒤 더함).' },
  n_el_blaze: { n: '거센 불길', d: '화상을 지우며 치는 공격(불태우기 계열)이 화상 5 이상을 지우면 그 공격의 피해가 10% 늘어납니다.' },
  n_el_frostskin: { n: '서리 껍질', d: '둔화된 적에게서 받는 직접 피해가 5% 줄어듭니다(큰 공격에도).' },
  n_el_dull: { n: '무뎌진 칼날', d: '서리 무게가 −30%에서 −35%가 됩니다(평소 공격만).' },
  n_el_coolbreath: { n: '식은 숨', d: '열충격이 일어나면 최대 생명력의 1%를 회복합니다(전투마다 5%까지).' },
  n_el_melt: { n: '녹는 서리', d: '되얼림이 발동할 때마다 최대 생명력의 1%를 회복합니다(전투마다 4%까지).' },
  n_el_chanthand: { n: '영창 끊는 손', d: '영창 중인 적에게 주는 붕괴가 10 늘어납니다.' },
  n_el_cracked: { n: '깨진 얼음', d: '무너진 적에게 열충격 피해가 20% 늘어납니다.' },
  n_el_first: { n: '앞선 주문', d: '전투 첫 내 차례에 쓰는 스킬의 피해가 12% 늘어납니다.' },
  n_el_light: { n: '가벼운 손', d: '⚡ 빠른 스킬로 화상이나 둔화를 걸면 스태미나 +4(행동마다 한 번).' },
  n_el_scatter: { n: '흩어진 주의', d: '영창을 끊으면 스태미나 +10.' },
  n_el_echo: { n: '이어지는 울림', d: '열충격이 일어나면 스태미나가 6 찹니다.' }, // 옛 남는 울림(k_el3)의 효과 (한 노드 한 효과, 1단계 2-7)
  n_el_spread: { n: '번지는 울림', d: '열충격의 번짐(다른 적에게 가는 몫)과 번짐 칸(튀는 충격처럼 번짐이 있는 스킬)의 피해가 15% 늘어납니다.' },
  n_el_even: { n: '고른 원소', d: '한 행동에 화상과 둔화를 둘 다 걸면 스태미나 +6(행동마다 한 번).' },
  /* 10월 18일 0.8.0 5단계 암살자 (docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 4-6, 8절 결정 13–17) */
  n_as_gap: { n: '흘려 낸 틈', d: '흘려 낸 다음 내 차례의 첫 공격 피해가 10% 늘어납니다(한 번).' },
  n_as_ripe: { n: '무르익은 독', d: '중독 15 이상인 적에게 주는 직접 피해가 8% 늘어납니다.' },
  n_as_thin: { n: '얇은 그림자', d: '생명력 50% 이하일 때 거는 흘리기의 감소분이 5%p 늘어납니다(상한 90% 그대로).' },
  n_as_dodge: { n: '피하는 몸', d: '강적 · 보스 공격을 흘릴 때 줄어드는 감소분이 20%p에서 15%p가 됩니다.' },
  n_as_drink: { n: '독 마시는 몸', d: '독 흡수 계열(중독에서 생명력을 얻는 스킬)의 회복이 15% 늘어납니다.' },
  n_as_breath: { n: '흘린 숨', d: '흘려 내면 최대 생명력의 1%를 회복합니다(전투마다 4%까지).' },
  n_as_warm: { n: '남은 독의 온기', d: '독을 터뜨려 적을 쓰러뜨리면 최대 생명력의 2%를 회복합니다(전투마다 6%까지).' },
  n_as_crush: { n: '무너뜨리는 독', d: '중독 10 이상인 적에게 주는 붕괴가 10% 늘어납니다.' },
  n_as_edge: { n: '끊는 칼끝', d: '강타를 흘려 내면 그 적의 붕괴 게이지가 25가 아니라 35 찹니다.' },
  n_as_crack: { n: '깨진 틈 찌르기', d: '무너진 적에게 독을 터뜨리는 피해가 20% 늘어납니다.' },
  n_as_step: { n: '그림자 발', d: '흘리기의 스태미나가 4 줄어듭니다.' },
  n_as_chain: { n: '연이은 흘림', d: '흘려 낸 다음 공통 흘리기의 스태미나가 10 줄어듭니다(한 번).' },
  n_as_mem: { n: '독 기억', d: '전투에서 처음 거는 독이 2 늘어납니다(전투마다 한 번).' },
  n_as_store: { n: '독의 저장고', d: '내가 거는 중독의 상한이 20에서 24로 늘어납니다.' },
  n_as_link: { n: '이어진 그림자', d: '대응 직후(resp) 조건으로 비용이 줄면 스태미나 +6.' },
};
/* 큰 각인 (4-1 공용, 4-2 직업). dir은 그 자리의 방향, pay는 대가(빨간 줄) */
const KS_LIST = {
  ks_deep: { dir: 'lg', n: '깊은 샘', d: '유산 상한 +1(전투 시작 값도 +1).', pay: '기본 공격 피해 −15%.' }, // 0.8.0 M4(D10): 대가가 생겼다. 넘치는 그릇(상한 +2)은 없앴다
  /* 0.8.0 M4 (10월 19일 만든 사람 결정 D8 · Y4): 평타 축 큰 각인과 방향별 유산 통로 */
  ks_sharp: { dir: 'pw', n: '날 선 손', d: '기본 공격 피해가 30% 늘어납니다. 예고 중인 적을 기본 공격으로 맞히면 붕괴 +10.', pay: '유산 상한 −2(전투 시작 값도 −2).' },
  ks_tireless: { dir: 'su', n: '쉬지 않는 팔', d: '강공격의 스태미나가 15 줄어듭니다.', pay: '생명력 플라스크 최대 충전 −1.' },
  ks_brkbreath: { dir: 'ct', n: '무너뜨린 숨', d: '무너뜨리기로 대응 충전을 받으면 유산 +1 더(전투마다 2번).', resp: 1 },
  ks_slipbreath: { dir: 'ag', n: '흘린 숨', d: '흘리기 · 먼저 치우기로 대응 충전을 받으면 유산 +1 더(전투마다 2번).', resp: 1 },
  ks_blockbreath: { dir: 'sv', n: '막아 낸 숨', d: '막기로 대응 충전을 받으면 유산 +1 더(전투마다 2번).', resp: 1 },
  ks_double: { dir: 'lg', n: '겹 대응', d: '대응 충전을 라운드에 2번까지 받습니다.', pay: '전투 시작 유산 −2.', resp: 1 },
  ks_bare: { dir: 'lg', n: '빈손의 맹세', d: '대응 충전 한 번에 유산 +2.', pay: '기본 공격 피해 −20%.', resp: 1 },
  ks_crystal: { dir: 'pw', n: '결정의 칼', d: '유산 4 스킬의 피해가 25% 늘어납니다.' },
  ks_glass: { dir: 'pw', n: '유리 칼날', d: '주는 직접 피해가 15% 늘어납니다.', pay: '받는 직접 피해 +10%.' },
  ks_wall: { dir: 'sv', n: '철벽', d: '최대 생명력이 12% 늘어납니다.' },
  ks_heavy: { dir: 'sv', n: '무거운 갑주', d: '받는 직접 피해가 12% 줄어듭니다.', pay: '흘리기를 쓸 수 없습니다.' },
  ks_cycle: { dir: 'su', n: '피의 순환', d: '적을 쓰러뜨리면 최대 생명력의 3%를 회복합니다(한 전투에 15%까지).' },
  ks_dry: { dir: 'su', n: '샘 없는 길', d: '받는 회복이 30% 늘어납니다.', pay: '생명력 플라스크 최대 충전 −1.' },
  ks_hammer: { dir: 'ct', n: '망치의 길', d: '주는 붕괴가 25% 늘어납니다.', pay: '주는 직접 피해 −8%.' },
  ks_breaker: { dir: 'ct', n: '무너뜨리는 자', d: '무너진 적에게 주는 직접 피해가 20% 늘어납니다.' },
  ks_first: { dir: 'ag', n: '먼저 움직임', d: '전투를 시작하면 가속 1.' },
  ks_flow: { dir: 'ag', n: '흘림새', d: '큰 공격(강타 · 겨눈 한 발 · 모으기)을 흘리면 대응 충전 +1 더(라운드 한도 밖, 전투마다 2번).', resp: 1 },
  /* 0.8.0 M5-0 마검사 경계 큰 각인(10월 19일 만든 사람): 모두 새 행동. 경계 제어(60°) · 계승(180°) · 생존(300°) 자리 */
  ks_sb_sear: { dir: 'ct', cls: 'spellblade', bound: '혈염', n: '혈염의 각인', d: '출혈 걸린 적을 주문으로 치면 화상을 건너뛰고 바로 혈염이 됩니다.' },
  ks_sb_sin: { dir: 'lg', cls: 'spellblade', bound: '죄인의 피', n: '죄인의 각인', d: '막기로 받아낸 피해의 30%가 그 적에게 출혈로 되돌아갑니다.' },
  ks_sb_ash: { dir: 'sv', cls: 'spellblade', bound: '유산의 불', n: '잿불의 각인', d: '보호막이 0이 되는 순간 다음 기본 공격이 전열 화염 폭발이 됩니다.' },
  ks_sb_over: { dir: 'pw', cls: 'spellblade', n: '마검 과부하', d: '교대한 행동의 피해가 35% 늘어납니다. 교대를 세 번 이으면 다음 유산 4 스킬의 비용 −3(바닥 1, 전투마다 1번).', pay: '교대 보호막을 얻지 않습니다.' },
  ks_sb_beat: { dir: 'ct', cls: 'spellblade', n: '끊는 박자', d: '이어진 교대의 3번째 행동은 붕괴 +40(내 차례에 한 번).' },
  ks_sb_blood: { dir: 'su', cls: 'spellblade', n: '피를 두른 갑주', d: '보호막 상한이 최대 생명력의 15%에서 25%로 늘어납니다. 전투를 시작하면 보호막 6.' },
  ks_wd_drop: { dir: 'pw', cls: 'warden', n: '방패를 내린 자', d: '주는 직접 피해가 15% 늘어납니다.', pay: '방어가 받는 피해를 50%가 아니라 30%만 줄입니다.' },
  ks_wd_eternal: { dir: 'su', cls: 'warden', n: '영원한 성벽', d: '보호막 상한이 최대 생명력의 30%에서 40%로 늘어납니다.', pay: '보호막을 태우는 스킬의 피해 −30%.' },
  ks_mk_empty: { dir: 'pw', cls: 'monk', n: '비운 그릇', d: '기를 거두는 스킬(터뜨리기)의 피해가 30% 늘어납니다.', pay: '되받기로 기를 얻는 것은 내 차례 사이 한 번뿐입니다.' },
  ks_mk_vow: { dir: 'sv', cls: 'monk', n: '부동의 맹세', d: '자세가 있는 동안 받는 직접 피해가 12% 줄어듭니다.', pay: '⚡ 공격 스킬을 쓸 수 없습니다.' },
  /* 0.8.0 5단계 사냥꾼 (2-5, 8절 보완 1) */
  ks_hn_solo: { dir: 'pw', cls: 'hunter', n: '외길 사냥꾼', d: '같은 갈래 스킬을 바로 이어 쓰면(기본 공격 · 방어를 사이에 끼워도 됨) 그 스킬의 피해가 20% 늘어납니다. 연계 할인 강화(이어 쏘는 화살 · 이어 쏘는 활 · 이어 묶는 화살)는 같은 갈래를 바로 이어 쓸 때 비용 −1(라운드에 한 번)로 바뀝니다.', pay: '연계 피해 +30%가 사라집니다. 연계 할인은 같은 갈래 이어 쓰기 할인으로 바뀝니다.' },
  ks_hn_chase: { dir: 'lg', cls: 'hunter', n: '끝까지 쫓는 자', d: '추적 상한이 3겹에서 4겹으로 늘어납니다(겹마다 +5% 그대로).' },
  /* 10월 18일 0.8.0 5단계 원소술사 (3-3 · 3-5, 결정 11) */
  ks_el_cut: { dir: 'ct', cls: 'elementalist', n: '끊어진 영창', d: '끊기 · 무너뜨리기 · 먼저 치우기 가운데 무엇이든 성공하면 대응 충전 +1 더(라운드 한도 밖, 전투마다 2번).', resp: 1 }, // 10월 18일 0.8.0 5단계(원거리 초안 10절 결정 5): 계기를 대응 셋으로 넓힘
  ks_el_ember: { dir: 'pw', cls: 'elementalist', n: '잿불의 길', d: '화상을 지우며 치는 공격(불태우기 계열)이 지운 화상 1마다 피해 +1 더.', pay: '열충격 피해 −30%.' },
  ks_el_heart: { dir: 'sv', cls: 'elementalist', n: '얼음 심장', d: '서리 무게가 −30%에서 −45%가 됩니다(평소 공격만, 강타는 그대로).', pay: '내가 거는 화상 −1(최소 1).' },
  /* 10월 18일 0.8.0 5단계 암살자 (4-6): 거울 짝. 독을 키우면 흘리기가 약해지고, 흘리기를 키우면 독이 약해진다. 생존 K9는 무거운 갑주(흘리기 금지) 대신 그림자 맹세 */
  ks_as_lord: { dir: 'pw', cls: 'assassin', n: '독의 군주', d: '내가 거는 중독의 상한이 20에서 30으로 늘어납니다.', pay: '흘리기 감소분 −15%p(70% → 55%, 공통 흘리기 · 흘리기 스킬 모두).' },
  ks_as_oath: { dir: 'sv', cls: 'assassin', n: '그림자 맹세', d: '흘리기의 스태미나가 10 줄고, 흘리기 스킬의 피해(흘려 내고 주는 피해 포함)가 15% 늘어납니다.', pay: '내가 거는 독 −30%(반올림, 최소 1).' },
};
/* 0.8.0 M4(10월 19일) 전 큰 각인 배치. 옛 세이브에서 자리의 각인이 바뀐 것을 찾아 돌려준다(ksMigrateM4) */
const KS_V1 = {
  spellblade: { pwK5: 'ks_crystal', pwK9: 'ks_sb_over', ctK5: 'ks_hammer', ctK9: 'ks_sb_beat', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_brim', suK5: 'ks_cycle', suK9: 'ks_sb_blood', svK5: 'ks_wall', svK9: 'ks_heavy' },
  warden: { pwK5: 'ks_crystal', pwK9: 'ks_wd_drop', ctK5: 'ks_hammer', ctK9: 'ks_breaker', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_brim', suK5: 'ks_cycle', suK9: 'ks_wd_eternal', svK5: 'ks_wall', svK9: 'ks_heavy' },
  monk: { pwK5: 'ks_crystal', pwK9: 'ks_mk_empty', ctK5: 'ks_hammer', ctK9: 'ks_breaker', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_brim', suK5: 'ks_cycle', suK9: 'ks_dry', svK5: 'ks_wall', svK9: 'ks_mk_vow' },
  hunter: { pwK5: 'ks_crystal', pwK9: 'ks_hn_solo', ctK5: 'ks_hammer', ctK9: 'ks_breaker', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_hn_chase', suK5: 'ks_cycle', suK9: 'ks_dry', svK5: 'ks_wall', svK9: 'ks_heavy' },
  elementalist: { pwK5: 'ks_crystal', pwK9: 'ks_el_ember', ctK5: 'ks_el_cut', ctK9: 'ks_hammer', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_brim', suK5: 'ks_cycle', suK9: 'ks_dry', svK5: 'ks_wall', svK9: 'ks_el_heart' },
  assassin: { pwK5: 'ks_crystal', pwK9: 'ks_as_lord', ctK5: 'ks_hammer', ctK9: 'ks_breaker', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_brim', suK5: 'ks_cycle', suK9: 'ks_dry', svK5: 'ks_wall', svK9: 'ks_as_oath' }
};
/* 임시 트리의 큰 각인 자리 (K5, K9): 공용 큰 각인을 방향마다 목록 순서대로 */
const KS_TMP = { pw: ['ks_sharp', 'ks_glass'], ct: ['ks_brkbreath', 'ks_hammer'], ag: ['ks_slipbreath', 'ks_first'], lg: ['ks_deep', 'ks_double'], su: ['ks_cycle', 'ks_tireless'], sv: ['ks_blockbreath', 'ks_wall'] }; // 0.8.0 M4: K5 = 방향별 유산 통로(화력은 날 선 손), 밀린 K5는 같은 방향 K9로
/* 직업 트리 내용. nodes: 중간 노드 자리 → 효과 키, ks: 큰 각인 자리 → 큰 각인 키. 마검사는 7-3 · 7-4절 그대로 */
const PT_CLS = {
  spellblade: {
    pwL: { str: 2 }, pwR: { int: 2 }, pwC: { str: 1, int: 1 }, // 화력: 왼쪽 칸 힘, 오른쪽 칸 지능, C1 힘 +1 · 지능 +1
    smallFx: { pw1C: 'n_sb_hybrid' }, // 10월 17일 보완 2: 화력 입구(C1) 작은 노드에 양손의 마검을 붙인다. 자리 · 종류(작은 노드) · 기울기는 그대로
    nodes: {
      pw2L: 'k_sb1', pw3R: 'k_sb2', pw5L: 'a_eye', pw5R: 'n_sb_altedge', pw7L: 'a_scatter', pw7R: 'n_sb_finish',
      ct2L: 'n_sb_beatcut', ct3R: 'n_sb_telebrk', ct5L: 'a_gap', ct5R: 'n_sb_gap', ct7L: 'a_heavyhand', ct7R: 'n_sb_stagger',
      ag2L: 'n_sb_parryspell', ag3R: 'n_sb_lightcut', ag5L: 'a_resolve', ag5R: 'n_sb_farspell', ag7L: 'a_light', ag7R: 'a_gulp',
      lg1C: 'n_sb_altbeat', lg3L: 'n_sb_edgeadd', lg5L: 'n_overflow', lg5R: 'n_sb_three', lg7L: 'n_fullvessel', lg7R: 'n_sb_manaloop',
      su2L: 'k_sb3', su3R: 'n_sb_remnant', su5L: 'a_vigor', su5R: 'n_sb_thickaegis', su7L: 'a_warmth', su7R: 'n_sb_bloodmail',
      sv3L: 'n_sb_manamail', sv5L: 'a_skin', sv5R: 'n_sb_under', sv7L: 'a_iron', sv7R: 'a_stand',
    },
    ks2: { ctK5b: { fx: 'ks_sb_sear', req: 'sb_bloodfire' }, lgK5b: { fx: 'ks_sb_sin', req: 'sb_bloodmail' }, svK5b: { fx: 'ks_sb_ash', req: 'sb_heatmail' } }, // 0.8.0 M5-0 경계 큰 각인: K5 둘째 자리, 그 경계 입구(액티브)를 열어야 후보
    ks: { pwK5: 'ks_sharp', pwK9: 'ks_sb_over', ctK5: 'ks_brkbreath', ctK9: 'ks_sb_beat', agK5: 'ks_slipbreath', agK9: 'ks_first', lgK5: 'ks_deep', lgK9: 'ks_double', suK5: 'ks_cycle', suK9: 'ks_sb_blood', svK5: 'ks_blockbreath', svK9: 'ks_wall' },
  },
  /* 0.8.0 5단계 (10월 17일 만든 사람 검토 반영): docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 2-5 · 3-5 */
  warden: {
    nodes: {
      pw2L: 'k_wd3', pw3R: 'n_wd_wide', pw5L: 'a_eye', pw5R: 'n_wd_heavy', pw7L: 'a_point', pw7R: 'a_scatter',
      sv1C: 'n_wd_held', sv3L: 'n_wd_low', sv5L: 'a_skin', sv5R: 'n_wd_brace6', sv7L: 'a_iron', sv7R: 'a_stand',
      su2L: 'n_wd_will', su3R: 'n_wd_remnant', su5L: 'a_shell', su5R: 'n_wd_breath', su7L: 'a_warmth', su7R: 'a_brew',
      ct1C: 'k_wd2', ct3L: 'n_wd_shake', ct5L: 'a_gap', ct5R: 'n_wd_breakwall', ct7L: 'a_heavyhand', ct7R: 'n_shaken',
      ag3L: 'n_wd_turn', ag5L: 'a_resolve', ag5R: 'a_light', ag7L: 'a_gulp', ag7R: 'n_wd_pullhit',
      lg2L: 'n_wd_stack', lg3R: 'n_wd_respward', lg5L: 'n_fullvessel', lg5R: 'n_wd_ready', lg7L: 'n_wd_fuel', lg7R: 'n_wd_bracewall',
    },
    ks: { pwK5: 'ks_sharp', pwK9: 'ks_wd_drop', ctK5: 'ks_brkbreath', ctK9: 'ks_hammer', agK5: 'ks_slipbreath', agK9: 'ks_first', lgK5: 'ks_deep', lgK9: 'ks_double', suK5: 'ks_cycle', suK9: 'ks_wd_eternal', svK5: 'ks_blockbreath', svK9: 'ks_wall' },
  },
  monk: {
    nodes: {
      pw1C: 'k_mk1', pw3L: 'n_mk_loaded', pw5L: 'a_eye', pw5R: 'n_mk_burst', pw7L: 'a_point', pw7R: 'n_mk_last',
      sv2L: 'k_mk2', sv3R: 'n_mk_steady', sv5L: 'a_skin', sv5R: 'a_breath', sv7L: 'a_iron', sv7R: 'a_stand',
      su3L: 'n_mk_breath', su5L: 'a_vigor', su5R: 'n_mk_cycle', su7L: 'a_warmth', su7R: 'a_brew',
      ct2L: 'k_mk3', ct3R: 'n_mk_shake', ct5L: 'a_gap', ct5R: 'n_mk_seal', ct7L: 'a_heavyhand', ct7R: 'n_shaken',
      ag2L: 'n_mk_parry', ag3R: 'n_mk_prestance', ag5L: 'a_resolve', ag5R: 'a_light', ag7L: 'a_gulp', ag7R: 'n_mk_quick',
      lg1C: 'n_mk_vessel', lg3L: 'n_mk_seed', lg5L: 'n_fullvessel', lg5R: 'n_mk_double', lg7L: 'n_mk_pool', lg7R: 'n_mk_spill',
    },
    ks: { pwK5: 'ks_sharp', pwK9: 'ks_mk_empty', ctK5: 'ks_brkbreath', ctK9: 'ks_hammer', agK5: 'ks_slipbreath', agK9: 'ks_first', lgK5: 'ks_deep', lgK9: 'ks_double', suK5: 'ks_cycle', suK9: 'ks_tireless', svK5: 'ks_blockbreath', svK9: 'ks_mk_vow' },
  },
  /* 0.8.0 5단계 사냥꾼 (10월 18일 결정 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-5. 작은 노드는 화력 · 기민 민첩 +2(공격 능력치) */
  hunter: {
    nodes: {
      pw1C: 'k_hn2', pw3L: 'n_hn_pull', pw5L: 'a_eye', pw5R: 'n_hn_breath', pw7L: 'a_point', pw7R: 'a_scatter',
      sv3L: 'n_hn_tough', sv5L: 'a_skin', sv5R: 'n_hn_unavoid', sv7L: 'a_iron', sv7R: 'a_stand',
      su3L: 'n_hn_rest', su5L: 'a_vial', su5R: 'n_hn_camp', su7L: 'a_warmth', su7R: 'a_brew',
      ct2L: 'n_hn_tele', ct3R: 'n_hn_cutarrow', ct5L: 'a_gap', ct5R: 'n_hn_stopgap', ct7L: 'a_heavyhand', ct7R: 'n_shaken',
      ag1C: 'k_hn3', ag3L: 'n_hn_aside', ag5L: 'a_resolve', ag5R: 'n_hn_quick', ag7L: 'a_light', ag7R: 'a_gulp',
      lg2L: 'k_hn1', lg3R: 'n_hn_pass', lg5L: 'n_overflow', lg5R: 'n_hn_linkup', lg7L: 'n_fullvessel', lg7R: 'n_hn_finale',
    },
    ks: { pwK5: 'ks_sharp', pwK9: 'ks_hn_solo', ctK5: 'ks_brkbreath', ctK9: 'ks_hammer', agK5: 'ks_slipbreath', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_hn_chase', /* M5-4: 기민 K9 먼저 움직임(가속) → 흘림새 */ suK5: 'ks_cycle', suK9: 'ks_tireless', svK5: 'ks_blockbreath', svK9: 'ks_wall' },
  },
  /* 10월 18일 0.8.0 5단계 원소술사 (결정 9–11 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 3-5. 작은 노드는 화력 지능 +2(공격 능력치).
     화력 3고리는 공용 둘만(3-2 인플레이션 막기). 큰 각인: 끊어진 영창(제어 K5) · 잿불의 길(화력 K9, 대가) · 얼음 심장(생존 K9, 대가). 무거운 갑주 · 무너뜨리는 자는 두지 않는다 */
  elementalist: {
    nodes: {
      pw1C: 'k_el1', pw3L: 'n_el_student', pw5L: 'a_smolder', pw5R: 'n_el_blaze', pw7L: 'a_point', pw7R: 'a_scatter',
      sv3L: 'n_el_frostskin', sv5L: 'a_clear', sv5R: 'n_el_dull', sv7L: 'a_iron', sv7R: 'a_stand',
      su3L: 'n_el_coolbreath', su5L: 'a_vial', su5R: 'n_el_melt', su7L: 'a_warmth', su7R: 'a_brew',
      ct1C: 'k_el2', ct3L: 'n_el_chanthand', ct5L: 'a_gap', ct5R: 'n_el_cracked', ct7L: 'a_heavyhand', ct7R: 'n_shaken',
      ag2L: 'n_el_first', ag3R: 'n_el_light', ag5L: 'a_resolve', ag5R: 'n_el_scatter', ag7L: 'a_light', ag7R: 'a_gulp',
      lg2L: 'k_el3', lg3R: 'n_el_echo', lg5L: 'n_overflow', lg5R: 'n_el_spread', lg7L: 'n_fullvessel', lg7R: 'n_el_even',
    },
    ks: { pwK5: 'ks_sharp', pwK9: 'ks_el_ember', ctK5: 'ks_el_cut', ctK9: 'ks_brkbreath', agK5: 'ks_slipbreath', agK9: 'ks_first', lgK5: 'ks_deep', lgK9: 'ks_double', suK5: 'ks_cycle', suK9: 'ks_tireless', svK5: 'ks_blockbreath', svK9: 'ks_el_heart' },
  },
  /* 10월 18일 0.8.0 5단계 암살자 (결정 13–17 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 4-6. 시작 노드는 그대로(민첩 5 · 지능 4 · 체력 3), 작은 노드는 화력 · 기민 민첩 +2.
     큰 각인 12자리: 공용 10 + 암살자 2(독의 군주 화력 K9 · 그림자 맹세 생존 K9, 무거운 갑주 대신). 대가 다섯, 대응 큰 각인은 흘림새 하나 */
  assassin: {
    nodes: {
      pw2L: 'k_as1', pw3R: 'n_as_gap', pw5L: 'a_eye', pw5R: 'n_as_ripe', pw7L: 'a_point', pw7R: 'a_scatter',
      sv3L: 'n_as_thin', sv5L: 'a_skin', sv5R: 'n_as_dodge', sv7L: 'a_iron', sv7R: 'a_stand',
      su2L: 'n_as_drink', su3R: 'n_as_breath', su5L: 'a_vigor', su5R: 'n_as_warm', su7L: 'a_warmth', su7R: 'a_brew',
      ct2L: 'n_as_crush', ct3R: 'n_as_edge', ct5L: 'a_gap', ct5R: 'n_as_crack', ct7L: 'a_heavyhand', ct7R: 'n_shaken',
      ag1C: 'k_as3', ag3L: 'n_as_step', ag5L: 'a_resolve', ag5R: 'n_as_chain', ag7L: 'a_light', ag7R: 'a_gulp',
      lg1C: 'k_as2', lg3L: 'n_as_mem', lg5L: 'n_overflow', lg5R: 'n_as_store', lg7L: 'n_fullvessel', lg7R: 'n_as_link',
    },
    ks: { pwK5: 'ks_sharp', pwK9: 'ks_as_lord', ctK5: 'ks_brkbreath', ctK9: 'ks_hammer', agK5: 'ks_slipbreath', agK9: 'ks_first', lgK5: 'ks_deep', lgK9: 'ks_double', suK5: 'ks_cycle', suK9: 'ks_tireless', svK5: 'ks_blockbreath', svK9: 'ks_as_oath' },
  },
};
/* 임시 트리: 직업 갈래 각인(4-4)을 그 방향 1고리 첫 중간 노드 자리에 둔다. 도살자 벼랑 끝(k_bu2)은 6단계 큰 각인으로 합쳐질 것이라 임시 트리에 넣지 않는다 */
const PT_CLSAWK = {
  assassin: { pw: ['k_as1'], lg: ['k_as2'], ag: ['k_as3'] }, warden: { lg: ['k_wd1'], ct: ['k_wd2'], pw: ['k_wd3'] }, hunter: { lg: ['k_hn1'], pw: ['k_hn2'], ag: ['k_hn3'] },
  elementalist: { pw: ['k_el1'], ct: ['k_el2'], lg: ['k_el3'] }, monk: { pw: ['k_mk1'], sv: ['k_mk2'], ct: ['k_mk3'] },
  butcher: { pw: ['k_bu1'], su: ['k_bu3'] }, confessor: { su: ['k_cf1'], ct: ['k_cf2'], lg: ['k_cf3'] }, bloodmage: { pw: ['k_bm1'], su: ['k_bm2'], lg: ['k_bm3'] },
};
/* 옛 각인 가운데 트리에서 빠진 것 (4-4): 불룩한 주머니 · 샘의 기억. 흘림새는 큰 각인 ks_flow로 */
const AWK_GONE = ['a_purse', 'a_memory', 'a_flow'];
