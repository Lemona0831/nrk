/* 0.6a.2 개편: 스킬 점수제 v0와 설명 문장 생성기 (docs/0.6a.2-암살자-스킬.md 2절)
   data/skills.js의 스킬 한 줄에서 화면 설명 문장과 점수를 같은 데이터로 만든다. 게임(설명 창, 트리)과 도구(tools/skillscore.js)가 함께 쓴다.
   data 폴더의 예외: 값이 아니라 문장·점수 계산이지만, 게임과 도구가 한 벌만 쓰도록 여기 둔다. 기준값(SKK)은 모두 가설이다.
   10월 3일: 충전 대신 재사용 대기(cd)로 바꾸며 쓰는 횟수(skUses)를 대기와 갈래 규칙으로 계산한다. */
const SKK = {
  B: 9.5,                       // 기본 공격 값 (무기 피해 8 + 붕괴 10)
  T: { fast: 0.5, normal: 1, slow: 1.5, vslow: 2 },
  TN: { fast: '빠름', normal: '보통', slow: '느림', vslow: '아주 느림' },
  tmul: { melee: 1, pick: 1, ranged: 1, front: 1.6, all: 2.0, self: 0 },   // 10월 3일 50상황 실측: 광역은 맞히는 적이 일찍 쓰러져 생각보다 덜 번다(2.0·2.5 → 1.6·2.0)
  TGN: { melee: '근접 한 적', pick: '고른 적', ranged: '후열까지 한 적', front: '전열 모두', all: '모든 적', self: '나' },
  poison: 4,                    // 중독 1의 값 (10월 3일 3 → 4: 쌓인 중독 위에 더하면 남은 피해가 1보다 크게 늘어 독사가 점수보다 셌다)
  brk: 0.15,                    // 붕괴 게이지 1의 값 (10 = 1.5)
  S: 4,                         // 쓸 때 대상의 기대 중독 수치 (10월 3일 06a2 실측 3.9)
  Sk: { burst: 1.5, grow: 5, exploit: 4, brkPer: 3, spread: 5, drain: 5 },  // 효과마다 쓸 때 대상의 중독 (10월 3일 재사용 대기 판 실측: 터뜨리기 1.1 → 기본 4칸 판 2.8(먼저 거는 중독 전), 키우기 6.4, 이용 4.1, 붕괴 2.9). 터뜨리기는 먼저 거는 중독(pre)을 더한다
  ph: 8,                        // 흘리기형 스킬이 막는 공격의 기대 피해 (10월 3일: 재사용 대기로 바뀌어 평범한 공격에도 쓰므로 15 → 8)
  pOk: 0.6,                     // 흘리기 성공 확률 (10월 3일 50상황 실측으로 0.75 → 0.6) (고른 적이 내 다음 차례 전에 친다)
  turns: 11,                    // 기준 전투에서 첫 차례 뒤 내 차례 수 (목표 전투 길이 12행동, 10월 3일 만든 사람 결정: 옛 암살자 수준)
  haste: { poison: 5, kill: 2, parry: 1.5, break: 1 },  // 기준 전투에서 갈래 규칙이 일어나는 행동 수 (한 행동에 한 번만 센다) [가설]
  kw: { weak: 1.5, vuln: 1.5, chill: 1.5, protect: 2, haste: 2 },   // 적에게 거는 상태 1의 값 (한 번 막거나 키우는 피해)
  budget: { 시작: 28, 하급: 39, 중급: 48 },   // 10월 3일 50상황: 시작 스킬을 낮추고(35 → 28) 트리를 1.15배로 올렸다. 공통 행동이 갈래 스킬보다 세면 갈래 성격이 묻힌다
  rowB: { 1: 37, 2: 38, 3: 39, 4: 40, 5: 41, 6: 42.5, 7: 46, 8: 47.5, 9: 49.5, 10: 51 },  // 줄마다 예산 (10월 3일): 깊은 줄일수록 조금 세다. 하급 1~6줄, 중급 7~10줄   // 시작 30 → 35 (10월 3일: 늘 끼워지는 시작 스킬로 전투를 줄인다)   // 10월 3일: 06a2 감도 시험(스킬 효과 ×1.3 → 6성향 20%, 신중 35%)에서 등급별 점수 중앙값. 처음 값(20·24·30·42)의 약 1.7배
  Fmax: 6,                      // 한 스킬을 전투에서 쓰는 횟수의 상한 (실측: 바탕 스킬 독니 5.4)
};
const skTri = n => n * (n + 1) / 2;
const skJo = n => '013678'.includes(String(n).slice(-1)) ? '을' : '를'; // 숫자 뒤 을/를
function skValue(s) {
  const K = SKK; const Sof = k => (K.Sk && K.Sk[k] != null ? K.Sk[k] : K.S); const tm = K.tmul[s.tgt]; const hits = s.hits || 1; let v = 0;
  for (const e of s.fx) {
    switch (e.k) {
      case 'dmg': v += e.n * hits * (s.tgt === 'self' ? 1 : tm); break;
      case 'poison': v += e.n * hits * K.poison * (s.tgt === 'self' ? 1 : tm); break;
      case 'grow': v += (Sof('grow') * (e.mul - 1) * K.poison + (e.add || 0) * K.poison) * (s.tgt === 'all' || s.tgt === 'front' ? tm : 1); break;
      case 'burst': { const S0 = Sof('burst') + (e.pre || 0); const S = e.half ? Math.ceil(S0 / 2) : e.top ? Math.min(e.top, S0) : S0; const tot = (e.top || e.half) ? (skTri(S0) - skTri(S0 - S)) : skTri(S0); // pre: 터뜨리기 전에 거는 중독
        const am = s.tgt === 'all' || s.tgt === 'front' ? tm : 1; v += tot * ((e.mul || 1) - 0.5) * am + (e.keep || 0) * S0 * K.poison + S * (e.brkPer || 0) * K.brk * am; break; } // 광역 터뜨리기는 맞히는 수만큼
      case 'exploit': v += e.per * Sof('exploit') + (e.n || 0); break;
      case 'brk': v += e.n * K.brk * (s.tgt === 'self' ? 1 : tm); break;
      case 'stam': v += e.n * 0.15; break;
      case 'bigx': break; // 끝에서 곱한다
      case 'cutx': v += e.brk * K.brk * 0.25; break; // 강타·폭발을 모으는 적: 쓸 때 넷 중 하나쯤
      case 'drain': v += e.per * Sof('drain'); break; // 대상의 중독 1마다 생명력
      case 'lowx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * 0.35; break; } // 생명력이 낮은 적: 쓸 때 셋 중 하나쯤
      case 'brokenx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * 0.3; break; } // 붕괴한 적: 붕괴를 노리고 쓰면 열에 셋
      case 'spread': v += Math.ceil(Sof('spread') * e.per) * 1.5 * K.poison; break; // 다른 적 평균 1.5
      case 'st': v += e.n * (K.kw[e.s] || 1) * (s.tgt === 'self' ? 1 : tm); break;
      case 'brkPer': v += e.per * Sof('brkPer') * K.brk; break;
      case 'parry': v += K.ph * e.red + 0.5 * 25 * K.brk; break;
      case 'onParry': v += K.pOk * ((e.dmg || 0) + (e.poison || 0) * K.poison + (e.brk || 0) * K.brk); break;
      case 'parryBuff': v += K.ph * e.red * (e.times || 1) + (e.stam || 0) * 0.15 * (e.times || 1) + K.pOk * (e.times || 1) * ((e.dmg || 0) + (e.poison || 0) * K.poison); break;
      case 'execute': v += skTri(Sof('burst') + 2) * (e.mul - 1) * 0.5; break;
      case 'capOver': break;
    }
  }
  const gx = s.fx.find(e => e.k === 'bigx'); if (gx) v *= 1 + (gx.mul - 1) * 0.3; // 큰 적에게 ×: 열에 셋쯤 큰 적 (10월 3일 50상황으로 넣음)
  return v;
}
/* 전투 한 번에 쓰는 횟수: 처음 1번 + (남은 차례 + 갈래 규칙으로 줄어드는 대기) / (대기 + 1). 전투마다 1번은 1 */
function skUses(s) { if (s.once) return 1 + (s.killRecharge ? 0.3 : 0); return Math.min(SKK.Fmax, 1 + (SKK.turns + (SKK.haste[s.hs] || 0)) / (s.cd + 1) + (s.killRecharge ? 0.5 : 0)); }
/* 갈래 보정 (10월 3일, tools/sitqa.js 50상황 실측): 같은 점수라도 갈래마다 실제로 버는 몫이 다르다. 독사는 덜(×0.85), 격발(×1.08)·그림자(×1.1)는 더 번다 */
SKK.brAdj = { 독사: 0.85, 격발: 1.08, 그림자: 1.1 };
function skScore(s) { const E = skValue(s) * (SKK.brAdj[s.b] || 1); const net = E - SKK.B * SKK.T[s.time]; const F = skUses(s); return { E, net, F, V: net * F, B: (s.row && SKK.rowB[s.row]) || SKK.budget[s.tier] }; }

