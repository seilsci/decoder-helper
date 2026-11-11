/* 화면 / 입력 — 상태(S), 그리기(render), 탭·버튼 처리, 시작 코드. 마지막에 render()로 시작 */
/* 언어 검색용 국가 코드: 언어코드 -> [ISO alpha-2, alpha-3, 숫자]. 언어 추가할 때 여기도 같이 추가 */
const LCODES=(typeof LC!=='undefined')?LC:{}; /* 국가 코드는 lang.js의 LC를 그대로 사용 */
if(typeof LC2!=='undefined')for(const k in LC2)LCODES[k]=[...new Set((LCODES[k]||[]).concat(LC2[k]))]; /* lang2.js가 이미 이어 붙였어도 중복 없이 */
const LRTL=['ar','he','fa','prs','ps','ug','yi','ckb','sd','ur','dv']; /* 오른쪽→왼쪽 언어: 안내 메시지·하단 카운트 방향 */
const LBRK=s=>s.replace(/([.。।։።།។။۔])\s*(?=\S)/g,'$1<br>'); /* 문장 끝 부호: . 。 । ։ ። ། ។ ။ ۔ */
const LPG=18; /* 한 페이지 개수: 기존 언어 18개가 1페이지, 추가 언어는 2페이지부터 */
function load(){try{const v=localStorage.getItem('dh_lang');if(v&&L[v])return v}catch(e){}return'ko'}
function save(){try{localStorage.setItem('dh_lang',S.lang)}catch(e){}}
let S;
function init(){S={lang:S?S.lang:load(),ov:false,q:'',pg:0,sh:[],mode:'setup',tool:'x',xs:new Set(),hs:new Set(),bs:new Set(),os:new Set(),fs:new Set(),obs:[],n0:0,rec:null,sel:null,ex:null}}
init();
function go(){if(!pend().length)hint()}

/* 언어 목록: 기본 순서(LG 묶음 순서 + 나머지). 검색어가 있으면 일치하는 언어를 맨 위로 */
function langList(){
 const used=new Set(LG.flat()),base=LG.flat().concat(Object.keys(L).filter(k=>!used.has(k))).filter(k=>L[k]);
 const q=S.q.trim().toUpperCase(),ql=S.q.trim().toLowerCase();
 if(!q)return base;
 const rk=k=>{const cs=(LCODES[k]||[]).map(c=>c.toUpperCase());
  if(cs.includes(q))return 0;
  if(q.length>=2&&cs.some(c=>c.startsWith(q)))return 1;
  if(L[k].lang.toLowerCase().includes(ql))return 2;
  return 9};
 return base.map((k,i)=>[rk(k),i,k]).filter(a=>a[0]<9).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(a=>a[2])}
function buildLg(){
 ov.innerHTML='<div class="lgl"><div class="lgh">Enter your country code to find your language.<br>e.g. Korean: KR or KOR</div><input id="lq" type="text" placeholder="KR / KOR" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"><div class="lgg" id="lgb"></div><div class="lpg"><button data-a="pg:-1" id="lpp">◀</button><span id="lpi"></span><button data-a="pg:1" id="lpn">▶</button></div></div>'}
function fillLg(){
 const a=langList(),P=Math.max(1,Math.ceil(a.length/LPG));
 S.pg=((S.pg%P)+P)%P; /* 순환: 1페이지에서 ◀ → 마지막, 마지막에서 ▶ → 1페이지 */
 document.getElementById('lgb').innerHTML=a.length?a.slice(S.pg*LPG,S.pg*LPG+LPG).map(k=>`<button data-a="L:${k}"${k==S.lang?' class="p"':''}>${L[k].lang}</button>`).join(''):'<div class="lgh" style="grid-column:1/-1">No match</div>';
 document.getElementById('lpi').textContent=(S.pg+1)+' / '+P}

