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
    { id: 'h_skysplit', row: 10, b: '연사', tier: '중급', n: '하늘 가르기', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }] },
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
};
/* 갈래 크기 (10월 3일 만든 사람 결정): 사다리 10줄(하급 6 · 중급 4), 줄마다 두 칸 = 갈래 20칸, 직업 60칸.
   포인트 설계: 포인트는 레벨마다 1(시작 1 → Lv10에 10). 한 갈래를 줄마다 하나씩 내려가면 Lv6에 하급 끝, Lv10에 중급 끝. 1챕터(Lv5)는 하급만, 2챕터(Lv10)에 중급.
   챕터 돌파 포인트(+2)는 0.6a.2에서 주지 않는다: Lv10까지 10점이 트리 크기의 기준이다(기획서 12.2절) */
const TREE_GATE = { 시작: 0, 하급: 0, 중급: 0 }; // 사다리에서는 깊이가 등급 조건을 대신한다(쓰지 않음)
/* 챕터로 여는 등급: 1~2챕터는 하급·중급만으로 싸운다. 상급·궁극은 3챕터를 만들 때 다시 설계해 더한다 */
const TREE_CH = { 시작: 1, 하급: 1, 중급: 1, 상급: 3, 궁극: 5 }; // 상급·궁극 칸은 지웠지만(3챕터부터 다시 짠다) 여는 챕터는 남겨 둔다. 이 표에 없는 등급은 열리지 않는다(index.html treeWhy)
const EQUIP_SLOTS2 = 4;
