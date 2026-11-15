import {PHYSICS_DEFAULTS,PHYSICS_RANGES,type PhysicsOptions} from './physics-options';
const labels:Record<keyof PhysicsOptions,string>={bounce:'Bounce',hitPower:'Hit strength',gravity:'Gravity',spin:'Spin effect',airDrag:'Air resistance'};
export function mountOptions(change:(physics:PhysicsOptions,practice:boolean)=>void){
 const panel=document.createElement('section');panel.id='physics-options';panel.hidden=true;
 panel.innerHTML=`<h2>Ball options</h2><p>Adjust live. Send me the values below when they feel right. In multiplayer, the host controls these settings.</p><label id="match-type-label">Multiplayer mode<select id="match-type"><option value="vs">Versus — points</option><option value="practice">Practice — no points, catches allowed</option></select></label>${Object.entries(PHYSICS_RANGES).map(([key,[min,max]])=>`<label>${labels[key as keyof PhysicsOptions]} <output id="value-${key}"></output><input type="range" aria-label="${labels[key as keyof PhysicsOptions]}" id="physics-${key}" min="${min}" max="${max}" step="${key==='airDrag'?.001:.01}"></label>`).join('')}<textarea id="physics-values" aria-label="Physics settings to share" readonly></textarea><p>Practice: hold grip, trigger, or desktop E for 2.5 seconds to recall the ball. Release all grab buttons to let go.</p><button id="physics-defaults">Reset defaults</button><button id="physics-close">Close</button>`;
 document.body.append(panel);
 const mode=panel.querySelector<HTMLSelectElement>('#match-type')!,inputs=Object.keys(PHYSICS_DEFAULTS) as (keyof PhysicsOptions)[];
 function values(){return Object.fromEntries(inputs.map(k=>[k,Number(panel.querySelector<HTMLInputElement>('#physics-'+k)!.value)])) as PhysicsOptions;}
 const send=()=>change(values(),mode.value==='practice');
 for(const key of inputs)panel.querySelector<HTMLInputElement>('#physics-'+key)!.oninput=send;
 mode.onchange=send;panel.querySelector<HTMLButtonElement>('#physics-defaults')!.onclick=()=>change({...PHYSICS_DEFAULTS},mode.value==='practice');panel.querySelector<HTMLButtonElement>('#physics-close')!.onclick=()=>panel.hidden=true;
 return {panel,sync(physics:PhysicsOptions,practice:boolean,online:boolean,editable:boolean){
  panel.querySelector<HTMLElement>('#match-type-label')!.hidden=!online;mode.value=practice?'practice':'vs';mode.disabled=!editable;
  for(const key of inputs){const input=panel.querySelector<HTMLInputElement>('#physics-'+key)!;input.value=String(physics[key]);input.disabled=!editable;panel.querySelector<HTMLOutputElement>('#value-'+key)!.value=physics[key].toFixed(key==='airDrag'?3:2);}
  panel.querySelector<HTMLTextAreaElement>('#physics-values')!.value=JSON.stringify(physics);panel.querySelector<HTMLButtonElement>('#physics-defaults')!.disabled=!editable;
 }};
}
