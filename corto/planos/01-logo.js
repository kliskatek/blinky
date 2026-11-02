// Plano 1: el logo flotante de la portada (la "k«" extruida, la misma de k3d-cases.js, escena cover), un brillo que
// recorre sus cantos y se queda en la esquina de arriba de la k, la cámara entra en el brillo hasta que lo llena todo,
// y del destello nace Blinky, de fotón: abre los ojos, mira alrededor, se presenta y sale corriendo.
//   0-4.2   el logo flota y una luz barre sus cantos; se va quedando quieto
//   4.0-4.8 el brillo prende en la esquina
//   4.8-7.9 la cámara entra en el brillo; destello en blanco
//   7.9-8.6 el destello se recoge en Blinky (con los ojos cerrados)
//   9.3     abre los ojos; mira a un lado, al otro, a cámara
//   10.6-20.8 se presenta (HABLA segundos: el resto del plano va retrasado eso)
//   20.9    salta de contento; 21.7 coge carrerilla y sale disparado hacia la derecha
// (el arranque, 0-4.8, va acortado a ABRE segundos: R() lo comprime)

import * as THREE from 'three';
import { seg, smooth, smoother, easeOut, easeIn, easeBack, bell, lerp, rng, dialogo } from '../utiles.js';
import { crearLogo, LOGO_C, FRENTE, ESQUINA } from '../piezas/logo.js';
import { SIGUE_INICIO, FONDO_TAG } from './02-tag.js';

const S = 0.27;
// la presentación: empieza en PRESENTA y dura HABLA; lo de después de PRESENTA va retrasado HABLA segundos
const PRESENTA = 10.6, HABLA = 10.2;
const tr = (t) => (t < PRESENTA ? t : t < PRESENTA + HABLA ? PRESENTA : t - HABLA);
// el arranque (el logo flota y la luz barre sus cantos) va más deprisa: los ABRE primeros segundos reales hacen los 4.8
// de este fichero; los tiempos de aquí son sin acortar
const ABRE = 3.9, R = (t) => (t < ABRE ? t * 4.8 / ABRE : t + 4.8 - ABRE);
export { R as tLogo };
// pose de reposo del logo, en la que prende el brillo: un poco girado, para que se lea el volumen
const REPOSO = { ry: -0.28, rx: 0.1 };
// cómo flota el logo (t, del tiempo de este fichero) y se va quedando en reposo antes del brillo. El plano 11 lo usa
// con t negativo, para que el logo llegue al corte ya meciéndose como empieza aquí
export function flota(logo, t) {
  const vaiven = 1 - smooth(seg(t, 2.4, 4.2));
  logo.rotation.y = REPOSO.ry + vaiven * 0.55 * Math.sin(t * 0.55 + 0.6);
  logo.rotation.x = REPOSO.rx + vaiven * 0.08 * Math.sin(t * 0.7);
  logo.position.y = vaiven * 0.12 * Math.sin(t * 0.9);
}
const LINEAS = [
  [10.8, 12.5, '¡Hola! Soy Blinky.'],
  [12.7, 14.9, 'Soy una partícula de energía.'],
  [15.1, 18.0, 'Ahora mismo tengo forma de fotón de RF: luz que no se ve.'],
  [18.2, 20.8, '¡Y os voy a explicar cómo funciona la tecnología Kliskatek!'],
];

// estrella de cuatro puntas con un núcleo redondo: el brillo
// El primer fotograma: el logo a esta escala y con este giro, la cámara a esta distancia, de frente y con este fov. El
// plano 11 acaba exactamente así sobre el logo de la gorra, para que la vuelta al principio no se note.
export const INICIO = { escala: S, distancia: 13.5, fov: 30, rot: [0.1, -0.28 + 0.55 * Math.sin(0.6), 0] };

export function texturaEstrella() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.translate(256, 256);
  const nucleo = g.createRadialGradient(0, 0, 0, 0, 0, 120);
  nucleo.addColorStop(0, 'rgba(255,255,255,1)'); nucleo.addColorStop(0.15, 'rgba(255,255,255,.8)');
  nucleo.addColorStop(0.5, 'rgba(255,255,255,.12)'); nucleo.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = nucleo; g.fillRect(-256, -256, 512, 512);
  const rayo = (largo, grueso, giro) => {
    g.save(); g.rotate(giro);
    const gr = g.createLinearGradient(-largo, 0, largo, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-largo, 0); g.lineTo(0, -grueso); g.lineTo(largo, 0); g.lineTo(0, grueso); g.fill();
    g.restore();
  };
  rayo(250, 7, 0); rayo(250, 7, Math.PI / 2); rayo(130, 4, Math.PI / 4); rayo(130, 4, -Math.PI / 4);
  return new THREE.CanvasTexture(c);
}

