// El protagonista: Blinky, una partícula de energía que se disfraza de fotón, de electrón o de dato (de dato lo pinta
// piezas/paquete.js). Un núcleo que brilla (con el bloom del director), un halo, dos ojos que parpadean y una estela.
// Quieto mira a cámara; cuando corre, mira hacia donde va, aunque así la cámara le vea de lado o de espaldas.
// Todo sale del tiempo del plano, no de lo que pasó en el cuadro anterior: el plano le da su ruta (una función
// t → posición) y la estela se dibuja muestreando esa ruta hacia atrás, así que saltar con la barra o volver atrás da
// siempre el mismo dibujo.
//
// Lo que cada plano le pone, en cada cuadro:
//   ruta(t)      posición en el mundo; null, sin estela
//   rutaDesde    segundo del plano en que empieza la ruta (antes de eso no hay estela)
//   visible, tam (escala), brillo (0-1 extra), calor (0 frío, azul · 1 caliente, rojo),
//   ojos (0 cerrados · 1 abiertos), mirada (x, y en pantalla, -1..1), estela (0-1),
//   forma (0 electrón · 1 fotón: dorado, con destellos y la estela en onda), sorpresa (0-1: los ojos muy abiertos).
//   forma y sorpresa las pone a 0 el director en cada cuadro.
// Con { cara: false } sale sin ojos: los otros fotones y electrones que viajan con él (los mueve su plano, en su grupo).

import * as THREE from 'three';

const R = 0.12;                // radio del núcleo con tam = 1
const N = 112, PASO = 0.006;   // puntos de la estela y segundos entre ellos (juntos: a mucha velocidad no se ven cuentas sueltas)

const FRIO = new THREE.Color(0.3, 0.68, 1.0), CALIENTE = new THREE.Color(1.0, 0.3, 0.05), FOTON = new THREE.Color(1.0, 0.72, 0.2);

function texturaHalo() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.55)');
  gr.addColorStop(0.45, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// los destellos del fotón: cuatro puntas finas
function texturaRayos() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.translate(128, 128);
  for (const [largo, grueso, giro] of [[124, 5, 0], [124, 5, Math.PI / 2], [70, 3, Math.PI / 4], [70, 3, -Math.PI / 4]]) {
    g.save(); g.rotate(giro);
    const gr = g.createLinearGradient(-largo, 0, largo, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-largo, 0); g.lineTo(0, -grueso); g.lineTo(largo, 0); g.lineTo(0, grueso); g.fill();
    g.restore();
  }
  return new THREE.CanvasTexture(c);
}

