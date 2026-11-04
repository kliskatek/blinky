// Plano 6: el lector, en la planta (piezas/planta.js). El electrón, rojo, llega por el aire desde el tag de la máquina
// (con su estela de frentes de backscatter) hasta la antena de panel sobre su pie; aterriza en la cara, se mete dentro
// (la antena se enciende), sale por detrás, baja deslizándose por el cable coaxial (por el pie, por el suelo y arriba,
// al armario eléctrico) hasta el lector fijo, en su balda, y entra por su conector 1: el lector lo recibe (parpadean los
// LED y se encienden las aletas, una tras otra).
//   0-5.2   el vuelo hasta la antena (empieza con la cámara detrás de él, como acaba el plano 5); aterriza y pasa de
//           fotón a electrón; en 5.4 se para (PAUSA segundos: lo de después va retrasado eso, tr() lo mete) y lo dice,
//           ya como quien se lo sabe; la cámara se le acerca
//   5.4-6.6 entra en la antena (que se enciende) y sale por detrás
//   6.7-10.4 baja por el cable hasta el lector
//   10.4-11 entra por el conector
//   11-13.4 el lector lo recibe (y mientras lo lee, sus aletas barren en rojo de lado a lado, como KITT); la cámara
//           rodea el lector hasta su lado del Ethernet, como empieza el plano 7; destello

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, texturaPunto, dialogo, pasa } from '../../../comun/motor/utiles.js';
import { ANTENA_POS } from '../../../comun/piezas/planta.js';
import { crearPlantaSerie } from '../../comun/sitios.js';
import { TRAS_VUELO } from './05-vuelta.js';
import { CAM_INICIO7 } from './07-plc.js';
import { PLC_REPOSO } from '../../../comun/piezas/plc.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = 10;                                          // metros → mundo: la antena mide 2,6; el cable, de radio 0,05
const TAM = 0.9;                                       // el electrón, el doble de gordo que el cable (más fino, iba metido dentro)
const PARA = 5.4, PAUSA = 2.2;
// y otra en el lector, ya dentro: dice que lo han detectado y que su información sale por el bus de campo
const PARA2 = 12.0, PAUSA2 = 6.0;
const tr = (t) => {
  if (t < PARA) return t;
  if (t < PARA + PAUSA) return PARA;
  const u = t - PAUSA;
  return u < PARA2 ? u : u < PARA2 + PAUSA2 ? PARA2 : u - PAUSA2;
};
const LINEAS = [[PARA + 0.1, PARA + PAUSA, 'Electrón otra vez… ¡esto ya me lo sé!'],
  [PAUSA + PARA2 + 0.1, PAUSA + PARA2 + 2.2, 'Esto parece un reader RAIN…'],   // (desde el lector)
  [PAUSA + PARA2 + 2.4, PAUSA + PARA2 + PAUSA2, '¡Anda! Aquí me han detectado… y están redirigiendo mi información por el bus de campo.']];

