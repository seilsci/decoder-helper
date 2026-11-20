/* prior.js — 당첨 칸 빈도(사전 확률). PF·PRIOR_SP는 롤아웃 추천(rollout.js), 칸 확률 표시(analyze), 시작 표(OPENX1~13)에 쓰임.
   index.html에서 algorithm.js 바로 다음, ui.js 앞에 <script src="js/prior.js"></script> 한 줄 추가.
   기존 파일은 수정하지 않고, 여기서 openRec을 덮어써 가중치 시작 표를 쓰게 한다. */

/* 칸별 당첨 횟수 / 그 칸이 ✕가 아니었던 판 수 (칸 번호 0~41, 행 우선, 참고·평가용) (현재 303판) */
const PRIOR_CNT=[27,16,28,11,11,17,25,24,21,24,21,12,10,10,28,24,23,27,36,23,11,11,12,38,33,18,37,37,17,13,14,40,33,18,19,25,18,14,11,14,35,23];
const PRIOR_EXPO=[303,303,303,303,303,303,303,303,303,271,278,269,270,274,303,275,303,303,271,269,247,247,269,271,303,303,275,303,274,270,269,278,271,303,303,303,303,303,303,303,303,303];
/* 당첨 모델: P(당첨 세 칸 a,b,c) ∝ PF[a]·PF[b]·PF[c] · 간격 계수(a,b)·(a,c)·(b,c)
   PRIOR_U = 칸별 로그 가중치(PF = exp(U)), PRIOR_SP = [두 당첨 칸 사이 거리 1·2·3칸의 간격 계수(4칸 이상은 1), 좌우 한쪽 계수].
   좌우 한쪽 계수: 세 칸이 세로 중앙선 왼쪽(x<4)과 오른쪽(x>4)에 나뉘지 않을 때 곱함(가운데 줄 칸은 어느 쪽도 아님). 실제로는 98.7%가 나뉨.
   실제 기록에서 당첨 칸끼리 붙어 있는 경우가 무작위의 약 절반이라 넣음. 두 값은 판 기록 전체로 tools/table/fitmodel.js가 계산(직접 고치지 않음).
   300판 3겹 교차검증(처음 보는 판의 당첨 칸 예측)에서 이전 방식(칸 빈도만, 0.7제곱) 36 → 이 모델 109 nats */
const PRIOR_U=[0.02569,-0.35388,0.15631,-0.62333,-0.61457,-0.27292,0.03795,-0.06355,-0.15964,0.20263,0.12809,-0.31355,-0.26372,-0.448,0.32607,0.21349,-0.0503,0.18752,0.71309,0.30654,-0.24631,-0.22872,-0.23389,0.7876,0.41106,-0.2823,0.63014,0.61194,-0.02583,-0.01415,-0.15438,0.79481,0.55928,-0.24845,-0.26816,0.05511,-0.2138,-0.4116,-0.57671,-0.39884,0.39481,-0.07551];
const PRIOR_SP=[0.30879,0.48075,0.68877,0.10145];
const PF=PRIOR_U.map(Math.exp);
/* 간격 계수 표: SPW[a*42+b] = 칸 a, b 사이 거리의 계수 */
const SPW=(function(){const D=NB.map((_,s)=>{const d=Array(42).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NB[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
 const w=new Float64Array(1764);for(let a=0;a<42;a++)for(let b=0;b<42;b++){const d=D[a][b];w[a*42+b]=d>=1&&d<=3?PRIOR_SP[d-1]:1}return w})();
/* 칸의 좌우: -1 왼쪽(x<4), 1 오른쪽(x>4), 0 가운데 */
const SIDEOF=[8,9,8,9,8].flatMap((n,r)=>Array.from({length:n},(_,c)=>{const x=r%2?c:c+.5;return x<4?-1:x>4?1:0}));
/* 당첨 세 칸 배치의 가중치 (algorithm.js의 analyze()가 칸 확률 표시에 씀) */
function triW(t){const[a,b,c]=t,sp=PRIOR_SP.length>3&&!((SIDEOF[a]<0||SIDEOF[b]<0||SIDEOF[c]<0)&&(SIDEOF[a]>0||SIDEOF[b]>0||SIDEOF[c]>0))?PRIOR_SP[3]:1;
 return PF[a]*PF[b]*PF[c]*SPW[a*42+b]*SPW[a*42+c]*SPW[b*42+c]*sp}

/* ── openRec 덮어쓰기: 가중치로 계산한 시작 표(OPENX1~3 + OPENXD = OPENX4~13, tables.js)를 씀. 균등 표(OPEN1~3)는 prior.js가 없을 때만 ── */
(function(){
 const _openRec=openRec;
 openRec=function(){return typeof OPENX1!=='undefined'?_openRec(OPENX1,OPENX2,OPENX3,...(typeof OPENXD!=='undefined'?OPENXD:[typeof OPENX4!=='undefined'?OPENX4:null,typeof OPENX5!=='undefined'?OPENX5:null])):_openRec()};
})();
