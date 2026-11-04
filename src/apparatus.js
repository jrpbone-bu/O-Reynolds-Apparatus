import * as THREE from 'three';

// Relative dimensions follow Revision K; photographs resolve depth and construction.
export function createApparatus() {
  const model = new THREE.Group();
  model.name = 'Top Glass Tank — approved experimental assembly';
  const standard=(color,metalness=0,roughness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const m={black:standard('#20262b',.55),blue:standard('#0874e5',.15,.25),steel:standard('#bcc9cd',.75),white:standard('#efece0'),brass:standard('#bd8d35',.6),red:standard('#d33025'),orange:standard('#f16b16'),green:standard('#127845'),bead:standard('#e2e7df'),screen:standard('#0962b4'),edge:standard('#40acb9',.2)};
  const platformWhite=standard('#e5c99e',0,.4);
  m.glass=new THREE.MeshBasicMaterial({color:'#8cdee8',transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false});
  m.tube=new THREE.MeshStandardMaterial({color:'#dceef0',transparent:true,opacity:.65,roughness:.22});
  m.water=new THREE.MeshBasicMaterial({color:'#58c7de',transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
  const group=name=>{const g=new THREE.Group();g.name=name;model.add(g);return g;};
  function mesh(g,n,geo,mat,p){const o=new THREE.Mesh(geo,mat);o.name=n;o.position.set(...p);o.castShadow=!mat.transparent;o.receiveShadow=!mat.transparent;g.add(o);return o;}
  const box=(g,n,w,h,d,mat,x,y,z=0)=>mesh(g,n,new THREE.BoxGeometry(w,h,d),mat,[x,y,z]);
  function pipe(g,n,a,b,r=.09,mat=m.blue){const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),delta=w.clone().sub(v);const o=mesh(g,n,new THREE.CylinderGeometry(r,r,delta.length(),24),mat,v.add(w).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
  function joint(g,x,y,z,r=.12){mesh(g,'Pipe elbow / coupling',new THREE.SphereGeometry(r,20,16),m.blue,[x,y,z]);}
  function panelEdges(g,w,h,d,x,y,z=0){const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),new THREE.LineBasicMaterial({color:'#2996a7',transparent:true,opacity:.7}));e.position.set(x,y,z);g.add(e);}
  function tank(g,n,x,y,w,h,d,closed=false,fillToRim=false){box(g,n+' walls',w,h,d,m.glass,x,y);panelEdges(g,w,h,d,x,y);box(g,n+' floor',w,.035,d,m.glass,x,y-h/2);if(closed)box(g,n+' fixed closed cover',w,.055,d,platformWhite,x,y+h/2);const waterHeight=fillToRim?h-.06:h*.72;box(g,n+' water',w-.05,waterHeight,d-.05,m.water,x,y-h/2+waterHeight/2);if(!fillToRim)panelEdges(g,w-.05,.006,d-.05,x,y+h*.24);}
  const frame=group('11 — continuous structural frame');
  const L=-3.15,T=-1.15,R=3.15,depth=1.65,rail=.16,base=.14,deck=2.0;
  // Five-inch visual rise on the provisional model scale; physical dimensions remain unmeasured.
  const upperFrameRise=.65;
  const dischargeBottom=.80, dischargeTransition=(dischargeBottom+deck)/2;
  // Four depth-separated posts carry the chamber; the center pump bay stays open.
  for(const z of [-depth/2,depth/2]){
    box(frame,'Continuous base rail',6.46,rail,rail,m.black,0,base,z);
    box(frame,'Continuous tank top rail',6.46,rail,rail,m.black,0,deck,z);
    for(const x of [L,T])box(frame,'Lower tower upright',rail,4.72,rail,m.black,x,2.44,z);
    box(frame,'Reservoir end upright',rail,deck,rail,m.black,R,deck/2+.08,z);
  }
  for(const x of [L,T,R])for(const y of [base,deck])box(frame,'Base depth tie',rail,rail,depth,m.black,x,y);
  // Artist's mark: "jrpbone" as a black silhouette on the underside of the front base rail, only seen from below.
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');
    g.fillStyle='#fff';g.font='800 190px Arial,Helvetica,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('jrpbone',512,132);
    const t=new THREE.CanvasTexture(c);t.anisotropy=8;
    // Same colour and finish as the rail, so from a normal distance it disappears into the black base.
    const mat=new THREE.MeshStandardMaterial({color:'#20262b',metalness:.55,roughness:.4,alphaMap:t,alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mark=mesh(frame,'Artist mark',new THREE.PlaneGeometry(.56,.14),mat,[1.9,base-rail/2-.002,depth/2]);
    mark.rotation.x=Math.PI/2;mark.castShadow=false;mark.receiveShadow=false;mark.raycast=()=>{};
    // Zoomed in close, it darkens to a matte silhouette: fully shown within 2.5 units, gone beyond 4.5.
    const railColor=new THREE.Color('#20262b'),inkColor=new THREE.Color('#0a0c0d'),markPos=new THREE.Vector3();
    mark.onBeforeRender=(renderer,scene,camera)=>{
      mark.getWorldPosition(markPos);
      const k=1-THREE.MathUtils.smoothstep(camera.position.distanceTo(markPos),2.5,4.5);
      mat.color.lerpColors(railColor,inkColor,k);mat.metalness=.55*(1-k);mat.roughness=.4+.55*k;
    };
  }
  // Guardrails share the existing tower footprint; only the chamber and its seat are inset.
  const trayWidth=T-L+rail, trayDepth=depth+rail, trayCenter=(L+T)/2;
  const trayLeft=trayCenter-trayWidth/2+rail/2, trayRight=trayCenter+trayWidth/2-rail/2;
  const trayFront=trayDepth/2-rail/2;
  for(const y of [4.17,4.72]){
    for(const z of [-trayFront,trayFront])box(frame,'Lower tray perimeter guardrail',trayWidth,rail,rail,m.black,trayCenter,y,z);
    for(const x of [trayLeft,trayRight])box(frame,'Lower tray side guardrail',rail,rail,trayDepth,m.black,x,y);
  }
  for(const x of [trayLeft,trayRight])for(const z of [-trayFront,trayFront]){
    const bolt=mesh(frame,'Tray guardrail bolt',new THREE.CylinderGeometry(.044,.044,.035,6),m.steel,[x,4.72,z+(z>0?.095:-.095)]);
    bolt.rotation.x=Math.PI/2;
  }

  box(frame,'Collection tank support deck',1.85,.07,1.5,m.black,-2.15,.25);
  box(frame,'Pump support deck',1.75,.07,1.5,m.black,-.18,.25);
  box(frame,'Reservoir support deck',2.47,.07,1.5,m.black,1.88,.25);
  for(const x of [L,T,R])for(const y of [base,deck]){const b=mesh(frame,'Front frame bolt',new THREE.CylinderGeometry(.044,.044,.035,6),m.steel,[x,y,.918]);b.rotation.x=Math.PI/2;}
  const collection=group('08 — fixed enclosed collection tank');
  tank(collection,'08 collection tank',-2.15,1.145,1.82,1.73,1.46,true,true);
  pipe(collection,'Left-facing drain',[-3.05,.56,.25],[-3.67,.56,.25]);
  pipe(collection,'Drain top spindle',[-3.46,.56,.25],[-3.46,.78,.25],.043,m.brass);
  box(collection,'Drain top butterfly',.30,.055,.11,m.orange,-3.46,.79,.25);
  const reservoir=group('10 — open reservoir');tank(reservoir,'10 reservoir',1.91,1.145,2.30,1.73,1.46,false,true);
  const artifact=group('Top Glass Tank — complete inset assembly');
  const cx=-2.15, width=1.74, tankDepth=1.39, post=.105;
  const platformTop=4.33, housingTop=4.69, dividerY=7.95;
  const holderBase=8.0+upperFrameRise+.05+.045, topPlateBottom=holderBase-.16;
  const portYs=[7.42,6.85,6.10,5.49];
  artifact.userData={clearance:.05,width,depth:tankDepth,platformTop,housingTop,dividerY};
  const chamber=new THREE.Group();chamber.name='04 — enclosed glass chamber';artifact.add(chamber);
  const cap=new THREE.Group();cap.name='02 + 03 — detachable holder, top support and divider';cap.userData.detachable=true;artifact.add(cap);
  const grayGlass=new THREE.MeshBasicMaterial({color:'#c5d5d6',transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});

  // Real holes avoid coincident caps and preserve open bores through every horizontal plate.
  function plateWithBore(g,name,w,d,thickness,y,material,r=.10){
    const shape=new THREE.Shape();shape.moveTo(-w/2,-d/2);shape.lineTo(w/2,-d/2);shape.lineTo(w/2,d/2);shape.lineTo(-w/2,d/2);shape.closePath();
    const hole=new THREE.Path();hole.absarc(0,0,r,0,Math.PI*2,true);shape.holes.push(hole);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:40});geo.rotateX(-Math.PI/2);
    return mesh(g,name,geo,material,[cx,y,0]);
  }
  plateWithBore(chamber,'White lower tray platform',T-L-rail,depth-rail,.08,4.25,platformWhite);
  plateWithBore(chamber,'Housing underside with open outlet',width,tankDepth,.045,platformTop,m.black);
  for(const x of [cx-width/2+.025,cx+width/2-.025])box(chamber,'Closed black housing side',.05,housingTop-platformTop,tankDepth,m.black,x,(platformTop+housingTop)/2);
  for(const z of [-tankDepth/2+.025,tankDepth/2-.025])box(chamber,'Closed black housing end',width-.10,housingTop-platformTop,.05,m.black,cx,(platformTop+housingTop)/2,z);
  const upperPillars=[];
  for(const x of [cx-width/2+post/2,cx+width/2-post/2])for(const z of [-tankDepth/2+post/2,tankDepth/2-post/2]){
    const pillar=box(artifact,'Flush corner pillar',post,topPlateBottom-housingTop,post,m.black,x,(housingTop+topPlateBottom)/2,z);
    const upper=pillar.clone();upper.name='Upper support pillar';
    const upperPillarBottom=dividerY+.035+.005; // Clear the entire glass thickness plus a small visible gap.
    upper.geometry=new THREE.BoxGeometry(post,topPlateBottom-upperPillarBottom,post);upper.geometry.translate(0,(upperPillarBottom-housingTop)/2,0);
    pillar.geometry.dispose();pillar.geometry=new THREE.BoxGeometry(post,dividerY-housingTop,post);pillar.geometry.translate(0,(dividerY-topPlateBottom)/2,0);
    artifact.add(upper);upperPillars.push(upper);
  }
  // Four clear wall panels; the right wall has four actual coaxial pipe penetrations.
  const glassBottom=housingTop, glassHeight=dividerY-glassBottom, glassCenter=(dividerY+glassBottom)/2;
  const left=box(chamber,'Left glass wall',.012,glassHeight,tankDepth-2*post,grayGlass,cx-width/2+.012,glassCenter);
  for(const z of [-tankDepth/2+.012,tankDepth/2-.012])box(chamber,'Front / rear glass wall',width-2*post,glassHeight,.012,grayGlass,cx,glassCenter,z);
  const side=new THREE.Shape();const halfDepth=(tankDepth-2*post)/2;
  side.moveTo(-halfDepth,glassBottom);side.lineTo(halfDepth,glassBottom);side.lineTo(halfDepth,dividerY);side.lineTo(-halfDepth,dividerY);side.closePath();
  for(const y of portYs){const hole=new THREE.Path();hole.absarc(0,y,.142,0,Math.PI*2,true);side.holes.push(hole);}
  const wallGeo=new THREE.ShapeGeometry(side,40);wallGeo.rotateY(Math.PI/2);
  mesh(chamber,'Right glass wall with four port openings',wallGeo,grayGlass,[cx+width/2-.012,0,0]);
  plateWithBore(cap,'Horizontal glass divider',width,tankDepth,.035,dividerY,m.glass,.033);
  panelEdges(cap,width,.035,tankDepth,cx,dividerY+.0175);
  plateWithBore(cap,'Black top support',width,tankDepth,.13,topPlateBottom,m.black,.035);
  plateWithBore(cap,'White top holder base',width,tankDepth,.03,holderBase-.03,platformWhite,.035);
  for(const x of [cx-.66,cx+.66])box(cap,'02 upper glass holder side wall',.012,.65,1.2,m.glass,x,holderBase+.325);
  for(const z of [-.60,.60])box(cap,'02 upper glass holder end wall',1.308,.65,.012,m.glass,cx,holderBase+.325,z);
  panelEdges(cap,1.32,.65,1.2,cx,holderBase+.325);
  const sleeveBottom=4.12, sleeveTop=housingTop-.08, outer=.095, inner=.065;
  const thinPipe=pipe(artifact,'Thin central pipe through holder and divider',[cx,sleeveTop-.02,0],[cx,holderBase+.04,0],.025,m.tube);
  // Open white sleeve: outer/inner surfaces and annular rims, no solid end caps.
  // Recess the open sleeve beneath the solid cover, inside the hollow housing.
  mesh(chamber,'White hollow needle sleeve outer',new THREE.CylinderGeometry(outer,outer,sleeveTop-sleeveBottom,40,1,true),m.white,[cx,(sleeveTop+sleeveBottom)/2,0]);
  const innerMat=m.white.clone();innerMat.side=THREE.BackSide;
  mesh(chamber,'White hollow needle sleeve inner',new THREE.CylinderGeometry(inner,inner,sleeveTop-sleeveBottom,40,1,true),innerMat,[cx,(sleeveTop+sleeveBottom)/2,0]);
  for(const y of [sleeveBottom,sleeveTop]){const rim=mesh(chamber,'Open annular sleeve rim',new THREE.RingGeometry(inner,outer,40),m.white,[cx,y,0]);rim.rotation.x=y===sleeveTop?-Math.PI/2:Math.PI/2;}
  const needle=pipe(chamber,'Concealed downward needle',[cx,sleeveTop-.011,0],[cx,sleeveTop-.22,0],.008,m.steel);needle.userData.hiddenInsideCylinder=true;
  const plumbing=group('05 + 06 — blue header and rear valve controls');
  const headerX=1.35, portZ=0;
  portYs.forEach((y,i)=>{
    const end=i===3?-.25:headerX;
    pipe(plumbing,'P'+(i+1)+' coaxial chamber-to-exterior pipe',[-1.84,y,portZ],[end,y,portZ],.105);
    pipe(plumbing,'P'+(i+1)+' wall coupling',[-1.29,y,0],[-1.04,y,0],.137);
    // An open dark bore faces left, coaxial with the complete outside pipe.
    const bore=mesh(plumbing,'Left-facing internal open bore',new THREE.CircleGeometry(.076,24),m.black,[-1.845,y,0]);bore.rotation.y=-Math.PI/2;
    if(i===1||i===2){
      pipe(plumbing,'Valve body',[-.27,y,0],[.16,y,0],.15);
      pipe(plumbing,'Rear-facing valve spindle',[-.055,y,0],[-.055,y,-.27],.04,m.brass);
      box(plumbing,'Rear upright butterfly control',.09,.45,.055,m.orange,-.055,y,-.30);
    }
    joint(plumbing,end,y,0);
  });
  pipe(plumbing,'Common reservoir header',[headerX,1.22,0],[headerX,7.42,0],.115);
  for(const y of portYs.slice(0,3))joint(plumbing,headerX,y,0,.14);
  pipe(plumbing,'Independent lowest unvalved port delivery',[-.25,dischargeTransition,0],[-.25,5.49,0],.105);
  const pump=group('09 — base-mounted pump, reservoir-only intake');
  function hose(n,a,b){pipe(pump,n,a,b,.105,m.green);const aV=new THREE.Vector3(...a),bV=new THREE.Vector3(...b),axis=bV.clone().sub(aV).normalize();const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);for(let i=0;i<18;i++){const p=aV.clone().lerp(bV,i/17);const ring=mesh(pump,'Hose reinforcement',new THREE.TorusGeometry(.107,.006,4,20),m.steel,p.toArray());ring.rotation.x=Math.PI/2;ring.quaternion.premultiply(q);}for(const p of [a,b]){const c=mesh(pump,'Hose clamp',new THREE.CylinderGeometry(.126,.126,.065,24),m.steel,p);c.quaternion.copy(q);}}
  hose('Straight green discharge hose',[-.25,dischargeBottom,0],[-.25,dischargeTransition,0]);
  hose('Short green reservoir suction hose',[.22,.56,0],[.76,.56,0]);
  pipe(pump,'Pump motor',[-.74,.56,0],[.06,.56,0],.28,m.black);
  for(let i=0;i<11;i++)pipe(pump,'Motor cooling fin',[-.69+i*.055,.56,0],[-.675+i*.055,.56,0],.30,m.black);
  pipe(pump,'Pump volute',[.04,.56,0],[.25,.56,0],.26,m.black);
  box(pump,'Motor terminal housing',.34,.17,.28,m.black,-.32,.85,0);
  for(const z of [-.24,.24])box(pump,'Bolted pump foot',.94,.09,.13,m.black,-.26,.32,z);
  pipe(pump,'Top discharge fitting',[-.25,.67,0],[-.25,.80,0],.125,m.black);
  const meter=group('07 — vertical flow meter and left-facing handwheel');
  pipe(meter,'Visible upper outlet pipe',[-2.15,3.67,0],[-2.15,4.12,0],.09,m.tube);
  for(const y of [3.67,4.12,2.13,2.45])pipe(meter,'Outlet blue union',[-2.15,y-.045,0],[-2.15,y+.045,0],.128);
  box(meter,'Inline digital flow meter',.40,.57,.34,m.white,-2.15,3.35);
  box(meter,'Blue meter display',.25,.35,.025,m.screen,-2.15,3.35,.184);
  box(meter,'LCD',.16,.14,.012,m.black,-2.15,3.38,.202);
  pipe(meter,'Vertical brass handwheel valve',[-2.15,2.55,0],[-2.15,3.06,0],.13,m.brass);
  pipe(meter,'Handwheel spindle facing left',[-2.15,2.78,0],[-2.51,2.78,0],.055,m.brass);
  const wheel=mesh(meter,'Left-facing red handwheel',new THREE.TorusGeometry(.17,.033,10,32),m.red,[-2.53,2.78,0]);wheel.rotation.y=Math.PI/2;
  for(let a=0;a<3;a++){const t=a*Math.PI/3;pipe(meter,'Handwheel spoke',[-2.53,2.78-Math.cos(t)*.16,-Math.sin(t)*.16],[-2.53,2.78+Math.cos(t)*.16,Math.sin(t)*.16],.018,m.red);}
  pipe(meter,'Lower visible pipe to sealed collection cover',[-2.15,1.75,0],[-2.15,2.55,0],.09,m.tube);
  // Component 7 detail only; preserve every existing mesh transform and connection.
  const meterPlastic=standard('#1265b9',.05,.48), galvanized=standard('#9ba2a4',.7,.5);
  const meterFrame=standard('#c7b991',.05,.52);meterFrame.transparent=true;meterFrame.opacity=.92;
  function roundedMeterBox(w,h,d,r){
    const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:4});geometry.center();
    const bounds=new THREE.Box3().setFromBufferAttribute(geometry.attributes.position),size=bounds.getSize(new THREE.Vector3());geometry.scale(w/size.x,h/size.y,d/size.z);return geometry;
  }
  const meterBody=meter.getObjectByName('Inline digital flow meter');meterBody.geometry.dispose();meterBody.geometry=roundedMeterBox(.40,.57,.34,.035);meterBody.material=meterFrame;
  const blueFace=meter.getObjectByName('Blue meter display');blueFace.geometry.dispose();blueFace.geometry=roundedMeterBox(.25,.35,.025,.022);blueFace.material=meterPlastic;
  for(const part of meter.children)if(part.name==='Outlet blue union')part.material=meterPlastic;
  for(const y of [4.15,3.70,2.15,2.47])pipe(meter,'PVC coupling inset lip',[-2.15,y-.006,0],[-2.15,y+.006,0],.125,meterPlastic);
  for(const y of [3.74,3.02]){
    mesh(meter,'Galvanized hex fitting',new THREE.CylinderGeometry(.086,.086,.07,6),galvanized,[-2.15,y,0]);
    pipe(meter,'Galvanized threaded neck',[-2.15,y+.035,0],[-2.15,y+.085,0],.074,galvanized);
    for(let i=0;i<6;i++)pipe(meter,'Fine fitting thread',[-2.15,y+.038+i*.008,0],[-2.15,y+.041+i*.008,0],.081,galvanized);
  }
  for(const y of [3.09,3.61])pipe(meter,'Meter inlet / outlet neck',[-2.15,y-.024,0],[-2.15,y+.024,0],.085,galvanized);
  const lcdMaterial=standard('#b6d0c9',.1,.2);
  if(typeof document!=='undefined'){
    const displayCanvas=document.createElement('canvas');displayCanvas.width=256;displayCanvas.height=224;
    const displayContext=displayCanvas.getContext('2d');displayContext.fillStyle='#202d31';displayContext.fillRect(0,0,256,224);displayContext.fillStyle='#b6d0c9';displayContext.fillRect(9,40,238,175);
    displayContext.textAlign='center';displayContext.fillStyle='#eef2e8';displayContext.font='bold 29px sans-serif';displayContext.fillText('K24',128,30);displayContext.fillStyle='#243a36';displayContext.font='64px monospace';displayContext.fillText('00.0',128,151);
    const displayTexture=new THREE.CanvasTexture(displayCanvas);displayTexture.colorSpace=THREE.SRGBColorSpace;lcdMaterial.map=displayTexture;
  }
  meter.getObjectByName('LCD').material=lcdMaterial;
  const lcdCover=standard('#e4f4f1',.05,.12);lcdCover.transparent=true;lcdCover.opacity=.12;
  box(meter,'Glossy recessed LCD cover',.148,.128,.001,lcdCover,-2.15,3.38,.2075);
  for(const [y,icon] of [[3.24,'reset'],[3.30,'power']]){
    const button=mesh(meter,'K24 '+icon+' button',new THREE.CylinderGeometry(.016,.016,.006,24),meterFrame,[-2.252,y,.200]);button.rotation.x=Math.PI/2;
    const ring=mesh(meter,'Button icon ring',new THREE.TorusGeometry(.009,.0015,4,24),galvanized,[-2.252,y,.204]);
    if(icon==='power')pipe(meter,'Power icon stroke',[-2.252,y+.004,.205],[-2.252,y+.013,.205],.0015,galvanized);
  }
  meter.position.x=-2.15;
  for(const part of meter.children)part.position.x+=2.15;
  const valveFacing=new THREE.Group();meter.add(valveFacing);
  for(const part of [...meter.children])if(['Handwheel spindle facing left','Left-facing red handwheel','Handwheel spoke'].includes(part.name))valveFacing.add(part);
  valveFacing.rotation.y=Math.PI/2;
  // Add the hub and two extra spokes in the wheel's existing local plane.
  pipe(valveFacing,'Red handwheel center hub',[-.406,2.78,0],[-.355,2.78,0],.045,m.red);
  pipe(valveFacing,'Handwheel center bolt',[-.411,2.78,0],[-.406,2.78,0],.022,galvanized);
  for(const t of [Math.PI/6,Math.PI/6+Math.PI])pipe(valveFacing,'Additional handwheel spoke',[-.38,2.78,0],[-.38,2.78+Math.cos(t)*.15,Math.sin(t)*.15],.018,m.red);
  meter.rotation.y=Math.atan2(.24,.975)-Math.PI/2;
  const needleCollar=mesh(chamber,'Needle to thin pipe joint collar',new THREE.LatheGeometry([new THREE.Vector2(.009,-.005),new THREE.Vector2(.028,-.005),new THREE.Vector2(.028,.005),new THREE.Vector2(.009,.005),new THREE.Vector2(.009,-.005)],24),m.tube,[cx,sleeveTop-.02,0]);
  // Regroup every rendered object by the parts named in the Reynolds Apparatus document.
  // attach() keeps each world transform, so the assembly looks exactly as before.
  const PARTS=['Dye Injection Site','Pipe for Dye','Upper Water Tank','Control Valve','Flow Visualization Pipe Section','Flow Meter','Lower Water Tank & Water Pump','Drainage Tank'];
  const OTHER={frame:'Not in PDF: Frame',piping:'Not in PDF: Piping'};
  const dyePipeNames=['Thin central pipe through holder and divider','Needle to thin pipe joint collar','Concealed downward needle','White hollow needle sleeve outer','White hollow needle sleeve inner','Open annular sleeve rim'];
  const valveNames=['Valve body','Rear-facing valve spindle','Rear upright butterfly control','Vertical brass handwheel valve','Handwheel spindle facing left','Left-facing red handwheel','Handwheel spoke','Additional handwheel spoke','Red handwheel center hub','Handwheel center bolt'];
  const meterBodyNames=['Inline digital flow meter','Blue meter display','LCD','Glossy recessed LCD cover','K24 reset button','K24 power button','Button icon ring','Power icon stroke'];
  function partFor(object,source){
    if(source===frame||object.name==='White lower tray platform')return OTHER.frame;
    if(source===collection)return 'Drainage Tank';
    if(source===reservoir||source===pump)return 'Lower Water Tank & Water Pump';
    if(valveNames.includes(object.name))return 'Control Valve';
    if(source===plumbing)return OTHER.piping;
    // The flow meter is the white box and what is mounted on it; its pipe fittings belong to the visualization line.
    if(source===meter)return meterBodyNames.includes(object.name)?'Flow Meter':'Flow Visualization Pipe Section';
    if(dyePipeNames.includes(object.name))return 'Pipe for Dye';
    // The glass divider and its edge lines are the lid of the upper water tank.
    if(object.name==='Horizontal glass divider'||(object.isLineSegments&&Math.abs(object.position.y-(dividerY+.0175))<1e-6))return 'Upper Water Tank';
    // Only the glass vessel on top is the dye injection site; its supporting plates and pillars are frame.
    if(object.parent===cap&&(object.name.startsWith('02 upper glass holder')||object.isLineSegments))return 'Dye Injection Site';
    if(object.parent===cap||object.name==='Upper support pillar')return OTHER.frame;
    return 'Upper Water Tank';
  }
  model.updateMatrixWorld(true);
  const assignments=[];
  for(const source of [...model.children])source.traverse(object=>{if(object.isMesh||object.isLineSegments)assignments.push([object,partFor(object,source)]);});
  const partGroups={};
  for(const name of [...PARTS,...Object.values(OTHER)]){const g=new THREE.Group();g.name=name;if(PARTS.includes(name))g.userData.partId=name;partGroups[name]=g;}
  const previousContainers=[...model.children];
  for(const g of Object.values(partGroups))model.add(g);
  for(const [object,name] of assignments)partGroups[name].attach(object);
  for(const container of previousContainers)container.removeFromParent();
  // Marble bed: glass marbles poured into the black housing at the base of the upper glass tank (04).
  // They fill from the housing floor up to the rim of the black base and no further (bedTop).
  // Marbles roll and settle when the user drags the view or taps the tank.
  {
    const marbles=new THREE.Group();marbles.name='04 — marble bed in upper tank base';model.add(marbles);   // the part regroup above removes 'artifact' from the scene
    const r=.05, wall=.05+.01, floorTop=platformTop+.045;           // housing walls are .05 thick; underside plate is .045 thick
    const bedTop=housingTop+.03;                                     // highest marble top: just peeks over the black rim, like the photo
    const minX=cx-width/2+wall+r, maxX=cx+width/2-wall-r, minZ=-tankDepth/2+wall+r, maxZ=tankDepth/2-wall-r;
    const minY=floorTop+r, maxY=bedTop-r, sleeveClear=.095+r+.012;   // keep clear of the white needle sleeve / thin pipe at the centre
    const cornerClear=post+r;                                        // and of the four black corner pillars
    const allowed=(x,z)=>{const dx=x-cx;if(Math.hypot(dx,z)<sleeveClear)return false;
      const ex=Math.min(Math.abs(x-(cx-width/2)),Math.abs(x-(cx+width/2))),ez=Math.min(Math.abs(z+tankDepth/2),Math.abs(z-tankDepth/2));
      return !(ex<cornerClear&&ez<cornerClear);};
    let seed=11;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
    // Clear glass marbles with green / blue / amber tints, as in the build photo.
    const glass=(c,o)=>new THREE.MeshStandardMaterial({color:c,roughness:.05,metalness:.0,transparent:true,opacity:o});
    const palette=[glass('#e4f2ec',.55),glass('#9fd3ad',.7),glass('#7fb4dd',.7),glass('#c9e6cf',.6),glass('#2f6fc0',.8),glass('#d8b56a',.7)];
    const weights=[.3,.25,.15,.15,.08,.07];
    const pick=()=>{let t=rand();for(let i=0;i<weights.length;i++){if((t-=weights[i])<=0)return i;}return 0;};
    const geo=new THREE.SphereGeometry(r,16,12);
    const pts=[];const step=r*2*.98, rowZ=step*.866, layerY=r*1.63;
    for(let layer=0;;layer++){
      const y=minY+layer*layerY; if(y>maxY+1e-6)break;
      const off=layer%2?step/2:0, top=minY+(layer+1)*layerY>maxY+1e-6;
      for(let zi=0;minZ+zi*rowZ<=maxZ;zi++){const z=minZ+zi*rowZ+(layer%2?rowZ/3:0); if(z>maxZ)continue;
        for(let xi=0;;xi++){const x=minX+xi*step+(zi%2?step/2:0)+off; if(x>maxX)break;
          if(!allowed(x,z))continue;
          if(top&&rand()<.25)continue;                               // top layer has gaps so it looks poured, not stacked
          pts.push({rest:[x+(rand()-.5)*.012,Math.max(minY,y-rand()*.008),z+(rand()-.5)*.012],top});}}
    }
    for(const p of pts){p.rest[0]=THREE.MathUtils.clamp(p.rest[0],minX,maxX);p.rest[2]=THREE.MathUtils.clamp(p.rest[2],minZ,maxZ);if(!allowed(p.rest[0],p.rest[2])){p.rest[0]=cx+(p.rest[0]-cx)*.97;p.rest[2]*=.97;}}
    const meshes=[];const mtx=new THREE.Matrix4(), euler=new THREE.Euler();
    const buckets=palette.map(()=>[]);pts.forEach(p=>buckets[pick()].push(p));
    buckets.forEach((list,i)=>{if(!list.length)return;const inst=new THREE.InstancedMesh(geo,palette[i],list.length);inst.name='Upper tank marbles';
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      list.forEach((p,k)=>{p.off=[0,0,0];p.vel=[0,0,0];p.mobility=(p.top?1:.45)*(.7+rand()*.6);mtx.makeTranslation(...p.rest);inst.setMatrixAt(k,mtx);});
      inst.instanceMatrix.needsUpdate=true;inst.castShadow=false;inst.receiveShadow=true;inst.frustumCulled=false;inst.raycast=()=>{};marbles.add(inst);   // taps pass through to the Upper Water Tank part
      meshes.push({inst,list});});
    let energy=0;const maxOff=r*1.1;
    // stir(strength 0..1, dirX, dirZ, point?) — dir is the roll direction in model space, point is a tap location (model x,z).
    function stir(strength,dirX=0,dirZ=0,point=null){
      for(const {list} of meshes)for(const p of list){
        let s=strength*p.mobility,dx0=dirX,dz0=dirZ;
        if(point){const dx=p.rest[0]-point.x,dz=p.rest[2]-point.z,d=Math.hypot(dx,dz);s*=Math.max(0,1-d/.75);if(d>1e-4){dx0=dx/d;dz0=dz/d;}}
        if(s<=0)continue;
        p.vel[0]+=(dx0*.9+(rand()-.5)*.8)*s*.9; p.vel[2]+=(dz0*.9+(rand()-.5)*.8)*s*.9;
        if(p.top)p.vel[1]+=rand()*s*.35;
      }
      energy=1;
    }
    function update(dt){
      if(energy<=0)return;
      let moving=0;
      for(const {inst,list} of meshes){list.forEach((p,k)=>{
        for(let a=0;a<3;a++){p.vel[a]+=(-p.off[a]*38-p.vel[a]*5.5)*dt;p.off[a]+=p.vel[a]*dt;}
        
        for(const a of [0,2]){if(Math.abs(p.off[a])>maxOff){p.off[a]=Math.sign(p.off[a])*maxOff;p.vel[a]*=-.3;}}
        let x=THREE.MathUtils.clamp(p.rest[0]+p.off[0],minX,maxX), z=THREE.MathUtils.clamp(p.rest[2]+p.off[2],minZ,maxZ);
        const dx=x-cx,d=Math.hypot(dx,z);if(d<sleeveClear){const s=sleeveClear/(d||1e-4);x=cx+dx*s;z*=s;}   // pushed off the sleeve
        if(!allowed(x,z)){x=p.rest[0];z=p.rest[2];p.vel[0]=p.vel[2]=0;}
        p.off[0]=x-p.rest[0];p.off[2]=z-p.rest[2];
        let y=p.rest[1]+p.off[1];if(y<p.rest[1]){y=p.rest[1];p.off[1]=0;p.vel[1]=Math.max(0,p.vel[1]);}
        if(y>maxY){y=maxY;p.off[1]=y-p.rest[1];p.vel[1]=Math.min(0,p.vel[1]);}                                          // hard cap: never above the bed line
        euler.set(p.off[2]/r,0,-p.off[0]/r);mtx.makeRotationFromEuler(euler);mtx.setPosition(x,y,z);inst.setMatrixAt(k,mtx);
        moving=Math.max(moving,Math.abs(p.vel[0])+Math.abs(p.vel[1])+Math.abs(p.vel[2])+Math.abs(p.off[0])+Math.abs(p.off[2]));
      });inst.instanceMatrix.needsUpdate=true;}
      if(moving<.0015){energy=0;for(const {inst,list} of meshes){list.forEach((p,k)=>{p.off.fill(0);p.vel.fill(0);mtx.makeTranslation(...p.rest);inst.setMatrixAt(k,mtx);});inst.instanceMatrix.needsUpdate=true;}}                                      // fully settled: stop updating
    }
    marbles.userData={floorTop,bedTop,count:pts.length,stir,update,bounds:{minX:minX-r,maxX:maxX+r,minZ:minZ-r,maxZ:maxZ+r,minY:floorTop,maxY:bedTop}};
    model.userData.marbles=marbles.userData;
  }

  model.userData={...model.userData,revision:'Top Glass Tank',units:'relative; dimensions unmeasured',reference:'Revision K plus construction photographs'};
  return model;
}


