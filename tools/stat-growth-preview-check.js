'use strict';
process.env.DGDIR=process.env.DGDIR||'06a2';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0;
const pct=(a,b)=>Math.round((b/a-1)*1000)/10;
let cases=0,skillCases=0,capCases=0;
for(const build of Object.keys(E.TREE2))for(const br of E.TREE2[build].branches)for(const lv of [5,10,16])for(const points of [0,10,25,50])for(const eq of [{},{weapon:'twin',armor:'plate',amulet:'bloodpact'},{armor:'cloak',amulet:'rosary'}]){
 const skills=E.TREE2[build].starters.concat(E.SKILLS2[build].filter(s=>s.b===br&&s.row<=4).slice(0,4).map(s=>s.id));
 const p=E.mkPlayer(build,eq,{str:points,dex:points,int:points,con:points,wil:points},skills);p.lv=lv;E.applyStats(p,p.stat);p.ward=E.wardMax(p);p.hp=p.hpMax;
 for(const k of ['str','dex','int','con','wil']){
  const state=JSON.stringify({p,fx:D.run_('FXHIT')}),text=E.statGrowthPreview(p,k);
  assert.equal(JSON.stringify({p,fx:D.run_('FXHIT')}),state,'미리보기는 플레이어·장비 발동 횟수를 변경하지 않음');
  assert(text&&!/NaN|Infinity|undefined/.test(text),build+'/'+k);
  const up=JSON.parse(JSON.stringify(p));E.applyStats(up,{...up.stat,[k]:points+3});
  if(k==='str'||k==='con')assert(text.includes('최대 생명력 '+p.hpMax+' → '+up.hpMax),build+' 장비·레벨·페널티 포함 생명력');
  if(k==='dex'){assert(text.includes('최대 스태미나 '+p.stMax+' → '+up.stMax));assert(text.includes('흘리기 감소 '+Math.round(E.parryRed(p)*1000)/10+'% → '+Math.round(E.parryRed(up)*1000)/10+'%'));capCases++;}
  if(k==='wil'){assert(text.includes('+'+pct(E.healMul(p),E.healMul(up))+'%'));assert(text.includes(Math.min(25,points)+'% → '+Math.min(25,points+3)+'%'));assert(text.includes('상한에 닿기 전'));capCases++;}
  const gains=skills.map(id=>E.SK2[id]).filter(s=>s.fx.some(f=>f.k==='dmg')&&E.skillGrowthStat(s)===k).map(s=>{const n=s.fx.find(f=>f.k==='dmg').n;return pct(E.skillBaseDamage(p,s,n),E.skillBaseDamage(up,s,n));});
  if(gains.length){const lo=Math.min(...gains),hi=Math.max(...gains);assert(text.includes('장착 스킬 기본 피해 +'+(lo===hi?lo+'%':lo+'~'+hi+'%')),'현재 피해 대비 증가율');skillCases++;}
  else assert(!text.includes('장착 스킬 기본 피해'),build+' 무관한 능력치를 공격 성장으로 표시하지 않음');
  cases++;
 }
}
console.log(JSON.stringify({passed:true,classes:Object.keys(E.TREE2).length,cases,skillCases,capCases}));
