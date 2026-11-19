// node cmp.js x — 기준선(baseline.json = 지금 main의 표) vs 이번 계산 표. 둘 다 지금 prior.js 가중치의 롤아웃과 함께
// 판 전체 정확 기대 클릭을 [균등, pf, 실제 당첨률] 세 가지로 계산
const E=require('./eng.js'),P=require('./pol.js'),fs=require('fs'),build=require('./ovmap.js');const x=+process.argv[2];
const W3=[E.T.map(()=>1),P.TW,P.RTW];const gl=s=>3-s.filter(v=>v==='gift').length;
function ev(OV){const memo=new Map();const f=(st,L)=>{if(gl(st)<=0||!L.length)return[0,0,0];if(L.length===1)return[gl(st),gl(st),gl(st)];const key=E.hashKey(st,L);const h=memo.get(key);if(h)return h;
 const t=OV.has(key)?OV.get(key):P.eng.decide(st,L);const W=[0,0,0],S=[0,0,0];for(const g of P.split(st,L,t)){const v=f(g.s,g.ls);for(let j=0;j<3;j++){let w=0;for(const k of g.ls)w+=W3[j][k];W[j]+=w;S[j]+=w*v[j]}}
 const v=W.map((w,j)=>1+S[j]/w);memo.set(key,v);return v};
 const st=new Array(42).fill('hidden');st[x]='x';st[41-x]='x';const L=[];E.T.forEach((t,q)=>{if(!t.includes(x)&&!t.includes(41-x))L.push(q)});return f(st,L)}
const base=new Map(JSON.parse(fs.readFileSync(process.env.BASE||__dirname+'/baseline.json'))[x]);
const a=ev(base),b=ev(build(process.env.ROOT||__dirname,x));
console.log(JSON.stringify({x,old:a,new:b,gain:{uniform:a[0]-b[0],pf:a[1]-b[1],real:a[2]-b[2]}}));
