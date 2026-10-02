/* 0.6a.2 개편: 직업 스킬 트리 (docs/0.6a.2-개편-기획.md 4·7절, docs/0.6a.2-암살자-스킬.md)
   index.html보다 먼저 읽힌다. 값만 둔다. 실행은 index.html의 runSkill2, 설명 문장과 점수는 data/skillkit.js가 같은 데이터에서 만든다.
   스킬 한 줄: id, 갈래(b), 등급(tier: 기본·중급·상급·궁극), 이름(n), 대상(tgt: melee 근접 한 적, pick 고른 적, front 전열 모두, all 모든 적, self 나),
   행동 시간(time: fast 0.5 · normal 1 · slow 1.5), 찌르는 횟수(hits), 충전(ch: 최대, 조건, 몇 번마다. 조건이 없으면 전투마다 1번), 효과(fx). */
const SKILLS2 = {
  assassin: [
    // 독사: 작은 독을 자주 걸고 키운다
    { id: 'a_fang', b: '독사', tier: '기본', n: '독니', tgt: 'melee', time: 'normal', ch: { max: 3, on: 'turn', every: 2 }, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 4 }] },
    { id: 'a_hack', b: '독사', tier: '기본', n: '난도질', tgt: 'melee', time: 'fast', hits: 2, ch: { max: 2, on: 'apply', every: 6 }, fx: [{ k: 'dmg', n: 2 }, { k: 'poison', n: 2 }] },
    { id: 'a_double', b: '독사', tier: '중급', n: '독 배가', tgt: 'melee', time: 'fast', ch: { max: 1, on: 'apply', every: 4 }, fx: [{ k: 'grow', mul: 2, add: 2 }] },
    { id: 'a_bladedance', b: '독사', tier: '중급', n: '칼날 춤', tgt: 'front', time: 'fast', ch: { max: 2, on: 'apply', every: 6 }, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 3 }] },
    { id: 'a_seep', b: '독사', tier: '중급', n: '독 스미기', tgt: 'melee', time: 'fast', ch: { max: 2, on: 'apply', every: 3 }, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 3 }, { k: 'exploit', per: 0.5 }] },
    { id: 'a_mist', b: '독사', tier: '중급', n: '독무', tgt: 'front', time: 'normal', ch: { max: 1, on: 'turn', every: 6 }, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 4 }] },
    { id: 'a_viperfang', b: '독사', tier: '상급', n: '독사의 송곳니', tgt: 'melee', time: 'normal', ch: { max: 1, on: 'apply', every: 4 }, fx: [{ k: 'dmg', n: 8 }, { k: 'poison', n: 7 }] },
    { id: 'a_inject', b: '독사', tier: '상급', n: '독혈 주입', tgt: 'melee', time: 'normal', ch: { max: 1, on: 'apply', every: 5 }, fx: [{ k: 'grow', mul: 3, add: 2 }] },
    { id: 'a_cloud', b: '독사', tier: '상급', n: '독구름', tgt: 'all', time: 'normal', ch: { max: 2, on: 'apply', every: 4 }, fx: [{ k: 'poison', n: 4 }] },
    { id: 'a_needles', b: '독사', tier: '궁극', n: '천 개의 바늘', tgt: 'melee', time: 'slow', hits: 7, ch: { max: 1 }, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 3 }, { k: 'capOver', cap: 30 }] },
    // 격발: 쌓인 중독을 한 번에 피해와 붕괴로
    { id: 'a_burst', b: '격발', tier: '기본', n: '독 격발', tgt: 'melee', time: 'normal', ch: { max: 2, on: 'apply', every: 3 }, fx: [{ k: 'burst', mul: 2, brkPer: 5 }] },
    { id: 'a_snap', b: '격발', tier: '기본', n: '짧은 격발', tgt: 'melee', time: 'fast', ch: { max: 2, on: 'turn', every: 9 }, fx: [{ k: 'burst', top: 3, mul: 2, brkPer: 2 }] },
    { id: 'a_boil', b: '격발', tier: '중급', n: '끓는 피', tgt: 'melee', time: 'normal', ch: { max: 1, on: 'apply', every: 4 }, fx: [{ k: 'burst', mul: 2, keep: 0.5, brkPer: 4 }] },
    { id: 'a_chain', b: '격발', tier: '중급', n: '연쇄 격발', tgt: 'melee', time: 'normal', ch: { max: 1, on: 'kill', every: 1 }, fx: [{ k: 'burst', mul: 2.3, brkPer: 4 }] },
    { id: 'a_rend', b: '격발', tier: '중급', n: '갈라 터뜨리기', tgt: 'melee', time: 'normal', ch: { max: 2, on: 'apply', every: 4 }, fx: [{ k: 'dmg', n: 4 }, { k: 'exploit', per: 4 }] },
    { id: 'a_crumble', b: '격발', tier: '중급', n: '무너뜨리는 독', tgt: 'melee', time: 'fast', ch: { max: 2, on: 'apply', every: 3 }, fx: [{ k: 'dmg', n: 4 }, { k: 'brkPer', per: 17 }] },
    { id: 'a_heart', b: '격발', tier: '상급', n: '심장 격발', tgt: 'melee', time: 'slow', ch: { max: 1, on: 'apply', every: 4 }, fx: [{ k: 'burst', mul: 3.3, brkPer: 8 }] },
    { id: 'a_bloodcut', b: '격발', tier: '상급', n: '독혈 가르기', tgt: 'melee', time: 'normal', ch: { max: 1, on: 'kill', every: 1 }, fx: [{ k: 'dmg', n: 10 }, { k: 'exploit', per: 3 }] },
    { id: 'a_storm', b: '격발', tier: '상급', n: '독 폭풍', tgt: 'all', time: 'slow', ch: { max: 1, on: 'turn', every: 8 }, fx: [{ k: 'burst', mul: 2, brkPer: 3 }] },
    { id: 'a_execute', b: '격발', tier: '궁극', n: '처형', tgt: 'melee', time: 'slow', ch: { max: 1 }, killRecharge: 1, fx: [{ k: 'burst', mul: 3.9, brkPer: 4 }, { k: 'execute', hp: 0.35, mul: 7 }] },
    // 그림자: 흘리기 중심
    { id: 'a_shadow', b: '그림자', tier: '기본', n: '그림자 찌르기', tgt: 'melee', time: 'normal', ch: { max: 2, on: 'parry', every: 1 }, fx: [{ k: 'dmg', n: 13 }, { k: 'poison', n: 3 }] },
    { id: 'a_deflect', b: '그림자', tier: '기본', n: '흘려 베기', tgt: 'melee', time: 'normal', ch: { max: 2, on: 'turn', every: 5 }, fx: [{ k: 'parry', red: 0.6 }, { k: 'dmg', n: 6 }] },
    { id: 'a_gap', b: '그림자', tier: '중급', n: '빈틈 노리기', tgt: 'melee', time: 'fast', ch: { max: 2, on: 'parry', every: 1 }, fx: [{ k: 'dmg', n: 16 }, { k: 'brk', n: 20 }] },
    { id: 'a_after', b: '그림자', tier: '중급', n: '잔상', tgt: 'pick', time: 'fast', ch: { max: 1, on: 'turn', every: 4 }, fx: [{ k: 'parry', red: 0.8 }] },
    { id: 'a_venomguard', b: '그림자', tier: '중급', n: '독 묻은 칼막이', tgt: 'pick', time: 'normal', ch: { max: 2, on: 'apply', every: 4 }, fx: [{ k: 'parry', red: 0.6 }, { k: 'onParry', poison: 4 }] },
    { id: 'a_aim', b: '그림자', tier: '중급', n: '칼끝 겨누기', tgt: 'self', time: 'fast', ch: { max: 2, on: 'turn', every: 5 }, fx: [{ k: 'parryBuff', red: 0, dmg: 17 }] },
    { id: 'a_riposte', b: '그림자', tier: '상급', n: '칼끝 되받기', tgt: 'pick', time: 'normal', ch: { max: 1, on: 'turn', every: 8 }, fx: [{ k: 'parry', red: 0.8 }, { k: 'onParry', dmg: 8, poison: 3 }] },
    { id: 'a_flurry', b: '그림자', tier: '상급', n: '그림자 연격', tgt: 'melee', time: 'fast', hits: 4, ch: { max: 2, on: 'parry', every: 1 }, fx: [{ k: 'dmg', n: 3 }, { k: 'poison', n: 1 }] },
    { id: 'a_dark', b: '그림자', tier: '상급', n: '어둠 속 일격', tgt: 'melee', time: 'slow', ch: { max: 1, on: 'parry', every: 1 }, fx: [{ k: 'dmg', n: 38 }, { k: 'brk', n: 30 }] },
    { id: 'a_dance', b: '그림자', tier: '궁극', n: '그림자 춤', tgt: 'self', time: 'normal', ch: { max: 1 }, fx: [{ k: 'parryBuff', red: 0.2, stam: 30, times: 3, dmg: 14, poison: 3 }] },
  ],
};
/* 직업마다 트리 틀: 갈래 순서, 처음부터 열린 스킬(갈래마다 기본 하나), 등급별로 그 갈래에 먼저 써야 하는 포인트 */
const TREE2 = {
  assassin: { branches: ['독사', '격발', '그림자'], start: ['a_fang', 'a_burst', 'a_shadow'] },
};
const TREE_GATE = { 기본: 0, 중급: 1, 상급: 3, 궁극: 5 };
const EQUIP_SLOTS2 = 4;
