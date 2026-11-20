#!/bin/bash
# 새로 계산하기 전에 지난 계산 결과를 지움 (baseline.json, steptimes.json은 남김)
cd "$(dirname "$0")" && rm -rf out2 out4 out5 out6 out7 out8 out9 out10 out11 out12 out13 fx cmp prog drops.json run.stamp baseline.next.json verify/out
[ -f master.pid ] || rm -f master.log   # master.sh 실행 중(master.pid 있음)에는 로그를 지우지 않음
echo cleaned
