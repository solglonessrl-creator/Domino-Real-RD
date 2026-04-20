/**
 * Domino Real RD — Notificaciones Push (Firebase Cloud Messaging)
 * Notifica: inicio de torneo, invitación de amigo, bono disponible, nuevo reto
 */

// const admin = require('firebase-admin'); // Descomenta al integrar Firebase

class NotificacionesPush {
  constructor() {
    this.habilitado = !!process.env.FIREBASE_PROJECT_ID;
    if (this.habilitado) {
      // admin.initializeApp({ credential: admin.credential.cert({...}) });
      console.log('[Push] Firebase Cloud Messaging inicializado');
    } else {
      console.log('[Push] FCM deshabilitado (configura FIREBASE_PROJECT_ID)');
    }
  }

  /**
   * Enviar notificación a un token FCM específico
   */
  async enviarA(fcmToken, { titulo, cuerpo, datos = {}, imagen }) {
    if (!this.habilitado || !fcmToken) return false;

    const mensaje = {
      token: fcmToken,
      notification: { title: titulo, body: cuerpo, imageUrl: imagen },
      data: Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, String(v)])),
      android: {
        notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK', channelId: 'domino_global' }
      },
      apns: {
        payload: { aps: { sound: 'domino_notif.wav', badge: 1 } }
      }
    };

    try {
      // const response = await admin.messaging().send(mensaje);
      console.log(`[Push] Enviado a ${fcmToken.slice(0, 10)}...: ${titulo}`);
      return true;
    } catch (err) {
      console.error('[Push] Error:', err.message);
      return false;
    }
  }

  /**
   * Enviar a múltiples tokens
   */
  async enviarAMultiples(tokens, notificacion) {
    if (!tokens?.length) return;
    await Promise.allSettled(tokens.map(t => this.enviarA(t, notificacion)));
  }

  // ── Tipos de notificación predefinidos ────────────────────

  async notificarInvitacionPartida(fcmToken, { nombreInvitador, roomId }) {
    return this.enviarA(fcmToken, {
      titulo: `¡${nombreInvitador} te invita a jugar!`,
      cuerpo: '¡Entra al dominó ahora! La partida está por comenzar 🎲',
      datos: { tipo: 'invitacion_partida', roomId }
    });
  }

  async notificarTorneoProximo(tokens, { nombreTorneo, minutosParaInicio }) {
    return this.enviarAMultiples(tokens, {
      titulo: `🏆 ${nombreTorneo}`,
      cuerpo: `¡El torneo empieza en ${minutosParaInicio} minutos! ¡Entra ya!`,
      datos: { tipo: 'torneo_inicio' }
    });
  }

  async notificarBonoDiario(fcmToken, { monedas }) {
    return this.enviarA(fcmToken, {
      titulo: '🎁 ¡Tu bono diario está listo!',
      cuerpo: `¡Tienes ${monedas} monedas esperándote! Reclama antes de medianoche.`,
      datos: { tipo: 'bono_diario' }
    });
  }

  async notificarSubidaLiga(fcmToken, { liga }) {
    return this.enviarA(fcmToken, {
      titulo: `🎉 ¡Subiste a Liga ${liga}!`,
      cuerpo: '¡Felicidades! Tu juego está en otro nivel. ¡Sigue dominando!',
      datos: { tipo: 'subida_liga', liga }
    });
  }

  async notificarNuevoLogro(fcmToken, { logro }) {
    return this.enviarA(fcmToken, {
      titulo: `${logro.icono} ¡Nuevo logro desbloqueado!`,
      cuerpo: `"${logro.nombre}" — ${logro.descripcion}`,
      datos: { tipo: 'nuevo_logro', logroId: logro.id }
    });
  }

  async notificarAmistadAceptada(fcmToken, { nombreAmigo }) {
    return this.enviarA(fcmToken, {
      titulo: `👥 ¡${nombreAmigo} aceptó tu solicitud!`,
      cuerpo: '¡Ahora puedes invitarlo a jugar dominó! 🎲',
      datos: { tipo: 'amistad_aceptada' }
    });
  }
}

module.exports = new NotificacionesPush();
