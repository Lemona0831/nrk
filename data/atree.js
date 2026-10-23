/* 0.8.0 액티브 방사 트리 데이터 (10월 16일 0.8.0 2단계, docs/제안/0.8.0-1단계-트리설계-2026-10-16.md 1-2 · 1-3 · 8절)
   마검사는 8절 승인 초안 그대로(스킬 22 + 강화 23 = 45노드). 다른 8직업은 js/23-tree-engine.js의 atBuild가 지금 스킬 칸(SKILLS2의 갈래 · 줄 · par)으로 임시 트리를 만든다(tmp: 1).
   한 줄: [id, 갈래, 고리, r, 칸, 이웃(가운데 S), 유산(스킬 노드) 또는 강화 정의].
   강화 m: set(맨 위 필드), fxSet([{k, s?, ...바꿀 값}]: 같은 k(와 s)의 효과 숫자를 바꾼다), fxAdd(효과 더하기), cond({ off, when: resp · alt2 · kw:상태>=n }: 비용 −off, 바닥 1, 내 차례에 한 번).
   강화는 그 스킬을 끼웠을 때만 일한다. src는 합쳐진 옛 칸(기록용) */
const ATREE_DEF = {
  spellblade: {
    br: { 염검: 0, 혈인: 120, 마갑: 240 }, lane: { LL: -22, L: -12, C: 0, R: 12, RR: 22 }, // M5-0 보정 4: 부채꼴 60° 균등이라 칸 각도를 ±22° 안으로
    /* 0.8.0 M5-0 (10월 19일 만든 사람, 전면 개편 2-1): 부채꼴 6. 갈래 A 염검 · B 혈인 · C 마갑, 경계 AB 혈염(혈인×염검) · BC 죄인의 피(혈인×마갑) · CA 유산의 불(마갑×염검)
       M5-0 보정 4(10월 20일 만든 사람): 여섯 부채꼴 같은 크기. 갈래 6칸(1고리 개시 2 + 리듬 1 · 2고리 2칸 2–3 · 3고리 2칸 3–4), 경계 5칸(2고리 입구 + 둘째 2 · 2, 3고리 둘 + 승부수 3 · 3 · 4), 부채꼴마다 강화 3.
       자른 갈래 칸(① 꼬리표 중복 → ② M3 히트맵 개방률 → ③ 값 띠): 혈인 피의 낙인 · 혈풍참, 염검 작열검 · 끊는 불길, 마갑 반향 주문 · 균열 주문 · 회류참. 마갑 전개는 3고리 비용 3, 마갑탄은 띠 예외(보정 2) */
    sec: { A: '염검', AB: '혈염', B: '혈인', BC: '죄인의 피', C: '마갑', CA: '유산의 불' },
    /* M5-0c 화면(만든 사람 3절): 1고리 반지름을 늘려 가운데 뭉침을 없앤다(r → 화면 반지름), 길 이름은 갈래 안 좌우(a 왼쪽 · b 오른쪽) */
    rad: { 1: 125, 2: 185, 3: 255, 4: 320, 5: 395, 6: 470 }, paths: { 혈인: { a: '처형', b: '싣기' }, 염검: { a: '원거리', b: '칼불' }, 마갑: { a: '포격', b: '교대 붕괴' } },
    /* 0.8.0 M5-0c(10월 20일 만든 사람, nrk-private 마검사 재설계 1–5절): 레벨 역산 구조 · 갈래마다 길 둘 · 대사 승부수 고정.
       갈래: 1고리 첫 스킬 쌍(excl)이 길을 고르고 2고리 · 3고리가 길마다 한 칸(L = 길 a, R = 길 b, path). 2고리는 어느 첫 스킬에서든, 3고리는 어느 2고리에서든 열린다.
       혈인 a 처형(혈흔 베기 → 혈향 → 붉은 처형) · b 싣기(피의 낙인 → 피 먹인 칼 → 피안개), 염검 a 원거리(불씨 투척 → 불의 표식 → 업화) · b 칼불(염화 베기 → 잔화 → 화염 난도),
       마갑 a 포격(마갑탄 → 마갑 휘두르기 → 마갑 방출) · b 교대 붕괴(마갑참 → 교차 주문 → 마검 일섬).
       만든 사람 답(같은 날, 측정 뒤): 길마다 1고리 · 2고리를 베기 하나 · 주문 하나로 엇갈리게(베기 길은 2고리가 주문, 주문 길은 2고리가 베기). 기본 공격이 베기라 베기만 있는 길은 교대 상대가 없었다. 경계는 그대로, 혈염 3고리 핏불 번짐 → 핏불 장막(신규). 승부수 후보 제도는 폐지(대사 승부수 셋이 늘 그 자리) */
    skills: [
      ['sb_bleedcut', '혈인', 1, 1, 'LL', ['S'], 2, { excl: 'sb_bloodmark', path: 'a' }], ['sb_bloodmark', '혈인', 1, 1, 'RR', ['S'], 2, { excl: 'sb_bleedcut', path: 'b' }], ['sb_blooddrop', '혈인', 1, 2, 'C', ['sb_bleedcut', 'sb_bloodmark'], 1],
      ['sb_taste', '혈인', 2, 3, 'L', ['sb_bleedcut', 'sb_bloodmark'], 2, { path: 'a' }], ['sb_boil', '혈인', 2, 3, 'R', ['sb_bleedcut', 'sb_bloodmark'], 2, { path: 'b' }],
      ['sb_crimson', '혈인', 3, 5, 'L', ['sb_taste', 'sb_boil'], 4, { path: 'a' }], ['sb_bloodfog', '혈인', 3, 5, 'R', ['sb_taste', 'sb_boil'], 3, { path: 'b' }],
      ['sb_ember', '염검', 1, 1, 'LL', ['S'], 2, { excl: 'sb_flamecut', path: 'a' }], ['sb_flamecut', '염검', 1, 1, 'RR', ['S'], 2, { excl: 'sb_ember', path: 'b' }], ['sb_spark', '염검', 1, 2, 'C', ['sb_ember', 'sb_flamecut'], 1],
      ['sb_brand', '염검', 2, 3, 'L', ['sb_ember', 'sb_flamecut'], 2, { path: 'a' }], ['sb_char', '염검', 2, 3, 'R', ['sb_ember', 'sb_flamecut'], 2, { path: 'b' }],
      ['sb_hellfire', '염검', 3, 5, 'L', ['sb_brand', 'sb_char'], 4, { path: 'a' }], ['sb_inferno', '염검', 3, 5, 'R', ['sb_brand', 'sb_char'], 3, { path: 'b' }],
      ['sb_bolt', '마갑', 1, 1, 'LL', ['S'], 2, { excl: 'sb_bladeward', path: 'a' }], ['sb_bladeward', '마갑', 1, 1, 'RR', ['S'], 2, { excl: 'sb_bolt', path: 'b' }], ['sb_shard', '마갑', 1, 2, 'C', ['sb_bolt', 'sb_bladeward'], 1],
      ['sb_shell', '마갑', 2, 3, 'L', ['sb_bolt', 'sb_bladeward'], 2, { path: 'a' }], ['sb_beatcut', '마갑', 2, 3, 'R', ['sb_bolt', 'sb_bladeward'], 2, { path: 'b' }],
      ['sb_spellguard', '마갑', 3, 5, 'L', ['sb_shell', 'sb_beatcut'], 3, { path: 'a' }], ['sb_finale', '마갑', 3, 5, 'R', ['sb_shell', 'sb_beatcut'], 4, { path: 'b' }],
      /* 경계: 입구(2고리)는 양쪽 갈래에서 첫 스킬을 하나씩(어느 쪽이든) 연 뒤. 둘째(2고리) → 3고리 둘 → 대사 승부수(비용 4, 늘 나온다) */
      ['sb_bloodfire', '혈염', 2, 3, 'C', ['sb_ember', 'sb_flamecut', 'sb_bleedcut', 'sb_bloodmark'], 2, { requires: [['sb_ember', 'sb_flamecut'], ['sb_bleedcut', 'sb_bloodmark']] }], ['sb_hotedge', '혈염', 2, 4, 'C', ['sb_bloodfire'], 2],
      ['sb_searcut', '혈염', 3, 5, 'L', ['sb_hotedge'], 3], ['sb_searveil', '혈염', 3, 5, 'R', ['sb_hotedge'], 3], ['sb_kalpa', '혈염', 3, 6, 'C', ['sb_searcut', 'sb_searveil'], 4],
      ['sb_bloodmail', '죄인의 피', 2, 3, 'C', ['sb_bleedcut', 'sb_bloodmark', 'sb_bladeward', 'sb_bolt'], 2, { requires: [['sb_bleedcut', 'sb_bloodmark'], ['sb_bladeward', 'sb_bolt']] }], ['sb_sinstrike', '죄인의 피', 2, 4, 'C', ['sb_bloodmail'], 2],
      ['sb_film', '죄인의 피', 3, 5, 'L', ['sb_sinstrike'], 3], ['sb_shackle', '죄인의 피', 3, 5, 'R', ['sb_sinstrike'], 3], ['sb_sinwall', '죄인의 피', 3, 6, 'C', ['sb_film', 'sb_shackle'], 4],
      ['sb_heatmail', '유산의 불', 2, 3, 'C', ['sb_bladeward', 'sb_bolt', 'sb_ember', 'sb_flamecut'], 2, { requires: [['sb_bladeward', 'sb_bolt'], ['sb_ember', 'sb_flamecut']] }], ['sb_embercut', '유산의 불', 2, 4, 'C', ['sb_heatmail'], 2],
      ['sb_embermail', '유산의 불', 3, 5, 'L', ['sb_embercut'], 3], ['sb_cindermail', '유산의 불', 3, 5, 'R', ['sb_embercut'], 3], ['sb_firebody', '유산의 불', 3, 6, 'C', ['sb_embermail', 'sb_cindermail'], 4],
      /* M5-0 보정 5 P3 결합 칸(마감 값 그대로): 원 바깥 별도 자리, 이웃이 아니라 꼬리표 조건(reqTags)으로 열린다. 판마다 셋 중 둘 */
      ['sb_counterburn', '결합', 2, 4, 'C', [], 2, { reqTags: { 화상: 2, 흘리기: 1 }, ang: 30 }], ['sb_bloodfist', '결합', 2, 4, 'C', [], 2, { reqTags: { 출혈: 2, 기본공격연동: 1 }, ang: 150 }], ['sb_tricolor', '결합', 2, 4, 'C', [], 2, { reqTags: { 출혈: 1, 화상: 1, 보호막: 1 }, ang: 270 }],
    ],
    vars: {
      /* M5-0c(10월 20일 만든 사람): 스킬마다 변형 둘(둘 다 제시, 판마다 무작위 제시 없음). [id, 이름, 문장, 바꿈, 꼬리표, { v }]
         v 'deep' 깊게 = 같은 길을 세게(빠르기 · 대상 · 조건, 순수 숫자는 갈래마다 둘까지), v 'link' 잇기 = 다른 빌드의 꼬리표 하나를 더해 경계 · 결합 칸으로 가는 다리 */
      sb_bleedcut: [
        ['sbv_bleedcut_fast', '스치는 칼', '빠른 칸이 됩니다. 피해 10 → 9.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 9 }] }, ['빠름'], { v: 'deep' }],
        ['sbv_bleedcut_burn', '불붙은 상처', '화상 2를 더 겁니다. 출혈 5 → 3.', { fxSet: [{ k: 'st', s: 'bleed', n: 3 }], fxAdd: [{ k: 'st', s: 'ignite', n: 2 }] }, ['화상'], { v: 'link' }]],
      sb_bloodmark: [
        ['sbv_mark_fast', '서두른 낙인', '빠른 칸이 됩니다. 피해 7 → 5.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['빠름'], { v: 'deep' }],
        ['sbv_mark_ward', '핏빛 방패 낙인', '보호막 +7을 두릅니다. 피해 7 → 3.', { fxSet: [{ k: 'dmg', n: 3 }], fxAdd: [{ k: 'ward', n: 7 }] }, ['보호막'], { v: 'link' }]],
      sb_blooddrop: [
        ['sbv_drop_kill', '핏방울 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치'], { v: 'deep' }],
        ['sbv_drop_edge', '피 묻히기', '칼에 출혈 3을 싣습니다(다음 기본 공격에).', { fxAdd: [{ k: 'imbue', s: 'bleed', n: 3 }] }, ['싣기', '기본공격연동'], { v: 'link' }]],
      sb_taste: [
        ['sbv_taste_trail', '혈흔 추적', '대상의 출혈이 5 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=5' } }, ['출혈'], { v: 'deep' }],
        ['sbv_taste_resp', '받아낸 혈향', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_boil: [
        ['sbv_boil_slow', '들끓는 피', '보통 빠르기가 됩니다. 칼에 싣는 출혈 7 → 11.', { set: { time: 'normal' }, fxSet: [{ k: 'imbue', s: 'bleed', n: 11 }] }, [], { v: 'deep' }],
        ['sbv_boil_fire', '불 먹인 칼', '벤 적에게 화상 3을 겁니다.', { fxAdd: [{ k: 'st', s: 'ignite', n: 3 }] }, ['화상'], { v: 'link' }]],
      sb_crimson: [
        ['sbv_crim_normal', '서두른 처형', '보통 빠르기가 됩니다. 피해 13 → 9.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 9 }] }, [], { v: 'deep' }],
        ['sbv_crim_ward', '처형의 갑주', '보호막 +10을 두릅니다.', { fxAdd: [{ k: 'ward', n: 10 }] }, ['보호막'], { v: 'link' }]],
      sb_bloodfog: [
        ['sbv_fog_front', '짙은 안개', '전열만 덮습니다. 출혈 5 → 8.', { set: { tgt: 'front' }, fxSet: [{ k: 'st', s: 'bleed', n: 8 }] }, [], { v: 'deep' }],
        ['sbv_fog_ash', '잿빛 안개', '화상 2를 더 겁니다. 출혈 5 → 3.', { fxSet: [{ k: 'st', s: 'bleed', n: 3 }], fxAdd: [{ k: 'st', s: 'ignite', n: 2 }] }, ['화상'], { v: 'link' }]],
      sb_ember: [
        ['sbv_ember_front', '불씨 흩뿌리기', '전열 모두를 칩니다. 피해 10 → 7. 화상 5 → 3.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'ignite', n: 3 }] }, ['광역'], { v: 'deep' }],
        ['sbv_ember_blood', '피 섞인 불씨', '출혈 2를 더 겁니다. 화상 5 → 3.', { fxSet: [{ k: 'st', s: 'ignite', n: 3 }], fxAdd: [{ k: 'st', s: 'bleed', n: 2 }] }, ['출혈'], { v: 'link' }]],
      sb_flamecut: [
        ['sbv_fc_fast', '빠른 달굼', '빠른 칸이 됩니다. 피해 12 → 9.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 9 }] }, ['빠름'], { v: 'deep' }],
        ['sbv_fc_counter', '맞불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면(흘리기 직후) 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_spark: [
        ['sbv_spark_kill', '불티 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치'], { v: 'deep' }],
        ['sbv_spark_ward', '불티 방패', '보호막 +5를 두릅니다. 피해 11 → 8.', { fxSet: [{ k: 'dmg', n: 8 }], fxAdd: [{ k: 'ward', n: 5 }] }, ['보호막'], { v: 'link' }]],
      sb_brand: [
        ['sbv_brand_heat', '타는 표식', '대상의 화상이 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:ignite>=3' } }, ['화상'], { v: 'deep' }],
        ['sbv_brand_blood', '핏빛 표식', '출혈 2를 더 겁니다. 화상 4 → 2.', { fxSet: [{ k: 'st', s: 'ignite', n: 2 }], fxAdd: [{ k: 'st', s: 'bleed', n: 2 }] }, ['출혈'], { v: 'link' }]],
      sb_char: [
        ['sbv_char_slow', '잔화 일격', '보통 빠르기가 됩니다. 피해 11 → 16, 화상 1마다 피해 +3.5 → +3.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 16 }, { k: 'exploit', s: 'ignite', per: 3 }] }, [], { v: 'deep' }],
        ['sbv_char_ward', '재 두른 칼', '보호막 +8을 두릅니다. 피해 11 → 8.', { fxSet: [{ k: 'dmg', n: 8 }], fxAdd: [{ k: 'ward', n: 8 }] }, ['보호막'], { v: 'link' }]],
      sb_hellfire: [
        ['sbv_hell_normal', '불벼락', '보통 빠르기가 됩니다. 피해 31 → 22.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 22 }] }, [], { v: 'deep' }],
        ['sbv_hell_resp', '받아낸 업화', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_inferno: [
        ['sbv_inf_front', '난도 휩쓸기', '전열 모두를 벱니다. 한 타 피해 9 → 4.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 4 }] }, ['광역'], { v: 'deep' }],
        ['sbv_inf_blood', '피불 난도', '한 타마다 출혈 1을 더 겁니다. 화상 2 → 1.', { fxSet: [{ k: 'st', s: 'ignite', n: 1 }], fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, ['출혈'], { v: 'link' }]],
      sb_bolt: [
        ['sbu_barrage', '방벽 포격', '보호막 비례 피해 0.5 → 1, 상한 12 → 18.', { fxSet: [{ k: 'wardDmg', per: 1, cap: 18 }] }, [], { v: 'deep' }],
        ['sbv_bolt_fire', '달군 탄', '화상 2를 겁니다. 피해 12 → 8.', { fxSet: [{ k: 'dmg', n: 8 }], fxAdd: [{ k: 'st', s: 'ignite', n: 2 }] }, ['화상'], { v: 'link' }]],
      sb_bladeward: [
        ['sbu_counter', '맞받아 베기', '교대면 보호막 +4.', { fxAdd: [{ k: 'alt', ward: 4 }] }, ['교대'], { v: 'deep' }],
        ['sbv_bw_blood', '피 묻은 마갑', '출혈 2를 겁니다. 피해 15 → 12.', { fxSet: [{ k: 'dmg', n: 12 }], fxAdd: [{ k: 'st', s: 'bleed', n: 2 }] }, ['출혈'], { v: 'link' }]],
      sb_shard: [
        ['sbv_shard_kill', '파편 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치'], { v: 'deep' }],
        ['sbv_shard_fire', '불꽃 파편', '화상 1을 겁니다. 피해 12 → 9.', { fxSet: [{ k: 'dmg', n: 9 }], fxAdd: [{ k: 'st', s: 'ignite', n: 1 }] }, ['화상'], { v: 'link' }]],
      sb_shell: [
        ['sbv_shell_slow', '무거운 마갑', '보통 빠르기가 됩니다. 피해 6 → 10, 보호막 13 → 17.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 10 }, { k: 'ward', n: 17 }] }, [], { v: 'deep' }],
        ['sbv_shell_fire', '불 두른 마갑', '칼에 화상 3을 싣습니다.', { fxAdd: [{ k: 'imbue', s: 'ignite', n: 3 }] }, ['화상'], { v: 'link' }]],
      sb_beatcut: [
        ['sbv_beat_fast', '날랜 교차', '빠른 칸이 됩니다. 피해 16 → 12.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 12 }] }, ['빠름'], { v: 'deep' }],
        ['sbv_beat_blood', '피 교차', '출혈 2를 겁니다. 피해 16 → 13.', { fxSet: [{ k: 'dmg', n: 13 }], fxAdd: [{ k: 'st', s: 'bleed', n: 2 }] }, ['출혈'], { v: 'link' }]],
      sb_spellguard: [
        ['sbv_sg_front', '모은 방출', '전열만 칩니다. 피해 12 → 15.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 15 }] }, [], { v: 'deep' }],
        ['sbv_sg_fire', '타오르는 방출', '화상 3을 겁니다. 피해 12 → 8.', { fxSet: [{ k: 'dmg', n: 8 }], fxAdd: [{ k: 'st', s: 'ignite', n: 3 }] }, ['화상'], { v: 'link' }]],
      sb_finale: [
        ['sbv_fin_normal', '빠른 일섬', '보통 빠르기가 됩니다. 피해 33 → 25.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 25 }] }, [], { v: 'deep' }],
        ['sbu_release', '갑주 해방', '먼저 보호막 18 · 보호 1을 두르고, 남은 보호막을 모두 태워 피해로 바꿉니다(×1.5).', { fxAdd: [{ k: 'wardFirst', n: 18, protect: 1 }, { k: 'wardBurn', mul: 1.5 }] }, ['보호막'], { v: 'link' }]],
      sb_bloodfire: [
        ['sbu_bf_fast', '번지는 핏불', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_bf_resp', '받아낸 핏불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_hotedge: [
        ['sbv_he_fast', '달아오른 손놀림', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_he_ward', '달군 칼막', '보호막 +6을 두릅니다.', { fxAdd: [{ k: 'ward', n: 6 }] }, ['보호막'], { v: 'link' }]],
      sb_searcut: [
        ['sbv_sc_fast', '혈염 찌르기', '빠른 칸이 됩니다. 피해 30 → 21.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 21 }] }, ['빠름'], { v: 'deep' }],
        ['sbv_sc_resp', '받아친 혈염', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_searveil: [
        ['sbv_sv_fast', '서두른 장막', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_sv_alt', '박자 장막', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대'], { v: 'link' }]],
      sb_kalpa: [
        ['sbv_kalpa_fast', '순간의 겁화', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_kalpa_alt', '박자 겁화', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대'], { v: 'link' }]],
      sb_bloodmail: [
        ['sbu_bm_fast', '서두른 갑주', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_bm_resp', '받아낸 갑주', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_sinstrike: [
        ['sbv_si_fast', '날랜 일격', '빠른 칸이 됩니다. 피해 11 → 7.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 7 }] }, ['빠름'], { v: 'deep' }],
        ['sbv_si_fire', '불붙은 일격', '화상 2를 겁니다. 출혈 2 → 1.', { fxSet: [{ k: 'st', s: 'bleed', n: 1 }], fxAdd: [{ k: 'st', s: 'ignite', n: 2 }] }, ['화상'], { v: 'link' }]],
      sb_film: [
        ['sbv_film_fast', '서두른 피막', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbu_film_resp', '받아낸 피', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_shackle: [
        ['sbu_shackle_fast', '서두른 족쇄', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_sh_alt', '박자 족쇄', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대'], { v: 'link' }]],
      sb_sinwall: [
        ['sbv_sw_fast', '서두른 벽', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_sw_resp', '받아낸 벽', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_heatmail: [
        ['sbu_hm_fast', '단숨의 열', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_hm_resp', '받아낸 열', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_embercut: [
        ['sbu_ash_fast', '털어 낸 재', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_ec_blood', '핏물 잿불', '출혈 3을 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 3 }] }, ['출혈'], { v: 'link' }]],
      sb_embermail: [
        ['sbv_em_fast', '서두른 잿불', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_em_resp', '받아낸 잿불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응', '흘리기'], { v: 'link' }]],
      sb_cindermail: [
        ['sbv_cm_fast', '서두른 불씨', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_cm_blood', '피 묻은 불씨', '출혈 3을 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 3 }] }, ['출혈'], { v: 'link' }]],
      sb_firebody: [
        ['sbv_fb_fast', '순간의 불', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['sbv_fb_alt', '박자의 불', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대'], { v: 'link' }]],
      /* P4 (d) 변종(유지): 판마다 10%로 하나가 그 스킬의 변형 제시에 셋째로 섞인다. 값 띠 상한 +15%까지, 대가가 크다(mut). 승부수에 걸려도 승부수는 그대로 나온다 */
      sb_mutants: [
        ['sbm_kalpa_bulgwi', '불귀', '겁화의 주는 피해 +100% → +130%. 대가: 받는 피해 +30% → +60%.', { fxSet: [{ k: 'sbBlaze', hit: 1.3, inc: 0.6 }] }, ['혈염'], { mut: 1, on: 'sb_kalpa' }],
        ['sbm_bleedcut_frenzy', '피의 폭주', '피해 10 → 16, 출혈 5 → 8. 대가: 나에게 출혈 3.', { fxSet: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'bleed', n: 8 }], fxAdd: [{ k: 'meSt', s: 'bleed', n: 3 }] }, ['출혈'], { mut: 1, on: 'sb_bleedcut' }],
        ['sbm_shell_overheat', '과열 마갑', '보호막 13 → 18. 대가: 나에게 화상 3.', { fxSet: [{ k: 'ward', n: 18 }], fxAdd: [{ k: 'meSt', s: 'ignite', n: 3 }] }, ['보호막'], { mut: 1, on: 'sb_shell' }]],
    },
  },
  /* 0.8.0 M5-1(10월 20일 만든 사람 설계지 + 07:40 보완): 파수꾼 액티브 재설계. M5-0c 규격 — 갈래 3 × 길 둘 + 리듬 칸, 경계 5칸(대사 승부수 고정), 결합 칸 3(판마다 둘), 변형 스킬마다 둘.
     옛 사다리 트리(5단계 52노드)의 배치는 버리고 스킬 수치 결정은 살렸다(D14). 성벽 a 수비 태세 · b 방패 가격, 파쇄 a 공격 태세 · b 내리 찍기, 전열 장악 a 개기식 · b 사슬의 검 */
  warden: {
    br: { 성벽: 0, 파쇄: 120, '전열 장악': 240 }, lane: { LL: -22, L: -12, C: 0, R: 12, RR: 22 },
    sec: { A: '성벽', AB: '공성추', B: '파쇄', BC: '기둥 파쇄', C: '전열 장악', CA: '용맹의 투지' },
    rad: { 1: 125, 2: 185, 3: 255, 4: 320, 5: 395, 6: 470 }, paths: { 성벽: { a: '수비 태세', b: '방패 가격' }, 파쇄: { a: '공격 태세', b: '내리 찍기' }, '전열 장악': { a: '개기식', b: '사슬의 검' } },
    skills: [
      ['w_dstance', '성벽', 1, 1, 'LL', ['S'], 2, { excl: 'w_shieldhit', path: 'a' }], ['w_shieldhit', '성벽', 1, 1, 'RR', ['S'], 2, { excl: 'w_dstance', path: 'b' }], ['w_pray', '성벽', 1, 2, 'C', ['w_dstance', 'w_shieldhit'], 1],
      ['w_stand', '성벽', 2, 3, 'L', ['w_dstance', 'w_shieldhit'], 2, { path: 'a' }], ['w_hold', '성벽', 2, 3, 'R', ['w_dstance', 'w_shieldhit'], 2, { path: 'b' }],
      ['w_citadel', '성벽', 3, 5, 'L', ['w_stand', 'w_hold'], 4, { path: 'a' }], ['w_beyond', '성벽', 3, 5, 'R', ['w_stand', 'w_hold'], 3, { path: 'b' }],
      ['s_astance', '파쇄', 1, 1, 'LL', ['S'], 2, { excl: 's_slam', path: 'a' }], ['s_slam', '파쇄', 1, 1, 'RR', ['S'], 2, { excl: 's_astance', path: 'b' }], ['s_regret', '파쇄', 1, 2, 'C', ['s_astance', 's_slam'], 1],
      ['s_march', '파쇄', 2, 3, 'L', ['s_astance', 's_slam'], 2, { path: 'a' }], ['s_cut', '파쇄', 2, 3, 'R', ['s_astance', 's_slam'], 2, { path: 'b' }],
      ['s_ruin', '파쇄', 3, 5, 'L', ['s_march', 's_cut'], 3, { path: 'a' }], ['s_fall', '파쇄', 3, 5, 'R', ['s_march', 's_cut'], 3, { path: 'b' }],
      ['f_sweep', '전열 장악', 1, 1, 'LL', ['S'], 2, { excl: 'f_chainblade', path: 'a' }], ['f_chainblade', '전열 장악', 1, 1, 'RR', ['S'], 2, { excl: 'f_sweep', path: 'b' }], ['f_stomp', '전열 장악', 1, 2, 'C', ['f_sweep', 'f_chainblade'], 1],
      ['w_shove', '전열 장악', 2, 3, 'L', ['f_sweep', 'f_chainblade'], 2, { path: 'a' }], ['f_drag', '전열 장악', 2, 3, 'R', ['f_sweep', 'f_chainblade'], 2, { path: 'b' }],
      ['f_collapse', '전열 장악', 3, 5, 'L', ['w_shove', 'f_drag'], 3, { path: 'a' }], ['f_hook', '전열 장악', 3, 5, 'R', ['w_shove', 'f_drag'], 3, { path: 'b' }],
      /* 경계 [Claude 초안](입구 · 둘째 · 3고리 둘: 공격 2 · 강화/방어 2) + 대사 승부수(만든 사람) */
      ['w_flare', '공성추', 2, 3, 'C', ['w_dstance', 'w_shieldhit', 's_astance', 's_slam'], 2, { requires: [['w_dstance', 'w_shieldhit'], ['s_astance', 's_slam']] }], ['w_rebuild', '공성추', 2, 4, 'C', ['w_flare'], 2],
      ['w_breach', '공성추', 3, 5, 'L', ['w_rebuild'], 3], ['w_rampart', '공성추', 3, 5, 'R', ['w_rebuild'], 3], ['w_siege', '공성추', 3, 6, 'C', ['w_breach', 'w_rampart'], 4],
      ['f_topple', '기둥 파쇄', 2, 3, 'C', ['s_astance', 's_slam', 'f_sweep', 'f_chainblade'], 2, { requires: [['s_astance', 's_slam'], ['f_sweep', 'f_chainblade']] }], ['s_lean', '기둥 파쇄', 2, 4, 'C', ['f_topple'], 2],
      ['f_rampart', '기둥 파쇄', 3, 5, 'L', ['s_lean'], 3], ['s_gapwatch', '기둥 파쇄', 3, 5, 'R', ['s_lean'], 3], ['s_quake', '기둥 파쇄', 3, 6, 'C', ['f_rampart', 's_gapwatch'], 4],
      ['f_charge', '용맹의 투지', 2, 3, 'C', ['f_sweep', 'f_chainblade', 'w_dstance', 'w_shieldhit'], 2, { requires: [['f_sweep', 'f_chainblade'], ['w_dstance', 'w_shieldhit']] }], ['w_spikes', '용맹의 투지', 2, 4, 'C', ['f_charge'], 2],
      ['f_storm', '용맹의 투지', 3, 5, 'L', ['w_spikes'], 3], ['w_armor', '용맹의 투지', 3, 5, 'R', ['w_spikes'], 3], ['w_valor', '용맹의 투지', 3, 6, 'C', ['f_storm', 'w_armor'], 4],
      /* 결합 칸 [Claude 초안]: 원 바깥(부채꼴 경계선 바깥 끝), 꼬리표 조건, 판마다 셋 중 둘 */
      ['w_turncoat', '결합', 2, 4, 'C', [], 2, { reqTags: { 태세: 2 }, ang: 30 }], ['s_hammerhand', '결합', 2, 4, 'C', [], 2, { reqTags: { 기본공격연동: 2, 붕괴: 1 }, ang: 150 }], ['f_chainpull', '결합', 2, 4, 'C', [], 2, { reqTags: { 원거리: 1, 보호막: 1 }, ang: 270 }],
    ],
    vars: {
      /* 스킬마다 변형 둘(둘 다 제시): v 'deep' 깊게 = 같은 길을 세게, v 'link' 잇기 = 그 스킬에 없던 다른 빌드의 꼬리표를 더해 경계 · 결합 칸으로. [Claude 초안] */
      w_dstance: [
        ['wv_ds_ward', '굳은 태세', '켤 때 보호막 +8을 더 두릅니다.', { fxAdd: [{ k: 'ward', n: 8 }] }, [], { v: 'deep' }],
        ['wv_ds_basic', '맞받는 태세', '켤 때 다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      w_shieldhit: [
        ['wv_sh_fast', '날랜 가격', '빠른 칸이 됩니다. 피해 8 → 6.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 6 }] }, ['빠름'], { v: 'deep' }],
        ['wv_sh_brk', '부수는 가격', '붕괴 +15. 피해 8 → 6.', { fxSet: [{ k: 'dmg', n: 6 }], fxAdd: [{ k: 'brk', n: 15 }] }, ['붕괴'], { v: 'link' }]],
      w_pray: [
        ['wv_pr_more', '깊은 기도', '회복 3% → 4%(수비 태세면 8%).', { fxSet: [{ k: 'wdPray', n: 0.04 }] }, [], { v: 'deep' }],
        ['wv_pr_ward', '기도의 막', '보호막 +6을 함께 두릅니다.', { fxAdd: [{ k: 'ward', n: 6 }] }, ['보호막'], { v: 'link' }]],
      w_stand: [
        ['wv_st_fast', '서두른 버티기', '빠른 칸이 됩니다. 보호막 상한의 45% → 35%.', { set: { time: 'fast' }, fxSet: [{ k: 'wardFill', to: 0.35 }] }, ['빠름'], { v: 'deep' }],
        ['wv_st_wst', '태세의 버팀', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      w_hold: [
        ['wv_ho_ward', '두터운 막기', '보호막이 15 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ward>=15' } }, [], { v: 'deep' }],
        ['wv_ho_brk', '막고 꺾기', '붕괴 +18.', { fxAdd: [{ k: 'brk', n: 18 }] }, ['붕괴'], { v: 'link' }]],
      w_citadel: [
        ['wv_ci_normal', '서두른 철옹성', '보통 빠르기가 됩니다.', { set: { time: 'normal' } }, [], { v: 'deep' }],
        ['wv_ci_wst', '태세의 성채', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      w_beyond: [
        ['wv_be_normal', '빠른 너머', '보통 빠르기가 됩니다. 피해 15 → 11.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 11 }] }, [], { v: 'deep' }],
        ['wv_be_basic', '너머의 박자', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      s_astance: [
        ['wv_as_basic', '거센 태세', '켤 때 다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, [], { v: 'deep' }],
        ['wv_as_ward', '버티는 공세', '켤 때 보호막 +8.', { fxAdd: [{ k: 'ward', n: 8 }] }, ['보호막'], { v: 'link' }]],
      s_slam: [
        ['wv_sl_slow', '무거운 내리 찍기', '느린 행동이 됩니다. 피해 13 → 19.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 19 }] }, [], { v: 'deep' }],
        ['wv_sl_basic', '찍고 이어 치기', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      s_regret: [
        ['wv_rg_kill', '회한 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치'], { v: 'deep' }],
        ['wv_rg_brk', '회한의 일격', '붕괴 +11. 피해 7 → 5.', { fxSet: [{ k: 'dmg', n: 5 }], fxAdd: [{ k: 'brk', n: 11 }] }, ['붕괴'], { v: 'link' }]],
      s_march: [
        ['wv_ma_long', '긴 행군', '3차례 → 4차례.', { fxSet: [{ k: 'wdMarch', n: 4 }] }, [], { v: 'deep' }],
        ['wv_ma_ward', '방패 든 걸음', '보호막 6 → 12.', { fxSet: [{ k: 'ward', n: 12 }] }, ['보호막'], { v: 'link' }]],
      s_cut: [
        ['wv_cu_fast', '빠른 끊기', '빠른 칸이 됩니다. 피해 13 → 9.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 9 }] }, ['빠름'], { v: 'deep' }],
        ['wv_cu_basic', '끊고 잇기', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      s_ruin: [
        ['wv_ru_normal', '서두른 박살', '보통 빠르기가 됩니다. 피해 19 → 13.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 13 }] }, [], { v: 'deep' }],
        ['wv_ru_wst', '태세의 박살', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      s_fall: [
        ['wv_fa_vuln', '무너뜨릴 자리', '대상의 취약이 2 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:vuln>=2' } }, [], { v: 'deep' }],
        ['wv_fa_front', '산사태 휩쓸기', '전열 모두를 칩니다. 피해 19 → 11, 붕괴 54 → 31.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 31 }] }, ['광역'], { v: 'link' }]],
      f_sweep: [
        ['wv_sw_kill', '휩쓸어 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치'], { v: 'deep' }],
        ['wv_sw_brk', '무너뜨리는 개기식', '붕괴 +11. 피해 9 → 6.', { fxSet: [{ k: 'dmg', n: 6 }], fxAdd: [{ k: 'brk', n: 11 }] }, ['붕괴'], { v: 'link' }]],
      f_chainblade: [
        ['wv_cb_fast', '날랜 사슬', '빠른 칸이 됩니다. 피해 9 → 7.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 7 }] }, ['빠름'], { v: 'deep' }],
        ['wv_cb_ward', '사슬 방패', '보호막 +6을 함께 두릅니다.', { fxAdd: [{ k: 'ward', n: 6 }] }, ['보호막'], { v: 'link' }]],
      f_stomp: [
        ['wv_stp_more', '세게 구르기', '붕괴 14 → 20.', { fxSet: [{ k: 'brk', n: 20 }] }, [], { v: 'deep' }],
        ['wv_stp_ward', '발 디딘 방패', '보호막 +3을 함께 두릅니다.', { fxAdd: [{ k: 'ward', n: 3 }] }, ['보호막'], { v: 'link' }]],
      w_shove: [
        ['wv_sv_fast', '날랜 밀치기', '빠른 칸이 됩니다. 피해 8 → 5.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['빠름'], { v: 'deep' }],
        ['wv_sv_brk', '밀어 무너뜨리기', '붕괴 +14.', { fxAdd: [{ k: 'brk', n: 14 }] }, ['붕괴'], { v: 'link' }]],
      f_drag: [
        ['wv_dr_normal', '빠른 끌기', '보통 빠르기가 됩니다. 피해 11 → 7.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 7 }] }, [], { v: 'deep' }],
        ['wv_dr_ward', '끌어 막기', '보호막 +7을 함께 두릅니다.', { fxAdd: [{ k: 'ward', n: 7 }] }, ['보호막'], { v: 'link' }]],
      f_collapse: [
        ['wv_co_normal', '서두른 붕괴', '보통 빠르기가 됩니다. 피해 15 → 11.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 11 }] }, [], { v: 'deep' }],
        ['wv_co_wst', '태세의 붕괴', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      f_hook: [
        ['wv_hk_fast', '날랜 갈고리', '빠른 칸이 됩니다. 피해 15 → 11.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 11 }] }, ['빠름'], { v: 'deep' }],
        ['wv_hk_brk', '꺾는 갈고리', '붕괴 32 → 43.', { fxSet: [{ k: 'brk', n: 43 }] }, ['붕괴'], { v: 'link' }]],
      w_flare: [
        ['wv_fl_fast', '번쩍 터뜨리기', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['wv_fl_basic', '터뜨리고 잇기', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      w_rebuild: [
        ['wv_rb_more', '더 높은 벽', '보호막 상한의 42% → 57%까지 채웁니다.', { fxSet: [{ k: 'wardFill', to: 0.57 }] }, [], { v: 'deep' }],
        ['wv_rb_wst', '태세의 벽', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      w_breach: [
        ['wv_br_slow', '깊은 부수기', '느린 행동이 됩니다. 태우기 상한 16 → 22.', { set: { time: 'slow' }, fxSet: [{ k: 'wardBurn', max: 22 }] }, [], { v: 'deep' }],
        ['wv_br_basic', '부수고 잇기', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      w_rampart: [
        ['wv_ra_fast', '서두른 철벽', '빠른 칸이 됩니다. 보호막 28 → 20.', { set: { time: 'fast' }, fxSet: [{ k: 'ward', n: 20 }] }, ['빠름'], { v: 'deep' }],
        ['wv_ra_wst', '태세의 철벽', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      w_siege: [
        ['wv_si_fast', '순간의 파성', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['wv_si_wst', '태세의 파성', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      f_topple: [
        ['wv_tp_kill', '연쇄 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치'], { v: 'deep' }],
        ['wv_tp_basic', '쓰러뜨리고 잇기', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      s_lean: [
        ['wv_le_fast', '서두른 대열', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['wv_le_ward', '대열 방패', '보호막 4 → 8.', { fxSet: [{ k: 'ward', n: 8 }] }, ['보호막'], { v: 'link' }]],
      f_rampart: [
        ['wv_rp_fast', '날랜 방패벽 부수기', '빠른 칸이 됩니다. 피해 15 → 11.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 11 }] }, ['빠름'], { v: 'deep' }],
        ['wv_rp_wst', '태세의 방패벽', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      s_gapwatch: [
        ['wv_gw_fast', '서두른 틈', '빠른 칸이 됩니다. 보호막 23 → 16.', { set: { time: 'fast' }, fxSet: [{ k: 'ward', n: 16 }] }, ['빠름'], { v: 'deep' }],
        ['wv_gw_basic', '틈을 노린 박자', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'wdNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      s_quake: [
        ['wv_qk_fast', '순간의 분쇄', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['wv_qk_wst', '태세의 분쇄', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      f_charge: [
        ['wv_ch_fast', '날랜 돌진', '빠른 칸이 됩니다. 피해 9 → 6.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 6 }] }, ['빠름'], { v: 'deep' }],
        ['wv_ch_ward', '방패 든 돌진', '보호막 +6을 함께 두릅니다.', { fxAdd: [{ k: 'ward', n: 6 }] }, ['보호막'], { v: 'link' }]],
      w_spikes: [
        ['wv_sp_more', '빽빽한 가시', '가시 4번 → 6번.', { fxSet: [{ k: 'thorn', times: 6 }] }, [], { v: 'deep' }],
        ['wv_sp_wst', '태세의 가시', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      f_storm: [
        ['wv_sm_normal', '서두른 폭풍', '보통 빠르기가 됩니다. 피해 14 → 10.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 10 }] }, [], { v: 'deep' }],
        ['wv_sm_ward', '폭풍의 막', '보호막 +7을 함께 두릅니다.', { fxAdd: [{ k: 'ward', n: 7 }] }, ['보호막'], { v: 'link' }]],
      w_armor: [
        ['wv_ar_ward', '두꺼운 갑주', '보호막 15 → 21.', { fxSet: [{ k: 'ward', n: 21 }] }, [], { v: 'deep' }],
        ['wv_ar_wst', '태세의 갑주', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
      w_valor: [
        ['wv_va_fast', '순간의 용맹', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름'], { v: 'deep' }],
        ['wv_va_wst', '태세의 용맹', '태세가 켜져 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'wst' } }, ['태세'], { v: 'link' }]],
    },
  },
  /* 0.8.0 M5-2(10월 20일 만든 사람 설계지 2판): 수도승 액티브 재설계. M5-0c 규격 — 갈래 3 × 길 둘 + 리듬 칸, 경계 5칸(대사 승부수 고정), 결합 칸 3(판마다 둘), 변형 스킬마다 둘.
     옛 사다리 트리(5단계 53노드)는 버렸다(옛 판은 포인트를 돌려받는다). 철권 a 연환권 · b 붕권, 부동 a 금강 자세 · b 유수 자세, 혈도 a 점혈 · b 사혈 */
  monk: {
    br: { 철권: 0, 부동: 120, 혈도: 240 }, lane: { LL: -22, L: -12, C: 0, R: 12, RR: 22 },
    sec: { A: '철권', AB: '반탄', B: '부동', BC: '역혈', C: '혈도', CA: '파혈' },
    rad: { 1: 125, 2: 185, 3: 255, 4: 320, 5: 395, 6: 470 }, paths: { 철권: { a: '연환권', b: '붕권' }, 부동: { a: '금강 자세', b: '유수 자세' }, 혈도: { a: '점혈', b: '사혈' } },
    skills: [
      ['m_yeonhwan', '철권', 1, 1, 'LL', ['S'], 2, { excl: 'm_bunggwon', path: 'a' }], ['m_bunggwon', '철권', 1, 1, 'RR', ['S'], 2, { excl: 'm_yeonhwan', path: 'b' }], ['m_hoheup', '철권', 1, 2, 'C', ['m_yeonhwan', 'm_bunggwon'], 1],
      ['m_cheonsu', '철권', 2, 3, 'L', ['m_yeonhwan', 'm_bunggwon'], 2, { path: 'a' }], ['m_eungchuk', '철권', 2, 3, 'R', ['m_yeonhwan', 'm_bunggwon'], 2, { path: 'b' }],
      ['m_baekbo', '철권', 3, 5, 'L', ['m_cheonsu', 'm_eungchuk'], 3, { path: 'a' }], ['m_myeolgak', '철권', 3, 5, 'R', ['m_cheonsu', 'm_eungchuk'], 3, { path: 'b' }],
      ['m_geumgang', '부동', 1, 1, 'LL', ['S'], 2, { excl: 'm_yusu', path: 'a' }], ['m_yusu', '부동', 1, 1, 'RR', ['S'], 2, { excl: 'm_geumgang', path: 'b' }], ['m_balgyeong', '부동', 1, 2, 'C', ['m_geumgang', 'm_yusu'], 1],
      ['m_cheolsan', '부동', 2, 3, 'L', ['m_geumgang', 'm_yusu'], 2, { path: 'a' }], ['m_budong', '부동', 2, 3, 'R', ['m_geumgang', 'm_yusu'], 2, { path: 'b' }],
      ['m_cheongeun', '부동', 3, 5, 'L', ['m_cheolsan', 'm_budong'], 3, { path: 'a' }], ['m_bulgoe', '부동', 3, 5, 'R', ['m_cheolsan', 'm_budong'], 3, { path: 'b' }],
      ['m_jeomhyeol', '혈도', 1, 1, 'LL', ['S'], 2, { excl: 'm_sahyeol', path: 'a' }], ['m_sahyeol', '혈도', 1, 1, 'RR', ['S'], 2, { excl: 'm_jeomhyeol', path: 'b' }], ['m_maek', '혈도', 1, 2, 'C', ['m_jeomhyeol', 'm_sahyeol'], 1],
      ['m_bongswae', '혈도', 2, 3, 'L', ['m_jeomhyeol', 'm_sahyeol'], 2, { path: 'a' }], ['m_talgi', '혈도', 2, 3, 'R', ['m_jeomhyeol', 'm_sahyeol'], 2, { path: 'b' }],
      ['m_poswae', '혈도', 3, 5, 'L', ['m_bongswae', 'm_talgi'], 3, { path: 'a' }], ['m_talhon', '혈도', 3, 5, 'R', ['m_bongswae', 'm_talgi'], 3, { path: 'b' }],
      /* 경계 [Claude 초안](입구 · 둘째 · 3고리 둘: 공격 2 · 강화/방어 2) + 대사 승부수(만든 사람) */
      ['m_doedol', '반탄', 2, 3, 'C', ['m_yeonhwan', 'm_bunggwon', 'm_geumgang', 'm_yusu'], 2, { requires: [['m_yeonhwan', 'm_bunggwon'], ['m_geumgang', 'm_yusu']] }], ['m_gibat', '반탄', 2, 4, 'C', ['m_doedol'], 2],
      ['m_tansan', '반탄', 3, 5, 'L', ['m_gibat'], 3], ['m_cheolpo', '반탄', 3, 5, 'R', ['m_gibat'], 3], ['m_yeokcheon', '반탄', 3, 6, 'C', ['m_tansan', 'm_cheolpo'], 4],
      ['m_yeokmaek', '역혈', 2, 3, 'C', ['m_geumgang', 'm_yusu', 'm_jeomhyeol', 'm_sahyeol'], 2, { requires: [['m_geumgang', 'm_yusu'], ['m_jeomhyeol', 'm_sahyeol']] }], ['m_maekji', '역혈', 2, 4, 'C', ['m_yeokmaek'], 2],
      ['m_hyeolryu', '역혈', 3, 5, 'L', ['m_maekji'], 3], ['m_cheonri', '역혈', 3, 5, 'R', ['m_maekji'], 3], ['m_cheonmang', '역혈', 3, 6, 'C', ['m_hyeolryu', 'm_cheonri'], 4],
      ['m_pamaek', '파혈', 2, 3, 'C', ['m_jeomhyeol', 'm_sahyeol', 'm_yeonhwan', 'm_bunggwon'], 2, { requires: [['m_jeomhyeol', 'm_sahyeol'], ['m_yeonhwan', 'm_bunggwon']] }], ['m_gagu', '파혈', 2, 4, 'C', ['m_pamaek'], 2],
      ['m_gwanhyeol', '파혈', 3, 5, 'L', ['m_gagu'], 3], ['m_sunhwan', '파혈', 3, 5, 'R', ['m_gagu'], 3], ['m_ilji', '파혈', 3, 6, 'C', ['m_gwanhyeol', 'm_sunhwan'], 4],
      /* 결합 칸(설계지): 원 바깥, 꼬리표 조건, 판마다 셋 중 둘 */
      ['m_samjae', '결합', 2, 4, 'C', [], 2, { reqTags: { 기: 2, 되받기: 1 }, ang: 30 }], ['m_yeokryu', '결합', 2, 4, 'C', [], 2, { reqTags: { 둔화: 1, 기본공격연동: 1 }, ang: 150 }], ['m_bultoe', '결합', 2, 4, 'C', [], 2, { reqTags: { 자세: 1, 붕괴: 1 }, ang: 270 }],
    ],
    vars: {
      /* 스킬마다 변형 둘(둘 다 제시): v 'deep' 깊게 = 같은 길을 세게, v 'link' 잇기 = 그 스킬에 없던 다른 빌드의 꼬리표를 더해 경계 · 결합 칸으로. [Claude 초안] */
      m_yeonhwan: [
        ['mv_yh_more', '끝없는 연환', '기로 더하는 타격 최대 5 → 7.', { fxSet: [{ k: 'mkChain', max: 7, txt: '이번 차례 기본 공격 +3타, 기 1마다 1타 더(최대 7)' }] }, [], { v: 'deep' }],
        ['mv_yh_brk', '연환 붕괴', '다음 강공격 붕괴 +15.', { fxSet: [{ k: 'mkChain', brk: 5, txt: '이번 차례 기본 공격 +3타, 기 1마다 1타 더 · 다음 강공격 붕괴 +15' }] }, ['붕괴'], { v: 'link' }]],
      m_bunggwon: [
        ['mv_bg_cond', '터지는 붕권', '기가 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ki>=3' } }, [], { v: 'deep' }],
        ['mv_bg_brk', '부수는 붕권', '쏟은 기 1마다 붕괴 +8.', { fxSet: [{ k: 'kiBurst', mul: 0.2, brk: 8 }] }, ['붕괴'], { v: 'link' }]],
      m_hoheup: [
        ['mv_hh_deep', '깊은 호흡', '기 +2 → +3.', { fxSet: [{ k: 'st', s: 'empower', n: 3 }] }, [], { v: 'deep' }],
        ['mv_hh_st', '고른 호흡', '자세를 함께 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_cheonsu: [
        ['mv_cs_hits', '천수 만타', '3타 → 4타. 피해 8 → 6.', { set: { hits: 4 }, fxSet: [{ k: 'dmg', n: 6 }] }, [], { v: 'deep' }],
        ['mv_cs_chill', '짚는 연타', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      m_eungchuk: [
        ['mv_ec_more', '단전 응축', '쓸 때 기 +1.', { fxAdd: [{ k: 'st', s: 'empower', n: 1 }] }, [], { v: 'deep' }],
        ['mv_ec_st', '응축 자세', '자세를 함께 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_baekbo: [
        ['mv_bb_big', '백보 관통', '정예 · 강적 · 보스에게 ×1.3.', { fxAdd: [{ k: 'bigx', mul: 1.3 }] }, [], { v: 'deep' }],
        ['mv_bb_ki', '기 실린 백보', '기가 있으면 타수 +1.', { fxAdd: [{ k: 'kiHits', per: 1, max: 1 }] }, ['기'], { v: 'link' }]],
      m_myeolgak: [
        ['mv_mg_normal', '서두른 멸각', '보통 빠르기가 됩니다. 기마다 +17 → +13.', { set: { time: 'normal' }, fxSet: [{ k: 'kiBurst', per: 13, max: 5 }] }, [], { v: 'deep' }],
        ['mv_mg_brk', '무너뜨리는 멸각', '쏟은 기 1마다 붕괴 +10.', { fxSet: [{ k: 'kiBurst', per: 17, max: 5, brk: 10 }] }, ['붕괴'], { v: 'link' }]],
      m_geumgang: [
        ['mv_gg_more', '굳은 금강', '되받기 +20% → +35%.', { fxSet: [{ k: 'stance', dmg: 14, mul: 0.35, max: 3 }] }, [], { v: 'deep' }],
        ['mv_gg_ki', '기 모으는 금강', '되받으면 기 +1 더.', { fxSet: [{ k: 'stance', dmg: 14, mul: 0.2, max: 3, ki: 1 }] }, ['기'], { v: 'link' }]],
      m_yusu: [
        ['mv_ys_red', '깊은 유수', '받는 피해 −20% → −28%.', { fxSet: [{ k: 'stance', dmg: 21, red: 0.28 }] }, [], { v: 'deep' }],
        ['mv_ys_ctr', '흐르는 반격', '되받은 적에게 둔화 1.', { fxSet: [{ k: 'stance', dmg: 21, red: 0.2, chill: 1 }] }, ['둔화'], { v: 'link' }]],
      m_balgyeong: [
        ['mv_bk_big', '침투 발경', '정예 · 강적 · 보스에게 ×1.3.', { fxAdd: [{ k: 'bigx', mul: 1.3 }] }, [], { v: 'deep' }],
        ['mv_bk_st', '발경 자세', '친 뒤 자세를 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_cheolsan: [
        ['mv_cl_more', '철산 돌파', '기마다 +6 → +8. 피해 19 → 16.', { fxSet: [{ k: 'dmg', n: 16 }, { k: 'kiPer', per: 8 }] }, [], { v: 'deep' }],
        ['mv_cl_brk', '무너뜨리는 철산고', '붕괴 +25.', { fxAdd: [{ k: 'brk', n: 25 }] }, ['붕괴'], { v: 'link' }]],
      m_budong: [
        ['mv_bd_long', '흔들림 없는 마음', '3차례 → 4차례.', { fxSet: [{ k: 'stance', dmg: 2, keep: 4 }] }, [], { v: 'deep' }],
        ['mv_bd_ki', '고요한 기', '되받으면 기 +1 더.', { fxSet: [{ k: 'stance', dmg: 2, keep: 3, ki: 1 }] }, ['기'], { v: 'link' }]],
      m_cheongeun: [
        ['mv_cg_dmg', '천근 무게', '되받을 때 피해 +28 → +36.', { fxSet: [{ k: 'stance', dmg: 36, big: 1 }] }, [], { v: 'deep' }],
        ['mv_cg_chill', '짓누르는 천근', '되받은 적에게 둔화 1.', { fxSet: [{ k: 'stance', dmg: 28, big: 1, chill: 1 }] }, ['둔화'], { v: 'link' }]],
      m_bulgoe: [
        ['mv_bl_fast', '즉시 금강불괴', '빠른 칸이 됩니다. 4차례 → 3차례.', { set: { time: 'fast' }, fxSet: [{ k: 'mkAdamant', n: 3, txt: '3차례 받는 피해 −45%.' }] }, [], { v: 'deep' }],
        ['mv_bl_st', '불괴 자세', '자세를 함께 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_jeomhyeol: [
        ['mv_jh_more', '깊은 점혈', '둔화 2 → 3. 피해 19 → 14.', { fxSet: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'chill', n: 3 }] }, [], { v: 'deep' }],
        ['mv_jh_ki', '점혈 흡기', '대상이 이미 둔화되어 있었으면 기 +1.', { fxAdd: [{ k: 'meSt', s: 'empower', n: 1, if: 'chill' }] }, ['기'], { v: 'link' }]],
      m_sahyeol: [
        ['mv_sh_cond', '흐르는 사혈', '대상의 둔화가 2 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:chill>=2' } }, [], { v: 'deep' }],
        ['mv_sh_brk', '사혈 꺾기', '붕괴 +20.', { fxAdd: [{ k: 'brk', n: 20 }] }, ['붕괴'], { v: 'link' }]],
      m_maek: [
        ['mv_mk_more', '깊은 맥', '둔화 1 → 2. 피해 12 → 9.', { fxSet: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'chill', n: 2 }] }, [], { v: 'deep' }],
        ['mv_mk_basic', '맥 짚고 치기', '다음 기본 공격에 붕괴 +15.', { fxAdd: [{ k: 'mkNextBrk', n: 15 }] }, ['기본공격연동'], { v: 'link' }]],
      m_bongswae: [
        ['mv_bs_fast', '날랜 봉쇄', '빠른 칸이 됩니다. 피해 18 → 13.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 13 }] }, [], { v: 'deep' }],
        ['mv_bs_front', '전열 봉쇄', '전열 모두를 칩니다. 피해 18 → 11.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 11 }] }, ['광역'], { v: 'link' }]],
      m_talgi: [
        ['mv_tg_more', '깊은 탈기', '둔화 1마다 생명력 +3 → +4.', { fxSet: [{ k: 'mkDrainChill', per: 4, txt: '대상의 둔화 1마다 생명력 +4.' }] }, [], { v: 'deep' }],
        ['mv_tg_ki', '기 빼앗기', '대상이 이미 둔화되어 있었으면 기 +1.', { fxAdd: [{ k: 'meSt', s: 'empower', n: 1, if: 'chill' }] }, ['기'], { v: 'link' }]],
      m_poswae: [
        ['mv_ps_cond', '무르익은 폭쇄', '대상의 둔화가 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:chill>=3' } }, [], { v: 'deep' }],
        ['mv_ps_brk', '혈 무너뜨리기', '터뜨린 둔화 1마다 붕괴 +8.', { fxSet: [{ k: 'mkChillBurst', per: 12, brk: 8, txt: '둔화를 모두 터뜨려 1마다 피해 +12 · 붕괴 +8.' }] }, ['붕괴'], { v: 'link' }]],
      m_talhon: [
        ['mv_th_slow', '거두는 탈혼', '느린 행동이 됩니다. 둔화 2 → 3.', { set: { time: 'slow' }, fxSet: [{ k: 'st', s: 'chill', n: 3 }] }, [], { v: 'deep' }],
        ['mv_th_seal', '혼을 묶는 손', '지원 행동을 봉인합니다.', { fxAdd: [{ k: 'sealx', brk: 15 }] }, ['봉인'], { v: 'link' }]],
      m_doedol: [
        ['mv_dd_more', '배로 돌린 주먹', '되받은 1마다 +7 → +10. 피해 14 → 10.', { fxSet: [{ k: 'dmg', n: 10 }, { k: 'mkCtrPer', per: 10, txt: '지난 적 차례에 되받은 1마다 피해 +10.' }] }, [], { v: 'deep' }],
        ['mv_dd_brk', '꺾어 돌린 주먹', '붕괴 +21.', { fxAdd: [{ k: 'brk', n: 21 }] }, ['붕괴'], { v: 'link' }]],
      m_gibat: [
        ['mv_gb_more', '넘치는 기 받기', '되받으면 기 +1 → +2.', { fxSet: [{ k: 'stance', dmg: 13, ki: 2 }] }, [], { v: 'deep' }],
        ['mv_gb_chill', '맥 받는 자세', '되받은 적에게 둔화 1.', { fxSet: [{ k: 'stance', dmg: 13, ki: 1, chill: 1 }] }, ['둔화'], { v: 'link' }]],
      m_tansan: [
        ['mv_ts_slow', '무거운 탄산권', '느린 행동이 됩니다. 피해 17 → 22.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 22 }] }, [], { v: 'deep' }],
        ['mv_ts_ki', '기 실린 탄산권', '맞은 적마다 기 +1.', { fxAdd: [{ k: 'meSt', s: 'empower', n: 1, if: 'hit' }] }, ['기'], { v: 'link' }]],
      m_cheolpo: [
        ['mv_cp_red', '두꺼운 철포삼', '받는 피해 −30% → −38%.', { fxSet: [{ k: 'stance', dmg: 14, red: 0.38, keep: 2 }] }, [], { v: 'deep' }],
        ['mv_cp_brk', '철포 반탄', '되받을 때마다 붕괴 +20.', { fxSet: [{ k: 'stance', dmg: 14, red: 0.3, keep: 2, brk: 20 }] }, ['붕괴'], { v: 'link' }]],
      m_yeokcheon: [
        ['mv_yc_fast', '순간의 역천', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, [], { v: 'deep' }],
        ['mv_yc_ki', '역천의 기', '기가 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ki>=3' } }, ['기'], { v: 'link' }]],
      m_yeokmaek: [
        ['mv_ym_more', '깊은 역맥', '둔화된 적에게 ×1.5 → ×1.8. 피해 15 → 13.', { fxSet: [{ k: 'dmg', n: 13 }, { k: 'chillx', mul: 1.8 }] }, [], { v: 'deep' }],
        ['mv_ym_st', '역맥 자세', '친 뒤 자세를 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_maekji: [
        ['mv_mj_more', '굳게 지키는 맥', '되받은 적에게 둔화 2 → 3.', { fxSet: [{ k: 'stance', dmg: 14, chill: 3 }] }, [], { v: 'deep' }],
        ['mv_mj_ki', '맥에서 오르는 기', '되받으면 기 +1 더.', { fxSet: [{ k: 'stance', dmg: 14, chill: 2, ki: 1 }] }, ['기'], { v: 'link' }]],
      m_hyeolryu: [
        ['mv_hr_fast', '날랜 역행', '빠른 칸이 됩니다. 피해 16 → 11.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 11 }] }, [], { v: 'deep' }],
        ['mv_hr_seal', '봉인하는 역행', '지원 행동을 봉인합니다.', { fxAdd: [{ k: 'sealx', brk: 15 }] }, ['봉인'], { v: 'link' }]],
      m_cheonri: [
        ['mv_cr_dmg', '먼 곳까지 받기', '되받을 때 피해 +31 → +39.', { fxSet: [{ k: 'stance', dmg: 39, far: 1 }] }, [], { v: 'deep' }],
        ['mv_cr_chill', '천리의 맥', '되받은 적에게 둔화 1.', { fxSet: [{ k: 'stance', dmg: 31, far: 1, chill: 1 }] }, ['둔화'], { v: 'link' }]],
      m_cheonmang: [
        ['mv_cm_fast', '순간의 천망', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, [], { v: 'deep' }],
        ['mv_cm_st', '천망 자세', '자세를 함께 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_pamaek: [
        ['mv_pm_more', '깊은 파맥', '기 3까지 → 4까지 쏟습니다.', { fxSet: [{ k: 'kiBurst', per: 5, max: 4 }] }, [], { v: 'deep' }],
        ['mv_pm_chill', '짚고 쏟기', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      m_gagu: [
        ['mv_gu_more', '단단한 기', '기 +4 → +5.', { fxSet: [{ k: 'st', s: 'empower', n: 5 }] }, [], { v: 'deep' }],
        ['mv_gu_st', '기 가둔 자세', '자세를 함께 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_gwanhyeol: [
        ['mv_gh_normal', '서두른 관혈', '보통 빠르기가 됩니다. 피해 28 → 21.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 21 }] }, [], { v: 'deep' }],
        ['mv_gh_ki', '관혈 흡기', '대상이 이미 둔화되어 있었으면 기 +2.', { fxAdd: [{ k: 'meSt', s: 'empower', n: 2, if: 'chill' }] }, ['기'], { v: 'link' }]],
      m_sunhwan: [
        ['mv_sw_long', '긴 순환', '3차례 → 4차례.', { fxSet: [{ k: 'mkFlow', n: 4, txt: '4차례 동안 ▶ 공격 피해 +55%.' }] }, [], { v: 'deep' }],
        ['mv_sw_st', '순환 자세', '자세를 함께 잡습니다.', { fxAdd: [{ k: 'stance' }] }, ['자세'], { v: 'link' }]],
      m_ilji: [
        ['mv_il_fast', '순간의 일지', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, [], { v: 'deep' }],
        ['mv_il_brk', '무너뜨리는 일지', '붕괴 +30.', { fxAdd: [{ k: 'brk', n: 30 }] }, ['붕괴'], { v: 'link' }]],
    },
  },
  /* 0.8.0 5단계 사냥꾼 (10월 18일 만든 사람 결정 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-6 · 2-6a · 8절. 스킬 24 + 강화 27 = 51노드.
     시작 스킬은 연계 갈래 태그(lb)를 가진다: 겨눠 쏘기 저격, 물러서며 쏘기 기동(data/skills.js). 연계 할인(cond link)은 갈래마다 1고리 유산 3 스킬 하나에만 */
  hunter: {
    /* 0.8.0 M5-4 사냥꾼 재설계 (10월 20일 만든 사람 설계지 2판). 경계 이름 명궁 · 유격 · 잠복(승부수 만궁 · 질풍난사 · 혈향의 덫과 다른 이름). 생성: M5-4 gen.py */
    br: { 저격: 0, 연사: 120, 기동: 240 }, lane: { LL: -22, L: -12, C: 0, R: 12, RR: 22 },
    sec: { A: '저격', AB: '명궁', B: '연사', BC: '유격', C: '기동', CA: '잠복' },
    rad: { 1: 125, 2: 185, 3: 255, 4: 320, 5: 395, 6: 470 }, paths: { 저격: { a: '꿰뚫는 화살', b: '사냥감 지정' }, 연사: { a: '연속 사격', b: '화살 재기' }, 기동: { a: '받아넘기기', b: '다리 쏘기' } },
    skills: [
      ['h5_pierce', '저격', 1, 1, 'LL', ['S'], 2, { excl: 'h5_prey', path: 'a' }],
      ['h5_prey', '저격', 1, 1, 'RR', ['S'], 2, { excl: 'h5_pierce', path: 'b' }],
      ['h5_cover', '저격', 1, 2, 'C', ['h5_pierce', 'h5_prey'], 1],
      ['h5_heavy', '저격', 2, 3, 'L', ['h5_pierce', 'h5_prey'], 2, { path: 'a' }],
      ['h5_lock', '저격', 2, 3, 'R', ['h5_pierce', 'h5_prey'], 2, { path: 'b' }],
      ['h5_sky', '저격', 3, 5, 'L', ['h5_heavy', 'h5_lock'], 3, { path: 'a' }],
      ['h5_endhunt', '저격', 3, 5, 'R', ['h5_heavy', 'h5_lock'], 3, { path: 'b' }],
      ['h5_volley', '연사', 1, 1, 'LL', ['S'], 2, { excl: 'h5_nock', path: 'a' }],
      ['h5_nock', '연사', 1, 1, 'RR', ['S'], 2, { excl: 'h5_volley', path: 'b' }],
      ['h5_harass', '연사', 1, 2, 'C', ['h5_volley', 'h5_nock'], 1],
      ['h5_rain', '연사', 2, 3, 'L', ['h5_volley', 'h5_nock'], 2, { path: 'a' }],
      ['h5_barb', '연사', 2, 3, 'R', ['h5_volley', 'h5_nock'], 2, { path: 'b' }],
      ['h5_bloodrain', '연사', 3, 5, 'L', ['h5_rain', 'h5_barb'], 3, { path: 'a' }],
      ['h5_endless', '연사', 3, 5, 'R', ['h5_rain', 'h5_barb'], 3, { path: 'b' }],
      ['h5_counter', '기동', 1, 1, 'LL', ['S'], 2, { excl: 'h5_leg', path: 'a' }],
      ['h5_leg', '기동', 1, 1, 'RR', ['S'], 2, { excl: 'h5_counter', path: 'b' }],
      ['h5_dodge', '기동', 1, 2, 'C', ['h5_counter', 'h5_leg'], 1],
      ['h5_windstep', '기동', 2, 3, 'L', ['h5_counter', 'h5_leg'], 2, { path: 'a' }],
      ['h5_stop', '기동', 2, 3, 'R', ['h5_counter', 'h5_leg'], 2, { path: 'b' }],
      ['h5_windveil', '기동', 3, 5, 'L', ['h5_windstep', 'h5_stop'], 3, { path: 'a' }],
      ['h5_icecage', '기동', 3, 5, 'R', ['h5_windstep', 'h5_stop'], 3, { path: 'b' }],
      ['h5_aimvol', '명궁', 2, 3, 'C', ['h5_pierce', 'h5_prey', 'h5_volley', 'h5_nock'], 2, { requires: [['h5_pierce', 'h5_prey'], ['h5_volley', 'h5_nock']] }],
      ['h5_steady', '명궁', 2, 4, 'C', ['h5_aimvol'], 2],
      ['h5_pinpoint', '명궁', 3, 5, 'L', ['h5_steady'], 3],
      ['h5_hawkeye', '명궁', 3, 5, 'R', ['h5_steady'], 3],
      ['h5_mangung', '명궁', 3, 6, 'C', ['h5_pinpoint', 'h5_hawkeye'], 4],
      ['h5_runshot', '유격', 2, 3, 'C', ['h5_volley', 'h5_nock', 'h5_counter', 'h5_leg'], 2, { requires: [['h5_volley', 'h5_nock'], ['h5_counter', 'h5_leg']] }],
      ['h5_dust', '유격', 2, 4, 'C', ['h5_runshot'], 2],
      ['h5_storm', '유격', 3, 5, 'L', ['h5_dust'], 3],
      ['h5_tailwind', '유격', 3, 5, 'R', ['h5_dust'], 3],
      ['h5_gale', '유격', 3, 6, 'C', ['h5_storm', 'h5_tailwind'], 4],
      ['h5_snare', '잠복', 2, 3, 'C', ['h5_counter', 'h5_leg', 'h5_pierce', 'h5_prey'], 2, { requires: [['h5_counter', 'h5_leg'], ['h5_pierce', 'h5_prey']] }],
      ['h5_hide', '잠복', 2, 4, 'C', ['h5_snare'], 2],
      ['h5_ambush', '잠복', 3, 5, 'L', ['h5_hide'], 3],
      ['h5_camo', '잠복', 3, 5, 'R', ['h5_hide'], 3],
      ['h5_trap', '잠복', 3, 6, 'C', ['h5_ambush', 'h5_camo'], 4],
      ['h5_chase', '결합', 2, 4, 'C', [], 2, { reqTags: { 추적: 1, '몸 빼기': 1 }, ang: 30 }],
      ['h5_scent', '결합', 2, 4, 'C', [], 2, { reqTags: { 출혈: 1, 추적: 1 }, ang: 150 }],
      ['h5_frozen', '결합', 2, 4, 'C', [], 2, { reqTags: { 둔화: 2, 기본공격연동: 1 }, ang: 270 }],
    ],
    vars: {
      /* 스킬마다 변형 둘(둘 다 제시): v 'deep' 깊게 = 같은 길을 세게, v 'link' 잇기 = 그 스킬에 없던 다른 빌드의 꼬리표를 더해 경계 · 결합 칸으로. [Claude 초안] */
      h5_pierce: [
        ['hv_pc_deep', '깊이 꿰뚫기', '느린 행동이 됩니다. 피해 21 → 28.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 28 }] }, [], { v: 'deep' }],
        ['hv_pc_bleed', '찢는 화살촉', '출혈 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, ['출혈'], { v: 'link' }]],
      h5_prey: [
        ['hv_py_more', '깊은 지정', '추적 2 → 3겹을 겁니다.', { fxSet: [{ k: 'focusAdd', n: 3 }] }, [], { v: 'deep' }],
        ['hv_py_slow', '묶어 둔 사냥감', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      h5_cover: [
        ['hv_cv_more', '두꺼운 엄폐', '보호 7 → 8.', { fxSet: [{ k: 'st', s: 'protect', n: 8 }] }, [], { v: 'deep' }],
        ['hv_cv_dodge', '엄폐 뒤 빠지기', '몸 빼기 1.', { fxAdd: [{ k: 'evade', n: 1 }] }, ['몸 빼기'], { v: 'link' }]],
      h5_heavy: [
        ['hv_hv_deep', '가벼운 무게', '보통 행동이 됩니다(연계면 빠른 행동). 피해 20 → 16.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 16 }] }, [], { v: 'deep' }],
        ['hv_hv_focus', '겨눈 무게', '추적 1겹을 겁니다.', { fxAdd: [{ k: 'focusAdd', n: 1 }] }, ['추적'], { v: 'link' }]],
      h5_lock: [
        ['hv_lk_long', '긴 고정', '7라운드 → 8라운드.', { fxSet: [{ k: 'hnLock', r: 7, txt: '8라운드 기본 공격이 대상 추적 겹마다 +20%' }] }, [], { v: 'deep' }],
        ['hv_lk_bleed', '피 묻은 고정', '켤 때 다음 기본 공격 2번에 출혈 1.', { fxAdd: [{ k: 'bbuf', s: 'barb', bleed: 1, r: 0 }] }, ['출혈'], { v: 'link' }]],
      h5_sky: [
        ['hv_sk_deep', '갈라진 하늘', '무기 피해의 3배 → 3.5배.', { fxSet: [{ k: 'hnSky', mul: 3.5, txt: '추적 3겹이면 무기 피해의 3.5배' }] }, [], { v: 'deep' }],
        ['hv_sk_brk', '하늘 무너뜨리기', '붕괴 +20.', { fxAdd: [{ k: 'brk', n: 20 }] }, ['붕괴'], { v: 'link' }]],
      h5_endhunt: [
        ['hv_eh_deep', '깊은 사냥', '피해 24 → 32.', { fxSet: [{ k: 'dmg', n: 32 }] }, [], { v: 'deep' }],
        ['hv_eh_bleed', '피 흘리는 사냥', '출혈 2를 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 2 }] }, ['출혈'], { v: 'link' }]],
      h5_volley: [
        ['hv_vl_deep', '빠른 연속', '한 발 피해 7 → 9.', { fxSet: [{ k: 'dmg', n: 9 }] }, [], { v: 'deep' }],
        ['hv_vl_bleed', '찢는 연속', '맞힌 적마다 출혈 1.', { fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, ['출혈'], { v: 'link' }]],
      h5_nock: [
        ['hv_nk_three', '세 번 재기', '기본 공격 2번 → 3번.', { fxSet: [{ k: 'hnNock', n: 3, txt: '다음 기본 공격 3번이 두 발' }] }, [], { v: 'deep' }],
        ['hv_nk_slow', '얼린 화살촉', '다음 기본 공격 2번에 둔화 1.', { fxAdd: [{ k: 'hnNockChill', n: 1, txt: '다음 기본 공격 2번에 둔화 1' }] }, ['둔화'], { v: 'link' }]],
      h5_harass: [
        ['hv_hr_two', '두 발 견제', '두 발을 쏩니다.', { set: { hits: 2 } }, [], { v: 'deep' }],
        ['hv_hr_focus', '견제 표식', '추적 1겹을 겁니다.', { fxAdd: [{ k: 'focusAdd', n: 1 }] }, ['추적'], { v: 'link' }]],
      h5_rain: [
        ['hv_rn_more', '짙은 화살비', '출혈 1 → 2.', { fxSet: [{ k: 'st', s: 'bleed', n: 2 }] }, [], { v: 'deep' }],
        ['hv_rn_slow', '얼음비', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      h5_barb: [
        ['hv_bb_more', '깊은 덧화살', '출혈 1 → 2.', { fxSet: [{ k: 'bbuf', s: 'barb', bleed: 2 }] }, [], { v: 'deep' }],
        ['hv_bb_focus', '표식 덧화살', '켤 때 대상 추적 1겹.', { fxAdd: [{ k: 'hnFocusSelf', n: 1, txt: '추적한 적 추적 +1겹' }] }, ['추적'], { v: 'link' }]],
      h5_bloodrain: [
        ['hv_br_deep', '짙은 피의 비', '무기 피해의 3.4배 → 3.9배.', { fxSet: [{ k: 'hnBloodRain', mul: 3.9, txt: '출혈 걸린 적 모두에게 무기 피해의 3.9배' }] }, [], { v: 'deep' }],
        ['hv_br_brk', '피의 무게', '붕괴 +15.', { fxAdd: [{ k: 'brk', n: 15 }] }, ['붕괴'], { v: 'link' }]],
      h5_endless: [
        ['hv_el_four', '네 번 쏘기', '기본 공격 3번 → 4번.', { fxSet: [{ k: 'hnNock', n: 4, txt: '다음 기본 공격 4번이 세 발' }] }, [], { v: 'deep' }],
        ['hv_el_bleed', '피 젖은 화살', '켤 때 다음 기본 공격 2번에 출혈 1.', { fxAdd: [{ k: 'bbuf', s: 'barb', bleed: 1, r: 0 }] }, ['출혈'], { v: 'link' }]],
      h5_counter: [
        ['hv_ct_deep', '날카로운 반격', '반격 15 → 21.', { fxSet: [{ k: 'evadeCtr', dmg: 21 }] }, [], { v: 'deep' }],
        ['hv_ct_focus', '되쏘는 표식', '반격에 추적 1겹.', { fxSet: [{ k: 'evadeCtr', focus: 1 }] }, ['추적'], { v: 'link' }]],
      h5_leg: [
        ['hv_lg_more', '깊은 다리 쏘기', '둔화 2 → 3.', { fxSet: [{ k: 'st', s: 'chill', n: 3 }] }, [], { v: 'deep' }],
        ['hv_lg_bleed', '찢는 다리 쏘기', '출혈 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, ['출혈'], { v: 'link' }]],
      h5_dodge: [
        ['hv_dg_two', '두 번 빼기', '몸 빼기 1 → 2.', { fxSet: [{ k: 'evade', n: 2 }] }, [], { v: 'deep' }],
        ['hv_dg_focus', '빠지며 겨누기', '추적한 적 추적 +1겹.', { fxAdd: [{ k: 'hnFocusSelf', n: 1, txt: '추적한 적 추적 +1겹' }] }, ['추적'], { v: 'link' }]],
      h5_windstep: [
        ['hv_ws_dodge', '바람 타기', '쓸 때 몸 빼기 1.', { fxAdd: [{ k: 'evade', n: 1 }] }, [], { v: 'deep' }],
        ['hv_ws_chill', '찬바람 걸음', '쓸 때 모든 적 둔화 1.', { fxAdd: [{ k: 'hnChillAll', n: 1, txt: '모든 적 둔화 1' }] }, ['둔화'], { v: 'link' }]],
      h5_stop: [
        ['hv_sp_deep', '단단한 멈춤', '모으는 둔화된 적 붕괴 40 → 60.', { fxSet: [{ k: 'chillCut', brk: 60 }] }, [], { v: 'deep' }],
        ['hv_sp_focus', '멈춘 표적', '추적 1겹을 겁니다.', { fxAdd: [{ k: 'focusAdd', n: 1 }] }, ['추적'], { v: 'link' }]],
      h5_windveil: [
        ['hv_wv_long', '긴 장막', '5라운드 → 6라운드.', { fxSet: [{ k: 'hnWindVeil', r: 6, txt: '6라운드 공격을 받을 때마다 몸 빼기 1(라운드에 한 번)' }] }, [], { v: 'deep' }],
        ['hv_wv_prot', '바람 갑옷', '보호 2.', { fxAdd: [{ k: 'st', s: 'protect', n: 2 }] }, ['보호'], { v: 'link' }]],
      h5_icecage: [
        ['hv_ic_deep', '깊은 감옥', '피해 37 → 49.', { fxSet: [{ k: 'dmg', n: 49 }] }, [], { v: 'deep' }],
        ['hv_ic_focus', '갇힌 사냥감', '추적 2겹을 겁니다.', { fxAdd: [{ k: 'focusAdd', n: 2 }] }, ['추적'], { v: 'link' }]],
      h5_aimvol: [
        ['hv_av_deep', '깊은 겨눔', '한 발 피해 9 → 11.', { fxSet: [{ k: 'dmg', n: 11 }] }, [], { v: 'deep' }],
        ['hv_av_bleed', '찢는 겨눔', '출혈 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, ['출혈'], { v: 'link' }]],
      h5_steady: [
        ['hv_st_two', '깊은 숨', '강화 1 → 2.', { fxSet: [{ k: 'st', s: 'empower', n: 2 }] }, [], { v: 'deep' }],
        ['hv_st_dodge', '숨 돌린 발', '몸 빼기 1.', { fxAdd: [{ k: 'evade', n: 1 }] }, ['몸 빼기'], { v: 'link' }]],
      h5_pinpoint: [
        ['hv_pp_deep', '숨 멈춘 한 발', '느린 행동이 됩니다. 피해 30 → 38.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 38 }] }, [], { v: 'deep' }],
        ['hv_pp_brk', '급소 부수기', '붕괴 +22.', { fxAdd: [{ k: 'brk', n: 22 }] }, ['붕괴'], { v: 'link' }]],
      h5_hawkeye: [
        ['hv_he_long', '긴 눈', '3라운드 → 4라운드.', { fxSet: [{ k: 'foresee', rounds: 4 }] }, [], { v: 'deep' }],
        ['hv_he_focus', '노려보는 눈', '추적한 적 추적 +1겹.', { fxAdd: [{ k: 'hnFocusSelf', n: 1, txt: '추적한 적 추적 +1겹' }] }, ['추적'], { v: 'link' }]],
      h5_mangung: [
        ['hv_mg_deep', '더 당긴 시위', '무기 피해의 6.5배 → 7배.', { fxSet: [{ k: 'hnDraw', mul: 7, txt: '한 차례 시위를 당겼다가, 다음 차례 추적한 적에게 무기 피해의 7배(추적 겹마다 +1배).' }] }, [], { v: 'deep' }],
        ['hv_mg_brk', '무너뜨리는 한 발', '쏠 때 붕괴 +40.', { fxSet: [{ k: 'hnDraw', brk: 40 }] }, ['붕괴'], { v: 'link' }]],
      h5_runshot: [
        ['hv_rs_deep', '깊은 달음', '피해 10 → 13.', { fxSet: [{ k: 'dmg', n: 13 }] }, [], { v: 'deep' }],
        ['hv_rs_bleed', '찢으며 달리기', '출혈 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'bleed', n: 1 }] }, ['출혈'], { v: 'link' }]],
      h5_dust: [
        ['hv_ds_more', '짙은 흙먼지', '보호 11 → 13.', { fxSet: [{ k: 'st', s: 'protect', n: 13 }] }, [], { v: 'deep' }],
        ['hv_ds_chill', '눈보라 흙먼지', '모든 적 둔화 1.', { fxAdd: [{ k: 'hnChillAll', n: 1, txt: '모든 적 둔화 1' }] }, ['둔화'], { v: 'link' }]],
      h5_storm: [
        ['hv_sm_deep', '거센 폭풍', '느린 행동이 됩니다. 피해 15 → 19.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 19 }] }, [], { v: 'deep' }],
        ['hv_sm_chill', '얼음 폭풍', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      h5_tailwind: [
        ['hv_tw_three', '센 순풍', '두 발 → 세 발.', { fxSet: [{ k: 'hnNock', shots: 3, txt: '다음 기본 공격 5번이 세 발' }] }, [], { v: 'deep' }],
        ['hv_tw_focus', '겨눈 순풍', '켤 때 추적한 적 추적 +1겹.', { fxAdd: [{ k: 'hnFocusSelf', n: 1, txt: '추적한 적 추적 +1겹' }] }, ['추적'], { v: 'link' }]],
      h5_gale: [
        ['hv_gl_long', '긴 질풍', '3라운드 → 4라운드.', { fxSet: [{ k: 'hnGale', r: 4, txt: '4라운드 동안 매 라운드 두 번 움직이고(가속), 기본 공격이 두 발.' }] }, [], { v: 'deep' }],
        ['hv_gl_bleed', '피바람 난사', '그동안 기본 공격에 출혈 1.', { fxSet: [{ k: 'hnGale', bleed: 1 }] }, ['출혈'], { v: 'link' }]],
      h5_snare: [
        ['hv_sn_deep', '깊은 덫 화살', '피해 18 → 23.', { fxSet: [{ k: 'dmg', n: 23 }] }, [], { v: 'deep' }],
        ['hv_sn_focus', '표식 덫', '추적 1겹을 겁니다.', { fxAdd: [{ k: 'focusAdd', n: 1 }] }, ['추적'], { v: 'link' }]],
      h5_hide: [
        ['hv_hd_three', '깊이 숨기', '몸 빼기 2 → 3.', { fxSet: [{ k: 'evade', n: 3 }] }, [], { v: 'deep' }],
        ['hv_hd_prot', '숨은 갑옷', '보호 2.', { fxAdd: [{ k: 'st', s: 'protect', n: 2 }] }, ['보호'], { v: 'link' }]],
      h5_ambush: [
        ['hv_ab_deep', '긴 매복', '느린 행동이 됩니다. 피해 29 → 37.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 37 }] }, [], { v: 'deep' }],
        ['hv_ab_focus', '노린 매복', '추적 1겹을 겁니다.', { fxAdd: [{ k: 'focusAdd', n: 1 }] }, ['추적'], { v: 'link' }]],
      h5_camo: [
        ['hv_cm_more', '두꺼운 위장', '보호 19 → 21.', { fxSet: [{ k: 'st', s: 'protect', n: 21 }] }, [], { v: 'deep' }],
        ['hv_cm_dodge', '위장 뒤 빠지기', '몸 빼기 1.', { fxAdd: [{ k: 'evade', n: 1 }] }, ['몸 빼기'], { v: 'link' }]],
      h5_trap: [
        ['hv_tp_brk', '깊은 덫', '걸린 적 붕괴 +30.', { fxSet: [{ k: 'hnTrap', brk: 30 }] }, [], { v: 'deep' }],
        ['hv_tp_bleed', '피 묻은 덫', '걸린 적 출혈 2.', { fxSet: [{ k: 'hnTrap', bleed: 2 }] }, ['출혈'], { v: 'link' }]],
    },
  },
  /* 10월 18일 0.8.0 5단계 원소술사 (만든 사람 결정 9–12 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 3-6 · 8절. 스킬 24 + 강화 27 = 51노드.
     비용은 모두 쿨타임 변환값 그대로. 🔄는 공명 하나만 처치 환급(행동 끝 열충격 포함, data/skills.js krShock). 결정타: 태양 낙하 · 얼음 관 · 과부하(임계는 연쇄 충격의 출처로만) */
  elementalist: {
    /* 0.8.0 M5-5 원소술사 재설계 (10월 20일 만든 사람 설계지 2판). 공명 갈래 → 마력. 열충격을 키우는 칸은 빙염 경계에만. 생성: M5-5 gen.py */
    br: { 불꽃: 0, 서리: 120, 마력: 240 }, lane: { LL: -22, L: -12, C: 0, R: 12, RR: 22 },
    sec: { A: '불꽃', AB: '빙염', B: '서리', BC: '정적', C: '마력', CA: '마염' },
    rad: { 1: 125, 2: 185, 3: 255, 4: 320, 5: 395, 6: 470 }, paths: { 불꽃: { a: '화염탄', b: '불똥 세례' }, 서리: { a: '얼음 창', b: '서리 갑옷' }, 마력: { a: '마력 응축', b: '마력 방벽' } },
    skills: [
      ['e5_firebolt', '불꽃', 1, 1, 'LL', ['S'], 2, { excl: 'e5_sparks', path: 'a' }],
      ['e5_sparks', '불꽃', 1, 1, 'RR', ['S'], 2, { excl: 'e5_firebolt', path: 'b' }],
      ['e5_cloak', '불꽃', 1, 2, 'C', ['e5_firebolt', 'e5_sparks'], 1],
      ['e5_burnout', '불꽃', 2, 3, 'L', ['e5_firebolt', 'e5_sparks'], 2, { path: 'a' }],
      ['e5_spread', '불꽃', 2, 3, 'R', ['e5_firebolt', 'e5_sparks'], 2, { path: 'b' }],
      ['e5_inferno', '불꽃', 3, 5, 'L', ['e5_burnout', 'e5_spread'], 3, { path: 'a' }],
      ['e5_hongryeon', '불꽃', 3, 5, 'R', ['e5_burnout', 'e5_spread'], 3, { path: 'b' }],
      ['e5_icespear', '서리', 1, 1, 'LL', ['S'], 2, { excl: 'e5_frostarmor', path: 'a' }],
      ['e5_frostarmor', '서리', 1, 1, 'RR', ['S'], 2, { excl: 'e5_icespear', path: 'b' }],
      ['e5_rimefrost', '서리', 1, 2, 'C', ['e5_icespear', 'e5_frostarmor'], 1],
      ['e5_crack', '서리', 2, 3, 'L', ['e5_icespear', 'e5_frostarmor'], 2, { path: 'a' }],
      ['e5_icewall', '서리', 2, 3, 'R', ['e5_icespear', 'e5_frostarmor'], 2, { path: 'b' }],
      ['e5_shatter', '서리', 3, 5, 'L', ['e5_crack', 'e5_icewall'], 3, { path: 'a' }],
      ['e5_coldwave', '서리', 3, 5, 'R', ['e5_crack', 'e5_icewall'], 3, { path: 'b' }],
      ['e5_charge', '마력', 1, 1, 'LL', ['S'], 2, { excl: 'e5_barrier', path: 'a' }],
      ['e5_barrier', '마력', 1, 1, 'RR', ['S'], 2, { excl: 'e5_charge', path: 'b' }],
      ['e5_mark', '마력', 1, 2, 'C', ['e5_charge', 'e5_barrier'], 1],
      ['e5_volley', '마력', 2, 3, 'L', ['e5_charge', 'e5_barrier'], 2, { path: 'a' }],
      ['e5_mirror', '마력', 2, 3, 'R', ['e5_charge', 'e5_barrier'], 2, { path: 'b' }],
      ['e5_arcane', '마력', 3, 5, 'L', ['e5_volley', 'e5_mirror'], 3, { path: 'a' }],
      ['e5_ward', '마력', 3, 5, 'R', ['e5_volley', 'e5_mirror'], 3, { path: 'b' }],
      ['e5_weave', '빙염', 2, 3, 'C', ['e5_firebolt', 'e5_sparks', 'e5_icespear', 'e5_frostarmor'], 2, { requires: [['e5_firebolt', 'e5_sparks'], ['e5_icespear', 'e5_frostarmor']] }],
      ['e5_catalyst', '빙염', 2, 4, 'C', ['e5_weave'], 2],
      ['e5_arc', '빙염', 3, 5, 'L', ['e5_catalyst'], 3],
      ['e5_storm', '빙염', 3, 5, 'R', ['e5_catalyst'], 3],
      ['e5_avatar', '빙염', 3, 6, 'C', ['e5_arc', 'e5_storm'], 4],
      ['e5_frostbolt', '정적', 2, 3, 'C', ['e5_icespear', 'e5_frostarmor', 'e5_charge', 'e5_barrier'], 2, { requires: [['e5_icespear', 'e5_frostarmor'], ['e5_charge', 'e5_barrier']] }],
      ['e5_stillward', '정적', 2, 4, 'C', ['e5_frostbolt'], 2],
      ['e5_shardrain', '정적', 3, 5, 'L', ['e5_stillward'], 3],
      ['e5_stilleye', '정적', 3, 5, 'R', ['e5_stillward'], 3],
      ['e5_stasis', '정적', 3, 6, 'C', ['e5_shardrain', 'e5_stilleye'], 4],
      ['e5_manaflame', '마염', 2, 3, 'C', ['e5_charge', 'e5_barrier', 'e5_firebolt', 'e5_sparks'], 2, { requires: [['e5_charge', 'e5_barrier'], ['e5_firebolt', 'e5_sparks']] }],
      ['e5_kindlemana', '마염', 2, 4, 'C', ['e5_manaflame'], 2],
      ['e5_flamelance', '마염', 3, 5, 'L', ['e5_kindlemana'], 3],
      ['e5_heatshield', '마염', 3, 5, 'R', ['e5_kindlemana'], 3],
      ['e5_meteor', '마염', 3, 6, 'C', ['e5_flamelance', 'e5_heatshield'], 4],
      ['e5_frostember', '결합', 2, 4, 'C', [], 2, { reqTags: { 둔화: 2, 화상: 1 }, ang: 30 }],
      ['e5_frostwall', '결합', 2, 4, 'C', [], 2, { reqTags: { 보호: 1, 둔화: 1 }, ang: 150 }],
      ['e5_manafire', '결합', 2, 4, 'C', [], 2, { reqTags: { 기본공격연동: 1, 화상: 1 }, ang: 270 }],
    ],
    vars: {
      /* 스킬마다 변형 둘(둘 다 제시): v 'deep' 깊게 = 같은 길을 세게, v 'link' 잇기 = 그 스킬에 없던 다른 빌드의 꼬리표를 더해 경계 · 결합 칸으로. [Claude 초안] */
      e5_firebolt: [
        ['ev_fb_more', '짙은 화염탄', '화상 3 → 5.', { fxSet: [{ k: 'st', s: 'ignite', n: 5 }] }, [], { v: 'deep' }],
        ['ev_fb_chill', '서리 낀 화염', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      e5_sparks: [
        ['ev_sp_deep', '굵은 불똥', '느린 행동이 됩니다. 피해 12 → 17.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 17 }] }, [], { v: 'deep' }],
        ['ev_sp_vuln', '드러내는 불똥', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_cloak: [
        ['ev_cl_more', '긴 외투', '5라운드 → 7라운드.', { fxSet: [{ k: 'elRimeR', s: 'ignite', r: 7 }] }, [], { v: 'deep' }],
        ['ev_cl_chill', '서리 외투', '같은 5라운드 동안 둔화 1도 겁니다.', { fxAdd: [{ k: 'elRimeR', s: 'chill', n: 1, r: 5 }] }, ['둔화'], { v: 'link' }]],
      e5_burnout: [
        ['ev_bo_deep', '깊은 불태우기', '화상 1마다 +3 → +4.', { fxSet: [{ k: 'burnOut', per: 4 }] }, [], { v: 'deep' }],
        ['ev_bo_chill', '식은 재', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      e5_spread: [
        ['ev_spr_wide', '넓은 불길', '절반 → 70%.', { fxSet: [{ k: 'elSpreadIgn', per: 0.7, txt: '대상 화상 70%를 다른 적 모두에게' }] }, [], { v: 'deep' }],
        ['ev_spr_brk', '무너뜨리는 불', '붕괴 +15.', { fxAdd: [{ k: 'brk', n: 15 }] }, ['붕괴'], { v: 'link' }]],
      e5_inferno: [
        ['ev_inf_deep', '거센 대화재', '느린 행동이 됩니다. 피해 18 → 27.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 27 }] }, [], { v: 'deep' }],
        ['ev_inf_vuln', '드러난 잿더미', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_hongryeon: [
        ['ev_hr_more', '붉은 연꽃', '화상 2 → 3.', { fxSet: [{ k: 'st', s: 'ignite', n: 3 }] }, [], { v: 'deep' }],
        ['ev_hr_chill', '서리 연꽃', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      e5_icespear: [
        ['ev_is_more', '깊은 얼음 창', '둔화 2 → 3.', { fxSet: [{ k: 'st', s: 'chill', n: 3 }] }, [], { v: 'deep' }],
        ['ev_is_ign', '달군 얼음 창', '화상 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'ignite', n: 1 }] }, ['화상'], { v: 'link' }]],
      e5_frostarmor: [
        ['ev_fa_more', '긴 갑옷', '8라운드 → 10라운드.', { fxSet: [{ k: 'elRimeR', s: 'chill', r: 10 }] }, [], { v: 'deep' }],
        ['ev_fa_prot', '얼음 껍질', '쓸 때 나에게 보호 1.', { fxAdd: [{ k: 'st', s: 'protect', n: 1 }] }, ['보호'], { v: 'link' }]],
      e5_rimefrost: [
        ['ev_rf_two', '두 줄기 서릿발', '두 발을 쏩니다.', { set: { hits: 2 } }, [], { v: 'deep' }],
        ['ev_rf_vuln', '드러내는 서리', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_crack: [
        ['ev_cr_deep', '깊은 균열', '둔화 1마다 붕괴 +12 → +18.', { fxSet: [{ k: 'elChillBrk', per: 18, txt: '대상 둔화 1마다 붕괴 +18' }] }, [], { v: 'deep' }],
        ['ev_cr_ign', '불붙은 균열', '화상 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'ignite', n: 1 }] }, ['화상'], { v: 'link' }]],
      e5_icewall: [
        ['ev_iw_more', '두꺼운 장벽', '보호 3 → 4.', { fxSet: [{ k: 'elProtR', n: 4, txt: '7라운드 동안 내 차례마다 보호 4까지' }] }, [], { v: 'deep' }],
        ['ev_iw_chill', '서리 장벽', '쓸 때 대상 없이 나를 친 적에게 다음 2번 둔화 1.', { fxAdd: [{ k: 'rime', s: 'chill', n: 1, times: 2 }] }, ['둔화'], { v: 'link' }]],
      e5_shatter: [
        ['ev_sh_deep', '깊은 파쇄', '둔화 1마다 피해 +8 → +12.', { fxSet: [{ k: 'elShatter', per: 12, txt: '둔화를 모두 지우고 둔화 1마다 피해 +12' }] }, [], { v: 'deep' }],
        ['ev_sh_ign', '달군 파쇄', '화상 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'ignite', n: 1 }] }, ['화상'], { v: 'link' }]],
      e5_coldwave: [
        ['ev_cw_deep', '긴 한파', '느린 행동이 됩니다. 피해 17 → 24.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 24 }] }, [], { v: 'deep' }],
        ['ev_cw_vuln', '드러내는 한파', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_charge: [
        ['ev_ch_four', '네 번 응축', '기본 공격 4번 → 5번.', { fxSet: [{ k: 'elCharge', n: 5, txt: '다음 기본 공격 5번 피해 +8' }] }, [], { v: 'deep' }],
        ['ev_ch_ign', '불 실은 응축', '그 기본 공격에 화상 1.', { fxAdd: [{ k: 'elChargeEl', ign: 1, txt: '그 기본 공격에 화상 1' }] }, ['화상'], { v: 'link' }]],
      e5_barrier: [
        ['ev_ba_more', '두꺼운 방벽', '보호막 28 → 34.', { fxSet: [{ k: 'ward', n: 34 }] }, [], { v: 'deep' }],
        ['ev_ba_chill', '서리 방벽 조각', '쓸 때 대상 없이 나를 친 적에게 다음 2번 둔화 1.', { fxAdd: [{ k: 'rime', s: 'chill', n: 1, times: 2 }] }, ['둔화'], { v: 'link' }]],
      e5_mark: [
        ['ev_mk_more', '깊은 표식', '취약 1 → 2.', { fxSet: [{ k: 'st', s: 'vuln', n: 2 }] }, [], { v: 'deep' }],
        ['ev_mk_ign', '불타는 표식', '화상 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'ignite', n: 1 }] }, ['화상'], { v: 'link' }]],
      e5_volley: [
        ['ev_vl_three', '세 번 연사', '기본 공격 6번 → 7번.', { fxSet: [{ k: 'elMulti', n: 7, txt: '다음 기본 공격 7번이 두 발' }] }, [], { v: 'deep' }],
        ['ev_vl_chill', '서리 연사', '그 기본 공격에 둔화 1.', { fxAdd: [{ k: 'elChargeEl', chill: 1, txt: '그 기본 공격에 둔화 1' }] }, ['둔화'], { v: 'link' }]],
      e5_mirror: [
        ['ev_mr_three', '세 겹 거울', '2번 → 3번.', { fxSet: [{ k: 'thorn', times: 3 }] }, [], { v: 'deep' }],
        ['ev_mr_chill', '얼음 거울', '쓸 때 대상 없이 나를 친 적에게 다음 2번 둔화 1.', { fxAdd: [{ k: 'rime', s: 'chill', n: 1, times: 2 }] }, ['둔화'], { v: 'link' }]],
      e5_arcane: [
        ['ev_ar_deep', '깊은 비전', '×2 → ×2.5.', { fxSet: [{ k: 'elArcane', mul: 2.5, txt: '취약 걸린 적에게 ×2.5' }] }, [], { v: 'deep' }],
        ['ev_ar_brk', '부수는 비전', '붕괴 +20.', { fxAdd: [{ k: 'brk', n: 20 }] }, ['붕괴'], { v: 'link' }]],
      e5_ward: [
        ['ev_wd_long', '긴 결계', '6라운드 → 7라운드.', { fxSet: [{ k: 'elBarrier', r: 7, txt: '7라운드 받는 피해 −42%' }] }, [], { v: 'deep' }],
        ['ev_wd_chill', '얼음 결계', '쓸 때 대상 없이 나를 친 적에게 다음 3번 둔화 1.', { fxAdd: [{ k: 'rime', s: 'chill', n: 1, times: 3 }] }, ['둔화'], { v: 'link' }]],
      e5_weave: [
        ['ev_wv_deep', '굵은 엮기', '피해 9 → 11.', { fxSet: [{ k: 'dmg', n: 11 }] }, [], { v: 'deep' }],
        ['ev_wv_vuln', '드러내는 엮기', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_catalyst: [
        ['ev_ct_deep', '진한 촉매', '2.1배 → 2.4배.', { fxSet: [{ k: 'elCat', mul: 2.4, txt: '이번 차례 열충격 2.4배' }] }, [], { v: 'deep' }],
        ['ev_ct_prot', '촉매 방벽', '보호 1.', { fxAdd: [{ k: 'st', s: 'protect', n: 1 }] }, ['보호'], { v: 'link' }]],
      e5_arc: [
        ['ev_arc_deep', '큰 충격', '느린 행동이 됩니다. 피해 18 → 23.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 23 }] }, [], { v: 'deep' }],
        ['ev_arc_brk', '부수는 충격', '붕괴 +13.', { fxAdd: [{ k: 'brk', n: 13 }] }, ['붕괴'], { v: 'link' }]],
      e5_storm: [
        ['ev_st_deep', '거센 폭풍', '느린 행동이 됩니다. 피해 6 → 8.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 8 }] }, [], { v: 'deep' }],
        ['ev_st_vuln', '드러내는 폭풍', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_avatar: [
        ['ev_av_long', '긴 화신', '3차례 → 4차례.', { fxSet: [{ k: 'elAvatar', r: 4, txt: '4차례 — 내 모든 공격이 화상 1과 둔화 1을 함께 건다(맞히는 족족 열충격).' }] }, [], { v: 'deep' }],
        ['ev_av_prot', '화신의 껍질', '쓸 때 보호 3.', { fxAdd: [{ k: 'st', s: 'protect', n: 3 }] }, ['보호'], { v: 'link' }]],
      e5_frostbolt: [
        ['ev_fbt_deep', '굵은 얼음 탄환', '피해 23 → 30.', { fxSet: [{ k: 'dmg', n: 30 }] }, [], { v: 'deep' }],
        ['ev_fbt_vuln', '드러내는 탄환', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_stillward: [
        ['ev_sw_more', '두꺼운 고요', '보호 2 → 3.', { fxSet: [{ k: 'elProtR', n: 3, txt: '6라운드 동안 내 차례마다 보호 3까지' }] }, [], { v: 'deep' }],
        ['ev_sw_chill', '서리 고요', '쓸 때 대상 없이 나를 친 적에게 다음 2번 둔화 1.', { fxAdd: [{ k: 'rime', s: 'chill', n: 1, times: 2 }] }, ['둔화'], { v: 'link' }]],
      e5_shardrain: [
        ['ev_sr_deep', '굵은 파편비', '느린 행동이 됩니다. 피해 18 → 25.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 25 }] }, [], { v: 'deep' }],
        ['ev_sr_vuln', '드러내는 파편', '취약 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'vuln', n: 1 }] }, ['취약'], { v: 'link' }]],
      e5_stilleye: [
        ['ev_se_long', '긴 고요', '10라운드 → 11라운드.', { fxSet: [{ k: 'foresee', rounds: 11 }] }, [], { v: 'deep' }],
        ['ev_se_chill', '얼어붙은 눈', '모든 적 둔화 1.', { fxAdd: [{ k: 'elChillAll', n: 1, txt: '모든 적 둔화 1' }] }, ['둔화'], { v: 'link' }]],
      e5_stasis: [
        ['ev_ss_brk', '깊은 정적', '강적 · 보스는 붕괴 +30도.', { fxSet: [{ k: 'elStasis', brk: 30 }] }, [], { v: 'deep' }],
        ['ev_ss_vuln', '드러난 정적', '모든 적 취약 1.', { fxAdd: [{ k: 'elVulnAll', n: 1, txt: '모든 적 취약 1' }] }, ['취약'], { v: 'link' }]],
      e5_manaflame: [
        ['ev_mf_deep', '굵은 마염탄', '피해 24 → 30.', { fxSet: [{ k: 'dmg', n: 30 }] }, [], { v: 'deep' }],
        ['ev_mf_chill', '서리 마염', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      e5_kindlemana: [
        ['ev_km_more', '짙은 불씨', '기본 공격 6번 → 8번.', { fxSet: [{ k: 'elCharge', n: 8, txt: '다음 기본 공격 8번에 화상 2' }] }, [], { v: 'deep' }],
        ['ev_km_vuln', '드러내는 불씨', '쓸 때 대상 취약 1.', { fxAdd: [{ k: 'elVulnFocus', n: 1, txt: '가장 센 적 취약 1' }] }, ['취약'], { v: 'link' }]],
      e5_flamelance: [
        ['ev_fl_deep', '긴 불꽃 창', '느린 행동이 됩니다. 피해 36 → 46.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 46 }] }, [], { v: 'deep' }],
        ['ev_fl_chill', '얼음 섞인 창', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
      e5_heatshield: [
        ['ev_hs_more', '타오르는 방패', '3라운드 동안 나를 친 적에게 화상 1도 겁니다.', { fxAdd: [{ k: 'elRimeR', s: 'ignite', n: 1, r: 3 }] }, [], { v: 'deep' }],
        ['ev_hs_chill', '서늘한 방패', '나를 친 적에게 다음 2번 둔화 1.', { fxAdd: [{ k: 'rime', s: 'chill', n: 1, times: 2 }] }, ['둔화'], { v: 'link' }]],
      e5_meteor: [
        ['ev_mt_deep', '거센 불의 비', '피해 39 → 52.', { fxSet: [{ k: 'dmg', n: 52 }] }, [], { v: 'deep' }],
        ['ev_mt_chill', '얼음비 섞기', '둔화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'chill', n: 1 }] }, ['둔화'], { v: 'link' }]],
    },
  },
  /* 0.8.0 M5-3(10월 20일 만든 사람 설계지 4판): 암살자 액티브 재설계. M5-0c 규격 — 갈래 3 × 길 둘 + 리듬 칸, 경계 5칸(대사 승부수 고정), 결합 칸 3(판마다 둘), 변형 스킬마다 둘.
     옛 사다리 트리(5단계)는 버렸다(옛 판은 포인트를 돌려받는다). 독사 a 독 바른 칼 · b 독안개, 격발 a 격발 표창 · b 격발 찌르기, 그림자 a 흘려 베기 · b 그림자 밟기 */
  assassin: {
    br: { 독사: 0, 격발: 120, 그림자: 240 }, lane: { LL: -22, L: -12, C: 0, R: 12, RR: 22 },
    sec: { A: '독사', AB: '독화', B: '격발', BC: '암영', C: '그림자', CA: '잔영' },
    rad: { 1: 125, 2: 185, 3: 255, 4: 320, 5: 395, 6: 470 }, paths: { 독사: { a: '독 바른 칼', b: '독안개' }, 격발: { a: '격발 표창', b: '격발 찌르기' }, 그림자: { a: '흘려 베기', b: '그림자 밟기' } },
    skills: [
      ['a_dokkal', '독사', 1, 1, 'LL', ['S'], 2, { excl: 'a_dokan', path: 'a' }], ['a_dokan', '독사', 1, 1, 'RR', ['S'], 2, { excl: 'a_dokkal', path: 'b' }], ['a_dokchim', '독사', 1, 2, 'C', ['a_dokkal', 'a_dokan'], 1],
      ['a_godok', '독사', 2, 3, 'L', ['a_dokkal', 'a_dokan'], 2, { path: 'a' }], ['a_beonji', '독사', 2, 3, 'R', ['a_dokkal', 'a_dokan'], 2, { path: 'b' }],
      ['a_maengdok', '독사', 3, 5, 'L', ['a_godok', 'a_beonji'], 3, { path: 'a' }], ['a_yeokbyeong', '독사', 3, 5, 'R', ['a_godok', 'a_beonji'], 3, { path: 'b' }],
      ['a_gyeokpyo', '격발', 1, 1, 'LL', ['S'], 2, { excl: 'a_gyeokjjil', path: 'a' }], ['a_gyeokjjil', '격발', 1, 1, 'RR', ['S'], 2, { excl: 'a_gyeokpyo', path: 'b' }], ['a_bangul', '격발', 1, 2, 'C', ['a_gyeokpyo', 'a_gyeokjjil'], 1],
      ['a_dokpyo', '격발', 2, 3, 'L', ['a_gyeokpyo', 'a_gyeokjjil'], 2, { path: 'a' }], ['a_dokssae', '격발', 2, 3, 'R', ['a_gyeokpyo', 'a_gyeokjjil'], 2, { path: 'b' }],
      ['a_yeonswae', '격발', 3, 5, 'L', ['a_dokpyo', 'a_dokssae'], 3, { path: 'a' }], ['a_gyeolsan', '격발', 3, 5, 'R', ['a_dokpyo', 'a_dokssae'], 3, { path: 'b' }],
      ['a_heulbe', '그림자', 1, 1, 'LL', ['S'], 2, { excl: 'a_balbgi', path: 'a' }], ['a_balbgi', '그림자', 1, 1, 'RR', ['S'], 2, { excl: 'a_heulbe', path: 'b' }], ['a_gyeonu', '그림자', 1, 2, 'C', ['a_heulbe', 'a_balbgi'], 1],
      ['a_heulkal', '그림자', 2, 3, 'L', ['a_heulbe', 'a_balbgi'], 2, { path: 'a' }], ['a_hugyeol', '그림자', 2, 3, 'R', ['a_heulbe', 'a_balbgi'], 2, { path: 'b' }],
      ['a_kalchum', '그림자', 3, 5, 'L', ['a_heulkal', 'a_hugyeol'], 3, { path: 'a' }], ['a_cheohyeong', '그림자', 3, 5, 'R', ['a_heulkal', 'a_hugyeol'], 3, { path: 'b' }],
      /* 경계 [Claude 초안](입구 · 둘째 · 3고리 둘: 공격 2 · 강화/방어 2) + 대사 승부수(만든 사람) */
      ['a_pieo', '독화', 2, 3, 'C', ['a_dokkal', 'a_dokan', 'a_gyeokpyo', 'a_gyeokjjil'], 2, { requires: [['a_dokkal', 'a_dokan'], ['a_gyeokpyo', 'a_gyeokjjil']] }], ['a_kkotip', '독화', 2, 4, 'C', ['a_pieo'], 2],
      ['a_heunal', '독화', 3, 5, 'L', ['a_kkotip'], 3], ['a_jangmak', '독화', 3, 5, 'R', ['a_kkotip'], 3], ['a_mandok', '독화', 3, 6, 'C', ['a_heunal', 'a_jangmak'], 4],
      ['a_geuneul', '암영', 2, 3, 'C', ['a_gyeokpyo', 'a_gyeokjjil', 'a_heulbe', 'a_balbgi'], 2, { requires: [['a_gyeokpyo', 'a_gyeokjjil'], ['a_heulbe', 'a_balbgi']] }], ['a_sumjuk', '암영', 2, 4, 'C', ['a_geuneul'], 2],
      ['a_kkweogi', '암영', 3, 5, 'L', ['a_sumjuk'], 3], ['a_yeonmak', '암영', 3, 5, 'R', ['a_sumjuk'], 3], ['a_muyeong', '암영', 3, 6, 'C', ['a_kkweogi', 'a_yeonmak'], 4],
      ['a_janjjil', '잔영', 2, 3, 'C', ['a_heulbe', 'a_balbgi', 'a_dokkal', 'a_dokan'], 2, { requires: [['a_heulbe', 'a_balbgi'], ['a_dokkal', 'a_dokan']] }], ['a_geurimdok', '잔영', 2, 4, 'C', ['a_janjjil'], 2],
      ['a_pagodeul', '잔영', 3, 5, 'L', ['a_geurimdok'], 3], ['a_heurit', '잔영', 3, 5, 'R', ['a_geurimdok'], 3], ['a_janyeong', '잔영', 3, 6, 'C', ['a_pagodeul', 'a_heurit'], 4],
      /* 결합 칸(설계지): 원 바깥, 꼬리표 조건, 판마다 셋 중 둘 */
      ['a_dokni', '결합', 2, 4, 'C', [], 2, { reqTags: { 중독: 2, 기본공격연동: 1 }, ang: 30 }], ['a_heuldok', '결합', 2, 4, 'C', [], 2, { reqTags: { 흘리기: 1, 중독: 1 }, ang: 150 }], ['a_dwikkot', '결합', 2, 4, 'C', [], 2, { reqTags: { 터뜨리기: 1, 후열: 1 }, ang: 270 }],
    ],
    vars: {
      /* 스킬마다 변형 둘(둘 다 제시): v 'deep' 깊게 = 같은 길을 세게, v 'link' 잇기 = 그 스킬에 없던 다른 빌드의 꼬리표를 더해 경계 · 결합 칸으로. [Claude 초안] */
      a_dokkal: [
        ['av_dk_more', '깊은 독 칼', '중독 4 → 7. 피해 20 → 13.', { fxSet: [{ k: 'dmg', n: 13 }, { k: 'poison', n: 7 }] }, [], { v: 'deep' }],
        ['av_dk_par', '독 칼 받기', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_dokan: [
        ['av_da_thick', '짙은 안개', '느린 행동이 됩니다. 중독 6 → 8.', { set: { time: 'slow' }, fxSet: [{ k: 'poison', n: 8 }] }, [], { v: 'deep' }],
        ['av_da_basic', '안개 속 칼', '다음 기본 공격 1번에 중독 1.', { fxAdd: [{ k: 'asNextPsn', n: 1, poison: 1, txt: '다음 기본 공격 1번에 중독 1' }] }, ['기본공격연동'], { v: 'link' }]],
      a_dokchim: [
        ['av_dc_three', '네 바늘', '기본 공격 3번 → 4번.', { fxSet: [{ k: 'asNextPsn', n: 4, txt: '다음 기본 공격 4번에 중독 2' }] }, [], { v: 'deep' }],
        ['av_dc_par', '흘린 독침', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_godok: [
        ['av_gd_fast', '서두른 고독', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, [], { v: 'deep' }],
        ['av_gd_brk', '고독 붕괴', '대상 중독 1마다 붕괴 +3.', { fxAdd: [{ k: 'brkPer', per: 3 }] }, ['붕괴'], { v: 'link' }]],
      a_beonji: [
        ['av_bj_wide', '넓은 번짐', '절반 → 70%를 번지게 합니다.', { fxSet: [{ k: 'spread', per: 0.7 }] }, [], { v: 'deep' }],
        ['av_bj_back', '먼 번짐', '후열까지 닿습니다.', { set: { tgt: 'ranged' } }, ['후열'], { v: 'link' }]],
      a_maengdok: [
        ['av_md_more', '진한 맹독', '중독 14 → 17.', { fxSet: [{ k: 'poison', n: 17 }] }, [], { v: 'deep' }],
        ['av_md_brk', '맹독 붕괴', '붕괴 +23.', { fxAdd: [{ k: 'brk', n: 23 }] }, ['붕괴'], { v: 'link' }]],
      a_yeokbyeong: [
        ['av_yb_more', '짙은 역병', '옮겨붙는 중독 1.6배 → 2배.', { fxSet: [{ k: 'asPlague', mul: 2, txt: '이번 전투: 쓰러진 적 중독의 2배가 다른 적에게 옮겨붙음' }] }, [], { v: 'deep' }],
        ['av_yb_par', '시든 칼', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_gyeokpyo: [
        ['av_gp_more', '깊은 표창', '터뜨리기 피해 1배 → 1.2배.', { fxSet: [{ k: 'burst', mul: 1.2 }] }, [], { v: 'deep' }],
        ['av_gp_psn', '표창 독', '터뜨린 뒤 중독 1.', { fxAdd: [{ k: 'poison', n: 1 }] }, ['중독'], { v: 'link' }]],
      a_gyeokjjil: [
        ['av_gj_fast', '서두른 찌르기', '빠른 칸이 됩니다. 터뜨리기 피해 1.5배 → 1.2배.', { set: { time: 'fast' }, fxSet: [{ k: 'burst', mul: 1.2 }] }, [], { v: 'deep' }],
        ['av_gj_par', '찌르고 흘리기', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_bangul: [
        ['av_bg_two', '두 방울', '중독 3 → 4.', { fxSet: [{ k: 'poison', n: 4 }] }, [], { v: 'deep' }],
        ['av_bg_brk', '붕괴 방울', '붕괴 +17.', { fxAdd: [{ k: 'brk', n: 17 }] }, ['붕괴'], { v: 'link' }]],
      a_dokpyo: [
        ['av_dp_more', '세 표창', '중독 5 → 7.', { fxSet: [{ k: 'poison', n: 7 }] }, [], { v: 'deep' }],
        ['av_dp_par', '표창 받기', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_dokssae: [
        ['av_ds_deep', '깊은 쐐기', '느린 행동이 됩니다. 중독 8 → 11.', { set: { time: 'slow' }, fxSet: [{ k: 'poison', n: 11 }] }, [], { v: 'deep' }],
        ['av_ds_brk', '쐐기 붕괴', '붕괴 +21.', { fxAdd: [{ k: 'brk', n: 21 }] }, ['붕괴'], { v: 'link' }]],
      a_yeonswae: [
        ['av_ys_brk', '연쇄 붕괴', '터뜨린 중독 1마다 붕괴 +4 → +7.', { fxSet: [{ k: 'burst', brkPer: 7 }] }, [], { v: 'deep' }],
        ['av_ys_psn', '연쇄 독', '터뜨린 뒤 중독 2.', { fxAdd: [{ k: 'poison', n: 2 }] }, ['중독'], { v: 'link' }]],
      a_gyeolsan: [
        ['av_gs_big', '큰 결산', '정예 · 보스에게 2배 → 2.5배.', { fxSet: [{ k: 'burst', big: 2.5 }] }, [], { v: 'deep' }],
        ['av_gs_back', '결산 표창', '후열까지 닿습니다.', { set: { tgt: 'ranged' } }, ['후열'], { v: 'link' }]],
      a_heulbe: [
        ['av_hb_deep', '깊은 흘림', '흘리기 80% → 90%.', { fxSet: [{ k: 'parry', red: 0.9 }] }, [], { v: 'deep' }],
        ['av_hb_psn', '독 베기', '흘려 내면 그 적에게 중독 2.', { fxAdd: [{ k: 'onParry', poison: 2 }] }, ['중독'], { v: 'link' }]],
      a_balbgi: [
        ['av_bb_deep', '깊은 밟기', '느린 행동이 됩니다. 피해 39 → 51.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 51 }] }, [], { v: 'deep' }],
        ['av_bb_psn', '그림자 독', '중독 2를 겁니다.', { fxAdd: [{ k: 'poison', n: 2 }] }, ['중독'], { v: 'link' }]],
      a_gyeonu: [
        ['av_gn_sharp', '날카로운 칼끝', '+20%p → +30%p.', { fxSet: [{ k: 'parryBuff', red: 0.3 }] }, [], { v: 'deep' }],
        ['av_gn_psn', '독 칼끝', '흘려 내면 그 적에게 중독 2.', { fxSet: [{ k: 'parryBuff', poison: 2 }] }, ['중독'], { v: 'link' }]],
      a_heulkal: [
        ['av_hk_deep', '깊은 칼', '×1.7 → ×2.', { fxSet: [{ k: 'asFlowBlade', mul: 2, txt: '이번 전투: 흘려 낸 다음 차례 첫 기본 공격 ×2' }] }, [], { v: 'deep' }],
        ['av_hk_psn', '독 묻은 칼', '그 공격에 중독 3.', { fxSet: [{ k: 'asFlowBlade', poison: 3, txt: '이번 전투: 흘려 낸 다음 차례 첫 기본 공격 ×1.7 · 중독 3' }] }, ['중독'], { v: 'link' }]],
      a_hugyeol: [
        ['av_hg_fast', '서두른 기습', '빠른 칸이 됩니다. 피해 30 → 21.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 21 }] }, [], { v: 'deep' }],
        ['av_hg_brk', '기습 붕괴', '붕괴 +22.', { fxAdd: [{ k: 'brk', n: 22 }] }, ['붕괴'], { v: 'link' }]],
      a_kalchum: [
        ['av_kc_deep', '두 겹 칼춤', '칼춤 기본 공격 ×1.6 → ×1.9.', { fxSet: [{ k: 'asDance', mul: 1.9, txt: '이번 전투: 흘려 낼 때마다 기본 공격 ×1.9 한 번 더' }] }, [], { v: 'deep' }],
        ['av_kc_psn', '독 칼춤', '칼춤 공격에 중독 2.', { fxSet: [{ k: 'asDance', poison: 2, txt: '이번 전투: 흘려 낼 때마다 기본 공격 ×1.6 한 번 더 · 중독 2' }] }, ['중독'], { v: 'link' }]],
      a_cheohyeong: [
        ['av_ch_fast', '서두른 처형', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, [], { v: 'deep' }],
        ['av_ch_brk', '처형 붕괴', '붕괴 +28.', { fxAdd: [{ k: 'brk', n: 28 }] }, ['붕괴'], { v: 'link' }]],
      a_pieo: [
        ['av_pe_more', '활짝 핀 독', '먼저 거는 중독 4 → 6.', { fxSet: [{ k: 'burst', pre: 6 }] }, [], { v: 'deep' }],
        ['av_pe_back', '피는 칼', '후열까지 닿습니다.', { set: { tgt: 'ranged' } }, ['후열'], { v: 'link' }]],
      a_kkotip: [
        ['av_kp_more', '모은 꽃잎', '2.7배 → 3.2배.', { fxSet: [{ k: 'asNextBurst', mul: 3.2, txt: '다음 터뜨리기 피해 3.2배' }] }, [], { v: 'deep' }],
        ['av_kp_basic', '꽃잎 독', '다음 기본 공격 1번에 중독 2.', { fxAdd: [{ k: 'asNextPsn', n: 1, poison: 2, txt: '다음 기본 공격 1번에 중독 2' }] }, ['기본공격연동'], { v: 'link' }]],
      a_heunal: [
        ['av_hn_slow', '느린 낙화', '느린 행동이 됩니다. 터뜨리기 피해 1배 → 1.2배.', { set: { time: 'slow' }, fxSet: [{ k: 'burst', mul: 1.2 }] }, [], { v: 'deep' }],
        ['av_hn_brk', '꽃 붕괴', '터뜨린 중독 1마다 붕괴 +3 → +6.', { fxSet: [{ k: 'burst', brkPer: 6 }] }, ['붕괴'], { v: 'link' }]],
      a_jangmak: [
        ['av_jm_long', '긴 장막', '3차례 → 4차례.', { fxSet: [{ k: 'asVeil', n: 4, txt: '4차례 나를 친 적에게 중독 3' }] }, [], { v: 'deep' }],
        ['av_jm_par', '장막 흘리기', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_geuneul: [
        ['av_gu_deep', '깊은 그늘', '중독 1마다 +3 → +4. 피해 25 → 18.', { fxSet: [{ k: 'dmg', n: 18 }, { k: 'exploit', per: 4 }] }, [], { v: 'deep' }],
        ['av_gu_par', '그늘 흘리기', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_sumjuk: [
        ['av_sj_three', '세 번 숨죽임', '2번 → 3번.', { fxSet: [{ k: 'parryBuff', times: 3 }] }, [], { v: 'deep' }],
        ['av_sj_psn', '독 숨', '흘려 내면 그 적에게 중독 2.', { fxSet: [{ k: 'parryBuff', poison: 2 }] }, ['중독'], { v: 'link' }]],
      a_kkweogi: [
        ['av_kw_deep', '깊이 꿰기', '무너진 적 2배 → 2.5배. 피해 49 → 39.', { fxSet: [{ k: 'dmg', n: 39 }, { k: 'brokenx', mul: 2.5 }] }, [], { v: 'deep' }],
        ['av_kw_psn', '꿰는 독', '중독 2를 겁니다.', { fxAdd: [{ k: 'poison', n: 2 }] }, ['중독'], { v: 'link' }]],
      a_yeonmak: [
        ['av_ym_more', '짙은 연막', '보호 18 → 24.', { fxSet: [{ k: 'st', s: 'protect', n: 24 }] }, [], { v: 'deep' }],
        ['av_ym_psn', '연막 독', '2차례 나를 친 적에게 중독 1.', { fxAdd: [{ k: 'asVeil', n: 2, poison: 1, txt: '2차례 나를 친 적에게 중독 1' }] }, ['중독'], { v: 'link' }]],
      a_janjjil: [
        ['av_jj_three', '세 번 찌르기', '2번 → 3번. 피해 10 → 7.', { set: { hits: 3 }, fxSet: [{ k: 'dmg', n: 7 }] }, [], { v: 'deep' }],
        ['av_jj_par', '잔영 흘리기', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_geurimdok: [
        ['av_gr_more', '짙은 그림자 독', '중독 3 → 4.', { fxSet: [{ k: 'asNextPsn', poison: 4, txt: '다음 기본 공격 3번에 중독 4' }] }, [], { v: 'deep' }],
        ['av_gr_par', '그림자 흘림', '다음 흘리기 +10%p.', { fxAdd: [{ k: 'parryBuff', red: 0.1 }] }, ['흘리기'], { v: 'link' }]],
      a_pagodeul: [
        ['av_pg_deep', '깊이 파고들기', '×1.5 → ×1.8. 피해 54 → 41.', { fxSet: [{ k: 'dmg', n: 41 }, { k: 'grow', mul: 1.8 }] }, [], { v: 'deep' }],
        ['av_pg_brk', '파고드는 칼', '붕괴 +22.', { fxAdd: [{ k: 'brk', n: 22 }] }, ['붕괴'], { v: 'link' }]],
      a_heurit: [
        ['av_hr_three', '더 흐릿한 몸', '2번 → 3번.', { fxSet: [{ k: 'parryBuff', times: 3 }] }, [], { v: 'deep' }],
        ['av_hr_psn', '흐릿한 독', '흘려 내면 그 적에게 중독 2.', { fxSet: [{ k: 'parryBuff', poison: 2 }] }, ['중독'], { v: 'link' }]],
      a_mandok: [
        ['av_mk_fast', '서두른 개화', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, [], { v: 'deep' }],
        ['av_mk_brk', '무너지는 꽃', '붕괴 +30.', { fxAdd: [{ k: 'brk', n: 30 }] }, ['붕괴'], { v: 'link' }]],
      a_muyeong: [
        ['av_my_deep', '깊은 무영', '무기 피해의 5.8배 → 6.5배.', { fxSet: [{ k: 'asHide', mul: 6.5, txt: '한 차례 숨었다가, 다음 차례 고른 적의 등 뒤에서 무기 피해의 6.5배로 벤다. 숨은 동안 광역을 포함한 어떤 공격의 표적도 되지 않는다(중독 같은 상태 피해는 받음).' }] }, [], { v: 'deep' }],
        ['av_my_brk', '무너뜨리는 무영', '벨 때 붕괴 +40.', { fxSet: [{ k: 'asHide', brk: 40 }] }, ['붕괴'], { v: 'link' }]],
      a_janyeong: [
        ['av_jy_long', '긴 난무', '4차례 → 5차례.', { fxSet: [{ k: 'asZan', n: 5, txt: '5차례 — 그림자 분신이 함께해, 내가 누른 기본 공격이 두 번 들어간다(분신은 기본 공격의 1.7배, 반격 · 추가타는 두 번이 아님).' }] }, [], { v: 'deep' }],
        ['av_jy_brk', '흔드는 잔영', '잔영난무 동안 강공격 붕괴 +5.', { fxSet: [{ k: 'asZan', brk: 5 }] }, ['붕괴'], { v: 'link' }]],
    },
  },
};
/* 지금 트리에서 빠진 스킬 (8-4 "뺌"): 옛 세이브 장착 목록에서 "더는 없는 스킬"로 보인다 */
const AT_GONE = { spellblade: ['sb_sweepcut', 'sb_pour', 'sb_redrain', 'sb_draw', 'sb_feast', 'sb_sparkcut', 'sb_ring', 'sb_flamedown', 'sb_sear', 'sb_flamedance', 'sb_lance', 'sb_chainfire', 'sb_blaze', 'sb_armor', 'sb_bulwark', /* M5-0c 재설계에서 빠진 칸 */ 'sb_redwind', 'sb_deluge', 'sb_kindle', 'sb_tome', 'sb_unravel', 'sb_turn', 'sb_searspread', 'sb_searburst', 'sb_atone', 'sb_ashstorm'],
  warden: ['w_raise', 'w_kindle', 'w_blaze', 'w_press', 'w_coat', 'w_burst', 'w_crush', 'w_molten', 'w_last', 'w_bulwarkhit', 'w_forge', 'w_unyield', 'w_scald', 'w_eternal', 'w_cinder', 's_gap', 's_knock', 's_mark', 's_smash', 's_knee', 's_dig', 's_hammer', 's_wedge', 's_crack', 's_throw', 's_pillar', 's_maul', 's_open', 's_rift', 's_judge', 's_wedgebite', 's_unravel', 's_stagger', 's_lever', 's_landslide', 's_lastblow', 'f_break', 'f_snare', 'f_cleave', 'f_chain', 'f_wall', 'f_spin', 'f_trample', 'f_drive', 'f_push', 'f_scatter', 'f_split', 'f_net', 'f_sweepline', 'f_onrush', 'f_noose', 'f_rout', 'f_siege'], /* M5-1 재설계: 트리에 없는 파수꾼 칸(스킬 데이터는 남음) */ monk: ['m_endless', 'm_knee', 'm_calm'],
  monk: ['m_answer', 'm_barrage', 'm_breaker', 'm_breath', 'm_cut', 'm_drain', 'm_far', 'm_finger', 'm_flick', 'm_flow', 'm_hundred', 'm_iron', 'm_karma', 'm_kifist', 'm_point', 'm_release', 'm_retort', 'm_root', 'm_rush', 'm_shove', 'm_sinew', 'm_siphon', 'm_stillpt', 'm_wave'], /* M5-2 재설계에서 빠진 옛 수도승 칸 */
  hunter: ['h_steady', 'h_finish', 'h_stance', 'h_slowrain', 'h_veil', 'h_foresee', 'h_ankle', 'h_barb', 'h_burst', 'h_chase', 'h_counter', 'h_crimson', 'h_dance', 'h_dash', 'h_deluge', 'h_dodge', 'h_doom', 'h_double', 'h_dull', 'h_frost', 'h_gap', 'h_giant', 'h_heart', 'h_heavy', 'h_hobble', 'h_houndshot', 'h_icecage', 'h_leg', 'h_lock', 'h_pierce', 'h_prey', 'h_rain', 'h_rend', 'h_scatter', 'h_shatter', 'h_side', 'h_skysplit', 'h_snare', 'h_spray', 'h_stop', 'h_switch', 'h_tearrain', 'h_throat', 'h_through', 'h_timeslow', 'h_triple', 'h_turn', 'h_unend', 'h_vital', 'h_void', 'h_weak', 'h_wedge', 'h_widen', 'h_zeal', 'hu_ankle', 'hu_crimson', 'hu_dance', 'hu_dash', 'hu_dull', 'hu_frost', 'hu_giant', 'hu_heart', 'hu_hound', 'hu_link1', 'hu_link2', 'hu_link3', 'hu_lock', 'hu_rend', 'hu_scatter', 'hu_sky', 'hu_slow', 'hu_snare', 'hu_spray', 'hu_throat', 'hu_through', 'hu_turn', 'hu_unend', 'hu_void', 'hu_wedge', 'hu_widen', 'hu_zeal'],
  elementalist: ['e_spread', 'e_stoke', 'e_catch', 'e_cloak', 'e_hoar', 'e_shell', 'e_hoarbloom', 'e_numb', 'e_frostwave', 'e_afterglow', 'e_afterheat', 'e_arc', 'e_armor', 'e_attune', 'e_avalanche', 'e_backdraft', 'e_bind', 'e_bite', 'e_breaker', 'e_burnout', 'e_cascade', 'e_catalyst', 'e_chainshock', 'e_chantburn', 'e_cinders', 'e_coffin', 'e_coldember', 'e_conflag', 'e_crack', 'e_cryo', 'e_disrupt', 'e_eclipse', 'e_firebolt', 'e_firewave', 'e_flash', 'e_hellfire', 'e_icepick', 'e_kindle', 'e_lance', 'e_maul', 'e_mirror', 'e_overload', 'e_phoenix', 'e_polar', 'e_pole', 'e_pyreheart', 'e_resonate', 'e_seal', 'e_shatter', 'e_sparks', 'e_spear', 'e_stasis', 'e_steam', 'e_sunfall', 'e_tundra', 'e_twin', 'e_veil', 'e_weave', 'eu_ash', 'eu_attune', 'eu_avalanche', 'eu_back', 'eu_burn', 'eu_cascade', 'eu_chain', 'eu_cold', 'eu_cryo', 'eu_eclipse', 'eu_flash', 'eu_gap', 'eu_heart', 'eu_heat', 'eu_hell', 'eu_lance', 'eu_mirror', 'eu_phoenix', 'eu_pick', 'eu_polar', 'eu_pole', 'eu_shatter', 'eu_sky', 'eu_spear', 'eu_steam', 'eu_tundra', 'eu_veil', 'e_ember', 'e_touch'],
  assassin: ['a_after', 'a_aim', 'a_ambush', 'a_brkneedle', 'a_burst', 'a_burststab', 'a_cataclysm', 'a_chain', 'a_check', 'a_crumble', 'a_dart', 'a_deepplant', 'a_deflect', 'a_double', 'a_essence', 'a_expose', 'a_fang', 'a_gap', 'a_hack', 'a_mark', 'a_mist', 'a_plant', 'a_pouch', 'a_rend', 'a_rot', 'a_rotbreath', 'a_rush', 'a_seep', 'a_shade', 'a_shadow', 'a_siphon', 'a_strangle', 'a_umbra', 'a_wedge'] }; // 0.8.0 5단계 2-6 · 3-6 "뺌", 사냥꾼은 원거리 초안 2-6 "뺌", 원소술사는 원거리 초안 3-6 "뺌"(10월 18일), 암살자는 원거리 초안 4-7 "뺌"(10월 18일 0.8.0 5단계, 그림자 범용 넷은 결정 15)
