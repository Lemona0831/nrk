'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,G=E.__G;
E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{};
G.data={};G.creating=true;G.b=null;
for(const build of Object.keys(E.TREE2)) { // 10월 16일 0.8.0 2단계: 액티브 트리(run.atree)로 옮김
 G.data={};G.cre={name:'c'};E.startRun(build);const run=G.run;delete run.alloc;G.creating=true;
 const foreign=build==='warden'?'sb_bleedcut':'w_raise';const atWhy=D.run_('atWhy');
 assert(atWhy(run,foreign));D.click('atbuy',foreign);D.click('ateq',foreign);
 assert.equal(run.atree.pts,1);assert.equal(run.skills.length,0);assert.equal(run.atree.own.length,0);
 const own=D.run_(`SKILLS2['${build}'].find(s=>!s.start && s.row===1).id`);
 assert.equal(E.atBuy(run,own),null);assert(run.skills.includes(own));D.click('ateq',own);assert(!run.skills.includes(own));D.click('ateq',own);assert(run.skills.includes(own));
 run.lv=2;run.atree.own.push(foreign);run.skills.push(foreign);
 E.ptFix(run);assert(!run.atree.own.includes(foreign));assert(!run.skills.includes(foreign));assert.equal(run.atree.pts,1);
 E.ptFix(run);assert.equal(run.atree.pts,1);assert(!E.v2Equip(run).includes(foreign));
 G.creating=false;
}
console.log('모든 직업 교차 해금·장착 차단, 정상 장착, 저장본 포인트 반환·중복 반환 방지, 이전 선택 초기화 통과');
