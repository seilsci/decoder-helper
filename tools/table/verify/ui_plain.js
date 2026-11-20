const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()=='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text()))errs.push(m.text())});
await p.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../../../index.html')).href);await p.waitForTimeout(800);
await p.evaluate(()=>{S.lang='ko';render()});
const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const EXOFF=process.argv[3]=='off';if(EXOFF)await p.evaluate(()=>{EX_MAXN=0});
const REC=JSON.parse(require('fs').readFileSync(__dirname+'/records.json'));
const sim=(process.env.SIMF?[0,1]:[0,1,2,3]).flatMap(i=>JSON.parse(require('fs').readFileSync(__dirname+'/out/'+(process.env.SIMF||'x6C')+'.'+i+'.json')).res);
const PAIRS=[[9,32],[10,31],[11,30],[12,29],[13,28],[15,26],[18,23],[19,22],[20,21]],XW=[26,19,28,30,26,25,26,29,49];
const RATE=REC.cnt.map((c,i)=>c/REC.ex[i]);const T=[];for(let a=0;a<42;a++)for(let b=a+1;b<42;b++)for(let c=b+1;c<42;c++)T.push([a,b,c]);
const games=+process.argv[2];let match=0,firstWait=0,maxWait=0;const rows=[],dbgs=new Set();
for(let g=0;g<games;g++){
 let s=(g*2654435761+12345)>>>0;const rnd=n=>{s=(Math.imul(s,1103515245)+12345)>>>0;return (s>>>8)%n};
 let r=rnd(258),k=0;while(r>=XW[k]){r-=XW[k];k++}const xs=PAIRS[k];
 const ls=[],cum=[];let sum=0;for(const t of T){if(t.some(i=>xs.includes(i)))continue;sum+=RATE[t[0]]*RATE[t[1]]*RATE[t[2]];ls.push(t);cum.push(sum)}
 const u=(rnd(1<<23)+rnd(1<<23)/(1<<23))/(1<<23)*sum;let lo=0,hi=cum.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cum[m]<u)lo=m+1;else hi=m}const t=ls[lo];
 await p.click('[data-a="reset"]');
 for(const x of xs)await p.click(`polygon[data-i="${x}"]`);
 await p.click('[data-a="hint"]');
 for(let step=0;step<60;step++){
  const t0=Date.now();await p.waitForFunction(()=>!S.busy,null,{timeout:300000});const w=Date.now()-t0;maxWait=Math.max(maxWait,w);if(step==0)firstWait=Math.max(firstWait,w);
  
  const st=await p.evaluate(()=>({done:found().length>=3,q:pend()[0],rec:S.rec}));
  if(st.done)break;
  if(st.q!==undefined){const on=await p.evaluate(({q,t})=>NB[q].some(j=>t.includes(j)&&!found().includes(j)),{q:st.q,t});await p.click(on?'[data-a="Q:h"]':'[data-a="Q:b"]');continue}
  if(st.rec==null||st.rec<0)throw new Error('no rec g='+g);
  const truth=await p.evaluate(({i,t})=>t.includes(i)?'f':NB[i].some(j=>t.includes(j)&&!found().includes(j))?'h':'b',{i:st.rec,t});
  await p.click(`polygon[data-i="${st.rec}"]`);
  if(await p.evaluate(()=>S.sel!=null)){const m=await p.$(`#msg button[data-a="${truth}"]`);if(!m)throw new Error('truth button missing');await m.click()}}
 const c=await p.evaluate(()=>clicks());rows.push(c);if(c===sim[g])match++}
console.log(JSON.stringify({exhaustive:!EXOFF,games,matchSim:match,ui:rows.join(','),sim:sim.slice(0,games).join(','),firstMoveWaitMs:firstWait,maxWaitMs:maxWait,dbg:[...dbgs],errs:errs.slice(0,5)}));await b.close()})();
