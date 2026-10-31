// La placa del tag alrededor del ROCKY100, dibujada una sola vez y montada a dos escalas: entera en el tag (piezas/tag.js,
// planos 2 y 5) y de cerca, a la escala del chip abierto (planos 3 y 5) y del sensor (plano 4). Antes cada escala tenía
// la suya y no casaban: de cerca solo había el ROCKY100, el sensor y dos pistas.
//
// Coordenadas: las del plano 3 (1 mm = 1,55; el ROCKY100 en el origen, la cara de la placa en y = 0, la antena hacia −x
// y el sensor hacia +x). El tag lo monta girado y a 1/ESC (ESC = 28,2: el ROCKY100 mide 6,2 aquí y 0,22 en el tag):
// x del tag = −z / ESC, z del tag = x / ESC + TAG.rocky.z.
//
// El circuito: el dipolo y su alimentación (con las bobinas de adaptación y el condensador entre los brazos) a RF+ y
// RF−; el bus SPI al sensor de temperatura (CS, SCK con su resistencia en serie, MOSI y MISO, por donde corre Blinky);
// VBAT a su condensador de tántalo; VREGL y VDD a sus condensadores de desacoplo; GLOAD a su resistencia; EV4 a un punto
// de test; VIO, que alimenta al sensor, con el suyo. Debajo, el plano de masa (con sus vías y el aislamiento de cada
// pista) y la serigrafía (contornos, referencias y el punto de la pata 1).
import * as THREE from 'three';
import { QFN, crearPista } from './rocky.js';
import { cajaBisel } from '../utiles.js';

export const ESC = QFN.W / 0.22;
const o = (k) => (k - 1.5) * QFN.PASO, W2 = QFN.W / 2;
// el sensor (DFN-8, 4 patas por lado cada 0,5): MOSI le entra por la pata 1 de su izquierda y MISO sale por la 2
export const SENSOR = { x: 12.6, z: o(2) + 0.25, w: 2.2, paso: 0.5 };
const S2 = SENSOR.w / 2, XI = SENSOR.x - S2 - 0.03, XD = SENSOR.x + S2 + 0.03;   // el extremo de sus patas, a cada lado
const zs = (k) => SENSOR.z + (k - 1.5) * SENSOR.paso;
// el tag, en estas coordenadas: de x = BORDE[0] a BORDE[1] (sus 1,0 de ancho) y z = ±LARGO (sus 4,2 de largo)
export const BORDE = [(-0.5 + 0.15) * ESC, (0.5 + 0.15) * ESC], LARGO = 2.1 * ESC;
const X_DIPOLO = (-0.43 + 0.15) * ESC, ANCHO_DIPOLO = 0.05 * ESC, HUECO = 0.015 * ESC, X_BOBINA = (-0.33 + 0.15) * ESC;

