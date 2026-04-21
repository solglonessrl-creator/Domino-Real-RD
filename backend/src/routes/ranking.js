/**
 * Domino Real RD - Sistema de Ranking ELO con DB real
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { db } = require('../models/Database');

const LIGAS = [
  { nombre: 'Bronce',   minELO: 0,    maxELO: 999,      color: '#CD7F32', icono: '🥉' },
  { nombre: 'Plata',    minELO: 1000, maxELO: 1499,     color: '#C0C0C0', icono: '🥈' },
  { nombre: 'Oro',      minELO: 1500, maxELO: 1999,     color: '#FFD700', icono: '🥇' },
  { nombre: 'Diamante', minELO: 2000, maxELO: Infinity,  color: '#B9F2FF', icono: '💎' }
];

const K_FACTOR = 32;

function obtenerLiga(elo) {
  return LIGAS.find(l => elo >= l.minELO && elo <= l.maxELO) || LIGAS[0];
}

function calcularELO(eloJugador, eloRival, resultado) {
  const expected = 1 / (1 + Math.pow(10, (eloRival - eloJugador) / 400));
  return Math.max(0, Math.round(eloJugador + K_FACTOR * (resultado - expected)));
}

// GET /ranking/global - Top 100 jugadores reales
router.get('/global', async (req, res) => {
  try {
    const { pais, liga, limite = 100 } = req.query;

    let query = `
      SELECT
        j.id, j.nombre, j.pais, j.elo, j.liga, j.avatar, j.es_vip,
        COALESCE(e.partidas_ganadas, 0) as ganadas,
        COALESCE(e.partidas_jugadas, 0) as jugadas,
        COALESCE(e.mejor_racha, 0) as racha,
        COALESCE(e.capicuas_hechas, 0) as capicuas,
        CASE WHEN COALESCE(e.partidas_jugadas,0) > 0
          THEN ROUND(COALESCE(e.partidas_ganadas,0)::numeric / e.partidas_jugadas * 100)
          ELSE 0 END as win_rate,
        ROW_NUMBER() OVER (ORDER BY j.elo DESC) as posicion
      FROM jugadores j
      LEFT JOIN estadisticas e ON e.jugador_id = j.id
      WHERE j.activo = TRUE
    `;

    const params = [];
    if (pais) { params.push(pais); query += ` AND j.pais = $${params.length}`; }
    if (liga) { params.push(liga); query += ` AND j.liga = $${params.length}`; }

    query += ` ORDER BY j.elo DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(parseInt(limite) || 100, 100));

    const result = await db.query(query, params);

    res.json({
      exito: true,
      ranking: result.rows,
      total: result.rows.length,
      actualizadoEn: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Ranking] Error global:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /ranking/jugador/:id - Perfil completo con stats reales
router.get('/jugador/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const jugResult = await db.query(`
      SELECT j.*, e.*,
        (SELECT COUNT(*)+1 FROM jugadores WHERE elo > j.elo AND activo = TRUE) as posicion_global
      FROM jugadores j
      LEFT JOIN estadisticas e ON e.jugador_id = j.id
      WHERE j.id = $1 AND j.activo = TRUE
    `, [id]);

    if (!jugResult.rows[0])
      return res.status(404).json({ exito: false, error: 'Jugador no encontrado' });

    const j = jugResult.rows[0];

    // Historial últimas 10 partidas
    const histResult = await db.query(`
      SELECT m.id, m.modo, m.equipo_ganador, m.puntos_equipo0, m.puntos_equipo1,
             m.hubo_capicua, m.total_rondas, m.terminado_en, m.duracion_min,
             CASE WHEN m.equipo0_j0 = $1 OR m.equipo0_j2 = $1 THEN 0 ELSE 1 END as mi_equipo
      FROM matches m
      WHERE (m.equipo0_j0=$1 OR m.equipo0_j2=$1 OR m.equipo1_j1=$1 OR m.equipo1_j3=$1)
        AND m.estado = 'terminado'
      ORDER BY m.terminado_en DESC
      LIMIT 10
    `, [id]);

    // Logros
    const logrosResult = await db.query(`
      SELECT ld.*, lj.obtenido_en
      FROM logros_definicion ld
      LEFT JOIN logros_jugador lj ON lj.logro_id = ld.id AND lj.jugador_id = $1
      ORDER BY lj.obtenido_en DESC NULLS LAST
    `, [id]);

    res.json({
      exito: true,
      perfil: {
        id: j.id,
        nombre: j.nombre,
        pais: j.pais,
        elo: j.elo,
        liga: obtenerLiga(j.elo),
        avatar: j.avatar,
        es_vip: j.es_vip,
        posicion_global: parseInt(j.posicion_global),
        stats: {
          partidas_jugadas:  j.partidas_jugadas || 0,
          partidas_ganadas:  j.partidas_ganadas || 0,
          partidas_perdidas: j.partidas_perdidas || 0,
          win_rate: j.partidas_jugadas > 0
            ? Math.round((j.partidas_ganadas / j.partidas_jugadas) * 100) : 0,
          capicuas_hechas:   j.capicuas_hechas || 0,
          tranques_ganados:  j.tranques_ganados || 0,
          mejor_racha:       j.mejor_racha || 0,
          racha_actual:      j.racha_actual || 0,
          tiempo_jugado_min: j.tiempo_jugado_min || 0
        },
        historial: histResult.rows.map(m => ({
          ...m,
          gano: m.mi_equipo === m.equipo_ganador,
          mis_puntos: m.mi_equipo === 0 ? m.puntos_equipo0 : m.puntos_equipo1,
          puntos_rival: m.mi_equipo === 0 ? m.puntos_equipo1 : m.puntos_equipo0
        })),
        logros: logrosResult.rows.map(l => ({
          ...l,
          obtenido: !!l.obtenido_en
        }))
      }
    });
  } catch (err) {
    console.error('[Ranking] Error perfil:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /ranking/actualizar - Actualizar ELO real tras partida (llamado por GameSocket)
router.post('/actualizar', async (req, res) => {
  try {
    const { equipoGanador, jugadores } = req.body;

    const actualizaciones = await Promise.all(jugadores.map(async (jugador) => {
      if (jugador.esInvitado || !jugador.id || jugador.id.startsWith('bot_')) return null;

      const esGanador = jugador.equipo === equipoGanador;
      const rivales = jugadores.filter(j => j.equipo !== jugador.equipo);
      const eloRivalPromedio = rivales.reduce((s, j) => s + (j.elo || 1200), 0) / Math.max(rivales.length, 1);

      const nuevoELO = calcularELO(jugador.elo || 1200, eloRivalPromedio, esGanador ? 1 : 0);
      const delta = nuevoELO - (jugador.elo || 1200);
      const ligaAntes = obtenerLiga(jugador.elo || 1200);
      const ligaNueva = obtenerLiga(nuevoELO);

      // Guardar en DB
      await db.query('UPDATE jugadores SET elo=$1, liga=$2 WHERE id=$3', [nuevoELO, ligaNueva.nombre, jugador.id]);
      await db.query(
        'INSERT INTO historial_elo (jugador_id, elo_antes, elo_despues, delta) VALUES ($1,$2,$3,$4)',
        [jugador.id, jugador.elo || 1200, nuevoELO, delta]
      );

      return {
        jugadorId: jugador.id,
        eloAnterior: jugador.elo || 1200,
        nuevoELO,
        delta,
        ligaAnterior: ligaAntes.nombre,
        nuevaLiga: ligaNueva.nombre,
        subioLiga: ligaNueva.nombre !== ligaAntes.nombre && nuevoELO > (jugador.elo || 1200)
      };
    }));

    res.json({ exito: true, actualizaciones: actualizaciones.filter(Boolean) });
  } catch (err) {
    console.error('[Ranking] Error actualizar ELO:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /ranking/ligas
router.get('/ligas', (req, res) => res.json({ exito: true, ligas: LIGAS }));

// GET /ranking/mi-posicion - Posición del jugador autenticado
router.get('/mi-posicion', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT elo, liga,
        (SELECT COUNT(*)+1 FROM jugadores WHERE elo > j.elo AND activo = TRUE) as posicion
      FROM jugadores j WHERE id = $1
    `, [req.jugador.id]);

    if (!result.rows[0]) return res.status(404).json({ exito: false, error: 'No encontrado' });

    const { elo, liga, posicion } = result.rows[0];
    res.json({ exito: true, elo, liga, posicion: parseInt(posicion), ligaInfo: obtenerLiga(elo) });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
module.exports.obtenerLiga = obtenerLiga;
module.exports.calcularELO = calcularELO;
