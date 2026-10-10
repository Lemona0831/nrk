/* 나락의 유산 데이터: 던전과 갈림길 (기획서 11.3절)
   한 챕터 = 상층 12층(1~11층, 12층 야영지) + 하층 12층(13~23층, 24층 보스). 10월 4일 만든 사람 결정: 24층, 12:12. 샘은 정해진 층 없이 드문 방이다. 값만 둔다. */
const FLOORS = 24;
const FLOOR_CAMP = 12, FLOOR_BOSS = 24;
const isLower = f => f > FLOOR_CAMP;
const chOf = () => ({ boss: FLOOR_BOSS, camp: FLOOR_CAMP, lower: FLOOR_CAMP + 1, spring: 0 }); // 테스터(dgqa)가 읽는 챕터 틀

/* 방 유형: w 가중치, max 챕터당 최대, from 나오는 첫 층, fight 전투 방.
   10월 4일 만든 사람 결정: 보물을 줄이고 일반 · 매복 · 강적을 늘린다. 시련은 드물게. 샘은 문 하나에 2~3%, 한 층의 문 셋 가운데 나올 확률 4~9%(가중치 2). 언제나 1~10% 사이 */
const ROOM_TYPES = {
  normal: { n: '일반', ico: '⚔️', w: 44, max: 99, from: 1, fight: 1, risk: 1, gold: [6, 9], hint: '장비 1' },
  ambush: { n: '매복', ico: '🗡️', w: 15, max: 5, from: 2, fight: 1, risk: 2, gold: [9, 13], hint: '적이 먼저 움직인다 · 적이 거세다 · 전리품 많음 · 장비 1' },
  strong: { n: '강적', ico: '💀', w: 13, max: 6, from: 3, fight: 1, risk: 3, gold: [40, 40], hint: '희귀 장비 · 골드 많음 · 전리품 많음' }, // 10월 4일 하이 리스크 하이 리턴: 희귀 보장, 전리품 LOOT.strong. 골드는 경제 맞춤으로 40
  treasure: { n: '보물', ico: '🗝️', w: 4, max: 2, from: 2, fight: 1, risk: 2, gold: [16, 16], hint: '상자: 장비 둘 중 하나, 희귀 보장' },
  trial: { n: '시련', ico: '🔥', w: 3, max: 2, from: 5, fight: 1, risk: 4, gold: [25, 25], hint: '방 특성 둘 · 희귀 장비' },
  spring: { n: '샘', ico: '💧', w: 2, max: 2, from: 3, fight: 0, risk: 0, hint: '생명력 50% 회복, 플라스크 각 1' },
  shrine: { n: '성소', ico: '🕯️', w: 6, max: 3, from: 1, fight: 0, risk: 0, hint: '3개 방 동안 이로운 효과' },
  altar: { n: '제단', ico: '🩸', w: 5, max: 3, from: 2, fight: 0, risk: 0, hint: '대가 있는 거래' },
  event: { n: '이벤트', ico: '❔', w: 7, max: 5, from: 2, fight: 0, risk: 0, hint: '선택에 따라 다르다' },
  fate: { n: '운명의 저울', ico: '⚖️', w: 0, max: 2, from: 2, fight: 0, risk: 0, hint: '장비를 한 단계 위로 올린다 · 실패하면 장비를 잃는다' }, // 2챕터부터. genDoors가 쉬는 문 하나를 바꿔 끼운다(typeOk는 늘 거짓)
};
/* 방 골드 (10월 4일 경제 맞춤): 24층이 되어 깬 캐릭터의 정산이 평균 464(목표 약 320)라 방 골드를 30%쯤 낮췄다. 정산 평균 368, 험한 길 위주 478, 샛길 위주 313 */
/* 강적은 상층 3, 하층 3까지 */
const STRONG_PER_HALF = 3;
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
const PATH_AT = [4, 8, 13, 17, 21]; // 이 층의 문을 열기 전에 길을 고른다(1~3층은 큰 길)
const PATHS = {
  rough: { n: '험한 길', ico: '⛰️', hp: 1.15, dmg: 1.12, loot: 1.5, gold: 1.3, up: 0.35, risk: 1, w: { strong: 1.6, ambush: 1.5, trial: 2, treasure: 1.3, spring: 0.5, shrine: 0.6, event: 0.8 }, d: '적이 더 거셉니다. 강적 · 매복 · 시련 문이 자주 나옵니다. 전리품과 골드가 많고, 장비 등급이 자주 한 단계 오릅니다.' },
  main: { n: '큰 길', ico: '🛤️', hp: 1, dmg: 1, loot: 1, gold: 1, risk: 0, w: {}, d: '평소대로입니다.' },
  quiet: { n: '샛길', ico: '🌿', hp: 0.88, dmg: 0.9, loot: 0.7, gold: 0.75, up: -0.3, risk: -1, w: { strong: 0.4, ambush: 0.5, trial: 0.3, shrine: 1.5, event: 1.4, altar: 1.2, spring: 0.8 }, d: '적이 덜 거셉니다. 쉬는 방 문이 자주 나옵니다. 전리품과 골드가 적고, 장비 등급이 가끔 한 단계 내려갑니다.' },
};

