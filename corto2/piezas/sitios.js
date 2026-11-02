// La planta de la serie: la del episodio 1 (../corto/piezas/planta.js) con todo lo que le han ido poniendo los demás
// episodios, la misma en los tres (crearPlantaSerie). Lo que un corto no usa está ahí, parado: la soldadura apagada, la
// carretilla aparcada junto al portal, los conos de los emisores sin dibujar. Lo añadido, en sus metros:
//   el muro        en la pared de bloques del fondo, el ladrillo P-07 con el SenseNFC dentro
//   el motor       el tag del episodio 1, sobre la carcasa del generador de la máquina 2: ahora, un SenseRead-AT
//   el muelle      a la derecha, delante: el portal RAIN (dos antenas en sus postes) y la carretilla autónoma con el palé
//                  de 48 cajas, cada una con su etiqueta (de identificación, SenseRead o SenseID: etiquetar(tipo)); una
//                  de ellas, la caja héroe, con la placa (o la etiqueta) de verdad
//   la nave        lo del SenseBLE: los emisores baratos en las vigas, con su cono; los SenseBLE en las máquinas, las
//                  cintas y el armario; el armario de variadores y la soldadura de la máquina 3 (el ruido); la pasarela BLE
//   el generador   junto al tag RAIN, a 16 cm, el SenseBLE-RHAT de SparkLink (TAG_BLE), en su taco
//   la fachada     la pared de la derecha (x = 13), de bloques, con la puerta del muelle en el carril de la carretilla;
//                  fuera, la explanada, la carretera con sus farolas, la hierba y los árboles
// ampliarPlanta(planta) los añade a su grupo y devuelve sus piezas; crearPlantaSerie(), la planta con todo; crearOperario(),
// el operario de pie (la gente no es de la planta: cada corto pone la suya).

import * as THREE from 'three';
import { crearTagUHF, crearTagNFC, crearInlay } from './tags.js';
import { crearEmisor } from './aparatos.js';
import { crearAntenaPanel } from '../../corto/piezas/lector.js';
import { crearPersona } from '../../corto/piezas/sala.js';
import { crearPlanta, TAG as TAG_MOTOR, GEN, MONTURA } from '../../corto/piezas/planta.js';
import { pegatina, etiqueta, carton, conTexturas, bloques, hormigon } from '../../corto/piezas/texturas.js';
import { matLinea, aristas } from '../../corto/lineas.js';
import { cajaBisel } from '../../corto/utiles.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color, metal = 0.2, rug = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });

// la pared del fondo es de bloques de 40 × 20 cm (la textura bloques(): 2 m por repetición, diez hiladas a matajunta,
// con la junta de 1,2 cm a la izquierda y arriba de cada bloque); el del sensor es uno de ellos: el de la hilada 6 (de
// 1,20 a 1,39 m) que empieza en x = 7,6
const BLOQUE = 0.4, HILADA = 0.2, JUNTA = 2 * 3 / 512, B_X0 = 7.6 + JUNTA, B_Y0 = 1.2;
export const LADRILLO = V(B_X0 + (BLOQUE - JUNTA) / 2, B_Y0 + (HILADA - JUNTA) / 2, -8.475);   // su centro, en la cara de la pared
export const PORTAL = V(9.0, 0, 5.6);                    // el centro del portal, en el suelo (la carretilla va por x)
// el SenseBLE de SparkLink: a 16 cm del tag RAIN, sobre su propio taco, con el largo de través (como el RAIN: el dipolo, en z)
export const TAG_BLE = V(TAG_MOTOR.pos.x + 0.16, GEN.y + GEN.r + MONTURA + 0.0008, GEN.z);

// hacer transparente un grupo de materiales (como verDentro de la planta): quedan sus aristas encendidas
function radiografia(mats, contorno, objetos = []) {
  return (k) => {
    mats.forEach((m) => {
      if (m.transparent !== k > 0) { m.transparent = k > 0; m.needsUpdate = true; }
      m.opacity = 1 - 0.85 * k; m.depthWrite = k < 0.5;
    });
    objetos.forEach((o) => { o.castShadow = k < 0.3; });
    contorno.opacity = 0.9 * Math.min(1, k * 1.6); contorno.visible = k > 0.01;
  };
}
const contornoMat = () => matLinea({ color: new THREE.Color(0.55, 0.85, 1.4), opacity: 0, toneMapped: false });

