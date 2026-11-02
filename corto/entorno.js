// La luz que se refleja: un entorno (escena.environment) para que los metales, el cobre, el oro, la chapa y el cristal
// reflejen algo, como en una nave de verdad, y no solo los brillos de las luces. Es una nave en penumbra, hecha aquí y
// convertida en mapa de entorno (PMREM): paredes y suelo oscuros, filas de lámparas de techo (los brillos alargados que
// se ven en lo pulido), un ventanal frío a un lado y un rebote cálido al otro. Sombras: las de la luz principal de cada
// plano (corto.js, ajustarSombra), que siguen a lo que encuadra la cámara, a la escala que sea.
import * as THREE from 'three';

export function crearEntorno(ren) {
  const e = new THREE.Scene();
  const plano = (w, h, color, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); e.add(m); return m;
  };
  const sala = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 40), new THREE.MeshBasicMaterial({ color: 0x15181d, side: THREE.BackSide }));
  sala.position.y = 6; e.add(sala);
  plano(40, 40, 0x24272b, 0, -0.99, 0, -Math.PI / 2);                                       // el suelo, algo más claro
  const lampara = new THREE.Color(5, 4.8, 4.4);
  for (let x = -15; x <= 15; x += 6) for (const z of [-10, 0, 10]) plano(1.2, 7, lampara, x, 12.9, z, Math.PI / 2);   // lámparas
  plano(16, 6, new THREE.Color(0.55, 0.75, 1.15), 0, 5, -19.9);                              // el ventanal, frío
  plano(10, 4, new THREE.Color(0.9, 0.6, 0.35), 19.9, 2, 0, 0, -Math.PI / 2);                 // un rebote cálido
  plano(8, 3, new THREE.Color(0.35, 0.45, 0.6), -19.9, 3, 4, 0, Math.PI / 2);
  const pmrem = new THREE.PMREMGenerator(ren);
  const tex = pmrem.fromScene(e, 0.03).texture;
  pmrem.dispose();
  e.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}
