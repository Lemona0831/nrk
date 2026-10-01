# 테스트 결과(qa.json)를 읽어 직업 승률과 아이템별 승률 차이를 보여 준다.
import os
import json, math, sys
HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, 'qa.json'), encoding='utf-8'))['runs']
pct=lambda a,b: round(100*a/b) if b else 0
w=lambda f: pct(sum(r['result']=='win' for r in R if f(r)), sum(1 for r in R if f(r)))
CL=['berserker','hunter','arcanist','templar','warlock','assassin','scar','priest']
cl={b:w(lambda r:r['build']==b) for b in CL}
print('판', len(R), 'bugs', sum(len(r['bugs']) for r in R), '| 직업', cl, '평균', round(sum(cl.values())/8), '폭', max(cl.values())-min(cl.values()))
IT=['ragechain','markamu','resostone','wardcrest','vpouch','bloodoil','rosary','scarcharm','chalice','pulse','ledger','echo','vanguard','twin','maul','thorns','cloak','bloodpact','sigil','fury','focusring','venomring','boilflask','chaingl','knot']
NICHE={'knot':['burst','release','scarburst'],'scarcharm':None,'vpouch':None}
rows=[]
for it in IT:
  pool=R
  if it=='knot': pool=[r for r in R if any(s in r['skills'] for s in ['burst','release','scarburst'])]
  if it=='scarcharm': pool=[r for r in R if r['build']=='scar' or any(s in r['skills'] for s in ['scarcut','release'])]
  MEL=['crush','cleave','reckless','shieldbash','lava','viper','scarcut','shadowstrike','scarburst']
  if it=='chaingl': pool=[r for r in R if any(s in r['skills'] for s in MEL)]
  if it=='bloodoil': pool=[r for r in R if r['build']=='warlock' or 'ledger' in r['freeEquipped'] or any(s in r['skills'] for s in ['reckless','bloodlance','bloodlet'])]
  if it=='wardcrest': pool=[r for r in R if r['build'] in ('templar','arcanist') or any(s in r['skills'] for s in ['barrier','aura','atone'])]
  if it=='vpouch': pool=[r for r in R if r['build']=='assassin' or any(s in r['skills'] for s in ['viper','cloud','dagger','smoke','burst'])]
  on=[r for r in pool if it in r['freeEquipped']]; off=[r for r in pool if it not in r['freeEquipped']]
  if not on: rows.append((None,it,0,0)); continue
  p1=sum(r['result']=='win' for r in on)/len(on); p0=sum(r['result']=='win' for r in off)/len(off)
  rows.append((round((p1-p0)*100), it, len(on), round(math.sqrt(p1*(1-p1)/len(on))*100,1)))
print('자발 아이템 (차이, 오차, 판)')
print('  '+' '.join(f"{it}{d:+d}(±{se},{n})" for d,it,n,se in sorted([x for x in rows if x[0] is not None])))
print('막힘 해결용 5번 방 첫 시도 통과율:')
for bi in ['없음','hook','plate','witness']:
  xs=[x for r in R for x in r['rooms'] if x['room']==4 and x['try']==0 and r['blockItem']==bi]
  print('  ',bi, pct(sum(x['res']=='win' for x in xs),len(xs)),'%', len(xs),'판')
json.dump({'cl':cl,'items':rows,'n':len(R)}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'final_items.json'),'w'))
