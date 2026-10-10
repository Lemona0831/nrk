'use strict';process.env.DGDIR='06a2';const D=require('./dgqa.js'),E=D.G0,V=D.run_,assert=require('assert/strict');
const slots=V('SLOT_BASE'),grades=V('GRADE');let n=0;
for(const [kind,base] of Object.entries(slots)){
 const tpl=Object.keys(E.ITEMS).find(k=>E.tplKind(k)===kind);
 const values=[1,2,3].map(ch=>E.itemBase(E.mkItem(tpl,{ch,b:grades.n.lo})).v);
 assert(values[1]>values[0]&&values[2]>values[1],kind+' 챕터 성장');
 for(let ch=1;ch<=3;ch++){let prev=0;for(const g of ['n','m','r','h','l']){const a=E.itemBase(E.mkItem(tpl,{g,ch,b:grades[g].lo})).v,b=E.itemBase(E.mkItem(tpl,{g,ch,b:grades[g].hi})).v;assert(a>prev);prev=b;n++;}}
}
const run={build:'assassin',p:E.mkPlayer('assassin',{}),bag:[],swaps:[],cons:[],room:0};E.initGear(run);
const st0=run.p.stMax,amu=Object.keys(E.ITEMS).find(k=>E.tplKind(k)==='amulet'&&!V('IFX')[k]?.st&&!V('IFX')[k]?.cost&&E.ITEMS[k].kind!=='start');
const it=E.mkItem(amu,{ch:2,b:0});E.addItem(run,it);assert.equal(E.equipUid(run,it.uid,'amulet'),'');assert.equal(run.p.stMax-st0,9);assert.equal(run.p.mpMax,0);
run.p.hp=1;run.cons=[{id:'stone',g:'n',n:1},{id:'herb',g:'n',n:2},{id:'bandage',g:'n',n:1}];
let rows=E.consRows(run,null,'restore',true,'',null);assert.deepEqual(Array.from(rows,x=>x.i),[1]);assert.equal(E.consRows(run,null,'all',false,'중독',null).length,0);
assert.equal(E.consRows(run,null,'all',false,'약초',null)[0].i,1);const old=JSON.stringify(run.cons);E.consRows(run,null,'all',false,'',null);assert.equal(JSON.stringify(run.cons),old);
const legacy=JSON.parse(JSON.stringify(run));legacy.dg={};legacy.dgv=2;legacy.stats={str:0,dex:0,int:0,con:0,wil:0};legacy.ch=1;
for(const item of Object.values(legacy.inv)){delete item.rollV;delete item.foundAt;}
E.__legacy=legacy;const base=JSON.parse(JSON.stringify(slots));
V('SLOT_BASE.amulet={k:"mp",lab:"최대 마나",v:[5,8,12]};applyGear(__legacy)');
legacy.p.st=legacy.p.stMax/2;const beforeSt=legacy.p.stMax,bonus=legacy.inv[it.uid].b;
Object.assign(slots,base);V('render=()=>{};awkOpen=()=>{}');E.__G.data={cur:JSON.parse(JSON.stringify(legacy))};E.resumeRun();
assert.equal(E.__G.run.p.stMax,beforeSt+9);assert.equal(E.__G.run.p.st,E.__G.run.p.stMax/2);assert.equal(E.__G.run.inv[it.uid].b,bonus);
const saved=JSON.parse(JSON.stringify(legacy));saved.battle={b:E.roomBattle(saved.p,V('ROOMS')[0],null,7)};E.restoreBattle(JSON.parse(JSON.stringify(saved)));
assert.equal(E.__G.b.p,E.__G.run.p);assert.equal(E.__G.b.p.stMax,beforeSt+9);
console.log('챕터·등급 성장',n,'조건, 목걸이 스태미나, 소모품 필터 원본 인덱스, 옛 저장본·전투 이어하기 통과');
