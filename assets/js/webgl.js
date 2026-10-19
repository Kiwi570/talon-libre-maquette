/* Effets WebGL : poudreuse qui s'écarte sous le curseur, vapeur du spa. Version 2D si WebGL est indisponible. */
import { Renderer } from '../vendor/ogl/core/Renderer.js';
import { Program } from '../vendor/ogl/core/Program.js';
import { Geometry } from '../vendor/ogl/core/Geometry.js';
import { Mesh } from '../vendor/ogl/core/Mesh.js';
import { Triangle } from '../vendor/ogl/extras/Triangle.js';

const reduced = document.documentElement.classList.contains('reduced');
const TL = window.TL || {};

function visible(el, cb) {
  const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: '100px' });
  io.observe(el);
}

function makeRenderer(canvas) {
  try {
    const renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: false, antialias: false, dpr: Math.min(devicePixelRatio || 1, 2) });
    if (!renderer.gl) return null;
    renderer.gl.clearColor(0, 0, 0, 0);
    return renderer;
  } catch (e) { return null; }
}

/* ---------- Poudreuse ---------- */
function snow(canvas) {
  const host = canvas.parentElement;
  const renderer = makeRenderer(canvas);
  if (!renderer) return snow2d(canvas);
  const gl = renderer.gl;
  const COUNT = innerWidth < 760 ? 650 : 1500;
  const seeds = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const depth = Math.pow(Math.random(), 2.2);
    seeds.set([Math.random(), Math.random(), depth, Math.random()], i * 4);
  }
  const geometry = new Geometry(gl, { position: { size: 4, data: seeds } });
  const program = new Program(gl, {
    vertex: /* glsl */ `
      attribute vec4 position;
      uniform float uTime; uniform float uFall; uniform vec2 uRes; uniform vec2 uMouse; uniform float uDpr;
      varying float vAlpha;
      void main() {
        float depth = position.z;
        float speed = mix(.018, .085, depth);
        float y = fract(position.y - uTime * speed - uFall * mix(.15, .6, depth));
        float sway = sin(uTime * (.4 + position.w) + position.x * 40.) * mix(.004, .02, depth);
        float x = fract(position.x + sway + uTime * .004 * (position.w - .3));
        vec2 px = vec2(x, 1. - y) * uRes;
        vec2 d = px - uMouse;
        float dist = length(d);
        float R = mix(90., 190., depth);
        float push = smoothstep(R, 0., dist) * mix(30., 110., depth);
        px += normalize(d + .0001) * push;
        vec2 clip = px / uRes * 2. - 1.;
        clip.y *= -1.;
        gl_Position = vec4(clip, 0., 1.);
        gl_PointSize = mix(1.4, 5.6, depth) * uDpr;
        vAlpha = mix(.35, .95, depth) * smoothstep(0., .06, y) * smoothstep(1., .9, y);
      }`,
    fragment: /* glsl */ `
      precision mediump float;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - .5;
        float a = smoothstep(.5, .1, length(c)) * vAlpha;
        gl_FragColor = vec4(vec3(1., 1., 1.), a);
      }`,
    uniforms: { uTime: { value: 0 }, uFall: { value: 0 }, uRes: { value: [1, 1] }, uMouse: { value: [-999, -999] }, uDpr: { value: renderer.dpr } },
    transparent: true, depthTest: false
  });
  const mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });
  const resize = () => { renderer.setSize(host.clientWidth, host.clientHeight); program.uniforms.uRes.value = [host.clientWidth, host.clientHeight]; };
  resize(); addEventListener('resize', resize);
  const mouse = { x: -999, y: -999, tx: -999, ty: -999 };
  host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; if (mouse.x < -900) { mouse.x = mouse.tx; mouse.y = mouse.ty; } });
  host.addEventListener('pointerleave', () => { mouse.tx = -999; mouse.ty = -999; mouse.x = -999; mouse.y = -999; });
  let on = true, fall = 0, raf = 0, t0 = performance.now();
  visible(host, v => { on = v; if (v && !raf) loop(); });
  function loop() {
    if (!on) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000;
    fall += Math.min(Math.abs(TL.velocity || 0), 60) * .00035;
    mouse.x += (mouse.tx - mouse.x) * .15; mouse.y += (mouse.ty - mouse.y) * .15;
    program.uniforms.uTime.value = t;
    program.uniforms.uFall.value = fall;
    program.uniforms.uMouse.value = [mouse.x, mouse.y];
    renderer.render({ scene: mesh });
  }
  loop();
  canvas.style.opacity = 0;
  requestAnimationFrame(() => { canvas.style.transition = 'opacity 1.6s ease 1.2s'; canvas.style.opacity = 1; });
}

function snow2d(canvas) {
  const host = canvas.parentElement;
  const c = canvas.getContext('2d');
  const flakes = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .5, s: Math.random() * .0012 + .0004 }));
  let on = true;
  visible(host, v => { on = v; if (v) requestAnimationFrame(draw); });
  function draw() {
    if (!on) return;
    const w = canvas.width = host.clientWidth, h = canvas.height = host.clientHeight;
    c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.85)';
    flakes.forEach(f => { f.y = (f.y + f.s) % 1; c.beginPath(); c.arc(f.x * w, f.y * h, f.r, 0, 6.283); c.fill(); });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ---------- Vapeur du spa ---------- */
function steam(canvas) {
  const host = canvas.parentElement;
  const renderer = makeRenderer(canvas);
  if (!renderer) { canvas.remove(); return; }
  const gl = renderer.gl;
  const program = new Program(gl, {
    vertex: `attribute vec2 uv; attribute vec2 position; varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`,
    fragment: /* glsl */ `
      precision highp float;
      uniform float uTime; uniform vec2 uMouse; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.03; a *= .5; } return v; }
      void main(){
        vec2 uv = vUv;
        vec2 q = vec2(uv.x * 2.2, uv.y * 1.6 - uTime * .12);
        q.x += sin(uv.y * 3. + uTime * .3) * .25 + (uMouse.x - .5) * .3 * uv.y;
        float f = fbm(q + fbm(q * 1.7 + uTime * .05));
        float mask = smoothstep(.0, .55, 1. - uv.y) * smoothstep(1., .45, 1. - uv.y) * .9;
        float a = smoothstep(.45, .85, f) * mask;
        gl_FragColor = vec4(vec3(1.), a * .55);
      }`,
    uniforms: { uTime: { value: 0 }, uMouse: { value: [.5, .5] } },
    transparent: true, depthTest: false
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const resize = () => renderer.setSize(host.clientWidth, host.clientHeight);
  resize(); addEventListener('resize', resize);
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); program.uniforms.uMouse.value = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; });
  let on = false, raf = 0;
  const t0 = performance.now();
  visible(host, v => { on = v; if (v && !raf) loop(); });
  function loop() {
    if (!on) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    program.uniforms.uTime.value = (performance.now() - t0) / 1000;
    renderer.render({ scene: mesh });
  }
}

if (!reduced) {
  document.querySelectorAll('canvas.snow').forEach(snow);
  document.querySelectorAll('canvas.steam').forEach(steam);
} else {
  document.querySelectorAll('canvas.snow, canvas.steam').forEach(c => c.remove());
}
