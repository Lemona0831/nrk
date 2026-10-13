'use strict';
const vm = require('vm'), assert = require('assert/strict'), {isDeepStrictEqual} = require('util');
const pages = require('./pagesrc');
const dir = process.argv[2] || '.';
const store = new Map(); let limit = 5 * 1024 * 1024, deny = false;
const quota = () => Object.assign(new Error('test quota'), { name: 'QuotaExceededError', code: 22 });
const ctx = { console, module: {exports:{}}, setTimeout:()=>0, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{}, localStorage: {
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>{if(deny)throw quota(); const total=[...store].filter(([x])=>x!==k).reduce((n,[x,y])=>n+2*(x.length+y.length),0)+2*(k.length+v.length);if(total>limit)throw quota();store.set(k,v);},
}};
vm.createContext(ctx); vm.runInContext(pages.pageData(dir)+'\n'+pages.pageScript(dir)+'\nthis.testG=G;this.testKey=SKEY;', ctx);
const G = ctx.testG, key = ctx.testKey;
const parse = x => JSON.parse(JSON.stringify(x));
const call = code => vm.runInContext(code,ctx);
const blank = () => {store.clear();G.data=ctx.blankData();G.localReadBlocked=false;G.cloud=null;deny=false;limit=5*1024*1024;};
blank(); G.data.name='저장 점검 🕯️'; G.data.extra=['한글','\ud800','\u0000',null,123.45];
assert.equal(ctx.saveLocal(),true); assert.deepEqual(parse(ctx.loadLocal()),parse(G.data));
assert(store.get(key).startsWith('{'),'small legacy JSON format');
const legacy=store.get(key); assert.deepEqual(parse(ctx.localSaveRead(legacy)),parse(G.data));

// Four live characters and large accumulated history exceed the old storage budget.
const acts=Array.from({length:3000},(_,i)=>({k:'act',a:'basic',tick:i,hp:120-i%80,st:70,p:{hp:120,ward:4},note:'누적 전투 기록과 상태 '.repeat(6)}));
G.data.cur={id:'four-0',build:'spellblade',lv:10,phase:'run',acts};
G.data.kept=Array.from({length:3},(_,i)=>({id:'four-'+(i+1),build:'hunter',lv:8,phase:'run',acts}));
G.data.runs=Array.from({length:4},(_,i)=>({id:'history-'+i,acts}));
const expected=JSON.stringify(G.data); assert(expected.length*2>limit);
assert.equal(ctx.saveLocal(),true); assert(G.localSaveInfo.packed); assert.equal(ctx.localSaveText(store.get(key)),expected);
assert.equal(call('saveCount()'),4); assert.deepEqual(parse(ctx.loadLocal()),parse(G.data));
const storedBytes=store.get(key).length*2;
assert.equal(ctx.siteUpdateSave(),true,'automatic update accepts verified packed saves');
console.log(JSON.stringify({rawMiB:+(expected.length*2/1048576).toFixed(2),storedMiB:+(storedBytes/1048576).toFixed(2),characters:4}));

// A failed write preserves the original persisted bytes and restores character selection.
call('toast=()=>{};render=()=>{};playTick=()=>{};');
deny=true; const persisted=store.get(key), previous=parse(G.data);
assert.equal(ctx.keepCur(),false); assert(store.get(key)===persisted); assert(isDeepStrictEqual(parse(G.data),previous),'creation rollback');
assert.equal(G.localSaveError.quota,true);
const el={dataset:{a:'resumekept',k:'four-1'},closest:()=>null,getAttribute:()=>null};
ctx.onClick({target:{closest:()=>el}}); assert(isDeepStrictEqual(parse(G.data),previous),'selection rollback'); assert(store.get(key)===persisted);
deny=false; assert.equal(ctx.saveLocal(),true); assert.equal(G.localSaveError,null);

