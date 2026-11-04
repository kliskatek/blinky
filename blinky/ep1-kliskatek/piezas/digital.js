// El decorado del mundo digital del plano 9: lo que hace que el MES y el ERP parezcan sistemas de verdad, y no solo la
// ruta de Blinky. Todo sale del tiempo del plano (t, sin la pausa), como lo demás.
//   MES (cian): la nave con sus pórticos, luces de techo y suelo, flujos de datos por el suelo y pantallas en las
//     paredes: la orden de fabricación (avanza), el OEE con sus tres factores, la tendencia de temperatura de la máquina 2
//     con el umbral (su último punto, el de Blinky, lo pasa), el lote que se va formando, el estado de la línea (la
//     máquina 2 pasa a ALERTA cuando él se hace alerta) y la planificación de la línea con el cursor de ahora.
//   ERP (morado): los módulos (mantenimiento, compras, almacén, planificación, finanzas, calidad) en un arco por detrás y
//     a la izquierda de la base de datos, unidos a ella; por esas uniones le llegan datos. La base de datos, con bandas de registros que giran y su
//     plataforma; al entrar el aviso, el módulo de mantenimiento se enciende.
import * as THREE from 'three';
import { L, num } from '../../../comun/motor/idioma.js';
import { rng, bell, smooth, seg, texturaPunto } from '../../../comun/motor/utiles.js';
import { matLinea, aristas } from '../../../comun/motor/lineas.js';
import { cajaRedonda } from '../../../comun/piezas/tag.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const aditivo = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const LETRA = 'Oxanium, "Segoe UI", monospace';

