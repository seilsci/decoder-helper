/* 알고리즘 — 보드 구조, 후보 계산, 확률 분석, 완전 탐색, 추천 로직 (화면 코드 없음) */
const R=[8,9,8,9,8],C=[];
R.forEach((n,r)=>{for(let c=0;c<n;c++)C.push({r,c,x:r%2?c:c+.5})});
const NB=C.map((a,i)=>C.map((b,j)=>j).filter(j=>{const b=C[j],dr=Math.abs(a.r-b.r),dx=Math.abs(a.x-b.x);return j!=i&&((dr==0&&dx==1)||(dr==1&&dx==.5))}));
const T=[];for(let a=0;a<42;a++)for(let b=a+1;b<42;b++)for(let c=b+1;c<42;c++)T.push([a,b,c]);
const found=()=>S.obs.filter(o=>o.k=='f').map(o=>o.i);
const clicks=()=>S.obs.filter(o=>'bhf'.includes(o.k)&&!o.manual).length-S.n0;
function opened(){const s=new Set([...S.xs,...S.os]);S.obs.forEach(o=>{s.add(o.i);if(o.k=='b')NB[o.i].forEach(j=>s.add(j))});return s}
function ok(t,o){const hit=t.includes(o.i);if(o.k=='f')return hit;if(hit)return false;
 const near=NB[o.i].some(j=>t.includes(j)&&!o.F.includes(j));return(o.k=='h'||o.h)?near:!near}
function eff(){const tg=new Map();S.obs.forEach(o=>{if(o.k=='t')tg.set(o.r,!tg.get(o.r))});
 return S.obs.filter(o=>o.k!='t').map(o=>o.k=='r'&&tg.get(o)?{...o,h:!o.h}:o)}
function cands(E){E=E||eff();return T.filter(t=>!t.some(i=>S.xs.has(i)||S.os.has(i))&&E.every(o=>ok(t,o)))}
function conflict(){
 const E=eff();let bestV=null;
 for(const t of T){if(t.some(i=>S.xs.has(i)||S.os.has(i)))continue;
  const v=E.filter(o=>!ok(t,o));
  if(!bestV||v.length<bestV.length){bestV=v;if(!v.length)break}}
 return bestV?[...new Set(bestV.map(o=>o.i))]:[]}
function lastR(i){let r=null;S.obs.forEach(o=>{if(o.k=='r'&&o.i==i)r=o});return r}
function addObs(i,k){
 const o={i,k,F:found()};
 S.obs.push(o);
 if(k=='f'){
  o.q=[...new Set(S.obs.filter(h=>h.k=='h'&&NB[h.i].includes(i)&&state(h.i)=='h').map(h=>h.i))];
  if(found().length>=3)o.q.forEach(c=>S.obs.push({i:c,k:'r',h:false,F:found(),ans:true,fo:o}));
  else if(o.q.length){/* 남은 후보 전부에서 ! 유지 여부가 같으면 질문 생략: 주변에 아직 안 열린 칸이 없어 ! 가 사라질 수밖에 없는 경우 등. 후보마다 갈리는 ! 만 질문 */
   const cf=cands(),F=found();
   if(cf.length)o.q.forEach(c=>{
    const hs=new Set(cf.map(t=>NB[c].some(j=>t.includes(j)&&!F.includes(j))));
    if(hs.size==1)S.obs.push({i:c,k:'r',h:[...hs][0],F:found(),ans:true,auto:true,fo:o})})}}}
function qf(){for(let p=S.obs.length-1;p>=0;p--){if(S.obs[p].k=='f'&&S.obs[p].q)return S.obs[p]}return null}
function pend(){const f=qf();return f?f.q.filter(c=>!S.obs.some(r=>r.k=='r'&&r.fo===f&&r.i==c)):[]}
function answer(h){const q=pend();if(!q.length)return;S.obs.push({i:q[0],k:'r',h,F:found(),ans:true,fo:qf()})}
function undoObs(){const o=S.obs.pop();if(o&&o.auto){while(S.obs.length&&S.obs[S.obs.length-1].auto&&S.obs[S.obs.length-1].fo===o.fo)S.obs.pop();S.obs.pop()}}
function analyze(){
 const cf=cands(),N=cf.length,F=found(),op=opened();
 const ni=Array(42).fill(0),ex=Array(42).fill(0),bl=Array(42).fill(0);
 for(const t of cf){const un=t.filter(i=>!F.includes(i));
  for(let x=0;x<42;x++){if(op.has(x))continue;
   if(t.includes(x))ni[x]++;else if(NB[x].some(j=>un.includes(j)))ex[x]++;else bl[x]++}}
 let rec=-1,best=-1;
 if(N&&F.length<3)for(let x=0;x<42;x++){if(op.has(x))continue;
  const sc=2*ni[x]/N+1-(ni[x]**2+ex[x]**2+bl[x]**2)/(N*N);if(sc>best){best=sc;rec=x}}
 return{N,p:ni.map(v=>N?v/N:0),rec}}
