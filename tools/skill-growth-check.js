'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0;
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const cases=[['spellblade','sb_edge','str'],['spellblade','sb_bolt','int'],['assassin','a_stab','dex'],['hunter','h_burst','dex'],['elementalist','e_ember','int']];
// 스킬 이름에 의존하지 않도록 해당 직업의 순수 기본 피해 스킬을 고른다.
for(const row of cases){if(!E.SK2[row[1]]) row[1]=Object.values(E.SK2).find(s=>s.id.startsWith({assassin:'a_',hunter:'h_'}[row[0]])&&s.fx.some(f=>f.k==='dmg')).id;}
for(const [build,id,key] of cases){
 const src=E.SK2[id],n=src.fx.find(f=>f.k==='dmg').n;
 const s={...src,hits:2,fx:[{k:'dmg',n}]};
 const p=E.mkPlayer(build,{},{}),e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=10000;
 near(E.skillBaseDamage(p,s,n),n);
 p.stat={con:100,wil:100};near(E.skillBaseDamage(p,s,n),n);
 for(const points of [5,10,15,20,25]){p.stat={[key]:points};near(E.skillBaseDamage(p,s,n),n*(1+points*.04));}
 p.stat={[key]:5};const beforeLevel=E.skillBaseDamage(p,s,n);p.stat[key]+=3;near(E.skillBaseDamage(p,s,n)-beforeLevel,n*.12);
 p.stat={[key]:50};near(E.skillBaseDamage(p,s,n),n*3);
 const oldHurt=E.hurtEnemy,values=[];
 try{E.hurtEnemy=(b,e,d)=>{values.push(d);return d;};E.runSkill2(E.newBattle(p,[e],{}),E.v2Static(s),e);}finally{E.hurtEnemy=oldHurt;}
 assert.equal(values.length,2);for(const v of values)near(v,n*3);
 assert(E.skillDamageHint(p,s).includes('× 2타'));
 const before=E.skillBaseDamage(p,s,n);p.gear={wpn:20};near(E.skillBaseDamage(p,s,n),before+(key==='int'?0:n*.24));
}
for(const id of ['sb_rebound','sb_sunder']){assert.equal(E.SK2[id].time,'normal');assert.equal(E.v2Static(E.SK2[id]).time,1);assert.equal(E.SK2[id].cd,5);}
assert.equal(E.SK2.sb_bolt.time,'normal'); // 0.8.0 M5-0: 마갑탄은 비용 1 리듬 칸(주 행동, 빠른 칸 아님)
for(const id of ['sb_bolt','sb_spellguard']){
 const s=E.SK2[id],f=s.fx.find(f=>f.k==='wardDmg');
 near(E.wardDamageInfo(f,20).take,f.drainAll?20:10);near(E.wardDamageInfo(f,20).bonus,f.drainAll?10:5);
 near(E.wardDamageInfo(f,10000).take,f.drainAll?10000:f.cap/f.per);
 const p=E.mkPlayer('spellblade',{},{});p.stat={int:50};p.ward=20;
 const es=[0,1].map(i=>{const e=E.mkEnemy('bruiser',false,i);e.hp=e.hpMax=10000;return e;});
 const values=[],oldHurt=E.hurtEnemy;
 try{E.hurtEnemy=(b,e,d)=>{values.push(d);return d;};E.runSkill2(E.newBattle(p,es,{}),E.v2Static(s),es[0]);}finally{E.hurtEnemy=oldHurt;}
 near(p.ward,f.drainAll?0:10);for(const v of values)near(v,s.fx.find(f=>f.k==='dmg').n*3+(f.drainAll?10:5));
 assert.equal(values.length,id==='sb_spellguard'?2:1);
}
const p=E.mkPlayer('elementalist',{},{});p.stat={int:30};near(E.dotMul(p),1.6);
near(E.skillBaseDamage({...p,build:'novice'},{id:'tut_bash'},12),12);
for(const boss of D.run_('Object.keys(BOSSES)'))for(let lv=1;lv<=15;lv++){const e=E.mkBoss(boss,1,lv);assert.equal(e.hp,e.hpMax);}
console.log('스킬 성장 검증 통과: 힘·민첩·지능·무기·방어 투자 구분, 실제 다중 타격, 보호막 추가 피해 배율 제외·광역 1회 소모, 행동 시간·쿨타임, 지속 피해·수련장 유지');
