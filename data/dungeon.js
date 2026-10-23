/* 나락의 유산 데이터: 던전과 갈림길 (기획서 11.3절)
   한 챕터 = 16층: 구간 1(1–3층, 큰 길) · 구간 2(4–7) · 8층 야영지 · 구간 3(9–11) · 구간 4(12–15) · 16층 보스. 갈림길 4 · 9 · 12층.
   0.8.0 6단계(10월 18일 만든 사람 승인, docs/제안/0.8.0-6단계-던전개편-설계초안-2026-10-18.md). 전에는 24층(상층 1–11 · 12 야영지 · 하층 13–23 · 24 보스). 값만 둔다. */
const FLOORS = 16;
const FLOOR_CAMP = 8, FLOOR_BOSS = 16;
const SEGS = [[1, 3], [4, 7], [9, 11], [12, 15]]; // 구간(갈림길에서 다음 구간 전체의 문을 미리 만든다)
const segOf = f => SEGS.findIndex(([a, b]) => f >= a && f <= b);
const STRONG_PER_SEG = 2; // A-4: 구간마다 강적 문이 있는 층은 둘까지
const isLower = f => f > FLOOR_CAMP;
const chOf = () => ({ boss: FLOOR_BOSS, camp: FLOOR_CAMP, lower: FLOOR_CAMP + 1, spring: 0 }); // 테스터(dgqa)가 읽는 챕터 틀

/* 방 유형: w 가중치, max 챕터당 최대, from 나오는 첫 층, fight 전투 방.
   10월 4일 만든 사람 결정: 보물을 줄이고 일반 · 매복 · 강적을 늘린다. 시련은 드물게. 샘은 문 하나에 2~3%, 한 층의 문 셋 가운데 나올 확률 4~9%(가중치 2). 언제나 1~10% 사이 */
const ROOM_TYPES = {
  normal: { n: '일반', ico: '⚔️', w: 30, max: 99, from: 1, fight: 1, risk: 1, gold: [6, 9], hint: '장비 1' },
  ambush: { n: '순찰대', ico: '🗡️', w: 15, max: 5, from: 2, fight: 1, risk: 2, gold: [9, 13], hint: '정예 둘 · 이기면 패시브 포인트 +1 또는 소모품 하나 · 전리품 많음 · 장비 1' }, // A-6: 표시 이름 순찰대(내부 키 ambush). 기습(첫 라운드 맨 뒤)은 없앴다
  market: { n: '암시장', ico: '🏮', w: 6, max: 1, from: 4, fight: 0, risk: 0, gold: [0, 0], hint: '고유 · 영웅 장비를 골드나 대가로' }, // A2 2챕터 장터 대로 4–11층, 챕터에 한 번(js/15 ch2TypeOk)
  strong: { n: '강적', ico: '💀', w: 13, max: 6, from: 3, fight: 1, risk: 3, gold: [40, 40], hint: '희귀 장비 · 골드 많음 · 전리품 많음' }, // 10월 4일 하이 리스크 하이 리턴: 희귀 보장, 전리품 LOOT.strong. 골드는 경제 맞춤으로 40
  treasure: { n: '보물', ico: '🗝️', w: 4, max: 2, from: 2, fight: 1, risk: 2, gold: [16, 16], hint: '상자: 장비 둘 중 하나, 희귀 보장' },
  trial: { n: '시련', ico: '🔥', w: 3, max: 2, from: 3, fight: 1, risk: 4, gold: [25, 25], hint: '방 특성 둘 · 희귀 장비' },
  spring: { n: '샘', ico: '💧', w: 2, max: 2, from: 2, fight: 0, risk: 0, hint: '생명력 50% 회복, 플라스크 각 1' },
  shrine: { n: '성소', ico: '🕯️', w: 6, max: 3, from: 1, fight: 0, risk: 0, hint: '3개 방 동안 이로운 효과' },
  altar: { n: '제단', ico: '🩸', w: 5, max: 3, from: 2, fight: 0, risk: 0, hint: '대가 있는 거래' },
  event: { n: '이벤트', ico: '❔', w: 7, max: 5, from: 2, fight: 0, risk: 0, hint: '선택에 따라 다르다' },
  fate: { n: '운명의 저울', ico: '⚖️', w: 0, max: 2, from: 2, fight: 0, risk: 0, hint: '장비를 한 단계 위로 올린다 · 실패하면 장비를 잃는다' }, // 2챕터부터. genDoors가 쉬는 문 하나를 바꿔 끼운다(typeOk는 늘 거짓)
};
/* 방 골드 (10월 4일 경제 맞춤): 24층이 되어 깬 캐릭터의 정산이 평균 464(목표 약 320)라 방 골드를 30%쯤 낮췄다. 정산 평균 368, 험한 길 위주 478, 샛길 위주 313 */
/* 강적은 상층 3, 하층 3까지 */
const STRONG_PER_HALF = 3; // 0.8.0 6단계: 쓰지 않는다(구간마다 STRONG_PER_SEG)
/* 문에 보상이 적혀 있지 않을 확률 (전투 방). 10월 4일 만든 사람 결정: 보상은 일부만 보인다 */
const HIDE_REWARD = 0.45;

/* 갈래길 (10월 4일 만든 사람 결정): 방과 방 사이에서 길을 고른다. 고른 길은 다음 갈래길까지 이어지고, 층마다 문 셋을 고르는 것은 그대로다.
   hp · dmg: 적 배율, loot: 전리품 확률 배율, gold: 방 골드 배율, up: 방에서 얻는 장비 등급이 한 단계 오를 확률(음수면 내려갈 확률), risk: 문 위험도(★) 더하기, w: 문 종류 가중치 배율 */
/* 가혹 모드 (10월 8일, docs/시스템/가혹모드-반복.md): 적과 보스의 직접 피해 ×1.3 (한 번 피해 상한은 곱한 뒤에 그대로, 목표 범위 1.3~1.5의 아래쪽: 1.4 · 생명력 ×1.15는 완주 0%), 적 생명력 ×1(hp 칸), 전리품 · 골드 · 경험치 배율.
   길도 다시 짠다: 가장 안전한 샛길도 일반의 큰 길만큼 아프다(PATHS_HARD). 영웅 · 전설 확률 ×1.5(hero)는 장비 풀이 합쳐진 뒤 rollGradeCh에 건다 */
const MODES = {
  normal: { n: '일반' },
  hard: { n: '가혹', dmg: 1.3, hp: 1, loot: 1.25, gold: 1.2, xp: 1.2, hero: 1.5,
    why: ['적과 보스가 30% 더 아프게 때립니다. 한 번에 받는 피해의 상한은 같습니다.', '가장 안전한 길도 일반의 큰 길만큼 위험합니다. 강적을 더 자주 만납니다.', '전리품과 골드, 경험치가 늘고 장비 등급이 더 자주 오릅니다.', '기록과 랭킹에 "가혹"이 붙습니다.'] },
};
const PATH_AT = [4, 9, 12]; // 이 층의 문을 열기 전에 길을 고른다(1–3층은 큰 길). 0.8.0 6단계: 갈림길에서 길 셋의 다음 구간을 미리 만들고 핵심 문을 보인다
const PATHS = {
  rough: { n: '험한 길', ico: '⛰️', hp: 1.15, dmg: 1.12, loot: 1.5, gold: 1.3, up: 0.35, risk: 1, w: { strong: 1.6, ambush: 1.5, trial: 2, treasure: 1.3, spring: 0.5, shrine: 0.6, event: 0.8 }, d: '적이 더 거셉니다. 강적 · 순찰대 · 시련 문이 자주 나옵니다. 전리품과 골드가 많고, 장비 등급이 자주 한 단계 오릅니다.' },
  main: { n: '큰 길', ico: '🛤️', hp: 1, dmg: 1, loot: 1, gold: 1, risk: 0, w: {}, d: '평소대로입니다.' },
  quiet: { n: '샛길', ico: '🌿', hp: 0.88, dmg: 0.9, loot: 0.7, gold: 0.75, up: -0.3, risk: -1, w: { strong: 0.4, ambush: 0.5, trial: 0.3, shrine: 1.5, event: 1.4, altar: 1.2, spring: 0.8 }, d: '적이 덜 거셉니다. 쉬는 방 문이 자주 나옵니다. 전리품과 골드가 적고, 장비 등급이 가끔 한 단계 내려갑니다.' },
};

const PATHS_HARD = {
  rough: Object.assign({}, PATHS.rough, { loot: 1.7, gold: 1.5, up: 0.45, w: { strong: 2.2, ambush: 1.5, trial: 2, treasure: 1.3, spring: 0.5, shrine: 0.6, event: 0.8 }, d: '적이 더 거셉니다. 강적 · 순찰대 · 시련 문이 아주 자주 나옵니다. 전리품과 골드가 크게 늘고, 장비 등급이 자주 한 단계 오릅니다.' }),
  main: Object.assign({}, PATHS.main, { loot: 1.15, w: { strong: 1.3 }, d: '강적 문이 조금 더 자주 나옵니다. 전리품이 조금 늘어납니다.' }),
  quiet: Object.assign({}, PATHS.quiet, { hp: 1, dmg: 1, loot: 0.85, gold: 0.85, up: 0, w: { strong: 0.7, ambush: 0.7, trial: 0.5, shrine: 1.3, event: 1.2, altar: 1.1, spring: 0.8 }, d: '가혹에서도 강적을 덜 만납니다. 적은 큰 길과 같은 세기입니다. 전리품과 골드가 조금 적습니다.' }),
};
const pathOf = (id, mode) => (mode === 'hard' && PATHS_HARD[id]) || PATHS[id] || PATHS.main;

/* 표식 도전 (10월 8일, docs/시스템/가혹모드-반복.md 2절 B): 3챕터를 한 번 깬 계정에 열린다. 깬 챕터 하나를 새 캐릭터로 다시 치르며 표식을 건다.
   pt: 표식 점수(1~3). 점수 합이 기록이고 칭호의 바탕이다(정산 보상은 없다). 문장에 보스 · 강적의 대처는 쓰지 않는다.
   수치 칸: dmg 적 직접 피해 배율, hp 적 생명력 배율(보스 제외), w 강적 문 가중치 배율, mul 값 · 접사 확률 배율, boss의 hp 보스 생명력 배율 */
