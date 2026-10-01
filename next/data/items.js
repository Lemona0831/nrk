/* 나락의 유산 데이터: 아이템(6.8절, 11.5절), 슬롯 이름, 자발 시험용 풀
   index.html보다 먼저 읽힌다. 값만 두고, 계산은 index.html에서 한다. */
const ITEMS = {
  hook:     { n: '끌어내는 갈고리', slot: 'weapon', kind: 'block', act: '강공격이 후열 적 1기를 전열로 끌어낸다(전열이 막고 있어도 후열을 노릴 수 있음)', cost: '무기 피해 -15%' },
  plate:    { n: '인내의 흉갑', slot: 'armor', kind: 'block', act: '방어 중 받은 피해의 30%를 다음 공격 피해에 더한다', cost: '최대 생명력 -10%' },
  witness:  { n: '증인의 부적', slot: 'amulet', kind: 'block', act: '적의 충전 기술(강타)을 흘리면 그 적에게 취약(보통 행동 약 2번 동안)', cost: '흘리기 스태미나 +10' },
  chalice:  { n: '역류의 성배', slot: 'flask', kind: 'free', act: '생명력 플라스크로 정화한 디버프 중첩만큼 다음 공격이 대상에게 같은 디버프를 건다', cost: '생명력 플라스크 회복량 -10%' },
  pulse:    { n: '느린 맥박', slot: 'ring1', kind: 'free', act: '내 차례가 덜 자주 온다(적이 더 자주 끼어든다). 대신 행동당 직접 피해 +35%. 중독 같은 지속 피해는 시간에 따라 흐르므로 그대로', cost: '적이 상대적으로 더 자주 행동' },
  twin:     { n: '쌍날 단검', slot: 'weapon', kind: 'free', act: '기본 공격이 두 번 친다(한 번에 50%)', cost: '강공격 피해 -20%' },
  maul:     { n: '무거운 망치', slot: 'weapon', kind: 'free', act: '강공격의 붕괴 게이지 +20', cost: '강공격이 더 느려진다' },
  thorns:   { n: '가시 갑옷', slot: 'armor', kind: 'free', act: '방어하는 동안 근접 공격을 받으면 그 적에게 피해 2', cost: '최대 생명력 -5%' },
  cloak:    { n: '그림자 망토', slot: 'armor', kind: 'free', act: '흘리기로 줄이는 피해 +15%p', cost: '최대 생명력 -5%' },
  bloodpact:{ n: '피의 서약', slot: 'amulet', kind: 'free', act: '생명력이 절반 아래면 주는 피해 +20%', cost: '모든 회복 -15%' },
  sigil:    { n: '정화의 성표', slot: 'amulet', kind: 'free', act: '디버프가 걸릴 때마다 마나 +4', cost: '최대 마나 -15' },
  fury:     { n: '분노의 반지', slot: 'ring1', kind: 'free', act: '강타를 맞으면 다음 공격 피해 +10%', cost: '받는 강타 피해 +10%' },
  focusring:{ n: '수렴의 반지', slot: 'ring1', kind: 'free', act: '단일 대상 공격 피해 +7%', cost: '광역 공격 피해 -30%' },
  venomring:{ n: '독침 반지', slot: 'ring1', kind: 'free', act: '기본 공격이 중독 +1을 건다', cost: '기본 공격 피해 -10%' },
  boilflask:{ n: '끓는 플라스크', slot: 'flask', kind: 'free', act: '생명력 플라스크를 마시면 모든 적에게 피해 5', cost: '생명력 플라스크 회복량 -25%' },
  chaingl:  { n: '사슬 장갑', slot: 'gloves', kind: 'free', act: '근접 스킬의 붕괴 게이지 +20', cost: '최대 스태미나 -10' },
  ragechain:{ n: '분노의 사슬', slot: 'gloves', kind: 'free', act: '맞을 때마다 다음 공격 피해 +4%(최대 +20%), 공격하면 사라진다', cost: '방어로 줄이는 피해 50% → 40%' },
  markamu:  { n: '추적자의 표식', slot: 'amulet', kind: 'free', act: '같은 적을 세 번 이어 치면 그 적이 취약해진다', cost: '대상을 바꾼 첫 공격 피해 -10%' },
  resostone:{ n: '공명석', slot: 'ring1', kind: 'free', act: '직전과 다른 스킬을 쓰면 피해 +6%', cost: '같은 스킬을 이어 쓰면 마나 +2' },
  wardcrest:{ n: '수호의 문장', slot: 'armor', kind: 'free', act: '보호막이 남아 있는 동안 받는 피해 -15%', cost: '최대 생명력 -5%' },
  vpouch:   { n: '독 주머니', slot: 'gloves', kind: 'free', act: '중독된 적에게 주는 직접 피해 +15%', cost: '최대 마나 -10' },
  bloodoil: { n: '피의 성유', slot: 'flask', kind: 'free', act: '생명력으로 치르는 비용 -30%', cost: '생명력 플라스크 회복량 -20%' },
  rosary:   { n: '정화의 묵주', slot: 'amulet', kind: 'free', act: '디버프를 지울 때마다 지운 수만큼 마나 +3', cost: '최대 생명력 -3%' },
  scarcharm:{ n: '흉터 부적', slot: 'ring1', kind: 'free', act: '상흔이 있으면 근접 공격에 상흔의 15%(최대 10)를 더한다', cost: '상흔 저장률 -5%p' },
  echo:     { n: '메아리 반지', slot: 'ring1', kind: 'free', act: '같은 스킬을 이어 쓸 때마다 그 스킬의 피해 +4%(최대 3번, +12%)', cost: '다른 스킬을 쓰면 쌓인 메아리가 사라진다' },
  vanguard: { n: '선봉의 깃발', slot: 'amulet', kind: 'free', act: '전투의 첫 공격이 빠른 행동이 되고 붕괴 게이지 +20', cost: '최대 스태미나 −20' },
  knot:     { n: '잔향의 매듭', slot: 'gloves', kind: 'free', act: '독 격발과 상흔 방출 뒤 쓴 양의 절반을 남긴다', cost: '독 격발·상흔 방출 마나 +2' },
  ledger:   { n: '피의 계산서', slot: 'ring2', kind: 'free', act: '스태미나가 모자라면 강공격 비용을 생명력 4%로 치른다', cost: '생명력 소모' },
};

