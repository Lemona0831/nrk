/* 나락의 유산 데이터: 던전과 갈림길 (기획서 11.3절)
   한 챕터 = 상층 1~8층, 9층 야영지, 하층 10~17층, 18층 샘, 19층 보스. 값만 둔다. */
const FLOORS = 19;
const FLOOR_CAMP = 9, FLOOR_SPRING = 18, FLOOR_BOSS = 19;
const isLower = f => f >= 10;

/* 방 유형: w 가중치, max 챕터당 최대, from 나오는 첫 층, fight 전투 방 */
const ROOM_TYPES = {
  normal: { n: '일반', ico: '⚔️', w: 40, max: 99, from: 1, fight: 1, risk: 1, gold: [10, 15], hint: '장비 1' },
  ambush: { n: '매복', ico: '🗡️', w: 8, max: 3, from: 2, fight: 1, risk: 2, gold: [15, 22], hint: '적이 먼저 움직인다 · 골드 많음' },
  strong: { n: '강적', ico: '💀', w: 10, max: 4, from: 3, fight: 1, risk: 3, gold: [30, 30], hint: '고급 이상 장비' },
  treasure: { n: '보물', ico: '🗝️', w: 9, max: 3, from: 1, fight: 1, risk: 2, gold: [25, 25], hint: '상자: 장비 둘 중 하나, 희귀 보장' },
  trial: { n: '시련', ico: '🔥', w: 5, max: 2, from: 5, fight: 1, risk: 4, gold: [40, 40], hint: '방 특성 둘 · 희귀 장비' },
  spring: { n: '샘', ico: '💧', w: 8, max: 2, from: 3, fight: 0, risk: 0, hint: '생명력·마나 50%, 플라스크 각 1' },
  shrine: { n: '성소', ico: '🕯️', w: 7, max: 3, from: 1, fight: 0, risk: 0, hint: '3개 방 동안 버프' },
  altar: { n: '제단', ico: '🩸', w: 6, max: 3, from: 2, fight: 0, risk: 0, hint: '대가 있는 거래' },
  event: { n: '이벤트', ico: '❔', w: 7, max: 4, from: 2, fight: 0, risk: 0, hint: '선택에 따라 다르다' },
};
/* 강적은 상층 2, 하층 2까지 */
const STRONG_PER_HALF = 2;

/* 방 특성: 전투 방에 상층 25%, 하층 45%. 시련은 둘 */
const ROOM_MODS = {
  narrow: { n: '좁은 회랑', d: '전열에 적이 2기까지만 선다. 나머지는 후열이다.' },
  ceiling: { n: '무너지는 천장', d: '시간이 4번 흐를 때마다 모두에게 피해 4.' },
  holy: { n: '성수 웅덩이', d: '시간이 흐를 때마다 모두 생명력 1% 회복.' },
  candle: { n: '촛불 제단', d: '모든 점화 피해 +50%.' },
  bloodpool: { n: '피 웅덩이', d: '모든 출혈 피해 2배.' },
  bell: { n: '종소리', d: '적 속도 +10%. 이 방의 골드 +50%.' },
  dark: { n: '어둠', d: '후열 적의 예고가 보이지 않는다.' },
  calm: { n: '고요', d: '마나 자연 회복 2배.' },
};
const MOD_CHANCE = { upper: 0.25, lower: 0.45 };

