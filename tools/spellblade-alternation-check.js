'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,Q=require('./qa.js');
for(const wil of [0,27,50]){
 const p=E.mkPlayer('spellblade',{}, {con:100,wil});p.ward=0;
 const b=E.newBattle(p,[E.mkEnemy('bruiser',false,0)],{});b.turnIdx=1;p.sbLast='spell';
 E.sbBegin(b,'basic',{id:'basic'});E.sbEnd(b,{id:'basic'});assert.equal(p.ward,4);
 p.sbLast='spell';E.sbBegin(b,'basic',{id:'basic'});E.sbEnd(b,{id:'basic'});assert.equal(p.ward,4);
 p.ward=0;E.runSkill2(b,E.v2Static(E.SK2.sb_shell),null);assert(Math.abs(p.ward-Math.min(E.wardMax(p),E.SK2.sb_shell.fx.find(f=>f.k==='ward').n*(1+.02*wil)))<1e-8);assert.equal(E.SK2.sb_shell.time,'fast');assert(!E.SK2.sb_shell.fx.some(f=>f.k==='stam'));
}
for(const ward of [0,1,30,100]){
 const p=E.mkPlayer('spellblade',{}, {con:100});p.ward=ward;p.sbLast='cut';
 const es=[0,1].map(i=>{const e=E.mkEnemy('bruiser',false,i);e.hp=e.hpMax=10000;return e});
 const b=E.newBattle(p,es,{});b.turnIdx=1;const a=E.v2Static(E.SK2.sb_spellguard);
 E.sbBegin(b,a.id,a);E.runSkill2(b,a,null);E.sbEnd(b,a);assert.equal(p.ward,0);assert.equal(b.rec.filter(x=>x.k==='alt').length,0);
 { const f=E.SK2.sb_spellguard.fx[1]; assert.equal(E.wardDamageInfo(f,ward).bonus,Math.min(f.cap,ward*f.per)); } // M8: 상한 · 배율은 데이터로(M5 재설계 16 · 0.5 → 20 · 0.8)
}
console.log('PASS: fixed alternation 4, once per turn, will-scaled shell, fast shell without stamina, full ward spending once for AoE, no immediate alternation refill');
/* M8(10월 23일): 아래는 일회성 전후 측정(옛 보스 abbot · cryptlord · queen 고정)이다. 군주 · 여왕이 data/archive로 옮겨져 건너뛴다 */
if(!D.run_('typeof BOSSES.cryptlord!=="undefined"')){console.log('옛 전후 측정은 건너뜀(보관된 보스)');process.exit(0);}
const addWard=E.addWard,shell=JSON.parse(JSON.stringify(E.SK2.sb_shell)),guard=JSON.parse(JSON.stringify(E.SK2.sb_spellguard));
function version(old){
 E.addWard=old?((b,p,n,cap)=>addWard(b,p,n,cap)):addWard;
 E.SK2.sb_shell.time=old?'normal':'fast';E.SK2.sb_shell.fx=old?[{k:'ward',n:18},{k:'st',s:'protect',n:1},{k:'stam',n:15}]:shell.fx;
 E.SK2.sb_spellguard.fx=old?[{k:'dmg',n:7},{k:'wardDmg',per:.5,spend:.5,cap:16}]:guard.fx;
}
function trial(ch,style,kind,seed){
 E.__rnd=Q.rng(seed*31+7);D.run_('Math.random=__rnd');
 const lv=[5,9,13][ch-1],budget=20+(lv-1)*3;
 const stats=style==='attack'?{con:Math.ceil(budget*.5),wil:0,str:Math.floor(budget*.25),int:budget-Math.ceil(budget*.5)-Math.floor(budget*.25)}:{con:Math.ceil(budget*.6),wil:budget-Math.ceil(budget*.6),str:0,int:0};
 const ids=style==='repeat'?['sb_edge','sb_aegis','sb_ember','sb_flare','sb_kindle','sb_snuff']:['sb_edge','sb_aegis','sb_shell','sb_bolt','sb_bladeward','sb_spellguard'];
 const p=E.mkPlayer('spellblade',{weapon:'start_wpn_spellblade',armor:'start_armor',flask:'start_flask'},stats,ids);p.lv=lv;E.applyStats(p,stats);p.hp=p.hpMax;p.st=p.stMax;
 const room={ch,lv,floor:kind==='boss'?24:10,names:D.run_('ENEMY_NAMES['+ch+']'),path:'main',en:[['bruiser',2],['archer',1]],boss:kind==='boss'?1:0};
 const b=E.roomBattle(p,room,kind==='boss'?['abbot','cryptlord','queen'][ch-1]:null,seed);b.rngF=Q.rng(seed);let n=0;
 while(!b.over && n++<180){
  const L=E.actionList(b).filter(a=>a.ok&&a.id!=='flee');let a;
  if(p.hp/p.hpMax<.35)a=L.find(a=>a.id==='flaskL');
  if(style==='ward'&&E.alive(b).some(e=>e.intent?.charged))a=a || L.find(a=>a.id==='guard');
  const order=style==='repeat'?['sb_flare','sb_kindle','sb_snuff','sb_ember','basic']:style==='ward'?['sb_shell','sb_aegis','sb_bladeward','sb_bolt','sb_spellguard','basic']:['sb_bolt','sb_spellguard','sb_bladeward','sb_shell','sb_aegis','heavy','basic'];
  a=a || order.map(id=>L.find(a=>a.id===id)).find(Boolean) || L[0];if(!a)break;
  const t=E.alive(b).find(e=>E.canTarget(b,e,a));E.playerAct(b,a.id,t?.id);
  const bugs=[];Q.invariants(b,bugs,'mag');assert.equal(bugs.length,0,bugs.join('\n'));
 }
 return {win:b.over==='win',hp:p.hp/p.hpMax,ward:b.rec.filter(x=>x.k==='alt').reduce((a,x)=>a+(x.g||0),0)};
}
for(const old of [true,false]){version(old);for(const style of ['repeat','ward','attack']){
 const rows=[];for(const ch of [1,2,3])for(const kind of ['normal','boss'])for(let i=0;i<12;i++)rows.push(trial(ch,style,kind,800+i));
 console.log(JSON.stringify({version:old?'before':'after',style,battles:rows.length,wins:rows.filter(x=>x.win).length,hp:+(rows.reduce((s,x)=>s+x.hp,0)/rows.length).toFixed(3),alternationGain:+(rows.reduce((s,x)=>s+x.ward,0)/rows.length).toFixed(1)}));
}}
