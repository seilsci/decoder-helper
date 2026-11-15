/* prior.js — 당첨 칸 빈도(사전 확률)를 반영한 추천. x=6(XM)일 때만 작동하고, 아니면 기존 알고리즘 그대로.
   index.html에서 algorithm.js 바로 다음, ui.js 앞에 <script src="js/prior.js"></script> 한 줄 추가.
   기존 파일은 수정하지 않고, 여기서 일부 함수를 덮어쓴다(XM이 아니면 원래 함수를 그대로 호출). */

/* 칸별 당첨 횟수 / 그 칸이 ✕가 아니었던 판 수 (칸 번호 0~41, 행 우선). 판이 쌓이면 이 두 배열만 갱신 */
const PRIOR_CNT=[12,8,9,6,2,10,15,15,13,9,12,4,2,5,14,14,7,14,19,10,6,4,5,14,17,8,20,20,8,8,10,20,17,7,10,8,7,9,5,8,17,7];
const PRIOR_EXPO=[145,145,145,145,145,145,145,145,145,127,135,130,127,133,145,132,145,145,127,131,118,118,131,127,145,145,132,145,133,127,130,135,127,145,145,145,145,145,145,145,145,145];
/* 칸별 당첨 가중치: 표본이 적은 칸이 튀지 않게 평균(3/40)쪽으로 약하게 당김. 후보(당첨 3칸 조합)의 가중치 = 세 칸 값의 곱 */
const PF=PRIOR_CNT.map((c,i)=>(c+8*.075)/(PRIOR_EXPO[i]+8));

const prLf=(n,k)=>n&&k?k+.6*Math.log2(n):0;
const prNeff=(W,S2)=>Math.exp(Math.log(W)-S2/W); /* 가중치 분포의 유효 후보 수(엔트로피 기준) */
function prBest(S,F,op,k,d,K){
 const N=S.t.length;
 const ni=new Float64Array(42),ex=new Float64Array(42),bl=new Float64Array(42);
 const ni2=new Float64Array(42),ex2=new Float64Array(42),bl2=new Float64Array(42);
 let Wt=0;
 for(let q=0;q<N;q++){const t=S.t[q],wq=S.w[q],wlq=S.wl[q];Wt+=wq;
  const u0=F[t[0]]?-1:t[0],u1=F[t[1]]?-1:t[1],u2=F[t[2]]?-1:t[2];
  for(let x=0;x<42;x++){if(op[x])continue;
   if(t[0]==x||t[1]==x||t[2]==x){ni[x]+=wq;ni2[x]+=wlq}
   else{const n=(u0>=0&&ADJ[x*42+u0])||(u1>=0&&ADJ[x*42+u1])||(u2>=0&&ADJ[x*42+u2]);
    if(n){ex[x]+=wq;ex2[x]+=wlq}else{bl[x]+=wq;bl2[x]+=wlq}}}}
 const v1=[];
 for(let x=0;x<42;x++)if(!op[x]&&N){
  const a=ni[x]>0?ni[x]*prLf(prNeff(ni[x],ni2[x]),k-1):0;
  const b=ex[x]>0?ex[x]*prLf(prNeff(ex[x],ex2[x]),k):0;
  const c=bl[x]>0?bl[x]*prLf(prNeff(bl[x],bl2[x]),k):0;
  v1.push([1+(a+b+c)/Wt,x])}
 v1.sort((a,b)=>a[0]-b[0]);
 if(d<=1||!v1.length)return v1.length?v1[0]:[0,-1];
 let bv=1e9,bx=-1;
 for(const[,x]of v1.slice(0,K)){
  const gi={t:[],w:[],wl:[]},gh={t:[],w:[],wl:[]},gb={t:[],w:[],wl:[]};
  let Wi=0,Wh=0,Wb=0;
  for(let q=0;q<N;q++){const t=S.t[q],wq=S.w[q];let g;
   if(t[0]==x||t[1]==x||t[2]==x){g=gi;Wi+=wq}
   else if((!F[t[0]]&&ADJ[x*42+t[0]])||(!F[t[1]]&&ADJ[x*42+t[1]])||(!F[t[2]]&&ADJ[x*42+t[2]])){g=gh;Wh+=wq}
   else{g=gb;Wb+=wq}
   g.t.push(t);g.w.push(wq);g.wl.push(S.wl[q])}
  let v=1;const o1=op.slice();o1[x]=1;
  if(gi.t.length&&k>1){const F2=F.slice();F2[x]=1;v+=Wi/Wt*prBest(gi,F2,o1,k-1,d-1,K)[0]}
  if(gh.t.length)v+=Wh/Wt*prBest(gh,F,o1,k,d-1,K)[0];
  if(gb.t.length){const o2=o1.slice();NB[x].forEach(j=>o2[j]=1);v+=Wb/Wt*prBest(gb,F,o2,k,d-1,K)[0]}
  if(v<bv){bv=v;bx=x}}
 return[bv,bx]}
function prChoice(cf,F,op,k){
 const N=cf.length,w=cf.map(t=>PF[t[0]]*PF[t[1]]*PF[t[2]]),S={t:cf,w:w,wl:w.map(v=>v*Math.log(v))};
 return(N>3000?prBest(S,F,op,k,3,6):N>300?prBest(S,F,op,k,4,6):prBest(S,F,op,k,5,6))[1]}

/* ── 기존 함수 덮어쓰기: XM(x=6)일 때만 새 방식, 아니면 원래 함수 호출 ── */
(function(){
 const _appChoice=appChoice,_openRec=openRec;
 appChoice=function(cf,F,op,k){return XM?prChoice(cf,F,op,k):_appChoice(cf,F,op,k)}; /* deepRec·완전탐색의 기준 추천이 모두 이걸 거침 */
 openRec=function(){return XM?null:_openRec()}; /* 시작 추천 표(OPEN1~3)는 균등 가정으로 만든 값이라 x=6에서는 건너뜀 */
})();

/* 완전탐색(x=6 전용)도 후보를 균등이 아니라 가중치로 평균: 기대 클릭 수를 가중 평균으로 계산. 워커에는 PF를 같이 넣어줌 */
function exVal(x,cf,F,op,H,k,lim){
 const m=exSplit(cf,x,F,H);
 if(m.size==1&&[...m.keys()][0][0]!='f')return 1e9;
 let tot=0;for(const t of cf)tot+=PF[t[0]]*PF[t[1]]*PF[t[2]];
 let v=1;
 for(const[s,g]of m){let gw=0;for(const t of g)gw+=PF[t[0]]*PF[t[1]]*PF[t[2]];
  const[F2,op2,H2]=exNext(s,x,F,op,H);v+=gw/tot*exV(g,F2,op2,H2,s[0]=='f'?k-1:k);if(v>=lim)return v}
 return v}
(function(){const _src=exWorkerSrc;exWorkerSrc=function(){return 'const PF='+JSON.stringify(PF)+';\n'+_src()}})();