const MARKS = {
  dmg: { ico: '🗡️', n: '날 선 칼날', pt: 2, dmg: 1.2, d: '적과 보스가 주는 직접 피해가 20% 늘어납니다.' },
  hp: { ico: '🪨', n: '질긴 가죽', pt: 2, hp: 1.2, d: '적의 생명력이 20% 늘어납니다. 보스는 따로 셉니다.' },
  flask: { ico: '🧪', n: '마른 병', pt: 1, d: '플라스크가 한 칸 줄어듭니다.' },
  strong: { ico: '⚔️', n: '강적의 길', pt: 2, w: 1.6, d: '강적이 기다리는 문이 더 자주 나옵니다.' },
  nocure: { ico: '🌿', n: '마른 약초', pt: 2, d: '생명력을 되찾는 소모품이 떨어지지 않습니다.' },
  noquiet: { ico: '🚧', n: '막힌 샛길', pt: 2, d: '갈래길에서 샛길을 고를 수 없습니다.' },
  trait: { ico: '🌫️', n: '짙은 기운', pt: 2, d: '싸우는 방에 방 특성이 하나 더 붙습니다.' },
  elite: { ico: '💀', n: '날뛰는 정예', pt: 1, mul: 1.6, d: '정예가 접사를 더 자주 얻습니다.' },
  boss: { ico: '👑', n: '거대한 수호자', pt: 3, hp: 1.25, d: '보스의 생명력이 25% 늘어납니다.' },
};
const MARK_START = { 2: { lv: 6 }, 3: { lv: 11 } };
/* 0.8.0 6단계 C (10월 18일 만든 사람 승인): 챕터 시작 꾸러미 = 1챕터부터 이어 한 신중 판이 그 챕터에 들어설 때의 중앙값보다 한 등급 아래.
   2챕터 중앙 희귀 · 희귀 · 고급 · 평범 · 평범 · 평범 → 고급 둘(무기 · 갑옷) · 평범 넷. 3챕터 중앙 영웅 · 희귀 · 희귀 · 고급 · 고급 · 평범 → 희귀(무기) · 고급(갑옷) · 고급 · 평범 셋.
   무기 · 갑옷은 직업에 맞는 셋 중 하나를 고른다. 골드는 정산 직후 골드의 하위 4분위(측정 4회차: 2챕터 앞 중앙 240 · 하위 4분위 185, 3챕터 앞 553 · 460), 약초 묶음은 소모품 수의 하위 4분위. 시작 자리는 앞 챕터 정산 뒤 상점(측정: docs/제안/0.8.0-6단계-던전개편-설계초안-2026-10-18.md) */
const MARK_KIT = {
  2: { weapon: 'm', armor: 'm', rest: { gloves: 'n', amulet: 'n', ring1: 'n', ring2: 'n' }, gold: 185, herb: 6 },
  3: { weapon: 'r', armor: 'm', rest: { gloves: 'm', amulet: 'n', ring1: 'n', ring2: 'n' }, gold: 460, herb: 7 },
}; // 10월 16일 0.8.0 2단계: 2챕터는 Lv6, 3챕터는 Lv11에서 시작(새 곡선의 챕터 끝 레벨)
/* 칭호 (계정 목표, 같은 문서 2절 C): 달성하면 하나를 골라 랭킹 이름 옆에 단다 */
const TITLES = [
  { id: 'branch', n: '갈래 완주', d: '한 직업의 세 갈래로 모두 3챕터 보스를 넘습니다.' },
  { id: 'hard', n: '가혹 완주', d: '가혹 모드에서 3챕터 보스를 넘습니다.' },
  { id: 'hidden', n: '숨겨진 직업 해금', d: '숨겨진 직업을 모두 엽니다.' },
  { id: 'codex', n: '도감 완성', d: '보스 도감의 겪은 일을 모두 채웁니다.' },
];

/* 방 특성: 전투 방에 상층 25%, 하층 45%. 시련은 둘 */
const ROOM_MODS = {
  narrow: { n: '좁은 회랑', d: '전열에 적이 2기까지만 섭니다. 나머지는 후열입니다.' },
  ceiling: { n: '무너지는 천장', d: '4라운드마다 모두가 피해 4를 입습니다.' },
  holy: { n: '성수 웅덩이', d: '라운드가 끝날 때마다 모두 생명력 1%를 되찾습니다.' },
  candle: { n: '촛불 제단', d: '화상 피해가 모두 50% 늘어납니다.' },
  bloodpool: { n: '피 웅덩이', d: '출혈 피해가 모두 2배가 됩니다.' },
  bell: { n: '종소리', d: '적 속도 +10%라 라운드에서 대개 나보다 먼저 움직입니다. 이 방의 골드 +50%.' },
  dark: { n: '어둠', d: '후열 적의 작은 행동 예고는 보이지 않습니다. 큰 공격의 예고는 보입니다.' },
  calm: { n: '고요', d: '마나가 자연 회복되는 양이 2배입니다.' },
};
const MOD_CHANCE = { upper: 0.25, lower: 0.45 };

/* 적 구성 틀 ([역할, 정예]) */
const ENC = {
  upper: [
    [['bruiser'], ['bruiser']], [['bruiser'], ['archer']], [['shield'], ['healer']], [['shield'], ['shield'], ['healer']],
    [['pyre'], ['shield'], ['bruiser']], [['summoner'], ['minion'], ['minion']], [['bruiser'], ['healer']], [['archer'], ['archer'], ['bruiser']],
    [['shield'], ['archer']], [['pyre'], ['shield']], [['summoner'], ['bruiser']], [['bruiser', 1]],
    [['thief'], ['bruiser']], [['darkmage'], ['shield']], [['healer'], ['bruiser'], ['minion']], [['thief'], ['archer']],
  ],
  lower: [
    [['bruiser', 1], ['archer']], [['shield', 1], ['healer'], ['bruiser']], [['archer', 1], ['archer'], ['pyre']], [['summoner'], ['minion'], ['minion'], ['healer']],
    [['bruiser'], ['bruiser'], ['healer', 1]], [['shield', 1], ['pyre'], ['bruiser']], [['bruiser', 1], ['summoner']], [['archer'], ['shield'], ['healer']],
    [['pyre', 1], ['bruiser']], [['shield'], ['archer', 1], ['minion']], [['bruiser'], ['bruiser'], ['archer']], [['healer'], ['shield'], ['bruiser', 1]],
    [['thief'], ['shield'], ['archer']], [['darkmage'], ['bruiser'], ['healer']], [['darkmage', 1], ['shield'], ['minion']], [['thief'], ['bruiser', 1]],
  ],
  treasure: [[['shield', 1], ['bruiser']], [['bruiser', 1], ['archer']], [['archer', 1], ['shield']]],
};
/* 강적 (자리만 먼저. 고유 규칙은 단계 8에서 비공개 문서대로 넣는다) */
/* 강적 공통 배율과 고유 수치 (11.8절). 일반 방보다 확실히 어렵게 (10월 2일 만든 사람 요청) */
const STRONG = { big: 0.46, hp: 3.7, dmg: 2.7, lowerHp: 1.3, lowerDmg: 1.15 }; // 하층 강적만 더: 무작위 시험 하층 순례자 40%대(만든 사람 요청) // 무작위 시험: 상층 승률 94%(남은 생명력 60%), 하층 76~82%(약 50%). 일반 방은 95~98%(65~83%)
/* 강적의 한 방 (10월 4일 만든 사람 결정: 강적은 보스보다 약하되 생명력의 20~30%를 깎는 한 방이 중심에 있다).
   big: 강적의 강타 = 기준 생명력(HIT_REF) × big. 던전 세기 · 길과 상관없이 늘 같다. 강적은 모두 공격 → 버티기 → 강타 준비 → 강타 */
/* 매복 (10월 4일 만든 사람 결정: 난이도는 늘 일반과 강적 사이, 강적 쪽에 가깝게). 적 체력 · 피해 배율, elite: 정예로 바꾸는 적 수, loot: 전리품 확률 배율 */
/* 0.8.0 6단계 B-5 편성 (측정 1 · 2 · 3 · 4회차)
   순찰대(내부 키 ambush): 정예 둘, 먼저 덮치지 않음, 이기면 패시브 포인트 +1(챕터에 ptMax번) 또는 소모품 셋 중 하나. 정예 둘에 1.5 · 1.4면 순손실이 옛 매복의 1.44배(목표 1.0–1.1) → 1.3 · 1.2
   일반 방: 2층부터 정예 하나, 4층부터 둘. 정예 하나만으로는 순손실이 옛 일반의 1.18 · 1.33 · 1.62배(목표 약 2배)
   야영지 쉬기: 최대 생명력의 60%(전에는 가득). 16층에서는 야영지 → 보스가 7층이라 보스 진입 생명력이 72 · 77%로 높았다(B-7 목표 60–75%). 45%로 더 낮춰도 테스터 결과는 같았다(전투 밖 회복 소모품이 메운다, 측정 5회차) */
const AMBUSH = { hp: 1.3, dmg: 1.2, elite: 2, loot: 1.5, ptMax: 2 };
const NORMAL_ROOM = { from: 2, elite: 1, from2: 4, elite2: 2, hp: 1, dmg: 1, ch: { 3: { elite: 0, elite2: 0 } } }; /* 3챕터: 일반 방 정예 없음(10월 19일, 3챕터 일반 방 라운드 8.4 → 약 6.9, 목표 5–7) */ // ch: 챕터별로 elite · elite2를 덮어쓴다(0.8.0 6단계 마감: 3챕터 일반 방 길이는 방 구성으로) // hp · dmg: 일반 방 적의 체력 · 피해 배율. 10월 19일 만든 사람 결정: 6단계는 ×1.0(측정만), 적 수치는 7단계에서 직업 격차를 고친 뒤 한 번에
const CAMP_REST = { hp: 0.6 };
const STRONG_FOES = [
  { id: 'bellringer', n: '종지기', en: [['shield', 1], ['minion']] }, // 10월 4일: 하수인을 뺐다(강적 다섯 가운데 가장 무거웠다)
  { id: 'pilgrim', n: '굶주린 순례자', en: [['bruiser', 1]], dmg: 0.8 }, // dmg · hp: 강적마다 평소 공격 · 체력 배율(큰 한 방은 그대로). 순례자는 다섯 가운데 가장 무거웠다
  { id: 'bishop', n: '납골당 주교', en: [['summoner', 1]] }, // 10월 4일 소환 축
  { id: 'cantor', n: '성가 조율자', en: [['healer', 1], ['bruiser'], ['bruiser'], ['archer']] }, // 10월 4일 축복 축
  { id: 'scribe', n: '검은 서기관', en: [['darkmage', 1], ['darkmage'], ['bruiser']] }, // 10월 4일 저주 축
];
/* 0.8.0 G-1 1챕터 강적 시계 값(만든 사람 확정 10월 23일, 2판 같은 날). 규칙 · 손잡이의 뜻은 비공개 문서 참조. 숫자는 가설
   dmg: 강적마다 평소 공격 배율(STRONG_GIM.dmg에 더 곱한다, js/34) */
