// La sala del plano 10, en metros (el plano la escala): una mesa con su monitor y su teclado, y una persona sentada,
// un operario de dibujos animados en 3D (barba, peto y gorra con el logo de Kliskatek).
// crearMonitor() devuelve el panel de mando dibujado en un canvas: dibujar({ nuevo }) lo repinta con el dato nuevo
// (0 aún no ha llegado, 1 recién llegado) y enPantalla(x, y) da el punto (local del monitor) de un píxel del canvas.
// crearPersona() devuelve la cabeza (para asentir), sonreir(k) y parpadear(k), el rubor y el logo de la gorra.

import * as THREE from 'three';
import { crearLogo } from './logo.js';
import { L } from '../idioma.js';
import { cajaBisel } from '../utiles.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

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
// Sentada mirando a −z (al monitor). Origen en el suelo, bajo la silla. Un operario de dibujos animados en 3D: cabeza
// grande, nariz de bola, barba y bigote, ojos con párpados, boca abierta con dientes; camisa azul de Kliskatek y peto
// naranja (los dos colores del logo) con su bolsillo, tirantes y costuras; manos con dedos, botas, y la gorra con el
// logo, que es la que hereda el plano 11. Una silla con ruedas.
const cilindro = (a, b, r, m) => {
  const d = b.clone().sub(a), o = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, d.length() - 2 * r), 12, 28), m);
  o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return o;
};
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ruido de valor en 3D, suave: los rizos del pelo y de la barba
function ruido3(x, y, z) {
  const h = (i, j, k) => { let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1440662683)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), s = (t) => t * t * (3 - 2 * t), l = (a, b, t) => a + (b - a) * t;
  const u = s(x - X), v = s(y - Y), w = s(z - Z);
  return l(l(l(h(X, Y, Z), h(X + 1, Y, Z), u), l(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), u), v),
    l(l(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), u), l(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), u), v), w);
}
const rizo = (p, f) => 0.78 * ruido3(p.x * f, p.y * f, p.z * f) + 0.22 * ruido3(p.x * f * 2.3 + 7.1, p.y * f * 2.3 + 3.3, p.z * f * 2.3);

// pelo: abulta cada vértice por su normal (amp × ruido, y × la máscara) y lo oscurece en los huecos (colores de vértice)
function peludo(geom, amp, f, mascara = () => 1) {
  geom.deleteAttribute('uv'); geom.deleteAttribute('normal'); geom = mergeVertices(geom); geom.computeVertexNormals();
  const p = geom.attributes.position, n = geom.attributes.normal, v = new V3(), m = new V3(), col = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); m.fromBufferAttribute(n, i);
    const r = rizo(v, f), k = mascara(v);
    p.setXYZ(i, ...v.addScaledVector(m, amp * (r - 0.35) * k).toArray());
    const c = 0.74 + 0.42 * r; col.push(c, c, c);
  }
  geom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geom.computeVertexNormals(); return geom;
}

// una cinta de ancho w y grueso t a lo largo de pts, tumbada sobre la superficie de normales nor (los tirantes)
function cinta(pts, nor, w, t, m) {
  const pos = [], idx = [];
  pts.forEach((p, i) => {
    const tg = pts[Math.min(i + 1, pts.length - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize();
    const b = tg.cross(nor[i]).normalize().multiplyScalar(w / 2), n = nor[i].clone().multiplyScalar(t);
    for (const q of [p.clone().sub(b), p.clone().add(b), p.clone().add(b).add(n), p.clone().sub(b).add(n)]) pos.push(q.x, q.y, q.z);
  });
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 4; k++) {
    const a = i * 4 + k, b = i * 4 + (k + 1) % 4; idx.push(a, b, b + 4, a, b + 4, a + 4);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}

// LatheGeometry quiere el perfil de abajo arriba (al revés, sus caras y sus normales miran hacia dentro); los perfiles
// de aquí se escriben de arriba abajo
const deAbajo = (pts) => [...pts].reverse();

// la orientación de algo apoyado en una superficie de normal n: x horizontal, z = n
const sobre = (o, p, n) => { const x = new V3(0, 1, 0).cross(n).normalize(), y = n.clone().cross(x); o.position.copy(p); o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, n)); return o; };

