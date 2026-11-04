// El sensor digital de temperatura, abierto: en el sitio y con el encapsulado del TMP117 del SenseRead (WSON-6 de 2 × 2
// mm, 3 patas a cada lado cada 0,65 mm; a esta escala, 2,2 por mm), pero con el die inventado, dibujado a mano en un
// canvas, y sus bond wires. El die, de izquierda a derecha: los pads (SDA abajo a la izquierda: por ahí llega y sale el
// I²C), la lógica del bus, el núcleo térmico (una matriz de transistores bipolares, con su bandgap encima), el ADC (el
// array de condensadores) y los pads de la derecha. Las pistas claras del dibujo son las que recorre el electrón.
// Misma interfaz que piezas/rocky.js: padEn(u, v), hilos[lado + pata], patas[lado + pata], yCara.

import * as THREE from 'three';
import { rng, cajaBisel } from '../../../comun/motor/utiles.js';

const ORO = 0xE2B95A;
export const DFN = { W: 4.4, H: 0.6, PASO: 0.65 * 2.2, dw: 3.0, dh: 2.25, alto: 0.18 };
// pads (u, v) → lado y pata: 'i' a la izquierda (0 arriba; la 2, SDA), 'd' a la derecha
export const PADS_S = [
  ...[0.2, 0.5, 0.8].map((v, k) => [0.06, v, 'i', k]),
  ...[0.2, 0.5, 0.8].map((v, k) => [0.94, v, 'd', k]),
];
// zonas del dibujo, para encenderlas desde el plano
export const ZONAS = { logica: [0.13, 0.14, 0.3, 0.86], nucleo: [0.36, 0.22, 0.62, 0.78], adc: [0.68, 0.18, 0.88, 0.82] };
// las pistas claras: el camino del electrón
export const PISTAS = [
  [[0.06, 0.8], [0.18, 0.8], [0.18, 0.4], [0.33, 0.4], [0.33, 0.5], [0.42, 0.5]],   // de SDA, por la lógica, al núcleo
  [[0.56, 0.5], [0.78, 0.5], [0.78, 0.92], [0.11, 0.92], [0.11, 0.8], [0.06, 0.8]],  // del núcleo al ADC y de vuelta a SDA
];

function textura() {
  const W = 1024, H = 768, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = rng(41), X = (u) => u * W, Y = (v) => v * H;
  const caja = (u0, v0, u1, v1, color) => { g.fillStyle = color; g.fillRect(X(u0), Y(v0), X(u1) - X(u0), Y(v1) - Y(v0)); };
  // el silicio, el anillo de sellado y el marco de pads
  g.fillStyle = '#26221c'; g.fillRect(0, 0, W, H);
  caja(0.015, 0.02, 0.985, 0.98, '#b3a274');
  for (let n = 0; n < 6000; n++) { g.fillStyle = `rgba(40,30,10,${r() * 0.08})`; g.fillRect(r() * W, r() * H, 2, 2); }
  g.strokeStyle = '#e1d2a2'; g.lineWidth = 5; g.strokeRect(X(0.025), Y(0.035), X(0.95), Y(0.93));
  // rejilla fina de metal
  g.strokeStyle = 'rgba(120,100,60,.35)'; g.lineWidth = 1;
  for (let x = 0.1; x < 0.92; x += 0.012) { g.beginPath(); g.moveTo(X(x), Y(0.08)); g.lineTo(X(x), Y(0.94)); g.stroke(); }
  // la lógica: filas de celdas estándar
  caja(...ZONAS.logica, '#4c4432');
  for (let v = 0.15; v < 0.85; v += 0.028) for (let u = 0.135; u < 0.295;) {
    const w = 0.006 + r() * 0.02; caja(u, v, Math.min(u + w, 0.295), v + 0.02, r() < 0.5 ? '#cdb784' : '#7d6d49'); u += w + 0.003;
  }
  // el núcleo térmico: 8 × 8 transistores bipolares (anillos concéntricos) y el bandgap encima
  caja(...ZONAS.nucleo, '#5a3a1e');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const cx = X(0.375 + i * 0.0315 + 0.0155), cy = Y(0.24 + j * 0.0675 + 0.032);
    g.fillStyle = '#7a4e26'; g.fillRect(cx - 14, cy - 18, 28, 36);
    g.strokeStyle = '#d99a55'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#f2cf98'; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
  }
  caja(0.4, 0.08, 0.58, 0.18, '#6b5a3a');
  for (let k = 0; k < 6; k++) caja(0.41 + k * 0.028, 0.095, 0.425 + k * 0.028, 0.165, '#d4b679');
  // el ADC: el array de condensadores en peine
  caja(...ZONAS.adc, '#3b3326');
  for (let i = 0; i < 10; i++) for (let j = 0; j < 14; j++) {
    const w = 0.0145, h = 0.034; caja(0.69 + i * 0.019, 0.2 + j * 0.044, 0.69 + i * 0.019 + w, 0.2 + j * 0.044 + h, j % 3 ? '#b59a62' : '#d9c48c');
  }
  // las pistas que recorre el electrón: metal claro y ancho
  g.strokeStyle = '#efe2b6'; g.lineWidth = 16; g.lineCap = 'square';
  for (const p of PISTAS) { g.beginPath(); p.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v)))); g.stroke(); }
  // los pads
  for (const [u, v] of PADS_S) {
    g.fillStyle = '#d7dadd'; g.fillRect(X(u) - 26, Y(v) - 26, 52, 52);
    g.fillStyle = '#8c949a'; g.fillRect(X(u) - 18, Y(v) - 18, 36, 36);
  }
  g.fillStyle = '#efe2b6'; g.font = '600 22px Oxanium, "Segoe UI", sans-serif'; g.fillText('TS-01', X(0.84), Y(0.955));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}

