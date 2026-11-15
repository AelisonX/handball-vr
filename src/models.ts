import * as T from 'three';
import {COURT} from './ball';
import {configureGlove} from './gloves';
export const COLORS=['#397bb5','#bc554c'];
const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.83});
export function box(parent:T.Object3D,color:string,p:number[],s:number[]){const m=new T.Mesh(new T.BoxGeometry(...s as [number,number,number]),mat(color));m.position.fromArray(p);parent.add(m);return m;}
export function glove(color:string,hand:'left'|'right'='right',aligned=false){const g=new T.Group();box(g,color,[0,0,0],[.085,.04,.09]);box(g,color,[0,0,.055],[.09,.045,.025]);for(let i=0;i<4;i++)box(g,color,[(i-1.5)*.021,0,-.055],[.017,.028,.055]);box(g,color,[hand==='right'?-.05:.05,-.005,0],[.025,.03,.05]);if(aligned)configureGlove(g,hand);return g;}
export class Player {
 root=new T.Group();head=new T.Group();hands:T.Group[]=[];
 constructor(scene:T.Scene,color:string){
  box(this.root,color,[0,1.03,0],[.34,.57,.23]);
  for(const x of [-.1,.1]){box(this.root,'#354347',[x,.43,0],[.14,.68,.17]);box(this.root,'#263339',[x,.08,.06],[.16,.13,.29]);}
  this.head.position.y=1.55;this.root.add(this.head);
  const face=new T.Mesh(new T.SphereGeometry(1,16,12),mat('#d4ae8c'));face.scale.set(.16,.22,.155);this.head.add(face);
  for(const x of [-.06,.06]){box(this.head,'#263339',[x,.025,.147],[.025,.027,.017]);const brow=box(this.head,'#5b4537',[x,.074,.14],[.065,.018,.02]);brow.rotation.z=x>0?.16:-.16;}
  box(this.head,'#765244',[0,-.09,.15],[.055,.012,.012]);
  scene.add(this.root);for(let i=0;i<2;i++){const h=glove(color,i?'right':'left');scene.add(h);this.hands.push(h);}
 }
 visible(value:boolean){this.root.visible=value;this.hands.forEach(h=>h.visible=value);}
}
export function buildCourt(scene:T.Scene){
 const {halfWidth:w,halfLength:l,height:h}=COURT;
 box(scene,'#bba67b',[0,-.08,0],[w*2+.2,.16,l*2+.2]);
 for(const x of [-w-.08,w+.08])box(scene,'#e6e0d1',[x,h/2,0],[.16,h,l*2+.2]);
 for(const z of [-l-.08,l+.08])box(scene,'#ded9cb',[0,h/2,z],[w*2+.2,h,.16]);
 box(scene,'#f4eedc',[0,.005,0],[w*2,.008,.055]);
 for(const z of [-l+.05,l-.05])box(scene,'#f4eedc',[0,.005,z],[w*2,.008,.04]);
 for(const x of [-w+.05,w-.05])box(scene,'#f4eedc',[x,.005,0],[.04,.008,l*2]);
 for(const [i,z] of [-l/2,l/2].entries()){box(scene,COLORS[1-i],[0,.007,z],[.1,.01,.5]);box(scene,COLORS[1-i],[0,.007,z],[.5,.01,.1]);}
 for(const x of [-w+.02,w-.02])for(const z of [-l/2,l/2])box(scene,z>0?COLORS[0]:COLORS[1],[x,1.1,z],[.02,.055,l-.2]);
 box(scene,'#d4ccb6',[0,h+.04,0],[w*2+.2,.08,l*2+.2]);for(const z of [-l*.65,0,l*.65])box(scene,'#fff2cb',[0,h-.06,z],[3.1,.035,.16]);
}
export function tennisBall(radius:number){const g=new T.Group(),body=new T.Mesh(new T.SphereGeometry(radius,32,24),mat('#93976b'));g.add(body);
 // Two curving ivory seams sit directly on the sphere and rotate with spin.
 const points=[];for(let i=0;i<=160;i++){const t=i/160*Math.PI*2,lat=.5*Math.sin(2*t);points.push(new T.Vector3(Math.cos(t)*Math.cos(lat),Math.sin(lat),Math.sin(t)*Math.cos(lat)).multiplyScalar(radius*1.008));}
 const seam=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points,true),160,.0025,5,true),mat('#d6d2b0'));g.add(seam);return g;}
