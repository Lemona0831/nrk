'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0;
const all=E.itemBookEntries('gear'),cons=E.itemBookEntries('cons');
assert.equal(new Set(all.map(x=>x.id)).size,all.length);
assert(all.every(x=>x.D.kind!=='start'));
assert.deepEqual(Array.from(all,x=>x.id).sort(),[...new Set(D.run_('Object.values(CH_POOLS).flat()'))].filter(id=>E.ITEMS[id] && E.ITEMS[id].kind!=='start').sort());
assert.equal(cons.length,Object.keys(E.CONS).length);
for(const x of all.concat(cons)){
 const h=E.itemBookDetail(x);assert(!h.includes('undefined'),x.id);assert(h.includes(x.D.n),x.id);
 assert(!/data-a="(?:eqon|eqdrop|usecons|consuse)"/.test(h));
}
const S={type:'gear',q:'',ch:'all',group:'all',grade:'all',page:0};
const blood=E.itemBookRows({...S,q:'피를 마시는 칼'});assert.equal(blood.length,1);assert(E.itemBookDetail(blood[0]).includes('최대 생명력 −10%'));
for(const ch of [1,2,3])for(const group of ['weapon','armor','gloves','amulet','ring','flask']){
 const rows=E.itemBookRows({...S,ch:String(ch),group});assert(rows.length);assert(rows.every(x=>x.ch===ch&&x.group===group));
}
for(const grade of ['n','m','r','h','l'])assert(E.itemBookRows({...S,grade}).every(x=>x.grade===grade));
assert.equal(E.itemBookRows({...S,q:'<script>없는장비'}).length,0);
assert(E.itemBookResults({...S,page:999}).includes('disabled'));
const herb=cons.find(x=>x.id==='herb');assert(E.itemBookDetail(herb).includes('12%'));assert(E.itemBookDetail(herb).includes('20%'));assert(E.itemBookDetail(herb).includes('5개'));
assert(E.itemBookDetail(cons.find(x=>x.id==='bellshard')).includes('보스와 땅속에 숨은 적은 제외'));
assert(E.itemBookRows({...S,type:'cons',grade:'m'}).every(x=>x.D.vm!=null));
console.log(`아이템 도감 검증 통과: 장비 ${all.length}종·소모품 ${cons.length}종, 공개 장비 풀 일치·중복 없음, 챕터·부위·등급·검색, 수치·대가·소모품 고급·보스 제외, 페이지 한도·읽기 전용`);
