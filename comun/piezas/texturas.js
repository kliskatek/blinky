// Texturas hechas aquí, en canvas, sin ficheros: hormigón, bloques, pintura con su suciedad, metal cepillado, cartón y
// pegatinas. Todas se repiten sin costura (el ruido se envuelve en los bordes) y se hacen una sola vez; con repetir()
// cada material las usa a su escala (las cajas de three ponen la textura entera en cada cara: en una cara de 4 m hay
// que repetirla más que en una de 40 cm).
//   mapa: el color (multiplica el del material); rugosidad: la rugosidad (verde); relieve: un normalMap
import * as THREE from 'three';
import { rng } from '../motor/utiles.js';

const hechas = {};
// la resolución: K veces la de cuando se hicieron (el vídeo se pinta a 3840 × 2160); lo que se mide en píxeles, por K
const K = 2;
const una = (clave, f) => hechas[clave] || (hechas[clave] = f());

// ruido de valor, en n × n, que se repite sin costura: octavas desde 'desde' celdas por lado, cada una a la mitad de fuerza
function ruido(n, semilla, desde = 4, octavas = 5) {
  const r = rng(semilla), v = new Float32Array(n * n);
  let fuerza = 1, total = 0;
  for (let o = 0, celdas = desde; o < octavas && celdas <= n; o++, celdas *= 2, fuerza /= 2) {
    const red = Float32Array.from({ length: celdas * celdas }, r);
    const paso = n / celdas;
    for (let y = 0; y < n; y++) {
      const fy = y / paso, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % celdas;
      for (let x = 0; x < n; x++) {
        const fx = x / paso, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % celdas;
        const a = red[y0 * celdas + x0], b = red[y0 * celdas + x1], c = red[y1 * celdas + x0], d = red[y1 * celdas + x1];
        v[y * n + x] += fuerza * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    total += fuerza;
  }
  for (let i = 0; i < v.length; i++) v[i] /= total;
  return v;
}

function lienzo(n, pintar) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), img = g.createImageData(n, n);
  pintar(img.data, g);
  g.putImageData(img, 0, 0);
  return c;
}
function textura(c, color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// el normalMap de un relieve (alto, 0..1, n × n), con su fuerza
function relieve(alto, n, fuerza) {
  return textura(lienzo(n, (d) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const h = (i, j) => alto[((j + n) % n) * n + ((i + n) % n)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * fuerza, dy = (h(x, y + 1) - h(x, y - 1)) * fuerza;
      const l = Math.hypot(dx, dy, 1), k = 4 * (y * n + x);
      d[k] = 128 - 127 * dx / l; d[k + 1] = 128 + 127 * dy / l; d[k + 2] = 127 + 128 / l; d[k + 3] = 255;
    }
  }), false);
}

// una copia que se repite rx × ry veces (comparte la imagen)
export function repetir(t, rx, ry = rx) { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; }
// un material con las texturas de un juego, repetidas a su escala
export function conTexturas(material, juego, rx = 1, ry = rx) {
  if (juego.mapa) material.map = repetir(juego.mapa, rx, ry);
  if (juego.rugosidad) material.roughnessMap = repetir(juego.rugosidad, rx, ry);
  if (juego.relieve) { material.normalMap = repetir(juego.relieve, rx, ry); material.normalScale.setScalar(juego.fuerza || 1); }
  return material;
}

// hormigón pulido de nave: manchas, poros, alguna huella de rueda y la junta de corte en el borde (una baldosa: 4 m)
export const hormigon = () => una('hormigon', () => {
  const n = 512 * K, base = ruido(n, 11, 4, 7), manchas = ruido(n, 23, 2, 4), poro = rng(5);
  const alto = new Float32Array(n * n);
  const mapa = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0;
      let v = 0.8 + 0.28 * (base[i] - 0.5) - 0.22 * Math.max(0, manchas[i] - 0.55) * 2;
      if (poro() < 0.012) v -= 0.12 * poro();
      if (x < 2 * K || y < 2 * K) v *= 0.55;                             // la junta
      const rueda = Math.abs(((x + 0.35 * y) % (170 * K)) - 85 * K);       // huellas, muy suaves
      if (rueda < 6 * K) v -= 0.03 * (1 - rueda / (6 * K));
      alto[i] = base[i] * 0.6 + (x < 2 * K || y < 2 * K ? -0.6 : 0);
      const k = 4 * i; d[k] = 255 * v * 0.98; d[k + 1] = 255 * v; d[k + 2] = 255 * v * 1.03; d[k + 3] = 255;
    }
  });
  const rug = lienzo(n, (d) => { for (let i = 0; i < n * n; i++) { const k = 4 * i, v = 0.55 + 0.35 * manchas[i] + 0.1 * (base[i] - 0.5); d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255; } });
  return { mapa: textura(mapa), rugosidad: textura(rug, false), relieve: relieve(alto, n, 1.2 * K), fuerza: 0.6 };
});

