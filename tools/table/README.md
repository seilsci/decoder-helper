# 시작 추천 표(OPENX1~13) 다시 만들기

`js/prior.js`의 `PRIOR_CNT` / `PRIOR_EXPO`(판 기록)를 갱신한 뒤, 그 가중치로 `js/tables.js`의 OPENX1~13을 다시 계산하는 스크립트입니다. 앱 동작에는 쓰이지 않습니다.

## 순서

```bash
# 1) js/prior.js의 두 배열을 새 기록으로 바꿈
# 2) 지난 계산 결과 지우고 실행 (4코어 기준 약 3시간, 중간에 멈추면 ./master.sh 만 다시 실행 → 끝난 단계는 건너뜀)
tools/table/clean.sh
nohup tools/table/master.sh > tools/table/master.log 2>&1 &
# 3) 끝나면 master.log 마지막에 MASTER_DONE 과 9쌍 비교 결과
```

`master.sh`가 하는 일:

1. `js/tables.js`에서 OPENX6~ 블록을 떼어 냄. 옛 표가 계산을 따라가지 않게 하려는 것.
2. `gen2.js`: OPENX1~3 계산 → `puttab.js`로 tables.js에 씀
3. `gen4.js` / `gen5.js`: OPENX4 / OPENX5 계산 → `put45.js`로 씀
4. `genN.js 6..13`: OPENX6~13 계산
5. 단계마다 9쌍의 기대 클릭이 늘어나는 쌍이 있으면 `fixpair.js`가 손해 칸을 하나씩 찾아 `drops.json`에 기록. 그 칸은 롤아웃 선택을 그대로 씀.
6. `apply.js`: OPENX6~13(롤아웃과 다른 칸만)과 OPENXD를 tables.js 끝에 붙임
7. `cmp.js`: `baseline.json`(지금 main의 표)과 새 표를 비교. 판 전체 정확 기대 클릭을 [균등, pf, 실제 당첨률] 세 가지로 계산해 `cmp/c.<x>.json`에 씀.
8. `mkbase.js`: 새 표를 `baseline.next.json`으로 저장

## 머지 전 확인

- `cmp/c.*.json`: 9쌍 모두 `gain.pf > 0` 이고 `gain.real > 0` 이어야 함. 균등(`gain.uniform`)은 참고용.
- `node tools/table/chkK.js`: OPENX4~13의 모든 키를 앱 상태로 되살렸을 때 `openRec()`이 표 값을 돌려주는지 확인. `bad: 0`이어야 함.
- 머지한 뒤에는 `baseline.next.json`을 `baseline.json`으로 바꿔서 함께 커밋. 다음 비교의 기준이 됨.

## 메모

- 각 칸의 값은 "그 칸을 누른 뒤 지금 롤아웃 정책(`js/rollout.js`)을 끝까지 따를 때의 정확한 기대 클릭"이 가장 작은 칸(2단 롤아웃)입니다. `pol.js` / `eng.js`가 앱의 롤아웃과 같은 계산을 하고, 각 gen 스크립트가 시작할 때 앱의 PF와 이웃 표가 같은지 확인합니다.
- 가지치기 하한은 남은 선물 수 + (1 − 가장 높은 선물 확률)입니다. 이전 하한(남은 선물 수만)과 표 결과는 같고 시간 차이는 거의 없습니다.
- `js/rollout.js`나 앞 단계 표를 바꾸면 그 뒤 단계는 모두 다시 계산해야 합니다.
