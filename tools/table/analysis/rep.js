// 1a·1e 보충: 패턴 반복 구조 — node rep.js [records.txt]  (NAMES=d1,d2,d3,side1,zone3 처럼 기준 모델 특징을 바꿀 수 있음, 기본 = 현재 모델)
//  - 시간 순서로 "이전에 나온 당첨 3칸이 다시 나옴" 판 수
//  - 좌우 거울 / 점대칭으로 겹치는 판, 2칸만 겹치는 판: 실제 vs 모델 시뮬레이션
//  - 기억 혼합 모델: P = (1-λ)·모델 + λ·(학습 판들의 당첨 3칸, ✕와 맞는 것만 균등) 의 3겹 교차검증 개선
const H=require('./hyp.js');const{G,N,T,TK,LP,POS,PAIRS,BASE,C}=H;
const NM=process.env.NAMES?process.env.NAMES.split(','):BASE,m={names:NM},TB=H.table(NM),par=H.fit(G,m,TB);
const cellAt=new Map(C.map((c,i)=>[c.r+','+c.x,i]));const lrm=i=>cellAt.get(C[i].r+','+(8-C[i].x)),ptm=i=>41-i;
const keyOf=(t,f)=>TK.get(t.map(f).sort((a,b)=>a-b).join(','));
function stats(gs){let lr=0,pt=0,two=0,same=0;for(let i=0;i<gs.length;i++)for(let j=i+1;j<gs.length;j++){const a=gs[i].y,b=gs[j].y;if(a===b){same++;continue}
 if(keyOf(T[a],lrm)===b)lr++;if(keyOf(T[a],ptm)===b)pt++;const s=T[a].filter(v=>T[b].includes(v)).length;if(s===2)two++}return{same,lr,pt,two}}
const real=stats(G);
// 시간 순서 재등장
const seen=new Set(),seenXY=new Set();let rep=0,repXY=0;const repIdx=[];for(const g of G){if(seen.has(g.y)){rep++;repIdx.push(g.n+1)}if(seenXY.has(g.p+':'+g.y))repXY++;seen.add(g.y);seenXY.add(g.p+':'+g.y)}
// 모델 시뮬레이션
function cum(p){const L=LP[p],M=TB[p].M,c=new Float64Array(L.length);let s=0;for(let q=0;q<L.length;q++){const[a,b,cc]=T[L[q]];let e=par.u[a]+par.u[b]+par.u[cc];for(let j=0;j<NM.length;j++)e+=M[q*NM.length+j]*par.th[j];s+=Math.exp(e);c[q]=s}return c}
const CM=PAIRS.map((_,p)=>cum(p));let seed=777;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;const a=seed>>>8;seed=(Math.imul(seed,1103515245)+12345)>>>0;return(a*16777216+(seed>>>8))/2**48};
const pick=c=>{const u=rnd()*c[c.length-1];let lo=0,hi=c.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(c[mid]<u)lo=mid+1;else hi=mid}return lo};
const R=2000,acc={same:[],lr:[],pt:[],two:[],rep:[]};
for(let r=0;r<R;r++){const gs=G.map(g=>({p:g.p,y:LP[g.p][pick(CM[g.p])]}));const s=stats(gs);for(const k in s)acc[k].push(s[k]);const sn=new Set();let rp=0;for(const g of gs){if(sn.has(g.y))rp++;sn.add(g.y)}acc.rep.push(rp)}
const st=(a,v)=>{const mm=a.reduce((x,y)=>x+y)/a.length,sd=Math.sqrt(a.reduce((x,y)=>x+(y-mm)**2,0)/a.length);return{model:+mm.toFixed(2),sd:+sd.toFixed(2),pGE:+(a.filter(x=>x>=v).length/a.length).toFixed(4)}};
const sim=Object.fromEntries(Object.keys(acc).map(k=>[k,st(acc[k],k==='rep'?rep:real[k])]));
// 기억 혼합 모델 3겹 교차검증 (기준 = 같은 접기의 현재 모델)
function cvMix(lams,K=3){const out=Object.fromEntries(lams.map(l=>[l,0]));
 for(let f=0;f<K;f++){const tr=G.filter(g=>g.n%K!==f),te=G.filter(g=>g.n%K===f),pr=H.fit(tr,m,TB);
  const Z=PAIRS.map((_,p)=>{const L=LP[p],M=TB[p].M;let z=0;for(let q=0;q<L.length;q++){const[a,b,c]=T[L[q]];let e=pr.u[a]+pr.u[b]+pr.u[c];for(let j=0;j<NM.length;j++)e+=M[q*NM.length+j]*pr.th[j];z+=Math.exp(e)}return z});
  for(const g of te){const q=POS[g.p][g.y],[a,b,c]=T[g.y],M=TB[g.p].M;let e=pr.u[a]+pr.u[b]+pr.u[c];for(let j=0;j<NM.length;j++)e+=M[q*NM.length+j]*pr.th[j];const pm=Math.exp(e)/Z[g.p];
   const comp=tr.filter(h=>POS[g.p][h.y]>=0),hit=comp.filter(h=>h.y===g.y).length,pe=comp.length?hit/comp.length:0;
   for(const l of lams)out[l]+=Math.log((1-l)*pm+l*pe)-Math.log(pm)}}return out}
const mix=cvMix([0.02,0.05,0.1,0.15,0.2,0.3]);
console.log(JSON.stringify({real,repeatInTimeOrder:{y:rep,xy:repXY,games:repIdx},sim,mixCvGain:mix},null,1));