// Cloud preparation cannot falsely reject a successful local commit.
const track=ctx.cloudTrack, schedule=ctx.cloudSchedule;
ctx.cloudTrack=()=>{throw Error('track failed');}; G.data.name='추적 실패 이후';
assert.equal(ctx.saveLocal(),true); assert.equal(ctx.loadLocal().name,G.data.name);
ctx.cloudTrack=track;ctx.cloudSchedule=()=>{throw Error('schedule failed');};G.data.name='예약 실패 이후';
assert.equal(ctx.saveLocal(),true);assert.equal(ctx.loadLocal().name,G.data.name);ctx.cloudSchedule=schedule;

// Archived accounts use both representations without dropping live characters or history.
const archive=key+':account:test';const written=ctx.localSaveWrite(archive,expected);
assert(written.packed);assert.equal(ctx.localSaveText(store.get(archive)),expected);
assert.deepEqual(parse(ctx.localSaveRead(store.get(archive))),JSON.parse(expected));
G.data.accountId='original-account';G.uid='next-account';deny=true;const accountBefore=parse(G.data);
assert.throws(()=>ctx.accountLocal('next-account'));assert(isDeepStrictEqual(parse(G.data),accountBefore),'failed account archive preserves current data');deny=false;

blank(); store.set(key,'NRK-LZ1:broken');const broken=store.get(key);
ctx.loadLocal();assert.equal(G.localReadBlocked,true);assert.equal(ctx.saveLocal(),false);assert.equal(store.get(key),broken);
blank(); const cyclic={};cyclic.self=cyclic;G.data=cyclic;assert.equal(ctx.saveLocal(),false);assert.equal(G.localSaveError.stage,'serialize');
console.log('Legacy/packed round-trip, four-slot quota recovery, atomic failure rollback, cloud separation, archive compatibility, corrupt-source protection: passed ('+dir+')');

async function accountRegression(){
  blank();call('render=()=>{};');const docs=new Map();let denied=false;
  const db={doc:p=>({set:async d=>{if(denied)throw Error('offline');docs.set(p,parse(d));},get:async()=>({exists:docs.has(p),data:()=>parse(docs.get(p))})}),collection:p=>({get:async()=>({docs:[...docs].filter(([k])=>k.slice(0,k.lastIndexOf('/'))===p).map(([k,d])=>({id:k.slice(k.lastIndexOf('/')+1),data:()=>parse(d)}))})})};
  G.uid='account-test';G.data.accountId=G.uid;G.acct={anon:false};G.db=db;G.conn='ok';
  G.cloud={uid:G.uid,device:'first-device',ready:true,dirty:false};
  G.data.cur={id:'live-a',build:'spellblade',phase:'run',lv:4,gold:101};G.data.kept=[{id:'live-b',build:'hunter',phase:'run',lv:3,gold:202}];
  G.data.hardOpen=true;assert.equal(ctx.saveLocal(),true);assert.equal(await ctx.cloudFlush(),true);
  ctx.sessionStorage={getItem:()=> 'second-device',setItem:()=>{}};
  G.cloud=null;G.data=ctx.blankData();G.data.accountId=G.uid;
  await ctx.cloudLoad();assert.equal(call('saveCount()'),2);assert.equal(G.data.cur.gold,101);assert.equal(G.data.kept[0].gold,202);assert(G.data.hardOpen);
  denied=true;G.data.cur.gold=303;assert.equal(ctx.saveLocal(),true);assert.equal(await ctx.cloudFlush(),false);assert(G.cloud.dirty);assert.equal(ctx.loadLocal().cur.gold,303);
  denied=false;assert.equal(await ctx.cloudFlush(),true);
  G.cloud=null;G.uid='another-account';G.data=ctx.blankData();G.data.accountId=G.uid;await ctx.cloudLoad();assert.equal(call('saveCount()'),0);
  console.log('Shared mock account: two characters, hard unlock, second device load, failed upload/local save, retry, account isolation: passed ('+dir+')');
}
accountRegression().catch(e=>{console.error(e);process.exitCode=1;});
