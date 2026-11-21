// node fitmodel.js [기록 파일, 기본 records.txt] [--write] [--cv [K]]
// 판 기록(한 줄에 "x : 2-4 4-6 y : 3-2 3-3 5-8")으로 당첨 모델을 맞춤:
//   P(당첨 세 칸 a,b,c | ✕) ∝ w[a]·w[b]·w[c] · s[d(a,b)]·s[d(a,c)]·s[d(b,c)] · (세 칸이 한쪽이면 q)
//   w = 칸별 가중치(exp(u)), s[d] = 두 당첨 칸 사이 거리 d(1~3)의 간격 계수(4 이상은 1)
//   q = 좌우 한쪽 계수: 세 칸이 세로 중앙선(가운데 칸 x=4) 기준으로 왼쪽(x<4)과 오른쪽(x>4)에 나뉘지 않을 때 곱하는 값
//   z = 세 구역 계수: 세 칸이 세로 세 구역(x ≤ 2.5 / 3~5 / ≥ 5.5)에 한 칸씩 있을 때 곱하는 값
//   s4, s5 = 두 당첨 칸 사이 거리 4·5의 간격 계수(6 이상은 1). 393판 대칭 학습 5겹 교차검증 +0.013 nats/판, 최근 58·28판 시험도 모두 나음
//   → prior.js의 PRIOR_SP = [s1, s2, s3, q, z, s4, s5]
// 이전 판 기억: 앞에서 나온 당첨 세 칸(PRIOR_SEEN, 트리플 번호)에 κ × (전체 배치 평균 가중치)를 더함 → PRIOR_MEM = κ
//   κ는 시간 순 우도(각 판은 그 앞의 판들만 기억)로 맞춤. 판 목록이 정해져 있다는 가설(같은 당첨 세 칸 반복이 무작위의 2.5배).
// u에는 0쪽으로 당기는 벌점(LAM)을 둠. 300판 3겹 교차검증에서 LAM 3이 가장 좋았음(10과 거의 같고 30은 나쁨).
// --write: js/prior.js의 PRIOR_CNT / PRIOR_EXPO / PRIOR_U / PRIOR_SP / PRIOR_SEEN / PRIOR_MEM 줄을 새 값으로 바꿈
// --nosym: 대칭 늘리기 끄기(아래 설명)
// --cv [K]: K겹 교차검증(기본 3, 판 번호 % K로 나눔). 처음 보는 판의 당첨 세 칸 로그우도를 모델별로 비교
const fs=require('fs'),path=require('path');
const LAM=3,ITER=3000,TOL=1e-9;
const R=[8,9,8,9,8],ST=[0,8,17,25,34],C=[];R.forEach((n,r)=>{for(let c=0;c<n;c++)C.push({r,x:r%2?c:c+.5})});
const NB=C.map((a,i)=>C.map((_,j)=>j).filter(j=>{const b=C[j],dr=Math.abs(a.r-b.r),dx=Math.abs(a.x-b.x);return j!=i&&((dr==0&&dx==1)||(dr==1&&dx==.5))}));
const D=NB.map((_,s)=>{const d=Array(42).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NB[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
const T=[];for(let a=0;a<42;a++)for(let b=a+1;b<42;b++)for(let c=b+1;c<42;c++)T.push([a,b,c]);
// 특징 5개: 거리 1·2·3인 쌍의 수, 좌우 한쪽(나뉘지 않음)이면 1, 세 구역에 한 칸씩이면 1
const NF=7,oneSide=t=>!(t.some(i=>C[i].x<4)&&t.some(i=>C[i].x>4));
const ZONE=C.map(c=>c.x<=2.5?0:c.x<5.5?1:2),zone3=t=>new Set(t.map(i=>ZONE[i])).size===3;
const NT=T.length,TF=new Int8Array(NT*NF);T.forEach((t,k)=>{const[a,b,c]=t;for(const d of[D[a][b],D[a][c],D[b][c]]){if(d<=3)TF[k*NF+d-1]++;else if(d<=5)TF[k*NF+d+1]++}TF[k*NF+3]=oneSide(t)?1:0;TF[k*NF+4]=zone3(t)?1:0});
const idx=s=>{const[r,c]=s.split('-').map(Number);if(!(r>=1&&r<=5&&c>=1&&c<=R[r-1]))throw new Error('칸 '+s);return ST[r-1]+c-1};
const args=process.argv.slice(2);
const file=args[0]&&!args[0].startsWith('--')?args[0]:path.join(__dirname,'records.txt');
const G=fs.readFileSync(file,'utf8').split('\n').map(l=>l.trim()).filter(Boolean).map((l,n)=>{
 const m=l.match(/x\s*:\s*(\S+)\s+(\S+)\s+y\s*:\s*(\S+)\s+(\S+)\s+(\S+)/);if(!m)throw new Error((n+1)+'번째 줄 형식: '+l);
 const xs=[idx(m[1]),idx(m[2])],ys=[idx(m[3]),idx(m[4]),idx(m[5])].sort((a,b)=>a-b);
 if(xs[0]+xs[1]!==41)throw new Error((n+1)+'번째 줄: ✕ 두 칸이 점대칭이 아님');if(new Set(ys).size<3||ys.some(y=>xs.includes(y)))throw new Error((n+1)+'번째 줄: 당첨 칸 이상');
 return{L:Int32Array.from(T.map((t,k)=>k).filter(k=>!T[k].some(i=>xs.includes(i)))),y:T.findIndex(t=>t[0]==ys[0]&&t[1]==ys[1]&&t[2]==ys[2]),xs,ys}});
// 대칭 늘리기(기본 켜짐, --nosym으로 끔): 판마다 위아래·좌우·점대칭으로 뒤집은 판 3개를 더해 칸 가중치·계수(u, SP)를 맞춤.
//   391판 기준 5겹 교차검증 +0.052 nats/판, 최근 58판·28판 시험에서도 모두 나음(늘리지 않은 원자료가 가장 나빴음). 기억(κ, PRIOR_SEEN)은 원래 판으로만
const mkG=(xs,ys)=>{ys=ys.slice().sort((a,b)=>a-b);return{L:Int32Array.from(T.map((t,k)=>k).filter(k=>!T[k].some(i=>xs.includes(i)))),y:T.findIndex(t=>t[0]==ys[0]&&t[1]==ys[1]&&t[2]==ys[2]),xs,ys}};
const cellAt=(r,x)=>C.findIndex(c=>c.r===r&&c.x===x),FL=[i=>cellAt(4-C[i].r,C[i].x),i=>cellAt(C[i].r,8-C[i].x)];FL.push(i=>FL[0](FL[1](i)));
const SYM=!args.includes('--nosym'),GF=SYM?G.concat(...FL.map(f=>G.map(g=>mkG(g.xs.map(f),g.ys.map(f))))):G;
// on = 쓰는 특징(0/1 4개). 꺼진 특징의 계수는 0(곱하는 값 1)으로 고정
function pass(G,u,lt,on){let s=0;const gu=new Float64Array(42),gt=new Float64Array(NF);
 for(const{L,y}of G){let Z=0;const eu=new Float64Array(42),et=new Float64Array(NF);
  for(let i=0;i<L.length;i++){const k=L[i],[a,b,c]=T[k],o=k*NF;let e=u[a]+u[b]+u[c];for(let j=0;j<NF;j++)e+=TF[o+j]*lt[j];
   const w=Math.exp(e);Z+=w;eu[a]+=w;eu[b]+=w;eu[c]+=w;for(let j=0;j<NF;j++)et[j]+=w*TF[o+j]}
  const[a,b,c]=T[y];let e=u[a]+u[b]+u[c];for(let j=0;j<NF;j++)e+=TF[y*NF+j]*lt[j];s+=e-Math.log(Z);
  gu[a]++;gu[b]++;gu[c]++;for(let i=0;i<42;i++)gu[i]-=eu[i]/Z;for(let j=0;j<NF;j++)gt[j]+=TF[y*NF+j]-et[j]/Z}
 for(let j=0;j<NF;j++)if(!on[j])gt[j]=0;
 let pen=0;for(let i=0;i<42;i++){pen+=u[i]*u[i];gu[i]-=LAM*u[i]}
 return{s:s-LAM*pen/2,ll:s,gu,gt}}
// 경사 상승(되돌림 있는 보폭 조절)
function fit(G,on){let u=new Float64Array(42),lt=new Float64Array(NF),cur=pass(G,u,lt,on),step=4/G.length,it=0;
 for(;it<ITER;it++){const u2=u.map((v,i)=>v+step*cur.gu[i]),l2=lt.map((v,j)=>v+step*cur.gt[j]),nx=pass(G,u2,l2,on);
  if(nx.s>=cur.s){const d=nx.s-cur.s;u=u2;lt=l2;cur=nx;step*=1.2;if(d<TOL)break}else step/=2}
 return{u,lt,it,obj:cur.s}}
// 모델이 보는 "세 칸이 좌우로 나뉘는" 확률의 판 평균
function splitRate(G,u,lt){let s=0;for(const{L}of G){let Z=0,Zs=0;for(let i=0;i<L.length;i++){const k=L[i],[a,b,c]=T[k];let e=u[a]+u[b]+u[c];for(let j=0;j<NF;j++)e+=TF[k*NF+j]*lt[j];const w=Math.exp(e);Z+=w;if(!TF[k*NF+3])Zs+=w}s+=Zs/Z}return s/G.length}
// 이전 판 기억: 판 i의 기억 = 그 앞 판들의 당첨 세 칸(중복 제거). 가중치 = 기본 가중치 + κ·M (M = 전체 배치 평균 기본 가중치)
const baseW=(u,lt)=>{const w=new Float64Array(NT);for(let k=0;k<NT;k++){const[a,b,c]=T[k];let e=u[a]+u[b]+u[c];for(let j=0;j<NF;j++)e+=TF[k*NF+j]*lt[j];w[k]=Math.exp(e)}return w};
const PREV=G.map((_,i)=>[...new Set(G.slice(0,i).map(g=>g.y))]);
const _bw=new Map();function memLL(g,i,u,lt,kp){let w=_bw.get(u);if(!w){w=baseW(u,lt);_bw.set(u,w)}let M=0;for(let k=0;k<NT;k++)M+=w[k];M/=NT;
 let Z=0;for(let j=0;j<g.L.length;j++)Z+=w[g.L[j]];const xs=g.xs,seen=PREV[i].filter(k=>!T[k].some(c=>xs.includes(c)));
 return Math.log(w[g.y]+(seen.includes(g.y)?kp*M:0))-Math.log(Z+kp*M*seen.length)}
function fitKappa(u,lt){let best=0,bv=-Infinity;for(let e=-3;e<=4.01;e+=0.05){const kp=Math.pow(2,e);let s=0;G.forEach((g,i)=>{s+=memLL(g,i,u,lt,kp)});if(s>bv){bv=s;best=kp}}
 let s0=0;G.forEach((g,i)=>{s0+=memLL(g,i,u,lt,0)});return{kappa:+best.toFixed(4),gain:+(bv-s0).toFixed(2)}}
const realSplit=G.filter(g=>!TF[g.y*NF+3]).length/G.length;
const MODELS={'균등':[0,0,0,0,0],'칸만':null,'칸+간격':[1,1,1,0,0],'칸+간격+좌우':[1,1,1,1,0],'+세구역':[1,1,1,1,1,0,0],'+거리4·5':[1,1,1,1,1,1,1]};
if(args.includes('--cv')){const K=+args[args.indexOf('--cv')+1]||3;
 console.log(`${G.length}판 ${K}겹 교차검증 — 처음 보는 판의 로그우도 합(클수록 좋음), 균등 대비 nats / 좌우 나뉨 확률(실제 ${(realSplit*100).toFixed(1)}%)`);
 const res={};for(const[name,on]of Object.entries(MODELS)){let ll=0;
  for(let f=0;f<K;f++){const tr=G.filter((_,i)=>i%K!==f),te=G.filter((_,i)=>i%K===f);
   if(name==='균등'){ll+=pass(te,new Float64Array(42),new Float64Array(NF),on).ll;continue}
   const m=fit(tr,on||[0,0,0,0,0]);ll+=pass(te,m.u,m.lt,on||[0,0,0,0,0]).ll}
  res[name]=ll;const m=name==='균등'?{u:new Float64Array(42),lt:new Float64Array(NF)}:fit(G,on||[0,0,0,0,0]);
  console.log(`  ${name.padEnd(8)} ${(ll-res['균등']).toFixed(2).padStart(8)} nats   좌우 나뉨 ${(splitRate(G,m.u,m.lt)*100).toFixed(1)}%`+(on&&on[3]?`   q=${Math.exp(m.lt[3]).toFixed(4)}`:'')+(on&&on[4]?`   z=${Math.exp(m.lt[4]).toFixed(4)}`:''))}
 // 기억 계수: 접기마다 학습 판으로 u·계수를 맞추고, 시험 판은 "그 판보다 앞선 모든 판"을 기억으로 씀
 for(const kp of[0.5,1,2,4,8]){let d=0;for(let f=0;f<K;f++){const tr=G.filter((_,i)=>i%K!==f),m=fit(tr,[1,1,1,1,1,1,1]);G.forEach((g,i)=>{if(i%K===f)d+=memLL(g,i,m.u,m.lt,kp)-memLL(g,i,m.u,m.lt,0)})}
  console.log(`  +기억 κ=${kp}`.padEnd(12)+` ${(d+res['+거리4·5']-res['균등']).toFixed(2).padStart(8)} nats  (거리4·5 대비 ${d>=0?'+':''}${d.toFixed(2)})`)}
 process.exit(0)}
const m=fit(GF,[1,1,1,1,1,1,1]);
const U=Array.from(m.u,v=>+v.toFixed(5)),SP=Array.from(m.lt,v=>+Math.exp(v).toFixed(5));
const MK=fitKappa(m.u,m.lt),SEEN=[...new Set(G.map(g=>g.y))].sort((a,b)=>a-b);
const cnt=Array(42).fill(0),ex=Array(42).fill(0);for(const{xs,ys}of G){for(let i=0;i<42;i++)if(!xs.includes(i))ex[i]++;for(const y of ys)cnt[y]++}
console.log(JSON.stringify({games:G.length,sym:SYM,iter:m.it,obj:+m.obj.toFixed(4),mem:{kappa:MK.kappa,gainNats:MK.gain,seen:SEEN.length},split:{real:+realSplit.toFixed(4),model:+splitRate(G,m.u,m.lt).toFixed(4)},SP,U}));
if(args.includes('--write')){const pf=path.join(__dirname,'../../js/prior.js');let s=fs.readFileSync(pf,'utf8');
 const rep=(name,val)=>{const re=new RegExp('const '+name+'=\\[[^\\]]*\\];');if(!re.test(s))throw new Error('prior.js: '+name);s=s.replace(re,'const '+name+'='+JSON.stringify(val)+';')};
 rep('PRIOR_CNT',cnt);rep('PRIOR_EXPO',ex);rep('PRIOR_U',U);rep('PRIOR_SP',SP);rep('PRIOR_SEEN',SEEN);
 s=s.replace(/const PRIOR_MEM=[^;]*;/,()=>'const PRIOR_MEM='+MK.kappa+';');if(!/const PRIOR_MEM=/.test(s))throw new Error('prior.js: PRIOR_MEM');
 s=s.replace(/\(현재 \d+판\)/,'(현재 '+G.length+'판)');fs.writeFileSync(pf,s);console.log('prior.js 갱신: '+G.length+'판')}
