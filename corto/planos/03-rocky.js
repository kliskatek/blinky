// Plano 3: dentro del ROCKY100, y de él al micro y al sensor. El encapsulado abierto (sin tapa) sobre la placa de verdad
// (el SenseRead-AT de KiCad, piezas/senseread.js). Empieza donde acaba el plano 2: el electrón pegado por fuera a la pata
// de RF+, encendida, con el mismo tamaño frente al chip y el mismo encuadre (corte con destello). Encoge mientras sube por
// la pata hasta su bond wire (la cámara se le acerca en la misma proporción, así que el chip crece a su alrededor),
// llega al pad de RF, pasa por el rectificador (que se enciende: aquí coge energía), recorre los canales de rutado del
// die (por la foto real: el canal vertical en u ≈ 0,41 y el de abajo en v ≈ 0,83, bajo la lógica digital), sube por el
// margen derecho y sale por el pad de MOSI (SPI), su bond wire y su pata. Por la pista de MOSI de la placa llega al micro
// (IC4, abierto: piezas/mcu.js), lo cruza deprisa (el SPI, el núcleo, el I²C: aquí no se cuenta qué hace) y sale por SDA:
// por su pista hasta una vía, por debajo de la placa hasta otra, y arriba a la pata de SDA del sensor (el TMP117,
// cerrado), donde se queda pegado: corte con destello al plano 4. Por donde pasa, la pista se queda encendida (en el die,
// con tubos; en la placa, con crearRastro).
// Por el die del ROCKY100 va contando lo que ve (el tramo del die va a 3/4 de velocidad, tr() lo estira, para que dé
// tiempo a leerlo): el multiplicador de tensión, el condensador que se carga, el regulador, la lógica RAIN y la memoria
// (las zonas se encienden cuando las nombra). Los tiempos de abajo son sin estirar.
//   0-0.35  sale del destello del corte
//   0.3-2.8 encoge mientras sube por la pata RF+ y el bond wire hasta el pad de RF (de un tramo a otro sin pararse)
//   2.8-4.9 el rectificador: se enciende y el electrón se carga
//   4.9-8.4 canales de rutado hasta la lógica digital
//   8.4-11.4 en zigzag por las celdas de la lógica digital (que trabaja: parpadea); 11.4-14.6 por la memoria MTP
//   14.6-15.1 sale al margen derecho y al pad de MOSI
//   15.1-17 bond wire, pata, fuera (sin pararse entre tramos)
//   17-18.4 la pista de MOSI hasta el micro; 18.4-22.5 su pata, su bond wire y el die (el SPI, dos pasadas por el
//           núcleo, el I²C) hasta el pad de SDA
//   22.5-24.5 su bond wire, su pata y la pista de SDA hasta la vía; 24.5-25.9 por debajo de la placa, hasta la otra
//   25.9-27 hasta la pata de SDA del sensor y se queda pegado a ella; corte con destello al plano 4

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, dialogo } from '../utiles.js';
import { crearRocky, QFN } from '../piezas/rocky.js';
import { crearMCU, MCU, ZONAS_M, IDA_M } from '../piezas/mcu.js';
import { montarPlaca, cerca, pistaCerca, KICAD, MM, SOBRE } from '../piezas/senseread.js';
import { crearRastro } from '../../corto2/piezas/campos.js';
import { TAM_FINAL, PLANO_FINAL, ESCALA_CHIP } from './02-tag.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// el último encuadre, que copia el plano 4 a su escala (como el 3 copia el del 2): el electrón pegado a la pata de SDA
// del sensor, la cámara detrás, por encima y a un lado. En el marco del plano 4 (el del sensor: corre hacia +x); aquí,
// girado (corre hacia −z): (x, y, z) del 4 es (−z, y, x) de aquí
export const TAM_FINAL3 = 0.3, PLANO_FINAL3 = V(-1.0, 0.6, 0.85), ESCALA_SENSOR = 2 * MM;   // (el TMP117 mide 2 mm)
// y la vuelta (del plano 4 al 5): el electrón saliendo por la pata de SDA del sensor hacia −x (en el marco del 4), la
// cámara por delante de él, por fuera del encapsulado
export const PLANO_VUELTA = V(-1.0, 0.6, 0.85);
export const del4 = (v) => V(v.z, v.y, -v.x);          // un vector del marco del plano 4 al de aquí
// el micro, abierto, donde va IC4 en la placa (sin girar: su lado 'i' mira al ROCKY100 y el 'b' al sensor)
const [MX, MZ] = cerca(KICAD.mcu);
export const POS_MCU = V(MX, -QFN.H / 2 + MCU.H / 2, MZ);
// fuera de la pata de SDA del sensor, donde lo recoge el plano 4 (a 0,06 de su canto, a su escala: 2,2 por mm)
export const SDA_SENSOR = [KICAD.bordeSensor - 0.06 / 2.2, 85.7];
const K = QFN.W / ESCALA_CHIP;                         // cuánto más grande es aquí el chip que en el plano 2
const TAM0 = TAM_FINAL * K;                             // el electrón, a la misma escala frente al chip que al final del 2
const ALTO = 0.04;                                      // el electrón (tam 0,3) va un poco por encima de lo que pisa
export const TAM_PLACA = 1.0;                           // y por las pistas de la placa, de su ancho (0,15 mm)
// La ruta por el die, en (u, v) sobre la foto, por pistas que se ven en ella: del pad de RF al rectificador; los canales
// de rutado (el horizontal en v ≈ 0,633, el vertical en u ≈ 0,41 y el de abajo en v ≈ 0,82) hasta la lógica digital;
// dos vueltas dentro de ella por sus buses (el borde con la memoria en u ≈ 0,728, el bus vertical en u ≈ 0,823, el
// borde derecho en u ≈ 0,91 y el centro de la memoria en u ≈ 0,668); y salida por el margen derecho al pad de MOSI
const RECT = [[0.111, 0.477], [0.20, 0.50], [0.265, 0.56]];
const CANALES = [[0.265, 0.56], [0.265, 0.633], [0.407, 0.633], [0.407, 0.822], [0.728, 0.822]];
// por la lógica digital (en la foto, el bloque claro e irregular de filas de celdas: u 0,61-0,735), en zigzag, y luego
// por la memoria MTP (la matriz regular, dorada y oscura, de fuera, junto a los pads: u 0,74-0,905), de arriba abajo por
// su centro, y fuera hacia el pad de salida
const DIGITAL = [[0.728, 0.822], [0.64, 0.79], [0.64, 0.23], [0.678, 0.23], [0.678, 0.76], [0.715, 0.76], [0.715, 0.23]];
const MEMORIA = [[0.715, 0.23], [0.82, 0.23], [0.82, 0.76], [0.875, 0.76], [0.875, 0.63], [0.91, 0.63]];
const SALIDA = [[0.91, 0.63], [0.941, 0.63], [0.955, 0.63]];
// el tramo del die (de A a B) se estira F veces: tr() pasa del tiempo real al de la ruta, y real() al revés
const A = 2.9, B = 14.6, F = 4 / 3, MAS = (B - A) * (F - 1);
const tr = (t) => (t < A ? t : t < A + (B - A) * F ? A + (t - A) / F : t - MAS);
const real = (s) => (s < A ? s : s < B ? A + (s - A) * F : s + MAS);
const FIN = 27.0;
// lo que dice, en tiempos de la ruta
const LINEAS = [
  [3.0, 4.75, '¡Un multiplicador de tensión! Me está cargando de energía.'],
  [5.0, 6.5, '¡Y ese condensador se está llenando!'],
  [6.6, 8.5, 'Aquí, un regulador: tensión estable para todo el chip.'],
  [8.8, 11.2, '¡Mira! Circuitos digitales que hablan el protocolo RAIN.'],
  [11.4, 14.0, 'Y una memoria con datos guardados: el EPC de este tag.'],
  [14.6, 17.8, 'El chip me manda por SPI al micro…'],
  [19.4, 23.4, '…y el micro, por I²C, al sensor: ¡a por la temperatura!'],
].map(([a, b, txt]) => [real(a), real(b), txt]);

