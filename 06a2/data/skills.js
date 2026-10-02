/* 0.6a.2 개편: 직업 스킬 트리 (docs/0.6a.2-개편-기획.md 4·7절, docs/0.6a.2-암살자-스킬.md)
   index.html보다 먼저 읽힌다. 값만 둔다. 실행은 index.html의 runSkill2, 설명 문장과 점수는 data/skillkit.js가 같은 데이터에서 만든다.
   스킬 한 줄: id, 갈래(b), 등급(tier: 기본·중급·상급·궁극), 이름(n), 대상(tgt: melee 근접 한 적, pick 고른 적, front 전열 모두, all 모든 적, self 나),
   행동 시간(time: fast 0.5 · normal 1 · slow 1.5), 찌르는 횟수(hits), 재사용(cd: 쓰고 나서 기다리는 내 차례 수, once: 전투마다 1번), 효과(fx).
   10월 3일 만든 사람 결정: 충전(스킬마다 다른 조건) 대신 재사용 대기 하나로 통일한다. 갈래마다 규칙 하나가 그 갈래 스킬의 남은 대기를 줄인다(TREE2.haste). */
const SKILLS2 = {
  assassin: [
    // 시작 스킬: 트리 밖. 늘 끼워져 있고 장착 칸을 차지하지 않는다. 어느 갈래에도 치우치지 않는 공격 하나, 방어 하나 (10월 3일 만든 사람 결정: 독 없음)
    { id: 'a_vital', b: '시작', tier: '시작', start: 1, n: '급소 찌르기', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 10 }, { k: 'brk', n: 15 }] },
    { id: 'a_slip', b: '시작', tier: '시작', start: 1, n: '몸 빼기', tgt: 'pick', time: 'fast', cd: 2, fx: [{ k: 'parry', red: 0.8 }, { k: 'stam', n: 25 }] },
    // 독사: 작은 독을 자주 걸고 키운다 (독을 걸면 대기 −1)
    { id: 'a_fang', b: '독사', tier: '기본', n: '독니', tgt: 'melee', time: 'normal', cd: 1, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 4 }] },
    { id: 'a_hack', b: '독사', tier: '기본', n: '난도질', tgt: 'melee', time: 'fast', hits: 2, cd: 3, fx: [{ k: 'dmg', n: 2 }, { k: 'poison', n: 1 }] },
    { id: 'a_dart', b: '독사', tier: '기본', n: '독 바른 투척', tgt: 'ranged', time: 'normal', cd: 2, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 4 }] },
    { id: 'a_rot', b: '독사', tier: '기본', n: '썩은 상처', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'a_double', b: '독사', tier: '중급', n: '독 배가', tgt: 'melee', time: 'normal', cd: 5, par: ['a_fang'], fx: [{ k: 'grow', mul: 2 }] },
    { id: 'a_bladedance', b: '독사', tier: '중급', n: '칼날 춤', tgt: 'front', time: 'fast', cd: 4, par: ['a_hack'], fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 1 }] },
    { id: 'a_seep', b: '독사', tier: '중급', n: '독 스미기', tgt: 'melee', time: 'fast', cd: 4, par: ['a_fang'], fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 2 }, { k: 'exploit', per: 0.5 }] },
    { id: 'a_mist', b: '독사', tier: '중급', n: '독무', tgt: 'front', time: 'normal', cd: 4, par: ['a_hack', 'a_rot'], fx: [{ k: 'poison', n: 2 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'a_spread', b: '독사', tier: '중급', n: '독 번지기', tgt: 'melee', time: 'normal', cd: 4, par: ['a_dart', 'a_rot'], fx: [{ k: 'dmg', n: 1 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_viperfang', b: '독사', tier: '상급', n: '독사의 송곳니', tgt: 'melee', time: 'normal', cd: 4, par: ['a_seep', 'a_bladedance'], fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 4 }] },
    { id: 'a_inject', b: '독사', tier: '상급', n: '독혈 주입', tgt: 'melee', time: 'slow', cd: 6, par: ['a_double'], fx: [{ k: 'grow', mul: 2.5 }] },
    { id: 'a_cloud', b: '독사', tier: '상급', n: '독구름', tgt: 'all', time: 'normal', cd: 3, par: ['a_mist', 'a_spread'], fx: [{ k: 'poison', n: 2 }] },
    { id: 'a_needles', b: '독사', tier: '궁극', n: '천 개의 바늘', tgt: 'melee', time: 'slow', hits: 7, once: 1, par: ['a_inject', 'a_viperfang', 'a_cloud'], tease: 1, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 2 }, { k: 'capOver', cap: 30 }] },
    // 격발: 독을 심고 한 번에 터뜨려 피해와 붕괴로 바꾼다 (적을 쓰러뜨리면 대기 −1). 독 심기가 있어 이 갈래만으로도 돈다
    { id: 'a_plant', b: '격발', tier: '기본', n: '독 심기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 5 }] },
    { id: 'a_burst', b: '격발', tier: '기본', n: '독 격발', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'burst', pre: 2, mul: 1.5, brkPer: 2 }] },
    { id: 'a_pop', b: '격발', tier: '기본', n: '톡 쏘는 독', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'burst', pre: 1, top: 3, mul: 1.5, brkPer: 5 }] },
    { id: 'a_finish', b: '격발', tier: '기본', n: '마무리 찌르기', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 8 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'a_boil', b: '격발', tier: '중급', n: '끓는 피', tgt: 'melee', time: 'normal', cd: 4, par: ['a_burst'], fx: [{ k: 'burst', pre: 2, mul: 1, keep: 0.5, brkPer: 4 }] },
    { id: 'a_chain', b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', cd: 3, killRecharge: 1, par: ['a_burst', 'a_finish'], fx: [{ k: 'burst', pre: 2, mul: 1.5, brkPer: 4 }] },
    { id: 'a_rend', b: '격발', tier: '중급', n: '갈라 터뜨리기', tgt: 'melee', time: 'normal', cd: 4, par: ['a_plant'], fx: [{ k: 'dmg', n: 4 }, { k: 'exploit', per: 4 }] },
    { id: 'a_crumble', b: '격발', tier: '중급', n: '무너뜨리는 독', tgt: 'melee', time: 'fast', cd: 2, par: ['a_plant', 'a_pop'], fx: [{ k: 'dmg', n: 4 }, { k: 'brkPer', per: 17 }] },
    { id: 'a_gash', b: '격발', tier: '중급', n: '상처 벌리기', tgt: 'melee', time: 'normal', cd: 4, par: ['a_pop', 'a_finish'], fx: [{ k: 'st', s: 'vuln', n: 2 }, { k: 'burst', pre: 2, mul: 1.5, brkPer: 3 }] },
    { id: 'a_heart', b: '격발', tier: '상급', n: '심장 격발', tgt: 'melee', time: 'slow', cd: 5, par: ['a_boil'], fx: [{ k: 'burst', pre: 2, mul: 2, brkPer: 8 }] },
    { id: 'a_bloodcut', b: '격발', tier: '상급', n: '독혈 가르기', tgt: 'melee', time: 'normal', cd: 3, par: ['a_rend', 'a_gash'], fx: [{ k: 'dmg', n: 10 }, { k: 'exploit', per: 3 }] },
    { id: 'a_storm', b: '격발', tier: '상급', n: '독 폭풍', tgt: 'all', time: 'slow', cd: 6, par: ['a_chain', 'a_crumble'], fx: [{ k: 'burst', pre: 2, mul: 1.5, brkPer: 2 }] },
    { id: 'a_execute', b: '격발', tier: '궁극', n: '처형', tgt: 'melee', time: 'slow', once: 1, killRecharge: 1, par: ['a_heart', 'a_storm', 'a_bloodcut'], tease: 1, fx: [{ k: 'burst', pre: 2, mul: 2, brkPer: 4 }, { k: 'execute', hp: 0.35, mul: 7 }] },
    // 그림자: 공격을 흘려 낸 틈을 찌른다 (흘리기에 성공하면 대기 −1). 독 없이 피해와 붕괴로 싸운다(독 묻은 칼막이만 독사·격발과 잇는 다리)
    { id: 'a_shadow', b: '그림자', tier: '기본', n: '그림자 찌르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 10 }] },
    { id: 'a_deflect', b: '그림자', tier: '기본', n: '흘려 베기', tgt: 'pick', time: 'normal', cd: 3, fx: [{ k: 'parry', red: 0.6 }, { k: 'dmg', n: 11 }] },
    { id: 'a_trip', b: '그림자', tier: '기본', n: '발 걸기', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 5 }, { k: 'brk', n: 40 }] },
    { id: 'a_step', b: '그림자', tier: '기본', n: '그림자 밟기', tgt: 'ranged', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 11 }] },
    { id: 'a_gap', b: '그림자', tier: '중급', n: '빈틈 노리기', tgt: 'melee', time: 'fast', cd: 4, par: ['a_shadow', 'a_trip'], fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 20 }] },
    { id: 'a_after', b: '그림자', tier: '중급', n: '잔상', tgt: 'pick', time: 'fast', cd: 3, par: ['a_deflect'], fx: [{ k: 'parry', red: 0.7 }, { k: 'onParry', dmg: 6, brk: 15 }] },
    { id: 'a_venomguard', b: '그림자', tier: '중급', n: '독 묻은 칼막이', tgt: 'pick', time: 'normal', cd: 4, par: ['a_deflect'], fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', poison: 5 }] },
    { id: 'a_aim', b: '그림자', tier: '중급', n: '칼끝 겨누기', tgt: 'self', time: 'fast', cd: 3, par: ['a_shadow', 'a_step'], fx: [{ k: 'parryBuff', red: 0, dmg: 20 }] },
    { id: 'a_pierce', b: '그림자', tier: '중급', n: '급소 꿰기', tgt: 'melee', time: 'normal', cd: 3, par: ['a_trip', 'a_step'], fx: [{ k: 'dmg', n: 15 }, { k: 'brokenx', mul: 2 }] },
    { id: 'a_riposte', b: '그림자', tier: '상급', n: '칼끝 되받기', tgt: 'pick', time: 'normal', cd: 4, par: ['a_venomguard'], fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 18, brk: 15 }] },
    { id: 'a_flurry', b: '그림자', tier: '상급', n: '그림자 연격', tgt: 'melee', time: 'fast', hits: 4, cd: 3, par: ['a_gap', 'a_pierce'], fx: [{ k: 'dmg', n: 4 }, { k: 'brk', n: 3 }] },
    { id: 'a_dark', b: '그림자', tier: '상급', n: '어둠 속 일격', tgt: 'melee', time: 'slow', cd: 5, par: ['a_aim', 'a_after'], fx: [{ k: 'dmg', n: 28 }, { k: 'brk', n: 25 }] },
    { id: 'a_dance', b: '그림자', tier: '궁극', n: '그림자 춤', tgt: 'self', time: 'normal', once: 1, par: ['a_flurry', 'a_dark', 'a_riposte'], tease: 1, fx: [{ k: 'parryBuff', red: 0.2, stam: 30, times: 3, dmg: 26 }] },
  ],
};
/* 직업마다 트리 틀: 갈래 순서와 한 줄 설명, 시작 스킬(트리 밖), 처음 주는 포인트.
   트리는 모두 잠긴 채 시작하고, 칸은 부모(par) 가운데 하나를 열어야 열린다. 깊은 등급은 그 갈래에 먼저 쓴 포인트도 있어야 한다(TREE_GATE).
   보이는 칸: 기본, 부모가 열린 칸. 궁극(tease)은 이름만 먼저 보인다. 나머지는 "?" (기대감, 10월 3일 만든 사람 결정) */
