'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),cp=require('child_process'),D=require('./dgqa.js'),E=D.G0;
const primary={assassin:'dex',hunter:'dex',elementalist:'int',bloodmage:'int'};
const old=cp.execFileSync('git',['show','980af39:js/32-player-action.js'],{cwd:require('path').resolve(__dirname,'..'),encoding:'utf8'});
const previous=D.run_('('+old.slice(old.indexOf('function outDmg('),old.indexOf('function applyReflux('))+')');
const close=(a,b,label)=>assert(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
const round=n=>Math.round(n*10)/10,clone=x=>JSON.parse(JSON.stringify(x));let multipliers=0,legacy=0,actions=0,previews=0,gear=0;
for(const build of Object.keys(E.TREE2))for(const str of [0,3,10,20,33])for(const attack of [0,3,10,20,33])for(const lv of [1,5,10,16])for(const eq of [{},{weapon:'hook',amulet:'bloodpact',ring1:'pulse'},{weapon:'twin',gloves:'ragechain'}]){
 const p=E.mkPlayer(build,eq,{str,dex:attack,int:attack,con:10,wil:10});p.lv=lv;E.applyStats(p,p.stat);p.hp=p.hpMax*.3;
 const b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{}),expected=primary[build]?Math.max(str,attack):str;
 close(E.weaponStatBonus(p),expected*.01,'영구 공격 보너스');
 const ratio=(1+expected*.01)/(1+str*.01);
 for(const k of ['basic','heavy','skill']){
  const n=k==='basic'?E.basicBase(p):k==='heavy'?E.heavyBase(p):10,o=k==='skill'?{skill:1}:{weapon:1};
  const a=clone(b),c=clone(b);a.p.s.weak=c.p.s.weak=1;a.p.s.empower=c.p.s.empower=2;a.p.furyNext=c.p.furyNext=1;a.p.rcN=c.p.rcN=2;
  const before=previous(a,n,o),after=E.outDmg(c,n,o);close(after,before*(k==='skill'?1:ratio),'최종 피해 경로');
  assert.deepEqual(c.p,a.p,'장비·상태 소모 불변');assert.deepEqual(c,a,'행동 표시·장비 발동 불변');multipliers++;
  if(!primary[build]||str>=attack||k==='skill'){close(after,before,'기존 투자·다른 피해 경로 보존');legacy++;}
 }
 const s=E.growthSnapshot(p);close(s.attack,round(E.basicBase(p)*(1+expected*.01)),'영구 공격 성장 표시');close(s.str,expected,'공격 보너스 성장 표시');gear++;
 for(const k of ['str','dex','int']){
  const before=JSON.stringify(p),up=clone(p);E.applyStats(up,{...up.stat,[k]:up.stat[k]+3});
  const text=E.statGrowthPreview(p,k),next=E.statNext(p,k),g0=1+E.weaponStatBonus(p),g1=1+E.weaponStatBonus(up);
  assert.equal(JSON.stringify(p),before);const relevant=k==='str'||k===primary[build];
  if(relevant){assert(text.includes('기본·강공격 피해 +'+round((g1/g0-1)*100)+'%'),'현재 피해 대비 증가율과 문턱');assert(next.includes('기본·강공격 피해 보너스'));previews++;}
  else assert(!text.includes('기본·강공격 피해'),build+'/'+k+' 무관한 능력치');
 }
}
// 실제 기본·강공격을 실행한다. 시간 진행을 끄고 공격·붕괴·스태미나 경로를 확인한다.
const finish=E.finishPlayer;E.finishPlayer=()=>{};
for(const build of Object.keys(E.TREE2))for(const str of [0,20])for(const attack of [0,10,33])for(const id of ['basic','heavy']){
 const p=E.mkPlayer(build,{}, {str,dex:attack,int:attack,con:10}),e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=10000;
 const b=E.newBattle(p,[e],{});b.stepMode=true;b.q=[p.id];b.qi=0;b.now=p.id;
 const raw=id==='basic'?E.basicBase(p):E.heavyBase(p),expected=E.outDmg(clone(b),raw,{weapon:1}),hit=E.hurtEnemy;let damage=0;
 E.hurtEnemy=(battle,target,n,o)=>{damage+=n;return hit(battle,target,n,o);};
 const stamina=p.st;E.playerAct(b,id,e.id);E.hurtEnemy=hit;
 close(damage,expected,'실제 행동의 피해');
 close(stamina-p.st,id==='heavy'?D.run_('heavyCost')(p):0,'행동 비용');
 assert(e.brk>0||E.st(e,'broken')>0,'붕괴 경로 유지 '+build+'/'+str+'/'+attack+'/'+id);actions++;
}
E.finishPlayer=finish;
console.log(JSON.stringify({passed:true,classes:9,multipliers,legacy,actions,previews,gear}));
