'use strict';
// 교대 주문의 공격·약화·보호와 실제 피격 소모를 함께 확인한다.
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0;
assert.match(E.skBody(E.SK2.sb_unravel),/교대.*보호 1/,'설명도 실제 보호1을 표시');
const latest=D.run_('CHANGELOG[0]');assert.match(latest.v,/마갑 교대/);assert.match(latest.items[0].t,/2에서 1/);
let cases=0;
for(const wil of [0,20,50])for(const prev of [null,'spell','cut'])for(const int of [0,15,30]){
 const p=E.mkPlayer('spellblade',{}, {con:100,wil,int},E.TREE2.spellblade.starters.concat('sb_unravel'));
 const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;e.s={};
 const b=E.newBattle(p,[e],{}),a=E.v2Static(E.SK2.sb_unravel);b.turnIdx=1;p.sbLast=prev;p.ward=0;p.s={};
 b.cur={id:a.id};const hp=e.hp;E.sbBegin(b,a.id,a,e);E.runSkill2(b,a,e);E.sbEnd(b,a);b.cur=null;
 assert(Math.abs(hp-e.hp-11*(1+.04*int))<1e-7,'주문 기본 피해 보존');
 assert.equal(E.st(e,'weak'),2,'약화 보존');assert.equal(p.cd.sb_unravel,5,'쿨타임 보존');assert.equal(a.time,1,'보통 행동');
 const alt=prev==='cut';assert.equal(E.st(p,'protect'),alt?1:0,'교대에만 보호1');assert.equal(p.ward,alt?4:0,'교대4 고정·의지 제외');
 if(alt){const w=p.ward;p.sbLast='cut';E.sbBegin(b,a.id,a,e);E.runSkill2(b,a,e);E.sbEnd(b,a);assert.equal(p.ward,w,'같은 차례 기본 교대 재지급 제외');}
 // 별도 피격 상태에서 보호 한 겹의 소모와 다음 직접 공격을 확인한다.
 p.s={};p.ward=0;if(alt)E.addS(b,p,'protect',1);
 const before=p.hp;E.hurtPlayer(b,40,{src:e,single:1});assert.equal(before-p.hp,alt?30:40,'첫 공격 감소');
 assert.equal(E.st(p,'protect'),0);const mid=p.hp;E.hurtPlayer(b,40,{src:e,single:1});assert.equal(mid-p.hp,40,'두 번째 공격에는 보호가 남지 않음');
 cases++;
}
for(const wil of [0,20,50]){
 const p=E.mkPlayer('spellblade',{}, {con:100,wil},['sb_shell']),e=E.mkEnemy('bruiser',false,0),b=E.newBattle(p,[e],{});
 p.ward=0;E.runSkill2(b,E.v2Static(E.SK2.sb_shell),null);assert.equal(p.ward,18*(1+.02*wil));assert.equal(E.SK2.sb_shell.time,'fast');assert.equal(E.st(p,'protect'),1);cases++;
}
console.log(JSON.stringify({pass:true,cases,folder:process.env.DGDIR,scope:'교대 조건·공격 성장·약화·보호 소모·고정 교대·방호 의지 보정'}));
