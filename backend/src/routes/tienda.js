/**
 * Domino Real RD - Tienda y Monetización COMPLETA con DB real
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { db } = require('../models/Database');

const CATALOGO = {
  mesas: [
    { id: 'mesa_clasica', nombre: 'Mesa Clásica', descripcion: 'Mesa verde tradicional dominicana', precio: 0, moneda: 'gratis' },
    { id: 'mesa_rd', nombre: 'Mesa Bandera RD', descripcion: 'Azul, rojo y blanco. Orgullo dominicano', precio: 1500, moneda: 'coins' },
    { id: 'mesa_oro', nombre: 'Mesa Dorada', descripcion: 'Mesa premium con bordes dorados', precio: 2000, moneda: 'coins' },
    { id: 'mesa_noche', nombre: 'Mesa Nocturna', descripcion: 'Oscura y elegante', precio: 800, moneda: 'coins' },
    { id: 'mesa_playa', nombre: 'Mesa Caribeña', descripcion: 'Arena, sol y mar del Caribe', precio: 1200, moneda: 'coins' },
    { id: 'mesa_diamante', nombre: 'Mesa Diamante', descripcion: 'Para los maestros del dominó', precio: 5000, moneda: 'coins', exclusivaTorneo: true }
  ],
  fichas: [
    { id: 'fichas_clasicas', nombre: 'Fichas Clásicas', descripcion: 'Marfil tradicional', precio: 0, moneda: 'gratis' },
    { id: 'fichas_negras', nombre: 'Fichas Negras', descripcion: 'Elegantes fichas negras', precio: 1000, moneda: 'coins' },
    { id: 'fichas_madera', nombre: 'Fichas de Madera', descripcion: 'Aspecto rústico y dominicano', precio: 800, moneda: 'coins' },
    { id: 'fichas_bandera_rd', nombre: 'Fichas RD', descripcion: 'Con colores de la bandera dominicana', precio: 2500, moneda: 'coins', exclusivaTorneo: true },
    { id: 'fichas_neones', nombre: 'Fichas Neón', descripcion: 'Colores brillantes para destacar', precio: 1800, moneda: 'coins' },
    { id: 'fichas_diamante', nombre: 'Fichas Diamante', descripcion: 'Brillantes y exclusivas', precio: 3500, moneda: 'coins' }
  ],
  avatares: [
    { id: 'avatar_default', nombre: 'Avatar Básico', precio: 0, moneda: 'gratis' },
    { id: 'avatar_rd', nombre: 'Orgullo Dominicano', descripcion: 'Con bandera RD', precio: 1500, moneda: 'coins' },
    { id: 'avatar_campeona', nombre: 'La Campeona', descripcion: 'Para las reinas del juego', precio: 1500, moneda: 'coins' },
    { id: 'avatar_abuela', nombre: 'La Abuela Maestra', descripcion: 'Nadie juega como la abuela', precio: 2000, moneda: 'coins' },
    { id: 'avatar_rey', nombre: 'El Rey del Dominó', descripcion: 'Corona incluida', precio: 3000, moneda: 'coins' },
    { id: 'rey_domino', nombre: 'Rey del Dominó Global', descripcion: 'Exclusivo ganadores de torneo', precio: 0, moneda: 'exclusivo_torneo' }
  ],
  emojis_paquetes: [
    { id: 'pack_clasico', nombre: 'Pack Clásico', precio: 500, moneda: 'coins', emojis: ['👏','🎉','😤','💪','😎','🤝'] },
    { id: 'pack_dominicano', nombre: 'Pack Dominicano', precio: 1000, moneda: 'coins', emojis: ['🇩🇴','🌴','🎵','💃','🕺','🔥','👑','🏆'] },
    { id: 'pack_premium', nombre: 'Pack Premium', precio: 2000, moneda: 'coins', emojis: ['💎','🦁','🎯','⚡','🌟','🎲','🃏','🀄'] }
  ],
  vip: {
    id: 'vip_mensual', nombre: 'VIP Dominó Real RD', precio: 4.99, moneda: 'usd', duracion: '1 mes',
    beneficios: ['Sin anuncios','Torneos VIP exclusivos','Mesa VIP','Avatar VIP','+20% monedas en bonos','Estadísticas avanzadas','Soporte prioritario','Emblema VIP en perfil']
  },
  paquetes_monedas: [
    { id: 'pack_100', monedas: 100, precio: 0.99, bonus: 0 },
    { id: 'pack_500', monedas: 500, precio: 3.99, bonus: 50 },
    { id: 'pack_1000', monedas: 1000, precio: 6.99, bonus: 150 },
    { id: 'pack_5000', monedas: 5000, precio: 24.99, bonus: 1000, etiqueta: '🔥 Más Popular' },
    { id: 'pack_10000', monedas: 10000, precio: 44.99, bonus: 3000, etiqueta: '💎 Mejor Valor' }
  ]
};

// GET /tienda - Catálogo completo con inventario del jugador
router.get('/', authMiddleware, async (req, res) => {
  try {
    const invResult = await db.query(
      'SELECT item_id FROM inventario WHERE jugador_id=$1',
      [req.jugador.id]
    );
    const inventario = new Set(invResult.rows.map(r => r.item_id));

    // Marcar qué items ya tiene
    const catalogoConEstado = JSON.parse(JSON.stringify(CATALOGO));
    for (const cat of Object.values(catalogoConEstado)) {
      if (Array.isArray(cat)) {
        cat.forEach(item => { item.poseido = inventario.has(item.id) || item.precio === 0; });
      }
    }

    // Balance del jugador
    const jugResult = await db.query('SELECT monedas, gemas, es_vip FROM jugadores WHERE id=$1', [req.jugador.id]);
    const { monedas, gemas, es_vip } = jugResult.rows[0] || {};

    res.json({ exito: true, catalogo: catalogoConEstado, monedas, gemas, es_vip });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /tienda/sin-auth - Catálogo público (sin login)
router.get('/catalogo', (req, res) => res.json({ exito: true, catalogo: CATALOGO }));

// POST /tienda/comprar - Compra con monedas del juego
router.post('/comprar', authMiddleware, async (req, res) => {
  try {
    const { itemId, categoria } = req.body;
    const jugadorId = req.jugador.id;

    const categoriaItems = CATALOGO[categoria];
    const item = Array.isArray(categoriaItems)
      ? categoriaItems.find(i => i.id === itemId)
      : (categoriaItems?.id === itemId ? categoriaItems : null);

    if (!item) return res.status(404).json({ exito: false, error: 'Item no encontrado' });
    if (item.moneda === 'gratis') return res.status(400).json({ exito: false, error: 'Este item es gratuito' });
    if (item.moneda === 'exclusivo_torneo') return res.status(403).json({ exito: false, error: 'Solo disponible por torneos' });
    if (item.moneda === 'usd') return res.status(400).json({ exito: false, error: 'Este item solo está disponible para VIP' });

    // Verificar que no lo tiene
    const yaLo = await db.query('SELECT id FROM inventario WHERE jugador_id=$1 AND item_id=$2', [jugadorId, itemId]);
    if (yaLo.rows[0]) return res.status(409).json({ exito: false, error: 'Ya tienes este item' });

    // Verificar saldo
    const jugResult = await db.query('SELECT monedas FROM jugadores WHERE id=$1', [jugadorId]);
    const { monedas } = jugResult.rows[0];

    if (monedas < item.precio)
      return res.status(402).json({ exito: false, error: `Monedas insuficientes. Necesitas ${item.precio}, tienes ${monedas}` });

    // Transacción atómica
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE jugadores SET monedas=monedas-$1 WHERE id=$2', [item.precio, jugadorId]);
      await client.query(
        'INSERT INTO inventario (jugador_id, item_id, categoria, origen) VALUES ($1,$2,$3,$4)',
        [jugadorId, itemId, categoria, 'tienda']
      );
      await client.query(
        'INSERT INTO transacciones (jugador_id, tipo, monto, descripcion, referencia) VALUES ($1,$2,$3,$4,$5)',
        [jugadorId, 'compra_item', -item.precio, `Compra: ${item.nombre}`, itemId]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const saldoResult = await db.query('SELECT monedas FROM jugadores WHERE id=$1', [jugadorId]);

    res.json({
      exito: true,
      item,
      mensaje: `¡${item.nombre} adquirido! ¡Úsalo en tu próxima partida! 🎲`,
      monedasRestantes: saldoResult.rows[0].monedas
    });
  } catch (err) {
    console.error('[Tienda] Error compra:', err.message);
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /tienda/ver-ad - Ver anuncio para ganar monedas
router.post('/ver-ad', authMiddleware, async (req, res) => {
  try {
    const { tipoAd } = req.body;
    const jugadorId = req.jugador.id;

    const recompensas = {
      video_corto: { monedas: 25, mensaje: '¡+25 monedas!' },
      video_largo: { monedas: 50, mensaje: '¡+50 monedas!' },
      especial: { monedas: 100, mensaje: '¡+100 monedas!' }
    };
    const recompensa = recompensas[tipoAd] || { monedas: 10, mensaje: '¡+10 monedas!' };

    // Límite: 10 ads por hora
    const adCount = await db.query(`
      SELECT COUNT(*) as total FROM transacciones
      WHERE jugador_id=$1 AND tipo='ver_ad' AND creada_en > NOW() - INTERVAL '1 hour'
    `, [jugadorId]);

    if (parseInt(adCount.rows[0].total) >= 10)
      return res.status(429).json({ exito: false, error: 'Límite de anuncios alcanzado. Vuelve en 1 hora.' });

    await db.query('UPDATE jugadores SET monedas=monedas+$1 WHERE id=$2', [recompensa.monedas, jugadorId]);
    await db.query(
      'INSERT INTO transacciones (jugador_id, tipo, monto, descripcion) VALUES ($1,$2,$3,$4)',
      [jugadorId, 'ver_ad', recompensa.monedas, `Ver anuncio ${tipoAd}`]
    );

    const saldo = await db.query('SELECT monedas FROM jugadores WHERE id=$1', [jugadorId]);
    res.json({ exito: true, ...recompensa, totalMonedas: saldo.rows[0].monedas });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// GET /tienda/bono-diario - Estado del bono diario
router.get('/bono-diario', authMiddleware, async (req, res) => {
  try {
    const jugadorId = req.jugador.id;
    const bonos = [50, 75, 100, 150, 200, 300, 500];

    // Verificar último reclamo
    const ultimoReclamo = await db.query(`
      SELECT creada_en FROM transacciones
      WHERE jugador_id=$1 AND tipo='bono_diario'
      ORDER BY creada_en DESC LIMIT 1
    `, [jugadorId]);

    const ahora = new Date();
    const ultimaFecha = ultimoReclamo.rows[0]?.creada_en;
    const disponible = !ultimaFecha || (ahora - new Date(ultimaFecha)) > 86400000;

    // Calcular racha de días consecutivos
    const rachaResult = await db.query(`
      SELECT COUNT(*) as dias FROM transacciones
      WHERE jugador_id=$1 AND tipo='bono_diario'
        AND creada_en > NOW() - INTERVAL '7 days'
    `, [jugadorId]);
    const diaRacha = Math.min(parseInt(rachaResult.rows[0]?.dias) || 0, 6);

    res.json({
      exito: true,
      disponible,
      monedasHoy: bonos[diaRacha],
      diaRacha: diaRacha + 1,
      proximoBono: bonos[Math.min(diaRacha + 1, 6)],
      proximoDisponibleEn: disponible ? null : new Date(new Date(ultimaFecha).getTime() + 86400000).toISOString(),
      mensaje: disponible
        ? `¡Bono del día ${diaRacha + 1}! ¡${bonos[diaRacha]} monedas para ti!`
        : 'Ya reclamaste el bono hoy. ¡Vuelve mañana!'
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

// POST /tienda/reclamar-bono - Reclamar bono diario real
router.post('/reclamar-bono', authMiddleware, async (req, res) => {
  try {
    const jugadorId = req.jugador.id;
    const bonos = [50, 75, 100, 150, 200, 300, 500];

    // Anti-doble reclamo
    const ultimoReclamo = await db.query(`
      SELECT creada_en FROM transacciones
      WHERE jugador_id=$1 AND tipo='bono_diario'
      ORDER BY creada_en DESC LIMIT 1
    `, [jugadorId]);

    const ultimaFecha = ultimoReclamo.rows[0]?.creada_en;
    if (ultimaFecha && (new Date() - new Date(ultimaFecha)) < 86400000)
      return res.status(429).json({ exito: false, error: 'Ya reclamaste el bono hoy. ¡Vuelve mañana!' });

    const rachaResult = await db.query(`
      SELECT COUNT(*) as dias FROM transacciones
      WHERE jugador_id=$1 AND tipo='bono_diario' AND creada_en > NOW() - INTERVAL '7 days'
    `, [jugadorId]);
    const diaRacha = Math.min(parseInt(rachaResult.rows[0]?.dias) || 0, 6);
    const monedas = bonos[diaRacha];

    await db.query('UPDATE jugadores SET monedas=monedas+$1 WHERE id=$2', [monedas, jugadorId]);
    await db.query(
      'INSERT INTO transacciones (jugador_id, tipo, monto, descripcion) VALUES ($1,$2,$3,$4)',
      [jugadorId, 'bono_diario', monedas, `Bono diario día ${diaRacha + 1}`]
    );

    const saldo = await db.query('SELECT monedas FROM jugadores WHERE id=$1', [jugadorId]);

    res.json({
      exito: true,
      monedasGanadas: monedas,
      totalMonedas: saldo.rows[0].monedas,
      diaRacha: diaRacha + 1,
      mensaje: `¡+${monedas} monedas! ¡Día ${diaRacha + 1} de racha! 🎁`
    });
  } catch (err) {
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
