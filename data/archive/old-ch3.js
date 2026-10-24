'use strict';
/* ===== 옛 3챕터 「재의 사막 유적」 보관 (0.8.0 A3, 2026-10-22) =====
   만든 사람 결정(10월 21일): 3챕터를 「성벽 아래」로 전면 교체하면서, 옛 재의 사막(재의 여왕 · 왕관 · 시녀 · 잠복자 · 투척병 · 망자 · 술사,
   3챕터 이벤트 · 방 특성 · 강적 · 해의 흐름 BANDS3 · 소모품)은 리메이크 후보로 여기에 옮겼다. index.html은 이 파일을 읽지 않는다.
   옛 엔진 코드(js/14의 3챕터 몸 · 열기 · 강적 · 재의 여왕, js/16의 IFX3 등)는 OLD3 깃발(거짓)로 js에 그대로 잠들어 있다. 옛 3챕터 장비 200종은 data/archive/items_ch3.js.
   아래는 옮기기 전 자리(파일:줄)와 그 글이다 */

/* --- data/dungeon.js:343 --- */
SHRINES.push({ id: 'rest', chs: [3], n: '안식의 성소', d: '쓰러뜨린 적은 다시 일어서지 않습니다.' }, { id: 'firm', chs: [3], n: '굳건함의 성소', d: '예고된 큰 공격으로 받는 피해 −15%.' });

/* --- data/dungeon.js:347 --- */
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

/* --- data/dungeon.js:380 --- */
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

/* --- data/enemies.js:18 --- */
  // 3챕터 (10월 7일, docs/챕터/3챕터.md 6절). 행동 수치는 data/dungeon.js의 LURK · EMBER · WRAP · HAZE · HEAT

/* --- data/enemies.js:35 --- */
  lurker:   { n: '잠복자', ico: '🦂', row: 'front', hp: 0.7, dmg: 1.0, spd: 1.1, hit: 0.10 },
  ember:    { n: '투척병', ico: '☄️', row: 'back', hp: 0.65, dmg: 0.8, spd: 1.0, hit: 0.08 },
  wrapped:  { n: '망자', ico: '🧻', row: 'front', hp: 1.3, dmg: 1.0, spd: 0.9, hit: 0.11 },
  mirage:   { n: '술사', ico: '🔮', row: 'back', hp: 0.6, dmg: 0.7, spd: 0.9, hit: 0.07 },
  crown:    { n: '왕관', ico: '💠', row: 'front', hp: 0.3, dmg: 0, spd: 0, hit: 0 }, // 재의 여왕의 왕관: 행동하지 않는다. 생명력은 여왕의 최대 생명력 × QUEEN.crownHp
  maid:     { n: '시녀', ico: '🕯️', row: 'back', hp: 0.6, dmg: 0.5, spd: 0.9, hit: 0.06 }, // 재의 시녀: 생명력 · 피해는 여왕에게서 (QUEEN)

/* --- data/enemies.js:48 --- */
  queen: { n: '재의 여왕', ico: '👑', mult: 9.41, hit: 0.152, /* 10월 19일(만든 사람 결정 2): 체력 · 피해 ×1.9(4.95 · 0.08 → 9.41 · 0.152. ×1.8에서 신중 71%). 보스에 닿은 판의 승률(신중) 60–70%. 규칙 · 단계는 그대로 */ /* 10월 15일(만든 사람 결정): 4.5 → 4.95(×1.1). 왕관 · 시녀도 비례해 커진다. 더 올리면 강한 구성은 그대로이고 약한 쪽만 깎였다(비공개 측정) */ /* 10월 8일: 0.10 → 0.08 (던전 보스 승률 22% → 29%, 직업 사이 4~40%) */ /* 10월 7일 첫 측정: 8.5 · 0.12는 AI 보스 승률 0%(남은 생명력 평균 75%). 상급 줄이 아직 없어 플레이어 피해가 설계의 가정(1.7~1.9배)만큼 자라지 않았다 */ d: '사르하의 마지막 주인. 무엇을 하는지는 겪어 보아야 압니다.', lore: '불타는 왕국을 재로 굳혀 지킨 자. 아직도 해가 지지 않기를 기다린다.' }, // 3챕터 보스 (기믹 상세 · 대처는 비공개 문서)

/* --- data/consumables.js:36 --- */
  mirror:    { n: '거울 조각', ico: '🪞', ch: 3, only: 3, vs: 'mirage', vsMod: 'haze', sit: '허상이 겹쳐 있다', k: 'unhaze', tgt: 'enemy', max: 2, price: 12, dw: 2, use: 'fight', d: () => '한 적의 허상 한 겹을 걷어 냅니다.' }, // 4-2: 모든 적 · 모든 겹 → 한 적 · 한 겹

/* --- data/consumables.js:46 --- */
  earring:   { n: '금 귀걸이', ico: '🪙', ch: 3, sit: '팔아서 골드로', k: 'sell', sell: 40, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  glassbead: { n: '유리 구슬', ico: '🫧', ch: 3, sit: '팔아서 골드로', k: 'sell', sell: 15, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
