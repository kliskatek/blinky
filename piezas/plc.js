// El armario del plano 7, en metros (el plano lo escala): la placa de montaje con su carril DIN y su canaleta, un PLC
// genérico (sin marca) en el carril (fuente, CPU con pantalla y dos puertos Ethernet, entradas digitales, entradas
// analógicas y un maestro IO-Link) y, debajo, en un perfil de máquina, tres sensores cableados a sus módulos: uno
// inductivo (a las digitales), uno de presión (4-20 mA, a las analógicas) y uno fotoeléctrico IO-Link.
// Devuelve los puntos que hacen falta (los puertos de la CPU, los bornes de cada módulo, los cables de los sensores), los
// LED para encenderlos y la pantalla de la CPU, que se redibuja con escribir(líneas).

import * as THREE from 'three';
import { galvanizado, pintura, conTexturas, etiqueta } from './texturas.js';

const V3 = THREE.Vector3;
const mat = (color, metal = 0.2, rug = 0.55, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });

export function crearArmario() {
  const g = new THREE.Group();
  const caja = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };

  // placa de montaje (galvanizada), carril DIN (con sus ranuras) y canaleta (con sus peines y su tapa)
  caja(1.5, 0.95, 0.02, conTexturas(mat(0x8a9097, 0.6, 1), galvanizado(), 9, 6), 0.05, 0.5, -0.01);
  caja(1.15, 0.035, 0.008, mat(0xc9cdd1, 0.85, 0.3), 0.05, 0.52, 0.004);
  const hueco = mat(0x23272b, 0.3, 0.7), peine = mat(0x6a7076, 0.1, 0.8);
  for (let x = -0.52; x < 0.62; x += 0.025) caja(0.015, 0.006, 0.002, hueco, x, 0.52, 0.0085);
  caja(1.15, 0.06, 0.06, mat(0x9aa0a6, 0.1, 0.7), 0.05, 0.33, 0.03);
  for (let x = -0.515; x < 0.62; x += 0.012) caja(0.003, 0.003, 0.058, peine, x, 0.3615, 0.03);   // los peines, arriba
  caja(1.15, 0.004, 0.003, hueco, 0.05, 0.352, 0.0605);                                           // la junta de la tapa
  // las bornas de paso, a la derecha del edge, con sus topes (gris, azul el neutro, verde y amarillo la tierra)
  for (let k = 0; k < 14; k++) {
    const c = k === 13 ? 0x6b9e3a : k % 4 === 3 ? 0x3d6fb3 : 0x8d9399;
    caja(0.0058, 0.06, 0.045, mat(c, 0.05, 0.6), 0.37 + k * 0.0064, 0.52, 0.0305);
    caja(0.004, 0.006, 0.002, hueco, 0.37 + k * 0.0064, 0.54, 0.0535);                          // el tornillo de arriba
  }
  for (const x of [0.364, 0.461]) caja(0.006, 0.05, 0.035, mat(0x2a2f35, 0.3, 0.5), x, 0.52, 0.0255);

  // los módulos, de izquierda a derecha en el carril: [nombre, ancho, color]
  const Y = 0.52, PROF = 0.11, ZF = 0.008 + PROF;                 // frente de los módulos
  const mods = {};
  let x = -0.32;
  for (const [nombre, w, color] of [['fuente', 0.07, 0x5c6670], ['cpu', 0.11, 0x2b3036], ['di', 0.04, 0x353b42], ['ai', 0.04, 0x353b42], ['iol', 0.05, 0x353b42]]) {
    const cx = x + w / 2;
    caja(w - 0.002, 0.125, PROF, conTexturas(mat(color, 0.3, 0.9), pintura(), 0.5, 1), cx, Y, 0.008 + PROF / 2);
    mods[nombre] = { x: cx, w };
    x += w;
  }
  // bornas (naranjas) abajo y una fila de LED arriba en cada módulo de E/S
  const leds = {};
  for (const n of ['di', 'ai', 'iol']) {
    const m = mods[n];
    for (let k = 0; k < 4; k++) caja(m.w * 0.18, 0.012, 0.006, mat(0xF28C28, 0.1, 0.6), m.x - m.w * 0.3 + k * m.w * 0.2, Y - 0.045, ZF + 0.003);
    leds[n] = [0, 1, 2, 3].map((k) => caja(0.004, 0.004, 0.003, new THREE.MeshBasicMaterial({ color: 0x1d5a33 }), m.x - m.w * 0.3 + k * m.w * 0.2, Y + 0.045, ZF + 0.002));
  }
  // los rótulos impresos de cada módulo
  const rotulo = (n, lineas, y) => { const m = mods[n], r = etiqueta(lineas, m.w * 0.6, 0.008 * lineas.length); r.position.set(m.x, Y + y, ZF + 0.0008); g.add(r); };
  rotulo('fuente', ['PS 24 V DC', '2,5 A'], 0.012); rotulo('cpu', ['CPU 1215C'], 0.054);
  rotulo('di', ['DI 8×24V'], 0.02); rotulo('ai', ['AI 4×I/U'], 0.02); rotulo('iol', ['IO-Link 4P'], 0.02);
  // la fuente: un LED verde fijo
  caja(0.005, 0.005, 0.003, new THREE.MeshBasicMaterial({ color: 0x2EBD6B }), mods.fuente.x, Y + 0.045, ZF + 0.002);

  // la CPU: pantalla, LED de estado y dos puertos RJ45 abajo
  const c = mods.cpu;
  const lienzo = document.createElement('canvas'); lienzo.width = 512; lienzo.height = 288;
  const tex = new THREE.CanvasTexture(lienzo); tex.colorSpace = THREE.SRGBColorSpace;
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.044), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  pantalla.position.set(c.x, Y + 0.022, ZF + 0.001); g.add(pantalla);
  const ledsCPU = [0x2EBD6B, 0xF2B01E, 0xD93030].map((col, k) => caja(0.005, 0.005, 0.003, new THREE.MeshBasicMaterial({ color: col }), c.x - 0.04 + k * 0.012, Y - 0.012, ZF + 0.002));
  const puertos = [-0.022, 0.022].map((dx) => {
    caja(0.016, 0.014, 0.004, mat(0x0d0f11, 0.2, 0.6), c.x + dx, Y - 0.042, ZF + 0.002);
    return new V3(c.x + dx, Y - 0.042, ZF + 0.004);
  });
  let ultimo = '';
  const escribir = (lineas) => {
    const s = lineas.join('|'); if (s === ultimo) return; ultimo = s;
    const q = lienzo.getContext('2d');
    q.fillStyle = '#0b1a14'; q.fillRect(0, 0, 512, 288);
    q.font = '600 34px Oxanium, "Segoe UI", monospace';
    lineas.forEach(([txt, col], i) => { q.fillStyle = col; q.fillText(txt, 22, 52 + i * 52); });
    tex.needsUpdate = true;
  };

  // el perfil de máquina y los tres sensores, con sus cables subiendo a las bornas
  caja(0.62, 0.025, 0.05, mat(0x6e767d, 0.6, 0.4), 0.05, 0.11, 0.22);
  const sensores = [];
  const metal = mat(0xb5bbc1, 0.8, 0.3), negro = mat(0x1d2024, 0.2, 0.6);
  const sensor = (n, sx, cuerpo) => {
    // un poco más grandes que de verdad (× 1,8), para que se lean en el plano general
    const s = new THREE.Group(); s.position.set(sx, 0.125, 0.22); s.scale.setScalar(1.8); g.add(s); cuerpo(s);
    const m = mods[n], borne = new V3(m.x - m.w * 0.3, Y - 0.045, ZF + 0.006), arriba = new V3(sx, 0.26, 0.22);
    const curva = new THREE.CatmullRomCurve3([arriba, new V3(sx, 0.28, 0.2), new V3((sx + borne.x) / 2, 0.36, 0.13), borne.clone().add(new V3(0, -0.02, 0.01)), borne]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 60, 0.0022, 6), negro));
    sensores.push({ n, curva });
  };
  sensor('di', -0.12, (s) => {                                        // inductivo M18, con su LED
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.06, 20), metal); b.position.y = 0.04; s.add(b);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.006, 20), new THREE.MeshBasicMaterial({ color: 0xF2B01E })); l.position.y = 0.072; s.add(l);
  });
  sensor('ai', 0.05, (s) => {                                         // transmisor de presión, con su hexágono
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), metal); h.position.y = 0.012; s.add(h);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 20), metal); b.position.y = 0.042; s.add(b);
  });
  sensor('iol', 0.22, (s) => {                                        // fotoeléctrico IO-Link
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.032, 0.014), negro); b.position.y = 0.03; s.add(b);
    const o = new THREE.Mesh(new THREE.CircleGeometry(0.005, 16), new THREE.MeshBasicMaterial({ color: 0xD93030 })); o.position.set(0, 0.03, 0.0075); s.add(o);
  });

  return { grupo: g, mods, leds, ledsCPU, puertos, escribir, sensores, Y, ZF };
}