// ---------------------------------------------------------------- el muro: el ladrillo P-07
// cara: el material de la pared, con la textura puesta donde va el bloque (abrirHueco): es un bloque como los demás
function crearLadrillo(cara) {
  const g = new THREE.Group();
  // (va en su hueco de la pared, con la cara enrasada con la de ella; de fondo, lo justo para el sensor)
  const W = BLOQUE - JUNTA, H = HILADA - JUNTA, D = 0.12, F = 0;
  const barro = cara || mat(0x58616b, 0.0, 0.9);
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), barro); cuerpo.position.z = F - D / 2; g.add(cuerpo);
  // la tapa del SenseNFC, en la cara (sin la rejilla del ladrillo de la demo: aquí mide la humedad de dentro de la pared)
  const TAPA = V(-0.07, 0.0, F + 0.0001);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#f4f6f8'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#1d5fa8'; x.lineWidth = 12; x.lineCap = 'round';
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(90, 128, 22 + i * 26, -0.75, 0.75); x.stroke(); }   // el símbolo sin contacto
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const tapaMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const tapa = new THREE.Mesh(cajaBisel(0.045, 0.045, 0.003, 0.003), [mat(0xf4f6f8, 0, 0.6), mat(0xf4f6f8, 0, 0.6), mat(0xf4f6f8, 0, 0.6), mat(0xf4f6f8, 0, 0.6), tapaMat, mat(0xf4f6f8, 0, 0.6)]);
  tapa.position.copy(TAPA); g.add(tapa);
  const p07 = etiqueta(['MURO · P-07'], 0.07, 0.018, { fondo: '#f2d23a', tinta: '#1b1d20', alto: 1.2 }); p07.position.set(0.13, 0.06, F + 0.0005); g.add(p07);
  // dentro, justo detrás de la cara (y de la tapa), el SenseNFC, con la cara de componentes hacia fuera: el móvil lo lee
  // al acercarse a la pared
  const nfc = crearTagNFC(); nfc.grupo.rotation.x = Math.PI / 2; nfc.grupo.position.set(TAPA.x, TAPA.y, F - 0.004); g.add(nfc.grupo);
  const contorno = contornoMat(); const l = aristas(new THREE.BoxGeometry(W, H, D), contorno); l.position.z = F - D / 2; g.add(l);
  const ver0 = radiografia([barro], contorno, [cuerpo]);
  // (la tapa y la pegatina, opacas, tapaban el tag al mirarlo de cerca: se van con el ladrillo)
  const ver = (k) => { ver0(k); tapa.visible = p07.visible = k < 0.5; };
  ver(0);
  return { grupo: g, nfc, ver, TAPA, tapa, D };
}

// la pared del fondo (la de la planta del episodio 1, maciza: 26 × 8,5 m y 25 cm de grueso), otra vez, con el hueco del
// bloque del sensor: cuatro trozos alrededor y un tapón detrás, con su misma textura, que sigue donde iba. Devuelve el
// material de la cara del bloque (el de la pared, con la textura de ese trozo)
function abrirHueco(planta, d) {
  const pared = planta.grupo.children.find((o) => o.isMesh && Math.abs(o.position.z + 8.6) < 1e-3 && Math.abs(o.position.y - 4.25) < 1e-3);
  if (!pared) return null;
  pared.visible = false;
  const X0 = -13, Z0 = -8.6 - 0.125, cara = LADRILLO.z;
  const x0 = B_X0, x1 = B_X0 + BLOQUE - JUNTA, y0 = B_Y0, y1 = B_Y0 + HILADA - JUNTA;
  const material = (a, b, c, e) => {
    const m = pared.material.clone();
    for (const k of ['map', 'roughnessMap', 'normalMap']) {
      if (!pared.material[k]) continue;
      const t = pared.material[k].clone(); t.repeat.set((b - a) / 2, (e - c) / 2); t.offset.set((a - X0) / 2, c / 2); t.needsUpdate = true; m[k] = t;
    }
    return m;
  };
  const trozo = (a, b, c, e, z0 = Z0, z1 = cara) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(b - a, e - c, z1 - z0), material(a, b, c, e));
    o.position.set((a + b) / 2, (c + e) / 2, (z0 + z1) / 2); o.receiveShadow = pared.receiveShadow; o.castShadow = pared.castShadow;
    planta.grupo.add(o);
  };
  trozo(X0, x0, 0, 8.5); trozo(x1, 13, 0, 8.5); trozo(x0, x1, 0, y0); trozo(x0, x1, y1, 8.5);
  trozo(x0, x1, y0, y1, Z0, cara - d);
  return material(x0, x1, y0, y1);
}

