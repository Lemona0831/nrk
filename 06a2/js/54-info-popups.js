'use strict';
/* ---------- 설명 창 내용 ---------- */
const SDESC = {
  trap: '발밑의 덫. 다음에 움직이면 덫을 밟아 피해와 붕괴를 입는다.',
  rift: '시간 균열. 정해진 라운드가 지나면 터져 큰 피해와 붕괴를 준다.',
  echo: '메아리. 곧 같은 광역 피해가 한 번 더 울린다.',
  plague: '역병. 중첩마다 라운드당 피해 1. 쓰러지면 남은 적 모두에게 약화와 역병이 옮는다.',
  smite: '단죄. 내가 생명력을 회복하면 회복량의 60%만큼 피해를 입는다.',
  bond: '피의 연결. 내가 받는 직접 피해의 절반을 이 적도 받는다.',
  brand: '수도원장이 읽은 죄. 쌓일수록 수도원장의 강타가 더 아프다. 최대 3.',
  poison: '하나의 수치. 라운드가 끝날 때마다 그 수치만큼 피해를 준 뒤 1 줄어듭니다. 걸 때마다 1씩 오르고 상한은 없습니다.', bleed: '라운드마다 피해 2, 그리고 행동할 때마다 한 번 더 피해 2.', ignite: '라운드마다 화염 피해 2.',
  chill: '둔화. 라운드의 맨 뒤에서 움직입니다.', weak: '주는 피해 -25%.', vuln: '받는 피해 +25%.', protect: '받는 피해 -20%.',
  rage: '격노: 주는 피해 +40%, 속도 +20%, 받는 피해 +15%.', broken: '붕괴: 받는 피해 +30%. 다음 행동을 잃습니다.',
};
/* 주문직의 기본 공격·강공격은 캔트립·집중 주문이다 */
function actInfo(p, id) {
  if (isCaster(p) && isV2(p) && id === 'basic') return CANTRIP[p.build] + '. 비용 없이 원거리 주문을 쏜다. 피해는 무기 피해의 ' + Math.round(((BUILDS[p.build] || {}).wpnMul || 1) * 100) + '%. 후열에 닿고 방패병에게 막히지 않는다. 붕괴 게이지 +10. 스태미나는 채우지 않는다.'; // 원소술사 (10월 7일)
  if (isCaster(p) && isV2(p) && id === 'heavy') return '집중 주문. 스태미나 ' + heavyCost(p) + '. 원거리, 무기 피해의 ' + Math.round(((BUILDS[p.build] || {}).wpnMul || 1) * HEAVY_V2 * 100) + '%, 붕괴 게이지 +' + (35 + 5 * Math.floor(stat(p, 'str') / 10) + (p.eq.weapon === 'maul' ? 20 : 0)) + '. 후열에 닿는다. 느린 행동이라 빠른 칸과 주 행동을 함께 쓴다.';
  if (isCaster(p) && id === 'basic') return CANTRIP[p.build] + '. 비용 없이 원거리 주문을 쏜다. 피해는 무기 피해의 90%. 후열에 닿고 방패병에게 막히지 않는다. 붕괴 게이지 +10. 스태미나는 채우지 않는다.';
  if (isCaster(p) && id === 'heavy') return '집중 주문. 스태미나 40. 원거리, 무기 피해의 160%, 붕괴 게이지 +30. 느린 행동이라 빠른 칸과 주 행동을 함께 쓴다.';
  if (isV2(p) && AINFO2[id]) return AINFO2[id](p);
  return AINFO[id] || '';
}
/* 0.6a.2 직업의 공용 행동 설명: 엔진 값에서 바로 만든다 (10월 3일: 0.6a 문장이 남아 강공격 180%, 흘리기 60%, 플라스크가 지운다고 나왔다) */
const AINFO2 = {
  heavy: p => '스태미나 ' + heavyCost(p) + '. 무기 피해의 ' + Math.round(heavyBase(p) / wpnDmg(p) * 100) + '%, 붕괴 게이지 +' + (35 + 5 * Math.floor(stat(p, 'str') / 10) + (p.eq.weapon === 'maul' ? 20 : 0)) + '. 느린 행동이라 빠른 칸과 주 행동을 함께 쓴다.',
  dodge: p => '스태미나 ' + dodgeCost(p) + '. 고른 적의 다음 공격 피해를 ' + Math.round(parryRed(p) * 100) + '% 줄인다. 그 공격이 강타였다면 그 적의 붕괴 게이지 +25. 광역 공격과 지속 피해는 흘리지 못한다. 강적·보스의 공격은 ' + Math.round(PARRY_BIG * 100) + '%p 덜 줄인다. 내 다음 차례까지 유효하다.',
  flaskL: p => '생명력을 ' + Math.round(flaskHealFrac(p) * healMul(p) * 100) + '% 채운다. 걸린 상태는 지우지 않는다. 빠른 행동이라 마신 뒤에도 주 행동을 한다.',
  flaskM: p => '마시면 막음 ' + Math.min(KW.block, 2 + fxAdd(p, 'blockAdd', p)) + ': 다음에 걸리려는 해로운 상태를 그만큼 튕겨 낸다. 이미 걸린 상태는 지우지 않는다. 빠른 행동이다.',
  flaskS: p => '스태미나를 ' + Math.round(STAM_FLASK * fxVal(p, 'stamMul', 1, (a, v) => a * v)) + ' 채우고 탈진을 푼다. 빠른 행동이라 마신 뒤에도 주 행동을 한다.',
};
const AINFO = {
  basic: '비용 없이 무기로 친다. 피해는 무기 피해. 붕괴 게이지 +10. 스태미나는 채우지 않는다.',
  heavy: '스태미나 40. 피해 180%, 붕괴 게이지 +35. 느린 행동이라 빠른 칸과 주 행동을 함께 쓴다.',
  guard: '스태미나 20. 내 다음 차례까지 받는 피해가 절반이 된다. 그동안 공격하지 않는다.',
  dodge: '스태미나 30. 적 하나를 골라(적 카드 선택, 없으면 강타 예고한 적) 그 적의 다음 단일 공격 피해를 60% 줄인다. 강타였다면 그 적의 붕괴 게이지 +25. 내 다음 차례까지 유효. 광역·지속 피해는 흘리지 못한다.',
  flaskL: '충전 1. 생명력 30% 회복 + 중독·출혈·점화·냉각 해제. 빠른 행동이라 마신 뒤에도 주 행동을 한다.',
  flaskM: '충전 1. 마나 40% 회복 + 약화·취약 해제. 빠른 행동.',
  flee: '성공하면 이 방을 떠나고 전리품을 잃는다. 실패하면 느린 행동이 된다. 보스전에서는 못 쓴다.',
};
const RINFO = {
  bruiser: '돌격병 · 전열. 공격하다가 가끔 강타를 충전한다. 충전 다음 행동에 3배 피해 + 취약.',
  shield: '방패병 · 전열. 다른 적을 노린 근접 공격을 대신 맞는다(원거리·광역·지속 피해는 제외). 서 있는 동안 후열이 받는 광역 피해는 절반, 옆 전열 동료는 −40%(방패벽), 자신도 광역 피해 −25%. 붕괴시키면 잠시 막지 못한다.',
  archer: '사수 · 후열. 약간 빠르다. 겨눈 한 발 두 번에 한 번 출혈을 건다.',
  healer: '사제 · 후열. 생명력이 40% 아래인 동료를 25% 치유하고, 아니면 축복(다음 공격 +25%)을 건다.',
  thief: '도둑 · 전열. 몸을 낮추고, 훔치고, 달아난다. 잡으면 되찾는다.',
  darkmage: '암흑술사 · 후열. 저주(약화)와 어둠 화살을 번갈아 쓴다.',
  summoner: '소환사 · 후열. 소환 → 저주(약화) → 공격을 되풀이한다. 소환은 하수인 1기(최대 3기).',
  bomber: '자폭병 · 전열. 점화를 준비한 다음 행동에 폭발: 광역 피해 + 약화, 그리고 사라진다.',
  pyre: '영창자 · 후열. 화형 영창을 시작하고, 다음 행동에 화형(큰 피해 + 화상)을 내린다. 영창 중 피해가 쌓이거나 무너지면 끊긴다.',
  minion: '하수인 · 전열. 약하지만 수가 많다.',
  root: '뿌리 · 후열. 살아 있는 동안 수호목이 체력을 회복한다. 행동하지 않는다.',
};
function infoHtml(key) {
  const b = G.b; const parts = key.split(':');
  const H = (t, body) => `<b class="pt">${esc(t)}</b>${body}`;
  const P = s => `<p>${esc(s)}</p>`;
  if (key === 'bar:st' && b) { const p = b.p; return H('스태미나', P('지금 강공격 ' + heavyCost(p) + ', 방어 ' + guardCost(p) + ', 흘리기 ' + dodgeCost(p) + '이 듭니다. 라운드가 끝날 때마다 10씩 차고, 스태미나 플라스크로 60을 채웁니다. 기본 공격은 스태미나를 채우지 않습니다. 0이 되면 탈진합니다.')); } /* 10월 7일: 직업마다 다른 흘리기 비용을 그대로 */
  if (parts[0] === 'tn' && G.run && G.run.tree) {
    const s = SK2[parts[1]]; if (!s) return ''; const vis = treeVis(G.run, s.id);
    if (vis === 'hidden') return H('?', P('아직 보이지 않는 칸입니다. 이어진 앞 칸을 열면 드러납니다.'));
    if (vis === 'name') return H(s.n, P(s.b + ' · ' + s.tier + '. 이어진 앞 칸을 열면 자세히 드러납니다.'));
    const open = s.start || G.run.tree.open.includes(s.id); const why = open ? null : treeWhy(G.run, s.id);
    return H(s.n, P((s.start ? '시작 스킬 · 늘 끼움' : s.b + ' · ' + s.tier + (open ? ' · 열림' : '')) + '. ' + skHead(s)) + P(skBody(s)) + cfKwHtml(s) + (why ? `<p class="no">${esc(why)}</p>` : ''));
  }
  if (parts[0] === 'act' && b) {
    const a = actionList(b).find(x => x.id === parts[1]); if (!a) return '';
    const s = skillMap(b.p.build)[a.id];
    let body = (a.v2 ? P(skHead(a.s)) + P(skBody(a.s)) + cfKwHtml(a.s) + (a.wait > 0 && !a.s.once ? P('쿨타임 ' + a.wait + '턴 남음' + (a.ok && a.pull ? '. 지금 누르면 피로 당겨 바로 씁니다. 내는 생명력 ' + a.blood : '')) : P('사용 가능')) : P(a.id === 'sig' ? '직업 기술. ' + (SIG[b.p.build].cd ? SIG[b.p.build].cd + '차례에 한 번. ' : '') + SIG[b.p.build].d : (s ? resLabel(s, a.mana) + '. ' + s.d : actInfo(b.p, a.id)))) + (a.v2 ? '' : P('빠르기: ' + speedWord(a.time)));
    if (a.id !== 'flee') body += `<p class="pv">${esc(previewText(b, a.time))}</p>` + P('예상 수치' + '는 내 행동의 즉시 결과입니다. 이후 적 차례와 라운드 끝 피해는 포함하지 않습니다.');
    if (a.id === 'dodge') {
      const sel = G.sel ? b.en.find(e => e.id === G.sel && e.alive && e.role !== 'root') : null; const dt = sel || pickDodge(b);
      if (dt) { const moves = previewAfter(b, 1).some(x => x.e === dt); body += moves ? `<p>흘릴 적: <b>${esc(dt.n)}</b> (${esc(intentText(b, dt).t)})</p>` : `<p class="no">${esc(dt.n)}은(는) 내 다음 차례 전에 움직이지 않아 흘리기가 헛됩니다.</p>`; }
    }
    const tg = G.sel ? b.en.find(e => e.id === G.sel && e.alive) : null;
    if (!a.ok) body += `<p class="no">지금은 쓸 수 없음: ${a.why || (a.id === 'heavy' || a.id === 'guard' || a.id === 'dodge' ? '스태미나 부족' : a.skill ? '마나 부족' : '플라스크 없음')}</p>`;
    else if (tg && !a.self && !a.aoe && !canTarget(b, tg, a)) body += `<p class="no">선택한 대상(${esc(tg.n)})에 닿지 않습니다. 전열이 막고 있습니다.</p>`;
    if (tg && isMeleeAct(b.p, a.id) && guardOf(b, tg) && !(a.id === 'heavy' && b.p.eq.weapon === 'hook' && tg.row === 'back')) body += `<p class="no">이 근접 공격은 ${esc(guardOf(b, tg).n)}이(가) 대신 맞습니다(피해·붕괴·상태이상 모두). 방패병을 붕괴시키거나, 원거리·광역 공격을 쓰면 뚫립니다.</p>`;
    return H(a.n, body);
  }
  if (parts[0] === 'en' && b) {
    const e = b.en.find(x => x.id === parts[1]); if (!e) return '';
    if (e.role === 'boss') return H(e.n, P(BOSSES[e.boss].d) + P('다음 행동: ' + intentText(b, e).t) + P('붕괴 게이지 ' + Math.round(e.brk) + '/' + e.brkMax + ' (강공격 약 ' + Math.max(0, Math.ceil((e.brkMax - e.brk) / 35)) + '번)'));
    const reach = e.row === 'front' || !frontBlocked(b);
    return H(e.n, P(e.info || RINFO[e.role] || '') + P('다음 행동: ' + intentText(b, e).t) + (e.role !== 'root' ? P('붕괴 게이지 ' + Math.round(e.brk) + '/' + e.brkMax + '. 가득 차면 모으던 강타가 끊기고 다음 행동을 놓칩니다.') : '') + (reach ? '' : '<p class="no">지금은 근접 공격이 닿지 않습니다.</p>') + P('누르면 대상으로 고릅니다.'));
  }
  if (parts[0] === 'st' && b) {
    const u = parts[1] === 'p' ? b.p : b.en.find(x => x.id === parts[1]); const k = parts[2]; if (!u || !u.s[k]) return '';
    if (k === 'poison') { const v = u.s.poison.stacks; return H('중독 ' + v, P(SDESC.poison) + P('다음 피해 ' + v + ', 그다음 ' + Math.max(0, v - 1) + '… 이대로 두면 앞으로 총 ' + poisonTotal(v) + ' 피해.')); }
    if (KW[k]) { const v = u.s[k].stacks; const ki = k === 'empower' && u === b.p && u.build === 'monk'; return H((ki ? '기' : SNAMES[k] || k) + ' ' + v, P((ki ? '되받을 때마다 쌓입니다. ▶ 공격 한 번이 기 1을 써서 피해 +25%입니다. ⚡ 공격은 기를 쓰지 않습니다.' : (SDESC[k] || ''))) + ((k === 'bleed' || k === 'ignite') ? P('이대로 두면 앞으로 ' + v + ' + ' + Math.max(0, v - 1) + ' + … = 총 ' + poisonTotal(v) + ' 피해.') : P('앞으로 ' + v + '번 더 발동합니다.')) + (k === 'bleed' && isBu(b.p) ? (u === b.p ? P('내 출혈은 내 행동마다 들어가고 1 줍니다.') + ((u.selfBl || 0) > 0 ? P('내가 나에게 건 출혈이 남아 있어 출혈로는 생명력 1에서 멈춥니다.') : '') : P('흡혈 ' + Math.round(Math.min(BUTCH.leechMax, BUTCH.leech * v) * 100) + '%: 이 적을 근접으로 치면 준 피해의 그만큼 생명력을 되찾습니다. 맞힌 순간의 출혈로 셉니다.')) : '')); }
    const n = leftTurns(b, u.s[k]);
    return H(SNAMES[k] || k, P(SDESC[k] || '') + P(n > 0 ? '내 차례가 ' + n + '번 더 오기 전에 끝납니다.' : '내 다음 차례 전에 끝납니다.'));
  }
  if (parts[0] === 'tl' && b) {
    const x = preview(b)[+parts[1]]; if (!x) return '';
    const when = x.now ? '지금 움직이는 차례입니다.' : (x.r > (b.round || 1) ? '다음 라운드(' + x.r + '라운드)에 움직입니다.' : '이번 라운드에 곧 움직입니다.');
    if (x.me) return H('나', P(when) + P('내 차례에는 ⚡빠른 행동 1번(플라스크·빠른 스킬)과 ▶주 행동 1번을 합니다. ⏳느린 행동은 두 칸을 다 씁니다.'));
    const e = b.en.find(y => y.id === x.id && y.alive);
    return H(x.n, P(when) + (e ? P('예고: ' + intentText(b, e).t) : ''));
  }
  const fixed = {
    'bar:hp': ['생명력', '0이 되면 쓰러집니다. 다음 방으로 그대로 이어지고, 샘·생명력 플라스크로만 회복합니다.'],
    'bar:mp': ['마나', '스킬에 씁니다. 라운드가 끝날 때마다 최대치의 5%가 찹니다.'],
    'bar:bk': ['붕괴 게이지', '가득 차면 적이 붕괴: 충전 중이던 기술이 취소되고 다음 행동을 잃습니다.'],
    stun: ['기절', '다음 행동 한 번을 잃습니다.'],
    scar: ['상흔', '받은 피해의 20%가 상흔으로 쌓입니다. 상흔 스킬을 끼운 다른 직업은 10%이고, 최대 생명력의 절반이 한도입니다. 상흔 베기는 상흔의 절반을 써서 1.5배 피해를 더하고, 상흔 방출은 전부 써서 모든 적에게 상흔 × 0.8 피해를 줍니다. 스킬 버튼에 지금 쓰면 나올 값이 적힙니다.'],
    rage: ['분노', '피해를 주거나 받을 때마다 1칸 찹니다(칸당 피해 +3%). 10칸이 차면 격노: 잠시 피해 +40%, 속도 +20%, 받는 피해 +15%. 격노가 끝나면 0부터 다시.'],
    buildrule: ['빌드 규칙', ''],
    explode_old: ['독 폭발', '중독이 5중첩 이상 쌓인 적을 기본 공격하면 중첩 × 4 피해로 한꺼번에 터뜨립니다(중첩은 사라짐). 이 버튼은 조건이 되는 적에게 바로 기본 공격을 합니다. 방패병이 가로막으면 방패병의 중독으로 판정합니다.'],
    regen: ['뿌리의 회복', '뒷줄 뿌리가 살아 있는 동안 수호목은 라운드가 끝날 때마다 체력을 회복합니다(뿌리 수에 비례, 봄에는 2배). 숫자는 한 라운드에 회복하는 양입니다. 뿌리는 원거리·광역 공격으로, 또는 수호목을 붕괴시켜 근접으로 칠 수 있습니다.'],
    guarded: ['방패병이 막음', '이 적을 노린 근접 공격은 방패병이 대신 맞습니다(피해·붕괴·상태이상 모두). 방패병을 붕괴시키면 잠시 뚫리고, 원거리·광역·지속 피해는 막지 못합니다.'],
    guardon: ['방어 준비', '내 다음 차례까지 받는 피해가 절반입니다.'],
    dodgeon: ['흘리기 준비', '고른 적의 다음 단일 공격 피해를 60% 줄입니다. 강타라면 그 적의 붕괴 게이지 +25.'],
    exhaust: ['탈진', '스태미나가 바닥났습니다. 강공격·방어·흘리기 불가, 받는 피해 +20%. 30까지 차면 풀립니다.'],
    counter: ['반격 (인내의 흉갑)', '방어 중 받은 피해의 30%가 다음 공격에 더해집니다.'],
    reflux: ['역류 대기 (역류의 성배)', '다음 공격이 방금 정화한 디버프를 대상에게 겁니다.'],
    gim: ['보스 기믹', '보스의 특별한 규칙입니다. 숫자는 남은 라운드 수입니다.'],
    speed: ['속도', '같은 라운드 안에서 누가 먼저 움직일지 정합니다. 나보다 빠른 적은 내 앞에서, 느린 적은 내 뒤에서 움직이고, 같으면 내가 먼저입니다. 중독 같은 지속 피해는 라운드가 끝날 때 흐르므로 속도와 상관없습니다.'],
  };
  if (key === 'stats' && b) { const p = b.p; return H('능력치', P(STAT_KEYS.map(k => STATN[k] + ' ' + stat(p, k)).join(', ') + '.') + STAT_KEYS.map(k => P(STATN[k] + ' 다음 1점: ' + statNext(p, k))).join('')); }
  if (key === 'dodgeon' && b) { // 흘리기 준비: 실제로 줄이는 몫과 흘려 낸 뒤 효과 (스킬마다 50~90%)
    const p = b.p; const de = b.en.find(x => x.id === p.dodge && x.alive); const on = p.dodgeOn;
    const ret = on ? [on.dmg ? '피해 ' + on.dmg : '', on.poison ? '중독 ' + on.poison : '', on.brk ? '붕괴 +' + on.brk : ''].filter(Boolean).join(', ') : '';
    return H('흘리기 준비', P((de ? de.n + '의' : '고른 적의') + ' 다음 공격 피해가 ' + Math.round(Math.max(0, (p.dodgeRed || parryRed(p)) - parryBig(de)) * 100) + '% 줄어듭니다' + (parryBig(de) ? '(강적·보스라 ' + Math.round(PARRY_BIG * 100) + '%p 덜)' : '') + '. 강타라면 그 적의 붕괴 게이지가 25 찹니다.') + (ret ? P('흘려 내면 그 적에게 ' + ret + '.') : '') + P('내 다음 차례까지 유효합니다. 고른 적이 그 사이 움직이지 않으면 헛됩니다.'));
  }
  if (parts[0] === 'buff' && G.run) { const k = parts[1], S = SHRINES.find(x => x.id === k); const n = (G.run.buffs || {})[k] || 0; return H(S ? S.n : (EVBUFF[k] || [k])[0], P(S ? S.d : (EVBUFF[k] || ['', ''])[1]) + P('지금 방을 포함해 ' + n + '개 방 동안 이어집니다.')); } // 10월 5일: 브라우저 툴팁 대신 게임 설명 창
  if (parts[0] === 'sk' && SK2[parts[1]]) { const s = SK2[parts[1]]; return H(s.n, P((s.start ? '시작 스킬' : s.b + ' · ' + s.tier + ' · ' + s.row + '줄') + '. ' + skHead(s)) + P(skBody(s)) + cfKwHtml(s)); } // 시험 전투의 스킬 칸
  if (parts[0] === 'mod' && ROOM_MODS[parts[1]]) return H(ROOM_MODS[parts[1]].n, P(ROOM_MODS[parts[1]].d));
  if (key === 'heat' && b && b.heat != null) return H('열기', P('지금 ' + Math.round(b.heat) + '/100. 이번 라운드 끝에 약 +' + heatRise(b) + '.') + P('열기가 100 이상인 채 라운드가 끝나면 ' + heatName(b) + '이(가) 붑니다. 예고가 뜬 뒤에는 내 차례가 한 번 옵니다. 그 전에 열기를 100 아래로 내리면 불지 않습니다.') + P('열기가 변할 때마다 전투 기록에 까닭이 적힙니다.'));
  if (key === 'ign' && b) return H('내 화상', P('직접 피해를 받을 때마다 화상 수만큼 피해가 더해지고 1 줄어듭니다. 예고 숫자 옆 (+화상 n)은 그 공격에 더해질 몫입니다. 한 라운드에 새로 붙는 화상은 ' + IGN_ROUND_CAP + '까지입니다.'));
  if (key === 'ehaze') return H('허상', P('허상 한 겹은 적 하나를 고르는 공격 하나를 헛치게 하고 한 겹이 걷힙니다. 광역 공격과 지속 피해는 허상을 지나 들어갑니다. 무너지면 허상이 모두 사라집니다.'));
  if (key === 'ewrap') return H('붕대', P('받는 직접 피해가 ' + Math.round(WRAP.cut * 100) + '% 줄어듭니다. 지속 피해는 줄지 않습니다. 화상이 걸리거나 무너지거나 세 번 맞으면 벗겨집니다.'));
  if (key === 'efire') return H('화염 강화', P('이 적의 공격은 화상을 싣습니다(평소 ' + FIRE_AFFIX.hit + ', 강타 ' + FIRE_AFFIX.heavy + '). 둔화가 걸려 있으면 싣지 않습니다. 보호막이 모두 받아 낸 공격은 화상도 싣지 않습니다.'));
  if (parts[0] === 'lock') { const L = typeof UNLOCK !== 'undefined' && UNLOCK[parts[1]]; return L ? H('???', P('숨겨진 직업입니다.') + P(L.hint || '') + P('한 번 열리면 이 계정에 남습니다.')) : ''; }
  if (parts[0] === 'soon') { const c = (typeof CLASS_SOON !== 'undefined' ? CLASS_SOON : []).find(x => x.n === parts[1]); return c ? H(c.n, P(c.d + '.') + P('아직 준비 중입니다.')) : ''; }
  if (parts[0] === 'floor' && G.run) { const f = +parts[1], run = G.run; const rec = (run.rooms || []).filter(x => x.room === f).pop(); const T = rec && ROOM_TYPES[rec.type]; return H(floorName(f), P(f === FLOOR_CAMP ? '야영지: 쉬면 모두 찹니다.' : f === FLOOR_BOSS ? '보스가 기다립니다.' : f === run.room ? '지금 있는 층입니다.' : f < run.room ? (T ? T.n + ' 방을 지났습니다.' : rec && rec.type === 'camp' ? '야영지에서 쉬었습니다.' : '지나온 층입니다.') : PATH_AT.includes(f) ? '갈래길이 나옵니다.' : '아직 가지 않은 층입니다.')); }
  if (INFO2[key]) return H(INFO2[key][0], INFO2[key].slice(1).map(P).join(''));
  if (key === 'buildrule' && b) { const B = BUILDS[b.p.build]; const SKM = skillMap(b.p.build); return H(B.n, classRuleHtml(b.p.build) + skillsOf(b.p).map(id => P(SKM[id].n + ' (' + resLabel(SKM[id]) + '): ' + SKM[id].d)).join('')); }
  if (fixed[key]) return H(fixed[key][0], P(fixed[key][1]));
  return '';
}

