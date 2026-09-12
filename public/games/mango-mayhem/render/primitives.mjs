export const INK='#28324f';
const paths=new Map();
export function path(c,d,fill,stroke=INK,width=2){let p=paths.get(d);if(!p){p=new Path2D(d);if(paths.size<600)paths.set(d,p);}if(fill){c.fillStyle=fill;c.fill(p);}if(stroke&&width){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke(p);}}
export function ellipse(c,x,y,rx,ry,fill,stroke=null,width=2){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
export function rect(c,x,y,w,h,r,fill,stroke=null,width=2){c.beginPath();c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
export function line(c,points,stroke=INK,width=2){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))c.lineTo(p[0],p[1]);c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
export function poly(c,points,fill,stroke=INK,width=2){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))c.lineTo(p[0],p[1]);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
export function gradient(c,x,y,x2,y2,stops){const g=c.createLinearGradient(x,y,x2,y2);stops.forEach(([n,col])=>g.addColorStop(n,col));return g;}
export function star(c,x,y,r,fill,stroke=INK,n=5){const pts=[];for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r*.47:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}poly(c,pts,fill,stroke,1.5);}
export function mango(c,x,y,size=18,ghost=false){
 c.save();c.translate(x,y);c.scale(size/20,size/20);if(ghost)c.globalAlpha*=.24;
 path(c,'M-4-12C5-20 17-12 16-1C15 10 3 19-7 13C-15 8-14 0-10-5Z',ghost?'#fff9d9':gradient(c,-10,-12,14,12,[[0,'#ffdf55'],[.5,'#ffb640'],[1,'#f27c47']]),INK,1.7);
 path(c,'M-5-12Q-6-24 5-25Q8-16-5-12Z','#42ab68',INK,1.4);path(c,'M-4-12L-2-18',null,'#397953',1.1);
 path(c,'M-8-3Q-11 3-7 8',null,'#fff3a3',3);ellipse(c,7,-5,3,2,'#ffeaa2');c.restore();
}
export function heart(c,x,y,size=12,fill='#ef6681'){
 c.save();c.translate(x,y);c.scale(size/14,size/14);path(c,'M0 12C-24-1-12-18 0-7C12-18 24-1 0 12Z',fill,INK,1.8);path(c,'M-9-5Q-12-1-7 3',null,'#fff3ed',2);c.restore();
}
