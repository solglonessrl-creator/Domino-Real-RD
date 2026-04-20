/**
 * Domino Real RD — Servicio ELO Completo
 * Actualiza ELO, registra historial, verifica subida de liga, otorga logros
 */

const { Jugadores, Ranking, Estadisticas, Logros, Notificaciones } = require('../models/Database');

const K_FACTOR = 32;
const ELO_BASE = 1200;

const LIGAS = [
  { nombre: 'Bronce',   min: 0,    max: 999,       icono: '🥉', color: '#CD7F32' },
  { nombre: 'Plata',    min: 1000, max: 1499,      icono: '🥈', color: '#C0C0C0' },
  { nombre: 'Oro',      min: 1500, max: 1999,      icono: '🥇', color: '#FFD700' },
  { nombre: 'Diamante', min: 2000, max: Infinity,  icono: '💎', color: '#B9F2FF' }
];

function calcularEloEsperado(eloPropio, eloRival) {
  return 1 / (1 + Math.pow(10, (eloRival - eloPropio) / 400));
}

function calcularNuevoElo(eloActual, eloRival, resultado) {
  const esperado = calcularEloEsperado(eloActual, eloRival);
  const nuevo = eloActual + K_FACTOR * (resultado - esperado);
  return Math.max(100, Math.round(nuevo)); // mínimo 100
}

function obtenerLiga(elo) {
  return LIGAS.find(l => elo >= l.min && elo <= l.max) || LIGAS[0];
}

/**
 * Procesa el ELO de todos los jugadores al terminar un match
 * @param {Object} matchData - { matchId, jugadores: [{id, elo}], equipoGanador }
 */
async function procesarFinMatch(matchData) {
  const { matchId, jugadores, equipoGanador } = matchData;

  // Equipos: 0&2 vs 1&3
  const equipos = [
    [jugadores[0], jugadores[2]], // equipo 0
    [jugadores[1], jugadores[3]]  // equipo 1
  ];

  const eloPromEquipo0 = promedioElo(equipos[0]);
  const eloPromEquipo1 = promedioElo(equipos[1]);

  const resultados = [];

  for (let equipo = 0; equipo < 2; equipo++) {
    const esGanador = equipo === equipoGanador;
    const eloRival = equipo === 0 ? eloPromEquipo1 : eloPromEquipo0;

    for (const jugador of equipos[equipo]) {
      if (!jugador?.id) continue;

      const eloAntes = jugador.elo || ELO_BASE;
      const eloDespues = calcularNuevoElo(eloAntes, eloRival, esGanador ? 1 : 0);
      const delta = eloDespues - eloAntes;

      const ligaAntes = obtenerLiga(eloAntes);
      const ligaDespues = obtenerLiga(eloDespues);
      const subioLiga = ligaDespues.min > ligaAntes.min;
      const bajoLiga = ligaDespues.min < ligaAntes.min;

      // Actualizar en DB
      await Jugadores.actualizarELO(jugador.id, eloDespues);
      await Ranking.registrarELO(jugador.id, eloAntes, eloDespues, matchId);

      // Notificar si cambió de liga
      if (subioLiga) {
        await Notificaciones.crear(
          jugador.id,
          'subida_liga',
          `¡Subiste a ${ligaDespues.nombre}! ${ligaDespues.icono}`,
          `¡Felicidades! Con ${eloDespues} ELO ahora estás en la Liga ${ligaDespues.nombre}. ¡Sigue así!`,
          { ligaAntes: ligaAntes.nombre, ligaNueva: ligaDespues.nombre }
        );
      } else if (bajoLiga) {
        await Notificaciones.crear(
          jugador.id,
          'bajada_liga',
          `Bajaste a ${ligaDespues.nombre} ${ligaDespues.icono}`,
          `Tu ELO cayó a ${eloDespues}. ¡Vuelve a jugar y recupera tu liga!`,
          { ligaAntes: ligaAntes.nombre, ligaNueva: ligaDespues.nombre }
        );
      }

      // Verificar y otorgar logros
      const nuevosLogros = await Logros.verificarYOtorgar(jugador.id);
      for (const logro of nuevosLogros) {
        await Notificaciones.crear(
          jugador.id,
          'nuevo_logro',
          `¡Nuevo logro! ${logro.icono} ${logro.nombre}`,
          logro.descripcion,
          { logroId: logro.id }
        );
      }

      resultados.push({
        jugadorId: jugador.id,
        eloAntes,
        eloDespues,
        delta,
        ligaAntes: ligaAntes.nombre,
        ligaDespues: ligaDespues.nombre,
        subioLiga,
        bajoLiga,
        nuevosLogros
      });
    }
  }

  return resultados;
}

/**
 * Actualizar estadísticas de un jugador tras una ronda
 */
async function registrarRonda(jugadorId, datos) {
  await Estadisticas.registrarPartida(jugadorId, datos);
}

function promedioElo(jugadores) {
  const validos = jugadores.filter(j => j?.elo);
  if (!validos.length) return ELO_BASE;
  return validos.reduce((s, j) => s + j.elo, 0) / validos.length;
}

module.exports = { procesarFinMatch, registrarRonda, calcularNuevoElo, obtenerLiga, LIGAS };
