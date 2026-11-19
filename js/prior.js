/* prior.js — 당첨 칸 빈도(사전 확률). PF·PRIOR_SP는 롤아웃 추천(rollout.js), 칸 확률 표시(analyze), 시작 표(OPENX1~13)에 쓰임.
   index.html에서 algorithm.js 바로 다음, ui.js 앞에 <script src="js/prior.js"></script> 한 줄 추가.
   기존 파일은 수정하지 않고, 여기서 openRec을 덮어써 가중치 시작 표를 쓰게 한다. */

/* 칸별 당첨 횟수 / 그 칸이 ✕가 아니었던 판 수 (칸 번호 0~41, 행 우선, 참고·평가용) (현재 300판) */
const PRIOR_CNT=[27,16,27,11,11,16,24,24,20,24,21,12,10,10,28,24,22,27,36,23,11,11,12,38,33,18,36,37,16,13,14,40,31,18,19,25,18,14,11,14,35,23];
const PRIOR_EXPO=[300,300,300,300,300,300,300,300,300,268,275,266,268,272,300,273,300,300,268,266,244,244,266,268,300,300,273,300,272,268,266,275,268,300,300,300,300,300,300,300,300,300];
/* 당첨 모델: P(당첨 세 칸 a,b,c) ∝ PF[a]·PF[b]·PF[c] · 간격 계수(a,b)·(a,c)·(b,c)
   PRIOR_U = 칸별 로그 가중치(PF = exp(U)), PRIOR_SP = 두 당첨 칸 사이 거리 1·2·3칸의 간격 계수(4칸 이상은 1).
   실제 기록에서 당첨 칸끼리 붙어 있는 경우가 무작위의 약 절반이라 넣음. 두 값은 판 기록 전체로 tools/table/fitmodel.js가 계산(직접 고치지 않음).
   300판 3겹 교차검증(처음 보는 판의 당첨 칸 예측)에서 이전 방식(칸 빈도만, 0.7제곱) 36 → 이 모델 109 nats */
const PRIOR_U=[-0.04207,-0.37636,0.10464,-0.68498,-0.68594,-0.34869,-0.03526,-0.13973,-0.23944,0.24652,0.21811,-0.24443,-0.439,-0.38672,0.41055,0.24898,-0.12624,0.21271,0.81551,0.42899,-0.17213,-0.15858,-0.12136,0.88428,0.43624,-0.31861,0.65019,0.71272,-0.00401,-0.1705,-0.07823,0.89296,0.54489,-0.27712,-0.32858,0.03834,-0.22441,-0.45249,-0.62244,-0.4102,0.37726,-0.13537];
const PRIOR_SP=[0.20354,0.32552,0.52073];
const PF=PRIOR_U.map(Math.exp);
/* 간격 계수 표: SPW[a*42+b] = 칸 a, b 사이 거리의 계수 */
const SPW=(function(){const D=NB.map((_,s)=>{const d=Array(42).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NB[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
 const w=new Float64Array(1764);for(let a=0;a<42;a++)for(let b=0;b<42;b++){const d=D[a][b];w[a*42+b]=d>=1&&d<=3?PRIOR_SP[d-1]:1}return w})();
/* 당첨 세 칸 배치의 가중치 (algorithm.js의 analyze()가 칸 확률 표시에 씀) */
function triW(t){const[a,b,c]=t;return PF[a]*PF[b]*PF[c]*SPW[a*42+b]*SPW[a*42+c]*SPW[b*42+c]}

/* ── openRec 덮어쓰기: 가중치로 계산한 시작 표(OPENX1~3 + OPENXD = OPENX4~13, tables.js)를 씀. 균등 표(OPEN1~3)는 prior.js가 없을 때만 ── */
(function(){
 const _openRec=openRec;
 openRec=function(){return typeof OPENX1!=='undefined'?_openRec(OPENX1,OPENX2,OPENX3,...(typeof OPENXD!=='undefined'?OPENXD:[typeof OPENX4!=='undefined'?OPENX4:null,typeof OPENX5!=='undefined'?OPENX5:null])):_openRec()};
})();
