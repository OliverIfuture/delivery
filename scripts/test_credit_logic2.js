// scripts/test_credit_logic2.js — UN SOLO USO: prueba el caso de
// cancelación tardía (sin reembolso) del cliente, y las dos rutas de
// cancelación del admin (reservación individual + clase completa), que
// SIEMPRE reembolsan sin importar la ventana de horas. Mismo criterio de
// limpieza que test_credit_logic.js.
const db = require('../config/config');
const CasaformaReservation = require('../models/casaformaReservation');

async function setupFixture(hoursFromNow) {
    const mariana = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'mariana@casaforma.mx'`);
    const admin = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'admin@casaforma.mx'`);
    const cat = await db.one(`INSERT INTO casaforma.casaforma_class_categories(id, name) VALUES('cat_test_credit2', 'TEST2') RETURNING id`);
    const classType = await db.one(
        `INSERT INTO casaforma.casaforma_class_types(category_id, name, duration_minutes, max_capacity, is_active)
         VALUES($1, 'TEST Class 2', 45, 10, true) RETURNING id`, [cat.id]
    );
    const scheduled = await db.one(
        `INSERT INTO casaforma.casaforma_scheduled_classes(class_type_id, instructor_id, scheduled_datetime, status)
         VALUES($1, $2, NOW() + interval '${hoursFromNow} hours', 'scheduled') RETURNING id`, [classType.id, admin.id]
    );
    const pkg = await db.one(
        `INSERT INTO casaforma.casaforma_packages(name, price, credits, type_id, validity_days, is_active)
         VALUES('TEST Pack 2', 100, 1, 'class_pack', 30, true) RETURNING id`
    );
    const userPkg = await db.one(
        `INSERT INTO casaforma.casaforma_user_packages(user_id, package_id, activation_date, expiration_date, remaining_classes, status)
         VALUES($1, $2, CURRENT_DATE, CURRENT_DATE + 30, 1, 'active') RETURNING id`, [mariana.id, pkg.id]
    );
    return { mariana, admin, cat, classType, scheduled, pkg, userPkg };
}

async function cleanup(f, reservationId) {
    if (reservationId) await db.none(`DELETE FROM casaforma.casaforma_reservations WHERE id = $1`, [reservationId]);
    await db.none(`DELETE FROM casaforma.casaforma_user_packages WHERE id = $1`, [f.userPkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [f.pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_scheduled_classes WHERE id = $1`, [f.scheduled.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_types WHERE id = $1`, [f.classType.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_categories WHERE id = $1`, [f.cat.id]);
}

async function main() {
    console.log('=== CASO 1: cliente cancela TARDE (1h antes, ventana=6h) -> NO debe reembolsar ===');
    let f = await setupFixture(1);
    let reservation = await CasaformaReservation.create(f.mariana.id, f.scheduled.id);
    let result = await CasaformaReservation.cancelWithCredit(reservation.id, f.mariana.id);
    let up = await db.one(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE id = $1`, [f.userPkg.id]);
    console.log('resultado:', result, '| user_package (esperado: 0, depleted):', up);
    await cleanup(f, reservation.id);

    console.log('\n=== CASO 2: admin cancela una reservación individual (1h antes) -> SIEMPRE debe reembolsar ===');
    f = await setupFixture(1);
    reservation = await CasaformaReservation.create(f.mariana.id, f.scheduled.id);
    const adminCancelled = await CasaformaReservation.updateStatus(reservation.id, 'cancelled');
    up = await db.one(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE id = $1`, [f.userPkg.id]);
    console.log('reservación tras cancelar admin:', { status: adminCancelled.status }, '| user_package (esperado: 1, active):', up);
    await cleanup(f, reservation.id);

    console.log('\n=== CASO 3: admin cancela la CLASE completa (1h antes) -> SIEMPRE debe reembolsar ===');
    f = await setupFixture(1);
    reservation = await CasaformaReservation.create(f.mariana.id, f.scheduled.id);
    const classCancelResult = await CasaformaReservation.cancelClassWithRefunds(f.scheduled.id);
    up = await db.one(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE id = $1`, [f.userPkg.id]);
    console.log('resultado:', classCancelResult, '| user_package (esperado: 1, active):', up);
    await cleanup(f, reservation.id);

    console.log('\nLimpieza completa en los 3 casos — no quedó ninguna fila de prueba.');
    process.exit(0);
}

main().catch(async (err) => {
    console.error('❌ Error en la prueba:', err);
    process.exit(1);
});
