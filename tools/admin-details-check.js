'use strict';
const assert=require('assert/strict'),vm=require('vm'),PS=require('./pagesrc.js');
for(const dir of ['.','06a2']) {
 const ctx={console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}};vm.createContext(ctx);
 vm.runInContext(PS.pageData(dir)+'\n'+PS.pageScript(dir)+'\nthis.__G=G;',ctx);
 vm.runInContext("G.data={runs:[],scen:{},seenRole:{}}; saveLocal=()=>true; scheduleSync=()=>{}; render=()=>{}; sfx=()=>{}; startRun('monk');",ctx);
 const run=ctx.__G.run, rec=ctx.runRecord(run), before=JSON.stringify(rec.eqDetails);
 assert(rec.treeNodes.length);assert(rec.eqDetails.length);assert(rec.eqDetails[0].baseValue>0);
 const it=Object.values(run.inv)[0];it.b+=10;assert.equal(JSON.stringify(rec.eqDetails),before);
 run.tree.open.push(rec.treeNodes.find(n=>!n.start).id);assert.equal(rec.tree.open.length,0);
 ctx.logSwap(run,it,true,'free');assert(run.swaps[0].detail.baseValue>0);
 assert(ctx.vAdminBuild(rec).includes('실제 기본 수치'));assert(ctx.vAdminBuild({...rec,tree:null,treeNodes:null,eqDetails:[{tpl:it.tpl,g:it.g}]}).includes('실제 수치 미기록'));
 ctx.__G.dashRaw=[{uid:'one',name:'동명이인',runs:[rec]},{uid:'two',name:'동명이인',runs:[rec]}];ctx.__G.rf={uid:'one'};assert.equal(ctx.dashRunRows().length,1);
 ctx.__G.rfOpen='0:0';assert(ctx.vRunLogs().includes('스킬 트리'));
 for(const build of Object.keys(vm.runInContext('SKILLS2',ctx))){vm.runInContext('startRun('+JSON.stringify(build)+')',ctx);const r=ctx.runRecord(ctx.__G.run);assert(ctx.vAdminBuild(r).includes('스킬 트리'));}
 console.log(dir+': 장비 스냅샷 불변·트리 스냅샷 불변·교체 수치·과거 기록·동명이인 구분·모든 직업 렌더 통과');
}
