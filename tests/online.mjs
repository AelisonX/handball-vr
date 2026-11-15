import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
const host=await browser.newPage(),guest=await browser.newPage(),third=await browser.newPage(),errors=[];
const url=process.env.TEST_URL||'http://127.0.0.1:5176',room='Handball-'+Date.now();
try{
 for(const p of [host,guest,third]){p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.handball);await p.evaluate(()=>{window.socketTypes=[];const send=WebSocket.prototype.send;WebSocket.prototype.send=function(data){window.socketTypes.push(JSON.parse(data).type);return send.call(this,data);};});await p.click('#online');await p.fill('#room-name',room);await p.fill('#room-password','test-only');}
 await host.click('#room-host');await host.waitForFunction(()=>window.handball.coop.slot===0);
 await guest.click('#room-join');for(const p of [host,guest])await p.waitForFunction(()=>window.handball.coop.peerReady);
 await third.click('#room-join');await third.waitForFunction(()=>document.querySelector('#room-status').textContent.includes('full'));
 await host.click('#room-start');for(const p of [host,guest])await p.waitForFunction(()=>window.handball.coop.running);
 assert.ok(await guest.evaluate(()=>window.handball.rig.position.z<0));assert.ok(await host.evaluate(()=>window.handball.rig.position.z>0));
 await host.evaluate(()=>window.handball.setPaused(false));await guest.evaluate(()=>window.handball.setPaused(false));
 // Use guest's current physical hand pose, then request through the real data channel.
 const p=await guest.evaluate(()=>window.handball.desktop.position.toArray());
 await host.evaluate(p=>{const h=window.handball;h.match.server=1;h.match.phase='ready';h.ball.p.fromArray(p);},p);
 await guest.waitForTimeout(150);await guest.evaluate(()=>window.handball.action('grab'));
 await host.waitForFunction(()=>window.handball.owner===1);await guest.waitForFunction(()=>window.handball.owner===1);
 await guest.evaluate(()=>window.handball.action('release',{v:[0,-2,3]}));await host.waitForFunction(()=>window.handball.owner===-1);
 await host.evaluate(()=>{window.handball.match.point(1,'Network score regression');});
 const score=await host.evaluate(()=>window.handball.match.score);await guest.waitForFunction(s=>JSON.stringify(window.handball.match.score)===JSON.stringify(s),score);
 for(const p of [host,guest]){const types=await p.evaluate(()=>window.socketTypes);assert.ok(types.includes('signal'));assert.ok(!types.some(t=>['pose','snapshot','action','move'].includes(t)),types.join(','));}
 await guest.evaluate(()=>window.handball.coop.leave());await host.waitForFunction(()=>window.handball.paused);
 assert.deepEqual(errors,[]);console.log('PASS: real two-browser RTC, third player rejected, opposite seats, exclusive ball grab/release, shared score, gameplay bypasses signaling, disconnect pauses.');
}finally{await browser.close();}
