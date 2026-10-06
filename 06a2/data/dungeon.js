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
  spring: { n: '샘', ico: '💧', w: 2, max: 2, from: 3, fight: 0, risk: 0, hint: '생명력 50%, 플라스크 각 1' },
  shrine: { n: '성소', ico: '🕯️', w: 6, max: 3, from: 1, fight: 0, risk: 0, hint: '3개 방 동안 버프' },
  altar: { n: '제단', ico: '🩸', w: 5, max: 3, from: 2, fight: 0, risk: 0, hint: '대가 있는 거래' },
  event: { n: '이벤트', ico: '❔', w: 7, max: 5, from: 2, fight: 0, risk: 0, hint: '선택에 따라 다르다' },
};
/* 방 골드 (10월 4일 경제 맞춤): 24층이 되어 깬 캐릭터의 정산이 평균 464(목표 약 320)라 방 골드를 30%쯤 낮췄다. 정산 평균 368, 험한 길 위주 478, 샛길 위주 313 */
/* 강적은 상층 3, 하층 3까지 */
const STRONG_PER_HALF = 3;
/* 문에 보상이 적혀 있지 않을 확률 (전투 방). 10월 4일 만든 사람 결정: 보상은 일부만 보인다 */
const HIDE_REWARD = 0.45;

/* 갈래길 (10월 4일 만든 사람 결정): 방과 방 사이에서 길을 고른다. 고른 길은 다음 갈래길까지 이어지고, 층마다 문 셋을 고르는 것은 그대로다.
   hp · dmg: 적 배율, loot: 전리품 확률 배율, gold: 방 골드 배율, up: 방에서 얻는 장비 등급이 한 단계 오를 확률(음수면 내려갈 확률), risk: 문 위험도(★) 더하기, w: 문 종류 가중치 배율 */
const PATH_AT = [4, 8, 13, 17, 21]; // 이 층의 문을 열기 전에 길을 고른다(1~3층은 큰 길)
const PATHS = {
  rough: { n: '험한 길', ico: '⛰️', hp: 1.15, dmg: 1.12, loot: 1.5, gold: 1.3, up: 0.35, risk: 1, w: { strong: 1.6, ambush: 1.5, trial: 2, treasure: 1.3, spring: 0.5, shrine: 0.6, event: 0.8 }, d: '적이 더 거셉니다. 강적 · 매복 · 시련 문이 자주 나옵니다. 전리품과 골드가 많고, 장비 등급이 자주 한 단계 오릅니다.' },
  main: { n: '큰 길', ico: '🛤️', hp: 1, dmg: 1, loot: 1, gold: 1, risk: 0, w: {}, d: '평소대로입니다.' },
  quiet: { n: '샛길', ico: '🌿', hp: 0.88, dmg: 0.9, loot: 0.7, gold: 0.75, up: -0.3, risk: -1, w: { strong: 0.4, ambush: 0.5, trial: 0.3, shrine: 1.5, event: 1.4, altar: 1.2, spring: 0.8 }, d: '적이 덜 거셉니다. 쉬는 방 문이 자주 나옵니다. 전리품과 골드가 적고, 장비 등급이 가끔 한 단계 내려갑니다.' },
};

/* 방 특성: 전투 방에 상층 25%, 하층 45%. 시련은 둘 */
const ROOM_MODS = {
  narrow: { n: '좁은 회랑', d: '전열에 적이 2기까지만 선다. 나머지는 후열이다.' },
  ceiling: { n: '무너지는 천장', d: '4라운드마다 모두에게 피해 4.' },
  holy: { n: '성수 웅덩이', d: '라운드가 끝날 때마다 모두 생명력 1% 회복.' },
  candle: { n: '촛불 제단', d: '모든 화상 피해 +50%.' },
  bloodpool: { n: '피 웅덩이', d: '모든 출혈 피해 2배.' },
  bell: { n: '종소리', d: '적 속도 +10%: 라운드에서 대개 나보다 먼저 움직인다. 이 방의 골드 +50%.' },
  dark: { n: '어둠', d: '후열 적의 작은 행동 예고가 보이지 않는다. 큰 공격의 예고는 보인다.' },
  calm: { n: '고요', d: '마나 자연 회복 2배.' },
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
  { id: 'blood', n: '피의 거래', d: '최대 생명력 −5%(이 캐릭터가 끝날 때까지)를 바치고 희귀 장비 하나를 받는다.' },
  { id: 'gold', n: '황금 촛대', d: '골드 40을 바치고 세 플라스크를 하나씩 채운다.' },
  { id: 'offer', n: '바치는 제단', d: '가방의 장비 하나를 바치면 한 등급 위의 장비 하나를 받는다(희귀는 다시 희귀).' },
];

