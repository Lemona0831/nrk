'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),{G0:E,run_:V}=require('./dgqa.js');
function setup(phase,k){const p=E.mkPlayer('warden',{},{});p.hp=p.hpMax=10000;const b=E.roomBattle(p,{ch:3,lv:12,floor:24,names:V('ENEMY_NAMES[3]'),boss:1},'queen',300);const e=b.en.find(x=>x.boss==='queen');e.phase=phase;e.hp=e.hpMax*V('QUEEN.ph['+(phase-1)+']')+1;e.intent={k};e.teleTurn=1;b.turnIdx=5;if(k==='surgeprep'||k==='erupt')e.under=1;if(k==='erupt')e.qPrep=1;return {b,e};}
for(const phase of [1,2])for(const k of ['attack','ash','heavy','charge',...(phase===2?['burrow','surgeprep','erupt']:[])])for(const dot of [false,true]){
 const {b,e}=setup(phase,k),next=phase===1?'qrise':'qmelt';
 E.hurtEnemy(b,e,100000,{aoe:1,dot});
 assert.equal(e.phase,phase);assert.equal(e.intent.k,k);assert.equal(e.qNext,next);assert(e.hp>0&&e.alive);assert(!b.over);
 let steps=0;
 while(e.intent.k!==next&&steps++<5){b.turnIdx++;E.enemyAct(b,e);assert.equal(e.phase,phase);}
 assert.equal(e.intent.k,next);assert.equal(e.under||0,0);assert.equal(e.qPrep||0,0);
 if(k==='charge'||k==='heavy')assert(b.rec.some(x=>x.k==='bigfire'&&x.i==='heavy'&&x.gap>=1));
 if(['burrow','surgeprep','erupt'].includes(k))assert(b.rec.some(x=>x.k==='bigfire'&&x.i==='erupt'&&x.gap>=1));
 E.enemyAct(b,e);assert.equal(e.phase,phase+1);assert.equal(e.qNext,null);
 if(phase===1)assert.equal(E.alive(b).filter(x=>x.role==='maid').length,V('QUEEN.maidMax'));
 else{assert.equal(b.crownBack,null);assert(!E.alive(b).some(x=>x.role==='crown'));E.hurtEnemy(b,e,100000,{aoe:1});assert.equal(b.over,'win');assert.equal(E.alive(b).length,0);}
}
console.log('여왕 단계별 공격·태양창·잠복·솟구침 유지, 큰 직격 및 지속 피해의 단계 건너뛰기 방지, 시녀 소환·왕관 소멸·최종 승리 통과');
