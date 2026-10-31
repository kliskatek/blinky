// Plano 2: Blinky llega volando a la planta (piezas/planta.js) y, de lejos, la ve entera: la máquina 2 con su tag, en el
// otro extremo la antena RFID con el armario del PLC y el del edge, y arriba la oficina con el operario. La antena manda
// fotones al tag; se para, lo mira y dice que quiere ir a ver; vuela hasta allí (la planta crece a su alrededor) y
// enlaza con lo de siempre:
// el electrón cruza el vacío, se encuentra un tag de Kliskatek, aterriza en un brazo de la antena, corre por el
// cobre hasta el centro del dipolo, baja por la alimentación (salta la bobina de adaptación) hasta el ROCKY100, mira
// arriba al chip y se lanza a una pata; la cámara se echa encima de la pata y funde a luz. Cómo entra en el chip lo
// cuenta el plano 3 (aquí no se repite).
//   (antes de 0, PREVIO segundos: llega frenando, se para FRENA después, mira y lo dice durante MIRA, vuela hasta
//           delante de la máquina en ACERCA, se queda mirándola mientras su carcasa se desvanece (quedan las aristas,
//           como en una radiografía) durante DESVELA, y entra hasta el tag en ENTRA; los tiempos de abajo son desde el
//           final de eso)
//   0-5.2   vuelo hasta el tag, por dentro de la máquina; la cámara lo sigue. Por el haz del lector llegan otros
//           fotones, sin cara, en línea desde su antena, a su sitio del brazo
//   5.2-6   aterriza en la punta del brazo izquierdo (dos botes) y el fotón se convierte en electrón; los otros se
//           hunden en el cobre por delante de él y la antena se llena de campo: a lo largo del dipolo se dibuja la
//           distribución del campo eléctrico (la de un dipolo de media onda: nula en el centro, máxima en las puntas, de
//           signo contrario en cada brazo), que oscila hasta el final del plano
//   5.9     se para, sorprendido, y lo dice; la cámara se le acerca. Luego se aleja hasta ver la antena entera, con el
//           campo (más alto y más grueso, para que se lea de lejos) oscilando un par de ciclos, y vuelve (PAUSA
//           segundos: desde aquí, todo lo de abajo va retrasado eso; los tiempos de este fichero son sin la pausa, tr()
//           la mete)
//   6-9.6   corre por el brazo, de la punta hasta el centro (y gira sin pararse)
//   9.6-10.9 baja por la alimentación, salta la bobina
//   10.9-11.5 se para delante del ROCKY100 y lo mira
//   11.5-12.1 se lanza a la pata y se queda pegado a ella, por fuera; la pata se enciende y la cámara se acerca.
//            Corte con destello al plano 3, que arranca con el mismo encuadre (el electrón a la misma escala frente al
//            chip) y desde ahí lo hace encoger hacia dentro.

import * as THREE from 'three';
import { seg, smooth, smoother, bell, lerp, rng, porTramos, porClaves, texturaPunto, dialogo, pasa } from '../utiles.js';
import { crearTag, TAG } from '../piezas/tag.js';
import { crearPlanta, TAG as TAG_PLANTA, OFICINA, GEN, MAQ as MAQUINA } from '../piezas/planta.js';
import { Electron } from '../electron.js';

const E = 4;                                   // el tag, 4 veces mayor: el electrón cabe justo en la pista de la antena
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// el último encuadre, que el plano 3 copia a su escala: el electrón (con este tam) pegado a la pata, la cámara detrás
// de él (en el sentido en que corre, aquí −z) y por encima. Lo exporta para que el corte case.
export const TAM_FINAL = 0.5, PLANO_FINAL = V(-0.22, 0.5, 0.9);
export const ESCALA_CHIP = 0.22 * 4;           // lo que mide el ROCKY100 aquí (de lado, en el mundo)
// el primer encuadre (la cámara detrás del electrón, que vuela hacia +x) y el fondo: el plano 1 acaba igual
export const SIGUE_INICIO = { pos: V(-2.4, 0.7, 3.4), mira: V(1.2, 0, 0), fov: 32 }, FONDO_TAG = 0x04070e;
// la sorpresa al aterrizar: se para en PARA durante PAUSA segundos: HABLA para decirlo, de cerca, y VER para ver el
// campo en la antena entera, de lejos
const PARA = 5.9, HABLA = 2.5, VER = 13.0, PAUSA = HABLA + VER;
// el principio, antes del vuelo de siempre (en tiempos negativos de este fichero)
const FRENA = 0.8, MIRA = 3.0, ACERCA = 2.4, DESVELA = 2.4, ENTRA = 2.6, PREVIO = FRENA + MIRA + ACERCA + DESVELA + ENTRA;
const T_ACERCA = -ENTRA - DESVELA - ACERCA, T_DESVELA = -ENTRA - DESVELA;   // cuándo empieza cada tramo
const VISTA = { pos: new THREE.Vector3(0, 12.5, 21.5), mira: new THREE.Vector3(0, 0.9, 0.8), fov: 40 };
// y una segunda, delante del ROCKY100, para decir que la energía entra por ahí y que él va también
const PARA2 = 11.2, PAUSA2 = 2.8;
const tr = (t) => {
  if (t < PARA) return t;
  if (t < PARA + PAUSA) return PARA;
  const u = t - PAUSA;
  return u < PARA2 ? u : u < PARA2 + PAUSA2 ? PARA2 : u - PAUSA2;
};
const LINEAS = [[-PREVIO + FRENA + 0.3, T_ACERCA - 0.15, '¿Qué pasa ahí? ¡Quiero ir a ver!'],
  [PARA + 0.05, PARA + HABLA, '¡Vaya! ¡La antena me ha convertido en electrón!'],
  // con la antena entera a la vista, explica lo que se ve
  [PARA + HABLA + 1.2, PARA + HABLA + 6.6, 'Mira: es el campo eléctrico de los electrones que aparecen en la antena al absorber fotones.'],
  [PARA + HABLA + 6.8, PARA + PAUSA - 1.3, 'Y empuja una corriente hacia el chip. ¡Vamos con ella!'],
  [PAUSA + PARA2 + 0.05, PAUSA + PARA2 + PAUSA2, '¡La energía está entrando por aquí! ¡Yo también voy!']];