const zMISO = o(2) + 0.5, xQ = 4.2 + (o(3) - zMISO);
// las pistas: [puntos, ancho, red]; las de la antena, aparte (otro material: se encienden con ella)
export const ANTENA = [
  [[[X_DIPOLO, -HUECO - ANCHO_DIPOLO / 2], [X_DIPOLO, -LARGO + 1.7 + ANCHO_DIPOLO / 2]], ANCHO_DIPOLO],   // (con sus puntas redondas, de ±HUECO a las de siempre)
  [[[X_DIPOLO, HUECO + ANCHO_DIPOLO / 2], [X_DIPOLO, LARGO - 1.7 - ANCHO_DIPOLO / 2]], ANCHO_DIPOLO],
  [[[-W2, o(0)], [X_DIPOLO, o(0)]], 0.5],                         // RF+ (la que lleva a Blinky)
  [[[-W2, o(3)], [X_DIPOLO, o(3)]], 0.5],                         // RF−
];
export const PISTAS = [
  [[[W2, o(2)], [XI, o(2)]], 0.32, 'MOSI'],
  [[[W2, o(3)], [4.2, o(3)], [xQ, zMISO], [XI, zMISO]], 0.32, 'MISO'],
  [[[W2, o(1)], [8.4, o(1)], [8.4 + (zs(0) - o(1)), zs(0)], [XI, zs(0)]], 0.32, 'SCK'],
  [[[W2, o(0)], [14.7, o(0)], [14.7, zs(0)], [XD, zs(0)]], 0.32, 'CS'],
  [[[XI, zs(3)], [10.9, zs(3)], [10.9, 2.3]], 0.32, 'GND'],
  [[[0.504, W2], [0.504, 4.6], [1.0, 5.1], [15.3, 5.1], [15.3, zs(3)], [XD, zs(3)]], 0.32, 'VIO'],
  [[[14.78, 3.3], [15.3, 3.3]], 0.32, 'VIO'],
  [[[12.6, 3.3], [13.22, 3.3]], 0.32, 'GND'],
  [[[o(0), W2], [o(0), 3.9]], 0.32, 'GND'],
  [[[o(1), W2], [o(1), 6.0], [-0.85, 6.0]], 0.4, 'VBAT'],
  [[[-3.95, 6.0], [-4.9, 6.0]], 0.4, 'GND'],
  [[[o(0), -W2], [o(0), -4.62]], 0.32, 'VREGL'], [[[o(0), -6.18], [o(0), -6.9]], 0.32, 'GND'],
  [[[o(2), -W2], [o(2), -4.62]], 0.32, 'VDD'], [[[o(2), -6.18], [o(2), -6.9]], 0.32, 'GND'],
  [[[o(1), -W2], [o(1), -6.02]], 0.32, 'GLOAD'], [[[o(1), -7.58], [o(1), -8.4]], 0.32, 'GND'],
  [[[o(3), -W2], [o(3), -4.0], [2.8, -5.29], [2.8, -6.3]], 0.32, 'EV4'],
];
// los componentes: tipo (C cerámico, R resistencia, L bobina, T tántalo, TP punto de test), referencia, centro, largo
// (entre sus dos terminales), ancho, alto y si va a lo largo de z
export const COMPONENTES = [
  ['L', 'L1', X_BOBINA, o(0), 0.06 * ESC, 0.035 * ESC, 0.025 * ESC, false],
  ['L', 'L2', X_BOBINA, o(3), 0.06 * ESC, 0.035 * ESC, 0.025 * ESC, false],
  ['C', 'C5', X_DIPOLO, 0, 0.05 * ESC, 0.035 * ESC, 0.025 * ESC, true],
  ['T', 'C1', -2.4, 6.0, 3.1, 1.94, 1.4, false],
  ['C', 'C2', o(0), -5.4, 1.55, 0.78, 0.55, true],
  ['C', 'C3', o(2), -5.4, 1.55, 0.78, 0.55, true],
  ['R', 'R1', o(1), -6.8, 1.55, 0.78, 0.5, true],
  ['R', 'R2', 6.2, o(1), 1.55, 0.78, 0.5, false],
  ['C', 'C4', 14.0, 3.3, 1.55, 0.78, 0.55, false],
  ['TP', 'TP1', 2.8, -6.9, 1.4, 1.4, 0.05, false],
];
// las vías a masa al final de las pistas de GND (y las que cosen el plano de masa, en vias())
const VIAS_GND = [[10.9, 2.55], [12.35, 3.3], [o(0), 4.15], [-5.15, 6.0], [o(0), -7.15], [o(2), -7.15], [o(1), -8.65]];
// el plano de masa: de un lado al otro del tag, entre la alimentación de la antena y el borde (no llega al dipolo)
const MASA = { x0: -6.2, x1: BORDE[1] - 0.6, z0: -11, z1: 11 };
const AISLA = 0.3, R_VIA = 0.46;
// el trozo de placa que montan los planos 3 y 5 (con su grosor de verdad: 1,27 mm) y hasta dónde llegan sus pistas
export const RECORTE_CERCA = [BORDE[0], BORDE[1], -20, 20];
export const PLACA_CERCA = { x0: BORDE[0], x1: BORDE[1], z0: -20, z1: 20, px: 80, grueso: 0.07 * ESC };
// y el del plano 4, alrededor del sensor
export const RECORTE_SENSOR = [SENSOR.x - 8.5, BORDE[1], SENSOR.z - 6, SENSOR.z + 6];
export const PLACA_SENSOR = { x0: SENSOR.x - 8.5, x1: BORDE[1], z0: SENSOR.z - 6, z1: SENSOR.z + 6, px: 160, grueso: 0.07 * ESC };