const ADJ=new Uint8Array(1764);NB.forEach((l,x)=>l.forEach(a=>ADJ[x*42+a]=1));
const lf=(n,k)=>n&&k?k+.6*Math.log2(n):0;
function best(cf,F,op,k,d,K){
 const N=cf.length,ni=new Int32Array(42),ex=new Int32Array(42),bl=new Int32Array(42);
 for(const t of cf){const u=t.filter(i=>!F[i]);
  for(let x=0;x<42;x++){if(op[x])continue;
   if(t[0]==x||t[1]==x||t[2]==x)ni[x]++;
   else{let n=0;for(const a of u)if(ADJ[x*42+a]){n=1;break}n?ex[x]++:bl[x]++}}}
 const v1=[];
 for(let x=0;x<42;x++)if(!op[x]&&N)v1.push([1+(ni[x]*lf(ni[x],k-1)+ex[x]*lf(ex[x],k)+bl[x]*lf(bl[x],k))/N,x]);
 v1.sort((a,b)=>a[0]-b[0]);
 if(d<=1||!v1.length)return v1.length?v1[0]:[0,-1];
 let bv=1e9,bx=-1;
 for(const[,x]of v1.slice(0,K)){
  const gi=[],gh=[],gb=[];
  for(const t of cf){if(t.includes(x))gi.push(t);else if(t.some(a=>!F[a]&&ADJ[x*42+a]))gh.push(t);else gb.push(t)}
  let v=1;const o1=op.slice();o1[x]=1;
  if(gi.length&&k>1){const F2=F.slice();F2[x]=1;v+=gi.length/N*best(gi,F2,o1,k-1,d-1,K)[0]}
  if(gh.length)v+=gh.length/N*best(gh,F,o1,k,d-1,K)[0];
  if(gb.length){const o2=o1.slice();NB[x].forEach(j=>o2[j]=1);v+=gb.length/N*best(gb,F,o2,k,d-1,K)[0]}
  if(v<bv){bv=v;bx=x}}
 return[bv,bx]}
function appChoice(cf,F,op,k){const N=cf.length;return(N>3000?best(cf,F,op,k,3,6):N>300?best(cf,F,op,k,4,6):best(cf,F,op,k,5,6))[1]}
function deepRec(){
 const cf=cands(),F=new Uint8Array(42),op=new Uint8Array(42);
 found().forEach(i=>F[i]=1);opened().forEach(i=>op[i]=1);
 const k=3-found().length,N=cf.length;if(!N||!k)return -1;
 return appChoice(cf,F,op,k)}

const XM=(()=>{try{return /[?&]x=6(&|$)/.test(location.search)}catch(e){return false}})();
const EX_FROM=0;        /* 클릭 횟수 조건 없음 */
let EX_MAXN=200;        /* 후보가 이 개수 이하일 때만 완전탐색 (화면 입력칸에서 변경 가능) */
const EX_BUD=Infinity;   /* 계산 호출 한도 없음 */
const EX_MS=Infinity;   /* 계산 시간 한도 없음 (완전탐색은 x=6일 때만 실행됨) */
let exCalls=0,exT0=0;const exMemo=new Map();
const exCode=t=>t[0]*1764+t[1]*42+t[2];
function exKey(cf,F,op,H){
 let h1=5381,h2=52711;
 for(const t of cf){const c=exCode(t);h1=(Math.imul(h1,33)^c)|0;h2=(Math.imul(h2,31)+c)|0}
 let o1=0,o2=0,f1=0,f2=0;
 for(let i=0;i<21;i++){o1|=op[i]<<i;o2|=op[i+21]<<i;f1|=F[i]<<i;f2|=F[i+21]<<i}
 return h1+','+h2+','+cf.length+','+o1+','+o2+','+f1+','+f2+'|'+H.join(',')}
