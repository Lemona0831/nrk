'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_,F=V('IFX');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function battle(items={}){const p=E.mkPlayer('spellblade',items,{con:25,wil:0});p.hp=20;const en=[E.mkEnemy('bruiser',false,0),E.mkEnemy('archer',false,1)];for(const e of en)e.hp=e.hpMax=10000;const b=E.newBattle(p,en,{});b.actN=1;b.turnIdx=1;b.cur={id:'basic'};return b;}
let b=battle({weapon:'bloodblade'}),p=b.p;
F.bloodblade.onHit(b,p,b.en[0],{melee:1},{id:'basic'},100,100);near(p.hp,30);
F.bloodblade.onHit(b,p,b.en[0],{melee:1},{id:'heavy'},100,100);near(p.hp,40);
b.turnIdx++;F.bloodblade.onHit(b,p,b.en[0],{melee:1},{id:'basic'},1,1);near(p.hp,40.1);
near(E.ledgerCost(p,1),p.hpMax*.06);near(E.ledgerCost(p,40),p.hpMax*.06);near(E.ledgerCost(p,0),0);p.eq.flask='bloodoil';near(E.ledgerCost(p,40),p.hpMax*.06*.7);
b=battle();F.saintgrail.onFlask(b,b.p);assert.equal(b.p.fxQuickNext,1);b.p.fxQuickNext=0;F.saintgrail.onFlask(b,b.p);assert.equal(b.p.fxQuickNext,0);b.turnIdx++;F.saintgrail.onFlask(b,b.p);assert.equal(b.p.fxQuickNext,1);
b=battle();p=b.p;p.cd={sb_bolt:4,sb_wardbolt:6};F.voidring.onSkill(b,p,{id:'sb_bolt'});assert.equal(p.cd.sb_bolt,3);F.voidring.onSkill(b,p,{id:'sb_wardbolt'});assert.equal(p.cd.sb_wardbolt,6);b.turnIdx++;F.voidring.onSkill(b,p,{id:'sb_wardbolt'});assert.equal(p.cd.sb_wardbolt,5);p.cd.sb_bolt=2;b.turnIdx++;F.voidring.onSkill(b,p,{id:'sb_bolt'});assert.equal(p.cd.sb_bolt,2);
assert.equal(F.secondhand.hitP({},{}),-.15);assert.equal(F.secondhand.quick2,1);
b=battle();const h=b.en[1].hp;F.penancepike.onHit(b,b.p,b.en[0],{melee:1,single:1},b.cur,100,20);near(h-b.en[1].hp,5);F.penancepike.onHit(b,b.p,b.en[0],{melee:1,single:1},b.cur,100,20);near(h-b.en[1].hp,5);b.actN++;F.penancepike.onHit(b,b.p,b.en[0],{melee:1,single:1},b.cur,100,20);near(h-b.en[1].hp,10);
b=battle();p=b.p;F.lordgrail.onFlask(b,p,'life',0);assert.equal(p.ward||0,0);F.lordgrail.onFlask(b,p,'life',5);near(p.ward,5);
b=battle({flask:'lordgrail'});p=b.p;p.hp=p.hpMax-5;b.stepMode=true;E.playerAct(b,'flaskL');near(p.ward,5);
b=battle();E.addS(b,b.en[0],'ignite',4);F.afterglow.onKill(b,b.p,b.en[0]);assert.equal(E.st(b.en[1],'ignite'),2);F.afterglow.onKill(b,b.p,b.en[0]);assert.equal(E.st(b.en[1],'ignite'),2);b.actN++;b.en[0].summoned=1;F.afterglow.onKill(b,b.p,b.en[0]);assert.equal(E.st(b.en[1],'ignite'),2);
b=battle({weapon:'bloodblade',ring1:'ledger'});p=b.p;p.hp=p.hpMax;p.st=0;b.stepMode=true;const paidFrom=p.hp;E.playerAct(b,'heavy',b.en[0].id);assert(p.hp<paidFrom,'일반 강공격에서 혈액 비용 적용');assert(E.ITEMS.ledger.act.includes('6%'));
for(const tpl of ['bloodblade','saintgrail','penancepike','ledger','voidring','lordgrail','secondhand','afterglow'])assert(E.ITEMS[tpl].act&&E.ITEMS[tpl].cost,tpl);
console.log('희귀 이상 8종: 흡혈 상한 제거·최대 생명력 대가·혈액 비용·성배/공허 차례 제한·전설 피해 대가·장창 연타/실제 피해·실제 플라스크 회복·잔광 중복/소환 제외 통과');

const naked=E.mkPlayer('spellblade',{}, {con:25,wil:0}),sword=E.mkPlayer('spellblade',{weapon:'bloodblade'}, {con:25,wil:0});assert.equal(sword.hpMax,Math.round(naked.hpMax*.9));assert.equal(F.bloodblade.healMul,.8);
