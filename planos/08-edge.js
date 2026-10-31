// Plano 8: el edge; aquí el electrón se convierte en información. En físico (escala de los planos 6 y 7), en el armario
// eléctrico de la planta: el electrón llega por el cable (por las canaletas) con los tres datos del PLC girando a su
// alrededor y entra en un gateway edge (una caja industrial de aletas, sin marca, de pie en el carril DIN junto al PLC,
// con los puertos abajo). Sale flotando por delante de las aletas: los datos se enroscan con él, destello, estalla en partículas de
// todos los colores y se recompone en un paquete de información (piezas/paquete.js: un cubo de cristal cian con el
// registro dentro y sus mismos ojos). Mira alrededor, extrañado, y sube: el plano 9 lo recoge en el mundo digital.
//   0-0.3   sale del destello del corte (el plano 7 lo dejó arrancando por el cable: el mismo seguimiento, los datos girando igual)
//   0.6-3.9 por el cable hasta el puerto LAN del edge
//   4.4-5.0 sale por arriba; 5.0-6.4 los datos se enroscan con él; 6.4 estalla; 6.8-7.4 se recompone en paquete
//   7.4-8.2 mira alrededor, extrañado: en 7.8 se para (PAUSA segundos: lo de después va retrasado eso, tr() lo mete) y
//           dice que nunca había tenido esta forma; 8.2-9 sube; destello cian, en su pico el corte al plano 9

import * as THREE from 'three';
import { crearPlanta, ARMARIO } from '../piezas/planta.js';
import { seg, smooth, smoother, easeBack, easeOut, bell, lerp, rng, porTramos, porClaves, texturaPunto, dialogo, pasa } from '../utiles.js';
import { crearPaquete } from '../piezas/paquete.js';
import { cartel } from '../piezas/cartel.js';
import { cajaRedonda } from '../piezas/tag.js';
import { ORBITA } from './07-plc.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = 10, TAM = 0.35, CORTE = 9.0;
const PARA = 7.8, PAUSA = 5.0;
// el cable hasta el edge es corto: el tiempo de este fichero empieza corriendo a 3,6/T8 (3 veces el real, con la marcha
// con que lo dejó el 7) y frena sin saltos hasta el real en ACORTA segundos (u = 3t − t²/ACORTA): con un cambio de golpe,
// la cámara y él frenaban en seco
const T8 = 1.2, ACORTA = 3.6 - T8;
const tr = (t) => { const u = t < ACORTA ? 3 * t - t * t / ACORTA : t + ACORTA; return u < PARA ? u : u < PARA + PAUSA ? PARA : u - PAUSA; };
const LINEAS = [[7.55 - ACORTA, 9.55 - ACORTA, '¿Y esto? ¿Un dato?…'],
  [9.75 - ACORTA, PARA + PAUSA - ACORTA, 'El edge me ha convertido en información. ¡Nunca había tenido esta forma!']];
const COLORES = [0x2EBD6B, 0xb06cff, 0xF2B01E];