function exSig(t,x,F,H){
 const unf=t.filter(a=>!F[a]);
 if(t.includes(x)){let s='f';for(const h of H)s+=unf.some(a=>a!==x&&ADJ[h*42+a])?'1':'0';return s}
 return unf.some(a=>ADJ[x*42+a])?'h':'b'}
function exSplit(cf,x,F,H){const m=new Map();for(const t of cf){const s=exSig(t,x,F,H);let g=m.get(s);if(!g){g=[];m.set(s,g)}g.push(t)}return m}
function exNext(s,x,F,op,H){
 const op2=op.slice();op2[x]=1;
 if(s[0]=='f'){const F2=F.slice();F2[x]=1;return[F2,op2,H.filter((_,i)=>s[1+i]=='1')]}
 if(s=='h')return[F,op2,H.concat([x])];
 NB[x].forEach(j=>op2[j]=1);return[F,op2,H]}
function exCheck(){if(++exCalls>EX_BUD||((exCalls&255)==0&&Date.now()-exT0>EX_MS))throw new Error('budget')}
function exV(cf,F,op,H,k){
 if(k==0)return 0;if(cf.length==1)return k;
 exCheck();
 const kk=exKey(cf,F,op,H);if(exMemo.has(kk))return exMemo.get(kk);
 let bs=1e9;
 for(let x=0;x<42;x++){if(op[x])continue;
  const v=exVal(x,cf,F,op,H,k,bs);if(v<bs)bs=v}
 exMemo.set(kk,bs);return bs}
function exVal(x,cf,F,op,H,k,lim){
 const m=exSplit(cf,x,F,H);
 if(m.size==1&&[...m.keys()][0][0]!='f')return 1e9;
 let v=1;
 for(const[s,g]of m){const[F2,op2,H2]=exNext(s,x,F,op,H);v+=g.length/cf.length*exV(g,F2,op2,H2,s[0]=='f'?k-1:k);if(v>=lim)return v}
 return v}
/* 반환: 칸 번호(0~41) / -1 해당 없음 / -2 시간·계산량 초과 / -3 후보가 너무 많음 */
function exPrep(){ /* 완전탐색 준비: 숫자(-1/-3)면 그대로 결과, 객체면 탐색 입력 */
 const cf=cands(),N=cf.length,k=3-found().length;
 if(!XM||S.lang!=='ko')return -1; /* x=6 이고 한국어일 때만 완전탐색 */
 if(N<2||k<1)return -1;
 if(N>EX_MAXN)return -3;
 const F=new Uint8Array(42),op=new Uint8Array(42);
 found().forEach(i=>F[i]=1);opened().forEach(i=>op[i]=1);
 const c0=new Uint32Array(42);cf.forEach(t=>t.forEach(i=>c0[i]++));
 for(let i=0;i<42;i++)if(c0[i]==0||c0[i]==N)op[i]=1; /* 0%·100% 확정 칸은 탐색 대상에서 제외(열린 칸 취급) */
 const H=C.map((_,i)=>i).filter(i=>state(i)=='h');
 return{cf,N,k,F,op,H}}
function exSeq(p){ /* 한 코어(메인 스레드)로 순서대로 탐색 — 병렬을 못 쓸 때의 대체 경로 */
 const{cf,k,F,op,H}=p;
 exMemo.clear();exCalls=0;exT0=Date.now();
 try{
  let bs=1e9,bx=-1;
  const xa=appChoice(cf,F,op,k); /* 기존 추천을 먼저 계산해 기준으로 삼음(동점이면 기존 추천 유지) */
  if(xa>=0&&!op[xa]){bs=exVal(xa,cf,F,op,H,k,1e9);bx=xa}
  for(let x=0;x<42;x++){if(op[x]||x==xa)continue;const v=exVal(x,cf,F,op,H,k,bs);if(v<bs-1e-9){bs=v;bx=x}}
  if(bx<0)return -1;
  return bx
 }catch(e){if(e.message!=='budget')throw e;return -2}
 finally{exMemo.clear()}}
