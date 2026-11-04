// Plano 4: dentro del sensor de temperatura (el die inventado, piezas/sensor.js, en el sitio y en el encapsulado del
// TMP117 de la placa). Empieza como acaba el plano 3: el electrón pegado por fuera a la pata de SDA, encendida, a la misma
// escala frente al chip (corte con destello). Encoge mientras sube por la pata y su bond wire, cruza la lógica del bus y
// entra en el núcleo térmico: da vueltas entre los transistores mientras se calienta (de azul a rojo, tiembla, entorna
// los ojos; salen chispas de calor). Ya rojo, pasa por el ADC, vuelve por abajo al mismo pad de SDA (el I²C va y vuelve
// por el mismo hilo), baja por su bond wire y su pata y, ya fuera, pegado a ella, crece mientras la cámara se aleja en la
// misma proporción (el corte del 3 al 4 al revés): con el destello, el plano 5 lo recoge con el mismo encuadre a la
// escala del plano 3 (PLANO_VUELTA) y es allí donde corre por la pista de SDA de vuelta al micro.
// Alrededor, la placa de verdad (piezas/senseread.js) a esta escala, con el sensor en el origen y sin girar.
// En el núcleo dice que siente el calor de la máquina y que se pone rojo; en el ADC, que lo convierten en un número
// (el tramo del núcleo y el ADC va más despacio, tr() lo estira, para que dé tiempo a leerlo; los tiempos de abajo son
// sin estirar).
//   0-0.3   sale del destello del corte
//   0.3-2.7 encoge mientras sube por la pata de SDA y su bond wire
//   2.8-4.6 la lógica del bus, hasta el núcleo
//   4.6-8.2 dos vueltas y media en el núcleo térmico: se calienta
//   8.2-11.4 el ADC y la vuelta por abajo hasta el pad de SDA
//   11.4-13.1 bond wire, pata, fuera, pegado a la pata
//   13.1-14.1 crece; destello del corte al plano 5

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, texturaPunto, dialogo, pasa } from '../../../comun/motor/utiles.js';
import { crearSensor, DFN, ZONAS, PISTAS } from '../piezas/sensor.js';
import { TAM_FINAL3, PLANO_FINAL3, PLANO_VUELTA, ESCALA_SENSOR } from './03-rocky.js';
import { montarPlaca, SOBRE, MM } from '../piezas/senseread.js';

// el núcleo y el ADC (de A a B) van F veces más despacio: tr() pasa del tiempo real al de la ruta, y real() al revés
const A = 4.6, B = 11.4, F = 1.3, MAS = (B - A) * (F - 1);
const tr = (t) => (t < A ? t : t < A + (B - A) * F ? A + (t - A) / F : t - MAS);
const real = (s) => (s < A ? s : s < B ? A + (s - A) * F : s + MAS);
const LINEAS = [
  [0.5, 3.4, '¿Qué tenemos aquí? ¡Parece un sensor digital!'],          // al entrar en el encapsulado
  [4.8, 6.5, '¡Desde aquí siento el calor de la máquina!'],
  [6.6, 8.3, '¡Uf, qué calor! Me estoy poniendo rojo.'],
  [8.6, 10.6, 'Y aquí lo convierten en un número: 41,8 °C.'],
].map(([a, b, txt]) => [real(a), real(b), txt]);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const K = DFN.W / ESCALA_SENSOR, TAM0 = TAM_FINAL3 * K, TAM = 0.25;
const ALTO = 0.035;

const linea = (pts) => { const c = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) c.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return c; };
const alzar = (curva, dy) => new THREE.CatmullRomCurve3(curva.points.map((p) => p.clone().add(V(0, dy, 0))));

// vueltas en el núcleo: un círculo de radio r alrededor de c, de a0 a a1 (radianes), en el plano del die
class Vueltas extends THREE.Curve {
  constructor(c, r, a0, a1) { super(); Object.assign(this, { c, r, a0, a1 }); }
  getPoint(u, out = new THREE.Vector3()) { const a = lerp(this.a0, this.a1, u); return out.set(this.c.x + this.r * Math.cos(a), this.c.y, this.c.z - this.r * Math.sin(a)); }
}

