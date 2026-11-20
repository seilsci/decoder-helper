// 4b 백테스트 확장: node bt.js [판 수=20000] [묶음=1250]
//  verify/simx2.js C 를 YMODE=m(현재 모델 분포)·u(균등) 각각, 이전 main js(../verify/out/old/js/) vs 지금 js(저장소)로 같은 시드 실행
//  결과 묶음: out/bt/<모드>.<old|new>.<시작>.json  (이미 있으면 건너뜀) → 모두 끝나면 요약을 out/bt/summary.json과 표준 출력으로
//  동시 실행 수: JOBS (기본 CPU 스레드 수 − 2)
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const TB=path.resolve(__dirname,'..'),ROOT=path.resolve(TB,'../..'),OUT=path.join(__dirname,'out','bt');fs.mkdirSync(OUT,{recursive:true});
const NG=+process.argv[2]||20000,CH=+process.argv[3]||1250,OLD=path.join(TB,'verify/out/old/js')+'/';
if(!fs.existsSync(OLD+'prior.js')){console.error('이전 main js가 없습니다: '+OLD+' (node tools/table/verify/checkall.js 가 풂)');process.exit(1)}
const JOBS=+process.env.JOBS||Math.max(1,(os.availableParallelism?os.availableParallelism():os.cpus().length)-2);
const jobs=[];for(const mode of['m','u'])for(let s=0;s<NG;s+=CH)for(const ver of['old','new'])jobs.push({mode,ver,s,n:Math.min(CH,NG-s),f:path.join(OUT,`${mode}.${ver}.${s}.json`)});
const ok=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8')).res.length>0}catch(e){return false}};
fs.writeFileSync(path.join(OUT,'plan.json'),JSON.stringify({total:jobs.length,start:Date.now()}));
let run=0,fail=0;const todo=jobs.filter(j=>!ok(j.f));
function next(){const j=todo.shift();if(!j){if(!run)finish();return}run++;
 const env={...process.env,YMODE:j.mode};if(j.ver==='old')env.D=OLD;else delete env.D;
 const o=fs.openSync(j.f+'.tmp','w');const ch=spawn(process.execPath,[path.join(TB,'verify/simx2.js'),'C',String(j.s),String(j.n)],{cwd:ROOT,env,stdio:['ignore',o,'inherit']});
 ch.on('close',c=>{fs.closeSync(o);run--;if(c===0&&ok(j.f+'.tmp'))fs.renameSync(j.f+'.tmp',j.f);else{fail++;console.error('실패',j.f,c)}next()})}
for(let i=0;i<JOBS;i++)next();
function finish(){if(fail){console.error(fail+'개 묶음 실패 — 다시 실행하면 남은 것만 돎');process.exit(1)}
 const S={};for(const mode of['m','u']){const get=ver=>jobs.filter(j=>j.mode===mode&&j.ver===ver).sort((a,b)=>a.s-b.s).flatMap(j=>JSON.parse(fs.readFileSync(j.f,'utf8')).res);
  const o=get('old'),n=get('new'),N=o.length,mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const d=n.map((v,i)=>v-o[i]),md=mean(d),sd=Math.sqrt(d.reduce((x,y)=>x+(y-md)**2,0)/(N-1)),se=sd/Math.sqrt(N);
  const hist=a=>{const h={};for(const v of a)h[v]=(h[v]||0)+1;return h};
  const sdv=a=>{const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1))};
  S[mode]={games:N,old:{mean:mean(o),sd:sdv(o)},new:{mean:mean(n),sd:sdv(n)},diff:md,se,z:md/se,better:d.filter(x=>x<0).length,same:d.filter(x=>x===0).length,worse:d.filter(x=>x>0).length,hist:{old:hist(o),new:hist(n)}}}
 fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(S,null,1));console.log(JSON.stringify(S,null,1))}
