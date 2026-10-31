// Plano 7: el PLC. El lector, en una balda del armario, todavía encendido: el electrón sale por su Ethernet y corre por
// el cable (azul) hasta el puerto X1 de la CPU, mientras los otros sensores de la máquina mandan lo suyo a sus módulos
// (bolitas de colores, sin cara: verde el inductivo a las digitales, morado el de presión a las analógicas, amarillo el
// IO-Link a su maestro). La CPU junta todo: su pantalla enseña la temperatura que trae el electrón junto a la presión,
// la presencia y el nivel; los datos de cada módulo viajan por el carril hasta ella. El electrón sale por el puerto X2
// con los otros tres datos girando a su alrededor y se va por el cable, hacia el equipo edge (plano 8).
// Habla tres veces: por el cable, al ver el PLC; desde dentro de la CPU, al ver su temperatura en la pantalla (el
// bocadillo sale de la CPU); y al salir con los otros datos.
//   0-0.6   sale del destello del corte, con el lector encuadrado como lo dejó el plano 6 (CAM_INICIO7)
//   0.6-6.2 por el cable Ethernet del lector a la CPU; los sensores, a lo suyo
//   6.2-10  entra por X1; la CPU junta los datos y los enseña
//   10-12.6 sale por X2, con los datos de los sensores, y arranca por el cable; destello: el plano 8 sigue en ese cable
//           con el mismo seguimiento y los datos girando igual (ORBITA)

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, porTramos, porClaves, dialogo, pasa } from '../utiles.js';
import { crearPlanta, ARMARIO } from '../piezas/planta.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = 10, TAM = 0.35;
const COLORES = { di: 0x2EBD6B, ai: 0xb06cff, iol: 0xF2B01E };
const DURA = 12.6;
const LINEAS = [
  [4.3, 6.5, '¡Un PLC! El cerebro de la máquina.'],                  // cuando la cámara se abre y se ve el armario
  [7.0, 9.7, '¡Mira! Esa de la pantalla es mi temperatura.'],
  [10.3, 12.55, '¡Y ahora viajo con más datos!'],
];
// el primer encuadre (la cámara junto al Ethernet del lector, en metros × S respecto a ese puerto, con el lector sin girar)
export const CAM_INICIO7 = { de: V(2.0, 0.9, 2.6), fov: 34 };
// los datos girando alrededor del electrón al salir: ángulo de cada uno en el segundo t del plano (el 8 sigue la cuenta)
export const ORBITA = { radio: 0.16, angulo: (i, t) => t * 5 + [0, 0.8, 1.6][i] * 2.6, fin: DURA };