function render(){
 const t=L[S.lang],play=S.mode=='play',A=play?analyze():null,PQ=play?pend():[];
 document.documentElement.lang=S.lang;
 ti.textContent=t.t;lg.textContent='🌐 '+t.lang;bh.textContent=t.hint;bu.textContent=t.undo;br.textContent=t.reset;
 const pm=A&&A.N?Math.max(...A.p,.01):1;let g='';const CF=(play&&S.imp)?S.imp.cells:(A&&!A.N&&!S.sure)?conflict():[];
 C.forEach((q,i)=>{
  const cx=q.x*40+20,cy=q.r*34.64+23,s=st=state(i),sw=21.4,w=18.6;
  let fill='#ffb300',op=.55,tx='',tc='#fff';
  if(s=='x'){fill='#2a2a2a';op=1;tx='✕';tc='#888'}
  else if(s=='o'){fill='#241f14';op=1}
  else if(s=='h'){fill='#241f14';op=1;tx='!';tc='#ffb300'}
  else if(s=='f'){fill='#ffb300';op=1;tx='★';tc='#1a1300'}
  else if(A&&A.N){op=.18+.82*A.p[i]/pm;tx=Math.round(A.p[i]*100)}
  const pts=[[0,-sw],[w,-sw/2],[w,sw/2],[0,sw],[-w,sw/2],[-w,-sw/2]].map(p=>(cx+p[0]).toFixed(1)+','+(cy+p[1]).toFixed(1)).join(' ');
  g+=`<polygon data-i="${i}" class="${S.rec===i?'rec':''}" points="${pts}" fill="${fill}" fill-opacity="${op}"${S.sel===i||PQ[0]===i?' style="stroke:#fff;stroke-width:3.5"':CF.includes(i)?' style="stroke:#ef4444;stroke-width:3.5"':''}/>`;
  if(tx!=='')g+=`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${s=='c'?9:14}" font-weight="700" fill="${tc}" pointer-events="none">${tx}</text>`});
 bd.innerHTML=g;
 let m;
 const nt='';
 if(!play)m=LBRK(t.tip0)+`<div class="st">${(t.st||L.en.st).replace(/([.。।։።།។။۔])\s*/,'$1<br>')}</div>`+xmNote();
 else if(S.busy)m=t.calc+progHtml(t);
 else if(PQ.length)m=`<b>${LB(t,PQ[0])}</b> — ${t.qn||L.en.qn}<div class="row eq"><button data-a="Q:b">${t.b}</button><button class="p" data-a="Q:h">${t.h}</button></div>`+oops(t);
 else if(S.imp)m=F(t[{many:'need4',noplace:'nopl',fin3:'fin3'}[S.imp.k]]||L.en[{many:'need4',noplace:'nopl',fin3:'fin3'}[S.imp.k]],{n:S.imp.n})+(CF.length?`<div class="nt2">${CF.map(i=>LB(t,i)).join(' · ')}</div>`:'');
 else if(found().length==3)m=t.done+oops(t);
 else if(S.sel!=null){const q=C[S.sel];
  m=`<b>${LB(t,S.sel)}</b> — ?<div class="row eq"><button data-a="b">${t.b}</button><button data-a="h">${t.h}</button><button class="p" data-a="f">${t.f}</button><button data-a="cancel">✕</button></div>`}
 else if(A.N==0&&!S.fb)m=LBRK(t.bad)+(CF.length?`<div class="nt2">${t.badc||L.en.badc}: ${CF.map(i=>LB(t,i)).join(' · ')}</div>`:'')+nt;
 else if(S.rec!=null&&S.rec>=0){const q=C[S.rec];m=F(t.rec,{c:LB(t,S.rec),p:S.fb?Math.round(S.fbp*100):Math.round(A.p[S.rec]*100)})+(S.fb&&!S.sure?`<div class="nt">${t.fbn||L.en.fbn}${CF.length?': '+CF.map(i=>LB(t,i)).join(' · '):''}</div>`:'')+exNote(t)+oops(t)+nt+(nt?'':`<div class="nt2">${LBRK(t.tip1.replace(/^[^.。।]*[.。।։።།។။۔]\s*/,''))}</div>`)}
 else m=LBRK(t.tip1)+nt;
 msg.innerHTML=m;msg.dir=cn.dir=LRTL.includes(S.lang)?'rtl':'ltr';
 cn.textContent=play?F(t.n,{a:S.obs.filter(o=>'bhf'.includes(o.k)&&!o.manual).length-S.n0,b:found().length}):'';
 tl.hidden=play;
 if(!play)tl.innerHTML=['x','h','b','f'].map(k=>`<button data-a="T:${k}"${S.tool==k?' class="p"':''}>${k=='x'?'✕':k=='h'?'!':k=='b'?'○ '+t.b:'★ '+t.f}</button>`).join('');
 ov.hidden=!S.ov;
 if(!S.ov)ov.innerHTML='';
 else{if(!ov.firstChild)buildLg();fillLg()}
}

