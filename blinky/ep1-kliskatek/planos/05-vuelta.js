// Plano 5: la vuelta, por el mismo camino. Empieza como acaba el plano 4: el electrón, rojo (lleva la temperatura),
// pegado por fuera a la pata de SDA del sensor (cerrado, en la placa de verdad a la escala del plano 3; PLANO_VUELTA).
// Corre por la pista de SDA, por debajo de la placa de una vía a otra, hasta el micro (abierto, como en el plano 3), lo
// cruza (el I²C, el núcleo, el SPI) y sale por MISO; por su pista llega a la pata d3 del ROCKY100 y su bond wire, cruza
// el die de vuelta hasta el pad de RF (por los mismos canales; la pista, encendida en rojo por donde pasa) y sale por la
// pata de RF+. Ahí, el corte del plano 3 al revés: crece mientras la cámara se aleja en la misma proporción (el chip
// encoge a su alrededor) y, con un destello, está otra vez en el tag, en el encuadre en que lo dejó el plano 2. Vuelve
// por la alimentación hasta el centro del dipolo, la antena se enciende (backscatter) y sale disparado al aire entre
// frentes de onda, hacia el lector. Lo del tag (decorado B) va con los tiempos de siempre, retrasados D segundos: lo que
// dura de más la vuelta por el micro (los de abajo, en el tag, son sin ese retraso).
//   0-0.3   sale del destello del corte
//   0-2.4   la pista de SDA hasta la vía, y por debajo de la placa hasta la otra; 2.4-3.3 hasta el micro
//   3.3-8.1 su pata de SDA, su bond wire, el die de vuelta, el bond wire y la pata de MISO
//   8.1-10.9 la pista de MISO hasta la pata d3 del ROCKY100 y su bond wire
//   10.9-15 el die de vuelta, del pad de MISO al de RF
//   15-16.8 bond wire de RF, pata, fuera; 16.8-18.3 crece; destello (en 18,4: CORTE + D)
//   11-14.2 en el tag: sale de la pata, vuelve por la alimentación (salta la bobina) al centro del dipolo
//   14.2-15.2 la antena se carga en naranja; en 14.5 se para (PAUSA segundos: lo de después va retrasado eso, tr() lo
//           mete) y ve llegar fotones del lector: la antena parpadea con la modulación del chip y, los que llegan con ella
//           encendida, rebotan de vuelta (backscatter); lo explica, vuelve a ser fotón y dice que va a ver adónde van
//   15.2-22.2 sale disparado (cada vez más deprisa y más grande: de la escala del tag a la de la planta) al aire, con los frentes de backscatter; la cámara acaba detrás de él (TRAS_VUELO), como
//           empieza el plano 6

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, texturaPunto, dialogo, pasa, cajaBisel } from '../../../comun/motor/utiles.js';
import { crearRocky, QFN } from '../../comun/rocky.js';
import { crearMCU, MCU, VUELTA_M, ZONAS_M } from '../../comun/mcu.js';
import { Electron } from '../../comun/electron.js';
import { montarTag, enPlanta, dirEnPlanta, TAM_FINAL, PLANO_FINAL, ESCALA_CHIP, PLANTA } from './02-tag.js';
import { ANTENA_POS } from '../../../comun/piezas/planta.js';
import { PLANO_VUELTA, del4, POS_MCU, SDA_SENSOR, TAM_PLACA } from './03-rocky.js';
import { montarPlaca, pistaCerca, KICAD, MM, SOBRE } from '../piezas/senseread.js';
import { crearRastro } from '../../comun/campos.js';

