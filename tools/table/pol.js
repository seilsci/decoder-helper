// 2단 롤아웃 평가: 첫 수 t를 누른 뒤 "지금 롤아웃 정책"을 끝까지 따를 때의 정확한 기대 클릭
// 가중치는 앱의 js/prior.js(PRIOR_U / PRIOR_SP, 평가용 PRIOR_CNT / PRIOR_EXPO)에서 읽음 → fitmodel.js --write로 prior.js만 갱신하면 됨
const E=require('./eng.js');
const _pr=require('fs').readFileSync(require('path').join(__dirname,'../../js/prior.js'),'utf8');
const _arr=n=>{const m=_pr.match(new RegExp('const '+n+'=(\\[[^\\]]*\\])'));if(!m)throw new Error('prior.js: '+n);return JSON.parse(m[1])};
const PRIOR_CNT=_arr('PRIOR_CNT'),PRIOR_EXPO=_arr('PRIOR_EXPO'),PRIOR_U=_arr('PRIOR_U'),SP0=_arr('PRIOR_SP');
// 기억(PRIOR_MEM, PRIOR_SEEN)이 있으면 rollout.js의 rollSP와 같이 [계수 9개, κ, 기억한 당첨 세 칸...]로 붙임
const _mem=_pr.match(/const PRIOR_MEM=([^;]*);/),SEEN=/const PRIOR_SEEN=/.test(_pr)?_arr('PRIOR_SEEN'):[];
const SPH=SP0.slice(0,9);while(SPH.length<9)SPH.push(1); // 계수 9개(예전 5·7개짜리면 없는 계수는 1)
const SP=SP0.length>4&&_mem&&SEEN.length?SPH.concat([+_mem[1]],SEEN):SPH;
const RATE=PRIOR_CNT.map((c,i)=>c/PRIOR_EXPO[i]); // 실제 당첨률(평가용, 간격 계수와 함께 씀)
const PF=PRIOR_U.map(Math.exp);
// ✕ 쌍별 칸 가중치(PRIOR_XW): 이 프로세스가 맡은 ✕ 쌍(환경 변수 XP = 작은 쪽 칸 번호, runpar.js가 넣음)의 줄을 곱함. 앱의 pfFor와 같음
const XW=/const PRIOR_XW=\[\[/.test(_pr)?JSON.parse(_pr.match(/const PRIOR_XW=(\[[^;]*\]);/)[1]):[],PXS=JSON.parse((_pr.match(/const PRIOR_PX=(\[[^\]]*\])/)||[0,'[9,10,11,12,13,15,18,19,20]'])[1]);
const XQ=process.env.XP!==undefined?PXS.indexOf(+process.env.XP):-1;
if(XW.length&&XQ<0)throw new Error('pol.js: prior.js에 ✕ 쌍별 가중치(PRIOR_XW)가 있어 ✕ 쌍을 알아야 합니다. XP=<쌍> 환경 변수를 넣으세요(runpar.js는 자동으로 넣음). 지금 XP='+process.env.XP);
const PW=XW.length&&XQ>=0?PF.map((v,i)=>v*XW[XQ][i]):PF;
const eng=E.makeEngine({PW,SP});
const TW=E.weights(PW,SP);
const RTW=E.weights(XW.length&&XQ>=0?RATE.map((v,i)=>v*XW[XQ][i]):RATE,SP); // 실제 당첨률 × 간격·좌우·세 구역 계수 + 기억(평가용)
const gl=st=>3-st.filter(s=>s==='gift').length;
let nodes=0;const pm=new Map();
function split(st,L,t){const ctx=E.ctxOf(st),wn=E.warnNb(t,ctx),bk=new Map();for(const k of L){const c=E.outcome(k,t,ctx,wn);let g=bk.get(c);if(!g)bk.set(c,g={c,ls:[],w:0});g.ls.push(k);g.w+=TW[k]}
 return[...bk.values()].map(g=>{const s=st.slice();E.applyStates(s,t,g.c,wn);return{s,ls:g.ls,w:g.w}})}
function pol(st,L){if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);
 const key=E.hashKey(st,L);const h=pm.get(key);if(h!==undefined)return h;nodes++;
 const t=eng.decide(st,L);let W=0,S=0;for(const g of split(st,L,t)){W+=g.w;S+=g.w*pol(g.s,g.ls)}const v=1+S/W;pm.set(key,v);return v}
function q2(st,L,t){let W=0,S=0;for(const g of split(st,L,t)){W+=g.w;S+=g.w*pol(g.s,g.ls)}return 1+S/W}
module.exports={pol,q2,eng,split,PF,PW,XQ,SP,TW,RTW,RATE,stats:()=>({nodes,pm:pm.size})};
if(require.main===module){
 const xs=[+process.argv[2],41-process.argv[2]],t=+process.argv[3];
 const st=new Array(42).fill('hidden');st[xs[0]]='x';st[xs[1]]='x';const L=[];E.T.forEach((tr,q)=>{if(!tr.includes(xs[0])&&!tr.includes(xs[1]))L.push(q)});
 const t0=Date.now();const v=q2(st,L,t);console.log(JSON.stringify({xs,t,v,ms:Date.now()-t0,...module.exports.stats()}))}
// 표(override: 상태 해시 → 칸)를 먼저 쓰고 없으면 롤아웃 정책
function polOv(ov){const m=new Map();const f=(st,L)=>{if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);
 const key=E.hashKey(st,L);const h=m.get(key);if(h!==undefined)return h;const t=ov.has(key)?ov.get(key):eng.decide(st,L);
 let W=0,S=0;for(const g of split(st,L,t)){W+=g.w;S+=g.w*f(g.s,g.ls)}const v=1+S/W;m.set(key,v);return v};return f}
module.exports.polOv=polOv;
// 하한: 남은 선물 수 + (확정 칸이 없으면) 첫 클릭이 꽝일 확률 ≥ 1 − max P(선물). 어떤 정책의 기대 클릭도 이보다 작을 수 없음
function lb(st,L){const left=gl(st);if(left<=0||!L.length)return 0;if(L.length===1)return left;
 const g=new Float64Array(42);let W=0;for(const k of L){const w=TW[k],t=E.T[k];W+=w;g[t[0]]+=w;g[t[1]]+=w;g[t[2]]+=w}
 let pm=0;for(let t=0;t<42;t++)if(st[t]==='hidden'&&g[t]>pm)pm=g[t];pm/=W;return left+(pm>=1-1e-12?0:1-pm)}
module.exports.lb=lb;
