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
    skills: [
      /* M5-0 보정 5(10월 20일 만든 사람) 1고리 갈림: 갈래마다 첫 스킬 둘 중 하나(excl), 리듬 칸 공통. 혈인 혈흔 베기 / 피의 낙인(되살림), 염검 불씨 투척 / 염화 베기(신규), 마갑 마갑참 / 마갑탄(2고리에서 올림). 마갑 2고리 빈자리는 회류참(보정 4에서 자른 칸 되살림) */
      ['sb_bleedcut', '혈인', 1, 1, 'LL', ['S'], 2, { excl: 'sb_bloodmark' }], ['sb_bloodmark', '혈인', 1, 1, 'RR', ['S'], 2, { excl: 'sb_bleedcut' }], ['sb_blooddrop', '혈인', 1, 2, 'C', ['sb_bleedcut', 'sb_bloodmark'], 1],
      ['sb_boil', '혈인', 2, 3, 'L', ['sb_bleedcut', 'sb_bloodmark'], 2], ['sb_taste', '혈인', 2, 3, 'R', ['sb_bleedcut', 'sb_bloodmark'], 2],
      ['sb_redwind', '혈인', 3, 5, 'L', ['sb_boil', 'sb_taste'], 3], ['sb_deluge', '혈인', 3, 5, 'R', ['sb_boil', 'sb_taste'], 4],
      ['sb_ember', '염검', 1, 1, 'LL', ['S'], 2, { excl: 'sb_flamecut' }], ['sb_flamecut', '염검', 1, 1, 'RR', ['S'], 2, { excl: 'sb_ember' }], ['sb_spark', '염검', 1, 2, 'C', ['sb_ember', 'sb_flamecut'], 1],
      ['sb_kindle', '염검', 2, 3, 'L', ['sb_ember', 'sb_flamecut'], 2], ['sb_char', '염검', 2, 3, 'R', ['sb_ember', 'sb_flamecut'], 2],
      ['sb_tome', '염검', 3, 5, 'L', ['sb_kindle', 'sb_char'], 3], ['sb_hellfire', '염검', 3, 5, 'R', ['sb_kindle', 'sb_char'], 4],
      ['sb_bladeward', '마갑', 1, 1, 'LL', ['S'], 2, { excl: 'sb_bolt' }], ['sb_bolt', '마갑', 1, 1, 'RR', ['S'], 2, { excl: 'sb_bladeward' }], ['sb_shard', '마갑', 1, 2, 'C', ['sb_bladeward', 'sb_bolt'], 1],
      ['sb_unravel', '마갑', 2, 3, 'L', ['sb_bladeward', 'sb_bolt'], 2], ['sb_turn', '마갑', 2, 3, 'R', ['sb_bladeward', 'sb_bolt'], 2],
      ['sb_shell', '마갑', 3, 5, 'L', ['sb_unravel', 'sb_turn'], 3], ['sb_finale', '마갑', 3, 5, 'R', ['sb_unravel', 'sb_turn'], 4],
      /* 경계: 입구(2고리)는 양쪽 갈래에서 첫 스킬을 하나씩(어느 쪽이든) 연 뒤. 둘째(2고리) → 3고리 둘 → 승부수(비용 4). 보정 5: 죄인의 피 둘째 = 죄인의 일격, 유산의 불 둘째 = 잿불 베기(공격 칸) */
      ['sb_bloodfire', '혈염', 2, 3, 'C', ['sb_ember', 'sb_flamecut', 'sb_bleedcut', 'sb_bloodmark'], 2, { requires: [['sb_ember', 'sb_flamecut'], ['sb_bleedcut', 'sb_bloodmark']] }], ['sb_hotedge', '혈염', 2, 4, 'C', ['sb_bloodfire'], 2],
      ['sb_searcut', '혈염', 3, 5, 'L', ['sb_hotedge'], 3], ['sb_searspread', '혈염', 3, 5, 'R', ['sb_hotedge'], 3], ['sb_kalpa', '혈염', 3, 6, 'C', ['sb_searcut', 'sb_searspread'], 4],
      ['sb_bloodmail', '죄인의 피', 2, 3, 'C', ['sb_bleedcut', 'sb_bloodmark', 'sb_bladeward', 'sb_bolt'], 2, { requires: [['sb_bleedcut', 'sb_bloodmark'], ['sb_bladeward', 'sb_bolt']] }], ['sb_sinstrike', '죄인의 피', 2, 4, 'C', ['sb_bloodmail'], 2],
      ['sb_film', '죄인의 피', 3, 5, 'L', ['sb_sinstrike'], 3], ['sb_shackle', '죄인의 피', 3, 5, 'R', ['sb_sinstrike'], 3], ['sb_sinwall', '죄인의 피', 3, 6, 'C', ['sb_film', 'sb_shackle'], 4],
      ['sb_heatmail', '유산의 불', 2, 3, 'C', ['sb_bladeward', 'sb_bolt', 'sb_ember', 'sb_flamecut'], 2, { requires: [['sb_bladeward', 'sb_bolt'], ['sb_ember', 'sb_flamecut']] }], ['sb_embercut', '유산의 불', 2, 4, 'C', ['sb_heatmail'], 2],
      ['sb_embermail', '유산의 불', 3, 5, 'L', ['sb_embercut'], 3], ['sb_cindermail', '유산의 불', 3, 5, 'R', ['sb_embercut'], 3], ['sb_firebody', '유산의 불', 3, 6, 'C', ['sb_embermail', 'sb_cindermail'], 4],
    ],
    vars: {
      /* M5-0 보정 5(10월 20일 만든 사람) P2 변형 강화: 스킬마다 변형 자리 하나(포인트 1), 변형 셋 중 하나를 고른다(판마다 둘이 제시된다). 같은 틀(set · fxSet · fxAdd · cond).
         변형은 빠르기 · 대상 · 조건 할인 · 처치 환급 위주, 순수 숫자 변형은 갈래마다 둘까지. 옛 강화(sbu_*)는 그 스킬의 변형 하나가 됐다. [id, 이름, 문장, 바꿈, 꼬리표] */
      sb_bleedcut: [
        ['sbu_chain', '혈인 연참', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유). 생명력 30% 이하인 적에게 피해 ×1.5.', { set: { killRecharge: 1 }, fxAdd: [{ k: 'lowx', hp: 0.3, mul: 1.5 }] }, ['처치']],
        ['sbv_bleedcut_fast', '스치는 칼', '빠른 칸이 됩니다. 피해 8 → 7.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 7 }] }, ['빠름']],
        ['sbv_bleedcut_front', '피 뿌리기', '전열 모두를 칩니다. 피해 8 → 5. 출혈 4 → 3.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 5 }, { k: 'st', s: 'bleed', n: 3 }] }, ['광역']]],
      sb_bloodmark: [
        ['sbv_mark_scarlet', '선홍 표식', '피해 7 → 8, 출혈 2 → 3, 칼에 싣는 출혈 3 → 4.', { fxSet: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'imbue', s: 'bleed', n: 4 }] }, []],
        ['sbv_mark_fast', '서두른 낙인', '빠른 칸이 됩니다. 피해 7 → 5.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['빠름']],
        ['sbv_mark_scent', '피 냄새', '대상의 출혈이 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=3' } }, ['출혈']]],
      sb_blooddrop: [
        ['sbv_drop_front', '흩뿌린 피', '전열 모두를 칩니다. 피해 8 → 5.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['광역']],
        ['sbv_drop_kill', '핏방울 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치']],
        ['sbv_drop_edge', '피 묻히기', '칼에 출혈 2를 싣습니다.', { fxAdd: [{ k: 'imbue', s: 'bleed', n: 2 }] }, ['싣기']]],
      sb_boil: [
        ['sbu_boil', '끓는 피', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_boil_slow', '들끓는 피', '보통 빠르기가 됩니다. 칼에 싣는 출혈 5 → 8.', { set: { time: 'normal' }, fxSet: [{ k: 'imbue', s: 'bleed', n: 8 }] }, []],
        ['sbv_boil_alt', '박자 끓이기', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_taste: [
        ['sbv_taste_fast', '맛보기', '빠른 칸이 됩니다. 피해 9 → 7.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 7 }] }, ['빠름']],
        ['sbv_taste_kill', '혈갈 연참', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치']],
        ['sbv_taste_trail', '혈흔 추적', '대상의 출혈이 5 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=5' } }, ['출혈']]],
      sb_redwind: [
        ['sbu_gale', '피바람', '쓰러진 적의 출혈이 곁의 적에게 번집니다.', { fxAdd: [{ k: 'killSpread', per: 1 }] }, []],
        ['sbv_wind_front', '붉은 칼바람', '전열만 칩니다. 피해 8 → 11.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 11 }] }, []],
        ['sbv_wind_resp', '받아낸 바람', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_deluge: [
        ['sbv_deluge_slow', '큰비', '느린 행동이 됩니다. 피해 8 → 12.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 12 }] }, []],
        ['sbv_deluge_front', '좁은 비', '전열만 칩니다. 출혈 3 → 5.', { set: { tgt: 'front' }, fxSet: [{ k: 'st', s: 'bleed', n: 5 }] }, []],
        ['sbv_deluge_resp', '쏟아지는 대응', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_ember: [
        ['sbu_flare', '불꽃 탄', '칼에 화상 3을 싣습니다.', { fxAdd: [{ k: 'imbue', s: 'ignite', n: 3 }] }, ['싣기']],
        ['sbu_brand', '불의 표식', '화상 걸린 적에게 ×1.5.', { fxAdd: [{ k: 'kwx', s: 'ignite', mul: 1.5 }] }, []],
        ['sbv_ember_front', '불씨 흩뿌리기', '전열 모두를 칩니다. 피해 8 → 5. 화상 4 → 3.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 5 }, { k: 'st', s: 'ignite', n: 3 }] }, ['광역']]],
      sb_flamecut: [
        ['sbv_fc_fast', '빠른 달굼', '빠른 칸이 됩니다. 피해 9 → 7.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 7 }] }, ['빠름']],
        ['sbv_fc_front', '화염 휩쓸기', '전열 모두를 칩니다. 피해 9 → 6.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 6 }] }, ['광역']],
        ['sbv_fc_alt', '교대 달굼', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_spark: [
        ['sbv_spark_front', '불티', '전열 모두를 칩니다. 피해 8 → 5.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['광역']],
        ['sbv_spark_kill', '불씨 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치']],
        ['sbv_spark_slow', '느린 불씨', '느린 행동이 됩니다. 피해 8 → 13.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 13 }] }, []]],
      sb_kindle: [
        ['sbv_kindle_slow', '깊은 달굼', '보통 빠르기가 됩니다. 칼에 싣는 화상 5 → 8.', { set: { time: 'normal' }, fxSet: [{ k: 'imbue', s: 'ignite', n: 8 }] }, []],
        ['sbv_kindle_resp', '받아낸 불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_kindle_alt', '박자 달굼', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_char: [
        ['sbv_char_slow', '잔화 일격', '보통 빠르기가 됩니다. 피해 6 → 10, 화상 1마다 피해 +2.5 → +3.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 10 }, { k: 'exploit', s: 'ignite', per: 3 }] }, []],
        ['sbv_char_front', '잔화 휩쓸기', '전열 모두를 칩니다. 피해 6 → 4.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 4 }] }, ['광역']],
        ['sbv_char_kill', '잔화 연참', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치']]],
      sb_tome: [
        ['sbu_chainf', '불길 잇기', '대상의 화상이 5 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:ignite>=5' } }, []],
        ['sbv_tome_front', '불의 장', '전열 모두에게 겁니다. 화상 7 → 4.', { set: { tgt: 'front' }, fxSet: [{ k: 'st', s: 'ignite', n: 4 }] }, ['광역']],
        ['sbv_tome_fast', '찢은 서', '빠른 칸이 됩니다. 화상 7 → 5.', { set: { time: 'fast' }, fxSet: [{ k: 'st', s: 'ignite', n: 5 }] }, ['빠름']]],
      sb_hellfire: [
        ['sbv_hell_normal', '불벼락', '보통 빠르기가 됩니다. 피해 21 → 15.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 15 }] }, []],
        ['sbv_hell_front', '업화 장벽', '전열 모두를 칩니다. 피해 21 → 13.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 13 }] }, ['광역']],
        ['sbv_hell_resp', '받아낸 업화', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_bladeward: [
        ['sbu_counter', '맞받아 베기', '교대면 보호막 +4.', { fxAdd: [{ k: 'alt', ward: 4 }] }, []],
        ['sbv_bw_fast', '날랜 마갑참', '빠른 칸이 됩니다. 피해 12 → 9.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 9 }] }, ['빠름']],
        ['sbv_bw_front', '마갑 휘두르기', '전열 모두를 칩니다. 피해 12 → 8.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 8 }] }, ['광역']]],
      sb_bolt: [
        ['sbu_barrage', '방벽 포격', '보호막 비례 피해 0.5 → 1, 상한 12 → 18.', { fxSet: [{ k: 'wardDmg', per: 1, cap: 18 }] }, []],
        ['sbv_bolt_slow', '무거운 탄', '보통 빠르기가 됩니다. 피해 9 → 14.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 14 }] }, []],
        ['sbv_bolt_keep', '아끼는 탄', '보호막을 쓰지 않습니다(비례 피해는 그대로).', { fxSet: [{ k: 'wardDmg', spend: 0 }] }, ['보호막']]],
      sb_shard: [
        ['sbv_shard_front', '파편 흩뿌리기', '전열 모두를 칩니다. 피해 9 → 5.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['광역']],
        ['sbv_shard_kill', '파편 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치']],
        ['sbv_shard_slow', '무거운 파편', '느린 행동이 됩니다. 피해 9 → 14.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 14 }] }, []]],
      sb_unravel: [
        ['sbv_unr_fast', '날랜 교란', '빠른 칸이 됩니다. 피해 11 → 8.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 8 }] }, ['빠름']],
        ['sbv_unr_front', '교란의 물결', '전열 모두를 칩니다. 피해 11 → 7.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 7 }] }, ['광역']],
        ['sbv_unr_alt', '박자 교란', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_turn: [
        ['sbv_turn_front', '마검 연무', '전열 모두를 벱니다. 보통 빠르기, 붕괴 +9.', { set: { tgt: 'front', time: 'normal' }, fxAdd: [{ k: 'brk', n: 9 }] }, ['광역']],
        ['sbv_turn_coda', '마검 종곡', '이어진 교대면 붕괴 +30.', { fxAdd: [{ k: 'alt', run: 2, brk: 30 }] }, ['교대']],
        ['sbv_turn_resp', '받아 돌기', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_shell: [
        ['sbv_shell_slow', '두꺼운 전개', '보통 빠르기가 됩니다. 보호막 27 → 36.', { set: { time: 'normal' }, fxSet: [{ k: 'ward', n: 36 }] }, []],
        ['sbv_shell_resp', '받아낸 갑주', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_shell_alt', '박자 전개', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_finale: [
        ['sbu_release', '갑주 해방', '먼저 보호막 18 · 보호 1을 두르고, 남은 보호막을 모두 태워 피해로 바꿉니다(×1.5).', { fxAdd: [{ k: 'wardFirst', n: 18, protect: 1 }, { k: 'wardBurn', mul: 1.5 }] }, []],
        ['sbv_fin_normal', '빠른 일섬', '보통 빠르기가 됩니다. 피해 26 → 20.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 20 }] }, []],
        ['sbv_fin_front', '일섬 휩쓸기', '전열 모두를 칩니다. 피해 26 → 17.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 17 }] }, ['광역']]],
      sb_bloodfire: [
        ['sbu_bf_fast', '번지는 핏불', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_bf_resp', '받아낸 핏불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_bf_alt', '박자 핏불', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_hotedge: [
        ['sbv_he_front', '달아오른 칼바람', '전열 모두에게 겁니다.', { set: { tgt: 'front' } }, ['광역']],
        ['sbv_he_fast', '달아오른 손놀림', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_he_heat', '불길 따라', '대상의 화상이 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:ignite>=3' } }, ['화상']]],
      sb_searcut: [
        ['sbu_sear_both', '엉긴 상처', '대상에게 출혈 · 화상이 모두 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=1&kw:ignite>=1' } }, []],
        ['sbv_sc_front', '혈염 휩쓸기', '전열 모두를 칩니다. 피해 20 → 12.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 12 }] }, ['광역']],
        ['sbv_sc_fast', '혈염 찌르기', '빠른 칸이 됩니다. 피해 20 → 15.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 15 }] }, ['빠름']]],
      sb_searspread: [
        ['sbu_spread_sear', '번지는 혈흔', '대상에게 혈염이 있으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:sear>=1' } }, []],
        ['sbv_ss_front', '번지는 칼', '전열 모두를 칩니다. 피해 15 → 9.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 9 }] }, ['광역']],
        ['sbv_ss_kill', '핏불 거두기', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['처치']]],
      sb_kalpa: [
        ['sbv_kalpa_fast', '순간의 겁화', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_kalpa_resp', '받아낸 겁화', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_kalpa_alt', '박자 겁화', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
      sb_bloodmail: [
        ['sbu_bm_fast', '서두른 갑주', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_bm_resp', '받아낸 갑주', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_bm_scent', '피 냄새 갑주', '대상의 출혈이 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=3' } }, ['출혈']]],
      sb_sinstrike: [
        ['sbv_si_fast', '날랜 일격', '빠른 칸이 됩니다. 피해 8 → 6.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 6 }] }, ['빠름']],
        ['sbv_si_front', '죄인의 휩쓸기', '전열 모두를 칩니다. 피해 8 → 5.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 5 }] }, ['광역']],
        ['sbv_si_resp', '받아친 일격', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_film: [
        ['sbu_film_resp', '받아낸 피', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_film_fast', '서두른 피막', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_film_ward', '두꺼운 피막', '보호막이 10 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ward>=10' } }, ['보호막']]],
      sb_shackle: [
        ['sbu_shackle_fast', '서두른 족쇄', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_sh_resp', '받아낸 족쇄', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_sh_scent', '피 냄새 족쇄', '대상의 출혈이 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=3' } }, ['출혈']]],
      sb_sinwall: [
        ['sbv_sw_fast', '서두른 벽', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_sw_resp', '받아낸 벽', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_sw_scent', '피 냄새 벽', '대상의 출혈이 3 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:bleed>=3' } }, ['출혈']]],
      sb_heatmail: [
        ['sbu_hm_fast', '단숨의 열', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_hm_ward', '두꺼운 열', '보호막이 10 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ward>=10' } }, ['보호막']],
        ['sbv_hm_resp', '받아낸 열', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_embercut: [
        ['sbu_ash_fast', '털어 낸 재', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_ec_front', '잿불 휩쓸기', '전열 모두를 칩니다. 피해 9 → 6.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 6 }] }, ['광역']],
        ['sbv_ec_ward', '두꺼운 잿불 베기', '보호막이 10 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ward>=10' } }, ['보호막']]],
      sb_embermail: [
        ['sbu_em_ward', '두꺼운 잿불', '보호막이 10 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ward>=10' } }, ['보호막']],
        ['sbv_em_fast', '서두른 잿불', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_em_resp', '받아낸 잿불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']]],
      sb_cindermail: [
        ['sbv_cm_fast', '서두른 불씨', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_cm_resp', '받아낸 불씨', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_cm_ward', '두꺼운 불씨', '보호막이 10 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'ward>=10' } }, ['보호막']]],
      sb_firebody: [
        ['sbv_fb_fast', '순간의 불', '빠른 칸이 됩니다.', { set: { time: 'fast' } }, ['빠름']],
        ['sbv_fb_resp', '받아낸 불', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, ['대응']],
        ['sbv_fb_alt', '박자의 불', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['교대']]],
    },
  },
  /* 0.8.0 5단계 (10월 17일 만든 사람 검토 반영): docs/제안/0.8.0-5단계-파수꾼-수도승-트리초안-2026-10-17.md 2-6. 스킬 25 + 강화 27 = 52노드 */
  warden: {
    br: { 성벽: 0, 파쇄: 120, '전열 장악': 240 }, lane: { LL: -36, L: -18, C: 0, R: 18, RR: 36 },
    skills: [
      ['w_raise', '성벽', 1, 1, 'C', ['S'], 2], ['w_shove', '성벽', 1, 2, 'L', ['w_raise'], 2], ['w_flare', '성벽', 1, 2, 'R', ['w_raise'], 2], // 보호막 터뜨리기 3 → 2 (1고리 태우기)
      ['w_kindle', '성벽', 2, 3, 'LL', ['w_shove'], 2], ['w_stand', '성벽', 2, 3, 'L', ['w_shove'], 3], ['w_hold', '성벽', 2, 3, 'R', ['w_flare'], 2], ['w_blaze', '성벽', 2, 3, 'RR', ['w_flare'], 3],
      ['w_citadel', '성벽', 3, 5, 'L', ['w_stand'], 4], ['w_last', '성벽', 3, 5, 'R', ['w_blaze'], 4],
      ['s_knock', '파쇄', 1, 1, 'C', ['S'], 2], ['s_slam', '파쇄', 1, 2, 'L', ['s_knock'], 2], ['s_gap', '파쇄', 1, 2, 'R', ['s_knock'], 2],
      ['s_cut', '파쇄', 2, 3, 'LL', ['s_slam'], 3], ['s_crack', '파쇄', 2, 3, 'L', ['s_slam'], 2], ['s_dig', '파쇄', 2, 3, 'R', ['s_gap'], 3], ['s_throw', '파쇄', 2, 3, 'RR', ['s_gap'], 3],
      ['s_ruin', '파쇄', 3, 5, 'C', ['s_dig', 's_throw'], 4],
      ['f_sweep', '전열 장악', 1, 1, 'C', ['S'], 2], ['f_stomp', '전열 장악', 1, 2, 'L', ['f_sweep'], 2], ['f_break', '전열 장악', 1, 2, 'R', ['f_sweep'], 2],
      ['f_snare', '전열 장악', 2, 3, 'LL', ['f_stomp'], 2], ['f_cleave', '전열 장악', 2, 3, 'L', ['f_sweep'], 2], ['f_topple', '전열 장악', 2, 3, 'R', ['f_cleave'], 3], ['f_drag', '전열 장악', 2, 3, 'RR', ['f_break'], 3],
      ['f_collapse', '전열 장악', 3, 5, 'C', ['f_topple', 'f_cleave'], 4],
    ],
    ups: [
      ['wu_wil', '성벽', 1, 1, 'LL', 'w_raise', '받쳐 든 방패', '의지 1점마다 보호막 +1.', { fxSet: [{ k: 'ward', wil: 1 }] }, []],
      ['wu_coat', '성벽', 1, 2, 'LL', 'w_shove', '방벽 돌파', '피해 13 → 12, 보호막 10 → 15.', { fxSet: [{ k: 'dmg', n: 12 }, { k: 'ward', n: 15 }] }, ['w_coat']],
      ['wu_heat', '성벽', 1, 2, 'RR', 'w_flare', '달군 방패', '보호막이 20 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'ward>=20' } }, ['w_forge']],
      ['wu_burst', '성벽', 2, 4, 'R', 'w_flare', '보호막 폭발', '전열 모두를 칩니다. 태운 1마다 ×3 → ×2.5.', { set: { tgt: 'front' }, fxSet: [{ k: 'wardBurn', mul: 2.5 }] }, ['w_burst']],
      ['wu_scald', '성벽', 2, 4, 'LL', 'w_kindle', '용광 방벽', '보호막 21 → 28.', { fxSet: [{ k: 'ward', n: 28 }] }, ['w_scald']],
      ['wu_rebuild', '성벽', 2, 4, 'L', 'w_stand', '다시 세우는 벽', '빠른 칸이 됩니다. 채우기 60% → 40%, 보호를 주지 않습니다.', { set: { time: 'fast' }, fxSet: [{ k: 'wardFill', to: 0.4 }], fxDel: [{ k: 'st', s: 'protect' }] }, ['w_rebuild', 'w_unyield']],
      ['wu_crush', '성벽', 2, 4, 'C', 'w_hold', '짓누르는 방패', '피해 17 → 18, 보호막 비례 ×0.25 → ×0.5.', { fxSet: [{ k: 'dmg', n: 18 }, { k: 'wardDmg', per: 0.5 }] }, ['w_crush', 'w_press', 'w_eternal']],
      ['wu_molten', '성벽', 3, 5, 'RR', 'w_blaze', '쇳물 방패', '느림이 됩니다. 태우기 상한 14 → 20, 붕괴 +25.', { set: { time: 'slow' }, fxSet: [{ k: 'wardBurn', max: 20 }], fxAdd: [{ k: 'brk', n: 25 }] }, ['w_molten', 'w_breach']],
      ['wu_cinder', '성벽', 3, 6, 'R', 'w_last', '재가 되는 성벽', '큰 적(정예 · 강적 · 보스)에게 ×1.5.', { fxAdd: [{ k: 'bigx', mul: 1.5 }] }, ['w_cinder']],
      ['su_stagger', '파쇄', 1, 1, 'LL', 's_knock', '비틀거림', '모으는 적이면 붕괴 +70.', { fxAdd: [{ k: 'cutx', brk: 70 }] }, ['s_stagger']],
      ['su_pillar', '파쇄', 2, 3, 'C', 's_slam', '기둥 꺾기', '붕괴 37 → 47, 큰 적에게 ×1.5.', { fxSet: [{ k: 'brk', n: 47 }], fxAdd: [{ k: 'bigx', mul: 1.5 }] }, ['s_pillar', 's_smash', 's_hammer', 's_rift']],
      ['su_quake', '파쇄', 2, 4, 'LL', 's_cut', '흔들어 끊기', '붕괴 34 → 46.', { fxSet: [{ k: 'brk', n: 46 }] }, ['s_quake']],
      ['su_open', '파쇄', 2, 4, 'L', 's_crack', '약점 벌리기', '붕괴 37 → 44. 건 뒤 대상의 취약을 2배로.', { fxSet: [{ k: 'brk', n: 44 }], fxAdd: [{ k: 'vulnGrow', mul: 2 }] }, ['s_open', 's_wedge', 's_wedgebite', 's_mark']],
      ['su_maul', '파쇄', 2, 4, 'C', 's_gap', '깨뜨리는 망치', '느림이 됩니다. 무너진 적 ×2 → ×2.5.', { set: { time: 'slow' }, fxSet: [{ k: 'brokenx', mul: 2.5 }] }, ['s_maul']],
      ['su_lever', '파쇄', 2, 4, 'R', 's_dig', '균열 관통', '빠른 칸이 됩니다. 피해 15 → 12, 취약 2를 겁니다.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 12 }], fxAdd: [{ k: 'st', s: 'vuln', n: 2 }] }, ['s_lever', 's_unravel']],
      ['su_mark', '파쇄', 2, 4, 'RR', 's_throw', '약점 노리는 손', '대상의 취약이 3 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'kw:vuln>=3' } }, []],
      ['su_last', '파쇄', 3, 6, 'L', 's_ruin', '무너진 자의 최후', '생명력 30% 이하인 적에게 ×1.5.', { fxAdd: [{ k: 'lowx', hp: 0.3, mul: 1.5 }] }, ['s_lastblow', 's_judge']],
      ['su_slide', '파쇄', 3, 6, 'R', 's_ruin', '산사태', '무너지지 않은 적에게 쓰면 피해 대신 붕괴 50을 줍니다.', { fxAdd: [{ k: 'slide', brk: 50 }] }, ['s_fall', 's_landslide']],
      ['fu_charge', '전열 장악', 1, 1, 'LL', 'f_sweep', '방패 돌진', '피해 14 → 12, 붕괴 +21.', { fxSet: [{ k: 'dmg', n: 12 }], fxAdd: [{ k: 'brk', n: 21 }] }, ['f_charge', 'f_spin']],
      ['fu_onrush', '전열 장악', 2, 4, 'LL', 'f_stomp', '쇄도', '피해 3 → 8, 붕괴 24 → 34.', { fxSet: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 34 }] }, ['f_onrush']],
      ['fu_chain', '전열 장악', 2, 4, 'L', 'f_snare', '사슬 휘두르기', '전열 모두를 칩니다. 붕괴 31 → 23.', { set: { tgt: 'front' }, fxSet: [{ k: 'brk', n: 23 }] }, ['f_chain', 'f_sweepline']],
      ['fu_drive', '전열 장악', 2, 4, 'C', 'f_cleave', '몰아치기', '붕괴 +21.', { fxAdd: [{ k: 'brk', n: 21 }] }, ['f_drive']],
      ['fu_wall', '전열 장악', 2, 4, 'R', 'f_break', '방패 분쇄', '빠른 칸이 됩니다. 피해 15 → 11.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 11 }] }, ['f_wall', 'f_rampart']],
      ['fu_noose', '전열 장악', 2, 4, 'RR', 'f_break', '올가미', '붕괴 39 → 47, 둔화 3을 겁니다.', { fxSet: [{ k: 'brk', n: 47 }], fxAdd: [{ k: 'st', s: 'chill', n: 3 }] }, ['f_noose', 'f_net']],
      ['fu_hook', '전열 장악', 3, 5, 'RR', 'f_drag', '갈고리 사슬', '보통 빠르기가 됩니다. 피해 20 → 15, 둔화 2를 겁니다.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 15 }], fxAdd: [{ k: 'st', s: 'chill', n: 2 }] }, ['f_hook']],
      ['fu_split', '전열 장악', 3, 5, 'R', 'f_topple', '대지 가르기', '무너진 적 ×2 → ×2.5.', { fxSet: [{ k: 'brokenx', mul: 2.5 }] }, ['f_split', 'f_rout']],
      ['fu_siege', '전열 장악', 3, 6, 'C', 'f_collapse', '포위 분쇄', '둔화된 적에게 ×1.7.', { fxAdd: [{ k: 'chillx', mul: 1.7 }] }, ['f_siege', 'f_storm', 'f_trample']],
    ],
  },
  /* 0.8.0 5단계 수도승: 3-6. 스킬 24 + 강화 29 = 53노드 */
  monk: {
    br: { 철권: 0, 부동: 120, 혈도: 240 }, lane: { LL: -36, L: -18, C: 0, R: 18, RR: 36 },
    skills: [
      ['m_breath', '철권', 1, 1, 'C', ['S'], 2], ['m_kifist', '철권', 1, 2, 'L', ['m_breath'], 2], ['m_rush', '철권', 1, 2, 'R', ['m_breath'], 3],
      ['m_hundred', '철권', 2, 3, 'LL', ['m_kifist'], 3], ['m_barrage', '철권', 2, 3, 'L', ['m_kifist'], 3], ['m_flow', '철권', 2, 3, 'R', ['m_rush'], 2], ['m_wave', '철권', 2, 3, 'RR', ['m_rush'], 3],
      ['m_release', '철권', 3, 5, 'C', ['m_barrage', 'm_flow'], 4],
      ['m_iron', '부동', 1, 1, 'C', ['S'], 2], ['m_answer', '부동', 1, 2, 'L', ['m_iron'], 2], ['m_retort', '부동', 1, 2, 'R', ['m_iron'], 2],
      ['m_root', '부동', 2, 3, 'LL', ['m_answer'], 3], ['m_shove', '부동', 2, 3, 'L', ['m_answer'], 3], ['m_far', '부동', 2, 3, 'R', ['m_retort'], 3], ['m_breaker', '부동', 2, 3, 'RR', ['m_retort'], 3],
      ['m_karma', '부동', 3, 5, 'C', ['m_shove', 'm_breaker'], 4],
      ['m_point', '혈도', 1, 1, 'C', ['S'], 2], ['m_siphon', '혈도', 1, 2, 'L', ['m_point'], 2], ['m_sinew', '혈도', 1, 2, 'R', ['m_point'], 2],
      ['m_drain', '혈도', 2, 3, 'LL', ['m_siphon'], 3], ['m_cut', '혈도', 2, 3, 'L', ['m_siphon'], 3], ['m_finger', '혈도', 2, 3, 'R', ['m_sinew'], 2], ['m_flick', '혈도', 2, 3, 'RR', ['m_sinew'], 3],
      ['m_stillpt', '혈도', 3, 5, 'C', ['m_cut', 'm_flick'], 4],
    ],
    ups: [
      ['mu_deep', '철권', 1, 1, 'LL', 'm_breath', '깊은 호흡', '보통 빠르기가 됩니다(빠른 칸을 비웁니다). 기 3 → 4.', { set: { time: 'normal' }, fxSet: [{ k: 'st', s: 'empower', n: 4 }] }, []],
      ['mu_over', '철권', 2, 3, 'C', 'm_kifist', '넘치는 기', '쓴 뒤 기 +1(상한까지).', { fxAdd: [{ k: 'kiGrow', add: 1, mul: 1 }] }, ['m_overflow', 'm_surge']],
      ['mu_after', '철권', 2, 4, 'L', 'm_barrage', '잔상권', '큰 적(정예 · 강적 · 보스)에게 ×1.3.', { fxAdd: [{ k: 'bigx', mul: 1.3 }] }, ['m_afterimage', 'm_triple', 'm_double']],
      ['mu_chain', '철권', 2, 4, 'C', 'm_flow', '연환권', '19 한 번 → 9 세 번.', { set: { hits: 3 }, fxSet: [{ k: 'dmg', n: 9 }] }, ['m_chainfist', 'm_gale', 'm_jab']],
      ['mu_blast', '철권', 2, 4, 'R', 'm_rush', '기 폭발', '거둔 기 1마다 붕괴 +12.', { fxSet: [{ k: 'kiBurst', brk: 12 }] }, ['m_kiblast', 'm_kistrike']],
      ['mu_split', '철권', 2, 4, 'RR', 'm_rush', '기 가르기', '거둔 기의 절반을 남깁니다. 기 1마다 피해 +8 → +6.', { fxSet: [{ k: 'kiBurst', per: 6, keep: 0.5 }] }, ['m_split', 'm_dantian']],
      ['mu_storm', '철권', 3, 5, 'LL', 'm_hundred', '폭풍 연타', '5타 → 6타, 큰 적에게 ×1.3.', { set: { hits: 6 }, fxAdd: [{ k: 'bigx', mul: 1.3 }] }, ['m_tempest', 'm_storm']],
      ['mu_shock', '철권', 3, 5, 'RR', 'm_wave', '기 충격파', '전열 모두를 칩니다(후열에 닿지 않음). 기 1마다 +8 → +5.', { set: { tgt: 'front' }, fxSet: [{ k: 'kiBurst', per: 5 }] }, ['m_shock']],
      ['mu_spirit', '철권', 3, 6, 'L', 'm_release', '기혼 일격', '큰 적에게 ×1.4.', { fxAdd: [{ k: 'bigx', mul: 1.4 }] }, ['m_spirit']],
      ['mu_open', '철권', 3, 6, 'R', 'm_release', '열린 단전', '기가 5 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'ki>=5' } }, []],
      ['mu_vajra', '부동', 1, 1, 'LL', 'm_iron', '금강', '자세 덤 22 → 26, 되받으면 기 +1 더.', { fxSet: [{ k: 'stance', dmg: 26, ki: 1 }] }, ['m_diamond', 'm_thorns', 'm_myeongwang']],
      ['mu_wrath', '부동', 2, 2, 'LL', 'm_answer', '분노의 응수', '친 뒤 자세를 잡습니다(덤 없음).', { fxAdd: [{ k: 'stance' }] }, ['m_wrath', 'm_final', 'm_unbroken', 'm_vajra']],
      ['mu_repay', '부동', 2, 2, 'RR', 'm_retort', '되갚는 발', '붕괴 20 → 36.', { fxSet: [{ k: 'brk', n: 36 }] }, ['m_repay']],
      ['mu_ironmtn', '부동', 2, 3, 'C', 'm_iron', '철산고', '이 자세 동안 받는 직접 피해 −25%.', { fxSet: [{ k: 'stance', red: 0.25 }] }, ['m_ironmtn']],
      ['mu_still', '부동', 2, 4, 'LL', 'm_root', '고요한 받기', '되받은 적에게 둔화 2.', { fxSet: [{ k: 'stance', chill: 2 }] }, ['m_still']],
      ['mu_mtn', '부동', 2, 4, 'L', 'm_root', '산처럼', '자세의 기 +1 대신 되받기 붕괴 +40.', { fxSet: [{ k: 'stance', ki: 0, brk: 40 }] }, ['m_mountain']],
      ['mu_rebound', '부동', 2, 4, 'C', 'm_shove', '반탄', '기 1마다 피해 +6(기를 쓰지 않음).', { fxAdd: [{ k: 'kiPer', per: 6 }] }, ['m_rebound', 'm_tide', 'm_backlash', 'm_wavefall']],
      ['mu_farwall', '부동', 3, 5, 'R', 'm_far', '천리 부동', '되받으면 기 +1 더.', { fxSet: [{ k: 'stance', ki: 1 }] }, ['m_farwall']],
      ['mu_hundred', '부동', 3, 5, 'RR', 'm_breaker', '백배 갚기', '느림이 됩니다. 기 1마다 +7 → +13.', { set: { time: 'slow' }, fxSet: [{ k: 'kiPer', per: 13 }] }, ['m_hundredfold']],
      ['mu_karma', '부동', 3, 6, 'C', 'm_karma', '참회의 무게', '직전 적 차례를 자세로 맞았으면 비용 −1(바닥 1, 라운드에 한 번). 기는 깎지 않습니다.', { cond: { off: 1, when: 'stance' } }, []],
      ['mu_numb', '혈도', 1, 1, 'LL', 'm_point', '마비 지르기', '피해 16 → 20, 약화 1을 겁니다.', { fxSet: [{ k: 'dmg', n: 20 }], fxAdd: [{ k: 'st', s: 'weak', n: 1 }] }, ['m_numb', 'm_lock']],
      ['mu_drink', '혈도', 2, 3, 'C', 'm_siphon', '흐름 마시기', '둔화된 적에게 ×1.3.', { fxAdd: [{ k: 'chillx', mul: 1.3 }] }, ['m_drink', 'm_reverse', 'm_frozenvein']],
      ['mu_absorb', '혈도', 2, 4, 'LL', 'm_drain', '기맥 흡수', '둔화된 적에게 ×1.5.', { fxAdd: [{ k: 'chillx', mul: 1.5 }] }, ['m_absorb']],
      ['mu_death', '혈도', 2, 4, 'L', 'm_cut', '절맥', '빠른 칸이 됩니다(기가 실리지 않음). 피해 24 → 20, 약화 2를 겁니다.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 20 }], fxAdd: [{ k: 'st', s: 'weak', n: 2 }] }, ['m_deathpt']],
      ['mu_backflow', '혈도', 2, 4, 'R', 'm_finger', '거슬러 오르는 기', '둔화된 적이면 기 +1.', { fxAdd: [{ k: 'meSt', s: 'empower', n: 1, if: 'chill' }] }, ['m_backflow', 'm_reflux']],
      ['mu_seal', '혈도', 2, 4, 'RR', 'm_flick', '혈 봉쇄', '모으는 적이면 붕괴 +52.', { fxAdd: [{ k: 'cutx', brk: 52 }] }, ['m_seal', 'm_chainpt', 'm_allpoint']],
      ['mu_harvest', '혈도', 3, 5, 'LL', 'm_drain', '기 거두기', '전열 모두를 칩니다. 피해 23 → 14, 둔화된 적마다 기 +1.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 14 }, { k: 'meSt', s: 'empower', n: 1 }] }, ['m_harvest', 'm_press']],
      ['mu_world', '혈도', 3, 6, 'L', 'm_stillpt', '천지 정지', '보통 빠르기가 됩니다. 피해 32 → 24. 쓰기 전 대상이 둔화 · 약화 둘 다면 기 +2.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 24 }], fxAdd: [{ k: 'meSt', s: 'empower', n: 2, if: 'chillweak' }] }, ['m_freezeworld']],
      ['mu_great', '혈도', 3, 6, 'R', 'm_stillpt', '대주천', '기를 거둬 기 1마다 피해 +6.', { fxAdd: [{ k: 'kiBurst', per: 6 }] }, ['m_greatflow', 'm_kingvein', 'm_veinburst']],
    ],
  },
  /* 0.8.0 5단계 사냥꾼 (10월 18일 만든 사람 결정 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 2-6 · 2-6a · 8절. 스킬 24 + 강화 27 = 51노드.
     시작 스킬은 연계 갈래 태그(lb)를 가진다: 겨눠 쏘기 저격, 물러서며 쏘기 기동(data/skills.js). 연계 할인(cond link)은 갈래마다 1고리 유산 3 스킬 하나에만 */
  hunter: {
    br: { 저격: 0, 연사: 120, 기동: 240 }, lane: { LL: -36, L: -18, C: 0, R: 18, RR: 36 },
    skills: [
      ['h_prey', '저격', 1, 1, 'C', ['S'], 3], ['h_pierce', '저격', 1, 2, 'L', ['h_prey'], 2], ['h_burst', '저격', 1, 2, 'R', ['h_prey'], 3], // 추적 터뜨리기 4 → 3 (결정 4: 1고리 쓰기 칸)
      ['h_weak', '저격', 2, 3, 'LL', ['h_pierce'], 3], ['h_vital', '저격', 2, 3, 'L', ['h_pierce'], 3], ['h_heavy', '저격', 2, 3, 'C', ['h_pierce'], 3], ['h_chase', '저격', 2, 3, 'RR', ['h_burst'], 3],
      ['h_doom', '저격', 3, 5, 'C', ['h_burst'], 4],
      ['h_switch', '연사', 1, 1, 'C', ['S'], 2], ['h_double', '연사', 1, 2, 'L', ['h_switch'], 3], ['h_rain', '연사', 1, 2, 'R', ['h_switch'], 3],
      ['h_gap', '연사', 2, 3, 'LL', ['h_double'], 3], ['h_triple', '연사', 2, 3, 'L', ['h_double'], 3], ['h_barb', '연사', 2, 3, 'R', ['h_rain'], 3], ['h_tearrain', '연사', 2, 3, 'RR', ['h_rain'], 3],
      ['h_deluge', '연사', 3, 5, 'C', ['h_rain'], 4],
      ['h_dodge', '기동', 1, 1, 'C', ['S'], 2], ['h_leg', '기동', 1, 2, 'L', ['h_dodge'], 2], ['h_hobble', '기동', 1, 2, 'R', ['h_dodge'], 3],
      ['h_stop', '기동', 2, 3, 'LL', ['h_leg'], 3], ['h_shatter', '기동', 2, 3, 'L', ['h_leg'], 3], ['h_counter', '기동', 2, 3, 'R', ['h_dodge'], 3], ['h_side', '기동', 2, 3, 'RR', ['h_dodge'], 3],
      ['h_icecage', '기동', 3, 5, 'C', ['h_hobble'], 4],
    ],
    ups: [
      ['hu_lock', '저격', 1, 1, 'LL', 'h_prey', '표적 고정', '취약 1 → 2.', { fxSet: [{ k: 'st', s: 'vuln', n: 2 }] }, ['h_lock']],
      ['hu_through', '저격', 1, 2, 'LL', 'h_pierce', '관통 사격', '붕괴 18 → 25.', { fxSet: [{ k: 'brk', n: 25 }] }, ['h_through']],
      ['hu_link1', '저격', 1, 2, 'RR', 'h_burst', '이어 쏘는 화살', '연계로 쓰면(직전 갈래가 다르면) 비용 −1(바닥 1, 라운드에 한 번). 외길 사냥꾼이면 같은 갈래 스킬을 바로 이어 쓸 때 −1.', { cond: { off: 1, when: 'link' } }, []],
      ['hu_throat', '저격', 2, 4, 'R', 'h_burst', '숨통 겨누기', '가속이 있으면 1을 써서 피해 ×1.5. 그 대신 다음 라운드에 연속 행동을 하지 못합니다.', { fxAdd: [{ k: 'hasteSpend', mul: 1.5 }] }, ['h_throat', 'h_endhunt']],
      ['hu_widen', '저격', 2, 4, 'LL', 'h_weak', '약점 벌리기', '건 뒤 대상의 취약을 2배로(상한 5).', { fxAdd: [{ k: 'vulnGrow', mul: 2 }] }, ['h_widen', 'h_delve', 'h_nail']],
      ['hu_heart', '저격', 2, 4, 'L', 'h_vital', '심장 꿰뚫기', '취약 1마다 피해 +4 → +5.', { fxSet: [{ k: 'vulnPer', per: 5 }] }, ['h_heart']],
      ['hu_giant', '저격', 3, 5, 'L', 'h_heavy', '거인 사냥', '큰 적(정예 · 강적 · 보스)에게 ×1.5 → ×1.8.', { fxSet: [{ k: 'bigx', mul: 1.8 }] }, ['h_giant', 'h_killshot', 'h_oneshot']],
      ['hu_zeal', '저격', 2, 4, 'RR', 'h_chase', '집념의 화살', '큰 적(정예 · 강적 · 보스)에게 ×1.3.', { fxAdd: [{ k: 'bigx', mul: 1.3 }] }, ['h_zeal', 'h_hound', 'h_mark']],
      ['hu_unend', '저격', 3, 6, 'C', 'h_doom', '끝없는 사냥', '대상의 추적이 3겹 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'focus>=3' } }, ['h_unend']],
      ['hu_hound', '연사', 1, 1, 'LL', 'h_switch', '물어뜯는 화살', '바꿔 쏘기(기본 공격 버프)가 다음 라운드가 끝날 때까지 갑니다.', { fxSet: [{ k: 'bbuf', s: 'swap', r: 1 }] }, ['h_houndshot', 'h_cross']],
      ['hu_link2', '연사', 1, 2, 'LL', 'h_double', '이어 쏘는 활', '연계로 쓰면(직전 갈래가 다르면) 비용 −1(바닥 1, 라운드에 한 번). 외길 사냥꾼이면 같은 갈래 스킬을 바로 이어 쓸 때 −1.', { cond: { off: 1, when: 'link' } }, []],
      ['hu_turn', '연사', 2, 4, 'LL', 'h_double', '선회 사격', '덧화살이 켜진 동안 기본 공격이 직전에 친 적과 다른 적을 치면 ×1.3(덧화살 포함, 바꿔 쏘기와 곱함).', { fxSet: [{ k: 'bbuf', s: 'extra', turn: 1.3 }] }, ['h_turn', 'h_endless']],
      ['hu_spray', '연사', 2, 4, 'L', 'h_triple', '난사', '느림이 됩니다. 3타 → 4타.', { set: { time: 'slow', hits: 4 } }, ['h_spray', 'h_rapid', 'h_thousand', 'h_shade', 'h_storm']],
      ['hu_scatter', '연사', 2, 4, 'R', 'h_rain', '흩뿌리는 화살', '전열 모두를 칩니다(후열에 닿지 않음). 피해 8 → 11.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 11 }] }, ['h_scatter']],
      ['hu_dull', '연사', 2, 3, 'C', 'h_rain', '쇠약의 비', '약화 1을 겁니다.', { fxAdd: [{ k: 'st', s: 'weak', n: 1 }] }, ['h_dull', 'h_bloodrain']],
      ['hu_rend', '연사', 2, 4, 'RR', 'h_barb', '찢는 화살', '가시(기본 공격 버프)의 출혈 +2 → +3, 기간 2 → 3라운드.', { fxSet: [{ k: 'bbuf', s: 'barb', bleed: 3, r: 2 }] }, ['h_rend', 'h_thornrain']],
      ['hu_crimson', '연사', 3, 5, 'RR', 'h_tearrain', '붉은 폭우', '전열 모두를 칩니다(후열에 닿지 않음). 출혈 3 → 5.', { set: { tgt: 'front' }, fxSet: [{ k: 'st', s: 'bleed', n: 5 }] }, ['h_crimson', 'h_bloodstorm']],
      ['hu_sky', '연사', 3, 6, 'C', 'h_deluge', '하늘 가르기', '가속으로 두 번 움직이는 라운드면 피해 ×1.6. 쓴 뒤 이번 라운드 기본 공격 ×1.3.', { fxAdd: [{ k: 'hastex', mul: 1.6 }, { k: 'bbuf', s: 'sky', mul: 1.3, r: 0 }] }, ['h_skysplit', 'h_slaughter']],
      ['hu_dash', '기동', 2, 3, 'C', 'h_dodge', '질주', '회피 1 대신 나에게 가속 1(다음 라운드 연속 행동, 두 번째 차례는 유산이 차지 않음). 스태미나 38 → 20.', { fxDel: [{ k: 'evade' }], fxSet: [{ k: 'stam', n: 20 }], fxAdd: [{ k: 'meSt', s: 'haste', n: 1 }] }, ['h_dash', 'h_windarrow', 'h_mirage', 'h_shadowrun']],
      ['hu_ankle', '기동', 1, 2, 'LL', 'h_leg', '발목 끊기', '모으던 적을 이 스킬로 무너뜨리면 나에게 가속 1(유산 환급 없음).', { fxAdd: [{ k: 'onCutBreak', haste: 1 }] }, ['h_ankle', 'h_winterchain']],
      ['hu_link3', '기동', 1, 2, 'RR', 'h_hobble', '이어 묶는 화살', '연계로 쓰면(직전 갈래가 다르면) 비용 −1(바닥 1, 라운드에 한 번). 외길 사냥꾼이면 같은 갈래 스킬을 바로 이어 쓸 때 −1.', { cond: { off: 1, when: 'link' } }, []], // 8절 보완 2: 측정 스위치 HUNT_BRIDGE=1(tools/dgqa.js)이 when을 linkFast(연계이거나 이번 차례에 빠른 기동 스킬을 먼저 씀)로 바꾼다
      ['hu_frost', '기동', 2, 4, 'R', 'h_hobble', '얼어붙는 화살', '둔화된 적에게 ×1.5.', { fxAdd: [{ k: 'chillx', mul: 1.5 }] }, ['h_frost']],
      ['hu_dance', '기동', 2, 4, 'RR', 'h_counter', '반격의 춤', '반격 22 → 28.', { fxSet: [{ k: 'evadeCtr', dmg: 28 }] }, ['h_dance', 'h_after', 'h_wind']],
      ['hu_void', '기동', 3, 5, 'RR', 'h_side', '허공 사격', '공격을 피할 때마다 그 적에게 반격 사격(피해 7).', { fxAdd: [{ k: 'evadeCtr', dmg: 7 }] }, ['h_void']],
      ['hu_snare', '기동', 2, 4, 'LL', 'h_stop', '붙잡는 화살', '대상이 강타나 영창을 모으는 중이면 붕괴 +60.', { fxAdd: [{ k: 'cutx', brk: 60 }] }, ['h_snare']],
      ['hu_wedge', '기동', 3, 5, 'L', 'h_shatter', '얼음 쐐기', '빠른 칸이 됩니다. 피해 8 → 5, 둔화 2를 겁니다.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 5 }], fxAdd: [{ k: 'st', s: 'chill', n: 2 }] }, ['h_wedge', 'h_spread']],
      ['hu_slow', '기동', 3, 6, 'C', 'h_icecage', '시간 늦추기', '쓴 뒤 나에게 가속 1.', { fxAdd: [{ k: 'meSt', s: 'haste', n: 1 }] }, ['h_timeslow']],
    ],
  },
  /* 10월 18일 0.8.0 5단계 원소술사 (만든 사람 결정 9–12 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 3-6 · 8절. 스킬 24 + 강화 27 = 51노드.
     비용은 모두 쿨타임 변환값 그대로. 🔄는 공명 하나만 처치 환급(행동 끝 열충격 포함, data/skills.js krShock). 결정타: 태양 낙하 · 얼음 관 · 과부하(임계는 연쇄 충격의 출처로만) */
  elementalist: {
    br: { 불꽃: 0, 서리: 120, 공명: 240 }, lane: { LL: -36, L: -18, C: 0, R: 18, RR: 36 },
    skills: [
      ['e_kindle', '불꽃', 1, 1, 'C', ['S'], 2], ['e_sparks', '불꽃', 1, 2, 'L', ['e_kindle'], 3], ['e_burnout', '불꽃', 1, 2, 'R', ['e_kindle'], 3],
      ['e_afterglow', '불꽃', 2, 3, 'LL', ['e_sparks'], 2], ['e_seal', '불꽃', 2, 3, 'L', ['e_sparks'], 2], ['e_chantburn', '불꽃', 2, 3, 'R', ['e_burnout'], 3], ['e_firebolt', '불꽃', 2, 3, 'RR', ['e_burnout'], 3],
      ['e_sunfall', '불꽃', 3, 5, 'C', ['e_firebolt'], 4],
      ['e_bind', '서리', 1, 1, 'C', ['S'], 2], ['e_crack', '서리', 1, 2, 'L', ['e_bind'], 2], ['e_bite', '서리', 1, 2, 'R', ['e_bind'], 3],
      ['e_armor', '서리', 2, 3, 'LL', ['e_crack'], 2], ['e_stasis', '서리', 2, 3, 'L', ['e_crack'], 2], ['e_maul', '서리', 2, 3, 'R', ['e_bite'], 3], ['e_breaker', '서리', 2, 3, 'RR', ['e_bite'], 3],
      ['e_coffin', '서리', 3, 5, 'C', ['e_bite'], 4],
      ['e_weave', '공명', 1, 1, 'C', ['S'], 2], ['e_catalyst', '공명', 1, 2, 'L', ['e_weave'], 3], ['e_firewave', '공명', 1, 2, 'R', ['e_weave'], 3],
      ['e_twin', '공명', 2, 3, 'LL', ['e_catalyst'], 2], ['e_resonate', '공명', 2, 3, 'L', ['e_catalyst'], 3], ['e_arc', '공명', 2, 3, 'R', ['e_firewave'], 3], ['e_disrupt', '공명', 2, 3, 'RR', ['e_firewave'], 3],
      ['e_overload', '공명', 3, 5, 'C', ['e_catalyst'], 4],
    ],
    ups: [
      ['eu_hell', '불꽃', 2, 3, 'C', 'e_kindle', '겁화', '느림이 됩니다(빠른 칸을 비웁니다). 화상 5 → 10, 피해 6 → 3.', { set: { time: 'slow' }, fxSet: [{ k: 'dmg', n: 3 }, { k: 'st', s: 'ignite', n: 10 }] }, ['e_hellfire']],
      ['eu_phoenix', '불꽃', 2, 4, 'LL', 'e_sparks', '불새의 깃', '3타 → 5타, 타당 피해 5 → 4.', { set: { hits: 5 }, fxSet: [{ k: 'dmg', n: 4 }] }, ['e_phoenix', 'e_cinderrain', 'e_hellblaze']],
      ['eu_heart', '불꽃', 3, 5, 'LL', 'e_afterglow', '불씨 심장', '열충격 뒤 남기는 화상 3 → 4, 이 스킬로 일어난 열충격 ×1.3.', { fxSet: [{ k: 'shockx', keep: { s: 'ignite', n: 4 }, dmg: 1.3 }] }, ['e_pyreheart']],
      ['eu_burn', '불꽃', 1, 2, 'RR', 'e_burnout', '타오른 만큼', '태운 화상 1마다 피해 +3 → +4.', { fxSet: [{ k: 'burnOut', per: 4 }] }, ['e_conflag']],
      ['eu_ash', '불꽃', 2, 4, 'R', 'e_burnout', '잿더미', '생명력 35% 이하인 적에게 ×1.5.', { fxAdd: [{ k: 'lowx', hp: 0.35, mul: 1.5 }] }, ['e_cinders', 'e_ash']],
      ['eu_spear', '불꽃', 2, 4, 'RR', 'e_chantburn', '불꽃 창', '피해 15 → 22, 붕괴 +20.', { fxSet: [{ k: 'dmg', n: 22 }], fxAdd: [{ k: 'brk', n: 20 }] }, ['e_spear']],
      ['eu_lance', '불꽃', 2, 4, 'C', 'e_firebolt', '불의 창', '큰 적(정예 · 강적 · 보스)에게 ×1.5.', { fxAdd: [{ k: 'bigx', mul: 1.5 }] }, ['e_lance', 'e_scorchshot']],
      ['eu_eclipse', '불꽃', 3, 6, 'C', 'e_sunfall', '일식', '큰 적(정예 · 강적 · 보스)에게 ×1.5 → ×2.', { fxSet: [{ k: 'bigx', mul: 2 }] }, ['e_eclipse', 'e_meteor', 'e_judgefire']],
      ['eu_sky', '불꽃', 3, 6, 'R', 'e_sunfall', '타는 하늘', '대상의 화상이 5 이상이면 비용 −1(바닥 1, 라운드에 한 번). 태양 낙하는 화상을 지우지 않습니다.', { cond: { off: 1, when: 'kw:ignite>=5' } }, []],
      ['eu_cold', '서리', 1, 1, 'LL', 'e_bind', '식은 불씨', '이 스킬로 일어난 열충격 뒤 대상에게 둔화 1을 남깁니다.', { fxAdd: [{ k: 'shockx', keep: { s: 'chill', n: 1 } }] }, ['e_coldember']],
      ['eu_pick', '서리', 2, 4, 'LL', 'e_crack', '얼음 송곳', '대상이 영창 중이면 붕괴 +70.', { fxAdd: [{ k: 'cutx', brk: 70, chant: 1 }] }, ['e_icepick']],
      ['eu_mirror', '서리', 2, 4, 'L', 'e_armor', '얼음 거울', '되얼림 3번 → 4번, 나에게 보호 3.', { fxSet: [{ k: 'rime', times: 4 }], fxAdd: [{ k: 'meSt', s: 'protect', n: 3 }] }, ['e_mirror', 'e_icebarrier']],
      ['eu_tundra', '서리', 3, 5, 'L', 'e_stasis', '영구 동토', '모든 적을 칩니다. 피해 18 → 10, 둔화 3 → 1(한 적에게는 약해집니다).', { set: { tgt: 'all' }, fxSet: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'chill', n: 1 }] }, ['e_tundra', 'e_longwinter', 'e_snap', 'e_zero']],
      ['eu_shatter', '서리', 2, 4, 'R', 'e_bite', '산산조각', '이 스킬로 일어난 열충격의 붕괴 ×2.', { fxAdd: [{ k: 'shockx', brk: 2 }] }, ['e_shatter', 'e_hail', 'e_icelance']],
      ['eu_gap', '서리', 2, 4, 'RR', 'e_maul', '얼어붙은 틈', '대상의 둔화가 2 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'kw:chill>=2' } }, []],
      ['eu_flash', '서리', 3, 5, 'RR', 'e_breaker', '급랭', '둔화 2 → 3.', { fxSet: [{ k: 'st', s: 'chill', n: 3 }] }, ['e_flash']],
      ['eu_cryo', '서리', 3, 6, 'C', 'e_coffin', '극저온 파쇄', '큰 적(정예 · 강적 · 보스)에게 ×1.4.', { fxAdd: [{ k: 'bigx', mul: 1.4 }] }, ['e_cryo']],
      ['eu_avalanche', '서리', 3, 6, 'R', 'e_coffin', '눈사태', '전열 모두를 칩니다(후열에 닿지 않음). 피해 28 → 18(한 적의 붕괴가 줍니다).', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 18 }] }, ['e_avalanche']],
      ['eu_attune', '공명', 1, 1, 'LL', 'e_weave', '조율', '이 스킬로 일어난 열충격 뒤 대상에게 둔화 1을 남깁니다.', { fxAdd: [{ k: 'shockx', keep: { s: 'chill', n: 1 } }] }, ['e_attune']],
      ['eu_polar', '공명', 2, 4, 'LL', 'e_catalyst', '극성 뒤집기', '빠른 칸이 됩니다. 이 스킬로 일어난 열충격 ×1.5 → ×1.2, 열충격 붕괴 ×2.', { set: { time: 'fast' }, fxSet: [{ k: 'shockx', dmg: 1.2, brk: 2 }] }, ['e_polar']],
      ['eu_heat', '공명', 2, 4, 'L', 'e_twin', '잔열', '이 스킬로 일어난 열충격 뒤 대상에게 화상 3을 남깁니다.', { fxAdd: [{ k: 'shockx', keep: { s: 'ignite', n: 3 } }] }, ['e_afterheat']],
      ['eu_steam', '공명', 3, 5, 'L', 'e_resonate', '증기 폭발', '전열 모두를 칩니다(후열에 닿지 않음). 피해 15 → 9.', { set: { tgt: 'front' }, fxSet: [{ k: 'dmg', n: 9 }] }, ['e_steam', 'e_tempest', 'e_eyestorm']],
      ['eu_chain', '공명', 3, 6, 'C', 'e_overload', '연쇄 충격', '보통 빠르기가 됩니다. 이 스킬로 일어난 열충격 ×2 → ×1.6.', { set: { time: 'normal' }, fxSet: [{ k: 'shockx', dmg: 1.6 }] }, ['e_chainshock', 'e_critical']],
      ['eu_pole', '공명', 3, 6, 'L', 'e_overload', '극점', '대상의 둔화가 2 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'kw:chill>=2' } }, ['e_pole']],
      ['eu_back', '공명', 2, 4, 'R', 'e_firewave', '역화', '화상 1 대신 적마다 없는 원소를 겁니다(화상 3 / 둔화 1). 피해 10 → 6.', { fxSet: [{ k: 'dmg', n: 6 }], fxDel: [{ k: 'st', s: 'ignite' }], fxAdd: [{ k: 'weave', ign: 3, chill: 1 }] }, ['e_backdraft', 'e_maelstrom', 'e_stormfront']],
      ['eu_cascade', '공명', 2, 4, 'RR', 'e_arc', '원소 연쇄', '열충격의 번짐 50% → 70%.', { fxSet: [{ k: 'shockx', arc: 0.7 }] }, ['e_cascade', 'e_cloud', 'e_tide', 'e_resoburst']],
      ['eu_veil', '공명', 3, 5, 'RR', 'e_disrupt', '원소 장막', '이 행동으로 영창을 끊으면 나에게 보호 2.', { fxAdd: [{ k: 'meSt', s: 'protect', n: 2, on: 'cut' }] }, ['e_veil']],
    ],
  },
  /* 10월 18일 0.8.0 5단계 암살자 (만든 사람 결정 13–17 반영): docs/제안/0.8.0-5단계-원거리3직업-트리초안-2026-10-17.md 4-2 · 4-3 · 4-4 · 4-7 · 8절. 스킬 24 + 강화 27 = 51노드(1고리 14 · 2고리 26 · 3고리 11).
     비용은 흘려 베기 · 잔상만 4 → 3(결정 13), 나머지는 쿨타임 변환값. 🔄는 연쇄 격발 처치 환급 하나만(독무 · 그늘 숨기 🔄 뺌, 흘리기 성공 🔄 다섯 칸은 강화로 합치며 뺌).
     그림자 할인은 지금 어휘 resp(결정 14), 독 할인은 kw:poison>=n. 결정타: 종말의 격발 · 죽음의 그림자, 독사 맹독의 정수는 3 그대로(결정 16). 그림자 범용 넷은 뺌(결정 15).
     conv: set이 없는 [전환](둔한 독 · 끓는 피 · 독 묻은 칼막이)을 테스터(tools/dgqa.js isConv)가 [전환]으로 알게 하는 표시 */
  assassin: {
    br: { 독사: 0, 격발: 120, 그림자: 240 }, lane: { LL: -36, L: -18, C: 0, R: 18, RR: 36 },
    skills: [
      ['a_fang', '독사', 1, 1, 'C', ['S'], 3], ['a_hack', '독사', 1, 2, 'L', ['a_fang'], 2], ['a_siphon', '독사', 1, 2, 'R', ['a_fang'], 2],
      ['a_rot', '독사', 2, 3, 'LL', ['a_hack'], 2], ['a_double', '독사', 2, 3, 'L', ['a_hack'], 2], ['a_mist', '독사', 2, 3, 'R', ['a_siphon'], 3], ['a_dart', '독사', 2, 3, 'RR', ['a_siphon'], 3],
      ['a_essence', '독사', 3, 5, 'C', ['a_siphon'], 3],
      ['a_pouch', '격발', 1, 1, 'C', ['S'], 2], ['a_brkneedle', '격발', 1, 2, 'L', ['a_pouch'], 2], ['a_burst', '격발', 1, 2, 'R', ['a_pouch'], 3],
      ['a_crumble', '격발', 2, 3, 'LL', ['a_brkneedle'], 2], ['a_deepplant', '격발', 2, 3, 'L', ['a_brkneedle'], 3], ['a_burststab', '격발', 2, 3, 'R', ['a_burst'], 2], ['a_chain', '격발', 2, 3, 'RR', ['a_burst'], 3],
      ['a_cataclysm', '격발', 3, 5, 'C', ['a_burst'], 4],
      ['a_deflect', '그림자', 1, 1, 'C', ['S'], 3], ['a_shadow', '그림자', 1, 2, 'L', ['a_deflect'], 3], ['a_aim', '그림자', 2, 3, 'L', ['a_shadow'], 2], // 흘려 베기 4 → 3 (결정 13)
      ['a_gap', '그림자', 2, 3, 'LL', ['a_shadow'], 3], ['a_ambush', '그림자', 1, 2, 'R', ['a_deflect'], 2], ['a_after', '그림자', 2, 3, 'R', ['a_ambush'], 3], ['a_shade', '그림자', 2, 3, 'RR', ['a_ambush'], 2], // 잔상 4 → 3 (결정 13)
      // 10월 18일 0.8.0 5단계 마무리(원거리 초안 11-4, 만든 사람 승인): 후열 기습 ↔ 칼끝 겨누기 맞바꾸기. 후열 기습 1고리 r2 R(흘려 베기 밑), 칼끝 겨누기 2고리 r3 L(그림자 찌르기 밑), 잔상 · 그늘 숨기는 후열 기습 밑. 비용은 그대로
      ['a_umbra', '그림자', 3, 5, 'C', ['a_shadow'], 4],
    ],
    ups: [
      ['au_fang', '독사', 1, 1, 'LL', 'a_fang', '깊은 독니', '독 6 → 7.', { fxSet: [{ k: 'poison', n: 7 }] }, ['a_venomstrike']],
      ['au_sheath', '독사', 1, 2, 'LL', 'a_hack', '독 칼집', '쓰면 스태미나 +30.', { fxAdd: [{ k: 'stam', n: 30 }] }, ['a_sheath']],
      ['au_fester', '독사', 2, 4, 'LL', 'a_rot', '곪은 상처', '독 4 → 5.', { fxSet: [{ k: 'poison', n: 5 }] }, ['a_festerwound']],
      ['au_numb', '독사', 2, 4, 'L', 'a_rot', '둔한 독', '취약 3 대신 둔화 3을 겁니다(취약을 잃습니다).', { fxDel: [{ k: 'st', s: 'vuln' }], fxAdd: [{ k: 'st', s: 'chill', n: 3 }], conv: 1 }, ['a_numb', 'a_wither', 'a_sap']],
      ['au_cycle', '독사', 3, 5, 'L', 'a_double', '독의 순환', '모든 적에게 씁니다. 독 ×2.1 → ×1.6(한 적에게는 약해집니다).', { set: { tgt: 'all' }, fxSet: [{ k: 'grow', mul: 1.6 }] }, ['a_cycle', 'a_condense']],
      ['au_feast', '독사', 2, 4, 'R', 'a_siphon', '독 흡혈', '중독 1마다 생명력 1.5 → 2.5.', { fxSet: [{ k: 'drain', per: 2.5 }] }, ['a_feast', 'a_breath']],
      ['au_rain', '독사', 2, 4, 'RR', 'a_mist', '독 비', '독 4 → 5.', { fxSet: [{ k: 'poison', n: 5 }] }, ['a_rain', 'a_plaguecloud', 'a_bladedance']],
      ['au_web', '독사', 3, 5, 'RR', 'a_dart', '독 그물', '쓴 뒤 대상 중독의 절반이 다른 적에게 번집니다.', { fxAdd: [{ k: 'spread', per: 0.5 }] }, ['a_web', 'a_spread']],
      ['au_end', '독사', 3, 6, 'C', 'a_essence', '맹독의 끝', '대상의 중독이 15 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'kw:poison>=15' } }, []],
      ['au_fuse', '격발', 1, 2, 'LL', 'a_brkneedle', '붕괴 뇌관', '대상이 강타 · 폭발 · 영창을 모으는 중이면 붕괴 +70.', { fxAdd: [{ k: 'cutx', brk: 70 }] }, ['a_fuse', 'a_cutoff']],
      ['au_crumble', '격발', 2, 4, 'LL', 'a_crumble', '붕괴 격발', '중독 1마다 붕괴 25 → 32.', { fxSet: [{ k: 'brkPer', per: 32 }] }, ['a_brkburst']],
      ['au_deep', '격발', 2, 4, 'R', 'a_burst', '깊은 격발', '터뜨림 ×2.5 → ×3.', { fxSet: [{ k: 'burst', mul: 3 }] }, ['a_deepburst', 'a_gash', 'a_vitalburst']],
      ['au_pop', '격발', 2, 3, 'C', 'a_burst', '독침 파열', '빠른 칸이 됩니다. 먼저 독 4를 걸고 2만 터뜨립니다(터뜨리는 독이 2뿐입니다).', { set: { time: 'fast' }, fxSet: [{ k: 'burst', pre: 4, top: 2 }] }, ['a_pop']],
      ['au_reap', '격발', 2, 4, 'C', 'a_burststab', '거두기', '생명력 35% 이하인 적에게 ×2.', { fxAdd: [{ k: 'lowx', hp: 0.35, mul: 2 }] }, ['a_reap', 'a_finish', 'a_gallows', 'a_hunt']],
      ['au_wick', '격발', 2, 4, 'RR', 'a_chain', '연쇄 도화선', '큰 적(정예 · 강적 · 보스)에게 ×2.', { fxAdd: [{ k: 'bigx', mul: 2 }] }, ['a_wick']],
      ['au_boil', '격발', 3, 5, 'RR', 'a_chain', '끓는 피', '터뜨린 독의 절반을 남깁니다. 터뜨림 ×2 → ×1.6(한 번의 피해가 줍니다).', { fxSet: [{ k: 'burst', keep: 0.5, mul: 1.6 }], conv: 1 }, ['a_boil']],
      ['au_finale', '격발', 3, 6, 'C', 'a_cataclysm', '숨통 터뜨리기', '생명력 30% 이하인 적에게 터뜨림 ×2.6 → ×3.2.', { fxAdd: [{ k: 'execute', hp: 0.3, mul: 3.2 }] }, ['a_finale', 'a_verdict']],
      ['au_det', '격발', 3, 6, 'R', 'a_cataclysm', '맹독 뇌관', '대상의 중독이 10 이상이면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'kw:poison>=10' } }, []],
      ['au_counter', '그림자', 2, 3, 'C', 'a_deflect', '되받아치기', '흘려 내면 피해 14 → 20, 붕괴 +10.', { fxSet: [{ k: 'onParry', dmg: 20, brk: 10 }] }, ['a_counter']],
      ['au_venom', '그림자', 2, 4, 'C', 'a_deflect', '독 묻은 칼막이', '흘려 내면 피해 대신 중독 7을 겁니다(흘려 낸 피해를 잃습니다).', { fxSet: [{ k: 'onParry', dmg: 0, poison: 7 }], conv: 1 }, ['a_venomguard', 'a_venomriposte']],
      ['au_step', '그림자', 1, 2, 'LL', 'a_shadow', '그림자 걸음', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'resp' } }, []],
      ['au_pierce', '그림자', 2, 4, 'LL', 'a_gap', '급소 꿰기', '무너진 적에게 ×2, 붕괴 28 → 37.', { fxSet: [{ k: 'brk', n: 37 }], fxAdd: [{ k: 'brokenx', mul: 2 }] }, ['a_pierce', 'a_breach', 'a_darkstrike', 'a_trip']],
      ['au_chase', '그림자', 3, 5, 'L', 'a_ambush', '그림자 추격', '큰 적(정예 · 강적 · 보스)에게 ×1.8, 취약 2를 겁니다.', { fxAdd: [{ k: 'bigx', mul: 1.8 }, { k: 'st', s: 'vuln', n: 2 }] }, ['a_chase', 'a_step', 'a_daggerrain']],
      ['au_throat', '그림자', 3, 6, 'C', 'a_umbra', '목을 긋는 그림자', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 라운드에 한 번).', { cond: { off: 1, when: 'resp' } }, []],
      ['au_smoke', '그림자', 2, 4, 'L', 'a_aim', '연막', '다음 흘리기의 감소분 +30%p.', { fxSet: [{ k: 'parryBuff', red: 0.3 }] }, ['a_smoke']],
      ['au_reprisal', '그림자', 2, 4, 'R', 'a_after', '그림자 역습', '흘려 내면 붕괴 9 → 20.', { fxSet: [{ k: 'onParry', brk: 20 }] }, ['a_reprisal']],
      ['au_dance', '그림자', 2, 4, 'RR', 'a_shade', '흘림의 춤', '다음 흘리기 1번 → 2번, 흘려 내면 피해 14 → 21.', { fxSet: [{ k: 'parryBuff', times: 2, dmg: 21 }] }, ['a_parrydance', 'a_backstep']],
    ],
  },
};
/* 지금 트리에서 빠진 스킬 (8-4 "뺌"): 옛 세이브 장착 목록에서 "더는 없는 스킬"로 보인다 */
const AT_GONE = { spellblade: ['sb_sweepcut', 'sb_pour', 'sb_redrain', 'sb_draw', 'sb_crimson', 'sb_feast', 'sb_sparkcut', 'sb_ring', 'sb_flamedown', 'sb_sear', 'sb_flamedance', 'sb_lance', 'sb_chainfire', 'sb_blaze', 'sb_armor', 'sb_spellguard', 'sb_bulwark'],
  warden: ['w_spikes', 'w_armor', 'w_rampart', 'w_bulwarkhit', 'w_beyond', 's_knee', 'f_push', 'f_scatter'], monk: ['m_endless', 'm_knee', 'm_calm'],
  hunter: ['h_steady', 'h_finish', 'h_stance', 'h_slowrain', 'h_veil', 'h_foresee'],
  elementalist: ['e_spread', 'e_stoke', 'e_catch', 'e_cloak', 'e_hoar', 'e_shell', 'e_hoarbloom', 'e_numb', 'e_frostwave'],
  assassin: ['a_wedge', 'a_seep', 'a_rotbreath', 'a_plant', 'a_rend', 'a_expose', 'a_check', 'a_mark', 'a_strangle', 'a_rush'] }; // 0.8.0 5단계 2-6 · 3-6 "뺌", 사냥꾼은 원거리 초안 2-6 "뺌", 원소술사는 원거리 초안 3-6 "뺌"(10월 18일), 암살자는 원거리 초안 4-7 "뺌"(10월 18일 0.8.0 5단계, 그림자 범용 넷은 결정 15)