/* ---------- 설명 창 동작 (올리면 뜨고, 휴대폰은 길게 누르기) ---------- */
const POP = { el: null, t: 0, touchT: 0, suppress: false, cur: null };
/* 설명 창은 보일 때만 이름 있는 랜드마크 안에 둔다(흩어진 내용이 랜드마크 밖에 남지 않게, axe region). 상자는 자리를 차지하지 않는다 */
function popEl() { if (!POP.el) { const box = document.createElement('div'); box.id = 'popbox'; box.setAttribute('role', 'complementary'); box.setAttribute('aria-label', '설명 창'); box.style.display = 'none'; POP.el = document.createElement('div'); POP.el.id = 'pop'; POP.el.className = 'pop'; POP.el.setAttribute('role', 'tooltip'); box.appendChild(POP.el); document.body.appendChild(box); POP.box = box; } return POP.el; }
function showPop(target, force) {
  if (!G.infoOn && !force) return; /* force: 쓸 수 없는 행동을 눌렀을 때는 설명 창을 꺼 두어도 이유를 보인다 */
  const key = target.dataset.info; const html = infoHtml(key); if (!html) return hidePop();
  if (POP.cur && POP.cur !== target) descDel(POP.cur, 'pop');
  clearTimeout(POP.h); const el = popEl(); el.innerHTML = html; POP.box.style.display = 'block'; el.style.display = 'block'; POP.cur = target; descAdd(target, 'pop');
  const r = target.getBoundingClientRect(); const pw = Math.min(320, window.innerWidth - 16);
  el.style.width = pw + 'px';
  const ph = el.offsetHeight;
  let left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
  let top = r.top - ph - 8; if (top < 8) top = Math.min(window.innerHeight - ph - 8, r.bottom + 8);
  el.style.left = left + 'px'; el.style.top = top + 'px';
}
function hidePop() { clearTimeout(POP.t); clearTimeout(POP.h); if (POP.el) { POP.el.style.display = 'none'; POP.box.style.display = 'none'; } if (POP.cur) descDel(POP.cur, 'pop'); POP.cur = null; }
/* aria-describedby에 설명 창(pop)과 미리보기 문장(pvdesc)을 함께 단다 */
function descAdd(el, id) { if (!el || !el.getAttribute) return; const L = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); if (!L.includes(id)) L.push(id); el.setAttribute('aria-describedby', L.join(' ')); }
function descDel(el, id) { if (!el || !el.getAttribute) return; const L = (el.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== id); if (L.length) el.setAttribute('aria-describedby', L.join(' ')); else el.removeAttribute('aria-describedby'); }
/* ===== 행동 미리보기 (10월 7일 2차, Into the Breach · Monster Train의 겹쳐 그리기) =====
   행동 버튼에 초점이 가거나 마우스를 올리면(휴대폰은 길게 누르면) 맞을 적의 생명력 막대에 예상 피해를, 붕괴 막대에 오를 양을 빗금으로 겹친다.
   값은 새 계산식이 아니라 엔진의 playerAct를 전투 사본에서 그대로 돌린 결과다(자동 테스터의 한 수 앞 계산과 같은 방법).
   사본은 적 차례를 돌리지 않고(stepMode), 해금 셈 · 전리품에 닿지 않는다(ctx.test). 난수는 가장 낮은 값과 가장 높은 값으로 두 번 돌려 범위를 낸다 */
