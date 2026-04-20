/**
 * Domino Real RD - Sistema de Torneos
 * Torneos automáticos + privados creados por jugadores
 */

const express = require('express');
const router = express.Router();

const TIPOS_TORNEO = {
  ELIMINACION_DIRECTA: 'eliminacion_directa',
  ROUND_ROBIN: 'round_robin',
  DOBLE_ELIMINACION: 'doble_eliminacion'
};

// GET /torneos - Listar torneos activos y próximos
router.get('/', async (req, res) => {
  const torneosActivos = [
    {
      id: 'torneo_semanal_001',
      nombre: '🏆 Copa Dominó Real RD - Semana 16',
      tipo: TIPOS_TORNEO.ELIMINACION_DIRECTA,
      estado: 'inscripcion', // inscripcion | en_curso | finalizado
      esGratuito: true,
      inscripcion: 0,
      fechaInicio: new Date(Date.now() + 86400000 * 2).toISOString(),
      fechaFin: new Date(Date.now() + 86400000 * 4).toISOString(),
      maxParticipantes: 64,
      participantesActuales: 38,
      premios: {
        primero: { monedas: 5000, trofeo: '🥇 Campeón Semanal', skin: 'mesa_oro' },
        segundo: { monedas: 2000, trofeo: '🥈 Subcampeón' },
        tercero: { monedas: 1000, trofeo: '🥉 Tercer Lugar' }
      },
      requisitos: { minELO: 0, liga: null }
    },
    {
      id: 'torneo_diamante_001',
      nombre: '💎 Liga Diamante Invitacional',
      tipo: TIPOS_TORNEO.ELIMINACION_DIRECTA,
      estado: 'inscripcion',
      esGratuito: false,
      inscripcion: 500, // monedas del juego
      fechaInicio: new Date(Date.now() + 86400000 * 5).toISOString(),
      fechaFin: new Date(Date.now() + 86400000 * 7).toISOString(),
      maxParticipantes: 16,
      participantesActuales: 9,
      premios: {
        primero: { monedas: 50000, trofeo: '💎 Maestro Diamante', skin: 'mesa_diamante', avatar: 'rey_domino' },
        segundo: { monedas: 20000, trofeo: '💎 Elite' },
        tercero: { monedas: 10000, trofeo: '💎 Semipro' }
      },
      requisitos: { minELO: 2000, liga: 'Diamante' }
    },
    {
      id: 'torneo_rd_001',
      nombre: '🇩🇴 Torneo Orgullo Dominicano',
      tipo: TIPOS_TORNEO.ROUND_ROBIN,
      estado: 'en_curso',
      esGratuito: true,
      inscripcion: 0,
      fechaInicio: new Date(Date.now() - 86400000).toISOString(),
      fechaFin: new Date(Date.now() + 86400000 * 2).toISOString(),
      maxParticipantes: 32,
      participantesActuales: 32,
      premios: {
        primero: { monedas: 10000, trofeo: '🇩🇴 Orgullo RD', skin: 'fichas_bandera_rd' },
        segundo: { monedas: 4000 },
        tercero: { monedas: 2000 }
      },
      requisitos: { minELO: 0, pais: 'RD' }
    }
  ];

  res.json({ exito: true, torneos: torneosActivos });
});

// GET /torneos/:id - Detalle de torneo y bracket
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Bracket de ejemplo para eliminación directa
  const bracket = {
    rondas: [
      {
        numero: 1,
        nombre: 'Cuartos de Final',
        partidas: [
          { id: 'p1', equipo1: 'Los Crack', equipo2: 'Dominó Kings', ganador: 'Los Crack', resultado: '200-145' },
          { id: 'p2', equipo1: 'Campeones RD', equipo2: 'Tigres del Norte', ganador: null, estado: 'pendiente' }
        ]
      },
      {
        numero: 2,
        nombre: 'Semifinal',
        partidas: [
          { id: 'sf1', equipo1: null, equipo2: null, ganador: null, estado: 'pendiente' }
        ]
      },
      {
        numero: 3,
        nombre: 'FINAL',
        partidas: [
          { id: 'final', equipo1: null, equipo2: null, ganador: null, estado: 'pendiente' }
        ]
      }
    ]
  };

  res.json({
    exito: true,
    torneo: { id, bracket },
    mensaje: 'Torneo encontrado'
  });
});

// POST /torneos/crear - Crear torneo privado
router.post('/crear', async (req, res) => {
  try {
    const {
      nombre,
      tipo = TIPOS_TORNEO.ELIMINACION_DIRECTA,
      esGratuito = true,
      inscripcion = 0,
      maxParticipantes = 8,
      fechaInicio,
      creadorId,
      contrasena // Para torneos privados
    } = req.body;

    if (!nombre || nombre.length < 3 || nombre.length > 50) {
      return res.status(400).json({ exito: false, error: 'Nombre inválido (3-50 caracteres)' });
    }

    if (![4, 8, 16, 32, 64].includes(maxParticipantes)) {
      return res.status(400).json({ exito: false, error: 'Máximo participantes debe ser 4, 8, 16, 32 o 64' });
    }

    const torneo = {
      id: `torneo_priv_${Date.now()}`,
      nombre,
      tipo,
      esGratuito,
      inscripcion,
      maxParticipantes,
      participantesActuales: 0,
      fechaInicio: fechaInicio || new Date(Date.now() + 3600000).toISOString(),
      creadorId,
      esPrivado: !!contrasena,
      codigoInvitacion: Math.random().toString(36).substr(2, 8).toUpperCase(),
      estado: 'inscripcion',
      participantes: [],
      premios: {
        primero: { monedas: Math.floor(maxParticipantes * inscripcion * 0.5) },
        segundo: { monedas: Math.floor(maxParticipantes * inscripcion * 0.3) },
        tercero: { monedas: Math.floor(maxParticipantes * inscripcion * 0.1) }
      }
    };

    res.json({
      exito: true,
      torneo,
      mensaje: `¡Torneo "${nombre}" creado! Comparte el código: ${torneo.codigoInvitacion}`,
      codigoInvitacion: torneo.codigoInvitacion
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /torneos/:id/inscribir - Inscribirse a un torneo
router.post('/:id/inscribir', async (req, res) => {
  const { id } = req.params;
  const { jugadorId, equipo } = req.body;

  res.json({
    exito: true,
    mensaje: '¡Inscripción exitosa! Prepárate para el torneo.',
    torneo: id,
    posicion: Math.floor(Math.random() * 10) + 1
  });
});

module.exports = router;
