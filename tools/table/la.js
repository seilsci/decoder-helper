// 탐색 강화: node la.js <x>   (환경 변수 LA_FR = 수마다 고를 도달 확률 비율, 기본 0.9, 1이면 전부 / LA_N0, LA_N1 = 첫 수·끝 수, 기본 4·8)
//  지금 표 정책 π(out2·out4~13 표, 없으면 롤아웃)로 판을 진행할 때 n번째 수(기본 4~8)에 나오는 장면을
//  도달 확률 순으로 골라, 수마다 확률 합이 비율(기본 90%)이 될 때까지의 장면에서
//  Q^π(s,t) = 1 + Σ 결과 확률 × V^π(다음 장면) 이 가장 작은 칸을 찾음 (= 한 단계 더 내다보기).
//  V^π는 표 정책을 끝까지 따를 때의 정확한 기대 클릭(모델 prior.js 기준). 정책 개선 정리로 바꾼 장면이 일부여도 기대 클릭은 줄거나 같음.
//  결과(JSON, 표준 출력): 바꿀 장면 목록 {n, hk, obs[], cur, best, gain, p} 와 예상 절약(판당 클릭, 이 x쌍 기준)
//  적용은 la_apply.js
const fs=require('fs');const E=require('./eng.js'),P=require('./pol.js'),build=require('./ovmap.js');
const x=+process.argv[process.argv.length-1],FR=+(process.env.LA_FR||0.9),N0=+(process.env.LA_N0||4),N1=+(process.env.LA_N1||8);
if(![9,10,11,12,13,15,18,19,20].includes(x))throw new Error('x 쌍 번호: '+x);const PROG=require('./prog.js');
const OV=build(__dirname,x);
const pol=(st,L)=>{const k=E.hashKey(st,L);return OV.has(k)?OV.get(k):P.eng.decide(st,L)};
const gl=st=>3-st.filter(v=>v==='gift').length;
let memo=new Map();
function V(st,L){if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);const k=E.hashKey(st,L);const h=memo.get(k);if(h!==undefined)return h;
 const t=pol(st,L);let W=0,S=0;for(const g of P.split(st,L,t)){W+=g.w;S+=g.w*V(g.s,g.ls)}const v=1+S/W;if(memo.size>4e6)memo=new Map();memo.set(k,v);return v}
function Q(st,L,t,bound=Infinity){const gs=P.split(st,L,t).sort((a,b)=>b.w-a.w);let W=0,lb=0;for(const g of gs){W+=g.w;lb+=g.w*P.lb(g.s,g.ls)}
 let S=0;for(const g of gs){lb-=g.w*P.lb(g.s,g.ls);S+=g.w*V(g.s,g.ls);if(1+(S+lb)/W>=bound-1e-12)return Infinity}return 1+S/W}
// 표 로그: 장면 해시 → obs 키 목록 (n번째 수 표)
const LOGS={};for(let n=N0;n<=N1;n++){const d=JSON.parse(fs.readFileSync(__dirname+'/out'+n+'/g'+n+'.'+x+'.json'));const m=new Map();for(const l of d.log){if(!m.has(l.hk))m.set(l.hk,[]);m.get(l.hk).push(l.obs)}LOGS[n]=m}
// π로 진행하며 n번째 수 장면과 도달 확률 모으기
const st0=new Array(42).fill('hidden');st0[x]='x';st0[41-x]='x';const L0=[];E.T.forEach((t,q)=>{if(!t.includes(x)&&!t.includes(41-x))L0.push(q)});
let layer=new Map([[E.hashKey(st0,L0),{st:st0,L:L0,p:1}]]);const AT={};
for(let n=1;n<=N1;n++){const next=new Map();if(n>=N0)AT[n]=[...layer.values()];
 for(const s of layer.values()){if(gl(s.st)<=0||s.L.length<=1)continue;const t=pol(s.st,s.L);const gs=P.split(s.st,s.L,t);let W=0;for(const g of gs)W+=g.w;
  for(const g of gs){if(gl(g.s)<=0||g.ls.length<=1)continue;const k=E.hashKey(g.s,g.ls),q=next.get(k);if(q)q.p+=s.p*g.w/W;else next.set(k,{st:g.s,L:g.ls,p:s.p*g.w/W})}}
 layer=next}
// 고를 장면 수(진행률용)
const SEL={};let NSEL=0,DONE=0;for(let n=N0;n<=N1;n++){const all=AT[n].filter(s=>gl(s.st)>0&&s.L.length>1).sort((a,b)=>b.p-a.p);const tot=all.reduce((a,s)=>a+s.p,0);let acc=0;const pick=[];
 for(const s of all){if(FR<1&&acc>=FR*tot)break;acc+=s.p;pick.push(s)}SEL[n]={all,tot,pick,acc};NSEL+=pick.length}
const t0=Date.now();const vRoot=V(st0,L0);const msRoot=Date.now()-t0;PROG(0.05,true);
const out={x,FR,N0,N1,vRoot,msRoot,depth:{},changes:[]};let save=0;
for(let n=N0;n<=N1;n++){const{all,tot,pick,acc}=SEL[n];
 let cnt=0,inLog=0,ch=0,ms=0;const t1=Date.now();
 for(const s of pick){cnt++;DONE++;PROG(0.05+0.95*DONE/NSEL);const hk=E.hashKey(s.st,s.L),obs=LOGS[n].get(hk);if(!obs)continue;inLog++;
  const a=pol(s.st,s.L),qa=Q(s.st,s.L,a);let best=qa,bt=a;
  for(let t=0;t<42;t++)if(s.st[t]==='hidden'&&t!==a){const q=Q(s.st,s.L,t,best);if(q<best-1e-9){best=q;bt=t}}
  if(bt!==a){ch++;save+=s.p*(qa-best);out.changes.push({n,hk,obs,cur:a,best:bt,gain:qa-best,p:s.p})}}
 ms=Date.now()-t1;out.depth[n]={states:all.length,mass:tot,used:cnt,usedMass:acc,inLog,changed:ch,sec:ms/1000};
 if(process.env.VERB)console.error(x,'n',n,JSON.stringify(out.depth[n]))}
out.save=save;out.sec=(Date.now()-t0)/1000;console.log(JSON.stringify(out));
