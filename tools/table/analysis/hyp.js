// 가설 검사: node hyp.js [records.txt, 기본 ../records.txt]
// 기준 모델(현재 모델) = 칸 가중치 u(LAM 3) + 간격 1·2·3 + 좌우 한쪽  (fitmodel.js와 같은 식)
// 가설 특징을 하나씩 더해 3겹 교차검증(판 번호 % 3) 로그우도 개선(nats)을 잼. ✕ 쌍이 같은 판은 분포가 같으므로 쌍별로 묶어 계산
const fs=require('fs');
const LAM=3,ITER=4000,TOL=1e-10;
const RW=[8,9,8,9,8],ST=[0,8,17,25,34],C=[];RW.forEach((n,r)=>{for(let c=0;c<n;c++)C.push({r,x:r%2?c:c+.5})});
const NB=C.map((a,i)=>C.map((_,j)=>j).filter(j=>{const b=C[j],dr=Math.abs(a.r-b.r),dx=Math.abs(a.x-b.x);return j!=i&&((dr==0&&dx==1)||(dr==1&&dx==.5))}));
const D=NB.map((_,s)=>{const d=Array(42).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NB[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
const T=[];for(let a=0;a<42;a++)for(let b=a+1;b<42;b++)for(let c=b+1;c<42;c++)T.push([a,b,c]);const NT=T.length;
const TK=new Map(T.map((t,k)=>[t.join(','),k]));
const idx=s=>{const[r,c]=s.split('-').map(Number);return ST[r-1]+c-1};
const PAIRS=[9,10,11,12,13,15,18,19,20];
const REC=process.argv[2]&&!process.argv[2].startsWith('-')?process.argv[2]:require('path').join(__dirname,'../records.txt');
const G=fs.readFileSync(REC,'utf8').split('\n').map(l=>l.trim()).filter(Boolean).map((l,n)=>{const m=l.match(/x\s*:\s*(\S+)\s+(\S+)\s+y\s*:\s*(\S+)\s+(\S+)\s+(\S+)/);
 const xs=[idx(m[1]),idx(m[2])].sort((a,b)=>a-b),ys=[idx(m[3]),idx(m[4]),idx(m[5])].sort((a,b)=>a-b);return{n,xs,ys,p:PAIRS.indexOf(xs[0]),y:TK.get(ys.join(',')),line:l}});
const N=G.length;
// 쌍별 후보 배치
const LP=PAIRS.map(x=>Int32Array.from(T.map((t,k)=>k).filter(k=>!T[k].includes(x)&&!T[k].includes(41-x))));
const POS=LP.map(L=>{const m=new Int32Array(NT).fill(-1);L.forEach((k,i)=>m[k]=i);return m});
// ── 특징 정의: f(t, x쌍 앞 칸) ──
const side=i=>C[i].x<4?-1:C[i].x>4?1:0,vert=i=>C[i].r<2?-1:C[i].r>2?1:0,zone=i=>C[i].x<8/3?0:C[i].x>16/3?2:1;
const quad=i=>side(i)&&vert(i)?(side(i)+1)+(vert(i)+1)/2:-1; // 0..3, 선 위 칸은 -1
const nL=t=>t.filter(i=>side(i)<0).length,nR=t=>t.filter(i=>side(i)>0).length;
const pairs3=t=>[[t[0],t[1]],[t[0],t[2]],[t[1],t[2]]];
const F={
 d1:t=>pairs3(t).filter(([a,b])=>D[a][b]==1).length,
 d2:t=>pairs3(t).filter(([a,b])=>D[a][b]==2).length,
 d3:t=>pairs3(t).filter(([a,b])=>D[a][b]==3).length,
 side1:t=>(nL(t)&&nR(t))?0:1,                                          // 좌우 한쪽(현재 모델)
 tb1:t=>(t.some(i=>vert(i)<0)&&t.some(i=>vert(i)>0))?0:1,              // 위(1~2행)/아래(4~5행) 한쪽
 quad1:t=>{const q=t.map(quad);return q[0]>=0&&q[0]==q[1]&&q[1]==q[2]?1:0}, // 세 칸이 같은 4분면
 quad3:t=>{const q=new Set(t.map(quad).filter(v=>v>=0));return q.size==3?1:0}, // 서로 다른 4분면 세 곳
 zone1:t=>new Set(t.map(zone)).size==1?1:0,                             // 세로 세 구역 중 한 곳에 몰림
 zone3:t=>new Set(t.map(zone)).size==3?1:0,                             // 세 구역에 하나씩
 row1:t=>new Set(t.map(i=>C[i].r)).size<3?1:0,                           // 같은 행에 두 칸 이상
 mirror:t=>pairs3(t).filter(([a,b])=>a+b==41).length,                    // 점대칭 위치 두 칸
 lrsym:t=>pairs3(t).filter(([a,b])=>C[a].r==C[b].r&&C[a].x+C[b].x==8).length, // 좌우 거울 위치 두 칸
 nearx:(t,x)=>t.filter(i=>D[i][x]==1||D[i][41-x]==1).length,             // ✕ 바로 옆 당첨 칸 수
 sideBal:t=>Math.abs(nL(t)-nR(t))==3?0:Math.abs(nL(t)-nR(t)),            // (참고) 좌우 개수 차이
};
const BASE=['d1','d2','d3','side1'];
// 특징 표 계산 (쌍별)
function table(names,offset){return PAIRS.map((x,p)=>{const L=LP[p],nf=names.length,M=new Float64Array(L.length*nf),O=offset?new Float64Array(L.length):null;
 for(let i=0;i<L.length;i++){const t=T[L[i]];names.forEach((f,j)=>M[i*nf+j]=F[f](t,x));if(O)O[i]=offset(t,x)}return{M,O}})}
// 적합: m = {names, pairU(LAM2 또는 0), offset}
function fit(games,m,TB){const nf=m.names.length,np=PAIRS.length,P=m.pairU?1:0;
 const cnt=new Float64Array(np),obsU=new Float64Array(42),obsF=new Float64Array(nf),obsV=PAIRS.map(()=>new Float64Array(42));let obsO=0;
 for(const g of games){cnt[g.p]++;const pos=POS[g.p][g.y];for(const i of T[g.y]){obsU[i]++;obsV[g.p][i]++}for(let j=0;j<nf;j++)obsF[j]+=TB[g.p].M[pos*nf+j];if(TB[g.p].O)obsO+=TB[g.p].O[pos]}
 function pass(u,th,v){let ll=0;const gu=new Float64Array(42),gt=new Float64Array(nf),gv=PAIRS.map(()=>new Float64Array(42));
  for(let i=0;i<42;i++)ll+=obsU[i]*u[i];for(let j=0;j<nf;j++)ll+=obsF[j]*th[j];ll+=obsO;
  for(let p=0;p<np;p++){if(!cnt[p])continue;const L=LP[p],M=TB[p].M,O=TB[p].O,vp=v[p];let Z=0;const eu=new Float64Array(42),ef=new Float64Array(nf);
   if(P)for(let i=0;i<42;i++)ll+=obsV[p][i]*vp[i];
   for(let q=0;q<L.length;q++){const[a,b,c]=T[L[q]];let e=u[a]+u[b]+u[c];if(P)e+=vp[a]+vp[b]+vp[c];for(let j=0;j<nf;j++)e+=M[q*nf+j]*th[j];if(O)e+=O[q];
    if(e===-Infinity)continue;const w=Math.exp(e);Z+=w;eu[a]+=w;eu[b]+=w;eu[c]+=w;for(let j=0;j<nf;j++)ef[j]+=w*M[q*nf+j]}
   ll-=cnt[p]*Math.log(Z);for(let i=0;i<42;i++){gu[i]-=cnt[p]*eu[i]/Z;if(P)gv[p][i]=obsV[p][i]-cnt[p]*eu[i]/Z-m.pairU*vp[i]}for(let j=0;j<nf;j++)gt[j]-=cnt[p]*ef[j]/Z}
  for(let i=0;i<42;i++)gu[i]+=obsU[i];for(let j=0;j<nf;j++)gt[j]+=obsF[j];
  let pen=0;for(let i=0;i<42;i++){pen+=u[i]*u[i];gu[i]-=LAM*u[i]}if(P)for(const vp of v)for(let i=0;i<42;i++)pen+=m.pairU/LAM*vp[i]*vp[i];
  return{s:ll-LAM*pen/2,ll,gu,gt,gv}}
 let u=new Float64Array(42),th=new Float64Array(nf),v=PAIRS.map(()=>new Float64Array(42)),cur=pass(u,th,v),step=1/games.length,it=0;
 for(;it<ITER;it++){const u2=u.map((x,i)=>x+step*cur.gu[i]),t2=th.map((x,j)=>x+step*cur.gt[j]),v2=P?v.map((vp,p)=>vp.map((x,i)=>x+step*cur.gv[p][i])):v,nx=pass(u2,t2,v2);
  if(nx.s>=cur.s&&isFinite(nx.s)){const d=nx.s-cur.s;u=u2;th=t2;v=v2;cur=nx;step*=1.2;if(d<TOL)break}else step/=2;if(step<1e-14)break}
 return{u,th,v,it,obj:cur.s}}
// 판 묶음의 로그우도(벌점 없이)
function ll(games,par,m,TB){const nf=m.names.length;let s=0;const Z=PAIRS.map((_,p)=>{const L=LP[p],M=TB[p].M,O=TB[p].O;let z=0;for(let q=0;q<L.length;q++){const[a,b,c]=T[L[q]];let e=par.u[a]+par.u[b]+par.u[c];if(m.pairU)e+=par.v[p][a]+par.v[p][b]+par.v[p][c];for(let j=0;j<nf;j++)e+=M[q*nf+j]*par.th[j];if(O)e+=O[q];if(e>-Infinity)z+=Math.exp(e)}return z});
 for(const g of games){const p=g.p,q=POS[p][g.y],[a,b,c]=T[g.y],M=TB[p].M;let e=par.u[a]+par.u[b]+par.u[c];if(m.pairU)e+=par.v[p][a]+par.v[p][b]+par.v[p][c];for(let j=0;j<nf;j++)e+=M[q*nf+j]*par.th[j];if(TB[p].O)e+=TB[p].O[q];s+=e-Math.log(Z[p])}return s}
function cv(m,K=3){const TB=table(m.names,m.offset);let s=0;for(let f=0;f<K;f++){const tr=G.filter(g=>g.n%K!==f),te=G.filter(g=>g.n%K===f);s+=ll(te,fit(tr,m,TB),m,TB)}return s}
// 통계 f의 판 평균: 실제 / 무작위 / 모델
function expect(fn,par,m,TB){let er=0,em=0;for(const g of G){const p=g.p,L=LP[p],x=PAIRS[p],nf=m.names.length,M=TB[p].M;let Z=0,S=0,Su=0;
 for(let q=0;q<L.length;q++){const t=T[L[q]],[a,b,c]=t;let e=par.u[a]+par.u[b]+par.u[c];for(let j=0;j<nf;j++)e+=M[q*nf+j]*par.th[j];const w=Math.exp(e),f=fn(t,x);Z+=w;S+=w*f;Su+=f}
 er+=Su/L.length;em+=S/Z}return[G.reduce((s,g)=>s+fn(T[g.y],PAIRS[g.p]),0)/N,er/N,em/N]}
module.exports={G,N,T,TK,LP,POS,PAIRS,F,BASE,C,D,fit,cv,ll,table,expect,side,nL,nR};
if(require.main===module){
 const out={};const t0=Date.now();
 const baseM={names:BASE},cvBase=cv(baseM);const TB=table(BASE),par=fit(G,baseM,TB);
 out.base={cv:cvBase,SP:Array.from(par.th,Math.exp)};
 out.uniformCV=cv({names:[]}); // 칸만(참고)
 out.feats={};
 for(const f of['tb1','quad1','quad3','zone1','zone3','row1','mirror','lrsym','nearx']){const m={names:[...BASE,f]},c=cv(m);const p2=fit(G,m,table(m.names));
  out.feats[f]={stat:expect(F[f],par,baseM,TB),cvGain:c-cvBase,coef:Math.exp(p2.th[4])};console.error(f,(c-cvBase).toFixed(2),((Date.now()-t0)/1000|0)+'s')}
 out.side={stat:expect(F.side1,par,baseM,TB)};
 out.sideNoSide={cvWithout:cv({names:['d1','d2','d3']})-cvBase};
 // c. 쌍별 칸 가중치
 out.pairU={};for(const L2 of[3,10,30]){out.pairU[L2]=cv({names:BASE,pairU:L2})-cvBase;console.error('pairU',L2,out.pairU[L2].toFixed(2))}
 // d. 절차형: 좌1+우1+아무 데나 → 배치 가중치 × nL·nR (한쪽 몰림은 좌우 계수로 남김)
 out.proc={};
 out.proc.lr=cv({names:BASE,offset:t=>{const k=nL(t)*nR(t);return k?Math.log(k):0}})-cvBase;
 out.proc.lrFeat=(()=>{F.lognlr=t=>{const k=nL(t)*nR(t);return k?Math.log(k):0};return cv({names:[...BASE,'lognlr']})-cvBase})();
 // 붙으면 다시 뽑기(간격 1 금지): 실제로 붙은 판 수
 out.proc.adjGames=G.filter(g=>F.d1(T[g.y])>0).length;
 out.proc.adjStat=expect(t=>F.d1(t)>0?1:0,par,baseM,TB);
 console.log(JSON.stringify(out,null,1));console.error('done',(Date.now()-t0)/1000|0,'s')}
