// El depósito del condensador en 3D (la presa, como en el episodio de SparkLink): un cilindro de cristal encima del
// condensador, el líquido de luz que sube con la carga, la marca de lleno y, arriba, la compuerta (el monitor): dos hojas
// que se abren a los lados. El origen del grupo, el fondo del depósito, en su eje; R, el radio, y HT, el alto, en las
// unidades de la escena. poner({ ve, nivel, abre, liquido, brillo }): cuánto se ve, el nivel (0-1 del alto), cuánto
// está abierta la compuerta, la opacidad del líquido y el brillo de la compuerta (al abrirse).

import * as THREE from 'three';
import { aristas, matLinea } from '../../comun/motor/lineas.js';

export function crearDeposito({ R, HT, lleno = 0.85 }) {
  const g = new THREE.Group();
  const vidrio = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HT, 64, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
  vidrio.position.y = HT / 2; g.add(vidrio);
  const borde = matLinea({ color: new THREE.Color(0.55, 0.85, 1.4), opacity: 0.8, toneMapped: false, ancho: 1.4 });
  for (const y of [0, HT]) { const l = aristas(new THREE.CylinderGeometry(R, R, R * 0.004, 64, 1, true), borde); l.position.y = y; g.add(l); }
  const liquido = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.96, 1, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 1.4), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
  g.add(liquido);
  const marca = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, R * 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4), toneMapped: false, transparent: true }));
  marca.rotation.x = Math.PI / 2; marca.position.y = lleno * HT; g.add(marca);
  const matPuerta = new THREE.MeshStandardMaterial({ color: 0x2a6fc0, metalness: 0.4, roughness: 0.35, emissive: 0x0a2a55, transparent: true });
  const hojas = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(R * 1.1, R * 0.107, R * 2.3), matPuerta); m.userData.s = s; g.add(m); return m; });
  const poner = ({ ve = 1, nivel = 0, abre = 0, liquido: liq = 0.35, brillo = 0 }) => {
    g.visible = ve > 0.01;
    vidrio.material.opacity = 0.18 * ve; borde.opacity = 0.8 * ve; marca.material.opacity = ve; matPuerta.opacity = ve;
    liquido.scale.y = Math.max(0.001, HT * nivel); liquido.position.y = HT * nivel / 2; liquido.material.opacity = ve * liq;
    hojas.forEach((m) => m.position.set(m.userData.s * R * (0.55 + 1.3 * abre), HT + R * 0.07, 0));
    matPuerta.emissive.setRGB(0.04 + 0.5 * brillo, 0.16 + 0.4 * brillo, 0.33);
  };
  poner({ ve: 0 });
  return { grupo: g, poner };
}
