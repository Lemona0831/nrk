'use strict';
/* ===== 옛 2챕터 「잊힌 지하묘지」 보관 (0.8.0 A2, 2026-10-22) =====
   만든 사람 결정(10월 21일): 2챕터를 「어둠이 가라앉은 거리」로 전면 교체하면서, 옛 지하묘지(군주 · 해골 · 무덤 주술사 · 뼈 쌓는 자 · 굴 파는 시체 · 부푼 시체,
   2챕터 이벤트 · 방 특성 · 강적, 소모품)는 리메이크 후보로 여기에 옮겼다. index.html은 이 파일을 읽지 않는다.
   옛 엔진 코드(js/14 군주 · 뼈 더미, js/30 역할 행동 등)는 js에 그대로 잠들어 있다(1 · 3챕터가 함께 쓰는 해골 · RISE · BURROW · HEX · SWIFT는 data에 남김).
   아래는 옮기기 전 자리(파일:줄)와 그 글이다 */

/* --- data/dungeon.js:238 --- */
ENEMY_NAMES[2] = { bruiser: '무덤지기', shield: '납골당 문지기', archer: '납골당 궁수', healer: '곡하는 사제', summoner: '뼈 엮는 자', minion: '기어 나온 뼈', thief: '도굴꾼', pyre: '장송 영창자', skeleton: '해골 병사', hexer: '무덤 주술사', mason: '뼈 쌓는 자', burrower: '굴 파는 시체', bloat: '부푼 시체', bonewall: '뼈벽' };

/* --- data/dungeon.js:238 --- */
CHAPTERS[2] = {
  n: '잊힌 지하묘지', boss: 'cryptlord', names: ENEMY_NAMES[2], strongFrom: 2, xp: 1.45, gold: 1.35, /* 0.8.0 6단계 보정: 1.55 → 1.45(일반 방 정예 경험치로 2챕터 끝 중앙 Lv12, 앵커 11) */ settleStrong: 30,
  diff: { upper: { hp: 0.75, dmg: 0.51 }, lower: { hp: 0.92, dmg: 0.527 } }, // 10월 9일 결정 7 가(2챕터 완주 10~20%): 적 피해 ×0.85. 이전 dmg 0.60 · 0.62(5.1%). 5,400판 처음부터 흐름에서 1챕터를 깬 434명 가운데 61명(14.1%)
  settleLore: '녹슨 왕관이 뼈 더미 위로 굴러떨어졌다. 더 깊은 곳에서 뜨거운 모래바람이 불어온다.',
  nextLore: '계단 아래로 마른 열기가 올라온다. 벽 틈마다 재가 쌓여 있다.',
  zones: [[6, '무너진 제단 아래'], [11, '납골 회랑'], [12, '마른 세례조'], [18, '이름의 벽'], [23, '왕의 묘실 앞'], [24, '군주의 묘실']],
};

/* --- data/dungeon.js:247 --- */
const BWALL = { hp: 1.0, brk: 30, cut: 0.5, mend: 0.5, wait: 2 }; // 뼈벽: 후열이 받는 한 적 대상 피해 ×cut

/* --- data/dungeon.js:248 --- */
const BLOAT = { me: 4, foes: 3 };                // 부푼 시체: 쓰러질 때 중독

/* --- data/dungeon.js:249 --- */
const INTRO_AT = { skeleton: 1, hexer: 2, burrower: 3, mason: 4, bloat: 9 }; // 0.8.0 6단계: 16층 틀(옛 1 · 3 · 5 · 7 · 13층) // 처음 만남 보장 문 (그 층까지 못 봤으면)

/* --- data/dungeon.js:252 --- */
  hexer: ['손가락에 감긴 실이 내 쪽으로 뻗어 있다.', '조이기는 내 해로운 상태가 여러 가지일수록 아픕니다.'],

/* --- data/dungeon.js:252 --- */
  mason: ['등에 진 바구니에서 뼈가 쏟아진다.', '뼈벽이 서 있으면 후열의 적은 한 적을 노린 공격을 절반만 받습니다. 뼈벽은 붕괴에 약합니다.'],