// ---------------------------------------------------------------- el muelle
function crearMuelle() {
  const g = new THREE.Group();
  const acero = mat(0x2E6FB0, 0.4, 0.5), negro = mat(0x15171a, 0.3, 0.6), amarillo = mat(0xd6a52a, 0.0, 0.7);
  const caja = (w, h, d, m, x, y, z, padre = g) => { const o = new THREE.Mesh(cajaBisel(w, h, d, 0.006), m); o.position.set(x, y, z); padre.add(o); return o; };
  // el portal: dos postes a los lados del carril (z ±0,95), el travesaño y su pantallita, y una antena en cada poste
  const antenas = [];
  for (const s of [-1, 1]) {
    caja(0.12, 2.6, 0.12, acero, 0, 1.3, s * 0.95);
    for (let k = 0; k < 6; k++) caja(0.125, 0.1, 0.125, k % 2 ? amarillo : negro, 0, 0.05 + k * 0.1, s * 0.95);
    for (const y of [0.9, 1.6]) {
      const a = crearAntenaPanel(); a.grupo.position.set(0, y, s * 0.86); a.grupo.lookAt(g.localToWorld(V(0, y, 0))); g.add(a.grupo); antenas.push(a);
    }
  }
  caja(0.14, 0.14, 2.04, acero, 0, 2.6, 0);
  const rotulo = etiqueta(['PORTAL RAIN · MUELLE 2'], 0.9, 0.12, { fondo: '#1e2731', tinta: '#d7e3ee', alto: 1.2 });
  rotulo.position.set(0.075, 2.6, 0); rotulo.rotation.y = Math.PI / 2; g.add(rotulo);
  // las franjas del carril, en el suelo
  for (const s of [-1, 1]) caja(9, 0.004, 0.08, amarillo, -1.5, 0.002, s * 0.75);
  // la carretilla autónoma (va hacia −x, las horquillas delante), con el palé de 48 cajas, cada una con su tag
  const carro = new THREE.Group(); g.add(carro);
  const naranja = mat(0xe8742a, 0.2, 0.55);
  caja(0.9, 0.7, 0.85, naranja, 0.45, 0.45, 0, carro);                      // el cuerpo (motor y baterías)
  caja(0.3, 0.25, 0.3, negro, 0.7, 0.92, 0, carro);                         // el lidar
  const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 32), mat(0x111316, 0.5, 0.3)); lidar.position.set(0.7, 1.08, 0); carro.add(lidar);
  for (const s of [-1, 1]) caja(0.06, 2.0, 0.06, mat(0x3a3f45, 0.6, 0.4), -0.04, 1.0, s * 0.32, carro);   // el mástil
  for (const s of [-1, 1]) caja(1.1, 0.04, 0.12, mat(0x3a3f45, 0.6, 0.4), -0.6, 0.12, s * 0.25, carro);   // las horquillas
  const luzCarro = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.5, 2.0), toneMapped: false }));
  luzCarro.position.set(-0.0, 0.62, 0); carro.add(luzCarro);
  for (const [x, z] of [[0.75, 0.38], [0.75, -0.38], [-1.0, 0.3], [-1.0, -0.3]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 32), negro); r.rotation.x = Math.PI / 2; r.position.set(x, 0.1, z); carro.add(r);
  }
  const pale = new THREE.Group(); pale.position.set(-0.65, 0.16, 0); carro.add(pale);
  const pino = mat(0x9c7a4f, 0, 0.85);
  for (const z of [-0.35, 0, 0.35]) caja(1.2, 0.1, 0.1, pino, 0, 0.05, z, pale);
  for (let x = -0.55; x <= 0.56; x += 0.1375) caja(0.1, 0.022, 0.8, pino, x, 0.111, 0, pale);
  const cajaCarton = conTexturas(mat(0xffffff, 0, 0.85), carton());
  const cajas = [];
  // las etiquetas: de identificación (blanca, con la antena en meandro) o la placa verde de un sensor; a su tamaño de
  // verdad, el de la caja héroe (el inlay, 95 × 22 mm; las placas del SenseRead y el SenseID, 140 × 22)
  const TAM_ETQ = { inlay: [0.095, 0.022], read: [0.14, 0.0224], id: [0.14, 0.0224] };
  const texEtq = (tipo) => {
    const [w, h] = TAM_ETQ[tipo], H = Math.round(512 * h / w);
    const c = document.createElement('canvas'); c.width = 512; c.height = H; const x = c.getContext('2d');
    if (tipo === 'inlay') {
      x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 512, H); x.strokeStyle = '#a9b0b8'; x.lineWidth = 7;
      x.beginPath(); for (let i = 0; i <= 16; i++) { const px = 40 + i * 27; x.lineTo(px, i % 2 ? H * 0.22 : H * 0.78); x.lineTo(px + 13, i % 2 ? H * 0.22 : H * 0.78); } x.stroke();
      x.fillStyle = '#1c1c1e'; x.fillRect(250, H / 2 - 7, 14, 14);
    } else {
      x.fillStyle = '#1F5A3E'; x.fillRect(0, 0, 512, H); x.fillStyle = '#d9a35a'; x.fillRect(10, 8, 492, 7);
      x.fillStyle = '#26282c'; x.fillRect(200, H / 2 - 14, 28, 28); x.fillStyle = '#f2f2ee'; x.font = '600 26px "Segoe UI", sans-serif';
      x.fillText(tipo === 'id' ? 'SenseID' : 'SenseRead', 250, H / 2 + 12);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const MATS = { inlay: mat(0xffffff, 0, 0.6, { map: texEtq('inlay') }), read: mat(0xffffff, 0, 0.5, { map: texEtq('read') }), id: mat(0xffffff, 0, 0.5, { map: texEtq('id') }) };
  const verde = new THREE.Color(0.25, 1.9, 0.6), gris = new THREE.Color(0.55, 0.6, 0.65);
  for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const c2 = caja(0.29, 0.19, 0.255, cajaCarton, -0.45 + i * 0.3, 0.22 + k * 0.2, -0.27 + j * 0.27, pale);
    // su tag, en la cara que da al pasillo (±z) o, las de en medio, arriba; y su luz (verde: dato; gris: visto sin dato)
    const lado = j === 0 ? -1 : j === 2 ? 1 : 0;
    const etq = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), MATS.inlay); etq.scale.set(...TAM_ETQ.inlay, 1);
    const luz = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), new THREE.MeshBasicMaterial({ color: verde, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    if (lado) { etq.position.set(0, -0.03, lado * 0.129); luz.position.set(0, 0.04, lado * 0.13); if (lado < 0) { etq.rotation.y = Math.PI; luz.rotation.y = Math.PI; } }
    else { etq.position.set(0, -0.03, 0.129); luz.position.set(0, 0.04, 0.13); }
    c2.add(etq, luz);
    cajas.push({ caja: c2, etq, luz, marcar: (estado, k2 = 1) => {
      luz.material.opacity = estado ? k2 : 0; luz.visible = !!estado && k2 > 0.01;
      if (estado) luz.material.color.copy(estado === 'dato' ? verde : gris);
    } });
  }
  cajas.forEach((c2) => c2.marcar(null));
  const etiquetar = (tipo) => cajas.forEach((c2) => { c2.etq.material = MATS[tipo]; c2.etq.scale.set(...TAM_ETQ[tipo], 1); });
  // la caja héroe (la de abajo del todo, la segunda, en la cara que da a +z): con la placa de verdad del SenseID-AT o
  // del SenseRead-AT, o la etiqueta de identificación, para verlas de cerca (poner(tipo); null, la etiqueta de siempre)
  const heroe = cajas[1 * 3 + 2], heroeId = crearTagUHF({ tipo: 'id', sensor: 'at' }), heroeRead = crearTagUHF({ tipo: 'read', sensor: 'at' }), heroeInlay = crearInlay();
  for (const t of [heroeId, heroeRead]) { t.grupo.rotation.x = Math.PI / 2; t.grupo.position.set(0, 0.0, 0.1285 + 0.0009); heroe.caja.add(t.grupo); }
  heroeInlay.grupo.rotation.x = Math.PI / 2; heroeInlay.grupo.position.set(0, 0, 0.1282); heroe.caja.add(heroeInlay.grupo);
  const ponerHeroe = (tipo) => { heroeId.grupo.visible = tipo === 'id'; heroeRead.grupo.visible = tipo === 'read'; heroeInlay.grupo.visible = tipo === 'inlay'; heroe.etq.visible = !tipo; };
  ponerHeroe(null);
  const mover = (x) => { carro.position.set(x, 0, 0); };
  mover(3);
  return { grupo: g, carro, cajas, mover, antenas, etiquetar, heroe: { ...heroe, id: heroeId, read: heroeRead, inlay: heroeInlay, poner: ponerHeroe } };
}

