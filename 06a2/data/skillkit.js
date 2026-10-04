/* 0.6a.2 개편: 스킬 점수제 v0와 설명 문장 생성기 (docs/0.6a.2-암살자-스킬.md 2절)
   data/skills.js의 스킬 한 줄에서 화면 설명 문장과 점수를 같은 데이터로 만든다. 게임(설명 창, 트리)과 도구(tools/skillscore.js)가 함께 쓴다.
   data 폴더의 예외: 값이 아니라 문장·점수 계산이지만, 게임과 도구가 한 벌만 쓰도록 여기 둔다. 기준값(SKK)은 모두 가설이다.
   10월 3일: 충전 대신 재사용 대기(cd)로 바꾸며 쓰는 횟수(skUses)를 대기와 갈래 규칙으로 계산한다. 3차 결정으로 갈래 규칙을 없애 지금은 쿨타임으로만 센다(SKK.haste는 남겨 둔다). */
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
  pOk: 0.85,                    // 흘리기 성공 확률 (10월 3일 50상황 실측: 스킬 흘리기 84%, 빠른 흘리기 71~77%·주 행동 흘리기 96~98%. 예전 값 0.6은 빠른 흘리기가 발동하지 않던 때의 실측이다)
  turns: 11,                    // 기준 전투에서 첫 차례 뒤 내 차례 수 (목표 전투 길이 12행동, 10월 3일 만든 사람 결정: 옛 암살자 수준)
  haste: { poison: 5, kill: 2, parry: 1.5, break: 1 },  // 기준 전투에서 갈래 규칙이 일어나는 행동 수 (한 행동에 한 번만 센다) [가설]
  kw: { weak: 1.5, vuln: 1.5, chill: 1.5, protect: 2, haste: 12, empower: 3.5 },   // haste: 가속 1 = 한 라운드의 연속 행동(차례 하나, 쿨타임은 줄지 않음) (10월 5일 만든 사람 결정으로 2 → 12)   // empower: 나에게 강화 1 = 다음 공격 하나 피해 +25% (10월 5일 사냥꾼 저격 자세, 가설)   // 적에게 거는 상태 1의 값 (한 번 막거나 키우는 피해)
  budget: { 시작: 28, 하급: 39, 중급: 48 },   // 10월 3일 50상황: 시작 스킬을 낮추고(35 → 28) 트리를 1.15배로 올렸다. 공통 행동이 갈래 스킬보다 세면 갈래 성격이 묻힌다
  rowB: { 1: 37, 2: 38, 3: 39, 4: 40, 5: 41, 6: 42.5, 7: 46, 8: 47.5, 9: 49.5, 10: 51 },  // 줄마다 예산 (10월 3일): 깊은 줄일수록 조금 세다. 하급 1~6줄, 중급 7~10줄   // 시작 30 → 35 (10월 3일: 늘 끼워지는 시작 스킬로 전투를 줄인다)   // 10월 3일: 06a2 감도 시험(스킬 효과 ×1.3 → 6성향 20%, 신중 35%)에서 등급별 점수 중앙값. 처음 값(20·24·30·42)의 약 1.7배
  /* 파수꾼 (10월 4일 50상황 측정으로 보정): 보호막은 맞으며 금방 줄어 쓸 때 대개 비어 있다. [하급(1~6줄), 중급(7~10줄)]마다
     S: 보호막 비례 피해를 쓸 때의 보유량(측정 Lv5 7~8, Lv10 13~15), B: 한 번에 태우는 양(측정 Lv5 8~9 · 상한에 막힘, Lv10 12~14), cap: 채우기의 기준 상한(Lv5 49, Lv10 58, 쓸 때 거의 0이라 넘침 0~1%)
     v: 보호막 1의 값, loss: 태운 보호막이 막았을 몫, thorn: 가시가 맞는 몫, vuln: 쓸 때 대상의 취약, shield: 방패병이 있는 몫, pull: 끌어내기, chill: 둔화된 적이 있는 몫 [가설] */
  ward: { v: 0.8, S: [8, 12.5], B: [15, 21], cap: [45, 58], loss: 0.5, thorn: 0.85, vuln: 2, shield: 0.3, pull: 6, chill: 0.35, all: [12, 22], fin: 0.9 }, // 10월 5일 4차 측정(적 행동 개편 · 강적 다섯 · 후열 절반 뒤): 보호막 비례 때 보유 하급 7~9 · 중급 12~13, 최후의 성벽이 태운 양 Lv10 23. B는 그대로(태우기 전 보유 하급 16~22 · 중급 16~35, 상한이 먼저 걸린다). // 10월 4일 3차 측정(테스터가 보호막을 얻는 스킬을 태우는 스킬만큼 끼우고, 한 적의 공격에도 막는 스킬을 쓴 뒤): all은 모두 태우는 스킬이 한 번에 태우는 양(지금 10줄 최후의 성벽뿐, Lv10 측정 18), fin은 마무리 태우기를 생명력이 낮은 적에게 쓴 몫(측정 91~100%)
  /* 사냥꾼 (10월 5일 초안, 가설): F 쓸 때 대상의 추적 겹(최대 3), swap 직전과 다른 적을 칠 몫, ev 몸 빼기 한 번이 막는 피해, hx 쓸 때 가속 상태일 몫, fa 추적 한 겹을 더하는 값 */
  hunt: { F: 1.5, swap: 0.5, ev: 7, hx: 0.5, fa: 1.5, ctr: 0.85, ctrBig: 0.4, q: 6, fs: 8, ch: 1.5, stop: 0.25, stopV: 14, stun: 10, ocb: 0.2 }, // ch: 쓸 때 대상의 둔화, stop: 둔화된 적이 모으는 중일 몫, stopV: 끊은 큰 공격의 값, stun: 적 행동 하나를 놓치게 한 값, ocb: 모으는 적을 무너뜨릴 몫 // ctr: 피한 뒤 반격이 나갈 몫(강타일 때만이면 ctrBig), q: 빠른 칸 하나, fs: 한 라운드에 받는 예고된 큰 공격 피해
  hz: 1.5,                      // 🔄 쿨타임 당기기 1번의 값 [가설] (10월 3일 50상황: 평소 싸움에서는 스킬이 늘 3~4개 준비되어 있어 거의 0, 쿨타임이 묶이는 보스전에서만 크다)
  Fmax: 6,                      // 한 스킬을 전투에서 쓰는 횟수의 상한 (실측: 바탕 스킬 독니 5.4)
};
const skTri = n => n * (n + 1) / 2;
const skJo = n => '013678'.includes(String(n).slice(-1)) ? '을' : '를'; // 숫자 뒤 을/를
function skValue(s) {
  const K = SKK; const Sof = k => (K.Sk && K.Sk[k] != null ? K.Sk[k] : K.S); const tm = K.tmul[s.tgt]; const hits = s.hits || 1; let v = 0; const hi = (s.row || 0) >= 7 ? 1 : 0; // hi: 중급(7~10줄)은 Lv7 이상에서 쓴다
  const burnTake = e => e.max ? Math.min(e.max, K.ward.B[hi]) : K.ward.all[hi]; // 한 번에 태우는 양: 상한이 있으면 측정 보유량과 상한 가운데 작은 쪽, 모두 태우면 측정값
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
      case 'lowx': { const d = s.fx.find(x => x.k === 'dmg'); const wb = s.fx.find(x => x.k === 'wardBurn'); v += ((d ? d.n * hits : 0) + (wb ? burnTake(wb) * wb.mul : 0)) * (e.mul - 1) * (wb ? K.ward.fin : 0.35); break; } // 생명력이 낮은 적: 쓸 때 셋 중 하나쯤. 마무리 태우기(파수꾼)는 아껴 두었다 쓰므로 태운 피해에도 붙고 몫이 크다
      case 'brokenx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * 0.3; break; } // 붕괴한 적: 붕괴를 노리고 쓰면 열에 셋
      case 'spread': v += Math.ceil(Sof('spread') * e.per) * 1.5 * K.poison; break; // 다른 적 평균 1.5
      case 'st': v += e.n * (K.kw[e.s] || 1) * (s.tgt === 'self' ? 1 : tm); break;
      case 'brkPer': v += e.per * Sof('brkPer') * K.brk; break;
      case 'parry': v += K.ph * e.red + 0.5 * 25 * K.brk; break;
      case 'onParry': v += K.pOk * ((e.dmg || 0) + (e.poison || 0) * K.poison + (e.brk || 0) * K.brk); break;
      case 'parryBuff': v += K.ph * e.red * (e.times || 1) + (e.stam || 0) * 0.15 * (e.times || 1) + K.pOk * (e.times || 1) * ((e.dmg || 0) + (e.poison || 0) * K.poison); break;
      case 'execute': v += skTri(Sof('burst') + 2) * (e.mul - 1) * 0.5; break;
      case 'capOver': break;
      case 'ward': v += e.n * K.ward.v; break; // 나에게 보호막 (공격 스킬에 붙어도 나에게)
      case 'wardFill': v += (e.to || 1) * K.ward.cap[hi] * K.ward.v; break; // 쓸 때 거의 비어 있어 상한의 to만큼 찬다 (10월 4일 측정)
      case 'wardBurn': { const take = burnTake(e); v += take * e.mul * (s.tgt === 'front' || s.tgt === 'all' ? tm : 1) - take * K.ward.v * K.ward.loss; break; } // 태운 만큼 × 배수, 태운 보호막이 막았을 몫을 뺀다
      case 'wardDmg': v += e.per * K.ward.S[hi] * (s.tgt === 'front' || s.tgt === 'all' ? tm : 1); break; // 쌓인 보호막 1마다 피해 (보호막은 그대로, 보유량은 레벨에 달렸다)
      case 'thorn': v += e.times * e.dmg * K.ward.thorn; break;
      case 'vulnPer': v += e.per * K.ward.vuln; break;
      case 'shieldx': { const bk = s.fx.find(x => x.k === 'brk'); v += (bk ? bk.n : 0) * (e.mul - 1) * K.brk * K.ward.shield; break; }
      case 'pull': v += K.ward.pull; break;
      case 'vulnGrow': v += K.ward.vuln * (e.mul - 1) * K.kw.vuln; break; // 쓸 때 대상의 취약을 키운다
      case 'chillx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * K.ward.chill * (s.tgt === 'front' || s.tgt === 'all' ? tm : 1); break; } // 둔화된 적에게 ×
      case 'focusx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * e.per * K.hunt.F; break; } // 추적 1겹마다 피해 +per
      case 'focusBurst': v += e.n * K.hunt.F; break; // 추적을 터뜨린다: 1겹마다 피해 +n
      case 'focusAdd': v += e.n * K.hunt.fa; break; // 대상에게 추적 +n겹
      case 'swapx': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n : 0) * (e.mul - 1) * K.hunt.swap; break; } // 직전과 다른 적이면 × (첫 발만)
      case 'evade': v += e.n * K.hunt.ev; break; // 다음에 맞는 공격 n번을 피한다
      case 'hastex': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * K.hunt.hx; break; } // 가속 상태면 ×
      case 'meSt': v += e.n * (K.kw[e.s] || 1); break;
      case 'hasteSpend': { const d = s.fx.find(x => x.k === 'dmg'); v += (d ? d.n * hits : 0) * (e.mul - 1) * 0.4; break; } // 가속이 있으면 써서 ×
      case 'chillCut': v += K.hunt.stop * (K.hunt.stopV * 0.8 + e.brk * K.brk * 0.2); break; // 둔화된 적이 모으는 중이면 끊는다(강적 · 보스는 붕괴)
      case 'chillShatter': v += K.hunt.ch * (e.dmg + e.brk * K.brk); break; // 둔화를 깨뜨려 1마다 피해 · 붕괴
      case 'chillSpread': v += K.hunt.ch * (e.per || 1) * 1.5 * K.kw.chill; break; // 다른 적 평균 1.5
      case 'freeze': v += 0.7 * K.hunt.stun + 0.3 * (e.chill * K.kw.chill + e.brk * K.brk); break; // 일반 · 정예는 행동 하나를 놓친다
      case 'onCutBreak': v += K.hunt.ocb * (e.haste * K.kw.haste + (e.hasten || 0) * K.hz); break;
      case 'evadeCtr': { const evn = (s.fx.find(x => x.k === 'evade') || { n: 1 }).n; const m = (e.charged ? K.hunt.ctrBig : K.hunt.ctr) * evn; v += m * (e.dmg + (e.chill || 0) * K.kw.chill); break; } // 피할 때마다 반격
      case 'quick': v += e.n * K.hunt.q; break; // 이번 차례 빠른 칸 +n
      case 'quickTurns': v += e.n * K.hunt.q; break; // 내 차례 n번 동안 빠른 칸 +1
      case 'foresee': v += e.red * e.rounds * K.hunt.fs; break; // 예고된 큰 공격 피해 줄이기 // 공격 스킬에 붙은 나에게 거는 상태
      case 'hasten': if (e.on === 'evade') { v += (e.n || 1) * K.hz * K.hunt.ctr * ((s.fx.find(x => x.k === 'evade') || { n: 1 }).n); break; } { const pb = s.fx.find(x => x.k === 'parryBuff'); v += (e.n || 1) * K.hz * (e.on === 'parry' ? K.pOk * (pb ? (pb.times || 1) : 1) : 1); break; } // 🔄 다른 같은 갈래 스킬 쿨타임 당기기
    }
  }
  const gx = s.fx.find(e => e.k === 'bigx'); if (gx) v *= 1 + (gx.mul - 1) * 0.3; // 큰 적에게 ×: 열에 셋쯤 큰 적 (10월 3일 50상황으로 넣음)
  return v;
}
/* 전투 한 번에 쓰는 횟수: 처음 1번 + (남은 차례 + 갈래 규칙으로 줄어드는 대기) / (대기 + 1). 전투마다 1번은 1 */
function skUses(s) { if (s.once) return 1 + (s.killRecharge ? 0.3 : 0); return Math.min(SKK.Fmax, 1 + (SKK.turns + (SKK.haste[s.hs] || 0)) / (s.cd + 1) + (s.killRecharge ? 0.5 : 0)); }
/* 갈래 보정 (10월 3일, tools/sitqa.js 50상황 실측): 같은 점수라도 갈래마다 실제로 버는 몫이 다르다.
   쿨타임 하나로 바꾸며(3차 결정) 다시 쟀다: 갈래 규칙을 빼도 50상황 갈래 평균은 그대로였으므로, 지금 수치가 줄 예산 가운데에 오는 값(예전 ×0.85 · ×1.08 · ×1.1) */
