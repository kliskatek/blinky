// La antena de panel (como las Laird del stand), su pie y el lector fijo (como el Zebra FX9600), sin marcas: los de
// historia-kliskatek/dispositivos3d.js, hechos con primitivas. Unidades: metros (el plano los escala). Además, aquí se
// devuelven los LED y el parche de la antena por separado, para encenderlos, y un cable que se puede iluminar a trozos.

import * as THREE from 'three';
import { pintura, cepillado, conTexturas } from './texturas.js';
import { cajaBisel } from '../utiles.js';

const V3 = THREE.Vector3, MM = 0.001;
const mat = (color, metal = 0.2, rug = 0.55) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rug });

// Rectángulo redondeado (ancho w en X, alto h en Y) extruido d en Z, con los cantos biselados; centrado en el origen.
function losa(w, h, d, r, b = Math.min(r * 0.5, d * 0.3)) {
  const s = new THREE.Shape();
  const x = w / 2 - b, y = h / 2 - b, R = Math.max(1e-4, Math.min(r - b, x, y));
  s.moveTo(-x + R, -y);
  s.lineTo(x - R, -y); s.absarc(x - R, -y + R, R, -Math.PI / 2, 0);
  s.lineTo(x, y - R); s.absarc(x - R, y - R, R, 0, Math.PI / 2);
  s.lineTo(-x + R, y); s.absarc(-x + R, y - R, R, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + R); s.absarc(-x + R, -y + R, R, Math.PI, 1.5 * Math.PI);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - 2 * b), bevelEnabled: true, bevelThickness: b,
    bevelSize: b, bevelSegments: 6, curveSegments: 24 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

// Antena RAIN de panel: un cuadrado de 26 cm con las esquinas achaflanadas, en blanco roto, con su soporte (placa y
// rótula) detrás. La cara mira a +Z; `detras` es donde se coge al pie y sale el cable. `brillo`: un parche bajo la cara
// que se enciende cuando le llega la onda.
export function crearAntenaPanel() {
  const g = new THREE.Group();
  const L = 124 * MM, c = 28 * MM;
  const s = new THREE.Shape();
  s.moveTo(-L + c, -L); s.lineTo(L - c, -L); s.lineTo(L, -L + c); s.lineTo(L, L - c);
  s.lineTo(L - c, L); s.lineTo(-L + c, L); s.lineTo(-L, L - c); s.lineTo(-L, -L + c); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 22 * MM, bevelEnabled: true, bevelThickness: 6 * MM, bevelSize: 5.5 * MM,
    bevelSegments: 8, curveSegments: 6 });
  geo.translate(0, 0, -11 * MM);
  const cuerpo = conTexturas(mat(0xE6E3DC, 0.02, 1), pintura(), 1, 1);
  g.add(new THREE.Mesh(geo, cuerpo));
  const brillo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  brillo.position.z = 17.5 * MM; g.add(brillo);
  const metal = mat(0x9AA0A6, 0.6, 0.35);
  const soporte = new THREE.Mesh(losa(70 * MM, 70 * MM, 5 * MM, 6 * MM), metal);
  soporte.position.z = -19.5 * MM;
  const rotula = new THREE.Mesh(new THREE.CylinderGeometry(9 * MM, 9 * MM, 34 * MM, 48), metal);
  rotula.rotation.x = Math.PI / 2;
  rotula.position.z = -38 * MM;
  g.add(soporte, rotula);
  return { grupo: g, cuerpo, brillo, cara: new V3(0, 0, 17 * MM), detras: new V3(0, 0, -55 * MM) };
}

// Pie de suelo: base redonda y un tubo hasta `alto`
export function crearPie(alto) {
  const g = new THREE.Group(), metal = mat(0x3A4046, 0.6, 0.35);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(60 * MM, 66 * MM, 8 * MM, 96), metal);
  base.position.y = 4 * MM;
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(8 * MM, 8 * MM, alto, 48), metal);
  tubo.position.y = alto / 2;
  g.add(base, tubo);
  return g;
}

