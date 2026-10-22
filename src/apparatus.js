import * as THREE from 'three';

// Relative dimensions follow Revision K; photographs resolve depth and construction.
export function createApparatus() {
  const model = new THREE.Group();
  model.name = 'Top Glass Tank — approved experimental assembly';
  const standard=(color,metalness=0,roughness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const m={black:standard('#20262b',.55),blue:standard('#0874e5',.15,.25),steel:standard('#bcc9cd',.75),white:standard('#efece0'),brass:standard('#bd8d35',.6),red:standard('#d33025'),orange:standard('#f16b16'),green:standard('#127845'),bead:standard('#e2e7df'),screen:standard('#0962b4'),edge:standard('#40acb9',.2)};
  m.glass=new THREE.MeshBasicMaterial({color:'#8cdee8',transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false});
  m.tube=new THREE.MeshStandardMaterial({color:'#dceef0',transparent:true,opacity:.65,roughness:.22});
  m.water=new THREE.MeshBasicMaterial({color:'#58c7de',transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
  const group=name=>{const g=new THREE.Group();g.name=name;model.add(g);return g;};
  function mesh(g,n,geo,mat,p){const o=new THREE.Mesh(geo,mat);o.name=n;o.position.set(...p);o.castShadow=!mat.transparent;o.receiveShadow=!mat.transparent;g.add(o);return o;}
  const box=(g,n,w,h,d,mat,x,y,z=0)=>mesh(g,n,new THREE.BoxGeometry(w,h,d),mat,[x,y,z]);
  function pipe(g,n,a,b,r=.09,mat=m.blue){const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),delta=w.clone().sub(v);const o=mesh(g,n,new THREE.CylinderGeometry(r,r,delta.length(),24),mat,v.add(w).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
  function joint(g,x,y,z,r=.12){mesh(g,'Pipe elbow / coupling',new THREE.SphereGeometry(r,20,16),m.blue,[x,y,z]);}
  function panelEdges(g,w,h,d,x,y,z=0){const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),new THREE.LineBasicMaterial({color:'#2996a7',transparent:true,opacity:.7}));e.position.set(x,y,z);g.add(e);}
  function tank(g,n,x,y,w,h,d,closed=false,fillToRim=false){box(g,n+' walls',w,h,d,m.glass,x,y);panelEdges(g,w,h,d,x,y);box(g,n+' floor',w,.035,d,m.glass,x,y-h/2);if(closed)box(g,n+' fixed closed cover',w,.055,d,m.white,x,y+h/2);const waterHeight=fillToRim?h-.06:h*.72;box(g,n+' water',w-.05,waterHeight,d-.05,m.water,x,y-h/2+waterHeight/2);if(!fillToRim)panelEdges(g,w-.05,.006,d-.05,x,y+h*.24);}
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
  plateWithBore(chamber,'White lower tray platform',T-L-rail,depth-rail,.08,4.25,m.white);
  plateWithBore(chamber,'Housing chamber floor',width,tankDepth,.045,housingTop-.045,m.black);
  plateWithBore(chamber,'Housing underside with open outlet',width,tankDepth,.045,platformTop,m.black);
  for(const x of [cx-width/2+.025,cx+width/2-.025])box(chamber,'Closed black housing side',.05,housingTop-platformTop,tankDepth,m.black,x,(platformTop+housingTop)/2);
  for(const z of [-tankDepth/2+.025,tankDepth/2-.025])box(chamber,'Closed black housing end',width-.10,housingTop-platformTop,.05,m.black,cx,(platformTop+housingTop)/2,z);
  for(const x of [cx-width/2+post/2,cx+width/2-post/2])for(const z of [-tankDepth/2+post/2,tankDepth/2-post/2]){
    box(artifact,'Flush corner pillar',post,topPlateBottom-housingTop,post,m.black,x,(housingTop+topPlateBottom)/2,z);
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
  plateWithBore(cap,'White top holder base',width,tankDepth,.03,holderBase-.03,m.white,.035);
  for(const x of [cx-.66,cx+.66])box(cap,'02 upper glass holder side wall',.012,.65,1.2,m.glass,x,holderBase+.325);
  for(const z of [-.60,.60])box(cap,'02 upper glass holder end wall',1.308,.65,.012,m.glass,cx,holderBase+.325,z);
  panelEdges(cap,1.32,.65,1.2,cx,holderBase+.325);
  pipe(artifact,'Thin central pipe through holder and divider',[cx,4.93,0],[cx,holderBase+.04,0],.025,m.tube);
  // Open white sleeve: outer/inner surfaces and annular rims, no solid end caps.
  const sleeveBottom=4.12,sleeveTop=4.95,outer=.095,inner=.065;
  mesh(chamber,'White hollow needle sleeve outer',new THREE.CylinderGeometry(outer,outer,sleeveTop-sleeveBottom,40,1,true),m.white,[cx,(sleeveTop+sleeveBottom)/2,0]);
  const innerMat=m.white.clone();innerMat.side=THREE.BackSide;
  mesh(chamber,'White hollow needle sleeve inner',new THREE.CylinderGeometry(inner,inner,sleeveTop-sleeveBottom,40,1,true),innerMat,[cx,(sleeveTop+sleeveBottom)/2,0]);
  for(const y of [sleeveBottom,sleeveTop]){const rim=mesh(chamber,'Open annular sleeve rim',new THREE.RingGeometry(inner,outer,40),m.white,[cx,y,0]);rim.rotation.x=y===sleeveTop?-Math.PI/2:Math.PI/2;}
  const needle=pipe(chamber,'Concealed downward needle',[cx,4.91,0],[cx,4.57,0],.008,m.steel);needle.userData.hiddenInsideCylinder=true;
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
  model.userData={revision:'Top Glass Tank',units:'relative; dimensions unmeasured',reference:'Revision K plus construction photographs'};
  return model;
}