SKK.clsB = { h_: 0.9 };
SKK.clsMid = { h_: 0.85 }; // 직업마다 중급(7~10줄) 예산 배율 (10월 5일 만든 사람: 사냥꾼은 한 갈래를 몰아 찍어도 강해지지 않는다. 깊은 칸은 더 센 한 방보다 새 효과)
SKK.clsAdj = { h_: 1.4 }; // 직업마다 실제로 버는 몫 (10월 5일 50상황: 사냥꾼 스킬은 조건 없이 바로 들어가는 피해라 점수보다 1.6배쯤 번다. 같은 예산이면 라운드당 피해가 암살자의 1.7배였다) // 직업마다 예산 배율 (10월 5일 만든 사람: 사냥꾼은 후열에 바로 닿는 물리직이라 화력이 암살자를 넘지 않게 90%)
SKK.brAdj = { 독사: 0.97, 격발: 1.1, 그림자: 1.15, 성벽: 1, 파쇄: 1, '전열 장악': 1 }; // 파수꾼 세 갈래는 50상황으로 재기 전이라 1 [가설]
function skScore(s) { const E = skValue(s) * (SKK.brAdj[s.b] || 1) * ((SKK.clsAdj || {})[String(s.id).slice(0, 2)] || 1); const net = E - SKK.B * SKK.T[s.time]; const F = skUses(s); return { E, net, F, V: net * F, B: Math.round(((s.row && SKK.rowB[s.row]) || SKK.budget[s.tier]) * ((SKK.clsB || {})[String(s.id).slice(0, 2)] || 1) * ((s.row || 0) >= 7 ? ((SKK.clsMid || {})[String(s.id).slice(0, 2)] || 1) : 1) * 10) / 10 }; }