const SLOT_N = { weapon: '무기', armor: '갑옷', amulet: '목걸이', flask: '플라스크', ring1: '반지', ring2: '반지', gloves: '장갑' };

const FREE_POOL = ['ragechain', 'markamu', 'resostone', 'wardcrest', 'vpouch', 'bloodoil', 'rosary', 'scarcharm', 'chalice', 'pulse', 'ledger', 'knot', 'echo', 'vanguard', 'twin', 'maul', 'thorns', 'cloak', 'bloodpact', 'sigil', 'fury', 'focusring', 'venomring', 'boilflask', 'chaingl'];

/* ===== 0.6 장비 (기획서 11.5절) ===== */
/* 등급: 기본 수치에 붙는 보너스(%) 범위 */
const GRADE = { n: { n: '평범', lo: 1, hi: 5 }, m: { n: '고급', lo: 5, hi: 10 }, r: { n: '희귀', lo: 10, hi: 15 } };
/* 슬롯마다 기본 수치. v는 1·2·3챕터 값 */
const SLOT_BASE = {
  weapon: { k: 'wpn', lab: '무기 피해', v: [8, 11, 15] },
  armor: { k: 'hp', lab: '최대 생명력', v: [10, 16, 24] },
  gloves: { k: 'st', lab: '최대 스태미나', v: [5, 8, 12] },
  amulet: { k: 'mp', lab: '최대 마나', v: [5, 8, 12] },
  ring: { k: 'hp', lab: '최대 생명력', v: [5, 8, 12] },
  flask: { k: 'flask', lab: '생명력 플라스크 회복', v: [0.3, 0.3, 0.3] },
};
const BAG_MAX = 12;
/* 시작 장비 (평범, 보너스 없음). 시작 장비만 낀 캐릭터는 B0.5와 수치가 같다 */
const START_WPN = { berserker: ['녹슨 도끼', '날이 무뎌졌지만 아직 무겁다.'], hunter: ['사냥 활', '시위에 오래된 피가 말라붙어 있다.'], arcanist: ['견습 지팡이', '끝에 박힌 돌이 희미하게 떨린다.'], templar: ['철퇴', '성구를 녹여 다시 두드린 쇠.'], warlock: ['뼈 지팡이', '누구의 뼈인지는 묻지 않는다.'], assassin: ['단검', '손에 익은 짧은 칼.'], priest: ['성구 지팡이', '기도문이 새겨진 손잡이.'], scar: ['톱날 검', '베는 것보다 찢는 데 가깝다.'] };
for (const k in START_WPN) ITEMS['start_wpn_' + k] = { n: START_WPN[k][0], slot: 'weapon', kind: 'start', g: 'n', act: '', cost: '', lore: START_WPN[k][1] };
ITEMS.start_armor = { n: '낡은 갑옷', slot: 'armor', kind: 'start', g: 'n', act: '', cost: '', lore: '여러 주인을 거친 가죽과 쇠.' };
ITEMS.start_flask = { n: '낡은 플라스크', slot: 'flask', kind: 'start', g: 'n', act: '', cost: '', lore: '금이 갔지만 새지는 않는다.' };
/* B0.5 효과 아이템의 등급 (11.5절: 단순한 수치 효과는 고급, 행동을 바꾸는 것은 희귀) */
const ITEM_GRADE = {
  twin: 'r', maul: 'r', hook: 'r', thorns: 'r', cloak: 'r', plate: 'r', chaingl: 'r', knot: 'r', ragechain: 'r', bloodpact: 'r', vanguard: 'r', witness: 'r',
  echo: 'r', pulse: 'r', ledger: 'r', chalice: 'r', boilflask: 'r',
  focusring: 'm', venomring: 'm', fury: 'm', markamu: 'm', resostone: 'm', wardcrest: 'm', vpouch: 'm', bloodoil: 'm', rosary: 'm', scarcharm: 'm', sigil: 'm',
};
for (const k in ITEM_GRADE) if (ITEMS[k]) ITEMS[k].g = ITEM_GRADE[k];
