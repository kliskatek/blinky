// El tag del episodio 1, de verdad: el SenseRead-AT (crearTagUHF de corto2/piezas/tags.js, el GLB de KiCad, la misma
// placa que lleva la máquina 2 en el episodio 2), con lo que hace falta para seguir a Blinky por ella. Las coordenadas
// son las de KiCad (mm, con y hacia abajo), sacadas del .kicad_pcb (SenseID/devices/products/rfid/tag-at/hw/
// r100_mspm0l130x_tmp117_dk): las patas y las pistas por donde corre, del dipolo al ROCKY100 (IC1), de él al micro (IC4)
// por SPI y del micro al sensor (IC5, el TMP117) por I²C. SDA pasa por debajo de la placa, de una vía a otra.
//
// Tres escalas, cada una con su marco:
//   el tag (planos 2 y 5): ponerTag(grupo), en el mundo de esos planos (E unidades por metro; girado media vuelta, con el
//     dipolo hacia +z, del lado de la cámara); W(p, y) da un punto de KiCad en ese mundo
//   el ROCKY100 de cerca (planos 3 y 5): el de piezas/rocky.js (1 mm = 1,55), con el ROCKY100 en el origen, la antena
//     hacia −x y el micro hacia +x; cerca(p) da [x, z]
//   el sensor de cerca (plano 4): con el TMP117 en el origen, sin girar (x de KiCad en x, y de KiCad en z): su lado de
//     SDA, hacia −x; enSensor(p, mm) da [x, z]
// montarPlaca(padre, { ... }) pone la placa a una de las dos escalas de cerca, sin los chips que el plano abre.

import * as THREE from 'three';
import { crearTagUHF, cargarModelos } from '../../corto2/piezas/tags.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const KICAD = {
  centro: [139.45, 81.5], rocky: [139.36, 78.115], mcu: [139.39, 84.5], sensor: [135.715, 85.05],
  // el dipolo (de 71,59 a 72,09 mm, con los brazos hasta ±68,3 mm del centro de la placa) y la alimentación de RF+ (por
  // la bobina LM2, de 73,6 a 74,6 mm, hasta la pata 1 del ROCKY100; el cuerpo, de 4 mm, empieza en 76,115)
  dipolo: 71.84, brazo: 68.3, rf: 140.33, rfMenos: 138.38, lm: 74.09, borde: 76.115,
  // SPI, del ROCKY100 al micro (MOSI, de su pata 10 a la 9 del micro) y de vuelta (MISO, de la 11 del micro a la 9 suya)
  mosi: [[139.035, 80.065], [139.035, 80.804819], [139.99, 81.759819], [139.99, 83.2]],
  miso: [[139.19, 83.2], [139.19, 82.656204], [137.994183, 81.460387], [137.994183, 80.455817], [138.385, 80.065]],
  // SDA: de la pata 15 del micro a una vía; por debajo, a otra; y arriba otra vez, a la pata 6 del sensor (su lado de
  // fuera: el cuerpo, de 2 mm, acaba en 134,715)
  sda: [[138.59, 84.7], [137.69, 84.7], [137.29, 85.1]], sda2: [[133.7775, 86.0125], [134.09, 85.7], [134.8275, 85.7]],
  bordeSensor: 134.715,
};
const local = ([x, y]) => [(x - KICAD.centro[0]) / 1000, (y - KICAD.centro[1]) / 1000];
const ARRIBA = 0.0008;                                  // la cara de la placa en el GLB (centrada, de 1,6 mm)

// ---------------------------------------------------------------- el tag (planos 2 y 5)
// a esta escala, su medio dipolo mide lo que el del tag de antes (8,2): así casi todo el plano 2 vale
export const E = 120;
// la placa, apoyada en el taco de la planta (TAG.pos de la planta está 0,7 mm por encima): su cara, en y = Y_CARA
const Y_GRUPO = (ARRIBA - 0.0007) * E;
export const Y_CARA = Y_GRUPO + ARRIBA * E;
// un punto de KiCad en el mundo del plano (girado media vuelta), a la altura y
export const W = (p, y = Y_CARA) => { const [x, z] = local(p); return V(-x * E, y, -z * E); };
export function ponerTag(grupo) {
  const tag = crearTagUHF({ tipo: 'read', sensor: 'at' });
  tag.grupo.scale.setScalar(E); tag.grupo.rotation.y = Math.PI; tag.grupo.position.y = Y_GRUPO; grupo.add(tag.grupo);
  // (de cerca, con todo el reflejo del entorno brillaba demasiado; la planta, de lejos, lo lleva entero)
  cargarModelos(['rfid_at']).then(() => entorno(tag.grupo, 0.4));
  return tag;
}
// (y la serigrafía, blanca, algo más gris: de cerca, con el bloom, quemaba la imagen)
export function entorno(g, k) {
  g.traverse((o) => {
    if (o.material) [].concat(o.material).forEach((m) => {
      if ('envMapIntensity' in m) m.envMapIntensity = k;
      if (m.color && !m.userData.gris && m.color.r > 0.9 && m.color.g > 0.9 && m.color.b > 0.9) { m.color.multiplyScalar(0.62); m.userData.gris = true; }
    });
  });
}

// ---------------------------------------------------------------- de cerca (planos 3, 4 y 5)
export const MM = 1.55;                                 // la escala de piezas/rocky.js
// a qué altura va Blinky (su centro) sobre la cara de la placa, a la escala de rocky.js: el cobre y la máscara del GLB
// levantan casi 0,05 mm, y más bajo iba por debajo de la máscara
export const SOBRE = 0.12;
// un punto de KiCad en el marco del ROCKY100 (o del sensor), a mm unidades por milímetro
export const cerca = ([x, y], mm = MM) => [(y - KICAD.rocky[1]) * mm, -(x - KICAD.rocky[0]) * mm];
export const enSensor = ([x, y], mm) => [(x - KICAD.sensor[0]) * mm, (y - KICAD.sensor[1]) * mm];
// la placa a una escala de cerca: centro 'rocky' (sin girar el marco del ROCKY100) o 'sensor'; yCara, a qué altura queda
// su cara; sin, los chips que no pone (porque el plano pone el suyo, abierto)
export function montarPlaca(padre, { centro = 'rocky', mm = MM, yCara = 0, sin = [] }) {
  const tag = crearTagUHF({ tipo: 'read', sensor: 'at', sin });
  const s = mm * 1000, [cx, cz] = local(KICAD[centro]);
  tag.grupo.scale.setScalar(s);
  if (centro === 'rocky') { tag.grupo.rotation.y = Math.PI / 2; tag.grupo.position.set(-cz * s, yCara - ARRIBA * s, cx * s); }
  else tag.grupo.position.set(-cx * s, yCara - ARRIBA * s, -cz * s);
  padre.add(tag.grupo);
  cargarModelos(['rfid_at']).then(() => entorno(tag.grupo, 0.2));
  return tag;
}
// una pista (puntos de KiCad) a una altura, en el marco del ROCKY100
export const pistaCerca = (pts, y, mm = MM) => pts.map((p) => { const [x, z] = cerca(p, mm); return V(x, y, z); });
