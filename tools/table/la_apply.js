// 탐색 강화 결과 적용: node la_apply.js <tables.js>
//  la/la.<x>.json(la.js 출력)의 바꿀 장면을 out4~8 표 로그(best, T4)에 넣고 drops.json에서 그 장면을 빼고,
//  tables.js의 OPENX4·5(put45.js)와 OPENX6~13(apply.js)을 다시 씀. 처음 실행할 때 out4~8·drops.json을 la/bak에 보관하고,
//  다시 실행하면 보관본에서 시작함(같은 결과를 두 번 넣지 않음).
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const D=__dirname,p=path.resolve(process.argv[2]);
const PAIRS={9:'9,32',10:'10,31',11:'11,30',12:'12,29',13:'13,28',15:'15,26',18:'18,23',19:'19,22',20:'20,21'};
const toKey=(xk,obs)=>xk+'|'+obs.split(',').map(t=>{const m=/^(\d+)([bhfr])([01]?)$/.exec(t);if(!m)throw t;return m[2]=='r'?'r'+m[3]:m[1]+'|'+m[2]}).join('|');
const B=D+'/la/bak';
if(!fs.existsSync(B)){fs.mkdirSync(B,{recursive:true});for(let n=4;n<=8;n++)for(const x in PAIRS)fs.copyFileSync(`${D}/out${n}/g${n}.${x}.json`,`${B}/g${n}.${x}.json`);fs.copyFileSync(D+'/drops.json',B+'/drops.json')}
else{for(let n=4;n<=8;n++)for(const x in PAIRS)fs.copyFileSync(`${B}/g${n}.${x}.json`,`${D}/out${n}/g${n}.${x}.json`);fs.copyFileSync(B+'/drops.json',D+'/drops.json')}
const DROP=JSON.parse(fs.readFileSync(D+'/drops.json'));let nch=0,nobs=0,save=0;const per={};
for(const x in PAIRS){const f=`${D}/la/la.${x}.json`;if(!fs.existsSync(f))throw new Error('없음 '+f);const r=JSON.parse(fs.readFileSync(f));save+=r.save;per[x]=+r.save.toFixed(5);
 const byN={};for(const c of r.changes)(byN[c.n]=byN[c.n]||[]).push(c);
 for(const n in byN){const fp=`${D}/out${n}/g${n}.${x}.json`,d=JSON.parse(fs.readFileSync(fp));
  for(const c of byN[n]){nch++;for(const o of c.obs){const ls=d.log.filter(l=>l.obs===o);if(!ls.length)throw new Error('로그 없음 '+n+' '+x+' '+o);
    for(const l of ls){if(l.hk!==c.hk)throw new Error('hk 불일치');l.best=c.best}const k=toKey(PAIRS[x],o);if(!(k in d.T4))throw new Error('T4 없음 '+k);d.T4[k]=c.best;nobs++;
    if(DROP[n]&&DROP[n][x])DROP[n][x]=DROP[n][x].filter(q=>q!==o)}}
  fs.writeFileSync(fp,JSON.stringify(d))}}
fs.writeFileSync(D+'/drops.json',JSON.stringify(DROP));
let s=fs.readFileSync(p,'utf8');const i=s.indexOf('/* 여섯 번째 수부터의 표');if(i>=0){s=s.slice(0,i).replace(/\s*$/,'\n');fs.writeFileSync(p,s)}
for(const n of[4,5])execFileSync('node',[D+'/put45.js',String(n),p],{stdio:'inherit'});
execFileSync('node',[D+'/apply.js','13',p],{stdio:'inherit'});
console.log(JSON.stringify({changes:nch,obsKeys:nobs,saveSumOverPairs:+save.toFixed(5),perPair:per}));
