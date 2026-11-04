// El ROCKY100 abierto, como en historia-kliskatek/chip3d.js: el QFN-16 sin la tapa, con su pad, los dedos de oro y las
// patas, el die con la foto del microscopio y los bond wires de cada pad a su dedo, según el pinout del datasheet.
// Escala de chip3d: 1 mm = 1,55; el cuerpo mide 6,2 y el die 3,6 de ancho.
// pad(u, v): el punto del mundo (local) sobre la foto del die; hilo(lado, pata): la curva del bond wire, del pad al dedo;
// pata(lado, k) y dedo(lado, k): dónde está la pata en el canto del encapsulado y su dedo de oro por dentro.

import * as THREE from 'three';
import { cajaBisel } from '../../comun/motor/utiles.js';

// pads de la foto (u, v) con el lado del QFN y la pata (0-3) a la que va su hilo; null, sin hilo (de chip3d.js).
// 'i' RF+ (1), RF− (4); 'a' VREGL, GLOAD, VDD, EV4; 'd' CS, SCK, MOSI, MISO; 'b' VSS, VBAT, VIO, RFU
const SIN = [0, 1, null, 2, 3];
export const PADS = [
  [0.111, 0.477, 'i', 0], [0.111, 0.564, 'i', 3],
  ...[0.214, 0.359, 0.503, 0.649, 0.793].map((u, k) => [u, 0.064, 'a', SIN[k]]),
  ...[0.217, 0.353, 0.493, 0.630, 0.768].map((v, k) => [0.955, v, 'd', SIN[k]]),
  ...[0.220, 0.365, 0.509, 0.652, 0.797].map((u, k) => [u, 0.936, 'b', SIN[k]]),
];

const ORO = 0xE2B95A;
export const QFN = { W: 6.2, H: 0.8, PASO: 0.65 * 1.55, dw: 3.6, dh: 3.6 / (1110 / 817), alto: 0.24 };

export function crearRocky() {
  const { W, H, PASO, dw, dh, alto } = QFN, E = W / 2 - 0.55;
  const g = new THREE.Group();
  const matOro = new THREE.MeshStandardMaterial({ color: ORO, metalness: 1, roughness: 0.28 });
  const matPlata = new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.72, roughness: 0.28 });
  const matCuerpo = new THREE.MeshStandardMaterial({ color: 0x1b1f23, roughness: 0.62, metalness: 0.1 });

  g.add(new THREE.Mesh(cajaBisel(W, H, W, 0.06), matCuerpo));
  const pad = new THREE.Mesh(new THREE.BoxGeometry(W - 0.5, 0.02, W - 0.5), new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.4, metalness: 0.5 }));
  pad.position.y = H / 2 + 0.01; g.add(pad);

  const sitio = (lado, k, d) => {
    const o = (k - 1.5) * PASO;
    return { i: [-d, o, 0], d: [d, o, 0], a: [o, -d, 1], b: [o, d, 1] }[lado];
  };
  const patas = {};
  for (const lado of ['i', 'a', 'd', 'b']) for (let k = 0; k < 4; k++) {
    const [x, z, ax] = sitio(lado, k, W / 2);
    const p = new THREE.Mesh(cajaBisel(ax ? 0.46 : 0.06, 0.3, ax ? 0.06 : 0.46, 0.012), matPlata.clone());
    p.position.set(x, -H / 2 + 0.15, z); g.add(p);
    const [fx, fz] = sitio(lado, k, E);
    const d = new THREE.Mesh(cajaBisel(ax ? 0.34 : 0.5, 0.03, ax ? 0.5 : 0.34, 0.008), matOro.clone());
    d.position.set(fx, H / 2 + 0.03, fz); g.add(d);
    patas[lado + k] = { pata: p, dedo: d, enCanto: new THREE.Vector3(x, H / 2 + 0.02, z), enDedo: new THREE.Vector3(fx, H / 2 + 0.05, fz) };
  }

  // el die: losa con la foto encima (se ve con brillo propio, para que la foto se lea con cualquier luz)
  const yDie = H / 2 + 0.02;
  const lado = new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.7, roughness: 0.35 });
  const cara = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.5, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.16 });
  const die = new THREE.Mesh(cajaBisel(dw, alto, dh, 0.02), [lado, lado, cara, lado, lado, lado]);
  die.position.y = yDie + alto / 2; g.add(die);
  new THREE.TextureLoader().load(new URL('img/rocky100-textura.jpg', import.meta.url).href, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    cara.map = tex; cara.emissiveMap = tex; cara.color.set(0xffffff); cara.needsUpdate = true;
  });
  const yCara = yDie + alto;
  const padEn = (u, v, alzado = 0.01) => new THREE.Vector3((u - 0.5) * dw, yCara + alzado, (v - 0.5) * dh);

  // los bond wires, con su lazo
  const hilos = {};
  for (const [u, v, l, k] of PADS) {
    if (k === null) continue;
    const a = padEn(u, v), b = patas[l + k].enDedo.clone().setY(H / 2 + 0.035);   // (metido en el dedo: si no, de cerca se le veía la boca)
    const curva = new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x + (b.x - a.x) * 0.22, a.y + 0.3, a.z + (b.z - a.z) * 0.22), b]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.016, 12), matOro.clone());
    g.add(m);
    hilos[l + k] = { curva, malla: m };
  }

  return { grupo: g, cara, padEn, hilos, patas, yCara };
}
