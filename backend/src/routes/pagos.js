/**
 * Domino Real RD — Sistema de Pagos con Stripe
 * Maneja: paquetes de monedas, VIP, torneos pagos
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { Jugadores, Inventario, Torneos } = require('../models/Database');

// Stripe se inicializa solo si la key es real (empieza con sk_)
let stripe = null;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey && (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('sk_test_'))) {
  try {
    stripe = require('stripe')(stripeKey);
    console.log('[Stripe] Pagos inicializados');
  } catch (e) {
    console.log('[Stripe] No se pudo inicializar:', e.message);
  }
} else {
  console.log('[Stripe] Pagos deshabilitados — configura STRIPE_SECRET_KEY con una key real cuando estés listo');
}

const PRODUCTOS = {
  pack_100:   { monedas: 100,   precio: 99,   descripcion: '100 Monedas' },
  pack_500:   { monedas: 550,   precio: 399,  descripcion: '550 Monedas (500 + 50 bonus)' },
  pack_1000:  { monedas: 1150,  precio: 699,  descripcion: '1150 Monedas (1000 + 150 bonus)' },
  pack_5000:  { monedas: 6000,  precio: 2499, descripcion: '6000 Monedas (5000 + 1000 bonus)' },
  pack_10000: { monedas: 13000, precio: 4499, descripcion: '13000 Monedas (10000 + 3000 bonus)' },
  vip_mensual: { precio: 499, descripcion: 'VIP Dominó Global — 1 Mes', tipo: 'vip' }
};

// POST /pagos/crear-intent — Crear intención de pago
router.post('/crear-intent', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ exito: false, error: 'Pagos no disponibles. Configura STRIPE_SECRET_KEY.' });
  }

  try {
    const { productoId } = req.body;
    const producto = PRODUCTOS[productoId];

    if (!producto) {
      return res.status(400).json({ exito: false, error: 'Producto no encontrado' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: producto.precio, // En centavos USD
      currency: 'usd',
      metadata: {
        jugadorId: req.jugador.id,
        productoId,
        monedas: producto.monedas || 0,
        tipo: producto.tipo || 'monedas'
      },
      description: `Dominó Real RD — ${producto.descripcion}`
    });

    res.json({
      exito: true,
      clientSecret: paymentIntent.client_secret,
      monto: producto.precio,
      descripcion: producto.descripcion
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /pagos/webhook — Confirmación de Stripe (IMPORTANTE: antes del express.json())
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(200).send('OK');

  const sig = req.headers['stripe-signature'];
  let evento;

  try {
    evento = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Error de firma:', err.message);
    return res.status(400).json({ error: 'Firma inválida' });
  }

  if (evento.type === 'payment_intent.succeeded') {
    await procesarPagoExitoso(evento.data.object);
  } else if (evento.type === 'payment_intent.payment_failed') {
    console.log('[Stripe] Pago fallido:', evento.data.object.id);
  }

  res.json({ recibido: true });
});

/**
 * Procesar pago exitoso: dar monedas o activar VIP
 */
async function procesarPagoExitoso(paymentIntent) {
  const { jugadorId, productoId, monedas, tipo } = paymentIntent.metadata;
  console.log(`[Stripe] Pago exitoso — Jugador: ${jugadorId}, Producto: ${productoId}`);

  try {
    if (tipo === 'vip') {
      // Activar VIP por 30 días
      const { db } = require('../models/Database');
      await db.query(
        `UPDATE jugadores SET es_vip = TRUE, vip_expira_en = NOW() + INTERVAL '30 days' WHERE id = $1`,
        [jugadorId]
      );
      console.log(`[Stripe] VIP activado para jugador ${jugadorId}`);
    } else {
      // Dar monedas
      const monedasNum = parseInt(monedas) || 0;
      await Jugadores.actualizarMonedas(
        jugadorId, monedasNum,
        'compra_monedas',
        `Compra: ${PRODUCTOS[productoId]?.descripcion}`,
        paymentIntent.id
      );
      console.log(`[Stripe] ${monedasNum} monedas acreditadas a jugador ${jugadorId}`);
    }
  } catch (err) {
    console.error('[Stripe] Error procesando pago:', err.message);
  }
}

// GET /pagos/productos — Lista de productos disponibles
router.get('/productos', (req, res) => {
  res.json({
    exito: true,
    productos: Object.entries(PRODUCTOS).map(([id, p]) => ({
      id,
      ...p,
      precioFormatado: `$${(p.precio / 100).toFixed(2)}`
    })),
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY || null,
    stripeDisponible: !!stripe
  });
});

// POST /pagos/verificar-vip — Verificar y expirar VIP si corresponde
router.post('/verificar-vip', authMiddleware, async (req, res) => {
  try {
    const { db } = require('../models/Database');
    const jugador = await db.query(
      'SELECT es_vip, vip_expira_en FROM jugadores WHERE id = $1',
      [req.jugador.id]
    );

    const j = jugador.rows[0];
    if (j?.es_vip && j?.vip_expira_en && new Date(j.vip_expira_en) < new Date()) {
      // VIP expirado
      await db.query('UPDATE jugadores SET es_vip = FALSE WHERE id = $1', [req.jugador.id]);
      return res.json({ exito: true, esVip: false, mensaje: 'Tu VIP expiró. ¡Renueva para seguir disfrutando!' });
    }

    res.json({
      exito: true,
      esVip: j?.es_vip || false,
      expiraEn: j?.vip_expira_en
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