/* --- data/dungeon.js:252 --- */
  burrower: ['바닥의 흙이 숨을 쉰다.', '땅속의 적은 고를 수 없습니다. 솟구친 직후에는 드러나 취약해집니다.'],

/* --- data/dungeon.js:252 --- */
  bloat: ['배가 터질 듯 부어 있다.', '쓰러지면 터져 중독을 퍼뜨립니다. 불에 타면 터지지 않습니다.'],

/* --- data/dungeon.js:254 --- */
/* 2챕터 테마 무리 (7절). from: 나오는 첫 층 */

/* --- data/dungeon.js:254 --- */
SQUADS.push(
  { id: 'bonepatrol', ch: 2, n: '뼈 순찰', w: 1.2, from: 1, up: [['skeleton'], ['skeleton']], low: [['skeleton', 1], ['skeleton'], ['archer']], vary: [1, ['bruiser', 'shield']] },
  { id: 'diggers', ch: 2, n: '무덤지기 패', w: 1.0, from: 1, up: [['bruiser'], ['skeleton']], low: [['bruiser', 1], ['skeleton'], ['healer']], vary: [1, ['skeleton', 'shield', 'bloat']] },
  { id: 'weave', ch: 2, n: '뼈 엮기', w: 0.8, from: 1, up: [['skeleton'], ['summoner']], low: [['skeleton', 1], ['summoner'], ['healer']], vary: [0, ['skeleton', 'bruiser']] },
  { id: 'knot', ch: 2, n: '저주 매듭', w: 1.2, press: 1, from: 2, up: [['bruiser'], ['hexer']], low: [['shield'], ['hexer', 1], ['hexer']], vary: [0, ['bruiser', 'skeleton', 'bloat']] },
  { id: 'mourn', ch: 2, n: '곡하는 행렬', w: 1.2, from: 3, up: [['skeleton'], ['skeleton'], ['healer']], low: [['skeleton', 1], ['skeleton'], ['healer']], vary: [1, ['skeleton', 'bruiser', 'bloat']] },
  { id: 'robbers', ch: 2, n: '도굴꾼 떼', w: 0.8, from: 3, up: [['thief'], ['thief'], ['archer']], low: [['thief'], ['burrower'], ['archer', 1]], vary: [2, ['archer', 'hexer']] },
  { id: 'burrow', ch: 2, n: '굴 무리', w: 1.0, press: 1, from: 3, up: [['burrower'], ['archer']], low: [['burrower', 1], ['burrower'], ['archer']], vary: [1, ['archer', 'skeleton']] },
  { id: 'dirge', ch: 2, n: '장송 영창', w: 0.8, press: 1, from: 4, up: [['skeleton'], ['pyre']], low: [['shield'], ['skeleton'], ['pyre', 1]], vary: [0, ['bruiser', 'shield', 'skeleton']] },
  { id: 'masonry', ch: 2, n: '뼈벽 공사', w: 1.0, from: 4, up: [['bruiser'], ['mason']], low: [['skeleton'], ['mason', 1], ['archer']], vary: [0, ['bruiser', 'shield', 'skeleton']] },
  { id: 'garrison', ch: 2, n: '납골당 수비대', w: 1.2, press: 1, from: 9, up: [['skeleton', 1], ['mason'], ['hexer']], low: [['skeleton', 1], ['mason'], ['hexer']], vary: [0, ['burrower', 'shield', 'bloat']] },
);

/* --- data/dungeon.js:254 --- */
ENC.treasure2 = [[['shield', 1], ['skeleton']], [['skeleton', 1], ['archer']], [['burrower', 1], ['hexer']]];

/* --- data/dungeon.js:256 --- */
ROOM_MODS.bonepile = { n: '무너진 납골벽', chs: [2], d: '전투가 시작될 때 전열에 뼈 더미 둘이 있습니다. 2라운드 뒤 해골 병사로 일어섭니다.' };

