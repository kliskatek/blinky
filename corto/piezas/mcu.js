// El micro del SenseRead (un MSPM0 en su X2QFN-16 de 3 × 2 mm, IC4 en la placa), abierto como el ROCKY100 de
// piezas/rocky.js: el encapsulado sin la tapa, los dedos de oro, las patas, el die dibujado en un canvas y sus bond wires.
// El die es inventado (no es la foto de ninguno): el núcleo (celdas estándar, irregulares), la flash (una matriz grande y
// regular), la SRAM (otra, más fina), y los periféricos junto a sus pads: el SPI hacia el ROCKY100 y el I²C hacia el
// sensor. Las pistas claras del dibujo son las que recorre Blinky (IDA, de MOSI a SDA; VUELTA, de SDA a MISO).
// Misma interfaz que piezas/rocky.js: padEn(u, v), hilos[lado + pata], patas[lado + pata], yCara. Escala de rocky.js:
// 1 mm = 1,55; el largo en x. Las patas, como en la placa: 'i' (−x) MOSI, SCK, MISO, TEST (hacia el ROCKY100); 'b' (+z),
// la 2 es SDA y la 3 SCL (hacia el sensor); 'd' y 'a', las demás.

import * as THREE from 'three';
import { rng, cajaBisel } from '../utiles.js';

const ORO = 0xE2B95A;
export const MCU = { W: 3 * 1.55, D: 2 * 1.55, H: 0.62, PASO: 0.4 * 1.55, dw: 3.0, dh: 1.7, alto: 0.18 };
// los pads del die (u, v) con su lado y su pata
const PU = [0.19, 0.4, 0.6, 0.81], PV = [0.2, 0.4, 0.6, 0.8];
export const PADS_M = [
  ...PV.map((v, k) => [0.04, v, 'i', k]), ...PV.map((v, k) => [0.96, v, 'd', k]),
  ...PU.map((u, k) => [u, 0.05, 'a', k]), ...PU.map((u, k) => [u, 0.95, 'b', k]),
];
// las zonas del dibujo (u0, v0, u1, v1), para encenderlas desde el plano
export const ZONAS_M = {
  spi: [0.08, 0.16, 0.2, 0.84], nucleo: [0.24, 0.14, 0.5, 0.6], flash: [0.55, 0.12, 0.92, 0.62],
  sram: [0.24, 0.65, 0.48, 0.86], i2c: [0.53, 0.66, 0.7, 0.86], adc: [0.74, 0.66, 0.92, 0.86],
};
// el camino de Blinky: de MOSI (i0), por el SPI, dos pasadas por el núcleo, al I²C y a SDA (b2); y de vuelta, de SDA
// por el I²C y el núcleo al SPI y a MISO (i2)
export const IDA_M = [[0.04, 0.2], [0.14, 0.2], [0.14, 0.33], [0.46, 0.33], [0.46, 0.47], [0.29, 0.47], [0.29, 0.56], [0.515, 0.56],
  [0.515, 0.76], [0.6, 0.76], [0.6, 0.95]];
export const VUELTA_M = [[0.6, 0.95], [0.6, 0.76], [0.515, 0.76], [0.515, 0.42], [0.27, 0.42], [0.14, 0.42], [0.14, 0.6], [0.04, 0.6]];

