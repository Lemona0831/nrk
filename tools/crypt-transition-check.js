/* 폐기(0.8.0 M8): 옛 2챕터 보스 군주(cryptlord)의 단계 전환 점검. 군주는 0.8.0 A2에서 data/archive로 보관됐다. 단계 체류는 tools/boss-dwell-check.js가 지금 보스로 본다. 파일은 기록으로 남긴다. 그래도 돌리려면 RUN_RETIRED=1 */
'use strict';
if (!process.env.RUN_RETIRED) { console.log('폐기(0.8.0 M8): crypt-transition-check — 보관된 기능 · 일회성 비교라 건너뜀(RUN_RETIRED=1이면 돈다)'); process.exit(0); }
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),{G0:E,run_:V}=require('./dgqa.js');
function setup(phase,k){const p=E.mkPlayer('spellblade',{},{});p.hp=p.hpMax=10000;const b=E.roomBattle(p,{ch:2,lv:10,floor:24,names:V('ENEMY_NAMES[2]'),boss:1},'cryptlord',300);const e=b.en.find(x=>x.boss==='cryptlord');e.phase=phase;e.hp=e.hpMax*V('LORD.ph['+(phase-1)+']')+1;e.intent={k};e.teleTurn=1;b.turnIdx=5;b.lordHist=['skill','wpn'];return {b,e};}
for(const phase of [1,2])for(const k of ['carve','call','heavy','charge']){
 const {b,e}=setup(phase,k);E.hurtEnemy(b,e,10000,{single:1});e.bank=0; // 쌓인 피해(10월 15일)는 boss-dwell-check에서 본다. 여기서는 전환만
 assert.equal(e.phase,phase);assert.equal(e.intent.k,k);assert.equal(e.lordNext,phase===1?'throne':'collapse');
 E.enemyAct(b,e);assert.equal(e.phase,phase);
 if(k==='charge'){assert.equal(e.intent.k,'heavy');assert.equal(e.teleTurn,b.turnIdx);b.turnIdx++;E.enemyAct(b,e);assert.equal(e.phase,phase);}
 { const tr=phase===1?'throne':'collapse'; let g=0; while(e.intent.k!==tr&&g++<8){b.turnIdx++;E.enemyAct(b,e);assert.equal(e.phase,phase);} assert.equal(e.intent.k,tr); assert(((e.phAct||{})[phase]||0)>=V('BOSS_DWELL.cryptlord.mid'),'단계 최소 체류 뒤 전환 예고'); }
 if(phase===2){assert.equal(e.teleTurn,b.turnIdx);E.enemyAct(b,e);assert.equal(e.phase,2);b.turnIdx++;}
 E.enemyAct(b,e);assert.equal(e.phase,phase+1);assert.equal(e.lordNext,null);
 if(k==='heavy'||k==='charge')assert(b.rec.some(x=>x.k==='bigfire'&&x.i==='heavy'));
 if(k==='carve')assert(b.log.some(x=>x.m.includes('이름을 새긴다')));
}
console.log('단계 문턱에서 새김·부름·강타·강타 준비 유지, 처리 뒤 전환, 옥좌 붕괴 대응 차례 보장 통과');
