'use strict';
process.env.DGDIR='06a2';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,G=E.__G;
(async()=>{
 G.data={};G.owner=true;G.superAdmin=true;G.adminPass='stale';
 G.sb={rpc:async()=>({data:false,error:null})};await E.refreshAdminAuth();
 assert(!G.owner);assert(!G.superAdmin);assert.equal(G.adminPass,'');
 G.sb={rpc:async n=>({data:n==='nrk_super_admin_check',error:null})};await E.refreshAdminAuth();
 assert(G.owner&&G.superAdmin);assert.equal(G.adminPass,'');
 const calls=[];G.sb={rpc:async(n,a)=>{calls.push([n,a]);return {error:null};}};
 await E.sbDb(G.sb,'own').doc('playtest/other/runs62/test').set({a:1});
 assert.equal(calls[0][0],'admin_put');assert.equal(calls[0][1].pass,'');
 G.superAdmin=false;G.owner=false;await assert.rejects(()=>E.sbDb(G.sb,'own').doc('playtest/other').set({}));
 G.data.adminPass='legacy';G.sb={rpc:async(n,a)=>({data:n==='admin_check'&&a.pass==='legacy',error:null})};
 await E.refreshAdminAuth();assert(G.owner&&!G.superAdmin);assert.equal(G.adminPass,'legacy');
 G.data={};G.sb={rpc:async()=>{throw Error('offline');}};await E.refreshAdminAuth();assert(!G.owner&&!G.superAdmin);
 console.log('서버 승인만 권한 부여·권한 초기화·암호 없는 서버 요청·일반 계정 차단·기존 암호 유지·통신 실패 차단 통과');
})().catch(e=>{console.error(e);process.exitCode=1;});
