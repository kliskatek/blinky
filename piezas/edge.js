// El controlador edge (genérico, sin marca), en metros: una caja industrial de 20 × 5 × 14 cm para carril DIN. Tumbado,
// con su cara grande arriba (+y) y los puertos LAN delante (+z); en el armario va de pie (DE_PIE de la planta): la cara
// grande mira hacia fuera y los puertos, abajo. En la cara grande, para que se reconozca de frente: aletas a la
// izquierda y, a la derecha, una placa con «EDGE», «IIoT gateway» y sus LED. Lo usan la planta y el plano 8.
// crearEdge() devuelve el grupo, las aletas y los LED (para encenderlos) y dónde están, en su local, el puerto LAN1
// (LAN) y la cara (CARA).

import * as THREE from 'three';
import { cartel } from './cartel.js';
import { cajaRedonda } from './tag.js';
import { pintura, cepillado, conTexturas } from './texturas.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color, metal = 0.3, rug = 0.5, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });

export function crearEdge() {
  const g = new THREE.Group();
  const caja = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const cuerpo = new THREE.Mesh(cajaRedonda(0.2, 0.05, 0.14, 0.012, 0.004), conTexturas(mat(0x2b3036, 0.4, 0.9), pintura(), 1, 1)); cuerpo.position.y = 0.025; g.add(cuerpo);
  // las aletas, en la mitad izquierda
  const aletas = [];
  for (let i = 0; i < 7; i++) aletas.push(caja(0.004, 0.018, 0.12, conTexturas(mat(0x1d2024, 0.5, 0.8, { emissive: 0x3dc8ff, emissiveIntensity: 0 }), cepillado(), 1, 1), -0.088 + i * 0.013, 0.059, 0));
  // la placa de la derecha, con el rótulo (de cara arriba; leído con los puertos abajo)
  caja(0.1, 0.004, 0.124, mat(0x3d4a57, 0.3, 0.5), 0.045, 0.052, 0);
  const rotulo = cartel([
    { txt: 'EDGE', col: '#9fe8ff', y: 380, size: 300, x: 512, alinea: 'center' },
    { txt: 'IIoT gateway', col: '#d7e3ee', y: 600, size: 120, x: 512, alinea: 'center' },
    { txt: 'MQTT · OPC UA', col: '#8fa4b8', y: 780, size: 96, x: 512, alinea: 'center' },
  ], 0.09, 0.11, { fondo: 'rgba(20,32,44,.95)', borde: '#3dc8ff' });
  rotulo.malla.rotation.x = -Math.PI / 2; rotulo.malla.position.set(0.045, 0.0545, -0.004); g.add(rotulo.malla);
  // los LED, en la cara, debajo del rótulo (cerca de los puertos)
  const leds = [0x2EBD6B, 0x2E9BFF, 0xF2B01E].map((c, k) => caja(0.008, 0.003, 0.006, new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), 0.025 + k * 0.02, 0.056, 0.054));
  // los puertos LAN1 y LAN2, delante
  [-0.06, -0.035].forEach((x) => caja(0.016, 0.013, 0.003, mat(0x0d0f11, 0.2, 0.6), x, 0.02, 0.0705));
  return { grupo: g, aletas, leds, LAN: V(-0.06, 0.02, 0.0705), CARA: V(0, 0.05, 0) };
}
