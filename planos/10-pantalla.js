// Plano 10: la pantalla. Una sala de control: una mesa con su monitor y una persona sentada delante, con gorra. Empieza
// en la tarjeta de temperatura del panel de mando de la línea, como acaba el plano 9 en la fila del ERP (de dato a
// dato): al salir del destello la tarjeta pasa a 41,8 °C, en rojo y con la alerta, la gráfica gana un punto por encima del
// umbral y el registro entra arriba de la lista. La cámara se abre al panel entero, sale de la pantalla y se queda por
// encima del hombro de la persona, que lo ve y asiente; luego la rodea hasta verla de frente, iluminada por la
// pantalla, sonriendo, con el logo de Kliskatek en la gorra. (La alerta ya se encajó en el ERP: aquí no vuelve a entrar.)
//   0-2.2   de la tarjeta al panel entero; el dato cambia al salir del destello
//   3-6.4   la cámara sale hasta el hombro; asiente (5.6)
//   6.4-11.2 la rodea hasta verla de frente, y se acerca a la gorra (sigue el plano 11)

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, porTramos, porClaves, pasa, dialogo, cajaBisel } from '../utiles.js';
import { crearMonitor, crearPersona, TARJETA_T } from '../piezas/sala.js';
import { crearPlanta, OFICINA } from '../piezas/planta.js';
import { madera, moqueta, teclado, conTexturas } from '../piezas/texturas.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = 10;
// Blinky, ya alerta en la pantalla, habla desde su tarjeta
const LINEAS = [
  [0.8, 3.4, '¡Aquí estoy! Soy la alerta de la pantalla.'],
  [3.6, 6.6, 'El operario me ha visto… y el ERP ya ha pedido revisar el motor.'],
];
// el final de este plano, del que sigue el 11 (que monta la misma sala con montarSala)
export const CAM_FINAL = { de: V(0.8, 0.3, -3.4), fov: 34 };

// La sala, con sus luces, en el grupo del plano. La usan este plano y el 11.
export function montarSala(grupo) {
    const luces = [new THREE.HemisphereLight(0xcfdcff, 0x2a2e34, 0.8)];
    const ventana = new THREE.DirectionalLight(0xffe6c8, 1.3); ventana.position.set(12, 14, 10); luces.push(ventana);
    const contra = new THREE.DirectionalLight(0x3d9bff, 1.0); contra.position.set(-8, 6, 12); luces.push(contra);
    luces.forEach((l) => grupo.add(l));

    const set = new THREE.Group(); set.scale.setScalar(S); grupo.add(set);
    const caja = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(cajaBisel(w, h, d, 0.006), m); o.position.set(x, y, z); set.add(o); return o; };
    const mat = (color, metal = 0.1, rug = 0.6) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug });
    // la oficina de la entreplanta de la planta (piezas/planta.js): detrás de la persona, el frente de cristal y, abajo, la
    // planta (la máquina con su tag, la antena, los armarios), que se ve por él; la oficina de la planta se esconde
    const planta = crearPlanta(); planta.grupo.position.copy(OFICINA).negate(); set.add(planta.grupo); planta.oficina.visible = false;
    planta.lamparas.visible = false;                                    // por el cristal, una quedaba justo encima de la gorra
    caja(8, 0.02, 2.95, conTexturas(mat(0x3a3f46, 0.0, 0.95), moqueta(), 8, 2.95), 0, -0.01, 0.825);   // suelo, de moqueta
    caja(8, 3, 0.05, mat(0x1c2129, 0.0, 0.9), 0, 1.5, -0.65);                                  // pared
    for (const x of [-4, 4]) caja(0.05, 3, 2.95, mat(0x252b33, 0.0, 0.9), x, 1.5, 0.825);      // los lados
    const vidrio = new THREE.MeshStandardMaterial({ color: 0x9fc4e8, metalness: 0, roughness: 0.45, transparent: true, opacity: 0.14, depthWrite: false });
    caja(8, 2.6, 0.02, vidrio, 0, 1.6, 2.3);                                                   // el frente de cristal
    const marco = mat(0x2a2f35, 0.5, 0.4);
    caja(8, 0.06, 0.06, marco, 0, 0.3, 2.3); caja(8, 0.06, 0.06, marco, 0, 2.9, 2.3); caja(8, 0.3, 0.05, marco, 0, 0.15, 2.3);
    for (let x = -4; x <= 4; x += 2) caja(0.06, 2.6, 0.06, marco, x, 1.6, 2.3);
    caja(1.4, 0.03, 0.62, conTexturas(mat(0xd8cfc0, 0.0, 0.5), madera(), 1.4, 0.62), 0, 0.74, 0.02);   // mesa
    for (const [x, z] of [[-0.66, -0.25], [0.66, -0.25], [-0.66, 0.29], [0.66, 0.29]]) caja(0.04, 0.74, 0.04, mat(0x3a3f45, 0.5, 0.4), x, 0.37, z);
    caja(0.44, 0.02, 0.14, conTexturas(mat(0xffffff, 0.2, 0.6), teclado()), 0, 0.765, 0.13);   // teclado
    const monitor = crearMonitor(); monitor.grupo.position.set(0, 1.12, -0.15); set.add(monitor.grupo);
    const persona = crearPersona(); persona.grupo.position.set(0, 0, 0.62); set.add(persona.grupo);
    set.updateMatrixWorld(true);

    const Sc = monitor.grupo.localToWorld(V(0, 0, 0.017)), Tw = monitor.grupo.localToWorld(monitor.enPantalla(...TARJETA_T));
    const H = persona.cabeza.localToWorld(V(0, 0.15, 0)), LOGO = persona.logo.getWorldPosition(V());
    const luzPantalla = new THREE.PointLight(0x9fd0ff, 22, 16, 2); luzPantalla.position.copy(Sc).add(V(0, 0.6, 2.6)); grupo.add(luzPantalla);
    luces.push(luzPantalla);
    return { set, monitor, persona, Sc, Tw, H, LOGO, luzPantalla, luces };
}

