/**
 * Domino Real RD - Servidor Principal
 * Node.js + Express + Socket.IO
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rutas
const authRoutes = require('./src/routes/auth');
const rankingRoutes = require('./src/routes/ranking');
const torneosRoutes = require('./src/routes/torneos');
const tiendaRoutes = require('./src/routes/tienda');
const socialRoutes = require('./src/routes/social');
const matchmakingRoutes = require('./src/routes/matchmaking');
const jugadoresRoutes = require('./src/routes/jugadores');
const pagosRoutes = require('./src/routes/pagos');

// Socket handler
const { initGameSocket } = require('./src/socket/GameSocket');

// Servicios en background
const TorneoScheduler = require('./src/services/TorneoScheduler');

// Rate limiters
const { authLimiter, matchmakingLimiter, tiendaLimiter, adLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// ── CONFIGURACIÓN SOCKET.IO ──────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Ajustar en producción
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { exito: false, error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' }
});
app.use('/api/', limiter);

// ── RUTAS API ────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/torneos', torneosRoutes);
app.use('/api/tienda', tiendaLimiter, tiendaRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/matchmaking', matchmakingLimiter, matchmakingRoutes);
app.use('/api/jugadores', jugadoresRoutes);
app.use('/api/pagos', pagosRoutes); // Webhook de Stripe usa raw body, va antes de json()

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Domino Real RD',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    jugadoresConectados: io.engine.clientsCount || 0
  });
});

// ── RAÍZ ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    mensaje: '🎲 Domino Real RD API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      ranking: '/api/ranking',
      torneos: '/api/torneos',
      tienda: '/api/tienda',
      social: '/api/social',
      matchmaking: '/api/matchmaking',
      health: '/health'
    }
  });
});

// ── MANEJO DE ERRORES ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ exito: false, error: 'Error interno del servidor' });
});

app.use((req, res) => {
  res.status(404).json({ exito: false, error: 'Ruta no encontrada' });
});

// ── INICIALIZAR WEBSOCKET ─────────────────────────────────────
initGameSocket(io);

// ── INICIALIZAR SCHEDULER DE TORNEOS ─────────────────────────
if (process.env.NODE_ENV !== 'test') {
  TorneoScheduler.iniciar();
}

// ── INICIAR SERVIDOR ──────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║        🎲 Domino Real RD 🎲         ║
  ║     El Dominó Dominicano del Mundo    ║
  ╠════════════════════════════════════════╣
  ║  Servidor corriendo en puerto ${PORT}   ║
  ║  WebSocket: ws://localhost:${PORT}      ║
  ║  API: http://localhost:${PORT}/api      ║
  ╚════════════════════════════════════════╝
  `);
});

// Self-ping para evitar inactividad en hosting gratuito
if (process.env.SELF_PING_URL) {
  const https = require('https');
  setInterval(() => {
    https.get(process.env.SELF_PING_URL + '/health', (res) => {
      console.log(`[Ping] ${new Date().toISOString()} - Status: ${res.statusCode}`);
    }).on('error', (err) => console.error('[Ping Error]', err.message));
  }, 10 * 60 * 1000); // cada 10 minutos
}

module.exports = { app, server, io };
