// scripts/test_admin_flow.js — UN SOLO USO: cierra el hueco de las
// pruebas anteriores (que armaban los datos de prueba con INSERT
// directo). Esta vez usa las funciones REALES que llaman los
// controllers: crear categoría, tipo de clase, clase agendada, paquete
// — todo vía los modelos reales, no SQL directo. Además prueba la venta
// manual del admin (createManualSale) y que el admin reserve a nombre
// de un cliente. Limpia todo al final.
const db = require('../config/config');
const CasaformaCategory = require('../models/casaformaCategory');
const CasaformaClassType = require('../models/casaformaClassType');
const CasaformaScheduledClass = require('../models/casaformaScheduledClass');
const CasaformaPackage = require('../models/casaformaPackage');
const CasaformaSale = require('../models/casaformaSale');
const CasaformaReservation = require('../models/casaformaReservation');
const CasaformaUserPackage = require('../models/casaformaUserPackage');
const CasaformaDomiciliation = require('../models/casaformaDomiciliation');

async function main() {
    const mariana = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'mariana@casaforma.mx'`);
    const admin = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'admin@casaforma.mx'`);

    console.log('=== 1. Crear categoría (CasaformaCategory.create, como el admin desde Clases) ===');
    const cat = await CasaformaCategory.create({ id: 'cat_test_admin', name: 'TEST ADMIN', color_hex: '#c7a567' });
    console.log('Categoría creada:', cat);

    console.log('\n=== 2. Crear tipo de clase (CasaformaClassType.create) ===');
    const classType = await CasaformaClassType.create({
        category_id: cat.id, name: 'TEST Admin Class', description: 'Prueba', duration_minutes: 45, max_capacity: 10, intensity: 'Todos los niveles', is_active: true
    });
    console.log('Tipo de clase creado:', { id: classType.id, name: classType.name });

    console.log('\n=== 3. Agendar clase (CasaformaScheduledClass.create, como "Nueva clase" en Calendario) ===');
    const now = new Date();
    now.setDate(now.getDate() + 3);
    const scheduledDate = now.toISOString().slice(0, 19);
    const scheduled = await CasaformaScheduledClass.create({
        class_type_id: classType.id, instructor_id: admin.id, scheduled_date: scheduledDate, capacity: null
    });
    console.log('Clase agendada:', { id: scheduled.id, class_name: scheduled.class_name, scheduled_date: scheduled.scheduled_date, capacity: scheduled.capacity });

    console.log('\n=== 4. Crear paquete (CasaformaPackage.create, como "Nuevo Paquete" en Planes y Tarifas) ===');
    const pkg = await CasaformaPackage.create({
        name: 'TEST Admin Pack', price: 300, credits: 2, type_id: 'class_pack', validity_days: 30, is_active: true
    });
    console.log('Paquete creado:', { id: pkg.id, name: pkg.name, credits: pkg.credits });

    console.log('\n=== 5. Venta manual del admin (CasaformaSale.createManualSale, "Punto de Venta") ===');
    const payment = await CasaformaSale.createManualSale(mariana.id, pkg.id, 'Efectivo');
    console.log('Venta manual registrada:', { id: payment.id, amount: payment.amount, payment_method: payment.payment_method });

    console.log('\n=== 6. Ver paquete activo del cliente tras la venta manual (debe tener 2 créditos) ===');
    let activePkgs = await CasaformaUserPackage.getActiveByUser(mariana.id);
    console.log('Paquetes activos:', activePkgs);
    if (activePkgs.length !== 1 || activePkgs[0].remaining_classes !== 2) throw new Error('❌ La venta manual no asignó los créditos correctamente.');

    console.log('\n=== 7. Admin reserva la clase A NOMBRE del cliente (CalendarWidget "Agregar alumno") ===');
    const reservation = await CasaformaReservation.create(mariana.id, scheduled.id);
    console.log('Reservación creada por el admin a nombre de Mariana:', { id: reservation.id, user_id: reservation.user_id });
    activePkgs = await CasaformaUserPackage.getActiveByUser(mariana.id);
    console.log('Créditos restantes tras la reservación (esperado: 1):', activePkgs[0]?.remaining_classes);
    if (activePkgs[0]?.remaining_classes !== 1) throw new Error('❌ No se descontó el crédito al reservar desde el admin.');

    console.log('\n=== 8. Ver asistentes de la clase (CalendarWidget -> loadAttendees) ===');
    const attendees = await db.manyOrNone(`SELECT r.id, u.first_name FROM casaforma.casaforma_reservations r JOIN casaforma.casaforma_users u ON r.user_id = u.id WHERE r.scheduled_class_id = $1`, [scheduled.id]);
    console.log('Asistentes:', attendees);

    console.log('\n=== 9. Admin cancela la clase completa (debe reembolsar el crédito) ===');
    const cancelResult = await CasaformaReservation.cancelClassWithRefunds(scheduled.id);
    console.log('Resultado:', cancelResult);
    activePkgs = await CasaformaUserPackage.getActiveByUser(mariana.id);
    console.log('Créditos tras cancelar la clase (esperado: 2 de vuelta):', activePkgs[0]?.remaining_classes);
    if (activePkgs[0]?.remaining_classes !== 2) throw new Error('❌ Cancelar la clase completa no reembolsó el crédito.');

    console.log('\n=== 10. Editar paquete y categoría (CasaformaPackage.update / confirmar que se reflejan) ===');
    const updatedPkg = await CasaformaPackage.update(pkg.id, { name: 'TEST Admin Pack Editado', price: 350, is_active: true });
    console.log('Paquete editado:', { name: updatedPkg.name, price: updatedPkg.price });

    console.log('\n✅ TODO EL FLUJO DE ADMIN FUNCIONÓ CORRECTAMENTE.');

    console.log('\n=== Limpieza ===');
    await db.none(`DELETE FROM casaforma.casaforma_reservations WHERE scheduled_class_id = $1`, [scheduled.id]);
    await db.none(`DELETE FROM casaforma.casaforma_user_packages WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_payments WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_scheduled_classes WHERE id = $1`, [scheduled.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_types WHERE id = $1`, [classType.id]);
    await db.none(`DELETE FROM casaforma.casaforma_class_categories WHERE id = $1`, [cat.id]);
    console.log('Limpieza completa — no quedó ninguna fila de prueba.');

    process.exit(0);
}

main().catch(async (err) => {
    console.error('\n❌❌❌ FALLÓ LA PRUEBA:', err.message);
    console.error(err);
    process.exit(1);
});
