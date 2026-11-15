import * as T from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {Coop,mountLobby,type Pose} from './coop';
import {Motion} from './interaction';
import {xrHeadPose} from './poses';
import {fingerCurl,menuDirection,configureGlove,GLOVE_TILT} from './gloves';
import {mountOptions} from './options-ui';
import {CatchInput,PHYSICS_DEFAULTS,validPhysics,type PhysicsOptions} from './physics-options';
import {SpinTrail} from './spin-trail';
import {RADIUS,COURT} from './ball';
import {type Mode,type Difficulty,side} from './match';
import {buildCourt,tennisBall,glove,Player,COLORS,box} from './models';
import {CourtGame} from './court-game';
import {CpuPlayer} from './cpu';
import {handContact,rotationVelocity} from './hand-contact';
import {bounceShot,handVelocityForShot} from './shots';
import {assistedDelta,playerIntercept,type MovementMode} from './locomotion';
import './style.css';

document.querySelector('#app')!.innerHTML=`<header><small>AELIS'ØN · THE COURTYARD · 01</small><h1>HANDBALL <span>VR</span></h1><p>Two halves. Four walls. One more rally.</p></header><div class="scoreboard"><div class="team blue">BLUE<b id="blue-score">00</b></div><span class="divider">/</span><div class="team red">RED<b id="red-score">00</b></div></div><div class="top-right"><button class="secondary" id="sound">Sound on</button><button class="secondary" id="pause">Pause</button><button class="secondary" id="options">Options</button><button class="secondary" id="menu">Menu</button></div><section class="panel"><div class="eyebrow">SMALL COURT. BIG PERSONALITY.</div><h2>Pick your game.</h2><div class="modes"><button id="practice">Wall practice <span>↗</span></button><div class="cpu-row"><select id="difficulty" aria-label="CPU difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="rally">Rally partner</option></select><button id="cpu">Play CPU</button></div><button class="secondary" id="online">Online versus · 2 players</button></div><p class="help"><b>PC</b> · WASD move · Mouse positions glove<br>Left click slap · Right click punch<br>Ctrl + click soft · Shift + click lob<br>Hold E to grab · Release E to throw · Space serve<br>Middle drag / arrows look · P pause · Esc menu<br><b>VR</b> · Move hands to strike · Trigger makes fist<br>Press grip or trigger near ball to catch · Hold to keep it<br>Practice: hold either 2.5s to recall ball<br>Choose stick / teleport / auto in menu · Left stick click teleports · A/X menu</p></section><div class="status" id="status"></div><div class="badge">WEBXR / DESKTOP · PLAYTEST 0.4</div></div>`;
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
document.querySelector('.panel')!.insertAdjacentHTML('beforeend','<label class="movement-setting">VR movement <select id="movement" aria-label="VR movement"><option value="stick">Stick movement</option><option value="teleport">Teleport to intercept</option><option value="auto">Auto move to ball</option></select></label>');
export const scene=new T.Scene();scene.background=new T.Color('#263d43');scene.fog=new T.Fog('#b3b8a8',12,27);
export const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.04,40);
export const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.prepend(renderer.domElement);
export const rig=new T.Group();scene.add(rig);rig.add(camera);camera.position.set(0,1.65,0);
scene.add(new T.HemisphereLight('#fff4df','#7b8b83',2.6));const light=new T.DirectionalLight('#fff4d4',2.5);light.position.set(-2,5,1);scene.add(light);buildCourt(scene);
const vrButton=VRButton.createButton(renderer);document.body.append(vrButton);vrButton.style.right='24px';vrButton.style.left='auto';vrButton.style.bottom='58px';vrButton.style.width='150px';
export const game=new CourtGame(),ball=game.ball,match=game.match,coop=new Coop();const mesh=tennisBall(RADIUS);scene.add(mesh);const spinTrail=new SpinTrail(scene);
const practiceWall=new T.Group();practiceWall.name='practice-half-court-wall';scene.add(practiceWall);
box(practiceWall,'#ded9cb',[0,COURT.height/2,-.08],[COURT.halfWidth*2+.2,COURT.height,.16]);box(practiceWall,COLORS[0],[0,1.1,.012],[COURT.halfWidth*2,.05,.02]);
const shadow=new T.Mesh(new T.CircleGeometry(RADIUS*1.1,24),new T.MeshBasicMaterial({color:'#34433b',transparent:true,opacity:.23,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.009;scene.add(shadow);
const opponent=new Player(scene,COLORS[1]),localBody=new Player(scene,COLORS[0]);localBody.root.traverse(o=>o.layers.set(31));localBody.hands.forEach(h=>h.visible=false);
const desktop=glove(COLORS[0]);scene.add(desktop);const desktopMotion=new Motion(12);
type Hand={input:T.XRTargetRaySpace,grip:T.XRGripSpace,model:T.Group,contact:T.Object3D,motion:Motion,previous:T.Vector3,previousRotation:T.Quaternion,valid:boolean,tracked:boolean,source?:XRInputSource,closed:boolean,grabbing:boolean,menuDown:boolean,teleportDown:boolean,catchInput:CatchInput};
export const hands:Hand[]=[];let mode:Mode='practice',active=false,paused=false,seat=0,yaw=0,pitch=-.24,accumulator=0,sendAt=0,lastPacket=0,muted=false,audio:AudioContext|undefined;
let turnReady=true,desktopSwing=0,desktopPunch=false,movementMode:MovementMode='stick',assistTarget:T.Vector3|undefined,nextAssistAt=0;
const cpuPlayer=new CpuPlayer(),previousBallForHands=new T.Vector3();
const landingMarker=new T.Mesh(new T.RingGeometry(.17,.21,32),new T.MeshBasicMaterial({color:'#91c9fb',side:T.DoubleSide,transparent:true,opacity:.8}));landingMarker.rotation.x=-Math.PI/2;landingMarker.visible=false;scene.add(landingMarker);
let rallyRecord=0;try{rallyRecord=Number(localStorage.getItem('handball-rally-best'))||0;}catch{}
document.querySelector('.scoreboard')!.insertAdjacentHTML('beforeend','<small id="rally-record" style="position:absolute;top:100%;left:50%;transform:translateX(-50%);width:220px;white-space:nowrap;text-align:center;font-size:12px;color:#eee8d7;background:#18333bbd;border-radius:6px;padding:5px;margin-top:5px"></small>');
const desktopCatch=new CatchInput();
const keys=new Set<string>(),pointer=new T.Vector2(0,0),ray=new T.Raycaster();let lastMouse=new T.Vector2(),mouseVelocity=new T.Vector2(),lookDrag=false;
const authority=()=>mode!=='online'||coop.host;
function tone(freq=200,volume=.055,duration=.07){if(muted)return;audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.5,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function haptic(index:number,power=.35){void hands[index]?.source?.gamepad?.hapticActuators?.[0]?.pulse(power,45);}
function recolor(root:T.Object3D,color:string){root.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.MeshStandardMaterial).color.set(color);});}
function positionPlayer(){seat=mode==='online'?Math.max(0,coop.slot):0;yaw=seat===0?0:Math.PI;pitch=-.24;rig.position.set(0,0,seat===0?2.55:-2.55);rig.rotation.y=yaw;camera.rotation.set(pitch,0,0,'YXZ');recolor(desktop,COLORS[seat]);hands.forEach(h=>recolor(h.model,COLORS[seat]));}
function head(){return renderer.xr.isPresenting?xrHeadPose(rig,renderer.xr.getCamera()):{position:camera.getWorldPosition(new T.Vector3()),rotation:camera.getWorldQuaternion(new T.Quaternion())};}
function pose():Pose{const h=head();return {mode:renderer.xr.isPresenting?'vr':'mouse',head:{p:h.position.toArray(),q:h.rotation.toArray()},hands:renderer.xr.isPresenting?hands.map(h=>({p:h.contact.getWorldPosition(new T.Vector3()).toArray(),q:h.model.getWorldQuaternion(new T.Quaternion()).toArray(),closed:h.catchInput.closed,tracked:h.tracked&&h.input.visible})): [{p:desktop.position.toArray(),q:desktop.quaternion.toArray(),closed:keys.has('e'),tracked:true}]};}
function handPoint(slot:number,index:number){if(slot===seat){const h=hands[index];return renderer.xr.isPresenting?h?.tracked&&h.input.visible?h.contact.getWorldPosition(new T.Vector3()):undefined:desktop.position.clone();}const p=coop.peer?.hands[index];return p&&p.tracked!==false?new T.Vector3().fromArray(p.p):undefined;}
function resetBall(){game.resetBall();previousBallForHands.copy(ball.p);}
function begin(next:Mode,difficulty:Difficulty=$<HTMLSelectElement>('difficulty').value as Difficulty){mode=next;game.start(next,difficulty);active=true;paused=false;lastPacket=performance.now();cpuPlayer.reset();syncOptions();assistTarget=undefined;nextAssistAt=0;opponent.root.position.set(0,0,-2.7);opponent.root.rotation.y=0;opponent.head.position.y=1.55;practiceWall.visible=next==='practice';practiceBoard.visible=next==='practice';positionPlayer();resetBall();hands.forEach(h=>{h.valid=false;h.motion.clear();h.catchInput.clear();h.closed=h.grabbing=false;});desktopCatch.clear();vrMenu.visible=false;document.body.classList.add('playing');lobby.hidden=true;opponent.visible(next!=='practice');recolorShirt();updateUI();}
async function startSolo(next:Mode){if(coop.joined)await coop.leave();begin(next);}
$('practice').onclick=()=>void startSolo('practice');$('cpu').onclick=()=>void startSolo('cpu');
const lobby=mountLobby(coop,()=>{},()=>void coop.request('start').catch(e=>{$('room-status').textContent=e.message;}),()=>{active=false;mode='practice';game.owner=-1;document.body.classList.remove('playing');});
$('online').onclick=()=>{lobby.hidden=false;};
function menu(){if(mode==='online'&&coop.running)coop.send('control',{action:'pause'});paused=true;document.body.classList.remove('playing');if(renderer.xr.isPresenting)vrMenu.visible=true;updateUI();}
function togglePause(){if(!active)return;if(mode==='online')coop.send('control',{action:paused?'resume':'pause'});else paused=!paused;if(!paused)document.body.classList.add('playing');vrMenu.visible=paused;updateUI();}
$('menu').onclick=menu;$('pause').onclick=togglePause;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'Sound off':'Sound on';};
function setMovement(value:MovementMode){movementMode=value;$<HTMLSelectElement>('movement').value=value;assistTarget=undefined;nextAssistAt=0;hands.forEach(h=>{h.valid=false;h.motion.clear();});}
$<HTMLSelectElement>('movement').onchange=()=>setMovement($<HTMLSelectElement>('movement').value as MovementMode);
const options=mountOptions((physics,practice)=>{if(mode==='online'&&!coop.host)return;handleAction(mode==='online'?0:seat,{kind:'options',physics,practice});try{localStorage.setItem('handball-physics',JSON.stringify(physics));}catch{}});
try{const saved=JSON.parse(localStorage.getItem('handball-physics')||'null');if(validPhysics(saved))ball.physics=saved;}catch{}
function syncOptions(){options.sync(ball.physics,match.onlinePractice,mode==='online',mode!=='online'||coop.host);}
function openOptions(){syncOptions();options.panel.hidden=false;}
$('options').onclick=()=>{if(renderer.xr.isPresenting)void renderer.xr.getSession()?.end();openOptions();};syncOptions();
function updateUI(){if(mode==='cpu'&&match.difficulty==='rally'&&match.best>rallyRecord){rallyRecord=match.best;try{localStorage.setItem('handball-rally-best',String(rallyRecord));}catch{}}$('rally-record').textContent=mode==='cpu'&&match.difficulty==='rally'?`Rally ${match.rally} · personal best ${rallyRecord}`:`Rally best ${rallyRecord}`;for(const [i,id]of ['blue-score','red-score'].entries())$(id).textContent=String(match.score[i]).padStart(2,'0');$('status').textContent=!active?'Schoolyard handball. Walls stay in play. Choose a mode.':paused?'Paused · P / A / X to resume.':match.message;$('pause').textContent=paused?'Resume':'Pause';}
function state(){return {beans:[],ball:{p:ball.p.toArray(),v:ball.v.toArray(),w:ball.w.toArray(),q:ball.q.toArray()},match:{...match},owner:game.owner,ownerHand:game.ownerHand,time:game.time,physics:{...ball.physics},paused};}
function receiveState(s:any){if(!s?.ball||!Array.isArray(s.ball.p)||s.ball.p.length!==3||!s.ball.p.every(Number.isFinite))return;ball.p.fromArray(s.ball.p);ball.v.fromArray(s.ball.v);ball.w.fromArray(s.ball.w);ball.q.fromArray(s.ball.q);Object.assign(match,s.match);if(validPhysics(s.physics))ball.physics={...s.physics};syncOptions();game.owner=s.owner;game.ownerHand=s.ownerHand;game.time=s.time??game.time;paused=s.paused;lastPacket=performance.now();}
coop.onPacket=m=>{if(m.type==='start')begin('online');else if(m.type==='snapshot'&&!coop.host)receiveState(m.state);else if(m.type==='action'&&coop.host&&m.action==='ball')handleAction(m.slot,m);else if(m.type==='control'){if(m.action==='pause')paused=true;if(m.action==='resume'&&coop.peerReady&&coop.count===2){paused=false;document.body.classList.add('playing');}vrMenu.visible=paused;updateUI();}};
// Keep the original reliable RTC action path; only the host decides contacts and scores.
function action(kind:string,data:Record<string,unknown>={},hand=0){const m={action:'ball',kind,hand,...data};if(mode==='online'){coop.send('pose',{pose:pose()});coop.send('action',m);}else handleAction(seat,m);}
function handleAction(slot:number,m:any){
 if(m.kind==='options'){if(mode==='online'&&slot!==0||!validPhysics(m.physics)||typeof m.practice!=='boolean')return;ball.physics={...m.physics};if(mode==='online'&&match.onlinePractice!==m.practice){match.onlinePractice=m.practice;match.reset('online');game.resetBall(handPoint(match.server,0));}syncOptions();return;}
 if(m.kind==='release'&&active){const p=handPoint(slot,m.hand);if(p)game.release(slot,m.hand,p,new T.Vector3().fromArray(m.v??[0,0,0]));return;}
 if(!active||paused||match.phase==='over')return;
 const p=handPoint(slot,m.hand);if(!p)return;
 if(m.kind==='serve'){if(match.server!==slot||!['ready','toss'].includes(match.phase))return;
  const vr=slot===seat?renderer.xr.isPresenting:coop.peer?.mode==='vr';
  if(vr){match.phase='ready';resetBall();match.message='Grab with either hand, toss or drop, then hit to serve.';}else autoServe(slot);return;}
 if(m.kind==='recall'){game.recall(slot,m.hand,p);return;}
 if(m.kind==='grab'){if(game.grab(slot,m.hand,p)&&slot===seat)haptic(m.hand,.2);return;}
 const impact=Array.isArray(m.p)?new T.Vector3().fromArray(m.p):p,contactPoint=impact.distanceTo(p)<=.85?impact:p;
 if(m.kind==='hit'&&game.strike(slot,m.hand,{p:contactPoint,v:new T.Vector3().fromArray(m.v??[0,0,0]),n:new T.Vector3().fromArray(m.n??[0,0,1]),offset:new T.Vector3().fromArray(m.offset??[0,0,0]),angular:new T.Vector3().fromArray(m.angular??[0,0,0]),punch:!!m.punch},slot===seat?!renderer.xr.isPresenting:coop.peer?.mode==='mouse')){
  tone(m.punch?115:250);if(slot===seat)haptic(m.hand,m.punch?.65:.4);
 }
}
function autoServe(slot:number){if(game.autoServe(slot))tone(300);}
function desktopTarget(){ray.setFromCamera(pointer,camera);const sign=seat===0?1:-1,z=mode==='practice'?T.MathUtils.clamp(ball.p.z,-COURT.halfLength+.3,COURT.halfLength-.3):sign*T.MathUtils.clamp(Math.abs(ball.p.z),.3,COURT.halfLength-.3),plane=new T.Plane(new T.Vector3(0,0,1),-z),point=ray.ray.intersectPlane(plane,new T.Vector3());
 if(point){const base=head().position,delta=point.clone().sub(base).clampLength(0,2.1);point.copy(base).add(delta);point.x=T.MathUtils.clamp(point.x,-COURT.halfWidth+.15,COURT.halfWidth-.15);point.y=T.MathUtils.clamp(point.y,.15,2.6);point.z=sign*T.MathUtils.clamp(point.z*sign,.2,COURT.halfLength-.2);return point;}return new T.Vector3(0,1,sign*1.5);}
