// 2단 롤아웃 평가: 첫 수 t를 누른 뒤 "지금 롤아웃 정책"을 끝까지 따를 때의 정확한 기대 클릭
// 가중치는 앱의 js/prior.js(PRIOR_U / PRIOR_SP, 평가용 PRIOR_CNT / PRIOR_EXPO)에서 읽음 → fitmodel.js --write로 prior.js만 갱신하면 됨
const E=require('./eng.js');
const _pr=require('fs').readFileSync(require('path').join(__dirname,'../../js/prior.js'),'utf8');
const _arr=n=>{const m=_pr.match(new RegExp('const '+n+'=(\\[[^\\]]*\\])'));if(!m)throw new Error('prior.js: '+n);return JSON.parse(m[1])};
const PRIOR_CNT=_arr('PRIOR_CNT'),PRIOR_EXPO=_arr('PRIOR_EXPO'),PRIOR_U=_arr('PRIOR_U'),SP=_arr('PRIOR_SP');
const RATE=PRIOR_CNT.map((c,i)=>c/PRIOR_EXPO[i]); // 실제 당첨률(평가용, 간격 계수와 함께 씀)
const PF=PRIOR_U.map(Math.exp);
const eng=E.makeEngine({PW:PF,SP});
const TW=E.T.map(([a,b,c])=>PF[a]*PF[b]*PF[c]*E.spf(SP,a,b)*E.spf(SP,a,c)*E.spf(SP,b,c)*E.sdf(SP,a,b,c));
const RTW=E.T.map(([a,b,c])=>RATE[a]*RATE[b]*RATE[c]*E.spf(SP,a,b)*E.spf(SP,a,c)*E.spf(SP,b,c)*E.sdf(SP,a,b,c)); // 실제 당첨률 × 간격·좌우 계수(평가용)
const gl=st=>3-st.filter(s=>s==='gift').length;
let nodes=0;const pm=new Map();
function split(st,L,t){const ctx=E.ctxOf(st),wn=E.warnNb(t,ctx),bk=new Map();for(const k of L){const c=E.outcome(k,t,ctx,wn);let g=bk.get(c);if(!g)bk.set(c,g={c,ls:[],w:0});g.ls.push(k);g.w+=TW[k]}
 return[...bk.values()].map(g=>{const s=st.slice();E.applyStates(s,t,g.c,wn);return{s,ls:g.ls,w:g.w}})}
function pol(st,L){if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);
 const key=E.hashKey(st,L);const h=pm.get(key);if(h!==undefined)return h;nodes++;
 const t=eng.decide(st,L);let W=0,S=0;for(const g of split(st,L,t)){W+=g.w;S+=g.w*pol(g.s,g.ls)}const v=1+S/W;pm.set(key,v);return v}
function q2(st,L,t){let W=0,S=0;for(const g of split(st,L,t)){W+=g.w;S+=g.w*pol(g.s,g.ls)}return 1+S/W}
module.exports={pol,q2,eng,split,PF,SP,TW,RTW,RATE,stats:()=>({nodes,pm:pm.size})};
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
