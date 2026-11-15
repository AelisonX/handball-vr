import {Vector3} from 'three';
import {Ball,RADIUS,COURT,HAND_TRANSFER} from './ball';
import {bounceShot,handVelocityForShot} from './shots';
export type CpuShot='drive'|'lob'|'drop'|'topspin'|'backspin'|'sidespin';
export const CPU_SHOTS:CpuShot[]=['drive','lob','topspin','drop','sidespin','backspin'];
/** Plan a real hand impact, then evaluate its actual spin, drag and floor contacts. */
export function planCpuShot(ball:Ball,kind:CpuShot,power:number,targetX:number){
 const base=bounceShot(ball.p,1,power,targetX,ball.physics);
 let best=handVelocityForShot(ball.v,base,false,ball.w,ball.physics),bestCost=Infinity;
 const lob=kind==='lob',drop=kind==='drop';
 const forward=drop?Math.max(2.1,power*.58):lob?Math.max(2.8,power*.72):power;
 for(const down of lob?[5.6,7,8.2]:drop?[2,3.2,4.8]:[2.5,4,5.5])for(const scale of [.85,1.15,1.5]){
  const desired=bounceShot(ball.p,1,forward*scale,targetX,ball.physics);desired.y=-down;
  // Aim variants allow the planner to compensate for sidespin and wall angles.
  for(const aim of [-.45,0,.45]){
   desired.x+=aim;
   const stroke=handVelocityForShot(ball.v,desired,false,ball.w,ball.physics);
   const impulse=desired.clone().sub(ball.v),axis=new Vector3();
   if(kind==='topspin'||kind==='backspin')axis.set(1,0,0).multiplyScalar(kind==='topspin'?1:-1);
   if(kind==='sidespin')axis.set(0,1,0);
   // Off-centre contact supplies torque; never assign the ball spin directly.
   if(axis.lengthSq()){
    const tangent=new Vector3().crossVectors(impulse,axis).normalize().multiplyScalar(.018);
    stroke.offset.copy(stroke.n).multiplyScalar(-Math.sqrt(RADIUS*RADIUS-tangent.lengthSq())).add(tangent);
    const surface=new Vector3().crossVectors(ball.w,stroke.offset);
    stroke.v.copy(ball.v).add(surface).addScaledVector(impulse,1/(HAND_TRANSFER.slap*ball.physics.hitPower));
   }
   const b=ball.clone();if(!b.strike(stroke.v,stroke.n,stroke.offset))continue;
   let own=0,received=0,crossed=false,peak=0,legal=false,landingZ=COURT.halfLength,flight=0;
   for(let i=0;i<360;i++){
    b.step(1/90,s=>{if(s==='floor'){if(b.p.z<0)own++;else{received++;landingZ=b.p.z;}}});
    if(!crossed&&b.p.z>=0){if(own!==1)break;crossed=true;}
    if(crossed){peak=Math.max(peak,b.p.y);flight=i/90;}
    if(received===1){legal=true;break;}if(own>1)break;
   }
   if(!legal)continue;
   const cost=Math.abs(b.p.x-targetX)*.45+(lob?Math.abs(peak-3.3):drop?Math.abs(landingZ-.65)*2:Math.abs(landingZ-2.3)*.45)+Math.abs(b.v.length()-(drop?2.5:lob?4:power))*.12+flight*.015;
   if(cost<bestCost){bestCost=cost;best=stroke;}
  }
 }
 return {...best,p:ball.p.clone(),punch:false,angular:new Vector3(),planned:Number.isFinite(bestCost),kind};
}
