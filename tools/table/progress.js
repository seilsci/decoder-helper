// master.sh 진행 표시: 전체 작업 기준 % (1% 오를 때만 한 줄) + 남은 시간(지금까지 걸린 시간 ÷ 진행률)
//   단계 가중치 = steptimes.json(지난 실행에서 잰 단계별 초)이 있으면 그 값, 없으면 아래 기본값
//   상태는 prog/state.json에 둠 (clean.sh가 지움)
//   node progress.js start           — 이번 실행 시작 (시작 시각, 이미 끝난 단계만큼의 진행률 기록)
//   node progress.js done <단계> [초] — 단계 끝 표시 (초를 주면 걸린 시간으로 기록)
//   node progress.js save            — 이번 실행에서 잰 단계별 시간을 steptimes.json에 씀
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'prog'),SF=path.join(DIR,'state.json'),TF=path.join(__dirname,'steptimes.json');
const DEPTHS=[4,5,6,7,8,9,10,11,12,13];
const STEPS=['g2',...DEPTHS.flatMap(n=>['g'+n,'f'+n]),'cmp','verify'];
const DEF={g2:3000,g4:400,g5:300,cmp:200,verify:900};for(const n of DEPTHS){DEF['f'+n]=60;if(n>5)DEF['g'+n]=150}
const W=Object.assign({},DEF,fs.existsSync(TF)?JSON.parse(fs.readFileSync(TF,'utf8')):{});
const TOTAL=STEPS.reduce((s,k)=>s+W[k],0);
const load=()=>{try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch(e){return{done:{},meas:{}}}};
const save=s=>{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s))};
// 진행률(0~1): 끝난 단계 + 지금 단계 × frac
function frac(s,step,f){let d=0;for(const k of STEPS)if(s.done[k])d+=W[k];if(step&&!s.done[step])d+=W[step]*Math.min(1,Math.max(0,f));return d/TOTAL}
function report(s,p){const pct=Math.floor(p*100+1e-9);if(pct<=(s.last??-1))return;s.last=pct;
 const el=(Date.now()-s.t0)/1000,gain=p-s.p0;let eta='계산 중';
 if(gain>0.002&&el>30)eta='예상 '+Math.max(1,Math.round(el/gain*(1-p)/60))+'분';
 console.log(pct+'% 완료 (남은시간 : '+eta+')')}
// 다른 스크립트(runpar.js)가 부름: step 진행 중 frac
function tick(step,f){const s=load();if(!s.t0)return;report(s,frac(s,step,f));save(s)}
module.exports={tick,STEPS};
if(require.main===module){const[cmd,step,sec]=process.argv.slice(2);const s=load();
 if(cmd==='start'){s.t0=Date.now();s.meas={};s.p0=frac(s);s.last=Math.floor(s.p0*100+1e-9)-1;report(s,s.p0);save(s)}
 else if(cmd==='done'){if(!STEPS.includes(step))throw new Error('단계 '+step);s.done[step]=1;if(sec!==undefined)s.meas[step]=+sec;if(s.t0)report(s,frac(s));save(s)}
 else if(cmd==='save'){const old=fs.existsSync(TF)?JSON.parse(fs.readFileSync(TF,'utf8')):{};const out={};for(const k of STEPS)out[k]=s.meas[k]!==undefined?Math.max(1,Math.round(s.meas[k])):(old[k]??DEF[k]);
  fs.writeFileSync(TF,JSON.stringify(out,null,1)+'\n');console.log('steptimes.json 갱신 (다음 실행의 진행률 가중치)')}
 else{console.error('사용법: node progress.js start|done <단계> [초]|save');process.exit(1)}}
