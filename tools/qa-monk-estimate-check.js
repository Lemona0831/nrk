'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0,Q=require('./qa');
const selected=E.SKILLS2.monk.filter(s=>s.fx.some(f=>['kiBurst','kiPer'].includes(f.k)));
let cases=0;
for(const s of selected)for(const str of [0,10,30,60])for(const ki of [0,1,2,3,4,5])for(const chill of [0,2])for(const elite of [false,true]){
  const p=E.mkPlayer('monk',{}, {str},[s.id]),e=E.mkEnemy('bruiser',false,0);
  e.hp=e.hpMax=1e6;e.elite=elite;
  const b=E.newBattle(p,[e],{});b.rngF=()=>.99;
  if(ki)E.addS(b,p,'empower',ki);if(chill)E.addS(b,e,'chill',chill);
  // 기본 피해와 기 계수를 대조한다. 자세·회복·상태 부여 등 후속 효과를 제거한다.
  const neutral={...s,tgt:'melee',fx:s.fx.filter(f=>['dmg','kiBurst','kiPer','bigx','chillx'].includes(f.k))},a=E.v2Static(neutral);
  b.curFast=a.time<=.6?1:0;
  const before=JSON.stringify({p,e}),want=Q.qaMonkHit(p,a,e);
  assert.equal(JSON.stringify({p,e}),before,'판단은 기·상태·장비를 변경하지 않음');
  E.runSkill2(b,a,e);
  const actual=1e6-e.hp;
  assert(Math.abs(actual-want.damage)<1e-7,JSON.stringify({id:s.id,str,ki,chill,elite,want,actual}));
  assert.equal(E.st(p,'empower'),want.left,s.id+' 소모 뒤 남은 기');
  if(ki===0&&!chill)assert(want.damage>=Q.qaSkillBase(p,a),'기 없이도 기본 피해 보존');
  assert(want.before<=5,'둔화에서 얻는 기도 공통 상한 적용');
  cases++;
}
console.log(JSON.stringify({passed:true,skills:selected.length,cases,scope:'neutral target, direct base and ki damage; no gear triggers or enemy defense prediction'}));
