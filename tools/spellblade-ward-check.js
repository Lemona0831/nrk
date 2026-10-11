'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_;
const limits={sb_bolt:12,sb_wardbolt:18,sb_spellguard:16,sb_barrage:22};
for(const [id,cap] of Object.entries(limits)){
 const s=E.SK2[id],f=s.fx.find(x=>x.k==='wardDmg');
 for(const ward of [0,1,5,33,60,300]){
  const w=E.wardDamageInfo(f,ward);assert(w.bonus<=cap);assert(w.take<=ward);assert(w.take>=0);
  const p=E.mkPlayer('spellblade',{},{});p.ward=ward;
  const es=[0,1].map(i=>{const e=E.mkEnemy('bruiser',false,i);e.hp=e.hpMax=10000;return e});
  const b=E.newBattle(p,es,{});E.runSkill2(b,E.v2Static({...s,fx:s.fx.filter(x=>x.k!=='ward')}),es[0]);
  assert.equal(p.ward,ward-w.take,id);assert.equal(b.rec.filter(x=>x.k==='wardSpend').length,f.spend&&ward>0?1:0);
  if(f.spend){assert(E.skBody(s).includes(f.drainAll ? '전부 소모' : '50%'));assert(E.skBody(s).includes('최대 '+cap));}
 }
 assert.equal(E.wardDamageInfo(f,10000).bonus,cap);
}
const w=E.SK2.w_press.fx.find(x=>x.k==='wardDmg');assert.deepEqual(JSON.parse(JSON.stringify(E.wardDamageInfo(w,100))),{take:0,bonus:50});
assert.equal(E.wardDamageInfo(E.SK2.sb_wardbolt.fx.find(x=>x.k==='wardDmg'),33).bonus,16.5);
assert.equal(E.wardDamageInfo(E.SK2.sb_wardbolt.fx.find(x=>x.k==='wardDmg'),5).bonus,2.5);
// 실제 전달 피해와 상급 포격의 보호막 +3이 미리보기 계산을 바꾸지 않는지 확인.
const hurt=E.hurtEnemy;
try {
 for(const [id,cap] of Object.entries(limits))for(const ward of [0,5,33,300]){
  const s=E.SK2[id],f=s.fx.find(x=>x.k==='wardDmg'),w=E.wardDamageInfo(f,ward);
  const p=E.mkPlayer('spellblade',{},{});p.ward=ward;
  const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=10000;
  const b=E.newBattle(p,[e],{});const values=[];
  E.hurtEnemy=(b,e,d)=>{values.push(d);return d};
  E.runSkill2(b,E.v2Static(s),e);
  assert(Math.abs(values[0]-(E.skillBaseDamage(p,s,s.fx.find(x=>x.k==='dmg').n)+w.bonus))<1e-9,id+' 실제 피해');
  assert.equal(b.rec.find(x=>x.k==='wardSpend')?.bonus||0,f.spend?Math.round(w.bonus*10)/10:0);
 }
} finally {E.hurtEnemy=hurt;}
console.log('보호막 상한·0/부족/소수·실제 소모·광역 한 번 소모·파수꾼 기존 동작 통과');
// 같은 장비/성장 방향에서 고정 반복과 적 공격에 대응하는 운용을 비교한다.
const original=Object.fromEntries(Object.keys(limits).map(id=>[id,JSON.parse(JSON.stringify(E.SK2[id].fx))]));
const shellTime=E.SK2.sb_shell.time,shellCd=E.SK2.sb_shell.cd;
function version(old){E.SK2.sb_shell.time=old?'fast':shellTime;E.SK2.sb_shell.cd=old?6:shellCd;for(const id of Object.keys(limits)){E.SK2[id].fx=JSON.parse(JSON.stringify(original[id]));if(old){const f=E.SK2[id].fx.find(x=>x.k==='wardDmg');delete f.cap;delete f.spend;f.per=.5;}}}
function trial(ch,seed,respond,weapon="bloodblade"){
 const lv=[6,10,14][ch-1],stats={con:25+(lv-6)*2,dex:0,int:0,str:0,wil:11+(lv-6)};
 const skills=['sb_edge','sb_aegis','sb_shell','sb_rebound','sb_wardbolt','sb_bolt'];
 const p=E.mkPlayer('spellblade',{weapon:weapon==='bloodblade-noheal'?'bloodblade':weapon,armor:'shroud',gloves:'hookgloves',amulet:'brotherbeads',ring1:'loner',flask:'start_flask'},stats,skills);
 p.lv=lv;E.applyStats(p,stats);p.hp=p.hpMax;p.st=p.stMax;p.mp=p.mpMax;
 const room={ch,lv:[5,10,14][ch-1],floor:24,names:V('ENEMY_NAMES['+ch+']'),path:'main',en:[],boss:1};
 const bloodFx=V('IFX.bloodblade'),hit=bloodFx.onHit;
 if(weapon==='bloodblade-noheal')bloodFx.onHit=()=>0;
 const b=E.roomBattle(p,room,['abbot','cryptlord','queen'][ch-1],seed);b.rngF=require('./qa.js').rng(seed);
 let n=0;while(!b.over&&n++<250){
  const L=E.actionList(b).filter(a=>a.ok&&a.id!=='flee');
  let a;
  if(respond&&E.alive(b).some(e=>e.intent&&e.intent.charged))a=L.find(x=>x.id==='guard');
  if(respond&&p.hp/p.hpMax<.35)a=L.find(x=>x.id==='flaskL')||a;
  a=a||['sb_shell','sb_wardbolt','sb_bolt','sb_rebound','sb_aegis','sb_edge','heavy','basic','flaskS','guard'].map(id=>L.find(x=>x.id===id)).find(Boolean)||L[0];
  if(!a)break;const t=E.alive(b).find(e=>E.canTarget(b,e,a));E.playerAct(b,a.id,t&&t.id);
 }
 bloodFx.onHit=hit;
 return {win:b.over==='win',hp:p.hp/p.hpMax,zero:b.rec.filter(x=>x.k==='hit'&&x.d===0).length,hits:b.rec.filter(x=>x.k==='hit').length};
}
version(false);
for(let ch=1;ch<=3;ch++)for(const respond of [false,true]){const rows=Array.from({length:12},(_,i)=>trial(ch,300+i,respond));console.log(JSON.stringify({ch,respond,wins:rows.filter(x=>x.win).length,hp:+(rows.reduce((s,x)=>s+x.hp,0)/rows.length).toFixed(3)}));}


