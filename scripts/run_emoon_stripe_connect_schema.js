// scripts/run_emoon_stripe_connect_schema.js
//
// Script de UN SOLO USO — crea emoon.emoon_stripe_connect y migra el
// stripe_account_id real que ya existía suelto en emoon_settings. No
// llama a la API de Stripe (solo BD) — el estado real se actualiza
// después desde el panel (botón "Actualizar estado").
//
// Correr con: node scripts/run_emoon_stripe_connect_schema.js

const fs = require('fs');
const path = require('path');
const db = require('../config/config');

async function main() {
    const sqlPath = path.join(__dirname, '..', 'database', 'emoon_stripe_connect.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando database/emoon_stripe_connect.sql contra la base de datos real...');
    await db.multi(sql);
    console.log('✅ Tabla emoon_stripe_connect creada/verificada.');

    const row = await db.one(`SELECT id, status, stripe_account_id, charges_enabled, details_submitted FROM emoon.emoon_stripe_connect WHERE id = 1`);
    console.log('Fila actual:', row);

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error al correr el schema de stripe-connect de emoon:', err);
    process.exit(1);
});