function texturaPunto() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export default {
  nombre: 'Intro',
  dura: 13 + HABLA - (4.8 - ABRE),
  sombra: false,                                   // (el logo, solo: sin sombras)
  quieto: [[PRESENTA - (4.8 - ABRE), PRESENTA - (4.8 - ABRE) + HABLA]],          // (para el modo sonido: ver sonido.js)
  montar({ escena, cam, bloom, electron, grupo, velo, habla }) {
    // luces del logo (como la portada) y una luz que barre los cantos
    grupo.add(new THREE.HemisphereLight(0xcfe0ff, 0x0a0c10, 0.5));
    const llave = new THREE.DirectionalLight(0xffffff, 2.2); llave.position.set(-5, 6, 9); grupo.add(llave);
    const contra = new THREE.DirectionalLight(0x3d9bff, 3.2); contra.position.set(5, 1, -7); grupo.add(contra);
    const relleno = new THREE.PointLight(0x2a8cff, 30, 25, 2); relleno.position.set(-5, -1, 4); grupo.add(relleno);
    const barrido = new THREE.PointLight(0xffffff, 0, 6, 2); grupo.add(barrido);

    const logo = crearLogo(S); grupo.add(logo);

    logo.rotation.set(REPOSO.rx, REPOSO.ry, 0); logo.updateMatrixWorld(true);
    const G = logo.localToWorld(new THREE.Vector3(ESQUINA[0] - LOGO_C[0], LOGO_C[1] - ESQUINA[1], FRENTE + 0.05));

    const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEstrella(), blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, transparent: true, toneMapped: false }));
    brillo.position.copy(G); brillo.renderOrder = 10; grupo.add(brillo);

    // polvo: puntos tenues alrededor de la esquina y por el camino de la cámara, para que el viaje tenga paralaje
    const r = rng(7), n = 1800, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const lejos = r() < 0.45;
      pos[3 * i] = G.x + (r() - 0.5) * (lejos ? 9 : 2.4);
      pos[3 * i + 1] = G.y + (r() - 0.5) * (lejos ? 6 : 1.6);
      pos[3 * i + 2] = G.z + (lejos ? (r() * 12 - 2) : (r() - 0.5) * 2.4);
    }
    const gPolvo = new THREE.BufferGeometry(); gPolvo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const matPolvo = new THREE.PointsMaterial({ map: texturaPunto(), size: 0.035, color: 0x6fb4ff, transparent: true,
      opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    grupo.add(new THREE.Points(gPolvo, matPolvo));

    const C0 = new THREE.Vector3(0, 0, 13.5), O = new THREE.Vector3(), mira = new THREE.Vector3();
    const FONDO0 = new THREE.Color(0x0b0d10), FONDO1 = new THREE.Color(FONDO_TAG);   // acaba en el fondo del plano 2
    const C1 = G.clone().add(new THREE.Vector3(0, 0, 2.4));     // la cámara después del destello, frente al electrón

    // la ruta: flota en G (y se mece mientras habla); carrerilla hacia atrás y sale disparado a la derecha
    const ruta = (t) => {
      const p = G.clone(), u = tr(t);
      p.y += 0.035 * Math.sin(t * 2.3) + 0.06 * bell(u, 10.75, 11.25);
      p.x += 0.02 * Math.sin((t - PRESENTA) * 1.7) * bell(t, PRESENTA, PRESENTA + HABLA);
      p.x -= 0.16 * smooth(seg(u, 11.45, 11.9));
      // acelera hasta la velocidad con que empieza el vuelo del plano 2 (si llega más rápido, allí parece que frena)
      if (u > 11.9) { const v = u - 11.9; p.x += 2.6 * v * v + 0.5 * v; p.z -= 0.4 * v * v; p.y += 0.25 * v; }
      return p;
    };

    return {
      entrar() { escena.background = FONDO0.clone(); escena.environment = null; },   // (sin reflejos de entorno: como el logo de la web, y así casa con el final del 11)
      actualizar(tReal) {
        const t = R(tReal);
        // el logo: flota y se va quedando en reposo antes del brillo
        flota(logo, t);
        logo.visible = t < 7.6;

        // la luz que barre: cruza por delante de izquierda a derecha y vuelve a la esquina
        const b = seg(t, 0.6, 3.6);
        barrido.position.set(lerp(-4.5, 3.5, smooth(b)), 1.2 + 0.6 * Math.sin(b * Math.PI), 1.6);
        if (t > 3.6) barrido.position.lerp(G.clone().add(new THREE.Vector3(0.4, 0.3, 0.6)), smooth(seg(t, 3.6, 4.4)));
        barrido.intensity = 14 * bell(t, 0.4, 3.9) + 10 * smooth(seg(t, 3.7, 4.4)) * (1 - smooth(seg(t, 7.2, 7.8)));

        // el brillo: prende, late y crece mientras la cámara entra; se recoge en el electrón
        const prende = easeOut(seg(t, 4.0, 4.7));
        const recoge = smooth(seg(t, 7.9, 8.7));
        const late = 1 + 0.12 * Math.sin(t * 7);
        brillo.scale.setScalar((0.9 + 0.5 * bell(t, 4.0, 4.6)) * prende * late * (1 - recoge) + 0.0001);
        brillo.material.rotation = 0.25 * t;
        brillo.material.color.setScalar(2.6 * prende * (1 - recoge) + 0.01);
        brillo.visible = t > 3.95 && t < 8.7;

        // la cámara: frente al logo; entra en el brillo (con un poco de arco) hasta tocarlo; tras el destello, frente al electrón
        const entra = smoother(seg(t, 4.8, 7.9));
        if (t < 7.9) {
          cam.position.lerpVectors(C0, G.clone().add(new THREE.Vector3(0.0, 0.0, 0.12)), easeIn(entra) * 0.35 + smoother(entra) * 0.65);
          cam.position.y += 0.6 * Math.sin(Math.PI * entra) * (1 - entra);
          mira.lerpVectors(O, G, smooth(seg(t, 4.6, 6.2)));
          cam.fov = lerp(30, 22, entra);
        } else {
          // tras el destello: frente al electrón; cuando sale corriendo, la cámara se le pone detrás con el encuadre con
          // que empieza el plano 2 (SIGUE_INICIO), para que el corte case
          cam.position.copy(C1);
          cam.position.z += 0.25 * (1 - easeOut(seg(t, 7.9, 9.5)));
          // mientras se presenta, la cámara se le acerca un poco
          cam.position.z -= 0.6 * smoother(seg(t, PRESENTA, PRESENTA + 1.6)) * (1 - smoother(seg(t, PRESENTA + HABLA - 0.9, PRESENTA + HABLA + 0.3)));
          mira.copy(G);
          const sigue = smoother(seg(tr(t), 11.95, 12.95)), e = ruta(t);
          cam.position.lerp(e.clone().add(SIGUE_INICIO.pos), sigue);
          mira.lerp(e.clone().add(SIGUE_INICIO.mira), sigue);
          cam.fov = lerp(30, SIGUE_INICIO.fov, sigue);
        }
        cam.lookAt(mira);

        // fondo y polvo: hacia el mundo diminuto
        escena.background.copy(FONDO0).lerp(FONDO1, smooth(seg(t, 5, 7.9)));
        matPolvo.opacity = 0.75 * smooth(seg(t, 4.8, 6)) * (1 - 0.5 * smooth(seg(t, 8, 9)));

        // el destello: blanco que llena la pantalla y se abre sobre el electrón
        const destello = smooth(seg(t, 7.2, 7.9)) * (1 - smooth(seg(t, 7.9, 8.5)));
        // empieza en negro (en el que acaba el plano 11) y se abre al logo; luego, el destello
        const negro = 1 - smooth(seg(tReal, 0, 1.0));
        if (negro > 0) velo(negro, 0x000000, { fundido: true }); else velo(destello, 0xeaf4ff);
        bloom.strength = 0.55 + 1.4 * smooth(seg(t, 5.5, 7.9)) * (1 - smooth(seg(t, 7.9, 8.8)));

        // el electrón
        electron.visible = t > 7.85;
        electron.ruta = (s) => ruta(R(s)); electron.rutaDesde = 7.85 - (4.8 - ABRE);
        electron.tam = easeBack(seg(t, 7.9, 8.7));
        electron.brillo = 1 - smooth(seg(t, 7.9, 8.8));
        electron.calor = 0;
        electron.ojos = smooth(seg(t, 9.3, 9.55));
        electron.estela = smooth(seg(tr(t), 11.3, 11.9));
        electron.forma = 1;                                                  // nace de la luz: es un fotón
        // mira a un lado y a otro; al hablar, a cámara
        const u = tr(t), lejos = false;   // (se lo dice a cámara)
        const mx = t < 9.7 ? 0 : t < 10.15 ? -1 : t < 10.6 ? 1 : lejos ? 0.9 : u < 11.4 ? 0 : 1;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.25), lerp(electron.mirada.y, (u > 10.7 && u < 11.3) || lejos ? 0.4 : 0, 0.25));
        habla(dialogo(t, LINEAS));
      },
    };
  },
};