// los dientes: blancos, con las separaciones apenas marcadas
function texturaDientes() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, 512, 64);
  const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(120,90,70,.35)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
  g.strokeStyle = 'rgba(150,135,120,.55)'; g.lineWidth = 3;
  for (let i = 1; i < 8; i++) { const x = 512 * (i / 8) + 6 * Math.sin(i * 2.1); g.beginPath(); g.moveTo(x, 6); g.lineTo(x + (i - 4) * 1.5, 60); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t;
}

export function crearPersona() {
  const g = new THREE.Group();
  // los colores: camisa azul de Kliskatek, peto naranja, piel, barba castaña; gorra marino (para que el logo se lea)
  const camisaM = mat(0x1f5fa8, 0.0, 0.78), camisa2M = mat(0x184d8a, 0.0, 0.8), petoM = mat(0xf08a24, 0.0, 0.8);
  const petoD = mat(0xf08a24, 0.0, 0.8, { side: THREE.DoubleSide }), costuraM = mat(0xffdca8, 0.0, 0.7), metalM = mat(0xc9ccd0, 0.85, 0.3);
  const pielM = mat(0xf2c19c, 0.0, 0.52), pielD = mat(0xf2c19c, 0.0, 0.52, { side: THREE.DoubleSide }), labioM = mat(0x5e2a22, 0.0, 0.6);
  const barbaM = mat(0x7a4a2c, 0.0, 0.92, { vertexColors: true }), barba1M = mat(0x6a4027, 0.0, 0.92);
  const gorraM = mat(0x16263c, 0.0, 0.6), gorra2M = mat(0x0f1b2c, 0.0, 0.7), botaM = mat(0x4a3022, 0.0, 0.5), suelaM = mat(0x1c1a18, 0.0, 0.85);
  // la silla, sencilla
  const silla = mat(0x23272d, 0.2, 0.6);
  const asiento = new THREE.Mesh(cajaBisel(0.46, 0.06, 0.44, 0.015), silla); asiento.position.set(0, 0.47, 0.02); g.add(asiento);
  const respaldo = new THREE.Mesh(cajaBisel(0.44, 0.5, 0.05, 0.015), silla); respaldo.position.set(0, 0.8, 0.26); respaldo.rotation.x = -0.12; g.add(respaldo);
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 32), mat(0x9aa0a6, 0.7, 0.3)); columna.position.set(0, 0.24, 0.02); g.add(columna);
  // su base de cinco patas, con ruedas
  const metal = mat(0x9aa0a6, 0.7, 0.3), rueda = mat(0x15171a, 0.1, 0.5);
  for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5 + 0.3, fin = new V3(0.27 * Math.cos(a), 0.05, 0.02 + 0.27 * Math.sin(a));
    g.add(cilindro(new V3(0, 0.07, 0.02), fin, 0.018, metal));
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.026, 24, 16), rueda); r.position.copy(fin).setY(0.026); g.add(r);
  }

  // ---- el cuerpo: una pieza de torno con forma de pera (hombros redondos, barriga), aplastada de delante a atrás
  const PERFIL = new THREE.SplineCurve([[0, 1.125], [0.09, 1.12], [0.165, 1.095], [0.2, 1.04], [0.207, 0.95], [0.212, 0.84], [0.222, 0.72], [0.222, 0.62], [0.208, 0.54], [0.16, 0.5], [0, 0.495]]
    .map(([x, y]) => new THREE.Vector2(x, y))).getPoints(80);
  PERFIL[0].x = 0; PERFIL[PERFIL.length - 1].x = 0;
  const FZ = 0.78, Z0 = 0.02;
  const radio = (y) => { for (let i = 1; i < PERFIL.length; i++) { const a = PERFIL[i - 1], b = PERFIL[i]; if ((y - a.y) * (y - b.y) <= 0 && a.y !== b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y); } return 0; };
  // un punto de la superficie (a la distancia d por fuera) y su normal; phi = π es el frente
  const sup = (phi, y, d = 0) => new V3(Math.sin(phi) * (radio(y) + d), y, Z0 + Math.cos(phi) * (radio(y) + d) * FZ);
  const normal = (phi, y) => {
    const a = sup(phi + 0.01, y).sub(sup(phi - 0.01, y)), b = sup(phi, y + 0.005).sub(sup(phi, y - 0.005));
    const n = b.cross(a).normalize(); return n.dot(sup(phi, y).sub(new V3(0, y, Z0))) < 0 ? n.negate() : n;
  };
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(deAbajo(PERFIL), 128), camisaM); cuerpo.scale.z = FZ; cuerpo.position.z = Z0; g.add(cuerpo);
  // una pieza del torno entre y0 e y1, d por fuera, de phi0 a phi1 (el peto, la cintura, la espalda)
  const torno = (y0, y1, d, phi0, dphi, m, cerrar = false) => {
    const pts = []; for (let i = 0; i <= 40; i++) { const y = y1 + (y0 - y1) * i / 40; pts.push(new THREE.Vector2(radio(y) + d, y)); }
    if (cerrar) { pts.unshift(new THREE.Vector2(radio(y1), y1)); pts.push(new THREE.Vector2(0, y0)); }
    const o = new THREE.Mesh(new THREE.LatheGeometry(deAbajo(pts), 128, phi0, dphi), m); o.scale.z = FZ; o.position.z = Z0; g.add(o); return o;
  };
  // el cuello de la camisa
  const cuelloC = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.016, 16, 72), camisa2M); cuelloC.rotation.x = Math.PI / 2; cuelloC.position.set(0, 1.124, -0.01); g.add(cuelloC);
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.05, 40), pielM);   // (fino: por detrás lo tapa el pelo de la nuca) cuello.position.set(0, 1.13, -0.015); g.add(cuello);

  // ---- el peto: la cintura (alrededor), el babero (delante, hasta el pecho) y la trasera; con sus dobladillos
  const D = 0.007, YC = 0.8, YB = 1.0, PB = 0.6, YT = 0.86, PT = 0.5;
  torno(0.495, YC, D, 0, Math.PI * 2, petoM, true);
  torno(YC - 0.01, YB, D, Math.PI - PB, 2 * PB, petoD);
  torno(YC - 0.01, YT, D, -PT, 2 * PT, petoD);
  const borde = (pts, r = 0.0038, m = petoM) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 10), m));
  const linea = (phi0, phi1, y0, y1, d, n = 40) => Array.from({ length: n + 1 }, (_, i) => sup(phi0 + (phi1 - phi0) * i / n, y0 + (y1 - y0) * i / n, d));
  borde([...linea(Math.PI - PB, Math.PI - PB, YC, YB, D, 12), ...linea(Math.PI - PB, Math.PI + PB, YB, YB, D).slice(1), ...linea(Math.PI + PB, Math.PI + PB, YB, YC, D, 12).slice(1)]);
  borde([...linea(-PT, -PT, YC, YT, D, 8), ...linea(-PT, PT, YT, YT, D, 30).slice(1), ...linea(PT, PT, YT, YC, D, 8).slice(1)]);
  borde(linea(0, Math.PI * 2, YC, YC, D + 0.001, 128), 0.0055);                                      // la cinturilla
  // las costuras: pespuntes claros, a 9 mm de los bordes
  const puntadas = [];
  const pespunte = (pts, nor) => {
    for (let i = 0, l = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], tg = b.clone().sub(a), L = tg.length(); tg.normalize();
      for (; l < L; l += 0.0095) {
        const p = a.clone().addScaledVector(tg, l), n = nor(p), y = n.clone().cross(tg).normalize(), x = y.clone().cross(n);
        puntadas.push(new THREE.Matrix4().makeBasis(x, y, n).setPosition(p));
      }
      l -= L;
    }
  };
  const nCuerpo = (p) => normal(Math.atan2(p.x, (p.z - Z0) / FZ), p.y);
  const E = 0.009 / 0.21;
  pespunte([...linea(Math.PI - PB + E, Math.PI - PB + E, YC + 0.012, YB - 0.009, D + 0.0012, 12), ...linea(Math.PI - PB + E, Math.PI + PB - E, YB - 0.009, YB - 0.009, D + 0.0012).slice(1), ...linea(Math.PI + PB - E, Math.PI + PB - E, YB - 0.009, YC + 0.012, D + 0.0012, 12).slice(1)], nCuerpo);
  pespunte(linea(0, Math.PI * 2, YC - 0.012, YC - 0.012, D + 0.0012, 160), nCuerpo);
  // el bolsillo del babero, curvado como el pecho, con su pespunte y un logo bordado
  const bolsillo = sobre(new THREE.Group(), sup(Math.PI, 0.89, D + 0.0005), normal(Math.PI, 0.89)); g.add(bolsillo);
  const RC = 0.26, curva = (geo) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) ** 2 / (2 * RC)); geo.computeVertexNormals(); return geo; };
  const BW = 0.1, BH = 0.075;
  const tapa = new THREE.Mesh(curva(new RoundedBoxGeometry(BW, BH, 0.005, 3, 0.0024)), petoM); tapa.position.z = 0.0025; bolsillo.add(tapa);
  const pB = [[-1, 1], [-1, -1], [1, -1], [1, 1]].map(([sx, sy]) => new V3(sx * (BW / 2 - 0.007), sy * (BH / 2 - 0.007), 0));
  const enBolsillo = pB.map((p) => p.setZ(0.0055 - p.x ** 2 / (2 * RC)));
  const mB = new THREE.Matrix4().compose(bolsillo.position, bolsillo.quaternion, new V3(1, 1, 1));
  for (let i = 0; i < 3; i++) {
    const a = enBolsillo[i], b = enBolsillo[i + 1], tg = b.clone().sub(a), L = tg.length(); tg.normalize();
    for (let l = 0.003; l < L; l += 0.0095) {
      const p = a.clone().addScaledVector(tg, l), n = new V3(0, 0, 1), y = n.clone().cross(tg).normalize();
      puntadas.push(new THREE.Matrix4().makeBasis(y.clone().cross(n), y, n).setPosition(p.setZ(0.0055 - p.x ** 2 / (2 * RC))).premultiply(mB));
    }
  }
  const logoB = crearLogo(0.05 / 17.3, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 2 });
  logoB.position.set(0, 0.004, 0.0052); bolsillo.add(logoB);
  const hilo = new THREE.InstancedMesh(new RoundedBoxGeometry(0.0058, 0.0014, 0.0016, 1, 0.0006), costuraM, puntadas.length);
  puntadas.forEach((m, i) => hilo.setMatrixAt(i, m)); g.add(hilo);

  // los tirantes: de las esquinas del babero, por encima de los hombros, a la trasera (en el plano x = ±XT, sobre el
  // cuerpo: se busca la superficie con un rayo desde dentro hacia fuera)
  cuerpo.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), nm = new THREE.Matrix3().getNormalMatrix(cuerpo.matrixWorld), XT = 0.1;
  for (const s of [-1, 1]) {
    const pts = [], nor = [];
    for (let a = 0.2; a < Math.PI + 1.0; a += 0.015) {
      const dir = new V3(0, Math.sin(a), -Math.cos(a)), o = new V3(s * XT, 0.93, Z0).addScaledVector(dir, 0.6);
      ray.set(o, dir.clone().negate()); const hit = ray.intersectObject(cuerpo, false)[0];
      if (!hit) continue;
      const delante = a < Math.PI / 2;
      if (delante ? hit.point.y < YB - 0.012 : hit.point.y < YT - 0.012) continue;
      const n = hit.face.normal.clone().applyMatrix3(nm).normalize();
      pts.push(hit.point.addScaledVector(n, D + 0.001)); nor.push(n);
    }
    g.add(cinta(pts, nor, 0.032, 0.003, petoD));
    // el botón de la hebilla, delante; y la hebilla, un marco de metal
    const p0 = pts[0], n0 = nor[0];
    const hebilla = sobre(new THREE.Group(), p0.clone().addScaledVector(n0, 0.003), n0); g.add(hebilla);
    const marco = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.03, 0.004, 2, 0.0015), metalM); hebilla.add(marco);
    const hueco = new THREE.Mesh(new RoundedBoxGeometry(0.028, 0.016, 0.005, 2, 0.0015), petoM); hueco.position.set(0, 0.002, 0.0006); hebilla.add(hueco);
    const boton = sobre(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 32).rotateX(Math.PI / 2), metalM), sup(Math.PI - s * (PB + 0.06), YC + 0.035, D + 0.002), normal(Math.PI - s * (PB + 0.06), YC + 0.035));
    g.add(boton);
  }
  // el logo de Kliskatek a la espalda, sobre la camisa, entre los tirantes (lo que se ve en los planos de detrás)
  const espalda = crearLogo(0.12 / 17.3, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2, curveSegments: 1 });
  espalda.position.copy(sup(0, 0.95, 0.002)); espalda.rotation.x = 0.06; g.add(espalda);

  // ---- los brazos: mangas largas, con el codo doblado; las manos sobre el teclado, con sus dedos
  for (const s of [-1, 1]) {
    const hombro = new V3(s * 0.175, 1.01, 0.0), codo = new V3(s * 0.235, 0.84, -0.2), muneca = new V3(s * 0.15, 0.805, -0.43);
    g.add(cilindro(hombro, codo, 0.058, camisaM)); g.add(cilindro(codo, muneca, 0.052, camisaM));
    const brazo = muneca.clone().sub(codo).normalize();
    const puno = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.01, 14, 48), camisa2M);
    puno.position.copy(muneca).addScaledVector(brazo, -0.012); puno.quaternion.setFromUnitVectors(new V3(0, 0, 1), brazo); g.add(puno);
    const mano = new THREE.Group(); mano.position.copy(muneca); mano.rotation.y = Math.atan2(-brazo.x, -brazo.z); g.add(mano);
    const palma = new THREE.Mesh(new THREE.SphereGeometry(0.042, 40, 28), pielM); palma.scale.set(1.08, 0.56, 1.1); palma.position.set(0, -0.002, -0.04); mano.add(palma);
    [[-0.026, 0.028], [-0.009, 0.034], [0.009, 0.033], [0.026, 0.026]].forEach(([x, l]) => {
      const k = new V3(x * s, -0.003, -0.074), tip = new V3(x * 1.08 * s, -0.016, -0.074 - l);
      mano.add(cilindro(k, tip, 0.0122, pielM));
    });
    mano.add(cilindro(new V3(-s * 0.035, -0.004, -0.034), new V3(-s * 0.058, -0.012, -0.064), 0.013, pielM));   // el pulgar, por dentro
  }
  // ---- las piernas, sentadas, con el bajo vuelto; y las botas
  for (const s of [-1, 1]) {
    const cadera = new V3(s * 0.1, 0.575, 0.0), rodilla = new V3(s * 0.11, 0.55, -0.36), tobillo = new V3(s * 0.11, 0.15, -0.4);
    g.add(cilindro(cadera, rodilla, 0.075, petoM)); g.add(cilindro(rodilla, tobillo, 0.062, petoM));
    const bajo = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 14, 48), petoM); bajo.rotation.x = Math.PI / 2; bajo.position.set(s * 0.11, 0.15, -0.4); g.add(bajo);
    const bota = new THREE.Group(); bota.position.set(s * 0.11, 0, -0.43); g.add(bota);
    const suela = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.026, 0.25, 3, 0.009), suelaM); suela.position.set(0, 0.013, -0.01); bota.add(suela);
    const cana = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.12, 40), botaM); cana.position.set(0, 0.09, 0.035); bota.add(cana);
    const puntera = new THREE.Mesh(new THREE.SphereGeometry(0.058, 40, 28), botaM); puntera.scale.set(0.98, 0.72, 1.45); puntera.position.set(0, 0.045, -0.035); bota.add(puntera);
  }

  // ---- la cabeza (gira sobre su base, para asentir): esfera de piel de centro C y radio 0,11
  const cabeza = new THREE.Group(); cabeza.position.set(0, 1.105, -0.04); g.add(cabeza);
  const C = new V3(0, 0.15, 0), RC0 = 0.11;
  const dirAE = (az, e) => new V3(Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e));   // az = 0 de frente, e hacia arriba
  const craneo = new THREE.Mesh(new THREE.SphereGeometry(RC0, 96, 64), pielM); craneo.position.copy(C); cabeza.add(craneo);
  const enCabeza = (o, d, r) => { const n = d.clone().normalize(); o.position.copy(C).addScaledVector(n, r); o.lookAt(o.position.clone().add(n)); cabeza.add(o); return o; };
  // las orejas
  for (const s of [-1, 1]) {
    const oreja = enCabeza(new THREE.Mesh(new THREE.SphereGeometry(0.027, 32, 24), pielM), new V3(s, -0.1, 0.05), 0.114); oreja.scale.set(1, 1.2, 0.5);   // (por fuera del pelo)
    const dentro = new THREE.Mesh(new THREE.SphereGeometry(0.015, 24, 16), mat(0xe0a07e, 0, 0.6)); dentro.scale.set(1, 1.3, 0.4); dentro.position.z = 0.009; oreja.add(dentro);
  }
  // la nariz, de bola
  const nariz = enCabeza(new THREE.Mesh(new THREE.SphereGeometry(0.0205, 48, 32), mat(0xefb48e, 0.0, 0.45)), dirAE(0, -0.29), RC0 + 0.003); nariz.scale.set(1.15, 0.95, 0.95);

  // la barba: una cáscara sobre la esfera que, donde hay barba (máscara m: por debajo de los pómulos, de oreja a oreja),
  // sale 22 mm y baja en la barbilla; donde no, queda dentro de la cabeza
  const barba = (d) => {
    const e = Math.asin(d.y), az = Math.atan2(d.x, -d.z), h = Math.hypot(d.x, d.z);
    const tope = -0.42 + 0.22 * sst(0, 1, Math.abs(az) / 1.25);
    const m = sst(0, 0.12, tope - e) * sst(0, 0.3, 1.7 - Math.abs(az));
    const menton = m * Math.max(0, -d.z / (h || 1)) * sst(0.35, 1.1, -e);
    // el pelo, más fino: de detrás de las patillas a la nuca, por detrás de las orejas
    const mp = sst(1.35, 1.6, Math.abs(az)) * sst(0, 0.1, e + 0.15 + 1.25 * sst(1.5, 2.7, Math.abs(az)));
    const k = Math.max(m, mp);
    return { m: k, p: C.clone().addScaledVector(d, 0.106 + 0.022 * m + 0.013 * mp * (1 - m)).add(new V3(0, -0.024 * menton, -0.012 * menton)) };
  };
  {
    const geo = mergeVertices((() => { const s = new THREE.SphereGeometry(1, 512, 256, 0, Math.PI * 2, 0.38 * Math.PI, 0.62 * Math.PI); s.deleteAttribute('uv'); s.deleteAttribute('normal'); return s; })());
    const p = geo.attributes.position, v = new V3(), ms = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) { const b = barba(v.fromBufferAttribute(p, i).normalize()); ms[i] = b.m; p.setXYZ(i, b.p.x, b.p.y, b.p.z); }
    const mascara = (q) => { const b = barba(q.clone().sub(C).normalize()); return b.m; };
    const barbaG = peludo(geo, 0.0038, 150, mascara);
    cabeza.add(new THREE.Mesh(barbaG, barbaM));
  }
  // el pelo bajo la gorra (la nuca y los lados) y las patillas que lo unen con la barba
  {
    for (const s of [-1, 1]) {
      const pat = new THREE.Mesh(peludo(new THREE.SphereGeometry(1, 48, 32).scale(0.014, 0.036, 0.02), 0.0025, 150), barbaM);
      enCabeza(pat, dirAE(s * 1.22, -0.04), RC0 - 0.004);
    }
  }
  // el bigote: dos bollos que caen hacia fuera, sobre la boca
  for (const s of [-1, 1]) {
    const d = dirAE(s * 0.2, -0.47), b = barba(d);
    const bi = new THREE.Mesh(peludo(new THREE.SphereGeometry(1, 72, 48).scale(0.032, 0.0118, 0.016), 0.002, 170), barbaM);
    bi.position.copy(b.p).addScaledVector(d, 0.006); bi.lookAt(bi.position.clone().add(d)); bi.rotateZ(s * 0.32); cabeza.add(bi);
  }
  // la boca: abierta en una sonrisa (una D curvada como la barba), con los dientes de arriba y la lengua; crece con
  // sonreir(k)
  const sonrisa = new THREE.Group();
  {
    const d = dirAE(0, -0.59), b = barba(d); sonrisa.position.copy(b.p).addScaledVector(d, 0.0045); sonrisa.lookAt(sonrisa.position.clone().add(d)); cabeza.add(sonrisa);
    const W = 0.076, P = 0.025, RB = 0.11;
    const forma = new THREE.Shape(); forma.moveTo(-W / 2, 0.007); forma.quadraticCurveTo(0, -0.008, W / 2, 0.007);
    forma.bezierCurveTo(W * 0.3, -P * 1.5, -W * 0.3, -P * 1.5, -W / 2, 0.007);
    const dobla = (geo) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - (p.getX(i) ** 2 + p.getY(i) ** 2) / (2 * RB)); geo.computeVertexNormals(); return geo; };
    sonrisa.add(new THREE.Mesh(dobla(new THREE.ShapeGeometry(forma, 48)), mat(0x4a1512, 0.0, 0.7)));
    const lengua = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat(0xb8544e, 0.0, 0.45)); lengua.scale.set(0.016, 0.0055, 0.004); lengua.position.set(0, -P * 0.72, 0.0); sonrisa.add(lengua);
    const dientesG = new RoundedBoxGeometry(W * 0.82, 0.0105, 0.004, 2, 0.0018);
    { const p = dientesG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) + 0.0025 - 0.0075 * (1 - (2 * x / W) ** 2)); } }
    const dientes = new THREE.Mesh(dobla(dientesG), mat(0xffffff, 0.0, 0.3, { map: texturaDientes() })); dientes.position.set(0, -0.0012, 0.0012); sonrisa.add(dientes);
    const borde = forma.getPoints(80).map((q) => new V3(q.x, q.y, -(q.x ** 2 + q.y ** 2) / (2 * RB) + 0.0005));
    sonrisa.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(borde, true), 160, 0.0019, 10, true), labioM));
  }
  const sonreir = (k) => sonrisa.scale.set(0.85 + 0.15 * k, 0.5 + 0.5 * k, 1);
  sonreir(0);

  // los ojos: blancos y brillantes, iris castaño con su pupila y un brillo, mirando al monitor; con párpados de piel
  // (parpadear(k): 0 abiertos, 1 cerrados)
  const ojoM = mat(0xf7f4ef, 0.0, 0.12), irisM = mat(0x6b3a14, 0.0, 0.2), pupilaM = mat(0x0a0705, 0.0, 0.15);
  const parpados = [], ojos = [-1, 1].map((s) => {
    const d = dirAE(s * 0.34, -0.09), o = new THREE.Group(); o.position.copy(C).addScaledVector(d, 0.094); o.lookAt(o.position.clone().sub(d)); cabeza.add(o);   // −z hacia fuera
    o.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 48, 32), ojoM));
    const mira = new V3(0, -0.04, -1).normalize().applyQuaternion(o.quaternion.clone().invert());   // hacia delante, en la cabeza
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0203, 48, 12, 0, Math.PI * 2, 0, 0.42), irisM); iris.quaternion.setFromUnitVectors(new V3(0, 1, 0), mira); o.add(iris);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.0206, 48, 8, 0, Math.PI * 2, 0, 0.2), pupilaM); pupila.quaternion.copy(iris.quaternion); o.add(pupila);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    brillo.position.copy(mira.clone().add(new V3(0.22, 0.28, 0)).normalize().multiplyScalar(0.0208)); o.add(brillo);
    const parpado = new THREE.Group(); o.add(parpado);
    parpado.add(new THREE.Mesh(new THREE.SphereGeometry(0.0218, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), pielD));
    parpados.push(parpado); return o;
  });
  const parpadear = (k) => parpados.forEach((p) => { p.rotation.x = 0.45 - 1.6 * k; });
  parpadear(0);
  // las cejas, castañas y gruesas, arqueadas bajo la visera
  for (const s of [-1, 1]) {
    const pts = Array.from({ length: 7 }, (_, i) => { const u = i / 6; return C.clone().addScaledVector(dirAE(s * (0.12 + 0.5 * u), 0.168 + 0.035 * Math.sin(Math.PI * u) - 0.03 * u), RC0 + 0.003); });
    const ceja = new THREE.Mesh(peludo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0058, 12), 0.001, 300), barbaM); cabeza.add(ceja);
    for (const p of [pts[0], pts[6]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 16, 12), barba1M); b.position.copy(p); cabeza.add(b); }
  }
  // las mejillas, que se sonrojan al sonreír (planos 10 y 11)
  const difuso = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const rubor = new THREE.MeshBasicMaterial({ color: 0xe8907e, alphaMap: difuso, transparent: true, opacity: 0.15, depthWrite: false });
  const mejillas = [-1, 1].map((s) => enCabeza(new THREE.Mesh(new THREE.CircleGeometry(0.017, 40), rubor), dirAE(s * 0.72, -0.12), RC0 + 0.0012));

  // la gorra: corona de seis gajos con sus costuras y su botón, visera, y el logo en la frente
  const corona = new THREE.Mesh(new THREE.SphereGeometry(0.117, 96, 40, 0, Math.PI * 2, 0, Math.PI * 0.52), gorraM);
  corona.position.set(0, 0.178, 0.0); cabeza.add(corona);
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3 + Math.PI / 6;
    const pts = Array.from({ length: 16 }, (_, i) => { const th = 0.05 + (Math.PI * 0.52 - 0.06) * i / 15; return new V3(Math.sin(th) * Math.sin(a), Math.cos(th), Math.sin(th) * Math.cos(a)).multiplyScalar(0.1178).add(corona.position); });
    cabeza.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0011, 6), gorra2M));
  }
  const boton = new THREE.Mesh(new THREE.SphereGeometry(0.012, 24, 16), gorraM); boton.position.set(0, 0.295, 0); cabeza.add(boton);
  const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 64, 1, false, -Math.PI / 2, Math.PI), gorraM);
  visera.scale.set(1, 1, 1.15); visera.position.set(0, 0.193, -0.07); visera.rotation.set(-0.12, Math.PI, 0); cabeza.add(visera);
  // el logo de la gorra: 7 cm de ancho, en la frente de la corona, mirando a −z
  const logo = crearLogo(0.07 / 17.3, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2, curveSegments: 1 });
  logo.position.set(0, 0.243, -0.1); logo.rotation.set(0.42, Math.PI, 0); cabeza.add(logo);   // inclinado como la corona
  return { grupo: g, cabeza, sonrisa, sonreir, ojos, parpadear, logo, rubor, mejillas };
}
