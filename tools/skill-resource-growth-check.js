/* 폐기(0.8.0 M8): 10월 커밋 fc12dad의 runSkill2와 지금 엔진을 대조하는 일회성 비교. 0.8.0 M5-0(쿨타임 → 유산 비용)과 수도승 재설계와 숨은 직업 정리로 엔진이 일부러 갈라져 대조 기준이 의미를 잃었다. 파일은 기록으로 남긴다. 그래도 돌리려면 RUN_RETIRED=1 */
'use strict';
if (!process.env.RUN_RETIRED) { console.log('폐기(0.8.0 M8): skill-resource-growth-check — 보관된 기능 · 일회성 비교라 건너뜀(RUN_RETIRED=1이면 돈다)'); process.exit(0); }
// 실제 자원·연속 타격·광역·회피와 설명을 검증된 후보 구현에 대조한다.
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),cp=require('child_process'),path=require('path');
const D=require('./dgqa.js'),E=D.G0;
const baseline=cp.execFileSync('git',['show','fc12dad:js/10-skills-engine.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
const start=baseline.indexOf('function runSkill2('),end=baseline.indexOf('\nfunction sbKindOf(',start);
assert(start>=0&&end>start);
D.run_(baseline.slice(start,end).replace('function runSkill2(', 'function resourceBaseline('));
const close=(a,b,label)=>assert(Math.abs(a-b)<1e-7,label+': '+a+' / '+b);
function same(a,b,label){if(typeof a==='number'&&typeof b==='number')return close(a,b,label);if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),label+' 필드');for(const k of Object.keys(a))same(a[k],b[k],label+'/'+k);}else assert.deepEqual(a,b,label);}
// 고정한 기준 커밋의 전투 구현과 사전에 검증한 후보 계수를 사용한다.
const selected=(s,f)=>/^m_/.test(s.id)&&['kiBurst','kiPer'].includes(f.k)||/^c_/.test(s.id)&&(f.k==='perDmg'&&['burden','clean'].includes(f.of)||f.k==='cleanse'&&f.offer&&!!f.dmg);
const skills=Object.entries(E.SKILLS2).flatMap(([build,L])=>L.map(s=>({build,s})));
let pure=0,engine=0,positive=0,unchanged=0;
for(const {build,s} of skills)for(const f of s.fx){const p=E.mkPlayer(build,{}, {str:20}),before=JSON.stringify({p,s});const actual=E.skillResourceDamage(p,s,f,7);close(actual,7*(selected(s,f)?1.2:1),s.id+' 범위');assert.equal(JSON.stringify({p,s}),before,'표시는 상태를 바꾸지 않음');pure++;}
function trial(build,s,str,wil,n,count,evade,impl){
  const p=E.mkPlayer(build,{}, {str,wil,con:10}),en=Array.from({length:count},()=>E.mkEnemy('bruiser',false,0));
  en.forEach((e,i)=>{e.id='growth'+i;e.hp=e.hpMax=1000000;e.row='front';if(evade)e.evading=1;});
  const b=E.newBattle(p,en,{});b.rngF=()=>.99;p.hp=p.hpMax*.5;p.ward=0;
  if(build==='monk'){E.addS(b,p,'empower',n);E.addS(b,en[0],'chill',2);}
  if(build==='confessor'){E.addS(b,p,'bleed',n);p.selfN={bleed:Math.floor(n/2)};E.addS(b,p,'protect',n);b.cleanTurn=n;b.prepTurn=b.turnIdx;for(const e of en){E.addS(b,e,'weak',n);E.addS(b,e,'bleed',n);}}
  const pHp=p.hp,hit=[];const oldHit=E.hurtEnemy;
  try{E.hurtEnemy=(b,e,x,o)=>{hit.push(x);return oldHit(b,e,x,o);};impl(b,E.v2Static(s),en[0]);}finally{E.hurtEnemy=oldHit;}
  return {hit,heal:p.hp-pHp,ward:p.ward,ki:E.st(p,'empower'),protect:E.st(p,'protect'),bleed:E.st(p,'bleed'),selfN:p.selfN,clean:b.cleanTurn,kiPend:b.kiPend,cd:p.cd,brk:en.map(e=>e.brk),state:en.map(e=>e.s)};
}
for(const {build,s} of skills.filter(({build})=>['monk','confessor'].includes(build)))for(const str of [0,10,13,20,40,50])for(const wil of [0,20])for(const n of [0,1,3,5])for(const count of [1,3])for(const evade of [false,true]){
  const copy={...s,fx:s.fx.map(f=>selected(s,f)?{...f,...(f.k==='cleanse'?{dmg:f.dmg*(1+str*.01)}:{per:f.per*(1+str*.01)})}:f)};
  const actual=trial(build,s,str,wil,n,count,evade,E.runSkill2),expected=trial(build,copy,str,wil,n,count,evade,E.resourceBaseline);
  same(actual,expected,build+'/'+s.id+'/'+str+'/'+wil+'/'+n+'/'+count+'/'+evade);engine++;
  const hint=E.skillDamageHint(E.mkPlayer(build,{}, {str}),s);for(const f of s.fx.filter(f=>selected(s,f)))assert(hint.includes(String(Math.round((f.k==='cleanse'?f.dmg:f.per)*(1+str*.01)*10)/10)),'현재 추가 피해 계수 표시');
  if(s.fx.some(f=>selected(s,f))) {const original=trial(build,s,str,wil,n,count,evade,E.resourceBaseline);const gain=actual.hit.reduce((a,b)=>a+b,0)-original.hit.reduce((a,b)=>a+b,0);assert(gain>=-1e-7,'추가 피해를 줄이지 않음');if(gain>1e-7)positive++;}else unchanged++;
}
console.log(JSON.stringify({passed:true,pureCases:pure,engineCases:engine,resourceExposedCases:positive,unaffectedSkillCases:unchanged}));
