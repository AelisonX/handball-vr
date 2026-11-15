import {Quaternion,Vector3} from 'three';
import {RADIUS} from './ball';

export type HandStrike={p:Vector3,v:Vector3,n:Vector3,offset:Vector3,angular:Vector3,punch:boolean};
export function rotationVelocity(previous:Quaternion,current:Quaternion,dt:number){
 const delta=current.clone().multiply(previous.clone().invert()).normalize();if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
 const angle=2*Math.acos(Math.max(-1,Math.min(1,delta.w))),sin=Math.sqrt(Math.max(0,1-delta.w*delta.w));
 return sin<.0001||dt<.001?new Vector3():new Vector3(delta.x,delta.y,delta.z).multiplyScalar(angle/(sin*dt)).clampLength(0,55);
}
/** Sphere sweep in the ball's moving reference frame, including a palm-plane normal. */
export function handContact(ballNow:Vector3,ballBefore:Vector3,handNow:Vector3,handBefore:Vector3,orientation:Quaternion,velocity:Vector3,angular:Vector3,punch=false):HandStrike|undefined{
 const a=handBefore.clone().sub(ballBefore),b=handNow.clone().sub(ballNow),d=b.clone().sub(a),radius=RADIUS+(punch?.055:.085);
 const aa=d.lengthSq(),bb=2*a.dot(d),cc=a.lengthSq()-radius*radius,disc=bb*bb-4*aa*cc;
 let t=0;if(cc>0){if(aa<1e-10||disc<0)return; t=(-bb-Math.sqrt(disc))/(2*aa);if(t<0||t>1)return;}
 const relative=a.addScaledVector(d,t),radial=relative.clone().negate().normalize();if(radial.lengthSq()<.1)radial.copy(velocity).normalize();
 const palm=new Vector3(0,1,0).applyQuaternion(orientation);if(palm.dot(radial)<0)palm.negate();
 const n=radial.clone().multiplyScalar(punch?.88:.55).addScaledVector(palm,punch?.12:.45).normalize();
 const offset=radial.clone().multiplyScalar(-RADIUS);
 return {p:ballNow.clone().add(relative),v:velocity.clone().clampLength(0,14),n,offset,angular:angular.clone(),punch};
}
