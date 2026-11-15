export const PHYSICS_DEFAULTS={bounce:.88,hitPower:.92,gravity:9.81,spin:1,airDrag:.01};
export type PhysicsOptions=typeof PHYSICS_DEFAULTS;
export const PHYSICS_RANGES={bounce:[.65,.98],hitPower:[.6,1.25],gravity:[7,13],spin:[0,2],airDrag:[0,.04]} as const;
export function validPhysics(value:any):value is PhysicsOptions{return !!value&&Object.entries(PHYSICS_RANGES).every(([key,[min,max]])=>Number.isFinite(value[key])&&value[key]>=min&&value[key]<=max);}
export class CatchInput {
 private down=new Set<string>();private began=0;private recalled=false;
 get closed(){return this.down.size>0;}
 press(button:string,time:number){if(this.down.has(button))return false;const first=!this.closed;this.down.add(button);if(first){this.began=time;this.recalled=false;}return first;}
 release(button:string){const held=this.closed;this.down.delete(button);return held&&!this.closed;}
 recall(time:number,practice:boolean){if(!practice||!this.closed||this.recalled||time-this.began<2.5)return false;this.recalled=true;return true;}
 clear(){this.down.clear();this.recalled=false;}
}
