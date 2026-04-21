/**
 * Domino Real RD - Sistema de Torneos COMPLETO con DB real y brackets
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { db } = require('../models/Database');
const push = require('../services/NotificacionesPush');

// Genera bracket de eliminación directa
function generarBracket(participantes) {
  const n = participantes.length;
  const rondas = [];
  let jugadoresRonda = [...participantes];

  // Rellenar hasta la siguiente potencia de 2
  let tamano = 1;
  while (tamano < n) tamano *= 2;
  while (jugadoresRonda.length < tamano) {
    jugadoresRonda.push({ id: null, nombre: 'BYE', pais: '-', elo: 0 });
  }

  let numeroRonda = 1;
  const nombresRonda = { 1: 'Final', 2: 'Semifinal', 4: 'Cuartos de Final', 8: 'Octavos de Final', 16: 'Dieciseisavos' };

  while (jugadoresRonda.length > 1) {
    const partidas = [];
    for (let i = 0; i < jugadoresRonda.length; i += 2) {
      const j1 = jugadoresRonda[i];
      const j2 = jugadoresRonda[i + 1];
      const esBye = j2.id === null;

      partidas.push({
        id: `r${numeroRonda}_p${Math.floor(i / 2) + 1}`,
        jugador1: j1,
        jugador2: esBye ? null : j2,
        ganador: esBye ? j1 : null,
        resultado: esBye ? 'BYE' : null,
        estado: esBye ? 'completado' : 'pendiente'
      });
    }

    const totalEnRonda = jugadoresRonda.length / 2;
    rondas.unshift({
      numero: numeroRonda,
      nombre: nombresRonda[totalEnRonda] || `Ronda ${numeroRonda}`,
      partidas
    });

    // Ganadores avanzan (los BYE avanzan automáticamente)
    jugadoresRonda = partidas.map(p => p.ganador || { id: null, nombre: '?', pendiente: true });
    numeroRonda++;
  }

  return rondas.reverse();
}

// GET /torneos - Listar torneos desde DB
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM torneo_inscripciones WHERE torneo_id=t.id) as participantes_actuales
      FROM torneos t
      WHERE t.estado IN ('inscripcion','en_curso')
      ORDER BY t.fecha_inicio ASC
      LIMIT 20
    `);

    // Si no hay torneos en DB, devolver los predefinidos
    if (result.rows.length === 0) {
      return res.json({
        exito: true,
        torneos: [
          {
            id: 'torneo_semanal_001',
            nombre: '🏆 Copa Dominó Real RD - Semana 1',
            tipo: 'eliminacion_directa',
            estado: 'inscripcion',
            esGratuito: true,
            inscripcion: 0,
            fechaInicio: new Date(Date.now() + 86400000 * 2).toISOString(),
            maxParticipantes: 64,
            participantesActuales: 0,
            premios: { primero: { monedas: 5000 }, segundo: { monedas: 2000 }, tercero: { monedas: 1000 } }
          }
        ]
      });
    }

    res.json({ exito: true, torneos: result.rows });
  } catch (err) {
    console.error('[Torneos] Error lista:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /torneos/:id - Detalle con bracket real
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const torneoResult = await db.query('SELECT * FROM torneos WHERE id=$1', [id]);
    if (!torneoResult.rows[0])
      return res.status(404).json({ exito: false, error: 'Torneo no encontrado' });

    const torneo = torneoResult.rows[0];

    // Obtener participantes
    const partResult = await db.query(`
      SELECT j.id, j.nombre, j.pais, j.elo, j.liga, j.avatar
      FROM torneo_inscripciones ti
      JOIN jugadores j ON j.id = ti.jugador_id
      WHERE ti.torneo_id=$1
      ORDER BY j.elo DESC
    `, [id]);

    const participantes = partResult.rows;

    // Generar o recuperar bracket
    let bracket = torneo.bracket;
    if (!bracket && participantes.length >= 2) {
      bracket = generarBracket(participantes);
      await db.query('UPDATE torneos SET bracket=$1 WHERE id=$2', [JSON.stringify(bracket), id]);
    }

    res.json({
      exito: true,
      torneo: { ...torneo, participantesActuales: participantes.length },
      participantes,
      bracket: bracket || []
    });
  } catch (err) {
    console.error('[Torneos] Error detalle:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /torneos/crear - Crear torneo privado en DB
router.post('/crear', authMiddleware, async (req, res) => {
  try {
    const {
      nombre, tipo = 'eliminacion_directa',
      esGratuito = true, inscripcion = 0,
      maxParticipantes = 8, fechaInicio
    } = req.body;

    if (!nombre || nombre.length < 3 || nombre.length > 50)
      return res.status(400).json({ exito: false, error: 'Nombre inválido (3-50 caracteres)' });

    if (![4, 8, 16, 32, 64].includes(maxParticipantes))
      return res.status(400).json({ exito: false, error: 'Máximo participantes: 4, 8, 16, 32 o 64' });

    const inicio = fechaInicio
      ? new Date(fechaInicio)
      : new Date(Date.now() + 3600000);

    const fin = new Date(inicio.getTime() + 86400000 * 2);
    const codigoInvitacion = Math.random().toString(36).substr(2, 8).toUpperCase();

    const premioPool = maxParticipantes * inscripcion;
    const result = await db.query(`
      INSERT INTO torneos (
        nombre, tipo, estado, es_gratuito, inscripcion_monedas, max_participantes,
        fecha_inicio, fecha_fin, creador_id, es_privado, codigo_invitacion,
        premio_1ro_monedas, premio_2do_monedas, premio_3ro_monedas
      ) VALUES ($1,$2,'inscripcion',$3,$4,$5,$6,$7,$8,TRUE,$9,$10,$11,$12)
      RETURNING *
    `, [
      nombre, tipo, esGratuito, inscripcion, maxParticipantes,
      inicio, fin, req.jugador.id, codigoInvitacion,
      Math.floor(premioPool * 0.5), Math.floor(premioPool * 0.3), Math.floor(premioPool * 0.1)
    ]);

    // Auto-inscribir al creador
    await db.query(
      'INSERT INTO torneo_inscripciones (torneo_id, jugador_id) VALUES ($1,$2)',
      [result.rows[0].id, req.jugador.id]
    );

    res.json({
      exito: true,
      torneo: result.rows[0],
      mensaje: `¡Torneo "${nombre}" creado! Código: ${codigoInvitacion}`,
      codigoInvitacion
    });
  } catch (err) {
    console.error('[Torneos] Error crear:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /torneos/:id/inscribir
router.post('/:id/inscribir', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const jugadorId = req.jugador.id;

    const torneoResult = await db.query('SELECT * FROM torneos WHERE id=$1', [id]);
    const torneo = torneoResult.rows[0];
    if (!torneo) return res.status(404).json({ exito: false, error: 'Torneo no encontrado' });
    if (torneo.estado !== 'inscripcion') return res.status(400).json({ exito: false, error: 'El torneo ya no acepta inscripciones' });

    const countResult = await db.query('SELECT COUNT(*) as c FROM torneo_inscripciones WHERE torneo_id=$1', [id]);
    if (parseInt(countResult.rows[0].c) >= torneo.max_participantes)
      return res.status(400).json({ exito: false, error: 'El torneo está lleno' });

    const yaInscrito = await db.query(
      'SELECT id FROM torneo_inscripciones WHERE torneo_id=$1 AND jugador_id=$2',
      [id, jugadorId]
    );
    if (yaInscrito.rows[0]) return res.status(409).json({ exito: false, error: 'Ya estás inscrito' });

    // Cobrar inscripción si aplica
    if (!torneo.es_gratuito && torneo.inscripcion_monedas > 0) {
      const jugResult = await db.query('SELECT monedas FROM jugadores WHERE id=$1', [jugadorId]);
      if (jugResult.rows[0].monedas < torneo.inscripcion_monedas)
        return res.status(402).json({ exito: false, error: `Necesitas ${torneo.inscripcion_monedas} monedas para inscribirte` });

      await db.query('UPDATE jugadores SET monedas=monedas-$1 WHERE id=$2', [torneo.inscripcion_monedas, jugadorId]);
      await db.query(
        'INSERT INTO transacciones (jugador_id, tipo, monto, descripcion) VALUES ($1,$2,$3,$4)',
        [jugadorId, 'torneo_inscripcion', -torneo.inscripcion_monedas, `Inscripción: ${torneo.nombre}`]
      );
    }

    await db.query(
      'INSERT INTO torneo_inscripciones (torneo_id, jugador_id) VALUES ($1,$2)',
      [id, jugadorId]
    );

    res.json({
      exito: true,
      mensaje: `¡Inscripción exitosa en "${torneo.nombre}"! Prepárate para jugar. 🏆`,
      torneo: id
    });
  } catch (err) {
    console.error('[Torneos] Error inscribir:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /torneos/codigo/:codigo - Buscar por código de invitación
router.get('/codigo/:codigo', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, (SELECT COUNT(*) FROM torneo_inscripciones WHERE torneo_id=t.id) as participantes_actuales
       FROM torneos t WHERE t.codigo_invitacion=$1`,
      [req.params.codigo.toUpperCase()]
    );
    if (!result.rows[0]) return res.status(404).json({ exito: false, error: 'Código inválido' });
    res.json({ exito: true, torneo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