// El tag como lo monta este plano (4 veces mayor y girado media vuelta) y los puntos de la ruta, en el mundo. El plano
// 5 vuelve a este decorado y usa lo mismo. Alrededor, la planta (piezas/planta.js) a su escala (1 m = PLANTA unidades),
// puesta de modo que su tag cae en este: el tag está encima de la máquina 2, y a lo lejos se ven la antena, los armarios
// y la oficina.
export const PLANTA = E / TAG_PLANTA.escala;                       // 200: un metro de la planta, en el mundo
// la planta, girada alrededor del tag: el de la planta va de través (dipolo en z) y este, con el dipolo en x
const GIRO = TAG_PLANTA.rotY - Math.PI, EJE_Y = new THREE.Vector3(0, 1, 0);
export const enPlanta = (p) => p.clone().sub(TAG_PLANTA.pos).multiplyScalar(PLANTA).applyAxisAngle(EJE_Y, GIRO);   // de metros de la planta al mundo
export const dirEnPlanta = (d) => d.clone().applyAxisAngle(EJE_Y, GIRO);   // y una dirección
export function montarTag(grupo) {
  const planta = crearPlanta(); planta.grupo.scale.setScalar(PLANTA); planta.grupo.rotation.y = GIRO; planta.grupo.position.copy(enPlanta(V(0, 0, 0))); grupo.add(planta.grupo);
  planta.tagSimple.visible = false;
  const tag = crearTag(); tag.grupo.scale.setScalar(E); tag.grupo.rotation.y = Math.PI; grupo.add(tag.grupo);
  const W = (xl, y, zl) => V(-xl * E, y, -zl * E);                // del tag (local) al mundo; la altura ya en el mundo
  const yPista = (TAG.top + 0.006 + 0.006) * E + 0.12;            // sobre el cobre, con el radio del electrón
  const zA = W(0, 0, TAG.zDipolo).z, xF = W(TAG.feed, 0, 0).x, zF = W(0, 0, TAG.zFeed).z - 0.02, zB = W(0, 0, TAG.zBobina).z;
  const R = TAG.rocky;
  const PATA = { lado: 'a', k: 3 };                                // la pata del lado de la antena que cae junto a la alimentación
  const pata = W(R.x + (PATA.k - 1.5) * TAG.paso, 0.2, R.z - R.w / 2 - 0.004).add(V(0, 0, 0.03));
  // (el tag, de cerca, con todo el reflejo del entorno brillaba demasiado; la planta, de lejos, lo lleva entero)
  tag.grupo.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.envMapIntensity = 0.4; }); });
  return { tag, W, yPista, zA, xF, zF, zB, pata, PATA, planta };
}