const CLK1 = {
  bell: { max: 2, big: 1.1, bellHp: 2, stun: 1, dmg: 1.3 }, // 비공개 문서 참조
  pilgrim: { max: 3, full: 0.1, feast: 0.95, crouch: 1.3, crouchR: 1, dmg: 1.3 }, // 비공개 문서 참조
  bishop: { max: 2, march: 0.3, call: 1, drop: 1, dmg: 1 }, // 비공개 문서 참조
  cantor: { max: 3, per: 0.4, emp: 2, dotCut: 0.08, off: 1, dmg: 1 }, // 비공개 문서 참조
  scribe: { max: 2, verdict: 0.5, pen: 1, dmg: 0.9 }, // 비공개 문서 참조
};
/* A1 1챕터 강적: 큰 한 방 배율(M3 무시 시험에서 예고를 몰라도 96–100% 이겨서, 막지 못한 큰 한 방이 아프게). 숫자는 가설 */
const STRONG1 = { big: 2.2 };
const FOE_X = {
  cantor: { hymn: 0.25 }, // 옛 노래 겹 설명(js/60 ehymn)만 읽는다
};
/* 테마 무리 (10월 4일 만든 사람 결정: 테마 무리 + 변주). 일반 · 매복 · 시련 방의 적.
   up · low: 상층 · 하층 구성 [역할, 정예], vary: [칸, 바뀔 수 있는 역할들](반쯤 확률로 그 칸이 바뀐다), w: 가중치, press: 압박이 센 무리(험한 길에서 잦고 샛길에서 드물다) */
const SQUAD_VARY = 0.5;
// 가중치(w)는 직업 사이도 맞춘다: 저주 의식 · 광신 돌격 · 성가 행렬은 파수꾼에게, 문지기 · 혼성 순찰 · 화형 의식 · 도둑 떼는 암살자에게 상대적으로 무겁다 (10월 4일 잼)
const SQUADS = [
  { id: 'wall', from: 4, n: '방패벽', w: 1, up: [['shield'], ['shield'], ['minion']], low: [['shield', 1], ['shield'], ['archer']], vary: [2, ['minion', 'archer']] },
  { id: 'hymn', n: '성가 행렬', w: 1.4, up: [['bruiser'], ['bruiser'], ['healer']], low: [['bruiser', 1], ['bruiser'], ['healer']], vary: [1, ['bruiser', 'thief']] },
  { id: 'pyre', n: '화형 의식', w: 0.8, press: 1, up: [['bruiser'], ['pyre']], low: [['shield'], ['bruiser'], ['pyre', 1]], vary: [0, ['bruiser', 'shield', 'minion']] }, // 10월 5일: 자폭 행렬을 바꿨다
  { id: 'thieves', n: '도둑 떼', w: 0.8, up: [['thief'], ['thief'], ['archer']], low: [['thief'], ['thief'], ['archer', 1]], vary: [2, ['archer', 'darkmage']] },
  { id: 'rite', n: '저주 의식', w: 1.5, press: 1, up: [['minion'], ['darkmage'], ['darkmage']], low: [['shield'], ['darkmage', 1], ['darkmage']], vary: [0, ['bruiser', 'shield']] },
  { id: 'bones', n: '뼈 무덤', w: 1, up: [['bruiser'], ['summoner']], low: [['bruiser', 1], ['summoner']], vary: [0, ['bruiser', 'shield']] },
  { id: 'hunt', n: '사냥패', w: 1, press: 1, up: [['minion'], ['archer'], ['archer']], low: [['bruiser', 1], ['archer'], ['archer']], vary: [0, ['minion', 'bruiser', 'thief']] },
  { id: 'zeal', n: '광신 돌격', w: 1.3, up: [['bruiser'], ['bruiser']], low: [['bruiser', 1], ['bruiser']], vary: [1, ['bruiser', 'thief']] },
  { id: 'patrol', n: '혼성 순찰', w: 1, up: [['bruiser'], ['archer'], ['healer']], low: [['bruiser'], ['archer'], ['healer', 1]], vary: [1, ['archer', 'darkmage', 'thief', 'pyre']] },
  { id: 'gate', n: '문지기', w: 0.6, up: [['bruiser', 1]], low: [['bruiser', 1], ['shield']], vary: [0, ['bruiser', 'shield']] },
  { id: 'drill', n: '순찰대', w: 1.2, amb: 1, up: [['drill', 1], ['bruiser'], ['archer']], low: [['drill', 1], ['bruiser'], ['archer']] }, // A1 1챕터 이식: 수련장(우두머리)이 이끈다. amb = 순찰대 방(ambush)에만
];

/* 성소: 다음 3개 방 동안 */
const SHRINES = [
  { id: 'break', n: '무너뜨림의 성소', d: '붕괴 게이지를 채우는 양 +20%.' },
  { id: 'ward', n: '인내의 성소', d: '받는 지속 피해 −30%.' },
  { id: 'wrath', n: '분노의 성소', d: '주는 피해 +10%.' },
  { id: 'breath', n: '숨결의 성소', d: '스태미나 자연 회복 +3.' },
  { id: 'mercy', n: '자비의 성소', d: '생명력 플라스크 회복 +10%p.' },
];

/* 제단: 대가 있는 거래 */
const ALTARS = [
  { id: 'blood', n: '피의 거래', d: '최대 생명력 5%를 바치고(이 캐릭터가 끝날 때까지) 희귀 장비 하나를 받습니다.' },
  { id: 'gold', n: '황금 촛대', d: '골드 40을 내면 세 플라스크가 하나씩 찹니다.' },
  { id: 'offer', n: '바치는 제단', d: '가방의 장비 하나를 바치면 한 등급 위의 장비 하나를 받습니다(희귀는 다시 희귀).' },
];

