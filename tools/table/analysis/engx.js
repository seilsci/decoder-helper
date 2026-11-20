// (분석용 사본) ../eng.js와 같고, makeEngine({TWX})로 배치 가중치 배열을 직접 줄 수 있는 한 줄만 다름
// 실험용 엔진: rollout.js의 rollEngine과 같은 계산 + (1) 기본 정책 점수 교체 (2) 평가 가중치 분리
// makeEngine({PW, EW, score, topK, deep}) → {decide(st,ls), baseValueFromStart(x), policyExact}
const N=42,GIFTS=3;
const ROWS=[8,9,8,9,8],C=[];ROWS.forEach((n,r)=>{for(let c=0;c<n;c++)C.push({r,x:r%2?c:c+.5})});
const NB=C.map((a,i)=>C.map((_,j)=>j).filter(j=>{const b=C[j],dr=Math.abs(a.r-b.r),dx=Math.abs(a.x-b.x);return j!=i&&((dr==0&&dx==1)||(dr==1&&dx==.5))}));
const T=[];for(let a=0;a<42;a++)for(let b=a+1;b<42;b++)for(let c=b+1;c<42;c++)T.push([a,b,c]);
const DST=NB.map((_,s)=>{const d=new Array(N).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NB[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
const spf=(SP,a,b)=>{const d=DST[a][b];return SP&&d>=1&&d<=3?SP[d-1]:1}; // 간격 계수
const SIDE=[8,9,8,9,8].flatMap((n,r)=>Array.from({length:n},(_,c)=>{const x=r%2?c:c+.5;return x<4?-1:x>4?1:0}));
const sdf=(SP,a,b,c)=>SP&&SP.length>3&&!((SIDE[a]<0||SIDE[b]<0||SIDE[c]<0)&&(SIDE[a]>0||SIDE[b]>0||SIDE[c]>0))?SP[3]:1; // 좌우 한쪽 계수
const bitLo=i=>(i<32?(1<<i)>>>0:0),bitHi=i=>(i>=32?1<<(i-32):0);
const NT=T.length,T_LO=new Uint32Array(NT),T_HI=new Uint32Array(NT);
for(let k=0;k<NT;k++){const[a,b,c]=T[k];T_LO[k]=(bitLo(a)|bitLo(b)|bitLo(c))>>>0;T_HI[k]=bitHi(a)|bitHi(b)|bitHi(c)}
const NB_LO=NB.map(ns=>ns.reduce((m,i)=>(m|bitLo(i))>>>0,0)),NB_HI=NB.map(ns=>ns.reduce((m,i)=>m|bitHi(i),0));
function ctxOf(st){let fLo=0,fHi=0;const warn=new Array(N).fill(false);for(let i=0;i<N;i++){if(st[i]==='gift'){fLo=(fLo|bitLo(i))>>>0;fHi|=bitHi(i)}else if(st[i]==='warn')warn[i]=true}return{fLo,fHi,warn}}
const warnNb=(t,ctx)=>NB[t].filter(n=>ctx.warn[n]);
function outcome(k,t,ctx,wn){const lo=T_LO[k],hi=T_HI[k];const inL=t<32?(lo&bitLo(t))!==0:(hi&bitHi(t))!==0;
 if(!inL)return((lo&~ctx.fLo&NB_LO[t])>>>0)!==0||(hi&~ctx.fHi&NB_HI[t])!==0?0:1;
 const fLo=(ctx.fLo|bitLo(t))>>>0,fHi=ctx.fHi|bitHi(t);let mask=0;
 for(let j=0;j<wn.length;j++){const w=wn[j];if(((lo&~fLo&NB_LO[w])>>>0)!==0||(hi&~fHi&NB_HI[w])!==0)mask|=1<<j}return 2+mask}
function applyStates(st,t,code,wn){if(code===0)st[t]='warn';else if(code===1){st[t]='open';for(const n of NB[t])if(st[n]==='hidden')st[n]='open'}else{st[t]='gift';wn.forEach((w,j)=>{if(!((code-2)&(1<<j)))st[w]='open'})}}
function candidates(st){const o=[];for(let i=0;i<N;i++)if(st[i]==='hidden')o.push(i);return o}
const giftsLeft=st=>GIFTS-st.reduce((n,s)=>n+(s==='gift'?1:0),0);
const ST_NUM={hidden:1,x:2,gift:3,warn:4,open:5};
function hashKey(st,L){let h1=0x811c9dc5|0,h2=0x9747b28c|0;for(let i=0;i<N;i++){const v=ST_NUM[st[i]];h1=Math.imul(h1^v,0x01000193);h2=Math.imul(h2^v,0x5bd1e995)}
 for(let i=0;i<L.length;i++){const v=L[i];h1=Math.imul(h1^v,0x01000193);h2=Math.imul(h2^(v*2654435761),0x5bd1e995);h2^=h2>>>15}
 return(h1>>>0).toString(36)+':'+(h2>>>0).toString(36)+':'+L.length}
/* 점수 함수: p = 결과별 확률 배열(acc/W), g = 당첨 확률, k = 남은 당첨 수 → 클수록 좋음 */
const SCORES={
 cur:(acc,W,g)=>{let ss=0;for(const a of acc)ss+=a*a;return g/W+(1-ss/(W*W))},
};
function makeEngine(o){
 const PW=o.PW,SP=o.SP||null,TW=new Float64Array(NT);for(let k=0;k<NT;k++){const[a,b,c]=T[k];TW[k]=(PW?PW[a]*PW[b]*PW[c]:1)*spf(SP,a,b)*spf(SP,a,c)*spf(SP,b,c)*sdf(SP,a,b,c)}
 if(o.TWX)TW.set(o.TWX); // 배치 가중치 직접 지정(분석용)
 const score=o.score||SCORES.cur,TOPK=o.topK??6,DEEP=o.deep??2500,EPS=1e-12;
 function split(st,L,t,ctx){const wn=warnNb(t,ctx),bk=[];for(let i=0;i<L.length;i++){const k=L[i],c=outcome(k,t,ctx,wn);let g=bk[c];if(!g)bk[c]=g={code:c,ls:[],w:0};g.ls.push(k);g.w+=TW[k]}return bk.filter(g=>!!g)}
 function child(st,t,code,ctx){const s=st.slice();applyStates(s,t,code,warnNb(t,ctx));return s}
 function surePick(st,L,ctx){let best=-1,bestN=-1;for(const t of candidates(st)){let all=true;const bt=t<32?bitLo(t):bitHi(t);
   for(let i=0;i<L.length&&all;i++){const k=L[i];if(((t<32?T_LO[k]:T_HI[k])&bt)===0)all=false}
   if(all){const n=warnNb(t,ctx).length;if(n>bestN){bestN=n;best=t}}}return best}
 const acc=new Float64Array(66),cnt=new Float64Array(66);
 function basePick(st,L,ctx){const s=surePick(st,L,ctx);if(s>=0)return s;let W=0;for(let i=0;i<L.length;i++)W+=TW[L[i]];
  let best=-1,bs=-Infinity;const k=giftsLeft(st);
  for(const t of candidates(st)){const wn=warnNb(t,ctx);acc.fill(0);cnt.fill(0);let g=0;
   for(let i=0;i<L.length;i++){const kk=L[i],c=outcome(kk,t,ctx,wn);acc[c]+=TW[kk];cnt[c]++;if(c>=2)g+=TW[kk]}
   const sc=score(acc,W,g,k,cnt);if(sc>bs+EPS){bs=sc;best=t}}
  return best}
 const memo=new Map();
 function baseCost(st,L){if(giftsLeft(st)<=0||!L.length)return 0;if(L.length===1)return giftsLeft(st);
  const key=hashKey(st,L),h=memo.get(key);if(h!==undefined)return h;
  const ctx=ctxOf(st),t=basePick(st,L,ctx);let W=0,S=0;for(const g of split(st,L,t,ctx)){W+=g.w;S+=g.w*baseCost(child(st,t,g.code,ctx),g.ls)}
  const v=1+S/W;if(memo.size>1500000)memo.clear();memo.set(key,v);return v}
 function costAfter(st,L,t,f,bound=Infinity){const ctx=ctxOf(st),gs=split(st,L,t,ctx).sort((a,b)=>b.w-a.w);let W=0;for(const g of gs)W+=g.w;let S=0;
  for(const g of gs){S+=g.w*f(child(st,t,g.code,ctx),g.ls);if(1+S/W>bound)return Infinity}return 1+S/W}
 function rolloutValue(st,L){if(giftsLeft(st)<=0||!L.length)return 0;const ctx=ctxOf(st),s=surePick(st,L,ctx);if(s>=0)return costAfter(st,L,s,rolloutValue);
  let b=Infinity;for(const t of candidates(st)){const v=costAfter(st,L,t,baseCost,b);if(v<b)b=v}return b}
 const dmemo=new Map();
 function decide(st,L){const dk=hashKey(st,L);const dh=dmemo.get(dk);if(dh!==undefined)return dh;const r=decide0(st,L);if(dmemo.size>200000)dmemo.clear();dmemo.set(dk,r);return r}
 function decide0(st,L){if(giftsLeft(st)<=0||!L.length)return -1;const ctx=ctxOf(st),s=surePick(st,L,ctx);if(s>=0)return s;
  const ex=new Map();for(const t of candidates(st))ex.set(t,costAfter(st,L,t,baseCost));
  if(L.length<=DEEP){const r=[...ex.entries()].sort((a,c)=>a[1]-c[1]).slice(0,TOPK);let bd=Infinity;
   for(const[t]of r){const v=costAfter(st,L,t,rolloutValue,bd);if(v<bd)bd=v;if(v<Infinity)ex.set(t,v)}}
  let m=Infinity;for(const v of ex.values())if(v<m)m=v;for(const[t,v]of ex)if(v-m<1e-9)return t;return -1}
 /* 기본 정책의 정확한 평균 클릭 수: 정책은 PW로 고르고, 평균은 EW(실제 분포)로 냄 */
 function baseExact(x,EW){const st=new Array(N).fill('hidden');st[x]='x';st[41-x]='x';
  const L=[];for(let k=0;k<NT;k++){const t=T[k];if(!t.includes(x)&&!t.includes(41-x))L.push(k)}
  const ew=k=>{const[a,b,c]=T[k];return EW[a]*EW[b]*EW[c]};
  const m2=new Map();
  const rec=(st,L)=>{if(giftsLeft(st)<=0||!L.length)return 0;if(L.length===1)return giftsLeft(st);
   const key=hashKey(st,L),h=m2.get(key);if(h!==undefined)return h;
   const ctx=ctxOf(st),t=basePick(st,L,ctx);let W=0,S=0;
   for(const g of split(st,L,t,ctx)){let w=0;for(const k of g.ls)w+=ew(k);W+=w;S+=w*rec(child(st,t,g.code,ctx),g.ls)}
   const v=1+S/W;m2.set(key,v);return v};
  return rec(st,L)}
 const xmemo=new Map();
 function isUseless(st,L,t,ctx){const wn=warnNb(t,ctx),c0=outcome(L[0],t,ctx,wn);if(c0>=2)return false;for(let i=1;i<L.length;i++)if(outcome(L[i],t,ctx,wn)!==c0)return false;return true}
 function exactValue(st,L){const left=giftsLeft(st);if(left<=0||!L.length)return 0;if(L.length===1)return left;
  const key=hashKey(st,L),h=xmemo.get(key);if(h!==undefined)return h;
  const ctx=ctxOf(st),s=surePick(st,L,ctx);let best;
  if(s>=0)best=costAfter(st,L,s,exactValue);
  else{best=baseCost(st,L);
   const ts=candidates(st).filter(t=>!isUseless(st,L,t,ctx));
   const gp=new Map();for(const t of ts){const bt=t<32?bitLo(t):bitHi(t);let w=0;for(const k of L)if(((t<32?T_LO[k]:T_HI[k])&bt)!==0)w+=TW[k];gp.set(t,w)}
   ts.sort((a,b)=>gp.get(b)-gp.get(a));
   for(const t of ts){const gs=split(st,L,t,ctx).sort((a,b)=>b.w-a.w);let W=0;for(const g of gs)W+=g.w;
    let lb=0;for(const g of gs)lb+=g.w*(left-(g.code>=2?1:0));let S=0,pr=false;
    for(const g of gs){lb-=g.w*(left-(g.code>=2?1:0));S+=g.w*exactValue(child(st,t,g.code,ctx),g.ls);if(1+(S+lb)/W>=best-1e-12){pr=true;break}}
    if(!pr)best=1+S/W}}
  if(xmemo.size>2000000)xmemo.clear();xmemo.set(key,best);return best}
 /* 칸 t를 누른 뒤 최적으로 진행할 때의 값 */
 const qExact=(st,L,t)=>costAfter(st,L,t,exactValue);
 return{decide,baseExact,memo,exactValue,qExact,baseCost:(st,L)=>baseCost(st,L)}}
module.exports={makeEngine,spf,sdf,SCORES,NB,T,N,ctxOf,warnNb,outcome,applyStates,hashKey};
