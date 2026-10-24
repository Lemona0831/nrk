/* 0.6a.2 개편: 직업 스킬 트리 (docs/기록/0.6a.2-개편-기획.md 4·7절, docs/기록/0.6a.2-암살자-스킬.md)
   index.html보다 먼저 읽힌다. 값만 둔다. 실행은 index.html의 runSkill2, 설명 문장과 점수는 data/skillkit.js가 같은 데이터에서 만든다.
   스킬 한 줄: id, 갈래(b), 등급(tier: 하급·중급. 상급·궁극은 3챕터부터), 이름(n), 대상(tgt: melee 근접 한 적, pick 고른 적, ranged 후열까지 한 적, front 전열 모두, all 모든 적, self 나),
   빠르기(time: fast 빠른 칸 · normal 주 행동 · slow 두 칸 다), 찌르는 횟수(hits), 쿨타임(cd: 쓰고 나서 기다리는 내 턴 수, once: 전투마다 1번), 효과(fx).
   10월 3일 만든 사람 결정: 충전(스킬마다 다른 조건) 대신 쿨타임 하나로 통일한다. 갈래마다 대기를 줄이던 규칙(TREE2.haste)은 읽기 어려워 없앴다(3차 결정: 모든 직업이 쿨타임만 쓴다). */
