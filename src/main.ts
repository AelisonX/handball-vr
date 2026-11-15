import * as T from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {Coop,mountLobby,type Pose} from './coop';
import {Motion,segmentDistance} from './interaction';
import {xrHeadPose} from './poses';
import {fingerCurl,menuDirection,configureGlove,GLOVE_TILT} from './gloves';
import {Ball,COURT,RADIUS} from './ball';
import {Match,type Mode,type Difficulty,side} from './match';
import {buildCourt,tennisBall,glove,Player,COLORS} from './models';
import './style.css';

document.querySelector('#app')!.innerHTML=`<header><small>AELIS'ØN · THE COURTYARD · 01</small><h1>HANDBALL <span>VR</span></h1><p>Two halves. Four walls. One more rally.</p></header><div class="scoreboard"><div class="team blue">BLUE<b id="blue-score">00</b></div><span class="divider">/</span><div class="team red">RED<b id="red-score">00</b></div></div><div class="top-right"><button class="secondary" id="sound">Sound on</button><button class="secondary" id="pause">Pause</button><button class="secondary" id="menu">Menu</button></div><section class="panel"><div class="eyebrow">SMALL COURT. BIG PERSONALITY.</div><h2>Pick your game.</h2><div class="modes"><button id="practice">Wall practice <span>↗</span></button><div class="cpu-row"><select id="difficulty" aria-label="CPU difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><button id="cpu">Play CPU</button></div><button class="secondary" id="online">Online versus · 2 players</button></div><p class="help"><b>PC</b> · WASD move · Mouse positions glove<br>Left click slap · Right click punch<br>Hold E to grab · Release E to throw · Space serve<br>Middle drag / arrows look · P pause · Esc menu<br><b>VR</b> · Move hands to strike · Trigger makes fist<br>Hold grip to grab · Release to throw<br>Stick moves · Right stick turns · A/X menu</p></section><div class="status" id="status"></div><div class="badge">WEBXR / DESKTOP · LOCAL PROTOTYPE 0.1</div></div>`;
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
export const scene=new T.Scene();scene.background=new T.Color('#263d43');scene.fog=new T.Fog('#b3b8a8',12,27);
export const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.04,40);
export const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.prepend(renderer.domElement);
export const rig=new T.Group();scene.add(rig);rig.add(camera);camera.position.set(0,1.65,0);
scene.add(new T.HemisphereLight('#fff4df','#7b8b83',2.6));const light=new T.DirectionalLight('#fff4d4',2.5);light.position.set(-2,5,1);scene.add(light);buildCourt(scene);
const vrButton=VRButton.createButton(renderer);document.body.append(vrButton);vrButton.style.right='24px';vrButton.style.left='auto';vrButton.style.bottom='58px';vrButton.style.width='150px';
export const ball=new Ball(),match=new Match(),coop=new Coop();const mesh=tennisBall(RADIUS);scene.add(mesh);
const shadow=new T.Mesh(new T.CircleGeometry(RADIUS*1.1,24),new T.MeshBasicMaterial({color:'#34433b',transparent:true,opacity:.23,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.009;scene.add(shadow);
const opponent=new Player(scene,COLORS[1]),localBody=new Player(scene,COLORS[0]);localBody.root.traverse(o=>o.layers.set(31));localBody.hands.forEach(h=>h.visible=false);
const desktop=glove(COLORS[0]);scene.add(desktop);const desktopMotion=new Motion();let desktopPrevious=new T.Vector3(),desktopValid=false;
type Hand={input:T.XRTargetRaySpace,grip:T.XRGripSpace,model:T.Group,contact:T.Object3D,motion:Motion,previous:T.Vector3,valid:boolean,tracked:boolean,source?:XRInputSource,closed:boolean,grabbing:boolean,menuDown:boolean,lastHit:number};
export const hands:Hand[]=[];let mode:Mode='practice',active=false,paused=false,seat=0,yaw=0,pitch=-.24,elapsed=0,accumulator=0,sendAt=0,lastPacket=0,owner=-1,ownerHand=0,heldAt=0,releaseGrace=0,muted=false,audio:AudioContext|undefined;
let cpuClock=0,cpuCooldown=0,turnReady=true,pointAt=0,practiceIdle=0,desktopSwing=0,lastDesktopHit=-1,desktopPunch=false;
const keys=new Set<string>(),pointer=new T.Vector2(0,0),ray=new T.Raycaster();let lastMouse=new T.Vector2(),mouseVelocity=new T.Vector2(),lookDrag=false;
const authority=()=>mode!=='online'||coop.host;
function tone(freq=200,volume=.055,duration=.07){if(muted)return;audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.5,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function haptic(index:number,power=.35){void hands[index]?.source?.gamepad?.hapticActuators?.[0]?.pulse(power,45);}
function recolor(root:T.Object3D,color:string){root.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.MeshStandardMaterial).color.set(color);});}
function positionPlayer(){seat=mode==='online'?Math.max(0,coop.slot):0;yaw=seat===0?0:Math.PI;pitch=-.24;rig.position.set(0,0,seat===0?2.55:-2.55);rig.rotation.y=yaw;camera.rotation.set(pitch,0,0,'YXZ');recolor(desktop,COLORS[seat]);hands.forEach(h=>recolor(h.model,COLORS[seat]));}
function head(){return renderer.xr.isPresenting?xrHeadPose(rig,renderer.xr.getCamera()):{position:camera.getWorldPosition(new T.Vector3()),rotation:camera.getWorldQuaternion(new T.Quaternion())};}
function pose():Pose{const h=head();return {mode:renderer.xr.isPresenting?'vr':'mouse',head:{p:h.position.toArray(),q:h.rotation.toArray()},hands:renderer.xr.isPresenting?hands.map(h=>({p:h.contact.getWorldPosition(new T.Vector3()).toArray(),q:h.model.getWorldQuaternion(new T.Quaternion()).toArray(),closed:h.closed,tracked:h.tracked&&h.input.visible})): [{p:desktop.position.toArray(),q:desktop.quaternion.toArray(),closed:keys.has('e'),tracked:true}]};}
function handPoint(slot:number,index:number){if(slot===seat){const h=hands[index];return renderer.xr.isPresenting?h?.tracked&&h.input.visible?h.contact.getWorldPosition(new T.Vector3()):undefined:desktop.position.clone();}const p=coop.peer?.hands[index];return p&&p.tracked!==false?new T.Vector3().fromArray(p.p):undefined;}
function resetBall(){owner=-1;ball.w.set(0,0,0);ball.v.set(0,0,0);ball.q.identity();ball.p.set(0,1.18,match.server===0?2.05:-2.05);pointAt=elapsed;releaseGrace=elapsed+.25;}
function begin(next:Mode,difficulty:Difficulty=$<HTMLSelectElement>('difficulty').value as Difficulty){mode=next;match.reset(next,difficulty);active=true;paused=false;elapsed=0;lastDesktopHit=-1;lastPacket=performance.now();cpuClock=0;cpuCooldown=0;practiceIdle=0;opponent.root.position.set(0,0,-2.7);opponent.root.rotation.y=0;opponent.head.position.y=1.55;positionPlayer();resetBall();document.body.classList.add('playing');lobby.hidden=true;opponent.visible(next!=='practice');recolorShirt();updateUI();}
async function startSolo(next:Mode){if(coop.joined)await coop.leave();begin(next);}
$('practice').onclick=()=>void startSolo('practice');$('cpu').onclick=()=>void startSolo('cpu');
const lobby=mountLobby(coop,()=>{},()=>void coop.request('start').catch(e=>{$('room-status').textContent=e.message;}),()=>{active=false;mode='practice';owner=-1;document.body.classList.remove('playing');});
$('online').onclick=()=>{lobby.hidden=false;};
function menu(){if(mode==='online'&&coop.running)coop.send('control',{action:'pause'});paused=true;document.body.classList.remove('playing');if(renderer.xr.isPresenting)vrMenu.visible=true;updateUI();}
function togglePause(){if(!active)return;if(mode==='online')coop.send('control',{action:paused?'resume':'pause'});else paused=!paused;if(!paused)document.body.classList.add('playing');vrMenu.visible=paused;updateUI();}
$('menu').onclick=menu;$('pause').onclick=togglePause;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'Sound off':'Sound on';};
function updateUI(){for(const [i,id]of ['blue-score','red-score'].entries())$(id).textContent=String(match.score[i]).padStart(2,'0');$('status').textContent=!active?'Schoolyard handball. Walls stay in play. Choose a mode.':paused?'Paused · P / A / X to resume.':match.message;$('pause').textContent=paused?'Resume':'Pause';}
function state(){return {beans:[],ball:{p:ball.p.toArray(),v:ball.v.toArray(),w:ball.w.toArray(),q:ball.q.toArray()},match:{...match},owner,ownerHand,paused};}
function receiveState(s:any){if(!s?.ball||!Array.isArray(s.ball.p)||s.ball.p.length!==3||!s.ball.p.every(Number.isFinite))return;ball.p.fromArray(s.ball.p);ball.v.fromArray(s.ball.v);ball.w.fromArray(s.ball.w);ball.q.fromArray(s.ball.q);Object.assign(match,s.match);owner=s.owner;ownerHand=s.ownerHand;paused=s.paused;lastPacket=performance.now();}
coop.onPacket=m=>{if(m.type==='start')begin('online');else if(m.type==='snapshot'&&!coop.host)receiveState(m.state);else if(m.type==='action'&&coop.host&&m.action==='ball')handleAction(m.slot,m);else if(m.type==='control'){if(m.action==='pause')paused=true;if(m.action==='resume'&&coop.peerReady&&coop.count===2){paused=false;document.body.classList.add('playing');}vrMenu.visible=paused;updateUI();}};
// Keep the original reliable RTC action path; only the host decides contacts and scores.
function action(kind:string,data:Record<string,unknown>={},hand=0){const m={action:'ball',kind,hand,...data};if(mode==='online'){coop.send('pose',{pose:pose()});coop.send('action',m);}else handleAction(seat,m);}
function handleAction(slot:number,m:any){
 if(!active||paused||match.phase==='over')return;
 const p=handPoint(slot,m.hand);if(!p)return;
 if(m.kind==='serve'){if(match.server!==slot||match.phase!=='ready')return;autoServe(slot);return;}
 if(m.kind==='grab'){
  if(owner!==-1||p.distanceTo(ball.p)>.33||mode!=='practice'&&side(p.z)!==slot||match.phase==='ready'&&match.server!==slot)return;
  if(match.phase!=='ready'&&mode!=='practice'&&!match.hit(slot)){resetBall();return;}
  owner=slot;ownerHand=m.hand;heldAt=elapsed;return;
 }
 if(m.kind==='release'){
  if(owner!==slot||ownerHand!==m.hand)return;
  owner=-1;const v=new T.Vector3().fromArray(m.v??[0,0,0]).clampLength(0,12);ball.p.copy(p);ball.v.copy(v);ball.w.set(0,0,0);releaseGrace=elapsed+.2;
  if(match.phase==='ready')match.serve(slot);return;
 }
 if(m.kind==='hit'){
  if(owner!==-1||elapsed-lastDesktopHit<.12||mode!=='practice'&&side(ball.p.z)!==slot||p.distanceTo(ball.p)>.65)return;
  const velocity=new T.Vector3().fromArray(m.v??[0,0,0]).clampLength(0,12),normal=new T.Vector3().fromArray(m.n??[0,0,slot===0?-1:1]);
  if(velocity.clone().sub(ball.v).dot(normal.clone().normalize())<=.15)return;
  if(match.phase==='ready'){if(match.server!==slot)return;match.serve(slot);}else if(!match.hit(slot)){resetBall();return;}
  ball.strike(velocity,normal,new T.Vector3().fromArray(m.offset??[0,0,0]),!!m.punch);releaseGrace=elapsed+.16;lastDesktopHit=elapsed;tone(m.punch?115:250);if(slot===seat)haptic(m.hand,m.punch?.6:.3);
 }
}
function autoServe(slot:number){if(owner>=0&&owner!==slot)return;owner=-1;if(!match.serve(slot))return;ball.p.set((slot===0?1:-1)*.1,1.15,slot===0?2:-2);ball.v.set(0,mode==='practice'?3.8:-2.1,mode==='practice'?-9:slot===0?-3.8:3.8);ball.w.set(0,0,0);releaseGrace=elapsed+.2;tone(300);}
function desktopTarget(){ray.setFromCamera(pointer,camera);const sign=seat===0?1:-1,z=mode==='practice'?T.MathUtils.clamp(ball.p.z,-3.7,3.7):sign*T.MathUtils.clamp(Math.abs(ball.p.z),.3,3.7),plane=new T.Plane(new T.Vector3(0,0,1),-z),point=ray.ray.intersectPlane(plane,new T.Vector3());
 if(point){const base=head().position,delta=point.clone().sub(base).clampLength(0,2.1);point.copy(base).add(delta);point.x=T.MathUtils.clamp(point.x,-2.35,2.35);point.y=T.MathUtils.clamp(point.y,.15,2.6);point.z=mode==='practice'?T.MathUtils.clamp(point.z,-3.8,3.8):sign*T.MathUtils.clamp(point.z*sign,.2,3.8);return point;}return new T.Vector3(0,1,sign*1.5);}
