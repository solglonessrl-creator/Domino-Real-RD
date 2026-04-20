/**
 * Domino Real RD - WebSocket Handler
 * Maneja toda la comunicación en tiempo real del juego
 *
 * Eventos del cliente → servidor:
 * - join_room: Unirse a una sala
 * - play_tile: Colocar una ficha
 * - pass_turn: Pasar el turno
 * - request_hint: Pedir consejo al árbitro
 * - send_reaction: Enviar emoji/reacción
 * - chat_message: Mensaje de chat
 *
 * Eventos del servidor → cliente:
 * - game_state: Estado actualizado del juego
 * - player_joined: Jugador se unió
 * - play_result: Resultado de una jugada
 * - game_over: Partida terminada
 * - arbitro_narration: Narración del árbitro
 * - chat: Mensaje de chat
 * - reaction: Reacción de un jugador
 * - alert: Alerta del árbitro
 */

const DominoEngine = require('../game/DominoEngine');
const DominoAI = require('../ai/DominoAI');
const Arbitro = require('../ai/Arbitro');

const engine = new DominoEngine();
const arbitro = new Arbitro();

// Salas activas: { roomId: { estado, jugadores, ai, timers } }
const salas = new Map();

// Cola de matchmaking
const colaMatchmaking = [];

function initGameSocket(io) {

  io.on('connection', (socket) => {
    console.log(`[Socket] Jugador conectado: ${socket.id}`);

    // ── JOIN ROOM ─────────────────────────────────────────────
    socket.on('join_room', ({ roomId, jugador, modo = 'online' }) => {
      socket.join(roomId);

      if (!salas.has(roomId)) {
        salas.set(roomId, {
          jugadores: {},
          estado: null,
          modo,
          ai: null,
          createdAt: Date.now()
        });
      }

      const sala = salas.get(roomId);
      const posicion = Object.keys(sala.jugadores).length;

      if (posicion >= 4) {
        socket.emit('error', { mensaje: 'La sala está llena' });
        return;
      }

      sala.jugadores[socket.id] = {
        ...jugador,
        socketId: socket.id,
        posicion,
        conectado: true
      };

      io.to(roomId).emit('player_joined', {
        jugador: { ...jugador, posicion },
        totalJugadores: Object.keys(sala.jugadores).length
      });

      // Iniciar si están los 4 jugadores (o 1 para vs IA)
      const jugadoresConectados = Object.keys(sala.jugadores).length;

      if (modo === 'vs_ia' && jugadoresConectados === 1) {
        iniciarPartidaConIA(io, roomId, sala);
      } else if (modo === 'online' && jugadoresConectados === 4) {
        iniciarPartida(io, roomId, sala);
      } else if (modo === 'practica' && jugadoresConectados === 1) {
        iniciarPartidaConIA(io, roomId, sala, 'dificil');
      }

      // Notificar cuántos faltan
      if (jugadoresConectados < 4 && modo === 'online') {
        io.to(roomId).emit('waiting_players', {
          faltan: 4 - jugadoresConectados,
          mensaje: `Esperando ${4 - jugadoresConectados} jugador(es) más...`
        });
      }
    });

    // ── PLAY TILE ─────────────────────────────────────────────
    socket.on('play_tile', ({ roomId, fichaId, lado }) => {
      const sala = salas.get(roomId);
      if (!sala || !sala.estado) return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!jugadorInfo) return;

      const jugadorId = jugadorInfo.posicion;
      const ficha = encontrarFicha(sala.estado, jugadorId, fichaId);

      if (!ficha) {
        socket.emit('play_result', {
          exito: false,
          error: 'Ficha no encontrada',
          explicacion: arbitro.explicarJugadaInvalida('NO_TIENE_FICHA')
        });
        return;
      }

      const resultado = engine.ejecutarJugada(sala.estado, jugadorId, ficha, lado);

      if (!resultado.exito) {
        const explicacion = arbitro.explicarJugadaInvalida(resultado.codigo, {
          ficha: fichaId,
          extremoIzq: sala.estado.extremoIzquierdo,
          extremoDer: sala.estado.extremoDerecho
        });

        socket.emit('play_result', {
          exito: false,
          error: resultado.error,
          explicacion
        });
        return;
      }

      sala.estado = resultado.estado;

      // Narración del árbitro
      const esDomino = sala.estado.estado === 'terminada' && sala.estado.resultado?.razon !== 'tranque';
      const esCapicua = sala.estado.resultado?.capicua;
      const narracion = arbitro.narrarJugada(
        { ...resultado.jugada, jugadorId, capicua: esCapicua, esDomino },
        sala.estado,
        Object.values(sala.jugadores)
      );

      // Alertas del árbitro
      const alertas = arbitro.verificarAlertas(sala.estado);

      // Enviar estado a todos
      io.to(roomId).emit('game_state', {
        estado: estadoPublico(sala.estado),
        ultimaJugada: { jugadorId, ficha: fichaId, lado },
        narracion,
        alertas
      });

      // Si el juego terminó
      if (sala.estado.estado === 'terminada') {
        procesarFinRonda(io, roomId, sala);
      } else if (sala.modo === 'vs_ia' || sala.modo === 'practica') {
        // Turno de la IA
        const turnoActual = sala.estado.turno;
        if (sala.bots && sala.bots[turnoActual]) {
          setTimeout(() => ejecutarTurnoIA(io, roomId, sala, turnoActual), 1200);
        }
      }
    });

    // ── PASS TURN ─────────────────────────────────────────────
    socket.on('pass_turn', ({ roomId }) => {
      const sala = salas.get(roomId);
      if (!sala || !sala.estado) return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!jugadorInfo) return;

      const jugadorId = jugadorInfo.posicion;
      const resultado = engine.pasarTurno(sala.estado, jugadorId);

      if (!resultado.exito) {
        socket.emit('play_result', {
          exito: false,
          error: resultado.error,
          explicacion: arbitro.explicarJugadaInvalida('PUEDE_JUGAR')
        });
        return;
      }

      sala.estado = resultado.estado;

      const narracion = arbitro.narrarJugada(
        { tipo: 'paso', jugadorId },
        sala.estado,
        Object.values(sala.jugadores)
      );

      io.to(roomId).emit('game_state', {
        estado: estadoPublico(sala.estado),
        narracion,
        alertas: arbitro.verificarAlertas(sala.estado)
      });

      if (sala.estado.estado === 'terminada') {
        procesarFinRonda(io, roomId, sala);
      }
    });

    // ── REQUEST HINT ──────────────────────────────────────────
    socket.on('request_hint', ({ roomId }) => {
      const sala = salas.get(roomId);
      if (!sala || !sala.estado) return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!jugadorInfo) return;

      const jugadorId = jugadorInfo.posicion;
      const jugadasValidas = engine.obtenerJugadasValidas(sala.estado, jugadorId);
      const consejo = arbitro.darConsejo(sala.estado, jugadorId, jugadasValidas);

      socket.emit('hint', consejo);
    });

    // ── CHAT MESSAGE ──────────────────────────────────────────
    socket.on('chat_message', ({ roomId, mensaje }) => {
      const sala = salas.get(roomId);
      if (!sala) return;

      const jugadorInfo = sala.jugadores[socket.id];
      // Sanitizar mensaje
      const mensajeLimpio = mensaje.toString().slice(0, 200).replace(/<[^>]*>/g, '');

      io.to(roomId).emit('chat', {
        jugadorId: jugadorInfo?.posicion,
        nombre: jugadorInfo?.nombre || 'Anónimo',
        mensaje: mensajeLimpio,
        timestamp: Date.now()
      });
    });

    // ── REACTION ──────────────────────────────────────────────
    socket.on('send_reaction', ({ roomId, emoji }) => {
      const sala = salas.get(roomId);
      if (!sala) return;

      const jugadorInfo = sala.jugadores[socket.id];
      const emojisPermitidos = ['👏', '😂', '😤', '🎉', '🔥', '💪', '😎', '🤝', '👍', '😱'];

      if (!emojisPermitidos.includes(emoji)) return;

      io.to(roomId).emit('reaction', {
        jugadorId: jugadorInfo?.posicion,
        nombre: jugadorInfo?.nombre,
        emoji,
        timestamp: Date.now()
      });
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Jugador desconectado: ${socket.id}`);

      for (const [roomId, sala] of salas.entries()) {
        if (sala.jugadores[socket.id]) {
          sala.jugadores[socket.id].conectado = false;

          io.to(roomId).emit('player_disconnected', {
            jugadorId: sala.jugadores[socket.id].posicion,
            nombre: sala.jugadores[socket.id].nombre
          });

          // Dar 60 segundos para reconectarse
          setTimeout(() => {
            if (!sala.jugadores[socket.id]?.conectado) {
              // Si no se reconectó, terminar partida o reemplazar con bot
              io.to(roomId).emit('game_abandoned', {
                mensaje: 'Un jugador abandonó la partida.',
                jugadorId: sala.jugadores[socket.id]?.posicion
              });
            }
          }, 60000);
          break;
        }
      }
    });
  });
}

// ── FUNCIONES AUXILIARES ──────────────────────────────────────

function iniciarPartida(io, roomId, sala) {
  const jugadoresArray = Object.values(sala.jugadores);
  sala.estado = engine.iniciarPartida(jugadoresArray);
  sala.puntosTotales = { equipo0: 0, equipo1: 0 };

  io.to(roomId).emit('game_start', {
    estado: estadoPublico(sala.estado),
    mensaje: '¡El dominó empieza! ¡A jugar!'
  });

  // Narracion de inicio
  io.to(roomId).emit('arbitro_narration', {
    texto: `¡Que empiece el juego! Hoy se juega dominó dominicano. Los equipos: Equipo Azul (Jugadores 1 y 3) vs Equipo Rojo (Jugadores 2 y 4). ¡Primer equipo en llegar a 200 puntos gana! ¡Dale!`,
    narrador: 'Don Fello'
  });
}

function iniciarPartidaConIA(io, roomId, sala, dificultadIA = 'medio') {
  // Crear jugadores bot para las posiciones vacías
  sala.bots = {};
  const posicionHumano = 0;

  for (let i = 1; i < 4; i++) {
    sala.bots[i] = new DominoAI(dificultadIA);
    sala.jugadores[`bot_${i}`] = {
      nombre: `Bot ${i} (${dificultadIA})`,
      posicion: i,
      esBot: true,
      socketId: `bot_${i}`
    };
  }

  const jugadoresArray = Object.values(sala.jugadores);
  sala.estado = engine.iniciarPartida(jugadoresArray);
  sala.puntosTotales = { equipo0: 0, equipo1: 0 };

  io.to(roomId).emit('game_start', {
    estado: estadoPublico(sala.estado),
    mensaje: `¡Partida contra IA (${dificultadIA})! ¡Demuestra de qué estás hecho!`
  });

  // Si el bot sale primero
  if (sala.estado.turno !== posicionHumano) {
    setTimeout(() => ejecutarTurnoIA(io, roomId, sala, sala.estado.turno), 1500);
  }
}

function ejecutarTurnoIA(io, roomId, sala, jugadorId) {
  if (!sala.estado || sala.estado.estado !== 'jugando') return;
  if (sala.estado.turno !== jugadorId) return;

  const bot = sala.bots[jugadorId];
  if (!bot) return;

  const jugadasValidas = engine.obtenerJugadasValidas(sala.estado, jugadorId);
  const decision = bot.decidirJugada(sala.estado, jugadorId, jugadasValidas);

  let resultado;
  if (!decision) {
    // El bot pasa
    resultado = engine.pasarTurno(sala.estado, jugadorId);
    sala.estado = resultado.estado;

    const narracion = arbitro.narrarJugada(
      { tipo: 'paso', jugadorId },
      sala.estado,
      Object.values(sala.jugadores)
    );

    io.to(roomId).emit('game_state', {
      estado: estadoPublico(sala.estado),
      narracion,
      alertas: arbitro.verificarAlertas(sala.estado)
    });
  } else {
    resultado = engine.ejecutarJugada(sala.estado, jugadorId, decision.ficha, decision.lado);
    if (resultado.exito) {
      sala.estado = resultado.estado;

      const esDomino = sala.estado.estado === 'terminada';
      const esCapicua = sala.estado.resultado?.capicua;

      const narracion = arbitro.narrarJugada(
        { ...resultado.jugada, jugadorId, capicua: esCapicua, esDomino },
        sala.estado,
        Object.values(sala.jugadores)
      );

      // Comentario de la IA
      const comentarioIA = bot.generarComentario(decision, { capicua: esCapicua, esDomino });

      io.to(roomId).emit('game_state', {
        estado: estadoPublico(sala.estado),
        narracion,
        alertas: arbitro.verificarAlertas(sala.estado),
        comentarioBot: { jugadorId, texto: comentarioIA }
      });
    }
  }

  if (sala.estado.estado === 'terminada') {
    procesarFinRonda(io, roomId, sala);
    return;
  }

  // Continuar con siguientes bots
  const siguienteTurno = sala.estado.turno;
  if (sala.bots && sala.bots[siguienteTurno]) {
    setTimeout(() => ejecutarTurnoIA(io, roomId, sala, siguienteTurno), 1200);
  }
}

function procesarFinRonda(io, roomId, sala) {
  const resultado = sala.estado.resultado;
  if (!resultado) return;

  // Acumular puntos del match
  if (resultado.equipoGanador !== null) {
    const equipoKey = `equipo${resultado.equipoGanador}`;
    sala.puntosTotales[equipoKey] = (sala.puntosTotales[equipoKey] || 0) + resultado.puntos.total;
  }

  // Verificar si alguien llegó a 200
  const finMatch = engine.verificarFinMatch(
    Object.entries(sala.puntosTotales).reduce((acc, [key, pts]) => {
      acc[key] = { puntos: pts };
      return acc;
    }, {})
  );

  io.to(roomId).emit('round_over', {
    resultado,
    puntosTotales: sala.puntosTotales,
    finMatch,
    narracion: arbitro.narrarJugada(
      { tipo: resultado.capicua ? 'capicua' : 'domino', jugadorId: resultado.jugadorQueGano, capicua: resultado.capicua, esDomino: !resultado.capicua },
      sala.estado,
      Object.values(sala.jugadores)
    )
  });

  if (finMatch.terminado) {
    io.to(roomId).emit('game_over', {
      campeon: finMatch.equipoCampeon,
      puntosTotales: sala.puntosTotales,
      mensaje: `¡El ${finMatch.equipoCampeon === 'equipo0' ? 'Equipo Azul' : 'Equipo Rojo'} gana con ${finMatch.puntos} puntos! ¡Dominó Real RD!`
    });
    salas.delete(roomId);
  } else {
    // Nueva ronda automáticamente tras 5 segundos
    setTimeout(() => {
      if (salas.has(roomId)) {
        sala.estado = engine.iniciarPartida(Object.values(sala.jugadores).filter(j => !j.esBot));
        sala.estado.ronda = (sala.estado.ronda || 1) + 1;

        io.to(roomId).emit('new_round', {
          estado: estadoPublico(sala.estado),
          ronda: sala.estado.ronda,
          puntosTotales: sala.puntosTotales
        });

        // Si el primer turno es de un bot
        if (sala.bots && sala.bots[sala.estado.turno]) {
          setTimeout(() => ejecutarTurnoIA(io, roomId, sala, sala.estado.turno), 1500);
        }
      }
    }, 5000);
  }
}

/**
 * Estado público: oculta las manos de los otros jugadores
 */
function estadoPublico(estado) {
  return {
    id: estado.id,
    estadoJuego: estado.estado,
    turno: estado.turno,
    mesa: estado.mesa,
    extremoIzquierdo: estado.extremoIzquierdo,
    extremoDerecho: estado.extremoDerecho,
    equipos: estado.equipos,
    historial: estado.historial.slice(-20), // Solo últimas 20 jugadas
    cantidadFichasPorJugador: {
      0: estado.manos.jugador0?.length,
      1: estado.manos.jugador1?.length,
      2: estado.manos.jugador2?.length,
      3: estado.manos.jugador3?.length
    },
    pasadas: estado.pasadas,
    ultimaJugada: estado.ultimaJugada,
    resultado: estado.resultado
    // NOTA: las manos privadas se envían individualmente a cada jugador
  };
}

function encontrarFicha(estado, jugadorId, fichaId) {
  const mano = estado.manos[`jugador${jugadorId}`];
  return mano?.find(f => f.id === fichaId) || null;
}

module.exports = { initGameSocket };
