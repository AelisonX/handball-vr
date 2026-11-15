import {Vector3} from 'three';
import {Ball,type Surface} from './ball';
import {Match,side,type Mode,type Difficulty} from './match';
import type {HandStrike} from './hand-contact';

export class CourtGame {
 ball=new Ball();match=new Match();time=0;owner=-1;ownerHand=0;heldAt=0;pointAt=0;
 private lastContact=[[-10,-10],[-10,-10]];private lastHit=-10;private lastSeat=-1;
 private releaseAt=-10;private releaseSeat=-1;private releaseHand=-1;private idle=0;
 start(mode:Mode,difficulty:Difficulty='easy'){this.time=0;this.match.reset(mode,difficulty);this.ball.minZ=mode==='practice'?0:-4;this.ball.maxZ=4;this.lastContact=[[-10,-10],[-10,-10]];this.lastHit=-10;this.lastSeat=-1;this.resetBall();}
 resetBall(){this.owner=-1;this.ball.p.set(0,1.2,this.match.server===0?2.0:-2.0);this.ball.v.set(0,0,0);this.ball.w.set(0,0,0);this.ball.q.identity();this.pointAt=this.time;this.idle=0;}
 grab(seat:number,hand:number,p:Vector3){
  if(this.owner!==-1||p.distanceTo(this.ball.p)>.32||![0,1].includes(hand)||this.match.phase==='over')return false;
  if(this.match.mode!=='practice'&&side(p.z)!==seat)return false;
  if(!['ready','toss'].includes(this.match.phase)&&this.match.mode!=='practice'){this.match.point(1-seat,'Caught the ball during a rally');this.resetBall();return false;}
  if(seat!==this.match.server&&this.match.mode!=='practice')return false;
  if(this.match.mode==='practice')this.match.phase='ready';
  this.owner=seat;this.ownerHand=hand;this.heldAt=this.time;return true;
 }
 release(seat:number,hand:number,p:Vector3,v:Vector3){if(this.owner!==seat||this.ownerHand!==hand)return false;
  this.owner=-1;this.ball.p.copy(p);this.ball.v.copy(v).clampLength(0,14);this.ball.w.set(0,0,0);this.match.toss(seat);
  this.releaseAt=this.time;this.releaseSeat=seat;this.releaseHand=hand;return true;
 }
 strike(seat:number,hand:number,stroke:HandStrike,desktop=false){
  if(this.owner!==-1||this.match.phase==='over'||![0,1].includes(hand))return false;
  if(this.match.phase==='ready'&&!desktop)return false;
  if(this.match.mode!=='practice'&&side(this.ball.p.z)!==seat)return false;
  if(stroke.p.distanceTo(this.ball.p)>(desktop?.65:.42)||this.time-this.lastContact[seat][hand]<.075)return false;
  if(seat===this.releaseSeat&&hand===this.releaseHand&&this.time-this.releaseAt<.075)return false;
  const probe=this.ball.clone();if(!probe.strike(stroke.v,stroke.n,stroke.offset,stroke.punch,stroke.angular))return false;
  // Simultaneous left/right contacts are one legal hit with two physical impulses.
  const twoHands=this.lastSeat===seat&&this.time-this.lastHit<.04&&this.lastContact[seat][1-hand]===this.lastHit;
  if(!twoHands&&!this.match.hit(seat)){if((this.match.phase as string)==='ready'||(this.match.phase as string)==='over')this.resetBall();return false;}
  this.ball.v.copy(probe.v);this.ball.w.copy(probe.w);this.lastContact[seat][hand]=this.time;this.lastHit=this.time;this.lastSeat=seat;return true;
 }
 autoServe(seat:number){if(this.owner>=0||!this.match.serve(seat))return false;
  this.ball.p.set(.1,1.2,seat===0?2:-2);this.ball.v.set(0,-2,seat===0?-3.6:3.6);this.ball.w.set(0,0,0);return true;}
 step(dt:number,handPoint:(seat:number,hand:number)=>Vector3|undefined=()=>undefined,onContact:(s:Surface)=>void=()=>{}){
  this.time+=dt;
  if(this.owner>=0){const p=handPoint(this.owner,this.ownerHand);if(p){this.ball.p.copy(p);this.ball.v.set(0,0,0);}else{this.owner=-1;this.match.toss(this.match.server);this.ball.v.set(0,0,0);}return;}
  if(['ready','over'].includes(this.match.phase))return;
  const oldScore=this.match.score.join(',');
  this.ball.step(dt,s=>{this.match.crossing(this.ball.p.z);if(s==='floor')this.match.floor(this.ball.p.z);onContact(s);});
  this.match.crossing(this.ball.p.z);
  if(this.match.score.join(',')!==oldScore){this.resetBall();return;}
  if(this.match.phase==='toss'&&this.match.mode!=='practice'&&side(this.ball.p.z)!==this.match.server){this.match.phase='ready';this.match.message='Keep the toss on your side, then hit to serve.';this.resetBall();return;}
  this.idle=this.ball.v.length()<.16?this.idle+dt:0;
  if(this.idle>1){if(this.match.phase==='toss'||this.match.mode==='practice'){this.match.phase='ready';this.match.message='Grab, toss or drop, then hit to serve.';}else this.match.point(1-side(this.ball.p.z),'Ball stopped');this.resetBall();}
 }
}
