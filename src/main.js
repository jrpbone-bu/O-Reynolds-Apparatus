import procedure, { phases, SHOW_REYNOLDS_NOTE } from './procedure.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createApparatus } from './apparatus.js';
import { addBlueprintBackground } from './background.js';

const viewport=document.querySelector('#viewport');
const loading=document.querySelector('#loading');
try {
  const scene=new THREE.Scene();
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
  addBlueprintBackground(scene);
  // Fit the actual model bounds to both dimensions, including short landscape screens.
  const bounds=new THREE.Box3().setFromObject(model), center=bounds.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(.24,.078,.975).normalize());
  camera.lookAt(center);
  const HOME_DIRECTION=camera.position.clone().sub(center).normalize();
  // Height in CSS px reserved for the bottom panel; the frustum is extended below the screen by this
  // amount so the focused part is centered in the area that stays visible above the panel.
  let panelOffset=0;
  function applyProjection(){
    const width=viewport.clientWidth,height=viewport.clientHeight;
    camera.aspect=width/(height+panelOffset);
    if(panelOffset>0)camera.setViewOffset(width,height+panelOffset,0,panelOffset,width,height);else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // Camera distance that fits a box's corners within `fill` of the area above the panel.
  function distanceToFit(box,target,direction,fill,offset){
    const width=viewport.clientWidth,height=viewport.clientHeight;
    const view=new THREE.Matrix4().lookAt(direction,new THREE.Vector3(),camera.up),inverse=new THREE.Quaternion().setFromRotationMatrix(view).invert();
    const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),scale=(height+offset)/(2*tanY);
    const halfWidth=fill*width/2,halfHeight=fill*(height-offset)/2;
    let distance=0;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const point=new THREE.Vector3(x,y,z).sub(target).applyQuaternion(inverse);
      distance=Math.max(distance,point.z+Math.abs(point.x)*scale/halfWidth,point.z+Math.abs(point.y)*scale/halfHeight);
    }
    return distance;
  }
  function fitDistance(){return distanceToFit(bounds,center,HOME_DIRECTION,1/1.14,0);}
  // The fitted starting view; with a panel offset the whole apparatus fits above the panel.
  function homeView(offset=0){
    const distance=distanceToFit(bounds,center,HOME_DIRECTION,1/1.14,offset);
    return {target:center.clone(),position:center.clone().addScaledVector(HOME_DIRECTION,THREE.MathUtils.clamp(distance,controls.minDistance,controls.maxDistance)),offset};
  }
  let previousFit=0,selectedPart=null;
  let procedureState=null;
  let procedureFocus=null, reframeRequest=0, reframePending=null, orbiting=false;
  let userMoved=false;
  function resize(){
    const zoomRatio=previousFit?camera.position.distanceTo(controls.target)/previousFit:1;
    renderer.setSize(viewport.clientWidth,viewport.clientHeight);
    applyProjection();
    previousFit=fitDistance();controls.maxDistance=Math.max(36,previousFit*2.5);
    if(procedureState){scheduleProcedureFrame('window');return;}
    if(selectedPart){focusPart(selectedPart,true);return;}
    const direction=camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(direction,THREE.MathUtils.clamp(previousFit*zoomRatio,controls.minDistance,controls.maxDistance));
    controls.update();
  }
  resize();
  new ResizeObserver(resize).observe(viewport);

  // ---- PDF part selection: tap a part, the camera focuses it, its description shows at the bottom ----
  const FOCUS_DURATION=.8, FOCUS_FILL=.6, TAP_MOVE_THRESHOLD=6, MIN_TOUCH_PX=44, GLASS_OPACITY=.3;
  // Descriptions are taken from the Reynolds Apparatus document.
  const partInfo={
    'Dye Injection Site':'Located at the top of the system, this component introduces the concentrated dye solution into the water flow to make flow patterns visible.',
    'Pipe for Dye':'Directs the injected dye from the dye site into the main stream of water flowing inside the apparatus.',
    'Upper Water Tank':'Serves as a water reservoir that supplies water continuously to maintain a steady and controlled flow head during testing.',
    'Control Valve':'Installed at different points in the piping system to adjust and regulate the volumetric flow rate and pressure of water.',
    'Flow Visualization Pipe Section':'A transparent pipe section where the dye mixes with the moving water stream, allowing users to visually observe laminar, transitional, or turbulent flow behavior.',
    'Flow Meter':'A precision measurement device used to measure the volumetric flow rate of water flowing through the system.',
    'Lower Water Tank & Water Pump':'The lower tank stores water at the base, while the water pump recirculates it back to the upper water tank to ensure continuous operation.',
    'Drainage Tank':'Collects the waste water-dye mixture after passing through the visualization section for proper disposal or treatment.'
  };
  const partGroups=Object.fromEntries(model.children.filter(group=>group.userData.partId).map(group=>[group.userData.partId,group]));
  // Thin parts get an enlarged, invisible tap area per mesh so they can be hit with a finger.
  const smallPartMeshes=[];
  for(const name of ['Pipe for Dye','Flow Visualization Pipe Section','Control Valve'])partGroups[name].traverse(object=>{if(object.isMesh)smallPartMeshes.push(object);});
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(), activePointers=new Set();
  let tapStart=null;
  const partOf=object=>{for(let node=object;node;node=node.parent)if(node.userData.partId)return node.userData.partId;return null;};
  const isGlass=object=>{const materials=Array.isArray(object.material)?object.material:[object.material];return materials.every(material=>material.transparent&&material.opacity<GLASS_OPACITY);};
  // Returns the tapped part and the mesh that was hit, or null.
  function partAtPointer(event){
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    // Glass lets taps through to what is inside it; the first solid surface decides.
    let glass=null,solid=null;
    for(const hit of raycaster.intersectObject(model,true)){
      if(!hit.object.isMesh||hit.object.userData.isHighlight)continue;
      if(isGlass(hit.object)){if(!glass&&partOf(hit.object))glass=hit.object;continue;}
      solid=hit;break;
    }
    const worldPerPixel=distance=>2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(viewport.clientHeight+panelOffset);
    let near=null;
    const box=new THREE.Box3(),hitPoint=new THREE.Vector3();
    for(const object of smallPartMeshes){
      box.setFromObject(object);
      const minimum=MIN_TOUCH_PX*worldPerPixel(camera.position.distanceTo(box.getCenter(hitPoint))),size=box.getSize(new THREE.Vector3());
      box.expandByVector(new THREE.Vector3(Math.max(0,minimum-size.x)/2,Math.max(0,minimum-size.y)/2,Math.max(0,minimum-size.z)/2));
      if(raycaster.ray.intersectBox(box,hitPoint)){const distance=hitPoint.distanceTo(raycaster.ray.origin);if(!near||distance<near.distance)near={distance,mesh:object};}
    }
    // A direct hit on a part wins; the enlarged tap areas only help when the finger just misses.
    const mesh=(solid&&partOf(solid.object)?solid.object:null)??near?.mesh??glass;
    return mesh?{part:partOf(mesh),mesh}:null;
  }

  // Large parts are already in full view, so they only get a highlight; smaller parts get a close-up.
  const LARGE_PARTS=['Upper Water Tank','Lower Water Tank & Water Pump','Drainage Tank'];
  const FOCUS_MIN_DISTANCE=.8, DEFAULT_MIN_DISTANCE=controls.minDistance;
  // The handwheel valve beside the flow meter is focused from the current view. The two rear valves on the
  // blue pipes are focused together from behind the apparatus, where their twist handles face.
  const REAR_VALVE_NAMES=['Valve body','Rear-facing valve spindle','Rear upright butterfly control'];
  const REAR_VIEW_DIRECTION=new THREE.Vector3(.38,.22,-.9).normalize();
  const valveOf=new Map(),frontValve=[],rearValves=[];
  partGroups['Control Valve'].traverse(object=>{if(object.isMesh)(REAR_VALVE_NAMES.includes(object.name)?rearValves:frontValve).push(object);});
  for(const object of frontValve)valveOf.set(object,frontValve);
  for(const object of rearValves)valveOf.set(object,rearValves);

  const infoCard=document.querySelector('#part-info'),infoLabel=document.querySelector('#part-info-label'),infoPurpose=document.querySelector('#part-info-purpose');
  // Temporary highlight overlays share each mesh's geometry; the original materials are never touched.
  const HIGHLIGHT_COLOR='#f5a623', MIN_GLOW_THICKNESS=.07;
  const selectionHighlight=[],hoverHighlight=[];
  function clearHighlight(list){for(const overlay of list){overlay.removeFromParent();if(overlay.isLineSegments)overlay.geometry.dispose();overlay.material.dispose();}list.length=0;}
  function highlightPart(name,list,strong){
    clearHighlight(list);
    const objects=[];
    for(const root of Array.isArray(name)?name:[partGroups[name]])root.traverse(object=>{if(object.isMesh&&!object.userData.isHighlight)objects.push(object);});
    for(const object of new Set(objects)){
      // Strong highlights draw on top of glass and frame so thin parts like the dye pipe stay visible.
      const glow=new THREE.Mesh(object.geometry,new THREE.MeshBasicMaterial({color:HIGHLIGHT_COLOR,transparent:true,opacity:strong?.2:.1,depthTest:!strong,depthWrite:false,side:THREE.DoubleSide}));
      if(strong){
        // Thicken very thin parts around their own center so the glow reads on a phone screen.
        object.geometry.computeBoundingBox();
        const box=object.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),middle=box.getCenter(new THREE.Vector3());
        glow.scale.set(...size.toArray().map(value=>value>0&&value<MIN_GLOW_THICKNESS?MIN_GLOW_THICKNESS/value:1));
        glow.position.copy(middle).sub(middle.clone().multiply(glow.scale));
        glow.userData.pulse=true;
      }
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry,30),new THREE.LineBasicMaterial({color:HIGHLIGHT_COLOR,transparent:true,opacity:strong?.75:.45,depthTest:!strong,depthWrite:false}));
      for(const overlay of [glow,edges]){overlay.userData.isHighlight=true;overlay.raycast=()=>{};overlay.renderOrder=strong?1000:10;overlay.castShadow=overlay.receiveShadow=false;object.add(overlay);list.push(overlay);}
    }
  }
  function panelHeight(){const card=procedureState?document.querySelector('#procedure-panel'):infoCard;return card.offsetHeight+parseFloat(getComputedStyle(card).bottom)+12;}
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

  const easeInOutCubic=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  let move=null;
  function settleControls(){
    // Drain OrbitControls damping, then restore the current view exactly.
    const position=camera.position.clone(),target=controls.target.clone(),quaternion=camera.quaternion.clone();
    controls.enabled=false;for(let i=0;i<400;i++)controls.update(0);
    camera.position.copy(position);controls.target.copy(target);camera.quaternion.copy(quaternion);
  }
  function moveCamera(to,instant=false){
    settleControls();controls.autoRotate=false;
    move={fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),fromOffset:panelOffset,...to,elapsed:instant||reducedMotion.matches?FOCUS_DURATION:0};
    if(instant||reducedMotion.matches)updateMove(0);
  }
  function updateMove(delta){
    if(!move)return;
    move.elapsed+=delta;const progress=Math.min(move.elapsed/FOCUS_DURATION,1),eased=easeInOutCubic(progress);
    panelOffset=THREE.MathUtils.lerp(move.fromOffset,move.offset,eased);applyProjection();
    camera.position.lerpVectors(move.fromPosition,move.position,eased);controls.target.lerpVectors(move.fromTarget,move.target,eased);camera.lookAt(controls.target);
    if(progress===1){move=null;controls.enabled=true;controls.update();}
  }
  let focusMeshes=null;
  function focusPart(name,instant=false){
    if(LARGE_PARTS.includes(name)){
      // Keep the whole apparatus in view above the panel; no zoom.
      controls.minDistance=DEFAULT_MIN_DISTANCE;
      moveCamera(homeView(panelHeight()),instant);return;
    }
    frameMeshes(focusMeshes,focusMeshes===rearValves?REAR_VIEW_DIRECTION:null,instant);
  }
  function frameMeshes(meshes,direction=null,instant=false){
    const box=new THREE.Box3();model.updateMatrixWorld(true);
    for(const object of meshes)object.traverse(child=>{
      if((child.isMesh||child.isLineSegments)&&!child.userData.isHighlight){
        child.geometry.computeBoundingBox();
        box.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld));
      }
    });
    const target=box.getCenter(new THREE.Vector3()),offset=panelHeight();
    direction=direction?.clone()??camera.position.clone().sub(controls.target).normalize();
    const distance=THREE.MathUtils.clamp(distanceToFit(box,target,direction,FOCUS_FILL,offset),FOCUS_MIN_DISTANCE,controls.maxDistance);
    // Let the user stay this close while orbiting the part.
    controls.minDistance=Math.min(DEFAULT_MIN_DISTANCE,distance);
    moveCamera({target,position:target.clone().addScaledVector(direction,distance),offset},instant);
  }
  function selectPart(name,mesh){
    entry.hidden=true;
    selectedPart=name;
    focusMeshes=name==='Control Valve'&&valveOf.has(mesh)?valveOf.get(mesh):[partGroups[name]];
    infoLabel.textContent=name;infoPurpose.textContent=partInfo[name];
    infoCard.setAttribute('aria-hidden','false');infoCard.classList.add('is-visible');
    clearHighlight(hoverHighlight);hoverPart=null;
    highlightPart(name,selectionHighlight,!LARGE_PARTS.includes(name));focusPart(name);
  }
  function clearSelection(){
    if(!selectedPart)return;
    entry.hidden=false;
    selectedPart=null;focusMeshes=null;clearHighlight(selectionHighlight);
    infoCard.classList.remove('is-visible');infoCard.setAttribute('aria-hidden','true');
    controls.minDistance=DEFAULT_MIN_DISTANCE;
    moveCamera(homeView());
  }
  document.querySelector('#part-info-close').addEventListener('click',clearSelection);

  viewport.addEventListener('pointerdown',event=>{
    activePointers.add(event.pointerId);
    tapStart=activePointers.size===1&&event.isPrimary&&event.button===0&&event.target===renderer.domElement?{id:event.pointerId,x:event.clientX,y:event.clientY,moved:false}:null;
  });
  // Desktop hover: a light highlight on the part under the pointer.
  let hoverFrame=0,hoverPart=null;
  function setHover(name){
    if(name===selectedPart)name=null;
    if(name===hoverPart)return;
    hoverPart=name;clearHighlight(hoverHighlight);if(name)highlightPart(name,hoverHighlight,false);
  }
  viewport.addEventListener('pointermove',event=>{
    if(tapStart&&event.pointerId===tapStart.id&&Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y)>=TAP_MOVE_THRESHOLD)tapStart.moved=true;
    if(event.pointerType==='touch'||hoverFrame||event.target!==renderer.domElement)return;
    hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;const hit=move||event.buttons?null:partAtPointer(event);renderer.domElement.style.cursor=hit?'pointer':'';setHover(hit?.part??null);});
  });
  viewport.addEventListener('pointerup',event=>{
    activePointers.delete(event.pointerId);
    const tap=tapStart;tapStart=null;
    if(!tap||tap.id!==event.pointerId||tap.moved||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>=TAP_MOVE_THRESHOLD)return;
    const hit=partAtPointer(event);
    if(procedureState){
      if(hit)procedureTap(hit);else hideToast();
      return;
    }
    if(hit)selectPart(hit.part,hit.mesh);else clearSelection();
  });
  viewport.addEventListener('pointercancel',event=>{activePointers.delete(event.pointerId);tapStart=null;});
  viewport.addEventListener('pointerleave',()=>{renderer.domElement.style.cursor='';setHover(null);});
  function pulseHighlight(now){
    if(reducedMotion.matches)return;
    const opacity=.13+.11*(.5+.5*Math.sin(now/260));
    for(const overlay of [...selectionHighlight,...stepHighlights.flat()])if(overlay.userData.pulse)overlay.material.opacity=opacity;
  }
  // Guided mode shares the existing camera and highlight helpers.
  const entry = document.querySelector('#procedure-entry'),
    panel = document.querySelector('#procedure-panel'),
    toast = document.querySelector('#procedure-toast'),
    backdrop = document.querySelector('#step-backdrop');
  const visited = new Set(),
    stepHighlights = [];
  let savedStep = null,
    sheetReturn = null,
    toastTimer = null;
  try {
    const value = localStorage.getItem('reynolds-procedure');
    if (value !== null && Number.isInteger(+value) && +value >= 0 && +value < 11)
      savedStep = +value;
  } catch {}
  function updateEntry() {
    document.querySelector('#procedure-start').textContent =
      savedStep === null
        ? '▶ Start procedure'
        : `▶ Resume procedure (Step ${savedStep + 1})`;
    document.querySelector('#start-over').hidden = savedStep === null;
  }
  function saveStep(value) {
    savedStep = value;
    try {
      if (value === null) localStorage.removeItem('reynolds-procedure');
      else localStorage.setItem('reynolds-procedure', value);
    } catch {}
    updateEntry();
  }
  updateEntry();
  function clearStepHighlights() {
    stepHighlights.forEach(clearHighlight);
    stepHighlights.length = 0;
  }
  function valveMeshes(step) {
    return step.focus === 'rear'
      ? rearValves
      : ['B1', 'B3'].includes(step.id)
        ? frontValve
        : [...frontValve, ...rearValves];
  }
  function stepMeshes() {
    const step = procedure[procedureState.index];
    if (step.focus === 'rear') return rearValves;
    if (step.focus === 'front') {
      const meshes = [
        ...frontValve,
        partGroups['Flow Visualization Pipe Section']
      ];
      if (step.id === 'B3') meshes.push(partGroups['Dye Injection Site']);
      return meshes;
    }
    if (step.focus === 'dye') return [partGroups['Dye Injection Site']];
    if (step.focus === 'meter') return [partGroups['Flow Meter']];
    if (step.focus === 'pump') {
      const meshes = [];
      partGroups['Lower Water Tank & Water Pump'].traverse((o) => {
        if (
          o.isMesh &&
          !o.userData.isHighlight &&
          [
            'Pump motor', 'Motor cooling fin', 'Pump volute',
            'Motor terminal housing', 'Bolted pump foot', 'Top discharge fitting',
            'Straight green discharge hose', 'Short green reservoir suction hose',
            'Hose reinforcement', 'Hose clamp'
          ].includes(o.name)
        )
          meshes.push(o);
      });
      return meshes;
    }
    return [model];
  }
  function frameStep(instant = false) {
    if (!procedureState) return;
    if (
      procedureState.complete ||
      procedure[procedureState.index].focus === 'overview'
    ) {
      controls.minDistance = DEFAULT_MIN_DISTANCE;
      moveCamera(homeView(panelHeight()), instant);
    } else
      frameMeshes(
        stepMeshes(),
        procedure[procedureState.index].focus === 'rear'
          ? REAR_VIEW_DIRECTION
          : null,
        instant
      );
  }
  function phaseStripHtml(step, complete = false) {
    const segments = ['A', 'B', 'C'].map((phase, i) => {
      const past = complete || phase < step.phase;
      const state = past ? 'past' : phase === step.phase ? 'current' : '';
      return `<div class="${state}"><span></span>` +
        `${phase} · ${['Setup', 'Operation', 'Cleanup'][i]}` +
        `${past ? ' ✓' : ''}</div>`;
    });
    return `<div class="phase-strip">${segments.join('')}</div>`;
  }
  function metaRowHtml(index) {
    return `<div class="meta">` +
      `<button id="step-list">Step ${index + 1} of 11 ⌄</button>` +
      `<button id="step-exit" aria-label="Exit procedure">×</button></div>`;
  }
  function chipsHtml(step) {
    const chips = step.parts.map((part, i) => {
      const suffix = part === 'Control Valve' && step.focus === 'rear'
        ? ' (ball valves)' : '';
      return `<button data-part="${i}">${part}${suffix}</button>`;
    });
    return `<div class="chips">${chips.join('')}</div>`;
  }
  function stepBodyHtml(step) {
    const empty = !step.parts.length
      ? '<p class="muted">No part to highlight. The whole apparatus is shown.</p>'
      : '';
    const note = step.id === 'B4' && SHOW_REYNOLDS_NOTE
      ? '<details><summary>How to calculate N<sub>RE</sub></summary>' +
        '<p>N<sub>RE</sub> = ρvD/μ = 4Q/(πDν)</p>' +
        '<p>Laminar below about 2,000 · transitional about 2,000 to 4,000 · ' +
        'turbulent above about 4,000.</p>' +
        '<small>General reference, not from the PDF.</small></details>'
      : '';
    return '<div class="step-body">' +
      `<h2 aria-live="polite">${step.id} · ${step.title}</h2>` +
      `<p aria-live="polite">${step.text}</p>` + chipsHtml(step) + empty +
      '<div id="inline-part" hidden></div>' + note + '</div>';
  }
  function controlsHtml(index) {
    return '<div class="step-controls">' +
      `<button id="step-back" ${index === 0 ? 'disabled' : ''}>‹ Back</button>` +
      `<button id="step-next">${index === 10 ? 'Finish' : 'Next ›'}</button></div>`;
  }
  function completionHtml() {
    return '<div class="completion-icon">✓</div><h2>Procedure complete</h2>' +
      "<p>You've walked through all 11 steps of the Reynolds Apparatus procedure.</p>" +
      phaseStripHtml(procedure[10], true) + '<div class="step-controls">' +
      '<button id="restart-procedure">Restart</button>' +
      '<button id="done-procedure">Done</button></div>';
  }
  function rowHtml(step) {
    const current = step.number - 1 === procedureState.index;
    const status = current ? 'Current' : visited.has(step.number - 1) ? '✓' : '';
    return `<button data-step="${step.number - 1}" class="${current ? 'current' : ''}" ` +
      `${current ? 'aria-current="step"' : ''}>` +
      `<b>${step.id}</b><span>${step.title}</span><small>${status}</small></button>`;
  }
  function startProcedure(restart = false) {
    clearSelection();
    entry.hidden = true;
    procedureState = {index: 0, complete: false};
    goToStep(restart ? 0 : (savedStep ?? 0));
    panel.querySelector('#step-next').focus({preventScroll: true});
  }
  function goToStep(index, chosen = false) {
    if (!procedureState || index < 0 || index >= 11) return;
    if (procedureState.rendered && !procedureState.complete)
      visited.add(procedureState.index);
    procedureState = {index, complete: false, rendered: true};
    procedureFocus = null;
    saveStep(index === 0 && !chosen ? null : index);
    closeSheet(false);
    hideToast();
    clearStepHighlights();
    clearHighlight(hoverHighlight);
    clearHighlight(selectionHighlight);
    const step = procedure[index];
    panel.hidden = false;
    panel.innerHTML = phaseStripHtml(step) +
      `<progress max="11" value="${index + 1}" aria-label="Procedure progress"></progress>` +
      metaRowHtml(index) + stepBodyHtml(step) + controlsHtml(index);
    panel.querySelector('#step-exit').onclick = endProcedure;
    panel.querySelector('#step-list').onclick = openSheet;
    panel.querySelector('#step-back').onclick = prevStep;
    panel.querySelector('#step-next').onclick = nextStep;
    panel
      .querySelectorAll('[data-part]')
      .forEach(
        (button) =>
          (button.onclick = () => showStepPart(step.parts[+button.dataset.part]))
      );
    for (const part of step.parts) {
      const list = [];
      highlightPart(
        part === 'Control Valve' ? valveMeshes(step) : part,
        list,
        !LARGE_PARTS.includes(part)
      );
      stepHighlights.push(list);
    }
    scheduleProcedureFrame('step');
  }
  function showStepPart(part, mesh) {
    const row = panel.querySelector('#inline-part');
    row.hidden = false;
    row.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = part + ': ';
    row.append(label, partInfo[part]);
    const back = document.createElement('button');
    back.className = 'text-link';
    back.textContent = 'Back to step';
    back.onclick = () => {
      row.hidden = true;
      procedureFocus = null;
      scheduleProcedureFrame('back');
    };
    row.append(back);
    const meshes =
      part === 'Control Valve'
        ? (valveOf.get(mesh) ?? valveMeshes(procedure[procedureState.index]))
        : [partGroups[part]];
    procedureFocus = {part, meshes};
    scheduleProcedureFrame('part');
  }
  function procedureTap(hit) {
    if (procedureState.complete) return;
    if (procedure[procedureState.index].parts.includes(hit.part)) {
      showStepPart(hit.part, hit.mesh);
      return;
    }
    hideToast();
    toast.hidden = false;
    toast.replaceChildren();
    const text = document.createElement('span');
    text.textContent = hit.part + ': ' + partInfo[hit.part].slice(0, 95) + '…';
    const open = document.createElement('button');
    open.textContent = 'Open';
    open.onclick = () => {
      endProcedure();
      selectPart(hit.part, hit.mesh);
    };
    toast.append(text, open);
    toast.style.bottom = `${panelHeight() + 14}px`;
    toastTimer = setTimeout(hideToast, 5000);
  }
  function prevStep() {
    if (procedureState && !procedureState.complete)
      goToStep(procedureState.index - 1);
  }
  function nextStep() {
    if (!procedureState || procedureState.complete) return;
    if (procedureState.index < 10) {
      goToStep(procedureState.index + 1);
      return;
    }
    visited.add(10);
    procedureState.complete = true;
    procedureFocus = null;
    saveStep(null);
    clearStepHighlights();
    hideToast();
    panel.innerHTML = completionHtml();
    panel.querySelector('#restart-procedure').onclick = () => {
      visited.clear();
      saveStep(null);
      startProcedure(true);
    };
    panel.querySelector('#done-procedure').onclick = endProcedure;
    scheduleProcedureFrame('step');
    panel.querySelector('#done-procedure').focus();
  }
  function endProcedure() {
    closeSheet(false);
    procedureState = null;
    clearStepHighlights();
    clearHighlight(hoverHighlight);
    panel.hidden = true;
    hideToast();
    entry.hidden = false;
    controls.minDistance = DEFAULT_MIN_DISTANCE;
    moveCamera(homeView());
    document.querySelector('#procedure-start').focus({preventScroll: true});
  }
  function openSheet() {
    sheetReturn = document.activeElement;
    backdrop.hidden = false;
    document.querySelector('#visited-count').textContent =
      `${visited.size} of 11 steps visited`;
    const rows = document.querySelector('#step-rows');
    rows.innerHTML = ['A', 'B', 'C'].map((phase) => {
      const rows = procedure.filter((step) => step.phase === phase).map(rowHtml);
      return `<h3>${phase} · ${phases[phase]}</h3>${rows.join('')}`;
    }).join('');
    rows.querySelectorAll('button').forEach(
      (button) =>
        (button.onclick = () => {
          goToStep(+button.dataset.step, true);
          panel.querySelector('#step-next').focus();
        })
    );
    document.querySelector('#sheet-close').focus();
    renderer.domElement.inert = true;
    panel.inert = true;
  }
  function closeSheet(restore = true) {
    backdrop.hidden = true;
    renderer.domElement.inert = false;
    panel.inert = false;
    if (restore) sheetReturn?.focus();
  }
  document.querySelector('#sheet-close').onclick = () => closeSheet();
  document.querySelector('#sheet-handle').onclick = () => closeSheet();
  backdrop.onclick = (event) => {
    if (event.target === backdrop) closeSheet();
  };
  let dragY = 0;
  document.querySelector('#sheet-handle').onpointerdown = (event) => {
    dragY = event.clientY;
    event.target.setPointerCapture(event.pointerId);
  };
  document.querySelector('#sheet-handle').onpointerup = (event) => {
    if (event.clientY - dragY > 35) closeSheet();
  };
  document.querySelector('#procedure-start').onclick = () => startProcedure();
  document.querySelector('#part-start').onclick = () => startProcedure();
  document.querySelector('#start-over').onclick = () => {
    visited.clear();
    saveStep(null);
    startProcedure(true);
  };
  document.addEventListener('keydown', (event) => {
    if (!procedureState || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (
      target instanceof Element &&
      (target.closest('input,textarea') || target.isContentEditable)
    )
      return;
    if (!backdrop.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSheet();
      }
      if (event.key === 'Tab') {
        const buttons = [...backdrop.querySelectorAll('button')],
          first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      endProcedure();
    } else if (event.key === 'ArrowRight' && !procedureState.complete) {
      event.preventDefault();
      nextStep();
    } else if (
      event.key === 'ArrowLeft' &&
      !procedureState.complete &&
      procedureState.index > 0
    ) {
      event.preventDefault();
      prevStep();
    } else if (event.key.toLowerCase() === 'l' && !procedureState.complete) {
      event.preventDefault();
      openSheet();
    }
  });
  new ResizeObserver(() => scheduleProcedureFrame('panel')).observe(panel);
  const gesturePointers = new Map();
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (procedureState && event.isTrusted)
      gesturePointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    const start = gesturePointers.get(event.pointerId);
    if (procedureState && orbiting && event.isTrusted && start &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) >= TAP_MOVE_THRESHOLD)
      userMoved = true;
  });
  for (const type of ['pointerup', 'pointercancel']) {
    renderer.domElement.addEventListener(type, (event) => {
      gesturePointers.delete(event.pointerId);
    });
  }
  renderer.domElement.addEventListener('wheel', (event) => {
    if (procedureState && controls.enabled && event.isTrusted && event.deltaY !== 0)
      userMoved = true;
  }, {passive: true});
  controls.addEventListener('start', () => {
    orbiting = true;
    if (reframeRequest) {
      cancelAnimationFrame(reframeRequest);
      reframeRequest = 0;
    }
  });
  controls.addEventListener('end', () => {
    orbiting = false;
    if (reframePending) scheduleProcedureFrame(reframePending);
  });
  function scheduleProcedureFrame(reason) {
    if (!procedureState) return;
    if (reason !== 'panel') userMoved = false;
    // An explicit focus change takes priority over a panel resize in the same frame.
    if (!reframePending || reason !== 'panel') reframePending = reason;
    if (orbiting || reframeRequest) return;
    reframeRequest = requestAnimationFrame(() => {
      reframeRequest = 0;
      if (!procedureState || orbiting) return;
      const reason = reframePending;
      reframePending = null;
      if (reason === 'panel' && userMoved) {
        panelOffset = panelHeight();
        applyProjection();
      } else if (procedureFocus) {
        const {part, meshes} = procedureFocus;
        if (LARGE_PARTS.includes(part)) {
          controls.minDistance = DEFAULT_MIN_DISTANCE;
          moveCamera(homeView(panelHeight()));
        } else
          frameMeshes(meshes, meshes === rearValves ? REAR_VIEW_DIRECTION : null);
      } else frameStep();
      if (!toast.hidden) toast.style.bottom = `${panelHeight() + 14}px`;
    });
  }
  function hideToast() {
    clearTimeout(toastTimer);
    toastTimer = null;
    toast.hidden = true;
  }

  // Development-only hook for the automated interaction check; stripped from production builds.
  if(import.meta.env.DEV)window.__viewer={
    camera,controls,model,partGroups,valveOf,
    pick:(clientX,clientY)=>partAtPointer({clientX,clientY})?.part??null,
    pickMesh:(clientX,clientY)=>partAtPointer({clientX,clientY})?.mesh??null,
    isMoving:()=>!!move||!!reframeRequest,
    focusTarget:()=>controls.target.clone(),
    procedure:()=>procedureState?{
      ...procedureState,visited:[...visited],
      highlightedParts:procedureState.complete?[]:procedure[procedureState.index].parts
    }:null,
    stepMeshes,startProcedure,goToStep
  };
  // ---- end PDF part selection ----
  let last=performance.now();
  renderer.setAnimationLoop(now=>{const delta=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;updateMove(delta);pulseHighlight(now);if(controls.enabled)controls.update(delta);renderer.render(scene,camera);});
  loading.hidden=true;loading.style.display='none';
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.textContent='The 3D view was interrupted. Refresh to reload.';loading.style.display='grid';});
} catch(error) {
  console.error(error);loading.textContent='The 3D view could not start. Please use a browser with WebGL enabled.';
}