function mouseHit(punch:boolean){if(!active||paused||renderer.xr.isPresenting)return;const d=seat===0?-1:1,speed=T.MathUtils.clamp(4+mouseVelocity.length()*.025,4,8),normal=new T.Vector3(pointer.x*.12,-.16,d).normalize();
 const velocity=normal.clone().multiplyScalar(punch?speed*1.3:speed);velocity.x+=mouseVelocity.x*.008;velocity.y-=mouseVelocity.y*.006;
 action('hit',{v:velocity.toArray(),n:normal.toArray(),offset:[T.MathUtils.clamp(mouseVelocity.x*.0003,-.1,.1),T.MathUtils.clamp(-mouseVelocity.y*.0003,-.1,.1),-d*.07],punch});desktopSwing=.16;desktopPunch=punch;}
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('mousedown',e=>{tone(80,.001,.01);if(e.button===1){lookDrag=true;e.preventDefault();}else if(e.button===0||e.button===2)mouseHit(e.button===2);});
window.addEventListener('mouseup',()=>lookDrag=false);window.addEventListener('mousemove',e=>{if(lookDrag&&!renderer.xr.isPresenting){yaw-=e.movementX*.003;pitch=T.MathUtils.clamp(pitch-e.movementY*.003,-1.3,1);}
 pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);mouseVelocity.set(e.clientX-lastMouse.x,e.clientY-lastMouse.y).multiplyScalar(5);lastMouse.set(e.clientX,e.clientY);});
