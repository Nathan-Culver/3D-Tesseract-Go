import {COLORS,owner,tierOf,ghost,xyz,index} from './engine.mjs';
export class CubeBoard{
 constructor(canvas,onSelect){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onSelect=onSelect;this.axis=2;this.layer=4;this.flat=false;this.free=false;this.fade=true;this.opacity=.3;this.glow=true;this.background='#070b12';this.selected=[];this.dead=new Set();this.territory=null;this.yaw=.67;this.pitch=-.35;this.zoom=1;this.pan=[0,0];this.pointers=new Map();this.hover=-1;this.dirty=true;
  new ResizeObserver(()=>this.resize()).observe(canvas);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,[e.clientX,e.clientY]);this.origin=[e.clientX,e.clientY];this.moved=false;});
  canvas.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId)){const r=canvas.getBoundingClientRect();this.hover=this.hit(e.clientX-r.left,e.clientY-r.top);this.draw();return;}const prev=this.pointers.get(e.pointerId),dx=e.clientX-prev[0],dy=e.clientY-prev[1];if(Math.hypot(e.clientX-this.origin[0],e.clientY-this.origin[1])>5)this.moved=true;
   if(this.pointers.size===2){const other=[...this.pointers].find(([id])=>id!==e.pointerId)[1];const old=Math.hypot(prev[0]-other[0],prev[1]-other[1]),now=Math.hypot(e.clientX-other[0],e.clientY-other[1]);this.zoom=Math.max(.45,Math.min(2.4,this.zoom*(now/(old||now))));this.pan[0]+=dx/2;this.pan[1]+=dy/2;this.moved=true;}
   else if(this.moved){if(e.shiftKey||e.buttons===2||this.flat){this.pan[0]+=dx;this.pan[1]+=dy;}else{this.yaw+=dx*.008;this.pitch=Math.max(-1.45,Math.min(1.45,this.pitch+dy*.008));}}
   this.pointers.set(e.pointerId,[e.clientX,e.clientY]);this.draw();
  });
  canvas.addEventListener('pointerup',e=>{if(!this.moved&&this.pointers.size===1){const r=canvas.getBoundingClientRect(),i=this.hit(e.clientX-r.left,e.clientY-r.top);if(i>=0)this.onSelect(i);}this.pointers.delete(e.pointerId);});
  canvas.addEventListener('pointercancel',e=>this.pointers.delete(e.pointerId));canvas.addEventListener('pointerleave',()=>{this.hover=-1;this.draw();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.45,Math.min(2.4,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')this.zoomBy(1.1);if(e.key==='-')this.zoomBy(.9);if(e.key==='Home')this.reset();});
  this.resize();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.ctx.setTransform(d,0,0,d,0,0);this.draw();}
 reset(){this.yaw=.67;this.pitch=-.35;this.zoom=1;this.pan=[0,0];this.draw();}
 zoomBy(v){this.zoom=Math.max(.45,Math.min(2.4,this.zoom*v));this.draw();}
 project(x,y,z){
  let a,b,c;if(this.flat){const p=[x,y,z],axes=[0,1,2].filter(v=>v!==this.axis);a=p[axes[0]];b=p[axes[1]];c=0;}else{const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);a=x*cy+z*sy;c=-x*sy+z*cy;b=y*cp-c*sp;c=y*sp+c*cp;}
  const f=Math.min(this.w*.4,this.h*.35)*this.zoom/(1+c/5);return {x:this.w/2+this.pan[0]+a*f,y:this.h/2+this.pan[1]-b*f,z:c,f};
 }
 point(i){const n=this.state.config.size,p=xyz(i,n).map(v=>2*v/(n-1)-1);return this.project(...p);}
 hit(x,y){let best=-1,dist=Infinity;for(const p of this.hits||[]){const d=Math.hypot(p.x-x,p.y-y);if(d<Math.max(9,Math.min(21,p.step*.43))&&d<dist){dist=d;best=p.i;}}return best;}
 set(state,selected=[],dead=new Set()){this.state=state;this.selected=selected;this.dead=dead;this.layer=Math.min(this.layer,state.config.size-1);this.draw();}
 draw(){
  const ctx=this.ctx;if(!ctx||!this.w)return;ctx.clearRect(0,0,this.w,this.h);ctx.fillStyle=this.background;ctx.fillRect(0,0,this.w,this.h);if(!this.state)return;
  const n=this.state.config.size,light=['#ffffff','#f9d9e6','#b5b6be'].includes(this.background),blue=light?'28,102,150':'95,196,255';
  const glow=ctx.createRadialGradient(this.w/2,this.h*.53,0,this.w/2,this.h*.53,Math.min(this.w,this.h)*.6);glow.addColorStop(0,light?'rgba(67,160,209,.10)':'rgba(40,104,174,.10)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,this.w,this.h);
  const line=(a,b,alpha=.2,width=1)=>{const p=this.project(...a),q=this.project(...b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(${blue},${alpha})`;ctx.lineWidth=width;ctx.stroke();};
  if(!this.flat){for(let axis=0;axis<3;axis++){const o=[0,1,2].filter(v=>v!==axis);for(let a=0;a<n;a++)for(let b=0;b<n;b++){const p=[0,0,0],q=[0,0,0];p[axis]=-1;q[axis]=1;p[o[0]]=q[o[0]]=a*2/(n-1)-1;p[o[1]]=q[o[1]]=b*2/(n-1)-1;line(p,q,this.opacity*.18,.7);}}for(let axis=0;axis<3;axis++){const o=[0,1,2].filter(v=>v!==axis);for(const a of [-1,1])for(const b of [-1,1]){const p=[0,0,0],q=[0,0,0];p[axis]=-1;q[axis]=1;p[o[0]]=q[o[0]]=a;p[o[1]]=q[o[1]]=b;ctx.shadowColor='#5fc4ff';ctx.shadowBlur=this.glow?8:0;line(p,q,.55,1.4);ctx.shadowBlur=0;}}}
  const axes=[0,1,2].filter(a=>a!==this.axis),at=this.layer*2/(n-1)-1,corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(v=>{const p=[0,0,0];p[this.axis]=at;p[axes[0]]=v[0];p[axes[1]]=v[1];return this.project(...p);});
  ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=`rgba(${blue},.045)`;ctx.fill();
  for(let a=0;a<n;a++){const t=a*2/(n-1)-1;for(const axis of axes){const other=axes.find(x=>x!==axis),p=[0,0,0],q=[0,0,0];p[this.axis]=q[this.axis]=at;p[axis]=-1;q[axis]=1;p[other]=q[other]=t;line(p,q,.32,1);}}
  this.hits=[];const active=[];for(let a=0;a<n;a++)for(let b=0;b<n;b++){const p=[0,0,0];p[this.axis]=this.layer;p[axes[0]]=a;p[axes[1]]=b;const i=index(...p,n),q=this.point(i);this.hits.push({...q,i,step:q.f*2/(n-1)});active.push(i);if(!this.state.board[i]){ctx.beginPath();ctx.arc(q.x,q.y,1.55,0,Math.PI*2);ctx.fillStyle=`rgba(${blue},.65)`;ctx.fill();}}
  if(this.free&&!this.flat){this.hits=[];for(let i=0;i<this.state.board.length;i++){const q=this.point(i);this.hits.push({...q,i,step:q.f*2/(n-1)});}this.hits.sort((a,b)=>a.z-b.z);}
  if(this.territory)for(const i of active){const color=this.territory[i];if(color&&!this.state.board[i]){const q=this.point(i);ctx.fillStyle=COLORS[color]+'66';ctx.fillRect(q.x-3,q.y-3,6,6);}}
  const stones=[];this.state.board.forEach((v,i)=>{if(!v)return;const p=xyz(i,n);if(this.flat&&p[this.axis]!==this.layer)return;const q=this.point(i);stones.push({v,i,...q,off:p[this.axis]!==this.layer});});stones.sort((a,b)=>b.z-a.z);
  for(const p of stones){const color=p.v===200?'#ff667a':p.v===201?'#c7d1df':COLORS[owner(p.v)],r=Math.max(3,p.f*2/(n-1)*.31);ctx.save();ctx.globalAlpha=this.dead.has(p.i)?.25:p.off&&this.fade?.37:1;ctx.shadowColor=color;ctx.shadowBlur=this.glow?r*1.35:0;
   const g=ctx.createRadialGradient(p.x-r*.3,p.y-r*.4,r*.08,p.x,p.y,r);if(ghost(p.v)){g.addColorStop(0,'#bac4d088');g.addColorStop(1,'#737f9855');}else if(owner(p.v)===1&&p.v!==201){g.addColorStop(0,'#34204d');g.addColorStop(.5,'#100e1a');g.addColorStop(.82,'#9d6fe6');g.addColorStop(1,'#d3b1ff');}else{g.addColorStop(0,'#ffffff');g.addColorStop(.4,color);g.addColorStop(1,p.v===201?'#768296':color);}ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   if(ghost(p.v)||p.v===201){ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.stroke();}if(tierOf(p.v)&&p.v<90||p.v===201&&this.state.config.coinStyle==='dime'){ctx.fillStyle=owner(p.v)===1?'#fff':'#152035';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.max(8,r*1.15)}px system-ui`;ctx.fillText(p.v===201?'10':tierOf(p.v),p.x,p.y+.5);}ctx.restore();
  }
  for(const [k,p] of this.selected.entries()){const q=this.point(p.i);ctx.beginPath();ctx.arc(q.x,q.y,Math.max(8,q.f*2/(n-1)*.4),0,Math.PI*2);ctx.strokeStyle='#ffd68a';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ffd68a';ctx.font='bold 10px system-ui';ctx.fillText(k+1,q.x+9,q.y-9);}
  const last=this.state.history.at(-1)?.placements?.at(-1)?.i;if(last!==undefined&&this.state.board[last]){const p=this.point(last);ctx.strokeStyle='#ffd68a';ctx.lineWidth=1.3;ctx.strokeRect(p.x-3,p.y-3,6,6);}
  if(this.hover>=0&&!this.state.board[this.hover]){const p=this.point(this.hover);ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.strokeStyle='#ffd68a';ctx.lineWidth=1.5;ctx.stroke();}
  ctx.fillStyle=light?'#324960':'#7290a9';ctx.font='10px ui-monospace, monospace';ctx.textAlign='center';for(const a of [0,n-1]){const p=[0,0,0];p[this.axis]=this.layer;p[axes[0]]=a;const q=this.point(index(...p,n));ctx.fillText(a===0?'A':String.fromCharCode(65+n-1),q.x,q.y+17);}
 }
}