/* 이벤트 (1챕터). 같은 것은 한 챕터에 한 번 */
const EVENTS = [
  { id: 'confess', n: '버려진 고해실', lore: '휘장 너머에서 누군가 숨을 고른다.', opts: [{ id: 'do', n: '고해한다', d: '약화 3 · 취약 3을 안고 다음 전투에 들어가는 대신 희귀 장비 하나.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'pilgrim', n: '쓰러진 순례자', lore: '짐 보따리가 아직 따뜻하다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '장비 하나. 대신 다음 전투에 중독 3.' }, { id: 'pray', n: '기도한다', d: '생명력 플라스크 +1.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'reliquary', n: '잠긴 성물함', lore: '녹슨 자물쇠가 손을 기다린다.', opts: [{ id: 'force', n: '억지로 연다', d: '스태미나 40을 쓰고 골드 30 또는 고급 장비.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'chalice', n: '피 묻은 성배', lore: '잔 바닥에 검붉은 것이 고여 있다.', opts: [{ id: 'drink', n: '마신다', d: '최대 생명력 +5(영구), 지금 생명력 −15%.' }, { id: 'spill', n: '쏟는다', d: '정화 플라스크 +1.' }] },
  { id: 'candle', n: '속삭이는 촛불', lore: '불꽃이 이름을 부른다.', opts: [{ id: 'snuff', n: '불을 끈다', d: '다음 3개 방 동안 받는 화상 피해 0, 대신 주는 피해 −5%.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'library', n: '무너진 서고', lore: '젖은 책장 사이로 글자가 번진다.', opts: [{ id: 'read', n: '책을 읽는다', d: '능력치 1점.' }, { id: 'sell', n: '책을 챙긴다', d: '골드 20.' }] },
  { id: 'monk', n: '굶주린 수도사', lore: '뼈만 남은 손이 소매를 붙든다.', opts: [{ id: 'feed', n: '먹을 것을 준다', d: '플라스크 하나(가장 많이 찬 것)를 비우고, 다음 전투 방에서 장비 하나 더.' }, { id: 'chase', n: '내쫓는다', d: '다음 전투에 굶주린 수도사(돌격병)가 더해지고, 이기면 골드 20.' }] },
  { id: 'bell', n: '종탑의 줄', lore: '줄 끝이 아래로, 아래로 이어진다.', opts: [{ id: 'pull', n: '당긴다', d: '다음 층 문에 강적이 반드시 나온다. 골드 15.' }, { id: 'pass', n: '지나친다', d: '' }] },
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
const STAT_REC = { assassin: { dex: 0.4, int: 0.35, con: 0.25 }, warden: { str: 0.35, con: 0.35, wil: 0.3 }, hunter: { dex: 0.45, con: 0.3, str: 0.25 }, butcher: { str: 0.3, con: 0.3, wil: 0.25, int: 0.15 }, elementalist: { int: 0.45, con: 0.35, wil: 0.2 } }; // 추천 배분 (직업마다)
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
  pilgrim: { n: '굶주린 순례자', lore: '먼 길을 걸어온 자. 이제 무엇을 먹어도 배가 부르지 않다.', see: ['순례자가 입가를 훔친다. 손등에 마른 피가 묻어 있다.'] },
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
  diff: { upper: { hp: 0.75, dmg: 0.60 }, lower: { hp: 0.92, dmg: 0.62 } }, // 2챕터 장비가 생기기 전의 임시 값
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
SHRINES.push({ id: 'rest', chs: [2, 3], n: '안식의 성소', d: '쓰러뜨린 적은 다시 일어서지 않습니다.' }, { id: 'firm', chs: [2, 3], n: '굳건함의 성소', d: '예고된 큰 공격에 받는 피해 −15%.' });
ALTARS.find(a => a.id === 'gold').cost = [40, 60, 90];
ALTARS.push({ id: 'bone', chs: [2], n: '뼈 제단', d: '가방의 소모품 셋을 바치고 2챕터 소모품 둘을 받는다. 파는 것은 바칠 수 없다.' });
/* 이벤트 여덟 (10.3절, 2챕터) */
EVENTS.push(
  { id: 'tomb', ch: 2, n: '이름 없는 묘비', lore: '비석의 맨 윗줄만 비어 있다.', opts: [{ id: 'carve', n: '이름을 새긴다', d: '최대 생명력 +5(영구). 다음 전투를 약화 2 · 취약 2를 안고 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonetrader', ch: 2, n: '뼈 상인', lore: '해골 하나가 좌판 앞에 앉아 있다. 금화는 받지 않는다.', opts: [{ id: 'gear', n: '장비를 넘긴다', d: '가방의 장비 하나를 주고 같은 등급 장비 하나를 받습니다.' }, { id: 'cons', n: '소모품을 넘긴다', d: '소모품 셋을 주고 2챕터 소모품 하나를 받습니다(파는 것은 넘길 수 없습니다).' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'coffin', ch: 2, n: '봉인된 관', lore: '사슬이 안쪽에서 당겨진다.', opts: [{ id: 'break', n: '사슬을 끊는다', d: '절반은 희귀 장비. 아니면 다음 전투에 정예 해골 병사가 더해지고, 이기면 희귀 장비를 받습니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'procession', ch: 2, n: '장례 행렬', lore: '촛불 없는 행렬이 지나간다.', opts: [{ id: 'follow', n: '뒤따른다', d: '다음 3개 방 동안 받는 피해 −10%, 주는 피해 −10%.' }, { id: 'block', n: '길을 막는다', d: '다음 전투에 무덤지기 하나가 더해지고, 이기면 골드 30.' }] },
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
const LORD = { gHp: 1, gDmg: 1, read: 6, turns: 2, cut: 0.4, cut2: 0.2, ph: [0.6, 0.3], walls: 2, wallHp: 0.10, wallBrk: 60, wallAoe: 0.5, expose: 2, mendPile: 1.0, mendBare: 0.5, mendTop: 0.5, hand: 0.85, handChill: 1, fall: 0.08, guards: 2 }; // 지하묘지의 군주 (뜻은 비공개 문서)
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
