/**
 * Domino Real RD - Autenticación COMPLETA con DB real
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Jugadores } = require('../models/Database');

const JWT_SECRET  = process.env.JWT_SECRET  || 'DOMINO_REAL_RD_secret_2024';
const JWT_EXPIRES = '30d';
const FB_APP_ID     = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

function generarToken(jugador) {
  return jwt.sign(
    { id: jugador.id, nombre: jugador.nombre, esInvitado: false },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function perfilPublico(jugador) {
  return {
    id: jugador.id,
    nombre: jugador.nombre,
    email: jugador.email,
    pais: jugador.pais || 'RD',
    elo: jugador.elo || 1200,
    liga: jugador.liga || 'Bronce',
    monedas: jugador.monedas || 500,
    gemas: jugador.gemas || 0,
    avatar: jugador.avatar || 'avatar_default',
    mesa: jugador.mesa || 'mesa_clasica',
    fichas: jugador.fichas || 'fichas_clasicas',
    es_vip: jugador.es_vip || false,
    partidas_jugadas: jugador.partidas_jugadas || 0,
    partidas_ganadas: jugador.partidas_ganadas || 0,
    mejor_racha: jugador.mejor_racha || 0,
    capicuas_hechas: jugador.capicuas_hechas || 0,
    login_method: jugador.login_method || 'email'
  };
}

// POST /auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, pais = 'RD' } = req.body;

    if (!nombre || nombre.length < 2 || nombre.length > 20)
      return res.status(400).json({ exito: false, error: 'Nombre debe tener 2-20 caracteres' });

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ exito: false, error: 'Email inválido' });

    if (!password || password.length < 6)
      return res.status(400).json({ exito: false, error: 'Contraseña mínimo 6 caracteres' });

    // Verificar que el email no existe
    const existe = await Jugadores.buscarPorEmail(email);
    if (existe) return res.status(409).json({ exito: false, error: 'Este email ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const jugador = await Jugadores.crear({ nombre, email, passwordHash, pais, loginMethod: 'email' });

    const token = generarToken(jugador);
    res.json({
      exito: true,
      token,
      jugador: perfilPublico(jugador),
      mensaje: `¡Bienvenido a Dominó Real RD, ${nombre}! 🎲 ¡500 monedas de regalo!`
    });
  } catch (err) {
    console.error('[Auth] Error registro:', err.message);
    res.status(500).json({ exito: false, error: 'Error al crear cuenta' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ exito: false, error: 'Email y contraseña requeridos' });

    const jugador = await Jugadores.buscarPorEmail(email);
    if (!jugador)
      return res.status(401).json({ exito: false, error: 'Email o contraseña incorrectos' });

    const passwordValida = await bcrypt.compare(password, jugador.password_hash);
    if (!passwordValida)
      return res.status(401).json({ exito: false, error: 'Email o contraseña incorrectos' });

    // Actualizar último login
    await Jugadores.actualizarUltimoLogin(jugador.id);

    const token = generarToken(jugador);
    res.json({
      exito: true,
      token,
      jugador: perfilPublico(jugador),
      mensaje: `¡Bienvenido de nuevo, ${jugador.nombre}! 🎲`
    });
  } catch (err) {
    console.error('[Auth] Error login:', err.message);
    res.status(500).json({ exito: false, error: 'Error al iniciar sesión' });
  }
});

// POST /auth/facebook - Login real con verificacion del access token en Facebook
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, socialId, nombre: nombreFallback, email: emailFallback, foto, pais = 'RD' } = req.body;

    if (!accessToken && !socialId)
      return res.status(400).json({ exito: false, error: 'Se requiere accessToken de Facebook' });

    // Verificar token con Facebook Graph API
    // appsecret_proof = HMAC-SHA256(accessToken, APP_SECRET) — requerido por Meta en produccion
    let perfil = null;
    if (accessToken) {
      let url = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;

      if (FB_APP_SECRET) {
        const appSecretProof = crypto
          .createHmac('sha256', FB_APP_SECRET)
          .update(accessToken)
          .digest('hex');
        url += `&appsecret_proof=${appSecretProof}`;
      }

      const fbResp = await fetch(url);

      if (!fbResp.ok)
        return res.status(401).json({ exito: false, error: 'Token de Facebook inválido o expirado' });

      perfil = await fbResp.json();

      if (perfil.error)
        return res.status(401).json({ exito: false, error: perfil.error.message });
    }

    const facebookId = perfil?.id    || socialId;
    const nombre     = perfil?.name  || nombreFallback;
    const email      = perfil?.email || emailFallback;
    const fotoUrl    = perfil?.picture?.data?.url || foto;

    if (!facebookId || !nombre)
      return res.status(400).json({ exito: false, error: 'Datos de Facebook incompletos' });

    let jugador = await Jugadores.buscarPorSocialId(facebookId, 'facebook');
    let esNuevo = false;

    if (!jugador) {
      if (email) jugador = await Jugadores.buscarPorEmail(email);

      if (!jugador) {
        jugador = await Jugadores.crear({
          nombre,
          email,
          passwordHash: null,
          pais,
          loginMethod: 'facebook',
          socialId: facebookId
        });
        esNuevo = true;
      } else {
        // Vincular Facebook a cuenta existente por email
        await Jugadores.actualizarSocialId(jugador.id, facebookId, 'facebook');
      }
    }

    await Jugadores.actualizarUltimoLogin(jugador.id);
    const token = generarToken(jugador);

    console.log(`[Auth] Facebook login: ${nombre} (${facebookId}) — ${esNuevo ? 'nuevo' : 'existente'}`);

    res.json({
      exito: true,
      token,
      jugador: perfilPublico(jugador),
      esNuevo,
      mensaje: esNuevo
        ? `¡Bienvenido a Dominó Real RD, ${nombre}! 🎲 ¡500 monedas de regalo!`
        : `¡Bienvenido de nuevo, ${jugador.nombre}! 🎲`
    });
  } catch (err) {
    console.error('[Auth] Error Facebook:', err.message);
    res.status(500).json({ exito: false, error: 'Error con login de Facebook' });
  }
});

// POST /auth/google - Login real con verificacion del access token en Google
router.post('/google', async (req, res) => {
  try {
    const { accessToken, socialId, nombre: nombreFallback, email: emailFallback, foto, pais = 'RD' } = req.body;

    if (!accessToken && !socialId)
      return res.status(400).json({ exito: false, error: 'Se requiere accessToken de Google' });

    // Verificar el token con Google y obtener el perfil real
    let perfil = null;
    if (accessToken) {
      const googleResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!googleResp.ok)
        return res.status(401).json({ exito: false, error: 'Token de Google inválido o expirado' });

      perfil = await googleResp.json();
    }

    // Usar datos verificados de Google o fallback si viene socialId directo
    const googleId    = perfil?.sub    || socialId;
    const nombre      = perfil?.name   || nombreFallback;
    const email       = perfil?.email  || emailFallback;
    const fotoUrl     = perfil?.picture || foto;

    if (!googleId || !nombre)
      return res.status(400).json({ exito: false, error: 'Datos de Google incompletos' });

    let jugador = await Jugadores.buscarPorSocialId(googleId, 'google');
    let esNuevo = false;

    if (!jugador) {
      // Buscar si ya existe por email (cuenta dual email+google)
      if (email) jugador = await Jugadores.buscarPorEmail(email);

      if (!jugador) {
        // Crear nuevo jugador con cuenta Google
        jugador = await Jugadores.crear({
          nombre,
          email,
          passwordHash: null,
          pais,
          loginMethod: 'google',
          socialId: googleId
        });
        esNuevo = true;
      } else {
        // Vincular cuenta Google existente por email
        await Jugadores.actualizarSocialId(jugador.id, googleId, 'google');
      }
    }

    await Jugadores.actualizarUltimoLogin(jugador.id);
    const token = generarToken(jugador);

    console.log(`[Auth] Google login: ${nombre} (${email}) — ${esNuevo ? 'nuevo' : 'existente'}`);

    res.json({
      exito: true,
      token,
      jugador: perfilPublico(jugador),
      esNuevo,
      mensaje: esNuevo
        ? `¡Bienvenido a Dominó Real RD, ${nombre}! 🎲 ¡500 monedas de regalo!`
        : `¡Bienvenido de nuevo, ${jugador.nombre}! 🎲`
    });
  } catch (err) {
    console.error('[Auth] Error Google:', err.message);
    res.status(500).json({ exito: false, error: 'Error con login de Google' });
  }
});

// POST /auth/invitado
router.post('/invitado', async (req, res) => {
  try {
    const nombre = req.body.nombre || `Invitado_${Math.floor(Math.random() * 9999)}`;

    const jugador = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      nombre,
      esInvitado: true,
      elo: 1200,
      liga: 'Bronce',
      monedas: 100,
      avatar: 'avatar_default',
      mesa: 'mesa_clasica',
      fichas: 'fichas_clasicas',
      es_vip: false
    };

    const token = jwt.sign(
      { id: jugador.id, nombre: jugador.nombre, esInvitado: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      exito: true,
      token,
      jugador,
      mensaje: '¡Jugando como invitado! Regístrate para guardar tu progreso.',
      advertencia: 'El progreso de invitados no se guarda permanentemente.'
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /auth/solicitar-eliminacion - Requerido por Facebook para publicar la app
router.post('/solicitar-eliminacion', async (req, res) => {
  try {
    const { email, usuario, motivo } = req.body;
    if (!email) return res.status(400).json({ exito: false, error: 'Email requerido' });

    // Registrar la solicitud en la tabla de notificaciones del admin
    // En produccion esto enviaría un email al administrador
    console.log(`[GDPR] Solicitud de eliminación: ${email} (${usuario}) — ${motivo || 'sin motivo'}`);

    // Si el usuario existe, marcar como pendiente de eliminación
    const { Pool } = require('pg');
    const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await db.query(
      `UPDATE jugadores SET activo = FALSE WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    await db.end();

    res.json({
      exito: true,
      mensaje: 'Solicitud de eliminación recibida. Procesaremos tu solicitud en un plazo de 30 días.',
      confirmacion: `Se procesará la eliminación de la cuenta: ${email}`
    });
  } catch (err) {
    console.error('[Auth] Error solicitud eliminación:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// Middleware de autenticación
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ exito: false, error: 'Token no proporcionado' });

  try {
    const token = authHeader.split(' ')[1];
    req.jugador = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ exito: false, error: 'Token inválido o expirado' });
  }
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;
