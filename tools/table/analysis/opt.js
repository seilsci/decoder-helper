// 2. 이론상 최선과의 차이 추정: node opt.js <x> <판 수> [main|branch] [시드]
//  main 모드는 ../verify/out/old/js/(main의 js, verify/checkall.js가 풂)와 ../baseline.json(main의 표)을 씀. branch 모드는 ../out*/(master.sh 계산 결과)
//  환경 변수 OUT=파일 이면 판마다 중간 결과를 씀, VERB=1 이면 결정마다 시간 출력
//  정답 분포 = 현재 모델(저장소 prior.js: 칸 가중치 × 간격 × 좌우) — pol.js의 TW
//  앱 정책 π = 표(OV, 상태 해시 → 칸) 있으면 그 칸, 없으면 롤아웃(main: main의 prior.js 가중치 / branch: 현재 가중치)
//  V^π: π를 끝까지 따를 때의 정확한 기대 클릭(메모). Q^π(s,t) = 1 + Σ 결과 확률 × V^π(다음 상태)
//  π' = 각 상태에서 Q^π가 가장 작은 칸(= 지금 앱 위에 한 단계 더 내다보는 탐색). 성능 차 보조정리로
//  V^π − V^π' = E_{π'를 따라간 판}[Σ (Q^π(s,π(s)) − min_t Q^π(s,t))]  → 같은 시드 판들에서 평균
const fs=require('fs');const TBL=require('path').resolve(__dirname,'..');
const E=require(TBL+'/eng.js'),P=require(TBL+'/pol.js'),build=require(TBL+'/ovmap.js');
const x=+process.argv[2],NG=+process.argv[3],MODE=process.argv[4]||'main';let seed=(+process.argv[5]||1)*7919+x;
const arr=(s,n)=>JSON.parse(s.match(new RegExp('const '+n+'=(\\[[^\\]]*\\])'))[1]);
let OV,dec;
if(MODE==='main'){const s=fs.readFileSync(TBL+'/verify/out/old/js/prior.js','utf8');const eo=E.makeEngine({PW:arr(s,'PRIOR_U').map(Math.exp),SP:arr(s,'PRIOR_SP')});dec=eo.decide;OV=new Map(JSON.parse(fs.readFileSync(TBL+'/baseline.json'))[x])}
else{dec=P.eng.decide;OV=build(TBL,x)}
const pol=(st,L)=>{const k=E.hashKey(st,L);return OV.has(k)?OV.get(k):dec(st,L)};
const gl=st=>3-st.filter(v=>v==='gift').length;
let memo=new Map();
function V(st,L){if(gl(st)<=0||!L.length)return 0;if(L.length===1)return gl(st);const k=E.hashKey(st,L);const h=memo.get(k);if(h!==undefined)return h;
 const t=pol(st,L);let W=0,S=0;for(const g of P.split(st,L,t)){W+=g.w;S+=g.w*V(g.s,g.ls)}const v=1+S/W;if(memo.size>2e6)memo=new Map();memo.set(k,v);return v}
function Q(st,L,t,bound=Infinity){const gs=P.split(st,L,t).sort((a,b)=>b.w-a.w);let W=0,lb=0;for(const g of gs){W+=g.w;lb+=g.w*P.lb(g.s,g.ls)}
 let S=0;for(const g of gs){lb-=g.w*P.lb(g.s,g.ls);S+=g.w*V(g.s,g.ls);if(1+(S+lb)/W>=bound-1e-12)return Infinity}return 1+S/W}
const S0=st=>st.filter(v=>v!=="hidden"&&v!=="x").length;
const DC=new Map();let msDec=0,nDec=0,msMax=0,cacheHit=0;
function decide(st,L){const k=E.hashKey(st,L);if(DC.has(k)){cacheHit++;return DC.get(k)}const t0=Date.now();
 const a=pol(st,L),qa=Q(st,L,a);let best=qa,bt=a;
 // 후보 순서: 한 수 앞 하한이 작은 칸부터 (가지치기 잘 되게)
 const cand=[];for(let i=0;i<42;i++)if(st[i]==='hidden'&&i!==a)cand.push(i);
 for(const t of cand){const q=Q(st,L,t,best);if(q<best-1e-12){best=q;bt=t}}
 const ms=Date.now()-t0;if(process.env.VERB)console.error("  dec",S0(st),L.length,"ms",ms,"A",(qa-best).toFixed(5));msDec+=ms;nDec++;msMax=Math.max(msMax,ms);const r={a,qa,bt,best};DC.set(k,r);return r}
const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;const a=seed>>>8;seed=(Math.imul(seed,1103515245)+12345)>>>0;return(a*16777216+(seed>>>8))/2**48};
const st0=new Array(42).fill('hidden');st0[x]='x';st0[41-x]='x';const L0=[];E.T.forEach((t,q)=>{if(!t.includes(x)&&!t.includes(41-x))L0.push(q)});
const cw=[];{let s=0;for(const k of L0){s+=P.TW[k];cw.push(s)}}
const t00=Date.now();const vRoot=V(st0,L0);const msRoot=Date.now()-t00;
const byIdx=[],cntIdx=[];let sumA=0,sumClicksAlt=0,changed=0;
for(let g=0;g<NG;g++){const u=rnd()*cw[cw.length-1];let lo=0,hi=cw.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cw[m]<u)lo=m+1;else hi=m}const yk=L0[lo];
 let st=st0,L=L0,c=0;
 while(gl(st)>0&&L.length>1){c++;const r=decide(st,L),A=r.qa-r.best;sumA+=A;byIdx[c]=(byIdx[c]||0)+A;cntIdx[c]=(cntIdx[c]||0)+1;if(r.bt!==r.a)changed++;
  const grp=P.split(st,L,r.bt).find(q=>q.ls.includes(yk));st=grp.s;L=grp.ls}
 if(gl(st)>0)c+=gl(st);sumClicksAlt+=c;
 if(process.env.OUT)fs.writeFileSync(process.env.OUT,JSON.stringify({x,mode:MODE,done:g+1,games:NG,vRoot,meanA:sumA/(g+1),meanClicksAlt:sumClicksAlt/(g+1),changedPerGame:changed/(g+1),byIdx:byIdx.map(v=>v/(g+1)),decisions:nDec,cacheHit,msPerDec:msDec/Math.max(1,nDec),msMax,sec:(Date.now()-t00)/1000}));
 if(process.env.VERB)console.error(x,'game',g,'clicks',c,'meanA',(sumA/(g+1)).toFixed(4),'dec',nDec,'s',((Date.now()-t00)/1000|0))}
console.log(JSON.stringify({x,mode:MODE,games:NG,vRoot,msRoot,meanA:sumA/NG,meanClicksAlt:sumClicksAlt/NG,changedPerGame:changed/NG,byIdx:byIdx.map((v,i)=>v/NG),cntIdx,decisions:nDec,cacheHit,msPerDec:msDec/Math.max(1,nDec),msMax,secTotal:(Date.now()-t00)/1000}));
