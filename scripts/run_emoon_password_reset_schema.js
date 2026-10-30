// scripts/run_emoon_password_reset_schema.js
//
// Script de UN SOLO USO — ejecuta database/emoon_password_reset.sql
// contra la base de datos real, agregando las columnas de OTP de reset
// de contraseña a emoon_users sin tocar ninguna fila existente.
//
// Correr con: node scripts/run_emoon_password_reset_schema.js

const fs = require('fs');
const path = require('path');
const db = require('../config/config');

async function main() {
    const sqlPath = path.join(__dirname, '..', 'database', 'emoon_password_reset.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando database/emoon_password_reset.sql contra la base de datos real...');
    await db.multi(sql);
    console.log('✅ Columnas de reset de contraseña creadas/verificadas.');

    const cols = await db.manyOrNone(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'emoon' AND table_name = 'emoon_users' AND column_name IN ('password_reset_code', 'password_reset_expires_at') ORDER BY column_name`
    );
    console.log('Columnas nuevas en emoon_users:', cols.map((c) => c.column_name));

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error al correr el schema de reset de contraseña de emoon:', err);
    process.exit(1);
});
