/* 나락의 유산 데이터: 소모품 (0.6a.2, 10월 4일 만든 사람 결정 · docs/기록/0.6a.2-소모품-능력치-기획.md)
   index.html보다 먼저 읽힌다. 소모품 하나는 한 상황을 푼다. 가방에서 바로 쓰고 차례 칸을 쓰지 않는다(한 차례에 CONS_TURN개까지).
   k: 효과 종류(엔진 consApply), v: 수치(vm = 고급 수치, 있으면 고급이 나온다), max: 한 칸에 겹치는 수, price: 상점 값, use: fight(전투 중) · any(언제나) · out(전투 밖), tgt: enemy(적 하나를 고른다)
   sit: 푸는 상황(설명 창 머리), d: 효과 문장(합니다체), dw: 전리품으로 나오는 무게(없으면 1, 파는 것은 0.5). 10월 4일: 플라스크가 차지 않으므로 회복 소모품이 자주 나온다 */
const CONS_TURN = 3; // 한 차례에 쓸 수 있는 소모품 수
const CONS = {
  herb:      { n: '약초 묶음', ico: '🌿', sit: '생명력이 낮다', k: 'heal', v: 0.12, vm: 0.2, max: 5, price: 12, dw: 6, use: 'any', d: v => '생명력을 최대의 ' + Math.round(v * 100) + '% 회복합니다.' },
  bread:     { n: '마른 빵', ico: '🍞', sit: '방 사이에 쉬고 싶다', k: 'heal', v: 0.2, vm: 0.3, max: 5, price: 10, dw: 4, use: 'out', d: v => '전투 밖에서만 씁니다. 생명력을 최대의 ' + Math.round(v * 100) + '% 회복합니다.' },
  leaf:      { n: '각성 잎', ico: '🍃', sit: '스태미나가 바닥났다', k: 'stam', v: 30, max: 5, price: 8, use: 'fight', d: v => '스태미나 +' + v + '.' },
  incense:   { n: '향 한 줌', ico: '🪔', sit: '이번 차례에 손이 모자란다', k: 'quick', max: 3, price: 20, use: 'fight', d: () => '이번 차례에 빠른 칸이 하나 더 생깁니다.' },
  bandage:   { n: '붕대', ico: '🩹', sit: '출혈이 쌓였다', k: 'cure', s: 'bleed', max: 5, price: 8, use: 'any', d: () => '출혈을 모두 지웁니다.' },
  antidote:  { n: '해독초', ico: '🌱', sit: '중독이 쌓였다', k: 'cure', s: 'poison', max: 5, price: 8, use: 'any', d: () => '중독을 모두 지웁니다.' },
  coldwater: { n: '찬물 한 병', ico: '🧊', sit: '화상이 쌓였다', k: 'cure', s: 'ignite', max: 5, price: 8, use: 'any', d: () => '화상을 모두 지웁니다.' },
  bittertea: { n: '쓴 차', ico: '🍵', sit: '저주 · 폭발로 약해졌다', k: 'cure', s: 'weak', max: 5, price: 10, use: 'any', d: () => '약화를 모두 지웁니다.' },
  salve:     { n: '굳은 연고', ico: '🫙', sit: '강타를 맞아 취약해졌다', k: 'cure', s: 'vuln', max: 5, price: 10, use: 'any', d: () => '취약을 모두 지웁니다.' },
  saltcrys:  { n: '소금 결정', ico: '🧂', sit: '둔화로 늦어졌다', k: 'cure', s: 'chill', max: 5, price: 10, use: 'any', d: () => '둔화를 모두 지웁니다.' },
  knot:      { n: '기도 매듭', ico: '🪢', sit: '곧 해로운 상태가 걸린다', k: 'block', max: 3, price: 15, use: 'fight', d: () => '다음에 걸리는 해로운 상태 하나를 막습니다.' },
  bellshard: { n: '종 조각', ico: '🔔', sit: '적이 강타 · 겨누기 · 영창을 모은다', k: 'interrupt', tgt: 'enemy', max: 2, price: 20, use: 'fight', d: () => '한 적이 모으던 강타, 겨눈 한 발, 영창을 끊어 평소 공격으로 바꿉니다.' },
  wetcloth:  { n: '젖은 천', ico: '🧣', sit: '화형이 온다', k: 'halfboom', max: 3, price: 12, use: 'fight', d: () => '이번 라운드에 받는 화형 피해가 절반입니다.' },
  smoke:     { n: '연막', ico: '🌫️', sit: '사수가 겨누고 있다', k: 'blind', max: 3, price: 14, use: 'fight', d: () => '후열 적들의 다음 공격 하나가 빗나갑니다.' },
  stone:     { n: '돌멩이', ico: '🪨', sit: '적이 몸을 낮췄다', k: 'unevade', tgt: 'enemy', max: 5, price: 6, use: 'fight', d: () => '한 적의 몸 낮추기를 풉니다.' },
  crowbar:   { n: '쇠 지렛대', ico: '🔧', sit: '적이 버틴다', k: 'unbrace', tgt: 'enemy', max: 5, price: 8, use: 'fight', d: () => '한 적의 버티기를 풉니다.' },
  dummy:     { n: '미끼 인형', ico: '🪆', sit: '적이 반격 태세다', k: 'decoy', max: 3, price: 12, use: 'fight', d: () => '다음에 받는 반격 하나를 인형이 대신 맞습니다.' },
  hookrope:  { n: '갈고리 줄', ico: '🪝', sit: '적이 동료를 지킨다', k: 'unguard', tgt: 'enemy', max: 3, price: 12, use: 'fight', d: () => '한 적이 다음 행동까지 동료를 지키지 못합니다(방패병의 가로막기, 하수인의 지키기).' },
  blackinc:  { n: '검은 향', ico: '🕯️', sit: '적이 축복을 받았다', k: 'unbless', tgt: 'enemy', max: 3, price: 10, use: 'fight', d: () => '한 적의 축복(강화)을 지웁니다.' },
  silash:    { n: '침묵의 재', ico: '⚱️', sit: '사제가 치유하려 한다', k: 'noheal', tgt: 'enemy', max: 3, price: 12, use: 'fight', d: () => '한 적의 다음 치유 하나가 실패합니다.' },
  saltring:  { n: '소금 원', ico: '⭕', sit: '소환사가 부르려 한다', k: 'nosummon', tgt: 'enemy', max: 3, price: 12, use: 'fight', d: () => '한 적의 다음 소환 하나가 실패합니다.' },
  scrapbait: { n: '쇠붙이 미끼', ico: '🥫', sit: '도둑이 훔치려 한다', k: 'antisteal', max: 2, price: 10, use: 'fight', d: () => '이 전투에서 도둑은 쇠붙이만 훔쳐 갑니다.' },
  birdlime:  { n: '끈끈이', ico: '🍯', sit: '도둑이 달아나려 한다', k: 'sticky', tgt: 'enemy', max: 2, price: 12, use: 'fight', d: () => '한 적의 다음 달아나기가 실패합니다.' },
  relic:     { n: '깨진 성물', ico: '💥', sit: '적이 많다', k: 'aoe', v: 8, vm: 13, max: 3, price: 15, use: 'fight', d: v => '적 모두에게 피해 ' + v + '(레벨에 따라 오름).' },
  dagger:    { n: '투척 단검', ico: '🗡️', sit: '후열에 손이 닿지 않는다', k: 'dart', tgt: 'enemy', v: 12, vm: 20, max: 5, price: 10, use: 'fight', d: v => '한 적에게 피해 ' + v + '(레벨에 따라 오름). 후열에도 닿습니다.' },
  flash:     { n: '섬광 가루', ico: '✨', sit: '붕괴 게이지가 크다', k: 'brk', tgt: 'enemy', v: 30, vm: 45, max: 3, price: 14, use: 'fight', d: v => '한 적에게 붕괴 +' + v + '.' },
  whet:      { n: '숫돌', ico: '🪓', sit: '한 방이 모자란다', k: 'whet', v: 0.25, max: 3, price: 12, use: 'fight', d: v => '다음 공격 피해 +' + Math.round(v * 100) + '%.' },
  chalk:     { n: '표식 분필', ico: '🖍️', sit: '한 적을 빨리 잡아야 한다', k: 'mark', tgt: 'enemy', v: 0.3, max: 3, price: 12, use: 'fight', d: v => '한 적이 받는 다음 피해 +' + Math.round(v * 100) + '%.' },
  charm:     { n: '나무 부적', ico: '🧿', sit: '큰 공격을 받아야 한다', k: 'guard1', v: 0.4, max: 3, price: 12, use: 'fight', d: v => '다음에 받는 공격 하나의 피해 −' + Math.round(v * 100) + '%.' },
  lampoil:   { n: '등잔 기름', ico: '🛢️', sit: '어둠 속이라 예고가 보이지 않는다', k: 'unmod', mods: ['dark'], max: 2, price: 10, use: 'fight', d: () => '이 전투에서 어둠을 걷어 냅니다.' },
  sandbag:   { n: '모래 주머니', ico: '👝', sit: '방 특성이 괴롭다', k: 'unmod', mods: ['bloodpool', 'candle', 'ceiling', 'bell', 'narrow'], max: 2, price: 14, use: 'fight', d: () => '이 전투에서 방 특성 하나(피 웅덩이, 촛불 제단, 무너지는 천장, 종소리, 좁은 회랑)를 끕니다.' },
  smokebomb: { n: '연기 폭탄', ico: '💨', sit: '질 것 같다', k: 'escape', max: 2, price: 25, use: 'fight', d: () => '보스전이 아니면 반드시 물러납니다(방은 다시 이겨야 합니다).' },
  reliq:     { n: '빈 성물함', ico: '📦', sit: '전리품을 더 원한다', k: 'lootx', max: 2, price: 18, use: 'fight', d: () => '이 전투에서 쓰러뜨린 적의 전리품 확률이 두 배입니다.' },
  silver:    { n: '은화 주머니', ico: '💰', sit: '팔아서 골드로', k: 'sell', sell: 15, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  goblet:    { n: '녹슨 성배', ico: '🏆', sit: '팔아서 골드로', k: 'sell', sell: 25, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  candlest:  { n: '촛대', ico: '🕎', sit: '팔아서 골드로', k: 'sell', sell: 35, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  beads:     { n: '묵주 구슬', ico: '📿', sit: '팔아서 골드로', k: 'sell', sell: 10, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
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
/* 2챕터 소모품 (10월 5일, docs/챕터/2챕터.md 11절). ch: 그 챕터부터 전리품에 나온다(상점은 다음 챕터 것까지 판다). vs: 그 역할과 싸운 뒤 전리품 무게 ×1.5 */
Object.assign(CONS, {
  lime:      { n: '석회 가루', ico: '⚪', ch: 2, vs: 'skeleton', sit: '해골이 다시 일어선다', k: 'norise', tgt: 'enemy', max: 5, price: 10, use: 'fight', d: () => '한 적에게 뿌립니다. 그 적은 쓰러져도 다시 일어서지 않습니다. 뼈 더미에 쓰면 바로 흩어집니다.' },
  oiljar:    { n: '기름 단지', ico: '🏺', ch: 2, vs: 'skeleton', sit: '뼈 더미가 여럿이다', k: 'burnpiles', max: 2, price: 18, use: 'fight', d: () => '뼈 더미를 모두 태우고, 적 모두에게 화상 2를 겁니다.' },
  mugwort:   { n: '쑥 다발', ico: '🌾', ch: 2, vs: 'hexer', sit: '해로운 상태가 여러 가지다', k: 'trim', max: 5, price: 12, use: 'any', d: () => '내 해로운 상태가 종류마다 1씩 줄어듭니다.' },
  tamper:    { n: '흙 다지개', ico: '🔨', ch: 2, vs: 'burrower', sit: '적이 땅속에 숨었다', k: 'unearth', max: 3, price: 14, use: 'fight', d: () => '땅속의 적을 모두 끌어냅니다. 솟구치려던 공격이 끊기고, 끌려 나온 적은 취약 1을 받습니다.' },
  pick:      { n: '곡괭이', ico: '⛏️', ch: 2, vs: 'mason', sit: '뼈벽이 후열을 가린다', k: 'wallbreak', tgt: 'enemy', max: 3, price: 12, use: 'fight', d: () => '뼈벽 하나에 붕괴 30을 줍니다.' },
  frostmoss: { n: '찬 이끼', ico: '❄️', ch: 2, sit: '적이 너무 빠르다', k: 'slow', tgt: 'enemy', max: 3, price: 12, use: 'fight', d: () => '한 적에게 둔화 2를 겁니다.' },
  charcloth: { n: '숯 천', ico: '😷', ch: 2, vs: 'bloat', sit: '시체가 터지려 한다', k: 'nobloat', max: 2, price: 10, use: 'fight', d: () => '이 전투에서 터지는 시체의 중독이 나에게 오지 않습니다.' },
  goldtooth: { n: '금니', ico: '🦷', ch: 2, sit: '팔아서 골드로', k: 'sell', sell: 20, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  ring:      { n: '부장품 반지', ico: '💍', ch: 2, sit: '팔아서 골드로', k: 'sell', sell: 30, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
});
/* 2챕터에서 무게가 바뀌는 1챕터 소모품 (11.3절): 상황이 드문 것은 낮추고, 조이기 · 썩은 화살 · 부푼 시체의 답은 높인다 */
for (const [k, w] of [['coldwater', 0.6], ['blackinc', 0.6], ['hookrope', 0.6], ['birdlime', 0.6], ['bittertea', 1.5], ['salve', 1.5], ['antidote', 1.5]]) CONS[k].dw2 = w;
CONS.silash.d = () => '한 적의 다음 치유 · 곡하기 하나가 실패합니다.';
CONS.wetcloth.d = () => '이번 라운드에 받는 영창의 큰 한 방(화형 · 장송곡) 피해가 절반입니다.';
CONS.sandbag.mods.push('bonepile', 'rotair', 'flooded'); CONS.sandbag.d = () => '이 전투에서 방 특성 하나(피 웅덩이, 촛불 제단, 무너지는 천장, 종소리, 좁은 회랑, 무너진 납골벽, 썩은 공기, 물에 잠긴 바닥)를 끕니다.';
/* 3챕터 소모품 (10월 7일, docs/챕터/3챕터.md 12절). vsMod: 그 방 특성과 싸운 뒤 전리품 무게 ×2. vs3: 3챕터에서 그 역할과 싸운 뒤 ×2. dw3: 3챕터 전리품 무게 */
Object.assign(CONS, {
  awning:    { n: '차양 천', ico: '⛱️', ch: 3, vsMod: 'noon', sit: '열기가 차오른다', k: 'cool', v: 30, max: 3, price: 16, use: 'fight', d: v => '이 전투의 열기를 ' + v + ' 내립니다.' },
  mirror:    { n: '거울 조각', ico: '🪞', ch: 3, vs: 'mirage', vsMod: 'haze', sit: '허상이 겹쳐 있다', k: 'unhaze', max: 3, price: 12, use: 'fight', d: () => '모든 적의 허상을 걷어 냅니다.' },
  hourglass: { n: '작은 모래시계', ico: '⏳', ch: 3, sit: '적이 세는 숫자가 다 되어 간다', k: 'rewind', tgt: 'enemy', max: 2, price: 18, dw: 0.5, use: 'fight', d: () => '한 적이 세는 숫자 칩(영창 포함)을 두 칸 되돌립니다.' },
  sap:       { n: '선인장 수액', ico: '🌵', ch: 3, vs: 'ember', sit: '화상을 안고 다쳤다', k: 'healcure', s: 'ignite', v: 0.08, vm: 0.12, max: 5, price: 14, dw: 3, use: 'any', d: v => '생명력을 최대의 ' + Math.round(v * 100) + '% 회복하고 화상을 모두 지웁니다.' },
  compass:   { n: '사막 나침반', ico: '🧭', ch: 3, sit: '문 뒤를 알 수 없다', k: 'reveal', max: 2, price: 12, dw: 0.5, use: 'out', d: () => '이 층과 다음 층 문의 숨은 보상이 모두 보입니다.' },
  earring:   { n: '금 귀걸이', ico: '🪙', ch: 3, sit: '팔아서 골드로', k: 'sell', sell: 40, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
  glassbead: { n: '유리 구슬', ico: '🫧', ch: 3, sit: '팔아서 골드로', k: 'sell', sell: 15, max: 5, price: 0, use: 'none', d: () => '쓰지 못합니다. 상점에서 팝니다.' },
});
/* 3챕터에서 무게가 바뀌는 것 (12.3절): 1 · 2챕터의 파는 것은 3챕터 것과 바꾸고, 화상의 답은 높인다. 2챕터 소모품은 3챕터 상황의 답(vs3) */
for (const [k, w] of [['silver', 0], ['goblet', 0], ['candlest', 0], ['beads', 0], ['goldtooth', 0], ['ring', 0], ['coldwater', 1.5], ['blackinc', 1], ['lime', 0.5], ['pick', 0.3], ['charcloth', 0.3], ['mugwort', 0.8]]) CONS[k].dw3 = w;
CONS.tamper.vs3 = 'lurker'; CONS.oiljar.vs3 = 'wrapped'; CONS.coldwater.vs3 = 'ember';
CONS.wetcloth.d = () => '이번 라운드에 받는 영창의 큰 한 방(화형 · 장송곡)과 열풍 피해가 절반입니다.';
CONS.stone.sit = '적이 몸을 낮췄다 · 허상이 있다'; CONS.stone.d = () => '한 적의 몸 낮추기나 허상 한 겹을 풉니다.';
CONS.bellshard.d = () => '한 적이 모으던 강타, 겨눈 한 발, 영창을 끊어 평소 공격으로 바꿉니다. 숨은 적은 고를 수 없습니다.';
CONS.blackinc.d = () => '한 적의 축복(강화)이나 받은 불씨를 지웁니다.';
CONS.sandbag.mods.push('alley', 'pillar', 'shade', 'brazier', 'drums', 'haze', 'sandstorm'); CONS.sandbag.d = () => '이 전투에서 방 특성 하나(피 웅덩이, 촛불 제단, 무너지는 천장, 종소리, 좁은 회랑, 무너진 납골벽, 썩은 공기, 물에 잠긴 바닥, 무너진 골목, 무너지는 기둥, 오아시스 그늘, 불씨 화로, 북소리, 아지랑이, 모래폭풍)를 끕니다. 작열하는 한낮은 끄지 못합니다.';
const SHOP_CONS = { n: 5, always: ['herb'] }; // 상점은 소모품 다섯 가지를 판다(약초 묶음은 늘)
