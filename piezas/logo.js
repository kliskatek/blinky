// El logo flotante de la portada: la "k«" (la última k del logotipo y los dos chevrones, de assets/kliskatek.svg),
// extruido, el mismo de k3d-cases.js (escena cover). Lo usan el plano 1 (de donde nace el electrón) y la gorra del
// plano 10 (adonde vuelve). En unidades del SVG: mide ~17,3 de ancho y ~12,5 de alto, centrado; la cara de delante,
// en z = FRENTE.

import * as THREE from 'three';

const LOGO_K = [
  'M84.8449 56.257 84.8449 68.7875 86.8262 68.7875 86.8262 66.2647 87.9771 65.0296 89.2814 63.6065 ' +
  '92.3969 60.2366 92.228 59.8976 90.2803 59.8976 86.8262 63.6736 86.8262 56.257Z',
  'M88.5812 65.9221 90.5175 68.7875 92.4646 68.7875 92.6341 68.4491 89.8967 64.4828Z',
];
const LOGO_CHEVRONS = [
  'M95.1765 59.9138 91.8293 64.3406 95.1868 68.7967 97.3608 68.8037 97.5293 68.4652 94.1531 64.347 97.5159 60.2114 97.3464 59.922Z',
  'M99.7656 59.8984 96.4183 64.3252 99.7758 68.7813 101.95 68.7883 102.118 68.4498 98.7422 64.3317 102.105 60.1961 101.935 59.9067Z',
];
export const LOGO_C = [93.48, 62.53];
export const EXT = { depth: 1.5, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 3, curveSegments: 1 };
export const FRENTE = EXT.depth + EXT.bevelThickness;
export const ESQUINA = [84.8449 - 0.15, 56.257 - 0.15];          // arriba a la izquierda de la k, por fuera del bisel

function forma(d) {
  const n = d.replace(/[MZ]/g, ' ').trim().split(/\s+/).map(Number), s = new THREE.Shape();
  for (let i = 0; i < n.length; i += 2) {
    const x = n[i] - LOGO_C[0], y = LOGO_C[1] - n[i + 1];
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

// el logo, a la escala `escala` (unidades del mundo por unidad del SVG); `ext` cambia la extrusión (en la gorra, fina)
export function crearLogo(escala = 1, ext = EXT) {
  const g = new THREE.Group(); g.scale.setScalar(escala);
  const mat = (color, emissive) => new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.3, metalness: 0.25 });
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(LOGO_K.map(forma), ext), mat(0x0080ff, 0x001a33)));
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(LOGO_CHEVRONS.map(forma), ext), mat(0xff8000, 0x2b1300)));
  return g;
}
