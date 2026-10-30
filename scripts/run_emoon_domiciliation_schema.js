// scripts/run_emoon_domiciliation_schema.js
//
// Script de UN SOLO USO — ejecuta database/emoon_packages_domiciliation.sql
// contra la base de datos real, agregando domiciliación a Emoon sin tocar
// ningún paquete existente (todo IF NOT EXISTS / default false).
//
// Correr con: node scripts/run_emoon_domiciliation_schema.js

const fs = require('fs');
const path = require('path');
const db = require('../config/config');

async function main() {
    const sqlPath = path.join(__dirname, '..', 'database', 'emoon_packages_domiciliation.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando database/emoon_packages_domiciliation.sql contra la base de datos real...');
    await db.multi(sql);
    console.log('✅ Columnas de domiciliación y tabla emoon_domiciliation_subscriptions creadas/verificadas.');

    const cols = await db.manyOrNone(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'emoon' AND table_name = 'emoon_packages' AND column_name IN ('is_domiciliado', 'billing_cycle_days', 'stripe_product_id', 'stripe_price_id') ORDER BY column_name`
    );
    console.log('Columnas nuevas en emoon_packages:', cols.map((c) => c.column_name));

    const tables = await db.manyOrNone(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'emoon' AND table_name = 'emoon_domiciliation_subscriptions'`
    );
    console.log('Tabla emoon_domiciliation_subscriptions existe:', tables.length > 0);

    const existingCount = await db.one(`SELECT COUNT(*) FROM emoon.emoon_packages WHERE is_domiciliado = true`);
    console.log('Paquetes existentes ya marcados is_domiciliado=true (debe ser 0):', existingCount.count);

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error al correr el schema de domiciliación de emoon:', err);
    process.exit(1);
});