function mouseHit(punch:boolean){if(!active||paused||renderer.xr.isPresenting)return;
 const lob=keys.has('shift'),soft=keys.has('control');
 const goal=bounceShot(ball.p,seat,soft?2.1:lob?3.5:punch?5.7:3.5,pointer.x*2.2,ball.physics);if(lob)goal.y=-6.8;
 const stroke=handVelocityForShot(ball.v,goal,punch,ball.w,ball.physics);
 stroke.offset.add(new T.Vector3(T.MathUtils.clamp(mouseVelocity.x*.0005,-.07,.07),T.MathUtils.clamp(-mouseVelocity.y*.0005,-.07,.07),0)).clampLength(0,RADIUS);
 action('hit',{v:stroke.v.toArray(),n:stroke.n.toArray(),offset:stroke.offset.toArray(),punch});desktopSwing=.16;desktopPunch=punch;}
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('mousedown',e=>{tone(80,.001,.01);if(e.button===1){lookDrag=true;e.preventDefault();}else if(e.button===0||e.button===2)mouseHit(e.button===2);});
window.addEventListener('mouseup',()=>lookDrag=false);window.addEventListener('mousemove',e=>{if(lookDrag&&!renderer.xr.isPresenting){yaw-=e.movementX*.003;pitch=T.MathUtils.clamp(pitch-e.movementY*.003,-1.3,1);}
 pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);mouseVelocity.set(e.clientX-lastMouse.x,e.clientY-lastMouse.y).multiplyScalar(5);lastMouse.set(e.clientX,e.clientY);});