window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;const k=e.key.toLowerCase();keys.add(k);if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;
 if(k===' ')action('serve');if(k==='p')togglePause();if(k==='escape')menu();if(k==='e'&&active&&!paused)action('grab');});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k==='e'){action('release',{v:desktopMotion.velocity().toArray()});}});
window.addEventListener('blur',()=>{keys.clear();if(owner===seat)action('release',{v:[0,0,0]},ownerHand);if(active&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused)togglePause();});

for(let i=0;i<2;i++){
 const grip=renderer.xr.getControllerGrip(i),input=renderer.xr.getController(i);rig.add(grip,input);const model=glove(COLORS[0],i?'right':'left',true);input.add(model);const contact=new T.Object3D();contact.position.set(0,-.018,-.02);model.add(contact);
 const h:Hand={input,grip,model,contact,motion:new Motion(),previous:new T.Vector3(),valid:false,tracked:false,closed:false,grabbing:false,menuDown:false,lastHit:-10};hands.push(h);
 const laser=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-3)]),new T.LineBasicMaterial({color:'#c6d286',transparent:true,opacity:.65}));laser.rotation.x=GLOVE_TILT;laser.visible=false;input.add(laser);input.userData.menuLaser=laser;
 input.addEventListener('connected',e=>{h.tracked=true;h.source=e.data;configureGlove(model,e.data.handedness==='right'?'right':'left');const thumb=model.children[6];if(thumb)thumb.position.x=e.data.handedness==='right'?-.05:.05;h.valid=false;h.motion.clear();});input.addEventListener('disconnected',()=>{if(owner===seat&&ownerHand===i)action('release',{v:[0,0,0]},i);h.tracked=h.valid=false;h.motion.clear();});
 input.addEventListener('selectstart',()=>{if(!active||paused){selectVR(h);return;}h.closed=true;});input.addEventListener('selectend',()=>h.closed=false);
 input.addEventListener('squeezestart',()=>{h.grabbing=true;action('grab',{},i);});input.addEventListener('squeezeend',()=>{h.grabbing=false;action('release',{v:h.motion.velocity().toArray()},i);});
}
renderer.xr.addEventListener('sessionstart',()=>{keys.clear();hands.forEach(h=>{h.valid=false;h.motion.clear();});vrMenu.visible=!active||paused;});
renderer.xr.addEventListener('sessionend',()=>{if(owner===seat)action('release',{v:[0,0,0]},ownerHand);hands.forEach(h=>{h.valid=false;h.motion.clear();});camera.position.set(0,1.65,0);camera.rotation.set(pitch,0,0);vrMenu.visible=false;});
// A browser keyboard is still used for room names before entering VR, as in Bean There.
const menuCanvas=document.createElement('canvas');menuCanvas.width=768;menuCanvas.height=768;const ctx=menuCanvas.getContext('2d')!,menuTexture=new T.CanvasTexture(menuCanvas);
const vrMenu=new T.Mesh(new T.PlaneGeometry(.95,.95),new T.MeshBasicMaterial({map:menuTexture,side:T.DoubleSide}));rig.add(vrMenu);vrMenu.position.set(0,1.45,-.95);vrMenu.visible=false;
const boardCanvas=document.createElement('canvas');boardCanvas.width=1024;boardCanvas.height=256;const boardTexture=new T.CanvasTexture(boardCanvas),boardContext=boardCanvas.getContext('2d')!;
for(const z of [-3.99,3.99]){const board=new T.Mesh(new T.PlaneGeometry(3.2,.8),new T.MeshBasicMaterial({map:boardTexture}));board.position.set(0,2.65,z);if(z>0)board.rotation.y=Math.PI;scene.add(board);}
function drawPanels(){boardContext.fillStyle='#18333b';boardContext.fillRect(0,0,1024,256);boardContext.textAlign='center';boardContext.fillStyle='#e9e3d2';boardContext.font='bold 70px sans-serif';boardContext.fillText(`BLUE  ${match.score[0]}   /   ${match.score[1]}  RED`,512,95);boardContext.font='26px sans-serif';boardContext.fillText(paused?'PAUSED':match.message,512,162);boardContext.font='20px sans-serif';boardContext.fillStyle='#b5c488';boardContext.fillText(mode==='practice'?`WALL PRACTICE · BEST ${match.best}`:'FIRST TO 11 · WIN BY TWO · WALLS STAY IN PLAY',512,215);boardTexture.needsUpdate=true;
 ctx.fillStyle='#18333b';ctx.fillRect(0,0,768,768);ctx.textAlign='center';ctx.fillStyle='#eee8d7';ctx.font='bold 50px sans-serif';ctx.fillText('HANDBALL VR',384,100);const labels=[active?'RESUME':'WALL PRACTICE','CPU · EASY','CPU · MEDIUM','CPU · HARD',mode==='online'&&coop.joined?'ONLINE · RESTART MATCH':'ONLINE · ROOM SETUP','SERVE'];labels.forEach((label,i)=>{ctx.fillStyle=i===0?'#c6d286':'#2b4b53';ctx.fillRect(60,150+i*88,648,70);ctx.fillStyle=i===0?'#18333b':'#eee8d7';ctx.font='bold 27px sans-serif';ctx.fillText(label,384,194+i*88);});menuTexture.needsUpdate=true;
}
function selectVR(h:Hand){const origin=h.input.getWorldPosition(new T.Vector3());ray.set(origin,menuDirection(h.input));const hit=ray.intersectObject(vrMenu)[0];if(!hit?.uv)return;const row=Math.floor(((1-hit.uv.y)*768-150)/88);if(row<0||row>5)return;
 if(row===0){if(active)togglePause();else begin('practice');}else if(row<4){if(coop.joined){match.message='Leave the online room in your browser before starting CPU.';return;}begin('cpu',(['easy','medium','hard'] as Difficulty[])[row-1]);}else if(row===4){if(mode==='online'&&coop.joined&&coop.host)void coop.request('start');else{void renderer.xr.getSession()?.end();lobby.hidden=false;}}else{if(paused)togglePause();action('serve',{},hands.indexOf(h));}vrMenu.visible=paused||!active;}