export default {
  nombre: 'El lector',
  dura: 13.4 + PAUSA + PAUSA2,
  quieto: [[PARA, PARA + PAUSA], [PARA2 + PAUSA, PARA2 + PAUSA + PAUSA2]],
  montar({ escena, cam, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xcfe0ff, 0x33373c, 0.7));
    const sol = new THREE.DirectionalLight(0xffffff, 1.9); sol.position.set(-6, 14, 10); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x3d9bff, 1.6); contra.position.set(8, 5, -9); grupo.add(contra);
    const luzE = new THREE.PointLight(0xff5a1a, 2.5, 3, 2); grupo.add(luzE);

    // el decorado: la planta (piezas/planta.js), en metros, escalada por S, con el pie de la antena en el origen. La antena
    // mira al tag de la máquina (de allí llega él) y el coaxial va por el suelo hasta el armario eléctrico, al lector, que
    // está en su balda (como lo encuentra el plano 7)
    const set = new THREE.Group(); set.scale.setScalar(S); grupo.add(set);
    const O6 = V(ANTENA_POS.x, 0, ANTENA_POS.z);
    const { planta } = crearPlantaSerie(); planta.grupo.position.copy(O6).negate(); set.add(planta.grupo);
    const lector = planta.lector, ant = planta.antena;
    set.updateMatrixWorld(true);
    const enSet = (v, obj) => v.clone().applyMatrix4(obj.matrix).sub(O6);    // local de un aparato → metros del set
    const detrasM = enSet(ant.detras, ant.grupo), caraM = enSet(ant.cara, ant.grupo);
    const puertoM = enSet(lector.puerto, lector.grupo);
    const fueraM = V(0, 0, 1).applyQuaternion(lector.grupo.quaternion);       // hacia donde mira el lado de los conectores
    const puntosCable = planta.coax.points.map((p) => p.clone().sub(O6)).reverse();   // del lector a la antena

    // en el mundo
    const W = (m) => m.clone().multiplyScalar(S);
    const M = (x, y, z) => W(V(x, y, z).sub(O6));                            // un punto de la planta (en sus metros) → mundo
    const F = W(caraM), D = W(detrasM), P = W(puertoM);
    const n = V(0, 0, 1).applyQuaternion(ant.grupo.quaternion);               // la normal de la cara
    const arriba = V(0, 1, 0), lado = n.clone().cross(arriba).normalize();
    const inicio = F.clone().addScaledVector(n, 30).add(V(0, 7, 0));
    const vuelo = new THREE.CatmullRomCurve3([inicio, F.clone().addScaledVector(n, 18).add(V(0, 4, 0)), F.clone().addScaledVector(n, 8).add(V(0, 1.2, 0)),
      F.clone().addScaledVector(n, 2.5), F.clone().addScaledVector(n, 0.13)]);
    const dentro = new THREE.LineCurve3(F.clone().addScaledVector(n, 0.13), F.clone().addScaledVector(n, -0.2));
    const cable = new THREE.CatmullRomCurve3(puntosCable.slice().reverse().map(W), false, 'centripetal');
    const conector = new THREE.LineCurve3(P, P.clone().addScaledVector(fueraM, -0.35));
    const base = porTramos([
      { t0: 0, t1: 5.0, curva: vuelo, ease: (x) => x * (1.2 - 0.2 * x) },
      { t0: 5.4, t1: 6.0, curva: dentro, ease: smooth },
      { t0: 6.7, t1: 10.4, curva: cable },
      { t0: 10.4, t1: 11.0, curva: conector, junta: true },               // del cable al conector, sin pararse
    ]);
    // antes de t = 0 sigue la recta por la que viene volando (la estela que traía del plano 5 no se corta)
    const tangente0 = vuelo.getTangentAt(0), rapidez0 = 1.2 * vuelo.getLength() / 5.0;
    const ruta = (t) => {
      if (t < 0) return vuelo.getPointAt(0).addScaledVector(tangente0, rapidez0 * t);
      if (t > 6.0 && t < 6.7) return D.clone();                                // por dentro de la antena, de la cara a la espalda
      const p = base(t);
      p.addScaledVector(n, 0.12 * bell(t, 5.0, 5.35));                        // un bote al aterrizar
      p.y += 0.1 * smooth(seg(t, 6.7, 6.95)) * (1 - smooth(seg(t, 10.15, 10.4)));    // por el cable, montado encima (sin tocar el suelo)
      return p;
    };
    const tam = (t) => (t < 5.4 ? 1 : t < 6.0 ? lerp(1, 0.3, seg(t, 5.4, 6.0)) : t < 10.4 ? TAM : lerp(TAM, 0.2, seg(t, 10.4, 11)));

    // lo que se enciende: la funda del cable por donde baja, el parche de la antena, el conector, los LED y las aletas
    const geoLuz = new THREE.TubeGeometry(cable, planta.coax.tramos, 0.065, 16);       // (con los tramos del cable: con menos, en las curvas cerradas atajaba y se salía de él)
    const matLuz = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.4, 0.1), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    grupo.add(new THREE.Mesh(geoLuz, matLuz));
    const conectorM = lector.conectores[0].material; conectorM.emissive = new THREE.Color(0xff5a1a);
    // mientras lee la señal y lo detecta, las aletas hacen un barrido rojo de ida y vuelta, como el de KITT: una cabeza
    // que va de un lado a otro, frenando en los extremos, con una estela que se apaga detrás; y una luz roja que la sigue.
    // Al final vuelven al naranja bajo y parejo con que las encuentra el plano 7
    const NAR = new THREE.Color(0xff5a1a), ROJO = new THREE.Color(0xff1606);
    const KITT0 = 11.0 + PAUSA, KITT1 = 13.4 + PAUSA + PAUSA2, PASADA = 0.62, nA = lector.aletas.length;
    const cabeza = (u) => (nA - 1) * (0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, u) / PASADA));
    grupo.updateMatrixWorld(true);
    const posAletas = lector.aletas.map((a) => grupo.worldToLocal(a.getWorldPosition(V())));
    const luzK = new THREE.PointLight(0xff2010, 0, 0.9 * S / 10 * 2.5, 2); grupo.add(luzK);

    // frentes de backscatter que llegan con él: anillos detrás, por la misma ruta
    const anillos = [0, 1, 2, 3].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 12, 128),
        new THREE.MeshBasicMaterial({ color: 0xff8000, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      grupo.add(m); return m;
    });
    const r = rng(29), np = 1600, pp = new Float32Array(np * 3);
    for (let i = 0; i < np; i++) { const p = F.clone().addScaledVector(n, r() * 34 - 2).add(V((r() - 0.5) * 22, r() * 14 - 2, (r() - 0.5) * 22)); pp.set([p.x, p.y, p.z], 3 * i); }
    const gPolvo = new THREE.BufferGeometry(); gPolvo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    grupo.add(new THREE.Points(gPolvo, new THREE.PointsMaterial({ map: texturaPunto(), size: 0.08, color: 0x6fb4ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })));

    // cámara
    const sigue = (fn) => (t) => fn(ruta(t), t);
    const ejeX = V(1, 0, 0).applyQuaternion(lector.grupo.quaternion);
    const cLector = W(enSet(V(0, 0.03, 0), lector.grupo));
    // detrás de él en el vuelo, en su dirección de marcha: el mismo encuadre con que acaba el plano 5 (TRAS_VUELO)
    const trasVuelo = (que) => (t) => {
      const e = ruta(t), k = seg(t, 0, 5.0), u = t < 0 ? tangente0 : vuelo.getTangentAt(Math.min(0.999, k * (1.2 - 0.2 * k)));
      const l = u.clone().cross(arriba).normalize();
      return que === 'pos' ? e.addScaledVector(u, TRAS_VUELO.atras).addScaledVector(arriba, TRAS_VUELO.arriba).addScaledVector(l, TRAS_VUELO.lado)
        : e.addScaledVector(u, TRAS_VUELO.delante);
    };
    // y al final, el lector visto por su lado del Ethernet, como lo recoge el plano 7 (CAM_INICIO7, girado con el lector)
    const R6 = W(enSet(lector.red, lector.grupo)), finalPos = R6.clone().add(CAM_INICIO7.de);   // (el mismo desplazamiento que usa el 7, sin girar)
    const MEDIO = F.clone().lerp(P, 0.5);                                   // entre la antena y el conector del lector
    const camara = porClaves([
      { t: 0, pos: trasVuelo('pos'), mira: trasVuelo('mira'), fov: TRAS_VUELO.fov },
      { t: 3.2, pos: trasVuelo('pos'), mira: trasVuelo('mira'), fov: TRAS_VUELO.fov },
      { t: 4.5, pos: F.clone().addScaledVector(n, 18).add(V(0, 4.5, 0)).addScaledVector(lado, 9), mira: F, fov: 40, paso: true },
      { t: 5.7, pos: F.clone().addScaledVector(n, 14).add(V(0, 3.6, 0)).addScaledVector(lado, 7), mira: F, fov: 40 },
      // por el cable (bajo el forjado, pilar abajo, por el suelo y por la espalda del armario, donde entra): un plano
      // abierto desde el lado del pilar, con la antena colgada, el pilar y la espalda del armario, para que se vea por
      // dónde va; y, ya dentro, rodea el armario por la esquina hasta el lector
      { t: 7.0, pos: F.clone().lerp(MEDIO, 0.5).add(V(-6, 6, 30)), mira: F.clone().lerp(MEDIO, 0.4), fov: 44, paso: true },   // apartándose
      { t: 7.7, pos: M(5.6, 3.2, -1.0), mira: M(3.0, 1.5, -3.8), fov: 44, paso: true },  // hacia el lado del pilar
      { t: 8.5, pos: M(6.4, 2.6, -4.6), mira: M(3.0, 1.0, -3.4), fov: 46 },
      { t: 9.4, pos: M(5.3, 1.8, -3.6), mira: M(2.6, 0.9, -2.6), fov: 44 },
      { t: 9.9, pos: M(5.2, 1.7, -3.4), mira: M(2.5, 0.95, -2.5), fov: 44 },            // entra por el prensaestopas del fondo
      { t: 10.55, pos: M(4.0, 1.45, -0.8), mira: P.clone().lerp(M(2.3, 0.95, -2.4), 0.3), fov: 40, paso: true },   // por fuera de la esquina
      { t: 11.1, pos: P.clone().add(V(0.6, 0.6, 5.2)), mira: P, fov: 38, paso: true },
      { t: 12.0, pos: cLector.clone().add(V(1.4, 0.8, 4.6)), mira: cLector.clone().add(V(-0.2, 0, 0)), fov: 38 },   // el lector, de frente y desde la derecha (por la puerta, transparente); se para y habla
      { t: 13.4, pos: finalPos, mira: R6, fov: CAM_INICIO7.fov, llega: 0.6 },   // llega en marcha: el 7 sigue moviéndose
    ]);

    const FONDO = new THREE.Color(0x05080f);
    const rutaR = (t) => ruta(tr(t));
    const mira0 = V(), fwd = V();
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tReal) {
        const t = tr(tReal);
        camara(t, cam);
        planta.girar(tReal);                                              // la línea, en marcha (piezas por las cintas)
        planta.verArmario(smooth(seg(t, 9.7, 10.3)));                     // la puerta, transparente cuando entra en el armario
        // en la pausa, la cámara se le acerca por delante de la cara de la antena y vuelve a donde estaba
        const cerca = smoother(seg(tReal, PARA - 0.2, PARA + 0.6)) * (1 - smoother(seg(tReal, PARA + PAUSA - 0.7, PARA + PAUSA)));
        if (cerca > 0) {
          const e = rutaR(tReal);
          cam.getWorldDirection(fwd); mira0.copy(cam.position).addScaledVector(fwd, cam.position.distanceTo(e));
          cam.position.lerp(e.clone().addScaledVector(n, 3.2).addScaledVector(lado, 1.1).add(V(0, 0.5, 0)), cerca);
          cam.lookAt(mira0.lerp(e.clone().addScaledVector(lado, -0.25).add(V(0, 0.15, 0)), cerca));
          cam.fov = lerp(cam.fov, 32, cerca);
        }

        // frentes: a la zaga del electrón por el vuelo, abriéndose; al llegar a la cara se apagan
        anillos.forEach((m, i) => {
          const tf = t - 0.35 * (i + 1), k = seg(tf, 0, 5.0);
          const p = vuelo.getPointAt(Math.min(0.999, k * (1.2 - 0.2 * k)));
          const q = vuelo.getTangentAt(Math.min(0.999, k));
          m.position.copy(p); m.quaternion.setFromUnitVectors(V(0, 0, 1), q);
          m.scale.setScalar(0.5 + 0.9 * (1 - k));
          m.material.opacity = tf > 0 && tf < 5.1 ? 0.75 * Math.min(1, tf * 2) * (1 - smooth(seg(tf, 4.6, 5.1))) * (1 - cerca) : 0;
        });

        ant.brillo.material.opacity = 0.9 * bell(t, 5.2, 6.9) * (1 - 0.85 * cerca);   // en la pausa, bajo: si no, quema el primer plano
        geoLuz.setDrawRange(0, Math.floor(geoLuz.index.count * base.ease[2](seg(t, 6.7, 10.4)) / 6) * 6);
        matLuz.opacity = 0.45 * (1 - smooth(seg(t, 11.0, 12.0)));                 // ya en el lector, el cable se apaga (el plano 7 no lo tiene)
        conectorM.emissiveIntensity = 3 * bell(t, 10.2, 11.8);
        // el PLC, como lo encuentra el plano 7 al empezar
        planta.armario.ledsCPU[1].visible = planta.armario.ledsCPU[2].visible = false;
        planta.armario.escribir(PLC_REPOSO);
        // el lector lo recibe: los LED parpadean y las aletas se encienden una tras otra, y siguen encendidas al cortar
        // (el plano 7 empieza con ellas así y las apaga)
        const recibe = smooth(seg(t, 10.9, 11.4));
        lector.leds.forEach((l, i) => { l.visible = recibe < 0.05 || Math.sin((tReal - PAUSA - PAUSA2) * 18 + i * 1.7) > -0.2; });   // (siguen parpadeando en la pausa)
        const enKitt = smooth(seg(tReal, KITT0, KITT0 + 0.25)) * (1 - smooth(seg(tReal, KITT1 - 0.9, KITT1 - 0.35)));
        const u = tReal - KITT0, color = NAR.clone().lerp(ROJO, enKitt);
        lector.aletas.forEach((a, i) => {
          let k = 0;
          for (let j = 0; j < 12; j++) { const d = (i - cabeza(u - j * 0.025)) / 1.05; k = Math.max(k, Math.exp(-j * 0.025 / 0.07) * Math.max(0, 1 - d * d)); }
          const fondo = 0.35 * smooth(seg(t - i * 0.05, 11.0, 11.8)) * (1 - 0.95 * enKitt);   // (apagadas detrás del barrido; al final, bajo y parejo, como lo encuentra el 7)
          a.material.emissive.copy(color); a.material.emissiveIntensity = fondo + 4 * k * enKitt;
        });
        const h = cabeza(u), i0 = Math.min(nA - 2, Math.floor(h));
        luzK.position.lerpVectors(posAletas[i0], posAletas[i0 + 1], h - i0).y += 0.25;
        luzK.intensity = 4 * enKitt;

        electron.visible = !(t > 6.0 && t < 6.6) && t < 11.0;
        electron.ruta = rutaR; electron.rutaDesde = t < 6.6 ? -1 : 6.6 + PAUSA;
        electron.tam = tam(t); electron.calor = 1; electron.ojos = 1;
        electron.forma = 1 - smooth(seg(t, 4.95, 5.35));                  // llega de fotón; al tocar la antena, electrón otra vez
        const linea = dialogo(tReal, LINEAS);
        habla(linea, linea && tReal > PAUSA + PARA2 ? { pos: cLector, radio: 0.9 } : null);   // la del lector, desde el lector
        electron.brillo = 0.4 * bell(tReal, 4.9, 5.6) + 0.3 * bell(t, 6.5, 7.0);   // el destello del cambio, en tiempo real (no se queda congelado)
        electron.estela = t < 6 ? 1 : 0.7;
        const mx = t < 5 ? 0 : t < 6.7 ? 0 : 0.5, my = t < 5 ? 0 : t < 6.7 ? 0 : -0.6;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));
        luzE.position.copy(rutaR(tReal)).add(V(0, 0.2, 0)); luzE.intensity = electron.visible ? 2.5 * (1 - 0.8 * cerca) : 0;   // de cerca, contra el radomo blanco, quemaba

        velo(0.6 * smooth(seg(t, 13.1, 13.4)), 0xcfe6ff);              // sin fundido al empezar (sigue el vuelo del 5); destello del corte al 7
      },
    };
  },
};
