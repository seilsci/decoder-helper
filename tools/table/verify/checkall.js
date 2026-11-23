// node checkall.js [이전 버전 git 커밋, 기본 origin/main] — README.md의 머지 전 4가지 확인을 한꺼번에 실행하고 통과/실패 요약
//   이전 버전 js는 git archive로 out/old/js/에 풀어서 씀(4a, 4b 비교용)
//   결과: out/summary.json (pass, 파일 해시) — master.sh --merge가 이걸 보고 머지
//         out/dist.json  4b 백테스트의 클릭 수별 판 수(새·이전), 요약 아래에 표로도 출력
//   독립 작업은 병렬로 실행(동시에 JOBS개). 진행률은 progress.js 'verify' 단계로 보고
//   판정은 z = (새 − 이전) / 판별 차이의 표준오차(음수 = 새가 나음)로:
//     4a 실제 기록 재생 — 참고만(이전 버전이 외운 판이 섞여 공정하지 않음) / 4b 모델 분포 B4N판(기본 20000) — 유의하게 나쁘지 않음(z < 2)
//     4c 새 판 예측 — 이전 버전이 학습하지 않은 최근 판을 떼어 두고 다시 학습한 모델 vs 이전 모델의 당첨 세 칸 로그우도. 유의하게 나쁘지 않음(z > −2)
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn,execFileSync}=require('child_process');
const V=__dirname,TB=path.dirname(V),ROOT=path.resolve(TB,'../..'),OUT=path.join(V,'out');fs.mkdirSync(OUT,{recursive:true});
let P=null;try{P=require('../progress.js')}catch(e){}
const OLD=process.argv[2]||'origin/main';
// 이전 버전 js 풀기
const OLDD=path.join(OUT,'old');fs.rmSync(OLDD,{recursive:true,force:true});fs.mkdirSync(OLDD,{recursive:true});
execFileSync('git',['-C',ROOT,'archive','-o',path.join(OUT,'old.tar'),OLD,'js']);execFileSync('tar',['-xf','old.tar','-C','old'],{cwd:OUT});
const OLDJS=path.join(OLDD,'js')+'/';
let total=0,done=0;const tick=()=>P&&P.tick('verify',done/Math.max(1,total));
// 명령 실행 → 표준 출력 문자열
// 동시에 JOBS개까지(기본 CPU 스레드 수 − 2)
const JOBS=+process.env.JOBS||Math.max(2,require('os').cpus().length-2);let active=0;const waitq=[];
const slot=()=>active<JOBS?(active++,Promise.resolve()):new Promise(r=>waitq.push(r));const free=()=>{const r=waitq.shift();if(r)r();else active--};
function run(args,env={},outFile){total++;return slot().then(()=>new Promise(res=>{let so='',se='';
 const ch=spawn(process.execPath,args,{cwd:ROOT,env:{...process.env,...env}});
 ch.stdout.on('data',d=>so+=d);ch.stderr.on('data',d=>se+=d);
 ch.on('close',code=>{done++;tick();free();if(outFile)fs.writeFileSync(outFile,so);res({code,so,se})})}))}
// 판별 짝 비교: z = (새 − 이전) / 표준오차 (음수 = 새가 나음)
const pz=(o,n)=>{const N=n.length,d=n.map((v,i)=>v-o[i]),m=d.reduce((a,b)=>a+b)/N,sd=Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(N-1)),se=sd/Math.sqrt(N);return{N,m,se,z:m/se,avg:a=>a.reduce((x,y)=>x+y)/a.length}};
const lastJSON=s=>{const l=s.trim().split('\n').reverse().find(x=>x.trim().startsWith('{'));try{return JSON.parse(l)}catch(e){return null}};
const R={};let DIST=null;
// 4b 백테스트 결과(판마다 클릭 수)를 클릭 수별 판 수 표로: 이전·새 나란히, 평균·표준편차와 누적 비율
function distTable(o,n){const st=a=>{const N=a.length,m=a.reduce((x,y)=>x+y,0)/N,sd=Math.sqrt(a.reduce((x,v)=>x+(v-m)**2,0)/(N-1));const c={};for(const v of a)c[v]=(c[v]||0)+1;return{N,m,sd,c}};
 const so=st(o),sn=st(n),ks=[...new Set([...Object.keys(so.c),...Object.keys(sn.c)].map(Number))].sort((a,b)=>a-b);let acc=0;
 const L=['\n=== 백테스트 분포 (모델 분포 '+sn.N+'판, 판마다 클릭 수) ===','새: 평균 '+sn.m.toFixed(3)+', 표준편차 '+sn.sd.toFixed(2)+'   (이전: 평균 '+so.m.toFixed(3)+', 표준편차 '+so.sd.toFixed(2)+')','클릭   새 판 수     비율    누적   | 이전 판 수'];
 for(const k of ks){const v=sn.c[k]||0;acc+=v;L.push(String(k).padStart(4)+String(v).padStart(10)+((v/sn.N*100).toFixed(2)+'%').padStart(9)+((acc/sn.N*100).toFixed(1)+'%').padStart(8)+'   |'+String(so.c[k]||0).padStart(9))}
 return{text:L.join('\n'),json:{N:sn.N,new:{mean:sn.m,sd:sn.sd,count:sn.c},old:{mean:so.m,sd:so.sd,count:so.c}}}}
