#!/bin/bash
# 새로 계산하기 전에 지난 계산 결과를 지움 (baseline.json은 남김)
cd "$(dirname "$0")" && rm -rf out2 out4 out5 out6 out7 out8 out9 out10 out11 out12 out13 fx cmp drops.json master.log baseline.next.json && echo cleaned
