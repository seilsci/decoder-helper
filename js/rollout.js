/* rollout.js — 롤아웃 추천 (일반 모드 전용, x=6 모드는 prior.js·완전탐색을 그대로 사용)
   후보 칸마다 "그 칸을 누른 뒤 기본 정책으로 끝까지 풀 때의 디코더 기대값"을 끝까지 정확히 계산해서 가장 작은 칸을 고름.
   배치가 2,500개 이하이면 상위 6칸은 "누른 뒤 한 수 더 롤아웃"으로 다시 평가.
   기존 deepRec(깊이 제한 + 어림식 잎 값)보다 4,800판 시뮬레이션에서 평균 약 0.08클릭 적음.
   선물을 찾으면 옆 '!' 가 남는지/꺼지는지도 결과로 구분해서 계산함(! 재질문 정보 반영).
   algorithm.js 다음, ui.js 앞에서 불러옴.
   밖으로 내보내는 것: rollRec() 지금 화면 상태로 바로 계산(동기) / rollRecAsync() 같은 계산을 웹 워커에서(화면이 멈추지 않음, 실패하면 동기 계산으로 대체)
   rollEngine()은 계산 본체: 전역을 쓰지 않으므로 그대로 문자열로 바꿔 워커에 넣음 */
function rollEngine(NBR,TT){ /* NBR = 이웃 칸 목록(NB), TT = 트리플 표(T) → (상태 배열, 배치 번호 배열) => 추천 칸 */
 const N=42,GIFTS=3,imul=Math.imul;
 const bitLo=i=>(i<32?(1<<i)>>>0:0),bitHi=i=>(i>=32?1<<(i-32):0);
 /* 트리플 표: algorithm.js의 T와 같은 순서(a<b<c) → 번호 k가 T[k]와 같음 */
 const NT=TT.length,T_LO=new Uint32Array(NT),T_HI=new Uint32Array(NT);
 for(let k=0;k<NT;k++){const[a,b,c]=TT[k];T_LO[k]=(bitLo(a)|bitLo(b)|bitLo(c))>>>0;T_HI[k]=bitHi(a)|bitHi(b)|bitHi(c)}
 const NB_LO=NBR.map(ns=>ns.reduce((m,i)=>(m|bitLo(i))>>>0,0)),NB_HI=NBR.map(ns=>ns.reduce((m,i)=>m|bitHi(i),0));
 const EPS=1e-12;
 /* 칸 상태: 'hidden' 닫힘 / 'x' / 'gift' 당첨 / 'warn' ! / 'open' 열림 */
 function ctxOf(st){let fLo=0,fHi=0;const warn=new Array(N).fill(false);
  for(let i=0;i<N;i++){if(st[i]==='gift'){fLo=(fLo|bitLo(i))>>>0;fHi|=bitHi(i)}else if(st[i]==='warn')warn[i]=true}
  return{fLo,fHi,warn}}
 const warnNb=(t,ctx)=>NBR[t].filter(n=>ctx.warn[n]);
 /* 결과 코드: 0 = '!', 1 = 빈칸, 2+mask = 당첨 (mask: 옆 '!' 중 여전히 켜진 것) */
 function outcome(k,t,ctx,wn){
  const lo=T_LO[k],hi=T_HI[k];
  const inL=t<32?(lo&bitLo(t))!==0:(hi&bitHi(t))!==0;
  if(!inL)return((lo&~ctx.fLo&NB_LO[t])>>>0)!==0||(hi&~ctx.fHi&NB_HI[t])!==0?0:1;
  const fLo=(ctx.fLo|bitLo(t))>>>0,fHi=ctx.fHi|bitHi(t);let mask=0;
  for(let j=0;j<wn.length;j++){const w=wn[j];if(((lo&~fLo&NB_LO[w])>>>0)!==0||(hi&~fHi&NB_HI[w])!==0)mask|=1<<j}
  return 2+mask}
 function applyStates(st,t,code,wn){
  if(code===0)st[t]='warn';
  else if(code===1){st[t]='open';for(const n of NBR[t])if(st[n]==='hidden')st[n]='open'}
  else{st[t]='gift';wn.forEach((w,j)=>{if(!((code-2)&(1<<j)))st[w]='open'})}}
 function candidates(st){const o=[];for(let i=0;i<N;i++)if(st[i]==='hidden')o.push(i);return o}
 function split(node,t,ctx){const wn=warnNb(t,ctx),bk=[],L=node.layouts;
  for(let i=0;i<L.length;i++){const k=L[i],c=outcome(k,t,ctx,wn);let g=bk[c];if(!g)bk[c]=g={code:c,ls:[],w:0};g.ls.push(k);g.w+=1}
  return bk.filter(g=>!!g)}
 function childOf(node,t,code,ctx,ls){const st=node.st.slice();applyStates(st,t,code,warnNb(t,ctx));return{st,layouts:ls}}
 /* 100% 당첨 칸 중 옆 '!' 가 가장 많은 칸 (없으면 -1) */
 function surePick(node,ctx){let best=-1,bestN=-1;const L=node.layouts;
  for(const t of candidates(node.st)){let all=true;const bt=t<32?bitLo(t):bitHi(t);
   for(let i=0;i<L.length&&all;i++){const k=L[i];if(((t<32?T_LO[k]:T_HI[k])&bt)===0)all=false}
   if(all){const n=warnNb(t,ctx).length;if(n>bestN){bestN=n;best=t}}}
  return best}
 /* 기본 정책: 당첨 확률 + 정보량(결과별로 나뉜 뒤 남는 비율의 기대 감소) */
 function basePick(node,ctx){const s=surePick(node,ctx);if(s>=0)return s;
  const L=node.layouts,W=L.length;let best=-1,bestScore=-Infinity;const acc=new Float64Array(2+64);
  for(const t of candidates(node.st)){const wn=warnNb(t,ctx);acc.fill(0);let g=0;
   for(let i=0;i<L.length;i++){const c=outcome(L[i],t,ctx,wn);acc[c]+=1;if(c>=2)g+=1}
   let ss=0;for(let c=0;c<acc.length;c++)ss+=acc[c]*acc[c];
   const score=g/W+(1-ss/(W*W));if(score>bestScore+EPS){bestScore=score;best=t}}
  return best}
 const giftsLeft=st=>GIFTS-st.reduce((n,s)=>n+(s==='gift'?1:0),0);
 const ST_NUM={hidden:1,x:2,gift:3,warn:4,open:5};
 function hashKey(node){let h1=0x811c9dc5|0,h2=0x9747b28c|0;
  for(let i=0;i<N;i++){const v=ST_NUM[node.st[i]];h1=imul(h1^v,0x01000193);h2=imul(h2^v,0x5bd1e995)}
  const L=node.layouts;
  for(let i=0;i<L.length;i++){const v=L[i];h1=imul(h1^v,0x01000193);h2=imul(h2^(v*2654435761),0x5bd1e995);h2^=h2>>>15}
  return(h1>>>0).toString(36)+':'+(h2>>>0).toString(36)+':'+L.length}
 const baseMemo=new Map(),MEMO_MAX=300000; /* 휴대폰 메모리 고려(값은 정확값이라 지워져도 결과는 같고 속도만 달라짐) */
 /* 기본 정책으로 끝까지 진행할 때의 기대 클릭 수(정확값, 메모) */
 function baseCost(node){
  if(giftsLeft(node.st)<=0||node.layouts.length===0)return 0;
  if(node.layouts.length===1)return giftsLeft(node.st);
  const key=hashKey(node),hit=baseMemo.get(key);if(hit!==undefined)return hit;
  const ctx=ctxOf(node.st),t=basePick(node,ctx),groups=split(node,t,ctx);
  let W=0,sum=0;for(const g of groups){W+=g.w;sum+=g.w*baseCost(childOf(node,t,g.code,ctx,g.ls))}
  const v=1+sum/W;if(baseMemo.size>MEMO_MAX)baseMemo.clear();baseMemo.set(key,v);return v}
 /* 칸 t를 누른 뒤 f로 진행할 때의 기대 클릭 수. bound를 넘으면 조기 종료 */
 function costAfter(node,t,f,bound=Infinity){const ctx=ctxOf(node.st),groups=split(node,t,ctx).sort((a,b)=>b.w-a.w);
  let W=0;for(const g of groups)W+=g.w;let sum=0;
  for(const g of groups){sum+=g.w*f(childOf(node,t,g.code,ctx,g.ls));if(1+sum/W>bound)return Infinity}
  return 1+sum/W}
 /* 한 수 롤아웃: 모든 후보를 "누른 뒤 기본 정책"으로 평가한 최솟값 */
 function rolloutValue(node){
  if(giftsLeft(node.st)<=0||node.layouts.length===0)return 0;
  const ctx=ctxOf(node.st),s=surePick(node,ctx);if(s>=0)return costAfter(node,s,rolloutValue);
  let best=Infinity;for(const t of candidates(node.st)){const v=costAfter(node,t,baseCost,best);if(v<best)best=v}
  return best}
 const TOPK=6,DEEP=2500;
 function decide(node){
  const ex=new Map();if(giftsLeft(node.st)<=0||node.layouts.length===0)return-1;
  const ctx=ctxOf(node.st),s=surePick(node,ctx);if(s>=0)return s;
  for(const t of candidates(node.st))ex.set(t,costAfter(node,t,baseCost));
  if(node.layouts.length<=DEEP){
   const ranked=[...ex.entries()].sort((a,c)=>a[1]-c[1]).slice(0,TOPK);let bound=Infinity;
   for(const[t]of ranked){const v=costAfter(node,t,rolloutValue,bound);if(v<bound)bound=v;if(v<Infinity)ex.set(t,v)}}
  let min=Infinity;for(const v of ex.values())if(v<min)min=v;
  for(const[t,v]of ex)if(v-min<1e-9)return t; /* 동점이면 번호가 작은 칸 */
  return -1}
 return(st,layouts)=>decide({st,layouts})}

