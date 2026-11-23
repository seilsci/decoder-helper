#!/bin/bash
# 시작 추천 표(OPENX1~13) 다시 만들기 — 판 기록 받기 → 모델 맞춤 → 9쌍 병렬 계산 → 검증 → (통과 시) main에 머지
#
#   tools/table/master.sh             처음부터 끝까지 (중간에 멈췄으면 끝난 단계는 건너뜀)
#   tools/table/master.sh --yes       기록 확인(y/n)과 머지 전 Enter를 묻지 않음
#   tools/table/master.sh --no-fetch  시트에서 받지 않고 지금 records.txt 사용
#   tools/table/master.sh --merge     검증을 통과한 결과를 main에 머지만 (verify/out/summary.json 필요, --yes면 Enter 없이)
#   JOBS=6 tools/table/master.sh      동시에 돌릴 계산 수 (기본: min(9, CPU 스레드 수))
#
# 출력은 모두 tools/table/master.log에 남음. 터미널에서는 진행 줄("○○ 진행중 · N% 완료 ...") 한 줄을 덮어쓰고 단계 완료·실패 줄만 새 줄로(logtee.js).
# 실행 중에는 master.pid가 있음(Claude Code 상태 줄 statusline.js가 봄).
cd "$(dirname "$0")" || exit 1
TB=$(pwd); ROOT=$(cd ../.. && pwd); R=$ROOT/js/tables.js
YES=0; FETCH=1; MERGE_ONLY=0
for a in "$@"; do case $a in
 --yes|-y) YES=1;; --no-fetch) FETCH=0;; --merge) MERGE_ONLY=1;;
 -h|--help) sed -n 2,10p "$0"; exit 0;;
 *) echo "모르는 옵션: $a (--help 참고)"; exit 1;; esac; done
command -v node >/dev/null || { echo "node를 찾을 수 없습니다. tools/table/README-PC.md를 참고해 Node.js를 설치하세요."; exit 1; }
command -v git >/dev/null || { echo "git을 찾을 수 없습니다."; exit 1; }
TTYF=; [ -t 1 ] && TTYF=tty   # 터미널이면 진행 줄을 한 줄로 덮어씀
exec > >(node logtee.js master.log $TTYF) 2>&1

