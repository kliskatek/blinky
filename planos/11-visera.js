// Plano 11: la visera. Sigue del plano 10 (la misma sala, montarSala, y el mismo encuadre de cámara): la persona sonríe y
// la cámara se acerca a la gorra hasta quedar, respecto a su logo, exactamente como queda la del plano 1 respecto al logo
// de la portada en su primer fotograma (la misma distancia en proporción, el mismo giro y el mismo fov; INICIO de
// 01-logo.js). Mientras se acerca, la sala se apaga y entran las luces del plano 1, puestas igual respecto al logo; luego
// la sala, la persona y la gorra desaparecen y queda solo el logo, ya el de la portada (con su grosor), sobre el fondo del
// plano 1, y empieza a mecerse como empieza allí; mientras, todo se funde a negro, como empieza el corto.
//   0-0.8   la persona sonríe (el final del plano 10)
//   0-5.2   la cámara se acerca a la gorra (sin parar: viene en marcha del plano 10); la sala se apaga y entran las
//           luces del plano 1
//   3.4-5.0 desaparece todo menos el logo, que gana el grosor del de la portada
//   4.8-5.8 el logo empieza a mecerse y todo se funde a negro; corte al plano 1 (que empieza en negro)

import * as THREE from 'three';
import { seg, smooth, smoother, lerp, pasa, dialogo, bell } from '../utiles.js';
import { montarSala, CAM_FINAL } from './10-pantalla.js';
import { INICIO, flota, tLogo } from './01-logo.js';
import { crearLogo } from '../piezas/logo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DURA = 5.8;
// el cierre (y se va antes del final: el primer fotograma del plano 1 no tiene bocadillo)
const LINEAS = [[0.8, 5.2, 'Así funciona la tecnología Kliskatek.']];

