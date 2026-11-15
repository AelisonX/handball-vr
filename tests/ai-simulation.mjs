import {CourtGame} from '../src/court-game.ts';
import {CpuPlayer} from '../src/cpu.ts';
import {Vector3} from 'three';
import assert from 'node:assert/strict';
const results={};
for(const difficulty of ['easy','medium','hard']){
 let returns=0,legal=0,total=0,centralLegal=0,centralTotal=0;const failures={};
 for(const cpuX of [-1.8,0,1.8])for(const x of [-1.8,0,1.8])for(const vx of [-5,0,5])for(const speed of [3.8,6,9]){
  const g=new CourtGame(),cpu=new CpuPlayer();g.start('cpu',difficulty);cpu.position.x=cpuX;g.autoServe(0);g.ball.p.set(x,.9,3.1);g.ball.v.set(vx,-3.2,-speed);total++;if(cpuX===0)centralTotal++;
  let hit=false;
  for(let i=0;i<1080;i++){
   cpu.update(1/180,g,new Vector3(0,1.65,2.55));g.step(1/180);
   if(cpu.returns>0&&!hit){returns++;hit=true;}
   if(hit&&g.match.lastHitter===1&&g.match.crossed){legal++;if(cpuX===0)centralLegal++;break;}
   if(g.match.phase==='ready'||g.match.phase==='over'){if(hit)failures[g.match.message]=(failures[g.match.message]??0)+1;break;}
  }
 }
 results[difficulty]={returns,legal,total,centralLegal,centralTotal,failures};
}
console.log(JSON.stringify(results,null,2));
assert.ok(results.hard.legal>results.medium.legal,'Hard should cover more of the shot set than Medium');
assert.ok(results.medium.legal>results.easy.legal,'Medium should cover more than Easy');
assert.ok(results.hard.centralLegal>=results.hard.centralTotal*.75,'Hard should remain strong while leaving openings from a good starting position');
assert.ok(results.easy.centralLegal<=results.easy.centralTotal*.5,'Easy should miss enough placement and pace shots');
console.log('PASS: physically simulated difficulty separation and legal CPU returns.');