// pared de bloques de hormigón pintada: 5 bloques de 40 × 20 cm por fila, a matajunta (una baldosa: 2 × 2 m)
export const bloques = () => una('bloques', () => {
  const n = 512 * K, base = ruido(n, 31, 8, 6), alto = new Float32Array(n * n);
  const mapa = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, fila = Math.floor(y / (n / 10)), dx = (x + (fila % 2) * n / 10) % (n / 5), dy = y % (n / 10);
      const junta = dx < 3 * K || dy < 3 * K;
      const v = (junta ? 0.72 : 0.9) + 0.12 * (base[i] - 0.5);
      alto[i] = junta ? 0 : 0.5 + 0.2 * base[i];
      const k = 4 * i; d[k] = d[k + 1] = 255 * v; d[k + 2] = 255 * v * 1.02; d[k + 3] = 255;
    }
  });
  return { mapa: textura(mapa), relieve: relieve(alto, n, 3 * K), fuerza: 0.5 };
});

// pintura industrial: casi blanca (multiplica el color del material), con su piel de naranja, manchas suaves, algún
// roce y algo más sucia abajo (en las caras de lado de las cajas, v = 0 es abajo)
export const pintura = () => una('pintura', () => {
  const n = 256 * K, base = ruido(n, 41, 4, 5), fino = ruido(n, 43, 32, 4), r = rng(7);
  const roces = [];
  for (let k = 0; k < 14; k++) roces.push([r() * n, r() * n, (r() - 0.5) * 30 * K, (r() - 0.5) * 6 * K]);
  const mapa = lienzo(n, (d, g) => {
    for (let i = 0; i < n * n; i++) {
      const y = (i / n) | 0, abajo = Math.max(0, (y / n - 0.82) / 0.18);
      const v = 0.94 + 0.06 * (base[i] - 0.5) - 0.12 * abajo * base[i];
      const k = 4 * i; d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255;
    }
  });
  const g = mapa.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 0.7 * K;
  for (const [x, y, dx, dy] of roces) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); }
  const rug = lienzo(n, (d) => { for (let i = 0; i < n * n; i++) { const k = 4 * i, v = 0.42 + 0.2 * base[i] + 0.08 * fino[i]; d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255; } });
  return { mapa: textura(mapa), rugosidad: textura(rug, false), relieve: relieve(fino, n, 0.6 * K), fuerza: 0.25 };
});

// metal cepillado (las aletas, los ejes, la chapa sin pintar): rayas finas a lo largo de x
export const cepillado = () => una('cepillado', () => {
  const n = 256 * K, r = rng(51), filas = Float32Array.from({ length: n }, r), base = ruido(n, 53, 4, 3);
  const raya = (y) => (filas[(y + n - 1) % n] + 2 * filas[y] + filas[(y + 1) % n]) / 4;
  const alto = new Float32Array(n * n);
  const mapa = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const y = (i / n) | 0, v = 0.93 + 0.05 * raya(y) + 0.03 * (base[i] - 0.5);   // (el detalle, en la rugosidad)
      alto[i] = raya(y);
      const k = 4 * i; d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255;
    }
  });
  const rug = lienzo(n, (d) => { for (let i = 0; i < n * n; i++) { const y = (i / n) | 0, k = 4 * i, v = 0.3 + 0.25 * raya(y) + 0.1 * base[i]; d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255; } });
  return { mapa: textura(mapa), rugosidad: textura(rug, false), relieve: relieve(alto, n, 2), fuerza: 0.3 };
});