function tap(i){
 if(S.mode=='play'&&pend().length)return;
 if(S.mode=='play'&&S.fb&&i===S.rec){S.sel=i;return}
 if(S.mode=='setup'){
  const tl=S.tool,M={x:S.xs,h:S.hs,b:S.bs,f:S.fs},has=M[tl].has(i);
  if(tl=='f'&&!has&&S.fs.size>=3)return;
  S.sh.push([[...S.xs],[...S.hs],[...S.bs],[...S.fs]]);
  S.xs.delete(i);S.hs.delete(i);S.bs.delete(i);S.fs.delete(i);
  if(!has)M[tl].add(i);
 }else{const s=state(i);
  if((s=='o'||s=='h')&&lastR(i)){S.obs.push({i,k:'t',r:lastR(i)});S.rec=null}
  else if(s=='o'&&!S.obs.some(o=>o.i==i)){S.obs.push({i,k:'h',F:found(),manual:true});S.rec=null}
  else if(s=='h'&&S.obs.some(o=>o.i==i&&o.manual)){
   S.obs=S.obs.filter(o=>!(o.i==i&&(o.manual||o.k=='r'))&&!(o.k=='t'&&o.r&&o.r.i==i));S.rec=null}
  else if(s=='c')S.sel=i}}
function progHtml(t){return S.prog?`<div class="nt">${F(t.exprog||L.ko.exprog,{a:S.prog.a,b:S.prog.b,c:(S.prog.ms/1000).toFixed(1)})}</div>`:''}
function hint(){S.sel=null;S.rec=null;S.fb=false;S.sure=false;S.imp=null;S.ex=null;S.prog=null;S.busy=true;setTimeout(()=>{
 let wait=false;
 try{S.rec=openRec();if(S.rec==null)S.rec=deepRec();
  if(found().length>=3){if(!cands().length)S.imp={k:'fin3',cells:visH()}}
  else if(S.rec<0&&!cands().length){S.imp=impossible();const f=S.imp?null:fallback();if(f){S.rec=f.i;S.fb=true;S.fbp=f.p;S.sure=!!f.sure}}
  else if(XM&&S.rec>=0&&clicks()>=EX_FROM){wait=true;
   exRecPar((a,b,ms)=>{S.prog={a,b,ms};const t=L[S.lang];msg.innerHTML=t.calc+progHtml(t)})
    .then(r=>{if(r>=0){S.rec=r;S.ex='ok'}else if(r==-2)S.ex='fb';else if(r==-3)S.ex='big'})
    .catch(e=>console.error(e)).then(()=>{S.prog=null;S.busy=false;render()})}}
 catch(e){console.error(e);S.rec=-1}
 if(!wait){S.busy=false;render()}},40)}
function act(a){
 if(a=='lang'){S.ov=true;S.q='';S.pg=0;ov.innerHTML=''}
 else if(a=='ovx')S.ov=false;
 else if(a.startsWith('pg:'))S.pg+=+a.slice(3);
 else if(a.startsWith('T:'))S.tool=a.slice(2);
 else if(a.startsWith('L:')){S.lang=a.slice(2);S.ov=false;save()}
 else if(a=='hint'){
  if(S.mode=='play'&&pend().length)return;
  if(S.mode=='setup'){S.cl=C.map((_,i)=>i).filter(i=>state(i)=='c');const F0=[...S.fs];S.os=new Set(S.bs);S.obs=F0.map(i=>({i,k:'f',F:[]})).concat([...S.hs].map(i=>({i,k:'h',F:F0})));S.n0=S.obs.length;S.mode='play'}
  hint()}
 else if(a=='undo'){
  if(S.mode=='play'){if(S.obs.length>S.n0)undoObs();else{S.obs=[];S.mode='setup'}}
  else if(S.sh.length){const p=S.sh.pop();S.xs=new Set(p[0]);S.hs=new Set(p[1]);S.bs=new Set(p[2]);S.fs=new Set(p[3])}
  S.rec=null;S.sel=null;S.imp=null;S.ex=null}
 else if(a=='reset'){const l=S.lang;init();S.lang=l}
 else if(a=='cancel')S.sel=null;
 else if(a.startsWith('Q:')){answer(a=='Q:h');go()}
 else if('bhf'.includes(a)&&S.sel!=null){addObs(S.sel,a);S.sel=null;S.rec=null;go()}}
document.onclick=e=>{if(S.busy)return;const el=e.target.closest('[data-a],[data-i]');if(!el)return;
 if(el.id=='ov'&&e.target!==el)return; /* 오버레이 안쪽(입력창·빈 공간) 클릭은 닫지 않음, 어두운 배경만 닫기 */
 if(el.dataset.i!==undefined){const n=S.obs.length;tap(+el.dataset.i);if(S.mode=='play'&&S.obs.length!=n)go()}else act(el.dataset.a);render()};
document.addEventListener('input',e=>{if(e.target.id=='lq'){S.q=e.target.value;S.pg=0;fillLg()}});
render();
