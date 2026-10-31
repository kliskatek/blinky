// La sala del plano 10, en metros (el plano la escala): una mesa con su monitor y su teclado, y una persona sentada,
// hecha como el muñeco de un icono en 3D (cuerpo de una pieza, cabeza aparte, sin piernas ni manos; ojos y sonrisa
// como los de Blinky), con una gorra con el logo de Kliskatek.
// crearMonitor() devuelve el panel de mando dibujado en un canvas: dibujar({ nuevo }) lo repinta con el dato nuevo
// (0 aún no ha llegado, 1 recién llegado) y enPantalla(x, y) da el punto (local del monitor) de un píxel del canvas.
// crearPersona() devuelve la cabeza (para asentir), la sonrisa y el logo de la gorra.

import * as THREE from 'three';
import { crearLogo } from './logo.js';
import { L } from '../idioma.js';
import { cajaBisel } from '../utiles.js';

const V3 = THREE.Vector3;
const mat = (color, metal = 0.1, rug = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug, ...o });

// ------------------------------------------------------------------ el monitor y su panel de mando
const PW = 1600, PH = 928, SW = 0.62, SH = 0.36;
export const TARJETA_T = [220, 260];                               // el centro de la tarjeta de temperatura, en el canvas

function rect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

export function crearMonitor() {
  const g = new THREE.Group();
  const marco = new THREE.Mesh(cajaBisel(SW + 0.03, SH + 0.03, 0.03, 0.004), mat(0x14171b, 0.3, 0.5)); g.add(marco);
  const cuello = new THREE.Mesh(cajaBisel(0.05, 0.3, 0.03, 0.003), mat(0x2a2f35, 0.5, 0.4)); cuello.position.set(0, -0.3, -0.03); g.add(cuello);
  const pie = new THREE.Mesh(cajaBisel(0.26, 0.012, 0.18, 0.003), mat(0x2a2f35, 0.5, 0.4)); pie.position.set(0, -0.36 - 0.0, 0.0); g.add(pie);
  const c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  pantalla.position.z = 0.0155; g.add(pantalla);

  const VIEJOS = [39.6, 40.1, 40.4, 41.0];
  let ultimo = -1;
  const dibujar = ({ nuevo = 0 }) => {
    const q = Math.round(nuevo * 20) / 20; if (q === ultimo) return; ultimo = q;
    const x = c.getContext('2d');
    x.fillStyle = '#0a111d'; x.fillRect(0, 0, PW, PH);
    // cabecera
    x.fillStyle = '#101a2a'; x.fillRect(0, 0, PW, 96);
    x.font = '600 44px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = '#d7e3ee'; x.fillText(L('Línea 3 · Máquina 2'), 40, 62);
    x.fillStyle = '#7f93a8'; x.textAlign = 'right'; x.fillText(q > 0 ? '12:44:07' : '12:44:06', PW - 40, 62); x.textAlign = 'left';
    if (q > 0) {                                                        // la alerta que acaba de llegar, también en la cabecera
      rect(x, PW - 560, 22, 300, 54, 27); x.fillStyle = `rgba(232,38,43,${0.4 + 0.6 * q})`; x.fill();
      x.font = '600 32px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = '#ffffff'; x.textAlign = 'center';
      x.fillText(L('1 alerta activa'), PW - 410, 60); x.textAlign = 'left';
    }
    // tarjetas
    const tarjeta = (i, titulo, valor, color, extra) => {
      const tx = 40 + i * 385, ty = 140;
      rect(x, tx, ty, 360, 240, 18); x.fillStyle = '#111c2d'; x.fill();
      x.lineWidth = 4; x.strokeStyle = i === 0 && q > 0 ? `rgba(255,70,60,${0.35 + 0.65 * q})` : '#1f3550'; x.stroke();
      x.font = '500 30px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = '#8fa4b8'; x.fillText(L(titulo), tx + 24, ty + 50);
      x.font = '700 82px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = color; x.fillText(L(valor), tx + 24, ty + 150);
      if (extra) { x.font = '500 26px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = i === 0 && q > 0 ? '#ff6a5a' : '#6f86a0'; x.fillText(L(extra), tx + 24, ty + 205); }
      if (i === 0 && q > 0) {                                           // la alerta del MES: su triángulo, a la derecha del valor
        const cx = tx + 328, cy = ty + 124, s = 20 + 4 * q;
        x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 1.1, cy + s * 0.8); x.lineTo(cx - s * 1.1, cy + s * 0.8); x.closePath();
        x.fillStyle = '#e8262b'; x.fill();
        x.fillStyle = '#ffffff'; x.fillRect(cx - 3, cy - s * 0.45, 6, s * 0.75); x.fillRect(cx - 3, cy + s * 0.42, 6, 6);
      }
    };
    tarjeta(0, 'Temperatura motor', q > 0 ? '41.8 °C' : '41.0 °C', q > 0 ? '#ff5a4a' : '#c9d6e2', q > 0 ? 'ALERTA · T > 41,5 °C' : 'SID-0041 · hace 1 min');
    tarjeta(1, 'Presión', '2.41 bar', '#c9d6e2', 'transmisor 4-20 mA');
    tarjeta(2, 'Presencia de pieza', 'Sí', '#c9d6e2', 'sensor inductivo');
    tarjeta(3, 'Nivel', '63 %', '#c9d6e2', 'IO-Link');
    // la tendencia de la temperatura, con el punto nuevo
    const gx = 40, gy = 430, gw = 960, gh = 380;
    rect(x, gx, gy, gw, gh, 18); x.fillStyle = '#0e1726'; x.fill();
    x.font = '500 30px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = '#8fa4b8'; x.fillText(L('Temperatura motor (°C) · últimas lecturas'), gx + 24, gy + 48);
    const vals = q > 0 ? [...VIEJOS, 41.8] : VIEJOS;
    const px = (i) => gx + 70 + i * 200, py = (v) => gy + gh - 60 - (v - 39) / 3.5 * (gh - 150);
    x.strokeStyle = '#1f3550'; x.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const y = gy + 100 + k * 75; x.beginPath(); x.moveTo(gx + 50, y); x.lineTo(gx + gw - 30, y); x.stroke(); }
    // el umbral de la alerta (el del filtro del MES)
    x.strokeStyle = 'rgba(255,80,70,.7)'; x.lineWidth = 3; x.setLineDash([14, 10]); x.beginPath();
    x.moveTo(gx + 50, py(41.5)); x.lineTo(gx + gw - 30, py(41.5)); x.stroke(); x.setLineDash([]);
    x.font = '500 24px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = 'rgba(255,110,100,.9)'; x.textAlign = 'left';
    x.fillText(L('umbral 41,5'), gx + 70, py(41.5) - 10);
    x.strokeStyle = '#3dc8ff'; x.lineWidth = 6; x.beginPath();
    vals.forEach((v, i) => (i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v)))); x.stroke();
    vals.forEach((v, i) => {
      const esNuevo = i === 4;
      x.fillStyle = esNuevo ? '#ff4a3d' : '#3dc8ff';
      x.beginPath(); x.arc(px(i), py(v), esNuevo ? 10 + 14 * q : 9, 0, Math.PI * 2); x.fill();
    });
    // los últimos registros (los del MES)
    const lx = 1030, ly = 430, lw = 530;
    rect(x, lx, ly, lw, gh, 18); x.fillStyle = '#0e1726'; x.fill();
    x.font = '500 30px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = '#8fa4b8'; x.fillText(L('Registros'), lx + 24, ly + 48);
    const filas = [['SID-0042', '41.8', q > 0], ['SID-0041', '41.0'], ['SID-0040', '40.4'], ['SID-0039', '40.1'], ['SID-0038', '39.6']].filter((f, i) => q > 0 || i > 0);
    filas.forEach(([tag, v, nuevo], i) => {
      const y = ly + 100 + i * 56;
      if (nuevo) { x.fillStyle = `rgba(255,60,50,${0.15 + 0.35 * q})`; x.fillRect(lx + 12, y - 42, lw - 24, 58); }
      x.font = '600 34px Oxanium, "Segoe UI", monospace'; x.fillStyle = nuevo ? '#ffffff' : '#c9d6e2';
      x.fillText(`${tag}   ${v} °C`, lx + 28, y);
    });
    // abajo, lo que ha hecho el ERP con la alerta: el aviso de mantenimiento (en morado, el color del ERP en el plano 9)
    const ay = 832, ah = 72;
    rect(x, 40, ay, PW - 80, ah, 16); x.fillStyle = q > 0 ? `rgba(120,50,200,${0.25 + 0.45 * q})` : '#0e1726'; x.fill();
    if (q > 0) { x.lineWidth = 3; x.strokeStyle = `rgba(190,130,255,${0.4 + 0.6 * q})`; x.stroke(); }
    x.font = '700 30px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = q > 0 ? '#e6d2ff' : '#6f86a0'; x.fillText('ERP', 66, ay + 47);
    x.font = '500 30px Oxanium, "Segoe UI", sans-serif'; x.fillStyle = q > 0 ? '#ffffff' : '#6f86a0';
    x.fillText(L(q > 0 ? 'Aviso de mantenimiento AV-0042 creado · sobretemperatura del motor'
      : 'Sin avisos de mantenimiento abiertos para esta máquina'), 150, ay + 47);
    tex.needsUpdate = true;
  };
  dibujar({ nuevo: 0 });
  const enPantalla = (px, py) => new V3((px / PW - 0.5) * SW, (0.5 - py / PH) * SH, 0.017);
  return { grupo: g, dibujar, enPantalla, pantalla };
}