const SKILLS2 = {
  assassin: [
    // 시작 스킬: 트리 밖. 늘 끼워져 있고 장착 칸을 차지하지 않는다. 어느 갈래에도 치우치지 않는 공격 하나(주 행동), 방어 하나(빠른 행동) (10월 3일 만든 사람 결정: 독 없음)
    { id: 'a_vital', b: '시작', tier: '시작', start: 1, n: '급소 찌르기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 25 }] },
    { id: 'a_slip', b: '시작', tier: '시작', start: 1, n: '몸 빼기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'st', s: 'protect', n: 4 }, { k: 'stam', n: 44 }] },
    // 독사: 작은 독을 자주, 넓게 걸고 키운다. 무리·장기전에 강하고 후열에 약하다
    { id: 'a_fang', row: 1, b: '독사', tier: '하급', n: '독니', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 7 }] },
    { id: 'a_hack', row: 1, b: '독사', tier: '하급', n: '난도질', tgt: 'melee', time: 'fast', cd: 4, hits: 2, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 2 }] },
    { id: 'a_bladedance', row: 2, b: '독사', tier: '하급', n: '칼날 춤', tgt: 'front', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 7 }, { k: 'poison', n: 3 }] },
    { id: 'a_dart', row: 2, b: '독사', tier: '하급', n: '독 바른 투척', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 6 }] },
    { id: 'a_rot', row: 3, b: '독사', tier: '하급', n: '썩은 상처', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 5 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_sheath', row: 3, b: '독사', tier: '하급', n: '독 칼집', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'poison', n: 2 }, { k: 'stam', n: 51 }] },
    { id: 'a_numb', row: 4, b: '독사', tier: '하급', n: '둔한 독', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 5 }, { k: 'st', s: 'chill', n: 3 }] },
    { id: 'a_sap', row: 4, b: '독사', tier: '하급', n: '쇠약독', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'poison', n: 7 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'a_wedge', row: 5, b: '독사', tier: '하급', n: '독 쐐기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 6 }, { k: 'brk', n: 35 }] },
    { id: 'a_mist', row: 5, b: '독사', tier: '하급', n: '독무', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'poison', n: 4 }] }, // 10월 18일 0.8.0 5단계(원거리 초안 1-2 · 4-7): 🔄(쓰면) 뺌
    { id: 'a_seep', row: 6, b: '독사', tier: '하급', n: '독 스미기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 3 }, { k: 'exploit', per: 1 }] },
    { id: 'a_siphon', row: 6, b: '독사', tier: '하급', n: '독 흡수', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 5 }, { k: 'drain', per: 1.5 }] },
    { id: 'a_double', row: 7, b: '독사', tier: '중급', n: '맹독 증폭', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'grow', mul: 2.1 }] },
    { id: 'a_spread', row: 7, b: '독사', tier: '중급', n: '독 번지기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_condense', row: 8, b: '독사', tier: '중급', n: '독 응축', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'grow', mul: 1.6, add: 5 }] },
    { id: 'a_rain', row: 8, b: '독사', tier: '중급', n: '독 비', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'poison', n: 6 }] },
    { id: 'a_venomstrike', row: 9, b: '독사', tier: '중급', n: '맹독 일격', tgt: 'melee', time: 'slow', cd: 5, fx: [{ k: 'dmg', n: 5 }, { k: 'poison', n: 8 }] },
    { id: 'a_rotbreath', row: 9, b: '독사', tier: '중급', n: '썩은 숨', tgt: 'front', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'a_cycle', row: 10, b: '독사', tier: '중급', n: '독의 순환', tgt: 'all', time: 'slow', cd: 5, fx: [{ k: 'grow', mul: 1.8 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'a_feast', row: 10, b: '독사', tier: '중급', n: '독 흡혈', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 5 }, { k: 'drain', per: 2.5 }] },
    // 상급 (3챕터, 11~13줄 · 10월 8일): 갈래 정체성을 마무리한다. 왼쪽 기둥은 한 적에 깊게(독 키우기 · 약점), 오른쪽 기둥은 후열 · 지속 · 여럿
    { id: 'a_festerwound', row: 11, b: '독사', tier: '상급', n: '곪은 상처', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 6 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_web', row: 11, b: '독사', tier: '상급', n: '독 그물', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 2 }, { k: 'poison', n: 4 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_wither', row: 12, b: '독사', tier: '상급', n: '시드는 독', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 7 }, { k: 'st', s: 'weak', n: 2 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_breath', row: 12, b: '독사', tier: '상급', n: '독 호흡', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'poison', n: 4 }, { k: 'drain', per: 1.5 }, { k: 'stam', n: 40 }] },
    { id: 'a_essence', row: 13, b: '독사', tier: '상급', n: '맹독의 정수', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'exploit', per: 2 }, { k: 'poison', n: 5 }, { k: 'grow', mul: 1.4 }] },
    { id: 'a_plaguecloud', row: 13, b: '독사', tier: '상급', n: '맹독 안개', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'poison', n: 6 }, { k: 'st', s: 'weak', n: 2 }] },
    // 격발: 독을 심고 터뜨려 큰 적을 무너뜨린다. 거구·강타에 강하고 무리에 약하다
    { id: 'a_plant', row: 1, b: '격발', tier: '하급', n: '독 심기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'poison', n: 7 }] },
    { id: 'a_burst', row: 1, b: '격발', tier: '하급', n: '독 격발', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'burst', pre: 2, mul: 2.5, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_pop', row: 2, b: '격발', tier: '하급', n: '독침 파열', tgt: 'melee', time: 'fast', cd: 9, fx: [{ k: 'burst', pre: 4, top: 2, mul: 2.5, brkPer: 3 }] },
    { id: 'a_finish', row: 2, b: '격발', tier: '하급', n: '마무리 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_brkneedle', row: 3, b: '격발', tier: '하급', n: '붕괴 독침', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'poison', n: 2 }, { k: 'brk', n: 71 }] },
    { id: 'a_pouch', row: 3, b: '격발', tier: '하급', n: '독 바르기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 6 }] },
    { id: 'a_deepplant', row: 4, b: '격발', tier: '하급', n: '심층 주입', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'poison', n: 8 }] },
    { id: 'a_burststab', row: 4, b: '격발', tier: '하급', n: '터뜨리는 일격', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'burst', top: 3, mul: 3, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_rend', row: 5, b: '격발', tier: '하급', n: '갈라 터뜨리기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 2 }, { k: 'exploit', per: 6 }] },
    { id: 'a_crumble', row: 5, b: '격발', tier: '하급', n: '부식독', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'brkPer', per: 25 }] },
    { id: 'a_cutoff', row: 6, b: '격발', tier: '하급', n: '끊어 내기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 27 }, { k: 'cutx', brk: 91 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_expose', row: 6, b: '격발', tier: '하급', n: '약점 드러내기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 'a_boil', row: 7, b: '격발', tier: '중급', n: '끓는 피', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'burst', pre: 2, mul: 2, keep: 0.5, brkPer: 4 }] },
    { id: 'a_chain', row: 7, b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', cd: 7, killRecharge: 1, fx: [{ k: 'burst', pre: 3, mul: 2, brkPer: 6 }] },
    { id: 'a_gash', row: 8, b: '격발', tier: '중급', n: '상처 벌리기', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'st', s: 'vuln', n: 5 }, { k: 'burst', pre: 3, mul: 2, brkPer: 3 }] },
    { id: 'a_vitalburst', row: 8, b: '격발', tier: '중급', n: '급소 터뜨리기', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 11 }, { k: 'burst', pre: 2, mul: 2, brkPer: 3 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_deepburst', row: 9, b: '격발', tier: '중급', n: '깊은 격발', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'burst', pre: 2, mul: 3.5, brkPer: 6 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_hunt', row: 9, b: '격발', tier: '중급', n: '독 사냥', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 9 }, { k: 'exploit', per: 3.5 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_brkburst', row: 10, b: '격발', tier: '중급', n: '붕괴 격발', tgt: 'melee', time: 'normal', cd: 10, fx: [{ k: 'burst', pre: 5, mul: 1.5, brkPer: 8 }] },
    { id: 'a_reap', row: 10, b: '격발', tier: '중급', n: '거두기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 17 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_fuse', row: 11, b: '격발', tier: '상급', n: '붕괴 뇌관', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'poison', n: 3 }, { k: 'brk', n: 71 }, { k: 'cutx', brk: 70 }] },
    { id: 'a_verdict', row: 11, b: '격발', tier: '상급', n: '집행의 독', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 5 }, { k: 'exploit', per: 2.5 }, { k: 'brokenx', mul: 1.6 }, { k: 'bigx', mul: 3 }] },
    { id: 'a_wick', row: 12, b: '격발', tier: '상급', n: '연쇄 도화선', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'burst', pre: 3, mul: 2, brkPer: 6 }, { k: 'bigx', mul: 2 }] },
    { id: 'a_gallows', row: 12, b: '격발', tier: '상급', n: '독 처형', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'poison', n: 4 }, { k: 'dmg', n: 4 }, { k: 'lowx', hp: 0.35, mul: 2.5 }] },
    { id: 'a_cataclysm', row: 13, b: '격발', tier: '상급', n: '종말의 격발', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'burst', pre: 2, mul: 2.6, brkPer: 8 }, { k: 'bigx', mul: 3 }] },
    { id: 'a_finale', row: 13, b: '격발', tier: '상급', n: '숨통 터뜨리기', tgt: 'melee', time: 'normal', cd: 10, fx: [{ k: 'burst', pre: 3, mul: 1.35, brkPer: 4 }, { k: 'execute', hp: 0.3, mul: 3.2 }, { k: 'bigx', mul: 3 }] },
    // 그림자: 공격을 흘려 낸 틈을 찌르고 후열에 닿는다. 후열에 강하고 무리·거구에 약하다
    { id: 'a_shadow', row: 1, b: '그림자', tier: '하급', n: '그림자 찌르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 28 }] },
    { id: 'a_deflect', row: 1, b: '그림자', tier: '하급', n: '흘려 베기', tgt: 'pick', time: 'normal', cd: 9, fx: [{ k: 'parry', red: 0.7 }, { k: 'dmg', n: 12 }, { k: 'onParry', dmg: 14 }] },
    { id: 'a_trip', row: 2, b: '그림자', tier: '하급', n: '발 걸기', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 41 }] },
    { id: 'a_step', row: 2, b: '그림자', tier: '하급', n: '그림자 밟기', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 27 }] },
    { id: 'a_check', row: 3, b: '그림자', tier: '하급', n: '견제 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 23 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'a_backstep', row: 3, b: '그림자', tier: '하급', n: '흘리며 물러서기', tgt: 'pick', time: 'fast', cd: 8, fx: [{ k: 'parry', red: 0.5 }, { k: 'onParry', brk: 138 }] },
    { id: 'a_ambush', row: 4, b: '그림자', tier: '하급', n: '후열 기습', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 23 }, { k: 'brk', n: 29 }] },
    { id: 'a_smoke', row: 4, b: '그림자', tier: '하급', n: '연막', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'parryBuff', red: 0.3, stam: 45, times: 2 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'a_after', row: 5, b: '그림자', tier: '하급', n: '잔상', tgt: 'pick', time: 'fast', cd: 9, fx: [{ k: 'parry', red: 0.7 }, { k: 'onParry', dmg: 20, brk: 9 }] },
    { id: 'a_aim', row: 5, b: '그림자', tier: '하급', n: '칼끝 겨누기', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'parryBuff', red: 0, dmg: 19 }] },
    { id: 'a_mark', row: 6, b: '그림자', tier: '하급', n: '그림자 표식', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'vuln', n: 4 }] },
    { id: 'a_shade', row: 6, b: '그림자', tier: '하급', n: '그늘 숨기', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'st', s: 'protect', n: 2 }, { k: 'parryBuff', red: 0, dmg: 14 }] }, // 10월 18일 0.8.0 5단계(원거리 초안 4-2 · 8절 결정 13): 🔄(흘려 내면) 뺌(대응 +1과 두 겹)
    { id: 'a_gap', row: 7, b: '그림자', tier: '중급', n: '빈틈 노리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'brk', n: 32 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'a_venomguard', row: 7, b: '그림자', tier: '중급', n: '독 묻은 칼막이', tgt: 'pick', time: 'normal', cd: 7, fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', poison: 7 }] },
    { id: 'a_pierce', row: 8, b: '그림자', tier: '중급', n: '급소 꿰기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 20 }, { k: 'brokenx', mul: 2 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'a_strangle', row: 8, b: '그림자', tier: '중급', n: '목 조르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 29 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_counter', row: 9, b: '그림자', tier: '중급', n: '되받아치기', tgt: 'pick', time: 'normal', cd: 6, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 23, brk: 10 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'a_rush', row: 9, b: '그림자', tier: '중급', n: '그림자 연타', tgt: 'melee', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 3 }] },
    { id: 'a_darkstrike', row: 10, b: '그림자', tier: '중급', n: '어둠 일격', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 29 }, { k: 'brk', n: 48 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'a_parrydance', row: 10, b: '그림자', tier: '중급', n: '흘림의 춤', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'parryBuff', red: 0.2, stam: 30, times: 2, dmg: 7 }, { k: 'hasten', n: 2, on: 'parry' }] },
    { id: 'a_chase', row: 11, b: '그림자', tier: '상급', n: '그림자 추격', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'brk', n: 32 }, { k: 'st', s: 'vuln', n: 2 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'a_venomriposte', row: 11, b: '그림자', tier: '상급', n: '독니 되치기', tgt: 'pick', time: 'normal', cd: 7, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 14, poison: 4, brk: 5 }] },
    { id: 'a_breach', row: 12, b: '그림자', tier: '상급', n: '틈새 베기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 23 }, { k: 'brokenx', mul: 2.2 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'a_reprisal', row: 12, b: '그림자', tier: '상급', n: '그림자 역습', tgt: 'pick', time: 'normal', cd: 6, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 24, brk: 12 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'a_umbra', row: 13, b: '그림자', tier: '상급', n: '죽음의 그림자', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 26 }, { k: 'brk', n: 34 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'a_daggerrain', row: 13, b: '그림자', tier: '상급', n: '단검 소나기', tgt: 'ranged', time: 'normal', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 14 }] },
    /* ===== 0.8.0 M5-3 암살자 재설계(10월 20일 만든 사람 설계지 4판, nrk-private/제안/암살자-설계지-2026-10-20.md) =====
       직업 규칙은 그대로(중독 · 터뜨리기 · 흘리기 70% · 흘리기 준비). 새 상태는 승부수에만(숨음 · 분신). 공통 판정: 터뜨리기는 중독을 0으로(keep 없음), 흘려 베기의 반격은 기본 공격,
       추가로 생긴 공격은 추가 공격을 부르지 않음, 터뜨리기 배수는 가장 큰 하나만. 칸 설명은 한 줄(skBodyMk), 배수는 무엇의 몇 배인지. 숫자는 가설 — 값 띠 · 측정으로. 새 효과 키는 data/skillkit.js AS_BOUND · js/10 암살자 절 */
    { id: 'a_dokkal', row: 1, b: '독사', tier: '하급', n: '독 바른 칼', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 20 }, { k: 'poison', n: 4 }] },
    { id: 'a_dokan', row: 1, b: '독사', tier: '하급', n: '독안개', tgt: 'front', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 6 }] },
    { id: 'a_dokchim', row: 1, b: '독사', tier: '하급', n: '독침', tgt: 'self', time: 'normal', cd: 3, fx: [{ k: 'asNextPsn', n: 3, poison: 2, txt: '다음 기본 공격 3번에 중독 2' }] },
    { id: 'a_godok', row: 4, b: '독사', tier: '하급', n: '고독', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'grow', mul: 2 }] },
    { id: 'a_beonji', row: 4, b: '독사', tier: '하급', n: '독 번지기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 20 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_maengdok', row: 8, b: '독사', tier: '중급', n: '맹독', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'poison', n: 14 }, { k: 'asVirulent', txt: '라운드 끝 중독 10 이상이면 줄지 않고 +1' }] },
    { id: 'a_yeokbyeong', row: 8, b: '독사', tier: '중급', n: '역병', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'asPlague', mul: 1.6, txt: '이번 전투: 쓰러진 적 중독의 1.6배가 다른 적에게 옮겨붙음' }] },
    { id: 'a_gyeokpyo', row: 1, b: '격발', tier: '하급', n: '격발 표창', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 30 }, { k: 'burst', mul: 1, brkPer: 3 }] },
    { id: 'a_gyeokjjil', row: 1, b: '격발', tier: '하급', n: '격발 찌르기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 21 }, { k: 'burst', mul: 1.5, brkPer: 3 }] },
    { id: 'a_bangul', row: 1, b: '격발', tier: '하급', n: '독 한 방울', tgt: 'ranged', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 3 }] },
    { id: 'a_dokpyo', row: 4, b: '격발', tier: '하급', n: '독 표창', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 5 }, { k: 'asTwin', txt: '후열 하나에게 더' }] },
    { id: 'a_dokssae', row: 4, b: '격발', tier: '하급', n: '독 쐐기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'poison', n: 8 }] },
    { id: 'a_yeonswae', row: 8, b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 47 }, { k: 'burst', mul: 1, brkPer: 4 }, { k: 'asChain', txt: '쓰러뜨리면 다시 쓸 수 있음' }] },
    { id: 'a_gyeolsan', row: 8, b: '격발', tier: '중급', n: '독 결산', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 47 }, { k: 'burst', mul: 1, big: 2, brkPer: 4 }] },
    { id: 'a_heulbe', row: 1, b: '그림자', tier: '하급', n: '흘려 베기', tgt: 'pick', time: 'normal', cd: 4, fx: [{ k: 'parry', red: 0.8 }, { k: 'asCounter', mul: 2.4, txt: '흘려 내면 기본 공격 ×2.4로 반격' }] },
    { id: 'a_balbgi', row: 1, b: '그림자', tier: '하급', n: '그림자 밟기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 39 }] },
    { id: 'a_gyeonu', row: 1, b: '그림자', tier: '하급', n: '칼끝 겨누기', tgt: 'self', time: 'normal', cd: 3, fx: [{ k: 'parryBuff', red: 0.2, dmg: 22 }] },
    { id: 'a_heulkal', row: 4, b: '그림자', tier: '하급', n: '흘린 칼', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'asFlowBlade', mul: 1.7, txt: '이번 전투: 흘려 낸 다음 차례 첫 기본 공격 ×1.7' }] },
    { id: 'a_hugyeol', row: 4, b: '그림자', tier: '하급', n: '후열 기습', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 30 }, { k: 'asBackx', mul: 1.5 }] },
    { id: 'a_kalchum', row: 8, b: '그림자', tier: '중급', n: '그림자 칼춤', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'asDance', mul: 1.6, txt: '이번 전투: 흘려 낼 때마다 기본 공격 ×1.6 한 번 더' }] },
    { id: 'a_cheohyeong', row: 8, b: '그림자', tier: '중급', n: '그림자 처형', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 53 }, { k: 'asBackx', mul: 2, low: 0.35 }] },
    /* 경계 칸(입구 · 둘째 · 3고리 둘)은 [Claude 초안]: 공격 2 · 강화/방어 2 */
    { id: 'a_pieo', row: 4, b: '독화', tier: '하급', n: '피어나는 독', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'burst', pre: 4, mul: 1, brkPer: 3 }] },
    { id: 'a_kkotip', row: 5, b: '독화', tier: '하급', n: '꽃잎 모으기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'asNextBurst', mul: 2.7, txt: '다음 터뜨리기 피해 2.7배' }] },
    { id: 'a_heunal', row: 8, b: '독화', tier: '중급', n: '흩날리는 꽃', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 33 }, { k: 'burst', mul: 1, brkPer: 3 }] },
    { id: 'a_jangmak', row: 8, b: '독화', tier: '중급', n: '독의 장막', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'asVeil', n: 3, poison: 5, txt: '3차례 나를 친 적에게 중독 5' }] },
    { id: 'a_geuneul', row: 4, b: '암영', tier: '하급', n: '그늘 찌르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 25 }, { k: 'exploit', per: 3 }] },
    { id: 'a_sumjuk', row: 5, b: '암영', tier: '하급', n: '숨죽인 칼', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'parryBuff', red: 0.3, times: 2, dmg: 17 }] },
    { id: 'a_kkweogi', row: 8, b: '암영', tier: '중급', n: '그림자 꿰기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 49 }, { k: 'brokenx', mul: 2 }] },
    { id: 'a_yeonmak', row: 8, b: '암영', tier: '중급', n: '연막', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'evade', n: 3 }, { k: 'st', s: 'protect', n: 18 }] },
    { id: 'a_janjjil', row: 4, b: '잔영', tier: '하급', n: '잔영 찌르기', tgt: 'melee', time: 'normal', cd: 5, hits: 2, fx: [{ k: 'dmg', n: 10 }, { k: 'poison', n: 2 }] },
    { id: 'a_geurimdok', row: 5, b: '잔영', tier: '하급', n: '독 묻힌 그림자', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'asNextPsn', n: 3, poison: 3, txt: '다음 기본 공격 3번에 중독 3' }] },
    { id: 'a_pagodeul', row: 8, b: '잔영', tier: '중급', n: '파고드는 그림자', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 54 }, { k: 'grow', mul: 1.5 }] },
    { id: 'a_heurit', row: 8, b: '잔영', tier: '중급', n: '흐릿한 몸', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'parryBuff', red: 0.2, stam: 45, times: 2, dmg: 24 }] },
    /* 경계 승부수(만든 사람 문장 · 대사 그대로) */
    { id: 'a_mandok', row: 10, b: '독화', tier: '중급', n: '만독개화', tgt: 'ranged', time: 'normal', cd: 9, line: '「피어나라. 한 송이도 남김없이 아름다울 기생화를.」', cut: 'arcane', pay: '쓰는 즉시 지금 생명력에서 최대 생명력의 15%를 잃는다(최대치는 그대로). 지금 생명력이 최대치의 15% 이하면 쓸 수 없다.', fx: [{ k: 'asBloom', mul: 2.9, txt: '모든 적의 중독을 적 하나에게 모아 터뜨린다(그 터뜨리기 피해 2.9배).' }] },
    { id: 'a_muyeong', row: 10, b: '암영', tier: '중급', n: '무영살', tgt: 'self', time: 'normal', cd: 9, line: '「보이지 않는 칼이야말로, 가장 깊이 박히는 법이렸다.」', cut: 'blade', pay: '숨은 차례에는 아무것도 못 한다. 베기 차례에는 무영살을 다시 쓸 수 없다. 벤 뒤 2차례 흘리기를 못 한다.', fx: [{ k: 'asHide', mul: 5.8, txt: '한 차례 숨었다가, 다음 차례 고른 적의 등 뒤에서 무기 피해의 5.8배로 벤다. 숨은 동안 광역을 포함한 어떤 공격의 표적도 되지 않는다(중독 같은 상태 피해는 받음).' }] },
    { id: 'a_janyeong', row: 10, b: '잔영', tier: '중급', n: '잔영난무', tgt: 'self', time: 'normal', cd: 9, line: '「그림자는 하나가 아니다. 네가 벤 것은, 처음부터 내가 아니었으니.」', cut: 'guard', pay: '그동안 받는 피해 +20%, 끝난 뒤 2차례 스태미나가 차지 않는다.', fx: [{ k: 'asZan', n: 4, mul: 1.7, txt: '4차례 동안 그림자 분신이 함께해 내가 누른 기본 공격이 두 번 들어간다(분신은 기본 공격의 1.7배, 반격 · 추가타는 두 번이 아님).' }] },
    /* 결합 칸 셋(설계지): 원 바깥, 판마다 둘, 꼬리표 조건 */
    { id: 'a_dokni', row: 7, b: '결합', tier: '중급', n: '독니', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'asFangC', n: 2, txt: '이번 전투: 중독 걸린 적을 기본 공격으로 치면 중독 +2' }] },
    { id: 'a_heuldok', row: 7, b: '결합', tier: '중급', n: '흘린 독', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'asParPsn', n: 3, txt: '이번 전투: 흘려 낼 때 그 적 중독 +3' }] },
    { id: 'a_dwikkot', row: 7, b: '결합', tier: '중급', n: '등 뒤의 꽃', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'asBackFlower', mul: 2.1, txt: '이번 전투: 후열 적에게 터뜨리기 2.1배' }] },
  ],
  warden: [
    // 시작 스킬: 트리 밖. 어느 갈래에도 치우치지 않는 공격 하나(주 행동), 방어 하나(빠른 행동). 보호막은 쓰지 않는다 (10월 3일 초안)
    { id: 'w_bash', b: '시작', tier: '시작', start: 1, n: '방패 치기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 29 }] },
    { id: 'w_brace', b: '시작', tier: '시작', start: 1, n: '굳히기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'st', s: 'protect', n: 4 }, { k: 'stam', n: 44 }] },
    // 성벽: 막으며 보호막을 쌓고, 쌓인 보호막을 소모해 공격합니다. 왼쪽 기둥은 버티기(보호막 · 가시 · 보호막 비례 피해), 오른쪽은 태우기(보호막을 모아 태워 친다). 장기전 · 폭발에 강하고 지원에 약하다
    { id: 'w_raise', row: 1, b: '성벽', tier: '하급', n: '방패 세우기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 17 }] },
    { id: 'w_shove', row: 1, b: '전열 장악', tier: '하급', n: '방패 밀치기', tgt: 'front', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'ward', n: 8 }] }, /* M5-1(10월 20일 만든 사람 설계지): 전열 장악 2고리: 전열 피해 + 보호막 */
    { id: 'w_hold', row: 2, b: '성벽', tier: '하급', n: '막고 치기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'wardDmg', per: 0.25 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_flare', row: 2, b: '성벽', tier: '하급', n: '보호막 터뜨리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'wardBurn', mul: 2.6, max: 8 }, { k: 'brk', n: 2 }, { k: 'bigx', mul: 1.5 }] }, /* M5-1 만든 사람 답: 공성추 2고리를 조금 약하게(태운 1마다 ×3 → ×2.6) */ // 10월 4일: 성벽 강함 거구
    { id: 'w_stand', row: 3, b: '성벽', tier: '하급', n: '버티기', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'wardFill', to: 0.45 }, { k: 'st', s: 'protect', n: 2 }] },
    { id: 'w_kindle', row: 3, b: '성벽', tier: '하급', n: '작열 방벽', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 16 }, { k: 'hasten', n: 1, on: 'use', when: 'ward<1' }] }, // 0.8.0 5단계(10월 17일 만든 사람 결정 4): 🔄는 보호막이 0일 때 쓴 경우만
    { id: 'w_spikes', row: 4, b: '성벽', tier: '하급', n: '가시 방패', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'thorn', times: 4, dmg: 6 }] },
    { id: 'w_blaze', row: 4, b: '성벽', tier: '하급', n: '불꽃 방패', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'wardBurn', mul: 3, max: 14 }, { k: 'st', s: 'vuln', n: 1 }] }, // 0.8.0 5단계(10월 17일 검토 1-3): 태우기 상한 9 → 14. 보호막 터뜨리기(유산 2, 최대 8)보다 볼록하게
    { id: 'w_press', row: 5, b: '성벽', tier: '하급', n: '밀어붙이기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 26 }, { k: 'wardDmg', per: 0.5 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_coat', row: 5, b: '성벽', tier: '하급', n: '방벽 돌파', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'ward', n: 11 }] },
    { id: 'w_rampart', row: 6, b: '성벽', tier: '하급', n: '철벽', tgt: 'self', time: 'normal', cd: 8, fx: [{ k: 'ward', n: 28 }, { k: 'st', s: 'protect', n: 3 }] }, /* M5-1 값 띠 */
    { id: 'w_burst', row: 6, b: '성벽', tier: '하급', n: '보호막 폭발', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'wardBurn', mul: 2.5, max: 8 }] },
    { id: 'w_crush', row: 7, b: '성벽', tier: '중급', n: '짓누르는 방패', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'wardDmg', per: 0.5 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_molten', row: 7, b: '성벽', tier: '중급', n: '쇳물 방패', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'wardBurn', mul: 3, max: 12 }, { k: 'brk', n: 19 }] },
    { id: 'w_armor', row: 8, b: '성벽', tier: '중급', n: '가시 갑주', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'thorn', times: 5, dmg: 4 }, { k: 'ward', n: 15 }] }, /* M5-1 값 띠 */
    { id: 'w_rebuild', row: 8, b: '성벽', tier: '중급', n: '다시 세우는 벽', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'wardFill', to: 0.42 }, { k: 'hasten', n: 1, on: 'use' }] }, /* M5-1 맞추기 1번: 공성추가 1챕터에서 너무 셈(88%), 50% → 42% */
    { id: 'w_beyond', row: 9, b: '성벽', tier: '중급', n: '벽 너머의 일격', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 26 }, { k: 'wardDmg', per: 0.5 }, { k: 'bigx', mul: 1.5 }] }, // 10월 4일: 성벽 강함 거구
    { id: 'w_breach', row: 9, b: '성벽', tier: '중급', n: '성벽 부수기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 4 }, { k: 'wardBurn', mul: 1.7, max: 16 }, { k: 'brk', n: 34 }] }, /* M5-1 값 띠 */
    { id: 'w_citadel', row: 10, b: '성벽', tier: '중급', n: '철옹성', tgt: 'self', time: 'slow', cd: 10, once: 1, keep: ['wardFill'], fx: [{ k: 'wardFill', to: 0.8 }, { k: 'st', s: 'protect', n: 1 }, { k: 'thorn', times: 2, dmg: 5 }] }, /* M5-1 값 띠 */
    { id: 'w_last', row: 10, b: '성벽', tier: '중급', n: '최후의 성벽', tgt: 'melee', time: 'slow', cd: 10, exc: '만든 사람 결정(10월 5일): 10줄 마무리, 전투당 0.1~0.6번만 써 모델(2번)보다 덜 쓴다. 태운 1마다 1.5 · 40% 이하 ×1.75 그대로', fx: [{ k: 'wardBurn', mul: 1.5 }, { k: 'lowx', hp: 0.4, mul: 1.75 }, { k: 'brk', n: 13 }] }, // 10월 4일: 보호막을 모두 태우는 마무리 (성벽 오른쪽 기둥의 보스전 이길 수단). 만든 사람 결정으로 쓰기를 완화하고(생명력 30% → 40% 이하) 한 방을 낮췄다(×2 · 피해 2 → ×1.75 · 피해 1.5): 보스 63%, 줄 예산 안이라 예외 표시를 뗐다
    // 상급 (3챕터, 11~13줄 · 10월 8일): 왼쪽 기둥은 버티기를 완성(얻으면서 비례로 치는 칸 · 상한 채우기 · 가시 · 큰 비례 일격), 오른쪽은 태우기를 완성(태우고 곧바로 다시 두르는 칸 · 큰 태우기 · 마무리)
    { id: 'w_bulwarkhit', row: 11, b: '성벽', tier: '상급', n: '보루 일격', tgt: 'melee', time: 'fast', cd: 5, keep: ['ward'], fx: [{ k: 'dmg', n: 6 }, { k: 'ward', n: 10 }, { k: 'wardDmg', per: 0.25 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'w_forge', row: 11, b: '성벽', tier: '상급', n: '달군 방벽', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'wardBurn', mul: 2, max: 9 }, { k: 'ward', n: 10 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'w_unyield', row: 12, b: '성벽', tier: '상급', n: '불굴의 장벽', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'wardFill', to: 0.5 }, { k: 'thorn', times: 2, dmg: 4 }] },
    { id: 'w_scald', row: 12, b: '성벽', tier: '상급', n: '용광 방벽', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'ward', n: 24 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'w_eternal', row: 13, b: '성벽', tier: '상급', n: '불멸의 성채', tgt: 'melee', time: 'normal', cd: 8, keep: ['ward', 'st'], fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 17 }, { k: 'ward', n: 9 }, { k: 'st', s: 'protect', n: 1 }, { k: 'wardDmg', per: 0.25 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'w_cinder', row: 13, b: '성벽', tier: '상급', n: '재가 되는 성벽', tgt: 'melee', time: 'slow', cd: 10, keep: ['ward'], fx: [{ k: 'wardBurn', mul: 1.5, max: 18 }, { k: 'ward', n: 5 }, { k: 'brk', n: 6 }, { k: 'lowx', hp: 0.4, mul: 1.5 }, { k: 'bigx', mul: 1.5 }] },
    // 파쇄: 한 적의 붕괴 게이지를 빨리 채우고, 무너진 적을 느린 강타로 강하게 공격합니다. 왼쪽 기둥은 무너뜨리기(큰 붕괴 · 모으는 적 끊기), 오른쪽은 부수기(붕괴한 적 · 취약한 적에게 크게). 강타 · 거구에 강하고 무리에 약하다
    { id: 's_slam', row: 1, b: '파쇄', tier: '하급', n: '내리 찍기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 30 }, { k: 'brokenx', mul: 1.3 }] }, /* M5-1(10월 20일 만든 사람 설계지): 붕괴 상태면 소량의 추가 피해 */
    { id: 's_gap', row: 1, b: '파쇄', tier: '하급', n: '틈 노리기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'brokenx', mul: 2 }] },
    { id: 's_knock', row: 2, b: '파쇄', tier: '하급', n: '자세 무너뜨리기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'brk', n: 30 }] },
    { id: 's_mark', row: 2, b: '파쇄', tier: '하급', n: '약점 짚기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 's_cut', row: 3, b: '파쇄', tier: '하급', n: '끊어 치기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 26 }, { k: 'cutx', brk: 68 }] },
    { id: 's_smash', row: 3, b: '파쇄', tier: '하급', n: '부수는 일격', tgt: 'melee', time: 'slow', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 27 }] },
    { id: 's_knee', row: 4, b: '파쇄', tier: '하급', n: '무릎 꺾기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 29 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 's_dig', row: 4, b: '파쇄', tier: '하급', n: '취약 파고들기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'vulnPer', per: 5 }] },
    { id: 's_hammer', row: 5, b: '파쇄', tier: '하급', n: '망치질', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 29 }] },
    { id: 's_wedge', row: 5, b: '파쇄', tier: '하급', n: '쐐기 박기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 28 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 's_crack', row: 6, b: '파쇄', tier: '하급', n: '균열', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 4 }, { k: 'brk', n: 25 }, { k: 'st', s: 'vuln', n: 3 }] },
    { id: 's_throw', row: 6, b: '파쇄', tier: '하급', n: '메다꽂기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'brokenx', mul: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_pillar', row: 7, b: '파쇄', tier: '중급', n: '기둥 꺾기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 36 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_maul', row: 7, b: '파쇄', tier: '중급', n: '깨뜨리는 망치', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 21 }, { k: 'brokenx', mul: 2 }] },
    { id: 's_quake', row: 8, b: '파쇄', tier: '중급', n: '흔들어 끊기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 35 }, { k: 'cutx', brk: 70 }] },
    { id: 's_open', row: 8, b: '파쇄', tier: '중급', n: '약점 벌리기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 7 }, { k: 'brk', n: 32 }, { k: 'vulnGrow', mul: 2 }] },
    { id: 's_rift', row: 9, b: '파쇄', tier: '중급', n: '지반 가르기', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 23 }, { k: 'brk', n: 38 }] },
    { id: 's_judge', row: 9, b: '파쇄', tier: '중급', n: '처단', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 11 }, { k: 'vulnPer', per: 5 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 's_fall', row: 10, b: '파쇄', tier: '중급', n: '산 무너뜨리기', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 54 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_ruin', row: 10, b: '파쇄', tier: '중급', n: '박살', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'brokenx', mul: 2.5 }, { k: 'bigx', mul: 1.5 }] },
    // 상급 (3챕터, 11~13줄 · 10월 8일): 왼쪽 기둥은 무너뜨리기(큰 붕괴 · 끊기), 오른쪽은 부수기(취약 · 붕괴한 적에게 크게). 한 적 칸만 둔다(무리에 약하다)
    { id: 's_wedgebite', row: 11, b: '파쇄', tier: '상급', n: '쐐기 파열', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 35 }, { k: 'st', s: 'vuln', n: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_unravel', row: 11, b: '파쇄', tier: '상급', n: '약점 해체', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'vulnPer', per: 5 }, { k: 'brokenx', mul: 1.5 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_stagger', row: 12, b: '파쇄', tier: '상급', n: '비틀거림', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 50 }, { k: 'cutx', brk: 70 }] },
    { id: 's_lever', row: 12, b: '파쇄', tier: '상급', n: '균열 관통', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'vuln', n: 2 }, { k: 'vulnPer', per: 5 }] },
    { id: 's_landslide', row: 13, b: '파쇄', tier: '상급', n: '산사태', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 54 }, { k: 'bigx', mul: 1.5 }] },
    { id: 's_lastblow', row: 13, b: '파쇄', tier: '상급', n: '무너진 자의 최후', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 17 }, { k: 'brokenx', mul: 2.5 }, { k: 'lowx', hp: 0.3, mul: 1.5 }, { k: 'bigx', mul: 1.5 }] },
    // 전열 장악: 전열 전체를 치고 여러 적을 함께 무너뜨린다. 왼쪽 기둥은 휩쓸기(전열 모두를 치는 피해), 오른쪽은 깨기(방패병 깨기 · 후열 끌어내기 · 여럿의 붕괴). 무리에 강하고 거구에 약하다
    { id: 'f_sweep', row: 1, b: '전열 장악', tier: '하급', n: '개기식', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 9 }, { k: 'ward', n: 5 }] }, /* M5-1(10월 20일 만든 사람 설계지): 얕지만 전열 전체 */ /* M5-1 맞추기 1번: 1챕터 보스는 버티는 쪽이 이긴다(막기가 주 대응) */
    { id: 'f_break', row: 1, b: '전열 장악', tier: '하급', n: '방패 깨기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 31 }, { k: 'shieldx', mul: 2 }] },
    { id: 'f_charge', row: 2, b: '전열 장악', tier: '하급', n: '방패 돌진', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 16 }] },
    { id: 'f_snare', row: 2, b: '전열 장악', tier: '하급', n: '사슬 걸기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'brk', n: 22 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'f_cleave', row: 3, b: '전열 장악', tier: '하급', n: '넓게 베기', tgt: 'front', time: 'normal', cd: 5, killRecharge: 1, fx: [{ k: 'dmg', n: 10 }] }, // 0.8.0 5단계(결정 4): 🔄 → 이 스킬로 적을 쓰러뜨리면 유산 +1
    { id: 'f_chain', row: 3, b: '전열 장악', tier: '하급', n: '사슬 휘두르기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 6 }, { k: 'brk', n: 17 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'f_stomp', row: 4, b: '전열 장악', tier: '하급', n: '발 구르기', tgt: 'front', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 2 }, { k: 'brk', n: 14 }, { k: 'st', s: 'chill', n: 2 }] }, /* M5-1(10월 20일 만든 사람 설계지): 리듬 칸(비용 1)은 주 행동 */
    { id: 'f_wall', row: 4, b: '전열 장악', tier: '하급', n: '방패 분쇄', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 31 }, { k: 'shieldx', mul: 2 }] },
    { id: 'f_spin', row: 5, b: '전열 장악', tier: '하급', n: '회전 베기', tgt: 'front', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'brk', n: 19 }] },
    { id: 'f_drag', row: 5, b: '전열 장악', tier: '하급', n: '끌어와 치기', tgt: 'ranged', time: 'slow', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 20 }, { k: 'pull' }] }, // 10월 4일: 쿨타임 8 → 6 (전열 장악 오른쪽 기둥의 보스전 이길 수단) /* M5-1 값 띠 */
    { id: 'f_trample', row: 6, b: '전열 장악', tier: '하급', n: '짓밟기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'chillx', mul: 2 }] },
    { id: 'f_topple', row: 6, b: '전열 장악', tier: '하급', n: '연쇄 붕괴', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 17 }, { k: 'brokenx', mul: 2 }] },
    { id: 'f_drive', row: 7, b: '전열 장악', tier: '중급', n: '몰아치기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 16 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'f_rampart', row: 7, b: '전열 장악', tier: '중급', n: '방패벽 부수기', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 18 }, { k: 'shieldx', mul: 2 }] }, /* M5-1 값 띠 */
    { id: 'f_push', row: 8, b: '전열 장악', tier: '중급', n: '전열 밀어내기', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 17 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'f_scatter', row: 8, b: '전열 장악', tier: '중급', n: '전열 분산', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'f_split', row: 9, b: '전열 장악', tier: '중급', n: '대지 가르기', tgt: 'front', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'brokenx', mul: 2 }] },
    { id: 'f_net', row: 9, b: '전열 장악', tier: '중급', n: '사슬 조이기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 31 }, { k: 'chillx', mul: 2 }] },
    { id: 'f_storm', row: 10, b: '전열 장악', tier: '중급', n: '폭풍 같은 방패', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 20 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'f_collapse', row: 10, b: '전열 장악', tier: '중급', n: '전열 붕괴', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 26 }, { k: 'shieldx', mul: 2 }] },
    // 상급 (3챕터, 11~13줄 · 10월 8일): 왼쪽 기둥은 휩쓸기(전열 모두의 피해 · 붕괴), 오른쪽은 깨기(후열 끌어내기 · 한 적 묶기 · 방패 깨기). 큰 적 배수는 두지 않는다(거구에 약하다)
    { id: 'f_sweepline', row: 11, b: '전열 장악', tier: '상급', n: '전열 쓸기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 17 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'f_hook', row: 11, b: '전열 장악', tier: '상급', n: '갈고리 사슬', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 32 }, { k: 'st', s: 'chill', n: 2 }, { k: 'pull' }] }, /* M5-1 값 띠 */
    { id: 'f_onrush', row: 12, b: '전열 장악', tier: '상급', n: '쇄도', tgt: 'front', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'brk', n: 26 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'f_noose', row: 12, b: '전열 장악', tier: '상급', n: '올가미', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 8 }, { k: 'brk', n: 34 }, { k: 'st', s: 'chill', n: 3 }, { k: 'shieldx', mul: 2 }] },
    { id: 'f_rout', row: 13, b: '전열 장악', tier: '상급', n: '전선 와해', tgt: 'front', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 25 }, { k: 'brokenx', mul: 1.5 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'f_siege', row: 13, b: '전열 장악', tier: '상급', n: '포위 분쇄', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 26 }, { k: 'chillx', mul: 1.7 }, { k: 'shieldx', mul: 2 }] },
    /* ===== 0.8.0 M5-1 파수꾼 재설계(10월 20일 만든 사람 설계지 + 07:40 보완, nrk-private/제안/파수꾼-설계지-2026-10-20.md) =====
       보완: 태세를 켜는 차례에 작은 효과(수비 보호막 · 공격 가벼운 타격), 신성한 기도는 언제나(수비 태세면 더 세게), 용맹의 반사는 가시 방패(p.thorn), 대응은 막기 주 · 무너뜨리기 부, 태세는 수도승 자세(p.stance)와 따로(p.wdSt)
       태세(수비 · 공격): 켜고 끄는 스킬. 켤 때 유산 2, 유지 무료, 하나만 켜진다(하나를 켜면 다른 하나가 꺼짐). 다시 쓰면 끈다(유산 0). 숫자 · 효과는 data/skillkit.js WD_BOUND */
    { id: 'w_dstance', row: 1, b: '성벽', tier: '하급', n: '수비 태세', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'wdStance', s: 'def', txt: '켜 두는 태세. 켜면 보호막 +8, 켜 둔 동안 받는 직접 피해 −10% · 내 차례마다 보호막 +2. 공격 태세와는 하나만 켜진다. 다시 쓰면 끈다. 끌 때는 유산이 들지 않는다.' }] },
    { id: 'w_shieldhit', row: 1, b: '성벽', tier: '하급', n: '방패 가격', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'ward', n: 6 }, { k: 'wardDmg', per: 0.5, cap: 12 }] }, /* M5-1 값 띠 */
    { id: 'w_pray', row: 1, b: '성벽', tier: '하급', n: '신성한 기도', tgt: 'self', time: 'normal', cd: 3, fx: [{ k: 'wdPray', n: 0.03, txt: '최대 생명력 3% 회복. 수비 태세면 6%.' }] },
    { id: 's_astance', row: 1, b: '파쇄', tier: '하급', n: '공격 태세', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'wdStance', s: 'atk', txt: '켜 두는 태세. 켜면 적 하나에게 피해 4 · 붕괴 10, 켜 둔 동안 기본 공격 · 강공격 피해 +20% · 강공격 붕괴 +7. 수비 태세와는 하나만 켜진다. 다시 쓰면 끈다. 끌 때는 유산이 들지 않는다.' }] },
    { id: 's_regret', row: 1, b: '파쇄', tier: '하급', n: '회한의 검', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'vuln', n: 2 }] }, /* M5-1 값 띠 */
    { id: 's_march', row: 4, b: '파쇄', tier: '하급', n: '묵직한 걸음', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 6 }, { k: 'wdMarch', n: 3, txt: '3차례 동안 기본 공격 피해 +12% · 강공격 붕괴 +16, 강공격 스태미나 −12.' }] }, // [Claude 초안] 설계지 2고리(붕괴 +15 · 스태미나 −10)를 값 띠에 맞춤. 맞추기 2번: 보호막 8(1챕터 보스는 버티는 쪽이 이긴다)
    { id: 'f_chainblade', row: 1, b: '전열 장악', tier: '하급', n: '사슬의 검', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'brk', n: 28 }, { k: 'st', s: 'chill', n: 2 }] }, // 파수꾼의 유일한 원거리 견제기(대미지는 얕다)
    /* 경계 칸(입구 · 둘째 · 3고리 둘)은 [Claude 초안]. 기둥 파쇄의 강화 칸 둘(새 칸) */
    { id: 's_lean', row: 7, b: '기둥 파쇄', tier: '중급', n: '기울어진 대열', tgt: 'self', time: 'normal', cd: 6, fx: [{ k: 'st', s: 'empower', n: 3 }, { k: 'st', s: 'protect', n: 2 }, { k: 'ward', n: 4 }] },
    { id: 's_gapwatch', row: 8, b: '기둥 파쇄', tier: '중급', n: '무너짐의 틈', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'ward', n: 23 }, { k: 'st', s: 'empower', n: 3 }] },
    /* 경계 승부수(만든 사람 문장 · 대사 그대로, 10월 20일 결정 반영) */
    { id: 'w_siege', row: 10, b: '공성추', tier: '중급', n: '파성추', kind: 'cut', tgt: 'self', time: 'normal', cd: 9, line: '「지키지 못하는 성벽 따위, 이 나락에서는 사치임이 분명하구나.」', cut: 'blade', pay: '그동안 보호막을 얻지 못하고, 3차례 방어 행동을 할 수 없다.', fx: [{ k: 'wdSiege', n: 3, txt: '현재 보호막을 모두 소모해 3차례 동안 "파성": 강공격 스태미나 −20, 기본 공격과 강공격 피해가 소모한 보호막에 비례해 최대 ×2.0 증폭, 강공격마다 붕괴 +26.' }] },
    { id: 's_quake', row: 10, b: '기둥 파쇄', tier: '중급', n: '대지 분쇄', tgt: 'front', time: 'normal', cd: 9, line: '「네놈들의 방어선을, 쳐부숴주마.」', cut: 'guard', pay: '사용 후 3라운드 동안 자신의 보호막 획득량 −50%.', fx: [{ k: 'brk', n: 35 }, { k: 'wdQuake', txt: '이번 행동으로 적이 2명 이상 무너지면 다음 차례에 주는 피해가 2배다.' }] },
    { id: 'w_valor', row: 10, b: '용맹의 투지', tier: '중급', n: '용맹한 방벽', tgt: 'self', time: 'normal', cd: 9, line: '「이 몸이 물러설 장소 따위. 이미 사라진지 오래렸다.」', cut: 'guard', pay: '그동안 스태미나가 저절로 차지 않고, 흘리기를 할 수 없다.', fx: [{ k: 'wdValor', n: 3, txt: '3차례 동안 "용맹": 방어할 때 보호막 +6 → +18, 내 차례마다 보호막의 50%만큼 가시(맞을 때 그 적에게 되돌린다).' }] },
    /* 결합 칸 셋([Claude 초안]): 원 바깥, 판마다 둘, 꼬리표 조건 */
    { id: 'w_turncoat', row: 7, b: '결합', tier: '중급', n: '돌아선 방패', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'wdTurncoat', txt: '이번 전투 동안 켜진 태세를 다른 태세로 바꿀 때 유산이 들지 않는다. 바꾼 직후 첫 강공격에 붕괴 +25.' }] },
    { id: 's_hammerhand', row: 7, b: '결합', tier: '중급', n: '쇠망치 손', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'wdHammer', txt: '이번 전투 동안 무너진 적에게 기본 공격 ×1.5, 강공격으로 무너진 적을 치면 스태미나 15를 돌려받는다.' }] },
    { id: 'f_chainpull', row: 7, b: '결합', tier: '중급', n: '사슬 끌기', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'wdChainPull', txt: '이번 전투 동안 사슬의 검으로 후열 적을 맞히면 그 적을 전열로 끌어오고 붕괴 +30(전투에 두 번).' }] },
  ],
  hunter: [
    // 시작 스킬: 트리 밖. 추적을 쌓는 사격 하나(주 행동), 물러서며 가속을 얻는 사격 하나(빠른 행동) (10월 5일 초안)
    { id: 'h_aim', b: '시작', lb: '저격', tier: '시작', start: 1, n: '겨눠 쏘기', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'focusAdd', n: 1 }] },
    { id: 'h_step', b: '시작', lb: '기동', tier: '시작', start: 1, n: '물러서며 쏘기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 4 }, { k: 'evade', n: 1 }] }, // 10월 5일: 가속이 연속 행동이 되어 시작 스킬은 가속 대신 몸 빼기
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
    // 상급 (3챕터, 11~13줄 · 10월 8일): 저격을 마무리한다. 왼쪽 기둥은 추적(쌓고 터뜨리고 다시 쌓는다), 오른쪽은 취약과 큰 한 발. 칸마다 스스로 겹과 취약을 건다
    { id: 'h_zeal', skip: 6, row: 11, b: '저격', tier: '상급', n: '집념의 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'focusx', per: 0.25 }, { k: 'focusAdd', n: 1 }, { k: 'bigx', mul: 1.3 }] },
    { id: 'h_nail', skip: 6, row: 11, b: '저격', tier: '상급', n: '급소 박기', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 3 }, { k: 'vulnPer', per: 3 }, { k: 'bigx', mul: 1.3 }] },
    { id: 'h_unend', row: 12, b: '저격', tier: '상급', n: '끝없는 사냥', tgt: 'ranged', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 3 }, { k: 'focusBurst', n: 10 }, { k: 'focusAdd', n: 2 }] },
    { id: 'h_delve', row: 12, b: '저격', tier: '상급', n: '약점 파고들기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 2 }, { k: 'vulnGrow', mul: 2 }, { k: 'vulnPer', per: 3 }] },
    { id: 'h_doom', row: 13, b: '저격', tier: '상급', n: '추격의 종말', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 3 }, { k: 'focusBurst', n: 13 }, { k: 'lowx', hp: 0.3, mul: 1.5 }, { k: 'bigx', mul: 1.4 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_killshot', row: 13, b: '저격', tier: '상급', n: '필살의 한 발', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 21 }, { k: 'vulnPer', per: 2 }, { k: 'bigx', mul: 2 }] },
    // 연사: 표적을 바꿀 때마다 빠른 한 발, 여러 번 쏘고, 화살비와 출혈로 여럿을 깎는다. 왼쪽 기둥은 표적 바꾸기와 연발, 오른쪽은 화살비와 출혈. 무리에 강하고 거구에 약하다
    { id: 'h_double', row: 1, b: '연사', tier: '하급', n: '연속 사격', tgt: 'ranged', time: 'normal', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 4 }, { k: 'hastex', mul: 1.3 }, { k: 'bbuf', s: 'extra', mul: 0.5, r: 1 }] }, // 0.8.0 5단계(2-6a · 8절 결정 5): 덧화살, 다음 라운드가 끝날 때까지. 결정 7: +66% → 자체 피해 7 → 4(−9%, 5면 +16%라 가까운 쪽)
    { id: 'h_rain', row: 1, b: '연사', tier: '하급', n: '화살비', tgt: 'all', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 8 }] },
    { id: 'h_switch', row: 2, b: '연사', tier: '하급', n: '전환 사격', tgt: 'ranged', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 4 }, { k: 'swapx', mul: 1.5 }, { k: 'bbuf', s: 'swap', mul: 1.5, bleed: 2, r: 0 }] }, // 0.8.0 5단계(원거리 초안 2-6a, 10월 18일): 바꿔 쏘기. 결정 7: 버프 값을 넣은 줄 예산(skillscore) +70% → 자체 피해 8 → 4(−6%)
    { id: 'h_barb', row: 2, b: '연사', tier: '하급', n: '가시 화살', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'bbuf', s: 'barb', bleed: 2, r: 1 }] }, // 0.8.0 5단계(2-6a): 가시. 결정 7: +38% → 자체 피해 12 → 8(−1%)
    { id: 'h_triple', row: 3, b: '연사', tier: '하급', n: '삼연사', tgt: 'ranged', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 6 }] },
    { id: 'h_scatter', row: 3, b: '연사', tier: '하급', n: '흩뿌리는 화살', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 1 }] },
    { id: 'h_gap', row: 4, b: '연사', tier: '하급', n: '빈틈 쏘기', tgt: 'ranged', time: 'fast', cd: 7, killRecharge: 1, fx: [{ k: 'dmg', n: 10 }, { k: 'swapx', mul: 1.5 }] }, // 0.8.0 5단계(원거리 초안 1-2 · 2-6): 🔄 → 이 스킬로 적을 쓰러뜨리면 유산 +1
    { id: 'h_bloodrain', row: 4, b: '연사', tier: '하급', n: '피의 비', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'hastex', mul: 1.3 }] },
    { id: 'h_spray', row: 5, b: '연사', tier: '하급', n: '난사', tgt: 'ranged', time: 'slow', cd: 10, hits: 4, fx: [{ k: 'dmg', n: 6 }] },
    { id: 'h_dull', row: 5, b: '연사', tier: '하급', n: '쇠약의 화살비', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'h_turn', row: 6, b: '연사', tier: '하급', n: '선회 사격', tgt: 'ranged', time: 'normal', cd: 9, hits: 2, fx: [{ k: 'dmg', n: 9 }, { k: 'swapx', mul: 1.3 }] },
    { id: 'h_rend', row: 6, b: '연사', tier: '하급', n: '찢는 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'h_storm', row: 7, b: '연사', tier: '중급', n: '폭풍 화살', tgt: 'ranged', time: 'slow', cd: 10, hits: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'brk', n: 23 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_deluge', row: 7, b: '연사', tier: '중급', n: '화살 폭우', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 11 }] },
    { id: 'h_houndshot', row: 8, b: '연사', tier: '중급', n: '물어뜯는 화살', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'swapx', mul: 1.6 }, { k: 'hasten', n: 1 }] },
    { id: 'h_tearrain', row: 8, b: '연사', tier: '중급', n: '찢는 비', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'h_endless', row: 9, b: '연사', tier: '중급', n: '끝없는 사격', tgt: 'ranged', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'swapx', mul: 1.3 }] },
    { id: 'h_slaughter', row: 9, b: '연사', tier: '중급', n: '학살의 비', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'h_thousand', row: 10, b: '연사', tier: '중급', n: '천 개의 화살', tgt: 'ranged', time: 'vslow', cd: 6, hits: 5, fx: [{ k: 'dmg', n: 4 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_skysplit', row: 10, b: '연사', tier: '중급', n: '하늘 가르기', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 1 }, { k: 'hastex', mul: 1.6 }] }, /* 10월 7일: 학살의 비(9줄)와 모든 값이 같던 칸. 연속 행동 라운드에 크게 */
    // 상급 (3챕터, 11~13줄 · 10월 8일): 연사를 마무리한다. 왼쪽 기둥은 표적 바꾸기와 연발, 오른쪽은 모든 적 화살비와 출혈. 큰 적 배수는 없다(거구가 약점)
    { id: 'h_cross', skip: 6, row: 11, b: '연사', tier: '상급', n: '엇갈린 사격', tgt: 'ranged', time: 'fast', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 6 }, { k: 'swapx', mul: 1.5 }, { k: 'hasten', n: 1 }] },
    { id: 'h_thornrain', skip: 6, row: 11, b: '연사', tier: '상급', n: '가시 폭우', tgt: 'front', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 5 }] },
    { id: 'h_rapid', row: 12, b: '연사', tier: '상급', n: '속사', tgt: 'ranged', time: 'normal', cd: 8, hits: 4, fx: [{ k: 'dmg', n: 5 }, { k: 'swapx', mul: 1.3 }] },
    { id: 'h_crimson', row: 12, b: '연사', tier: '상급', n: '붉은 폭우', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'hastex', mul: 1.4 }] },
    { id: 'h_shade', row: 13, b: '연사', tier: '상급', n: '그림자 화살', tgt: 'ranged', time: 'vslow', cd: 6, hits: 5, fx: [{ k: 'dmg', n: 4 }, { k: 'swapx', mul: 1.6 }, { k: 'hasteSpend', mul: 1.5 }] },
    { id: 'h_bloodstorm', row: 13, b: '연사', tier: '상급', n: '피바람 화살', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'hastex', mul: 1.5 }] },
    // 기동: 먼저 움직이고, 피하고, 늦춘다. 왼쪽 기둥은 쓰는 때가 다른 회피(기본 · 템포 · 표적 바꾸기 · 버티기 · 강타 받아넘기기 · 🔄, 중급은 피하기를 피해로), 오른쪽은 둔화와 끊기. 강타에 강하고 상처 · 무리에 약하다 (10월 5일 2차: 만든 사람 검토)
    { id: 'h_dodge', row: 1, b: '기동', tier: '하급', n: '몸 빼기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'evade', n: 1 }, { k: 'stam', n: 38 }] }, // 기본 회피
    { id: 'h_hobble', row: 1, b: '기동', tier: '하급', n: '발 묶는 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'h_dash', row: 2, b: '기동', tier: '하급', n: '질주', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'st', s: 'haste', n: 1 }, { k: 'stam', n: 38 }] }, // 템포: 다음 라운드에 두 번 연달아
    { id: 'h_leg', row: 2, b: '기동', tier: '하급', n: '다리 쏘기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 53 }] },
    { id: 'h_side', row: 3, b: '기동', tier: '하급', n: '옆걸음 사격', tgt: 'ranged', time: 'fast', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'swapx', mul: 1.5 }, { k: 'evade', n: 1 }] }, // 피하면서 표적 바꾸기
    { id: 'h_slowrain', row: 3, b: '기동', tier: '하급', n: '속박의 화살비', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'chill', n: 1 }] }, // 무리를 한꺼번에 늦추기
    { id: 'h_veil', row: 4, b: '기동', tier: '하급', n: '흙먼지 장막', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'meSt', s: 'protect', n: 5 }] }, // 여럿의 공격 버티기: 흙먼지를 일으켜 모두를 약하게 맞히고 나에게 보호(피할 수 없는 공격에도 든다)
    { id: 'h_frost', row: 4, b: '기동', tier: '하급', n: '얼어붙는 화살', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 1 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'h_counter', row: 5, b: '기동', tier: '하급', n: '받아넘기기', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 22, chill: 1, charged: 1 }] }, // 강타 예고를 보고 쓰기
    { id: 'h_stop', row: 5, b: '기동', tier: '하급', n: '멈춰 세우기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'chillCut', brk: 40 }] }, // 둔화와 끊기를 잇기
    { id: 'h_wind', row: 6, b: '기동', tier: '하급', n: '바람 걸음', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'evade', n: 1 }, { k: 'hasten', n: 1, on: 'evade' }, { k: 'stam', n: 75 }] }, // 피하기로 기동을 돌리기
    { id: 'h_shatter', row: 6, b: '기동', tier: '하급', n: '얼음 깨기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 8 }, { k: 'chillShatter', dmg: 5, brk: 25 }] }, // 둔화를 자원으로
    { id: 'h_after', row: 7, b: '기동', tier: '중급', n: '잔상', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 4 }, { k: 'stam', n: 40 }] }, // 피하기가 피해가 되는 첫 칸
    { id: 'h_spread', row: 7, b: '기동', tier: '중급', n: '냉기 번짐', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 17 }, { k: 'chillSpread', per: 1 }] }, // 한 적의 둔화를 무리로
    { id: 'h_foresee', row: 8, b: '기동', tier: '중급', n: '위험 감지', tgt: 'self', time: 'fast', cd: 10, fx: [{ k: 'foresee', red: 0.6, rounds: 3 }, { k: 'st', s: 'protect', n: 2 }, { k: 'stam', n: 6 }] }, // 큰 공격이 겹치는 순간(피할 수 없는 화형 포함)
    { id: 'h_ankle', row: 8, b: '기동', tier: '중급', n: '발목 끊기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 25 }, { k: 'cutx', brk: 26 }, { k: 'onCutBreak', haste: 2, hasten: 1 }] }, // 끊기 강화: 모으던 적을 무너뜨리면 보상(수치는 측정 뒤)
    { id: 'h_windarrow', row: 9, b: '기동', tier: '중급', n: '바람의 화살', tgt: 'ranged', time: 'fast', cd: 10, fx: [{ k: 'dmg', n: 7 }, { k: 'meSt', s: 'haste', n: 1 }, { k: 'hastex', mul: 1.4 }] }, // 공격하면서 회피 유지
    { id: 'h_timeslow', row: 9, b: '기동', tier: '중급', n: '시간 늦추기', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 2 }, { k: 'st', s: 'chill', n: 2 }, { k: 'meSt', s: 'haste', n: 1 }] }, // 라운드를 쥐기
    { id: 'h_shadowrun', row: 10, b: '기동', tier: '중급', n: '그림자 질주', tgt: 'self', time: 'fast', cd: 10, once: 1, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 12, rounds: 3 }, { k: 'quickTurns', n: 3 }] }, // 피할수록 세지는 마무리 (빠른 칸 +1은 내 차례 3번 내내: 측정 때 따로 본다)
    { id: 'h_icecage', row: 10, b: '기동', tier: '중급', n: '얼음 감옥', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 18 }, { k: 'freeze', chill: 3, brk: 40 }] }, // 한 적을 확실히 멈추는 마무리(강적 · 보스는 둔화 3 + 붕괴)
    // 상급 (3챕터, 11~13줄 · 10월 8일): 기동을 마무리한다. 왼쪽 기둥은 피하기가 피해와 반격이 되는 길, 오른쪽은 둔화를 걸고 깨고 끊는 길. 칸마다 스스로 재료를 건다
    { id: 'h_void', skip: 6, row: 11, b: '기동', tier: '상급', n: '허공 사격', tgt: 'ranged', time: 'fast', cd: 8, fx: [{ k: 'dmg', n: 7 }, { k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 7 }] },
    { id: 'h_wedge', skip: 6, row: 11, b: '기동', tier: '상급', n: '얼음 쐐기', tgt: 'ranged', time: 'fast', cd: 7, fx: [{ k: 'dmg', n: 5 }, { k: 'chillShatter', dmg: 4, brk: 20 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'h_dance', row: 12, b: '기동', tier: '상급', n: '반격의 춤', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 10, chill: 1 }, { k: 'stam', n: 30 }] },
    { id: 'h_snare', row: 12, b: '기동', tier: '상급', n: '붙잡는 화살', tgt: 'ranged', time: 'fast', cd: 8, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 60 }, { k: 'chillCut', brk: 40 }] },
    { id: 'h_mirage', row: 13, b: '기동', tier: '상급', n: '환영 질주', tgt: 'self', time: 'fast', cd: 10, fx: [{ k: 'evade', n: 1 }, { k: 'st', s: 'haste', n: 1 }, { k: 'evadeCtr', dmg: 4, rounds: 3 }, { k: 'stam', n: 10 }] },
    { id: 'h_winterchain', row: 13, b: '기동', tier: '상급', n: '겨울 사슬', tgt: 'ranged', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 5 }, { k: 'chillShatter', dmg: 4, brk: 25 }, { k: 'st', s: 'chill', n: 2 }, { k: 'onCutBreak', haste: 2, hasten: 1 }] },
    /* ===== 0.8.0 M5-4 사냥꾼 재설계 (10월 20일 만든 사람 설계지 2판): 저격 · 연사 · 기동 + 경계 명궁 · 유격 · 잠복 + 결합 칸 셋. 이름 · 대사 · 문장 그대로, 숫자는 가설(값 띠 · 측정).
       새 효과 키는 data/skillkit.js HN5_BOUND · js/10 사냥꾼 절(hnUse). 생성: M5-4 gen.py ===== */
    { id: 'h5_pierce', row: 1, b: '저격', tier: '하급', n: '꿰뚫는 화살', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 21 }, { k: 'focusx', per: 0.1 }] },
    { id: 'h5_prey', row: 1, b: '저격', tier: '하급', n: '사냥감 지정', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 22 }, { k: 'focusAdd', n: 2 }] },
    { id: 'h5_cover', row: 1, b: '저격', tier: '하급', n: '엄폐', tgt: 'self', time: 'normal', cd: 4, fx: [{ k: 'st', s: 'protect', n: 7 }] },
    { id: 'h5_heavy', row: 4, b: '저격', tier: '하급', n: '무거운 화살', tgt: 'ranged', time: 'slow', cd: 4, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 15 }] },
    { id: 'h5_lock', row: 4, b: '저격', tier: '하급', n: '표적 고정', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnLock', r: 6, per: 0.2, txt: '7라운드 기본 공격이 대상 추적 겹마다 +20%' }] },
    { id: 'h5_sky', row: 8, b: '저격', tier: '중급', n: '하늘 가르기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 38 }, { k: 'hnSky', need: 3, mul: 3, txt: '추적 3겹이면 무기 피해의 3배' }] },
    { id: 'h5_endhunt', row: 8, b: '저격', tier: '중급', n: '끝없는 사냥', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 24 }, { k: 'hnCarry', txt: '이번 전투: 추적한 적이 쓰러지면 추적이 다음 적에게' }] },
    { id: 'h5_volley', row: 1, b: '연사', tier: '하급', n: '연속 사격', tgt: 'ranged', time: 'normal', cd: 4, hits: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'hnVolley', txt: '발마다 다른 적' }] },
    { id: 'h5_nock', row: 1, b: '연사', tier: '하급', n: '화살 재기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnNock', n: 3, shots: 2, txt: '다음 기본 공격 3번이 두 발' }] },
    { id: 'h5_harass', row: 1, b: '연사', tier: '하급', n: '견제 사격', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'h5_rain', row: 4, b: '연사', tier: '하급', n: '화살비', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 1 }] },
    { id: 'h5_barb', row: 4, b: '연사', tier: '하급', n: '덧화살', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'bbuf', s: 'barb', bleed: 2, r: 12 }] },
    { id: 'h5_bloodrain', row: 8, b: '연사', tier: '중급', n: '피의 비', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'hnBloodRain', mul: 3.4, txt: '출혈 걸린 적 모두에게 무기 피해의 3.4배' }] },
    { id: 'h5_endless', row: 8, b: '연사', tier: '중급', n: '끝없는 화살', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnNock', n: 3, shots: 3, txt: '다음 기본 공격 3번이 세 발' }] },
    { id: 'h5_counter', row: 1, b: '기동', tier: '하급', n: '받아넘기기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'evade', n: 1 }, { k: 'evadeCtr', dmg: 15, rounds: 3 }] },
    { id: 'h5_leg', row: 1, b: '기동', tier: '하급', n: '다리 쏘기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 23 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'h5_dodge', row: 1, b: '기동', tier: '하급', n: '몸 빼기', tgt: 'self', time: 'normal', cd: 4, fx: [{ k: 'evade', n: 1 }, { k: 'stam', n: 25 }] },
    { id: 'h5_windstep', row: 4, b: '기동', tier: '하급', n: '바람 걸음', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnWindStep', txt: '이번 전투: 피할 때마다 다음 기동 스킬 유산 −1(바닥 1)' }] },
    { id: 'h5_stop', row: 4, b: '기동', tier: '하급', n: '멈춰 세우기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 27 }, { k: 'chillCut', brk: 40 }] },
    { id: 'h5_windveil', row: 8, b: '기동', tier: '중급', n: '바람의 장막', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnWindVeil', r: 5, txt: '5라운드 공격을 받을 때마다 몸 빼기 1(라운드에 한 번)' }] },
    { id: 'h5_icecage', row: 8, b: '기동', tier: '중급', n: '얼음 감옥', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 37 }, { k: 'freeze', chill: 3, brk: 40 }] },
    { id: 'h5_aimvol', row: 4, b: '명궁', tier: '하급', n: '겨눈 연사', tgt: 'ranged', time: 'normal', cd: 4, hits: 2, fx: [{ k: 'dmg', n: 9 }, { k: 'focusx', per: 0.1 }] },
    { id: 'h5_steady', row: 4, b: '명궁', tier: '하급', n: '숨 고르기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'st', s: 'empower', n: 6 }] },
    { id: 'h5_pinpoint', row: 8, b: '명궁', tier: '중급', n: '급소 꿰기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 30 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'h5_hawkeye', row: 8, b: '명궁', tier: '중급', n: '매의 눈', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'foresee', red: 0.5, rounds: 9 }] },
    { id: 'h5_mangung', row: 10, b: '명궁', tier: '중급', n: '만궁', tgt: 'self', time: 'normal', cd: 4, line: '「한 호흡이면 족하다. 끝까지 당긴 시위는, 결코 빗나가지 않으니.」', cut: 'blade', pay: '당기는 차례에는 아무것도 못 하고, 그동안 받는 피해 +30%.', fx: [{ k: 'hnDraw', mul: 6.5, per: 1, txt: '한 차례 시위를 당겼다가, 다음 차례 추적한 적에게 무기 피해의 6.5배(추적 겹마다 +1배).' }] },
    { id: 'h5_runshot', row: 4, b: '유격', tier: '하급', n: '달리며 쏘기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'evade', n: 1 }] },
    { id: 'h5_dust', row: 4, b: '유격', tier: '하급', n: '흙먼지', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'st', s: 'protect', n: 11 }] },
    { id: 'h5_storm', row: 8, b: '유격', tier: '중급', n: '폭풍 사격', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'h5_tailwind', row: 8, b: '유격', tier: '중급', n: '순풍', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnNock', n: 5, shots: 2, txt: '다음 기본 공격 5번이 두 발' }] },
    { id: 'h5_gale', row: 10, b: '유격', tier: '중급', n: '질풍난사', tgt: 'self', time: 'normal', cd: 4, line: '「바람보다 빠르게, 비보다 많이. 사냥은 이제부터다.」', cut: 'guard', pay: '그동안 몸 빼기 · 방어 불가, 받는 피해 +20%.', fx: [{ k: 'hnGale', r: 3, txt: '3라운드 동안 매 라운드 두 번 움직이고(가속) 기본 공격이 두 발.' }] },
    { id: 'h5_snare', row: 4, b: '잠복', tier: '하급', n: '덫 화살', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'h5_hide', row: 4, b: '잠복', tier: '하급', n: '숨은 사수', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'evade', n: 2 }] },
    { id: 'h5_ambush', row: 8, b: '잠복', tier: '중급', n: '매복 사격', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 29 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'h5_camo', row: 8, b: '잠복', tier: '중급', n: '위장', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'st', s: 'protect', n: 19 }] },
    { id: 'h5_trap', row: 10, b: '잠복', tier: '중급', n: '혈향의 덫', tgt: 'self', time: 'normal', cd: 4, line: '「피 냄새를 맡고 온 짐승이, 덫을 피하는 법은 없지.」', cut: 'arcane', pay: '깔 때 지금 생명력에서 최대치의 15%를 미끼로 흘린다(15% 이하면 못 씀).', fx: [{ k: 'hnTrap', mul: 3.5, txt: '이번 라운드 나를 치는 적은 모두 다음 행동을 놓치고 추적 3겹이 된다.' }] },
    { id: 'h5_chase', row: 7, b: '결합', tier: '중급', n: '추격', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnChaseC', txt: '이번 전투: 피할 때마다 그 적에게 추적 +1겹', n: 1 }] },
    { id: 'h5_scent', row: 7, b: '결합', tier: '중급', n: '피 냄새', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnScent', txt: '이번 전투: 출혈 걸린 적을 맞히면 추적 +1겹', n: 1 }] },
    { id: 'h5_frozen', row: 7, b: '결합', tier: '중급', n: '얼어붙은 사냥감', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'hnFrozen', mul: 1.8, txt: '이번 전투: 둔화 걸린 적에게 기본 공격 ×1.8' }] },
    /* ===== M5-4 사냥꾼 끝 ===== */
  ],
  /* 숨겨진 직업 1 (10월 7일, key butcher). 새 효과 키 grudge · carry, 넓힌 인자(st/exploit/grow/drain/spread s: 'bleed', exploit · drain me, lowx me, hasten · quick · meSt on: 'kill', thorn · onParry bleed)는 index.html runSkill2, 점수는 skillkit.js SKK.butch */
  butcher: [
    // 시작 스킬 (트리 밖, 늘 끼움): 출혈을 거는 공격 하나(주 행동), 피해 없이 먹는 방어 하나(빠른 행동)
    { id: 'b_hook', b: '시작', tier: '시작', start: 1, n: '갈고리 베기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'b_lap', b: '시작', tier: '시작', start: 1, n: '피 들이켜기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'drain', s: 'bleed', eat: 1, max: 5, per: 4 }, { k: 'stam', n: 39 }] },
    // 도륙: 한 적에게 출혈을 깊게 새기고 먹는다. 왼쪽 기둥은 새기기 · 이용(걸기, 출혈 비례, 키우기, 붕괴), 오른쪽 기둥은 먹기(먹는 양 · 바꾸는 것이 줄마다 다르다)
    { id: 'b_gash', row: 1, b: '도륙', tier: '하급', n: '살 가르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 5 }] },
    { id: 'b_bite', row: 1, b: '도륙', tier: '하급', n: '물어뜯기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'drain', s: 'bleed', eat: 1, per: 3 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'b_saw', row: 2, b: '도륙', tier: '하급', n: '톱질', tgt: 'melee', time: 'fast', cd: 5, hits: 2, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'bleed', n: 3 }] },
    { id: 'b_sip', row: 2, b: '도륙', tier: '하급', n: '한 모금', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 15 }, { k: 'drain', s: 'bleed', eat: 1, half: 1, per: 3 }] },
    { id: 'b_tendon', row: 3, b: '도륙', tier: '하급', n: '힘줄 끊기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'b_wring', row: 3, b: '도륙', tier: '하급', n: '핏물 짜내기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'drain', s: 'bleed', eat: 1, max: 5, per: 1.5, brk: 10 }] },
    { id: 'b_deep', row: 4, b: '도륙', tier: '하급', n: '깊게 긋기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'exploit', s: 'bleed', per: 2.5 }] },
    { id: 'b_drained', row: 4, b: '도륙', tier: '하급', n: '피 말리기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'drain', s: 'bleed', eat: 1, per: 2, weak: 3 }] },
    { id: 'b_hooks', row: 5, b: '도륙', tier: '하급', n: '갈고리 박기', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'brk', n: 33 }] },
    { id: 'b_finish', row: 5, b: '도륙', tier: '하급', n: '숨통 끊고 마시기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 20 }, { k: 'lowx', hp: 0.35, mul: 1.5 }, { k: 'drain', s: 'bleed', eat: 1, per: 3 }] },
    { id: 'b_widen', row: 6, b: '도륙', tier: '하급', n: '상처 벌리기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'grow', s: 'bleed', mul: 1.5, add: 1 }] },
    { id: 'b_feastfront', row: 6, b: '도륙', tier: '하급', n: '돌려 마시기', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 16 }, { k: 'drain', s: 'bleed', eat: 1, half: 1, per: 3 }] },
    { id: 'b_dissect', row: 7, b: '도륙', tier: '중급', n: '해체', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'b_hoard', row: 7, b: '도륙', tier: '중급', n: '피 갈무리', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 22 }, { k: 'drain', s: 'bleed', eat: 1, per: 2, emp: 3 }] },
    { id: 'b_open', row: 8, b: '도륙', tier: '중급', n: '마르지 않는 상처', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'b_spring', row: 8, b: '도륙', tier: '중급', n: '마르지 않는 샘', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 22 }, { k: 'drain', s: 'bleed', eat: 1, per: 3, keep: 0.5 }] },
    { id: 'b_slaughter', row: 9, b: '도륙', tier: '중급', n: '도축', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'brk', n: 44 }, { k: 'exploit', s: 'bleed', per: 2 }] },
    { id: 'b_glut', row: 9, b: '도륙', tier: '중급', n: '탐식', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 28 }, { k: 'drain', s: 'bleed', eat: 1, per: 2.5, brk: 8 }] },
    { id: 'b_river', row: 10, b: '도륙', tier: '중급', n: '피의 강', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 18 }, { k: 'grow', s: 'bleed', mul: 2 }, { k: 'exploit', s: 'bleed', per: 2.5 }] },
    { id: 'b_banquet', row: 10, b: '도륙', tier: '중급', n: '피의 만찬', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 8 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'drain', s: 'bleed', eat: 1, per: 4 }, { k: 'bigx', mul: 1.5 }] },
    // 상급 11~13줄 (10월 8일 3챕터, 도륙): 왼쪽은 상처를 파고들어 키우며 쓰고, 오른쪽은 먹고 바꾸는 것을 한꺼번에 늘린다
    { id: 'b_probe', row: 11, b: '도륙', tier: '상급', n: '상처 헤집기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'grow', s: 'bleed', mul: 1.5, add: 1 }] },
    { id: 'b_swallow', row: 11, b: '도륙', tier: '상급', n: '피 삼키기', tgt: 'melee', time: 'fast', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'drain', s: 'bleed', eat: 1, per: 2, brk: 14 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'b_nick', row: 12, b: '도륙', tier: '상급', n: '저며 내기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'exploit', s: 'bleed', per: 1.5 }] },
    { id: 'b_goblet', row: 12, b: '도륙', tier: '상급', n: '붉은 잔', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 23 }, { k: 'drain', s: 'bleed', eat: 1, half: 1, per: 4, emp: 3 }] },
    { id: 'b_bonefile', row: 13, b: '도륙', tier: '상급', n: '뼈 깎는 칼', tgt: 'melee', time: 'fast', cd: 10, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'brk', n: 19 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'b_gorge', row: 13, b: '도륙', tier: '상급', n: '게걸스러운 입', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 17 }, { k: 'drain', s: 'bleed', eat: 1, per: 2, brk: 10, weak: 3, emp: 3 }, { k: 'st', s: 'bleed', n: 2 }] },
    // 광기: 맞을수록, 낮을수록 세다. 왼쪽 기둥은 맞받기(받은 피해 되갚기 · 맞을 때 출혈 · 덜 막는 흘리기), 오른쪽 기둥은 핏값(내게 출혈을 걸어 치고, 내 생명력이 낮을 때 크게)
    { id: 'b_retort', row: 1, b: '광기', tier: '하급', n: '앙갚음', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'grudge', per: 0.6, max: 20 }] },
    { id: 'b_reckless', row: 1, b: '광기', tier: '하급', n: '무모한 베기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 27 }] },
    { id: 'b_bare', row: 2, b: '광기', tier: '하급', n: '맨살로 받기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'thorn', times: 3, bleed: 2 }, { k: 'stam', n: 43 }] },
    { id: 'b_boil', row: 2, b: '광기', tier: '하급', n: '들끓는 일격', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'lowx', me: 1, hp: 0.5, mul: 1.5 }] },
    { id: 'b_spite', row: 3, b: '광기', tier: '하급', n: '앙갚음 연타', tgt: 'melee', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'grudge', per: 0.25, max: 8 }] },
    { id: 'b_share', row: 3, b: '광기', tier: '하급', n: '피 나누기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 6 }] },
    { id: 'b_take', row: 4, b: '광기', tier: '하급', n: '몸으로 받기', tgt: 'pick', time: 'fast', cd: 6, fx: [{ k: 'parry', red: 0.35 }, { k: 'onParry', dmg: 13, bleed: 3 }] },
    { id: 'b_frenzy', row: 4, b: '광기', tier: '하급', n: '광란', tgt: 'melee', time: 'normal', cd: 7, hits: 3, fx: [{ k: 'dmg', n: 9 }, { k: 'lowx', me: 1, hp: 0.4, mul: 1.5 }] },
    { id: 'b_revenge', row: 5, b: '광기', tier: '하급', n: '피의 보복', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'grudge', per: 1, max: 30 }, { k: 'brk', n: 33 }] },
    { id: 'b_price', row: 5, b: '광기', tier: '하급', n: '핏값', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'meSt', s: 'bleed', n: 3 }, { k: 'dmg', n: 32 }, { k: 'brk', n: 40 }] },
    { id: 'b_grudgefront', row: 6, b: '광기', tier: '하급', n: '앙심', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'grudge', per: 0.4, max: 12 }] },
    { id: 'b_brink', row: 6, b: '광기', tier: '하급', n: '벼랑 끝', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'lowx', me: 1, hp: 0.3, mul: 2 }] },
    { id: 'b_answer', row: 7, b: '광기', tier: '중급', n: '핏빛 응수', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'grudge', per: 0.6, max: 20, bl: 5 }] },
    { id: 'b_bloodblade', row: 7, b: '광기', tier: '중급', n: '흐르는 피의 칼', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'exploit', s: 'bleed', me: 1, per: 4, max: 6 }] },
    { id: 'b_snapback', row: 8, b: '광기', tier: '중급', n: '살 내주기', tgt: 'pick', time: 'fast', cd: 7, fx: [{ k: 'parry', red: 0.35 }, { k: 'onParry', dmg: 15, bleed: 4 }, { k: 'hasten', n: 1, on: 'parry' }] },
    { id: 'b_offer', row: 8, b: '광기', tier: '중급', n: '피를 바치는 일격', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'drain', s: 'bleed', me: 1, eat: 1, emp: 1 }, { k: 'dmg', n: 20 }] },
    { id: 'b_brand', row: 9, b: '광기', tier: '중급', n: '원한의 각인', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 19 }, { k: 'grudge', per: 0.8, max: 25, vu: 8 }] },
    { id: 'b_lastbreath', row: 9, b: '광기', tier: '중급', n: '마지막 숨', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'drain', s: 'bleed', me: 1, eat: 1, dmg: 5, max: 6 }, { k: 'dmg', n: 13 }, { k: 'brk', n: 40 }, { k: 'bigx', mul: 1.5 }] }, // 10월 7일 검토: 벼랑 끝과 같은 '내 생명력 30% ×2' 대신 내 출혈을 지워 피해로
    { id: 'b_retribution', row: 10, b: '광기', tier: '중급', n: '응징의 도끼', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 12 }, { k: 'grudge', per: 1.5, max: 45, brk: 2, brkMax: 60 }] }, // 10월 7일 검토: 피의 보복과 같은 '받은 피해 + 고정 붕괴'를 받은 피해에 비례하는 붕괴로
    { id: 'b_rampage', row: 10, b: '광기', tier: '중급', n: '피의 광란', tgt: 'melee', time: 'normal', cd: 9, hits: 4, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 6 }, { k: 'exploit', s: 'bleed', me: 1, per: 1.5, max: 6 }] },
    // 상급 11~13줄 (10월 8일 3챕터, 광기): 왼쪽은 받은 피해를 더 크게 되갚고, 오른쪽은 내 피를 대가로 낮은 생명력의 힘을 끌어낸다
    { id: 'b_ire', row: 11, b: '광기', tier: '상급', n: '쌓인 원한', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 7 }, { k: 'grudge', per: 0.9, max: 30, bl: 4 }] },
    { id: 'b_seethe', row: 11, b: '광기', tier: '상급', n: '끓는 핏줄', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 24 }, { k: 'exploit', s: 'bleed', me: 1, per: 3, max: 6 }, { k: 'lowx', me: 1, hp: 0.5, mul: 1.4 }] },
    { id: 'b_barbs', row: 12, b: '광기', tier: '상급', n: '가시 돋은 일격', tgt: 'melee', time: 'normal', cd: 8, keep: ['thorn'], fx: [{ k: 'dmg', n: 28 }, { k: 'thorn', times: 2, bleed: 2 }] },
    { id: 'b_pulse', row: 12, b: '광기', tier: '상급', n: '광기의 맥박', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'meSt', s: 'bleed', n: 2 }, { k: 'dmg', n: 28 }, { k: 'lowx', me: 1, hp: 0.4, mul: 1.6 }] },
    { id: 'b_reprisal', row: 13, b: '광기', tier: '상급', n: '응보의 도끼질', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 9 }, { k: 'grudge', per: 1.5, max: 60, brk: 2, brkMax: 80 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'b_abyss', row: 13, b: '광기', tier: '상급', n: '핏빛 심연', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'drain', s: 'bleed', me: 1, eat: 1, dmg: 6, max: 6 }, { k: 'dmg', n: 13 }, { k: 'lowx', me: 1, hp: 0.3, mul: 2 }, { k: 'bigx', mul: 1.5 }] },
    // 학살: 쓰러뜨리며 이어 간다. 왼쪽 기둥은 휩쓸기(전열 광역 + 줄마다 다른 덧붙임), 오른쪽 기둥은 처형(마무리 배수, 처치 보상, 후열에 닿는 칸 하나)
    { id: 'b_sweep', row: 1, b: '학살', tier: '하급', n: '휘둘러 베기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'b_throat', row: 1, b: '학살', tier: '하급', n: '목 따기', tgt: 'melee', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 18 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'b_splash', row: 2, b: '학살', tier: '하급', n: '핏방울 튀기기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'spread', s: 'bleed', per: 1, kill: 1 }] },
    { id: 'b_chop', row: 2, b: '학살', tier: '하급', n: '토막 치기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'quick', n: 1, on: 'kill' }] },
    { id: 'b_spin', row: 3, b: '학살', tier: '하급', n: '갈고리 돌리기', tgt: 'front', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 13 }] },
    { id: 'b_scent', row: 3, b: '학살', tier: '하급', n: '피 냄새 쫓기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'hasten', n: 1, on: 'kill' }] },
    { id: 'b_roar', row: 4, b: '학살', tier: '하급', n: '도살꾼의 고함', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'b_hookthrow', row: 4, b: '학살', tier: '하급', n: '갈고리 던지기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'bleed', n: 4 }] },
    { id: 'b_gale', row: 5, b: '학살', tier: '하급', n: '피보라', tgt: 'front', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 15 }, { k: 'exploit', s: 'bleed', per: 1.5 }] },
    { id: 'b_cleaver', row: 5, b: '학살', tier: '하급', n: '피 묻은 식칼', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'lowx', hp: 0.3, mul: 2 }, { k: 'spread', s: 'bleed', per: 1, kill: 1 }] },
    { id: 'b_sickle', row: 6, b: '학살', tier: '하급', n: '사슬 낫', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'b_hunger', row: 6, b: '학살', tier: '하급', n: '허기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 15 }, { k: 'lowx', hp: 0.4, mul: 2 }] },
    { id: 'b_ripple', row: 7, b: '학살', tier: '중급', n: '피의 잔물결', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'hasten', n: 2, on: 'kill' }] },
    { id: 'b_scaffold', row: 7, b: '학살', tier: '중급', n: '처형대', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 25 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'b_harvest', row: 8, b: '학살', tier: '중급', n: '피의 수확', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 15 }, { k: 'drain', s: 'bleed', eat: 1, kill: 1, per: 3 }] },
    { id: 'b_next', row: 8, b: '학살', tier: '중급', n: '다음 놈', tgt: 'melee', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 9 }, { k: 'lowx', hp: 0.35, mul: 1.5 }, { k: 'carry' }] }, // 10월 7일 검토: 목 따기와 같은 kr를 버리고 남은 타격 잇기
    { id: 'b_storm', row: 9, b: '학살', tier: '중급', n: '붉은 폭풍', tgt: 'all', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'b_headsman', row: 9, b: '학살', tier: '중급', n: '망나니', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 29 }, { k: 'lowx', hp: 0.4, mul: 2 }, { k: 'meSt', s: 'empower', n: 2, on: 'kill' }] }, // 10월 7일 검토: 피 냄새 쫓기와 같은 🔄 대신 쓰러뜨리면 나에게 강화 2
    { id: 'b_redtide', row: 10, b: '학살', tier: '중급', n: '붉은 물결', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'spread', s: 'bleed', per: 1, kill: 1 }] },
    { id: 'b_procession', row: 10, b: '학살', tier: '중급', n: '도살 행렬', tgt: 'melee', time: 'normal', cd: 10, fx: [{ k: 'dmg', n: 27 }, { k: 'lowx', hp: 0.35, mul: 2 }, { k: 'quick', n: 1, on: 'kill', next: 1 }, { k: 'hasten', n: 2, on: 'kill' }] }, // 10월 7일 검토: 빠른 칸은 다음 차례에. 보통 행동은 차례를 끝내 이번 차례 빠른 칸이 쓰이지 않았다
    // 상급 11~13줄 (10월 8일 3챕터, 학살): 왼쪽은 전열을 휩쓸며 쓰러뜨릴 때 이어 가고, 오른쪽은 마무리로 회복과 강화를 챙긴다
    { id: 'b_hookrain', row: 11, b: '학살', tier: '상급', n: '갈고리 소나기', tgt: 'front', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'b_twinaxe', row: 11, b: '학살', tier: '상급', n: '쌍도끼 내리치기', tgt: 'melee', time: 'normal', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 13 }, { k: 'lowx', hp: 0.35, mul: 1.8 }, { k: 'carry' }] },
    { id: 'b_chainkill', row: 12, b: '학살', tier: '상급', n: '연쇄 도살', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'brk', n: 23 }, { k: 'quick', n: 1, on: 'kill', next: 1 }] },
    { id: 'b_lastsip', row: 12, b: '학살', tier: '상급', n: '마지막 한 모금', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'lowx', hp: 0.4, mul: 2 }, { k: 'drain', s: 'bleed', eat: 1, kill: 1, per: 5 }] },
    { id: 'b_massacre', row: 13, b: '학살', tier: '상급', n: '대학살', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'exploit', s: 'bleed', per: 1.5 }] },
    { id: 'b_guillotine', row: 13, b: '학살', tier: '상급', n: '단두대', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 32 }, { k: 'lowx', hp: 0.4, mul: 2.2 }, { k: 'meSt', s: 'empower', n: 2, on: 'kill' }] },
  ],
  /* 원소술사 (10월 7일, docs/직업/원소술사.md C절): 불로 태우고 얼음으로 묶는다. 한 적에게 화상과 둔화가 함께 있으면 그 행동이 끝날 때 열충격(index.html elemShock).
     새 효과: weave(없는 원소), shockx(이 스킬로 일어난 열충격의 피해 · 붕괴 배수, 번짐 arc, 남기기 keep), rime(나를 친 적에게 상태, 되얼림), burnOut(화상을 모두 태움). hasten on:'shock', cutx chant */
  elementalist: [
    // 시작 스킬: 불 하나(주 행동), 얼음 하나(빠른 행동). 어느 갈래 하나만 골라도 둘로 열충격이 돈다
    { id: 'e_ember', b: '시작', tier: '시작', start: 1, n: '불씨 화살', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'e_touch', b: '시작', tier: '시작', start: 1, n: '서리 손길', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'chill', n: 2 }, { k: 'stam', n: 24 }] },
    // 불꽃: 왼쪽 불씨(쌓기 · 연타 · 남기기), 오른쪽 큰 불(큰 한 방 · 불태우기 · 마무리). 큰 적에 강하고 무리에 약하다
    { id: 'e_kindle', row: 1, b: '불꽃', tier: '하급', n: '불붙이기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'e_firebolt', row: 1, b: '불꽃', tier: '하급', n: '화염탄', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 29 }] },
    { id: 'e_sparks', row: 2, b: '불꽃', tier: '하급', n: '불똥 세례', tgt: 'ranged', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 5 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'e_burnout', row: 2, b: '불꽃', tier: '하급', n: '불태우기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'burnOut', per: 3, brk: 4 }] },
    { id: 'e_spread', row: 3, b: '불꽃', tier: '하급', n: '번지는 불', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'e_lance', row: 3, b: '불꽃', tier: '하급', n: '불의 창', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 32 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'e_stoke', row: 4, b: '불꽃', tier: '하급', n: '불길 증폭', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'ignite', n: 6 }, { k: 'hasten', n: 1, on: 'use' }] },
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
    { id: 'e_cinderrain', row: 11, b: '불꽃', tier: '상급', n: '불티 소나기', tgt: 'ranged', time: 'normal', cd: 6, hits: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'ignite', n: 6 }] },
    { id: 'e_scorchshot', row: 11, b: '불꽃', tier: '상급', n: '작열탄', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 20 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'bigx', mul: 1.8 }] },
    { id: 'e_pyreheart', row: 12, b: '불꽃', tier: '상급', n: '불씨 심장', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'ignite', n: 7 }, { k: 'shockx', dmg: 1.3, keep: { s: 'ignite', n: 4 } }] },
    { id: 'e_judgefire', row: 12, b: '불꽃', tier: '상급', n: '심판의 불', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 24 }, { k: 'brk', n: 24 }, { k: 'brokenx', mul: 2 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'e_hellblaze', row: 13, b: '불꽃', tier: '상급', n: '불지옥', tgt: 'ranged', time: 'slow', cd: 8, hits: 5, fx: [{ k: 'dmg', n: 4 }, { k: 'st', s: 'ignite', n: 10 }] },
    { id: 'e_eclipse', row: 13, b: '불꽃', tier: '상급', n: '일식', tgt: 'ranged', time: 'vslow', cd: 10, fx: [{ k: 'dmg', n: 32 }, { k: 'bigx', mul: 2.3 }, { k: 'lowx', hp: 0.3, mul: 1.6 }] },
    // 서리: 왼쪽 묶기(둔화 · 약화 · 되얼림 · 보호), 오른쪽 깨기(둔화된 적 × · 열충격 붕괴 × · 둔화 남기기 · 영창 끊기). 무리와 긴 싸움에 강하고 지원에 약하다
    { id: 'e_bind', row: 1, b: '서리', tier: '하급', n: '서리 결박', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_icelance', row: 1, b: '서리', tier: '하급', n: '얼음 창', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 26 }, { k: 'brk', n: 25 }] },
    { id: 'e_hoar', row: 2, b: '서리', tier: '하급', n: '서릿발', tgt: 'front', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_crack', row: 2, b: '서리', tier: '하급', n: '서리 균열', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 19 }, { k: 'st', s: 'chill', n: 1 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_armor', row: 3, b: '서리', tier: '하급', n: '서리 갑옷', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'rime', times: 3, n: 2 }, { k: 'stam', n: 53 }] },
    { id: 'e_hail', row: 3, b: '서리', tier: '하급', n: '우박', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'brk', n: 22 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e_numb', row: 4, b: '서리', tier: '하급', n: '한기 침식', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'e_coldember', row: 4, b: '서리', tier: '하급', n: '식은 불씨', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 21 }, { k: 'st', s: 'chill', n: 2 }, { k: 'shockx', keep: { s: 'chill', n: 1 } }] },
    { id: 'e_snap', row: 5, b: '서리', tier: '하급', n: '한파', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_bite', row: 5, b: '서리', tier: '하급', n: '동상', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'brk', n: 30 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'e_shell', row: 6, b: '서리', tier: '하급', n: '빙벽 화살', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 1 }, { k: 'meSt', s: 'protect', n: 3 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'e_maul', row: 6, b: '서리', tier: '하급', n: '빙퇴', tgt: 'ranged', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 32 }, { k: 'brk', n: 40 }, { k: 'cutx', brk: 70, chant: 1 }] },
    { id: 'e_mirror', row: 7, b: '서리', tier: '중급', n: '얼음 거울', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'rime', times: 4, n: 2 }, { k: 'st', s: 'protect', n: 4 }] },
    { id: 'e_breaker', row: 7, b: '서리', tier: '중급', n: '빙결 파쇄', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 28 }, { k: 'st', s: 'chill', n: 2 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_stasis', row: 8, b: '서리', tier: '중급', n: '정지', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 3 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'e_avalanche', row: 8, b: '서리', tier: '중급', n: '눈사태', tgt: 'front', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 25 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e_tundra', row: 9, b: '서리', tier: '중급', n: '영구 동토', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 1 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'e_flash', row: 9, b: '서리', tier: '중급', n: '급랭', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'chill', n: 3 }, { k: 'shockx', dmg: 1.3, keep: { s: 'chill', n: 2 } }] },
    { id: 'e_zero', row: 10, b: '서리', tier: '중급', n: '절대 영도', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 2 }, { k: 'rime', times: 2, n: 1 }] },
    { id: 'e_coffin', row: 10, b: '서리', tier: '중급', n: '얼음 관', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 28 }, { k: 'brk', n: 33 }, { k: 'st', s: 'chill', n: 2 }, { k: 'chillx', mul: 1.5 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_hoarbloom', row: 11, b: '서리', tier: '상급', n: '서리꽃', tgt: 'front', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 2 }, { k: 'meSt', s: 'protect', n: 2 }] },
    { id: 'e_shatter', row: 11, b: '서리', tier: '상급', n: '산산조각', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 26 }, { k: 'st', s: 'chill', n: 2 }, { k: 'brk', n: 26 }, { k: 'shockx', brk: 2.5 }] },
    { id: 'e_icebarrier', row: 12, b: '서리', tier: '상급', n: '얼음 장벽', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'rime', times: 5, n: 2 }, { k: 'st', s: 'protect', n: 3 }, { k: 'stam', n: 32 }] },
    { id: 'e_icepick', row: 12, b: '서리', tier: '상급', n: '얼음 송곳', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 39 }, { k: 'chillx', mul: 1.5 }, { k: 'cutx', brk: 70, chant: 1 }] },
    { id: 'e_longwinter', row: 13, b: '서리', tier: '상급', n: '긴 겨울', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'chill', n: 3 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'e_cryo', row: 13, b: '서리', tier: '상급', n: '극저온 파쇄', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 23 }, { k: 'st', s: 'chill', n: 3 }, { k: 'brk', n: 22 }, { k: 'chillx', mul: 1.5 }, { k: 'shockx', dmg: 1.5, brk: 2, keep: { s: 'chill', n: 1 } }] },
    // 공명: 왼쪽 엮기(한 적 · 열충격 배수 · 🔄), 오른쪽 물결(모두에게 한 원소씩 · 번짐). 지원과 섞인 무리에 강하고 큰 적에 약하다
    { id: 'e_weave', row: 1, b: '공명', tier: '하급', n: '원소 엮기', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'weave', ign: 4, chill: 1 }] },
    { id: 'e_firewave', row: 1, b: '공명', tier: '하급', n: '불꽃 물결', tgt: 'all', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'ignite', n: 1 }] },
    { id: 'e_twin', row: 2, b: '공명', tier: '하급', n: '쌍둥이 화살', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 3, chill: 1 }] },
    { id: 'e_frostwave', row: 2, b: '공명', tier: '하급', n: '냉기 물결', tgt: 'all', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e_catalyst', row: 3, b: '공명', tier: '하급', n: '촉매', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', dmg: 1.5 }] },
    { id: 'e_arc', row: 3, b: '공명', tier: '하급', n: '튀는 충격', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', arc: 0.5 }] },
    { id: 'e_resonate', row: 4, b: '공명', tier: '하급', n: '공명', tgt: 'ranged', time: 'normal', cd: 6, killRecharge: 1, krShock: 1, fx: [{ k: 'dmg', n: 15 }, { k: 'weave', ign: 4, chill: 1 }] }, // 10월 18일 0.8.0 5단계(원거리 초안 1-2 · 3-6): 🔄(열충격이 나면) → 이 행동으로 적을 쓰러뜨리면(행동 끝 열충격 포함, krShock) 유산 +1
    { id: 'e_backdraft', row: 4, b: '공명', tier: '하급', n: '역화', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 6 }, { k: 'weave', ign: 3, chill: 1 }] },
    { id: 'e_polar', row: 5, b: '공명', tier: '하급', n: '극성 뒤집기', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'shockx', brk: 2 }] },
    { id: 'e_steam', row: 5, b: '공명', tier: '하급', n: '증기 폭발', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'chill', n: 1 }, { k: 'shockx', dmg: 1.5 }] },
    { id: 'e_veil', row: 6, b: '공명', tier: '하급', n: '원소 장막', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'meSt', s: 'protect', n: 2 }] },
    { id: 'e_cloud', row: 6, b: '공명', tier: '하급', n: '증기 구름', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 3, chill: 1 }, { k: 'shockx', arc: 0.4 }] },
    { id: 'e_afterheat', row: 7, b: '공명', tier: '중급', n: '잔열', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 12 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', keep: { s: 'ignite', n: 3 } }] },
    { id: 'e_cascade', row: 7, b: '공명', tier: '중급', n: '원소 연쇄', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 8 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'shockx', arc: 0.7 }] },
    { id: 'e_disrupt', row: 8, b: '공명', tier: '중급', n: '원소 교란', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'cutx', brk: 35, chant: 1 }] },
    { id: 'e_maelstrom', row: 8, b: '공명', tier: '중급', n: '소용돌이', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 5 }, { k: 'weave', ign: 3, chill: 1 }, { k: 'shockx', dmg: 1.3 }] },
    { id: 'e_overload', row: 9, b: '공명', tier: '중급', n: '과부하', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 12 }, { k: 'weave', ign: 5, chill: 2 }, { k: 'shockx', dmg: 2 }] },
    { id: 'e_tempest', row: 9, b: '공명', tier: '중급', n: '원소 폭풍', tgt: 'all', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 2 }, { k: 'st', s: 'ignite', n: 2 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e_pole', row: 10, b: '공명', tier: '중급', n: '극점', tgt: 'ranged', time: 'slow', cd: 10, once: 1, fx: [{ k: 'dmg', n: 21 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'st', s: 'chill', n: 2 }, { k: 'shockx', dmg: 1.5, brk: 2 }] },
    { id: 'e_resoburst', row: 10, b: '공명', tier: '중급', n: '공명 폭발', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'weave', ign: 5, chill: 2 }, { k: 'shockx', dmg: 1.3, arc: 0.9 }] },
    { id: 'e_attune', row: 11, b: '공명', tier: '상급', n: '조율', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'weave', ign: 4, chill: 1 }, { k: 'shockx', keep: { s: 'chill', n: 1 } }] },
    { id: 'e_tide', row: 11, b: '공명', tier: '상급', n: '밀물', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 5 }, { k: 'weave', ign: 3, chill: 1 }, { k: 'shockx', arc: 0.6 }] },
    { id: 'e_chainshock', row: 12, b: '공명', tier: '상급', n: '연쇄 충격', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'weave', ign: 4, chill: 2 }, { k: 'shockx', dmg: 1.6, brk: 1.5 }, { k: 'meSt', s: 'protect', n: 2 }] },
    { id: 'e_stormfront', row: 12, b: '공명', tier: '상급', n: '폭풍전선', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 4 }, { k: 'weave', ign: 3, chill: 1 }, { k: 'shockx', dmg: 1.6 }] },
    { id: 'e_critical', row: 13, b: '공명', tier: '상급', n: '임계', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 12 }, { k: 'weave', ign: 5, chill: 2 }, { k: 'shockx', dmg: 2.2, brk: 2 }] },
    { id: 'e_eyestorm', row: 13, b: '공명', tier: '상급', n: '폭풍의 눈', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 2 }, { k: 'st', s: 'ignite', n: 1 }, { k: 'st', s: 'chill', n: 1 }, { k: 'shockx', dmg: 1.5, brk: 1.5 }] },
    /* ===== 0.8.0 M5-5 원소술사 재설계 (10월 20일 만든 사람 설계지 2판): 불꽃 · 서리 · 마력 + 경계 빙염 · 정적 · 마염 + 결합 칸 셋. 이름 · 대사 · 문장 그대로, 숫자는 가설(값 띠 · 측정).
       시작 스킬 마력탄 · 원소 전환(아래 두 줄). 새 효과 키는 data/skillkit.js EL5_BOUND · js/10 원소술사 절(elUse). 생성: M5-5 gen.py ===== */
    { id: 'e5_bolt', b: '시작', tier: '시작', start: 1, n: '마력탄', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'elBolt', n: 2, txt: '지금 원소 2(불이면 화상, 얼음이면 둔화)' }] },
    { id: 'e5_switch', b: '시작', tier: '시작', start: 1, n: '원소 전환', tgt: 'self', time: 'fast', cd: 4, ys: 1, fx: [{ k: 'elSwitch', txt: '마력탄의 원소를 불 ↔ 얼음' }] },
    { id: 'e5_firebolt', row: 1, b: '불꽃', tier: '하급', n: '화염탄', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'e5_sparks', row: 1, b: '불꽃', tier: '하급', n: '불똥 세례', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'ignite', n: 1 }] },
    { id: 'e5_cloak', row: 1, b: '불꽃', tier: '하급', n: '불꽃 외투', tgt: 'self', time: 'normal', cd: 4, fx: [{ k: 'elRimeR', s: 'ignite', n: 1, r: 5 }] },
    { id: 'e5_burnout', row: 4, b: '불꽃', tier: '하급', n: '불태우기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'burnOut', per: 3, brk: 4 }] },
    { id: 'e5_spread', row: 4, b: '불꽃', tier: '하급', n: '번지는 불', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 20 }, { k: 'elSpreadIgn', per: 0.5, txt: '대상 화상 절반을 다른 적 모두에게' }] },
    { id: 'e5_inferno', row: 8, b: '불꽃', tier: '중급', n: '대화재', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'burnOut', per: 4, brk: 6 }] },
    { id: 'e5_hongryeon', row: 8, b: '불꽃', tier: '중급', n: '홍련', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'ignite', n: 2 }] },
    { id: 'e5_icespear', row: 1, b: '서리', tier: '하급', n: '얼음 창', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e5_frostarmor', row: 1, b: '서리', tier: '하급', n: '서리 갑옷', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elRimeR', s: 'chill', n: 1, r: 8 }] },
    { id: 'e5_rimefrost', row: 1, b: '서리', tier: '하급', n: '서릿발', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e5_crack', row: 4, b: '서리', tier: '하급', n: '서리 균열', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 22 }, { k: 'elChillBrk', per: 12, txt: '대상 둔화 1마다 붕괴 +12' }] },
    { id: 'e5_icewall', row: 4, b: '서리', tier: '하급', n: '얼음 장벽', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elProtR', n: 3, r: 7, txt: '7라운드 동안 내 차례마다 보호 3까지' }] },
    { id: 'e5_shatter', row: 8, b: '서리', tier: '중급', n: '빙결 파쇄', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 37 }, { k: 'elShatter', per: 8, txt: '둔화를 모두 지우고 둔화 1마다 피해 +8' }] },
    { id: 'e5_coldwave', row: 8, b: '서리', tier: '중급', n: '한파', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'e5_charge', row: 1, b: '마력', tier: '하급', n: '마력 응축', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elCharge', n: 4, add: 8, txt: '다음 기본 공격 4번 피해 +8' }] },
    { id: 'e5_barrier', row: 1, b: '마력', tier: '하급', n: '마력 방벽', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'ward', n: 28 }] },
    { id: 'e5_mark', row: 1, b: '마력', tier: '하급', n: '약화의 표식', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'vuln', n: 1 }] },
    { id: 'e5_volley', row: 4, b: '마력', tier: '하급', n: '마력 연사', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elMulti', n: 6, shots: 2, txt: '다음 기본 공격 6번이 두 발' }] },
    { id: 'e5_mirror', row: 4, b: '마력', tier: '하급', n: '거울 장막', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'thorn', times: 2, dmg: 15 }] },
    { id: 'e5_arcane', row: 8, b: '마력', tier: '중급', n: '비전 일격', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 30 }, { k: 'elArcane', mul: 2, txt: '취약 걸린 적에게 ×2' }] },
    { id: 'e5_ward', row: 8, b: '마력', tier: '중급', n: '마력 결계', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elBarrier', r: 6, red: 0.42, txt: '6라운드 받는 피해 −42%' }] },
    { id: 'e5_weave', row: 4, b: '빙염', tier: '하급', n: '원소 엮기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'ignite', n: 1 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e5_catalyst', row: 4, b: '빙염', tier: '하급', n: '촉매', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elCat', mul: 2.1, txt: '이번 차례 열충격 2.1배' }] },
    { id: 'e5_arc', row: 8, b: '빙염', tier: '중급', n: '튀는 충격', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'ignite', n: 1 }, { k: 'st', s: 'chill', n: 1 }, { k: 'shockx', arc: 0.5 }] },
    { id: 'e5_storm', row: 8, b: '빙염', tier: '중급', n: '원소 폭풍', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'st', s: 'ignite', n: 1 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e5_avatar', row: 10, b: '빙염', tier: '중급', n: '빙염의 화신', tgt: 'self', time: 'normal', cd: 4, line: '「불도 얼음도, 이 몸 안에서는 하나일 뿐이니.」', cut: 'arcane', pay: '그동안 내 차례마다 최대 생명력의 5%를 잃는다.', fx: [{ k: 'elAvatar', r: 3, txt: '3차례 동안 내 모든 공격이 화상 1과 둔화 1을 함께 건다(맞히는 족족 열충격).' }] },
    { id: 'e5_frostbolt', row: 4, b: '정적', tier: '하급', n: '얼음 탄환', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 23 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e5_stillward', row: 4, b: '정적', tier: '하급', n: '고요한 방벽', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elProtR', n: 2, r: 6, txt: '6라운드 동안 내 차례마다 보호 2까지' }] },
    { id: 'e5_shardrain', row: 8, b: '정적', tier: '중급', n: '얼음 파편비', tgt: 'all', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'e5_stilleye', row: 8, b: '정적', tier: '중급', n: '고요의 눈', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'foresee', red: 0.55, rounds: 10 }] },
    { id: 'e5_stasis', row: 10, b: '정적', tier: '중급', n: '영겁의 정적', tgt: 'self', time: 'normal', cd: 4, line: '「모든 것이 멈춘 이 한순간만이, 나락에서 유일한 고요로구나.」', cut: 'guard', pay: '내 다음 차례도 아무것도 못 한다(나도 함께 멈춘다).', fx: [{ k: 'elStasis', r: 2, txt: '이번 라운드와 다음 라운드 모든 적이 행동을 놓친다(강적 · 보스는 대신 둔화 3). 빙결 · 정적으로 행동을 놓친 적은 그다음 라운드가 끝날 때까지 다시 멈추지 않고 둔화만 받는다.' }] },
    { id: 'e5_manaflame', row: 4, b: '마염', tier: '하급', n: '마염탄', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 24 }, { k: 'st', s: 'ignite', n: 2 }] },
    { id: 'e5_kindlemana', row: 4, b: '마염', tier: '하급', n: '불씨 응축', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elCharge', n: 6, mul: 1, ign: 2, txt: '다음 기본 공격 6번에 화상 2' }] },
    { id: 'e5_flamelance', row: 8, b: '마염', tier: '중급', n: '불꽃 창', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 36 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] },
    { id: 'e5_heatshield', row: 8, b: '마염', tier: '중급', n: '열기 방패', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elIgnGuard', red: 0.6, txt: '이번 전투 동안 화상 걸린 적이 주는 피해 −60%' }] },
    { id: 'e5_meteor', row: 10, b: '마염', tier: '중급', n: '천화', tgt: 'all', time: 'normal', cd: 4, line: '「타올라라. 이 나락에 내린 불의 비가, 너희의 마지막 하늘이 될 터이니.」', cut: 'blade', pay: '쓰는 즉시 지금 생명력의 절반을 바친다.', fx: [{ k: 'dmg', n: 39 }, { k: 'elMeteor' }, { k: 'st', s: 'ignite', n: 3 }] },
    { id: 'e5_frostember', row: 7, b: '결합', tier: '중급', n: '얼어붙은 불씨', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elFrostEmber', n: 1, txt: '이번 전투: 둔화 걸린 적에게 화상을 걸면 화상 +1' }] },
    { id: 'e5_frostwall', row: 7, b: '결합', tier: '중급', n: '서리 방벽', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elFrostWall', n: 1, txt: '이번 전투: 보호나 보호막이 있을 때 나를 친 적에게 둔화 1' }] },
    { id: 'e5_manafire', row: 7, b: '결합', tier: '중급', n: '마염 화살', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'elManaFire', n: 1, txt: '이번 전투: 화상 걸린 적을 기본 공격으로 치면 화상 +1' }] },
    /* ===== M5-5 원소술사 끝 ===== */
  ],
  spellblade: [
    /* 마검사 (10월 7일, docs/직업/마검사.md): kind 'cut' ⚔ 베기 · 'spell' ✦ 주문. 베기와 주문을 번갈아 쓰면 교대(직업 보호막 +4, 내 차례마다 한 번).
       새 효과: imbue(칼에 싣기) · edgeX(칼 ×) · kwx(쓰기 직전 그 상태였던 적에게 ×) · alt(교대 보상, run 2) · killSpread(쓰러뜨려 출혈 퍼뜨리기), exploit의 s · take, hasten on 'alt' · 'kill' */
    // 시작
    { id: 'sb_edge', b: '시작', tier: '시작', start: 1, n: '마검 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 35 }] },
    { id: 'sb_aegis', b: '시작', tier: '시작', start: 1, n: '주문 방패', kind: 'spell', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'ward', n: 10 }, { k: 'st', s: 'protect', n: 1 }] },
    // 혈인
    { id: 'sb_blooddrop', row: 1, b: '혈인', tier: '하급', n: '핏방울', kind: 'cut', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 1 }] }, // 0.8.0 M5-0 리듬 칸(비용 1, 교대 아님)
    { id: 'sb_bleedcut', row: 1, b: '혈인', tier: '하급', n: '혈흔 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 5 }] },
    { id: 'sb_sweepcut', row: 1, b: '혈인', tier: '하급', n: '가로 베기', kind: 'cut', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'sb_bloodmark', row: 2, b: '혈인', tier: '하급', n: '피의 낙인', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'imbue', s: 'bleed', n: 5 }] }, /* M5-0c 맞추기 2번(만든 사람 답 2): 값 띠 안에서 평타 쪽으로. 피해 7 → 5, 칼에 싣는 출혈 3 → 4 */
    { id: 'sb_throat', row: 2, b: '혈인', tier: '하급', n: '숨통 끊기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 15 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'sb_deepline', row: 3, b: '혈인', tier: '하급', n: '스치는 칼', kind: 'cut', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'bleed', n: 4 }] },
    { id: 'sb_redwind', row: 3, b: '혈인', tier: '하급', n: '붉은 바람', kind: 'spell', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'sb_taste', row: 4, b: '혈인', tier: '하급', n: '혈향', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 7 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'imbue', s: 'bleed', n: 3 }] }, /* M5-0c 맞추기 2번: 처형 길에 칼에 싣기(기본 공격이 출혈을 나른다), 피해 9 → 5 */ /* M5-0c 만든 사람 답(10월 20일): 길마다 1고리 · 2고리를 베기 · 주문으로 엇갈리게 */
    { id: 'sb_chaincut', row: 4, b: '혈인', tier: '하급', n: '혈인 연참', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, killRecharge: 1, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'bleed', n: 2 }] },
    { id: 'sb_boil', row: 5, b: '혈인', tier: '하급', n: '피 먹인 칼', kind: 'cut', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'imbue', s: 'bleed', n: 7 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 6 }] }, /* M5-0c 만든 사람 답: 싣기 길 2고리는 베기(베고 나서 칼에 출혈을 싣는다). 값 띠: 피해 3, 스태미나 24 → 6 */
    { id: 'sb_splash', row: 5, b: '혈인', tier: '하급', n: '선혈 비산', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'killSpread', per: 1 }] },
    { id: 'sb_vein', row: 6, b: '혈인', tier: '하급', n: '핏줄 끊기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'exploit', s: 'bleed', per: 3 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'sb_whirl', row: 6, b: '혈인', tier: '하급', n: '혈풍참', kind: 'cut', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'hasten', n: 1, on: 'kill' }] },
    { id: 'sb_pour', row: 7, b: '혈인', tier: '중급', n: '혈류 파열', kind: 'cut', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'bleed', n: 6 }, { k: 'brk', n: 35 }] },
    { id: 'sb_execchain', row: 7, b: '혈인', tier: '중급', n: '연쇄 처형', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, killRecharge: 1, fx: [{ k: 'dmg', n: 19 }, { k: 'kwx', s: 'bleed', mul: 1.5 }] },
    { id: 'sb_bloodfog', row: 8, b: '혈인', tier: '중급', n: '피안개', kind: 'spell', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'st', s: 'bleed', n: 5 }, { k: 'imbue', s: 'bleed', n: 5 }] }, /* M5-0c: 3고리 값 띠(칼에 싣는 출혈 5 → 4) */
    { id: 'sb_redrain', row: 8, b: '혈인', tier: '중급', n: '선혈 수확', kind: 'spell', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 9 }, { k: 'exploit', s: 'bleed', per: 1.5 }] },
    { id: 'sb_draw', row: 9, b: '혈인', tier: '중급', n: '혈각참', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'edgeX', mul: 2 }] },
    { id: 'sb_redstorm', row: 9, b: '혈인', tier: '중급', n: '붉은 회오리', kind: 'cut', tgt: 'front', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'bleed', n: 1 }, { k: 'killSpread', per: 1 }] },
    { id: 'sb_crimson', row: 10, b: '혈인', tier: '중급', n: '붉은 처형', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 13 }, { k: 'exploit', s: 'bleed', per: 10, take: 1 }, { k: 'lowx', hp: 0.35, mul: 1.5 }] },
    { id: 'sb_feast', row: 10, b: '혈인', tier: '중급', n: '선혈 난무', kind: 'cut', tgt: 'front', time: 'normal', cd: 10, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'hasten', n: 2, on: 'kill' }] },
    { id: 'sb_scarlet', row: 11, b: '혈인', tier: '상급', n: '선홍 표식', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 5 }, { k: 'imbue', s: 'bleed', n: 7 }] },
    { id: 'sb_pathway', row: 11, b: '혈인', tier: '상급', n: '혈로 개척', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, killRecharge: 1, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'lowx', hp: 0.3, mul: 1.5 }] },
    { id: 'sb_thirst', row: 12, b: '혈인', tier: '상급', n: '혈갈', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'exploit', s: 'bleed', per: 3.5 }] },
    { id: 'sb_gale', row: 12, b: '혈인', tier: '상급', n: '피바람 가르기', kind: 'cut', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 2 }, { k: 'killSpread', per: 1.5 }] },
    { id: 'sb_ledger', row: 13, b: '혈인', tier: '상급', n: '피의 결산', kind: 'cut', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 5 }, { k: 'st', s: 'bleed', n: 3 }, { k: 'exploit', s: 'bleed', per: 6 }, { k: 'lowx', hp: 0.35, mul: 1.5 }] },
    { id: 'sb_deluge', row: 13, b: '혈인', tier: '상급', n: '혈우 낙하', kind: 'spell', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'bleed', n: 4 }, { k: 'killSpread', per: 1 }] },
    // 염검
    { id: 'sb_spark', row: 1, b: '염검', tier: '하급', n: '불티', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'ignite', n: 1 }] }, // 0.8.0 M5-0 리듬 칸(비용 1, 교대 아님)
    { id: 'sb_flamecut', row: 1, b: '염검', tier: '하급', n: '염화 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'imbue', s: 'ignite', n: 4 }] }, // M5-0 보정 5 1고리 갈림: 근접, 칼에 화상 싣기
    { id: 'sb_ember', row: 1, b: '염검', tier: '하급', n: '불씨 투척', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'sb_sparkcut', row: 1, b: '염검', tier: '하급', n: '불씨 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, hits: 2, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'ignite', n: 4 }] },
    { id: 'sb_flare', row: 2, b: '염검', tier: '하급', n: '불꽃 탄', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'st', s: 'ignite', n: 2 }, { k: 'imbue', s: 'ignite', n: 4 }] },
    { id: 'sb_heated', row: 2, b: '염검', tier: '하급', n: '작열검', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] },
    { id: 'sb_ring', row: 3, b: '염검', tier: '하급', n: '화염 고리', kind: 'spell', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 7 }, { k: 'st', s: 'ignite', n: 1 }, { k: 'imbue', s: 'ignite', n: 5 }] },
    { id: 'sb_kindle', row: 3, b: '염검', tier: '하급', n: '염화 부여', kind: 'spell', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'imbue', s: 'ignite', n: 7 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 21 }] },
    { id: 'sb_snuff', row: 4, b: '염검', tier: '하급', n: '끊는 불길', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'cutx', brk: 60 }] },
    { id: 'sb_char', row: 4, b: '염검', tier: '하급', n: '잔화', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 11 }, { k: 'exploit', s: 'ignite', per: 2.5 }] }, /* M5-0c: 2고리 값 띠(피해 6 → 7). 만든 사람 답: 칼불 길 2고리는 주문(잔화 베기 → 잔화) */
    { id: 'sb_brand', row: 5, b: '염검', tier: '하급', n: '불의 표식', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] }, /* M5-0c: 2고리 값 띠(피해 10 → 7) */ /* M5-0c 만든 사람 답(10월 20일): 길마다 1고리 · 2고리를 베기 · 주문으로 엇갈리게 */
    { id: 'sb_flamedown', row: 5, b: '염검', tier: '하급', n: '염검 강하', kind: 'cut', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 17 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'brk', n: 41 }] },
    { id: 'sb_sear', row: 6, b: '염검', tier: '하급', n: '작열참', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'ignite', n: 4 }] },
    { id: 'sb_flamedance', row: 6, b: '염검', tier: '하급', n: '불꽃 칼춤', kind: 'cut', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 13 }, { k: 'kwx', s: 'ignite', mul: 1.5 }] },
    { id: 'sb_lance', row: 7, b: '염검', tier: '중급', n: '화염 창', kind: 'spell', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'ignite', n: 5 }, { k: 'lowx', hp: 0.35, mul: 1.75 }] },
    { id: 'sb_rush', row: 7, b: '염검', tier: '중급', n: '화염 연참', kind: 'cut', tgt: 'melee', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 6 }, { k: 'kwx', s: 'ignite', mul: 1.3 }, { k: 'edgeX', mul: 2 }] },
    { id: 'sb_tome', row: 8, b: '염검', tier: '중급', n: '불의 서', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'st', s: 'ignite', n: 9 }, { k: 'imbue', s: 'ignite', n: 6 }] },
    { id: 'sb_coil', row: 8, b: '염검', tier: '중급', n: '염화 결속', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 8 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'imbue', s: 'ignite', n: 5 }] },
    { id: 'sb_chainfire', row: 9, b: '염검', tier: '중급', n: '불꽃 사슬', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'ignite', n: 2 }] },
    { id: 'sb_blaze', row: 9, b: '염검', tier: '중급', n: '타오르는 일격', kind: 'cut', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 22 }, { k: 'kwx', s: 'ignite', mul: 1.5 }, { k: 'brk', n: 51 }] },
    { id: 'sb_hellfire', row: 10, b: '염검', tier: '중급', n: '업화', kind: 'spell', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 31 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'cutx', brk: 58 }] },
    { id: 'sb_judgefire', row: 10, b: '염검', tier: '중급', n: '불의 심판', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 12 }, { k: 'exploit', s: 'ignite', per: 5 }, { k: 'edgeX', mul: 2 }] },
    { id: 'sb_pyre', row: 11, b: '염검', tier: '상급', n: '꺼지지 않는 불', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'ignite', n: 5 }, { k: 'imbue', s: 'ignite', n: 5 }] },
    { id: 'sb_inferno', row: 11, b: '염검', tier: '상급', n: '화염 난도', kind: 'cut', tgt: 'melee', time: 'normal', cd: 8, hits: 3, fx: [{ k: 'dmg', n: 9 }, { k: 'st', s: 'ignite', n: 2 }, { k: 'kwx', s: 'ignite', mul: 1.3 }] },
    { id: 'sb_ashcut', row: 12, b: '염검', tier: '상급', n: '잔화검', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'st', s: 'ignite', n: 3 }, { k: 'exploit', s: 'ignite', per: 3 }] },
    { id: 'sb_whet', row: 12, b: '염검', tier: '상급', n: '칼날 달구기', kind: 'spell', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'imbue', s: 'ignite', n: 11 }, { k: 'st', s: 'protect', n: 1 }, { k: 'stam', n: 25 }] },
    { id: 'sb_firefall', row: 13, b: '염검', tier: '상급', n: '불벼락', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'ignite', n: 3 }, { k: 'exploit', s: 'ignite', per: 3 }, { k: 'cutx', brk: 32 }] },
    { id: 'sb_drake', row: 13, b: '염검', tier: '상급', n: '화룡 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'ignite', n: 4 }, { k: 'kwx', s: 'ignite', mul: 1.5 }, { k: 'edgeX', mul: 2 }] },
    // 마갑
    { id: 'sb_bladeward', row: 1, b: '마갑', tier: '하급', n: '마갑참', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'ward', n: 7 }] },
    { id: 'sb_counter', row: 1, b: '마갑', tier: '하급', n: '맞받아 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 21 }, { k: 'alt', ward: 4 }] },
    { id: 'sb_bolt', row: 2, b: '마갑', tier: '하급', n: '마갑탄', kind: 'spell', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 12 }, { k: 'wardDmg', per: 0.5, spend: 0.5, cap: 12 }] },
    { id: 'sb_shard', row: 1, b: '마갑', tier: '하급', n: '마력 파편', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 12 }] }, // 0.8.0 M5-0 보정(10월 20일 만든 사람) 리듬 칸(비용 1, 교대 아님): 피해만 작게, 보호막 없음
    { id: 'sb_unravel', row: 2, b: '마갑', tier: '하급', n: '마력 교란', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'weak', n: 2 }, { k: 'alt', protect: 1 }] },
    { id: 'sb_shell', row: 3, b: '마갑', tier: '하급', n: '마갑 휘두르기', kind: 'cut', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 6 }, { k: 'ward', n: 13 }, { k: 'st', s: 'protect', n: 1 }] }, /* M5-0c: 2고리 비용 2 값 띠. 만든 사람 답: 포격 길 2고리는 베기(마갑 전개 → 마갑 휘두르기, 피해 5 · 보호막 10 · 보호 1) */
    { id: 'sb_beatcut', row: 3, b: '마갑', tier: '하급', n: '교차 주문', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 10 }, { k: 'alt', run: 2, brk: 30 }] }, /* M5-0c: 2고리 값 띠(피해 14 → 12). 만든 사람 답: 교대 붕괴 길 2고리는 주문(교차참 → 교차 주문) */
    { id: 'sb_rebuke', row: 4, b: '마갑', tier: '하급', n: '마갑 파쇄', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 8 }, { k: 'wardBurn', mul: 2.5, max: 6 }, { k: 'brk', n: 36 }] },
    { id: 'sb_rebound', row: 4, b: '마갑', tier: '하급', n: '반향 주문', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'cutx', brk: 41 }, { k: 'alt', stam: 10 }] },
    { id: 'sb_wardbolt', row: 5, b: '마갑', tier: '하급', n: '방벽 포격', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'wardDmg', per: 1, spend: 0.5, cap: 18 }] },
    { id: 'sb_turn', row: 5, b: '마갑', tier: '하급', n: '회류참', kind: 'cut', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'alt', ward: 4 }, { k: 'hasten', n: 1, on: 'alt' }] },
    { id: 'sb_wardburst', row: 6, b: '마갑', tier: '하급', n: '방벽 해방', kind: 'spell', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'wardBurn', mul: 1.5, max: 8 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'sb_sunder', row: 6, b: '마갑', tier: '하급', n: '균열 주문', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 8 }, { k: 'alt', run: 2, brk: 30 }] },
    { id: 'sb_armor', row: 7, b: '마갑', tier: '중급', n: '마갑 연성', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'wardFill', to: 0.5 }, { k: 'dmg', n: 17 }, { k: 'brk', n: 23 }] },
    { id: 'sb_weave', row: 7, b: '마갑', tier: '중급', n: '마검 교직', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, hits: 2, fx: [{ k: 'dmg', n: 11 }, { k: 'alt', run: 2, brk: 35, ward: 4 }] },
    { id: 'sb_spellguard', row: 8, b: '마갑', tier: '중급', n: '마갑 방출', kind: 'spell', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 12 }, { k: 'wardDmg', per: 0.8, spend: 1, drainAll: true, cap: 20 }] }, /* M5-0c: 3고리 비용 3 값 띠(피해 7 → 8, 보호막 비례 0.5 → 0.8, 상한 16 → 20) */
    { id: 'sb_reverse', row: 8, b: '마갑', tier: '중급', n: '역영창', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 19 }, { k: 'brk', n: 11 }, { k: 'alt', run: 2, ward: 6, protect: 2 }] },
    { id: 'sb_embershell', row: 9, b: '마갑', tier: '중급', n: '잔화 방벽', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'wardBurn', mul: 3.7, max: 9 }, { k: 'ward', n: 6 }] },
    { id: 'sb_rhythm', row: 9, b: '마갑', tier: '중급', n: '마검 연무', kind: 'cut', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 12 }, { k: 'alt', ward: 4 }, { k: 'hasten', n: 1, on: 'alt' }] },
    { id: 'sb_shatter', row: 10, b: '마갑', tier: '중급', n: '갑주 해방', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'wardBurn', mul: 1.8 }, { k: 'brk', n: 18 }, { k: 'lowx', hp: 0.35, mul: 1.4 }] },
    { id: 'sb_finale', row: 10, b: '마갑', tier: '중급', n: '마검 일섬', kind: 'cut', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 33 }, { k: 'brk', n: 31 }, { k: 'alt', run: 2, brk: 30 }, { k: 'brokenx', mul: 1.5 }] },
    /* ===== 0.8.0 M5-0 마검사 경계 (10월 19일 만든 사람 결정, 문장 그대로). b = 경계 이름. 새 효과는 js/10-skills-engine.js의 마검사 경계 절, 값(v)은 data/skillkit.js skValue의 경계 식 ===== */
    { id: 'sb_bloodfire', row: 4, b: '혈염', tier: '중급', n: '핏불 싣기', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'imbue', s: 'bleed', n: 4 }, { k: 'imbue', s: 'ignite', n: 5, also: 1, txt: '칼에 출혈 4 · 화상 5를 함께 싣는다.' }] },
    { id: 'sb_searcut', row: 7, b: '혈염', tier: '중급', n: '혈염 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 30 }, { k: 'searMerge', txt: '출혈 · 화상이 둘 다 걸린 적을 베면 둘을 합쳐 새 상태 혈염으로 바꾼다. 혈염은 차례마다 (출혈 + 화상) × 1.5 피해를 주고 정화되지 않는다. 혈염 걸린 적이 있는 동안 교대 보호막이 없다.' }] }, /* M5-0c 맞추기 2번: 3고리 값 띠 안에서 피해 20 → 22 */
    { id: 'sb_kalpa', row: 10, b: '혈염', tier: '중급', n: '겁화', kind: 'spell', tgt: 'self', time: 'normal', cd: 9, line: '「피와 화염이 몸을 감싸니, 그것은 곧 겁화일지어다.」', cut: 'blade', pay: '보호막 전부 소실, 받는 피해 +30%.', fx: [{ k: 'sbBlaze', n: 3, txt: '3차례 동안 모든 베기에 혈염, 주는 피해 +100%.' }] }, // M5-0a: 대사(line) · 컷인(cut) · 대가(pay)는 따로
    { id: 'sb_bloodmail', row: 4, b: '죄인의 피', tier: '중급', n: '피의 갑주', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'wardPer', s: 'bleed', n: 22, txt: '출혈 걸린 적 하나마다 보호막 +22.' }] },
    { id: 'sb_film', row: 7, b: '죄인의 피', tier: '중급', n: '피막', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'sbFilm', txt: '이번 차례 보호막으로 받아낸 피해의 75%를 그 적에게 출혈로.' }] }, // M5-0 보정 5(만든 사람): 3고리 공격 칸으로(베기 + 피막)
    { id: 'sb_sinwall', row: 10, b: '죄인의 피', tier: '중급', n: '죄인의 벽', kind: 'spell', tgt: 'self', time: 'normal', cd: 9, line: '「아아, 죄인의 피가 오만방자하게도 모든 것을 가로막고자 하는구나.」', cut: 'guard', pay: '최대 생명력 15%를 바친다.', fx: [{ k: 'sbSinWall', txt: '바친 생명력의 3.5배만큼 보호막. 깨지면 전열 모두에게 출혈 7.' }] },
    { id: 'sb_heatmail', row: 4, b: '유산의 불', tier: '중급', n: '달군 갑주', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'sbHeat', txt: '보호막을 태워 다음 기본 공격 ×3.2.' }] },
    { id: 'sb_embermail', row: 7, b: '유산의 불', tier: '중급', n: '잿불 갑주', kind: 'spell', tgt: 'self', time: 'normal', cd: 6, fx: [{ k: 'sbEmberMail', txt: '보호막이 남아 있는 동안 기본 공격 · 강공격에 화상 7을 싣는다.' }] },
    { id: 'sb_firebody', row: 10, b: '유산의 불', tier: '중급', n: '불의 몸', kind: 'spell', tgt: 'self', time: 'normal', cd: 9, line: '「모든 것을 불태웠을 과거의 유산은, 결국 자신도 불태우기 마련이다.」', cut: 'arcane', pay: '남은 유산을 전부 태운다. 그동안 유산 0(스킬 없음, 평타만).', fx: [{ k: 'sbFireBody', n: 3, txt: '3차례 "불의 몸": 태운 유산 1마다 보호막 +11, 기본 공격 · 강공격 ×1.8 + 화상 5, 받는 화상 무효.' }] },
    /* 0.8.0 M5-0 보정 4(10월 20일 만든 사람 초안): 경계 둘째 칸(2고리) · 3고리 둘째. 꼴은 초안 그대로, 숫자는 값 띠에 맞췄다(data/skillkit.js SB_BOUND). 엔진은 js/10-skills-engine.js 마검사 경계 절 */
    { id: 'sb_hotedge', row: 5, b: '혈염', tier: '중급', n: '달아오른 칼날', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'sbCross', txt: '출혈 걸린 적에게 화상 +5, 화상 걸린 적에게 출혈 +5.' }] },
    { id: 'sb_searspread', row: 8, b: '혈염', tier: '중급', n: '핏불 번짐', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'searSpread', txt: '혈염 걸린 적을 쓰러뜨리면 곁의 적에게 그 혈염.' }] },
    { id: 'sb_searveil', row: 8, b: '혈염', tier: '중급', n: '핏불 장막', kind: 'spell', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'ward', n: 30 }, { k: 'wardPer', s: 'sear', n: 10, txt: '혈염 걸린 적 하나마다 보호막 +10(보호막 상한까지).' }] }, // 0.8.0 M5-0c(10월 20일 만든 사람): 혈염 3고리 방어 칸. 혈염 걸린 적 하나마다 보호막 +10(혈염의 대가 "교대 보호막 없음"을 메운다). 값 띠에 맞춰 바탕 보호막 22
    { id: 'sb_sinstrike', row: 5, b: '죄인의 피', tier: '중급', n: '죄인의 일격', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 11 }, { k: 'wardDmg', per: 0.5, spend: 0, cap: 12 }, { k: 'st', s: 'bleed', n: 2 }] }, // M5-0 보정 5: 막아 낸 만큼 되갚는 칼(지금 보호막에 비례한 피해 + 출혈, 보호막은 쓰지 않음)
    { id: 'sb_shackle', row: 8, b: '죄인의 피', tier: '중급', n: '피의 족쇄', kind: 'spell', tgt: 'self', time: 'normal', cd: 6, fx: [{ k: 'sbShackle', txt: '이번 전투 동안 출혈 걸린 적의 강타를 막아 내면 그 적에게 붕괴 +115.' }] },
    { id: 'sb_embercut', row: 5, b: '유산의 불', tier: '중급', n: '잿불 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'sbEmberCut', txt: '보호막을 6까지 태워 그만큼 화상을 건다.' }] }, // M5-0 보정 5: 보호막을 조금 태워 그만큼 화상
    /* 0.8.0 M5-0 보정 5 P3 결합 칸(꼬리표 조건, 부채꼴 밖) · P4 경계 승부수 후보(판마다 둘 중 하나) */
    { id: 'sb_bloodfist', row: 5, b: '결합', tier: '중급', n: '피 묻은 주먹', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'sbFist', txt: '이번 전투 동안 기본 공격이 출혈 걸린 적에게 ×1.6.' }] },
    { id: 'sb_counterburn', row: 5, b: '결합', tier: '중급', n: '되받아 태우기', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'sbCounterBurn', txt: '이번 전투 동안 흘리기에 성공하면 그 적에게 화상 4.' }] },
    { id: 'sb_tricolor', row: 7, b: '결합', tier: '중급', n: '삼색검', kind: 'spell', tgt: 'self', time: 'normal', cd: 6, fx: [{ k: 'sbTricolor', txt: '이번 전투 동안 보호막이 있을 때 출혈 · 화상이 함께 걸린 적이 있으면 베기 스킬 비용 −1(바닥 1, 내 차례에 한 번, 전투에 두 번).' }] },
    { id: 'sb_searburst', row: 10, b: '혈염', tier: '중급', n: '혈염 터뜨리기', kind: 'spell', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 11 }, { k: 'searBurst', mul: 3, txt: '혈염 걸린 적마다 그 혈염 × 3 피해(혈염은 남는다).' }] },
    { id: 'sb_atone', row: 10, b: '죄인의 피', tier: '중급', n: '속죄의 칼', kind: 'cut', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 22 }, { k: 'wardBurn', mul: 1 }, { k: 'st', s: 'bleed', n: 5 }] },
    { id: 'sb_ashstorm', row: 10, b: '유산의 불', tier: '중급', n: '잿더미 폭풍', kind: 'spell', tgt: 'front', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'ignite', n: 5 }] },
    { id: 'sb_bloodecho', row: 5, b: '죄인의 피', tier: '중급', n: '피의 반향', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'sbEcho', txt: '이번 전투 동안 보호막이 있으면 베기가 출혈 +2 더.' }] }, // M5-0 보정 5에서 트리에서 뺐다(죄인의 일격으로). 데이터는 남긴다
    { id: 'sb_ashhand', row: 5, b: '유산의 불', tier: '중급', n: '재 묻은 손', kind: 'spell', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'sbAshHand', txt: '다음 기본 공격 2번에 화상 3.' }] }, // M5-0 보정 5에서 트리에서 뺐다(잿불 베기로)
    { id: 'sb_cindermail', row: 8, b: '유산의 불', tier: '중급', n: '불씨 갑주', kind: 'cut', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'sbCinder', txt: '이번 전투 동안 보호막이 피해로 깎일 때마다 전열에 화상 1.' }] }, // M5-0 보정 5(만든 사람): 3고리 공격 칸으로(베기 + 불씨 갑주)
    { id: 'sb_bulwark', row: 11, b: '마갑', tier: '상급', n: '방벽 베기', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'wardFill', to: 0.75 }, { k: 'dmg', n: 16 }, { k: 'brk', n: 27 }] },
    { id: 'sb_measure', row: 11, b: '마갑', tier: '상급', n: '교차 일섬', kind: 'cut', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 25 }, { k: 'alt', run: 2, brk: 40, ward: 4 }] },
    { id: 'sb_barrage', row: 12, b: '마갑', tier: '상급', n: '방벽 포격', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 23 }, { k: 'wardDmg', per: 1, spend: 0.5, cap: 22 }, { k: 'ward', n: 4 }] },
    { id: 'sb_twin', row: 12, b: '마갑', tier: '상급', n: '이중 영창', kind: 'spell', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 24 }, { k: 'cutx', brk: 53 }, { k: 'alt', run: 2, ward: 8, protect: 2 }] },
    { id: 'sb_breakwall', row: 13, b: '마갑', tier: '상급', n: '방벽 파쇄', kind: 'cut', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'wardBurn', mul: 3.1, max: 9 }, { k: 'brk', n: 15 }, { k: 'lowx', hp: 0.35, mul: 1.5 }] },
    { id: 'sb_coda', row: 13, b: '마갑', tier: '상급', n: '마검 종곡', kind: 'cut', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'brk', n: 26 }, { k: 'alt', run: 2, brk: 30, ward: 4 }] },
  ],
  monk: [
    // 수도승 (10월 7일 구현, docs/직업/수도승.md): 시작 스킬 둘 + 철권 · 부동 · 혈도 60칸. 새 효과 stance · kiBurst · kiPer · kiGrow · sealx, meSt if: chill, hasten on: ctr (index.html runSkill2 · monkCounter)
    // 시작 스킬: 트리 밖. 기의 첫 출구가 되는 공격 하나(주 행동), 빠른 자세 하나. "⚡로 자세를 잡고, ▶로 공격"을 Lv1부터 가르친다
    { id: 'm_palm', b: '시작', tier: '시작', start: 1, n: '정권 지르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 26 }, { k: 'kiBurst', per: 3, max: 3 }] },
    { id: 'm_brace', b: '시작', tier: '시작', start: 1, n: '받아칠 자세', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'stance', dmg: 6 }, { k: 'stam', n: 31 }] },

    // 철권: 빠른 연타로 기를 쌓고, 모은 기를 한 주먹에 몰아친다. 왼쪽 기둥은 연타(⚡ 연타 · 기 하나로 모든 타격이 세지는 ▶ 연타), 오른쪽은 기공(모으기 · 키우기 · 터뜨리기). 거구에 강하고 무리에 약하다
    { id: 'm_jab', row: 1, b: '철권', tier: '하급', n: '짧은 지르기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 17 }] },
    { id: 'm_rush', row: 1, b: '철권', tier: '하급', n: '쏟아치기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'kiBurst', per: 8 }] },
    { id: 'm_double', row: 2, b: '철권', tier: '하급', n: '두 번 지르기', tgt: 'melee', time: 'fast', cd: 4, hits: 2, fx: [{ k: 'dmg', n: 9 }] },
    { id: 'm_breath', row: 2, b: '철권', tier: '하급', n: '기 모으기', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'st', s: 'empower', n: 3 }, { k: 'stam', n: 57 }] },
    { id: 'm_triple', row: 3, b: '철권', tier: '하급', n: '삼연격', tgt: 'melee', time: 'normal', cd: 7, hits: 3, fx: [{ k: 'dmg', n: 9 }] },
    { id: 'm_kifist', row: 3, b: '철권', tier: '하급', n: '기공권', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'kiPer', per: 3 }] },
    { id: 'm_knee', row: 4, b: '철권', tier: '하급', n: '무릎 차기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 38 }] }, // 짧은 지르기(피해)와 갈라 붕괴 쪽: 피해는 더 작다
    { id: 'm_surge', row: 4, b: '철권', tier: '하급', n: '승기권', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'kiGrow', add: 1, mul: 2 }] },
    { id: 'm_barrage', row: 5, b: '철권', tier: '하급', n: '몰아치는 주먹', tgt: 'melee', time: 'normal', cd: 6, hits: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'meSt', s: 'empower', n: 1 }] }, // 기 1을 싣고 때린 뒤 1을 돌려받는다(기를 지키는 연타)
    { id: 'm_shock', row: 5, b: '철권', tier: '하급', n: '기 충격파', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 9 }, { k: 'kiBurst', per: 5 }] }, // 2챕터 요구(갈래마다 5줄 안에 광역): 땅속 · 뼈 더미 대책
    { id: 'm_gale', row: 6, b: '철권', tier: '하급', n: '질풍 지르기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 21 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'm_kistrike', row: 6, b: '철권', tier: '하급', n: '기공 일격', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 15 }, { k: 'kiBurst', per: 5, max: 3, brk: 6 }, { k: 'bigx', mul: 1.5 }] }, // bigx는 max 3 칸에만: 한 방 상한 (12 + 15) × 1.5 = 40.5
    { id: 'm_hundred', row: 7, b: '철권', tier: '중급', n: '백렬권', tgt: 'melee', time: 'normal', cd: 7, hits: 5, fx: [{ k: 'dmg', n: 4 }, { k: 'kiPer', per: 1 }] }, // 기 비례가 타격마다 붙는 연타: 기 0이면 10, 기 3이면 25, 기 5면 35 (기는 1만 쓴다)
    { id: 'm_kiblast', row: 7, b: '철권', tier: '중급', n: '기 폭발', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 14 }, { k: 'kiBurst', per: 7, max: 4, brk: 12 }] }, // 붕괴로 터뜨리기: 기 4까지, 붕괴 최대 48. 남은 기는 그대로
    { id: 'm_flow', row: 8, b: '철권', tier: '중급', n: '흐르는 주먹', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 19 }, { k: 'meSt', s: 'empower', n: 1 }] }, // meSt 강화는 피해 뒤(공통 변경)라 순 +1, 직업 규칙의 ⚡ 기 +1과 따로
    { id: 'm_wave', row: 8, b: '철권', tier: '중급', n: '장풍', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'kiBurst', per: 8 }] },
    { id: 'm_endless', row: 9, b: '철권', tier: '중급', n: '멈추지 않는 주먹', tgt: 'melee', time: 'normal', cd: 6, killRecharge: 1, fx: [{ k: 'dmg', n: 26 }] },
    { id: 'm_split', row: 9, b: '철권', tier: '중급', n: '기 가르기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'kiBurst', per: 10, keep: 0.5 }] },
    { id: 'm_storm', row: 10, b: '철권', tier: '중급', n: '연타의 끝', tgt: 'melee', time: 'normal', cd: 8, hits: 6, fx: [{ k: 'dmg', n: 5 }, { k: 'bigx', mul: 1.3 }] }, // 연타 칸에는 brk · st를 두지 않는다(엔진은 붕괴를 타격마다, 점수는 한 번). 큰 적용 연타 마무리
    { id: 'm_release', row: 10, b: '철권', tier: '중급', n: '기공 해방', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 19 }, { k: 'kiBurst', per: 11, brk: 8 }] }, // bigx 없음: 기 5에서 14 + 40 = 54, 붕괴 +40
    // 상급 11~13줄 (3챕터, 10월 8일): 왼쪽 연타는 한 차례에 더 많이 치고 스스로 기를 돌려받는다, 오른쪽 기공은 터뜨린 기를 일부 돌려받아 큰 적에게 큰 한 방을 반복한다. 무리 방에는 새 광역을 더하지 않는다
    { id: 'm_chainfist', row: 11, b: '철권', tier: '상급', n: '연환권', tgt: 'melee', time: 'fast', cd: 5, hits: 3, fx: [{ k: 'dmg', n: 9 }] },
    { id: 'm_dantian', row: 11, b: '철권', tier: '상급', n: '단전 터뜨리기', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 10 }, { k: 'kiBurst', per: 7, max: 4, brk: 10 }, { k: 'meSt', s: 'empower', n: 2 }, { k: 'bigx', mul: 1.4 }] },
    { id: 'm_afterimage', row: 12, b: '철권', tier: '상급', n: '잔상권', tgt: 'melee', time: 'normal', cd: 7, hits: 4, fx: [{ k: 'dmg', n: 5 }, { k: 'kiPer', per: 1 }, { k: 'meSt', s: 'empower', n: 1 }, { k: 'bigx', mul: 1.3 }] },
    { id: 'm_overflow', row: 12, b: '철권', tier: '상급', n: '넘치는 기', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 20 }, { k: 'kiPer', per: 2 }, { k: 'kiGrow', add: 1, mul: 3 }] },
    { id: 'm_tempest', row: 13, b: '철권', tier: '상급', n: '폭풍 연타', tgt: 'melee', time: 'normal', cd: 9, hits: 7, fx: [{ k: 'dmg', n: 4 }, { k: 'meSt', s: 'empower', n: 2 }, { k: 'bigx', mul: 1.4 }] },
    { id: 'm_spirit', row: 13, b: '철권', tier: '상급', n: '기혼 일격', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 18 }, { k: 'kiBurst', per: 10, max: 5, brk: 10 }, { k: 'bigx', mul: 1.4 }] },

    // 부동: 막고 되받는다. 왼쪽 기둥은 자세(되받기의 덤을 키운다), 오른쪽은 되갚기(되받아 쌓은 기만큼 세지는 공격, 전열 밀기). 무리에 강하고 후열에 약하다
    { id: 'm_iron', row: 1, b: '부동', tier: '하급', n: '쇠기둥 자세', tgt: 'self', time: 'normal', cd: 5, fx: [{ k: 'stance', dmg: 22 }] },
    { id: 'm_answer', row: 1, b: '부동', tier: '하급', n: '응수', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 15 }, { k: 'kiPer', per: 6 }] },
    { id: 'm_root', row: 2, b: '부동', tier: '하급', n: '뿌리 내리기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 17, ki: 1 }] },
    { id: 'm_retort', row: 2, b: '부동', tier: '하급', n: '되치기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 20 }, { k: 'kiPer', per: 7 }] },
    { id: 'm_mountain', row: 3, b: '부동', tier: '하급', n: '산처럼', tgt: 'self', time: 'normal', cd: 6, fx: [{ k: 'stance', dmg: 18, brk: 50 }] }, // 쇠기둥(피해)과 갈라 붕괴 쪽. 강타를 되받으면 10 + 25 + 50
    { id: 'm_shove', row: 3, b: '부동', tier: '하급', n: '밀어내는 손', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 13 }, { k: 'brk', n: 20 }] },
    { id: 'm_thorns', row: 4, b: '부동', tier: '하급', n: '천수 받기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 22 }] }, // 이름: 파수꾼 "가시"와 헷갈리지 않게
    { id: 'm_repay', row: 4, b: '부동', tier: '하급', n: '되갚는 발', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 36 }, { k: 'kiPer', per: 7 }] }, // 응수(피해)와 갈라 붕괴 쪽: 피해는 더 작다
    { id: 'm_calm', row: 5, b: '부동', tier: '하급', n: '부동심', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 20, weak: 1 }, { k: 'hasten', n: 1, on: 'ctr' }] }, // 부동의 🔄 되받기 칸은 이 하나뿐, 자세마다 1회
    { id: 'm_rebound', row: 5, b: '부동', tier: '하급', n: '반탄', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 13 }, { k: 'kiPer', per: 6 }] },
    { id: 'm_diamond', row: 6, b: '부동', tier: '하급', n: '금강', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'stance', dmg: 26, ki: 1 }] },
    { id: 'm_breaker', row: 6, b: '부동', tier: '하급', n: '되받아 꺾기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 18 }, { k: 'kiPer', per: 7 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'm_ironmtn', row: 7, b: '부동', tier: '중급', n: '철산고', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'stance', dmg: 26, brk: 20, weak: 2 }] }, // 산처럼과 갈라: 되받은 적에게 약화 2(큰 한 방 뒤의 다음 두 공격을 깎는다)
    { id: 'm_tide', row: 7, b: '부동', tier: '중급', n: '되갚는 물결', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 11 }, { k: 'brk', n: 18 }, { k: 'kiPer', per: 7 }] },
    { id: 'm_still', row: 8, b: '부동', tier: '중급', n: '고요한 받기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 20, chill: 2, ki: 1 }] }, // 둔화 2: 내 다음 차례에도 1이 남아 혈도 칸과 섞을 수 있다
    { id: 'm_hundredfold', row: 8, b: '부동', tier: '중급', n: '백배 갚기', tgt: 'melee', time: 'slow', cd: 8, fx: [{ k: 'dmg', n: 26 }, { k: 'kiPer', per: 13 }] },
    { id: 'm_far', row: 9, b: '부동', tier: '중급', n: '멀리 받아치기', tgt: 'self', time: 'fast', cd: 8, fx: [{ k: 'stance', dmg: 19, far: 1 }, { k: 'stam', n: 23 }] }, // 후열 약점의 출구: 화형(spell)은 여전히 되받지 못한다
    { id: 'm_backlash', row: 9, b: '부동', tier: '중급', n: '되받아 휩쓸기', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 14 }, { k: 'kiPer', per: 7 }, { k: 'st', s: 'weak', n: 1 }] }, // 반탄과 갈라: 전열 모두 약화 1
    { id: 'm_myeongwang', row: 10, b: '부동', tier: '중급', n: '부동명왕', tgt: 'self', time: 'slow', cd: 10, fx: [{ k: 'stance', dmg: 40, brk: 25, ki: 1 }] },
    { id: 'm_final', row: 10, b: '부동', tier: '중급', n: '마지막 응수', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 27 }, { k: 'kiPer', per: 10 }, { k: 'stance' }] }, // 친 뒤 방어 자세: 되갚고 다시 받는 고리의 끝. lowx를 두지 않는다(되받은 몫까지 곱해짐)
    // 상급 11~13줄 (3챕터, 10월 8일): 왼쪽 자세는 되받기 덤과 상한을 키우고 후열 약점을 덜어 준다, 오른쪽 되갚기는 전열 여럿에게 되받은 만큼 돌려준다
    { id: 'm_unbroken', row: 11, b: '부동', tier: '상급', n: '불괴신', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 12 }, { k: 'stance', dmg: 14, ki: 1, weak: 1 }] },
    { id: 'm_wrath', row: 11, b: '부동', tier: '상급', n: '분노의 응수', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 15 }, { k: 'brk', n: 17 }, { k: 'kiPer', per: 7 }, { k: 'stance' }, { k: 'bigx', mul: 1.3 }] },
    { id: 'm_farwall', row: 12, b: '부동', tier: '상급', n: '천리 부동', tgt: 'self', time: 'fast', cd: 6, fx: [{ k: 'stance', dmg: 19, far: 1, ki: 1 }] },
    { id: 'm_wavefall', row: 12, b: '부동', tier: '상급', n: '되갚는 파도', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 12 }, { k: 'kiPer', per: 10 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'm_vajra', row: 13, b: '부동', tier: '상급', n: '부동금강', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 14 }, { k: 'stance', dmg: 15, brk: 22, ki: 2 }] },
    { id: 'm_karma', row: 13, b: '부동', tier: '상급', n: '업보의 일격', tgt: 'front', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 17 }, { k: 'kiPer', per: 12 }, { k: 'brk', n: 17 }] },

    // 혈도: 급소를 눌러 늦추고, 늦춘 적에게서 기를 얻는다. 왼쪽 기둥은 점혈(둔화 · 약화 걸기, 강타 끊기 붕괴, 지원 끊기), 오른쪽은 흡기(이미 둔화된 적에게서 기 얻기, 둔화된 적을 크게). 강타에 강하고 거구에 약하다
    // 둔화 타이밍(문서 B-5): 내 차례에 건 둔화 N은 라운드 시작에 1 줄어 내 다음 차례에 N−1이다. 다음 차례 준비용 칸은 둔화 2, 같은 차례에는 ⚡로 걸고 ▶로 거둔다
    { id: 'm_point', row: 1, b: '혈도', tier: '하급', n: '점혈', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_siphon', row: 1, b: '혈도', tier: '하급', n: '기 빼앗기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 22 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] },
    { id: 'm_finger', row: 2, b: '혈도', tier: '하급', n: '손끝 바람', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'm_lock', row: 2, b: '혈도', tier: '하급', n: '봉맥', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 24 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_sinew', row: 3, b: '혈도', tier: '하급', n: '힘줄 누르기', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 15 }, { k: 'st', s: 'weak', n: 3 }] },
    { id: 'm_drink', row: 3, b: '혈도', tier: '하급', n: '흐름 마시기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 20 }, { k: 'chillx', mul: 1.3 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] },
    { id: 'm_cut', row: 4, b: '혈도', tier: '하급', n: '기혈 끊기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 70 }] }, // 맥 누르기(18)보다 피해가 작고 끊기 붕괴가 크다
    { id: 'm_drain', row: 4, b: '혈도', tier: '하급', n: '흡기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 23 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }, { k: 'st', s: 'chill', n: 2 }] }, // 거둔 뒤 둔화 2를 다시 건다: 다음 차례에 1이 남아 다른 거두기 칸이 잇는다
    { id: 'm_press', row: 5, b: '혈도', tier: '하급', n: '전신 점혈', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_frozenvein', row: 5, b: '혈도', tier: '하급', n: '얼어붙은 맥', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 23 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'm_flick', row: 6, b: '혈도', tier: '하급', n: '탄지', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 22 }, { k: 'st', s: 'chill', n: 2 }, { k: 'sealx', brk: 33 }] }, // 지원 끊기: 후열 사제에 닿는다
    { id: 'm_reverse', row: 6, b: '혈도', tier: '하급', n: '역혈', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 23 }, { k: 'kiPer', per: 2 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] },
    { id: 'm_seal', row: 7, b: '혈도', tier: '중급', n: '혈 봉쇄', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 27 }, { k: 'st', s: 'chill', n: 2 }, { k: 'cutx', brk: 52 }, { k: 'sealx', brk: 22 }] }, // 기혈 끊기와 갈라: 모으는 힘과 지원 행동을 함께 끊는 근접 칸
    { id: 'm_harvest', row: 7, b: '혈도', tier: '중급', n: '기 거두기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 14 }, { k: 'chillx', mul: 1.5 }, { k: 'meSt', s: 'empower', n: 1, if: 'chill' }] },
    { id: 'm_numb', row: 8, b: '혈도', tier: '중급', n: '마비 지르기', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 25 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 1 }, { k: 'hasten', n: 1, on: 'use' }] },
    { id: 'm_backflow', row: 8, b: '혈도', tier: '중급', n: '거슬러 오르는 기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 24 }, { k: 'chillx', mul: 1.5 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }] }, // 흐름 마시기와 갈라: 후열까지 닿는 거두기(근접으로 덤비지 않는 적에게서 기)
    { id: 'm_allpoint', row: 9, b: '혈도', tier: '중급', n: '만혈 짚기', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 14 }, { k: 'st', s: 'chill', n: 2 }, { k: 'sealx', brk: 23 }] },
    { id: 'm_veinburst', row: 9, b: '혈도', tier: '중급', n: '기맥 파열', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 25 }, { k: 'kiBurst', per: 7 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_stillpt', row: 10, b: '혈도', tier: '중급', n: '정지혈', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 32 }, { k: 'st', s: 'chill', n: 3 }, { k: 'st', s: 'weak', n: 3 }, { k: 'cutx', brk: 70 }] },
    { id: 'm_kingvein', row: 10, b: '혈도', tier: '중급', n: '혈도의 끝', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 21 }, { k: 'kiBurst', per: 8, pre: 3 }] }, // chillx를 두지 않는다(거둔 몫까지 곱해져 한 방이 커짐)
    // 상급 11~13줄 (3챕터, 10월 8일): 왼쪽 점혈은 강타를 끊는 붕괴와 늦춤을 크게, 오른쪽 흡기는 늦춘 적에게서 기를 크게 빼앗는다. 거구에 약해 큰 적 배수를 두지 않는다
    { id: 'm_deathpt', row: 11, b: '혈도', tier: '상급', n: '절맥', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 26 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 2 }, { k: 'cutx', brk: 68 }] },
    { id: 'm_absorb', row: 11, b: '혈도', tier: '상급', n: '기맥 흡수', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 16 }, { k: 'chillx', mul: 2 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_chainpt', row: 12, b: '혈도', tier: '상급', n: '연환혈', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 28 }, { k: 'st', s: 'chill', n: 2 }, { k: 'st', s: 'weak', n: 1 }, { k: 'sealx', brk: 36 }] },
    { id: 'm_reflux', row: 12, b: '혈도', tier: '상급', n: '역류', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'chillx', mul: 2 }, { k: 'meSt', s: 'empower', n: 2, if: 'chill' }, { k: 'kiPer', per: 1 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'm_freezeworld', row: 13, b: '혈도', tier: '상급', n: '천지 정지', tgt: 'melee', time: 'normal', cd: 9, fx: [{ k: 'dmg', n: 32 }, { k: 'st', s: 'chill', n: 3 }, { k: 'st', s: 'weak', n: 3 }, { k: 'cutx', brk: 70 }] },
    { id: 'm_greatflow', row: 13, b: '혈도', tier: '상급', n: '대주천', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 19 }, { k: 'kiBurst', per: 6, pre: 4 }, { k: 'st', s: 'chill', n: 2 }] },
    /* ===== 0.8.0 M5-2 수도승 재설계(10월 20일 만든 사람 설계지 2판, nrk-private/제안/수도승-설계지-2026-10-20.md) =====
       직업 규칙은 그대로(기 · 자세 · 되받기 · ▶/⚡), 되받기 한도만 3 → 2(MONK.ctrMax). 새 상태는 승부수에만(역천 · 천망), 혈도는 둔화 하나 · 봉인은 지원 행동 끊기(sealx).
       칸 설명은 한 줄(skBodyMk), 효과는 칸마다 하나. 숫자는 가설 — 값 띠 · 측정으로 정한다. 새 효과 키와 숫자는 data/skillkit.js MK_BOUND · js/10 수도승 절 */
    { id: 'm_yeonhwan', row: 1, b: '철권', tier: '하급', n: '연환권', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'mkChain', add: 3, per: 1, max: 5, txt: '이번 차례 기본 공격 +3타, 기 1마다 1타 더(최대 5)' }] }, // 만든 사람 답(10월 20일): 평타형. +3타는 쓸 때 기가 0.6 안팎이고 기본 공격 한 대가 6.5 안팎이라(M5-2 측정)
    { id: 'm_bunggwon', row: 1, b: '철권', tier: '하급', n: '붕권', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 23 }, { k: 'kiBurst', mul: 0.2 }] },
    { id: 'm_hoheup', row: 1, b: '철권', tier: '하급', n: '호흡', tgt: 'self', time: 'normal', cd: 3, fx: [{ k: 'st', s: 'empower', n: 2 }, { k: 'stam', n: 35 }] },
    { id: 'm_cheonsu', row: 4, b: '철권', tier: '하급', n: '천수연타', tgt: 'melee', time: 'fast', cd: 5, hits: 3, fx: [{ k: 'dmg', n: 8 }, { k: 'kiHits', per: 1, max: 1 }] },
    { id: 'm_eungchuk', row: 4, b: '철권', tier: '하급', n: '기공 응축', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'mkCondense', add: 3, txt: '다음에 쏟는 기 +3.' }] },
    { id: 'm_baekbo', row: 8, b: '철권', tier: '중급', n: '백보신권', tgt: 'ranged', time: 'normal', cd: 7, hits: 5, fx: [{ k: 'dmg', n: 7 }] },
    { id: 'm_myeolgak', row: 8, b: '철권', tier: '중급', n: '멸각', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 22 }, { k: 'kiBurst', per: 17, max: 5 }] },
    { id: 'm_geumgang', row: 1, b: '부동', tier: '하급', n: '금강 자세', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'stance', dmg: 14, mul: 0.2, max: 3 }] },
    { id: 'm_yusu', row: 1, b: '부동', tier: '하급', n: '유수 자세', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'stance', dmg: 21, red: 0.2 }] },
    { id: 'm_balgyeong', row: 1, b: '부동', tier: '하급', n: '발경', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 24 }] },
    { id: 'm_cheolsan', row: 4, b: '부동', tier: '하급', n: '철산고', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'kiPer', per: 6 }] },
    { id: 'm_budong', row: 4, b: '부동', tier: '하급', n: '부동심', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'stance', dmg: 2, keep: 3 }] },
    { id: 'm_cheongeun', row: 8, b: '부동', tier: '중급', n: '천근추', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 28, big: 1 }] },
    { id: 'm_bulgoe', row: 8, b: '부동', tier: '중급', n: '금강불괴', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'mkAdamant', n: 4, txt: '4차례 받는 피해 −45%.' }] },
    { id: 'm_jeomhyeol', row: 1, b: '혈도', tier: '하급', n: '점혈', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 19 }, { k: 'st', s: 'chill', n: 2 }, { k: 'sealx', brk: 22 }] },
    { id: 'm_sahyeol', row: 1, b: '혈도', tier: '하급', n: '사혈', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 21 }, { k: 'meSt', s: 'empower', n: 1, if: 'chill' }] },
    { id: 'm_maek', row: 1, b: '혈도', tier: '하급', n: '맥 짚기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 12 }, { k: 'st', s: 'chill', n: 1 }] },
    { id: 'm_bongswae', row: 4, b: '혈도', tier: '하급', n: '혈맥 봉쇄', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 2 }, { k: 'sealx', brk: 30 }] },
    { id: 'm_talgi', row: 4, b: '혈도', tier: '하급', n: '탈기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 18 }, { k: 'mkDrainChill', per: 3, txt: '대상의 둔화 1마다 생명력 +3.' }] },
    { id: 'm_poswae', row: 8, b: '혈도', tier: '중급', n: '사혈 폭쇄', tgt: 'melee', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'mkChillBurst', per: 12, txt: '둔화를 모두 터뜨려 1마다 피해 +12.' }] },
    { id: 'm_talhon', row: 8, b: '혈도', tier: '중급', n: '탈혼수', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 18 }, { k: 'st', s: 'chill', n: 2 }, { k: 'meSt', s: 'empower', n: 1, if: 'hit' }] },
    /* 경계 칸(입구 · 둘째 · 3고리 둘)은 [Claude 초안]: 공격 2 · 강화/방어 2 */
    { id: 'm_doedol', row: 4, b: '반탄', tier: '하급', n: '되돌린 주먹', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 14 }, { k: 'mkCtrPer', per: 7, txt: '지난 적 차례에 되받은 1마다 피해 +7.' }] },
    { id: 'm_gibat', row: 5, b: '반탄', tier: '하급', n: '기 받는 자세', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'stance', dmg: 13, ki: 1 }] },
    { id: 'm_tansan', row: 8, b: '반탄', tier: '중급', n: '탄산권', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 30 }] },
    { id: 'm_cheolpo', row: 8, b: '반탄', tier: '중급', n: '철포삼', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 14, red: 0.3, keep: 2 }] },
    { id: 'm_yeokmaek', row: 4, b: '역혈', tier: '하급', n: '역맥 지르기', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 15 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'm_maekji', row: 5, b: '역혈', tier: '하급', n: '맥 지키는 자세', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'stance', dmg: 14, chill: 2 }] },
    { id: 'm_hyeolryu', row: 8, b: '역혈', tier: '중급', n: '혈류 역행', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 16 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'm_cheonri', row: 8, b: '역혈', tier: '중급', n: '천리 받기', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'stance', dmg: 31, far: 1 }] },
    { id: 'm_pamaek', row: 4, b: '파혈', tier: '하급', n: '파맥권', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'kiBurst', per: 5, max: 3 }] },
    { id: 'm_gagu', row: 5, b: '파혈', tier: '하급', n: '기 가두기', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'st', s: 'empower', n: 4 }, { k: 'stam', n: 45 }] },
    { id: 'm_gwanhyeol', row: 8, b: '파혈', tier: '중급', n: '관혈 일격', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 28 }, { k: 'chillx', mul: 1.5 }] },
    { id: 'm_sunhwan', row: 8, b: '파혈', tier: '중급', n: '내공 순환', tgt: 'self', time: 'normal', cd: 7, fx: [{ k: 'mkFlow', n: 3, mul: 0.55, txt: '3차례 동안 ▶ 공격 피해 +55%.' }] },
    /* 경계 승부수(만든 사람 문장 · 대사 그대로) */
    { id: 'm_yeokcheon', row: 10, b: '반탄', tier: '중급', n: '역천권', tgt: 'self', time: 'normal', cd: 9, line: '「쳐라. 네놈이 휘두른 그 힘이, 곧 나의 주먹이 될 터이니.」', cut: 'guard', pay: '방어 불가, 받는 피해 +30%.', fx: [{ k: 'mkYeok', n: 3, txt: '3차례 동안 자세 유지, 되받기 횟수 제한 없음, 되받기마다 붕괴 +15.' }] },
    { id: 'm_cheonmang', row: 10, b: '역혈', tier: '중급', n: '천망', tgt: 'self', time: 'normal', cd: 9, line: '「나를 친 그 손이, 이미 너의 숨통을 내게 쥐여 주었음을 알지 못하는구나.」', cut: 'arcane', pay: '되받기 피해 0.', fx: [{ k: 'mkCheon', n: 3, txt: '3차례 동안 나를 친 적에게 둔화 +2. 둔화 5가 된 적은 봉인.' }] },
    { id: 'm_ilji', row: 10, b: '파혈', tier: '중급', n: '일지멸맥', tgt: 'melee', time: 'normal', cd: 9, line: '「단 한 점이면 족하다. 무너지는 것은, 언제나 안에서부터이니.」', cut: 'blade', pay: '생명력 10%, 3차례 기를 얻지 못함.', fx: [{ k: 'mkIlji', per: 10, txt: '적 하나에게 기를 모두 쏟아 (둔화 × 기 × 10) 피해.' }] },
    /* 결합 칸 셋(설계지): 원 바깥, 판마다 둘, 꼬리표 조건 */
    { id: 'm_samjae', row: 7, b: '결합', tier: '중급', n: '삼재권', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'mkSamjae', txt: '이번 전투: 기가 가득 차면 ⚡ 공격도 +25%.' }] },
    { id: 'm_yeokryu', row: 7, b: '결합', tier: '중급', n: '역류', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'mkReflux', txt: '이번 전투: 둔화된 적을 기본 공격으로 치면 기 +1.' }] },
    { id: 'm_bultoe', row: 7, b: '결합', tier: '중급', n: '불퇴', tgt: 'self', time: 'fast', cd: 9, fx: [{ k: 'mkBultoe', txt: '이번 전투: 무너진 적을 되받으면 ×2.' }] },
  ],
  confessor: [
    /* 숨겨진 직업 2 (10월 7일, UNLOCK.confessor). 설계 · 까닭은 비공개 문서. 새 효과: cleanse(정화 · 사함 offer · after) · transfer(옮기기) · perDmg(of: prot · burden · clean · weak · bleed · tbad) · dispel(강화 벗기기), meSt의 해로운 상태는 행동 뒤 고행(p.selfN), hasten on 'clean' */
    // 시작
    { id: 'c_mace', b: '시작', tier: '시작', start: 1, n: '고해의 철퇴', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 17 }, { k: 'brk', n: 26 }] },
    { id: 'c_confess', b: '시작', tier: '시작', start: 1, n: '고해', tgt: 'self', time: 'fast', cd: 4, fx: [{ k: 'cleanse', n: 3 }, { k: 'stam', n: 57 }] },
    // 속죄 (왼쪽 정결 · 오른쪽 용서)
    { id: 'c_wash', row: 1, b: '속죄', tier: '하급', n: '씻어 내는 일격', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 23 }] },
    { id: 'c_holywater', row: 1, b: '속죄', tier: '하급', n: '성수 뿌리기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 1, heal: 3 }, { k: 'dmg', n: 24 }] },
    { id: 'c_heartwash', row: 2, b: '속죄', tier: '하급', n: '마음 씻는 일격', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'cleanse', only: ['vuln', 'weak'] }, { k: 'dmg', n: 21 }] },
    { id: 'c_absolve', row: 2, b: '속죄', tier: '하급', n: '사죄의 기도', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', heal: 6 }] },
    { id: 'c_censer', row: 3, b: '속죄', tier: '하급', n: '향로 휘두르기', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 16 }] },
    { id: 'c_rosary', row: 3, b: '속죄', tier: '하급', n: '묵주 던지기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'cleanse', n: 1 }, { k: 'dmg', n: 17 }, { k: 'hasten', n: 1, on: 'clean' }] },
    { id: 'c_steady', row: 4, b: '속죄', tier: '하급', n: '흔들림 없는 손', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'dmg', n: 24 }, { k: 'perDmg', of: 'prot', per: 4 }] },
    { id: 'c_mercylight', row: 4, b: '속죄', tier: '하급', n: '용서의 빛', tgt: 'all', time: 'normal', cd: 8, fx: [{ k: 'cleanse', n: 2, heal: 3 }, { k: 'dmg', n: 14 }] },
    { id: 'c_cutwash', row: 5, b: '속죄', tier: '하급', n: '끊어 씻기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'cleanse', n: 1 }, { k: 'dmg', n: 18 }, { k: 'cutx', brk: 59 }] },
    { id: 'c_staunch', row: 5, b: '속죄', tier: '하급', n: '피 멎는 기도', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', only: ['bleed', 'ignite'], heal: 8 }, { k: 'stam', n: 59 }] },
    { id: 'c_fallen', row: 6, b: '속죄', tier: '하급', n: '무너진 자 씻기', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 21 }, { k: 'brokenx', mul: 2 }] },
    { id: 'c_piercelight', row: 6, b: '속죄', tier: '하급', n: '꿰뚫는 빛', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 1 }, { k: 'dmg', n: 20 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'c_spendmace', row: 7, b: '속죄', tier: '중급', n: '보호의 망치', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 31 }, { k: 'perDmg', of: 'prot', per: 7, spend: 1 }, { k: 'brk', n: 29 }] },
    { id: 'c_lightbody', row: 7, b: '속죄', tier: '중급', n: '가벼워진 몸', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'cleanse', stam: 11, quick: 1 }, { k: 'hasten', n: 1, on: 'clean' }] },
    { id: 'c_firmbreak', row: 8, b: '속죄', tier: '중급', n: '무너뜨리는 정결', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 26 }, { k: 'perDmg', of: 'prot', brk: 10, spend: 1 }] },
    { id: 'c_dawn', row: 8, b: '속죄', tier: '중급', n: '새벽빛', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'cleanse', n: 3, heal: 5, haste: 1 }, { k: 'dmg', n: 28 }] },
    { id: 'c_ripple', row: 9, b: '속죄', tier: '중급', n: '정결의 파문', tgt: 'front', time: 'slow', cd: 4, fx: [{ k: 'dmg', n: 18 }, { k: 'perDmg', of: 'prot', per: 2 }, { k: 'cleanse', after: 1 }] },
    { id: 'c_lance', row: 9, b: '속죄', tier: '중급', n: '빛의 창', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'cleanse', n: 2 }, { k: 'dmg', n: 32 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_judgment', row: 10, b: '속죄', tier: '중급', n: '정결의 심판', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'cleanse' }, { k: 'dmg', n: 30 }, { k: 'perDmg', of: 'prot', per: 6, spend: 1 }, { k: 'brk', n: 66 }] },
    { id: 'c_amnesty', row: 10, b: '속죄', tier: '중급', n: '대사면', tgt: 'self', time: 'normal', cd: 10, fx: [{ k: 'cleanse', heal: 9 }, { k: 'stam', n: 56 }, { k: 'hasten', n: 2, on: 'clean' }] },
    // 속죄 상급 (11~13줄, 10월 8일): 왼쪽 정결은 씻은 보호를 그 자리에서 읽고 쓰고 다시 채우고, 오른쪽 용서는 지우며 🔄와 회복을 잇는다
    { id: 'c_hallow', row: 11, b: '속죄', tier: '상급', n: '성별의 일격', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'cleanse', n: 3 }, { k: 'dmg', n: 31 }, { k: 'perDmg', of: 'prot', per: 4 }] },
    { id: 'c_litany', row: 11, b: '속죄', tier: '상급', n: '저녁 연도', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'cleanse', n: 2, heal: 4 }, { k: 'dmg', n: 24 }, { k: 'hasten', n: 1, on: 'clean' }] },
    { id: 'c_renew', row: 12, b: '속죄', tier: '상급', n: '갱신의 일격', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 32 }, { k: 'perDmg', of: 'prot', per: 6, spend: 1 }, { k: 'cleanse', n: 2, after: 1 }] },
    { id: 'c_unction', row: 12, b: '속죄', tier: '상급', n: '성유 부음', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'cleanse', n: 3, heal: 4 }, { k: 'dmg', n: 31 }, { k: 'brk', n: 23 }] },
    { id: 'c_whitejudge', row: 13, b: '속죄', tier: '상급', n: '순백의 선고', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'cleanse' }, { k: 'dmg', n: 32 }, { k: 'perDmg', of: 'prot', per: 5 }, { k: 'brokenx', mul: 1.5 }, { k: 'bigx', mul: 1.4 }] },
    { id: 'c_jubilee', row: 13, b: '속죄', tier: '상급', n: '희년', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'cleanse', heal: 6, haste: 1 }, { k: 'dmg', n: 32 }, { k: 'hasten', n: 2, on: 'clean' }] },
    // 전가 (왼쪽 되돌리기 · 오른쪽 덮어씌우기)
    { id: 'c_return', row: 1, b: '전가', tier: '하급', n: '저주 되돌리기', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dmg', n: 19 }] },
    { id: 'c_accuse', row: 1, b: '전가', tier: '하급', n: '죄 덮어씌우기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['vuln'], add: 1 }, { k: 'dmg', n: 22 }] },
    { id: 'c_strip', row: 2, b: '전가', tier: '하급', n: '축복 벗기기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dispel', n: 2 }, { k: 'dmg', n: 18 }] },
    { id: 'c_bloodpass', row: 2, b: '전가', tier: '하급', n: '피 떠넘기기', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'transfer', only: ['bleed'], add: 1 }, { k: 'dmg', n: 16 }] },
    { id: 'c_dull', row: 3, b: '전가', tier: '하급', n: '무딘 손', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'transfer', only: ['weak'] }, { k: 'dmg', n: 16 }, { k: 'cutx', brk: 61 }] },
    { id: 'c_indict', row: 3, b: '전가', tier: '하급', n: '죄목 읽기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'vulnPer', per: 4 }] },
    { id: 'c_pass', row: 4, b: '전가', tier: '하급', n: '떠넘기는 기도', tgt: 'front', time: 'normal', cd: 7, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dmg', n: 15 }] },
    { id: 'c_ember', row: 4, b: '전가', tier: '하급', n: '불씨 옮기기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['ignite'], add: 2 }, { k: 'dmg', n: 22 }] },
    { id: 'c_hobble', row: 5, b: '전가', tier: '하급', n: '발목 잡는 죄', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['chill', 'weak'], add: 2, addK: 'chill' }, { k: 'dmg', n: 22 }] },
    { id: 'c_burden', row: 5, b: '전가', tier: '하급', n: '짐 떠넘기기', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'transfer' }, { k: 'dmg', n: 25 }] },
    { id: 'c_bow', row: 6, b: '전가', tier: '하급', n: '무릎 꿇리기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'perDmg', of: 'weak', per: 4, brk: 6 }] },
    { id: 'c_charge', row: 6, b: '전가', tier: '하급', n: '고발', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'transfer', only: ['vuln'], add: 1 }, { k: 'dmg', n: 16 }, { k: 'vulnPer', per: 3 }] },
    { id: 'c_choir', row: 7, b: '전가', tier: '중급', n: '성가 빼앗기', tgt: 'all', time: 'normal', cd: 9, fx: [{ k: 'dispel', n: 1 }, { k: 'dmg', n: 16 }] },
    { id: 'c_bloodwit', row: 7, b: '전가', tier: '중급', n: '피의 증언', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 29 }, { k: 'perDmg', of: 'bleed', per: 3 }] },
    { id: 'c_heavyhand', row: 8, b: '전가', tier: '중급', n: '무거운 손', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'transfer', only: ['weak'], add: 2 }, { k: 'dmg', n: 14 }, { k: 'perDmg', of: 'weak', per: 3 }, { k: 'brk', n: 27 }] },
    { id: 'c_pyreback', row: 8, b: '전가', tier: '중급', n: '불의 고발', tgt: 'ranged', time: 'normal', cd: 8, hits: 2, fx: [{ k: 'transfer', only: ['ignite'], add: 2 }, { k: 'dmg', n: 14 }] },
    { id: 'c_silence', row: 9, b: '전가', tier: '중급', n: '침묵', tgt: 'ranged', time: 'fast', cd: 7, fx: [{ k: 'dispel' }, { k: 'dmg', n: 24 }, { k: 'cutx', brk: 47 }] },
    { id: 'c_scapegoat', row: 9, b: '전가', tier: '중급', n: '희생양', tgt: 'ranged', time: 'slow', cd: 8, fx: [{ k: 'transfer' }, { k: 'dmg', n: 19 }, { k: 'vulnPer', per: 5 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_bind', row: 10, b: '전가', tier: '중급', n: '저주의 굴레', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dispel', n: 1 }, { k: 'dmg', n: 16 }, { k: 'brk', n: 13 }] },
    { id: 'c_weight', row: 10, b: '전가', tier: '중급', n: '죄의 무게', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'transfer' }, { k: 'dmg', n: 31 }, { k: 'perDmg', of: 'tbad', per: 4 }] },
    // 전가 상급 (11~13줄, 10월 8일): 왼쪽 되돌리기는 옮기고 벗기고 끊는 것을 한 칸에 잇고, 오른쪽 덮어씌우기는 옮겨 건 상태를 곧바로 거둔다
    { id: 'c_mirror', row: 11, b: '전가', tier: '상급', n: '거울 기도', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['weak'], add: 2 }, { k: 'dispel', n: 2 }, { k: 'dmg', n: 27 }] },
    { id: 'c_brand', row: 11, b: '전가', tier: '상급', n: '죄인의 낙인', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'transfer', only: ['vuln'], add: 2 }, { k: 'dmg', n: 19 }, { k: 'vulnPer', per: 2 }] },
    { id: 'c_gag', row: 12, b: '전가', tier: '상급', n: '입막음', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'transfer', only: ['weak'], add: 1 }, { k: 'dispel', n: 2 }, { k: 'dmg', n: 11 }, { k: 'perDmg', of: 'weak', per: 4 }] },
    { id: 'c_pustule', row: 12, b: '전가', tier: '상급', n: '터지는 고름', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'transfer', only: ['bleed'], add: 3 }, { k: 'dmg', n: 16 }, { k: 'perDmg', of: 'bleed', per: 4 }] },
    { id: 'c_anathema', row: 13, b: '전가', tier: '상급', n: '파문 선고', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'transfer', only: ['weak'], add: 2 }, { k: 'dispel' }, { k: 'dmg', n: 20 }, { k: 'brk', n: 30 }, { k: 'perDmg', of: 'weak', per: 3 }] },
    { id: 'c_condemn', row: 13, b: '전가', tier: '상급', n: '대죄의 단죄', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'transfer' }, { k: 'dmg', n: 32 }, { k: 'perDmg', of: 'tbad', per: 6 }] },
    // 고행 (왼쪽 채찍 · 오른쪽 참회)
    { id: 'c_lash', row: 1, b: '고행', tier: '하급', n: '채찍질', tgt: 'melee', time: 'normal', cd: 6, keep: ['meSt'], fx: [{ k: 'dmg', n: 24 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_repent', row: 1, b: '고행', tier: '하급', n: '참회의 일격', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'cleanse', offer: 1, dmg: 4 }, { k: 'dmg', n: 21 }] },
    { id: 'c_bear', row: 2, b: '고행', tier: '하급', n: '짊어진 일격', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 21 }, { k: 'perDmg', of: 'burden', per: 3 }] },
    { id: 'c_shoulder', row: 2, b: '고행', tier: '하급', n: '짐 지기', tgt: 'melee', time: 'fast', cd: 4, keep: ['meSt'], fx: [{ k: 'dmg', n: 16 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_ashes', row: 3, b: '고행', tier: '하급', n: '베옷과 재', tgt: 'self', time: 'fast', cd: 3, keep: ['meSt', 'quick'], fx: [{ k: 'meSt', s: 'ignite', n: 2 }, { k: 'meSt', s: 'chill', n: 1 }, { k: 'quick', n: 1 }, { k: 'stam', n: 58 }] },
    { id: 'c_shake', row: 3, b: '고행', tier: '하급', n: '털어 내기', tgt: 'melee', time: 'fast', cd: 5, fx: [{ k: 'cleanse', n: 2, offer: 1, brk: 12 }, { k: 'dmg', n: 17 }] },
    { id: 'c_prostrate', row: 4, b: '고행', tier: '하급', n: '엎드린 일격', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'dmg', n: 21 }, { k: 'perDmg', of: 'burden', per: 4 }, { k: 'brk', n: 36 }] },
    { id: 'c_contrite', row: 4, b: '고행', tier: '하급', n: '통회', tgt: 'melee', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 24 }, { k: 'perDmg', of: 'clean', per: 5 }] },
    { id: 'c_frenzy', row: 5, b: '고행', tier: '하급', n: '고행자의 연타', tgt: 'melee', time: 'normal', cd: 5, hits: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'perDmg', of: 'burden', per: 1 }] },
    { id: 'c_fireoffer', row: 5, b: '고행', tier: '하급', n: '불의 사함', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'cleanse', only: ['bleed', 'ignite'], offer: 1, dmg: 6 }, { k: 'dmg', n: 26 }] },
    { id: 'c_pilgrim', row: 6, b: '고행', tier: '하급', n: '순례자의 걸음', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 23 }, { k: 'perDmg', of: 'burden', per: 3 }] },
    { id: 'c_burst', row: 6, b: '고행', tier: '하급', n: '참회의 폭발', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'cleanse', offer: 1, dmg: 3 }, { k: 'dmg', n: 16 }] },
    { id: 'c_bared', row: 7, b: '고행', tier: '중급', n: '몸을 내준 일격', tgt: 'melee', time: 'normal', cd: 7, keep: ['meSt'], fx: [{ k: 'dmg', n: 32 }, { k: 'meSt', s: 'vuln', n: 2 }] },
    { id: 'c_kneelconf', row: 7, b: '고행', tier: '중급', n: '무릎 꿇은 고백', tgt: 'melee', time: 'slow', cd: 9, fx: [{ k: 'cleanse', offer: 1, dmg: 4, brk: 8 }, { k: 'dmg', n: 31 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_march', row: 8, b: '고행', tier: '중급', n: '무거운 행렬', tgt: 'front', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 18 }, { k: 'perDmg', of: 'burden', per: 2 }] },
    { id: 'c_breath', row: 8, b: '고행', tier: '중급', n: '고백의 숨', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'cleanse', quick: 1 }, { k: 'stam', n: 60 }] },
    { id: 'c_crown', row: 9, b: '고행', tier: '중급', n: '불의 관', tgt: 'melee', time: 'slow', cd: 9, keep: ['meSt'], fx: [{ k: 'dmg', n: 32 }, { k: 'perDmg', of: 'burden', per: 5 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_tears', row: 9, b: '고행', tier: '중급', n: '눈물의 매', tgt: 'melee', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 25 }, { k: 'perDmg', of: 'clean', per: 7 }, { k: 'bigx', mul: 1.5 }] },
    { id: 'c_martyr', row: 10, b: '고행', tier: '중급', n: '순교', tgt: 'melee', time: 'slow', cd: 10, keep: ['meSt'], fx: [{ k: 'dmg', n: 27 }, { k: 'perDmg', of: 'burden', per: 6 }, { k: 'bigx', mul: 1.5 }, { k: 'meSt', s: 'ignite', n: 3 }] },
    { id: 'c_lastrite', row: 10, b: '고행', tier: '중급', n: '마지막 고해', tgt: 'melee', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 30 }, { k: 'perDmg', of: 'burden', per: 5 }, { k: 'cleanse', after: 1 }, { k: 'bigx', mul: 1.5 }] },
    // 고행 상급 (11~13줄, 10월 8일): 왼쪽 채찍은 짐을 읽고 다음 짐을 스스로 지고, 오른쪽 참회는 바치고 다시 진다
    { id: 'c_scourge', row: 11, b: '고행', tier: '상급', n: '가시 채찍', tgt: 'melee', time: 'normal', cd: 6, keep: ['meSt'], fx: [{ k: 'dmg', n: 24 }, { k: 'perDmg', of: 'burden', per: 4 }, { k: 'meSt', s: 'ignite', n: 2 }, { k: 'bigx', mul: 1.3 }] },
    { id: 'c_confession', row: 11, b: '고행', tier: '상급', n: '공개 고백', tgt: 'melee', time: 'fast', cd: 5, keep: ['meSt'], fx: [{ k: 'cleanse', n: 3, offer: 1, dmg: 4, brk: 6 }, { k: 'dmg', n: 23 }, { k: 'meSt', s: 'ignite', n: 1 }] },
    { id: 'c_humble', row: 12, b: '고행', tier: '상급', n: '굴욕의 걸음', tgt: 'melee', time: 'fast', cd: 5, keep: ['meSt'], fx: [{ k: 'dmg', n: 24 }, { k: 'perDmg', of: 'burden', per: 3 }, { k: 'meSt', s: 'chill', n: 1 }] },
    { id: 'c_wail', row: 12, b: '고행', tier: '상급', n: '통곡', tgt: 'melee', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 20 }, { k: 'brk', n: 18 }, { k: 'brokenx', mul: 1.6 }, { k: 'perDmg', of: 'clean', per: 5 }] },
    { id: 'c_stigma', row: 13, b: '고행', tier: '상급', n: '성흔', tgt: 'melee', time: 'slow', cd: 9, keep: ['meSt'], fx: [{ k: 'dmg', n: 25 }, { k: 'perDmg', of: 'burden', per: 7 }, { k: 'brk', n: 30 }, { k: 'bigx', mul: 1.5 }, { k: 'meSt', s: 'ignite', n: 2 }] },
    { id: 'c_vicarious', row: 13, b: '고행', tier: '상급', n: '대속', tgt: 'melee', time: 'slow', cd: 7, fx: [{ k: 'cleanse', offer: 1, dmg: 5, brk: 6 }, { k: 'dmg', n: 32 }, { k: 'bigx', mul: 1.6 }] },
  ],
  /* 숨겨진 직업 3 (10월 7일, UNLOCK.bloodmage). 설계 · 까닭은 비공개 문서. 엔진 값은 index.html BLOOD */
  bloodmage: [
    { id: 'v_taint', b: '시작', tier: '시작', start: 1, n: '오염된 피', tgt: 'ranged', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 9 }, { k: 'poison', n: 3 }] },
    { id: 'v_drink', b: '시작', tier: '시작', start: 1, n: '독 마시기', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'drain', eat: 1, per: 9 }, { k: 'meSt', s: 'protect', n: 2 }, { k: 'payCut', mul: 0.5, n: 1 }] },
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
    { id: 'v_sump', row: 11, b: '역병', tier: '상급', n: '썩은 늪', tgt: 'all', time: 'normal', cd: 7, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 3 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'v_kiss', row: 11, b: '역병', tier: '상급', n: '병든 입맞춤', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 2 }, { k: 'poison', n: 2 }, { k: 'spread', per: 0.5 }] },
    { id: 'v_stifle', row: 12, b: '역병', tier: '상급', n: '숨통 조이는 안개', tgt: 'front', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 3 }, { k: 'st', s: 'weak', n: 2 }, { k: 'cutx', brk: 43 }] },
    { id: 'v_hostmark', row: 12, b: '역병', tier: '상급', n: '숙주 낙인', tgt: 'ranged', time: 'normal', cd: 8, fx: [{ k: 'dmg', n: 2 }, { k: 'poison', n: 6 }, { k: 'spread', per: 1, kill: 1, mark: 1 }] },
    { id: 'v_season', row: 13, b: '역병', tier: '상급', n: '역병의 계절', tgt: 'all', time: 'slow', cd: 10, fx: [{ k: 'hpCost', pct: 0.06 }, { k: 'dmg', n: 3 }, { k: 'poison', n: 5 }, { k: 'st', s: 'vuln', n: 1 }] },
    { id: 'v_outbreak', row: 13, b: '역병', tier: '상급', n: '대유행', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 3 }, { k: 'spread', per: 0.5 }] },
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
    { id: 'v_chew', row: 11, b: '포식', tier: '상급', n: '되새김', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 10 }, { k: 'drain', eat: 1, max: 2, per: 6 }, { k: 'poison', n: 6 }] },
    { id: 'v_incisor', row: 11, b: '포식', tier: '상급', n: '독니 박기', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 8 }, { k: 'drain', eat: 1, max: 4, per: 5, dmg: 4 }, { k: 'poison', n: 3 }] },
    { id: 'v_savor', row: 12, b: '포식', tier: '상급', n: '음미', tgt: 'ranged', time: 'fast', cd: 5, fx: [{ k: 'dmg', n: 19 }, { k: 'drain', eat: 1, max: 2, per: 8 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'v_pillage', row: 12, b: '포식', tier: '상급', n: '약탈', tgt: 'ranged', time: 'fast', cd: 6, fx: [{ k: 'dmg', n: 16 }, { k: 'drain', eat: 1, max: 4, per: 3, dmg: 3 }, { k: 'meSt', s: 'empower', n: 2 }] },
    { id: 'v_banquet', row: 13, b: '포식', tier: '상급', n: '탐식의 연회', tgt: 'ranged', time: 'slow', cd: 10, fx: [{ k: 'dmg', n: 8 }, { k: 'drain', eat: 1, max: 3, per: 7 }, { k: 'poison', n: 7 }, { k: 'meSt', s: 'protect', n: 4 }] },
    { id: 'v_devour', row: 13, b: '포식', tier: '상급', n: '대식가의 일격', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'dmg', n: 10 }, { k: 'drain', eat: 1, per: 5, dmg: 3 }, { k: 'poison', n: 5 }, { k: 'bigx', mul: 1.5 }] },
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
    { id: 'v_stake', row: 11, b: '혈약', tier: '상급', n: '피의 말뚝', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'hpCost', pct: 0.02 }, { k: 'dmg', n: 21 }, { k: 'brk', n: 27 }, { k: 'bigx', mul: 2.2 }] },
    { id: 'v_brand', row: 11, b: '혈약', tier: '상급', n: '핏빛 낙인', tgt: 'ranged', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 17 }, { k: 'st', s: 'weak', n: 2 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'v_gallows', row: 12, b: '혈약', tier: '상급', n: '단죄의 피', tgt: 'ranged', time: 'normal', cd: 7, fx: [{ k: 'hpCost', pct: 0.03 }, { k: 'dmg', n: 16 }, { k: 'brk', n: 25 }, { k: 'meSt', s: 'protect', n: 4 }, { k: 'bigx', mul: 2.2 }] },
    { id: 'v_rite', row: 12, b: '혈약', tier: '상급', n: '피의 의식', tgt: 'self', time: 'fast', cd: 7, fx: [{ k: 'hpCost', pct: 0.03 }, { k: 'st', s: 'empower', n: 3 }, { k: 'st', s: 'protect', n: 5 }, { k: 'payCut', mul: 0.5, n: 3 }, { k: 'stam', n: 40 }] },
    { id: 'v_zenith', row: 13, b: '혈약', tier: '상급', n: '절정의 피', tgt: 'ranged', time: 'slow', cd: 9, fx: [{ k: 'hpCost', pct: 0.05 }, { k: 'dmg', n: 25 }, { k: 'brk', n: 56 }, { k: 'bigx', mul: 2.5 }] },
    { id: 'v_fruit', row: 13, b: '혈약', tier: '상급', n: '저주의 결실', tgt: 'ranged', time: 'normal', cd: 6, fx: [{ k: 'dmg', n: 11 }, { k: 'st', s: 'weak', n: 2 }, { k: 'perDmg', of: 'weak', per: 5 }, { k: 'spread', s: 'weak', per: 1 }, { k: 'bigx', mul: 2 }] },
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
    bd: { 독사: '작은 독을 넓게 걸고 키웁니다. 무리와 긴 싸움에 강하고 뒤에 선 적에게 약합니다', 격발: '독을 심고 터뜨려 정예 · 강적 · 보스를 무너뜨립니다. 강타에도 강하고 무리에 약합니다', 그림자: '흘려 낸 틈을 찌르고 후열에 닿습니다. 뒤에 선 적에게 강하고 무리와 정예 · 강적 · 보스에게 약합니다' },
    haste: {}, // 갈래 규칙 없음 (10월 3일 3차 결정: 가독성. 예전 규칙: 독사 독을 걸면 · 격발 정예 이상을 무너뜨리면 · 그림자 흘려 내면 그 갈래 대기 −1). 쿨타임을 당기는 일은 🔄 스킬(fx 'hasten')만 한다
    // 갈래 성격 (10월 3일 기준, 기획서 12.4절): 강한 상황과 약한 상황. tools/sitqa.js가 50상황으로 맞는지 잰다
    profile: { 독사: { strong: ['무리', '장기전'], weak: ['후열'] }, 격발: { strong: ['거구', '강타'], weak: ['무리'] }, 그림자: { strong: ['후열'], weak: ['무리', '거구'] }, 직업: { strong: [], weak: ['지원'] } },
    starters: ['a_vital', 'a_slip'], pts: 1,
  },
  warden: {
    branches: ['성벽', '파쇄', '전열 장악'],
    bd: { 성벽: '막으며 보호막을 쌓고 그 보호막을 태워 공격합니다. 정예 · 강적 · 보스에 강하고 치유 · 소환하는 적에게 약합니다', 파쇄: '한 적의 붕괴 게이지를 빨리 채우고 무너진 적을 느린 공격으로 강하게 칩니다. 정예 · 강적 · 보스에 강하고 무리에 약합니다', '전열 장악': '전열 전체를 치고 여러 적을 함께 무너뜨립니다. 방패병을 깨고 후열을 끌어냅니다. 무리에 강하고 정예 · 강적 · 보스에 약합니다' },
    haste: {},
    // 갈래 성격 (10월 3일 만든 사람 결정): 직업 약점은 후열(근접에 느린 직업이라 방패 뒤의 사수 · 치유사에 늦게 닿는다)
    profile: { 성벽: { strong: ['거구'], weak: ['지원'] }, 파쇄: { strong: ['거구'], weak: ['무리'] }, '전열 장악': { strong: ['무리'], weak: ['거구'] }, 직업: { strong: [], weak: ['후열'] } }, // 10월 4일 만든 사람 결정: 성벽 강함 장기전 · 폭발 → 거구 (폭발은 세 갈래 모두 90점대라 위가 막혔고, 장기전은 방패병 상황이라 전열 장악이 가장 높았다). 파쇄 강함 강타 · 거구 → 거구 (끊기를 키운 열 가지 안에서도 강타 범주가 움직이지 않았다)
    starters: ['w_bash', 'w_brace'], pts: 1,
  },
  hunter: {
    branches: ['저격', '연사', '기동'],
    bd: { 저격: '한 적에게 추적과 취약을 쌓고 겹을 터뜨리는 큰 한 발로 마무리합니다. 정예 · 강적 · 보스에 강하고 무리에 약합니다', 연사: '표적을 바꿀 때마다 빠른 한 발을 쏩니다. 여러 번 쏘거나 화살비와 출혈로 여럿을 공격합니다. 무리에 강하고 정예 · 강적 · 보스에 약합니다', 기동: '먼저 움직이고 몸을 빼 피합니다. 공격을 모으는 적은 둔화로 늦춥니다. 강타에 강하고 상처와 무리에 약합니다' },
    haste: {},
    // 갈래 성격 (10월 5일 만든 사람 결정): 직업 약점은 장기전(몸이 약하고 회복이 적다). 기동은 상처 · 무리를 섞는다(피하기는 맞는 것만, 한 번에 하나만 막는다)
    profile: { 저격: { strong: ['거구'], weak: ['무리'] }, 연사: { strong: ['무리'], weak: ['거구'] }, 기동: { strong: ['강타'], weak: ['상처', '무리'] }, 직업: { strong: [], weak: ['장기전'] } },
    starters: ['h_aim', 'h_step'], pts: 1,
  },
  butcher: {
    branches: ['도륙', '광기', '학살'],
    bd: { 도륙: '한 적에게 출혈을 깊게 내고, 때가 오면 그 피를 먹어 버팁니다. 출혈을 거는 스킬과 흡혈 스킬을 함께 씁니다. 긴 싸움에 강하고, 무리에 약합니다', 광기: '막지 않고 받아낸 만큼 되갚고, 내 피를 대가로 강하게 공격합니다. 강타에 강하고, 치유·소환하는 적에게 약합니다', 학살: '쓰러뜨릴 때마다 다음 칼이 빨라지고, 쓰러진 적의 피가 곁의 적에게 퍼집니다. 무리에 강하고, 큰 적 하나에 약합니다' },
    haste: {},
    profile: { 도륙: { strong: ['장기전'], weak: ['무리'] }, 광기: { strong: ['강타'], weak: ['지원'] }, 학살: { strong: ['무리'], weak: ['거구'] }, 직업: { strong: [], weak: ['후열'] } },
    starters: ['b_hook', 'b_lap'], pts: 1,
  },
  /* 원소술사 (10월 7일). 맞물림: 불꽃 ↔ 서리는 무리, 서리 ↔ 공명은 지원, 공명 ↔ 불꽃은 거구. 직업 약점은 강타(서리 무게가 큰 공격을 줄이지 않고 몸이 가장 약하다) */
  elementalist: {
    branches: ['불꽃', '서리', '마력'], // M5-5: 공명 → 마력(설계지 2판)
    bd: { 불꽃: '태웁니다. 화상을 쌓아 한꺼번에 태우거나 무리에 번지게 합니다. 정예 · 강적 · 보스와 무리에 강하고 버티는 힘은 약합니다', 서리: '얼립니다. 둔화를 가득 채워 적이 행동을 놓치게 하거나 쌓인 얼음을 깨뜨려 크게 칩니다. 무리와 긴 싸움에 강하고 치유 · 소환하는 적에게 약합니다', 마력: '다룹니다. 마력 화살을 응축해 연사하는 기본 공격 길과 방벽 · 결계로 버티는 길이 있습니다. 긴 싸움에 강하고 무리에 약합니다' },
    haste: {},
    profile: { 불꽃: { strong: ['거구'], weak: ['무리'] }, 서리: { strong: ['무리', '장기전'], weak: ['지원'] }, 마력: { strong: ['장기전'], weak: ['무리'] }, 직업: { strong: [], weak: ['강타'] } },
    starters: ['e5_bolt', 'e5_switch'], pts: 1, /* M5-5: 시작 스킬 마력탄 · 원소 전환(옛 불씨 화살 · 서리 손길은 칸 재료) */
  },
  spellblade: {
    branches: ['혈인', '염검', '마갑'],
    bd: { 혈인: '베어서 출혈을 겁니다. 쓰러뜨리면 다음 베기의 쿨타임을 초기화합니다. 무리에 강하고 뒤에 선 적에게 약합니다', 염검: '주문으로 화상을 걸고 화상 걸린 적을 베어 거둡니다. 영창하는 적에 강하고 무리에 약합니다', 마갑: '검과 주문을 교대하며 보호막을 두릅니다. 보호막을 남겨 버티거나 공명으로 소모해 적을 압박합니다' },
    haste: {},
    // 갈래 성격 (10월 7일 설계, docs/직업/마검사.md D-1): 직업 약점은 거구(큰 적 배수 칸이 없고 보호막 상한 15%)
    profile: { 혈인: { strong: ['무리'], weak: ['후열'] }, 염검: { strong: ['영창'], weak: ['무리'] }, 마갑: { strong: ['강타'], weak: ['지원'] }, 직업: { strong: [], weak: ['거구'] } },
    starters: ['sb_edge', 'sb_aegis'], pts: 1,
  },
  monk: {
    branches: ['철권', '부동', '혈도'],
    bd: {
      철권: '빠른 연타로 기를 쌓고 모은 기를 한 주먹에 몰아칩니다. 정예 · 강적 · 보스에 강하고 무리에 약합니다',
      부동: '막고 되받아치며 되받은 만큼 되갚습니다. 무리에 강하고 뒤에서 쏘는 적에게 약합니다',
      혈도: '급소를 눌러 적을 늦추고 힘을 뺍니다. 늦춘 적에게서는 기를 빼앗습니다. 강타에 강하고 정예 · 강적 · 보스에 약합니다',
    },
    haste: {},
    // 갈래 성격 (10월 7일 50상황): 직업 약점은 지원(때리지 않는 적은 되받을 게 없다). 초안의 영창은 직업 평균보다 높게 나와 설계 F-7절의 기준대로 바꿨다
    profile: { 철권: { strong: ['거구'], weak: ['무리'] }, 부동: { strong: ['무리'], weak: ['후열'] }, 혈도: { strong: ['강타'], weak: ['거구'] }, 직업: { strong: [], weak: ['지원'] } },
    starters: ['m_palm', 'm_brace'], pts: 1,
  },
  confessor: {
    branches: ['속죄', '전가', '고행'],
    bd: { 속죄: '내 해로운 상태를 지워 보호를 얻고, 회복 · 스태미나 · 쿨타임을 추가로 얻습니다. 상처를 안고 시작하는 싸움에 강하고, 뒤에서 영창하는 적에게 약합니다', 전가: '내 해로운 상태를 적에게 옮기고 강화를 제거합니다. 모든 칸이 후열에 닿습니다. 치유 · 소환 · 저주하는 적에게 강하고, 큰 적에게 약합니다', 고행: '자신에게 해로운 상태를 걸어 짐을 쌓습니다. 짐에 비례해 피해를 더하거나, 짐을 소모해 피해나 붕괴를 더합니다. 큰 적에게 강하고, 긴 싸움에 약합니다' },
    haste: {},
    profile: { 속죄: { strong: ['상처'], weak: ['영창'] }, 전가: { strong: ['지원'], weak: ['거구'] }, 고행: { strong: ['거구'], weak: ['장기전'] }, 직업: { strong: [], weak: ['무리'] } },
    starters: ['c_mace', 'c_confess'], pts: 1,
  },
  /* 숨겨진 직업 3 (10월 7일). 직업 약점은 상처(생명력이 지갑이라 다친 채 시작하면 낼 피가 없다) */
  bloodmage: {
    branches: ['역병', '포식', '혈약'],
    bd: { 역병: '중독을 여럿에게 넓게 걸고, 한 적에 쌓인 독을 무리에게 옮깁니다. 무리에 강하고, 큰 적 하나에 약합니다', 포식: '한 적에게 독을 깊이 심고, 그 독을 먹어 생명력과 힘으로 바꿉니다. 긴 싸움에 강하고, 무리에 약합니다', 혈약: '생명력을 바쳐 큰 한 발로 무너뜨리고, 낸 피로 저주를 겁니다. 큰 적에 강하고, 긴 싸움에 약합니다' },
    haste: {},
    profile: { 역병: { strong: ['무리'], weak: ['거구'] }, 포식: { strong: ['장기전'], weak: ['무리'] }, 혈약: { strong: ['거구'], weak: ['장기전'] }, 직업: { strong: [], weak: ['강타'] } }, // 직업 약점: 설계는 상처였으나 50상황에서 상처는 평균 위, 강타가 −21~−29라 설계 C6 규칙대로 강타로 바꿨다 (10월 7일)
    starters: ['v_taint', 'v_drink'], pts: 1,
  },
};
/* 갈래 크기 (10월 3일 만든 사람 결정): 사다리 10줄(하급 6 · 중급 4), 줄마다 두 칸 = 갈래 20칸, 직업 60칸.
   포인트 설계: 포인트는 시작 1 + 레벨업마다 1(Lv10에 10, Lv15에 15). 등급별 챕터 제한은 유지한다.
   챕터 돌파 포인트(+2)는 0.6a.2에서 주지 않는다: Lv10까지 10점이 트리 크기의 기준이다(기획서 12.2절) */