// la cámara detrás del electrón en vuelo, en su dirección de marcha: así acaba este plano y así empieza el 6
export const TRAS_VUELO = { atras: -4.5, arriba: 1.4, lado: 1.6, delante: 3, fov: 34 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const K = QFN.W / ESCALA_CHIP, TAM0 = TAM_FINAL * K;   // las mismas escalas que el corte del plano 2 al 3
const ALTO = 0.04, CORTE = 11.0, D = 7.4;
const PARA = 14.5, PAUSA = 9.0;
const T_SAL = 7.0, FIN = 15.2 + T_SAL;                                // la salida (hasta el plano 6) y el final
const tr = (t) => (t < PARA ? t : t < PARA + PAUSA ? PARA : t - PAUSA);
const LINEAS_A = [[8.6, 12.6, 'Vuelvo con la temperatura: el chip la guarda para contestar al lector.']];
const LINEAS = [
  [PARA + 0.3, PARA + 3.4, '¡Vaya! La parte digital está modulando la impedancia del chip…'],
  [PARA + 3.5, PARA + 6.4, '…y parte de la energía incidente rebota por desadaptación.'],
  [PARA + 6.8, PARA + PAUSA, 'Fotón otra vez… ¡Voy a ver adónde se dirigen!'],
];
// la modulación del chip (encendida: la antena, desadaptada, refleja), en tiempo real: tramos de H segundos, encendida
// y apagada, desde MOD0. Los fotones del lector llegan cada uno en el centro de un tramo (lejos de los cambios: si no,
// parecía que alguno rebotaba con la antena apagada), uno rebota y el siguiente se queda
const H_MOD = 0.6, MOD0 = PARA + 0.4;
const MODULA = (t) => t >= MOD0 && Math.floor((t - MOD0) / H_MOD) % 2 === 0;
// lo mismo para el brillo, con los cambios en 0,08 s (de golpe, en un cuadro, parpadeaba) y encendida antes de MOD0 (si
// no, entre la carga y el primer tramo se apagaba un momento, sin fotones)
const MOD_SUAVE = (t) => {
  if (t < MOD0) return 1;
  const k = (t - MOD0) / H_MOD, u = k % 2, f = 0.08 / H_MOD;
  return u < 1 ? (k < 1 ? 1 : smooth(Math.min(1, u / f))) : 1 - smooth(Math.min(1, (u - 1) / f));
};
const DIE_VUELTA = [[0.955, 0.768], [0.941, 0.768], [0.941, 0.822], [0.407, 0.822], [0.407, 0.633], [0.265, 0.633], [0.265, 0.56], [0.20, 0.50], [0.111, 0.477]];

const linea = (pts) => { const c = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) c.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return c; };
const alzar = (curva, dy, en = V(0, 0, 0)) => new THREE.CatmullRomCurve3(curva.points.map((p) => p.clone().add(en).add(V(0, dy, 0))));

