// OPENX4~13의 모든 키를 앱 상태로 되살려 openRec()이 표 값을 돌려주는지 확인
const fs=require('fs'),vm=require('vm');const D=require('path').join(__dirname,'../../js/');
const ctx={location:{search:''},console,Math,Date,Set,Map,Array,Uint8Array,Uint32Array,Int32Array,Float64Array,JSON,Error,Infinity,Promise,setTimeout};
vm.createContext(ctx);for(const f of['tables.js','algorithm.js','rollout.js','prior.js'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
console.log(vm.runInContext(`(function(){let ok=0,bad=[];
OPENXD.forEach((T,d)=>{for(const key in T){const p=key.split('|');const xs=p[0].split(',').map(Number);
 S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};
 const toks=[];for(let i=1;i<p.length;){if(p[i][0]=='r'){toks.push({r:p[i][1]=='1'});i++}else{toks.push({i:+p[i],k:p[i+1]});i+=2}}
 let fail=null;for(let j=0;j<toks.length&&!fail;j++){const t=toks[j];
  if(S.obs.length>j){const o=S.obs[j];if(!(t.r!==undefined?o.k=='r'&&!!o.h==t.r:o.i==t.i&&o.k==t.k))fail='auto mismatch '+j;continue}
  if(t.r!==undefined){if(!pend().length)fail='no pend '+j;else answer(t.r)}else{if(state(t.i)!='c')fail='not closed '+j;else addObs(t.i,t.k)}}
 if(!fail&&S.obs.length!==toks.length)fail='len '+S.obs.length+'/'+toks.length;
 const r=fail?null:openRec();if(!fail&&r===T[key])ok++;else bad.push((d+4)+' '+key+' '+(fail||('got '+r+' want '+T[key])))}});
return JSON.stringify({ok,bad:bad.length,sample:bad.slice(0,5)})})()`,ctx));
