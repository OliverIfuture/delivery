// scripts/seed_casaforma_users.js
//
// Script de UN SOLO USO — crea en casaforma.casaforma_users solo las 2
// cuentas que el usuario pidió para esta ronda (admin + un cliente),
// mismo correo/contraseña que antes vivían en el mock del frontend
// (src/data/mockDb.js, ya eliminado). Idempotente: si el correo ya
// existe, lo salta.
//
// Correr con: node scripts/seed_casaforma_users.js

const CasaformaUser = require('../models/casaformaUser');

const USERS = [
    { first_name: 'Renata', last_name: 'Solís', email: 'admin@casaforma.mx', password: 'casaforma2026', phone: '664 112 3344', role: 'admin' },
    { first_name: 'Mariana', last_name: 'Ibarra', email: 'mariana@casaforma.mx', password: 'cliente2026', phone: '664 330 1122', role: 'client', birth_date: '1996-04-12' }
];

async function main() {
    for (const u of USERS) {
        const existing = await CasaformaUser.findByEmail(u.email);
        if (existing) {
            console.log(`- ${u.email} ya existe, se omite.`);
            continue;
        }
        const created = await CasaformaUser.create(u);
        console.log(`✅ Creado: ${u.email} (id=${created.id}, role=${created.role})`);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error al sembrar usuarios de casaforma:', err);
    process.exit(1);
});
