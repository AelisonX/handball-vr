import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(new URL('../handball-desktop.html',import.meta.url).href);
 await page.locator('#practice').click();await page.keyboard.press('Space');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Wall practice'));
 for(const value of ['teleport','auto','stick']){await page.selectOption('#movement',value);assert.equal(await page.locator('#movement').inputValue(),value);}
 for(const level of ['easy','medium','hard']){
  await page.click('#menu');await page.selectOption('#difficulty',level);await page.click('#cpu');await page.keyboard.press('Space');
  await page.waitForFunction(()=>Number(document.querySelector('#blue-score').textContent)+Number(document.querySelector('#red-score').textContent)>0,null,{timeout:10000});
 }
 await page.click('#menu');await page.click('#practice');await page.screenshot({path:'tests/smoke-v02.png'});
 assert.deepEqual(errors,[]);console.log('PASS: offline production UI, half-court practice, three movement options, three CPU matches, scoring, no uncaught browser errors.');
}finally{await browser.close();}
