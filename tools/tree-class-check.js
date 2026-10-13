'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,G=E.__G;
E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{};
G.data={};G.creating=true;G.b=null;
for(const build of Object.keys(E.TREE2)) {
 const run={build,lv:1,ch:1,p:E.mkPlayer(build,{}),skills:[],tree:{pts:1,open:[],spent:{}}};G.run=run;
 const foreign=build==='warden'?'sb_bleedcut':'w_raise';
 assert(E.treeWhy(run,foreign));D.click('tunlock',foreign);D.click('tequip',foreign);
 assert.equal(run.tree.pts,1);assert.equal(run.skills.length,0);assert.equal(run.tree.open.length,0);
 const own=D.run_(`SKILLS2['${build}'].find(s=>!s.start && s.row===1).id`);
 assert.equal(E.treeUnlock(run,own),null);D.click('tequip',own);assert(run.skills.includes(own));
 run.lv=2;run.tree.open.push(foreign);run.skills.push(foreign);run.tree.spent.foreign=1;
 E.treeFix(run);assert(!run.tree.open.includes(foreign));assert(!run.skills.includes(foreign));assert.equal(run.tree.pts,1);
 E.treeFix(run);assert.equal(run.tree.pts,1);assert(!E.v2Equip(run).includes(foreign));
 G.tsel=foreign;E.vTreeView();assert.equal(G.tsel,null);
}
console.log('모든 직업 교차 해금·장착 차단, 정상 장착, 저장본 포인트 반환·중복 반환 방지, 이전 선택 초기화 통과');
