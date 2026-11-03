// Plano 11: la visera. Sigue del plano 10 (la misma sala, montarSala, y el mismo encuadre de cámara), con la cámara
// llegando a la gorra de la persona. Blinky sale de la pantalla (detrás de la persona), pasa por encima de su cabeza y
// se queda junto a la k del logo de la gorra mientras dice la última frase; la esquina de la k prende con el mismo brillo
// del que nació en el plano 1, Blinky se mete en él, la cámara entra detrás y todo acaba en un destello que se funde a
// negro. Ese es el final: no hace falta volver al logo del principio.
//   0-ACERCA  la cámara sigue acercándose a la gorra (viene en marcha del plano 10) y se para delante del logo
//   0.2-0.5   Blinky sale de la tarjeta de la pantalla, de fotón
//   0.3-1.9   vuela por encima de la cabeza hasta la k; 1.9-2.5 se queda a su lado (habla)
//   2.3-2.6   prende el brillo en la esquina de la k; 2.5-2.9 Blinky se mete en él
//   2.7-3.5   la cámara entra en el brillo; destello en blanco, que se funde a negro hasta el final

import * as THREE from 'three';
import { seg, smooth, smoother, easeIn, easeOut, easeBack, lerp, pasa, dialogo, bell } from '../utiles.js';
import { montarSala, CAM_FINAL } from './10-pantalla.js';
import { texturaEstrella } from './01-logo.js';
import { LOGO_C, ESQUINA } from '../piezas/logo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DURA = 4.4;
const LLEGA = 1.9, METE = 2.5;                                    // cuándo llega a la k y cuándo se mete en ella
const LINEAS = [[0.6, METE, '¡Kliskatek hace fácil lo difícil, en un parpadeo!']];   // (el lema de la serie)
const TAM = 0.55;                                                  // Blinky, del tamaño de la k de la gorra