export default {
  nombre: 'La vuelta',
  dura: FIN + PAUSA + D,
  entorno: 0.2,                                    // (poco reflejo del entorno: el oro y el die brillaban demasiado)
  quieto: [[PARA + D, PARA + PAUSA + D]],
  montar({ escena, cam, ren, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x0b0d10, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(-5, 10, 8); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x0080ff, 1.2); contra.position.set(7, 3, -6); grupo.add(contra);
    const luzE = new THREE.PointLight(0xff5a1a, 0.9, 1.2, 2); grupo.add(luzE);

    // ---------------------------------------------------------------- decorado A: la placa de cerca (escala del plano 3)
    // (sus tiempos van de 0 a CORTE + D)
    const A = new THREE.Group(); grupo.add(A);
    const rk = crearRocky(); A.add(rk.grupo);
    const { padEn, hilos, patas, yCara } = rk;
    const W2 = QFN.W / 2, yPlaca = -QFN.H / 2 - 0.01, yE = yPlaca + SOBRE;
    // la placa (piezas/senseread.js), como en el plano 3, con el ROCKY100 y el micro abiertos: el electrón sale de la
    // pata de SDA del sensor (donde lo dejó el plano 4)
    montarPlaca(A, { centro: 'rocky', yCara: yPlaca, sin: ['IC1', 'IC4'] });
    const mc = crearMCU(); mc.grupo.position.copy(POS_MCU); A.add(mc.grupo);
    const enM = (p) => p.clone().add(POS_MCU);
    const zRF = patas.i0.enCanto.z, zD3 = patas.d3.enCanto.z;
    const INICIO_V = pistaCerca([SDA_SENSOR], yE)[0];                   // pegado a la pata de SDA, por fuera
    // SDA: a la vía, por dentro de la placa a la otra y por su pista al micro
    const [via1, via2] = [KICAD.sda[2], KICAD.sda2[0]].map((p) => pistaCerca([p], yE)[0]);
    const hondo = yPlaca - 1.24;                                       // (la mitad de la placa, de 1,6 mm)
    const pSDA = mc.patas.b2, pMISO = mc.patas.i2, topeM = POS_MCU.y + MCU.H / 2 + ALTO;
    const xSDA = POS_MCU.x + pSDA.enCanto.x, zFueraM = POS_MCU.z + MCU.D / 2 + 0.1;
    const xMISO = POS_MCU.x - MCU.W / 2, zMISO = POS_MCU.z + pMISO.enCanto.z;
    const deSensor = linea([INICIO_V, ...pistaCerca(KICAD.sda2.slice(1, 2), yE), via2]);
    const porDebajo = linea([via2, via2.clone().setY(hondo), via1.clone().setY(hondo), via1]);
    const alMicro = linea([via1, pistaCerca([KICAD.sda[1]], yE)[0], V(xSDA, yE, zFueraM)]);
    const subeM = linea([V(xSDA, yE, zFueraM), V(xSDA, topeM, zFueraM - 0.06), enM(pSDA.enDedo).add(V(0, ALTO, 0))]);
    const hiloM1 = alzar(mc.hilos.b2.curva, ALTO, POS_MCU); hiloM1.points.reverse();
    const dieM = linea(VUELTA_M.map(([u, v]) => enM(mc.padEn(u, v, ALTO))));
    const hiloM2 = alzar(mc.hilos.i2.curva, ALTO, POS_MCU);
    const bajaM = linea([enM(pMISO.enDedo).add(V(0, ALTO, 0)), V(xMISO - 0.04, topeM, zMISO), V(xMISO - 0.06, yE, zMISO)]);
    // MISO: por su pista a la pata d3 del ROCKY100
    const aRocky = linea([V(xMISO - 0.06, yE, zMISO), ...pistaCerca(KICAD.miso, yE).slice(1, -1), V(W2 + 0.1, yE, zD3), V(W2 + 0.04, QFN.H / 2 + ALTO, zD3), patas.d3.enDedo.clone().add(V(0, ALTO, 0))]);
    const hiloMISO = alzar(hilos.d3.curva, ALTO); hiloMISO.points.reverse();
    const dieV = linea(DIE_VUELTA.map(([u, v]) => padEn(u, v, ALTO)));
    const hiloRF = alzar(hilos.i0.curva, ALTO);
    const sale = linea([patas.i0.enDedo.clone().add(V(0, ALTO, 0)), V(-W2 - 0.04, QFN.H / 2 + ALTO, zRF), V(-W2 - 0.06, yE, zRF)]);
    const baseA = porTramos([
      { t0: 0, t1: 1.0, curva: deSensor, sale: 0.15 },                // arranca nada más empezar, sin quedarse parado;
      { t0: 1.0, t1: 2.4, curva: porDebajo, junta: true },           // y de un tramo a otro, igual
      { t0: 2.4, t1: 3.3, curva: alMicro, junta: true },
      { t0: 3.3, t1: 3.8, curva: subeM, junta: true },
      { t0: 3.8, t1: 4.4, curva: hiloM1, junta: true },
      { t0: 4.4, t1: 7.0, curva: dieM, junta: true },
      { t0: 7.0, t1: 7.6, curva: hiloM2, junta: true },
      { t0: 7.6, t1: 8.1, curva: bajaM, junta: true },
      { t0: 8.1, t1: 10.0, curva: aRocky, junta: true },
      { t0: 10.0, t1: 10.9, curva: hiloMISO, junta: true },
      { t0: 10.9, t1: 15.0, curva: dieV, junta: true },
      { t0: 15.0, t1: 15.9, curva: hiloRF, junta: true },
      { t0: 15.9, t1: 16.8, curva: sale, junta: true },
    ]);
    // como en el plano 3: por las pistas de la placa (SDA y MISO), de TAM_PLACA; al salir del ROCKY100, crece hasta TAM0
    const tamDie = (t) => lerp(0.3, TAM0, smoother(seg(t, 16.8, 18.3)));
    const enPlaca = (t) => smoother(seg(t, 0.4, 0.9)) * (1 - smoother(seg(t, 2.8, 3.3))) + smoother(seg(t, 8.0, 8.5)) * (1 - smoother(seg(t, 9.4, 9.85)));
    const tamA = (t) => tamDie(t) + (TAM_PLACA - 0.3) * enPlaca(t);
    const rutaA = (t) => baseA(t).add(V(-0.12 * (tamDie(t) - 0.3), 0.12 * (tamA(t) - 0.3), 0));
    // la pista del die (del ROCKY100 y del micro), encendida en rojo por donde pasa; y la de la placa (crearRastro)
    const matRojo = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.45, 0.12), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const geoLuz = new THREE.TubeGeometry(linea(DIE_VUELTA.map(([u, v]) => padEn(u, v).setY(yCara + 0.006))), 400, 0.011, 10);
    const geoLuzM = new THREE.TubeGeometry(linea(VUELTA_M.map(([u, v]) => enM(mc.padEn(u, v, 0.006)))), 400, 0.011, 10);
    A.add(new THREE.Mesh(geoLuz, matRojo), new THREE.Mesh(geoLuzM, matRojo));
    const rastroSDA = crearRastro({ vuelta: true, queda: 30 }), rastroMISO = crearRastro({ vuelta: true, queda: 30 }); A.add(rastroSDA.objeto, rastroMISO.objeto);
    for (const h of [hilos.d3, hilos.i0, mc.hilos.b2, mc.hilos.i2]) h.malla.material.emissive = new THREE.Color(0xff5a1a);
    // el micro, mientras lo cruza: el I²C, el núcleo y el SPI (en el azul de la lógica)
    const zonaM = (u0, v0, u1, v1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry((u1 - u0) * MCU.dw, (v1 - v0) * MCU.dh),
        new THREE.MeshBasicMaterial({ color: 0x3d9bff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(enM(mc.padEn((u0 + u1) / 2, (v0 + v1) / 2, 0.004))); A.add(m); return m;
    };
    const mI2C = zonaM(...ZONAS_M.i2c), mNucleo = zonaM(...ZONAS_M.nucleo), mSPI = zonaM(...ZONAS_M.spi);
    // la pata de SDA del sensor, encendida (en rojo) como al final del plano 4
    const luzSDA = new THREE.Mesh(new THREE.BoxGeometry(0.4 * MM, 0.06, 0.45 * MM), new THREE.MeshBasicMaterial({ color: 0xff5a1a,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    luzSDA.position.copy(pistaCerca([[KICAD.sda2[2][0] + 0.05, 85.7]], yPlaca + 0.04)[0]); A.add(luzSDA);

    // ---------------------------------------------------------------- decorado B: el tag (escala del plano 2)
    const B = new THREE.Group(); grupo.add(B);
    const { tag, yPista, zA, xF, zF, zB, pata, planta } = montarTag(B);
    planta.verDentro(1);                                             // dentro de la máquina, con la carcasa transparente (al salir, opaca otra vez)
    const centro = V(0, yPista, zA);                                 // el centro del dipolo, junto al condensador
    const deshace = new THREE.CatmullRomCurve3([pata, V(xF, (pata.y + yPista) / 2 + 0.04, (pata.z + zF) / 2), V(xF, yPista, zF)]);
    const sube = new THREE.LineCurve3(V(xF, yPista, zF), V(xF, yPista, zA));
    const alCentro = new THREE.LineCurve3(V(xF, yPista, zA), centro);
    const ANT = enPlanta(ANTENA_POS), DIR = ANT.clone().sub(centro).normalize();   // hacia la antena del lector, en la planta
    const H = V(DIR.x, 0, DIR.z).normalize();                           // su dirección en horizontal
    // la salida, hasta donde empieza el plano 6: sale disparado del tag, fuera de la máquina, hasta el punto de la planta en
    // que el 6 empieza su vuelo hacia la antena (a 3 m de ella, por su haz), con su dirección y su velocidad. Y mientras,
    // crece (él y la distancia de la cámara) hasta 12 veces: la escala del 6 (10 unidades por metro; aquí, 120), así que
    // la máquina y el generador se quedan atrás y aparece la nave, y el corte cae en el mismo encuadre de la misma planta
    const P6 = (k, y) => planta.cara.clone().addScaledVector(planta.normal, k).add(V(0, y, 0));   // el vuelo del 6, en metros
    const vuelo6 = new THREE.CatmullRomCurve3([P6(3, 0.7), P6(1.8, 0.4), P6(0.8, 0.12), P6(0.25, 0), P6(0.013, 0)]);
    const E5 = enPlanta(vuelo6.getPointAt(0)), T5 = dirEnPlanta(vuelo6.getTangentAt(0));
    const ESCALA = PLANTA / 10, v5fin = ESCALA * 1.2 * vuelo6.getLength() * 10 / 5.0;   // la del 6 al empezar (1,2 × su largo / 5 s)
    const lejos = centro.distanceTo(E5);
    const salida = new THREE.CubicBezierCurve3(centro, centro.clone().add(V(0, lejos * 0.08, 0)).addScaledVector(H, lejos * 0.3),
      E5.clone().addScaledVector(T5, -lejos * 0.35), E5);
    salida.arcLengthDivisions = 2000;
    // lo recorrido crece como una exponencial (arranca despacio, a su escala, y acelera mientras crece) y acaba a v5fin
    const LSAL = salida.getLength();
    let lo = 0.05, hi = 30;                                            // a: LSAL·a·e^a/((e^a − 1)·T_SAL) = v5fin (bisección)
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (LSAL * m * Math.exp(m) / ((Math.exp(m) - 1) * T_SAL) < v5fin) lo = m; else hi = m; }
    const aS = (lo + hi) / 2, easeS = (x) => (Math.exp(aS * x) - 1) / (Math.exp(aS) - 1);
    const escala = (t) => Math.pow(ESCALA, 1 - (1 - seg(t, 15.2, FIN)) ** 2);   // crece deprisa al principio y llega sin crecer ya (como el 6)
    const baseB = porTramos([
      { t0: CORTE, t1: 12.0, curva: deshace, sale: 0.6 },            // sale del destello ya en marcha
      { t0: 12.0, t1: 13.6, curva: sube, junta: true },
      { t0: 13.6, t1: 14.2, curva: alCentro, junta: true },
      { t0: 15.2, t1: FIN, curva: salida, ease: easeS },
    ]);
    const rutaB = (t) => {
      const p = baseB(t);
      const zb = p.z;                                                  // salta la bobina, ahora al revés
      if (t > 12.0 && t < 13.6) p.y += 0.16 * Math.max(0, 1 - Math.abs(zb - zB) / 0.22);
      p.y -= 0.05 * bell(t, 14.6, 15.2);                               // se agacha para coger impulso
      return p;
    };
    const ruta = rutaB;

    // en la pausa, fotones del lector que llegan por su haz a los brazos; los que llegan con la modulación encendida
    // rebotan, de vuelta por el haz; los demás se quedan y se apagan
    const fuente = enPlanta(planta.cara), dirHaz = V(0, yPista, zA).sub(fuente).normalize(), ladoHaz = dirHaz.clone().cross(V(0, 1, 0)).normalize();
    const RAPIDO = 10;
    const llegan = [-2.6, 1.8, -1.2, 3.0, -3.3, 0.9, -0.7, 2.4, -2.0].map((x, i) => {
      const e = new Electron(B, ren, { cara: false }), tl = MOD0 + (i + 0.5) * H_MOD, rebota = MODULA(tl), llega = V(x, yPista, zA), fase = i * 1.9;
      const r = (t) => {
        const d = t - tl, p = llega.clone().addScaledVector(dirHaz, RAPIDO * (d < 0 ? d : rebota ? -d : 0));
        return p.addScaledVector(ladoHaz, 0.1 * Math.sin(d * 9 + fase) * Math.min(1, Math.abs(d) * 2));
      };
      return { e, tl, rebota, r };
    });

    // los frentes de backscatter: casquetes naranjas que salen del dipolo hacia el lector
    const frentes = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 12, 128, 1.6).rotateZ(-0.8),
        new THREE.MeshBasicMaterial({ color: 0xff8000, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      const g = new THREE.Group(); g.position.copy(centro); g.quaternion.setFromUnitVectors(V(1, 0, 0), DIR);
      for (let k = 0; k < 3; k++) { const c = m.clone(); c.rotation.x = k * Math.PI / 3; g.add(c); }
      g.userData.mat = m.material; B.add(g); frentes.push(g);
    }
    // polvo en el aire, para que se note la velocidad al salir
    const r = rng(17), n = 1500, pp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pp[3 * i] = -8 + r() * 26; pp[3 * i + 1] = -1 + r() * 22; pp[3 * i + 2] = -16 + r() * 22; }
    const gPolvo = new THREE.BufferGeometry(); gPolvo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    B.add(new THREE.Points(gPolvo, new THREE.PointsMaterial({ map: texturaPunto(), size: 0.07, color: 0x6fb4ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })));

    // ---------------------------------------------------------------- cámara
    const sigue = (dx, dy, dz) => (t) => ruta(t).add(V(dx, dy, dz));
    const deCorte = V(-PLANO_FINAL.z, PLANO_FINAL.y, PLANO_FINAL.x).multiplyScalar(K);   // el encuadre del plano 3 al empezar
    const crece = (t) => rutaA(t).add(deCorte.clone().multiplyScalar(tamA(t) / TAM0));
    const sigueA = (dx, dy, dz) => (t) => rutaA(t).add(V(dx, dy, dz));
    const CM = POS_MCU.clone().setY(yCara), VIAS = via1.clone().lerp(via2, 0.5);
    const arriba = V(0, 1, 0);
    const trasVuelo = (que) => (t) => {
      const e = ruta(t), u = salida.getTangentAt(Math.min(0.999, easeS(seg(t, 15.2, FIN)))), lado = u.clone().cross(arriba).normalize(), s = escala(t);
      return que === 'pos' ? e.addScaledVector(u, s * TRAS_VUELO.atras).addScaledVector(arriba, s * TRAS_VUELO.arriba).addScaledVector(lado, s * TRAS_VUELO.lado)
        : e.addScaledVector(u, s * TRAS_VUELO.delante);
    };
    const camA = porClaves([
      // el encuadre con que acaba el plano 4 (PLANO_VUELTA, girado a este marco), a esta escala; luego, las dos vías desde
      // arriba (se mete por una y sale por la otra), el micro, y a seguirlo por la pista
      { t: 0, pos: sigueA(...del4(PLANO_VUELTA).toArray()), mira: sigueA(0, 0, 0), fov: 30 },
      { t: 0.4, pos: sigueA(...del4(PLANO_VUELTA).toArray()), mira: sigueA(0, 0, 0), fov: 30 },
      { t: 1.4, pos: VIAS.clone().add(V(2.6, 8.5, 1.2)), mira: VIAS.clone().add(V(0, 0, 0.6)), fov: 38, paso: true },
      { t: 2.3, pos: VIAS.clone().add(V(1.8, 7.5, -0.6)), mira: VIAS.clone().add(V(0, 0, -0.8)), fov: 38, paso: true },
      { t: 3.4, pos: CM.clone().add(V(1.4, 3.6, 3.6)), mira: CM, fov: 34, paso: true },
      { t: 4.6, pos: sigueA(1.0, 1.5, 1.0), mira: sigueA(-0.2, 0, -0.1), fov: 34, paso: true },
      { t: 6.8, pos: sigueA(1.0, 1.5, 1.0), mira: sigueA(-0.2, 0, -0.1), fov: 34 },
      { t: 8.4, pos: sigueA(1.6, 1.6, 1.4), mira: sigueA(-1.0, -0.1, 0.2), fov: 34, paso: true },
      { t: 3.6 + D, pos: sigueA(1.0, 1.25, 1.2), mira: sigueA(-0.2, 0, 0), fov: 34, paso: true },
      { t: 6.2 + D, pos: sigueA(1.0, 1.25, 1.2), mira: sigueA(-0.2, 0, 0), fov: 34 },
      { t: 7.7 + D, pos: sigueA(-0.2, 1.3, 1.6), mira: sigueA(0, 0, 0), fov: 32, paso: true },   // y de frente, despacio, al encuadre del corte
      { t: 9.0 + D, pos: crece, mira: sigueA(0, 0, 0), fov: 30 },
      { t: CORTE + D, pos: crece, mira: sigueA(0, 0, 0), fov: 30 },
    ]);
    const camB = porClaves([
      { t: CORTE, pos: pata.clone().add(PLANO_FINAL), mira: pata, fov: 30 },
      { t: 11.6, pos: pata.clone().add(PLANO_FINAL), mira: sigue(0, 0, 0), fov: 30 },
      { t: 12.7, pos: sigue(-2.2, 1.3, 0.2), mira: sigue(0, 0, 0), fov: 32, paso: true },           // de lado
      { t: 13.6, pos: sigue(-0.6, 1.4, -2.4), mira: sigue(0, 0, 1.0), fov: 34, paso: true },         // y detrás de él (sube hacia la antena del dipolo)
      // en el centro, por detrás del tag, mirando hacia la antena del lector (por donde se irá)
      { t: 13.9, pos: centro.clone().addScaledVector(H, -6.5).add(V(0, 3.2, 0)), mira: centro.clone().addScaledVector(H, 2.0), fov: 36 },
      { t: 15.1, pos: centro.clone().addScaledVector(H, -6.0).add(V(0, 2.9, 0)), mira: centro.clone().addScaledVector(H, 2.0), fov: 36 },
      { t: 15.9, pos: trasVuelo('pos'), mira: trasVuelo('mira'), fov: TRAS_VUELO.fov },   // detrás de él en cuanto despega
      // al final, detrás de él en el vuelo: el mismo encuadre con que empieza el plano 6 (TRAS_VUELO)
      { t: FIN, pos: trasVuelo('pos'), mira: trasVuelo('mira'), fov: TRAS_VUELO.fov },
    ]);

    const FONDO = new THREE.Color(0x05080f);
    const rutaR = (t) => ruta(tr(t));
    const fwd = V(), mira0 = V();
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tPlano) {
        const enA = tPlano < CORTE + D;
        A.visible = enA; B.visible = !enA;
        if (enA) { actualizarA(tPlano); return; }
        const tReal = tPlano - D, t = tr(tReal);                      // (lo del tag, con sus tiempos de siempre)
        cam.near = 0.02; cam.far = 8000; planta.girar(tReal); planta.verDentro(1 - smooth(seg(t, FIN - 2.2, FIN - 0.6)));   // en el tag, con la planta alrededor (y el rotor girando)
        camB(t, cam);
        // en la pausa, más atrás, más arriba y más abierta: los fotones del lector llegan de frente y los que rebotan se alejan
        const verHaz = smoother(seg(tReal, PARA - 0.4, PARA + 1.2)) * (1 - smoother(seg(tReal, PARA + PAUSA - 1.6, PARA + PAUSA)));
        if (verHaz > 0) {
          cam.getWorldDirection(fwd); mira0.copy(cam.position).addScaledVector(fwd, 5);
          cam.position.lerp(centro.clone().addScaledVector(H, -7.5).add(V(-1.2, 4.6, 0)), verHaz);
          cam.lookAt(mira0.lerp(centro.clone().addScaledVector(H, 2.5), verHaz));
          cam.fov = lerp(cam.fov, 42, verHaz);
        }

        // la antena se carga y lo lanza; en la pausa, parpadea con la modulación: encendida, brilla; apagada, nada
        const carga = smooth(seg(t, 13.9, 15.2)) * (1 - smooth(seg(t, 16, 17.5)));
        const enPausa = smooth(seg(tReal, PARA + 0.2, PARA + 0.6)) * (1 - smooth(seg(tReal, PARA + 6.2, PARA + 6.6)));
        const mod = MOD_SUAVE(tReal);
        tag.encenderDipolo(0.7 * carga * (1 - enPausa) + 0.95 * enPausa * mod);
        llegan.forEach(({ e, tl, rebota, r }) => {
          const d = tReal - tl;
          e.visible = d > -1.6 && (rebota ? d < 1.6 : d < 0.4);
          e.ruta = r; e.rutaDesde = tl - 2;
          e.tam = 0.7 * smooth(seg(d, -1.6, -1.2)) * (rebota ? 1 - smooth(seg(d, 1.0, 1.6)) : 1 - smooth(seg(d, 0, 0.4)));
          e.forma = 1; e.estela = 0.8; e.brillo = 0.3 + 0.9 * bell(d, -0.1, 0.4);
          e.actualizar(tReal, cam);
        });
        frentes.forEach((g, i) => {
          const edad = t - 15.1 - i * 0.35, k = seg(edad, 0, 2.2);           // el último se apaga antes del corte
          g.scale.setScalar(0.3 + 9 * k);
          g.userData.mat.opacity = edad > 0 && edad < 2.2 ? 0.85 * (1 - k) * Math.min(1, edad * 6) : 0;
        });

        electron.visible = true;
        electron.ruta = (s) => rutaR(s - D); electron.rutaDesde = CORTE + D;
        electron.forma = smooth(seg(tReal, PARA + 6.4, PARA + 7.0));         // después de explicarlo, otra vez fotón
        habla(dialogo(tReal, LINEAS));
        electron.tam = lerp(TAM_FINAL, 1, smoother(seg(t, 12.0, 13.6))) * escala(t);   // y crece al salir
        electron.calor = 1; electron.ojos = 1;
        electron.brillo = Math.max(0.25 * bell(t, 10.4, 11.6), 0.6 * carga, 0.8 * bell(tReal, PARA + 6.3, PARA + 7.2));
        electron.estela = t > 15.2 ? 1 : 0.8;
        // mira atrás al salir (como acaba el 4), arriba al cargarse y al saltar, y al frente al final (como empieza el 6)
        const mx = t < 15 || t > FIN - 1.4 ? 0 : 0.6, my = t > 14.2 && t < 15.2 ? 0.8 : t > 15.2 && t < FIN - 1.4 ? 0.6 : 0;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));
        luzE.position.copy(ruta(t)).add(V(0, 0.1, 0)); luzE.distance = 3;

        // el destello del corte del ROCKY100 al tag (la otra mitad, en actualizarA); al final, sin fundido: sigue el 6 en vuelo
        velo(0.6 * bell(t, 10.8, 11.3), 0xcfe6ff);
      },
    };
    // lo de la placa de cerca, de 0 a CORTE + D
    function actualizarA(t) {
      camA(t, cam);
      geoLuz.setDrawRange(0, Math.floor(geoLuz.index.count * baseA.ease[10](seg(t, 10.9, 15.0)) / 6) * 6);
      geoLuzM.setDrawRange(0, Math.floor(geoLuzM.index.count * baseA.ease[5](seg(t, 4.4, 7.0)) / 6) * 6);
      rastroSDA.actualizar(t, rutaA, 0, 3.3);
      rastroMISO.actualizar(t, rutaA, 7.6, 10.0);
      mc.hilos.b2.malla.material.emissiveIntensity = 2.2 * bell(t, 3.6, 4.6);
      mc.hilos.i2.malla.material.emissiveIntensity = 2.2 * bell(t, 6.9, 7.9);
      hilos.d3.malla.material.emissiveIntensity = 2.2 * bell(t, 10.0, 11.2);
      hilos.i0.malla.material.emissiveIntensity = 2.2 * bell(t, 15.0, 16.2);
      mI2C.material.opacity = 0.2 * bell(t, 4.2, 5.4); mNucleo.material.opacity = 0.16 * bell(t, 4.8, 6.6) * (0.7 + 0.3 * Math.sin(t * 13));
      mSPI.material.opacity = 0.2 * bell(t, 6.0, 7.3);
      luzSDA.material.opacity = 0.8 * (1 - smooth(seg(t, 0.3, 1.4)));
      electron.visible = true;
      electron.ruta = rutaA; electron.rutaDesde = 0;
      electron.forma = 0; electron.sorpresa = 0;
      habla(dialogo(t, LINEAS_A));
      electron.tam = tamA(t); electron.calor = 1; electron.ojos = 1;
      electron.brillo = Math.max(0.25 * bell(t, 10.4 + D, 11.6 + D), 0.1 * bell(t, 4.4, 7.0) * (0.5 + 0.5 * Math.sin(t * 19)));
      electron.estela = t > 1.15 && t < 2.3 ? 0 : 0.8;                  // (bajo la placa, sin estela que asome)
      electron.mirada.set(lerp(electron.mirada.x, -0.7, 0.2), lerp(electron.mirada.y, 0, 0.2));
      luzE.position.copy(rutaA(t)).add(V(0, 0.1, 0)); luzE.distance = 1.2;
      // los destellos de los cortes: al empezar (del 4) y del ROCKY100 al tag (la mitad de antes)
      velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.6 * bell(t, 10.8 + D, 11.3 + D)), 0xcfe6ff);
    }
  },
};
