// node apply.js D <tables.js>  — OPENX6~D를 "롤아웃과 다른 칸만" 넣고, 끝에 OPENXD 배열(4번째 수부터의 표 목록)을 둠
const fs=require('fs');const D=+process.argv[2],p=process.argv[3];let s=fs.readFileSync(p,'utf8');
const PAIRS={9:'9,32',10:'10,31',11:'11,30',12:'12,29',13:'13,28',15:'15,26',18:'18,23',19:'19,22',20:'20,21'};
const toKey=(xk,obs)=>xk+'|'+obs.split(',').map(t=>{const m=/^(\d+)([bhfr])([01]?)$/.exec(t);if(!m)throw t;return m[2]=='r'?'r'+m[3]:m[1]+'|'+m[2]}).join('|');
let add='',stat=[];const DROP=fs.existsSync(__dirname+'/drops.json')?JSON.parse(fs.readFileSync(__dirname+'/drops.json')):{};
for(let n=6;n<=D;n++){const T={};let full=0;
 for(const x in PAIRS){const d=JSON.parse(fs.readFileSync(__dirname+'/out'+n+'/g'+n+'.'+x+'.json'));full+=Object.keys(d.T4).length;
  const dr=(DROP[n]&&DROP[n][x])||[];for(const l of d.log)if(l.best!==l.cur&&!dr.includes(l.obs)){const k=toKey(PAIRS[x],l.obs);if(d.T4[k]!==l.best)throw new Error('key mismatch '+k);T[k]=l.best}}
 const e=Object.entries(T).map(([k,v])=>JSON.stringify(k)+':'+v),L=[];for(let i=0;i<e.length;i+=3)L.push(e.slice(i,i+3).join(','));
 add+=`const OPENX${n}={\n${L.join(',\n')}};\n`;stat.push(n+':'+Object.keys(T).length+'/'+full)}
if(s.includes('OPENXD'))throw 'exists';
s=s.replace(/\s*$/,'\n')+`/* 여섯 번째 수부터의 표 — OPENX6~${D}: 같은 2단 롤아웃으로 계산했고, 롤아웃과 다른 칸을 고르는 상태만 넣음(없는 상태는 롤아웃이 같은 칸을 고름).
   단계마다 9쌍 모두 기대 클릭 감소를 확인하고 넣음. 앞 단계 표나 내장 가중치를 바꾸면 다시 계산해야 함 */
${add}const OPENXD=[OPENX4,OPENX5,${Array.from({length:D-5},(_,i)=>'OPENX'+(i+6)).join(',')}]; /* 네 번째 수부터의 표 목록 (prior.js가 openRec에 넘김) */
`;fs.writeFileSync(p,s);console.log('ok',stat.join(' '));
