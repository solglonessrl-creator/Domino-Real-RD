/**
 * Domino Real RD - Cliente WebSocket
 * Maneja la conexión en tiempo real con el servidor
 */

import { io } from 'socket.io-client';

const SERVIDOR_URL = process.env.REACT_APP_SERVIDOR_URL || 'http://localhost:3001';

let socket = null;

export function conectarSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SERVIDOR_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  socket.on('connect', () => {
    console.log('[Socket] Conectado al servidor de Dominó Real RD');
  });

  socket.on('disconnect', (razon) => {
    console.log('[Socket] Desconectado:', razon);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Error de conexión:', err.message);
  });

  return socket;
}

export function obtenerSocket() {
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * API de juego encapsulada
 */
export const JuegoAPI = {
  unirseASala: (roomId, jugador) => {
    socket?.emit('join_room', { roomId, jugador });
  },

  colocarFicha: (roomId, fichaId, lado) => {
    socket?.emit('play_tile', { roomId, fichaId, lado });
  },

  pasarTurno: (roomId) => {
    socket?.emit('pass_turn', { roomId });
  },

  pedirConsejo: (roomId) => {
    socket?.emit('request_hint', { roomId });
  },

  enviarChat: (roomId, mensaje) => {
    if (!mensaje?.trim()) return;
    socket?.emit('chat_message', { roomId, mensaje: mensaje.trim() });
  },

  enviarReaccion: (roomId, emoji) => {
    socket?.emit('send_reaction', { roomId, emoji });
  }
};

/**
 * API REST del servidor
 */
const API_BASE = `${SERVIDOR_URL}/api`;

async function apiFetch(ruta, opciones = {}) {
  const token = localStorage.getItem('domino_token');
  const resp = await fetch(`${API_BASE}${ruta}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...opciones
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export const AuthAPI = {
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  }),
  registro: (nombre, email, password) => apiFetch('/auth/registro', {
    method: 'POST', body: JSON.stringify({ nombre, email, password })
  }),
  loginFacebook: (accessToken, userId, nombre, email) => apiFetch('/auth/facebook', {
    method: 'POST', body: JSON.stringify({ accessToken, userId, nombre, email })
  }),
  loginInvitado: (nombre) => apiFetch('/auth/invitado', {
    method: 'POST', body: JSON.stringify({ nombre })
  })
};

export const RankingAPI = {
  global: () => apiFetch('/ranking/global'),
  jugador: (id) => apiFetch(`/ranking/jugador/${id}`)
};

export const TorneosAPI = {
  listar: () => apiFetch('/torneos'),
  detalle: (id) => apiFetch(`/torneos/${id}`),
  crear: (datos) => apiFetch('/torneos/crear', { method: 'POST', body: JSON.stringify(datos) }),
  inscribir: (torneoId, jugadorId) => apiFetch(`/torneos/${torneoId}/inscribir`, {
    method: 'POST', body: JSON.stringify({ jugadorId })
  })
};

export const TiendaAPI = {
  catalogo: () => apiFetch('/tienda'),
  comprar: (itemId, categoria) => apiFetch('/tienda/comprar', {
    method: 'POST', body: JSON.stringify({ itemId, categoria })
  }),
  verAd: (tipo) => apiFetch('/tienda/ver-ad', {
    method: 'POST', body: JSON.stringify({ tipo })
  }),
  bonoDiario: (jugadorId) => apiFetch(`/tienda/bono-diario/${jugadorId}`),
  reclamarBono: (jugadorId) => apiFetch('/tienda/reclamar-bono', {
    method: 'POST', body: JSON.stringify({ jugadorId })
  })
};

export const SocialAPI = {
  amigos: (jugadorId) => apiFetch(`/social/amigos/${jugadorId}`),
  compartirVictoria: (jugadorId, resultado, plataforma) => apiFetch('/social/compartir-victoria', {
    method: 'POST', body: JSON.stringify({ jugadorId, resultado, plataforma })
  }),
  codigoReferido: (jugadorId) => apiFetch(`/social/codigo-referido/${jugadorId}`),
  eventos: () => apiFetch('/social/eventos')
};

export const MatchmakingAPI = {
  buscar: (jugadorId, elo, modo) => apiFetch('/matchmaking/buscar', {
    method: 'POST', body: JSON.stringify({ jugadorId, elo, modo })
  }),
  cancelar: (jugadorId) => apiFetch(`/matchmaking/cancelar/${jugadorId}`, { method: 'DELETE' })
};