// ---------------------------------------------------------------- la fachada: la pared del muelle y lo de fuera
// La nave no tiene paredes de los lados (para verla de fuera), salvo esta: la de la derecha, por la que entra la
// carretilla. De bloques, como la del fondo, y con la misma textura, que sigue de un trozo a otro; con la puerta
// seccional subida (su rollo, arriba, por dentro) y los topes amarillos y negros a los lados. No echa sombra: si no,
// el sol de la tarde dejaba el muelle a oscuras. Fuera, en la misma maqueta que la nave (z de −9,75 a 8,25): la
// explanada de hormigón, la carretera, con sus farolas encendidas, y la hierba con árboles
export const FACHADA = { x: 13, puerta: { z: PORTAL.z, ancho: 2.8, alto: 3.4 } };
const Z_ATRAS = -8.725, Z_DELANTE = 8.25, ALTO = 8.5, GRUESO = 0.25;
function crearFachada() {
  const g = new THREE.Group();
  const caja = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(cajaBisel(w, h, d, 0.006), m); o.position.set(x, y, z); g.add(o); return o; };
  const X = FACHADA.x + GRUESO / 2, { z: zp, ancho, alto } = FACHADA.puerta, z0 = zp - ancho / 2, z1 = zp + ancho / 2;
  // la pared, en trozos alrededor de la puerta; cada uno con la textura en su sitio (2 m por repetición)
  const base = conTexturas(mat(0x58616b, 0.0, 0.9), bloques());
  const trozo = (za, zb, ya, yb) => {
    const m = base.clone();
    for (const k of ['map', 'normalMap']) { const t = base[k].clone(); t.repeat.set((zb - za) / 2, (yb - ya) / 2); t.offset.set(za / 2, ya / 2); t.needsUpdate = true; m[k] = t; }
    const o = new THREE.Mesh(new THREE.BoxGeometry(GRUESO, yb - ya, zb - za), m); o.position.set(X, (ya + yb) / 2, (za + zb) / 2);
    o.userData.sinSombra = true; g.add(o);
  };
  trozo(Z_ATRAS, z0, 0, ALTO); trozo(z1, Z_DELANTE, 0, ALTO); trozo(z0, z1, alto, ALTO);
  // el marco de la puerta, los topes y la puerta seccional, subida: su rollo por dentro, sobre el hueco
  const acero = mat(0x3a4048, 0.5, 0.45), amarillo = mat(0xd6a52a, 0.0, 0.7), negro = mat(0x15171a, 0.3, 0.6);
  for (const z of [z0, z1]) {
    caja(GRUESO + 0.06, alto, 0.08, acero, X, alto / 2, z);
    for (let k = 0; k < 6; k++) caja(0.16, 0.2, 0.16, k % 2 ? negro : amarillo, FACHADA.x - 0.1, 0.1 + k * 0.2, z + (z < zp ? 0.12 : -0.12));
  }
  caja(GRUESO + 0.06, 0.1, ancho + 0.08, acero, X, alto + 0.05, zp);
  const rollo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, ancho + 0.1, 40), mat(0x9aa3ad, 0.5, 0.5)); rollo.rotation.x = Math.PI / 2;
  rollo.position.set(FACHADA.x - 0.35, alto + 0.35, zp); g.add(rollo);
  caja(0.08, 0.6, 0.6, acero, FACHADA.x - 0.35, alto + 0.35, z0 - 0.05).userData.sinSombra = true;   // su motor, a un lado
  const rotulo = etiqueta(['MUELLE 2'], 0.8, 0.22, { fondo: '#1e2731', tinta: '#d7e3ee', alto: 1.3 });
  rotulo.position.set(FACHADA.x - 0.002, alto + 0.85, zp); rotulo.rotation.y = -Math.PI / 2; g.add(rotulo);
  // fuera: la explanada (de la pared a la carretera), la carretera y la hierba, hasta el borde de la maqueta
  const fz = (Z_ATRAS - 1.025 + Z_DELANTE) / 2, fd = Z_DELANTE - (Z_ATRAS - 1.025);       // (de −9,75 a 8,25, como el suelo)
  const losa = (x0, x1, m, y = -0.05) => caja(x1 - x0, 0.1, fd, m, (x0 + x1) / 2, y, fz);
  const XE = FACHADA.x + GRUESO, XC = XE + 6, XH = XC + 7.5, XF = XH + 12;
  losa(XE, XC, conTexturas(mat(0x6a7078, 0.0, 1), hormigon(), (XC - XE) / 4, fd / 4));
  losa(XC, XH, mat(0x2a2d31, 0.0, 0.95), -0.06);
  losa(XH, XF, mat(0x35552f, 0.0, 1), -0.04);
  const blanco = mat(0xd9dcdf, 0.0, 0.8);
  for (const x of [XC + 0.25, XH - 0.25]) caja(0.12, 0.004, fd, blanco, x, 0.0, fz);                       // los bordes
  for (let z = -9.5; z < 8.25; z += 3) caja(0.12, 0.004, 1.5, blanco, (XC + XH) / 2, 0.0, z + 0.75);      // la línea del centro
  for (const z of [zp - 0.75, zp + 0.75]) caja(XC - XE, 0.004, 0.08, amarillo, (XE + XC) / 2, 0.002, z);  // el carril, que sigue fuera
  // las farolas, del lado de la explanada, con su luz encendida
  const luz = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.35, 0.9), toneMapped: false });
  for (const z of [-7, 0, 7]) {
    caja(0.1, 5, 0.1, acero, XC - 0.4, 2.5, z);
    caja(0.9, 0.08, 0.1, acero, XC + 0.0, 5, z);
    caja(0.45, 0.06, 0.22, luz, XC + 0.3, 4.95, z).userData.sinSombra = true;
  }
  // los árboles, en la hierba: tronco y copa de tres bolas, cada uno a su tamaño (al azar, pero siempre el mismo)
  let semilla = 7; const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const tronco = mat(0x5a4330, 0.0, 0.9), hojas = [mat(0x2f5a2a, 0.0, 0.85), mat(0x3a6b30, 0.0, 0.85), mat(0x28502a, 0.0, 0.85)];
  const bola = new THREE.IcosahedronGeometry(1, 1), palo = new THREE.CylinderGeometry(0.12, 0.18, 1, 10);
  for (let z = -9; z < 8; z += 2.2) for (const fila of [0, 1, 2]) {
    if (azar() < 0.25) continue;
    const x = XH + 2 + fila * 3.4 + azar() * 1.6, zz = z + azar() * 1.4, h = 2.4 + azar() * 1.6, r = 1.0 + azar() * 0.6;
    const t = new THREE.Mesh(palo, tronco); t.scale.set(1, h, 1); t.position.set(x, h / 2, zz); g.add(t);
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(bola, hojas[(k + fila) % 3]); b.scale.setScalar(r * (0.75 + 0.3 * azar()));
      b.position.set(x + (azar() - 0.5) * r, h + r * (0.3 + 0.5 * azar()), zz + (azar() - 0.5) * r); g.add(b);
    }
  }
  return { grupo: g };
}