PAIRS="9 10 11 12 13 15 18 19 20"
ok(){ [ -s "$1" ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$1" 2>/dev/null; }
allok(){ local p; for p in $PAIRS; do ok "$1.$p.json" || return 1; done; }
say(){ echo "$*"; }
now(){ date +%s; }
# 질문은 터미널에 직접 띄움(진행 줄 필터를 거치지 않게). 터미널이 없으면 실패 = 아니오. 답은 REPLY
ask(){ sleep 0.3; echo "$1" >> master.log; read -r -p "$1" REPLY 2>/dev/tty; }

# ── main에 fast-forward 머지 + push ──
merge(){
 node -e '
  const fs=require("fs"),c=require("crypto"),h=f=>c.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
  let s;try{s=JSON.parse(fs.readFileSync("verify/out/summary.json","utf8"))}catch(e){console.log("검증 결과(verify/out/summary.json)가 없습니다.");process.exit(1)}
  if(!s.pass){console.log("마지막 검증이 통과하지 못했습니다.");process.exit(1)}
  if(s.hash.tables!==h("../../js/tables.js")||s.hash.prior!==h("../../js/prior.js")){console.log("검증 뒤에 tables.js 또는 prior.js가 바뀌었습니다. master.sh를 다시 실행하세요.");process.exit(1)}' || return 1
 local BR; BR=$(git rev-parse --abbrev-ref HEAD)
 [ "$BR" = main ] || [ "$BR" = HEAD ] && { say "작업 브랜치가 아닙니다($BR). 머지하지 않습니다."; return 1; }
 git fetch -q origin main || { say "git fetch 실패"; return 1; }
 git merge-base --is-ancestor origin/main HEAD || { say "origin/main에 이 브랜치에 없는 커밋이 있어 fast-forward가 안 됩니다. 브랜치를 main 위로 옮긴 뒤 다시 하세요."; return 1; }
 echo
 if [ $YES = 0 ] && ! ask "모두 통과했습니다. Enter를 누르면 커밋하고 main에 fast-forward 머지 + push합니다 (취소: Ctrl+C) "; then
  echo; say "입력이 없어 머지하지 않았습니다. 나중에: tools/table/master.sh --merge"; return 1; fi
 [ -f baseline.next.json ] && cp baseline.next.json baseline.json   # 다음 비교의 기준
 local N F files=(); N=$(grep -c . records.txt)
 for F in js/prior.js js/tables.js tools/table/records.txt tools/table/baseline.json tools/table/steptimes.json tools/table/verify/records.json tools/table/verify/kibo.txt; do [ -e "$ROOT/$F" ] && files+=("$F"); done
 git -C "$ROOT" add -- "${files[@]}" || return 1
 if ! git -C "$ROOT" diff --cached --quiet; then
  git -C "$ROOT" commit -q -m "판 기록 ${N}판으로 당첨 모델과 시작 표(OPENX1-13) 다시 계산 (master.sh, 검증 통과)" || return 1; fi
 # 실행 중에 다른 곳(클라우드 세션 등)에서 작업 브랜치에 커밋이 올라왔으면 먼저 합침(표·모델 파일을 바꾸는 커밋이면 멈춤)
 if git fetch -q origin "$BR" 2>/dev/null && ! git merge-base --is-ancestor FETCH_HEAD HEAD; then
  if git diff --quiet HEAD...FETCH_HEAD -- js/prior.js js/tables.js tools/table/records.txt; then
   git merge -q --no-edit FETCH_HEAD || { git merge --abort 2>/dev/null; say "작업 브랜치의 새 커밋과 합치지 못했습니다. 스크린샷을 보내 주세요."; return 1; }
   say "작업 브랜치에 새로 올라온 커밋을 합쳤습니다."
  else say "작업 브랜치에 표·모델 파일을 바꾼 새 커밋이 있어 멈춥니다. 스크린샷을 보내 주세요."; return 1; fi
 fi
 git push origin "HEAD:$BR" && git push origin HEAD:main || { say "push 실패"; return 1; }
 git fetch -q . HEAD:main 2>/dev/null || true   # 로컬 main도 같은 커밋으로
 say "main 머지·push 완료: $(git rev-parse --short HEAD)"
}
if [ $MERGE_ONLY = 1 ]; then merge; exit $?; fi
# 실행 중 표시(Windows 프로세스 번호): 끝나면 지움
echo "$(cat /proc/$$/winpid 2>/dev/null || echo $$)" > master.pid; trap 'rm -f master.pid' EXIT

say "===== master.sh 시작 $(date '+%Y-%m-%d %H:%M') ====="
# ── 1. 판 기록 받기 → 확인 → 모델 맞춤 ──
if [ $FETCH = 1 ]; then
 node fetch.js; rc=$?
 if [ $rc = 2 ]; then say "멈춤: 시트 prior 탭 I3의 판 수와 data 탭 A열 줄 수가 다릅니다. 시트를 확인한 뒤 다시 실행하세요."; exit 2; fi
 [ $rc = 0 ] || { say "멈춤: 판 기록 받기 실패"; exit $rc; }
 if [ $YES = 0 ]; then
  ask "이 기록으로 records.txt를 바꾸고 모델을 다시 맞출까요? (y/n) " && ans=$REPLY || ans=n
  case $ans in y|Y|yes) ;; *) rm -f records.new.txt; say "취소했습니다. 아무것도 바꾸지 않았습니다."; exit 0;; esac
 fi
 mv -f records.new.txt records.txt
fi
node mkrec.js || exit 1
mkdir -p prog; node progress.js start   # 진행 표시 시작(모델 학습부터 0%)
say "모델 학습 진행중"; t=$(now)
( while sleep 30; do node progress.js tick fit; done ) & tk=$!
node fitmodel.js --write; frc=$?
kill $tk 2>/dev/null; wait $tk 2>/dev/null
[ $frc = 0 ] || { say "모델 학습 실패"; exit 1; }
node progress.js done fit $(( $(now) - t )); say "모델 학습 완료"

