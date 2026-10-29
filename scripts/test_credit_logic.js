// scripts/test_credit_logic.js — UN SOLO USO: prueba de punta a punta la
// lógica de créditos recién portada (reservar descuenta, cancelar a
// tiempo regresa), usando datos de prueba desechables que se borran al
// final. Corre contra la BD real (config/config.js), pero no deja nada.
const db = require('../config/config');
const CasaformaReservation = require('../models/casaformaReservation');

async function main() {
    const mariana = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'mariana@casaforma.mx'`);
    const admin = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'admin@casaforma.mx'`);

    const cat = await db.one(
        `INSERT INTO casaforma.casaforma_class_categories(id, name, color_hex) VALUES('cat_test_credit', 'TEST', '#000000') RETURNING id`
    );
    const classType = await db.one(
        `INSERT INTO casaforma.casaforma_class_types(category_id, name, duration_minutes, max_capacity, is_active)
         VALUES($1, 'TEST Class', 45, 10, true) RETURNING id`,
        [cat.id]
    );
    const scheduled = await db.one(
        `INSERT INTO casaforma.casaforma_scheduled_classes(class_type_id, instructor_id, scheduled_datetime, status)
         VALUES($1, $2, NOW() + interval '5 days', 'scheduled') RETURNING id`,
        [classType.id, admin.id]
    );
    const pkg = await db.one(
        `INSERT INTO casaforma.casaforma_packages(name, price, credits, type_id, validity_days, is_active)
         VALUES('TEST Pack 1 crédito', 100, 1, 'class_pack', 30, true) RETURNING id`
    );
    const userPkg = await db.one(
        `INSERT INTO casaforma.casaforma_user_packages(user_id, package_id, activation_date, expiration_date, remaining_classes, status)
         VALUES($1, $2, CURRENT_DATE, CURRENT_DATE + 30, 1, 'active') RETURNING id`,
        [mariana.id, pkg.id]
    );

    console.log('--- Estado inicial ---');
    let up = await db.one(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE id = $1`, [userPkg.id]);
    console.log('user_package:', up);

    console.log('\n--- Reservar (debe descontar el crédito) ---');
    const reservation = await CasaformaReservation.create(mariana.id, scheduled.id);
    console.log('reservación creada:', { id: reservation.id, charged_credit: reservation.charged_credit, user_package_id: reservation.user_package_id });
    up = await db.one(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE id = $1`, [userPkg.id]);
    console.log('user_package tras reservar (esperado: 0, depleted):', up);

    console.log('\n--- Cancelar con 5 días de anticipación (debe regresar el crédito) ---');
    const cancelResult = await CasaformaReservation.cancelWithCredit(reservation.id, mariana.id);
    console.log('resultado cancelación:', cancelResult);
    up = await db.one(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE id = $1`, [userPkg.id]);
    console.log('user_package tras cancelar (esperado: 1, active):', up);

    console.log('\n--- Limpieza ---');
    await db.none(`DELETE FROM casaforma.casaforma_reservations WHERE id = $1`, [reservation.id]);
    await db.none(`DELETE FROM casaforma.casaforma_user_packages WHERE id = $1`, [userPkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_scheduled_classes WHERE id = $1`, [scheduled.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_types WHERE id = $1`, [classType.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_categories WHERE id = $1`, [cat.id]);
    console.log('Limpieza completa — no quedó ninguna fila de prueba.');

    process.exit(0);
}

main().catch(async (err) => {
    console.error('❌ Error en la prueba:', err);
    process.exit(1);
});
