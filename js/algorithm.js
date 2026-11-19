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
  if(found().length>=3)o.q.forEach(c=>S.obs.push({i:c,k:'r',h:false,F:found(),ans:true,auto:true,fo:o}));
  else if(o.q.length){/* 남은 후보 전부에서 ! 유지 여부가 같으면 질문 생략: 주변에 아직 안 열린 칸이 없어 ! 가 사라질 수밖에 없는 경우 등. 후보마다 갈리는 ! 만 질문 */
   const cf=cands(),F=found();
   if(cf.length)o.q.forEach(c=>{
    const hs=new Set(cf.map(t=>NB[c].some(j=>t.includes(j)&&!F.includes(j))));
    if(hs.size==1)S.obs.push({i:c,k:'r',h:[...hs][0],F:found(),ans:true,auto:true,fo:o})})}}}
function qf(){for(let p=S.obs.length-1;p>=0;p--){if(S.obs[p].k=='f'&&S.obs[p].q)return S.obs[p]}return null}
function pend(){const f=qf();return f?f.q.filter(c=>!S.obs.some(r=>r.k=='r'&&r.fo===f&&r.i==c)):[]}
function autoQ(){ /* 앞 질문에 답한 뒤 남은 ! 질문 중 후보 전부에서 답이 같아진 것은 묻지 않고 자동 처리(반복) */
 const f=qf();if(!f)return;
 for(let g=0;g<8;g++){
  const cf=cands();if(!cf.length)return;
  const F=found();let hit=false;
  for(const c of pend()){
   const hs=new Set(cf.map(t=>NB[c].some(j=>t.includes(j)&&!F.includes(j))));
   if(hs.size==1){S.obs.push({i:c,k:'r',h:[...hs][0],F:found(),ans:true,auto:true,fo:f});hit=true;break}}
  if(!hit)return}}
function answer(h){const q=pend();if(!q.length)return;S.obs.push({i:q[0],k:'r',h,F:found(),ans:true,fo:qf()});autoQ()}
function undoObs(){const o=S.obs.pop();if(o&&o.auto){while(S.obs.length&&S.obs[S.obs.length-1].auto&&S.obs[S.obs.length-1].fo===o.fo)S.obs.pop();S.obs.pop()}}

/* 100% 확정 칸 중 이웃에 '!' 칸이 있는 칸을 먼저 추천 (당첨을 찾으면 '!' 유지 여부로 옆 칸이 확정되므로 손해가 없음)
   반환: 칸 번호(0~41) / -1 해당 없음. 이웃 '!' 칸이 가장 많은 칸을 고르고, 동률이면 번호가 작은 칸 */
function sureRec(cf){
 cf=cf||cands();
 const N=cf.length,F=found();
 if(!N||F.length>=3)return -1;
 const op=opened(),hv=visH(),cnt=new Array(42).fill(0);
 for(const t of cf)for(const i of t)cnt[i]++;
 let r=-1,m=0;
 for(let x=0;x<42;x++){
  if(cnt[x]!=N||op.has(x))continue;
  const n=hv.filter(h=>NB[x].includes(h)).length;
  if(n>m){m=n;r=x}}
 return r}

/* 이 칸을 눌렀을 때의 결과가 남은 후보 전부에서 같으면 그 결과('f' 당첨 / 'h' 느낌표 / 'b' 빈칸), 갈리거나 후보가 없으면 null */
function outcome(i){
 const cf=cands();if(!cf.length)return null;
 const F=found();let r=null;
 for(const t of cf){
  const s=t.includes(i)?'f':t.some(j=>!F.includes(j)&&NB[i].includes(j))?'h':'b';
  if(r===null)r=s;else if(r!==s)return null}
 return r}
/* 이 칸을 눌렀을 때 남은 후보에서 나올 수 있는 결과들의 집합('f'/'h'/'b'). 후보가 없으면 null(전부 가능으로 취급) */
function outcomes(i){
 const cf=cands();if(!cf.length)return null;
 const F=found(),r=new Set();
 for(const t of cf){r.add(t.includes(i)?'f':t.some(j=>!F.includes(j)&&NB[i].includes(j))?'h':'b');if(r.size==3)break}
 return r}

function analyze(){
 const cf=cands(),N=cf.length,F=found(),op=opened();
 const ni=Array(42).fill(0),ex=Array(42).fill(0),bl=Array(42).fill(0);
 for(const t of cf){const un=t.filter(i=>!F.includes(i));
  for(let x=0;x<42;x++){if(op.has(x))continue;
   if(t.includes(x))ni[x]++;else if(NB[x].some(j=>un.includes(j)))ex[x]++;else bl[x]++}}
 let rec=-1,best=-1;
 if(N&&F.length<3){
  rec=sureRec(cf);
  if(rec<0)for(let x=0;x<42;x++){if(op.has(x))continue;
   const sc=2*ni[x]/N+1-(ni[x]**2+ex[x]**2+bl[x]**2)/(N*N);if(sc>best){best=sc;rec=x}}}
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
 const s=sureRec(cf);if(s>=0)return s; /* 100% 칸 + 이웃 '!' → 먼저 추천 */
 if(typeof rollRec=='function')return rollRec(typeof PF!=='undefined'?PF:null); /* 롤아웃 추천(rollout.js), prior.js 가중치(PF)를 넣어 계산. rollout.js가 없을 때만 아래 기존 방식 */
 return appChoice(cf,F,op,k)}

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
function openRec(O1,O2,O3,...OX){ /* 시작 추천 표 찾기. 표를 안 넘기면 일반 모드 표(OPEN1~3), prior.js가 있으면 OPENX1~3과 OPENX4~(OX)를 넘김 */
 O1=O1||OPEN1;O2=O2||OPEN2;O3=O3||OPEN3;
 if(S.xs.size!=2||S.os.size||S.n0)return null;
 const xk=[...S.xs].sort((a,b)=>a-b).join(',');
 const nc=S.obs.filter(o=>'bhf'.includes(o.k)).length,OD=nc>=3?OX[nc-3]:null;
 if(OD){ /* 네 번째 수부터: 지금까지 누른 결과와 ! 답변을 순서대로 이은 키 (OX[0] = OPENX4, OX[1] = OPENX5, ...) */
  if(S.obs.some(o=>o.manual)||pend().length)return null;
  const r=OD[xk+'|'+S.obs.map(o=>o.k=='r'?'r'+(o.h?1:0):o.i+'|'+o.k).join('|')];return r===undefined?null:r}
 if(!S.obs.length){const r=O1[xk];return r===undefined?null:r}
 if(S.obs.length==1){const o=S.obs[0];if(o.manual||!'bhf'.includes(o.k))return null;const r=O2[xk+'|'+o.i+'|'+o.k];return r===undefined?null:r}
 if(S.obs.length==2||(S.obs.length==3&&S.obs[2].k=='r'&&S.obs[2].ans)){
  const o1=S.obs[0],o2=S.obs[1];
  if(o1.manual||o2.manual||!'bhf'.includes(o1.k)||!'bhf'.includes(o2.k))return null;
  let key=xk+'|'+o1.i+'|'+o1.k+'|'+o2.i+'|'+o2.k;
  if(S.obs.length==3)key+='|r'+(S.obs[2].h?1:0);
  const r=O3[key];return r===undefined?null:r}
 return null}
