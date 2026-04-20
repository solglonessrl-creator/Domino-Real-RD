/**
 * Domino Real RD - Sistema de Ranking ELO
 * Ligas: Bronce → Plata → Oro → Diamante
 */

const express = require('express');
const router = express.Router();

// Sistema de ligas
const LIGAS = [
  { nombre: 'Bronce',   minELO: 0,    maxELO: 999,  color: '#CD7F32', icono: '🥉' },
  { nombre: 'Plata',    minELO: 1000, maxELO: 1499, color: '#C0C0C0', icono: '🥈' },
  { nombre: 'Oro',      minELO: 1500, maxELO: 1999, color: '#FFD700', icono: '🥇' },
  { nombre: 'Diamante', minELO: 2000, maxELO: Infinity, color: '#B9F2FF', icono: '💎' }
];

const ELO_BASE = 1200;
const K_FACTOR = 32;

/**
 * Calcular nuevo ELO después de una partida
 */
function calcularELO(eloJugador, eloRival, resultado) {
  const expected = 1 / (1 + Math.pow(10, (eloRival - eloJugador) / 400));
  const nuevo = eloJugador + K_FACTOR * (resultado - expected);
  return Math.max(0, Math.round(nuevo));
}

/**
 * Obtener liga según ELO
 */
function obtenerLiga(elo) {
  return LIGAS.find(l => elo >= l.minELO && elo <= l.maxELO) || LIGAS[0];
}

// GET /ranking/global - Top 100 jugadores
router.get('/global', async (req, res) => {
  try {
    // TODO: conectar con DB real (PostgreSQL/Firebase)
    const rankingMock = Array.from({ length: 20 }, (_, i) => ({
      posicion: i + 1,
      nombre: `Jugador_${i + 1}`,
      pais: ['RD', 'US', 'ES', 'PR', 'IT'][Math.floor(Math.random() * 5)],
      elo: 2500 - (i * 80),
      liga: obtenerLiga(2500 - i * 80),
      ganadas: 120 - i * 3,
      perdidas: 40 + i * 2,
      winRate: Math.round(((120 - i * 3) / (160 - i)) * 100),
      capicuas: Math.floor(Math.random() * 30),
      racha: Math.max(0, 10 - i)
    }));

    res.json({
      exito: true,
      ranking: rankingMock,
      actualizadoEn: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /ranking/jugador/:id - Perfil y stats del jugador
router.get('/jugador/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const perfil = {
      id,
      nombre: 'Santo Montilla',
      pais: 'RD',
      elo: 1650,
      liga: obtenerLiga(1650),
      stats: {
        partidasJugadas: 234,
        ganadas: 145,
        perdidas: 89,
        winRate: 62,
        capicuas: 23,
        capicuasRecibidas: 15,
        promedioPuntosPorRonda: 87,
        mejorRacha: 12,
        rachaActual: 3,
        tranquesGanados: 18,
        fichasMasJugada: '6-6'
      },
      historialPartidas: [], // últimas 10 partidas
      logros: [
        { id: 'primera_capicua', nombre: '¡Primera Capicúa!', obtenido: true },
        { id: '10_wins', nombre: '10 Victorias', obtenido: true },
        { id: 'sin_perder', nombre: 'Racha de 5', obtenido: true },
        { id: 'capicua_maestro', nombre: 'Maestro de Capicúas', obtenido: false }
      ]
    };

    res.json({ exito: true, perfil });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /ranking/actualizar - Actualizar ELO tras partida
router.post('/actualizar', async (req, res) => {
  try {
    const { equipoGanador, jugadores } = req.body;

    const actualizaciones = jugadores.map(jugador => {
      const esGanador = jugador.equipo === equipoGanador;
      const eloRival = jugadores
        .filter(j => j.equipo !== jugador.equipo)
        .reduce((sum, j) => sum + (j.elo || ELO_BASE), 0) / 2;

      const nuevoELO = calcularELO(jugador.elo || ELO_BASE, eloRival, esGanador ? 1 : 0);
      const delta = nuevoELO - (jugador.elo || ELO_BASE);

      return {
        jugadorId: jugador.id,
        eloAnterior: jugador.elo || ELO_BASE,
        nuevoELO,
        delta,
        ligaAnterior: obtenerLiga(jugador.elo || ELO_BASE),
        nuevaLiga: obtenerLiga(nuevoELO),
        subioLiga: obtenerLiga(nuevoELO).nombre !== obtenerLiga(jugador.elo || ELO_BASE).nombre && nuevoELO > (jugador.elo || ELO_BASE)
      };
    });

    res.json({ exito: true, actualizaciones });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /ranking/ligas - Info de todas las ligas
router.get('/ligas', (req, res) => {
  res.json({ exito: true, ligas: LIGAS });
});

module.exports = router;