export default {
  nombre: 'El edge',
  dura: CORTE + PAUSA - ACORTA,
  quieto: [[PARA - ACORTA, PARA + PAUSA - ACORTA]],
  montar({ escena, cam, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x33373c, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(-4, 12, 14); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x3d9bff, 1.2); contra.position.set(9, 4, -6); grupo.add(contra);
    const luzE = new THREE.PointLight(0xff5a1a, 2, 2.5, 2); grupo.add(luzE);

    // el edge, en físico (metros × S)
    const A = new THREE.Group(); grupo.add(A);
    const set = new THREE.Group(); set.scale.setScalar(S); A.add(set);
    // el armario de la planta (piezas/planta.js), con el origen del set en el de su placa de montaje, como el plano 7: el
    // edge (piezas/edge.js), de pie en el carril a la derecha del PLC, con los puertos abajo
    const planta = crearPlanta(); planta.grupo.position.copy(ARMARIO).negate(); set.add(planta.grupo);
    planta.verArmario(1);                                            // dentro del armario: la puerta, transparente
    const mat = (color, metal = 0.3, rug = 0.5, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });
    const edge = planta.edge.grupo, aletas = planta.edge.aletas, ledsE = planta.edge.leds;   // el de la planta (piezas/edge.js)
    // el cable, el de la planta (del X2 al edge, en metros del armario); él sigue por el 45 % del final, desde donde lo
    // dejó el 7
    const c2M = planta.ethernet.plcEdge;
    set.updateMatrixWorld(true);

    const W = (m) => m.clone().multiplyScalar(S), enEdge = (x, y, z) => edge.localToWorld(V(x, y, z));
    const LAN = enEdge(-0.06, 0.02, 0.0705), ENCIMA = enEdge(0, 0.07, 0), ARRIBA = enEdge(0, 0.19, 0);   // por delante de su cara
    const cable = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, k) => W(c2M.getPointAt(0.55 + 0.45 * k / 39))));
    const entra = new THREE.LineCurve3(LAN, enEdge(-0.06, 0.02, 0.04));
    // llega por el cable a la velocidad con que lo dejó el 7 (que acaba a 0,55·1,4/2,2 de su largo por segundo; aquí el
    // tiempo empieza 3 veces más rápido que el real) y entra en el puerto en marcha
    const largo = c2M.getLength() * S, v7 = 0.55 * 1.4 / 2.2 * largo;
    const k0 = Math.min(3, v7 * T8 / cable.getLength());
    const kLAN = Math.min(3, 0.35 * (cable.getLength() / 3.6) / (entra.getLength() / 0.3));
    const baseA = porTramos([
      { t0: 0.0, t1: 3.6, curva: cable, ease: pasa(k0, 0.35) },
      { t0: 3.6, t1: 3.9, curva: entra, ease: pasa(kLAN, 0) },
      { t0: 4.4, t1: 5.0, curva: new THREE.LineCurve3(ENCIMA, ARRIBA), ease: easeOut },
    ]);
    const rutaA = (t) => (t >= 3.9 && t < 4.4 ? ENCIMA.clone() : baseA(t).add(V(0, 0.04 * Math.sin(t * 2.4) * smooth(seg(t, 5, 6)), 0)));

    // los tres datos girando alrededor, que se enroscan con él; y el estallido
    const bolitas = COLORES.map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), toneMapped: false })); A.add(m); return m; });
    const r = rng(31), N = 260, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), semillas = [];
    const PALETA = [0xff5a1a, ...COLORES, 0x3dc8ff].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
      const d = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.6 + r() * 1.4);
      const fin = V((r() - 0.5) * 0.5, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5);           // un punto del cubo del paquete
      semillas.push([d, fin]); const c = PALETA[i % PALETA.length]; col.set([c.r * 2, c.g * 2, c.b * 2], 3 * i);
    }
    const gEst = new THREE.BufferGeometry(); gEst.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gEst.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const estallido = new THREE.Points(gEst, new THREE.PointsMaterial({ map: texturaPunto(), size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    estallido.frustumCulled = false; A.add(estallido);

    const paquete = crearPaquete(); grupo.add(paquete.grupo);

    // ------------------------------------------------------------ cámara
    const posPaquete = (t) => (t < 8.2 ? ARRIBA.clone() : ARRIBA.clone().add(V(0, 40 * Math.pow(seg(t, 8.2, 9.0), 2), 0)));
    const sigueE = (dx, dy, dz) => (t) => rutaA(t).add(V(dx, dy, dz));
    const camA = porClaves([
      { t: 0, pos: sigueE(-1.4, 1.0, 3.0), mira: sigueE(1.4, 0, 0), fov: 34 },
      { t: 2.4, pos: sigueE(-1.4, 1.0, 3.0), mira: sigueE(1.4, 0, 0), fov: 34 },
      { t: 3.8, pos: LAN.clone().add(V(-1.2, 1.4, 3.6)), mira: LAN.clone().add(V(0.4, 0.1, 0)), fov: 34, paso: true },
      { t: 4.8, pos: ARRIBA.clone().add(V(-1.0, 0.4, 3.6)), mira: ARRIBA.clone().add(V(0, -0.1, -0.3)), fov: 34 },
      { t: 7.6, pos: ARRIBA.clone().add(V(-0.8, 0.35, 3.0)), mira: ARRIBA.clone().add(V(0, 0, -0.1)), fov: 34 },
      { t: 8.3, pos: ARRIBA.clone().add(V(-0.8, 0.35, 3.0)), mira: ARRIBA, fov: 34 },
      // la cámara levanta la vista un poco y el paquete sale disparado por arriba del cuadro (seguirlo hasta arriba era un latigazo)
      { t: CORTE, pos: ARRIBA.clone().add(V(-1.0, 0.0, 3.4)), mira: (t) => ARRIBA.clone().add(V(0, 1.6 * (1 - Math.exp(-(posPaquete(t).y - ARRIBA.y) / 1.6)), 0)), fov: 34 },
    ]);
    const FONDO = new THREE.Color(0x05080f);
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tReal) {
        const t = tr(tReal), extrana = bell(tReal, 7.5 - ACORTA, PARA + PAUSA - ACORTA);
        camA(t, cam);

        // el edge lo recibe (LED, aletas) y lo transforma
        ledsE.forEach((l, k) => { l.visible = !(t > 3.6 && t < 8.5) || Math.sin(t * 16 + k * 2) > -0.3; });
        aletas.forEach((a, i) => { a.material.emissiveIntensity = 1.4 * bell(t - i * 0.04, 3.9, 5.4); });
        const enrosca = smoother(seg(t, 5.0, 6.4));
        bolitas.forEach((b, i) => {
          const a = ORBITA.angulo(i, tReal + ORBITA.fin) + 6 * enrosca * (t - 5.0), rr = (t < 4.4 ? 0.16 : 0.36) * (1 - enrosca);
          b.position.copy(rutaA(t)).add(V(rr * Math.cos(a), 0.6 * rr * Math.sin(a), rr * Math.sin(a)));
          // entran en el puerto con él y salen con él: encogen y crecen (antes desaparecían y aparecían de golpe)
          b.scale.setScalar(Math.max(0.001, t < 4.4 ? 1 - smooth(seg(t, 3.45, 3.85)) : smooth(seg(t, 4.4, 4.7))));
          b.visible = !(t > 3.85 && t < 4.4) && t < 6.4;
        });
        const sale = seg(t, 6.4, 6.8), vuelve = smoother(seg(t, 6.8, 7.4));
        semillas.forEach(([d, fin], i) => {
          const p = ARRIBA.clone().addScaledVector(d, easeOut(sale)).lerp(ARRIBA.clone().add(fin), vuelve);
          pos.set([p.x, p.y, p.z], 3 * i);
        });
        gEst.attributes.position.needsUpdate = true;
        estallido.visible = t > 6.4 && t < 7.45;

        // el paquete: aparece al recomponerse, mira alrededor y sube
        const nace = easeBack(seg(t, 6.9, 7.5));
        paquete.grupo.visible = t > 6.9;
        paquete.grupo.position.copy(posPaquete(t)).add(V(0, 0.04 * Math.sin(tReal * 2.4) * extrana, 0));
        paquete.grupo.scale.setScalar(Math.max(0.001, 0.55 * nace));
        // extrañado: se mira a un lado y a otro, despacio, mientras habla
        paquete.actualizar(tReal, cam, { mirada: extrana > 0 ? 0.9 * Math.sin((tReal - 7.5 + ACORTA) * 2.2) : 0, brillo: bell(t, 6.9, 7.8) });
        habla(dialogo(tReal, LINEAS), { pos: paquete.grupo.position, radio: 0.6 * paquete.grupo.scale.x });

        // el electrón, hasta que estalla
        electron.visible = t < 6.4 && !(t > 3.9 && t < 4.4);
        electron.ruta = (s) => rutaA(tr(s)); electron.rutaDesde = t < 4.4 ? 0 : 4.4 - ACORTA;   // (en segundos reales, como la ruta)
        electron.tam = t < 3.6 ? TAM : t < 4.4 ? lerp(TAM, 0.2, seg(t, 3.6, 3.9)) : lerp(0.2, 1.0, smooth(seg(t, 4.4, 5.0)));
        electron.calor = lerp(1, 0.3, smooth(seg(t, 5.0, 6.4)));
        electron.ojos = t > 5.8 ? lerp(1, 0.3, seg(t, 5.8, 6.3)) : 1;
        electron.brillo = 0.9 * smooth(seg(t, 5.4, 6.4));
        electron.estela = t < 4 ? 0.7 : 0.3;
        electron.mirada.set(lerp(electron.mirada.x, t < 4 ? 0.8 : 0, 0.2), lerp(electron.mirada.y, t > 5 ? 0.3 : 0, 0.2));
        luzE.position.copy(rutaA(t)).add(V(0, 0.15, 0)); luzE.intensity = electron.visible ? 2 : 0;

        velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.85 * bell(t, 6.25, 6.65), 0.9 * smooth(seg(t, 8.6, 9.0))),
          t < 6 ? 0xcfe6ff : 0xd8f4ff);                                                  // destellos de los cortes y de la transformación
      },
    };
  },
};
