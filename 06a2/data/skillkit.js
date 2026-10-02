/* 0.6a.2 개편: 스킬 점수제 v0와 설명 문장 생성기 (docs/0.6a.2-암살자-스킬.md 2절)
   data/skills.js의 스킬 한 줄에서 화면 설명 문장과 점수를 같은 데이터로 만든다. 게임(설명 창, 트리)과 도구(tools/skillscore.js)가 함께 쓴다.
   data 폴더의 예외: 값이 아니라 문장·점수 계산이지만, 게임과 도구가 한 벌만 쓰도록 여기 둔다. 기준값(SKK)은 모두 가설이다. */
const SKK = {
  B: 9.5,                       // 기본 공격 값 (무기 피해 8 + 붕괴 10)
  T: { fast: 0.5, normal: 1, slow: 1.5, vslow: 2 },
  TN: { fast: '빠름', normal: '보통', slow: '느림', vslow: '아주 느림' },
  tmul: { melee: 1, pick: 1, front: 1.5, all: 2.0, self: 0 },
  TGN: { melee: '근접 한 적', pick: '고른 적', front: '전열 모두', all: '모든 적', self: '나' },
  poison: 3,                    // 중독 1의 값
  brk: 0.15,                    // 붕괴 게이지 1의 값 (10 = 1.5)
  S: 4,                         // 쓸 때 대상의 기대 중독 수치 (10월 3일 06a2 실측 3.9)
  ph: 15,                       // 흘리기형 스킬이 막는 공격의 기대 피해 (강타 예고 때 골라 쓰므로 강타가 반)
  pOk: 0.75,                    // 흘리기 성공 확률 (고른 적이 내 다음 차례 전에 친다)
  cond: { apply: 7, parry: 0.8, kill: 3, turn: 14 },  // 기준 전투에서 조건이 일어나는 횟수 (10월 3일 06a2 실측: 전투당 내 차례 14.3, 걸기 7.1, 흘리기 성공 0.8, 처치 3.2)
  budget: { 시작: 30, 기본: 34, 중급: 40, 상급: 50, 궁극: 70 },   // 10월 3일: 06a2 감도 시험(스킬 효과 ×1.3 → 6성향 20%, 신중 35%)에서 등급별 점수 중앙값. 처음 값(20·24·30·42)의 약 1.7배
  Fmax: 6,                      // 한 스킬을 전투에서 쓰는 횟수의 상한 (실측: 바탕 스킬 독니 5.4)
};
const skTri = n => n * (n + 1) / 2;
function skValue(s) {
  const K = SKK; const tm = K.tmul[s.tgt]; const hits = s.hits || 1; let v = 0;
  for (const e of s.fx) {
    switch (e.k) {
      case 'dmg': v += e.n * hits * (s.tgt === 'self' ? 1 : tm); break;
      case 'poison': v += e.n * hits * K.poison * (s.tgt === 'self' ? 1 : tm); break;
      case 'grow': v += K.S * (e.mul - 1) * K.poison + (e.add || 0) * K.poison; break;
      case 'burst': { const S = e.half ? Math.ceil(K.S / 2) : e.top ? Math.min(e.top, K.S) : K.S; const tot = (e.top || e.half) ? (skTri(K.S) - skTri(K.S - S)) : skTri(K.S);
        v += tot * ((e.mul || 1) - 0.5) * (s.tgt === 'all' ? 2 : 1) + (e.keep || 0) * K.S * K.poison + S * (e.brkPer || 0) * K.brk * (s.tgt === 'all' ? 2 : 1); break; }
      case 'exploit': v += e.per * K.S + (e.n || 0); break;
      case 'brk': v += e.n * K.brk * (s.tgt === 'self' ? 1 : tm); break;
      case 'brkPer': v += e.per * K.S * K.brk; break;
      case 'parry': v += K.ph * e.red + 0.5 * 25 * K.brk; break;
      case 'onParry': v += K.pOk * ((e.dmg || 0) + (e.poison || 0) * K.poison + (e.brk || 0) * K.brk); break;
      case 'parryBuff': v += K.ph * e.red * (e.times || 1) + (e.stam || 0) * 0.15 * (e.times || 1) + K.pOk * (e.times || 1) * ((e.dmg || 0) + (e.poison || 0) * K.poison); break;
      case 'execute': v += skTri(K.S) * (e.mul - 1) * 0.5; break;
      case 'capOver': break;
    }
  }
  return v;
}
function skUses(s) { const re = s.ch.every ? SKK.cond[s.ch.on] / s.ch.every : 0; return Math.min(SKK.Fmax, s.ch.max + re + (s.killRecharge ? 0.3 : 0)); }
function skScore(s) { const E = skValue(s); const net = E - SKK.B * SKK.T[s.time]; const F = skUses(s); return { E, net, F, V: net * F, B: SKK.budget[s.tier] }; }

