// Un cartel plano con texto dibujado en un canvas (rótulos, la tabla del ERP, los paneles del MES). pintar(lineas) lo
// redibuja, solo si cambia: lineas = [{ txt, col, y, size, bg, x, alinea }], en píxeles de un canvas de 1024 de ancho.

import * as THREE from 'three';

export function cartel(lineas, w, h, { fondo = 'rgba(6,24,40,.78)', borde = '#3dc8ff' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let ultimo = '';
  const pintar = (ls) => {
    const clave = JSON.stringify(ls); if (clave === ultimo) return; ultimo = clave;     // solo si cambia
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = fondo; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = borde; g.lineWidth = 6; g.strokeRect(3, 3, c.width - 6, c.height - 6);
    ls.forEach(({ txt, col, y, size = 44, bg, x = 32, alinea = 'left', ancho }) => {   // ancho: si no cabe, se estrecha
      if (bg) { g.fillStyle = bg; g.fillRect(12, y - size, c.width - 24, size * 1.35); }
      g.font = `600 ${size}px Oxanium, "Segoe UI", monospace`; g.fillStyle = col; g.textAlign = alinea; g.fillText(txt, x, y, ancho);
    });
    tex.needsUpdate = true;
  };
  pintar(lineas);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
  return { malla: m, pintar };
}