// ------------------------------------------------------------------ la persona
// Sentada mirando a −z (al monitor). Origen en el suelo, bajo la silla.
const cilindro = (a, b, r, m) => {
  const d = b.clone().sub(a), o = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, d.length() - 2 * r), 12, 28), m);
  o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return o;
};

export function crearPersona() {
  const g = new THREE.Group();
  // dos colores y nada más: cuerpo azul de Kliskatek, cabeza clara; gorra marino
  const cuerpoM = mat(0x1f5fa8, 0.0, 0.55), cabezaM = mat(0xf1e6da, 0.0, 0.5), gorraM = mat(0x16263c, 0.0, 0.6);
  // la silla, sencilla
  const silla = mat(0x23272d, 0.2, 0.6);
  const asiento = new THREE.Mesh(cajaBisel(0.46, 0.06, 0.44, 0.015), silla); asiento.position.set(0, 0.47, 0.02); g.add(asiento);
  const respaldo = new THREE.Mesh(cajaBisel(0.44, 0.5, 0.05, 0.015), silla); respaldo.position.set(0, 0.8, 0.24); respaldo.rotation.x = -0.12; g.add(respaldo);
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 32), mat(0x9aa0a6, 0.7, 0.3)); columna.position.set(0, 0.24, 0.02); g.add(columna);
  // el cuerpo: una pieza de torno, de hombros redondos, como el muñeco de un icono; sin piernas
  const perfil = new THREE.SplineCurve([[0, 1.13], [0.1, 1.125], [0.175, 1.1], [0.208, 1.04], [0.212, 0.92], [0.198, 0.7], [0.19, 0.52], [0.0, 0.5]]
    .map(([x, y]) => new THREE.Vector2(x, y))).getPoints(40);
  perfil[0].x = 0; perfil[perfil.length - 1].x = 0;
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 96), cuerpoM); cuerpo.scale.z = 0.78; cuerpo.position.z = 0.02; g.add(cuerpo);
  // los brazos, dos cápsulas hasta el teclado, sin manos
  for (const s of [-1, 1]) g.add(cilindro(new V3(s * 0.19, 1.0, 0.0), new V3(s * 0.13, 0.8, -0.45), 0.052, cuerpoM));
  // la cabeza, separada del cuerpo como en un icono (gira sobre su base, para asentir): ojos y sonrisa como los de
  // Blinky, y la gorra con su visera y el logo
  const cabeza = new THREE.Group(); cabeza.position.set(0, 1.18, -0.04); g.add(cabeza);
  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.11, 80, 56), cabezaM); craneo.position.set(0, 0.15, 0); cabeza.add(craneo);
  const negro = new THREE.MeshBasicMaterial({ color: 0x0a0d14 }), blanco = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ojos = [-1, 1].map((s) => {
    const o = new THREE.Mesh(new THREE.CircleGeometry(1, 64).scale(0.014, 0.021, 1), negro);
    const brillo = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 24), blanco); brillo.position.set(0.004, 0.007, 0.0005); o.add(brillo);
    // por debajo del borde de la gorra, pegados a la esfera (cada uno girado como su normal)
    o.position.set(s * 0.0372, 0.1349, -0.1031); o.rotation.set(-0.14, Math.PI + s * 0.34, 0); cabeza.add(o); return o;
  });
  const sonrisa = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 16, 48, Math.PI), negro);
  sonrisa.rotation.set(-0.42, Math.PI, Math.PI); sonrisa.position.set(0, 0.1056, -0.0984);   // (a ras de la esfera: más fuera, de perfil asomaban) cabeza.add(sonrisa);
  const corona = new THREE.Mesh(new THREE.SphereGeometry(0.117, 80, 32, 0, Math.PI * 2, 0, Math.PI * 0.52), gorraM);
  corona.position.set(0, 0.17, 0.0); cabeza.add(corona);
  const boton = new THREE.Mesh(new THREE.SphereGeometry(0.012, 24, 16), gorraM); boton.position.set(0, 0.287, 0); cabeza.add(boton);
  const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 64, 1, false, -Math.PI / 2, Math.PI), gorraM);
  visera.scale.set(1, 1, 1.15); visera.position.set(0, 0.185, -0.07); visera.rotation.set(-0.12, Math.PI, 0); cabeza.add(visera);
  // el logo de la gorra: 7 cm de ancho, en la frente de la corona, mirando a −z
  const logo = crearLogo(0.07 / 17.3, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2, curveSegments: 1 });
  logo.position.set(0, 0.235, -0.1); logo.rotation.set(0.42, Math.PI, 0); cabeza.add(logo);   // inclinado como la corona
  return { grupo: g, cabeza, sonrisa, ojos, logo };
}
