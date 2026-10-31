// El tag sensor de la web (makeTag de public/k3d/k3d-core.js, EVAL-SID: 4,2 × 1,0 en unidades locales), pasado a
// módulo, y con lo que hace falta de cerca: el ROCKY100 con sus patas de QFN y su marcado (por dentro, en piezas/rocky.js).
// Eje largo x, cara de componentes +y, la antena (dipolo) en el borde z < 0.

import * as THREE from 'three';
import { rng } from '../utiles.js';

const PCB = 0x1F5A3E, CHIP = 0x1C1C1E;

export const TAG = { L: 4.2, W: 1.0, th: 0.07, top: 0.035, zDipolo: -0.43, hueco: 0.03,
  feed: 1.5 * 0.045, zFeed: -0.27,   // la alimentación llega a las dos patas de fuera del lado de la antena (k = 0 y 3)
  zBobina: -0.33, rocky: { x: 0, z: -0.15, w: 0.22, h: 0.06 } };

const std = (color, o) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...o });

function rectRedondo(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
export function cajaRedonda(w, h, d, r = 0.08, b = 0.02) {
  b = Math.max(0, Math.min(b, h / 2 - 1e-3, w / 4, d / 4));
  const g = new THREE.ExtrudeGeometry(rectRedondo(w - 2 * b, d - 2 * b, Math.max(r - b, 0.002)), {
    depth: Math.max(h - 2 * b, 1e-3), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5 });
  g.rotateX(-Math.PI / 2); g.translate(0, b - h / 2, 0);
  return g;
}

function serigrafia(L, W) {
  const px = 256, c = document.createElement('canvas');
  c.width = Math.round(L * px); c.height = Math.round(W * px);
  const g = c.getContext('2d'), u = (x) => (x + L / 2) * px, v = (z) => (z + W / 2) * px;
  g.fillStyle = 'rgba(255,255,255,.93)';
  g.font = `600 ${Math.round(0.27 * px)}px Oxanium, "Segoe UI", Arial, sans-serif`;
  g.textBaseline = 'middle';
  g.fillText('Kliskatek«', u(-1.78), v(0.02));                     // (hacia dentro: que no pise los agujeros de amarre)
  const r = rng(11), cell = 0.05;
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    const finder = (i < 3 && j < 3) || (i > 6 && j < 3) || (i < 3 && j > 6);
    if (finder ? !(i % 7 === 1 && j % 7 === 1) : r() > 0.52) g.fillRect(u(1.27 + i * cell), v(-0.25 + j * cell), cell * px + 0.5, cell * px + 0.5);
  }
  g.lineWidth = 6;
  [[-1.98, 0], [1.98, 0]].forEach(([x, z]) => {
    g.beginPath(); g.arc(u(x), v(z), 0.07 * px, 0, Math.PI * 2);
    g.fillStyle = '#0d2219'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  // (sin girar: así va en el tag de verdad, con el logo y el QR como los tenemos)
  return t;
}

function marcado(lineas) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1e22'; g.fillRect(0, 0, 512, 512);
  for (let n = 0; n < 4000; n++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  g.fillStyle = '#a3abb2'; g.textAlign = 'center';
  lineas.forEach((l, n) => { g.font = `${n ? 600 : 700} ${n ? 52 : 74}px Oxanium, "Segoe UI", sans-serif`; g.fillText(l, 256, 230 + n * 80); });
  g.beginPath(); g.arc(70, 440, 22, 0, Math.PI * 2); g.fillStyle = '#2b3035'; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.center.set(0.5, 0.5); t.rotation = Math.PI;              // que se lea desde el lado de la antena, por donde llega
  return t;
}

export function crearTag() {
  const { L, W, th, top } = TAG, yCu = top + 0.006;
  const g = new THREE.Group();
  const placa = new THREE.Mesh(cajaRedonda(L, th, W, 0.07, 0.012), std(PCB, { roughness: 0.42 }));
  g.add(placa);
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshBasicMaterial({ map: serigrafia(L, W), transparent: true, depthWrite: false }));
  silk.rotation.x = -Math.PI / 2; silk.position.y = top + 0.003; g.add(silk);

  const pista = (mat, padre, x0, z0, x1, z1, w) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) + w, 0.012, w), mat);
    m.position.set((x0 + x1) / 2, yCu, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    padre.add(m); return m;
  };
  const chip = (padre, w, d, h, x, z, color = CHIP) => {
    const m = new THREE.Mesh(cajaRedonda(w, h, d, 0.025, 0.007), std(color, { roughness: 0.38, metalness: 0.08 }));
    m.position.set(x, top + h / 2, z); padre.add(m); return m;
  };

  // el dipolo UHF y su alimentación hasta el ROCKY100
  const matAnt = std(0xE0B455, { metalness: 0.6, roughness: 0.3, emissive: 0x3A2A00, emissiveIntensity: 1 });
  const ant = new THREE.Group(); g.add(ant);
  const z = TAG.zDipolo, hueco = TAG.hueco;
  pista(matAnt, ant, -2.04, z, -hueco / 2, z, 0.05);
  pista(matAnt, ant, hueco / 2, z, 2.04, z, 0.05);
  pista(matAnt, ant, -TAG.feed, z, -TAG.feed, TAG.zFeed, 0.018);   // más estrecha que la pata (0,026)
  pista(matAnt, ant, TAG.feed, z, TAG.feed, TAG.zFeed, 0.018);
  chip(g, 0.05, 0.035, 0.025, 0, z, 0xC9B48A);                    // condensador entre los brazos
  chip(g, 0.035, 0.06, 0.025, -TAG.feed, TAG.zBobina, 0x5A5F66);   // bobinas de adaptación
  chip(g, 0.035, 0.06, 0.025, TAG.feed, TAG.zBobina, 0x5A5F66);

  // el ROCKY100: QFN-16 con sus patas y el marcado
  const R = TAG.rocky;
  const rocky = new THREE.Group(); rocky.position.set(R.x, top, R.z); g.add(rocky);
  const matTapa = std(0x1b1f23, { roughness: 0.6, metalness: 0.1 });
  const matCara = new THREE.MeshStandardMaterial({ map: marcado(['ROCKY100']), roughness: 0.55, metalness: 0.1 });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(R.w, R.h, R.w), [matTapa, matTapa, matCara, matTapa, matTapa, matTapa]);
  cuerpo.position.y = R.h / 2; rocky.add(cuerpo);
  const plata = std(0xC9CDD1, { metalness: 0.85, roughness: 0.3 });
  const patas = [];
  for (const lado of ['i', 'a', 'd', 'b']) for (let k = 0; k < 4; k++) {
    const o = (k - 1.5) * 0.045, d = R.w / 2 + 0.004;
    const [x, zz, alo] = { i: [-d, o, 0], d: [d, o, 0], a: [o, -d, 1], b: [o, d, 1] }[lado];
    const p = new THREE.Mesh(new THREE.BoxGeometry(alo ? 0.026 : 0.012, 0.014, alo ? 0.012 : 0.026), plata.clone());
    p.position.set(x, 0.007, zz); rocky.add(p); patas.push({ lado, k, malla: p });
  }
  const mcu = chip(g, 0.22, 0.22, 0.06, 0, 0.14);
  const sensores = new THREE.Group(); sensores.position.set(0.34, 0, 0.11); g.add(sensores);
  chip(sensores, 0.12, 0.12, 0.05, -0.04, -0.07);
  chip(sensores, 0.10, 0.10, 0.05, 0.09, 0.03);
  chip(sensores, 0.08, 0.12, 0.05, -0.06, 0.09);
  chip(g, 0.16, 0.10, 0.10, -0.26, -0.15, 0xD99A2B);              // el condensador de almacenamiento

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  silk.castShadow = false;
  return { grupo: g, ant, matAnt, rocky, cuerpo, patas, mcu, sensores };
}
