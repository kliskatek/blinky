// Lo que no es materia: los fotones del UHF (puntos de tamaño fijo en pantalla, como en el episodio 1), las líneas del
// campo magnético del NFC, las ondas del BLE, el rastro que deja Blinky en la pista y los rótulos que flotan en la escena
// (textos en un sprite). Todo se pinta a partir del tiempo del plano: actualizar(t, ...) en cada cuadro, sin estado.
// Cómo se usa cada cosa en la serie: corto/LENGUAJE.md.

import * as THREE from 'three';
import { texturaPunto, seg } from '../../corto/utiles.js';
import { matLinea, segmentos } from '../../corto/lineas.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Un chorro de fotones de a hacia b (Vector3, o funciones de t), n a la vez, cada uno tarda dura segundos; con dispersión
// (en las mismas unidades) alrededor de la recta. color, tam (px). actualizar(t, a, b, k): k, cuántos (0-1).
export function crearChorro(n = 60, { color = new THREE.Color(1.6, 1.1, 0.35), tam = 7, dura = 1.2, dispersion = 0.1, semilla = 1 } = {}) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: texturaPunto(), color, size: tam, sizeAttenuation: false, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false;
  let s = semilla; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const desv = Array.from({ length: n }, () => [r() - 0.5, r() - 0.5, r() - 0.5, r()]);
  const p = V(0, 0, 0), d = V(0, 0, 0);
  const actualizar = (t, a, b, k = 1, disp = dispersion) => {
    puntos.visible = k > 0.01;
    if (!puntos.visible) return;
    const A = typeof a === 'function' ? a(t) : a, B = typeof b === 'function' ? b(t) : b;
    d.subVectors(B, A);
    for (let i = 0; i < n; i++) {
      const [dx, dy, dz, fase] = desv[i], u = ((t / dura + fase) % 1 + 1) % 1, vivo = (i / n) < k;
      p.copy(A).addScaledVector(d, u);
      const abre = Math.sin(Math.PI * u) * 0.5 + 0.5 * u;                   // (se abren un poco por el camino)
      p.x += dx * disp * abre; p.y += dy * disp * abre; p.z += dz * disp * abre;
      if (!vivo) p.set(1e6, 1e6, 1e6);
      pos.set([p.x, p.y, p.z], 3 * i);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { objeto: puntos, actualizar, material: mat };
}

// Los fotones que salen de una antena por todo su cono (semiángulo angulo, alrededor de su eje, unitario), hasta largo:
// que se vea que cubre el portal entero, no un chorro estrecho
export function crearHaz(n = 110, { color = new THREE.Color(1.6, 1.1, 0.35), tam = 5, dura = 0.7, angulo = 0.6, semilla = 1 } = {}) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: texturaPunto(), color, size: tam, sizeAttenuation: false, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false;
  let s = semilla; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const desv = Array.from({ length: n }, () => [Math.sqrt(r()), r() * Math.PI * 2, r()]);   // (repartidos por el círculo)
  const p = V(0, 0, 0), d = V(0, 0, 0), a = V(0, 0, 0), b = V(0, 0, 0), arriba = V(0, 1, 0), lado = V(1, 0, 0);
  const actualizar = (t, origen, eje, largo, k = 1) => {
    puntos.visible = k > 0.01;
    if (!puntos.visible) return;
    a.crossVectors(eje, Math.abs(eje.y) < 0.9 ? arriba : lado).normalize(); b.crossVectors(eje, a);
    const tg = Math.tan(angulo);
    for (let i = 0; i < n; i++) {
      const [rad, fi, fase] = desv[i], u = ((t / dura + fase) % 1 + 1) % 1;
      d.copy(eje).addScaledVector(a, Math.cos(fi) * rad * tg).addScaledVector(b, Math.sin(fi) * rad * tg).normalize();
      p.copy(origen).addScaledVector(d, largo * u);
      if ((i / n) >= k) p.set(1e6, 1e6, 1e6);
      pos.set([p.x, p.y, p.z], 3 * i);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { objeto: puntos, actualizar, material: mat };
}

// Fotones que llegan a lo largo de toda una antena (de a1 a a2: de la punta de un brazo a la del otro), todos desde la
// dirección dir (unitaria): los últimos largo de su camino. Cada uno cae en su punto de la antena (repartidos por los dos
// brazos), sin abrirse al final; al salir, algo separados (abre, por el largo). Al hundirse en el cobre deja una chispa
// (un punto más grande y blanco dorado que se apaga en una cuarta parte de su vuelta; chispa: false, sin ella).
//   const llegan = crearLluvia(90, { tam: 11, dura: 0.8, chispa: true }); grupo.add(llegan.objeto);
//   llegan.actualizar(t, puntaIzq, puntaDer, haciaLaAntena, largo, k, abre);   // k, cuántos (0-1)
export function crearLluvia(n = 90, { color = new THREE.Color(1.6, 1.1, 0.35), tam = 11, dura = 0.8, semilla = 5, chispa = true } = {}) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: texturaPunto(), color, size: tam, sizeAttenuation: false, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const puntos = new THREE.Points(geo, mat); puntos.frustumCulled = false;
  let s = semilla; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const desv = Array.from({ length: n }, () => [r(), r() - 0.5, r() - 0.5, r() - 0.5, r()]);
  // las chispas: una por fotón, donde cae; su color (aditivo) es su brillo
  const posC = new Float32Array(n * 3), colC = new Float32Array(n * 3), geoC = new THREE.BufferGeometry();
  geoC.setAttribute('position', new THREE.BufferAttribute(posC, 3)); geoC.setAttribute('color', new THREE.BufferAttribute(colC, 3));
  const chispas = new THREE.Points(geoC, new THREE.PointsMaterial({ map: texturaPunto(), vertexColors: true, size: tam * 2.6,
    sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  chispas.frustumCulled = false; chispas.visible = chispa; puntos.add(chispas);
  const p = V(0, 0, 0), q = V(0, 0, 0), BRILLO = [3.0, 2.4, 1.3];
  const actualizar = (t, a1, a2, dir, largo, k = 1, abre = 0.35) => {
    puntos.visible = k > 0.01;
    if (!puntos.visible) return;
    for (let i = 0; i < n; i++) {
      const [w, dx, dy, dz, fase] = desv[i], u = ((t / dura + fase) % 1 + 1) % 1, vivo = (i / n) < k;
      q.copy(a1).lerp(a2, w);                                               // (su punto de la antena)
      p.copy(q).addScaledVector(dir, largo * (1 - u));
      p.x += dx * largo * abre * (1 - u); p.y += dy * largo * abre * (1 - u); p.z += dz * largo * abre * (1 - u);
      if (!vivo) p.set(1e6, 1e6, 1e6);
      pos.set([p.x, p.y, p.z], 3 * i);
      // la chispa: justo después de caer (u vuelve a 0 cuando el fotón llega), y solo si ya cayó alguna vez
      const c = vivo && t / dura + fase >= 1 ? Math.max(0, 1 - u / 0.25) ** 2 : 0;
      posC.set([q.x, q.y, q.z], 3 * i); colC.set(BRILLO.map((x) => x * c), 3 * i);
    }
    geo.attributes.position.needsUpdate = true;
    geoC.attributes.position.needsUpdate = true; geoC.attributes.color.needsUpdate = true;
  };
  return { objeto: puntos, actualizar, material: mat };
}

// El rastro de Blinky de electrón en la pista: una línea de luz sobre el camino que sigue (su ruta, función del tiempo),
// que se enciende a su paso y se apaga despacio. Azul a la ida (0x3d9bff); con vuelta: true, rojo-naranja (0xff5a1a: la
// vuelta con la medida). La ruta se mira en cada cuadro, así que sigue a lo que se mueva.
//   const rastro = crearRastro({ vuelta: false, n: 160, ancho: 2.4, sube: 0.2, queda: 1.2, apaga: 2.5 }); grupo.add(rastro.objeto);
//   rastro.actualizar(t, electron.ruta, t0, t1, k);
// t0 y t1: el tramo de la ruta que se dibuja (en segundos del plano; Blinky pasa por cada punto a su tiempo). Cada trozo
// se enciende en sube segundos al pasar Blinky, se queda queda segundos y se apaga en apaga; k, la opacidad de todo.
export function crearRastro({ vuelta = false, color = vuelta ? new THREE.Color(1.8, 0.55, 0.18) : new THREE.Color(0.35, 0.75, 1.6),
  n = 160, ancho = 2.4, sube = 0.2, queda = 1.2, apaga = 2.5 } = {}) {
  const geo = new LineSegmentsGeometry().setPositions(new Float32Array(n * 6)).setColors(new Float32Array(n * 6));
  const mat = matLinea({ ancho, vertexColors: true, toneMapped: false, blending: THREE.AdditiveBlending });
  const malla = new LineSegments2(geo, mat); malla.frustumCulled = false; malla.renderOrder = 5;
  const P = geo.attributes.instanceStart.data, C = geo.attributes.instanceColorStart.data;
  const a = V(0, 0, 0), b = V(0, 0, 0);
  const luz = (edad) => (edad < 0 ? 0 : Math.min(1, edad / sube) * (1 - Math.min(1, Math.max(0, (edad - sube - queda) / apaga))));
  const actualizar = (t, ruta, t0, t1, k = 1) => {
    malla.visible = k > 0.01 && t > t0; if (!malla.visible) return;
    mat.opacity = k;
    a.copy(ruta(t0));
    for (let i = 0; i < n; i++) {
      const ta = t0 + (t1 - t0) * i / n, tb = t0 + (t1 - t0) * (i + 1) / n;
      // (lo que aún no ha pisado se queda apagado; el trozo en que está llega hasta él)
      if (ta >= t) { C.array.fill(0, 6 * i, 6 * n); P.array.fill(0, 6 * i, 6 * n); break; }
      b.copy(ruta(Math.min(t, tb)));
      const la = luz(t - ta), lb = luz(t - Math.min(t, tb));
      P.array.set([a.x, a.y, a.z, b.x, b.y, b.z], 6 * i);
      C.array.set([color.r * la, color.g * la, color.b * la, color.r * lb, color.g * lb, color.b * lb], 6 * i);
      a.copy(b);
    }
    P.needsUpdate = true; C.needsUpdate = true;
  };
  return { objeto: malla, actualizar, material: mat };
}

// Los frentes del backscatter, como en el episodio 1: casquetes naranjas (0xff8000) que salen del tag hacia el lector,
// uno cada cada segundos desde t0, y crecen de r0 a r1 en vida segundos mientras se apagan.
//   const frentes = crearFrentes(); grupo.add(frentes.objeto);
//   frentes.actualizar(t, centro, dir, t0, { r0, r1, n: 5, cada: 0.35, vida: 2.2, k: 1 });   // dir: unitario, al lector
export function crearFrentes({ n = 5, color = 0xff8000 } = {}) {
  const g = new THREE.Group(), arco = new THREE.TorusGeometry(1, 0.02, 12, 128, 1.6).rotateZ(-0.8);
  const frentes = Array.from({ length: n }, () => {
    const f = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false });
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(arco, mat); m.rotation.x = k * Math.PI / 3; f.add(m); }
    f.userData.mat = mat; g.add(f); return f;
  });
  const X = V(1, 0, 0);
  const actualizar = (t, centro, dir, t0, { r0 = 0.1, r1 = 3, cada = 0.35, vida = 2.2, k = 1 } = {}) => {
    g.visible = k > 0.01 && t > t0; if (!g.visible) return;
    frentes.forEach((f, i) => {
      const edad = t - t0 - i * cada, u = seg(edad, 0, vida);
      f.position.copy(centro); f.quaternion.setFromUnitVectors(X, dir);
      f.scale.setScalar(r0 + (r1 - r0) * u);
      f.userData.mat.opacity = edad > 0 && edad < vida ? k * 0.85 * (1 - u) * Math.min(1, edad * 6) : 0;
      f.visible = f.userData.mat.opacity > 0.005;
    });
  };
  return { objeto: g, actualizar };
}

// Las líneas del campo magnético entre dos bobinas (en c, de eje e): lazos cerrados que salen de una, pasan por la otra y
// vuelven por fuera. alcance: hasta dónde llegan los lazos (se encogen con la distancia); fase hace correr el brillo.
export function crearCampoNFC({ color = new THREE.Color(1.1, 0.55, 1.7), lazos = 10, puntos = 48 } = {}) {
  const m = matLinea({ color, opacity: 0.8, toneMapped: false, ancho: 1.6, blending: THREE.AdditiveBlending });
  const { malla, poner } = segmentos(lazos * puntos, m);
  const a = V(0, 0, 0), b = V(0, 0, 0), u = V(0, 0, 0), w = V(0, 0, 0);
  // c: el centro de la bobina que emite; e: su eje (unitario, hacia la otra); radio: el de la bobina; alcance: lo que se
  // alejan los lazos a lo largo del eje
  const actualizar = (c, e, radio, alcance, k = 1) => {
    malla.visible = k > 0.01; if (!malla.visible) return;
    m.opacity = 0.75 * k;
    u.set(1, 0, 0); if (Math.abs(e.x) > 0.9) u.set(0, 1, 0);
    u.cross(e).normalize(); w.crossVectors(e, u);
    for (let l = 0; l < lazos; l++) {
      const ang = (l / lazos) * Math.PI * 2, r0 = radio * (0.35 + 0.6 * ((l * 7) % lazos) / lazos);
      const lado = V(0, 0, 0).addScaledVector(u, Math.cos(ang)).addScaledVector(w, Math.sin(ang));
      // un lazo: del centro, a lo largo del eje hasta el alcance, se abre por fuera y vuelve por detrás
      const H = alcance * (0.55 + 0.45 * r0 / radio), Rr = radio * (1.0 + 1.6 * r0 / radio);
      const punto = (q, out) => {
        const th = q * Math.PI * 2;
        out.copy(c).addScaledVector(e, H * Math.sin(th) * 0.5 + H * 0.5 * Math.sin(th) ** 3 * 0.3 + (alcance * 0.3) * Math.sin(th))
          .addScaledVector(lado, r0 + (Rr - r0) * (0.5 - 0.5 * Math.cos(th)));
        return out;
      };
      for (let i = 0; i < puntos; i++) poner(l * puntos + i, punto(i / puntos, a), punto((i + 1) / puntos, b));
    }
  };
  return { objeto: malla, actualizar, material: m };
}

// Ondas: anillos que salen de un punto y se abren (el BLE, el backscatter). actualizar(t, centro, cara, k): cara, hacia
// dónde mira el anillo (su normal: la cámara, para que se lean como círculos).
export function crearOndas({ color = new THREE.Color(0.15, 1.6, 1.4), n = 4, radio = 1, periodo = 0.9 } = {}) {
  const g = new THREE.Group();
  const anillos = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), new THREE.MeshBasicMaterial({ color, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    g.add(m); return m;
  });
  const actualizar = (t, centro, mira, k = 1) => {
    g.visible = k > 0.01; if (!g.visible) return;
    g.position.copy(centro); g.lookAt(mira);
    anillos.forEach((a, i) => {
      const u = ((t / periodo + i / n) % 1 + 1) % 1;
      a.scale.setScalar(radio * (0.05 + u));
      a.material.opacity = k * 0.8 * (1 - u) ** 1.5;
    });
  };
  return { objeto: g, actualizar };
}