const rollDecide=rollEngine(NB,T);
const rollTIX=new Map();T.forEach((t,k)=>rollTIX.set(t,k)); /* cands()의 트리플 → 번호 */
const ROLL_MAP={c:'hidden',x:'x',f:'gift',h:'warn',o:'open'};
/* 지금 화면 상태(S) → [상태 배열, 남은 배치 번호]. 후보가 없거나 다 찾았으면 null */
function rollInput(){
 const cf=cands();if(!cf.length||found().length>=3)return null;
 return[C.map((_,i)=>ROLL_MAP[state(i)]),cf.map(t=>rollTIX.get(t))]}
function rollRec(){const a=rollInput();return a?rollDecide(a[0],a[1]):-1}
/* 워커 하나를 계속 씀(계산 메모가 수를 넘어 이어져서 빨라짐) */
let rollW=null,rollSeq=0;
function rollRecAsync(){
 const a=rollInput();if(!a)return Promise.resolve(-1);
 try{
  if(!rollW){
   const src='const decide=('+rollEngine.toString()+')('+JSON.stringify(NB)+','+JSON.stringify(T)+');onmessage=e=>postMessage({id:e.data.id,r:decide(e.data.st,e.data.ls)});';
   rollW=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})))}
 }catch(e){console.error(e);rollW=null;return Promise.resolve(rollDecide(a[0],a[1]))} /* 워커를 못 쓰면 바로 계산 */
 const id=++rollSeq,w=rollW;
 return new Promise(res=>{
  w.onmessage=e=>{if(e.data.id===id)res(e.data.r)};
  w.onerror=e=>{console.error(e);try{w.terminate()}catch(_){}if(rollW===w)rollW=null;res(rollDecide(a[0],a[1]))}; /* 워커 오류 → 바로 계산 */
  w.postMessage({id,st:a[0],ls:a[1]})})}
