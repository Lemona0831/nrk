# 나락의 유산 — Claude Code 작업 안내

텍스트형 다크 판타지 턴제 ARPG다. 지금 지인 주소는 0.6a(1챕터)다. 지인과 함께 노는 개인 프로젝트이며, 지인 테스트 기록을 읽고 고치는 일을 반복한다. 사이트는 GitHub Pages(https://lemona0831.github.io/nrk/), 기록은 Supabase에 모인다.

## 주소와 개발 흐름 (10월 2일 0.6a 공개)

- 지인 주소(루트 `index.html`, `data/`, `audio/`) = 0.6a 안정판. **루트를 직접 고치지 않는다.**
- 지인 사이트(루트)를 직접 고치는 것은 만든 사람이 승인한 고침만, next/와 같은 문장으로 한다(10월 2일: 기록 내려받기, 방패병, 기다리는 캐릭터, 포기된 깬 캐릭터 되살리기). 0.6b를 공개할 때 next/가 그대로 덮으므로 next/에도 반드시 같은 고침이 있어야 한다
- 개발은 `next/`에서 한다(미리보기 https://lemona0831.github.io/nrk/next/). 지금은 0.6b(2챕터와 성장 시스템, docs/0.6b-구현계획.md, 기획서 11.12절)를 만든다. 지인에게 내보낼 때 `python tools/release.py`로 next/를 루트에 복사하고(`../` 경로를 고침), `python tools/smoke_site.py .`로 루트를 점검한 뒤 커밋한다. 내보낼 때 next/의 `VERSION`과 타이틀 표시를 맞춘다
- B0.5는 `b05/index.html`에 보관(https://lemona0831.github.io/nrk/b05/). 고치지 않는다. B0.5 기록(runs·best 등)은 저장소에 그대로 있고, B0.5 결과 보기도 b05에서 연다
- **0.6a.2 스킬 시험판은 `06a2/`**(https://lemona0831.github.io/nrk/06a2/, 10월 2일 만든 사람 요청). 모든 스킬 체계를 새로 짜기 위해 지인 주소의 0.6a를 그대로 복제한 별도 사이트다(복제 직후 자동 테스트 결과가 루트와 똑같음). 스킬 개편은 여기서 하고, 루트·next/에는 넣지 않는다. next/(0.6b)와 합칠지는 만든 사람이 정한다. 기록이 지인 주소와 섞이지 않게 브라우저 저장 키 `nrk_062_v1`, 저장소 경로 runs62·scen62·survey62, 기록판 칸 best62, 랭킹 칸 rank62를 쓴다. 설정은 `../config.js`, 음악은 루트의 `../audio/`를 함께 쓴다(루트 audio/의 파일 이름이 바뀌면 06a2/data/audio.js도 고친다). `playtest/(uid)` 문서(이름·판 수)는 지인 주소와 같은 문서를 쓴다. 구글 로그인을 쓰려면 Supabase Redirect URLs에 06a2/ 주소를 더해야 한다. 점검: `python tools/smoke_site.py 06a2`, `DGDIR=06a2 node tools/dgqa.js 20`, `node tools/extract-engine.js 06a2`
- **06a2 공개 계획 (10월 5일 만든 사람):** 직업을 모두 만들고 2챕터까지 만든 뒤 지인에게 내보낸다. 그 전까지 "지인 기록으로 본다"로 미룬 것(파수꾼 후열 약점 등)은 공개 전 점검 목록(docs/0.6a.2-개편-기획.md 13절)에서 다시 본다
- **06a2 개편 엔진 (10월 3일, docs/0.6a.2-개편-기획.md 14절)**: v2 직업(`BUILDS[k].v2`, 지금 암살자만)은 마나 없이 쿨타임 스킬과 트리를 쓴다. 스킬 데이터는 `06a2/data/skills.js`(`SKILLS2`, `TREE2`), 설명 문장과 점수는 `06a2/data/skillkit.js`(`skHead`·`skBody`·`skScore`)이고, 게임과 `node tools/skillscore.js`가 같은 파일을 읽는다. 스킬을 고치면 `node tools/skillscore.js`로 줄 예산 ±8%를 확인한다. 실행은 `runSkill2`, 쿨타임은 `p.cd`와 `chargeEv`('turn'은 내 턴마다 1 감소. 10월 3일 3차 결정으로 갈래 규칙 `TREE2.haste`는 비어 있고 모든 직업이 쿨타임 하나만 쓴다. 표기는 "쿨타임 N턴" · "쿨타임 2턴 남음" · "사용 가능". 쿨타임은 10월 3일 (나) 결정으로 1.5배(3~10턴, 시작 스킬 5턴)이고, 수치는 그만큼 키워 줄 예산에 맞췄다. 쿨타임을 당기는 것은 🔄 스킬뿐: fx `{ k: 'hasten', n, on: 'use'|'parry' }` → `hastenBranch`, 흘리기 준비 `p.pbuf`에 실려 다음 흘리기에도 든다. 화면 표시는 `skHz`(트리 칸 `.thz`, 버튼 `.hz`·`hzb`, 설명 머리줄 끝)), 트리는 `treeWhy`·`treeUnlock`·`treeVis`(보이는 범위), 트리는 사다리(스킬의 `row`, 부모는 윗줄로 만든다. 윗줄 하나만 열어도 아랫줄이 열린다), 트리는 하급(1~6줄)·중급(7~10줄)만 있다(10월 3일: 갈래마다 20칸, 상급·궁극 데이터는 지웠고 3챕터부터 다시 넣는다. `TREE_CH`는 하급·중급 1챕터, 상급 3챕터, 궁극 5챕터이고 표에 없는 등급은 열리지 않는다. 포인트는 레벨과 같다: 만들 때 1 + 레벨마다 1, 저장본은 `treeFix`가 맞춘다), 만드는 동안 되돌리기는 `treeRefund`, 상점에서 늘 사는 트리 초기화는 `treeReset`·`treeResetCost`(연 칸 수 × `TREE_RESET.cell` 25 × 챕터 가격 배율, 10월 3일 만든 사람 결정). 시작 스킬(`TREE2[k].starters`)은 트리 밖이고 늘 끼워진다: 플레이어의 스킬 목록은 늘 `v2Equip(run)`(시작 스킬 + `run.skills`의 트리 장착 4칸)으로 만든다. 트리 화면은 페이지 'tree'(`vTreeView`, 캐릭터 만들기의 스킬 단계도 같은 화면)
- **06a2 파수꾼 (10월 4일 공개, docs/0.6a.2-파수꾼-스킬.md, 기획서 12.12절)**: `BUILDS.warden`(생명력 122. 새 직업을 만드는 동안은 `soon: 1`로 두면 캐릭터 만들기에 "준비 중"이고 `CLASS_KEYS`와 dgqa가 건너뛴다. 이미 연 직업과 이름이 같은 `CLASS_SOON` 칸은 보이지 않는다), 후열 적의 공격은 보호막이 절반만 받아낸다(`WARD.back`), `SKILLS2.warden`·`TREE2.warden`(시작 2 + 60칸, 암살자와 같은 구성). 보호막은 `WARD`(상한 최대 생명력 30%, 파수꾼 방어 +6, 가시 최대 8)·`wardMax`·`addWard`로만 더한다. 새 효과는 `ward`·`wardFill`(`to`: 상한의 몇 %까지)·`wardBurn`(`max`가 없으면 모두 태움, 보호막 0이면 태우기 피해만 0)·`wardDmg`·`thorn`(`p.thorn`, 또 걸면 횟수를 더함)·`vulnPer`·`vulnGrow`·`shieldx`·`pull`·`chillx`. 조건 배수(붕괴한 적·큰 적·생명력 낮은 적·둔화된 적)는 곱한다. 점수 모델의 보호막 값(`SKK.ward`의 S·B·all·fin)은 50상황 측정값이다: 테스터 판단이나 장착 규칙을 바꾸면 보유량·태운 양을 다시 재서 맞춘 뒤 수치를 맞춘다(만든 사람 검토 1). 스킬 수치 맞춤은 `node tools/skillfit.js <직업> [--cdfree] [--only=id,..]`(칸마다 수치를 따로, 붕괴·상태 상한, 쿨타임 3~10, 스킬의 `keep: [효과]`는 고정), 확인은 `node tools/skillscore.js <직업>`. 줄 예산의 예외는 스킬 데이터에 `exc: '까닭'`을 단다(점수표에 "예외", 맞춤이 건드리지 않음. 지금은 최후의 성벽 하나, 10월 5일 만든 사람 결정). 테스터의 파수꾼 판단은 tools/qa.js `v2Pick`의 파수꾼 블록(`WARDEN_FX`를 가진 스킬이 끼워졌을 때만)이고, 50상황 장착(`sitqa.js` `equipFor`)은 보호막을 태우는 스킬을 얻는 스킬보다 많이 끼우지 않는다. 둘 다 암살자 측정을 바꾸지 않는다(파수꾼 작업 뒤 암살자 50상황 600칸이 같은지 확인). 직업 사이는 50상황 평균과 던전 완주율 두 자로 본다: 파수꾼은 공개되어 던전 테스터에 기본으로 들어간다(`DGDIR=06a2 node tools/dgqa.js 40`, 갈래 고정은 `FOCUS=성벽`)
- **06a2 사냥꾼 (10월 5일 초안 3차 · 공개, 방향 전환 중, docs/0.6a.2-사냥꾼-스킬.md 4-4절)**: 작은 육각형(올라운더, 몰아 찍으면 오히려 약하게, 화력은 암살자 아래). 가속은 사냥꾼 전용 연속 행동(라운드 맨 앞에서 두 번, 한 라운드에 한 번, 두 번째 차례는 쿨타임이 줄지 않음: `roundOrder`·`b.pDouble`·`b.extraTurn`). `BUILDS.hunter`(생명력 92, `ranged`, `openHaste` 1, `wpnMul` 0.55), 예산 `SKK.clsB`·`SKK.clsAdj`·`SKK.clsMid`, 연계(다른 갈래로 이어 쓰면 피해 +30%, `HUNT.link`·`linkOn`·`p.lastBr`), 큰 적 추적 `HUNT.focusBig`, `SKILLS2.hunter`·`TREE2.hunter`(시작 2 + 60칸: 저격 · 연사 · 기동). 추적은 `HUNT`(최대 3, 겹마다 5%, 추적 추가는 `addMax` 2까지)·`p.focus`·`b.focusKey`(스킬 한 번에 한 겹), 새 효과 `focusx`·`focusBurst`·`focusAdd`·`swapx`·`evade`(`p.evade`, 피할 수 없는 공격 `o.spell`·`o.aoe`·`o.dot`)·`evadeCtr`(`p.evadeCtr`, 실제로 피했을 때만 반격)·`hasten on: 'evade'`·`quick`·`quickTurns`(`p.quickTurns`)·`foresee`(`p.foresee`)·`hastex`·`meSt`·`chillCut`(`STOP_K`)·`chillShatter`·`chillSpread`·`freeze`·`onCutBreak`, 점수 가설 `SKK.hunt`. 새 효과를 더하면 actionList의 "중독 없이도 일을 하는 효과" 목록(`needPoison`)에도 넣는다. 테스터 판단은 qa.js `v2Pick`의 사냥꾼 칸
- **06a2 시험 전투 (10월 5일 만든 사람 요청)**: 메뉴 🧪, `G.scr` 'test'(`testStart`·`vTestSetup`·`testLeave`, 설정 `G.test`). 직업 · 레벨 · 스킬 4칸(트리 조건 없음) · 적 · 층을 골라 런 없이 싸운다. 들어갈 때 `G.run`을 비워(`G.testRun`에 보관) 런의 소모품 · 기록에 손대지 않고, 전투 ctx `test`는 전리품이 없다. 새 직업은 `BUILDS[k].v2`면 자동으로 목록에 들어간다(준비 중 포함)
- **06a2 숨겨진 직업 해금 (10월 7일)**: `UNLOCK[직업]`(data/classes.js: ico · door · hint · need [{ c, n }] · show · open)이 있는 직업은 열리기 전 `CLASS_KEYS()`에서 빠지고 캐릭터 만들기에 ??? 칸(`unlLocked`, 설명 창 `lock:`)만 보인다. 셈은 계정 `G.data.unl.c`(엔진이 세는 것: edge · sinKill · confess · 'foe:<강적>' · 'boss:<보스>', 수련장 · 시험 전투 · 고정 상황은 세지 않음, `unlAdd`), 열림은 `G.data.unl.open`, 소식은 정산 · 쓰러짐 화면(`unlNewsHtml`). 로그인하면 `playtest/(uid)`의 `unl62`와 큰 값을 합친다. 관리자 화면에 이 기기에서만 모두 열기(`unlAll`). 결과 보기는 `ALL_CLASS_KEYS()`. 테스터는 잠긴 직업을 `DG_LOCK=1`이거나 `CLS`로 고를 때만 잰다. 이름 · 조건의 뜻은 비공개 문서에만
- 06a2 상태는 숫자 하나·발동마다 1 감소(`KW` 상한, `addS`, `kwTaken`·`kwBleed`. 둔화·가속은 `roundOrder`가 라운드의 맨 뒤·맨 앞으로 보낸다). 내부 이름은 옛 것(ignite = 화상, chill = 둔화)이라 장비 효과 코드가 그대로 돈다. 적이 거는 상태는 `EKW`. 엔진은 화면 쪽 이름표(SNAMES)를 쓰지 않는다(`KW_N`)
- **06a2 라운드 엔진 (10월 3일, 기획서 12.7절)**: 라운드마다 모두 한 번씩 움직인다. `roundOrder`(순서: 가속 → 보통 → 둔화·매복 첫 라운드의 나, 같은 무리는 속도순·같으면 나 먼저, 속도 1.5 이상 적은 끝에 한 번 더), `startRound`(`b.queue`, `b.roundAll`, `b.bonusUsed`), `endRound`(`tickOnce` 한 번: 중독·스태미나·보스 시계), `stepWorld`·`runUntilPlayer`. 내 차례는 `finishPlayer`에서 빠른 행동(time ≤ 0.6이고 빠른 칸이 남음)이면 이어지고, 아니면 끝난다. 느린 행동은 빠른 칸을 쓴 뒤 `actionList`에서 막힌다. `fxQuickNext`(성인의 성배·수확자의 손)는 다음 빠른 행동이 쓸 때까지 남는다. 준비(방어·흘리기)는 내 다음 차례까지 남는다: `playerAct`는 차례의 첫 행동에서만 지운다(`b.prepTurn`. 10월 3일: 빠른 흘리기가 주 행동에 지워져 한 번도 발동하지 않았다). 재사용 대기의 `p.cdJust`는 이번 차례에 쓴 스킬 목록이다. 느린 맥박은 `noFast`(빠른 칸 없음). 흘리기는 강적·보스의 공격을 `PARRY_BIG`(20%p)만큼 덜 줄인다(`parryBig`, 10월 3일: 그림자의 거구 약점) 전투 화면: `ehpBar`(굵은 적 생명력), `eordHtml`·`enSlots`(카드 위 순번), `slotHtml`(⚡ 빠른 행동 + ▶ 주 행동), `spdIco`(버튼 빠르기), `vOrder`(✓ 이미 움직인 쪽). 문장에 "시간이 흐를 때마다"를 쓰지 않고 "라운드가 끝날 때마다"로 쓴다
- **06a2 50상황 균형 (10월 3일, 기획서 12.4~12.5절)**: `DGDIR=06a2 node tools/sitqa.js 12 [직업]`(10월 3일: 6판은 씨앗마다 범주 점수가 크게 흔들려 12판이 기준. 12판도 ±2쯤 흔들리므로 기준 ±4 근처 칸 하나가 넘나드는 것은 오차로 본다. 보스 이길 수단 찾기는 6판 거르기 · 60판 다시 재기). 상황은 `tools/situations.js`(10범주 × 5), 갈래 성격은 `TREE2[직업].profile`, 기준은 갈래 차이 6 이하·강 +4·약 −4·기둥 차이 10 이하·보스전 이길 수단(갈래마다 보스를 이기는 장착이 하나는 있다: 두 기둥 가운데 하나라도 승률 50% 이상, 기본 장착이 못 미치면 4칸의 모든 조합을 찾는다. 10월 3일 만든 사람 원칙: 이길 수단이 정해져 있으면 플레이어가 파악해 움직일 수 있다). 기준 세기(하층 ×1.05·×0.9, 보스는 10월 3일 앞의 배수. 값은 sitqa.js)로 고정해 던전 난이도를 바꿔도 움직이지 않는다(`SIT_REAL=1`이면 게임의 지금 세기). 스킬 수치는 `node tools/skillscore.js`로 줄 예산(`SKK.rowB`) ±8%를 확인한다. 1챕터 난이도는 따로 `DGDIR=06a2 node tools/dgqa.js 60`(목표 평균 20%·신중 40%). **던전 난이도는 지금 맞추지 않는다:** 직업을 모두 넣은 뒤 던전 전체를 다시 설계한다(10월 3일 만든 사람). 새 던전은 1챕터 끝 Lv5, 2챕터 끝 Lv10이 되어야 스킬 포인트 역산이 맞는다. **10월 4일 만든 사람 결정으로 적 쪽 기준을 먼저 세운다(docs/0.6a.2-적-행동-기획.md):** 전투 길이는 그대로(내 행동 12~14번), 한 번 피해는 잡몹도 암살자 10~15% · 파수꾼 5~10% · 최소 5% · 강한 공격 15% 이상, 대신 덜 자주 때리고 회피 · 경감 · 막기 · 훔치기 · 축복 · 저주 같은 행동을 한다. 완주율은 AI 기준 5~15%, 직업 사이는 던전 완주율(차이 ±5%p)과 50상황 두 자. **보스는 두 직업이 비슷하게 이기되 이기는 방법과 전략이 직업마다 분명히 달라야 한다**. 엔진: 적 한 번 피해는 `HIT_REF(lv) × ROLES[역할].hit`(DIFF의 피해 배율은 미세 조정), 일반 강타 `TELE.heavy` · 보스 강타 `TELE.boss`(`heavyMulOf`), 역할 패턴은 `decideIntent`, 새 행동은 brace · counter · evade · aim · guard · bless · curse · steal · flee(적의 `braced` · `countering` · `evading` · `guarding` · `loot`, 다음 행동까지, 무너지면 풀림), 사제 문턱 `PRIEST.heal`, 소환 `SUMMON`, 훔치기 `stealLoot` · `returnLoot` · `loseLoot`, 자폭병은 던전에서 뺐고(10월 5일, 옛 시험 상황 rooms.js만 쓴다) 화형 사제(`pyre`)가 대신한다: 영창 → 화형, 영창 중 받은 피해가 생명력 30%면 끊긴다(`CHANT`, `chantDmg`, `chantBreak`, `e.chant`). 50상황 범주는 폭발 대신 영창. 테스터는 몸 낮춘 · 반격 태세 적을 피하고 도둑을 먼저 친다(qa.js `enemyAvoid` · `enemyPrio`). 던전 테스터에서 숨긴 직업도 재려면 `DG_SOON=1`. 능력치는 다섯(`STAT_KEYS`: str · dex · int · con · wil, 처음 `STAT_START` 15점 · 레벨마다 `LV_POINTS` 2점, 직업 추천 배분 `STAT_REC` · `statRecommend`, 옛 저장본은 `statFix`가 9점을 `statPending`으로 준다). 테스터(dgqa · sitqa)는 추천 배분을 쓴다. 소모품은 `06a2/data/consumables.js`(`CONS` 37종, 한 차례 `CONS_TURN` 3개, 전리품 `LOOT`, 상점 `SHOP_CONS`), 엔진은 `run.cons` 겹(가방 칸 `bagUsed` = 장비 + 소모품 겹, `BAG_MAX` 20), `consUse` · `consWhyNot` · `consApply` · `consAdd`, 전리품 `rollDrops`(쓰러뜨릴 때) · `grantDrops`(이길 때), 화면은 시트 'cons'(🎒 버튼). 던전 테스터는 `useCons` · `useConsOut`으로 쓴다. 수도원장(1챕터 보스)은 `abbotIntent` · `abbotDemand` · `abbotBell` · `abbotTick` · `abbotAltar`와 값 `ABBOT`(기믹 · 대처는 비공개 문서에만), 보스 한 번 피해는 `BOSSES[k].hit`, 강타 `TELE.boss`. 테스터는 보스의 요구를 따른다(qa.js heuristic · lookahead 첫 줄)
- **06a2 던전 24층 (10월 4일, 기획서 12.13절)**: 상층 1~11 + 12층 야영지, 하층 13~23 + 24층 보스(`FLOORS`·`FLOOR_CAMP`·`FLOOR_BOSS`·`isLower`·`chOf`, 06a2/data/dungeon.js). 층 번호를 숫자로 쓰지 않는다. 샘은 정해진 층이 없는 드문 방(한 층에 1~10%). 갈래길은 `PATH_AT`·`PATHS`(험한 길·큰 길·샛길, `run.cross`·`run.path`·`choosePath`, 방의 `path`가 적 배율·전리품·골드를 정한다). 매복은 일반과 강적 사이(강적 쪽)의 난이도와 전리품 1.5배(`AMBUSH`, `b.lootMul`, 소모품은 `b.lootX`). 강적은 모두 공격 → 버티기 → 강타 준비 → 강타이고 강타는 기준 생명력 × `STRONG.big`(`e.bigMul`·`heavyMulOf`). 하이 리스크 하이 리턴(만든 사람): 강적은 희귀 보장 · 골드 40 · 경험치 40 · `LOOT.strong`, 험한 길은 장비 등급이 오르고 샛길은 내려간다(`PATHS[].up`). 보스는 벽으로 둔다(만든 사람). 강적은 다섯(`STRONG_FOES`: 종지기 · 순례자 · 납골당 주교(소환) · 성가 조율자(축복) · 검은 서기관(저주), 수치 `FOE_X`, 패턴 `strongIntent`, 큰 한 방 `foeBigMul`·`heavyName`, 시체 `corpsesOf`, 노래 `e.hymn`·`hymnReset`, 봉인 `b.seal`·`sealPick`(actionList가 막는다), 기믹 · 대처는 비공개 문서). 일반 · 매복 · 시련 방의 적은 테마 무리(`SQUADS` 열 가지 + `vary`, `pickSquad`, 방의 `squad`). 무리 가중치로 직업 사이도 맞춘다. 문 보상 일부 숨김 `HIDE_REWARD`·`rewardHint`. 방을 이겨도 플라스크가 차지 않는다(전리품 `LOOT.*.flask` 1% 이하, 회복 소모품 무게 `CONS[k].dw`). 옛 19층 저장본은 `dgFix`(resumeRun). 테스터의 길 고르기는 dgqa `pickPath`
- 06a2 수련장(튜토리얼, 10월 3일): 장면 값과 견습생(`BUILDS.novice`, `tut: 1`)은 `06a2/data/tutorial.js`, 엔진은 `tutBattle`·`TUT_CHECK`(전투 ctx의 `allow`=쓸 수 있는 행동, `safe`=쓰러지지 않음), 화면은 장면 앞 설명 창 `tutSheet`(시트 'tutintro'·'tutdone'), 전장 위 목표 한 줄 `vTutGoal`, 끝났을 때 `vTutOver`, `vTutHub`·`vTutOffer`(G.scr 'tut'·'tutoffer'). 견습생은 직업이 아니므로 직업 목록을 돌 때는 `Object.keys(BUILDS)` 대신 `CLASS_KEYS()`를 쓰고, 도구(dgqa·qa·itemcheck)도 `tut` 빌드를 뺀다
- 06a2 점검: `node tools/extract-engine.js 06a2 && node tools/itemcheck.js`(효과가 없는 장비는 드롭에서 `V2_OFF`로 빠지고, 점검은 그 장비를 실패가 아닌 "off"로 따로 센다. 실패 0이어야 한다), `DGDIR=06a2 node tools/dgqa.js 40`(갈래 하나만 재려면 `FOCUS=독사` 등). 자동 테스터의 v2 판단은 tools/qa.js의 `v2Pick`과 lookahead의 중독 가치(v2에서만)라 next/ 측정 결과는 바뀌지 않는다
- 0.6과 B0.5는 같은 사이트라 브라우저 저장소를 함께 쓰지만 저장 키가 달라(0.6 `nrk_06_v1`) 섞이지 않는다. 구글 로그인 돌아오는 주소는 Supabase 설정의 Redirect URLs에 있어야 한다(루트와 next/)
- 계획과 진행 상황: docs/0.6a-구현계획.md. 설계: 기획서 11절. 보스·강적 상세는 저장소 밖 `../nrk-private/보스.md`(공개 저장소에 넣지 말 것)
- 보스·강적의 기믹 설명과 대처법은 공개 파일(기획서, 업데이트 내역, 게임 문장)에 쓰지 않는다. 수도원장 수치는 index.html의 `ABBOT`, 처음 만남·도감 문장은 `next/data/dungeon.js`의 `FOE_INTRO`·`CODEX`(겪은 결과만)
- `next/data/*.js`는 값(직업, 적, 아이템, 1챕터 아이템, 던전·갈림길(dungeon.js), 방, 음악, 업데이트 내역), `next/index.html`은 엔진과 화면이다. data 파일은 index.html보다 먼저 읽힌다
- 챕터 틀: 층 번호(야영지·샘·보스·하층 시작), 몬스터 레벨, 방 최대 개수 배율은 `data/dungeon.js`의 `CHAPTERS`에서만 읽는다(`chOf(ch)`, `isLower(f, ch)`, `mlvOf(f, ch)`, `floorName(f, ch)`). 층 번호를 숫자로 쓰지 않는다. 챕터별 값은 `DIFF[ch]`, `encOf`, `eventsOf`, `foesOf`, `altarsOf`, `modsOf`, `ENEMY_NAMES[ch]`, 장비 풀은 `poolsOf(ch)`
- 저장본에 새 칸을 더할 때는 `migrateRun`(index.html)에서만 채운다(next/). **06a2에는 migrateRun이 없다:** 이어하기 `resumeRun`의 fix 함수(`dgFix` · `statFix`(+`consFix`) · `treeFix`)와 `restoreBattle`에서 채운다. `node tools/savecheck.js check`가 0.6a 저장본 56개(방 사이·전투 중·정산·상점·설문·대기)를 열어 끝까지 이어 가 본다(저장본은 `make`로 루트 코드에서 만든다, 올리지 않는다)
- next/는 B0.5와 기록이 섞이지 않게 브라우저 저장 키(nrk_06_v1), 저장소 경로(runs6·scen6·survey6), 기록판 칸(best6)을 따로 쓴다(`COL`)
- 음악: 원본은 `bgm/`(저장소 제외), 웹용은 `next/audio/`(MP3 96kbps, loudnorm -18). 곡 목록은 `next/data/audio.js`, 화면별 곡은 `musicFor()`(기획서 11.10절 표). 곡은 모두 무료 소스(만든 사람 확인). 소리·설명 창·진행 속도는 메뉴의 "설정" 창(`vSettings`)에서 바꾼다. 새 곡은 imageio-ffmpeg의 ffmpeg로 같은 설정으로 줄인다
- 화면(`G.scr`): title → create(이름·직업·스킬·능력치, `G.cre`) → run → settle → shop → survey → wait(2챕터 준비 중) / dead → survey → title. 페이지 rank·records·admin(`PAGES`, `G.back`으로 돌아감, 관리자는 주소 끝 `#admin`). 메뉴는 `menuItems()`/`vHeader()`. 이어하기는 `run.phase`(settle·shop·clearsv·wait)로 멈춘 화면에 돌아온다
- 랭킹은 저장소 `board/(uid)`의 `rank6`(`pushRank`, 정렬 `rankCmp`). 상점의 "직업에 맞는 것"은 `CLASS_FIT`(data/items.js)
- 테스트 도구는 next/를 읽는다(smoke는 `python tools/smoke_site.py .`로 루트도)

## 파일

| 파일 | 내용 |
| --- | --- |
| index.html, data/, audio/ | 지인 주소의 0.6a. next/에서 `tools/release.py`로 만든다. 직접 고치지 않는다 |
| next/ | 개발판. index.html(엔진·화면) + data/*.js(값) + audio/ |
| b05/ | B0.5 보관본(한 파일). 고치지 않는다 |
| 06a2/ | 0.6a.2 스킬 시험판. 0.6a 복제 + 스킬 개편. index.html + data/*.js (음악은 루트 audio/) |
| config.js | Supabase Project URL과 anon(공개) 키. 만든 사람이 직접 관리한다. **고치지 말 것** |
| tools/ | 자동 테스트. 아래 "테스트" 참고 |
| docs/작업기록.md | 지금까지의 결정, 현재 수치, 남은 문제 |

## index.html 구조 (스크립트 안의 표시)

- 엔진: 파일 앞부분부터 `/* ===== 가이드` 직전까지. BUILDS(직업), EXCL(직업 전용 스킬), SIG(직업 기술), ITEMS, FREE_POOL, itemFits, ROOMS, BOSSES, 전투 계산(hurtPlayer, hurtEnemy, outDmg, playerAct, genSkill)
- 표시 규칙: `/* ===== 표시 규칙` ~ `/* 상태 표시`. 예고 문장, 행동 미리보기
- 텍스트층: `const IT = {`가 있는 즉시 실행 함수. **화면에 보이는 아이템·빌드·스킬·도움말 문장은 여기서 덮어쓴다.** ITEMS 정의의 act/cost보다 이쪽이 화면에 나온다
- 저장: `initCaps`(Claude 저장소), `initSite`·`sbDb`(Supabase). 구글 로그인은 `readAcct`·`socialLogin`·`vAcctBtn`(상단 버튼)·`vAcct`(알림 카드), 결과 보기의 테스터 이름은 `testerLabel`. 경로 구조는 `playtest/<id>/runs/<판>/acts/c000`, `board/<id>`
- 업데이트 내역: `CHANGE_VER`, `CHANGELOG`

## 고칠 때 순서

1. index.html을 고친다. 수치를 바꾸면 **엔진 값, ITEMS 정의, 텍스트층(IT 등), 도움말, 업데이트 내역**을 모두 같은 값으로 맞춘다. 화면 문장과 실제 값이 어긋난 사고가 여러 번 있었다.
2. 테스트를 돌린다(아래). 이상 상태(bugs)는 반드시 0이어야 한다.
3. 균형 기준을 확인한다.
   - 여덟 직업 승률 차이 12%p 이하 (지금 72~82%)
   - 아이템별 "끼운 판 − 안 끼운 판" 승률 차이 대략 ±5%p. 아이템마다 판 수가 적어 오차가 ±2~7%p이므로, 오차를 쫓아 계속 깎지 않는다
   - 특정 빌드용 아이템(잔향의 매듭, 흉터 부적, 독 주머니, 사슬 장갑, 피의 성유, 수호의 문장)은 맞는 빌드끼리 비교한다
4. `CHANGE_VER`를 새 값으로 바꾸고 업데이트 내역(0.6은 `next/data/changelog.js`)에 적는다. 지인이 타이틀과 메뉴에서 본다. 플레이어가 읽는 글이다: 개발 단계·내부 수치(×1.3, 키 이름) 대신 "무엇이 달라졌는지"를 합니다체로 쓴다. **한 번에 묶지 않는다(10월 3일 만든 사람 요청):** 올릴 때마다 맨 위에 항목 하나를 더한다. 항목은 판 이름(`v`, 예: 0.6a.2-6), 날짜와 시각(`d`, 예: 10월 3일(토) 03:10), 한 줄 제목(`t`)을 가진다. 줄마다 종류와 "무엇을 ~했습니다"를 적는다(`items: [{ k: '새 기능' | '바뀜' | '고침', t }]`). `CHANGE_VER`는 맨 위 항목의 `v`와 같다. 타이틀의 "새로 바뀐 것"은 아직 안 본 항목만 보인다(가장 새 항목은 줄까지, 나머지는 제목만). 06a2에 들어가 있고(`chgEntry`), next/는 다음에 내역을 고칠 때 같은 꼴로 옮긴다(옛 `top`·`groups` 항목은 그대로 읽힌다). 보스·강적의 대처법은 쓰지 않는다
5. 규칙이나 수치를 바꾸면 도움말(index.html의 `HELP` 표 하나)도 맞춘다. 도움말은 이 표 하나만 쓴다(예전에 다른 곳에서 통째로 덮어써 0.6 도움말이 안 보였다)
6. 휴대폰 폭(390px)에서 전장이 가려지지 않는지 본다. 상단 버튼이 늘면 제목이 세로로 늘어나 전장이 사라진 적이 있다.
7. 커밋하고 푸시한다. 1~2분 뒤 사이트에 반영된다.

## 테스트

- `npm run qa` : 엔진 추출 → 사람 성향 테스터 6종 × 직업 8 × 보스 2 × 40판(3,840판) → 측정. 몇 분 걸린다
- `npm run qa:quick` : 960판 빠른 확인
- `npm run items` : 1챕터 아이템 풀(99종)을 여덟 직업에 끼워 효과가 실제로 일어나는지(FXHIT)와 고정 수치를 점검한다. 실패 0이어야 한다. 새 아이템 효과는 next/index.html의 `IFX` 표에, 이름·문장은 `next/data/items_ch1.js`에 둔다
- `npm run smoke` : 가짜 Supabase로 사이트 흐름 점검(Python Playwright 필요)
- `npm run dg` : 던전 자동 테스터(tools/dgqa.js). next/의 게임 코드 전체를 Node vm에서 돌려 6성향 × 8직업이 1챕터를 끝까지 간다(셋째 인자 2면 정산·상점·설문을 지나 2챕터까지: `node tools/dgqa.js 20 out.json 2`, 2챕터는 1챕터를 깬 캐릭터 기준으로 따로 낸다). `node tools/dggen.js`는 던전 생성 규칙(1만 번 × 챕터)과 8직업 강제 승리 끝까지 지나기를 점검한다. `node tools/ch2check.js`는 2챕터 적·저주·신속·방 특성·이벤트가 실제로 일어나는지 점검한다(문, 장비, 이벤트, 레벨, 쓰러지면 끝). 완주율과 쓰러진 곳(상층·하층·보스)을 낸다. 수치 시험은 `CFG='DIFF[1].upper={hp:1.3,dmg:1.4}; BOSSES.abbot.mult=7' node tools/dgqa.js 20`. 판은 고정 씨앗이라 같은 코드면 결과가 똑같다(구조만 바꾼 뒤에는 결과 파일이 같은지로 확인). `DGDIR=.`이면 루트 코드를 돌린다. 조절 값: `DIFF[챕터]`(data/dungeon.js, 상층·하층 적 배율), `BOSSES.abbot.mult`·`dmgMul`, `ENRAGE`, `TELE.heavy`(적 강타 배율), `ABBOT`
- 직접 짠 브라우저 시험(Playwright로 next/index.html을 file://로 열 때)은 반드시 `config.js`를 빈 파일로 바꿔 읽게 한다: `ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))`. 그러지 않으면 진짜 Supabase에 시험 기록과 랭킹이 쌓인다(10월 2일에 실제로 일어남)
- 테스터 한계: 아이템을 받고도 행동을 바꾸지 못하고, 한 수 앞만 본다. 막힘 해결용 아이템과 회복·방어 스킬의 진짜 가치는 사람 기록으로 판단한다

## 텍스트 기준 (기획서 8.6절)

- 안내·도움말은 합니다체, 한 문장에 한 가지. 버튼은 짧은 동작형. 전투 기록은 현재형 서술 뒤에 수치
- 분위기 한 줄은 규칙 문장과 섞지 않는다
- 줄표(—)로 문장 잇기, 괄호 부연 겹치기, 느낌표, "이(가)" 같은 괄호 조사를 쓰지 않는다. 조사는 fixJosa가 자동으로 고른다

## 절대 하지 말 것

- service_role 키, secret 키, setup.sql, 관리자 암호를 저장소에 넣지 않는다. 저장소는 Public이다
- config.js를 덮어쓰지 않는다
- 지인 기록을 지우지 않는다

## 기록 읽기

만든 사람이 결과 보기의 "전체 기록 내려받기 (JSON)"로 받은 파일을 주면 읽는다. 판마다 rooms(방별 결과), acts(행동), choices(아이템 고르기), swaps(장비 교체와 메모), survey(설문)가 있다. 사람 의견은 survey.extra, survey.issueNote, swaps[].note에 있다.

## 기획서

원본은 docs/기획서.md다. 게임 규칙이나 수치를 바꾸면 같은 작업에서 기획서의 해당 절도 함께 고친다. 예전 Claude 문서판(https://claude.ai/code/artifact/b595f7b4-c6a2-4835-9c76-9e66f3d56590)은 더 이상 기준이 아니다.
