// Plano 5: la vuelta. Empieza como acaba el plano 4: el electrón, rojo (lleva la temperatura), pegado por fuera a la
// pata de MISO del sensor (cerrado, a la escala del plano 3; PLANO_VUELTA). Corre por la pista de MISO, entra por la
// pata d3 y su bond wire, cruza el die de vuelta hasta el pad de RF (por los mismos canales, con la pista encendida en
// rojo) y sale por la pata de RF+. Ahí, el corte del plano 3 al revés: crece mientras la cámara se aleja en la misma
// proporción (el chip encoge a su alrededor) y, con un destello, está otra vez en el tag, en el encuadre en que lo dejó
// el plano 2. Vuelve por la alimentación hasta el centro del dipolo, la antena se enciende en naranja (backscatter) y
// sale disparado al aire entre frentes de onda, hacia el lector.
//   0-0.3   sale del destello del corte
//   0.3-3.5 la pista de MISO desde el sensor, la pata d3 y su bond wire
//   3.5-7.6 el die de vuelta, del pad de MISO al de RF
//   7.7-9.4 bond wire de RF, pata, fuera; 9.4-10.9 crece; destello
//   11-14.2 en el tag: sale de la pata, vuelve por la alimentación (salta la bobina) al centro del dipolo
//   14.2-15.2 la antena se carga en naranja; en 14.5 se para (PAUSA segundos: lo de después va retrasado eso, tr() lo
//           mete) y ve llegar fotones del lector: la antena parpadea con la modulación del chip y, los que llegan con ella
//           encendida, rebotan de vuelta (backscatter); lo explica, vuelve a ser fotón y dice que va a ver adónde van
//   15.2-22.2 sale disparado (cada vez más deprisa y más grande: de la escala del tag a la de la planta) al aire, con los frentes de backscatter; la cámara acaba detrás de él (TRAS_VUELO), como
//           empieza el plano 6

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, texturaPunto, dialogo, pasa } from '../utiles.js';
import { crearRocky, QFN, crearPista } from '../piezas/rocky.js';
import { Electron } from '../electron.js';
import { montarTag, enPlanta, dirEnPlanta, TAM_FINAL, PLANO_FINAL, ESCALA_CHIP } from './02-tag.js';
import { ANTENA_POS } from '../piezas/planta.js';
import { PLANO_VUELTA, XS_SENSOR, ESCALA_SENSOR } from './03-rocky.js';

// la cámara detrás del electrón en vuelo, en su dirección de marcha: así acaba este plano y así empieza el 6
export const TRAS_VUELO = { atras: -4.5, arriba: 1.4, lado: 1.6, delante: 3, fov: 34 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const K = QFN.W / ESCALA_CHIP, TAM0 = TAM_FINAL * K;   // las mismas escalas que el corte del plano 2 al 3
const ALTO = 0.04, CORTE = 11.0;
const PARA = 14.5, PAUSA = 9.0;
const T_SAL = 7.0, FIN = 15.2 + T_SAL;                                // la salida (hasta el plano 6) y el final
const tr = (t) => (t < PARA ? t : t < PARA + PAUSA ? PARA : t - PAUSA);
const LINEAS = [
  [3.8, 7.4, 'Vuelvo con la temperatura: el chip la guarda para contestar al lector.'],
  [PARA + 0.3, PARA + 3.4, '¡Vaya! La parte digital está modulando la impedancia del chip…'],
  [PARA + 3.5, PARA + 6.4, '…y parte de la energía incidente rebota por desadaptación.'],
  [PARA + 6.8, PARA + PAUSA, 'Fotón otra vez… ¡Voy a ver adónde se dirigen!'],
];
// la modulación del chip (encendida: la antena, desadaptada, refleja), en tiempo real: tramos de H segundos, encendida
// y apagada, desde MOD0. Los fotones del lector llegan cada uno en el centro de un tramo (lejos de los cambios: si no,
// parecía que alguno rebotaba con la antena apagada), uno rebota y el siguiente se queda
const H_MOD = 0.6, MOD0 = PARA + 0.4;
const MODULA = (t) => t >= MOD0 && Math.floor((t - MOD0) / H_MOD) % 2 === 0;
const DIE_VUELTA = [[0.955, 0.768], [0.941, 0.768], [0.941, 0.822], [0.407, 0.822], [0.407, 0.633], [0.265, 0.633], [0.265, 0.56], [0.20, 0.50], [0.111, 0.477]];

const linea = (pts) => { const c = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) c.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return c; };
const alzar = (curva, dy) => new THREE.CatmullRomCurve3(curva.points.map((p) => p.clone().add(V(0, dy, 0))));

