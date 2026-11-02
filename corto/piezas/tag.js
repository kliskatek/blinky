// Lo que queda del tag dibujado de los primeros planos (el de la web, makeTag de public/k3d/k3d-core.js): la caja de
// esquinas redondeadas, que usan otras piezas. El tag de los planos 2 a 5 es ya el SenseRead-AT de verdad, la placa de
// KiCad (piezas/senseread.js, con corto2/piezas/tags.js).

import * as THREE from 'three';

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
    depth: Math.max(h - 2 * b, 1e-3), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 12 });
  g.rotateX(-Math.PI / 2); g.translate(0, b - h / 2, 0);
  return g;
}
