// 직업 설명(BUILDS.lore · rule, data/classes.js)의 숫자를 코드 값과 대조한다. 숨겨진 직업의 설명은 열린 뒤에만 화면에 보이는 글이다.
module.exports = function (api) {
  const { E, add } = api;
  const pct = v => Math.round(v * 100);
  const PS = require('./pagesrc.js'); const SRC = PS.pageScript(require('path').join(api.ROOT, '06a2'));
  const has = s => SRC.includes(s);
  const C = 'classes';

  add(C, '흘리기가 피해를 70% 줄이고', '실행: parryRed(암살자)=0.7, dodgeCost(암살자)=25', E => E(`(() => { const b = __mk("assassin"); return parryRed(b.p) === 0.7 && dodgeCost(b.p) === 25; })()`));
  add(C, '방어하면 보호막 +6', '상수: WARD.guard=' + E('WARD.guard') + ' · cap=' + E('WARD.cap'), E => E('WARD.guard') === 6 && pct(E('WARD.cap')) === 30);
  add(C, '대신 활은 무기 피해의 55%', '상수: BUILDS.hunter.wpnMul=' + E('BUILDS.hunter.wpnMul'), E => pct(E('BUILDS.hunter.wpnMul')) === 55);
  add(C, '전투를 시작하면 가속 1을', '상수: BUILDS.hunter.openHaste=' + E('BUILDS.hunter.openHaste'), E => E('BUILDS.hunter.openHaste') === 1);
  add(C, '추적이 한 겹씩 쌓입니다(최대 3겹)', '상수: HUNT.focusMax=' + E('HUNT.focusMax'), E => E('HUNT.focusMax') === 3);
  add(C, '겹마다 피해 +5%', '상수: HUNT.focusPer · focusBig · focusMax', E => pct(E('HUNT.focusPer')) === 5 && pct(E('HUNT.focusBig')) === 10 && E('HUNT.focusMax') === 3);
  add(C, '연계로 피해 +30%', '상수: HUNT.link=' + E('HUNT.link'), E => pct(E('HUNT.link')) === 30);
  add(C, '그 적의 출혈 × 4%, 최대 40%', '상수: BUTCH.leech=' + E('BUTCH.leech') + ' · leechMax=' + E('BUTCH.leechMax') + ' · leechTurn=' + E('BUTCH.leechTurn'), E => pct(E('BUTCH.leech')) === 4 && pct(E('BUTCH.leechMax')) === 40 && pct(E('BUTCH.leechTurn')) === 8);
  add(C, '잃은 생명력 10%마다', '상수: BUTCH.thirst=3% · thirstMax=18%, 실행: 생명력 70%면 +9%', E => pct(E('BUTCH.thirst')) === 3 && pct(E('BUTCH.thirstMax')) === 18 && E(`(() => { const p = { build: "butcher", hp: 70, hpMax: 100 }; return Math.round(buThirst(p) * 100); })()`) === 9);
  add(C, '먹기는 한 전투에 최대 생명력의 40%', '상수: BUTCH.eatFight=' + E('BUTCH.eatFight'), E => pct(E('BUTCH.eatFight')) === 40);
  add(C, '생명력 1에서 멈춥니다', '소스: 자해 출혈이 남아 있으면 출혈 피해가 생명력 1을 남긴다(bleedFloor)', E => has('b.bleedFloor = 1') && has('b.bleedFloor = 0'));
  add(C, '대신 무기 피해의 50%(집중 주문은 75%)', '상수: wpnMul=' + E('BUILDS.elementalist.wpnMul') + ' × HEAVY_V2=' + E('HEAVY_V2') + ' = 집중 주문', E => pct(E('BUILDS.elementalist.wpnMul')) === 50 && pct(E('BUILDS.elementalist.wpnMul') * E('HEAVY_V2')) === 75);
  add(C, '대신 (화상 + 둔화 × 2) × 3의 피해', '상수: ELEM.Cw · D · Bk', E => E('ELEM.Cw') === 2 && E('ELEM.D') === 3 && E('ELEM.Bk') === 12);
  add(C, '서리 무게: 둔화된 적이 나를 치는', '상수: ELEM.guard=' + E('ELEM.guard'), E => pct(E('ELEM.guard')) === 30);
  add(C, '교대하면 그 행동이 끝난 뒤 보호막 +4', '상수: BUILDS.spellblade.altWard=' + E('BUILDS.spellblade.altWard'), E => E('BUILDS.spellblade.altWard') === 4);
  add(C, '보호막은 최대 생명력의 15%까지', '실행: wardMax(마검사) = 최대 생명력 × 0.15', E => E(`(() => { const b = __mk("spellblade", 5); return Math.abs(wardMax(b.p) - b.p.hpMax * 0.15) < 1 && BUILDS.spellblade.wardCap === 0.15; })()`));
  add(C, '되받을 때마다 기가 1 쌓입니다', '상수: MONK.kiCtr=' + E('MONK.kiCtr'), E => E('MONK.kiCtr') === 1);
  add(C, '▶ 공격은 기 1을 써서 피해 +25%', '실행: 강화 1이면 outDmg ×1.25 (수도승)', E => E(`(() => { const b = __mk("monk"); addS(b, b.p, "empower", 1); return outDmg(b, 100, {}) === 125; })()`));
  add(C, '짐은 5까지 셉니다', '상수: CONF.cap=' + E('CONF.cap'), E => E('CONF.cap') === 5);
  add(C, '지운 숫자 2마다 보호 1을 얻습니다', '상수: CONF.per=' + E('CONF.per') + ' · protMax=' + E('CONF.protMax'), E => E('CONF.per') === 2 && E('CONF.protMax') === 3);
  add(C, '방어하면 해로운 상태를 2 지웁니다', '상수: CONF.guard=' + E('CONF.guard'), E => E('CONF.guard') === 2);
  add(C, '대신 기본 공격은 무기 피해의 80%', '상수: BUILDS.bloodmage.wpnMul=' + E('BUILDS.bloodmage.wpnMul'), E => pct(E('BUILDS.bloodmage.wpnMul')) === 80);
  add(C, '남은 쿨타임 1턴마다 최대 생명력의 4%', '상수: BLOOD.per=' + E('BLOOD.per') + ', 실행: bmPullCost = ceil(최대 생명력 × 4% × 남은 턴)', E => pct(E('BLOOD.per')) === 4 && E(`(() => { const p = { hpMax: 100, eq: {} }; return bmPullCost(p, 2) === 8; })()`));
  add(C, '내 차례마다 한 번이며', '상수: BLOOD.perTurn=' + E('BLOOD.perTurn') + ', 소스: 내고 나서 생명력이 1 아래면 막음(p.hp - 1)', E => E('BLOOD.perTurn') === 1 && has('Math.max(0, p.hp - 1 - bmHpCost(p, s))'));
  add(C, '먹기 스킬, 값을 깎는 스킬, 전투마다 1번인 스킬은', '소스: bmNoPull은 once · 먹기 · payCut 스킬을 막는다', E => has("const bmNoPull = s => s.once ? '전투마다 1번' : bmEats(s) ? '먹기는 피로 당길 수 없음'"));
  add(C, '한 번에 최대 생명력의 25%까지이고', '상수: BLOOD.eatCap=' + E('BLOOD.eatCap'), E => pct(E('BLOOD.eatCap')) === 25);
};
