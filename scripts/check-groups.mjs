// Fails unless every rendered object sits in exactly one PDF part group (or a "Not in PDF" group).
import { createApparatus } from '../src/apparatus.js';
const model=createApparatus();
const seen=new Map();let failed=false;
for(const group of model.children){
  let count=0;
  group.traverse(o=>{if(!o.isMesh&&!o.isLineSegments)return;count++;if(seen.has(o)){console.error('Assigned twice:',o.name);failed=true;}seen.set(o,group.name);});
  console.log(`${group.userData.partId?'part ':'other'}  ${String(count).padStart(3)}  ${group.name}`);
}
let total=0;model.traverse(o=>{if(o.isMesh||o.isLineSegments)total++;});
if(total!==seen.size){console.error('Unassigned objects:',total-seen.size);failed=true;}
if(model.children.filter(g=>g.userData.partId).length!==8){console.error('Expected 8 PDF part groups');failed=true;}
if(failed)process.exit(1);console.log(`PASS: ${total} objects, each in exactly one group.`);