const timer=setInterval(tick,5000);
(async()=>{
 const js=f=>path.join('tools/table',f);
 // 1. 9쌍 비교 (master.sh가 만든 cmp/c.*.json)
 {const fs_=(fs.existsSync(path.join(TB,"cmp"))?fs.readdirSync(path.join(TB,"cmp")):[]).filter(f=>/^c\.\d+\.json$/.test(f));const g=fs_.map(f=>JSON.parse(fs.readFileSync(path.join(TB,'cmp',f),'utf8')));
  const bad=g.filter(d=>!(d.gain.pf>0&&d.gain.real>0)).map(d=>d.x);
  R[1]={pass:g.length===9&&!bad.length,msg:g.length!==9?'cmp 결과 '+g.length+'/9쌍':bad.length?'손해 쌍 '+bad.join(','):'pf 최소 +'+Math.min(...g.map(d=>d.gain.pf)).toExponential(2)+', real 최소 +'+Math.min(...g.map(d=>d.gain.real)).toExponential(2)}}
 // 2~4 병렬
 const t2=Promise.all(['chkK.js','verify/chk4.js','verify/chk5.js'].map(f=>run([js(f)]).then(r=>{const j=lastJSON(r.so);return{f:path.basename(f,'.js'),bad:j?(Array.isArray(j.bad)?j.bad.length:j.bad):'오류'}})))
  .then(a=>{R[2]={pass:a.every(x=>x.bad===0),msg:a.map(x=>x.f+' bad '+x.bad).join(', ')}});
 let hasPW=true;try{require.resolve('playwright',{paths:[V]})}catch(e){hasPW=false}
 const t3=hasPW?Promise.all([run([js('verify/simx.js'),'C','0','25'],{},path.join(OUT,'tNC.0.json')),run([js('verify/simx.js'),'C','25','5'],{},path.join(OUT,'tNC.1.json'))])
  .then(()=>run([js('verify/ui_plain.js'),'25'],{SIMF:'tNC'})).then(r=>{const j=lastJSON(r.so);
   R[3]={pass:!!j&&j.matchSim===25&&j.errs.length===0,msg:j?'matchSim '+j.matchSim+'/25, errs '+j.errs.length+(j.errs.length?' ('+j.errs[0]+')':''):'실행 오류: '+r.se.trim().split('\n').slice(-2).join(' ')}})
  :Promise.resolve(R[3]={pass:false,msg:'playwright 없음 — tools/table에서 npm install && npx playwright install chromium'});
 const kibo=d=>run([js('verify/kiboV.js')],{KF:'kibo.txt',...(d?{D:d}:{})}).then(r=>{const m=r.so.match(/avg\s+\S+\s+(\S+)\s*$/);return m?+m[1]:NaN});
 // 4a: 판별 클릭(kiboV 출력 3번째 칸)을 짝지어 비교 → 유의하게 나쁘지 않으면(z < 2) 통과. 출력은 out/kibo.old.txt, out/kibo.new.txt
 const kiboG=(d,name)=>run([js('verify/kiboV.js')],{KF:'kibo.txt',...(d?{D:d}:{})},path.join(OUT,'kibo.'+name+'.txt')).then(r=>r.so.trim().split('\n').filter(l=>!l.startsWith('sum')).map(l=>+l.split('\t')[2]));
 const t4a=Promise.all([kiboG(OLDJS,'old'),kiboG(null,'new')]).then(([o,n])=>{if(!o.length||o.length!==n.length||o.some(isNaN)||n.some(isNaN)){R['4a']={pass:false,msg:'실행 오류'};return}
  const s=pz(o,n);R['4a']={pass:true,info:true,msg:'(참고) '+s.N+'판: 이전 '+s.avg(o).toFixed(3)+' → 새 '+s.avg(n).toFixed(3)+' (차이 '+(s.m>=0?'+':'')+s.m.toFixed(3)+' ± '+s.se.toFixed(3)+', z='+s.z.toFixed(2)+')'}});
 // 4b: 모델 분포 B4N판(기본 20000)을 1250판 묶음으로, 이전/새 같은 시드 → 유의하게 나으면(z < −1.96) 통과
 const B4N=+process.env.B4N||20000,starts=[];for(let s=0;s<B4N;s+=1250)starts.push(s);
 const sim2=d=>Promise.all(starts.map(s=>run([js('verify/simx2.js'),'C',String(s),String(Math.min(1250,B4N-s))],{YMODE:'m',...(d?{D:d}:{})}).then(r=>lastJSON(r.so))))
  .then(a=>a.some(x=>!x)?null:a.flatMap(x=>x.res));
 const t4b=Promise.all([sim2(OLDJS),sim2(null)]).then(([o,n])=>{if(!o||!n){R['4b']={pass:false,msg:'실행 오류'};return}
  DIST={N:n.length,old:o,new:n};const s=pz(o,n);R['4b']={pass:s.z<2,msg:'모델 분포 '+s.N+'판: 이전 '+s.avg(o).toFixed(3)+' → 새 '+s.avg(n).toFixed(3)+' (차이 '+s.m.toFixed(3)+' ± '+s.se.toFixed(3)+', z='+s.z.toFixed(2)+', 2보다 작아야 함)'}});
 // 4c: 새 판 예측(fitmodel.js --holdout)
 const t4c=run([js('fitmodel.js'),js('records.txt'),'--holdout',path.join(OLDJS,'prior.js')]).then(r=>{const j=lastJSON(r.so);
  if(!j){R['4c']={pass:false,msg:'실행 오류: '+r.se.trim().split('\n').slice(-1)[0]};return}
  if(!j.ok){R['4c']={pass:false,msg:j.msg};return}
  R['4c']={pass:j.z>-2,msg:'최근 '+j.H+'판(새 모델은 앞 '+j.train+'판으로 학습): 이전 '+j.old.toFixed(3)+' → 새 '+j.new.toFixed(3)+' nats/판 (차이 '+(j.diff>=0?'+':'')+j.diff.toFixed(3)+' ± '+j.se.toFixed(3)+', z='+j.z.toFixed(2)+', -2보다 커야 함)'}});
 await Promise.all([t2,t3,t4a,t4b,t4c]);clearInterval(timer);done=total;tick();
 const NAMES={1:'1. 9쌍 비교',2:'2. 표 일관성',3:'3. 화면 테스트','4a':'4a. 실제 기록 재생','4b':'4b. 모델 분포 비교','4c':'4c. 새 판 예측'};
 console.log('\n=== 검증 요약 (이전 버전: '+OLD+') ===');
 for(const k of['1','2','3','4a','4b','4c'])console.log((R[k].info?'참고':R[k].pass?'통과':'실패')+'  '+NAMES[k].padEnd(12)+'  '+R[k].msg);
 if(DIST){const d=distTable(DIST.old,DIST.new);console.log(d.text);fs.writeFileSync(path.join(OUT,'dist.json'),JSON.stringify(d.json,null,1))}
 const pass=Object.values(R).every(r=>r.pass);
 const h=f=>crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
 fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({pass,old:OLD,R,hash:{tables:h('js/tables.js'),prior:h('js/prior.js')},at:new Date().toISOString()},null,1));
 console.log(pass?'모두 통과':'실패 항목이 있음');process.exit(pass?0:1)})().catch(e=>{console.error(e);process.exit(2)});