# 모델이나 계산 코드가 지난번과 다르면 지난 결과를 지우고 처음부터 (진행 표시 줄(PROG)만 바뀐 것은 무시)
STAMP=$(cat "$ROOT/js/prior.js" "$ROOT/js/rollout.js" "$ROOT/js/algorithm.js" eng.js pol.js gen2.js gen4.js gen5.js genN.js fixpair.js | tr -d '
' | grep -v PROG | sha1sum | cut -c1-16)
if [ -d out2 ] && [ "$(cat run.stamp 2>/dev/null)" != "$STAMP" ]; then say "모델 또는 계산 코드가 바뀌어 지난 계산 결과를 지우고 처음부터 계산합니다."; mv -f prog/state.json state.keep.json 2>/dev/null; ./clean.sh >/dev/null; mkdir -p prog; mv -f state.keep.json prog/state.json 2>/dev/null; node progress.js reset; fi
echo "$STAMP" > run.stamp
[ -f drops.json ] || echo '{}' > drops.json
mkdir -p prog fx cmp
# 여섯 번째 수부터의 표(OPENX6~, OPENXD)가 남아 있으면 계산 중 앱이 옛 표를 따라가므로 먼저 떼어 냄
node -e 'const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");const i=s.indexOf("/* 여섯 번째 수부터의 표");if(i>=0){fs.writeFileSync(p,s.slice(0,i).replace(/\s*$/,"\n"))}' "$R" || exit 1

# step <단계> <이름> <출력 접두> <명령...> — 9쌍 병렬 실행, 이미 다 있으면 건너뜀
step(){ local s=$1 name=$2 pre=$3 t; shift 3
 if allok "$pre"; then node progress.js done "$s"; return 0; fi
 say "$name 진행중"; t=$(now)
 node runpar.js "$s" "$pre" "$PAIRS" "$@" || { say "$name 실패 — 위 오류를 확인한 뒤 master.sh를 다시 실행하면 이어서 계산합니다."; exit 1; }
 node progress.js done "$s" $(( $(now) - t ))
}
# fixdepth n — 기대 클릭이 늘어난 쌍은 손해 칸을 찾아 drops.json에 기록
fixdepth(){ local n=$1 bad t
 bad=$(node -e 'const fs=require("fs");const b=[];for(const p of [9,10,11,12,13,15,18,19,20]){const d=JSON.parse(fs.readFileSync("out'$n'/g'$n'."+p+".json"));if(d.pf.gain<-1e-12||d.real.gain<-1e-12)b.push(p)}console.log(b.join(" "))') || { say "OPEN $n 손해 쌍 확인 실패"; exit 1; }
 t=$(now)
 if [ -n "$bad" ]; then say "  OPEN $n: 손해 쌍 [$bad] → 손해 칸 찾는 중"
  node runpar.js "f$n" "fx/fx.$n" "$bad" node fixpair.js "$n" || { say "fixpair $n 실패"; exit 1; }; fi
 # 이번 손해 쌍의 fixpair 결과(.json)만 drops.json에 합침 (.err 등은 제외)
 node -e 'const fs=require("fs"),bad=process.argv[1].split(" ").filter(Boolean);const D=JSON.parse(fs.readFileSync("drops.json"));for(const f of bad.map(p=>"fx.'$n'."+p+".json")){const r=JSON.parse(fs.readFileSync("fx/"+f));(D[r.n]=D[r.n]||{})[r.x]=r.drop;console.log("  고침",r.n,r.x,"뺀 칸",r.drop.length,"real",r.real.toFixed(5),"pf",r.pf.toFixed(5))}fs.writeFileSync("drops.json",JSON.stringify(D))' "$bad" || { say "OPEN $n 손해 칸 기록 실패"; exit 1; }
 node progress.js done "f$n" $([ -n "$bad" ] && echo $(( $(now) - t )))
}

# ── 2. OPENX1~3 ──
mkdir -p out2
step g2 "OPEN 1-3" out2/g2 node gen2.js
node -e 'const fs=require("fs");const N=[{},{},{}];for(const p of [9,10,11,12,13,15,18,19,20]){const d=JSON.parse(fs.readFileSync("out2/g2."+p+".json"));["T1","T2","T3"].forEach((k,i)=>Object.assign(N[i],d.tables[k]))}fs.writeFileSync("out2/tables2.json",JSON.stringify(N))'
node puttab.js "$R" >/dev/null || exit 1; say "OPEN 1-3 완료"
# ── 3. OPENX4, 5 ──
for n in 4 5; do mkdir -p out$n
 step g$n "OPEN $n" out$n/g$n node gen$n.js
 fixdepth $n; node put45.js $n "$R" >/dev/null || exit 1; say "OPEN $n 완료"; done
# ── 4. OPENX6~13 ──
for n in 6 7 8 9 10 11 12 13; do mkdir -p out$n
 step g$n "OPEN $n" out$n/g$n node genN.js $n
 fixdepth $n; say "OPEN $n 완료"; done
# ── 5. 표 쓰기 + 기준선과 비교 ──
say "표 쓰기·비교 진행중"; t=$(now)
node apply.js 13 "$R" || exit 1
node -e 'const fs=require("fs"),p=process.argv[1],n=process.argv[2];fs.writeFileSync(p,fs.readFileSync(p,"utf8").replace(/(현재 표\(OPENX1~13\): )\d+판/,"$1"+n+"판"))' "$R" "$(grep -c . records.txt)"
rm -f cmp/c.*; node runpar.js cmp cmp/c "$PAIRS" node cmp.js || { say "비교 실패"; exit 1; }
node mkbase.js baseline.next.json || exit 1
node revert.js "$R" || { say "손해 쌍 되돌리기 실패"; exit 1; }   # 새 표가 이전 표보다 낫지 않은 쌍은 이전 표로
node progress.js done cmp $(( $(now) - t )); say "표 쓰기·비교 완료"
# ── 6. 머지 전 4가지 확인 ──
say "검증 진행중"; t=$(now)
( while sleep 60; do node progress.js tick verify; done ) & tk=$!   # 검증 중에도 1분마다 진행 줄 갱신
node verify/checkall.js; vrc=$?
kill $tk 2>/dev/null; wait $tk 2>/dev/null
node progress.js done verify $(( $(now) - t )); say "검증 완료"
node progress.js save >/dev/null
echo MASTER_DONE
[ $vrc = 0 ] || { say "검증에 실패한 항목이 있어 머지하지 않습니다."; exit 1; }
# ── 7. 머지 ──
merge
