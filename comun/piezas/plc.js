// El armario del plano 7, en metros (el plano lo escala): la placa de montaje con su carril DIN y su canaleta, un PLC
// genérico (sin marca) en el carril (fuente, CPU con pantalla y dos puertos Ethernet, entradas digitales, entradas
// analógicas y un maestro IO-Link) y, debajo, en un perfil de máquina, tres sensores cableados a sus módulos: uno
// inductivo (a las digitales), uno de presión (4-20 mA, a las analógicas) y uno fotoeléctrico IO-Link.
// Devuelve los puntos que hacen falta (los puertos de la CPU, los bornes de cada módulo, los cables de los sensores), los
// LED para encenderlos y la pantalla de la CPU, que se redibuja con escribir(líneas).

import * as THREE from 'three';
import { galvanizado, pintura, conTexturas, etiqueta } from './texturas.js';
import { cajaBisel } from '../motor/utiles.js';

const V3 = THREE.Vector3;
// los mazos del fondo: x en la placa y cuántos hilos; bajan a sus prensaestopas del suelo del armario (y -0,09 su boca)
// la pantalla de la CPU antes de que llegue él (el plano 6 la deja así y el 7 empieza igual)
export const PLC_REPOSO = [['PLC   RUN', '#2EBD6B'], ['RFID  ---', '#6f7a84'], ['PRES  2.41 bar', '#e8eef2'], ['PROX  1', '#e8eef2'], ['IO-L  63 %', '#e8eef2']];
export const MAZOS = [[-0.46, 7], [-0.36, 6], [0.5, 8]];
const mat = (color, metal = 0.2, rug = 0.55, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });

