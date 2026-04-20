/**
 * Domino Real RD - Tienda y Monetización
 * Venta de: Mesas, Fichas, Avatares, Emojis, VIP
 * Sistema de ads con recompensas
 */

const express = require('express');
const router = express.Router();

const CATALOGO = {
  mesas: [
    { id: 'mesa_clasica', nombre: 'Mesa Clásica', descripcion: 'Mesa verde tradicional dominicana', precio: 0, moneda: 'gratis', preview: '/assets/mesas/clasica.png' },
    { id: 'mesa_oro', nombre: 'Mesa Dorada', descripcion: 'Mesa premium con bordes dorados', precio: 2000, moneda: 'coins', preview: '/assets/mesas/oro.png', exclusivaTorneo: false },
    { id: 'mesa_rd', nombre: 'Mesa Bandera RD', descripcion: 'Azul, rojo y blanco. Orgullo dominicano', precio: 1500, moneda: 'coins', preview: '/assets/mesas/rd.png' },
    { id: 'mesa_diamante', nombre: 'Mesa Diamante', descripcion: 'Para los maestros del dominó', precio: 5000, moneda: 'coins', preview: '/assets/mesas/diamante.png', exclusivaTorneo: true },
    { id: 'mesa_noche', nombre: 'Mesa Nocturna', descripcion: 'Oscura y elegante, para jugar de noche', precio: 0.99, moneda: 'usd', preview: '/assets/mesas/noche.png' },
    { id: 'mesa_playa', nombre: 'Mesa Caribeña', descripcion: 'Arena, sol y mar del Caribe', precio: 1.99, moneda: 'usd', preview: '/assets/mesas/playa.png' }
  ],
  fichas: [
    { id: 'fichas_clasicas', nombre: 'Fichas Clásicas', descripcion: 'Marfil tradicional', precio: 0, moneda: 'gratis' },
    { id: 'fichas_negras', nombre: 'Fichas Negras', descripcion: 'Elegantes fichas negras con puntos blancos', precio: 1000, moneda: 'coins' },
    { id: 'fichas_bandera_rd', nombre: 'Fichas RD', descripcion: 'Con colores de la bandera dominicana', precio: 2500, moneda: 'coins', exclusivaTorneo: true },
    { id: 'fichas_diamante', nombre: 'Fichas Diamante', descripcion: 'Brillantes y exclusivas', precio: 2.99, moneda: 'usd' },
    { id: 'fichas_madera', nombre: 'Fichas de Madera', descripcion: 'Aspecto rústico y dominicano', precio: 800, moneda: 'coins' },
    { id: 'fichas_neones', nombre: 'Fichas Neón', descripcion: 'Colores brillantes para destacar', precio: 1.49, moneda: 'usd' }
  ],
  avatares: [
    { id: 'avatar_default', nombre: 'Avatar Básico', precio: 0, moneda: 'gratis' },
    { id: 'avatar_rey', nombre: 'El Rey del Dominó', descripcion: 'Corona incluida', precio: 3000, moneda: 'coins' },
    { id: 'avatar_rd', nombre: 'Orgullo Dominicano', descripcion: 'Con bandera RD', precio: 1500, moneda: 'coins' },
    { id: 'avatar_campeona', nombre: 'La Campeona', descripcion: 'Para las reinas del juego', precio: 1500, moneda: 'coins' },
    { id: 'avatar_abuela', nombre: 'La Abuela Maestra', descripcion: 'Nadie juega como la abuela', precio: 2000, moneda: 'coins' },
    { id: 'rey_domino', nombre: 'Rey del Dominó Global', descripcion: 'Exclusivo: ganadores de torneo', precio: 0, moneda: 'exclusivo_torneo' }
  ],
  emojis_paquetes: [
    {
      id: 'pack_clasico', nombre: 'Pack Clásico', precio: 500, moneda: 'coins',
      emojis: ['👏', '🎉', '😤', '💪', '😎', '🤝']
    },
    {
      id: 'pack_dominicano', nombre: 'Pack Dominicano', precio: 1000, moneda: 'coins',
      emojis: ['🇩🇴', '🌴', '🎵', '💃', '🕺', '🔥', '👑', '🏆']
    },
    {
      id: 'pack_premium', nombre: 'Pack Premium', precio: 1.99, moneda: 'usd',
      emojis: ['💎', '🦁', '🎯', '⚡', '🌟', '🎲', '🃏', '🀄']
    }
  ],
  vip: {
    id: 'vip_mensual',
    nombre: 'VIP Dominó Global',
    precio: 4.99,
    moneda: 'usd',
    duracion: '1 mes',
    beneficios: [
      '✅ Sin anuncios',
      '✅ Acceso a torneos exclusivos VIP',
      '✅ Mesa VIP exclusiva',
      '✅ Avatar VIP',
      '✅ +20% monedas en bonos diarios',
      '✅ Estadísticas avanzadas',
      '✅ Soporte prioritario',
      '✅ Emblema VIP en perfil'
    ]
  },
  paquetes_monedas: [
    { id: 'pack_100', monedas: 100, precio: 0.99, bonus: 0 },
    { id: 'pack_500', monedas: 500, precio: 3.99, bonus: 50 },
    { id: 'pack_1000', monedas: 1000, precio: 6.99, bonus: 150 },
    { id: 'pack_5000', monedas: 5000, precio: 24.99, bonus: 1000, etiqueta: '🔥 Más Popular' },
    { id: 'pack_10000', monedas: 10000, precio: 44.99, bonus: 3000, etiqueta: '💎 Mejor Valor' }
  ]
};

