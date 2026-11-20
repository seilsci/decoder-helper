# 검증 스크립트 (머지 전 4가지 확인용)

저장소 안 상대 경로로 동작하도록 고친 것. 결과 파일은 `out/`에 씀(커밋하지 않음).

**`node tools/table/verify/checkall.js [이전 커밋, 기본 origin/main]`가 아래 4가지를 한꺼번에(병렬로) 실행하고 통과/실패 요약을 출력합니다.** `master.sh`가 마지막에 자동으로 부릅니다. 이전 버전 js는 `git archive`로 `out/old/js/`에 풀어서 씁니다. 4b의 "유의"는 같은 시드 5000판의 판별 차이로 z < −1.96.

| 확인 | 명령 (저장소 루트에서) | 통과 기준 |
|---|---|---|
| 1. 9쌍 비교 | `tools/table/master.sh`의 FINAL 출력 (cmp/c.*.json) | 9쌍 모두 gain.pf > 0, gain.real > 0 |
| 2. 표 일관성 | `node tools/table/chkK.js`, `node tools/table/verify/chk4.js`, `node tools/table/verify/chk5.js` | bad 0 |
| 3. 화면 테스트 | `node tools/table/verify/simx.js C 0 25 > tools/table/verify/out/tNC.0.json` 와 `... C 25 5 > .../tNC.1.json` 후 `SIMF=tNC node tools/table/verify/ui_plain.js 25` (playwright 필요) | matchSim 25, errs [] |
| 4a. 실제 기록 재생 | `KF=kibo.txt node tools/table/verify/kiboV.js` (이전 버전은 `D=<이전 js 폴더>/`) | 새 버전 평균이 더 낮음 |
| 4b. 5000판 비교 | `YMODE=m node tools/table/verify/simx2.js C <시작> 1250` 4묶음, 이전/새 버전 같은 시드 | 모델 분포에서 새 버전이 유의하게 낮음 |

- 이전 버전 js 폴더: `git worktree add ../old <이전 main 커밋>` 후 `D=../old/js/`.
- kibo.txt: records.txt 각 줄 끝에 탭과 `0`(사용자 클릭 수 자리)을 붙인 것. `node tools/table/mkrec.js`가 만듦(master.sh가 자동 실행).
- records.json: simx·simx2·ui_plain이 쓰는 칸별 집계(cnt, ex)와 9쌍별 판 수(xw, ✕ 뽑기 비율). `mkrec.js`가 records.txt로 만듦.
- 5000판 기준(2026-11-20, 간격 모델 머지 때): 모델 분포 9.726 → 9.390, 균등 10.053 → 10.385.
