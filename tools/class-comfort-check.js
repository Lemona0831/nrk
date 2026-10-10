'use strict';
process.env.DGDIR = '06a2';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, V = D.run_;
assert.equal(V('STAT_START'), 20);
for (const lv of [1,5,10,15]) {
  const r={lv,statGrowth:3,stats:{str:15,dex:0,int:0,con:0,wil:0},statPending:2};
  E.statFix(r); assert.equal(r.statPending,7); assert.equal(r.statBase,20);
  E.statFix(r); assert.equal(r.statPending,7); assert.equal(r.stats.str,15);
  const legacy={lv,stats:{str:6,dex:0,int:0}};
  E.statFix(legacy);assert.equal(legacy.statPending,14+lv-1);
  E.statFix(legacy);assert.equal(legacy.statPending,14+lv-1);
}
const r={lv:1,statGrowth:3,statBase:20,stats:{str:20,dex:0,int:0,con:0,wil:0}};E.statFix(r);assert.equal(r.statPending,undefined);
function battle(){const p=E.mkPlayer('butcher',{});p.hpMax=100;p.hp=40;const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=100;const b=E.newBattle(p,[e],{test:1});b.cur={id:'b_hook'};b.turnIdx=1;b.rngF=()=>0.99;return b;}
let b=battle();assert.equal(E.bHeal(b,20,'eat'),20);assert.equal(b.p.hp,60); // 전투 시작 생명력보다 회복
assert.equal(E.bHeal(b,100,'eat'),20);assert.equal(E.bHeal(b,1,'eat'),0); // 전투당 40%
b=battle();E.addS(b,b.en[0],'bleed',3);E.hurtEnemy(b,b.en[0],20,{melee:1,single:1});assert(Math.abs(b.p.hp-42.4)<1e-6);
b=battle();E.hurtEnemy(b,b.en[0],20,{melee:1,single:1,leechBleed:3});assert(Math.abs(b.p.hp-42.4)<1e-6); // 처음 거는 타격부터
b=battle();b.en[0].hp=2;E.hurtEnemy(b,b.en[0],20,{melee:1,single:1,leechBleed:3});assert(Math.abs(b.p.hp-43.24)<1e-6);assert.equal(b.over,'win'); // 초과 피해는 흡혈에 넣지 않음, 마지막 적 수확
b=battle();b.en[0].hp=1;E.addS(b,b.en[0],'bleed',1);E.kwBleed(b,b.en[0]);assert.equal(b.p.hp,43); // 출혈 1이 사라진 뒤 처치도 회복
b=battle();b.en[0].evading=1;E.hurtEnemy(b,b.en[0],20,{melee:1,single:1,leechBleed:3});assert.equal(b.p.hp,40);
b=battle();b.stepMode=true;b.en[0].hp=2;E.playerAct(b,'b_hook',b.en[0].id);assert.equal(b.over,'win');assert(Math.abs(b.p.hp-43.24)<1e-6);assert.equal(b.p.cd.b_hook,4);
b=battle();b.over='win';assert.equal(E.bHeal(b,12,'eat'),12);b.over='lose';assert.equal(E.bHeal(b,12,'eat'),0);
b=battle();E.buHarvest(b,b.en[0]);E.buHarvest(b,b.en[0]);assert.equal(b.p.hp,43);
for(let i=0;i<6;i++)E.buHarvest(b,{role:'melee',alive:true});assert.equal(b.harvestGot,12);assert.equal(b.p.hp,52);
b=battle();for(const role of ['root','candle','bonewall','crown'])E.buHarvest(b,{role});E.buHarvest(b,{role:'melee',summoned:1});assert.equal(b.p.hp,40);
b=battle();E.bHeal(b,100,'leech');assert.equal(b.p.hp,48);E.bHeal(b,100,'leech');assert.equal(b.p.hp,48);b.turnIdx++;E.bHeal(b,100,'leech');assert.equal(b.p.hp,56);
for(const build of V('ALL_CLASS_KEYS()')) {const h=V(`classRuleHtml(${JSON.stringify(build)})`);assert(h.includes('rule-details'));assert(h.includes('자세한 조건과 예외'));}
assert(V("classRuleHtml('elementalist')").includes('상한 16'));
const sb=E.newBattle(E.mkPlayer('elementalist',{}),[E.mkEnemy('bruiser',false,0)],{test:1});sb.actN=1;sb.en[0].hp=sb.en[0].hpMax=1000;E.addS(sb,sb.en[0],'ignite',10);E.addS(sb,sb.en[0],'chill',10);E.elemShock(sb,'me');assert.equal(sb.rec.find(x=>x.k==='shock').T,16);assert.equal(sb.rec.find(x=>x.k==='shock').dmg,48);assert.equal(sb.rec.find(x=>x.k==='shock').brk,36);
b=battle();b.stepMode=true;b.p.eq.flask='hungerflask';E.playerAct(b,'flaskL');assert.equal(b.p.hp,73);assert(Math.abs(E.bHeal(b,2,'leech')-2.2)<1e-6);
const expected={a_vital:4,a_slip:5,w_bash:4,w_brace:5,h_aim:5,h_step:6,b_hook:4,b_lap:4,e_ember:5,e_touch:4,sb_edge:5,sb_aegis:4,m_palm:5,m_brace:4,c_mace:5,c_confess:4,v_taint:4,v_drink:4};for(const [id,cd] of Object.entries(expected))assert.equal(E.SK2[id].cd,cd,id);
console.log('시작 20점·옛 저장본 5점 보충/중복 방지·흡혈/먹기/피 수확·처치/출혈 마지막 적·빗나감/소환물 제외·상한·열충격 공식 통과');