function exRec(){const p=exPrep();return typeof p=='number'?p:exSeq(p)}

/* ── 병렬 완전탐색: Web Worker 여러 개가 칸(첫 수 후보)을 하나씩 가져가 계산 ── */
let exPool=null,exSid=0;
function exWorkerSrc(){
 return 'const NB='+JSON.stringify(NB)+';const ADJ=new Uint8Array('+JSON.stringify(Array.from(ADJ))+');'
  +'let exCalls=0,exT0=0;const EX_BUD=Infinity,EX_MS=Infinity;const exMemo=new Map();let cur=-1;\n'
  +'const exCode='+exCode.toString()+';\n'
  +[exKey,exSig,exSplit,exNext,exCheck,exV,exVal].map(f=>f.toString()).join('\n')
  +'\nonmessage=e=>{const m=e.data;if(m.sid!==cur){cur=m.sid;exMemo.clear()}'
  +'const v=exVal(m.x,m.cf,Uint8Array.from(m.F),Uint8Array.from(m.op),m.H,m.k,m.lim);'
  +'postMessage({sid:m.sid,x:m.x,v})};'}
function exPoolGet(){
 if(exPool)return exPool;
 const hc=(typeof navigator!=='undefined'&&navigator.hardwareConcurrency)||4;
 const n=Math.max(2,Math.min(16,hc-1)); /* 브라우저용 스레드 1개는 남김 (i5-14400: 16스레드 → 15개) */
 const url=URL.createObjectURL(new Blob([exWorkerSrc()],{type:'text/javascript'}));
 const pool=[];for(let i=0;i<n;i++)pool.push(new Worker(url));
 exPool=pool;return pool}
/* 반환: Promise — exRec()와 같은 값(칸 번호 / -1 / -3). 병렬을 못 쓰면 exSeq로 대체 */
function exRecPar(onProg){ /* onProg(끝낸 칸 수, 전체 칸 수, 경과 ms): 진행률 표시용(선택) */
 const p=exPrep();
 if(typeof p=='number')return Promise.resolve(p);
 if(typeof Worker=='undefined'||typeof Blob=='undefined')return Promise.resolve(exSeq(p));
 let pool;try{pool=exPoolGet()}catch(e){console.error(e);exPool=null;return Promise.resolve(exSeq(p))}
 const{cf,k,F,op,H}=p;
 const xa=appChoice(cf,F,op,k); /* 기존 추천: 동점일 때 우선 */
 const xs=[];if(xa>=0&&!op[xa])xs.push(xa);
 for(let x=0;x<42;x++)if(!op[x]&&x!=xa)xs.push(x);
 const sid=++exSid,fa=Array.from(F),oa=Array.from(op);
 return new Promise(resolve=>{
  let next=0,done=0,lim=1e9,over=false;const res=[];
  const t0=Date.now(),prog=()=>{if(onProg)onProg(done,xs.length,Date.now()-t0)},tk=onProg?setInterval(prog,250):0; /* 끝나는 칸이 없어도 경과 시간은 계속 갱신 */
  const fail=e=>{if(over)return;over=true;clearInterval(tk);console.error(e);exPool&&exPool.forEach(w=>w.terminate());exPool=null;resolve(exSeq(p))};
  const fin=()=>{
   if(over)return;over=true;clearInterval(tk);
   res.sort((a,b)=>a.x==xa?-1:b.x==xa?1:a.x-b.x); /* xa 먼저, 나머지는 칸 번호 순 — 순차 탐색과 같은 동점 처리 */
   let bv=1e9,bx=-1;
   for(const m of res)if(bx<0||m.v<bv-1e-9){bv=m.v;bx=m.x}
   resolve(bx<0?-1:bx)};
  const send=w=>{if(next>=xs.length)return;w.postMessage({sid,x:xs[next++],cf,F:fa,op:oa,H,k,lim})};
  pool.forEach(w=>{
   w.onmessage=e=>{const m=e.data;if(m.sid!==sid||over)return;
    res.push(m);if(m.v<lim)lim=m.v; /* 지금까지의 최선값을 다음 칸 계산의 가지치기 기준으로 사용 */
    if(++done>=xs.length)fin();else{send(w);prog()}};
   w.onerror=fail;
   send(w)});
  prog();
  if(!xs.length)fin()})}
