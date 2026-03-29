const subscriptionPlansController = require('../controllers/subscriptionPlansController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/subscriptionPlans

    // --- GET ---
    // Obtener todos los planes creados por un entrenador
    app.get('/api/subscriptionPlans/findByCompany/:id_company', passport.authenticate('jwt', { session: false }), subscriptionPlansController.findByCompany);

    // --- POST ---
    // Crear un nuevo plan de suscripción
    app.post('/api/subscriptionPlans/create', passport.authenticate('jwt', { session: false }), subscriptionPlansController.create);

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

}