/* 이벤트 (1챕터). 같은 것은 한 챕터에 한 번. frag = 고르면 보이는 이야기 조각(세계 노트 9절, A1 1챕터 이식), wake = 그 확률로 바로 싸우는 적 */
const EVENTS = [
  { id: 'confess', n: '버려진 고해실', lore: '휘장 너머에서 누군가 숨을 고른다.', opts: [{ id: 'do', n: '고해한다', d: '희귀 장비 하나와 이야기 조각 하나. 대신 약화 3 · 취약 3을 안고 다음 전투에 들어갑니다.', frag: '수도원장은 그 밤에도 누군가의 고해를 듣기 위해 수도원에 남아 있었다. 허나 마지막 고해자는 끝내 오지 않았다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'pilgrim', n: '쓰러진 순례자', lore: '짐 보따리가 아직 따뜻하다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '장비 하나. 대신 다음 전투를 중독 3으로 시작합니다.' }, { id: 'pray', n: '기도한다', d: '생명력 플라스크 +1.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'reliquary', n: '잠긴 성물함', lore: '녹슨 자물쇠가 손을 기다린다.', opts: [{ id: 'force', n: '억지로 연다', d: '스태미나 40을 쓰고 골드 30 또는 고급 장비를 얻습니다. 30%로 성물함 곁에 눕혀 둔 것이 깨어나 바로 싸웁니다(기워진 시체 둘).', wake: { p: 0.3, en: [['minion'], ['minion']], msg: '성물함 곁에 눕혀 둔 것이 깨어난다' } }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'chalice', n: '피 묻은 성배', lore: '잔 바닥에 검붉은 것이 고여 있다.', opts: [{ id: 'drink', n: '마신다', d: '최대 생명력 +5(영구). 지금 생명력은 15% 줄어듭니다.' }, { id: 'spill', n: '쏟는다', d: '정화 플라스크 +1.' }] },
  { id: 'candle', n: '속삭이는 촛불', lore: '불꽃이 이름을 부른다.', opts: [{ id: 'snuff', n: '불을 끈다', d: '다음 3개 방 동안 받는 화상 피해가 0이 됩니다. 대신 주는 피해 −5%.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'library', n: '무너진 서고', lore: '젖은 책장 사이로 글자가 번진다.', opts: [{ id: 'read', n: '책을 읽는다', d: '패시브 포인트 1과 이야기 조각 하나. 대신 번진 글자를 소리 내어 읽고 맙니다: 다음 전투에 검은 기도사 하나가 더해집니다.', frag: '입소 명부의 마지막 장. 아이들 이름 옆마다 같은 글씨로 \'안쪽으로\'라고 적혀 있다.' }, { id: 'sell', n: '책을 챙긴다', d: '골드 20.' }] },
  { id: 'monk', n: '굶주린 수도사', lore: '뼈만 남은 손이 소매를 붙든다.', opts: [{ id: 'feed', n: '먹을 것을 준다', d: '플라스크 하나(가장 많이 찬 것)를 비우면 다음 전투 방에서 장비 하나를 더 얻습니다. 이야기 조각 하나.', frag: '수도사들은 제 몫의 빵을 아이들 그릇에 먼저 덜었다. 그릇이 비는 날에도 그랬다.' }, { id: 'chase', n: '내쫓는다', d: '다음 전투에 굶주린 수도사(돌격병)가 더해집니다. 이기면 골드 20.' }] },
  { id: 'bell', n: '종탑의 줄', lore: '줄 끝이 아래로, 아래로 이어진다.', opts: [{ id: 'pull', n: '당긴다', d: '다음 층 문에 강적이 반드시 나옵니다. 골드 15.' }, { id: 'pass', n: '지나친다', d: '' }] },
];

/* ===== 성장과 적 (기획서 11.4절, 11.8절) ===== */
/* 몬스터 레벨: 1챕터 1~4. 레벨마다 체력 +12%, 피해 +10% */
const MLV_HP = 0.12, MLV_DMG = 0.10;
/* 난이도 (10월 2일, 만든 사람 결정: 1챕터 완주 자동 테스터 평균 20%, 숙련·탐험가 40%. 1층부터 실전) 던전 방의 적 체력·피해 배율 */
const DIFF = { upper: { hp: 0.72, dmg: 0.57 }, lower: { hp: 0.9, dmg: 0.58 } }; // 10월 4일 강적 다섯 · 테마 무리 뒤: AI 테스터 완주 암살자 9 · 파수꾼 13%. 이전: 상층 0.75 · 0.6, 하층 1.0 · 0.68 (1차 0.8 · 0.65, 1.05 · 0.7. 개편 전 0.9 · 0.85, 1.2 · 0.9)
function mlvOf(f, ch) { return (f >= FLOOR_BOSS ? 4 : f <= 4 ? 1 : f <= FLOOR_CAMP ? 2 : f <= 12 ? 3 : 4) + 4 * (((ch || (typeof G !== 'undefined' && G.run && G.run.ch)) || 1) - 1); } // 24층: 6층마다 한 단계. 챕터마다 +4 (1챕터 1~4, 2챕터 5~8, 3챕터 9~12, 기획서 11.4)
/* 경험치: 일반 5, 정예 12, 강적 40, 보스 100 × (1 + 0.15 × (몬스터 레벨 − 1)). 소환된 적은 0 */
const XP_BASE = { normal: 7.5, elite: 18, strong: 60, boss: 100 }; // 0.8.0 6단계 A-2: 층이 24 → 16이라 전투가 줄어든 만큼 ×1.5(보스는 한 번이라 그대로). 챕터 끝 Lv6 · 11 · 16으로 맞춘다 // 강적 30 → 40 (10월 4일 하이 리스크 하이 리턴) // 보스 150이면 챕터 끝 Lv6으로 목표(4~5)를 넘어 100으로 (10월 2일)
const CH1_NORMAL_XP = 1.5; // 첫 챕터 일반 전투의 성장 보상. 강적 호위·다른 전투 유형에는 적용하지 않는다.
function roomXpMul(room, mode) {
  return (chData(room.ch).xp || 1) * ((mode || room.mode) === 'hard' ? MODES.hard.xp : 1) * (!room.boss && (room.ch || 1) === 1 && room.type === 'normal' ? CH1_NORMAL_XP : 1);
}
/* 보스에서 오른 능력치는 다음 챕터 준비에서 나눈다(run.statPending, 단계 9) */
const XP_LV = 0.15;
/* 레벨 n이 되는 데 필요한 누적 경험치 (LV_XP[n-1]) */
const LV_XP = [0, 40, 100, 190, 330, 520, 740, 970, 1210, 1450, 1700, 2000, 2340, 2720, 3120, 3540]; // 10월 16일 0.8.0 2단계 (1단계 설계 5-3절): 상한 Lv16. 챕터 끝 목표 1챕터 5–6 · 2챕터 10–11 · 3챕터 15–16, 챕터 경험치 배율은 그대로
const LV_POINTS = 3; // 10월 16일 0.8.0 2단계: 능력치 나누기는 패시브 트리로 바뀌었다(data/ptree.js). 아래 셋은 옛 판 기록 · 비교 도구용으로만 남긴다
const STAT_START = 20; // (옛) 시작 20점 · 레벨마다 능력치 3점
const STAT_REC = { assassin: { dex: 0.4, int: 0.35, con: 0.25 }, warden: { str: 0.35, con: 0.35, wil: 0.3 }, hunter: { dex: 0.45, con: 0.3, str: 0.25 }, butcher: { str: 0.3, con: 0.3, wil: 0.25, int: 0.15 }, elementalist: { int: 0.45, con: 0.35, wil: 0.2 }, spellblade: { str: 0.3, int: 0.3, con: 0.25, wil: 0.15 }, monk: { str: 0.35, dex: 0.35, con: 0.3 }, confessor: { con: 0.35, str: 0.35, int: 0.3 }, bloodmage: { int: 0.4, con: 0.3, wil: 0.3 } }; // 추천 배분 (직업마다)
/* 정예 접사 "강인": 체력 +50% (4.6절 1막 접사). 정예에게 상층 35%, 하층 60% */
const TOUGH_CHANCE = { upper: 0.35, lower: 0.6 };
/* 1챕터(저주받은 수도원) 적 이름. 역할은 카드에 작게 함께 보인다 */
const ENEMY_NAMES = { 1: Object.fromEntries(Object.values(FOES).filter(f => f.ch === 1 && f.grade === 'mob').map(f => [f.id, f.n])) }; // A0: 이름은 data/foes.js

/* ===== 챕터 (10월 5일, 1~3챕터 작업): 챕터마다 다른 값은 여기서만 읽는다(chData). 층 틀(16층, 갈림길 4 · 9 · 12층)은 모든 챕터가 같다.
   n 이름, boss 보스, settleLore 정산 분위기 문장, nextLore 다음 챕터를 내다보는 문장, diff 던전 세기(없으면 DIFF), names 적 이름(없으면 ENEMY_NAMES[1]).
   SQUADS · STRONG_FOES · EVENTS의 ch(없으면 1)와 ROOM_MODS의 chs(없으면 모든 챕터)로 챕터를 가른다 */
const CHAPTERS = {
  1: { strongFrom: 4, n: '저주받은 수도원', boss: 'abbot', settleLore: '수도원장의 종이 멎었다. 굳게 닫혔던 수도원 뒷문이 열리고, 밤공기가 밀려든다.', nextLore: '수도원 문 밖, 꺼진 등불의 거리로.' },
};
const chData = ch => CHAPTERS[ch] || CHAPTERS[1];
const diffOf = ch => chData(ch).diff || DIFF;
const inCh = (x, ch) => (x.ch || 1) === (ch || 1);
/* ===== 강적과 보스: 처음 만날 때 "눈에 보이는 것", 겪은 뒤 도감 (기획서 11.9절) =====
   여기에는 대처법을 쓰지 않는다. 기믹 상세는 저장소 밖 비공개 문서에 있다 */
const FOE_INTRO = {
  ...Object.fromEntries(Object.values(FOES).filter(f => f.ch === 1 && f.log.lore).map(f => [f.id, { n: f.n, lore: f.log.lore, see: [f.log.see] }])), // A0: 1챕터는 data/foes.js log
};
/* 도감: 처음 겪은 일만 적힌다 (결과만, 대처법은 플레이어 메모) */
const CODEX = {
  ...Object.fromEntries(Object.values(FOES).filter(f => f.ch === 1 && f.log.codex).map(f => [f.id, f.log.codex])), // A0: 1챕터는 data/foes.js log.codex
};

CHAPTERS[1].xp = 1; CHAPTERS[1].gold = 1; CHAPTERS[1].settleStrong = 20;
/* ===== 2챕터 「어둠이 가라앉은 거리」 (0.8.0 A2, 만든 사람 확정 10월 21일, docs/챕터/2챕터.md) =====
   틀은 1 · 3챕터와 같다(16층, 갈림길 4 · 9 · 12층). 강적 · 보스의 기믹과 대처는 비공개 문서. 숫자 · 타수는 가설(M7). 옛 2챕터(지하묘지)는 data/archive/old-ch2.js */
ENEMY_NAMES[2] = Object.fromEntries(Object.values(FOES).filter(f => f.ch === 2 && ['mob', 'elite'].includes(f.grade)).map(f => [f.id, f.n]));
CHAPTERS[2] = {
  n: '어둠이 가라앉은 거리', boss: 'bardo', names: ENEMY_NAMES[2], strongFrom: 4, xp: 1.45, gold: 1.35, settleStrong: 30,
  diff: { upper: { hp: 0.75, dmg: 0.51 }, lower: { hp: 0.92, dmg: 0.527 } }, // 피해 배율은 옛 2챕터 값 그대로(체력은 타수가 정한다)
  enterLore: '수도원의 종소리가 등 뒤에서 멎는다. 앞에는 깨진 등불이 늘어선 거리가 있다.',
  settleLore: '마지막 등불이 꺼진다. 어둠 속에서 누군가 고맙다고 말한 것 같다.',
  nextLore: '거리 끝에 성벽의 그림자가 걸려 있다.',
  deathLine: '당신의 등불도 값을 치르지 못했다.',
  bands: [
    { to: 3, n: '빈민가 어귀', line: '등불이 드문드문하다. 창마다 누군가 숨을 죽인다.' },
    { to: 7, n: '꺼진 장터', line: '좌판마다 등불이 깨져 있다. 저울만 아직 흔들린다.' },
    { to: 8, n: '문 닫은 여관', line: '간판의 등불 하나가 아직 탄다. 주인은 없다.' },
    { to: 11, n: '뒷골목 미로', line: '벽마다 빚진 이름이 적혀 있다. 몇은 지워져 있다.' },
    { to: 15, n: '투기장 언저리', line: '아무도 없는데 함성이 들린다.' },
    { to: 16, n: '등불 왕좌', line: '거리의 등불이 전부 여기 걸려 있다. 너무 밝아서 그림자가 없다.' },
  ],
  paths: { rough: { n: '뒷골목', d: '패거리가 지키는 골목. 위험한 만큼 장물이 쌓여 있다.' }, main: { n: '장터 대로', d: '등불이 가장 많이 깨진 큰길. 평소대로다.' }, quiet: { n: '지붕길', d: '지붕을 건너는 길. 적은 적지만 석궁이 내려다본다.' } },
};
/* 2챕터 무리 여덟. pw: 길마다 가중(뒷골목은 장물아비 · 투견, 지붕길은 석궁잡이), lead: 순찰대 방(from층부터)에서 첫 자리를 우두머리로, formation: 자경단 대형 */
SQUADS.push(
  { id: 'gang', ch: 2, n: '패거리 순찰', w: 1.4, from: 1, up: [['thug'], ['xbow'], ['dun']], low: [['thug'], ['xbow'], ['dun', 1]] },
  { id: 'roof', ch: 2, n: '지붕 매복', w: 1.0, from: 1, pw: { quiet: 2 }, up: [['xbow'], ['xbow'], ['thug']], low: [['xbow', 1], ['xbow'], ['thug']] },
  { id: 'dues', ch: 2, n: '수금 행렬', w: 1.2, from: 2, up: [['dun'], ['dun'], ['quack']], low: [['dun'], ['dun'], ['quack', 1]] },
  { id: 'fireplay', ch: 2, n: '불장난', w: 1.0, from: 4, pw: { rough: 1.6 }, up: [['arson'], ['fence']], low: [['thug'], ['arson', 1], ['fence']] },
  { id: 'dogs', ch: 2, n: '투견판', w: 1.0, from: 4, pw: { rough: 1.6 }, lead: { role: 'pitboss', from: 12 }, up: [['hound'], ['hound'], ['hound']], low: [['hound', 1], ['hound'], ['hound']] },
  { id: 'chains', ch: 2, n: '사슬 작업장', w: 1.2, from: 9, up: [['overseer'], ['chained'], ['chained']], low: [['overseer'], ['chained'], ['chained']] },
  { id: 'smokeden', ch: 2, n: '연기 굴', w: 1.0, from: 9, up: [['smoker'], ['smoker'], ['hound']], low: [['smoker', 1], ['smoker'], ['hound']] },
  { id: 'watch', ch: 2, n: '자경단 대형', w: 1.4, from: 12, formation: 1, up: [['thug'], ['thug'], ['xbow'], ['dun', 1]], low: [['thug'], ['thug'], ['xbow'], ['dun', 1]] },
);
ENC.treasure2 = [[['thug', 1], ['dun']], [['dun', 1], ['xbow']], [['fence', 1], ['smoker']]];
/* 방 특성(확정본): 2챕터는 어둠 · 구경꾼 · 기름 바닥 · 빗속. 어둠은 장치 「등불」이 층 띠마다 정한다(LAMP.dark), 나머지는 rollMods로 */
for (const k of ['narrow', 'ceiling', 'candle']) ROOM_MODS[k].chs = [1]; ROOM_MODS.bloodpool.chs = [1, 3];
ROOM_MODS.crowd = { n: '구경꾼', chs: [2], d: '라운드가 끝날 때마다 구경꾼이 아무에게나 돌을 던집니다(피해 3, 나와 적 모두). 그 라운드에 무너뜨린 적이 있으면 환호하느라 던지지 않습니다.' };
ROOM_MODS.oilfloor = { n: '기름 바닥', chs: [2], d: '화상이 걸릴 때 1 더 걸립니다. 해결사가 있으면 전투가 시작될 때 모두 화상 1.' };
ROOM_MODS.rain = { n: '빗속', chs: [2], d: '화상이 라운드마다 2씩 줄어듭니다. 둔화가 걸릴 때 1 더 걸립니다.' };
ALTARS.push({ id: 'debt', chs: [2], n: '빚의 제단', d: '지금 골드 60을 가불받습니다. 대신 다음 상점 값 +30%(한 번).' });
/* 이벤트 아홉 (확정본 2챕터). frag = 이야기 조각(세계 노트 9절), wake = 그 확률로 바로 싸우는 적(first: 적이 먼저, win: 이기면 받는 것) */
EVENTS.push(
  { id: 'attic', ch: 2, n: '다락의 아이들', lore: '다락 문 틈으로 작은 눈이 여럿 보인다.', opts: [{ id: 'feed', n: '먹을 것을 준다', d: '플라스크 하나(가장 많이 찬 것)를 비웁니다. 다음 층에 성소가 반드시 나옵니다. 이야기 조각 하나.', frag: '수도원 사람들이 여기까지 아이들을 데리러 왔다. 아이들은 겁에 질린 채 서로의 손을 꼬옥 잡고는, 나가려 들지 않았다.' }, { id: 'close', n: '문을 닫아 준다', d: '아무 일도 없습니다.' }, { id: 'search', n: '다락을 뒤진다', d: '골드 25. 대신 이 챕터의 성소가 모두 닫힙니다(수도원의 빛이 등을 돌린다).' }] },
  { id: 'ledgerpage', ch: 2, n: '찢긴 장부 한 장', lore: '이름들 위에 줄이 그어져 있다. 맨 아래에 하나가 남았다.', opts: [{ id: 'erase', n: '이름을 지운다', d: '최대 생명력 +5와 이야기 조각 하나. 대신 빚 장부의 주인이 당신을 기억합니다(만나면 빚이 쌓인 채 시작).', frag: '시민들의 빚, 전액 탕감. — 등불 상인 바르도가 지불하였음.' }, { id: 'take', n: '장부를 챙긴다', d: '골드 25. 다음에 만나는 수금꾼 무리가 당신을 먼저 노립니다.' }, { id: 'leave', n: '놓고 간다', d: '' }] },
  { id: 'lampshop', ch: 2, n: '꺼진 등불 가게', lore: '기름통이 반쯤 남아 있다. 뚜껑이 조금 부풀어 있다.', opts: [{ id: 'open', n: '기름통을 연다', d: '70%로 등불 기름 둘. 30%로 통이 터져 화상 4를 입고, 다음 전투 방이 기름 바닥이 됩니다.' }, { id: 'light', n: '가게 등불을 하나 켜 둔다', d: '다음 3개 방에 어둠이 없습니다. 대신 불빛을 보고 패거리가 모입니다(다음 전투 적 하나 더).' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'betboard', ch: 2, n: '투기장 내기판', lore: '판돈 걸린 칠판. 오늘의 승자 칸이 비어 있다.', opts: [{ id: 'bet', n: '골드 20을 건다', d: '다음 전투를 4라운드 안에 이기면 골드 60. 못 이기면 건 돈을 잃습니다.' }, { id: 'ring', n: '직접 링에 선다', d: '바로 싸웁니다(투견 둘 · 패배자 하나). 이기면 골드 50과 장비 하나.', wake: { p: 1, en: [['hound'], ['hound'], ['loser']], gold: 50, item: 1, msg: '링에 오른다. 개들이 목줄을 끊는다' } }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'keys', ch: 2, n: '사슬 열쇠 꾸러미', lore: '감독관의 허리에서 떨어진 것.', opts: [{ id: 'free', n: '사슬을 푼다', d: '다음 사슬 작업장 무리에 일꾼이 없습니다(풀려남). 이야기 조각 하나. 대신 감독관이 눈치챕니다: 그 무리의 감독관이 정예로 나옵니다.', frag: '열쇠마다 이름표가 달려 있다. 이름 위에 덧쓴 숫자가, 이름보다 크다.' }, { id: 'sell', n: '판다', d: '골드 30.' }, { id: 'leave', n: '놓고 간다', d: '' }] },
  { id: 'tavern', ch: 2, n: '노래하는 술집', lore: '목소리는 들리는데 손님이 없다.', opts: [{ id: 'listen', n: '한 곡 듣는다', d: '생명력 20%와 스태미나를 가득 채웁니다.' }, { id: 'sing', n: '함께 부른다', d: '다음 전투 첫 라운드에 주는 피해 +20%.' }, { id: 'ignore', n: '무시한다', d: '저주가 걸립니다. 다음 전투에서 주는 피해 −20%.' }] },
  { id: 'elixir', ch: 2, n: '약장수의 병', lore: '병 안에서 연기가 꿈틀거린다.', opts: [{ id: 'drink', n: '마신다', d: '다음 3개 방 동안 주는 피해 +15%, 그 뒤 2개 방 동안 받는 피해 +10%.' }, { id: 'dump', n: '버린다', d: '연기가 새어 나와 몸을 몽롱하게 만듭니다. 다음 3개 방 동안 주는 피해 −15%.' }] },
  { id: 'wallnames', ch: 2, n: '벽의 이름들', lore: '누군가 손톱으로 긁은 이름들. 이 자가 한 일은 기록되지 않았다.', opts: [{ id: 'read', n: '읽는다', d: '다음 강적 방 보상이 한 단계 오릅니다. 이야기 조각 하나. 대신 이름들이 머릿속에 남습니다: 다음 2개 방 동안 약화 1.', frag: '이름이 하나 늘 때마다 손톱자국이 깊어졌다. 이 자가 한 일은, 이 벽만이 기억한다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'wallet', ch: 2, n: '떨어진 지갑', lore: '두툼한 지갑이 길 한가운데 놓여 있다. 너무 한가운데다.', opts: [{ id: 'pick', n: '줍는다', d: '50%로 골드 30. 50%로 장물아비 매복(바로 싸움, 장물아비 둘 · 덩치, 적이 먼저).', wake: { p: 0.5, en: [['fence'], ['fence'], ['thug']], first: 1, elseGold: 30, msg: '지갑을 줍는 순간 골목에서 장물아비들이 덮친다' } }, { id: 'kick', n: '발로 차 본다', d: '지갑이 줄에 당겨져 사라집니다. 아무 일도 없습니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
);
/* 2챕터 강적 다섯 · 보스 바르도. 무엇을 하는지와 대처는 비공개 문서에만 적는다 */
STRONG_FOES.push(
  { id: 'ledger', ch: 2, n: '빚 장부의 주인', en: [['dun', 1], ['thug']] },
  { id: 'champion', ch: 2, n: '투기장 챔피언', en: [['loser', 1], ['hound']], from: 9 },
  { id: 'lampthief', ch: 2, n: '등불 도둑', en: [['fence', 1], ['xbow']] },
  { id: 'captain', ch: 2, n: '장터 경비대장', en: [['dun', 1], ['thug'], ['xbow']] },
  { id: 'merchant', ch: 2, n: '계약 상인', en: [['fence', 1], ['thug']] },
);
Object.assign(FOE_INTRO, Object.fromEntries(Object.values(FOES).filter(f => f.ch === 2 && ['strong', 'boss'].includes(f.grade)).map(f => [f.id, { n: f.n, lore: f.log.lore, see: [f.log.see] }])));
/* 도감: 겪은 결과만(대처는 플레이어 메모) */
Object.assign(CODEX, {
  ledger: { debt: '빚이 목까지 차자 장부의 주인이 장비 하나를 차압하고 집행했다.', paid: '골드를 내자 빚이 줄었다.', torn: '무너뜨리자 장부가 찢어져 빚이 사라졌다.', back: '장부의 주인이 쓰러지자 빼앗긴 장비를 되찾았다.' },
  champion: { duel: '결투를 선언하자 다른 적이 물러섰다.', cheer: '함성이 다 차자 챔피언이 결승타를 날렸다.', boo: '함성이 잦아들자 관중이 야유했고, 챔피언의 손이 무뎌졌다.' },
  lampthief: { dark: '도둑이 등불을 끌 때마다 어둠이 짙어졌다.', hide: '어둠이 완전히 내려앉자 도둑은 그림자 속에서 끝까지 찔러 왔다.', lit: '숨은 도둑이 드러나자 빈틈이 보였다.' },
  captain: { form: '대형이 자리를 잡자 대장과 부하들이 한꺼번에 쏘았다.', broke: '대형이 깨지자 대장이 부하를 다시 세우느라 빈틈을 보였다.' },
  merchant: { deal: '거래를 받자 상인은 공격을 멈추고 회수만 했다. 전투 뒤 대가를 치렀다.', bill: '거래를 거절하자 청구서가 날아왔다.', paid: '골드를 내자 청구서의 숫자가 줄었다.' },
  bardo: { lamp: '켜진 등불이 많을수록 바르도가 세졌다.', relit: '등불을 깨자 바르도는 그것부터 다시 켰다.', shade: '빛 속에서 그림자 하수인이 나왔다.', last: '마지막 등불은 끝내 깨지지 않았다.' },
});
/* 2챕터 값(확정본 경제 칸 · 가설). 뜻: LAMP 등불 기름(장치) · MARKET 암시장 · AFFIX2 정예 접사 · DEBT_ALTAR 빚의 제단 · CH2X 방 특성 · 패배자 · 대형. 강적 · 보스 값(FOE_X)의 뜻은 비공개 문서 */
const LAMP = { max: 3, start: 1, drop: { normal: 0.10, ambush: 0.25 }, shop: { n: 2, price: 25 }, settle: 10, dark: [[3, 0.10], [7, 0.20], [11, 0.35], [15, 0.25]], pathDark: { rough: 0.10, quiet: -0.10 } };
const MARKET = { from: 4, to: 11, uq: { gold: 120, hpPen: 0.05 }, hero: { gold: 200 }, bundle: { gold: 40, r: 0.5, m: 0.35, stolen: 0.15, fights: 2 }, hidden: { pt: 1 } };
const AFFIX2 = { w: { tough: 1, cmd: 1.2, loot: 0.8, oiled: 0.8 }, cmd: 0.15, lootGold: 1, lootBack: 1.5, oiledBurn: 2, oiledBrk: 1.5 };
const DEBT_ALTAR = { gold: 60, markup: 0.3 };
const CH2X = { loser: 0.35, crowd: 3, oilIgn: 1, rainIgn: 2, rainChill: 1, formation: 0.2 };
Object.assign(FOE_X, {
  ledger: { max: 6, pay: 30, mark: 2, doom: 1.0, vuln: 2, atk: 0.75 }, // G-1 시계 2판(비공개 문서 참조)
  champion: { combo: 0.4, hits: 3, max: 3, coward: 2, big: 0.10, doom: 0.9, boo: 0.5 }, // G-1 시계 2판(비공개 문서 참조)
  lampthief: { max: 2, reveal: 2, vuln: 2, stab: 0.25, atk: 0.9 }, // G-1 시계 2판(비공개 문서 참조)
  captain: { max: 3, doom: [0.4, 0.3, 0.25], vuln: 2, atk: 0.9 }, // G-1 시계 2판(비공개 문서 참조)
  merchant: { buff: 0.2, hpPen: 0.05, appraise: 1, max: 3, gold: 0.5, doom: 0.9, vuln: 2, pay: 30, atk: 0.7 }, // G-1 시계 2판(비공개 문서 참조)
  bardo: { lamps: 5, per: 0.15, ward: 0.02, lampBrk: 40, shade: 1, ph: [0.6, 0.3] },
});
/* 1 · 3챕터가 함께 쓰는 옛 2챕터 역할 수치(해골 · 굴 · 저주 상태 묶음). 옛 지하묘지 설계는 docs/챕터/archive/2챕터-지하묘지.md */
/* 보스 단계 최소 체류(10월 14일, 만든 사람 결정): mid = 1 · 2단계에서 전환이 아닌 행동을 이만큼 한 뒤에 전환을 예고한다, last = 마지막 단계에서 이만큼 행동하기 전에는 쓰러지지 않는다.
   문턱에서 멈추기(넘친 피해는 버림)는 그대로. 측정 근거는 비공개 검증 문서 */
const BOSS_DWELL = { abbot: { mid: 1, last: 1 }, cryptlord: { mid: 2, last: 1 }, bardo: { mid: 3, last: 3 }, queen: { mid: 3, last: 1 } }; // A2 바르도: 확정본 단계마다 최소 행동 3(비공개 문서 참조) // 10월 15일: 쌓인 피해가 들어가도 단계를 건너뛰지 않게 1 · 2단계도 체류(군주 2번은 측정으로 정함: 1번이면 2단계 대표 행동 노출 67%) // 10월 15일: 여왕 마지막 단계 3 → 1(생명력 1로 여러 번 버티는 억울함을 줄인다)
const BOSS_BANK = 1; // 막힌 피해 가운데 쌓아 두는 몫(10월 15일)
const BOSS_TR = ['throne', 'collapse', 'qrise', 'qmelt', 'rest']; // 체류 횟수에 넣지 않는 행동: 단계를 넘기는 행동과 숨 고르기(수도원장 3단계 첫 행동)
const RISE = { pile: 0.15, wait: 2, hp: 0.5 };   // 해골: 쓰러지면 뼈 더미(최대의 15%), 2라운드 뒤 50%로 한 번만 일어선다
const HEX = { base: 0.04, per: 0.04, cap: 0.24, kinds: ['poison', 'bleed', 'ignite', 'weak', 'vuln'] }; // 무덤 주술사 조이기 = 기준 × (base + per × 내 해로운 상태 가짓수)
const BURROW = { up: 1.6, aoe: 1.3, vuln: 2, chill: 1 }; // 굴 파는 시체: 솟구침 = 평소 × up, 땅속에서 광역 ×aoe, 드러나면 취약
const SWIFT = { share: 0.5, hp: 1.15, from: 6 }; // 신속 접사(2챕터부터): 라운드가 시작될 때 둔화가 없으면 가속 1
const ROLE_INTRO = {
  drill: ['수련장이 회초리로 바닥을 친다. 남은 수사들이 일제히 고개를 든다.', '호령을 받은 동료는 다음 공격이 강해집니다. 회초리 세례를 모으는 동안 무너뜨리면 끊깁니다.'],
  skeleton: ['뼈마디가 덜그럭거린다.', '쓰러진 해골은 뼈 더미가 됩니다. 더미 위 숫자는 다시 일어서기까지 남은 라운드입니다. 화상이 걸렸거나 무너진 채 쓰러진 해골은 일어서지 않습니다.'],
  swift: ['이 적은 발이 땅에 닿지 않는다.', '라운드가 시작될 때마다 가속 1을 얻습니다. 둔화가 걸리면 그만큼 사라집니다.'],
};
Object.assign(ROLE_INTRO, {
  pitboss: ['관리인이 종을 들어 올린다. 아무도 없는 관중석이 숨을 죽인다.', '종이 울리면 무리가 빨라집니다. 결승 종을 예고하는 동안 무너뜨리면 끊깁니다.'],
  loser: ['패배자가 부러진 칼을 고쳐 쥔다. 손이 떨린다.', '내가 무너졌거나 약화 · 둔화에 걸렸을 때 사나워집니다.'],
  chained: ['사슬 끝의 사람이 고개를 들지 않는다.', '감독관이 쓰러지면 사슬이 풀려 떠납니다(경험치 · 전리품 없음).'],
});
/* 방 특성 (9절): 새 셋은 2챕터만, 수도원 주제(성수 · 종소리)는 1챕터만 */
ROOM_MODS.holy.chs = [1]; ROOM_MODS.bell.chs = [1];
/* 성소 · 제단 (10절): chs가 없으면 모든 챕터 */
ALTARS.find(a => a.id === 'gold').cost = [40, 60, 90];


ROOM_MODS.narrow.chs = [1, 2]; ROOM_MODS.ceiling.chs = [1, 2]; ROOM_MODS.candle.chs = [1, 2]; ROOM_MODS.dark.chs = [1, 2];
/* 위 한 줄(좁은 통로 · 낮은 천장 · 촛불 · 어둠을 1 · 2챕터에)은 A2 기준과 같은 결과를 지키려고 남겼다(A2에서 2챕터 특성 칸이 이 줄로 덮여 있었다 — A3 보고서 참조) */

/* ===== 3챕터 「성벽 아래」 (0.8.0 A3, 만든 사람 확정 10월 21일, docs/챕터/3챕터.md) =====
   틀은 1 · 2챕터와 같다(16층, 갈림길 4 · 9 · 12층). 강적 · 보스의 기믹과 대처는 비공개 문서. 숫자 · 타수는 가설(M7). 옛 3챕터(재의 사막)는 data/archive/old-ch3.js */
ENEMY_NAMES[3] = Object.fromEntries(Object.values(FOES).filter(f => f.ch === 3 && ['mob', 'elite'].includes(f.grade)).map(f => [f.id, f.n]));
CHAPTERS[3] = {
  n: '성벽 아래', boss: 'lu', names: ENEMY_NAMES[3], strongFrom: 4, xp: 1.9, gold: 2.1, settleStrong: 45,
  diff: { upper: { hp: 0.625, dmg: 0.66 }, lower: { hp: 0.93, dmg: 0.68 } }, // 피해 배율은 옛 3챕터 값 그대로(체력은 타수가 정한다)
  roomW: { normal: 27, ambush: 19, trial: 5, shrine: 5 }, roomMax: { ambush: 6 }, // 옛 3챕터 문 무게 그대로(0.8.0 6단계 A-5)
  enterLore: '거리의 끝에서 하늘이 막힌다. 성벽이다. 성문은 닫혀 있고, 문 앞에 천막이 끝없이 늘어서 있다.',
  settleLore: '성문이 열린다. 안쪽에서 아주 오래된 바람이 분다.',
  nextLore: '성벽 너머, 그가 끝내 막으려던 곳으로.',
  deathLine: '당신도 성벽 아래의 이름 하나가 된다.',
  bands: [
    { to: 3, n: '피난민 천막촌', line: '천막마다 등불 대신 이름표가 걸려 있다.' },
    { to: 7, n: '버려진 공성 진지', line: '부수다 만 공성추가 성벽을 향해 서 있다.' },
    { to: 8, n: '무너진 초소', line: '초소 벽에 수비대 교대 일지가 붙어 있다. 마지막 칸이 비어 있다.' },
    { to: 11, n: '해자와 배수로', line: '물 위에 재가 떠 있다. 아래에서 무언가 긁는 소리가 난다.' },
    { to: 15, n: '성벽 위 순찰로', line: '바람이 세다. 아래로 천막촌이 내려다보인다.' },
    { to: 16, n: '성문', line: '문은 닫혀 있다. 누군가 그 앞을 한 번도 떠나지 않았다.' },
  ],
  paths: { rough: { n: '망루 길', d: '망루를 잇는 길. 수비대가 지키고, 공성 진지의 전리품이 남았다.' }, main: { n: '성문 대로', d: '피난민이 밟고 지나간 큰길.' }, quiet: { n: '배수로', d: '성벽 밑을 흐르는 배수로. 적은 적지만 물이 검다.' } },
};
/* 3챕터 무리 여덟(확정본 구성). from · to: 나오는 층, pw: 길마다 가중, bw: 층 띠 가중([층까지, 배율]) */
SQUADS.push(
  { id: 'gatew', ch: 3, n: '성문 수비대', w: 1.3, from: 1, up: [['wallguard'], ['wallguard'], ['pike']], low: [['wallguard', 1], ['wallguard'], ['pike']] },
  { id: 'archers3', ch: 3, n: '성벽 사수대', w: 1.0, from: 4, pw: { rough: 1.5 }, bw: [[11, 1], [15, 1.6]], up: [['wallguard'], ['wallxbow'], ['wallxbow']], low: [['wallguard'], ['wallxbow', 1], ['wallxbow']] },
  { id: 'beacons', ch: 3, n: '봉화대', w: 1.0, from: 4, pw: { rough: 1.4 }, up: [['pike'], ['beacon'], ['bellman']], low: [['pike', 1], ['beacon'], ['bellman']] },
  { id: 'riot', ch: 3, n: '천막촌 폭동', w: 1.2, from: 1, bw: [[3, 1.8], [7, 1], [15, 0.6]], up: [['rioter'], ['rioter'], ['rioter'], ['rioter']], low: [['rioter'], ['rioter'], ['rioter'], ['smuggler', 1]] },
  { id: 'sappers', ch: 3, n: '공병대', w: 1.1, from: 4, bw: [[7, 1.6], [15, 1]], up: [['wallguard'], ['pike'], ['sapper']], low: [['wallguard'], ['pike', 1], ['sapper']] },
  { id: 'hospital', ch: 3, n: '야전 병원', w: 1.0, from: 2, up: [['wallguard'], ['wallguard'], ['medic']], low: [['wallguard', 1], ['wallguard'], ['medic']] },
  { id: 'smugglers', ch: 3, n: '밀수 행렬', w: 1.0, from: 1, bw: [[3, 1.6], [15, 1]], up: [['smuggler'], ['smuggler']], low: [['smuggler', 1], ['smuggler'], ['tainted']] },
  { id: 'tenmen', ch: 3, n: '십인대', w: 1.6, from: 12, up: null, low: [['tenman', 1], ['wallguard'], ['wallguard'], ['wallxbow']] },
);
ENC.treasure3 = [[['wallguard', 1], ['pike']], [['pike', 1], ['wallxbow']], [['smuggler', 1], ['rioter'], ['rioter']]];
/* 방 특성 넷(확정본). 재액의 틈은 야영지(8층) 뒤부터, 배수로에서 잦다 */
ROOM_MODS.rift = { n: '재액의 틈', chs: [3], d: '라운드가 끝날 때마다 적 하나가 잠식 1을 얻습니다(주는 피해 +10%, 5까지). 행동 하나로 틈을 막으면 멈춥니다. 잠식된 적을 쓰러뜨리면 잠식이 곁의 적에게 옮습니다.' };
ROOM_MODS.wall = { n: '성벽 위', chs: [3], d: '후열 적이 엄폐해 받는 직접 피해가 20% 줄어듭니다. 전열에는 적이 2기까지만 섭니다.' }; // M8: "밀쳐내기가 붕괴를 20 더 채웁니다"는 뺐다 — CH3X.wallBrk를 읽는 코드가 없다(규칙이 없는 문장)
ROOM_MODS.mob3 = { n: '군중', chs: [3], d: '라운드가 시작될 때마다 25% 확률로 피난민 폭도 하나가 전열에 끼어듭니다(2까지). 끼어든 폭도는 경험치와 전리품이 없습니다.' };
ROOM_MODS.rockfall = { n: '낙석', chs: [3], d: '4라운드마다 모두가 피해 4를 입습니다. 무너진 적이 있으면 그 라운드 낙석은 적에게만 떨어집니다.' };
const MOD3W = { chance: { upper: 0.35, lower: 0.5 }, w: { rift: 1.2, wall: 1, mob3: 1, rockfall: 0.8 }, riftFrom: 9, mobTo: 11, wallFrom: 9, pathRift: { quiet: 2.5, rough: 0.6 }, pathWall: { rough: 1.6 } }; // 특성 확률 · 무게(띠 · 길)
ALTARS.push({ id: 'oath', chs: [3], n: '수비대의 맹세', d: '맹세합니다: 최대 생명력 +10(이 캐릭터가 끝날 때까지). 대신 이 챕터 동안 배수로를 고를 수 없습니다.' });
/* 새 방 둘: 검문소(성문 대로 4층부터, 챕터에 둘) · 밀수꾼의 좌판(배수로 4–11층, 챕터에 하나. 검문소 대신) */
Object.assign(ROOM_TYPES, {
  checkpoint: { n: '검문소', ico: '🚧', w: 6, max: 2, from: 4, fight: 0, risk: 0, gold: [0, 0], hint: '통행세 · 거절 · 몰래 지나가기' },
  smugstall: { n: '밀수꾼의 좌판', ico: '🕳️', w: 6, max: 1, from: 4, fight: 0, risk: 0, gold: [0, 0], hint: '안쪽 물건을 골드나 대가로' },
});
/* 이벤트 아홉(확정본 3챕터). frag = 이야기 조각, wake = 그 확률로 바로 싸우는 적 */
EVENTS.push(
  { id: 'heightpost', ch: 3, n: '키 재기 기둥', lore: '성벽 안쪽 기둥에 아이들 키가 칼자국으로 새겨져 있다. 맨 위 칸에 날짜가 없다.', opts: [{ id: 'touch', n: '손으로 쓸어 본다', d: '이야기 조각 하나와 생명력 15%. 30%로 맨 위 칸의 칼자국에 손이 베여 출혈 3을 안고 다음 전투에 들어갑니다.', frag: '뒤죽박죽 그어진 자국들. 제멋대로인 키들. 몇 번이고 다시 그은 흔적 위로, 피가 덮인 지 오래였다.' }, { id: 'pass', n: '그냥 지나친다', d: '' }] },
  { id: 'lastpack', ch: 3, n: '피난민의 마지막 짐', lore: '주인이 돌아오지 않은 보따리.', opts: [{ id: 'search', n: '뒤진다', d: '소모품 하나. 대신 다음 군중 방에서 폭도가 당신을 먼저 노립니다.' }, { id: 'tie', n: '묶어 둔다', d: '아무 일도 없습니다.' }] },
  { id: 'petitions', ch: 3, n: '탄원서 더미', lore: '"들여보내 주십시오"가 수백 장. 맨 아래 한 장은 수비대 쪽에서 쓴 것이다.', opts: [{ id: 'read', n: '맨 아래 장을 읽는다', d: '이야기 조각 하나. 다음 3개 방 동안 받는 피해 −10%. 대신 마음이 급해져 다음 2개 방은 경보가 1라운드 빨리 울립니다.', frag: '…모두를 지킬 수는 없다. 이 모든 청을 들어준다면 무엇을 불러올지, 너무나도 명확하기에. — 성벽지기 루' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'shiftlog', ch: 3, n: '수비대 교대 일지', lore: '같은 이름이 매일 밤 적혀 있다. 교대한 사람이 없다.', opts: [{ id: 'read', n: '끝까지 읽는다', d: '이야기 조각 하나와 패시브 포인트 1. 대신 밤새 읽어 다음 전투를 약화 2로 시작합니다.', frag: '밤 경계: 루. 다음 밤: 루. 그다음 밤도, 루. 교대 칸은 언제부턴가 비워 두지도 않았다.' }, { id: 'close', n: '덮는다', d: '' }] },
  { id: 'smugladder', ch: 3, n: '밀수꾼의 사다리', lore: '성벽에 걸친 줄사다리. 위가 보이지 않는다.', opts: [{ id: 'climb', n: '오른다', d: '50%로 다음 층을 건너뜁니다(그 층 보상 없음). 50%로 위에서 매복(바로 싸움, 성벽 석궁병 둘 · 장창병, 성벽 위).', wake: { p: 0.5, en: [['wallxbow'], ['wallxbow'], ['pike']], mods: ['wall'], first: 1, msg: '사다리 끝에서 석궁이 내려다본다. 매복이다' } }, { id: 'cut', n: '끊는다', d: '다음 밀수꾼 무리가 나오지 않습니다.' }] },
  { id: 'taintwell', ch: 3, n: '재액이 스민 우물', lore: '물이 위로 흐른다.', opts: [{ id: 'drink', n: '마신다', d: '최대 스태미나 +10(이 캐릭터가 끝날 때까지). 대신 이 챕터의 재액의 틈 방에서 잠식 1을 안고 시작합니다.' }, { id: 'cover', n: '뚜껑을 덮는다', d: '행동 하나를 쓴 셈이라 다음 전투 첫 라운드에 빠른 행동이 없습니다. 이 챕터의 재액의 틈 방이 하나 줄어듭니다.' }] },
  { id: 'fallentower', ch: 3, n: '무너진 망루', lore: '꼭대기 종이 아직 매달려 있다.', opts: [{ id: 'ring', n: '종을 친다', d: '다음 층 문에 강적이 반드시 나옵니다. 골드 25.' }, { id: 'take', n: '종을 떼어 낸다', d: '스태미나 40을 씁니다. 다음 2개 방은 경보가 울리지 않습니다.' }] },
  { id: 'gatevoice', ch: 3, n: '성문 틈의 목소리', lore: '닫힌 성문 너머에서 누가 이름을 부른다. 당신의 이름이다.', opts: [{ id: 'answer', n: '대답한다', d: '이야기 조각 하나. 보스방에 들어설 때 생명력 +10%p. 대신 지금 생명력 15%를 잃습니다.', frag: '"가지 마. 여기 있으면, 아무것도 잃지 않아." 다정한 목소리였다. 문 너머의 모든 것을 놓지 못하는 손처럼.' }, { id: 'silent', n: '대답하지 않는다', d: '목소리가 그친다. 아무 일도 없습니다.' }] },
  { id: 'oldram', ch: 3, n: '버려진 공성추', lore: '밧줄 하나만 끊으면 굴러갈 것 같다.', opts: [{ id: 'cut', n: '밧줄을 끊는다', d: '다음 전투가 시작될 때 전열 적 모두 붕괴 +40 · 피해 6. 30%로 공성추가 옆으로 굴러 나도 피해 10.' }, { id: 'pass', n: '지나친다', d: '' }] },
);
/* 검문소(싸우지 않는 방, js/16 w3Checkpoint): 이벤트 화면을 빌려 쓴다(roll: 0이라 이벤트 방에는 나오지 않는다) */
EVENTS.push({ id: 'checkpoint3', ch: 3, roll: 0, n: '검문소', lore: '무너진 차단봉. 수비병 하나가 아직 서 있다.', opts: [{ id: 'toll', n: '통행세를 낸다', d: '골드 40. 다음 층 문 셋 가운데 하나를 미리 봅니다.' }, { id: 'refuse', n: '거절한다', d: '싸웁니다(수비병 셋). 이 싸움에는 경보가 없습니다.', wake: { p: 1, en: [['wallguard'], ['wallguard'], ['wallguard']], noAlarm: 1, msg: '수비병이 차단봉을 내린다. 뒤에서 둘이 더 나온다' } }, { id: 'sneak', n: '몰래 지나간다', d: '50%로 그냥 지나갑니다. 50%로 들켜 다음 전투의 경보가 처음부터 울립니다.' }] });
/* 3챕터 강적 다섯 · 보스 성벽지기 루. 무엇을 하는지와 대처는 비공개 문서에만 적는다 */
STRONG_FOES.push(
  { id: 'beaconlord', ch: 3, n: '봉화대장', en: [['pike', 1], ['beacon']] },
  { id: 'siege', ch: 3, n: '공성 기술자', en: [['sapper', 1], ['wallguard']] },
  { id: 'speaker', ch: 3, n: '탄원자들의 대변인', en: [['bellman', 1], ['rioter'], ['rioter']] },
  { id: 'marksman', ch: 3, n: '성벽 위의 명사수', en: [['wallxbow', 1], ['wallguard'], ['pike']], from: 6 },
  { id: 'wallcap', ch: 3, n: '성벽에 녹아든 수비대장', en: [['wallguard', 1], ['tainted']], from: 9 },
);
Object.assign(FOE_INTRO, Object.fromEntries(Object.values(FOES).filter(f => f.ch === 3 && ['strong', 'boss'].includes(f.grade)).map(f => [f.id, { n: f.n, lore: f.log.lore, see: [f.log.see] }])));
/* 도감: 겪은 결과만(대처는 플레이어 메모) */
Object.assign(CODEX, {
  beaconlord: { oil: '봉화에 기름이 부어질 때마다 남은 칸이 줄었다.', boom: '칸이 다 찬 봉화가 터졌다. 종이 울렸다.', chain: '봉화가 터질 때마다 다음 폭발이 더 컸다.', out: '부순 봉화는 다시 켜지지 않았다.', flare: '터지기 직전의 봉화를 막아 내자 남은 불길이 잦아들고 봉화대장이 불길에 휩싸였다.' },
  siege: { ram: '공성추가 다 맞춰지자 날아왔다.', part: '부품을 부수자 공성추가 한 뼘 물러났다.', deflect: '날아드는 공성추를 흘려 내자 기술자가 공구를 놓쳤다.' },
  speaker: { crowd: '군중이 앞에 있는 동안 대변인에게 칼이 잘 닿지 않았다.', scatter: '대변인이 무너지자 군중이 잠깐 흩어졌다.', gate: '군중이 다 모이자 성문을 밀고 들어왔다.' },
  marksman: { cover: '엄폐한 사수에게 칼끝이 반쯤 막혔다.', drop: '조준하던 사수가 흔들리자 엄폐를 잃고 성벽 아래로 떨어졌다.', shot: '조준이 다 쌓이자 한 발이 날아왔다.', deflect: '한 발을 흘려 내자 사수가 엄폐를 잃었다.' },
  wallcap: { bricks: '벽돌이 서 있는 동안 본체에 칼이 잘 닿지 않았다.', rebuilt: '무너진 벽돌이 다시 섰다.', buried: '잠식이 다 차자 성벽에 묻혔다.', shaken: '차오르던 잠식을 한꺼번에 걷어 내자 성벽이 흔들렸다.' },
  lu: { patrol: '성벽 위에서 순찰대가 내려왔다.', rebuild: '그는 무너진 벽돌을 다시 쌓았다. 그동안 몸이 비었다.', endure: '그는 반격하지 않았다. 벽에 등을 대고 버텼다.' },
});
/* 3챕터 값(확정본 경제 칸 · 가설). 뜻: ALARM 장치 「경보」 · CHECK3 검문소 · SMUG3 밀수꾼의 좌판 · AFFIX3 정예 접사 · CH3X 방 특성 · 잠식 · OATH 맹세 · ARMOR3 갑옷(층 띠 기본 공격의 몫). 강적 · 보스 값(FOE_X)의 뜻은 비공개 문서 */
const ALARM = { first: 4, rough: 3, every: 3, cap: 3, stageAt: 2, strongW: 1.4, flare: 3, flareNext: 1 };
const CHECK3 = { toll: 40, sneak: 0.5 };
const SMUG3 = { from: 4, to: 11, hero: { gold: 220, hpPen: 0.05 }, uq: { gold: 150, n: 2 }, inner: { gold: 80, dmg: 0.15 }, info: { gold: 30 } };
const AFFIX3 = { w: { tough: 1, form: 1.2, taint: 1, bell: 0.8 }, taintFrom: 9, form: 0.2 };
const CH3X = { taint: 0.1, taintCap: 5, wallCover: 0.2, wallBrk: 20, mobP: 0.25, mobCap: 2, rock: 4, rockEvery: 4 };
const OATH = { hp: 10 };
const ARMOR3 = { light: 0.2, heavy: 0.35, basic: 0.75 }; // 갑옷 = 그 층 띠 행동 하나의 피해(FOE_HIT_REF) × basic(기본 공격 몫) × light · heavy
Object.assign(FOE_X, {
  beaconlord: { fires: 3, fuse: 2, boom: 0.5, chain: 1.5, brk: 45, brkHot: 30, rew: 2, rewIg: 3 }, // G-1 2판 강적 시계(비공개 문서 참조). 숫자는 가설
  siege: { max: 3, launch: 0.95, parts: 2, partBrk: 30, rew: 2 }, // 비공개 문서 참조
  speaker: { max: 4, cut: 0.6, need: 2, call: 2, cap: 4, incite: 0.15, push: 0.18, atk: 0.75, grow: 1, rew: 2 }, // 비공개 문서 참조
  marksman: { max: 2, melee: 0.5, drop: 2, shot: 0.85, brkAim: 1.5, dropHit: 1.3 }, // 비공개 문서 참조
  wallcap: { max: 5, bricks: 3, cut: 0.5, back: 3, brk: 24, fall: 0.7, clean: 2, brickBack: 2, bare: 2, rew: 2, atk: 0.6 }, // G-1 2판(비공개 문서 참조)
  lu: { ph: [0.6, 0.3], patrol: 2, bricks: 3 },
});
BOSS_DWELL.lu = { mid: 3, last: 3 }; // 확정본: 단계마다 최소 행동 3, 3단계는 최소 3행동 고정(비공개 문서 참조)
Object.assign(ROLE_INTRO, {
  rift: ['성벽 틈에서 검은 것이 배어 나온다.', '라운드가 끝날 때마다 적 하나가 잠식됩니다. 행동 하나로 틈을 막을 수 있습니다.'],
  tainted: ['그것에게는 그림자가 없다. 대신 성벽에 그림자가 하나 더 생긴다.', '잠식된 자는 잠식을 옮깁니다. 잠식이 쌓이면 받는 피해가 커집니다.'],
  bellman: ['경보수가 줄을 쥔다. 손이 떨리지 않는다.', '종 치기 예고를 끊거나 먼저 잡으면 경보가 당겨지지 않습니다.'],
});

/* A1 1챕터 이식(만든 사람 확인 10월 21일): 수선공(옛 뼈 부르는 사제) — 수선 n · 띄우기 약화 loft · 정예 마지막 수선은 생명력 ult 아래에서 한 번, 다시 일어날 때 최대 생명력 × rise.
   수련장(우두머리) — 호령 강화 order · 꾸짖음 피해 × scold · 약화 scoldWeak · 회초리 세례는 행동 ultAt번 뒤 한 번. 숫자는 가설(M7) */
const MENDER = { loft: 1, ult: 0.5, rise: 0.4 };
const DRILL = { order: 1, scold: 0.5, scoldWeak: 1, ultAt: 3 };
