/* 0.6a.2 개편: 직업 스킬 트리 (docs/0.6a.2-개편-기획.md 4·7절, docs/0.6a.2-암살자-스킬.md)
   index.html보다 먼저 읽힌다. 값만 둔다. 실행은 index.html의 runSkill2, 설명 문장과 점수는 data/skillkit.js가 같은 데이터에서 만든다.
   스킬 한 줄: id, 갈래(b), 등급(tier: 하급·중급. 상급·궁극은 3챕터부터), 이름(n), 대상(tgt: melee 근접 한 적, pick 고른 적, ranged 후열까지 한 적, front 전열 모두, all 모든 적, self 나),
   빠르기(time: fast 빠른 칸 · normal 주 행동 · slow 두 칸 다), 찌르는 횟수(hits), 재사용(cd: 쓰고 나서 기다리는 내 차례 수, once: 전투마다 1번), 효과(fx).
   10월 3일 만든 사람 결정: 충전(스킬마다 다른 조건) 대신 재사용 대기 하나로 통일한다. 갈래마다 규칙 하나가 그 갈래 스킬의 남은 대기를 줄인다(TREE2.haste). */
const SKILLS2 = {
  assassin: [
    // 시작 스킬: 트리 밖. 늘 끼워져 있고 장착 칸을 차지하지 않는다. 어느 갈래에도 치우치지 않는 공격 하나(주 행동), 방어 하나(빠른 행동) (10월 3일 만든 사람 결정: 독 없음)
    { id: 'a_vital', b: '시작', tier: '시작', start: 1, n: '급소 찌르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 20 }] },
    { id: 'a_slip', b: '시작', tier: '시작', start: 1, n: '몸 빼기', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'st', s: 'protect', n: 3 }, { k: 'stam', n: 42 }] },
    // 독사: 작은 독을 자주, 넓게 걸고 키운다. 무리·장기전에 강하고 후열에 약하다 (독을 걸면 대기 −1)
    { id: 'a_fang', row: 1, b: '독사', tier: '하급', n: '독니', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 5 }] },
    { id: 'a_hack', row: 1, b: '독사', tier: '하급', n: '난도질', tgt: 'melee', time: 'fast', cd: 2, hits: 2, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 1 }] },
    { id: 'a_bladedance', row: 2, b: '독사', tier: '하급', n: '칼날 춤', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 3 }] },
    { id: 'a_dart', row: 2, b: '독사', tier: '하급', n: '독 바른 투척', tgt: 'ranged', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 4 }] },
    { id: 'a_rot', row: 3, b: '독사', tier: '하급', n: '썩은 상처', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 4 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'a_sheath', row: 3, b: '독사', tier: '하급', n: '독 칼집', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'poison', n: 2 }, { k: 'stam', n: 35 }] },
    { id: 'a_numb', row: 4, b: '독사', tier: '하급', n: '둔한 독', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 4 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_sap', row: 4, b: '독사', tier: '하급', n: '기운 빼는 독', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 5 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'a_wedge', row: 5, b: '독사', tier: '하급', n: '독 쐐기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 4 }, { k: 'brk', n: 32 }] },
    { id: 'a_mist', row: 5, b: '독사', tier: '하급', n: '독무', tgt: 'front', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }] },
    { id: 'a_seep', row: 6, b: '독사', tier: '하급', n: '독 스미기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 2 }, { k: 'exploit', per: 1.1 }] },
    { id: 'a_siphon', row: 6, b: '독사', tier: '하급', n: '독 흡수', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'drain', per: 1.5 }] },
    { id: 'a_double', row: 7, b: '독사', tier: '중급', n: '독 배가', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'grow', mul: 2 }] },
    { id: 'a_spread', row: 7, b: '독사', tier: '중급', n: '독 번지기', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'dmg', n: 2 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_condense', row: 8, b: '독사', tier: '중급', n: '독 응축', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'grow', mul: 1.5, add: 4 }] },
    { id: 'a_rain', row: 8, b: '독사', tier: '중급', n: '독 비', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 4 }] },
    { id: 'a_venomstrike', row: 9, b: '독사', tier: '중급', n: '맹독 일격', tgt: 'melee', time: 'slow', cd: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 6 }] },
    { id: 'a_rotbreath', row: 9, b: '독사', tier: '중급', n: '썩은 숨', tgt: 'front', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'vuln', n: 1 }] },
    { id: 'a_cycle', row: 10, b: '독사', tier: '중급', n: '독의 순환', tgt: 'all', time: 'slow', cd: 3, fx: [{ k: 'grow', mul: 1.6 }] },
    { id: 'a_feast', row: 10, b: '독사', tier: '중급', n: '독 흡혈', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 4 }, { k: 'drain', per: 1.3 }] },
    // 격발: 독을 심고 터뜨려 큰 적을 무너뜨린다. 거구·강타에 강하고 무리에 약하다 (정예 이상을 무너뜨리면 대기 −1)
    { id: 'a_plant', row: 1, b: '격발', tier: '하급', n: '독 심기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 5 }] },
    { id: 'a_burst', row: 1, b: '격발', tier: '하급', n: '독 격발', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'burst', pre: 2, mul: 2.5, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_pop', row: 2, b: '격발', tier: '하급', n: '톡 쏘는 독', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'burst', pre: 4, top: 2, mul: 2, brkPer: 3 }] },
    { id: 'a_finish', row: 2, b: '격발', tier: '하급', n: '마무리 찌르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 10 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_brkneedle', row: 3, b: '격발', tier: '하급', n: '붕괴 독침', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'poison', n: 2 }, { k: 'brk', n: 37 }] },
    { id: 'a_pouch', row: 3, b: '격발', tier: '하급', n: '독 바르기', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 4 }] },
    { id: 'a_deepplant', row: 4, b: '격발', tier: '하급', n: '깊이 심기', tgt: 'melee', time: 'slow', cd: 4, fx: [{ k: 'poison', n: 6 }] },
    { id: 'a_burststab', row: 4, b: '격발', tier: '하급', n: '터뜨리는 일격', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'dmg', n: 8 }, { k: 'burst', top: 3, mul: 2.5, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_rend', row: 5, b: '격발', tier: '하급', n: '갈라 터뜨리기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 3 }, { k: 'exploit', per: 3.8 }] },
    { id: 'a_crumble', row: 5, b: '격발', tier: '하급', n: '무너뜨리는 독', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 3 }, { k: 'brkPer', per: 19.7 }] },
    { id: 'a_cutoff', row: 6, b: '격발', tier: '하급', n: '끊어 내기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 19 }, { k: 'cutx', brk: 76 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_expose', row: 6, b: '격발', tier: '하급', n: '약점 드러내기', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_boil', row: 7, b: '격발', tier: '중급', n: '끓는 피', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'burst', pre: 2, mul: 1.5, keep: 0.5, brkPer: 4 }] },
    { id: 'a_chain', row: 7, b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', cd: 5, killRecharge: 1, fx: [{ k: 'burst', pre: 3, mul: 2, brkPer: 4 }] },
    { id: 'a_gash', row: 8, b: '격발', tier: '중급', n: '상처 벌리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'st', s: 'vuln', n: 3 }, { k: 'burst', pre: 3, mul: 2, brkPer: 3 }] },
    { id: 'a_vitalburst', row: 8, b: '격발', tier: '중급', n: '급소 터뜨리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 6 }, { k: 'burst', pre: 2, mul: 2, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_deepburst', row: 9, b: '격발', tier: '중급', n: '깊은 격발', tgt: 'melee', time: 'slow', cd: 6, fx: [{ k: 'burst', pre: 2, mul: 3, brkPer: 6 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_hunt', row: 9, b: '격발', tier: '중급', n: '독 사냥', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 7 }, { k: 'exploit', per: 2.6 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_brkburst', row: 10, b: '격발', tier: '중급', n: '무너지는 격발', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'burst', pre: 4, mul: 1.5, brkPer: 10 }] },
    { id: 'a_reap', row: 10, b: '격발', tier: '중급', n: '거두기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 13 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'bigx', mul: 2 }] },
    // 그림자: 공격을 흘려 낸 틈을 찌르고 후열에 닿는다. 후열에 강하고 무리·거구에 약하다 (흘려 내면 대기 −1)
    { id: 'a_shadow', row: 1, b: '그림자', tier: '하급', n: '그림자 찌르기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }] },
    { id: 'a_deflect', row: 1, b: '그림자', tier: '하급', n: '흘려 베기', tgt: 'pick', time: 'normal', cd: 6, fx: [{ k: 'parry', red: 0.7 }, { k: 'dmg', n: 7 }, { k: 'onParry', dmg: 10 }] },
    { id: 'a_trip', row: 2, b: '그림자', tier: '하급', n: '발 걸기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 35 }] },
    { id: 'a_step', row: 2, b: '그림자', tier: '하급', n: '그림자 밟기', tgt: 'ranged', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 17 }] },
    { id: 'a_check', row: 3, b: '그림자', tier: '하급', n: '견제 찌르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'a_backstep', row: 3, b: '그림자', tier: '하급', n: '흘리며 물러서기', tgt: 'pick', time: 'fast', cd: 3, fx: [{ k: 'parry', red: 0.5 }, { k: 'onParry', brk: 79 }] },
    { id: 'a_ambush', row: 4, b: '그림자', tier: '하급', n: '후열 기습', tgt: 'ranged', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 21 }] },
    { id: 'a_smoke', row: 4, b: '그림자', tier: '하급', n: '연막', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'parryBuff', red: 0.2, stam: 33, times: 2 }] },
    { id: 'a_after', row: 5, b: '그림자', tier: '하급', n: '잔상', tgt: 'pick', time: 'fast', cd: 5, fx: [{ k: 'parry', red: 0.7 }, { k: 'onParry', dmg: 14, brk: 9 }] },
    { id: 'a_aim', row: 5, b: '그림자', tier: '하급', n: '칼끝 겨누기', tgt: 'self', time: 'fast', cd: 2, fx: [{ k: 'parryBuff', red: 0, dmg: 19 }] },
    { id: 'a_mark', row: 6, b: '그림자', tier: '하급', n: '그림자 표식', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_shade', row: 6, b: '그림자', tier: '하급', n: '그늘 숨기', tgt: 'self', time: 'fast', cd: 2, fx: [{ k: 'st', s: 'protect', n: 2 }, { k: 'parryBuff', red: 0, dmg: 13 }] },
    { id: 'a_gap', row: 7, b: '그림자', tier: '중급', n: '빈틈 노리기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 22 }] },
    { id: 'a_venomguard', row: 7, b: '그림자', tier: '중급', n: '독 묻은 칼막이', tgt: 'pick', time: 'normal', cd: 3, fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', poison: 5 }] },
    { id: 'a_pierce', row: 8, b: '그림자', tier: '중급', n: '급소 꿰기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 16 }, { k: 'brokenx', mul: 2 }] },
    { id: 'a_strangle', row: 8, b: '그림자', tier: '중급', n: '목 조르기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_counter', row: 9, b: '그림자', tier: '중급', n: '되받아치기', tgt: 'pick', time: 'normal', cd: 4, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 20, brk: 10 }] },
    { id: 'a_rush', row: 9, b: '그림자', tier: '중급', n: '그림자 연타', tgt: 'melee', time: 'normal', cd: 4, hits: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'brk', n: 5 }] },
    { id: 'a_darkstrike', row: 10, b: '그림자', tier: '중급', n: '어둠 일격', tgt: 'melee', time: 'slow', cd: 6, fx: [{ k: 'dmg', n: 26 }, { k: 'brk', n: 25 }] },
    { id: 'a_parrydance', row: 10, b: '그림자', tier: '중급', n: '흘림의 춤', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'parryBuff', red: 0.2, stam: 22, times: 2, dmg: 8 }] },
  ],
};
/* 사다리 (10월 3일 만든 사람 결정): 2챕터(Lv10)까지 갈래마다 하급 6줄 · 중급 4줄 = 10줄, 줄마다 두 칸(갈래 20칸, 직업 60칸).
   한 기둥(세로줄)이 10칸 = Lv10까지 얻는 포인트 10이다(하급 60%, 중급 40%). 윗줄 두 칸 가운데 하나라도 열려 있으면 아랫줄이 열린다.
   부모(par)는 줄로 만든다. 상급·궁극은 지웠다: 2챕터까지의 반응을 보고 3챕터부터 더한다 */
