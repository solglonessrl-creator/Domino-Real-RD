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

// Lobbies pre-partida: { roomId: { jugadores: [], listos: Set, modo, hostSocketId } }
const lobbies = new Map();

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
          creadaEn:        Date.now(),
          chatHabilitado:  false,          // Solo activo durante el barajado entre manos
          jugadoresPausados: new Set(),    // Anti-trampa: quién salió de la app
          timerPausas:     new Map()       // Timers de abandono por jugador
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

      // ── ANTI-TRAMPA: chat solo durante barajado ──────────────
      if (!sala.chatHabilitado) {
        socket.emit('chat_error', {
          error: '🎲 El chat se habilita mientras se barajan las fichas entre manos'
        });
        return;
      }

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

    // ════════════════════════════════════════════════════════════
    // ── LOBBY PRE-PARTIDA ─────────────────────────────────────
    // Antes de iniciar el juego los 4 jugadores se reúnen aquí,
    // pueden cambiar de equipo y marcar "Listo"
    // ════════════════════════════════════════════════════════════

    // Cliente: lobby_join { roomId, jugador, modo }
    socket.on('lobby_join', ({ roomId, jugador, modo = 'online' }) => {
      socket.join(`lobby_${roomId}`);

      if (!lobbies.has(roomId)) {
        lobbies.set(roomId, {
          jugadores:    [],   // [{ socketId, id, nombre, pais, elo, liga, avatar, posicion, listo }]
          listos:       new Set(),
          modo,
          hostSocketId: socket.id,
          creadoEn:     Date.now()
        });
      }

      const lobby = lobbies.get(roomId);

      // Evitar duplicados
      if (lobby.jugadores.some(j => j.socketId === socket.id)) {
        socket.emit('lobby_state', lobbyPublico(lobby));
        return;
      }

      // Posición libre: 0,1,2,3 → equipos: 0+2 Azul, 1+3 Rojo
      const posicionesUsadas = lobby.jugadores.map(j => j.posicion);
      const posicionLibre = [0, 1, 2, 3].find(p => !posicionesUsadas.includes(p)) ?? lobby.jugadores.length;

      lobby.jugadores.push({
        socketId: socket.id,
        id:       jugador.id,
        nombre:   jugador.nombre || 'Jugador',
        pais:     jugador.pais   || 'RD',
        elo:      jugador.elo    || 1200,
        liga:     jugador.liga   || 'Bronce',
        avatar:   jugador.avatar || 'avatar_default',
        posicion: posicionLibre,
        listo:    false
      });

      io.to(`lobby_${roomId}`).emit('lobby_state', lobbyPublico(lobby));

      // Limpiar lobby vacío después de 10 min si no inicia
      setTimeout(() => {
        if (lobbies.has(roomId) && lobbies.get(roomId).jugadores.length === 0) {
          lobbies.delete(roomId);
        }
      }, 10 * 60 * 1000);
    });

    // Cliente: lobby_switch { roomId, posicion } — cambiar de posición/equipo
    socket.on('lobby_switch', ({ roomId, posicion }) => {
      const lobby = lobbies.get(roomId);
      if (!lobby) return;

      const yo = lobby.jugadores.find(j => j.socketId === socket.id);
      if (!yo) return;

      // Verificar que la posición esté libre
      const ocupada = lobby.jugadores.some(j => j.posicion === posicion && j.socketId !== socket.id);
      if (ocupada) {
        socket.emit('lobby_error', { error: 'Esa posición está ocupada' });
        return;
      }

      yo.posicion = posicion;
      yo.listo    = false; // reset listo al cambiar
      lobby.listos.delete(socket.id);

      io.to(`lobby_${roomId}`).emit('lobby_state', lobbyPublico(lobby));
    });

    // Cliente: lobby_ready { roomId } — marcar listo / desmarcar
    socket.on('lobby_ready', ({ roomId }) => {
      const lobby = lobbies.get(roomId);
      if (!lobby) return;

      const yo = lobby.jugadores.find(j => j.socketId === socket.id);
      if (!yo) return;

      yo.listo = !yo.listo;
      if (yo.listo) lobby.listos.add(socket.id);
      else          lobby.listos.delete(socket.id);

      io.to(`lobby_${roomId}`).emit('lobby_state', lobbyPublico(lobby));

      // ¿Todos listos y hay 4?
      const maxJugadores = lobby.modo === 'vs_ia' || lobby.modo === 'practica' ? 1 : 4;
      if (lobby.jugadores.length === maxJugadores &&
          lobby.jugadores.every(j => j.listo)) {
        // Cuenta regresiva de 3 segundos y arranca
        let cuenta = 3;
        io.to(`lobby_${roomId}`).emit('lobby_countdown', { segundos: cuenta });

        const intervalo = setInterval(() => {
          cuenta--;
          if (cuenta > 0) {
            io.to(`lobby_${roomId}`).emit('lobby_countdown', { segundos: cuenta });
          } else {
            clearInterval(intervalo);
            io.to(`lobby_${roomId}`).emit('lobby_start', {
              roomId,
              jugadores: lobby.jugadores.sort((a, b) => a.posicion - b.posicion),
              modo:      lobby.modo
            });
            lobbies.delete(roomId);
          }
        }, 1000);
      }
    });

    // Cliente: lobby_cancel { roomId } — salir del lobby
    socket.on('lobby_cancel', ({ roomId }) => {
      const lobby = lobbies.get(roomId);
      if (!lobby) return;

      lobby.jugadores   = lobby.jugadores.filter(j => j.socketId !== socket.id);
      lobby.listos.delete(socket.id);
      socket.leave(`lobby_${roomId}`);

      if (lobby.jugadores.length === 0) {
        lobbies.delete(roomId);
      } else {
        // Si era el host, transferir
        if (lobby.hostSocketId === socket.id) {
          lobby.hostSocketId = lobby.jugadores[0]?.socketId;
        }
        io.to(`lobby_${roomId}`).emit('lobby_state', lobbyPublico(lobby));
        io.to(`lobby_${roomId}`).emit('lobby_player_left', { nombre: 'Un jugador' });
      }
    });

    // ════════════════════════════════════════════════════════════
    // ── ANTI-TRAMPA: Detección de salida de la app ────────────
    // El cliente emite este evento cuando AppState cambia a 'background'
    // ════════════════════════════════════════════════════════════

    socket.on('app_background', ({ roomId }) => {
      const sala = salas.get(roomId);
      if (!sala || !sala.estado || sala.estado.estado !== 'jugando') return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!jugadorInfo) return;

      // Marcar como pausado
      sala.jugadoresPausados.add(socket.id);

      // Avisar a todos: este jugador salió (posible trampa)
      io.to(roomId).emit('juego_pausa', {
        jugadorNombre: jugadorInfo.nombre,
        jugadorId:     jugadorInfo.posicion,
        motivo:        'SALIO_APP',
        mensaje:       `⚠️ ${jugadorInfo.nombre} salió de la app — Juego pausado`
      });

      // 60 segundos para volver, si no = abandono
      const timer = setTimeout(() => {
        if (sala.jugadoresPausados.has(socket.id)) {
          io.to(roomId).emit('game_abandoned', {
            mensaje:   `${jugadorInfo.nombre} abandonó la partida (salió de la app).`,
            jugadorId: jugadorInfo.posicion
          });
          // Limpiar sala después de 30 segundos adicionales
          setTimeout(() => salas.delete(roomId), 30000);
        }
      }, 60000);

      sala.timerPausas.set(socket.id, timer);
    });

    socket.on('app_foreground', ({ roomId }) => {
      const sala = salas.get(roomId);
      if (!sala) return;

      const jugadorInfo = sala.jugadores[socket.id];
      if (!jugadorInfo) return;

      // Cancelar timer de abandono
      const timer = sala.timerPausas.get(socket.id);
      if (timer) {
        clearTimeout(timer);
        sala.timerPausas.delete(socket.id);
      }

      sala.jugadoresPausados.delete(socket.id);

      // Avisar a todos: el jugador volvió
      io.to(roomId).emit('juego_reanudar', {
        jugadorNombre: jugadorInfo.nombre,
        jugadorId:     jugadorInfo.posicion,
        mensaje:       `✅ ${jugadorInfo.nombre} volvió al juego`
      });
    });

    // ════════════════════════════════════════════════════════════
    // ── VOTOS POR TRAMPA ──────────────────────────────────────
    // Si 3 de 4 jugadores votan trampa → sanción automática
    // Uso: presionar largo sobre un jugador → votar
    // ════════════════════════════════════════════════════════════

    socket.on('voto_trampa', ({ roomId, acusadoId }) => {
      const sala = salas.get(roomId);
      if (!sala || !sala.estado) return;

      const votante = sala.jugadores[socket.id];
      if (!votante) return;

      // No se puede votar contra sí mismo
      if (votante.posicion === acusadoId) {
        socket.emit('voto_trampa_error', { error: 'No puedes votarte a ti mismo' });
        return;
      }

      // Inicializar registro de votos si no existe
      if (!sala.votosTrampa) sala.votosTrampa = {};
      if (!sala.votosTrampa[acusadoId]) sala.votosTrampa[acusadoId] = new Set();

      // Registrar voto (un jugador = un voto por acusado)
      sala.votosTrampa[acusadoId].add(votante.posicion);
      const totalVotos = sala.votosTrampa[acusadoId].size;

      // Encontrar nombre del acusado
      const acusadoInfo = Object.values(sala.jugadores).find(j => j.posicion === acusadoId);

      // Avisar a todos cuántos votos lleva el acusado
      io.to(roomId).emit('votos_trampa_update', {
        acusadoId,
        acusadoNombre: acusadoInfo?.nombre || 'Jugador',
        totalVotos,
        votantesIds: [...sala.votosTrampa[acusadoId]]
      });

      // ¿3 de 4 votan trampa? → sanción automática
      if (totalVotos >= 3) {
        const equipoAcusado = acusadoId % 2; // 0=azul, 1=rojo
        const equipoGanador = equipoAcusado === 0 ? 1 : 0;

        io.to(roomId).emit('trampa_confirmada', {
          acusadoId,
          acusadoNombre:    acusadoInfo?.nombre || 'Jugador',
          equipoGanador,
          mensaje:          `🚫 ¡TRAMPA DETECTADA! ${acusadoInfo?.nombre || 'Un jugador'} fue sancionado por consenso de los jugadores. El partido fue otorgado al equipo contrario.`,
          penalizacion:     'ELO -50 + Suspensión 24h en torneos'
        });

        // Limpiar sala después de 15 segundos
        setTimeout(() => salas.delete(roomId), 15000);

        // TODO: Registrar sanción en la base de datos
        // db.query('UPDATE jugadores SET suspension_hasta = NOW() + INTERVAL 24 hours ...')
      }
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
    // ── BARAJANDO: Habilitar chat por 8 segundos entre manos ─
    sala.chatHabilitado = true;
    sala.chatHistorial  = []; // limpiar historial anterior
    io.to(roomId).emit('chat_estado', {
      habilitado: true,
      duracion:   8000,
      mensaje:    '🎲 ¡Barajando las fichas! Pueden chachear estos segundos 💬'
    });

    // Después de 5s: nueva mano. Después de 8s: cerrar chat.
    setTimeout(() => {
      if (salas.has(roomId)) {
        const nuevaRonda = (sala.estado.ronda || 1) + 1;
        sala.estado        = engine.iniciarPartida(Object.values(sala.jugadores).filter(j => !j.esBot));
        sala.estado.ronda  = nuevaRonda;

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

    // Cerrar chat cuando termina el barajado
    setTimeout(() => {
      if (salas.has(roomId)) {
        sala.chatHabilitado = false;
        io.to(roomId).emit('chat_estado', { habilitado: false });
      }
    }, 8000);
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

function lobbyPublico(lobby) {
  return {
    jugadores: lobby.jugadores.map(j => ({
      id:       j.id,
      nombre:   j.nombre,
      pais:     j.pais,
      elo:      j.elo,
      liga:     j.liga,
      avatar:   j.avatar,
      posicion: j.posicion,
      listo:    j.listo,
      equipo:   j.posicion % 2 === 0 ? 'azul' : 'rojo'
    })),
    totalListos:  lobby.listos.size,
    total:        lobby.jugadores.length,
    modo:         lobby.modo
  };
}

module.exports = { initGameSocket };
