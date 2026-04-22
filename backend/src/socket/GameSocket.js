/**
 * Domino Real RD - WebSocket Handler COMPLETO
 * Juego en tiempo real + Chat con imágenes + DMs entre amigos
 */

const DominoEngine = require('../game/DominoEngine');
const DominoAI    = require('../ai/DominoAI');
const Arbitro     = require('../ai/Arbitro');
const jwt         = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'DOMINO_REAL_RD_secret_2024';

const engine  = new DominoEngine();
const arbitro = new Arbitro();

// Salas activas de juego
const salas = new Map();

// Historial de chats DM (ephemeral 30 min)
// clave: "id1_dm_id2" (ordenados), valor: array de mensajes
const dmHistorial = new Map();

// TTL de mensajes: 30 minutos
const CHAT_TTL = 30 * 60 * 1000;

// Limpiar DMs viejos cada 10 minutos
setInterval(() => {
  const limite = Date.now() - CHAT_TTL;
  for (const [key, msgs] of dmHistorial.entries()) {
    const filtrados = msgs.filter(m => m.timestamp > limite);
    if (filtrados.length === 0) dmHistorial.delete(key);
    else dmHistorial.set(key, filtrados);
  }
}, 10 * 60 * 1000);

function initGameSocket(io) {

  // ── AUTENTICACIÓN JWT EN SOCKET ───────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket._jugador = decoded; // { id, nombre, esInvitado }
      } catch (e) {
        // Token inválido — se permite conexión pero sin _jugador (invitado sin auth)
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const jugadorAuth = socket._jugador;
    console.log(`[Socket] Conectado: ${socket.id} — ${jugadorAuth?.nombre || 'Invitado'}`);

    // ── JOIN ROOM ─────────────────────────────────────────────
    socket.on('join_room', ({ roomId, jugador, modo = 'online' }) => {
      socket.join(roomId);

      if (!salas.has(roomId)) {
        salas.set(roomId, {
          jugadores: {},
          estado: null,
          modo,
          ai: null,
          chatHistorial: [],
          creadaEn: Date.now()
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

      // Enviar historial de chat al que se une tarde
      if (sala.chatHistorial.length > 0) {
        const limite = Date.now() - CHAT_TTL;
        const recientes = sala.chatHistorial.filter(m => m.timestamp > limite);
        if (recientes.length > 0) socket.emit('chat_historial', recientes);
      }

      const jugadoresConectados = Object.keys(sala.jugadores).length;

      if (modo === 'vs_ia' && jugadoresConectados === 1) {
        iniciarPartidaConIA(io, roomId, sala);
      } else if (modo === 'online' && jugadoresConectados === 4) {
        iniciarPartida(io, roomId, sala);
      } else if (modo === 'practica' && jugadoresConectados === 1) {
        iniciarPartidaConIA(io, roomId, sala, 'dificil');
      }

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
        socket.emit('play_result', {
          exito: false,
          error: resultado.error,
          explicacion: arbitro.explicarJugadaInvalida(resultado.codigo, {
            ficha: fichaId,
            extremoIzq: sala.estado.extremoIzquierdo,
            extremoDer: sala.estado.extremoDerecho
          })
        });
        return;
      }

      sala.estado = resultado.estado;

      const esDomino  = sala.estado.estado === 'terminada' && sala.estado.resultado?.razon !== 'tranque';
      const esCapicua = sala.estado.resultado?.capicua;
      const narracion = arbitro.narrarJugada(
        { ...resultado.jugada, jugadorId, capicua: esCapicua, esDomino },
        sala.estado,
        Object.values(sala.jugadores)
      );

      const alertas = arbitro.verificarAlertas(sala.estado);

      io.to(roomId).emit('game_state', {
        estado: estadoPublico(sala.estado),
        ultimaJugada: { jugadorId, ficha: fichaId, lado },
        narracion,
        alertas
      });

      if (sala.estado.estado === 'terminada') {
        procesarFinRonda(io, roomId, sala);
      } else if (sala.modo === 'vs_ia' || sala.modo === 'practica') {
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

      const jugadorId   = jugadorInfo.posicion;
      const jugadasValidas = engine.obtenerJugadasValidas(sala.estado, jugadorId);
      const consejo     = arbitro.darConsejo(sala.estado, jugadorId, jugadasValidas);

      socket.emit('hint', consejo);
    });

    // ── CHAT EN SALA DE JUEGO ─────────────────────────────────
    // Soporta: texto con cualquier emoji Unicode, imágenes base64, GIFs
    socket.on('chat_message', ({ roomId, mensaje, tipo = 'texto', imagen }) => {
      const sala = salas.get(roomId);
      if (!sala) return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!jugadorInfo) return;

      // Rate limiting: 1 mensaje por segundo por socket
      const ahora = Date.now();
      if (socket._ultimoChat && (ahora - socket._ultimoChat) < 1000) return;
      socket._ultimoChat = ahora;

      // Verificar ventana de 30 minutos desde la creación de la sala
      if (ahora - sala.creadaEn > CHAT_TTL + (10 * 60 * 1000)) {
        socket.emit('chat_error', { error: 'El chat de esta sala ha expirado' });
        return;
      }

      let msg;

      if (tipo === 'imagen') {
        // Validar imagen base64 (máx ~400KB)
        if (!imagen || typeof imagen !== 'string' || imagen.length > 560000) {
          socket.emit('chat_error', { error: 'Imagen demasiado grande. Máximo 400KB.' });
          return;
        }
        // Debe ser data URI válido
        if (!imagen.startsWith('data:image/')) {
          socket.emit('chat_error', { error: 'Formato de imagen inválido' });
          return;
        }
        msg = { tipo: 'imagen', imagen };
      } else {
        // Texto: permite cualquier carácter Unicode (emojis incluidos)
        const mensajeLimpio = String(mensaje || '').slice(0, 300).replace(/<[^>]*>/g, '').trim();
        if (!mensajeLimpio) return;
        msg = { tipo: 'texto', mensaje: mensajeLimpio };
      }

      const payload = {
        jugadorId: jugadorInfo.posicion,
        nombre:    jugadorInfo.nombre || 'Anónimo',
        avatar:    jugadorInfo.avatar || 'avatar_default',
        ...msg,
        timestamp: ahora
      };

      io.to(roomId).emit('chat', payload);

      // Guardar en historial (máx 100 msgs)
      sala.chatHistorial.push(payload);
      if (sala.chatHistorial.length > 100) sala.chatHistorial.shift();
    });

    // ── REACTION (cualquier emoji) ────────────────────────────
    socket.on('send_reaction', ({ roomId, emoji }) => {
      const sala = salas.get(roomId);
      if (!sala) return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return;

      io.to(roomId).emit('reaction', {
        jugadorId: jugadorInfo?.posicion,
        nombre:    jugadorInfo?.nombre,
        emoji,
        timestamp: Date.now()
      });
    });

    // ── DM: UNIRSE A SALA PRIVADA ────────────────────────────
    socket.on('dm_join', ({ amigoId }) => {
      const miId = jugadorAuth?.id || socket.id;
      const dmRoom = [miId, amigoId].sort().join('_dm_');
      socket.join(dmRoom);

      // Enviar historial de los últimos 30 minutos
      const limite = Date.now() - CHAT_TTL;
      const hist = (dmHistorial.get(dmRoom) || []).filter(m => m.timestamp > limite);
      socket.emit('dm_historial', hist);
    });

    // ── DM: ENVIAR MENSAJE ────────────────────────────────────
    socket.on('dm_message', ({ amigoId, mensaje, tipo = 'texto', imagen }) => {
      const miId    = jugadorAuth?.id || socket.id;
      const miNombre = jugadorAuth?.nombre || 'Jugador';
      const dmRoom  = [miId, amigoId].sort().join('_dm_');

      // Rate limiting
      const ahora = Date.now();
      if (socket._ultimoDM && (ahora - socket._ultimoDM) < 800) return;
      socket._ultimoDM = ahora;

      let contenido;

      if (tipo === 'imagen') {
        if (!imagen || typeof imagen !== 'string' || imagen.length > 560000) {
          socket.emit('chat_error', { error: 'Imagen demasiado grande. Máximo 400KB.' });
          return;
        }
        if (!imagen.startsWith('data:image/')) {
          socket.emit('chat_error', { error: 'Formato de imagen inválido' });
          return;
        }
        contenido = { tipo: 'imagen', imagen };
      } else {
        const mensajeLimpio = String(mensaje || '').slice(0, 300).replace(/<[^>]*>/g, '').trim();
        if (!mensajeLimpio) return;
        contenido = { tipo: 'texto', mensaje: mensajeLimpio };
      }

      const msg = {
        de:        miId,
        nombre:    miNombre,
        ...contenido,
        timestamp: ahora
      };

      // Guardar en historial ephemeral
      if (!dmHistorial.has(dmRoom)) dmHistorial.set(dmRoom, []);
      const hist = dmHistorial.get(dmRoom);
      hist.push(msg);
      if (hist.length > 200) hist.shift();

      io.to(dmRoom).emit('dm_message', msg);

      // Notificar que dejó de escribir
      socket.to(dmRoom).emit('dm_typing', { jugadorId: miId, escribiendo: false });
    });

    // ── DM: INDICADOR DE ESCRITURA ────────────────────────────
    socket.on('dm_typing', ({ amigoId, escribiendo }) => {
      const miId   = jugadorAuth?.id || socket.id;
      const dmRoom = [miId, amigoId].sort().join('_dm_');
      socket.to(dmRoom).emit('dm_typing', { jugadorId: miId, escribiendo });
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Desconectado: ${socket.id}`);

      for (const [roomId, sala] of salas.entries()) {
        if (sala.jugadores[socket.id]) {
          sala.jugadores[socket.id].conectado = false;

          io.to(roomId).emit('player_disconnected', {
            jugadorId: sala.jugadores[socket.id].posicion,
            nombre:    sala.jugadores[socket.id].nombre
          });

          // 60 segundos para reconectarse
          setTimeout(() => {
            if (!sala.jugadores[socket.id]?.conectado) {
              io.to(roomId).emit('game_abandoned', {
                mensaje:   'Un jugador abandonó la partida.',
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
    estado:  estadoPublico(sala.estado),
    mensaje: '¡El dominó empieza! ¡A jugar!'
  });

  io.to(roomId).emit('arbitro_narration', {
    texto:    '¡Que empiece el juego! Hoy se juega dominó dominicano. Los equipos: Equipo Azul (Jugadores 1 y 3) vs Equipo Rojo (Jugadores 2 y 4). ¡Primer equipo en llegar a 200 puntos gana! ¡Dale!',
    narrador: 'Don Fello'
  });
}

function iniciarPartidaConIA(io, roomId, sala, dificultadIA = 'medio') {
  sala.bots = {};

  for (let i = 1; i < 4; i++) {
    sala.bots[i] = new DominoAI(dificultadIA);
    sala.jugadores[`bot_${i}`] = {
      nombre:   `Bot ${i} (${dificultadIA})`,
      posicion: i,
      esBot:    true,
      socketId: `bot_${i}`
    };
  }

  const jugadoresArray = Object.values(sala.jugadores);
  sala.estado = engine.iniciarPartida(jugadoresArray);
  sala.puntosTotales = { equipo0: 0, equipo1: 0 };

  io.to(roomId).emit('game_start', {
    estado:  estadoPublico(sala.estado),
    mensaje: `¡Partida contra IA (${dificultadIA})! ¡Demuestra de qué estás hecho!`
  });

  if (sala.estado.turno !== 0) {
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
    resultado = engine.pasarTurno(sala.estado, jugadorId);
    sala.estado = resultado.estado;

    const narracion = arbitro.narrarJugada(
      { tipo: 'paso', jugadorId },
      sala.estado,
      Object.values(sala.jugadores)
    );

    io.to(roomId).emit('game_state', {
      estado:  estadoPublico(sala.estado),
      narracion,
      alertas: arbitro.verificarAlertas(sala.estado)
    });
  } else {
    resultado = engine.ejecutarJugada(sala.estado, jugadorId, decision.ficha, decision.lado);
    if (resultado.exito) {
      sala.estado = resultado.estado;

      const esDomino  = sala.estado.estado === 'terminada';
      const esCapicua = sala.estado.resultado?.capicua;

      const narracion     = arbitro.narrarJugada(
        { ...resultado.jugada, jugadorId, capicua: esCapicua, esDomino },
        sala.estado,
        Object.values(sala.jugadores)
      );
      const comentarioIA  = bot.generarComentario(decision, { capicua: esCapicua, esDomino });

      io.to(roomId).emit('game_state', {
        estado:      estadoPublico(sala.estado),
        narracion,
        alertas:     arbitro.verificarAlertas(sala.estado),
        comentarioBot: { jugadorId, texto: comentarioIA }
      });
    }
  }

  if (sala.estado.estado === 'terminada') {
    procesarFinRonda(io, roomId, sala);
    return;
  }

  const siguienteTurno = sala.estado.turno;
  if (sala.bots && sala.bots[siguienteTurno]) {
    setTimeout(() => ejecutarTurnoIA(io, roomId, sala, siguienteTurno), 1200);
  }
}

function procesarFinRonda(io, roomId, sala) {
  const resultado = sala.estado.resultado;
  if (!resultado) return;

  if (resultado.equipoGanador !== null) {
    const equipoKey = `equipo${resultado.equipoGanador}`;
    sala.puntosTotales[equipoKey] = (sala.puntosTotales[equipoKey] || 0) + resultado.puntos.total;
  }

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
      campeon:       finMatch.equipoCampeon,
      puntosTotales: sala.puntosTotales,
      mensaje:       `¡El ${finMatch.equipoCampeon === 'equipo0' ? 'Equipo Azul' : 'Equipo Rojo'} gana con ${finMatch.puntos} puntos! ¡Dominó Real RD!`
    });
    // NO borrar la sala inmediatamente — dejar 30 min de chat post-partida
    setTimeout(() => salas.delete(roomId), CHAT_TTL);
  } else {
    setTimeout(() => {
      if (salas.has(roomId)) {
        sala.estado        = engine.iniciarPartida(Object.values(sala.jugadores).filter(j => !j.esBot));
        sala.estado.ronda  = (sala.estado.ronda || 1) + 1;

        io.to(roomId).emit('new_round', {
          estado:        estadoPublico(sala.estado),
          ronda:         sala.estado.ronda,
          puntosTotales: sala.puntosTotales
        });

        if (sala.bots && sala.bots[sala.estado.turno]) {
          setTimeout(() => ejecutarTurnoIA(io, roomId, sala, sala.estado.turno), 1500);
        }
      }
    }, 5000);
  }
}

function estadoPublico(estado) {
  return {
    id:                estado.id,
    estadoJuego:       estado.estado,
    turno:             estado.turno,
    mesa:              estado.mesa,
    extremoIzquierdo:  estado.extremoIzquierdo,
    extremoDerecho:    estado.extremoDerecho,
    equipos:           estado.equipos,
    historial:         estado.historial.slice(-20),
    cantidadFichasPorJugador: {
      0: estado.manos.jugador0?.length,
      1: estado.manos.jugador1?.length,
      2: estado.manos.jugador2?.length,
      3: estado.manos.jugador3?.length
    },
    pasadas:           estado.pasadas,
    ultimaJugada:      estado.ultimaJugada,
    resultado:         estado.resultado
  };
}

function encontrarFicha(estado, jugadorId, fichaId) {
  const mano = estado.manos[`jugador${jugadorId}`];
  return mano?.find(f => f.id === fichaId) || null;
}

module.exports = { initGameSocket };
