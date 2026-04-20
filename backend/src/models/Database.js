/**
 * Domino Real RD — Capa de Acceso a Base de Datos
 * PostgreSQL con pool de conexiones
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en pool:', err.message);
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool
};

// ── JUGADORES ────────────────────────────────────────────────

const Jugadores = {
  async crear({ nombre, email, passwordHash, pais = 'RD', loginMethod = 'email', socialId }) {
    const res = await db.query(
      `INSERT INTO jugadores (nombre, email, password_hash, pais, login_method, social_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, email, pais, elo, monedas, avatar, mesa, fichas, es_vip`,
      [nombre, email, passwordHash, pais, loginMethod, socialId]
    );
    // Crear estadísticas vacías
    await db.query('INSERT INTO estadisticas (jugador_id) VALUES ($1)', [res.rows[0].id]);
    return res.rows[0];
  },

  async buscarPorEmail(email) {
    const res = await db.query(
      'SELECT * FROM jugadores WHERE email = $1 AND activo = TRUE',
      [email]
    );
    return res.rows[0] || null;
  },

  async buscarPorSocialId(socialId, loginMethod) {
    const res = await db.query(
      'SELECT * FROM jugadores WHERE social_id = $1 AND login_method = $2',
      [socialId, loginMethod]
    );
    return res.rows[0] || null;
  },

  async buscarPorId(id) {
    const res = await db.query(
      `SELECT j.*, e.*
       FROM jugadores j
       LEFT JOIN estadisticas e ON e.jugador_id = j.id
       WHERE j.id = $1 AND j.activo = TRUE`,
      [id]
    );
    return res.rows[0] || null;
  },

  async actualizarELO(jugadorId, nuevoElo) {
    const liga = calcularLiga(nuevoElo);
    await db.query(
      'UPDATE jugadores SET elo = $1, liga = $2 WHERE id = $3',
      [nuevoElo, liga, jugadorId]
    );
  },

  async actualizarMonedas(jugadorId, delta, tipo, descripcion, referencia) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE jugadores SET monedas = monedas + $1 WHERE id = $2',
        [delta, jugadorId]
      );
      await client.query(
        `INSERT INTO transacciones (jugador_id, tipo, monto, descripcion, referencia)
         VALUES ($1, $2, $3, $4, $5)`,
        [jugadorId, tipo, delta, descripcion, referencia]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async actualizarPersonalizacion(jugadorId, { avatar, mesa, fichas }) {
    await db.query(
      `UPDATE jugadores
       SET avatar = COALESCE($1, avatar),
           mesa   = COALESCE($2, mesa),
           fichas = COALESCE($3, fichas)
       WHERE id = $4`,
      [avatar, mesa, fichas, jugadorId]
    );
  },

  async actualizarUltimoLogin(jugadorId) {
    await db.query(
      'UPDATE jugadores SET ultimo_login = NOW() WHERE id = $1',
      [jugadorId]
    );
  }
};

// ── ESTADÍSTICAS ─────────────────────────────────────────────

const Estadisticas = {
  async registrarPartida(jugadorId, { gano, huboCapicua, capicuaHecha, tranqueGanado, puntos, duracion }) {
    await db.query(
      `UPDATE estadisticas SET
        partidas_jugadas   = partidas_jugadas + 1,
        partidas_ganadas   = partidas_ganadas + $2,
        partidas_perdidas  = partidas_perdidas + $3,
        capicuas_hechas    = capicuas_hechas + $4,
        tranques_ganados   = tranques_ganados + $5,
        puntos_totales     = puntos_totales + $6,
        racha_actual       = CASE WHEN $2 = 1 THEN racha_actual + 1 ELSE 0 END,
        mejor_racha        = GREATEST(mejor_racha, CASE WHEN $2 = 1 THEN racha_actual + 1 ELSE racha_actual END),
        tiempo_jugado_min  = tiempo_jugado_min + $7,
        actualizado_en     = NOW()
       WHERE jugador_id = $1`,
      [jugadorId, gano ? 1 : 0, gano ? 0 : 1, capicuaHecha ? 1 : 0,
       tranqueGanado ? 1 : 0, puntos, Math.ceil(duracion / 60)]
    );
  },

  async obtener(jugadorId) {
    const res = await db.query(
      'SELECT * FROM estadisticas WHERE jugador_id = $1',
      [jugadorId]
    );
    return res.rows[0];
  }
};

// ── MATCHES ──────────────────────────────────────────────────

const Matches = {
  async crear({ roomId, modo, torneoId, jugadores }) {
    const res = await db.query(
      `INSERT INTO matches (room_id, modo, torneo_id, equipo0_j0, equipo0_j2, equipo1_j1, equipo1_j3)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [roomId, modo, torneoId,
       jugadores[0]?.id, jugadores[2]?.id,
       jugadores[1]?.id, jugadores[3]?.id]
    );
    return res.rows[0].id;
  },

  async finalizar(matchId, { equipoGanador, puntosEquipo0, puntosEquipo1, totalRondas, huboCapicua, eloAntes, eloDespues }) {
    await db.query(
      `UPDATE matches SET
        estado = 'terminado',
        equipo_ganador = $2,
        puntos_equipo0 = $3,
        puntos_equipo1 = $4,
        total_rondas = $5,
        hubo_capicua = $6,
        elo_antes = $7,
        elo_despues = $8,
        terminado_en = NOW(),
        duracion_min = EXTRACT(EPOCH FROM (NOW() - iniciado_en)) / 60
       WHERE id = $1`,
      [matchId, equipoGanador, puntosEquipo0, puntosEquipo1,
       totalRondas, huboCapicua, eloAntes, eloDespues]
    );
  },

  async historialJugador(jugadorId, limite = 10) {
    const res = await db.query(
      `SELECT m.*,
        j0.nombre as nombre_j0, j1.nombre as nombre_j1,
        j2.nombre as nombre_j2, j3.nombre as nombre_j3
       FROM matches m
       LEFT JOIN jugadores j0 ON j0.id = m.equipo0_j0
       LEFT JOIN jugadores j1 ON j1.id = m.equipo1_j1
       LEFT JOIN jugadores j2 ON j2.id = m.equipo0_j2
       LEFT JOIN jugadores j3 ON j3.id = m.equipo1_j3
       WHERE m.equipo0_j0 = $1 OR m.equipo0_j2 = $1 OR m.equipo1_j1 = $1 OR m.equipo1_j3 = $1
       ORDER BY m.iniciado_en DESC
       LIMIT $2`,
      [jugadorId, limite]
    );
    return res.rows;
  }
};

// ── RANKING ──────────────────────────────────────────────────

const Ranking = {
  async global(limite = 100, pais = null) {
    const query = pais
      ? `SELECT j.id, j.nombre, j.pais, j.elo, j.liga, j.avatar,
               e.partidas_ganadas, e.partidas_jugadas, e.capicuas_hechas, e.racha_actual,
               RANK() OVER (ORDER BY j.elo DESC) as posicion
          FROM jugadores j
          LEFT JOIN estadisticas e ON e.jugador_id = j.id
          WHERE j.activo = TRUE AND j.pais = $1
          ORDER BY j.elo DESC LIMIT $2`
      : `SELECT j.id, j.nombre, j.pais, j.elo, j.liga, j.avatar,
               e.partidas_ganadas, e.partidas_jugadas, e.capicuas_hechas, e.racha_actual,
               RANK() OVER (ORDER BY j.elo DESC) as posicion
          FROM jugadores j
          LEFT JOIN estadisticas e ON e.jugador_id = j.id
          WHERE j.activo = TRUE
          ORDER BY j.elo DESC LIMIT $1`;

    const res = pais
      ? await db.query(query, [pais, limite])
      : await db.query(query, [limite]);

    return res.rows;
  },

  async posicionJugador(jugadorId) {
    const res = await db.query(
      `SELECT posicion FROM (
         SELECT id, RANK() OVER (ORDER BY elo DESC) as posicion
         FROM jugadores WHERE activo = TRUE
       ) ranked WHERE id = $1`,
      [jugadorId]
    );
    return res.rows[0]?.posicion || null;
  },

  async registrarELO(jugadorId, eloAntes, eloDespues, matchId) {
    await db.query(
      `INSERT INTO historial_elo (jugador_id, elo_antes, elo_despues, delta, match_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [jugadorId, eloAntes, eloDespues, eloDespues - eloAntes, matchId]
    );
  }
};

// ── TORNEOS ──────────────────────────────────────────────────

const Torneos = {
  async crear(datos) {
    const res = await db.query(
      `INSERT INTO torneos (nombre, tipo, es_gratuito, inscripcion_monedas, max_participantes,
        min_elo, fecha_inicio, fecha_fin, premio_1ro_monedas, premio_2do_monedas, premio_3ro_monedas,
        premio_1ro_item, trofeo_nombre, creador_id, es_privado, codigo_invitacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [datos.nombre, datos.tipo, datos.esGratuito, datos.inscripcion, datos.maxParticipantes,
       datos.minELO, datos.fechaInicio, datos.fechaFin,
       datos.premios?.primero?.monedas, datos.premios?.segundo?.monedas, datos.premios?.tercero?.monedas,
       datos.premios?.primero?.skin, datos.trofeoNombre, datos.creadorId,
       datos.esPrivado, datos.codigoInvitacion]
    );
    return res.rows[0];
  },

  async listar(estado = 'inscripcion') {
    const res = await db.query(
      `SELECT t.*, COUNT(ti.jugador_id) as participantes_actuales
       FROM torneos t
       LEFT JOIN torneo_inscripciones ti ON ti.torneo_id = t.id
       WHERE t.estado = $1
       GROUP BY t.id
       ORDER BY t.fecha_inicio ASC`,
      [estado]
    );
    return res.rows;
  },

  async inscribir(torneoId, jugadorId) {
    await db.query(
      `INSERT INTO torneo_inscripciones (torneo_id, jugador_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [torneoId, jugadorId]
    );
  }
};

// ── INVENTARIO ────────────────────────────────────────────────

const Inventario = {
  async agregar(jugadorId, itemId, categoria, origen = 'tienda') {
    await db.query(
      `INSERT INTO inventario (jugador_id, item_id, categoria, origen)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (jugador_id, item_id) DO NOTHING`,
      [jugadorId, itemId, categoria, origen]
    );
  },

  async tieneItem(jugadorId, itemId) {
    const res = await db.query(
      'SELECT id FROM inventario WHERE jugador_id = $1 AND item_id = $2',
      [jugadorId, itemId]
    );
    return res.rows.length > 0;
  },

  async obtenerTodo(jugadorId) {
    const res = await db.query(
      'SELECT * FROM inventario WHERE jugador_id = $1 ORDER BY obtenido_en DESC',
      [jugadorId]
    );
    return res.rows;
  }
};

// ── AMISTADES ─────────────────────────────────────────────────

const Amistades = {
  async solicitar(solicitanteId, receptorId) {
    await db.query(
      `INSERT INTO amistades (solicitante_id, receptor_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [solicitanteId, receptorId]
    );
  },

  async aceptar(solicitanteId, receptorId) {
    await db.query(
      `UPDATE amistades SET estado = 'aceptada'
       WHERE solicitante_id = $1 AND receptor_id = $2`,
      [solicitanteId, receptorId]
    );
  },

  async listar(jugadorId) {
    const res = await db.query(
      `SELECT j.id, j.nombre, j.elo, j.liga, j.avatar, j.ultimo_login,
              CASE WHEN NOW() - j.ultimo_login < INTERVAL '5 minutes' THEN 'conectado'
                   ELSE 'desconectado' END as estado_conexion
       FROM amistades a
       JOIN jugadores j ON (
         CASE WHEN a.solicitante_id = $1 THEN a.receptor_id
              ELSE a.solicitante_id END = j.id
       )
       WHERE (a.solicitante_id = $1 OR a.receptor_id = $1)
         AND a.estado = 'aceptada'
       ORDER BY j.ultimo_login DESC`,
      [jugadorId]
    );
    return res.rows;
  }
};

// ── NOTIFICACIONES ────────────────────────────────────────────

const Notificaciones = {
  async crear(jugadorId, tipo, titulo, cuerpo, datos = {}) {
    await db.query(
      `INSERT INTO notificaciones (jugador_id, tipo, titulo, cuerpo, datos)
       VALUES ($1, $2, $3, $4, $5)`,
      [jugadorId, tipo, titulo, cuerpo, datos]
    );
  },

  async listar(jugadorId) {
    const res = await db.query(
      `SELECT * FROM notificaciones
       WHERE jugador_id = $1
       ORDER BY creada_en DESC LIMIT 50`,
      [jugadorId]
    );
    return res.rows;
  },

  async marcarLeidas(jugadorId) {
    await db.query(
      'UPDATE notificaciones SET leida = TRUE WHERE jugador_id = $1',
      [jugadorId]
    );
  }
};

// ── LOGROS ────────────────────────────────────────────────────

const Logros = {
  async verificarYOtorgar(jugadorId) {
    const stats = await Estadisticas.obtener(jugadorId);
    const jugador = await Jugadores.buscarPorId(jugadorId);
    if (!stats || !jugador) return [];

    const logrosDef = await db.query('SELECT * FROM logros_definicion');
    const logrosJugador = await db.query(
      'SELECT logro_id FROM logros_jugador WHERE jugador_id = $1',
      [jugadorId]
    );
    const yaObtenidos = new Set(logrosJugador.rows.map(r => r.logro_id));
    const nuevosLogros = [];

    for (const logro of logrosDef.rows) {
      if (yaObtenidos.has(logro.id)) continue;

      const cond = logro.condicion;
      let cumple = false;

      if (cond.campo === 'elo') {
        cumple = jugador.elo >= cond.valor;
      } else if (stats[cond.campo] !== undefined) {
        cumple = stats[cond.campo] >= cond.valor;
      }

      if (cumple) {
        await db.query(
          'INSERT INTO logros_jugador (jugador_id, logro_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [jugadorId, logro.id]
        );
        nuevosLogros.push(logro);
      }
    }

    return nuevosLogros;
  }
};

// ── UTILIDADES ────────────────────────────────────────────────

function calcularLiga(elo) {
  if (elo >= 2000) return 'Diamante';
  if (elo >= 1500) return 'Oro';
  if (elo >= 1000) return 'Plata';
  return 'Bronce';
}

module.exports = { db, Jugadores, Estadisticas, Matches, Ranking, Torneos, Inventario, Amistades, Notificaciones, Logros };
