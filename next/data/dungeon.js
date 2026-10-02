/* 나락의 유산 데이터: 던전과 갈림길 (기획서 11.3절, 2챕터는 11.12절). 값만 둔다.
   챕터 틀: 층 번호는 모두 여기서 읽는다.
   floors 마지막 층, camp 야영지, spring 고정 샘, boss 보스 층, lower 하층 첫 층,
   mlv 몬스터 레벨 [이 층까지, 레벨]…(그 뒤와 보스는 mlvTop), maxMul 방 유형 최대 개수 배율(내림),
   strongHalf 상층·하층마다 강적 최대, forceAt 샘·강적이 아직 문에 나오지 않았으면 넣는 층 [상층, 하층],
   bossId 챕터 보스(BOSSES), clearLore 정산 화면의 한 줄, goldMul 방 골드 배율,
   restMax 챕터마다 고를 수 있는 쉬는 방(샘·성소·제단·이벤트) 합계. 고정 야영지·샘은 세지 않는다 (10월 2일 만든 사람 결정: 전투를 거의 하지 않고 보스에 닿는 길을 막는다) */
const CHAPTERS = {
  1: { n: '저주받은 수도원', floors: 19, camp: 9, spring: 18, boss: 19, lower: 10, mlv: [[4, 1], [8, 2], [13, 3]], mlvTop: 4, maxMul: 1, strongHalf: 2, forceAt: [6, 14], restMax: 6, bossId: 'abbot', clearLore: '수도원장의 종이 멎었다. 계단은 더 아래로 이어진다.' },
  2: { n: '잊힌 지하묘지', floors: 27, camp: 13, spring: 26, boss: 27, lower: 14, mlv: [[6, 5], [12, 6], [19, 7]], mlvTop: 8, maxMul: 1.5, strongHalf: 3, forceAt: [9, 22], restMax: 9, goldMul: 1.3, bossId: 'cryptlord', clearLore: '녹슨 왕관이 뼈 더미 위로 굴러떨어졌다. 더 깊은 곳에서 뜨거운 모래바람이 불어온다.' }, // 1챕터의 1.5배 (10월 2일 만든 사람 결정)
};
const NEXT_CH_N = { 3: '재의 사막 유적' }; // 아직 열리지 않은 챕터의 이름 (기다리는 화면)
const chOf = ch => CHAPTERS[ch] || CHAPTERS[1];
const isLower = (f, ch) => f >= chOf(ch).lower;

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
/* 챕터당 최대: 위 max × 챕터 배율(내림). 일반은 제한 없음. 강적은 상층·하층마다 chOf(ch).strongHalf까지 */
const roomMax = (t, ch) => ROOM_TYPES[t].max >= 99 ? ROOM_TYPES[t].max : Math.floor(ROOM_TYPES[t].max * chOf(ch).maxMul);

/* 방 특성: 전투 방에 상층 25%, 하층 45%. 시련은 둘. ch: 처음 나오는 챕터(없으면 1). 앞 챕터의 특성도 뒤 챕터에 나온다 */
const ROOM_MODS = {
  narrow: { n: '좁은 회랑', d: '전열에 적이 2기까지만 선다. 나머지는 후열이다.' },
  ceiling: { n: '무너지는 천장', d: '시간이 4번 흐를 때마다 모두에게 피해 4.' },
  holy: { n: '성수 웅덩이', d: '시간이 흐를 때마다 모두 생명력 1% 회복.' },
  candle: { n: '촛불 제단', d: '모든 점화 피해 +50%.' },
  bloodpool: { n: '피 웅덩이', d: '모든 출혈 피해 2배.' },
  bell: { n: '종소리', d: '적 속도 +10%. 이 방의 골드 +50%.' },
  dark: { n: '어둠', d: '후열 적의 예고가 보이지 않는다.' },
  calm: { n: '고요', d: '마나 자연 회복 2배.' },
  fog: { ch: 2, n: '납골 안개', d: '모든 원거리 피해 −20%(나와 후열 적 모두).' },
  wall: { ch: 2, n: '무너진 납골벽', d: '해골 1기가 더 나온다.' },
  lamp: { ch: 2, n: '꺼지지 않는 등불', d: '저주가 걸릴 때마다 지속 +1.' },
  water: { ch: 2, n: '지하수', d: '모두 냉각 1을 안고 시작한다.' },
};
const MOD_CHANCE = { upper: 0.25, lower: 0.45 };
const modsOf = ch => Object.keys(ROOM_MODS).filter(k => (ROOM_MODS[k].ch || 1) <= (ch || 1));