export default {
  nombre: 'Fin',
  dura: DURA,
  quieto: [[0, DURA]],
  montar({ escena, cam, electron, grupo, bloom, habla, velo }) {
    const { set, persona, H, luces, monitor } = montarSala(grupo);
    monitor.dibujar({ nuevo: 0.05 + 0.95 * 0.5 });                     // la pantalla, como la deja el plano 10 al acabar
    const base = luces.map((l) => l.intensity);
    persona.cabeza.rotation.set(-0.05, 0, 0);                          // la cabeza, como acaba el plano 10, antes de medir
    grupo.updateMatrixWorld(true);
    const logo = persona.logo, LOGO = logo.getWorldPosition(V());

    // de dónde sale la cámara (el final del plano 10) y adónde llega (el primer fotograma del plano 1, sobre esta gorra)
    const posA = H.clone().add(CAM_FINAL.de);
    const tmp = new THREE.PerspectiveCamera(); tmp.position.copy(posA); tmp.lookAt(LOGO);
    const R1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(...INICIO.rot)), R1inv = R1.clone().invert();
    const posF = logo.localToWorld(V(0, 0, INICIO.distancia / INICIO.escala).applyQuaternion(R1inv));
    const qF = logo.getWorldQuaternion(new THREE.Quaternion()).multiply(R1inv);
    const k = logo.getWorldScale(V()).x / INICIO.escala;               // cuánto más pequeño es este logo que el de la portada

    // el mundo del plano 1, en su sitio respecto al logo (girado como la cámara final y escalado por k): sus luces y su logo
    const marco = new THREE.Group(); marco.position.copy(LOGO); marco.quaternion.copy(qF); marco.scale.setScalar(k); grupo.add(marco);
    const dir = (color, i, p) => { const l = new THREE.DirectionalLight(color, 0); l.position.set(...p); marco.add(l); marco.add(l.target); l.userData.i = i; return l; };
    const llave = dir(0xffffff, 2.2, [-5, 6, 9]), contra = dir(0x3d9bff, 3.2, [5, 1, -7]);
    const relleno = new THREE.PointLight(0x2a8cff, 0, 25 * k, 2); relleno.position.set(-5, -1, 4); relleno.userData.i = 30 * k * k; marco.add(relleno);
    const cielo = new THREE.HemisphereLight(0xcfe0ff, 0x0a0c10, 0); cielo.position.set(0, 1, 0); cielo.userData.i = 0.5; marco.add(cielo);
    const nuevas = [llave, contra, relleno, cielo];
    // el logo de la portada, encima del de la gorra (que es más fino): el mismo sitio, el mismo giro, la misma escala
    const logo1 = crearLogo(INICIO.escala); logo1.rotation.set(...INICIO.rot); logo1.visible = false; marco.add(logo1);

    // lo que desaparece: todo lo de la sala menos el logo de la gorra (cada material, una vez)
    const deLogo = new Set(); logo.traverse((o) => deLogo.add(o));
    const mats = new Set();
    set.traverse((o) => { if (o.material && !deLogo.has(o)) [].concat(o.material).forEach((m) => mats.add(m)); });
    mats.forEach((m) => { m.userData.op = m.opacity; m.userData.tr = m.transparent; m.userData.col = m.color?.clone(); m.userData.em = m.emissive?.clone(); });
    // el logo de la portada, sin reflejos de entorno, como en el plano 1 (que no tiene: el entorno no gira con el marco)
    logo1.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.envMapIntensity = 0; }); });

    const FONDO0 = new THREE.Color(0x0b0e13), FONDO1 = new THREE.Color(0x0b0d10);   // FONDO1, el del plano 1
    const ACERCA = pasa(2.4, 0);                                       // con la velocidad con que llega el 10
    return {
      entrar() { escena.background = FONDO0.clone(); },
      actualizar(t) {
        electron.visible = false;
        habla(dialogo(t, LINEAS), { pos: LOGO, radio: 0.45 });
        const e = ACERCA(seg(t, 0, 5.2));                                // sigue acercándose desde el corte, sin pararse
        cam.position.lerpVectors(posA, posF, e);
        // la cámara sigue mirando al logo, como acaba el 10 (así su giro sigue al mismo ritmo en el corte), y pasa poco a
        // poco al giro final
        tmp.position.copy(cam.position); tmp.lookAt(LOGO);
        cam.quaternion.slerpQuaternions(tmp.quaternion, qF, smoother(seg(t, 0, 5.2)));
        cam.fov = lerp(CAM_FINAL.fov, INICIO.fov, e);

        // la sala se apaga y entran las luces de la portada (y su bloom)
        const apaga = smooth(seg(t, 2.4, 4.8));
        luces.forEach((l, i) => { l.intensity = base[i] * (1 - apaga); });
        nuevas.forEach((l) => { l.intensity = l.userData.i * apaga; });
        contra.intensity = contra.userData.i * smooth(seg(t, 4.4, 5.2));   // la de detrás, cuando ya no está la gorra: si no, le saca un canto azul
        escena.background.copy(FONDO0).lerp(FONDO1, apaga);
        bloom.strength = lerp(bloom.strength, 0.55, apaga);

        // y desaparece todo menos el logo: primero se oscurece (si se hiciera transparente sin más, por la gorra se vería
        // la cabeza) y, ya casi negro contra el fondo, se desvanece
        const oscurece = 1 - smooth(seg(t, 3.4, 4.4)), va = smooth(seg(t, 3.8, 5.0));
        mats.forEach((m) => {
          if (m.userData.col) m.color.copy(m.userData.col).multiplyScalar(oscurece);
          if (m.userData.em) m.emissive.copy(m.userData.em).multiplyScalar(oscurece);
          m.envMapIntensity = 1 - apaga;                                 // (los reflejos del entorno se apagan con la sala)
          m.transparent = va > 0 || m.userData.tr; m.opacity = m.userData.op * (1 - va); m.depthWrite = va < 0.5;
        });
        set.visible = va < 0.999;

        // el logo de la gorra pasa a ser el de la portada: aparece encima, tan fino como él, y gana grosor
        logo.visible = t < 3.4;
        logo1.visible = t >= 3.4;
        logo1.scale.set(INICIO.escala, INICIO.escala, INICIO.escala * lerp(0.6 / 1.7, 1, smoother(seg(t, 3.4, 5.2))));
        // ya solo, empieza a mecerse como en el primer segundo del plano 1, para que el corte no se note
        // y todo se funde a negro: el corto empieza en negro (plano 1), así que la vuelta al principio casa del todo
        velo(smooth(seg(t, 4.8, DURA - 0.05)), 0x000000, { fundido: true });
        logo1.rotation.set(...INICIO.rot); logo1.position.set(0, 0, 0);
        const w = smoother(seg(t, 4.8, DURA));
        if (w > 0) {
          const r0 = logo1.rotation.clone();
          flota(logo1, tLogo(t - DURA));
          logo1.rotation.set(lerp(r0.x, logo1.rotation.x, w), lerp(r0.y, logo1.rotation.y, w), 0);
          logo1.position.y *= w;
        }

        // la persona, como al final del plano 10: sonriendo y parpadeando
        persona.cabeza.rotation.set(-0.05, 0, 0);
        persona.sonreir(1); persona.rubor.opacity = 0.32;
        persona.parpadear(bell((t + 11.2 + 1.5) % 3.7, 0, 0.16));   // el parpadeo sigue la cuenta del plano 10 (11,2 s)
      },
    };
  },
};
