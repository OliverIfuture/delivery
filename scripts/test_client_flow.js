// scripts/test_client_flow.js — UN SOLO USO: prueba de punta a punta todo
// el flujo de cliente (registro, login con mayúsculas, editar perfil,
// pago real simulando lo que haría el webhook, ver paquete activo,
// reservar, ver historial), contra la BD real. Limpia todo al final.
const db = require('../config/config');
const CasaformaUser = require('../models/casaformaUser');
const CasaformaSale = require('../models/casaformaSale');
const CasaformaReservation = require('../models/casaformaReservation');
const CasaformaUserPackage = require('../models/casaformaUserPackage');
const CasaformaPurchase = require('../models/casaformaPurchase');

const TEST_EMAIL_MIXED = 'Test.Cliente.QA@Example.COM';
const TEST_EMAIL_LOWER = TEST_EMAIL_MIXED.toLowerCase();

async function main() {
    console.log('=== 1. Registro (normalizeEmail se aplica en el controller, aquí probamos el modelo directo con minúsculas ya normalizadas) ===');
    const created = await CasaformaUser.create({
        first_name: 'QA', last_name: 'Cliente', email: TEST_EMAIL_LOWER,
        password: 'test123456', phone: '6640000000', role: 'client'
    });
    console.log('Usuario creado:', { id: created.id, email: created.email, role: created.role });
    if (created.email !== TEST_EMAIL_LOWER) throw new Error('❌ El email NO quedó en minúsculas al crear.');

    console.log('\n=== 2. Login con el correo en MAYÚSCULAS/MIXTO (findByEmail debe ser insensible a mayúsculas) ===');
    const foundMixed = await CasaformaUser.findByEmail(TEST_EMAIL_MIXED);
    console.log('findByEmail con "Test.Cliente.QA@Example.COM" encontró:', foundMixed ? `id=${foundMixed.id}` : 'NADA (❌ BUG)');
    if (!foundMixed) throw new Error('❌ Login con mayúsculas no encontró la cuenta.');

    console.log('\n=== 3. Editar perfil (cambiar teléfono) ===');
    const updated = await CasaformaUser.update(created.id, { first_name: 'QA Editado', last_name: 'Cliente', phone: '6641111111', email: TEST_EMAIL_LOWER });
    console.log('Perfil actualizado:', updated);

    console.log('\n=== 4. Crear categoría/clase/paquete de prueba ===');
    const admin = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'admin@casaforma.mx'`);
    const cat = await db.one(`INSERT INTO casaforma.casaforma_class_categories(id, name) VALUES('cat_test_flow', 'TEST FLOW') RETURNING id`);
    const classType = await db.one(
        `INSERT INTO casaforma.casaforma_class_types(category_id, name, duration_minutes, max_capacity, is_active)
         VALUES($1, 'TEST Flow Class', 45, 10, true) RETURNING id`, [cat.id]
    );
    const scheduled = await db.one(
        `INSERT INTO casaforma.casaforma_scheduled_classes(class_type_id, instructor_id, scheduled_datetime, status)
         VALUES($1, $2, NOW() + interval '5 days', 'scheduled') RETURNING id`, [classType.id, admin.id]
    );
    const pkg = await db.one(
        `INSERT INTO casaforma.casaforma_packages(name, price, credits, type_id, validity_days, is_active)
         VALUES('TEST Flow Pack', 250, 1, 'class_pack', 30, true) RETURNING id`
    );
    console.log('Catálogo de prueba creado.');

    console.log('\n=== 5. Simular lo que hace el webhook tras un pago real con Stripe (payment_intent.succeeded) ===');
    const payment = await CasaformaSale.recordStripePayment(created.id, pkg.id, 250, 'pi_test_fake_12345');
    console.log('Pago registrado:', { id: payment.id, amount: payment.amount, stripe_payment_intent_id: payment.stripe_payment_intent_id });

    console.log('\n=== 6. Ver perfil: paquete activo debe aparecer ===');
    let activePkgs = await CasaformaUserPackage.getActiveByUser(created.id);
    console.log('Paquetes activos:', activePkgs);
    if (activePkgs.length !== 1 || activePkgs[0].remaining_classes !== 1) throw new Error('❌ El paquete activo no aparece correctamente tras el pago.');

    console.log('\n=== 7. Reservar la clase (debe descontar el crédito recién comprado) ===');
    const reservation = await CasaformaReservation.create(created.id, scheduled.id);
    console.log('Reservación creada, id:', reservation.id);

    console.log('\n=== 8. Ver perfil de nuevo: ya NO debe quedar paquete activo (crédito agotado) ===');
    activePkgs = await CasaformaUserPackage.getActiveByUser(created.id);
    console.log('Paquetes activos tras reservar (esperado: []):', activePkgs);
    if (activePkgs.length !== 0) throw new Error('❌ El crédito no se descontó al reservar.');

    console.log('\n=== 9. Ver historial de compras (debe mostrar el pago de Stripe) ===');
    const history = await CasaformaPurchase.getByUserId(created.id);
    console.log('Historial:', history.map(h => ({ item_name: h.item_name, amount: h.amount, payment_method: h.payment_method })));
    if (history.length !== 1) throw new Error('❌ El historial de compras no muestra el pago.');

    console.log('\n=== 10. Ver reservaciones del cliente ===');
    const myReservations = await CasaformaReservation.getByUserId(created.id);
    console.log('Reservaciones:', myReservations.map(r => ({ class_name: r.class_name, status: r.status })));

    console.log('\n✅ TODO EL FLUJO FUNCIONÓ CORRECTAMENTE.');

    console.log('\n=== Limpieza ===');
    await db.none(`DELETE FROM casaforma.casaforma_reservations WHERE id = $1`, [reservation.id]);
    await db.none(`DELETE FROM casaforma.casaforma_user_packages WHERE user_id = $1`, [created.id]);
    await db.none(`DELETE FROM casaforma.casaforma_payments WHERE user_id = $1`, [created.id]);
    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_scheduled_classes WHERE id = $1`, [scheduled.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_types WHERE id = $1`, [classType.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_categories WHERE id = $1`, [cat.id]);
    await db.none(`DELETE FROM casaforma.casaforma_users WHERE id = $1`, [created.id]);
    console.log('Limpieza completa — no quedó ninguna fila de prueba.');

    process.exit(0);
}

main().catch(async (err) => {
    console.error('\n❌❌❌ FALLÓ LA PRUEBA:', err.message);
    console.error(err);
    process.exit(1);
});
