/* 0.8.0 패시브 방사 트리 데이터 (10월 16일 0.8.0 2단계, docs/제안/0.8.0-1단계-트리설계-2026-10-16.md 1 · 2 · 3 · 4 · 7절)
   값만 둔다. 노드 · 연결 · 고리는 js/23-tree-engine.js의 ptBuild가 이 틀(2-3)에서 만든다. 노드 id = 방향 코드 + 반지름 + 칸(pw5L), 큰 각인 자리 pwK5 · pwK9, 시작 노드 S.
   마검사는 7절 승인 초안 그대로. 다른 8직업은 임시 트리(tmp: 1): 기울기 표의 1고리 + 공용 풀을 기계적으로 채운 것이다(5 · 6단계에서 직업 초안으로 바꾼다).
   효과 키: 옛 각인은 IFX_AWK의 키(a_eye), 새 효과는 IFX_NODE의 키(n_ · ks_). 이름 · 문장은 옛 각인이면 AWK_MAP, 새것이면 PN_TXT · KS_LIST */
const PT = {
  dirs: ['pw', 'ct', 'ag', 'lg', 'su', 'sv'], // 시계 방향, 위에서 시작
  dir: { pw: { n: '화력', a: 0 }, ct: { n: '제어', a: 60 }, ag: { n: '기민', a: 120 }, lg: { n: '계승', a: 180 }, su: { n: '유지력', a: 240 }, sv: { n: '생존', a: 300 } },
  lane: { L: -12, C: 0, R: 12 },
  pts: { start: 6, lv: 2 }, // 패시브 포인트: 시작 6 + 레벨마다 2 (만든 사람 결정 10월 16일)
  ring: { 1: 0, 2: 1, 3: 2 }, // 고리가 열리는 깬 챕터 수(run.clears, 표식 도전은 markCh − 1을 더함)
  ksN: 3, ksOffer: 3, // 큰 각인 제시: 찍은 곳에서 3칸 안, 셋
  smallBrk: 0.03, smallSt: 6, // 제어 작은 노드 주는 붕괴 +3%(곱), 계승 작은 노드 스태미나 +6
};
const AT_PTS = { start: 1, lv: 1 }; // 액티브 포인트: 시작 1 + 레벨마다 1
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
/* 시작 노드: 직업 기본 능력치 12점 (STAT_REC × 12 반올림) */
const PT_START = {
  spellblade: { str: 4, int: 4, con: 3, wil: 1 }, warden: { str: 4, con: 4, wil: 4 }, monk: { str: 4, dex: 4, con: 4 }, assassin: { dex: 5, int: 4, con: 3 },
  hunter: { dex: 5, con: 4, str: 3 }, elementalist: { int: 5, con: 4, wil: 3 }, butcher: { str: 4, con: 4, wil: 3, int: 1 }, confessor: { con: 4, str: 4, int: 4 }, bloodmage: { int: 5, con: 4, wil: 3 },
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
  n_sb_altbeat: { n: '교대의 박자', d: '교대 보호막이 1 늘어납니다(4 → 5).' },
  n_sb_edgeadd: { n: '칼에 새긴 주문', d: '주문이 칼에 싣는 출혈 · 화상이 1 늘어납니다.' },
  n_sb_three: { n: '세 박자', d: '이어진 교대의 3번째 행동이면 유산 +1(전투마다 2번, 🔄 환급 한도와 함께 씀).' },
  n_sb_manaloop: { n: '마력 순환', d: '교대 보호막을 얻을 때 스태미나 +3.' },
  n_sb_remnant: { n: '남는 마력', d: '전투가 끝날 때 남은 보호막의 절반만큼 생명력을 회복합니다(최대 생명력의 5%까지).' },
  n_sb_thickaegis: { n: '두꺼운 주문 방패', d: '주문 방패의 보호막 +3.' },
  n_sb_bloodmail: { n: '피의 갑주', d: '출혈 · 화상이 걸린 적을 쓰러뜨리면 보호막 +5.' },
  n_sb_manamail: { n: '마력 갑주', d: '전투를 시작하면 보호막 6.' },
  n_sb_under: { n: '보호막 아래', d: '보호막이 있으면 받는 직접 피해가 4% 줄어듭니다.' },
};
/* 큰 각인 (4-1 공용, 4-2 직업). dir은 그 자리의 방향, pay는 대가(빨간 줄) */
const KS_LIST = {
  ks_deep: { dir: 'lg', n: '깊은 샘', d: '유산 상한 +1(전투 시작 값도 +1).' },
  ks_brim: { dir: 'lg', n: '넘치는 그릇', d: '유산 상한 +2.', pay: '차례 충전이 짝수 번째 내 차례에만 들어옵니다.' },
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
  ks_sb_over: { dir: 'pw', cls: 'spellblade', n: '마검 과부하', d: '교대한 행동의 피해가 20% 늘어납니다.', pay: '교대 보호막을 얻지 않습니다.' },
  ks_sb_beat: { dir: 'ct', cls: 'spellblade', n: '끊는 박자', d: '이어진 교대의 3번째 행동은 붕괴 +40(내 차례에 한 번).' },
  ks_sb_blood: { dir: 'su', cls: 'spellblade', n: '피를 두른 갑주', d: '보호막 상한이 최대 생명력의 15%에서 22%로 늘어납니다.' },
};
/* 임시 트리의 큰 각인 자리 (K5, K9): 공용 큰 각인을 방향마다 목록 순서대로 */
const KS_TMP = { pw: ['ks_crystal', 'ks_glass'], ct: ['ks_hammer', 'ks_breaker'], ag: ['ks_first', 'ks_flow'], lg: ['ks_deep', 'ks_brim'], su: ['ks_cycle', 'ks_dry'], sv: ['ks_wall', 'ks_heavy'] };
/* 직업 트리 내용. nodes: 중간 노드 자리 → 효과 키, ks: 큰 각인 자리 → 큰 각인 키. 마검사는 7-3 · 7-4절 그대로 */
const PT_CLS = {
  spellblade: {
    pwL: { str: 2 }, pwR: { int: 2 }, pwC: { str: 1, int: 1 }, // 화력: 왼쪽 칸 힘, 오른쪽 칸 지능, C1 힘 +1 · 지능 +1
    nodes: {
      pw2L: 'k_sb1', pw3R: 'k_sb2', pw5L: 'a_eye', pw5R: 'n_sb_altedge', pw7L: 'a_scatter', pw7R: 'n_sb_finish',
      ct2L: 'n_sb_beatcut', ct3R: 'n_sb_telebrk', ct5L: 'a_gap', ct5R: 'n_sb_gap', ct7L: 'a_heavyhand', ct7R: 'n_sb_stagger',
      ag2L: 'n_sb_parryspell', ag3R: 'n_sb_lightcut', ag5L: 'a_resolve', ag5R: 'n_sb_farspell', ag7L: 'a_light', ag7R: 'a_gulp',
      lg1C: 'n_sb_altbeat', lg3L: 'n_sb_edgeadd', lg5L: 'n_overflow', lg5R: 'n_sb_three', lg7L: 'n_fullvessel', lg7R: 'n_sb_manaloop',
      su2L: 'k_sb3', su3R: 'n_sb_remnant', su5L: 'a_vigor', su5R: 'n_sb_thickaegis', su7L: 'a_warmth', su7R: 'n_sb_bloodmail',
      sv3L: 'n_sb_manamail', sv5L: 'a_skin', sv5R: 'n_sb_under', sv7L: 'a_iron', sv7R: 'a_stand',
    },
    ks: { pwK5: 'ks_crystal', pwK9: 'ks_sb_over', ctK5: 'ks_hammer', ctK9: 'ks_sb_beat', agK5: 'ks_first', agK9: 'ks_flow', lgK5: 'ks_deep', lgK9: 'ks_brim', suK5: 'ks_cycle', suK9: 'ks_sb_blood', svK5: 'ks_wall', svK9: 'ks_heavy' },
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
