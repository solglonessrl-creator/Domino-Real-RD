/**
 * Domino Real RD — Servicio de Notificaciones Push
 * Usa Expo Push Notification API (compatible con FCM via Expo)
 * Documentacion: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envia una notificacion push via Expo Push API
 * @param {string|string[]} tokens - ExponentPushToken o array
 * @param {object} notif - { titulo, cuerpo, datos, sonido, badge }
 */
async function enviarPush(tokens, { titulo, cuerpo, datos = {}, sonido = 'default', badge = 1 }) {
  if (!tokens) return { ok: false, razon: 'sin_tokens' };

  const lista = Array.isArray(tokens) ? tokens : [tokens];
  const validos = lista.filter(t => t && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')));

  if (!validos.length) return { ok: false, razon: 'tokens_invalidos' };

  // Expo acepta hasta 100 mensajes por batch
  const batches = [];
  for (let i = 0; i < validos.length; i += 100) {
    batches.push(validos.slice(i, i + 100));
  }

  let totalOk = 0;
  let errores = [];

  for (const batch of batches) {
    const mensajes = batch.map(token => ({
      to: token,
      title: titulo,
      body: cuerpo,
      data: datos,
      sound: sonido,
      badge,
      channelId: 'domino_global',
      priority: 'high'
    }));

    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mensajes)
      });

      const resultado = await resp.json();

      if (resultado.data) {
        resultado.data.forEach((ticket, idx) => {
          if (ticket.status === 'ok') {
            totalOk++;
          } else {
            errores.push({ token: batch[idx], error: ticket.message });
            console.error(`[Push] Error ticket para ${batch[idx].slice(0, 20)}...: ${ticket.message}`);
          }
        });
      }
    } catch (err) {
      console.error('[Push] Error enviando batch:', err.message);
      errores.push({ batch: true, error: err.message });
    }
  }

  console.log(`[Push] Enviadas: ${totalOk}/${validos.length} — "${titulo}"`);
  return { ok: totalOk > 0, enviadas: totalOk, errores };
}

/**
 * Obtener push tokens de jugadores por sus IDs
 */
async function obtenerTokens(jugadorIds) {
  if (!jugadorIds?.length) return [];
  try {
    const ids = Array.isArray(jugadorIds) ? jugadorIds : [jugadorIds];
    const result = await db.query(
      `SELECT push_token FROM jugadores WHERE id = ANY($1) AND push_token IS NOT NULL AND push_token != ''`,
      [ids]
    );
    return result.rows.map(r => r.push_token);
  } catch (err) {
    console.error('[Push] Error obteniendo tokens:', err.message);
    return [];
  }
}

/**
 * Obtener token de un jugador especifico
 */
