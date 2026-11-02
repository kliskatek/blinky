// Los cuatro tags del episodio 2, en metros (cada plano los escala): las placas de verdad, exportadas de KiCad con sus
// componentes (modelos/*.glb: kicad-cli pcb export glb con pistas, pads, zonas, máscara y serigrafía), centradas y con la
// cara de componentes a +y. Ejes: el largo en x, el ancho en z (el dipolo, en el borde z < 0, como en KiCad, donde va
// arriba). Los sitios (para las rutas de Blinky) y los brillos de los chips salen de las huellas de cada diseño:
//   SenseRead y SenseID-RHAT  SenseID/devices/products/rfid/tag-rhat/hw/r100_mspm0l130x_shtc3_dk (la misma placa)
//   SenseRead y SenseID-AT    …/rfid/tag-at/hw/r100_mspm0l130x_tmp117_dk (con el TMP117)
//   SenseBLE                  …/ble/tag-rhat/hw/senseble_shtc3_dk, …/ble/tag-at/hw/senseble_tmp117 y
//                             …/ble/tag-acc/hw/senseble_iis2dlpc (el de presión, con un MS5837 en el sitio del SHTC3)
//   SenseNFC                  senseid-nfc-tag-rhat/hw/sensenfc_shtc3_s
// El SHTC3 no tiene modelo en la librería de KiCad 10: se pone aquí, en su huella. Los modelos se cargan aparte
// (cargarModelos(), antes de montar los planos); hasta entonces, la placa sale vacía.
//   crearTagUHF({ tipo, sensor, sin })  tipo 'read' | 'id' | 'ble'; sensor 'rhat' | 'at' | 'acc' (solo BLE) | 'pres'; sin,
//                                  las referencias de KiCad que se quitan (['IC1', 'IC4']: para poner ahí un chip abierto)
//   crearTagNFC()
// Devuelven el grupo, los sitios (puntos locales, sobre la cara), los chips (chip.encender(k)) y encenderDipolo(k) o
// encenderEspira(k).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ARRIBA = 0.0008;                                   // la cara de componentes (la placa, de 1,6 mm, centrada en y = 0)

