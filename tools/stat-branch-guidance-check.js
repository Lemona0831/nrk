'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0;
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const guide=p=>D.run_('statBranchGuidance')(p);
let branches=0,hits=0,limits=0;
function unit(build,s,stats){
 const p=E.mkPlayer(build,{},stats,[s.id]),e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;
 const b=E.newBattle(p,[e],{});p.hp=p.hpMax*.3;
 E.runSkill2(b,E.v2Static({...s,fx:[{k:'dmg',n:10}]}),e);return 1e6-e.hp;
}
for(const build of Object.keys(E.TREE2)){
 const p=E.mkPlayer(build,{},{}),before=JSON.stringify(p),rows=guide(p);
 assert.equal(JSON.stringify(p),before,'안내 생성은 상태를 바꾸지 않음');
 assert.equal(rows.length,3);assert.deepEqual(Array.from(rows,x=>x.branch),Array.from(E.TREE2[build].branches));
 for(const {branch,text} of rows){
  assert(text.length>15&&!/NaN|undefined/.test(text));
  const skill=E.SKILLS2[build].find(s=>s.b===branch&&s.fx.some(f=>f.k==='dmg'&&f.n>0));assert(skill);
  const expected=build==='assassin'||build==='hunter'?'dex':build==='elementalist'||build==='bloodmage'?'int':E.skillGrowthStat(skill);
  close(unit(build,skill,{[expected]:3})/unit(build,skill,{}),1.12);hits++;branches++;
 }
 const b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{}),base=E.outDmg(b,E.basicBase(p),{weapon:1});
 p.stat.str=3;close(E.outDmg(b,E.basicBase(p),{weapon:1})/base,1.03);
 p.stat.str=0;p.stat.int=3;close(E.dotMul(p),1.06);limits++;
}
for(const build of ['warden','spellblade'])for(const con of [0,20]){
 const gains=[],fills=[];
 for(const wil of [0,3]){
  const p=E.mkPlayer(build,{}, {con,wil}),b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{});p.ward=0;
  gains.push(E.addWard(b,p,5));p.ward=0;
  const s=E.SKILLS2[build].find(s=>s.fx.some(f=>f.k==='wardFill'));
  E.runSkill2(b,E.v2Static(s),b.en[0]);const goal=Math.round(E.wardMax(p)*(s.fx.find(f=>f.k==='wardFill').to||1));
  close(p.ward,goal);fills.push(goal);limits++;
 }
 close(gains[1]/gains[0],1.06);close(fills[0],fills[1]);
}
for(const why of ['leech','eat','harvest']){
 const gained=[];
 for(const wil of [0,30]){
  const p=E.mkPlayer('butcher',{}, {wil}),b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{});p.hp=1;
  gained.push(E.bHeal(b,10000,why));limits++;
 }
 close(gained[0],gained[1]);
}
const s=E.SKILLS2.bloodmage.find(s=>s.fx.some(f=>f.k==='hpCost'));
const cost=con=>{const p=E.mkPlayer('bloodmage',{}, {con}),b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{}),old=p.hp;E.runSkill2(b,E.v2Static({...s,fx:[{k:'hpCost',pct:.1}]}),b.en[0]);return old-p.hp;};
assert(cost(20)>cost(0),'생명력 비율 비용의 절대량은 체력 투자로 커짐');limits++;
assert.equal(guide({build:'unsupported'}).length,0);
console.log(JSON.stringify({passed:true,classes:9,branches,engineGrowthChecks:hits,resourceAndLimitChecks:limits}));
