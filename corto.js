// Blinky presenta: Kliskatek (el viaje del electrón): el director. Una sola escena y una sola cámara; cada plano (planos/*.js) monta su decorado en
// su propio grupo, que solo se ve mientras dura, y mueve la cámara y al electrón, que es el mismo en todo el corto.
// Guion y estado de cada plano: corto/GUION.md, en la raíz del repo.
// Revisión: espacio para parar y seguir, ← → un segundo, la barra o los botones de plano para saltar; #t=12.5 en la
// dirección arranca parado en ese segundo, y window.corto.ir(t) hace lo mismo desde la consola.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { Electron } from './electron.js';
import { crearEntorno } from './entorno.js';
import { L, LANG, IDIOMAS, cambiarIdioma } from './idioma.js';
import { crearSonido, grabarMusica } from './sonido.js';
import plano01 from './planos/01-logo.js';
import plano02 from './planos/02-tag.js';
import plano03 from './planos/03-rocky.js';
import plano04 from './planos/04-sensor.js';
import plano05 from './planos/05-vuelta.js';
import plano06 from './planos/06-lector.js';
import plano07 from './planos/07-plc.js';
import plano08 from './planos/08-edge.js';
import plano09 from './planos/09-mes-erp.js';
import plano10 from './planos/10-pantalla.js';
import plano11 from './planos/11-visera.js';

const PLANOS = [plano01, plano02, plano03, plano04, plano05, plano06, plano07, plano08, plano09, plano10, plano11];

// ------------------------------------------------------------------ escena, cámara y posproceso
const caja = document.getElementById('lienzo');
const ren = new THREE.WebGLRenderer({ antialias: true });
ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // (más, en pantallas de mucha densidad, cuesta y apenas se nota)
ren.outputColorSpace = THREE.SRGBColorSpace;
ren.toneMapping = THREE.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.0;
ren.shadowMap.enabled = true;
ren.shadowMap.type = THREE.PCFSoftShadowMap;
caja.appendChild(ren.domElement);

const escena = new THREE.Scene();
escena.background = new THREE.Color(0x07090d);
const ENTORNO = crearEntorno(ren);                       // lo que reflejan los metales (entorno.js)
escena.environment = ENTORNO;
const cam = new THREE.PerspectiveCamera(30, 1, 0.005, 400);
escena.add(cam);

// el velo: un plano pegado a la cámara para los destellos y fundidos (el plano le pone color y opacidad en cada cuadro)
const velo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
velo.position.z = -0.05; velo.renderOrder = 999; cam.add(velo);
// (con «reducir movimiento» en el sistema, los destellos de los cortes, mucho más suaves)
const DESTELLO = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;
const ponVelo = (opacidad, color = 0xffffff) => { velo.material.opacity = opacidad * DESTELLO; velo.material.color.set(color); };

// (con multimuestreo: el posproceso pinta en su propia textura, y sin él se pierde el antialias del renderer)
const comp = new EffectComposer(ren, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
comp.addPass(new RenderPass(escena, cam));
// la oclusión ambiental: oscurece rincones, juntas y lo que está pegado a otra cosa (el radio, en píxeles de pantalla:
// así vale igual en la planta que en el die del chip). Lo que brilla o se transparenta (el halo de Blinky, los
// destellos, los carteles, el velo) no cuenta: si no, oscurecería lo que hay detrás
const ao = new GTAOPass(escena, cam, 1, 1, undefined, { radius: 0.3, distanceExponent: 1.5, thickness: 2, scale: 1, samples: 16, screenSpaceRadius: true });
ao.blendIntensity = 0.85;
ao.overrideVisibility = function () {
  this.scene.traverse((o) => {
    this._visibilityCache.set(o, o.visible);
    const m = o.material;
    if (o.isPoints || o.isLine || o.isSprite || (m && (Array.isArray(m) ? m.some((x) => x.transparent) : m.transparent || m.blending !== THREE.NormalBlending))) o.visible = false;
  });
};
comp.addPass(ao);
const BLOOM = 0.55;
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM, 0.5, 0.9);
comp.addPass(bloom);
const vineta = new ShaderPass(VignetteShader);                 // las esquinas, algo más oscuras, como en una cámara
vineta.uniforms.offset.value = 0.8; vineta.uniforms.darkness.value = 0.7;
comp.addPass(vineta);
comp.addPass(new OutputPass());

