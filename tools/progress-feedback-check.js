'use strict';
process.env.DGDIR='06a2';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_;
const p=E.mkPlayer('hunter',{}),e=E.mkEnemy('bruiser',0,1,{lv:4});
e.boss='abbot';e.hpMax=1000;e.hp=100;e.phase=2;
const b=E.newBattle(p,[e],{});let total=0;
for(let i=0;i<20;i++) {
 e.hp=100;e.vow=1;e.vowTick=i*3;E.abbotCandles(b,e);
 const count=b.en.filter(x=>x.role==='candle'&&x.alive).length;
 E.abbotTick(b,e,i*3+3);
 const expected=1000*.03*count*Math.pow(.65,i);
 assert(Math.abs(e.hp-100-expected)<1e-8);total+=expected;
 assert.equal(b.rec.at(-1).d,Math.round(expected*10)/10);
 const hp=e.hp;E.abbotTick(b,e,i*3+3);assert.equal(e.hp,hp);
}
assert(total<270);
e.hp=998;e.vow=1;e.vowTick=60;e.vowN=0;E.abbotCandles(b,e);E.abbotTick(b,e,63);
assert.equal(e.hp,1000);assert.equal(b.rec.at(-1).d,2);E.bossPhase(b,e);assert.equal(e.phase,2);
e.hp=500;e.vow=1;e.vowTick=63;E.abbotCandles(b,e);
for(const c of b.en.filter(x=>x.role==='candle'))c.alive=false;
E.abbotTick(b,e,66);assert.equal(e.hp,500);
for(const build of ['hunter','assassin','warden']) {
 const q=E.mkPlayer(build,{});E.__growthPlayer=q;
 const original=JSON.stringify(q),before=V('growthSnapshot(__growthPlayer)');
 E.__growthBefore=before;assert.equal(V('growthText(__growthBefore,__growthPlayer,"장비 교체")'),'장비 교체');
 assert.equal(JSON.stringify(q),original);
 E.applyStats(q,{str:3,con:3,dex:3,int:3,wil:3});
 const text=V('growthText(__growthBefore,__growthPlayer,"능력치 배분")');
 assert(text.startsWith('능력치 배분 · '));assert(text.includes(' → '));assert(text.split(' · ').length<=3);
}
console.log('반복 회복 감쇠·첫 회복 유지·중복/상한/사망 처리·실제 회복 기록·짧은 성장 수치 통과');

