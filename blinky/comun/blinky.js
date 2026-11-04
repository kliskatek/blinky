// Blinky en el episodio 2: el mismo del episodio 1 (blinky/comun/electron.js), con las formas nuevas del guion. Lo que cada
// plano le pone en cada cuadro, además de lo de siempre (ruta, tam, brillo, calor, ojos, mirada, estela, forma, sorpresa):
//   tinte, tintaK   otro color (el turquesa del BLE, el violeta del NFC) y cuánto (0-1)
//   onda            la longitud de onda de la estela de fotón (1, la de siempre; 0,36, la de 2,4 GHz: casi tres veces más corta)
//   gotas           0-1: le salen gotitas que le resbalan (la humedad)
//   apretado        0-1: se achata como una pelota apretada (la presión)
//   anillo          0-1: deja de ser bolita y es un anillo de campo magnético, con la cara arriba (el NFC)
// El director llama a reiniciar() antes de cada cuadro (todo eso, y ojos, estela, calor y brillo, vuelve a lo de siempre). Un plano puede tener más de un Blinky
// (los tres del BLE): new Blinky(escena, ren), y los reinicia y actualiza él.

import * as THREE from 'three';
import { Electron } from './electron.js';

const R = 0.12;                 // (el radio del núcleo con tam = 1, el de electron.js)
const N = 112, PASO = 0.006;    // (los de la estela, los de electron.js)
export const TURQUESA = new THREE.Color(0.15, 0.95, 0.85), VIOLETA = new THREE.Color(0.72, 0.38, 1.0);

export class Blinky extends Electron {
  constructor(escena, ren, opc) {
    super(escena, ren, opc);
    this.raiz.visible = this.estelaP.visible = false;      // (hasta su primer cuadro: si no, las copias del plano 6 salían en el origen de todos)
    this.reiniciar();
    // las gotas: gotitas azul claro que resbalan por delante
    const gota = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.85, 1.6), transparent: true, toneMapped: false, depthWrite: false });
    this.matGota = gota;
    this.gotasM = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 16, 12), gota); m.scale.set(1, 1.5, 1); m.renderOrder = 22;
      this.raiz.add(m); return m;
    });
    // el anillo: un toro que brilla, y otro más gordo, tenue, de halo
    this.matAnillo = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.matAnillo2 = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    this.toro = new THREE.Group(); this.raiz.add(this.toro);
    this.toro.add(new THREE.Mesh(new THREE.TorusGeometry(R * 1.5, R * 0.3, 24, 96), this.matAnillo));
    this.toro.add(new THREE.Mesh(new THREE.TorusGeometry(R * 1.5, R * 0.6, 24, 96), this.matAnillo2));
    this.q = new THREE.Quaternion(); this.eje = new THREE.Vector3(); this.col = new THREE.Color(); this.tmp = new THREE.Vector3();
  }

  reiniciar() {
    this.forma = 0; this.sorpresa = 0;
    this.tinte = null; this.tintaK = 0; this.onda = 1; this.gotas = 0; this.apretado = 0; this.anillo = 0;
    this.ojos = 1; this.estela = 1; this.calor = 0; this.brillo = 0;   // (los del episodio 1: no todos los planos los ponen)
  }

  actualizar(t, cam) {
    super.actualizar(t, cam);
    if (!this.visible) return;
    // el color: el de siempre, hacia el tinte
    const col = this.col.copy(this.color);
    if (this.tinte && this.tintaK > 0) col.lerp(this.tinte, this.tintaK);
    const k = 1.05 + 2.2 * this.brillo + 0.8 * this.calor * (0.6 + 0.4 * Math.sin(t * 9)) + 0.2 * this.forma;
    this.matNucleo.color.copy(col).multiplyScalar(k);
    this.matPiel.uniforms.color.value.copy(col).multiplyScalar(3.2);
    this.matHalo.color.copy(col).multiplyScalar(0.5 + 0.8 * this.brillo);
    this.matRayos.color.copy(col).multiplyScalar(0.9 * this.forma);
    this.matEstela.uniforms.color.value.copy(col).multiplyScalar(0.55 + this.brillo);

    // la onda de la estela, más apretada (el fotón de 2,4 GHz)
    if (this.onda !== 1 && this.forma > 0.01 && this.ruta) this.ondular(t, cam);

    // apretado: se achata (y se ensancha un poco)
    const a = this.apretado, ani = this.anillo;
    this.raiz.scale.set(this.tam * (1 + 0.35 * a), this.tam * (1 - 0.42 * a), this.tam * (1 + 0.35 * a));

    // las gotas, por delante (hacia la cámara), resbalando cada una a su ritmo
    this.matGota.opacity = 0.9 * this.gotas;
    this.gotasM.forEach((m, i) => {
      m.visible = this.gotas > 0.01;
      if (!m.visible) return;
      const fase = (t * 0.8 + i * 0.37) % 1, ang = -1.1 + i * 0.44;
      this.tmp.set(Math.sin(ang) * R * 0.9, R * (0.9 - 2.0 * fase), Math.cos(ang) * R * 0.45 + R * 0.55).applyQuaternion(cam.quaternion);
      m.position.copy(this.tmp); m.quaternion.copy(cam.quaternion);
      m.scale.set(1, 1.5, 1).multiplyScalar(Math.sin(Math.PI * fase) * 1.1);
    });

    // el anillo: el núcleo se recoge, el toro aparece de cara a la cámara (algo tumbado, para que se lea como un aro) y la
    // cara sube a su borde de arriba
    this.toro.visible = ani > 0.01;
    this.nucleo.visible = ani < 0.98;
    if (ani > 0.01) {
      this.nucleo.scale.multiplyScalar(1 - ani);
      this.matAnillo.color.copy(col).multiplyScalar(1.6 + 0.4 * Math.sin(t * 6));
      this.matAnillo2.color.copy(col).multiplyScalar(0.8);
      this.toro.quaternion.copy(cam.quaternion); this.toro.rotateX(-0.95);
      this.toro.scale.setScalar(ani * (1 + 0.06 * Math.sin(t * 5)));
      this.halo.scale.multiplyScalar(1 + 0.4 * ani);
    }
    this.cara.position.copy(this.arribaCam).multiplyScalar(R * 1.4 * ani);
  }

  // la estela de fotón, como en electron.js, con la onda onda veces más larga
  ondular(t, cam) {
    const e = this.estelaP.geometry.attributes, vel = this.v.length();
    if (vel < 1e-3) return;
    this.perp.crossVectors(this.v, this.haciaCam).normalize().multiplyScalar(R * this.tam * 0.9 * this.forma);
    const p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const ti = t - i * PASO;
      const vivo = ti >= this.rutaDesde;
      p.copy(vivo ? this.ruta(ti) : this.p1);
      p.addScaledVector(this.perp, Math.min(1, i / 12) * Math.sin((i * 0.275 - t * 26) / this.onda));
      e.position.array[3 * i] = p.x; e.position.array[3 * i + 1] = p.y; e.position.array[3 * i + 2] = p.z;
    }
    e.position.needsUpdate = true;
  }
}
