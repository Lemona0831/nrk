'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0;
// 같은 현재 엔진에서 두 소모 피해의 성장 계수만 이전 2%로 되돌려 대조한다.
D.run_('var oldTriggerSkill = '+E.runSkill2.toString().replaceAll('triggerDamageMul(p)','dotMul(p)')+';');
D.run_('var oldTriggerShock = '+E.elemShock.toString().replaceAll('triggerDamageMul(b.p)','dotMul(b.p)')+';');
const close=(a,b,label)=>assert(Math.abs(a-b)<1e-6,label+': '+a+'/'+b);
function battle(build,int){
 const p=E.mkPlayer(build,{}, {int,con:10,wil:10}),e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;e.id='target';
 const b=E.newBattle(p,[e],{});b.rngF=()=>.99;p.hp=p.hpMax/2;return {p,e,b};
}
function poison(s,int,n,strong,evade,old){
 const {p,e,b}=battle('assassin',int);e.strong=strong;e.evading=evade?1:0;if(n)E.addS(b,e,'poison',n);
 const hits=[],fn=E.hurtEnemy;try{E.hurtEnemy=(b,e,n,o)=>{hits.push(n);return fn(b,e,n,o);};(old?E.oldTriggerSkill:E.runSkill2)(b,E.v2Static(s),e);}finally{E.hurtEnemy=fn;}
 return {hits,damage:1e6-e.hp,state:JSON.stringify({p:p.s,e:e.s,ward:p.ward,heal:p.hp,focus:p.focus,brk:e.brk,cd:p.cd})};
}
let poisonCases=0,shockCases=0;
const list=E.SKILLS2.assassin.filter(s=>s.fx.some(f=>f.k==='burst'));assert(list.length>0);
for(const s of list)for(const int of [0,5,10,20,30,50])for(const n of [0,1,5,10,20])for(const strong of [false,true])for(const evade of [false,true]){
 // 전체 스킬의 상태·회복·쿨타임도 대조한다.
 const a=poison(s,int,n,strong,evade,false),b=poison(s,int,n,strong,evade,true);
 assert.equal(a.state,b.state,s.id+' 상태·회복·보호막·붕괴·쿨타임');
 // 별도 기본 피해를 제외하고 독 격발만으로 성장률을 대조한다.
 const pure={...s,fx:s.fx.filter(f=>['burst','capOver'].includes(f.k)),hits:1};
 const x=poison(pure,int,n,strong,evade,false),y=poison(pure,int,n,strong,evade,true);
 close(x.damage,y.damage*(1+.03*int)/(1+.02*int),s.id+' 독 격발');
 if(int===0)close(a.damage,b.damage,s.id+' 무투자 불변');poisonCases++;
}
for(const int of [0,5,10,20,30,50])for(const ignite of [0,1,5,10])for(const chill of [0,1,5,10])for(const multi of [false,true]){
 function trial(old){const {p,e,b}=battle('elementalist',int);if(ignite)E.addS(b,e,'ignite',ignite);if(chill)E.addS(b,e,'chill',chill);b.actN=1;
  const skill={id:'e_test',kind:'spell',tgt:multi?'all':'pick',fx:[]},preview=E.elemPreview(b,skill,e,multi);b.shockCtx={ids:[e.id],multi};
  (old?E.oldTriggerShock:E.elemShock)(b,'me');return {damage:1e6-e.hp,preview:preview.d,state:JSON.stringify({p:p.s,e:e.s,brk:e.brk,hp:p.hp,ward:p.ward})};}
 const a=trial(false),b=trial(true);close(a.damage,b.damage*(1+.03*int)/(1+.02*int),'열충격 성장');close(a.damage,a.preview,'열충격 미리보기');assert.equal(a.state,b.state,'열충격 상태 소비·붕괴·생존 불변');shockCases++;
}
for(const build of Object.keys(E.TREE2))for(const int of [0,10,20,50]){
 const p=E.mkPlayer(build,{}, {int});close(E.dotMul(p),1+.02*int,build+' 지속 피해 2% 유지');close(E.triggerDamageMul(p),1+.03*int,'소모 피해 3%');
}
const p=E.mkPlayer('assassin',{}, {int:20},[list[0].id]);assert(E.skillDamageHint(p,list[0]).includes('1.6배'));assert(E.statNext(p,'int').includes('독 격발 피해 +60% → +63%'));
const ep=E.mkPlayer('elementalist',{}, {int:20});assert(E.statNext(ep,'int').includes('열충격 피해 +60% → +63%'));assert(E.statGrowthPreview(ep,'int').includes('열충격 피해'));
console.log(JSON.stringify({passed:true,poisonSkills:list.length,poisonCases,shockCases}));
