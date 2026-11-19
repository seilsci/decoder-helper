/* prior.js — 당첨 칸 빈도(사전 확률). PF는 롤아웃 추천(rollout.js)과 시작 표(OPENX1~13)에 쓰임.
   index.html에서 algorithm.js 바로 다음, ui.js 앞에 <script src="js/prior.js"></script> 한 줄 추가.
   기존 파일은 수정하지 않고, 여기서 openRec을 덮어써 가중치 시작 표를 쓰게 한다. */

/* 칸별 당첨 횟수 / 그 칸이 ✕가 아니었던 판 수 (칸 번호 0~41, 행 우선). 판이 쌓이면 이 두 배열만 갱신 (현재 300판) */
const PRIOR_CNT=[27,16,27,11,11,16,24,24,20,24,21,12,10,10,28,24,22,27,36,23,11,11,12,38,33,18,36,37,16,13,14,40,31,18,19,25,18,14,11,14,35,23];
const PRIOR_EXPO=[300,300,300,300,300,300,300,300,300,268,275,266,268,272,300,273,300,300,268,266,244,244,266,268,300,300,273,300,272,268,266,275,268,300,300,300,300,300,300,300,300,300];
/* 칸별 당첨 가중치: 표본이 적은 칸이 튀지 않게 평균(3/40)쪽으로 약하게 당긴 뒤 PRIOR_POW 제곱으로 편중을 완화.
   158판 때는 0.5(제곱근)가 평균 클릭 수 기준으로 가장 낮았음(균등 9.91 → 9.65). 244판 교차검증(당첨 칸 예측 기준)에서는 0.65~0.75가 거의 같고 0.7이 최고. 1이면 원래 빈도 그대로, 0이면 균등 */
const PRIOR_POW=0.7;
const prW=(c,e)=>Math.pow((c+8*.075)/(e+8),PRIOR_POW);
const PF=PRIOR_CNT.map((c,i)=>prW(c,PRIOR_EXPO[i]));

/* 자동 갱신: 앱스 스크립트(REC_URL)의 doGet이 시트 prior 탭의 값을 JSON으로 돌려주면, 페이지가 다 열린 뒤 그 값으로 위 배열과 PF를 덮어씀.
   불러오기에 실패하거나 값이 이상하면 위 내장값을 그대로 사용(오류가 나도 화면에는 영향 없음). 끄려면 PRIOR_AUTO를 false로.
   PRIOR_SRC는 현재 값의 출처 표시(디버그 줄에 나옴): 불러오는 중 / 시트 N판 / 내장값(실패: 이유) */
const PRIOR_AUTO=false; /* 끔: 추천 표(OPENX1~13)를 이 파일의 내장값으로 계산했으므로 앱도 같은 값을 씀. 기록이 쌓이면 위 두 배열을 바꾸고 tools/table로 표를 다시 만듦 */
let PRIOR_SRC=PRIOR_AUTO?'불러오는 중':'내장값';
function priorDone(){try{window.dispatchEvent(new Event('priorloaded'))}catch(e){}} /* 표시 갱신용 알림 */
if(PRIOR_AUTO&&typeof window!=='undefined')window.addEventListener('load',function(){
 if(typeof fetch==='undefined'||typeof REC_URL==='undefined'||!REC_URL){PRIOR_SRC='내장값(주소 없음)';priorDone();return} /* REC_URL은 ui.js에 있음 */
 fetch(REC_URL+'?a=prior',{cache:'no-store'}).then(r=>{if(!r.ok)throw 'http '+r.status;return r.json()}).then(d=>{
  if(!d||!Array.isArray(d.cnt)||!Array.isArray(d.ex))throw '응답 형식';
  const cnt=d.cnt.map(Number),ex=d.ex.map(Number);
  if(cnt.length!==42||ex.length!==42)throw '칸 수';
  if(cnt.some(v=>!(v>=0))||ex.some((v,i)=>!(v>0&&v>=cnt[i])))throw '값 이상'; /* 값이 이상하면 버림 */
  cnt.forEach((c,i)=>{PRIOR_CNT[i]=c;PRIOR_EXPO[i]=ex[i];PF[i]=prW(c,ex[i])});
  PRIOR_SRC='시트 '+Math.max(...ex)+'판';
  priorDone();
 }).catch(e=>{PRIOR_SRC='내장값(실패: '+(e&&e.message?e.message:e)+')';priorDone()});
});

/* ── openRec 덮어쓰기: 가중치로 계산한 시작 표(OPENX1~3 + OPENXD = OPENX4~13, tables.js)를 씀. 균등 표(OPEN1~3)는 prior.js가 없을 때만 ── */
(function(){
 const _openRec=openRec;
 openRec=function(){return typeof OPENX1!=='undefined'?_openRec(OPENX1,OPENX2,OPENX3,...(typeof OPENXD!=='undefined'?OPENXD:[typeof OPENX4!=='undefined'?OPENX4:null,typeof OPENX5!=='undefined'?OPENX5:null])):_openRec()};
})();
