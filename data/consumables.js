/* 나락의 유산 데이터: 소모품 (0.6a.2, 10월 4일 만든 사람 결정 · docs/기록/0.6a.2-소모품-능력치-기획.md)
   index.html보다 먼저 읽힌다. 소모품 하나는 한 상황을 푼다. 가방에서 바로 쓰고 차례 칸을 쓰지 않는다(한 차례에 CONS_TURN개까지).
   k: 효과 종류(엔진 consApply), v: 수치(vm = 고급 수치, 있으면 고급이 나온다), max: 한 칸에 겹치는 수, price: 상점 값, use: fight(전투 중) · any(언제나) · out(전투 밖), tgt: enemy(적 하나를 고른다)
   sit: 푸는 상황(설명 창 머리), d: 효과 문장(합니다체), dw: 전리품으로 나오는 무게(없으면 1, 파는 것은 0.5). 10월 4일: 플라스크가 차지 않으므로 회복 소모품이 자주 나온다 */
const CONS_TURN = 1; // 한 차례에 쓸 수 있는 소모품 수 (10월 14일 개편 2단계: 3 → 1)
const CONS_FIGHT = { normal: 5, hard: 3 }; // 한 전투에 쓸 수 있는 소모품 수 (각인 넉넉한 손 +2)
const CONS_BREW = { herb: { flask: 'life', normal: 4, hard: 5 }, leaf: { flask: 'stam', normal: 3, hard: 4 } }; // 전투 밖에서 N개로 플라스크 한 칸(고급은 2개로 센다). 10월 14일 개편 3단계
const CONS_CH = { unmod: { normal: 3, hard: 2 }, lootx: { normal: 3, hard: 2 }, escape: { normal: 2, hard: 1 } }; // 챕터당 사용 횟수(효과 종류 k별: 방 특성 끄기 · 전리품 늘리기 · 물러나기)
/* 10월 14일 개편 4단계: 53종 → 20종(+ 판매품). docs/제안/소모품-개편-설계안-v2-2026-10-14.md 3절.
   피해를 주지 않고 기회를 만든다. 성능은 장비 · 플라스크 · 막기의 0.2에서 0.3배(심하면 0.1배). only: 그 챕터에서만 나오는 챕터 전용 */
