'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0;
const Q=require(process.env.QA_CALIBRATED||'./qa');
let damage=0,ward=0,resource=0,weapon=0,poison=0;
const close=(a,b,label)=>assert(Math.abs(a-b)<1e-7,label+': '+a+'/'+b);
for(const [build,list] of Object.entries(E.SKILLS2))for(const s of list.filter(s=>s.fx.some(f=>f.k==='dmg')))for(const value of [0,10,30]){
 const p=E.mkPlayer(build,{},Object.fromEntries(['str','dex','int','con','wil'].map(k=>[k,value])),[s.id]);p.hp=p.hpMax;
 const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});b.rngF=()=>.99;
 const neutral={...s,fx:[s.fx.find(f=>f.k==='dmg')],hits:1,tgt:'melee'},a=E.v2Static(neutral),before=JSON.stringify(p),want=Q.qaSkillBase(p,a);
 assert.equal(JSON.stringify(p),before,'판단용 기본 피해 계산은 상태 불변');E.runSkill2(b,a,e);close(1e6-e.hp,want,build+'/'+s.id);damage++;
}
for(const [build,list] of Object.entries(E.SKILLS2))for(const s of list)for(const f of s.fx.filter(f=>f.k==='wardDmg'))for(const n of [0,7,40,200]){
 const p=E.mkPlayer(build,{}, {},[s.id]);p.ward=n;const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;
 const b=E.newBattle(p,[e],{}),before=JSON.stringify({p,f}),want=Q.qaWardBonus(f,n),a=E.v2Static({...s,fx:[f],hits:1,tgt:'melee'});
 assert.equal(JSON.stringify({p,f}),before,'보호막 판단은 보호막을 소모하지 않음');E.runSkill2(b,a,e);close(1e6-e.hp,want,s.id+' 상한·소모');ward++;
}
for(const [build,list] of Object.entries(E.SKILLS2))for(const s of list)for(const f of s.fx)for(const v of [0,10,30]){
 const p=E.mkPlayer(build,{}, {str:v,dex:v},[s.id]),a=E.v2Static(s),before=JSON.stringify({p,f});
 close(Q.qaResource(p,a,f,7),E.skillResourceDamage(p,s,f,7),s.id+' 선택 자원 성장·고정 효과 구분');assert.equal(JSON.stringify({p,f}),before);resource++;
}
for(const build of Object.keys(E.TREE2))for(const stats of [{str:20},{dex:20},{int:20}])for(const eq of [{},{weapon:'hook'}])for(const id of ['basic','heavy']){
 const p=E.mkPlayer(build,eq,stats);p.hp=p.hpMax;const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});b.rngF=()=>.99;
 const before=JSON.stringify(p),want=Q.qaWeaponBase(p,{id});assert.equal(JSON.stringify(p),before);
 E.playerAct(b,id,e.id);close(1e6-e.hp,want,build+'/'+id+' 능력치·무기 페널티');weapon++;
}
for(const s of E.SKILLS2.assassin.filter(s=>s.fx.some(f=>f.k==='burst')))for(const value of [0,10,30])for(const n of [1,4,10]){
 const p=E.mkPlayer('assassin',{}, {int:value},[s.id]),e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});E.addS(b,e,'poison',n);
 const a=E.v2Static({...s,fx:[s.fx.find(f=>f.k==='burst')],hits:1,tgt:'melee'}),before=JSON.stringify({p,e}),want=Q.qaPoisonBurst(p,a,E.st(e,'poison')+(a.s.fx[0].pre||0));
 assert.equal(JSON.stringify({p,e}),before);E.runSkill2(b,a,e);close(1e6-e.hp,want,s.id+' 독 격발 지능 보정');poison++;
}
console.log(JSON.stringify({passed:true,classes:Object.keys(E.TREE2).length,damage,ward,resource,weapon,poison}));
