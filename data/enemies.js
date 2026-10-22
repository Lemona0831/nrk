/* 나락의 유산 데이터: 적 역할(4.6절), 보스, 계절
   index.html보다 먼저 읽힌다. 값만 두고, 계산은 index.html에서 한다. */
/* hit: 한 번 피해 = 기준 생명력(암살자 생명력 곡선 102 + 레벨마다 5) × hit (10월 4일 만든 사람 기준: 잡몹도 암살자 10~15% · 파수꾼 5~10%, 최소 5%, 강한 공격 15% 이상). dmg는 hit이 없을 때의 옛 배율 */
const ROLES = {
  bruiser:  { n: '돌격병', ico: '🪓', row: 'front', hp: 1.0, dmg: 1.0, spd: 1.0, hit: 0.13 },
  shield:   { n: '방패병', ico: '🛡️', row: 'front', hp: 1.6, dmg: 0.6, spd: 0.8, hit: 0.10 },
  archer:   { n: '사수',   ico: '🏹', row: 'back',  hp: 0.7, dmg: 1.1, spd: 1.1, hit: 0.12 },
  healer:   { n: '사제',   ico: '✚', row: 'back',  hp: 0.7, dmg: 0.4, spd: 0.9, hit: 0.07 },
  summoner: { n: '소환사', ico: '🕯️', row: 'back',  hp: 0.6, dmg: 0.5, spd: 0.8, hit: 0.08 },
  bomber:   { n: '자폭병', ico: '💣', row: 'front', hp: 0.5, dmg: 1.6, spd: 1.0, hit: 0.10 }, // 10월 5일: 던전에서 뺐다(화형 사제로 바꿈). 옛 시험 상황(rooms.js)만 쓴다
  pyre:     { n: '영창자', ico: '🔥', row: 'back', hp: 0.8, dmg: 0.8, spd: 0.9, hit: 0.10 }, // 10월 5일 만든 사람 결정: 영창 → 화형. 영창 중 받은 피해가 쌓이거나 무너지면 끊긴다(CHANT)
  minion:   { n: '하수인', ico: '💀', row: 'front', hp: 0.4, dmg: 0.5, spd: 1.0, hit: 0.10 },
  thief:    { n: '도둑',   ico: '🫳', row: 'front', hp: 0.6, dmg: 0.4, spd: 1.2, hit: 0.07 },
  darkmage: { n: '암흑술사', ico: '🌑', row: 'back', hp: 0.6, dmg: 0.8, spd: 0.9, hit: 0.11 },
  drill:    { n: '우두머리', ico: '📏', row: 'front', hp: 1.4, dmg: 1.0, spd: 1.0, hit: 0.13 }, // A1 1챕터 수련장(순찰대 방). 체력은 타수(data/foes.js)
  // 옛 2챕터 역할 가운데 3챕터가 함께 쓰는 해골(옛 설계 docs/챕터/archive/2챕터-지하묘지.md 5절). 행동 수치는 data/dungeon.js의 RISE · HEX · BWALL · BURROW · BLOAT
  skeleton: { n: '해골 병사', ico: '🦴', row: 'front', hp: 0.8, dmg: 1.0, spd: 1.0, hit: 0.11 },
  // 2챕터 「어둠이 가라앉은 거리」(0.8.0 A2). 체력은 타수(data/foes.js), 피해는 기준표 × hit. 숫자는 가설(M7)
  dun:      { n: '빚 수금꾼', ico: '📒', row: 'front', hp: 1.0, dmg: 1.0, spd: 1.0, hit: 0.13 },
  thug:     { n: '패거리 덩치', ico: '🧱', row: 'front', hp: 1.6, dmg: 0.6, spd: 0.8, hit: 0.10 },
  xbow:     { n: '석궁잡이', ico: '🏹', row: 'back', hp: 0.7, dmg: 1.1, spd: 1.1, hit: 0.12 },
  quack:    { n: '돌팔이', ico: '🪡', row: 'back', hp: 0.7, dmg: 0.4, spd: 0.9, hit: 0.07 },
  fence:    { n: '장물아비', ico: '🫳', row: 'front', hp: 0.6, dmg: 0.5, spd: 1.2, hit: 0.08 },
  arson:    { n: '해결사', ico: '🛢️', row: 'back', hp: 0.8, dmg: 0.8, spd: 0.9, hit: 0.09 },
  smoker:   { n: '약장수', ico: '💨', row: 'back', hp: 0.6, dmg: 0.8, spd: 0.9, hit: 0.10 },
  hound:    { n: '투견', ico: '🐕', row: 'front', hp: 0.6, dmg: 0.8, spd: 1.2, hit: 0.10 },
  overseer: { n: '감독관', ico: '⛓️', row: 'back', hp: 0.7, dmg: 0.6, spd: 0.9, hit: 0.09 },
  chained:  { n: '사슬 일꾼', ico: '🪢', row: 'front', hp: 1.0, dmg: 0.6, spd: 0.8, hit: 0.08 },
  pitboss:  { n: '우두머리', ico: '🔔', row: 'front', hp: 1.4, dmg: 1.0, spd: 1.0, hit: 0.13 },
  loser:    { n: '패배자', ico: '🗡️', row: 'front', hp: 0.9, dmg: 1.0, spd: 1.0, hit: 0.12 },
  lampkeeper: { n: '등불지기', ico: '🏮', row: 'front', hp: 1.2, dmg: 0.6, spd: 0.8, hit: 0.09 },
  shade:    { n: '그림자 하수인', ico: '👤', row: 'front', hp: 0.4, dmg: 0.6, spd: 1.0, hit: 0.09 },
  lantern:  { n: '등불', ico: '🏮', row: 'back', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 물체: 행동하지 않는다. 붕괴 게이지가 차면 깨진다
  // 3챕터 「성벽 아래」(0.8.0 A3). 체력은 타수(data/foes.js), 피해는 기준표 × hit. 갑옷 · 방패는 data/foes.js armor · shield. 숫자는 가설(M7)
  wallguard: { n: '성벽 수비병', ico: '🛡️', row: 'front', hp: 1.3, dmg: 0.7, spd: 0.8, hit: 0.10 },
  pike:     { n: '수비대 장창병', ico: '🔱', row: 'front', hp: 1.0, dmg: 1.0, spd: 1.0, hit: 0.13 },
  wallxbow: { n: '성벽 석궁병', ico: '🏹', row: 'back', hp: 0.7, dmg: 1.1, spd: 1.0, hit: 0.12 },
  beacon:   { n: '봉화꾼', ico: '🔥', row: 'back', hp: 0.7, dmg: 0.8, spd: 1.0, hit: 0.10 },
  rioter:   { n: '피난민 폭도', ico: '✊', row: 'front', hp: 0.6, dmg: 0.6, spd: 1.1, hit: 0.08 },
  smuggler: { n: '밀수꾼', ico: '🫳', row: 'front', hp: 0.7, dmg: 0.6, spd: 1.2, hit: 0.09 },
  medic:    { n: '군의관 수녀', ico: '🩹', row: 'back', hp: 0.7, dmg: 0.4, spd: 0.9, hit: 0.07 },
  sapper:   { n: '수비대 공병', ico: '🔨', row: 'back', hp: 0.8, dmg: 0.7, spd: 0.9, hit: 0.09 },
  tainted:  { n: '잠식된 자', ico: '🌑', row: 'front', hp: 0.9, dmg: 0.8, spd: 1.0, hit: 0.11 },
  bellman:  { n: '경보수', ico: '🔔', row: 'back', hp: 0.8, dmg: 0.7, spd: 1.0, hit: 0.09 },
  tenman:   { n: '수비대 십인장', ico: '🎖️', row: 'front', hp: 1.4, dmg: 1.0, spd: 1.0, hit: 0.13 },
  bonfire:  { n: '봉화', ico: '🔥', row: 'back', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 물체(비공개 문서 참조)
  rampart:  { n: '공성추 부품', ico: '⚙️', row: 'back', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 물체(비공개 문서 참조)
  brick:    { n: '벽돌', ico: '🧱', row: 'front', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 물체(비공개 문서 참조)
  barricade: { n: '바리케이드', ico: '🪵', row: 'front', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 물체: 쓰러진 동료 자리에 선다. 붕괴 한 번에 무너진다
  root:     { n: '뿌리',   ico: '🌱', row: 'back',  hp: 0.55, dmg: 0, spd: 0 },
  candle:   { n: '참회의 촛불', ico: '🕯️', row: 'front', hp: 0.3, dmg: 0, spd: 0, hit: 0 },
};

const BOSSES = {
  abbot: { n: '타락한 수도원장', ico: '⛪', mult: 10, dmgMul: 2.2, hit: 0.12, /* 10월 4일: 한 번 피해는 기준표(평소 12%, 강타 ×3.5) */ /* 10월 3일 6·1.6 → 10·2.2: 라운드 방식에서 보스 승률 95%라 1챕터 끝의 벽이 없었다 (지금 67%) */ d: '수도원의 마지막 주인. 무엇을 하는지는 겪어 보아야 안다.', lore: '제단 앞에서 등을 돌린 채, 아직도 누군가의 고해를 기다린다.' },
  lu: { n: '성벽지기 루', ico: '🏰', mult: 8, dmgMul: 1.8, hit: 0.12, d: '외곽과 안쪽을 가르는 성문을 지키는 자. 무엇을 하는지는 겪어 보아야 안다.', lore: '외곽과 안쪽을 가르는 성문을 지키는 자. 이름을 아는 사람이 없다.' }, // 3챕터 보스(0.8.0 A3, 기믹 · 대처는 비공개 문서). 수치는 2챕터 보스와 같게 두고 체력은 타수로
  bardo: { n: '등불 상인 바르도', ico: '🏮', mult: 8, dmgMul: 1.8, hit: 0.12, d: '거리의 등불을 전부 거둬 제 왕좌에 건 자. 무엇을 하는지는 겪어 보아야 안다.', lore: '거리의 등불을 전부 거둬 제 왕좌에 건 자.' }, // 2챕터 보스(0.8.0 A2, 기믹 · 대처는 비공개 문서). 수치는 옛 2챕터 보스와 같게 두고 체력은 타수로
  mother: { n: '늪의 어머니', ico: '🐸', mult: 8, d: '독 늪: 라운드가 끝날 때마다 내게 중독을 2번 건다(방어 중에는 걸지 않음). 중독은 라운드마다 1씩 줄어 실제로는 1씩 오른다. 중독 10 이상이면 알 부화(하수인 2). 생명력 플라스크로 정화하면 지운 중독 1당 어머니 최대 체력 1% 피해. 2페이즈부터 나락의 거울(직전 스킬을 50% 위력으로 되돌림).' },
  tree:   { n: '뒤틀린 수호목', ico: '🌳', mult: 6, d: '뿌리 연결: 후열 뿌리가 살아 있는 동안 체력 재생(뿌리 3개면 라운드마다 2.5%). 계절 순환: 4라운드마다 봄(재생 ×2) → 여름(화염 약점, 점화) → 가을(단일 공격 2회 중 1회 빗나감, 광역 약점) → 겨울(냉각).' },
};

const SEASONS = ['봄', '여름', '가을', '겨울'];