// cartón ondulado: kraft con sus fibras, la cinta de embalar por el medio y una etiqueta con código de barras
export const carton = () => una('carton', () => {
  const n = 256 * K, base = ruido(n, 61, 8, 6), r = rng(63);
  const c = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const y = (i / n) | 0, onda = 0.03 * Math.sin(y * 1.3 / K);
      const v = 0.92 + 0.12 * (base[i] - 0.5) + onda + (r() < 0.02 ? -0.05 : 0);
      const k = 4 * i; d[k] = 176 * v; d[k + 1] = 134 * v; d[k + 2] = 82 * v; d[k + 3] = 255;
    }
  });
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(210,180,120,.75)'; g.fillRect(0, n * 0.44, n, n * 0.12);                 // la cinta
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, n * 0.45, n, n * 0.02);
  g.fillStyle = '#f2f0ea'; g.fillRect(n * 0.58, n * 0.64, n * 0.32, n * 0.22);                // la etiqueta
  g.fillStyle = '#222';
  for (let x = n * 0.6, k = 0; x < n * 0.88; x += (1 + (k++ % 3)) * K) if (r() > 0.4) g.fillRect(x, n * 0.72, K, n * 0.1);
  g.fillRect(n * 0.6, n * 0.66, n * 0.18, 3 * K);
  return { mapa: textura(c) };
});

// pegatinas (planos con su textura, para pegar en las caras): 'tension' (el triángulo amarillo del rayo), 'placa' (la
// de características, con texto), 'flecha' (sentido de giro), 'extintor' y 'salida' (las señales) y 'rayado' (la zona
// que hay que dejar libre, en el suelo)
export function pegatina(tipo, texto = []) {
  const c = document.createElement('canvas'); c.width = c.height = 256 * K;
  const g = c.getContext('2d'); g.scale(K, K);                          // (se dibuja en 256 × 256)
  if (tipo === 'tension') {
    g.fillStyle = '#f5c400'; g.strokeStyle = '#111'; g.lineWidth = 14; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(128, 18); g.lineTo(244, 228); g.lineTo(12, 228); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#111'; g.beginPath();
    g.moveTo(140, 70); g.lineTo(98, 150); g.lineTo(128, 150); g.lineTo(108, 210); g.lineTo(162, 122); g.lineTo(132, 122); g.lineTo(150, 70); g.fill();
  } else if (tipo === 'placa') {
    g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#555'; g.lineWidth = 4; g.strokeRect(8, 8, 240, 240);
    g.fillStyle = '#222'; g.font = '700 30px "Segoe UI", sans-serif'; g.fillText(texto[0] || '', 22, 52);
    g.font = '500 20px "Segoe UI", sans-serif';
    texto.slice(1).forEach((l, i) => g.fillText(l, 22, 92 + i * 30));
    for (const [x, y] of [[20, 20], [236, 20], [20, 236], [236, 236]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = '#888'; g.fill(); }
  } else if (tipo === 'extintor') {
    g.fillStyle = '#c8102e'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff';
    g.beginPath(); g.roundRect(96, 70, 56, 150, 18); g.fill();                     // la botella
    g.fillRect(110, 46, 28, 30); g.fillRect(120, 36, 50, 12);                         // la válvula y la maneta
    g.lineWidth = 10; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(140, 56); g.quadraticCurveTo(190, 70, 180, 150); g.stroke();
  } else if (tipo === 'salida') {
    g.fillStyle = '#00843d'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff';
    g.beginPath(); g.arc(150, 52, 18, 0, 7); g.fill();                                // el que corre
    g.lineWidth = 16; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath();
    g.moveTo(140, 80); g.lineTo(120, 140); g.lineTo(150, 170); g.lineTo(140, 214); g.moveTo(120, 140); g.lineTo(88, 190);
    g.moveTo(136, 92); g.lineTo(176, 112); g.moveTo(132, 96); g.lineTo(98, 112); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(196, 150); g.lineTo(240, 180); g.lineTo(196, 210); g.fill(); g.fillRect(176, 170, 22, 20);
  } else if (tipo === 'rayado') {
    g.fillStyle = '#e2b100'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#16181b';
    for (let k = -4; k < 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 + 32, 0); g.lineTo(k * 64 + 32 + 256, 256); g.lineTo(k * 64 + 256, 256); g.fill(); }
    const tex = textura(c); tex.repeat.set(3, 2);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  } else if (tipo === 'flecha') {
    g.fillStyle = '#f5c400'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(30, 100); g.lineTo(170, 100); g.lineTo(170, 50); g.lineTo(236, 128); g.lineTo(170, 206); g.lineTo(170, 156); g.lineTo(30, 156); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
}

// chapa galvanizada (la placa de montaje): las flores del zinc, manchas claras y oscuras de bordes rectos
export const galvanizado = () => una('galvanizado', () => {
  const n = 256 * K, r = rng(71), semillas = Array.from({ length: 140 }, () => [r() * n, r() * n, 0.93 + 0.07 * r()]);
  const fino = ruido(n, 73, 32, 3);
  const mapa = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0;
      let mejor = 1e9, v = 1;
      for (const [sx, sy, sv] of semillas) {
        const dx = Math.min(Math.abs(x - sx), n - Math.abs(x - sx)), dy = Math.min(Math.abs(y - sy), n - Math.abs(y - sy)), dd = dx * dx + dy * dy;
        if (dd < mejor) { mejor = dd; v = sv; }
      }
      v += 0.04 * (fino[i] - 0.5);
      const k = 4 * i; d[k] = d[k + 1] = 255 * v; d[k + 2] = 255 * Math.min(1, v * 1.02); d[k + 3] = 255;
    }
  });
  return { mapa: textura(mapa), rugosidad: textura(mapa, false) };
});

