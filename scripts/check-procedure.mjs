import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import procedure, {SHOW_REYNOLDS_NOTE} from '../src/procedure.js';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('artifacts/procedure',{recursive:true});
async function settle(page){
  await page.waitForTimeout(100);
  await page.waitForFunction(()=>window.__viewer&&!__viewer.isMoving());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.waitForFunction(()=>!__viewer.isMoving());
}
const signature=page=>page.evaluate(()=>{
  const rows=[];
  __viewer.model.updateMatrixWorld(true);
  __viewer.model.traverse(o=>{
    if((o.isMesh||o.isLineSegments)&&!o.userData.isHighlight)
      rows.push([o.name,...o.matrixWorld.elements,JSON.stringify(o.material.toJSON())]);
  });
  return JSON.stringify(rows);
});
async function targets(page){
  const bad=await page.locator('#procedure-entry button, #part-start, #procedure-panel button, #procedure-panel a, #procedure-panel summary, #step-sheet button, #procedure-toast button').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length).flatMap(el=>{
    const r=el.getBoundingClientRect();
    return r.width<43.99||r.height<43.99?[`${el.id||el.textContent}: ${r.width}×${r.height}`]:[];
  }));
  assert.deepEqual(bad,[],'touch targets');
}
async function targetError(page,kind){
  return page.evaluate(kind=>{
    const v=__viewer;
    const roots=kind==='step'?v.stepMeshes():kind==='front'?[...new Set(v.valveOf.values())][0]:[v.partGroups[kind]];
    const min=v.controls.target.clone().set(Infinity,Infinity,Infinity),max=min.clone().negate();
    for(const root of roots)root.traverse(o=>{
      if((o.isMesh||o.isLineSegments)&&!o.userData.isHighlight){
        o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
        for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
          const p=min.clone().set(x,y,z).applyMatrix4(o.matrixWorld);min.min(p);max.max(p);
        }
      }
    });
    return min.add(max).multiplyScalar(.5).distanceTo(v.controls.target);
  },kind);
}
async function emptyPoint(page){
  return page.evaluate(()=>{
    const top=document.querySelector('#procedure-panel').getBoundingClientRect().top;
    for(let y=8;y<top-10;y+=30)for(let x=8;x<innerWidth-8;x+=30)if(!__viewer.pick(x,y))return [x,y];
    throw Error('No empty point');
  });
}
async function partPoint(page,name){
  return page.evaluate(name=>{
    const {camera,partGroups,pick}=__viewer,points=[];
    partGroups[name].traverse(o=>{
      if(!o.isMesh||o.userData.isHighlight)return;
      o.geometry.computeBoundingBox();const p=o.geometry.boundingBox.getCenter(o.position.clone()).applyMatrix4(o.matrixWorld).project(camera);
      points.push([(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]);
    });
    const top=document.querySelector('#procedure-panel').getBoundingClientRect().top;
    for(const [x,y] of points)if(x>2&&x<innerWidth-2&&y>2&&y<top&&pick(x,y)===name)return [x,y];
    throw Error('No tappable '+name);
  },name);
}
const baselineMain=execFileSync('git',['show','29dd4e8:src/main.js'],{encoding:'utf8'});
const noteSource=execFileSync('git',['show','29dd4e8:src/procedure.js'],{encoding:'utf8'});
async function enableNote(page){
  await page.route('**/src/procedure.js*',route=>route.fulfill({
    contentType:'text/javascript',body:noteSource.replace('SHOW_REYNOLDS_NOTE=false','SHOW_REYNOLDS_NOTE=true')
  }));
}
async function captureHtml(baseline,note=false){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  try{
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    if(baseline)await page.route('**/src/main.js*',async route=>{
      // Use Vite's resolved dependency URLs, while executing the committed viewer.
      const served=await (await route.fetch()).text();
      const imports=[...served.matchAll(/\bimport [^\r\n]*? from ['"]([^'"]+)['"]/g)].map(match=>match[1]);
      assert.equal(imports.length,5,'Vite dependency URLs');
      let index=0;
      const body=baselineMain.replace(/^(import .*? from )['"][^'"]+['"]/gm,
        (_,prefix)=>prefix+JSON.stringify(imports[index++]));
      assert.equal(index,5,'baseline import resolution');
      await route.fulfill({contentType:'text/javascript',body:body.replace('import.meta.env.DEV','true')});
    });
    if(note)await enableNote(page);
    await page.goto(process.env.APP_URL??'http://localhost:5173');
    try{await page.waitForFunction(()=>!!window.__viewer,null,{timeout:10000});}
    catch(error){throw new Error(`HTML capture baseline=${baseline}, note=${note}: ${errors.join('; ')}`,{cause:error});}
    return await page.evaluate(()=>{
      __viewer.startProcedure(true);const steps=[],sheets=[];
      for(let i=0;i<11;i++){
        if(i>0)__viewer.goToStep(i);
        steps.push(document.querySelector('#procedure-panel').innerHTML);
        document.querySelector('#step-list').click();
        sheets.push(document.querySelector('#step-sheet').innerHTML);
        document.querySelector('#sheet-close').click();
      }
      document.querySelector('#step-next').click();
      return {steps,sheets,completion:document.querySelector('#procedure-panel').innerHTML};
    });
  }finally{await context.close();}
}
async function view(page){
  return page.evaluate(()=>{
    // Drain the existing orbit damping before comparing the final manual view.
    for(let i=0;i<200;i++)__viewer.controls.update(0);
    return {
      direction:__viewer.camera.position.clone().sub(__viewer.controls.target).normalize().toArray(),
      target:__viewer.controls.target.toArray(),
      distance:__viewer.camera.position.distanceTo(__viewer.controls.target)
    };
  });
}
function unchangedView(before,after){
  const dot=before.direction.reduce((sum,value,i)=>sum+value*after.direction[i],0);
  assert.ok(Math.acos(Math.min(1,Math.max(-1,dot)))<5*Math.PI/180,'manual direction changed');
  assert.ok(Math.hypot(...before.target.map((value,i)=>value-after.target[i]))<.001,'manual target changed');
  assert.ok(Math.abs(before.distance-after.distance)<.001,'manual distance changed');
}
async function manualViewCheck(context,width,height){
  const page=await context.newPage();
  try{
    await enableNote(page);await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(process.env.APP_URL??'http://localhost:5173');await page.waitForFunction(()=>!!window.__viewer);
    await page.locator('#procedure-start').click();
    await page.evaluate(()=>__viewer.goToStep(7));await settle(page);
    assert.equal(await page.locator('details').count(),1,'test-only Reynolds note enabled');
    // Let the note actually grow on phones too, rather than hitting the 42dvh cap.
    await page.locator('#procedure-panel').evaluate(el=>{el.style.maxHeight='80dvh';});await settle(page);
    const x=width*.45,y=90;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+65,y+25,{steps:12});await page.mouse.up();
    await view(page);
    // Pan too, so an unwanted recenter cannot pass a direction-only assertion.
    await page.mouse.move(x,y);await page.mouse.down({button:'right'});
    await page.mouse.move(x+28,y+15,{steps:8});
    const manual=await view(page);
    const closedHeight=await page.locator('#procedure-panel').evaluate(el=>el.offsetHeight);
    await page.locator('details').evaluate(el=>{el.open=true;});await settle(page);
    assert.notEqual(await page.locator('#procedure-panel').evaluate(el=>el.offsetHeight),closedHeight,'note must resize panel');
    unchangedView(manual,await view(page));
    await page.mouse.up({button:'right'});await settle(page);
    unchangedView(manual,await view(page));
    await page.locator('details').evaluate(el=>{el.open=false;});await settle(page);
    unchangedView(manual,await view(page));
    await page.locator('.chips button').click();await settle(page);
    assert.ok(await targetError(page,'Flow Meter')<.001,'chip clears manual view');
    await page.locator('#inline-part button').click();await settle(page);
    await page.mouse.move(x,y);await page.mouse.down({button:'right'});
    await page.mouse.move(x+30,y+20,{steps:8});await page.mouse.up({button:'right'});await view(page);
    assert.ok(await targetError(page,'step')>.001,'pan should move target before window resize');
    await page.setViewportSize({width:width+1,height});await settle(page);
    assert.ok(await targetError(page,'step')<.001,'window resize reframes step');
    await page.mouse.move(x,y);await page.mouse.wheel(0,100);await settle(page);
    const zoomed=await view(page);
    await page.locator('details').evaluate(el=>{el.open=true;});await settle(page);
    unchangedView(zoomed,await view(page));
  }finally{await page.close();}
}
assert.equal(SHOW_REYNOLDS_NOTE,false);
try{
  for(const note of [false,true]){
    const baseline=await captureHtml(true,note);
    assert.equal(baseline.steps[7].includes('<details>'),note,'baseline note override');
    assert.deepEqual(await captureHtml(false,note),baseline,'HTML differs from commit 29dd4e8');
  }
  console.log('HTML: PASS — 11 step panels, 11 sheets and completion identical to 29dd4e8, note off and on');
  for(const [label,width,height,touch] of [['phone',390,844,true],['small-phone',360,640,true],['desktop',1440,900,false]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(process.env.APP_URL??'http://localhost:5173');
    await page.waitForFunction(()=>!!window.__viewer);await settle(page);
    const before=await signature(page);
    const activate=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
    const tap=point=>touch?page.touchscreen.tap(...point):page.mouse.click(...point);
    await targets(page);
    await activate('#procedure-start');await settle(page);
    await activate('#step-exit');await settle(page);
    assert.equal(await page.locator('#procedure-start').textContent(),'▶ Start procedure');
    assert.equal(await page.evaluate(()=>localStorage.getItem('reynolds-procedure')),null);
    await activate('#procedure-start');await settle(page);
    await activate('#step-next');await settle(page);
    await activate('#step-back');await settle(page);
    await activate('#step-exit');await settle(page);
    assert.equal(await page.locator('#procedure-start').textContent(),'▶ Start procedure');
    await activate('#procedure-start');await activate('#step-next');await settle(page);
    await activate('#step-exit');await settle(page);
    assert.equal(await page.locator('#procedure-start').textContent(),'▶ Resume procedure (Step 2)');
    await activate('#start-over');await settle(page);
    await activate('#step-list');await activate('[data-step="0"]');await settle(page);
    await activate('#step-exit');await settle(page);
    assert.equal(await page.locator('#procedure-start').textContent(),'▶ Resume procedure (Step 1)');
    await activate('#start-over');await settle(page);
    await page.keyboard.press('Control+l');
    assert.equal(await page.locator('#step-backdrop').isVisible(),false);
    // Exercise real model taps: timeout, replacement, empty-space dismissal and Open.
    const point=await partPoint(page,'Flow Meter');
    await tap(point);await targets(page);assert.ok(await page.locator('#procedure-toast').isVisible());
    await page.waitForTimeout(2000);await tap(point);await page.waitForTimeout(3200);
    assert.ok(await page.locator('#procedure-toast').isVisible(),'replacement restarts timer');
    await page.locator('#procedure-toast').waitFor({state:'hidden',timeout:2800});
    await tap(point);await tap(await emptyPoint(page));assert.equal(await page.locator('#procedure-toast').isVisible(),false);
    await tap(point);await activate('#procedure-toast button');await settle(page);
    assert.ok(await page.locator('#part-info').evaluate(el=>el.classList.contains('is-visible')));await targets(page);
    await activate('#part-start');await settle(page);
    for(const [i,step] of procedure.entries()){
      assert.equal(await page.locator('.step-body h2').textContent(),`${step.id} · ${step.title}`);
      assert.equal(await page.locator('.step-body > p').first().textContent(),step.text);
      assert.deepEqual(await page.evaluate(()=>__viewer.procedure().highlightedParts),step.parts);
      assert.ok(await targetError(page,'step')<.001,`${label} ${step.id} framing`);
      await targets(page);
      const actual=await page.evaluate(()=>{
        const parts=new Set();
        __viewer.model.traverse(o=>{if(o.userData.isHighlight&&o.isMesh){for(let n=o.parent;n;n=n.parent)if(n.userData.partId){parts.add(n.userData.partId);break;}}});
        return [...parts];
      });
      assert.deepEqual(actual.sort(),[...step.parts].sort());
      if(step.id==='B3'||step.id==='C2'){
        const valves=await page.evaluate(()=>[...new Set(__viewer.valveOf.values())].map(meshes=>meshes.map(mesh=>mesh.children.some(o=>o.userData.isHighlight))));
        assert.ok(valves[0].every(Boolean));
        assert.ok(valves[1].every(value=>value===(step.id==='C2')),'rear valve subset');
        if(step.id==='B3')assert.deepEqual(step.parts,['Control Valve','Dye Injection Site','Flow Visualization Pipe Section']);
      }
      if(step.id==='A4')assert.ok(await page.evaluate(()=>__viewer.camera.position.z<__viewer.controls.target.z));
      if(step.id==='B1'){
        for(const [part,kind] of [['Flow Visualization Pipe Section','Flow Visualization Pipe Section'],['Control Valve','front']]){
          await activate(`.chips button[data-part="${step.parts.indexOf(part)}"]`);await settle(page);
          assert.ok(await targetError(page,kind)<.001,`${label} ${part} focus`);
          await page.waitForTimeout(500);assert.ok(await targetError(page,kind)<.001,'late reframe');await targets(page);
          // Panel and viewport changes retain the selected part, including during orbit.
          if(!touch){
            await page.setViewportSize({width:1420,height:900});await settle(page);assert.ok(await targetError(page,kind)<.001);
            await page.setViewportSize({width,height});await settle(page);
          }
          await activate('#inline-part button');await settle(page);assert.ok(await targetError(page,'step')<.001,'Back to step');
        }
        await activate('#step-back');await settle(page);assert.match(await page.locator('.step-body h2').textContent(),/^A4/);
        assert.ok(await page.evaluate(()=>__viewer.camera.position.z<__viewer.controls.target.z));await activate('#step-next');await settle(page);
      }
      if(step.id==='B4')assert.equal(await page.locator('details').count(),0);
      assert.equal(await signature(page),before,'apparatus changed');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(touch){assert.ok(await page.locator('#procedure-panel').evaluate(el=>el.offsetHeight<=innerHeight*.42+1));await page.screenshot({path:`artifacts/procedure/${label}-${step.id}.png`});}
      if(i<10){await activate('#step-next');await settle(page);}
    }
    await activate('#step-list');await targets(page);await activate('[data-step="10"]');await settle(page);await activate('#step-next');await settle(page);
    assert.ok(await page.getByText('Procedure complete',{exact:true}).isVisible());await targets(page);
    await page.keyboard.press('l');assert.equal(await page.locator('#step-backdrop').isVisible(),false);
    await activate('#restart-procedure');await settle(page);await activate('#step-exit');await settle(page);
    assert.equal(await page.locator('#procedure-start').textContent(),'▶ Start procedure');
    await activate('#procedure-start');await activate('#step-list');await activate('[data-step="10"]');await settle(page);await activate('#step-next');await settle(page);await activate('#done-procedure');await settle(page);
    assert.ok(await page.locator('#procedure-entry').isVisible());assert.equal(await signature(page),before);
    await activate('#procedure-start');await activate('#step-next');await settle(page);await page.reload();await page.waitForFunction(()=>!!window.__viewer);
    assert.match(await page.locator('#procedure-start').textContent(),/Step 2/);await targets(page);await activate('#procedure-start');await settle(page);
    // Shortcuts leave editable fields and modified combinations alone.
    await page.evaluate(()=>{const input=document.createElement('input');input.id='test-input';document.body.append(input);input.focus();});
    for(const key of ['ArrowRight','ArrowLeft','l','Escape'])await page.keyboard.press(key);
    assert.equal(await page.evaluate(()=>__viewer.procedure().index),1);assert.equal(await page.locator('#step-backdrop').isVisible(),false);
    await page.evaluate(()=>document.querySelector('#test-input').remove());
    await page.keyboard.press('l');assert.ok(await page.locator('#step-sheet').isVisible());await page.keyboard.press('Escape');await page.keyboard.press('ArrowRight');await settle(page);assert.match(await page.locator('.step-body h2').textContent(),/^A3/);await page.keyboard.press('Escape');await settle(page);
    await page.emulateMedia({reducedMotion:'reduce'});
    await activate('#procedure-start');
    await settle(page);
    // ResizeObserver may enqueue a reframe after the first settle completes.
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await settle(page);
    assert.equal(await page.evaluate(()=>__viewer.isMoving()),false);
    // Flush the queued layout frames immediately after changing the step, then
    // prove reduced motion has already reached the final view rather than easing.
    const immediate=await page.evaluate(async()=>{
      document.querySelector('#step-next').click();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return {position:__viewer.camera.position.toArray(),target:__viewer.controls.target.toArray()};
    });
    assert.ok(await targetError(page,'step')<.001,'reduced-motion target reached immediately');
    await page.waitForTimeout(300);
    const later=await page.evaluate(()=>({position:__viewer.camera.position.toArray(),target:__viewer.controls.target.toArray()}));
    for(const key of ['position','target']){
      const difference=Math.hypot(...immediate[key].map((value,i)=>value-later[key][i]));
      assert.ok(difference<.001,`reduced-motion ${key} changed by ${difference}`);
    }
    await manualViewCheck(context,width,height);
    assert.deepEqual(errors,[]);
    console.log(`${label} ${width}×${height}: PASS — all 11 steps, persistent chip focus, 44px targets, valve subsets, toast, shortcuts, resume, completion, manual orbit/pan/zoom, unchanged model`);
    await context.close();
  }
}finally{await browser.close();}