function medir() {
  const w = caja.clientWidth || 1, h = caja.clientHeight || 1;
  ren.setSize(w, h, false); comp.setSize(w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();
}
// el velo tapa todo el encuadre, sea cual sea el fov
function taparVelo() {
  const alto = 2 * 0.05 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * 1.1;
  velo.scale.set(alto * cam.aspect, alto, 1);
}
addEventListener('resize', medir); medir();

// lo que dice Blinky: cada plano llama a habla(linea, donde) con su línea de dialogo() (utiles.js) mientras la dice. No
// se pinta (lo que dice va en la narración: voz o subtítulos, sonido.js), pero marca cuándo habla: corto.guion() lo apunta
// para la música y el tiempo de la narración
let habla = null;
const ponHabla = (linea, donde = null) => { habla = linea && { ...linea, donde }; };
const subtitulo = document.getElementById('subtitulo');
let subtituloAntes = null;
function pintarSubtitulo(txt) {
  if (txt === subtituloAntes) return;
  subtituloAntes = txt; subtitulo.textContent = txt || ''; subtitulo.style.display = txt ? 'block' : 'none';
}

// lo que cada plano recibe: la escena, la cámara, el electrón, el bloom (para tocar su fuerza en los destellos), el
// velo y habla
const electron = new Electron(escena, ren);
const ctx = { THREE, escena, cam, ren, bloom, electron, velo: ponVelo, habla: ponHabla };

let t0 = 0;
const montados = PLANOS.map((p) => {
  const grupo = new THREE.Group(); grupo.visible = false; escena.add(grupo);
  const m = p.montar({ ...ctx, grupo });
  const r = { ...p, grupo, m, desde: t0 };
  prepararSombras(r); ajustarEntorno(r);
  t0 += p.dura;
  return r;
});
const TOTAL = t0;

// las sombras: las echa la luz principal de cada plano (su direccional más fuerte; sombra: false en el plano, ninguna)
// sobre todo lo opaco de su decorado. Como cada plano cambia de escala (de la planta al die del chip), su cámara de
// sombra no es fija: sigue cada cuadro lo que encuadra la cámara, alrededor de lo primero que hay en el centro de la
// imagen (o de Blinky), con el tamaño de lo que se ve a esa distancia
function prepararSombras(r) {
  if (r.sombra === false) return;
  let sol = null; r.opacos = [];
  r.grupo.traverse((o) => {
    if (o.isDirectionalLight && (!sol || o.intensity > sol.intensity)) sol = o;
    const m = o.material;
    if (o.isMesh && m && !Array.isArray(m) && !m.transparent && !m.isMeshBasicMaterial && m.blending === THREE.NormalBlending) {
      o.castShadow = !o.userData.sinSombra; o.receiveShadow = true; r.opacos.push(o);
    }
  });
  if (!sol) return;
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.camera.near = 0;
  r.grupo.add(sol.target); r.sol = sol; r.haciaSol = sol.position.clone().normalize();
}
// cuánto refleja el entorno cada plano (entorno: 0..1 en el plano; 1 si no lo dice): dentro del chip y del sensor, el
// oro y el die con todo el entorno brillaban demasiado
function ajustarEntorno(r) {
  if (r.entorno === undefined) return;
  r.grupo.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { if ('envMapIntensity' in m) m.envMapIntensity = r.entorno; }); });
}
const rayo = new THREE.Raycaster(), adelante = new THREE.Vector3(), foco = new THREE.Vector3();
function ajustarSombra(r) {
  const sol = r.sol; if (!sol) return;
  cam.getWorldDirection(adelante);
  rayo.set(cam.position, adelante); rayo.near = cam.near; rayo.far = cam.far;
  const toca = rayo.intersectObjects(r.opacos, false).find((h) => { for (let o = h.object; o; o = o.parent) if (!o.visible) return false; return true; });
  const d = toca ? toca.distance : electron.raiz.visible ? electron.raiz.position.distanceTo(cam.position) : 10 * cam.near;
  const R = d * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * Math.max(1, cam.aspect) * 1.3;
  foco.copy(cam.position).addScaledVector(adelante, d); r.grupo.worldToLocal(foco);
  sol.target.position.copy(foco); sol.position.copy(foco).addScaledVector(r.haciaSol, 4 * R);
  const c = sol.shadow.camera; c.left = c.bottom = -R; c.right = c.top = R; c.far = 8 * R; c.updateProjectionMatrix();
  sol.shadow.bias = -0.0003; sol.shadow.normalBias = 0.003 * R;
}

// ------------------------------------------------------------------ reloj y mando
let t = 0, corriendo = false, antes = performance.now(), actual = null;
const barra = document.getElementById('barra'), reloj = document.getElementById('reloj'), play = document.getElementById('play');
barra.max = TOTAL;
const botones = montados.map((p, i) => {
  const b = document.createElement('button');
  b.textContent = `${i + 1} · ${L(p.nombre)}`;
  b.onclick = () => ir(p.desde + 0.001);
  document.getElementById('planos').appendChild(b);
  return b;
});

