// El sonido: la voz de Blinky y la música, en sincronía con la imagen; en silencio, la misma narración en subtítulos.
// La música (musica.js) se compone al vuelo para este corto, cuadrada con sus cortes y destellos (audio/guion.json, que
// saca window.corto.guion()); la voz son clips por frase de la narración (corto/narracion.json; audio/voz/<idioma>/ y,
// con lo que dice cada uno para los subtítulos, <idioma>.json, de corto/herramientas/voces.py).
//
// La narración no cabe en el tiempo de la imagen: donde un clip no llega antes del siguiente, la imagen va más despacio
// (mapa(): pasa de segundos de la película a segundos del audio y al revés), sobre todo donde Blinky está parado, así
// que el corto dura más que sus planos, distinto en cada idioma (con sonido o en silencio, igual). Las frases van en
// cola, una tras otra, y cada una empieza como mucho DESFASE segundos después que su sitio en la película.
//
// Mientras suena, el reloj del corto es el del audio: si la página va a tirones, la imagen se pone al día y el sonido no
// se corta. Al saltar (la barra, las flechas, los botones de plano) se vuelve a arrancar en el segundo nuevo.
import { LANG, L } from './idioma.js';
import { componer } from './musica.js';

const CON_VOZ = ['es', 'en', 'zh', 'eu'];                 // los idiomas con narración (voz y subtítulos)
const MUSICA = 0.75, BAJA = 0.4;                    // el volumen de la música, y cuánto baja mientras habla Blinky
const DESFASE = 0.8, AIRE = 0.18;                   // cuánto puede ir la voz tras su sitio; silencio entre frases

// el tiempo del modo sonido: S pasa de segundos de la película a segundos del audio, T al revés. Donde una frase no
// llega antes de la siguiente, la imagen va más despacio desde la frase anterior (o TRAMO segundos antes, como poco), y
// sobre todo donde casi no se mueve (los tramos quietos de cada plano, audio/guion.json): fuera de ellos frena MOVIDO
// veces menos. La velocidad va suavizada (SUAVE segundos), para que no cambie el ritmo de golpe; como al suavizarla
// parte del freno se va fuera de su tramo, se repasa todo unas veces hasta que cada frase llega a su sitio. Con la
// duración de cada clip que apunta audio/voz/<idioma>.json (la misma con la que se grabó la música)
const REJILLA = 0.05, TRAMO = 4, SUAVE = 2.4, MOVIDO = 0.2, PASES = 4;
export function mapa(clips, total, quietos = []) {
  const n = Math.ceil(total / REJILLA), r = Math.round(SUAVE / REJILLA / 2);
  const peso = Array.from({ length: n }, (_, i) => { const x = (i + 0.5) * REJILLA; return quietos.some(([a, b]) => x >= a && x < b) ? 1 : MOVIDO; });
  const freno = new Array(n).fill(1);                  // segundos de audio por segundo de película, en la rejilla, sin suavizar
  let vel, tabla;
  const suavizar = () => {                             // (con dos medias móviles)
    vel = freno.slice();
    for (let k = 0; k < 2; k++) {
      const acum = [0]; vel.forEach((v) => acum.push(acum[acum.length - 1] + v));
      vel = vel.map((_, i) => { const a = Math.max(0, i - r), b = Math.min(n, i + r + 1); return (acum[b] - acum[a]) / (b - a); });
    }
    tabla = [0]; vel.forEach((v) => tabla.push(tabla[tabla.length - 1] + v * REJILLA));
  };
  const S = (t) => { const x = Math.max(0, t / REJILLA), i = Math.floor(x);
    return i >= n ? tabla[n] + (t - n * REJILLA) : tabla[i] + (x - i) * (tabla[i + 1] - tabla[i]); };
  const T = (s) => {
    if (s >= tabla[n]) return n * REJILLA + (s - tabla[n]);
    let a = 0, b = n; while (b - a > 1) { const m = (a + b) >> 1; if (tabla[m] <= s) a = m; else b = m; }
    return (a + (s - tabla[a]) / (tabla[a + 1] - tabla[a])) * REJILLA;
  };
  // frena la imagen entre desde y hasta lo justo para que haya extra segundos más de audio
  const frenar = (desde, hasta, extra) => {
    const a = Math.max(0, Math.floor(desde / REJILLA)), b = Math.min(n, Math.ceil(hasta / REJILLA));
    let w = 0; for (let i = a; i < b; i++) w += peso[i];
    for (let i = a; i < b; i++) freno[i] += extra * peso[i] / (w * REJILLA);
  };
  // cuándo suena cada frase: en cola, como mucho DESFASE después que su sitio en la película
  const encolar = () => { let fin = 0; for (const c of clips) { c.s = Math.max(S(c.t), fin + AIRE); fin = c.s + c.d; } return fin; };
  const todas = [...clips, { t: total, d: 0, ultimo: true }];      // (y que la última acabe antes de volver a empezar)
  for (let pase = 0; pase < PASES; pase++) {
    todas.forEach((c, k) => {
      suavizar();
      let fin = 0; for (let j = 0; j < k; j++) fin = Math.max(S(todas[j].t), fin + AIRE) + todas[j].d;
      const tarde = fin + AIRE - S(c.t) - (c.ultimo ? -AIRE : DESFASE);
      if (tarde > 0.01) frenar(Math.min(k ? todas[k - 1].t : 0, c.t - TRAMO), c.t, tarde);
    });
  }
  suavizar(); encolar();
  const lento = (de) => Math.max(...vel.filter((_, i) => peso[i] === de));
  return { S, T, lento: lento(MOVIDO), lentoQuieto: lento(1) };
}

