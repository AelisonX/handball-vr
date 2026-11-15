import * as T from 'three';
export type SpinKind='none'|'top'|'back'|'side';
export const SPIN_COLORS={none:'#ffffff',top:'#4b9fff',back:'#ff6262',side:'#67d994'};
/** Top/back are relative to the horizontal flight direction, on either court half. */
export function spinKind(v:T.Vector3,w:T.Vector3):SpinKind{
 const flight=new T.Vector3(v.x,0,v.z);if(flight.length()<.3)return 'none';
 const top=w.dot(new T.Vector3().crossVectors(new T.Vector3(0,1,0),flight.normalize()));
 if(Math.max(Math.abs(top),Math.abs(w.y))<7)return 'none';
 return Math.abs(w.y)>Math.abs(top)*1.1?'side':top>0?'top':'back';
}
export class SpinTrail {
 private samples:{p:T.Vector3,color:T.Color,time:number}[]=[];
 private positions=new Float32Array(48*3);private colors=new Float32Array(48*3);
 private geometry=new T.BufferGeometry();private line:T.Line;private next=0;
 constructor(scene:T.Scene){this.geometry.setAttribute('position',new T.BufferAttribute(this.positions,3));this.geometry.setAttribute('color',new T.BufferAttribute(this.colors,3));this.geometry.setDrawRange(0,0);this.line=new T.Line(this.geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.38,depthWrite:false}));this.line.frustumCulled=false;scene.add(this.line);}
 update(p:T.Vector3,v:T.Vector3,w:T.Vector3,time:number,visible:boolean){
  if(!visible||v.length()<.3||this.samples.at(-1)?.p.distanceTo(p)!>2){this.samples=[];this.geometry.setDrawRange(0,0);return;}
  if(time>=this.next){this.next=time+.012;this.samples.push({p:p.clone(),color:new T.Color(SPIN_COLORS[spinKind(v,w)]),time});}
  this.samples=this.samples.filter(s=>time-s.time<.22).slice(-48);
  this.samples.forEach((s,i)=>{s.p.toArray(this.positions,i*3);s.color.clone().multiplyScalar(.25+.75*i/Math.max(1,this.samples.length-1)).toArray(this.colors,i*3);});
  this.geometry.setDrawRange(0,this.samples.length);this.geometry.attributes.position.needsUpdate=this.geometry.attributes.color.needsUpdate=true;
 }
}
