// El idioma del corto: es, en, eu o zh. Sale de ?lang= en la dirección o, si no, del último que se eligió o del navegador; cambiarlo
// recarga la página en el mismo segundo, y sigue si se estaba reproduciendo (los rótulos se pintan en canvas al montar
// cada plano).
import TEXTOS from './textos.js';

export const IDIOMAS = [['es', 'ES'], ['en', 'EN'], ['eu', 'EU'], ['zh', '中文']];
const guardado = (() => { try { return localStorage.getItem('corto.lang'); } catch { return null; } })();
// (si no, el del navegador: es, eu o zh; cualquier otro, inglés)
const delNavegador = (navigator.languages || [navigator.language || 'es']).map((l) => l.slice(0, 2).toLowerCase()).find((l) => ['es', 'eu', 'zh', 'en'].includes(l)) || 'en';
const pedido = new URLSearchParams(location.search).get('lang') || guardado || delNavegador;
export const LANG = IDIOMAS.some(([c]) => c === pedido) ? pedido : 'es';

// el texto en el idioma: la clave es el texto en español; si falta la traducción, se queda en español
export const L = (es) => (LANG === 'es' ? es : TEXTOS[es]?.[LANG] ?? es);
// los números con decimales: coma en español y euskera, punto en inglés y chino
export const num = (x, d = 1) => (LANG === 'es' || LANG === 'eu' ? x.toFixed(d).replace('.', ',') : x.toFixed(d));
// letras por segundo del bocadillo (en chino cada carácter es una palabra)
export const LETRAS_SEG = LANG === 'zh' ? 11 : 28;

export function cambiarIdioma(c, t = null, sigue = false) {
  try { localStorage.setItem('corto.lang', c); } catch { /* sin almacenamiento: solo por la dirección */ }
  const u = new URL(location.href); u.searchParams.set('lang', c); u.hash = t === null ? '' : `t=${t.toFixed(2)}${sigue ? '&sigue' : ''}`;
  location.href = u.toString();
}