// ---------------------------------------------------------------- la nave del SenseBLE
export const EMISORES = [[-8.2, -3.2], [-1.6, -3.2], [5.0, -3.2], [-8.2, 2.0], [-1.6, 2.0], [5.0, 2.0]].map(([x, z]) => V(x, 7.95, z));
// los SenseBLE: dónde (la superficie en la que van atornillados, mirando a +z) y qué miden (para la pantalla del móvil).
// Cada uno en lo que vigila: en el motor de las máquinas 1 y 3 y en el motorreductor de la 2 (que se ponen aquí, delante,
// sobre el zócalo: MOTORES), en el larguero de cada cinta, junto a los rodillos, y en el frente de los dos armarios
const MOTORES = [[-8.6, false], [-1.2, true], [8.0, false]], ZM = -2.3, YM = 0.3;   // (x, con reductora; su eje, a ZM e YM)
export const SBLE = [
  { pos: V(-8.6, YM, ZM + 0.17), sitio: 'Máq. 1 · motor', valor: '54,2 °C', sensor: 'at' },
  { pos: V(-4.6, 0.86, -2.955), sitio: 'Cinta 1 · rodillos', valor: '1,4 mm/s', sensor: 'acc' },
  { pos: V(-1.2, YM, ZM + 0.17), sitio: 'Máq. 2 · reductora', valor: '2,1 mm/s', sensor: 'acc' },
  { pos: V(4.4, 0.86, -2.955), sitio: 'Cinta 2 · rodillos', valor: '0,9 mm/s', sensor: 'acc' },
  { pos: V(8.0, YM, ZM + 0.17), sitio: 'Máq. 3 · motor', valor: '47,9 °C', sensor: 'at' },
  { pos: V(-10.9, 1.5, -1.445), sitio: 'Variadores', valor: '41,0 °C', sensor: 'at' },
  { pos: V(2.6, 1.3, -1.92), sitio: 'Armario · humedad', valor: '38 %RH', sensor: 'rhat' },
];
export const VARIADORES = V(-10.9, 0, -1.7), SOLDADURA = V(8.3, 1.6, -3.2), PASARELA = V(3.5, 2.3, -4.32);
// la caja estanca de un SenseBLE (en la máquina no va la placa desnuda): fondo y paredes de ABS gris claro, la tapa
// transparente (de cerca se ve la placa) y dos orejas con su tornillo. En los metros del tag (la placa en su plano xz,
// la cara a +y, centrada en y = 0); el fondo, a FONDO_CAJA por debajo: hay que separar el tag eso de la superficie.
// Devuelve ver(k): de 1 (entera) a 0 (se va: de cerca y de lado, las paredes tapaban la placa)
const FONDO_CAJA = 0.0038;
function encapsular(tag) {
  const abs = mat(0xd7dade, 0, 0.55), tornillo = mat(0x9aa0a6, 0.8, 0.3);
  const tapa = new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.14, roughness: 0.08, metalness: 0, depthWrite: false });
  const L = 0.152, A = 0.034, H = 0.013, e = 0.002, y0 = -FONDO_CAJA;
  const pieza = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); tag.grupo.add(o); return o; };
  pieza(L, e, A, abs, 0, y0 + e / 2, 0);
  for (const sg of [-1, 1]) {
    pieza(L, H, e, abs, 0, y0 + H / 2, sg * (A - e) / 2); pieza(e, H, A, abs, sg * (L - e) / 2, y0 + H / 2, 0);
    pieza(0.016, e, 0.02, abs, sg * (L / 2 + 0.008), y0 + e / 2, 0);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0016, 16), tornillo); t.position.set(sg * (L / 2 + 0.009), y0 + e + 0.0008, 0); tag.grupo.add(t);
  }
  const laTapa = pieza(L, 0.0015, A, tapa, 0, y0 + H, 0); laTapa.castShadow = false;
  return (k) => {
    const tr = k < 0.999;
    for (const m of [abs, tornillo]) { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = k; m.depthWrite = k > 0.5; }
    tapa.opacity = 0.14 * k; laTapa.visible = k > 0.01;
    tag.grupo.children.forEach((o) => { if (o.material === abs || o.material === tornillo) o.visible = k > 0.01; });
  };
}
function crearNave() {
  const g = new THREE.Group();
  const caja = (w, h, d, m, x, y, z, padre = g) => { const o = new THREE.Mesh(cajaBisel(w, h, d, 0.006), m); o.position.set(x, y, z); padre.add(o); return o; };
  // los emisores, colgados de las vigas, mirando abajo, con su cono de energía (conos(k))
  const conoMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.6, 0.15), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const emisores = EMISORES.map((p) => {
    const e = crearEmisor(); e.grupo.position.copy(p); e.grupo.lookAt(p.x, 0, p.z + 0.001); g.add(e.grupo);
    const cono = new THREE.Mesh(new THREE.ConeGeometry(3.2, p.y - 0.1, 48, 1, true), conoMat); cono.position.set(p.x, (p.y + 0.1) / 2, p.z); g.add(cono);
    return e;
  });
  const conos = (k) => { conoMat.opacity = 0.045 * k; conoMat.visible = k > 0.01; };
  conos(0);
  // los SenseBLE (la placa de verdad), con la cara de componentes hacia +z
  const tags = SBLE.map((s) => {
    const t = crearTagUHF({ tipo: 'ble', sensor: s.sensor }); t.grupo.rotation.x = Math.PI / 2; t.grupo.position.copy(s.pos).add(V(0, 0, FONDO_CAJA)); g.add(t.grupo);
    t.caja = encapsular(t); return t;
  });
  // los motores (y el motorreductor de la 2), delante de las máquinas, sobre su bancada: el cuerpo con aletas, la tapa del
  // ventilador, la caja de bornes y, delante, la pletina en la que va atornillado el SenseBLE
  const azulM = mat(0x2f5f8f, 0.4, 0.45), acero = mat(0x8a9097, 0.6, 0.4), negroM = mat(0x22262b, 0.3, 0.6);
  for (const [x, reductora] of MOTORES) {
    const m = new THREE.Group(); m.position.set(x, 0, ZM); g.add(m);
    caja(0.5, YM - 0.15, 0.36, negroM, 0, (YM - 0.15) / 2, 0, m);                                  // la bancada
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 40), azulM); cuerpo.rotation.z = Math.PI / 2; cuerpo.position.y = YM; m.add(cuerpo);
    for (let k = 0; k < 16; k++) {                                                                   // las aletas
      const a = (k / 16) * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.2) continue;               // (delante, la pletina)
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.012), azulM); f.position.set(0, YM + Math.cos(a) * 0.155, Math.sin(a) * 0.155); f.rotation.x = -a; m.add(f);
    }
    const ventilador = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.08, 40), acero); ventilador.rotation.z = Math.PI / 2; ventilador.position.set(-0.25, YM, 0); m.add(ventilador);
    caja(0.14, 0.09, 0.13, azulM, 0.04, YM + 0.19, 0, m);                                              // la caja de bornes
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 16), acero); eje.rotation.z = Math.PI / 2; eje.position.set(0.27, YM, 0); m.add(eje);
    if (reductora) caja(0.24, 0.3, 0.28, acero, 0.42, YM, 0, m);                                       // la reductora
    caja(0.18, 0.05, 0.02, acero, 0, YM, 0.16, m);                                                     // la pletina del SenseBLE
  }
  // el armario de los variadores: chapa gris, tres ventiladores y su rótulo
  const vfd = new THREE.Group(); vfd.position.copy(VARIADORES); g.add(vfd);
  caja(1.4, 2.0, 0.5, mat(0x9aa3ad, 0.3, 0.6), 0, 1.0, 0, vfd);
  for (const x of [-0.42, 0, 0.42]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 32), mat(0x2a2f35, 0.4, 0.5)); f.rotation.x = Math.PI / 2; f.position.set(x, 1.55, 0.26); vfd.add(f); }
  const rv = etiqueta(['VARIADORES · LÍNEA 3'], 1.1, 0.15, { fondo: '#1e2731', tinta: '#d7e3ee', alto: 1.2 }); rv.position.set(0, 1.86, 0.255); vfd.add(rv);
  const pv = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), pegatina('tension')); pv.position.set(0.45, 1.05, 0.255); vfd.add(pv);
  // la soldadura, en lo alto de la máquina 3: el brazo, la antorcha y sus chispas (soldar(t, k))
  const sold = new THREE.Group(); sold.position.copy(SOLDADURA); g.add(sold);
  caja(0.25, 0.3, 0.25, mat(0xe8742a, 0.2, 0.5), 0, 0, 0, sold);
  const brazo = caja(0.1, 0.6, 0.1, mat(0xe8742a, 0.2, 0.5), 0.15, 0.25, 0.1, sold); brazo.rotation.z = -0.7;
  const chispaPos = new Float32Array(120 * 3), chispaGeo = new THREE.BufferGeometry(); chispaGeo.setAttribute('position', new THREE.BufferAttribute(chispaPos, 3));
  const chispas = new THREE.Points(chispaGeo, new THREE.PointsMaterial({ color: new THREE.Color(2.4, 1.6, 0.6), size: 0.03, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  chispas.position.set(0.42, 0.45, 0.2); chispas.frustumCulled = false; sold.add(chispas);
  const arco = new THREE.PointLight(0x9fd0ff, 0, 4, 2); arco.position.copy(chispas.position); sold.add(arco);
  const soldar = (t, k = 1) => {
    chispas.visible = k > 0.01; arco.intensity = k * (2 + 2 * Math.abs(Math.sin(t * 37)));
    for (let i = 0; i < 120; i++) {
      const u = ((t * 1.7 + i * 0.137) % 1), a = i * 2.39, v = 0.6 + (i % 7) * 0.1;
      chispaPos.set([Math.cos(a) * v * u * 0.5, 0.25 * u - 0.9 * u * u, Math.sin(a) * v * u * 0.5], 3 * i);
    }
    chispaGeo.attributes.position.needsUpdate = true;
  };
  soldar(0, 0);
  // la pasarela BLE, en el pilar de la oficina
  const pas = new THREE.Group(); pas.position.copy(PASARELA); g.add(pas);
  caja(0.14, 0.2, 0.05, mat(0xe9ecef, 0, 0.6), 0, 0, 0, pas);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 12), mat(0x2a2f35, 0.3, 0.5)); ant.position.set(0.05, 0.17, 0); pas.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.8, 1.6), toneMapped: false })); led.position.set(-0.04, 0.06, 0.03); pas.add(led);
  return { grupo: g, emisores, conos, tags, soldar, vfd };
}

