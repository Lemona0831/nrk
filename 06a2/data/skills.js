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
    // 독사: 작은 독을 자주 걸고 키운다 (독을 걸면 대기 −1). 줄(row)마다 두 칸, 윗줄 두 칸 가운데 하나를 열면 열린다
    { id: 'a_fang', row: 1, b: '독사', tier: '하급', n: '독니', tgt: 'melee', time: 'normal', cd: 1, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 4 }] },
    { id: 'a_hack', row: 1, b: '독사', tier: '하급', n: '난도질', tgt: 'melee', time: 'fast', hits: 2, cd: 3, fx: [{ k: 'dmg', n: 2 }, { k: 'poison', n: 1 }] },
    { id: 'a_dart', row: 2, b: '독사', tier: '하급', n: '독 바른 투척', tgt: 'ranged', time: 'normal', cd: 2, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 4 }] },
    { id: 'a_rot', row: 2, b: '독사', tier: '하급', n: '썩은 상처', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'a_numb', row: 3, b: '독사', tier: '하급', n: '둔한 독', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_wedge', row: 3, b: '독사', tier: '하급', n: '독 쐐기', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'brk', n: 20 }] },
    { id: 'a_sheath', row: 4, b: '독사', tier: '하급', n: '독 칼집', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'dmg', n: 1 }, { k: 'poison', n: 2 }, { k: 'stam', n: 15 }] },
    { id: 'a_sap', row: 4, b: '독사', tier: '하급', n: '기운 빼는 독', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 3 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'a_double', row: 5, b: '독사', tier: '중급', n: '독 배가', tgt: 'melee', time: 'normal', cd: 5, fx: [{ k: 'grow', mul: 2 }] },
    { id: 'a_seep', row: 5, b: '독사', tier: '중급', n: '독 스미기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 2 }, { k: 'exploit', per: 0.5 }] },
    { id: 'a_bladedance', row: 6, b: '독사', tier: '중급', n: '칼날 춤', tgt: 'front', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 1 }] },
    { id: 'a_mist', row: 6, b: '독사', tier: '중급', n: '독무', tgt: 'front', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 2 }, { k: 'st', s: 'weak', n: 1 }] },
    { id: 'a_spread', row: 7, b: '독사', tier: '중급', n: '독 번지기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 1 }, { k: 'spread', per: 0.5 }] },
    { id: 'a_condense', row: 7, b: '독사', tier: '중급', n: '독 응축', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'grow', mul: 1.5, add: 2 }] },
    { id: 'a_viperfang', row: 8, b: '독사', tier: '상급', n: '독사의 송곳니', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 6 }, { k: 'poison', n: 4 }] },
    { id: 'a_inject', row: 8, b: '독사', tier: '상급', n: '독혈 주입', tgt: 'melee', time: 'slow', cd: 6, fx: [{ k: 'grow', mul: 2.5 }] },
    { id: 'a_cloud', row: 9, b: '독사', tier: '상급', n: '독구름', tgt: 'all', time: 'normal', cd: 3, fx: [{ k: 'poison', n: 2 }] },
    { id: 'a_flood', row: 9, b: '독사', tier: '상급', n: '독의 홍수', tgt: 'all', time: 'slow', cd: 3, fx: [{ k: 'grow', mul: 1.5 }] },
    { id: 'a_needles', row: 10, b: '독사', tier: '궁극', n: '천 개의 바늘', tgt: 'melee', time: 'slow', hits: 7, once: 1, tease: 1, fx: [{ k: 'dmg', n: 4 }, { k: 'poison', n: 2 }, { k: 'capOver', cap: 30 }] },
    // 격발: 독을 심고 한 번에 터뜨려 피해와 붕괴로 바꾼다 (적을 쓰러뜨리면 대기 −1). 줄(row)마다 두 칸, 윗줄 두 칸 가운데 하나를 열면 열린다
    { id: 'a_plant', row: 1, b: '격발', tier: '하급', n: '독 심기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'poison', n: 5 }] },
    { id: 'a_burst', row: 1, b: '격발', tier: '하급', n: '독 격발', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'burst', pre: 2, mul: 1.5, brkPer: 2 }] },
    { id: 'a_pop', row: 2, b: '격발', tier: '하급', n: '톡 쏘는 독', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'burst', pre: 1, top: 3, mul: 1.5, brkPer: 5 }] },
    { id: 'a_finish', row: 2, b: '격발', tier: '하급', n: '마무리 찌르기', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 8 }, { k: 'lowx', hp: 0.3, mul: 2 }] },
    { id: 'a_deepplant', row: 3, b: '격발', tier: '하급', n: '깊이 심기', tgt: 'melee', time: 'slow', cd: 4, fx: [{ k: 'poison', n: 6 }] },
    { id: 'a_pouch', row: 3, b: '격발', tier: '하급', n: '독 주머니 던지기', tgt: 'ranged', time: 'normal', cd: 2, fx: [{ k: 'poison', n: 4 }] },
    { id: 'a_burststab', row: 4, b: '격발', tier: '하급', n: '터뜨리는 일격', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 7 }, { k: 'burst', top: 3, mul: 2, brkPer: 3 }] },
    { id: 'a_brkneedle', row: 4, b: '격발', tier: '하급', n: '붕괴 독침', tgt: 'melee', time: 'fast', cd: 3, fx: [{ k: 'poison', n: 2 }, { k: 'brk', n: 35 }] },
    { id: 'a_boil', row: 5, b: '격발', tier: '중급', n: '끓는 피', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'burst', pre: 2, mul: 1, keep: 0.5, brkPer: 4 }] },
    { id: 'a_chain', row: 5, b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', cd: 3, killRecharge: 1, fx: [{ k: 'burst', pre: 2, mul: 1.5, brkPer: 4 }] },
    { id: 'a_rend', row: 6, b: '격발', tier: '중급', n: '갈라 터뜨리기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 4 }, { k: 'exploit', per: 4 }] },
    { id: 'a_crumble', row: 6, b: '격발', tier: '중급', n: '무너뜨리는 독', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 4 }, { k: 'brkPer', per: 17 }] },
    { id: 'a_gash', row: 7, b: '격발', tier: '중급', n: '상처 벌리기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'st', s: 'vuln', n: 2 }, { k: 'burst', pre: 2, mul: 1.5, brkPer: 3 }] },
    { id: 'a_frontburst', row: 7, b: '격발', tier: '중급', n: '피의 연쇄', tgt: 'front', time: 'normal', cd: 5, fx: [{ k: 'burst', pre: 1, mul: 1.5, brkPer: 2 }] },
    { id: 'a_heart', row: 8, b: '격발', tier: '상급', n: '심장 격발', tgt: 'melee', time: 'slow', cd: 5, fx: [{ k: 'burst', pre: 2, mul: 2, brkPer: 8 }] },
    { id: 'a_bloodcut', row: 8, b: '격발', tier: '상급', n: '독혈 가르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 10 }, { k: 'exploit', per: 3 }] },
    { id: 'a_storm', row: 9, b: '격발', tier: '상급', n: '독 폭풍', tgt: 'all', time: 'slow', cd: 6, fx: [{ k: 'burst', pre: 2, mul: 1.25, brkPer: 2 }] },
    { id: 'a_endbreath', row: 9, b: '격발', tier: '상급', n: '숨통 끊기', tgt: 'melee', time: 'normal', cd: 4, fx: [{ k: 'dmg', n: 16 }, { k: 'lowx', hp: 0.4, mul: 2.5 }] },
    { id: 'a_execute', row: 10, b: '격발', tier: '궁극', n: '처형', tgt: 'melee', time: 'slow', once: 1, killRecharge: 1, tease: 1, fx: [{ k: 'burst', pre: 2, mul: 2, brkPer: 4 }, { k: 'execute', hp: 0.35, mul: 7 }] },
    // 그림자: 공격을 흘려 낸 틈을 피해와 붕괴로 찌른다 (흘려 내면 대기 −1). 줄(row)마다 두 칸, 윗줄 두 칸 가운데 하나를 열면 열린다
    { id: 'a_shadow', row: 1, b: '그림자', tier: '하급', n: '그림자 찌르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 10 }] },
    { id: 'a_deflect', row: 1, b: '그림자', tier: '하급', n: '흘려 베기', tgt: 'pick', time: 'normal', cd: 3, fx: [{ k: 'parry', red: 0.6 }, { k: 'dmg', n: 11 }] },
    { id: 'a_trip', row: 2, b: '그림자', tier: '하급', n: '발 걸기', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 5 }, { k: 'brk', n: 40 }] },
    { id: 'a_step', row: 2, b: '그림자', tier: '하급', n: '그림자 밟기', tgt: 'ranged', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 11 }] },
    { id: 'a_check', row: 3, b: '그림자', tier: '하급', n: '견제 찌르기', tgt: 'melee', time: 'normal', cd: 2, fx: [{ k: 'dmg', n: 13 }, { k: 'st', s: 'weak', n: 2 }] },
    { id: 'a_backstep', row: 3, b: '그림자', tier: '하급', n: '흘리며 물러서기', tgt: 'pick', time: 'fast', cd: 2, fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', brk: 40 }] },
    { id: 'a_mark', row: 4, b: '그림자', tier: '하급', n: '그림자 표식', tgt: 'melee', time: 'fast', cd: 2, fx: [{ k: 'dmg', n: 8 }, { k: 'st', s: 'vuln', n: 2 }] },
    { id: 'a_smoke', row: 4, b: '그림자', tier: '하급', n: '연막', tgt: 'self', time: 'fast', cd: 5, fx: [{ k: 'parryBuff', red: 0.2, stam: 25, times: 3 }] },
    { id: 'a_gap', row: 5, b: '그림자', tier: '중급', n: '빈틈 노리기', tgt: 'melee', time: 'fast', cd: 4, fx: [{ k: 'dmg', n: 14 }, { k: 'brk', n: 20 }] },
    { id: 'a_after', row: 5, b: '그림자', tier: '중급', n: '잔상', tgt: 'pick', time: 'fast', cd: 3, fx: [{ k: 'parry', red: 0.7 }, { k: 'onParry', dmg: 6, brk: 15 }] },
    { id: 'a_venomguard', row: 6, b: '그림자', tier: '중급', n: '독 묻은 칼막이', tgt: 'pick', time: 'normal', cd: 4, fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', poison: 5 }] },
    { id: 'a_aim', row: 6, b: '그림자', tier: '중급', n: '칼끝 겨누기', tgt: 'self', time: 'fast', cd: 3, fx: [{ k: 'parryBuff', red: 0, dmg: 20 }] },
    { id: 'a_pierce', row: 7, b: '그림자', tier: '중급', n: '급소 꿰기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 15 }, { k: 'brokenx', mul: 2 }] },
    { id: 'a_strangle', row: 7, b: '그림자', tier: '중급', n: '목 조르기', tgt: 'melee', time: 'normal', cd: 3, fx: [{ k: 'dmg', n: 16 }, { k: 'st', s: 'chill', n: 2 }] },
    { id: 'a_riposte', row: 8, b: '그림자', tier: '상급', n: '칼끝 되받기', tgt: 'pick', time: 'normal', cd: 4, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 18, brk: 15 }] },
    { id: 'a_flurry', row: 8, b: '그림자', tier: '상급', n: '그림자 연격', tgt: 'melee', time: 'fast', hits: 4, cd: 3, fx: [{ k: 'dmg', n: 4 }, { k: 'brk', n: 3 }] },
    { id: 'a_dark', row: 9, b: '그림자', tier: '상급', n: '어둠 속 일격', tgt: 'melee', time: 'slow', cd: 5, fx: [{ k: 'dmg', n: 28 }, { k: 'brk', n: 25 }] },
    { id: 'a_shadowexec', row: 9, b: '그림자', tier: '상급', n: '그림자 처형', tgt: 'melee', time: 'slow', cd: 4, fx: [{ k: 'dmg', n: 20 }, { k: 'brokenx', mul: 2.5 }] },
    { id: 'a_dance', row: 10, b: '그림자', tier: '궁극', n: '그림자 춤', tgt: 'self', time: 'normal', once: 1, tease: 1, fx: [{ k: 'parryBuff', red: 0.2, stam: 30, times: 3, dmg: 26 }] },
  ],
};
/* 사다리 (10월 3일 만든 사람 결정): 갈래마다 하급 4줄 · 중급 3줄 · 상급 2줄 · 궁극 1칸, 줄마다 두 칸. 윗줄 두 칸 가운데 하나라도 열려 있으면 아랫줄이 열린다.
   부모(par)는 줄로 만든다(첫 줄은 부모 없음). 깊이가 곧 속도 조절이고, 상급·궁극은 챕터 잠금(TREE_CH)도 함께 둔다 */
