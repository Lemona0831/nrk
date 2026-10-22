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
const STRONG = { big: 0.46, hp: 3.7, dmg: 2.7, bellEvery: 3, leech: 0.45, frenzy: 1.3, lowerHp: 1.3, lowerDmg: 1.15 }; // 하층 강적만 더: 무작위 시험 하층 순례자 40%대(만든 사람 요청) // 무작위 시험: 상층 승률 94%(남은 생명력 60%), 하층 76~82%(약 50%). 일반 방은 95~98%(65~83%)
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
/* 새 강적 셋의 수치 (10월 4일 만든 사람 결정). 무엇을 하는지와 대처는 비공개 문서에만 적는다.
   bishop: 한 번에 일으키는 수 raise, 최대 cap, 큰 한 방 = 기준 생명력 × (base + per × 남은 시체)
   cantor: 한 겹마다 곁의 적 피해 +hymn, 최대 cap, 큰 한 방 = 기준 생명력 × per × 곁의 적 수
   scribe: 봉인 최대 cap, 큰 한 방은 강적 기본(STRONG.big) */
/* A1 굶주린 순례자 배 채움 값(확정본 [이식 제안], 규칙은 비공개 문서 참조). 숫자는 가설 */
const PILGRIM = { fill: 0.15, feast: 1.0 };
/* A1 1챕터 강적: 큰 한 방 배율(M3 무시 시험에서 예고를 몰라도 96–100% 이겨서, 막지 못한 큰 한 방이 아프게). 숫자는 가설 */
const STRONG1 = { big: 2.2 };
const FOE_X = {
  bishop: { raise: 2, cap: 4, base: 0.30, per: 0.04 },
  cantor: { hymn: 0.25, cap: 3, per: 0.2 },
  scribe: { cap: 3 },
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
  ledger: { debt: '장부에 빚이 쌓일수록 집행이 무거워졌다.', paid: '골드를 내자 빚이 절반으로 줄었다.', torn: '무너뜨리자 장부가 찢어져 빚이 사라졌다.' },
  champion: { duel: '결투를 선언하자 다른 적이 물러섰다.', cheer: '라운드가 지날수록 함성이 커지고 챔피언의 공격이 세졌다.', boo: '챔피언이 무너지자 함성이 야유로 바뀌었다.' },
  lampthief: { dark: '도둑이 등불을 끄자 방이 어두워졌다.', hide: '어둠 속에서 도둑이 숨어 칼이 닿지 않았다.', lit: '등불 기름으로 방을 밝히자 숨은 도둑이 드러났다.' },
  captain: { form: '대형이 서 있는 동안 대장이 받는 피해가 줄었다.', broke: '덩치가 무너지자 대형이 깨졌다.' },
  merchant: { deal: '거래를 받자 상인은 공격을 멈추고 회수만 했다. 전투 뒤 대가를 치렀다.', bill: '거래를 거절하자 청구서가 날아왔다.' },
  bardo: { lamp: '켜진 등불이 많을수록 바르도가 세졌다.', relit: '등불을 깨자 바르도는 그것부터 다시 켰다.', shade: '빛 속에서 그림자 하수인이 나왔다.', last: '마지막 등불은 끝내 깨지지 않았다.' },
});
/* 2챕터 값(확정본 경제 칸 · 가설). 뜻: LAMP 등불 기름(장치) · MARKET 암시장 · AFFIX2 정예 접사 · DEBT_ALTAR 빚의 제단 · CH2X 방 특성 · 패배자 · 대형. 강적 · 보스 값(FOE_X)의 뜻은 비공개 문서 */
const LAMP = { max: 3, start: 1, drop: { normal: 0.10, ambush: 0.25 }, shop: { n: 2, price: 25 }, settle: 10, dark: [[3, 0.10], [7, 0.20], [11, 0.35], [15, 0.25]], pathDark: { rough: 0.10, quiet: -0.10 } };
const MARKET = { from: 4, to: 11, uq: { gold: 120, hpPen: 0.05 }, hero: { gold: 200 }, bundle: { gold: 40, r: 0.5, m: 0.35, stolen: 0.15, fights: 2 }, hidden: { pt: 1 } };
const AFFIX2 = { w: { tough: 1, cmd: 1.2, loot: 0.8, oiled: 0.8 }, cmd: 0.15, lootGold: 1, lootBack: 1.5, oiledBurn: 2, oiledBrk: 1.5 };
const DEBT_ALTAR = { gold: 60, markup: 0.3 };
const CH2X = { loser: 0.35, crowd: 3, oilIgn: 1, rainIgn: 2, rainChill: 1, formation: 0.2 };
Object.assign(FOE_X, {
  ledger: { perHurt: 0.25, perYs: 3, pay: 30, payCut: 0.5, base: 0.30, per: 0.02, seize: 20 },
  champion: { cheer: 0.10, combo: 0.4, hits: 3, base: 0.35, per: 0.05 },
  lampthief: { reveal: 2, vuln: 2 },
  captain: { form: 0.5 },
  merchant: { buff: 0.2, hpPen: 0.05, appraise: 1 },
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
SHRINES.push({ id: 'rest', chs: [3], n: '안식의 성소', d: '쓰러뜨린 적은 다시 일어서지 않습니다.' }, { id: 'firm', chs: [3], n: '굳건함의 성소', d: '예고된 큰 공격으로 받는 피해 −15%.' });
ALTARS.find(a => a.id === 'gold').cost = [40, 60, 90];


/* ===== 3챕터: 재의 사막 유적 (10월 7일, docs/챕터/3챕터.md. 강적 · 보스의 기믹과 대처는 비공개 문서) =====
   틀은 1 · 2챕터와 같다(16층, 갈림길 4 · 9 · 12층). 이 칸은 1챕터 배열에 ch: 3 항목을 더하고 CHAPTERS[3]을 채운다. 수치는 모두 [가설] */
ENEMY_NAMES[3] = { bruiser: '사막 약탈자', shield: '유적 근위병', archer: '모래 궁수', healer: '재의 무녀', summoner: '모래 부르는 자', pyre: '태양 영창자', minion: '재 인형', thief: '무덤 도굴꾼', darkmage: '검은 해의 주술사', skeleton: '불탄 해골', lurker: '모래 잠복자', ember: '불씨 투척병', wrapped: '붕대 감긴 망자', mirage: '아지랑이 술사', crown: '재의 왕관', maid: '재의 시녀' };
/* 해의 흐름 (1.2절): 띠마다 층 이름과 들어설 때 한 줄. 특성 무게는 MOD3 */
const BANDS3 = [
  { to: 4, n: '불탄 성벽', line: '검은 해가 지평선에 걸려 있다. 모래가 아직 차다.' },
  { to: 7, n: '무너진 시장', line: '그림자가 발밑으로 숨는다. 공기가 일렁인다.' },
  { to: 8, n: '오아시스 야영지', line: '물 위에 재가 떠 있다. 그래도 물이다.' },
  { to: 12, n: '왕의 묘실', line: '같은 얼굴이 두 번 보인다.' },
  { to: 15, n: '유리 사원', line: '모래가 별을 가린다. 어둠 속에서 모래가 숨을 쉰다.' },
  { to: 16, n: '재의 왕좌', line: '재가 눈처럼 내린다. 왕좌가 따뜻하다.' },
];
CHAPTERS[3] = {
  n: '재의 사막 유적', boss: 'queen', names: ENEMY_NAMES[3], strongFrom: 2, xp: 1.9, gold: 2.1, settleStrong: 45, bands: BANDS3,
  diff: { upper: { hp: 0.625, dmg: 0.66 }, lower: { hp: 0.93, dmg: 0.68 } }, // 3.1절 [가설]: 1챕터와 같은 체감에서 출발. 10월 15일(만든 사람 결정): 생명력 상층 ×1.25(0.50 → 0.625) · 하층 ×1.5(0.62 → 0.93). 측정은 비공개 검증 문서
  modChance: { upper: 0.35, lower: 0.55 }, roomW: { normal: 27, ambush: 19, trial: 5, shrine: 5 }, /* 0.8.0 6단계 A-5: 일반 40 → 27(1 · 2챕터 44 → 30과 같은 비율) */ roomMax: { ambush: 6 }, // 흔들리는 문은 넣지 않았다(만든 사람이 정할 것 1). 그 무게는 매복 · 시련에 나눴다
  enterLore: '지하묘지의 바닥이 무너진다. 아래에는 하늘이 있었다. 검은 해 아래로 모래가 끝없이 이어진다.',
  settleLore: '왕관이 식은 재 속으로 떨어진다. 왕좌 밑에서 금이 간 문이 숨을 쉰다. 금 너머로 성벽이 보인다.',
  nextLore: '재가 서리처럼 내려앉는다. 금 간 문 너머에서 찬 바람이 분다.',
  deathLine: '당신의 이름이 재가 되어 바람에 섞인다.',
};
/* 새 역할 · 게이지의 수치 (6절, 2절). 잠복은 2챕터 BURROW를 그대로 쓴다(출혈 LURK.bleed만 다르다) */
const LURK = { bleed: 2, rest: 1 };                  // 모래 잠복자: 솟구침 출혈, 드러난 뒤 쉬는 행동
const EMBER = { pot: 0.875, potIgn: 3, share: 2 };   // 불씨 투척병: 불단지 = 평소 × pot + 화상, 불씨 나누기 = 동료의 다음 공격에 화상
const WRAP = { cut: 0.3, hits: 3, rewrap: 1 };       // 붕대: 받는 직접 피해 −30%, 세 번 맞으면 풀림, 다시 감기 한 번
const HAZE = { cap: 2, capStrong: 3, give: 2, self: 1 }; // 허상
const HEAT = { start: 20, mod: 10, ember: 8, burst: 0.10, burstIgn: 2, foeIgn: 2, reset: 30, warn: 80 }; // 작열하는 한낮의 열기
const IGN_ROUND_CAP = 4;     // 나에게 한 라운드에 새로 붙는 화상 (2절 5번)
const UNAVOID_CAP = 0.30;    // 피할 수 없는 피해의 상한 = 기준 생명력 × (2절 8번, 광폭만 예외)
const FIRE_AFFIX = { hit: 1, heavy: 2, from: 10 };   // 정예 접사 화염 강화
const AFFIX_W3 = { tough: 1, swift: 1, fire: 1 };
/* 방 특성 (10절): 3챕터 새 셋과 1챕터 특성의 3챕터 판. 어둠 · 고요는 3챕터에 두지 않는다 */
ROOM_MODS.narrow.chs = [1, 2]; ROOM_MODS.ceiling.chs = [1, 2]; ROOM_MODS.candle.chs = [1, 2]; ROOM_MODS.dark.chs = [1, 2];
ROOM_MODS.noon = { n: '작열하는 한낮', chs: [3], d: '열기 칸이 보입니다. 라운드가 끝날 때마다 열기가 10 오릅니다. 100이 되면 열풍이 불어 나와 적 모두를 태우고 30으로 내려갑니다.' };
ROOM_MODS.haze = { n: '아지랑이', chs: [3], d: '모든 적이 허상 1을 두르고 시작합니다.' };
ROOM_MODS.sandstorm = { n: '모래폭풍', chs: [3], d: '후열 적이 주는 피해와 받는 피해가 모두 20% 줄어듭니다.' };
ROOM_MODS.alley = { n: '무너진 골목', chs: [3], d: '전열에 적이 2기까지만 섭니다. 나머지는 후열입니다.' };
ROOM_MODS.pillar = { n: '무너지는 기둥', chs: [3], d: '4라운드마다 모두가 피해 4를 입습니다.' };
ROOM_MODS.shade = { n: '오아시스 그늘', chs: [3], d: '라운드가 끝날 때마다 모두 생명력 1%를 되찾습니다. 나와 적이 받는 화상 피해는 절반입니다.' };
ROOM_MODS.brazier = { n: '불씨 화로', chs: [3], d: '화상 피해가 모두 50% 늘어납니다.' };
ROOM_MODS.drums = { n: '북소리', chs: [3], d: '적 속도 +10%라 라운드에서 대개 나보다 먼저 움직입니다. 이 방의 골드 +50%.' };
/* 3챕터 특성 무게 (4.2 · 10.1절): from 첫 층, band 띠마다 배율([층까지, 배율]), path 길마다 배율. 시야 특성(아지랑이 · 모래폭풍)은 한 방에 하나 */
const MOD3 = {
  noon: { from: 6, band: [[7, 3], [12, 1.5]], path: { rough: 1.5, quiet: 0.5 } }, // 0.8.0 6단계: 16층 틀(옛 9 · 11 · 18층)
  haze: { from: 9, band: [[12, 3]] },
  sandstorm: { from: 12, band: [[15, 1.5]] },
  shade: { path: { quiet: 2 } },
  alley: {}, pillar: {}, brazier: {}, bloodpool: {}, drums: {},
};
const MOD3_SIGHT = ['haze', 'sandstorm'];
const MOD3_NEW = ['noon', 'haze', 'sandstorm'];
/* 3챕터 테마 무리 (8절). from: 나오는 첫 층, up이 null이면 하층에서만. 1챕터 무리 셋은 3챕터 이름으로 상층을 채운다 */
SQUADS.push(
  { id: 'wall3', ch: 3, n: '무너진 성벽 수비', w: 0.8, from: 1, up: [['shield'], ['shield'], ['minion']], low: [['shield', 1], ['shield'], ['archer']], vary: [2, ['minion', 'archer']] },
  { id: 'zeal3', ch: 3, n: '약탈자 돌격', w: 1.0, from: 1, up: [['bruiser'], ['bruiser']], low: [['bruiser', 1], ['bruiser']], vary: [1, ['bruiser', 'thief']] },
  { id: 'patrol3', ch: 3, n: '사막 순찰', w: 0.8, from: 1, up: [['bruiser'], ['archer'], ['healer']], low: [['bruiser'], ['archer'], ['healer', 1]], vary: [1, ['archer', 'darkmage', 'thief', 'pyre']] },
  { id: 'raid', ch: 3, n: '약탈단', w: 1.0, from: 1, up: [['bruiser'], ['thief'], ['archer']], low: [['bruiser', 1], ['thief'], ['archer']], vary: [2, ['archer', 'ember']] },
  { id: 'sandtrap', ch: 3, n: '모래 웅덩이', w: 1.1, from: 1, up: [['lurker'], ['bruiser']], low: [['lurker', 1], ['lurker'], ['archer']], vary: [2, ['archer', 'bruiser']] },
  { id: 'tomb', ch: 3, n: '묘실 파수', w: 1.0, from: 3, up: [['wrapped'], ['healer']], low: [['wrapped', 1], ['wrapped'], ['healer']], vary: [1, ['healer', 'shield']] },
  { id: 'firebrand', ch: 3, n: '불 지르는 행렬', w: 1.1, press: 1, from: 4, up: [['bruiser'], ['ember']], low: [['bruiser', 1], ['shield'], ['ember']], vary: [0, ['bruiser', 'wrapped']] },
  { id: 'hunt3', ch: 3, n: '사막 사냥패', w: 0.9, press: 1, from: 6, up: [['lurker'], ['archer'], ['archer']], low: [['lurker', 1], ['archer'], ['archer']], vary: [0, ['lurker', 'minion']] },
  { id: 'robbers3', ch: 3, n: '도굴꾼 떼', w: 0.8, from: 6, up: [['thief'], ['thief'], ['lurker']], low: [['thief'], ['thief', 1], ['lurker']], vary: [2, ['lurker', 'archer']] },
  { id: 'ashrite', ch: 3, n: '재 의식', w: 1.1, press: 1, from: 9, up: null, low: [['shield'], ['darkmage', 1], ['ember']], vary: [0, ['bruiser', 'shield']] },
  { id: 'sunchant', ch: 3, n: '태양 영창', w: 1.0, from: 9, up: null, low: [['shield', 1], ['pyre'], ['healer']], vary: [2, ['healer', 'ember']] },
  { id: 'mirages', ch: 3, n: '신기루 행렬', w: 1.0, from: 10, up: null, low: [['bruiser', 1], ['bruiser'], ['mirage']], vary: [1, ['bruiser', 'thief']] },
  { id: 'bones3', ch: 3, n: '불탄 해골 순찰', w: 0.7, from: 9, up: null, low: [['skeleton', 1], ['summoner'], ['skeleton']], vary: [2, ['minion', 'ember']] }, // 10월 7일: 해골 둘 + 소환사는 쓰러짐 43%라 셋째 칸이 하수인 · 투척병으로 바뀔 수 있다
);
ENC.treasure3 = [[['shield', 1], ['bruiser']], [['bruiser', 1], ['archer']], [['archer', 1], ['shield']]];
/* 가르치는 순서 (5절): 혼자 처음 나오는 층(그 층에서 놓치면 다음 층에 한 번 더). 역할은 그 무리로, 특성(noon · haze)은 그 특성을 붙인 방으로 */
const NEWR3 = ['lurker', 'ember', 'wrapped', 'mirage', 'haze'];
const INTRO_AT3 = { lurker: 1, wrapped: 3, ember: 4, noon: 6, haze: 9, mirage: 10 }; // 0.8.0 6단계: 16층 틀(옛 2 · 5 · 7 · 9 · 13 · 14층)
const INTRO_SQ3 = { lurker: 'sandtrap', wrapped: 'tomb', ember: 'firebrand', noon: 'zeal3', mirage: 'mirages' };
const FIRST_GIFT3 = { lurker: 'charm', wrapped: 'flash', ember: 'cleanse', noon: 'knot', mirage: 'mirror', haze: 'mirror' }; // 10월 14일 개편 4단계: 잠복자의 기습 → 나무 부적, 망자의 붕대(무너뜨리면 풀림) → 섬광 가루, 열풍의 화상 → 기도 매듭 // 10월 14일 개편 4단계: 없앤 소모품(흙 다지개 · 기름 단지 · 차양 천)의 보상은 뺐다 // 처음 만난 방을 이기면 그 상황을 푸는 소모품 하나 (5.1절 5번)
Object.assign(ROLE_INTRO, {
  lurker: ['발밑 모래가 숨을 쉰다.', '모래 속의 적은 땅속의 적처럼 고를 수 없습니다. 광역 공격은 더 아프게, 지속 피해는 그대로 들어갑니다. 솟구치기 한 행동 전에 예고합니다.'],
  wrapped: ['마른 붕대 사이로 모래가 흘러내린다.', '붕대는 받는 직접 피해를 줄입니다. 지속 피해는 줄이지 않습니다. 붕대는 화상이 걸리거나 무너지거나 세 번 맞으면 벗겨집니다.'],
  ember: ['기름 먹인 천이 타는 냄새가 난다.', '화상은 직접 피해를 받을 때마다 그 수만큼 피해를 더하고 1 줄어듭니다. 여러 번 맞는 싸움일수록 아픕니다.'],
  noon: ['공기가 일렁인다.', '열기가 라운드가 끝날 때마다 오릅니다. 100이 되면 열풍이 붑니다. 열풍은 나와 적 모두를 태웁니다.'],
  haze: ['같은 얼굴이 두 번 보인다.', '허상 한 겹은 적 하나를 고르는 공격 하나를 헛치게 합니다. 광역 공격과 지속 피해는 허상을 지나 들어갑니다.'],
  mirage: ['같은 얼굴이 두 번 보인다.', '허상 한 겹은 적 하나를 고르는 공격 하나를 헛치게 합니다. 광역 공격과 지속 피해는 허상을 지나 들어갑니다. 술사가 쓰러지면 술사가 준 허상도 사라집니다.'],
  fire: ['칼날 끝에 불이 붙어 있다.', '이 적의 공격은 화상을 싣습니다. 둔화가 걸려 있으면 싣지 않습니다.'],
});
/* 성소 · 제단 (11절) */
SHRINES.push({ id: 'shade', chs: [3], n: '그늘의 성소', d: '받는 화상 피해 −50%. 열기가 오르는 양 −30%.' }, { id: 'clarity', chs: [3], n: '맑은 눈의 성소', d: '허상이나 몸 낮추기에 막힌 공격도 피해의 절반이 들어갑니다.' });
ALTARS.push(
  { id: 'ash', chs: [3], n: '재의 제단', d: '가방의 소모품 넷을 태우면 3챕터 고급 소모품 둘을 받습니다. 파는 것과 돌멩이는 태울 수 없습니다.' },
  { id: 'scale', chs: [3], n: '유리 저울', d: '최대 생명력 3%를 바치고(이 캐릭터가 끝날 때까지) 패시브 포인트 1을 받습니다.' },
);
/* 이벤트 여덟 (11.1절, 3챕터). "다음 전투"는 다음 일반 · 매복 전투다(강적 · 보스 · 시련 방은 건너뛴다) */
EVENTS.push(
  { id: 'camel', ch: 3, n: '쓰러진 낙타', lore: '짐 끈이 모래에 반쯤 묻혀 있다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '소모품 셋. 대신 다음 전투를 화상 2로 시작합니다.' }, { id: 'bury', n: '묻어 준다', d: '선인장 수액 하나.' }] },
  { id: 'oasis', ch: 3, n: '신기루 속 샘', lore: '물빛이 흔들린다. 가까이 가도 사라지지 않는다.', opts: [{ id: 'drink', n: '마신다', d: '반반 확률로 생명력 30%를 회복하거나, 다음 전투를 둔화 2로 시작합니다.' }, { id: 'fill', n: '물을 담는다', d: '찬물 한 병.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'sundial', ch: 3, n: '왕의 해시계', lore: '바늘의 그림자가 아직 움직인다.', opts: [{ id: 'turn', n: '바늘을 돌린다', d: '다음 층 문 셋의 보상이 모두 보입니다. 대신 다음 전투에 작열하는 한낮이 붙고 열기 50에서 시작합니다.' }, { id: 'hasten', n: '해를 앞당긴다', d: '다음 층 문에 강적이 반드시 나오고 골드 25.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'archive', ch: 3, n: '불타는 서고', lore: '책장이 타는 냄새에 오래된 잉크 냄새가 섞인다.', opts: [{ id: 'pull', n: '불 속에서 책을 꺼낸다', d: '패시브 포인트 1. 대신 다음 전투를 화상 4로 시작합니다.' }, { id: 'sweep', n: '재를 쓸어 담는다', d: '골드 25.' }] },
  { id: 'names', ch: 3, n: '재 속의 이름', lore: '재 위에 낯익은 이름이 적혀 있다.', opts: [{ id: 'call', n: '이름을 부른다', d: '이 브라우저에서 쓰러진 내 캐릭터 이름 하나가 보이고, 골드를 받습니다(그 캐릭터의 레벨 × 4, 최대 40). 기록이 없으면 골드 10입니다.' }, { id: 'cover', n: '재를 덮어 준다', d: '다음 3개 방 동안 받는 직접 피해 −5%.' }] },
  { id: 'glass', ch: 3, n: '유리 사막', lore: '녹았다 굳은 땅이 햇빛을 되쏜다.', opts: [{ id: 'take', n: '유리를 줍는다', d: '희귀 장비 하나. 대신 다음 전투를 출혈 3으로 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'buried', ch: 3, n: '묻힌 문', lore: '모래 아래로 문틀 윗부분만 보인다.', opts: [{ id: 'dig', n: '판다', d: '스태미나 50을 씁니다. 반반 확률로 다음 층 문 하나가 보물 방이 되거나, 다음 전투가 모래 매복이 됩니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'herald', ch: 3, n: '여왕의 전령', lore: '재로 된 망토를 두른 자가 길을 막고 고개를 숙인다.', opts: [{ id: 'kneel', n: '무릎 꿇는다', d: '다음 4개 방 동안 받는 화상 피해 0, 주는 피해 −5%.' }, { id: 'draw', n: '칼을 뽑는다', d: '다음 일반 · 매복 전투에 화염 강화 정예 약탈자가 더해지고, 이기면 희귀 장비.' }] },
);
/* 3챕터 강적 다섯 · 보스 (14 · 15절). 무엇을 하는지와 대처는 비공개 문서에만 적는다. from: 나오는 첫 층, upper: 0이면 하층에만, needs: 먼저 만나야 하는 것 */
STRONG_FOES.push(
  { id: 'stalker', ch: 3, n: '모래 속 사냥꾼', en: [['lurker', 1], ['archer'], ['bruiser']], hp: 0.9, from: 2, needs: ['lurker'] },
  { id: 'colossus', ch: 3, n: '녹은 유리 거상', en: [['bruiser', 1]], hp: 1.2, from: 3 },
  { id: 'reaper', ch: 3, n: '불씨 수확자', en: [['bruiser', 1], ['ember']], dmg: 0.75, from: 5, needs: ['ember'] }, // 10월 7일: 평소 0.9 → 0.75, 호위 약탈자를 뺐다 (쓰러짐 44 → 57 → 31%)
  { id: 'sundial', ch: 3, n: '해시계 사제', en: [['healer', 1], ['shield'], ['bruiser']], dmg: 0.6, from: 9, upper: 0 }, // 10월 7일: 후열에서 늘 때려 0.8 → 0.6 (쓰러짐 63%)
  { id: 'dancer', ch: 3, n: '아지랑이 무희', en: [['bruiser', 1], ['archer']], hp: 0.8, dmg: 0.85, from: 10, upper: 0, needs: ['haze'] }, // 10월 7일: 허상으로 싸움이 길어 체력 0.8 · 평소 0.85 (쓰러짐 50%, 표본 작음)
);
Object.assign(FOE_X, { // 뜻은 비공개 문서
  stalker: { aoeReveal: 2, surgeBleed: 3, exposedTaken: 0.3, parryRest: 2 },
  colossus: { heatMax: 3, pourIgn: 3, crackVuln: 2, crackBrk: 40, spd: 0.7 },
  reaper: { death: 2, cap: 6, base: 0.30, add: 0.025 },
  sundial: { clock: 6, noon: 0.28, noonEmp: 2, brkBack: 3, lowAt: 2, lowBack: 1, bellBack: 2, glassBack: 2 },
  dancer: { haze: 2, hit: 0.11, capTot: 0.35 }, // 10월 7일: 분신 3겹은 쓰러짐 45~53%(한 적 공격 직업이 한 바퀴마다 세 번을 헛쳤다)라 2겹
});
const QUEEN = { brk: 180, heat0: 20, rise: [10, 13, 16], hiddenX: 2, ash: 10, breath: 0.5, ignTick: 2, chant: 25, enrageRise: 20, enrageFloor: 50, crownHp: 0.08, crownHit: 6, crownRoundCap: 24, crownBreak: 40, crownRegrow: 3, crownGrow: 1.5, breakHeat: 30, shock: 10, storm: 0.26, stormWeak: 2, stormIgn: 2, stormReset: 30, p3StormSelf: 0.06, p3SelfMax: 3, maidHp: 0.07, maidMax: 2, maidBack: 2, maidHit: 0.5, surge: 3, surgeBleed: 2, p2Cycle: 4, ph: [0.7, 0.35], p2Heat: 10, p3Heat: 55, enrage: 50 }; // 재의 여왕 (뜻은 비공개 문서)
Object.assign(FOE_INTRO, {
  queen: { n: '재의 여왕', lore: '불타는 왕국을 재로 굳혀 지킨 자. 아직도 해가 지지 않기를 기다린다.', see: ['왕좌의 재가 사람 모양으로 일어선다. 재 속에서 당신의 이름이 반짝인다.', '공기가 뜨거워진다.'] },
  stalker: { n: '모래 속 사냥꾼', lore: '발자국이 앞에서 끊기고, 뒤에서 다시 시작된다.', see: ['모래가 한 번 크게 일렁인다. 무언가 그 아래를 지나간다.'] },
  colossus: { n: '녹은 유리 거상', lore: '사원의 유리창이 녹아 사람 모양으로 굳었다.', see: ['거상의 몸속에서 붉은 빛이 천천히 차오른다.'] },
  reaper: { n: '불씨 수확자', lore: '낫 끝에 꺼지지 않는 불씨가 매달려 있다.', see: ['수확자가 낫을 들어 올린다. 주변의 불꽃이 그쪽으로 기운다.'] },
  sundial: { n: '해시계 사제', lore: '그림자의 길이로 남은 시간을 재는 자.', see: ['사제 뒤의 해시계에 숫자가 새겨져 있다. 그림자가 한 칸씩 짧아진다.'] },
  dancer: { n: '아지랑이 무희', lore: '춤이 끝나기 전에는 몇 명인지 셀 수 없다.', see: ['무희가 한 바퀴 돌자 윤곽이 셋으로 번진다.'] },
});
Object.assign(CODEX, {
  stalker: { hide: '모래 속에서는 칼이 닿지 않았다.', startle: '모래 위로 튀어나왔다.', exposed: '솟구친 뒤에는 한동안 모래 위에서 숨을 골랐다.' },
  colossus: { heat: '달아오를수록 닿는 곳마다 데었다.', crack: '식은 유리에 금이 갔다.', pour: '붉은 빛이 가득 차자 녹은 유리가 쏟아졌다.' },
  reaper: { reap: '낫이 불꽃을 거두어 갔다. 거둔 만큼 낫이 무거웠다.', ember: '불붙은 채 쓰러진 것의 불씨가 낫으로 날아들었다.', scatter: '불씨가 흩어졌다.' },
  sundial: { noon: '해시계의 그림자가 사라지는 순간 빛이 내리꽂혔다.', stall: '해시계의 그림자가 한동안 움직이지 않았다.', shadow: '그림자가 다시 길어졌다.' },
  dancer: { copies: '칼에 맞은 것은 윤곽뿐이었다.', dance: '남은 윤곽의 수만큼 춤이 길었다.', sweep: '윤곽이 한꺼번에 흩어졌다.' },
  queen: { heat: '공기가 뜨거워질수록 재가 무겁게 내려앉았다.', crown: '열기가 가라앉는 때가 있었다.', crownbreak: '왕관이 깨지자 여왕이 휘청였다.', storm: '열기가 가득 차자 재폭풍이 몰아쳤다.', fire: '불길이 여왕에게 스며들자 공기가 더 뜨거워졌다.', sand: '여왕이 모래에 잠긴 동안 열기가 더 빨리 올랐다.', chant: '시녀의 노래가 끝나자 열기가 치솟았다.', melt: '왕관이 녹아내린 뒤로 여왕도 자신의 불에 타들어 갔다.' },
});

/* A1 1챕터 이식(만든 사람 확인 10월 21일): 수선공(옛 뼈 부르는 사제) — 수선 n · 띄우기 약화 loft · 정예 마지막 수선은 생명력 ult 아래에서 한 번, 다시 일어날 때 최대 생명력 × rise.
   수련장(우두머리) — 호령 강화 order · 꾸짖음 피해 × scold · 약화 scoldWeak · 회초리 세례는 행동 ultAt번 뒤 한 번. 숫자는 가설(M7) */
const MENDER = { loft: 1, ult: 0.5, rise: 0.4 };
const DRILL = { order: 1, scold: 0.5, scoldWeak: 1, ultAt: 3 };