function textura() {
  const W = 1024, H = Math.round(1024 * MCU.dh / MCU.dw), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = rng(57), X = (u) => u * W, Y = (v) => v * H;
  const caja = (u0, v0, u1, v1, color) => { g.fillStyle = color; g.fillRect(X(u0), Y(v0), X(u1) - X(u0), Y(v1) - Y(v0)); };
  // el silicio, el anillo de sellado y la rejilla fina de metal
  g.fillStyle = '#211f1b'; g.fillRect(0, 0, W, H);
  caja(0.012, 0.02, 0.988, 0.98, '#a99a70');
  for (let n = 0; n < 6000; n++) { g.fillStyle = `rgba(40,30,10,${r() * 0.08})`; g.fillRect(r() * W, r() * H, 2, 2); }
  g.strokeStyle = '#e1d2a2'; g.lineWidth = 4; g.strokeRect(X(0.022), Y(0.035), X(0.956), Y(0.93));
  g.strokeStyle = 'rgba(120,100,60,.3)'; g.lineWidth = 1;
  for (let y = 0.1; y < 0.9; y += 0.016) { g.beginPath(); g.moveTo(X(0.07), Y(y)); g.lineTo(X(0.93), Y(y)); g.stroke(); }
  // el núcleo: filas de celdas estándar, irregulares
  caja(...ZONAS_M.nucleo, '#4a4230');
  for (let v = 0.15; v < 0.59; v += 0.026) for (let u = 0.245; u < 0.495;) {
    const w = 0.004 + r() * 0.016; caja(u, v, Math.min(u + w, 0.495), v + 0.019, r() < 0.5 ? '#cdb784' : '#7d6d49'); u += w + 0.0025;
  }
  // la flash: una matriz grande, regular, oscura y dorada, con su decodificador a un lado
  caja(...ZONAS_M.flash, '#2f2a20');
  for (let i = 0; i < 26; i++) for (let j = 0; j < 22; j++) caja(0.565 + i * 0.0136, 0.135 + j * 0.0215, 0.565 + i * 0.0136 + 0.01, 0.135 + j * 0.0215 + 0.016, (i + j) % 7 ? '#8f7a48' : '#b39a5e');
  caja(0.55, 0.12, 0.562, 0.62, '#cdb784');
  // la SRAM: otra matriz, más fina
  caja(...ZONAS_M.sram, '#3a3324');
  for (let i = 0; i < 30; i++) for (let j = 0; j < 9; j++) caja(0.247 + i * 0.0077, 0.66 + j * 0.022, 0.247 + i * 0.0077 + 0.0055, 0.66 + j * 0.022 + 0.016, '#a58d58');
  // los periféricos: el SPI (hacia el ROCKY100), el I²C (hacia el sensor) y el ADC
  for (const z of ['spi', 'i2c', 'adc']) {
    const [u0, v0, u1, v1] = ZONAS_M[z]; caja(u0, v0, u1, v1, '#4c4432');
    for (let v = v0 + 0.01; v < v1 - 0.02; v += 0.03) for (let u = u0 + 0.005; u < u1 - 0.005;) {
      const w = 0.004 + r() * 0.012; caja(u, v, Math.min(u + w, u1 - 0.005), v + 0.022, r() < 0.5 ? '#c4ad78' : '#6f6142'); u += w + 0.003;
    }
  }
  const [a0, b0, a1, b1] = ZONAS_M.adc;                       // (el ADC, con su peine de condensadores)
  for (let i = 0; i < 7; i++) caja(a0 + 0.01 + i * 0.024, b0 + 0.02, a0 + 0.02 + i * 0.024, b1 - 0.02, '#d9c48c');
  // las pistas que recorre Blinky: metal claro y ancho
  g.strokeStyle = '#efe2b6'; g.lineWidth = 13; g.lineCap = 'square'; g.lineJoin = 'miter';
  for (const p of [IDA_M, VUELTA_M]) { g.beginPath(); p.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v)))); g.stroke(); }
  // los pads
  for (const [u, v] of PADS_M) {
    g.fillStyle = '#d7dadd'; g.fillRect(X(u) - 22, Y(v) - 22, 44, 44);
    g.fillStyle = '#8c949a'; g.fillRect(X(u) - 15, Y(v) - 15, 30, 30);
  }
  g.fillStyle = '#efe2b6'; g.font = '600 20px Oxanium, "Segoe UI", sans-serif'; g.fillText('M0+', X(0.86), Y(0.93));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}

export function crearMCU() {
  const { W, D, H, PASO, dw, dh, alto } = MCU;
  const g = new THREE.Group();
  const matOro = new THREE.MeshStandardMaterial({ color: ORO, metalness: 1, roughness: 0.28 });
  const matPlata = new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.72, roughness: 0.28 });
  g.add(new THREE.Mesh(cajaBisel(W, H, D, 0.05), new THREE.MeshStandardMaterial({ color: 0x1b1f23, roughness: 0.62, metalness: 0.1 })));
  const pad = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.02, D - 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.4, metalness: 0.5 }));
  pad.position.y = H / 2 + 0.01; g.add(pad);

  // las patas, en el canto, y su dedo de oro por dentro (en los lados largos, juntas en el medio, como en la huella)
  const patas = {};
  for (const lado of ['i', 'd', 'a', 'b']) for (let k = 0; k < 4; k++) {
    const o = (k - 1.5) * PASO, x = { i: -W / 2, d: W / 2, a: o, b: o }[lado], z = { i: o, d: o, a: -D / 2, b: D / 2 }[lado];
    const enX = lado === 'i' || lado === 'd', sx = Math.sign(x), sz = Math.sign(z);
    const p = new THREE.Mesh(cajaBisel(enX ? 0.06 : 0.3, 0.24, enX ? 0.3 : 0.06, 0.012), matPlata.clone());
    p.position.set(x, -H / 2 + 0.12, z); g.add(p);
    const [fx, fz] = enX ? [sx * (W / 2 - 0.38), o] : [o, sz * (D / 2 - 0.3)];
    const d = new THREE.Mesh(cajaBisel(enX ? 0.44 : 0.24, 0.03, enX ? 0.24 : 0.36, 0.008), matOro.clone());
    d.position.set(fx, H / 2 + 0.03, fz); g.add(d);
    patas[lado + k] = { pata: p, dedo: d, enCanto: new THREE.Vector3(x, H / 2 + 0.02, z), enDedo: new THREE.Vector3(fx, H / 2 + 0.05, fz) };
  }

  const yDie = H / 2 + 0.02, yCara = yDie + alto;
  const lado = new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.7, roughness: 0.35 });
  const cara = new THREE.MeshStandardMaterial({ map: textura(), color: 0xb4bcc4, roughness: 0.5, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.07 });
  cara.emissiveMap = cara.map;
  const die = new THREE.Mesh(cajaBisel(dw, alto, dh, 0.02), [lado, lado, cara, lado, lado, lado]);
  die.position.y = yDie + alto / 2; g.add(die);
  const padEn = (u, v, alzado = 0.01) => new THREE.Vector3((u - 0.5) * dw, yCara + alzado, (v - 0.5) * dh);

  const hilos = {};
  for (const [u, v, l, k] of PADS_M) {
    const a = padEn(u, v), b = patas[l + k].enDedo.clone();
    const curva = new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x + (b.x - a.x) * 0.25, a.y + 0.22, a.z + (b.z - a.z) * 0.25), b]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.014, 12), matOro.clone());
    g.add(m); hilos[l + k] = { curva, malla: m };
  }
  return { grupo: g, padEn, hilos, patas, yCara };
}
