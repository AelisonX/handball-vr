import {Vector3,Quaternion} from 'three';

export const COURT={halfWidth:2.5,halfLength:4,height:4.5};
export const RADIUS=.115;
export type Surface='floor'|'wall';
export class Ball {
 p=new Vector3(0,1.2,2);v=new Vector3();w=new Vector3();q=new Quaternion();
 // Hollow rubber/felt ball: approximate restitution, Coulomb friction and Magnus lift.
 step(dt:number,contact:(surface:Surface)=>void){
  const steps=Math.max(1,Math.ceil(dt/(1/360))),h=dt/steps;
  for(let i=0;i<steps;i++){
   const magnus=new Vector3().crossVectors(this.w,this.v).multiplyScalar(.0018).clampLength(0,5);
   this.v.addScaledVector(magnus,h);this.v.y-=9.81*h;this.v.multiplyScalar(Math.exp(-.025*this.v.length()*h));
   this.p.addScaledVector(this.v,h);
   const bounce=(n:Vector3,depth:number,surface:Surface)=>{
    this.p.addScaledVector(n,depth);const speed=this.v.dot(n);if(speed>=0)return;
    const tangent=this.v.clone().addScaledVector(n,-speed).add(new Vector3().crossVectors(this.w,n.clone().multiplyScalar(-RADIUS)));
    const impulse=tangent.multiplyScalar(-1/3.5).clampLength(0,.23*(1+.79)*-speed);
    this.v.addScaledVector(n,-(1+.79)*speed).add(impulse);
    this.w.add(new Vector3().crossVectors(n.clone().multiplyScalar(-RADIUS),impulse).multiplyScalar(2.5/(RADIUS*RADIUS)));
    if(surface==='floor'&&-speed<.14){this.v.y=0;this.v.x*=.98;this.v.z*=.98;}
    if(-speed>.14)contact(surface);
   };
   if(this.p.y<RADIUS)bounce(new Vector3(0,1,0),RADIUS-this.p.y,'floor');
   if(this.p.y>COURT.height-RADIUS)bounce(new Vector3(0,-1,0),this.p.y-(COURT.height-RADIUS),'wall');
   for(const axis of ['x','z'] as const){const limit=(axis==='x'?COURT.halfWidth:COURT.halfLength)-RADIUS;
    if(Math.abs(this.p[axis])>limit){const n=new Vector3();n[axis]=-Math.sign(this.p[axis]);bounce(n,Math.abs(this.p[axis])-limit,'wall');}}
   const speed=this.w.length();if(speed>.001)this.q.premultiply(new Quaternion().setFromAxisAngle(this.w.clone().normalize(),speed*h)).normalize();
   this.w.multiplyScalar(Math.exp(-.16*h));
  }
 }
 strike(velocity:Vector3,normal:Vector3,offset:Vector3,punch=false){
  const n=normal.clone().normalize(),relative=velocity.clone().sub(this.v),closing=relative.dot(n);
  if(closing<=0)return false;
  this.v.addScaledVector(n,closing*(punch?1.65:1.18));
  const brush=relative.addScaledVector(n,-closing).multiplyScalar(punch?.12:.42);
  this.v.add(brush);this.w.add(new Vector3().crossVectors(offset.clone().clampLength(0,RADIUS),brush).multiplyScalar(2.5/(RADIUS*RADIUS))).clampLength(0,100);
  this.v.clampLength(0,18);return true;
 }
}