// Un rótulo que flota en la escena: texto en un sprite (alto, en las unidades de la escena; tamaño fijo en el mundo)
export function crearRotulo(texto, { alto = 0.1, color = '#ffffff', fondo = 'rgba(7,9,13,.72)', peso = 600, borde = null } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sprite.renderOrder = 30;
  let actual = null;
  const poner = (txt, col = color) => {
    const clave = txt + col; if (clave === actual) return; actual = clave;
    const px = 64, f = `${peso} ${px}px Oxanium, "Segoe UI", "Microsoft YaHei", sans-serif`;
    g.font = f; const w = Math.ceil(g.measureText(txt).width) + px;
    c.width = w; c.height = Math.round(px * 1.6);
    g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (fondo) { g.fillStyle = fondo; g.beginPath(); g.roundRect(0, 0, c.width, c.height, px * 0.4); g.fill(); }
    if (borde) { g.strokeStyle = borde; g.lineWidth = 6; g.beginPath(); g.roundRect(3, 3, c.width - 6, c.height - 6, px * 0.4); g.stroke(); }
    g.fillStyle = col; g.fillText(txt, c.width / 2, c.height / 2 + 2);
    tex.needsUpdate = true;
    sprite.scale.set(alto * c.width / c.height, alto, 1);
  };
  poner(texto);
  return { objeto: sprite, poner, opacidad: (k) => { sprite.material.opacity = k; sprite.visible = k > 0.01; } };
}