export default {
  nombre: 'El sensor',
  dura: 14.1 + MAS,
  entorno: 0.2,                                    // (poco reflejo del entorno: el oro y el die brillaban demasiado)
  montar({ escena, cam, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x0b0d10, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-4, 10, 7); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x0080ff, 1.0); contra.position.set(7, 3, -6); grupo.add(contra);
    const luzE = new THREE.PointLight(0x5aa8ff, 0.8, 1.0, 2); grupo.add(luzE);
    const luzCalor = new THREE.PointLight(0xff5a1a, 0, 2.2, 2); grupo.add(luzCalor);

    const sn = crearSensor(); grupo.add(sn.grupo);
    const { padEn, hilos, patas, yCara } = sn;
    const W2 = DFN.W / 2, yPlaca = -DFN.H / 2 - 0.01, yE = yPlaca + SOBRE * DFN.W / 2 / MM;   // (a la misma altura que en el plano 3, a esta escala)
    const zSDA = patas.i2.enDedo.z;

    // la placa (piezas/senseread.js), a esta escala (2,2 por mm) y con el sensor en el origen, sin él (va abierto): le
    // llegan el I²C, la alimentación y su condensador de desacoplo; al lado, el micro
    montarPlaca(grupo, { centro: 'sensor', mm: DFN.W / 2, yCara: yPlaca, sin: ['IC5'] });

    // la ruta
    const enDie = (uv) => uv.map(([u, v]) => padEn(u, v, ALTO));
    const sube = linea([V(-W2 - 0.06, yE, zSDA), V(-W2 - 0.04, DFN.H / 2 + ALTO, zSDA), patas.i2.enDedo.clone().add(V(0, ALTO, 0))]);
    const hiloEntra = alzar(hilos.i2.curva, ALTO); hiloEntra.points.reverse();
    const centro = padEn(0.49, 0.5, ALTO), radio = (0.49 - 0.42) * DFN.dw;
    const nucleo = new Vueltas(centro, radio, Math.PI, 6 * Math.PI);
    const ida = linea(enDie(PISTAS[0])), vuelta = linea(enDie(PISTAS[1]));
    const hiloSale = alzar(hilos.i2.curva, ALTO);
    // sale y se queda pegado a la pata por fuera, donde empezó (la misma pata de SDA)
    const sale = linea([patas.i2.enDedo.clone().add(V(0, ALTO, 0)), V(-W2 - 0.04, DFN.H / 2 + ALTO, zSDA), V(-W2 - 0.06, yE, zSDA)]);
    const T = { ida: [2.7, 4.6], nucleo: [4.6, 8.2], vuelta: [8.2, 11.4] };
    const base = porTramos([
      { t0: 0, t1: 1.8, curva: sube, sale: 3 },                      // sube nada más llegar, sin pararse; y de un tramo a otro, igual
      { t0: 1.8, t1: 2.7, curva: hiloEntra, junta: true },
      { t0: T.ida[0], t1: T.ida[1], curva: ida, junta: true },
      { t0: T.nucleo[0], t1: T.nucleo[1], curva: nucleo, junta: true },
      { t0: T.vuelta[0], t1: T.vuelta[1], curva: vuelta, junta: true },
      { t0: 11.4, t1: 12.3, curva: hiloSale, junta: true },
      { t0: 12.3, t1: 13.1, curva: sale, junta: true },
    ]);
    // encoge al entrar (como el plano 3 lo dejó) y crece al salir (como el plano 5 lo recoge)
    const tam = (t) => (t < 12 ? lerp(TAM0, TAM, smoother(seg(t, 0, 1.8))) : lerp(TAM, TAM0, smoother(seg(t, 13.1, 14.1))));   // crece deprisa: quieto, se hacía largo
    const ruta = (t) => { const de = 0.12 * (tam(t) - TAM); return base(t).add(V(-de, de, 0)); };
    const calor = (t) => smooth(seg(t, 5.0, 7.6));

    // lo que se enciende: la pista por donde pasa (azul a la ida, roja a la vuelta), la lógica, el núcleo, el ADC
    const luz = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tubo = (curva, [t0, t1], mat, ease = smoother) => {
      const geo = new THREE.TubeGeometry(curva, 400, 0.011, 10); grupo.add(new THREE.Mesh(geo, mat));
      const n = geo.index.count;
      return (t) => geo.setDrawRange(0, Math.floor(n * ease(seg(t, t0, t1)) / 6) * 6);
    };
    const enCara = (curva) => new THREE.CatmullRomCurve3(curva.getSpacedPoints(300).map((p) => p.setY(yCara + 0.006)), false, 'catmullrom', 0);
    const tubos = [
      tubo(enCara(ida), T.ida, luz(new THREE.Color(0.35, 0.75, 1.6)), base.ease[2]),
      tubo(enCara(nucleo), T.nucleo, luz(new THREE.Color(1.4, 0.5, 0.15)), base.ease[3]),
      tubo(enCara(vuelta), T.vuelta, luz(new THREE.Color(1.6, 0.45, 0.12)), base.ease[4]),
    ];
    const zona = ([u0, v0, u1, v1], color) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry((u1 - u0) * DFN.dw, (v1 - v0) * DFN.dh),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(padEn((u0 + u1) / 2, (v0 + v1) / 2, 0.004)); grupo.add(m); return m;
    };
    const zLogica = zona(ZONAS.logica, 0x3d9bff), zNucleo = zona(ZONAS.nucleo, 0xff5a1a), zADC = zona(ZONAS.adc, 0xffb15a);
    // el barrido del ADC: una banda que sube por el array de condensadores
    const [a0, b0, a1, b1] = ZONAS.adc;
    const barrido = zona([a0, b0, a1, b0 + 0.06], 0xffe0a0);

    // chispas de calor que suben del núcleo
    const r = rng(9), N = 140, pos = new Float32Array(N * 3), semilla = [];
    for (let i = 0; i < N; i++) semilla.push([0.37 + r() * 0.24, 0.23 + r() * 0.54, r(), 0.35 + r() * 0.5]);
    const gCh = new THREE.BufferGeometry(); gCh.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const matCh = new THREE.PointsMaterial({ map: texturaPunto(), color: 0xff7a2a, size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const chispas = new THREE.Points(gCh, matCh); chispas.frustumCulled = false; grupo.add(chispas);

    hilos.i2.malla.material.emissive = new THREE.Color(0x3d9bff);

    const sigue = (dx, dy, dz) => (t) => ruta(t).add(V(dx, dy, dz));
    const deCorte = PLANO_FINAL3.clone().multiplyScalar(K);             // el encuadre del final del plano 3, a esta escala
    const encoge = (t) => ruta(t).add(deCorte.clone().multiplyScalar(tam(t) / TAM0));
    const deVuelta = PLANO_VUELTA.clone().multiplyScalar(K);
    const cNucleo = padEn(0.49, 0.5);
    const camara = porClaves([
      { t: 0, pos: encoge, mira: sigue(0, 0, 0), fov: 30 },
      { t: 1.7, pos: encoge, mira: sigue(0, 0, 0), fov: 30 },
      { t: 2.8, pos: sigue(-1.0, 1.2, 1.1), mira: sigue(0.15, 0, 0), fov: 34, paso: true },
      { t: 4.3, pos: sigue(-0.8, 1.0, 0.9), mira: sigue(0.1, 0, 0), fov: 34, paso: true },
      // en el núcleo, la cámara quieta y cerca: se le ve la cara mientras se calienta
      { t: 5.4, pos: cNucleo.clone().add(V(-0.1, 0.9, 1.3)), mira: cNucleo, fov: 30 },
      { t: 7.9, pos: cNucleo.clone().add(V(-0.1, 0.8, 1.15)), mira: cNucleo, fov: 30 },
      { t: 8.9, pos: sigue(-0.9, 1.1, 1.0), mira: sigue(0.1, 0, 0), fov: 34, paso: true },
      { t: 11.0, pos: sigue(-0.9, 1.1, 1.0), mira: sigue(0, 0, 0), fov: 34 },
      { t: 12.0, pos: V(-4.4, 1.7, 2.9 + zSDA - 0.5), mira: V(-2.1, 0.3, zSDA - 0.1), fov: 34, paso: true },
      // fuera, pegado a la pata: la cámara detrás de él (va a correr hacia −x) y, mientras crece, alejándose en la misma
      // proporción, hasta el encuadre con que empieza el plano 5 (PLANO_VUELTA, a esta escala)
      { t: 13.2, pos: (t) => ruta(t).add(deVuelta.clone().multiplyScalar(tam(t) / TAM0)), mira: sigue(0, 0, 0), fov: 30 },
      { t: 14.1, pos: (t) => ruta(t).add(deVuelta.clone().multiplyScalar(tam(t) / TAM0)), mira: sigue(0, 0, 0), fov: 30 },
    ]);

    const FONDO = new THREE.Color(0x05080f);
    const AZUL = new THREE.Color(0x5aa8ff), ROJO = new THREE.Color(0xff5a1a);
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tReal) {
        const t = tr(tReal);
        camara(t, cam);
        habla(dialogo(tReal, LINEAS));
        tubos.forEach((f) => f(t));
        const k = calor(t);

        zLogica.material.opacity = 0.22 * bell(t, 2.9, 4.5) * (0.7 + 0.3 * Math.sin(t * 16));
        const horno = smooth(seg(t, 4.4, 6.0)) * (1 - smooth(seg(t, 8.6, 10.5)));
        zNucleo.material.opacity = horno * (0.11 + 0.05 * Math.sin(t * 6));
        const adc = bell(t, 8.6, 10.2);
        zADC.material.opacity = 0.14 * adc;
        barrido.material.opacity = 0.5 * adc;
        barrido.position.z = padEn(0, lerp(b0 + 0.03, b1 - 0.03, (t * 2.2) % 1)).z;
        luzCalor.position.copy(cNucleo).add(V(0, 0.3, 0)); luzCalor.intensity = 1.4 * horno;

        // chispas: suben y se apagan, cada una con su fase
        const at = gCh.attributes.position;
        semilla.forEach(([u, v, f, vel], i) => {
          const s = (t * vel + f) % 1, p = padEn(u, v, 0.02 + s * 0.7);
          at.array[3 * i] = p.x + 0.03 * Math.sin(t * 3 + i); at.array[3 * i + 1] = p.y; at.array[3 * i + 2] = p.z;
        });
        at.needsUpdate = true;
        matCh.opacity = 0.7 * horno;

        // el hilo de SDA: en azul a la ida y en rojo a la vuelta, con la medida
        hilos.i2.malla.material.emissive.setHex(t < 7 ? 0x3d9bff : 0xff5a1a);
        hilos.i2.malla.material.emissiveIntensity = 2.2 * (bell(t, 1.8, 3.0) + bell(t, 11.4, 12.6));
        patas.i2.pata.material.emissive.setHex(t < 7 ? 0x3d9bff : 0xff5a1a);
        patas.i2.pata.material.emissiveIntensity = 3 * (1 - smooth(seg(t, 0.3, 1.4))) + 3 * smooth(seg(t, 12.2, 12.8));   // encendida, como al final del plano 3 (y al salir)

        electron.visible = true;
        electron.ruta = (s) => ruta(tr(s)); electron.rutaDesde = 0;
        electron.tam = tam(t); electron.calor = k;
        electron.brillo = Math.max(0.25 * (1 - smooth(seg(t, 0, 1))), 0.12 * horno * (0.5 + 0.5 * Math.sin(t * 11)));
        electron.ojos = lerp(1, 0.55, bell(t, 5.2, 8.0));                // entorna los ojos con el calor
        electron.estela = 0.8;
        const mx = t > 5 && t < 8 ? 0.5 * Math.sin(t * 2.2) : t > 13 ? -0.7 : 0.7, my = t > 5 && t < 8 ? 0.5 : 0;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));
        luzE.position.copy(ruta(t)).add(V(0, 0.08, 0)); luzE.color.copy(AZUL).lerp(ROJO, k);

        velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.6 * smooth(seg(t, 13.85, 14.1))), 0xcfe6ff);   // destellos de los cortes
      },
    };
  },
};
