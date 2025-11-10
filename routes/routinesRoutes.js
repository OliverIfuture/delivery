const routinesController = require('../controllers/routinesController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/routines

    // --- GET ---
    // Obtener todas las rutinas creadas por un entrenador
    app.get('/api/routines/findByTrainer/:id_company', passport.authenticate('jwt', { session: false }), routinesController.findByTrainer);
    
    // Obtener la rutina ACTIVA de un cliente específico (para la app del cliente)
    app.get('/api/routines/findActiveByClient/:id_client', passport.authenticate('jwt', { session: false }), routinesController.findActiveByClient);

    // --- POST ---
    // Crear una nueva rutina
    app.post('/api/routines/create', passport.authenticate('jwt', { session: false }), routinesController.create);

    // --- PUT ---
    // Actualizar una rutina (ej. cambiar ejercicios, series, etc.)
    app.put('/api/routines/update', passport.authenticate('jwt', { session: false }), routinesController.update);

    // Activar una rutina específica para un cliente (y desactivar las demás)
    app.put('/api/routines/setActive', passport.authenticate('jwt', { session: false }), routinesController.setActive);

    // --- DELETE ---
    // Eliminar una rutina
    app.delete('/api/routines/delete/:id', passport.authenticate('jwt', { session: false }), routinesController.delete);

    // **NUEVA RUTA: Obtener TODAS las rutinas del cliente**
    app.get('/api/routines/findAllByClient', passport.authenticate('jwt', { session: false }), routinesController.findAllByClient);
    // ...

}
