// El electrón convertido en información: un cubo de cristal cian que brilla, con el registro escrito dentro (el tag, la
// temperatura y los otros datos que recogió el PLC) y los mismos ojos que tenía de electrón, que parpadean igual. Lado
// 1 con escala 1. actualizar(t, cam) lo gira despacio hacia la cámara y hace parpadear los ojos.

import * as THREE from 'three';
import { cajaRedonda } from './tag.js';

export const REGISTRO = [
  ['SID-0042', '#9fe8ff'],
  ['T    41.8 °C', '#ffb07a'],
  ['P    2.41 bar', '#e8f6ff'],
  ['PROX 1  IO-L 63 %', '#e8f6ff'],
];

function texturaRegistro() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.font = '700 60px Oxanium, "Segoe UI", monospace';
  g.shadowColor = 'rgba(61,200,255,.9)'; g.shadowBlur = 14;
  REGISTRO.forEach(([txt, col], i) => { g.fillStyle = col; g.fillText(txt, 28, 250 + i * 70); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearPaquete() {
  const g = new THREE.Group();
  const cuerpo = new THREE.Group(); g.add(cuerpo);
  const vidrio = new THREE.Mesh(cajaRedonda(1, 1, 1, 0.14, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x041624, transparent: true, opacity: 0.72, roughness: 0.12, metalness: 0.2,
      emissive: 0x0b5d96, emissiveIntensity: 0.35, depthWrite: false }));
  cuerpo.add(vidrio);
  // el borde que brilla (fresnel: los cantos y las caras de lado, no la de delante) y el registro, por dentro
  const borde = new THREE.Mesh(cajaRedonda(1.04, 1.04, 1.04, 0.15, 0.06), new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0.3, 1.1, 1.8) }, opacity: { value: 0.6 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying vec3 vN; varying vec3 vV;
      void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(color * opacity * pow(f, 2.5), 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  cuerpo.add(borde);
  const texto = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: texturaRegistro(), transparent: true, toneMapped: false, depthWrite: false }));
  texto.position.z = 0.46; cuerpo.add(texto);
  // los ojos, arriba en la cara de delante, como los del electrón
  const negro = new THREE.MeshBasicMaterial({ color: 0x0a0d14 }), blanco = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const ojos = [-1, 1].map((s) => {
    const o = new THREE.Group();
    // sobre el cristal oscuro, con el blanco del ojo detrás (de electrón no lo necesitaba: el blanco era él)
    const esclera = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.6, 1.8), toneMapped: false }));
    esclera.scale.set(0.085, 0.11, 1); esclera.position.z = -0.001;
    const iris = new THREE.Mesh(new THREE.CircleGeometry(1, 28), negro); iris.scale.set(0.05, 0.07, 1);
    const chispa = new THREE.Mesh(new THREE.CircleGeometry(1, 16), blanco); chispa.scale.setScalar(0.018); chispa.position.set(0.017, 0.025, 0.001);
    o.add(esclera, iris, chispa); o.position.set(s * 0.13, 0.27, 0.52); cuerpo.add(o);
    return o;
  });
  const luz = new THREE.PointLight(0x3dc8ff, 2, 3, 2); g.add(luz);
  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), arriba = new THREE.Vector3(0, 1, 0);
  return {
    grupo: g, vidrio, borde,
    actualizar(t, cam, { mirada = 0, brillo = 0 } = {}) {
      // de frente a la cámara, con un balanceo leve
      m.lookAt(cam.position, g.getWorldPosition(new THREE.Vector3()), arriba); q.setFromRotationMatrix(m);
      cuerpo.quaternion.copy(q); cuerpo.rotateY(0.25 * Math.sin(t * 0.9)); cuerpo.rotateX(0.08 * Math.sin(t * 1.3));
      const parpadeo = (t % 3.3) < 0.13 ? 0.12 : 1;
      ojos.forEach((o, i) => { o.scale.set(1, parpadeo, 1); o.position.x = (i ? 1 : -1) * 0.13 + mirada * 0.04; });
      vidrio.material.emissiveIntensity = 0.45 + 0.8 * brillo;
      borde.material.uniforms.opacity.value = 0.6 + 0.8 * brillo;
    },
  };
}
