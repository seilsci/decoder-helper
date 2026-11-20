#!/bin/bash
# 탐색 강화(한 단계 더 내다보기): master.sh로 표를 만들고 main에 머지한 뒤 실행
#   tools/table/la.sh                4~8번째 수 장면 전부 (PC용)
#   tools/table/la.sh --fr 0.9       수마다 도달 확률 90%까지의 장면만 (빠름)
#   --yes        검증 통과 뒤 Enter 없이 머지
#   --no-merge   검증까지만
#   JOBS=6       동시에 돌릴 계산 수 (기본 min(9, CPU 스레드 수))
#   B4N=40000    검증 4b 판 수 (기본 40000: 효과가 작아 2만판으로는 잡히지 않을 수 있음)
# 하는 일: la.js(9쌍) → la_apply.js(표 다시 쓰기) → cmp(9쌍 비교) → verify/checkall.js(검증 5개) → 머지
# 중간에 멈추면 그냥 다시 실행: 끝난 쌍(la/la.<x>.json)은 건너뜀. 처음부터 하려면 la/ 폴더를 지우고 실행.
cd "$(dirname "$0")" || exit 1
ROOT=$(cd ../.. && pwd); R="$ROOT/js/tables.js"
PAIRS="9 10 11 12 13 15 18 19 20"
FR=1; YES=0; MERGE=1
while [ $# -gt 0 ]; do case "$1" in
 --fr) FR=$2; shift;; --yes) YES=1;; --no-merge) MERGE=0;;
 *) echo "모르는 옵션: $1"; exit 1;; esac; shift; done
export B4N=${B4N:-40000}
JOBS=${JOBS:-$(node -e 'const os=require("os");console.log(Math.min(9,os.availableParallelism?os.availableParallelism():os.cpus().length))')}
say(){ echo "$*"; }
now(){ date +%s; }

# ── 0. 시작 조건: master.sh가 끝나 검증을 통과했고, 지금 표가 그 표이며 main에 올라가 있어야 함 ──
mkdir -p la prog
if [ ! -f la/applied ]; then
 node -e '
  const fs=require("fs"),c=require("crypto");const s=JSON.parse(fs.readFileSync("verify/out/summary.json","utf8"));
  const h=c.createHash("sha1").update(fs.readFileSync(process.argv[1])).digest("hex");
  if(!s.pass){console.log("master.sh 검증이 통과하지 않은 상태입니다. master.sh를 먼저 끝내세요.");process.exit(1)}
  if(s.hash.tables!==h){console.log("지금 js/tables.js가 master.sh가 검증한 표와 다릅니다. master.sh를 다시 실행하세요.");process.exit(1)}' "$R" || exit 1
 for n in 4 5 6 7 8; do for x in $PAIRS; do [ -f out$n/g$n.$x.json ] || { say "out$n/g$n.$x.json 없음 — master.sh를 먼저 끝내세요."; exit 1; }; done; done
 git -C "$ROOT" fetch -q origin main 2>/dev/null
 git -C "$ROOT" merge-base --is-ancestor HEAD origin/main || { say "지금 커밋이 아직 main에 없습니다. master.sh --merge로 먼저 머지하세요(검증 비교 기준이 main이라서)."; exit 1; }
fi
say "===== 탐색 강화 시작 $(date '+%Y-%m-%d %H:%M') (장면 비율 $FR, 동시 $JOBS개, 검증 4b ${B4N}판) ====="
T0=$(now)