// ---------------------------------------------------------------- los modelos de KiCad
const ARCHIVOS = { rfid_rhat: 'modelos/rfid_rhat.glb', rfid_at: 'modelos/rfid_at.glb', ble_rhat: 'modelos/ble_rhat.glb', ble_at: 'modelos/ble_at.glb', ble_acc: 'modelos/ble_acc.glb', nfc_rhat: 'modelos/nfc_rhat.glb' };
// el centro de cada placa (el de su contorno), en mm de KiCad
const CENTRO = { rfid_rhat: [139.45, 81.5], rfid_at: [139.45, 81.5], ble_rhat: [150.0, 73.615], ble_at: [150.0, 73.615], ble_acc: [150.0, 73.615], nfc_rhat: [149.75, 70.25] };
const MODELOS = {}, ESPERAN = {}, CRUDOS = {}, VARIANTES = {};
// los GLB de KiCad traen una malla por pista, pad y componente (miles por placa): con diez placas por plano eran más de
// 100 000 llamadas de dibujo por cuadro. Se juntan, al cargar, en una malla por material (con lo que tengan todas las del
// material: posición, normal y, si la tienen, uv y color)
// (fuera: las referencias de KiCad que no entran; con ellas, los materiales van copiados: así quien la monta los toca sin
// tocar los de la placa entera)
function juntar(raiz, fuera = null) {
  raiz.updateMatrixWorld(true);
  const porMat = new Map(), copia = new Map();
  const quitado = (o) => { for (let p = o; p; p = p.parent) if (fuera.includes(p.name)) return true; return false; };
  raiz.traverse((o) => {
    if (!o.isMesh || (fuera && quitado(o))) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld); g.morphAttributes = {};
    let m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (fuera) { if (!copia.has(m)) copia.set(m, m.clone()); m = copia.get(m); }
    if (!porMat.has(m)) porMat.set(m, []);
    porMat.get(m).push(g);
  });
  const out = new THREE.Group();
  for (const [m, gs] of porMat) {
    const comunes = Object.keys(gs[0].attributes).filter((k) => gs.every((g) => g.attributes[k]));
    gs.forEach((g) => { for (const k of Object.keys(g.attributes)) if (!comunes.includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); });
    const junta = mergeGeometries(gs);
    if (!junta) { gs.forEach((g) => out.add(new THREE.Mesh(g, m))); continue; }
    out.add(new THREE.Mesh(junta, m));
  }
  return out;
}
// cada modelo, una sola vez: quien lo pida después recibe la misma promesa. Sin lista, todos; con ella, solo esos (el
// episodio 1 pide antes rfid_at, el que ve de cerca, y luego los demás: los seis son 18 MB)
const cargando = {};
export function cargarModelos(claves = Object.keys(ARCHIVOS)) {
  const carga = new GLTFLoader();
  return Promise.all(claves.map((k) => cargando[k] || (cargando[k] = new Promise((ok) => {
    carga.load(new URL(`../${ARCHIVOS[k]}`, import.meta.url).href, (g) => {
      CRUDOS[k] = g.scene;
      const m = juntar(g.scene); m.position.set(-CENTRO[k][0] / 1000, -ARRIBA, -CENTRO[k][1] / 1000);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      MODELOS[k] = m; (ESPERAN[k] || []).forEach((f) => f(m)); ok();
    }, undefined, () => ok());
  }))));
}
// el modelo sin algunos componentes (juntado aparte, la primera vez que se pide)
function variante(k, sin) {
  const clave = `${k}-${sin.join()}`;
  if (!VARIANTES[clave]) {
    const m = juntar(CRUDOS[k], sin); m.position.set(-CENTRO[k][0] / 1000, -ARRIBA, -CENTRO[k][1] / 1000);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    VARIANTES[clave] = m;
  }
  return VARIANTES[clave];
}
// pone en el grupo el modelo de la placa (ya, o en cuanto se cargue)
function ponerModelo(g, k, sin = null) {
  const poner = (m) => g.add((sin ? variante(k, sin) : m).clone(true));
  if (MODELOS[k]) poner(MODELOS[k]); else (ESPERAN[k] = ESPERAN[k] || []).push(poner);
}

// ---------------------------------------------------------------- los brillos y los chips que faltan
// un brillo (k 0-1) del tamaño de un chip, en (x, z), alto h: chip.encender(k)
function brillo(g, [x, z], w, d, h, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, h * 1.15, d * 1.12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(x, ARRIBA + h / 2, z); m.visible = false; g.add(m);
  m.encender = (k) => { m.material.opacity = 0.7 * k; m.visible = k > 0.01; };
  m.alto = h; m.pos = [x, z];
  return m;
}
// un chip sin modelo en la librería: el SHTC3 (DFN de 2 × 2 mm, con su ventana) o el MS5837 (cerámica y tapa metálica)
function chipPropio(g, [x, z], tipo) {
  if (tipo === 'pres') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.0033, 0.0009, 0.0033), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6 }));
    base.position.set(x, ARRIBA + 0.00045, z); g.add(base);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.00155, 0.0018, 40), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 0.9, roughness: 0.3 }));
    tapa.position.set(x, ARRIBA + 0.0009 + 0.0009, z); g.add(tapa);
    const gel = new THREE.Mesh(new THREE.CircleGeometry(0.0009, 32), new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.2 }));
    gel.rotation.x = -Math.PI / 2; gel.position.set(x, ARRIBA + 0.00271, z); g.add(gel);
    return;
  }
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.00075, 0.002), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5 }));
  cuerpo.position.set(x, ARRIBA + 0.000375, z); g.add(cuerpo);
  const ventana = new THREE.Mesh(new THREE.PlaneGeometry(0.0007, 0.0007), new THREE.MeshStandardMaterial({ color: 0xc89b2c, metalness: 0.6, roughness: 0.4 }));
  ventana.rotation.x = -Math.PI / 2; ventana.position.set(x, ARRIBA + 0.00076, z); g.add(ventana);
}