/* --- data/dungeon.js:256 --- */
ROOM_MODS.rotair = { n: '썩은 공기', chs: [2], d: '이 방에서는 중독이 줄지 않습니다.' };

/* --- data/dungeon.js:256 --- */
ROOM_MODS.flooded = { n: '물에 잠긴 바닥', chs: [2], d: '전투가 시작될 때 나와 모든 적이 둔화 1을 안습니다. 물이 차 있어 아무도 땅속에 숨지 못합니다.' };

/* --- data/dungeon.js:259 --- */
ALTARS.push({ id: 'bone', chs: [2], n: '뼈 제단', d: '가방의 소모품 셋을 바치면 2챕터 소모품 둘을 받습니다. 파는 것은 바칠 수 없습니다.' });

/* --- data/dungeon.js:259 --- */
/* 이벤트 여덟 (10.3절, 2챕터) */

/* --- data/dungeon.js:259 --- */
EVENTS.push(
  { id: 'tomb', ch: 2, n: '이름 없는 묘비', lore: '비석의 맨 윗줄만 비어 있다.', opts: [{ id: 'carve', n: '이름을 새긴다', d: '최대 생명력 +5(영구). 다음 전투를 약화 2 · 취약 2를 안고 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonetrader', ch: 2, n: '뼈 상인', lore: '해골 하나가 좌판 앞에 앉아 있다. 금화는 받지 않는다.', opts: [{ id: 'gear', n: '장비를 넘긴다', d: '가방의 장비 하나를 주고 같은 등급 장비 하나를 받습니다.' }, { id: 'cons', n: '소모품을 넘긴다', d: '소모품 셋을 주고 2챕터 소모품 하나를 받습니다(파는 것은 넘길 수 없습니다).' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'coffin', ch: 2, n: '봉인된 관', lore: '사슬이 안쪽에서 당겨진다.', opts: [{ id: 'break', n: '사슬을 끊는다', d: '절반은 희귀 장비. 아니면 다음 전투에 정예 해골 병사가 더해지고, 이기면 희귀 장비를 받습니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'procession', ch: 2, n: '장례 행렬', lore: '촛불 없는 행렬이 지나간다.', opts: [{ id: 'follow', n: '뒤따른다', d: '다음 3개 방 동안 받는 직접 피해 −10%, 주는 피해 −10%.' }, { id: 'block', n: '길을 막는다', d: '다음 전투에 무덤지기 하나가 더해지고, 이기면 골드 30.' }] },
  { id: 'master', ch: 2, n: '잊힌 스승의 묘비', lore: '비문이 당신의 손버릇을 적고 있다.', opts: [{ id: 'read', n: '비문을 읽는다', d: '연 액티브 노드 하나를 되돌려 포인트를 돌려받습니다(가장 바깥의 끝 노드부터).' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'robber', ch: 2, n: '도굴꾼의 시체', lore: '자루 끈이 아직 손에 감겨 있다.', opts: [{ id: 'loot', n: '자루를 뒤진다', d: '골드 30 또는 장비 하나. 다음 전투를 중독 3으로 시작합니다.' }, { id: 'bury', n: '묻어 준다', d: '생명력 플라스크 +1.' }] },
  { id: 'blackwell', ch: 2, n: '검은 샘', lore: '물이 비추는 얼굴이 내 것이 아니다.', opts: [{ id: 'drink', n: '마신다', d: '정화 · 스태미나 플라스크 각 +1. 다음 전투를 취약 2를 안고 시작합니다.' }, { id: 'pass', n: '지나친다', d: '' }] },
  { id: 'bonepipe', ch: 2, n: '뼈 피리', lore: '불지 않았는데 소리가 난다. 아래에서 무언가 대답한다.', opts: [{ id: 'blow', n: '분다', d: '다음 층 문에 강적이 반드시 나옵니다. 골드 20.' }, { id: 'pass', n: '지나친다', d: '' }] },
);

/* --- data/dungeon.js:260 --- */
/* 2챕터 강적 다섯 · 보스 (10월 5일). 무엇을 하는지와 대처는 비공개 문서에만 적는다. upper: 0이면 하층에만 */

/* --- data/dungeon.js:260 --- */
STRONG_FOES.push(
  { id: 'collector', ch: 2, n: '뼈 수집가', en: [['bruiser', 1], ['skeleton'], ['skeleton']], dmg: 0.85 }, // 10월 7일: 호위 해골 둘이 함께 때려 평소 공격을 낮췄다
  { id: 'knight', ch: 2, n: '저주받은 기사', en: [['shield', 1], ['hexer']], hp: 1.1, dmg: 0.9, needs: ['hexer'] },
  { id: 'well', ch: 2, n: '역병 우물지기', en: [['healer', 1], ['shield'], ['skeleton']], hp: 0.8, dmg: 0.6 },
  { id: 'sexton', ch: 2, n: '굴 파는 묘지기', en: [['burrower', 1], ['skeleton'], ['skeleton']], hp: 0.9, upper: 0 },
  { id: 'echo', ch: 2, n: '메아리 망령', en: [['bruiser', 1], ['hexer']], hp: 0.85, upper: 0, needs: ['hexer'] },
);

/* --- data/dungeon.js:260 --- */
Object.assign(FOE_X, {
  collector: { pick: 2, cap: 5, base: 0.38, per: 0.02 },
  knight: { share: 0.5 },
  well: { spray: 3, base: 0.10, per: 0.025 },
  sexton: { aoe: 1.5, vuln: 2, brk: 1.5, chill: 1 },
  echo: { mirror: 0.8, first: 0.5, cap: 0.35, capFirst: 0.25 },
});

/* --- data/dungeon.js:260 --- */
const LORD = { gHp: 1, gDmg: 0.35, read: 6, turns: 2, cut: 0.4, cut2: 0.2, ph: [0.6, 0.3], walls: 1, wallHp: 0.10, wallBrk: 60, wallAoe: 0.5, expose: 2, mendPile: 1.0, mendBare: 0, mendTop: 0.5, hand: 0.85, handChill: 1, fall: 0.08, guards: 1 } /* 10월 7일 · 8일: 군주 몇 값을 낮췄다(21갈래 모두 0승, 사냥꾼 연사 Lv7 이길 수단 없음(35%)이라. 내용은 비공개 문서) */ // 지하묘지의 군주 (뜻은 비공개 문서)

/* --- data/dungeon.js:260 --- */
Object.assign(FOE_INTRO, {
  cryptlord: { n: '지하묘지의 군주', lore: '이 지하묘지에 처음 묻힌 왕. 아직도 신하들의 이름을 부른다.', see: ['벽마다 이름이 새겨져 있다. 맨 아래 줄에 갓 새긴 자국이 있다.', '군주의 발치에서 해골 둘이 일어선다.'] },
  collector: { n: '뼈 수집가', lore: '바구니 가득 뼈를 진 자. 남의 뼈로 제 몸을 덮는다.', see: ['수집가가 해골들 뒤에서 바닥을 훑는다. 등의 바구니가 덜그럭거린다.'] },
  knight: { n: '저주받은 기사', lore: '녹슨 갑옷 틈마다 검은 실이 비어져 나온다.', see: ['기사가 방패를 든다. 방패 안쪽에 이름이 빼곡하다.'] },
  well: { n: '역병 우물지기', lore: '우물 뚜껑을 등에 지고 다니는 자. 뚜껑 아래에서 물이 끓는다.', see: ['우물지기가 국자를 든다. 국자에서 초록 물이 떨어진다.'] },
  sexton: { n: '굴 파는 묘지기', lore: '삽 한 자루로 이 묘지를 다 판 자.', see: ['묘지기가 삽을 바닥에 꽂는다. 발밑이 흔들린다.'] },
  echo: { n: '메아리 망령', lore: '얼굴이 없다. 당신이 움직이면 그것도 움직인다.', see: ['망령이 고개를 기울인다. 당신의 칼끝을 따라 눈이 움직인다.'] },
});

/* --- data/dungeon.js:260 --- */
Object.assign(CODEX, {
  collector: { pick: '수집가가 뼈를 주울수록 몸이 단단해졌다.', shatter: '수집가의 몸에 두른 뼈가 흩어졌다.' },
  knight: { ret: '기사에게 건 것이 나에게 돌아왔다.', stop: '기사가 돌려보내던 것이 멈췄다.' },
  well: { open: '우물이 열리자 몸속의 독이 한꺼번에 끓어올랐다.', spent: '우물이 열린 뒤 독이 모두 빠져나갔다.' },
  sexton: { under: '묘지기가 땅속에 있는 동안 칼이 닿지 않았다.', exposed: '솟구친 묘지기는 잠시 몸을 드러냈다.' },
  echo: { mirror: '망령이 내 공격을 되비췄다.', cut: '망령이 더는 되비추지 못했다.' },
  cryptlord: { carve: '군주가 이름을 새긴 행동은 한동안 힘이 빠졌다.', throne: '군주가 옥좌로 물러나자 뼈벽이 앞을 가렸다.', mend: '무너진 벽이 다시 쌓였다. 바닥의 뼈가 줄었다.', fall: '옥좌가 무너지자 흩어지지 않은 뼈가 한꺼번에 일어섰다.', twoname: '마지막에는 두 이름을 한꺼번에 새겼다.', carvebreak: '새긴 이름이 흐려졌다.' },
});

/* --- data/enemies.js:18 --- */
  hexer:    { n: '무덤 주술사', ico: '🪢', row: 'back', hp: 0.6, dmg: 0.8, spd: 0.9, hit: 0.09 },

/* --- data/enemies.js:18 --- */
  mason:    { n: '뼈 쌓는 자', ico: '🧱', row: 'back', hp: 0.7, dmg: 0.6, spd: 0.8, hit: 0.08 },

/* --- data/enemies.js:18 --- */
  bonewall: { n: '뼈벽', ico: '🧱', row: 'front', hp: 0.7, dmg: 0, spd: 0, hit: 0 }, // 물체: 행동하지 않는다. 생명력은 쌓은 자의 최대 생명력 × BWALL.hp

/* --- data/enemies.js:18 --- */
  burrower: { n: '굴 파는 시체', ico: '🕳️', row: 'front', hp: 0.9, dmg: 1.0, spd: 1.0, hit: 0.12 },

/* --- data/enemies.js:18 --- */
  bloat:    { n: '부푼 시체', ico: '💀', row: 'front', hp: 0.7, dmg: 0.6, spd: 0.8, hit: 0.08 },

/* --- data/enemies.js:31 --- */
  cryptlord: { n: '지하묘지의 군주', ico: '👑', mult: 8, dmgMul: 1.8, hit: 0.12, d: '이 지하묘지에 처음 묻힌 왕. 무엇을 하는지는 겪어 보아야 안다.', lore: '이 지하묘지에 처음 묻힌 왕. 아직도 신하들의 이름을 부른다.' }, // 2챕터 보스 (기믹 상세 · 대처는 비공개 문서) // 10월 9일 결정 7 가: mult 10 → 8, dmgMul 2.2 → 1.8

/* --- data/consumables.js:36 --- */
  lime:      { n: '석회 가루', ico: '⚪', ch: 2, only: 2, vs: 'skeleton', sit: '해골이 다시 일어선다', k: 'norise', tgt: 'enemy', v: 2, max: 2, price: 10, dw: 2, use: 'fight', d: v => '해골 하나의 부활을 ' + v + '라운드 늦춥니다. 뼈 더미에 쓰면 바로, 아직 서 있는 해골에 쓰면 쓰러질 때 적용됩니다.' }, // 4-2: 부활 막기 → 2라운드 늦추기

/* --- data/consumables.js:42 --- */
  goldtooth: { n: '금니', ico: '🦷', ch: 2, sit: '팔아서 골드로', k: 'sell', sell: 20, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },

/* --- data/consumables.js:42 --- */
  ring:      { n: '부장품 반지', ico: '💍', ch: 2, sit: '팔아서 골드로', k: 'sell', sell: 30, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
