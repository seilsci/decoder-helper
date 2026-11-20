# 시작 추천 표(OPENX1~13) 다시 만들기

판 기록(`records.txt`)으로 당첨 모델을 맞춰 `js/prior.js`에 넣고, 그 모델로 `js/tables.js`의 OPENX1~13을 다시 계산하는 스크립트입니다. 앱 동작에는 쓰이지 않습니다.
**PC 설치·실행 방법은 [README-PC.md](README-PC.md).**

당첨 모델: P(당첨 세 칸 a,b,c) ∝ w[a]·w[b]·w[c] × 세 쌍의 간격 계수 × 좌우 한쪽 계수. 간격 계수는 두 당첨 칸이 1·2·3칸 떨어져 있을 때 곱하는 값(4칸 이상은 1)입니다. 좌우 한쪽 계수는 세 칸이 세로 중앙선(가운데 칸 x=4) 왼쪽·오른쪽에 나뉘지 않을 때 곱하는 값입니다(가운데 줄 칸은 어느 쪽도 아님). `prior.js`의 `PRIOR_SP = [간격 1, 간격 2, 간격 3, 좌우 한쪽]`.

- 간격: 실제 기록에서 당첨 칸끼리 붙어 있는 경우가 무작위의 절반 정도라서 넣었습니다.
- 좌우: 실제로는 98.7%(303판 중 299판)가 좌우로 나뉘는데 간격 모델은 92.3%만 설명해서 넣었습니다. 303판 교차검증(처음 보는 판의 당첨 세 칸 로그우도, 균등 대비): 3겹 106.0 → 119.0 nats(+13.1), 10겹 118.2 → 132.7 nats(+14.5). 맞춘 계수 약 0.10, 모델의 좌우 나뉨 98.7%. `node tools/table/fitmodel.js --cv 3`으로 다시 확인할 수 있습니다.

## 순서

`tools/table/master.sh` 하나로 합니다(자세한 것은 README-PC.md).

1. `fetch.js`: 시트 data 탭 A열 → `records.new.txt`. prior 탭 I3의 판 수와 다르면 멈춤. 지금 기록과 달라진 점을 보여 주고 y/n 확인 → `records.txt`
2. `mkrec.js`: `verify/records.json`(칸별 집계 + 쌍별 판 수), `verify/kibo.txt`(기록 재생용) 다시 만듦
3. `fitmodel.js --write`: 모델을 맞춰 `js/prior.js`에 씀 (칸별 집계는 records.txt에서 직접 계산, 시트의 I1/I2는 쓰지 않음)
4. 모델·계산 코드가 지난 실행과 다르면(`run.stamp`) 지난 결과를 지우고 처음부터. 같으면 끝난 단계는 건너뜀
5. `js/tables.js`에서 OPENX6~ 블록을 떼어 냄. 옛 표가 계산을 따라가지 않게 하려는 것
6. `gen2.js`: OPENX1~3 → `puttab.js`, `gen4.js`/`gen5.js`: OPENX4/5 → `put45.js`, `genN.js 6..13`: OPENX6~13. 단계마다 9쌍을 `runpar.js`로 병렬 실행(기본 min(9, CPU 스레드 수), `JOBS`로 조절)
7. 단계마다 9쌍의 기대 클릭이 늘어나는 쌍이 있으면 `fixpair.js`가 손해 칸을 찾아 `drops.json`에 기록. 그 칸은 롤아웃 선택을 그대로 씀
8. `apply.js`: OPENX6~13(롤아웃과 다른 칸만)과 OPENXD를 tables.js 끝에 붙임
9. `cmp.js`: `baseline.json`(지금 main의 표)과 새 표를 비교 → `cmp/c.<x>.json`. `mkbase.js`: 새 표를 `baseline.next.json`으로
10. `verify/checkall.js`: 머지 전 4가지 확인 자동 실행 → 통과/실패 요약, `verify/out/summary.json`
11. 모두 통과하면 Enter 확인 후 `baseline.next.json` → `baseline.json`, 결과 커밋, main에 fast-forward 머지 + push

진행 표시는 `progress.js`(전체 기준 %, 1% 오를 때만, 남은 시간 = 걸린 시간 ÷ 진행률). 각 gen 스크립트는 `prog.js`로 쌍별 진행률을 `prog/`에 씀. 단계 비중은 지난 실행에서 잰 `steptimes.json`.

## 머지 전 확인

- `cmp/c.*.json`: 9쌍 모두 `gain.pf > 0` 이고 `gain.real > 0` 이어야 함. 균등(`gain.uniform`)은 참고용.
- `node tools/table/chkK.js`: OPENX4~13의 모든 키를 앱 상태로 되살렸을 때 `openRec()`이 표 값을 돌려주는지 확인. `bad: 0`이어야 함.
- 위 확인과 `verify/README.md`의 나머지 확인은 `verify/checkall.js`가 자동으로 합니다. 머지할 때 `baseline.next.json`이 `baseline.json`이 되어 함께 커밋됩니다(다음 비교의 기준).

## 메모

- `fitmodel.js`: 칸 가중치(`PRIOR_U`)에는 0쪽으로 당기는 벌점(LAM 3)을 둡니다. 300판 3겹 교차검증(처음 보는 판의 당첨 칸 예측)에서 LAM 1·3·10 중 3이 가장 좋았습니다(이전 방식인 칸 빈도의 0.7제곱 36 → 간격 모델 109 nats, 303판에서 좌우 계수까지 넣으면 119 nats). 판이 많이 늘면 다시 확인할 만합니다.
- 각 칸의 값은 "그 칸을 누른 뒤 지금 롤아웃 정책(`js/rollout.js`)을 끝까지 따를 때의 정확한 기대 클릭"이 가장 작은 칸(2단 롤아웃)입니다. `pol.js` / `eng.js`가 앱의 롤아웃과 같은 계산을 하고, 각 gen 스크립트가 시작할 때 앱의 PF와 이웃 표가 같은지 확인합니다.
- 가지치기 하한은 남은 선물 수 + (1 − 가장 높은 선물 확률)입니다. 이전 하한(남은 선물 수만)과 표 결과는 같고 시간 차이는 거의 없습니다.
- `js/rollout.js`나 앞 단계 표를 바꾸면 그 뒤 단계는 모두 다시 계산해야 합니다.
