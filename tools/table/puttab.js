// node puttab.js <tables.js 경로>  — OPENX1~3을 2단 롤아웃 표로 교체
const fs=require("fs");const N=JSON.parse(fs.readFileSync(__dirname+"/out2/tables2.json"));const p=process.argv[2];let s=fs.readFileSync(p,"utf8");
const fmt3=o=>{const e=Object.entries(o).map(([k,v])=>JSON.stringify(k)+":"+v),L=[];for(let i=0;i<e.length;i+=3)L.push(e.slice(i,i+3).join(","));return"{\n"+L.join(",\n")+"}"};
const rep=(name,txt)=>{const re=new RegExp("const "+name+"=\\{[\\s\\S]*?\\};");if(!re.test(s))throw new Error("no "+name);s=s.replace(re,()=>"const "+name+"="+txt+";")};
rep("OPENX1",JSON.stringify(N[0]));rep("OPENX2",JSON.stringify(N[1]));rep("OPENX3",fmt3(N[2]));fs.writeFileSync(p,s);
const vm=require("vm"),c={};vm.createContext(c);vm.runInContext(s+";this.O=[OPENX1,OPENX2,OPENX3,typeof OPEN1]",c);
for(let i=0;i<3;i++)if(JSON.stringify(c.O[i])!==JSON.stringify(N[i]))throw new Error("verify "+i);console.log("ok",c.O[3],Object.keys(c.O[2]).length);
