'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0,Q=require('./qa');
const selected=E.SKILLS2.elementalist.filter(s=>s.fx.some(f=>f.k==='burnOut'));
assert(selected.length>0);
let cases=0;
for(const s of selected)for(const int of [0,5,10,20,30,50])for(const ignite of [0,1,5,10]){
 const p=E.mkPlayer('elementalist',{}, {int},[s.id]),e=E.mkEnemy('bruiser',false,0);
 e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});b.rngF=()=>.99;
 if(ignite)E.addS(b,e,'ignite',ignite);
 const n=E.st(e,'ignite'),neutral={...s,tgt:'melee',fx:s.fx.filter(f=>['dmg','burnOut'].includes(f.k))},a=E.v2Static(neutral);
 const before=JSON.stringify({p,e}),base=Q.qaSkillBase(p,a)*(s.hits||1),burn=Q.qaBurnDamage(p,a,n);
 assert.equal(JSON.stringify({p,e}),before,'추정 계산은 화상·능력치·생명력 불변');
 E.runSkill2(b,a,e);
 assert(Math.abs((1e6-e.hp)-(base+burn))<1e-7,s.id+'/'+int+'/'+ignite+' 실제 첫 타격 화상 소모 피해');
 assert.equal(E.st(e,'ignite'),0,'피해 뒤 화상 소모');cases++;
}
console.log(JSON.stringify({passed:true,skills:selected.length,cases}));
