// Blinky convertido en alerta: un triángulo rojo de aviso, de cantos redondos, con la admiración blanca arriba y sus
// mismos ojos (con su blanco) debajo; si le gusta, entorna los ojos y sonríe. Late en rojo, con su halo. Lado 1,2 con
// escala 1, centrado en su centro. actualizar(t, cam) lo gira hacia la cámara, lo hace latir y parpadear.

import * as THREE from 'three';
import { lerp, texturaPunto } from '../../../comun/motor/utiles.js';

const L = 1.2, H = L * Math.sqrt(3) / 2, RC = 0.12;                     // lado, altura y radio de las esquinas

function triangulo() {
  const v = [[0, (2 * H) / 3], [-L / 2, -H / 3], [L / 2, -H / 3]].map(([x, y]) => new THREE.Vector2(x, y));
  const s = new THREE.Shape();
  v.forEach((p, i) => {
    const a = v[(i + 2) % 3], b = v[(i + 1) % 3];
    const p0 = p.clone().lerp(a, RC / L * 1.8), p1 = p.clone().lerp(b, RC / L * 1.8);
    if (i === 0) s.moveTo(p0.x, p0.y); else s.lineTo(p0.x, p0.y);
    s.quadraticCurveTo(p.x, p.y, p1.x, p1.y);
  });
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 6, curveSegments: 24 });
  g.translate(0, 0, -0.07);
  return g;
}

export function crearAlerta() {
  const g = new THREE.Group();
  const cuerpo = new THREE.Group(); g.add(cuerpo);
  const rojo = new THREE.MeshStandardMaterial({ color: 0xc8161b, emissive: 0xff1a1a, emissiveIntensity: 0.5, roughness: 0.32, metalness: 0.1 });
  cuerpo.add(new THREE.Mesh(triangulo(), rojo));
  const Z = 0.125;                                                        // la cara de delante (con el bisel)
  const blanco = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.45, 1.4), toneMapped: false });
  // la admiración
  const palo = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.17, 8, 24), blanco); palo.position.set(0, 0.27, Z); cuerpo.add(palo);
  const punto = new THREE.Mesh(new THREE.CircleGeometry(0.042, 40), blanco); punto.position.set(0, 0.06, Z); cuerpo.add(punto);
  // los ojos, como los del paquete
  const negro = new THREE.MeshBasicMaterial({ color: 0x0a0d14 }), brilloOjo = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const ojos = [-1, 1].map((s) => {
    const o = new THREE.Group();
    const esclera = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.25, 1.25), toneMapped: false }));
    esclera.scale.set(0.068, 0.085, 1); esclera.position.z = -0.001;
    const iris = new THREE.Mesh(new THREE.CircleGeometry(1, 64), negro); iris.scale.set(0.04, 0.055, 1);
    const chispa = new THREE.Mesh(new THREE.CircleGeometry(1, 32), brilloOjo); chispa.scale.setScalar(0.014); chispa.position.set(0.014, 0.02, 0.001);
    o.add(esclera, iris, chispa); o.position.set(s * 0.15, -0.1, Z); cuerpo.add(o);
    return o;
  });
  // la sonrisa (solo cuando le gusta)
  const sonrisa = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 16, 48, Math.PI), negro);
  sonrisa.rotation.z = Math.PI; sonrisa.position.set(0, -0.2, Z + 0.002); cuerpo.add(sonrisa);
  // el halo, detrás, y la luz
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaPunto(), color: new THREE.Color(1.6, 0.18, 0.12), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(1.9); g.add(halo);
  const luz = new THREE.PointLight(0xff3020, 2.5, 4, 2); g.add(luz);

  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), arriba = new THREE.Vector3(0, 1, 0);
  return {
    grupo: g, cuerpo,
    actualizar(t, cam, { mirada = 0, brillo = 0, feliz = 0, giro = 0 } = {}) {
      m.lookAt(cam.position, g.getWorldPosition(new THREE.Vector3()), arriba); q.setFromRotationMatrix(m);
      cuerpo.quaternion.copy(q); cuerpo.rotateY(0.2 * Math.sin(t * 0.9) + giro); cuerpo.rotateZ(0.06 * Math.sin(t * 1.3));
      const late = 0.5 + 0.5 * Math.sin(t * 7);
      rojo.emissiveIntensity = 0.45 + 0.35 * late + 0.8 * brillo;
      halo.material.opacity = 0.3 + 0.15 * late + 0.4 * brillo;
      luz.intensity = 2 + 1.5 * late;
      const parpadeo = (t % 3.1) < 0.13 ? 0.12 : 1;
      ojos.forEach((o, i) => {
        o.scale.set(1, parpadeo * lerp(1, 0.5, feliz), 1);
        o.position.set((i ? 1 : -1) * 0.15 + mirada * 0.035, -0.1 + 0.02 * feliz, Z);
      });
      sonrisa.visible = feliz > 0.02; sonrisa.scale.setScalar(Math.max(0.01, feliz));
    },
  };
}
