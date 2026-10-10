// helpcheck 모듈: 화면 안내 문장(설명 창, 텍스트층, 전장 HUD, 상점, 계정, 수련장 등)의 숫자를 코드 값과 대조한다.
// 출처 이름은 ui-로 시작한다. 글 조각은 소스의 문자열 리터럴에서 뽑는다(태그와 ${...}는 지운다: ${...}로 넣는 숫자는 코드 값을 그대로 쓰므로 만든 방식 자체로 맞다).
// 문장을 쓰는 곳이 코드 값을 따로 적은 글(고정 숫자)이면 그 값을 코드에서 다시 계산하거나, 코드의 해당 줄(정규식)로 확인한다.
// 화면에 닿지 않는 글(다른 글이 덮어쓴 것, 없는 직업의 글)은 "덮어씀 · 도달 불가"로 따로 닫는다(근거 앞에 [덮어씀] · [도달 불가]).
const fs = require('fs'), path = require('path');
module.exports = function (api) {
  const { E, ROOT } = api;
  const dir = path.join(ROOT, '06a2');
  const FILES = [
    ['ui-info', 'js/54-info-popups.js'], ['ui-text', 'js/60-text-layer.js'], ['ui-hud', 'js/52-battle-hud.js'], ['ui-parts', 'js/53-battle-parts.js'],
    ['ui-hudedit', 'js/56-hud-editor.js'], ['ui-huddirect', 'js/57-hud-direct.js'], ['ui-tree', 'js/72-skill-tree-screen.js'], ['ui-shop', 'js/46-screens-shop.js'],
    ['ui-account', 'js/44-screens-account.js'], ['ui-tut', 'js/48-tutorial-screens.js'], ['ui-end', 'js/70-act-end-screens.js'], ['ui-results', 'js/74-results-viewer.js'], ['ui-tutdata', 'data/tutorial.js'],
    ['ui-settings', 'js/76-sound-render.js'],
  ];
  function stripTpl(s) { // ${ ... } 지우기(중첩 괄호 처리)
    let o = '', i = 0;
    while (i < s.length) {
      if (s[i] === '$' && s[i + 1] === '{') { let d = 1; i += 2; while (i < s.length && d) { if (s[i] === '{') d++; else if (s[i] === '}') d--; i++; } o += '§'; } else o += s[i++];
    }
    return o;
  }
  function lits(t) {
    const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g; let m; const out = [];
    while ((m = re.exec(t))) {
      let s = m[1] ?? m[2] ?? m[3]; const ln = t.slice(0, m.index).split('\n').length;
      s = stripTpl(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (/[가-힣]/.test(s) && /\d/.test(s)) out.push({ id: ln, text: s });
    }
    return out;
  }
  const texts = {};
  for (const [name, f] of FILES) {
    const arr = lits(fs.readFileSync(path.join(dir, f), 'utf8')).map(x => ({ id: f.replace(/^.*\//, '').slice(0, 5) + ':' + x.id, text: x.text }));
    texts[name] = arr.map(x => x.text); api.source(name, arr);
  }
  // 도구
  const SRCC = {}; const SRC = f => SRCC[f] || (SRCC[f] = fs.readFileSync(path.join(dir, f.includes('/') ? f : 'js/' + f), 'utf8'));
  const has = (f, re) => typeof re === 'string' ? SRC(f).includes(re) : re.test(SRC(f));
  const sents = t => String(t).split(/(?<=[.?!])\s+(?=\S)/).map(s => s.trim()).filter(Boolean);
  const where = find => Object.keys(texts).filter(n => texts[n].some(t => sents(t).some(s => s.includes(find))));
  // A: 그 글(찾을글)이 든 모든 출처 문장에 같은 항목을 건다
  const MISS = [];
  function A(find, ev, fn) { const w = where(find); if (!w.length) { MISS.push(find); return; } for (const n of w) api.add(n, find, ev, fn); }
  function N(find, why) { const w = where(find); if (!w.length) { MISS.push(find); return; } for (const n of w) api.note(n, find, why); }
  const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-9 : e);
  const q = JSON.stringify;
  const NOV = () => E('mkPlayer("novice", {})');
  const both = (...fs_) => e => fs_.every(f => f(e));
  const ITEM_HP = (arm, base) => { const r = E(`(() => { const a = mkPlayer("assassin", {}); const b = mkPlayer("assassin", { armor: ${q(arm)} }); return calcHpMax(b) / calcHpMax(a); })()`); return Math.abs(r - base) < 0.012; };
  const DEAD = (expr) => (e) => !!E(expr); // 덮어씀 · 도달 불가를 식으로 확인한다

  // ───────── 상태 설명 SDESC (54) · 텍스트층(60) ─────────
  A('중첩마다 라운드당 피해 1', 'STACKY.plague.tick = 1', () => E('STACKY.plague.tick') === 1);
  A('회복량의 60%만큼', 'smiteHeal: hurtEnemy(.., hl * 0.6)', () => has('32-player-action.js', /hurtEnemy\(b, e, hl \* 0\.6/));
  A('최대 3.', "낙인: addS(b, p, 'brand', 999, 1, 3) 상한 3", () => has('30-enemy-ai.js', "addS(b, b.p, 'brand', 999, 1, 3)"));
  // 54의 옛 상태 설명은 60이 덮어쓴다
  const OV = (find, key) => A(find, '[덮어씀] 60-text-layer가 SDESC.' + key + '를 다시 씀', () => !E(`SDESC[${q(key)}]`).includes(find));
  OV('그 수치만큼 피해를 준 뒤', 'poison'); OV('걸 때마다 1씩 오르고', 'poison');
  OV('라운드마다 피해 2, 그리고', 'bleed'); OV('라운드마다 화염 피해 2', 'ignite');
  OV('주는 피해 -25%', 'weak'); OV('받는 피해 +25%.', 'vuln'); OV('받는 피해 -20%', 'protect');
  OV('격노: 주는 피해 +40%, 속도 +20%', 'rage'); OV('붕괴: 받는 피해 +30%', 'broken');
  A('걸면 숫자가 오릅니다(상한 20)', 'KW.poison = 20', () => E('KW.poison') === 20);
  A('방어, 흘리기, 플라스크도 행동입니다(상한 10)', 'KW.bleed = 10 (출혈은 finishPlayer의 kwBleed가 행동마다)', () => E('KW.bleed') === 10 && has('32-player-action.js', 'kwBleed(b, p)'));
  A('그 숫자만큼 피해를 더 받고 1 줄어듭니다(상한 10)', 'KW.ignite = 10, kwTaken: kwDec(ignite) 1', () => E('KW.ignite') === 10 && has('20-battle-state.js', "kwDec(u, 'ignite')"));
  A('맨 뒤로 밀리고 1 줄어듭니다(상한 3)', 'KW.chill = 3, roundOrder: kwDec(chill) 1', () => E('KW.chill') === 3 && has('34-rounds-setup.js', "kwDec(u, 'chill')"));
  A('라운드 맨 앞에서 두 번 연달아 움직이고 1 줄어듭니다', "roundOrder: 사냥꾼 haste 두 번, kwDec(haste) 1", () => has('34-rounds-setup.js', "kwDec(u, 'haste')") && has('34-rounds-setup.js', /p\.s\.haste && p\.build === 'hunter'/));
  A('한 라운드에 한 번이고 상한 3입니다', 'KW.haste = 3, b.pDouble 라운드마다 한 번', () => E('KW.haste') === 3 && has('34-rounds-setup.js', 'b.pDouble = (b.round || 0) + 1'));
  A('공격할 때마다 그 공격의 피해가 25% 줄고 1 줄어듭니다(상한 5)', 'outDmg weak ×0.75 · KW.weak = 5 · finishPlayer kwDec(weak) 1', () => E('KW.weak') === 5 && has('32-player-action.js', 'if (p.s.weak) d *= 0.75') && has('32-player-action.js', "kwDec(p, 'weak')"));
  A('공격할 때마다 그 공격의 피해가 25% 늘고 1 줄어듭니다(상한 5)', 'outDmg empower ×1.25 · KW.empower = 5 · kwDec(empower) 1', () => E('KW.empower') === 5 && has('32-player-action.js', 'd *= 1.25') && has('32-player-action.js', "kwDec(p, 'empower')"));
  A('직접 피해를 받을 때마다 그 피해가 25% 늘고 1 줄어듭니다(상한 5)', 'kwTaken vuln ×1.25, kwDec(vuln) 1 · KW.vuln = 5', () => E('KW.vuln') === 5 && has('20-battle-state.js', "if (u.s.vuln) { d *= 1.25; kwDec(u, 'vuln'); }"));
  A('직접 피해를 받을 때마다 그 피해가 25% 줄고 1 줄어듭니다(상한 5)', 'kwTaken protect ×0.75, kwDec(protect) 1 · KW.protect = 5', () => E('KW.protect') === 5 && has('20-battle-state.js', "if (u.s.protect) { d *= 0.75; kwDec(u, 'protect'); }"));
  A('해로운 상태가 걸리려 할 때마다 튕겨 내고 1 줄어듭니다', "kwBlocked: kwDec(u, 'block') 1", () => has('20-battle-state.js', "kwDec(u, 'block'); logp(b, 'good', '정화의 막이"));
  A('주는 피해 +40%, 빠르기 +20%, 받는 피해 +15%.', '[도달 불가] 격노는 분노 직업(berserker)만 건다. BUILDS에 없다', DEAD("BUILDS.berserker === undefined && !CLASS_KEYS().includes('berserker')"));
  A('잠시 피해 +40%, 빠르기 +20%, 받는 피해 +15%', '[도달 불가] 분노 직업(berserker)이 BUILDS에 없다', DEAD("BUILDS.berserker === undefined"));
  A('무너질 때 취약 2가 걸리고', "addBreak: addS(e, 'vuln', 2), broken 2", () => has('32-player-action.js', "addS(b, e, 'broken', 2); addS(b, e, 'vuln', 2)"));
  A('가득 차면 모으던 강타가 끊기고, 다음 행동을 놓치며, 취약 2가 걸립니다', "addBreak: 같은 줄(e.stun = 1, vuln 2)", () => has('32-player-action.js', "addS(b, e, 'vuln', 2)"));
  A('모으던 강타가 끊기고, 다음 행동을 잃고, 취약 2가 걸립니다', "addBreak vuln 2", () => has('32-player-action.js', "addS(b, e, 'vuln', 2)"));

  // ───────── 공용 행동 설명 AINFO / AINFO2 ─────────
  const BRK10 = () => has('32-player-action.js', /addBreak\(b, tgt, 10\); applyReflux\(b, tgt\); break; \/\/ 0\.6: 기본 공격은 스태미나/);
  A('붕괴 게이지 +10', "기본 공격: addBreak(tgt, 10)", BRK10);
  A('피해는 무기 피해의 90%', "[도달 불가] 옛 시전자(비 v2)의 basicBase ×0.9. 모든 직업이 v2", DEAD('Object.keys(BUILDS).every(k => BUILDS[k].v2)'));
  A('원거리, 무기 피해의 160%, 붕괴 게이지 +30', "[도달 불가] 비 v2 시전자: heavyBase ×1.6, 붕괴 30. 모든 직업이 v2", DEAD('Object.keys(BUILDS).every(k => BUILDS[k].v2)'));
  A('스태미나 40.', 'heavyCost 기본 40 (novice)', () => E('heavyCost(' + 'mkPlayer("novice", {}))') === 40);
  A('피해 180%', '[덮어씀] v2 직업은 AINFO2.heavy(150%)를 쓴다. 180%는 비 v2 heavyBase 1.8. 모든 직업이 v2', DEAD('Object.keys(BUILDS).every(k => BUILDS[k].v2)'));
  A('180% 피해', '[도달 불가] 같은 이유. 비 v2 heavyBase 1.8', DEAD('Object.keys(BUILDS).every(k => BUILDS[k].v2)'));
  A('붕괴 게이지 +35.', '강공격 붕괴 35 + 힘 10마다 5 (addBreak 35 + 5 × floor(str/10))', () => has('32-player-action.js', /addBreak\(b, tgt, \(isCaster\(p\) && !isV2\(p\) \? 30 : 35\) \+ 5 \* Math\.floor/));
  A('스태미나 20.', 'guardCost 20', () => E('guardCost(mkPlayer("novice", {}))') === 20);
  A('스태미나 30.', 'dodgeCost 기본 30 (novice)', () => E('dodgeCost(mkPlayer("novice", {}))') === 30);
  A('적 하나를 골라(적 카드 선택, 없으면 강타 예고한 적) 그 적의 다음 단일 공격 피해를 60% 줄인다', '[덮어씀] AINFO.dodge는 비 v2 글. v2는 AINFO2.dodge(parryRed). 기본 60% = parryRed(novice)', () => Math.round(E('parryRed(mkPlayer("novice", {}))') * 100) === 60);
  A('고른 적의 다음 공격 피해를 60% 줄인다', '기본 흘리기 60% = parryRed(novice) (암살자 70%, 민첩 0.5%p)', () => Math.round(E('parryRed(mkPlayer("novice", {}))') * 100) === 60);
  A('그 적의 붕괴 게이지 +25', '강타를 흘리면 addBreak(src, 25)', () => has('24-clock-damage.js', "if (o.charged) { addBreak(b, o.src, 25)"));
  A('강타였다면 그 적의 붕괴 게이지 +25', '강타를 흘리면 addBreak(src, 25)', () => has('24-clock-damage.js', "if (o.charged) { addBreak(b, o.src, 25)"));
  A('강타라면 그 적의 붕괴 게이지 +25', '강타를 흘리면 addBreak(src, 25)', () => has('24-clock-damage.js', "if (o.charged) { addBreak(b, o.src, 25)"));
  A('강타라면 그 적의 붕괴 게이지가 25 찹니다', '강타를 흘리면 addBreak(src, 25)', () => has('24-clock-damage.js', "if (o.charged) { addBreak(b, o.src, 25)"));
  A('충전 1.', '플라스크 한 번에 충전 1 소모 (flask[k]--)', () => has('32-player-action.js', 'p.flask.stam--') && has('32-player-action.js', 'p.flask.mana--'));
  A('생명력 30% 회복', '시작 플라스크 회복 flaskHealFrac(novice) = 30%', () => Math.round(E('flaskHealFrac(mkPlayer("novice", {}))') * 100) === 30);
  A('생명력 30%를 채우고', '시작 플라스크 회복 flaskHealFrac(novice) = 30%', () => Math.round(E('flaskHealFrac(mkPlayer("novice", {}))') * 100) === 30);
  A('마나 40% 회복', "마나 플라스크: p.mpMax * 0.4", () => has('32-player-action.js', 'p.mp + p.mpMax * 0.4'));
  A('마나 40%를 채우고', "마나 플라스크: p.mpMax * 0.4", () => has('32-player-action.js', 'p.mp + p.mpMax * 0.4'));
  A('스태미나를 ', 'STAM_FLASK = 60 (글에는 값을 템플릿으로 넣는다)', () => E('STAM_FLASK') === 60);
  A('3배 피해', '[덮어씀] 60이 RINFO.bruiser를 TELE.heavy 템플릿으로 다시 씀', () => !E('RINFO.bruiser').includes('3배'));
  A('후열이 받는 광역 피해는 절반, 옆 전열 동료는 −40%(방패벽), 자신도 광역 피해 −25%', '[덮어씀] 60이 RINFO.shield를 다시 씀', () => !E('RINFO.shield').includes('−40%(방패벽)'));
  A('생명력이 40% 아래인 동료를 25% 치유하고, 아니면 축복(다음 공격 +25%)을 건다', '[덮어씀] 60이 RINFO.healer를 PRIEST.heal 템플릿으로 다시 씀', () => !E('RINFO.healer').includes('치유하고'));
  A('소환은 하수인 1기(최대 3기)', '[덮어씀] 60이 RINFO.summoner를 SUMMON.cap 템플릿으로 다시 씀', () => !E('RINFO.summoner').includes('1기(최대 3기)'));
  A('대신 서 있는 동안 방패벽으로 후열이 받는 광역 피해를 절반으로', 'AOE.wall = 0.5 (후열 0.7에 방패벽이 다시 절반), AOE.wallFront = 0.6 (40% 감소), AOE.shieldSelf = 0.75 (25% 감소)', () => E('AOE.wall') === 0.5 && near(1 - E('AOE.wallFront'), 0.4) && near(1 - E('AOE.shieldSelf'), 0.25));
  A('여럿을 함께 치는 공격의 피해가 40% 줄어듭니다', 'AOE.wallFront = 0.6', () => near(1 - E('AOE.wallFront'), 0.4));
  A('% 아래인 동료를 25% 회복시키고, 아니면 곧 때릴 동료에게 축복(다음 공격 피해 +25%)을 건다', 'healFrac 0.25 · 축복 empower ×1.25(적 empower)', () => has('12-state-class-rules.js', 'const healFrac = e => e.monk ? ABBOT.monkHeal * Math.pow(ABBOT.monkDecay, e.healN || 0) : 0.25 * Math.pow(0.7, e.healN || 0)') && has('30-enemy-ai.js', 'if (e.s.empower) d *= 1.25'));
  // 몬스터 소개와 설명(RINFO 계열) 가운데 53 한 줄
  A('내 차례에는 ⚡빠른 행동 1번', '내 차례: 빠른 칸 1(finishPlayer: !b.bonusUsed) + 주 행동 1', () => has('32-player-action.js', '!b.bonusUsed || b.extraQuick'));
  A('"1번째"는 내 차례가 끝나면 바로 움직입니다', 'actIdx/preview: 순번은 1부터(나는 빼고 셈)', () => has('34-rounds-setup.js', 'function actIdx(b, e)'));
  A('"1·4번째"처럼', '순번 표기 예시(두 번 움직이는 적은 두 칸에 적힘)', () => has('34-rounds-setup.js', "x.sp >= RND_TWICE) out.push(Object.assign({}, x, { twice: 1 }))"));
  A('두 번 움직이는 적(×2)은 평소 공격을 한 번 더 셉니다', 'RND_TWICE = 1.5 속도 이상은 라운드 끝에 한 번 더(roundOrder)', () => E('RND_TWICE') === 1.5);
  A('빠르기 1.5 이상인 적만', 'RND_TWICE = 1.5', () => E('RND_TWICE') === 1.5);
  A('0이 되면 쓰러집니다.', 'checkEnd: 생명력 0 이하면 패배', () => has('24-clock-damage.js', /function checkEnd\(b\) \{[^]{0,400}p\.hp <= 0/));
  A('최대치의 5%', 'tickOnce: mp + mpMax × 0.05 (옛 마나. v2 직업은 마나 0)', () => has('24-clock-damage.js', 'p.mpMax * 0.05'));
  A('강공격 40, 방어 20, 흘리기 30(암살자 25)이 듭니다', 'heavyCost 40 · guardCost 20 · dodgeCost 30, 암살자 25', () => E('heavyCost(mkPlayer("novice", {}))') === 40 && E('guardCost(mkPlayer("novice", {}))') === 20 && E('dodgeCost(mkPlayer("novice", {}))') === 30 && E('dodgeCost(mkPlayer("assassin", {}))') === 25);
  A('라운드가 끝날 때마다 10씩 차고, 스태미나 플라스크로 60을 채웁니다', 'ST_REGEN = 10 · STAM_FLASK = 60', () => E('ST_REGEN') === 10 && E('STAM_FLASK') === 60);
  A('0이 되면 탈진합니다', 'finishPlayer: p.st <= 0 → exhaust', () => has('32-player-action.js', 'if (p.st <= 0) { p.st = 0; p.exhaust = 1; }'));
  A('기본 공격 10, 강공격 35, 강타 흘리기 25씩 찹니다', 'addBreak: 기본 10 · 강공격 35(힘 10마다 +5) · 강타 흘리기 25', () => BRK10() && has('32-player-action.js', /\? 30 : 35\) \+ 5 \* Math\.floor/) && has('24-clock-damage.js', "addBreak(b, o.src, 25)"));
  A('방을 이겨도 차지 않고, 샘과 야영지에서 셋 다 1씩 찹니다', '야영지(80-events)와 샘: flask life · mana · stam 각각 +1', () => has('80-events.js', /for \(const fk of \['life', 'mana', 'stam'\]\) p\.flask\[fk\] = Math\.min\(flaskCap\(p, fk\), \(p\.flask\[fk\] \|\| 0\) \+ 1\)/) && has('80-events.js', "p.flask.stam = Math.min(flaskCap(p, 'stam'), (p.flask.stam || 0) + 1)"));
  A('받는 피해가 20% 늘어납니다', 'hurtPlayer: p.st <= 0 || p.exhaust → ×1.2', () => has('24-clock-damage.js', 'if (p.st <= 0 || p.exhaust) d *= 1.2'));
  A('받는 피해 +20%', 'hurtPlayer: p.st <= 0 || p.exhaust → ×1.2', () => has('24-clock-damage.js', 'if (p.st <= 0 || p.exhaust) d *= 1.2'));
  A('30까지 차면 풀립니다', 'finishPlayer: p.exhaust && p.st >= 30 → 0', () => has('32-player-action.js', 'if (p.exhaust && p.st >= 30) p.exhaust = 0'));
  A('방어 중 받은 피해의 30%', "인내의 흉갑(plate): p.counter += d × 0.3", () => has('24-clock-damage.js', "p.eq.armor === 'plate' && !o.dot) p.counter += d * 0.3"));
  A('받은 피해의 30%가 다음 공격에 실립니다', "인내의 흉갑(plate): p.counter += d × 0.3", () => has('24-clock-damage.js', "p.counter += d * 0.3"));
  A('쿨타임이 남은 스킬은 남은 쿨타임 1턴마다 최대 생명력의 4%', 'BLOOD.per = 0.04, bmPullCost: 남은 쿨타임 n × per', () => E('BLOOD.per') === 0.04);
  A('20까지 셉니다', 'BLOOD.dmgCount = 20', () => E('BLOOD.dmgCount') === 20);
  A('−3턴은 남은 쿨타임 3턴 몫까지', '값 깎기 payCut off 3(스킬 데이터의 off 값 예시, 마나 없는 직업 H3)', () => E('SKILLS2.bloodmage.some(s => s.fx.some(f => f.k === "payCut" && f.off === 3))'));
  A('3개까지 쌓이고', 'BLOOD.payCutMax = 3', () => E('BLOOD.payCutMax') === 3);
  A('한 적에게 6까지입니다', 'BLOOD.spreadKillMax = 6', () => E('BLOOD.spreadKillMax') === 6);
  A('또 걸면 횟수를 더합니다(최대 8번)', 'WARD.thornMax = 8 (맞으면 출혈도 같은 상한)', () => E('WARD.thornMax') === 8);
  A('또 걸면 횟수가 더해지고(최대 8번)', 'WARD.thornMax = 8', () => E('WARD.thornMax') === 8);
  A('적의 직접 공격에 맞을 때마다(보호막이 다 받아내도) 때린 적에게 피해를 되돌리고 1 줄어듭니다', '가시: 맞을 때마다 n 1 감소(hurtPlayer thorn)', () => has('24-clock-damage.js', '--p.thorn.n <= 0'));
  A('적이 나를 직접 칠 때마다 그 적에게 둔화를 걸고 1 줄어듭니다', '되얼림: rime times 1 감소', () => has('12-state-class-rules.js', 'r.times--'));
  A('보호막 · 방어 · 흘리기로 피해가 0이어도 걸립니다', '되얼림은 hurtPlayer에서 피해량과 상관없이 건다', () => has('24-clock-damage.js', /elemRime/));
  A('같은 종류를 이어 쓰면 이어진 교대가 0이 됩니다', 'sbRun = 0 (sbEnd: 같은 종류)', () => has('10-skills-engine.js', 'p.sbRun = b.sbRun2 ? 0 : b.sbRunNow') && has('10-skills-engine.js', 'b.sbRunNow = b.sbAlt ? (p.sbRun || 0) + 1 : 0'));
  A('켜진 스킬을 쓰면 이어진 교대는 0이 됩니다', 'sbRun = 0', () => has('10-skills-engine.js', 'p.sbRun = b.sbRun2 ? 0 : b.sbRunNow') && has('10-skills-engine.js', 'b.sbRunNow = b.sbAlt ? (p.sbRun || 0) + 1 : 0'));
  A('방어하면 해로운 상태를 2 지웁니다', 'CONF.guard = 2', () => E('CONF.guard') === 2);
  A('최대 생명력의 30%(마검사는 15%)까지 쌓이고', 'WARD.cap = 0.3 · 마검사 wardCap = 0.15', () => E('WARD.cap') === 0.3 && E('BUILDS.spellblade.wardCap') === 0.15);
  A('파수꾼은 방어할 때마다 6을 얻고', 'WARD.guard = 6', () => E('WARD.guard') === 6);
  A('잃은 생명력 10%마다 내가 주는 직접 피해가 3% 늘어납니다(최대 18%)', 'BUTCH.thirst = 0.03 · thirstMax = 0.18, buThirst: 잃은 10%마다', () => E('BUTCH.thirst') === 0.03 && E('BUTCH.thirstMax') === 0.18 && has('12-state-class-rules.js', '(1 - p.hp / p.hpMax) * 10'));
  A('(최대 생명력의 30%까지)', 'BUTCH.grudgeCap = 0.3', () => E('BUTCH.grudgeCap') === 0.3);
  A('먹기는 한 전투에 최대 생명력의 40%까지입니다', 'BUTCH.eatFight = 0.4', () => E('BUTCH.eatFight') === 0.4);
  A('생명력 1에서 멈춥니다', 'dmgDot bleedFloor: d = max(0, p.hp - 1)', () => has('24-clock-damage.js', 'd = Math.max(0, p.hp - 1)'));
  A('생명력 1에서 멈춥니다', 'dmgDot bleedFloor: d = max(0, p.hp - 1)', () => has('24-clock-damage.js', 'd = Math.max(0, p.hp - 1)'));
  A('0으로 돌아갑니다', 'b.paidTurn: 차례의 첫 행동에서 0 (prepTurn 비교)', () => has('10-skills-engine.js', /paidTurn/));
  A('1에서 멈춤', 'dmgDot bleedFloor: d = max(0, p.hp - 1)', () => has('24-clock-damage.js', 'd = Math.max(0, p.hp - 1)'));
  A('한 칸마다 피해가 3% 늘어납니다', '[도달 불가] 분노 직업(berserker): outDmg rage × 0.03. BUILDS에 없다', DEAD('BUILDS.berserker === undefined'));
  A('칸당 피해 +3%', '[도달 불가] 분노 직업(berserker). BUILDS에 없다', DEAD('BUILDS.berserker === undefined'));
  A('상흔 스킬을 끼운 다른 직업은 10%', '[도달 불가] scarRate 0.2 · 0.10, 상흔 직업과 상흔 스킬(scarcut)이 v2에 없다', DEAD("BUILDS.scar === undefined && !Object.values(SKILLS2).some(a => a.some(s => s.id === 'scarcut'))"));
  A('상흔 베기는 절반을 태워 그 1.5배를 더하고', '[도달 불가] 상흔 직업이 없다. 코드 scarcut: use = scar × 0.5, 7 + use × 1.5, release scar × 0.8', DEAD("BUILDS.scar === undefined") );
  A('받은 피해의 20%가 상흔으로 쌓입니다', '[도달 불가] scarRate: 상흔 직업 0.2. 상흔 직업이 BUILDS에 없고 INFO2.scar가 먼저', () => has('10-skills-engine.js', "p.build === 'scar' ? 0.2") && E("BUILDS.scar === undefined && INFO2.scar !== undefined"));
  A('상흔 × 0.8', '[도달 불가] release: 상흔 × 0.8. 상흔 직업이 없다', () => has('32-player-action.js', 'outDmg(b, s * 0.8 * 1, {})') && E("BUILDS.scar === undefined"));
  A('하급은 1~6줄, 중급은 7~10줄, 상급은 11~13줄입니다', "SKILLS2.assassin 줄 범위 하급 1-6 · 중급 7-10 · 상급 11-13", () => { const o = E('(() => { const o = {}; for (const s of SKILLS2.assassin) { if (!s.tier || s.start) continue; (o[s.tier] = o[s.tier] || []).push(s.row); } return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [Math.min(...v), Math.max(...v)]])); })()'); return q(o['하급']) === '[1,6]' && q(o['중급']) === '[7,10]' && q(o['상급']) === '[11,13]'; });
  A('상급은 3챕터부터 열립니다', 'TREE_CH.상급 = 3', () => E('TREE_CH.상급') === 3);
  A('체력이 50% 많습니다', 'mkEnemy tough: hpMax × 1.5', () => has('20-battle-state.js', "(opt.tough ? 1.5 : 1)"));
  N('다음 1점:', '능력치 1점 단위 표기(statNext가 값을 계산한다)');
  // ───────── 옛 장비 스무 개의 문장(60 텍스트층, CH1_OLD + 풀에 없는 옛 장비) ─────────
  const RATIO = (expr, base, e) => near(E(expr), base, e == null ? 0.012 : e);
  const NOPOOL = k => E(`[1, 2, 3].every(c => !poolOf(c).includes(${q(k)}))`);
  A('무기 피해 −15%', "갈고리(hook): outDmg 무기 ×0.85", () => has('32-player-action.js', "p.eq.weapon === 'hook' && o.weapon) d *= 0.85"));
  A('최대 생명력 −10%', '판금(plate): calcHpMax ×0.9', () => ITEM_HP('plate', 0.9));
  A('흘리기 스태미나 +10', '증인의 부적(witness): dodgeCost +10', () => E('dodgeCost(mkPlayer("assassin", { amulet: "witness" })) - dodgeCost(mkPlayer("assassin", {}))') === 10);
  A('생명력 플라스크 회복 −10%', '역류의 성배(chalice): flaskHealFrac ×0.9', () => RATIO('flaskHealFrac(mkPlayer("novice", { flask: "chalice" })) / flaskHealFrac(mkPlayer("novice", {}))', 0.9));
  A('생명력 플라스크 회복 −25%', '끓는 플라스크(boilflask): ×0.75', () => RATIO('flaskHealFrac(mkPlayer("novice", { flask: "boilflask" })) / flaskHealFrac(mkPlayer("novice", {}))', 0.75));
  A('생명력 플라스크 회복 −20%', '피의 기름(bloodoil): ×0.8', () => has('20-battle-state.js', "p.eq.flask === 'bloodoil' ? 0.8 : 1"));
  A('공격 한 번의 직접 피해 +35%', '박동의 반지(pulse): outDmg ×1.35', () => has('32-player-action.js', "(p.eq.ring1 === 'pulse' || p.eq.ring2 === 'pulse')) d *= 1.35"));
  A('한 번에 50%, 합쳐 100%다', '쌍날 단검(twin): 기본 공격 d × 0.5 두 번', () => has('32-player-action.js', "hurtEnemy(b, tgt, d * 0.5, { single: 1, melee: melee1, label: '첫 날' })") && has('32-player-action.js', "hurtEnemy(b, tgt, d * 0.5, { single: 1, melee: melee1, label: '둘째 날' })"));
  A('강공격 피해 −20%', '쌍날 단검(twin): heavyBase ×0.8', () => RATIO('heavyBase(mkPlayer("novice", { weapon: "twin" })) / heavyBase(mkPlayer("novice", {}))', 0.8));
  A('강공격의 붕괴 +20.', "무거운 망치(maul): addBreak (maul ? 20 : 0)", () => has('32-player-action.js', "(p.eq.weapon === 'maul' ? 20 : 0)"));
  A('강공격 스태미나 +10', '무거운 망치(maul): heavyCost +10', () => E('heavyCost(mkPlayer("novice", { weapon: "maul" })) - heavyCost(mkPlayer("novice", {}))') === 10);
  A('피해 2를 되돌린다', "가시 갑옷(thorns): hurtEnemy(src, 2) 전열 적, 방어 중", () => has('24-clock-damage.js', "p.guard && p.eq.armor === 'thorns' && o.src && o.src.alive && !o.dot && o.src.row === 'front') hurtEnemy(b, o.src, 2"));
  A('최대 생명력 −5%', '가시 갑옷 · 망토 · 방패 문장: calcHpMax ×0.95', () => ITEM_HP('thorns', 0.95) && ITEM_HP('cloak', 0.95) && ITEM_HP('wardcrest', 0.95));
  A('흘리기로 줄이는 피해 +15%p(최대 90%)', '그림자 망토(cloak): parryRed +0.15, 상한 0.9', () => near(E('parryRed(mkPlayer("assassin", { armor: "cloak" })) - parryRed(mkPlayer("assassin", {}))'), 0.15) && has('20-battle-state.js', 'Math.min(0.9,'));
  A('생명력이 절반 아래면 주는 피해 +20%', '피의 서약(bloodpact): hp < 50% 이면 ×1.2', () => has('32-player-action.js', "p.eq.amulet === 'bloodpact' && p.hp < p.hpMax * 0.5) d *= 1.2"));
  A('플라스크와 스킬로 되찾는 생명력 −15%', '피의 서약(bloodpact): healMul ×0.85', () => RATIO('healMul(mkPlayer("novice", { amulet: "bloodpact" })) / healMul(mkPlayer("novice", {}))', 0.85));
  A('마나 +4', '[도달 불가] 은 성표(sigil): 풀에 없다. 코드는 마나 +4', () => NOPOOL('sigil') && has('24-clock-damage.js', 'u.mp + 4'));
  A('최대 마나 −15', '[도달 불가] 은 성표(sigil): 풀에 없고 calcMpMax −15', () => NOPOOL('sigil') && has('20-battle-state.js', "(p.eq.amulet === 'sigil' ? 15 : 0)"));
  A('강타를 맞으면 다음 공격 피해 +10%', '분노의 반지(fury): furyNext → outDmg ×1.1', () => has('24-clock-damage.js', 'p.furyNext = 1') && has('32-player-action.js', 'if (p.furyNext && !o.ctr) { d *= 1.1;'));
  A('받는 강타 피해 +10%', '분노의 반지(fury): hurtPlayer 강타 ×1.1', () => has('24-clock-damage.js', "if (o.charged && hasIt(p, 'fury')) d *= 1.1"));
  A('한 적 대상 공격 피해 +7%', '집중의 반지(focusring): ×1.07(단일) · ×0.7(광역)', () => has('24-clock-damage.js', 'd *= o.aoe ? 0.7 : 1.07'));
  A('광역 공격 피해 −30%', '집중의 반지(focusring): ×0.7(광역)', () => has('24-clock-damage.js', 'd *= o.aoe ? 0.7 : 1.07'));
  A('기본 공격이 맞을 때마다 중독 1을 건다', "독 반지(venomring): addPoison(tgt, 1, 1)", () => has('32-player-action.js', "hasIt(p, 'venomring')) addPoison(b, tgt, 1, 1)"));
  A('기본 공격 피해 −10%', '독 반지(venomring): basicBase ×0.9', () => RATIO('basicBase(mkPlayer("novice", { ring1: "venomring" })) / basicBase(mkPlayer("novice", {}))', 0.9));
  A('모든 적에게 화염 피해 5를 준다', '끓는 플라스크: outDmg(b, 5)', () => has('32-player-action.js', "outDmg(b, 5, {}), { aoe: 1, fire: 1, label: '끓는 플라스크' }"));
  A('근접 스킬로 때리면 붕괴 +20', '사슬 장갑(chaingl): chainTgt addBreak 20', () => has('32-player-action.js', 'addBreak(b, b.chainTgt, 20)'));
  A('최대 스태미나 −10', '사슬 장갑(chaingl): calcStMax −10', () => E('calcStMax(mkPlayer("novice", {})) - calcStMax(mkPlayer("novice", { gloves: "chaingl" }))') === 10);
  A('최대 스태미나 −20', '선봉의 깃발(vanguard): calcStMax −20', () => E('calcStMax(mkPlayer("novice", {})) - calcStMax(mkPlayer("novice", { amulet: "vanguard" }))') === 20);
  A('맞을 때마다 다음 공격 피해 +4%가 쌓인다(최대 +20%)', '분노 사슬(ragechain): rcN 최대 5 × 0.04', () => has('32-player-action.js', 'd *= 1 + 0.04 * p.rcN') && has('24-clock-damage.js', 'Math.min(5, (p.rcN || 0) + 1)'));
  A('방어로 줄이는 피해 50% → 40%', '분노 사슬: 방어 ×0.6(40%)', () => has('24-clock-damage.js', "p.eq.gloves === 'ragechain' ? 0.6 : 0.5"));
  A('같은 적을 세 번 이어 치면 그 적에게 취약 2를 건다', '[도달 불가] 사냥감의 표식(markamu): 풀에 없다. 코드는 3번째에 취약 2', () => NOPOOL('markamu') && has('24-clock-damage.js', 'if (b.p.mk.n >= 3)') && has('32-player-action.js', "addS(b, b.markTgt, 'vuln', 2)"));
  A('대상을 바꾼 첫 공격 피해 −10%', '[도달 불가] markamu: 코드 d *= 0.9', () => NOPOOL('markamu') && has('24-clock-damage.js', 'mk.id !== e.id && mk.n > 0) d *= 0.9'));
  A('직전과 다른 스킬을 쓰면 그 스킬 피해 +6%', '[도달 불가] 공명석(resostone): 풀에 없다. 코드 echoMul ×1.06', () => NOPOOL('resostone') && has('32-player-action.js', 'b.echoMul *= 1.06'));
  A('같은 스킬을 이어 쓰면 마나 +2', '[도달 불가] 공명석: 코드 skillCost +2', () => NOPOOL('resostone') && has('24-clock-damage.js', "hasIt(p, 'resostone') && id === p.lastSkillId ? 2 : 0"));
  A('보호막이 남아 있는 동안 받는 피해 −15%', '[도달 불가] 방패 문장(wardcrest): 풀에 없다. 코드 ×0.85', () => NOPOOL('wardcrest') && has('24-clock-damage.js', "p.ward > 0 && p.eq.armor === 'wardcrest') d *= 0.85"));
  A('중독된 적에게 주는 직접 피해 +15%', '[도달 불가] 독 주머니(vpouch): 풀에 없다. 코드 ×1.15', () => NOPOOL('vpouch') && has('24-clock-damage.js', "hasIt(b.p, 'vpouch')) d *= 1.15"));
  A('최대 마나 −10', '[도달 불가] 독 주머니: 코드 calcMpMax −10', () => NOPOOL('vpouch') && has('20-battle-state.js', "(p.eq.gloves === 'vpouch' ? 10 : 0)"));
  A('생명력으로 치르는 비용 −30%', '[도달 불가] 피의 기름(bloodoil): 풀에 없다. 코드 hpCostMul 0.7', () => NOPOOL('bloodoil') && has('24-clock-damage.js', "p.eq.flask === 'bloodoil' ? 0.7 : 1"));
  A('해로운 상태를 하나 지울 때마다 마나 +3', '[도달 불가] 묵주(rosary): 풀에 없다. 코드 마나 +3n', () => NOPOOL('rosary') && has('32-player-action.js', 'p.mp + 3 * n'));
  A('최대 생명력 −3%', '[도달 불가] 묵주(rosary): 코드 calcHpMax ×0.97', () => NOPOOL('rosary') && has('20-battle-state.js', "p.eq.amulet === 'rosary' ? 0.97 : 1"));
  A('상흔의 15%(최대 10)를 더한다', '[도달 불가] 흉터 부적(scarcharm): 풀에 없다. 코드 min(10, scar × 0.15)', () => NOPOOL('scarcharm') && has('24-clock-damage.js', 'Math.min(10, b.p.scar * 0.15)'));
  A('상흔 저장률 −5%p', '[도달 불가] 흉터 부적: 코드 scarRate r − 0.05', () => NOPOOL('scarcharm') && has('10-skills-engine.js', 'Math.max(0.05, r - 0.05)'));
  A('그 스킬의 피해 +4%(최대 세 번, +12%)', '메아리 반지(echo): echoN 최대 3 × 0.04 (v2에서는 풀에서 뺌)', () => has('32-player-action.js', 'Math.min(3, (p.echoN || 0) + 1)') && has('32-player-action.js', 'b.echoMul = 1 + 0.04 * p.echoN') && E('V2_OFF.includes("echo")'));
  A('전투가 시작되면 첫 공격이 빠른 행동이 되고, 그 공격의 붕괴 +20', '선봉의 깃발(vanguard): time ×0.5, vanguardTgt addBreak 20', () => has('32-player-action.js', 'time *= 0.5') && has('32-player-action.js', 'addBreak(b, b.vanguardTgt, 20)'));
  A('독 격발 · 상흔 방출 마나 +2', '잔향의 매듭(knot): skillCost +2 (v2에서는 풀에서 뺌)', () => has('24-clock-damage.js', "(id === 'burst' || id === 'release') ? 2 : 0") && E('V2_OFF.includes("knot")'));
  A('강공격 비용을 생명력 4%로 치른다', '피의 장부(ledger): ledgerCost = hpMax × 0.04', () => has('24-clock-damage.js', 'p.hpMax * 0.04 * hpCostMul(p)'));

  // ───────── 늪의 어머니 · 나락의 나무 · 시험 상황 ─────────
  A('내게 중독을 2씩 건다', '늪의 어머니: addPoison(p, PSN.swampN) PSN.swampN = 2, 방어 중에는 안 건다', () => E('PSN.swampN') === 2 && has('24-clock-damage.js', 'if (!p.guard) { addPoison(b, p, PSN.swampN); }'));
  A('내 중독이 10에 닿으면 알이 깨어 하수인 2기가 나온다', '늪의 어머니: poison ≥ 10, spawn 2', () => has('24-clock-damage.js', "if (st(p, 'poison') >= 10 && !b.hatchLock)") && has('24-clock-damage.js', "for (let i = 0; i < 2; i++) spawn(b, 'minion')"));
  A('중독이 10에 닿으면 알이 깨 하수인 둘', '늪의 어머니: poison ≥ 10, spawn 2', () => has('24-clock-damage.js', "if (st(p, 'poison') >= 10 && !b.hatchLock)") && has('24-clock-damage.js', "for (let i = 0; i < 2; i++) spawn(b, 'minion')"));
  A('지운 1마다 어머니가 최대 체력의 1%를 잃는다', '플라스크로 지운 수 n × hpMax × 0.01 (역류)', () => has('32-player-action.js', "boss.hpMax * 0.01 * n, { dot: 1, label: '역류' }"));
  A('체력이 70% 아래로 떨어지면 나락의 거울이 열려', 'bossPhase: 늪의 어머니 f > 0.7 이면 1페이즈', () => has('30-enemy-ai.js', 'f > 0.7 ? 1 : f > 0.35 ? 2 : 3'));
  A('체력이 70% 아래로 떨어지면 나락의 거울이 열린다', 'bossPhase: 늪의 어머니 f > 0.7 이면 1페이즈', () => has('30-enemy-ai.js', 'f > 0.7 ? 1 : f > 0.35 ? 2 : 3'));
  A('뿌리 셋이면 라운드마다 2.5%, 봄에는 두 배다', '나락의 나무: hpMax × 0.025 × 뿌리/3 × (봄 2)', () => has('24-clock-damage.js', 'boss.hpMax * 0.025 * roots / 3 * (b.season === 0 ? 2 : 1)'));
  A('계절은 4라운드마다 바뀐다', '나락의 나무: T % 4 === 0', () => has('24-clock-damage.js', 'if (T % 4 === 0) { b.season'));
  const S = i => E(`SCEN[${i}]`);
  A('돌격병이 강타를 모으고 있고 중독이 4 쌓여 있다', 'SCEN[0]: 돌격병 intent heavy, poison 4', () => S(0).en[0][2].poison === 4 && S(0).en[0][2].intent === 'heavy');
  A('나는 취약하고, 상흔이 30 쌓여 있다', 'SCEN[0].p: scar 30, vuln', () => S(0).p.scar === 30 && !!S(0).p.s.vuln);
  A('둘 다 중독이 3이다', 'SCEN[1]: 자폭병 둘 poison 3', () => S(1).en[0][2].poison === 3 && S(1).en[1][2].poison === 3);
  A('마나는 60%, 나는 출혈 중이고 상흔이 20 쌓여 있다', 'SCEN[2].p: mp 0.6, bleed, scar 20', () => S(2).p.mp === 0.6 && !!S(2).p.s.bleed && S(2).p.scar === 20);
  A('붕괴 게이지가 70% 찼고', 'SCEN[3]: brk 0.7', () => S(3).en[0][2].brk === 0.7);
  A('중독은 5, 내 스태미나는 45', 'SCEN[3]: poison 5, st 45', () => S(3).en[0][2].poison === 5 && S(3).p.st === 45);
  A('늪의 어머니는 체력이 40% 남았다', 'SCEN[4]: bossHp 0.4', () => S(4).bossHp === 0.4 && S(4).boss === 'mother');
  A('내 중독은 8, 하수인 하나가 곁을 지킨다', 'SCEN[4]: p.poison 8, 하수인 1', () => S(4).p.poison === 8 && S(4).en.length === 1);
  for (let i = 1; i <= 8; i++) N('방 ' + i + ' · ', '방 이름(장면 이름)');

  // ───────── 설명 창 나머지 (54 · 60) ─────────
  A('▶ 공격 한 번이 기 1을 써서 피해 +25%입니다', '수도승 강화(기): outDmg ×1.25, 공격마다 1 감소(empUsed)', () => has('32-player-action.js', 'd *= 1.25; if (b.cur) b.empUsed = 1') && has('32-player-action.js', "p.build === 'monk' ? b.empUsed : b.atkUsed) kwDec(p, 'empower')"));
  A('내 출혈은 내 행동마다 들어가고 1 줍니다', 'finishPlayer: kwBleed(b, p) 한 번에 kwDec 1', () => has('32-player-action.js', 'kwBleed(b, p)') && has('20-battle-state.js', "kwDec(u, 'bleed')"));
  A('10칸이 차면 격노: 잠시 피해 +40%, 속도 +20%, 받는 피해 +15%', '[도달 불가] 분노 직업(berserker)이 BUILDS에 없다. 이 글은 INFO2.rage가 덮는다', DEAD('BUILDS.berserker === undefined && INFO2.rage !== undefined'));
  A('격노가 끝나면 0부터 다시', '[도달 불가] 분노 직업(berserker)이 BUILDS에 없다', DEAD('BUILDS.berserker === undefined && INFO2.rage !== undefined'));
  A('중독이 5중첩 이상 쌓인 적을 기본 공격하면 중첩 × 4 피해로', '[도달 불가] 설명 키 explode_old를 쓰는 곳이 없다', () => !['42-chrome-map.js', '52-battle-hud.js', '53-battle-parts.js', '68-ui-services.js', '80-events.js'].some(f => has(f, 'explode_old')));
  A('뿌리 수에 비례, 봄에는 2배', '[덮어씀] INFO2.regen이 먼저. 코드도 봄 ×2', () => E('INFO2.regen !== undefined') && has('24-clock-damage.js', '(b.season === 0 ? 2 : 1)'));
  A('고른 적의 다음 단일 공격 피해를 60% 줄입니다', '[덮어씀] INFO2.dodgeon · 동적 설명이 먼저. 기본 60% = parryRed(novice)', () => Math.round(E('parryRed(mkPlayer("novice", {}))') * 100) === 60 && E('INFO2.dodgeon !== undefined'));
  A('고른 적의 다음 공격 피해가 60% 줄어듭니다', '[덮어씀] 전투 중에는 동적 설명(parryRed)이 먼저. 기본 60% = parryRed(novice)', () => Math.round(E('parryRed(mkPlayer("novice", {}))') * 100) === 60);
  A('/100.', '열기 100: ch3Tick b.heat >= 100', () => has('14-chapter-bodies.js', 'if (b.heat >= 100) { if (b.heatWarn != null'));
  A('열기가 100 이상인 채 라운드가 끝나면', '열기 100: ch3Tick b.heat >= 100', () => has('14-chapter-bodies.js', 'if (b.heat >= 100) { if (b.heatWarn != null'));
  A('그 전에 열기를 100 아래로 내리면 불지 않습니다', '열기 100: ch3Tick b.heat >= 100', () => has('14-chapter-bodies.js', 'if (b.heat >= 100) { if (b.heatWarn != null'));
  A('화상 수만큼 피해가 더해지고 1 줄어듭니다', 'kwTaken: ignite n 더하고 kwDec(ignite) 1', () => has('20-battle-state.js', "const n = stk(u, 'ignite'); kwDec(u, 'ignite')"));
  A('그 숫자만큼 피해를 주고 1 줄어듭니다', '중독: tickOnce stacks = n − 1 / 출혈: kwBleed kwDec 1', () => has('24-clock-damage.js', 'u.s.poison.stacks = n - 1') && has('20-battle-state.js', "kwDec(u, 'bleed')"));
  A('한 적만 치는 공격으로 같은 적을 연달아 맞히면 한 겹씩 쌓입니다(최대 3', 'HUNT.focusMax = 3', () => E('HUNT.focusMax') === 3);
  A('3겹인 적은 몸 낮추기와 버티기가 통하지 않습니다', 'HUNT.focusMax = 3', () => E('HUNT.focusMax') === 3);
  A('다른 적을 치면 그 적에게 1겹부터', '추적: 다른 적을 치면 n 1부터', () => has('24-clock-damage.js', 'pre = f && f.id === e.id ? f.n : 0; p.focus = { id: e.id, n: Math.min(HUNT.focusMax, pre + 1) }'));
  A('추적을 더하는 효과로는 2겹까지만 오릅니다', 'HUNT.addMax = 2', () => E('HUNT.addMax') === 2);
  // ───────── 전장 HUD (52) · 전투 부품 (53) · 직접 편집 (57) ─────────
  A('열기 § /100', '열기 상한 100(ch3Tick, b.heat >= 100)', () => has('14-chapter-bodies.js', 'if (b.heat >= 100) { if (b.heatWarn != null'));
  A('해로운 것만 3개', '상태 칩: stsHtml 플레이어 slice(0, 3)', () => has('53-battle-parts.js', 'slice(0, inCard && opt.mode === \'bad\' ? 2 : 3)'));
  A('3개까지', '상태 칩: stsHtml slice(0, 3)', () => has('53-battle-parts.js', 'slice(0, inCard && opt.mode === \'bad\' ? 2 : 3)'));
  A('"×2" 같은 행동 횟수', '두 번 움직이는 적 RND_TWICE = 1.5(속도 1.5 이상은 한 번 더)', () => E('RND_TWICE') === 1.5);
  A('최대 10행동 중', '시험 상황: pActs >= 10 이면 끝(70-act-end-screens)', () => has('70-act-end-screens.js', 'if (b.pActs >= 10 && !b.over) b.over = \'open\''));
  A('(10이면 부화)', '늪의 어머니: poison ≥ 10 부화', () => has('24-clock-damage.js', "if (st(p, 'poison') >= 10 && !b.hatchLock)"));
  A('뿌리 §/3', '나락의 나무: 뿌리 수/3 (24-clock-damage roots / 3)', () => has('24-clock-damage.js', 'roots / 3'));
  A('신속: 라운드마다 가속 1', 'startRound: 신속 적에게 haste stacks 1', () => has('34-rounds-setup.js', 'e.s.haste = { stacks: 1,'));
  N('칼: 출혈 5', '코드 주석의 표시 예시(화면 문장은 템플릿으로 만든다)');
  A('세는 숫자는 모두 5까지입니다', 'CONF.cap = 5', () => E('CONF.cap') === 5);
  A('적이 건 상태를 지운 숫자 2마다 보호 1(올림, 한 번에 3까지)을 얻습니다', 'CONF.per = 2 · CONF.protMax = 3 · want = min(protMax, ceil(e / per))', () => E('CONF.per') === 2 && E('CONF.protMax') === 3 && has('12-state-class-rules.js', 'Math.min(CONF.protMax, Math.ceil(e / CONF.per))'));
  A('보호막 없음: 태우기 피해 0', 'skillHint: 보호막이 0이면 태우기 피해 0', () => has('53-battle-parts.js', "take > 0 ? '보호막 ' + Math.round(take) + ' 태움 → 피해 ' + r1(take * wb.mul) : '보호막 없음: 태우기 피해 0'"));
  N('내가 적에게 9.4 피해', '편집 화면 미리 보기용 가짜 기록 줄(예시 값)');
  N('적이 나에게 6.2 피해', '편집 화면 미리 보기용 가짜 기록 줄(예시 값)');

  // ───────── 스킬 트리 화면 (72) ─────────
  A('레벨마다 +1', '트리 포인트 = 만들 때 1 + 레벨마다 1 (treeFix: pts + lv − 1), Lv10 = 10점 · Lv15 = 15점', () => has('22-class-tree-rules.js', '((T && T.pts) || 1) - ((run.lv || 1) - 1)') && E('TREE2.assassin.pts') === 1);
  A('10T마다 더 거세집니다', 'ENRAGE.step = 10 (광폭화 뒤 10마다 한 단계)', () => E('ENRAGE.step') === 10);

  // ───────── 상점 (46) ─────────
  A('살 때 값의 25%를 받습니다', 'sellOf = floor(priceOf × 0.25) (전설만 LEG_SELL 150 고정, 전설은 팔지 않음)', () => has('46-screens-shop.js', 'Math.floor(priceOf(it.g, it.ch) * 0.25)'));
  A('값은 레벨 × 10골드입니다', 'respec: cost = lv × 10 (80-events)', () => has('80-events.js', 'const cost = (run.lv || 1) * 10'));
  A('챕터 1층으로 내려갑니다', 'enterChapter → dgInit: run.room = 1', () => has('66-dungeon-flow.js', 'run.room = 1; run.cur = null; run.path'));

  // ───────── 계정 · 캐릭터 만들기 (44) ─────────
  A('0.6a.2 나락의 유산', '타이틀 판 이름 0.6a.2 = CHANGE_VER 앞부분', () => E('CHANGE_VER').startsWith('0.6a.2'));
  A('(12자까지)', '이름 12자: cnok slice(0, 12), maxlength=12', () => has('80-events.js', ".slice(0, 12)") && has('44-screens-account.js', 'maxlength="12"'));
  N('0.6a.2 스킬 시험판 기록만', '판 이름(0.6a.2 시험판 · 0.6a 지인 주소 · B0.5), 규칙이 아님');
  N('0.6 캐릭터', '판 이름(0.6), 규칙이 아님');
  N('아직 0.6 판이 없습니다', '판 이름(0.6), 규칙이 아님');
  N('지인 주소(0.6a) 기록은', '판 이름(0.6a 지인 주소), 규칙이 아님');
  A('계정 목표', '1 · 2 · 3챕터 보스 = CHAPTERS 1~3', () => E('Object.keys(CHAPTERS).map(Number).join(",")') === '1,2,3');

  // ───────── 수련장 (48 · tutorial.js) ─────────
  N('5분 남짓 걸리고', '걸리는 시간 어림(규칙 아님)');
  A('칠 때마다 적 카드의 생명력 막대 아래 얇은 붕괴 게이지가 10 찹니다', '수련장 기본 공격 붕괴 +10', BRK10);
  A('흘리기: 고른 적의 다음 공격 피해를 60% 줄입니다', '수련장 견습생 parryRed = 60% (민첩 0)', () => Math.round(E('parryRed(mkPlayer("novice", {}))') * 100) === 60);
  A('강타를 흘리면 그 적의 붕괴 게이지도 25 찹니다', '강타를 흘리면 addBreak(src, 25)', () => has('24-clock-damage.js', "if (o.charged) { addBreak(b, o.src, 25)"));
  A('강공격: 스태미나 40으로 피해 150%, 붕괴 게이지 35', '견습생: heavyCost 40 · heavyBase/wpnDmg 150% · 붕괴 35 + 힘 0', () => E('heavyCost(mkPlayer("novice", {}))') === 40 && E('Math.round(heavyBase(mkPlayer("novice", {})) / wpnDmg(mkPlayer("novice", {})) * 100)') === 150 && E('stat(mkPlayer("novice", {}), "str")') === 0 && has('32-player-action.js', /\? 30 : 35\) \+ 5 \* Math\.floor/));
  A('사수의 예고에 "출혈 2"가 보이면', 'EKW.archerBleed = 2', () => E('EKW.archerBleed') === 2);
  A('막음 2가 다음 해로운 상태 두 번을 튕겨 냅니다', '정화 플라스크: 막음 2 (2 + blockAdd), 상태마다 1 소모', () => has('32-player-action.js', 'const nb = 2 + fxAdd(p, \'blockAdd\', p)') && E('KW.block') >= 2);
  A('정해진 때가 오면 효과가 나고 1 줄어듭니다', 'kwDec는 기본 1씩 줄인다', () => has('20-battle-state.js', 'x.stacks -= (n || 1)'));
  A('쿨타임 5턴', '시작 스킬 쿨타임 5턴(암살자 a_vital · a_slip)', () => E('SKILLS2.assassin.filter(s => s.start).every(s => s.cd === 5)'));

  // ───────── 설문 · 결과 보기 (70 · 74) ─────────
  A('1 지루했다', '재미 척도 fun = 1~5 (설문 척도 표)', () => has('70-act-end-screens.js', "fun: { 1: '1 지루했다', 2: '2', 3: '3 보통', 4: '4', 5: '5 아주 재미있었다' }"));
  A('3 보통', '재미 척도 fun = 1~5 (설문 척도 표)', () => has('70-act-end-screens.js', "fun: { 1: '1 지루했다', 2: '2', 3: '3 보통', 4: '4', 5: '5 아주 재미있었다' }"));
  A('5 아주 재미있었다', '재미 척도 fun = 1~5 (설문 척도 표)', () => has('70-act-end-screens.js', "fun: { 1: '1 지루했다', 2: '2', 3: '3 보통', 4: '4', 5: '5 아주 재미있었다' }"));
  N('1~2분이면 끝납니다', '걸리는 시간 어림(규칙 아님)');
  N('1회차', '회차 이름(라벨)');
  N('2회차', '회차 이름(라벨)');
  N('테스터 §명 질문 5', '결과 보기의 시험 목표 문장(질문 번호와 목표치. 게임 규칙이 아님)');
  N('목표: 50% 이상', '결과 보기의 시험 목표치(규칙이 아님)');
  N('질문 8 방식 차이', '결과 보기의 질문 번호(라벨)');
  N('목표: 5명 중 4명 이상', '결과 보기의 시험 목표치(규칙이 아님)');
  A('다시 하고 싶음 평균', '재미 척도 fun = 1~5 (설문 척도 표)', () => has('70-act-end-screens.js', "fun: { 1: '1 지루했다', 2: '2', 3: '3 보통', 4: '4', 5: '5 아주 재미있었다' }"));
  N('승리/시도', '결과 보기 열 이름(라벨)');
  N('가장 많이 쓰러진 방 (질문 2)', '결과 보기 열 이름(라벨)');
  N('강타 예고 때 가장 많이 한 행동', '결과 보기 열 이름(라벨)');
  N('붕괴 성공 (질문 9)', '결과 보기 열 이름(라벨)');
  N('방 5 입장 플라스크 평균', '결과 보기 열 이름(라벨, 방 5)');
  A('재미 평균 (1~5)', '재미 척도 fun = 1~5 (설문 척도 표)', () => has('70-act-end-screens.js', "fun: { 1: '1 지루했다', 2: '2', 3: '3 보통', 4: '4', 5: '5 아주 재미있었다' }"));
  N('고민이 있었다 (질문 7)', '결과 보기 열 이름(라벨)');
  N('방 5 선택 아이템', '결과 보기 열 이름(라벨, 방 5)');
  A('많이 쓴 행동 3개', '결과 보기 상위 3개: slice(0, 3)', () => has('74-results-viewer.js', '.slice(0, 3)'));
  N('방 5: 고른 아이템별 행동', '결과 보기 제목(라벨, 방 5)');
  N('고정 상황 의사결정 (질문 1)', '결과 보기 제목(라벨)');
  A('두 축 이상 다른 상황', '고정 상황 5개(SCEN.length), 두 축 이상(diff >= 2), 목표 3은 시험 목표치', () => E('SCEN.length') === 5 && has('74-results-viewer.js', 'if (diff >= 2) pass++'));

  // ───────── 설정 (76) ─────────
  A('숫자 키 1부터 9까지로 행동 버튼을 누릅니다', 'battle HUD: 숫자 키 1~9 (kn <= 9)', () => has('52-battle-hud.js', 'kn <= 9 && G.data.numKeys !== false'));
  A('나락의 유산 · 0.6a.2 스킬 시험판', '판 이름(0.6a.2) = CHANGE_VER 앞부분', () => E('CHANGE_VER').startsWith('0.6a.2'));

  // ───────── 따옴표 글 읽기가 놓치는 곳(템플릿 속 템플릿 · 삼항 안의 글)과 만들어 내는 글 ─────────
  // 소스를 직접 읽어 따로 적은 문장이다. 화면에 닿는 글만 담았다(주석 제외).
  const extra = [
    { id: '52-ba:155', text: '2페이즈부터 거울' },
    { id: '48-tu:34', text: '이 장면에서는 쓰러지지 않습니다(생명력 1에서 버팁니다).' },
    { id: '72-sk:56', text: '되돌리기 · 포인트 +1' },
    { id: '72-sk:57', text: '열기 · 포인트 1' },
    { id: '72-sk:39', text: '이 갈래 스킬 대기 −1' },
    { id: '72-sk:139', text: '1점마다 규칙이 하나씩 바뀝니다.' },
    { id: '72-sk:141', text: '능력치 1점 빼기 · 1점 더하기' },
    { id: '80-ev:106', text: '칸을 되돌렸습니다. 포인트 +1' },
    // 화면 편집 · 설정의 선택지는 상수에서 만들어 낸다. 만들어 낸 모양 그대로 적는다
    { id: '56-hu:88', text: '전투 화면 편집 크기 ' + E('HUD_SIZES').map(v => v + '%').join(' ') },
    { id: '76-so:46', text: '글자 크기 ' + E('FS_OPTS').map(v => Math.round(v * 100) + '%').join(' ') },
  ];
  texts['ui-extra'] = extra.map(x => x.text); api.source('ui-extra', extra);
  A('2페이즈부터 거울', '늪의 어머니: 2페이즈는 체력 70% 아래(bossPhase)', () => has('30-enemy-ai.js', 'f > 0.7 ? 1 : f > 0.35 ? 2 : 3') && has('24-clock-damage.js', "boss.boss === 'mother'"));
  A('생명력 1에서 버팁니다', "수련장: ctx.safe 이면 hp를 1로 둔다(checkEnd)", () => has('24-clock-damage.js', 'if (b.p.hp <= 0 && b.ctx.safe) { b.p.hp = 1;'));
  A('포인트 +1', 'treeRefund: t.pts++', () => has('22-class-tree-rules.js', 't.pts++; t.spent[s.b]'));
  A('열기 · 포인트 1', 'treeUnlock: run.tree.pts--', () => has('22-class-tree-rules.js', 'run.tree.pts--; run.tree.open.push(id)'));
  A('이 갈래 스킬 대기 −1', '[도달 불가] TREE2.*.haste(갈래 규칙)가 모든 직업에서 비어 있다', DEAD('Object.values(TREE2).every(t => !Object.keys(t.haste || {}).length)'));
  A('1점마다 규칙이 하나씩 바뀝니다', '능력치 1점마다 statNext가 바뀌는 값을 돌려준다(다섯 능력치, 0~14점)', () => E('STAT_KEYS.every(k => { let ok = true; for (let n = 0; n < 15; n++) { const p0 = mkPlayer("assassin", {}); p0.stat[k] = n; if (!statNext(p0, k)) ok = false; } return ok; })'));
  A('능력치 1점 빼기', "stat+ · stat-: 한 번에 al[k]를 1씩 바꾼다", () => has('80-events.js', 'if (a === \'stat+\' && left > 0) al[k]++; if (a === \'stat-\' && al[k] > 0) al[k]--;'));
  A('전투 화면 편집 크기 50% 75% 100% 150% 200%', 'HUD_SIZES = [50, 75, 100, 150, 200], 기본 100', () => q(E('HUD_SIZES')) === '[50,75,100,150,200]' && has('56-hud-editor.js', ': 100); });'));
  A('글자 크기 90% 100% 115% 130%', 'FS_OPTS = [0.9, 1, 1.15, 1.3] (도움말의 90%부터 130%까지와 같다)', () => q(E('FS_OPTS')) === '[0.9,1,1.15,1.3]');

  if (MISS.length) throw new Error('helpcheck-ui: 찾을글이 어느 문장에도 없다: ' + MISS.join(' | '));
};