async function obtenerTokenJugador(jugadorId) {
  try {
    const result = await db.query(
      `SELECT push_token FROM jugadores WHERE id = $1 AND push_token IS NOT NULL`,
      [jugadorId]
    );
    return result.rows[0]?.push_token || null;
  } catch (err) {
    console.error('[Push] Error obteniendo token:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// NOTIFICACIONES PREDEFINIDAS
// ═══════════════════════════════════════════════════════════

/**
 * Notificar invitacion a partida
 */
async function notificarInvitacion(jugadorDestinoId, { nombreInvitador, roomId }) {
  const token = await obtenerTokenJugador(jugadorDestinoId);
  if (!token) return;

  return enviarPush(token, {
    titulo: `🎲 ¡${nombreInvitador} te invita a jugar!`,
    cuerpo: 'La partida de dominó está por comenzar. ¡Entra ahora!',
    datos: { tipo: 'invitacion_partida', roomId: String(roomId) }
  });
}

/**
 * Notificar inicio de torneo a todos sus participantes
 */
async function notificarTorneoInicio(jugadorIds, { nombreTorneo, torneoId }) {
  const tokens = await obtenerTokens(jugadorIds);
  if (!tokens.length) return;

  return enviarPush(tokens, {
    titulo: `🏆 ¡${nombreTorneo} comenzó!`,
    cuerpo: '¡Tu torneo está iniciando! Entra ahora a competir.',
    datos: { tipo: 'torneo_inicio', torneoId: String(torneoId) }
  });
}

/**
 * Notificar al ganador de un torneo
 */
async function notificarPremioTorneo(jugadorId, { nombreTorneo, puesto, monedas }) {
  const token = await obtenerTokenJugador(jugadorId);
  if (!token) return;

  const medallas = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return enviarPush(token, {
    titulo: `${medallas[puesto] || '🏆'} ¡Ganaste en ${nombreTorneo}!`,
    cuerpo: `¡Felicidades! Obtuviste el puesto #${puesto} y ganaste 🪙 ${monedas} monedas.`,
    datos: { tipo: 'premio_torneo', torneoId: String(nombreTorneo), puesto: String(puesto) }
  });
}

/**
 * Notificar subida de liga
 */
async function notificarSubidaLiga(jugadorId, { liga, ligaAnterior }) {
  const token = await obtenerTokenJugador(jugadorId);
  if (!token) return;

  const emojis = { Bronce: '🥉', Plata: '🥈', Oro: '🥇', Diamante: '💎', Maestro: '👑' };
  return enviarPush(token, {
    titulo: `${emojis[liga] || '🎉'} ¡Subiste a Liga ${liga}!`,
    cuerpo: `Dejaste atrás la Liga ${ligaAnterior}. ¡Tu dominó está en otro nivel!`,
    datos: { tipo: 'subida_liga', liga }
  });
}

/**
 * Notificar bono diario disponible (puede usarse desde un cron)
 */
async function notificarBonoDiario(jugadorId, { monedas, diaRacha }) {
  const token = await obtenerTokenJugador(jugadorId);
  if (!token) return;

  return enviarPush(token, {
    titulo: '🎁 ¡Tu bono diario está listo!',
    cuerpo: `Reclama tus 🪙 ${monedas} monedas (Día ${diaRacha} de racha). ¡No pierdas tu racha!`,
    datos: { tipo: 'bono_diario' }
  });
}

/**
 * Notificar solicitud de amistad recibida
 */
async function notificarSolicitudAmistad(jugadorDestinoId, { nombreSolicitante }) {
  const token = await obtenerTokenJugador(jugadorDestinoId);
  if (!token) return;

  return enviarPush(token, {
    titulo: `👥 ¡${nombreSolicitante} quiere ser tu amigo!`,
    cuerpo: 'Acepta su solicitud y juega dominó juntos. 🎲',
    datos: { tipo: 'solicitud_amistad' }
  });
}

/**
 * Notificar amistad aceptada
 */
async function notificarAmistadAceptada(jugadorDestinoId, { nombreAmigo }) {
  const token = await obtenerTokenJugador(jugadorDestinoId);
  if (!token) return;

  return enviarPush(token, {
    titulo: `✅ ¡${nombreAmigo} aceptó tu solicitud!`,
    cuerpo: '¡Ahora puedes retarlo a una partida de dominó!',
    datos: { tipo: 'amistad_aceptada' }
  });
}

/**
 * Notificar nuevo logro desbloqueado
 */
async function notificarNuevoLogro(jugadorId, { logroNombre, logroIcono, logroDescripcion }) {
  const token = await obtenerTokenJugador(jugadorId);
  if (!token) return;

  return enviarPush(token, {
    titulo: `${logroIcono || '🏅'} ¡Nuevo logro desbloqueado!`,
    cuerpo: `"${logroNombre}" — ${logroDescripcion}`,
    datos: { tipo: 'nuevo_logro' }
  });
}

/**
 * Notificar a todos los jugadores con token activo (ej: evento especial)
 */
async function notificarATodos({ titulo, cuerpo, datos = {} }) {
  try {
    const result = await db.query(
      `SELECT push_token FROM jugadores WHERE push_token IS NOT NULL AND push_token != '' LIMIT 1000`
    );
    const tokens = result.rows.map(r => r.push_token);
    if (!tokens.length) return { ok: false, razon: 'sin_tokens' };
    return enviarPush(tokens, { titulo, cuerpo, datos });
  } catch (err) {
    console.error('[Push] Error notificando a todos:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  enviarPush,
  obtenerTokens,
  obtenerTokenJugador,
  notificarInvitacion,
  notificarTorneoInicio,
  notificarPremioTorneo,
  notificarSubidaLiga,
  notificarBonoDiario,
  notificarSolicitudAmistad,
  notificarAmistadAceptada,
  notificarNuevoLogro,
  notificarATodos
};
