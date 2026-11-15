export type Mode='practice'|'cpu'|'online';
export type Difficulty='easy'|'medium'|'hard';
export const side=(z:number)=>z>=0?0:1;
export class Match {
 mode:Mode='practice';difficulty:Difficulty='easy';score=[0,0];server=0;phase:'ready'|'toss'|'serve'|'rally'|'over'='ready';
 lastHitter=0;bounceSide=-1;bounces=0;ownBounces=0;crossed=false;message='Choose a mode. First to 11, win by two.';rally=0;best=0;winner=-1;
 reset(mode:Mode,difficulty:Difficulty=this.difficulty){this.mode=mode;this.difficulty=difficulty;this.score=[0,0];this.server=0;this.phase='ready';this.rally=this.best=0;this.winner=-1;this.message='Blue serves. Grab, toss or drop, then hit.';this.resetRally();}
 resetRally(){this.lastHitter=this.server;this.bounces=0;this.bounceSide=-1;this.ownBounces=0;this.crossed=false;this.rally=0;}
 toss(seat:number){if(!['ready','toss'].includes(this.phase)||seat!==this.server)return false;this.phase='toss';this.message='Hit the tossed ball to start your serve.';return true;}
 serve(seat:number){if(!['ready','toss'].includes(this.phase)||seat!==this.server)return false;this.resetRally();this.phase='serve';this.message='Hit your floor once, then cross the line.';return true;}
 canReturn(seat:number){return ['serve','rally'].includes(this.phase)&&this.crossed&&seat!==this.lastHitter&&this.bounceSide===seat&&this.bounces===1;}
 floor(z:number){
  if(!['serve','rally'].includes(this.phase))return;
  if(this.mode==='practice'){this.message=`Wall practice · ${this.rally} returns · best ${this.best}`;return;}
  const s=side(z);
  if(!this.crossed&&s!==this.lastHitter)this.crossing(z);
  if(this.phase==='ready'||this.phase==='over')return;
  if(!this.crossed){
   this.ownBounces++;this.bounceSide=s;this.bounces=this.ownBounces;
   if(this.ownBounces>=2)this.point(1-this.lastHitter,'Two own-side bounces after the hit');
   else this.message='One own-side bounce. Now send it across.';
   return;
  }
  if(s===this.lastHitter){this.point(1-this.lastHitter,'The return came back to the hitter');return;}
  this.bounceSide=s;this.bounces++;this.phase='rally';
  if(this.bounces>=2)this.point(this.lastHitter,'Two floor bounces before the return');
  else this.message='Return now: your floor once, then across.';
 }
 crossing(z:number){if(this.mode==='practice'||!['serve','rally'].includes(this.phase))return;
  if(!this.crossed&&side(z)!==this.lastHitter){if(this.ownBounces!==1)this.point(1-this.lastHitter,'Crossed the line without an own-side bounce');else{this.crossed=true;this.bounceSide=-1;this.bounces=0;}}}
 hit(seat:number){
  if(['ready','toss'].includes(this.phase))return this.serve(seat);
  if(this.phase==='over')return false;
  if(this.mode==='practice'){this.rally++;this.best=Math.max(this.best,this.rally);return true;}
  if(!this.canReturn(seat)){this.point(1-seat,'Hit before your receiving bounce or hit twice');return false;}
  this.lastHitter=seat;this.bounceSide=-1;this.bounces=this.ownBounces=0;this.crossed=false;this.phase='rally';this.rally++;this.message='Your floor once, then cross the line.';return true;
 }
 point(winner:number,why:string){this.score[winner]++;this.server=winner;this.phase='ready';this.message=`${why}. ${winner===0?'Blue':'Red'} scores and serves.`;this.resetRally();
  if(this.score[winner]>=11&&this.score[winner]-this.score[1-winner]>=2){this.phase='over';this.winner=winner;this.message=`${winner===0?'Blue':'Red'} wins! Select a mode to play again.`;}}
}