function updateInput(dt:number){
 const immersive=renderer.xr.isPresenting;desktop.visible=!immersive;
 if(!immersive){if(active&&!paused){const forward=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),movement=new T.Vector3();movement.addScaledVector(forward,(keys.has('w')?1:0)-(keys.has('s')?1:0)).addScaledVector(right,(keys.has('d')?1:0)-(keys.has('a')?1:0));if(movement.lengthSq())rig.position.addScaledVector(movement.normalize(),dt*2.2);yaw+=((keys.has('arrowleft')?1:0)-(keys.has('arrowright')?1:0))*dt*1.5;pitch=T.MathUtils.clamp(pitch+((keys.has('arrowup')?1:0)-(keys.has('arrowdown')?1:0))*dt,-1.3,1);}
  rig.rotation.y=yaw;camera.rotation.set(pitch,0,0,'YXZ');const target=desktopTarget();desktop.position.lerp(target,1-Math.exp(-24*dt));desktop.lookAt(desktop.position.clone().add(new T.Vector3(0,-.15,seat===0?-1:1)));desktopMotion.record(desktop.position,performance.now()/1000);desktopSwing=Math.max(0,desktopSwing-dt);if(desktopSwing>0&&desktop.position.distanceTo(ball.p)<.7)desktop.position.lerp(ball.p,Math.sin(desktopSwing/.16*Math.PI)*.55);for(const finger of desktop.children.slice(2,6))finger.rotation.x=fingerCurl(keys.has('e')||desktopSwing>0&&desktopPunch);mouseVelocity.multiplyScalar(Math.exp(-6*dt));
 }else{
  for(const [i,h]of hands.entries()){
   h.model.visible=h.tracked&&h.input.visible;h.input.userData.menuLaser.visible=immersive&&vrMenu.visible&&h.model.visible;if(!h.tracked||!h.input.visible){h.valid=false;h.motion.clear();continue;}
   const gp=h.source?.gamepad,menuPressed=!!gp?.buttons[4]?.pressed;if(menuPressed&&!h.menuDown){if(!active){paused=true;vrMenu.visible=true;}else togglePause();}h.menuDown=menuPressed;
   const axes=gp?.axes;if(active&&!paused&&axes&&axes.length>=4){if(h.source?.handedness==='left'){const ax=Math.abs(axes[2])>.2?axes[2]:0,ay=Math.abs(axes[3])>.2?axes[3]:0;const orientation=new T.Euler().setFromQuaternion(head().rotation,'YXZ').y;rig.position.x+=(Math.cos(orientation)*ax+Math.sin(orientation)*ay)*dt*1.8;rig.position.z+=(-Math.sin(orientation)*ax+Math.cos(orientation)*ay)*dt*1.8;}else if(Math.abs(axes[2])>.7&&turnReady){rig.rotation.y-=Math.sign(axes[2])*Math.PI/6;turnReady=false;}else if(Math.abs(axes[2])<.3)turnReady=true;}
   const p=h.contact.getWorldPosition(new T.Vector3());h.motion.record(p,performance.now()/1000);for(const finger of h.model.children.slice(2,6))finger.rotation.x=fingerCurl(h.closed||h.grabbing);
   if(active&&!paused&&h.valid&&owner===-1&&elapsed>releaseGrace&&elapsed-h.lastHit>.2&&(mode==='practice'||side(ball.p.z)===seat)){
    // Relative swept motion catches fast hand/ball contact between rendered frames.
    const from=h.previous.clone().sub(ball.v.clone().multiplyScalar(-dt));
    if(segmentDistance(ball.p,from,p)<RADIUS+.065){const v=h.motion.velocity(),n=ball.p.clone().sub(p).normalize();if(v.clone().sub(ball.v).dot(n)>.35){action('hit',{v:v.toArray(),n:n.toArray(),offset:p.clone().sub(ball.p).clampLength(0,RADIUS).toArray(),punch:h.closed},i);h.lastHit=elapsed;}}
   }
   h.previous.copy(p);h.valid=true;
  }
 }
 rig.position.x=T.MathUtils.clamp(rig.position.x,-2.12,2.12);rig.position.z=mode==='practice'?T.MathUtils.clamp(rig.position.z,-3.5,3.5):seat===0?T.MathUtils.clamp(rig.position.z,.35,3.5):T.MathUtils.clamp(rig.position.z,-3.5,-.35);
 const hp=head();localBody.root.position.set(hp.position.x,0,hp.position.z);localBody.root.rotation.y=new T.Euler().setFromQuaternion(hp.rotation,'YXZ').y;localBody.hands.forEach(h=>h.visible=false);
 desktopPrevious.copy(desktop.position);desktopValid=true;
}
const settings={easy:{speed:1.3,reaction:.42,error:.5,power:3.25},medium:{speed:2.15,reaction:.24,error:.25,power:4},hard:{speed:3,reaction:.12,error:.08,power:5}};
function cpu(dt:number){
 if(mode!=='cpu')return;const cfg=settings[match.difficulty];cpuClock+=dt;cpuCooldown-=dt;
 if(match.phase==='ready'&&match.server===1&&elapsed-pointAt>1.3){autoServe(1);return;}
 if(cpuClock>cfg.reaction){cpuClock=0;opponent.root.userData.target=ball.p.clone().add(new T.Vector3(Math.sin(elapsed*2.7)*cfg.error,0,0));}
 const target=opponent.root.userData.target as T.Vector3|undefined;if(target&&ball.p.z<0&&match.phase!=='ready'){const to=new T.Vector3(T.MathUtils.clamp(target.x,-2.1,2.1),0,T.MathUtils.clamp(target.z,-3.55,-.5));opponent.root.position.add(to.sub(opponent.root.position).clampLength(0,cfg.speed*dt));}
 const base=opponent.root.position;opponent.hands.forEach((h,i)=>{h.position.set(base.x+(i? .24:-.24),T.MathUtils.clamp(ball.p.y,.35,1.35),base.z+.3);h.rotation.y=Math.PI;});
 if(match.phase==='rally'&&match.bounceSide===1&&match.bounces===1&&ball.p.z<-.15&&ball.p.y<1.6&&cpuCooldown<=0&&Math.hypot(ball.p.x-base.x,ball.p.z-base.z)<.8){
  const n=new T.Vector3((Math.sin(elapsed*1.6)*cfg.error-ball.p.x)*.15,-.08,1).normalize();if(match.hit(1)){ball.strike(n.clone().multiplyScalar(cfg.power),n,new T.Vector3(.02,-.03,-.08),match.difficulty==='hard'&&Math.sin(elapsed)>0);releaseGrace=elapsed+.2;tone(220);opponent.hands[1].position.copy(ball.p);cpuCooldown=.5;}
 }
}
function remoteAvatar(dt:number){if(mode!=='online'||!coop.peer)return;const p=coop.peer,position=new T.Vector3().fromArray(p.head.p),q=new T.Quaternion().fromArray(p.head.q);opponent.root.position.lerp(new T.Vector3(position.x,0,position.z),1-Math.exp(-20*dt));opponent.root.rotation.y=new T.Euler().setFromQuaternion(q,'YXZ').y+Math.PI;opponent.head.position.y=position.y-.1;
 recolorShirt();opponent.hands.forEach((h,i)=>{const point=p.hands[i];h.visible=!!point&&point.tracked!==false;if(point){h.position.lerp(new T.Vector3().fromArray(point.p),1-Math.exp(-25*dt));h.quaternion.fromArray(point.q);}});
}
function recolorShirt(){const shirt=opponent.root.children[0] as T.Mesh;(shirt.material as T.MeshStandardMaterial).color.set(COLORS[1-seat]);opponent.hands.forEach(h=>recolor(h,COLORS[1-seat]));}
function simulate(dt:number){
 if(!active||paused)return;elapsed+=dt;cpu(dt);
 if(owner>=0){const p=handPoint(owner,ownerHand);if(!p){owner=-1;ball.v.set(0,0,0);}else{ball.p.copy(p);ball.v.set(0,0,0);if(match.phase!=='ready'&&elapsed-heldAt>2){if(mode!=='practice')match.point(1-owner,'Held the ball too long');else match.phase='ready';resetBall();}}return;}
 if(match.phase==='ready'||match.phase==='over')return;
 ball.step(dt,surface=>{if(match.phase==='ready'||match.phase==='over')return;tone(surface==='floor'?170:310,Math.min(.07,.015+ball.v.length()*.005));if(surface==='floor')match.floor(ball.p.z);});
 match.crossing(ball.p.z);
 if((match.phase as string)==='ready'||(match.phase as string)==='over'){resetBall();return;}
 if(ball.v.length()<.15){practiceIdle+=dt;if(practiceIdle>1){if(mode==='practice'){match.phase='ready';match.message='Grab the ball or press Space to serve again.';}else match.point(1-side(ball.p.z),'Ball stopped');resetBall();practiceIdle=0;}}else practiceIdle=0;
}
let previous=performance.now(),uiAt=0;
renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.05,(now-previous)/1000);previous=now;updateInput(dt);
 if(authority()){accumulator+=dt;while(accumulator>=1/180){simulate(1/180);accumulator-=1/180;}}else if(active&&!paused){elapsed+=dt;if(now-lastPacket>3000&&coop.running){paused=true;match.message='Waiting for host updates.';}}
 if(mode==='online'&&coop.peerReady&&now-sendAt>33){sendAt=now;coop.send('pose',{pose:pose()});if(coop.host)coop.send('snapshot',{state:state()});}
 remoteAvatar(dt);mesh.position.copy(ball.p);mesh.quaternion.copy(ball.q);shadow.position.set(ball.p.x,.009,ball.p.z);shadow.scale.setScalar(1+ball.p.y*.15);(shadow.material as T.MeshBasicMaterial).opacity=.28/(1+ball.p.y*.9);
 if(now-uiAt>120){uiAt=now;updateUI();drawPanels();}renderer.render(scene,camera);
});
opponent.root.position.set(0,0,-2.7);opponent.root.rotation.y=0;opponent.visible(false);positionPlayer();resetBall();drawPanels();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// Development-only hooks support real-browser and synthetic controller regression checks.
if(import.meta.env.DEV)(window as any).handball={ball,match,coop,hands,rig,camera,scene,renderer,desktop,begin,state,action,autoServe,handleAction,get owner(){return owner;},get paused(){return paused;},setPaused:(p:boolean)=>paused=p};
