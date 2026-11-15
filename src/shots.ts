import {Vector3} from 'three';
import {GRAVITY,RADIUS,FLOOR_RESTITUTION} from './ball';

/** Aim down into the hitter's own floor; the following arc remains a physics result. */
export function bounceShot(p:Vector3,seat:number,speed=4.2,targetX=0){
 const direction=seat===0?-1:1,distanceToLine=Math.max(.015,Math.abs(p.z)-Math.min(.16,Math.abs(p.z)*.3));
 const down=Math.max(2,Math.sqrt(Math.max(0,2*GRAVITY*(1.12-RADIUS)/(FLOOR_RESTITUTION*FLOOR_RESTITUTION)-2*GRAVITY*Math.max(0,p.y-RADIUS))));
 const t=(Math.sqrt(down*down+2*GRAVITY*Math.max(.005,p.y-RADIUS))-down)/GRAVITY;
 const forward=Math.min(speed,distanceToLine/Math.max(.025,t));
 const flight=Math.max(.5,t+2*Math.sqrt(down*down+2*GRAVITY*Math.max(0,p.y-RADIUS))*.94/GRAVITY);
 return new Vector3(Math.max(-3,Math.min(3,(targetX-p.x)/flight)),-down,direction*forward);
}
/** Inverse central impulse: CPU/desktop strokes use the same hand collision solver. */
export function handVelocityForShot(incoming:Vector3,outgoing:Vector3,punch=false,spin=new Vector3()){
 const impulse=outgoing.clone().sub(incoming),n=impulse.clone().normalize();
 const offset=n.clone().multiplyScalar(-RADIUS),surfaceVelocity=new Vector3().crossVectors(spin,offset);
 return {v:incoming.clone().add(surfaceVelocity).addScaledVector(impulse,1/(punch?2.05:1.70)),n,offset};
}
