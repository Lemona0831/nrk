'use strict';
process.env.DGDIR='06a2';
const assert=require('assert/strict');const D=require('./dgqa.js');const E=D.G0,V=D.run_;let n=0;
for(const build of V('Object.keys(TREE2)')) for(const ch of [1,2,3]) for(const id of ['basic','heavy']) {
 const p=E.mkPlayer(build,{},E.statRecommend(build,{},15),V(`TREE2['${build}'].starters`));
 const b=E.roomBattle(p,{ch,lv:1,floor:1,type:'normal',en:[['bruiser',0]],names:V(`ENEMY_NAMES[${ch}]`),mods:[]},null,7);
 E.__uiBattle=b;V('G.b=__uiBattle;G.busy=false;G.sel=null');
 const before=JSON.stringify(b),sim=V(`actSim(G.b,'${id}')`);assert.equal(JSON.stringify(b),before,'미리보기가 원본 전투를 변경함');
 if(!sim)continue;
 for(const r of [0,.9999]) {const c=JSON.parse(before);c.ctx.test=1;c.stepMode=true;c.waiting=false;c.rngF=()=>r;E.playerAct(c,id,null);assert.equal(sim.st,Math.round((c.p.st-b.p.st)*10)/10);for(const e of b.en) {const q=c.en.find(x=>x.id===e.id);const d=e.hp-Math.max(0,q.alive?q.hp:0),s=sim.en[e.id];if(s)assert(d>=s.lo-.1&&d<=s.hi+.1);}}
 n++;
}
console.log('미리보기 즉시 결과·원본 불변:',n,'직업×챕터×공격 조건 통과');
