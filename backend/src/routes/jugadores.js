/**
 * Domino Real RD — Rutas de Jugadores
 * Perfil, personalizacion, push tokens, historial, busqueda
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authMiddleware } = require('./auth');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /jugadores/perfil - Perfil propio completo
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT j.id, j.nombre, j.email, j.pais, j.elo, j.liga, j.avatar,
              j.mesa_activa, j.fichas_activas, j.monedas, j.partidas_jugadas,
              j.partidas_ganadas, j.capicuas_hechas, j.mejor_racha, j.racha_actual,
              j.codigo_referido, j.creado_en, j.ultimo_login,
              e.victorias, e.derrotas, e.puntos_torneo, e.torneos_ganados,
              COALESCE(e.victorias::float / NULLIF(j.partidas_jugadas, 0) * 100, 0)::int AS porcentaje_victorias
       FROM jugadores j
       LEFT JOIN estadisticas e ON e.jugador_id = j.id
       WHERE j.id = $1`,
      [req.jugador.id]
    );

    if (!rows.length) return res.status(404).json({ exito: false, error: 'Jugador no encontrado' });

    res.json({ exito: true, perfil: rows[0] });
  } catch (err) {
    console.error('[GET /perfil]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/buscar?q=nombre - Buscar jugadores por nombre
router.get('/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ exito: false, error: 'Minimo 2 caracteres para buscar' });
    }

    const { rows } = await db.query(
      `SELECT id, nombre, elo, liga, avatar, pais, partidas_jugadas, partidas_ganadas
       FROM jugadores
       WHERE nombre ILIKE $1
       ORDER BY elo DESC
       LIMIT 20`,
      [`%${q.trim()}%`]
    );

    res.json({ exito: true, jugadores: rows });
  } catch (err) {
    console.error('[GET /buscar]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/historial/partidas - Ultimas partidas del jugador autenticado
router.get('/historial/partidas', authMiddleware, async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite) || 10, 50);

    const { rows } = await db.query(
      `SELECT m.id, m.tipo, m.puntaje_ganador, m.duracion_segundos, m.creado_en,
              CASE WHEN m.ganador_id = $1 THEN true ELSE false END AS gane,
              he.cambio_elo
       FROM matches m
       LEFT JOIN historial_elo he ON he.jugador_id = $1 AND he.match_id = m.id
       WHERE $1 = ANY(m.jugadores_ids)
       ORDER BY m.creado_en DESC
       LIMIT $2`,
      [req.jugador.id, limite]
    );

    res.json({ exito: true, historial: rows });
  } catch (err) {
    console.error('[GET /historial]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/notificaciones - Notificaciones del jugador
router.get('/notificaciones', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, tipo, titulo, mensaje, datos, leida, creado_en
       FROM notificaciones
       WHERE jugador_id = $1
       ORDER BY creado_en DESC
       LIMIT 50`,
      [req.jugador.id]
    );

    const noLeidas = rows.filter(n => !n.leida).length;
    res.json({ exito: true, notificaciones: rows, noLeidas });
  } catch (err) {
    console.error('[GET /notificaciones]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// PUT /jugadores/notificaciones/leer - Marcar todas como leidas
router.put('/notificaciones/leer', authMiddleware, async (req, res) => {
  try {
    await db.query(
      `UPDATE notificaciones SET leida = true WHERE jugador_id = $1 AND leida = false`,
      [req.jugador.id]
    );
    res.json({ exito: true });
  } catch (err) {
    console.error('[PUT /notificaciones/leer]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// PUT /jugadores/push-token - Guardar/actualizar Expo push token
router.put('/push-token', authMiddleware, async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ exito: false, error: 'pushToken requerido' });

    // Validar formato Expo
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      return res.status(400).json({ exito: false, error: 'Formato de token invalido. Debe ser ExponentPushToken[...]' });
    }

    await db.query(
      `UPDATE jugadores SET push_token = $1 WHERE id = $2`,
      [pushToken, req.jugador.id]
    );

    console.log(`[Push] Token registrado para jugador ${req.jugador.id}: ${pushToken.slice(0, 30)}...`);
    res.json({ exito: true, mensaje: 'Push token registrado correctamente' });
  } catch (err) {
    console.error('[PUT /push-token]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// Mantener compatibilidad con /fcm-token (redirige a push-token)
router.put('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, pushToken } = req.body;
    const token = pushToken || fcmToken;
    if (!token) return res.status(400).json({ exito: false, error: 'Token requerido' });

    await db.query(
      `UPDATE jugadores SET push_token = $1 WHERE id = $2`,
      [token, req.jugador.id]
    );

    res.json({ exito: true, mensaje: 'Token de notificaciones registrado' });
  } catch (err) {
    console.error('[PUT /fcm-token]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// PUT /jugadores/personalizar - Cambiar avatar, mesa, fichas activos
router.put('/personalizar', authMiddleware, async (req, res) => {
  try {
    const { avatar, mesa, fichas } = req.body;
    const jugadorId = req.jugador.id;

    const updates = [];
    const values = [];
    let idx = 1;

    if (avatar !== undefined) { updates.push(`avatar = $${idx++}`); values.push(avatar); }
    if (mesa !== undefined) { updates.push(`mesa_activa = $${idx++}`); values.push(mesa); }
    if (fichas !== undefined) { updates.push(`fichas_activas = $${idx++}`); values.push(fichas); }

    if (!updates.length) return res.status(400).json({ exito: false, error: 'Nada que actualizar' });

    values.push(jugadorId);
    await db.query(
      `UPDATE jugadores SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    res.json({ exito: true, mensaje: '¡Personalizacion actualizada!' });
  } catch (err) {
    console.error('[PUT /personalizar]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/inventario - Items comprados por el jugador
router.get('/inventario', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT item_id, categoria, comprado_en
       FROM inventario
       WHERE jugador_id = $1
       ORDER BY comprado_en DESC`,
      [req.jugador.id]
    );
    res.json({ exito: true, inventario: rows });
  } catch (err) {
    console.error('[GET /inventario]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/:id - Perfil publico de otro jugador
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT j.id, j.nombre, j.pais, j.elo, j.liga, j.avatar,
              j.partidas_jugadas, j.partidas_ganadas, j.capicuas_hechas, j.mejor_racha,
              COALESCE(j.partidas_ganadas::float / NULLIF(j.partidas_jugadas, 0) * 100, 0)::int AS porcentaje_victorias
       FROM jugadores j
       WHERE j.id = $1`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ exito: false, error: 'Jugador no encontrado' });

    res.json({ exito: true, perfil: rows[0] });
  } catch (err) {
    console.error('[GET /:id]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
