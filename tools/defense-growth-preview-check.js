'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0;
let wardCases=0,costCases=0,nextCases=0;
const close=(a,b,m)=>assert(Math.abs(a-b)<1e-8,m+': '+a+'/'+b);
for(const build of ['warden','spellblade'])for(const s of E.SKILLS2[build].filter(s=>s.fx.some(f=>f.k==='ward'||f.k==='wardFill')))for(const lv of [1,5,10,16])for(const con of [0,10,30])for(const wil of [0,10,30,50])for(const eq of [{},{ring1:'wardband'},{armor:'mirrorarmor',gloves:'shieldknuckle',amulet:'emberbulwark'}]){
 const p=E.mkPlayer(build,eq,{con,wil},[s.id]);p.lv=lv;E.applyStats(p,p.stat);p.ward=0;p.hp=p.hpMax;const snapshot=JSON.stringify({p,hit:D.run_('FXHIT')}),want=E.skillWardFromEmpty(p,s);
 assert.equal(JSON.stringify({p,hit:D.run_('FXHIT')}),snapshot,'보호막 미리보기 부작용 없음');
 const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});b.rngF=()=>.99;E.runSkill2(b,E.v2Static(s),e);close(p.ward,want,s.id+' 빈 보호막 실제 생성');wardCases++;
 for(const k of ['con','wil']){const text=E.statGrowthPreview(p,k);assert(!/NaN|undefined|Infinity/.test(text));if(k==='wil')assert(text.includes('보호막 부여량(빈 상태·추가 전투 보정 전)'));}
}
for(const s of E.SKILLS2.bloodmage.filter(s=>s.fx.some(f=>f.k==='hpCost')))for(const con of [0,1,10,13,30])for(const eq of [{},{flask:'bloodoil'}])for(const lv of [1,5,16]){
 const p=E.mkPlayer('bloodmage',eq,{con},[s.id]);p.lv=lv;E.applyStats(p,p.stat);p.hp=p.hpMax;const state=JSON.stringify({p,hit:D.run_('FXHIT')}),text=E.statGrowthPreview(p,'con');assert(text.includes('스킬 생명력 비용: '+s.n+' '));assert.equal(JSON.stringify({p,hit:D.run_('FXHIT')}),state,'피 비용 미리보기는 지불하지 않음');
 const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=1e6;const b=E.newBattle(p,[e],{});b.rngF=()=>.99;E.runSkill2(b,E.v2Static(s),e);const paid=b.rec.find(r=>r.k==='blood'&&r.w==='hp'&&r.id===s.id)?.n||0;assert(text.includes(s.n+' '+paid+' →'),s.id+' 실제 비용과 표시 일치');costCases++;
}
for(const [build,list] of Object.entries(E.SKILLS2))for(const skill of list)for(const k of ['str','dex','int','con','wil'])for(const value of [0,10,30]){
 const p=E.mkPlayer(build,{},Object.fromEntries(['str','dex','int','con','wil'].map(key=>[key,value])),[skill.id]);
 const before=JSON.stringify({p,hit:D.run_('FXHIT')}),text=E.statNext(p,k),dm=skill.fx.find(f=>f.k==='dmg');
 assert.equal(JSON.stringify({p,hit:D.run_('FXHIT')}),before,'다음 1점 안내 부작용 없음');
 assert(!/NaN|undefined|Infinity/.test(text));
 const grows=!!dm&&E.skillGrowthStat(skill)===k;
 assert.equal(text.includes('장착 스킬 기본 피해'),grows,build+'/'+skill.id+'/'+k+' 관련 능력치만 안내');
 if(grows){
  assert(text.includes('장착 스킬 기본 피해 +'+value*4+'% → +'+(value+1)*4+'%'));
  const up={...p,stat:{...p.stat,[k]:value+1}};
  assert(E.skillBaseDamage(up,skill,dm.n)>E.skillBaseDamage(p,skill,dm.n),'표시한 능력치로 실제 기본 피해 증가');
 }
 nextCases++;
}
console.log(JSON.stringify({passed:true,wardCases,costCases,nextCases}));