const linea = (pts) => { const c = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) c.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return c; };
const alzar = (curva, dy, en = V(0, 0, 0)) => new THREE.CatmullRomCurve3(curva.points.map((p) => p.clone().add(en).add(V(0, dy, 0))));

export default {
  nombre: 'ROCKY100',
  dura: FIN + MAS,
  entorno: 0.2,                                    // (poco reflejo del entorno: el oro y el die brillaban demasiado)
  quieto: [[2.8, real(4.9)]],                     // en el rectificador
  montar({ escena, cam, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x0b0d10, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-4, 10, 7); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x0080ff, 1.0); contra.position.set(7, 3, -6); grupo.add(contra);
    const calida = new THREE.PointLight(0xff8000, 8, 16, 2); calida.position.set(-5, 2, 4); grupo.add(calida);
    const luzE = new THREE.PointLight(0x5aa8ff, 0.8, 1.0, 2); grupo.add(luzE);

    const rk = crearRocky(); grupo.add(rk.grupo);
    const { padEn, hilos, patas, yCara } = rk;
    const yPlaca = -QFN.H / 2 - 0.01;
    // la placa (piezas/senseread.js), a esta escala, sin el ROCKY100 ni el micro (van abiertos): la antena llega por la
    // izquierda a RF+ y RF−; por la derecha salen el SPI al micro y, de él, el I²C al sensor
    montarPlaca(grupo, { centro: 'rocky', yCara: yPlaca, sin: ['IC1', 'IC4'] });
    const mc = crearMCU(); mc.grupo.position.copy(POS_MCU); grupo.add(mc.grupo);
    const enM = (p) => p.clone().add(POS_MCU);

    // los tramos de la ruta
    const zRF = patas.i0.enCanto.z, zMOSI = patas.d2.enCanto.z, yE = yPlaca + SOBRE, W2 = QFN.W / 2;
    const sube = linea([V(-W2 - 0.06, yE, zRF), V(-W2 - 0.04, QFN.H / 2 + ALTO, zRF), patas.i0.enDedo.clone().add(V(0, ALTO, 0))]);
    const hiloRF = alzar(hilos.i0.curva, ALTO); hiloRF.points.reverse();
    const enDie = (uv) => uv.map(([u, v]) => padEn(u, v, ALTO));
    const T = {                                      // cuándo recorre cada trozo del die (el tubo que se enciende, igual)
      rect: [2.8, 4.2], canales: [4.9, 8.4], digital: [8.4, 11.4], memoria: [11.4, 14.6], salida: [14.6, 15.1], micro: [19.5, 22.5],
    };
    const rect = linea(enDie(RECT)), canales = linea(enDie(CANALES)), digitalR = linea(enDie(DIGITAL)), memoriaR = linea(enDie(MEMORIA)), margen = linea(enDie(SALIDA));
    const hiloMOSI = alzar(hilos.d2.curva, ALTO);
    const sale = linea([patas.d2.enDedo.clone().add(V(0, ALTO, 0)), V(W2 + 0.04, QFN.H / 2 + ALTO, zMOSI), V(W2 + 0.1, yE, zMOSI)]);
    // la pista de MOSI hasta la pata 'i0' del micro, por fuera; su pata, su bond wire, el die y su pata de SDA ('b2')
    const pMOSI = mc.patas.i0, pSDA = mc.patas.b2, topeM = POS_MCU.y + MCU.H / 2 + ALTO;
    const aMicro = linea([V(W2 + 0.1, yE, zMOSI), ...pistaCerca(KICAD.mosi, yE).slice(1, -1), V(POS_MCU.x - MCU.W / 2 - 0.06, yE, POS_MCU.z + pMOSI.enCanto.z)]);
    const subeM = linea([V(POS_MCU.x - MCU.W / 2 - 0.06, yE, POS_MCU.z + pMOSI.enCanto.z), V(POS_MCU.x - MCU.W / 2 - 0.04, topeM, POS_MCU.z + pMOSI.enCanto.z), enM(pMOSI.enDedo).add(V(0, ALTO, 0))]);
    const hiloM1 = alzar(mc.hilos.i0.curva, ALTO, POS_MCU); hiloM1.points.reverse();
    const dieM = linea(IDA_M.map(([u, v]) => enM(mc.padEn(u, v, ALTO))));
    const hiloM2 = alzar(mc.hilos.b2.curva, ALTO, POS_MCU);
    const zFueraM = POS_MCU.z + MCU.D / 2 + 0.1, xSDA = POS_MCU.x + pSDA.enCanto.x;
    const bajaM = linea([enM(pSDA.enDedo).add(V(0, ALTO, 0)), V(xSDA, topeM, zFueraM - 0.06), V(xSDA, yE, zFueraM)]);
    // SDA: por su pista hasta la vía, abajo, por dentro de la placa hasta la otra vía, arriba y a la pata del sensor
    const [via1, via2] = [KICAD.sda[2], KICAD.sda2[0]].map((p) => pistaCerca([p], yE)[0]);
    const hondo = yPlaca - 1.24;                                       // (la mitad de la placa, de 1,6 mm)
    const aVia = linea([V(xSDA, yE, zFueraM), ...pistaCerca(KICAD.sda, yE).slice(1)]);
    const abajo = linea([via1, via1.clone().setY(hondo), via2.clone().setY(hondo), via2]);
    const FIN_S = pistaCerca([SDA_SENSOR], yE)[0];
    const aSensor = linea([via2, ...pistaCerca(KICAD.sda2.slice(1, 2), yE), FIN_S]);
    const base = porTramos([
      { t0: 0, t1: 1.8, curva: sube, sale: 3 },                      // sube nada más llegar, sin pararse
      { t0: 1.8, t1: 2.8, curva: hiloRF, junta: true },
      { t0: T.rect[0], t1: T.rect[1], curva: rect, junta: true },
      { t0: T.canales[0], t1: T.canales[1], curva: canales },
      { t0: T.digital[0], t1: T.digital[1], curva: digitalR, junta: true },
      { t0: T.memoria[0], t1: T.memoria[1], curva: memoriaR, junta: true },
      { t0: T.salida[0], t1: T.salida[1], curva: margen, junta: true },
      { t0: 15.1, t1: 16.1, curva: hiloMOSI, junta: true },
      { t0: 16.1, t1: 17.0, curva: sale, junta: true },
      { t0: 17.0, t1: 18.4, curva: aMicro, junta: true },
      { t0: 18.4, t1: 18.9, curva: subeM, junta: true },
      { t0: 18.9, t1: 19.5, curva: hiloM1, junta: true },
      { t0: T.micro[0], t1: T.micro[1], curva: dieM, junta: true },
      { t0: 22.5, t1: 23.1, curva: hiloM2, junta: true },
      { t0: 23.1, t1: 23.6, curva: bajaM, junta: true },
      { t0: 23.6, t1: 24.5, curva: aVia, junta: true },
      { t0: 24.5, t1: 25.9, curva: abajo, junta: true },
      { t0: 25.9, t1: FIN, curva: aSensor, junta: true, llega: 0.15 },  // llega a la pata del sensor en el corte, aún en marcha
    ]);
    // al empezar es tan grande como al final del plano 2 (frente al chip) y encoge mientras sube: el chip "crece".
    // Mientras es grande se aparta de la pared y se apoya en la placa, por su radio de más. Por las pistas de la placa
    // (MOSI y SDA) vuelve a crecer, a TAM_PLACA (lo ancho de la pista): con el tamaño del die, allí apenas se le veía
    const tamDie = (t) => lerp(TAM0, 0.3, smoother(seg(t, 0, 1.8)));
    const enPlaca = (t) => smoother(seg(t, 16.9, 17.4)) * (1 - smoother(seg(t, 18.0, 18.45))) + smoother(seg(t, 23.5, 24.0)) * (1 - smoother(seg(t, 26.0, 26.5)));
    const tam = (t) => tamDie(t) + (TAM_PLACA - 0.3) * enPlaca(t);
    const ruta = (t) => base(t).add(V(-0.12 * (tamDie(t) - 0.3), 0.12 * (tam(t) - 0.3), 0));

    // lo que se enciende: la pista del die por donde pasa (tubos que crecen con él), el rectificador, la lógica digital,
    // los bond wires; en la placa, la pista por donde corre (crearRastro); en el micro, sus zonas
    const matLuz = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.75, 1.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tuboEn = (pts, [t0, t1], ease = smoother) => {
      const geo = new THREE.TubeGeometry(linea(pts), 480, 0.011, 10);
      grupo.add(new THREE.Mesh(geo, matLuz));
      const n = geo.index.count;
      return (t) => geo.setDrawRange(0, Math.floor(n * ease(seg(t, t0, t1)) / 6) * 6);
    };
    const tubo = (uv, tt, ease) => tuboEn(enDie(uv).map((p) => p.setY(yCara + 0.006)), tt, ease);
    const tubos = [tubo(RECT, T.rect, base.ease[2]), tubo(CANALES, T.canales, base.ease[3]), tubo(DIGITAL, T.digital, base.ease[4]), tubo(MEMORIA, T.memoria, base.ease[5]), tubo(SALIDA, T.salida, base.ease[6]),
      tuboEn(IDA_M.map(([u, v]) => enM(mc.padEn(u, v, 0.006))), T.micro, base.ease[12])];
    const rastroMOSI = crearRastro({ queda: 30 }), rastroSDA = crearRastro({ queda: 30 }); grupo.add(rastroMOSI.objeto, rastroSDA.objeto);
    // (los azules, tapando en vez de sumando: sumados a la foto dorada del die salían rosas)
    const zonaEn = (pEn, dw, dh) => (u0, v0, u1, v1, color, tapa = false) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry((u1 - u0) * dw, (v1 - v0) * dh),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: tapa ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, toneMapped: !tapa }));
      m.rotation.x = -Math.PI / 2; m.position.copy(pEn((u0 + u1) / 2, (v0 + v1) / 2, 0.004)); grupo.add(m); return m;
    };
    const zona = zonaEn(padEn, QFN.dw, QFN.dh), zonaM = zonaEn((u, v, a) => enM(mc.padEn(u, v, a)), MCU.dw, MCU.dh);
    const rectificador = zona(0.17, 0.44, 0.31, 0.62, 0xff8a2a);
    const digital = zona(0.612, 0.2, 0.735, 0.775, 0x3d9bff);
    // las que nombra por el camino: el condensador (se llena de abajo arriba), el regulador y la memoria. Con los colores
    // de la serie (corto/LENGUAJE.md): la energía guardada, en el azul claro del depósito; el control de la energía, en
    // el azul del monitor (el turquesa es de BLE)
    const condensador = zona(0.29, 0.66, 0.39, 0.80, 0x5fb4ff, true);
    const regulador = zona(0.43, 0.66, 0.58, 0.79, 0x3d9bff, true);
    const memoria = zona(0.738, 0.185, 0.905, 0.80, 0xffb15a);             // la de fuera, junto a los pads
    const vCond = padEn(0.34, 0.80, 0.004).z, altoCond = 0.14 * QFN.dh;
    // el micro: el SPI, el núcleo (trabaja: parpadea) y el I²C, cada uno cuando pasa por él (en el azul de la lógica)
    const mSPI = zonaM(...ZONAS_M.spi, 0x3d9bff), mNucleo = zonaM(...ZONAS_M.nucleo, 0x3d9bff), mI2C = zonaM(...ZONAS_M.i2c, 0x3d9bff);
    // la lógica trabajando mientras pasa: celdas que parpadean, cada una a su ritmo
    const r = rng(23);
    const celdas = Array.from({ length: 22 }, () => {
      const u = 0.62 + r() * 0.085, v = 0.21 + r() * 0.53, du = 0.015 + r() * 0.03, dv = 0.012 + r() * 0.025;
      return { m: zona(u, v, u + du, v + dv, r() < 0.75 ? 0x6fc0ff : 0xffb15a), f: 3 + r() * 9, fase: r() * 6.28 };
    });
    for (const h of [hilos.i0, hilos.d2, mc.hilos.i0, mc.hilos.b2]) h.malla.material.emissive = new THREE.Color(0x3d9bff);
    // la pata de SDA del sensor, que se enciende al llegar
    const luzSDA = new THREE.Mesh(new THREE.BoxGeometry(0.4 * MM, 0.06, 0.45 * MM), new THREE.MeshBasicMaterial({ color: 0x3d9bff,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    luzSDA.position.copy(pistaCerca([[KICAD.sda2[2][0] + 0.05, 85.7]], yPlaca + 0.04)[0]); grupo.add(luzSDA);

    const sigue = (dx, dy, dz) => (t) => ruta(t).add(V(dx, dy, dz));
    // el primer encuadre es el último del plano 2 a esta escala, girado: allí corría hacia −z y aquí hacia +x. Mientras
    // encoge, la cámara se le acerca en la misma proporción: él no cambia en pantalla y el chip crece a su alrededor
    const deCorte = V(-PLANO_FINAL.z, PLANO_FINAL.y, PLANO_FINAL.x).multiplyScalar(K);
    const encoge = (t) => ruta(t).add(deCorte.clone().multiplyScalar(tam(t) / TAM0));
    const CM = POS_MCU.clone().setY(yCara), corte = del4(PLANO_FINAL3), VIAS = via1.clone().lerp(via2, 0.5);
    const camara = porClaves([
      { t: 0, pos: encoge, mira: sigue(0, 0, 0), fov: 30 },
      { t: 1.7, pos: encoge, mira: sigue(0, 0, 0), fov: 30 },
      { t: 2.8, pos: sigue(-1.3, 1.5, 1.6), mira: sigue(0.2, 0, 0.2), fov: 34, paso: true },
      { t: 4.0, pos: sigue(-1.0, 1.25, 1.3), mira: sigue(0.1, 0, 0), fov: 34, paso: true },
      { t: 5.4, pos: sigue(-1.05, 1.2, 1.35), mira: sigue(0.2, 0, 0), fov: 34 },
      { t: 8.2, pos: sigue(-1.05, 1.2, 1.35), mira: sigue(0.2, 0, 0), fov: 34 },
      // dentro de la lógica digital: más desde arriba, para que se lean las vueltas; a mitad, se abre para verlas enteras
      { t: 9.3, pos: sigue(-0.6, 1.8, 1.1), mira: sigue(0, 0, 0), fov: 34 },
      { t: 10.9, pos: sigue(-0.6, 1.8, 1.1), mira: sigue(0, 0, 0), fov: 34 },
      { t: 11.9, pos: padEn(0.77, 0.5).add(V(-0.5, 3.3, 2.1)), mira: padEn(0.77, 0.52), fov: 34 },
      { t: 12.9, pos: padEn(0.77, 0.5).add(V(-0.5, 3.3, 2.1)), mira: padEn(0.77, 0.52), fov: 34 },
      { t: 13.9, pos: sigue(-0.6, 1.8, 1.1), mira: sigue(0, 0, 0), fov: 34 },
      { t: 14.7, pos: sigue(-1.0, 1.25, 1.2), mira: sigue(0, 0, 0), fov: 34, paso: true },
      { t: 15.8, pos: V(4.7, 2.3, 2.6), mira: V(2.6, 0.35, 0.3), fov: 34, paso: true },
      // por la pista de MOSI, detrás de él y a un lado; y, al llegar, el micro abierto desde arriba
      { t: 17.3, pos: V(4.0, 2.4, 2.6), mira: (t) => ruta(t).lerp(V(7.0, -0.3, -0.8), 0.3), fov: 34, paso: true },
      { t: 18.5, pos: CM.clone().add(V(-3.6, 3.4, 2.8)), mira: (t) => ruta(t).lerp(CM, 0.6), fov: 34, paso: true },   // (sin perderlo)
      { t: 19.6, pos: sigue(-0.9, 1.5, 1.2), mira: sigue(0.1, 0, 0), fov: 34, paso: true },
      { t: 21.6, pos: sigue(-0.9, 1.6, 0.6), mira: sigue(0.1, 0, 0.2), fov: 34 },
      // sale por SDA hacia el sensor: la vía, por donde se mete bajo la placa; y la otra, por donde sale
      { t: 23.4, pos: sigue(-1.6, 1.8, -1.2), mira: sigue(0.2, 0, 0.8), fov: 34, paso: true },
      // (las dos vías y el sensor entre ellas, desde arriba: se mete por una y sale por la otra)
      { t: 24.5, pos: VIAS.clone().add(V(-2.6, 8.5, -1.2)), mira: VIAS.clone().add(V(0, 0, -0.6)), fov: 38, paso: true },
      { t: 25.6, pos: VIAS.clone().add(V(-1.6, 7.5, 0.6)), mira: VIAS.clone().add(V(0, 0, 0.8)), fov: 38, paso: true },
      { t: 26.2, pos: sigue(1.6, 1.4, 2.0), mira: sigue(-0.2, 0, -0.8), fov: 32, paso: true },
      { t: 26.8, pos: sigue(...corte.toArray()), mira: sigue(0, 0, 0), fov: 30 },   // en el corte, ruta = FIN_S
    ]);

    const FONDO = new THREE.Color(0x05080f);
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tReal) {
        const t = tr(tReal);
        camara(t, cam);
        habla(dialogo(tReal, LINEAS));
        tubos.forEach((f) => f(t));
        rastroMOSI.actualizar(t, ruta, 16.1, 18.4);
        rastroSDA.actualizar(t, ruta, 23.1, FIN);

        const carga = bell(t, 3.6, 5.2);
        rectificador.material.opacity = 0.32 * carga;
        const llena = smooth(seg(t, 5.0, 6.6));
        condensador.scale.y = Math.max(0.001, llena); condensador.position.z = vCond - altoCond * llena / 2;
        condensador.material.opacity = 0.6 * llena * (1 - smooth(seg(t, 9.0, 10.0)));
        regulador.material.opacity = 0.45 * bell(t, 6.4, 8.8) * (0.8 + 0.2 * Math.sin(t * 9));
        memoria.material.opacity = 0.32 * bell(t, 11.2, 14.4);
        const dentro = smooth(seg(t, 8.0, 8.8)) * (1 - smooth(seg(t, 14.6, 15.6)));
        digital.material.opacity = dentro * (0.1 + 0.04 * Math.sin(t * 7));   // (más, con él dentro, quemaba la foto del die)
        celdas.forEach((c) => { c.m.material.opacity = dentro * 0.4 * Math.max(0, Math.sin(t * c.f + c.fase)) ** 3; });
        const enMicro = smooth(seg(t, 19.3, 19.8)) * (1 - smooth(seg(t, 22.4, 23.2)));
        mSPI.material.opacity = 0.2 * bell(t, 19.3, 20.6);
        mNucleo.material.opacity = 0.16 * bell(t, 20.0, 22.0) * (0.7 + 0.3 * Math.sin(t * 13));
        mI2C.material.opacity = 0.2 * bell(t, 21.5, 23.0);
        hilos.i0.malla.material.emissiveIntensity = 2.2 * bell(t, 1.8, 3.0);
        hilos.d2.malla.material.emissiveIntensity = 2.2 * bell(t, 15.1, 16.3);
        mc.hilos.i0.malla.material.emissiveIntensity = 2.2 * bell(t, 18.9, 19.9);
        mc.hilos.b2.malla.material.emissiveIntensity = 2.2 * bell(t, 22.5, 23.5);

        electron.visible = true;
        electron.ruta = (s) => ruta(tr(s)); electron.rutaDesde = 0;
        electron.tam = tam(t); electron.calor = 0; electron.ojos = 1;
        // viene brillando; se carga en el rectificador; en la lógica digital y en el micro, lo procesan: chispea
        electron.brillo = Math.max(0.25 * (1 - smooth(seg(t, 0, 1))), 0.55 * carga, (dentro + enMicro) * 0.1 * (0.5 + 0.5 * Math.sin(t * 19)));
        patas.i0.pata.material.emissive.setHex(0x3d9bff);
        patas.i0.pata.material.emissiveIntensity = 3 * (1 - smooth(seg(t, 0.3, 1.4)));  // la pata, encendida como al final del plano 2
        electron.estela = t > 24.6 && t < 25.8 ? 0 : 0.8;                            // (bajo la placa, sin estela que asome)
        // mira arriba al cargarse; dentro de la lógica, a todos lados
        const mx = t > 4.3 && t < 4.8 ? 0 : dentro > 0.5 ? 0.9 * Math.sin(t * 2.6) : 0.7;
        const my = t > 4.3 && t < 4.8 ? 0.6 : dentro > 0.5 ? 0.4 * Math.sin(t * 1.7) : 0;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));
        luzE.position.copy(ruta(t)).add(V(0, 0.08, 0));
        luzE.intensity = 0.8 * Math.min(1, tam(t) / TAM0) ** 2;          // con él, encoge: pequeño y tan cerca del die, lo quemaba

        // la pata de SDA del sensor se enciende al llegar; destello del corte al plano 4
        luzSDA.material.opacity = 0.8 * smooth(seg(t, 26.2, 26.6));
        velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.6 * smooth(seg(t, FIN - 0.25, FIN))), 0xcfe6ff);
      },
    };
  },
};