window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;const k=e.key.toLowerCase();keys.add(k);if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;
 if(k===' ')action('serve');if(k==='p')togglePause();if(k==='escape')menu();if(k==='e'&&active&&!paused&&desktopCatch.press('e',performance.now()/1000))action('grab');});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k==='e'&&desktopCatch.release('e')){action('release',{v:desktopMotion.velocity().toArray()});}});
window.addEventListener('blur',()=>{keys.clear();desktopCatch.clear();hands.forEach(h=>{h.catchInput.clear();h.grabbing=h.closed=false;});if(game.owner===seat)action('release',{v:[0,0,0]},game.ownerHand);if(active&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused)togglePause();});

for(let i=0;i<2;i++){
 const grip=renderer.xr.getControllerGrip(i),input=renderer.xr.getController(i);rig.add(grip,input);const model=glove(COLORS[0],i?'right':'left',true);input.add(model);const contact=new T.Object3D();contact.position.set(0,-.018,-.02);model.add(contact);
 const h:Hand={input,grip,model,contact,motion:new Motion(14),previous:new T.Vector3(),previousRotation:new T.Quaternion(),valid:false,tracked:false,closed:false,grabbing:false,menuDown:false,teleportDown:false,catchInput:new CatchInput()};hands.push(h);
 const laser=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-3)]),new T.LineBasicMaterial({color:'#c6d286',transparent:true,opacity:.65}));laser.rotation.x=GLOVE_TILT;laser.visible=false;input.add(laser);input.userData.menuLaser=laser;
 input.addEventListener('connected',e=>{h.tracked=true;h.source=e.data;configureGlove(model,e.data.handedness==='right'?'right':'left');const thumb=model.children[6];if(thumb)thumb.position.x=e.data.handedness==='right'?-.05:.05;h.valid=false;h.motion.clear();});input.addEventListener('disconnected',()=>{if(game.owner===seat&&game.ownerHand===i)action('release',{v:[0,0,0]},i);h.tracked=h.valid=false;h.catchInput.clear();h.closed=h.grabbing=false;h.motion.clear();});
 const pressCatch=(button:string)=>{if(!active||paused)return;if(h.catchInput.press(button,performance.now()/1000))action('grab',{},i);h.grabbing=h.catchInput.closed;};
 const releaseCatch=(button:string)=>{if(h.catchInput.release(button))action('release',{v:h.motion.velocity().toArray()},i);h.grabbing=h.catchInput.closed;};
 input.addEventListener('selectstart',()=>{if(!active||paused){selectVR(h);return;}h.closed=true;pressCatch('trigger');});input.addEventListener('selectend',()=>{h.closed=false;releaseCatch('trigger');});
 input.addEventListener('squeezestart',()=>pressCatch('grip'));input.addEventListener('squeezeend',()=>releaseCatch('grip'));
}
renderer.xr.addEventListener('sessionstart',()=>{keys.clear();hands.forEach(h=>{h.valid=false;h.motion.clear();});vrMenu.visible=!active||paused;});
renderer.xr.addEventListener('sessionend',()=>{if(game.owner===seat)action('release',{v:[0,0,0]},game.ownerHand);hands.forEach(h=>{h.valid=false;h.motion.clear();});camera.position.set(0,1.65,0);camera.rotation.set(pitch,0,0);vrMenu.visible=false;});
// A browser keyboard is still used for room names before entering VR, as in Bean There.
const menuCanvas=document.createElement('canvas');menuCanvas.width=768;menuCanvas.height=1224;const ctx=menuCanvas.getContext('2d')!,menuTexture=new T.CanvasTexture(menuCanvas);
const vrMenu=new T.Mesh(new T.PlaneGeometry(.95,1.52),new T.MeshBasicMaterial({map:menuTexture,side:T.DoubleSide}));rig.add(vrMenu);vrMenu.position.set(0,1.4,-.95);vrMenu.visible=false;
const boardCanvas=document.createElement('canvas');boardCanvas.width=1024;boardCanvas.height=256;const boardTexture=new T.CanvasTexture(boardCanvas),boardContext=boardCanvas.getContext('2d')!;
for(const z of [-COURT.halfLength+.01,COURT.halfLength-.01]){const board=new T.Mesh(new T.PlaneGeometry(3.2,.8),new T.MeshBasicMaterial({map:boardTexture}));board.position.set(0,2.65,z);if(z>0)board.rotation.y=Math.PI;scene.add(board);}
const practiceBoard=new T.Mesh(new T.PlaneGeometry(3.2,.8),new T.MeshBasicMaterial({map:boardTexture}));practiceBoard.position.set(0,2.65,.016);practiceBoard.name='practice-wall-scoreboard';scene.add(practiceBoard);
function drawPanels(){boardContext.fillStyle='#18333b';boardContext.fillRect(0,0,1024,256);boardContext.textAlign='center';boardContext.fillStyle='#e9e3d2';boardContext.font='bold 70px sans-serif';boardContext.fillText(`BLUE  ${match.score[0]}   /   ${match.score[1]}  RED`,512,95);boardContext.font='26px sans-serif';boardContext.fillText(paused?'PAUSED':match.message,512,162);boardContext.font='20px sans-serif';boardContext.fillStyle='#b5c488';boardContext.fillText(mode==='practice'?`WALL PRACTICE · BEST ${match.best}`:mode==='cpu'&&match.difficulty==='rally'?`RALLY ${match.rally} · PERSONAL BEST ${rallyRecord}`:match.onlinePractice&&mode==='online'?'ONLINE PRACTICE · NO POINTS':'FIRST TO 11 · WIN BY TWO · WALLS STAY IN PLAY',512,215);boardTexture.needsUpdate=true;
 ctx.fillStyle='#18333b';ctx.fillRect(0,0,768,1224);ctx.textAlign='center';ctx.fillStyle='#eee8d7';ctx.font='bold 50px sans-serif';ctx.fillText('HANDBALL VR 0.4',384,85);
 const movement=movementMode==='stick'?'STICK':movementMode==='teleport'?'TELEPORT':'AUTO MOVE';
 const labels=[active?'RESUME':'START PRACTICE','HALF-COURT WALL PRACTICE','CPU - EASY','CPU - MEDIUM','CPU - HARD','CPU - RALLY PARTNER','RESET SERVE BALL',`MOVEMENT: ${movement}`,mode==='online'&&coop.joined?'ONLINE - RESTART MATCH':'ONLINE - ROOM SETUP','OPTIONS / BALL PHYSICS'];
 labels.forEach((label,i)=>{ctx.fillStyle=i===0?'#c6d286':'#2b4b53';ctx.fillRect(60,130+i*100,648,86);ctx.fillStyle=i===0?'#18333b':'#eee8d7';ctx.font='bold 26px sans-serif';ctx.fillText(label,384,182+i*100);});
 ctx.fillStyle='#b8c8bd';ctx.font='20px sans-serif';ctx.fillText('Teleport: click left stick. Serve: grab, toss, hit.',384,1185);menuTexture.needsUpdate=true;
}
function selectVR(h:Hand){const origin=h.input.getWorldPosition(new T.Vector3());ray.set(origin,menuDirection(h.input));const hit=ray.intersectObject(vrMenu)[0];if(!hit?.uv)return;const y=(1-hit.uv.y)*1224-130,row=Math.floor(y/100);if(row<0||row>9||y%100>86)return;
 if(row===0){if(active)togglePause();else begin('practice');}
 else if(row===1){if(!coop.joined)begin('practice');}
 else if(row>=2&&row<=5){if(coop.joined){match.message='Leave the online room in your browser before starting CPU.';return;}begin('cpu',(['easy','medium','hard','rally'] as Difficulty[])[row-2]);}
 else if(row===6){if(paused)togglePause();action('serve',{},hands.indexOf(h));}
 else if(row===7){const values:MovementMode[]=['stick','teleport','auto'];setMovement(values[(values.indexOf(movementMode)+1)%3]);}
 else if(row===9){void renderer.xr.getSession()?.end();openOptions();}
 else if(mode==='online'&&coop.joined&&coop.host)void coop.request('start');else{void renderer.xr.getSession()?.end();lobby.hidden=false;}
 vrMenu.visible=paused||!active;}

