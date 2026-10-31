import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const DELAY=180000;
try{
  for(const [label,touch] of [['desktop',false],['phone',true]]){
    const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install();
    await page.goto(process.env.APP_URL??'http://localhost:5173');
    await page.waitForFunction(()=>!!window.__viewer);
    await page.clock.pauseAt(new Date(Date.now()+2000));
    const auto=()=>page.evaluate(()=>__viewer.controls.autoRotate);
    const position=()=>page.evaluate(()=>__viewer.camera.position.toArray());
    const model=()=>page.evaluate(()=>{
      const result=[];__viewer.model.updateMatrixWorld(true);
      __viewer.model.traverse(o=>{if(!o.userData.isHighlight)result.push([o.name,o.matrixWorld.elements]);});
      return JSON.stringify(result);
    });
    const advance=async ms=>{await page.clock.fastForward(ms);await page.clock.runFor(64);};
    const initial=await model();
    await page.mouse.move(8,8);
    await advance(DELAY-1000);assert.equal(await auto(),false,'must wait three minutes');
    await advance(1100);assert.equal(await auto(),true,'starts after three minutes');
    const before=await position();await page.clock.runFor(240);const after=await position();
    assert.ok(Math.hypot(...before.map((v,i)=>v-after[i]))>.001,'camera should orbit');
    await page.mouse.move(12,8);assert.equal(await auto(),false,'mouse movement stops rotation');
    const stopped=await position();await page.clock.runFor(240);
    const settled=await position();assert.ok(Math.hypot(...stopped.map((v,i)=>v-settled[i]))<.001,'rotation stops without residual drift');
    await advance(DELAY-1000);assert.equal(await auto(),false,'input restarts full countdown');
    await page.keyboard.down('x');await advance(DELAY+100);assert.equal(await auto(),false,'held key prevents idle');
    await page.keyboard.up('x');await advance(DELAY+100);assert.equal(await auto(),true);
    await page.mouse.down();await advance(DELAY+100);assert.equal(await auto(),false,'held pointer prevents idle');
    await page.mouse.up();await advance(DELAY+100);assert.equal(await auto(),true);
    if(touch)await page.touchscreen.tap(8,8);else await page.mouse.wheel(0,1);
    assert.equal(await auto(),false,'touch or scroll stops rotation');
    await advance(DELAY+100);assert.equal(await auto(),true);
    await page.emulateMedia({reducedMotion:'reduce'});await advance(DELAY+100);
    assert.equal(await auto(),false,'respects reduced motion');
    assert.equal(await model(),initial,'apparatus meshes must never move');
    await page.locator('#procedure-start').click();await page.clock.runFor(1000);
    assert.ok(await page.locator('#procedure-panel').isVisible(),'procedure remains usable');
    assert.deepEqual(errors,[]);
    console.log(`${label}: PASS — 3-minute delay, camera orbit, immediate stop/reset, held inputs, touch/scroll, reduced motion, procedure, unchanged model`);
    await context.close();
  }
}finally{await browser.close();}