// ---------------------------------------------------------------- los tres UHF
// de mm de KiCad a metros locales (el centro de la placa en el origen)
const mm = (c) => ([x, y]) => [(x - c[0]) / 1000, (y - c[1]) / 1000];
export const UHF = { L: 0.1397, A: 0.0224 };
const DISENOS = {
  // SenseRead y SenseID: el ROCKY100 (IC1), el micro (IC4), el sensor (IC5), el supervisor (IC2), el condensador (C1) y el
  // dipolo, de 71,59 a 72,09 mm, con la alimentación por LM1 y LM2
  rfid: (sensor) => {
    const k = mm(CENTRO.rfid_rhat), zd = (71.84 - 81.5) / 1000;
    return {
      modelo: sensor === 'at' ? 'rfid_at' : 'rfid_rhat', zd, brazos: [[-0.0683, -0.00035], [0.00015, 0.0681]],
      rocky: k([139.36, 78.11]), mcu: k([139.39, 84.5]), sensor: sensor === 'at' ? k([135.72, 85.05]) : k([135.85, 85.33]),
      sup: k([135.2, 77.33]), cap: k([145.2, 78.2]), tam: { rocky: [4, 4, 0.9], mcu: [3, 3, 0.9], sensor: [2, 2, 0.8], sup: [1, 1.6, 0.6], cap: [3.2, 1.6, 1.6] },
      feed: [-1.07, 0.88], lm: -7.35, rockyArriba: -5.4,
      rutas: {
        almacen: [[1.9, -3.4], [4.2, -3.4]], spi: [[-0.1, -1.3], [-0.1, 1.2]], i2c: [[-1.5, 3.5], [-2.7, 3.7]],
      },
      propio: sensor === 'at' ? null : 'rhat',
    };
  },
  // SenseBLE: el ROCKY100 (U1), el micro (IC1), el sensor (U3), la radio IN100 (U2), el cristal (Y1), la antena impresa
  // de 2,4 GHz (AE1) y el condensador (C1); el dipolo, de 63,57 a 64,12 mm
  ble: (sensor) => {
    const k = mm(CENTRO.ble_rhat), zd = (63.85 - 73.615) / 1000;
    return {
      // (las tres placas, la de humedad, la de temperatura con el TMP117 y la de aceleración con el IIS2DLPC, con todo en el
      // mismo sitio; la de presión, la de humedad con el MS5837 en la huella del SHTC3)
      modelo: sensor === 'at' ? 'ble_at' : sensor === 'acc' ? 'ble_acc' : 'ble_rhat', zd, brazos: [[-0.0682, -0.00025], [0.00025, 0.0682]],
      rocky: k([150.0, 70.0]), mcu: k([142.54, 75.42]), sensor: k([147.32, 74.6]), cap: k([145.37, 70.41]),
      radio: k([151.88, 74.79]), xtal: k([156.38, 74.11]), antena: k([146.0, 80.6]),
      tam: { rocky: [4, 4, 0.9], mcu: [4, 4, 1.0], sensor: sensor === 'pres' ? [3.3, 3.3, 2.75] : [2, 2, 0.8], cap: [1.6, 3.2, 1.6], radio: [3, 3, 0.6], xtal: [2.5, 2, 0.8], antena: [6, 2.5, 0.2] },
      feed: [-0.97, 0.97], lm: -7.54, rockyArriba: -5.6,
      rutas: {
        almacen: [[-2.1, -3.4], [-3.6, -3.3]], spi: [[-2.1, -2.4], [-5.4, -0.2]], i2c: [[-5.4, 1.2], [-3.8, 1.0]],
        bus: [[-5.4, 2.8], [0.6, 2.8], [1.4, 2.4]], rf: [[1.0, 3.0], [-0.5, 5.4], [-1.5, 6.2]],
      },
      propio: sensor === 'rhat' || sensor === 'pres' ? sensor : null,
    };
  },
};
const ROJO = 0xff6a3a, AZUL = 0x3d9bff, NARANJA = 0xff8a2a, TURQUESA = 0x26f2d9;