export function crearSensor() {
  const { W, H, PASO, dw, dh, alto } = DFN, E = W / 2 - 0.45;
  const g = new THREE.Group();
  const matOro = new THREE.MeshStandardMaterial({ color: ORO, metalness: 1, roughness: 0.28 });
  const matPlata = new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.72, roughness: 0.28 });
  g.add(new THREE.Mesh(cajaBisel(W, H, W, 0.05), new THREE.MeshStandardMaterial({ color: 0x1b1f23, roughness: 0.62, metalness: 0.1 })));
  const pad = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.02, W - 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.4, metalness: 0.5 }));
  pad.position.y = H / 2 + 0.01; g.add(pad);

  const patas = {};
  for (const lado of ['i', 'd']) for (let k = 0; k < 3; k++) {
    const s = lado === 'i' ? -1 : 1, z = (k - 1) * PASO;
    const p = new THREE.Mesh(cajaBisel(0.06, 0.24, 0.46, 0.012), matPlata.clone());
    p.position.set(s * W / 2, -H / 2 + 0.12, z); g.add(p);
    const d = new THREE.Mesh(cajaBisel(0.5, 0.03, 0.34, 0.008), matOro.clone());
    d.position.set(s * E, H / 2 + 0.03, z); g.add(d);
    patas[lado + k] = { pata: p, dedo: d, enDedo: new THREE.Vector3(s * E, H / 2 + 0.05, z) };
  }

  const yDie = H / 2 + 0.02, yCara = yDie + alto;
  const lado = new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.7, roughness: 0.35 });
  const cara = new THREE.MeshStandardMaterial({ map: textura(), color: 0xb4bcc4, roughness: 0.5, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.07 });
  cara.emissiveMap = cara.map;
  const die = new THREE.Mesh(cajaBisel(dw, alto, dh, 0.02), [lado, lado, cara, lado, lado, lado]);
  die.position.y = yDie + alto / 2; g.add(die);
  const padEn = (u, v, alzado = 0.01) => new THREE.Vector3((u - 0.5) * dw, yCara + alzado, (v - 0.5) * dh);

  const hilos = {};
  for (const [u, v, l, k] of PADS_S) {
    const a = padEn(u, v), b = patas[l + k].enDedo.clone();
    const curva = new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x + (b.x - a.x) * 0.25, a.y + 0.28, a.z + (b.z - a.z) * 0.25), b]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.016, 12), matOro.clone());
    g.add(m); hilos[l + k] = { curva, malla: m };
  }
  return { grupo: g, padEn, hilos, patas, yCara };
}
