/**
 * setup-db.js — Crea todas las tablas en Neon automáticamente
 * Ejecutar: node setup-db.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://neondb_owner:npg_KolDG1eW6Zkw@ep-old-firefly-am9krw5m.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function setup() {
  console.log('🎲 Dominó Real RD — Configurando base de datos...\n');

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('🔗 Conectando a Neon...');
    await client.connect();
    console.log('✅ Conectado!\n');

    const sqlPath = path.join(__dirname, 'backend', 'src', 'models', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 Ejecutando schema.sql...');
    await client.query(sql);
    console.log('✅ Todas las tablas creadas!\n');

    // Verificar tablas creadas
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Tablas en la base de datos (${res.rows.length} total):`);
    res.rows.forEach(r => console.log(`   ✓ ${r.table_name}`));

    console.log('\n🎉 ¡Base de datos lista! Ya puedes hacer deploy en Railway.');

  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️  Las tablas ya existen (eso está bien)\n');
      console.log('🎉 Base de datos ya estaba configurada correctamente.');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

setup();