export function crearTagUHF({ tipo = 'read', sensor = 'rhat', sin = null } = {}) {
  const D = (tipo === 'ble' ? DISENOS.ble : DISENOS.rfid)(sensor);
  const g = new THREE.Group();
  ponerModelo(g, D.modelo, sin);
  if (D.propio) chipPropio(g, D.sensor, D.propio);
  const t = D.tam, B = (n, color) => brillo(g, D[n], t[n][0] / 1000, t[n][1] / 1000, t[n][2] / 1000, color);
  const chips = { rocky: B('rocky', NARANJA), mcu: B('mcu', AZUL), sensor: B('sensor', sensor === 'pres' ? 0x9fe8ff : ROJO), cap: B('cap', 0x5fb4ff) };
  if (D.sup) chips.sup = B('sup', AZUL);
  if (tipo === 'ble') { chips.radio = B('radio', TURQUESA); chips.xtal = B('xtal', TURQUESA); chips.antena = B('antena', TURQUESA); }
  // el brillo del dipolo (el campo, en dorado): encenderDipolo(k)
  const matDip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const [a, b] of D.brazos) { const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.0002, 0.0007), matDip); m.position.set((a + b) / 2, ARRIBA + 0.0001, D.zd); g.add(m); }
  const encenderDipolo = (k) => { matDip.opacity = 0.9 * k; };

  // los sitios, a 0,4 mm por encima de la cara (o de lo alto de su chip)
  const Y = ARRIBA + 0.0004, P = ([x, z]) => V(x, Y, z), M = (pts) => pts.map(([x, z]) => P([x / 1000, z / 1000]));
  const Pc = (c) => V(c.pos[0], ARRIBA + c.alto + 0.0005, c.pos[1]);
  const feed = (i) => M([[D.feed[i], D.zd * 1000], [D.feed[i], D.lm], [D.feed[i], D.rockyArriba - 0.4], [D.feed[i] * 0.5, D.rockyArriba]]);
  const sitios = {
    puntaIzq: P([D.brazos[0][0] + 0.002, D.zd]), puntaDer: P([D.brazos[1][1] - 0.002, D.zd]),
    centroIzq: P([D.feed[0] / 1000, D.zd]), centroDer: P([D.feed[1] / 1000, D.zd]),
    feedIzq: feed(0), feedDer: feed(1),
    spi: M(D.rutas.spi), i2c: M(D.rutas.i2c), almacen: M(D.rutas.almacen), bus: D.rutas.bus ? M(D.rutas.bus) : [], rf: D.rutas.rf ? M(D.rutas.rf) : [],
    rocky: Pc(chips.rocky), cap: Pc(chips.cap), mcu: Pc(chips.mcu), sensor: Pc(chips.sensor),
    radio: chips.radio && Pc(chips.radio), antena: chips.antena && Pc(chips.antena),
  };
  return { grupo: g, sitios, chips, L: UHF.L, A: UHF.A, encenderDipolo };
}

// ---------------------------------------------------------------- el SenseNFC
export const NFC = { L: 0.0403 };
export function crearTagNFC() {
  const k = mm(CENTRO.nfc_rhat);
  const g = new THREE.Group();
  ponerModelo(g, 'nfc_rhat');
  const NTAG = k([144.09, 69.58]), MCU = k([150.41, 69.62]), SEN = k([148.09, 63.94]);
  chipPropio(g, SEN, 'rhat');
  const chips = {
    ntag: brillo(g, NTAG, 0.0029, 0.0015, 0.0006, 0xb860ff),
    mcu: brillo(g, MCU, 0.003, 0.003, 0.0009, AZUL),
    sensor: brillo(g, SEN, 0.002, 0.002, 0.0008, ROJO),
  };
  // la espira: su vuelta de fuera (de 130,74 a 168,81 mm en x y de 50,85 a 89,86 en y) y las de dentro, cada milímetro
  const [x0, z0] = k([130.74, 50.85]), [x1, z1] = k([168.81, 89.86]);
  const matEsp = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.5, 1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (let i = 0; i < 5; i++) {
    const a = x0 + i * 0.00094, b = x1 - i * 0.00094, c = z0 + i * 0.00094, d = z1 - i * 0.00094;
    for (const [x, z, w, h] of [[(a + b) / 2, c, b - a, 0.0005], [(a + b) / 2, d, b - a, 0.0005], [a, (c + d) / 2, 0.0005, d - c], [b, (c + d) / 2, 0.0005, d - c]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0002, h), matEsp); m.position.set(x, ARRIBA + 0.0001, z); g.add(m);
    }
  }
  const encenderEspira = (q) => { matEsp.opacity = 0.9 * q; };
  const Y = ARRIBA + 0.0004, Pc = (c) => V(c.pos[0], ARRIBA + c.alto + 0.0005, c.pos[1]), ENT = k([139.0, 69.6]);
  const sitios = {
    espira: [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0 + 0.002]].map(([x, z]) => V(x, Y, z)),
    entrada: V(ENT[0], Y, ENT[1]), ntag: Pc(chips.ntag), mcu: Pc(chips.mcu), sensor: Pc(chips.sensor),
  };
  return { grupo: g, sitios, chips, L: NFC.L, encenderEspira };
}

