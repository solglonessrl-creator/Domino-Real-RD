/**
 * Domino Real RD - Autenticación
 * Soporte: Email, Facebook, Google, WhatsApp (invitado)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'DOMINO_REAL_RD_secret_2024';
const JWT_EXPIRES = '30d';

// POST /auth/registro - Registro nuevo usuario
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, pais = 'RD' } = req.body;

    if (!nombre || nombre.length < 2 || nombre.length > 20) {
      return res.status(400).json({ exito: false, error: 'Nombre debe tener 2-20 caracteres' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ exito: false, error: 'Email inválido' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ exito: false, error: 'Contraseña mínimo 6 caracteres' });
    }

    // TODO: Verificar que el email no existe en DB
    const passwordHash = await bcrypt.hash(password, 10);

    const jugador = {
      id: `usr_${Date.now()}`,
      nombre,
      email,
      pais,
      passwordHash,
      elo: 1200,
      monedas: 500, // Monedas de bienvenida
      avatar: 'avatar_default',
      mesaActual: 'mesa_clasica',
      fichas: 'fichas_clasicas',
      vip: false,
      creadoEn: new Date().toISOString()
    };

    const token = jwt.sign({ id: jugador.id, nombre: jugador.nombre }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      exito: true,
      token,
      jugador: {
        id: jugador.id,
        nombre: jugador.nombre,
        email: jugador.email,
        pais: jugador.pais,
        elo: jugador.elo,
        monedas: jugador.monedas,
        avatar: jugador.avatar
      },
      mensaje: `¡Bienvenido a Dominó Real RD, ${nombre}! ¡Te regalamos 500 monedas de inicio!`
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /auth/login - Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // TODO: Buscar usuario en DB y verificar password
    // const jugador = await DB.findByEmail(email);
    // const passwordValida = await bcrypt.compare(password, jugador.passwordHash);

    const jugadorMock = {
      id: 'usr_123',
      nombre: 'Santo',
      email,
      pais: 'RD',
      elo: 1650,
      monedas: 2500,
      avatar: 'avatar_rd',
      vip: false
    };

    const token = jwt.sign({ id: jugadorMock.id, nombre: jugadorMock.nombre }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      exito: true,
      token,
      jugador: jugadorMock,
      mensaje: `¡Bienvenido de nuevo, ${jugadorMock.nombre}!`
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /auth/facebook - Login con Facebook
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, userId, nombre, email, foto } = req.body;

    // TODO: Verificar token con Facebook Graph API
    // const fbData = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture`);

    const jugador = {
      id: `fb_${userId}`,
      nombre,
      email,
      foto,
      pais: 'RD',
      elo: 1200,
      monedas: 500,
      loginMethod: 'facebook'
    };

    const token = jwt.sign({ id: jugador.id, nombre: jugador.nombre }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      exito: true,
      token,
      jugador,
      esNuevo: true, // Si es primera vez
      mensaje: `¡Bienvenido, ${nombre}! ¡A jugar dominó!`
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /auth/google - Login con Google
router.post('/google', async (req, res) => {
  try {
    const { idToken, nombre, email, foto } = req.body;

    // TODO: Verificar con Google OAuth2
    // const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });

    const jugador = {
      id: `google_${Date.now()}`,
      nombre,
      email,
      foto,
      pais: 'RD',
      elo: 1200,
      monedas: 500,
      loginMethod: 'google'
    };

    const token = jwt.sign({ id: jugador.id, nombre: jugador.nombre }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({ exito: true, token, jugador });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /auth/invitado - Jugar como invitado (sin cuenta)
router.post('/invitado', async (req, res) => {
  const nombre = req.body.nombre || `Invitado_${Math.floor(Math.random() * 9999)}`;

  const jugador = {
    id: `guest_${Date.now()}`,
    nombre,
    esInvitado: true,
    elo: 1200,
    monedas: 100,
    avatar: 'avatar_default'
  };

  const token = jwt.sign({ id: jugador.id, nombre: jugador.nombre, esInvitado: true }, JWT_SECRET, { expiresIn: '1d' });

  res.json({
    exito: true,
    token,
    jugador,
    mensaje: `¡Jugando como invitado! Regístrate para guardar tu progreso.`,
    advertencia: 'El progreso de invitados no se guarda permanentemente.'
  });
});

// Middleware de autenticación
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ exito: false, error: 'Token no proporcionado' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.jugador = decoded;
    next();
  } catch (err) {
    res.status(401).json({ exito: false, error: 'Token inválido o expirado' });
  }
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;
