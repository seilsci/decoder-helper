#!/bin/bash
# js/prior.js 가중치로 OPENX1~13 다시 계산 → 손해 칸 제거 → 기준선(baseline.json)과 판 전체 비교.
# 단계별 결과가 있으면 건너뜀(중간에 멈추면 그대로 다시 실행). 새로 계산할 때는 먼저 ./clean.sh
cd "$(dirname "$0")"; R=$(cd ../../js && pwd)/tables.js
[ -f drops.json ] || echo '{}' > drops.json
# 여섯 번째 수부터의 표(OPENX6~, OPENXD)가 남아 있으면 계산 중 앱이 옛 표를 따라가므로 먼저 떼어 냄
node -e 'const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");const i=s.indexOf("/* 여섯 번째 수부터의 표");if(i>=0){fs.writeFileSync(p,s.slice(0,i).replace(/\s*$/,"\n"));console.log("OPENX6+ block removed")}' $R || exit 1
PAIRS="9 10 11 12 13 15 18 19 20"
ok(){ [ -s "$1" ] && node -e "JSON.parse(require('fs').readFileSync('$1','utf8'))" 2>/dev/null; }
run4(){ # $1 = 명령 접두, $2 = 출력 접두 (병렬 4개)
 for grp in "20 9" "13 10" "18 19" "11 12 15"; do (for p in $grp; do ok "$2.$p.json" || $1 $p > "$2.$p.json" 2> "$2.$p.err"; done) & done; wait; }
log(){ echo "$(date +%H:%M) $*"; }
mkdir -p out2; log "gen2 start"; run4 "node gen2.js" out2/g2
for p in $PAIRS; do ok out2/g2.$p.json || { log "gen2 FAILED $p"; exit 1; }; done
node -e 'const fs=require("fs");const N=[{},{},{}];for(const p of [9,10,11,12,13,15,18,19,20]){const d=JSON.parse(fs.readFileSync("out2/g2."+p+".json"));["T1","T2","T3"].forEach((k,i)=>Object.assign(N[i],d.tables[k]))}fs.writeFileSync("out2/tables2.json",JSON.stringify(N))'
node puttab.js $R || exit 1; log "OPENX1-3 written"
fixdepth(){ n=$1
 bad=$(node -e 'const fs=require("fs");const b=[];for(const p of [9,10,11,12,13,15,18,19,20]){const d=JSON.parse(fs.readFileSync("out'$n'/g'$n'."+p+".json"));if(d.pf.gain<-1e-12||d.real.gain<-1e-12)b.push(p)}console.log(b.join(" "))')
 log "depth $n failing pairs: [$bad]"
 for p in $bad; do ok fx/fx.$n.$p.json || node fixpair.js $n $p > fx/fx.$n.$p.json; done
 node -e 'const fs=require("fs");const D=JSON.parse(fs.readFileSync("drops.json"));for(const f of fs.readdirSync("fx").filter(f=>f.startsWith("fx.'$n'."))){const r=JSON.parse(fs.readFileSync("fx/"+f));(D[r.n]=D[r.n]||{})[r.x]=r.drop;console.log("  fix",r.n,r.x,"drop",r.drop.length,"real",r.real.toFixed(5),"pf",r.pf.toFixed(5))}fs.writeFileSync("drops.json",JSON.stringify(D))'; }
mkdir -p fx
for n in 4 5; do mkdir -p out$n; log "gen$n start"; run4 "node gen$n.js" out$n/g$n
 for p in $PAIRS; do ok out$n/g$n.$p.json || { log "gen$n FAILED $p"; exit 1; }; done
 fixdepth $n; node put45.js $n $R || exit 1; done
for n in 6 7 8 9 10 11 12 13; do mkdir -p out$n; log "genN $n start"; run4 "node genN.js $n" out$n/g$n
 for p in $PAIRS; do ok out$n/g$n.$p.json || { log "genN $n FAILED $p"; exit 1; }; done
 fixdepth $n; done
node apply.js 13 $R || exit 1; log "OPENX6-13 written"
mkdir -p cmp; rm -f cmp/c.*; run4 "node cmp.js" cmp/c
node mkbase.js baseline.next.json
log "FINAL"; cat cmp/c.*.json
echo MASTER_DONE
