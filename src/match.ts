export type Mode='practice'|'cpu'|'online';
export type Difficulty='easy'|'medium'|'hard';
export const side=(z:number)=>z>=0?0:1;
export class Match {
 mode:Mode='practice';difficulty:Difficulty='easy';score=[0,0];server=0;phase:'ready'|'serve'|'rally'|'over'='ready';
 lastHitter=0;bounceSide=-1;bounces=0;serveBounced=false;crossed=false;message='Choose a mode. First to 11, win by two.';rally=0;best=0;winner=-1;
 reset(mode:Mode,difficulty:Difficulty=this.difficulty){this.mode=mode;this.difficulty=difficulty;this.score=[0,0];this.server=0;this.phase='ready';this.rally=this.best=0;this.winner=-1;this.message='Blue serves. Grab the ball or press Space.';this.resetRally();}
 resetRally(){this.lastHitter=this.server;this.bounces=0;this.bounceSide=-1;this.serveBounced=false;this.crossed=false;this.rally=0;}
 serve(seat:number){if(this.phase!=='ready'||seat!==this.server)return false;this.resetRally();this.phase='serve';this.message='Serve: your floor, then their floor.';return true;}
 floor(z:number){
  if(this.phase==='ready'||this.phase==='over')return;
  if(this.mode==='practice'){this.message=`Wall practice · ${this.rally} returns · best ${this.best}`;return;}
  const s=side(z);
  if(this.phase==='serve'){
   if(!this.serveBounced){if(s!==this.server){this.point(1-this.server,'Serve missed its own floor');return;}this.serveBounced=true;this.bounceSide=s;this.bounces=1;return;}
   if(s===this.server){this.point(1-this.server,'Serve bounced twice on its own side');return;}
   this.phase='rally';this.bounceSide=s;this.bounces=1;this.message='Return it before the second bounce.';return;
  }
  if(s===this.bounceSide)this.bounces++;else{this.bounceSide=s;this.bounces=1;}
  if(this.bounces>=2)this.point(1-s,'Two floor bounces');
 }
 crossing(z:number){if(this.mode==='practice')return;if(this.phase==='serve'&&side(z)!==this.server){if(!this.serveBounced)this.point(1-this.server,'Serve crossed before its own bounce');else this.crossed=true;}}
 hit(seat:number){
  if(this.phase==='ready'||this.phase==='over')return false;
  if(this.mode==='practice'){this.rally++;this.best=Math.max(this.best,this.rally);return true;}
  if(this.phase==='serve'||this.bounceSide!==seat||this.lastHitter===seat){this.point(1-seat,'Hit before your floor bounce');return false;}
  this.lastHitter=seat;this.bounceSide=-1;this.bounces=0;this.rally++;this.message='Good return.';return true;
 }
 point(winner:number,why:string){this.score[winner]++;this.server=winner;this.phase='ready';this.message=`${why}. ${winner===0?'Blue':'Red'} scores and serves.`;this.resetRally();
  if(this.score[winner]>=11&&this.score[winner]-this.score[1-winner]>=2){this.phase='over';this.winner=winner;this.message=`${winner===0?'Blue':'Red'} wins! Select a mode to play again.`;}}
}
