/* 나락의 유산 데이터: 방 구성, 고정 상황
   index.html보다 먼저 읽힌다. 값만 두고, 계산은 index.html에서 한다. */
const ROOMS = [
  { n: '방 1', en: [['bruiser'], ['bruiser']], drop: 'chalice' },
  { n: '방 2', en: [['shield'], ['shield'], ['healer']] },
  { n: '방 3', en: [['bomber'], ['bomber'], ['bruiser']], drop: 'pulse' },
  { n: '방 4', en: [['summoner'], ['minion'], ['minion']] },
  { n: '방 5 (막힘 구간)', en: [['shield', 1], ['healer', 1], ['bruiser', 1]], block: 1 },
  { n: '방 6 (샘)', spring: 1 },
  { n: '방 7', en: [['archer', 1], ['archer'], ['bomber']], drop: 'ledger' },
  { n: '방 8', en: [['bruiser'], ['healer'], ['summoner']] },
  { n: '보스', boss: 1 },
];

const SCEN = [
  { id: 'S1', n: '강타와 치유가 겹친다', d: '돌격병이 강타를 충전했고(중독 4), 치유사가 다친 방패병을 치유하려 한다. 나는 취약 상태, 상흔 30.',
    en: [['bruiser', 0, { intent: 'heavy', poison: 4 }], ['shield', 0, { hp: .5 }], ['healer', 0, { intent: 'heal' }]], p: { hp: .9, st: 50, scar: 30, s: { vuln: 1 } } },
  { id: 'S2', n: '자폭병 두 기', d: '자폭병 둘이 다음 행동에 폭발한다(각 중독 3). 사수가 뒤에 있다. 나는 약화 상태.',
    en: [['bomber', 0, { intent: 'explode', poison: 3 }], ['bomber', 0, { intent: 'explode', poison: 3 }], ['archer']], p: { hp: .85, scar: 15, s: { weak: 1 } } },
  { id: 'S3', n: '소환 러시', d: '소환사 뒤에 하수인 셋. 마나가 60%, 나는 출혈 상태, 상흔 20.',
    en: [['summoner'], ['minion'], ['minion'], ['minion']], p: { hp: .8, mp: .6, scar: 20, s: { bleed: 1 } } },
  { id: 'S4', n: '붕괴 직전의 정예', d: '정예 돌격병의 붕괴 게이지가 70% 찼고 강타를 충전 중이다(중독 5). 스태미나 45.',
    en: [['bruiser', 1, { intent: 'heavy', brk: .7, poison: 5 }], ['archer']], p: { hp: .9, st: 45, scar: 10 } },
  { id: 'S5', n: '독 늪 한가운데', d: '늪의 어머니 체력 40%, 내 중독 8중첩, 하수인 하나.',
    boss: 'mother', bossHp: .4, en: [['minion']], p: { hp: .8, poison: 8 } },
];