export function crearSonido({ total, aviso }) {
  let mudo = (() => { try { return localStorage.getItem('corto.mudo') === '1'; } catch { return false; } })();
  let ac = null, gMusica = null, gVoz = null, voz = [], tiempo = null, guion = null, preparando = null, ancla = null, fuentes = [];
  // la música: la grabada de este idioma, en un <audio> que se va descargando y sonando (decodificada entera, cinco minutos
  // de estéreo son más de 100 MB, demasiado para un móvil); si no está, la compuesta aquí, en un búfer
  let musica = null;                                                  // { el } o { buf }; dura: sus segundos
  const avisar = (txt) => { aviso.textContent = txt || ''; aviso.style.display = txt ? 'block' : 'none'; };

  // lo que hace falta siempre: el guion y la narración (cuándo empieza cada frase, cuánto dura y qué dice), para el tiempo
  // y los subtítulos; el audio, solo si se va a oír
  const cargando = (async () => {
    try {
      guion = await fetch('audio/guion.json').then((r) => r.json());
      if (Math.abs(guion.total - total) > 0.05) console.warn(`audio/guion.json es de un corto de ${guion.total} s y este dura ${total.toFixed(2)}: hay que rehacerlo`);
      voz = CON_VOZ.includes(LANG) ? await fetch(`audio/voz/${LANG}.json`).then((r) => (r.ok ? r.json() : [])) : [];
    } catch (e) { console.warn('sin narración:', e); voz = []; }
    tiempo = mapa(voz, total, guion?.quietos || []);
    voz.forEach((c) => { c.trozos = trozos(c); });
  })();

  // el contexto de audio, en el mismo gesto que lo pide (si no, el navegador lo deja mudo hasta el siguiente toque)
  function contexto() {
    if (ac) return;
    ac = new AudioContext();
    gMusica = ac.createGain(); gMusica.gain.value = MUSICA; gMusica.connect(ac.destination);
    gVoz = ac.createGain(); gVoz.connect(ac.destination);
  }
  async function preparar() {
    contexto();
    await cargando;
    if (!mudo) avisar(L('Preparando el sonido…'));
    const t0 = performance.now();
    await Promise.all(voz.map(async (c) => { c.buf = await ac.decodeAudioData(await fetch(`audio/voz/${LANG}/${c.f}`).then((r) => r.arrayBuffer())); }));
    musica = await new Promise((listo) => {
      const el = new Audio(); el.preload = 'auto';
      el.addEventListener('loadedmetadata', () => { ac.createMediaElementSource(el).connect(gMusica); listo({ el, dura: el.duration }); }, { once: true });
      el.addEventListener('error', () => listo(null), { once: true });
      el.src = `audio/musica/${LANG}.mp3`;
    });
    if (!musica) { const buf = await componer(guion, ac.sampleRate, tiempo.S); musica = { buf, dura: buf.duration }; }
    console.info(`sonido: música ${musica.el ? 'grabada' : 'compuesta'} en ${((performance.now() - t0) / 1000).toFixed(1)} s; ${voz.length} frases; dura ${tiempo.S(total).toFixed(1)} s (la imagen va como mucho ${tiempo.lento.toFixed(2)} veces más despacio; ${tiempo.lentoQuieto.toFixed(2)} donde está quieta)`);
    avisar(ac.state === 'running' || mudo ? '' : L('Toca para activar el sonido'));
  }

  // parar sin chasquido: las ganancias bajan a cero en 30 ms y entonces se cortan las fuentes
  function parar() {
    if (!ac) return;
    const ahora = ac.currentTime;
    for (const g of [gMusica, gVoz]) { g.gain.cancelScheduledValues(ahora); g.gain.setValueAtTime(g.gain.value, ahora); g.gain.linearRampToValueAtTime(0, ahora + 0.03); }
    fuentes.forEach((f) => { try { f.stop(ahora + 0.04); } catch { /* ya parada */ } });
    if (musica?.el) { const el = musica.el; setTimeout(() => { if (!ancla) el.pause(); }, 40); }
    fuentes = []; ancla = null;
  }
  // que suene desde el segundo t de la película
  function arrancar(t) {
    const ahora = ac.currentTime + 0.05, s = tiempo.S(t);
    if (musica.el) { musica.el.currentTime = Math.min(s, musica.dura - 0.01); musica.el.play().catch(() => {}); }
    else { const m = ac.createBufferSource(); m.buffer = musica.buf; m.connect(gMusica); m.start(ahora, Math.min(s, musica.dura - 0.01)); fuentes.push(m); }
    const g = gMusica.gain; g.cancelScheduledValues(0); g.setValueAtTime(0, ac.currentTime); g.linearRampToValueAtTime(MUSICA, ahora);
    gVoz.gain.cancelScheduledValues(0); gVoz.gain.setValueAtTime(1, ac.currentTime);
    for (const c of voz) {
      if (c.s + c.d <= s || !c.buf) continue;
      const f = ac.createBufferSource(); f.buffer = c.buf; f.connect(gVoz);
      const empieza = ahora + Math.max(0, c.s - s);
      if (c.s >= s) f.start(empieza); else f.start(ahora, s - c.s);
      fuentes.push(f);
      // la música baja mientras habla, y vuelve
      g.setTargetAtTime(MUSICA * BAJA, Math.max(ahora, empieza - 0.15), 0.08);
      g.setTargetAtTime(MUSICA, ahora + (c.s + c.d - s) + 0.1, 0.35);
    }
    ancla = { ctx: ahora, s };
  }
  const audioAhora = () => ancla.s + Math.max(0, ac.currentTime - ancla.ctx);
  const sonando = () => !!ancla && ac.state === 'running';

  // el primer toque de la página despierta el audio (el navegador no deja sonar sin él)
  const despertar = () => { if (ac && ac.state !== 'running') ac.resume().then(() => musica && avisar('')); };
  addEventListener('pointerdown', despertar); addEventListener('keydown', despertar);

  const api = {
    // con sonido (voz y música) o en silencio (subtítulos); sin argumento, cómo está. Llamado desde un toque, despierta
    // el audio en ese mismo gesto
    mudo(m) {
      if (m === undefined) return mudo;
      mudo = m;
      try { localStorage.setItem('corto.mudo', m ? '1' : '0'); } catch { /* sin almacenamiento */ }
      if (m) { parar(); avisar(''); } else { contexto(); despertar(); if (!preparando) preparando = preparar(); if (!musica) avisar(L('Preparando el sonido…')); }
      return mudo;
    },
    // el reloj del corto: mientras suena, el del audio; si no, el de la página, al ritmo de la narración (la imagen va
    // igual de despacio donde habla, con sonido o sin él: los subtítulos son la misma narración)
    avanzar(t, dt) {
      if (!tiempo) return t + dt;
      if (sonando()) return tiempo.T(audioAhora());
      return tiempo.T(tiempo.S(t) + dt);
    },
    // en cada cuadro: que suene lo que toca, o nada (y la música del <audio>, sin irse más de 0,3 s del reloj)
    seguir(t, corriendo) {
      if (mudo || !musica || !corriendo || ac.state !== 'running') { if (ancla) parar(); return; }
      const esperado = ancla ? tiempo.T(audioAhora()) : null;
      if (esperado === null || Math.abs(esperado - t) > 0.25 || audioAhora() >= musica.dura) { parar(); arrancar(t >= total - 0.05 ? 0 : t); return; }
      const el = musica.el;
      if (el && !el.seeking && Math.abs(el.currentTime - audioAhora()) > 0.3) el.currentTime = Math.min(audioAhora(), musica.dura - 0.01);
    },
    saltar() { if (ancla) parar(); },
    // para el vídeo (corto.grabarVideo): el tiempo y cuándo suena cada frase en este idioma, y la mezcla entera (la
    // música y la voz, con la música más baja mientras habla, como al reproducirlo)
    async exportar() { await cargando; return { T: tiempo.T, S: tiempo.S, voz: voz.map((c) => ({ s: +c.s.toFixed(3), d: c.d })) }; },
    async mezcla(sr = 48000) {
      await cargando;
      const oc = new OfflineAudioContext(2, Math.ceil((tiempo.S(total) + 0.5) * sr), sr);
      const cargar = async (url) => oc.decodeAudioData(await fetch(url).then((r) => r.arrayBuffer()));
      const gM = oc.createGain(); gM.connect(oc.destination); gM.gain.setValueAtTime(MUSICA, 0);
      const gV = oc.createGain(); gV.connect(oc.destination);
      const m = oc.createBufferSource(); m.buffer = await cargar(`audio/musica/${LANG}.mp3`); m.connect(gM); m.start(0);
      for (const c of voz) {
        const f = oc.createBufferSource(); f.buffer = await cargar(`audio/voz/${LANG}/${c.f}`); f.connect(gV); f.start(c.s);
        gM.gain.setTargetAtTime(MUSICA * BAJA, Math.max(0, c.s - 0.15), 0.08);
        gM.gain.setTargetAtTime(MUSICA, c.s + c.d + 0.1, 0.35);
      }
      return wav(await oc.startRendering());
    },
    // el subtítulo del segundo t: el trozo de la frase que se dice entonces, si no se oye (en silencio, o hasta que el
    // navegador deja sonar el audio)
    subtitulo(t) {
      if (!tiempo || sonando()) return null;
      const s = tiempo.S(t);
      const i = voz.findIndex((x, k) => s >= x.s && s < Math.min(x.s + x.d + 0.5, voz[k + 1] ? voz[k + 1].s : Infinity));
      if (i < 0) return null;
      const c = voz[i], u = (s - c.s) / c.d;
      return (c.trozos.find((x) => u < x.hasta) || c.trozos[c.trozos.length - 1]).txt;
    },
  };
  preparando = preparar();                            // (también en silencio: así, al activarlo, suena enseguida)
  return api;
}

