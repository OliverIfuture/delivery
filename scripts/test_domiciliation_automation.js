// scripts/test_domiciliation_automation.js — UN SOLO USO: prueba la
// lógica real de la automatización de domiciliación (markPaymentFailed,
// clearPaymentFailed, getSubscriptionsNeedingReminder,
// getSubscriptionsToEscalate, runDomiciliationChecks completo) contra
// la BD real. NO depende de que los .php nuevos ya estén subidos a
// Hostinger — los envíos de correo del job están en try/catch
// individuales, así que una falla de red ahí no tumba la prueba, solo
// se loguea (justo el comportamiento real que debe tener en
// producción). Limpia todo al final.
const db = require('../config/config');
const CasaformaDomiciliation = require('../models/casaformaDomiciliation');
const { runDomiciliationChecks } = require('../jobs/casaformaDomiciliationJob');

async function main() {
    const admin = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'contacto@casaforma.mx'`);

    console.log('=== Setup: cliente, paquete y 2 suscripciones de prueba ===');
    const client = await db.one(
        `INSERT INTO casaforma.casaforma_users(first_name, last_name, email, password, phone, role, created_at, updated_at)
         VALUES('QA', 'Domiciliacion', 'qa.domiciliacion.test@example.com', 'x', '0000000000', 'client', NOW(), NOW()) RETURNING id`
    );
    const pkg = await db.one(
        `INSERT INTO casaforma.casaforma_packages(name, price, credits, type_id, validity_days, is_active, is_domiciliado, billing_cycle_days)
         VALUES('TEST Domiciliado', 500, NULL, 'membership', 30, true, true, 30) RETURNING id`
    );

    // Suscripción A: su próximo cobro cae MAÑANA (dentro de la ventana de aviso) y nunca se le avisó.
    const subReminder = await db.one(
        `INSERT INTO casaforma.casaforma_domiciliation_subscriptions(user_id, package_id, stripe_subscription_id, status, amount, next_charge_date, created_at, updated_at)
         VALUES($1, $2, 'sub_test_reminder', 'active', 500, CURRENT_DATE + 1, NOW(), NOW()) RETURNING id`,
        [client.id, pkg.id]
    );

    // Suscripción B: lleva fallando desde hace 5 días (más que el retryDays configurado).
    const subEscalate = await db.one(
        `INSERT INTO casaforma.casaforma_domiciliation_subscriptions(user_id, package_id, stripe_subscription_id, status, amount, next_charge_date, last_failed_at, created_at, updated_at)
         VALUES($1, $2, 'sub_test_escalate', 'active', 500, CURRENT_DATE + 2, NOW() - interval '5 days', NOW(), NOW()) RETURNING id`,
        [client.id, pkg.id]
    );

    console.log('\n=== 1. markPaymentFailed (invoice.payment_failed) ===');
    const failedResult = await CasaformaDomiciliation.markPaymentFailed('sub_test_reminder');
    console.log('last_failed_at asignado:', !!failedResult);
    let row = await db.one(`SELECT last_failed_at FROM casaforma.casaforma_domiciliation_subscriptions WHERE id = $1`, [subReminder.id]);
    console.log('verificado en BD (esperado: no null):', row.last_failed_at);

    console.log('\n=== 2. clearPaymentFailed (cobro exitoso tras una falla) ===');
    await CasaformaDomiciliation.clearPaymentFailed('sub_test_reminder');
    row = await db.one(`SELECT last_failed_at FROM casaforma.casaforma_domiciliation_subscriptions WHERE id = $1`, [subReminder.id]);
    console.log('verificado en BD (esperado: null):', row.last_failed_at);

    console.log('\n=== 3. getSubscriptionsNeedingReminder(2) — debe incluir solo la suscripción A ===');
    const needReminder = await CasaformaDomiciliation.getSubscriptionsNeedingReminder(2);
    console.log('encontradas:', needReminder.map(s => s.id));
    const foundA = needReminder.some(s => String(s.id) === String(subReminder.id));
    console.log('¿incluye la suscripción A?', foundA, '(esperado: true)');

    console.log('\n=== 4. getSubscriptionsToEscalate(3) — debe incluir solo la suscripción B ===');
    const toEscalate = await CasaformaDomiciliation.getSubscriptionsToEscalate(3);
    console.log('encontradas:', toEscalate.map(s => s.id));
    const foundB = toEscalate.some(s => String(s.id) === String(subEscalate.id));
    console.log('¿incluye la suscripción B?', foundB, '(esperado: true)');

    console.log('\n=== 5. runDomiciliationChecks() completo (ciclo real) ===');
    await runDomiciliationChecks();

    row = await db.one(`SELECT last_reminder_sent_at FROM casaforma.casaforma_domiciliation_subscriptions WHERE id = $1`, [subReminder.id]);
    console.log('suscripción A -> last_reminder_sent_at (esperado: no null):', row.last_reminder_sent_at);

    row = await db.oneOrNone(`SELECT status FROM casaforma.casaforma_domiciliation_subscriptions WHERE id = $1`, [subEscalate.id]);
    console.log('suscripción B -> status tras runDomiciliationChecks (esperado: cancelled):', row.status);

    console.log('\n=== 6. Segunda corrida inmediata — NO debe volver a marcar el aviso (ya se mandó este ciclo) ===');
    const needReminderAgain = await CasaformaDomiciliation.getSubscriptionsNeedingReminder(2);
    const stillThere = needReminderAgain.some(s => String(s.id) === String(subReminder.id));
    console.log('¿sigue apareciendo para aviso? (esperado: false, ya se mandó):', stillThere);

    console.log('\n✅ Lógica de automatización de domiciliación funcionando correctamente.');

    console.log('\n=== Limpieza ===');
    await db.none(`DELETE FROM casaforma.casaforma_domiciliation_subscriptions WHERE id IN ($1, $2)`, [subReminder.id, subEscalate.id]);
    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [pkg.id]);
    await db.none(`DELETE FROM casaforma.casaforma_users WHERE id = $1`, [client.id]);
    console.log('Limpieza completa — no quedó ninguna fila de prueba.');

    process.exit(0);
}

main().catch(async (err) => {
    console.error('\n❌❌❌ FALLÓ LA PRUEBA:', err.message);
    console.error(err);
    process.exit(1);
});
