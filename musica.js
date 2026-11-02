// La música del corto, compuesta para él y sintetizada en el navegador (Web Audio, sin muestras ni ficheros): un
// OfflineAudioContext la renderiza entera de una vez y sonido.js la reproduce con la imagen. Va cuadrada con el guion
// (audio/guion.json: los cortes, los destellos y los cambios de forma de Blinky): cada sección arranca en su corte, los
// destellos llevan subida e impacto, y el tema de Blinky (una frase de campana) vuelve al presentarse, al hacerse dato y
// al final. El estilo, synthwave (el que le gusta a Aritz): batería de los 80 con la caja en reverb con puerta, bajo outrun
// en semicorcheas que saltan de octava, pads anchos con chorus que bombean con el bombo, arpegios con eco de corchea con
// puntillo de lado a lado, un lead con glissando que toca el tema en los vuelos, y la saturación de cinta en el máster; con
// momentos de asombro tranquilos. Re menor; acaba como empieza (el pad del logo), para que el bucle no se note.
//
// componer(guion, sr, S): S pasa un segundo de la película al del audio (en modo sonido la imagen se estira donde la voz
// no cabe; sonido.js) y la música se escribe en segundos de la película, así que se estira con ella.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// los acordes (midi), en re menor
const AC = {
  Dm: [50, 53, 57, 64], Bb: [46, 50, 53, 57], F: [41, 48, 53, 57], C: [48, 52, 55, 62], Gm: [43, 50, 55, 58],
  A: [45, 52, 57, 61], Dsus: [50, 55, 57, 64], D: [50, 54, 57, 62], G: [43, 50, 55, 59], Bm: [47, 50, 54, 59],
  Am: [45, 52, 57, 60], Em: [40, 47, 52, 55],
};
// el tema de Blinky: [tiempo en pulsos, nota, duración en pulsos]
const TEMA = [[0, 74, 0.5], [0.5, 81, 0.25], [0.75, 79, 0.25], [1, 77, 0.5], [1.5, 76, 0.25], [1.75, 77, 0.25], [2, 74, 1.5]];
const PREGUNTA = [[0, 74, 0.5], [0.5, 77, 0.5], [1, 81, 0.5], [1.5, 79, 0.5], [2, 81, 0.25], [2.25, 84, 1.25]];