// 10월 11일 정량 충전 전후와 흡혈 무기의 효과를 분리한다.
const shellFx=JSON.parse(JSON.stringify(E.SK2.sb_shell.fx));
for(const fill of [true,false]){
 E.SK2.sb_shell.fx=fill?shellFx.map(f=>f.k==='ward'?{k:'wardFill',to:1}:f):shellFx;
 for(let ch=1;ch<=3;ch++)for(const weapon of ['bloodblade','bloodblade-noheal']){
  const rows=Array.from({length:12},(_,i)=>trial(ch,300+i,false,weapon));
  console.log(JSON.stringify({fill:fill?'full':'fixed18',ch,weapon,wins:rows.filter(x=>x.win).length,hp:+(rows.reduce((s,x)=>s+x.hp,0)/rows.length).toFixed(3)}));
 }
}
E.SK2.sb_shell.fx=shellFx;
for(const wil of [0,11,30]){
 const p=E.mkPlayer('spellblade',{}, {con:50,wil});p.ward=0;
 const b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{});
 E.runSkill2(b,E.v2Static(E.SK2.sb_shell),null);
 assert(Math.abs(p.ward-Math.min(E.wardMax(p),18*(1+.02*wil)))<1e-6);
}
for(const [hp,d,melee] of [[1,100,true],[100,20,true],[100,20,false]]){
 const p=E.mkPlayer('spellblade',{weapon:'bloodblade'});p.hp=20;
 const e=E.mkEnemy('bruiser',false,0);e.hp=hp;e.hpMax=1000;
 const b=E.newBattle(p,[e],{});b.cur={id:'basic'};const before=p.hp;
 E.hurtEnemy(b,e,d,{melee,single:1});const actual=hp-Math.max(0,e.hp);
 assert(Math.abs(p.hp-before-(melee?actual*.1:0))<1e-6,'흡혈 실제 피해');
}
console.log('정량 보호막·의지 증가·흡혈 초과 피해 제외·원거리 제외 통과');
