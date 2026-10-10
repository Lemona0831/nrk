// 도움말 숫자 대조 둘째 묶음(tools/helpcheck-help.js의 뒤). 증거 종류: 상수(게임 상수와 비교) · 실행(작은 전투를 돌려 봄) · 소스(엔진 글자에 그 규칙이 있음).
module.exports = function (api) {
  const { E, add, note } = api;
  const pct = v => Math.round(v * 100);
  const PS = require('./pagesrc.js'); const SRC = PS.pageScript(require('path').join(api.ROOT, '06a2'));
  const has = s => SRC.includes(s);
  const FREECSS = require('fs').readFileSync(require('path').join(api.ROOT, '06a2', 'css', '76-hud-free.css'), 'utf8');
  const src = fn => E(fn + '.toString()');

  add('help', '"배열"에서는 배열 칸 1~4를 불러오고', '상수: HUD_SLOT_N=' + E('HUD_SLOT_N') + '(저장 칸 수), 소스: 리모콘 상태가 slots를 HUD_SLOT_N칸만큼 만든다', E => E('HUD_SLOT_N') === 4 && has('slots: sl.map((s, i) =>'));
  const OPS = require('fs').readFileSync(require('path').join(api.ROOT, '06a2', 'remote', 'ui.js'), 'utf8');
  add('help', '투명도(100 · 90 · 80 · 70%)', '소스: remote/ui.js const OPS = [100, 90, 80, 70](투명도 단추가 차례로 돈다. 바탕 색만 섞이고 글자는 그대로)', E => OPS.includes('const OPS = [100, 90, 80, 70];'));
  add('help', '칸 폭은 96px 아래로 줄지 않습니다', '상수: FREE_MINW=' + E('FREE_MINW') + ', 소스: hudFreeSetRects가 폭을 FREE_MINW 아래로 두지 않고 CSS도 min-width 96px', E => E('FREE_MINW') === 96 && has('Math.max(FREE_MINW, Math.min(W, r.w))') && FREECSS.includes('min-width:96px'));
  add('help', '화면의 1배에서 3배 가운데 고르고', '상수: FREE_CHS=' + E('FREE_CHS.join()'), E => E('FREE_CHS.join()') === '1,1.5,2,2.5,3');
  add('help', '누를 자리가 24px도 남지 않거나', '상수: FREE_OK=' + E('FREE_OK') + ', 소스: hudFreeGuard가 hudFreeHasSquare(R, obs, FREE_OK)로 가림을 보고 놓은 직후 어긴 칸이 있으면 hudEdRevert', E => E('FREE_OK') === 24 && has('hudFreeHasSquare(R, obs, FREE_OK)') && has('hudEdRevert(); const b = bad[0]'));
  add('help', '붙이기(꺼짐 · 1 · 4 · 8 · 16px)', '상수: FREE_SNAPS=' + E('FREE_SNAPS.join()') + '(0은 꺼짐)', E => E('FREE_SNAPS.join()') === '0,1,4,8,16');
  add('help', 'Ctrl 키를 누르고 있으면 붙이기와 정렬선이 잠시 꺼져', '소스: hfDragMove의 noSnap = ev.ctrlKey || ev.metaKey', E => (PS.pageScript(require('path').join(api.ROOT, '06a2')).match(/const noSnap = ev\.ctrlKey \|\| ev\.metaKey/g) || []).length >= 1);
  add('help', '손가락 하나 크기(44px)는 화면 안에 남습니다', '상수: FREE_GRAB=' + E('FREE_GRAB'), E => E('FREE_GRAB') === 44);
  add('help', '"게임 안으로" 단추를 누르거나 창을 닫으면 패널이 돌아옵니다', '소스: remote/ui.js 단추 "게임 안으로", js/57 hudRemoteCmd의 undock', E => (PS.pageScript(require('path').join(api.ROOT, '06a2')).match(/k === 'undock'/g) || []).length >= 1 && require('fs').readFileSync(require('path').join(api.ROOT, '06a2/remote/ui.js'), 'utf8').includes('>게임 안으로<'));
  add('help', '1px씩, Shift와 함께 누르면 10px씩', '소스: hudEdKey가 const st = ev.shiftKey ? 10 : 1로 화살표 · 대괄호 · 세미콜론 키를 처리', E => (PS.pageScript(require('path').join(api.ROOT, '06a2')).match(/const st = ev\.shiftKey \? 10 : 1/g) || []).length >= 2);
  add('help', '옛 12열 격자 값', '상수: FREE_OLD_COLS=' + E('FREE_OLD_COLS') + ', 소스: hfFromOld가 12열 값을 퍼센트로 바꾼다', E => E('FREE_OLD_COLS') === 12 && has('x / FREE_OLD_COLS * 100'));

  /* ===== 직업 규칙 (뒤) ===== */
  add('help', '겹마다 피해 +5%', '상수: HUNT.focusPer 5% · focusBig 10% · focusMax 3, 소스: 3겹이면 몸 낮추기 · 버티기를 꿰뚫음', E => pct(E('HUNT.focusPer')) === 5 && pct(E('HUNT.focusBig')) === 10 && E('HUNT.focusMax') === 3 && has('b.p.focus.n >= HUNT.focusMax') && has('e.braced && !o.dot && !fullF'));
  add('help', '교대가 두 번 이어지면 켜지는', '소스: altF.run === 2는 sbRunNow ≥ 2일 때 켜지고, 쓰면 p.sbRun = 0', E => has('altF.run === 2 ? b.sbRunNow >= 2 : true') && has('p.sbRun = b.sbRun2 ? 0 : b.sbRunNow'));
  add('help', '한 차례에 3번까지입니다', '상수: MONK.ctrMax=' + E('MONK.ctrMax') + ', 소스: hurtPlayer가 ctrN < MONK.ctrMax를 본다', E => E('MONK.ctrMax') === 3 && has('(p.ctrN || 0) < MONK.ctrMax'));
  add('help', '▶ 공격 한 번이 기 1을 써서', '소스: 강화 ×1.25(수도승 ⚡ 제외), 실행: 강화 1 → ×1.25', E => has("if (p.s.empower && !(p.build === 'monk' && b.curFast)) { d *= 1.25;") && E(`(() => { const b = __mk("monk"); addS(b, b.p, "empower", 1); return outDmg(b, 100, {}) === 125; })()`));
  add('help', '힘은 강공격 붕괴 +5', '소스: 강공격 붕괴 35 + 5 × floor(힘/10), 실행: 민첩 20이면 흘리기 스태미나 −2', E => has("(isCaster(p) && !isV2(p) ? 30 : 35) + 5 * Math.floor(stat(p, 'str') / 10)") && E(`(() => { const b = __mk("warden"); const p = b.p; const c0 = dodgeCost(p); p.stat.dex = 20; return c0 - dodgeCost(p) === 2; })()`));
  add('help', '기본 피해 = 원소 합계', '상수: ELEM.Cw=' + E('ELEM.Cw') + ' · D=' + E('ELEM.D') + ' · Bk=' + E('ELEM.Bk') + ', 소스: elemShock가 세 상수를 쓴다', E => E('ELEM.Cw') === 2 && E('ELEM.D') === 3 && E('ELEM.Bk') === 12 && src('elemShock').includes('ELEM.D') && src('elemShock').includes('ELEM.Bk') && src('elemShock').includes('ELEM.Cw'));

  /* ===== 쿨타임 · 스태미나 · 플라스크 · 행동 ===== */
  add('help', '한 번에 20판씩 보입니다', '상수: RC_PAGE=' + E('RC_PAGE') + '(기록 목록이 한 번에 보이는 판 수)', E => E('RC_PAGE') === 20);
  add('help', '표는 위에서 50개까지 보입니다', '소스: 랭킹 표 all.slice(0, 50)', E => has('rows = all.slice(0, 50)'));
  add('help', '내 턴이 끝날 때마다 1 줄지만', '소스: chargeEv(turn)이 cdJust(이번 차례에 쓴 스킬)를 건너뛰고 1 뺀다', E => has('if (!s || s.once || just.includes(id)) continue; if (p.cd[id] > 0) p.cd[id]--;'));
  add('help', '🔄 스킬은 같은 갈래', '데이터: hasten n은 1이 34칸, 2가 6칸(보통 1)', E => E(`(() => { const c = {}; for (const k of Object.keys(SKILLS2)) for (const s of SKILLS2[k]) for (const f of s.fx || []) if (f.k === "hasten") c[f.n] = (c[f.n] || 0) + 1; return Object.keys(c).join() === "1,2" && c[1] > c[2]; })()`));
  add('help', '30까지 차거나', '소스: p.exhaust && p.st >= 30이면 풀림, 스태미나 플라스크는 exhaust = 0', E => has('if (p.exhaust && p.st >= 30) p.exhaust = 0;') && has('p.st += add; p.exhaust = 0;'));
  add('help', '전투가 끝나면 최소 50까지', '소스: endBattleCarry p.st = max(p.st, 50)', E => has('p.st = Math.max(p.st, 50); p.exhaust = 0;'));
  add('help', '"출혈 2"처럼 걸 상태', '상수: EKW.archerBleed=' + E('EKW.archerBleed') + '(사수 예고 예시)', E => E('EKW.archerBleed') === 2);
  add('help', '샘과 야영지에서 셋 다 1씩', '소스: 샘은 life + 1 · mana + 1 · stam + 1, 야영지는 세 플라스크 각 +1', E => has("p.flask.mana = Math.min(flaskCap(p, 'mana'), p.flask.mana + 1); p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1)") && has("for (const fk of ['life', 'mana', 'stam']) p.flask[fk] = Math.min(flaskCap(p, fk), (p.flask[fk] || 0) + 1)"));
  add('help', '무기 피해만큼 치고 붕괴 게이지를 10', '실행: 기본 공격 한 번에 붕괴 +10', E => E(`(() => { const b = __mk("warden"); const e = b.en[0]; const k0 = e.brk || 0; playerAct(b, "basic", e.id); return (e.brk || 0) - k0 === 10; })()`));
  add('help', '150% 피해, 붕괴 35', '상수: HEAVY_V2=' + E('HEAVY_V2') + ', 실행: 강공격 한 번에 붕괴 +35', E => pct(E('HEAVY_V2')) === 150 && E(`(() => { const b = __mk("warden"); const e = b.en[0]; const k0 = e.brk || 0; playerAct(b, "heavy", e.id); return (e.brk || 0) - k0 === 35; })()`));
  add('help', '파수꾼은 보호막 6을 얻습니다', '상수: WARD.guard=' + E('WARD.guard') + ' · cap=30%, 소스: 방어가 addWard(WARD.guard), 전투가 끝나면 p.ward = 0', E => E('WARD.guard') === 6 && pct(E('WARD.cap')) === 30 && has("if (p.build === 'warden') { const g = addWard(b, p, WARD.guard);") && has('p.ward = 0; p.thorn = null;'));
  add('help', '적 하나를 골라 그 적의 다음 단일 공격 피해를 60%', '실행: parryRed 파수꾼 · 사냥꾼 0.6, 암살자 0.7', E => E(`(() => { const a = __mk("assassin"), w = __mk("warden"); return parryRed(w.p) === 0.6 && parryRed(a.p) === 0.7; })()`));

  /* ===== 화면과 조작 ===== */
  add('help', '숫자 키 1~9가', "소스: onKey가 /^[1-9]$/ 키를 행동 버튼 data-k에 잇는다", E => has("/^[1-9]$/.test(ev.key)") && has('.ab[data-k="'));
  add('help', '"−40 70 → 30" 같은 숫자', '실행: 강공격 스태미나 40, 70 − 40 = 30', E => 70 - E('heavyCost(__mk("warden").p)') === 30);
  add('help', '크기(50 · 75 · 100 · 150 · 200%)', '상수: HUD_SIZES=' + E('HUD_SIZES.join()'), E => E('HUD_SIZES.join()') === '50,75,100,150,200');
  add('help', '글자 크기(90%부터 130%까지)', '상수: FS_OPTS=' + E('FS_OPTS.join()'), E => E('Math.min(...FS_OPTS)') === 0.9 && E('Math.max(...FS_OPTS)') === 1.3);
  add('help', '한 차례에 3개까지', '상수: CONS_TURN=' + E('CONS_TURN'), E => E('CONS_TURN') === 3);
  add('help', '가방은 20칸이고 장비와', '상수: BAG_MAX=' + E('BAG_MAX') + ', 소스: bagUsed가 장비 + 소모품 겹', E => E('BAG_MAX') === 20 && src('bagUsed').includes('cons'));
  add('help', '가방은 20칸이고 가득 차면', '상수: BAG_MAX=' + E('BAG_MAX'), E => E('BAG_MAX') === 20);
  add('help', '(예: "공격 4 · 출혈 2")', '소스: 공격 예고 문장이 "공격 N · 출혈 N" 꼴 (enemyIntent)', E => has("'공격 ' + est + (i.bleed ? ' · 출혈 ' + i.bleed"));

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
  add('help', '기본 공격 10, 강공격 35씩 차고', '실행: 기본 공격 +10, 강공격 +35', E => E(`(() => { const r = []; for (const id of ["basic", "heavy"]) { const b = __mk("warden"); const e = b.en[0]; const k0 = e.brk || 0; playerAct(b, id, e.id); r.push((e.brk || 0) - k0); } return r.join(); })()`) === '10,35');
  add('help', '다음 행동을 잃고, 취약 2가', '실행: 붕괴 가득이면 취약 2', E => E(`(() => { const b = __mk("warden"); const e = b.en[0]; addBreak(b, e, 9999); return st(e, "vuln") === 2; })()`));
  add('help', '사수(후열): 겨누기', '상수: EKW.archerBleed=' + E('EKW.archerBleed') + ', archerEvery=' + E('EKW.archerEvery'), E => E('EKW.archerBleed') === 2);
  add('help', '저주(약화 1 · 취약 1)', '소스: hexcurse가 weak 1 · vuln 1', E => has("case 'hexcurse': { addS(b, b.p, 'weak', 1); addS(b, b.p, 'vuln', 1);"));
  add('help', '신속이 붙은 적은', '소스: startRound가 e.swift이고 둔화 · 붕괴 · 가속이 없으면 가속 1', E => has('e.swift && !e.s.chill && !e.s.broken && !e.s.haste') && has('e.s.haste = { stacks: 1,'));
  add('help', '출혈 2를 겁니다', '상수: LURK.bleed=' + E('LURK.bleed'), E => E('LURK.bleed') === 2);
  add('help', '붕대가 받는 직접 피해를 30%', '상수: WRAP.cut=' + E('WRAP.cut'), E => pct(E('WRAP.cut')) === 30);
  add('help', '불단지(화상 3)', '상수: EMBER.potIgn=' + E('EMBER.potIgn') + ' · share=' + E('EMBER.share'), E => E('EMBER.potIgn') === 3 && E('EMBER.share') === 2);
  add('help', '동료에게 허상 2, 자기에게 허상 1', '상수: HAZE.give=' + E('HAZE.give') + ' · self=' + E('HAZE.self'), E => E('HAZE.give') === 2 && E('HAZE.self') === 1);
  add('help', '공격에 화상을 싣습니다(평소 1, 강타 2)', '상수: FIRE_AFFIX.hit=' + E('FIRE_AFFIX.hit') + ' · heavy=' + E('FIRE_AFFIX.heavy'), E => E('FIRE_AFFIX.hit') === 1 && E('FIRE_AFFIX.heavy') === 2);
  add('help', '한 라운드에 새로 붙는 화상이 4까지', '상수: IGN_ROUND_CAP=' + E('IGN_ROUND_CAP'), E => E('IGN_ROUND_CAP') === 4);

  /* ===== 상태이상 ===== */
  add('help', '정해진 때가 오면 효과가 나고', '실행: 화상 4가 직접 피해에 발동하면 3으로 줄어든다', E => E(`(() => { const b = __mk("warden"); const p = b.p; addS(b, p, "ignite", 4); kwTaken(b, p, 100, { src: b.en[0] }); return st(p, "ignite") === 3; })()`));
  add('help', '중독 N: 라운드가 끝날 때마다 N 피해(상한 20)', '상수: KW.poison=20, 실행: 중독 99를 걸면 20', E => E('KW.poison') === 20 && E(`(() => { const b = __mk("warden"); const e = b.en[0]; addS(b, e, "poison", 99); return st(e, "poison"); })()`) === 20);
  add('help', '출혈 N: 걸린 쪽이 행동할 때마다 N 피해(상한 10)', '상수: KW.bleed=' + E('KW.bleed') + ', 실행: 출혈 99를 걸면 10', E => E('KW.bleed') === 10 && E(`(() => { const b = __mk("warden"); const e = b.en[0]; addS(b, e, "bleed", 99); return st(e, "bleed"); })()`) === 10);
  add('help', '화상 N: 걸린 쪽이 직접 피해를 받을 때마다', '상수: KW.ignite=' + E('KW.ignite') + ', 실행: 화상 4일 때 100 → 104', E => E('KW.ignite') === 10 && E(`(() => { const b = __mk("warden"); const p = b.p; p.guard = 0; addS(b, p, "ignite", 4); return Math.round(kwTaken(b, p, 100, { src: b.en[0] })) === 104; })()`));
  add('help', '약화 N ↔ 강화 N', '실행: 약화 → ×0.75, 강화 → ×1.25, 상수: KW.weak · empower = 5', E => E(`(() => { const b = __mk("warden"); const p = b.p; addS(b, p, "weak", 2); const w = outDmg(b, 100, {}); delete p.s.weak; addS(b, p, "empower", 2); const e = outDmg(b, 100, {}); return w === 75 && e === 125; })()`) && E('KW.weak') === 5 && E('KW.empower') === 5);
  add('help', '취약 N ↔ 보호 N', '실행: 취약 → ×1.25, 보호 → ×0.75, 한 번에 1 줄어듦, 상수: KW.vuln · protect = 5', E => E(`(() => { const b = __mk("warden"); const p = b.p; p.guard = 0; addS(b, p, "vuln", 2); const v = kwTaken(b, p, 100, { src: b.en[0] }); const v2 = st(p, "vuln"); delete p.s.vuln; addS(b, p, "protect", 2); const q = kwTaken(b, p, 100, { src: b.en[0] }); return v === 125 && v2 === 1 && q === 75 && st(p, "protect") === 1; })()`) && E('KW.vuln') === 5 && E('KW.protect') === 5);
  add('help', '둔화 N ↔ 가속 N', '상수: KW.chill · haste = 3, 소스: roundOrder가 둔화는 맨 뒤 · 가속은 맨 앞', E => E('KW.chill') === 3 && E('KW.haste') === 3 && src('roundOrder').includes('chill') && src('roundOrder').includes('haste'));
  add('help', '반대되는 상태는 걸 때 숫자끼리 뺍니다', '실행: 보호 2에 취약 3 → 보호 0 · 취약 1', E => E(`(() => { const b = __mk("warden"); const p = b.p; addS(b, p, "protect", 2); addS(b, p, "vuln", 3); return st(p, "protect") === 0 && st(p, "vuln") === 1; })()`));

  /* ===== 장비 · 레벨 · 골드 · 도박 · 방 ===== */
  add('help', '열기를 내리는 장비는 한 전투에 합쳐 20까지', '상수: FX_HEAT_CUT=' + E('FX_HEAT_CUT'), E => E('FX_HEAT_CUT') === 20);
  add('help', '능력치 3점을 나누고', '상수: LV_POINTS=3, 소스: gainXp가 올라간 레벨 수만큼 tree.pts를 더한다', E => E('LV_POINTS') === 3 && has('if (run.tree) run.tree.pts += up;'));
  add('help', '산 값의 25%에 팔고', '실행: sellOf(고급 1챕터) = floor(가격 × 0.25), 전설은 sellOf = LEG_SELL=' + E('LEG_SELL'), E => E('sellOf({g:"m",ch:1})') === Math.floor(E('priceOf("m",1)') * 0.25) && E('sellOf({g:"l",ch:2})') === 150);
  add('help', '값은 그 챕터 고급 장비의 1.3배', '상수: GAMBLE.mul=' + E('GAMBLE.mul') + ', 실행: gamblePrice(2) = round(고급 가격 × 1.3)', E => E('GAMBLE.mul') === 1.3 && E('gamblePrice(2)') === Math.round(E('priceOf("m",2)') * 1.3));
  add('help', '평범은 70%, 고급은 45%, 희귀는 20%', '상수: FATE.up', E => pct(E('FATE.up.n')) === 70 && pct(E('FATE.up.m')) === 45 && pct(E('FATE.up.r')) === 20);
  add('help', '챕터마다 24층입니다', '상수: FLOORS=24 · FLOOR_CAMP=12 · FLOOR_BOSS=24, 실행: isLower 11층 거짓 · 13층 참 · 23층 참', E => E('FLOORS') === 24 && E('FLOOR_CAMP') === 12 && E('FLOOR_BOSS') === 24 && E('isLower(11,1)') === false && E('isLower(13,1)') === true && E('isLower(23,1)') === true);
  add('help', '라운드가 끝날 때마다 열기가 10 오르고', '상수: HEAT.mod=' + E('HEAT.mod') + ' · ember=' + E('HEAT.ember') + ' · reset=' + E('HEAT.reset') + ', 소스: 열기 상한 100', E => E('HEAT.mod') === 10 && E('HEAT.ember') === 8 && E('HEAT.reset') === 30 && has('Math.max(0, Math.min(100, b.heat + n))'));
  add('help', '아지랑이는 모든 적이 허상 1로', "소스: ch3Setup이 haze 방 특성이면 진짜 적마다 e.haze를 1 이상으로", E => has("if (mods.includes('haze')) for (const e of alive(b)) if (realFoe(e)) e.haze = Math.max(e.haze || 0, 1);"));
  add('help', '모래폭풍은 후열 적이 주는 피해와 받는 피해가 20%', "소스: 받는 피해 ch3HitMul 0.8, 주는 피해 enemyHitEst 0.8", E => has("if (e.row === 'back' && hasMod(b, 'sandstorm')) m *= 0.8;") && has("if (e.row === 'back' && hasMod(b, 'sandstorm')) d *= 0.8;"));
  add('help', '보스전을 오래 끌면(보통', '상수: ENRAGE.boss=' + E('ENRAGE.boss') + ' (b.t는 라운드마다 1, 45라운드)', E => E('ENRAGE.boss') === 45);

  /* 숫자는 있지만 규칙이 아닌 문장, 또는 아래에서 따로 증명하는 문장 */
  note('help', '"다음 1점"의 효과가 보이고', '화면 이름 예시 ("다음 1점")');
  note('help', '1 · 2 · 3챕터 보스를 넘었는지', '챕터 이름');
  note('help', '버튼에 "쿨타임 2턴 남음"', '표기 예시');
  note('help', '"전투마다 1번"인 스킬은', '표기 이름 (once 스킬은 전투가 끝나야 다시 쓴다: chargeEv가 once를 건너뛴다)');
  add('help', '0이 되면 쓰러지고', '소스: hurtPlayer가 생명력이 0 이하이면 쓰러짐 처리', E => has('p.hp <= 0') || has('p.hp = Math.max(0, p.hp - d)'));
  add('help', '회복은 생명력 플라스크, 소모품, 샘(50%)', '소스: 샘은 최대 생명력 × 0.5, 야영지 · 정산은 p.hp = p.hpMax', E => has('const sp = 0.5 * (1 + fxVal(p, \'spring\'') && has('p.hp = p.hpMax; p.mp = p.mpMax; p.st = p.stMax;'));
  note('help', '1챕터를 끝까지 가면 Lv5 안팎', '측정값: 던전 테스터 216판(DGDIR=06a2 node tools/dgqa.js 6), 보스층에 닿은 74판의 레벨 4~6 평균 5.1, 완주 17판 5~6 평균 5.8. 규칙이 아닌 결과 문장이라 코드와 대조하지 않는다');
  add('help', '스킬 포인트는 레벨만큼, 능력치는 20점에', '상수: STAT_START=15 · LV_POINTS=3, 소스: markSetup이 트리 포인트 += 레벨 − 1, markStat = LV_POINTS × (레벨 − 1)', E => E('STAT_START') === 20 && E('LV_POINTS') === 3 && has('if (run.tree) run.tree.pts += up; run.markStat = LV_POINTS * up;'));
  /* ===== 도움말 정리(0.7.0): 묶음 · 일곱 장면 · 기본 표시 ===== */
  add('help', '일곱 장면으로 연습합니다', '데이터: TUT.length=' + E('TUT.length'), E => E('TUT.length') === 7);
  add('help', '처음에는 간단입니다', '상수: HUD_NAMES, HUD_DEFAULT=' + E('HUD_DEFAULT'), E => E('HUD_NAMES.join()') === 'simple,normal,full' && E('HUD_DEFAULT') === 'simple');
  add('help', '끔 · 약하게 · 보통 · 강하게를 고릅니다', '데이터: VFX_OPTS 네 단계', E => E('VFX_OPTS.map(o => o[1]).join()') === '끔,약하게,보통,강하게');
  add('help', '챕터는 1챕터 저주받은 수도원', '데이터: CHAPTERS 이름 셋', E => E('[1,2,3].map(c => CHAPTERS[c].n).join()') === '저주받은 수도원,잊힌 지하묘지,재의 사막 유적');
};
