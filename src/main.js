import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createApparatus } from './apparatus.js';
import './style.css';

const viewport=document.querySelector('#viewport');
const loading=document.querySelector('#loading');
try {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#f3f4f1');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
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
  controls.target.set(0,4.45,0);
  const model=createApparatus();scene.add(model);
  scene.add(new THREE.HemisphereLight('#ffffff','#adb4a2',1.4));
  const key=new THREE.DirectionalLight('#fff8ec',2.3);key.position.set(-5,13,7);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=11;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=30;key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight('#e7eeff',2.2);rim.position.set(4,8,-5);scene.add(rim);
  const fill=new THREE.DirectionalLight('#ffffff',1.2);fill.position.set(2,4,8);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#53614f',opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.007;floor.receiveShadow=true;scene.add(floor);
  // Soft contact shadow anchors the assembly even under diffuse studio light.
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(50,66,45,0.22)');gradient.addColorStop(1,'rgba(50,66,45,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(5,4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.002;scene.add(contact);
  let view='perspective';
  function fitDistance(){const aspect=viewport.clientWidth/viewport.clientHeight;return Math.max(21,4.7/(Math.tan(THREE.MathUtils.degToRad(17))*aspect));}
  function reset(front=false){
    controls.target.set(0,4.45,0);
    const d=fitDistance();camera.position.set(front?0:d*.24,front?4.45:6.1,front?d:d*.975);
    view=front?'front':'perspective';document.querySelector('#view-label').textContent=front?'FRONT VIEW':'PERSPECTIVE VIEW';controls.update();
  }
  function resize(){renderer.setSize(viewport.clientWidth,viewport.clientHeight);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();}
  resize();reset();
  new ResizeObserver(()=>{resize();}).observe(viewport);
  document.querySelector('#reset').addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#rotate').setAttribute('aria-pressed','false');reset();});
  document.querySelector('#front').addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#rotate').setAttribute('aria-pressed','false');reset(true);});
  document.querySelector('#rotate').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));if(controls.autoRotate)document.querySelector('#view-label').textContent='AUTO-ROTATING';else document.querySelector('#view-label').textContent='PERSPECTIVE VIEW';});
  function zoom(factor){const direction=camera.position.clone().sub(controls.target);const distance=THREE.MathUtils.clamp(direction.length()*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(direction.setLength(distance));controls.update();}
  document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.8));
  document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1.25));
  controls.addEventListener('start',()=>{if(view==='front'){view='perspective';document.querySelector('#view-label').textContent='PERSPECTIVE VIEW';}});
  let last=performance.now();
  renderer.setAnimationLoop(now=>{const delta=Math.min((now-last)/1000,.05);last=now;controls.update(delta);renderer.render(scene,camera);});
  loading.hidden=true;loading.style.display='none';
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.textContent='The 3D view was interrupted. Refresh to reload.';loading.style.display='grid';});
} catch(error) {
  console.error(error);loading.textContent='The 3D view could not start. Please use a browser with WebGL enabled.';
}
const dialog=document.querySelector('#reference-dialog');
document.querySelector('#reference-open').addEventListener('click',()=>dialog.showModal());
document.querySelector('#reference-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
