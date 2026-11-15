import {Vector3,Quaternion} from 'three';

export const COURT={halfWidth:2.5,halfLength:4,height:4.5};
export const RADIUS=.115;
export const GRAVITY=9.81;
export const FLOOR_RESTITUTION=.94;
export type Surface='floor'|'wall';
export class Ball {
 p=new Vector3(0,1.2,2);v=new Vector3();w=new Vector3();q=new Quaternion();
 minZ=-COURT.halfLength;maxZ=COURT.halfLength;
 clone(){const b=new Ball();b.p.copy(this.p);b.v.copy(this.v);b.w.copy(this.w);b.q.copy(this.q);b.minZ=this.minZ;b.maxZ=this.maxZ;return b;}
 // Hollow rubber/felt ball: approximate restitution, Coulomb friction and Magnus lift.
 step(dt:number,contact:(surface:Surface)=>void){
  const steps=Math.max(1,Math.ceil(dt/(1/360))),h=dt/steps;
  for(let i=0;i<steps;i++){
   const magnus=new Vector3().crossVectors(this.w,this.v).multiplyScalar(.0009).clampLength(0,1.5);
   this.v.addScaledVector(magnus,h);this.v.y-=GRAVITY*h;this.v.multiplyScalar(Math.exp(-.003*this.v.length()*h));
   this.p.addScaledVector(this.v,h);
   const bounce=(n:Vector3,depth:number,surface:Surface)=>{
    this.p.addScaledVector(n,depth);const speed=this.v.dot(n);if(speed>=0)return;
    const tangent=this.v.clone().addScaledVector(n,-speed).add(new Vector3().crossVectors(this.w,n.clone().multiplyScalar(-RADIUS)));
    const restitution=surface==='floor'?FLOOR_RESTITUTION:.88;
    const impulse=tangent.multiplyScalar(-1/3.5).clampLength(0,(surface==='floor'?.10:.12)*(1+restitution)*-speed);
    this.v.addScaledVector(n,-(1+restitution)*speed).add(impulse);
    this.w.add(new Vector3().crossVectors(n.clone().multiplyScalar(-RADIUS),impulse).multiplyScalar(2.5/(RADIUS*RADIUS)));
    if(surface==='floor'&&-speed<.14){this.v.y=0;this.v.x*=.98;this.v.z*=.98;}
    if(-speed>.14)contact(surface);
   };
   if(this.p.y<RADIUS)bounce(new Vector3(0,1,0),RADIUS-this.p.y,'floor');
   if(this.p.y>COURT.height-RADIUS)bounce(new Vector3(0,-1,0),this.p.y-(COURT.height-RADIUS),'wall');
   for(const axis of ['x','z'] as const){const low=axis==='x'?-COURT.halfWidth:this.minZ,high=axis==='x'?COURT.halfWidth:this.maxZ;
    if(this.p[axis]<low+RADIUS){const n=new Vector3();n[axis]=1;bounce(n,low+RADIUS-this.p[axis],'wall');}
    else if(this.p[axis]>high-RADIUS){const n=new Vector3();n[axis]=-1;bounce(n,this.p[axis]-(high-RADIUS),'wall');}}
   const speed=this.w.length();if(speed>.001)this.q.premultiply(new Quaternion().setFromAxisAngle(this.w.clone().normalize(),speed*h)).normalize();
   this.w.multiplyScalar(Math.exp(-.16*h));
  }
 }
 strike(velocity:Vector3,normal:Vector3,offset:Vector3,punch=false,angular=new Vector3()){
  const r=offset.clone().clampLength(0,RADIUS),n=normal.clone().normalize();
  const wristBrush=new Vector3().crossVectors(angular.clone().clampLength(0,55),r.clone().multiplyScalar(-.65)).clampLength(0,3);
  const relative=velocity.clone().add(wristBrush).sub(this.v).sub(new Vector3().crossVectors(this.w,r)),closing=relative.dot(n);
  if(closing<=0)return false;
  const impulse=n.clone().multiplyScalar(closing*(punch?2.05:1.70));
  const brush=relative.addScaledVector(n,-closing).multiplyScalar(punch?.20:.42).clampLength(0,impulse.length()*.48);
  impulse.add(brush);this.v.add(impulse);
  this.w.add(new Vector3().crossVectors(r,impulse).multiplyScalar(2.5/(RADIUS*RADIUS))).clampLength(0,110);
  this.v.clampLength(0,22);return true;
 }
}
