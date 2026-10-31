import * as THREE from 'three';

const VERT = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;

const FRAG = `varying vec2 vUv;
uniform vec2 uRes;
float lineAA(float d, float w){ float fw = fwidth(d); return 1.0 - smoothstep(w - fw, w + fw, abs(d)); }
void main(){
  vec2 p = vUv; vec2 px = p * uRes;
  vec3 c = mix(vec3(.93,.95,.965), vec3(.86,.905,.94), p.y);
  float g1 = max(lineAA(fract(px.x / 24.0 + .5) - .5, .02),  lineAA(fract(px.y / 24.0 + .5) - .5, .02));
  float g2 = max(lineAA(fract(px.x / 120.0 + .5) - .5, .006), lineAA(fract(px.y / 120.0 + .5) - .5, .006));
  c = mix(c, vec3(.55,.66,.78), g1 * .18 + g2 * .32);
  float v = distance(p, vec2(.5));
  c *= 1.0 - .10 * smoothstep(.35, .85, v);
  gl_FragColor = vec4(c, 1.0);
}`;

export function addBlueprintBackground(scene) {
  // Full-screen backdrop; resolution is measured in CSS pixels at every DPR.
  const uniforms = {uRes: {value: new THREE.Vector2(1, 1)}};
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthWrite: false,
      depthTest: false,
      toneMapped: false
    })
  );
  backdrop.name = 'background';
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1000;
  backdrop.raycast = () => {};
  const size = new THREE.Vector2();
  backdrop.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(size);
    uniforms.uRes.value.copy(size).divideScalar(renderer.getPixelRatio());
  };
  scene.add(backdrop);

  return {backdrop};
}
