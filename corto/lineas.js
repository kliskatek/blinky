// Líneas de luz con grosor (las aristas de la radiografía, la nave del MES, los rayos de la media). Las de WebGL miden
// siempre un píxel, sin antialias: en el vídeo, que se pinta al doble y se reduce, se quedaban en medio píxel y se
// apagaban. Estas miden ancho píxeles en un cuadro de 1080 de alto, a la resolución que se pinte (corto.js, medirLineas).
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const hechos = new Set(), res = new THREE.Vector2(1920, 1080);
const grosor = (m) => Math.max(1, m.userData.ancho * res.y / 1080);

export function matLinea({ ancho = 1.3, ...resto } = {}) {
  const m = new LineMaterial({ transparent: true, depthWrite: false, ...resto });
  m.userData.ancho = ancho; m.resolution.copy(res); m.linewidth = grosor(m);
  hechos.add(m);
  return m;
}

// las aristas de una geometría (como EdgesGeometry + LineSegments)
export function aristas(geometria, material) {
  return new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geometria)), material);
}

// n segmentos que se mueven: poner(k, a, b) en cada cuadro (sin rehacer el búfer: setPositions crea uno nuevo cada vez)
export function segmentos(n, material) {
  const geo = new LineSegmentsGeometry().setPositions(new Float32Array(n * 6));
  const malla = new LineSegments2(geo, material); malla.frustumCulled = false;
  const datos = geo.attributes.instanceStart.data;
  const poner = (k, a, b) => { datos.array.set([a.x, a.y, a.z, b.x, b.y, b.z], 6 * k); datos.needsUpdate = true; };
  return { malla, poner };
}

// el tamaño al que se pinta (en píxeles de verdad)
export function medirLineas(w, h) {
  res.set(w, h);
  hechos.forEach((m) => { m.resolution.copy(res); m.linewidth = grosor(m); });
}