const TREE2 = {
  assassin: {
    branches: ['독사', '격발', '그림자'],
    bd: { 독사: '작은 독을 자주 걸고 키운다', 격발: '독을 심고 한 번에 터뜨려 피해와 붕괴로 바꾼다', 그림자: '공격을 흘려 낸 틈을 피해와 붕괴로 찌른다' },
    haste: { 독사: 'poison', 격발: 'kill', 그림자: 'parry' }, // 갈래 규칙: 이 일이 일어난 행동마다(한 행동에 한 번) 그 갈래 스킬의 남은 대기 −1
    starters: ['a_vital', 'a_slip'], pts: 1,
  },
};
/* 갈래 크기 (10월 3일 만든 사람 결정): 기본 4 · 중급 5 · 상급 3 · 궁극 1 = 13칸, 직업 39칸. 10챕터로 가며 깊은 줄을 더해 직업 45~50칸.
   포인트 설계 (10월 3일, 만든 사람: 한 갈래를 파면서도 다른 갈래를 찍을 수 있게): 한 갈래 궁극까지 5점(기본·중급·상급 각 하나 + 등급 조건 + 궁극) ≈ 그 시점 포인트의 70%.
   포인트: 시작 1, 레벨마다 1, 챕터 돌파 2 → 1챕터 보스 앞 4(궁극은 아직), 2챕터 시작 7(궁극 5 + 2), 2챕터 보스 앞 11(+6), 3챕터 시작 14 */
const TREE_GATE = { 시작: 0, 기본: 0, 중급: 1, 상급: 2, 궁극: 4 };
/* 챕터로 여는 등급 (10월 3일 만든 사람 결정): 1~2챕터는 기본·중급만으로 싸운다. 상급은 3챕터, 궁극은 5챕터에 들어가야 열린다. 더 깊은 줄은 그 챕터를 만들 때 더한다(7·9챕터) */
const TREE_CH = { 시작: 1, 기본: 1, 중급: 1, 상급: 3, 궁극: 5 };
const EQUIP_SLOTS2 = 4;
