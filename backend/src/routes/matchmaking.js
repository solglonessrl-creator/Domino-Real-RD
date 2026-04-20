/**
 * Domino Real RD - Matchmaking
 * Emparejamiento automático por ELO
 */

const express = require('express');
const router = express.Router();

// Cola de matchmaking en memoria (en producción usar Redis)
const cola = [];
const MAX_DIFERENCIA_ELO = 200;
const TIMEOUT_MATCHMAKING = 30000; // 30 segundos

// POST /matchmaking/buscar - Buscar partida
router.post('/buscar', async (req, res) => {
  const { jugadorId, elo = 1200, modo = 'rapido' } = req.body;

  // Verificar si ya está en cola
  if (cola.some(j => j.jugadorId === jugadorId)) {
    return res.json({ exito: false, error: 'Ya estás buscando partida' });
  }

  // Buscar equipo compatible por ELO
  const compatibles = cola.filter(j =>
    Math.abs(j.elo - elo) <= MAX_DIFERENCIA_ELO &&
    j.modo === modo &&
    j.jugadorId !== jugadorId
  );

  if (compatibles.length >= 3) {
    // ¡Tenemos 4 jugadores! Crear sala
    const equipo = compatibles.slice(0, 3);
    const roomId = `sala_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Remover de la cola
    equipo.forEach(j => {
      const idx = cola.findIndex(c => c.jugadorId === j.jugadorId);
      if (idx !== -1) cola.splice(idx, 1);
    });

    return res.json({
      exito: true,
      emparejado: true,
      roomId,
      jugadores: [
        { jugadorId, elo, posicion: 0 },
        ...equipo.map((j, i) => ({ ...j, posicion: i + 1 }))
      ],
      mensaje: '¡Partida encontrada! ¡A jugar!'
    });
  }

  // Agregar a la cola
  cola.push({
    jugadorId,
    elo,
    modo,
    timestamp: Date.now()
  });

  // Limpiar cola de jugadores que esperan demasiado
  const ahora = Date.now();
  const cola_limpia = cola.filter(j => ahora - j.timestamp < TIMEOUT_MATCHMAKING);
  cola.length = 0;
  cola.push(...cola_limpia);

  res.json({
    exito: true,
    emparejado: false,
    enCola: true,
    posicionEnCola: cola.length,
    mensaje: `Buscando oponentes... ${compatibles.length}/3 jugadores encontrados`,
    tiempoEspera: 'aprox. 30 segundos'
  });
});

// DELETE /matchmaking/cancelar/:jugadorId - Cancelar búsqueda
router.delete('/cancelar/:jugadorId', (req, res) => {
  const { jugadorId } = req.params;
  const idx = cola.findIndex(j => j.jugadorId === jugadorId);

  if (idx !== -1) {
    cola.splice(idx, 1);
    res.json({ exito: true, mensaje: 'Búsqueda cancelada' });
  } else {
    res.json({ exito: false, error: 'No estás en cola' });
  }
});

// GET /matchmaking/estado/:jugadorId - Estado de la búsqueda
router.get('/estado/:jugadorId', (req, res) => {
  const { jugadorId } = req.params;
  const enCola = cola.some(j => j.jugadorId === jugadorId);

  res.json({
    exito: true,
    enCola,
    jugadoresEnCola: cola.length,
    tiempoEspera: enCola ? `${Math.floor((Date.now() - cola.find(j => j.jugadorId === jugadorId)?.timestamp) / 1000)}s` : null
  });
});

module.exports = router;