// el operario, de pie (piezas/sala.js con { pie: true }): andar(fase, k) mueve las piernas (k: cuánto anda)
export function crearOperario() {
  const p = crearPersona({ pie: true });
  p.andar = (fase, k = 1) => { p.piernas.forEach((l, i) => { l.rotation.x = k * 0.45 * Math.sin(fase + i * Math.PI); }); p.grupo.position.y = k * 0.012 * Math.abs(Math.sin(fase)); };
  return p;
}

// todo en la planta (en sus metros)
export function ampliarPlanta(planta) {
  const g = planta.grupo;
  const muro = crearLadrillo(abrirHueco(planta, 0.12)); muro.grupo.position.copy(LADRILLO); g.add(muro.grupo);
  const muelle = crearMuelle(); muelle.grupo.position.copy(PORTAL); g.add(muelle.grupo);
  const fachada = crearFachada(); g.add(fachada.grupo);
  const nave = crearNave(); g.add(nave.grupo);
  // el tag del motor: el del episodio 1 (en su taco, de través), que ahora es un SenseRead-AT
  planta.tagSimple.visible = false;
  const motor = crearTagUHF({ tipo: 'read', sensor: 'at' }); motor.grupo.position.copy(TAG_MOTOR.pos).add(V(0, 0.0008, 0)); motor.grupo.rotation.y = TAG_MOTOR.rotY; g.add(motor.grupo);
  // a su lado, el SenseBLE-RHAT de SparkLink, en su taco
  const taco = new THREE.Mesh(new THREE.BoxGeometry(0.03, MONTURA + 0.02, 0.15), mat(0x3a3f46, 0.3, 0.6));
  taco.position.set(TAG_BLE.x, GEN.y + GEN.r + MONTURA / 2 - 0.01, TAG_BLE.z); g.add(taco);
  const ble = crearTagUHF({ tipo: 'ble', sensor: 'rhat' }); ble.grupo.position.copy(TAG_BLE); ble.grupo.rotation.y = Math.PI / 2; g.add(ble.grupo);
  // el SenseBLE del armario va en su puerta: se va con ella cuando se hace transparente (episodio 1, planos 6 a 8)
  const verArmario = planta.verArmario, enPuerta = nave.tags[SBLE.findIndex((s) => s.sitio.startsWith('Armario'))];
  planta.verArmario = (k) => { verArmario(k); enPuerta.grupo.visible = k < 0.5; };
  g.updateMatrixWorld(true);
  return { muro, muelle, nave, motor, ble, fachada };
}

// la planta de la serie, con todo: { planta, sitios } (sitios, lo de ampliarPlanta)
export function crearPlantaSerie() {
  const planta = crearPlanta();
  return { planta, sitios: ampliarPlanta(planta) };
}
