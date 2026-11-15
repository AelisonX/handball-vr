import {PHYSICS_DEFAULTS,type PhysicsOptions} from './physics-options';
import {Vector3} from 'three';
import {GRAVITY,RADIUS,FLOOR_RESTITUTION,HAND_TRANSFER,Ball} from './ball';

/** Aim down into the hitter's own floor; the following arc remains a physics result. */
export function bounceShot(p:Vector3,seat:number,speed=4.2,targetX=0,physics:PhysicsOptions=PHYSICS_DEFAULTS){
 const GRAVITY=physics.gravity,FLOOR_RESTITUTION=physics.bounce;
 const direction=seat===0?-1:1,distanceToLine=Math.max(.015,Math.abs(p.z)-Math.min(.16,Math.abs(p.z)*.3));
 const down=Math.max(2,Math.sqrt(Math.max(0,2*GRAVITY*(1.12-RADIUS)/(FLOOR_RESTITUTION*FLOOR_RESTITUTION)-2*GRAVITY*Math.max(0,p.y-RADIUS))));
 const t=(Math.sqrt(down*down+2*GRAVITY*Math.max(.005,p.y-RADIUS))-down)/GRAVITY;
 const forward=Math.min(speed,distanceToLine/Math.max(.025,t));
 const flight=Math.max(.5,t+2*Math.sqrt(down*down+2*GRAVITY*Math.max(0,p.y-RADIUS))*FLOOR_RESTITUTION/GRAVITY);
 return new Vector3(Math.max(-3,Math.min(3,(targetX-p.x)/flight)),-down,direction*forward);
}
/** Inverse central impulse: CPU/desktop strokes use the same hand collision solver. */
export function handVelocityForShot(incoming:Vector3,outgoing:Vector3,punch=false,spin=new Vector3(),physics:PhysicsOptions=PHYSICS_DEFAULTS){
 const impulse=outgoing.clone().sub(incoming),n=impulse.clone().normalize();
 const offset=n.clone().multiplyScalar(-RADIUS),surfaceVelocity=new Vector3().crossVectors(spin,offset);
 return {v:incoming.clone().add(surfaceVelocity).addScaledVector(impulse,1/((punch?HAND_TRANSFER.punch:HAND_TRANSFER.slap)*physics.hitPower)),n,offset};
}

/** Search legal, unforced return arcs through the actual spin/drag/bounce solver. */
export function friendlyShot(ball:Ball,player:Vector3){
 let best=bounceShot(ball.p,1,3.5,player.x,ball.physics),cost=Infinity;
 const target=player.clone();target.z=Math.max(.65,Math.min(4.05,target.z-.35));
 for(const down of [1.2,2.2,3.4,4.8,6.4])for(const speed of [2.2,3,3.8,4.6,5.5,6.5]){
  let vx=(target.x-ball.p.x)/Math.max(.9,(target.z-ball.p.z)/speed);
  for(let aim=0;aim<2;aim++){
   const v=new Vector3(vx,-down,speed),b=ball.clone();b.v.copy(v);let own=0,received=0,crossed=false,invalid=false,bestX=target.x;
   for(let i=0;i<240;i++){
    b.step(1/90,s=>{if(s==='floor'){if(b.p.z<0)own++;else received++;}});
    if(!crossed&&b.p.z>=0){if(own!==1){invalid=true;break;}crossed=true;}
    if(own>1||received>1)break;
    if(received===1&&b.p.y>=.75&&b.p.y<=1.55){
     const c=Math.hypot(b.p.x-target.x,b.p.z-target.z)*3+Math.abs(b.p.y-1.15)+Math.max(0,b.v.length()-4.2)*.2;
     if(c<cost){cost=c;best.copy(v);bestX=b.p.x;}
    }
   }
   if(invalid)break;vx+= (target.x-bestX)*.65;
  }
 }
 return best;
}

/** Compensate for the incoming spin at the floor without changing the ball itself. */
export function legalReturn(ball:Ball,seat:number,speed:number,x:number){
 const base=bounceShot(ball.p,seat,speed,x,ball.physics);let best=base.clone(),cost=Infinity;
 for(const down of [base.y,base.y-1.5,base.y-3])for(const scale of [1,1.25,1.6,2]){
  const v=base.clone();v.y=down;v.z*=scale;const b=ball.clone();b.v.copy(v);let floors=0;
  for(let i=0;i<210;i++){
   b.step(1/90,s=>{if(s==='floor')floors++;});
   if((seat===1&&b.p.z>=0)||(seat===0&&b.p.z<0)){
    if(floors===1){const c=v.distanceTo(base);if(c<cost){cost=c;best.copy(v);}}break;
   }
   if(floors>=2)break;
  }
 }
 return best;
}