function ir(s, seguir = corriendo) { t = Math.max(0, Math.min(TOTAL - 0.001, s)); corriendo = seguir; sonido.saltar(); pintarMando(); }
function pintarMando() {
  play.textContent = corriendo ? '❚❚' : '▶';
  document.body.classList.toggle('quieto', !corriendo);
}
play.onclick = () => { corriendo = !corriendo; pintarMando(); };
barra.oninput = () => ir(parseFloat(barra.value), false);
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, button')) return;          // (la barra y los botones tienen su propio teclado)
  if (e.code === 'Space') { e.preventDefault(); corriendo = !corriendo; pintarMando(); }
  if (e.code === 'ArrowRight') ir(t + 1);
  if (e.code === 'ArrowLeft') ir(t - 1);
});
let reposo = 0;
const mostrarMando = () => { document.body.classList.add('quieto'); clearTimeout(reposo);
  reposo = setTimeout(() => corriendo && document.body.classList.remove('quieto'), 2400); };
addEventListener('pointermove', mostrarMando); addEventListener('pointerdown', mostrarMando);   // (en el móvil, al tocar)
// con la pestaña escondida, en pausa (y sin sonido)
document.addEventListener('visibilitychange', () => { if (document.hidden && corriendo) { corriendo = false; pintarMando(); } });

// el idioma y el sonido: con sonido, la voz de Blinky y la música (sonido.js); en silencio, la narración en subtítulos.
// La imagen va al ritmo de la narración en los dos casos; mientras suena, manda el reloj del audio, para que la voz y la
// música no se separen de la imagen
document.documentElement.lang = LANG;
document.title = `${L('Blinky presenta')}: Kliskatek`;   // (el título de la serie: Blinky presenta…)
for (const [c, nombre] of IDIOMAS) {
  const b = document.createElement('button'); b.textContent = nombre; b.classList.toggle('activo', c === LANG);
  b.lang = c; b.setAttribute('aria-pressed', c === LANG);
  b.onclick = () => c !== LANG && cambiarIdioma(c, t, corriendo);
  document.getElementById('idiomas').appendChild(b);
}
const sonido = crearSonido({ total: TOTAL, aviso: document.getElementById('aviso') });
const botonSonido = document.getElementById('sonido');
const pintarSonido = () => {
  const mudo = sonido.mudo();
  botonSonido.textContent = mudo ? '🔇' : '🔊';
  botonSonido.title = L(mudo ? 'Activar el sonido' : 'Silenciar (con subtítulos)');
  botonSonido.setAttribute('aria-label', botonSonido.title); botonSonido.setAttribute('aria-pressed', mudo);
  activar.hidden = !mudo;
};
const activar = document.getElementById('activar');
activar.textContent = `🔊 ${L('Activar el sonido')}`;
activar.onclick = () => { sonido.mudo(false); pintarSonido(); };
botonSonido.onclick = () => { sonido.mudo(!sonido.mudo()); pintarSonido(); };
pintarSonido();

// al llegar arranca solo, en silencio y con subtítulos (como un vídeo en redes: el navegador no deja sonar nada sin un
// toque), con el título encima unos segundos y el botón para activar el sonido. Con #t= en la dirección (revisión),
// parado en ese segundo; con &sigue (al cambiar de idioma reproduciendo), sigue
document.getElementById('titulo').innerHTML = `<small>${L('Blinky presenta')}:</small>Kliskatek`;
const enHash = parseFloat((location.hash.match(/t=([\d.]+)/) || [])[1]);
if (Number.isNaN(enHash)) { sonido.mudo(true); corriendo = true; mostrarMando(); }
else { ir(enHash, false); document.getElementById('cartela').hidden = true; if (/sigue/.test(location.hash)) corriendo = true; }
pintarSonido(); pintarMando();

window.corto = { ir: (s) => ir(s, false), ver: (s) => { ir(s, false); pintar(); }, seguir: () => { corriendo = true; pintarMando(); }, get t() { return t; }, TOTAL, montados, cam, electron, ren, escena, comp, sonido, guion, grabarMusica };

