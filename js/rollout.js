/* rollout.js — 롤아웃 추천 (prior.js 가중치 PF와 간격 계수 PRIOR_SP를 넣어 계산)
   후보 칸마다 "그 칸을 누른 뒤 기본 정책으로 끝까지 풀 때의 디코더 기대값"을 끝까지 정확히 계산해서 가장 작은 칸을 고름.
   배치가 2,500개 이하이면 상위 6칸은 "누른 뒤 한 수 더 롤아웃"으로 다시 평가.
   기존 deepRec(깊이 제한 + 어림식 잎 값)보다 4,800판 시뮬레이션에서 평균 약 0.08클릭 적음(균등).
   실제 기록 분포로 만든 4,800판에서도 기존 휴리스틱보다 약 0.05클릭 적음.
   선물을 찾으면 옆 '!' 가 남는지/꺼지는지도 결과로 구분해서 계산함(! 재질문 정보 반영).
   algorithm.js 다음, ui.js 앞에서 불러옴.
   밖으로 내보내는 것: rollRec(pw) 지금 화면 상태로 바로 계산(동기) / rollRecAsync(pw) 같은 계산을 웹 워커에서(화면이 멈추지 않음, 실패하면 동기 계산으로 대체)
   pw = 칸별 당첨 가중치(prior.js의 PF). 없으면 균등
   rollEngine()은 계산 본체: 전역을 쓰지 않으므로 그대로 문자열로 바꿔 워커에 넣음 */