export default {
  nombre: 'El PLC',
  dura: DURA,
  quieto: [[6.6, 10]],                            // en la CPU
  montar({ escena, cam, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x33373c, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(-4, 12, 14); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x3d9bff, 1.0); contra.position.set(9, 4, -6); grupo.add(contra);
    const luzE = new THREE.PointLight(0xff5a1a, 2, 2.5, 2); grupo.add(luzE);

    // el armario eléctrico de la planta (piezas/planta.js), con el origen del armario (crearArmario) en el del set: el
    // lector, en su balda a la izquierda, con su Ethernet (+X) mirando al PLC; a la derecha, la canaleta hacia el edge
    const set = new THREE.Group(); set.scale.setScalar(S); grupo.add(set);
    const planta = crearPlanta(); planta.grupo.position.copy(ARMARIO).negate(); set.add(planta.grupo);
    const arm = planta.armario, lector = planta.lector;
    planta.verArmario(1);                                            // dentro del armario: la puerta, transparente
    set.updateMatrixWorld(true);
    const red = lector.red.clone().applyMatrix4(lector.grupo.matrix).sub(ARMARIO);
    const [x1, x2] = arm.puertos;

    // los dos cables Ethernet, los de la planta (en metros del armario)
    // (el lector, de pie en el carril a la izquierda del PLC: su Ethernet, a su derecha; el cable pasa por debajo de la fuente)
    const c1M = planta.ethernet.lectorPLC, c2M = planta.ethernet.plcEdge;

    // en el mundo
    const W = (m) => m.clone().multiplyScalar(S), aMundo = (curva) => new THREE.CatmullRomCurve3(curva.points.map(W), false, curva.curveType);
    const c1 = aMundo(c1M), c2 = aMundo(c2M), X1 = W(x1), X2 = W(x2), R = W(red);
    const dentro = V(0, 0, -0.3);
    const base = porTramos([
      { t0: 0.3, t1: 6.2, curva: c1, sale: 0.8 },                     // sale del lector ya lanzado
      { t0: 6.2, t1: 6.7, curva: new THREE.LineCurve3(X1, X1.clone().add(dentro)), junta: true },   // entra en el puerto sin pararse
      { t0: 6.7, t1: 10.0, curva: new THREE.LineCurve3(X1.clone().add(dentro), X2.clone().add(dentro)), ease: smooth },   // dentro (no se ve), de un puerto al otro: si no, a los 10 s la ruta, y la cámara que la sigue, daban un salto
      { t0: 10.0, t1: 10.4, curva: new THREE.LineCurve3(X2.clone().add(dentro), X2), ease: smooth },
      { t0: 10.4, t1: DURA, curva: c2, ease: (x) => 0.55 * Math.pow(x, 1.4) },   // arranca; el plano 8 sigue la carrera
    ]);
    const ruta = (t) => base(t);

    // los datos de los sensores: una bolita de color por sensor, que sube por su cable cada poco; en la CPU, los datos
    // de cada módulo viajan por el carril hasta ella; al salir, giran alrededor del electrón
    const bolitas = arm.sensores.map(({ n, curva }) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORES[n]).multiplyScalar(2.2), toneMapped: false }));
      grupo.add(m);
      return { n, m, curva: aMundo(curva), fase: { di: 0, ai: 0.8, iol: 1.6 }[n] };
    });
    const cpu = W(V(arm.mods.cpu.x, arm.Y, arm.ZF + 0.012));

    const sigue = (dx, dy, dz) => (t) => ruta(t).add(V(dx, dy, dz));
    const fCPU = W(V(arm.mods.cpu.x, arm.Y, arm.ZF));
    const camara = porClaves([
      { t: 0, pos: R.clone().add(CAM_INICIO7.de), mira: R, fov: CAM_INICIO7.fov },
      { t: 1.6, pos: sigue(-0.6, 0.9, 2.4), mira: sigue(0.6, 0, 0), fov: 34, ease: pasa(0.6, 0) },   // sale en marcha, como acaba el 6
      { t: 3.6, pos: sigue(-0.6, 0.9, 2.4), mira: sigue(0.6, 0, 0), fov: 34, paso: true },
      { t: 5.0, pos: V(-1.4, 4.4, 11.2), mira: V(-1.3, 3.2, 0.8), fov: 34, paso: true },
      { t: 6.6, pos: fCPU.clone().add(V(0.2, 0.5, 5.4)), mira: fCPU.clone().add(V(0.7, -0.15, 0)), fov: 34 },
      { t: 9.4, pos: fCPU.clone().add(V(0.5, 0.45, 5.0)), mira: fCPU.clone().add(V(0.75, -0.15, 0)), fov: 34 },
      { t: 10.7, pos: sigue(-1.4, 1.0, 3.0), mira: sigue(1.4, 0, 0), fov: 34, paso: true },
      { t: DURA, pos: sigue(-1.4, 1.0, 3.0), mira: sigue(1.4, 0, 0), fov: 34 },
    ]);

    const FONDO = new THREE.Color(0x05080f);
    const GRIS = '#6f7a84', BLANCO = '#e8eef2', NARANJA = '#ff8a3a';
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(t) {
        camara(t, cam);

        // el lector, aún encendido del plano 6, se apaga; sus LED parpadean al mandar
        lector.aletas.forEach((a) => { a.material.emissiveIntensity = 0.35 * (1 - smooth(seg(t, 0, 1.6))); });   // (con lo que acaban en el 6)
        lector.leds.forEach((l, i) => { l.visible = t > 1.2 || Math.sin((t + 13.4) * 18 + i * 1.7) > -0.2; });   // con el mismo parpadeo que traían del plano 6

        // los sensores: cada 2,4 s su dato sube a su módulo, que lo acusa con un LED
        bolitas.forEach((b) => {
          let p;
          if (t < 7.2) {
            const k = ((t + b.fase) % 2.4) / 1.6;
            b.m.visible = k <= 1;
            p = b.curva.getPointAt(Math.min(k, 0.999));
            arm.leds[b.n].forEach((l, i) => l.material.color.setHex(k > 0.95 && k < 1.35 && i === 0 ? COLORES[b.n] : 0x1d3a28));
          } else if (t < 10.0) {
            // por el carril hasta la CPU, y espera allí
            const k = smoother(seg(t, 7.3 + b.fase * 0.4, 8.4 + b.fase * 0.4)), m = arm.mods[b.n];
            const desde = W(V(m.x, arm.Y, arm.ZF + 0.012));
            p = desde.lerp(cpu, k); b.m.visible = k < 0.98 || t > 9.6;
            arm.leds[b.n].forEach((l, i) => l.material.color.setHex(i === 0 ? COLORES[b.n] : 0x1d3a28));
          } else {
            // alrededor del electrón
            const a = ORBITA.angulo(bolitas.indexOf(b), t), r = ORBITA.radio;
            p = ruta(t).add(V(r * Math.cos(a), r * Math.sin(a) * 0.6, r * Math.sin(a)));
            b.m.visible = true;
          }
          b.m.position.copy(p);
        });

        // la CPU: RUN fijo, COM parpadea mientras habla, ERR apagado; y la pantalla
        arm.ledsCPU[1].visible = t > 6.2 && t < 11 ? Math.sin(t * 20) > 0 : false;
        arm.ledsCPU[2].visible = false;
        // las medidas de los sensores bailan un poco hasta que la CPU las empaqueta con él (9,5 s): desde ahí, las del
        // paquete (REGISTRO), que son las que llegan al edge, al MES y a la pantalla; la del tag es una lectura, fija
        const vivo = t < 9.5, j = (a, b) => (vivo ? a + b * Math.sin(Math.floor(t * 3) * 1.7) : a).toFixed(a > 10 ? 1 : 2);
        arm.escribir([
          ['PLC   RUN', '#2EBD6B'],
          t > 6.7 ? ['RFID  T 41.8 °C', NARANJA] : ['RFID  ---', GRIS],
          [`PRES  ${j(2.41, 0.02)} bar`, BLANCO],
          [`PROX  ${!vivo || Math.sin(t * 1.3) >= 0 ? 1 : 0}`, BLANCO],
          [`IO-L  ${vivo ? Math.round(63 + 2 * Math.sin(t)) : 63} %`, BLANCO],
        ]);

        electron.visible = t > 0.25 && !(t > 6.7 && t < 10.0);
        electron.ruta = ruta; electron.rutaDesde = t < 10 ? 0.3 : 10.0;
        electron.tam = t < 1.0 ? lerp(0.15, TAM, smooth(seg(t, 0.25, 0.7))) : t < 6.2 ? TAM : t < 10 ? lerp(TAM, 0.2, seg(t, 6.2, 6.7)) : lerp(0.2, TAM, smooth(seg(t, 10, 10.4)));
        electron.calor = 1; electron.ojos = 1;
        electron.brillo = 0.3 * bell(t, 9.9, 10.6);
        electron.estela = 0.7;
        const mx = t < 6.2 ? 0.7 : 0.8;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, 0, 0.2));
        luzE.position.copy(ruta(t)).add(V(0, 0.15, 0)); luzE.intensity = electron.visible ? 2 : 0;

        // dentro de la CPU habla desde ella
        habla(dialogo(t, LINEAS), t > 6.7 && t < 10.0 ? { pos: fCPU, radio: 0.4 } : null);

        velo(Math.max(0.6 * (1 - smooth(seg(t, 0, 0.3))), 0.6 * smooth(seg(t, DURA - 0.25, DURA))), 0xcfe6ff);   // destellos de los cortes
      },
    };
  },
};