/* 설명 문장. 키워드(중독, 붕괴, 터뜨리기, 흘리기)의 뜻은 설명창의 키워드 칸이 맡고, 스킬 문장은 숫자만 말한다 */
const SK_CHW = { apply: n => n === 1 ? '상태를 걸 때마다' : `상태를 ${n}번 걸 때마다`, parry: n => n === 1 ? '흘리기에 성공할 때마다' : `흘리기에 ${n}번 성공할 때마다`,
  kill: n => n === 1 ? '적을 쓰러뜨릴 때마다' : `적을 ${n}번 쓰러뜨릴 때마다`, turn: n => `내 차례 ${n}번마다` };
function skCharge(s) { return s.ch.every ? `충전 ${s.ch.max} · ${SK_CHW[s.ch.on](s.ch.every)} +1` : '전투마다 1번'; }
function skHead(s) { return `${SKK.TGN[s.tgt]} · ${SKK.TN[s.time]} · ${skCharge(s)}`; }
const skPer = (per, what) => per >= 1 ? `대상의 중독 1마다 ${what} +${per}` : `대상의 중독 ${Math.round(1 / per)}마다 ${what} +1`;
function skBody(s) {
  const out = []; const hits = s.hits || 1; const parts = [];
  for (const e of s.fx) {
    if (e.k === 'dmg') parts.push(`피해 ${e.n}`);
    if (e.k === 'poison') parts.push(`중독 ${e.n}`);
    if (e.k === 'brk') parts.push(`붕괴 +${e.n}`);
  }
  if (parts.length) out.push((hits > 1 ? `${hits}번 찌른다. 한 번마다 ` : '') + parts.join(', ') + '.');
  for (const e of s.fx) {
    switch (e.k) {
      case 'grow': out.push(`대상의 중독을 ${e.mul}배로 만든다.` + (e.add ? ` 그 뒤 중독 ${e.add}.` : '')); break;
      case 'burst':
        out.push((s.tgt === 'all' ? '모든 적의 중독을 모두 터뜨린다.' : e.half ? '대상의 중독을 절반(올림)만 터뜨린다.' : e.top ? `대상의 중독을 ${e.top}만 터뜨린다.` : '대상의 중독을 모두 터뜨린다.')
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
        if (e.stam) buf.push(e.stam >= 30 ? '스태미나가 들지 않는다' : `스태미나 −${e.stam}`);
        out.push((buf.length ? `다음 흘리기 ${t}번은 ${buf.join('. ')}.` : '') + (hit ? ` ${t > 1 ? '흘리기에 성공할 때마다' : '다음 흘리기에 성공하면'} 그 적에게 ${hit}.` : '')); break; }
      case 'execute': out.push(`대상의 생명력이 ${Math.round(e.hp * 100)}% 이하면 터뜨린 피해 ×${e.mul}.`); break;
      case 'capOver': out.push(`이 스킬로 거는 중독은 상한을 넘어 ${e.cap}까지 쌓인다.`); break;
    }
  }
  if (s.killRecharge) out.push('이 스킬로 적을 쓰러뜨리면 한 번 더 쓸 수 있다.');
  return out.join(' ').replace(/\s+/g, ' ').trim();
}
