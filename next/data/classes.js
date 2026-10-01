/* 나락의 유산 데이터: 직업, 직업 전용 스킬, 직업 기술, 시작 스킬
   index.html보다 먼저 읽힌다. 값만 두고, 계산은 index.html에서 한다. */
const EXCL = {
  berserker: [
    { id: 'cleave', n: '휩쓸기', mana: 5, type: 'front', dmg: 6, fx: { brk: 10 }, d: '전열의 적 모두에게 피해 6, 붕괴 +10.' },
    { id: 'warcry', n: '피의 포효', mana: 6, type: 'self', fx: { rage: 4, allWeak: 1 }, d: '분노 +4. 모든 적을 약화시킨다.' },
    { id: 'reckless', n: '무모한 돌진', mana: 3, type: 'melee', dmg: 15, hpCost: 0.06, fx: { brk: 15 }, d: '생명력 6%를 치르고 근접 피해 15, 붕괴 +15.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'ironhide', n: '강철 살갗', mana: 4, type: 'self', fx: { brace: 1 }, d: '내 다음 행동까지 받는 피해 −35%. 그동안 전열에서 나를 친 적에게 반격 4, 맞을 때마다 분노 +1 더.' },
    { id: 'grudge', n: '앙갚음', mana: 4, type: 'melee', dmg: 5, fx: { grudge: 0.8, brk: 10 }, d: '근접 피해 5 + 내 지난 행동 뒤로 받은 피해의 80%. 붕괴 +10.' },
  ],
  hunter: [
    { id: 'volley', n: '연사', mana: 6, type: 'aoe', dmg: 5, d: '모든 적에게 피해 5.' },
    { id: 'weakspot', n: '급소 사격', mana: 4, type: 'ranged', dmg: 8, fx: { vuln: 1 }, d: '원거리 피해 8, 취약.' },
    { id: 'snare', n: '덫 사슬', mana: 4, type: 'ranged', dmg: 7, fx: { chill: 1, brk: 15 }, d: '원거리 피해 7, 냉각, 붕괴 +15.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'beartrap', n: '곰덫', mana: 4, type: 'ranged', dmg: 0, fx: { trap: 12, trapBrk: 20 }, d: '대상의 발밑에 덫을 놓는다. 그 적이 다음에 움직이면 피해 12, 붕괴 +20 (내 차례 약 4번 동안).' },
    { id: 'snarefield', n: '올가미 밭', mana: 5, type: 'front', dmg: 0, fx: { trap: 7, trapBrk: 10 }, d: '전열 적 모두의 발밑에 올가미. 다음에 움직이면 피해 7, 붕괴 +10.' },
  ],
  arcanist: [
    { id: 'icelance', n: '얼음 창', mana: 6, type: 'ranged', dmg: 6, fx: { chill: 1 }, d: '원거리 피해 6, 냉각.' },
    { id: 'chain', n: '연쇄 번개', mana: 8, type: 'aoe', dmg: 3, fx: { brk: 10 }, d: '모든 적에게 피해 3, 붕괴 +10.' },
    { id: 'barrier', n: '마력 방벽', mana: 6, type: 'self', fx: { ward: 12 }, d: '보호막 12.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'rift', n: '시간 균열', mana: 7, type: 'ranged', dmg: 0, fx: { rift: 20, riftBrk: 20 }, d: '대상에 균열을 연다. 내 차례 약 2번 뒤 터져 피해 20, 붕괴 +20. 그 전에 쓰러지면 사라진다.' },
    { id: 'echoflare', n: '메아리 섬광', mana: 6, type: 'aoe', dmg: 3, fx: { echo: 1 }, d: '모든 적에게 피해 3. 잠시 뒤 같은 피해가 한 번 더 울린다.' },
  ],
  templar: [
    { id: 'shieldbash', n: '방패 강타', mana: 4, type: 'melee', dmg: 9, fx: { brk: 35 }, d: '근접 피해 9, 붕괴 +35.' },
    { id: 'aura', n: '신성 오라', mana: 5, type: 'self', fx: { protect: 1, ward: 14 }, d: '보호(내 차례 약 3번)와 보호막 14.' },
    { id: 'purifyfire', n: '정화의 불길', mana: 7, type: 'aoe', dmg: 3, fx: { ignite: 1, cleanseOne: 1 }, d: '모든 적에게 피해 3과 점화. 내 디버프 하나를 지운다.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'judgment', n: '심판의 일격', mana: 4, type: 'melee', dmg: 5, fx: { wardSpend: 1, wardMul: 0.9, brk: 15 }, d: '보호막을 모두 태워 근접 피해 5 + 태운 보호막의 90%. 붕괴 +15.' },
    { id: 'sunburst', n: '빛의 파열', mana: 6, type: 'aoe', dmg: 3, fx: { wardSpend: 0.5, wardMul: 0.4 }, d: '보호막 절반을 태워 모든 적에게 피해 3 + 태운 양의 40%.' },
  ],
  assassin: [
    { id: 'dagger', n: '독 단검', mana: 3, type: 'ranged', dmg: 4, fx: { poison: 2 }, d: '원거리 피해 4, 중독 +2.' },
    { id: 'shadowstrike', n: '그림자 일격', mana: 4, type: 'melee', dmg: 8, fx: { poisonBonus: 1 }, d: '근접 피해 8. 대상의 중독 수치만큼 피해를 더한다(중독은 그대로).' },
    { id: 'smoke', n: '연막', mana: 6, type: 'aoe', dmg: 0, fx: { weak: 1, poison: 1 }, d: '모든 적을 약화시키고 중독 +1.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'lacerate', n: '찢어발기기', mana: 4, type: 'melee', dmg: 5, fx: { bleed: 3, brk: 10 }, d: '근접 피해 5, 출혈(내 차례 약 3번), 붕괴 +10.' },
    { id: 'execute', n: '처형', mana: 5, type: 'melee', dmg: 7, fx: { execute: 0.35, execMul: 2.5 }, d: '근접 피해 7. 대상의 생명력이 35% 이하면 피해 2.5배.' },
  ],
  warlock: [
    { id: 'enfeeble', n: '쇠약', mana: 4, type: 'ranged', dmg: 6, fx: { weak: 1, vuln: 1 }, d: '원거리 피해 6, 약화와 취약.' },
    { id: 'bloodlance', n: '피의 창', mana: 0, type: 'ranged', dmg: 13, hpCost: 0.05, d: '생명력 5%를 치르고 원거리 피해 13. 마나는 들지 않는다.' },
    { id: 'soullink', n: '혼 사슬', mana: 7, type: 'aoe', dmg: 5, fx: { lifesteal: 0.5 }, d: '모든 적에게 피해 5. 준 피해의 절반만큼 생명력을 되찾는다.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'plague', n: '역병 저주', mana: 5, type: 'ranged', dmg: 4, fx: { plague: 4 }, d: '원거리 피해 4, 역병(시간마다 피해 1, 내 차례 약 4번). 역병 걸린 적이 쓰러지면 남은 적 모두에게 약화와 역병이 옮는다.' },
    { id: 'harvest', n: '혼 수확', mana: 4, type: 'aoe', dmg: 7, fx: { harvest: 0.03 }, d: '약화되었거나 역병에 걸린 적 모두에게 피해 7. 맞힌 적 하나마다 생명력 3% 회복.' },
  ],
  priest: [
    { id: 'bless', n: '축복', mana: 5, type: 'self', fx: { healPct: 0.14, protect: 1 }, d: '생명력 14% 회복, 보호(내 차례 약 3번).' },
    { id: 'lightspear', n: '빛의 창', mana: 5, type: 'ranged', dmg: 7, fx: { weakDouble: 1 }, d: '원거리 피해 7. 약화된 적에게는 두 배.' },
    { id: 'atone', n: '속죄', mana: 4, type: 'self', fx: { cleanseAll: 1, wardPer: 6 }, d: '내 디버프를 모두 지우고, 지운 수마다 보호막 6.' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'sear', n: '단죄의 낙인', mana: 4, type: 'ranged', dmg: 5, fx: { smite: 4 }, d: '원거리 피해 5, 단죄(내 차례 약 4번). 그동안 내가 생명력을 회복하면, 단죄된 적 모두가 회복량의 60%만큼 피해를 입는다.' },
    { id: 'radiance', n: '심판의 빛살', mana: 7, type: 'aoe', dmg: 4, fx: { radiance: 1 }, d: '모든 적에게 피해 4. 단죄된 적에게는 두 배이고, 단죄를 터뜨려 지운다.' },
  ],
  scar: [
    { id: 'bloodlet', n: '피 흘리기', mana: 0, type: 'self', hpCost: 0.1, fx: { scarFromCost: 1.5 }, d: '생명력 10%를 흘려, 그 1.5배를 상흔으로 쌓는다.' },
    { id: 'scarburst', n: '상흔 폭발', mana: 5, type: 'melee', dmg: 0, fx: { scarAll: 1.6 }, d: '상흔을 모두 태워 한 적에게 상흔×1.6 피해.' },
    { id: 'suture', n: '상처 봉합', mana: 3, type: 'self', fx: { suture: 1, protect: 1 }, d: '상흔을 모두 생명력으로 되돌리고 보호(내 차례 약 3번).' },
    // 10월 2일 추가: 살짝 다른 갈래
    { id: 'bloodbond', n: '피의 연결', mana: 4, type: 'ranged', dmg: 0, fx: { bond: 4 }, d: '대상과 피를 잇는다(내 차례 약 4번). 그동안 내가 받는 직접 피해의 절반을 그 적도 받는다.' },
    { id: 'transfuse', n: '수혈', mana: 3, type: 'melee', dmg: 8, fx: { transfuse: 0.6 }, d: '근접 피해 8. 피로 이어진 적이면 준 피해의 60%만큼 생명력을 되찾는다.' },
  ],
};

const SIG = {
  berserker: { n: '해방', cd: 0, time: 0.5, d: '분노가 5 이상이면, 분노를 모두 쏟아 즉시 격노하고 쏟은 분노 1당 생명력 1%를 되찾는다. 빠른 행동.' },
  hunter: { n: '표적 고정', cd: 3, time: 0.5, tgt: 1, d: '대상 하나를 취약하게 만들고(내 차례 약 2번), 그 대상에 대한 연속 공격 보너스를 바로 최대(+25%)로 만든다. 빠른 행동.' },
  arcanist: { n: '공명 집중', cd: 3, time: 0.5, d: '마나 12를 되찾고, 다음 스킬이 반드시 공명하며 그 공명은 +30%가 된다. 빠른 행동.' },
  templar: { n: '보호 서약', cd: 3, time: 1, d: '보호막 12와 보호(내 차례 약 2번).' },
  assassin: { n: '독 침투', cd: 4, time: 1, tgt: 1, d: '대상의 중독을 1.5배로 늘린다.' },
  warlock: { n: '피의 대가', cd: 2, time: 0.5, d: '최대 생명력 10%를 바쳐 마나 20을 얻는다. 빠른 행동.' },
  priest: { n: '기도', cd: 3, time: 1, d: '내 디버프 하나를 지우고 생명력 12%를 되찾는다.' },
  scar: { n: '피의 응답', cd: 3, time: 1, d: '내 다음 차례까지 받는 피해가 30% 줄고, 받은 피해를 모두 그 적에게 되돌린다.' },
};

const DEFAULT_SKILLS = { berserker: ['crush', 'scarcut'], hunter: ['aimshot', 'cloud'], arcanist: ['fireball', 'flame'], templar: ['lava', 'purge'], warlock: ['drain', 'reverse'], assassin: ['viper', 'cloud', 'burst'], scar: ['scarcut', 'release'], priest: ['flame', 'purge', 'reverse'] };

/* hp는 시작 장비(낡은 갑옷 +10)를 뺀 값이다. 낡은 갑옷을 끼면 B0.5와 같다 (기획서 11.5절) */
const BUILDS = {
  berserker: {
    n: '광전사', ico: '⚔️', hp: 96, mp: 40,
    rule: '피해를 주고받을 때마다 분노 +1, 생명력이 절반 아래면 2배로 찬다. 분노 10이면 격노',
    skills: [{ id: 'crush', n: '분쇄의 일격', mana: 5, melee: 1, dmg: 11, d: '근접 9 피해, 붕괴 +20' }],
  },
  hunter: {
    n: '사냥꾼', ico: '🎯', hp: 117, mp: 55,
    rule: '모든 공격이 후열에 닿고, 기본 공격과 강공격은 활이라 방패병에게 막히지 않는다. 같은 적을 이어서 칠 때마다 피해 +5%(최대 25%)',
    skills: [{ id: 'aimshot', n: '정밀 사격', mana: 4, ranged: 1, dmg: 7, d: '원거리 7 피해, 붕괴 +10' }],
  },
  arcanist: {
    n: '비전술사', ico: '🔮', hp: 104, mp: 75,
    rule: '직전과 다른 스킬을 쓰면 공명으로 피해 +15%. 전투마다 보호막 14를 두르고 시작한다',
    skills: [{ id: 'fireball', n: '화염구', mana: 8, aoe: 1, fire: 1, dmg: 5, d: '모든 적 5 피해, 점화' }],
  },
  templar: {
    n: '성전사', ico: '⚜️', hp: 116, mp: 55,
    rule: '방어할 때마다 보호막 11을 얻는다(최대 30)',
    skills: [{ id: 'lava', n: '용암 일격', mana: 4, melee: 1, fire: 1, dmg: 7, d: '근접 7 화염 피해, 점화' }],
  },
  warlock: {
    n: '암흑술사', ico: '🌑', hp: 126, mp: 95,
    rule: '마나가 모자라면 스킬 비용을 생명력으로 치른다(마나 1 = 생명력 2). 약화된 적을 쓰러뜨리면 생명력 15% 회복',
    skills: [{ id: 'drain', n: '영혼 흡수', mana: 5, ranged: 1, dmg: 6, d: '원거리 6 피해, 준 피해 절반만큼 회복, 약화' }],
  },
  assassin: {
    n: '독 폭발 암살자', ico: '🗡️', hp: 96, mp: 60,
    rule: '중독은 하나의 수치: 걸 때마다 1씩 오르고(상한 없음), 시간마다 그 수치만큼 피해를 준 뒤 1 줄어든다. 독 격발은 남은 독 피해를 한꺼번에 준다',
    skills: [
      { id: 'viper', n: '독사의 일격', mana: 4, melee: 1, dmg: 7, d: '근접 7 피해 + 중독 4번 걸기(+4)' },
      { id: 'cloud', n: '독구름', mana: 8, aoe: 1, dmg: 0, d: '모든 적 중독 +2 (광역이라 단일 기술의 절반)' },
      { id: 'burst', n: '독 격발', mana: 4, ranged: 1, dmg: 0, d: '대상에게 남은 독 피해 전부(n + (n−1) + … + 1)를 지금 주고, 붕괴 게이지 +수치 × 4. 중독 제거' },
    ],
  },
  scar: {
    n: '상흔술사', ico: '🩸', hp: 100, mp: 36,
    rule: '받은 피해의 15%를 상흔으로 저장(최대 생명력 50%). 피해를 주거나 받으면 분노 +1, 10이면 격노',
    skills: [
      { id: 'scarcut', n: '상흔 베기', mana: 3, melee: 1, dmg: 7, d: '근접 7 피해 + 상흔 절반 소모(×1.5 추가 피해) + 출혈' },
      { id: 'release', n: '상흔 방출', mana: 6, aoe: 1, dmg: 0, d: '상흔 전부 소모, 모든 적에게 상흔 × 0.65 피해' },
    ],
  },
  priest: {
    n: '정화 사제', ico: '✨', hp: 108, mp: 70,
    rule: '디버프를 정화할 때마다 보호(받는 피해 -20%, 보통 행동 약 3번 동안)',
    skills: [
      { id: 'flame', n: '신성한 불꽃', mana: 5, ranged: 1, dmg: 9, fire: 1, d: '원거리 8 화염 피해 + 점화(보통 행동 약 3번 동안)' },
      { id: 'purge', n: '정화의 빛', mana: 6, ranged: 1, dmg: 0, d: '내 디버프 전부 해제, 해제한 수 × 5 피해를 대상에게 + 보호' },
      { id: 'reverse', n: '역전', mana: 3, ranged: 1, dmg: 0, d: '내 약화·취약 1개를 대상에게 옮긴다' },
    ],
  },
};

/* 레벨이 오를 때 오르는 생명력·마나 (기획서 5.2절 표의 절반, 11.4절) */
const LV_GAIN = { berserker: { hp: 6, mp: 2 }, hunter: { hp: 5, mp: 3 }, arcanist: { hp: 4, mp: 4 }, templar: { hp: 5, mp: 3 }, warlock: { hp: 5, mp: 3 }, assassin: { hp: 4, mp: 3 }, priest: { hp: 5, mp: 4 }, scar: { hp: 6, mp: 2 } };