export default {
  nombre: 'Fin',
  dura: DURA,
  quieto: [[LLEGA - 0.3, METE]],                                   // (si la voz no cabe, se alarga mientras espera junto a la k)
  montar({ escena, cam, electron, grupo, bloom, habla, velo }) {
    const { set, persona, H, Tw, luces, monitor } = montarSala(grupo);
    monitor.dibujar({ nuevo: 0.05 + 0.95 * 0.5 });                     // la pantalla, como la deja el plano 10 al acabar
    const base = luces.map((l) => l.intensity);
    persona.cabeza.rotation.set(-0.05, 0, 0);                          // la cabeza, como acaba el plano 10
    grupo.updateMatrixWorld(true);
    const logo = persona.logo, LOGO = logo.getWorldPosition(V());

    // la esquina de arriba de la k, en la cara del logo (G), y hacia dónde mira el logo (N)
    const cara = logo.children[0].geometry; cara.computeBoundingBox();
    const zCara = cara.boundingBox.max.z;
    const G = logo.localToWorld(V(ESQUINA[0] - LOGO_C[0], LOGO_C[1] - ESQUINA[1], zCara));
    const N = logo.localToWorld(V(0, 0, zCara + 1)).sub(logo.localToWorld(V(0, 0, zCara))).normalize();
    const arriba = V(0, 1, 0), lado = N.clone().cross(arriba).normalize();

    // la cámara: de donde la deja el plano 10, a delante del logo (sin cambiar de velocidad en el corte), y de ahí al brillo
    const posA = H.clone().add(CAM_FINAL.de), posM = LOGO.clone().addScaledVector(N, 2.6).addScaledVector(arriba, 0.25);
    const ACERCA = Math.min(3, Math.max(1.2, 5.2 * posA.distanceTo(posM) / posA.distanceTo(LOGO.clone().addScaledVector(N, 0.55))));
    const llegaCam = pasa(2.4, 0), tmp = new THREE.PerspectiveCamera(), mira = V();

    // la ruta de Blinky: de la tarjeta de la pantalla, por encima de la cabeza, a su sitio junto a la k; ahí se mece, y se mete
    const ESPERA = G.clone().addScaledVector(N, 0.32).addScaledVector(lado, -0.18).addScaledVector(arriba, 0.06);
    const vuelo = new THREE.CatmullRomCurve3([Tw.clone(), Tw.clone().addScaledVector(arriba, 0.8), H.clone().addScaledVector(arriba, 1.0).addScaledVector(N, 0.4),
      ESPERA.clone().addScaledVector(arriba, 0.35).addScaledVector(lado, -0.3), ESPERA]);
    const ruta = (t) => {
      if (t < LLEGA) return vuelo.getPointAt(smoother(seg(t, 0.3, LLEGA)));
      const p = ESPERA.clone().addScaledVector(arriba, 0.025 * Math.sin((t - LLEGA) * 3.2));
      return p.lerp(G, easeIn(seg(t, METE, METE + 0.4)));
    };

    // el brillo de la esquina de la k (el del plano 1)
    const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEstrella(), blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, transparent: true, toneMapped: false }));
    brillo.position.copy(G).addScaledVector(N, 0.01); brillo.renderOrder = 10; grupo.add(brillo);
    const BLANCO = new THREE.Color(0xeaf4ff), NEGRO = new THREE.Color(0x000000), velado = new THREE.Color();
    let bloom0 = 0.55;

    return {
      entrar() { bloom0 = bloom.strength; },
      actualizar(t) {
        // la cámara: llega delante del logo mirándolo; luego, al brillo
        const e = llegaCam(seg(t, 0, ACERCA)), entra = smoother(seg(t, 2.7, 3.5));
        cam.position.lerpVectors(posA, posM, e);
        cam.position.lerp(G.clone().addScaledVector(N, 0.04), easeIn(entra) * 0.4 + entra * 0.6);
        mira.copy(LOGO).lerp(G, smooth(seg(t, 2.2, 2.9)));
        tmp.position.copy(cam.position); tmp.lookAt(mira); cam.quaternion.copy(tmp.quaternion);
        cam.fov = lerp(CAM_FINAL.fov, 26, smooth(seg(t, 1.5, 3.5)));

        // Blinky: sale de la pantalla, vuela a la k, espera hablando y se mete en el brillo
        electron.visible = t > 0.2 && t < METE + 0.45;
        electron.ruta = ruta; electron.rutaDesde = 0.2;
        electron.forma = 1; electron.calor = 0; electron.ojos = 1;
        electron.tam = TAM * easeBack(seg(t, 0.2, 0.5)) * (1 - easeIn(seg(t, METE + 0.05, METE + 0.42)));
        electron.brillo = 1 - smooth(seg(t, 0.2, 0.8)) + smooth(seg(t, METE - 0.1, METE + 0.3));
        electron.estela = smooth(seg(t, 0.35, 0.7)) * (1 - smooth(seg(t, LLEGA, LLEGA + 0.4)));
        const mx = t < LLEGA ? 0.6 : t < METE - 0.2 ? 0 : 0.8;                // a cámara mientras habla; luego, a la k
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, t > METE - 0.2 ? -0.3 : 0, 0.2));
        habla(dialogo(t, LINEAS));

        // el brillo: prende, late y, cuando Blinky se mete, crece y se lleva la sala
        const prende = easeOut(seg(t, 2.3, 2.6)), late = 1 + 0.12 * Math.sin(t * 7);
        brillo.visible = t > 2.28;
        brillo.scale.setScalar(0.3 * prende * late * (1 + 0.8 * bell(t, METE + 0.2, METE + 0.5) + 2.5 * smooth(seg(t, 2.9, 3.5))) + 0.0001);
        brillo.material.rotation = 0.25 * t;
        brillo.material.color.setScalar(2.6 * prende + 0.01);
        const apaga = smooth(seg(t, 2.6, 3.4));
        luces.forEach((l, i) => { l.intensity = base[i] * (1 - 0.6 * apaga); });
        bloom.strength = bloom0 + 1.4 * smooth(seg(t, 2.6, 3.5));

        // el destello en blanco, que se funde a negro: el final
        const blanco = smooth(seg(t, 3.0, 3.5)), negro = smooth(seg(t, 3.6, DURA - 0.05));
        velo(blanco, velado.copy(BLANCO).lerp(NEGRO, negro).getHex(), { fundido: true });
        set.visible = blanco < 0.999;

        // la persona, como al final del plano 10: sonriendo y parpadeando (la cabeza, quieta: lleva la k)
        persona.cabeza.rotation.set(-0.05, 0, 0);
        persona.sonreir(1); persona.rubor.opacity = 0.32;
        persona.parpadear(bell((t + 11.2 + 1.5) % 3.7, 0, 0.16));   // el parpadeo sigue la cuenta del plano 10 (11,2 s)
      },
    };
  },
};
