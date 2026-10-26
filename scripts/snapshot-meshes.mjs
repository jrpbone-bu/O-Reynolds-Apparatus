// Prints a sorted signature of every rendered object so regrouping can be proven visually inert.
import * as THREE from 'three';
import { createApparatus } from '../src/apparatus.js';
const model=createApparatus();model.updateMatrixWorld(true);
const round=v=>Math.abs(v)<5e-7?'0':v.toFixed(6);
const rows=[];
model.traverse(o=>{
  if(!o.isMesh&&!o.isLineSegments)return;
  const pos=o.geometry.attributes.position;let sum=0;for(let i=0;i<pos.array.length;i++)sum+=pos.array[i]*((i%7)+1);
  const mats=(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.type,m.color?.getHexString(),m.opacity,m.transparent,m.side,m.metalness,m.roughness,m.depthWrite].join(','));
  rows.push([o.type,o.name,o.visible,o.castShadow,o.receiveShadow,o.renderOrder,pos.count,sum.toFixed(3),o.geometry.index?.count??0,mats.join(';'),o.matrixWorld.elements.map(round).join(',')].join('|'));
});
rows.sort();
console.log(rows.join('\n'));