// ---------------------------------------------------------------- la etiqueta RAIN de identificación
// Una etiqueta normal, sin sensor ni micro (no es de Kliskatek): el soporte blanco, la antena de aluminio en meandro con
// su lazo de adaptación, y el chip diminuto (0,5 mm) en el centro. 95 × 22 mm, la cara hacia +y.
export function crearInlay() {
  const L = 0.095, A = 0.022, g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * A / L); const x = c.getContext('2d');
  const px = (mx, mz) => [(mx / L + 0.5) * c.width, (0.5 - mz / A) * c.height], k = c.width / L;
  x.fillStyle = '#f2f1ec'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#b7bec6'; x.lineWidth = 0.0012 * k; x.lineJoin = 'round';
  for (const s of [-1, 1]) {                             // los dos brazos, en meandro
    x.beginPath(); x.moveTo(...px(s * 0.004, 0));
    for (let i = 0; i < 9; i++) { const a = s * (0.006 + i * 0.0045); x.lineTo(...px(a, i % 2 ? -0.007 : 0.007)); x.lineTo(...px(a + s * 0.0045, i % 2 ? -0.007 : 0.007)); }
    x.lineTo(...px(s * 0.046, 0.009)); x.stroke();
  }
  x.lineWidth = 0.0008 * k; x.strokeRect(...px(-0.004, 0.0035), 0.008 * k, 0.007 * k);   // el lazo de adaptación
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // el brillo de los dos brazos (encenderDipolo(k)): el mismo meandro, encima, en dorado
  const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height; const x2 = c2.getContext('2d');
  x2.strokeStyle = '#ffffff'; x2.lineWidth = 0.002 * k; x2.lineJoin = 'round';
  for (const s of [-1, 1]) {
    x2.beginPath(); x2.moveTo(...px(s * 0.004, 0));
    for (let i = 0; i < 9; i++) { const a = s * (0.006 + i * 0.0045); x2.lineTo(...px(a, i % 2 ? -0.007 : 0.007)); x2.lineTo(...px(a + s * 0.0045, i % 2 ? -0.007 : 0.007)); }
    x2.lineTo(...px(s * 0.046, 0.009)); x2.stroke();
  }
  const matDip = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2), color: new THREE.Color(1.6, 1.0, 0.3), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const brillo2 = new THREE.Mesh(new THREE.PlaneGeometry(L, A), matDip); brillo2.rotation.x = -Math.PI / 2; brillo2.position.y = 0.00015; g.add(brillo2);
  const encenderDipolo = (q) => { matDip.opacity = 0.9 * q; brillo2.visible = q > 0.01; };
  encenderDipolo(0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(L, 0.0002, A), [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshStandardMaterial(i === 2 ? { map: tex, roughness: 0.5 } : { color: 0xf2f1ec, roughness: 0.6 })));
  g.add(base);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.00025, 0.0006), new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.4 }));
  chip.position.set(0, 0.00022, -0.0035); g.add(chip);
  const chips = { chip: brillo(g, [0, -0.0035], 0.0006, 0.0006, 0.00025, NARANJA) };
  chips.chip.position.y = 0.0001 + 0.00025 / 2 + 0.0001;
  const Y = 0.0005;
  const sitios = { puntaIzq: V(-0.044, Y, 0.009), centro: V(-0.004, Y, 0), chip: V(0, Y + 0.0002, -0.0035), puntaDer: V(0.044, Y, 0.009) };
  return { grupo: g, sitios, chips, L, A, encenderDipolo };
}
