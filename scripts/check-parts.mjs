// Taps every PDF part on a phone and clicks it on desktop; run against `npm run dev`.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const url=process.env.APP_URL??'http://localhost:5173/';
await mkdir('artifacts/part-focus',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const failures=[];
const sceneState=page=>page.evaluate(()=>{const rows=[];__viewer.model.updateMatrixWorld(true);__viewer.model.traverse(o=>{if((o.isMesh||o.isLineSegments)&&!o.userData.isHighlight)rows.push(o.matrixWorld.elements.map(v=>v.toFixed(6)).join(','));});return rows.join('|');});
async function settle(page){await page.waitForFunction(()=>!__viewer.isMoving(),null,{timeout:15000});await page.waitForTimeout(300);}
// Finds a screen point that picks the part, starting from its meshes' projected centers.
const findPoint=(page,name)=>page.evaluate(name=>{
  const {camera,partGroups,pick}=__viewer,rect=document.querySelector('canvas').getBoundingClientRect(),points=[];
  partGroups[name].traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const c=o.geometry.boundingBox.getCenter(o.position.clone()).applyMatrix4(o.matrixWorld).project(camera);points.push([rect.left+(c.x+1)/2*rect.width,rect.top+(1-c.y)/2*rect.height]);});
  for(const [x,y] of points)for(const [dx,dy] of [[0,0],[6,0],[-6,0],[0,6],[0,-6],[12,12],[-12,-12]]){const px=x+dx,py=y+dy;if(px>2&&py>2&&px<innerWidth-2&&py<innerHeight-2&&pick(px,py)===name)return [px,py];}
  return null;
},name);
for(const [label,options,touch] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},true],['small-phone',{viewport:{width:360,height:740},isMobile:true,hasTouch:true},true],['desktop',{viewport:{width:1440,height:900}},false]]){
  const context=await browser.newContext({...options,deviceScaleFactor:1});const page=await context.newPage();
  page.on('pageerror',error=>failures.push(`${label}: ${error.message}`));
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.waitForTimeout(500);
  const before=await sceneState(page);
  const names=await page.evaluate(()=>Object.keys(__viewer.partGroups));
  const tap=(x,y)=>touch?page.touchscreen.tap(x,y):page.mouse.click(x,y);
  for(const name of names){
    // Start each part from the home view so every part is reachable on screen.
    if(await page.locator('#part-info').evaluate(el=>el.classList.contains('is-visible'))){await page.locator('#part-info-close').click();await settle(page);}
    const point=await findPoint(page,name);
    if(!point){failures.push(`${label}: no tappable point for ${name}`);continue;}
    await tap(...point);await settle(page);
    const info=await page.evaluate(name=>{
      const card=document.querySelector('#part-info'),r=card.getBoundingClientRect();
      return {visible:card.classList.contains('is-visible'),label:document.querySelector('#part-info-label').textContent,bottomGap:innerHeight-r.bottom,top:r.top,height:r.height};
    },name);
    const targetError=await page.evaluate(name=>{const {controls,partGroups}=__viewer;const min=controls.target.clone().set(Infinity,Infinity,Infinity),max=min.clone().negate();partGroups[name].traverse(o=>{if(!o.isMesh&&!o.isLineSegments||o.userData.isHighlight)return;o.geometry.computeBoundingBox();const g=o.geometry.boundingBox;for(const x of [g.min.x,g.max.x])for(const y of [g.min.y,g.max.y])for(const z of [g.min.z,g.max.z]){const p=controls.target.clone().set(x,y,z).applyMatrix4(o.matrixWorld);min.min(p);max.max(p);}});return min.add(max).multiplyScalar(.5).distanceTo(controls.target);},name);
    if(!info.visible||info.label!==name)failures.push(`${label}: panel shows "${info.label}" for ${name}`);
    if(info.bottomGap<0||info.bottomGap>40)failures.push(`${label}: panel not docked at bottom for ${name} (gap ${info.bottomGap})`);
    if(targetError>1e-3)failures.push(`${label}: camera target off ${name} center by ${targetError}`);
    if(await sceneState(page)!==before)failures.push(`${label}: scene objects moved after tapping ${name}`);
    await page.screenshot({path:`artifacts/part-focus/${label}-${name.replace(/[^a-z]+/gi,'-').toLowerCase()}.png`});
    console.log(`${label}: ${name} ok (panel ${Math.round(info.height)}px tall)`);
  }
  // Tapping empty space closes the panel and returns the camera home.
  await tap(10,10);await settle(page);
  if(await page.locator('#part-info').evaluate(el=>el.classList.contains('is-visible')))failures.push(`${label}: empty tap did not close the panel`);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))failures.push(`${label}: horizontal overflow`);
  await context.close();
}
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('PASS: every PDF part selects, focuses and shows its description at the bottom; no scene object moved.');
