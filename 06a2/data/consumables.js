/* 나락의 유산 데이터: 소모품 (0.6a.2, 10월 4일 만든 사람 결정 · docs/0.6a.2-소모품-능력치-기획.md)
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
  bellshard: { n: '종 조각', ico: '🔔', sit: '적이 강타 · 겨누기를 모은다', k: 'interrupt', tgt: 'enemy', max: 2, price: 20, use: 'fight', d: () => '한 적이 모으던 강타나 겨눈 한 발을 평소 공격으로 바꿉니다.' },
  wetcloth:  { n: '젖은 천', ico: '🧣', sit: '자폭병이 터지려 한다', k: 'halfboom', max: 3, price: 12, use: 'fight', d: () => '이번 라운드에 받는 폭발 피해가 절반입니다.' },
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
  big:    { p: 1, rolls: 2, gold: 0.35, cons: 0.65, flask: 0.01, n: [2, 3], hi: 0.5 },
  goldPer: lv => 4 + 2 * lv, // 골드 한 번 = 4 + 2 × 몬스터 레벨 (방 보상 10~40과 견줌)
  lowerHi: 0.15, // 하층에서 고급 확률 더
};
const SHOP_CONS = { n: 5, always: ['herb'] }; // 상점은 소모품 다섯 가지를 판다(약초 묶음은 늘)