// Lector RAIN fijo: caja gris de 246 × 178 × 43 mm con la tapa negra de aletas, la placa del logo, 4 LED, orejetas y los
// 8 conectores de antena en el lado largo de delante (+Z). Tumbado sobre el suelo (y = 0). `puerto`: el conector 1;
// `red`: el Ethernet, en el lado +X. `leds` y `aletas`, para encenderlos.
export function crearLectorFijo() {
  const g = new THREE.Group();
  const W = 246 * MM, D = 178 * MM;
  const gris = conTexturas(mat(0x3C4146, 0.35, 0.9), pintura(), 2, 1), negro = mat(0x15171a, 0.3, 0.55);
  const tumbada = (geo) => geo.rotateX(-Math.PI / 2);
  const pieza = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  pieza(tumbada(losa(W - 8 * MM, D - 8 * MM, 8 * MM, 14 * MM)), negro, 0, 4 * MM, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pieza(tumbada(losa(26 * MM, 20 * MM, 4 * MM, 6 * MM)), negro, sx * (W / 2 + 4 * MM), 2 * MM, sz * (D / 2 - 34 * MM));
  }
  pieza(tumbada(losa(W, D, 30 * MM, 18 * MM, 4 * MM)), gris, 0, 23 * MM, 0);
  pieza(tumbada(losa(W - 18 * MM, D - 18 * MM, 3 * MM, 12 * MM)), negro, 0, 39 * MM, 0);
  const n = 22, aletas = [];
  for (let i = 0; i < n; i++) {
    const m = conTexturas(new THREE.MeshStandardMaterial({ color: 0x1d2024, metalness: 0.45, roughness: 0.8, emissive: 0xff5a1a, emissiveIntensity: 0 }), cepillado(), 1, 1);
    aletas.push(pieza(cajaBisel(4.5 * MM, 4.5 * MM, D - 34 * MM, MM), m, -W / 2 + 20 * MM + i * (W - 40 * MM) / (n - 1), 42.5 * MM, 0));
  }
  pieza(tumbada(losa(72 * MM, 26 * MM, 3 * MM, 4 * MM)), mat(0x0b0c0d, 0.3, 0.2), 0, 45 * MM, D / 2 - 42 * MM);
  const leds = [0x2EBD6B, 0x2EBD6B, 0xF2B01E, 0x2E9BFF].map((c, i) =>
    pieza(cajaBisel(7 * MM, 2 * MM, 3 * MM, 0.5 * MM), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }),
      (i - 1.5) * 12 * MM, 45.5 * MM, -D / 2 + 30 * MM));
  const plata = mat(0xC9CDD1, 0.85, 0.3);
  const conectores = [];
  for (let i = 0; i < 8; i++) {
    const x = -W / 2 + 32 * MM + i * 19 * MM;
    const cuerpo = pieza(new THREE.CylinderGeometry(5.5 * MM, 5.5 * MM, 12 * MM, 40), plata.clone(), x, 20 * MM, D / 2 + 6 * MM);
    cuerpo.rotation.x = Math.PI / 2; conectores.push(cuerpo);
    const tuerca = pieza(new THREE.CylinderGeometry(7 * MM, 7 * MM, 4 * MM, 6), plata, x, 20 * MM, D / 2 + 2 * MM);
    tuerca.rotation.x = Math.PI / 2;
  }
  pieza(cajaBisel(34 * MM, 9 * MM, 8 * MM, MM), mat(0x2EAA55, 0.1, 0.5), W / 2 - 40 * MM, 21 * MM, D / 2 + 4 * MM);   // GPIO
  pieza(cajaBisel(14 * MM, 12 * MM, 16 * MM, MM), negro, W / 2 + 2 * MM, 20 * MM, 20 * MM);                            // Ethernet
  return { grupo: g, leds, aletas, conectores, puerto: new V3(-W / 2 + 32 * MM, 20 * MM, D / 2 + 12 * MM), red: new V3(W / 2 + 9 * MM, 20 * MM, 20 * MM) };
}
