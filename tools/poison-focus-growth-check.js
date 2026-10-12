'use strict';
// 현재 전투를 고정한 변경 전 엔진과 비교한다. 자원 수급·소모·행동 보상은 그대로여야 한다.
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),cp=require('child_process'),path=require('path');
const D=require('./dgqa.js'),E=D.G0,rate=Number(process.env.FOCUS_RATE||.02);
const old=cp.execFileSync('git',['show','d82245f:js/10-skills-engine.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
const start=old.indexOf('function runSkill2('),end=old.indexOf('\nfunction sbKindOf(',start);assert(start>=0&&end>start);
D.run_(old.slice(start,end).replace('function runSkill2(', 'function focusBaseline('));
const close=(a,b,m)=>assert(Math.abs(a-b)<1e-7,m+': '+a+'/'+b);
function compare(a,b,m){if(typeof a==='number'&&typeof b==='number')return close(a,b,m);if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),m+' 필드');for(const k of Object.keys(a))compare(a[k],b[k],m+'/'+k);}else assert.deepEqual(a,b,m);}
function trial(build,s,points,resource,track,haste,evade,impl){
 const p=E.mkPlayer(build,{}, {str:10,dex:build==='hunter'?points:15,int:build==='assassin'?points:12,con:10,wil:10}),e=E.mkEnemy('bruiser',false,0);
 e.id='target';e.hp=e.hpMax=1000000;e.evading=evade?1:0;e.strong=track;e.row='front';
 const b=E.newBattle(p,[e],{});b.rngF=()=>.99;p.hp=p.hpMax*.5;p.ward=0;
 if(build==='hunter'){p.focus={id:track?'target':'other',n:resource};if(haste)E.addS(b,p,'haste',haste);}
 else if(resource)E.addS(b,e,'poison',resource);
 const hp=p.hp,hit=[],fn=E.hurtEnemy;
 try{E.hurtEnemy=(b,e,n,o)=>{hit.push(n);return fn(b,e,n,o);};impl(b,E.v2Static(s),e);}finally{E.hurtEnemy=fn;}
 return {hit,heal:p.hp-hp,ward:p.ward,focus:p.focus,cd:p.cd,pState:p.s,eState:e.s,brk:e.brk};
}
let hunter=0,poison=0,pure=0;
for(const s of E.SKILLS2.hunter)for(const dex of [0,10,13,20,23,30,50])for(const focus of [0,1,2,3])for(const track of [false,true])for(const haste of [0,1,2])for(const evade of [false,true]){
 const copy={...s,fx:s.fx.map(f=>f.k==='focusBurst'?{...f,n:f.n*(1+rate*dex)}:f)};
 compare(trial('hunter',s,dex,focus,track,haste,evade,E.runSkill2),trial('hunter',copy,dex,focus,track,haste,evade,E.focusBaseline),s.id+'/'+dex+'/'+focus+'/'+track+'/'+haste+'/'+evade);hunter++;
}
for(const s of E.SKILLS2.assassin)for(const int of [0,10,13,20,30,50])for(const n of [0,1,3,10,20])for(const evade of [false,true]){
 compare(trial('assassin',s,int,n,true,0,evade,E.runSkill2),trial('assassin',s,int,n,true,0,evade,E.focusBaseline),s.id+'/'+int+'/'+n+'/'+evade);poison++;
}
for(const [build,L] of Object.entries(E.SKILLS2))for(const s of L)for(const f of s.fx){
 const p=E.mkPlayer(build,{}, {str:20,dex:30,int:10}),n=7,selected=/^h_/.test(s.id)&&f.k==='focusBurst';
 const legacy=/^m_/.test(s.id)&&['kiBurst','kiPer'].includes(f.k)||/^c_/.test(s.id)&&(f.k==='perDmg'&&['burden','clean'].includes(f.of)||f.k==='cleanse'&&f.offer&&!!f.dmg);
 close(E.skillResourceDamage(p,s,f,n),n*(selected?1+30*rate:legacy?1.2:1),s.id+' 보정 범위');pure++;
}
for(const s of E.SKILLS2.hunter.filter(s=>s.fx.some(f=>f.k==='focusBurst'))){
 const p=E.mkPlayer('hunter',{}, {dex:20},[s.id]),f=s.fx.find(f=>f.k==='focusBurst'),text=E.skillDamageHint(p,s),snapshot=JSON.stringify(p);
 assert(text.includes('추적 1겹당 추가 피해 '+Math.round(f.n*(1+20*rate)*10)/10),s.id+' 현재 계수');
 assert(E.skBody(s).includes('민첩 1점마다 '+Math.round(rate*100)+'%'),s.id+' 성장 설명');
 assert(!E.skBody(s).includes('힘 1점마다 기준값의 1%'),s.id+' 다른 직업의 성장 설명 제외');
 assert(E.statGrowthPreview(p,'dex').includes('장착 스킬 자원 추가 피해'),s.id+' 3점 비교');
 assert.equal(JSON.stringify(p),snapshot,'안내가 자원을 소모하지 않음');
}
for(const s of E.SKILLS2.assassin.filter(s=>s.fx.some(f=>f.k==='burst'))){const p=E.mkPlayer('assassin',{}, {int:20});assert(E.skillDamageHint(p,s).includes('독 격발 배율 1.4배'));assert(E.skBody(s).includes('지능 1점마다 2%'));}
console.log(JSON.stringify({passed:true,rate,hunterCases:hunter,poisonCases:poison,pureCases:pure}));