for (const k in SKILLS2) { const L = SKILLS2[k]; for (const s of L) if (s.row > 1) s.par = L.filter(x => x.b === s.b && x.row === s.row - 1).map(x => x.id); }
/* 직업마다 트리 틀: 갈래 순서와 한 줄 설명, 시작 스킬(트리 밖), 처음 주는 포인트.
   트리는 모두 잠긴 채 시작하고, 칸은 부모(par: 윗줄) 가운데 하나를 열어야 열린다.
   보이는 칸: 첫 줄, 부모가 열린 칸. 궁극(tease)은 이름만 먼저 보인다. 나머지는 "?" (기대감, 10월 3일 만든 사람 결정) */
const TREE2 = {
  assassin: {
    branches: ['독사', '격발', '그림자'],
    bd: { 독사: '작은 독을 자주 걸고 키운다', 격발: '독을 심고 한 번에 터뜨려 피해와 붕괴로 바꾼다', 그림자: '공격을 흘려 낸 틈을 피해와 붕괴로 찌른다' },
    haste: { 독사: 'poison', 격발: 'kill', 그림자: 'parry' }, // 갈래 규칙: 이 일이 일어난 행동마다(한 행동에 한 번) 그 갈래 스킬의 남은 대기 −1
    starters: ['a_vital', 'a_slip'], pts: 1,
  },
};
/* 갈래 크기 (10월 3일 만든 사람 결정): 사다리 10줄, 하급 8 · 중급 6 · 상급 4 · 궁극 1 = 19칸, 직업 57칸.
   포인트 설계: 한 갈래를 줄마다 하나씩 내려가면 상급 첫 줄까지 8점, 궁극까지 10점. 남는 포인트로 다른 칸·다른 갈래를 연다.
   포인트: 시작 1, 레벨마다 1, 챕터 돌파 2 → 1챕터 보스 앞 4(궁극은 아직), 2챕터 시작 7(궁극 5 + 2), 2챕터 보스 앞 11(+6), 3챕터 시작 14 */
const TREE_GATE = { 시작: 0, 하급: 0, 중급: 0, 상급: 0, 궁극: 0 }; // 사다리에서는 깊이가 등급 조건을 대신한다(쓰지 않음)
/* 챕터로 여는 등급 (10월 3일 만든 사람 결정): 1~2챕터는 하급·중급만으로 싸운다. 상급은 3챕터, 궁극은 5챕터에 들어가야 열린다. 더 깊은 줄은 그 챕터를 만들 때 더한다(7·9챕터) */
const TREE_CH = { 시작: 1, 하급: 1, 중급: 1, 상급: 3, 궁극: 5 };
const EQUIP_SLOTS2 = 4;