function moveVR(dt:number){
 const before=rig.position.clone();let discontinuous=false;
 if(active&&!paused){
  const left=hands.find(h=>h.tracked&&h.source?.handedness==='left'),axes=left?.source?.gamepad?.axes;
  const ax=axes&&axes.length>=4&&Math.abs(axes[2])>.2?axes[2]:0,ay=axes&&axes.length>=4&&Math.abs(axes[3])>.2?axes[3]:0;
  if(game.time>=nextAssistAt){nextAssistAt=game.time+.075;assistTarget=playerIntercept(ball,match,seat);}
  landingMarker.visible=movementMode!=='stick'&&!!assistTarget;
  if(assistTarget)landingMarker.position.set(assistTarget.x,.018,assistTarget.z);
  const clicked=!!left?.source?.gamepad?.buttons[3]?.pressed;
  if(left){if(movementMode==='teleport'&&clicked&&!left.teleportDown&&assistTarget){rig.position.add(assistedDelta(head().position,assistTarget,dt,true));discontinuous=true;}left.teleportDown=clicked;}
  if(movementMode!=='teleport'&&(ax||ay)){const orientation=new T.Euler().setFromQuaternion(head().rotation,'YXZ').y;rig.position.x+=(Math.cos(orientation)*ax+Math.sin(orientation)*ay)*dt*1.8;rig.position.z+=(-Math.sin(orientation)*ax+Math.cos(orientation)*ay)*dt*1.8;}
  else if(movementMode==='auto'&&assistTarget)rig.position.add(assistedDelta(head().position,assistTarget,dt));
  const right=hands.find(h=>h.tracked&&h.source?.handedness==='right'),turn=right?.source?.gamepad?.axes[2]??0;
  if(Math.abs(turn)>.7&&turnReady){rig.rotation.y-=Math.sign(turn)*Math.PI/6;turnReady=false;discontinuous=true;}else if(Math.abs(turn)<.3)turnReady=true;
 }else landingMarker.visible=false;
 rig.position.x=T.MathUtils.clamp(rig.position.x,-COURT.halfWidth+.38,COURT.halfWidth-.38);rig.position.z=seat===0?T.MathUtils.clamp(rig.position.z,.35,COURT.halfLength-.5):T.MathUtils.clamp(rig.position.z,-COURT.halfLength+.5,-.35);
 const delta=rig.position.clone().sub(before);
 for(const h of hands){if(discontinuous){h.valid=false;h.motion.clear();}else{h.previous.add(delta);for(const sample of h.motion.samples)sample.p.add(delta);}}
}
function nowSeconds(){return performance.now()/1000;}
function updateInput(dt:number){
 if(active&&!paused&&game.owner!==seat&&desktopCatch.recall(nowSeconds(),match.practiceMode))action('recall');
 const immersive=renderer.xr.isPresenting;desktop.visible=!immersive;
 if(!immersive){if(active&&!paused){const forward=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),movement=new T.Vector3();movement.addScaledVector(forward,(keys.has('w')?1:0)-(keys.has('s')?1:0)).addScaledVector(right,(keys.has('d')?1:0)-(keys.has('a')?1:0));if(movement.lengthSq())rig.position.addScaledVector(movement.normalize(),dt*2.2);yaw+=((keys.has('arrowleft')?1:0)-(keys.has('arrowright')?1:0))*dt*1.5;pitch=T.MathUtils.clamp(pitch+((keys.has('arrowup')?1:0)-(keys.has('arrowdown')?1:0))*dt,-1.3,1);}
  rig.rotation.y=yaw;camera.rotation.set(pitch,0,0,'YXZ');const target=desktopTarget();desktop.position.lerp(target,1-Math.exp(-24*dt));desktop.lookAt(desktop.position.clone().add(new T.Vector3(0,-.15,seat===0?-1:1)));desktopMotion.record(desktop.position,performance.now()/1000);desktopSwing=Math.max(0,desktopSwing-dt);if(desktopSwing>0&&desktop.position.distanceTo(ball.p)<.7)desktop.position.lerp(ball.p,Math.sin(desktopSwing/.16*Math.PI)*.55);for(const finger of desktop.children.slice(2,6))finger.rotation.x=fingerCurl(keys.has('e')||desktopSwing>0&&desktopPunch);mouseVelocity.multiplyScalar(Math.exp(-6*dt));
 }else{
  moveVR(dt);
  for(const [i,h]of hands.entries()){
   h.model.visible=h.tracked&&h.input.visible;h.input.userData.menuLaser.visible=immersive&&vrMenu.visible&&h.model.visible;if(!h.tracked||!h.input.visible){h.valid=false;h.motion.clear();continue;}
   const gp=h.source?.gamepad,menuPressed=!!gp?.buttons[4]?.pressed;if(menuPressed&&!h.menuDown){if(!active){paused=true;vrMenu.visible=true;}else togglePause();}h.menuDown=menuPressed;
   const p=h.contact.getWorldPosition(new T.Vector3()),rotation=h.model.getWorldQuaternion(new T.Quaternion());h.motion.record(p,performance.now()/1000);for(const finger of h.model.children.slice(2,6))finger.rotation.x=fingerCurl(h.closed||h.grabbing);
   if(active&&!paused&&game.owner!==seat&&h.catchInput.recall(nowSeconds(),match.practiceMode)){action('recall',{},i);haptic(i,.45);}
   if(active&&!paused&&h.valid&&game.owner===-1&&(mode==='practice'||side(ball.p.z)===seat)){
    const instantaneous=p.clone().sub(h.previous).divideScalar(Math.max(.006,dt)).clampLength(0,14),v=instantaneous.multiplyScalar(.8).addScaledVector(h.motion.velocity(),.2),angular=rotationVelocity(h.previousRotation,rotation,dt);
    const stroke=handContact(ball.p,previousBallForHands,p,h.previous,rotation,v,angular,h.closed);
    if(stroke)action('hit',{p:stroke.p.toArray(),v:stroke.v.toArray(),n:stroke.n.toArray(),offset:stroke.offset.toArray(),angular:stroke.angular.toArray(),punch:h.closed},i);
   }
   h.previous.copy(p);h.previousRotation.copy(rotation);h.valid=true;
  }
 }
 rig.position.x=T.MathUtils.clamp(rig.position.x,-COURT.halfWidth+.38,COURT.halfWidth-.38);rig.position.z=seat===0?T.MathUtils.clamp(rig.position.z,.35,COURT.halfLength-.5):T.MathUtils.clamp(rig.position.z,-COURT.halfLength+.5,-.35);
 const hp=head();localBody.root.position.set(hp.position.x,0,hp.position.z);localBody.root.rotation.y=new T.Euler().setFromQuaternion(hp.rotation,'YXZ').y;localBody.hands.forEach(h=>h.visible=false);
}
function cpu(dt:number){
 if(mode!=='cpu')return;const before=cpuPlayer.returns;cpuPlayer.update(dt,game,head().position);if(cpuPlayer.returns>before)tone(220);
 opponent.root.position.copy(cpuPlayer.position);const base=cpuPlayer.position;
 opponent.hands.forEach((h,i)=>{h.position.set(base.x+(i?.24:-.24),T.MathUtils.clamp(ball.p.y,.35,1.5),base.z+.22);h.rotation.y=Math.PI;});
 if(game.time-cpuPlayer.lastShot<.14)opponent.hands[1].position.lerp(ball.p,Math.max(0,1-(game.time-cpuPlayer.lastShot)/.14));
}
function remoteAvatar(dt:number){if(mode!=='online'||!coop.peer)return;const p=coop.peer,position=new T.Vector3().fromArray(p.head.p),q=new T.Quaternion().fromArray(p.head.q);opponent.root.position.lerp(new T.Vector3(position.x,0,position.z),1-Math.exp(-20*dt));opponent.root.rotation.y=new T.Euler().setFromQuaternion(q,'YXZ').y+Math.PI;opponent.head.position.y=position.y-.1;
 recolorShirt();opponent.hands.forEach((h,i)=>{const point=p.hands[i];h.visible=!!point&&point.tracked!==false;if(point){h.position.lerp(new T.Vector3().fromArray(point.p),1-Math.exp(-25*dt));h.quaternion.fromArray(point.q);}});
}
function recolorShirt(){const shirt=opponent.root.children[0] as T.Mesh;(shirt.material as T.MeshStandardMaterial).color.set(COLORS[1-seat]);opponent.hands.forEach(h=>recolor(h,COLORS[1-seat]));}
function simulate(dt:number){
 if(!active||paused)return;cpu(dt);
 game.step(dt,handPoint,surface=>tone(surface==='floor'?170:310,Math.min(.07,.015+ball.v.length()*.005)));
}
let previous=performance.now(),uiAt=0;
renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.05,(now-previous)/1000);previous=now;updateInput(dt);
 previousBallForHands.copy(ball.p);
 if(authority()){accumulator+=dt;while(accumulator>=1/180){simulate(1/180);accumulator-=1/180;}}else if(active&&!paused){game.time+=dt;if(now-lastPacket>3000&&coop.running){paused=true;match.message='Waiting for host updates.';}}
 if(mode==='online'&&coop.peerReady&&now-sendAt>33){sendAt=now;coop.send('pose',{pose:pose()});if(coop.host)coop.send('snapshot',{state:state()});}
 spinTrail.update(ball.p,ball.v,ball.w,now/1000,active&&!paused&&game.owner<0&&!['ready','over'].includes(match.phase));
 remoteAvatar(dt);mesh.position.copy(ball.p);mesh.quaternion.copy(ball.q);shadow.position.set(ball.p.x,.009,ball.p.z);shadow.scale.setScalar(1+ball.p.y*.15);(shadow.material as T.MeshBasicMaterial).opacity=.28/(1+ball.p.y*.9);
 if(now-uiAt>120){uiAt=now;updateUI();drawPanels();}renderer.render(scene,camera);
});
game.start('practice');opponent.root.position.set(0,0,-2.7);opponent.root.rotation.y=0;opponent.visible(false);positionPlayer();resetBall();drawPanels();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// Development-only hooks support real-browser and synthetic controller regression checks.
if(import.meta.env.DEV)(window as any).handball={game,ball,match,coop,hands,rig,camera,scene,renderer,desktop,begin,state,action,autoServe,handleAction,cpuPlayer,practiceWall,setMovement,get movement(){return movementMode;},get owner(){return game.owner;},get paused(){return paused;},setPaused:(p:boolean)=>paused=p};
