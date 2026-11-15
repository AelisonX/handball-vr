import {Vector3} from 'three';
import type {Ball} from './ball';
import type {Match} from './match';
import {predictIntercept} from './cpu';
export type MovementMode='stick'|'teleport'|'auto';
export function playerIntercept(ball:Ball,match:Match,seat:number){
 const intercept=predictIntercept(ball,match,seat,2.2);if(!intercept)return;
 const sign=seat===0?1:-1;
 const target=intercept.p.clone();target.y=0;target.z+=sign*.48;target.x=Math.max(-2.05,Math.min(2.05,target.x));
 target.z=seat===0?Math.max(.45,Math.min(3.45,target.z)):Math.max(-3.45,Math.min(-.45,target.z));
 return target;
}
/** Move the rig by the head's world-space error, respecting a real room-scale offset. */
export function assistedDelta(head:Vector3,target:Vector3,dt:number,teleport=false){
 const delta=target.clone().sub(head);delta.y=0;
 if(!teleport)delta.clampLength(0,1.9*dt);
 return delta;
}
