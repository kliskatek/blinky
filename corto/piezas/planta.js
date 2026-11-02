// La planta: el sitio en que pasa todo el corto, en metros (cada plano la escala y la pone donde le hace falta). Una nave
// sin techo ni paredes de los lados (para verla de fuera): el suelo, la pared del fondo y, en ella, una entreplanta con
// la oficina de cristal. Delante de la entreplanta, la máquina 2 de la línea 3: dentro, en un extremo, un generador
// movido por un rotor y, sobre la carcasa del generador (donde nadie llega), el tag que la monitoriza (el del plano 2); en
// el otro extremo, su armario eléctrico: uno solo, de chapa, con todo en el mismo carril DIN: el lector RFID (plano 6),
// el PLC (plano 7) y el edge (plano 8). La antena RFID cuelga del borde del forjado de la entreplanta, mirando al
// generador; su coaxial baja por el pilar hasta el armario. Arriba, en la oficina, la sala del plano 10.
// verDentro(k) hace transparente la carcasa de la máquina (0 opaca, 1 se ve dentro); girar(t) mueve el rotor.
//
// crearPlanta() devuelve el grupo y los sitios, en metros de la planta:
//   TAG       { pos, rotY, escala }: dónde va el tag (con esta rotación y escala; el de verdad, ponerTag de
//             piezas/senseread.js); tagSimple es su sustituto de lejos (los planos que montan el de verdad lo esconden)
//   ANTENA    { pos, cara, normal }: la antena (el centro, el centro de la cara y hacia dónde mira)
//   ARMARIO   el origen de crearArmario (planos 7 y 8); LECTOR y EDGE, los del lector y el edge en el carril (de pie)
//   OFICINA   el origen de la sala (montarSala, plano 10: x, z en metros de la sala; el suelo de la oficina en y)
//   monitor, persona: los de la oficina (para encenderlos o moverlos)

import * as THREE from 'three';
import { crearAntenaPanel, crearLectorFijo } from './lector.js';
import { crearArmario, MAZOS } from './plc.js';
import { crearMonitor, crearPersona } from './sala.js';
import { cajaRedonda } from './tag.js';
import { crearEdge } from './edge.js';
import { cartel } from './cartel.js';
import { L as enIdioma } from '../idioma.js';
import { hormigon, bloques, pintura, cepillado, carton, pegatina, madera, moqueta, etiqueta, conTexturas } from './texturas.js';
import { matLinea, aristas } from '../lineas.js';
import { cajaBisel } from '../utiles.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color, metal = 0.2, rug = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });

export const MAQ = { x0: -2.6, x1: 2.0, z0: -3.9, z1: -2.5, alto: 1.1 };
// el generador, dentro de la máquina (eje en x), y el tag sobre su carcasa, en una placa (1 unidad del tag = 2 cm)
export const GEN = { x: -1.75, y: 0.5, z: -3.2, r: 0.27, largo: 0.75 };
// El tag va de través (su dipolo, en z): la onda de la antena le llega casi a lo largo de la máquina (en x), y un dipolo
// alineado con la dirección de propagación no se excita. Sobre la carcasa, en un taco plano (la carcasa es curva).
export const MONTURA = 0.035;                                         // alto del taco sobre lo alto de la carcasa
export const TAG = { pos: V(GEN.x, GEN.y + GEN.r + MONTURA + 0.0007, GEN.z), rotY: Math.PI / 2, escala: 0.02 };
// el armario: la placa de montaje (crearArmario) con su origen aquí; en el carril (y 0,52), el lector a la izquierda del
// PLC y el edge a la derecha, de pie: girados para que su tapa mire hacia fuera y sus conectores, abajo
export const ARMARIO = V(2.95, 0.6, -2.35);
export const DE_PIE = new THREE.Euler(Math.PI / 2, 0, 0);
export const LECTOR = ARMARIO.clone().add(V(-0.49, 0.52, 0.012));
export const EDGE = ARMARIO.clone().add(V(0.22, 0.52, 0.012));
export const LAN_EDGE = EDGE.clone().add(V(-0.06, -0.0705, 0.02));   // su puerto LAN1 (de pie, los puertos miran abajo)
export const OFICINA = V(-0.5, 3.2, -6.9);
export const ANTENA_POS = V(2.6, 2.68, -4.12);                  // colgada del borde del forjado