// una etiqueta impresa (rótulo de módulo, marcado de cable): texto oscuro sobre claro, con luz (no brilla como un cartel)
export function etiqueta(lineas, w, h, { fondo = '#bfbcb5', tinta = '#1b1d20', alto = 1 } = {}) {
  const W = 256, H = Math.max(16, Math.round(256 * h / w)), c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
  const g = c.getContext('2d'); g.scale(K, K);
  g.fillStyle = fondo; g.fillRect(0, 0, W, H);
  g.fillStyle = tinta; g.textBaseline = 'middle';
  const paso = H / lineas.length;
  lineas.forEach((l, i) => {
    g.font = `${i ? 500 : 700} ${Math.round(paso * 0.62 * alto)}px "Segoe UI", Arial, sans-serif`;
    g.fillText(l, 8, paso * (i + 0.5), W - 16);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
}

// tablero de oficina: melamina con veta de madera clara (una baldosa: 1 m)
export const madera = () => una('madera', () => {
  const n = 512 * K, base = ruido(n, 81, 2, 5), r = rng(83);
  const vetas = Float32Array.from({ length: n }, () => r());
  const mapa = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0;
      const ondula = (y + 9 * K * Math.sin(x * 0.012 / K + base[i] * 3)) / K;   // (en píxeles de 512)
      const fila = ((Math.floor(ondula) % n) + n) % n, veta = Math.sin(ondula * 0.35 + vetas[fila] * 6) * 0.5 + 0.5;
      const v = 0.86 + 0.08 * veta + 0.06 * (base[i] - 0.5);
      const k = 4 * i; d[k] = 255 * v; d[k + 1] = 255 * v * 0.93; d[k + 2] = 255 * v * 0.84; d[k + 3] = 255;
    }
  });
  return { mapa: textura(mapa) };
});

// moqueta en losetas de 50 cm, alternando el sentido del pelo (una baldosa: 1 m, 2 × 2 losetas)
export const moqueta = () => una('moqueta', () => {
  const n = 256 * K, fino = ruido(n, 91, 64, 3), base = ruido(n, 93, 4, 3), alto = new Float32Array(n * n);
  const mapa = lienzo(n, (d) => {
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, loseta = (Math.floor(x / (n / 2)) + Math.floor(y / (n / 2))) % 2;
      const junta = x % (n / 2) < K || y % (n / 2) < K;
      const v = 0.82 + 0.18 * fino[i] + (loseta ? 0.05 : -0.03) + 0.06 * (base[i] - 0.5) - (junta ? 0.12 : 0);
      alto[i] = fino[i];
      const k = 4 * i; d[k] = d[k + 1] = d[k + 2] = 255 * v; d[k + 3] = 255;
    }
  });
  return { mapa: textura(mapa), relieve: relieve(alto, n, 1.5 * K), fuerza: 0.4 };
});

// las teclas de un teclado (para la cara de arriba de su caja)
export const teclado = () => una('teclado', () => {
  const c = document.createElement('canvas'); c.width = 512 * K; c.height = 160 * K;
  const g = c.getContext('2d'); g.scale(K, K); g.fillStyle = '#1b1e22'; g.fillRect(0, 0, 512, 160);
  const fila = (y, n, x0 = 10, w = 28) => { for (let k = 0; k < n; k++) { g.fillStyle = '#2c3036'; g.fillRect(x0 + k * (w + 4), y, w, 26); g.fillStyle = '#3a3f46'; g.fillRect(x0 + k * (w + 4) + 3, y + 2, w - 6, 18); } };
  fila(10, 15); fila(42, 14, 26); fila(74, 13, 34); fila(106, 12, 48);
  g.fillStyle = '#2c3036'; g.fillRect(120, 136, 220, 20);
  return { mapa: textura(c) };
});
