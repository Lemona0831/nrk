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
  // 2챕터 (10월 5일, docs/챕터/2챕터.md 5절). 행동 수치는 data/dungeon.js의 RISE · HEX · BWALL · BURROW · BLOAT
  skeleton: { n: '해골 병사', ico: '🦴', row: 'front', hp: 0.8, dmg: 1.0, spd: 1.0, hit: 0.11 },
  hexer:    { n: '무덤 주술사', ico: '🪢', row: 'back', hp: 0.6, dmg: 0.8, spd: 0.9, hit: 0.09 },
  mason:    { n: '뼈 쌓는 자', ico: '🧱', row: 'back', hp: 0.7, dmg: 0.6, spd: 0.8, hit: 0.08 },
  bonewall: { n: '뼈벽', ico: '🧱', row: 'front', hp: 0.7, dmg: 0, spd: 0, hit: 0 }, // 물체: 행동하지 않는다. 생명력은 쌓은 자의 최대 생명력 × BWALL.hp
  burrower: { n: '굴 파는 시체', ico: '🕳️', row: 'front', hp: 0.9, dmg: 1.0, spd: 1.0, hit: 0.12 },
  bloat:    { n: '부푼 시체', ico: '💀', row: 'front', hp: 0.7, dmg: 0.6, spd: 0.8, hit: 0.08 },
  // 3챕터 (10월 7일, docs/챕터/3챕터.md 6절). 행동 수치는 data/dungeon.js의 LURK · EMBER · WRAP · HAZE · HEAT
  lurker:   { n: '잠복자', ico: '🦂', row: 'front', hp: 0.7, dmg: 1.0, spd: 1.1, hit: 0.10 },
  ember:    { n: '투척병', ico: '☄️', row: 'back', hp: 0.65, dmg: 0.8, spd: 1.0, hit: 0.08 },
  wrapped:  { n: '망자', ico: '🧻', row: 'front', hp: 1.3, dmg: 1.0, spd: 0.9, hit: 0.11 },
  mirage:   { n: '술사', ico: '🔮', row: 'back', hp: 0.6, dmg: 0.7, spd: 0.9, hit: 0.07 },
  crown:    { n: '왕관', ico: '💠', row: 'front', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 재의 여왕의 왕관: 행동하지 않는다. 생명력은 여왕의 최대 생명력 × QUEEN.crownHp
  maid:     { n: '시녀', ico: '🕯️', row: 'back', hp: 0.6, dmg: 0.5, spd: 0.9, hit: 0.06 }, // 재의 시녀: 생명력 · 피해는 여왕에게서 (QUEEN)
  root:     { n: '뿌리',   ico: '🌱', row: 'back',  hp: 0.55, dmg: 0, spd: 0 },
  candle:   { n: '참회의 촛불', ico: '🕯️', row: 'front', hp: 0.3, dmg: 0, spd: 0, hit: 0 },
};

const BOSSES = {
  abbot: { n: '타락한 수도원장', ico: '⛪', mult: 10, dmgMul: 2.2, hit: 0.12, /* 10월 4일: 한 번 피해는 기준표(평소 12%, 강타 ×3.5) */ /* 10월 3일 6·1.6 → 10·2.2: 라운드 방식에서 보스 승률 95%라 1챕터 끝의 벽이 없었다 (지금 67%) */ d: '수도원의 마지막 주인. 무엇을 하는지는 겪어 보아야 안다.', lore: '제단 앞에서 등을 돌린 채, 아직도 누군가의 고해를 기다린다.' },
  cryptlord: { n: '지하묘지의 군주', ico: '👑', mult: 10, dmgMul: 2.2, hit: 0.12, d: '이 지하묘지에 처음 묻힌 왕. 무엇을 하는지는 겪어 보아야 안다.', lore: '이 지하묘지에 처음 묻힌 왕. 아직도 신하들의 이름을 부른다.' }, // 2챕터 보스 (기믹 상세 · 대처는 비공개 문서)
  queen: { n: '재의 여왕', ico: '👑', mult: 4.5, hit: 0.08, /* 10월 8일: 0.10 → 0.08 (던전 보스 승률 22% → 29%, 직업 사이 4~40%) */ /* 10월 7일 첫 측정: 8.5 · 0.12는 AI 보스 승률 0%(남은 생명력 평균 75%). 상급 줄이 아직 없어 플레이어 피해가 설계의 가정(1.7~1.9배)만큼 자라지 않았다 */ d: '사르하의 마지막 주인. 무엇을 하는지는 겪어 보아야 압니다.', lore: '불타는 왕국을 재로 굳혀 지킨 자. 아직도 해가 지지 않기를 기다린다.' }, // 3챕터 보스 (기믹 상세 · 대처는 비공개 문서)
  mother: { n: '늪의 어머니', ico: '🐸', mult: 8, d: '독 늪: 라운드가 끝날 때마다 내게 중독을 2번 건다(방어 중에는 걸지 않음). 중독은 라운드마다 1씩 줄어 실제로는 1씩 오른다. 중독 10 이상이면 알 부화(하수인 2). 생명력 플라스크로 정화하면 지운 중독 1당 어머니 최대 체력 1% 피해. 2페이즈부터 나락의 거울(직전 스킬을 50% 위력으로 되돌림).' },
  tree:   { n: '뒤틀린 수호목', ico: '🌳', mult: 6, d: '뿌리 연결: 후열 뿌리가 살아 있는 동안 체력 재생(뿌리 3개면 라운드마다 2.5%). 계절 순환: 4라운드마다 봄(재생 ×2) → 여름(화염 약점, 점화) → 가을(단일 공격 2회 중 1회 빗나감, 광역 약점) → 겨울(냉각).' },
};

const SEASONS = ['봄', '여름', '가을', '겨울'];
