// 개선 후보가 클릭에 주는 효과 (롤아웃 정책만, 표 없이)
//  A. 실제 기록 재생: 판마다 그 판이 빠진 접기(3겹)로 맞춘 모델의 롤아웃으로 실제 당첨 칸을 찾음 → 판별 클릭 짝 비교
//     base = 현재 모델 / zone = 현재 + 세 구역 / mem = 현재 + 이전 판 기억(λ) / zmem = 둘 다
//  B. 모델 기준 정확 평가: 정답 분포를 각 모델(303판 전체로 맞춤)로 놓고 base 롤아웃 vs 후보 롤아웃의 정확한 기대 클릭
// node rp.js [records.txt] [λ]  (λ 기본 0.05)
const H=require('./hyp.js'),E=require('./engx.js');const{G,N,T,LP,POS,PAIRS,BASE,F}=H;
const LAMM=+process.argv[3]||0.05,NT=T.length;
const ZN=[...BASE,'zone3'];
// 모델 → 배치 가중치 배열(쌍 무관 특징만 씀)
function twOf(names,games){const TB=H.table(names),par=H.fit(games,{names},TB);const tw=new Float64Array(NT);
 for(let k=0;k<NT;k++){const t=T[k];let e=par.u[t[0]]+par.u[t[1]]+par.u[t[2]];names.forEach((f,j)=>e+=F[f](t,PAIRS[0])*par.th[j]);tw[k]=Math.exp(e)}return tw}
// 기억 혼합: 쌍 p에서 (1-λ)·모델/Z + λ·(이전 판 중 ✕와 맞는 당첨 3칸의 빈도)
function mixTW(tw,prev,p){const L=LP[p];let Z=0;for(const k of L)Z+=tw[k];const comp=prev.filter(h=>POS[p][h.y]>=0);const out=new Float64Array(NT);
 for(const k of L)out[k]=(1-LAMM)*tw[k]/Z;if(comp.length)for(const h of comp)out[h.y]+=LAMM/comp.length;else for(const k of L)out[k]=tw[k]/Z;return out}
const gl=st=>3-st.filter(v=>v==='gift').length;
function split(st,L,t,TW){const ctx=E.ctxOf(st),wn=E.warnNb(t,ctx),bk=new Map();for(const k of L){const c=E.outcome(k,t,ctx,wn);let g=bk.get(c);if(!g)bk.set(c,g={c,ls:[],w:0});g.ls.push(k);g.w+=TW?TW[k]:0}
 return[...bk.values()].map(g=>{const s=st.slice();E.applyStates(s,t,g.c,wn);return{s,ls:g.ls,w:g.w}})}
function start(x){const st=new Array(42).fill('hidden');st[x]='x';st[41-x]='x';const L=[];E.T.forEach((t,q)=>{if(!t.includes(x)&&!t.includes(41-x))L.push(q)});return[st,L]}
function play(eng,g){let[st,L]=start(PAIRS[g.p]);let c=0;while(gl(st)>0&&L.length>1){const t=eng.decide(st,L);c++;const grp=split(st,L,t,null).find(q=>q.ls.includes(g.y));st=grp.s;L=grp.ls}return c+Math.max(0,gl(st))}
function exact(eng,TWtruth,x){const m=new Map();const f=(st,L)=>{if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);const k=E.hashKey(st,L);const h=m.get(k);if(h!==undefined)return h;
 const t=eng.decide(st,L);let W=0,S=0;for(const g of split(st,L,t,TWtruth)){if(!g.w)continue;W+=g.w;S+=g.w*f(g.s,g.ls)}const v=1+S/W;m.set(k,v);return v};return f(...start(x))}
const t0=Date.now(),R={base:[],zone:[],mem:[],zmem:[]};
// A. 실제 기록 재생
for(let f=0;f<3;f++){const tr=G.filter(g=>g.n%3!==f),te=G.filter(g=>g.n%3===f);const twB=twOf(BASE,tr),twZ=twOf(ZN,tr);const eB=E.makeEngine({TWX:twB}),eZ=E.makeEngine({TWX:twZ});
 for(const g of te){const prev=G.filter(h=>h.n<g.n); // 기억은 이 판보다 앞선 판만
  R.base[g.n]=play(eB,g);R.zone[g.n]=play(eZ,g);R.mem[g.n]=play(E.makeEngine({TWX:mixTW(twB,prev,g.p)}),g);R.zmem[g.n]=play(E.makeEngine({TWX:mixTW(twZ,prev,g.p)}),g)}
 console.error('fold',f,((Date.now()-t0)/1000|0)+'s')}
const pairStat=(a,b)=>{const d=a.map((v,i)=>v-b[i]),n=d.length,m=d.reduce((x,y)=>x+y)/n,sd=Math.sqrt(d.reduce((x,y)=>x+(y-m)**2,0)/(n-1));return{diff:+m.toFixed(4),se:+(sd/Math.sqrt(n)).toFixed(4)}};
const avg=a=>+(a.reduce((x,y)=>x+y)/a.length).toFixed(4);
// 반복 판(당첨 3칸이 앞에서 나온 판)만 따로
const seen=new Set(),repI=[];for(const g of G){if(seen.has(g.y))repI.push(g.n);seen.add(g.y)}
const sub=(a,I)=>I.map(i=>a[i]);
const replay={mean:Object.fromEntries(Object.entries(R).map(([k,a])=>[k,avg(a)])),vsBase:{zone:pairStat(R.zone,R.base),mem:pairStat(R.mem,R.base),zmem:pairStat(R.zmem,R.base)},
 repeatGames:{n:repI.length,base:avg(sub(R.base,repI)),mem:avg(sub(R.mem,repI))}};
console.error('replay done',((Date.now()-t0)/1000|0)+'s');
// B. 모델 기준 정확 평가 (✕ 쌍 빈도 가중)
const twBall=twOf(BASE,G),twZall=twOf(ZN,G),xw=PAIRS.map((_,p)=>G.filter(g=>g.p===p).length);
const eBall=E.makeEngine({TWX:twBall}),eZall=E.makeEngine({TWX:twZall});
let zB=0,zZ=0,mB=0,mM=0;
for(let p=0;p<9;p++){const x=PAIRS[p],w=xw[p]/N;zB+=w*exact(eBall,twZall,x);zZ+=w*exact(eZall,twZall,x);
 const tm=mixTW(twBall,G,p);mB+=w*exact(eBall,tm,x);mM+=w*exact(E.makeEngine({TWX:tm}),tm,x);console.error('exact pair',x,((Date.now()-t0)/1000|0)+'s')}
console.log(JSON.stringify({lambda:LAMM,replay,modelExact:{truthZone:{base:zB,zone:zZ,gain:zB-zZ},truthMem:{base:mB,mem:mM,gain:mB-mM}},sec:(Date.now()-t0)/1000},null,1));
