/**
 * Domino Real RD - Sistema Social COMPLETO con DB real
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { db } = require('../models/Database');
const push = require('../services/NotificacionesPush');

// GET /social/amigos - Lista de amigos del jugador autenticado
router.get('/amigos', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        j.id, j.nombre, j.pais, j.elo, j.liga, j.avatar,
        j.ultimo_login,
        a.estado, a.creada_en,
        CASE WHEN j.ultimo_login > NOW() - INTERVAL '5 minutes' THEN 'conectado'
             WHEN j.ultimo_login > NOW() - INTERVAL '24 hours' THEN 'reciente'
             ELSE 'desconectado' END as estado_conexion
      FROM amistades a
      JOIN jugadores j ON (
        CASE WHEN a.solicitante_id = $1 THEN a.receptor_id ELSE a.solicitante_id END = j.id
      )
      WHERE (a.solicitante_id = $1 OR a.receptor_id = $1)
        AND a.estado = 'aceptada'
      ORDER BY j.ultimo_login DESC
    `, [req.jugador.id]);

    res.json({ exito: true, amigos: result.rows });
  } catch (err) {
    console.error('[Social] Error amigos:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /social/solicitudes - Solicitudes pendientes
router.get('/solicitudes', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.id, a.creada_en, j.id as jugador_id, j.nombre, j.elo, j.liga, j.avatar, j.pais
      FROM amistades a
      JOIN jugadores j ON j.id = a.solicitante_id
      WHERE a.receptor_id = $1 AND a.estado = 'pendiente'
      ORDER BY a.creada_en DESC
    `, [req.jugador.id]);

    res.json({ exito: true, solicitudes: result.rows });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /social/agregar-amigo
router.post('/agregar-amigo', authMiddleware, async (req, res) => {
  try {
    const { destinatarioId } = req.body;
    const solicitanteId = req.jugador.id;

    if (solicitanteId === destinatarioId)
      return res.status(400).json({ exito: false, error: 'No puedes agregarte a ti mismo' });

    // Verificar que el destinatario existe
    const dest = await db.query('SELECT id, nombre FROM jugadores WHERE id=$1 AND activo=TRUE', [destinatarioId]);
    if (!dest.rows[0])
      return res.status(404).json({ exito: false, error: 'Jugador no encontrado' });

    // Verificar si ya existe la amistad
    const existe = await db.query(`
      SELECT id, estado FROM amistades
      WHERE (solicitante_id=$1 AND receptor_id=$2) OR (solicitante_id=$2 AND receptor_id=$1)
    `, [solicitanteId, destinatarioId]);

    if (existe.rows[0]) {
      const estados = { pendiente: 'Solicitud ya enviada', aceptada: 'Ya son amigos', bloqueada: 'No se puede agregar' };
      return res.status(409).json({ exito: false, error: estados[existe.rows[0].estado] });
    }

    await db.query(
      'INSERT INTO amistades (solicitante_id, receptor_id, estado) VALUES ($1,$2,$3)',
      [solicitanteId, destinatarioId, 'pendiente']
    );

    // Notificación al destinatario
    const solicitante = await db.query('SELECT nombre FROM jugadores WHERE id=$1', [solicitanteId]);
    await db.query(
      `INSERT INTO notificaciones (jugador_id, tipo, titulo, cuerpo, datos)
       VALUES ($1,'amistad','Nueva solicitud de amistad',$2,$3)`,
      [destinatarioId, `${solicitante.rows[0]?.nombre} quiere ser tu amigo`,
       JSON.stringify({ solicitanteId })]
    );

    // Push notification al destinatario
    push.notificarSolicitudAmistad(destinatarioId, { nombreSolicitante: solicitante.rows[0]?.nombre }).catch(() => {});

    res.json({ exito: true, mensaje: `¡Solicitud enviada a ${dest.rows[0].nombre}!`, estado: 'pendiente' });
  } catch (err) {
    console.error('[Social] Error agregar amigo:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /social/responder-solicitud
router.post('/responder-solicitud', authMiddleware, async (req, res) => {
  try {
    const { solicitudId, aceptar } = req.body;

    const solicitud = await db.query(
      'SELECT * FROM amistades WHERE id=$1 AND receptor_id=$2 AND estado=$3',
      [solicitudId, req.jugador.id, 'pendiente']
    );

    if (!solicitud.rows[0])
      return res.status(404).json({ exito: false, error: 'Solicitud no encontrada' });

    const nuevoEstado = aceptar ? 'aceptada' : 'bloqueada';
    await db.query('UPDATE amistades SET estado=$1 WHERE id=$2', [nuevoEstado, solicitudId]);

    if (aceptar) {
      const receptor = await db.query('SELECT nombre FROM jugadores WHERE id=$1', [req.jugador.id]);
      await db.query(
        `INSERT INTO notificaciones (jugador_id, tipo, titulo, cuerpo)
         VALUES ($1,'amistad','¡Solicitud aceptada!',$2)`,
        [solicitud.rows[0].solicitante_id, `${receptor.rows[0]?.nombre} aceptó tu solicitud de amistad 🤝`]
      );
      // Push notification al solicitante original
      push.notificarAmistadAceptada(solicitud.rows[0].solicitante_id, { nombreAmigo: receptor.rows[0]?.nombre }).catch(() => {});
    }

    res.json({ exito: true, mensaje: aceptar ? '¡Ahora son amigos! 🤝' : 'Solicitud rechazada' });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /social/invitar-partida
router.post('/invitar-partida', authMiddleware, async (req, res) => {
  try {
    const { destinatarioId, roomId } = req.body;

    const invitador = await db.query('SELECT nombre FROM jugadores WHERE id=$1', [req.jugador.id]);

    await db.query(
      `INSERT INTO notificaciones (jugador_id, tipo, titulo, cuerpo, datos)
       VALUES ($1,'invitacion_partida','¡Te invitaron a jugar!',$2,$3)`,
      [destinatarioId,
       `${invitador.rows[0]?.nombre} te invita a una partida de dominó 🎲`,
       JSON.stringify({ roomId, invitadorId: req.jugador.id })]
    );

    // Push notification inmediata al destinatario
    push.notificarInvitacion(destinatarioId, {
      nombreInvitador: invitador.rows[0]?.nombre,
      roomId
    }).catch(() => {});

    res.json({
      exito: true,
      mensaje: '¡Invitación enviada!',
      enlacePartida: `https://domino-real-rd.vercel.app/?sala=${roomId}`,
      codigoSala: roomId
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /social/compartir-victoria
router.post('/compartir-victoria', authMiddleware, async (req, res) => {
  try {
    const { resultado, plataforma } = req.body;
    const nombre = req.jugador.nombre;

    const textos = {
      facebook: `🏆 ¡${nombre} acaba de ganar en Dominó Real RD con ${resultado?.puntos || 200} puntos! ${resultado?.capicua ? '¡Con CAPICÚA! 🎉' : ''} ¿Me ganas? 🇩🇴 #dominorealrd`,
      whatsapp: `🎲 ¡Oye! Acabo de ganar una partida de dominó dominicano${resultado?.capicua ? ' ¡con CAPICÚA! 🎉' : ''}! Juega conmigo en Dominó Real RD 👉 https://domino-real-rd.vercel.app`,
      twitter: `🏆 ¡${resultado?.capicua ? 'CAPICÚA!' : 'DOMINÓ!'} Ganando con ${resultado?.puntos || 200} puntos. ¡El mejor dominó dominicano! 🇩🇴 #DominoRealRD`
    };

    // Dar monedas por compartir (una vez por día)
    const hoy = new Date().toDateString();
    const yaCompartioHoy = await db.query(`
      SELECT id FROM transacciones
      WHERE jugador_id=$1 AND tipo='compartir_victoria'
        AND creada_en > NOW() - INTERVAL '24 hours'
    `, [req.jugador.id]);

    let recompensa = null;
    if (!yaCompartioHoy.rows[0]) {
      await db.query(
        'UPDATE jugadores SET monedas=monedas+50 WHERE id=$1',
        [req.jugador.id]
      );
      await db.query(
        `INSERT INTO transacciones (jugador_id, tipo, monto, descripcion)
         VALUES ($1,'compartir_victoria',50,'Bonus por compartir victoria')`,
        [req.jugador.id]
      );
      recompensa = { monedas: 50, mensaje: '¡+50 monedas por compartir!' };
    }

    res.json({ exito: true, texto: textos[plataforma] || textos.whatsapp, recompensa });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /social/codigo-referido - Código de referido personal
router.get('/codigo-referido', authMiddleware, async (req, res) => {
  try {
    const jugadorId = req.jugador.id;
    const codigo = `RD${jugadorId.replace(/-/g,'').toUpperCase().slice(-6)}`;

    const referidosResult = await db.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN bono_otorgado THEN 1 ELSE 0 END) as con_bono FROM referidos WHERE referidor_id=$1',
      [jugadorId]
    );

    const { total, con_bono } = referidosResult.rows[0];

    res.json({
      exito: true,
      codigo,
      enlace: `https://domino-real-rd.vercel.app/?ref=${codigo}`,
      textoWhatsApp: `¡Juega dominó dominicano conmigo! Usa mi código ${codigo} y gana 500 monedas extra 🎲🇩🇴 https://domino-real-rd.vercel.app/?ref=${codigo}`,
      referidosActivos: parseInt(total) || 0,
      gananciasReferidos: (parseInt(con_bono) || 0) * 200
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /social/registrar-referido
router.post('/registrar-referido', authMiddleware, async (req, res) => {
  try {
    const { codigoReferido } = req.body;
    const nuevoJugadorId = req.jugador.id;

    if (!codigoReferido)
      return res.status(400).json({ exito: false, error: 'Código requerido' });

    // Encontrar al referidor por código (últimos 6 chars del ID sin guiones)
    const referidores = await db.query(
      `SELECT id, nombre FROM jugadores WHERE activo=TRUE`,
      []
    );

    const referidor = referidores.rows.find(j => {
      const codigo = `RD${j.id.replace(/-/g,'').toUpperCase().slice(-6)}`;
      return codigo === codigoReferido.toUpperCase();
    });

    if (!referidor)
      return res.status(404).json({ exito: false, error: 'Código de referido inválido' });

    if (referidor.id === nuevoJugadorId)
      return res.status(400).json({ exito: false, error: 'No puedes referirte a ti mismo' });

    // Verificar que no está ya referido
    const yaReferido = await db.query('SELECT id FROM referidos WHERE referido_id=$1', [nuevoJugadorId]);
    if (yaReferido.rows[0])
      return res.status(409).json({ exito: false, error: 'Ya usaste un código de referido' });

    // Registrar referido y dar bonos
    await db.query(
      'INSERT INTO referidos (referidor_id, referido_id, bono_otorgado) VALUES ($1,$2,TRUE)',
      [referidor.id, nuevoJugadorId]
    );

    // +200 al referidor, +500 al nuevo
    await db.query('UPDATE jugadores SET monedas=monedas+200 WHERE id=$1', [referidor.id]);
    await db.query('UPDATE jugadores SET monedas=monedas+500 WHERE id=$1', [nuevoJugadorId]);

    await db.query(
      `INSERT INTO transacciones (jugador_id, tipo, monto, descripcion) VALUES ($1,'referido',200,'Bono por traer amigo')`,
      [referidor.id]
    );
    await db.query(
      `INSERT INTO notificaciones (jugador_id, tipo, titulo, cuerpo) VALUES ($1,'premio','¡+200 monedas por referido!','Tu amigo usó tu código. ¡Gracias por traerlo!')`,
      [referidor.id]
    );

    res.json({
      exito: true,
      mensaje: '¡Código aplicado!',
      bonusReferidor: { monedas: 200 },
      bonusReferido: { monedas: 500, mensaje: '¡+500 monedas de bienvenida extra!' }
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /social/amigos-facebook — Encontrar amigos de Facebook que usan la app
router.post('/amigos-facebook', authMiddleware, async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ exito: false, error: 'accessToken de Facebook requerido' });

    // Obtener lista de amigos del usuario desde Facebook Graph API
    // Solo devuelve amigos que también autorizaron la app (política de Meta post-2015)
    const fbResp = await fetch(
      `https://graph.facebook.com/me/friends?fields=id,name,picture.type(normal)&access_token=${accessToken}&limit=200`
    );
    const fbData = await fbResp.json();

    if (fbData.error) {
      return res.status(401).json({ exito: false, error: 'Token de Facebook inválido o expirado' });
    }

    const fbAmigos = fbData.data || [];

    if (fbAmigos.length === 0) {
      return res.json({
        exito: true,
        amigos: [],
        totalEnFacebook: 0,
        mensaje: 'Ningún amigo de Facebook usa la app aún — ¡invítalos a jugar! 🎲'
      });
    }

    const fbIds = fbAmigos.map(f => f.id);

    // Buscar cuáles de esos IDs están registrados en la app
    const result = await db.query(
      `SELECT id, nombre, pais, elo, liga, avatar, social_id
       FROM jugadores
       WHERE social_id = ANY($1::text[])
         AND login_method = 'facebook'
         AND activo = TRUE
         AND id != $2`,
      [fbIds, req.jugador.id]
    );

    // Ver cuáles ya son amigos
    const yaAmigosResult = await db.query(
      `SELECT CASE WHEN solicitante_id = $1 THEN receptor_id ELSE solicitante_id END as amigo_id, estado
       FROM amistades
       WHERE solicitante_id = $1 OR receptor_id = $1`,
      [req.jugador.id]
    );
    const relacionMap = new Map(yaAmigosResult.rows.map(r => [r.amigo_id, r.estado]));

    // Combinar datos de la app + foto de Facebook
    const jugadoresEncontrados = result.rows.map(j => {
      const fbAmigo = fbAmigos.find(f => f.id === j.social_id);
      const relacion = relacionMap.get(j.id) || null;
      return {
        id:            j.id,
        nombre:        j.nombre,
        pais:          j.pais,
        elo:           j.elo,
        liga:          j.liga,
        avatar:        j.avatar,
        foto_facebook: fbAmigo?.picture?.data?.url || null,
        nombre_facebook: fbAmigo?.name || j.nombre,
        ya_es_amigo:   relacion === 'aceptada',
        pendiente:     relacion === 'pendiente'
      };
    });

    res.json({
      exito:          true,
      amigos:         jugadoresEncontrados,
      totalEnFacebook: fbAmigos.length,
      encontrados:    jugadoresEncontrados.length,
      mensaje:        jugadoresEncontrados.length === 0
        ? `Tienes ${fbAmigos.length} amigos en Facebook pero ninguno usa la app aún — ¡invítalos!`
        : `¡${jugadoresEncontrados.length} amigo${jugadoresEncontrados.length !== 1 ? 's' : ''} de Facebook encontrado${jugadoresEncontrados.length !== 1 ? 's' : ''}! 🎲`
    });
  } catch (err) {
    console.error('[Social FB]', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /social/eventos
router.get('/eventos', async (req, res) => {
  const ahora = new Date();
  const diaSemana = ahora.getDay();
  const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

  res.json({
    exito: true,
    eventos: [
      {
        id: 'evento_fin_semana',
        nombre: '🎉 Fin de Semana Dominicano',
        descripcion: 'Este fin de semana: ¡doble ELO en todas las partidas!',
        activo: esFinDeSemana,
        inicio: new Date(Date.now() - 86400000).toISOString(),
        fin: new Date(Date.now() + 86400000).toISOString(),
        recompensaExtra: { descripcion: '2x ELO', icono: '⚡' }
      },
      {
        id: 'evento_capicua',
        nombre: '🎲 Semana de la Capicúa',
        descripcion: '¡Cada capicúa vale el doble esta semana!',
        activo: true,
        fin: new Date(Date.now() + 86400000 * 7).toISOString(),
        recompensaExtra: { descripcion: '+60 puntos por capicúa', icono: '🎉' }
      }
    ]
  });
});

module.exports = router;
