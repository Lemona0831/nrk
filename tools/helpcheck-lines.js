'use strict';
// 0.8.0 M5-0a 승부수 설명란(10월 20일 만든 사람): 대사(line)는 따로 한 칸, 효과 · 대가 · 대상은 아래 줄. 대사 문장과 효과 · 대가 숫자를 코드 값과 대조한다.
module.exports = function ({ E, add, note, source }) {
  const FIN = ['sb_kalpa', 'sb_sinwall', 'sb_firebody'];
  const rows = FIN.flatMap(id => { const s = E('SK2')[id]; return [{ id: id + ':line', text: s.line }, { id: id + ':fx', text: s.fx.map(f => f.txt).join(' ') }, { id: id + ':pay', text: '대가: ' + s.pay }]; });
  source('skill-lines', rows);
  add('skill-lines', '피와 화염이 몸을 감싸니', '겁화 line · cut=blade, 효과 글에 대사 없음', E => E('SK2.sb_kalpa.cut') === 'blade' && !/「/.test(E('SK2.sb_kalpa.fx[0].txt')));
  add('skill-lines', '죄인의 피가 오만방자하게도', '죄인의 벽 line · cut=guard, 효과 글에 대사 없음', E => E('SK2.sb_sinwall.cut') === 'guard' && !/「/.test(E('SK2.sb_sinwall.fx[0].txt')));
  add('skill-lines', '과거의 유산은, 결국 자신도', '불의 몸 line · cut=arcane, 효과 글에 대사 없음', E => E('SK2.sb_firebody.cut') === 'arcane' && !/「/.test(E('SK2.sb_firebody.fx[0].txt')));
  add('skill-lines', '3차례 동안 모든 베기에 혈염', 'sbBlaze n=3, SB_BOUND.blazeHit=0.6', E => E('SK2.sb_kalpa.fx[0].n') === 3 && E('SB_BOUND.blazeHit') === 0.6);
  add('skill-lines', '받는 피해 +30%', 'SB_BOUND.blazeIn=0.3', E => E('SB_BOUND.blazeIn') === 0.3);
  add('skill-lines', '최대 생명력 15%를 바친다', 'SB_BOUND.sinPay=0.15', E => E('SB_BOUND.sinPay') === 0.15);
  add('skill-lines', '바친 생명력의 3배만큼 보호막', 'SB_BOUND.sinMul=3, sinBleed=5', E => E('SB_BOUND.sinMul') === 3 && E('SB_BOUND.sinBleed') === 5);
  add('skill-lines', '3차례 "불의 몸"', 'sbFireBody n=3, bodyPer=8, 강공격 배율 1+bodyMul=1.8, bodyIgn=4', E => E('SK2.sb_firebody.fx[0].n') === 3 && E('SB_BOUND.bodyPer') === 8 && Math.abs(1 + E('SB_BOUND.bodyMul') - 1.8) < 1e-9 && E('SB_BOUND.bodyIgn') === 4);
  add('skill-lines', '그동안 유산 0', '불의 몸 동안 ysAdd 0(22번 fireBody 검사)', E => /sbSt\.fireBody \? 0/.test(E('ysAdd.toString()')));
  add('skill-lines', '깨지면 전열 모두에게 출혈 5', 'SB_BOUND.sinBleed=5', E => E('SB_BOUND.sinBleed') === 5);
};