/* 설명 문장. 키워드(중독, 붕괴, 터뜨리기, 흘리기)의 뜻은 설명창의 키워드 칸이 맡고, 스킬 문장은 숫자만 말한다 */
/* 재사용: 쓰고 나면 cd만큼 내 차례를 기다린다. 갈래 규칙(TREE2.haste)이 남은 대기를 줄인다. 시작 스킬은 갈래가 없어 차례로만 돈다 */
const SK_HS = { poison: '독을 걸면', kill: '적을 쓰러뜨리면', parry: '흘려 내면', break: '정예 이상을 무너뜨리면' };
const SK_HSL = { poison: '독을 건 행동마다', kill: '적을 쓰러뜨린 행동마다', parry: '흘리기에 성공할 때마다', break: '정예·강적·보스를 무너뜨린 행동마다' };
for (const k in TREE2) for (const x of (SKILLS2[k] || [])) x.hs = (TREE2[k].haste || {})[x.b] || null; // 스킬마다 갈래 규칙을 붙여 둔다
function skCd(s) { return s.once ? '전투마다 1번' : `재사용 ${s.cd}차례` + (s.hs ? ` · ${SK_HS[s.hs]} −1` : ''); }
const skCharge = skCd; // 옛 이름
function skHead(s) { return `${SKK.TGN[s.tgt]} · ${SKK.TN[s.time]} · ${skCd(s)}`; }
/* 갈래 규칙 한 줄 (트리 갈래 설명, 도움말) */
function skHasteLine(hs, br) { return hs ? `${SK_HSL[hs]} ${br} 스킬의 남은 대기가 1 준다(한 행동에 한 번).` : ''; }
const SK_KWN = { weak: '약화', vuln: '취약', chill: '둔화', bleed: '출혈', ignite: '화상', protect: '보호', haste: '가속', empower: '강화' };
const skPer = (per, what) => per >= 1 ? `대상의 중독 1마다 ${what} +${per}` : `대상의 중독 ${Math.round(1 / per)}마다 ${what} +1`;
function skBody(s) {
  const out = []; const hits = s.hits || 1; const parts = [];
  for (const e of s.fx) {
    if (e.k === 'dmg') parts.push(`피해 ${e.n}`);
    if (e.k === 'poison') parts.push(`중독 ${e.n}`);
    if (e.k === 'brk') parts.push(`붕괴 +${e.n}`);
    if (e.k === 'st') parts.push(`${s.tgt === 'self' ? '나에게 ' : ''}${SK_KWN[e.s] || e.s} ${e.n}`);
  }
  if (parts.length) out.push((hits > 1 ? `${hits}번 찌른다. 한 번마다 ` : '') + parts.join(', ') + '.');
  for (const e of s.fx) {
    switch (e.k) {
      case 'grow': out.push(`대상의 중독을 ${e.mul}배로 만든다.` + (e.add ? ` 그 뒤 중독 ${e.add}.` : '')); break;
      case 'burst':
        out.push((e.pre ? `중독 ${e.pre}${skJo(e.pre)} 건 뒤 ` : '') + (s.tgt === 'all' ? '모든 적의 중독을 모두 터뜨린다.' : e.half ? '대상의 중독을 절반(올림)만 터뜨린다.' : e.top ? `대상의 중독을 ${e.top}만 터뜨린다.` : '대상의 중독을 모두 터뜨린다.')
          + (e.mul && e.mul !== 1 ? ` 터뜨린 피해 ×${e.mul}.` : '')
          + (e.brkPer ? ` 터뜨린 중독 1마다 붕괴 +${e.brkPer}.` : '')
          + (e.keep ? ` 터뜨린 뒤 중독이 ${e.keep === 0.5 ? '절반' : Math.round(e.keep * 100) + '%'} 남는다.` : '')); break;
      case 'exploit': out.push(`${skPer(e.per, '피해')}. 중독은 줄지 않는다.`); break;
      case 'brkPer': out.push(`${skPer(e.per, '붕괴')}. 중독은 줄지 않는다.`); break;
      case 'parry': out.push(`흘리기처럼 고른 적의 다음 공격 피해를 ${Math.round(e.red * 100)}% 줄인다. 스태미나는 들지 않는다.`); break;
      case 'onParry': out.push(`그 공격을 흘려 내면 그 적에게 ${[e.dmg ? '피해 ' + e.dmg : '', e.poison ? '중독 ' + e.poison : '', e.brk ? '붕괴 +' + e.brk : ''].filter(Boolean).join(', ')}.`); break;
      case 'parryBuff': {
        const t = e.times || 1; const hit = [e.dmg ? '피해 ' + e.dmg : '', e.poison ? '중독 ' + e.poison : ''].filter(Boolean).join(', ');
        const buf = [];
        if (e.red) buf.push(`줄이는 피해가 ${Math.round(e.red * 100)}%p 커진다`);
        if (e.stam) buf.push(e.stam >= 30 ? '스태미나가 들지 않는다' : `드는 스태미나 −${e.stam}`);
        out.push((buf.length ? `다음 흘리기 ${t}번은 ${buf.join('. ')}.` : '') + (hit ? ` ${t > 1 ? '흘리기에 성공할 때마다' : '다음 흘리기에 성공하면'} 그 적에게 ${hit}.` : '')); break; }
      case 'execute': out.push(`대상의 생명력이 ${Math.round(e.hp * 100)}% 이하면 터뜨린 피해 ×${e.mul}.`); break;
      case 'stam': out.push(`스태미나 +${e.n}.`); break;
      case 'bigx': out.push(`정예·강적·보스에게는 피해 ×${e.mul}.`); break;
      case 'cutx': out.push(`대상이 강타나 폭발을 모으는 중이면 붕괴 +${e.brk}.`); break;
      case 'drain': out.push(`대상의 중독 1마다 생명력 +${e.per}. 중독은 그대로다.`); break;
      case 'lowx': out.push(`대상의 생명력이 ${Math.round(e.hp * 100)}% 이하면 피해 ×${e.mul}.`); break;
      case 'brokenx': out.push(`대상이 붕괴 상태면 피해 ×${e.mul}.`); break;
      case 'spread': out.push(`대상의 중독 ${e.per === 0.5 ? '절반(올림)' : Math.round(e.per * 100) + '%'}만큼 다른 적 모두에게 중독을 건다. 대상의 중독은 그대로다.`); break;
      case 'capOver': out.push(`이 스킬로 거는 중독은 상한을 넘어 ${e.cap}까지 쌓인다.`); break;
    }
  }
  if (s.killRecharge) out.push(s.once ? '이 스킬로 적을 쓰러뜨리면 한 번 더 쓸 수 있다.' : '이 스킬로 적을 쓰러뜨리면 기다리지 않고 바로 다시 쓸 수 있다.');
  return out.join(' ').replace(/\s+/g, ' ').trim();
}