// GET /tienda - Catálogo completo
router.get('/', (req, res) => {
  res.json({ exito: true, catalogo: CATALOGO });
});

// GET /tienda/categoria/:tipo - Por categoría
router.get('/categoria/:tipo', (req, res) => {
  const { tipo } = req.params;
  const items = CATALOGO[tipo];

  if (!items) {
    return res.status(404).json({ exito: false, error: 'Categoría no encontrada' });
  }

  res.json({ exito: true, items, categoria: tipo });
});

// POST /tienda/comprar - Comprar item
router.post('/comprar', async (req, res) => {
  try {
    const { jugadorId, itemId, categoria, metodoPago } = req.body;

    // Buscar item
    const categoriaItems = CATALOGO[categoria];
    const item = Array.isArray(categoriaItems)
      ? categoriaItems.find(i => i.id === itemId)
      : categoriaItems.id === itemId ? categoriaItems : null;

    if (!item) {
      return res.status(404).json({ exito: false, error: 'Item no encontrado' });
    }

    // TODO: Verificar saldo del jugador y procesar pago real
    // Integrar con: Stripe (USD), Google Play, App Store

    res.json({
      exito: true,
      item,
      mensaje: `¡${item.nombre} adquirido! ¡Úsalo en tu próxima partida!`,
      transaccionId: `txn_${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /tienda/ver-ad - Ver anuncio para ganar monedas
router.post('/ver-ad', async (req, res) => {
  try {
    const { jugadorId, tipoAd } = req.body;

    const recompensas = {
      banner: { monedas: 10, mensaje: '¡+10 monedas por ver el anuncio!' },
      video_corto: { monedas: 25, mensaje: '¡+25 monedas! ¡Gracias por apoyar el juego!' },
      video_largo: { monedas: 50, mensaje: '¡+50 monedas! ¡Eres lo máximo!' },
      especial: { monedas: 100, mensaje: '¡+100 monedas! ¡Anuncio especial visto!' }
    };

    const recompensa = recompensas[tipoAd] || recompensas.banner;

    // TODO: Verificar con proveedor de ads que el video fue realmente visto
    // Integrar con: AdMob, Unity Ads, ironSource

    res.json({
      exito: true,
      ...recompensa,
      totalMonedas: 1500 + recompensa.monedas // Mock del balance
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /tienda/bono-diario/:jugadorId - Bono diario
router.get('/bono-diario/:jugadorId', async (req, res) => {
  const { jugadorId } = req.params;

  // TODO: Verificar en DB si ya reclamó hoy
  const bonos = [50, 75, 100, 150, 200, 300, 500]; // Racha de días
  const diaRacha = Math.floor(Math.random() * 7); // Mock

  res.json({
    exito: true,
    disponible: true,
    monedasHoy: bonos[diaRacha],
    diaRacha: diaRacha + 1,
    proximoBono: bonos[Math.min(diaRacha + 1, 6)],
    mensaje: `¡Bono del día ${diaRacha + 1}! ¡${bonos[diaRacha]} monedas para ti!`
  });
});

// POST /tienda/reclamar-bono - Reclamar bono diario
router.post('/reclamar-bono', async (req, res) => {
  const { jugadorId } = req.body;

  // TODO: Guardar en DB timestamp del reclamo
  res.json({
    exito: true,
    monedasGanadas: 100,
    mensaje: '¡Bono diario reclamado! ¡Vuelve mañana para más!',
    totalMonedas: 1600
  });
});

module.exports = router;
