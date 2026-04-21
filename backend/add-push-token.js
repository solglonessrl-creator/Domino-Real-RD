/**
 * Migration: agregar columna push_token a la tabla jugadores
 * Ejecutar una sola vez: node add-push-token.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrar() {
  try {
    console.log('Ejecutando migración...');

    await db.query(`
      ALTER TABLE jugadores
      ADD COLUMN IF NOT EXISTS push_token VARCHAR(200) DEFAULT NULL;
    `);
    console.log('✅ Columna push_token agregada a jugadores');

    // Índice para búsquedas rápidas por token
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_jugadores_push_token
      ON jugadores(push_token)
      WHERE push_token IS NOT NULL;
    `);
    console.log('✅ Índice creado en push_token');

    // Verificar la columna
    const { rows } = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'jugadores' AND column_name = 'push_token'
    `);
    console.log('Columna creada:', rows[0]);

    console.log('\n✅ Migración completada exitosamente');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    await db.end();
  }
}

migrar();
