/**
 * Domino Real RD - Sistema Social
 * Amigos, invitaciones, compartir partidas, bonos de referidos
 */

const express = require('express');
const router = express.Router();

// GET /social/amigos/:jugadorId - Lista de amigos
router.get('/amigos/:jugadorId', async (req, res) => {
  const amigos = [
    { id: 'usr_456', nombre: 'Pedro RD', elo: 1450, liga: 'Plata', estado: 'en_juego', avatar: 'avatar_rd' },
    { id: 'usr_789', nombre: 'Maria Domino', elo: 1820, liga: 'Oro', estado: 'conectado', avatar: 'avatar_campeona' },
    { id: 'usr_101', nombre: 'Juan Cracks', elo: 2100, liga: 'Diamante', estado: 'desconectado', avatar: 'avatar_rey' }
  ];

  res.json({ exito: true, amigos });
});

// POST /social/agregar-amigo - Solicitud de amistad
router.post('/agregar-amigo', async (req, res) => {
  const { solicitanteId, destinatarioId } = req.body;

  res.json({
    exito: true,
    mensaje: '¡Solicitud de amistad enviada!',
    estado: 'pendiente'
  });
});

// POST /social/invitar-partida - Invitar amigo a partida
router.post('/invitar-partida', async (req, res) => {
  const { deId, paraId, roomId } = req.body;

  // TODO: Enviar notificación push / socket al amigo
  res.json({
    exito: true,
    mensaje: 'Invitación enviada',
    enlacePartida: `https://dominorealrd.com/partida/${roomId}`,
    codigoSala: roomId
  });
});

// POST /social/compartir-victoria - Compartir en Facebook/WhatsApp
router.post('/compartir-victoria', async (req, res) => {
  const { jugadorId, resultado, plataforma } = req.body;

  const textos = {
    facebook: `🏆 ¡Acabo de ganar en Dominó Real RD con ${resultado.puntos} puntos! ${resultado.capicua ? '¡Con CAPICÚA! 🎉' : ''} ¿Me ganas? 🇩🇴 #dominorealrd #Domino`,
    whatsapp: `🎲 ¡Oye! Acabo de ganar una partida de dominó dominicano en Dominó Real RD${resultado.capicua ? ' ¡con CAPICÚA! 🎉' : ''}! Descárgala y juega conmigo 👉 https://dominorealrd.com`,
    twitter: `🏆 ¡${resultado.capicua ? 'CAPICÚA!' : 'DOMINÓ!'} Ganando en @dominorealrd con ${resultado.puntos} puntos. ¡El mejor juego de dominó dominicano! 🇩🇴 #Domino #RD`
  };

  // Dar monedas por compartir (solo una vez al día)
  const recompensa = plataforma ? { monedas: 50, mensaje: '¡+50 monedas por compartir!' } : null;

  res.json({
    exito: true,
    texto: textos[plataforma] || textos.whatsapp,
    recompensa
  });
});

// POST /social/referido - Registrar referido
router.post('/referido', async (req, res) => {
  const { codigoReferido, nuevoJugadorId } = req.body;

  // TODO: Buscar quién tiene ese código y darle bonificación
  res.json({
    exito: true,
    mensaje: '¡Referido registrado! Tu amigo recibirá 500 monedas de bono.',
    bonusReferidor: { monedas: 200, mensaje: '¡+200 monedas por traer un amigo!' },
    bonusReferido: { monedas: 500, mensaje: '¡+500 monedas de bienvenida extra!' }
  });
});

// GET /social/codigo-referido/:jugadorId - Obtener código de referido personal
router.get('/codigo-referido/:jugadorId', async (req, res) => {
  const { jugadorId } = req.params;
  const codigo = jugadorId.toUpperCase().slice(-6);

  res.json({
    exito: true,
    codigo: `RD${codigo}`,
    enlace: `https://dominorealrd.com/join?ref=RD${codigo}`,
    textoWhatsApp: `¡Juega dominó conmigo en Dominó Real RD! Usa mi código RD${codigo} y gana 500 monedas extra 🎲🇩🇴 https://dominorealrd.com/join?ref=RD${codigo}`,
    referidosActivos: 3,
    gananciasReferidos: 600
  });
});

// GET /social/eventos - Eventos semanales
router.get('/eventos', async (req, res) => {
  const eventos = [
    {
      id: 'evento_fin_semana',
      nombre: '🎉 Fin de Semana Dominicano',
      descripcion: 'Este fin de semana: ¡doble ELO en todas las partidas!',
      tipo: 'doble_elo',
      activo: true,
      inicio: new Date(Date.now() - 86400000).toISOString(),
      fin: new Date(Date.now() + 86400000).toISOString(),
      recompensaExtra: { descripcion: '2x ELO', icono: '⚡' }
    },
    {
      id: 'evento_capicua',
      nombre: '🎲 Semana de la Capicúa',
      descripcion: '¡Cada capicúa vale el doble esta semana! ¡A forzarlas!',
      tipo: 'capicua_bonus',
      activo: true,
      inicio: new Date(Date.now()).toISOString(),
      fin: new Date(Date.now() + 86400000 * 7).toISOString(),
      recompensaExtra: { descripcion: '+60 puntos bonus por capicúa', icono: '🎉' }
    },
    {
      id: 'evento_rd_day',
      nombre: '🇩🇴 Día de la Independencia RD',
      descripcion: 'Torneo especial 27 de Febrero. ¡Solo para dominicanos del mundo!',
      tipo: 'torneo_especial',
      activo: false,
      inicio: new Date('2025-02-27').toISOString(),
      fin: new Date('2025-02-28').toISOString(),
      recompensaExtra: { descripcion: 'Skin exclusiva Bandera RD', icono: '🇩🇴' }
    }
  ];

  res.json({ exito: true, eventos });
});

module.exports = router;
