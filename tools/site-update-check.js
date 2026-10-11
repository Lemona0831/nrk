'use strict';
const fs=require('fs'),assert=require('assert/strict');process.env.DGDIR=process.env.DGDIR||'06a2';
const D=require('./dgqa.js'),E=D.G0,V=D.run_,U=V('SITE_UPDATE'),g=E.__G,meta='a'.repeat(64),next='b'.repeat(64);
const store=new Map(),timers=[];let destination='',indexRevision=next,fail=false,offline=false;
E.URL=URL;E.AbortController=AbortController;E.localStorage={setItem:(k,v)=>{if(fail)throw Error('quota');store.set(k,v)},getItem:k=>store.get(k)||null};E.sessionStorage={setItem:()=>{},getItem:()=>null,removeItem:()=>{}};
E.document={hidden:false,activeElement:null,baseURI:'https://example.invalid/nrk/',querySelector:()=>({content:meta})};E.location={href:'https://example.invalid/nrk/?mode=1#keep',replace:url=>{destination=url}};
E.DOMParser=class{parseFromString(){return{querySelector:()=>({content:indexRevision})}}};
E.fetch=async()=>{if(offline)throw Error('offline');return{ok:true,text:async()=>JSON.stringify({revision:next})}};
E.setTimeout=fn=>{timers.push(fn);return timers.length};E.clearTimeout=()=>{};
V(fs.readFileSync('06a2/js/62-storage-sync.js','utf8').match(/function saveLocal\(\) [^\n]+/)[0]);
g.data=E.blankData();g.scr='title';U.current=meta;
async function main(){
 for(const [key,value] of [['busy',true],['creating',true],['b',{}],['sheet',{}],['menuOpen',true]]){g[key]=value;assert.equal(E.siteUpdateSafe(),false,key);g[key]=null;}
 E.document.activeElement={tagName:'TEXTAREA'};assert.equal(E.siteUpdateSafe(),false);E.document.activeElement=null;
 for(const screen of ['create','survey','admin','tree','settle']){g.scr=screen;assert.equal(E.siteUpdateSafe(),false,screen)}g.scr='run';
 g.run={id:'r-update',acts:[],rooms:[],phase:'run',consPending:[{id:'herb',n:1}]};assert.equal(E.siteUpdateSafe(),false);g.run.consPending=[];g.run.gold=123;
 g.b={};await E.siteUpdateCheck();assert.equal(U.pending,next);assert.equal(destination,'');g.b=null;
 indexRevision=meta;assert.equal(await E.siteUpdateApply(),false);assert.equal(destination,'');indexRevision=next;
 fail=true;assert.equal(await E.siteUpdateApply(),false);assert.equal(destination,'');fail=false;
 assert.equal(await E.siteUpdateApply(),true);timers.at(-1)();assert(destination.includes('nrk_update='+next));assert(destination.includes('mode=1'));assert(destination.endsWith('#keep'));
 const saved=JSON.parse(store.get(V('SKEY')));assert.equal(saved.cur.id,'r-update');assert.equal(saved.cur.gold,123);assert.equal(saved.runs[0].id,'r-update');
 U.applying=false;U.pending='';offline=true;await E.siteUpdateCheck();assert.equal(U.pending,'');
 console.log('전투·보상·생성·입력 보류, 배포 불일치·저장 실패·오프라인 보류, 진행 저장·주소 유지·자동 갱신 통과');
}
main().catch(e=>{console.error(e);process.exitCode=1});
