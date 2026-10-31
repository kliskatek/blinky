// Plano 3: dentro del ROCKY100. El encapsulado abierto (sin tapa) sobre la placa. Empieza donde acaba el plano 2: el
// electrón pegado por fuera a la pata de RF+, encendida, con el mismo tamaño frente al chip y el mismo encuadre (corte
// con destello). Encoge mientras sube por la pata hasta su bond wire (la cámara se le acerca en la misma proporción,
// así que el chip crece a su alrededor), llega al pad de RF, pasa por el rectificador (que se enciende: aquí coge
// energía), recorre los canales de rutado del die (por la foto real: el canal vertical en u ≈ 0,41 y el de abajo en
// v ≈ 0,83, bajo la lógica digital), sube por el margen derecho, sale por el pad de MOSI (SPI), baja por su bond wire y
// su pata, y se va por la pista hacia el sensor (plano 4). Por donde pasa, la pista del die se queda encendida.
// Por el die va contando lo que ve (el tramo del die va a 3/4 de velocidad, tr() lo estira, para que dé tiempo a
// leerlo): el multiplicador de tensión, el condensador que se carga, el regulador, la lógica RAIN y la memoria (las
// zonas se encienden cuando las nombra). Los tiempos de abajo son sin estirar.
//   0-0.35  sale del destello del corte
//   0.3-2.8 encoge mientras sube por la pata RF+ y el bond wire hasta el pad de RF (de un tramo a otro sin pararse)
//   2.8-4.9 el rectificador: se enciende y el electrón se carga
//   4.9-8.4 canales de rutado hasta la lógica digital
//   8.4-11.4 en zigzag por las celdas de la lógica digital (que trabaja: parpadea); 11.4-14.6 por la memoria MTP
//   14.6-15.1 sale al margen derecho y al pad de MOSI
//   15.1-17 bond wire, pata, fuera (sin pararse entre tramos)
//   17-19.1 corre por la pista hasta la pata de MOSI del sensor y se queda pegado a ella; corte con destello al plano 4

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, dialogo, pasa } from '../utiles.js';
import { crearRocky, QFN, crearPista } from '../piezas/rocky.js';
import { TAM_FINAL, PLANO_FINAL, ESCALA_CHIP } from './02-tag.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// el último encuadre, que copia el plano 4 a su escala (como el 3 copia el del 2): el electrón pegado a la pata de MOSI
// del sensor, la cámara detrás (corre hacia +x), por encima y a un lado
export const TAM_FINAL3 = 0.3, PLANO_FINAL3 = V(-1.0, 0.6, 0.85), ESCALA_SENSOR = 2.2;
// y la vuelta (del plano 4 al 5): el electrón saliendo por la pata de MISO del sensor hacia −x, la cámara por delante
// de él (−x), por fuera del encapsulado: detrás, el encapsulado lo tapaba
export const PLANO_VUELTA = V(-1.0, 0.6, 0.85), XS_SENSOR = 12.6;
const K = QFN.W / ESCALA_CHIP;                         // cuánto más grande es aquí el chip que en el plano 2
const TAM0 = TAM_FINAL * K;                             // el electrón, a la misma escala frente al chip que al final del 2
const ALTO = 0.04;                                      // el electrón (tam 0,3) va un poco por encima de lo que pisa
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
// lo que dice, en tiempos de la ruta
const LINEAS = [
  [3.0, 4.75, '¡Un multiplicador de tensión! Me está cargando de energía.'],
  [5.0, 6.5, '¡Y ese condensador se está llenando!'],
  [6.6, 8.5, 'Aquí, un regulador: tensión estable para todo el chip.'],
  [8.8, 11.2, '¡Mira! Circuitos digitales que hablan el protocolo RAIN.'],
  [11.4, 14.0, 'Y una memoria con datos guardados: el EPC de este tag.'],
  [14.6, 17.3, 'El chip me manda al sensor por SPI: ¡a por la temperatura!'],
].map(([a, b, txt]) => [real(a), real(b), txt]);