const PATHS_HARD = {
  rough: Object.assign({}, PATHS.rough, { loot: 1.7, gold: 1.5, up: 0.45, w: { strong: 2.2, ambush: 1.5, trial: 2, treasure: 1.3, spring: 0.5, shrine: 0.6, event: 0.8 }, d: '적이 더 거셉니다. 강적 · 매복 · 시련 문이 아주 자주 나옵니다. 전리품과 골드가 크게 늘고, 장비 등급이 자주 한 단계 오릅니다.' }),
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
const MARK_START = { 2: { lv: 5 }, 3: { lv: 10 } }; // 2챕터는 Lv5, 3챕터는 Lv10에서 시작(기획서 11.4: 챕터 끝 레벨)
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
const AMBUSH = { hp: 1.5, dmg: 1.4, elite: 1, loot: 1.5 }; // 방 하나에 잃는 생명력이 일반과 강적 사이의 60~70% 자리(암살자 14 · 30 · 41%, 파수꾼 10 · 26 · 32%)
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
  { id: 'wall', n: '방패벽', w: 1, up: [['shield'], ['shield'], ['minion']], low: [['shield', 1], ['shield'], ['archer']], vary: [2, ['minion', 'archer']] },
  { id: 'hymn', n: '성가 행렬', w: 1.4, up: [['bruiser'], ['bruiser'], ['healer']], low: [['bruiser', 1], ['bruiser'], ['healer']], vary: [1, ['bruiser', 'thief']] },
  { id: 'pyre', n: '화형 의식', w: 0.8, press: 1, up: [['bruiser'], ['pyre']], low: [['shield'], ['bruiser'], ['pyre', 1]], vary: [0, ['bruiser', 'shield', 'minion']] }, // 10월 5일: 자폭 행렬을 바꿨다
  { id: 'thieves', n: '도둑 떼', w: 0.8, up: [['thief'], ['thief'], ['archer']], low: [['thief'], ['thief'], ['archer', 1]], vary: [2, ['archer', 'darkmage']] },
  { id: 'rite', n: '저주 의식', w: 1.5, press: 1, up: [['minion'], ['darkmage'], ['darkmage']], low: [['shield'], ['darkmage', 1], ['darkmage']], vary: [0, ['bruiser', 'shield']] },
  { id: 'bones', n: '뼈 무덤', w: 1, up: [['bruiser'], ['summoner']], low: [['bruiser', 1], ['summoner']], vary: [0, ['bruiser', 'shield']] },
  { id: 'hunt', n: '사냥패', w: 1, press: 1, up: [['minion'], ['archer'], ['archer']], low: [['bruiser', 1], ['archer'], ['archer']], vary: [0, ['minion', 'bruiser', 'thief']] },
  { id: 'zeal', n: '광신 돌격', w: 1.3, up: [['bruiser'], ['bruiser']], low: [['bruiser', 1], ['bruiser']], vary: [1, ['bruiser', 'thief']] },
  { id: 'patrol', n: '혼성 순찰', w: 1, up: [['bruiser'], ['archer'], ['healer']], low: [['bruiser'], ['archer'], ['healer', 1]], vary: [1, ['archer', 'darkmage', 'thief', 'pyre']] },
  { id: 'gate', n: '문지기', w: 0.6, up: [['bruiser', 1]], low: [['bruiser', 1], ['shield']], vary: [0, ['bruiser', 'shield']] },
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

/* 이벤트 (1챕터). 같은 것은 한 챕터에 한 번 */
const EVENTS = [
  { id: 'confess', n: '버려진 고해실', lore: '휘장 너머에서 누군가 숨을 고른다.', opts: [{ id: 'do', n: '고해한다', d: '희귀 장비 하나. 대신 약화 3 · 취약 3을 안고 다음 전투에 들어갑니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'pilgrim', n: '쓰러진 순례자', lore: '짐 보따리가 아직 따뜻하다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '장비 하나. 대신 다음 전투를 중독 3으로 시작합니다.' }, { id: 'pray', n: '기도한다', d: '생명력 플라스크 +1.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'reliquary', n: '잠긴 성물함', lore: '녹슨 자물쇠가 손을 기다린다.', opts: [{ id: 'force', n: '억지로 연다', d: '스태미나 40을 쓰고 골드 30 또는 고급 장비를 얻습니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'chalice', n: '피 묻은 성배', lore: '잔 바닥에 검붉은 것이 고여 있다.', opts: [{ id: 'drink', n: '마신다', d: '최대 생명력 +5(영구). 지금 생명력은 15% 줄어듭니다.' }, { id: 'spill', n: '쏟는다', d: '정화 플라스크 +1.' }] },
  { id: 'candle', n: '속삭이는 촛불', lore: '불꽃이 이름을 부른다.', opts: [{ id: 'snuff', n: '불을 끈다', d: '다음 3개 방 동안 받는 화상 피해가 0이 됩니다. 대신 주는 피해 −5%.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'library', n: '무너진 서고', lore: '젖은 책장 사이로 글자가 번진다.', opts: [{ id: 'read', n: '책을 읽는다', d: '능력치 1점.' }, { id: 'sell', n: '책을 챙긴다', d: '골드 20.' }] },
  { id: 'monk', n: '굶주린 수도사', lore: '뼈만 남은 손이 소매를 붙든다.', opts: [{ id: 'feed', n: '먹을 것을 준다', d: '플라스크 하나(가장 많이 찬 것)를 비우면 다음 전투 방에서 장비 하나를 더 얻습니다.' }, { id: 'chase', n: '내쫓는다', d: '다음 전투에 굶주린 수도사(돌격병)가 더해집니다. 이기면 골드 20.' }] },
  { id: 'bell', n: '종탑의 줄', lore: '줄 끝이 아래로, 아래로 이어진다.', opts: [{ id: 'pull', n: '당긴다', d: '다음 층 문에 강적이 반드시 나옵니다. 골드 15.' }, { id: 'pass', n: '지나친다', d: '' }] },
];

/* ===== 성장과 적 (기획서 11.4절, 11.8절) ===== */
/* 몬스터 레벨: 1챕터 1~4. 레벨마다 체력 +12%, 피해 +10% */
const MLV_HP = 0.12, MLV_DMG = 0.10;
/* 난이도 (10월 2일, 만든 사람 결정: 1챕터 완주 자동 테스터 평균 20%, 숙련·탐험가 40%. 1층부터 실전) 던전 방의 적 체력·피해 배율 */
const DIFF = { upper: { hp: 0.72, dmg: 0.57 }, lower: { hp: 0.9, dmg: 0.58 } }; // 10월 4일 강적 다섯 · 테마 무리 뒤: AI 테스터 완주 암살자 9 · 파수꾼 13%. 이전: 상층 0.75 · 0.6, 하층 1.0 · 0.68 (1차 0.8 · 0.65, 1.05 · 0.7. 개편 전 0.9 · 0.85, 1.2 · 0.9)
function mlvOf(f, ch) { return (f >= FLOOR_BOSS ? 4 : f <= 6 ? 1 : f <= FLOOR_CAMP ? 2 : f <= 18 ? 3 : 4) + 4 * (((ch || (typeof G !== 'undefined' && G.run && G.run.ch)) || 1) - 1); } // 24층: 6층마다 한 단계. 챕터마다 +4 (1챕터 1~4, 2챕터 5~8, 3챕터 9~12, 기획서 11.4)
/* 경험치: 일반 5, 정예 12, 강적 30, 보스 100 × (1 + 0.15 × (몬스터 레벨 − 1)). 소환된 적은 0 */
const XP_BASE = { normal: 5, elite: 12, strong: 40, boss: 100 }; // 강적 30 → 40 (10월 4일 하이 리스크 하이 리턴) // 보스 150이면 챕터 끝 Lv6으로 목표(4~5)를 넘어 100으로 (10월 2일)
/* 보스에서 오른 능력치는 다음 챕터 준비에서 나눈다(run.statPending, 단계 9) */
const XP_LV = 0.15;
/* 레벨 n이 되는 데 필요한 누적 경험치 (LV_XP[n-1]) */
const LV_XP = [0, 40, 100, 180, 300, 470, 660, 870, 1100, 1350, 1620, 1910, 2220]; // 1챕터를 무작위 길로 끝까지 가면 Lv5 안팎 (10월 2일 8판 시험)
const LV_POINTS = 2;
const STAT_START = 15; // 10월 4일 만든 사람 결정: 능력치 다섯, 처음 15점 · 레벨마다 2점
const STAT_REC = { assassin: { dex: 0.4, int: 0.35, con: 0.25 }, warden: { str: 0.35, con: 0.35, wil: 0.3 }, hunter: { dex: 0.45, con: 0.3, str: 0.25 }, butcher: { str: 0.3, con: 0.3, wil: 0.25, int: 0.15 }, elementalist: { int: 0.45, con: 0.35, wil: 0.2 }, spellblade: { str: 0.3, int: 0.3, con: 0.25, wil: 0.15 }, monk: { str: 0.35, dex: 0.35, con: 0.3 }, confessor: { con: 0.35, str: 0.35, int: 0.3 }, bloodmage: { int: 0.4, con: 0.3, wil: 0.3 } }; // 추천 배분 (직업마다)
/* 정예 접사 "강인": 체력 +50% (4.6절 1막 접사). 정예에게 상층 35%, 하층 60% */
const TOUGH_CHANCE = { upper: 0.35, lower: 0.6 };
/* 1챕터(저주받은 수도원) 적 이름. 역할은 카드에 작게 함께 보인다 */
const ENEMY_NAMES = {
  1: { bruiser: '광신 수도사', shield: '문지기 수사', archer: '종탑 궁수', healer: '피 닦는 수녀', summoner: '뼈 부르는 사제', bomber: '불붙은 고행자', pyre: '화형 사제', minion: '일어선 시체', thief: '헌금함 도둑', darkmage: '검은 기도사' },
};

/* ===== 챕터 (10월 5일, 1~3챕터 작업): 챕터마다 다른 값은 여기서만 읽는다(chData). 층 틀(24층, 12:12, 갈래길)은 모든 챕터가 같다.
   n 이름, boss 보스, settleLore 정산 분위기 문장, nextLore 다음 챕터를 내다보는 문장, diff 던전 세기(없으면 DIFF), names 적 이름(없으면 ENEMY_NAMES[1]).
   SQUADS · STRONG_FOES · EVENTS의 ch(없으면 1)와 ROOM_MODS의 chs(없으면 모든 챕터)로 챕터를 가른다 */
const CHAPTERS = {
  1: { n: '저주받은 수도원', boss: 'abbot', settleLore: '수도원장의 종이 멎었다. 계단은 더 아래로 이어진다.', nextLore: '수도원보다 더 깊은 곳에서 찬 바람이 올라온다.' },
};
const chData = ch => CHAPTERS[ch] || CHAPTERS[1];
const diffOf = ch => chData(ch).diff || DIFF;
const inCh = (x, ch) => (x.ch || 1) === (ch || 1);
/* ===== 강적과 보스: 처음 만날 때 "눈에 보이는 것", 겪은 뒤 도감 (기획서 11.9절) =====
   여기에는 대처법을 쓰지 않는다. 기믹 상세는 저장소 밖 비공개 문서에 있다 */
const FOE_INTRO = {
  abbot: { n: '타락한 수도원장', lore: '제단 앞에서 등을 돌린 채, 아직도 누군가의 고해를 기다린다.', see: ['수도원장이 낡은 성서를 펼친다. 손가락이 당신의 이름 위에서 멈춘다.'] },
  bellringer: { n: '종지기', lore: '줄을 놓지 않는 손. 종은 아직 울리지 않았다.', see: ['뒤쪽에 큰 종이 매달려 있다. 종지기가 줄을 감아쥔다.'] },
  bishop: { n: '납골당 주교', lore: '뼈로 엮은 주교관을 쓴 자. 묻힌 이들이 아직 그의 말을 듣는다.', see: ['주교가 지팡이로 바닥을 두드린다. 흙 아래에서 무언가 꿈틀거린다.'] },
  cantor: { n: '성가 조율자', lore: '무너진 성가대석에서 혼자 박자를 센다.', see: ['조율자가 손을 들자 곁의 수도사들이 숨을 맞춘다.'] },
  scribe: { n: '검은 서기관', lore: '펜촉에서 검은 잉크가 끝없이 떨어진다.', see: ['서기관이 두루마리를 펼친다. 당신이 할 수 있는 일들이 한 줄씩 적혀 있다.'] },
  pilgrim: { n: '굶주린 순례자', lore: '먼 길을 걸어온 자. 이제 무엇을 먹어도 배가 차지 않는다.', see: ['순례자가 입가를 훔친다. 손등에 마른 피가 묻어 있다.'] },
};
/* 도감: 처음 겪은 일만 적힌다 (결과만, 대처법은 플레이어 메모) */
const CODEX = {
  abbot: { brand: '죄를 읽으면 낙인이 남는다. 낙인이 쌓인 채 내리치는 강타는 더 아프다.', vow: '입을 다문 동안에는 공격하지 않고 상처를 다스린다. 그동안 직접 공격은 덜 들어간다.', vowbreak: '입을 다문 채 자세가 무너지면 서원이 깨지고 빈틈이 드러난다.', judgment: '낙인이 가득 찬 채 내리치는 강타는 심판이 된다.', demand: '수도원장은 때로 맞서기를, 때로 침묵을 요구한다.', bell: '입을 다물기 전, 종이 울리며 몸에 두른 기운이 흩어진다.', candles: '입을 다문 동안 촛불이 켜진다. 서원이 끝날 때 남은 촛불이 수도원장을 북돋운다.', altar: '제단이 무너지며 돌이 떨어진다. 돌은 이따금 다시 떨어진다.', sacrifice: '숨이 다해 가면 수도원장이 수도사를 끌어당겨 제물로 삼는다.', monks: '쓰러지기 직전, 제단에서 수도사들이 일어나 수도원장을 돌본다.' },
  bellringer: { ring: '종이 울리면 적들이 서두른다.', bellbreak: '큰 종이 부서지면 종지기가 비틀거리고, 종은 더 울리지 않는다.' },
  bishop: { raise: '주교가 지팡이를 두드리면 시체가 일어선다.', spear: '뼈 창은 일어선 시체를 삼키고, 삼킨 만큼 무겁다.' },
  cantor: { hymn: '조율자가 음을 고를수록 곁의 적들이 거세진다.', chorus: '노래가 끝나면 곁의 적들이 한꺼번에 덮친다.', cut: '조율자의 자세가 무너지자 노래가 흩어졌다.' },
  scribe: { seal: '서기관이 적어 넣은 것은 한동안 쓸 수 없다.', verdict: '봉인이 가득 차자 선고가 내렸다.', unseal: '서기관의 자세가 무너지자 봉인이 풀렸다.' },
  pilgrim: { leech: '맞힐 때마다 피를 마시며 상처를 메운다.', frenzy: '반쯤 쓰러지면 더 빨라진다.', rot: '쓰러질 때 썩은 기운이 퍼져, 다음 방까지 몸에 남는다.' },
};

/* ===== 2챕터: 잊힌 지하묘지 (10월 5일, docs/챕터/2챕터.md. 강적 · 보스의 기믹과 대처는 비공개 문서) =====
   틀은 1챕터와 같다(24층, 12:12, 갈래길). 이 칸은 1챕터 배열에 ch: 2 항목을 더하고 CHAPTERS[2]를 채운다. 수치는 모두 [가설] */
ENEMY_NAMES[2] = { bruiser: '무덤지기', shield: '납골당 문지기', archer: '납골당 궁수', healer: '곡하는 사제', summoner: '뼈 엮는 자', minion: '기어 나온 뼈', thief: '도굴꾼', pyre: '장송 영창자', skeleton: '해골 병사', hexer: '무덤 주술사', mason: '뼈 쌓는 자', burrower: '굴 파는 시체', bloat: '부푼 시체', bonewall: '뼈벽' };
CHAPTERS[2] = {
  n: '잊힌 지하묘지', boss: 'cryptlord', names: ENEMY_NAMES[2], strongFrom: 4, xp: 1.55, gold: 1.35, settleStrong: 30,
  diff: { upper: { hp: 0.75, dmg: 0.51 }, lower: { hp: 0.92, dmg: 0.527 } }, // 10월 9일 결정 7 가(2챕터 완주 10~20%): 적 피해 ×0.85. 이전 dmg 0.60 · 0.62(5.1%). 5,400판 처음부터 흐름에서 1챕터를 깬 434명 가운데 61명(14.1%)
  settleLore: '녹슨 왕관이 뼈 더미 위로 굴러떨어졌다. 더 깊은 곳에서 뜨거운 모래바람이 불어온다.',
  nextLore: '계단 아래로 마른 열기가 올라온다. 벽 틈마다 재가 쌓여 있다.',
  zones: [[6, '무너진 제단 아래'], [11, '납골 회랑'], [12, '마른 세례조'], [18, '이름의 벽'], [23, '왕의 묘실 앞'], [24, '군주의 묘실']],
};
CHAPTERS[1].xp = 1; CHAPTERS[1].gold = 1; CHAPTERS[1].settleStrong = 20;
/* 새 역할의 행동 수치 (docs/챕터/2챕터.md 5절) */
const RISE = { pile: 0.15, wait: 2, hp: 0.5 };   // 해골: 쓰러지면 뼈 더미(최대의 15%), 2라운드 뒤 50%로 한 번만 일어선다
const HEX = { base: 0.04, per: 0.04, cap: 0.24, kinds: ['poison', 'bleed', 'ignite', 'weak', 'vuln'] }; // 무덤 주술사 조이기 = 기준 × (base + per × 내 해로운 상태 가짓수)
const BWALL = { hp: 1.0, brk: 30, cut: 0.5, mend: 0.5, wait: 2 }; // 뼈벽: 후열이 받는 한 적 대상 피해 ×cut
const BURROW = { up: 1.6, aoe: 1.3, vuln: 2, chill: 1 }; // 굴 파는 시체: 솟구침 = 평소 × up, 땅속에서 광역 ×aoe, 드러나면 취약
const BLOAT = { me: 4, foes: 3 };                // 부푼 시체: 쓰러질 때 중독
const SWIFT = { share: 0.5, hp: 1.15, from: 9 }; // 신속 접사(2챕터부터): 라운드가 시작될 때 둔화가 없으면 가속 1
const INTRO_AT = { skeleton: 1, hexer: 3, burrower: 5, mason: 7, bloat: 13 }; // 처음 만남 보장 문 (그 층까지 못 봤으면)
const ROLE_INTRO = {
  skeleton: ['뼈마디가 덜그럭거린다.', '쓰러진 해골은 뼈 더미가 됩니다. 더미 위 숫자는 다시 일어서기까지 남은 라운드입니다. 화상이 걸렸거나 무너진 채 쓰러진 해골은 일어서지 않습니다.'],
  hexer: ['손가락에 감긴 실이 내 쪽으로 뻗어 있다.', '조이기는 내 해로운 상태가 여러 가지일수록 아픕니다.'],
  mason: ['등에 진 바구니에서 뼈가 쏟아진다.', '뼈벽이 서 있으면 후열의 적은 한 적을 노린 공격을 절반만 받습니다. 뼈벽은 붕괴에 약합니다.'],
  burrower: ['바닥의 흙이 숨을 쉰다.', '땅속의 적은 고를 수 없습니다. 솟구친 직후에는 드러나 취약해집니다.'],
  bloat: ['배가 터질 듯 부어 있다.', '쓰러지면 터져 중독을 퍼뜨립니다. 불에 타면 터지지 않습니다.'],
  swift: ['이 적은 발이 땅에 닿지 않는다.', '라운드가 시작될 때마다 가속 1을 얻습니다. 둔화가 걸리면 그만큼 사라집니다.'],
};
/* 2챕터 테마 무리 (7절). from: 나오는 첫 층 */
SQUADS.push(
  { id: 'bonepatrol', ch: 2, n: '뼈 순찰', w: 1.2, from: 1, up: [['skeleton'], ['skeleton']], low: [['skeleton', 1], ['skeleton'], ['archer']], vary: [1, ['bruiser', 'shield']] },
  { id: 'diggers', ch: 2, n: '무덤지기 패', w: 1.0, from: 1, up: [['bruiser'], ['skeleton']], low: [['bruiser', 1], ['skeleton'], ['healer']], vary: [1, ['skeleton', 'shield', 'bloat']] },
  { id: 'weave', ch: 2, n: '뼈 엮기', w: 0.8, from: 2, up: [['skeleton'], ['summoner']], low: [['skeleton', 1], ['summoner'], ['healer']], vary: [0, ['skeleton', 'bruiser']] },
  { id: 'knot', ch: 2, n: '저주 매듭', w: 1.2, press: 1, from: 3, up: [['bruiser'], ['hexer']], low: [['shield'], ['hexer', 1], ['hexer']], vary: [0, ['bruiser', 'skeleton', 'bloat']] },
  { id: 'mourn', ch: 2, n: '곡하는 행렬', w: 1.2, from: 4, up: [['skeleton'], ['skeleton'], ['healer']], low: [['skeleton', 1], ['skeleton'], ['healer']], vary: [1, ['skeleton', 'bruiser', 'bloat']] },
  { id: 'robbers', ch: 2, n: '도굴꾼 떼', w: 0.8, from: 4, up: [['thief'], ['thief'], ['archer']], low: [['thief'], ['burrower'], ['archer', 1]], vary: [2, ['archer', 'hexer']] },
  { id: 'burrow', ch: 2, n: '굴 무리', w: 1.0, press: 1, from: 5, up: [['burrower'], ['archer']], low: [['burrower', 1], ['burrower'], ['archer']], vary: [1, ['archer', 'skeleton']] },
  { id: 'dirge', ch: 2, n: '장송 영창', w: 0.8, press: 1, from: 6, up: [['skeleton'], ['pyre']], low: [['shield'], ['skeleton'], ['pyre', 1]], vary: [0, ['bruiser', 'shield', 'skeleton']] },
  { id: 'masonry', ch: 2, n: '뼈벽 공사', w: 1.0, from: 7, up: [['bruiser'], ['mason']], low: [['skeleton'], ['mason', 1], ['archer']], vary: [0, ['bruiser', 'shield', 'skeleton']] },
  { id: 'garrison', ch: 2, n: '납골당 수비대', w: 1.2, press: 1, from: 14, up: [['skeleton', 1], ['mason'], ['hexer']], low: [['skeleton', 1], ['mason'], ['hexer']], vary: [0, ['burrower', 'shield', 'bloat']] },
);
ENC.treasure2 = [[['shield', 1], ['skeleton']], [['skeleton', 1], ['archer']], [['burrower', 1], ['hexer']]];
/* 방 특성 (9절): 새 셋은 2챕터만, 수도원 주제(성수 · 종소리)는 1챕터만 */
ROOM_MODS.holy.chs = [1]; ROOM_MODS.bell.chs = [1];
ROOM_MODS.bonepile = { n: '무너진 납골벽', chs: [2], d: '전투가 시작될 때 전열에 뼈 더미 둘이 있습니다. 2라운드 뒤 해골 병사로 일어섭니다.' };
ROOM_MODS.rotair = { n: '썩은 공기', chs: [2], d: '이 방에서는 중독이 줄지 않습니다.' };
ROOM_MODS.flooded = { n: '물에 잠긴 바닥', chs: [2], d: '전투가 시작될 때 나와 모든 적이 둔화 1을 안습니다. 물이 차 있어 아무도 땅속에 숨지 못합니다.' };
/* 성소 · 제단 (10절): chs가 없으면 모든 챕터 */
SHRINES.push({ id: 'rest', chs: [2, 3], n: '안식의 성소', d: '쓰러뜨린 적은 다시 일어서지 않습니다.' }, { id: 'firm', chs: [2, 3], n: '굳건함의 성소', d: '예고된 큰 공격으로 받는 피해 −15%.' });
ALTARS.find(a => a.id === 'gold').cost = [40, 60, 90];
ALTARS.push({ id: 'bone', chs: [2], n: '뼈 제단', d: '가방의 소모품 셋을 바치면 2챕터 소모품 둘을 받습니다. 파는 것은 바칠 수 없습니다.' });
/* 이벤트 여덟 (10.3절, 2챕터) */
EVENTS.push(
  { id: 'tomb', ch: 2, n: '이름 없는 묘비', lore: '비석의 맨 윗줄만 비어 있다.', opts: [{ id: 'carve', n: '이름을 새긴다', d: '최대 생명력 +5(영구). 다음 전투를 약화 2 · 취약 2를 안고 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonetrader', ch: 2, n: '뼈 상인', lore: '해골 하나가 좌판 앞에 앉아 있다. 금화는 받지 않는다.', opts: [{ id: 'gear', n: '장비를 넘긴다', d: '가방의 장비 하나를 주고 같은 등급 장비 하나를 받습니다.' }, { id: 'cons', n: '소모품을 넘긴다', d: '소모품 셋을 주고 2챕터 소모품 하나를 받습니다(파는 것은 넘길 수 없습니다).' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'coffin', ch: 2, n: '봉인된 관', lore: '사슬이 안쪽에서 당겨진다.', opts: [{ id: 'break', n: '사슬을 끊는다', d: '절반은 희귀 장비. 아니면 다음 전투에 정예 해골 병사가 더해지고, 이기면 희귀 장비를 받습니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'procession', ch: 2, n: '장례 행렬', lore: '촛불 없는 행렬이 지나간다.', opts: [{ id: 'follow', n: '뒤따른다', d: '다음 3개 방 동안 받는 직접 피해 −10%, 주는 피해 −10%.' }, { id: 'block', n: '길을 막는다', d: '다음 전투에 무덤지기 하나가 더해지고, 이기면 골드 30.' }] },
  { id: 'master', ch: 2, n: '잊힌 스승의 묘비', lore: '비문이 당신의 손버릇을 적고 있다.', opts: [{ id: 'read', n: '비문을 읽는다', d: '연 트리 칸 하나를 되돌려 포인트를 돌려받습니다(가장 아래 줄의 칸부터).' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'robber', ch: 2, n: '도굴꾼의 시체', lore: '자루 끈이 아직 손에 감겨 있다.', opts: [{ id: 'loot', n: '자루를 뒤진다', d: '골드 30 또는 장비 하나. 다음 전투를 중독 3으로 시작합니다.' }, { id: 'bury', n: '묻어 준다', d: '생명력 플라스크 +1.' }] },
  { id: 'blackwell', ch: 2, n: '검은 샘', lore: '물이 비추는 얼굴이 내 것이 아니다.', opts: [{ id: 'drink', n: '마신다', d: '정화 · 스태미나 플라스크 각 +1. 다음 전투를 취약 2를 안고 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonepipe', ch: 2, n: '뼈 피리', lore: '불지 않았는데 소리가 난다. 아래에서 무언가 대답한다.', opts: [{ id: 'blow', n: '분다', d: '다음 층 문에 강적이 반드시 나옵니다. 골드 20.' }, { id: 'pass', n: '지나친다', d: '' }] },
);
/* 경험치 곡선 Lv16까지 (12.2절: 2챕터 끝 Lv10, 3챕터 끝 Lv15) */
LV_XP.push(2550, 2900, 3270);

/* 2챕터 강적 다섯 · 보스 (10월 5일). 무엇을 하는지와 대처는 비공개 문서에만 적는다. upper: 0이면 하층에만 */
STRONG_FOES.push(
  { id: 'collector', ch: 2, n: '뼈 수집가', en: [['bruiser', 1], ['skeleton'], ['skeleton']], dmg: 0.85 }, // 10월 7일: 호위 해골 둘이 함께 때려 평소 공격을 낮췄다
  { id: 'knight', ch: 2, n: '저주받은 기사', en: [['shield', 1], ['hexer']], hp: 1.1, dmg: 0.9, needs: ['hexer'] },
  { id: 'well', ch: 2, n: '역병 우물지기', en: [['healer', 1], ['shield'], ['skeleton']], hp: 0.8, dmg: 0.6 },
  { id: 'sexton', ch: 2, n: '굴 파는 묘지기', en: [['burrower', 1], ['skeleton'], ['skeleton']], hp: 0.9, upper: 0 },
  { id: 'echo', ch: 2, n: '메아리 망령', en: [['bruiser', 1], ['hexer']], hp: 0.85, upper: 0, needs: ['hexer'] },
);
Object.assign(FOE_X, {
  collector: { pick: 2, cap: 5, base: 0.38, per: 0.02 },
  knight: { share: 0.5 },
  well: { spray: 3, base: 0.10, per: 0.025 },
  sexton: { aoe: 1.5, vuln: 2, brk: 1.5, chill: 1 },
  echo: { mirror: 0.8, first: 0.5, cap: 0.35, capFirst: 0.25 },
});
const LORD = { gHp: 1, gDmg: 0.35, read: 6, turns: 2, cut: 0.4, cut2: 0.2, ph: [0.6, 0.3], walls: 1, wallHp: 0.10, wallBrk: 60, wallAoe: 0.5, expose: 2, mendPile: 1.0, mendBare: 0, mendTop: 0.5, hand: 0.85, handChill: 1, fall: 0.08, guards: 1 } /* 10월 7일 · 8일: 군주 몇 값을 낮췄다(21갈래 모두 0승, 사냥꾼 연사 Lv7 이길 수단 없음(35%)이라. 내용은 비공개 문서) */ // 지하묘지의 군주 (뜻은 비공개 문서)
Object.assign(FOE_INTRO, {
  cryptlord: { n: '지하묘지의 군주', lore: '이 지하묘지에 처음 묻힌 왕. 아직도 신하들의 이름을 부른다.', see: ['벽마다 이름이 새겨져 있다. 맨 아래 줄에 갓 새긴 자국이 있다.', '군주의 발치에서 해골 둘이 일어선다.'] },
  collector: { n: '뼈 수집가', lore: '바구니 가득 뼈를 진 자. 남의 뼈로 제 몸을 덮는다.', see: ['수집가가 해골들 뒤에서 바닥을 훑는다. 등의 바구니가 덜그럭거린다.'] },
  knight: { n: '저주받은 기사', lore: '녹슨 갑옷 틈마다 검은 실이 비어져 나온다.', see: ['기사가 방패를 든다. 방패 안쪽에 이름이 빼곡하다.'] },
  well: { n: '역병 우물지기', lore: '우물 뚜껑을 등에 지고 다니는 자. 뚜껑 아래에서 물이 끓는다.', see: ['우물지기가 국자를 든다. 국자에서 초록 물이 떨어진다.'] },
  sexton: { n: '굴 파는 묘지기', lore: '삽 한 자루로 이 묘지를 다 판 자.', see: ['묘지기가 삽을 바닥에 꽂는다. 발밑이 흔들린다.'] },
  echo: { n: '메아리 망령', lore: '얼굴이 없다. 당신이 움직이면 그것도 움직인다.', see: ['망령이 고개를 기울인다. 당신의 칼끝을 따라 눈이 움직인다.'] },
});
Object.assign(CODEX, {
  collector: { pick: '수집가가 뼈를 주울수록 몸이 단단해졌다.', shatter: '수집가가 무너지자 몸에 두른 뼈가 흩어졌다.' },
  knight: { ret: '기사에게 건 것이 나에게 돌아왔다.', stop: '기사가 자세를 잃자 돌려보내던 것이 멈췄다.' },
  well: { open: '우물이 열리자 몸속의 독이 한꺼번에 끓어올랐다.', spent: '우물이 열린 뒤 독이 모두 빠져나갔다.' },
  sexton: { under: '묘지기가 땅속에 있는 동안 칼이 닿지 않았다.', exposed: '솟구친 묘지기는 잠시 몸을 드러냈다.' },
  echo: { mirror: '망령이 내 공격을 되비췄다. 내가 세게 칠수록 되비친 것도 셌다.', cut: '본뜨던 망령이 무너지자 되비추지 못했다.' },
  cryptlord: { carve: '군주가 이름을 새긴 행동은 한동안 힘이 빠졌다.', throne: '군주가 옥좌로 물러나자 뼈벽이 앞을 가렸다.', mend: '무너진 벽이 다시 쌓였다. 바닥의 뼈가 줄었다.', fall: '옥좌가 무너지자 흩어지지 않은 뼈가 한꺼번에 일어섰다.', twoname: '마지막에는 두 이름을 한꺼번에 새겼다.', carvebreak: '군주가 무너지자 새긴 이름이 흐려졌다.' },
});

/* ===== 3챕터: 재의 사막 유적 (10월 7일, docs/챕터/3챕터.md. 강적 · 보스의 기믹과 대처는 비공개 문서) =====
   틀은 1 · 2챕터와 같다(24층, 12:12, 갈래길). 이 칸은 1챕터 배열에 ch: 3 항목을 더하고 CHAPTERS[3]을 채운다. 수치는 모두 [가설] */
ENEMY_NAMES[3] = { bruiser: '사막 약탈자', shield: '유적 근위병', archer: '모래 궁수', healer: '재의 무녀', summoner: '모래 부르는 자', pyre: '태양 영창자', minion: '재 인형', thief: '무덤 도굴꾼', darkmage: '검은 해의 주술사', skeleton: '불탄 해골', lurker: '모래 잠복자', ember: '불씨 투척병', wrapped: '붕대 감긴 망자', mirage: '아지랑이 술사', crown: '재의 왕관', maid: '재의 시녀' };
/* 해의 흐름 (1.2절): 띠마다 층 이름과 들어설 때 한 줄. 특성 무게는 MOD3 */
const BANDS3 = [
  { to: 6, n: '불탄 성벽', line: '검은 해가 지평선에 걸려 있다. 모래가 아직 차다.' },
  { to: 11, n: '무너진 시장', line: '그림자가 발밑으로 숨는다. 공기가 일렁인다.' },
  { to: 12, n: '오아시스 야영지', line: '물 위에 재가 떠 있다. 그래도 물이다.' },
  { to: 18, n: '왕의 묘실', line: '같은 얼굴이 두 번 보인다.' },
  { to: 23, n: '유리 사원', line: '모래가 별을 가린다. 어둠 속에서 모래가 숨을 쉰다.' },
  { to: 24, n: '재의 왕좌', line: '재가 눈처럼 내린다. 왕좌가 따뜻하다.' },
];
CHAPTERS[3] = {
  n: '재의 사막 유적', boss: 'queen', names: ENEMY_NAMES[3], strongFrom: 3, xp: 1.9, gold: 2.1, settleStrong: 45, bands: BANDS3,
  diff: { upper: { hp: 0.50, dmg: 0.66 }, lower: { hp: 0.62, dmg: 0.68 } }, // 3.1절 [가설]: 1챕터와 같은 체감에서 출발
  modChance: { upper: 0.35, lower: 0.55 }, roomW: { normal: 40, ambush: 19, trial: 5, shrine: 5 }, roomMax: { ambush: 6 }, // 흔들리는 문은 넣지 않았다(만든 사람이 정할 것 1). 그 무게는 매복 · 시련에 나눴다
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
const FIRE_AFFIX = { hit: 1, heavy: 2, from: 15 };   // 정예 접사 화염 강화
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
  noon: { from: 9, band: [[11, 3], [18, 1.5]], path: { rough: 1.5, quiet: 0.5 } },
  haze: { from: 13, band: [[18, 3]] },
  sandstorm: { from: 19, band: [[23, 1.5]] },
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
  { id: 'sandtrap', ch: 3, n: '모래 웅덩이', w: 1.1, from: 2, up: [['lurker'], ['bruiser']], low: [['lurker', 1], ['lurker'], ['archer']], vary: [2, ['archer', 'bruiser']] },
  { id: 'tomb', ch: 3, n: '묘실 파수', w: 1.0, from: 5, up: [['wrapped'], ['healer']], low: [['wrapped', 1], ['wrapped'], ['healer']], vary: [1, ['healer', 'shield']] },
  { id: 'firebrand', ch: 3, n: '불 지르는 행렬', w: 1.1, press: 1, from: 7, up: [['bruiser'], ['ember']], low: [['bruiser', 1], ['shield'], ['ember']], vary: [0, ['bruiser', 'wrapped']] },
  { id: 'hunt3', ch: 3, n: '사막 사냥패', w: 0.9, press: 1, from: 9, up: [['lurker'], ['archer'], ['archer']], low: [['lurker', 1], ['archer'], ['archer']], vary: [0, ['lurker', 'minion']] },
  { id: 'robbers3', ch: 3, n: '도굴꾼 떼', w: 0.8, from: 9, up: [['thief'], ['thief'], ['lurker']], low: [['thief'], ['thief', 1], ['lurker']], vary: [2, ['lurker', 'archer']] },
  { id: 'ashrite', ch: 3, n: '재 의식', w: 1.1, press: 1, from: 13, up: null, low: [['shield'], ['darkmage', 1], ['ember']], vary: [0, ['bruiser', 'shield']] },
  { id: 'sunchant', ch: 3, n: '태양 영창', w: 1.0, from: 13, up: null, low: [['shield', 1], ['pyre'], ['healer']], vary: [2, ['healer', 'ember']] },
  { id: 'mirages', ch: 3, n: '신기루 행렬', w: 1.0, from: 14, up: null, low: [['bruiser', 1], ['bruiser'], ['mirage']], vary: [1, ['bruiser', 'thief']] },
  { id: 'bones3', ch: 3, n: '불탄 해골 순찰', w: 0.7, from: 13, up: null, low: [['skeleton', 1], ['summoner'], ['skeleton']], vary: [2, ['minion', 'ember']] }, // 10월 7일: 해골 둘 + 소환사는 쓰러짐 43%라 셋째 칸이 하수인 · 투척병으로 바뀔 수 있다
);
ENC.treasure3 = [[['shield', 1], ['bruiser']], [['bruiser', 1], ['archer']], [['archer', 1], ['shield']]];
/* 가르치는 순서 (5절): 혼자 처음 나오는 층(그 층에서 놓치면 다음 층에 한 번 더). 역할은 그 무리로, 특성(noon · haze)은 그 특성을 붙인 방으로 */
const NEWR3 = ['lurker', 'ember', 'wrapped', 'mirage', 'haze'];
const INTRO_AT3 = { lurker: 2, wrapped: 5, ember: 7, noon: 9, haze: 13, mirage: 14 };
const INTRO_SQ3 = { lurker: 'sandtrap', wrapped: 'tomb', ember: 'firebrand', noon: 'zeal3', mirage: 'mirages' };
const FIRST_GIFT3 = { lurker: 'tamper', ember: 'coldwater', wrapped: 'oiljar', mirage: 'mirror', haze: 'mirror', noon: 'awning' }; // 처음 만난 방을 이기면 그 상황을 푸는 소모품 하나 (5.1절 5번)
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
  { id: 'scale', chs: [3], n: '유리 저울', d: '최대 생명력 3%를 바치고(이 캐릭터가 끝날 때까지) 능력치 1점을 받습니다.' },
);
/* 이벤트 여덟 (11.1절, 3챕터). "다음 전투"는 다음 일반 · 매복 전투다(강적 · 보스 · 시련 방은 건너뛴다) */
EVENTS.push(
  { id: 'camel', ch: 3, n: '쓰러진 낙타', lore: '짐 끈이 모래에 반쯤 묻혀 있다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '소모품 셋. 대신 다음 전투를 화상 2로 시작합니다.' }, { id: 'bury', n: '묻어 준다', d: '선인장 수액 하나.' }] },
  { id: 'oasis', ch: 3, n: '신기루 속 샘', lore: '물빛이 흔들린다. 가까이 가도 사라지지 않는다.', opts: [{ id: 'drink', n: '마신다', d: '반반 확률로 생명력 30%를 회복하거나, 다음 전투를 둔화 2로 시작합니다.' }, { id: 'fill', n: '물을 담는다', d: '찬물 한 병.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'sundial', ch: 3, n: '왕의 해시계', lore: '바늘의 그림자가 아직 움직인다.', opts: [{ id: 'turn', n: '바늘을 돌린다', d: '다음 층 문 셋의 보상이 모두 보입니다. 대신 다음 전투에 작열하는 한낮이 붙고 열기 50에서 시작합니다.' }, { id: 'hasten', n: '해를 앞당긴다', d: '다음 층 문에 강적이 반드시 나오고 골드 25.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'archive', ch: 3, n: '불타는 서고', lore: '책장이 타는 냄새에 오래된 잉크 냄새가 섞인다.', opts: [{ id: 'pull', n: '불 속에서 책을 꺼낸다', d: '능력치 1점. 대신 다음 전투를 화상 4로 시작합니다.' }, { id: 'sweep', n: '재를 쓸어 담는다', d: '골드 25.' }] },
  { id: 'names', ch: 3, n: '재 속의 이름', lore: '재 위에 낯익은 이름이 적혀 있다.', opts: [{ id: 'call', n: '이름을 부른다', d: '이 브라우저에서 쓰러진 내 캐릭터 이름 하나가 보이고, 골드를 받습니다(그 캐릭터의 레벨 × 4, 최대 40). 기록이 없으면 골드 10입니다.' }, { id: 'cover', n: '재를 덮어 준다', d: '다음 3개 방 동안 받는 직접 피해 −5%.' }] },
  { id: 'glass', ch: 3, n: '유리 사막', lore: '녹았다 굳은 땅이 햇빛을 되쏜다.', opts: [{ id: 'take', n: '유리를 줍는다', d: '희귀 장비 하나. 대신 다음 전투를 출혈 3으로 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'buried', ch: 3, n: '묻힌 문', lore: '모래 아래로 문틀 윗부분만 보인다.', opts: [{ id: 'dig', n: '판다', d: '스태미나 50을 씁니다. 반반 확률로 다음 층 문 하나가 보물 방이 되거나, 다음 전투가 모래 매복이 됩니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'herald', ch: 3, n: '여왕의 전령', lore: '재로 된 망토를 두른 자가 길을 막고 고개를 숙인다.', opts: [{ id: 'kneel', n: '무릎 꿇는다', d: '다음 4개 방 동안 받는 화상 피해 0, 주는 피해 −5%.' }, { id: 'draw', n: '칼을 뽑는다', d: '다음 일반 · 매복 전투에 화염 강화 정예 약탈자가 더해지고, 이기면 희귀 장비.' }] },
);
/* 3챕터 강적 다섯 · 보스 (14 · 15절). 무엇을 하는지와 대처는 비공개 문서에만 적는다. from: 나오는 첫 층, upper: 0이면 하층에만, needs: 먼저 만나야 하는 것 */
STRONG_FOES.push(
  { id: 'stalker', ch: 3, n: '모래 속 사냥꾼', en: [['lurker', 1], ['archer'], ['bruiser']], hp: 0.9, from: 3, needs: ['lurker'] },
  { id: 'colossus', ch: 3, n: '녹은 유리 거상', en: [['bruiser', 1]], hp: 1.2, from: 5 },
  { id: 'reaper', ch: 3, n: '불씨 수확자', en: [['bruiser', 1], ['ember']], dmg: 0.75, from: 8, needs: ['ember'] }, // 10월 7일: 평소 0.9 → 0.75, 호위 약탈자를 뺐다 (쓰러짐 44 → 57 → 31%)
  { id: 'sundial', ch: 3, n: '해시계 사제', en: [['healer', 1], ['shield'], ['bruiser']], dmg: 0.6, from: 13, upper: 0 }, // 10월 7일: 후열에서 늘 때려 0.8 → 0.6 (쓰러짐 63%)
  { id: 'dancer', ch: 3, n: '아지랑이 무희', en: [['bruiser', 1], ['archer']], hp: 0.8, dmg: 0.85, from: 15, upper: 0, needs: ['haze'] }, // 10월 7일: 허상으로 싸움이 길어 체력 0.8 · 평소 0.85 (쓰러짐 50%, 표본 작음)
);
Object.assign(FOE_X, { // 뜻은 비공개 문서
  stalker: { aoeReveal: 2, surgeBleed: 3, exposedTaken: 0.3, parryRest: 2 },
  colossus: { heatMax: 3, pourIgn: 3, crackVuln: 2, crackBrk: 40, spd: 0.7 },
  reaper: { death: 2, cap: 6, base: 0.30, add: 0.025 },
  sundial: { clock: 6, noon: 0.28, noonEmp: 2, brkBack: 3, lowAt: 2, lowBack: 1, bellBack: 2, glassBack: 2 },
  dancer: { haze: 2, hit: 0.11, capTot: 0.35 }, // 10월 7일: 분신 3겹은 쓰러짐 45~53%(한 적 공격 직업이 한 바퀴마다 세 번을 헛쳤다)라 2겹
});
const QUEEN = { brk: 180, heat0: 20, rise: [8, 10, 12], hiddenX: 2, ash: 10, breath: 0.5, ignTick: 2, chant: 25, enrageRise: 20, enrageFloor: 50, crownHp: 0.08, crownHit: 6, crownRoundCap: 24, crownBreak: 40, crownRegrow: 3, crownGrow: 1.5, breakHeat: 30, shock: 10, storm: 0.26, stormWeak: 2, stormIgn: 2, stormReset: 30, p3StormSelf: 0.06, p3SelfMax: 3, maidHp: 0.05, maidMax: 2, maidBack: 2, maidHit: 0.5, surge: 3, surgeBleed: 2, p2Cycle: 4, ph: [0.7, 0.35], p2Heat: 10, p3Heat: 40, enrage: 50 }; // 재의 여왕 (뜻은 비공개 문서)
Object.assign(FOE_INTRO, {
  queen: { n: '재의 여왕', lore: '불타는 왕국을 재로 굳혀 지킨 자. 아직도 해가 지지 않기를 기다린다.', see: ['왕좌의 재가 사람 모양으로 일어선다. 재 속에서 당신의 이름이 반짝인다.', '공기가 뜨거워진다.'] },
  stalker: { n: '모래 속 사냥꾼', lore: '발자국이 앞에서 끊기고, 뒤에서 다시 시작된다.', see: ['모래가 한 번 크게 일렁인다. 무언가 그 아래를 지나간다.'] },
  colossus: { n: '녹은 유리 거상', lore: '사원의 유리창이 녹아 사람 모양으로 굳었다.', see: ['거상의 몸속에서 붉은 빛이 천천히 차오른다.'] },
  reaper: { n: '불씨 수확자', lore: '낫 끝에 꺼지지 않는 불씨가 매달려 있다.', see: ['수확자가 낫을 들어 올린다. 주변의 불꽃이 그쪽으로 기운다.'] },
  sundial: { n: '해시계 사제', lore: '그림자의 길이로 남은 시간을 재는 자.', see: ['사제 뒤의 해시계에 숫자가 새겨져 있다. 그림자가 한 칸씩 짧아진다.'] },
  dancer: { n: '아지랑이 무희', lore: '춤이 끝나기 전에는 몇 명인지 셀 수 없다.', see: ['무희가 한 바퀴 돌자 윤곽이 셋으로 번진다.'] },
});
Object.assign(CODEX, {
  stalker: { hide: '모래 속에서는 칼이 닿지 않았다.', startle: '넓게 휘두른 공격에 두 번 맞자 모래 위로 튀어나왔다.', exposed: '솟구친 뒤에는 한동안 모래 위에서 숨을 골랐다.' },
  colossus: { heat: '달아오를수록 닿는 곳마다 데었다.', crack: '식은 유리에 금이 갔다.', pour: '붉은 빛이 가득 차자 녹은 유리가 쏟아졌다.' },
  reaper: { reap: '낫이 불꽃을 거두어 갔다. 거둔 만큼 낫이 무거웠다.', ember: '불붙은 채 쓰러진 것의 불씨가 낫으로 날아들었다.', scatter: '수확자의 자세가 무너지자 불씨가 흩어졌다.' },
  sundial: { noon: '해시계의 그림자가 사라지는 순간 빛이 내리꽂혔다.', stall: '얼어붙은 동안 해시계의 그림자가 움직이지 않았다.', shadow: '사제가 비틀거리자 그림자가 다시 길어졌다.' },
  dancer: { copies: '칼에 맞은 것은 윤곽뿐이었다.', dance: '남은 윤곽의 수만큼 춤이 길었다.', sweep: '넓게 휘두르자 윤곽이 한꺼번에 흩어졌다.' },
  queen: { heat: '공기가 뜨거워질수록 재가 무겁게 내려앉았다.', crown: '왕관을 칠 때마다 열기가 가라앉았다.', crownbreak: '왕관이 깨지자 여왕이 휘청였다.', storm: '열기가 가득 차자 재폭풍이 몰아쳤다.', fire: '불길이 여왕에게 스며들자 공기가 더 뜨거워졌다.', sand: '여왕이 모래에 잠긴 동안 열기가 더 빨리 올랐다.', chant: '시녀의 노래가 끝나자 열기가 치솟았다.', melt: '왕관이 녹아내린 뒤로 여왕도 자신의 불에 타들어 갔다.' },
});