// lo que no puede pisar una vía de cosido: pistas, componentes, los dos chips
function libre(x, z) {
  const d2seg = (px, pz, [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, u = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
    return Math.hypot(px - ax - u * dx, pz - az - u * dz);
  };
  for (const [pts, w] of [...PISTAS, ...ANTENA]) for (let i = 1; i < pts.length; i++) if (d2seg(x, z, pts[i - 1], pts[i]) < w / 2 + AISLA + R_VIA + 0.15) return false;
  for (const [, , cx, cz, l, a, , enZ] of COMPONENTES) {
    const [hx, hz] = enZ ? [a / 2, l / 2] : [l / 2, a / 2];
    if (Math.abs(x - cx) < hx + 0.9 && Math.abs(z - cz) < hz + 0.9) return false;
  }
  if (Math.abs(x) < W2 + 1.2 && Math.abs(z) < W2 + 1.2) return false;
  if (Math.abs(x - SENSOR.x) < S2 + 1.0 && Math.abs(z - SENSOR.z) < S2 + 1.0) return false;
  return VIAS_GND.every(([vx, vz]) => Math.hypot(x - vx, z - vz) > 1.6);
}
let cosido = null;
export function vias() {
  if (!cosido) {
    cosido = [];
    for (let x = MASA.x0 + 1; x < MASA.x1 - 0.6; x += 2.1) for (let z = MASA.z0 + 1; z < MASA.z1 - 0.6; z += 2.1) {
      const dz = ((Math.round(x * 7) % 3) - 1) * 0.25;                // (un poco al tresbolillo: a mano)
      if (libre(x, z + dz)) cosido.push([x, z + dz]);
    }
  }
  return [...VIAS_GND, ...cosido];
}

// Pinta la máscara, el plano de masa (con el aislamiento de cada pista), las vías y la serigrafía en un canvas que ya
// tiene la transformación de estas coordenadas a sus píxeles
export function pintarPlaca(g) {
  g.save();
  const rr = (x0, z0, x1, z1, r) => { g.beginPath(); g.roundRect(x0, z0, x1 - x0, z1 - z0, r); };
  g.fillStyle = '#2a7552'; rr(MASA.x0, MASA.z0, MASA.x1, MASA.z1, 0.8); g.fill();          // el cobre, bajo la máscara
  g.save(); g.clip();                                                                      // (el aislamiento, solo dentro)
  g.lineCap = g.lineJoin = 'round';
  const trazo = (pts, w) => { g.lineWidth = w; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.stroke(); };
  g.strokeStyle = '#1b5039';                                                               // el aislamiento
  for (const [pts, w, red] of PISTAS) if (red !== 'GND') trazo(pts, w + 2 * AISLA);
  for (const [pts, w] of ANTENA) trazo(pts, w + 2 * AISLA);
  g.fillStyle = '#1b5039';
  for (const [, , cx, cz, l, a, , enZ] of COMPONENTES) { const [hx, hz] = enZ ? [a / 2, l / 2] : [l / 2, a / 2]; rr(cx - hx - AISLA, cz - hz - AISLA, cx + hx + AISLA, cz + hz + AISLA, 0.2); g.fill(); }
  rr(-W2 - AISLA, -W2 - AISLA, W2 + AISLA, W2 + AISLA, 0.3); g.fill();
  rr(SENSOR.x - S2 - AISLA, SENSOR.z - S2 - AISLA, SENSOR.x + S2 + AISLA, SENSOR.z + S2 + AISLA, 0.3); g.fill();
  g.strokeStyle = '#2a7552';                                                               // las de masa, unidas al plano
  for (const [pts, w, red] of PISTAS) if (red === 'GND') trazo(pts, w + 0.1);
  g.restore();
  // las vías: el anillo de cobre (más claro bajo la máscara) y el agujero
  for (const [x, z] of vias()) {
    g.fillStyle = '#5f9a6d'; g.beginPath(); g.arc(x, z, R_VIA, 0, 7); g.fill();
    g.fillStyle = '#0b1a12'; g.beginPath(); g.arc(x, z, R_VIA * 0.45, 0, 7); g.fill();
  }
  // la serigrafía: contornos, referencias, el punto de la pata 1 de cada chip
  g.strokeStyle = g.fillStyle = 'rgba(240,242,236,.92)'; g.lineWidth = 0.14;
  const marco = (x0, z0, x1, z1) => { g.beginPath(); g.rect(x0, z0, x1 - x0, z1 - z0); g.stroke(); };
  // (la letra, a 100 px y escalada: con tamaños de menos de un píxel, el navegador la redondea)
  const rotulo = (txt, x, z, alto = 0.8) => {
    g.save(); g.translate(x, z); g.scale(alto / 100, alto / 100);
    g.font = '700 100px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0); g.restore();
  };
  for (const [tipo, ref, cx, cz, l, a, , enZ] of COMPONENTES) {
    const [hx, hz] = enZ ? [a / 2 + 0.3, l / 2 + 0.3] : [l / 2 + 0.3, a / 2 + 0.3];
    if (tipo === 'TP') { g.beginPath(); g.arc(cx, cz, l / 2 + 0.3, 0, 7); g.stroke(); rotulo(ref, cx, cz + l / 2 + 0.9); continue; }
    marco(cx - hx, cz - hz, cx + hx, cz + hz);
    if (tipo === 'T') { g.fillRect(cx + hx - 0.45, cz - hz, 0.3, 2 * hz); }               // la banda del ánodo
    enZ ? rotulo(ref, cx - hx - 0.75, cz, 0.7) : rotulo(ref, cx, cz - hz - 0.55, 0.7);
  }
  marco(-W2 - 0.45, -W2 - 0.45, W2 + 0.45, W2 + 0.45); rotulo('U1', -W2 - 1.4, -W2 - 0.2);
  g.beginPath(); g.arc(-W2 - 0.75, -W2 - 0.75 + 0.0, 0.22, 0, 7); g.fill();
  marco(SENSOR.x - S2 - 0.4, SENSOR.z - S2 - 0.4, SENSOR.x + S2 + 0.4, SENSOR.z + S2 + 0.4); rotulo('U2', SENSOR.x, SENSOR.z + S2 + 1.1);
  g.beginPath(); g.arc(SENSOR.x - S2 - 0.7, SENSOR.z - S2 - 0.3, 0.2, 0, 7); g.fill();
  rotulo('KLK-SID  rev C', 7.5, -9.6, 0.9);
  g.restore();
}

// la textura de la cara de la placa para un trozo [x0, x1] × [z0, z1], a px píxeles por unidad (de cerca)
const texturas = {};
export function texturaPlaca(x0, x1, z0, z1, px) {
  const clave = [x0, x1, z0, z1, px].join();
  if (texturas[clave]) return texturas[clave];
  const c = document.createElement('canvas'); c.width = Math.round((x1 - x0) * px); c.height = Math.round((z1 - z0) * px);
  const g = c.getContext('2d');
  g.fillStyle = '#1f5a3e'; g.fillRect(0, 0, c.width, c.height);
  g.setTransform(px, 0, 0, px, -x0 * px, -z0 * px);
  pintarPlaca(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return (texturas[clave] = t);
}

// el marcado del sensor (inventado): un sensor digital de temperatura
let marcado = null;
function marcadoSensor() {
  if (marcado) return marcado;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1e22'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#a3abb2'; g.textAlign = 'center';
  g.font = '700 70px Oxanium, "Segoe UI", sans-serif'; g.fillText('TEMP', 256, 230);
  g.font = '600 50px Oxanium, "Segoe UI", sans-serif'; g.fillText('SENSOR', 256, 310);
  g.beginPath(); g.arc(70, 440, 22, 0, Math.PI * 2); g.fillStyle = '#2b3035'; g.fill();
  marcado = new THREE.CanvasTexture(c); marcado.colorSpace = THREE.SRGBColorSpace; marcado.anisotropy = 16;
  return marcado;
}

const plataM = () => new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.72, roughness: 0.28 });
const CUERPO = { C: [0xb39468, 0.0, 0.55], R: [0x17191c, 0.0, 0.6], L: [0x4d5258, 0.2, 0.5], T: [0xd99a2b, 0.0, 0.45] };

