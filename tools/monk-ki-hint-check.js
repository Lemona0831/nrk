'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0,G=E.__G,r1=D.run_('r1');
G.data={};let cases=0;
const SK2=D.run_('SK2'); // M8: 게임은 방사 트리가 다시 정의한 SK2를 읽는다(SKILLS2는 옛 정의가 남은 목록)
for(const s of E.SKILLS2.monk.map(s=>SK2[s.id]||s).filter(s=>s.fx.some(f=>['kiBurst','kiPer'].includes(f.k))))for(const str of [0,10,30])for(const ki of [0,1,3,5])for(const chill of [0,2]){
  const p=E.mkPlayer('monk',{}, {str},[s.id]),e=E.mkEnemy('bruiser',false,0);
  e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});
  if(ki)E.addS(b,p,'empower',ki);if(chill)E.addS(b,e,'chill',chill);
  G.b=b;G.sel=e.id;
  const a=E.v2Static(s),snapshot=JSON.stringify({p,e}),hint=E.skillHint0(b,a),kb=s.fx.find(f=>f.k==='kiBurst'),kp=s.fx.find(f=>f.k==='kiPer');
  assert.equal(JSON.stringify({p,e}),snapshot,'안내가 기·적 상태를 변경하지 않음');
  const take=kb?Math.min(kb.max||5,5,ki+(kb.pre&&chill?kb.pre:0)):ki;
  if(take===0){const base=s.fx.find(f=>f.k==='dmg');assert(hint.includes('기 없음 · 기본 피해 '+r1(E.skillBaseDamage(p,s,base.n))),s.id+'/'+hint);if((s.hits||1)>1)assert(hint.includes(' × '+s.hits+'타'));}
  else if(kb&&kb.mul&&!kb.per)assert(hint.includes('피해 +'+Math.round(kb.mul*take*100)+'%'),s.id+'/'+hint); // M5-2 붕권: 기마다 배율
  else assert(hint.includes('추가 피해 +'+r1(E.skillResourceDamage(p,s,kb||kp,take*(kb||kp).per))),s.id+'/'+hint);
  assert(!/NaN|undefined|Infinity/.test(hint));cases++;
  const popup=E.infoHtml('act:'+s.id);
  assert(popup.includes('지금: '+hint),'버튼과 설명 창의 현재 안내 일치');
  assert.equal(JSON.stringify({p,e}),snapshot,'설명 창도 전투 상태 불변');
}
console.log(JSON.stringify({passed:true,cases}));
