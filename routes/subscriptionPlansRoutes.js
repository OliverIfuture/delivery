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
    app.delete('/api/subscriptionPlans/delete/:id', passport.authenticate('jwt', { session: false }), subscriptionPlansController.delete);

}
