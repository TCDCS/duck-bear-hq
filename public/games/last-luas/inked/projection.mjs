/** Deliberately illustrated perspective, with a wider safe composition in portrait. */
export function viewFor(w,h){return {w,h,cx:w/2,horizon:h*.235,ground:h*.84,span:Math.min(h*.115,w*.118),vertical:h*.14,back:7};}
export function project(x,y,d,v){if(d<=-3.8||![x,y,d].every(Number.isFinite))return null;const scale=v.back/(d+v.back);return {x:v.cx+x*v.span*scale,y:v.horizon+(v.ground-v.horizon-y*v.vertical)*scale,scale};}
/** Affine triangles per narrow strip approximate projective facade mapping. */
export function imageTriangle(c,img,a,b){
 const [s0,s1,s2]=a,[p0,p1,p2]=b;
 const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);if(Math.abs(den)<1e-9)return;
 const coefficient=k=>[(p0[k]*(s1.y-s2.y)+p1[k]*(s2.y-s0.y)+p2[k]*(s0.y-s1.y))/den,(p0[k]*(s2.x-s1.x)+p1[k]*(s0.x-s2.x)+p2[k]*(s1.x-s0.x))/den,(p0[k]*(s1.x*s2.y-s2.x*s1.y)+p1[k]*(s2.x*s0.y-s0.x*s2.y)+p2[k]*(s0.x*s1.y-s1.x*s0.y))/den];
 const x=coefficient('x'),y=coefficient('y');c.save();c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(p1.x,p1.y);c.lineTo(p2.x,p2.y);c.closePath();c.clip();c.transform(x[0],y[0],x[1],y[1],x[2],y[2]);c.drawImage(img,0,0);c.restore();
}
/** Screen-column projection avoids the zig-zag shear produced by tall affine triangles. */
export function facadeSlices(f,s,v,step=1.5){
 const d0=f.s-f.w/2-s,d1=f.s+f.w/2-s;if(d1<=-2.5||d0>=125)return [];
 const worldX=f.side*6.8,a=project(worldX,0,Math.max(-2.5,d0),v),b=project(worldX,0,d1,v);if(!a||!b)return [];
 const left=Math.max(0,Math.min(a.x,b.x)),right=Math.min(v.w,Math.max(a.x,b.x)),out=[];
 const uAt=x=>{const scale=(x-v.cx)/(worldX*v.span),d=v.back/scale-v.back;const u=(d-d0)/(d1-d0);return Math.max(0,Math.min(1,f.side<0?u:1-u));};
 for(let x=left;x<right;x+=step){const w=Math.min(step,right-x),scale=(x-v.cx)/(worldX*v.span),u=uAt(x),uw=uAt(x+w)-u;
 if(uw>0)out.push({x,y:v.horizon+(v.ground-v.horizon-f.h*v.vertical)*scale,w,h:f.h*v.vertical*scale,u,uw});}
 return out;
}
