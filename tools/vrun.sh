#!/bin/bash
# 7단계 검증 구동 (docs/검증/검증-계획.md 6절 · docs/검증/검증-결과.md): 던전 자동 테스터를 조각으로 나눠 병렬로 돌리고 합친다.
#   사용: bash tools/vrun.sh [출력 폴더, 기본 verify_out]      (24코어에서 약 20분)
#   조각마다 tools/ 와 06a2/ 사본을 만들어 tools/eng.gen.js 경합을 피한다. 도는 동안 코드를 고치지 않는다.
#   결과: <출력>/par/v_<태그>.json, 표: node tools/vresult.js <출력>/par > docs/검증/검증-결과.md
R="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${1:-$R/verify_out}"; mkdir -p "$OUT/par" "$OUT/work"
LOG="$OUT/driver.log"; : > "$LOG"
par() { # par <태그> <조각 수> <판 수(칸당)> <끝 챕터>
  local TAG=$1 K=$2 N=$3 CH=${4:-1} i
  for i in $(seq 0 $((K-1))); do
    local D="$OUT/work/${TAG}_$i"; rm -rf "$D"; mkdir -p "$D"; cp -r "$R/tools" "$R/06a2" "$D/"
    ( cd "$D" && DG_LOCK=1 DGDIR=06a2 SHARD=$i/$K node tools/dgqa.js $N "$D/out.json" $CH > "$D/out.txt" 2>&1 ) &
  done
  wait
  node -e 'const fs=require("fs");const [O,T,K]=process.argv.slice(1);let a=[];for(let i=0;i<+K;i++)a=a.concat(JSON.parse(fs.readFileSync(O+"/work/"+T+"_"+i+"/out.json","utf8")));fs.writeFileSync(O+"/par/"+T+".json",JSON.stringify(a));console.log(T,a.length,"판, 이상",a.reduce((q,x)=>q+x.bugs.length,0),"건")' "$OUT" "$TAG" "$K"
  for i in $(seq 0 $((K-1))); do rm -rf "$OUT/work/${TAG}_$i"; done
}
run() { local tag=$1; shift; echo "$(date +%H:%M:%S) start $tag" >> "$LOG"; "$@" >> "$LOG" 2>&1; echo "$(date +%H:%M:%S) done $tag" >> "$LOG"; }
export DG_LOCK=1
run L1_learn par v_learn 8 40 3                                   # 일반 1→3챕터, 학습용 씨앗(5000부터 13 간격) 9직업 × 6성향 × 40
SEED=90000 run L2_held par v_held 8 40 3                          # 쓰지 않은 씨앗(90000부터)
DG_FROM=2 run L3_from2 par v_from2 8 20 3                         # 2챕터부터(1챕터를 깬 캐릭터 흉내)
DG_FROM=3 run L4_from3 par v_from3 8 20 3                         # 3챕터부터
MODE=hard run L5_hard par v_hard 8 40 3                           # 가혹 모드
for P in rough main quiet; do PATH_FIX=$P PK=careful run L7_path_$P par v_path_$P 4 20 3; done   # 길 고정
declare -A BR=( [assassin]="독사 격발 그림자" [hunter]="저격 연사 기동" [butcher]="도륙 광기 학살" [elementalist]="불꽃 서리 공명" [spellblade]="피칼날 불칼 주문갑" [monk]="철권 부동 혈도" [confessor]="속죄 전가 고행" [bloodmage]="역병 포식 혈약" )
for C in assassin warden hunter butcher elementalist spellblade monk confessor bloodmage; do   # 갈래 고정 × 신중 · 숙련
  i=0; if [ "$C" = warden ]; then LIST=("성벽" "파쇄" "전열 장악"); else read -ra LIST <<< "${BR[$C]}"; fi
  for B in "${LIST[@]}"; do i=$((i+1)); FOCUS="$B" CLS=$C PK=careful,expert run L6_${C}_$i par v_f_${C}_$i 2 20 3; done
done
echo "$(date +%H:%M:%S) ALLDONE" >> "$LOG"