function rollEngine(NBR,TT,PW,SP){ /* NBR = 이웃 칸 목록(NB), TT = 트리플 표(T), PW = 칸별 당첨 가중치(42개, 없으면 균등), SP = [당첨 칸 사이 거리 1·2·3의 간격 계수, 좌우 한쪽 계수, 세 구역 계수, 거리 4·5의 간격 계수, 칸 번호 세 구역 계수, 세 줄 다름 계수, 기억 계수 κ, 기억한 당첨 세 칸 번호...](없으면 1) → (상태 배열, 배치 번호 배열) => 추천 칸 */
 const N=42,GIFTS=3,imul=Math.imul;
 const bitLo=i=>(i<32?(1<<i)>>>0:0),bitHi=i=>(i>=32?1<<(i-32):0);
 /* 트리플 표: algorithm.js의 T와 같은 순서(a<b<c) → 번호 k가 T[k]와 같음 */
 const NT=TT.length,T_LO=new Uint32Array(NT),T_HI=new Uint32Array(NT);
 const TW=new Float64Array(NT); /* 배치 가중치 = 세 칸 가중치의 곱 × 세 쌍의 간격 계수 (균등이면 모두 1) */
 const DST=NBR.map((_,s)=>{const d=new Array(N).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NBR[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
 const spf=(a,b)=>{const d=DST[a][b];return SP&&d>=1&&d<=3?SP[d-1]:SP&&(d===4||d===5)?SP[d+1]:1}; /* 거리 4·5는 SP[5]·SP[6] */
 /* 좌우 한쪽 계수: 세 칸이 중앙선 왼쪽·오른쪽에 나뉘지 않으면 SP[3] (판 모양은 8,9,8,9,8 고정) */
 const SIDE=[8,9,8,9,8].flatMap((n,r)=>Array.from({length:n},(_,c)=>{const x=r%2?c:c+.5;return x<4?-1:x>4?1:0}));
 const sdf=(a,b,c)=>SP&&SP.length>3&&!((SIDE[a]<0||SIDE[b]<0||SIDE[c]<0)&&(SIDE[a]>0||SIDE[b]>0||SIDE[c]>0))?SP[3]:1;
 /* 세 구역 계수: 세 칸이 세로 세 구역(x ≤ 2.5 / 3~5 / ≥ 5.5)에 한 칸씩이면 SP[4] */
 const ZONE=[8,9,8,9,8].flatMap((n,r)=>Array.from({length:n},(_,c)=>{const x=r%2?c:c+.5;return x<=2.5?0:x<5.5?1:2}));
 const zdf=(a,b,c)=>SP&&SP.length>4&&ZONE[a]!==ZONE[b]&&ZONE[a]!==ZONE[c]&&ZONE[b]!==ZONE[c]?SP[4]:1;
 /* 칸 번호 세 구역 계수 SP[7]: 세 칸이 칸 번호 세 구역(칸 번호 × 3 ÷ 줄 칸 수 내림: 8칸 줄 000 111 22, 9칸 줄 000 111 222)에 한 칸씩이면 */
 const ZI=[8,9,8,9,8].flatMap((n,r)=>Array.from({length:n},(_,c)=>Math.floor(c*3/n)));
 const zif=(a,b,c)=>SP&&SP.length>7&&ZI[a]!==ZI[b]&&ZI[a]!==ZI[c]&&ZI[b]!==ZI[c]?SP[7]:1;
 /* 세 줄 다름 계수 SP[8]: 칸 번호 세 구역에 한 칸씩이면서 줄도 모두 다르면 */
 const RW=[8,9,8,9,8].flatMap((n,r)=>Array(n).fill(r));
 const zrf=(a,b,c)=>SP&&SP.length>8&&ZI[a]!==ZI[b]&&ZI[a]!==ZI[c]&&ZI[b]!==ZI[c]&&RW[a]!==RW[b]&&RW[a]!==RW[c]&&RW[b]!==RW[c]?SP[8]:1;
 for(let k=0;k<NT;k++){const[a,b,c]=TT[k];T_LO[k]=(bitLo(a)|bitLo(b)|bitLo(c))>>>0;T_HI[k]=bitHi(a)|bitHi(b)|bitHi(c);TW[k]=(PW?PW[a]*PW[b]*PW[c]:1)*spf(a,b)*spf(a,c)*spf(b,c)*sdf(a,b,c)*zdf(a,b,c)*zif(a,b,c)*zrf(a,b,c)}
 /* 이전 판 기억: 앞에서 나온 당첨 세 칸(SP[10]~)에 SP[9] × (배치 평균 가중치)를 더함 */
 if(SP&&SP.length>10){let M=0;for(let k=0;k<NT;k++)M+=TW[k];M/=NT;for(let i=10;i<SP.length;i++)TW[SP[i]]+=SP[9]*M}
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
  for(let i=0;i<L.length;i++){const k=L[i],c=outcome(k,t,ctx,wn);let g=bk[c];if(!g)bk[c]=g={code:c,ls:[],w:0};g.ls.push(k);g.w+=TW[k]}
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
  const L=node.layouts;let W=0;for(let i=0;i<L.length;i++)W+=TW[L[i]];let best=-1,bestScore=-Infinity;const acc=new Float64Array(2+64);
  for(const t of candidates(node.st)){const wn=warnNb(t,ctx);acc.fill(0);let g=0;
   for(let i=0;i<L.length;i++){const k=L[i],c=outcome(k,t,ctx,wn);acc[c]+=TW[k];if(c>=2)g+=TW[k]}
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

/* 가중치(pw)별 계산기: pw가 없으면 균등. 보통 prior.js의 PF를 넘김. PF가 시트 값으로 바뀌면 새 계산기·새 워커를 만듦 */
const rollEng=new Map();
/* 간격 계수(prior.js의 PRIOR_SP)는 가중치(pw)를 넘길 때만 함께 씀: pw 없음 = 균등(간격 없음) */
/* 계수 9개(모자라면 1로 채움: 예전 5·7·8개짜리 prior.js도 그대로 동작) + 기억 [κ, 기억한 당첨 세 칸...] */
const rollSP=pw=>{if(!pw||typeof PRIOR_SP==='undefined')return null;const h=Array.from(PRIOR_SP).slice(0,9);while(h.length<9)h.push(1);
 return h.concat(typeof PRIOR_SEEN!=='undefined'&&PRIOR_SEEN.length&&PRIOR_SP.length>4?[PRIOR_MEM,...PRIOR_SEEN]:[])};
const rollKey=pw=>pw?Array.prototype.join.call(pw,',')+'|'+(rollSP(pw)||[]).join(','):'u';
function rollDecideFor(pw){const k=rollKey(pw);let d=rollEng.get(k);
 if(!d){if(pw)for(const key of[...rollEng.keys()])if(key!=='u')rollEng.delete(key); /* 옛 가중치 계산기는 버림(메모리) */
  d=rollEngine(NB,T,pw?Array.from(pw):null,rollSP(pw));rollEng.set(k,d)}
 return d}
const rollTIX=new Map();T.forEach((t,k)=>rollTIX.set(t,k)); /* cands()의 트리플 → 번호 */
const ROLL_MAP={c:'hidden',x:'x',f:'gift',h:'warn',o:'open'};
/* 지금 화면 상태(S) → [상태 배열, 남은 배치 번호]. 후보가 없거나 다 찾았으면 null */
function rollInput(){
 const cf=cands();if(!cf.length||found().length>=3)return null;
 return[C.map((_,i)=>ROLL_MAP[state(i)]),cf.map(t=>rollTIX.get(t))]}
/* ✕ 쌍별 칸 가중치: prior.js의 PF를 넘기면 지금 판의 ✕ 쌍에 맞춘 PF × PRIOR_XW로 바꿈 */
function rollPW(pw,st){if(!pw||typeof pfFor!=='function'||typeof PF==='undefined'||pw!==PF)return pw;const xs=[];st.forEach((s,i)=>{if(s==='x')xs.push(i)});return pfFor(xs)}
function rollRec(pw){const a=rollInput();if(!a)return -1;pw=rollPW(pw,a[0]);return rollDecideFor(pw)(a[0],a[1])}
/* 워커는 가중치별로 하나씩 계속 씀(계산 메모가 수를 넘어 이어져서 빨라짐) */
const rollWs=new Map();let rollSeq=0;
function rollRecAsync(pw){
 const a=rollInput();if(!a)return Promise.resolve(-1);pw=rollPW(pw,a[0]);
 const k=rollKey(pw),sync=()=>rollDecideFor(pw)(a[0],a[1]);
 let w=rollWs.get(k);
 try{
  if(!w){
   if(pw)for(const[key,ow]of[...rollWs])if(key!=='u'){try{ow.terminate()}catch(_){}rollWs.delete(key)} /* 옛 가중치 워커는 끝냄 */
   const src='const decide=('+rollEngine.toString()+')('+JSON.stringify(NB)+','+JSON.stringify(T)+','+(pw?JSON.stringify(Array.from(pw)):'null')+','+JSON.stringify(rollSP(pw))+');onmessage=e=>postMessage({id:e.data.id,r:decide(e.data.st,e.data.ls)});';
   w=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));rollWs.set(k,w)}
 }catch(e){console.error(e);return Promise.resolve(sync())} /* 워커를 못 쓰면 바로 계산 */
 const id=++rollSeq;
 return new Promise(res=>{
  w.onmessage=e=>{if(e.data.id===id)res(e.data.r)};
  w.onerror=e=>{console.error(e);try{w.terminate()}catch(_){}if(rollWs.get(k)===w)rollWs.delete(k);res(sync())}; /* 워커 오류 → 바로 계산 */
  w.postMessage({id,st:a[0],ls:a[1]})})}
