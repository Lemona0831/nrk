'use strict';
// 같은 예산·장비·행동 정책으로 후보를 비교한다. 실제 플레이 승률이 아니다.
process.env.DGDIR=process.env.DGDIR || '06a2';
const D=require('./dgqa.js'),E=D.G0,Q=require('./qa.js');
const builds=['assassin','warden','hunter','elementalist','spellblade','monk'];
const coefficients=process.argv.includes('--current') ? ['current'] : ['old',.02,.03,.04];
const original=E.skillBaseDamage;
const magBase={"sb_edge":14,"sb_bleedcut":10,"sb_sweepcut":9,"sb_bloodmark":9,"sb_throat":15,"sb_deepline":8,"sb_redwind":7,"sb_taste":13,"sb_chaincut":15,"sb_splash":12,"sb_vein":12,"sb_whirl":13,"sb_pour":15,"sb_execchain":19,"sb_redrain":8,"sb_draw":17,"sb_redstorm":15,"sb_crimson":11,"sb_feast":12,"sb_scarlet":10,"sb_pathway":16,"sb_thirst":10,"sb_gale":9,"sb_ledger":5,"sb_deluge":6,"sb_ember":11,"sb_sparkcut":7,"sb_flare":4,"sb_heated":17,"sb_ring":6,"sb_snuff":9,"sb_char":7,"sb_brand":13,"sb_flamedown":15,"sb_sear":17,"sb_flamedance":13,"sb_lance":18,"sb_rush":5,"sb_coil":6,"sb_chainfire":8,"sb_blaze":23,"sb_hellfire":20,"sb_judgefire":11,"sb_pyre":12,"sb_inferno":8,"sb_ashcut":9,"sb_firefall":12,"sb_drake":14,"sb_bladeward":15,"sb_counter":15,"sb_bolt":11,"sb_unravel":14,"sb_beatcut":17,"sb_rebuke":6,"sb_rebound":12,"sb_wardbolt":19,"sb_turn":13,"sb_sunder":14,"sb_armor":15,"sb_weave":10,"sb_spellguard":9,"sb_reverse":19,"sb_rhythm":13,"sb_finale":25,"sb_bulwark":14,"sb_measure":24,"sb_barrage":22,"sb_twin":22,"sb_coda":17};
function version(c){
 for(const s of E.SKILLS2.spellblade){const f=s.fx.find(f=>f.k==='dmg');if(f && c!=='current')f.n=c==='old'?magBase[s.id]:Math.round(magBase[s.id]*.8);}
 E.skillBaseDamage=c==='current'?original:(p,s,n)=>{
  if(!n||p.build==='novice')return n || 0;
  const key=E.skillGrowthStat(s),w=key==='int'?0:Math.max(0,(p.gear?.wpn || 8)-8);
  return c==='old'?n*.8*(1+(p.stat[key]||0)*.01+w*.025):n*(1+(p.stat[key]||0)*c)+n*w*.02;
 };
}
function trial(build,ch,style,kind,seed){
 const lv=[5,9,13][ch-1],budget=20+(lv-1)*3;
 const attack=style==='attack'?Math.floor(budget*.5):0;
 const key=build==='elementalist'?'int':['assassin','hunter'].includes(build)?'dex':'str';
 const stats={str:0,dex:0,int:0,con:budget-attack,wil:0};
 if(build==='spellblade'){stats.str=Math.floor(attack/2);stats.int=attack-stats.str;stats.wil=Math.floor((budget-attack)*.3);stats.con-=stats.wil;}else stats[key]=attack;
 const list=E.SKILLS2[build],starters=list.filter(s=>s.start);
 let extra=list.filter(s=>!s.start&&s.tier==='하급'&&s.row<=6);
 extra=[1,2,3,4].map(row=>extra.find(s=>s.row===row)).filter(Boolean);
 const skills=starters.concat(extra).map(s=>s.id);
 if(build==='spellblade')skills.splice(0,skills.length,'sb_edge','sb_aegis','sb_bolt','sb_shell','sb_rebound',ch===1?'sb_bladeward':ch===2?'sb_wardbolt':'sb_sunder');
 const p=E.mkPlayer(build,{},stats,skills);p.lv=lv;
 const run={p,build,ch,inv:{},eqU:{},bag:[]};
 for(const sl of ['weapon','armor','gloves','amulet','ring1','ring2','flask']){
  const tpl=sl==='weapon'&&ch===1?'start_wpn_'+build:sl==='armor'&&ch===1?'start_armor':sl==='flask'?'start_flask':E.itemBookEntries('gear').find(x=>x.ch===ch&&x.group===(sl.startsWith('ring')?'ring':sl)&&x.grade==='n')?.id;
  if(!tpl)continue;const it={uid:sl,tpl,g:'n',ch:tpl.startsWith('start_')?1:ch,b:tpl.startsWith('start_')?0:3,rollV:2};run.inv[sl]=it;run.eqU[sl]=sl;
 }
 E.applyGear(run,true);
 const room={ch,lv,floor:kind==='boss'?24:10,names:D.run_('ENEMY_NAMES['+ch+']'),path:'main',en:[['bruiser',2],['archer',1]],boss:kind==='boss'?1:0};
 const b=E.roomBattle(p,room,kind==='boss'?['abbot','cryptlord','queen'][ch-1]:null,seed),rng=Q.rng(seed),mem={};b.rngF=rng;
 let actions=0;
 while(!b.over&&actions++<180){
  const [id,target]=Q.heuristic(b,Q.PERSONAS.careful,rng,mem);const a=E.actionList(b).find(a=>a.id===id&&a.ok);
  if(!a)break;E.playerAct(b,id,target);
  const bugs=[];Q.invariants(b,bugs,build+'/'+ch);if(bugs.length)throw Error(bugs.join('\n'));
 }
 return {win:b.over==='win',actions,round:b.round,hp:p.hp/p.hpMax};
}
for(const c of coefficients){version(c);const rows=[];
 for(const build of builds)for(const ch of [1,2,3])for(const style of ['defense','attack'])for(const kind of ['normal','boss']){
  const trials=Array.from({length:4},(_,i)=>trial(build,ch,style,kind,900+i));
  rows.push({build,ch,style,kind,wins:trials.filter(t=>t.win).length,actions:+(trials.reduce((a,t)=>a+t.actions,0)/4).toFixed(1),hp:+(trials.reduce((a,t)=>a+t.hp,0)/4).toFixed(2)});
 }
 console.log(JSON.stringify({coefficient:c,battles:rows.length*4,normalWins:rows.filter(r=>r.kind==='normal').reduce((a,r)=>a+r.wins,0),bossWins:rows.filter(r=>r.kind==='boss').reduce((a,r)=>a+r.wins,0),spellblade:rows.filter(r=>r.build==='spellblade'),attackActions:rows.filter(r=>r.style==='attack'&&r.kind==='normal').reduce((a,r)=>a+r.actions,0)/18,defenseActions:rows.filter(r=>r.style==='defense'&&r.kind==='normal').reduce((a,r)=>a+r.actions,0)/18}));
}
