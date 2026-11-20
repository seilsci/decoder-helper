const fs=require('fs'),vm=require('vm');const D=process.env.D||require('path').resolve(__dirname,'../../../js')+'/';
const ctx={console,Math,Date,Set,Map,Array,Uint8Array,Uint32Array,Int32Array,Float64Array,JSON,Error,Infinity,Promise,setTimeout,location:{search:'?x=6'}};
vm.createContext(ctx);for(const f of['tables.js','algorithm.js','rollout.js','prior.js'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
const R=[8,9,8,9,8],idx=s=>{const[r,c]=s.split('-').map(Number);return R.slice(0,r-1).reduce((a,b)=>a+b,0)+c-1};
const lines=fs.readFileSync(__dirname+'/'+(process.env.KF||'kibo.txt')+'','utf8').trim().split('\n');
vm.runInContext(`function play(xs,t){
 S={lang:'ko',mode:'play',xs:new Set(xs),hs:new Set(),bs:new Set(),fs:new Set(),os:new Set(),obs:[],n0:0,cl:[]};
 const unf=()=>t.filter(j=>!found().includes(j)),truth=i=>t.includes(i)?'f':NB[i].some(j=>unf().includes(j))?'h':'b';const seq=[];
 for(let g=0;found().length<3&&g<60;g++){let q;while((q=pend()).length)answer(NB[q[0]].some(j=>unf().includes(j)));if(found().length>=3)break;
  const A=analyze();const sure=[];for(let x=0;x<42;x++)if(A.p[x]>=.999999)sure.push(x);
  if(A.N&&sure.length==3-found().length){addObs(sure[0],'f');seq.push(sure[0]);continue}
  let rec=openRec();if(rec==null)rec=deepRec();if(rec<0||state(rec)!='c')throw new Error('bad');const o=truth(rec);addObs(rec,o);seq.push(rec+o)}
 return[clicks(),seq]}`,ctx);
const lab=i=>{let r=0,k=i;while(k>=R[r]){k-=R[r];r++}return(r+1)+'-'+(k+1)};
let su=0,sa=0,out=[];
for(const ln of lines){const[kb,u]=ln.split('\t');const m=kb.match(/x : (\S+) (\S+) y : (\S+) (\S+) (\S+)/);
 const xs=[idx(m[1]),idx(m[2])],t=[idx(m[3]),idx(m[4]),idx(m[5])].sort((a,b)=>a-b);
 if(xs[0]+xs[1]!==41)console.error('x not symmetric',kb);
 const[c,seq]=ctx.play(xs,t);su+=+u;sa+=c;out.push([kb,+u,c,seq.map(s=>typeof s=='number'?lab(s)+'f':lab(parseInt(s))+s.slice(-1)).join(' ')])}
for(const o of out)console.log(o.join('\t'));console.log('sum user',su,'algo',sa,'n',lines.length,'avg',(su/lines.length).toFixed(3),(sa/lines.length).toFixed(3));
