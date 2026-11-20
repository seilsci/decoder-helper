# Windows PC에서 표 다시 만들기

판 기록 시트를 받아 당첨 모델을 다시 맞추고, 시작 추천 표(OPENX1~13)를 계산·검증한 뒤 main에 올리는 과정을 `tools/table/master.sh` 하나로 합니다.
기준 PC: i5-14400(16스레드), 메모리 32GB, Windows 11 + Git Bash.

## 1. 처음 한 번만: 설치

1. **Git for Windows** — <https://git-scm.com/download/win> 설치(Git Bash 포함). 기본 옵션 그대로.
2. **Node.js LTS(20 이상)** — <https://nodejs.org> 에서 설치. Git Bash를 새로 열고 확인:
   ```bash
   node -v    # v20 이상
   git --version
   ```
3. **저장소 받기**(이미 있으면 생략)와 작업 브랜치로 이동:
   ```bash
   cd /e/GitHub
   git clone https://github.com/seilsci/decoder-helper.git
   cd decoder-helper
   git checkout ccr-d755c635-jex8o4
   git pull
   ```
4. **화면 테스트 도구(playwright + Chromium)** — 검증 3번(화면 테스트)에만 필요:
   ```bash
   cd tools/table
   npm install
   npx playwright install chromium
   ```
5. GitHub에 push할 수 있게 로그인되어 있어야 합니다(머지 단계). `git push`가 한 번 되는지 확인하거나, Git Credential Manager 창이 뜨면 로그인.

## 2. 실행

Git Bash에서 저장소 폴더로 가서:

```bash
cd /e/GitHub/decoder-helper
git pull
tools/table/master.sh
```

하는 일과 물어보는 것:

| 순서 | 내용 | 사용자 입력 |
|---|---|---|
| 1 | 시트 data 탭 A열을 받아 판 수를 prior 탭 I3와 비교. 다르면 **멈춤** | — |
| 2 | 지금 `records.txt`와 달라진 점(추가된 판)을 보여 줌 | **y/n** |
| 3 | `records.txt` 저장 → `verify/records.json`·`verify/kibo.txt` 다시 만듦 → `fitmodel.js --write`로 `js/prior.js` 갱신 | — |
| 4 | OPENX1~3 → 4 → 5 → 6 … 13 계산. 단계마다 9쌍을 동시에 계산(기본 min(9, CPU 스레드 수)) | — |
| 5 | 표를 `js/tables.js`에 쓰고 지금 기준(`baseline.json`)과 9쌍 비교 | — |
| 6 | `verify/README.md`의 4가지 확인을 자동 실행하고 통과/실패 요약 (4a 실제 기록 재생: 유의하게 나쁘지 않음 z < 2, 4b 모델 분포 2만판: 유의하게 나음 z < −1.96; 약 20~25분) | — |
| 7 | 모두 통과하면 결과를 커밋하고 main에 fast-forward 머지 + push | **Enter** |

실행 중 화면(같은 내용이 `tools/table/master.log`에도 남음):

```
OPEN 1-3 진행중
3% 완료 (남은시간 : 예상 52분)
...
OPEN 1-3 완료
OPEN 4 진행중
...
=== 검증 요약 (이전 버전: origin/main) ===
통과  1. 9쌍 비교      pf 최소 +1.2e-3, real 최소 +4.0e-4
...
```

- 퍼센트는 전체 작업 기준이며 1% 오를 때만 한 줄씩 찍습니다. 단계 비중은 지난 실행에서 잰 시간(`steptimes.json`)을 씁니다.
- 남은 시간 = 지금까지 걸린 시간 ÷ 진행률 − 걸린 시간 (대략).
- OPENX1~3은 한 번의 계산(gen2.js)에서 함께 나오므로 한 단계("OPEN 1-3")로 표시합니다.

### 옵션

```bash
tools/table/master.sh --yes        # y/n 묻지 않음
tools/table/master.sh --no-fetch   # 시트에서 받지 않고 지금 records.txt 사용
tools/table/master.sh --merge      # 검증 통과 뒤 Enter를 못 눌렀을 때 머지만 다시 (--merge --yes 는 Enter 없이)
JOBS=6 tools/table/master.sh       # 동시에 돌릴 계산 수를 줄이기(PC를 같이 쓸 때)
```

### 중간에 멈췄을 때

창을 닫았거나 오류로 멈췄으면 그냥 `tools/table/master.sh`를 다시 실행하세요. 같은 기록·같은 코드면 끝난 단계는 건너뛰고 이어서 계산합니다.
기록이나 모델 코드가 바뀌었으면 자동으로 지난 결과를 지우고 처음부터 계산합니다. 직접 지우려면 `tools/table/clean.sh`.

### 검증에 실패했을 때

머지하지 않고 끝납니다. 요약의 실패 항목을 보고 판단하세요. 결과 파일:
`tools/table/cmp/c.*.json`(9쌍 비교), `tools/table/verify/out/`(검증 출력, `summary.json`).
되돌리려면 `git checkout -- js/ tools/table/records.txt tools/table/verify/` 후 `tools/table/clean.sh`.

## 자주 생기는 문제

- `node: command not found` → Node.js 설치 후 Git Bash를 새로 열기.
- `playwright 없음` (검증 3 실패) → `cd tools/table && npm install && npx playwright install chromium`.
- `판 수가 다릅니다` → 시트 data 탭 A열에 빈 줄·덜 적은 판이 있거나 prior 탭 I3가 갱신되지 않은 것. 시트를 고친 뒤 다시 실행.
- `fast-forward가 안 됩니다` → main에 새 커밋이 생긴 것. `git rebase origin/main`으로 브랜치를 옮기고 다시 실행(모델 코드가 바뀌면 처음부터 다시 계산됨).
- 메모리: 9개 계산을 동시에 돌릴 때 32GB면 충분합니다. 부족하면 `JOBS=4`.
