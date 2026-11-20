// 진행률 보고: 환경 변수 PROG에 파일 경로가 있으면 0~1 사이 진행률을 그 파일에 씀 (master.sh의 진행 표시용, 3초에 한 번까지, now=true면 바로)
const fs=require('fs'),F=process.env.PROG;let last=0,top=0;
module.exports=(f,now)=>{if(!F||!(f>top))return;top=f;const t=Date.now();if(t-last<3000&&f<1&&!now)return;last=t;try{fs.writeFileSync(F,f.toFixed(4))}catch(e){}};
