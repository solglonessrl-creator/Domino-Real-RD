/**
 * Domino Real RD — Rutas de Jugadores
 * Perfil, personalización, notificaciones, historial
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { Jugadores, Estadisticas, Matches, Notificaciones, Inventario } = require('../models/Database');

// GET /jugadores/perfil - Perfil propio
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const jugador = await Jugadores.buscarPorId(req.jugador.id);
    if (!jugador) return res.status(404).json({ exito: false, error: 'Jugador no encontrado' });

    const { password_hash, ...perfilPublico } = jugador;
    res.json({ exito: true, perfil: perfilPublico });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/:id - Perfil público de otro jugador
router.get('/:id', async (req, res) => {
  try {
    const jugador = await Jugadores.buscarPorId(req.params.id);
    if (!jugador) return res.status(404).json({ exito: false, error: 'Jugador no encontrado' });

    res.json({
      exito: true,
      perfil: {
        id: jugador.id,
        nombre: jugador.nombre,
        pais: jugador.pais,
        elo: jugador.elo,
        liga: jugador.liga,
        avatar: jugador.avatar,
        partidas_jugadas: jugador.partidas_jugadas,
        partidas_ganadas: jugador.partidas_ganadas,
        capicuas_hechas: jugador.capicuas_hechas,
        mejor_racha: jugador.mejor_racha
      }
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// PUT /jugadores/personalizar - Cambiar avatar, mesa, fichas
router.put('/personalizar', authMiddleware, async (req, res) => {
  try {
    const { avatar, mesa, fichas } = req.body;
    const jugadorId = req.jugador.id;

    // Verificar que el jugador tiene los items en su inventario
    const checks = [];
    if (avatar) checks.push(Inventario.tieneItem(jugadorId, avatar));
    if (mesa) checks.push(Inventario.tieneItem(jugadorId, mesa));
    if (fichas) checks.push(Inventario.tieneItem(jugadorId, fichas));

    const resultados = await Promise.all(checks);
    if (resultados.some(r => !r)) {
      return res.status(403).json({ exito: false, error: 'No tienes ese item en tu inventario' });
    }

    await Jugadores.actualizarPersonalizacion(jugadorId, { avatar, mesa, fichas });
    res.json({ exito: true, mensaje: '¡Personalización actualizada!' });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/historial/partidas - Últimas partidas
router.get('/historial/partidas', authMiddleware, async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite) || 10, 50);
    const historial = await Matches.historialJugador(req.jugador.id, limite);
    res.json({ exito: true, historial });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/notificaciones - Obtener notificaciones
router.get('/notificaciones', authMiddleware, async (req, res) => {
  try {
    const notifs = await Notificaciones.listar(req.jugador.id);
    const noLeidas = notifs.filter(n => !n.leida).length;
    res.json({ exito: true, notificaciones: notifs, noLeidas });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// PUT /jugadores/notificaciones/leer - Marcar como leídas
router.put('/notificaciones/leer', authMiddleware, async (req, res) => {
  try {
    await Notificaciones.marcarLeidas(req.jugador.id);
    res.json({ exito: true });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// PUT /jugadores/fcm-token - Guardar token de notificaciones push
router.put('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ exito: false, error: 'Token requerido' });

    // TODO: guardar en tabla fcm_tokens
    // await db.query('INSERT INTO fcm_tokens (jugador_id, token) VALUES ($1,$2) ON CONFLICT (jugador_id) DO UPDATE SET token=$2', [req.jugador.id, fcmToken]);

    res.json({ exito: true, mensaje: 'Token FCM registrado' });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/inventario - Inventario completo
router.get('/inventario', authMiddleware, async (req, res) => {
  try {
    const items = await Inventario.obtenerTodo(req.jugador.id);
    res.json({ exito: true, inventario: items });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /jugadores/buscar?q=nombre - Buscar jugadores por nombre
router.get('/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ exito: false, error: 'Búsqueda mínimo 2 caracteres' });
    }

    // TODO: query real con pg_trgm
    // const res = await db.query("SELECT id,nombre,elo,liga,avatar,pais FROM jugadores WHERE nombre ILIKE $1 LIMIT 20", [`%${q}%`]);

    res.json({
      exito: true,
      jugadores: [
        { id: 'mock1', nombre: `${q}_Player`, elo: 1400, liga: 'Plata', pais: 'RD' }
      ]
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
