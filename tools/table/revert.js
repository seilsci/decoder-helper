// node revert.js <tables.js> [이전 버전 git 커밋, 기본 origin/main]
//   표 쓰기·비교(cmp) 뒤에 부름. 새 표가 이전 표보다 낫지 않은 ✕ 쌍(cmp/c.<쌍>.json의 pf·real 둘 중 하나라도 이득 ≤ 0)은
//   그 쌍의 표(OPENX1~13에서 그 쌍 키 전부)를 이전 버전 표로 되돌림 → 그 쌍은 이전과 똑같이 동작(손해 0)
//   - cmp/c.<쌍>.json에 kept:true, 이득 0으로 다시 씀(검증 1이 "이전 표 유지"로 인정)
//   - baseline.next.json의 그 쌍도 baseline.json(이전 표 기준선) 것으로 바꿈
const fs=require('fs'),path=require('path'),vm=require('vm'),{execFileSync}=require('child_process');
const TB=__dirname,ROOT=path.resolve(TB,'../..'),[tp,OLD='origin/main']=process.argv.slice(2);
if(!tp)throw new Error('사용법: node revert.js <tables.js> [이전 커밋]');
const PAIRS={9:'9,32',10:'10,31',11:'11,30',12:'12,29',13:'13,28',15:'15,26',18:'18,23',19:'19,22',20:'20,21'};
const cmpF=x=>path.join(TB,'cmp','c.'+x+'.json');
const bad=Object.keys(PAIRS).filter(x=>{const d=JSON.parse(fs.readFileSync(cmpF(x),'utf8'));return !(d.gain.pf>0&&d.gain.real>0)});
if(!bad.length){console.log('되돌린 쌍 없음');process.exit(0)}
const load=src=>{const c={};vm.createContext(c);vm.runInContext(src.replace(/^const (OPENX?\d+|OPENXD)=/gm,'this.$1='),c);return c};
let s=fs.readFileSync(tp,'utf8');
const oldSrc=execFileSync('git',['-C',ROOT,'show',OLD+':js/tables.js'],{encoding:'utf8',maxBuffer:1<<28});
const N=load(s),O=load(oldSrc);
const mine=(k,xk)=>k===xk||k.startsWith(xk+'|');
const ser=o=>{const e=Object.entries(o).map(([k,v])=>JSON.stringify(k)+':'+JSON.stringify(v)),L=[];for(let i=0;i<e.length;i+=3)L.push(e.slice(i,i+3).join(','));return '{\n'+L.join(',\n')+'}'};
const stat=[];
for(let n=1;n<=13;n++){const name='OPENX'+n;if(!N[name])continue;if(!O[name])throw new Error('이전 버전에 '+name+' 없음');
 const o={};let moved=0;
 for(const[k,v]of Object.entries(N[name]))if(!bad.some(x=>mine(k,PAIRS[x])))o[k]=v;
 for(const[k,v]of Object.entries(O[name]))if(bad.some(x=>mine(k,PAIRS[x]))){o[k]=v;moved++}
 const re=new RegExp('^const '+name+'=\\{[\\s\\S]*?\\};','m');if(!re.test(s))throw new Error('tables.js: '+name);
 s=s.replace(re,()=>'const '+name+'='+ser(o)+';');stat.push(n+':'+moved)}
fs.writeFileSync(tp,s);
// 되돌린 결과 확인: 그 쌍의 키·값이 이전 표와 똑같은지
const C=load(s);for(let n=1;n<=13;n++){const name='OPENX'+n;if(!C[name])continue;
 for(const x of bad){const a=Object.entries(C[name]).filter(([k])=>mine(k,PAIRS[x])),b=Object.entries(O[name]).filter(([k])=>mine(k,PAIRS[x]));
  if(JSON.stringify(a.sort())!==JSON.stringify(b.sort()))throw new Error('되돌리기 확인 실패: '+name+' 쌍 '+x)}}
for(const x of bad){const d=JSON.parse(fs.readFileSync(cmpF(x),'utf8'));
 fs.writeFileSync(cmpF(x),JSON.stringify({x:+x,kept:true,was:d.gain,old:d.old,new:d.old,gain:{uniform:0,pf:0,real:0}}))}
const bn=path.join(TB,'baseline.next.json'),bo=path.join(TB,'baseline.json');
if(fs.existsSync(bn)&&fs.existsSync(bo)){const B=JSON.parse(fs.readFileSync(bn)),A=JSON.parse(fs.readFileSync(bo));for(const x of bad)B[x]=A[x];fs.writeFileSync(bn,JSON.stringify(B))}
console.log('이전 표로 되돌린 쌍: '+bad.join(',')+' (표별 옮긴 키 '+stat.join(' ')+')');
