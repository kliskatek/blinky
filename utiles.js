// Curvas de tiempo (las mismas que k3d-core.js de la web), recorridos, cámara por claves y texturas comunes.
import * as THREE from 'three';
import { L, LETRAS_SEG } from './idioma.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));                 // avance 0..1 dentro de [a, b]
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const easeBack = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const bell = (t, a, b) => (t < a || t > b) ? 0 : Math.sin(Math.PI * (t - a) / (b - a));   // 0..1..0 en [a, b]
// Curvas de 0 a 1 con la velocidad que se quiera en los extremos (k0 al salir, k1 al llegar; 1 es la de la recta):
// para los cortes, donde un plano acaba en marcha y el siguiente empieza en marcha, sin frenar ni arrancar de cero
export const pasa = (k0, k1) => (x) => { x = clamp(x); return k0 * x + (3 - 2 * k0 - k1) * x * x + (k0 + k1 - 2) * x * x * x; };
// Ruta por tramos: [{ t0, t1, curva, ease }], cada curva con getPointAt (CatmullRomCurve3, CurvePath...). Entre tramos
// y fuera de ellos se queda donde acabó el anterior (o donde empieza el primero). En vez de ease, un tramo puede dar la
// velocidad con que sale y con que llega (sale, llega: en proporción a su velocidad media; pasa()). Un tramo con
// junta: true (y t0 igual al t1 del anterior) empalma con el anterior sin pararse: si ninguno de los dos fija la
// velocidad en la junta, pasan por ella a la menor de sus velocidades medias. ruta.ease[i] es la ease final de cada tramo.
export function porTramos(tramos) {
  const media = tramos.map((x) => x.curva.getLength() / (x.t1 - x.t0));
  const k0 = tramos.map((x) => x.sale), k1 = tramos.map((x) => x.llega);
  tramos.forEach((x, i) => {
    if (!x.junta || !i) return;
    const mp = media[i - 1], mx = media[i];
    const v = k0[i] != null ? k0[i] * mx : k1[i - 1] != null ? k1[i - 1] * mp : Math.min(mp, mx);
    k1[i - 1] = Math.min(3, v / mp); k0[i] = Math.min(3, v / mx);
  });
  tramos = tramos.map((x, i) => (x.ease || (k0[i] == null && k1[i] == null) ? x : { ...x, ease: pasa(k0[i] || 0, k1[i] || 0) }));
  // los extremos se calculan una vez; dentro, u se queda en [0, 0.9999]: en el final exacto, CurvePath.getPointAt puede
  // devolver null por redondeo
  const ini = tramos.map((x) => x.curva.getPointAt(0).clone()), fin = tramos.map((x) => x.curva.getPoint(1).clone());
  const ruta = (t) => {
    for (let i = 0; i < tramos.length; i++) {
      const x = tramos[i];
      if (t < x.t0) return (i ? fin[i - 1] : ini[0]).clone();
      if (t <= x.t1) {
        const u = clamp((x.ease || smoother)(seg(t, x.t0, x.t1)), 0, 0.9999);
        return (x.curva.getPointAt(u) || fin[i]).clone();
      }
    }
    return fin[fin.length - 1].clone();
  };
  ruta.ease = tramos.map((x) => x.ease || smoother);                      // la de cada tramo (para lo que va con él)
  return ruta;
}

