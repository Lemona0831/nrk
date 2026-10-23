// 도움말 숫자 대조 둘째 묶음(tools/helpcheck-help.js의 뒤). 증거 종류: 상수(게임 상수와 비교) · 실행(작은 전투를 돌려 봄) · 소스(엔진 글자에 그 규칙이 있음).
module.exports = function (api) {
  const { E, add, note } = api;
  const pct = v => Math.round(v * 100);
  const PS = require('./pagesrc.js'); const SRC = PS.pageScript(require('path').join(api.ROOT));
  const has = s => SRC.includes(s);
  const FREECSS = require('fs').readFileSync(require('path').join(api.ROOT, 'css', '76-hud-free.css'), 'utf8');
  const src = fn => E(fn + '.toString()');

  add('help', '"배열"에서는 배열 칸 1부터 4까지를 불러오고', '상수: HUD_SLOT_N=' + E('HUD_SLOT_N') + '(저장 칸 수), 소스: 리모콘 상태가 slots를 HUD_SLOT_N칸만큼 만든다', E => E('HUD_SLOT_N') === 4 && has('slots: sl.map((s, i) =>'));
  const OPS = require('fs').readFileSync(require('path').join(api.ROOT, 'remote', 'ui.js'), 'utf8');
  add('help', '투명도(100 · 90 · 80 · 70%)', '소스: remote/ui.js const OPS = `[100, 90, 80, 70]`(투명도 단추가 차례로 돈다. 바탕 색만 섞이고 글자는 그대로)', E => OPS.includes('const OPS = [100, 90, 80, 70];'));
  add('help', '칸 폭은 96px 아래로 줄지 않습니다', '상수: FREE_MINW=' + E('FREE_MINW') + ', 소스: hudFreeSetRects가 폭을 FREE_MINW 아래로 두지 않고 CSS도 min-width 96px', E => E('FREE_MINW') === 96 && has('Math.max(FREE_MINW, Math.min(W, r.w))') && FREECSS.includes('min-width:96px'));
  add('help', '화면의 1배에서 3배 가운데 고르고', '상수: FREE_CHS=' + E('FREE_CHS.join()'), E => E('FREE_CHS.join()') === '1,1.5,2,2.5,3');
  add('help', '누를 자리가 24px도 남지 않거나', '상수: FREE_OK=' + E('FREE_OK') + ', 소스: hudFreeGuard가 hudFreeHasSquare(R, obs, FREE_OK)로 가림을 보고 놓은 직후 어긴 칸이 있으면 hudEdRevert', E => E('FREE_OK') === 24 && has('hudFreeHasSquare(R, obs, FREE_OK)') && has('hudEdRevert(); const b = bad[0]'));
  add('help', '붙이기(꺼짐 · 1 · 4 · 8 · 16px)', '상수: FREE_SNAPS=' + E('FREE_SNAPS.join()') + '(0은 꺼짐)', E => E('FREE_SNAPS.join()') === '0,1,4,8,16');
  add('help', 'Ctrl 키를 누르고 있으면 붙이기와 정렬선이 잠시 꺼져', '소스: hfDragMove의 noSnap = ev.ctrlKey || ev.metaKey', E => (PS.pageScript(require('path').join(api.ROOT)).match(/const noSnap = ev\.ctrlKey \|\| ev\.metaKey/g) || []).length >= 1);
  add('help', '손가락 하나 크기(44px)는 화면 안에 남습니다', '상수: FREE_GRAB=' + E('FREE_GRAB'), E => E('FREE_GRAB') === 44);
  add('help', '"게임 안으로" 단추를 누르거나 창을 닫으면 패널이 돌아옵니다', '소스: remote/ui.js 단추 "게임 안으로", js/57 hudRemoteCmd의 undock', E => (PS.pageScript(require('path').join(api.ROOT)).match(/k === 'undock'/g) || []).length >= 1 && require('fs').readFileSync(require('path').join(api.ROOT, 'remote/ui.js'), 'utf8').includes('>게임 안으로<'));
  add('help', '1px씩, Shift와 함께 누르면 10px씩', '소스: hudEdKey가 const st = ev.shiftKey ? 10 : 1로 화살표 · 대괄호 · 세미콜론 키를 처리', E => (PS.pageScript(require('path').join(api.ROOT)).match(/const st = ev\.shiftKey \? 10 : 1/g) || []).length >= 2);
  add('help', '옛 12열 격자 값', '상수: FREE_OLD_COLS=' + E('FREE_OLD_COLS') + ', 소스: hfFromOld가 12열 값을 퍼센트로 바꾼다', E => E('FREE_OLD_COLS') === 12 && has('x / FREE_OLD_COLS * 100'));

  /* ===== 직업 규칙 (뒤) ===== */
  add('help', '겹마다 피해 +5%', '상수: HUNT.focusPer 5% · focusBig 10% · focusMax 3, 소스: 3겹이면 몸 낮추기 · 버티기를 꿰뚫음', E => pct(E('HUNT.focusPer')) === 5 && pct(E('HUNT.focusBig')) === 10 && E('HUNT.focusMax') === 3 && has('b.p.focus.n >= HUNT.focusMax') && has('e.braced && !o.dot && !fullF'));
  add('help', '교대가 두 번 이어지면 켜지는', '소스: altF.run === 2는 sbRunNow ≥ 2일 때 켜지고, 쓰면 p.sbRun = 0', E => has("(e.run === 2 ? b.sbRunNow >= 2 : true)") && has('p.sbRun = b.sbRun2 ? 0 : b.sbRunNow')); // 10월 16일 0.8.0 2단계: 교대 보상은 sbAltMerge가 맞는 것끼리 합친다(판정은 같다)
  add('help', '한 차례에 2번까지입니다', '상수: MONK.ctrMax=' + E('MONK.ctrMax') + ', 소스: hurtPlayer가 ctrN < monkCtrMax(p)를 본다(M5-2: 3 → 2, 금강 자세 3 · 역천권 제한 없음)', E => E('MONK.ctrMax') === 2 && has('(p.ctrN || 0) < monkCtrMax(p)'));
  add('help', '▶ 공격 한 번이 기 1을 써서', '소스: 강화 ×1.25(수도승 ⚡ 제외, curFast), 실행: 강화 1 → ×1.25', E => has("if (p.s.empower && !(p.build === 'monk' && b.curFast") && E(`(() => { const b = __mk("monk"); addS(b, b.p, "empower", 1); return Math.abs(outDmg(b, 100, {}) - 125) < 1e-9; })()`));
  add('help', '힘은 강공격 붕괴 +5', '소스: 강공격 붕괴 35 + 5 × floor(힘/10), 실행: 민첩 20이면 흘리기 스태미나 −2', E => has("(isCaster(p) && !isV2(p) ? 30 : 35) + 5 * Math.floor(stat(p, 'str') / 10)") && E(`(() => { const b = __mk("warden"); const p = b.p; const c0 = dodgeCost(p); p.stat.dex = 20; return c0 - dodgeCost(p) === 2; })()`));
  add('help', '기본 피해 = 원소 합계', '상수: ELEM.Cw=' + E('ELEM.Cw') + ' · D=' + E('ELEM.D') + ' · Bk=' + E('ELEM.Bk') + ', 소스: elemShock가 세 상수를 쓴다', E => E('ELEM.Cw') === 2 && E('ELEM.D') === 3 && E('ELEM.Bk') === 12 && src('elemShock').includes('ELEM.D') && src('elemShock').includes('ELEM.Bk') && src('elemShock').includes('ELEM.Cw'));

  /* ===== 쿨타임 · 스태미나 · 플라스크 · 행동 ===== */
  add('help', '한 번에 20판씩 보입니다', '상수: RC_PAGE=' + E('RC_PAGE') + '(기록 목록이 한 번에 보이는 판 수)', E => E('RC_PAGE') === 20);
  add('help', '표는 위에서 50개까지 보입니다', '소스: 랭킹 표 rows = all.slice(0, 50)', E => /rows\s*=\s*all\.slice\(0,\s*50\)/.test(SRC)); // 0.8.0: 랭킹 표 줄이 rows=all.slice(0,50)로 붙어 쓰여 공백을 가리지 않게
  add('help', '둘째 차례부터 내 차례가 시작될 때마다 1 찹니다', '소스: chargeEv(turn)이 b.ysPend에 두고 ysTurnStart가 내 차례에 준다 (10월 16일)', E => has('function ysTurnStart(b)') && E('YUSAN.turnAtStart') === 1);
  add('help', '변형의 조건으로 비용이 1이 되어 쓸 때도 같습니다', 'S-3: ysSpend가 ysCondSk(보호 · 회복 효과 + 변형 cond)이고 낸 비용 c <= 1이며 할인 출처 ca.by가 그 cond일 때 b.ysNoTurn', E => has('(ysCondSk(s) && c <= 1 && (s.cond || []).some(x => (x.id || s.id) === ca.by))'));
  // S-4 6번: 도움말 문장을 둘로 나눠(괄호 풀기 · 몸 빼기 → 피하기) 같은 대조를 두 문장에 건다
  for (const f of ['유산 1짜리 스킬로 생명력 · 보호 · 보호막 · 피하기를 얻으면 다음 내 차례가 시작될 때 유산이 차지 않습니다', '긴 전투에서 2 차는 차례도 같습니다']) add('help', f, 'S-2 · S-3(10월 24일 만든 사람): ysSpend가 ysHealSk(비용 1 이하 · 회복 · 보호 · 보호막 · 회피) 또는 조건 할인으로 1이 된 ysCondSk면 b.ysNoTurn, chargeEv(turn)이 그 차례 충전 n(긴 전투 2 포함)을 0으로. tools/ys-heal-check.js', E => has('if (ysHealSk(s) || (ysCondSk(s) && c <= 1') && has('if (b.ysNoTurn) {') && E('YUSAN.longFrom') > 0 && E("YS_GUARD_K.join()") === 'ward,wardPer,wardFill,sbSinWall,evade,elProtR');
  add('help', '🔄 스킬은 조건을 이루면 유산 +1을 돌려줍니다(차례마다 한 번)', '10월 15일 유산 1차 시제품: hastenBranch → ysRefund(라운드에 한 번, YUSAN.refund=' + E('YUSAN.refund') + ')', E => E('hastenBranch.toString()').includes('ysRefund') && E('YUSAN.refund') === 1);
  add('help', '30까지 차거나', '소스: p.exhaust && p.st >= 30이면 풀림, 스태미나 플라스크는 exhaust = 0', E => has('if (p.exhaust && p.st >= 30) p.exhaust = 0;') && has('p.st += add; p.exhaust = 0;'));
  add('help', '전투가 끝나면 최소 50까지', '소스: endBattleCarry p.st = max(p.st, 50)', E => has('p.st = Math.max(p.st, 50); p.exhaust = 0;'));
  add('help', '"출혈 2"처럼 걸 상태', '상수: EKW.archerBleed=' + E('EKW.archerBleed') + '(사수 예고 예시)', E => E('EKW.archerBleed') === 2);
  add('help', '스태미나 플라스크는 전투에 한 번 유산 +1을 줍니다', '10월 15일 유산 1차 시제품: 스태미나 플라스크 b.ysFlask, YUSAN.flask=' + E('YUSAN.flask'), E => has('if (isV2(p) && !b.ysFlask) { b.ysFlask = 1; ysAdd(b, YUSAN.flask') && E('YUSAN.flask') === 1);
  add('help', '샘과 야영지에서 셋 다 1씩', '소스: 샘은 life + 1 · mana + 1 · stam + 1, 야영지는 세 플라스크 각 +1', E => has("p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1); p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1)") && has("for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = Math.min(flaskCap(p, fk), (p.flask[fk] || 0) + 1)"));
  add('help', '파수꾼은 보호막 6을 얻습니다', '상수: WARD.guard=' + E('WARD.guard') + ' · cap=30%, 소스: 방어가 addWard(wdGuardWard(p)), 전투가 끝나면 p.ward = 0', E => E('WARD.guard') === 6 && pct(E('WARD.cap')) === 30 && has("if (p.build === 'warden') { const g = addWard(b, p, wdGuardWard(p));") && has('let v = (p.wdSt && p.wdSt.valor ? WD_BOUND.valorGuard : WARD.guard)') && E('wdGuardWard(__mk("warden").p)') === E('WARD.guard') && has('p.ward = 0; p.thorn = null;'));
  add('help', '적 하나를 골라 그 적의 다음 단일 공격 피해를 60%', '실행: parryRed 파수꾼 · 사냥꾼 0.6, 암살자 0.7', E => E(`(() => { const a = __mk("assassin"), w = __mk("warden"); return parryRed(w.p) === 0.6 && parryRed(a.p) === 0.7; })()`));

  /* ===== 화면과 조작 ===== */
  add('help', '숫자 키 1부터 9까지는', "소스: onKey가 /^[1-9]$/ 키를 행동 버튼 data-k에 잇는다", E => has("/^[1-9]$/.test(ev.key)") && has('.ab[data-k="'));
  add('help', '" 같은 숫자가 보입니다', '실행: 강공격 스태미나 HEAVY_COST, 70 − ' + E('HEAVY_COST') + ' = ' + (70 - E('HEAVY_COST')), E => E('heavyCost(__mk("warden").p)') === E('HEAVY_COST'));
  add('help', '크기(50 · 75 · 100 · 150 · 200%)', '상수: HUD_SIZES=' + E('HUD_SIZES.join()'), E => E('HUD_SIZES.join()') === '50,75,100,150,200');
  add('help', '글자 크기(90%부터 130%까지)', '상수: FS_OPTS=' + E('FS_OPTS.join()'), E => E('Math.min(...FS_OPTS)') === 0.9 && E('Math.max(...FS_OPTS)') === 1.3);
  add('help', '한 차례에 1개, 한 전투에 5개(가혹 3개)까지', '상수: CONS_TURN=' + E('CONS_TURN') + ' · CONS_FIGHT=' + E('JSON.stringify(CONS_FIGHT)'), E => E('CONS_TURN') === 1 && E('CONS_FIGHT.normal') === 5 && E('CONS_FIGHT.hard') === 3);
  add('help', '각각 챕터마다 3번(가혹 2번), 연기 폭탄은 2번(가혹 1번)', '상수: CONS_CH=' + E('JSON.stringify(CONS_CH)'), E => E('CONS_CH.unmod.normal') === 3 && E('CONS_CH.lootx.hard') === 2 && E('CONS_CH.escape.normal') === 2 && E('CONS_CH.escape.hard') === 1);
  add('help', '장비 가방은 20칸, 소모품 가방은 따로 5칸', '상수: BAG_MAX=' + E('BAG_MAX') + ', CONS_BAG=' + E('CONS_BAG') + ', 소스: bagUsed는 장비만(10월 14일 개편 1단계)', E => E('BAG_MAX') === 20 && E('CONS_BAG') === 5 && !src('bagUsed').includes('cons'));
  add('help', '판매품은 칸을 차지하지 않고 상점에 들어갈 때 골드로', '소스: consAdd가 판매품을 pouchAdd로, genShop이 pouchSell', E => src('consAdd').includes('pouchAdd') && src('genShop').includes('pouchSell'));
  add('help', '가방은 20칸이고 가득 차면', '상수: BAG_MAX=' + E('BAG_MAX'), E => E('BAG_MAX') === 20);
  add('help', '(예: "공격 4 · 출혈 2")', '소스: 공격 예고 문장이 "공격 N · 출혈 N" 꼴 (data/foes.js TELE_T.attack · f_bleed)', E => E('TELE_T.attack[0]').startsWith('공격 {est}{bleed}') && E('TELE_T.f_bleed[0]') === ' · 출혈 {n}');

  /* ===== 적의 예고와 역할 ===== */
  add('help', '평소의 1.75배 피해를 주고', '상수: TELE.heavy=' + E('TELE.heavy') + ', EKW.heavyVuln=' + E('EKW.heavyVuln'), E => E('TELE.heavy') === 1.75 && E('EKW.heavyVuln') === 2);
  add('help', '사제가 생명력 40% 아래인 동료를 25%', '상수: PRIEST.heal=40%, 실행: healFrac(처음)=0.25', E => pct(E('PRIEST.heal')) === 40 && E('healFrac({})') === 0.25);
  add('help', '다음 치유는 30%씩 줄어듭니다', '실행: healFrac = 0.25 × 0.7^횟수', E => Math.abs(E('healFrac({healN:1})') / E('healFrac({healN:0})') - 0.7) < 1e-9);
  add('help', '축복: 동료의 다음 공격 피해 +25%', '소스: 축복 = 강화 1 (×1.25)', E => has("addS(b, t, 'empower', 1); logp(b, 'bad', e.n + '이(가) ' + t.n + '에게 축복을 내린다") && has('if (e.s.weak) d *= 0.75;') );
  add('help', '저주: 나에게 약화 2', '상수: EKW.curseWeak=' + E('EKW.curseWeak'), E => E('EKW.curseWeak') === 2);
  add('help', '화형(큰 피해와 화상 3)', '상수: CHANT.burn=' + E('CHANT.burn'), E => E('CHANT.burn') === 3);
  add('help', '받은 피해가 그 적 생명력의 30%', '상수: CHANT.cut=' + E('CHANT.cut'), E => pct(E('CHANT.cut')) === 30);
  add('help', '광역은 후열에 70%만', '상수: AOE.back=' + E('AOE.back'), E => pct(E('AOE.back')) === 70);
  add('help', '후열이 받는 광역 피해가 다시 절반', '상수: AOE.wall=' + E('AOE.wall') + ' · wallFront=' + E('AOE.wallFront'), E => pct(E('AOE.wall')) === 50 && pct(1 - E('AOE.wallFront')) === 40);
  add('help', '방패병 자신도 광역 피해를 25%', '상수: AOE.shieldSelf=' + E('AOE.shieldSelf'), E => pct(1 - E('AOE.shieldSelf')) === 25);
  add('help', '다음 행동을 잃고, 취약 2가', '실행: 붕괴 가득이면 취약 2', E => E(`(() => { const b = __mk("warden"); const e = b.en[0]; addBreak(b, e, 9999); return st(e, "vuln") === 2; })()`));
  add('help', '사수(후열): 겨누기', '상수: EKW.archerBleed=' + E('EKW.archerBleed') + ', archerEvery=' + E('EKW.archerEvery'), E => E('EKW.archerBleed') === 2);
  /* A3: 옛 3챕터(재의 사막) 대조 열 줄은 새 「성벽 아래」 대조로 바꿨다 */
  add('help', '옆 수비병과 대형을 이으면 둘 다 받는 피해가 15%', '소스: w3HitMul 대형 잇기 ×0.85', E => has('if (e.linked && alive(b).some(x => x.id === e.linked)) m *= 0.85;'));
  add('help', '장전 중에는 붕괴에 약합니다', '상수: FOE_X.marksman.brkAim=' + E('FOE_X.marksman.brkAim') + ', 소스: w3BrkMul 석궁병 장전', E => E('FOE_X.marksman.brkAim') === 1.5 && has("(e.role === 'wallxbow' && e.intent.k === 'load')"));
  add('help', '받는 직접 피해 −50%, 붕괴 한 번에 무너짐', '소스: w3HitMul 바리케이드 ×0.5 · w3OnBreak 바리케이드', E => has("if (e.row === 'back' && !o.aoe && !o.dot && alive(b).some(x => x.role === 'barricade')) m *= 0.5;") && has("if (e.role === 'barricade') { e.alive = false;"));
  add('help', '잠식: 적은 잠식 하나마다 주는 피해 +', '상수: CH3X.taint=' + E('CH3X.taint') + ' · taintCap=' + E('CH3X.taintCap'), E => E('CH3X.taint') === 0.1 && E('CH3X.taintCap') === 5);
  add('help', '대형(옆 동료가 받는 피해 −', '상수: AFFIX3.form=' + E('AFFIX3.form'), E => pct(E('AFFIX3.form')) === 20);
  add('help', '4라운드째가 끝날 때 경보 종이 울려', '상수: ALARM.first=' + E('ALARM.first') + ' · every=' + E('ALARM.every') + ' · cap=' + E('ALARM.cap') + ' · rough=' + E('ALARM.rough'), E => E('ALARM.first') === 4 && E('ALARM.every') === 3 && E('ALARM.cap') === 3 && E('ALARM.rough') === 3);
  add('help', '경보가 한 라운드 늦어집니다(전투마다 한 번)', '소스: w3BellDelay a.delayed · a.next += 1', E => has('a.delayed = 1; a.next += 1;'));
  add('help', '원래 피해의 1/3은 들어갑니다', '소스: foeArmor Math.max(d / 3, d - e.armor)', E => has('d = Math.max(d / 3, d - e.armor)'));
  add('help', '강공격은 한 번에 두 겹을 벗깁니다', "소스: foeArmor 강공격이면 n = 2", E => has("const n = b.cur && b.cur.id === 'heavy' ? 2 : 1;"));
  add('help', '낙석(4라운드마다 모두 피해 4)', '상수: CH3X.rock=' + E('CH3X.rock') + ' · rockEvery=' + E('CH3X.rockEvery'), E => E('CH3X.rock') === 4 && E('CH3X.rockEvery') === 4);

  /* ===== 상태이상 ===== */
  add('help', '정해진 때가 오면 효과가 나고', '실행: 화상 4가 직접 피해에 발동하면 3으로 줄어든다', E => E(`(() => { const b = __mk("warden"); const p = b.p; addS(b, p, "ignite", 4); kwTaken(b, p, 100, { src: b.en[0] }); return st(p, "ignite") === 3; })()`));
  add('help', '중독 N: 라운드가 끝날 때마다 N 피해(상한 20)', '상수: KW.poison=20, 실행: 중독 99를 걸면 20', E => E('KW.poison') === 20 && E(`(() => { const b = __mk("warden"); const e = b.en[0]; addS(b, e, "poison", 99); return st(e, "poison"); })()`) === 20);
  add('help', '출혈 N: 걸린 쪽이 행동할 때마다 N 피해(상한 10)', '상수: KW.bleed=' + E('KW.bleed') + ', 실행: 출혈 99를 걸면 10', E => E('KW.bleed') === 10 && E(`(() => { const b = __mk("warden"); const e = b.en[0]; addS(b, e, "bleed", 99); return st(e, "bleed"); })()`) === 10);
  add('help', '화상 N: 걸린 쪽이 직접 피해를 받을 때마다', '상수: KW.ignite=' + E('KW.ignite') + ', 실행: 화상 4일 때 타격 100은 그대로, 터지는 4는 상태 피해로 따로(S-1 만든 사람 결정)', E => E('KW.ignite') === 10 && E(`(() => { const b = __mk("warden"); const p = b.p; p.guard = 0; p.hp = p.hpMax; addS(b, p, "ignite", 4); const h0 = p.hp; const d = kwTaken(b, p, 100, { src: b.en[0] }); return Math.round(d) === 100 && Math.round(h0 - p.hp) === 4; })()`));
  add('help', '약화 N ↔ 강화 N', '실행: 약화 → ×0.75, 강화 → ×1.25, 상수: KW.weak · empower = 5', E => E(`(() => { const b = __mk("warden"); const p = b.p; addS(b, p, "weak", 2); const w = outDmg(b, 100, {}); delete p.s.weak; addS(b, p, "empower", 2); const e = outDmg(b, 100, {}); return w === 75 && e === 125; })()`) && E('KW.weak') === 5 && E('KW.empower') === 5);
  add('help', '취약 N ↔ 보호 N', '실행: 취약 → ×1.25, 보호 → ×0.75, 한 번에 1 줄어듦, 상수: KW.vuln · protect = 5', E => E(`(() => { const b = __mk("warden"); const p = b.p; p.guard = 0; addS(b, p, "vuln", 2); const v = kwTaken(b, p, 100, { src: b.en[0] }); const v2 = st(p, "vuln"); delete p.s.vuln; addS(b, p, "protect", 2); const q = kwTaken(b, p, 100, { src: b.en[0] }); return v === 125 && v2 === 1 && q === 75 && st(p, "protect") === 1; })()`) && E('KW.vuln') === 5 && E('KW.protect') === 5);
  add('help', '둔화 N ↔ 가속 N', '상수: KW.chill · haste = 3, 소스: roundOrder가 둔화는 맨 뒤 · 가속은 맨 앞', E => E('KW.chill') === 3 && E('KW.haste') === 3 && src('roundOrder').includes('chill') && src('roundOrder').includes('haste'));
  add('help', '반대되는 상태는 걸 때 숫자끼리 뺍니다', '실행: 보호 2에 취약 3 → 보호 0 · 취약 1', E => E(`(() => { const b = __mk("warden"); const p = b.p; addS(b, p, "protect", 2); addS(b, p, "vuln", 3); return st(p, "protect") === 0 && st(p, "vuln") === 1; })()`));

  /* ===== 장비 · 레벨 · 골드 · 도박 · 방 ===== */
  add('help', '값은 그 챕터 고급 장비의 1.3배', '상수: GAMBLE.mul=' + E('GAMBLE.mul') + ', 실행: gamblePrice(2) = round(고급 가격 × 1.3)', E => E('GAMBLE.mul') === 1.3 && E('gamblePrice(2)') === Math.round(E('priceOf("m",2)') * 1.3));
  add('help', '평범은 70%, 고급은 45%, 희귀는 20%', '상수: FATE.up', E => pct(E('FATE.up.n')) === 70 && pct(E('FATE.up.m')) === 45 && pct(E('FATE.up.r')) === 20);
  add('help', '보스전을 오래 끌면(보통', '상수: ENRAGE.boss=' + E('ENRAGE.boss') + ' (b.t는 라운드마다 1, 45라운드)', E => E('ENRAGE.boss') === 45);

  /* 숫자는 있지만 규칙이 아닌 문장, 또는 아래에서 따로 증명하는 문장 */
  note('help', '1 · 2 · 3챕터 보스를 넘었는지', '챕터 이름');
  note('help', '버튼에 "유산 3"처럼 보입니다', '표기 예시');
  note('help', '"전투마다 1번"인 스킬은', '표기 이름 (once 스킬은 전투가 끝나야 다시 쓴다: chargeEv가 once를 건너뛴다)');
  add('help', '0이 되면 쓰러지고', '소스: hurtPlayer가 생명력이 0 이하이면 쓰러짐 처리', E => has('p.hp <= 0') || has('p.hp = Math.max(0, p.hp - d)'));
  add('help', '회복은 생명력 플라스크, 소모품, 샘(50%)', 'CAMP_REST.hp=' + E('CAMP_REST.hp') + ', 소스: 샘은 최대 생명력 × 0.5, 야영지 쉬기는 hpMax × CAMP_REST.hp, 정산은 p.hp = p.hpMax', E => has("const sp = 0.5 * (1 + fxVal(p, 'spring'") && pct(E('CAMP_REST.hp')) === 60 && has('p.hp = Math.min(p.hpMax, p.hp + p.hpMax * CAMP_REST.hp)') && has('p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax;'));
  /* ===== 도움말 정리(0.7.0): 묶음 · 일곱 장면 · 기본 표시 ===== */
  add('help', '일곱 장면으로 연습합니다', '데이터: TUT.length=' + E('TUT.length'), E => E('TUT.length') === 7);
  add('help', '처음에는 간단입니다', '상수: HUD_NAMES, HUD_DEFAULT=' + E('HUD_DEFAULT'), E => E('HUD_NAMES.join()') === 'simple,normal,full' && E('HUD_DEFAULT') === 'simple');
  add('help', '끔 · 약하게 · 보통 · 강하게를 고릅니다', '데이터: VFX_OPTS 네 단계', E => E('VFX_OPTS.map(o => o[1]).join()') === '끔,약하게,보통,강하게');
  add('help', '챕터는 1챕터 저주받은 수도원', '데이터: CHAPTERS 이름 셋', E => E('[1,2,3].map(c => CHAPTERS[c].n).join()') === '저주받은 수도원,어둠이 가라앉은 거리,성벽 아래');
};
