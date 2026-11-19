// node fixpair.js n x — n단계 표에서 x쌍의 바뀐 칸을 하나씩 넣어 실제 분포 효과를 재고, 손해인 칸 목록(obs)을 JSON으로 출력
const P=require('./pol.js'),E=require('./eng.js'),fs=require('fs');const n=+process.argv[2],x=+process.argv[3];
const RATE=P.RATE;const EW=E.T.map(([a,b,c])=>RATE[a]*RATE[b]*RATE[c]);
const gl=s=>3-s.filter(v=>v==='gift').length;
const base=new Map();for(const l of JSON.parse(fs.readFileSync(__dirname+'/out2/g2.'+x+'.json')).log)base.set(l.hk,l.best);
if(n>4)for(const l of JSON.parse(fs.readFileSync(__dirname+'/out4/g4.'+x+'.json')).log)base.set(l.hk,l.best);
for(let k=5;k<n;k++)for(const l of JSON.parse(fs.readFileSync(__dirname+'/out'+k+'/g'+k+'.'+x+'.json')).log)base.set(l.hk,l.best);
const st=new Array(42).fill('hidden');st[x]='x';st[41-x]='x';const L0=[];E.T.forEach((t,q)=>{if(!t.includes(x)&&!t.includes(41-x))L0.push(q)});
function ev(ov,W8){const m=new Map();const f=(st,L)=>{if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);const key=E.hashKey(st,L);const h=m.get(key);if(h!==undefined)return h;
 const t=ov.has(key)?ov.get(key):P.eng.decide(st,L);let W=0,S=0;for(const g of P.split(st,L,t)){let w=0;for(const k of g.ls)w+=W8[k];W+=w;S+=w*f(g.s,g.ls)}const v=1+S/W;m.set(key,v);return v};return f(st,L0)}
const v0=ev(base,EW),v0p=ev(base,P.TW);const lg=JSON.parse(fs.readFileSync(__dirname+'/out'+n+'/g'+n+'.'+x+'.json')).log.filter(l=>l.best!==l.cur);
const drop=[];for(const l of lg){const ov=new Map(base);ov.set(l.hk,l.best);const g=v0-ev(ov,EW);if(g<0)drop.push(l.obs)}
const ov=new Map(base);for(const l of lg)if(!drop.includes(l.obs))ov.set(l.hk,l.best);
console.log(JSON.stringify({n,x,changed:lg.length,drop,real:v0-ev(ov,EW),pf:v0p-ev(ov,P.TW)}));