/* 적 구성 틀 ([역할, 정예]), 챕터마다 */
const ENC = { 1: {
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
}, 2: { // 잊힌 지하묘지: 해골과 저주술사가 섞인다
  upper: [
    [['skeleton'], ['skeleton']], [['bruiser'], ['curser']], [['shield'], ['healer']], [['skeleton'], ['archer']],
    [['bomber'], ['bomber'], ['skeleton']], [['summoner'], ['minion'], ['minion']], [['shield'], ['curser'], ['archer']], [['bruiser'], ['skeleton'], ['healer']],
    [['shield'], ['archer']], [['skeleton'], ['curser']], [['summoner'], ['skeleton']], [['skeleton', 1]],
  ],
  lower: [
    [['skeleton', 1], ['curser']], [['shield', 1], ['healer'], ['skeleton']], [['archer', 1], ['curser'], ['bomber']], [['summoner'], ['minion'], ['minion'], ['curser']],
    [['skeleton'], ['skeleton'], ['healer', 1]], [['shield', 1], ['bomber'], ['skeleton']], [['bruiser', 1], ['summoner']], [['curser', 1], ['shield'], ['archer']],
    [['bomber', 1], ['skeleton']], [['shield'], ['archer', 1], ['minion']], [['skeleton'], ['bruiser'], ['curser']], [['healer'], ['shield'], ['skeleton', 1]],
  ],
  treasure: [[['shield', 1], ['skeleton']], [['skeleton', 1], ['curser']], [['curser', 1], ['shield']]],
} };
const encOf = ch => ENC[ch] || ENC[1];
/* 강적 (자리만 먼저. 고유 규칙은 단계 8에서 비공개 문서대로 넣는다) */
/* 강적 공통 배율과 고유 수치 (11.8절). 일반 방보다 확실히 어렵게 (10월 2일 만든 사람 요청) */
const STRONG = { hp: 2.1, dmg: 1.3, bellEvery: 3, leech: 0.45, frenzy: 1.3, lowerHp: 1.3, lowerDmg: 1.15 }; // 하층 강적만 더: 무작위 시험 하층 순례자 40%대(만든 사람 요청) // 무작위 시험: 상층 승률 94%(남은 생명력 60%), 하층 76~82%(약 50%). 일반 방은 95~98%(65~83%)
const STRONG_FOES = [
  { id: 'bellringer', ch: 1, n: '종지기', en: [['shield', 1], ['bruiser'], ['minion']] },
  { id: 'pilgrim', ch: 1, n: '굶주린 순례자', en: [['bruiser', 1]] },
];
const foesOf = ch => { const L = STRONG_FOES.filter(x => x.ch === (ch || 1)); return L.length ? L : STRONG_FOES.filter(x => x.ch === 1); }; // 2챕터 강적은 단계 9에서

/* 성소: 다음 3개 방 동안 */
const SHRINES = [
  { id: 'break', n: '무너뜨림의 성소', d: '붕괴 게이지를 채우는 양 +20%.' },
  { id: 'ward', n: '인내의 성소', d: '받는 지속 피해 −30%.' },
  { id: 'wrath', n: '분노의 성소', d: '주는 피해 +10%.' },
  { id: 'breath', n: '숨결의 성소', d: '스태미나 자연 회복 +3.' },
  { id: 'mercy', n: '자비의 성소', d: '생명력 플라스크 회복 +10%p.' },
];