const PV = { btn: null, hover: null };
function actSim(b, id) {
  if (!b || b.over || G.busy) return null;
  const a = actionList(b).find(x => x.id === id); if (!a || !a.ok || a.id === 'flee') return null;
  const t = actTarget(b, a);
  const one = r => {
    const c = JSON.parse(JSON.stringify(Object.assign({}, b, { log: [], rec: [], hits3: [], why: [], rngF: null, vanguardTgt: null, chainTgt: null, markTgt: null })));
    const re = o => o ? c.en.find(e => e.id === o.id) || null : null; c.vanguardTgt = re(b.vanguardTgt); c.chainTgt = re(b.chainTgt); c.markTgt = re(b.markTgt);
    c.ctx = Object.assign({}, c.ctx, { test: 1 }); c.stepMode = true; c.waiting = false; c.rngF = () => r;
    try { playerAct(c, id, t ? t.id : null); } catch (e) { return null; }
    return c;
  };
  const c0 = one(0), c1 = one(0.9999); if (!c0 || !c1) return null;
  const out = { en: {}, p: null, st: 0, mp: 0 };
  out.st = r1(c0.p.st - b.p.st); out.mp = r1(c0.p.mp - b.p.mp); /* 이 행동이 스태미나 · 마나를 쓰는 만큼(−) 또는 채우는 만큼(+) */
  for (const e of b.en) {
    if (!e.alive) continue; const x0 = c0.en.find(y => y.id === e.id), x1 = c1.en.find(y => y.id === e.id); if (!x0 || !x1) continue;
    const d0 = e.hp - Math.max(0, x0.alive ? x0.hp : 0), d1 = e.hp - Math.max(0, x1.alive ? x1.hp : 0);
    const kill = !x0.alive || !x1.alive || (!!x0.pile && !e.pile);
    const brk = (!!x0.s.broken && !e.s.broken) || (!!x1.s.broken && !e.s.broken); const bk = Math.max(0, x0.brk - e.brk, x1.brk - e.brk);
    if (Math.max(d0, d1) > 0.05 || bk > 0.05 || brk || kill) out.en[e.id] = { lo: Math.max(0, Math.min(d0, d1)), hi: Math.max(0, d0, d1), bk, brk, kill, hp: e.hp, max: e.hpMax, b0: e.brk, bmax: e.brkMax };
  }
  const p0 = c0.p.hp - b.p.hp, p1 = c1.p.hp - b.p.hp;
  if (Math.abs(p0) > 0.05 || Math.abs(p1) > 0.05) out.p = { lo: Math.min(p0, p1), hi: Math.max(p0, p1) };
  return out;
}
const pvNum = (lo, hi) => Math.abs(hi - lo) < 0.05 ? String(r1(hi)) : r1(lo) + '–' + r1(hi);
/* 내 막대 위의 행동 미리보기: 점 칸(잃는 몫) 또는 초록 칸(느는 몫) + "−40 70 → 30" 글자. 색만으로 가르지 않는다 */
function pvOwn(sel, now, delta, max) {
  const bar = document.querySelector(sel); if (!bar || !(max > 0) || Math.abs(delta) < 0.05) return;
  const after = Math.max(0, Math.min(max, now + delta)), lo = Math.min(now, after), w = Math.abs(after - now); if (!(w > 0)) return;
  bar.insertAdjacentHTML('beforeend', `<b class="${delta < 0 ? 'pvc' : 'pvh'}" aria-hidden="true" style="left:${lo / max * 100}%;width:${w / max * 100}%"></b>`);
  const sp = bar.querySelector('span'); if (sp && !sp.dataset.o) { sp.dataset.o = sp.innerHTML; sp.innerHTML = `<b class="pvx ${delta < 0 ? 'neg' : 'pos'}">${delta < 0 ? '−' : '+'}${r1(w)}</b> ${shownHp(now)} → ${shownHp(after)}`; }
}
function pvShow(btn) {
  pvHide(); if (HUDNOW && !HUDNOW.prev) return; const b = G.b; if (!b || !btn || !btn.isConnected || btn.getAttribute('aria-disabled') === 'true') return;
  const sim = actSim(b, btn.dataset.id); if (!sim) return;
  const say = [];
  for (const id in sim.en) {
    const x = sim.en[id], e = b.en.find(y => y.id === id); const card = document.querySelector('.en[data-e="' + id + '"]');
    const num = pvNum(x.lo, x.hi);
    if (card) {
      const bar = card.querySelector('.bar.ehp');
      if (bar && x.hi > 0.05 && x.max > 0) bar.insertAdjacentHTML('beforeend', `<b class="pvg" aria-hidden="true" style="left:${Math.max(0, x.hp - x.hi) / x.max * 100}%;width:${Math.min(x.hp, x.hi) / x.max * 100}%"></b>`);
      const bkb = card.querySelector('.bkb');
      if (bkb && x.bmax > 0 && (x.bk > 0.05 || x.brk)) { const f = Math.min(100, x.b0 / x.bmax * 100); bkb.insertAdjacentHTML('beforeend', `<b class="pvk" aria-hidden="true" style="left:${f}%;width:${x.brk ? 100 - f : Math.min(100 - f, x.bk / x.bmax * 100)}%"></b>`); }
      const tx = [x.kill ? '쓰러짐' : x.hi > 0.05 ? '−' + num : '', x.brk ? '붕괴' : x.bk > 0.05 ? '붕괴 +' + Math.round(x.bk) : ''].filter(Boolean).join(' · ');
      if (tx) card.insertAdjacentHTML('beforeend', `<span class="pvt" aria-hidden="true">${esc(tx)}</span>`);
    }
    say.push((e ? e.n : '') + ' ' + [x.kill ? '쓰러짐' : x.hi > 0.05 ? '생명력 −' + num : '', x.brk ? '붕괴' : x.bk > 0.05 ? '붕괴 +' + Math.round(x.bk) : ''].filter(Boolean).join(', '));
  }
  { const p = b.p;
    if (sim.p) { const up = sim.p.hi > 0; pvOwn('.fstat .bar.hp', p.hp, up ? sim.p.hi : sim.p.lo, p.hpMax); say.push('내 생명력 ' + (sim.p.hi > 0 ? '+' + pvNum(sim.p.lo, sim.p.hi) : '−' + pvNum(-sim.p.hi, -sim.p.lo))); }
    if (Math.abs(sim.st || 0) > 0.05) { pvOwn('.fstat .bar.st', p.st, sim.st, p.stMax); say.push('내 스태미나 ' + (sim.st > 0 ? '+' : '−') + r1(Math.abs(sim.st))); }
    if (Math.abs(sim.mp || 0) > 0.05 && p.mpMax > 0) { pvOwn('.fstat .bar.mp', p.mp, sim.mp, p.mpMax); say.push('내 마나 ' + (sim.mp > 0 ? '+' : '−') + r1(Math.abs(sim.mp))); } }
  const d = document.getElementById('pvdesc'); if (d) d.textContent = say.length ? '이 행동의 예상: ' + say.join('. ') + '. 내 행동의 즉시 결과이며, 이후 적 차례와 라운드 끝 피해는 포함하지 않습니다.' : '';
  if (say.length) descAdd(btn, 'pvdesc'); PV.btn = btn;
}
function pvHide() { if (typeof document === 'undefined') return; document.querySelectorAll('.pvg:not(.pvi),.pvk,.pvh,.pvc,.pvx,.en .pvt').forEach(x => x.remove()); document.querySelectorAll('.bar span[data-o]').forEach(sp => { sp.innerHTML = sp.dataset.o; delete sp.dataset.o; }); if (PV.btn) descDel(PV.btn, 'pvdesc'); PV.btn = null; }
function initPv() {
  const ab = t => t && t.closest ? t.closest('.ab[data-a=act]') : null;
  document.addEventListener('focusin', ev => { const t = ab(ev.target); if (t) pvShow(t); else if (PV.btn && !PV.hover) pvHide(); });
  document.addEventListener('focusout', ev => { if (PV.btn && ev.target === PV.btn && !PV.hover) setTimeout(() => { const f = ab(document.activeElement); if (!f) pvHide(); }, 0); });
  document.addEventListener('pointerover', ev => { if (ev.pointerType === 'touch') return; const t = ab(ev.target); if (t && t !== PV.hover) { PV.hover = t; pvShow(t); } });
  document.addEventListener('pointerout', ev => { if (ev.pointerType === 'touch') return; const t = ab(ev.target); if (!t) return; const rt = ev.relatedTarget; if (rt && ab(rt) === t) return; PV.hover = null; const f = ab(document.activeElement); if (f) pvShow(f); else pvHide(); });
}
function initPop() {
  document.addEventListener('pointerover', ev => {
    if (ev.pointerType === 'touch' || optGet('noHover')) return;
    if (ev.target.closest && ev.target.closest('#pop')) { clearTimeout(POP.h); return; } /* 10월 7일: 설명 창 위로 마우스를 옮겨도 닫히지 않는다 */
    const t = ev.target.closest && ev.target.closest('[data-info]'); if (!t) return;
    if (t.closest('.treev, .tsum') && window.innerWidth >= 900) return; // 스킬 트리: PC는 오른쪽 설명 칸이 맡는다
    clearTimeout(POP.t); POP.t = setTimeout(() => showPop(t), 180);
  });
  document.addEventListener('pointerout', ev => {
    if (ev.pointerType === 'touch') return;
    const fromPop = ev.target.closest && ev.target.closest('#pop');
    const t = fromPop ? POP.cur : ev.target.closest && ev.target.closest('[data-info]'); if (!t) return;
    const rt = ev.relatedTarget; if (rt && rt.closest && (rt.closest('#pop') || rt.closest('[data-info]') === t)) return;
    clearTimeout(POP.t); clearTimeout(POP.h); POP.h = setTimeout(hidePop, 300); /* 잠깐 기다려 설명 창으로 옮겨 갈 틈을 둔다 */
  });
  document.addEventListener('focusin', ev => { if (POP.mute) return; const t = ev.target.closest && ev.target.closest('[data-info]'); if (t && ev.target.matches(':focus-visible')) showPop(t); });
  document.addEventListener('focusout', () => hidePop());
  document.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'touch') { return; }
    const t = ev.target.closest && ev.target.closest('[data-info]'); hidePop(); if (!(t && t.closest('.ab[data-a=act]'))) pvHide(); if (!t) return;
    POP.suppress = false; clearTimeout(POP.touchT);
    POP.touchT = setTimeout(() => { POP.suppress = true; showPop(t); if (t.matches('.ab[data-a=act]')) pvShow(t); }, HOLD_MS[optGet('hold')] || HOLD_MS.normal);
  });
  const cancel = () => clearTimeout(POP.touchT);
  document.addEventListener('pointerup', cancel); document.addEventListener('pointercancel', cancel);
  document.addEventListener('click', ev => { if (POP.suppress) { POP.suppress = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
  document.addEventListener('contextmenu', ev => { if (ev.target.closest && ev.target.closest('[data-info]')) ev.preventDefault(); });
  window.addEventListener('scroll', hidePop, true);
}

