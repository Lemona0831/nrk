'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_;
const aegis=E.SK2.sb_aegis,rebound=E.SK2.sb_rebound;
assert.equal(aegis.cd,5);assert.equal(aegis.time,'fast');assert(!aegis.fx.some(f=>f.k==='stam'));
const p=E.mkPlayer('spellblade',{}, {wil:24});p.st=10;p.ward=0;
const e=E.mkEnemy('bruiser',false,0),b=E.newBattle(p,[e],{});
E.runSkill2(b,E.v2Static(aegis),null);
assert.equal(p.st,10);assert.equal(E.st(p,'protect'),1);assert(Math.abs(p.ward-7*1.48)<1e-6);
const af=rebound.fx.find(f=>f.k==='alt');assert.equal(af.stam,10);
for(const alt of [false,true]){
 p.st=10;b.sbK='spell';b.sbAlt=alt;b.sbRunNow=1;b.over=null;
 e.hp=e.hpMax=10000; E.runSkill2(b,E.v2Static(rebound),e); E.sbEnd(b,E.v2Static(rebound));assert.equal(p.st,alt?20:10);
}
console.log('주문 방패: 보호막·보호·회복 삭제, 반향 주문: 교대시에만 +10 통과');
// 현재 장비 규칙은 고정하고 이번 두 스킬만 전후 비교. 실제 기록 재생은 아니다.
const original=JSON.parse(JSON.stringify(aegis)),originalRe=JSON.parse(JSON.stringify(rebound));
function trial(ch,seed,respond){
 const stats=ch===1?{con:14,wil:6}:ch===2?{con:30,wil:24}:{con:38,wil:28},lv=ch===1?3:ch===2?10:14;
 const eq=ch===1?{weapon:'start_wpn_spellblade',armor:'start_armor',flask:'start_flask'}:{weapon:'bloodblade',armor:'mournshroud',gloves:'bonesetter',amulet:'bloatcharm',ring1:'volleyring',ring2:'ledger',flask:'poisoneater'};
 const skills=['sb_edge','sb_aegis','sb_bolt','sb_rebound','sb_rhythm','sb_sunder'];
 const p=E.mkPlayer('spellblade',eq,stats,skills);p.lv=lv;E.applyStats(p,stats);p.hp=p.hpMax;p.st=p.stMax;
 const room={ch,lv:[3,10,14][ch-1],floor:24,names:V('ENEMY_NAMES['+ch+']'),path:'main',en:[],boss:1};
 const b=E.roomBattle(p,room,['abbot','cryptlord','queen'][ch-1],seed);b.rngF=require('./qa.js').rng(seed);
 let n=0,low=0;
 while(!b.over&&n++<250){
  const L=E.actionList(b).filter(a=>a.ok&&a.id!=='flee');let a;
  if(respond&&E.alive(b).some(e=>e.intent&&e.intent.charged))a=L.find(x=>x.id==='guard');
  if(respond&&p.hp/p.hpMax<.35)a=L.find(x=>x.id==='flaskL')||a;
  a=a||['sb_aegis','sb_rebound','sb_bolt','sb_sunder','sb_rhythm','sb_edge','heavy','basic'].map(id=>L.find(x=>x.id===id)).find(Boolean)||L[0];
  if(!a)break;if(p.st<30)low++;
  const t=E.alive(b).find(e=>E.canTarget(b,e,a));E.playerAct(b,a.id,t&&t.id);
 }
 return {win:b.over==='win',hp:p.hp/p.hpMax,low};
}
for(const old of [true,false]){
 Object.assign(aegis,JSON.parse(JSON.stringify(original)));Object.assign(rebound,JSON.parse(JSON.stringify(originalRe)));
 if(old){aegis.cd=4;aegis.fx=[{k:'ward',n:7},{k:'st',s:'protect',n:2},{k:'stam',n:27}];rebound.fx.find(f=>f.k==='alt').stam=25;}
 for(let ch=1;ch<=3;ch++)for(const respond of [false,true]){
  const rows=Array.from({length:12},(_,i)=>trial(ch,300+i,respond));
  console.log(JSON.stringify({version:old?'before':'after',ch,respond,wins:rows.filter(x=>x.win).length,hp:+(rows.reduce((s,x)=>s+x.hp,0)/12).toFixed(3),lowStam:rows.reduce((s,x)=>s+x.low,0)}));
 }
}