/* 제단: 대가 있는 거래. ch: 처음 나오는 챕터(없으면 1) */
const ALTARS = [
  { id: 'blood', n: '피의 거래', d: '최대 생명력 −5%(이 캐릭터가 끝날 때까지)를 바치고 희귀 장비 하나를 받는다.' },
  { id: 'gold', n: '황금 촛대', d: '골드 40을 바치고 세 플라스크를 하나씩 채운다.' },
  { id: 'offer', n: '바치는 제단', d: '가방의 장비 하나를 바치면 한 등급 위의 장비 하나를 받는다(희귀는 다시 희귀).' },
];
const altarsOf = ch => ALTARS.filter(a => (a.ch || 1) <= (ch || 1));

/* 이벤트. ch: 나오는 챕터(없으면 1). 챕터마다 그 챕터 것만 나오고, 같은 것은 한 챕터에 한 번 */
const EVENTS = [
  { id: 'confess', n: '버려진 고해실', lore: '휘장 너머에서 누군가 숨을 고른다.', opts: [{ id: 'do', n: '고해한다', d: '약화·취약 3T를 안고 다음 전투에 들어가는 대신 희귀 장비 하나.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'pilgrim', n: '쓰러진 순례자', lore: '짐 보따리가 아직 따뜻하다.', opts: [{ id: 'loot', n: '짐을 뒤진다', d: '장비 하나. 대신 다음 전투에 중독 3.' }, { id: 'pray', n: '기도한다', d: '생명력 플라스크 +1.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'reliquary', n: '잠긴 성물함', lore: '녹슨 자물쇠가 손을 기다린다.', opts: [{ id: 'force', n: '억지로 연다', d: '스태미나 40을 쓰고 골드 30 또는 고급 장비.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'chalice', n: '피 묻은 성배', lore: '잔 바닥에 검붉은 것이 고여 있다.', opts: [{ id: 'drink', n: '마신다', d: '최대 생명력 +5(영구), 지금 생명력 −15%.' }, { id: 'spill', n: '쏟는다', d: '마나 플라스크 +1.' }] },
  { id: 'candle', n: '속삭이는 촛불', lore: '불꽃이 이름을 부른다.', opts: [{ id: 'snuff', n: '불을 끈다', d: '다음 3개 방 동안 받는 점화 피해 0, 대신 주는 피해 −5%.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'library', n: '무너진 서고', lore: '젖은 책장 사이로 글자가 번진다.', opts: [{ id: 'read', n: '책을 읽는다', d: '능력치 1점.' }, { id: 'sell', n: '책을 챙긴다', d: '골드 20.' }] },
  { id: 'monk', n: '굶주린 수도사', lore: '뼈만 남은 손이 소매를 붙든다.', opts: [{ id: 'feed', n: '먹을 것을 준다', d: '플라스크 하나(가장 많이 찬 것)를 비우고, 다음 전투 방에서 장비 하나 더.' }, { id: 'chase', n: '내쫓는다', d: '다음 전투에 굶주린 수도사(돌격병)가 더해지고, 이기면 골드 20.' }] },
  { id: 'bell', n: '종탑의 줄', lore: '줄 끝이 아래로, 아래로 이어진다.', opts: [{ id: 'pull', n: '당긴다', d: '다음 층 문에 강적이 반드시 나온다. 골드 15.' }, { id: 'pass', n: '지나친다', d: '' }] },
  // 2챕터: 잊힌 지하묘지
  { id: 'nameless', ch: 2, n: '이름 없는 묘비', lore: '이끼 낀 비석에서 이름만 지워져 있다.', opts: [{ id: 'carve', n: '이름을 새긴다', d: '최대 생명력 +5(영구). 대신 다음 전투를 저주 3을 안고 시작한다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonetrader', ch: 2, n: '뼈 상인', lore: '등에 뼈 자루를 진 자가 손을 내민다. 금화는 받지 않는다.', opts: [{ id: 'trade', n: '장비를 넘긴다', d: '가방의 장비 하나를 주고, 같은 등급의 다른 장비 둘 가운데 하나를 받는다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'coffin', ch: 2, n: '봉인된 관', lore: '쇠사슬이 감긴 관. 안에서 무언가 긁는 소리가 난다.', opts: [{ id: 'open', n: '사슬을 끊는다', d: '절반 확률로 희귀 장비. 아니면 다음 전투에 정예 해골이 더해지고, 이기면 희귀 장비.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'funeral', ch: 2, n: '장례 행렬', lore: '횃불도 없이 관을 멘 자들이 지나간다.', opts: [{ id: 'follow', n: '뒤따른다', d: '다음 3개 방 동안 받는 피해 −10%, 주는 피해 −10%.' }, { id: 'block', n: '길을 막는다', d: '다음 전투에 무덤지기 하나가 더해지고, 이기면 골드 25.' }] },
  { id: 'mentor', ch: 2, n: '잊힌 스승의 묘비', lore: '비문에 낯익은 기술이 새겨져 있다.', opts: [{ id: 'learn', n: '비문을 읽는다', d: '스킬 한 칸을 비문의 스킬 셋 가운데 하나로 바꿀 수 있다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'robber', ch: 2, n: '도굴꾼의 시체', lore: '삽을 쥔 채 굳은 손. 자루가 아직 묵직하다.', opts: [{ id: 'search', n: '자루를 뒤진다', d: '골드 25 또는 장비 하나. 대신 다음 전투에 중독 3.' }, { id: 'bury', n: '묻어 준다', d: '생명력 플라스크 +1.' }] },
  { id: 'blackpool', ch: 2, n: '검은 샘', lore: '물이 등불 빛을 삼킨다.', opts: [{ id: 'drink', n: '마신다', d: '마나·스태미나 플라스크 +1. 대신 다음 전투를 저주 3을 안고 시작한다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonepipe', ch: 2, n: '뼈 피리', lore: '바람이 구멍을 지나며 운다. 아래에서 무언가 대답한다.', opts: [{ id: 'blow', n: '분다', d: '다음 층 문에 강적이 반드시 나온다. 골드 20.' }, { id: 'pass', n: '지나친다', d: '' }] },
];

const eventsOf = ch => { const L = EVENTS.filter(e => (e.ch || 1) === (ch || 1)); return L.length ? L : EVENTS.filter(e => (e.ch || 1) === 1); };

/* ===== 성장과 적 (기획서 11.4절, 11.8절) ===== */
/* 몬스터 레벨: 1챕터 1~4. 레벨마다 체력 +12%, 피해 +10% */
const MLV_HP = 0.12, MLV_DMG = 0.10;
/* 난이도 (10월 2일, 만든 사람 결정: 1챕터 완주 자동 테스터 평균 20%, 숙련·탐험가 40%. 1층부터 실전) 던전 방의 적 체력·피해 배율 */
const DIFF = {
  1: { upper: { hp: 1.25, dmg: 1.25 }, lower: { hp: 1.05, dmg: 0.9 } }, // 상층은 1층부터 거세게. 하층은 몬스터 레벨이 이미 높아 덜 올린다
  2: { upper: { hp: 1.25, dmg: 1.25 }, lower: { hp: 1.05, dmg: 0.9 } }, // 2챕터 (평균 15%, 신중 35%): 단계 12에서 맞춘다. 지금은 1챕터 값
};
const diffOf = (f, ch) => (DIFF[ch] || DIFF[1])[isLower(f, ch) ? 'lower' : 'upper'];
function mlvOf(f, ch) { const C = chOf(ch); if (f >= C.boss) return C.mlvTop; for (const [to, lv] of C.mlv) if (f <= to) return lv; return C.mlvTop; }
/* 경험치: 일반 5, 정예 12, 강적 30, 보스 100 × (1 + 0.15 × (몬스터 레벨 − 1)). 소환된 적은 0 */
const XP_BASE = { normal: 5, elite: 12, strong: 30, boss: 100 }; // 보스 150이면 챕터 끝 Lv6으로 목표(4~5)를 넘어 100으로 (10월 2일)
/* 보스에서 오른 능력치는 다음 챕터 준비에서 나눈다(run.statPending, 단계 9) */
const XP_LV = 0.15;
/* 레벨 n이 되는 데 필요한 누적 경험치 (LV_XP[n-1]) */
const LV_XP = [0, 40, 100, 180, 300, 470, 660, 870, 1100, 1350, 1620, 1910, 2220]; // 1챕터를 무작위 길로 끝까지 가면 Lv5 안팎 (10월 2일 8판 시험)
const LV_POINTS = 2;
/* 정예 접사 "강인": 체력 +50% (4.6절 1막 접사). 정예에게 상층 35%, 하층 60%. 2챕터는 접사가 붙을 때 절반은 "신속"(SWIFT, data/enemies.js) */
const TOUGH_CHANCE = { upper: 0.35, lower: 0.6 };
/* 챕터별 적 이름 (1챕터 저주받은 수도원). 역할은 카드에 작게 함께 보인다 */
const ENEMY_NAMES = {
  1: { bruiser: '광신 수도사', shield: '문지기 수사', archer: '종탑 궁수', healer: '피 닦는 수녀', summoner: '뼈 부르는 사제', bomber: '불붙은 고행자', minion: '일어선 시체' },
  2: { bruiser: '무덤지기', shield: '납골당 문지기', archer: '납골당 궁수', healer: '곡하는 사제', summoner: '뼈 엮는 자', bomber: '부푼 시체', minion: '기어 나온 뼈', skeleton: '해골 병사', curser: '무덤 주술사' },
};

/* ===== 강적과 보스: 처음 만날 때 "눈에 보이는 것", 겪은 뒤 도감 (기획서 11.9절) =====
   여기에는 대처법을 쓰지 않는다. 기믹 상세는 저장소 밖 비공개 문서에 있다 */
const FOE_INTRO = {
  abbot: { n: '타락한 수도원장', lore: '제단 앞에서 등을 돌린 채, 아직도 누군가의 고해를 기다린다.', see: ['수도원장이 낡은 성서를 펼친다. 손가락이 당신의 이름 위에서 멈춘다.'] },
  bellringer: { n: '종지기', lore: '줄을 놓지 않는 손. 종은 아직 울리지 않았다.', see: ['뒤쪽에 큰 종이 매달려 있다. 종지기가 줄을 감아쥔다.'] },
  cryptlord: { n: '지하묘지의 군주', lore: '무너진 관 더미 위에 앉아, 녹슨 왕관을 아직 내려놓지 않았다.', see: ['군주가 관 뚜껑을 짚고 천천히 일어선다. 왕관이 한쪽으로 기울어 있다.'] },
  pilgrim: { n: '굶주린 순례자', lore: '먼 길을 걸어온 자. 이제 무엇을 먹어도 배가 부르지 않다.', see: ['순례자가 입가를 훔친다. 손등에 마른 피가 묻어 있다.'] },
};
/* 도감: 처음 겪은 일만 적힌다 (결과만, 대처법은 플레이어 메모) */
const CODEX = {
  abbot: { brand: '죄를 읽으면 낙인이 남는다. 낙인이 쌓인 채 내리치는 강타는 더 아프다.', vow: '입을 다문 동안에는 공격하지 않고 상처를 다스린다. 그동안 직접 공격은 덜 들어간다.', vowbreak: '입을 다문 채 자세가 무너지면 서원이 깨지고 빈틈이 드러난다.', monks: '쓰러지기 직전, 제단에서 수도사들이 일어나 수도원장을 돌본다.' },
  bellringer: { ring: '종이 울리면 적들이 서두른다.', bellbreak: '큰 종이 부서지면 종지기가 비틀거리고, 종은 더 울리지 않는다.' },
  pilgrim: { leech: '맞힐 때마다 피를 마시며 상처를 메운다.', frenzy: '반쯤 쓰러지면 더 빨라진다.', rot: '쓰러질 때 썩은 기운이 퍼져, 다음 방까지 몸에 남는다.' },
};
