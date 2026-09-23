const subscriptionPlansController = require('../controllers/subscriptionPlansController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/subscriptionPlans

    // --- GET ---
    // Obtener todos los planes creados por un entrenador
    app.get('/api/subscriptionPlans/findByCompany/:id_company', passport.authenticate('jwt', { session: false }), subscriptionPlansController.findByCompany);
    app.get('/api/subscriptionPlans/findByCompanyDash/:id_company', passport.authenticate('jwt', { session: false }), subscriptionPlansController.findByCompanyDash);
    // NUEVO — lista completa (con payment_type/billing_mode/trial_period_days) para "COBI PAYMENTS".
    app.get('/api/subscriptionPlans/findByCompanyManaged/:id_company', passport.authenticate('jwt', { session: false }), subscriptionPlansController.findByCompanyManaged);
    // NUEVO — planes de tarjeta cuyo Price quedó en una cuenta de Stripe vieja (no Connect) y necesitan "Activar para COBI".
    app.get('/api/subscriptionPlans/checkConnectStatus', passport.authenticate('jwt', { session: false }), subscriptionPlansController.checkConnectStatus);

    // --- POST ---
    // Crear un nuevo plan de suscripción
    app.post('/api/subscriptionPlans/create', passport.authenticate('jwt', { session: false }), subscriptionPlansController.create);
    // NUEVO — crear plan con Stripe Connect real (tarjeta recurrente/pago único con días de gracia, o transferencia).
    app.post('/api/subscriptionPlans/createConnect', passport.authenticate('jwt', { session: false }), subscriptionPlansController.createConnect);
    // NUEVO — recrea el Product/Price de un plan existente dentro de la cuenta Connect real ("Activar para COBI").
    app.post('/api/subscriptionPlans/activateConnect/:id_plan', passport.authenticate('jwt', { session: false }), subscriptionPlansController.activateConnect);

    // --- DELETE ---
    // Eliminar (desactivar) un plan de suscripción
    app.put('/api/subscriptionPlans/delete/:id/:id_company', passport.authenticate('jwt', { session: false }), subscriptionPlansController.delete);
    // --- GET PÚBLICO ---
    // Obtener un plan específico por su ID (Sin token, usado en el registro)
    app.get('/api/subscriptionPlans/findById/:id', subscriptionPlansController.findByIdPublic);


    // Crear un gasto
    app.post('/api/subscriptionPlans/createExpense',
        passport.authenticate('jwt', { session: false }),
        subscriptionPlansController.createExpense
    );

    // Traer gastos por rango (ej: /api/expenses/range?start=2024-01-01&end=2024-01-31)
    app.get('/api/subscriptionPlans/range',
        passport.authenticate('jwt', { session: false }),
        subscriptionPlansController.findByDateRange
    );

    // Eliminar un gasto
    app.delete('/api/subscriptionPlans/deleteExpense/:id',
        passport.authenticate('jwt', { session: false }),
        subscriptionPlansController.deleteExpense
    );

    app.get('/api/subscriptionPlans/subscriptionsRange',
        passport.authenticate('jwt', { session: false }),
        subscriptionPlansController.getPaymentHistory
    );

}
