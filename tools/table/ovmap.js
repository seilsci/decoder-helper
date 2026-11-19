// 작업 폴더(out2, out4~13, drops.json)에서 x쌍의 "상태 해시 → 추천 칸" 맵을 만듦 (tables.js에 실제로 들어간 것과 같은 규칙)
const fs=require('fs');
module.exports=function build(root,x,maxN=13){const DROP=fs.existsSync(root+'/drops.json')?JSON.parse(fs.readFileSync(root+'/drops.json')):{};const OV=new Map();
 const rd=f=>JSON.parse(fs.readFileSync(root+'/'+f)).log;const dr=n=>(DROP[n]&&DROP[n][x])||[];
 for(const l of rd('out2/g2.'+x+'.json'))OV.set(l.hk,l.best);
 for(const n of [4,5])for(const l of rd('out'+n+'/g'+n+'.'+x+'.json'))OV.set(l.hk,dr(n).includes(l.obs)?l.cur:l.best);
 for(let n=6;n<=maxN;n++)for(const l of rd('out'+n+'/g'+n+'.'+x+'.json'))if(l.best!==l.cur&&!dr(n).includes(l.obs))OV.set(l.hk,l.best);return OV};
