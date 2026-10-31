// Plano 9: el MES y el ERP, en el mundo digital (una rejilla de luz). Blinky, ya paquete de información, entra en el
// MES (la capa de gestión de la producción, el nivel 3 de ISA-95), una nave de líneas de luz con cuatro estaciones en
// fila. Llegan otras lecturas de temperatura de la misma máquina (cubos pequeños con su valor, sin cara) y le rodean:
// 1 · AGRUPAR, se juntan en un lote que gira a su alrededor; 2 · MEDIA, cada uno manda su valor a un marcador que saca
// la media, y la media se va al histórico; 3 · FILTRAR, una membrana con el umbral (T > media + 1 °C, es decir, 41,5 °C): los demás rebotan,
// se apagan y caen, y solo pasa él (41,8 °C); 4 · EVENTOS, el aro se pone rojo y se convierte en una alerta, un
// triángulo rojo (piezas/alerta.js); se para, lo dice y le gusta. Luego, como alerta, por el carril de luz entre otros
// paquetes hasta la base de datos del ERP, y se encaja en su tabla de avisos de mantenimiento como
// aviso nuevo, en rojo (al ERP no le llegan lecturas, sino lo que hay que hacer con ellas).
//   0-0.4   sale del destello del corte (el plano 8 lo dejó subiendo, de paquete): por el carril hacia el MES
//   0-2.6   entra en la nave hasta la estación 1; los otros datos llegan a la vez
//   2.6-4.8 agrupar; 4.8-5.6 a la estación 2
//   5.6-7.6 la media (los valores van al marcador uno a uno; la media sale hacia el histórico)
//   7.6-8.4 a la membrana; 8.4-9.6 filtra: los demás caen, él pasa; 9.6-10.4 a la estación 4
//   10.4-11.4 se pone rojo y se convierte en alerta; en 11.6 se para (PAUSA segundos: lo de después va retrasado eso,
//           tr() lo mete), lo dice, contento
//   11.8-16.4 por el carril de luz; 16.4-17.8 a su fila; 17.8-20.3 la cámara se mete en la fila nueva hasta llenar el
//           cuadro; destello: el plano 10 empieza con esos valores en la tarjeta de temperatura del panel

import * as THREE from 'three';
import { seg, smooth, smoother, easeBack, easeOut, easeIn, bell, lerp, rng, porTramos, porClaves, dialogo, pasa } from '../utiles.js';
import { crearPaquete } from '../piezas/paquete.js';
import { crearAlerta } from '../piezas/alerta.js';
import { cartel } from '../piezas/cartel.js';
import { cajaRedonda } from '../piezas/tag.js';
import { L, num } from '../idioma.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PARA = 11.6, PAUSA = 3.4;
const tr = (t) => (t < PARA ? t : t < PARA + PAUSA ? PARA : t - PAUSA);
const LINEAS = [
  [0.5, 2.9, 'Esto es el MES: aquí se gestiona la producción.'],
  [5.5, 7.8, 'Nos agrupan y sacan la media de todas las lecturas…'],
  [8.3, 10.4, '¡Solo pasa lo que supera la media en más de 1 °C… y yo paso!'],
  [PARA + 0.1, PARA + PAUSA, '¡Ahora soy una alerta! Esto sí que me gusta.'],
  [16.0, 19.2, 'Y ahora, al ERP: allí seré un aviso de mantenimiento.'],
];
const SALE = 11.8;                                   // la alerta sale hacia el ERP
// las estaciones del MES, en fila por z; la membrana del filtro, entre la 2 y la 4
const Y = 6, Z_AGR = 56, Z_MED = 48, Z_FIL = 40, Z_EVT = 32;
// las otras lecturas de la misma máquina (las de antes; el ERP ya tiene las cuatro primeras) y la suya
const OTROS = [39.6, 40.1, 40.4, 41.0, 39.9, 40.2, 40.8], SUYO = 41.8;
// el filtro: pasa lo que supera la media del lote (40,5 °C, con la suya) en más de 1 °C: 41,5 °C (el umbral de la alerta)
const MARGEN = 1;
const coma = (v) => num(v, 1);

