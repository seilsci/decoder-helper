/* 화면 / 입력 — 상태(S), 그리기(render), 탭·버튼 처리, 시작 코드. 마지막에 render()로 시작 */
function load(){try{const v=localStorage.getItem('dh_lang');if(v&&L[v])return v}catch(e){}return'ko'}
function save(){try{localStorage.setItem('dh_lang',S.lang)}catch(e){}}
let S;
function init(){S={lang:S?S.lang:load(),ov:false,mode:'setup',tool:'x',xs:new Set(),hs:new Set(),bs:new Set(),os:new Set(),fs:new Set(),obs:[],n0:0,rec:null,sel:null,ex:null}}
init();
function go(){if(!pend().length)hint()}
function render(){
 const t=L[S.lang],play=S.mode=='play',A=play?analyze():null,PQ=play?pend():[];
 document.documentElement.lang=S.lang;
 ti.innerHTML=(XM?'<span class="xb">7수 완전 탐색 판</span>':'')+t.t;lg.textContent='🌐 '+t.lang;bh.textContent=t.hint;bu.textContent=t.undo;br.textContent=t.reset;
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
 if(!play)m=brk(t.tip0)+`<div class="st">${(t.st||L.en.st).replace(/([.。।])\s*/,'$1<br>')}</div>`;
 else if(S.busy)m=t.calc;
 else if(PQ.length)m=`<b>${LB(t,PQ[0])}</b> — ${t.qn||L.en.qn}<div class="row eq"><button data-a="Q:b">${t.b}</button><button class="p" data-a="Q:h">${t.h}</button></div>`+oops(t);
 else if(S.imp)m=F(t[{many:'need4',noplace:'nopl',fin3:'fin3'}[S.imp.k]]||L.en[{many:'need4',noplace:'nopl',fin3:'fin3'}[S.imp.k]],{n:S.imp.n})+(CF.length?`<div class="nt2">${CF.map(i=>LB(t,i)).join(' · ')}</div>`:'');
 else if(found().length==3)m=t.done+oops(t);
 else if(S.sel!=null){const q=C[S.sel];
  m=`<b>${LB(t,S.sel)}</b> — ?<div class="row eq"><button data-a="b">${t.b}</button><button data-a="h">${t.h}</button><button class="p" data-a="f">${t.f}</button><button data-a="cancel">✕</button></div>`}
 else if(A.N==0&&!S.fb)m=brk(t.bad)+(CF.length?`<div class="nt2">${t.badc||L.en.badc}: ${CF.map(i=>LB(t,i)).join(' · ')}</div>`:'')+nt;
 else if(S.rec!=null&&S.rec>=0){const q=C[S.rec];m=F(t.rec,{c:LB(t,S.rec),p:S.fb?Math.round(S.fbp*100):Math.round(A.p[S.rec]*100)})+(S.fb&&!S.sure?`<div class="nt">${t.fbn||L.en.fbn}${CF.length?': '+CF.map(i=>LB(t,i)).join(' · '):''}</div>`:'')+exNote(t)+oops(t)+nt+(nt?'':`<div class="nt2">${brk(t.tip1.replace(/^[^.。।]*[.。।]\s*/,''))}</div>`)}
 else m=brk(t.tip1)+nt;
 msg.innerHTML=m;msg.dir=cn.dir=S.lang=='ar'?'rtl':'ltr';
 cn.textContent=play?F(t.n,{a:S.obs.filter(o=>'bhf'.includes(o.k)&&!o.manual).length-S.n0,b:found().length}):'';
 tl.hidden=play;
 if(!play)tl.innerHTML=['x','h','b','f'].map(k=>`<button data-a="T:${k}"${S.tool==k?' class="p"':''}>${k=='x'?'✕':k=='h'?'!':k=='b'?'○ '+t.b:'★ '+t.f}</button>`).join('');
 ov.hidden=!S.ov;
 if(S.ov){const used=new Set(LG.flat()),gs=LG.concat([Object.keys(L).filter(k=>!used.has(k))]).map(g=>g.filter(k=>L[k])).filter(g=>g.length);
  ov.innerHTML='<div class="lgl">'+gs.map(g=>'<div class="lgg">'+g.map(k=>`<button data-a="L:${k}"${k==S.lang?' class="p"':''}>${L[k].lang}</button>`).join('')+'</div>').join('')+'</div>'}
}