const TREE_GATE = { 시작: 0, 하급: 0, 중급: 0, 상급: 0 }; // 사다리에서는 깊이가 등급 조건을 대신한다(쓰지 않음)
/* 챕터로 여는 등급: 1~2챕터는 하급·중급만으로 싸운다. 상급·궁극은 3챕터를 만들 때 다시 설계해 더한다 */
const TREE_CH = { 시작: 1, 하급: 1, 중급: 1, 상급: 3, 궁극: 5 }; // 상급·궁극 칸은 지웠지만(3챕터부터 다시 짠다) 여는 챕터는 남겨 둔다. 이 표에 없는 등급은 열리지 않는다(index.html treeWhy)
const EQUIP_SLOTS2 = 4;

/* 0.8.0 M5-0 보정 5(10월 20일 만든 사람, M14 선행: 마검사만): 스킬 꼬리표. 결합 칸의 조건(requires.tags)과 빌드 꼬리표 프로필(BD-9)이 읽는다.
   어휘: 출혈 · 화상 · 혈염 · 보호막 · 교대 · 붕괴 · 싣기 · 기본공격연동 · 흘리기 · 광역 · 빠름 */
const SB_TAGS = {
  sb_crimson: ['출혈'], sb_bloodfog: ['출혈', '싣기', '기본공격연동'], sb_brand: ['화상'], sb_inferno: ['화상'], sb_beatcut: ['교대', '붕괴'], sb_spellguard: ['보호막', '광역'], /* M5-0c: 새로 트리에 든 칸 */
  sb_bleedcut: ['출혈'], sb_bloodmark: ['출혈', '싣기'], sb_blooddrop: ['출혈'], sb_boil: ['출혈', '싣기', '빠름'], sb_taste: ['출혈'], sb_redwind: ['출혈', '광역'], sb_deluge: ['출혈', '광역'],
  sb_ember: ['화상'], sb_flamecut: ['화상', '싣기'], sb_spark: ['화상'], sb_kindle: ['화상', '싣기', '빠름'], sb_char: ['화상', '빠름'], sb_tome: ['화상', '싣기'], sb_hellfire: ['화상', '붕괴'],
  sb_bladeward: ['보호막', '교대'], sb_bolt: ['보호막', '빠름'], sb_shard: [], sb_unravel: ['교대'], sb_turn: ['교대', '빠름'], sb_shell: ['보호막', '빠름'], sb_finale: ['붕괴', '교대'],
  sb_bloodfire: ['출혈', '화상', '싣기'], sb_hotedge: ['출혈', '화상'], sb_searcut: ['혈염'], sb_searspread: ['혈염'], sb_searveil: ['혈염', '보호막'], sb_kalpa: ['혈염'],
  sb_bloodmail: ['보호막', '출혈'], sb_sinstrike: ['보호막', '출혈'], sb_film: ['보호막', '출혈'], sb_shackle: ['출혈', '붕괴'], sb_sinwall: ['보호막', '출혈'],
  sb_bloodfist: ['출혈', '기본공격연동'], sb_counterburn: ['화상', '흘리기'], sb_tricolor: ['출혈', '화상', '보호막'], sb_searburst: ['혈염', '광역'], sb_atone: ['보호막', '출혈'], sb_ashstorm: ['화상', '광역'],
  sb_heatmail: ['보호막', '기본공격연동'], sb_embercut: ['보호막', '화상'], sb_embermail: ['화상', '기본공격연동'], sb_cindermail: ['보호막', '화상'], sb_firebody: ['화상', '기본공격연동'],
};
for (const s of SKILLS2.spellblade || []) if (SB_TAGS[s.id]) s.tags = SB_TAGS[s.id].slice();
/* 0.8.0 M5-1 파수꾼 꼬리표(결합 칸 조건 · BD-9). 태세 · 기본공격연동 · 원거리 · 광역 · 보호막 · 붕괴 · 취약 */
const WD_TAGS = {
  w_dstance: ['태세', '보호막'], w_shieldhit: ['보호막'], w_pray: ['태세'], w_stand: ['보호막'], w_hold: ['보호막'], w_citadel: ['보호막'], w_beyond: ['보호막', '붕괴'],
  s_astance: ['태세', '기본공격연동'], s_slam: ['붕괴'], s_regret: ['취약'], s_march: ['기본공격연동', '붕괴'], s_cut: ['붕괴'], s_ruin: ['붕괴'], s_fall: ['붕괴'],
  f_sweep: ['광역'], f_chainblade: ['원거리'], f_stomp: ['광역', '붕괴'], w_shove: ['광역', '보호막'], f_drag: ['원거리', '붕괴'], f_collapse: ['광역', '붕괴'], f_hook: ['원거리'],
  w_flare: ['보호막', '붕괴'], w_rebuild: ['보호막'], w_breach: ['보호막', '붕괴'], w_rampart: ['보호막'], w_siege: ['보호막', '기본공격연동'],
  f_topple: ['광역', '붕괴'], s_lean: ['붕괴'], f_rampart: ['광역', '붕괴'], s_gapwatch: ['보호막'], s_quake: ['광역', '붕괴'],
  f_charge: ['광역', '붕괴'], w_spikes: ['보호막'], f_storm: ['광역'], w_armor: ['보호막'], w_valor: ['보호막'],
  w_turncoat: ['태세'], s_hammerhand: ['기본공격연동', '붕괴'], f_chainpull: ['원거리', '보호막'],
};
for (const s of SKILLS2.warden || []) if (WD_TAGS[s.id]) s.tags = WD_TAGS[s.id].slice();
/* 0.8.0 M5-2 수도승 꼬리표(결합 칸 조건 · BD-9): 기 · 되받기 · 자세 · 둔화 · 봉인 · 붕괴 · 광역 · 원거리 · 기본공격연동 */
const MK_TAGS = {
  m_yeonhwan: ['기', '기본공격연동'], m_bunggwon: ['기'], m_hoheup: ['기'], m_cheonsu: ['기'], m_eungchuk: ['기'], m_baekbo: ['원거리'], m_myeolgak: ['기'],
  m_geumgang: ['자세', '되받기'], m_yusu: ['자세'], m_balgyeong: ['붕괴'], m_cheolsan: ['기'], m_budong: ['자세', '되받기'], m_cheongeun: ['자세', '붕괴'], m_bulgoe: ['되받기'],
  m_jeomhyeol: ['둔화', '봉인'], m_sahyeol: ['둔화', '기'], m_maek: ['둔화'], m_bongswae: ['둔화', '봉인'], m_talgi: ['둔화'], m_poswae: ['둔화'], m_talhon: ['둔화', '광역', '기'],
  m_doedol: ['되받기', '기'], m_gibat: ['자세', '기'], m_tansan: ['광역', '붕괴'], m_cheolpo: ['자세'], m_yeokcheon: ['되받기', '자세', '붕괴'],
  m_yeokmaek: ['둔화'], m_maekji: ['자세', '둔화'], m_hyeolryu: ['광역', '둔화'], m_cheonri: ['자세', '원거리'], m_cheonmang: ['둔화', '봉인'],
  m_pamaek: ['기'], m_gagu: ['기'], m_gwanhyeol: ['둔화'], m_sunhwan: ['기'], m_ilji: ['기', '둔화'],
  m_samjae: ['기', '되받기'], m_yeokryu: ['둔화', '기본공격연동'], m_bultoe: ['자세', '붕괴'],
};
for (const s of SKILLS2.monk || []) if (MK_TAGS[s.id]) { s.tags = MK_TAGS[s.id].slice(); s.mk5 = 1; }
/* 0.8.0 M5-3 암살자 꼬리표(결합 칸 조건 · BD-9): 중독 · 터뜨리기 · 흘리기 · 후열 · 광역 · 붕괴 · 기본공격연동 */
const AS_TAGS = {
  a_dokkal: ['중독'], a_dokan: ['중독', '광역'], a_dokchim: ['중독', '기본공격연동'], a_godok: ['중독'], a_beonji: ['중독', '광역'], a_maengdok: ['중독'], a_yeokbyeong: ['중독', '광역'],
  a_gyeokpyo: ['터뜨리기', '후열'], a_gyeokjjil: ['터뜨리기'], a_bangul: ['중독', '후열'], a_dokpyo: ['중독', '후열'], a_dokssae: ['중독'], a_yeonswae: ['터뜨리기'], a_gyeolsan: ['터뜨리기'],
  a_heulbe: ['흘리기', '기본공격연동'], a_balbgi: ['후열'], a_gyeonu: ['흘리기'], a_heulkal: ['흘리기', '기본공격연동'], a_hugyeol: ['후열'], a_kalchum: ['흘리기', '기본공격연동'], a_cheohyeong: ['후열'],
  a_pieo: ['터뜨리기', '중독'], a_kkotip: ['터뜨리기'], a_heunal: ['터뜨리기', '광역'], a_jangmak: ['중독'], a_mandok: ['터뜨리기', '중독'],
  a_geuneul: ['중독'], a_sumjuk: ['흘리기'], a_kkweogi: ['붕괴'], a_yeonmak: ['흘리기'], a_muyeong: ['후열'],
  a_janjjil: ['중독'], a_geurimdok: ['중독', '기본공격연동'], a_pagodeul: ['중독'], a_heurit: ['흘리기'], a_janyeong: ['기본공격연동', '흘리기'],
  a_dokni: ['중독', '기본공격연동'], a_heuldok: ['흘리기', '중독'], a_dwikkot: ['터뜨리기', '후열'],
};
for (const s of SKILLS2.assassin || []) if (AS_TAGS[s.id]) { s.tags = AS_TAGS[s.id].slice(); s.as5 = 1; } // as5: 한 줄 설명(skBodyMk) · 설명 길이 경고 · 터뜨리기 배수 하나만(js/10) // mk5: 한 줄 설명(skBodyMk) · 설명 길이 경고(tree-check)
const HN_TAGS = { h5_pierce: ['추적'], h5_prey: ['추적', '기본공격연동'], h5_cover: ['보호'], h5_heavy: ['붕괴'], h5_lock: ['추적', '기본공격연동'], h5_sky: ['추적'], h5_endhunt: ['추적', '기본공격연동'], h5_volley: ['광역'], h5_nock: ['기본공격연동'], h5_harass: ['둔화'], h5_rain: ['출혈', '광역'], h5_barb: ['출혈', '기본공격연동'], h5_bloodrain: ['출혈', '광역'], h5_endless: ['기본공격연동'], h5_counter: ['몸 빼기'], h5_leg: ['둔화'], h5_dodge: ['몸 빼기'], h5_windstep: ['몸 빼기'], h5_stop: ['둔화', '붕괴'], h5_windveil: ['몸 빼기'], h5_icecage: ['둔화', '붕괴'], h5_aimvol: ['추적'], h5_steady: ['추적'], h5_pinpoint: ['추적'], h5_hawkeye: ['보호'], h5_mangung: ['추적'], h5_runshot: ['몸 빼기'], h5_dust: ['보호'], h5_storm: ['출혈', '광역'], h5_tailwind: ['기본공격연동'], h5_gale: ['기본공격연동'], h5_snare: ['둔화'], h5_hide: ['몸 빼기'], h5_ambush: ['둔화'], h5_camo: ['보호'], h5_trap: ['추적'], h5_chase: ['추적', '몸 빼기'], h5_scent: ['출혈', '추적'], h5_frozen: ['둔화', '기본공격연동'] };
for (const s of SKILLS2.hunter || []) if (HN_TAGS[s.id]) { s.tags = HN_TAGS[s.id].slice(); s.hn5 = 1; } // M5-4 hn5: 한 줄 설명(skBodyMk) · 설명 길이 경고 · 값 식(skValueHn) · 새 효과(js/10 hnUse)
const EL_TAGS = { e5_firebolt: ['화상'], e5_sparks: ['화상', '광역'], e5_cloak: ['화상'], e5_burnout: ['화상', '붕괴'], e5_spread: ['화상', '광역'], e5_inferno: ['화상', '붕괴'], e5_hongryeon: ['화상', '광역'], e5_icespear: ['둔화'], e5_frostarmor: ['둔화'], e5_rimefrost: ['둔화'], e5_crack: ['둔화', '붕괴'], e5_icewall: ['보호'], e5_shatter: ['둔화', '붕괴'], e5_coldwave: ['둔화', '광역'], e5_charge: ['기본공격연동'], e5_barrier: ['보호'], e5_mark: ['취약'], e5_volley: ['기본공격연동'], e5_mirror: ['보호'], e5_arcane: ['취약'], e5_ward: ['보호'], e5_weave: ['열충격', '화상', '둔화'], e5_catalyst: ['열충격'], e5_arc: ['열충격', '광역'], e5_storm: ['화상', '둔화', '광역'], e5_avatar: ['열충격'], e5_frostbolt: ['둔화'], e5_stillward: ['보호'], e5_shardrain: ['둔화', '광역'], e5_stilleye: ['보호'], e5_stasis: ['둔화'], e5_manaflame: ['화상'], e5_kindlemana: ['기본공격연동', '화상'], e5_flamelance: ['화상'], e5_heatshield: ['보호'], e5_meteor: ['화상', '광역'], e5_frostember: ['둔화', '화상'], e5_frostwall: ['보호', '둔화'], e5_manafire: ['기본공격연동', '화상'], e5_bolt: ['화상', '둔화'], e5_switch: [] };
for (const s of SKILLS2.elementalist || []) if (EL_TAGS[s.id]) { s.tags = EL_TAGS[s.id].slice(); s.el5 = 1; } // M5-5 el5: 한 줄 설명(skBodyMk) · 설명 길이 경고 · 값 식(skValueEl) · 새 효과(js/10 elUse)