export async function componer(guion, sr, S = (t) => t) {
  const total = S(guion.total);
  const empieza = performance.now();
  const oc = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const azar = rng(7);

  // ------------------------------------------------------------------ mesa: bus, reverb, eco
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  // la saturación de cinta, antes del compresor: redondea los picos y da el calor analógico
  const cinta = oc.createWaveShaper(); cinta.oversample = '2x';
  cinta.curve = Float32Array.from({ length: 1025 }, (_, i) => Math.tanh(1.6 * (i / 512 - 1)) / Math.tanh(1.6));
  const master = oc.createGain(); master.gain.value = 0.55; master.connect(cinta); cinta.connect(comp); comp.connect(oc.destination);
  const rev = oc.createConvolver(); rev.buffer = respuesta(oc, 4.2); const gRev = oc.createGain(); gRev.gain.value = 0.55; rev.connect(gRev); gRev.connect(master);
  // la reverb con puerta de la caja (los 80): suena llena un tercio de segundo y se corta en seco
  const puerta = oc.createConvolver(); puerta.buffer = respuesta(oc, 0.34, 0.15); const gPuerta = oc.createGain(); gPuerta.gain.value = 0.8; puerta.connect(gPuerta); gPuerta.connect(master);
  // el eco: de corchea con puntillo, que rebota de un lado al otro y se oscurece en cada vuelta
  const eco = oc.createGain(), ecoI = oc.createDelay(2), ecoD = oc.createDelay(2); ecoI.delayTime.value = ecoD.delayTime.value = 0.39;
  const fEco = oc.createBiquadFilter(); fEco.type = 'lowpass'; fEco.frequency.value = 2800;
  const fbEco = oc.createGain(); fbEco.gain.value = 0.32; const gEco = oc.createGain(); gEco.gain.value = 0.3;
  const pI = oc.createStereoPanner(), pD = oc.createStereoPanner(); pI.pan.value = -0.8; pD.pan.value = 0.8;
  eco.connect(fEco); fEco.connect(ecoI); ecoI.connect(pI); ecoI.connect(ecoD); ecoD.connect(pD); ecoD.connect(fbEco); fbEco.connect(fEco);
  pI.connect(gEco); pD.connect(gEco); gEco.connect(master); gEco.connect(rev);
  // el bombeo (sidechain): lo que va por aquí se agacha con cada bombo y vuelve a subir (pads, bajo, metales)
  const bombeo = oc.createGain(); bombeo.connect(master); const latidos = [];
  const ruido = (() => { const b = oc.createBuffer(1, sr * 2, sr), d = b.getChannelData(0), r = rng(3); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b; })();

  // una voz: su ganancia (la envolvente), a un bus compartido por todas las que van con el mismo paneo, reverb y eco
  // (uno por nota hacía el grafo enorme y lentísimo de renderizar)
  const buses = new Map();
  function bus(pan, rv, ec, gt, bombea) {
    const k = `${pan.toFixed(1)}|${rv.toFixed(2)}|${ec.toFixed(2)}|${gt.toFixed(2)}|${bombea}`;
    if (!buses.has(k)) {
      const p = oc.createStereoPanner(); p.pan.value = +pan.toFixed(1); p.connect(bombea ? bombeo : master);
      if (rv) { const s = oc.createGain(); s.gain.value = +rv.toFixed(2); p.connect(s); s.connect(rev); }
      if (ec) { const s = oc.createGain(); s.gain.value = +ec.toFixed(2); p.connect(s); s.connect(eco); }
      if (gt) { const s = oc.createGain(); s.gain.value = +gt.toFixed(2); p.connect(s); s.connect(puerta); }
      buses.set(k, p);
    }
    return buses.get(k);
  }
  function salida(vol, { pan = 0, rv = 0.2, ec = 0, gt = 0, bombea = false } = {}) {
    const g = oc.createGain(); g.gain.value = 0; g.connect(bus(pan, rv, ec, gt, bombea));
    return g;
  }
  const env = (g, t, a, d, pico, sost = 0, r = 0.1, fin = t + a + d) => {
    g.setValueAtTime(0, t); g.linearRampToValueAtTime(pico, t + a);
    g.setTargetAtTime(sost, t + a, d / 3); g.setValueAtTime(sost > 0 ? sost : 0.0001, fin); g.linearRampToValueAtTime(0, fin + r);
  };

  // ------------------------------------------------------------------ instrumentos
  // pad: dos sierras desafinadas por nota, una a cada lado y ondulando despacio (el chorus de los Juno), filtradas, con
  // ataque y caída lentos; bombea con el bombo
  function pad(t0, t1, notas, vol, { brillo = 900, at = 1.2, rel = 1.5, pan = 0, abre = null } = {}) {
    const a = S(t0), b = S(t1);
    if (b <= a) return;
    const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = brillo; f.Q.value = 0.6;
    if (abre) { f.frequency.setValueAtTime(brillo, S(abre[0])); f.frequency.linearRampToValueAtTime(abre[2], S(abre[1])); }   // [desde, hasta, frecuencia]
    const g = salida(1, { pan, rv: 0.6, bombea: true });
    f.connect(g);
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(vol, a + Math.min(at, (b - a) / 2));
    g.gain.setValueAtTime(vol, Math.max(a + Math.min(at, (b - a) / 2), b)); g.gain.linearRampToValueAtTime(0, b + rel);
    const lado = [-0.6, 0.6].map((x) => { const p = oc.createStereoPanner(); p.pan.value = x; p.connect(f); return p; });
    for (const n of notas) [-8, 8].forEach((det, k) => {
      const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
      const lfo = oc.createOscillator(), gl = oc.createGain(); lfo.frequency.value = 0.3 + azar() * 0.4; gl.gain.value = 6;
      lfo.connect(gl); gl.connect(o.detune);
      const go = oc.createGain(); go.gain.value = 0.12; o.connect(go); go.connect(lado[k]);
      o.start(a); o.stop(b + rel + 0.1); lfo.start(a); lfo.stop(b + rel + 0.1);
    });
  }
  // pulsación: sierra corta con el filtro que se abre y se cierra (los arpegios)
  function pulso(t, n, dur, vol, { tipo = 'sawtooth', brillo = 3200, pan = 0, ec = 0.25 } = {}) {
    const a = S(t), d = S(t + dur) - a;
    const o = oc.createOscillator(); o.type = tipo; o.frequency.value = midi(n); o.detune.value = (azar() - 0.5) * 8;   // (la deriva analógica)
    const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(brillo, a); f.frequency.exponentialRampToValueAtTime(260, a + Math.max(0.05, d));
    const g = salida(1, { pan, rv: 0.15, ec });
    env(g.gain, a, 0.004, d, vol, 0, 0.05);
    o.connect(f); f.connect(g); o.start(a); o.stop(a + d + 0.2);
  }
  // campana: senos inarmónicos que se apagan (el tema de Blinky, los destellos de asombro)
  function campana(t, n, vol, { dur = 2.2, pan = 0, ec = 0.3 } = {}) {
    const a = S(t);
    const g = salida(1, { pan, rv: 0.5, ec });
    g.gain.setValueAtTime(vol, a);
    for (const [r, v, dd] of [[1, 1, 1], [2, 0.35, 0.6], [2.76, 0.22, 0.4], [5.4, 0.1, 0.18]]) {
      const o = oc.createOscillator(); o.frequency.value = midi(n) * r;
      const go = oc.createGain(); go.gain.setValueAtTime(v, a); go.gain.exponentialRampToValueAtTime(0.0001, a + dur * dd);
      o.connect(go); go.connect(g); o.start(a); o.stop(a + dur * dd + 0.05);
    }
  }
  // bajo: sierra y seno una octava abajo, filtrados; bombea con el bombo
  function bajo(t, n, dur, vol) {
    const a = S(t), d = S(t + dur) - a;
    const g = salida(1, { rv: 0.05, bombea: true });
    const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(900, a); f.frequency.exponentialRampToValueAtTime(180, a + d);
    env(g.gain, a, 0.005, d * 0.9, vol, vol * 0.4, 0.04, a + d);
    for (const [tipo, k, v] of [['sawtooth', 1, 0.6], ['sine', 0.5, 0.9]]) {
      const o = oc.createOscillator(); o.type = tipo; o.frequency.value = midi(n) * k;
      const go = oc.createGain(); go.gain.value = v; o.connect(go); go.connect(f); o.start(a); o.stop(a + d + 0.1);
    }
    f.connect(g);
  }
  // metales de sintetizador: sierras con el filtro que se abre despacio
  function metal(t, notas, dur, vol, { pan = 0 } = {}) {
    const a = S(t), d = S(t + dur) - a;
    const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(300, a); f.frequency.linearRampToValueAtTime(2600, a + 0.25); f.frequency.setTargetAtTime(1400, a + 0.25, 0.4);
    const g = salida(1, { pan, rv: 0.45, bombea: true });
    env(g.gain, a, 0.05, 0.3, vol, vol * 0.7, 0.5, a + d);
    f.connect(g);
    for (const n of notas) for (const det of [-9, 0, 9]) {
      const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
      const go = oc.createGain(); go.gain.value = 0.1; o.connect(go); go.connect(f); o.start(a); o.stop(a + d + 0.7);
    }
  }
  // percusión, de caja de ritmos de los 80. El bombo: el parche (un seno que cae deprisa)
  function parche(t, vol) {
    const a = S(t), o = oc.createOscillator(), g = salida(1, { rv: 0.03 });
    o.frequency.setValueAtTime(160, a); o.frequency.exponentialRampToValueAtTime(45, a + 0.09);
    g.gain.setValueAtTime(vol, a); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.5);
    o.connect(g); o.start(a); o.stop(a + 0.55);
  }
  function ruidoCorto(t, vol, tipo, frec, dur, { pan = 0, rv = 0.15, q = 0.8, gt = 0 } = {}) {
    const a = S(t), s = oc.createBufferSource(); s.buffer = ruido; s.loop = true;
    const f = oc.createBiquadFilter(); f.type = tipo; f.frequency.value = frec; f.Q.value = q;
    const g = salida(1, { pan, rv, gt });
    g.gain.setValueAtTime(vol, a); g.gain.exponentialRampToValueAtTime(0.0001, a + dur);
    s.connect(f); f.connect(g); s.start(a, azar() * 1.5); s.stop(a + dur + 0.05);
  }
  // el tom electrónico (tipo Simmons): un seno que baja una octava, con su reverb con puerta
  function tom(t, n, vol = 0.5) {
    const a = S(t), o = oc.createOscillator(), g = salida(1, { rv: 0.3, gt: 0.3 });
    o.frequency.setValueAtTime(midi(n) * 2, a); o.frequency.exponentialRampToValueAtTime(midi(n), a + 0.22);
    g.gain.setValueAtTime(vol, a); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.6); o.connect(g); o.start(a); o.stop(a + 0.65);
  }
  // subida: ruido filtrado que se abre y sube, con una sierra que sube de tono, hasta el destello
  function subida(t0, t1, vol = 0.35) {
    const a = S(t0), b = S(t1), s = oc.createBufferSource(); s.buffer = ruido; s.loop = true;
    const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(300, a); f.frequency.exponentialRampToValueAtTime(7000, b);
    const g = salida(1, { rv: 0.4 });
    g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(vol, b); g.gain.linearRampToValueAtTime(0, b + 0.05);
    s.connect(f); f.connect(g); s.start(a); s.stop(b + 0.1);
    const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, a); o.frequency.exponentialRampToValueAtTime(880, b);
    const fo = oc.createBiquadFilter(); fo.type = 'lowpass'; fo.frequency.value = 2400;
    const go = salida(1, { rv: 0.4 }); go.gain.setValueAtTime(0.0001, a); go.gain.exponentialRampToValueAtTime(vol * 0.35, b); go.gain.linearRampToValueAtTime(0, b + 0.05);
    o.connect(fo); fo.connect(go); o.start(a); o.stop(b + 0.1);
  }
  // el lead: una sierra y una cuadrada a una, con glissando desde la nota anterior y un vibrato que entra tarde
  function lead(t, n, dur, vol, { desde = null, pan = 0.05 } = {}) {
    const a = S(t), d = S(t + dur) - a;
    const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(1200, a); f.frequency.linearRampToValueAtTime(3400, a + 0.06); f.frequency.setTargetAtTime(2200, a + 0.06, 0.3);
    const g = salida(1, { pan, rv: 0.35, ec: 0.35 });
    env(g.gain, a, 0.01, 0.2, vol, vol * 0.8, 0.12, a + d);
    const vib = oc.createOscillator(), gv = oc.createGain(); vib.frequency.value = 5.5;
    gv.gain.setValueAtTime(0, a); gv.gain.setValueAtTime(0, a + 0.25); gv.gain.linearRampToValueAtTime(14, a + 0.7); vib.connect(gv);
    for (const [tipo, det, v] of [['sawtooth', -5, 0.5], ['square', 5, 0.3]]) {
      const o = oc.createOscillator(); o.type = tipo; o.detune.value = det; gv.connect(o.detune);
      if (desde != null) { o.frequency.setValueAtTime(midi(desde), a); o.frequency.exponentialRampToValueAtTime(midi(n), a + 0.06); } else o.frequency.value = midi(n);
      const go = oc.createGain(); go.gain.value = v; o.connect(go); go.connect(f); o.start(a); o.stop(a + d + 0.2);
    }
    vib.start(a); vib.stop(a + d + 0.2);
    f.connect(g);
  }
  // impacto: un golpe grave y largo con su cola de ruido (en los destellos)
  function golpe(t, vol) {
    const a = S(t), o = oc.createOscillator(), g = salida(1, { rv: 0.6 });
    o.frequency.setValueAtTime(95, a); o.frequency.exponentialRampToValueAtTime(30, a + 1.2);
    g.gain.setValueAtTime(vol, a); g.gain.exponentialRampToValueAtTime(0.0001, a + 1.8);
    o.connect(g); o.start(a); o.stop(a + 1.9);
  }
  function impacto(t, vol = 0.8, { brillo = 1 } = {}) {
    golpe(t, vol);
    ruidoCorto(t, 0.3 * vol * brillo, 'lowpass', 2500 * brillo, 1.4, { rv: 0.8 });
    if (brillo > 0.5) for (const n of [86, 93, 98]) campana(t + 0.02, n, 0.05 * brillo, { dur: 3, pan: azar() - 0.5 });
  }
  // cada nota se crea justo antes de sonar (ver el final): aquí solo se apunta en la cola, con su segundo del audio
  const cola = [];
  const diferir = (f) => (...args) => { cola.push([S(args[0]), () => f(...args)]); };
  pad = diferir(pad); pulso = diferir(pulso); campana = diferir(campana); bajo = diferir(bajo); metal = diferir(metal); lead = diferir(lead);
  parche = diferir(parche); ruidoCorto = diferir(ruidoCorto); tom = diferir(tom); subida = diferir(subida); golpe = diferir(golpe);

  // el bombo: el parche y el clic del mazo, y apunta el latido para el bombeo
  const bombo = (t, vol = 0.9) => { latidos.push(S(t)); parche(t, vol); ruidoCorto(t, vol * 0.2, 'highpass', 3000, 0.02, { rv: 0 }); };
  // la caja de los 80: ruido con cuerpo, una palmada encima (tres golpes de ruido muy juntos) y la reverb con puerta
  const caja = (t, vol = 0.5) => {
    ruidoCorto(t, vol, 'bandpass', 1900, 0.18, { rv: 0.15, gt: 0.9 });
    [0, 0.011, 0.023].forEach((d) => ruidoCorto(t + d, vol * 0.45, 'bandpass', 1200, 0.03, { rv: 0, gt: 0.5, q: 1.5 }));
    pulso(t, 55, 0.08, vol * 0.4, { tipo: 'triangle', brillo: 900, ec: 0 });
  };
  const charles = (t, vol = 0.18, abierto = false) => ruidoCorto(t, vol, 'highpass', 7500, abierto ? 0.28 : 0.045, { pan: 0.25, rv: 0.05 });

  // el silbido de un salto rápido (un fotón que sale disparado, el paquete que sube)
  const silbido = (t0, t1, vol = 0.25) => subida(t0, t1, vol);
  // el tema de Blinky, en campana, a un tempo
  const tema = (t, bpm, frase = TEMA, vol = 0.22, trasp = 0) => frase.forEach(([p, n, d]) => campana(t + p * 60 / bpm, n + trasp, vol, { dur: 0.6 + d * 60 / bpm * 1.6, pan: 0.1 }));
  // y en el lead, en los vuelos: cada nota se desliza desde la anterior
  const temaLead = (t, bpm, frase = TEMA, vol = 0.09, trasp = -12) =>
    frase.forEach(([p, n, d], i) => lead(t + p * 60 / bpm, n + trasp, d * 60 / bpm * 0.95, vol, { desde: i ? frase[i - 1][1] + trasp : null }));

  // un ritmo: recorre [desde, hasta) a bpm con los acordes en bucle y llama a cada parte por semicorchea
  function seccion({ desde, hasta, bpm, acordes, compases = 1, partes }) {
    const p16 = 60 / bpm / 4, porAcorde = 16 * compases;
    for (let i = 0, t = desde; t < hasta - 1e-6; i++, t = desde + i * p16) {
      const ac = AC[acordes[Math.floor(i / porAcorde) % acordes.length]];
      const paso = i % 16, enAcorde = i % porAcorde;
      for (const parte of partes) parte({ t, i, paso, enAcorde, ac, p16, porAcorde, hasta });
    }
  }
  const arpegio = (vol, { oct = 12, dibujo = [0, 1, 2, 3, 2, 1], cada = 1, tipo = 'sawtooth', brillo = 3200, pan = -0.2, ec = 0.3 } = {}) =>
    ({ t, i, ac, p16 }) => { if (i % cada) return; const n = ac[dibujo[(i / cada) % dibujo.length] % ac.length] + oct; pulso(t, n, p16 * cada * 0.9, vol, { tipo, brillo, pan, ec }); };
  const bajoCorcheas = (vol, oct = -12) => ({ t, paso, ac, p16 }) => { if (paso % 2 === 0) bajo(t, ac[0] + oct + (paso % 8 === 6 ? 12 : 0), p16 * 1.8, vol); };
  // el bajo outrun: semicorcheas que saltan de octava, cortas, con el primer golpe de cada pulso más fuerte
  const bajoOutrun = (vol, oct = -12) => ({ t, paso, ac, p16 }) => bajo(t, ac[0] + oct + (paso % 2 ? 12 : 0), p16 * 0.85, vol * (paso % 4 ? 0.75 : 1));
  const bajoNegras = (vol, oct = -12) => ({ t, paso, ac, p16 }) => { if (paso % 4 === 0) bajo(t, ac[0] + oct, p16 * 3.6, vol); };
  const bateria = ({ k = [0, 8], s = [4, 12], h = [2, 6, 10, 14], vk = 0.8, vs = 0.45, vh = 0.15 } = {}) =>
    ({ t, paso }) => { if (k.includes(paso)) bombo(t, vk); if (s.includes(paso)) caja(t, vs); if (h.includes(paso)) charles(t, vh); };
  const padAcordes = (vol, opc) => ({ t, enAcorde, ac, p16, porAcorde, hasta }) => { if (enAcorde === 0) pad(t, Math.min(hasta, t + porAcorde * p16), ac, vol, { at: 0.6, rel: 0.9, ...opc }); };

  // ------------------------------------------------------------------ la partitura, en segundos de la película
  const [, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11] = guion.cortes, FIN = guion.total;
  const destello = (k) => guion.destellos[k].t;
  const nace = destello(0), vuelveTag = destello(4), estalla = destello(7), alerta = destello(9);
  const electron = guion.formas.find((f) => f.forma === 0 && f.t > 1)?.t ?? c2 + 16.6;           // aterriza en la antena
  const fotonOtra = guion.formas.find((f) => f.forma === 1 && f.t > c5)?.t ?? c5 + 21.2;
  const enLector = guion.formas.find((f) => f.forma === 0 && f.t > c6)?.t ?? c6 + 5.2;
  const L = (n) => guion.lineas[n - 1].t0;                                                         // cuándo empieza la frase n

  // 1 · el logo: el pad del principio (el mismo del final), brillos de campana, y la subida hasta el destello del que nace
  const padLogo = (a, b) => { pad(a, b, [50, 57, 64, 69], 0.5, { brillo: 700, at: 0.01, rel: 0.6 }); pad(a, b, [38], 0.35, { brillo: 300, at: 0.01, rel: 0.6 }); };
  padLogo(0, nace + 0.2);
  [[0.6, 81], [2.1, 88], [3.4, 86], [4.6, 93], [5.5, 91]].forEach(([t, n]) => campana(t, n, 0.07, { dur: 3, pan: azar() - 0.5 }));
  subida(nace - 2.2, nace, 0.3); impacto(nace, 0.55);
  // nace y se presenta: asombro (Bb, F, C, Dm), el tema al decir hola, y arranca suave mientras se presenta
  seccion({ desde: nace, hasta: c2, bpm: 96, acordes: ['Bb', 'F', 'C', 'Dm'], compases: 1, partes: [
    padAcordes(0.32, { brillo: 1100 }),
    ({ t, paso, ac }) => { if (t > L(1) + 3 && paso % 2 === 0) pulso(t, ac[(paso / 2) % ac.length] + 24, 0.12, 0.05, { tipo: 'triangle', brillo: 2500, pan: 0.3 }); },
    ({ t, paso, ac, p16 }) => { if (t > L(4) && paso % 4 === 0) bajo(t, ac[0] - 12, p16 * 3.5, 0.25); },
  ] });
  tema(L(1) - 0.1, 96, TEMA, 0.2);
  subida(c2 - 1.6, c2, 0.18);

  // 2 · el vuelo a la planta: el arpegio que empuja (Dm Bb F C), y al pararse a mirar baja; se acerca, se ve dentro (asombro), entra
  const mira = L(5), acerca = guion.lineas[4].t1;
  seccion({ desde: c2, hasta: electron - 0.6, bpm: 112, acordes: ['Dm', 'Bb', 'F', 'C'], partes: [
    padAcordes(0.22, { brillo: 1300 }),
    arpegio(0.07, { dibujo: [0, 1, 2, 3, 2, 1, 0, 2], brillo: 2600 }),
    ({ t, ...r }) => { if (t < mira - 0.2 || t > acerca) bajoOutrun(0.32)({ t, ...r }); },
    ({ t, ...r }) => { if (t > acerca + 4) bateria({ s: [4, 12], h: [2, 6, 10, 14], vk: 0.55, vs: 0.35, vh: 0.1 })({ t, ...r }); },
  ] });
  [0, 1].forEach((k) => temaLead(acerca + 4.3 + k * 8 * 60 / 112, 112));              // el vuelo hacia la máquina
  [0, 0.4, 0.8].forEach((d, k) => campana(acerca + 3.2 + d, [81, 86, 88][k], 0.08, { dur: 2.5 }));   // la radiografía de la máquina
  subida(electron - 2.4, electron - 0.05, 0.25); impacto(electron, 0.6);

  // la antena: se para y explica el campo. Un latido a 0,7 Hz, el del campo (84 pulsos/min: dos por oscilación), sobre re
  const corre = guion.lineas[7].t1;                                            // acaba de explicar y corre por el brazo
  seccion({ desde: electron, hasta: corre, bpm: 84, acordes: ['Dm', 'Gm', 'Dm', 'A'], compases: 1, partes: [
    padAcordes(0.26, { brillo: 800 }),
    ({ t, paso }) => { if (paso % 4 === 0) pulso(t, paso % 8 ? 45 : 57, 0.5, 0.12, { tipo: 'sine', brillo: 600, ec: 0 }); },
  ] });
  seccion({ desde: corre, hasta: c3, bpm: 120, acordes: ['Dm', 'C', 'Bb', 'A'], partes: [
    arpegio(0.06, { dibujo: [0, 2, 3, 2], brillo: 2200 }), bajoOutrun(0.28),
    ({ t, ...r }) => { if (t < L(9) - 0.3 || t > L(9) + 2.6) bateria({ s: [12], vk: 0.5, vh: 0.08 })({ t, ...r }); },
  ] });
  subida(c3 - 1.8, c3, 0.25); impacto(c3, 0.5, { brillo: 0.8 });

  // 3 · dentro del chip: circuitos. Arpegio de cuadrada en semicorcheas, bajo, pitidos; más brillo al llegar a lo digital
  seccion({ desde: c3, hasta: c4, bpm: 120, acordes: ['Dm', 'C', 'Bb', 'C'], partes: [
    padAcordes(0.15, { brillo: 1000 }),
    arpegio(0.055, { tipo: 'square', dibujo: [0, 1, 2, 3, 1, 2, 3, 1], brillo: 3500, pan: 0.2 }),
    bajoOutrun(0.3),
    ({ t, paso }) => { if (t > L(13) && t < L(15) && paso % 3 === 0 && azar() < 0.5) pulso(t, 84 + Math.floor(azar() * 8), 0.05, 0.04, { tipo: 'square', brillo: 6000, pan: azar() - 0.5, ec: 0.4 }); },
    ({ t, ...r }) => { if (t > L(10) + 2) bateria({ s: [], h: [2, 6, 10, 14], vk: 0.55, vh: 0.09 })({ t, ...r }); },
  ] });
  [0, 0.25, 0.5].forEach((d, k) => campana(L(14) + d, [86, 88, 93][k], 0.07));       // la memoria
  subida(c4 - 1.4, c4, 0.22); impacto(c4, 0.45, { brillo: 0.6 });

  // 4 · el sensor: tensión. Un dron grave y un pad que se calienta (sube de tono y se abre); el ADC, en tic-tac digital
  const calor = L(17), adc = L(19);
  pad(c4, adc, [38, 45], 0.35, { brillo: 400, at: 0.8 });
  pad(calor - 1, adc + 0.4, [62, 65, 69], 0.2, { brillo: 600, at: 1.5, abre: [calor, adc, 3200] });
  for (let t = calor; t < adc; t += 0.125) pulso(t, 69 + Math.floor((t - calor) / (adc - calor) * 12), 0.06, 0.035, { tipo: 'triangle', brillo: 2000, pan: Math.sin(t * 9) * 0.6, ec: 0 });
  seccion({ desde: adc, hasta: c5, bpm: 120, acordes: ['Dm', 'A'], partes: [
    ({ t, paso }) => { if (paso % 2 === 0) pulso(t, 86, 0.03, 0.05, { tipo: 'square', brillo: 7000, pan: paso % 4 ? 0.4 : -0.4, ec: 0 }); },
    bajoNegras(0.3), padAcordes(0.15),
  ] });
  subida(c5 - 1.2, c5, 0.2); impacto(c5, 0.4, { brillo: 0.5 });

  // 5 · la vuelta: con la temperatura, el tema en el bajo; en el tag, el backscatter (golpes a contratiempo, que se
  // encienden y se apagan como la modulación); fotón otra vez y el vuelo, a lo grande
  seccion({ desde: c5, hasta: vuelveTag, bpm: 110, acordes: ['Dm', 'Bb', 'Gm', 'A'], partes: [
    padAcordes(0.2), bajoOutrun(0.3), arpegio(0.05, { dibujo: [0, 2, 1, 3], cada: 2, brillo: 2000 }),
    bateria({ s: [12], vk: 0.5, vs: 0.3, vh: 0.08 }),
  ] });
  impacto(vuelveTag, 0.45, { brillo: 0.7 });
  seccion({ desde: vuelveTag, hasta: fotonOtra, bpm: 104, acordes: ['Dm', 'Dm', 'Bb', 'A'], partes: [
    padAcordes(0.22, { brillo: 700 }),
    ({ t, paso, ac }) => { if (t > L(21) - 0.5 && [2, 3, 6, 10, 11, 14].includes(paso)) pulso(t, ac[1] + 12, 0.1, 0.07, { tipo: 'square', brillo: 1800, pan: paso % 4 > 1 ? 0.35 : -0.35, ec: 0.2 }); },
    bajoNegras(0.25),
  ] });
  temaLead(guion.lineas[22].t1 + 1, 104, TEMA, 0.08);                                 // fotón otra vez, y sale hacia el lector
  const llega6 = c6;
  subida(fotonOtra - 0.4, fotonOtra + 1.6, 0.22);
  seccion({ desde: fotonOtra + 1.6, hasta: llega6, bpm: 124, acordes: ['Dm', 'Bb', 'F', 'C'], partes: [
    ({ t, enAcorde, ac, p16, porAcorde }) => { if (enAcorde === 0) metal(t, ac, porAcorde * p16 * 0.95, 0.12); },
    arpegio(0.06, { dibujo: [0, 1, 2, 3, 2, 1, 0, 3], brillo: 3500 }), bajoOutrun(0.34),
    bateria({ s: [4, 12], h: [2, 6, 10, 14], vk: 0.85, vs: 0.45, vh: 0.14 }),
  ] });

  // 6 · el lector y 7 · el PLC: la planta. Un ritmo industrial (bombo, caja, metales que suenan), y al detectarlo, un acorde
  impacto(enLector, 0.55);
  seccion({ desde: llega6, hasta: enLector, bpm: 124, acordes: ['Dm', 'Bb'], partes: [
    arpegio(0.05, { dibujo: [0, 1, 2, 3], brillo: 3000 }), bajoOutrun(0.3), bateria({ s: [12], vk: 0.7, vh: 0.12 }),
  ] });
  seccion({ desde: enLector + 0.4, hasta: c7, bpm: 116, acordes: ['Dm', 'Dm', 'Bb', 'C'], partes: [
    padAcordes(0.18), bajoOutrun(0.28),
    ({ t, ...r }) => { if (t < L(24) - 0.2 || t > L(26) + 2) bateria({ s: [4, 12], vk: 0.65, vs: 0.3, vh: 0.11 })({ t, ...r }); },
    ({ t, paso }) => { if (paso === 7 || paso === 15) ruidoCorto(t, 0.12, 'bandpass', 3800, 0.08, { pan: 0.5, q: 6 }); },   // metal
  ] });
  [0, 0.15, 0.3].forEach((d, k) => campana(L(26) + 0.9 + d, [74, 78, 81][k], 0.1));          // ¡detectado!
  seccion({ desde: c7, hasta: c8, bpm: 116, acordes: ['Gm', 'Dm', 'A', 'Dm'], partes: [
    padAcordes(0.16), bajoOutrun(0.3), bateria({ s: [4, 12], vk: 0.65, vs: 0.3, vh: 0.11 }),
    ({ t, paso }) => { if (t > c7 + 1 && t < L(28) && paso % 8 === 4) [0, 1, 2].forEach((k) => pulso(t + k * 0.09, [79, 83, 86][k], 0.08, 0.05, { tipo: 'square', brillo: 5000, pan: k - 1, ec: 0.3 })); },
  ] });

  // 8 · el edge: sube la tensión hasta que estalla y se hace dato; el tema, como pregunta; y sale disparado al mundo digital
  seccion({ desde: c8, hasta: estalla - 0.3, bpm: 116, acordes: ['Dm', 'Bb'], partes: [
    arpegio(0.06, { dibujo: [0, 1, 2, 3], brillo: 3500 }), bajoOutrun(0.3),
  ] });
  subida(estalla - 2.4, estalla, 0.32); impacto(estalla, 0.7, { brillo: 1.2 });
  pad(estalla + 0.3, c9 - 0.4, [62, 69, 76], 0.18, { brillo: 1600, at: 1 });
  tema(L(30) + 0.1, 100, PREGUNTA, 0.2);
  silbido(c9 - 1.0, c9, 0.3); impacto(c9, 0.6, { brillo: 1 });

  // 9 · el MES y el ERP: lo digital, brillante (re mayor), con filtro que se cierra en el filtrado; la alerta, un golpe
  // de metales en menor; y al ERP, con fuerza
  const filtra = L(34);
  seccion({ desde: c9, hasta: alerta - 0.15, bpm: 124, acordes: ['D', 'A', 'Bm', 'G'], partes: [
    padAcordes(0.16, { brillo: 1600 }),
    ({ t, ...r }) => arpegio(0.055, { dibujo: [0, 1, 2, 3, 1, 2, 3, 2], brillo: t > filtra && t < alerta ? 900 : 4000, pan: 0.15 })({ t, ...r }),
    bajoOutrun(0.28), bateria({ s: [4, 12], vk: 0.6, vs: 0.28, vh: 0.12 }),
  ] });
  metal(alerta, [50, 53, 56, 62], 1.6, 0.25); impacto(alerta, 0.6, { brillo: 0.4 });
  seccion({ desde: alerta + 1.2, hasta: c10, bpm: 124, acordes: ['Bb', 'F', 'C', 'Dm'], partes: [
    ({ t, enAcorde, ac, p16, porAcorde }) => { if (enAcorde === 0) metal(t, ac, porAcorde * p16 * 0.95, 0.1); },
    arpegio(0.05, { brillo: 3500 }), bajoOutrun(0.3),
    ({ t, ...r }) => { if (t > L(36)) bateria({ s: [4, 12], vk: 0.7, vs: 0.38, vh: 0.13 })({ t, ...r }); },
  ] });
  temaLead(guion.lineas[35].t1 + 0.3, 124, TEMA, 0.09, 0);                             // al ERP, a lo grande
  for (let k = 0; k < 4; k++) tom(c10 - 0.6 + k * 0.12, 50 - k * 3, 0.4);
  impacto(c10, 0.45, { brillo: 0.6 });

  // 10 · la pantalla y 11 · la visera: el final, cálido y más lento; el tema entero, y se queda en el pad del logo
  seccion({ desde: c10, hasta: c11, bpm: 92, acordes: ['Bb', 'F', 'C', 'Dm'], partes: [
    padAcordes(0.3, { brillo: 1200 }), bajoNegras(0.22),
    ({ t, paso, ac }) => { if (paso % 2 === 0) pulso(t, ac[(paso / 2) % ac.length] + 24, 0.14, 0.04, { tipo: 'triangle', brillo: 2400, pan: 0.3 }); },
  ] });
  tema(L(38) + 1.2, 92, TEMA, 0.22);
  pad(c11 - 0.5, c11 + 2.5, [46, 53, 57, 62], 0.25, { brillo: 900, at: 1 });
  tema(L(39) + 0.2, 80, TEMA, 0.16, -12);
  padLogo(c11 + 1.5, FIN);
  [[c11 + 3.2, 86], [FIN - 1.4, 81]].forEach(([t, n]) => campana(t, n, 0.06, { dur: 3 }));

  // el render, por tramos: si todas las notas estuvieran en el grafo desde el principio, el navegador las procesaría
  // todas en cada instante (aunque aún no suenen) y tardaría más que el propio corto. Se para cada PASO segundos y mete
  // solo las del tramo siguiente; las que ya sonaron se van solas
  cola.sort((x, y) => x[0] - y[0]);
  // el bombeo: con cada bombo, lo que bombea se agacha casi al instante y vuelve a subir en una décima
  latidos.sort((x, y) => x - y).forEach((T) => { bombeo.gain.setTargetAtTime(0.4, T, 0.005); bombeo.gain.setTargetAtTime(1, T + 0.03, 0.08); });
  let k = 0;
  const PASO = 1;
  const meter = (hasta) => { while (k < cola.length && cola[k][0] < hasta) cola[k++][1](); };
  meter(PASO + 0.25);
  for (let T = PASO; T < total - 0.05; T += PASO) { const h = T; oc.suspend(h).then(() => { meter(h + PASO + 0.25); oc.resume(); }); }
  const montada = performance.now();
  const buf = await oc.startRendering();
  console.info(`música: montada en ${((montada - empieza) / 1000).toFixed(1)} s, renderizada en ${((performance.now() - montada) / 1000).toFixed(1)} s`);
  // sin chasquido en el bucle: unos milisegundos de fundido en las dos puntas
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c), n = Math.floor(sr * 0.015);
    for (let i = 0; i < n; i++) { const k = i / n; d[i] *= k; d[d.length - 1 - i] *= k; }
  }
  return buf;
}

// la reverb: ruido estéreo que se apaga (con poca caída, casi plano hasta el final: la de puerta)
function respuesta(oc, seg, caida = 2.6) {
  const n = Math.floor(oc.sampleRate * seg), b = oc.createBuffer(2, n, oc.sampleRate), r = rng(11);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, caida); }
  return b;
}
