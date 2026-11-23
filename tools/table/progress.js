// master.sh 진행 표시: 전체 작업 기준 % + 현재 시각 + 100% 예상 시각
//   단계 가중치 = steptimes.json(지난 실행에서 잰 단계별 초)이 있으면 그 값, 없으면 아래 기본값
//   큰 단계(모델 학습, OPEN 1-3, OPEN 4~13, 표 쓰기·비교, 검증 = 14단계)가 끝날 때마다 "■ 단계 끝" 줄을 새로 찍음
//   단계 안에서는 작업이 보고한 진행률과 "걸린 시간 ÷ 예상 시간" 중 큰 값으로 %를 올림(첫 상태 계산이 길어 0%에 오래 머무는 것 방지)
//   % 줄은 1% 오르거나 1분이 지나면 다시 찍음(현재 시각 갱신)
//   상태는 prog/state.json에 둠 (clean.sh가 지움)
//   node progress.js start            — 이번 실행 시작(모델 학습 전에 부름. 학습은 매번 다시 하므로 fit은 안 끝난 것으로)
//   node progress.js reset            — 계산 결과를 지운 뒤: 학습(fit) 말고는 모두 안 끝난 것으로
//   node progress.js done <단계> [초]  — 단계 끝 표시 (초를 주면 걸린 시간으로 기록)
//   node progress.js tick <단계>       — 진행 줄 갱신만 (runpar를 거치지 않는 단계용)
//   node progress.js save             — 이번 실행에서 잰 단계별 시간을 steptimes.json에 씀
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'prog'),SF=path.join(DIR,'state.json'),TF=path.join(__dirname,'steptimes.json');
const DEPTHS=[4,5,6,7,8,9,10,11,12,13];
const STEPS=['fit','g2',...DEPTHS.flatMap(n=>['g'+n,'f'+n]),'cmp','verify'];
// 큰 단계: 이름과 그 단계의 마지막 세부 단계
const STAGES=[['모델 학습','fit'],['OPEN 1-3','g2'],...DEPTHS.map(n=>['OPEN '+n,'f'+n]),['표 쓰기·비교','cmp'],['검증','verify']];
const DEF={fit:400,g2:3000,g4:400,g5:300,cmp:200,verify:900};for(const n of DEPTHS){DEF['f'+n]=60;if(n>5)DEF['g'+n]=150}
const W=Object.assign({},DEF,fs.existsSync(TF)?JSON.parse(fs.readFileSync(TF,'utf8')):{});
const TOTAL=STEPS.reduce((s,k)=>s+W[k],0);
const load=()=>{try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch(e){return{done:{},meas:{}}}};
const save=s=>{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s))};
const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const day=t=>{const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?'':(d.getMonth()+1)+'/'+d.getDate()+' '};
// 속도 보정: 이번 실행에서 실제로 잰 단계들의 (실제 초 ÷ 예상 초). 잰 게 없으면 1
function speed(s){let a=0,b=0;for(const k in s.meas){if(W[k]>=60){a+=s.meas[k];b+=W[k]}}return b>=300?a/b:1}
// 지금 단계 안의 진행률: 작업 보고값과 시간 기준값 중 큰 값(시간 기준은 0.95까지)
function inFrac(s,step,f){if(!step||s.done[step])return 0;
 const c=s.cur&&s.cur.step===step?s.cur:null,tf=c?Math.min(.95,(Date.now()-c.t)/1000/(W[step]*speed(s))):0;
 return Math.min(1,Math.max(0,f||0,tf))}
function frac(s,step,f){let d=0;for(const k of STEPS)if(s.done[k])d+=W[k];d+=W[step]?W[step]*inFrac(s,step,f):0;return d/TOTAL}
function eta(s,p){return Date.now()+(1-p)*TOTAL*speed(s)*1000}
function line(s,p){const now=Date.now();return Math.floor(p*100+1e-9)+'% 완료 · 현재 '+hm(now)+' · 100% 예상 '+(p>=1?hm(now):day(eta(s,p))+hm(eta(s,p)))}
function report(s,p,force){const pct=Math.floor(p*100+1e-9),now=Date.now();
 if(!force&&pct<=(s.last??-1)&&now-(s.lastT||0)<60000)return;
 s.last=Math.max(pct,s.last??-1);s.lastT=now;console.log(line(s,p))}
function setCur(s,step){if(!s.cur||s.cur.step!==step)s.cur={step,t:Date.now()}}
// 다른 스크립트(runpar.js)가 부름: step 진행 중 frac
function tick(step,f){const s=load();if(!s.t0)return;setCur(s,step);report(s,frac(s,step,f));save(s)}
module.exports={tick,STEPS};
if(require.main===module){const[cmd,step,sec]=process.argv.slice(2);const s=load();
 if(cmd==='start'){s.t0=Date.now();s.meas={};s.cur=null;s.last=-1;s.lastT=0;delete s.done.fit;
  // 판 기록이 지난번과 다르면 모델이 바뀌어 처음부터 다시 계산하게 되므로 끝난 단계도 모두 지움(%가 거꾸로 가지 않게)
  let rh='';try{rh=require('crypto').createHash('sha1').update(fs.readFileSync(path.join(__dirname,'records.txt'))).digest('hex')}catch(e){}
  if(s.rec!==rh){s.done={};s.rec=rh}
  const k=STAGES.filter(([,e])=>s.done[e]).length;
  if(k)console.log('이미 끝난 단계 '+k+'/'+STAGES.length+'는 건너뜀');
  report(s,frac(s),true);save(s)}
 else if(cmd==='reset'){s.done=s.done.fit?{fit:1}:{};s.cur=null;save(s)}
 else if(cmd==='tick'){if(s.t0){setCur(s,step);report(s,frac(s,step,0));save(s)}}
 else if(cmd==='done'){if(!STEPS.includes(step))throw new Error('단계 '+step);
  const was=s.done[step];s.done[step]=1;if(sec!==undefined)s.meas[step]=+sec;
  if(s.cur&&s.cur.step===step)s.cur=null;
  const si=STAGES.findIndex(([,e])=>e===step);
  if(s.t0&&!was&&si>=0){const p=frac(s);s.last=Math.floor(p*100+1e-9);s.lastT=Date.now();
   console.log('■ '+STAGES[si][0]+' 끝 · 전체 '+(si+1)+'/'+STAGES.length+'단계 · '+line(s,p))}
  else if(s.t0)report(s,frac(s));save(s)}
 else if(cmd==='save'){const old=fs.existsSync(TF)?JSON.parse(fs.readFileSync(TF,'utf8')):{};const out={};for(const k of STEPS)out[k]=s.meas[k]!==undefined?Math.max(1,Math.round(s.meas[k])):(old[k]??DEF[k]);
  fs.writeFileSync(TF,JSON.stringify(out,null,1)+'\n');console.log('steptimes.json 갱신 (다음 실행의 진행률 가중치)')}
 else{console.error('사용법: node progress.js start|reset|done <단계> [초]|tick <단계>|save');process.exit(1)}}
