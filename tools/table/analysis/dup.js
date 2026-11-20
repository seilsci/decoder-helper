// 1a. 같은 판 반복: 실제 겹침 수 vs 현재 모델로 303판을 1만 번 뽑았을 때의 겹침 수
// node dup.js [records.txt]
const H=require('./hyp.js');const{G,N,T,LP,PAIRS,BASE}=H;
const m={names:BASE},TB=H.table(BASE),par=H.fit(G,m,TB);
// 쌍별 누적 분포(모델 / 균등)
function cum(p,model){const L=LP[p],M=TB[p].M,c=new Float64Array(L.length);let s=0;for(let q=0;q<L.length;q++){let w=1;if(model){const[a,b,cc]=T[L[q]];let e=par.u[a]+par.u[b]+par.u[cc];for(let j=0;j<4;j++)e+=M[q*4+j]*par.th[j];w=Math.exp(e)}s+=w;c[q]=s}return c}
const CM=PAIRS.map((_,p)=>cum(p,true)),CU=PAIRS.map((_,p)=>cum(p,false));
const xw=PAIRS.map((_,p)=>G.filter(g=>g.p===p).length);
let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;const a=seed>>>8;seed=(Math.imul(seed,1103515245)+12345)>>>0;return(a*16777216+(seed>>>8))/2**48};
const pick=c=>{const u=rnd()*c[c.length-1];let lo=0,hi=c.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(c[mid]<u)lo=mid+1;else hi=mid}return lo};
const pairsOf=a=>{const m=new Map();for(const k of a)m.set(k,(m.get(k)||0)+1);let s=0;for(const v of m.values())s+=v*(v-1)/2;return s};
function count(games){return{xy:pairsOf(games.map(g=>g.p*1e5+g.y)),y:pairsOf(games.map(g=>g.y)),x:pairsOf(games.map(g=>g.p))}}
const real=count(G);
// ✕ 쌍은 실제 쌍 빈도대로(xMode='emp') 또는 9쌍 균등(xMode='uni')
function sim(model,xMode,R=10000){const acc={xy:[],y:[],x:[]};const xc=[];let s=0;for(const w of(xMode==='emp'?xw:PAIRS.map(()=>1))){s+=w;xc.push(s)}
 for(let r=0;r<R;r++){const gs=[];for(let i=0;i<N;i++){const u=rnd()*s;let p=0;while(xc[p]<=u)p++;gs.push({p,y:LP[p][pick(model?CM[p]:CU[p])]})}const c=count(gs);for(const k in acc)acc[k].push(c[k])}
 const st=a=>{const m=a.reduce((x,y)=>x+y)/a.length,sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);return{mean:+m.toFixed(2),sd:+sd.toFixed(2)}};
 return Object.fromEntries(Object.entries(acc).map(([k,a])=>[k,{...st(a),pGE:+(a.filter(v=>v>=real[k]).length/a.length).toFixed(4)}]))}
// 실제 겹치는 판
const dupList=[];for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)if(G[i].y===G[j].y)dupList.push({i:i+1,j:j+1,sameX:G[i].p===G[j].p,a:G[i].line,b:G[j].line});
console.log(JSON.stringify({real,xw,model:sim(true,'emp'),uniformY:sim(false,'emp'),xUniform:sim(true,'uni',2000).x,dupList},null,1));