export class Electron {
  constructor(escena, ren, { cara = true } = {}) {
    this.ren = ren;
    Object.assign(this, { ruta: null, rutaDesde: 0, visible: false, tam: 1, brillo: 0, calor: 0, ojos: 1,
      mirada: new THREE.Vector2(), estela: 1, forma: 0, sorpresa: 0 });

    this.raiz = new THREE.Group(); escena.add(this.raiz);
    this.color = new THREE.Color();

    // el núcleo: color por encima de 1 y sin tone mapping, para que el bloom lo haga brillar
    this.matNucleo = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.nucleo = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), this.matNucleo);
    this.raiz.add(this.nucleo);
    // la piel: un borde que brilla más que el centro (fresnel), para que tenga volumen y no sea un disco plano
    this.matPiel = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV;
        void main() { float f = max(0.0, 1.0 - abs(dot(normalize(vN), normalize(vV))));
          gl_FragColor = vec4(color * pow(f, 2.2), 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.piel = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 48), this.matPiel);
    this.nucleo.add(this.piel);

    this.matHalo = new THREE.SpriteMaterial({ map: texturaHalo(), blending: THREE.AdditiveBlending, depthWrite: false,
      transparent: true, toneMapped: false });
    this.halo = new THREE.Sprite(this.matHalo); this.halo.scale.setScalar(R * 9);
    this.raiz.add(this.halo);
    this.matRayos = new THREE.SpriteMaterial({ map: texturaRayos(), blending: THREE.AdditiveBlending, depthWrite: false,
      transparent: true, toneMapped: false });
    this.rayos = new THREE.Sprite(this.matRayos); this.raiz.add(this.rayos);

    // la cara: dos ojos ovalados con su brillo, en un grupo que mira hacia donde mira él. Se pintan los últimos (por
    // encima de la estela y del halo, que son aditivos y los aclararían), pero con prueba de profundidad: si mira de
    // lado, el ojo de atrás lo tapa el núcleo
    this.cara = new THREE.Group(); this.cara.visible = this.conCara = cara; this.raiz.add(this.cara);
    const negro = new THREE.MeshBasicMaterial({ color: 0x0a0d14, transparent: true });
    const blanco = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true });
    this.ojosM = [-1, 1].map((s) => {
      const ojo = new THREE.Group();
      const iris = new THREE.Mesh(new THREE.CircleGeometry(1, 64), negro); iris.scale.set(0.25, 0.36, 1);
      const chispa = new THREE.Mesh(new THREE.CircleGeometry(1, 32), blanco); chispa.scale.setScalar(0.085);
      chispa.position.set(0.08, 0.13, 0.001);
      iris.renderOrder = 20; chispa.renderOrder = 21;
      ojo.add(iris, chispa);
      ojo.position.set(s * 0.4 * R, 0.12 * R, R * 1.02);
      ojo.scale.setScalar(R);
      this.cara.add(ojo);
      return ojo;
    });

    // la estela: puntos que se apagan y adelgazan hacia atrás
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3);
    const alfa = new Float32Array(N), tam = new Float32Array(N);
    for (let i = 0; i < N; i++) { const k = 1 - i / N; tam[i] = R * 2.1 * Math.pow(k, 0.8); }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('alfa', new THREE.BufferAttribute(alfa, 1));
    geo.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
    this.matEstela = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() }, escalaPx: { value: 600 } },
      vertexShader: `attribute float alfa; attribute float tam; uniform float escalaPx; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = alfa;
          gl_PointSize = tam * escalaPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 color; varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float k = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(color * vA * k * k, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.estelaP = new THREE.Points(geo, this.matEstela);
    this.estelaP.frustumCulled = false;
    escena.add(this.estelaP);

    this.v = new THREE.Vector3(); this.p0 = new THREE.Vector3(); this.p1 = new THREE.Vector3();
    this.dir = new THREE.Vector3(); this.qVa = new THREE.Quaternion(); this.qOjo = new THREE.Quaternion();
    this.m4 = new THREE.Matrix4(); this.arribaCam = new THREE.Vector3(); this.haciaCam = new THREE.Vector3();
    this.perp = new THREE.Vector3(); this.cero = new THREE.Vector3();
  }

  actualizar(t, cam) {
    this.raiz.visible = this.visible;
    this.estelaP.visible = this.visible && !!this.ruta && this.estela > 0.01;
    if (!this.visible) return;

    // posición y velocidad, de la ruta del plano
    if (this.ruta) {
      this.p1.copy(this.ruta(t));
      this.p0.copy(this.ruta(Math.max(this.rutaDesde, t - 0.02)));
      this.v.subVectors(this.p1, this.p0).divideScalar(0.02);
      this.raiz.position.copy(this.p1);
    } else this.v.set(0, 0, 0);
    const temblor = this.calor * 0.012 * this.tam;
    this.raiz.position.x += temblor * Math.sin(t * 61); this.raiz.position.y += temblor * Math.sin(t * 47 + 1);

    // color: de azul a rojo con el calor, dorado de fotón, y más intenso con el brillo
    this.color.copy(FRIO).lerp(CALIENTE, this.calor).lerp(FOTON, 0.8 * this.forma);
    const k = 1.05 + 2.2 * this.brillo + 0.8 * this.calor * (0.6 + 0.4 * Math.sin(t * 9)) + 0.2 * this.forma;
    this.matNucleo.color.copy(this.color).multiplyScalar(k);
    this.matPiel.uniforms.color.value.copy(this.color).multiplyScalar(3.2);
    this.matHalo.color.copy(this.color).multiplyScalar(0.5 + 0.8 * this.brillo);
    this.halo.scale.setScalar(R * (5.5 + 5 * this.brillo + 2 * this.calor + 1.2 * this.forma));
    this.raiz.scale.setScalar(this.tam);
    // el fotón: destellos que giran y laten
    this.rayos.visible = this.forma > 0.01;
    this.rayos.scale.setScalar(R * 7 * this.forma * (1 + 0.15 * Math.sin(t * 11)));
    this.matRayos.rotation = 0.6 * t;
    this.matRayos.color.copy(this.color).multiplyScalar(0.9 * this.forma);

    // se estira en la dirección en que corre (y de fotón vibra)
    const vel = this.v.length(), estira = Math.min(0.7, vel * 0.035 / Math.max(this.tam, 0.2));
    if (vel > 1e-3) this.nucleo.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), this.v.clone().normalize());
    const vibra = 1 + 0.05 * this.forma * Math.sin(t * 34);
    this.nucleo.scale.set((1 + estira) * vibra, (1 - estira * 0.35) * vibra, (1 - estira * 0.35) * vibra);

    // hacia dónde mira: quieto, a cámara; corriendo, hacia donde va. La dirección sale de la ruta en una ventana de
    // 0,2 s (así no da tirones en las esquinas) y pesa más cuanto más corre (en radios por segundo)
    let peso = 0;
    if (this.ruta) {
      this.dir.subVectors(this.ruta(t + 0.06), this.ruta(Math.max(this.rutaDesde, t - 0.14)));
      const rapidez = this.dir.length() / 0.2 / (R * Math.max(this.tam, 0.05));
      peso = THREE.MathUtils.smoothstep(rapidez, 3, 12);
    }
    this.cara.quaternion.copy(cam.quaternion);
    this.arribaCam.set(0, 1, 0).applyQuaternion(cam.quaternion);
    this.haciaCam.set(0, 0, 1).applyQuaternion(cam.quaternion);
    if (peso > 0) {
      this.dir.normalize();
      this.m4.lookAt(this.dir, this.cero, this.arribaCam);
      this.qVa.setFromRotationMatrix(this.m4);
      this.cara.quaternion.slerp(this.qVa, peso);
    }
    // los ojos van en la superficie (la del núcleo estirado, en la dirección en que mira), pero medio girados a cámara
    // para que de perfil no queden en una raya
    this.dir.set(0, 0, 1).applyQuaternion(this.cara.quaternion);
    const c = vel > 1e-3 ? Math.abs(this.dir.dot(this.v) / vel) : 0;
    const a = 1 + estira, b = 1 - 0.35 * estira, radio = 1 / Math.sqrt((c * c) / (a * a) + (1 - c * c) / (b * b));
    this.qOjo.copy(this.cara.quaternion).invert().multiply(this.qVa.copy(this.cara.quaternion).slerp(cam.quaternion, 0.6));
    const parpadeo = (t % 3.3) < 0.13 && this.sorpresa < 0.5 ? 0.12 : 1, abre = 1 + 0.35 * this.sorpresa;
    // de espaldas a la cámara, los ojos (medio girados a ella) asomaban por encima del núcleo como orejas: se van
    const frente = THREE.MathUtils.smoothstep(this.dir.dot(this.haciaCam), -0.35, 0.05);
    this.cara.visible = this.conCara && frente > 0.01;
    this.ojosM.forEach((o, i) => {
      o.scale.set(R * abre * frente, R * abre * frente * Math.max(0.06, this.ojos * parpadeo), R);
      o.position.x = (i ? 1 : -1) * 0.4 * R + this.mirada.x * 0.22 * R * (1 - 0.6 * peso);
      o.position.y = (0.12 + 0.06 * this.sorpresa) * R + this.mirada.y * 0.18 * R * (1 - 0.6 * peso);
      o.position.z = R * (radio * 1.02 + 0.04);
      o.quaternion.copy(this.qOjo);
    });

    // la estela: empieza detrás del cuerpo (pegada a él taparía la cara); de fotón, ondula de lado en pantalla
    const e = this.estelaP.geometry.attributes;
    this.matEstela.uniforms.color.value.copy(this.color).multiplyScalar(0.55 + this.brillo);
    this.matEstela.uniforms.escalaPx.value = this.ren.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    const cuerpo = R * this.tam * (1 + estira);
    this.perp.set(0, 0, 0);
    if (this.forma > 0.01 && vel > 1e-3) this.perp.crossVectors(this.v, this.haciaCam).normalize().multiplyScalar(R * this.tam * 0.9 * this.forma);
    for (let i = 0; i < N; i++) {
      const ti = t - i * PASO;
      const vivo = this.ruta && ti >= this.rutaDesde;
      const p = this.p0.copy(vivo ? this.ruta(ti) : this.p1);
      const lejos = p.distanceTo(this.p1);
      p.addScaledVector(this.perp, Math.min(1, i / 12) * Math.sin(i * 0.275 - t * 26));
      this.pos[3 * i] = p.x; this.pos[3 * i + 1] = p.y; this.pos[3 * i + 2] = p.z;
      e.alfa.array[i] = vivo ? this.estela * Math.pow(1 - i / N, 1.6) * 0.4 * THREE.MathUtils.smoothstep(lejos, cuerpo * 0.9, cuerpo * 2.4) : 0;
      e.tam.array[i] = R * this.tam * 1.5 * Math.pow(1 - i / N, 0.8);
    }
    e.position.needsUpdate = true; e.alfa.needsUpdate = true; e.tam.needsUpdate = true;
  }
}