// un dato pequeño, sin cara: un cubo de cristal con su valor delante
function crearDato(texto, color = new THREE.Color(0.3, 0.9, 1.6)) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: color.clone(), toneMapped: false, transparent: true, opacity: 0.55, depthWrite: false });
  const cubo = new THREE.Mesh(cajaRedonda(0.5, 0.5, 0.5, 0.08, 0.03), mat); g.add(cubo);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d'); x.font = '700 64px Oxanium, "Segoe UI", monospace'; x.textAlign = 'center';
  x.shadowColor = 'rgba(61,200,255,.9)'; x.shadowBlur = 10; x.fillStyle = '#eafaff'; x.fillText(texto, 128, 86);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  rotulo.position.z = 0.27; g.add(rotulo);
  return { grupo: g, mat, rotulo };
}

export default {
  nombre: 'El MES y el ERP',
  dura: 20.3 + PAUSA,
  sombra: false,                                   // (el mundo digital: luz, sin sombras)
  quieto: [[2.6, 4.8], [5.6, 7.6], [10.4, PARA + PAUSA]],     // en las estaciones
  montar({ escena, cam, electron, grupo, velo, habla }) {
    grupo.add(new THREE.HemisphereLight(0xdde8ff, 0x0b0d10, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(-4, 12, 14); grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x3d9bff, 1.2); contra.position.set(9, 4, -6); grupo.add(contra);
    const aditivo = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

    grupo.add(new THREE.GridHelper(220, 110, 0x1a6fa8, 0x0d2a40));

    // ------------------------------------------------------------ el MES: la nave, el rótulo y las estaciones
    const nave = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(12, 7, 34)), new THREE.LineBasicMaterial({ color: 0x3dc8ff, transparent: true, opacity: 0.45, toneMapped: false }));
    nave.position.set(0, 6.5, 45); grupo.add(nave);
    const rotuloMES = cartel([
      { txt: 'MES', col: '#9fe8ff', y: 250, size: 260, x: 512, alinea: 'center' },
      { txt: L('gestión de la producción'), col: '#7fb8d8', y: 340, size: 62, x: 512, alinea: 'center' },
    ], 7, 2.6, { fondo: 'rgba(0,0,0,0)', borde: 'rgba(0,0,0,0)' });
    rotuloMES.malla.position.set(0, 12.0, 61); rotuloMES.malla.rotation.y = 0.25; grupo.add(rotuloMES.malla);
    const estaciones = [[Z_AGR, `1 · ${L('AGRUPAR')}`], [Z_MED, `2 · ${L('MEDIA')}`], [Z_FIL, `3 · ${L('FILTRAR')}  T > ${L('MEDIA')} + ${MARGEN} °C`], [Z_EVT, `4 · ${L('EVENTOS')}`]].map(([z, txt], i) => {
      const aro = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.045, 8, 96), aditivo(new THREE.Color(0.3, 1.0, 1.7), 0.5));
      aro.position.set(0, Y, z); grupo.add(aro);
      const r = cartel([{ txt, col: '#c8f0ff', y: 150, size: i === 2 ? 74 : 96, ancho: 960 }], 4.2, 0.8, { fondo: 'rgba(6,24,40,.7)', borde: '#3dc8ff' });
      r.malla.position.set(0, Y - 3.35, z); r.malla.rotation.y = 0.55; grupo.add(r.malla);   // debajo del aro: encima va el marcador de la media
      return { aro, rotulo: r.malla };
    });
    // la membrana del filtro: una rejilla de luz que cruza la nave
    const cm = document.createElement('canvas'); cm.width = cm.height = 256;
    const gm = cm.getContext('2d'); gm.strokeStyle = 'rgba(120,220,255,.9)'; gm.lineWidth = 3;
    for (let k = 0; k <= 256; k += 32) { gm.beginPath(); gm.moveTo(k, 0); gm.lineTo(k, 256); gm.moveTo(0, k); gm.lineTo(256, k); gm.stroke(); }
    const texM = new THREE.CanvasTexture(cm); texM.wrapS = texM.wrapT = THREE.RepeatWrapping; texM.repeat.set(3, 3);
    const membranaM = new THREE.MeshBasicMaterial({ map: texM, color: new THREE.Color(0.4, 1.0, 1.6), transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const membrana = new THREE.Mesh(new THREE.CircleGeometry(2.55, 64), membranaM); membrana.position.set(0, Y, Z_FIL); grupo.add(membrana);

    // el centro del lote (Blinky va en el centro; los demás, en un anillo a su alrededor)
    const zLote = porTramos([
      { t0: 0, t1: 2.6, curva: new THREE.LineCurve3(V(0, 0, 70), V(0, 0, Z_AGR)), ease: easeOut },
      { t0: 4.8, t1: 5.6, curva: new THREE.LineCurve3(V(0, 0, Z_AGR), V(0, 0, Z_MED)), ease: smooth },
      { t0: 7.6, t1: 8.4, curva: new THREE.LineCurve3(V(0, 0, Z_MED), V(0, 0, Z_FIL + 1.6)), ease: smooth },
      { t0: 8.8, t1: 9.6, curva: new THREE.LineCurve3(V(0, 0, Z_FIL + 1.6), V(0, 0, Z_FIL - 2)), ease: smooth },
      { t0: 9.6, t1: 10.4, curva: new THREE.LineCurve3(V(0, 0, Z_FIL - 2), V(0, 0, Z_EVT)), ease: smooth },
    ]);
    const centro = (t) => V(0, Y + 0.06 * Math.sin(t * 2.1), zLote(t).z);

    // los otros datos: llegan de lejos, giran a su alrededor, mandan su valor a la media y en el filtro se caen
    const r = rng(47);
    const otros = OTROS.map((v, i) => {
      const d = crearDato(coma(v)); grupo.add(d.grupo);
      const a = (i / OTROS.length) * Math.PI * 2 + 0.6;
      const desde = V(Math.cos(a) * (14 + r() * 8), Y + Math.sin(a) * 6 + 2, Z_AGR + 10 + r() * 14);
      return { ...d, v, desde, llega: 1.6 + 0.15 * i, cae: 8.45 + 0.07 * i, vuelta: r() * 6 };
    });
    const anillo = (i, t) => {
      const a = (i / OTROS.length) * Math.PI * 2 + 0.4 * t;
      return centro(t).add(V(1.8 * Math.cos(a), 1.8 * Math.sin(a), 0));
    };
    const GRIS = new THREE.Color(0.35, 0.38, 0.42), CIAN = new THREE.Color(0.3, 0.9, 1.6);

    // la media: los valores viajan (un punto de luz cada uno) a un marcador encima del lote, que va sacando la media;
    // al final, la media se va al histórico
    const marcador = cartel([], 3.4, 0.9, { fondo: 'rgba(6,24,40,.82)', borde: '#3dc8ff' }); grupo.add(marcador.malla);
    const geoRayos = new THREE.BufferGeometry(); geoRayos.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 2 * 3), 3));
    const rayos = new THREE.LineSegments(geoRayos, new THREE.LineBasicMaterial({ color: 0x3dc8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    rayos.frustumCulled = false; grupo.add(rayos);
    const chispas = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), aditivo(new THREE.Color(0.8, 1.6, 2.2), 1)); grupo.add(m); return m; });
    const VALORES = [...OTROS, SUYO], llegaValor = (k) => 5.7 + 0.2 * k + 0.35;
    const media = crearDato(`x̄ ${coma(VALORES.reduce((a, b) => a + b) / VALORES.length)}`, new THREE.Color(0.9, 1.3, 1.7)); grupo.add(media.grupo);

    // Blinky: de paquete y, desde la estación 4, de alerta
    const paquete = crearPaquete(); grupo.add(paquete.grupo);
    const alerta = crearAlerta(); grupo.add(alerta.grupo);

    // ------------------------------------------------------------ el ERP (la base de datos y su tabla), en morado: el
    // MES es cian y así se ve que es otra capa
    const DB = V(0, 0, -24), MORADO = new THREE.Color(0.85, 0.35, 1.7);
    const vidrioDB = new THREE.MeshStandardMaterial({ color: 0x1d0f33, metalness: 0.3, roughness: 0.2, emissive: 0x3a1466, emissiveIntensity: 0.6, transparent: true, opacity: 0.92 });
    const aros = [];
    for (let k = 0; k < 3; k++) {
      const y = 1.0 + k * 1.75;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.4, 64), vidrioDB); d.position.copy(DB).setY(y); grupo.add(d);
      for (const dy of [-0.7, 0.7]) {
        const a = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.05, 8, 96), new THREE.MeshBasicMaterial({ color: MORADO, toneMapped: false }));
        a.rotation.x = Math.PI / 2; a.position.copy(DB).setY(y + dy); grupo.add(a); aros.push(a);
      }
    }
    const rotuloDB = cartel([{ txt: 'ERP', col: '#dcb8ff', y: 330, size: 300 }], 3.2, 1.3, { fondo: 'rgba(0,0,0,0)', borde: 'rgba(0,0,0,0)' });
    rotuloDB.malla.position.copy(DB).add(V(0, 7.0, 0)); grupo.add(rotuloDB.malla);

    // la tabla: avisos de mantenimiento (al ERP no le llegan lecturas, sino lo que hay que hacer con ellas); los cuatro de
    // antes y el quinto, vacío, es el suyo: la alerta se encaja como aviso nuevo, en rojo
    const FILAS = [['AV-0038', 'Máq. 5', 'Vibración rodamiento', 'media'], ['AV-0039', 'Máq. 1', 'Cambio de herramienta', 'baja'],
      ['AV-0040', 'Máq. 3', 'Fuga de aceite', 'alta'], ['AV-0041', 'Máq. 2', 'Revisión preventiva', 'baja']];
    const yFila = (i) => 230 + i * 80;
    const fila = ([a, b, c, d], y, col, bg) => [
      { txt: L(a), col, y, size: 40, bg }, { txt: L(b), col, y, size: 40, x: 210, ancho: 140 }, { txt: L(c), col, y, size: 40, x: 360, ancho: 440 }, { txt: L(d), col, y, size: 40, x: 992, alinea: 'right', ancho: 180 },
    ];
    const lineas = (nueva) => [
      { txt: L('Avisos de mantenimiento'), col: '#dcb8ff', y: 76, size: 52 },
      ...fila(['aviso', 'equipo', 'motivo', 'prioridad'], 150, '#b9a0dc'),
      ...FILAS.flatMap((f, i) => fila(f, yFila(i), '#e4d8f6')),
      ...(nueva > 0 ? fila(['AV-0042', 'Máq. 2', 'Sobretemp. motor 41,8 °C', 'alta'], yFila(4), '#ffffff', `rgba(255,60,50,${0.2 + 0.4 * nueva})`) : []),
    ];
    const tabla = cartel(lineas(0), 9, 5.4, { fondo: 'rgba(28,10,48,.8)', borde: '#b77bff' }); tabla.malla.position.set(7.5, 4.6, -20); tabla.malla.rotation.y = -0.45; grupo.add(tabla.malla);
    grupo.updateMatrixWorld(true);
    const filaCentro = tabla.malla.localToWorld(V(0, 2.7 - (yFila(4) - 15) / 1024 * 9, 0.05));
    const normalTabla = V(0, 0, 1).applyQuaternion(tabla.malla.quaternion);
    const filaMundo = tabla.malla.localToWorld(V(-0.5, 2.7 - (yFila(4) - 15) / 1024 * 9, 0.05));

    // el carril de luz, de la estación 4 a la base de datos, y otros paquetes que van a ella (del color del ERP)
    const carril = new THREE.CatmullRomCurve3([V(0, Y, Z_EVT), V(0, 6.5, 18), V(1.5, 5.2, 2), V(3.5, 4.8, -10), V(5.6, 4.6, -16)]);
    grupo.add(new THREE.Mesh(new THREE.TubeGeometry(carril, 200, 0.06, 8), aditivo(new THREE.Color(0.65, 0.3, 1.5), 0.55)));
    const entrada = new THREE.LineCurve3(V(0, Y, 74), V(0, Y, Z_AGR));
    grupo.add(new THREE.Mesh(new THREE.TubeGeometry(entrada, 40, 0.06, 8), aditivo(new THREE.Color(0.2, 0.8, 1.5), 0.55)));
    const viajeros = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, ini = V(Math.cos(a) * 40, 3 + (i % 3) * 3, -24 + Math.sin(a) * 40);
      const c = new THREE.CatmullRomCurve3([ini, ini.clone().lerp(DB, 0.5).setY(6 + (i % 2) * 2), DB.clone().setY(4)]);
      grupo.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.03, 6), aditivo(0x6a2fb0, 0.5)));
      const m = new THREE.Mesh(cajaRedonda(0.5, 0.5, 0.5, 0.08, 0.03), new THREE.MeshBasicMaterial({ color: MORADO, toneMapped: false, transparent: true, opacity: 0.8 }));
      grupo.add(m); viajeros.push({ m, c, f: i * 0.37 });
    }
    const aERP = porTramos([
      { t0: SALE, t1: SALE + 4.6, curva: carril, ease: (x) => x },
      { t0: SALE + 4.6, t1: SALE + 6.0, curva: new THREE.LineCurve3(carril.points[4], filaMundo), ease: smooth },
    ]);
    // dónde está Blinky (en tiempo sin pausa)
    const posB = (t) => (t < SALE ? centro(t) : aERP(t));

    // ------------------------------------------------------------ cámara
    const sigueB = (dx, dy, dz) => (t) => posB(t).add(V(dx, dy, dz));
    const LADO = V(6.0, 1.6, 9.5);
    const camara = porClaves([
      { t: 0, pos: sigueB(-1.4, 1.2, 4.2), mira: sigueB(0, 0, -3), fov: 36 },      // como empezaba el mundo digital del plano 8
      { t: 1.2, pos: sigueB(-1.4, 1.2, 4.2), mira: sigueB(0, 0, -3), fov: 36 },
      { t: 2.8, pos: sigueB(LADO.x, LADO.y, LADO.z), mira: sigueB(0, 0.2, 0), fov: 36 },
      { t: 8.4, pos: sigueB(LADO.x - 1.2, LADO.y + 0.5, LADO.z - 0.8), mira: sigueB(0, 0.2, 0), fov: 36 },   // va girando despacio mientras lo procesan
      { t: 9.2, pos: sigueB(6.0, 0.6, 9.0), mira: sigueB(0, -1.0, 0), fov: 36, paso: true },    // para ver caer a los demás
      { t: 10.2, pos: sigueB(3.0, 1.0, 5.0), mira: sigueB(0, 0.1, 0), fov: 34, paso: true },
      { t: PARA, pos: sigueB(1.7, 0.6, 3.4), mira: sigueB(0, 0.1, 0), fov: 34 },     // de cerca mientras habla
      { t: SALE + 0.6, pos: sigueB(-1.4, 1.2, 4.2), mira: sigueB(0, 0, -3), fov: 36, paso: true },
      { t: SALE + 2.6, pos: sigueB(-1.8, 1.4, 4.8), mira: sigueB(0, -0.3, -4), fov: 36, paso: true },
      { t: SALE + 4.4, pos: V(-5, 8.5, 2), mira: V(2.5, 3.6, -19), fov: 36, paso: true },
      { t: SALE + 6.4, pos: V(1.5, 5.6, -7), mira: V(6.6, 4.2, -19.5), fov: 34, paso: true },
      { t: 20.3, pos: filaCentro.clone().addScaledVector(normalTabla, 1.9), mira: filaCentro, fov: 34, llega: 0.3 },   // la fila llena el cuadro; llega en marcha
    ]);

    const FONDO = new THREE.Color(0x020610), p = V();
    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tReal) {
        const t = tr(tReal);
        camara(t, cam);
        electron.visible = false;

        // las estaciones se encienden cuando trabajan; la cuarta, en rojo
        const activa = [bell(t, 2.4, 5.0), bell(t, 5.4, 7.8), bell(t, 8.2, 9.8), bell(t, 10.2, 11.6) + (t >= 11.6 && t < SALE ? 1 : 0)];
        estaciones.forEach(({ aro }, i) => {
          aro.material.opacity = 0.45 + 0.5 * activa[i];
          if (i === 3) aro.material.color.setRGB(lerp(0.3, 2.0, smooth(seg(t, 10.3, 10.8))), lerp(1.0, 0.25, smooth(seg(t, 10.3, 10.8))), lerp(1.7, 0.2, smooth(seg(t, 10.3, 10.8))));
        });
        membranaM.opacity = 0.3 + 0.5 * bell(t, 8.9, 9.5);

        // los otros datos
        otros.forEach((o, i) => {
          const llegar = smoother(seg(t, 0, o.llega));
          p.copy(o.desde).lerp(anillo(i, t), llegar);
          const k = seg(t, o.cae, o.cae + 1.1);                               // rebota en la membrana y cae
          p.y -= 6 * easeIn(k); p.z += 0.5 * easeOut(k);
          o.grupo.position.copy(p);
          o.grupo.quaternion.copy(cam.quaternion);
          o.grupo.rotateZ(k * 2.5 + 0.1 * Math.sin(t + o.vuelta)).rotateX(k * 1.5);
          o.mat.color.copy(CIAN).lerp(GRIS, smooth(seg(t, o.cae, o.cae + 0.3)));
          const alfa = 1 - smooth(seg(k, 0.4, 1));
          o.mat.opacity = 0.55 * alfa + 0.4 * bell(t, llegaValor(i) - 0.5, llegaValor(i) + 0.2); o.rotulo.material.opacity = alfa;
          o.grupo.visible = alfa > 0.01;
        });

        // la media: rayos de cada uno al marcador, y un punto de luz que lleva el valor
        const M = centro(t).add(V(0, 3.0, 0)), verMedia = smooth(seg(t, 5.5, 5.9)) * (1 - smooth(seg(t, 8.2, 8.6)));
        marcador.malla.position.copy(M); marcador.malla.quaternion.copy(cam.quaternion); marcador.malla.material.opacity = verMedia;
        marcador.malla.visible = verMedia > 0.01;
        let n = 0; VALORES.forEach((_, k) => { if (t >= llegaValor(k)) n = k + 1; });
        const parcial = n ? VALORES.slice(0, n).reduce((a, b) => a + b) / n : 0;
        marcador.pintar([{ txt: n ? `${L('MEDIA')}  ${coma(parcial)} °C` : `${L('MEDIA')}  –`, col: n === VALORES.length ? '#ffffff' : '#c8f0ff', y: 175, size: 104 },
          { txt: `${n} / ${VALORES.length} ${L('lecturas')}`, col: '#7fb8d8', y: 245, size: 50 }]);
        const pos = geoRayos.attributes.position;
        VALORES.forEach((_, k) => {
          const de = k < OTROS.length ? otros[k].grupo.position : posB(t);
          pos.setXYZ(2 * k, de.x, de.y, de.z); pos.setXYZ(2 * k + 1, M.x, M.y - 0.4, M.z);
          const u = seg(t, llegaValor(k) - 0.35, llegaValor(k));
          chispas[k].position.copy(de).lerp(M, u); chispas[k].visible = u > 0 && u < 1;
        });
        pos.needsUpdate = true;
        rayos.material.opacity = 0.45 * verMedia * (1 - smooth(seg(t, 7.5, 7.9)));
        const vaHist = seg(t, 7.4, 8.8);
        media.grupo.visible = vaHist > 0 && vaHist < 1;
        media.grupo.position.copy(M).add(V(16 * easeIn(vaHist), 1.5 * vaHist, -3 * vaHist));
        media.grupo.quaternion.copy(cam.quaternion);
        media.grupo.scale.setScalar(easeBack(seg(t, 7.4, 7.7)) * 1.2);

        // Blinky: paquete hasta la estación 4; ahí, alerta
        const cambia = seg(t, 10.8, 11.0), crece = easeBack(seg(t, 10.95, 11.45));
        const salto = 0.3 * bell(tReal, PARA + 0.15, PARA + 0.6);
        const encaja = smoother(seg(t, SALE + 4.6, SALE + 6.0));
        paquete.grupo.visible = cambia < 1;
        paquete.grupo.position.copy(posB(t));
        paquete.grupo.scale.setScalar(Math.max(0.001, 1 - easeIn(cambia)));
        const curioso = bell(t, 2.6, 4.8);
        paquete.actualizar(tReal, cam, { mirada: curioso * 0.9 * Math.sin((t - 2.6) * 2.6), brillo: 0.6 * bell(t, 8.9, 9.5) + 1.2 * smooth(seg(t, 10.4, 10.95)) });
        alerta.grupo.visible = t > 10.95 && encaja < 1;
        alerta.grupo.position.copy(posB(t)).add(V(0, salto, 0));
        alerta.grupo.scale.setScalar(Math.max(0.001, crece * (1 - 0.85 * encaja)));
        const feliz = smooth(seg(tReal, PARA + 0.3, PARA + 0.8));
        alerta.actualizar(tReal, cam, { feliz, brillo: bell(t, 10.95, 11.6) + 0.5 * bell(t, SALE + 5.6, SALE + 6.2),
          giro: 0.35 * Math.sin((tReal - PARA) * 5) * bell(tReal, PARA + 0.1, PARA + 1.3) });
        const quien = tReal < 10.8 ? paquete.grupo : alerta.grupo;            // de paquete, y luego de alerta
        habla(dialogo(tReal, LINEAS), { pos: quien.position, radio: 0.65 * quien.scale.x });

        // el ERP
        viajeros.forEach(({ m, c, f }) => { const k = ((t * 0.18 + f) % 1); m.position.copy(c.getPointAt(k)); });
        aros.forEach((a, i) => { a.material.color.copy(MORADO).multiplyScalar(0.7 + 0.6 * bell(t, SALE + 5.6 + i * 0.05, SALE + 6.8)); });
        tabla.pintar(lineas(t > SALE + 6.0 ? 1 : 0));

        velo(Math.max(0.9 * (1 - smooth(seg(t, 0, 0.4))), 0.55 * bell(t, 10.75, 11.2), 0.6 * smooth(seg(t, 20.05, 20.3))),
          t > 10 && t < 12 ? 0xffd2c8 : t < 5 ? 0xd8f4ff : 0xcfe6ff);   // sale del destello del corte; el cambio a alerta; el corte al 10
      },
    };
  },
};