export default {
  nombre: 'El tag',
  dura: PREVIO + 12.1 + PAUSA + PAUSA2,
  quieto: [[FRENA, FRENA + MIRA], [PREVIO + T_DESVELA, PREVIO - ENTRA], [PREVIO + PARA, PREVIO + PARA + PAUSA],
    [PREVIO + PAUSA + PARA2, PREVIO + PAUSA + PARA2 + PAUSA2]],
  montar({ escena, cam, ren, electron, grupo, velo, habla }) {
    ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;

    grupo.add(new THREE.HemisphereLight(0xcfe0ff, 0x33373c, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(6, 10, 6);
    sol.position.set(-6, 10, 8); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    sol.shadow.bias = -0.0004; grupo.add(sol);
    const contra = new THREE.DirectionalLight(0x3d9bff, 1.2); contra.position.set(-6, 3, -8); grupo.add(contra);
    const luzE = new THREE.PointLight(0x5aa8ff, 5, 3, 2); grupo.add(luzE);      // la luz del electrón sobre el cobre

    // girado media vuelta: la antena queda delante, del lado de la cámara, y el electrón llega por delante, desde la planta
    const { tag, yPista, zA, xF, zF, zB, pata, PATA, planta } = montarTag(grupo);

    // la oficina de la entreplanta, iluminada (de lejos, que se vea al operario)
    const luzOficina = new THREE.PointLight(0xfff0dc, 9, 5 * PLANTA, 0); luzOficina.position.copy(enPlanta(OFICINA.clone().add(V(0, 2.4, 1.6)))); grupo.add(luzOficina);
    // los fotones que la antena de la planta manda al tag (puntos de tamaño fijo en pantalla: de lejos tienen que verse)
    const fuente = enPlanta(planta.cara), destino = V(0, yPista, zA), haz = destino.clone().sub(fuente);
    const ladoHaz = haz.clone().cross(V(0, 1, 0)).normalize();
    const fotones = Array.from({ length: 28 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaPunto(), color: new THREE.Color(1.6, 1.15, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
      grupo.add(sp); return sp;
    });
    const verFotones = (tReal, t) => {
      const vis = 1 - smooth(seg(t, 3.0, 5.0));
      fotones.forEach((sp, i) => {
        const f = (((tReal * 0.45 + i / fotones.length) % 1) + 1) % 1;
        sp.visible = vis > 0.01;
        sp.position.copy(fuente).addScaledVector(haz, f).addScaledVector(ladoHaz, 12 * Math.sin(f * 40 + i));
        sp.material.opacity = vis * Math.min(1, f / 0.08, (1 - f) / 0.08);
        sp.scale.setScalar(0.018);
      });
    };

    // polvo por el pasillo del vuelo
    const r = rng(3), n = 2500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[3 * i] = -40 + r() * 46; pos[3 * i + 1] = -4 + r() * 18; pos[3 * i + 2] = -12 + r() * 24; }
    const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const matPolvo = new THREE.PointsMaterial({ map: texturaPunto(), size: 0.07, color: 0x6fb4ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    grupo.add(new THREE.Points(gp, matPolvo));

    // la ruta, en coordenadas del mundo (las del tag por E)
    const aterriza = V(-7.9, yPista, zA);                            // en la punta del brazo (acaba en −8,16)
    // llega por la izquierda (desde la planta, que queda hacia −x) y baja a la punta del brazo
    const vuelo = new THREE.CatmullRomCurve3([V(-34, 9, 7), V(-24, 7, 6), V(-15, 4, 4.5), V(-10.2, 1.5, 3), aterriza]);
    const brazo = new THREE.LineCurve3(aterriza, V(xF, yPista, zA));
    const bajada = new THREE.LineCurve3(V(xF, yPista, zA), V(xF, yPista, zF));
    // el salto a la pata: sube un poco y se tira encima (en línea recta era un paso corto y lento antes del corte)
    const entra = new THREE.CatmullRomCurve3([V(xF, yPista, zF), V(xF, yPista + 0.3, (zF + pata.z) / 2 - 0.02), V(xF, 0.3, pata.z), pata]);
    const base = porTramos([
      { t0: 0, t1: 5.2, curva: vuelo, ease: (x) => x * (1.15 - 0.15 * x) },
      { t0: 6.0, t1: 9.6, curva: brazo },
      { t0: 9.6, t1: 10.9, curva: bajada, junta: true },                 // gira en el centro sin pararse
      { t0: 11.5, t1: 12.1, curva: entra, ease: pasa(0, 0.9) },            // se lanza y llega a la pata en el corte, aún en marcha
    ]);
    // antes de t = 0 sigue la recta por la que viene volando (así la estela que traía del plano 1 no se corta)
    const tangente0 = vuelo.getTangentAt(0), rapidez0 = 1.15 * vuelo.getLength() / 5.2;
    // el principio: llega frenando (en la dirección y a la velocidad con que acaba el plano 1) hasta LEJOS, a unos 18 m de
    // la planta, delante de ella: al pararse, la cámara se vuelve hacia la planta, con la oficina de frente (el operario
    // mirando su pantalla) y la máquina debajo. Luego vuela hasta MAQ, delante de la máquina, por el lado del generador,
    // y se para; la carcasa se desvanece y se ve dentro el rotor y el generador, con el tag; y entra hasta el principio del
    // vuelo de siempre por una curva que acaba en su dirección: lo que le falta mengua como una exponencial (la máquina
    // crece a ritmo constante) y acaba justo a rapidez0
    const DIR1 = V(10, -2, -1).normalize();                            // hacia donde sale corriendo al final del plano 1
    const P3 = vuelo.getPointAt(0), LEJOS = enPlanta(V(-4.0, 5.2, 14.0)), MIRA_P = enPlanta(V(1.0, 2.9, -4.0));   // de frente a la oficina
    const MAQ = enPlanta(V(GEN.x - 0.25, 1.5, MAQUINA.z1 + 1.25)), MAQ2 = MAQ.clone().lerp(V(0, 0, 0), 0.08);   // delante de la máquina; se arrima un poco
    const acerca = new THREE.CubicBezierCurve3(LEJOS, LEJOS.clone().lerp(MAQ, 0.4).add(V(0, 200, 0)), MAQ.clone().lerp(LEJOS, 0.25), MAQ);
    const P2 = P3.clone().addScaledVector(tangente0, -P3.distanceTo(MAQ2) * 0.3);
    const llegada = new THREE.CubicBezierCurve3(MAQ2, MAQ2.clone().lerp(P2, 0.4), P2, P3);
    llegada.arcLengthDivisions = 4000;
    const LL = llegada.getLength();
    let lo = 0.5, hi = 40;                                             // ka: LL·a·e^−a/(1 − e^−a) = rapidez0·ENTRA (bisección)
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (LL * m * Math.exp(-m) / (1 - Math.exp(-m)) > rapidez0 * ENTRA) lo = m; else hi = m; }
    const ka = (lo + hi) / 2;
    const previa = (t) => {
      if (t < -PREVIO + FRENA) {                                       // frenando
        const q = FRENA - (t + PREVIO);
        return LEJOS.clone().addScaledVector(DIR1, -rapidez0 * q * q / (2 * FRENA));
      }
      if (t < T_ACERCA) return LEJOS.clone();                          // mirando la planta
      if (t < T_DESVELA) return acerca.getPointAt(smoother(seg(t, T_ACERCA, T_DESVELA)));   // hasta la máquina
      if (t < -ENTRA) return MAQ.clone().lerp(MAQ2, smooth(seg(t, T_DESVELA, -ENTRA)));     // mirándola, se arrima
      const u = (t + ENTRA) / ENTRA, g = u * u * (2 - u);              // entra: sale de parado; al final, a la velocidad de siempre
      const falta = LL * (Math.exp(-ka * g) - Math.exp(-ka)) / (1 - Math.exp(-ka));
      return llegada.getPointAt(Math.min(1, Math.max(0, 1 - falta / LL)));
    };
    const ruta = (t) => {
      if (t < 0) return previa(t);
      const p = base(t);
      p.y += 0.38 * bell(t, 5.2, 5.62) + 0.1 * bell(t, 5.62, 5.85);                      // botes al aterrizar
      const zb = p.z;                                                                     // salto de la bobina
      if (t > 9.6 && t < 10.9) p.y += 0.2 * Math.max(0, 1 - Math.abs(zb - zB) / 0.32);
      p.y += 0.04 * bell(t, 11, 11.3);                                                  // saltito al ver el chip
      return p;
    };

    // los compañeros: fotones sin cara que vuelan con él (entran desde lejos, de los lados, y se le juntan) y, por delante
    // de él en el mismo brazo, se hunden en el cobre con un destello: su energía es el campo de la antena
    // los otros fotones: los del haz del lector, que llegan en línea desde su antena (la dirección del haz), ondulando, a
    // su sitio del brazo, por delante de él, y se hunden en el cobre con un destello (él llega por su cuenta, por otro lado)
    const COMPA = [[-7.0, 5.32], [-6.45, 5.42], [-5.9, 5.5], [-5.35, 5.6], [-4.8, 5.7]], VIAJE = 2.4, RAPIDO = 12;
    const dirHaz = haz.clone().normalize();
    const companeros = COMPA.map(([xl, tl], k) => {
      const e = new Electron(grupo, ren, { cara: false });
      const llega = V(xl, yPista, zA), fase = k * 1.7;
      const rutaK = (t) => {
        if (t < tl) {                                                     // por el haz, a velocidad constante
          const falta = tl - t, p = llega.clone().addScaledVector(dirHaz, -RAPIDO * falta);
          return p.addScaledVector(ladoHaz, 0.12 * Math.sin(falta * 9 + fase) * Math.min(1, falta * 2));
        }
        const p = llega.clone(); p.y -= 0.1 * smooth(seg(t, tl, tl + 0.4));                     // y se hunde en el cobre
        return p;
      };
      // el destello donde se hunde
      const chispa = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaPunto(), color: new THREE.Color(1.4, 1.2, 0.7), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      chispa.position.copy(llega).setY(yPista - 0.04); grupo.add(chispa);              // sin depthTest: el canto de la placa la cortaba
      return { e, rutaK, tl, k, chispa };
    });
    // y mientras explica la antena siguen llegando fotones del haz, poco a poco, por toda ella: cada uno a un sitio de
    // los dos brazos (ni encima de él, en la punta, ni en el centro), donde se hunde en el cobre con su destello. Son
    // unos pocos que se reciclan (cada llegada, al hueco k % HUECOS: no se pisan, llegan más espaciadas que su viaje)
    const LLUVIA = [], azar = rng(17), HUECOS = 10;
    for (let tl = PARA + 0.8; tl < PARA + PAUSA - 0.6; tl += 0.32 + 0.22 * azar()) {
      let x; do { x = (azar() * 2 - 1) * 7.9; } while (Math.abs(x) < 0.7 || x < -6.6);
      LLUVIA.push({ tl, llega: V(x, yPista, zA), fase: azar() * 6 });
    }
    const rutaLluvia = ({ tl, llega, fase }) => (t) => {
      if (t < tl) {
        const falta = tl - t, p = llega.clone().addScaledVector(dirHaz, -RAPIDO * falta);
        return p.addScaledVector(ladoHaz, 0.12 * Math.sin(falta * 9 + fase) * Math.min(1, falta * 2));
      }
      const p = llega.clone(); p.y -= 0.1 * smooth(seg(t, tl, tl + 0.4)); return p;
    };
    LLUVIA.forEach((a) => { a.ruta = rutaLluvia(a); });
    const gotas = Array.from({ length: HUECOS }, () => {
      const chispa = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaPunto(), color: new THREE.Color(1.4, 1.2, 0.7), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      grupo.add(chispa);
      return { e: new Electron(grupo, ren, { cara: false }), chispa };
    });

    // el campo eléctrico a lo largo del dipolo: barras detrás del cobre (para que no se crucen con él), con su valor con
    // signo: la distribución de un dipolo de media onda, sen(π|x| / 2L), nula en el centro y máxima en las puntas, de signo
    // contrario en cada brazo, que oscila (la fase positiva hacia arriba, en naranja; la negativa hacia abajo, en azul).
    // El cero, a la altura del cobre de la antena: lo positivo sube de ella y lo negativo baja. Van justo delante del canto
    // del tag (si no, las de abajo se metían en la placa); encima y debajo, la envolvente, fija.
    const LA = 8.16, NB = 64, HB = 0.5, zC = TAG.W / 2 * E + 0.06, y0 = (TAG.top + 0.012) * E;
    const xs = [];
    for (let i = 0; i < NB; i++) { const x = 0.12 + (LA - 0.12) * (i + 0.5) / NB; xs.push(-x, x); }
    const barras = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 1, 0.018).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), xs.length);   // sin sumar: de canto, a lo largo del brazo, se amontonaban en un resplandor
    barras.frustumCulled = false; grupo.add(barras);
    const env = (x) => Math.sin(Math.PI * Math.abs(x) / (2 * LA));
    const POS = new THREE.Color(1.3, 0.32, 0.04), NEG = new THREE.Color(0.12, 0.45, 1.5), cB = new THREE.Color(), mB = new THREE.Matrix4();
    const matLinea = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.25, 1.1), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    // las envolventes (+ y −, por brazo) se dibujan con altura HB en y = 0 y se escalan y suben con la línea base
    const envolvente = [];
    for (const sg of [-1, 1]) for (const signo of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 60; i++) { const x = sg * (0.06 + (LA - 0.06) * i / 60); pts.push(V(x, HB * env(x), zC)); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.006, 10), matLinea());
      m.userData.signo = signo; grupo.add(m); envolvente.push(m);
    }
    const ejeCampo = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 2 * LA, 6).rotateZ(Math.PI / 2), matLinea()); grupo.add(ejeCampo);   // el cero
    // la corriente hacia el chip: electrones (puntos azules) que corren por los dos brazos hacia el centro y bajan por la
    // alimentación; mientras lo explica
    const yCu = (TAG.top + 0.012) * E + 0.02;
    const caminos = [-1, 1].map((sg) => new THREE.CurvePath());
    caminos.forEach((c, i) => {
      const sg = i ? 1 : -1, xa = sg * Math.abs(xF);
      c.add(new THREE.LineCurve3(V(sg * 8.0, yCu, zA), V(xa, yCu, zA)));
      c.add(new THREE.LineCurve3(V(xa, yCu, zA), V(xa, yCu, zF)));
    });
    const NC = 16, corrienteP = [];
    for (let i = 0; i < 2 * NC; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaPunto(), color: new THREE.Color(0.5, 1.0, 1.9), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      grupo.add(sp); corrienteP.push(sp);
    }
    const corriente = (tReal, vista) => {
      const k = smooth(seg(tReal, PARA + HABLA + 6.6, PARA + HABLA + 7.2)) * (1 - smooth(seg(tReal, PARA + PAUSA - 0.6, PARA + PAUSA + 0.3)));
      corrienteP.forEach((sp, i) => {
        const c = caminos[i % 2], u = (((tReal * 0.35 + Math.floor(i / 2) / NC) % 1) + 1) % 1;
        sp.visible = k > 0.01;
        sp.position.copy(c.getPointAt(Math.min(0.999, u)));
        sp.material.opacity = 0.9 * k * Math.min(1, u / 0.06, (1 - u) / 0.06);
        sp.scale.setScalar(0.22 * (1 + 2.5 * vista));
      });
    };
    const campo = (tReal, t, vista, cerca) => {
      const A = smooth(seg(tReal, 5.25, 6.6)), c = Math.cos(tReal * 2 * Math.PI * 0.7);
      const alto = HB * (1 + 2.8 * vista), grueso = 1 + 3 * vista;              // de lejos, más grande
      const yB = y0;                                                             // el cero: el cobre
      // de cerca, y mientras corre por el brazo (la cámara lo ve a través de ellas), bajas: que no le tapen
      const corre = smooth(seg(t, 5.95, 6.5)) * (1 - smooth(seg(t, 9.3, 9.9)));
      barras.visible = A > 0.01; barras.material.opacity = 0.75 * (1 - 0.6 * cerca) * (1 - 0.75 * corre);
      barras.material.depthTest = vista < 0.05;                                 // de lejos, por encima de todo: lo de abajo se metía en la máquina
      xs.forEach((x, i) => {
        // crece desde las puntas hacia el centro, como si entrara por ellas
        const llega = smooth(seg(A * 1.4 - (1 - Math.abs(x) / LA) * 0.4, 0, 1));
        const v = Math.sign(x) * env(x) * c * llega;                             // con signo
        const h = Math.abs(v) < 0.002 ? 0.002 : alto * v;
        mB.makeScale(grueso, h, grueso).setPosition(x, yB, zC); barras.setMatrixAt(i, mB);
        barras.setColorAt(i, cB.copy(v >= 0 ? POS : NEG).multiplyScalar(0.35 + 0.65 * env(x)));
      });
      barras.instanceMatrix.needsUpdate = true; barras.instanceColor.needsUpdate = true;
      envolvente.forEach((m) => { m.material.opacity = 0.3 * A; m.scale.y = m.userData.signo * alto / HB; m.position.y = yB; });
      ejeCampo.material.opacity = 0.35 * A; ejeCampo.position.set(0, yB, zC);
      envolvente.forEach((m) => { m.material.depthTest = vista < 0.05; });
    };

    const sigue = (dx, dy, dz) => (t) => ruta(t).add(V(dx, dy, dz));
    // hacia la planta, pero a un punto cercano (con el de verdad, a miles de unidades, el giro se iba al principio)
    const haciaPlanta = (t) => { const e = ruta(t); return e.clone().add(MIRA_P.clone().sub(e).setLength(4)); };   // a la distancia de la mira de SIGUE: si no, al pasar de una a otra se le iba de cuadro
    // volando hacia la máquina: detrás de él, mirando al tag; delante de ella, un poco más atrás, más arriba y a un lado
    const haciaTag = (t) => { const e = ruta(t); return e.clone().add(V(0, 0, 0).sub(e).setLength(4)); };
    const trasEl2 = (t) => { const e = ruta(t), f = e.clone().negate().normalize(); return e.addScaledVector(f, -3.0).add(V(0, 0.8, 0)); };
    const anteMaq = (t) => {
      const e = ruta(t), f = e.clone().negate().normalize(), r = f.clone().cross(V(0, 1, 0)).normalize();
      return e.addScaledVector(f, -4.0).addScaledVector(r, -1.2).add(V(0, 1.6, 0));
    };
    // detrás de él según esa mirada, un poco a la derecha y por encima: él queda abajo a la izquierda
    const trasEl = (t) => {
      const e = ruta(t), f = MIRA_P.clone().sub(e).normalize(), r = f.clone().cross(V(0, 1, 0)).normalize();
      return e.addScaledVector(f, -3.2).addScaledVector(r, 1.0).add(V(0, 0.55, 0));   // del mismo lado que lo sigue la cámara (SIGUE_INICIO)
    };
    const camara = porClaves([
      // el principio: lo sigue como acaba el plano 1; al pararse, por encima de su hombro hacia la planta, más abierta
      { t: -PREVIO, pos: sigue(...SIGUE_INICIO.pos.toArray()), mira: sigue(...SIGUE_INICIO.mira.toArray()), fov: SIGUE_INICIO.fov },
      { t: -PREVIO + FRENA + 2.1, pos: trasEl, mira: haciaPlanta, fov: 36 },               // se vuelve con él a mirarla, despacio
      { t: T_ACERCA - 0.1, pos: trasEl, mira: haciaPlanta, fov: 31 },                      // mientras habla, cierra un poco
      { t: T_ACERCA + 1.4, pos: trasEl2, mira: haciaTag, fov: 38, paso: true },            // volando, detrás de él, hacia la máquina
      { t: T_DESVELA + 0.2, pos: anteMaq, mira: haciaTag, fov: 46 },                       // delante de la máquina: se ve dentro
      { t: -ENTRA, pos: anteMaq, mira: haciaTag, fov: 40 },
      { t: -ENTRA + 1.0, pos: trasEl2, mira: haciaTag, fov: 36, paso: true },              // entra, detrás de él
      { t: 1.4, pos: sigue(...SIGUE_INICIO.pos.toArray()), mira: sigue(...SIGUE_INICIO.mira.toArray()), fov: SIGUE_INICIO.fov },   // y, ya en el vuelo de siempre, a seguirlo
      { t: 2.6, pos: sigue(...SIGUE_INICIO.pos.toArray()), mira: sigue(...SIGUE_INICIO.mira.toArray()), fov: SIGUE_INICIO.fov },
      { t: 4.2, pos: sigue(...SIGUE_INICIO.pos.toArray()), mira: sigue(...SIGUE_INICIO.mira.toArray()), fov: SIGUE_INICIO.fov, paso: true },   // lo sigue hasta que va a aterrizar
      { t: 5.7, pos: V(-14.0, 6.0, 3.6), mira: V(-6.2, 0.3, 2.2), fov: 38 },               // desde la izquierda y arriba: el haz entra por la derecha
      { t: PARA, pos: V(-14.0, 6.0, 3.6), mira: V(-6.2, 0.3, 2.2), fov: 38 },              // (quieta en la pausa: debajo de la vista general)
      // por el brazo, la cámara va por delante y a un lado: se le ve la cara mirando hacia donde corre
      { t: 6.0, pos: sigue(2.3, 0.85, 2.1), mira: sigue(-0.5, -0.1, 0), fov: 34 },   // (debajo de la vista general, que se va despacio)
      { t: 8.6, pos: sigue(2.3, 0.85, 2.1), mira: sigue(-0.5, -0.1, 0), fov: 34 },
      { t: 10.0, pos: V(0.6, 1.4, 3.2), mira: V(-0.15, 0.25, 1.15), fov: 30, paso: true },
      { t: 11.1, pos: V(-0.7, 1.15, 2.3), mira: V(-0.05, 0.3, 0.85), fov: 30, paso: true },
      { t: 11.95, pos: sigue(...PLANO_FINAL.toArray()), mira: sigue(0, 0, 0), fov: 30 },   // en el corte, ruta = pata
    ]);

    const FONDO = new THREE.Color(FONDO_TAG);
    // en tiempo real, con la pausa (y un saltito de sorpresa al pararse)
    const rutaR = (t) => ruta(tr(t)).add(V(0, 0.1 * bell(t, PARA, PARA + 0.35), 0));
    const mira0 = V(), fwd = V();

    return {
      entrar() { escena.background = FONDO.clone(); },
      actualizar(tPlano) {
        const tReal = tPlano - PREVIO, t = tr(tReal);
        cam.near = t < 0 ? 0.3 : 0.02; cam.far = t < 0 ? 30000 : 8000;  // la planta, alrededor (de lejos, entera)
        camara(t, cam);
        // en la pausa, la cámara se le acerca de frente y vuelve a donde estaba
        const cerca = smoother(seg(tReal, PARA - 0.3, PARA + 1.1)) * (1 - smoother(seg(tReal, PARA + HABLA - 0.1, PARA + HABLA + 0.8)));
        if (cerca > 0) {
          const e = rutaR(tReal);
          cam.getWorldDirection(fwd); mira0.copy(cam.position).addScaledVector(fwd, cam.position.distanceTo(e));
          cam.position.lerp(e.clone().add(V(-2.0, 0.85, 1.1)), cerca);
          cam.lookAt(mira0.lerp(e.clone().add(V(0.25, 0.15, 0)), cerca));
          cam.fov = lerp(cam.fov, 32, cerca);
        }
        // y luego se aleja hasta ver la antena entera con su campo, y vuelve
        const vista = smoother(seg(tReal, PARA + HABLA - 0.1, PARA + HABLA + 1.4)) * (1 - smoother(seg(tReal, PARA + PAUSA + 0.1, PARA + PAUSA + 1.5)));   // ya corriendo: baja hasta él sin dar la vuelta
        if (vista > 0) {
          cam.getWorldDirection(fwd); mira0.copy(cam.position).addScaledVector(fwd, cam.position.distanceTo(VISTA.mira));
          cam.position.lerp(VISTA.pos, vista);
          cam.lookAt(mira0.lerp(VISTA.mira, vista * vista));             // la mira, más tarde que la posición: no se le va de cuadro
          cam.fov = lerp(cam.fov, VISTA.fov, vista);
        }

        electron.visible = true;
        electron.ruta = (s) => rutaR(s - PREVIO); electron.rutaDesde = 0;
        electron.forma = 1 - smooth(seg(t, 5.15, 5.6));                   // al tocar el cobre, de fotón a electrón
        electron.sorpresa = smooth(seg(tReal, 5.6, 5.9)) * (1 - smooth(seg(tReal, PARA + HABLA - 0.4, PARA + HABLA)));
        habla(dialogo(tReal, LINEAS));
        electron.calor = 0; electron.brillo = 0.25 * smooth(seg(t, 11.7, 12.1)) + 0.8 * bell(t, 5.1, 5.8);
        electron.ojos = 1;
        electron.estela = t < 0 && t > -ENTRA ? 1 - 0.85 * Math.sin(Math.PI * (t + ENTRA) / ENTRA) : t < 5.3 ? 1 : 0.55;   // muy deprisa, casi sin estela
        electron.tam = t < 11.5 ? 1 : lerp(1, TAM_FINAL, smooth(seg(t, 11.55, 12.05)));
        const mx = t < 5.0 ? 1 : t < 5.9 ? 0 : t < 9.7 ? 1 : 0;
        const my = t > 4.8 && t < 5.3 ? -0.8 : t > 10.9 && t < 11.6 ? 0.9 : 0;
        electron.mirada.set(lerp(electron.mirada.x, mx, 0.2), lerp(electron.mirada.y, my, 0.2));

        companeros.forEach(({ e, rutaK, tl, k, chispa }) => {
          const t = tReal;                                                // en tiempo real: se hunden aunque él se pare
          e.ruta = rutaK; e.rutaDesde = -1;
          e.visible = t > tl - VIAJE && t < tl + 0.4;
          e.tam = 0.8 * smooth(seg(t, tl - VIAJE, tl - VIAJE + 0.5)) * (1 - smooth(seg(t, tl, tl + 0.4)));
          e.forma = 1;                                                    // siguen siendo fotones: se los traga la antena
          e.brillo = 0.3 + 0.9 * bell(t, tl - 0.1, tl + 0.4);
          e.estela = 0.8;
          e.actualizar(tReal, cam);
          const b = bell(t, tl - 0.05, tl + 0.6);
          chispa.visible = b > 0.01; chispa.material.opacity = 0.9 * b; chispa.scale.setScalar(0.4 + 0.9 * b);
        });
        gotas.forEach(({ e, chispa }) => { e.visible = false; chispa.visible = false; });
        LLUVIA.forEach((a, k) => {
          const { tl } = a;
          if (tReal < tl - VIAJE || tReal > tl + 0.6) return;
          const { e, chispa } = gotas[k % HUECOS];
          e.ruta = a.ruta; e.rutaDesde = tl - VIAJE;
          e.visible = tReal < tl + 0.4;
          e.tam = 0.8 * smooth(seg(tReal, tl - VIAJE, tl - VIAJE + 0.5)) * (1 - smooth(seg(tReal, tl, tl + 0.4)));
          e.forma = 1; e.brillo = 0.3 + 0.9 * bell(tReal, tl - 0.1, tl + 0.4); e.estela = 0.8;
          const b = bell(tReal, tl - 0.05, tl + 0.6);
          chispa.position.copy(a.llega).setY(yPista - 0.04);
          chispa.visible = b > 0.01; chispa.material.opacity = 0.9 * b; chispa.scale.setScalar(0.4 + 0.9 * b);
        });
        gotas.forEach(({ e }) => e.actualizar(tReal, cam));             // (también los que no están: así se esconden)
        campo(tReal, t, vista, cerca);
        verFotones(tReal, t);
        corriente(tReal, vista);
        // la máquina: al acercarse, su carcasa se hace transparente y se ve dentro el generador, con el tag, y el rotor
        planta.verDentro(t < 0 ? smooth(seg(t, T_DESVELA + 0.2, -ENTRA - 0.1)) : 1);   // delante de ella, despacio
        planta.girar(tPlano);

        luzE.position.copy(rutaR(tReal)); luzE.intensity = t > 5 ? 2.5 : 0;
        tag.matAnt.emissiveIntensity = 1 + 1.6 * bell(t, 5.3, 6.4);       // la antena se enciende al recibirlo

        // la pata a la que se lanza se enciende
        const enciende = smooth(seg(t, 11.7, 12.1));
        tag.patas.forEach((p) => {
          const esta = p.lado === PATA.lado && p.k === PATA.k;
          p.malla.material.emissive.setHex(0x3d9bff); p.malla.material.emissiveIntensity = esta ? 3 * enciende : 0;
        });

        matPolvo.opacity = 0.55 * (1 - smooth(seg(t, 4.5, 6.5))) + 0.12;
        velo(0.6 * smooth(seg(t, 11.9, 12.1)), 0xcfe6ff);               // destello del corte
      },
    };
  },
};
