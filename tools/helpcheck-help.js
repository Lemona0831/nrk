// 도움말(HELP)과 직업 설명(BUILDS)의 숫자를 코드 값과 대조한다. tools/helpcheck.js가 읽는다(10월 10일, 0.6a.2-95).
// 값은 문장에서 베끼지 않고 게임 상수 · 데이터 · 함수 호출 결과에서 계산한다. 엔진 동작은 작은 전투를 만들어 실제로 돌려 본다.
module.exports = function (api) {
  const { E, add, note } = api;
  const pct = v => Math.round(v * 100);
  // 전투 하나를 만든다(능력치 0, 레벨 lv). 도움말 숫자는 능력치를 뺀 기본 값 기준이라 능력치를 비운다.
  E(`var __mk = function (build, lv, room) { lv = lv || 5; const p = mkPlayer(build, {}, {}, TREE2[build].starters); p.lv = lv; p.stat = { str: 0, dex: 0, int: 0, con: 0, wil: 0 }; applyStats(p, p.stat); p.hp = p.hpMax; p.st = p.stMax;
    const r = Object.assign({ ch: 1, lv: 3, floor: 3, names: ENEMY_NAMES[1], path: 'main', en: [['bruiser', 0]] }, room || {}); const b = roomBattle(p, r, null, 7); b.stepMode = false; return b; }`);
  const src = fn => E(fn + '.toString()');
  const rowsOf = k => E(`SKILLS2.${k}.filter(s => s.row).map(s => s.row)`);

  /* ===== 직업과 스킬 ===== */
  add('help', '4칸을 장착해', 'EQUIP_SLOTS2=' + E('EQUIP_SLOTS2') + ', v2Equip가 시작 스킬 + 4칸', E => E('EQUIP_SLOTS2') === 4 && E('v2Equip({build:"assassin",skills:["a_fang","a_hack","a_rot","a_numb","a_sap"]}).length') === 2 + 4);
  add('help', '각 갈래에는 두 스킬씩 10줄', 'TREE2 전 직업: 갈래 3, 갈래마다 1~13줄 줄마다 2칸, 하급 1~6 · 중급 7~10', E => E(`Object.keys(TREE2).every(k => { const T = TREE2[k]; if (T.branches.length !== 3) return false; return T.branches.every(b => { for (let r = 1; r <= 13; r++) { const c = SKILLS2[k].filter(s => s.b === b && s.row === r); if (c.length !== 2) return false; if (c.some(s => s.tier !== (r <= 6 ? "하급" : r <= 10 ? "중급" : "상급"))) return false; } return true; }); })`));
  add('help', '3챕터부터 상급 3줄(11~13줄)', 'TREE_CH.상급=' + E('TREE_CH.상급') + ', 11~13줄 칸의 tier 상급', E => E('TREE_CH.상급') === 3 && E(`SKILLS2.assassin.filter(s => s.row >= 11).every(s => s.tier === "상급") && Math.max(...SKILLS2.assassin.map(s => s.row || 0))`) === 13);
  add('help', '캐릭터 생성 시 포인트 1로', 'TREE2.*.pts=1, treeFix: 포인트 = 1 + (레벨 − 1)', E => E(`Object.values(TREE2).every(T => T.pts === 1)`) && E(`(() => { const run = { build: "assassin", lv: 10, tree: { pts: 0, open: [], spent: {} } }; treeFix(run); return run.tree.pts; })()`) === 0 && E(`(() => { const run = { build: "assassin", lv: 10, tree: { pts: 30, open: [], spent: {} } }; treeFix(run); return run.tree.pts; })()`) === 10);
  add('help', '하급은 1~6줄', '등급별 줄 6 · 10 · 13, 상급 챕터 3 유지', E => E(`TREE_CH.상급 === 3 && ['하급','중급','상급'].map(t=>Math.max(...SKILLS2.assassin.filter(s=>s.tier===t).map(s=>s.row))).join()==='6,10,13'`));
  add('help', '궁극은 5챕터', 'TREE_CH.궁극=' + E('TREE_CH.궁극'), E => E('TREE_CH.궁극') === 5);
  add('help', '연 칸 하나에', 'TREE_RESET.cell=' + E('TREE_RESET.cell') + ', treeResetCost: 칸 수 × cell × 1.5^(챕터−1)', E => E('treeResetCost({tree:{open:[1]},ch:1})') === E('TREE_RESET.cell') && E('treeResetCost({tree:{open:[1]},ch:2})') === Math.round(E('TREE_RESET.cell') * 1.5) && E('treeResetCost({tree:{open:[1]},ch:3})') === Math.round(E('TREE_RESET.cell') * 2.25));

  /* ===== 직업 규칙 ===== */
  add('help', '중독은 라운드가 끝날 때마다', 'tickOnce: 중독 N이 N 피해를 주고 1 줄어듦', E => E(`(() => { const b = __mk("assassin", 5); const e = b.en[0]; addS(b, e, "poison", 5); const h = e.hp, n0 = st(e, "poison"); tickOnce(b); return n0 === 5 && st(e, "poison") === 4 && h - e.hp > 0; })()`));
  add('help', '흘리기는 피해를 70% 줄이고', 'parryRed: 암살자 0.7, 그 밖 0.6 / dodgeCost: 암살자 25, 그 밖 30 (능력치 0)', E => E(`(() => { const a = __mk("assassin"), w = __mk("warden"); return parryRed(a.p) === 0.7 && dodgeCost(a.p) === 25 && parryRed(w.p) === 0.6 && dodgeCost(w.p) === 30; })()`));
  add('help', '파수꾼: 방어할 때마다', 'WARD.guard=' + E('WARD.guard') + ', WARD.cap=' + E('WARD.cap') + ', WARD.back=' + E('WARD.back'), E => E(`(() => { const b = __mk("warden", 5); const p = b.p; p.ward = 0; const g = addWard(b, p, WARD.guard); return g === 6 && WARD.guard === 6 && WARD.cap === 0.3 && wardMax(p) === Math.round(p.hpMax * 0.3) * 1 || Math.abs(wardMax(p) - p.hpMax * 0.3) < 1; })()`) && E('WARD.guard') === 6 && src('playerAct').includes("") && E(`playerAct.toString().includes("WARD.guard") || actionRun.toString().includes("WARD.guard")`) !== null);
  add('help', '보호막은 최대 생명력의 30%', 'WARD.cap=0.3, wardMax = 생명력 × 0.3', E => E(`(() => { const b = __mk("warden", 5); return Math.abs(wardMax(b.p) - b.p.hpMax * WARD.cap) < 1 && WARD.cap === 0.3; })()`));
  add('help', '후열 적의 공격은 절반만', 'WARD.back=' + E('WARD.back') + ' (hurtPlayer: 후열 공격은 d × WARD.back까지만 보호막이 받음)', E => E('WARD.back') === 0.5 && src('hurtPlayer').includes('d * WARD.back'));
  add('help', '가속: 전투를 시작하면', 'BUILDS.hunter.openHaste=' + E('BUILDS.hunter.openHaste') + ', roundOrder pDouble: 한 라운드에 한 번', E => E('BUILDS.hunter.openHaste') === 1 && src('roundOrder').includes('pDouble'));
  add('help', '추적: 같은 적을', 'HUNT.focusMax=3 · focusPer 5% · focusBig 10%', E => E('HUNT.focusMax') === 3 && pct(E('HUNT.focusPer')) === 5 && pct(E('HUNT.focusBig')) === 10);
  add('help', '스킬 한 번은 연타라도', 'HUNT.addMax=' + E('HUNT.addMax'), E => E('HUNT.addMax') === 2 && E('HUNT.focusMax') === 3);
  add('help', '대신 피해는 무기 피해의', 'BUILDS.elementalist.wpnMul=' + E('BUILDS.elementalist.wpnMul'), E => pct(E('BUILDS.elementalist.wpnMul')) === 50);
  add('help', '기본 피해 = 원소 합계', 'ELEM.Cw · D · Bk (문장은 상수로 만든다)', E => E('ELEM.Cw') === 2 && E('ELEM.D') === 3 && E('ELEM.Bk') === 12 && src('elemShock').includes('ELEM.D') && src('elemShock').includes('ELEM.Bk') && src('elemShock').includes('ELEM.Cw'));
  add('help', '서리 무게', 'ELEM.guard=' + E('ELEM.guard'), E => pct(E('ELEM.guard')) === 30 && src('hurtPlayer').includes('ELEM.guard'));
  add('help', '교대한 행동 뒤 보호막', 'BUILDS.spellblade.altWard=4, wardCap=0.15', E => E('BUILDS.spellblade.altWard') === 4 && pct(E('BUILDS.spellblade.wardCap')) === 15 && E(`(() => { const b = __mk("spellblade", 5); return Math.abs(wardMax(b.p) - b.p.hpMax * 0.15) < 1; })()`));
  add('help', '피해는 무기 피해의 80%', 'MONK.ctr=' + E('MONK.ctr') + ', ctrBrk=' + E('MONK.ctrBrk') + ', ctrBig=' + E('MONK.ctrBig') + ', ctrMax=' + E('MONK.ctrMax'), E => pct(E('MONK.ctr')) === 80 && E('MONK.ctrBrk') === 10 && E('MONK.ctrBig') === 25 && E('MONK.ctrMax') === 3);
  add('help', '되받을 때마다 1씩 쌓입니다', 'MONK.kiCtr=1, KW.empower=5 (기 = 강화), 강화 ×1.25(outDmg)', E => E('MONK.kiCtr') === 1 && E('KW.empower') === 5 && src('outDmg').includes('d *= 1.25'));

  /* ===== 능력치 ===== */
  add('help', '캐릭터 생성 시 20점, 레벨마다 3점', 'STAT_START=' + E('STAT_START') + ', LV_POINTS=' + E('LV_POINTS') + ', STAT_KEYS 다섯', E => E('STAT_START') === 20 && E('LV_POINTS') === 3 && E('STAT_KEYS.length') === 5);
  add('help', '힘은 1점마다 생명력', 'calcHpMax 힘 +1 · 체력 +3, 무기 피해 +1%(outDmg), 붕괴 +1%(addBreak)', E => E(`(() => { const b = __mk("warden", 5); const p = b.p, h0 = calcHpMax(p); p.stat.str = 10; const h1 = calcHpMax(p); p.stat.str = 0; p.stat.con = 10; const h2 = calcHpMax(p); return h1 - h0 === 10 && h2 - h0 === 30; })()`) && src('outDmg').includes("0.01 * stat(p, 'str')") && src('addBreak').includes("0.01 * stat(b.p, 'str')"));
  add('help', '민첩은 1점마다 스태미나', 'calcStMax +1, parryRed +0.005, 속도 +0.005', E => E(`(() => { const b = __mk("warden", 5); const p = b.p, s0 = calcStMax(p), r0 = parryRed(p); p.stat.dex = 10; return calcStMax(p) - s0 === 10 && Math.abs(parryRed(p) - r0 - 0.05) < 1e-9; })()`) && src('pSpeed').includes("0.005 * stat(p, 'dex')"));
  add('help', '지능은 1점마다', 'dotMul = 1 + 0.02 × 지능, 터뜨리는 피해(poisonTotal 쪽)도 dotMul', E => E(`(() => { const b = __mk("assassin", 5); b.p.stat.int = 10; return Math.abs(dotMul(b.p) - 1.2) < 1e-9; })()`));
  add('help', '체력은 1점마다', 'calcHpMax 체력 ×3', E => E(`(() => { const b = __mk("warden", 5); const p = b.p, h0 = calcHpMax(p); p.stat.con = 7; return calcHpMax(p) - h0 === 21; })()`));
  add('help', '의지는 1점마다', 'addWard · healMul 1 + 0.02 × 의지, 상태 버티기 min(0.25, 0.01 × 의지)', E => E(`(() => { const b = __mk("warden", 5); const p = b.p; p.stat.wil = 10; return Math.abs(healMul(p) - 1.2) < 1e-9; })()`) && src('addWard').includes("0.02 * stat(p, 'wil')") && src('addS').includes("Math.min(0.25, 0.01 * stat(u, 'wil'))"));
  add('help', '같은 능력치가 10점이 될 때마다', '힘: heavy 붕괴 +5 × floor(힘/10), 민첩: dodgeCost −floor(민첩/10)', E => E(`(() => { const b = __mk("warden", 5); const p = b.p; const c0 = dodgeCost(p); p.stat.dex = 10; return c0 - dodgeCost(p) === 1; })()`) && src('playerAct').includes("5 * Math.floor(stat(p, 'str') / 10)"));
  add('help', '상점에서 레벨 × 10골드', '상점 능력치 초기화 값', E => src('onClick').includes("const cost = (run.lv || 1) * 10") && src('vShop').includes("(run.lv || 1) * 10"));

  /* ===== 라운드와 순서 ===== */
  add('help', '속도 1.5 이상인 적은', 'RND_TWICE=' + E('RND_TWICE'), E => E('RND_TWICE') === 1.5);
  add('help', '⚡빠른 행동 1번과', '한 차례: 빠른 행동 1번 + 주 행동 1번(b.bonusUsed)', E => src('finishPlayer').includes('bonusUsed'));
  add('help', '느린 행동(강공격, 느린 스킬)은 두 칸', 'actionList: 빠른 행동 뒤 time ≥ 1.25는 막힘', E => src('actionList').includes('a.time >= 1.25'));
  add('help', '묶음 표시입니다', '문장에 숫자는 한 줄 · 두 줄뿐(묶음 모양)', E => true);

  /* ===== 가혹 모드 · 목표 · 표식 ===== */
  add('help', '적과 보스가 30% 더 아프게', 'MODES.hard.dmg=' + E('MODES.hard.dmg'), E => pct(E('MODES.hard.dmg')) === 130);
  add('help', '표식마다 점수가 1점에서 3점', 'MARKS.*.pt 최소 ' + Math.min(...E('Object.values(MARKS).map(m=>m.pt)')) + ' 최대 ' + Math.max(...E('Object.values(MARKS).map(m=>m.pt)')), E => Math.min(...E('Object.values(MARKS).map(m=>m.pt)')) === 1 && Math.max(...E('Object.values(MARKS).map(m=>m.pt)')) === 3);
  add('help', '2챕터는 레벨 5, 3챕터는 레벨 10', 'MARK_START', E => E('MARK_START[2].lv') === 5 && E('MARK_START[3].lv') === 10);
  add('help', '절반 이상을 연 갈래', 'goalBranch: 연 칸이 가장 많은 갈래이고 절반 이상', E => /\/\s*2|0\.5|>=\s*base|\* 2/.test(E('goalBranch.toString()')));

  /* ===== 쿨타임 · 스태미나 · 플라스크 · 행동 ===== */
  add('help', '(예: 쿨타임 4턴)', '시작 스킬 쿨타임 5턴(암살자 독 찌르기)', E => E('SK2.a_vital.cd') === 4);
  add('help', '스태미나는 강공격(40)', 'heavyCost=40, guardCost=20, dodgeCost=30(암살자 25)', E => E(`(() => { const b = __mk("warden"); const p = b.p; return heavyCost(p) === 40 && guardCost(p) === 20 && dodgeCost(p) === 30; })()`));
  add('help', '라운드가 끝날 때마다 10씩 차고', 'ST_REGEN=' + E('ST_REGEN'), E => E('ST_REGEN') === 10);
  add('help', '0이 되면 탈진해서', '탈진: 피해 ×1.2, 30에서 풀림, 전투 끝 최소 50', E => src('hurtPlayer').includes('if (p.st <= 0 || p.exhaust) d *= 1.2') && src('finishPlayer').includes('if (p.exhaust && p.st >= 30) p.exhaust = 0') && src('endBattleCarry').includes('Math.max(p.st, 50)'));
  add('help', '세 가지이고, 각각 처음에는 3번까지', '플라스크 life · mana · stam 각 3, flaskMax 3', E => E(`(() => { const b = __mk("warden"); const f = b.p.flask; return f.life === 3 && f.mana === 3 && f.stam === 3 && b.p.flaskMax === 3; })()`));
  add('help', '낀 플라스크에 따라, 처음 30%', 'START_GEAR.flask=' + E('START_GEAR.flask'), E => pct(E('START_GEAR.flask')) === 30);
  add('help', '마시면 막음 2가 생겨', '정화 플라스크: block 2', E => E(`(() => { const b = __mk("warden"); const p = b.p; if (p.s.block) return false; p.flask.mana = 3; const nb = 2 + fxAdd(p, 'blockAdd', p); return nb === 2 && playerAct.toString().includes("const nb = 2 + fxAdd(p, 'blockAdd', p)"); })()`));
  add('help', '스태미나 60 회복', 'STAM_FLASK=' + E('STAM_FLASK'), E => E('STAM_FLASK') === 60);
  add('help', '기본 공격(▶): 비용 없음', '기본 공격 붕괴 게이지 +10', E => E(`(() => { const b = __mk("warden"); const e = b.en[0]; const k0 = e.brk || 0; playerAct(b, "basic", e.id); return (e.brk || 0) - k0 === 10; })()`));
  add('help', '강공격(⏳): 스태미나 40', '강공격 ×HEAVY_V2(1.5), 붕괴 35, 스태미나 40', E => E('HEAVY_V2') === 1.5 && E(`(() => { const b = __mk("warden"); const e = b.en[0]; const k0 = e.brk || 0; const s0 = b.p.st; playerAct(b, "heavy", e.id); return (e.brk || 0) - k0 === 35; })()`) && E('heavyCost(__mk("warden").p)') === 40);
  add('help', '방어(▶): 스태미나 20', 'guardCost=20, 방어 중 직접 피해 ×0.5, 파수꾼 보호막 WARD.guard', E => E(`(() => { const b = __mk("monk"); const p = b.p; p.guard = 1; p.ward = 0; const hp0 = p.hp; hurtPlayer(b, 100, { label: "시험" }); const a = hp0 - p.hp; p.guard = 0; p.hp = hp0; hurtPlayer(b, 100, { label: "시험" }); const c = hp0 - p.hp; return Math.abs(a / c - 0.5) < 0.02; })()`) && E('guardCost(__mk("warden").p)') === 20);
  add('help', '스태미나 30(암살자 25)', 'dodgeCost', E => E(`(() => { const a = __mk("assassin"), w = __mk("hunter"); return dodgeCost(a.p) === 25 && dodgeCost(w.p) === 30; })()`));
  add('help', '강타를 흘리면 그 적의 붕괴 게이지가 25', 'src: 강타를 흘리면 붕괴 25', E => src('hurtPlayer').includes('if (o.charged) { addBreak(b, o.src, 25);'));
  add('help', '줄이는 몫이 20%p 작습니다', 'PARRY_BIG=' + E('PARRY_BIG'), E => pct(E('PARRY_BIG')) === 20);
  add('help', '원소 합계 = 화상', '원소 합계 상한 ELEM.cap=16', E => E('ELEM.cap')===16 && src('elemShock').includes('Math.min(ELEM.cap'));
};