// El ruido electromagnético: anillos en zigzag, rojos, que salen de un punto y se abren (los variadores, la soldadura).
// actualizar(t, centro, mira, k): mira, hacia dónde dan la cara (la cámara)
export function crearRuido({ color = new THREE.Color(1.8, 0.25, 0.2), anillos = 4, puntos = 64, radio = 1, periodo = 0.7 } = {}) {
  const m = matLinea({ color, opacity: 0.8, toneMapped: false, ancho: 1.6, blending: THREE.AdditiveBlending });
  const { malla, poner } = segmentos(anillos * puntos, m);
  const a = V(0, 0, 0), b = V(0, 0, 0), u = V(0, 0, 0), w = V(0, 0, 0), e = V(0, 0, 0);
  const actualizar = (t, centro, mira, k = 1) => {
    malla.visible = k > 0.01; if (!malla.visible) return;
    m.opacity = 0.8 * k;
    e.subVectors(mira, centro).normalize(); u.set(0, 1, 0).cross(e).normalize(); w.crossVectors(e, u);
    for (let r = 0; r < anillos; r++) {
      const f = ((t / periodo + r / anillos) % 1 + 1) % 1, R = radio * (0.1 + f), al = 1 - f;
      const p = (i, out) => {
        const th = (i / puntos) * Math.PI * 2, z = (i % 2 ? 1 : -1) * 0.12 * R * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 9));
        return out.copy(centro).addScaledVector(u, Math.cos(th) * (R + z)).addScaledVector(w, Math.sin(th) * (R + z));
      };
      for (let i = 0; i < puntos; i++) {
        p(i, a); p(i + 1, b);
        if (al < 0.05) { a.set(1e6, 1e6, 1e6); b.copy(a); }
        poner(r * puntos + i, a, b);
      }
    }
  };
  return { objeto: malla, actualizar };
}
