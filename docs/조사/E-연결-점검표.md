# E. 1단계 보완: 빠진 것, 틀린 것, 시스템 연결 지도, 함께 고칠 것 점검표

- 조사일: 10월 5일. 기준 커밋 `1382e45`(0.6a.2-39). 작업 트리의 코드는 커밋과 같다(추적 안 된 것은 docs 넷뿐).
- 역할: 완결성 비평. 목표 문서(docs/목표-1-3챕터.md) "1단계"의 여섯 요구를 초안(docs/기록/현행-조사.md)과 조사 보고서 A·B·C·D에 견주고, 빠지거나 틀린 곳을 코드로 다시 확인했다.
- 저장소 파일은 하나도 고치지 않았다. dgqa · sitqa · extract-engine은 돌리지 않았다. node로 data/*.js만 읽어 개수를 셌고(스크래치패드 `np.js` · `cfit.js` · `kwsrc.js`), 기준값 파일 `base/dg40.json`을 다시 집계했다.
- 줄 번호는 따로 적지 않으면 `06a2/index.html`이다. 범위는 "–"로 쓴다.
- 보스 · 강적의 기믹 내용은 적지 않았다. 이 문서를 공개 docs로 옮길 때도 그대로 지킨다.

---

## 0. 결론: 1단계가 아직 갖추지 못한 것 (중요한 순서)

1. **시스템 연결 지도가 어디에도 없다.** 목표가 이름을 들어 요구한 "직업 · 스킬 · 능력치 · 행동 순서 · 상태 · 아이템 · 소모품 · 던전 · 보스 · 상점 · 저장 데이터의 연결 관계"를 다룬 보고서가 없다. 초안 1절 표는 영역별 규칙 목록이고, 무엇이 무엇을 읽고 쓰는지는 없다. 이 문서 3–6절이 첫 판이다.
2. **"함께 고칠 것" 점검표가 없다.** C 6.2절(새 직업을 넣을 때 도구 쪽)과 CLAUDE.md "고칠 때 순서"가 일부만 다룬다. 화면 문장 · 도움말 · 저장본 · 서버 기록 · 도구 · 문서를 한 표로 묶은 것이 없다. 이 문서 7절이 첫 판이다.
3. **현행 규칙에 대한 사람 기록이 하나도 없다.** 06a2는 지인에게 내보내지 않았다(CLAUDE.md "06a2 공개 계획"). 그래서 "테스터가 사람을 잘 흉내 내는가"(C 4절)는 사람 기록과 견주지 못한 판단이다. 게다가 서버에 올라가는 판 기록(`runRecord` 4136)에는 트리(`run.tree`, `run.treeLog`), 소모품(`run.cons`, `run.consLog`), 전리품(`run.lootLog`), 갈래길(`run.pathLog`)이 없다. 지금 그대로 공개하면 사람 기록으로 빌드 · 소모품 · 길 판단을 읽을 수 없다(2-2절 N3).
4. **방 특성 여덟 가운데 셋이 문장대로 돌지 않는다.** 고요(마나, A가 찾음), 어둠(예고 가리기 없음, C가 찾음)에 더해 **피 웅덩이는 출혈이 2배가 아니라 4배**다(새로 찾음, 2-2절 N1).
5. **숨겨진 직업을 숨길 장치가 없다.** 시험 전투의 직업 목록(`testClasses` 4188)은 `BUILDS[k].v2`인 직업을 모두 보여 주고 `soon`도 "(준비 중)"으로 보인다. 메뉴의 🧪는 누구에게나 보인다(2498). 그리고 저장소와 사이트가 공개라 `06a2/data/*.js`에 넣은 직업은 소스로 읽힌다. "숨김"을 화면 단위로 할지, 데이터를 따로 둘지는 설계 결정이다(8절 D1).
6. **사냥꾼 연속 행동이 "차례마다" 처리를 두 번 돌린다.** 소모품 한도, 내 출혈, 약화 · 강화 감소, 보스의 요구 판정, `turnIdx`가 내 차례마다 움직인다. 목표 3단계가 사냥꾼에게 요구한 "한 라운드의 행동 상한 · 지속 효과 · 추가 행동 중 재발동"의 현재 처리가 문서에 없다(4절).
7. **능력치가 실제로 하는 일이 초안에 없다.** 초안은 "다섯, 15점 + 2점"만 적었다. 지능 10점 문장("독 격발 붕괴 +5")은 v2 직업에게 일어나지 않는다(5절).
8. **장비와 직업의 연결이 옛 직업 기준이다.** `CLASS_FIT.hunter`는 옛 사냥꾼 낱말(원거리 · 후열 · 같은 적 · 기본 공격 · 출혈)이고, 1챕터 장비 116종에 추적 · 가속 · 연계 · 회피를 다루는 장비가 0종이다. `itemFits`는 옛 스킬 id로 판정한다(2-2절 N5).
9. **상점과 골드는 지금 쓰일 곳이 없다.** 상점은 1챕터를 깬 뒤에만 열리고 그 뒤는 "2챕터 준비 중"이다. 골드 · 판매 전용 소모품 · 트리 초기화 · 능력치 다시 나누기는 실제 플레이에서 아무 결과로 이어지지 않는다. 초안은 상점을 "현행"으로만 적었다(2-2절 N6).
10. **만든 사람에게 물을 것이 흩어져 있다.** A 2절 충돌 표, B 5-3절, C(측정 성향), 개편 기획 12절의 아직 안 정한 것(해금 조건 · 직업 기술 · 유물 · 런 밖 해금 · next/ 처리)이 한곳에 없다. 8절에 모았다.

---

## 1. 목표 1단계 요구별 충족 판정

| 요구 (목표 문서 1단계) | 지금 있는 곳 | 빠진 것 | 판정 |
| --- | --- | --- | --- |
| 현행 규칙 목록 | 초안 1절, A 0절 | 능력치 효과(5절), 차례 · 라운드 처리 구분(4절), 방 특성의 실제 동작, 보스 승리 뒤 장비 보장 없음(A 6.2만) | 부분 |
| 이미 구현된 콘텐츠 목록 | A 0절(개수 일부), B 4-1절 | 콘텐츠마다 "작동 / 효과 없음 / 버그 / 옛 시험용"을 한 표로. 예: 방 특성 8(셋 결함), 보스 3(둘은 옛 시험용 `mother` · `tree`), 역할 10(자폭병은 rooms.js만), 50상황 50(자폭병 2칸), 장비 149(33 제외 · 18 발동 0) | 부분 |
| 기획에만 있는 콘텐츠 목록 | A 3절 | 충분하다. 다만 "목표가 요구하는 것"(도박 · 패시브 · 가혹 · 반복 · 영웅 · 전설 · 숨은 직업 3)과 "옛 기획에만 있는 것"(심연 · 승천 · 젬 · 룬)을 나누지 않았다. B 검증이 지적했듯 패시브 · 도박을 "둘지 정할 것"으로 둔 것은 목표 완료 조건과 어긋난다 | 대체로 됨 |
| 구판 기획서와 최신 구현 · 문서의 차이 | A 1–5절(+검증 D) | 화면 문장 대 코드 값의 전수 점검은 A 검증 D의 8건뿐이다. 이 문서 2-2절에 넷을 더했다. HELP 21주제 전체를 코드와 한 줄씩 대조한 기록은 없다 | 대체로 됨 |
| 시스템 연결 관계 | 없음 | 전부 | **없음** → 3–6절 |
| 테스터가 사람을 잘 흉내 내는 곳 · 못 하는 곳 | C 4절(+검증 둘) | 사람 기록과의 대조(06a2 사람 기록 0). 사람 기록으로 볼 질문 목록. 서버 기록 칸 부족(N3) | 부분 |
| 규칙 변경으로 무효가 된 측정값 | C 5절, A 6절 | 충분하다. 다만 "지금 값"이 저장소 밖(scratchpad `base/`)에만 있다. 같은 커밋에서 다시 재서 docs에 남겨야 한다(C 검증) | 대체로 됨 |
| 함께 고칠 화면 설명 · 도움말 · 저장본 변환 · 테스트 도구 | C 6.2절(도구만), CLAUDE.md | 변경 종류별 점검표 | **없음** → 7절 |
| 충돌의 현행 기준과 까닭 기록 | A 2절(35건) | 기준을 코드로 정한 것과 만든 사람이 정해야 하는 것의 구분. A 충돌 35(잡몹 한 번 피해 결정 10–15% 대 실제 4–8%)는 "만든 사람 확인 필요"인데 초안에 없다 | 부분 |
| 불확실한 것은 실험 · 검토 항목으로 | 흩어져 있음 | 한 목록 | 부분 → 9절 |

---

## 2. 초안과 보고서에서 틀리거나 빠진 것

### 2-1. 초안(docs/기록/현행-조사.md)의 틀린 곳 · 빈 곳

| # | 초안 | 실제 | 근거 |
| --- | --- | --- | --- |
| E1 | 2절 "쓰러진 방의 47%(337/720)가 강적 방" | 쓰러진 669판 가운데 337판 = **50%**. 47%는 전체 720판을 분모로 쓴 값이다 | `base/dg40.json` 다시 집계: res lose 669 · clear 51, 마지막 방 strong 337 · boss 160 · ambush 127 · normal 35 · treasure 8 · trial 2. C 5.3절도 50% |
| E2 | "3층에서 쓰러짐이 크게 뛴다(79판, 누적 11%)" | 맞다. 3층 79판, 3층까지 82판(11.4%) | 같은 파일 floor 집계 |
| E3 | 머리말 "7절 이하에 조사 보조 결과를 합친다" | 7절이 없다. 3절 표는 넷뿐이다 | 초안 59줄이 끝 |
| E4 | 1절 "능력치 다섯 … 직업 추천 배분" | 능력치가 무엇을 바꾸는지 없다. 지능 10점 문장은 v2에 일어나지 않는다 | 5절 |
| E5 | 1절 던전 "방 특성 8종" | 셋이 문장대로 돌지 않는다 | N1, A 5절(고요), C 4.1(어둠) |
| E6 | 1절 경제 "상점 장비 6 …" | 상점은 1챕터를 깬 뒤에만 열리고, 산 것을 쓸 곳이 없다 | N6 |
| E7 | 1절 저장 "fix 함수들이 옛 저장본을 고친다" | 맞다. 그러나 서버 기록(`runRecord`)과 되살리기(`reviveRun`)는 다른 길이고, 거기에는 트리 · 소모품이 없다 | N3 |
| E8 | 3절 "자폭병 … 50상황 혼합 범주에만 남음" | 맞다. 덧붙여 50상황에 도둑 · 암흑술사 · 강적 셋(주교 · 조율자 · 서기관) · 테마 무리가 없다(C 검증 2) | situations.js |
| E9 | 2절 기준값 | 결과 파일이 저장소 밖에 있다. docs에 옮기려면 같은 커밋에서 다시 재서 남긴다 | C 검증 |

### 2-2. 네 보고서에 없던 것 (이번에 코드로 확인)

**N1. 피 웅덩이의 출혈은 4배다.** `kwBleed`(1118)가 `n × (hasMod(b, 'bloodpool') ? 2 : 1)`로 키운 뒤 `dmgDot(…, '출혈')`을 부르고, `dmgDot`(1319)가 `label === '출혈' && hasMod(b, 'bloodpool')`이면 다시 ×2를 한다. 방 특성 문장(`ROOM_MODS.bloodpool`, data/dungeon.js:42)은 "모든 출혈 피해 2배"다. 출혈은 사수 · 사냥꾼 7칸(`h_*`)이 건다. 코드 읽기로 확인했고 실행 측정은 하지 않았다. 화상(`candle`)은 `kwTaken`(1124)에서만 처리되어 두 번 곱해지지 않는다.

**N2. 지능 10점 문장이 v2에서 거짓이다.** `statNext`(4026–4033)의 지능 줄은 "10점: 독 격발 붕괴 +5"를 보여 준다. 그 효과는 옛 스킬 `case 'burst'`(2108)에만 있다. v2 스킬 실행 `runSkill2`(625–)의 터뜨리기는 `dotMul`(687)만 쓰고 지능 붕괴 덤이 없다(625–800에 `stat(` 0건). 힘 10점("강공격 붕괴 +5", 2081)과 민첩 10점("흘리기 스태미나 −1", `dodgeCost` 1931)은 맞다.

**N3. 서버 기록에 v2의 핵심 기록이 빠진다.** `runRecord`(4136–4137)가 올리는 칸: discards · inv(tpl · g · b) · id · v · build · boss · 시각 · result · roomReached · deaths · rooms · acts(마지막 900) · swaps · drops · survey · stats · statLog · choices · skills · skillLog · cname · ch · clears · lv · xp · gold · playMs · doorLog · settle · shop · eq7 · phase · surveys. **없는 것:** `tree`(연 칸 · 남은 포인트), `treeLog`(1210, 1217), `cons`, `consLog`(1581), `lootLog`(1613), `pathLog`(3994), `statPending`, `inv[].ch`(B 검증). 브라우저 저장(`saveCur` 3900)은 run 전체라 괜찮지만, 만든 사람이 읽는 "전체 기록 내려받기"는 서버 기록이다. 공개 전에 넣어야 사람 플레이의 빌드 · 소모품 · 길 판단을 읽는다.

**N4. 시험 전투가 숨은 직업을 드러낸다.** `testClasses = () => Object.keys(BUILDS).filter(k => BUILDS[k].v2 && !BUILDS[k].tut)`(4188)는 `soon`을 거르지 않고 "(준비 중)"을 붙여 보인다(4214). 메뉴 🧪는 조건 없이 들어간다(2498). 캐릭터 만들기(`CLASS_KEYS` 1129)는 `soon`을 거른다. 해금 직업을 `BUILDS`에 넣는 순간 시험 전투에서 이름 · 스킬 60칸이 보인다. 그리고 공개 저장소라 data 파일 자체가 읽힌다.

**N5. 장비 ↔ 직업 연결이 옛 직업 기준이다.**
- `CLASS_FIT`(data/items.js:67–77)의 hunter 줄은 옛 사냥꾼 낱말이다. 1챕터 활성 풀 116종에서 낱말이 맞는 수: 암살자 10(희귀 3), 파수꾼 37(희귀 9), 사냥꾼 17(희귀 3, "원거리" 0). 상점은 "직업에 맞는 것 3개 이상 + 맞는 희귀 1"을 이 표로 고른다(`genShop` 2788–2799, `classFit` 796).
- 활성 풀 116종에 "추적" · "가속" · "연계" · "회피" 낱말이 들어간 장비는 0종이다(`cfit.js`). 사냥꾼 고유 규칙을 받쳐 주는 장비가 없다.
- `itemFits`(782–795)는 옛 스킬 id(`burst` · `viper` · `barrier` · `scarcut` 등)와 옛 직업 이름(`templar` · `warlock`)으로 판정한다. 지금 1챕터 풀에서는 걸리는 장비가 대부분 `V2_OFF`이거나 풀 밖이라 영향이 작다. 2 · 3챕터 장비를 만들 때 v2 직업 · 효과 키 기준으로 다시 써야 한다. 스마트 드롭 30%(`dropKey` 4006–4010)도 이 함수를 쓴다.

**N6. 상점 · 골드는 지금 막다른 길이다.** 상점은 정산 뒤에만 열린다(`startSettle` 2773 → 'settleok' → 상점 → 설문 → `vWait` 2815). 던전 안에는 골드를 쓸 곳이 없다(상인 방 없음, A 7.3). 그래서 지금 게임에서 골드 · 판매 전용 소모품(은화 주머니 등) · 트리 초기화 · 능력치 다시 나누기 · 상점 소모품은 결과가 없다. dgqa도 06a2에서 상점 단계를 돌지 않는다(C 1절 2). 5단계 경제 설계의 출발점은 "1챕터 경제는 측정된 적이 없다"이다.

**N7. 상태 키워드의 출처가 고르지 않다.** 스킬이 거는 상태(`kwsrc.js`, fx 기준 칸 수):
- 암살자: 적 중독 20 · 취약 5 · 둔화 2 · 약화 2, 나 보호 2
- 파수꾼: 나 보호막 9 · 보호 4 · 가시 3, 적 취약 5 · 둔화 5 · 약화 1
- 사냥꾼: 나 회피 8 · 가속 3 · 보호 2 · 강화 1, 적 출혈 7 · 둔화 5 · 취약 3 · 약화 1 · 기절 1
- **화상을 거는 직업 스킬은 0칸**, 막음도 0칸이다. 화상은 장비 둘(B 검증 6)과 소모품, 적 쪽에서만 온다. 원소술사 · 마검사가 들어오기 전까지 화상 관련 장비 · 방 특성(촛불 제단)은 직업과 연결이 없다.
- 가속은 사냥꾼만 얻는다(시작 `openHaste` 1076, 스킬 3칸, `onCutBreak` 666). 다른 직업이 가속을 얻으면 `roundOrder`(2233–2246)가 라운드 맨 앞으로만 보낸다(두 번 움직이지 않음). 그런데 상태 설명은 "가속(사냥꾼 전용) … 두 번 연달아"(SDESC 3390)뿐이라, 앞으로 가속을 주는 장비 · 소모품을 만들면 문장과 규칙이 갈린다.

**N8. `needPoison`은 지금 문제없다.** v2 186칸 가운데 중독된 적이 없으면 잠기는 칸은 암살자 9칸(`a_double` · `a_condense` · `a_cycle` · `a_burst` · `a_pop` · `a_boil` · `a_chain` · `a_deepburst` · `a_brkburst`)뿐이고 모두 의도한 독 칸이다(`np.js`). 목록 밖 효과 키는 hasten · exploit · drain · grow · spread · burst · bigx · lowx · brkPer · onParry · brokenx다. 이 키만 가진 새 칸을 만들면 잠긴다(7절 점검표).

**N9. 쓰이지 않는 화면 · 데이터가 판단을 흐린다.** HELP의 쿨타임 주제 키가 `mp`(2360–), `ASHORT.flaskM`이 "💧 마나"(2545), `tickOnce`가 v2에서도 `p.mp`를 채운다(1265, 값은 0). 화면에는 대부분 `AINFO2` · 텍스트층이 덮지만(A 검증 16), 새 직업이 `AINFO2`에 없는 행동 키를 쓰면 옛 문장이 나온다.

---

## 3. 시스템 연결 지도

### 3-1. 한 판의 흐름 (화면 → 엔진)

```
타이틀(vTitle) ─▶ startRun(3665): mkPlayer · initGear · dgInit(3909) · treeInit(1164) · v2Equip(1179)
   └▶ 시트 'skills'(트리 = vTreeView 4436) ─▶ 시트 'stats'(statRecommend 808 · applyStats 1020) ─▶ G.scr 'run'
문 고르기: genDoors(3930) → mkRoom(3954)[pickSquad 3946 · rollMods 3953 · PATHS · AMBUSH · STRONG_FOES]
   갈래길: crossCard(2573) → choosePath(3992)  ·  층 진행: advanceFloor(3984)
방 들어가기: enterRoom(4034) → roomBattle(2287)[mkEnemy 1039 · mkBoss 1054 · DIFF[upper/lower] × PATHS.dmg]
전투: startRound(2247)/roundOrder(2233) → 내 차례: actionList(1934) → playerAct(2026) / runSkill2(625) / consUse(1574)
       → finishPlayer(2205) → stepWorld(2252)/runUntilPlayer(2269) → 적: decideIntent(1647)/strongIntent(1624)/abbotIntent(1848) → enemyAct(1789)
       → endRound(2248) → tickOnce(1260)
전투 끝: afterBattle(4050) → grantDrops(1603)[rollDrops 1585] · gainXp(4017) · gainGold(4023) · 레벨이면 시트 'stats'
보스 승리: grantDrops → startSettle(2773) → 상점(genShop 2788 · vShop 2800) → 설문 → vWait(2815)
쓰러짐: dead → survey → title
저장: 방 사이 saveCur(3900) · 전투 중 saveBattle(3878)/commitAct · 기록 saveRunLocal(4128) → runRecord(4136) → syncRun(4109) · pushRank(2679)
이어 하기: resumeRun(3902)[dgFix 3998 · statFix 1168(+consFix) · treeFix 1169] / restoreBattle(3891)
```

### 3-2. 무엇이 무엇을 읽고 쓰나

| 시스템 | 주된 데이터 · 심볼 | 읽는 것 | 쓰는 것 (영향을 주는 곳) |
| --- | --- | --- | --- |
| 직업 | `BUILDS`(classes.js:13), `LV_GAIN`(44), `DEFAULT_SKILLS`(10), `CLASS_SOON`, `isV2`(1128), `CLASS_KEYS`(1129) | — | 생명력(`calcHpMax` 1008), 무기 배율 `wpnMul`(`wpnDmg` 1001), 흘리기(`parryRed` 1009 · `dodgeCost` 1931: 암살자 분기), 보호막(`WARD` · `wardMax` 1016: 파수꾼), 추적 · 연계(`HUNT` · `linkOn` 837 · `hurtEnemy` 1388: `build === 'hunter'`), 연속 행동(`roundOrder` 2239), 개전 가속(`roomBattle` 1076), 상점 맞춤(`CLASS_FIT`), 추천 배분(`STAT_REC`), 테스터 블록(qa.js `v2Pick`) |
| 스킬 · 트리 | `SKILLS2` · `TREE2`(skills.js), `SK2`, `EQUIP_SLOTS2` · `TREE_CH` · `TREE_RESET`(251–252), `skHead` · `skBody` · `skScore`(skillkit.js) | 직업, `run.lv` · `run.ch`(`treeWhy` 1180), 쿨타임 `p.cd` | 행동 목록(`actionList` 1934, `needPoison` 1943), 실행(`runSkill2` 625), 쿨타임(`chargeEv` 1144 · `hastenBranch` 1157), 설명 문장(데이터에서 자동), 점수 도구(skillscore · skillfit) |
| 능력치 | `STAT_KEYS`(805), `STAT_START` · `LV_POINTS` · `STAT_REC`(dungeon.js:145–147), `applyStats`(1020), `statNext`(4026) | `run.stats` | 생명력 · 스태미나 · 흘리기 · 빠르기 · 무기 피해 · 붕괴 · 지속 피해 · 보호막 · 회복 · 상태 버티기(5절) |
| 행동 순서 | `roundOrder`(2233), `startRound`(2247), `finishPlayer`(2205), `endRound`(2248), `RND_TWICE`(1.5), `noFast` | 가속 · 둔화 · 매복 첫 라운드 · 속도(`pSpeed` 1252 · `eSpeed` 1257) · 종지기 `quick` | 차례마다 처리 · 라운드마다 처리(4절), 화면(`vOrder` 3124 · `eordHtml` · `slotHtml`) |
| 상태 키워드 | `KW` 상한(1106), `KW_OPP`(1107), `KW_N`(1110), `addS`(1218), `kwDec`(1111), `kwTaken`(1120), `kwBleed`(1118), `EKW`(843), 붕괴 `addBreak`(2186) | 스킬 fx · 적 행동 · 소모품 · 장비 `IFX` · 방 특성 | 피해(`kwTaken`: 취약/보호 · 화상), 차례 끝(출혈 · 약화 · 강화), 라운드 끝(중독, `tickOnce` 1260), 순서(가속 · 둔화) |
| 피해 | `outDmg`(1990), `hurtEnemy`(1381), `hurtPlayer`(1323), `dmgDot`(1317) | 능력치, 장비 `IFX`/`fxVal`(994), 상태, 방 특성, `DIFF` · `PATHS`(방 적 피해), 한 번 상한(25/35/45%) | 생명력, 보호막, 붕괴, 전투 기록 `b.rec` |
| 장비 | `ITEMS` · `ITEMS_CH1` · `CH1_POOL`(items_ch1.js:146), `SLOT_BASE`(items.js:42) · `GRADE`(40), `IFX`(856), `fxHit`(852), `V2_OFF`(1133) · `poolOk`(1137), `itemFits`(782) · `classFit`(796), `mkItem`(3689) · `itemBase`(3690) | 직업 · 스킬 id(`itemFits`), `run.ch`(기본 수치) | 거의 모든 전투 계산(`fxVal` · `fxStat` · `p.eq.*` 직접 비교), 드롭(`rollGrade` 4005 · `dropKey` 4006), 상점(`genShop`), 판매(`sellOf`) |
| 소모품 | `CONS`(37) · `CONS_TURN`(3) · `LOOT` · `SHOP_CONS`(consumables.js), `consAdd`(1489) · `consWhyNot`(1517) · `consApply`(1542) · `consUse`(1574), `bagUsed`(1485) | 가방 칸(장비와 공유 `BAG_MAX` 20), 의지(`healMul` 2177), 몬스터 레벨(`consLvMul` 1488) | 생명력 · 스태미나 · 상태 해제 · 적 행동 끊기 · 빠른 칸(향 한 줌) · 전리품(`rollDrops` · `grantDrops`) |
| 던전 | `FLOORS` · `FLOOR_CAMP` · `FLOOR_BOSS` · `PATH_AT` · `PATHS` · `ROOM_TYPES` · `ROOM_MODS` · `SQUADS` · `STRONG_FOES` · `DIFF` · `mlvOf` · `XP_BASE` · `LV_XP`(dungeon.js) | `run.room` · `run.path` · `run.dg` | 적 구성 · 세기 · 경험치 · 골드 · 전리품 등급(`PATHS[].up`), 방 특성(`hasMod`), 화면(`dgBar` 2547) |
| 적 · 강적 | `ROLES`(enemies.js:4), `HIT_REF` · `TELE` · `CHANT` · `PRIEST` · `SUMMON` · `ENRAGE`(834–849), `STRONG` · `FOE_X`, `decideIntent` · `strongIntent` · `enemyAct` | 몬스터 레벨, `DIFF`, 길, 매복, 방 특성 | 예고(`intentBadge` 1736 · `incomingEst` 1775 · `previewAfter` 3041), 피해, 상태, 훔치기(`stealLoot`) |
| 보스 | `BOSSES`(enemies.js:18–), `ABBOT`, `abbot*` 함수, `bossPhase`, `FOE_INTRO` · `CODEX`(dungeon.js:157, 166) · `codexHit`(851) | 차례(`abbotDemand` 1859, 4절), 라운드(`abbotTick`, `tickOnce`) | 정산(`SETTLE.boss`), 도감, 음악(`musicFor` 4766) |
| 경험치 · 레벨 | `xpOf`(1053), `gainXp`(4017), `LV_XP`, `XP_LV` | 적 종류 · 몬스터 레벨 | 트리 포인트(레벨마다 1), 능력치 2점, 생명력 `LV_GAIN` |
| 상점 · 정산 | `SETTLE` · `PRICE` · `priceOf` · `sellOf`(2769–2772), `startSettle`, `genShop`, `treeResetCost`(1215), 능력치 다시 나누기(4898–4899) | `run.ch`, `run.rooms`(강적 수), `goldMul` | 골드, 장비, 소모품, 트리 · 능력치 초기화. 지금은 쓰일 곳 없음(N6) |
| 저장 · 기록 | `SKEY 'nrk_062_v1'`(3465), `COL`(3467), `saveCur` · `saveBattle` · `restoreBattle` · `resumeRun`, Fix 넷, `runRecord` · `syncRun` · `pushRank`, `reviveRun`(3836–) | run 전체(브라우저), `runRecord` 칸(서버) | 이어 하기, 기다리는 캐릭터(`keepCur` · `G.data.kept`), 랭킹, 관리자 결과 보기 |
| 화면 문장 | `HELP`(2360, 21주제), 텍스트층 `IT`(3319) · `SDESC`(3138, 3385) · `RINFO`(3174, 3409) · `AINFO2`(3158) · `actInfo`(3151), `statNext`, `BUILDS[].rule`, `CHANGELOG`, `FOE_INTRO` · `CODEX`, tutorial.js | 엔진 값 일부만 읽는다(예: `HUNT.link`, `STAT_START`). 많은 문장이 숫자를 박아 둔다 | 플레이어 이해. 박힌 숫자는 값이 바뀌어도 따라가지 않는다(A 검증 D) |
| 테스트 도구 | qa.js(`v2Pick` · `heuristic` · `lookahead` · `evalState` · `WARDEN_FX` · `enemyAvoid` · `enemyPrio`), dgqa.js(`pickDoor` · `pickPath` · `spendTree` · `useCons` · `shopPhase`), sitqa.js(`equipFor` · `buildOf` · 고정 세기), situations.js, skillscore · skillfit, itemcheck, extract-engine(`tools/eng.gen.js`) | 06a2 엔진(vm G0) + 추출 사본(E), 엔진 이름 다수 | 측정값, `skills.js` 직접 수정(skillfit) |

### 3-3. 연결에서 눈여겨볼 고리

- **직업 분기가 엔진 곳곳에 이름으로 박혀 있다.** `p.build === 'assassin'`(1009, 1931), `'hunter'`(837, 1388, 2239, `focusLine` 4174), 파수꾼은 `isV2` + `WARD`. 새 직업은 "직업 규칙"을 이런 분기로 더하게 된다. 9직업이 되면 같은 함수에 분기가 쌓인다. 직업 규칙을 데이터(예: `BUILDS[k].rule` 객체)로 모을지 3단계 전에 정하는 것이 좋다.
- **장비 효과도 이름 비교가 많다.** `p.eq.armor === 'plate'` 같은 직접 비교가 `calcHpMax`(1008) · `calcStMax`(1007) · `parryRed`(1009) · `dodgeCost`(1931) 등에 있다. `IFX` 표만 보면 장비 효과를 다 알 수 없다. 400종을 더하기 전에 효과 지점을 `IFX`로 모을지 정한다.
- **화면 숫자가 엔진을 읽지 않는 곳**이 도움말 · 직업 규칙 · 적 설명에 있다(A 검증 D 1–5). 값을 바꿀 때 grep으로 찾을 수밖에 없다.
- **테스터는 엔진을 두 벌 쓴다**(vm G0와 추출 사본 E, C 1.1). 전투 중에 읽는 값을 `CFG`로 바꾸면 판단 쪽은 옛 값을 쓴다.

---

## 4. 차례마다 · 라운드마다 처리 (연속 행동과 맞물리는 곳)

내 "차례"는 `finishPlayer`(2205)가 주 행동 뒤에 끝낸다. 사냥꾼 가속이면 같은 라운드에 차례가 두 번 온다(`roundOrder` 2239, `b.extraTurn` 2220).

| 처리 | 단위 | 위치 | 연속 행동(사냥꾼)에서 |
| --- | --- | --- | --- |
| 쿨타임 1 감소 `chargeEv('turn')` | 차례 | 2219 | 두 번째 차례는 줄지 않음(의도, 10월 5일 결정) |
| 소모품 한도 `b.consN = 0` | 차례 | 2222 | **라운드에 6개까지**(3 × 2). 문서에 없음 |
| 내 출혈 `kwBleed(b, p)` | 차례(행동했으면) | 2208 | 라운드에 두 번 들어감 |
| 내 약화 · 강화 감소 | 차례(공격했으면) | 2208 | 라운드에 두 번 줄 수 있음 |
| 준비(방어 · 흘리기) 지우기 `b.prepTurn` | 차례의 첫 행동 | 2058 | 첫 차례의 준비가 둘째 차례 첫 행동에서 지워짐 |
| 보스의 요구 판정 `abbotDemand` | 차례 | 2221 | 판정 횟수가 늘 수 있음(내용은 비공개 문서. 확인 필요) |
| `b.turnIdx++` (예고 뒤 대기 `teleTurn` 기준) | 차례 | 2222, 1795 | 예고 뒤 "내 차례 한 번" 조건이 한 라운드 안에 채워질 수 있음 |
| 빠른 칸 덤 `extraQuick` · 질주 `quickTurns` | 차례 | 2222 | 질주의 남은 차례가 두 배로 빨리 줄어듦 |
| 가속 · 둔화 1 감소 | 라운드 시작 | `roundOrder` 2241–2242 | — |
| 중독 · 스태미나 +10 · 방 특성 · 보스 시계 · 광폭화 · 종지기 종 | 라운드 끝 | `tickOnce` 1260–1302 | — |

목표 3단계(사냥꾼)는 "한 라운드의 행동 상한 · 쿨타임 · 지속 효과 · 추가 행동 중 재발동"을 정의하라고 한다. 위 표의 굵은 줄과 "확인 필요" 줄이 그 정의의 출발점이다. 향 한 줌(빠른 칸 +1, `CONS.incense`)과 연속 행동이 겹칠 때도 반례 검토 항목이다.

---

## 5. 능력치가 실제로 하는 일 (06a2 코드)

| 능력치 | 효과 (1점마다) | 10점마다 | 코드 |
| --- | --- | --- | --- |
| 힘 | 최대 생명력 +1, 무기 공격(기본 공격 · 강공격만, 스킬 아님) 피해 +1%, 내가 채우는 붕괴 +1% | 강공격 붕괴 +5 | `calcHpMax` 1008, `outDmg` 1995(`o.weapon`), `addBreak` 2191, 2081 |
| 민첩 | 최대 스태미나 +1, 흘리기 감소 +0.5%p(상한 90%), 빠르기 +0.5%(같은 무리 안 순서 · 도망 확률) | 흘리기 스태미나 −1 | `calcStMax` 1007, `parryRed` 1009, `pSpeed` 1254, `dodgeCost` 1931 |
| 지능 | 지속 피해(중독 · 출혈 · 화상)와 정화 피해 +2% | 문장은 "독 격발 붕괴 +5"지만 v2에는 없음(N2) | `dotMul` 1019 (687, 1118, 1124, 1298) |
| 체력 | 최대 생명력 +3 | — | `calcHpMax` 1008 |
| 의지 | 보호막으로 얻는 양 +2%, 회복 +2%(소모품 회복 포함), 해로운 상태 · 봉인을 버틸 확률 +1%(최대 25%) | — | `addWard` 1017, `healMul` 2177(소모품 `consApply` heal), 1225, 1828 |

연결에서 볼 것: 스킬 피해를 올리는 능력치가 없다(힘은 무기 공격만, 지능은 지속 피해만). 사냥꾼 추천 배분(`STAT_REC.hunter`: 민첩 .45 · 체력 .3 · 힘 .25)의 힘은 활 기본 공격과 생명력에만 간다. 새 직업 여섯의 추천 배분을 정할 때 이 표가 근거다.

---

## 6. 콘텐츠 상태 표 (구현됨 / 효과 없음 / 결함 / 옛 시험용)

| 콘텐츠 | 수 | 상태 |
| --- | --- | --- |
| 직업 | 3 + 견습생 1(`tut`) + 준비 중 카드 3 | 작동. 숨김 장치 없음(N4) |
| 스킬 | 직업마다 62(시작 2 + 60), 합 186 | 작동. 점수표 예산 밖 암살자 1(난도질), 예외 1(최후의 성벽) |
| 상태 키워드 | 10 + 붕괴 | 작동. 화상 · 막음을 거는 직업 스킬 0(N7) |
| 적 역할 | 던전 9 + 자폭병(rooms.js 옛 시험만) | 작동 |
| 강적 | 5 | 작동. 50상황에는 2종만(C 검증) |
| 보스 | 수도원장 1 + 옛 시험용 2(`mother` · `tree`, 엔진 분기 남음) | 수도원장 작동 |
| 테마 무리 | 10 | 작동 |
| 방 유형 | 9 + 야영지 · 보스 | 작동. 샘은 정해진 층 없음 |
| 방 특성 | 8 | **작동 5 · 효과 없음 2(고요 · 어둠) · 결함 1(피 웅덩이 4배)** |
| 성소 · 제단 · 이벤트 | 5 · 3 · 8 | 문장에 "마나 플라스크" · "점화" · "3T" 남음(A 5절) |
| 소모품 | 37 | 작동. 향 한 줌 · 쇠 지렛대는 테스터가 안 씀(C 4절) |
| 장비 | 149(활성 116, `V2_OFF` 33 중 18은 발동 0) | 작동. 목걸이 기본 수치(최대 마나)는 v2에 효과 없음 |
| 상점 · 정산 | 1 | 작동하지만 쓰일 곳 없음(N6) |
| 수련장 | 6장면 | 작동 |
| 시험 전투 | 1 | 작동. 숨은 직업 노출 위험(N4) |
| 50상황 | 50 | 2칸이 던전에 없는 자폭병, 새 적 행동 일부 없음 |

---

## 7. 함께 고칠 것 점검표 (X를 바꾸면 Y, Z도)

| 바꾸는 것 (X) | 함께 고칠 것 (Y, Z) |
| --- | --- |
| **직업 수치** (`BUILDS` hp · `wpnMul` · `openHaste`, `LV_GAIN`, 흘리기 · 보호막 값) | `BUILDS[k].rule` 문장, HELP 'build'(2369–2370, 숫자가 박혀 있음), classes.js 주석, `statNext` 미리보기가 맞는지, 직업 문서 · 기획서 12절 · CLAUDE.md 직업 줄, `CHANGELOG` 새 항목 + `CHANGE_VER`, `SKK.clsB` 등 점수 보정, sitqa(50상황) · dgqa(완주율) 다시 재기 |
| **새 직업** | `BUILDS`(처음엔 `soon: 1`), `LV_GAIN`, `DEFAULT_SKILLS`, `SKILLS2` · `TREE2`(starters · branches · profile), `STAT_REC`, `CLASS_FIT`, `itemFits`(v2 기준으로), `CLASS_SOON`(같은 이름 칸 숨김), 직업 분기가 있는 엔진 함수(3-3절), `AINFO2`(새 행동 키), HELP 'build', 수련장 · 만들기 안내, 시험 전투 노출 여부(N4), qa.js `v2Pick` 직업 블록 · `evalState`(새 자원), sitqa `equipFor` · `buildOf`, dgqa `spendTree`, situations.js 범주, `SKK` 직업 · 갈래 보정, 숨은 직업이면 공개 파일(changelog · HELP · docs)에 이름을 쓰지 않음 |
| **스킬 칸 추가 · 수치 수정** | `node tools/skillscore.js <직업>`(±8%), 필요하면 skillfit(이 도구는 `skills.js`를 직접 고친다), 새 효과 키면 `runSkill2` 구현 · `skHead` · `skBody` 문장 · `needPoison` 목록(1943, N8) · 미리보기(`previewAfter`, 행동 버튼 숫자) · qa.js 판단(`WARDEN_FX`처럼 다른 직업에 새지 않게, C 검증) · extract-engine 내보내기 목록. 칸 id를 지우거나 바꾸면 `treeFix`가 포인트를 돌려주는지(1169–1177, 사다리 부모 검사는 없음), 직업 문서의 트리 표 |
| **상태 키워드 · 상한 · 처리 시점** | `KW` · `KW_OPP` · `KW_N` · `EKW`, SDESC(3385–) · HELP 'status', `kwTaken` · `tickOnce` · `finishPlayer`(4절 표), 방 특성(촛불 · 피 웅덩이), 의지 버티기, 소모품 해제(`cure`), 점수 모델 `SKK.kw`, 화면 칩(`stsHtml`), 적 카드 낭독 이름(D 4번) |
| **행동 순서 · 연속 행동** | `roundOrder` · `finishPlayer` · `startRound`, 4절의 차례마다 처리 전부, `vOrder` · `eordHtml` · `focusLine` 문장, SDESC haste · chill, HELP 'time', qa.js 가속 판단(C 0절 6), 사냥꾼 문서, 소모품 한도 |
| **적 역할 · 패턴 · 피해 기준** | `ROLES` · `decideIntent` · `enemyAct` · `intentBadge` · `incomingEst`, `RINFO`(원래 표와 텍스트층 둘 다), HELP 'roles' · 'intent', `ENEMY_NAMES[ch]`, `SQUADS` 구성 · 가중치, qa.js `enemyAvoid` · `enemyPrio`, situations.js, sitqa 고정 세기(무엇을 고정하는지 정하고 적기, C 7절), 적 행동 기획 문서 |
| **강적 · 보스** | 공개 파일에는 기믹 · 대처를 쓰지 않는다. `FOE_INTRO` · `CODEX`(겪은 결과만), 비공개 문서, `ABBOT` · `BOSSES` · `TELE.boss`, qa.js 보스 대응(사람보다 많이 아는지 기록), situations.js 보스 상황, `musicFor`, 정산 `SETTLE` |
| **던전 구조 · 층 · 길 · 방** | dungeon.js 값과 함께 `genDoors` 보정 층 · `advanceFloor` · `crossCard` · `dgBar` · `floorName` · `rankEntry`(B 4-2절), HELP 'rooms', `dgFix`(옛 저장본 층 번호), dgqa `pickDoor` 손실표(C 0절 5) · `pickPath`, 기준값 다시 재기, 기획서 12.13 |
| **방 특성** | `ROOM_MODS` 문장 = 엔진 동작(지금 셋 어긋남, N1), `hasMod` 지점, 문 카드 표시, situations.js 특성 범주 |
| **능력치 규칙** | `applyStats` · `calc*Max` · 5절의 각 지점, `statNext` 문장(N2), HELP 'stats', `STAT_REC`, `statFix`(옛 저장본), dgqa · sitqa 배분, 소모품 · 능력치 문서 |
| **장비 (새 효과 · 400종)** | `IFX` 표 + 효과 지점 `fxHit`, 이름 · 문장(items_ch*.js), `GRADE` · `rollGrade` · `PRICE` · 등급색(새 등급이면), `CLASS_FIT` · `itemFits`, `V2_OFF`, `poolsOf`(챕터 풀, 아직 없음), `mkItem` 기본 `ch`, 서버 기록 `inv[].ch`(N3), itemcheck(챕터 풀을 내보내고 06a2 환경으로, C 6.3), 장비 비교 화면 |
| **소모품** | `CONS` · `LOOT` · `SHOP_CONS` · `CONS_TURN`, `consApply` 분기, `consWhyNot`, HELP 'cons', 시트 'cons' 문장, dgqa `useCons` · `useConsOut` 규칙, 가방 칸(`bagUsed`), 연속 행동 한도(4절) |
| **경제 (골드 · 가격 · 정산)** | `SETTLE` · `PRICE` · `ROOM_TYPES.*.gold` · `LOOT.goldPer` · `treeResetCost` · 능력치 다시 나누기 값, HELP 'gold', CLAUDE.md(강적 골드 50 → 40처럼 낡기 쉬움), dgqa가 정산 합계 · 소모품 흐름을 내도록(C A6 · A15), 상점 테스터 |
| **저장본에 새 칸** | 06a2에는 `migrateRun`이 없다. `resumeRun`(3902) · `restoreBattle`(3891)의 Fix 줄, `reviveRun`(3836–)이 새 칸 없이도 서는지, `runRecord`(서버 기록)에 올릴지, `saveBattle`이 뺄 칸(함수 · 난수), dgqa · sitqa가 `startRun`으로 같은 칸을 갖는지, 06a2 저장본 점검 도구(없음, C 6.1). CLAUDE.md의 "migrateRun에서만" 문장은 06a2 방식으로 고친다 |
| **챕터 추가** | B 4-2절 표 전부(1챕터에 묶인 곳 30여 곳), `TREE_CH` · `TIERS2`, `LV_XP`(Lv13까지), dgqa 챕터 모드 · dggen · ch2check의 06a2판(C 6.1), `startSettle` 강적 수 챕터 거르기(B 0절), 설문 · 랭킹 · 관리자 문장 |
| **화면 문장 전반** | 텍스트 기준(합니다체 · 괄호 조사 · 느낌표 · 줄표), `fixJosa`가 걸리지 않는 곳(`confirm` · 설문 라벨, D 3.7), 휴대폰 말줄임(D 3.3), 화면 낭독 이름(`aria-label`), HELP 표 하나만 고친다(CLAUDE.md 5번) |
| **테스터 판단 · 상황** | 바꾼 까닭(사람 행동 근거)을 적는다, 기준값을 다시 잰다(옛 값과 바로 견주지 않음), 다른 직업 측정이 바뀌지 않았는지(암살자 50상황 600칸 같음 확인), `tools/eng.gen.js` 공유 주의 |
| **올릴 때마다** | `CHANGELOG` 맨 위 항목 + `CHANGE_VER`, 기획서 해당 절, CLAUDE.md 06a2 줄, 측정값에 날짜 · 판 · 조건, docs/기록/1-3챕터-진행.md, `python tools/smoke_site.py 06a2`(실패해도 종료 코드 0이라 출력을 읽는다, C 1절) |

---

## 8. 만든 사람이 정할 것 (통합)

| # | 질문 | 근거 · 출처 |
| --- | --- | --- |
| D1 | 숨겨진 직업을 어떻게 숨기나: 화면에서만(시험 전투 · 만들기 · 도움말 · 업데이트 내역에서 빼기) 숨길지, 데이터 파일까지 해금 뒤에 따로 읽게 할지. 공개 저장소라 소스는 누구나 읽는다 | N4, 목표 3단계 |
| D2 | 직업 수 8인가 9인가(진행 기록은 9로 정함, 목표 완료 조건은 "8개") | A 충돌 17, 진행 기록 0절 |
| D3 | 잡몹 한 번 피해 기준: 결정(10–15%)과 실제 던전 값(약 4–8%) 가운데 어느 쪽을 1챕터 재검증의 기준으로 | A 충돌 35 |
| D4 | 1챕터 끝 레벨 기준(Lv5 고정 대 지금 Lv5 49% · Lv6 47%), 2챕터 끝 Lv10 · 3챕터 끝 Lv15 | C A14, 라인업 4절 |
| D5 | 2챕터 층 수, next/ 0.6b 자산과 next/ 자체를 어떻게 둘지 | B 5-3, 개편 12절 질문 8 |
| D6 | 가혹 모드 정의(목표 6단계 대 기획서 3.1), 영웅 · 전설 등장 챕터 | A 충돌 18 · 19 |
| D7 | 패시브 · 도박 · 룬 · 오의의 06a2판 범위(목표는 패시브 · 도박을 완료 조건에 넣었다) | B 검증, 목표 완료 조건 |
| D8 | 해금 조건 · 런 밖 해금 재화 · 유물(개편 12절 질문 1 · 6 · 7), 직업 기술을 남길지(질문 4) | 개편 12절 |
| D9 | 측정 기준 성향: "사고하는 유저 = 신중"을 유지할지(지금 숙련 26 · 탐험가 10 · 신중 6%) | C 0절 4 |
| D10 | 50상황 "기준 세기 고정"의 범위(`ROLES.hit` · `STRONG` · `AMBUSH` · `ABBOT`까지 묶을지) | C 7절 |
| D11 | 공개 전 서버 기록에 트리 · 소모품 · 길 기록을 더할지(N3). 기록이 커지는 만큼 저장 한도를 볼지 | N3 |

---

## 9. 확인 못 한 것 · 실험으로 남길 것

- **피 웅덩이 4배의 실측:** 코드 읽기로만 확인했다. 시험 전투나 vm에서 출혈 n을 건 적에게 `bloodpool` 방을 주고 한 차례 피해를 재면 확정된다(extract-engine은 저장소 안 `tools/eng.gen.js`를 덮어써서 이번에는 돌리지 않았다).
- **연속 행동 중 보스 요구 판정 횟수:** `abbotDemand`가 차례마다 불리는 것은 확인했다(2221). 그것이 기믹 결과를 바꾸는지는 비공개 문서와 함께 봐야 한다.
- **연속 행동 중 예고 대기(`teleTurn`)가 대응 기회를 바꾸는지:** 1795의 조건과 2222의 `turnIdx` 증가는 확인했다. 실제로 적의 큰 공격이 한 라운드 빨리 나오는 경우가 있는지는 시험 전투로 확인해야 한다.
- **HELP 21주제 전수 대조:** A 검증 D의 8건 말고는 한 줄씩 대조하지 않았다.
- **24층 한 판 플레이 시간:** docs에서 측정 기록을 찾지 못했다(A 1.1). `run.playMs`가 있으니 사람 기록이 생기면 잴 수 있다.
- **사람 기록:** 06a2 기록(runs62)을 내려받은 파일이 저장소와 상위 폴더에 없다(`find -name "*.json"` 결과는 tools/의 qa · saves 파일뿐). 06a2 사람 판단은 아직 자료가 0이다.
- **`statNext` 민첩 "빠르기"의 실제 영향:** 같은 무리 안 정렬과 도망 확률에만 쓰인다(`roundOrder` 2237, `fleeChance` 1989). 적 속도 분포와 견준 순서 역전 빈도는 재지 않았다.
