export const noise = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float grain(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x),
             mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.)), f.x), f.y);
}
`

export const skyVertex = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
`

export const skyFragment = /* glsl */ `
uniform sampler2D uCanvas;
uniform vec3 uSun;
uniform vec3 uMist;
uniform vec3 uTint;
uniform vec3 uAmber;
uniform float uWarmth;
varying vec3 vDirection;
${noise}
void main() {
  vec3 ray = normalize(vDirection);
  float az = atan(ray.x, -ray.z);
  vec2 uv = vec2(0.5 + sin(az * 0.95) * 0.46, clamp(0.44 + ray.y * 0.77, 0.02, 0.99));
  vec3 painted = texture2D(uCanvas, uv).rgb;
  float wrap = 0.5+0.5*cos(az);
  painted = mix(painted * vec3(.65,.78,.89), painted, wrap);
  float nearHorizon = exp(-abs(ray.y)*17.0);
  vec3 col = mix(painted * uTint, uMist, nearHorizon * .70);
  float rad = length(ray-uSun);
  float glow = exp(-rad*5.9) * uWarmth;
  col = mix(col,uAmber, .40*glow);
  float paper = grain(uv*vec2(430.,270.))-.5;
  float edge = .001 + .002 * grain(uv*370.);
  float disc = 1.0 - smoothstep(.020-edge, .020+edge, rad + paper*.0021);
  vec3 red = mix(vec3(.94,.104,.031),vec3(1.0,.31,.094),grain(uv*vec2(340.,870.)));
  col = mix(col, red, disc * .98);
  col += paper * .007;
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}
`

export const waterVertex = /* glsl */ `
uniform float uTime;
varying vec3 vPosition;
void main() {
  vec4 p = modelMatrix * vec4(position, 1.);
  p.y += .074 * sin(p.z*.46 + p.x*.13 + uTime*.93)
       + .026 * sin(p.z*1.24 - p.x*.34 - uTime*1.5);
  vPosition = p.xyz;
  gl_Position = projectionMatrix * viewMatrix * p;
}
`

export const waterFragment = /* glsl */ `
uniform float uTime;
uniform float uWarmth;
uniform float uAccent;
uniform float uHaze;
uniform sampler2D uCanvas;
uniform vec3 uSun;
uniform vec3 uMist;
uniform vec3 uWater;
uniform vec3 uAmber;
varying vec3 vPosition;
${noise}
void main() {
  vec3 delta = vPosition - cameraPosition;
  float far = length(delta.xz);
  vec3 ray = normalize(delta);
  vec2 p = vPosition.xz;
  float drift = uTime * .24;
  vec2 c = p + vec2(.35*sin(p.y*.32 + drift), .48*grain(p*vec2(.21,.13)+drift*.1));
  float wash = grain(c*vec2(.028,.072)) * .58 + grain(c*vec2(.096,.22)+17.) * .42;
  float broad = grain(c*vec2(.14,.63)+vec2(0.,drift));
  float broken = grain(c*vec2(.48,2.5)-vec2(11.,drift*.60));
  float fine = grain(c*vec2(3.4,11.0)+3.5);
  vec3 canvas = texture2D(uCanvas, fract(c*vec2(.071,.13))).rgb;
  float brush = .62 + wash*.67 + (broad-.5)*.35 + (broken-.5)*.28 + (fine-.5)*.14;
  vec3 col = uWater * brush + (canvas-.27)*.13;
  float glancing = pow(1.-clamp(abs(ray.y),0.,1.), 3.6);
  col = mix(col, uMist * (.70 + .42*wash), glancing*.58);
  float ribbon = abs((p.x-cameraPosition.x)*uSun.z - (p.y-cameraPosition.z)*uSun.x);
  float warped = abs(ribbon + (broad-.5)*(4.0 + far*.031) + (broken-.5)*3.0);
  float band = exp(-warped / (2.6+far*.030+uWarmth));
  float scatter = pow(clamp(.64*broken+.36*grain(c*vec2(.19,3.6)+vec2(9.,drift*.42)),0.,1.), 2.6);
  float stroke = smoothstep(.15,.30,scatter + (broad-.5)*.10 + (fine-.5)*.085);
  float fleck = smoothstep(.62,.88,grain(c*vec2(.76,5.7)+vec2(14.,drift*.45)) + (fine-.5)*.11);
  float facing = smoothstep(.36,.83,dot(normalize(delta.xz),normalize(uSun.xz)));
  float reflection = band * facing * uWarmth;
  col = mix(col, uAmber * .56, min(.34, reflection*.38));
  col = mix(col, uAmber * (1.00 + scatter*.37 + uAccent*.35), clamp(reflection*(stroke*.82+fleck*.24+stroke*uAccent*.64),0.,.87));
  float fog = 1.0-exp(-far*(.004 + .0045*uHaze));
  col = mix(col, uMist*.92, fog*.86);
  gl_FragColor = vec4(max(col,0.),1.);
  #include <colorspace_fragment>
}
`