// Cámara por claves: [{ t, pos, mira, fov }], donde pos y mira pueden ser Vector3 o funciones (t) → Vector3 (para
// seguir al electrón). Entre dos claves se pasa de una a otra con smoother (o con la ease de la clave de llegada: en los
// cortes, pasa() para no frenar del todo); las dos se evalúan en el mismo t, así que pasar de un seguimiento a otro no
// da saltos. Una clave con paso: true no frena: la cámara pasa por ella en marcha (Hermite con la tangente de
// Catmull-Rom entre sus vecinas, en tiempo), y los dos tramos que la tocan van por esa curva. Una clave con llega: k
// recibe la cámara a k veces la velocidad media del tramo que llega a ella (pasa(0, k); en los cortes).
export function porClaves(claves) {
  const val = (v, t) => (typeof v === 'function' ? v(t) : v);
  // la tangente en la clave i (por segundo), o cero si allí se para
  const tang = (i, campo, t) => {
    const c = claves[i];
    if (c.llega != null && i > 0 && claves[i - 1].t <= t) {
      const p = claves[i - 1], h = c.t - p.t;
      if (campo === 'fov') return c.llega * ((c.fov ?? 30) - (p.fov ?? 30)) / h;
      return val(c[campo], t).clone().sub(val(p[campo], t)).multiplyScalar(c.llega / h);
    }
    if (!c.paso || i === 0 || i === claves.length - 1) return null;
    const p = claves[i - 1], n = claves[i + 1];
    if (campo === 'fov') return ((n.fov ?? 30) - (p.fov ?? 30)) / (n.t - p.t);
    return val(n[campo], t).clone().sub(val(p[campo], t)).divideScalar(n.t - p.t);
  };
  const herm = (A, B, MA, MB, h, u) => {
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    if (typeof A === 'number') return h00 * A + h01 * B + h * (h10 * (MA || 0) + h11 * (MB || 0));
    const r = A.clone().multiplyScalar(h00).addScaledVector(B, h01);
    if (MA) r.addScaledVector(MA, h * h10);
    if (MB) r.addScaledVector(MB, h * h11);
    return r;
  };
  return (t, cam) => {
    let ia = 0, ib = 0;
    for (let i = 0; i < claves.length; i++) { if (claves[i].t <= t) { ia = i; ib = claves[i + 1] ? i + 1 : i; } }
    if (t < claves[0].t) ib = ia;
    const a = claves[ia], b = claves[ib];
    let mira;
    if (a !== b && (a.paso || b.paso || b.llega != null)) {
      const h = b.t - a.t, u = seg(t, a.t, b.t);
      cam.position.copy(herm(val(a.pos, t), val(b.pos, t), tang(ia, 'pos', t), tang(ib, 'pos', t), h, u));
      mira = herm(val(a.mira, t), val(b.mira, t), tang(ia, 'mira', t), tang(ib, 'mira', t), h, u);
      cam.fov = herm(a.fov ?? 30, b.fov ?? 30, tang(ia, 'fov', t), tang(ib, 'fov', t), h, u);
    } else {
      const k = a === b ? 0 : (b.ease || smoother)(seg(t, a.t, b.t));     // ease: la del tramo que llega a esa clave
      cam.position.copy(val(a.pos, t)).lerp(val(b.pos, t), k);
      mira = val(a.mira, t).clone().lerp(val(b.mira, t), k);
      cam.fov = lerp(a.fov ?? 30, b.fov ?? 30, k);
    }
    cam.lookAt(mira);
  };
}

// un punto difuso, para el polvo (sin textura, los puntos son cuadrados)
let punto = null;
export function texturaPunto() {
  if (punto) return punto;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (punto = new THREE.CanvasTexture(c));
}

export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

// Lo que dice Blinky: lineas = [[t0, t1, texto], ...]; devuelve la que toca en t, con las letras que ya han salido (a
// máquina, 28 por segundo) y su opacidad (entra y sale en 0,2 s), o null
export function dialogo(t, lineas) {
  const l = lineas.find(([t0, t1]) => t >= t0 && t < t1);
  if (!l) return null;
  const [t0, t1, es] = l, texto = L(es);                       // (en el idioma elegido; es, para la voz)
  return { texto, es, t0, letras: Math.floor((t - t0) * LETRAS_SEG), alfa: smooth(seg(t, t0, t0 + 0.2)) * (1 - smooth(seg(t, t1 - 0.25, t1))) };
}
