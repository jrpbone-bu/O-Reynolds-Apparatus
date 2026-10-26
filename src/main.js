import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createApparatus } from './apparatus.js';

const viewport=document.querySelector('#viewport');
const loading=document.querySelector('#loading');
try {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#f3f4f1');
  const touchDevice=window.matchMedia('(pointer: coarse)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:!touchDevice,alpha:false,powerPreference:touchDevice?'low-power':'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,touchDevice?1.5:2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.95;
  renderer.domElement.setAttribute('aria-label','3D apparatus. Drag to rotate; pinch or scroll to zoom.');
  renderer.domElement.setAttribute('role','img');
  viewport.appendChild(renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=new RoomEnvironment();
  const env=pmrem.fromScene(environment,.04);
  scene.environment=env.texture;
  scene.environmentIntensity=.85;
  environment.dispose();pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.08;
  controls.minDistance=3;controls.maxDistance=36;
  controls.maxPolarAngle=Math.PI*.88;
  controls.autoRotateSpeed=.7;
  controls.rotateSpeed=touchDevice?.65:1;
  controls.touches.ONE=THREE.TOUCH.ROTATE;
  controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  controls.target.set(0,4.45,0);
  const model=createApparatus();scene.add(model);
  scene.add(new THREE.HemisphereLight('#ffffff','#adb4a2',1.4));
  const key=new THREE.DirectionalLight('#fff8ec',2.3);key.position.set(-5,13,7);key.castShadow=true;
  key.shadow.mapSize.set(touchDevice?1024:2048,touchDevice?1024:2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=11;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=30;key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight('#e7eeff',2.2);rim.position.set(4,8,-5);scene.add(rim);
  const fill=new THREE.DirectionalLight('#ffffff',1.2);fill.position.set(2,4,8);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#53614f',opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.007;floor.receiveShadow=true;scene.add(floor);
  // Soft contact shadow anchors the assembly even under diffuse studio light.
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(50,66,45,0.22)');gradient.addColorStop(1,'rgba(50,66,45,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(5,4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.002;scene.add(contact);
  // Fit the actual model bounds to both dimensions, including short landscape screens.
  const bounds=new THREE.Box3().setFromObject(model), center=bounds.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(.24,.078,.975).normalize());
  camera.lookAt(center);
  function fitDistance(){
    const inverse=camera.quaternion.clone().invert(), tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanX=tanY*camera.aspect;
    let distance=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const point=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);
      distance=Math.max(distance,point.z+Math.abs(point.x)*1.14/tanX,point.z+Math.abs(point.y)*1.14/tanY);
    }
    return distance;
  }
  let previousFit=0;
  function resize(){
    const zoomRatio=previousFit?camera.position.distanceTo(controls.target)/previousFit:1;
    renderer.setSize(viewport.clientWidth,viewport.clientHeight);
    camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();
    const direction=camera.position.clone().sub(controls.target).normalize();
    previousFit=fitDistance();controls.maxDistance=Math.max(36,previousFit*2.5);
    camera.position.copy(controls.target).addScaledVector(direction,THREE.MathUtils.clamp(previousFit*zoomRatio,controls.minDistance,controls.maxDistance));
    controls.update();
  }
  resize();
  new ResizeObserver(resize).observe(viewport);
  // ---- topGroup tap animation ----
  const RISE_DURATION=.7, SWING_DURATION=1.0, PARK_CLEARANCE=.08, ARC_BULGE=.12;
  const FOCUS_DURATION=.9, FOCUS_FILL=.7, RETURN_DURATION=1.5, ROLL_ENABLED=true, ROLL_DURATION=6;
  const PIPE_FOCUS_FILL=.85, CHIP_FOCUS_DURATION=.7, RESUME_ROLL_AFTER_CHIP=true;
  const LIFT_CLEARANCE=1.15, TAP_MOVE_THRESHOLD=6, LIFT_OVERSHOOT=1.2;
  const topGroup=model.getObjectByName('topGroup');
  const originalPosition=topGroup.position.clone(), originalRotation=topGroup.rotation.clone();
  model.updateMatrixWorld(true);
  const needleBounds=new THREE.Box3().setFromObject(model.getObjectByName('Thin central pipe through holder and divider'));
  needleBounds.union(new THREE.Box3().setFromObject(model.getObjectByName('Concealed downward needle')));
  const liftDistance=needleBounds.getSize(new THREE.Vector3()).y*LIFT_CLEARANCE;
  const liftedWorldPosition=topGroup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,liftDistance,0));
  const liftedPosition=topGroup.parent.worldToLocal(liftedWorldPosition);
  // Park relative to the startup view; needle focus does not alter this existing path.
  const originalQuaternion=topGroup.quaternion.clone(), parentQuaternion=topGroup.parent.getWorldQuaternion(new THREE.Quaternion());
  const inverseParentQuaternion=parentQuaternion.clone().invert();
  const screenLeft=new THREE.Vector3(-1,0,0).applyQuaternion(camera.quaternion);screenLeft.y=0;screenLeft.normalize();
  const swingAxis=new THREE.Vector3(0,1,0).cross(screenLeft).normalize();
  const parkedWorldQuaternion=new THREE.Quaternion().setFromAxisAngle(swingAxis,-Math.PI/2).multiply(topGroup.getWorldQuaternion(new THREE.Quaternion()));
  const parkedQuaternion=inverseParentQuaternion.clone().multiply(parkedWorldQuaternion);
  const lowerBounds=new THREE.Box3();
  function includeLower(object){
    if(object===topGroup)return;
    if(object.isMesh||object.isLineSegments)lowerBounds.union(new THREE.Box3().setFromObject(object));
    else for(const child of object.children)includeLower(child);
  }
  includeLower(model);
  const assemblyBounds=new THREE.Box3().setFromObject(model),parkClearance=assemblyBounds.getSize(new THREE.Vector3()).y*PARK_CLEARANCE;
  const parkPreview=topGroup.clone(true);parkPreview.position.set(0,0,0);parkPreview.quaternion.copy(parkedWorldQuaternion);
  const parkShapeBounds=new THREE.Box3().setFromObject(parkPreview),rollBounds=new THREE.Box3();
  const localNeedleAxis=new THREE.Vector3(0,1,0);
  for(let i=0;i<=72;i++){
    parkPreview.quaternion.copy(parkedWorldQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(localNeedleAxis,i*Math.PI*2/72));
    rollBounds.union(new THREE.Box3().setFromObject(parkPreview));
  }
  const lowerCenter=lowerBounds.getCenter(new THREE.Vector3()),parkShapeCenter=parkShapeBounds.getCenter(new THREE.Vector3());
  const parkedWorldPosition=new THREE.Vector3(lowerCenter.x-parkShapeCenter.x,lowerBounds.max.y+parkClearance-rollBounds.min.y,lowerCenter.z-parkShapeCenter.z);
  const parkedPosition=topGroup.parent.worldToLocal(parkedWorldPosition.clone());
  const clearedWorldPosition=topGroup.parent.localToWorld(liftedPosition.clone());
  const arcControl=clearedWorldPosition.clone().lerp(parkedWorldPosition,.5);arcControl.y=Math.max(clearedWorldPosition.y,parkedWorldPosition.y)+assemblyBounds.getSize(new THREE.Vector3()).y*ARC_BULGE;
  function applySwing(progress,useEasing=true){
    const t=useEasing?easeInOutCubic(progress):progress,worldPosition=clearedWorldPosition.clone().multiplyScalar((1-t)*(1-t)).addScaledVector(arcControl,2*(1-t)*t).addScaledVector(parkedWorldPosition,t*t);
    topGroup.position.copy(topGroup.parent.worldToLocal(worldPosition));topGroup.quaternion.slerpQuaternions(originalQuaternion,parkedQuaternion,t);
  }
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(), activePointers=new Set();
  let liftState='closed', phaseTime=0, tapStart=null;
  let CAM_START=null, savedAutoRotate=false, focusElapsed=0, focusStarted=false, focusCardElapsed=-1;
  let openView='needle',chipMoving=false;
  const focusRegion=new THREE.Box3();
  let focusDistance=0, focusTarget=new THREE.Vector3(),focusPosition=new THREE.Vector3(),focusFromPosition=new THREE.Vector3(),focusFromTarget=new THREE.Vector3();
  let rollTime=0,rollAngle=0,returnPhase='settle',settleFrom=0,settleTo=0,settleDuration=.35;
  const returnCameraPosition=new THREE.Vector3(),returnCameraTarget=new THREE.Vector3();
  const easeInOutSine=t=>(1-Math.cos(Math.PI*t))/2;
  function beginFocus(id='needle',fromChip=false){
    focusStarted=true;focusElapsed=0;
    focusFromPosition.copy(camera.position);focusFromTarget.copy(controls.target);
    if(fromChip){
      const viewQuaternion=camera.quaternion.clone();controls.enabled=false;
      for(let i=0;i<400;i++)controls.update(0);
      camera.position.copy(focusFromPosition);controls.target.copy(focusFromTarget);camera.quaternion.copy(viewQuaternion);
    }
    parkPreview.position.copy(parkedWorldPosition);parkPreview.quaternion.copy(parkedWorldQuaternion);parkPreview.updateMatrixWorld(true);
    if(fromChip){
      openView=id;chipMoving=true;controls.enabled=false;
      topGroup.updateWorldMatrix(true,true);
      parkPreview.position.copy(topGroup.getWorldPosition(new THREE.Vector3()));parkPreview.quaternion.copy(topGroup.getWorldQuaternion(new THREE.Quaternion()));parkPreview.updateMatrixWorld(true);
    }
    const tip=parkPreview.getObjectByName('Concealed downward needle');
    const tipBox=new THREE.Box3().setFromObject(tip);
    focusTarget.copy(tipBox.getCenter(new THREE.Vector3()));
    // Frame three needle lengths from its bottom tip, including the adjacent pipe.
    tip.geometry.computeBoundingBox();
    const localBox=tip.geometry.boundingBox,length=localBox.max.y-localBox.min.y;
    const regionBox=new THREE.Box3(localBox.min.clone(),localBox.max.clone());
    regionBox.min.y=regionBox.max.y-length*3;
    regionBox.min.x=-.028;regionBox.max.x=.028;regionBox.min.z=-.028;regionBox.max.z=.028;
    regionBox.applyMatrix4(tip.matrixWorld);
    if(id==='thinPipe'){
      regionBox.makeEmpty();
      for(const object of partObjects.thinPipe){const preview=parkPreview.getObjectByName(object.name);preview.geometry.computeBoundingBox();regionBox.union(preview.geometry.boundingBox.clone().applyMatrix4(preview.matrixWorld));}
      focusTarget.copy(regionBox.getCenter(new THREE.Vector3()));
    }
    focusRegion.copy(regionBox);
    const fill=id==='thinPipe'?PIPE_FOCUS_FILL:FOCUS_FILL;
    const inverseView=camera.quaternion.clone().invert(),tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanX=tanY*camera.aspect;
    focusDistance=controls.minDistance;
    for(const x of [regionBox.min.x,regionBox.max.x])for(const y of [regionBox.min.y,regionBox.max.y])for(const z of [regionBox.min.z,regionBox.max.z]){
      const point=new THREE.Vector3(x,y,z).sub(focusTarget).applyQuaternion(inverseView);
      focusDistance=Math.max(focusDistance,point.z+Math.abs(point.x)/(tanX*fill),point.z+Math.abs(point.y)/(tanY*fill));
    }
    focusDistance=THREE.MathUtils.clamp(focusDistance,controls.minDistance,controls.maxDistance);
    focusPosition.copy(focusTarget).addScaledVector(camera.position.clone().sub(controls.target).normalize(),focusDistance);
  }
  function updateFocus(delta){
    if(!focusStarted)return;
    focusElapsed+=delta;const progress=Math.min(focusElapsed/(chipMoving?CHIP_FOCUS_DURATION:FOCUS_DURATION),1),eased=easeInOutCubic(progress);
    camera.position.lerpVectors(focusFromPosition,focusPosition,eased);controls.target.lerpVectors(focusFromTarget,focusTarget,eased);camera.lookAt(controls.target);
    if(progress===1&&chipMoving){chipMoving=false;focusStarted=false;controls.enabled=true;return;}
    if(progress===1&&liftState==='focusing'){
      if(focusCardElapsed<0){selectPart('needle');focusCardElapsed=0;}
      else focusCardElapsed+=delta;
      if(focusCardElapsed>=.2){liftState='open';controls.enabled=true;infoChips.hidden=false;}
    }
  }
  function applyNeedleRoll(){topGroup.quaternion.copy(parkedQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(localNeedleAxis,rollAngle));}

  const easeInOutCubic=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  // ---- part info registry ----
  const partInfo={
    chamber:{label:'Water Chamber',purpose:'Glass chamber where water flows upward past the needle, so the dye stream can be observed.'},
    needle:{label:'Needle',purpose:'Fine tip that releases the dye into the flowing water.'},
    thinPipe:{label:'Thin Pipe',purpose:'Hollow tube that carries the dye down from the top container to the needle.'},
    topGroup:{label:'Top assembly',purpose:'Removable top assembly. The needle injects dye into the water flowing through the chamber.'},
    whiteCylinder:{label:'White cylinder',purpose:'Sleeve that guides the needle into the flow chamber.'},
    component7:{label:'Flow meter & valve',purpose:'Flow meter with control valve. Measures and adjusts the flow rate.'},
    blueManifold:{label:'Blue manifold & pipes',purpose:'Carries water between the tanks, pump and chamber.'},
    leftTank:{label:'Left tank',purpose:'Hold the water supply and collect the return flow.'},
    rightTank:{label:'Right tank',purpose:'Hold the water supply and collect the return flow.'},
    pump:{label:'Pump',purpose:'Circulates water through the system.'},
    lowerFrame:{label:'Lower frame',purpose:'Supports the whole apparatus.'}
  };
  const partObjects={
    chamber:[model.getObjectByName('chamberGroup')],
    topGroup:[topGroup],
    needle:[model.getObjectByName('Concealed downward needle')],
    thinPipe:[model.getObjectByName('Thin central pipe through holder and divider'),model.getObjectByName('Needle to thin pipe joint collar')],
    whiteCylinder:[],
    component7:[model.getObjectByName('07 — vertical flow meter and left-facing handwheel')],
    blueManifold:[model.getObjectByName('05 + 06 — blue header and rear valve controls')],
    leftTank:[model.getObjectByName('08 — fixed enclosed collection tank')],
    rightTank:[model.getObjectByName('10 — open reservoir')],
    pump:[model.getObjectByName('09 — base-mounted pump, reservoir-only intake')],
    lowerFrame:[model.getObjectByName('11 — continuous structural frame')]
  };
  model.traverse(object=>{
    if(['White hollow needle sleeve outer','White hollow needle sleeve inner','Open annular sleeve rim'].includes(object.name))partObjects.whiteCylinder.push(object);
    if(['White lower tray platform'].includes(object.name))partObjects.lowerFrame.push(object);
  });
  for(const [id,objects] of Object.entries(partObjects))for(const object of objects)object.userData.partId=id;
  const hitProxies=[];
  for(const id of ['component7','pump','whiteCylinder','topGroup','chamber']){
    const bounds=new THREE.Box3();for(const object of partObjects[id])bounds.union(new THREE.Box3().setFromObject(object));
    const size=bounds.getSize(new THREE.Vector3()).multiplyScalar(1.1),center=bounds.getCenter(new THREE.Vector3());
    const proxy=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),new THREE.MeshBasicMaterial({visible:false,depthWrite:false}));
    proxy.name=id+' touch hit proxy';proxy.userData.partId=id;if(id==='topGroup'){proxy.matrixAutoUpdate=false;proxy.userData.topOffset=new THREE.Matrix4().makeTranslation(...topGroup.worldToLocal(center).toArray());}else if(id==='chamber'){proxy.position.copy(partObjects.chamber[0].worldToLocal(center));}else proxy.position.copy(model.worldToLocal(center));if(id==='chamber')partObjects.chamber[0].add(proxy);else model.add(proxy);hitProxies.push(proxy);
  }
  // Small-part proxies remain on the moving assembly; visible meshes are unchanged.
  for(const id of ['needle','thinPipe']){
    const box=new THREE.Box3();
    for(const object of partObjects[id]){
      object.geometry.computeBoundingBox();
      box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrix));
    }
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    size.x*=3;size.z*=3;size.y*=1.1;
    const proxy=new THREE.Mesh(new THREE.BoxGeometry(...size.toArray()),new THREE.MeshBasicMaterial({visible:false,depthWrite:false}));
    proxy.name=id+' touch hit proxy';proxy.userData.partId=id;proxy.position.copy(center);
    topGroup.add(proxy);hitProxies.push(proxy);
  }
  function syncTopHitProxy(){
    const proxy=hitProxies.find(object=>object.userData.partId==='topGroup');
    topGroup.updateWorldMatrix(true,false);
    proxy.matrix.copy(model.matrixWorld).invert().multiply(topGroup.matrixWorld).multiply(proxy.userData.topOffset);
  }
  const infoCard=document.querySelector('#part-info'),infoLabel=document.querySelector('#part-info-label'),infoPurpose=document.querySelector('#part-info-purpose');
  const infoChips=document.createElement('div');infoChips.className='part-chips';infoChips.hidden=true;infoCard.appendChild(infoChips);
  for(const id of ['needle','thinPipe']){
    const chip=document.createElement('button');chip.textContent=partInfo[id].label;chip.type='button';
    chip.addEventListener('click',()=>{if(liftState==='open'){selectPart(id);beginFocus(id,true);}});infoChips.appendChild(chip);
  }
  let selectedPart=null;
  const materialRestores=[],selectionEdges=[];
  function clearSelection(){
    for(const {object,material,temporary} of materialRestores){object.material=material;for(const mat of temporary)mat.dispose();}
    materialRestores.length=0;
    for(const outline of selectionEdges){outline.removeFromParent();outline.geometry.dispose();outline.material.dispose();}selectionEdges.length=0;
    infoChips.hidden=true;selectedPart=null;if(liftState==='selected')liftState='closed';infoCard.classList.remove('is-visible');infoCard.setAttribute('aria-hidden','true');
  }
  function positionInfoCard(){
    if(!selectedPart)return;
    const bounds=new THREE.Box3();for(const object of partObjects[selectedPart])bounds.union(new THREE.Box3().setFromObject(object));
    const center=bounds.getCenter(new THREE.Vector3()).project(camera),atTop=['needle','thinPipe'].includes(selectedPart)||center.y<0;infoCard.classList.toggle('at-top',atTop);
    const bar=document.querySelector('.controls');
    infoCard.style.bottom=atTop?'auto':bar?(innerHeight-bar.getBoundingClientRect().top+12)+'px':'';
  }
  function selectPart(id){
    clearSelection();if(!id)return;selectedPart=id;if(id==='topGroup'&&liftState==='closed')liftState='selected';infoCard.style.transitionDuration='';
    for(const root of partObjects[id])root.traverse(object=>{
      if(!object.isMesh||hitProxies.includes(object)||object.userData.partId&&object.userData.partId!==id)return;
      const original=object.material,materials=Array.isArray(original)?original:[original];
      const temporary=materials.map(material=>{const copy=material.clone();if(copy.emissive){copy.emissive.set(id==='needle'?'#00e5ff':'#b69245');copy.emissiveIntensity=id==='needle'?1.5:.3;}return copy;});
      object.material=Array.isArray(original)?temporary:temporary[0];materialRestores.push({object,material:original,temporary});
      if(id==='needle'&&object.userData.partId==='needle'){
        object.geometry.computeBoundingBox();
        const box=object.geometry.boundingBox,size=box.getSize(new THREE.Vector3());
        const overlay=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(size.x,size.z)*1.25,Math.max(size.x,size.z)*1.25,size.y,24),new THREE.MeshBasicMaterial({color:'#00e5ff',opacity:.5,transparent:true,depthWrite:false}));
        overlay.name='Temporary needle highlight';overlay.userData.isHighlight=true;overlay.raycast=()=>{};
        // An empty object bounding box excludes this visual overlay from Box3 calculations.
        overlay.boundingBox=new THREE.Box3();
        overlay.position.copy(object.position);overlay.quaternion.copy(object.quaternion);overlay.scale.copy(object.scale);
        object.parent.add(overlay);selectionEdges.push(overlay);
      }
      if(materials.some(material=>material.transparent||!material.emissive)){
        const outline=new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry),new THREE.LineBasicMaterial({color:'#b69245',transparent:true,opacity:.55}));outline.raycast=()=>{};object.add(outline);selectionEdges.push(outline);
      }
    });
    infoChips.hidden=liftState!=='open';
    infoLabel.textContent=partInfo[id].label;infoPurpose.textContent=partInfo[id].purpose;infoCard.setAttribute('aria-hidden','false');infoCard.classList.add('is-visible');positionInfoCard();
  }
  document.querySelector('#part-info-close').addEventListener('click',()=>{if(liftState==='open')startReturn();else clearSelection();});
  function partAtPointer(event){
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    syncTopHitProxy();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    const resolve=object=>{for(let node=object;node;node=node.parent)if(node.userData.partId)return node.userData.partId;return null;};
    const hits=raycaster.intersectObject(model,true).filter(hit=>hit.object.isMesh&&!hit.object.userData.isHighlight&&!hitProxies.includes(hit.object));
    // The transparent chamber must not intercept taps aimed at the pipe inside it.
    const detailHit=hits.find(hit=>['needle','thinPipe'].includes(resolve(hit.object)));
    if(detailHit)return resolve(detailHit.object);
    const detailProxyHit=raycaster.intersectObjects(hitProxies.filter(object=>['needle','thinPipe'].includes(object.userData.partId)),false)[0];
    if(detailProxyHit)return resolve(detailProxyHit.object);
    for(const hit of hits){const id=resolve(hit.object);if(id)return id;}
    const proxies=liftState==='open'?[...hitProxies.filter(object=>['needle','thinPipe'].includes(object.userData.partId)),...hitProxies.filter(object=>!['needle','thinPipe'].includes(object.userData.partId))]:hitProxies;
    for(const hit of raycaster.intersectObjects(proxies,false)){const id=resolve(hit.object);if(id)return id;}
    return null;
  }
  function startLift(){
    if(liftState!=='closed'&&liftState!=='selected')return;
    CAM_START={position:camera.position.clone(),target:controls.target.clone(),quaternion:camera.quaternion.clone()};savedAutoRotate=controls.autoRotate;
    controls.autoRotate=false;controls.enabled=false;
    // Drain existing damping through the public API, then restore the captured view before any render.
    for(let i=0;i<400;i++)controls.update(0);
    camera.position.copy(CAM_START.position);controls.target.copy(CAM_START.target);camera.quaternion.copy(CAM_START.quaternion);
    openView='needle';chipMoving=false;clearSelection();focusStarted=false;focusElapsed=0;focusCardElapsed=-1;rollTime=0;rollAngle=0;liftState='rising';phaseTime=0;
  }
  function startReturn(){
    if(liftState!=='open')return;
    chipMoving=false;focusStarted=false;clearSelection();infoCard.style.transitionDuration='.15s';controls.enabled=false;
    returnCameraPosition.copy(camera.position);returnCameraTarget.copy(controls.target);
    const returnQuaternion=camera.quaternion.clone();for(let i=0;i<400;i++)controls.update(0);
    camera.position.copy(returnCameraPosition);controls.target.copy(returnCameraTarget);camera.quaternion.copy(returnQuaternion);
    const remaining=ROLL_DURATION-rollTime%ROLL_DURATION;
    settleFrom=rollAngle;settleTo=ROLL_ENABLED&&remaining<.5?Math.PI*2:0;settleDuration=ROLL_ENABLED&&remaining<.5?remaining:.35;
    returnPhase='settle';phaseTime=0;liftState='returning';
  }
  document.querySelector('#lift')?.addEventListener('click',()=>{if(liftState==='open')startReturn();else if(liftState==='closed')startLift();});
  // ---- end part info registry and selection ----
  viewport.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('.part-chips'))return;
    activePointers.add(event.pointerId);
    if(activePointers.size!==1){tapStart=null;return;}
    tapStart=event.isPrimary&&event.button===0&&(event.target===renderer.domElement||liftState==='open')?{id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,hit:partAtPointer(event)}:null;
  });
  viewport.addEventListener('pointermove',event=>{
    if(tapStart&&event.pointerId===tapStart.id&&Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y)>=TAP_MOVE_THRESHOLD)tapStart.moved=true;
    if(event.pointerType!=='touch')renderer.domElement.style.cursor=partAtPointer(event)?'pointer':'';
  });
  viewport.addEventListener('pointerup',event=>{
    activePointers.delete(event.pointerId);
    const tap=tapStart;tapStart=null;
    if(!tap||tap.id!==event.pointerId||tap.moved||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>=TAP_MOVE_THRESHOLD)return;
    if(['rising','swinging','focusing','returning'].includes(liftState))return;
    if(event.target.closest?.('.part-chips'))return;
    const rawId=partAtPointer(event);
    if(liftState==='open'){if(rawId==='needle'){selectPart('needle');beginFocus('needle',true);}else startReturn();return;}if(rawId!==tap.hit)return;
    const id=['needle','thinPipe'].includes(rawId)?'topGroup':rawId;
    if(id==='topGroup'&&liftState==='selected')startLift();else selectPart(id);
  });
  viewport.addEventListener('pointercancel',event=>{activePointers.delete(event.pointerId);tapStart=null;});
  viewport.addEventListener('pointerleave',()=>{renderer.domElement.style.cursor='';});
  function updateTopGroupAnimation(delta){
    if(liftState==='closed'||liftState==='selected')return;
    if(liftState==='open'){
      if(chipMoving){updateFocus(delta);return;}
      if(ROLL_ENABLED&&RESUME_ROLL_AFTER_CHIP){rollTime+=delta;rollAngle=Math.PI*2*easeInOutSine((rollTime%ROLL_DURATION)/ROLL_DURATION);applyNeedleRoll();}return;
    }
    phaseTime+=delta;
    if(liftState==='rising'){
      const progress=Math.min(phaseTime/RISE_DURATION,1),eased=1+(LIFT_OVERSHOOT+1)*Math.pow(progress-1,3)+LIFT_OVERSHOOT*Math.pow(progress-1,2);
      topGroup.position.lerpVectors(originalPosition,liftedPosition,eased);
      if(progress===1){topGroup.position.copy(liftedPosition);liftState='swinging';phaseTime=0;}
    }else if(liftState==='swinging'){
      const progress=Math.min(phaseTime/SWING_DURATION,1);applySwing(progress);
      if(progress>=.7){if(!focusStarted)beginFocus();updateFocus(delta);}
      if(progress===1){topGroup.position.copy(parkedPosition);topGroup.quaternion.copy(parkedQuaternion);liftState='focusing';phaseTime=0;}
    }else if(liftState==='focusing'){
      if(ROLL_ENABLED){rollTime+=delta;rollAngle=Math.PI*2*easeInOutSine((rollTime%ROLL_DURATION)/ROLL_DURATION);applyNeedleRoll();}
      updateFocus(delta);
    }else if(liftState==='returning'){
      if(returnPhase==='settle'){
        const progress=Math.min(phaseTime/settleDuration,1);rollAngle=THREE.MathUtils.lerp(settleFrom,settleTo,easeInOutCubic(progress));applyNeedleRoll();
        if(progress===1){topGroup.quaternion.copy(parkedQuaternion);returnPhase='travel';phaseTime=0;}
        return;
      }
      const progress=Math.min(phaseTime/(RETURN_DURATION-settleDuration),1),shared=easeInOutCubic(progress),swingFraction=SWING_DURATION/(SWING_DURATION+RISE_DURATION);
      if(shared<swingFraction)applySwing(1-shared/swingFraction,false);
      else{topGroup.rotation.copy(originalRotation);topGroup.position.lerpVectors(liftedPosition,originalPosition,(shared-swingFraction)/(1-swingFraction));}
      camera.position.lerpVectors(returnCameraPosition,CAM_START.position,shared);controls.target.lerpVectors(returnCameraTarget,CAM_START.target,shared);camera.lookAt(controls.target);
      if(progress===1){
        topGroup.position.copy(originalPosition);topGroup.rotation.copy(originalRotation);camera.position.copy(CAM_START.position);controls.target.copy(CAM_START.target);camera.quaternion.copy(CAM_START.quaternion);
        clearSelection();controls.enabled=true;controls.autoRotate=savedAutoRotate;liftState='closed';phaseTime=0;
      }
    }
  }
  // ---- end topGroup tap animation ----
  let last=performance.now();
  renderer.setAnimationLoop(now=>{const delta=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;if(controls.enabled)controls.update(delta);updateTopGroupAnimation(delta);syncTopHitProxy();positionInfoCard();renderer.render(scene,camera);});
  loading.hidden=true;loading.style.display='none';
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.textContent='The 3D view was interrupted. Refresh to reload.';loading.style.display='grid';});
} catch(error) {
  console.error(error);loading.textContent='The 3D view could not start. Please use a browser with WebGL enabled.';
}