for (const k in SKILLS2) { const L = SKILLS2[k]; for (const s of L) if (s.row > 1) s.par = L.filter(x => x.b === s.b && x.row === s.row - 1).map(x => x.id); }
/* 직업마다 트리 틀: 갈래 순서와 한 줄 설명, 시작 스킬(트리 밖), 처음 주는 포인트.
   트리는 모두 잠긴 채 시작하고, 칸은 부모(par: 윗줄) 가운데 하나를 열어야 열린다.
   보이는 칸: 첫 줄, 부모가 열린 칸. 나머지는 "?" (기대감, 10월 3일 만든 사람 결정) */
const TREE2 = {
  assassin: {
    branches: ['독사', '격발', '그림자'],
    bd: { 독사: '작은 독을 넓게 걸고 키운다. 무리와 긴 싸움에 강하고, 뒤에 선 적에게 약하다', 격발: '독을 심고 터뜨려 큰 적을 무너뜨린다. 정예·보스와 강타에 강하고, 무리에 약하다', 그림자: '흘려 낸 틈을 찌르고 후열에 닿는다. 뒤에 선 적에게 강하고, 무리와 큰 적에게 약하다' },
    haste: { 독사: 'poison', 격발: 'break', 그림자: 'parry' }, // 갈래 규칙: 이 일이 일어난 행동마다(한 행동에 한 번) 그 갈래 스킬의 남은 대기 −1. 격발: 쓰러뜨리면 → 정예 이상을 무너뜨리면 (10월 3일: 처치로 줄면 무리에서 가장 셌다)
    // 갈래 성격 (10월 3일 기준, 기획서 12.4절): 강한 상황과 약한 상황. tools/sitqa.js가 50상황으로 맞는지 잰다
    profile: { 독사: { strong: ['무리', '장기전'], weak: ['후열'] }, 격발: { strong: ['거구', '강타'], weak: ['무리'] }, 그림자: { strong: ['후열'], weak: ['무리', '거구'] }, 직업: { strong: [], weak: ['지원'] } },
    starters: ['a_vital', 'a_slip'], pts: 1,
  },
};
/* 갈래 크기 (10월 3일 만든 사람 결정): 사다리 10줄(하급 6 · 중급 4), 줄마다 두 칸 = 갈래 20칸, 직업 60칸.
   포인트 설계: 포인트는 레벨마다 1(시작 1 → Lv10에 10). 한 갈래를 줄마다 하나씩 내려가면 Lv6에 하급 끝, Lv10에 중급 끝. 1챕터(Lv5)는 하급만, 2챕터(Lv10)에 중급.
   챕터 돌파 포인트(+2)는 0.6a.2에서 주지 않는다: Lv10까지 10점이 트리 크기의 기준이다(기획서 12.2절) */
const TREE_GATE = { 시작: 0, 하급: 0, 중급: 0 }; // 사다리에서는 깊이가 등급 조건을 대신한다(쓰지 않음)
/* 챕터로 여는 등급: 1~2챕터는 하급·중급만으로 싸운다. 상급·궁극은 3챕터를 만들 때 다시 설계해 더한다 */
const TREE_CH = { 시작: 1, 하급: 1, 중급: 1 }; // 상급·궁극은 지웠다(3챕터부터 다시 짠다)
const EQUIP_SLOTS2 = 4;