// una frase larga, en trozos para los subtítulos: por los signos de puntuación, de como mucho LARGO caracteres (menos en
// chino, que ocupan más), cada uno con la parte de la frase que le toca según su largo (hasta: 0..1)
function trozos(c) {
  const LARGO = LANG === 'zh' ? 34 : 84, txt = c.x || '';
  const partes = txt.match(/[^,.:;!?…，。：；！？]+[,.:;!?…，。：；！？]*\s*/g) || [txt];
  const salen = [];
  for (const p of partes) {
    const ultimo = salen[salen.length - 1];
    if (ultimo && (ultimo + p).trim().length <= LARGO) salen[salen.length - 1] = ultimo + p; else salen.push(p);
  }
  let llevo = 0;
  return salen.map((x) => { llevo += x.length; return { txt: x.trim(), hasta: llevo / txt.length }; });
}

// para grabar la música de cada idioma (con corto/herramientas/recibir.py escuchando): la compone con el estiramiento de
// su voz y la manda en WAV
export async function grabarMusica(idiomas = CON_VOZ, sr = 44100) {
  const guion = await fetch('audio/guion.json').then((r) => r.json());
  for (const lang of idiomas) {
    const lista = await fetch(`audio/voz/${lang}.json`).then((r) => r.json());
    const m = mapa(lista.map((c) => ({ t: c.t, d: c.d })), guion.total, guion.quietos);
    const buf = await componer(guion, sr, m.S);
    await fetch(`http://localhost:8798/${lang}.wav`, { method: 'POST', body: wav(buf) });
    console.info(`grabada la música de ${lang}: ${buf.duration.toFixed(1)} s`);
  }
}
function wav(buf) {
  const n = buf.length, c = buf.numberOfChannels, datos = new DataView(new ArrayBuffer(44 + n * c * 2));
  const txt = (o, s) => [...s].forEach((ch, i) => datos.setUint8(o + i, ch.charCodeAt(0)));
  txt(0, 'RIFF'); datos.setUint32(4, 36 + n * c * 2, true); txt(8, 'WAVEfmt '); datos.setUint32(16, 16, true);
  datos.setUint16(20, 1, true); datos.setUint16(22, c, true); datos.setUint32(24, buf.sampleRate, true);
  datos.setUint32(28, buf.sampleRate * c * 2, true); datos.setUint16(32, c * 2, true); datos.setUint16(34, 16, true);
  txt(36, 'data'); datos.setUint32(40, n * c * 2, true);
  const canales = [...Array(c)].map((_, k) => buf.getChannelData(k));
  for (let i = 0, o = 44; i < n; i++) for (let k = 0; k < c; k++, o += 2) datos.setInt16(o, Math.max(-1, Math.min(1, canales[k][i])) * 32767, true);
  return datos.buffer;
}
