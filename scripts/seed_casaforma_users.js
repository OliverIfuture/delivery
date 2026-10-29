// scripts/seed_casaforma_users.js
//
// Script de UN SOLO USO — crea en casaforma.casaforma_users las mismas
// cuentas que antes vivían en el mock del frontend (src/data/mockDb.js,
// ya eliminado), con el mismo correo/contraseña, para que el login de la
// demo no se rompa de golpe al pasar de mock a backend real. Idempotente:
// si el correo ya existe, lo salta.
//
// Correr con: node scripts/seed_casaforma_users.js

const CasaformaUser = require('../models/casaformaUser');

const USERS = [
    { first_name: 'Renata', last_name: 'Solís', email: 'admin@casaforma.mx', password: 'casaforma2026', phone: '664 112 3344', role: 'admin' },
    { first_name: 'Diego', last_name: 'Marín', email: 'diego@casaforma.mx', password: 'instructor2026', phone: '664 221 0098', role: 'instructor' },
    { first_name: 'Valentina', last_name: 'Cho', email: 'valentina@casaforma.mx', password: 'instructor2026', phone: '664 221 0099', role: 'instructor' },
    { first_name: 'Mariana', last_name: 'Ibarra', email: 'mariana@casaforma.mx', password: 'cliente2026', phone: '664 330 1122', role: 'client', birth_date: '1996-04-12' },
    { first_name: 'Héctor', last_name: 'Ruvalcaba', email: 'hector@casaforma.mx', password: 'cliente2026', phone: '664 330 1123', role: 'client', birth_date: '1990-11-02' },
    { first_name: 'Sofía', last_name: 'Payán', email: 'sofia@casaforma.mx', password: 'cliente2026', phone: '664 330 1124', role: 'client', birth_date: '2001-07-19' },
    { first_name: 'Iker', last_name: 'Buelna', email: 'iker@casaforma.mx', password: 'cliente2026', phone: '664 330 1125', role: 'client', birth_date: '1985-01-30' }
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