const CONS = {
  // 보급
  herb:      { n: '약초 묶음', ico: '🌿', sit: '생명력이 낮다', k: 'heal', v: 0.03, max: 5, price: 12, dw: 6, use: 'any', d: v => '최대 생명력의 ' + Math.round(v * 100) + '%를 회복합니다. 생명력 플라스크 재료입니다.' },
  leaf:      { n: '각성 잎', ico: '🍃', sit: '스태미나가 바닥났다', k: 'stam', v: 12, max: 5, price: 8, dw: 3, use: 'fight', d: v => '스태미나 +' + v + '. 스태미나 플라스크 재료입니다.' },
  // 해제 · 방어
  cleanse:   { n: '정화 약', ico: '🧴', sit: '해로운 상태가 쌓였다', k: 'cleanse', v: 2, max: 2, price: 10, dw: 3, use: 'any', d: v => '가장 많이 쌓인 내 해로운 상태 하나를 ' + v + ' 줄입니다.' },
  mugwort:   { n: '쑥 다발', ico: '🌾', vs: 'hexer', sit: '해로운 상태가 한꺼번에 걸렸다', k: 'trim', max: 2, price: 12, use: 'any', d: () => '내 해로운 상태가 종류마다 1씩 줄어듭니다.' },
  charm:     { n: '나무 부적', ico: '🧿', sit: '큰 공격을 받아야 한다', k: 'guard1', v: 0.15, max: 2, price: 12, use: 'fight', d: v => '다음에 받는 공격 하나의 피해 −' + Math.round(v * 100) + '%.' },
  knot:      { n: '기도 매듭', ico: '🪢', sit: '곧 해로운 상태가 걸린다', k: 'block', max: 2, price: 15, use: 'fight', d: () => '다음에 걸리는 해로운 상태 하나를 막습니다.' },
  // 기회 만들기 (피해 없음)
  flash:     { n: '섬광 가루', ico: '✨', sit: '붕괴 게이지가 크다', k: 'brk', tgt: 'enemy', v: 10, vm: 15, max: 2, price: 14, use: 'fight', d: v => '한 적에게 붕괴 +' + v + '.' },
  chalk:     { n: '표식 분필', ico: '🖍️', sit: '한 적을 빨리 잡아야 한다', k: 'mark', tgt: 'enemy', v: 0.1, max: 2, price: 12, use: 'fight', d: v => '한 적이 받는 다음 직접 피해 한 번 +' + Math.round(v * 100) + '%.' },
  dagger:    { n: '올가미', ico: '➰', sit: '적이 너무 빠르다', k: 'slow', tgt: 'enemy', v: 1, vm: 2, max: 2, price: 10, dw: 2, use: 'fight', d: v => '한 적에게 둔화 +' + v + '. 후열에도 닿습니다. 뼈 더미와 뼈벽은 제외하고, 피해는 주지 않습니다.' }, // 옛 투척 단검. 저장본 호환을 위해 id는 그대로
  relic:     { n: '흩뿌리는 성물', ico: '💫', sit: '적이 많다', k: 'scatter', v: 0.1, vm: 0.15, max: 2, price: 15, use: 'fight', d: v => '적 모두의 다음 공격 피해 −' + Math.round(v * 100) + '%. 피해는 주지 않습니다.' }, // 옛 깨진 성물
  // 기믹 완화
  bellshard: { n: '종 조각', ico: '🔔', sit: '적이 강타 · 겨누기 · 영창을 모은다', k: 'interrupt', tgt: 'enemy', v: 0.2, max: 2, price: 20, use: 'fight', d: v => '강타·겨누기·영창을 모으는 한 적의 그 큰 공격 피해 −' + Math.round(v * 100) + '%. 끊지는 않습니다. 보스에게도 씁니다.' }, // 4-2: 끊기 → 피해 감소(기믹 완화 0.4배까지)
  smoke:     { n: '연막', ico: '🌫️', sit: '사수가 겨누고 있다', k: 'blind', v: 0.2, max: 2, price: 14, use: 'fight', d: v => '후열 적들의 다음 공격 하나의 피해 −' + Math.round(v * 100) + '%.' }, // 4-2: 빗나감 → −20%
  hinder:    { n: '방해 부적', ico: '📜', sit: '사제가 치유하거나 소환사가 부르려 한다', k: 'hinder', tgt: 'enemy', v: 0.5, max: 2, price: 12, use: 'fight', d: v => '치유하는 적의 다음 치유량 −' + Math.round(v * 100) + '%, 또는 소환하는 적의 다음 소환 한 번을 막습니다. 보스는 고를 수 없습니다.' }, // 옛 침묵의 재 · 소금 원
  hookrope:  { n: '갈고리 줄', ico: '🪝', sit: '적이 동료를 지킨다', k: 'unguard', tgt: 'enemy', max: 2, price: 12, use: 'fight', d: () => '한 적의 지키기·가로막기·몸 낮추기·버티기 가운데 하나를 한 번 풉니다.' }, // 4-2: 돌멩이 · 쇠 지렛대를 합쳤다
  dummy:     { n: '미끼 인형', ico: '🪆', sit: '적이 반격 태세다', k: 'decoy', v: 0.2, max: 2, price: 12, use: 'fight', d: v => '이번 라운드에 반격과 후열 사격으로 받는 피해 −' + Math.round(v * 100) + '%.' }, // 4-2: 반격 하나 대신 맞기 → −20%
  smokebomb: { n: '연기 폭탄', ico: '💨', sit: '질 것 같다', k: 'escape', max: 1, price: 25, dw: 0.5, use: 'fight', d: () => '보스전이 아니면 반드시 물러납니다. 그 방은 다시 이겨야 합니다.' },
  // 횟수 제한 (CONS_CH)
  sandbag:   { n: '모래 주머니', ico: '👝', sit: '방 특성이 괴롭다', k: 'unmod', mods: ['dark', 'bloodpool', 'candle', 'ceiling', 'bell', 'narrow', 'bonepile', 'rotair', 'flooded', 'alley', 'pillar', 'shade', 'brazier', 'drums', 'haze', 'sandstorm'], max: 1, price: 14, dw: 0.2, shopP: 0.4, use: 'fight', d: () => '이 전투에서 방 특성 하나(어둠, 피 웅덩이, 촛불 제단, 무너지는 천장, 종소리, 좁은 회랑, 무너진 납골벽, 썩은 공기, 물에 잠긴 바닥, 무너진 골목, 무너지는 기둥, 오아시스 그늘, 불씨 화로, 북소리, 아지랑이, 모래폭풍)를 끕니다. 작열하는 한낮은 끄지 못합니다.' }, // 옛 등잔 기름(어둠)을 합쳤다. 10월 14일 만든 사람 결정: "끄기"는 두고 등장률을 낮춘다(dw 0.5 → 0.2, 상점 진열 후보 40%)
  reliq:     { n: '빈 성물함', ico: '📦', sit: '전리품을 더 원한다', k: 'lootx', v: 1.5, max: 1, price: 18, dw: 0.5, use: 'fight', d: v => '이 전투에서 쓰러뜨린 적의 전리품 확률 ×' + v + '.' }, // 4-2: ×2 → ×1.5
  // 챕터 전용 (only: 그 챕터에서만 나온다)
  lime:      { n: '석회 가루', ico: '⚪', ch: 2, only: 2, vs: 'skeleton', sit: '해골이 다시 일어선다', k: 'norise', tgt: 'enemy', v: 2, max: 2, price: 10, dw: 2, use: 'fight', d: v => '해골 하나의 부활을 ' + v + '라운드 늦춥니다. 뼈 더미에 쓰면 바로, 아직 서 있는 해골에 쓰면 쓰러질 때 적용됩니다.' }, // 4-2: 부활 막기 → 2라운드 늦추기
  mirror:    { n: '거울 조각', ico: '🪞', ch: 3, only: 3, vs: 'mirage', vsMod: 'haze', sit: '허상이 겹쳐 있다', k: 'unhaze', tgt: 'enemy', max: 2, price: 12, dw: 2, use: 'fight', d: () => '한 적의 허상 한 겹을 걷어 냅니다.' }, // 4-2: 모든 적 · 모든 겹 → 한 적 · 한 겹
  // 판매품: 전리품 주머니에 들어가 상점에 들어갈 때 골드로 바뀐다
  silver:    { n: '은화 주머니', ico: '💰', sit: '팔아서 골드로', k: 'sell', sell: 15, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  goblet:    { n: '녹슨 성배', ico: '🏆', sit: '팔아서 골드로', k: 'sell', sell: 25, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  candlest:  { n: '촛대', ico: '🕎', sit: '팔아서 골드로', k: 'sell', sell: 35, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  beads:     { n: '묵주 구슬', ico: '📿', sit: '팔아서 골드로', k: 'sell', sell: 10, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  goldtooth: { n: '금니', ico: '🦷', ch: 2, sit: '팔아서 골드로', k: 'sell', sell: 20, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  ring:      { n: '부장품 반지', ico: '💍', ch: 2, sit: '팔아서 골드로', k: 'sell', sell: 30, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  earring:   { n: '금 귀걸이', ico: '🪙', ch: 3, sit: '팔아서 골드로', k: 'sell', sell: 40, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  glassbead: { n: '유리 구슬', ico: '🫧', ch: 3, sit: '팔아서 골드로', k: 'sell', sell: 15, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
};
/* 3챕터 전리품 무게: 1 · 2챕터의 판매품은 3챕터 것과 바꾼다 */
for (const k of ['silver', 'goblet', 'candlest', 'beads', 'goldtooth', 'ring']) CONS[k].dw3 = 0;
/* 없앤 소모품(10월 14일 개편 4단계, 설계안 8절): [이름, 바뀌는 소모품, 개수 배율] 또는 [이름, null, 옛 가격](판매가만큼 골드).
   이름은 지난 기록 화면에서 쓴다. 고급 약초는 약초 2개(consBagFix) */
const CONS_GONE = {
  bread: ['마른 빵', 'herb', 1], incense: ['향 한 줌', null, 20],
  bandage: ['붕대', 'cleanse', 1], antidote: ['해독초', 'cleanse', 1], coldwater: ['찬물 한 병', 'cleanse', 1], bittertea: ['쓴 차', 'cleanse', 1], salve: ['굳은 연고', 'cleanse', 1], saltcrys: ['소금 결정', 'cleanse', 1],
  wetcloth: ['젖은 천', null, 12], blackinc: ['검은 향', null, 10],
  stone: ['돌멩이', 'hookrope', 1], crowbar: ['쇠 지렛대', 'hookrope', 1],
  silash: ['침묵의 재', 'hinder', 1], saltring: ['소금 원', 'hinder', 1],
  scrapbait: ['쇠붙이 미끼', 'dummy', 1], birdlime: ['끈끈이', 'dummy', 1],
  whet: ['숫돌', 'chalk', 1], lampoil: ['등잔 기름', 'sandbag', 1],
  oiljar: ['기름 단지', null, 18], tamper: ['흙 다지개', null, 14], pick: ['곡괭이', null, 12], frostmoss: ['찬 이끼', null, 12], charcloth: ['숯 천', null, 10],
  awning: ['차양 천', null, 16], hourglass: ['작은 모래시계', null, 18], sap: ['선인장 수액', null, 14], compass: ['사막 나침반', null, 12],
};
/* 전리품 (적 하나마다): p 무언가 떨어질 확률, rolls 굴리는 수, gold · cons 나뉘는 몫, n 소모품 개수 [최소, 최대], hi 고급 확률.
   flask: 플라스크 한 칸을 따로 떨굴 확률. 10월 4일 만든 사람 결정: 1% 이하의 아주 드문 확률(방을 이길 때 차던 규칙은 없앴다) */
const LOOT = {
  normal: { p: 0.35, rolls: 1, gold: 0.4, cons: 0.6, flask: 0.003, n: [1, 2], hi: 0.1 },
  elite:  { p: 0.65, rolls: 1, gold: 0.3, cons: 0.7, flask: 0.006, n: [1, 3], hi: 0.3 },
  strong: { p: 1, rolls: 3, gold: 0.35, cons: 0.65, flask: 0.01, n: [2, 3], hi: 0.6 }, // 강적 (10월 4일 하이 리스크 하이 리턴)
  big:    { p: 1, rolls: 2, gold: 0.35, cons: 0.65, flask: 0.01, n: [2, 3], hi: 0.5 },
  goldPer: lv => 4 + 2 * lv, // 골드 한 번 = 4 + 2 × 몬스터 레벨 (방 보상 10~40과 견줌)
  lowerHi: 0.15, // 하층에서 고급 확률 더
};
const CAMP_SHOP = { mul: [1.2, 1.8], n: 3, stock: 1 }; // 야영지 정비 상인(10월 14일 개편 5단계, 설계안 Q3): 물가 1.2에서 1.8배(0.1 단위 무작위), 약초(상점과 같은 재고)와 다른 소모품 3종 한 개씩
const SHOP_CONS = { n: 5, always: ['herb'], herb: { normal: 5, hard: 3 }, stock: 2 }; // 상점은 약초와 다른 소모품 네 가지를 판다. 10월 14일 개편 5단계: 약초 재고 5개(가혹 3개), 다른 소모품은 종류마다 2개
/* 소모품 가방 (10월 14일 개편 1단계, docs/제안/소모품-개편-설계안-v2-2026-10-14.md 2절): 장비 가방과 따로 CONS_BAG칸.
   칸마다 무게 한도 CONS_SLOT_W, 한 칸에 담기는 수(max) = ⌊무게 한도 / 무게⌋. 판매품(use none)은 가방이 아니라 전리품 주머니(run.pouch)에 들어가 상점에서 골드로 바뀐다 */
const CONS_BAG = 5, CONS_SLOT_W = 5;
for (const k of Object.keys(CONS)) CONS[k].w = CONS[k].use === 'none' ? 0 : 2;
for (const k of ['herb', 'leaf']) CONS[k].w = 1; // 보급: 한 칸에 5개
for (const k of ['sandbag', 'reliq']) CONS[k].w = 3; // 한 칸에 1개
CONS.smokebomb.w = 5; // 한 칸에 1개
for (const k of Object.keys(CONS)) if (CONS[k].w > 0) CONS[k].max = Math.max(1, Math.floor(CONS_SLOT_W / CONS[k].w));
