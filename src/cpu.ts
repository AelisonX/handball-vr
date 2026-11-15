import {Vector3} from 'three';
import {Ball,COURT} from './ball';
import {Match,side,type Difficulty} from './match';
import {handVelocityForShot,friendlyShot,legalReturn} from './shots';
import {CPU_SHOTS,planCpuShot,type CpuShot} from './cpu-shots';
import type {CourtGame} from './court-game';

export const CPU_SETTINGS={
 easy:{speed:1.05,reaction:.48,horizon:3.4,error:.32,reach:.55,afterBounce:.15,fastThreshold:5.5,fastPenalty:.055,shotSpeed:3.6},
 medium:{speed:2.1,reaction:.14,horizon:3.6,error:.07,reach:.65,afterBounce:.035,fastThreshold:10,fastPenalty:.014,shotSpeed:5.2},
 hard:{speed:2.35,reaction:.085,horizon:3.8,error:.035,reach:.73,afterBounce:.018,fastThreshold:12,fastPenalty:.006,shotSpeed:6.1},
 rally:{speed:3.4,reaction:.025,horizon:4.2,error:0,reach:.85,afterBounce:.012,fastThreshold:16,fastPenalty:0,shotSpeed:3.5},
} as const;
export type Intercept={p:Vector3,t:number};
export function predictIntercept(ball:Ball,match:Match,seat:number,horizon=2.2,origin?:Vector3,speed=2.5,reach=.78,maxHeight=2.2):Intercept|undefined{
 if(!['serve','rally'].includes(match.phase))return;
 const b=ball.clone(),m=Object.assign(new Match(),match,{score:[...match.score]});
 let fallback:Intercept|undefined,bestError=Infinity;
 for(let i=0;i<=Math.ceil(horizon*90);i++){
  const t=i/90,legal=match.mode==='practice'?b.v.z>0:m.canReturn(seat);
  if(legal&&side(b.p.z)===seat&&b.p.y>=.22&&b.p.y<=maxHeight){const hit={p:b.p.clone(),t};const error=origin?Math.hypot(b.p.x-origin.x,b.p.z+(seat===0?.22:-.22)-origin.z)-speed*t-reach:0;
   if(error<bestError){bestError=error;fallback=hit;}if(error<=0&&b.p.y>=.55&&b.p.y<=1.85)return hit;}
  if(i===Math.ceil(horizon*90))break;
  b.step(1/90,s=>{m.crossing(b.p.z);if(s==='floor')m.floor(b.p.z);});m.crossing(b.p.z);
  if(['ready','over'].includes(m.phase))break;
 }
 return fallback;
}
export class CpuPlayer {
 position=new Vector3(0,0,-2.65);target=new Vector3(0,0,-2.65);nextDecision=0;legalSince=-1;lastShot=-10;returns=0;lastShotKind:CpuShot|'friendly'='friendly';private wasIncoming=false;
 reset(){this.position.set(0,0,-2.65);this.target.copy(this.position);this.nextDecision=0;this.legalSince=-1;this.lastShot=-10;this.returns=0;this.wasIncoming=false;}
 update(dt:number,game:CourtGame,playerPosition=new Vector3(0,1.65,2.55)){
  const {match,ball,time}=game;if(match.mode!=='cpu'||match.phase==='over')return;
  const cfg=CPU_SETTINGS[match.difficulty];
  if(match.phase==='ready'){this.legalSince=-1;if(match.server===1&&time-game.pointAt>1.15)game.autoServe(1);return;}
  const incoming=match.lastHitter===0&&['serve','rally'].includes(match.phase),fastLag=Math.max(0,ball.v.length()-cfg.fastThreshold)*cfg.fastPenalty;
  if(incoming&&!this.wasIncoming)this.nextDecision=time+cfg.reaction+fastLag;this.wasIncoming=incoming;
  if(time>=this.nextDecision){
   this.nextDecision=time+cfg.reaction+fastLag;
   const intercept=incoming?predictIntercept(ball,match,1,cfg.horizon,this.position,cfg.speed,cfg.reach):undefined;
   if(intercept){this.target.copy(intercept.p);this.target.x+=Math.sin((match.rally+match.score[0]*7+match.score[1]*13+1)*2.17 )*cfg.error*(1+Math.max(0,ball.v.length()-cfg.fastThreshold)*.3);this.target.z-=.22;}
   else if(incoming&&ball.p.z<0&&match.difficulty==='easy'){this.target.copy(ball.p);this.target.z-=.25;}
   else this.target.set(0,0,-2.65);
   this.target.x=Math.max(-COURT.halfWidth+.3,Math.min(COURT.halfWidth-.3,this.target.x));this.target.z=Math.max(-COURT.halfLength+.4,Math.min(-.5,this.target.z));this.target.y=0;
  }
  this.position.add(this.target.clone().sub(this.position).clampLength(0,cfg.speed*dt));
  const legal=match.canReturn(1);
  if(!legal){this.legalSince=-1;return;}if(this.legalSince<0)this.legalSince=time;
  if(time-this.legalSince<cfg.afterBounce+fastLag||time-this.lastShot<.12||ball.p.y<.22||ball.p.y>2.2||ball.p.y<.45&&ball.v.y>0)return;
  const distance=Math.hypot(ball.p.x-this.position.x,ball.p.z-(this.position.z+.22));if(distance>cfg.reach)return;
  const targetX=match.difficulty==='easy'?Math.sin(time)*.5:match.difficulty==='medium'?Math.sin(match.rally*1.7)*.9:playerPosition.x>=0?-1.95:1.95;
  const kind=CPU_SHOTS[this.returns%CPU_SHOTS.length];
  const pace=[.82,1,1.22,1.42][(this.returns+match.score[1])%4],power=Math.min(match.difficulty==='easy'?6:match.difficulty==='medium'?8:10,cfg.shotSpeed*pace);
  const planned=match.difficulty==='rally'?undefined:planCpuShot(ball,kind,power,targetX);
  const outgoing=match.difficulty==='rally'?friendlyShot(ball,playerPosition):legalReturn(ball,1,power,targetX);
  const stroke=planned?.planned?planned:{...handVelocityForShot(ball.v,outgoing,false,ball.w,ball.physics),p:ball.p.clone(),punch:false,angular:new Vector3()};
  this.lastShotKind=match.difficulty==='rally'?'friendly':planned?.planned?kind:'drive';
  if(game.strike(1,1,{...stroke,p:ball.p.clone(),punch:false,angular:new Vector3()})){this.lastShot=time;this.returns++;}
 }
}
export function difficultyLabel(d:Difficulty){return d==='rally'?'Rally - gentle returns to you':d==='easy'?'Easy - slow feet, struggles with pace':d==='medium'?'Medium - rallies and solid returns':'Hard - fast anticipation, small openings';}