function tap(i){
 if(S.mode=='play'&&pend().length)return;
 if(S.mode=='play'&&S.fb&&i===S.rec){S.sel=i;return}
 if(S.mode=='setup'){
  const tl=S.tool,M={x:S.xs,h:S.hs,b:S.bs,f:S.fs},has=M[tl].has(i);
  if(tl=='f'&&!has&&S.fs.size>=3)return;
  S.xs.delete(i);S.hs.delete(i);S.bs.delete(i);S.fs.delete(i);
  if(!has)M[tl].add(i);
 }else{const s=state(i);
  if((s=='o'||s=='h')&&lastR(i)){S.obs.push({i,k:'t',r:lastR(i)});S.rec=null}
  else if(s=='o'&&!S.obs.some(o=>o.i==i)){S.obs.push({i,k:'h',F:found(),manual:true});S.rec=null}
  else if(s=='h'&&S.obs.some(o=>o.i==i&&o.manual)){
   S.obs=S.obs.filter(o=>!(o.i==i&&(o.manual||o.k=='r'))&&!(o.k=='t'&&o.r&&o.r.i==i));S.rec=null}
  else if(s=='c')S.sel=i}}
function hint(){S.sel=null;S.rec=null;S.fb=false;S.sure=false;S.imp=null;S.ex=null;S.busy=true;setTimeout(()=>{
 try{S.rec=openRec();if(S.rec==null)S.rec=deepRec();
  if(found().length>=3){if(!cands().length)S.imp={k:'fin3',cells:visH()}}
  else if(S.rec<0&&!cands().length){S.imp=impossible();const f=S.imp?null:fallback();if(f){S.rec=f.i;S.fb=true;S.fbp=f.p;S.sure=!!f.sure}}
  else if(XM&&S.rec>=0&&clicks()>=EX_FROM){const r=exRec();if(r>=0){S.rec=r;S.ex='ok'}else if(r==-2)S.ex='fb';else if(r==-3)S.ex='big'}}
 catch(e){console.error(e);S.rec=-1}
 S.busy=false;render()},40)}
function act(a){
 if(a=='lang')S.ov=true;
 else if(a=='ovx')S.ov=false;
 else if(a.startsWith('T:'))S.tool=a.slice(2);
 else if(a.startsWith('L:')){S.lang=a.slice(2);S.ov=false;save()}
 else if(a=='hint'){
  if(S.mode=='play'&&pend().length)return;
  if(S.mode=='setup'){S.cl=C.map((_,i)=>i).filter(i=>state(i)=='c');const F0=[...S.fs];S.os=new Set(S.bs);S.obs=F0.map(i=>({i,k:'f',F:[]})).concat([...S.hs].map(i=>({i,k:'h',F:F0})));S.n0=S.obs.length;S.mode='play'}
  hint()}
 else if(a=='undo'){
  if(S.mode=='play'){if(S.obs.length>S.n0)undoObs();else{S.obs=[];S.mode='setup'}}
  S.rec=null;S.sel=null;S.imp=null;S.ex=null}
 else if(a=='reset'){const l=S.lang;init();S.lang=l}
 else if(a=='cancel')S.sel=null;
 else if(a.startsWith('Q:')){answer(a=='Q:h');go()}
 else if('bhf'.includes(a)&&S.sel!=null){addObs(S.sel,a);S.sel=null;S.rec=null;go()}}
document.onclick=e=>{if(S.busy)return;const el=e.target.closest('[data-a],[data-i]');if(!el)return;
 if(el.dataset.i!==undefined){const n=S.obs.length;tap(+el.dataset.i);if(S.mode=='play'&&S.obs.length!=n)go()}else act(el.dataset.a);render()};
render();
