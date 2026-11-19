// node fitmodel.js [기록 파일, 기본 records.txt] [--write]
// 판 기록(한 줄에 "x : 2-4 4-6 y : 3-2 3-3 5-8")으로 당첨 모델을 맞춤:
//   P(당첨 세 칸 a,b,c | ✕) ∝ w[a]·w[b]·w[c] · s[d(a,b)]·s[d(a,c)]·s[d(b,c)]
//   w = 칸별 가중치(exp(u)), s[d] = 두 당첨 칸 사이 거리 d(1~3)의 간격 계수(4 이상은 1)
// u에는 0쪽으로 당기는 벌점(LAM)을 둠. 300판 3겹 교차검증에서 LAM 3이 가장 좋았음(10과 거의 같고 30은 나쁨).
// --write: js/prior.js의 PRIOR_CNT / PRIOR_EXPO / PRIOR_U / PRIOR_SP 줄을 새 값으로 바꿈
const fs=require('fs'),path=require('path');
const LAM=3,ITER=3000,TOL=1e-9;
const R=[8,9,8,9,8],ST=[0,8,17,25,34],C=[];R.forEach((n,r)=>{for(let c=0;c<n;c++)C.push({r,x:r%2?c:c+.5})});
const NB=C.map((a,i)=>C.map((_,j)=>j).filter(j=>{const b=C[j],dr=Math.abs(a.r-b.r),dx=Math.abs(a.x-b.x);return j!=i&&((dr==0&&dx==1)||(dr==1&&dx==.5))}));
const D=NB.map((_,s)=>{const d=Array(42).fill(99);d[s]=0;const q=[s];while(q.length){const u=q.shift();for(const v of NB[u])if(d[v]>d[u]+1){d[v]=d[u]+1;q.push(v)}}return d});
const T=[];for(let a=0;a<42;a++)for(let b=a+1;b<42;b++)for(let c=b+1;c<42;c++)T.push([a,b,c]);
const NT=T.length,TF=new Int8Array(NT*3);T.forEach(([a,b,c],k)=>{for(const d of[D[a][b],D[a][c],D[b][c]])if(d<=3)TF[k*3+d-1]++});
const idx=s=>{const[r,c]=s.split('-').map(Number);if(!(r>=1&&r<=5&&c>=1&&c<=R[r-1]))throw new Error('칸 '+s);return ST[r-1]+c-1};
const file=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:path.join(__dirname,'records.txt');
const G=fs.readFileSync(file,'utf8').split('\n').map(l=>l.trim()).filter(Boolean).map((l,n)=>{
 const m=l.match(/x\s*:\s*(\S+)\s+(\S+)\s+y\s*:\s*(\S+)\s+(\S+)\s+(\S+)/);if(!m)throw new Error((n+1)+'번째 줄 형식: '+l);
 const xs=[idx(m[1]),idx(m[2])],ys=[idx(m[3]),idx(m[4]),idx(m[5])].sort((a,b)=>a-b);
 if(xs[0]+xs[1]!==41)throw new Error((n+1)+'번째 줄: ✕ 두 칸이 점대칭이 아님');if(new Set(ys).size<3||ys.some(y=>xs.includes(y)))throw new Error((n+1)+'번째 줄: 당첨 칸 이상');
 return{L:Int32Array.from(T.map((t,k)=>k).filter(k=>!T[k].some(i=>xs.includes(i)))),y:T.findIndex(t=>t[0]==ys[0]&&t[1]==ys[1]&&t[2]==ys[2]),xs,ys}});
const n=G.length;
function pass(u,lt){let s=0;const gu=new Float64Array(42),gt=new Float64Array(3);
 for(const{L,y}of G){let Z=0;const eu=new Float64Array(42),et=[0,0,0];
  for(let i=0;i<L.length;i++){const k=L[i],[a,b,c]=T[k],f0=TF[k*3],f1=TF[k*3+1],f2=TF[k*3+2];
   const w=Math.exp(u[a]+u[b]+u[c]+f0*lt[0]+f1*lt[1]+f2*lt[2]);Z+=w;eu[a]+=w;eu[b]+=w;eu[c]+=w;et[0]+=w*f0;et[1]+=w*f1;et[2]+=w*f2}
  const[a,b,c]=T[y];s+=u[a]+u[b]+u[c]+TF[y*3]*lt[0]+TF[y*3+1]*lt[1]+TF[y*3+2]*lt[2]-Math.log(Z);
  gu[a]++;gu[b]++;gu[c]++;for(let i=0;i<42;i++)gu[i]-=eu[i]/Z;for(let j=0;j<3;j++)gt[j]+=TF[y*3+j]-et[j]/Z}
 let pen=0;for(let i=0;i<42;i++){pen+=u[i]*u[i];gu[i]-=LAM*u[i]}
 return{s:s-LAM*pen/2,gu,gt}}
// 경사 상승(되돌림 있는 보폭 조절)
let u=new Float64Array(42),lt=new Float64Array(3),cur=pass(u,lt),step=4/n,it=0;
for(;it<ITER;it++){const u2=u.map((v,i)=>v+step*cur.gu[i]),l2=lt.map((v,j)=>v+step*cur.gt[j]),nx=pass(u2,l2);
 if(nx.s>=cur.s){const d=nx.s-cur.s;u=u2;lt=l2;cur=nx;step*=1.2;if(d<TOL)break}else step/=2}
const U=Array.from(u,v=>+v.toFixed(5)),SP=Array.from(lt,v=>+Math.exp(v).toFixed(5));
const cnt=Array(42).fill(0),ex=Array(42).fill(0);for(const{xs,ys}of G){for(let i=0;i<42;i++)if(!xs.includes(i))ex[i]++;for(const y of ys)cnt[y]++}
console.log(JSON.stringify({games:n,iter:it,obj:+cur.s.toFixed(4),SP,U}));
if(process.argv.includes('--write')){const pf=path.join(__dirname,'../../js/prior.js');let s=fs.readFileSync(pf,'utf8');
 const rep=(name,val)=>{const re=new RegExp('const '+name+'=\\[[^\\]]*\\];');if(!re.test(s))throw new Error('prior.js: '+name);s=s.replace(re,'const '+name+'='+JSON.stringify(val)+';')};
 rep('PRIOR_CNT',cnt);rep('PRIOR_EXPO',ex);rep('PRIOR_U',U);rep('PRIOR_SP',SP);
 s=s.replace(/\(현재 \d+판\)/,'(현재 '+n+'판)');fs.writeFileSync(pf,s);console.log('prior.js 갱신: '+n+'판')}
