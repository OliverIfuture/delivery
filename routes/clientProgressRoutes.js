const clientProgressController = require('../controllers/clientProgressController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/progress

    // --- GET ---
    // Obtener todos los logs de métricas (peso, etc.) de un cliente
    app.get('/api/progress/metrics/:id_client', passport.authenticate('jwt', { session: false }), clientProgressController.getMetrics);
    
    // Obtener todas las fotos de progreso de un cliente
    app.get('/api/progress/photos/:id_client', passport.authenticate('jwt', { session: false }), clientProgressController.getPhotos);

    // --- POST ---
    // Guardar un nuevo log de métricas (peso, cintura, etc.)
    app.post('/api/progress/logMetric', passport.authenticate('jwt', { session: false }), clientProgressController.logMetric);

    // Guardar la URL de una foto de progreso (después de subirla a Firebase)
    app.post('/api/progress/logPhoto', passport.authenticate('jwt', { session: false }), clientProgressController.logPhoto);

};
