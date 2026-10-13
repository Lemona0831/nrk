'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),{G0:E,run_:V}=require('./dgqa.js');
function make(){const r={build:'spellblade',p:E.mkPlayer('spellblade',{},{}),bag:[],swaps:[],room:4,cons:[]};E.initGear(r);for(let i=0;i<E.BAG_MAX;i++){const it=E.mkItem('bloodblade');assert(E.addItem(r,it));}return r;}
let r=make(),it=E.mkItem('bloodblade'),prev=r.eqU.weapon;
assert.equal(E.equipReward(r,it,'weapon'),'');assert.equal(r.eqU.weapon,it.uid);assert(!r.inv[prev]);assert.equal(E.bagUsed(r),E.BAG_MAX);assert(E.gearCheck(r));assert.equal(r.discards.length,1);
r=make();it=E.mkItem('bloodblade');r.inv[r.eqU.weapon].locked=true;const before=JSON.stringify(r);
assert(E.equipReward(r,it,'weapon'));assert.equal(JSON.stringify(r),before);
r=make();it=E.mkItem('ledger');assert.equal(E.equipReward(r,it,'ring2'),'');assert.equal(E.bagUsed(r),E.BAG_MAX);assert(E.gearCheck(r));assert(!r.discards);
r=make();r.bag.pop();delete r.inv[Object.keys(r.inv).find(u=>!r.bag.includes(u)&&!Object.values(r.eqU).includes(u))];it=E.mkItem('bloodblade');prev=r.eqU.weapon;r.inv[prev].locked=true;
assert.equal(E.equipReward(r,it,'weapon'),'');assert(r.bag.includes(prev));assert(r.inv[prev].locked);assert(E.gearCheck(r));
r=make();const a=E.mkItem('ledger');a.g='l';E.equipReward(r,a,'ring2');it=E.mkItem('bloodblade');it.g='l';const snapshot=JSON.stringify(r);assert(E.equipReward(r,it,'weapon'));assert.equal(JSON.stringify(r),snapshot);
const p=E.mkPlayer('spellblade',{},{}),e=E.mkEnemy('skeleton',false,0);e.pile={wait:1};const b=E.newBattle(p,[e],{ch:2});E.__G.b=b;
assert(E.infoHtml('epile:'+e.id).includes('1라운드'));assert(E.infoHtml('epile:'+e.id).includes('석회 가루'));
console.log('가득 찬 가방 교체·빈 칸 장착·잠금·전설 제한·장비 무결성·뼈 더미 설명 통과');