function state(i){
 if(S.xs.has(i))return'x';
 if(S.mode=='setup'){
  if(S.fs.has(i))return'f';
  if(S.hs.has(i))return'h';
  if(S.bs.has(i))return'o';
  return'c'}
 const o=S.obs.find(o=>o.i==i);
 if(o){if(o.k=='f')return'f';if(o.k=='h'){let r=null;eff().forEach(x=>{if(x.k=='r'&&x.i==i)r=x});return r&&!r.h?'o':'h'}return'o'}
 return S.os.has(i)||S.obs.some(o=>o.k=='b'&&NB[o.i].includes(i))?'o':'c'}

function vanN(){
 return S.obs.filter(o=>o.k=='h'&&state(o.i)=='o'&&lastR(o.i)).length}
function lastReal(){
 let r=null;S.obs.forEach(o=>{if('bhf'.includes(o.k)&&!o.manual)r=o});return r}
function visH(){return[...new Set(S.obs.filter(o=>o.k=='h'&&state(o.i)=='h').map(o=>o.i))]}
function impossible(){
 const F=found(),E=eff().filter(o=>o.k=='h'||(o.k=='r'&&o.h));
 const mk=new Set(S.obs.filter(o=>o.k=='b'||o.k=='h').map(o=>o.i));
 const need=E.filter(o=>!NB[o.i].some(j=>F.includes(j)&&!o.F.includes(j)));
 const opts=o=>NB[o.i].filter(j=>!S.xs.has(j)&&!S.os.has(j)&&!F.includes(j)&&!mk.has(j)&&!o.F.includes(j));
 const nop=need.filter(o=>!opts(o).length);
 if(nop.length)return{k:'noplace',cells:[...new Set(nop.map(o=>o.i))]};
 const ch=new Set();
 const dfs=lim=>{const o=need.find(o=>!opts(o).some(j=>ch.has(j)));if(!o)return true;if(!lim)return false;
  for(const j of opts(o)){ch.add(j);const r=dfs(lim-1);ch.delete(j);if(r)return true}return false};
 let m=0;while(m<7&&!dfs(m))m++;
 return F.length+m>3?{k:'many',n:F.length+m,cells:visH()}:null}
function fallback(){
 const F=found();if(F.length>=3)return null;
 const cl=(S.cl||[]).filter(i=>!S.xs.has(i)&&!S.obs.some(o=>o.i==i));
 if(cl.length&&cl.length<=3-F.length)return{i:cl[0],p:1,sure:true};
 const E=eff();let bv=1e9,cnt=new Map(),n=0;
 for(const t of T){if(t.some(i=>S.xs.has(i)||S.os.has(i))||!F.every(i=>t.includes(i)))continue;
  const v=E.filter(o=>!ok(t,o)).length;
  if(v>bv)continue;
  if(v<bv){bv=v;cnt=new Map();n=0}
  n++;t.forEach(i=>{if(!F.includes(i))cnt.set(i,(cnt.get(i)||0)+1)})}
 if(!n)return null;
 let r=-1,m=0,pc=0;cnt.forEach((c,i)=>{const sc=c+((S.cl||[]).includes(i)?.5:0);if(sc>m){m=sc;r=i;pc=c}});
 return r<0?null:{i:r,p:pc/n}}
function openRec(){
 if(S.xs.size!=2||S.os.size||S.n0)return null;
 const xk=[...S.xs].sort((a,b)=>a-b).join(',');
 if(!S.obs.length){const r=OPEN1[xk];return r===undefined?null:r}
 if(S.obs.length==1){const o=S.obs[0];if(o.manual||!'bhf'.includes(o.k))return null;const r=OPEN2[xk+'|'+o.i+'|'+o.k];return r===undefined?null:r}
 if(S.obs.length==2||(S.obs.length==3&&S.obs[2].k=='r'&&S.obs[2].ans)){
  const o1=S.obs[0],o2=S.obs[1];
  if(o1.manual||o2.manual||!'bhf'.includes(o1.k)||!'bhf'.includes(o2.k))return null;
  let key=xk+'|'+o1.i+'|'+o1.k+'|'+o2.i+'|'+o2.k;
  if(S.obs.length==3)key+='|r'+(S.obs[2].h?1:0);
  const r=OPEN3[key];return r===undefined?null:r}
 return null}