// el marcado del sensor (inventado): un sensor digital de temperatura
function marcadoSensor() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1e22'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#a3abb2'; g.textAlign = 'center';
  g.font = '700 70px Oxanium, "Segoe UI", sans-serif'; g.fillText('TEMP', 256, 230);
  g.font = '600 50px Oxanium, "Segoe UI", sans-serif'; g.fillText('SENSOR', 256, 310);
  g.beginPath(); g.arc(70, 440, 22, 0, Math.PI * 2); g.fillStyle = '#2b3035'; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const linea = (pts) => { const c = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) c.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return c; };
const alzar = (curva, dy) => new THREE.CatmullRomCurve3(curva.points.map((p) => p.clone().add(V(0, dy, 0))));

export default {
  nombre: 'ROCKY100',
  dura: 19.1 + MAS,
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

    // la placa y las dos pistas: la de la antena llega por la izquierda a RF+, la del sensor sale por la derecha de MOSI
    const placa = new THREE.Mesh(new THREE.BoxGeometry(30, 0.02, 18), new THREE.MeshStandardMaterial({ color: 0x1F5A3E, roughness: 0.45 }));
    placa.position.y = yPlaca - 0.01; grupo.add(placa);
    const cobre = new THREE.MeshStandardMaterial({ color: 0xE0B455, metalness: 0.6, roughness: 0.3, emissive: 0x3A2A00, emissiveIntensity: 1 });
    const zRF = patas.i0.enCanto.z, zMOSI = patas.d2.enCanto.z, yCu = yPlaca + 0.012;
    // el sensor, al final de la pista de MOSI: un DFN-8 (4 patas por lado, cada 0,5); MOSI le entra por su pata 1 y
    // MISO sale por la 2, de vuelta a la pata d3 del ROCKY100
    const XS = XS_SENSOR, S2 = ESCALA_SENSOR / 2, zS = zMOSI + 0.25, zMISO = zMOSI + 0.5;
    const pista = (pts) => grupo.add(crearPista(pts, yCu, 0.32, cobre));
    pista([[-15, zRF], [-3.1, zRF]]);
    pista([[3.1, zMOSI], [XS - S2 - 0.03, zMOSI]]);
    // la de MISO baja de la pata d3 a la altura del sensor con un quiebro a 45°
    const zD3 = patas.d3.enCanto.z;
    pista([[3.1, zD3], [4.2, zD3], [4.2 + (zD3 - zMISO), zMISO], [XS - S2 - 0.03, zMISO]]);
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(ESCALA_SENSOR, 0.55, ESCALA_SENSOR),
      [0, 1, 2, 3, 4, 5].map((i) => (i === 2 ? new THREE.MeshStandardMaterial({ map: marcadoSensor(), roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: 0x1b1f23, roughness: 0.62 }))));
    sensor.position.set(XS, yPlaca + 0.275, zS); grupo.add(sensor);
    const plata = new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.72, roughness: 0.28 });
    const patasS = [];
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.23), plata.clone());
      p.position.set(XS + s * (S2 + 0.015), yPlaca + 0.06, zS + (k - 1.5) * 0.5); grupo.add(p);
      if (s < 0) patasS.push(p);
    }

    // los tramos de la ruta
    const yE = yCu + ALTO, W2 = QFN.W / 2;
    const sube = linea([V(-W2 - 0.06, yE, zRF), V(-W2 - 0.04, QFN.H / 2 + ALTO, zRF), patas.i0.enDedo.clone().add(V(0, ALTO, 0))]);
    const hiloRF = alzar(hilos.i0.curva, ALTO); hiloRF.points.reverse();
    const enDie = (uv) => uv.map(([u, v]) => padEn(u, v, ALTO));
    const T = {                                      // cuándo recorre cada trozo del die (el tubo que se enciende, igual)
      rect: [2.8, 4.2], canales: [4.9, 8.4], digital: [8.4, 11.4], memoria: [11.4, 14.6], salida: [14.6, 15.1],
    };
    const rect = linea(enDie(RECT)), canales = linea(enDie(CANALES)), digitalR = linea(enDie(DIGITAL)), memoriaR = linea(enDie(MEMORIA)), margen = linea(enDie(SALIDA));
    const hiloMOSI = alzar(hilos.d2.curva, ALTO);
    const sale = linea([patas.d2.enDedo.clone().add(V(0, ALTO, 0)), V(W2 + 0.04, QFN.H / 2 + ALTO, zMOSI), V(W2 + 0.1, yE, zMOSI), V(W2 + 0.6, yE, zMOSI)]);
    const FIN = V(XS - S2 - 0.03 - 0.036 - 0.004, yE, zMOSI);       // pegado a la pata de MOSI del sensor, por fuera
    const huye = new THREE.LineCurve3(V(W2 + 0.6, yE, zMOSI), FIN);
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
      { t0: 17.0, t1: 19.1, curva: huye, junta: true, llega: 0.15 },  // llega a la pata del sensor en el corte, aún en marcha
    ]);
    // al empezar es tan grande como al final del plano 2 (frente al chip) y encoge mientras sube: el chip "crece".
    // Mientras es grande se aparta de la pared y se apoya en la placa, por su radio de más
    const tam = (t) => lerp(TAM0, 0.3, smoother(seg(t, 0, 1.8)));
    const ruta = (t) => { const de = 0.12 * (tam(t) - 0.3); return base(t).add(V(-de, de, 0)); };

    // lo que se enciende: la pista del die por donde pasa (tres tubos que crecen con él), el rectificador, la lógica
    // digital y los dos bond wires
    const matLuz = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.75, 1.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tubo = (uv, [t0, t1], ease = smoother) => {
      const geo = new THREE.TubeGeometry(linea(enDie(uv).map((p) => p.setY(yCara + 0.006))), 480, 0.011, 6);
      grupo.add(new THREE.Mesh(geo, matLuz));
      const n = geo.index.count;
      return (t) => geo.setDrawRange(0, Math.floor(n * ease(seg(t, t0, t1)) / 6) * 6);
    };
    const tubos = [tubo(RECT, T.rect, base.ease[2]), tubo(CANALES, T.canales, base.ease[3]), tubo(DIGITAL, T.digital, base.ease[4]), tubo(MEMORIA, T.memoria, base.ease[5]), tubo(SALIDA, T.salida, base.ease[6])];
    const zona = (u0, v0, u1, v1, color) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry((u1 - u0) * QFN.dw, (v1 - v0) * QFN.dh),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(padEn((u0 + u1) / 2, (v0 + v1) / 2, 0.004)); grupo.add(m); return m;
    };
    const rectificador = zona(0.17, 0.44, 0.31, 0.62, 0xff8a2a);
    const digital = zona(0.612, 0.2, 0.735, 0.775, 0x3d9bff);
    // las que nombra por el camino: el condensador (se llena de abajo arriba), el regulador y la memoria
    const condensador = zona(0.29, 0.66, 0.39, 0.80, 0xffc04a);
    const regulador = zona(0.43, 0.66, 0.58, 0.79, 0x4fe39a);
    const memoria = zona(0.738, 0.185, 0.905, 0.80, 0xffb15a);             // la de fuera, junto a los pads
    const vCond = padEn(0.34, 0.80, 0.004).z, altoCond = 0.14 * QFN.dh;
    // la lógica trabajando mientras pasa: celdas que parpadean, cada una a su ritmo
    const r = rng(23);
    const celdas = Array.from({ length: 22 }, () => {
      const u = 0.62 + r() * 0.085, v = 0.21 + r() * 0.53, du = 0.015 + r() * 0.03, dv = 0.012 + r() * 0.025;
      return { m: zona(u, v, u + du, v + dv, r() < 0.75 ? 0x6fc0ff : 0xffb15a), f: 3 + r() * 9, fase: r() * 6.28 };
    });
    hilos.i0.malla.material.emissive = new THREE.Color(0x3d9bff);
    hilos.d2.malla.material.emissive = new THREE.Color(0x3d9bff);

    const sigue = (dx, dy, dz) => (t) => ruta(t).add(V(dx, dy, dz));
    // el primer encuadre es el último del plano 2 a esta escala, girado: allí corría hacia −z y aquí hacia +x. Mientras
    // encoge, la cámara se le acerca en la misma proporción: él no cambia en pantalla y el chip crece a su alrededor
    const deCorte = V(-PLANO_FINAL.z, PLANO_FINAL.y, PLANO_FINAL.x).multiplyScalar(K);
    const encoge = (t) => ruta(t).add(deCorte.clone().multiplyScalar(tam(t) / TAM0));
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
      { t: 17.0, pos: V(6.0, 2.3, 4.4), mira: V(3.7, -0.2, 0.5), fov: 34, paso: true },
      { t: 17.9, pos: sigue(-3.0, 1.7, 3.0), mira: sigue(2.5, -0.1, -0.2), fov: 34, paso: true },
      { t: 18.8, pos: sigue(...PLANO_FINAL3.toArray()), mira: sigue(0, 0, 0), fov: 30 },   // en el corte, ruta = FIN
    ]);

    const FONDO = new THREE.Color(0x05080f);
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tReal) {
        const t = tr(tReal);
        camara(t, cam);
        habla(dialogo(tReal, LINEAS));
        tubos.forEach((f) => f(t));

        const carga = bell(t, 3.6, 5.2);
        rectificador.material.opacity = 0.32 * carga;
        const llena = smooth(seg(t, 5.0, 6.6));
        condensador.scale.y = Math.max(0.001, llena); condensador.position.z = vCond - altoCond * llena / 2;
        condensador.material.opacity = 0.4 * llena * (1 - smooth(seg(t, 9.0, 10.0)));
        regulador.material.opacity = 0.3 * bell(t, 6.4, 8.8) * (0.8 + 0.2 * Math.sin(t * 9));
        memoria.material.opacity = 0.32 * bell(t, 11.2, 14.4);
        const dentro = smooth(seg(t, 8.0, 8.8)) * (1 - smooth(seg(t, 14.6, 15.6)));
        digital.material.opacity = dentro * (0.16 + 0.05 * Math.sin(t * 7));
        celdas.forEach((c) => { c.m.material.opacity = dentro * 0.6 * Math.max(0, Math.sin(t * c.f + c.fase)) ** 3; });
        hilos.i0.malla.material.emissiveIntensity = 2.2 * bell(t, 1.8, 3.0);
        hilos.d2.malla.material.emissiveIntensity = 2.2 * bell(t, 15.1, 16.3);
        cobre.emissiveIntensity = 1;

        electron.visible = true;
        electron.ruta = (s) => ruta(tr(s)); electron.rutaDesde = 0;
        electron.tam = tam(t); electron.calor = 0; electron.ojos = 1;
        // viene brillando; se carga en el rectificador; en la lógica digital, lo procesan: chispea
        electron.brillo = Math.max(0.25 * (1 - smooth(seg(t, 0, 1))), 0.55 * carga, dentro * 0.18 * (0.5 + 0.5 * Math.sin(t * 19)));
        patas.i0.pata.material.emissive.setHex(0x3d9bff);
        patas.i0.pata.material.emissiveIntensity = 3 * (1 - smooth(seg(t, 0.3, 1.4)));  // la pata, encendida como al final del plano 2
        electron.estela = 0.8;
        // mira arriba al cargarse; dentro de la lógica, a todos lados
        const mx = t > 4.3 && t < 4.8 ? 0 : dentro > 0.5 ? 0.9 * Math.sin(t * 2.6) : 0.7;
        const my = t > 4.3 && t < 4.8 ? 0.6 : dentro > 0.5 ? 0.4 * Math.sin(t * 1.7) : 0;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));
        luzE.position.copy(ruta(t)).add(V(0, 0.08, 0));

        // la pata de MOSI del sensor se enciende al llegar; destello del corte al plano 4
        patasS[1].material.emissive.setHex(0x3d9bff); patasS[1].material.emissiveIntensity = 3 * smooth(seg(t, 18.3, 18.7));
        velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.6 * smooth(seg(t, 18.85, 19.1))), 0xcfe6ff);
      },
    };
  },
};
