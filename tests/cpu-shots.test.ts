import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {Ball} from '../src/ball';import {CPU_SHOTS,planCpuShot} from '../src/cpu-shots';import {spinKind} from '../src/spin-trail';import {PHYSICS_DEFAULTS} from '../src/physics-options';import {CourtGame} from '../src/court-game';import {predictIntercept} from '../src/cpu';
test('approved playtest physics defaults are saved',()=>{assert.equal(PHYSICS_DEFAULTS.hitPower,1);assert.equal(PHYSICS_DEFAULTS.bounce,.9);});
test('CPU shot repertoire produces distinct legal trajectories and physical spin',()=>{
 const outcomes:Record<string,{peak:number,land:number,speed:number,spin:string}>={};
 for(const kind of CPU_SHOTS){const b=new Ball();b.p.set(0,1,-2.6);b.v.set(0,-1,-3);const shot=planCpuShot(b,kind,6,0);assert.ok(shot.planned,kind);assert.ok(b.strike(shot.v,shot.n,shot.offset));const speed=b.v.length(),spin=spinKind(b.v,b.w);let own=0,received=0,peak=0,land=0;
  for(let i=0;i<450;i++){b.step(1/90,s=>{if(s==='floor'){if(b.p.z<0)own++;else{received++;land=b.p.z;}}});if(b.p.z>=0)peak=Math.max(peak,b.p.y);if(received||own>1)break;}
  assert.equal(own,1,kind);assert.equal(received,1,kind);outcomes[kind]={peak,land,speed,spin};
 }
 assert.ok(outcomes.lob.peak>2.7&&outcomes.lob.peak>outcomes.drive.peak+1);
 assert.ok(outcomes.drop.land<1&&outcomes.drop.speed<outcomes.drive.speed);
 assert.equal(outcomes.topspin.spin,'top');assert.equal(outcomes.backspin.spin,'back');assert.equal(outcomes.sidespin.spin,'side');
});
test('CPU can plan materially different power levels through the same hand solver',()=>{const launch=(power:number)=>{const b=new Ball();b.p.set(0,1,-2.6);b.v.set(0,-1,-3);const s=planCpuShot(b,'drive',power,0);assert.ok(s.planned);b.strike(s.v,s.n,s.offset);return b.v.z;};assert.ok(launch(9)>launch(3)+2);});
test('predictor considers legal overhead contacts above the previous 1.65m limit',()=>{const g=new CourtGame();g.start('cpu','hard');Object.assign(g.match,{phase:'rally',lastHitter:0,crossed:true,bounceSide:1,bounces:1,ownBounces:1});g.ball.p.set(0,2.05,-2.6);g.ball.v.set(0,-1,-7);const hit=predictIntercept(g.ball,g.match,1,3.8,new Vector3(0,0,-2.8),2.35,.73);assert.ok(hit);assert.ok(hit.p.y>1.65);});
