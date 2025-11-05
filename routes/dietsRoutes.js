const dietsController = require('../controllers/dietsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/diets

    // --- GET ---
    // Obtener todas las dietas asignadas por un entrenador
    app.get('/api/diets/findByTrainer/:id_company', passport.authenticate('jwt', { session: false }), dietsController.findByTrainer);
    
    // Obtener la dieta ACTIVA de un cliente específico (para la app del cliente)
    app.get('/api/diets/findActiveByClient/:id_client', passport.authenticate('jwt', { session: false }), dietsController.findActiveByClient);

    // --- POST ---
    // Asignar una nueva dieta (el 'create')
    app.post('/api/diets/assign', passport.authenticate('jwt', { session: false }), dietsController.assign);

    // --- DELETE ---
    // Eliminar una asignación de dieta
    app.delete('/api/diets/delete/:id', passport.authenticate('jwt', { session: false }), dietsController.delete);

}