// para preparar el sonido (audio/guion.json): recorre el corto sin pintarlo y apunta cuándo empieza y acaba cada frase
// (en español, con su hueco hasta la siguiente), los destellos del velo, los cambios de forma de Blinky y los tramos
// en que el cuadro casi no se mueve (quieto, de cada plano), donde el modo sonido frena la imagen si le hace falta
function guion(paso = 0.02) {
  const lineas = [], destellos = [], formas = [];
  let antes = null, velo0 = 0, sube = false, forma0 = 0;
  for (let s = 0; s < TOTAL; s += paso) {
    const p = montados.find((x) => s >= x.desde && s < x.desde + x.dura) || montados[0];
    ponVelo(0); electron.forma = 0; habla = null;
    p.m.actualizar(s - p.desde);
    const es = habla && habla.es;
    if (es !== antes) {
      if (antes) lineas[lineas.length - 1].t1 = +s.toFixed(2);
      if (es) lineas.push({ es, t0: +s.toFixed(2), plano: montados.indexOf(p) + 1 });
      antes = es;
    }
    const o = velo.material.opacity;
    if (o > velo0 + 0.001) sube = true;
    else if (sube && o < velo0 - 0.001) { if (velo0 > 0.35) destellos.push({ t: +(s - paso).toFixed(2), o: +velo0.toFixed(2), color: '#' + velo.material.color.getHexString() }); sube = false; }
    velo0 = o;
    const f = Math.round(electron.forma);
    if (f !== forma0) { formas.push({ t: +s.toFixed(2), forma: f }); forma0 = f; }
  }
  lineas.forEach((l, i) => { l.hueco = +((i + 1 < lineas.length ? lineas[i + 1].t0 : TOTAL) - l.t0).toFixed(2); });
  const quietos = montados.flatMap((m) => (m.quieto || []).map((q) => q.map((x) => +(m.desde + x).toFixed(2))));
  return { total: +TOTAL.toFixed(2), cortes: montados.map((m) => +m.desde.toFixed(2)), lineas, destellos, formas, quietos };
}

// ------------------------------------------------------------------ bucle
// la calidad se adapta: si el equipo no llega (cuadros de más de CUADRO_MAX de media, mientras se reproduce), primero
// fuera la oclusión ambiental, luego sombras de 1024 y luego menos píxeles
const CUADRO_MAX = 26;
let medidos = 0, sumaMs = 0, nivel = 0;
function adaptar(ms) {
  if (!corriendo || document.hidden || nivel >= 3) return;
  medidos++; sumaMs += ms;
  if (medidos < 90) return;
  const media = sumaMs / medidos; medidos = 0; sumaMs = 0;
  if (media < CUADRO_MAX) return;
  nivel++;
  if (nivel === 1) ao.enabled = false;
  if (nivel === 2) montados.forEach((m) => { if (m.sol) { m.sol.shadow.mapSize.set(1024, 1024); m.sol.shadow.map?.dispose(); m.sol.shadow.map = null; } });
  if (nivel === 3) { ren.setPixelRatio(1); medir(); }
  console.info(`calidad: nivel ${nivel} (cuadros de ${media.toFixed(0)} ms)`);
}
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  adaptar(ahora - antes);
  const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
  if (corriendo) { t = sonido.avanzar(t, dt); if (t >= TOTAL) t = 0; }
  sonido.seguir(t, corriendo);
  pintar();
}
// pinta el instante t; window.corto.ver(s) lo usa para revisar un segundo concreto sin esperar al siguiente cuadro
function pintar() {
  const p =montados.find((x) => t >= x.desde && t < x.desde + x.dura) || montados[0];
  if (p !== actual) {
    montados.forEach((x) => { x.grupo.visible = x === p; });
    escena.environment = ENTORNO;                          // (un plano puede quitarlo o cambiarlo al entrar)
    if (p.m.entrar) p.m.entrar();
    actual = p;
    botones.forEach((b, i) => b.classList.toggle('activo', montados[i] === p));
  }
  ponVelo(0); bloom.strength = BLOOM;                      // lo de cada cuadro lo vuelve a poner el plano
  cam.near = 0.005; cam.far = 400;                         // (los que ven la planta de lejos los abren)
  electron.forma = 0; electron.sorpresa = 0; habla = null;
  p.m.actualizar(t - p.desde);
  if (window.camaraLibre) window.camaraLibre(cam);         // para revisar desde la consola: mover la cámara a mano
  cam.updateMatrixWorld(); ajustarSombra(p);
  cam.updateProjectionMatrix(); taparVelo();
  electron.actualizar(t - p.desde, cam);
  pintarSubtitulo(sonido.subtitulo(t));

  barra.value = t;
  reloj.textContent = `${t.toFixed(1)} / ${TOTAL.toFixed(0)} s`;
  comp.render();
}
requestAnimationFrame(cuadro);
