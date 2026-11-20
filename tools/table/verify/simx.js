// x=6 모드 비교: node simx.js <A|B|U> <start> <count>
//  A = 기존 x=6 (0.7 가중치 휴리스틱, 완전탐색 없음) / B = 롤아웃 + 같은 0.7 가중치(PF) / U = 롤아웃 균등(참고용)
// 판 생성: ✕ = 실제 기록(records.json xw)의 쌍별 빈도, 당첨 3칸 = 실제 칸별 당첨률(당첨 횟수/노출 판 수)의 곱에 비례
const fs=require('fs'),vm=require('vm');const D=process.env.D||require('path').resolve(__dirname,'../../../js')+'/';
const ctx={console,Math,Date,Set,Map,Array,Uint8Array,Uint32Array,Int32Array,Float64Array,JSON,Error,Infinity,Promise,setTimeout,location:{search:'?x=6'}};
vm.createContext(ctx);for(const f of['tables.js','algorithm.js','rollout.js','prior.js'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
ctx.YMODE=process.env.YMODE||'rate';ctx.REC_DATA=JSON.parse(fs.readFileSync(__dirname+'/records.json','utf8'));
const [variant,start,count]=[process.argv[2],+process.argv[3],+process.argv[4]];
vm.runInContext(`

var PAIRS=[[9,32],[10,31],[11,30],[12,29],[13,28],[15,26],[18,23],[19,22],[20,21]],XW=REC_DATA.xw,XN=XW.reduce((a,b)=>a+b);
var RATE=YMODE=='u'?REC_DATA.cnt.map(()=>1):YMODE=='pf'?Array.from(PF):REC_DATA.cnt.map((c,i)=>c/REC_DATA.ex[i]);
var TRI={};function triFor(k){if(TRI[k])return TRI[k];const xs=PAIRS[k],ls=[],cum=[];let s=0;
 for(const t of T){if(t.some(i=>xs.includes(i)))continue;s+=RATE[t[0]]*RATE[t[1]]*RATE[t[2]];ls.push(t);cum.push(s)}return TRI[k]={ls,cum,s}}
var decW=rollEngine(NB,T,PF),decU=rollEngine(NB,T,null),CACHE=new Map(),MV=[];
function viaEngine(dec){const a=rollInput();return a?dec(a[0],a[1]):-1}
var REC={C:()=>{const r=openRec();return r==null?deepRec():r},E:()=>{let r=openRec();if(r==null)r=deepRec();if(r>=0){const p=exPrep();const q=typeof p=='number'?p:exSeq(p);if(q>=0)r=q}return r},A:()=>deepRec(),B:()=>{const s=sureRec();return s>=0?s:viaEngine(decW)},U:()=>{const s=sureRec();return s>=0?s:viaEngine(decU)}};
function game(g,variant){
 let s=(g*2654435761+12345)>>>0;const rnd=n=>{s=(Math.imul(s,1103515245)+12345)>>>0;return (s>>>8)%n};
 let r=rnd(XN),k=0;while(r>=XW[k]){r-=XW[k];k++}
 const xs=PAIRS[k],tr=triFor(k);const u=(rnd(1<<23)+rnd(1<<23)/(1<<23))/(1<<23)*tr.s;
 let lo=0,hi=tr.cum.length-1;while(lo<hi){const m=(lo+hi)>>1;if(tr.cum[m]<u)lo=m+1;else hi=m}const t=tr.ls[lo];
 S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};
 const unf=()=>t.filter(j=>!found().includes(j)),truth=i=>t.includes(i)?'f':NB[i].some(j=>unf().includes(j))?'h':'b';
 let guard=0;
 while(found().length<3&&guard++<60){
  let q;while((q=pend()).length)answer(NB[q[0]].some(j=>unf().includes(j)));
  if(found().length>=3)break;
  const A=analyze();const sure=[];for(let x=0;x<42;x++)if(A.p[x]>=.999999)sure.push(x);
  if(A.N&&sure.length==3-found().length){addObs(sure[0],'f');continue}
  const key=S.obs.length<=2&&!S.obs.some(o=>o.k=='r')?variant+'|'+xs+'|'+S.obs.map(o=>o.i+o.k).join(','):null; /* 같은 상태면 같은 결과 → 초반 수만 캐시(속도용) */
  const m0=Date.now();let rec=key&&CACHE.has(key)?CACHE.get(key):REC[variant]();if(key)CACHE.set(key,rec);MV.push(Date.now()-m0);
  if(rec<0||state(rec)!='c')throw new Error('bad rec '+rec+' g='+g);
  addObs(rec,truth(rec))}
 return[clicks(),k]}
`,ctx);
const res=[],ks=[];const t0=Date.now();
for(let g=start;g<start+count;g++){const[c,k]=vm.runInContext(`game(${g},${JSON.stringify(variant)})`,ctx);res.push(c);ks.push(k)}
const mv=vm.runInContext('MV',ctx).sort((a,b)=>a-b);
console.log(JSON.stringify({variant,start,count,mean:res.reduce((a,b)=>a+b)/count,ms:Date.now()-t0,p99:mv[Math.floor(mv.length*.99)],max:mv[mv.length-1],res,ks}));
