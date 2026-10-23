'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,G=E.__G;
E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{};
G.data={};G.creating=true;G.b=null;
for(const build of Object.keys(E.TREE2).filter(k=>Object.values(E.atBuild(k).nodes).some(n=>n.kind==='skill'))) { // M8: 방사 트리가 없는 숨은 직업 셋은 뺀다 // 10월 16일 0.8.0 2단계: 액티브 트리(run.atree)로 옮김
 G.data={};G.cre={name:'c'};E.startRun(build);const run=G.run;delete run.alloc;G.creating=true;
 const foreign=build==='warden'?'sb_bleedcut':'w_raise';const atWhy=D.run_('atWhy');
 assert(atWhy(run,foreign));D.click('atbuy',foreign);D.click('ateq',foreign);
 const AP=D.run_('AT_PTS'); // M8(10월 23일): 시작 포인트는 데이터로(AT_PTS.start 1 → 2)
 assert.equal(run.atree.pts,AP.start);assert.equal(run.skills.length,0);assert.equal(run.atree.own.length,0);
 const AN=E.atBuild(build).nodes,own=Object.keys(AN).find(id=>AN[id].kind==='skill'&&!atWhy(run,id)); // M8: 방사 트리에서 지금 살 수 있는 첫 스킬(옛 SKILLS2 row 1은 트리에 없을 수 있다)
 assert(own,build+' 살 수 있는 스킬');
 assert.equal(E.atBuy(run,own),null);const p1=run.atree.pts;assert(run.skills.includes(own));D.click('ateq',own);assert(!run.skills.includes(own));D.click('ateq',own);assert(run.skills.includes(own));
 run.lv=2;run.atree.own.push(foreign);run.skills.push(foreign);
 E.ptFix(run);assert(!run.atree.own.includes(foreign));assert(!run.skills.includes(foreign));assert.equal(run.atree.pts,p1+AP.lv);
 E.ptFix(run);assert.equal(run.atree.pts,p1+AP.lv);assert(!E.v2Equip(run).includes(foreign));
 G.creating=false;
}
console.log('모든 직업 교차 해금·장착 차단, 정상 장착, 저장본 포인트 반환·중복 반환 방지, 이전 선택 초기화 통과');