# ── 1. 9쌍 계산 (la.js) ──
okj(){ node -e 'try{JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).changes||process.exit(1)}catch(e){process.exit(1)}' "$1"; }
todo=(); for x in $PAIRS; do okj la/la.$x.json || todo+=($x); done
if [ ${#todo[@]} -gt 0 ]; then
 say "탐색 강화 계산 진행중 (${#todo[@]}쌍)"
 for x in $PAIRS; do okj la/la.$x.json && echo 1 > prog/la.$x || rm -f prog/la.$x; done
 # 진행률: 쌍별 prog/la.<x>(0~1) 평균, 1% 오를 때만 한 줄
 ( last=-1; while :; do
   p=$(node -e 'const fs=require("fs");let s=0;for(const x of process.argv.slice(1)){try{s+=Math.min(1,+fs.readFileSync("prog/la."+x,"utf8")||0)}catch(e){}}console.log(Math.floor(s/(process.argv.length-1)*100))' $PAIRS)
   if [ "$p" -gt "$last" ]; then el=$(( $(now) - T0 )); eta="계산 중"; [ "$p" -ge 2 ] && eta="예상 $(( el*(100-p)/p/60 ))분"
    echo "탐색 강화 ${p}% 완료 (남은시간 : $eta)"; last=$p; fi
   [ "$p" -ge 100 ] && break; sleep 10; done ) &
 PP=$!
 fail=0; running=0
 for x in "${todo[@]}"; do
  while [ $(jobs -rp | grep -vc "^$PP$") -ge "$JOBS" ]; do sleep 2; done
  ( LA_FR=$FR PROG=prog/la.$x node la.js $x > la/la.$x.json 2> la/la.$x.err && echo 1 > prog/la.$x || { echo "  실패: 쌍 $x (la/la.$x.err 참고)"; rm -f la/la.$x.json; echo 1 > prog/la.$x; } ) &
 done
 while [ $(jobs -rp | grep -vc "^$PP$") -gt 0 ]; do sleep 5; done
 wait $PP 2>/dev/null
 for x in $PAIRS; do okj la/la.$x.json || fail=1; done
 [ $fail = 0 ] || { say "탐색 강화 계산 실패 — 위 오류를 확인한 뒤 다시 실행하면 이어서 계산합니다."; exit 1; }
fi
node -e 'const fs=require("fs");let s=0,c=0;for(const x of process.argv.slice(1)){const r=JSON.parse(fs.readFileSync("la/la."+x+".json"));s+=r.save;c+=r.changes.length;console.log("  쌍 "+x+": 바꿀 장면 "+r.changes.length+"개, 예상 절약 "+r.save.toFixed(4)+"클릭/판, "+Math.round(r.sec/60)+"분")}console.log("  합계: 바꿀 장면 "+c+"개, 9쌍 평균 예상 절약 "+(s/9).toFixed(4)+"클릭/판")' $PAIRS
say "탐색 강화 계산 완료"

# ── 2. 표 다시 쓰기 + 9쌍 비교 ──
say "표 쓰기·비교 진행중"
node la_apply.js "$R" || { say "표 쓰기 실패"; exit 1; }
touch la/applied
rm -f prog/state.json cmp/c.*; node runpar.js cmp cmp/c "$PAIRS" node cmp.js || { say "비교 실패"; exit 1; }
node mkbase.js baseline.next.json || exit 1
say "표 쓰기·비교 완료"

# ── 3. 검증 ──
say "검증 진행중 (4b ${B4N}판이라 시간이 걸립니다. 진행 표시 없음)"
node verify/checkall.js; vrc=$?
say "검증 완료 (전체 $(( ($(now) - T0) / 60 ))분)"
[ $vrc = 0 ] || { say "검증에 실패한 항목이 있어 머지하지 않습니다. 되돌리려면: git checkout -- js/tables.js && rm -rf tools/table/la (그리고 master.sh를 다시 실행하면 out4~8이 원래대로 돌아옴. 또는 la/bak의 파일을 out4~8에 복사)"; exit 1; }
[ $MERGE = 1 ] || { say "--no-merge: 머지하지 않고 끝냅니다."; exit 0; }

# ── 4. 머지 ──
BR=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)
[ "$BR" = main ] || [ "$BR" = HEAD ] && { say "작업 브랜치가 아닙니다($BR)."; exit 1; }
if [ $YES = 0 ]; then read -r -p "모두 통과했습니다. Enter를 누르면 커밋하고 main에 fast-forward 머지 + push합니다 (취소: Ctrl+C) " || { say "입력이 없어 머지하지 않았습니다."; exit 1; }; fi
cp baseline.next.json baseline.json
git -C "$ROOT" add js/tables.js tools/table/baseline.json || exit 1
git -C "$ROOT" diff --cached --quiet || git -C "$ROOT" commit -q -m "탐색 강화: 4~8번째 수 장면(비율 $FR)을 한 단계 더 내다본 칸으로 (la.sh, 검증 통과)" || exit 1
git -C "$ROOT" fetch -q origin main && git -C "$ROOT" merge-base --is-ancestor origin/main HEAD || { say "fast-forward가 안 됩니다."; exit 1; }
git -C "$ROOT" push origin "HEAD:$BR" && git -C "$ROOT" push origin HEAD:main || { say "push 실패"; exit 1; }
say "main 머지·push 완료: $(git -C "$ROOT" rev-parse --short HEAD)"
