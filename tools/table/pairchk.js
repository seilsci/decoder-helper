const fs=require('fs'),vm=require('vm');const path=require('path'),D=path.resolve(__dirname,'../../js')+'/'; // ✕ 쌍별 당첨 횟수가 현재 모델 예측과 표본 오차 수준으로 맞는지 보는 검사: node tools/table/pairchk.js (칸별 χ² ≈ 칸 수 40이면 보정 필요 없음, 크게 넘으면 그 쌍 보정 시험)
const ctx={console,Math,Date,Set,Map,Array,Uint8Array,Uint32Array,Int32Array,Float64Array,JSON,Error,Infinity,Promise,setTimeout,location:{search:''}};
vm.createContext(ctx);for(const f of['tables.js','algorithm.js','rollout.js','prior.js'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
const R=[8,9,8,9,8],idx=s=>{const[r,c]=s.split('-').map(Number);return R.slice(0,r-1).reduce((a,b)=>a+b,0)+c-1};
const L=fs.readFileSync(path.join(__dirname,'records.txt'),'utf8').split('\n').filter(Boolean);
const pairs={};for(const l of L){const m=l.match(/x : (\S+) (\S+) y : (\S+) (\S+) (\S+)/);const k=m[1]+' '+m[2];(pairs[k]=pairs[k]||[]).push([m[3],m[4],m[5]].map(idx))}
const out=[];
for(const k of Object.keys(pairs)){const xs=k.split(' ').map(idx);const g=pairs[k];const n=g.length;
 const p=vm.runInContext(`(function(xs){S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};return Array.from(analyze().p)})(${JSON.stringify(xs)})`,ctx);
 const cnt=Array(42).fill(0);g.forEach(a=>a.forEach(y=>cnt[y]++));
 let chi=0,df=0,sp=0;for(let i=0;i<42;i++){if(xs.includes(i))continue;sp+=p[i];const e=n*p[i];if(e>0){chi+=(cnt[i]-e)**2/e;df++}}
 // 균등 예상(3/40)과도 비교
 let chiU=0;for(let i=0;i<42;i++){if(xs.includes(i))continue;const e=n*3/40;chiU+=(cnt[i]-e)**2/e}
 out.push([k,n,sp.toFixed(2),chi.toFixed(1),df,chiU.toFixed(1)])}
out.sort((a,b)=>b[1]-a[1]);console.log('x 쌍 | 판 수 | p합 | 모델 대비 χ² | 칸 수 | 균등 대비 χ²');out.forEach(r=>console.log(r.join(' | ')));