/* 적 구성 틀 ([역할, 정예]) */
const ENC = {
  upper: [
    [['bruiser'], ['bruiser']], [['bruiser'], ['archer']], [['shield'], ['healer']], [['shield'], ['shield'], ['healer']],
    [['bomber'], ['bomber'], ['bruiser']], [['summoner'], ['minion'], ['minion']], [['bruiser'], ['healer']], [['archer'], ['archer'], ['bruiser']],
    [['shield'], ['archer']], [['bomber'], ['shield']], [['summoner'], ['bruiser']], [['bruiser', 1]],
  ],
  lower: [
    [['bruiser', 1], ['archer']], [['shield', 1], ['healer'], ['bruiser']], [['archer', 1], ['archer'], ['bomber']], [['summoner'], ['minion'], ['minion'], ['healer']],
    [['bruiser'], ['bruiser'], ['healer', 1]], [['shield', 1], ['bomber'], ['bomber']], [['bruiser', 1], ['summoner']], [['archer'], ['shield'], ['healer']],
    [['bomber', 1], ['bruiser']], [['shield'], ['archer', 1], ['minion']], [['bruiser'], ['bruiser'], ['archer']], [['healer'], ['shield'], ['bruiser', 1]],
  ],
  treasure: [[['shield', 1], ['bruiser']], [['bruiser', 1], ['archer']], [['archer', 1], ['shield']]],
};
/* 강적 (자리만 먼저. 고유 규칙은 단계 8에서 비공개 문서대로 넣는다) */
/* 강적 공통 배율과 고유 수치 (11.8절). 일반 방보다 확실히 어렵게 (10월 2일 만든 사람 요청) */
const STRONG = { hp: 2.1, dmg: 1.3, bellEvery: 3, leech: 0.45, frenzy: 1.3, lowerHp: 1.3, lowerDmg: 1.15 }; // 하층 강적만 더: 무작위 시험 하층 순례자 40%대(만든 사람 요청) // 무작위 시험: 상층 승률 94%(남은 생명력 60%), 하층 76~82%(약 50%). 일반 방은 95~98%(65~83%)
const STRONG_FOES = [
  { id: 'bellringer', n: '종지기', en: [['shield', 1], ['bruiser'], ['minion']] },
  { id: 'pilgrim', n: '굶주린 순례자', en: [['bruiser', 1]] },
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
  { id: 'confess', n: '버려진 고해실', lore: '휘장 너머에서 누군가 숨을 고른다.', opts: [{ id: 'do', n: '고해한다', d: '약화·취약 3T를 안고 다음 전투에 들어가는 대신 희귀 장비 하나.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'pilgrim', n: '쓰러진 순례자', lore: '짐 보따리가 아직 따뜻하다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '장비 하나. 대신 다음 전투에 중독 3.' }, { id: 'pray', n: '기도한다', d: '생명력 플라스크 +1.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'reliquary', n: '잠긴 성물함', lore: '녹슨 자물쇠가 손을 기다린다.', opts: [{ id: 'force', n: '억지로 연다', d: '스태미나 40을 쓰고 골드 30 또는 고급 장비.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'chalice', n: '피 묻은 성배', lore: '잔 바닥에 검붉은 것이 고여 있다.', opts: [{ id: 'drink', n: '마신다', d: '최대 생명력 +5(영구), 지금 생명력 −15%.' }, { id: 'spill', n: '쏟는다', d: '마나 플라스크 +1.' }] },
  { id: 'candle', n: '속삭이는 촛불', lore: '불꽃이 이름을 부른다.', opts: [{ id: 'snuff', n: '불을 끈다', d: '다음 3개 방 동안 받는 점화 피해 0, 대신 주는 피해 −5%.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'library', n: '무너진 서고', lore: '젖은 책장 사이로 글자가 번진다.', opts: [{ id: 'read', n: '책을 읽는다', d: '능력치 1점.' }, { id: 'sell', n: '책을 챙긴다', d: '골드 20.' }] },
  { id: 'monk', n: '굶주린 수도사', lore: '뼈만 남은 손이 소매를 붙든다.', opts: [{ id: 'feed', n: '먹을 것을 준다', d: '플라스크 하나(가장 많이 찬 것)를 비우고, 다음 전투 방에서 장비 하나 더.' }, { id: 'chase', n: '내쫓는다', d: '다음 전투에 굶주린 수도사(돌격병)가 더해지고, 이기면 골드 20.' }] },
  { id: 'bell', n: '종탑의 줄', lore: '줄 끝이 아래로, 아래로 이어진다.', opts: [{ id: 'pull', n: '당긴다', d: '다음 층 문에 강적이 반드시 나온다. 골드 15.' }, { id: 'pass', n: '지나친다', d: '' }] },
];

/* ===== 성장과 적 (기획서 11.4절, 11.8절) ===== */
/* 몬스터 레벨: 1챕터 1~4. 레벨마다 체력 +12%, 피해 +10% */
const MLV_HP = 0.12, MLV_DMG = 0.10;
/* 난이도 (10월 2일, 만든 사람 결정: 1챕터 완주 자동 테스터 평균 20%, 숙련·탐험가 40%. 1층부터 실전) 던전 방의 적 체력·피해 배율 */
const DIFF = { upper: { hp: 1.3, dmg: 1.3 }, lower: { hp: 1.1, dmg: 0.95 } }; // 상층은 1층부터 거세게. 하층은 몬스터 레벨이 이미 높아 덜 올린다
function mlvOf(f) { return f >= FLOOR_BOSS ? 4 : f <= 4 ? 1 : f <= 8 ? 2 : f <= 13 ? 3 : 4; }
/* 경험치: 일반 5, 정예 12, 강적 30, 보스 100 × (1 + 0.15 × (몬스터 레벨 − 1)). 소환된 적은 0 */
const XP_BASE = { normal: 5, elite: 12, strong: 30, boss: 100 }; // 보스 150이면 챕터 끝 Lv6으로 목표(4~5)를 넘어 100으로 (10월 2일)
/* 보스에서 오른 능력치는 다음 챕터 준비에서 나눈다(run.statPending, 단계 9) */
const XP_LV = 0.15;
/* 레벨 n이 되는 데 필요한 누적 경험치 (LV_XP[n-1]) */
const LV_XP = [0, 40, 100, 180, 300, 470, 660, 870, 1100, 1350, 1620, 1910, 2220]; // 1챕터를 무작위 길로 끝까지 가면 Lv5 안팎 (10월 2일 8판 시험)
const LV_POINTS = 2;
/* 정예 접사 "강인": 체력 +50% (4.6절 1막 접사). 정예에게 상층 35%, 하층 60% */
const TOUGH_CHANCE = { upper: 0.35, lower: 0.6 };
/* 1챕터(저주받은 수도원) 적 이름. 역할은 카드에 작게 함께 보인다 */
const ENEMY_NAMES = {
  1: { bruiser: '광신 수도사', shield: '문지기 수사', archer: '종탑 궁수', healer: '피 닦는 수녀', summoner: '뼈 부르는 사제', bomber: '불붙은 고행자', minion: '일어선 시체' },
};

/* ===== 강적과 보스: 처음 만날 때 "눈에 보이는 것", 겪은 뒤 도감 (기획서 11.9절) =====
   여기에는 대처법을 쓰지 않는다. 기믹 상세는 저장소 밖 비공개 문서에 있다 */
const FOE_INTRO = {
  abbot: { n: '타락한 수도원장', lore: '제단 앞에서 등을 돌린 채, 아직도 누군가의 고해를 기다린다.', see: ['수도원장이 낡은 성서를 펼친다. 손가락이 당신의 이름 위에서 멈춘다.'] },
  bellringer: { n: '종지기', lore: '줄을 놓지 않는 손. 종은 아직 울리지 않았다.', see: ['뒤쪽에 큰 종이 매달려 있다. 종지기가 줄을 감아쥔다.'] },
  pilgrim: { n: '굶주린 순례자', lore: '먼 길을 걸어온 자. 이제 무엇을 먹어도 배가 부르지 않다.', see: ['순례자가 입가를 훔친다. 손등에 마른 피가 묻어 있다.'] },
};
/* 도감: 처음 겪은 일만 적힌다 (결과만, 대처법은 플레이어 메모) */
const CODEX = {
  abbot: { brand: '죄를 읽으면 낙인이 남는다. 낙인이 쌓인 채 내리치는 강타는 더 아프다.', vow: '입을 다문 동안에는 공격하지 않고 상처를 다스린다. 그동안 직접 공격은 덜 들어간다.', vowbreak: '입을 다문 채 자세가 무너지면 서원이 깨지고 빈틈이 드러난다.', monks: '쓰러지기 직전, 제단에서 수도사들이 일어나 수도원장을 돌본다.' },
  bellringer: { ring: '종이 울리면 적들이 서두른다.', bellbreak: '큰 종이 부서지면 종지기가 비틀거리고, 종은 더 울리지 않는다.' },
  pilgrim: { leech: '맞힐 때마다 피를 마시며 상처를 메운다.', frenzy: '반쯤 쓰러지면 더 빨라진다.', rot: '쓰러질 때 썩은 기운이 퍼져, 다음 방까지 몸에 남는다.' },
};
