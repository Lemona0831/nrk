/* 0.6a.2 직업 균형용 특정 상황 50종 (10월 3일 만든 사람 요청: 1챕터 던전이 아니라 정해 둔 상황으로 스킬 균형을 잡는다)
   범주 10개 × 5. 직업·갈래마다 "어느 범주에 강하고 어느 범주에 약한가"를 정해 두고(TREE2[직업].profile), tools/sitqa.js가 실제 승률과 맞는지 잰다.
   상황 하나: id, cat(범주), n(이름), room(던전 방과 같은 꼴: en [[역할, 정예]], tough [칸], mods, ambush, strong·foe(강적), boss(보스 종류), pre(시작 상태)), p(내 시작: hp 비율, st 스태미나, s 상태)
   몬스터 레벨: Lv5 판(1챕터 끝)은 lv5, Lv10 판(2챕터 끝)은 lv10. 적지 않으면 3과 7이다. 보스는 시험용 기준점이라 공개 문서의 이름만 쓴다 */
const SIT = [
  // 1. 무리: 약한 적이 여럿. 한 대상에 몰아치는 직업이 느리다
  { id: 1, cat: '무리', n: '하수인 넷', room: { en: [['minion', 0], ['minion', 0], ['minion', 0], ['minion', 0]] } },
  { id: 2, cat: '무리', n: '하수인 여섯', room: { en: [['minion', 0], ['minion', 0], ['minion', 0], ['minion', 0], ['minion', 0], ['minion', 0]] } },
  { id: 3, cat: '무리', n: '돌격병과 하수인 셋', room: { en: [['bruiser', 0], ['minion', 0], ['minion', 0], ['minion', 0]] } },
  { id: 4, cat: '무리', n: '소환사와 하수인 넷', room: { en: [['minion', 0], ['minion', 0], ['minion', 0], ['minion', 0], ['summoner', 0]] } },
  { id: 5, cat: '무리', n: '돌격병 넷', room: { en: [['bruiser', 0], ['bruiser', 0], ['bruiser', 0], ['bruiser', 0]] } },
  // 2. 강타: 강타를 모으는 근접 적. 흘리기·붕괴로 끊는 직업이 강하다
  { id: 6, cat: '강타', n: '강인한 정예 돌격병 둘', room: { en: [['bruiser', 1], ['bruiser', 1]], tough: [0, 1] } },
  { id: 7, cat: '강타', n: '정예 돌격병 둘', room: { en: [['bruiser', 1], ['bruiser', 1]] } },
  { id: 8, cat: '강타', n: '정예 돌격병 셋', room: { en: [['bruiser', 1], ['bruiser', 1], ['bruiser', 1]] } },
  { id: 9, cat: '강타', n: '강인한 정예 돌격병과 돌격병', room: { en: [['bruiser', 1], ['bruiser', 0]], tough: [0] } },
  { id: 10, cat: '강타', n: '굶주린 순례자', room: { en: [['bruiser', 0], ['minion', 0]], strong: '굶주린 순례자', foe: 'pilgrim' } },
  // 3. 후열: 방패병·하수인이 막고 사수가 뒤에서 쏜다. 후열에 닿는 직업이 강하다 (사수는 정예로 두지 않는다: 정예면 '거구' 성격과 섞여 무엇을 재는지 흐려진다)
  { id: 11, cat: '후열', n: '방패병과 사수 셋', room: { en: [['shield', 0], ['archer', 0], ['archer', 0], ['archer', 0]] } },
  { id: 12, cat: '후열', n: '방패병 둘과 사수 둘', room: { en: [['shield', 0], ['shield', 0], ['archer', 0], ['archer', 0]] } },
  { id: 13, cat: '후열', n: '강인한 방패병과 사수 둘', room: { en: [['shield', 0], ['archer', 0], ['archer', 0]], tough: [0] } },
  { id: 14, cat: '후열', n: '하수인 둘 뒤의 사수 셋', room: { en: [['minion', 0], ['minion', 0], ['archer', 0], ['archer', 0], ['archer', 0]] } },
  { id: 15, cat: '후열', n: '방패병 뒤의 치유사와 사수', room: { en: [['shield', 0], ['healer', 0], ['archer', 0]] } },
  // 4. 지원: 치유사·소환사가 뒤에서 버틴다. 공격하지 않는 적이 많아 흘릴 것이 적다
  { id: 16, cat: '지원', n: '치유사와 돌격병', room: { en: [['bruiser', 0], ['healer', 0]] } },
  { id: 17, cat: '지원', n: '방패병과 치유사 둘', room: { en: [['shield', 0], ['healer', 0], ['healer', 0]] } },
  { id: 18, cat: '지원', n: '소환사 둘과 방패병', room: { en: [['shield', 0], ['summoner', 0], ['summoner', 0]] } },
  { id: 19, cat: '지원', n: '치유사, 소환사, 돌격병', room: { en: [['bruiser', 0], ['healer', 0], ['summoner', 0]] } },
  { id: 20, cat: '지원', n: '정예 방패병과 치유사', room: { en: [['shield', 1], ['healer', 0]] } },
  // 5. 폭발: 자폭병이 몇 라운드 안에 터진다. 빨리 끊거나 버티는 직업이 강하다
  { id: 21, cat: '영창', n: '정예 화형 사제 둘', room: { en: [['pyre', 1], ['pyre', 1]] } }, // 10월 5일: 폭발 범주(자폭병)를 영창 범주(화형 사제)로 바꿨다
  { id: 22, cat: '영창', n: '방패병 둘 뒤의 화형 사제', room: { en: [['shield', 0], ['shield', 0], ['pyre', 0]] } },
  { id: 23, cat: '영창', n: '정예 화형 사제, 돌격병, 하수인', room: { en: [['pyre', 1], ['bruiser', 0], ['minion', 0]] } },
  { id: 24, cat: '영창', n: '하수인 셋 뒤의 화형 사제 둘', room: { en: [['minion', 0], ['minion', 0], ['minion', 0], ['pyre', 0], ['pyre', 0]] } },
  { id: 25, cat: '영창', n: '매복한 정예 화형 사제와 돌격병 둘', room: { en: [['pyre', 1], ['bruiser', 0], ['bruiser', 0]], ambush: 1 } },
  // 6. 거구: 체력이 큰 단일 적. 중독·터뜨리기·마무리가 강하다
  { id: 26, cat: '거구', n: '강인한 정예 방패병', room: { en: [['shield', 1]], tough: [0] } },
  { id: 27, cat: '거구', n: '종지기와 큰 종', room: { en: [['shield', 0]], strong: '종지기', foe: 'bellringer' } },
  { id: 28, cat: '거구', n: '타락한 수도원장 (챕터 보스 레벨)', room: { boss: 'abbot' }, lv: { 5: 4, 10: 8 } },
  { id: 29, cat: '거구', n: '강인한 굶주린 순례자', room: { en: [['bruiser', 0]], strong: '굶주린 순례자', foe: 'pilgrim', tough: [0] } },
  { id: 30, cat: '거구', n: '강인한 정예 돌격병', room: { en: [['bruiser', 1]], tough: [0] } },
  // 7. 상처: 나쁜 상태로 시작한다 (모두에게 같은 짐. 범주 목표 없음)
  { id: 31, cat: '상처', n: '출혈 6을 안고 사수 둘', room: { en: [['archer', 0], ['archer', 0]] }, p: { s: { bleed: 6 } } },
  { id: 32, cat: '상처', n: '약화·취약을 안고 돌격병 둘', room: { en: [['bruiser', 0], ['bruiser', 0]], pre: { weak: 3, vuln: 3 } } },
  { id: 33, cat: '상처', n: '중독 8을 안고 하수인 둘', room: { en: [['minion', 0], ['minion', 0]], pre: { poison: 8 } } },
  { id: 34, cat: '상처', n: '생명력 40%로 돌격병과 사수', room: { en: [['bruiser', 0], ['archer', 0]] }, p: { hp: 0.4 } },
  { id: 35, cat: '상처', n: '탈진한 채로 정예 돌격병', room: { en: [['bruiser', 1]] }, p: { st: 0 } },
  // 8. 특성: 방 특성 (범주 목표 없음)
  { id: 36, cat: '특성', n: '좁은 회랑: 돌격병 셋과 사수', room: { en: [['bruiser', 0], ['bruiser', 0], ['bruiser', 0], ['archer', 0]], mods: ['narrow'] } },
  { id: 37, cat: '특성', n: '피 웅덩이: 사수 둘과 돌격병', room: { en: [['bruiser', 0], ['archer', 0], ['archer', 0]], mods: ['bloodpool'] } },
  { id: 38, cat: '특성', n: '종소리: 하수인 셋과 돌격병', room: { en: [['bruiser', 0], ['minion', 0], ['minion', 0], ['minion', 0]], mods: ['bell'] } },
  { id: 39, cat: '특성', n: '무너지는 천장: 방패병과 치유사', room: { en: [['shield', 0], ['healer', 0]], mods: ['ceiling'] } },
  { id: 40, cat: '특성', n: '어둠: 사수 둘과 방패병', room: { en: [['shield', 0], ['archer', 0], ['archer', 0]], mods: ['dark'] } },
  // 9. 장기전: 단단한 적 여럿. 오래 쌓이는 피해가 강하다
  { id: 41, cat: '장기전', n: '방패병 셋', room: { en: [['shield', 0], ['shield', 0], ['shield', 0]] } },
  { id: 42, cat: '장기전', n: '정예 셋', room: { en: [['bruiser', 1], ['shield', 1], ['archer', 1]] } },
  { id: 43, cat: '장기전', n: '소환사와 방패병 둘', room: { en: [['shield', 0], ['shield', 0], ['summoner', 0]] } },
  { id: 44, cat: '장기전', n: '강인한 방패병 둘과 치유사', room: { en: [['shield', 0], ['shield', 0], ['healer', 0]], tough: [0, 1] } },
  { id: 45, cat: '장기전', n: '정예 방패병 둘', room: { en: [['shield', 1], ['shield', 1]] } },
  // 10. 혼합: 실전 같은 구성 (범주 목표 없음)
  { id: 46, cat: '혼합', n: '돌격병, 방패병, 사수, 치유사', room: { en: [['bruiser', 0], ['shield', 0], ['archer', 0], ['healer', 0]] } },
  { id: 47, cat: '혼합', n: '정예 돌격병, 자폭병, 사수', room: { en: [['bruiser', 1], ['bomber', 0], ['archer', 0]] } },
  { id: 48, cat: '혼합', n: '순례자와 하수인 둘', room: { en: [['bruiser', 0], ['minion', 0], ['minion', 0]], strong: '굶주린 순례자', foe: 'pilgrim' } },
  { id: 49, cat: '혼합', n: '정예 방패병, 정예 사수, 소환사', room: { en: [['shield', 1], ['archer', 1], ['summoner', 0]] } },
  { id: 50, cat: '혼합', n: '돌격병 둘, 자폭병, 치유사', room: { en: [['bruiser', 0], ['bruiser', 0], ['bomber', 0], ['healer', 0]] } },
];
const SIT_CATS = ['무리', '강타', '후열', '지원', '영창', '거구', '상처', '특성', '장기전', '혼합'];
if (typeof module !== 'undefined') module.exports = { SIT, SIT_CATS };
