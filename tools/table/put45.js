// node put45.js n <tables.js> — OPENX4/5를 새 계산값으로 교체 (drops.json의 손해 칸은 롤아웃 선택 cur로)
const fs=require('fs');const n=+process.argv[2],p=process.argv[3];let s=fs.readFileSync(p,'utf8');
const PAIRS={9:'9,32',10:'10,31',11:'11,30',12:'12,29',13:'13,28',15:'15,26',18:'18,23',19:'19,22',20:'20,21'};
const DROP=fs.existsSync(__dirname+'/drops.json')?JSON.parse(fs.readFileSync(__dirname+'/drops.json')):{};
const toKey=(xk,obs)=>xk+'|'+obs.split(',').map(t=>{const m=/^(\d+)([bhfr])([01]?)$/.exec(t);if(!m)throw t;return m[2]=='r'?'r'+m[3]:m[1]+'|'+m[2]}).join('|');
const T={};let nd=0;
for(const x in PAIRS){const d=JSON.parse(fs.readFileSync(__dirname+'/out'+n+'/g'+n+'.'+x+'.json'));Object.assign(T,d.T4);
 for(const o of ((DROP[n]&&DROP[n][x])||[])){const l=d.log.find(l=>l.obs===o);const k=toKey(PAIRS[x],o);if(!l||T[k]!==l.best)throw new Error('drop key '+k);T[k]=l.cur;nd++}}
const e=Object.entries(T).map(([k,v])=>JSON.stringify(k)+':'+v),L=[];for(let i=0;i<e.length;i+=3)L.push(e.slice(i,i+3).join(','));
const re=new RegExp('const OPENX'+n+'=\\{[\\s\\S]*?\\};');if(!re.test(s))throw new Error('no OPENX'+n);
s=s.replace(re,()=>'const OPENX'+n+'={\n'+L.join(',\n')+'};');fs.writeFileSync(p,s);
const vm=require('vm'),c={};vm.createContext(c);vm.runInContext(s+';this.O=OPENX'+n,c);if(JSON.stringify(c.O)!==JSON.stringify(T))throw new Error('verify');
console.log('OPENX'+n,Object.keys(T).length,'keys, dropped',nd);