export default {
  nombre: 'La pantalla',
  dura: 11.2,
  quieto: [[0, 11.2]],                            // la cámara, despacio
  montar({ escena, cam, electron, grupo, velo, habla }) {
    const { monitor, persona, Sc, Tw, H, LOGO, luzPantalla } = montarSala(grupo);

    const camara = porClaves([
      // empieza en la tarjeta de temperatura, como acaba el plano 9 en la fila del ERP (de dato a dato), y se abre al
      // panel entero (pegada a la pantalla, con la persona justo detrás: gran angular)
      { t: 0, pos: Tw.clone().add(V(0, 0, 1.5)), mira: Tw, fov: 40 },
      { t: 0.6, pos: Tw.clone().add(V(0, 0, 1.25)), mira: Tw, fov: 40, ease: pasa(3, 0) },   // sigue el empujón con que acaba el 9 y frena
      // el panel entero, con el aviso del ERP abajo
      { t: 2.2, pos: Sc.clone().add(V(0.0, 0.0, 4.6)), mira: Sc.clone().lerp(Tw, 0.06), fov: 50 },
      { t: 3.0, pos: Sc.clone().add(V(0.0, 0.0, 4.5)), mira: Sc.clone().lerp(Tw, 0.05), fov: 50 },
      { t: 5.0, pos: H.clone().add(V(4.4, 3.2, 8.8)), mira: Sc.clone().add(V(0, -0.8, 0)), fov: 34 },
      { t: 6.4, pos: H.clone().add(V(4.0, 2.8, 8.0)), mira: Sc.clone().add(V(0, -0.9, 0)), fov: 34 },
      { t: 8.2, pos: H.clone().add(V(6.2, 0.9, -0.4)), mira: H, fov: 34, paso: true },
      { t: 9.8, pos: H.clone().add(V(1.9, -0.2, -5.6)), mira: H.clone().add(V(0, 0.15, 0)), fov: 34, paso: true },
      { t: 11.2, pos: H.clone().add(CAM_FINAL.de), mira: LOGO, fov: CAM_FINAL.fov, llega: 0.5 },   // llega en marcha: el 11 sigue acercándose
    ]);

    const FONDO = new THREE.Color(0x0b0e13);
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(t) {
        camara(t, cam);
        electron.visible = false;

        // la tarjeta pasa al dato nuevo al salir del destello
        monitor.dibujar({ nuevo: t < 0.15 ? 0 : 0.05 + 0.95 * smooth(seg(t, 0.15, 0.5)) * (1 - 0.5 * smooth(seg(t, 3.5, 5.5))) });
        luzPantalla.intensity = 22 + 12 * bell(t, 0.15, 1.2);

        // la persona: asiente al ver el dato y sonríe
        persona.cabeza.rotation.x = 0.16 * bell(t, 5.6, 6.1) + 0.12 * bell(t, 6.1, 6.6) - 0.05 * smooth(seg(t, 7.2, 9.0));
        persona.cabeza.rotation.y = 0.12 * bell(t, 8.0, 10.6);
        persona.sonreir(smooth(seg(t, 6.4, 7.2)));
        persona.rubor.opacity = 0.15 + 0.17 * smooth(seg(t, 6.4, 7.2));   // (contento, se sonroja un poco)
        persona.parpadear(bell(t % 3.7, 0, 0.16));

        habla(dialogo(t, LINEAS), { pos: Tw, radio: 0.5 });            // Blinky, desde su tarjeta de la pantalla
        velo(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0xcfe6ff);              // sale del destello; sin fundido al final: sigue el 10
      },
    };
  },
};
