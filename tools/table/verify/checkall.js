// node checkall.js [이전 버전 git 커밋, 기본 origin/main] — README.md의 머지 전 4가지 확인을 한꺼번에 실행하고 통과/실패 요약
//   이전 버전 js는 git archive로 out/old/js/에 풀어서 씀(4a, 4b 비교용)
//   결과: out/summary.json (pass, 파일 해시) — master.sh --merge가 이걸 보고 머지
//   독립 작업은 병렬로 실행(4b 8묶음 등). 진행률은 progress.js 'verify' 단계로 보고
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
function run(args,env={},outFile){total++;return new Promise(res=>{let so='',se='';
 const ch=spawn(process.execPath,args,{cwd:ROOT,env:{...process.env,...env}});
 ch.stdout.on('data',d=>so+=d);ch.stderr.on('data',d=>se+=d);
 ch.on('close',code=>{done++;tick();if(outFile)fs.writeFileSync(outFile,so);res({code,so,se})})})}
const lastJSON=s=>{const l=s.trim().split('\n').reverse().find(x=>x.trim().startsWith('{'));try{return JSON.parse(l)}catch(e){return null}};
const R={};
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
 const t4a=Promise.all([kibo(OLDJS),kibo(null)]).then(([o,n])=>{R['4a']={pass:n<o,msg:'이전 '+o.toFixed(3)+' → 새 '+n.toFixed(3)}});
 const sim2=d=>Promise.all([0,1250,2500,3750].map(s=>run([js('verify/simx2.js'),'C',String(s),'1250'],{YMODE:'m',...(d?{D:d}:{})}).then(r=>lastJSON(r.so))))
  .then(a=>a.some(x=>!x)?null:a.flatMap(x=>x.res));
 const t4b=Promise.all([sim2(OLDJS),sim2(null)]).then(([o,n])=>{if(!o||!n){R['4b']={pass:false,msg:'실행 오류'};return}
  const N=n.length,d=n.map((v,i)=>v-o[i]),m=d.reduce((a,b)=>a+b)/N,sd=Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(N-1)),z=m/(sd/Math.sqrt(N));
  const avg=a=>a.reduce((x,y)=>x+y)/a.length;
  R['4b']={pass:m<0&&z<-1.96,msg:'모델 분포 '+N+'판: 이전 '+avg(o).toFixed(3)+' → 새 '+avg(n).toFixed(3)+' (z='+z.toFixed(2)+', -1.96보다 작아야 함)'}});
 await Promise.all([t2,t3,t4a,t4b]);clearInterval(timer);done=total;tick();
 const NAMES={1:'1. 9쌍 비교',2:'2. 표 일관성',3:'3. 화면 테스트','4a':'4a. 실제 기록 재생','4b':'4b. 5000판 비교'};
 console.log('\n=== 검증 요약 (이전 버전: '+OLD+') ===');
 for(const k of['1','2','3','4a','4b'])console.log((R[k].pass?'통과':'실패')+'  '+NAMES[k].padEnd(12)+'  '+R[k].msg);
 const pass=Object.values(R).every(r=>r.pass);
 const h=f=>crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
 fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({pass,old:OLD,R,hash:{tables:h('js/tables.js'),prior:h('js/prior.js')},at:new Date().toISOString()},null,1));
 console.log(pass?'모두 통과':'실패 항목이 있음');process.exit(pass?0:1)})().catch(e=>{console.error(e);process.exit(2)});