export default {
  nombre: 'La vuelta',
  dura: FIN + PAUSA,
  entorno: 0.2,                                    // (poco reflejo del entorno: el oro y el die brillaban demasiado)
  quieto: [[PARA, PARA + PAUSA]],
  montar({ escena, cam, ren, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x0b0d10, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(-5, 10, 8); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x0080ff, 1.2); contra.position.set(7, 3, -6); grupo.add(contra);
    const luzE = new THREE.PointLight(0xff5a1a, 0.9, 1.2, 2); grupo.add(luzE);

    // ---------------------------------------------------------------- decorado A: el ROCKY100 abierto (escala del plano 3)
    const A = new THREE.Group(); grupo.add(A);
    const rk = crearRocky(); A.add(rk.grupo);
    const { padEn, hilos, patas, yCara } = rk;
    const W2 = QFN.W / 2, yPlaca = -QFN.H / 2 - 0.01, yCu = yPlaca + 0.012, yE = yCu + ALTO;
    const placa = new THREE.Mesh(new THREE.BoxGeometry(30, 0.02, 18), new THREE.MeshStandardMaterial({ color: 0x1F5A3E, roughness: 0.45 }));
    placa.position.y = yPlaca - 0.01; A.add(placa);
    const cobre = new THREE.MeshStandardMaterial({ color: 0xE0B455, metalness: 0.6, roughness: 0.3, emissive: 0x3A2A00, emissiveIntensity: 1 });
    const zRF = patas.i0.enCanto.z, zD3 = patas.d3.enCanto.z, zMISO = patas.d2.enCanto.z + 0.5;
    const pista = (pts) => A.add(crearPista(pts, yCu, 0.32, cobre));
    // el sensor, cerrado, como en el plano 3: el electrón sale de su pata de MISO (donde lo dejó el plano 4)
    const XS = XS_SENSOR, S2 = ESCALA_SENSOR / 2, zMOSI = patas.d2.enCanto.z, zS = zMOSI + 0.25;
    pista([[-15, zRF], [-3.1, zRF]]);
    pista([[3.1, zMOSI], [XS - S2 - 0.03, zMOSI]]);
    const xQuiebro = 4.2 + (zD3 - zMISO);                                // la de MISO, con el quiebro a 45° (como en el plano 3)
    pista([[3.1, zD3], [4.2, zD3], [xQuiebro, zMISO], [XS - S2 - 0.03, zMISO]]);
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(ESCALA_SENSOR, 0.55, ESCALA_SENSOR), new THREE.MeshStandardMaterial({ color: 0x1b1f23, roughness: 0.62 }));
    sensor.position.set(XS, yPlaca + 0.275, zS); A.add(sensor);
    const plata = new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.72, roughness: 0.28 });
    const patasS = [0, 1, 2, 3].map((k) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.23), plata.clone());
      p.position.set(XS - S2 - 0.015, yPlaca + 0.06, zS + (k - 1.5) * 0.5); A.add(p); return p;
    });
    const INICIO_V = V(XS - S2 - 0.03 - 0.036 - 0.004, yE, zMISO);       // pegado a la pata de MISO, por fuera

    const llega = linea([INICIO_V, V(xQuiebro, yE, zMISO), V(4.2, yE, zD3), V(W2 + 0.1, yE, zD3), V(W2 + 0.04, QFN.H / 2 + ALTO, zD3), patas.d3.enDedo.clone().add(V(0, ALTO, 0))]);
    const hiloMISO = alzar(hilos.d3.curva, ALTO); hiloMISO.points.reverse();
    const dieV = linea(DIE_VUELTA.map(([u, v]) => padEn(u, v, ALTO)));
    const hiloRF = alzar(hilos.i0.curva, ALTO);
    const sale = linea([patas.i0.enDedo.clone().add(V(0, ALTO, 0)), V(-W2 - 0.04, QFN.H / 2 + ALTO, zRF), V(-W2 - 0.06, yE, zRF)]);
    const baseA = porTramos([
      { t0: 0, t1: 2.6, curva: llega, sale: 0.15 },                   // arranca nada más empezar, sin quedarse parado;
      { t0: 2.6, t1: 3.5, curva: hiloMISO, junta: true },            // y de un tramo a otro, igual
      { t0: 3.5, t1: 7.6, curva: dieV, junta: true },
      { t0: 7.6, t1: 8.5, curva: hiloRF, junta: true },
      { t0: 8.5, t1: 9.4, curva: sale, junta: true },
    ]);
    const tamA = (t) => lerp(0.3, TAM0, smoother(seg(t, 9.4, 10.9)));
    const rutaA = (t) => { const de = 0.12 * (tamA(t) - 0.3); return baseA(t).add(V(-de, de, 0)); };   // como en el plano 3
    // la pista del die, encendida en rojo por donde pasa
    const geoLuz = new THREE.TubeGeometry(linea(DIE_VUELTA.map(([u, v]) => padEn(u, v).setY(yCara + 0.006))), 400, 0.011, 6);
    A.add(new THREE.Mesh(geoLuz, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.45, 0.12), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    hilos.d3.malla.material.emissive = new THREE.Color(0xff5a1a);
    hilos.i0.malla.material.emissive = new THREE.Color(0xff5a1a);

    // ---------------------------------------------------------------- decorado B: el tag (escala del plano 2)
    const B = new THREE.Group(); grupo.add(B);
    const { tag, yPista, zA, xF, zF, zB, pata, planta } = montarTag(B);
    planta.verDentro(1);                                             // dentro de la máquina, con la carcasa transparente (al salir, opaca otra vez)
    const centro = V(-0.06, yPista, zA);                             // el centro del dipolo, junto al condensador
    const deshace = new THREE.CatmullRomCurve3([pata, V(xF, 0.26, zF - 0.04), V(xF, yPista, zF)]);
    const sube = new THREE.LineCurve3(V(xF, yPista, zF), V(xF, yPista, zA));
    const alCentro = new THREE.LineCurve3(V(xF, yPista, zA), centro);
    const ANT = enPlanta(ANTENA_POS), DIR = ANT.clone().sub(centro).normalize();   // hacia la antena del lector, en la planta
    const H = V(DIR.x, 0, DIR.z).normalize();                           // su dirección en horizontal
    // la salida, hasta donde empieza el plano 6: sale disparado del tag, fuera de la máquina, hasta el punto de la planta en
    // que el 6 empieza su vuelo hacia la antena (a 3 m de ella, por su haz), con su dirección y su velocidad. Y mientras,
    // crece (él y la distancia de la cámara) hasta 20 veces: la escala del 6 (10 unidades por metro; aquí, 200), así que
    // la máquina y el generador se quedan atrás y aparece la nave, y el corte cae en el mismo encuadre de la misma planta
    const P6 = (k, y) => planta.cara.clone().addScaledVector(planta.normal, k).add(V(0, y, 0));   // el vuelo del 6, en metros
    const vuelo6 = new THREE.CatmullRomCurve3([P6(3, 0.7), P6(1.8, 0.4), P6(0.8, 0.12), P6(0.25, 0), P6(0.013, 0)]);
    const E5 = enPlanta(vuelo6.getPointAt(0)), T5 = dirEnPlanta(vuelo6.getTangentAt(0));
    const ESCALA = 20, v5fin = ESCALA * 1.2 * vuelo6.getLength() * 10 / 5.0;   // la del 6 al empezar (1,2 × su largo / 5 s)
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
      if (t > 12.0 && t < 13.6) p.y += 0.2 * Math.max(0, 1 - Math.abs(zb - zB) / 0.32);
      p.y -= 0.05 * bell(t, 14.6, 15.2);                               // se agacha para coger impulso
      return p;
    };
    const ruta = (t) => (t < CORTE ? rutaA(t) : rutaB(t));

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
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 64, 1.6).rotateZ(-0.8),
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
    const arriba = V(0, 1, 0);
    const trasVuelo = (que) => (t) => {
      const e = ruta(t), u = salida.getTangentAt(Math.min(0.999, easeS(seg(t, 15.2, FIN)))), lado = u.clone().cross(arriba).normalize(), s = escala(t);
      return que === 'pos' ? e.addScaledVector(u, s * TRAS_VUELO.atras).addScaledVector(arriba, s * TRAS_VUELO.arriba).addScaledVector(lado, s * TRAS_VUELO.lado)
        : e.addScaledVector(u, s * TRAS_VUELO.delante);
    };
    const camA = porClaves([
      // el encuadre con que acaba el plano 4 (PLANO_VUELTA), a esta escala; luego, a seguirlo por la pista
      { t: 0, pos: sigue(...PLANO_VUELTA.toArray()), mira: sigue(0, 0, 0), fov: 30 },
      { t: 0.4, pos: sigue(...PLANO_VUELTA.toArray()), mira: sigue(0, 0, 0), fov: 30 },
      { t: 1.8, pos: sigue(0.4, 1.3, 2.0), mira: sigue(-0.6, 0, 0), fov: 34, paso: true },   // por delante: sin dar la vuelta de golpe
      { t: 2.4, pos: sigue(1.3, 1.3, 1.4), mira: sigue(-0.3, 0, 0), fov: 34, paso: true },
      { t: 3.6, pos: sigue(1.0, 1.25, 1.2), mira: sigue(-0.2, 0, 0), fov: 34, paso: true },
      { t: 6.2, pos: sigue(1.0, 1.25, 1.2), mira: sigue(-0.2, 0, 0), fov: 34 },
      { t: 7.7, pos: sigue(-0.2, 1.3, 1.6), mira: sigue(0, 0, 0), fov: 32, paso: true },   // y de frente, despacio, al encuadre del corte
      { t: 9.0, pos: crece, mira: sigue(0, 0, 0), fov: 30 },
      { t: CORTE, pos: crece, mira: sigue(0, 0, 0), fov: 30 },
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
      actualizar(tReal) {
        const t = tr(tReal), enA = t < CORTE;
        A.visible = enA; B.visible = !enA;
        if (!enA) { cam.near = 0.02; cam.far = 8000; planta.girar(tReal); planta.verDentro(1 - smooth(seg(t, FIN - 2.2, FIN - 0.6))); }   // en el tag, con la planta alrededor (y el rotor girando)
        (enA ? camA : camB)(t, cam);
        // en la pausa, más atrás, más arriba y más abierta: los fotones del lector llegan de frente y los que rebotan se alejan
        const verHaz = smoother(seg(tReal, PARA - 0.4, PARA + 1.2)) * (1 - smoother(seg(tReal, PARA + PAUSA - 1.6, PARA + PAUSA)));
        if (verHaz > 0) {
          cam.getWorldDirection(fwd); mira0.copy(cam.position).addScaledVector(fwd, 5);
          cam.position.lerp(centro.clone().addScaledVector(H, -7.5).add(V(-1.2, 4.6, 0)), verHaz);
          cam.lookAt(mira0.lerp(centro.clone().addScaledVector(H, 2.5), verHaz));
          cam.fov = lerp(cam.fov, 42, verHaz);
        }

        geoLuz.setDrawRange(0, Math.floor(geoLuz.index.count * baseA.ease[2](seg(t, 3.5, 7.6)) / 6) * 6);
        hilos.d3.malla.material.emissiveIntensity = 2.2 * bell(t, 2.6, 3.8);
        hilos.i0.malla.material.emissiveIntensity = 2.2 * bell(t, 7.6, 8.8);

        // la antena se carga en naranja y lo lanza
        const carga = smooth(seg(t, 13.9, 15.2)) * (1 - smooth(seg(t, 16, 17.5)));
        tag.matAnt.emissive.setHex(carga > 0.01 ? 0xff6a00 : 0x3A2A00);
        const enPausa = smooth(seg(tReal, PARA + 0.2, PARA + 0.6)) * (1 - smooth(seg(tReal, PARA + 6.2, PARA + 6.6)));
        tag.matAnt.emissiveIntensity = (1 + 2.5 * carga) * (1 - 0.7 * enPausa * (MODULA(tReal) ? 0 : 1)) + 2.2 * enPausa * (MODULA(tReal) ? 1 : 0);   // la modulación, a la vista: encendida, brilla; apagada, casi sin brillo
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
        patasS[2].material.emissive.setHex(0xff5a1a);
        patasS[2].material.emissiveIntensity = 3 * (1 - smooth(seg(t, 0.3, 1.4)));   // la pata de MISO, encendida como al final del 4

        electron.visible = true;
        electron.ruta = rutaR; electron.rutaDesde = enA ? 0 : CORTE;
        electron.forma = smooth(seg(tReal, PARA + 6.4, PARA + 7.0));         // después de explicarlo, otra vez fotón
        habla(dialogo(tReal, LINEAS));
        electron.tam = enA ? tamA(t) : lerp(TAM_FINAL, 1, smoother(seg(t, 12.0, 13.6))) * escala(t);   // y crece al salir
        electron.calor = 1; electron.ojos = 1;
        electron.brillo = Math.max(0.25 * bell(t, 10.4, 11.6), 0.6 * carga, 0.8 * bell(tReal, PARA + 6.3, PARA + 7.2));
        electron.estela = t > 15.2 ? 1 : 0.8;
        // mira atrás al salir (como acaba el 4), arriba al cargarse y al saltar, y al frente al final (como empieza el 6)
        const mx = enA ? -0.7 : t < 15 || t > FIN - 1.4 ? 0 : 0.6, my = t > 14.2 && t < 15.2 ? 0.8 : t > 15.2 && t < FIN - 1.4 ? 0.6 : 0;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));
        luzE.position.copy(ruta(t)).add(V(0, 0.1, 0)); luzE.distance = enA ? 1.2 : 3;

        // los destellos de los cortes: al empezar (del 4) y del ROCKY100 al tag; al final, sin fundido: sigue el 6 en vuelo
        velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.6 * bell(t, 10.8, 11.3)), 0xcfe6ff);
      },
    };
  },
};
