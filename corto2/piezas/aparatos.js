// Los aparatos del episodio 2, en metros: el móvil y el lector RAIN de mano (de historia-kliskatek/dispositivos3d.js, la
// misma forma, con su pantalla en un canvas que dibuja cada plano), el emisor UHF de bajo coste (como el Reader LCF, sin
// marca: una caja con su antena de parche y su LED) y el portal RAIN del muelle se arma con las antenas de ../corto.
// Cada pantalla: pantalla.dibujar(clave, (g, W, H) => ...) repinta solo si la clave cambia.

import * as THREE from 'three';

const V3 = THREE.Vector3;
const MM = 0.001;
const mat = (color, metal = 0.2, rug = 0.55) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug });

// rectángulo redondeado extruido d en z, con los cantos biselados (losa de dispositivos3d.js)
export function losa(w, h, d, r, b = Math.min(r * 0.5, d * 0.3)) {
  const s = new THREE.Shape();
  const x = w / 2 - b, y = h / 2 - b, R = Math.max(1e-4, Math.min(r - b, x, y));
  s.moveTo(-x + R, -y);
  s.lineTo(x - R, -y); s.absarc(x - R, -y + R, R, -Math.PI / 2, 0);
  s.lineTo(x, y - R); s.absarc(x - R, y - R, R, 0, Math.PI / 2);
  s.lineTo(-x + R, y); s.absarc(-x + R, y - R, R, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + R); s.absarc(-x + R, -y + R, R, Math.PI, 1.5 * Math.PI);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - 2 * b), bevelEnabled: true, bevelThickness: b,
    bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}
// plano con las esquinas redondeadas y las UV de 0 a 1
function placa(w, h, r) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0);
  s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2);
  s.lineTo(-x + r, y); s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + r); s.absarc(-x + r, -y + r, r, Math.PI, 1.5 * Math.PI);
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

// una pantalla: un canvas que cada plano dibuja a su manera
export function crearPantalla(w, h, px) {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // (algo por debajo del blanco: una página blanca, a 1, se la come el bloom)
  const malla = new THREE.Mesh(placa(w, h, Math.min(w, h) * 0.06), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.78, 0.78, 0.78) }));
  let clave = null;
  const dibujar = (k, fn) => {
    const s = JSON.stringify(k); if (s === clave) return; clave = s;
    const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); fn(g, c.width, c.height); tex.needsUpdate = true;
  };
  return { malla, dibujar, canvas: c };
}

// Móvil: 72 × 150 × 8,5 mm, la pantalla en +z y el largo en +y. La bobina NFC, detrás, hacia arriba del centro.
export function crearMovil() {
  const g = new THREE.Group();
  const W = 0.072, H = 0.150, D = 0.0085;
  g.add(new THREE.Mesh(losa(W, H, D, 0.010), mat(0x23282e, 0.55, 0.32)));
  const cristal = new THREE.Mesh(placa(W - 0.003, H - 0.003, 0.0085), mat(0x050607, 0.1, 0.12)); cristal.position.z = D / 2 + 0.0001; g.add(cristal);
  const pantalla = crearPantalla(W - 0.0075, H - 0.012, 540); pantalla.malla.position.set(0, -0.0005, D / 2 + 0.0002); g.add(pantalla.malla);
  const isla = new THREE.Mesh(losa(0.026, 0.026, 0.0016, 0.006), mat(0x1a1e22, 0.5, 0.3));
  isla.position.set(-W / 2 + 0.018, H / 2 - 0.018, -D / 2 - 0.0006); g.add(isla);
  for (const [x, y] of [[-0.005, 0.005], [0.005, -0.005]]) {
    const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0012, 24), mat(0x0a0b0c, 0.3, 0.15));
    lente.rotation.x = Math.PI / 2; lente.position.set(isla.position.x + x, isla.position.y + y, -D / 2 - 0.0016); g.add(lente);
  }
  // la bobina NFC, por dentro de la tapa (se ve cuando el móvil se hace transparente: no hace falta; se marca su centro)
  // fantasma(k): el móvil, de opaco (1) a casi invisible, para ver a través de él lo que tiene detrás
  const mallas = []; g.traverse((m) => { if (m.material) mallas.push(m); });
  const fantasma = (k) => {
    g.visible = k > 0.01;
    for (const m of mallas) {
      const tr = k < 0.999; if (m.material.transparent !== tr) { m.material.transparent = tr; m.material.needsUpdate = true; }
      m.material.opacity = k; m.material.depthWrite = !tr;
    }
  };
  return { grupo: g, pantalla, nfc: new V3(0, 0.015, -D / 2), alto: H, fantasma };
}