// Monta en padre (en estas coordenadas: el que llama lo pone a su escala) las pistas, los componentes y, si se pide, el
// sensor cerrado y la placa con su cara pintada (de x0 a x1 y de z0 a z1).
//   cobre, cobreAntena: los materiales de las pistas; cu: { y, grueso } del cobre (de cerca, fino: Blinky corre por él)
//   placa: { x0, x1, z0, z1, px, grueso } o null; sensor: true para ponerlo
// Devuelve { sensor, patasS (las 4 de su izquierda, de z menor a mayor), patasSD (las de la derecha) }.
export function montarPlaca(padre, { cobre, cobreAntena = cobre, cu = { y: 0.012, grueso: 0.012 }, placa = null, sensor = true, recorte = null }) {
  const dentro = (pts) => !recorte || pts.some(([x, z]) => x >= recorte[0] && x <= recorte[1] && z >= recorte[2] && z <= recorte[3]);
  const corta = (pts) => (recorte ? pts.map(([x, z]) => [Math.max(recorte[0], Math.min(recorte[1], x)), Math.max(recorte[2], Math.min(recorte[3], z))]) : pts);
  for (const [pts, w] of ANTENA) if (dentro(pts)) padre.add(crearPista(corta(pts), cu.y, w, cobreAntena, cu.grueso));
  for (const [pts, w] of PISTAS) if (dentro(pts)) padre.add(crearPista(corta(pts), cu.y, w, cobre, cu.grueso));
  const plata = plataM(), arriba = cu.y + cu.grueso / 2;
  for (const [tipo, , cx, cz, l, a, h, enZ] of COMPONENTES) {
    if (recorte && !dentro([[cx, cz]])) continue;
    const c = new THREE.Group(); c.position.set(cx, arriba, cz); if (enZ) c.rotation.y = Math.PI / 2; padre.add(c);
    if (tipo === 'TP') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(l / 2, l / 2, 0.06, 40), new THREE.MeshStandardMaterial({ color: 0xE0B455, metalness: 0.75, roughness: 0.3 }));
      m.position.y = 0.03; c.add(m); continue;
    }
    const [color, metal, rug] = CUERPO[tipo];
    const cuerpo = new THREE.Mesh(cajaBisel(l * 0.98, h * 0.96, a * 0.96, 0.05 * h + 0.01), new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug }));
    cuerpo.position.y = h * 0.48; c.add(cuerpo);
    const fin = tipo === 'T' ? 0.12 : 0.2;                           // los terminales: estañados, abrazan cada extremo
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(cajaBisel(l * fin, h, a, 0.06 * h + 0.01), plata); t.position.set(s * l * (0.5 - fin / 2), h / 2, 0); c.add(t);
    }
    if (tipo === 'T') {                                              // la banda del ánodo
      const b = new THREE.Mesh(cajaBisel(l * 0.1, h * 0.02, a * 0.9, 0.01), new THREE.MeshStandardMaterial({ color: 0x7a4a14, roughness: 0.5 }));
      b.position.set(l * 0.28, h * 0.97, 0); c.add(b);
    }
    if (tipo === 'R') {                                              // la cara de la resistencia, blanca por los lados
      const lado = new THREE.Mesh(cajaBisel(l * 0.6, h * 0.7, a * 0.985, 0.01), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.7 }));
      lado.position.y = h * 0.36; c.add(lado);
    }
  }
  let sensorM = null; const patasS = [], patasSD = [];
  if (sensor) {
    const negro = new THREE.MeshStandardMaterial({ color: 0x1b1f23, roughness: 0.62 });
    sensorM = new THREE.Mesh(cajaBisel(SENSOR.w, 0.55, SENSOR.w, 0.05), [negro, negro, new THREE.MeshStandardMaterial({ map: marcadoSensor(), roughness: 0.6 }), negro, negro, negro]);
    sensorM.position.set(SENSOR.x, 0.275, SENSOR.z); padre.add(sensorM);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(cajaBisel(0.03, 0.12, 0.23, 0.006), plata.clone());
      p.position.set(SENSOR.x + s * (S2 + 0.015), 0.06, zs(k)); padre.add(p);
      (s < 0 ? patasS : patasSD).push(p);
    }
  }
  if (placa) {
    const { x0, x1, z0, z1, px, grueso } = placa;
    const canto = new THREE.MeshStandardMaterial({ color: 0x9aa47a, roughness: 0.7 });
    const cara = new THREE.MeshStandardMaterial({ map: texturaPlaca(x0, x1, z0, z1, px), roughness: 0.42, metalness: 0.05 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, grueso, z1 - z0), [canto, canto, cara, canto, canto, canto]);
    m.position.set((x0 + x1) / 2, -grueso / 2, (z0 + z1) / 2); padre.add(m);
  }
  return { sensor: sensorM, patasS, patasSD };
}
