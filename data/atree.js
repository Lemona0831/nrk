/* 0.8.0 액티브 방사 트리 데이터 (10월 16일 0.8.0 2단계, docs/제안/0.8.0-1단계-트리설계-2026-10-16.md 1-2 · 1-3 · 8절)
   마검사는 8절 승인 초안 그대로(스킬 22 + 강화 23 = 45노드). 다른 8직업은 js/23-tree-engine.js의 atBuild가 지금 스킬 칸(SKILLS2의 갈래 · 줄 · par)으로 임시 트리를 만든다(tmp: 1).
   한 줄: [id, 갈래, 고리, r, 칸, 이웃(가운데 S), 유산(스킬 노드) 또는 강화 정의].
   강화 m: set(맨 위 필드), fxSet([{k, s?, ...바꿀 값}]: 같은 k(와 s)의 효과 숫자를 바꾼다), fxAdd(효과 더하기), cond({ off, when: resp · alt2 · kw:상태>=n }: 비용 −off, 바닥 1, 내 차례에 한 번).
   강화는 그 스킬을 끼웠을 때만 일한다. src는 합쳐진 옛 칸(기록용) */
const ATREE_DEF = {
  spellblade: {
    br: { 마갑: 0, 염검: 120, 혈인: 240 }, lane: { LL: -36, L: -18, C: 0, R: 18, RR: 36 },
    skills: [
      ['sb_bleedcut', '혈인', 1, 1, 'C', ['S'], 2], ['sb_boil', '혈인', 1, 2, 'L', ['sb_bleedcut'], 2], ['sb_bloodmark', '혈인', 1, 2, 'R', ['sb_bleedcut'], 3],
      ['sb_taste', '혈인', 2, 3, 'L', ['sb_boil'], 2], ['sb_redwind', '혈인', 2, 3, 'R', ['sb_bloodmark'], 3], ['sb_whirl', '혈인', 2, 4, 'L', ['sb_taste'], 2], ['sb_deluge', '혈인', 3, 5, 'C', ['sb_redwind', 'sb_whirl'], 4],
      ['sb_ember', '염검', 1, 1, 'C', ['S'], 2], ['sb_kindle', '염검', 1, 2, 'L', ['sb_ember'], 2], ['sb_char', '염검', 1, 2, 'R', ['sb_ember'], 2],
      ['sb_heated', '염검', 2, 3, 'L', ['sb_kindle'], 2], ['sb_snuff', '염검', 2, 3, 'C', ['sb_ember'], 3], ['sb_tome', '염검', 2, 3, 'R', ['sb_char'], 3], ['sb_hellfire', '염검', 3, 5, 'C', ['sb_snuff', 'sb_tome'], 4],
      ['sb_bladeward', '마갑', 1, 1, 'C', ['S'], 2], ['sb_bolt', '마갑', 1, 2, 'L', ['sb_bladeward'], 2], ['sb_unravel', '마갑', 1, 2, 'R', ['sb_bladeward'], 2],
      ['sb_turn', '마갑', 2, 3, 'C', ['sb_bladeward'], 2], ['sb_shell', '마갑', 2, 3, 'LL', ['sb_bolt'], 3], ['sb_rebound', '마갑', 2, 3, 'L', ['sb_bolt'], 2], ['sb_sunder', '마갑', 2, 3, 'R', ['sb_unravel'], 2], ['sb_finale', '마갑', 3, 5, 'C', ['sb_turn', 'sb_sunder'], 4],
    ],
    ups: [
      ['sbu_chain', '혈인', 1, 1, 'LL', 'sb_bleedcut', '혈인 연참', '이 스킬로 적을 쓰러뜨리면 유산 +1(라운드에 한 번, 환급 한도 공유).', { set: { killRecharge: 1 } }, ['sb_throat', 'sb_chaincut', 'sb_execchain', 'sb_pathway']],
      ['sbu_graze', '혈인', 1, 1, 'RR', 'sb_bleedcut', '스치는 칼', '빠른 칸이 됩니다. 피해 8 → 6, 출혈 4 → 3.', { set: { time: 'fast' }, fxSet: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'bleed', n: 3 }] }, ['sb_deepline']],
      ['sbu_boil', '혈인', 2, 3, 'LL', 'sb_boil', '끓는 피', '지난 라운드나 이번 라운드에 대응 충전을 받았으면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'resp' } }, []],
      ['sbu_scarlet', '혈인', 3, 5, 'RR', 'sb_bloodmark', '선홍 표식', '피해 7 → 8, 출혈 2 → 4, 칼에 싣는 출혈 4 → 5.', { fxSet: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'imbue', s: 'bleed', n: 5 }] }, ['sb_scarlet']],
      ['sbu_thirst', '혈인', 3, 5, 'LL', 'sb_taste', '혈갈', '출혈 1마다 피해 +3 → +3.5, 생명력 35% 이하 적에게 ×1.5.', { fxSet: [{ k: 'exploit', s: 'bleed', per: 3.5 }], fxAdd: [{ k: 'lowx', hp: 0.35, mul: 1.5 }] }, ['sb_thirst', 'sb_ledger', 'sb_vein']],
      ['sbu_gale', '혈인', 2, 4, 'RR', 'sb_redwind', '피바람', '쓰러진 적의 출혈이 곁의 적에게 번집니다.', { fxAdd: [{ k: 'killSpread', per: 1 }] }, ['sb_splash', 'sb_redstorm', 'sb_gale']],
      ['sbu_exec', '혈인', 2, 4, 'LL', 'sb_whirl', '연쇄 처형', '출혈 걸린 적에게 ×1.5.', { fxAdd: [{ k: 'kwx', s: 'bleed', mul: 1.5 }] }, ['sb_execchain']],
      ['sbu_fog', '혈인', 3, 6, 'C', 'sb_deluge', '피안개', '칼에 출혈 5를 싣습니다.', { fxAdd: [{ k: 'imbue', s: 'bleed', n: 5 }] }, ['sb_bloodfog']],
      ['sbu_flare', '염검', 1, 1, 'LL', 'sb_ember', '불꽃 탄', '칼에 화상 3을 싣습니다.', { fxAdd: [{ k: 'imbue', s: 'ignite', n: 3 }] }, ['sb_flare']],
      ['sbu_brand', '염검', 1, 1, 'RR', 'sb_ember', '불의 표식', '화상 걸린 적에게 ×1.5.', { fxAdd: [{ k: 'kwx', s: 'ignite', mul: 1.5 }] }, ['sb_brand', 'sb_pyre']],
      ['sbu_whet', '염검', 3, 5, 'LL', 'sb_kindle', '칼날 달구기', '칼에 싣는 화상 5 → 8, 스태미나 21 → 25.', { fxSet: [{ k: 'imbue', s: 'ignite', n: 8 }, { k: 'stam', n: 25 }] }, ['sb_whet']],
      ['sbu_ash', '염검', 2, 3, 'RR', 'sb_char', '잔화검', '화상 1마다 피해 +2.5 → +3, 화상 2를 겁니다.', { fxSet: [{ k: 'exploit', s: 'ignite', per: 3 }], fxAdd: [{ k: 'st', s: 'ignite', n: 2 }] }, ['sb_ashcut']],
      ['sbu_rush', '염검', 2, 4, 'LL', 'sb_heated', '화염 연참', '칼에 실린 것을 2배로 겁니다.', { fxAdd: [{ k: 'edgeX', mul: 2 }] }, ['sb_rush', 'sb_inferno', 'sb_judgefire', 'sb_drake']],
      ['sbu_coil', '염검', 2, 4, 'C', 'sb_snuff', '염화 결속', '화상 1마다 피해 +2.', { fxAdd: [{ k: 'exploit', s: 'ignite', per: 2 }] }, ['sb_coil']],
      ['sbu_chainf', '염검', 2, 4, 'RR', 'sb_tome', '불길 잇기', '대상의 화상이 5 이상이면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'kw:ignite>=5' } }, []],
      ['sbu_firefall', '염검', 3, 6, 'C', 'sb_hellfire', '불벼락', '보통 빠르기가 됩니다. 피해 16 → 13.', { set: { time: 'normal' }, fxSet: [{ k: 'dmg', n: 13 }] }, ['sb_firefall']],
      ['sbu_counter', '마갑', 1, 1, 'LL', 'sb_bladeward', '맞받아 베기', '교대면 보호막 +4.', { fxAdd: [{ k: 'alt', ward: 4 }] }, ['sb_counter']],
      ['sbu_barrage', '마갑', 2, 4, 'LL', 'sb_bolt', '방벽 포격', '보호막 비례 피해 0.5 → 1, 상한 12 → 18.', { fxSet: [{ k: 'wardDmg', per: 1, cap: 18 }] }, ['sb_wardbolt', 'sb_barrage']],
      ['sbu_twin', '마갑', 2, 4, 'L', 'sb_rebound', '이중 영창', '이어진 교대면 보호막 6 · 보호 2.', { fxAdd: [{ k: 'alt', run: 2, ward: 6, protect: 2 }] }, ['sb_reverse', 'sb_twin']],
      ['sbu_measure', '마갑', 2, 4, 'R', 'sb_sunder', '교차 일섬', '이어진 교대의 2번째부터면 비용 −1(바닥 1, 내 차례에 한 번).', { cond: { off: 1, when: 'alt2' } }, ['sb_beatcut', 'sb_measure']],
      ['sbu_rhythm', '마갑', 2, 4, 'C', 'sb_turn', '마검 연무', '전열 모두를 벱니다. 보통 빠르기, 붕괴 +9.', { set: { tgt: 'front', time: 'normal' }, fxAdd: [{ k: 'brk', n: 9 }] }, ['sb_rhythm']],
      ['sbu_coda', '마갑', 3, 5, 'L', 'sb_turn', '마검 종곡', '이어진 교대면 붕괴 +30.', { fxAdd: [{ k: 'alt', run: 2, brk: 30 }] }, ['sb_coda', 'sb_weave']],
      ['sbu_release', '마갑', 3, 6, 'C', 'sb_finale', '갑주 해방', '남은 보호막을 모두 태워 피해로 바꿉니다(×1.5).', { fxAdd: [{ k: 'wardBurn', mul: 1.5 }] }, ['sb_shatter', 'sb_rebuke', 'sb_wardburst', 'sb_embershell', 'sb_breakwall']],
    ],
  },
};
/* 지금 트리에서 빠진 스킬 (8-4 "뺌"): 옛 세이브 장착 목록에서 "더는 없는 스킬"로 보인다 */
const AT_GONE = { spellblade: ['sb_sweepcut', 'sb_pour', 'sb_redrain', 'sb_draw', 'sb_crimson', 'sb_feast', 'sb_sparkcut', 'sb_ring', 'sb_flamedown', 'sb_sear', 'sb_flamedance', 'sb_lance', 'sb_chainfire', 'sb_blaze', 'sb_armor', 'sb_spellguard', 'sb_bulwark'] };
