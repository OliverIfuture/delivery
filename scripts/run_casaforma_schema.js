// scripts/run_casaforma_schema.js
//
// Script de UN SOLO USO — ejecuta database/casaforma_schema.sql contra la
// base de datos real (mismo Postgres que ya usan Trainer Partners/Emoon,
// ver config/config.js), creando el schema "casaforma" y sus tablas.
// Seguro de correr más de una vez (el .sql usa IF NOT EXISTS / ON CONFLICT
// DO NOTHING en todo).
//
// Correr con: node scripts/run_casaforma_schema.js

const fs = require('fs');
const path = require('path');
const db = require('../config/config');

async function main() {
    const sqlPath = path.join(__dirname, '..', 'database', 'casaforma_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando database/casaforma_schema.sql contra la base de datos real...');
    await db.multi(sql);
    console.log('✅ Schema "casaforma" creado/verificado correctamente.');

    const tables = await db.manyOrNone(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'casaforma' ORDER BY table_name`
    );
    console.log(`Tablas en el schema casaforma (${tables.length}):`);
    tables.forEach((t) => console.log(' -', t.table_name));

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error al correr el schema de casaforma:', err);
    process.exit(1);
});
