// 2단 롤아웃으로 OPENX1~3 표 생성: 각 후보 칸 t에 대해 "t를 누른 뒤 지금 롤아웃 정책을 끝까지 따를 때"의 정확한 기대 클릭을 계산해 최소인 칸을 고름
// node gen2.js 20,9  → 해당 ✕ 쌍만
const fs=require('fs'),vm=require('vm');const D=require('path').join(__dirname,'../../js/');
const P=require('./pol.js'),E=require('./eng.js');
const ctx={location:{search:'?x=6'},console,Math,Date,Set,Map,Array,Uint8Array,Uint32Array,Int32Array,Float64Array,JSON,Error,Infinity,Promise,setTimeout};
vm.createContext(ctx);for(const f of['tables.js','algorithm.js','rollout.js','prior.js'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
const appPF=vm.runInContext('PF',ctx);if(appPF.some((v,i)=>Math.abs(v-P.PF[i])>1e-12))throw new Error('PF mismatch');
if(JSON.stringify(vm.runInContext('NB',ctx))!==JSON.stringify(E.NB))throw new Error('NB mismatch');
const gl=st=>3-st.filter(s=>s==='gift').length;
const LOG=[];let START=null;const OV=new Map();
function choose(){ // 앱 상태 → 2단 롤아웃 선택
 const s=ctx.sureRec();if(s>=0)return s;
 const [st,L]=ctx.rollInput();const cur=vm.runInContext("rollRec(PF)",ctx),dec=P.eng.decide(st,L);if(cur!==dec)throw new Error('decide mismatch '+cur+' '+dec);
 const cand=[];for(let i=0;i<42;i++)if(st[i]==='hidden')cand.push(i);
 const q1=new Map(cand.map(t=>[t,P.eng.baseCost?0:0]));
 // 후보 순서: 지금 선택 먼저, 나머지는 1단 값 순
 const one=t=>{let W=0,S=0;for(const g of P.split(st,L,t)){W+=g.w;S+=g.w*P.eng.baseCost(g.s,g.ls)}return 1+S/W};
 const ord=cand.map(t=>[t,t===cur?-1:one(t)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
 let best=Infinity,bt=-1,vcur=NaN;
 for(const t of ord){const gs=P.split(st,L,t).sort((a,b)=>b.w-a.w);let W=0,lb=0;for(const g of gs){W+=g.w;lb+=g.w*P.lb(g.s,g.ls)}
  let S=0,pr=false;for(const g of gs){lb-=g.w*P.lb(g.s,g.ls);S+=g.w*P.pol(g.s,g.ls);if(1+(S+lb)/W>=best-1e-9){pr=true;break}}
  if(pr)continue;const v=1+S/W;if(t===cur)vcur=v;if(v<best-1e-9){best=v;bt=t}}
 const hk=E.hashKey(st,L);if(!START)START=[st,L];OV.set(hk,bt);LOG.push({hk,obs:ctx.S.obs.map(o=>o.i+o.k+(o.k=='r'?(o.h?1:0):'')).join(','),L:L.length,cur,vcur,best:bt,vbest:best,gain:vcur-best});
 return bt}
ctx.choose2=choose;ctx.PROG=require('./prog.js'); // 진행률(PROG 환경 변수)
const only=process.argv[2]?process.argv[2].split(',').map(Number):null;
const t0=Date.now();
const out=vm.runInContext(`(function(only){
const PAIRS=[[9,32],[10,31],[11,30],[12,29],[13,28],[15,26],[18,23],[19,22],[20,21]];
function keyOf(){const xk=[...S.xs].sort((a,b)=>a-b).join(',');
 if(!S.obs.length)return['1',xk];
 if(S.obs.length==1){const o=S.obs[0];return['2',xk+'|'+o.i+'|'+o.k]}
 if(S.obs.length==2||(S.obs.length==3&&S.obs[2].k=='r'&&S.obs[2].ans)){const o1=S.obs[0],o2=S.obs[1];
  let key=xk+'|'+o1.i+'|'+o1.k+'|'+o2.i+'|'+o2.k;if(S.obs.length==3)key+='|r'+(S.obs[2].h?1:0);return['3',key]}
 return null}
const T1={},T2={},T3={};const put=(r)=>{const k=keyOf();if(!k)throw new Error('no key');({1:T1,2:T2,3:T3})[k[0]][k[1]]=r};
const opts=i=>{const o=outcomes(i);return o?[...o]:[]};
for(const xs of PAIRS){if(only&&!only.includes(xs[0]))continue;
 S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};
 const r1=choose2();put(r1);
 const O1=opts(r1);for(const[j1,k1]of O1.entries()){addObs(r1,k1);
  const r2=choose2();put(r2);
  const O2=opts(r2);for(const[j2,k2]of O2.entries()){const n=S.obs.length;addObs(r2,k2);
   const q=pend();
   if(q.length){for(const h of[true,false]){const m=S.obs.length;answer(h);if(cands().length&&!pend().length)put(choose2());S.obs.length=m}}
   else put(choose2());
   S.obs.length=n;PROG(.95*(j1+(j2+1)/O2.length)/O1.length)}
  S.obs.length=0}}
return{T1,T2,T3}})`,ctx)(only);
const vOld=P.polOv(new Map())(...START),vNew=P.polOv(OV)(...START);
console.log(JSON.stringify({vOld,vNew,gainTotal:vOld-vNew,only,sec:Math.round((Date.now()-t0)/1000),tables:out,log:LOG}));
