// node runpar.js <단계> <출력 접두> <쌍 목록 "9 10 ..."> <명령...>
//   쌍마다 "<명령...> <쌍>"을 병렬로 실행 (동시에 JOBS개, 기본 = min(쌍 수, CPU 스레드 수))
//   표준 출력 → <출력 접두>.<쌍>.json, 표준 오류 → <출력 접두>.<쌍>.err
//   이미 올바른 JSON 출력이 있는 쌍은 건너뜀(중간에 멈춘 뒤 다시 실행할 때)
//   각 작업은 PROG 환경 변수의 파일에 진행률을 씀(prog.js) → progress.js로 전체 % 표시
//   하나라도 실패하면 종료 코드 1
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const P=require('./progress.js');
const[step,prefix,pairStr,...cmd]=process.argv.slice(2);
const pairs=pairStr.split(/\s+/).filter(Boolean);
const ok=f=>{try{JSON.parse(fs.readFileSync(f,'utf8'));return fs.statSync(f).size>0}catch(e){return false}};
const JOBS=Math.max(1,+process.env.JOBS||Math.min(pairs.length,(os.availableParallelism?os.availableParallelism():os.cpus().length)));
const PD=path.join(__dirname,'prog');fs.mkdirSync(PD,{recursive:true});fs.mkdirSync(path.dirname(path.resolve(prefix)),{recursive:true});
const st=Object.fromEntries(pairs.map(p=>[p,ok(prefix+'.'+p+'.json')?'done':'wait']));
const pf=p=>path.join(PD,step+'.'+p);
const fracOf=p=>st[p]==='done'?1:st[p]==='run'?(()=>{try{return Math.min(.99,+fs.readFileSync(pf(p),'utf8')||0)}catch(e){return 0}})():0;
const tick=()=>{if(pairs.length)P.tick(step,pairs.reduce((s,p)=>s+fracOf(p),0)/pairs.length)};
let running=0,failed=[];
function next(){const p=pairs.find(q=>st[q]==='wait');if(!p)return;st[p]='run';running++;
 try{fs.unlinkSync(pf(p))}catch(e){}
 const out=fs.openSync(prefix+'.'+p+'.json','w'),err=fs.openSync(prefix+'.'+p+'.err','w');
 const ch=spawn(cmd[0],[...cmd.slice(1),p],{cwd:__dirname,stdio:['ignore',out,err],env:{...process.env,PROG:pf(p)}});
 ch.on('error',e=>{fs.writeSync(err,String(e));});
 ch.on('close',code=>{fs.closeSync(out);fs.closeSync(err);running--;
  if(code===0&&ok(prefix+'.'+p+'.json'))st[p]='done';else{st[p]='fail';failed.push(p);console.log('  실패: '+step+' 쌍 '+p+' (종료 코드 '+code+', '+prefix+'.'+p+'.err 참고)')}
  tick();next();if(!running&&!pairs.some(q=>st[q]==='wait'))finish()})}
function finish(){clearInterval(timer);process.exit(failed.length?1:0)}
const timer=setInterval(tick,5000);
for(let i=0;i<JOBS;i++)next();
if(!running)finish();