// Lector RAIN de mano, como el Merlin del stand (sin marca). Largo en +y (la antena, delante), pantalla en +z.
function perfilTerminal() {
  const s = new THREE.Shape(), P = (x, y) => [x * MM, y * MM];
  s.moveTo(...P(0, -112));
  s.bezierCurveTo(...P(16, -112), ...P(26, -106), ...P(26, -93));
  s.lineTo(...P(27, -24));
  s.bezierCurveTo(...P(27, -6), ...P(39, 0), ...P(39, 20));
  s.lineTo(...P(39, 100));
  s.bezierCurveTo(...P(39, 112), ...P(32, 117), ...P(19, 117));
  s.lineTo(...P(-19, 117));
  s.bezierCurveTo(...P(-32, 117), ...P(-39, 112), ...P(-39, 100));
  s.lineTo(...P(-39, 20));
  s.bezierCurveTo(...P(-39, 0), ...P(-27, -6), ...P(-27, -24));
  s.lineTo(...P(-26, -93));
  s.bezierCurveTo(...P(-26, -106), ...P(-16, -112), ...P(0, -112));
  return s;
}
export function crearHandheld() {
  const g = new THREE.Group();
  const cuerpo = mat(0x34383d, 0.15, 0.5), goma = mat(0x5a5f66, 0, 0.85), negro = mat(0x222529, 0.1, 0.6);
  const gris = mat(0x41464c, 0.15, 0.55), tecla = mat(0xb4bac0, 0.25, 0.4), cristal = mat(0x0b0c0d, 0.1, 0.15);
  const pieza = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x * MM, y * MM, z * MM); g.add(o); return o; };
  const geo = new THREE.ExtrudeGeometry(perfilTerminal(), { depth: 20 * MM, bevelEnabled: true, bevelThickness: 5 * MM,
    bevelSize: 5 * MM, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, -10 * MM);
  pieza(geo, cuerpo, 0, 0, 0);
  pieza(losa(80 * MM, 94 * MM, 22 * MM, 18 * MM, 7 * MM), cuerpo, 0, 64, 22);
  pieza(placa(64 * MM, 80 * MM, 7 * MM), cristal, 0, 66, 33.1);
  const pantalla = crearPantalla(52 * MM, 66 * MM, 400); pantalla.malla.position.set(0, 67 * MM, 33.3 * MM); g.add(pantalla.malla);
  for (let f = 0; f < 6; f++) for (let k = 0; k < 3; k++) pieza(losa(14 * MM, 7.5 * MM, 3 * MM, 2.5 * MM), tecla, (k - 1) * 16, -40 - f * 11, 15.5);
  const cruz = pieza(new THREE.CylinderGeometry(11 * MM, 11 * MM, 3 * MM, 32), tecla, 0, -16, 15.5); cruz.rotation.x = Math.PI / 2;
  const centro = pieza(new THREE.CylinderGeometry(4.5 * MM, 4.5 * MM, 3.4 * MM, 24), gris, 0, -16, 15.8); centro.rotation.x = Math.PI / 2;
  for (const [x, y, c] of [[-21, -9, 0x2EBD6B], [0, 2, 0xF2B01E], [21, -9, 0xD0458F]]) pieza(losa(10 * MM, 7 * MM, 3 * MM, 2.5 * MM), mat(c, 0.1, 0.45), x, y, 15.5);
  pieza(losa(56 * MM, 36 * MM, 26 * MM, 6 * MM), gris, 0, 92, -24);
  pieza(losa(110 * MM, 98 * MM, 44 * MM, 9 * MM).rotateX(Math.PI / 2), gris, 0, 104, -84);
  for (const a of [1, -1]) { const b = pieza(new THREE.BoxGeometry(122 * MM, 1.6 * MM, 5 * MM), mat(0x4a4f55, 0.15, 0.5), 0, 126.4, -84); b.rotation.y = a * Math.atan2(88, 100); }
  const empu = new THREE.Group(); empu.position.set(0, 10 * MM, -14 * MM); empu.rotation.x = -0.4;
  const mango = new THREE.Mesh(losa(32 * MM, 40 * MM, 112 * MM, 13 * MM), goma); mango.position.z = -54 * MM;
  const gatillo = new THREE.Mesh(losa(13 * MM, 10 * MM, 24 * MM, 4 * MM), negro); gatillo.position.set(0, 23 * MM, -16 * MM);
  empu.add(mango, gatillo); g.add(empu);
  const barra = pieza(losa(26 * MM, 150 * MM, 13 * MM, 6 * MM), negro, 0, 36, -126); barra.rotation.x = -0.05;
  // antena: el centro de su cara (la que mira hacia delante, +y) y hacia dónde mira
  return { grupo: g, pantalla, antena: new V3(0, 128 * MM, -84 * MM), haciaAntena: new V3(0, 1, 0) };
}

// El emisor UHF de bajo coste (como el Reader LCF, sin marca): una caja gris con su antena de parche blanca delante, el
// LED verde y el cable de alimentación. La cara de la antena mira a +z; 18 × 18 × 5 cm.
export function crearEmisor() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(losa(0.16, 0.16, 0.04, 0.012), mat(0x3a4048, 0.3, 0.55)));
  const radomo = new THREE.Mesh(losa(0.18, 0.18, 0.018, 0.02), mat(0xe9ecef, 0.0, 0.6)); radomo.position.z = 0.028; g.add(radomo);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.004, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.6), toneMapped: false }));
  led.position.set(0.065, -0.065, 0.038); g.add(led);
  const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.08), mat(0x2a2f35, 0.5, 0.4)); soporte.position.set(0, 0, -0.06); g.add(soporte);
  return { grupo: g, cara: new V3(0, 0, 0.038), led };
}
