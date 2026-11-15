import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:5176';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
const errors=[];const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url);await page.waitForFunction(()=>window.handball);
 await page.click('#practice');await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.handball.ball.v.z>0);
 assert.deepEqual(await page.evaluate(()=>window.handball.match.score),[0,0]);
 for(const level of ['easy','medium','hard']){
  await page.click('#menu');await page.selectOption('#difficulty',level);await page.click('#cpu');
  assert.equal(await page.evaluate(()=>window.handball.match.difficulty),level);
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.handball.match.rally>0||window.handball.match.score.some(x=>x>0),null,{timeout:8000});
 }
 // Physical desktop target placement; actual key events grab and release the ball.
 await page.evaluate(()=>window.handball.begin('practice'));
 const target=await page.evaluate(async()=>{const {Vector3}=await import('/node_modules/three/build/three.module.js');const h=window.handball;h.ball.p.set(0,1.2,1.6);const p=new Vector3(0,1.2,1.6).project(h.camera);return [(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];});
 await page.mouse.move(...target);await page.waitForTimeout(250);await page.keyboard.down('e');
 await page.waitForFunction(()=>window.handball.owner===0);await page.keyboard.up('e');await page.waitForFunction(()=>window.handball.owner===-1);
 await page.keyboard.press('p');assert.equal(await page.evaluate(()=>window.handball.paused),true);
 await page.screenshot({path:'tests/desktop-verified.png'});
 assert.deepEqual(errors,[]);console.log('PASS: practice serve, all three CPU modes, physical desktop grab/release, pause, no runtime errors.');
}finally{await browser.close();}
