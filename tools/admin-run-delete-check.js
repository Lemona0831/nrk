'use strict';
const assert=require('assert/strict'),vm=require('vm'),PS=require('./pagesrc');
(async()=>{for(const dir of ['.','06a2']){
const c={console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}};vm.createContext(c);vm.runInContext(PS.pageData(dir)+'\n'+PS.pageScript(dir)+'\nthis.__G=G;',c);const G=c.__G;
vm.runInContext('render=()=>{};toast=()=>{};',c);const calls=[];G.site=true;G.owner=true;G.superAdmin=true;G.sb={rpc:async(n,args)=>{calls.push([n,args]);return {data:3,error:null};}};
const setup=()=>{G.dashRaw=[{uid:'player-1',runs:[{id:'run-1',build:'monk'},{id:'run-2',build:'monk'}]},{uid:'player-2',runs:[{id:'run-1',build:'monk'}]}];G.runDelTarget={uid:'player-1',id:'run-1'};G.rfOpen='0:0';};setup();
c.saveFile=async()=>false;await c.deleteOneRun('지우기');assert.equal(calls.length,0);assert.equal(G.dashRaw[0].runs.length,2);
c.saveFile=async()=>true;await c.deleteOneRun('틀림');assert.equal(calls.length,0);
G.owner=false;await c.deleteOneRun('지우기');assert.equal(calls.length,0);G.owner=true;
await c.deleteOneRun('지우기');assert.equal(calls.length,1);assert.equal(calls[0][0],'admin_delete');assert.equal(calls[0][1].paths.length,1);assert(calls[0][1].paths[0].endsWith('/run-1'));assert(calls[0][1].paths[0].startsWith('playtest/player-1/'));assert.equal(G.dashRaw[0].runs[0].id,'run-2');assert.equal(G.dashRaw[1].runs.length,1);
setup();G.sb.rpc=async()=>({error:{code:'denied'}});await c.deleteOneRun('지우기');assert.equal(G.dashRaw[0].runs.length,2);assert(!G.runDelBusy);
console.log(dir+': 백업 실패·잘못된 확인·권한 차단·한 판 경로·다른 판/계정 유지·서버 실패 통과');
}})().catch(e=>{console.error(e);process.exitCode=1});