export function crearArmario() {
  const g = new THREE.Group();
  const caja = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(cajaBisel(w, h, d, 0.002), m); o.position.set(x, y, z); g.add(o); return o; };

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
    const tope = new THREE.Box3().setFromObject(s).max.y - 0.002;          // (el cable sale de lo alto de cada uno, que no miden igual)
    const m = mods[n], borne = new V3(m.x - m.w * 0.3, Y - 0.045, ZF + 0.006), arriba = new V3(sx, tope, 0.22);
    const curva = new THREE.CatmullRomCurve3([arriba, new V3(sx, tope + 0.02, 0.2), new V3((sx + borne.x) / 2, 0.36, 0.13), borne.clone().add(new V3(0, -0.02, 0.01)), borne]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 120, 0.0022, 10), negro));
    sensores.push({ n, curva });
  };
  sensor('di', -0.12, (s) => {                                        // inductivo M18, con su LED
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.06, 40), metal); b.position.y = 0.04; s.add(b);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.006, 40), new THREE.MeshBasicMaterial({ color: 0xF2B01E })); l.position.y = 0.072; s.add(l);
  });
  sensor('ai', 0.05, (s) => {                                         // transmisor de presión, con su hexágono
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), metal); h.position.y = 0.012; s.add(h);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 40), metal); b.position.y = 0.042; s.add(b);
  });
  sensor('iol', 0.22, (s) => {                                        // fotoeléctrico IO-Link
    const b = new THREE.Mesh(cajaBisel(0.02, 0.032, 0.014, 0.002), negro); b.position.y = 0.03; s.add(b);
    const o = new THREE.Mesh(new THREE.CircleGeometry(0.005, 32), new THREE.MeshBasicMaterial({ color: 0xD93030 })); o.position.set(0, 0.03, 0.0075); s.add(o);
  });

  // el resto del cableado, el de verdad: alimentación (24 V: rojo y azul oscuro; 230 V: marrón, azul claro y la tierra,
  // verde y amarilla), seguridad (naranja) y las señales de campo (gris y blanco), de cada aparato a las canaletas (la
  // de abajo y la de arriba del armario) y, en mazos con sus bridas, de la de abajo a los prensaestopas del suelo. Más
  // finos y mates que los de comunicación (el Ethernet azul, el coaxial y los de los sensores), para que esos se
  // distingan
  const azar = semilla(7);
  const COL = { rojo: 0xa3271f, azulOsc: 0x1b2a55, marron: 0x5a3a22, azulCl: 0x4f86b8, gris: 0x6d7378, blanco: 0xd5d3cc, naranja: 0xc8641e, tierra: 0x6b9e3a };
  const mats = {};
  const hilo = (puntos, color, r = 0.0012) => {
    const m = mats[color] || (mats[color] = mat(COL[color], 0.0, 0.75));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 64, r, 10), m));
  };
  const CANAL_ABAJO = 0.362, CANAL_ARRIBA = 0.72, ZC = 0.03;
  // de un borne (x, y, z) a la canaleta de abajo o a la de arriba, con una curva
  const aCanal = (x, y, z, color, arriba = false, dx = 0) => {
    const yc = arriba ? CANAL_ARRIBA : CANAL_ABAJO, s = arriba ? 1 : -1;
    hilo([new V3(x, y, z), new V3(x, y + s * 0.012, z + 0.004), new V3(x + dx * 0.5, (y + yc) / 2, (z + ZC) / 2 + 0.01), new V3(x + dx, yc - s * 0.01, ZC), new V3(x + dx, yc + s * 0.004, ZC)], color);   // (entra en la canaleta: antes acababa volviendo sobre sí)
  };
  const alto = Y + 0.0625, bajo = Y - 0.0625;
  // la fuente: 230 V abajo (fase, neutro, tierra) y 24 V arriba, a repartir
  [['marron', -0.02], ['azulCl', 0], ['tierra', 0.02]].forEach(([c, dx]) => aCanal(mods.fuente.x + dx, bajo, ZF - 0.01, c, false, dx * 0.5));
  [['rojo', -0.012], ['azulOsc', 0.012]].forEach(([c, dx]) => aCanal(mods.fuente.x + dx, alto, ZF - 0.01, c, true, dx));
  // la CPU y los módulos: 24 V arriba; las entradas, abajo (además del cable del sensor)
  for (const n of ['cpu', 'di', 'ai', 'iol']) {
    const m = mods[n];
    [['rojo', -0.008], ['azulOsc', 0.004]].forEach(([c, dx]) => aCanal(m.x + dx, alto, ZF - 0.012, c, true, dx * 2));
    if (n !== 'cpu') for (let k = 1; k < 4; k++) aCanal(m.x - m.w * 0.3 + k * m.w * 0.2, Y - 0.05, ZF + 0.004, ['gris', 'blanco', 'naranja'][k - 1], false, (azar() - 0.5) * 0.02);
  }
  // las bornas de paso: arriba y abajo
  for (let k = 0; k < 14; k++) {
    const x = 0.37 + k * 0.0064, c = k === 13 ? 'tierra' : k % 4 === 3 ? 'azulOsc' : ['rojo', 'gris', 'naranja'][k % 3];
    aCanal(x, 0.548, 0.05, c, true, (azar() - 0.5) * 0.03);
    aCanal(x, 0.492, 0.05, k === 13 ? 'tierra' : ['marron', 'gris', 'blanco'][k % 3], false, (azar() - 0.5) * 0.03);
  }
  // el lector y el edge: su alimentación, de abajo a la canaleta
  aCanal(-0.4, 0.432, 0.02, 'gris', false, 0.01); aCanal(-0.392, 0.432, 0.02, 'gris', false, 0.012);
  aCanal(0.3, 0.452, 0.02, 'rojo', false, 0.01); aCanal(0.306, 0.452, 0.02, 'azulOsc', false, 0.012);
  // los mazos, de la canaleta de abajo a los prensaestopas del suelo del armario, con sus bridas
  const brida = mat(0xe8e6df, 0, 0.6);   // (acaban en lo alto de su prensaestopas: MAZOS, que planta.js pone en el suelo)
  for (const [x0, n] of MAZOS) {
    const colores = ['marron', 'azulCl', 'tierra', 'gris', 'blanco', 'naranja', 'rojo', 'azulOsc'];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, rx = 0.005 * Math.cos(a), rz = 0.005 * Math.sin(a), gira = (y) => 0.6 * y;
      const p = (y, z) => new V3(x0 + rx * Math.cos(gira(y)) - rz * Math.sin(gira(y)), y, z + rx * Math.sin(gira(y)) + rz * Math.cos(gira(y)));
      hilo([p(0.3, ZC), p(0.22, ZC + 0.01), p(0.1, ZC + 0.05), p(-0.02, 0.13), p(-0.065, 0.178), p(-0.09, 0.185)], colores[k % colores.length], 0.0013);
    }
    for (const [y, z] of [[0.24, ZC + 0.008], [0.12, ZC + 0.045], [0.0, 0.115]]) {
      const b = new THREE.Mesh(new THREE.TorusGeometry(0.0075, 0.0012, 8, 32), brida); b.position.set(x0, y, z); b.rotation.x = Math.PI / 2 - 0.3; g.add(b);
    }
  }

  return { grupo: g, mods, leds, ledsCPU, puertos, escribir, sensores, Y, ZF };
}
// azar con semilla (el mismo cableado cada vez)
function semilla(s) { return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); }
