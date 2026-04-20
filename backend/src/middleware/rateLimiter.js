/**
 * Domino Real RD — Rate Limiters específicos por ruta
 */

const rateLimit = require('express-rate-limit');

const opciones = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      exito: false,
      error: 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.',
      reintentarEn: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
};

// Auth: máximo 10 intentos por 15 min (anti brute-force)
const authLimiter = rateLimit({
  ...opciones,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de login. Intenta en 15 minutos.'
});

// Matchmaking: máximo 5 búsquedas por minuto
const matchmakingLimiter = rateLimit({
  ...opciones,
  windowMs: 60 * 1000,
  max: 5
});

// Tienda: máximo 30 compras por hora
const tiendaLimiter = rateLimit({
  ...opciones,
  windowMs: 60 * 60 * 1000,
  max: 30
});

// Chat: máximo 60 mensajes por minuto
const chatLimiter = rateLimit({
  ...opciones,
  windowMs: 60 * 1000,
  max: 60
});

// Ver ads: máximo 10 por hora (anti-abuso de rewards)
const adLimiter = rateLimit({
  ...opciones,
  windowMs: 60 * 60 * 1000,
  max: 10
});

module.exports = { authLimiter, matchmakingLimiter, tiendaLimiter, chatLimiter, adLimiter };
