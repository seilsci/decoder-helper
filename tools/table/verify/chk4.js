// 앱 코드(openRec 덮어쓰기 포함)가 OPENX4의 모든 상태에서 표 값을 돌려주는지 확인
const fs=require('fs'),vm=require('vm');const D=require('path').resolve(__dirname,'../../../js')+'/';
const ctx={location:{search:'?x=6'},console,Math,Date,Set,Map,Array,Uint8Array,Uint32Array,Int32Array,Float64Array,JSON,Error,Infinity,Promise,setTimeout};
vm.createContext(ctx);for(const f of['tables.js','algorithm.js','rollout.js','prior.js'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
console.log(vm.runInContext(`(function(){let hit=0,miss=0,bad=0,seen=new Set(),before=0;
const PAIRS=[[9,32],[10,31],[11,30],[12,29],[13,28],[15,26],[18,23],[19,22],[20,21]];
const nClick=()=>S.obs.filter(o=>'bhf'.includes(o.k)).length;const opts=i=>{const o=outcomes(i);return o?[...o]:[]};
function walk(){if(found().length>=3||!cands().length)return;
 const q=pend();if(q.length){for(const h of[true,false]){const m=S.obs.length;answer(h);if(cands().length)walk();S.obs.length=m}return}
 const r=openRec();
 if(nClick()==3){const key=[...S.xs].sort((a,b)=>a-b).join(',')+'|'+S.obs.map(o=>o.k=='r'?'r'+(o.h?1:0):o.i+'|'+o.k).join('|');seen.add(key);
  if(r==null)miss++;else if(r!==OPENX4[key])bad++;else hit++;return}
 if(r==null)before++;
 const rr=r!=null?r:(sureRec()>=0?sureRec():rollRec(PF));
 for(const k of opts(rr)){const n=S.obs.length;addObs(rr,k);walk();S.obs.length=n}}
for(const xs of PAIRS){S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};walk()}
return JSON.stringify({hit,miss,bad,tableKeys:Object.keys(OPENX4).length,seen:seen.size,unusedKeys:Object.keys(OPENX4).filter(k=>!seen.has(k)).length,earlyNoTable:before})})()`,ctx));