// una pantalla holográfica: canvas de 1024 de ancho que dibujar(g, W, H, t) repinta (a 15 cuadros por segundo de t,
// como mucho: más no se nota y cada repintado sube la textura)
function pantalla(w, h, dibujar, { color = '#3dc8ff', fondo = 'rgba(4,20,34,.72)' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  let ultimo = null;
  const pintar = (t) => {
    const k = Math.floor(t * 15); if (k === ultimo) return; ultimo = k;
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = fondo; g.fillRect(0, 0, W, H);
    g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(3, 3, W - 6, H - 6);
    g.fillStyle = color; g.fillRect(3, 3, 120, 10); g.fillRect(W - 123, H - 13, 120, 10);      // (las esquinas, marcadas)
    dibujar(g, W, H, t);
    tex.needsUpdate = true;
  };
  return { malla, mat, pintar };
}
const titulo = (g, txt, col = '#9fe8ff', size = 54) => { g.font = `700 ${size}px ${LETRA}`; g.fillStyle = col; g.textAlign = 'left'; g.fillText(txt, 36, 30 + size); };
const texto = (g, txt, x, y, { size = 40, col = '#c8f0ff', alinea = 'left', peso = 600, ancho } = {}) => {
  g.font = `${peso} ${size}px ${LETRA}`; g.fillStyle = col; g.textAlign = alinea; g.fillText(txt, x, y, ancho);
};
const barra = (g, x, y, w, h, k, col) => {
  g.fillStyle = 'rgba(120,200,255,.15)'; g.fillRect(x, y, w, h);
  g.fillStyle = col; g.fillRect(x, y, w * k, h);
};

// ---------------------------------------------------------------- MES
// la nave: de z0 a z1, x ±ancho/2, suelo en y0 y techo en y1 (la de 09-mes-erp.js: 12 × 7 × 34, centrada en z 45)
export function montarMES(grupo, { z0 = 28, z1 = 62, ancho = 12, y0 = 3, y1 = 10, SUYO = 41.8, UMBRAL = 41.5, MEDIA = 40.5, LECTURAS = 8, ALERTA = 10.8 } = {}) {
  const zc = (z0 + z1) / 2, largo = z1 - z0, xw = ancho / 2;
  // pórticos, luces de techo y el suelo
  const porticos = matLinea({ color: 0x3dc8ff, opacity: 0.22, toneMapped: false });
  for (let k = 1; k < 8; k++) { const p = aristas(new THREE.PlaneGeometry(ancho, y1 - y0), porticos); p.position.set(0, (y0 + y1) / 2, z0 + k * largo / 8); grupo.add(p); }
  for (const x of [-2.4, 2.4]) {
    const luz = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, largo - 1), aditivo(new THREE.Color(0.5, 1.2, 1.8), 0.7)); luz.position.set(x, y1 - 0.08, zc); grupo.add(luz);
  }
  const cs = document.createElement('canvas'); cs.width = cs.height = 256;
  const gs = cs.getContext('2d'); gs.strokeStyle = 'rgba(80,190,255,.8)'; gs.lineWidth = 2;
  for (let k = 0; k <= 256; k += 64) { gs.beginPath(); gs.moveTo(k, 0); gs.lineTo(k, 256); gs.moveTo(0, k); gs.lineTo(256, k); gs.stroke(); }
  gs.fillStyle = 'rgba(80,190,255,.9)'; for (let x = 0; x <= 256; x += 64) for (let y = 0; y <= 256; y += 64) gs.fillRect(x - 4, y - 4, 8, 8);
  const texS = new THREE.CanvasTexture(cs); texS.wrapS = texS.wrapT = THREE.RepeatWrapping; texS.repeat.set(ancho / 2, largo / 2); texS.anisotropy = 16;
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo), new THREE.MeshBasicMaterial({ map: texS, color: new THREE.Color(0.25, 0.7, 1.1), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  suelo.rotation.x = -Math.PI / 2; suelo.position.set(0, y0 + 0.01, zc); grupo.add(suelo);

  // flujos de datos por el suelo, hacia el fondo de la nave (y fuera, hacia el ERP): puntos en cuatro carriles
  const N = 240, pos = new Float32Array(N * 3), r = rng(91);
  const carril = Array.from({ length: N }, (_, i) => ({ x: [-4.6, -3.8, 3.8, 4.6][i % 4], f: r(), v: 0.05 + 0.04 * r() }));
  const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flujo = new THREE.Points(gp, new THREE.PointsMaterial({ map: texturaPunto(), size: 0.16, color: 0x5fd4ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  flujo.frustumCulled = false; grupo.add(flujo);

  // las pantallas: en la pared −x, mirando dentro; la de la línea, en la pared del fondo; la planificación, en la +x
  const ponerEn = (p, x, y, z, ry) => { p.malla.position.set(x, y, z); p.malla.rotation.y = ry; grupo.add(p.malla); return p; };
  const pantallas = [];
  // la orden de fabricación
  pantallas.push(ponerEn(pantalla(5.6, 2.6, (g, W, H, t) => {
    titulo(g, L('ORDEN DE FABRICACIÓN'));
    texto(g, 'OF-2291', 36, 190, { size: 64, col: '#ffffff', peso: 700 });
    texto(g, `${L('MÁQUINA 2')} · ${L('Carcasa M-40')}`, 330, 190, { size: 40, col: '#9fd0ea', ancho: 650 });
    const n = Math.min(2000, 1240 + Math.floor(t * 2.6));
    barra(g, 36, 250, W - 72, 46, n / 2000, '#3dc8ff');
    texto(g, `${num(n, 0)} / ${num(2000, 0)} ${L('piezas')}`, 36, 360, { size: 44 });
    texto(g, `${Math.round(100 * n / 2000)} %`, W - 36, 360, { size: 44, alinea: 'right', col: '#ffffff' });
    texto(g, `${L('fin previsto')} 14:20`, 36, 430, { size: 36, col: '#7fb8d8' });
  }), -xw + 0.15, 8.0, z1 - 4.5, Math.PI / 2));
  // el OEE
  pantallas.push(ponerEn(pantalla(5.6, 2.6, (g, W, H, t) => {
    titulo(g, `OEE · ${L('LÍNEA 3')}`);
    const d = 94, rend = 96 + Math.round(Math.sin(t * 0.7)), cal = 97, oee = Math.round(d * rend * cal / 1e4);
    texto(g, `${oee} %`, 36, 250, { size: 130, col: '#ffffff', peso: 700 });
    [[L('Disponibilidad'), d], [L('Rendimiento'), rend], [L('Calidad'), cal]].forEach(([n, v], i) => {
      const y = 140 + i * 105;
      texto(g, n, 430, y, { size: 36, col: '#9fd0ea', ancho: 330 });
      texto(g, `${v} %`, W - 36, y, { size: 36, alinea: 'right' });
      barra(g, 430, y + 18, W - 466, 22, v / 100, '#3dc8ff');
    });
  }), -xw + 0.15, 8.0, z1 - 12.5, Math.PI / 2));
  // la tendencia de temperatura de la máquina 2, con el umbral: el último punto es el suyo
  const historia = Array.from({ length: 60 }, (_, i) => 40.3 + 0.3 * Math.sin(i * 0.55) + 0.18 * Math.sin(i * 1.7 + 1));
  pantallas.push(ponerEn(pantalla(5.6, 2.6, (g, W, H, t) => {
    titulo(g, `${L('TEMPERATURA')} · ${L('MÁQUINA 2')}`);
    const x0 = 60, x1 = W - 60, ya = 130, yb = H - 70, v0 = 39.4, v1 = 42.2, Y = (v) => yb - (v - v0) / (v1 - v0) * (yb - ya);
    g.strokeStyle = 'rgba(120,200,255,.18)'; g.lineWidth = 2;
    for (let v = 39.5; v < v1; v += 0.5) { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); }
    g.setLineDash([18, 12]); g.strokeStyle = '#ff6a5a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x0, Y(UMBRAL)); g.lineTo(x1, Y(UMBRAL)); g.stroke(); g.setLineDash([]);
    texto(g, `${L('umbral')} ${num(UMBRAL, 1)} °C`, x1, Y(UMBRAL) - 14, { size: 32, col: '#ff8a7a', alinea: 'right' });
    const desliza = (t * 0.6) % 1, n = historia.length, paso = (x1 - x0) / (n - 1);
    const vals = historia.map((v, i) => (i === n - 1 && t > 8.4 ? SUYO : v));
    g.strokeStyle = '#7fe0ff'; g.lineWidth = 5; g.beginPath();
    vals.forEach((v, i) => { const x = x0 + (i - desliza) * paso; if (x < x0) return; (i && x - paso >= x0 ? g.lineTo(x, Y(v)) : g.moveTo(x, Y(v))); });
    g.stroke();
    const ult = vals[n - 1], xu = x0 + (n - 1 - desliza) * paso, rojo = ult > UMBRAL;
    g.fillStyle = rojo ? (Math.floor(t * 4) % 2 ? '#ff3b30' : '#ffb0a8') : '#ffffff';
    g.beginPath(); g.arc(xu, Y(ult), 13, 0, 7); g.fill();
    texto(g, `${num(ult, 1)} °C`, xu - 24, Y(ult) - 26, { size: 40, col: rojo ? '#ff8a7a' : '#ffffff', alinea: 'right', peso: 700 });
  }), -xw + 0.15, 8.0, z1 - 20.5, Math.PI / 2));
  // el lote que se va formando
  pantallas.push(ponerEn(pantalla(5.6, 2.6, (g, W, H, t) => {
    titulo(g, `${L('LOTE')} L-2611`);
    const n = Math.min(LECTURAS, Math.floor(seg(t, 0.4, 2.6) * LECTURAS + 0.001));
    const filas = [[L('lecturas'), `${n} / ${LECTURAS}`], [L('equipo'), L('Máq. 2')], [L('MEDIA'), t > 7.6 ? `${num(MEDIA, 1)} °C` : '–'],
      [L('EVENTOS'), t > ALERTA ? '1' : '0']];
    filas.forEach(([a, b], i) => {
      const y = 175 + i * 72; texto(g, a, 36, y, { size: 40, col: '#9fd0ea' });
      texto(g, b, W - 36, y, { size: 44, alinea: 'right', col: i === 3 && t > ALERTA ? '#ff8a7a' : '#ffffff', peso: 700 });
    });
  }), -xw + 0.15, 8.0, z1 - 28.5, Math.PI / 2));
  // el estado de la línea, en el fondo
  pantallas.push(ponerEn(pantalla(6.4, 2.3, (g, W, H, t) => {
    titulo(g, `${L('LÍNEA 3')} · ${L('estado')}`);
    const MAQ = [['Máq. 1', 0], ['Máq. 2', t > ALERTA ? 2 : 0], ['Máq. 3', 0], ['Máq. 4', 1], ['Máq. 5', 0]];
    const EST = [[L('EN MARCHA'), '#2ee38a'], [L('PARADA'), '#ffb020'], [L('ALERTA'), Math.floor(t * 4) % 2 ? '#ff3b30' : '#ff9a90']];
    MAQ.forEach(([m, e], i) => {
      const x = 36 + (i % 3) * 330, y = 170 + Math.floor(i / 3) * 90, [txt, col] = EST[e];
      g.fillStyle = col; g.beginPath(); g.arc(x + 16, y - 14, 14, 0, 7); g.fill();
      texto(g, L(m), x + 44, y, { size: 38, col: '#ffffff', ancho: 120 });
      texto(g, txt, x + 170, y, { size: 30, col, ancho: 140 });
    });
  }), 0, 8.4, z0 + 0.15, 0));
  // la planificación de la línea, con el cursor de ahora
  const r2 = rng(17), plan = Array.from({ length: 5 }, () => { const b = []; let x = r2() * 0.1; while (x < 1) { const l = 0.12 + r2() * 0.25; b.push([x, Math.min(1, x + l), r2()]); x += l + 0.02 + r2() * 0.06; } return b; });
  pantallas.push(ponerEn(pantalla(5.6, 2.6, (g, W, H, t) => {
    titulo(g, L('PLANIFICACIÓN'));
    const x0 = 200, x1 = W - 36, y0 = 120, alto = 58;
    plan.forEach((bloques, i) => {
      const y = y0 + i * (alto + 10);
      texto(g, L(`Máq. ${i + 1}`), 36, y + 42, { size: 32, col: '#9fd0ea', ancho: 150 });
      bloques.forEach(([a, b, c]) => {
        g.fillStyle = i === 1 && t > ALERTA && a < 0.55 && b > 0.45 ? 'rgba(255,80,70,.75)' : c > 0.75 ? 'rgba(255,176,32,.6)' : 'rgba(61,200,255,.55)';
        g.fillRect(x0 + a * (x1 - x0), y, (b - a) * (x1 - x0), alto);
      });
    });
    const xa = x0 + (0.45 + 0.004 * t) * (x1 - x0);
    g.fillStyle = '#ffffff'; g.fillRect(xa - 2, y0 - 16, 4, 5 * (alto + 10) + 10);
    texto(g, L('ahora'), xa, y0 - 22, { size: 28, alinea: 'center' });
  }), xw - 0.15, 8.0, z0 + 3.5, -Math.PI / 2));

  return {
    actualizar(t) {
      pantallas.forEach((p) => p.pintar(t));
      carril.forEach((c, i) => {
        const z = z1 + 4 - (((c.f + t * c.v) % 1) * (largo + 14));
        pos[3 * i] = c.x; pos[3 * i + 1] = y0 + 0.08; pos[3 * i + 2] = z;
      });
      gp.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- ERP
// alrededor de la base de datos DB (sus discos de radio 3, de y 0,3 a 5,5), los módulos; devuelve las curvas por las
// que les llegan datos (para los paquetes morados del plano) y actualizar(t, aviso), con aviso de 0 a 1 al encajar
const MODULOS = [['MANTENIMIENTO', 'órdenes de trabajo'], ['COMPRAS', 'pedidos a proveedor'], ['ALMACÉN', 'stock y repuestos'],
  ['PLANIFICACIÓN', 'plan maestro'], ['FINANZAS', 'costes'], ['CALIDAD', 'no conformidades']];
export function montarERP(grupo, DB, MORADO) {
  // la plataforma
  for (const [a, b, o] of [[3.5, 3.8, 0.7], [5.2, 5.3, 0.45], [7.6, 7.66, 0.3]]) {
    const r = new THREE.Mesh(new THREE.RingGeometry(a, b, 192), aditivo(MORADO, o)); r.rotation.x = -Math.PI / 2; r.position.copy(DB).setY(0.02); grupo.add(r);
  }
  // las bandas de registros que giran alrededor de cada disco
  const cb = document.createElement('canvas'); cb.width = 2048; cb.height = 64;
  const gb = cb.getContext('2d'), r = rng(23);
  for (let x = 0; x < 2048;) { const l = 8 + r() * 60; gb.fillStyle = `rgba(220,180,255,${0.25 + 0.6 * r()})`; gb.fillRect(x, 10 + Math.floor(r() * 3) * 16, l, 8); x += l + 6 + r() * 30; }
  const texB = new THREE.CanvasTexture(cb); texB.wrapS = THREE.RepeatWrapping;
  const bandas = [0, 1, 2].map((k) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(3.12, 3.12, 1.0, 160, 1, true), new THREE.MeshBasicMaterial({ map: texB, color: MORADO, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    b.position.copy(DB).setY(1.0 + k * 1.75); grupo.add(b); return b;
  });
  // los módulos, en un arco detrás de la base de datos, mirando a donde llega la cámara
  const curvas = [], modulos = MODULOS.map(([nombre, sub], i) => {
    // (a la izquierda y por encima: detrás de la tabla de avisos, a la derecha, se transparentaban a través de ella)
    const a = Math.PI + 0.2 + i * 0.38, p = DB.clone().add(V(13 * Math.cos(a), 8.8 + 1.4 * (i % 2), 9 * Math.sin(a)));
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(28,10,48,.78)'; g.fillRect(0, 0, 1024, 400);
    g.strokeStyle = '#b77bff'; g.lineWidth = 8; g.strokeRect(4, 4, 1016, 392);
    g.fillStyle = '#b77bff'; g.fillRect(4, 4, 30, 392);
    g.font = `700 120px ${LETRA}`; g.fillStyle = '#efe0ff'; g.textAlign = 'left'; g.fillText(L(nombre), 70, 180, 900);
    g.font = `600 64px ${LETRA}`; g.fillStyle = '#c3a6e8'; g.fillText(L(sub), 70, 300, 900);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.64), mat); m.position.copy(p); m.lookAt(V(-1, 7, 4)); grupo.add(m);
    const borde = new THREE.Mesh(cajaRedonda(4.4, 0.06, 1.84, 0.08, 0.02).rotateX(Math.PI / 2), aditivo(MORADO, 0.35)); borde.position.copy(p); borde.quaternion.copy(m.quaternion); borde.translateZ(-0.05); grupo.add(borde);
    const curva = new THREE.CatmullRomCurve3([p.clone().add(V(0, -0.9, 0)), p.clone().lerp(DB, 0.5).setY(3.2 + (i % 3) * 0.6), DB.clone().setY(4.2)]);
    const enlace = new THREE.Mesh(new THREE.TubeGeometry(curva, 160, 0.035, 12), aditivo(0x6a2fb0, 0.5)); grupo.add(enlace);
    curvas.push(curva);
    return { mat, enlace };
  });
  return {
    curvas,
    actualizar(t, aviso) {
      bandas.forEach((b, k) => { b.rotation.y = (k % 2 ? -1 : 1) * t * (0.25 + 0.08 * k); });
      // mantenimiento se enciende al llegar el aviso (y su enlace lo lleva)
      const m = modulos[0];
      m.mat.color.setRGB(1 + 1.2 * aviso, 1 - 0.3 * aviso, 1 - 0.3 * aviso);
      m.enlace.material.color.set(0x6a2fb0).lerp(new THREE.Color(1.6, 0.35, 0.3), aviso); m.enlace.material.opacity = 0.5 + 0.4 * aviso;
    },
  };
}