/* 설명 문장. 키워드(중독, 붕괴, 터뜨리기, 흘리기)의 뜻은 설명창의 키워드 칸이 맡고, 스킬 문장은 숫자만 말한다 */
/* 쿨타임: 쓰고 나면 cd만큼 내 턴을 기다린다(내 턴이 끝날 때마다 1 준다). 갈래 규칙(TREE2.haste)은 10월 3일에 없앴다: 아래 SK_HS는 다시 쓸 때를 위해 남긴다 */
const SK_HS = { poison: '독을 걸면', kill: '적을 쓰러뜨리면', parry: '흘려 내면', break: '정예 이상을 무너뜨리면' };
const SK_HSL = { poison: '독을 건 행동마다', kill: '적을 쓰러뜨린 행동마다', parry: '흘리기에 성공할 때마다', break: '정예·강적·보스를 무너뜨린 행동마다' };
for (const k in TREE2) for (const x of (SKILLS2[k] || [])) x.hs = (TREE2[k].haste || {})[x.b] || null; // 스킬마다 갈래 규칙을 붙여 둔다
function skCd(s) { return s.once ? '전투마다 1번' : `쿨타임 ${s.cd}턴` + (s.hs ? ` · ${SK_HS[s.hs]} −1` : ''); } // 갈래 규칙(hs)은 지금 없다
const skCharge = skCd; // 옛 이름
const skHz = s => !!(s && s.fx && s.fx.some(e => e.k === 'hasten')); // 🔄 표시를 붙일 스킬
function skHead(s) { return `${SKK.TGN[s.tgt]} · ${SKK.TN[s.time]} · ${skCd(s)}` + (skHz(s) ? ' · 🔄' : ''); }
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
    if (e.k === 'ward') parts.push(`${s.tgt === 'self' ? '' : '나에게 '}보호막 +${e.n}`);
  }
  if (parts.length) out.push((hits > 1 ? `${hits}번 ${s.tgt === 'ranged' || s.tgt === 'all' ? '쏜다' : '찌른다'}. 한 번마다 ` : '') + parts.join(', ') + '.');
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
      case 'focusx': out.push(`대상의 추적 1겹마다 피해 +${Math.round(e.per * 100)}% 더.`); break;
      case 'focusBurst': out.push(`대상의 추적을 모두 터뜨린다. 1겹마다 피해 +${e.n}. 추적은 사라진다.`); break;
      case 'focusAdd': out.push(`대상에게 추적 +${e.n}겹. 이 효과로는 2겹까지만 오르고, 3겹은 같은 적을 다시 맞혀야 된다.`); break;
      case 'swapx': out.push(`직전에 친 적과 다른 적이면 피해 ×${e.mul}.`); break;
      case 'evade': out.push(`다음에 맞는 공격 ${e.n}번을 피한다. 화형 · 지속 피해처럼 피할 수 없는 것은 빼고.`); break;
      case 'evadeCtr': out.push((e.charged ? '피한 공격이 강타나 겨눈 한 발이면' : (e.rounds ? e.rounds + '라운드 동안 ' : '') + '공격을 피할 때마다') + ` 그 적에게 반격 사격: 피해 ${e.dmg}${e.chill ? ', 둔화 ' + e.chill : ''}.`); break;
      case 'quick': out.push('이번 차례에 빠른 칸 +1.'); break;
      case 'chillCut': out.push(`대상이 둔화된 채 강타 · 영창 · 겨누기를 모으는 중이면 그 공격을 끊는다. 강적 · 보스는 끊기지 않고 붕괴 +${e.brk}.`); break;
      case 'chillShatter': out.push(`대상의 둔화를 모두 깨뜨린다. 둔화 1마다 피해 +${e.dmg}, 붕괴 +${e.brk}.`); break;
      case 'chillSpread': out.push(`대상의 둔화${(e.per || 1) === 1 ? '만큼' : ' × ' + e.per + '만큼'} 다른 적 모두에게 둔화를 건다. 대상의 둔화는 그대로다.`); break;
      case 'freeze': out.push(`일반 · 정예 적은 다음 행동을 놓친다(얼어붙음). 강적 · 보스는 둔화 ${e.chill}, 붕괴 +${e.brk}.`); break;
      case 'onCutBreak': out.push(`모으던 적을 이 스킬로 무너뜨리면 나에게 가속 ${e.haste}${e.hasten ? ', 다른 ' + s.b + ' 스킬 쿨타임 −' + e.hasten : ''}.`); break;
      case 'quickTurns': out.push(`이번 차례부터 내 차례 ${e.n}번 동안 빠른 칸 +1.`); break;
      case 'foresee': out.push(`${e.rounds}라운드 동안 강타 · 겨눈 한 발 · 화형의 피해 −${Math.round(e.red * 100)}%. 피할 수 없는 화형에도 든다.`); break;
      case 'hastex': out.push(`가속으로 두 번 움직이는 라운드면 피해 ×${e.mul}.`); break;
      case 'hasteSpend': out.push(`가속이 있으면 1을 써서 피해 ×${e.mul}(다음 라운드의 연속 행동 대신).`); break;
      case 'meSt': out.push(`나에게 ${SK_KWN[e.s] || e.s} ${e.n}.`); break;
      case 'bigx': out.push(`정예·강적·보스에게는 피해 ×${e.mul}.`); break;
      case 'cutx': out.push(`대상이 강타나 영창을 모으는 중이면 붕괴 +${e.brk}.`); break;
      case 'drain': out.push(`대상의 중독 1마다 생명력 +${e.per}. 중독은 그대로다.`); break;
      case 'lowx': out.push(`대상의 생명력이 ${Math.round(e.hp * 100)}% 이하면 피해 ×${e.mul}.`); break;
      case 'brokenx': out.push(`대상이 붕괴 상태면 피해 ×${e.mul}.`); break;
      case 'spread': out.push(`대상의 중독 ${e.per === 0.5 ? '절반(올림)' : Math.round(e.per * 100) + '%'}만큼 다른 적 모두에게 중독을 건다. 대상의 중독은 그대로다.`); break;
      case 'capOver': out.push(`이 스킬로 거는 중독은 상한을 넘어 ${e.cap}까지 쌓인다.`); break;
      case 'wardFill': out.push(e.to && e.to < 1 ? `보호막을 상한의 ${Math.round(e.to * 100)}%까지 채운다. 이미 그만큼 있으면 늘지 않는다.` : '보호막을 상한까지 채운다.'); break;
      case 'wardBurn': out.push(`보호막을 ${e.max ? '최대 ' + e.max + '까지' : '모두'} 태운다. 태운 보호막 1마다 ${s.tgt === 'front' ? '전열 모두에게 ' : ''}피해 ${e.mul}. 보호막이 없으면 이 피해는 0이다.`); break;
      case 'wardDmg': out.push(`${e.per >= 1 ? '내 보호막 1마다 피해 +' + e.per : '내 보호막 ' + Math.round(1 / e.per) + '마다 피해 +1'}. 보호막은 줄지 않는다.`); break;
      case 'thorn': out.push(`가시 ${e.times}번: 맞을 때마다 때린 적에게 피해 ${e.dmg}. 이미 있으면 횟수를 더한다(최대 8번).`); break;
      case 'vulnPer': out.push(`대상의 취약 1마다 피해 +${e.per}. 취약은 줄지 않는다.`); break;
      case 'shieldx': out.push(`방패병에게는 붕괴 ×${e.mul}.`); break;
      case 'pull': out.push('대상이 후열이면 전열로 끌어낸다.'); break;
      case 'vulnGrow': out.push(`대상의 취약을 ${e.mul}배로 만든다(상한 5).`); break;
      case 'chillx': out.push(`둔화된 적에게는 피해 ×${e.mul}.`); break;
      case 'hasten': if (e.on === 'evade') { out.push(`🔄 공격을 피할 때마다 다른 ${s.b} 스킬 쿨타임 −${e.n || 1}.`); break; }
      { const pb = s.fx.find(x => x.k === 'parryBuff'); out.push((e.on === 'parry' ? (pb ? ((pb.times || 1) > 1 ? '🔄 그 흘리기에 성공할 때마다' : '🔄 그 흘리기에 성공하면') : '🔄 그 공격을 흘려 내면') : '🔄 쓰면') + ` 다른 ${s.b} 스킬 쿨타임 −${e.n || 1}.`); break; }
    }
  }
  if (s.fx.filter(e => ['lowx', 'brokenx', 'bigx', 'chillx'].includes(e.k)).length >= 2) out.push('조건이 겹치면 배수를 곱한다.'); // 10월 4일: 박살(붕괴한 정예 · 보스에게 ×2.5 × 1.5) 등
  if (s.killRecharge) out.push(s.once ? '이 스킬로 적을 쓰러뜨리면 한 번 더 쓸 수 있다.' : '이 스킬로 적을 쓰러뜨리면 기다리지 않고 바로 다시 쓸 수 있다.');
  return out.join(' ').replace(/\s+/g, ' ').trim();
}
