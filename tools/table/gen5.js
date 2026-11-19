// OPEN5 생성(네 번 누른 뒤 다섯 번째 수). 원래: OPEN4 생성: 지금 표(OPENX1~3)대로 세 번 누른 뒤의 네 번째 수를 2단 롤아웃으로 고름. 원래 설명: 2단 롤아웃으로 OPENX1~3 표 생성: 각 후보 칸 t에 대해 "t를 누른 뒤 지금 롤아웃 정책을 끝까지 따를 때"의 정확한 기대 클릭을 계산해 최소인 칸을 고름
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
ctx.choose2=choose;
const x=+process.argv[2];
const t0=Date.now();
const T4=vm.runInContext(`(function(x){
const xs=[x,41-x];S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};
const T4={};const nClick=()=>S.obs.filter(o=>'bhf'.includes(o.k)).length;
const key4=()=>[...S.xs].sort((a,b)=>a-b).join(',')+'|'+S.obs.map(o=>o.k=='r'?'r'+(o.h?1:0):o.i+'|'+o.k).join('|');
const opts=i=>{const o=outcomes(i);return o?[...o]:[]};
function walk(){if(found().length>=3||!cands().length)return;
 const q=pend();if(q.length){for(const h of[true,false]){const m=S.obs.length;answer(h);if(cands().length)walk();S.obs.length=m}return}
 if(nClick()==4){T4[key4()]=choose2();return}
 let r=openRec();if(r==null){const s=sureRec();r=s>=0?s:rollRec(PF)}
 for(const k of opts(r)){const n=S.obs.length;addObs(r,k);walk();S.obs.length=n}}
walk();return T4})`,ctx)(x);
const g2=JSON.parse(fs.readFileSync(__dirname+'/out2/g2.'+x+'.json'));const OV123=new Map(g2.log.map(l=>[l.hk,l.best]));
const g4=JSON.parse(fs.readFileSync(__dirname+'/out4/g4.'+x+'.json'));for(const l of g4.log)OV123.set(l.hk,l.best);
const OV4=new Map(OV123);for(const l of LOG)OV4.set(l.hk,l.best);
const st=new Array(42).fill('hidden');st[x]='x';st[41-x]='x';const L0=[];E.T.forEach((t,q)=>{if(!t.includes(x)&&!t.includes(41-x))L0.push(q)});
const RATE=P.RATE;const EW=E.T.map(([a,b,c])=>RATE[a]*RATE[b]*RATE[c]);
function evalW(ov,W8){const m=new Map();const f=(st,L)=>{if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);
 const key=E.hashKey(st,L);const h=m.get(key);if(h!==undefined)return h;const t=ov.has(key)?ov.get(key):P.eng.decide(st,L);
 let W=0,S=0;for(const g of P.split(st,L,t)){let w=0;for(const k of g.ls)w+=W8[k];W+=w;S+=w*f(g.s,g.ls)}const v=1+S/W;m.set(key,v);return v};return f(st,L0)}
const pfA=evalW(OV123,P.TW),pfB=evalW(OV4,P.TW),ewA=evalW(OV123,EW),ewB=evalW(OV4,EW);
console.log(JSON.stringify({x,sec:Math.round((Date.now()-t0)/1000),states:Object.keys(T4).length,logged:LOG.length,changed:LOG.filter(l=>l.gain>1e-9).length,pf:{without:pfA,with:pfB,gain:pfA-pfB},real:{without:ewA,with:ewB,gain:ewA-ewB},T4,log:LOG}));
