/* 0.6a.2 개편: 직업 스킬 트리 (docs/0.6a.2-개편-기획.md 4·7절, docs/0.6a.2-암살자-스킬.md)
   index.html보다 먼저 읽힌다. 값만 둔다. 실행은 index.html의 runSkill2, 설명 문장과 점수는 data/skillkit.js가 같은 데이터에서 만든다.
   스킬 한 줄: id, 갈래(b), 등급(tier: 하급·중급. 상급·궁극은 3챕터부터), 이름(n), 대상(tgt: melee 근접 한 적, pick 고른 적, ranged 후열까지 한 적, front 전열 모두, all 모든 적, self 나),
   빠르기(time: fast 빠른 칸 · normal 주 행동 · slow 두 칸 다), 찌르는 횟수(hits), 쿨타임(cd: 쓰고 나서 기다리는 내 턴 수, once: 전투마다 1번), 효과(fx).
   10월 3일 만든 사람 결정: 충전(스킬마다 다른 조건) 대신 쿨타임 하나로 통일한다. 갈래마다 대기를 줄이던 규칙(TREE2.haste)은 읽기 어려워 없앴다(3차 결정: 모든 직업이 쿨타임만 쓴다). */
const SKILLS2 = {
  assassin: [
    // 시작 스킬: 트리 밖. 늘 끼워져 있고 장착 칸을 차지하지 않는다. 어느 갈래에도 치우치지 않는 공격 하나(주 행동), 방어 하나(빠른 행동) (10월 3일 만든 사람 결정: 독 없음)
    { id: 'a_vital', b: '시작', tier: '시작', start: 1, n: '급소 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 23 }] },
    { id: 'a_slip', b: '시작', tier: '시작', start: 1, n: '몸 빼기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'st', s: 'protect', n: 4 }, { k: 'stam', n: 44 }] },
    // 독사: 작은 독을 자주, 넓게 걸고 키운다. 무리·장기전에 강하고 후열에 약하다
    { id: 'a_fang', row: 1, b: '독사', tier: '하급', n: '독니', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 6 }] },
    { id: 'a_hack', row: 1, b: '독사', tier: '하급', n: '난도질', tgt: 'melee', time: 'fast', cd: 4, hits: 2, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 2 }] },
    { id: 'a_bladedance', row: 2, b: '독사', tier: '하급', n: '칼날 춤', tgt: 'front', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 3 }] },
    { id: 'a_dart', row: 2, b: '독사', tier: '하급', n: '독 바른 투척', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 5 }] },
    { id: 'a_rot', row: 3, b: '독사', tier: '하급', n: '썩은 상처', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 4 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_sheath', row: 3, b: '독사', tier: '하급', n: '독 칼집', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'poison', n: 2 }, { k: 'stam', n: 51 }] },
    { id: 'a_numb', row: 4, b: '독사', tier: '하급', n: '둔한 독', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 4 }, { k: 'st', s: 'chill', n: 3 }] },
    { id: 'a_sap', row: 4, b: '독사', tier: '하급', n: '기운 빼는 독', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'poison', n: 6 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'a_wedge', row: 5, b: '독사', tier: '하급', n: '독 쐐기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 5 }, { k: 'brk', n: 32 }] },
    { id: 'a_mist', row: 5, b: '독사', tier: '하급', n: '독무', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'poison', n: 4 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'a_seep', row: 6, b: '독사', tier: '하급', n: '독 스미기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 3 }, { k: 'exploit', per: 1 }] },
    { id: 'a_siphon', row: 6, b: '독사', tier: '하급', n: '독 흡수', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 4 }, { k: 'drain', per: 1.5 }] },
    { id: 'a_double', row: 7, b: '독사', tier: '중급', n: '독 배가', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'grow', mul: 2.1 }] },
    { id: 'a_spread', row: 7, b: '독사', tier: '중급', n: '독 번지기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 4 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_condense', row: 8, b: '독사', tier: '중급', n: '독 응축', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'grow', mul: 1.6, add: 5 }] },
    { id: 'a_rain', row: 8, b: '독사', tier: '중급', n: '독 비', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'poison', n: 5 }] },
    { id: 'a_venomstrike', row: 9, b: '독사', tier: '중급', n: '맹독 일격', tgt: 'melee', time: 'slow', cd: 5, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 7 }] },
    { id: 'a_rotbreath', row: 9, b: '독사', tier: '중급', n: '썩은 숨', tgt: 'front', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'a_cycle', row: 10, b: '독사', tier: '중급', n: '독의 순환', tgt: 'all', time: 'slow', cd: 5, fx: [{ k: 'grow', mul: 1.8 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'a_feast', row: 10, b: '독사', tier: '중급', n: '독 흡혈', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 4 }, { k: 'drain', per: 2.5 }] },
    // 격발: 독을 심고 터뜨려 큰 적을 무너뜨린다. 거구·강타에 강하고 무리에 약하다
    { id: 'a_plant', row: 1, b: '격발', tier: '하급', n: '독 심기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'poison', n: 6 }] },
    { id: 'a_burst', row: 1, b: '격발', tier: '하급', n: '독 격발', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'burst', pre: 2, mul: 2.5, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_pop', row: 2, b: '격발', tier: '하급', n: '톡 쏘는 독', tgt: 'melee', time: 'fast', cd: 9, fx: [{ k: 'burst', pre: 4, top: 2, mul: 2.5, brkPer: 3 }] },
    { id: 'a_finish', row: 2, b: '격발', tier: '하급', n: '마무리 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_brkneedle', row: 3, b: '격발', tier: '하급', n: '붕괴 독침', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'poison', n: 2 }, { k: 'brk', n: 59 }] },
    { id: 'a_pouch', row: 3, b: '격발', tier: '하급', n: '독 바르기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 5 }] },
    { id: 'a_deepplant', row: 4, b: '격발', tier: '하급', n: '깊이 심기', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'poison', n: 7 }] },
    { id: 'a_burststab', row: 4, b: '격발', tier: '하급', n: '터뜨리는 일격', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'burst', top: 3, mul: 3, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_rend', row: 5, b: '격발', tier: '하급', n: '갈라 터뜨리기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 2 }, { k: 'exploit', per: 5 }] },
    { id: 'a_crumble', row: 5, b: '격발', tier: '하급', n: '무너뜨리는 독', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 3 }, { k: 'brkPer', per: 25 }] },
    { id: 'a_cutoff', row: 6, b: '격발', tier: '하급', n: '끊어 내기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 24 }, { k: 'cutx', brk: 91 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_expose', row: 6, b: '격발', tier: '하급', n: '약점 드러내기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_boil', row: 7, b: '격발', tier: '중급', n: '끓는 피', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'burst', pre: 2, mul: 2, keep: 0.5, brkPer: 4 }] },
    { id: 'a_chain', row: 7, b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', cd: 7, killRecharge: 1, fx: [{ k: 'burst', pre: 3, mul: 2, brkPer: 6 }] },
    { id: 'a_gash', row: 8, b: '격발', tier: '중급', n: '상처 벌리기', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'st', s: 'vuln', n: 5 }, { k: 'burst', pre: 3, mul: 2, brkPer: 3 }] },
    { id: 'a_vitalburst', row: 8, b: '격발', tier: '중급', n: '급소 터뜨리기', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 9 }, { k: 'burst', pre: 2, mul: 2, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_deepburst', row: 9, b: '격발', tier: '중급', n: '깊은 격발', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'burst', pre: 2, mul: 3.5, brkPer: 6 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_hunt', row: 9, b: '격발', tier: '중급', n: '독 사냥', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 7 }, { k: 'exploit', per: 3.5 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_brkburst', row: 10, b: '격발', tier: '중급', n: '무너지는 격발', tgt: 'melee', time: 'normal', cd: 10, fx: [{ k: 'burst', pre: 5, mul: 1.5, brkPer: 8 }] },
    { id: 'a_reap', row: 10, b: '격발', tier: '중급', n: '거두기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'bigx', mul: 2 }] },
    // 그림자: 공격을 흘려 낸 틈을 찌르고 후열에 닿는다. 후열에 강하고 무리·거구에 약하다
    { id: 'a_shadow', row: 1, b: '그림자', tier: '하급', n: '그림자 찌르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }] },
    { id: 'a_deflect', row: 1, b: '그림자', tier: '하급', n: '흘려 베기', tgt: 'pick', time: 'normal', cd: 9, fx: [{ k: 'parry', red: 0.7 }, { k: 'dmg', n: 7 }, { k: 'onParry', dmg: 11 }] },
    { id: 'a_trip', row: 2, b: '그림자', tier: '하급', n: '발 걸기', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 40 }] },
    { id: 'a_step', row: 2, b: '그림자', tier: '하급', n: '그림자 밟기', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 20 }] },
    { id: 'a_check', row: 3, b: '그림자', tier: '하급', n: '견제 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'a_backstep', row: 3, b: '그림자', tier: '하급', n: '흘리며 물러서기', tgt: 'pick', time: 'fast', cd: 8, fx: [{ k: 'parry', red: 0.5 }, { k: 'onParry', brk: 106 }] },
    { id: 'a_ambush', row: 4, b: '그림자', tier: '하급', n: '후열 기습', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 24 }] },
    { id: 'a_smoke', row: 4, b: '그림자', tier: '하급', n: '연막', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'parryBuff', red: 0.2, stam: 40, times: 2 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'a_after', row: 5, b: '그림자', tier: '하급', n: '잔상', tgt: 'pick', time: 'fast', cd: 9, fx: [{ k: 'parry', red: 0.7 }, { k: 'onParry', dmg: 15, brk: 7 }] },
    { id: 'a_aim', row: 5, b: '그림자', tier: '하급', n: '칼끝 겨누기', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'parryBuff', red: 0, dmg: 16 }] },
    { id: 'a_mark', row: 6, b: '그림자', tier: '하급', n: '그림자 표식', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 4 }] },
    { id: 'a_shade', row: 6, b: '그림자', tier: '하급', n: '그늘 숨기', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'st', s: 'protect', n: 2 }, { k: 'parryBuff', red: 0, dmg: 10 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'a_gap', row: 7, b: '그림자', tier: '중급', n: '빈틈 노리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 26 }] },
    { id: 'a_venomguard', row: 7, b: '그림자', tier: '중급', n: '독 묻은 칼막이', tgt: 'pick', time: 'normal', cd: 6, fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', poison: 5 }] },
    { id: 'a_pierce', row: 8, b: '그림자', tier: '중급', n: '급소 꿰기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'brokenx', mul: 2 }] },
    { id: 'a_strangle', row: 8, b: '그림자', tier: '중급', n: '목 조르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_counter', row: 9, b: '그림자', tier: '중급', n: '되받아치기', tgt: 'pick', time: 'normal', cd: 6, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 17, brk: 8 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'a_rush', row: 9, b: '그림자', tier: '중급', n: '그림자 연타', tgt: 'melee', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 6 }] },
    { id: 'a_darkstrike', row: 10, b: '그림자', tier: '중급', n: '어둠 일격', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 29 }, { k: 'brk', n: 30 }] },
    { id: 'a_parrydance', row: 10, b: '그림자', tier: '중급', n: '흘림의 춤', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'parryBuff', red: 0.2, stam: 30, times: 2, dmg: 4 }, { k: 'hasten', n: 2, on: 'parry' }] },
  ],
  warden: [
    // 시작 스킬: 트리 밖. 어느 갈래에도 치우치지 않는 공격 하나(주 행동), 방어 하나(빠른 행동). 보호막은 쓰지 않는다 (10월 3일 초안)
    { id: 'w_bash', b: '시작', tier: '시작', start: 1, n: '방패 치기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 36 }] },
    { id: 'w_brace', b: '시작', tier: '시작', start: 1, n: '굳히기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'st', s: 'protect', n: 4 }, { k: 'stam', n: 44 }] },
    // 성벽: 막으며 보호막을 쌓고, 쌓인 보호막을 태워 친다. 왼쪽 기둥은 버티기(보호막 · 가시 · 보호막 비례 피해), 오른쪽은 태우기(보호막을 모아 태워 친다). 장기전 · 폭발에 강하고 지원에 약하다
    { id: 'w_raise', row: 1, b: '성벽', tier: '하급', n: '방패 세우기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 22 }] },
    { id: 'w_shove', row: 1, b: '성벽', tier: '하급', n: '방패 밀치기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 13 }, { k: 'ward', n: 10 }] },
    { id: 'w_hold', row: 2, b: '성벽', tier: '하급', n: '막고 치기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'wardDmg', per: 0.25 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_flare', row: 2, b: '성벽', tier: '하급', n: '보호막 터뜨리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'wardBurn', mul: 3, max: 8 }, { k: 'brk', n: 3 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_stand', row: 3, b: '성벽', tier: '하급', n: '버티기', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'wardFill', to: 0.6 }, { k: 'st', s: 'protect', n: 2 }] },
    { id: 'w_kindle', row: 3, b: '성벽', tier: '하급', n: '달아오르는 막', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 21 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'w_spikes', row: 4, b: '성벽', tier: '하급', n: '가시 방패', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'thorn', times: 4, dmg: 6 }] },
    { id: 'w_blaze', row: 4, b: '성벽', tier: '하급', n: '불꽃 방패', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'wardBurn', mul: 3, max: 9 }, { k: 'st', s: 'vuln', n: 1 }] },
    { id: 'w_press', row: 5, b: '성벽', tier: '하급', n: '밀어붙이기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 34 }, { k: 'wardDmg', per: 0.5 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_coat', row: 5, b: '성벽', tier: '하급', n: '막 두르고 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'ward', n: 15 }] },
    { id: 'w_rampart', row: 6, b: '성벽', tier: '하급', n: '철벽', tgt: 'self', time: 'normal', cd: 8, fx: [{ k: 'ward', n: 28 }, { k: 'st', s: 'protect', n: 3 }] },
    { id: 'w_burst', row: 6, b: '성벽', tier: '하급', n: '보호막 폭발', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'wardBurn', mul: 2.5, max: 8 }] },
    { id: 'w_crush', row: 7, b: '성벽', tier: '중급', n: '짓누르는 방패', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'wardDmg', per: 0.5 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_molten', row: 7, b: '성벽', tier: '중급', n: '쇳물 방패', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'wardBurn', mul: 3, max: 12 }, { k: 'brk', n: 25 }] },
    { id: 'w_armor', row: 8, b: '성벽', tier: '중급', n: '가시 갑주', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'thorn', times: 5, dmg: 5 }, { k: 'ward', n: 6 }] },
    { id: 'w_rebuild', row: 8, b: '성벽', tier: '중급', n: '다시 세우는 벽', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'wardFill', to: 0.5 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'w_beyond', row: 9, b: '성벽', tier: '중급', n: '벽 너머의 일격', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 37 }, { k: 'wardDmg', per: 0.5 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_breach', row: 9, b: '성벽', tier: '중급', n: '성벽 부수기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'wardBurn', mul: 2, max: 16 }, { k: 'brk', n: 41 }] },
    { id: 'w_citadel', row: 10, b: '성벽', tier: '중급', n: '철옹성', tgt: 'self', time: 'slow', cd: 10, once: 1, keep: ['wardFill'], fx: [{ k: 'wardFill' }, { k: 'st', s: 'protect', n: 3 }, { k: 'thorn', times: 3, dmg: 5 }] },
    { id: 'w_last', row: 10, b: '성벽', tier: '중급', n: '최후의 성벽', tgt: 'melee', time: 'slow', cd: 10, exc: '만든 사람 결정(10월 5일): 10줄 마무리, 전투당 0.1~0.6번만 써 모델(2번)보다 덜 쓴다. 태운 1마다 1.5 · 40% 이하 ×1.75 그대로', fx: [{ k: 'wardBurn', mul: 1.5 }, { k: 'lowx', hp: 0.4, mul: 1.75 }, { k: 'brk', n: 17 }] }, // 10월 4일: 보호막을 모두 태우는 마무리 (성벽 오른쪽 기둥의 보스전 이길 수단). 만든 사람 결정으로 쓰기를 완화하고(생명력 30% → 40% 이하) 한 방을 낮췄다(×2 · 피해 2 → ×1.75 · 피해 1.5): 보스 63%, 줄 예산 안이라 예외 표시를 뗐다
    // 파쇄: 한 적의 붕괴 게이지를 빨리 채우고, 무너진 적을 느린 강타로 크게 친다. 왼쪽 기둥은 무너뜨리기(큰 붕괴 · 모으는 적 끊기), 오른쪽은 부수기(붕괴한 적 · 취약한 적에게 크게). 강타 · 거구에 강하고 무리에 약하다
    { id: 's_slam', row: 1, b: '파쇄', tier: '하급', n: '내리찍기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 37 }] },
    { id: 's_gap', row: 1, b: '파쇄', tier: '하급', n: '틈 노리기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'brokenx', mul: 2 }] },
    { id: 's_knock', row: 2, b: '파쇄', tier: '하급', n: '자세 무너뜨리기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 39 }] },
    { id: 's_mark', row: 2, b: '파쇄', tier: '하급', n: '약점 짚기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 's_cut', row: 3, b: '파쇄', tier: '하급', n: '끊어 치기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 34 }, { k: 'cutx', brk: 68 }] },
    { id: 's_smash', row: 3, b: '파쇄', tier: '하급', n: '부수는 일격', tgt: 'melee', time: 'slow', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'brk', n: 36 }] },
    { id: 's_knee', row: 4, b: '파쇄', tier: '하급', n: '무릎 꺾기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 40 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 's_dig', row: 4, b: '파쇄', tier: '하급', n: '취약 파고들기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'vulnPer', per: 5 }] },
    { id: 's_hammer', row: 5, b: '파쇄', tier: '하급', n: '망치질', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 26 }, { k: 'brk', n: 37 }] },
    { id: 's_wedge', row: 5, b: '파쇄', tier: '하급', n: '쐐기 박기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 36 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 's_crack', row: 6, b: '파쇄', tier: '하급', n: '균열', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'brk', n: 37 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 's_throw', row: 6, b: '파쇄', tier: '하급', n: '메다꽂기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'brokenx', mul: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_pillar', row: 7, b: '파쇄', tier: '중급', n: '기둥 꺾기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 47 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_maul', row: 7, b: '파쇄', tier: '중급', n: '깨뜨리는 망치', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 27 }, { k: 'brokenx', mul: 2 }] },
    { id: 's_quake', row: 8, b: '파쇄', tier: '중급', n: '흔들어 끊기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 46 }, { k: 'cutx', brk: 70 }] },
    { id: 's_open', row: 8, b: '파쇄', tier: '중급', n: '약점 벌리기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 44 }, { k: 'vulnGrow', mul: 2 }] },
    { id: 's_rift', row: 9, b: '파쇄', tier: '중급', n: '지반 가르기', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 29 }, { k: 'brk', n: 50 }] },
    { id: 's_judge', row: 9, b: '파쇄', tier: '중급', n: '처단', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 16 }, { k: 'vulnPer', per: 5 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 's_fall', row: 10, b: '파쇄', tier: '중급', n: '산 무너뜨리기', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 24 }, { k: 'brk', n: 70 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_ruin', row: 10, b: '파쇄', tier: '중급', n: '박살', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 24 }, { k: 'brokenx', mul: 2.5 }, { k: 'bigx', mul: 1.5 }] },
    // 전열 장악: 전열 전체를 치고 여러 적을 함께 무너뜨린다. 왼쪽 기둥은 휩쓸기(전열 모두를 치는 피해), 오른쪽은 깨기(방패병 깨기 · 후열 끌어내기 · 여럿의 붕괴). 무리에 강하고 거구에 약하다
    { id: 'f_sweep', row: 1, b: '전열 장악', tier: '하급', n: '휘두르기', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }] },
    { id: 'f_break', row: 1, b: '전열 장악', tier: '하급', n: '방패 깨기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 39 }, { k: 'shieldx', mul: 2 }] },
    { id: 'f_charge', row: 2, b: '전열 장악', tier: '하급', n: '방패 돌진', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 21 }] },
    { id: 'f_snare', row: 2, b: '전열 장악', tier: '하급', n: '사슬 걸기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 31 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'f_cleave', row: 3, b: '전열 장악', tier: '하급', n: '넓게 베기', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'f_chain', row: 3, b: '전열 장악', tier: '하급', n: '사슬 휘두르기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 23 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'f_stomp', row: 4, b: '전열 장악', tier: '하급', n: '발 구르기', tgt: 'front', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 3 }, { k: 'brk', n: 24 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'f_wall', row: 4, b: '전열 장악', tier: '하급', n: '가로막기 깨기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 40 }, { k: 'shieldx', mul: 2 }] },
    { id: 'f_spin', row: 5, b: '전열 장악', tier: '하급', n: '회전 베기', tgt: 'front', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 24 }] },
    { id: 'f_drag', row: 5, b: '전열 장악', tier: '하급', n: '끌어와 치기', tgt: 'ranged', time: 'slow', cd: 6, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 28 }, { k: 'pull' }] }, // 10월 4일: 쿨타임 8 → 6 (전열 장악 오른쪽 기둥의 보스전 이길 수단)
    { id: 'f_trample', row: 6, b: '전열 장악', tier: '하급', n: '짓밟기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'chillx', mul: 2 }] },
    { id: 'f_topple', row: 6, b: '전열 장악', tier: '하급', n: '연쇄 붕괴', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 21 }, { k: 'brokenx', mul: 2 }] },
    { id: 'f_drive', row: 7, b: '전열 장악', tier: '중급', n: '몰아치기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 21 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'f_rampart', row: 7, b: '전열 장악', tier: '중급', n: '방패벽 부수기', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 23 }, { k: 'shieldx', mul: 2 }] },
    { id: 'f_push', row: 8, b: '전열 장악', tier: '중급', n: '전열 밀어내기', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 23 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'f_scatter', row: 8, b: '전열 장악', tier: '중급', n: '무리 흩기', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'f_split', row: 9, b: '전열 장악', tier: '중급', n: '대지 가르기', tgt: 'front', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'brokenx', mul: 2 }] },
    { id: 'f_net', row: 9, b: '전열 장악', tier: '중급', n: '사슬 조이기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 40 }, { k: 'chillx', mul: 2 }] },
    { id: 'f_storm', row: 10, b: '전열 장악', tier: '중급', n: '폭풍 같은 방패', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 25 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'f_collapse', row: 10, b: '전열 장악', tier: '중급', n: '전열 붕괴', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 33 }, { k: 'shieldx', mul: 2 }] },
  ],
  hunter: [
    // 시작 스킬: 트리 밖. 추적을 쌓는 사격 하나(주 행동), 물러서며 가속을 얻는 사격 하나(빠른 행동) (10월 5일 초안)
    { id: 'h_aim', b: '시작', tier: '시작', start: 1, n: '겨눠 쏘기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'focusAdd', n: 1 }] },
    { id: 'h_step', b: '시작', tier: '시작', start: 1, n: '물러서며 쏘기', tgt: 'ranged', time: 'fast', cd: 7, fx: [{ k: 'dmg', n: 4 }, { k: 'evade', n: 1 }] }, // 10월 5일: 가속이 연속 행동이 되어 시작 스킬은 가속 대신 몸 빼기
    // 10월 5일 만든 사람 결정: 가속(사냥꾼 전용) = 라운드 맨 앞에서 두 번 연달아. 기동이 가속을 만들고, 저격 · 연사는 가속에서 세지거나(하급 hastex) 가속을 써서 큰 한 방(중급 hasteSpend). 한 갈래만 몰아 찍으면 오히려 약하게(작은 육각형)
    // 저격: 한 적에게 추적과 취약을 쌓고 큰 한 발로 끝낸다. 왼쪽 기둥은 추적(쌓기 · 터뜨리기), 오른쪽은 취약과 무거운 한 발. 거구에 강하고 무리에 약하다
    { id: 'h_mark', row: 1, b: '저격', tier: '하급', n: '조준 사격', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'focusx', per: 0.1 }] },
    { id: 'h_weak', row: 1, b: '저격', tier: '하급', n: '약점 표시', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'h_pierce', row: 2, b: '저격', tier: '하급', n: '꿰뚫는 화살', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 18 }, { k: 'hastex', mul: 1.3 }] },
    { id: 'h_steady', row: 2, b: '저격', tier: '하급', n: '숨 고른 사격', tgt: 'ranged', time: 'slow', cd: 6, fx: [{ k: 'dmg', n: 20 }] },
    { id: 'h_prey', row: 3, b: '저격', tier: '하급', n: '사냥감 지정', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'focusAdd', n: 2 }, { k: 'st', s: 'vuln', n: 1 }] },
    { id: 'h_vital', row: 3, b: '저격', tier: '하급', n: '급소 노리기', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 10 }, { k: 'vulnPer', per: 4 }] },
    { id: 'h_burst', row: 4, b: '저격', tier: '하급', n: '추적 터뜨리기', tgt: 'ranged', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 7 }, { k: 'focusBurst', n: 8 }] },
    { id: 'h_heavy', row: 4, b: '저격', tier: '하급', n: '무거운 화살', tgt: 'ranged', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'bigx', mul: 1.5 }, { k: 'hastex', mul: 1.3 }] },
    { id: 'h_chase', row: 5, b: '저격', tier: '하급', n: '끈질긴 추격', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'focusx', per: 0.15 }] },
    { id: 'h_widen', row: 5, b: '저격', tier: '하급', n: '약점 벌리기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'vulnGrow', mul: 2 }] },
    { id: 'h_finish', row: 6, b: '저격', tier: '하급', n: '마무리 사격', tgt: 'ranged', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 15 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'h_through', row: 6, b: '저격', tier: '하급', n: '관통 사격', tgt: 'ranged', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 25 }] },
    { id: 'h_throat', row: 7, b: '저격', tier: '중급', n: '숨통 겨누기', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 6 }, { k: 'focusBurst', n: 10 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_giant', row: 7, b: '저격', tier: '중급', n: '거인 사냥', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 16 }, { k: 'vulnPer', per: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'h_lock', row: 8, b: '저격', tier: '중급', n: '표적 고정', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 6 }, { k: 'focusAdd', n: 3 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'h_stance', row: 8, b: '저격', tier: '중급', n: '저격 자세', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'st', s: 'empower', n: 1 }, { k: 'evade', n: 1 }, { k: 'stam', n: 25 }] },
    { id: 'h_hound', row: 9, b: '저격', tier: '중급', n: '끝까지 쫓는 화살', tgt: 'ranged', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 14 }, { k: 'focusx', per: 0.2 }, { k: 'focusAdd', n: 1 }] },
    { id: 'h_heart', row: 9, b: '저격', tier: '중급', n: '심장 꿰뚫기', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 17 }, { k: 'vulnPer', per: 3 }] },
    { id: 'h_endhunt', row: 10, b: '저격', tier: '중급', n: '사냥의 끝', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 2 }, { k: 'focusBurst', n: 14 }, { k: 'lowx', hp: 0.3, mul: 1.5 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_oneshot', row: 10, b: '저격', tier: '중급', n: '일격필살', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 13 }, { k: 'bigx', mul: 1.5 }] },
    // 연사: 표적을 바꿀 때마다 빠른 한 발, 여러 번 쏘고, 화살비와 출혈로 여럿을 깎는다. 왼쪽 기둥은 표적 바꾸기와 연발, 오른쪽은 화살비와 출혈. 무리에 강하고 거구에 약하다
    { id: 'h_double', row: 1, b: '연사', tier: '하급', n: '연속 사격', tgt: 'ranged', time: 'normal', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 7 }, { k: 'hastex', mul: 1.3 }] },
    { id: 'h_rain', row: 1, b: '연사', tier: '하급', n: '화살비', tgt: 'all', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 8 }] },
    { id: 'h_switch', row: 2, b: '연사', tier: '하급', n: '갈아 쏘기', tgt: 'ranged', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'swapx', mul: 1.5 }] },
    { id: 'h_barb', row: 2, b: '연사', tier: '하급', n: '가시 화살', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 5 }] },
    { id: 'h_triple', row: 3, b: '연사', tier: '하급', n: '세 발 쏘기', tgt: 'ranged', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 6 }] },
    { id: 'h_scatter', row: 3, b: '연사', tier: '하급', n: '흩뿌리는 화살', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 1 }] },
    { id: 'h_gap', row: 4, b: '연사', tier: '하급', n: '빈틈 쏘기', tgt: 'ranged', time: 'fast', cd: 7, fx: [{ k: 'dmg', n: 10 }, { k: 'swapx', mul: 1.5 }, { k: 'hasten', n: 1 }] },
    { id: 'h_bloodrain', row: 4, b: '연사', tier: '하급', n: '피의 비', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'hastex', mul: 1.3 }] },
    { id: 'h_spray', row: 5, b: '연사', tier: '하급', n: '난사', tgt: 'ranged', time: 'slow', cd: 10, hits: 4, fx: [{ k: 'dmg', n: 6 }] },
    { id: 'h_dull', row: 5, b: '연사', tier: '하급', n: '무디게 하는 비', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'h_turn', row: 6, b: '연사', tier: '하급', n: '돌려 쏘기', tgt: 'ranged', time: 'normal', cd: 9, hits: 2, fx: [{ k: 'dmg', n: 9 }, { k: 'swapx', mul: 1.3 }] },
    { id: 'h_rend', row: 6, b: '연사', tier: '하급', n: '찢는 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'h_storm', row: 7, b: '연사', tier: '중급', n: '폭풍 화살', tgt: 'ranged', time: 'slow', cd: 10, hits: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'brk', n: 23 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_deluge', row: 7, b: '연사', tier: '중급', n: '화살 폭우', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 11 }] },
    { id: 'h_houndshot', row: 8, b: '연사', tier: '중급', n: '물어뜯는 화살', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'swapx', mul: 1.6 }, { k: 'hasten', n: 1 }] },
    { id: 'h_tearrain', row: 8, b: '연사', tier: '중급', n: '찢는 비', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'h_endless', row: 9, b: '연사', tier: '중급', n: '끝없는 사격', tgt: 'ranged', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'swapx', mul: 1.3 }] },
    { id: 'h_slaughter', row: 9, b: '연사', tier: '중급', n: '학살의 비', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'h_thousand', row: 10, b: '연사', tier: '중급', n: '천 개의 화살', tgt: 'ranged', time: 'vslow', cd: 6, hits: 5, fx: [{ k: 'dmg', n: 4 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_skysplit', row: 10, b: '연사', tier: '중급', n: '하늘 가르기', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 1 }, { k: 'hastex', mul: 1.6 }] }, /* 10월 7일: 학살의 비(9줄)와 모든 값이 같던 칸. 연속 행동 라운드에 크게 */
    // 기동: 먼저 움직이고, 피하고, 늦춘다. 왼쪽 기둥은 쓰는 때가 다른 회피(기본 · 템포 · 표적 바꾸기 · 버티기 · 강타 받아넘기기 · 🔄, 중급은 피하기를 피해로), 오른쪽은 둔화와 끊기. 강타에 강하고 상처 · 무리에 약하다 (10월 5일 2차: 만든 사람 검토)
    { id: 'h_dodge', row: 1, b: '기동', tier: '하급', n: '몸 빼기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'evade', n: 1 }, { k: 'stam', n: 26 }] }, // 기본 회피
    { id: 'h_hobble', row: 1, b: '기동', tier: '하급', n: '발 묶는 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'h_dash', row: 2, b: '기동', tier: '하급', n: '질주', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'st', s: 'haste', n: 1 }, { k: 'stam', n: 20 }] }, // 템포: 다음 라운드에 두 번 연달아
    { id: 'h_leg', row: 2, b: '기동', tier: '하급', n: '다리 쏘기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 54 }] },
    { id: 'h_side', row: 3, b: '기동', tier: '하급', n: '옆걸음 사격', tgt: 'ranged', time: 'fast', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'swapx', mul: 1.5 }, { k: 'evade', n: 1 }] }, // 피하면서 표적 바꾸기
    { id: 'h_slowrain', row: 3, b: '기동', tier: '하급', n: '늦추는 비', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'chill', n: 1 }] }, // 무리를 한꺼번에 늦추기
    { id: 'h_veil', row: 4, b: '기동', tier: '하급', n: '흙먼지 장막', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 4 }, { k: 'meSt', s: 'protect', n: 5 }] }, // 여럿의 공격 버티기: 흙먼지를 일으켜 모두를 약하게 맞히고 나에게 보호(피할 수 없는 공격에도 든다)
    { id: 'h_frost', row: 4, b: '기동', tier: '하급', n: '얼어붙는 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'chill', n: 1 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'h_counter', row: 5, b: '기동', tier: '하급', n: '받아넘기기', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 16, chill: 1, charged: 1 }] }, // 강타 예고를 보고 쓰기
    { id: 'h_stop', row: 5, b: '기동', tier: '하급', n: '멈춰 세우기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'chillCut', brk: 40 }] }, // 둔화와 끊기를 잇기
    { id: 'h_wind', row: 6, b: '기동', tier: '하급', n: '바람 걸음', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'evade', n: 1 }, { k: 'hasten', n: 1, on: 'evade' }, { k: 'stam', n: 50 }] }, // 피하기로 기동을 돌리기
    { id: 'h_shatter', row: 6, b: '기동', tier: '하급', n: '얼음 깨기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 5 }, { k: 'chillShatter', dmg: 5, brk: 25 }] }, // 둔화를 자원으로
    { id: 'h_after', row: 7, b: '기동', tier: '중급', n: '잔상', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 4 }, { k: 'stam', n: 24 }] }, // 피하기가 피해가 되는 첫 칸
    { id: 'h_spread', row: 7, b: '기동', tier: '중급', n: '냉기 번짐', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'chillSpread', per: 1 }] }, // 한 적의 둔화를 무리로
    { id: 'h_foresee', row: 8, b: '기동', tier: '중급', n: '예고 읽기', tgt: 'self', time: 'fast', cd: 10, fx: [{ k: 'foresee', red: 0.6, rounds: 3 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 5 }] }, // 큰 공격이 겹치는 순간(피할 수 없는 화형 포함)
    { id: 'h_ankle', row: 8, b: '기동', tier: '중급', n: '발목 끊기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 19 }, { k: 'cutx', brk: 20 }, { k: 'onCutBreak', haste: 2, hasten: 1 }] }, // 끊기 강화: 모으던 적을 무너뜨리면 보상(수치는 측정 뒤)
    { id: 'h_windarrow', row: 9, b: '기동', tier: '중급', n: '바람의 화살', tgt: 'ranged', time: 'fast', cd: 10, fx: [{ k: 'dmg', n: 4 }, { k: 'meSt', s: 'haste', n: 1 }, { k: 'hastex', mul: 1.4 }] }, // 공격하면서 회피 유지
    { id: 'h_timeslow', row: 9, b: '기동', tier: '중급', n: '시간 늦추기', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 1 }, { k: 'st', s: 'chill', n: 2 }, { k: 'meSt', s: 'haste', n: 1 }] }, // 라운드를 쥐기
    { id: 'h_shadowrun', row: 10, b: '기동', tier: '중급', n: '그림자 질주', tgt: 'self', time: 'fast', cd: 10, once: 1, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 6, rounds: 3 }, { k: 'quickTurns', n: 3 }] }, // 피할수록 세지는 마무리 (빠른 칸 +1은 내 차례 3번 내내: 측정 때 따로 본다)
    { id: 'h_icecage', row: 10, b: '기동', tier: '중급', n: '얼음 감옥', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 14 }, { k: 'freeze', chill: 3, brk: 40 }] }, // 한 적을 확실히 멈추는 마무리(강적 · 보스는 둔화 3 + 붕괴)
  ],
  /* 숨겨진 직업 1 (10월 7일, key butcher). 새 효과 키 grudge · carry, 넓힌 인자(st/exploit/grow/drain/spread s: 'bleed', exploit · drain me, lowx me, hasten · quick · meSt on: 'kill', thorn · onParry bleed)는 index.html runSkill2, 점수는 skillkit.js SKK.butch */
  butcher: [
    // 시작 스킬 (트리 밖, 늘 끼움): 출혈을 거는 공격 하나(주 행동), 피해 없이 먹는 방어 하나(빠른 행동)
    { id: 'b_hook', b: '시작', tier: '시작', start: 1, n: '갈고리 베기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'b_lap', b: '시작', tier: '시작', start: 1, n: '피 들이켜기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'drain', s: 'bleed', eat: 1, max: 5, per: 4 }, { k: 'stam', n: 26 }] },
    // 도륙: 한 적에게 출혈을 깊게 새기고 먹는다. 왼쪽 기둥은 새기기 · 이용(걸기, 출혈 비례, 키우기, 붕괴), 오른쪽 기둥은 먹기(먹는 양 · 바꾸는 것이 줄마다 다르다)
    { id: 'b_gash', row: 1, b: '도륙', tier: '하급', n: '살 가르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'bleed', n: 5 }] },
    { id: 'b_bite', row: 1, b: '도륙', tier: '하급', n: '물어뜯기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'drain', s: 'bleed', eat: 1, per: 2.5 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'b_saw', row: 2, b: '도륙', tier: '하급', n: '톱질', tgt: 'melee', time: 'fast', cd: 5, hits: 2, fx: [{ k: 'dmg', n: 5 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'b_sip', row: 2, b: '도륙', tier: '하급', n: '한 모금', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 11 }, { k: 'drain', s: 'bleed', eat: 1, half: 1, per: 3.5 }] },
    { id: 'b_tendon', row: 3, b: '도륙', tier: '하급', n: '힘줄 끊기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'b_wring', row: 3, b: '도륙', tier: '하급', n: '핏물 짜내기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'drain', s: 'bleed', eat: 1, max: 5, per: 1.5, brk: 10 }] },
    { id: 'b_deep', row: 4, b: '도륙', tier: '하급', n: '깊게 긋기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'exploit', s: 'bleed', per: 2.5 }] },
    { id: 'b_drained', row: 4, b: '도륙', tier: '하급', n: '피 말리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'drain', s: 'bleed', eat: 1, per: 2, weak: 3 }] },
    { id: 'b_hooks', row: 5, b: '도륙', tier: '하급', n: '갈고리 박기', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'brk', n: 30 }] },
    { id: 'b_finish', row: 5, b: '도륙', tier: '하급', n: '숨통 끊고 마시기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 17 }, { k: 'lowx', hp: 0.35, mul: 1.5 }, { k: 'drain', s: 'bleed', eat: 1, per: 3 }] },
    { id: 'b_widen', row: 6, b: '도륙', tier: '하급', n: '상처 벌리기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 8 }, { k: 'grow', s: 'bleed', mul: 1.5, add: 1 }] },
    { id: 'b_feastfront', row: 6, b: '도륙', tier: '하급', n: '돌려 마시기', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 16 }, { k: 'drain', s: 'bleed', eat: 1, half: 1, per: 2 }] },
    { id: 'b_dissect', row: 7, b: '도륙', tier: '중급', n: '해체', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'b_hoard', row: 7, b: '도륙', tier: '중급', n: '피 갈무리', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 19 }, { k: 'drain', s: 'bleed', eat: 1, per: 2, emp: 3 }] },
    { id: 'b_open', row: 8, b: '도륙', tier: '중급', n: '마르지 않는 상처', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'b_spring', row: 8, b: '도륙', tier: '중급', n: '마르지 않는 샘', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 21 }, { k: 'drain', s: 'bleed', eat: 1, per: 2.5, keep: 0.5 }] },
    { id: 'b_slaughter', row: 9, b: '도륙', tier: '중급', n: '도축', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'brk', n: 40 }, { k: 'exploit', s: 'bleed', per: 2 }] },
    { id: 'b_glut', row: 9, b: '도륙', tier: '중급', n: '탐식', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 24 }, { k: 'drain', s: 'bleed', eat: 1, per: 2.5, brk: 8 }] },
    { id: 'b_river', row: 10, b: '도륙', tier: '중급', n: '피의 강', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 13 }, { k: 'grow', s: 'bleed', mul: 2 }, { k: 'exploit', s: 'bleed', per: 2.5 }] },
    { id: 'b_banquet', row: 10, b: '도륙', tier: '중급', n: '피의 만찬', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 8 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'drain', s: 'bleed', eat: 1, per: 3 }, { k: 'bigx', mul: 1.5 }] },
    // 광기: 맞을수록, 낮을수록 세다. 왼쪽 기둥은 맞받기(받은 피해 되갚기 · 맞을 때 출혈 · 덜 막는 흘리기), 오른쪽 기둥은 핏값(내게 출혈을 걸어 치고, 내 생명력이 낮을 때 크게)
    { id: 'b_retort', row: 1, b: '광기', tier: '하급', n: '앙갚음', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'grudge', per: 0.6, max: 20 }] },
    { id: 'b_reckless', row: 1, b: '광기', tier: '하급', n: '무모한 베기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 24 }] },
    { id: 'b_bare', row: 2, b: '광기', tier: '하급', n: '맨살로 받기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'thorn', times: 3, bleed: 2 }, { k: 'stam', n: 25 }] },
    { id: 'b_boil', row: 2, b: '광기', tier: '하급', n: '들끓는 일격', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'lowx', me: 1, hp: 0.5, mul: 1.5 }] },
    { id: 'b_spite', row: 3, b: '광기', tier: '하급', n: '앙갚음 연타', tgt: 'melee', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'grudge', per: 0.25, max: 8 }] },
    { id: 'b_share', row: 3, b: '광기', tier: '하급', n: '피 나누기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 6 }] },
    { id: 'b_take', row: 4, b: '광기', tier: '하급', n: '몸으로 받기', tgt: 'pick', time: 'fast', cd: 6, fx: [{ k: 'parry', red: 0.35 }, { k: 'onParry', dmg: 9, bleed: 3 }] },
    { id: 'b_frenzy', row: 4, b: '광기', tier: '하급', n: '광란', tgt: 'melee', time: 'normal', cd: 7, hits: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'lowx', me: 1, hp: 0.4, mul: 1.5 }] },
    { id: 'b_revenge', row: 5, b: '광기', tier: '하급', n: '피의 보복', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'grudge', per: 1, max: 30 }, { k: 'brk', n: 30 }] },
    { id: 'b_price', row: 5, b: '광기', tier: '하급', n: '핏값', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'meSt', s: 'bleed', n: 3 }, { k: 'dmg', n: 30 }, { k: 'brk', n: 30 }] },
    { id: 'b_grudgefront', row: 6, b: '광기', tier: '하급', n: '앙심', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'grudge', per: 0.4, max: 12 }] },
    { id: 'b_brink', row: 6, b: '광기', tier: '하급', n: '벼랑 끝', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 22 }, { k: 'lowx', me: 1, hp: 0.3, mul: 2 }] },
    { id: 'b_answer', row: 7, b: '광기', tier: '중급', n: '핏빛 응수', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 8 }, { k: 'grudge', per: 0.6, max: 20, bl: 5 }] },
    { id: 'b_bloodblade', row: 7, b: '광기', tier: '중급', n: '흐르는 피의 칼', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'exploit', s: 'bleed', me: 1, per: 4, max: 6 }] },
    { id: 'b_snapback', row: 8, b: '광기', tier: '중급', n: '살 내주기', tgt: 'pick', time: 'fast', cd: 7, fx: [{ k: 'parry', red: 0.35 }, { k: 'onParry', dmg: 10, bleed: 4 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'b_offer', row: 8, b: '광기', tier: '중급', n: '피를 바치는 일격', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'drain', s: 'bleed', me: 1, eat: 1, emp: 1 }, { k: 'dmg', n: 16 }] },
    { id: 'b_brand', row: 9, b: '광기', tier: '중급', n: '원한의 각인', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 14 }, { k: 'grudge', per: 0.8, max: 25, vu: 8 }] },
    { id: 'b_lastbreath', row: 9, b: '광기', tier: '중급', n: '마지막 숨', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'drain', s: 'bleed', me: 1, eat: 1, dmg: 5, max: 6 }, { k: 'dmg', n: 10 }, { k: 'brk', n: 30 }, { k: 'bigx', mul: 1.5 }] }, // 10월 7일 검토: 벼랑 끝과 같은 '내 생명력 30% ×2' 대신 내 출혈을 지워 피해로
    { id: 'b_retribution', row: 10, b: '광기', tier: '중급', n: '응징의 도끼', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 8 }, { k: 'grudge', per: 1.5, max: 45, brk: 2, brkMax: 60 }] }, // 10월 7일 검토: 피의 보복과 같은 '받은 피해 + 고정 붕괴'를 받은 피해에 비례하는 붕괴로
    { id: 'b_rampage', row: 10, b: '광기', tier: '중급', n: '피의 광란', tgt: 'melee', time: 'normal', cd: 9, hits: 4, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 4 }, { k: 'exploit', s: 'bleed', me: 1, per: 1.5, max: 6 }] },
    // 학살: 쓰러뜨리며 이어 간다. 왼쪽 기둥은 휩쓸기(전열 광역 + 줄마다 다른 덧붙임), 오른쪽 기둥은 처형(마무리 배수, 처치 보상, 후열에 닿는 칸 하나)
    { id: 'b_sweep', row: 1, b: '학살', tier: '하급', n: '휘둘러 베기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'b_throat', row: 1, b: '학살', tier: '하급', n: '목 따기', tgt: 'melee', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 16 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'b_splash', row: 2, b: '학살', tier: '하급', n: '핏방울 튀기기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'spread', s: 'bleed', per: 1, kill: 1 }] },
    { id: 'b_chop', row: 2, b: '학살', tier: '하급', n: '토막 치기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'quick', n: 1, on: 'kill' }] },
    { id: 'b_spin', row: 3, b: '학살', tier: '하급', n: '갈고리 돌리기', tgt: 'front', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 12 }] },
    { id: 'b_scent', row: 3, b: '학살', tier: '하급', n: '피 냄새 쫓기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'hasten', n: 1, on: 'kill' }] },
    { id: 'b_roar', row: 4, b: '학살', tier: '하급', n: '도살꾼의 고함', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'b_hookthrow', row: 4, b: '학살', tier: '하급', n: '갈고리 던지기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 4 }] },
    { id: 'b_gale', row: 5, b: '학살', tier: '하급', n: '피보라', tgt: 'front', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 13 }, { k: 'exploit', s: 'bleed', per: 1.5 }] },
    { id: 'b_cleaver', row: 5, b: '학살', tier: '하급', n: '피 묻은 식칼', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'spread', s: 'bleed', per: 1, kill: 1 }] },
    { id: 'b_sickle', row: 6, b: '학살', tier: '하급', n: '사슬 낫', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'b_hunger', row: 6, b: '학살', tier: '하급', n: '허기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 13 }, { k: 'lowx', hp: 0.4, mul: 2 }] },
    { id: 'b_ripple', row: 7, b: '학살', tier: '중급', n: '피의 잔물결', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'hasten', n: 2, on: 'kill' }] },
    { id: 'b_scaffold', row: 7, b: '학살', tier: '중급', n: '처형대', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 23 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'b_harvest', row: 8, b: '학살', tier: '중급', n: '피의 수확', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 12 }, { k: 'drain', s: 'bleed', eat: 1, kill: 1, per: 3 }] },
    { id: 'b_next', row: 8, b: '학살', tier: '중급', n: '다음 놈', tgt: 'melee', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'lowx', hp: 0.35, mul: 1.5 }, { k: 'carry' }] }, // 10월 7일 검토: 목 따기와 같은 kr를 버리고 남은 타격 잇기
    { id: 'b_storm', row: 9, b: '학살', tier: '중급', n: '붉은 폭풍', tgt: 'all', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'b_headsman', row: 9, b: '학살', tier: '중급', n: '망나니', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 26 }, { k: 'lowx', hp: 0.4, mul: 2 }, { k: 'meSt', s: 'empower', n: 2, on: 'kill' }] }, // 10월 7일 검토: 피 냄새 쫓기와 같은 🔄 대신 쓰러뜨리면 나에게 강화 2
    { id: 'b_redtide', row: 10, b: '학살', tier: '중급', n: '붉은 물결', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'spread', s: 'bleed', per: 1, kill: 1 }] },
    { id: 'b_procession', row: 10, b: '학살', tier: '중급', n: '도살 행렬', tgt: 'melee', time: 'normal', cd: 10, fx: [{ k: 'dmg', n: 23 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'quick', n: 1, on: 'kill', next: 1 }, { k: 'hasten', n: 2, on: 'kill' }] }, // 10월 7일 검토: 빠른 칸은 다음 차례에. 보통 행동은 차례를 끝내 이번 차례 빠른 칸이 쓰이지 않았다
  ],
  /* 원소술사 (10월 7일, docs/직업/원소술사.md C절): 불로 태우고 얼음으로 묶는다. 한 적에게 화상과 둔화가 함께 있으면 그 행동이 끝날 때 열충격(index.html elemShock).
     새 효과: weave(없는 원소), shockx(이 스킬로 일어난 열충격의 피해 · 붕괴 배수, 번짐 arc, 남기기 keep), rime(나를 친 적에게 상태, 되얼림), burnOut(화상을 모두 태움). hasten on:'shock', cutx chant */
  elementalist: [
    // 시작 스킬: 불 하나(주 행동), 얼음 하나(빠른 행동). 어느 갈래 하나만 골라도 둘로 열충격이 돈다
    { id: 'e_ember', b: '시작', tier: '시작', start: 1, n: '불씨 화살', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'e_touch', b: '시작', tier: '시작', start: 1, n: '서리 손길', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'chill', n: 2 }, { k: 'stam', n: 24 }] },
    // 불꽃: 왼쪽 불씨(쌓기 · 연타 · 남기기), 오른쪽 큰 불(큰 한 방 · 불태우기 · 마무리). 큰 적에 강하고 무리에 약하다
    { id: 'e_kindle', row: 1, b: '불꽃', tier: '하급', n: '불붙이기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'e_firebolt', row: 1, b: '불꽃', tier: '하급', n: '화염탄', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 29 }] },
    { id: 'e_sparks', row: 2, b: '불꽃', tier: '하급', n: '불똥 세례', tgt: 'ranged', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'e_burnout', row: 2, b: '불꽃', tier: '하급', n: '불태우기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'burnOut', per: 3, brk: 4 }] },
    { id: 'e_spread', row: 3, b: '불꽃', tier: '하급', n: '번지는 불', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'e_lance', row: 3, b: '불꽃', tier: '하급', n: '불의 창', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 32 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'e_stoke', row: 4, b: '불꽃', tier: '하급', n: '장작 넣기', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'ignite', n: 6 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'e_chantburn', row: 4, b: '불꽃', tier: '하급', n: '영창 사르기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'ignite', n: 3 }, { k: 'cutx', brk: 49, chant: 1 }] },
    { id: 'e_afterglow', row: 5, b: '불꽃', tier: '하급', n: '잔불', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'ignite', n: 5 }, { k: 'shockx', keep: { s: 'ignite', n: 3 } }] },
    { id: 'e_ash', row: 5, b: '불꽃', tier: '하급', n: '재가 되도록', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 23 }, { k: 'lowx', hp: 0.35, mul: 2 }] },
    { id: 'e_catch', row: 6, b: '불꽃', tier: '하급', n: '옮겨붙는 불', tgt: 'ranged', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'ignite', n: 4 }] },
    { id: 'e_conflag', row: 6, b: '불꽃', tier: '하급', n: '대화재', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 13 }, { k: 'burnOut', per: 4, brk: 4 }, { k: 'bigx', mul: 1.3 }] },
    { id: 'e_hellfire', row: 7, b: '불꽃', tier: '중급', n: '겁화', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'ignite', n: 10 }] },
    { id: 'e_meteor', row: 7, b: '불꽃', tier: '중급', n: '유성', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 32 }, { k: 'brokenx', mul: 2 }] },
    { id: 'e_seal', row: 8, b: '불꽃', tier: '중급', n: '불의 낙인', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'st', s: 'ignite', n: 7 }, { k: 'shockx', dmg: 1.5 }] },
    { id: 'e_spear', row: 8, b: '불꽃', tier: '중급', n: '불꽃 창', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 30 }, { k: 'brk', n: 29 }, { k: 'cutx', brk: 43, chant: 1 }] },
    { id: 'e_cloak', row: 9, b: '불꽃', tier: '중급', n: '불꽃 외투', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'rime', s: 'ignite', times: 4, n: 3 }, { k: 'stam', n: 60 }] },
    { id: 'e_cinders', row: 9, b: '불꽃', tier: '중급', n: '잿더미', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 12 }, { k: 'burnOut', per: 5, brk: 5 }, { k: 'lowx', hp: 0.35, mul: 1.5 }] },
    { id: 'e_phoenix', row: 10, b: '불꽃', tier: '중급', n: '불새의 깃', tgt: 'ranged', time: 'slow', cd: 8, hits: 5, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'e_sunfall', row: 10, b: '불꽃', tier: '중급', n: '태양 낙하', tgt: 'ranged', time: 'vslow', cd: 10, fx: [{ k: 'dmg', n: 35 }, { k: 'bigx', mul: 1.5 }, { k: 'lowx', hp: 0.3, mul: 1.5 }] },
    // 서리: 왼쪽 묶기(둔화 · 약화 · 되얼림 · 보호), 오른쪽 깨기(둔화된 적 × · 열충격 붕괴 × · 둔화 남기기 · 영창 끊기). 무리와 긴 싸움에 강하고 지원에 약하다
    { id: 'e_bind', row: 1, b: '서리', tier: '하급', n: '서리 결박', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_icelance', row: 1, b: '서리', tier: '하급', n: '얼음 창', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 26 }, { k: 'brk', n: 25 }] },
    { id: 'e_hoar', row: 2, b: '서리', tier: '하급', n: '서릿발', tgt: 'front', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_crack', row: 2, b: '서리', tier: '하급', n: '서리 금', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 19 }, { k: 'st', s: 'chill', n: 1 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_armor', row: 3, b: '서리', tier: '하급', n: '서리 갑옷', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'rime', times: 3, n: 2 }, { k: 'stam', n: 53 }] },
    { id: 'e_hail', row: 3, b: '서리', tier: '하급', n: '우박', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'brk', n: 22 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e_numb', row: 4, b: '서리', tier: '하급', n: '곱은 손', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'e_coldember', row: 4, b: '서리', tier: '하급', n: '식은 불씨', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 21 }, { k: 'st', s: 'chill', n: 2 }, { k: 'shockx', keep: { s: 'chill', n: 1 } }] },
    { id: 'e_snap', row: 5, b: '서리', tier: '하급', n: '한파', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_bite', row: 5, b: '서리', tier: '하급', n: '동상', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'brk', n: 30 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'e_shell', row: 6, b: '서리', tier: '하급', n: '얼음 방패 화살', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 1 }, { k: 'meSt', s: 'protect', n: 3 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'e_maul', row: 6, b: '서리', tier: '하급', n: '빙퇴', tgt: 'ranged', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 32 }, { k: 'brk', n: 40 }, { k: 'cutx', brk: 70, chant: 1 }] },
    { id: 'e_mirror', row: 7, b: '서리', tier: '중급', n: '얼음 거울', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'rime', times: 4, n: 2 }, { k: 'st', s: 'protect', n: 4 }] },
    { id: 'e_breaker', row: 7, b: '서리', tier: '중급', n: '얼음 깨부수기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 28 }, { k: 'st', s: 'chill', n: 2 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_stasis', row: 8, b: '서리', tier: '중급', n: '정지', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 3 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'e_avalanche', row: 8, b: '서리', tier: '중급', n: '눈사태', tgt: 'front', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 25 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_tundra', row: 9, b: '서리', tier: '중급', n: '영구 동토', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 1 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'e_flash', row: 9, b: '서리', tier: '중급', n: '급랭', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'chill', n: 3 }, { k: 'shockx', dmg: 1.3, keep: { s: 'chill', n: 2 } }] },
    { id: 'e_zero', row: 10, b: '서리', tier: '중급', n: '절대 영도', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 2 }, { k: 'rime', times: 2, n: 1 }] },
    { id: 'e_coffin', row: 10, b: '서리', tier: '중급', n: '얼음 관', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 28 }, { k: 'brk', n: 33 }, { k: 'st', s: 'chill', n: 2 }, { k: 'chillx', mul: 1.5 }, { k: 'shockx', brk: 2 }] },
    // 공명: 왼쪽 엮기(한 적 · 열충격 배수 · 🔄), 오른쪽 물결(모두에게 한 원소씩 · 번짐). 지원과 섞인 무리에 강하고 큰 적에 약하다
    { id: 'e_weave', row: 1, b: '공명', tier: '하급', n: '원소 엮기', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'weave', ign: 4, chill: 1 }] },
    { id: 'e_firewave', row: 1, b: '공명', tier: '하급', n: '불꽃 물결', tgt: 'all', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'ignite', n: 1 }] },
    { id: 'e_twin', row: 2, b: '공명', tier: '하급', n: '쌍둥이 화살', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 3, chill: 1 }] },
    { id: 'e_frostwave', row: 2, b: '공명', tier: '하급', n: '냉기 물결', tgt: 'all', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e_catalyst', row: 3, b: '공명', tier: '하급', n: '촉매', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', dmg: 1.5 }] },
    { id: 'e_arc', row: 3, b: '공명', tier: '하급', n: '튀는 충격', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', arc: 0.5 }] },
    { id: 'e_resonate', row: 4, b: '공명', tier: '하급', n: '공명', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'hasten', n: 1, on: 'shock' }] },
    { id: 'e_backdraft', row: 4, b: '공명', tier: '하급', n: '역화', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'weave', ign: 3, chill: 1 }] },
    { id: 'e_polar', row: 5, b: '공명', tier: '하급', n: '극성 뒤집기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_steam', row: 5, b: '공명', tier: '하급', n: '증기 폭발', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'chill', n: 1 }, { k: 'shockx', dmg: 1.5 }] },
    { id: 'e_veil', row: 6, b: '공명', tier: '하급', n: '원소 장막', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'meSt', s: 'protect', n: 2 }] },
    { id: 'e_cloud', row: 6, b: '공명', tier: '하급', n: '증기 구름', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 3, chill: 1 }, { k: 'shockx', arc: 0.4 }] },
    { id: 'e_afterheat', row: 7, b: '공명', tier: '중급', n: '잔열', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', keep: { s: 'ignite', n: 3 } }] },
    { id: 'e_cascade', row: 7, b: '공명', tier: '중급', n: '연쇄 번짐', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'shockx', arc: 0.7 }] },
    { id: 'e_disrupt', row: 8, b: '공명', tier: '중급', n: '흐트러뜨림', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'cutx', brk: 35, chant: 1 }] },
    { id: 'e_maelstrom', row: 8, b: '공명', tier: '중급', n: '소용돌이', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 5 }, { k: 'weave', ign: 3, chill: 1 }, { k: 'shockx', dmg: 1.3 }] },
    { id: 'e_overload', row: 9, b: '공명', tier: '중급', n: '과부하', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 12 }, { k: 'weave', ign: 5, chill: 2 }, { k: 'shockx', dmg: 2 }] },
    { id: 'e_tempest', row: 9, b: '공명', tier: '중급', n: '원소 폭풍', tgt: 'all', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 2 }, { k: 'st', s: 'ignite', n: 2 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e_pole', row: 10, b: '공명', tier: '중급', n: '극점', tgt: 'ranged', time: 'slow', cd: 10, once: 1, fx: [{ k: 'dmg', n: 21 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'st', s: 'chill', n: 2 }, { k: 'shockx', dmg: 1.5, brk: 2 }] },
    { id: 'e_resoburst', row: 10, b: '공명', tier: '중급', n: '공명 폭발', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'weave', ign: 5, chill: 2 }, { k: 'shockx', dmg: 1.3, arc: 0.9 }] },
  ],
  spellblade: [
    /* 마검사 (10월 7일, docs/직업/마검사.md): kind 'cut' ⚔ 베기 · 'spell' ✦ 주문. 베기와 주문을 번갈아 쓰면 교대(직업 보호막 +4, 내 차례마다 한 번).
       새 효과: imbue(칼에 싣기) · edgeX(칼 ×) · kwx(쓰기 직전 그 상태였던 적에게 ×) · alt(교대 보상, run 2) · killSpread(쓰러뜨려 출혈 퍼뜨리기), exploit의 s · take, hasten on 'alt' · 'kill' */
    // 시작
    { id: 'sb_edge', b: '시작', tier: '시작', start: 1, n: '마검 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 29 }] },
    { id: 'sb_aegis', b: '시작', tier: '시작', start: 1, n: '주문 방패', kind: 'spell', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 7 }, { k: 'st', s: 'protect', n: 2 }, { k: 'stam', n: 27 }] },
    // 피칼날
    { id: 'sb_bleedcut', row: 1, b: '피칼날', tier: '하급', n: '피 내기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 4 }] },
    { id: 'sb_sweepcut', row: 1, b: '피칼날', tier: '하급', n: '가로 베기', kind: 'cut', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'sb_bloodmark', row: 2, b: '피칼날', tier: '하급', n: '피의 낙인', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'imbue', s: 'bleed', n: 4 }] },
    { id: 'sb_throat', row: 2, b: '피칼날', tier: '하급', n: '숨통 끊기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 15 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'sb_deepline', row: 3, b: '피칼날', tier: '하급', n: '스치는 칼', kind: 'cut', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'sb_redwind', row: 3, b: '피칼날', tier: '하급', n: '붉은 바람', kind: 'spell', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'sb_taste', row: 4, b: '피칼날', tier: '하급', n: '피 맛보기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'exploit', s: 'bleed', per: 3 }] },
    { id: 'sb_chaincut', row: 4, b: '피칼날', tier: '하급', n: '이어 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, killRecharge: 1, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'sb_boil', row: 5, b: '피칼날', tier: '하급', n: '피 끓이기', kind: 'spell', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'imbue', s: 'bleed', n: 5 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 24 }] },
    { id: 'sb_splash', row: 5, b: '피칼날', tier: '하급', n: '피 튀기기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'killSpread', per: 1 }] },
    { id: 'sb_vein', row: 6, b: '피칼날', tier: '하급', n: '핏줄 끊기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'sb_whirl', row: 6, b: '피칼날', tier: '하급', n: '피 털기', kind: 'cut', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'hasten', n: 1, on: 'kill' }] },
    { id: 'sb_pour', row: 7, b: '피칼날', tier: '중급', n: '피 쏟기', kind: 'cut', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'brk', n: 28 }] },
    { id: 'sb_execchain', row: 7, b: '피칼날', tier: '중급', n: '연쇄 처형', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, killRecharge: 1, fx: [{ k: 'dmg', n: 19 }, { k: 'kwx', s: 'bleed', mul: 1.5 }] },
    { id: 'sb_bloodfog', row: 8, b: '피칼날', tier: '중급', n: '피안개', kind: 'spell', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'st', s: 'bleed', n: 4 }, { k: 'imbue', s: 'bleed', n: 5 }] },
    { id: 'sb_redrain', row: 8, b: '피칼날', tier: '중급', n: '핏물 거두기', kind: 'spell', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'exploit', s: 'bleed', per: 1.5 }] },
    { id: 'sb_draw', row: 9, b: '피칼날', tier: '중급', n: '피 새겨 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'edgeX', mul: 2 }] },
    { id: 'sb_redstorm', row: 9, b: '피칼날', tier: '중급', n: '붉은 회오리', kind: 'cut', tgt: 'front', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 1 }, { k: 'killSpread', per: 1 }] },
    { id: 'sb_crimson', row: 10, b: '피칼날', tier: '중급', n: '붉은 처형', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 11 }, { k: 'exploit', s: 'bleed', per: 8, take: 1 }, { k: 'lowx', hp: 0.35, mul: 1.5 }] },
    { id: 'sb_feast', row: 10, b: '피칼날', tier: '중급', n: '선혈 난무', kind: 'cut', tgt: 'front', time: 'normal', cd: 10, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'hasten', n: 2, on: 'kill' }] },
    // 불칼
    { id: 'sb_ember', row: 1, b: '불칼', tier: '하급', n: '불씨 던지기', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'ignite', n: 4 }] },
    { id: 'sb_sparkcut', row: 1, b: '불칼', tier: '하급', n: '불씨 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, hits: 2, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'sb_flare', row: 2, b: '불칼', tier: '하급', n: '불꽃 탄', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'st', s: 'ignite', n: 2 }, { k: 'imbue', s: 'ignite', n: 3 }] },
    { id: 'sb_heated', row: 2, b: '불칼', tier: '하급', n: '달군 칼', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] },
    { id: 'sb_ring', row: 3, b: '불칼', tier: '하급', n: '화염 고리', kind: 'spell', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'ignite', n: 1 }, { k: 'imbue', s: 'ignite', n: 4 }] },
    { id: 'sb_kindle', row: 3, b: '불칼', tier: '하급', n: '칼에 불 싣기', kind: 'spell', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'imbue', s: 'ignite', n: 5 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 21 }] },
    { id: 'sb_snuff', row: 4, b: '불칼', tier: '하급', n: '끊는 불길', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'ignite', n: 3 }, { k: 'cutx', brk: 60 }] },
    { id: 'sb_char', row: 4, b: '불칼', tier: '하급', n: '숯 가르기', kind: 'cut', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 7 }, { k: 'exploit', s: 'ignite', per: 2.5 }] },
    { id: 'sb_brand', row: 5, b: '불칼', tier: '하급', n: '불의 표식', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'ignite', n: 3 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] },
    { id: 'sb_flamedown', row: 5, b: '불칼', tier: '하급', n: '불칼 내리치기', kind: 'cut', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'brk', n: 29 }] },
    { id: 'sb_sear', row: 6, b: '불칼', tier: '하급', n: '지지는 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'sb_flamedance', row: 6, b: '불칼', tier: '하급', n: '불꽃 칼춤', kind: 'cut', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 13 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] },
    { id: 'sb_lance', row: 7, b: '불칼', tier: '중급', n: '화염 창', kind: 'spell', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'lowx', hp: 0.35, mul: 1.75 }] },
    { id: 'sb_rush', row: 7, b: '불칼', tier: '중급', n: '화염 연참', kind: 'cut', tgt: 'melee', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'kwx', s: 'ignite', mul: 1.3 }, { k: 'edgeX', mul: 2 }] },
    { id: 'sb_tome', row: 8, b: '불칼', tier: '중급', n: '불의 서', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'st', s: 'ignite', n: 7 }, { k: 'imbue', s: 'ignite', n: 5 }] },
    { id: 'sb_coil', row: 8, b: '불칼', tier: '중급', n: '불길 감기', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 6 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'imbue', s: 'ignite', n: 3 }] },
    { id: 'sb_chainfire', row: 9, b: '불칼', tier: '중급', n: '불꽃 사슬', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'ignite', n: 2 }] },
    { id: 'sb_blaze', row: 9, b: '불칼', tier: '중급', n: '타오르는 일격', kind: 'cut', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 23 }, { k: 'kwx', s: 'ignite', mul: 1.5 }, { k: 'brk', n: 41 }] },
    { id: 'sb_hellfire', row: 10, b: '불칼', tier: '중급', n: '업화', kind: 'spell', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 20 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'cutx', brk: 58 }] },
    { id: 'sb_judgefire', row: 10, b: '불칼', tier: '중급', n: '불의 심판', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 11 }, { k: 'exploit', s: 'ignite', per: 4 }, { k: 'edgeX', mul: 2 }] },
    // 주문갑
    { id: 'sb_bladeward', row: 1, b: '주문갑', tier: '하급', n: '막 두른 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'ward', n: 6 }] },
    { id: 'sb_counter', row: 1, b: '주문갑', tier: '하급', n: '맞받아 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 16 }, { k: 'alt', ward: 4 }] },
    { id: 'sb_bolt', row: 2, b: '주문갑', tier: '하급', n: '막 실은 탄', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 11 }, { k: 'wardDmg', per: 0.5 }] },
    { id: 'sb_unravel', row: 2, b: '주문갑', tier: '하급', n: '흐트리는 주문', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'weak', n: 2 }, { k: 'alt', protect: 2 }] },
    { id: 'sb_shell', row: 3, b: '주문갑', tier: '하급', n: '껍질 주문', kind: 'spell', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'wardFill', to: 1 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 15 }] },
    { id: 'sb_beatcut', row: 3, b: '주문갑', tier: '하급', n: '박자 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 8 }, { k: 'alt', run: 2, brk: 30 }] },
    { id: 'sb_rebuke', row: 4, b: '주문갑', tier: '하급', n: '막 깨뜨리기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 6 }, { k: 'wardBurn', mul: 2.5, max: 6 }, { k: 'brk', n: 21 }] },
    { id: 'sb_rebound', row: 4, b: '주문갑', tier: '하급', n: '되튕기는 주문', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'cutx', brk: 41 }, { k: 'alt', stam: 25 }] },
    { id: 'sb_wardbolt', row: 5, b: '주문갑', tier: '하급', n: '막 실은 주문', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'wardDmg', per: 0.5 }] },
    { id: 'sb_turn', row: 5, b: '주문갑', tier: '하급', n: '돌려 베기', kind: 'cut', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'alt', ward: 4 }, { k: 'hasten', n: 1, on: 'alt' }] },
    { id: 'sb_wardburst', row: 6, b: '주문갑', tier: '하급', n: '막 터뜨리기', kind: 'spell', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'wardBurn', mul: 1.5, max: 8 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'sb_sunder', row: 6, b: '주문갑', tier: '하급', n: '자세 흩기', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 6 }, { k: 'alt', run: 2, brk: 30 }] },
    { id: 'sb_armor', row: 7, b: '주문갑', tier: '중급', n: '갑주 두른 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'wardFill', to: 0.5 }, { k: 'dmg', n: 15 }, { k: 'brk', n: 16 }] },
    { id: 'sb_weave', row: 7, b: '주문갑', tier: '중급', n: '칼과 주문 엮기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 10 }, { k: 'alt', run: 2, brk: 35, ward: 4 }] },
    { id: 'sb_spellguard', row: 8, b: '주문갑', tier: '중급', n: '막 울림', kind: 'spell', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 9 }, { k: 'wardDmg', per: 0.5 }] },
    { id: 'sb_reverse', row: 8, b: '주문갑', tier: '중급', n: '거슬러 읊기', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 8 }, { k: 'alt', run: 2, ward: 6, protect: 2 }] },
    { id: 'sb_embershell', row: 9, b: '주문갑', tier: '중급', n: '타고 남은 막', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'wardBurn', mul: 3, max: 9 }, { k: 'ward', n: 5 }] },
    { id: 'sb_rhythm', row: 9, b: '주문갑', tier: '중급', n: '마검 연무', kind: 'cut', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 9 }, { k: 'alt', ward: 4 }, { k: 'hasten', n: 1, on: 'alt' }] },
    { id: 'sb_shatter', row: 10, b: '주문갑', tier: '중급', n: '갑주 해방', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'wardBurn', mul: 1.5 }, { k: 'brk', n: 15 }, { k: 'lowx', hp: 0.35, mul: 1.4 }] },
    { id: 'sb_finale', row: 10, b: '주문갑', tier: '중급', n: '마검 일섬', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 25 }, { k: 'brk', n: 25 }, { k: 'alt', run: 2, brk: 30 }, { k: 'brokenx', mul: 1.5 }] },
  ],
  monk: [
    // 수도승 (10월 7일 구현, docs/직업/수도승.md): 시작 스킬 둘 + 철권 · 부동 · 혈도 60칸. 새 효과 stance · kiBurst · kiPer · kiGrow · ctrPer · sealx, meSt if: chill, hasten on: ctr (index.html runSkill2 · monkCounter)
    // 시작 스킬: 트리 밖. 기의 첫 출구가 되는 공격 하나(주 행동), ⚡ 자세 하나(빠른 행동). "⚡로 받아칠 준비, ▶로 공격"을 Lv1부터 가르친다
    { id: 'm_palm', b: '시작', tier: '시작', start: 1, n: '정권 지르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 22 }, { k: 'kiBurst', per: 3, max: 3 }] },
    { id: 'm_brace', b: '시작', tier: '시작', start: 1, n: '받아칠 자세', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'stance', half: 0, dmg: 5 }, { k: 'stam', n: 25 }] },

    // 철권: 빠른 연타로 기를 쌓고, 모은 기를 한 주먹에 몰아친다. 왼쪽 기둥은 연타(⚡ 연타 · 기 하나로 모든 타격이 세지는 ▶ 연타), 오른쪽은 기공(모으기 · 키우기 · 터뜨리기). 거구에 강하고 무리에 약하다
    { id: 'm_jab', row: 1, b: '철권', tier: '하급', n: '짧은 지르기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 12 }] },
    { id: 'm_rush', row: 1, b: '철권', tier: '하급', n: '쏟아치기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'kiBurst', per: 7 }] },
    { id: 'm_double', row: 2, b: '철권', tier: '하급', n: '두 번 지르기', tgt: 'melee', time: 'fast', cd: 4, hits: 2, fx: [{ k: 'dmg', n: 7 }] },
    { id: 'm_breath', row: 2, b: '철권', tier: '하급', n: '기 모으기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'st', s: 'empower', n: 3 }, { k: 'stam', n: 40 }] },
    { id: 'm_triple', row: 3, b: '철권', tier: '하급', n: '삼연격', tgt: 'melee', time: 'normal', cd: 7, hits: 3, fx: [{ k: 'dmg', n: 8 }] },
    { id: 'm_kifist', row: 3, b: '철권', tier: '하급', n: '기 실은 주먹', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'kiPer', per: 3 }] },
    { id: 'm_knee', row: 4, b: '철권', tier: '하급', n: '무릎 차기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 48 }] }, // 짧은 지르기(피해)와 갈라 붕괴 쪽: 피해는 더 작다
    { id: 'm_surge', row: 4, b: '철권', tier: '하급', n: '기 끌어올리는 주먹', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'kiGrow', add: 1, mul: 2 }] },
    { id: 'm_barrage', row: 5, b: '철권', tier: '하급', n: '몰아치는 주먹', tgt: 'melee', time: 'normal', cd: 6, hits: 4, fx: [{ k: 'dmg', n: 5 }, { k: 'meSt', s: 'empower', n: 1 }] }, // 기 1을 싣고 때린 뒤 1을 돌려받는다(기를 지키는 연타)
    { id: 'm_shock', row: 5, b: '철권', tier: '하급', n: '기 충격파', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 7 }, { k: 'kiBurst', per: 5 }] }, // 2챕터 요구(갈래마다 5줄 안에 광역): 땅속 · 뼈 더미 대책
    { id: 'm_gale', row: 6, b: '철권', tier: '하급', n: '질풍 지르기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'm_kistrike', row: 6, b: '철권', tier: '하급', n: '기공 일격', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'kiBurst', per: 5, max: 3, brk: 6 }, { k: 'bigx', mul: 1.5 }] }, // bigx는 max 3 칸에만: 한 방 상한 (12 + 15) × 1.5 = 40.5
    { id: 'm_hundred', row: 7, b: '철권', tier: '중급', n: '백렬권', tgt: 'melee', time: 'normal', cd: 6, hits: 5, fx: [{ k: 'dmg', n: 3 }, { k: 'kiPer', per: 1 }] }, // 기 비례가 타격마다 붙는 연타: 기 0이면 10, 기 3이면 25, 기 5면 35 (기는 1만 쓴다)
    { id: 'm_kiblast', row: 7, b: '철권', tier: '중급', n: '기 폭발', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'kiBurst', per: 6, max: 4, brk: 12 }] }, // 붕괴로 터뜨리기: 기 4까지, 붕괴 최대 48. 남은 기는 그대로
    { id: 'm_flow', row: 8, b: '철권', tier: '중급', n: '흐르는 주먹', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 14 }, { k: 'meSt', s: 'empower', n: 1 }] }, // meSt 강화는 피해 뒤(공통 변경)라 순 +1, 직업 규칙의 ⚡ 기 +1과 따로
    { id: 'm_wave', row: 8, b: '철권', tier: '중급', n: '장풍', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'kiBurst', per: 8 }] },
    { id: 'm_endless', row: 9, b: '철권', tier: '중급', n: '멈추지 않는 주먹', tgt: 'melee', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 23 }] },
    { id: 'm_split', row: 9, b: '철권', tier: '중급', n: '기 가르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'kiBurst', per: 9, keep: 0.5 }] },
    { id: 'm_storm', row: 10, b: '철권', tier: '중급', n: '연타의 끝', tgt: 'melee', time: 'normal', cd: 10, hits: 6, fx: [{ k: 'dmg', n: 5 }, { k: 'bigx', mul: 1.3 }] }, // 연타 칸에는 brk · st를 두지 않는다(엔진은 붕괴를 타격마다, 점수는 한 번). 큰 적용 연타 마무리
    { id: 'm_release', row: 10, b: '철권', tier: '중급', n: '기공 해방', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 16 }, { k: 'kiBurst', per: 10, brk: 8 }] }, // bigx 없음: 기 5에서 14 + 40 = 54, 붕괴 +40

    // 부동: 막고 되받는다. 왼쪽 기둥은 자세(⚡ 자세는 되받기만, ▶ 자세는 막기와 되받기), 오른쪽은 되갚기(되받은 만큼 세지는 공격, 전열 밀기). 무리에 강하고 후열에 약하다
    { id: 'm_iron', row: 1, b: '부동', tier: '하급', n: '쇠기둥 자세', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'stance', dmg: 13 }] },
    { id: 'm_answer', row: 1, b: '부동', tier: '하급', n: '응수', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 13 }, { k: 'ctrPer', per: 7 }] },
    { id: 'm_root', row: 2, b: '부동', tier: '하급', n: '뿌리 내리기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', half: 0, dmg: 13, ki: 1 }] },
    { id: 'm_retort', row: 2, b: '부동', tier: '하급', n: '되치기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 15 }, { k: 'ctrPer', per: 5 }] },
    { id: 'm_mountain', row: 3, b: '부동', tier: '하급', n: '산처럼', tgt: 'self', time: 'normal', cd: 6, fx: [{ k: 'stance', dmg: 8, brk: 50 }] }, // 쇠기둥(피해)과 갈라 붕괴 쪽. 강타를 되받으면 10 + 25 + 50
    { id: 'm_shove', row: 3, b: '부동', tier: '하급', n: '밀어내는 손', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 20 }] },
    { id: 'm_thorns', row: 4, b: '부동', tier: '하급', n: '천수 받기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', half: 0, dmg: 11, max: 2 }] }, // 이름: 파수꾼 "가시"와 헷갈리지 않게
    { id: 'm_repay', row: 4, b: '부동', tier: '하급', n: '되갚는 발', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 45 }, { k: 'ctrPer', per: 6 }] }, // 응수(피해)와 갈라 붕괴 쪽: 피해는 더 작다
    { id: 'm_calm', row: 5, b: '부동', tier: '하급', n: '부동심', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', half: 0, dmg: 15, weak: 1 }, { k: 'hasten', n: 1, on: 'ctr' }] }, // 부동의 🔄 되받기 칸은 이 하나뿐, 자세마다 1회
    { id: 'm_rebound', row: 5, b: '부동', tier: '하급', n: '반탄', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'ctrPer', per: 5 }] },
    { id: 'm_diamond', row: 6, b: '부동', tier: '하급', n: '금강', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'stance', dmg: 15, ki: 1 }] },
    { id: 'm_breaker', row: 6, b: '부동', tier: '하급', n: '되받아 꺾기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'ctrPer', per: 7 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'm_ironmtn', row: 7, b: '부동', tier: '중급', n: '철산고', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'stance', dmg: 15, brk: 20, weak: 2 }] }, // 산처럼과 갈라: 되받은 적에게 약화 2(큰 한 방 뒤의 다음 두 공격을 깎는다)
    { id: 'm_tide', row: 7, b: '부동', tier: '중급', n: '되갚는 물결', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 15 }, { k: 'ctrPer', per: 6 }] },
    { id: 'm_still', row: 8, b: '부동', tier: '중급', n: '고요한 받기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', half: 0, dmg: 15, chill: 2, ki: 1 }] }, // 둔화 2: 내 다음 차례에도 1이 남아 혈도 칸과 섞을 수 있다
    { id: 'm_hundredfold', row: 8, b: '부동', tier: '중급', n: '백배 갚기', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 24 }, { k: 'ctrPer', per: 12 }] },
    { id: 'm_far', row: 9, b: '부동', tier: '중급', n: '멀리 받아치기', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'stance', half: 0, dmg: 15, far: 1 }, { k: 'stam', n: 20 }] }, // 후열 약점의 출구: 화형(spell)은 여전히 되받지 못한다
    { id: 'm_backlash', row: 9, b: '부동', tier: '중급', n: '되받아 휩쓸기', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 12 }, { k: 'ctrPer', per: 6 }, { k: 'st', s: 'weak', n: 1 }] }, // 반탄과 갈라: 전열 모두 약화 1
    { id: 'm_myeongwang', row: 10, b: '부동', tier: '중급', n: '부동명왕', tgt: 'self', time: 'slow', cd: 10, fx: [{ k: 'stance', dmg: 14, brk: 25, ki: 1, max: 3 }] },
    { id: 'm_final', row: 10, b: '부동', tier: '중급', n: '마지막 응수', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'ctrPer', per: 8 }, { k: 'stance' }] }, // 친 뒤 방어 자세: 되갚고 다시 받는 고리의 끝. lowx를 두지 않는다(되받은 몫까지 곱해짐)

    // 혈도: 급소를 눌러 늦추고, 늦춘 적에게서 기를 얻는다. 왼쪽 기둥은 점혈(둔화 · 약화 걸기, 강타 끊기 붕괴, 지원 끊기), 오른쪽은 흡기(이미 둔화된 적에게서 기 얻기, 둔화된 적을 크게). 강타에 강하고 거구에 약하다
    // 둔화 타이밍(문서 B-5): 내 차례에 건 둔화 N은 라운드 시작에 1 줄어 내 다음 차례에 N−1이다. 다음 차례 준비용 칸은 둔화 2, 같은 차례에는 ⚡로 걸고 ▶로 거둔다
    { id: 'm_point', row: 1, b: '혈도', tier: '하급', n: '혈 짚기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_siphon', row: 1, b: '혈도', tier: '하급', n: '기 빼앗기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] },
    { id: 'm_finger', row: 2, b: '혈도', tier: '하급', n: '손끝 바람', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'm_lock', row: 2, b: '혈도', tier: '하급', n: '맥 누르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 21 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_sinew', row: 3, b: '혈도', tier: '하급', n: '힘줄 누르기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'm_drink', row: 3, b: '혈도', tier: '하급', n: '흐름 마시기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'chillx', mul: 1.3 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] },
    { id: 'm_cut', row: 4, b: '혈도', tier: '하급', n: '기혈 끊기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 20 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 90 }] }, // 맥 누르기(18)보다 피해가 작고 끊기 붕괴가 크다
    { id: 'm_drain', row: 4, b: '혈도', tier: '하급', n: '흡기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }, { k: 'st', s: 'chill', n: 2 }] }, // 거둔 뒤 둔화 2를 다시 건다: 다음 차례에 1이 남아 다른 거두기 칸이 잇는다
    { id: 'm_press', row: 5, b: '혈도', tier: '하급', n: '온몸 누르기', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_frozenvein', row: 5, b: '혈도', tier: '하급', n: '얼어붙은 맥', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'm_flick', row: 6, b: '혈도', tier: '하급', n: '탄지', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 2 }, { k: 'sealx', brk: 30 }] }, // 지원 끊기: 후열 사제에 닿는다
    { id: 'm_reverse', row: 6, b: '혈도', tier: '하급', n: '역혈', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'kiPer', per: 2 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] },
    { id: 'm_seal', row: 7, b: '혈도', tier: '중급', n: '혈 봉쇄', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 23 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 60 }, { k: 'sealx', brk: 25 }] }, // 기혈 끊기와 갈라: 모으는 힘과 지원 행동을 함께 끊는 근접 칸
    { id: 'm_harvest', row: 7, b: '혈도', tier: '중급', n: '기 거두기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'chillx', mul: 1.5 }, { k: 'meSt', s: 'empower', n: 1, if: 'chill' }] },
    { id: 'm_numb', row: 8, b: '혈도', tier: '중급', n: '마비 지르기', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 1 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'm_backflow', row: 8, b: '혈도', tier: '중급', n: '거슬러 오르는 기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 21 }, { k: 'chillx', mul: 1.5 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] }, // 흐름 마시기와 갈라: 후열까지 닿는 거두기(근접으로 덤비지 않는 적에게서 기)
    { id: 'm_allpoint', row: 9, b: '혈도', tier: '중급', n: '만혈 짚기', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'sealx', brk: 20 }] },
    { id: 'm_veinburst', row: 9, b: '혈도', tier: '중급', n: '맥 터뜨리기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 20 }, { k: 'kiBurst', per: 7 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_stillpt', row: 10, b: '혈도', tier: '중급', n: '정지혈', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 30 }, { k: 'st', s: 'chill', n: 3 }, { k: 'st', s: 'weak', n: 3 }, { k: 'cutx', brk: 70 }] },
    { id: 'm_kingvein', row: 10, b: '혈도', tier: '중급', n: '혈도의 끝', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'kiBurst', per: 7, pre: 3 }] }, // chillx를 두지 않는다(거둔 몫까지 곱해져 한 방이 커짐)
  ],
  confessor: [
    /* 숨겨진 직업 2 (10월 7일, UNLOCK.confessor). 설계 · 까닭은 비공개 문서. 새 효과: cleanse(정화 · 사함 offer · after) · transfer(옮기기) · perDmg(of: prot · burden · clean · weak · bleed · tbad) · dispel(강화 벗기기), meSt의 해로운 상태는 행동 뒤 고행(p.selfN), hasten on 'clean' */
    // 시작
    { id: 'c_mace', b: '시작', tier: '시작', start: 1, n: '고해의 철퇴', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 23 }] },
    { id: 'c_confess', b: '시작', tier: '시작', start: 1, n: '고해', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', n: 3 }, { k: 'stam', n: 47 }] },
    // 속죄 (왼쪽 정결 · 오른쪽 용서)
    { id: 'c_wash', row: 1, b: '속죄', tier: '하급', n: '씻어 내는 일격', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 21 }] },
    { id: 'c_holywater', row: 1, b: '속죄', tier: '하급', n: '성수 뿌리기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 1, heal: 3 }, { k: 'dmg', n: 22 }] },
    { id: 'c_heartwash', row: 2, b: '속죄', tier: '하급', n: '마음 씻는 일격', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'cleanse', only: ['vuln', 'weak'] }, { k: 'dmg', n: 19 }] },
    { id: 'c_absolve', row: 2, b: '속죄', tier: '하급', n: '사죄의 기도', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', heal: 5 }] },
    { id: 'c_censer', row: 3, b: '속죄', tier: '하급', n: '향로 휘두르기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 15 }] },
    { id: 'c_rosary', row: 3, b: '속죄', tier: '하급', n: '묵주 던지기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'cleanse', n: 1 }, { k: 'dmg', n: 15 }, { k: 'hasten', n: 1, on: 'clean' }] },
    { id: 'c_steady', row: 4, b: '속죄', tier: '하급', n: '흔들림 없는 손', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 22 }, { k: 'perDmg', of: 'prot', per: 4 }] },
    { id: 'c_mercylight', row: 4, b: '속죄', tier: '하급', n: '용서의 빛', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'cleanse', n: 2, heal: 3 }, { k: 'dmg', n: 13 }] },
    { id: 'c_cutwash', row: 5, b: '속죄', tier: '하급', n: '끊어 씻기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'cleanse', n: 1 }, { k: 'dmg', n: 16 }, { k: 'cutx', brk: 54 }] },
    { id: 'c_staunch', row: 5, b: '속죄', tier: '하급', n: '피 멎는 기도', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', only: ['bleed', 'ignite'], heal: 7 }, { k: 'stam', n: 51 }] },
    { id: 'c_fallen', row: 6, b: '속죄', tier: '하급', n: '무너진 자 씻기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 19 }, { k: 'brokenx', mul: 2 }] },
    { id: 'c_piercelight', row: 6, b: '속죄', tier: '하급', n: '꿰뚫는 빛', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 1 }, { k: 'dmg', n: 18 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'c_spendmace', row: 7, b: '속죄', tier: '중급', n: '보호의 망치', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 28 }, { k: 'perDmg', of: 'prot', per: 7, spend: 1 }, { k: 'brk', n: 30 }] },
    { id: 'c_lightbody', row: 7, b: '속죄', tier: '중급', n: '가벼워진 몸', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'cleanse', stam: 12, quick: 1 }, { k: 'hasten', n: 1, on: 'clean' }] },
    { id: 'c_firmbreak', row: 8, b: '속죄', tier: '중급', n: '무너뜨리는 정결', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 23 }, { k: 'perDmg', of: 'prot', brk: 10, spend: 1 }] },
    { id: 'c_dawn', row: 8, b: '속죄', tier: '중급', n: '새벽빛', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'cleanse', n: 3, heal: 4, haste: 1 }, { k: 'dmg', n: 26 }] },
    { id: 'c_ripple', row: 9, b: '속죄', tier: '중급', n: '정결의 파문', tgt: 'front', time: 'slow', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'perDmg', of: 'prot', per: 2 }, { k: 'cleanse', after: 1 }] },
    { id: 'c_lance', row: 9, b: '속죄', tier: '중급', n: '빛의 창', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 31 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_judgment', row: 10, b: '속죄', tier: '중급', n: '정결의 심판', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'cleanse' }, { k: 'dmg', n: 27 }, { k: 'perDmg', of: 'prot', per: 6, spend: 1 }, { k: 'brk', n: 60 }] },
    { id: 'c_amnesty', row: 10, b: '속죄', tier: '중급', n: '대사면', tgt: 'self', time: 'normal', cd: 10, fx: [{ k: 'cleanse', heal: 7 }, { k: 'stam', n: 60 }, { k: 'hasten', n: 2, on: 'clean' }] },
    // 전가 (왼쪽 되돌리기 · 오른쪽 덮어씌우기)
    { id: 'c_return', row: 1, b: '전가', tier: '하급', n: '저주 되돌리기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dmg', n: 17 }] },
    { id: 'c_accuse', row: 1, b: '전가', tier: '하급', n: '죄 덮어씌우기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['vuln'], add: 1 }, { k: 'dmg', n: 20 }] },
    { id: 'c_strip', row: 2, b: '전가', tier: '하급', n: '축복 벗기기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dispel', n: 2 }, { k: 'dmg', n: 16 }] },
    { id: 'c_bloodpass', row: 2, b: '전가', tier: '하급', n: '피 떠넘기기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'transfer', only: ['bleed'], add: 1 }, { k: 'dmg', n: 14 }] },
    { id: 'c_dull', row: 3, b: '전가', tier: '하급', n: '무딘 손', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'transfer', only: ['weak'] }, { k: 'dmg', n: 14 }, { k: 'cutx', brk: 65 }] },
    { id: 'c_indict', row: 3, b: '전가', tier: '하급', n: '죄목 읽기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'vulnPer', per: 4 }] },
    { id: 'c_pass', row: 4, b: '전가', tier: '하급', n: '떠넘기는 기도', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dmg', n: 13 }] },
    { id: 'c_ember', row: 4, b: '전가', tier: '하급', n: '불씨 옮기기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['ignite'], add: 2 }, { k: 'dmg', n: 20 }] },
    { id: 'c_hobble', row: 5, b: '전가', tier: '하급', n: '발목 잡는 죄', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['chill', 'weak'], add: 2, addK: 'chill' }, { k: 'dmg', n: 20 }] },
    { id: 'c_burden', row: 5, b: '전가', tier: '하급', n: '짐 떠넘기기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'transfer' }, { k: 'dmg', n: 23 }] },
    { id: 'c_bow', row: 6, b: '전가', tier: '하급', n: '무릎 꿇리기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'perDmg', of: 'weak', per: 4, brk: 6 }] },
    { id: 'c_charge', row: 6, b: '전가', tier: '하급', n: '고발', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'transfer', only: ['vuln'], add: 1 }, { k: 'dmg', n: 14 }, { k: 'vulnPer', per: 3 }] },
    { id: 'c_choir', row: 7, b: '전가', tier: '중급', n: '성가 빼앗기', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dispel', n: 1 }, { k: 'dmg', n: 14 }] },
    { id: 'c_bloodwit', row: 7, b: '전가', tier: '중급', n: '피의 증언', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 26 }, { k: 'perDmg', of: 'bleed', per: 3 }] },
    { id: 'c_heavyhand', row: 8, b: '전가', tier: '중급', n: '무거운 손', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'transfer', only: ['weak'], add: 2 }, { k: 'dmg', n: 12 }, { k: 'perDmg', of: 'weak', per: 3 }, { k: 'brk', n: 23 }] },
    { id: 'c_pyreback', row: 8, b: '전가', tier: '중급', n: '불의 고발', tgt: 'ranged', time: 'normal', cd: 8, hits: 2, fx: [{ k: 'transfer', only: ['ignite'], add: 2 }, { k: 'dmg', n: 13 }] },
    { id: 'c_silence', row: 9, b: '전가', tier: '중급', n: '침묵', tgt: 'ranged', time: 'fast', cd: 7, fx: [{ k: 'dispel' }, { k: 'dmg', n: 21 }, { k: 'cutx', brk: 52 }] },
    { id: 'c_scapegoat', row: 9, b: '전가', tier: '중급', n: '희생양', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'transfer' }, { k: 'dmg', n: 17 }, { k: 'vulnPer', per: 5 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_bind', row: 10, b: '전가', tier: '중급', n: '저주의 굴레', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dispel', n: 1 }, { k: 'dmg', n: 14 }, { k: 'brk', n: 15 }] },
    { id: 'c_weight', row: 10, b: '전가', tier: '중급', n: '죄의 무게', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'transfer' }, { k: 'dmg', n: 28 }, { k: 'perDmg', of: 'tbad', per: 4 }] },
    // 고행 (왼쪽 채찍 · 오른쪽 참회)
    { id: 'c_lash', row: 1, b: '고행', tier: '하급', n: '채찍질', tgt: 'melee', time: 'normal', cd: 6, keep: ['meSt'], fx: [{ k: 'dmg', n: 22 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_repent', row: 1, b: '고행', tier: '하급', n: '참회의 일격', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'cleanse', offer: 1, dmg: 4 }, { k: 'dmg', n: 18 }] },
    { id: 'c_bear', row: 2, b: '고행', tier: '하급', n: '짊어진 일격', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'perDmg', of: 'burden', per: 3 }] },
    { id: 'c_shoulder', row: 2, b: '고행', tier: '하급', n: '짐 지기', tgt: 'melee', time: 'fast', cd: 4, keep: ['meSt'], fx: [{ k: 'dmg', n: 15 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_ashes', row: 3, b: '고행', tier: '하급', n: '베옷과 재', tgt: 'self', time: 'fast', cd: 4, keep: ['meSt', 'quick'], fx: [{ k: 'meSt', s: 'ignite', n: 2 }, { k: 'meSt', s: 'chill', n: 1 }, { k: 'quick', n: 1 }, { k: 'stam', n: 60 }] },
    { id: 'c_shake', row: 3, b: '고행', tier: '하급', n: '털어 내기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'cleanse', n: 2, offer: 1, brk: 12 }, { k: 'dmg', n: 15 }] },
    { id: 'c_prostrate', row: 4, b: '고행', tier: '하급', n: '엎드린 일격', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'perDmg', of: 'burden', per: 4 }, { k: 'brk', n: 39 }] },
    { id: 'c_contrite', row: 4, b: '고행', tier: '하급', n: '통회', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 22 }, { k: 'perDmg', of: 'clean', per: 5 }] },
    { id: 'c_frenzy', row: 5, b: '고행', tier: '하급', n: '고행자의 연타', tgt: 'melee', time: 'normal', cd: 5, hits: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'perDmg', of: 'burden', per: 1 }] },
    { id: 'c_fireoffer', row: 5, b: '고행', tier: '하급', n: '불의 사함', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'cleanse', only: ['bleed', 'ignite'], offer: 1, dmg: 6 }, { k: 'dmg', n: 23 }] },
    { id: 'c_pilgrim', row: 6, b: '고행', tier: '하급', n: '순례자의 걸음', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'perDmg', of: 'burden', per: 3 }] },
    { id: 'c_burst', row: 6, b: '고행', tier: '하급', n: '참회의 폭발', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'cleanse', offer: 1, dmg: 3 }, { k: 'dmg', n: 14 }] },
    { id: 'c_bared', row: 7, b: '고행', tier: '중급', n: '몸을 내준 일격', tgt: 'melee', time: 'normal', cd: 7, keep: ['meSt'], fx: [{ k: 'dmg', n: 30 }, { k: 'meSt', s: 'vuln', n: 2 }] },
    { id: 'c_kneelconf', row: 7, b: '고행', tier: '중급', n: '무릎 꿇은 고백', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'cleanse', offer: 1, dmg: 4, brk: 8 }, { k: 'dmg', n: 28 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_march', row: 8, b: '고행', tier: '중급', n: '무거운 행렬', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 17 }, { k: 'perDmg', of: 'burden', per: 2 }] },
    { id: 'c_breath', row: 8, b: '고행', tier: '중급', n: '고백의 숨', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', quick: 1 }, { k: 'stam', n: 53 }] },
    { id: 'c_crown', row: 9, b: '고행', tier: '중급', n: '불의 관', tgt: 'melee', time: 'slow', cd: 9, keep: ['meSt'], fx: [{ k: 'dmg', n: 30 }, { k: 'perDmg', of: 'burden', per: 5 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_tears', row: 9, b: '고행', tier: '중급', n: '눈물의 매', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 22 }, { k: 'perDmg', of: 'clean', per: 7 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_martyr', row: 10, b: '고행', tier: '중급', n: '순교', tgt: 'melee', time: 'slow', cd: 10, keep: ['meSt'], fx: [{ k: 'dmg', n: 24 }, { k: 'perDmg', of: 'burden', per: 6 }, { k: 'bigx', mul: 1.5 }, { k: 'meSt', s: 'ignite', n: 3 }] },
    { id: 'c_lastrite', row: 10, b: '고행', tier: '중급', n: '마지막 고해', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 27 }, { k: 'perDmg', of: 'burden', per: 5 }, { k: 'cleanse', after: 1 }, { k: 'bigx', mul: 1.5 }] },
  ],
  /* 숨겨진 직업 3 (10월 7일, UNLOCK.bloodmage). 설계 · 까닭은 비공개 문서. 엔진 값은 index.html BLOOD */
  bloodmage: [
    { id: 'v_taint', b: '시작', tier: '시작', start: 1, n: '오염된 피', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 9 }, { k: 'poison', n: 3 }] },
    { id: 'v_drink', b: '시작', tier: '시작', start: 1, n: '독 마시기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'drain', eat: 1, per: 9 }, { k: 'meSt', s: 'protect', n: 2 }, { k: 'payCut', mul: 0.5, n: 1 }] },
    // 역병: 왼쪽 안개(넓게 걸기, 줄마다 덧붙임이 다르다) · 오른쪽 옮김(한 적의 독을 무리로, 쓰러뜨리면 번짐, 표식). 무리에 강하고 거구에 약하다
    { id: 'v_fog', row: 1, b: '역병', tier: '하급', n: '독 안개', tgt: 'all', time: 'normal', cd: 6, fx: [{ k: 'poison', n: 3 }] },
    { id: 'v_spill', row: 1, b: '역병', tier: '하급', n: '번지는 피', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 7 }, { k: 'spread', per: 0.5 }] },
    { id: 'v_mist', row: 2, b: '역병', tier: '하급', n: '핏빛 안개', tgt: 'front', time: 'fast', cd: 5, fx: [{ k: 'poison', n: 2 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'v_host', row: 2, b: '역병', tier: '하급', n: '숙주 삼기', tgt: 'ranged', time: 'slow', cd: 5, fx: [{ k: 'poison', n: 7 }] },
    { id: 'v_gust', row: 3, b: '역병', tier: '하급', n: '역병 바람', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 2 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'v_vein', row: 3, b: '역병', tier: '하급', n: '터지는 핏줄', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'poison', n: 2 }, { k: 'spread', per: 1, kill: 1 }] },
    { id: 'v_marsh', row: 4, b: '역병', tier: '하급', n: '늪의 숨', tgt: 'front', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 2 }] },
    { id: 'v_infect', row: 4, b: '역병', tier: '하급', n: '전염', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 4 }, { k: 'spread', per: 0.5 }] },
    { id: 'v_veil', row: 5, b: '역병', tier: '하급', n: '독 장막', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 2 }, { k: 'meSt', s: 'protect', n: 3 }] },
    { id: 'v_rotend', row: 5, b: '역병', tier: '하급', n: '썩은 마무리', tgt: 'ranged', time: 'fast', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'poison', n: 1 }, { k: 'spread', per: 1, kill: 1 }] },
    { id: 'v_choke', row: 6, b: '역병', tier: '하급', n: '숨 막는 독기', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 2 }, { k: 'cutx', brk: 18 }] },
    { id: 'v_carry', row: 6, b: '역병', tier: '하급', n: '옮겨 붙기', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 4 }, { k: 'spread', per: 1 }] },
    { id: 'v_cloud', row: 7, b: '역병', tier: '중급', n: '역병 구름', tgt: 'all', time: 'slow', cd: 8, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'poison', n: 5 }] },
    { id: 'v_vector', row: 7, b: '역병', tier: '중급', n: '역병 매개', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'poison', n: 3 }, { k: 'spread', per: 0.5 }] },
    { id: 'v_pollen', row: 8, b: '역병', tier: '중급', n: '송장 꽃가루', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'poison', n: 1 }, { k: 'spread', per: 1, kill: 1 }] },
    { id: 'v_chain', row: 8, b: '역병', tier: '중급', n: '줄줄이 번짐', tgt: 'ranged', time: 'normal', cd: 7, killRecharge: 1, fx: [{ k: 'dmg', n: 13 }, { k: 'poison', n: 2 }, { k: 'spread', per: 1, kill: 1 }] },
    { id: 'v_black', row: 9, b: '역병', tier: '중급', n: '검은 안개', tgt: 'all', time: 'normal', cd: 10, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 3 }, { k: 'st', s: 'vuln', n: 1 }] },
    { id: 'v_corpse', row: 9, b: '역병', tier: '중급', n: '송장 꽃', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 14 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'spread', per: 1, kill: 1 }] },
    { id: 'v_rotland', row: 10, b: '역병', tier: '중급', n: '썩어 꺼지는 땅', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 3 }, { k: 'brk', n: 25 }] },
    { id: 'v_pandemic', row: 10, b: '역병', tier: '중급', n: '끝없는 역병', tgt: 'ranged', time: 'slow', cd: 10, once: 1, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 12 }, { k: 'spread', per: 1, kill: 1, mark: 1 }] },
    // 포식: 왼쪽 거두기(먹어 버티기) · 오른쪽 빼앗기(먹은 만큼 친다 · 강화). 장기전에 강하고 무리에 약하다
    { id: 'v_reap', row: 1, b: '포식', tier: '하급', n: '피 거두기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'drain', eat: 1, per: 15 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'v_leech', row: 1, b: '포식', tier: '하급', n: '기운 빨기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'poison', n: 3 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'v_plant', row: 2, b: '포식', tier: '하급', n: '피 심기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'poison', n: 4 }] },
    { id: 'v_grasp', row: 2, b: '포식', tier: '하급', n: '빼앗는 입', tgt: 'ranged', time: 'fast', cd: 8, fx: [{ k: 'drain', eat: 1, max: 4, per: 15 }, { k: 'meSt', s: 'empower', n: 2 }] },
    { id: 'v_replant', row: 3, b: '포식', tier: '하급', n: '먹고 심기', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'drain', eat: 1, per: 2 }, { k: 'poison', n: 8 }] },
    { id: 'v_fang', row: 3, b: '포식', tier: '하급', n: '송곳니', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'drain', eat: 1, max: 3, per: 2, dmg: 4 }] },
    { id: 'v_nibble', row: 4, b: '포식', tier: '하급', n: '아껴 먹기', tgt: 'ranged', time: 'fast', cd: 3, fx: [{ k: 'drain', eat: 1, max: 3, per: 11 }, { k: 'stam', n: 35 }] },
    { id: 'v_sap', row: 4, b: '포식', tier: '하급', n: '힘 빼앗기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 25 }, { k: 'drain', eat: 1, per: 2 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'v_swarm', row: 5, b: '포식', tier: '하급', n: '거머리 떼', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 7 }, { k: 'poison', n: 3 }] },
    { id: 'v_spike', row: 5, b: '포식', tier: '하급', n: '피 송곳', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'drain', eat: 1, max: 4, per: 4, dmg: 4 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'v_supper', row: 6, b: '포식', tier: '하급', n: '붉은 성찬', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'drain', eat: 1, per: 15 }, { k: 'meSt', s: 'protect', n: 5 }] },
    { id: 'v_vessel', row: 6, b: '포식', tier: '하급', n: '핏줄 훑기', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'drain', eat: 1, max: 2, per: 5, dmg: 3 }] },
    { id: 'v_deepreap', row: 7, b: '포식', tier: '중급', n: '깊은 거두기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'drain', eat: 1, per: 11 }, { k: 'stam', n: 46 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'v_rotfang', row: 7, b: '포식', tier: '중급', n: '썩은 이빨', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 6 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'v_gather', row: 8, b: '포식', tier: '중급', n: '독 모아 마시기', tgt: 'all', time: 'normal', cd: 10, fx: [{ k: 'drain', eat: 1, max: 3, per: 13 }, { k: 'poison', n: 3 }] },
    { id: 'v_shroud', row: 8, b: '포식', tier: '중급', n: '빼앗아 두르기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'drain', eat: 1, max: 4, per: 12 }, { k: 'meSt', s: 'protect', n: 2 }, { k: 'meSt', s: 'empower', n: 1 }] },
    { id: 'v_teat', row: 9, b: '포식', tier: '중급', n: '썩은 젖줄', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'poison', n: 9 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'v_predator', row: 9, b: '포식', tier: '중급', n: '포식자의 일격', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 26 }, { k: 'drain', eat: 1, per: 3, dmg: 3 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'v_hunger', row: 10, b: '포식', tier: '중급', n: '끝없는 허기', tgt: 'ranged', time: 'slow', cd: 10, once: 1, fx: [{ k: 'drain', eat: 1, per: 10 }, { k: 'poison', n: 14 }, { k: 'meSt', s: 'protect', n: 4 }] },
    { id: 'v_gorge', row: 10, b: '포식', tier: '중급', n: '통째로 삼키기', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 17 }, { k: 'drain', eat: 1, per: 4, dmg: 2 }, { k: 'poison', n: 5 }] },
    // 혈약: 왼쪽 피 바치기(생명력을 내고 무너뜨리는 큰 한 발, 무너진 적) · 오른쪽 피의 저주(이번 차례에 낸 피 · 약화). 거구에 강하고 장기전에 약하다
    { id: 'v_spear', row: 1, b: '혈약', tier: '하급', n: '피의 창', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'dmg', n: 27 }] },
    { id: 'v_curse', row: 1, b: '혈약', tier: '하급', n: '저주의 피', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'v_cut', row: 2, b: '혈약', tier: '하급', n: '상처 열기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'hpCost', pct: 0.03 }, { k: 'dmg', n: 15 }, { k: 'brk', n: 37 }] },
    { id: 'v_letting', row: 2, b: '혈약', tier: '하급', n: '사혈', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'hpCost', pct: 0.04 }, { k: 'st', s: 'empower', n: 4 }, { k: 'stam', n: 39 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'v_thorn', row: 3, b: '혈약', tier: '하급', n: '피 가시', tgt: 'ranged', time: 'slow', cd: 7, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'dmg', n: 28 }, { k: 'brk', n: 38 }] },
    { id: 'v_fervor', row: 3, b: '혈약', tier: '하급', n: '핏발', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'bloodDmg', per: 1 }] },
    { id: 'v_heart', row: 4, b: '혈약', tier: '하급', n: '심장 노리기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'hpCost', pct: 0.04 }, { k: 'dmg', n: 25 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'v_creep', row: 4, b: '혈약', tier: '하급', n: '저주 번지기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'weak', n: 2 }, { k: 'spread', s: 'weak', per: 1 }] },
    { id: 'v_rain', row: 5, b: '혈약', tier: '하급', n: '피 뿌리기', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'dmg', n: 15 }] },
    { id: 'v_oath', row: 5, b: '혈약', tier: '하급', n: '피의 맹세', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'payCut', mul: 0.5, n: 2 }, { k: 'st', s: 'protect', n: 4 }, { k: 'stam', n: 47 }] },
    { id: 'v_rupture', row: 6, b: '혈약', tier: '하급', n: '파열', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'dmg', n: 25 }, { k: 'brk', n: 28 }, { k: 'cutx', brk: 50 }] },
    { id: 'v_fade', row: 6, b: '혈약', tier: '하급', n: '흐려지는 피', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 20 }, { k: 'perDmg', of: 'weak', per: 4 }] },
    { id: 'v_impale', row: 7, b: '혈약', tier: '중급', n: '꿰뚫는 피', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'dmg', n: 27 }, { k: 'brokenx', mul: 2 }] },
    { id: 'v_offering', row: 7, b: '혈약', tier: '중급', n: '피의 제물', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'hpCost', pct: 0.06 }, { k: 'dmg', n: 11 }, { k: 'bloodDmg', per: 1.5 }] },
    { id: 'v_tempest', row: 8, b: '혈약', tier: '중급', n: '피의 폭풍', tgt: 'all', time: 'slow', cd: 6, fx: [{ k: 'hpCost', pct: 0.06 }, { k: 'dmg', n: 18 }] },
    { id: 'v_covenant', row: 8, b: '혈약', tier: '중급', n: '피의 계약', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'payCut', off: 3, n: 1 }, { k: 'st', s: 'protect', n: 4 }, { k: 'st', s: 'empower', n: 3 }, { k: 'stam', n: 25 }] },
    { id: 'v_burstheart', row: 9, b: '혈약', tier: '중급', n: '심장 파열', tgt: 'ranged', time: 'slow', cd: 7, fx: [{ k: 'hpCost', pct: 0.06 }, { k: 'dmg', n: 32 }, { k: 'cutx', brk: 70 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'v_witherall', row: 9, b: '혈약', tier: '중급', n: '시드는 저주', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'weak', n: 2 }, { k: 'perDmg', of: 'weak', per: 3 }] },
    { id: 'v_last', row: 10, b: '혈약', tier: '중급', n: '마지막 피', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'hpCost', pct: 0.08 }, { k: 'dmg', n: 31 }, { k: 'brk', n: 64 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'v_pact', row: 10, b: '혈약', tier: '중급', n: '혈약의 저주', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'hpCost', pct: 0.07 }, { k: 'dmg', n: 9 }, { k: 'bloodDmg', per: 0.5 }, { k: 'st', s: 'weak', n: 3 }, { k: 'st', s: 'vuln', n: 1 }] },
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
    haste: {}, // 갈래 규칙 없음 (10월 3일 3차 결정: 가독성. 예전 규칙: 독사 독을 걸면 · 격발 정예 이상을 무너뜨리면 · 그림자 흘려 내면 그 갈래 대기 −1). 쿨타임을 당기는 일은 🔄 스킬(fx 'hasten')만 한다
    // 갈래 성격 (10월 3일 기준, 기획서 12.4절): 강한 상황과 약한 상황. tools/sitqa.js가 50상황으로 맞는지 잰다
    profile: { 독사: { strong: ['무리', '장기전'], weak: ['후열'] }, 격발: { strong: ['거구', '강타'], weak: ['무리'] }, 그림자: { strong: ['후열'], weak: ['무리', '거구'] }, 직업: { strong: [], weak: ['지원'] } },
    starters: ['a_vital', 'a_slip'], pts: 1,
  },
  warden: {
    branches: ['성벽', '파쇄', '전열 장악'],
    bd: { 성벽: '막으며 보호막을 쌓고, 쌓인 보호막을 태워 친다. 큰 적에 강하고, 치유·소환하는 적에게 약하다', 파쇄: '한 적의 붕괴 게이지를 빨리 채우고, 무너진 적을 느린 강타로 크게 친다. 큰 적에 강하고, 무리에 약하다', '전열 장악': '전열 전체를 치고 여러 적을 함께 무너뜨린다. 방패병을 깨고 후열을 끌어낸다. 무리에 강하고, 큰 적에 약하다' },
    haste: {},
    // 갈래 성격 (10월 3일 만든 사람 결정): 직업 약점은 후열(근접에 느린 직업이라 방패 뒤의 사수 · 치유사에 늦게 닿는다)
    profile: { 성벽: { strong: ['거구'], weak: ['지원'] }, 파쇄: { strong: ['거구'], weak: ['무리'] }, '전열 장악': { strong: ['무리'], weak: ['거구'] }, 직업: { strong: [], weak: ['후열'] } }, // 10월 4일 만든 사람 결정: 성벽 강함 장기전 · 폭발 → 거구 (폭발은 세 갈래 모두 90점대라 위가 막혔고, 장기전은 방패병 상황이라 전열 장악이 가장 높았다). 파쇄 강함 강타 · 거구 → 거구 (끊기를 키운 열 가지 안에서도 강타 범주가 움직이지 않았다)
    starters: ['w_bash', 'w_brace'], pts: 1,
  },
  hunter: {
    branches: ['저격', '연사', '기동'],
    bd: { 저격: '한 적에게 추적과 취약을 쌓고, 겹을 터뜨리는 큰 한 발로 끝낸다. 큰 적에 강하고, 무리에 약하다', 연사: '표적을 바꿀 때마다 빠른 한 발을 쏘고, 여러 번 쏘거나 화살비와 출혈로 여럿을 깎는다. 무리에 강하고, 큰 적에 약하다', 기동: '먼저 움직이고, 몸을 빼 피하고, 둔화로 모으는 적을 늦춘다. 강타에 강하고, 상처와 무리에 약하다' },
    haste: {},
    // 갈래 성격 (10월 5일 만든 사람 결정): 직업 약점은 장기전(몸이 약하고 회복이 적다). 기동은 상처 · 무리를 섞는다(피하기는 맞는 것만, 한 번에 하나만 막는다)
    profile: { 저격: { strong: ['거구'], weak: ['무리'] }, 연사: { strong: ['무리'], weak: ['거구'] }, 기동: { strong: ['강타'], weak: ['상처', '무리'] }, 직업: { strong: [], weak: ['장기전'] } },
    starters: ['h_aim', 'h_step'], pts: 1,
  },
  butcher: {
    branches: ['도륙', '광기', '학살'],
    bd: { 도륙: '한 적에게 출혈을 깊게 내고, 때가 오면 그 피를 먹어 버틴다. 거는 칸과 먹는 칸을 섞어야 돈다. 긴 싸움에 강하고, 무리에 약하다', 광기: '막지 않고 받아낸 만큼 되갚고, 내 피를 대가로 세게 친다. 강타에 강하고, 치유·소환하는 적에게 약하다', 학살: '쓰러뜨릴 때마다 다음 칼이 빨라지고, 쓰러진 적의 피가 곁의 적에게 튄다. 무리에 강하고, 큰 적 하나에 약하다' },
    haste: {},
    profile: { 도륙: { strong: ['장기전'], weak: ['무리'] }, 광기: { strong: ['강타'], weak: ['지원'] }, 학살: { strong: ['무리'], weak: ['거구'] }, 직업: { strong: [], weak: ['후열'] } },
    starters: ['b_hook', 'b_lap'], pts: 1,
  },
  /* 원소술사 (10월 7일). 맞물림: 불꽃 ↔ 서리는 무리, 서리 ↔ 공명은 지원, 공명 ↔ 불꽃은 거구. 직업 약점은 강타(서리 무게가 큰 공격을 줄이지 않고 몸이 가장 약하다) */
  elementalist: {
    branches: ['불꽃', '서리', '공명'],
    bd: { 불꽃: '한 적에게 화상을 쌓고, 연타로 꺼내 쓰고, 긴 쿨타임의 큰 불로 끝낸다. 큰 적에 강하고, 무리에 약하다', 서리: '둔화로 적의 평소 공격을 무디게 묶고, 필요할 때 깨뜨린다. 무리와 긴 싸움에 강하고, 치유·소환하는 적에게 약하다', 공명: '없는 원소를 골라 걸어 열충격을 자주 일으키고, 그 충격을 번지게 한다. 치유·소환하는 적과 섞인 무리에 강하고, 큰 적에 약하다' },
    haste: {},
    profile: { 불꽃: { strong: ['거구'], weak: ['무리'] }, 서리: { strong: ['무리', '장기전'], weak: ['지원'] }, 공명: { strong: ['지원', '혼합'], weak: ['거구'] }, 직업: { strong: [], weak: ['강타'] } },
    starters: ['e_ember', 'e_touch'], pts: 1,
  },
  spellblade: {
    branches: ['피칼날', '불칼', '주문갑'],
    bd: { 피칼날: '베어서 출혈을 걸고, 쓰러뜨리면 다음 베기가 바로 찬다. 무리에 강하고, 뒤에 선 적에게 약하다', 불칼: '주문으로 화상을 걸고, 화상 걸린 적을 베어 거둔다. 영창하는 적에 강하고, 무리에 약하다', 주문갑: '베기와 주문을 번갈아 쓰며 막을 두르고, 이어진 박자로 자세를 무너뜨린다. 강타에 강하고, 치유 · 소환하는 적에게 약하다' },
    haste: {},
    // 갈래 성격 (10월 7일 설계, docs/직업/마검사.md D-1): 직업 약점은 거구(큰 적 배수 칸이 없고 보호막 상한 15%)
    profile: { 피칼날: { strong: ['무리'], weak: ['후열'] }, 불칼: { strong: ['영창'], weak: ['무리'] }, 주문갑: { strong: ['강타'], weak: ['지원'] }, 직업: { strong: [], weak: ['거구'] } },
    starters: ['sb_edge', 'sb_aegis'], pts: 1,
  },
  monk: {
    branches: ['철권', '부동', '혈도'],
    bd: {
      철권: '빠른 연타로 기를 쌓고, 모은 기를 한 주먹에 몰아친다. 큰 적에 강하고, 무리에 약하다',
      부동: '막고 되받아치며, 되받은 만큼 되갚는다. 무리에 강하고, 뒤에서 쏘는 적에게 약하다',
      혈도: '급소를 눌러 늦추고 힘을 빼며, 늦춘 적에게서 기를 빼앗는다. 강타에 강하고, 큰 적에 약하다',
    },
    haste: {},
    // 갈래 성격 (10월 7일 50상황): 직업 약점은 지원(때리지 않는 적은 되받을 게 없다). 초안의 영창은 직업 평균보다 높게 나와 설계 F-7절의 기준대로 바꿨다
    profile: { 철권: { strong: ['거구'], weak: ['무리'] }, 부동: { strong: ['무리'], weak: ['후열'] }, 혈도: { strong: ['강타'], weak: ['거구'] }, 직업: { strong: [], weak: ['지원'] } },
    starters: ['m_palm', 'm_brace'], pts: 1,
  },
  confessor: {
    branches: ['속죄', '전가', '고행'],
    bd: { 속죄: '내 해로운 상태를 지워 보호를 얻고, 회복 · 스태미나 · 쿨타임을 덤으로 받는다. 상처를 안고 시작하는 싸움에 강하고, 뒤에서 영창하는 적에게 약하다', 전가: '내 해로운 상태를 적에게 옮기고 강화를 벗긴다. 모든 칸이 후열에 닿는다. 치유 · 소환 · 저주하는 적에게 강하고, 큰 적에게 약하다', 고행: '스스로 짐을 지고 짐만큼 치거나, 짐을 한 번에 바쳐 터뜨린다. 큰 적에게 강하고, 긴 싸움에 약하다' },
    haste: {},
    profile: { 속죄: { strong: ['상처'], weak: ['영창'] }, 전가: { strong: ['지원'], weak: ['거구'] }, 고행: { strong: ['거구'], weak: ['장기전'] }, 직업: { strong: [], weak: ['무리'] } },
    starters: ['c_mace', 'c_confess'], pts: 1,
  },
  /* 숨겨진 직업 3 (10월 7일). 직업 약점은 상처(생명력이 지갑이라 다친 채 시작하면 낼 피가 없다) */
  bloodmage: {
    branches: ['역병', '포식', '혈약'],
    bd: { 역병: '중독을 여럿에게 넓게 걸고, 한 적에 쌓인 독을 무리로 옮긴다. 무리에 강하고, 큰 적 하나에 약하다', 포식: '한 적에게 독을 깊이 심고, 그 독을 먹어 생명력과 힘으로 바꾼다. 긴 싸움에 강하고, 무리에 약하다', 혈약: '생명력을 바쳐 큰 한 발로 무너뜨리고, 낸 피로 저주를 건다. 큰 적에 강하고, 긴 싸움에 약하다' },
    haste: {},
    profile: { 역병: { strong: ['무리'], weak: ['거구'] }, 포식: { strong: ['장기전'], weak: ['무리'] }, 혈약: { strong: ['거구'], weak: ['장기전'] }, 직업: { strong: [], weak: ['강타'] } }, // 직업 약점: 설계는 상처였으나 50상황에서 상처는 평균 위, 강타가 −21~−29라 설계 C6 규칙대로 강타로 바꿨다 (10월 7일)
    starters: ['v_taint', 'v_drink'], pts: 1,
  },
};
/* 갈래 크기 (10월 3일 만든 사람 결정): 사다리 10줄(하급 6 · 중급 4), 줄마다 두 칸 = 갈래 20칸, 직업 60칸.
   포인트 설계: 포인트는 레벨마다 1(시작 1 → Lv10에 10). 한 갈래를 줄마다 하나씩 내려가면 Lv6에 하급 끝, Lv10에 중급 끝. 1챕터(Lv5)는 하급만, 2챕터(Lv10)에 중급.
   챕터 돌파 포인트(+2)는 0.6a.2에서 주지 않는다: Lv10까지 10점이 트리 크기의 기준이다(기획서 12.2절) */
const TREE_GATE = { 시작: 0, 하급: 0, 중급: 0 }; // 사다리에서는 깊이가 등급 조건을 대신한다(쓰지 않음)
/* 챕터로 여는 등급: 1~2챕터는 하급·중급만으로 싸운다. 상급·궁극은 3챕터를 만들 때 다시 설계해 더한다 */
const TREE_CH = { 시작: 1, 하급: 1, 중급: 1, 상급: 3, 궁극: 5 }; // 상급·궁극 칸은 지웠지만(3챕터부터 다시 짠다) 여는 챕터는 남겨 둔다. 이 표에 없는 등급은 열리지 않는다(index.html treeWhy)
const EQUIP_SLOTS2 = 4;
