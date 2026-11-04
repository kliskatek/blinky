// Blinky presenta: Kliskatek (el viaje del electrón): lo de este episodio para el director (comun/motor/director.js):
// sus once planos, Blinky como electrón (electron.js), su sonido y su música (sonido.js, musica.js) y los textos de
// siempre (comun/motor/idioma.js). Guion y estado de cada plano: blinky/ep1-kliskatek/GUION.md.

import { dirigir } from '../../comun/motor/director.js';
import { Electron } from '../comun/electron.js';
import { cargarModelos } from '../../comun/piezas/tags.js';
import * as idioma from '../../comun/motor/idioma.js';
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

// las placas de KiCad: llegan en cuanto se cargan. Primero la del tag (piezas/senseread.js), la que se ve de cerca; luego
// las demás de la planta de la serie (los SenseBLE, el SenseNFC), que se ven de lejos
const modelos = cargarModelos(['rfid_at']).then(() => cargarModelos());
const { L } = idioma;

dirigir({
  planos: [plano01, plano02, plano03, plano04, plano05, plano06, plano07, plano08, plano09, plano10, plano11],
  Blinky: Electron, modelos, idioma, sonido: { crearSonido, grabarMusica },
  titulo: { pagina: `${L('Blinky presenta')}: Kliskatek`, cartela: `<small>${L('Blinky presenta')}:</small>Kliskatek` },
});