export function crearPlanta() {
  const g = new THREE.Group();
  const caja = (w, h, d, m, x, y, z, padre = g) => { const o = new THREE.Mesh(cajaBisel(w, h, d, 0.006), m); o.position.set(x, y, z); padre.add(o); return o; };

  // ---------------------------------------------------------------- la nave
  caja(26, 0.1, 18, conTexturas(mat(0x5a6169, 0.0, 1), hormigon(), 26 / 4, 18 / 4), 0, -0.05, -0.5);   // suelo, de hormigón
  const amarillo = mat(0xd6a52a, 0.0, 0.7);
  for (const z of [-2.2, 2.4]) caja(18, 0.004, 0.08, amarillo, 0, 0.002, z);                    // el pasillo, pintado
  caja(26, 8.5, 0.25, conTexturas(mat(0x58616b, 0.0, 0.9), bloques(), 13, 4.25), 0, 4.25, -8.6);   // pared del fondo, de bloques
  const hormigonPilar = conTexturas(mat(0x5a626b, 0.0, 0.85), hormigon(), 0.15, 2);
  for (let x = -12; x <= 12; x += 6) caja(0.3, 8.5, 0.3, hormigonPilar, x, 4.25, -8.4);   // pilares
  const lampara = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.25, 1.1), toneMapped: false });
  const lamparas = new THREE.Group(); g.add(lamparas);
  const VIGAS = [-6.5, -3.2, 2, 6];
  for (let x = -9; x <= 9; x += 6) for (const z of [-3.2, 2]) {                                      // lámparas, colgadas de las vigas
    caja(1.6, 0.06, 0.3, lampara, x, 7.6, z, lamparas);
    for (const dx of [-0.6, 0.6]) caja(0.012, 0.37, 0.012, mat(0x2a2f35, 0.5, 0.4), x + dx, 7.815, z);
  }
  // el techo, oscuro, que solo se ve desde dentro (desde fuera y desde arriba no tapa), y sus vigas; no echan sombra: si
  // no, toda la nave a oscuras
  const cubierta = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), mat(0x1a1d22, 0, 1)); cubierta.rotation.x = Math.PI / 2; cubierta.position.set(0, 8.5, -0.5);
  cubierta.userData.sinSombra = true; g.add(cubierta);
  for (const z of VIGAS) caja(26, 0.5, 0.18, mat(0x30353b, 0.5, 0.6), 0, 8.25, z).userData.sinSombra = true;

  // ---------------------------------------------------------------- la máquina 2
  const { x0, x1, z0, z1, alto } = MAQ, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = x1 - x0, D = z1 - z0;
  caja(L + 0.1, 0.12, D + 0.1, mat(0x1b1f24, 0.3, 0.6), cx, 0.06, cz);                        // zócalo
  // la carcasa (se puede hacer transparente para ver dentro)
  const carcasa = [conTexturas(mat(0x4f6274, 0.3, 1), pintura(), 3, 1), conTexturas(mat(0x55606b, 0.6, 0.8), cepillado(), 1, 8)];
  const redonda = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(cajaRedonda(w, h, d, 0.04, 0.012), m); o.position.set(x, y, z); g.add(o); return o; };
  const cuerpo = [redonda(L, alto - 0.16, D, carcasa[0], cx, 0.12 + (alto - 0.16) / 2, cz),     // cuerpo (con los cantos redondeados)
    caja(L + 0.04, 0.04, D + 0.04, carcasa[1], cx, alto - 0.02, cz)];                          // tapa
  // en el frente: las juntas de los paneles y las rejillas de ventilación (van con la carcasa)
  const junta = mat(0x1a1f25, 0.3, 0.7);
  carcasa.push(junta);
  for (const x of [x0 + 1.5, x0 + 3.1]) cuerpo.push(caja(0.008, alto - 0.2, 0.004, junta, x, 0.12 + (alto - 0.16) / 2, z1 + 0.002));
  for (const x of [x0 + 0.75, x0 + 3.9]) for (let k = 0; k < 6; k++) cuerpo.push(caja(0.36, 0.012, 0.012, junta, x, 0.5 + k * 0.04, z1 + 0.006));
  for (let k = 0; k < 8; k++) caja(0.2, 0.06, 0.01, k % 2 ? amarillo : mat(0x111316), x0 + 0.25 + k * 0.2, 0.15, z1 + 0.005);   // franja
  const peligro = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), pegatina('tension')); peligro.position.set(0.15, 0.82, z1 + 0.002); g.add(peligro);
  const mando = new THREE.Group(); mando.position.set(-0.2, 0.75, z1 + 0.08); g.add(mando);       // el panel de mando
  caja(0.45, 0.35, 0.14, conTexturas(mat(0xc9ccd0, 0.2, 1), pintura()), 0, 0, 0, mando);
  caja(0.16, 0.1, 0.01, new THREE.MeshBasicMaterial({ color: 0x1d3f5c }), 0.1, 0.07, 0.072, mando);   // su pantallita
  for (const [x, c] of [[0.02, 0xe8e8e8], [0.08, 0x1d1d1d], [0.14, 0xf2b01e]]) {                       // los pulsadores
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 40), mat(c, 0.1, 0.4)); b.rotation.x = Math.PI / 2; b.position.set(x, -0.08, 0.078); mando.add(b);
  }
  caja(0.07, 0.07, 0.03, mat(0xd92b2b, 0.1, 0.4), -0.1, 0, 0.08, mando);                       // la seta
  caja(0.05, 0.05, 0.02, new THREE.MeshBasicMaterial({ color: 0x2EBD6B }), 0.08, 0.07, 0.075, mando);
  // dentro: el generador (con sus aletas), su eje y el rotor que lo mueve
  const G = GEN, aceroOsc = mat(0x2c3238, 0.6, 0.4);
  const gen = new THREE.Mesh(new THREE.CylinderGeometry(G.r, G.r, G.largo, 128), conTexturas(mat(0x3d6f9e, 0.4, 0.9), pintura(), 4, 1)); gen.rotation.z = Math.PI / 2; gen.position.set(G.x, G.y, G.z); g.add(gen);
  caja(0.16, 0.08, 0.14, conTexturas(mat(0x3d6f9e, 0.4, 0.9), pintura()), G.x + 0.12, G.y + G.r + 0.03, G.z - 0.12);   // su caja de bornes
  const placaGen = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), pegatina('placa', ['KLK-G 7.5', '400 V  50 Hz', '7,5 kW', '1450 rpm', 'IP55  cl. F']));
  placaGen.position.set(G.x - G.largo / 2 + 0.191, G.y, G.z + G.r + 0.004); g.add(placaGen);
  for (let k = 0; k < 9; k++) { if (k === 4 || k === 1 || k === 2) continue;                  // (la del medio, no: ahí va la placa del tag; ni las de la placa de características, que la cortaban)
    const a = new THREE.Mesh(new THREE.TorusGeometry(G.r + 0.005, 0.012, 12, 128), mat(0x335e86, 0.4, 0.45)); a.rotation.y = Math.PI / 2; a.position.set(G.x - G.largo / 2 + 0.08 + k * 0.074, G.y, G.z); g.add(a); }
  caja(G.largo * 0.8, G.y - G.r - 0.04, 0.4, aceroOsc, G.x, (G.y - G.r - 0.04) / 2 + 0.12, G.z);   // la bancada
  caja(0.07, MONTURA + 0.02, 0.16, mat(0x9aa0a6, 0.6, 0.35), G.x, G.y + G.r + (MONTURA - 0.02) / 2, G.z).receiveShadow = true;   // el taco del tag
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 48), conTexturas(mat(0xc9cdd1, 0.85, 0.8), cepillado(), 1, 3)); eje.rotation.z = Math.PI / 2; eje.position.set(G.x + G.largo / 2 + 0.5, G.y, G.z); g.add(eje);
  for (const x of [G.x + G.largo / 2 + 0.15, G.x + G.largo / 2 + 0.95]) caja(0.1, G.y - 0.15, 0.16, aceroOsc, x, (G.y - 0.15) / 2 + 0.12, G.z);   // cojinetes
  const rotor = new THREE.Group(); rotor.position.set(G.x + G.largo / 2 + 0.6, G.y, G.z); g.add(rotor);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 64), mat(0x9aa0a6, 0.7, 0.3)); disco.rotation.z = Math.PI / 2; rotor.add(disco);
  for (let k = 0; k < 8; k++) {                                                                 // las palas
    const p = new THREE.Group(); p.rotation.x = k * Math.PI / 4; rotor.add(p);
    caja(0.05, 0.28, 0.1, mat(0xb7bcc2, 0.7, 0.3), 0, 0.24, 0, p).rotation.y = 0.5;
  }
  // el tag, de lejos, a la medida del SenseRead-AT (los planos 2 y 5 ponen el de verdad)
  const tagSimple = caja(0.0224, 0.0016, 0.1397, mat(0x1F5A3E, 0.0, 0.5), TAG.pos.x, TAG.pos.y + 0.0001, TAG.pos.z);
  // al verla por dentro, la carcasa se desvanece y quedan sus aristas, encendidas, como en una radiografía
  const contorno = matLinea({ color: new THREE.Color(0.55, 0.85, 1.4), opacity: 0, toneMapped: false });
  for (const [w, h, d, y] of [[L, alto - 0.16, D, 0.12 + (alto - 0.16) / 2], [L + 0.04, 0.04, D + 0.04, alto - 0.02]]) {
    const l = aristas(new THREE.BoxGeometry(w, h, d), contorno); l.position.set(cx, y, cz); g.add(l);
  }
  const verDentro = (k) => {
    carcasa.forEach((m) => {
      if (m.transparent !== k > 0) { m.transparent = k > 0; m.needsUpdate = true; }   // (si no, three no lo vuelve a compilar y sigue tapando)
      m.opacity = 1 - 0.88 * k; m.depthWrite = k < 0.5;
    });
    cuerpo.forEach((o) => { o.castShadow = k < 0.3; });                       // (transparente, no tapa la luz de dentro)
    contorno.opacity = 0.9 * Math.min(1, k * 1.6); contorno.visible = k > 0.01;
  };
  // ---------------------------------------------------------------- el resto de la línea 3
  // las máquinas 1 y 3, más sencillas, a los lados de la 2, unidas por cintas por las que pasan las piezas; cada máquina
  // con su baliza (verde: funcionando) y la 2, con su placa. Encima, el cartel de la línea
  const otra = (xa, xb, nombre) => {
    const w = xb - xa, mx = (xa + xb) / 2;
    caja(w + 0.1, 0.12, D + 0.1, mat(0x1b1f24, 0.3, 0.6), mx, 0.06, cz);
    redonda(w, alto + 0.25 - 0.16, D, conTexturas(mat(0x4f6274, 0.3, 1), pintura(), 1, 1), mx, 0.12 + (alto + 0.25 - 0.16) / 2, cz);
    caja(w * 0.5, 0.35, D * 0.6, mat(0x3d4a57, 0.3, 0.5), mx, alto + 0.25 + 0.175, cz);                 // el cabezal
    for (let k = 0; k < Math.floor(w / 0.4); k++) caja(0.2, 0.06, 0.01, k % 2 ? amarillo : mat(0x111316), xa + 0.25 + k * 0.4, 0.15, z1 + 0.005);
    const juntaOtra = mat(0x1a1f25, 0.3, 0.7);                                // sus paneles, rejillas y pegatina, como la 2
    for (const x of [xa + w / 3, xa + 2 * w / 3]) caja(0.008, alto + 0.05, 0.004, juntaOtra, x, 0.12 + (alto + 0.09) / 2, z1 + 0.002);
    for (let k = 0; k < 6; k++) caja(0.36, 0.012, 0.012, juntaOtra, xa + w / 6, 0.55 + k * 0.04, z1 + 0.006);
    const rayoOtra = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), pegatina('tension')); rayoOtra.position.set(xa + w / 2, 0.95, z1 + 0.002); g.add(rayoOtra);
    const placa = etiqueta([enIdioma(nombre)], 0.6, 0.18, { fondo: '#1e2731', tinta: '#d7e3ee', alto: 1.3 });   // (impresa)
    placa.position.set(mx, alto + 0.05, z1 + 0.006); g.add(placa);
    return mx;
  };
  const baliza = (x, y) => {                                                   // la baliza de la máquina: verde, ámbar, rojo
    caja(0.03, 0.25, 0.03, mat(0x2a2f35, 0.5, 0.4), x, y + 0.125, cz);
    const luces = [0x2EBD6B, 0xF2B01E, 0xD93030].map((c, i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 40), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: i ? 0.25 : 1, toneMapped: false }));
      m.position.set(x, y + 0.29 + i * 0.085, cz); g.add(m); return m;
    });
    return luces;
  };
  otra(-9.6, -6.2, 'MÁQUINA 1'); otra(6.6, 10.0, 'MÁQUINA 3');
  const placa2 = etiqueta([enIdioma('MÁQUINA 2')], 0.6, 0.18, { fondo: '#1e2731', tinta: '#d7e3ee', alto: 1.3 });
  placa2.position.set(0.6, 0.75, z1 + 0.006); g.add(placa2);
  const balizas = [baliza(-7.9, alto + 0.6), baliza(x1 - 0.25, alto), baliza(8.3, alto + 0.6)];
  const linea = cartel([{ txt: enIdioma('LÍNEA 3'), col: '#ffffff', y: 175, size: 170, x: 512, alinea: 'center' }], 2.2, 0.6, { fondo: 'rgba(28,90,160,.95)', borde: '#ffffff' });
  linea.malla.position.set(0, 4.6, cz); g.add(linea.malla);
  linea.malla.material.side = THREE.FrontSide;                                                 // por las dos caras (desde la oficina se leía en espejo)
  const dorso = linea.malla.clone(); dorso.rotation.y = Math.PI; g.add(dorso);
  for (const x of [-0.8, 0.8]) caja(0.02, 3.1, 0.02, mat(0x2a2f35, 0.5, 0.4), x, 4.6 + 0.3 + 1.55, cz);    // colgado de la viga
  // las cintas, entre la 1 y la 2 y entre la 2 y la 3, con sus piezas, que avanzan
  const cintas = [[-6.2, x0], [x1, 6.6]], yCinta = 0.85, piezas = [], cajaCarton = conTexturas(mat(0xffffff, 0, 0.85), carton());
  const rodillo = mat(0x8a9097, 0.8, 0.35);
  for (const [xa, xb] of cintas) {
    caja(xb - xa, 0.05, 0.42, mat(0x15171a, 0.1, 0.8), (xa + xb) / 2, yCinta, cz);                           // la banda
    for (let x = xa + 0.1; x < xb; x += 0.12) {                                                              // sus rodillos
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 24), rodillo); r.rotation.x = Math.PI / 2; r.position.set(x, yCinta - 0.035, cz); g.add(r);
    }
    for (const z of [cz - 0.23, cz + 0.23]) caja(xb - xa, 0.08, 0.03, mat(0x9aa0a6, 0.6, 0.35), (xa + xb) / 2, yCinta + 0.01, z);   // los bordes
    for (let x = xa + 0.3; x < xb - 0.2; x += 1.2) for (const z of [cz - 0.2, cz + 0.2]) caja(0.05, yCinta, 0.05, mat(0x2a2f35, 0.5, 0.4), x, yCinta / 2, z);   // patas
    for (let k = 0; k < Math.floor((xb - xa) / 0.9); k++) piezas.push({ m: caja(0.22, 0.14, 0.22, cajaCarton, xa, yCinta + 0.1, cz), xa, xb, k });
  }
  const girar = (t) => {
    rotor.rotation.x = t * 9;
    piezas.forEach((p) => {                                                    // las piezas, por la cinta, de una máquina a la otra
      const n = Math.floor((p.xb - p.xa) / 0.9), u = (((t * 0.12 + p.k / n) % 1) + 1) % 1;
      p.m.position.x = p.xa + 0.15 + u * (p.xb - p.xa - 0.3);
    });
    balizas.forEach((b, i) => { b[0].material.opacity = 0.75 + 0.25 * Math.sin(t * 3 + i); });
    persona.cabeza.rotation.y = 0.12 * Math.sin(t * 0.6);                      // el operario, mirando su pantalla, se mueve un poco
    persona.cabeza.rotation.x = 0.04 * Math.sin(t * 0.9 + 1);
  };

  // ---------------------------------------------------------------- el armario eléctrico (planos 6, 7 y 8)
  // De chapa (gris claro), sobre su zócalo, con la puerta abierta. Dentro, la placa de montaje del plano 7 (crearArmario:
  // el carril DIN con el PLC, la canaleta y los sensores de abajo) y, en el mismo carril, el lector RFID y el edge.
  const A = ARMARIO, chapa = conTexturas(mat(0xc4c8cc, 0.3, 1), pintura(), 2, 1), e = 0.02;
  const ax0 = A.x - 0.78, ax1 = A.x + 0.88, ay0 = A.y - 0.12, ay1 = A.y + 1.12, az0 = A.z - 0.05, az1 = A.z + 0.42;
  const aw = ax1 - ax0, ah = ay1 - ay0, ad = az1 - az0, amx = (ax0 + ax1) / 2, amy = (ay0 + ay1) / 2, amz = (az0 + az1) / 2;
  // (su chapa no echa sombra: dentro quedaba todo a oscuras, y lo que se ve del armario es lo de dentro)
  for (const o of [caja(aw, ah, e, chapa, amx, amy, az0),                                    // fondo
    caja(e, ah, ad, chapa, ax0, amy, amz), caja(e, ah, ad, chapa, ax1, amy, amz),            // lados
    caja(aw + 0.04, e * 2, ad + 0.04, chapa, amx, ay1, amz), caja(aw, e, ad, chapa, amx, ay0, amz)]) o.userData.sinSombra = true;   // techo y suelo
  caja(aw + 0.06, ay0, ad + 0.06, mat(0x2a2f35, 0.4, 0.5), amx, ay0 / 2, amz);               // zócalo
  // la puerta, cerrada; cuando Blinky está dentro se hace transparente y quedan sus aristas (verArmario, como verDentro)
  const bisagra = new THREE.Group(); bisagra.position.set(ax0, amy, az1); g.add(bisagra);
  const puerta = [chapa.clone(), mat(0x2a2f35, 0.4, 0.5), mat(0xe9e6df, 0.0, 0.8), pegatina('tension'),
    pegatina('placa', ['=A1 +CP1', 'LÍNEA 3 · MÁQ. 2', '400 V 3~ 50 Hz', '16 A   IP54'])];
  const hojas = [caja(aw, ah, e, puerta[0], aw / 2, 0, 0, bisagra),                          // la puerta
    caja(0.03, 0.18, 0.04, puerta[1], aw - 0.08, 0, 0.03, bisagra),                           // su maneta
    caja(0.32, 0.4, 0.004, puerta[2], aw / 2, 0.2, -0.012, bisagra)];                         // el esquema, por dentro
  for (const y of [-ah / 2 + 0.15, ah / 2 - 0.15]) hojas.push(caja(0.025, 0.08, 0.02, puerta[1], -0.005, y, 0.012, bisagra));   // bisagras
  const rayo = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), puerta[3]); rayo.position.set(aw / 2, ah / 2 - 0.16, e / 2 + 0.001); bisagra.add(rayo);
  const placaA = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), puerta[4]); placaA.position.set(aw / 2, ah / 2 - 0.3, e / 2 + 0.001); bisagra.add(placaA);
  hojas.push(rayo, placaA);
  // la rejilla del ventilador, en el lateral derecho
  for (let k = 0; k < 7; k++) caja(0.006, 0.012, 0.2, mat(0x2a2f35, 0.3, 0.6), ax1 + e / 2 + 0.003, A.y + 0.6 + k * 0.025, amz);
  caja(0.006, 0.22, 0.24, mat(0x3a3f45, 0.3, 0.6), ax1 + e / 2 + 0.001, A.y + 0.675, amz);
  const filos = matLinea({ color: new THREE.Color(0.55, 0.85, 1.4), opacity: 0, toneMapped: false });
  const filo = aristas(new THREE.BoxGeometry(aw, ah, e), filos); filo.position.set(aw / 2, 0, 0); bisagra.add(filo);
  const verArmario = (k) => {
    puerta.forEach((m) => {
      if (m.transparent !== k > 0) { m.transparent = k > 0; m.needsUpdate = true; }
      m.opacity = 1 - k; m.depthWrite = k < 0.5;             // (del todo: con algo de chapa quedaba un velo)
    });
    hojas.forEach((o) => { o.castShadow = k < 0.3; o.visible = k < 0.99; });
    filos.opacity = 0.9 * Math.min(1, k * 1.6); filos.visible = k > 0.01;
  };
  verArmario(0);
  // delante del armario, en el suelo, la zona rayada que hay que dejar libre
  const libre = new THREE.Mesh(new THREE.PlaneGeometry(aw + 0.2, 0.9), pegatina('rayado')); libre.rotation.x = -Math.PI / 2;
  libre.position.set(amx, 0.003, az1 + 0.5); g.add(libre);
  const ranura = mat(0x9aa0a6, 0.1, 0.7);                                                    // canaletas verticales
  const peine = mat(0x6a7076, 0.1, 0.8);
  for (const x of [ax0 + 0.06, ax1 - 0.06]) {
    caja(0.06, ah - 0.15, 0.06, ranura, x, amy, az0 + 0.04);
    for (let y = ay0 + 0.1; y < ay1 - 0.08; y += 0.012) caja(0.003, 0.003, 0.058, peine, x + (x < amx ? 0.0305 : -0.0305), y, az0 + 0.04);   // sus peines
  }
  caja(aw - 0.2, 0.06, 0.06, ranura, amx, A.y + 0.75, az0 + 0.04);                           // y la de arriba
  for (const [x] of MAZOS) caja(0.03, 0.022, 0.03, mat(0x15171a, 0.2, 0.6), A.x + x, ay0 + e / 2 + 0.011, amz);   // los prensaestopas de los mazos, en el suelo
  const arm = crearArmario(); arm.grupo.position.copy(A); g.add(arm.grupo);
  const lector = crearLectorFijo(); lector.grupo.position.copy(LECTOR); lector.grupo.rotation.copy(DE_PIE); g.add(lector.grupo);
  const edge = crearEdge(); edge.grupo.position.copy(EDGE); edge.grupo.rotation.copy(DE_PIE); g.add(edge.grupo);   // el edge (piezas/edge.js)
  lector.grupo.updateMatrix(); edge.grupo.updateMatrix();
  // los dos Ethernet (azules), en metros del armario (los usan los planos 7 y 8): del lector (su puerto, a su derecha) al
  // X1 de la CPU, por debajo de la fuente; y del X2 al LAN1 del edge, corto, por debajo de los módulos
  const red = lector.red.clone().applyMatrix4(lector.grupo.matrix).sub(A), [X1, X2] = arm.puertos;
  const lan = LAN_EDGE.clone().sub(A);
  const ethernet = {
    lectorPLC: new THREE.CatmullRomCurve3([red, red.clone().add(V(0.012, -0.03, 0.03)), V(-0.31, 0.40, 0.10), V(-0.24, 0.42, 0.13),
      X1.clone().add(V(0, -0.04, 0.04)), X1], false, 'centripetal'),
    plcEdge: new THREE.CatmullRomCurve3([X2, X2.clone().add(V(0, -0.035, 0.03)), V(X2.x + 0.04, 0.405, 0.14), V(0.02, 0.4, 0.12),
      V(lan.x - 0.02, 0.405, lan.z + 0.05), V(lan.x, lan.y - 0.03, lan.z + 0.008), lan], false, 'centripetal'),
  };
  const azul = mat(0x2E6FB0, 0.0, 0.5);
  for (const c of [ethernet.lectorPLC, ethernet.plcEdge]) arm.grupo.add(new THREE.Mesh(new THREE.TubeGeometry(c, 320, 0.003, 12), azul));

  // ---------------------------------------------------------------- la antena (plano 6), colgada del forjado, mirando al tag
  const ant = crearAntenaPanel(); ant.grupo.position.copy(ANTENA_POS); ant.grupo.lookAt(TAG.pos); g.add(ant.grupo);
  ant.grupo.updateMatrix();
  const detras = ant.detras.clone().applyMatrix4(ant.grupo.matrix), cara = ant.cara.clone().applyMatrix4(ant.grupo.matrix);
  const techo = OFICINA.y - 0.25;                                                               // la cara de abajo del forjado
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, techo - detras.y, 24), mat(0x3A4046, 0.6, 0.35));
  brazo.position.set(detras.x, (techo + detras.y) / 2, detras.z); g.add(brazo);
  caja(0.12, 0.01, 0.12, mat(0x3A4046, 0.6, 0.35), detras.x, techo - 0.005, detras.z);         // su pletina
  // el coaxial, del soporte al lector: por debajo del forjado hasta el pilar, pilar abajo, por el suelo hasta la espalda
  // del armario, espalda arriba y dentro por un prensaestopas del fondo, a la canaleta vertical de la izquierda (a la
  // izquierda de la placa de montaje, sin atravesarla); de ahí, al conector, desde abajo (el lector, de pie, tiene los
  // conectores abajo)
  const puerto = lector.puerto.clone().applyMatrix4(lector.grupo.matrix);
  const px = OFICINA.x + 4 - 0.15, pz = OFICINA.z + 2.3 + 0.1;                                   // el pilar de la derecha
  const bx = A.x - 0.74, by = A.y + 0.36, suelo = 0.006, espalda = az0 - 0.06;                   // por dónde entra (y, por el suelo, apoyado)
  const guia = new THREE.CatmullRomCurve3([detras, V(detras.x, techo - 0.05, detras.z), V(px - 0.1, techo - 0.05, pz + 0.12),
    V(px, techo - 0.4, pz + 0.16), V(px, 0.15, pz + 0.16), V(px, suelo, pz + 0.3), V(px, suelo, espalda - 0.15),
    V(px - 0.15, suelo, espalda), V(bx + 0.12, suelo, espalda), V(bx, 0.12, espalda), V(bx, by - 0.06, espalda),
    V(bx, by, espalda + 0.03), V(bx, by, az0 + 0.02), V(bx, by - 0.06, az0 + 0.04),           // (por dentro de la canaleta, abajo)
    V(bx + 0.02, by - 0.1, az0 + 0.045), V(bx + 0.06, by - 0.1, az0 + 0.05),                  // sale por su peine, hacia el lector
    V(puerto.x - 0.04, by - 0.09, puerto.z - 0.005), V(puerto.x, puerto.y - 0.06, puerto.z), puerto], false, 'centripetal');
  // (en las esquinas del suelo la curva se pasaba y se metía en él: se remuestrea sin dejarla bajar de su radio)
  const coax = new THREE.CatmullRomCurve3(guia.getSpacedPoints(400).map((p) => p.setY(Math.max(p.y, suelo))), false, 'centripetal');
  coax.tramos = Math.ceil(coax.getLength() / 0.01);                                             // (un tramo por centímetro: el plano 6 lo enciende con los mismos, encima)
  g.add(new THREE.Mesh(new THREE.TubeGeometry(coax, coax.tramos, 0.005, 12), mat(0x1a1c1f, 0.1, 0.6)));
  caja(0.03, 0.03, 0.025, mat(0x15171a, 0.2, 0.6), bx, by, az0 - 0.015);                       // su prensaestopas, en el fondo
  // en el pilar, el extintor con su señal; en la pared del fondo, la salida; y un palé de cajas esperando
  const extintor = new THREE.Group(); extintor.position.set(px, 0, pz + 0.16); g.add(extintor);
  const botella = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.48, 64), mat(0xc8102e, 0.2, 0.35)); botella.position.set(0.2, 0.55, 0.03); extintor.add(botella);
  caja(0.05, 0.08, 0.05, mat(0x1d1f22, 0.4, 0.5), 0.2, 0.83, 0.03, extintor);
  caja(0.02, 0.3, 0.02, mat(0x1d1f22, 0.1, 0.6), 0.28, 0.6, 0.06, extintor);                    // la manguera
  caja(0.2, 0.04, 0.02, mat(0x2a2f35, 0.5, 0.4), 0.2, 0.86, -0.04, extintor);                   // su soporte
  const senal = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), pegatina('extintor')); senal.position.set(0.2, 1.25, -0.03); extintor.add(senal);
  const salida = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), pegatina('salida')); salida.position.set(-7.5, 2.4, -8.47); g.add(salida);
  const pale = new THREE.Group(); pale.position.set(4.9, 0, -6.1); pale.rotation.y = 0.2; g.add(pale);
  const pino = mat(0x9c7a4f, 0, 0.85);
  for (const z of [-0.35, 0, 0.35]) caja(1.2, 0.1, 0.1, pino, 0, 0.05, z, pale);
  for (let x = -0.55; x <= 0.56; x += 0.1375) caja(0.1, 0.022, 0.8, pino, x, 0.111, 0, pale);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) caja(0.38, 0.3, 0.38, cajaCarton, -0.4 + i * 0.4, 0.28 + k * 0.3, -0.2 + j * 0.4, pale);

  // ---------------------------------------------------------------- la entreplanta y la oficina (plano 10)
  // (la oficina va en su grupo: el plano 10 pone la suya, con su sala, y esconde esta)
  const of = new THREE.Group(); g.add(of);
  const O = OFICINA, ox0 = O.x - 4, ox1 = O.x + 4, oz0 = O.z - 0.65, oz1 = O.z + 2.3;          // la sala: x ±4, z −0,65…2,3
  caja(ox1 - ox0 + 0.4, 0.25, oz1 - oz0 + 0.6, mat(0x4a525b, 0.3, 0.6), O.x, O.y - 0.125, (oz0 + oz1) / 2);                  // forjado
  for (const x of [ox0, ox1]) caja(0.25, O.y - 0.25, 0.25, mat(0x4a525b, 0.4, 0.5), x, (O.y - 0.25) / 2, oz1 + 0.1);   // pilares
  caja(ox1 - ox0, 0.02, oz1 - oz0, conTexturas(mat(0x3a3f46, 0.0, 0.95), moqueta(), 8, 2.95), O.x, O.y + 0.01, (oz0 + oz1) / 2, of);   // suelo de la oficina
  caja(ox1 - ox0, 3, 0.05, mat(0x46505d, 0.0, 0.9), O.x, O.y + 1.5, oz0, of);                         // la pared del monitor
  for (const x of [ox0, ox1]) caja(0.05, 3, oz1 - oz0, mat(0x3c4550, 0.0, 0.9), x, O.y + 1.5, (oz0 + oz1) / 2, of);
  caja(ox1 - ox0, 0.05, oz1 - oz0, mat(0x252b33, 0.0, 0.9), O.x, O.y + 3, (oz0 + oz1) / 2, of);         // techo de la oficina
  // el frente de cristal (las ventanas de la sala), con su marco
  const vidrio = new THREE.MeshStandardMaterial({ color: 0x9fc4e8, metalness: 0, roughness: 0.45, transparent: true, opacity: 0.14, depthWrite: false });   // (más pulido, el reflejo del sol quemaba el cuadro)
  caja(ox1 - ox0, 2.6, 0.02, vidrio, O.x, O.y + 1.6, oz1, of);
  const marco = mat(0x2a2f35, 0.5, 0.4);
  caja(ox1 - ox0, 0.06, 0.06, marco, O.x, O.y + 0.3, oz1, of); caja(ox1 - ox0, 0.06, 0.06, marco, O.x, O.y + 2.9, oz1, of);
  for (let x = ox0; x <= ox1 + 1e-6; x += 2) caja(0.06, 2.6, 0.06, marco, x, O.y + 1.6, oz1, of);
  caja(ox1 - ox0, 0.3, 0.05, marco, O.x, O.y + 0.15, oz1, of);                                       // el antepecho
  const luzOficina = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.15, 1.0), toneMapped: false });
  for (const x of [-2, 2]) caja(1.2, 0.03, 0.3, luzOficina, O.x + x, O.y + 2.96, O.z + 0.8, of);
  // la escalera, por la izquierda
  for (let k = 0; k < 16; k++) caja(1.0, 0.2, 0.28, mat(0x4a525b, 0.4, 0.5), ox0 - 0.6, 0.1 + k * 0.2, oz1 + 4.4 - k * 0.27);
  { const x0e = ox0 - 0.6, z0e = oz1 + 4.4, largo = Math.hypot(15 * 0.27, 16 * 0.2) + 0.4, ang = Math.atan2(16 * 0.2, 15 * 0.27);
    for (const dx of [-0.52, 0.52]) {
      const zanca = caja(0.05, 0.25, largo, mat(0x3a4048, 0.5, 0.5), x0e + dx, 1.55, z0e - 7 * 0.27, of); zanca.rotation.x = ang;   // las zancas
      const baranda = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, largo, 24), mat(0xd6a52a, 0.3, 0.5));
      baranda.rotation.x = Math.PI / 2 + ang; baranda.position.set(x0e + dx, 2.5, z0e - 7 * 0.27); of.add(baranda);           // la barandilla
      for (let k = 1; k < 16; k += 3) caja(0.025, 0.9, 0.025, mat(0x3a4048, 0.5, 0.5), x0e + dx, 0.1 + k * 0.2 + 0.55, z0e - k * 0.27, of);
    } }
  // dentro, lo del plano 10: la mesa, el monitor y el operario
  // (girados 45° respecto a la sala del plano 10: desde fuera de la planta se ve al operario de tres cuartos, de espaldas,
  // mirando su pantalla, y la pantalla de cara, en escorzo)
  const sala = new THREE.Group(); sala.position.copy(O).add(V(0, 0, 0.9)); sala.rotation.y = Math.PI / 4; of.add(sala);
  caja(1.4, 0.03, 0.62, conTexturas(mat(0xd8cfc0, 0.0, 0.5), madera(), 1.4, 0.62), 0, 0.74, 0.02, sala);
  for (const [x, z] of [[-0.66, -0.25], [0.66, -0.25], [-0.66, 0.29], [0.66, 0.29]]) caja(0.04, 0.74, 0.04, mat(0x3a3f45, 0.5, 0.4), x, 0.37, z, sala);
  // (el monitor, más grande que el del plano 10: de lejos tiene que leerse que mira una pantalla)
  const monitor = crearMonitor(); monitor.grupo.scale.setScalar(1.6); monitor.grupo.position.set(0, 0.74 + 0.36 * 1.6 + 0.01, -0.2); sala.add(monitor.grupo);
  const persona = crearPersona(); persona.grupo.position.set(0, 0, 0.62); sala.add(persona.grupo);

  return { grupo: g, oficina: of, lamparas, edge, ethernet, tagSimple, verDentro, verArmario, girar, rotor, antena: ant, cara, normal: TAG.pos.clone().sub(ANTENA_POS).normalize(), lector, armario: arm, monitor, persona, coax };
}
